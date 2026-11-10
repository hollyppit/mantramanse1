// POST /api/commerce/confirm — 토스 결제창이 성공 주소로 돌아온 뒤 서버에서 결제를 승인하고 구매 권한을 준다(회원 전용).
// 요청: { paymentKey, orderId, amount } + 헤더 x-member-token
// 확인 순서: 내 주문인가 → 대기 상태인가 → 금액이 주문과 같은가 → 토스 승인(시크릿 키) → 주문 '결제 완료' + 세계별 권한 추가
// 같은 주문을 두 번 승인하려 하면 이미 결제된 주문으로 보고 권한만 다시 확인해 돌려준다(새로고침 대비).
import { json } from '../../_lib.js';
import { memberOf, sbRest, tossCall, supabaseReady, tossReady, grantOrder } from '../../_commerce.js';

const enc = encodeURIComponent;
export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env) || !tossReady(env)) return json({ error: 'not-configured' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: 'login-required' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: 'bad-payload' }, 400); }
  const paymentKey = typeof b.paymentKey === 'string' ? b.paymentKey.slice(0, 200) : '', orderId = typeof b.orderId === 'string' ? b.orderId.slice(0, 64) : '', amount = +b.amount;
  if (!paymentKey || !/^mt_[\w]+$/.test(orderId) || !Number.isInteger(amount)) return json({ error: 'bad-payload' }, 400);
  let order;
  try { order = (await sbRest(env, `commerce_orders?select=*&order_id=eq.${enc(orderId)}&user_id=eq.${enc(member.id)}`))[0]; } catch { return json({ error: 'commerce-unavailable' }, 503); }
  if (!order) return json({ error: 'unknown-order' }, 404);
  if (order.status === 'paid') { try { await grantOrder(env, order, 'payment'); } catch { } return json({ ok: true, already: true, worlds: order.worlds }); }
  if (order.status !== 'pending') return json({ error: 'order-' + order.status }, 409);
  if (order.amount !== amount) {
    await sbRest(env, `commerce_orders?order_id=eq.${enc(orderId)}&status=eq.pending`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', failure: 'amount-mismatch' }) }).catch(() => { });
    return json({ error: 'amount-mismatch' }, 400);
  }
  const t = await tossCall(env, 'payments/confirm', { paymentKey, orderId, amount });
  if (!t.ok || !t.data || t.data.status !== 'DONE') {
    const code = (t.data && t.data.code) || 'toss-' + t.status;
    // 동시에 두 번 승인 요청이 오면 두 번째는 토스가 거절한다: 그사이 첫 요청이 결제 완료로 바꿨으면 성공으로 돌려준다
    try { const again = (await sbRest(env, `commerce_orders?select=status,worlds&order_id=eq.${enc(orderId)}`))[0]; if (again && again.status === 'paid') return json({ ok: true, already: true, worlds: again.worlds }); } catch { }
    await sbRest(env, `commerce_orders?order_id=eq.${enc(orderId)}&status=eq.pending`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', failure: String(code).slice(0, 80) }) }).catch(() => { });
    return json({ error: 'payment-failed', code, message: (t.data && t.data.message) || '' }, 400);
  }
  try {
    await sbRest(env, `commerce_orders?order_id=eq.${enc(orderId)}&status=eq.pending`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid', payment_key: paymentKey, method: t.data.method || null, paid_at: t.data.approvedAt || new Date().toISOString() }) });
    await grantOrder(env, order, 'payment');
  } catch {
    // 결제는 됐는데 기록이 실패: 주문번호로 관리자 화면에서 '권한 다시 주기'를 할 수 있게 오류를 돌려준다(돈은 이미 빠져나갔다)
    return json({ error: 'grant-failed', orderId }, 500);
  }
  return json({ ok: true, worlds: order.worlds });
}
