// GET /api/community/metrics?day=YYYY-MM-DD — 통합 성과 지표(7단계). 권한 metrics(관리자 비밀번호·운영 매니저·분석 담당)
// DB 함수 cm_metrics(p_day) 가 한 번에 계산한다(supabase/migrations/20261116_admin_stage7.sql). 회원 단위 값 없이 개수·비율만.
// 응답: { day, active:{ all|report|community:{ dau,wau,mau, ret7:{base,back}, ret30:{base,back} } }, series:[…30일], engage, convert, match, sales, members }
//       rates: 서버가 미리 계산한 비율(%) — 분모가 MIN_BASE 명보다 적으면 null(표본이 작아 흔들리는 값은 보여 주지 않는다)
import { json, sbRest, supabaseReady } from '../../_plaza.js';
import { need } from '../../_staff.js';
import { kstDay } from '../../_daily.js';

export const MIN_BASE = 5;
export const pct = (n, base) => base >= MIN_BASE ? Math.round((n / base) * 1000) / 10 : null;
export function rates(m) {
  const a = m.active || {}, e = m.engage || {}, c = m.convert || {};
  const r = {};
  for (const s of ['all', 'report', 'community']) { const x = a[s] || {}; r[s] = { ret7: pct((x.ret7 || {}).back || 0, (x.ret7 || {}).base || 0), ret30: pct((x.ret30 || {}).back || 0, (x.ret30 || {}).base || 0), stick: x.mau ? pct(x.dau || 0, x.mau) : null }; }
  r.engage = pct(e.engaged || 0, e.base || 0);
  r.reportPaid30 = pct(c.reportBuyers || 0, c.reportUsers || 0);
  r.paidEver = pct(c.buyersEver || 0, c.members || 0);
  r.communityToReport = pct(c.communityAlsoReport || 0, c.communityUsers || 0);
  r.reportToCommunity = pct(c.reportAlsoCommunity || 0, c.reportUsers || 0);
  r.communityThenPaid = pct(c.communityThenPaid || 0, c.communityEver || 0);
  return r;
}

export async function onRequestGet({ request, env }) {
  const g = await need(request, env, 'metrics'); if (g.res) return g.res;
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  const q = new URL(request.url).searchParams.get('day') || '';
  const today = kstDay(), day = /^\d{4}-\d{2}-\d{2}$/.test(q) && q <= today && q >= '2026-01-01' ? q : today;
  let m;
  try { m = await sbRest(env, 'rpc/cm_metrics', { method: 'POST', body: JSON.stringify({ p_day: day }) }); }
  catch { return json({ error: '지표를 계산하지 못했습니다(DB 함수 cm_metrics 확인)' }, 503); }
  if (!m || typeof m !== 'object') return json({ error: '지표가 비어 있습니다' }, 503);
  return json({ ...m, rates: rates(m), minBase: MIN_BASE, role: g.staff.role });
}
