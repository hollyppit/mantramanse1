// 소원 성취 명당(wish-spots.js)의 장소 등록·검수·게시 관리
// GET  /api/wish-spots          — { version, enabled, spots } 게시된 장소만(공개, 60초 캐시). enabled=false 이면 spots=[] → 사용자 화면에는 아무것도 나오지 않음
// GET  /api/wish-spots?all=1    — 전체 장소·상태·이력 (관리자)
// PUT  /api/wish-spots          — 관리자. body.kind: spot | flag
//   spot { action:create, id, fields:{name,lat,lon,type,tags,source:{name,url,checked},note?,on?} }  새 장소(초안)
//        { id, action: save(fields 일부) | approve_publish | publish | unpublish | restore(v) | delete }
//   flag { enabled:true|false }   사용자 화면 공개 스위치(코드 재배포 없이)
//   공통 bulk { kind:'spot', action:'bulk', ids:[…(최대 200)], op:publish|unpublish }
// 장소는 출처 이름·https 주소·확인 날짜가 있어야 저장된다(확인되지 않은 장소를 임의로 만들지 않는다). 저장은 KV 키 wishspots:doc 하나만 쓴다.
import { json, isAdmin, configError } from '../_lib.js';
import '../../wish-spots.js';

const KEY = 'wishspots:doc', MAX_HIST = 30;
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return ''; } };
const WS = () => globalThis.MantraWishSpots;
const empty = () => ({ version: 0, enabled: false, spots: {} });

export function transition(doc, body, at, by) {
  const id = body.id; if (typeof id !== 'string') return { error: 'id 가 필요합니다', status: 400 };
  let it = doc.spots[id];
  const log = () => { it.history.push({ v: it.version, fields: it.fields, status: it.status, at, by }); if (it.history.length > MAX_HIST) it.history.shift(); it.by = by; it.at = at; doc.version += 1; };
  switch (body.action) {
    case 'create': {
      if (!WS().ID_RE.test(id)) return { error: 'ID는 영문 소문자·숫자·- 3~40자입니다', status: 400 };
      if (it) return { error: '이미 있는 ID입니다', status: 400 };
      const v = WS().validateSpot({ on: true, note: '', ...(body.fields || {}) }, true); if (v.error) return { error: v.error, status: 400 };
      it = doc.spots[id] = { fields: v.fields, status: 'draft', version: 1, by: '', at: '', history: [] }; log(); return { ok: true, item: it };
    }
    case 'save': {
      if (!it) return { error: '등록되지 않은 장소입니다', status: 404 };
      const v = WS().validateSpot(body.fields || {}, false); if (v.error) return { error: v.error, status: 400 };
      if (!Object.keys(v.fields).length) return { error: '바꿀 내용이 없습니다', status: 400 };
      it.fields = { ...it.fields, ...v.fields }; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    case 'approve_publish': case 'publish': {
      if (!it) return { error: '등록되지 않은 장소입니다', status: 404 };
      if (it.status === 'published') return { error: '이미 게시된 장소입니다', status: 400 };
      const v = WS().validateSpot(it.fields, true); if (v.error) return { error: v.error, status: 400 };
      it.status = 'published'; log(); return { ok: true, item: it };
    }
    case 'unpublish': { if (!it || it.status !== 'published') return { error: '게시된 장소가 아닙니다', status: 400 }; it.status = 'reviewed'; log(); return { ok: true, item: it }; }
    case 'restore': {
      if (!it) return { error: '이력이 없습니다', status: 404 };
      const h = it.history.find(x => x.v === body.v); if (!h) return { error: '이력을 찾을 수 없습니다', status: 404 };
      const v = WS().validateSpot(h.fields, true); if (v.error) return { error: v.error, status: 400 };
      it.fields = { ...h.fields }; it.status = 'draft'; it.version += 1; log(); return { ok: true, item: it };
    }
    case 'delete': { if (!it) return { error: '등록되지 않은 장소입니다', status: 404 }; delete doc.spots[id]; doc.version += 1; return { ok: true, deleted: id }; }
    default: return { error: '지원하지 않는 작업입니다', status: 400 };
  }
}
export const publishedSpots = doc => Object.entries(doc.spots || {}).filter(([, it]) => it.status === 'published').map(([id, it]) => ({ id, ...it.fields }));
const load = async env => { const d = await env.GLOSSARY_KV.get(KEY, 'json'); return d ? { ...empty(), ...d } : empty(); };

export async function onRequestGet({ request, env }) {
  if (new URL(request.url).searchParams.get('all')) {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩이 없습니다' }, 500);
    const doc = await load(env); return json({ version: doc.version, enabled: doc.enabled, doc, base: { wish: WS().WISH, types: WS().TYPES, weights: WS().WEIGHTS } });
  }
  let doc = empty(); try { if (env.GLOSSARY_KV) doc = await load(env); } catch { doc = empty(); }
  return new Response(JSON.stringify({ version: doc.version, enabled: doc.enabled === true, spots: doc.enabled === true ? publishedSpots(doc) : [] }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
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
      const cur = (doc.spots[id] || {}).status;
      if ((body.op === 'publish' && cur === 'published') || (body.op === 'unpublish' && cur !== 'published')) { skipped.push(id); continue; }
      const r = transition(doc, { id, action: body.op === 'publish' ? 'approve_publish' : 'unpublish' }, at, by);
      if (r.error) failed.push({ id, error: r.error }); else done.push(id);
    }
    if (done.length) await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc));
    return json({ ok: true, version: doc.version, done: done.length, skipped: skipped.length, failed });
  }
  const r = transition(doc, body, at, by); if (r.error) return json({ error: r.error }, r.status);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(doc));
  return json({ ok: true, version: doc.version, item: r.item, deleted: r.deleted });
}
