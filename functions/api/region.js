// GET  /api/region            — 등록된 지역 환경 데이터 { version, items:{지역id:{항목:{value,source,updated}}} } (공개)
// GET  /api/region?history=1  — 변경 이력 (관리자)
// PUT  /api/region            — { id, fact, value, source:{name,url}, updated } 저장, value가 null이면 항목 삭제 (관리자)
// PUT  /api/region            — { restore: 이력번호 } 해당 변경 직전 값으로 되돌림 (관리자)
// 규칙: 출처 이름·https 주소·기준일 없이는 값을 저장하지 않는다(임의 통계 방지). 기존 KV 키와 섞이지 않게 region:facts 한 키만 쓴다.
import { json, isAdmin, configError } from '../_lib.js';
import '../../region-data.js';

const KEY = 'region:facts', MAX_HISTORY = 200;
const R = () => globalThis.MantraRegion;
const empty = () => ({ version: 0, items: {}, history: [] });
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

export function validate(body) {
  const ids = new Set(R().REGIONS.map(r => r.id));
  if (typeof body.id !== 'string' || !ids.has(body.id)) return '등록되지 않은 지역입니다';
  if (typeof body.fact !== 'string' || !R().FACT_KEYS.includes(body.fact)) return '지원하지 않는 항목입니다';
  if (body.value === null) return null;
  if (typeof body.value !== 'string' || !body.value.trim() || body.value.length > 300) return '값은 1~300자로 입력하세요';
  const s = body.source;
  if (!s || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 80) return '출처 이름이 필요합니다';
  if (typeof s.url !== 'string' || s.url.length > 300 || !/^https:\/\/[^\s]+$/.test(s.url)) return '출처 주소는 https 주소여야 합니다';
  if (typeof body.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.updated) || body.updated > today()) return '기준일(YYYY-MM-DD, 오늘 이전)이 필요합니다';
  return null;
}
export function apply(doc, body, at, by) {
  const cur = (doc.items[body.id] || {})[body.fact] || null;
  const next = body.value === null ? null : { value: body.value.trim(), source: { name: body.source.name.trim(), url: body.source.url }, updated: body.updated };
  doc.version += 1;
  if (next) (doc.items[body.id] = doc.items[body.id] || {})[body.fact] = next;
  else if (doc.items[body.id]) { delete doc.items[body.id][body.fact]; if (!Object.keys(doc.items[body.id]).length) delete doc.items[body.id]; }
  doc.history.push({ v: doc.version, at, by: by || '', id: body.id, fact: body.fact, before: cur, after: next });
  if (doc.history.length > MAX_HISTORY) doc.history.splice(0, doc.history.length - MAX_HISTORY);
  return doc;
}
export function restore(doc, v, at, by) {
  const h = doc.history.find(x => x.v === v); if (!h) return null;
  const cur = (doc.items[h.id] || {})[h.fact] || null;
  doc.version += 1;
  if (h.before) (doc.items[h.id] = doc.items[h.id] || {})[h.fact] = h.before;
  else if (doc.items[h.id]) { delete doc.items[h.id][h.fact]; if (!Object.keys(doc.items[h.id]).length) delete doc.items[h.id]; }
  doc.history.push({ v: doc.version, at, by: by || '', id: h.id, fact: h.fact, before: cur, after: h.before, restoredFrom: v });
  if (doc.history.length > MAX_HISTORY) doc.history.splice(0, doc.history.length - MAX_HISTORY);
  return doc;
}

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ version: 0, items: {} });
  const doc = (await env.GLOSSARY_KV.get(KEY, 'json')) || empty();
  if (new URL(request.url).searchParams.get('history')) {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    return json({ version: doc.version, history: doc.history.slice(-50).reverse() });
  }
  return json({ version: doc.version, items: doc.items });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  body = body || {};
  const by = decodeURIComponent(request.headers.get('x-reviewer') || '').slice(0, 30), at = new Date().toISOString();
  const doc = (await env.GLOSSARY_KV.get(KEY, 'json')) || empty();
  if (body.restore != null) {
    if (!Number.isInteger(body.restore)) return json({ error: '이력번호가 올바르지 않습니다' }, 400);
    if (!restore(doc, body.restore, at, by)) return json({ error: '이력을 찾을 수 없습니다' }, 404);
  } else {
    const bad = validate(body); if (bad) return json({ error: bad }, 400);
    apply(doc, body, at, by);
  }
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc));
  return json({ ok: true, version: doc.version, items: doc.items });
}
