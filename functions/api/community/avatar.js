// 인연의 광장 프로필 사진. 커뮤니티 잠금 안쪽에서만 열린다(광장에 들어온 사람만 사진을 볼 수 있다).
// GET    ?k=cm-av/<키>  → 사진(올린 사람이 바꾸면 새 키라 오래 보관해도 된다)
// POST   본문 = 이미지 원본(화면이 256×256 WebP/JPEG 로 줄여 보냄. 위치 정보 등 메타데이터는 다시 그리면서 사라진다)
//        content-type image/webp|image/jpeg|image/png, 300KB 이하, 파일 머리 글자로 형식 확인, 하루 10번 → { ok, avatar }
// DELETE → 직접 올린 사진을 지우고 기본(내 일간 포스터)으로
// 사진이 없거나 지우면 기본 = 관리자 화면 '일간·일주 영상'의 내 일간 포스터(functions/_plaza.js avatarOf)
import { json, sbRest, supabaseReady, viewer, profileOf, overLimit, avatarOf, posterMap } from '../../_plaza.js';
import { readConsents, requiredOk } from '../../_consent.js';

const MAX = 300 * 1024;
const KEY_RE = /^cm-av\/[0-9a-f]{32}\.(webp|jpg|png)$/;
const sniff = b => {
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return ['webp', 'image/webp'];
  if (b.length > 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return ['jpg', 'image/jpeg'];
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return ['png', 'image/png'];
  return null;
};
const hex = a => [...a].map(x => x.toString(16).padStart(2, '0')).join('');

export async function onRequestGet({ request, env }) {
  const k = new URL(request.url).searchParams.get('k') || '';
  if (!KEY_RE.test(k) || !env.CLIPS_R2) return new Response('not found', { status: 404 });
  const o = await env.CLIPS_R2.get(k); if (!o) return new Response('not found', { status: 404 });
  return new Response(o.body, { headers: { 'content-type': (o.httpMetadata && o.httpMetadata.contentType) || 'image/webp', 'cache-control': 'private, max-age=2592000, immutable', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; img-src 'self'; sandbox" } });
}

async function who(request, env) {
  if (!supabaseReady(env)) return { res: json({ error: '잠시 후 다시 시도해 주세요' }, 503) };
  if (!env.CLIPS_R2) return { res: json({ error: '사진 저장소가 설정되지 않았습니다' }, 503) };
  const me = await viewer(request, env); if (!me) return { res: json({ error: '로그인이 필요합니다', need: 'login' }, 401) };
  if (!requiredOk(await readConsents(env, me.id))) return { res: json({ error: '이용 동의가 먼저 필요합니다', need: 'consent' }, 409) };
  const p = await profileOf(env, me.id);
  if (!p || !p.nickname) return { res: json({ error: '먼저 닉네임을 정해 주세요', need: 'profile' }, 409) };
  return { me, p };
}

// 2026-11-28 보안 점검: content-length 없이(chunked) 큰 본문을 보내면 arrayBuffer() 가 전부 메모리에 올렸다 → 스트림을 max+1 바이트까지만 읽고 끊는다(넘으면 null)
export async function readCapped(request, max) {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader(), parts = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    n += value.byteLength; if (n > max) { try { await reader.cancel(); } catch { } return null; }
    parts.push(value);
  }
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.byteLength; }
  return out;
}

export async function onRequestPost({ request, env }) {
  const w = await who(request, env); if (w.res) return w.res;
  const len = +(request.headers.get('content-length') || 0); if (len > MAX) return json({ error: '사진이 너무 큽니다(300KB 이하)' }, 413);
  const buf = await readCapped(request, MAX); if (!buf) return json({ error: '사진이 너무 큽니다(300KB 이하)' }, 413);
  if (!buf.length || buf.length > MAX) return json({ error: '사진이 너무 크거나 비어 있습니다' }, 413);
  const t = sniff(buf); if (!t) return json({ error: 'JPG·PNG·WebP 사진만 올릴 수 있습니다' }, 415);
  if (await overLimit(env, 'avatar:' + w.me.id, 10)) return json({ error: '사진은 하루 10번까지 바꿀 수 있습니다' }, 429);
  const key = 'cm-av/' + hex(crypto.getRandomValues(new Uint8Array(16))) + '.' + t[0];
  await env.CLIPS_R2.put(key, buf, { httpMetadata: { contentType: t[1] } });
  const old = w.p.avatar_path;
  await sbRest(env, `member_profiles?user_id=eq.${encodeURIComponent(w.me.id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ avatar_path: key, updated_at: new Date().toISOString() }) });
  if (old && KEY_RE.test(old)) { try { await env.CLIPS_R2.delete(old); } catch { } }
  return json({ ok: true, avatar: avatarOf({ ...w.p, avatar_path: key }, await posterMap(env), true) });
}

export async function onRequestDelete({ request, env }) {
  const w = await who(request, env); if (w.res) return w.res;
  const old = w.p.avatar_path;
  if (old) {
    await sbRest(env, `member_profiles?user_id=eq.${encodeURIComponent(w.me.id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ avatar_path: null, updated_at: new Date().toISOString() }) });
    if (KEY_RE.test(old)) { try { await env.CLIPS_R2.delete(old); } catch { } }
  }
  return json({ ok: true, avatar: avatarOf({ ...w.p, avatar_path: null }, await posterMap(env), true) });
}
