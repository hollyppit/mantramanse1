// 이용 기록(7단계 성과 지표): 로그인 회원이 그날 어느 영역을 썼는지 하루 한 줄(cm_activity). 날짜·영역만, 시각·행동은 남기지 않는다.
// 표: supabase/migrations/20261116_admin_stage7.sql · 13개월 지나면 자동 파기(pg_cron)
// 붙인 곳: /api/community/me GET(광장 'community') · /api/commerce/access 회원일 때(심층 분석 'report')
// 실패해도 화면을 막지 않는다. 같은 작업 공간(isolate) 안에서는 하루 한 번만 DB 에 쓴다.
import { sbRest, supabaseReady } from './_commerce.js';
import { kstDay } from './_daily.js';

export const SURFACES = ['report', 'community'];
const seen = new Set();
export async function touch(env, userId, surface, now = Date.now()) {
  if (!supabaseReady(env) || !SURFACES.includes(surface) || !/^[0-9a-f-]{36}$/i.test(String(userId || ''))) return false;
  const day = kstDay(now), k = userId + '|' + day + '|' + surface;
  if (seen.has(k)) return false;
  if (seen.size > 5000) seen.clear();
  seen.add(k);
  try {
    await sbRest(env, 'cm_activity?on_conflict=user_id,day,surface', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ user_id: userId, day, surface }) });
    return true;
  } catch { seen.delete(k); return false; }
}
// 응답을 늦추지 않게: waitUntil 이 있으면 뒤에서, 없으면 기다린다
export function touchLater(ctx, env, userId, surface) {
  const p = touch(env, userId, surface).catch(() => false);
  if (ctx && typeof ctx.waitUntil === 'function') { ctx.waitUntil(p); return null; }
  return p;
}
export const _resetSeen = () => seen.clear();   // 테스트용
