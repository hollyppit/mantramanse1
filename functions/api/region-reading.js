// 지역 방위오행 × 개인 사주 해석(region-reading.js)의 규칙 수치·사전 문구 검수·게시 관리
// GET  /api/region-reading          — { version, enabled, pub } 게시된 항목만(공개, 60초 캐시). enabled=false 이면 pub=null → 사용자 화면은 기존 한 줄 해석 그대로
// GET  /api/region-reading?all=1    — 전체 상태·이력·기본 목록·조건 키 (관리자)
// PUT  /api/region-reading          — 관리자. body.kind: phrase | rule | flag
//   phrase { id, action:save, fields:{text?,on?,pri?,when?,unless?,basis?,tag?} } · { action:create, id(R.역할.이름), fields:{role,text,…} }
//          { id, action: approve_publish | publish | unpublish | restore(v) | delete(직접 추가한 것만) }
//   rule   { id, action:save, fields:{value:숫자} } · approve_publish | unpublish | restore   (범위는 기본 규칙의 min~max)
//   flag   { enabled:true|false }  사용자 화면 공개 스위치(코드 재배포 없이)
//   공통 bulk { kind, action:bulk, ids:[…(최대 200)], op:publish|unpublish }
// 저장은 KV 키 regionreading:doc 하나만 쓴다. 기존 데이터·키와 섞이지 않는다.
import { json, isAdmin, configError } from '../_lib.js';
import '../../region-reading-data.js';
import '../../region-reading.js';

const KEY = 'regionreading:doc', MAX_HIST = 30;
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return ''; } };
const RR = () => globalThis.MantraRegionReading, D = () => globalThis.MantraRegionReadingData;
const empty = () => ({ version: 0, enabled: false, phrases: {}, custom: {}, rules: {} });
const ID_RE = /^R\.[a-z_]{2,20}\.[A-Za-z0-9._-]{1,40}$/;

function checkConds(list, label) {
  if (!Array.isArray(list) || list.length > 10) return label + ' 조건은 10개 이하의 목록이어야 합니다';
  for (const c of list) { if (typeof c !== 'string') return label + ' 조건은 문자열이어야 합니다'; const e = RR().validateCond(c); if (e) return e; }
  return null;
}
export function validatePhraseFields(f) {
  const out = {};
  if (f.text !== undefined) { const e = RR().validateText(f.text); if (e) return { error: e }; out.text = f.text.trim(); }
  if (f.on !== undefined) { if (typeof f.on !== 'boolean') return { error: 'on 은 true/false 여야 합니다' }; out.on = f.on; }
  if (f.pri !== undefined) { if (!Number.isFinite(f.pri) || f.pri < 0 || f.pri > 10) return { error: '우선순위는 0~10 사이 숫자입니다' }; out.pri = f.pri; }
  for (const k of ['when', 'unless']) if (f[k] !== undefined) { const e = checkConds(f[k], k === 'when' ? '적용' : '제외'); if (e) return { error: e }; out[k] = f[k].map(x => x.trim()); }
  if (f.basis !== undefined) { if (typeof f.basis !== 'string' || f.basis.length > 120) return { error: '근거는 120자 이하 문자열입니다' }; out.basis = f.basis; }
  if (f.tag !== undefined) { if (typeof f.tag !== 'string' || !/^[A-Za-z0-9._가-힣-]{1,40}$/.test(f.tag)) return { error: 'tag 는 1~40자의 영문·숫자·한글·._- 입니다' }; out.tag = f.tag; }
  return { fields: out };
}
export function validateRuleFields(f, id) {
  const r = D().RULES.find(x => x.id === id); if (!r) return { error: '알 수 없는 규칙입니다', status: 404 };
  if (typeof f.value !== 'number' || !Number.isFinite(f.value)) return { error: '값은 숫자여야 합니다' };
  if (f.value < r.min || f.value > r.max) return { error: `${r.label}은(는) ${r.min}~${r.max} 사이여야 합니다` };
  return { fields: { value: f.value } };
}
const holder = (doc, kind) => kind === 'phrase' ? { std: doc.phrases, cus: doc.custom } : { std: doc.rules, cus: {} };
const baseOf = (kind, id) => kind === 'phrase' ? D().PH.find(p => p.id === id) || null : D().RULES.find(r => r.id === id) || null;

