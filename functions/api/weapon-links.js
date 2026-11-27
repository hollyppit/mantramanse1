// 주무기 상세풀이 질문(장)별 연결 설정(2026-11-26, report/v2/weapon-chapters.js)
// GET /api/weapon-links — { version, rows: { 장ID: { on, topic, use{…} } } } (공개, 60초 캐시). 저장값이 없으면 rows 없이 version 0 → 화면은 코드 기본값을 쓴다
// 줄 하나: { on, topic, use{…}, view?: 'block'|'graph'|'axes', scope?: 'daeun'|'seun'|'wolun'(graph 일 때) · 'peak'|'year'|'month'(axes 일 때) } — graph 는 발현 그래프(2026-11-26), axes 는 바람·기량·결과 블록(2026-11-27)
// PUT /api/weapon-links — { rows: {…} } 통째로 저장 (관리자). 장 ID·질문·상품·결제는 건드리지 않고 이 KV 키(weapon:links) 하나만 쓴다
// 건강·사고수(health_*, self_35, self_h*)·전생(creative_*, self_36) 장은 고를 수 없다(주무기를 건강·전생 근거로 쓰지 않기)
// 공개 여부 전체는 /api/luck-flags weaponChapters 스위치가 정한다
import { json, isAdmin, configError } from '../_lib.js';

export const KEY = 'weapon:links';
export const TOPICS = ['self', 'wealth', 'career', 'love', 'remedy'];
export const USE_KEYS = ['first', 'second', 'power', 'overlap', 'rootExp', 'tenGod', 'daeun', 'seun', 'wolun', 'activation', 'favor'];
const ID_OK = /^timeline_[a-z]+_[\w]{1,24}$/, BLOCKED = /^timeline_(health|creative)_|^timeline_self_(3[56]|h\d+)$/;
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return ''; } };

export function cleanRows(rows) {
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return { error: 'rows 는 { 장ID: { on, topic, use } } 형식이어야 합니다' };
  const ids = Object.keys(rows); if (ids.length > 60) return { error: '연결은 60개까지입니다' };
  const out = {};
  for (const id of ids) {
    const r = rows[id];
    if (!ID_OK.test(id)) return { error: '장 ID 형식이 아닙니다: ' + id };
    if (BLOCKED.test(id)) return { error: '건강·사고수·전생 장에는 주무기를 연결하지 않습니다: ' + id };
    if (!r || typeof r !== 'object' || !TOPICS.includes(r.topic)) return { error: '주제는 self·wealth·career·love·remedy 중 하나여야 합니다: ' + id };
    if (r.on !== undefined && typeof r.on !== 'boolean') return { error: 'on 은 true/false 여야 합니다: ' + id };
    const use = {}; for (const k of USE_KEYS) { const v = r.use && r.use[k]; if (v !== undefined && typeof v !== 'boolean') return { error: '사용 여부는 true/false 여야 합니다: ' + id + '.' + k }; use[k] = v === true; }
    if (r.use) for (const k of Object.keys(r.use)) if (!USE_KEYS.includes(k)) return { error: '알 수 없는 항목입니다: ' + id + '.' + k };
    if (r.view !== undefined && r.view !== 'block' && r.view !== 'graph' && r.view !== 'axes') return { error: '형태는 block(풀이)·graph(발현 그래프)·axes(바람과 기량) 중 하나여야 합니다: ' + id };
    if (r.view === 'axes' && !['peak', 'year', 'month'].includes(r.scope)) return { error: '바람과 기량 범위는 peak·year·month 중 하나여야 합니다: ' + id };
    if (r.view === 'graph' && !['daeun', 'seun', 'wolun'].includes(r.scope)) return { error: '그래프 범위는 daeun·seun·wolun 중 하나여야 합니다: ' + id };
    out[id] = { on: r.on !== false, topic: r.topic, use };
    if (r.view === 'graph' || r.view === 'axes') { out[id].view = r.view; out[id].scope = r.scope; }
  }
  return { rows: out };
}
const clean = doc => ({ version: doc && Number.isInteger(doc.version) ? doc.version : 0, ...(doc && doc.rows ? { rows: cleanRows(doc.rows).rows || {} } : {}), at: doc && doc.at || null, by: doc && doc.by || '' });

export async function onRequestGet({ env }) {
  let doc = null; try { doc = env.GLOSSARY_KV ? await env.GLOSSARY_KV.get(KEY, 'json') : null; } catch { doc = null; }
  return new Response(JSON.stringify(clean(doc)), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const r = cleanRows(body && body.rows); if (r.error) return json({ error: r.error }, 400);
  const cur = await env.GLOSSARY_KV.get(KEY, 'json');
  if (body.expectVersion != null && cur && Number.isInteger(cur.version) && body.expectVersion !== cur.version) return json({ error: '다른 곳에서 먼저 저장했습니다. 새로 불러온 뒤 다시 저장하세요' }, 409);
  const doc = { version: (cur && Number.isInteger(cur.version) ? cur.version : 0) + 1, rows: r.rows, at: new Date().toISOString(), by: safeDecode(request.headers.get('x-reviewer') || '').slice(0, 30) };
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc));
  return json({ ok: true, ...clean(doc) });
}
