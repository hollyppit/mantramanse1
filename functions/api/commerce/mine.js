// POST /api/commerce/mine — 로그인한 회원 본인의 구매 내역(회원 전용, 헤더 x-member-token).
// 응답: { member: { email, provider }, orders: [...], worldNames }
// 보여 주는 주문: 결제 완료·취소·부분 취소, 그리고 30분 안 된 '결제 확인 중' 주문. 실패·만료 주문은 고객 화면에 보이지 않는다.
// 주문의 사주는 이름표(saju_label)로만 보여 준다(사주 식별값은 내려 보내지 않는다).
// sajus: 구매한 사주의 출생 입력(회원 본인이 구매할 때 입력한 값) — '이 사주로 바로 읽기'에 쓴다. 본인 토큰으로만 받는다.
// 주문마다 viewed_at(첫 유료 장 열람 시각)을 붙인다: 환불정책 '7일 이내·미열람' 판단.
import { json } from '../../_lib.js';
import { memberOf, sbRest, supabaseReady, worldAccess, viewedByOrder } from '../../_commerce.js';

const SHOWN = ['paid', 'canceled', 'partial_canceled'];
export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: 'login-required' }, 401);
  let body = {}; try { body = await request.json(); } catch { body = {}; }
  // 저장한 사주 지우기: 회원의 저장본과, 그 사주로 한 주문에 남은 출생 입력을 지운다(구매 권한은 그대로)
  if (body && body.action === 'forget') {
    if (!/^[0-9a-f]{8}$/.test(body.ref || '')) return json({ error: 'bad-ref' }, 400);
    try {
      const saved = (await sbRest(env, `member_sajus?select=saju_key&user_id=eq.${encodeURIComponent(member.id)}`)) || [];
      const hit = saved.find(s => s.saju_key.slice(3, 11) === body.ref); if (!hit) return json({ error: 'not-found' }, 404);
      const k = encodeURIComponent(hit.saju_key), u = encodeURIComponent(member.id);
      await sbRest(env, `member_sajus?user_id=eq.${u}&saju_key=eq.${k}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
      await sbRest(env, `commerce_orders?user_id=eq.${u}&saju_key=eq.${k}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ birth: null }) });
      return json({ ok: true });
    } catch { return json({ error: 'commerce-unavailable' }, 503); }
  }
  let rows;
  try {
    rows = await sbRest(env, `commerce_orders?select=order_id,product_name,saju_label,worlds,amount,status,method,created_at,paid_at,canceled_at&user_id=eq.${encodeURIComponent(member.id)}&order=created_at.desc&limit=100`);
  } catch { return json({ error: 'commerce-unavailable' }, 503); }
  const fresh = Date.now() - 30 * 60000;
  // 고객 화면에 필요한 칸만 골라 담는다(조회식이 바뀌어도 사주 식별값·회원 id 가 새지 않게)
  const pick = o => ({ order_id: o.order_id, product_name: o.product_name, saju_label: o.saju_label, worlds: o.worlds, amount: o.amount, status: o.status, method: o.method, created_at: o.created_at, paid_at: o.paid_at, canceled_at: o.canceled_at });   // viewed_at 은 아래에서 붙인다
  const orders = (rows || []).filter(o => SHOWN.includes(o.status) || (o.status === 'pending' && Date.parse(o.created_at) > fresh)).slice(0, 50).map(pick);
  // 주문별 첫 유료 장 열람 시각(환불 가능 여부 판단)
  let viewed = {}; try { viewed = await viewedByOrder(env, orders.map(o => o.order_id)); } catch { viewed = {}; }
  orders.forEach(o => { o.viewed_at = viewed[o.order_id] || null; });
  // 구매한 사주(저장된 출생 입력) + 그 사주로 열려 있는 주제: '이 사주로 바로 읽기'
  let sajus = [];
  try {
    const [saved, ents] = await Promise.all([
      sbRest(env, `member_sajus?select=saju_key,label,birth&user_id=eq.${encodeURIComponent(member.id)}`),
      sbRest(env, `commerce_entitlements?select=saju_key,world&user_id=eq.${encodeURIComponent(member.id)}&revoked_at=is.null`),
    ]);
    const worldsBy = {}; for (const e of ents || []) (worldsBy[e.saju_key] = worldsBy[e.saju_key] || new Set()).add(e.world);
    sajus = (saved || []).filter(s => worldsBy[s.saju_key] && s.birth).map(s => ({ ref: s.saju_key.slice(3, 11), label: s.label || null, birth: s.birth, worlds: [...worldsBy[s.saju_key]].sort() }));
  } catch { sajus = []; }
  let names = {}; try { const a = await worldAccess(env); for (const [id, w] of Object.entries(a)) if (w.name) names[id] = w.name; } catch { names = {}; }
  return json({ member: { email: member.email, provider: member.provider }, orders, sajus, worldNames: names }, 200);
}
