// 무빙툰 프롤로그 (안내자별: M = 운명 감찰관, F = 명운 해독관) — 공통 + 주제(세계)별
// GET /api/prologue — 공개. { on, M, F, MI, FI, imgSec, worlds: { w1: { M, F, MI, FI }, … } }
//   M/F = 영상 주소, MI/FI = 이미지 주소(없으면 ''). 뷰어는 주제 → 공통 순서로 찾고, 영상이 있으면 영상(이미지는 포스터), 이미지만 있으면 imgSec 초 동안 이미지를 보여 준다.
// PUT /api/prologue — 관리자 전용. 같은 모양으로 저장. 파일은 /api/clipfile(R2)에 올린다.
// 저장 위치: GLOSSARY_KV 'prologue:video'
import { json, isAdmin, configError } from '../_lib.js';

const KEY = 'prologue:video', OK = /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]{1,500})$/, WORLD = /^w\d{1,2}$/, MAX_WORLDS = 24;
const u = v => (typeof v === 'string' && OK.test(v.trim()) ? v.trim() : '');
const slots = v => ({ M: u(v.M), F: u(v.F), MI: u(v.MI), FI: u(v.FI) });
export const clean = b => {
  b = b || {};
  const worlds = {};
  if (b.worlds && typeof b.worlds === 'object') {
    for (const id of Object.keys(b.worlds).filter(k => WORLD.test(k)).slice(0, MAX_WORLDS)) {
      const v = b.worlds[id];
      if (v && typeof v === 'object') worlds[id] = slots(v);
    }
  }
  const sec = Math.round(+b.imgSec);
  return { on: b.on !== false, ...slots(b), imgSec: sec >= 2 && sec <= 30 ? sec : 6, worlds };
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
  // 이전 관리자 화면에서 공통 영상만 저장해도 주제별 설정·이미지는 보존한다.
  const previous = await env.GLOSSARY_KV.get(KEY, 'json') || {};
  b = { ...b };
  if (!Object.prototype.hasOwnProperty.call(b, 'worlds')) b.worlds = previous.worlds;
  for (const k of ['MI', 'FI', 'imgSec']) if (!Object.prototype.hasOwnProperty.call(b, k)) b[k] = previous[k];
  const c = clean(b); await env.GLOSSARY_KV.put(KEY, JSON.stringify({ ...c, at: new Date().toISOString() })); return json({ ok: true, ...c });
}
