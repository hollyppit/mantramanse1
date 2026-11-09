// 운명의 타임라인 서사 엔진(report/v2/life-narrative.js) 복합 규칙의 검수·게시 관리 (2026-11-08, 2단계)
// GET  /api/narrative-rules          — { version, pub:[{id,...필드}] } 게시된 규칙만(공개, 60초 캐시)
// GET  /api/narrative-rules?all=1    — 전체 상태·이력·기본 규칙·태그 설명(관리자)
// PUT  /api/narrative-rules          — 관리자. { id, action, fields? , v? }
//   save     { id, fields }   기본 규칙 수정 또는 직접 추가한 규칙 수정 → 초안
//   create   { id, fields }   새 규칙(chapter·조건·문안 전부 필요) → 초안
//   publish | unpublish | restore(v) | delete(직접 추가한 규칙만)
// 저장은 KV 키 narrative:rules 하나만 쓴다(기존 풀이 라이브러리 키와 분리). 게시 전에는 사용자 화면에 영향이 없고,
// 스위치(lifeNarrative)가 꺼져 있으면 게시해도 화면은 그대로다. 검증은 엔진의 validateRule 하나를 같이 쓴다.
import { json, isAdmin, configError } from '../_lib.js';
import '../../report/v2/life-narrative-data.js';
import '../../report/v2/life-narrative-data-self.js';
import '../../report/v2/life-narrative-data-self2.js';
import '../../report/v2/life-narrative-data-wealth.js';
import '../../report/v2/life-narrative-data-wealth2.js';
import '../../report/v2/life-narrative-data-love.js';
import '../../report/v2/life-narrative-data-love2.js';
import '../../report/v2/life-narrative.js';

const KEY = 'narrative:rules', MAX_HIST = 30;
const FIELDS = ['chapter', 'all', 'any', 'none', 'priority', 'conf', 'basis', 'terms', 'hook', 'core', 'life', 'conflict', 'advice', 'on', 'opposes'];
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return ''; } };
const L = () => globalThis.MantraLifeNarrative, D = () => globalThis.MantraLifeNarrativeData;
const empty = () => ({ version: 0, rules: {} });
const baseOf = id => D().RULES.find(r => r.id === id) || null;
const pick = f => { const o = {}; for (const k of FIELDS) if (f && f[k] !== undefined) o[k] = f[k]; return o; };
const trimText = f => { for (const k of ['basis', 'hook', 'core', 'life', 'conflict', 'advice']) if (typeof f[k] === 'string') f[k] = f[k].trim(); return f; };

// 규칙 하나가 엔진 기준을 통과하는지(기본 규칙 + 수정 필드를 합친 모습으로 검사)
export function check(id, fields, custom) {
  const base = custom ? { all: [], any: [], none: [], opposes: [], terms: [] } : baseOf(id);
  if (!base) return ['기본 규칙에 없는 ID입니다'];
  const next = { ...base, ...fields, id };
  if (typeof next.on !== 'undefined' && typeof next.on !== 'boolean') return ['사용 여부(on)는 true/false 입니다'];
  if (next.opposes && (!Array.isArray(next.opposes) || next.opposes.some(x => typeof x !== 'string'))) return ['상충 규칙 목록이 올바르지 않습니다'];
  return L().validateRule(next);
}
export function transition(doc, body, at, by) {
  const id = body.id;
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,59}$/.test(id)) return { error: 'ID는 영문 소문자·숫자·._- 3~60자입니다', status: 400 };
  let it = doc.rules[id];
  const log = () => { it.history.push({ v: it.version, fields: it.fields, status: it.status, at, by }); if (it.history.length > MAX_HIST) it.history.shift(); it.at = at; it.by = by; doc.version += 1; };
  switch (body.action) {
    case 'create': {
      if (baseOf(id) || it) return { error: '이미 있는 ID입니다', status: 400 };
      const f = trimText(pick(body.fields)), issues = check(id, f, true); if (issues.length) return { error: issues.join(' / '), status: 400 };
      it = doc.rules[id] = { fields: f, status: 'draft', version: 1, history: [], custom: true, at: '', by: '' }; log(); return { ok: true, item: it };
    }
    case 'save': {
      if (!baseOf(id) && !it) return { error: '등록되지 않은 규칙입니다', status: 404 };
      const f = trimText(pick(body.fields)); if (!Object.keys(f).length) return { error: '바꿀 내용이 없습니다', status: 400 };
      if (!(it && it.custom) && f.chapter !== undefined && f.chapter !== baseOf(id).chapter) return { error: '기본 규칙의 적용 장은 바꿀 수 없습니다. 새 규칙으로 만드세요', status: 400 };
      const merged = { ...(it ? it.fields : {}), ...f }, issues = check(id, merged, !!(it && it.custom)); if (issues.length) return { error: issues.join(' / '), status: 400 };
      if (!it) it = doc.rules[id] = { fields: {}, status: 'draft', version: 1, history: [], at: '', by: '' };
      it.fields = merged; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    case 'publish': {
      if (!it) return { error: '바뀐 내용이 없어 게시할 것이 없습니다', status: 400 };
      if (it.status === 'published') return { error: '이미 게시된 규칙입니다', status: 400 };
      const issues = check(id, it.fields, !!it.custom); if (issues.length) return { error: issues.join(' / '), status: 400 };
      it.status = 'published'; log(); return { ok: true, item: it };
    }
    case 'unpublish': { if (!it || it.status !== 'published') return { error: '게시된 규칙이 아닙니다', status: 400 }; it.status = 'draft'; log(); return { ok: true, item: it }; }
    case 'restore': {
      if (!it) return { error: '이력이 없습니다', status: 404 };
      const h = it.history.find(x => x.v === body.v); if (!h) return { error: '이력을 찾을 수 없습니다', status: 404 };
      const issues = check(id, h.fields, !!it.custom); if (issues.length) return { error: issues.join(' / '), status: 400 };
      it.fields = { ...h.fields }; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    case 'delete': { if (!it || !it.custom) return { error: '기본 규칙은 삭제할 수 없습니다. 사용 안 함(on:false)으로 바꾸세요', status: 400 }; delete doc.rules[id]; doc.version += 1; return { ok: true, deleted: id }; }
    default: return { error: '지원하지 않는 작업입니다', status: 400 };
  }
}
export const publishedView = doc => Object.entries(doc.rules || {}).filter(([, it]) => it.status === 'published').map(([id, it]) => ({ id, ...it.fields }));
const load = async env => { const d = await env.GLOSSARY_KV.get(KEY, 'json'); return d ? { ...empty(), ...d } : empty(); };

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  if (u.searchParams.get('all')) {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩이 없습니다' }, 500);
    const doc = await load(env);
    return json({ version: doc.version, doc, base: D().RULES, chapters: L().CHAPTERS });
  }
  let doc = empty(); try { if (env.GLOSSARY_KV) doc = await load(env); } catch { doc = empty(); }
  return new Response(JSON.stringify({ version: doc.version, pub: publishedView(doc) }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
}
export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const by = safeDecode(request.headers.get('x-reviewer') || '').slice(0, 30), at = new Date().toISOString();
  const doc = await load(env), r = transition(doc, body || {}, at, by);
  if (r.error) return json({ error: r.error }, r.status);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc));
  return json({ ok: true, version: doc.version, item: r.item, deleted: r.deleted });
}
