// 판매 페이지(/report/) 홈 화면 내용
// GET /api/home — 공개. { home: {...}|null } (null이면 페이지가 내장 기본 문구를 쓴다)
// PUT /api/home — 관리자 전용. { home: {...} } 저장. DELETE — 저장된 설정을 지우고 기본 문구로 되돌린다
// 저장 위치: GLOSSARY_KV의 'home:config' 키. 모양은 report/home.js의 DEFAULTS와 같다.
import { json, isAdmin, configError } from '../_lib.js';

const KEY = 'home:config';
const TYPES = ['intro', 'preview', 'episodes', 'paths', 'pillars', 'prices', 'faq', 'notify', 'image', 'spacer', 'divider'];
const MAX_SECTIONS = 60, MAX_BYTES = 400 * 1024;

// 문자열·숫자·불리언·배열·객체만 남기고 길이를 제한한다. 화면에 그릴 때 모든 글자는 이스케이프되므로 내용 자체는 자유롭게 둔다.
function clean(v, depth = 0, key = '') {
  if (typeof v === 'string') {
    v = v.slice(0, 3000);
    // 링크 주소·이미지 주소는 안전한 형식만
    if (/href$/i.test(key) && v && !/^(#[\w-]*|\/[^\s]*|https:\/\/[^\s]+|mailto:[^\s]+)$/.test(v.trim())) return '';
    if (/src$/i.test(key) && v && !/^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]+)$/.test(v.trim())) return '';
    return v;
  }
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (depth < 7 && Array.isArray(v)) return v.slice(0, 80).map(x => clean(x, depth + 1));
  if (depth < 7 && v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).slice(0, 40)) if (/^\w{1,24}$/.test(k)) o[k] = clean(v[k], depth + 1, k);
    return o;
  }
  return null;
}

export async function onRequestGet({ env }) {
  if (!env.GLOSSARY_KV) return json({ home: null });
  return json({ home: (await env.GLOSSARY_KV.get(KEY, 'json')) || null });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const h = body && body.home;
  if (!h || typeof h !== 'object' || !h.brand || !h.hero || !Array.isArray(h.sections) || h.sections.length > MAX_SECTIONS) return json({ error: '홈 화면 설정 형식이 올바르지 않습니다' }, 400);
  const home = { brand: clean(h.brand), hero: clean(h.hero), sections: [], footer: clean(h.footer || {}) };
  const seen = new Set();
  for (const s of h.sections) {
    if (!s || !TYPES.includes(s.type) || !/^[\w-]{1,24}$/.test(String(s.id || '')) || seen.has(s.id)) return json({ error: '섹션 형식이 올바르지 않습니다 (id 중복 또는 알 수 없는 종류)' }, 400);
    seen.add(s.id);
    home.sections.push({ ...clean(s), id: s.id, type: s.type, show: s.show !== false });
  }
  const text = JSON.stringify({ ...home, at: new Date().toISOString() });
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
