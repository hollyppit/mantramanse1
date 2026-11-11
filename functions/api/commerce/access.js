// POST /api/commerce/access — 무빙툰 화면이 잠금·구매 버튼을 그리는 데 쓰는 정보(공개).
// 요청: { sd } (+ 선택 헤더 x-member-token: Supabase 로그인 토큰, 관리자는 Authorization + 선택 x-view-as: free)
// 응답: { configured: { login, pay }, keys: { supabaseUrl, supabaseAnonKey, provider, tossClientKey, portone: { storeId, channelKey } }, member, sajuKey,
//         worlds: { w1: { paid, owned, freeChapter } … }, products: [판매 중인 상품], admin }
// 공개 키(SUPABASE_ANON_KEY·TOSS_CLIENT_KEY·포트원 상점 ID·채널 키)만 내려 보낸다. 서버 전용 키는 절대 내려 보내지 않는다.
import { json, isAdmin } from '../../_lib.js';
import { naverReady } from '../../_naver-login.js';
import { sajuKey, memberOf, worldAccess, freeChapters, ownedWorlds, loadProducts, productWorlds, payReady, payProvider } from '../../_commerce.js';

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return json({ error: 'bad-payload' }, 400); }
  const admin = isAdmin(request, env), viewAsFree = admin && (request.headers.get('x-view-as') || '') === 'free';
  const [access, free, products, member, key] = await Promise.all([worldAccess(env), freeChapters(env), loadProducts(env), memberOf(request, env), sajuKey(body && body.sd)]);
  let owned = [];
  if (member && key) { try { owned = await ownedWorlds(env, member.id, key); } catch { owned = []; } }
  const worlds = {};
  for (const [id, a] of Object.entries(access)) {
    if (!a.enabled) continue;
    const open = !a.paid || (admin && !viewAsFree);
    worlds[id] = { paid: a.paid, owned: open || owned.includes(id), freeChapter: a.paid ? free[id] || null : null };
  }
  const forSale = [];
  for (const p of products) {
    if (!p.active || !(p.price > 0)) continue;
    const ws = await productWorlds(env, p);
    if (!ws.length || ws.every(w => !worlds[w] || !worlds[w].paid)) continue;   // 잠긴 세계가 없는 상품은 팔지 않는다
    forSale.push({ id: p.id, name: p.name, kind: p.kind, price: p.price, worlds: ws, owned: ws.every(w => worlds[w] && worlds[w].owned) });
  }
  return json({
    configured: { login: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY), naver: naverReady(env), pay: payReady(env) },
    keys: { supabaseUrl: env.SUPABASE_URL || '', supabaseAnonKey: env.SUPABASE_ANON_KEY || '', provider: payProvider(env), tossClientKey: payProvider(env) === 'toss' ? env.TOSS_CLIENT_KEY : '', portone: payProvider(env) === 'portone' ? { storeId: env.PORTONE_STORE_ID, channelKey: env.PORTONE_CHANNEL_KEY } : null },
    member: member ? { id: member.id, email: member.email, provider: member.provider } : null,
    sajuKey: key, worlds, products: forSale, admin: admin ? { viewAsFree } : null,
  });
}
