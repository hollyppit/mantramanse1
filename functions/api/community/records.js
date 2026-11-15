// 운명의 기록 회고(4단계). 본인 기록만.
// GET    ?range=week|month(기본 week) → { range, from, to, logs:[{ day, mood, tags, note, tenGod }], summary }  summary = functions/_daily.js reflect
// DELETE ?day=YYYY-MM-DD → 그날 기록 지우기
import { json, sbRest, supabaseReady, viewer } from '../../_plaza.js';
import { kstDay, reflect } from '../../_daily.js';

const enc = encodeURIComponent;
export async function onRequestGet({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const range = new URL(request.url).searchParams.get('range') === 'month' ? 'month' : 'week';
  const to = kstDay(), from = kstDay(Date.now() - (range === 'month' ? 29 : 6) * 864e5);
  const rows = (await sbRest(env, `cm_logs?user_id=eq.${enc(me.id)}&day=gte.${from}&day=lte.${to}&select=day,mood,tags,note,ten_god&order=day.desc`)) || [];
  return json({ range, from, to, logs: rows.map(r => ({ day: r.day, mood: r.mood, tags: r.tags || [], note: r.note || '', tenGod: r.ten_god })), summary: reflect(rows) });
}

export async function onRequestDelete({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '잠시 후 다시 시도해 주세요' }, 503);
  const me = await viewer(request, env); if (!me) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  const day = new URL(request.url).searchParams.get('day') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: '잘못된 날짜입니다' }, 400);
  await sbRest(env, `cm_logs?user_id=eq.${enc(me.id)}&day=eq.${day}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
  return json({ ok: true });
}
