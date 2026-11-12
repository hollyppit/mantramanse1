// 관리자 전용 결제 관리. Authorization: Bearer <관리자 비밀번호>
// GET  /api/commerce/admin                      → { products, worlds, orders(최근 100), configured }
// PUT  /api/commerce/admin  { products: [...] } → 상품 이름·가격·판매 여부·순서 저장(KV commerce:products)
// POST /api/commerce/admin  { action: 'cancel', orderId, reason }  → 결제 취소(전액, 포트원·토스) + 권한 회수
// POST /api/commerce/admin  { action: 'regrant', orderId }         → 결제 완료 주문의 권한을 다시 넣는다(기록 실패 복구용)
// POST /api/commerce/admin  { action: 'set-test', orderId, isTest } → 테스트 주문 표시(매출 요약·CSV 에서 뺀다)
// GET  /api/commerce/admin?export=csv&from=YYYY-MM-DD&to=YYYY-MM-DD → 기간 매출·환불 CSV(한국 시간, 테스트 제외. &test=1 이면 포함)
import { json, isAdmin, configError } from '../../_lib.js';
import { kvOf } from '../../_store.js';
import { loadProducts, cleanProducts, PRODUCTS_KEY, worldAccess, sbRest, tossCall, supabaseReady, tossReady, grantOrder, portoneReady, payProvider, cancelPortone, PORTONE_PREFIX, expirePending, viewedByOrder, cancelOrder, readSignal } from '../../_commerce.js';
import { naverReady } from '../../_naver-login.js';
import { summaryAll, salesCsv, kstDay } from '../../_sales.js';
import { alertReady } from '../../_mail.js';
import { funnelReport, purgeFunnel } from '../../_funnel.js';

