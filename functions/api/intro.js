// 판매 페이지(/report/) 인트로 영상 설정
// GET /api/intro — 공개. { on, src, srcMobile, fx, fxPc, fxMobile, url, urlMobile, skipAfter, once } — fx는 공통(문구 포함), fxPc·fxMobile은 그 기기에서 덮어쓸 글자 연출 (꺼져 있거나 영상이 없으면 on=false)
// PUT /api/intro — 관리자 전용. 같은 형식으로 저장
// 저장 위치: GLOSSARY_KV의 'intro:config' 키. 영상 파일은 /api/clipfile(R2)에 올린다.
import { json, isAdmin, configError } from '../_lib.js';
import { cleanFx } from '../_fx.js';

const KEY = 'intro:config';

function cleanSrc(s) {
  s = s || {};
  if (s.type === 'r2' && /^[\w.-]{1,120}$/.test(s.value || '')) return { type: 'r2', value: s.value };
  if (s.type === 'url' && /^https:\/\/[^\s]{1,500}$/.test(s.value || '')) return { type: 'url', value: s.value };
  return null;
}
// src = 웹(PC)용, srcMobile = 모바일용. 한쪽만 있으면 모든 기기에서 그 영상을 쓴다.
function clean(b) {
  const src = cleanSrc(b.src), srcMobile = cleanSrc(b.srcMobile);
  const skip = Math.round(Math.max(0, Math.min(30, +b.skipAfter || 0)) * 10) / 10;
  return { on: !!b.on, src, srcMobile, fx: cleanFx(b.fx), fxPc: cleanFx(b.fxPc), fxMobile: cleanFx(b.fxMobile), skipAfter: skip, once: b.once === 'always' ? 'always' : 'session' };
}

const urlOf = (src) => !src ? '' : src.type === 'r2' ? '/api/clipfile?k=' + encodeURIComponent(src.value) : src.value;

const out = (c) => ({ ...c, url: urlOf(c.src), urlMobile: urlOf(c.srcMobile) });

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ on: false });
  const c = (await env.GLOSSARY_KV.get(KEY, 'json')) || {};
  const admin = isAdmin(request, env);
  // 공개 응답에는 꺼진 상태에서 영상 주소를 내보내지 않는다. 관리자는 항상 전체 설정을 받는다.
  if (!admin && (!c.on || !(c.src || c.srcMobile))) return json({ on: false });
  return json(out(clean(c)));
}

export async function onRequestPut({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const c = clean(body || {});
  if (c.on && !c.src && !c.srcMobile) return json({ error: '웹용 또는 모바일용 영상을 올리거나 주소를 입력한 뒤 켜세요' }, 400);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify({ ...c, at: new Date().toISOString() }));
  return json({ ok: true, ...out(c) });
}
