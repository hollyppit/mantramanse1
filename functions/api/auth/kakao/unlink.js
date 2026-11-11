// GET|POST /api/auth/kakao/unlink — 카카오 '연결 해제 웹훅'. 카카오 디벨로퍼스 → 앱 → 웹훅 → 연결 해제 웹훅에 이 주소를 넣는다.
// 사용자가 카카오에서 우리 서비스 연결을 끊거나 카카오계정을 탈퇴하면 카카오가 보낸다(app_id, user_id, referrer_type).
// 확인: Authorization 이 'KakaoAK <대표 어드민 키>'(KAKAO_ADMIN_KEY)인지, app_id 가 KAKAO_APP_ID(있으면)와 같은지.
// 카카오는 3초 안에 200 을 기다리므로 응답을 먼저 주고 탈퇴 처리는 뒤에서 한다. 회원이 없어도 200.
// 점검 기록: 알림마다 KV 'diag:kakao-unlink:<시각>:<Ray ID>' 에 따로 남긴다(7일). 응답 전에 받은 사실·키 일치를 먼저 쓰고,
//   탈퇴 처리 결과는 같은 키에 덧붙인다. 키 값·회원번호는 남기지 않는다. Ray ID 로 Cloudflare 보안 기록과 맞춰 볼 수 있다.
import { kakaoAuthOk, userByIdentity, withdraw } from '../../../_account.js';
import { supabaseReady } from '../../../_commerce.js';
import { kvOf } from '../../../_store.js';

export const DIAG_PREFIX = 'diag:kakao-unlink:';
async function params(request) {
  const u = new URL(request.url), p = new URLSearchParams(u.search);
  if (request.method === 'POST') {
    try { const t = await request.text(); if (t.length < 4000) new URLSearchParams(t).forEach((v, k) => p.set(k, v)); } catch { }
  }
  return p;
}
async function note(env, key, entry) {
  const kv = kvOf(env); if (!kv) return;
  try { await kv.put(key, JSON.stringify(entry), { expirationTtl: 7 * 86400 }); } catch { }
}
async function handle({ request, env, waitUntil }) {
  const ray = (request.headers.get('cf-ray') || '').replace(/[^\w-]/g, '').slice(0, 40) || Math.random().toString(36).slice(2, 10);
  const at = new Date().toISOString(), key = DIAG_PREFIX + at + ':' + ray;
  const authOk = kakaoAuthOk(request, env);
  const p = await params(request), userId = p.get('user_id') || '', appId = p.get('app_id') || '', referrer = (p.get('referrer_type') || '').slice(0, 40);
  const base = { at, ray, method: request.method, authOk, keySet: !!env.KAKAO_ADMIN_KEY, appOk: env.KAKAO_APP_ID ? appId === String(env.KAKAO_APP_ID) : null, referrer };
  if (!authOk) { await note(env, key, { ...base, result: 'rejected-401' }); return new Response('unauthorized', { status: 401 }); }
  if (base.appOk === false) { await note(env, key, { ...base, result: 'other-app' }); return new Response('ok', { status: 200 }); }   // 다른 앱 알림은 무시
  if (!/^\d+$/.test(userId) || !supabaseReady(env)) { await note(env, key, { ...base, result: 'ignored' }); return new Response('ok', { status: 200 }); }
  await note(env, key, { ...base, result: 'received-200' });   // 응답 전에 받은 사실부터 남긴다
  const job = (async () => {
    let result = 'not-member';
    try {
      const uid = await userByIdentity(env, 'kakao', userId);
      // 카카오 쪽은 이미 끊겼으므로 다시 끊지 않는다
      if (uid) { const r = await withdraw(env, uid, { unlinkKakao: false }); result = r.ok ? 'withdrawn' : 'withdraw-failed'; console.log('[kakao-unlink]', referrer, result); }
    } catch (e) { result = 'error'; console.log('[kakao-unlink] error', String(e && e.message || e).slice(0, 120)); }
    await note(env, key, { ...base, result: 'received-200', done: result });
  })();
  if (typeof waitUntil === 'function') waitUntil(job); else await job;
  return new Response('ok', { status: 200 });
}
export const onRequestGet = handle;
export const onRequestPost = handle;