export function transition(doc, body, at, by) {
  const kind = body.kind, id = body.id;
  if (!['phrase', 'rule'].includes(kind)) return { error: '알 수 없는 kind 입니다', status: 400 };
  if (typeof id !== 'string') return { error: 'id 가 필요합니다', status: 400 };
  const H = holder(doc, kind), base = baseOf(kind, id); let it = H.std[id] || H.cus[id]; const isCustom = !!H.cus[id];
  const log = () => { it.history.push({ v: it.version, fields: it.fields, status: it.status, at, by }); if (it.history.length > MAX_HIST) it.history.shift(); it.by = by; it.at = at; doc.version += 1; };
  const validate = (fields) => kind === 'phrase' ? validatePhraseFields(fields) : validateRuleFields(fields, id);
  switch (body.action) {
    case 'create': {
      if (kind !== 'phrase') return { error: '규칙은 새로 추가할 수 없습니다', status: 400 };
      if (!ID_RE.test(id)) return { error: 'ID는 R.역할.이름 형식(예: R.pro.mycase)입니다', status: 400 };
      if (baseOf(kind, id) || H.cus[id]) return { error: '이미 있는 ID입니다', status: 400 };
      const f = body.fields || {}; if (typeof f.role !== 'string' || !/^[a-z_]{2,20}$/.test(f.role)) return { error: 'role(역할)을 입력하세요', status: 400 };
      if (!['dir', 'grp', 'eok', 'johu', 'climate', 'month', 'lack', 'flow', 'pro', 'con', 'conflict', 'headline', 'overall', 'caveat'].includes(f.role)) return { error: '지원하지 않는 역할입니다', status: 400 };
      const v = validatePhraseFields({ when: [], unless: [], pri: 1, on: true, ...f }); if (v.error) return { error: v.error, status: 400 };
      if (!v.fields.text) return { error: '문구를 입력하세요', status: 400 };
      it = H.cus[id] = { fields: { role: f.role, tag: f.tag || id, basis: '', ...v.fields }, status: 'draft', version: 1, by: '', at: '', history: [], custom: true };
      log(); return { ok: true, item: it };
    }
    case 'save': {
      if (!base && !it) return { error: '등록되지 않은 항목입니다', status: 404 };
      const v = validate(body.fields || {}); if (v.error) return { error: v.error, status: v.status || 400 };
      if (!Object.keys(v.fields).length) return { error: '바꿀 내용이 없습니다', status: 400 };
      if (!it) it = H.std[id] = { fields: {}, status: 'draft', version: 1, by: '', at: '', history: [] };
      it.fields = { ...it.fields, ...v.fields }; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    case 'approve_publish': case 'publish': {
      if (!it) { if (!base) return { error: '등록되지 않은 항목입니다', status: 404 }; it = H.std[id] = { fields: {}, status: 'draft', version: 1, by: '', at: '', history: [] }; }
      if (it.status === 'published') return { error: '이미 게시된 항목입니다', status: 400 };
      if (!Object.keys(it.fields).length) return { error: '기본 내용과 같아 게시할 변경이 없습니다', status: 400 };
      const v = validate(it.fields); if (v.error) return { error: v.error, status: 400 };
      it.status = 'published'; log(); return { ok: true, item: it };
    }
    case 'unpublish': { if (!it || it.status !== 'published') return { error: '게시된 항목이 아닙니다', status: 400 }; it.status = 'reviewed'; log(); return { ok: true, item: it }; }
    case 'restore': {
      if (!it) return { error: '이력이 없습니다', status: 404 };
      const h = it.history.find(x => x.v === body.v); if (!h) return { error: '이력을 찾을 수 없습니다', status: 404 };
      const v = validate(h.fields); if (v.error) return { error: v.error, status: 400 };
      it.fields = { ...h.fields }; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    case 'delete': { if (!isCustom) return { error: '기본 항목은 삭제할 수 없습니다. 비활성화하세요', status: 400 }; delete H.cus[id]; doc.version += 1; return { ok: true, deleted: id }; }
    default: return { error: '지원하지 않는 작업입니다', status: 400 };
  }
}
// 게시된 항목만 엔진이 이해하는 형식으로 변환 (applyPublished 입력)
export function publishedView(doc) {
  const pub = { phrases: {}, custom: [], rules: {} };
  Object.entries(doc.phrases || {}).forEach(([id, it]) => { if (it.status === 'published') pub.phrases[id] = it.fields; });
  Object.entries(doc.custom || {}).forEach(([id, it]) => { if (it.status === 'published') pub.custom.push({ id, ...it.fields }); });
  Object.entries(doc.rules || {}).forEach(([id, it]) => { if (it.status === 'published' && it.fields && typeof it.fields.value === 'number') pub.rules[id] = it.fields.value; });
  return pub;
}
const load = async env => { const d = await env.GLOSSARY_KV.get(KEY, 'json'); return d ? { ...empty(), ...d } : empty(); };

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  if (u.searchParams.get('all')) {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩이 없습니다' }, 500);
    const doc = await load(env), d = D();
    return json({ version: doc.version, enabled: doc.enabled, doc, base: { phrases: d.PH, rules: d.RULES, factKeys: d.FACT_KEYS, placeholders: d.PLACEHOLDERS, toneLabel: d.TONE_LABEL } });
  }
  let doc = empty(); try { if (env.GLOSSARY_KV) doc = await load(env); } catch { doc = empty(); }
  return new Response(JSON.stringify({ version: doc.version, enabled: doc.enabled === true, pub: doc.enabled === true ? publishedView(doc) : null }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
}
export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  body = body || {};
  const by = safeDecode(request.headers.get('x-reviewer') || '').slice(0, 30), at = new Date().toISOString(), doc = await load(env);
  if (body.kind === 'flag') {
    if (typeof body.enabled !== 'boolean') return json({ error: 'enabled 는 true/false 여야 합니다' }, 400);
    doc.enabled = body.enabled; doc.version += 1; doc.flagAt = at; doc.flagBy = by;
    await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc)); return json({ ok: true, version: doc.version, enabled: doc.enabled });
  }
  if (body.action === 'bulk') {
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 200 || !body.ids.every(i => typeof i === 'string')) return json({ error: 'ids는 1~200개의 ID여야 합니다' }, 400);
    if (!['publish', 'unpublish'].includes(body.op)) return json({ error: '지원하지 않는 작업입니다' }, 400);
    const done = [], skipped = [], failed = [];
    for (const id of [...new Set(body.ids)]) {
      const H = holder(doc, body.kind), cur = (H.std[id] || H.cus[id] || {}).status;
      if ((body.op === 'publish' && cur === 'published') || (body.op === 'unpublish' && cur !== 'published')) { skipped.push(id); continue; }
      const r = transition(doc, { kind: body.kind, id, action: body.op === 'publish' ? 'approve_publish' : 'unpublish' }, at, by);
      if (r.error) failed.push({ id, error: r.error }); else done.push(id);
    }
    if (done.length) await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc));
    return json({ ok: true, version: doc.version, done: done.length, skipped: skipped.length, failed });
  }
  const r = transition(doc, body, at, by);
  if (r.error) return json({ error: r.error }, r.status);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc));
  return json({ ok: true, version: doc.version, item: r.item, deleted: r.deleted });
}
