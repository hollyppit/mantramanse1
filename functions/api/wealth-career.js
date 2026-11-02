// 직업·활동 적성 고도화(나의 돈 버는 방식 · 업무 환경 · 직업 · 약점)의 검수·게시 관리
// GET  /api/wealth-career            — { version, enabled, pub } 게시된 항목만(공개, 60초 캐시). enabled=false 이면 사용자 화면은 기존 그대로
// GET  /api/wealth-career?all=1      — 전체 상태·이력·기본 목록·조건 키 (관리자)
// PUT  /api/wealth-career            — 관리자. body.kind: phrase | job | type | weak | flag
//   phrase  { id, action:save, fields:{text?,on?,pri?,when?,unless?,basis?,tag?} }  기본 문구 수정(초안)
//           { action:create, id, fields:{sec,cx,role,text,…} }                      새 문구 추가(초안)
//           { id, action: approve_publish | publish | unpublish | restore(v) | delete(직접 추가한 것만) }
//   job     { id, action:save|create|…, fields:{name?,grp?,how?,income?,caution?,path?,barrier?,on?,types?,cats?,env?,exposes?,els?} }
//   type    { id, action:save, fields:{on?,name?,plain?} }     수익 유형 사용 여부·이름
//   weak    { id, action:save, fields:{on} }                   취약점 사용 여부
//   flag    { enabled:true|false }                              사용자 화면 공개 스위치(코드 재배포 없이)
//   공통 bulk { kind, action:bulk, ids:[…(최대 200)], op:publish|unpublish }
// 저장은 KV 키 wealthcareer:doc 하나만 쓴다. 기존 데이터·키와 섞이지 않는다. 게시 전까지 사용자 화면에는 아무 영향이 없다.
import { json, isAdmin, configError } from '../_lib.js';
import '../../wealth-career-data.js';
import '../../wealth-career-data-2.js';
import '../../wealth-career-data-3.js';
import '../../wealth-career-jobs.js';
import '../../wealth-career.js';

const KEY = 'wealthcareer:doc', MAX_HIST = 30;
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return ''; } };
const W = () => globalThis.MantraWealthCareer, D = () => globalThis.MantraWealthCareerData;
const empty = () => ({ version: 0, enabled: false, phrases: {}, custom: {}, jobs: {}, customJobs: {}, types: {}, weak: {} });
const ID_RE = /^[A-Za-z0-9._-]{3,60}$/;
const PHRASE_FIELDS = ['text', 'on', 'pri', 'when', 'unless', 'basis', 'tag'];
const JOB_TEXT = ['how', 'income', 'caution', 'path'];

