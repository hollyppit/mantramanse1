import { isProtectedOriginal, putDerivedFile } from '../_original-assets.js';
// 무빙툰 영상 파일 (R2 바인딩 CLIPS_R2 필요)
// GET    /api/clipfile?k=<키>            — 영상 재생 (Range 지원). <video> 태그는 인증 헤더를 못 보내므로 공개, 키는 추측 불가능한 값
// POST   /api/clipfile?name=<파일명>     — 영상(또는 홈 화면용 이미지, BGM 음원) 업로드, 본문은 파일 원본 (관리자 전용) → { key }
// DELETE /api/clipfile?k=<키>            — 영상 삭제 (관리자 전용)
import { json, isAdmin } from '../_lib.js';

const MAX_BYTES = 90 * 1024 * 1024; // Pages Functions 요청 본문 한도(100MB) 아래로
const TYPES = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4' };
// 홈 화면 이미지(배경·장식). 영상보다 작게 제한한다.
const IMAGES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };
const MAX_IMAGE = 15 * 1024 * 1024;
// 배경 음악(BGM)용 오디오
const AUDIO = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac' };
const MAX_AUDIO = 40 * 1024 * 1024;
const KEY_RE = /^[\w.-]{1,120}$/;

const noR2 = () => json({ error: 'R2 바인딩(CLIPS_R2)이 설정되지 않았습니다. 영상 URL을 직접 입력하거나 R2를 연결하세요' }, 501);

// 2026-11-12: 이미지·영상이 매번 R2 를 거쳐(엣지 보관 없음, cf-cache-status DYNAMIC) 느렸다.
//   올릴 때마다 새 무작위 키를 쓰므로(교체도 새 키) 같은 키의 내용은 바뀌지 않는다 → 브라우저 30일·엣지 보관.
//   엣지에는 전체 파일을 보관하고, Range 요청은 보관본에서 바로 잘라 준다(Cache API 가 206 을 만들어 준다).
export const CLIP_CC = 'public, max-age=2592000, immutable';
const EDGE_MAX = 60 * 1024 * 1024;
const edgeCache = () => { try { return typeof caches !== 'undefined' && caches.default || null; } catch { return null; } };
const edgeKey = (request, k) => new Request(new URL(request.url).origin + '/api/clipfile?k=' + encodeURIComponent(k));
function later(ctx, p) { try { if (ctx && ctx.waitUntil) ctx.waitUntil(p); } catch { } return p.catch(() => { }); }
async function fillEdge(env, request, k) {
  const c = edgeCache(); if (!c) return;
  const head = await env.CLIPS_R2.head(k); if (!head || head.size > EDGE_MAX) return;
  const obj = await env.CLIPS_R2.get(k); if (!obj) return;
  await c.put(edgeKey(request, k), new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'video/mp4', 'content-length': String(obj.size), 'accept-ranges': 'bytes', 'cache-control': CLIP_CC } }));
}

export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  if (!env.CLIPS_R2) return noR2();
  const k = new URL(request.url).searchParams.get('k') || '';
  if (!KEY_RE.test(k)) return new Response('not found', { status: 404 });

  const range = request.headers.get('range');
  const c = edgeCache();
  if (c) {
    try {
      const hit = await c.match(new Request(edgeKey(request, k).url, { headers: range ? { range } : {} }));
      if (hit) { const h = new Headers(hit.headers); h.set('cache-control', CLIP_CC); h.set('x-clip-cache', 'hit'); return new Response(hit.body, { status: hit.status, headers: h }); }
    } catch { }
  }
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
    if (size <= EDGE_MAX) later(ctx, fillEdge(env, request, k)); // 다음 요청부터는 엣지 보관본에서
    return new Response(obj.body, { status: 206, headers: {
      'content-type': head.httpMetadata?.contentType || 'video/mp4', 'accept-ranges': 'bytes',
      'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1), 'cache-control': CLIP_CC,
    } });
  }
  obj = await env.CLIPS_R2.get(k);
  if (!obj) return new Response('not found', { status: 404 });
  const headers = { 'content-type': obj.httpMetadata?.contentType || 'video/mp4', 'accept-ranges': 'bytes', 'content-length': String(obj.size), 'cache-control': CLIP_CC };
  if (c && obj.size <= EDGE_MAX) { const [mine, keep] = obj.body.tee(); later(ctx, c.put(edgeKey(request, k), new Response(keep, { headers }))); return new Response(mine, { headers }); }
  return new Response(obj.body, { headers });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!env.CLIPS_R2) return noR2();
  const name = new URL(request.url).searchParams.get('name') || '';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const type = TYPES[ext] || IMAGES[ext] || AUDIO[ext], limit = IMAGES[ext] ? MAX_IMAGE : AUDIO[ext] ? MAX_AUDIO : MAX_BYTES;
  if (!type) return json({ error: 'mp4, webm, mov 영상, jpg, png, webp, gif, avif 이미지, mp3, m4a, wav, ogg 음원만 올릴 수 있습니다' }, 400);
  const len = +request.headers.get('content-length') || 0;
  if (!len || len > limit) return json({ error: `파일은 ${limit / 1048576 | 0}MB 이하여야 합니다` }, 413);

  const rand = crypto.getRandomValues(new Uint8Array(9));
  const key = Array.from(rand, b => b.toString(16).padStart(2, '0')).join('') + '.' + ext;
  await putDerivedFile(env, key, request.body, { httpMetadata: { contentType: type } });
  return json({ ok: true, key, size: len });
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!env.CLIPS_R2) return noR2();
  const k = new URL(request.url).searchParams.get('k') || '';
  if (!KEY_RE.test(k)) return json({ error: '키가 올바르지 않습니다' }, 400);
  { const c = edgeCache(); if (c) try { await c.delete(edgeKey(request, k)); } catch { } }
  if (isProtectedOriginal(k)) return json({ error: '보존 대상 원본은 삭제할 수 없습니다. 별도 파생본을 사용하세요', code: 'ORIGINAL_PROTECTED' }, 409);
  await env.CLIPS_R2.delete(k);
  return json({ ok: true });
}
