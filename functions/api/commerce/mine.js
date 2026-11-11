// POST /api/commerce/mine — 로그인한 회원 본인의 구매 내역(회원 전용, 헤더 x-member-token).
// 응답: { member: { email, provider }, orders: [...], worldNames }
// 보여 주는 주문: 결제 완료·취소·부분 취소, 그리고 30분 안 된 '결제 확인 중' 주문. 실패·만료 주문은 고객 화면에 보이지 않는다.
// 주문의 사주는 이름표(saju_label)로만 보여 준다(사주 식별값·생년월일은 내려 보내지 않는다).
import { json } from '../../_lib.js';
import { memberOf, sbRest, supabaseReady, worldAccess } from '../../_commerce.js';

const SHOWN = ['paid', 'canceled', 'partial_canceled'];
export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: 'login-required' }, 401);
  let rows;
  try {
    rows = await sbRest(env, `commerce_orders?select=order_id,product_name,saju_label,worlds,amount,status,method,created_at,paid_at,canceled_at&user_id=eq.${encodeURIComponent(member.id)}&order=created_at.desc&limit=100`);
  } catch { return json({ error: 'commerce-unavailable' }, 503); }
  const fresh = Date.now() - 30 * 60000;
  // 고객 화면에 필요한 칸만 골라 담는다(조회식이 바뀌어도 사주 식별값·회원 id 가 새지 않게)
  const pick = o => ({ order_id: o.order_id, product_name: o.product_name, saju_label: o.saju_label, worlds: o.worlds, amount: o.amount, status: o.status, method: o.method, created_at: o.created_at, paid_at: o.paid_at, canceled_at: o.canceled_at });
  const orders = (rows || []).filter(o => SHOWN.includes(o.status) || (o.status === 'pending' && Date.parse(o.created_at) > fresh)).slice(0, 50).map(pick);
  let names = {}; try { const a = await worldAccess(env); for (const [id, w] of Object.entries(a)) if (w.name) names[id] = w.name; } catch { names = {}; }
  return json({ member: { email: member.email, provider: member.provider }, orders, worldNames: names }, 200);
}
