// 무빙툰 영상 파일 (R2 바인딩 CLIPS_R2 필요)
// GET    /api/clipfile?k=<키>            — 영상 재생 (Range 지원). <video> 태그는 인증 헤더를 못 보내므로 공개, 키는 추측 불가능한 값
// POST   /api/clipfile?name=<파일명>     — 영상(또는 홈 화면용 이미지) 업로드, 본문은 파일 원본 (관리자 전용) → { key }
// DELETE /api/clipfile?k=<키>            — 영상 삭제 (관리자 전용)
import { json, isAdmin } from '../_lib.js';

const MAX_BYTES = 90 * 1024 * 1024; // Pages Functions 요청 본문 한도(100MB) 아래로
const TYPES = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4' };
// 홈 화면 이미지(배경·장식). 영상보다 작게 제한한다.
const IMAGES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };
// 스토리 페이지 음성(나레이션)
const AUDIO = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg' };
const MAX_IMAGE = 15 * 1024 * 1024;
const KEY_RE = /^[\w.-]{1,120}$/;

const noR2 = () => json({ error: 'R2 바인딩(CLIPS_R2)이 설정되지 않았습니다. 영상 URL을 직접 입력하거나 R2를 연결하세요' }, 501);

export async function onRequestGet({ request, env }) {
  if (!env.CLIPS_R2) return noR2();
  const k = new URL(request.url).searchParams.get('k') || '';
  if (!KEY_RE.test(k)) return new Response('not found', { status: 404 });

  const range = request.headers.get('range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  let obj;
  if (m && (m[1] || m[2])) {
    const head = await env.CLIPS_R2.head(k);
    if (!head) return new Response('not found', { status: 404 });
    const size = head.size;
    let start = m[1] ? +m[1] : Math.max(0, size - +m[2]);
    let end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
    obj = await env.CLIPS_R2.get(k, { range: { offset: start, length: end - start + 1 } });
    return new Response(obj.body, { status: 206, headers: {
      'content-type': head.httpMetadata?.contentType || 'video/mp4', 'accept-ranges': 'bytes',
      'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1), 'cache-control': 'public, max-age=3600',
    } });
  }
  obj = await env.CLIPS_R2.get(k);
  if (!obj) return new Response('not found', { status: 404 });
  return new Response(obj.body, { headers: {
    'content-type': obj.httpMetadata?.contentType || 'video/mp4', 'accept-ranges': 'bytes',
    'content-length': String(obj.size), 'cache-control': 'public, max-age=3600',
  } });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!env.CLIPS_R2) return noR2();
  const name = new URL(request.url).searchParams.get('name') || '';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const type = TYPES[ext] || IMAGES[ext] || AUDIO[ext], limit = IMAGES[ext] || AUDIO[ext] ? MAX_IMAGE : MAX_BYTES;
  if (!type) return json({ error: 'mp4, webm, mov 영상, jpg, png, webp, gif, avif 이미지, mp3, m4a, wav, ogg 음성만 올릴 수 있습니다' }, 400);
  const len = +request.headers.get('content-length') || 0;
  if (!len || len > limit) return json({ error: `파일은 ${limit / 1048576 | 0}MB 이하여야 합니다` }, 413);

  const rand = crypto.getRandomValues(new Uint8Array(9));
  const key = Array.from(rand, b => b.toString(16).padStart(2, '0')).join('') + '.' + ext;
  await env.CLIPS_R2.put(key, request.body, { httpMetadata: { contentType: type } });
  return json({ ok: true, key, size: len });
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!env.CLIPS_R2) return noR2();
  const k = new URL(request.url).searchParams.get('k') || '';
  if (!KEY_RE.test(k)) return json({ error: '키가 올바르지 않습니다' }, 400);
  await env.CLIPS_R2.delete(k);
  return json({ ok: true });
}
