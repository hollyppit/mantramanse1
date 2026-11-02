// 운세 환경 해석 문구(luck-interpret.js PHRASES)의 검수·게시 관리
// GET  /api/luck-phrases            — 게시된 문구만 { version, published:{문구id:본문} } (공개)
// GET  /api/luck-phrases?all=1      — 전체 상태·이력 (관리자)
// PUT  /api/luck-phrases            — { id, action, text?, v? } 관리자
//        save     본문 수정 → 초안(draft)이 되고 게시본에서 즉시 빠진다
//        approve  초안 → 승인(reviewed). 수정 없이 기본 문구를 승인할 때도 같은 동작
//        publish  승인된 것만 → 게시(published)
//        unpublish 게시 → 승인 상태로 되돌림(공개 화면은 기본 문구로 돌아감)
//        restore  이력 v번의 본문으로 되돌림(초안)
// 저장은 KV 키 luckenv:phrases 하나만 쓴다. 기존 데이터·키와 섞이지 않는다.
import { json, isAdmin, configError } from '../_lib.js';
import '../../luck-interpret.js';

const KEY = 'luckenv:phrases', MAX_HIST = 30;
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return ''; } };
const LI = () => globalThis.MantraLuckInterpret;
const BAN = /반드시|확실히|틀림없이|무조건|100%|보장합니다|예언|재물운이 (좋아집니다|올라갑니다)/;
const empty = () => ({ version: 0, items: {} });

export function validateText(text, id, doc) {
  if (typeof text !== 'string' || !text.trim() || text.length > 200) return '문구는 1~200자로 입력하세요';
  const t = text.trim();
  if (BAN.test(t)) return '단정 표현(반드시·무조건 등)은 사용할 수 없습니다';
  const own = LI().PHRASES.find(p => p.id === id);   // core 문구는 문장 앞에 붙는 구절이라 어미 검사에서 제외
  if ((!own || own.type !== 'core') && !/(니다|세요|요)\.?$/.test(t)) return '존댓말(…합니다/…하세요/…예요)로 끝나야 합니다';
  const dup = LI().PHRASES.find(p => p.id !== id && ((doc.items[p.id] && doc.items[p.id].text) || p.text) === t);
  if (dup) return '같은 문구가 이미 있습니다: ' + dup.id;
  return null;
}
export function transition(doc, body, at, by) {
  const base = LI().PHRASES.find(p => p.id === body.id);
  if (!base) return { error: '등록되지 않은 문구 ID입니다', status: 404 };
  const it = doc.items[body.id] || (doc.items[body.id] = { text: base.text, status: 'draft', version: 1, by: '', at: '', history: [] });
  const log = () => { it.history.push({ v: it.version, text: it.text, status: it.status, at, by }); if (it.history.length > MAX_HIST) it.history.shift(); it.by = by; it.at = at; doc.version += 1; };
  switch (body.action) {
    case 'save': { const bad = validateText(body.text, body.id, doc); if (bad) return { error: bad, status: 400 }; it.text = body.text.trim(); it.status = 'draft'; it.version += 1; log(); break; }
    case 'approve': { if (it.status === 'published') return { error: '이미 게시된 문구입니다', status: 400 }; const bad = validateText(it.text, body.id, doc); if (bad) return { error: bad, status: 400 }; it.status = 'reviewed'; log(); break; }
    case 'publish': { if (it.status !== 'reviewed') return { error: '승인된 문구만 게시할 수 있습니다', status: 400 }; it.status = 'published'; log(); break; }
    case 'unpublish': { if (it.status !== 'published') return { error: '게시된 문구가 아닙니다', status: 400 }; it.status = 'reviewed'; log(); break; }
    case 'restore': { const h = it.history.find(x => x.v === body.v); if (!h) return { error: '이력을 찾을 수 없습니다', status: 404 }; const bad = validateText(h.text, body.id, doc); if (bad) return { error: bad, status: 400 }; it.text = h.text; it.status = 'draft'; it.version += 1; log(); break; }
    default: return { error: '지원하지 않는 작업입니다', status: 400 };
  }
  return { ok: true, item: it };
}
export const publishedMap = doc => { const o = {}; Object.keys(doc.items).forEach(id => { if (doc.items[id].status === 'published') o[id] = doc.items[id].text; }); return o; };

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ version: 0, published: {} });
  const doc = (await env.GLOSSARY_KV.get(KEY, 'json')) || empty();
  if (new URL(request.url).searchParams.get('all')) {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    return json({ version: doc.version, items: doc.items, phrases: LI().PHRASES.map(p => ({ id: p.id, type: p.type, tenGod: p.tenGod, area: p.area || null, text: p.text })) });
  }
  return json({ version: doc.version, published: publishedMap(doc) });
}
export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  body = body || {};
  const by = safeDecode(request.headers.get('x-reviewer') || '').slice(0, 30), at = new Date().toISOString();
  const doc = (await env.GLOSSARY_KV.get(KEY, 'json')) || empty();
  const r = transition(doc, body, at, by);
  if (r.error) return json({ error: r.error }, r.status);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc));
  return json({ ok: true, version: doc.version, item: r.item });
}
