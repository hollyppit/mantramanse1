// 구매 전환 측정: 하루(KST)·단계마다 방문자 수. 방문자 = 브라우저마다 만든 무작위 id(localStorage mt_vid). 개인정보 없음.
// 단계: read → gate → login_start → gate_logged → checkout → paid (supabase/migrations/20261112_commerce_funnel.sql)
// 관리자 화면에는 이 숫자와 함께 실제 주문표의 '주문 생성·결제 완료'(테스트 제외)를 나란히 보여 준다.
import { sbRest } from './_commerce.js';

export const STEPS = ['read', 'gate', 'login_start', 'gate_logged', 'checkout', 'paid'];
export const STEP_LABEL = { read: '장을 읽음', gate: '잠긴 장에서 구매 창', login_start: '로그인 시작', gate_logged: '로그인한 채 구매 창', checkout: '결제창 열기', paid: '결제 완료' };
const KST = 9 * 3600000, KEEP_DAYS = 180;
export const kstDate = (t = Date.now()) => new Date(t + KST).toISOString().slice(0, 10);
const VID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const validEvent = b => !!(b && STEPS.includes(b.step) && VID.test(String(b.vid || '').toLowerCase()));

export async function recordStep(env, step, vid, now = Date.now()) {
  await sbRest(env, 'commerce_funnel?on_conflict=day,step,vid', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify([{ day: kstDate(now), step, vid: String(vid).toLowerCase() }]) });
}

// 최근 days 일(오늘 포함) 날짜별 단계 수 + 주문표 기준 주문 생성·결제 완료 수(테스트 제외)
export async function funnelReport(env, days = 14, now = Date.now()) {
  const to = kstDate(now), from = kstDate(now - (days - 1) * 86400000);
  const fromIso = new Date(Date.parse(from + 'T00:00:00Z') - KST).toISOString();
  const [rows, orders] = await Promise.all([
    sbRest(env, 'rpc/commerce_funnel_counts', { method: 'POST', body: JSON.stringify({ from_day: from, to_day: to }) }),
    sbRest(env, `commerce_orders?select=created_at,paid_at,status&is_test=eq.false&created_at=gte.${encodeURIComponent(fromIso)}&limit=5000`),
  ]);
  const byDay = {};
  for (let i = 0; i < days; i++) { const d = kstDate(now - i * 86400000); byDay[d] = { day: d, steps: Object.fromEntries(STEPS.map(s => [s, 0])), orders: 0, paidOrders: 0 }; }
  for (const r of rows || []) if (byDay[r.day] && STEPS.includes(r.step)) byDay[r.day].steps[r.step] = +r.n || 0;
  for (const o of orders || []) {
    const c = byDay[kstDate(Date.parse(o.created_at))]; if (c) c.orders++;
    if (o.paid_at) { const p = byDay[kstDate(Date.parse(o.paid_at))]; if (p) p.paidOrders++; }
  }
  const list = Object.values(byDay).sort((a, b) => b.day.localeCompare(a.day));
  const total = { steps: Object.fromEntries(STEPS.map(s => [s, list.reduce((a, d) => a + d.steps[s], 0)])), orders: list.reduce((a, d) => a + d.orders, 0), paidOrders: list.reduce((a, d) => a + d.paidOrders, 0) };
  return { from, to, days: list, total, steps: STEPS, labels: STEP_LABEL };
}
export async function purgeFunnel(env, now = Date.now()) {
  await sbRest(env, `commerce_funnel?day=lt.${kstDate(now - KEEP_DAYS * 86400000)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
}
