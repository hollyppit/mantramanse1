// 보안 3차(2026-11-26): 원자적 횟수 제한 — DB 함수 rate_add·rate_reserve(supabase/migrations/20261126_security_stage3.sql)
// 왜: KV 는 '읽고 → 더해서 쓰기'라 동시에 들어온 요청이 같은 숫자를 읽고 한 번만 센다. DB 는 한 문장으로 세서 동시에 와도 정확하다.
// DB 에 닿지 못하면(설정 없음·오류·시간 초과) null 을 돌려준다 → 부르는 쪽이 예전 KV 방식으로 센다(서비스가 멈추지 않게).
const ready = env => !!(env && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
async function rpc(env, fn, body, ms) {
  const r = await fetch(String(env.SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
    method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(ms),
    headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'content-type': 'application/json' },
  });
  if (!r.ok) throw new Error('rate-rpc-' + r.status);
  return r.json();
}
// key 에 add 를 더한(빼도 됨) 뒤 숫자. 실패하면 null
export async function rateAdd(env, key, add, ttlSec, ms = 4000) {
  if (!ready(env)) return null;
  try { const n = await rpc(env, 'rate_add', { p_key: String(key).slice(0, 200), p_add: add | 0, p_ttl: ttlSec | 0 }, ms); return Number.isFinite(+n) ? +n : null; } catch { return null; }
}
// 여러 키를 한꺼번에 1씩 올린다. 하나라도 한도를 넘으면 모두 되돌림. 반환: 0 통과 · k(1부터) 그 키가 한도 · null 실패
export async function rateReserve(env, keys, maxes, ttlSec, ms = 4000) {
  if (!ready(env)) return null;
  try { const n = await rpc(env, 'rate_reserve', { p_keys: keys.map(k => String(k).slice(0, 200)), p_max: maxes.map(m => m | 0), p_ttl: ttlSec | 0 }, ms); return Number.isFinite(+n) ? +n : null; } catch { return null; }
}
