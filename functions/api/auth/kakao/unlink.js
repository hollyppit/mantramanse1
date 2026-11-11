// GET|POST /api/auth/kakao/unlink — 카카오 '연결 해제 웹훅'. 카카오 디벨로퍼스 → 앱 → 웹훅 → 연결 해제 웹훅에 이 주소를 넣는다.
// 사용자가 카카오에서 우리 서비스 연결을 끊거나 카카오계정을 탈퇴하면 카카오가 보낸다(app_id, user_id, referrer_type).
// 확인: Authorization 이 'KakaoAK <대표 어드민 키>'(KAKAO_ADMIN_KEY)인지, app_id 가 KAKAO_APP_ID(있으면)와 같은지.
// 카카오는 3초 안에 200 을 기다리므로 바로 200 을 돌려주고 탈퇴 처리는 뒤에서 한다. 회원이 없어도 200.
import { kakaoAuthOk, userByIdentity, withdraw } from '../../../_account.js';
import { supabaseReady } from '../../../_commerce.js';

async function params(request) {
  const u = new URL(request.url), p = new URLSearchParams(u.search);
  if (request.method === 'POST') {
    try { const t = await request.text(); if (t.length < 4000) new URLSearchParams(t).forEach((v, k) => p.set(k, v)); } catch { }
  }
  return p;
}
async function handle({ request, env, waitUntil }) {
  if (!kakaoAuthOk(request, env)) return new Response('unauthorized', { status: 401 });
  const p = await params(request), userId = p.get('user_id') || '', appId = p.get('app_id') || '';
  if (env.KAKAO_APP_ID && appId !== String(env.KAKAO_APP_ID)) return new Response('ok', { status: 200 });   // 다른 앱 알림은 무시
  if (!/^\d+$/.test(userId) || !supabaseReady(env)) return new Response('ok', { status: 200 });
  const job = (async () => {
    try {
      const uid = await userByIdentity(env, 'kakao', userId);
      // 카카오 쪽은 이미 끊겼으므로 다시 끊지 않는다
      if (uid) { const r = await withdraw(env, uid, { unlinkKakao: false }); console.log('[kakao-unlink]', p.get('referrer_type') || '', r.ok ? 'withdrawn' : r.error); }
    } catch (e) { console.log('[kakao-unlink] error', String(e && e.message || e).slice(0, 120)); }
  })();
  if (typeof waitUntil === 'function') waitUntil(job); else await job;
  return new Response('ok', { status: 200 });
}
export const onRequestGet = handle;
export const onRequestPost = handle;
