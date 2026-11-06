// 운세 환경 신기능 공개 스위치 (코드 재배포 없이 관리자 화면에서 켜고 끈다)
// GET /api/luck-flags — { interpret, timeline, region, version } (공개, 60초 캐시). 저장된 값이 없으면 모두 false
// PUT /api/luck-flags — { on: true|false } 세 기능을 한 번에, 또는 { flags: { interpret?, timeline?, region? } } 일부만 (관리자)
// 저장은 KV 키 luckenv:flags 하나만 쓴다. 기본값은 모두 꺼짐이며, 값이 없거나 읽기에 실패하면 꺼진 것으로 본다.
// timelineCopy(2026-11-06): 운명의 타임라인(#/timeline) 카드 첫머리 문안(luck-interpret.js SIX). { flags: { timelineCopy } }로만 켜고 끈다 —
//   { on } "모두 켜기/끄기"는 원래 세 기능(ALL_ON)에만 적용해, 다른 기능을 켜다가 이 문안이 같이 공개되지 않게 한다.
import { json, isAdmin, configError } from '../_lib.js';

const KEY = 'luckenv:flags', ALL_ON = ['interpret', 'timeline', 'region'], NAMES = ALL_ON.concat(['timelineCopy']);
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return ''; } };
const clean = doc => { const o = { version: (doc && Number.isInteger(doc.version)) ? doc.version : 0 }; NAMES.forEach(k => { o[k] = !!(doc && doc[k] === true); }); return o; };

export function applyFlags(doc, body, at, by) {
  const next = { ...clean(doc), at, by };
  if (typeof body.on === 'boolean') ALL_ON.forEach(k => { next[k] = body.on; });
  else if (body.flags && typeof body.flags === 'object') {
    for (const k of Object.keys(body.flags)) { if (!NAMES.includes(k) || typeof body.flags[k] !== 'boolean') return { error: '알 수 없는 스위치이거나 true/false가 아닙니다: ' + k }; }
    for (const k of Object.keys(body.flags)) next[k] = body.flags[k];
  } else return { error: '{ on: true|false } 또는 { flags: {…} } 형식이어야 합니다' };
  next.version = (doc && Number.isInteger(doc.version) ? doc.version : 0) + 1;
  return { doc: next };
}

export async function onRequestGet({ env }) {
  let doc = null; try { doc = env.GLOSSARY_KV ? await env.GLOSSARY_KV.get(KEY, 'json') : null; } catch { doc = null; }
  return new Response(JSON.stringify(clean(doc)), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const by = safeDecode(request.headers.get('x-reviewer') || '').slice(0, 30), at = new Date().toISOString();
  const cur = await env.GLOSSARY_KV.get(KEY, 'json');
  const r = applyFlags(cur, body || {}, at, by); if (r.error) return json({ error: r.error }, 400);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(r.doc));
  return json({ ok: true, ...clean(r.doc) });
}
