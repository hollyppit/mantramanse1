// 관리자 전용 결제 관리. Authorization: Bearer <관리자 비밀번호>
// GET  /api/commerce/admin                      → { products, worlds, orders(최근 100), configured }
// PUT  /api/commerce/admin  { products: [...] } → 상품 이름·가격·판매 여부·순서 저장(KV commerce:products)
// POST /api/commerce/admin  { action: 'cancel', orderId, reason }  → 결제 취소(전액, 포트원·토스) + 권한 회수
// POST /api/commerce/admin  { action: 'regrant', orderId }         → 결제 완료 주문의 권한을 다시 넣는다(기록 실패 복구용)
import { json, isAdmin, configError } from '../../_lib.js';
import { kvOf } from '../../_store.js';
import { loadProducts, cleanProducts, PRODUCTS_KEY, worldAccess, sbRest, tossCall, supabaseReady, tossReady, grantOrder, portoneReady, payProvider, cancelPortone, PORTONE_PREFIX, expirePending, viewedByOrder, cancelOrder } from '../../_commerce.js';

const enc = encodeURIComponent;
const who = request => { try { return decodeURIComponent(request.headers.get('x-reviewer') || '').slice(0, 30) || 'admin'; } catch { return 'admin'; } };

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const [products, worlds] = await Promise.all([loadProducts(env), worldAccess(env)]);
  let orders = [], ordersError = null, sweep = null;
  // 관리자 화면을 열 때마다 30분 넘은 결제 대기 주문을 정리한다(포트원 결제는 실제 결제 여부를 확인한 뒤)
  if (supabaseReady(env)) { try { sweep = await expirePending(env, { limit: 20 }); } catch { sweep = null; } }
  if (supabaseReady(env)) { try { orders = await sbRest(env, 'commerce_orders?select=order_id,user_id,saju_label,product_id,product_name,worlds,amount,status,method,failure,created_at,paid_at,canceled_at,cancel_reason&order=created_at.desc&limit=100'); } catch (e) { ordersError = 'commerce-unavailable'; } }
  try { const v = await viewedByOrder(env, (orders || []).map(o => o.order_id)); (orders || []).forEach(o => { o.viewed_at = v[o.order_id] || null; }); } catch { }
  return json({ products, worlds, orders, ordersError, sweep, configured: { supabase: supabaseReady(env), toss: tossReady(env), tossClient: !!env.TOSS_CLIENT_KEY, anon: !!env.SUPABASE_ANON_KEY, portone: portoneReady(env), portoneStore: !!env.PORTONE_STORE_ID, portoneChannel: !!env.PORTONE_CHANNEL_KEY, portoneSecret: !!env.PORTONE_API_SECRET, portoneWebhook: !!env.PORTONE_WEBHOOK_SECRET, provider: payProvider(env) } });
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
