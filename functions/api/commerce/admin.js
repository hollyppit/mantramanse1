// 관리자 전용 결제 관리. Authorization: Bearer <관리자 비밀번호>
// GET  /api/commerce/admin                      → { products, worlds, orders(최근 100), configured }
// PUT  /api/commerce/admin  { products: [...] } → 상품 이름·가격·판매 여부·순서 저장(KV commerce:products)
// POST /api/commerce/admin  { action: 'cancel', orderId, reason }  → 토스 결제 취소(전액) + 권한 회수
// POST /api/commerce/admin  { action: 'regrant', orderId }         → 결제 완료 주문의 권한을 다시 넣는다(기록 실패 복구용)
import { json, isAdmin, configError } from '../../_lib.js';
import { kvOf } from '../../_store.js';
import { loadProducts, cleanProducts, PRODUCTS_KEY, worldAccess, sbRest, tossCall, supabaseReady, tossReady, grantOrder } from '../../_commerce.js';

const enc = encodeURIComponent;
const who = request => { try { return decodeURIComponent(request.headers.get('x-reviewer') || '').slice(0, 30) || 'admin'; } catch { return 'admin'; } };

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const [products, worlds] = await Promise.all([loadProducts(env), worldAccess(env)]);
  let orders = [], ordersError = null;
  if (supabaseReady(env)) { try { orders = await sbRest(env, 'commerce_orders?select=order_id,user_id,saju_label,product_id,product_name,worlds,amount,status,method,failure,created_at,paid_at,canceled_at,cancel_reason&order=created_at.desc&limit=100'); } catch (e) { ordersError = 'commerce-unavailable'; } }
  return json({ products, worlds, orders, ordersError, configured: { supabase: supabaseReady(env), toss: tossReady(env), tossClient: !!env.TOSS_CLIENT_KEY, anon: !!env.SUPABASE_ANON_KEY } });
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
  const orderId = typeof b.orderId === 'string' && /^mt_[\w]+$/.test(b.orderId) ? b.orderId : '';
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
    if (!tossReady(env)) return json({ error: 'not-configured' }, 503);
    const reason = (typeof b.reason === 'string' && b.reason.trim().slice(0, 100)) || '관리자 취소';
    const t = await tossCall(env, `payments/${enc(order.payment_key)}/cancel`, { cancelReason: reason });
    if (!t.ok) return json({ error: '토스 취소 실패: ' + ((t.data && t.data.message) || t.status) }, 400);
    const at = new Date().toISOString();
    await sbRest(env, `commerce_orders?order_id=eq.${enc(orderId)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'canceled', canceled_at: at, cancel_reason: reason }) });
    await sbRest(env, `commerce_entitlements?order_id=eq.${enc(orderId)}&revoked_at=is.null`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: at }) });
    return json({ ok: true });
  }
  return json({ error: '알 수 없는 작업입니다' }, 400);
}