// ───────── 검증 ─────────
function checkConds(list, label) {
  if (!Array.isArray(list) || list.length > 12) return label + ' 조건은 12개 이하의 목록이어야 합니다';
  for (const c of list) { if (typeof c !== 'string') return label + ' 조건은 문자열이어야 합니다'; const e = W().validateCond(c); if (e) return e; }
  return null;
}
export function validatePhraseFields(f, base) {
  const out = {};
  if (f.text !== undefined) { const e = W().validateText(f.text, base.role); if (e) return { error: e }; out.text = f.text.trim(); }
  if (f.on !== undefined) { if (typeof f.on !== 'boolean') return { error: 'on 은 true/false 여야 합니다' }; out.on = f.on; }
  if (f.pri !== undefined) { if (!Number.isFinite(f.pri) || f.pri < 0 || f.pri > 10) return { error: '우선순위는 0~10 사이 숫자입니다' }; out.pri = f.pri; }
  for (const k of ['when', 'unless']) if (f[k] !== undefined) { const e = checkConds(f[k], k === 'when' ? '적용' : '제외'); if (e) return { error: e }; out[k] = f[k].map(x => x.trim()); }
  if (f.basis !== undefined) { if (typeof f.basis !== 'string' || f.basis.length > 120) return { error: '근거는 120자 이하 문자열입니다' }; out.basis = f.basis; }
  if (f.tag !== undefined) { if (typeof f.tag !== 'string' || !/^[A-Za-z0-9._가-힣-]{1,40}$/.test(f.tag)) return { error: 'tag 는 1~40자의 영문·숫자·한글·._- 입니다' }; out.tag = f.tag; }
  return { fields: out };
}
export function validateJobFields(f, creating) {
  const out = {}, d = D();
  if (f.name !== undefined) { if (typeof f.name !== 'string' || !f.name.trim() || f.name.length > 30) return { error: '직업 이름은 1~30자입니다' }; out.name = f.name.trim(); }
  for (const k of JOB_TEXT) if (f[k] !== undefined) { if (k === 'path' && f[k] === '') { out.path = ''; continue; } const e = W().validateText(f[k], 'note'); if (e) return { error: `${k}: ${e}` }; out[k] = f[k].trim(); }
  if (f.grp !== undefined) { if (typeof f.grp !== 'string' || !/^[a-z0-9_-]{1,20}$/.test(f.grp)) return { error: 'grp 는 영문 소문자·숫자 1~20자입니다' }; out.grp = f.grp; }
  if (f.barrier !== undefined) { if (!['license', 'experience', 'open'].includes(f.barrier)) return { error: 'barrier 는 license/experience/open 입니다' }; out.barrier = f.barrier; }
  if (f.on !== undefined) { if (typeof f.on !== 'boolean') return { error: 'on 은 true/false 여야 합니다' }; out.on = f.on; }
  const wmap = (v, keys, label) => { if (!v || typeof v !== 'object' || Array.isArray(v)) return label + '은 객체여야 합니다'; for (const [k, x] of Object.entries(v)) { if (!keys.includes(k)) return `${label}: 알 수 없는 키 ${k}`; if (!(x >= 0 && x <= 1)) return `${label}: ${k} 값은 0~1 입니다`; } return null; };
  if (f.types !== undefined) { const e = wmap(f.types, d.TYPES.map(t => t.id), '수익 유형 연결'); if (e) return { error: e }; if (!Object.keys(f.types).length) return { error: '수익 유형 연결이 하나 이상 필요합니다' }; out.types = f.types; }
  if (f.cats !== undefined) { const e = wmap(f.cats, Object.keys(globalThis.Manse ? globalThis.Manse.CAREER_CONFIG.categories : { creative: 1, planning: 1, research: 1, education: 1, business: 1, sales: 1, management: 1, organization: 1, technical: 1, communication: 1, asset: 1, public: 1 }), '활동 분야 연결'); if (e) return { error: e }; if (!Object.keys(f.cats).length) return { error: '활동 분야 연결이 하나 이상 필요합니다' }; out.cats = f.cats; }
  if (f.els !== undefined) { const e = wmap(f.els, ['목', '화', '토', '금', '수'], '오행 비중'); if (e) return { error: e }; if (Object.keys(f.els).length < 2) return { error: '직업을 오행 하나로 고정할 수 없습니다 — 오행을 2개 이상 지정하세요' }; out.els = f.els; }
  if (f.env !== undefined) { if (!f.env || typeof f.env !== 'object') return { error: 'env 는 객체입니다' }; for (const [ax, v] of Object.entries(f.env)) { const a = d.AXES.find(x => x.id === ax); if (!a || !a.verdicts[v] || v === 'mix') return { error: `env: ${ax}=${v} 는 올바르지 않습니다` }; } out.env = f.env; }
  if (f.exposes !== undefined) { const ok = ['repetitive', 'hierarchy', 'speculation', 'competition', 'lowAutonomy', 'emotional', 'isolated', 'unstructured', 'multitask', 'slowPayoff']; if (!Array.isArray(f.exposes) || f.exposes.some(x => !ok.includes(x))) return { error: 'exposes 는 알려진 환경 키의 목록입니다' }; out.exposes = f.exposes; }
  if (creating) for (const k of ['name', 'types', 'cats', 'how', 'income', 'caution', 'barrier']) if (out[k] === undefined) return { error: `새 직업에는 ${k} 가 필요합니다` };
  return { fields: out };
}

