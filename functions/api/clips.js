// GET /api/clips — 무빙툰 클립 목록 { clips: [...] } (관리자 전용)
// PUT /api/clips — { clips: [...], defaults: {...} } 전체 저장 (defaults = 기본 연출) (관리자 전용)
// 저장 위치: GLOSSARY_KV의 'clips:index' 키
import { json, isAdmin, configError } from '../_lib.js';

const CLIPS_KEY = 'clips:index';
const CHAPTERS = ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
const COND_KEYS = ['ilju', 'ilgan', 'ilji', 'wolji', 'yongEl', 'strength', 'dominant', 'gender'];
const MAX_CLIPS = 3000;

// 연출 옵션 검증표 (report/fx.js의 FIELDS와 같은 범위). 배열=허용 값, [min,max]=숫자 범위, 'S'=짧은 문자열, 'H'=#색상코드.
const TR_IN = ['cut', 'fade', 'dissolve', 'slide-left', 'slide-right', 'slide-up', 'zoom-in', 'zoom-out', 'wipe', 'flash'];
const TR_OUT = ['cut', 'fade', 'dissolve', 'slide-left', 'slide-up', 'zoom-in', 'wipe', 'flash'];
const FX = {
  trans: { in: TR_IN, out: TR_OUT, dur: [0.1, 3] },
  sub: { font: ['gothic', 'pretty', 'myeongjo', 'gowun', 'gowundodum', 'hanna', 'dohyeon', 'bagel', 'jua', 'dongle', 'gamja', 'hi', 'single', 'poor', 'pen', 'gaegu', 'dokdo', 'brush', 'songmyung', 'yeonsung', 'gugi', 'stylish', 'cute', 'kirang', 'sunflower'], weight: ['400', '500', '700', '900'], size: ['S', 'M', 'L'], fs: [2, 14], color: ['ivory', 'white', 'gold', 'yellow'], colorHex: 'H', bg: ['none', 'shade', 'box'], anim: ['none', 'fade', 'rise', 'pop', 'type'], align: ['center', 'left', 'right'], lh: [1, 2.5], ls: [-5, 30], pos: ['bottom', 'middle', 'top'], x: [0, 100], y: [0, 100], w: [20, 100] },
  voice: { on: ['off', 'on'], name: 'S', mode: ['cue', 'whole'], rate: [0.5, 2], pitch: [0.5, 2], vol: [0, 1], delay: [0, 10] },
  video: { speed: [0.25, 2], vol: [0, 1], fit: ['contain', 'cover'], trimStart: [0, 600], trimEnd: [0, 600], hold: [0, 10] },
};
const MAX_CUES = 80;

// 지정된 값만 남긴다. 비어 있으면 "기본 연출을 따름".
function cleanFx(fx) {
  const out = {};
  if (!fx || typeof fx !== 'object') return out;
  for (const g of Object.keys(FX)) {
    const src = fx[g];
    if (!src || typeof src !== 'object') continue;
    for (const k of Object.keys(FX[g])) {
      const v = src[k], rule = FX[g][k];
      if (v === undefined || v === null || v === '') continue;
      let val;
      if (Array.isArray(rule) && typeof rule[0] === 'string') { if (!rule.includes(String(v))) continue; val = String(v); }
      else if (Array.isArray(rule)) { const n = +v; if (!Number.isFinite(n)) continue; val = Math.round(Math.max(rule[0], Math.min(rule[1], n)) * 100) / 100; }
      else if (rule === 'H') { if (!/^#[0-9a-fA-F]{3,8}$/.test(String(v))) continue; val = String(v); }
      else val = String(v).slice(0, 120);
      (out[g] = out[g] || {})[k] = val;
    }
  }
  if (Array.isArray(fx.cues)) {
    const cues = [];
    for (const c of fx.cues.slice(0, MAX_CUES)) {
      const t = String((c && c.t) || '').trim().slice(0, 200), s = +(c && c.s), e = +(c && c.e);
      if (t && Number.isFinite(s) && Number.isFinite(e) && s >= 0 && e > s && e <= 3600) cues.push({ t, s: Math.round(s * 100) / 100, e: Math.round(e * 100) / 100 });
    }
    if (cues.length) out.cues = cues;
  }
  return out;
}

function clean(c) {
  if (!c || typeof c !== 'object') return null;
  const id = String(c.id || '').slice(0, 40), title = String(c.title || '').trim().slice(0, 80);
  if (!/^[\w-]{1,40}$/.test(id) || !title || !CHAPTERS.includes(c.chapter)) return null;
  const cond = {};
  for (const k of COND_KEYS) {
    const v = c.cond && c.cond[k];
    if (Array.isArray(v) && v.length) cond[k] = v.slice(0, 80).map(x => String(x).slice(0, 8));
  }
  const s = c.src || {};
  let src = null;
  if (s.type === 'r2' && /^[\w.-]{1,120}$/.test(s.value || '')) src = { type: 'r2', value: s.value };
  else if (s.type === 'url' && /^https:\/\/[^\s]{1,500}$/.test(s.value || '')) src = { type: 'url', value: s.value };
  else if (s.type) return null; // 알 수 없는 형식
  return { id, title, chapter: c.chapter, cond, src, caption: String(c.caption || '').slice(0, 500), note: String(c.note || '').slice(0, 300), fx: cleanFx(c.fx), priority: Math.max(-100, Math.min(100, +c.priority || 0)) };
}

export async function onRequestGet({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const data = (await env.GLOSSARY_KV.get(CLIPS_KEY, 'json')) || { clips: [] };
  return json({ clips: data.clips || [], defaults: data.defaults || {}, r2: !!env.CLIPS_R2 });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (!body || !Array.isArray(body.clips) || body.clips.length > MAX_CLIPS) return json({ error: '클립 목록이 올바르지 않습니다' }, 400);
  const clips = [], seen = new Set();
  for (const raw of body.clips) {
    const c = clean(raw);
    if (!c) return json({ error: `클립 형식 오류: ${String(raw && (raw.title || raw.id) || '').slice(0, 30)}` }, 400);
    if (seen.has(c.id)) return json({ error: `중복된 id: ${c.id}` }, 400);
    seen.add(c.id); clips.push(c);
  }
  const prev = (await env.GLOSSARY_KV.get(CLIPS_KEY, 'json')) || {};
  const defaults = body.defaults === undefined ? (prev.defaults || {}) : cleanFx({ ...body.defaults, cues: undefined });
  await env.GLOSSARY_KV.put(CLIPS_KEY, JSON.stringify({ clips, defaults, at: new Date().toISOString() }));
  return json({ ok: true, count: clips.length });
}
