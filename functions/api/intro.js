// 판매 페이지(/report/) 인트로 영상 설정
// GET /api/intro — 공개. { on, src: {type,value}|null, url, skipAfter, once } (꺼져 있거나 영상이 없으면 on=false)
// PUT /api/intro — 관리자 전용. 같은 형식으로 저장
// 저장 위치: GLOSSARY_KV의 'intro:config' 키. 영상 파일은 /api/clipfile(R2)에 올린다.
import { json, isAdmin, configError } from '../_lib.js';

const KEY = 'intro:config';

function clean(b) {
  const s = (b && b.src) || {};
  let src = null;
  if (s.type === 'r2' && /^[\w.-]{1,120}$/.test(s.value || '')) src = { type: 'r2', value: s.value };
  else if (s.type === 'url' && /^https:\/\/[^\s]{1,500}$/.test(s.value || '')) src = { type: 'url', value: s.value };
  const skip = Math.round(Math.max(0, Math.min(30, +b.skipAfter || 0)) * 10) / 10;
  return { on: !!b.on, src, skipAfter: skip, once: b.once === 'always' ? 'always' : 'session' };
}

const urlOf = (src) => !src ? '' : src.type === 'r2' ? '/api/clipfile?k=' + encodeURIComponent(src.value) : src.value;

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ on: false });
  const c = (await env.GLOSSARY_KV.get(KEY, 'json')) || {};
  const admin = isAdmin(request, env);
  // 공개 응답에는 꺼진 상태에서 영상 주소를 내보내지 않는다. 관리자는 항상 전체 설정을 받는다.
  if (!admin && (!c.on || !c.src)) return json({ on: false });
  return json({ ...clean(c), url: urlOf(c.src) });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const c = clean(body || {});
  if (c.on && !c.src) return json({ error: '영상을 올리거나 주소를 입력한 뒤 켜세요' }, 400);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify({ ...c, at: new Date().toISOString() }));
  return json({ ok: true, ...c, url: urlOf(c.src) });
}
