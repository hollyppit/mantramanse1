// 스토리 페이지(/report/) 내용
// GET    /api/story — 공개. { story: {...}|null } (null이면 페이지가 report/story/content.js 의 기본 내용을 쓴다)
// PUT    /api/story — 관리자 전용. { story: {...} } 저장
// DELETE /api/story — 저장된 내용을 지우고 기본 내용으로 되돌린다
// 저장 위치: GLOSSARY_KV 의 'story:config' 키. 모양은 report/story/content.js 의 window.OnboardingContent 와 같다(blocks·interests·settings·result·flow·locked·purchase).
import { json, isAdmin, configError } from '../_lib.js';

const KEY = 'story:config';
const BLOCK_TYPES = ['headline', 'text', 'quote', 'image', 'imageText', 'fullImage', 'gallery', 'video', 'chain', 'compare', 'stickySteps', 'interest', 'spacer', 'divider', 'cta', 'component'];
const OBJ_KEYS = ['settings', 'result', 'flow', 'locked', 'purchase'];
const MAX_BLOCKS = 200, MAX_BYTES = 400 * 1024;

// 이미지·영상 주소: 이 사이트 이미지 폴더의 상대경로, 업로드 파일(/api/clipfile?k=), https 주소만
const MEDIA_OK = /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]+|(?!\/)(?!.*\.\.)[\w가-힣./%-]{1,200})$/;
const HREF_OK = /^(\/[^\s]*|https:\/\/[^\s]+)$/;
const ACTION_OK = /^(scroll:[\w-]{1,40}|href:(\/[^\s]*|https:\/\/[^\s]+)|flow:open|purchase|auto:start)$/;

// 문자열·숫자·불리언·배열·객체만 남기고 길이를 제한한다. 화면에 그릴 때 모든 글자는 이스케이프되므로 글 내용 자체는 자유롭게 둔다.
function clean(v, depth = 0, key = '') {
  if (typeof v === 'string') {
    v = v.slice(0, 3000);
    const t = v.trim();
    if (/^(src|srcMobile|poster|voice)$/.test(key) && t && !MEDIA_OK.test(t)) return '';
    if (key === 'href' && t && !HREF_OK.test(t)) return '';
    if (key === 'action' && t && !ACTION_OK.test(t)) return '';
    return v;
  }
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (depth < 7 && Array.isArray(v)) return v.slice(0, 80).map(x => clean(x, depth + 1, key === 'items' || key === 'steps' ? '' : key));
  if (depth < 7 && v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).slice(0, 60)) if (/^[\w가-힣]{1,30}$/.test(k)) o[k] = clean(v[k], depth + 1, k);
    return o;
  }
  return null;
}

export async function onRequestGet({ env }) {
  if (!env.GLOSSARY_KV) return json({ story: null });
  return json({ story: (await env.GLOSSARY_KV.get(KEY, 'json')) || null });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const s = body && body.story;
  if (!s || typeof s !== 'object' || !Array.isArray(s.blocks) || s.blocks.length > MAX_BLOCKS) return json({ error: '스토리 형식이 올바르지 않습니다' }, 400);
  const out = { blocks: [] };
  for (const b of s.blocks) {
    if (!b || typeof b !== 'object' || !BLOCK_TYPES.includes(b.type)) return json({ error: '알 수 없는 블록 종류가 있습니다' }, 400);
    out.blocks.push({ ...clean(b), type: b.type });
  }
  if (Array.isArray(s.interests)) out.interests = clean(s.interests.slice(0, 8));
  for (const k of OBJ_KEYS) if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) out[k] = clean(s[k]);
  const text = JSON.stringify({ ...out, at: new Date().toISOString() });
  if (text.length > MAX_BYTES) return json({ error: '내용이 너무 깁니다' }, 413);
  await env.GLOSSARY_KV.put(KEY, text);
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  await env.GLOSSARY_KV.delete(KEY);
  return json({ ok: true });
}