// ───────── 상태 전이 ─────────
function holder(doc, kind) { return kind === 'phrase' ? { std: doc.phrases, cus: doc.custom } : kind === 'job' ? { std: doc.jobs, cus: doc.customJobs } : kind === 'type' ? { std: doc.types, cus: {} } : { std: doc.weak, cus: {} }; }
function baseOf(kind, id) {
  const d = D();
  if (kind === 'phrase') return d.PH.find(p => p.id === id) || null;
  if (kind === 'job') return d.JOBS.find(j => j.id === id) || null;
  if (kind === 'type') return d.TYPES.find(t => t.id === id) || null;
  return d.WEAKNESSES.find(w => w.id === id) || null;
}
export function transition(doc, body, at, by) {
  const kind = body.kind, id = body.id;
  if (!['phrase', 'job', 'type', 'weak'].includes(kind)) return { error: '알 수 없는 kind 입니다', status: 400 };
  if (typeof id !== 'string') return { error: 'id 가 필요합니다', status: 400 };
  const H = holder(doc, kind), base = baseOf(kind, id);
  let it = H.std[id] || H.cus[id], isCustom = !!H.cus[id];
  const log = () => { it.history.push({ v: it.version, fields: it.fields, status: it.status, at, by }); if (it.history.length > MAX_HIST) it.history.shift(); it.by = by; it.at = at; doc.version += 1; };
  const validate = (fields, creating) => kind === 'phrase' ? validatePhraseFields(fields, creating ? fields : (base || it.fields)) : kind === 'job' ? validateJobFields(fields, creating) : kind === 'type' ? validateTypeFields(fields) : validateWeakFields(fields);
  switch (body.action) {
    case 'create': {
      if (kind !== 'phrase' && kind !== 'job') return { error: '이 항목은 새로 추가할 수 없습니다', status: 400 };
      if (!ID_RE.test(id)) return { error: 'ID는 영문·숫자·._- 3~60자입니다', status: 400 };
      if (baseOf(kind, id) || H.cus[id]) return { error: '이미 있는 ID입니다', status: 400 };
      const f = body.fields || {};
      if (kind === 'phrase') {
        if (!/^S[0-4]$/.test(f.sec || '') || typeof f.cx !== 'string' || !/^[A-Za-z0-9._-]{1,40}$/.test(f.cx) || typeof f.role !== 'string' || !/^[a-z_]{2,20}$/.test(f.role)) return { error: 'sec(S0~S4), cx, role 을 올바르게 입력하세요', status: 400 };
        const v = validatePhraseFields({ ...f, when: f.when || [], unless: f.unless || [], pri: f.pri ?? 1, on: f.on ?? true }, f); if (v.error) return { error: v.error, status: 400 };
        it = H.cus[id] = { fields: { sec: f.sec, cx: f.cx, role: f.role, tag: f.tag || f.role + '.' + id, basis: '', ...v.fields }, status: 'draft', version: 1, by: '', at: '', history: [], custom: true };
      } else {
        const v = validateJobFields(f, true); if (v.error) return { error: v.error, status: 400 };
        it = H.cus[id] = { fields: { grp: 'custom', els: {}, env: {}, exposes: [], path: '', on: true, ...v.fields }, status: 'draft', version: 1, by: '', at: '', history: [], custom: true };
      }
      log(); return { ok: true, item: it };
    }
    case 'save': {
      if (!base && !it) return { error: '등록되지 않은 항목입니다', status: 404 };
      const v = validate(body.fields || {}, false); if (v.error) return { error: v.error, status: 400 };
      if (!Object.keys(v.fields).length) return { error: '바꿀 내용이 없습니다', status: 400 };
      if (!it) it = H.std[id] = { fields: {}, status: 'draft', version: 1, by: '', at: '', history: [] };
      it.fields = { ...it.fields, ...v.fields }; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    case 'approve_publish': case 'publish': {
      if (!it) { if (!base) return { error: '등록되지 않은 항목입니다', status: 404 }; it = H.std[id] = { fields: {}, status: 'draft', version: 1, by: '', at: '', history: [] }; }
      if (it.status === 'published') return { error: '이미 게시된 항목입니다', status: 400 };
      if (!Object.keys(it.fields).length) return { error: '기본 내용과 같아 게시할 변경이 없습니다', status: 400 };
      const v = validate(it.fields, isCustom); if (v.error) return { error: v.error, status: 400 };
      it.status = 'published'; log(); return { ok: true, item: it };
    }
    case 'unpublish': { if (!it || it.status !== 'published') return { error: '게시된 항목이 아닙니다', status: 400 }; it.status = 'reviewed'; log(); return { ok: true, item: it }; }
    case 'restore': {
      if (!it) return { error: '이력이 없습니다', status: 404 };
      const h = it.history.find(x => x.v === body.v); if (!h) return { error: '이력을 찾을 수 없습니다', status: 404 };
      const v = validate(h.fields, isCustom); if (v.error) return { error: v.error, status: 400 };
      it.fields = { ...h.fields }; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    case 'delete': {
      if (!isCustom) return { error: '기본 항목은 삭제할 수 없습니다. 비활성화하세요', status: 400 };
      delete H.cus[id]; doc.version += 1; return { ok: true, deleted: id };
    }
    default: return { error: '지원하지 않는 작업입니다', status: 400 };
  }
}
function validateTypeFields(f) {
  const out = {}; if (f.on !== undefined) { if (typeof f.on !== 'boolean') return { error: 'on 은 true/false 여야 합니다' }; out.on = f.on; }
  for (const k of ['name', 'plain']) if (f[k] !== undefined) { if (typeof f[k] !== 'string' || !f[k].trim() || f[k].length > 60) return { error: `${k}: 1~60자 문자열입니다` }; out[k] = f[k].trim(); }
  return { fields: out };
}
function validateWeakFields(f) { if (typeof f.on !== 'boolean') return { error: 'on 은 true/false 여야 합니다' }; return { fields: { on: f.on } }; }

// 게시된 항목만 엔진이 이해하는 형식으로 변환 (applyPublished 입력)
export function publishedView(doc) {
  const pub = { phrases: {}, custom: [], jobs: {}, customJobs: [], types: {}, weak: {} };
  Object.entries(doc.phrases || {}).forEach(([id, it]) => { if (it.status === 'published') pub.phrases[id] = it.fields; });
  Object.entries(doc.custom || {}).forEach(([id, it]) => { if (it.status === 'published') pub.custom.push({ id, ...it.fields }); });
  Object.entries(doc.jobs || {}).forEach(([id, it]) => { if (it.status === 'published') pub.jobs[id] = it.fields; });
  Object.entries(doc.customJobs || {}).forEach(([id, it]) => { if (it.status === 'published') pub.customJobs.push({ id, ...it.fields }); });
  Object.entries(doc.types || {}).forEach(([id, it]) => { if (it.status === 'published') pub.types[id] = it.fields; });
  Object.entries(doc.weak || {}).forEach(([id, it]) => { if (it.status === 'published') pub.weak[id] = it.fields; });
  return pub;
}
const load = async env => { const d = await env.GLOSSARY_KV.get(KEY, 'json'); return d ? { ...empty(), ...d } : empty(); };

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  if (u.searchParams.get('all')) {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩이 없습니다' }, 500);
    const doc = await load(env), d = D();
    return json({ version: doc.version, enabled: doc.enabled, doc, base: { phrases: d.PH, jobs: d.JOBS, types: d.TYPES, weak: d.WEAKNESSES, structs: d.STRUCTS, axes: d.AXES, factKeys: d.FACT_KEYS, stateLabel: d.STATE_LABEL } });
  }
  let doc = empty(); try { if (env.GLOSSARY_KV) doc = await load(env); } catch { doc = empty(); }
  return new Response(JSON.stringify({ version: doc.version, enabled: doc.enabled === true, pub: doc.enabled === true ? publishedView(doc) : null }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
}
export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  body = body || {};
  const by = safeDecode(request.headers.get('x-reviewer') || '').slice(0, 30), at = new Date().toISOString();
  const doc = await load(env);
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
