// 공간·명당 풍수(fengshui-engine.js)의 해석 문구·계산 규칙 검수·게시 관리
// GET  /api/fengshui          — { version, enabled, pub } 게시된 항목만(공개, 60초 캐시). enabled=false 이면 pub=null → 사용자 화면은 기존 '풍수' 탭 그대로
// GET  /api/fengshui?all=1    — 전체 상태·이력·기본 문구·규칙 (관리자)
// PUT  /api/fengshui          — 관리자. body.kind: text | rule | flag
//   text { id, action:save, fields:{text} } · approve_publish | publish | unpublish | restore(v)
//   rule { id, action:save, fields:{value:숫자} } · approve_publish | unpublish | restore   (범위는 엔진 RULES 의 min~max)
//   flag { enabled:true|false }  사용자 화면 공개 스위치(코드 재배포 없이)
// 저장은 KV 키 fengshui:doc 하나만 쓴다. 기존 데이터·키와 섞이지 않는다. 지역·명당 장소 등록은 기존 /api/wish-spots 를 쓴다.
import { json, isAdmin, configError } from '../_lib.js';
import '../../fengshui-data.js';
import '../../fengshui-engine.js';

const KEY = 'fengshui:doc', MAX_HIST = 30;
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return ''; } };
const FS = () => globalThis.MantraFengshui;
const empty = () => ({ version: 0, enabled: false, texts: {}, rules: {}, reviews: {} });

export function validateFields(kind, id, f) {
  if (kind === 'text') {
    if (!FS().listTexts().some(t => t.id === id)) return { error: '알 수 없는 문구 ID입니다', status: 404 };
    const e = FS().validateText(f.text); if (e) return { error: e }; return { fields: { text: f.text.trim() } };
  }
  const r = FS().RULES.find(x => x.id === id); if (!r) return { error: '알 수 없는 규칙입니다', status: 404 };
  if (typeof f.value !== 'number' || !Number.isFinite(f.value)) return { error: '값은 숫자여야 합니다' };
  if (f.value < r.min || f.value > r.max) return { error: `${r.label}은(는) ${r.min}~${r.max} 사이여야 합니다` };
  return { fields: { value: f.value } };
}
export function transition(doc, body, at, by) {
  const kind = body.kind, id = body.id;
  if (!['text', 'rule'].includes(kind)) return { error: '알 수 없는 kind 입니다', status: 400 };
  if (typeof id !== 'string') return { error: 'id 가 필요합니다', status: 400 };
  const H = kind === 'text' ? doc.texts : doc.rules; let it = H[id];
  const log = () => { it.history.push({ v: it.version, fields: it.fields, status: it.status, at, by }); if (it.history.length > MAX_HIST) it.history.shift(); it.by = by; it.at = at; doc.version += 1; };
  const fresh = () => ({ fields: {}, status: 'draft', version: 1, by: '', at: '', history: [] });
  switch (body.action) {
    case 'save': {
      const v = validateFields(kind, id, body.fields || {}); if (v.error) return { error: v.error, status: v.status || 400 };
      if (!it) it = H[id] = fresh();
      it.fields = { ...it.fields, ...v.fields }; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    case 'approve_publish': case 'publish': {
      if (!it) return { error: '저장된 수정본이 없습니다', status: 404 };
      if (it.status === 'published') return { error: '이미 게시된 항목입니다', status: 400 };
      const v = validateFields(kind, id, it.fields); if (v.error) return { error: v.error, status: 400 };
      it.status = 'published'; log(); return { ok: true, item: it };
    }
    case 'unpublish': { if (!it || it.status !== 'published') return { error: '게시된 항목이 아닙니다', status: 400 }; it.status = 'reviewed'; log(); return { ok: true, item: it }; }
    case 'restore': {
      if (!it) return { error: '이력이 없습니다', status: 404 };
      const h = it.history.find(x => x.v === body.v); if (!h) return { error: '이력을 찾을 수 없습니다', status: 404 };
      const v = validateFields(kind, id, h.fields); if (v.error) return { error: v.error, status: 400 };
      it.fields = { ...h.fields }; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    default: return { error: '지원하지 않는 작업입니다', status: 400 };
  }
}
export function publishedView(doc) {
  const pub = { texts: {}, rules: {} };
  Object.entries(doc.texts || {}).forEach(([id, it]) => { if (it.status === 'published' && it.fields && typeof it.fields.text === 'string') pub.texts[id] = it.fields.text; });
  Object.entries(doc.rules || {}).forEach(([id, it]) => { if (it.status === 'published' && it.fields && typeof it.fields.value === 'number') pub.rules[id] = it.fields.value; });
  return pub;
}
const load = async env => { const d = await env.GLOSSARY_KV.get(KEY, 'json'); return d ? { ...empty(), ...d } : empty(); };

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  if (u.searchParams.get('all')) {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩이 없습니다' }, 500);
    const doc = await load(env);
    const eff = {}; for (const t of FS().listTexts()) { const it = doc.texts[t.id]; eff[t.id] = it && it.status === 'published' && it.fields && it.fields.text ? it.fields.text : t.text; }
    const reviews = {}; for (const [id, r] of Object.entries(doc.reviews || {})) reviews[id] = { ...r, valid: eff[id] != null && r.h === FS().textHash(eff[id]) };
    return json({ version: doc.version, enabled: doc.enabled, doc, reviews, lint: FS().lintTexts(eff), base: { texts: FS().listTexts(), rules: FS().RULES, exceptions: FS().EXCEPTIONS, school: FS().SCHOOL } });
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
  if (body.kind === 'review') {   // 검수 완료/해제: 해당 시점 문구의 해시와 함께 기록 → 문구가 바뀌면 자동으로 미검수로 돌아간다
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 400 || !body.ids.every(i => typeof i === 'string')) return json({ error: 'ids는 1~400개의 문구 ID여야 합니다' }, 400);
    if (typeof body.ok !== 'boolean') return json({ error: 'ok 는 true/false 여야 합니다' }, 400);
    const note = typeof body.note === 'string' ? body.note.slice(0, 200) : '', eff = {}, all = new Set(FS().listTexts().map(t => t.id));
    for (const t of FS().listTexts()) { const it = doc.texts[t.id]; eff[t.id] = it && it.status === 'published' && it.fields && it.fields.text ? it.fields.text : t.text; }
    const lint = Object.fromEntries(FS().lintTexts(eff).map(x => [x.id, x.issues]));
    doc.reviews = doc.reviews || {}; let done = 0; const blocked = [];
    for (const id of [...new Set(body.ids)]) {
      if (!all.has(id)) return json({ error: '알 수 없는 문구 ID: ' + id }, 404);
      if (!body.ok) { delete doc.reviews[id]; done++; continue; }
      if ((lint[id] || []).some(i => i.lv === 'error')) { blocked.push(id); continue; }
      doc.reviews[id] = { ok: true, h: FS().textHash(eff[id]), by, at, note }; done++;
    }
    if (done) { doc.version += 1; await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc)); }
    return json({ ok: true, version: doc.version, done, blocked });
  }
  const r = transition(doc, body, at, by);
  if (r.error) return json({ error: r.error }, r.status);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc));
  return json({ ok: true, version: doc.version, item: r.item });
}
