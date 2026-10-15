// 무빙툰 프롤로그 영상 (남·여)
// GET /api/prologue — 공개. { on, M, F } — 영상 주소(없으면 ''). 켜져 있고 해당 성별 영상이 있을 때만 뷰어가 텍스트 프롤로그 대신 이 영상을 재생한다.
// PUT /api/prologue — 관리자 전용. { on, M, F } 저장. 영상 파일은 /api/clipfile(R2)에 올린다.
// 저장 위치: GLOSSARY_KV 'prologue:video'
import { json, isAdmin, configError } from '../_lib.js';

const KEY = 'prologue:video', OK = /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]{1,500})$/;
export const clean = b => {
  b = b || {}; const u = v => (typeof v === 'string' && OK.test(v.trim()) ? v.trim() : '');
  const worlds = {};
  for (const id of ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7']) {
    const v = b.worlds && b.worlds[id];
    if (v && typeof v === 'object') worlds[id] = { M: u(v.M), F: u(v.F) };
  }
  return { on: b.on !== false, M: u(b.M), F: u(b.F), worlds };
};

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ on: false, M: '', F: '' });
  const c = clean(await env.GLOSSARY_KV.get(KEY, 'json')), admin = isAdmin(request, env);
  if (!admin && !c.on) return json({ on: false, M: '', F: '' });
  return json(c);
}

export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  // 이전 관리자 화면에서 공통 영상만 저장해도 주제별 설정은 보존한다.
  if (!Object.prototype.hasOwnProperty.call(b || {}, 'worlds')) {
    const previous = await env.GLOSSARY_KV.get(KEY, 'json'); b = { ...b, worlds: previous && previous.worlds };
  }
  const c = clean(b); await env.GLOSSARY_KV.put(KEY, JSON.stringify({ ...c, at: new Date().toISOString() })); return json({ ok: true, ...c });
}