const enc = encodeURIComponent;
const who = request => { try { return decodeURIComponent(request.headers.get('x-reviewer') || '').slice(0, 30) || 'admin'; } catch { return 'admin'; } };

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  // CSV 내려받기: ?export=csv&from=YYYY-MM-DD&to=YYYY-MM-DD(&test=1 이면 테스트 주문 포함). 날짜는 한국 시간
  const u = new URL(request.url);
  if (u.searchParams.get('export') === 'csv') {
    if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
    const from = kstDay(u.searchParams.get('from')), to = kstDay(u.searchParams.get('to'), true);
    if (!from || !to || from >= to) return json({ error: '기간을 YYYY-MM-DD 로 넣어 주세요' }, 400);
    const csv = await salesCsv(env, from, to, u.searchParams.get('test') === '1');
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="sales_${u.searchParams.get('from')}_${u.searchParams.get('to')}.csv"`, 'cache-control': 'no-store' } });
  }
  const [products, worlds] = await Promise.all([loadProducts(env), worldAccess(env)]);
  let orders = [], ordersError = null, sweep = null;
  // 관리자 화면을 열 때마다 30분 넘은 결제 대기 주문을 정리한다(포트원 결제는 실제 결제 여부를 확인한 뒤)
  if (supabaseReady(env)) { try { sweep = await expirePending(env, { limit: 20 }); } catch { sweep = null; } }
  if (supabaseReady(env)) { try { orders = await sbRest(env, 'commerce_orders?select=order_id,user_id,saju_label,product_id,product_name,worlds,amount,status,method,failure,created_at,paid_at,canceled_at,cancel_reason,is_test&order=created_at.desc&limit=100'); } catch (e) { ordersError = 'commerce-unavailable'; } }
  try { const v = await viewedByOrder(env, (orders || []).map(o => o.order_id)); (orders || []).forEach(o => { o.viewed_at = v[o.order_id] || null; }); } catch { }
  // 판매 준비 점검(실판매 전환 체크리스트): 각 항목 { ok: true|false|null(확인 불가), note }
  const [channel, hook] = await Promise.all([readSignal(env, 'portone-channel'), readSignal(env, 'portone-webhook')]);
  const forSale = products.filter(p => p.active && p.price > 0), paidWorlds = Object.values(worlds).filter(w => w.enabled && w.paid);
  const lastPaid = (orders || []).find(o => o.status === 'paid' && String(o.order_id).startsWith('mt') && !String(o.order_id).includes('_'));
  const readiness = [
    { id: 'provider', label: '결제사: 포트원', ok: payProvider(env) === 'portone', note: payProvider(env) === 'portone' ? '포트원으로 결제창을 엽니다' : '지금 결제사: ' + (payProvider(env) || '없음') },
    { id: 'live-channel', label: '실연동 채널(실제 돈이 오가는 채널)', ok: channel ? channel.type === 'LIVE' : null, note: channel ? '마지막 결제의 채널: ' + (channel.type || '?') + (channel.pg ? ' · ' + channel.pg : '') + ' (' + String(channel.at).slice(0, 16).replace('T', ' ') + ')' + (channel.type === 'LIVE' ? '' : ' → KPN 승인 뒤 PORTONE_CHANNEL_KEY 를 실연동 채널 키로 바꾸고 재배포, 소액 결제로 확인') : '아직 포트원 결제 기록이 없습니다' },
    { id: 'webhook', label: '포트원 웹훅 수신', ok: hook ? true : null, note: hook ? '마지막 수신 ' + String(hook.at).slice(0, 16).replace('T', ' ') + (hook.type ? ' · ' + hook.type : '') : '받은 적 없음 → 포트원 콘솔 결제알림(Webhook)에 https://mantrafortune.com/api/commerce/webhook 등록(실연동 탭에도)' },
    { id: 'webhook-secret', label: '웹훅 서명 확인(권장)', ok: !!env.PORTONE_WEBHOOK_SECRET, note: env.PORTONE_WEBHOOK_SECRET ? (hook && hook.signed === false ? '⚠ 마지막 웹훅 서명이 맞지 않았습니다(시크릿 값 확인)' : '설정됨') : '선택: 포트원 웹훅 시크릿을 PORTONE_WEBHOOK_SECRET 에 넣으면 서명까지 확인' },
    { id: 'products', label: '판매 상품·가격', ok: forSale.length > 0, note: forSale.map(p => p.name + ' ' + p.price.toLocaleString('ko-KR') + '원').join(' · ') || '판매 중인 상품이 없습니다' },
    { id: 'worlds', label: '유료 주제', ok: paidWorlds.length > 0, note: paidWorlds.map(w => w.name).join(' · ') || '유료로 설정된 주제가 없습니다(주제·표지 설정 → 이용 권한)' },
    { id: 'login', label: '로그인(카카오·구글·네이버)', ok: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY), note: '카카오·구글 켜짐' + (naverReady(env) ? ' · 네이버 켜짐(검수 통과·서비스 적용)' : ' · 네이버 꺼짐') },
    { id: 'admin-alert', label: '관리자 알림 메일(결제·환불·실패)', ok: alertReady(env), note: alertReady(env) ? '켜짐 · 받는 주소 ' + String(env.ADMIN_ALERT_EMAIL).split(',').length + '개' : 'Cloudflare 환경변수 ADMIN_ALERT_EMAIL 에 받을 주소를 넣고 재배포(RESEND_API_KEY 도 필요)' },
    { id: 'mail', label: '구매 확인·환불 메일(Resend)', ok: !!env.RESEND_API_KEY, note: env.RESEND_API_KEY ? '켜짐 · 보내는 주소 ' + (env.MAIL_FROM || 'noreply@mantrafortune.com') : 'RESEND_API_KEY 를 넣으면 결제·환불 때 자동 발송(Resend 도메인 인증 필요)' },
    { id: 'refund', label: '환불(바로 환불·관리자 취소)', ok: true, note: '7일 이내·미열람 주문은 고객이 내 구매 내역에서 바로 환불' },
    { id: 'last-paid', label: '최근 결제 확인', ok: lastPaid ? true : null, note: lastPaid ? lastPaid.product_name + ' ' + (lastPaid.amount || 0).toLocaleString('ko-KR') + '원 · ' + String(lastPaid.paid_at || '').slice(0, 16).replace('T', ' ') : '결제 완료 주문이 없습니다' },
  ];
  let sales = null; if (supabaseReady(env)) { try { sales = await summaryAll(env); } catch { sales = null; } }   // 매출 요약(테스트 주문 제외)
  // 구매 전환(최근 14일): 단계별 방문자 수 + 주문표 기준 주문·결제. 180일 지난 기록은 이때 지운다
  let funnel = null; if (supabaseReady(env)) { try { funnel = await funnelReport(env, 14); await purgeFunnel(env).catch(() => { }); } catch { funnel = null; } }
  return json({ products, worlds, orders, ordersError, sweep, readiness, sales, funnel, configured: { supabase: supabaseReady(env), toss: tossReady(env), tossClient: !!env.TOSS_CLIENT_KEY, anon: !!env.SUPABASE_ANON_KEY, portone: portoneReady(env), portoneStore: !!env.PORTONE_STORE_ID, portoneChannel: !!env.PORTONE_CHANNEL_KEY, portoneSecret: !!env.PORTONE_API_SECRET, portoneWebhook: !!env.PORTONE_WEBHOOK_SECRET, provider: payProvider(env) } });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (!b || !Array.isArray(b.products)) return json({ error: '{ products: [...] } 형식이어야 합니다' }, 400);
  const products = cleanProducts(b.products);
  await kvOf(env).put(PRODUCTS_KEY, JSON.stringify({ products, at: new Date().toISOString(), by: who(request) }));
  return json({ ok: true, products });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const orderId = typeof b.orderId === 'string' && /^mt\w{6,62}$/.test(b.orderId) ? b.orderId : '';
  if (!orderId) return json({ error: '주문번호가 올바르지 않습니다' }, 400);
  const order = (await sbRest(env, `commerce_orders?select=*&order_id=eq.${enc(orderId)}`))[0];
  if (!order) return json({ error: '주문을 찾을 수 없습니다' }, 404);
  if (b.action === 'set-test') {   // 테스트 주문 표시 켜기·끄기(매출 요약·CSV 에서 빠진다)
    await sbRest(env, `commerce_orders?order_id=eq.${enc(orderId)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ is_test: b.isTest === true }) });
    return json({ ok: true });
  }
  if (b.action === 'regrant') {
    if (order.status !== 'paid') return json({ error: '결제 완료 주문만 권한을 다시 줄 수 있습니다' }, 409);
    await grantOrder(env, order, 'admin:' + who(request));
    return json({ ok: true });
  }
  if (b.action === 'cancel') {
    if (order.status !== 'paid') return json({ error: '결제 완료 주문만 취소할 수 있습니다' }, 409);
    const reason = (typeof b.reason === 'string' && b.reason.trim().slice(0, 100)) || '관리자 취소';
    const c = await cancelOrder(env, order, reason);   // 결제한 결제사(포트원·토스)로 취소 + 권한 회수
    if (!c.ok) return json({ error: c.message || c.error }, c.error === 'not-configured' ? 503 : 400);
    return json({ ok: true });
  }
  return json({ error: '알 수 없는 작업입니다' }, 400);
}
