// POST /api/commerce/order — 결제창을 열기 전에 서버에 '결제 대기' 주문을 만든다(회원 전용).
// 요청: { productId, sd, label? } + 헤더 x-member-token
// 응답: { orderId, amount, orderName, customerKey, worlds, provider } (포트원은 orderId 를 결제 id(paymentId)로 쓴다) — 금액은 서버 상품표로만 정한다(브라우저 금액을 믿지 않음)
import { json } from '../../_lib.js';
import { sajuKey, memberOf, loadProducts, productWorlds, ownedWorlds, sbRest, payReady, payProvider, newOrderId, expirePending, cleanBirth } from '../../_commerce.js';

export async function onRequestPost({ request, env, waitUntil }) {
  if (!payReady(env)) return json({ error: 'not-configured' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: 'login-required' }, 401);
  // 이 회원의 30분 넘은 결제 대기 주문을 응답과 따로 정리한다(결제창을 닫고 다시 사는 경우가 많다)
  const sweep = expirePending(env, { userId: member.id, limit: 10 }).catch(() => null); if (typeof waitUntil === 'function') waitUntil(sweep);
  let body; try { body = await request.json(); } catch { return json({ error: 'bad-payload' }, 400); }
  const key = await sajuKey(body && body.sd); if (!key) return json({ error: 'invalid-saju' }, 400);
  const product = (await loadProducts(env)).find(p => p.id === (body && body.productId));
  if (!product || !product.active || !(product.price > 0)) return json({ error: 'unknown-product' }, 400);
  const worlds = await productWorlds(env, product); if (!worlds.length) return json({ error: 'nothing-to-unlock' }, 400);
  let owned = []; try { owned = await ownedWorlds(env, member.id, key); } catch { return json({ error: 'commerce-unavailable' }, 503); }
  if (worlds.every(w => owned.includes(w))) return json({ error: 'already-owned' }, 409);
  const orderId = newOrderId(), label = typeof body.label === 'string' ? body.label.trim().slice(0, 30) : null;
  try {
    await sbRest(env, 'commerce_orders', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ order_id: orderId, user_id: member.id, saju_key: key, saju_label: label, product_id: product.id, product_name: product.name, worlds, amount: product.price, birth: cleanBirth(body.birth) }) });
  } catch { return json({ error: 'commerce-unavailable' }, 503); }
  return json({ orderId, amount: product.price, orderName: product.name, customerKey: member.id, worlds, provider: payProvider(env) });
}
