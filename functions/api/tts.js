// 일레븐랩스(ElevenLabs) 음성 합성 (관리자 전용). 만든 mp3는 R2(CLIPS_R2)에 저장하고, 재생은 /api/clipfile?k=<키> 로 한다.
// 필요한 설정: Secret ELEVENLABS_API_KEY, R2 바인딩 CLIPS_R2, Secret ADMIN_PASSWORD
// GET  /api/tts?voices=1 — 내 계정에서 쓸 수 있는 목소리 목록 { voices: [{ id, name, category, labels, preview, ko }] }
// POST /api/tts          — { text, voiceId, model, stability, similarity, style, speed, force? } → { key, cached }
//   같은 문장·목소리·설정이면 이미 만든 파일을 재사용해 크레딧을 쓰지 않는다. force:true면 새로 만든다.
import { json, isAdmin } from '../_lib.js';

const API = 'https://api.elevenlabs.io';
const MODELS = ['eleven_multilingual_v2', 'eleven_v3', 'eleven_flash_v2_5', 'eleven_turbo_v2_5'];
const LANG_MODELS = ['eleven_flash_v2_5', 'eleven_turbo_v2_5']; // language_code를 받는 모델 (multilingual_v2는 받지 않음)
const ID_RE = /^[A-Za-z0-9]{10,40}$/;
const MAX_TEXT = 500;
const clamp = (v, lo, hi, d) => { const n = +v; return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');

const needKey = env => !env.ELEVENLABS_API_KEY
  ? json({ error: 'ELEVENLABS_API_KEY가 설정되지 않았습니다. Cloudflare Pages → 설정 → 변수 및 비밀에 Secret으로 추가한 뒤 다시 배포하세요' }, 501) : null;

async function apiError(r) {
  let m = '';
  try {
    const d = await r.json(), det = d && d.detail;
    m = typeof det === 'string' ? det : det && det.message ? det.message : Array.isArray(det) ? det.map(x => x.msg).join('; ') : '';
  } catch { /* 본문이 JSON이 아님 */ }
  const hint = /permission/i.test(m) ? ' → API 키에 해당 권한이 없습니다. ElevenLabs의 API Keys에서 키 권한(Text to Speech 사용, Voices 읽기)을 켜거나 새 키를 만드세요. 목소리 목록 없이는 “목소리 ID 직접 입력”으로도 쓸 수 있습니다' : '';
  return json({ error: `ElevenLabs 오류 ${r.status}${m ? ': ' + m : ''}${hint}` }, 502);
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const nk = needKey(env); if (nk) return nk;
  const r = await fetch(`${API}/v2/voices?page_size=100&include_total_count=false`, { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } });
  if (!r.ok) return apiError(r);
  const d = await r.json();
  const voices = (d.voices || []).map(v => ({
    id: v.voice_id, name: v.name, category: v.category || '', labels: v.labels || {}, preview: v.preview_url || '',
    ko: Array.isArray(v.verified_languages) && v.verified_languages.some(l => /^ko/i.test(l.language || l.locale || '')),
  })).sort((a, b) => (b.ko ? 1 : 0) - (a.ko ? 1 : 0) || (a.name < b.name ? -1 : 1));
  return json({ voices });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const nk = needKey(env); if (nk) return nk;
  if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 설정되지 않아 음성 파일을 저장할 수 없습니다' }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const text = String((b && b.text) || '').trim();
  if (!text || text.length > MAX_TEXT) return json({ error: `읽을 문장은 1~${MAX_TEXT}자여야 합니다` }, 400);
  if (!ID_RE.test(String(b.voiceId || ''))) return json({ error: '목소리를 선택하세요' }, 400);
  const voiceId = String(b.voiceId), model = MODELS.includes(b.model) ? b.model : MODELS[0];
  const stability = clamp(b.stability, 0, 1, 0.5), similarity = clamp(b.similarity, 0, 1, 0.75), style = clamp(b.style, 0, 1, 0), speed = clamp(b.speed, 0.7, 1.2, 1);

  // 파일 키: 추측할 수 없도록 관리자 비밀번호를 섞어 해시한다 (재생 주소는 공개이므로)
  const nonce = b.force ? hex(crypto.getRandomValues(new Uint8Array(4))) : '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode([env.ADMIN_PASSWORD, text, voiceId, model, stability, similarity, style, speed, nonce].join('|')));
  const key = 'tts-' + hex(digest).slice(0, 32) + '.mp3';
  if (!b.force && await env.CLIPS_R2.head(key)) return json({ ok: true, key, cached: true });

  const body = { text, model_id: model, voice_settings: { stability, similarity_boost: similarity, style, use_speaker_boost: true, speed } };
  if (LANG_MODELS.includes(model)) body.language_code = 'ko';
  const r = await fetch(`${API}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify(body),
  });
  if (!r.ok) return apiError(r);
  const audio = await r.arrayBuffer();
  await env.CLIPS_R2.put(key, audio, { httpMetadata: { contentType: 'audio/mpeg' } });
  return json({ ok: true, key, cached: false, bytes: audio.byteLength, chars: text.length });
}
