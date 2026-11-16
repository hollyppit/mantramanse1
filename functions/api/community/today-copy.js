// 운테크 문안 관리(7단계). 권한 content(관리자 비밀번호·운영 매니저). 공용: functions/_daily.js(DAILY_COPY_KEY·cleanDailyCopy·loadDailyCopy)
// GET               → { defaults:{ tg, rel }, current:{ tg, rel }, changed:{ tg:[…], rel:[…] }, at, by }
// PUT { tg, rel }   → 고친 칸만 저장(기본과 같은 칸은 지움). 형식 검사 → KV 'daily:copy' → 감사 로그
// DELETE            → 모두 기본 문안으로 되돌림(감사 로그)
import { json, readBody } from '../../_plaza.js';
import { audit } from '../../_community.js';
import { need, actorOf } from '../../_staff.js';
import { TG_COPY, REL_COPY, DAILY_COPY_KEY, cleanDailyCopy, loadDailyCopy } from '../../_daily.js';

const changedOf = s => ({ tg: Object.keys((s && s.tg) || {}), rel: Object.keys((s && s.rel) || {}) });

export async function onRequestGet({ request, env }) {
  const g = await need(request, env, 'content'); if (g.res) return g.res;
  const c = await loadDailyCopy(env);
  return json({ defaults: { tg: TG_COPY, rel: REL_COPY }, current: { tg: c.tg, rel: c.rel }, changed: changedOf(c.saved), at: c.saved && c.saved.at || null, by: c.saved && c.saved.by || null });
}

export async function onRequestPut({ request, env }) {
  const g = await need(request, env, 'content'); if (g.res) return g.res;
  if (!env.GLOSSARY_KV) return json({ error: 'KV 가 없습니다' }, 503);
  const b = await readBody(request); if (!b) return json({ error: '잘못된 요청 형식입니다' }, 400);
  const r = cleanDailyCopy(b); if (!r.ok) return json({ error: r.error }, 400);
  const by = actorOf(g.staff), before = changedOf((await loadDailyCopy(env)).saved);
  const doc = { ...r.copy, at: new Date().toISOString(), by };
  await env.GLOSSARY_KV.put(DAILY_COPY_KEY, JSON.stringify(doc));
  await audit(env, by, 'community.daily.copy', null, { before, after: changedOf(doc) });
  return json({ ok: true, changed: changedOf(doc), at: doc.at });
}

export async function onRequestDelete({ request, env }) {
  const g = await need(request, env, 'content'); if (g.res) return g.res;
  if (!env.GLOSSARY_KV) return json({ error: 'KV 가 없습니다' }, 503);
  const before = changedOf((await loadDailyCopy(env)).saved);
  await env.GLOSSARY_KV.delete(DAILY_COPY_KEY);
  await audit(env, actorOf(g.staff), 'community.daily.copy.reset', null, { before });
  return json({ ok: true });
}
