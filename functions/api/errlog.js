// 뷰어 오류 수집 API. 설계: report/v2/ERROR_LOG_DESIGN.md · 로직: ../_errlog.js(순수)
//   POST /api/errlog         — 공개. 오류 한 건(2KB 이하 JSON). 기본은 꺼져 있어(env.ERRLOG_ON !== '1') 아무것도 저장하지 않고 204 + x-errlog: off.
//                              켜져 있으면: 같은 출처만, IP 시간당 한도(env.ERRLOG_HOURLY_LIMIT, 기본 30), 하루 집계에 합친다. 응답은 항상 본문 없는 204(거절 이유를 밖에 알리지 않음).
//   GET  /api/errlog?days=7  — 관리자. 최근 N일(1~14) 일별 집계 + 요약.
// 저장: kv 키 err:day:YYYY-MM-DD (TTL 14일), 한도 카운터 rl:errlog:<ip>:<시각> (TTL 2시간). IP 는 카운터 키에만 쓰고 집계에는 넣지 않는다.
import { json, isAdmin, configError } from '../_lib.js';
import { kvOf } from '../_store.js';
import { MAX_BODY, TTL_DAYS, cleanReport, dayOf, dayKey, merge, summarize } from '../_errlog.js';

const empty = (status, headers) => new Response(null, { status, headers: { 'cache-control': 'no-store', ...(headers || {}) } });

export async function onRequestPost({ request, env }) {
  if (!env || env.ERRLOG_ON !== '1' || !env.GLOSSARY_KV) return empty(204, { 'x-errlog': 'off' });
  // 같은 출처에서 온 것만 받는다(브라우저가 Origin 을 보내면 호스트가 같아야 한다). 헤더가 없으면(서버 간 호출 등) 통과시키지 않고 버린다.
  const host = new URL(request.url).host, ref = request.headers.get('origin') || request.headers.get('referer') || '';
  let from = ''; try { from = new URL(ref).host; } catch { from = ''; }
  if (!from || from !== host) return empty(204);
  const text = await request.text().catch(() => '');
  if (text.length > MAX_BODY) return empty(413);
  let b; try { b = JSON.parse(text); } catch { return empty(400); }
  const r = cleanReport(b); if (!r) return empty(204);
  const kv = kvOf(env), now = Date.now();
  // IP·시간당 한도(방문자 호출 한도의 선례: api/ik.js deepForService)
  const ip = request.headers.get('cf-connecting-ip') || 'x', hk = 'rl:errlog:' + ip + ':' + new Date(now).toISOString().slice(0, 13);
  const used = +(await kv.get(hk)) || 0;
  if (used >= (+env.ERRLOG_HOURLY_LIMIT || 30)) return empty(429);
  await kv.put(hk, String(used + 1), { expirationTtl: 7200 });
  const key = dayKey(dayOf(now)), cur = await kv.get(key, 'json');
  await kv.put(key, JSON.stringify(merge(cur, r, now)), { expirationTtl: TTL_DAYS * 86400 });
  return empty(204);
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const kv = kvOf(env), q = new URL(request.url).searchParams, n = Math.max(1, Math.min(TTL_DAYS, Math.round(+q.get('days')) || 7)), days = [];
  for (let i = 0; i < n; i++) { const d = dayOf(Date.now() - i * 86400000); days.push({ day: d, data: await kv.get(dayKey(d), 'json') }); }
  return json({ on: env.ERRLOG_ON === '1', days: days.map(x => ({ day: x.day, total: x.data ? x.data.total : 0, dropped: x.data ? x.data.dropped : 0 })), summary: summarize(days.map(x => x.data), 20) });
}
