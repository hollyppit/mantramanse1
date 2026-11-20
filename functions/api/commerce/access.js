// POST /api/commerce/access — 무빙툰 화면이 잠금·구매 버튼을 그리는 데 쓰는 정보(공개).
// 요청: { sd } (+ 선택 헤더 x-member-token: Supabase 로그인 토큰, 관리자는 Authorization + 선택 x-view-as: free)
// 응답: { configured: { login, pay }, keys: { supabaseUrl, supabaseAnonKey, provider, tossClientKey, portone: { storeId, channelKey } }, member, sajuKey,
//         worlds: { w1: { paid, owned, freeChapter } … }, products: [판매 중인 상품], admin }
// 공개 키(SUPABASE_ANON_KEY·TOSS_CLIENT_KEY·포트원 상점 ID·채널 키)만 내려 보낸다. 서버 전용 키는 절대 내려 보내지 않는다.
import { json, isAdmin } from '../../_lib.js';
import { naverReady } from '../../_naver-login.js';
import { googleReady } from '../../_google-login.js';
import { sajuKey, memberOf, worldAccess, freeChapters, ownedWorlds, loadProducts, productWorlds, payReady, payProvider, buyerFields } from '../../_commerce.js';
import { touchLater } from '../../_activity.js';

// 결제창 키(공개 값만). 채널이 둘 이상이면 손님이 결제 방법을 고를 수 있게 channels 를 여러 개 준다:
//   이니시스: '신용·체크카드' — 구매자 이름·휴대폰·이메일 필요   KPN: '카드·간편결제'
//   channelKey·buyer·testChannel 은 첫 번째(기본 선택) 채널 값으로 그대로 둔다(예전 화면 호환)
const PG_LABEL = { inicis: { label: '신용·체크카드', sub: 'KG이니시스' }, kpn: { label: '카드·간편결제', sub: 'KPN · 카카오페이 등' } };
// 운영 채널 두 번째(선택): PORTONE_CHANNEL_KEY_2(공개 값)·PORTONE_PG_2(기본 'kpn') — 둘째 결제사 실연동 채널이 생기면 넣는다.
//   넣으면 손님 구매 창에서 [첫째, 둘째] 중 고른다. 첫째와 키나 결제사가 같으면 무시. 결제 확인·환불은 결제 id 로 조회라 채널과 상관없다
const pgChannel = (pg, channelKey) => ({ id: pg, ...(PG_LABEL[pg] || { label: '카드 결제', sub: '' }), channelKey, buyer: buyerFields({ PORTONE_PG: pg }) });
export function portoneKeys(env, testPay) {
  const mainPg = String(env.PORTONE_PG || 'kpn').trim().toLowerCase();
  const mains = [pgChannel(mainPg, env.PORTONE_CHANNEL_KEY)];
  const key2 = String(env.PORTONE_CHANNEL_KEY_2 || '').trim(), pg2 = String(env.PORTONE_PG_2 || 'kpn').trim().toLowerCase();
  if (key2 && key2 !== env.PORTONE_CHANNEL_KEY && pg2 !== mainPg) mains.push(pgChannel(pg2, key2));
  if (!testPay || mains.some(m => m.channelKey === testPay.channelKey)) return { storeId: env.PORTONE_STORE_ID, channelKey: mains[0].channelKey, buyer: mains[0].buyer, channels: mains };
  const test = { id: testPay.pg, ...(PG_LABEL[testPay.pg] || { label: '카드 결제(시험)', sub: '' }), channelKey: testPay.channelKey, buyer: testPay.buyer, test: true };
  const channels = [test, ...mains.filter(m => m.id !== testPay.pg)];   // 시험 채널과 같은 결제사의 운영 채널은 숨긴다(관리자가 실결제로 착각하지 않게)
  return { storeId: env.PORTONE_STORE_ID, channelKey: test.channelKey, buyer: test.buyer, testChannel: testPay.pg, channels };
}
export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  let body; try { body = await request.json(); } catch { return json({ error: 'bad-payload' }, 400); }
  const admin = isAdmin(request, env), viewAsFree = admin && (request.headers.get('x-view-as') || '') === 'free';
  const [access, free, products, member, key] = await Promise.all([worldAccess(env), freeChapters(env), loadProducts(env), memberOf(request, env), sajuKey(body && body.sd)]);
  if (member) { const tl = touchLater(ctx, env, member.id, 'report'); if (tl) await tl; }   // 이용 기록(날짜·영역만, 7단계 지표). 실패해도 화면은 그대로
  let owned = [];
  if (member && key) { try { owned = await ownedWorlds(env, member.id, key); } catch { owned = []; } }
  const worlds = {};
  for (const [id, a] of Object.entries(access)) {
    if (!a.enabled) continue;
    const open = !a.paid || (admin && !viewAsFree);
    worlds[id] = { paid: a.paid, owned: open || owned.includes(id), freeChapter: a.paid ? free[id] || null : null };
  }
  const forSale = [];
  const annual = [];   // 연도 상품(신년운세): 무빙툰 세계 구매 창에는 넣지 않고 따로 알린다(상품 안내 페이지·신년운세 화면용)
  for (const p of products) {
    if (!p.active || !(p.price > 0)) continue;
    if (p.kind === 'annual') { annual.push({ id: p.id, name: p.name, kind: p.kind, year: p.year || null, price: p.price, owned: !!(owned && owned.includes(p.worlds[0])) }); continue; }
    const ws = await productWorlds(env, p);
    if (!ws.length || ws.every(w => !worlds[w] || !worlds[w].paid)) continue;   // 잠긴 세계가 없는 상품은 팔지 않는다
    forSale.push({ id: p.id, name: p.name, kind: p.kind, price: p.price, worlds: ws, owned: ws.every(w => worlds[w] && worlds[w].owned) });
  }
  // 관리자 시험 결제: 관리자 비밀번호로 들어온 요청에만 시험용 채널을 준다(손님 결제창은 그대로).
  // 환경변수 PORTONE_TEST_CHANNEL_KEY(포트원 테스트 채널 키, 공개 값)·PORTONE_TEST_PG(기본 'inicis'). 결제 확인·환불은 결제 id 로 조회해 채널과 상관없이 같다(테스트 채널 결제는 매출에서 빠짐)
  // PORTONE_TEST_FOR_ALL=1 이면 손님에게도 시험 채널을 준다(결제사 입점 심사: 운영 화면에서 그 결제사 결제창이 열려야 함). 끄려면 변수를 지우고 재배포
  const testAll = String(env.PORTONE_TEST_FOR_ALL || '') === '1';
  const testPay = (admin || testAll) && env.PORTONE_TEST_CHANNEL_KEY ? { channelKey: env.PORTONE_TEST_CHANNEL_KEY, pg: String(env.PORTONE_TEST_PG || 'inicis').trim().toLowerCase(), buyer: buyerFields({ PORTONE_PG: env.PORTONE_TEST_PG || 'inicis' }) } : null;
  return json({
    configured: { login: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY), naver: naverReady(env), googleServer: googleReady(env), pay: payReady(env) },
    keys: { supabaseUrl: env.SUPABASE_URL || '', supabaseAnonKey: env.SUPABASE_ANON_KEY || '', provider: payProvider(env), tossClientKey: payProvider(env) === 'toss' ? env.TOSS_CLIENT_KEY : '', portone: payProvider(env) === 'portone' ? portoneKeys(env, testPay) : null },
    member: member ? { id: member.id, email: member.email, provider: member.provider } : null,
    sajuKey: key, worlds, products: forSale, annual, admin: admin ? { viewAsFree } : null,
  });
}
