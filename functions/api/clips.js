// GET /api/clips — 무빙툰 클립 목록 { clips: [...] } (관리자 전용)
// PUT /api/clips — { clips: [...] } 전체 저장 (관리자 전용)
// 저장 위치: GLOSSARY_KV의 'clips:index' 키
import { json, isAdmin, configError } from '../_lib.js';

const CLIPS_KEY = 'clips:index';
const CHAPTERS = ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
const COND_KEYS = ['ilju', 'ilgan', 'ilji', 'wolji', 'yongEl', 'strength', 'dominant', 'gender'];
const MAX_CLIPS = 3000;

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
  return { id, title, chapter: c.chapter, cond, src, caption: String(c.caption || '').slice(0, 500), note: String(c.note || '').slice(0, 300), priority: Math.max(-100, Math.min(100, +c.priority || 0)) };
}

export async function onRequestGet({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const data = (await env.GLOSSARY_KV.get(CLIPS_KEY, 'json')) || { clips: [] };
  return json({ clips: data.clips || [], r2: !!env.CLIPS_R2 });
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
  await env.GLOSSARY_KV.put(CLIPS_KEY, JSON.stringify({ clips, at: new Date().toISOString() }));
  return json({ ok: true, count: clips.length });
}
