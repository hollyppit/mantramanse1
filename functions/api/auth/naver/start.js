// GET /api/auth/naver/start?next=/report/… — 네이버 로그인 화면으로 보낸다. 흐름 설명: functions/_naver-login.js
import { naverReady, randomHex, packState, safeNext, cookie, STATE_COOKIE, authorizeUrl } from '../../../_naver-login.js';

export async function onRequestGet({ request, env }) {
  const next = safeNext(new URL(request.url).searchParams.get('next'));
  if (!naverReady(env)) return Response.redirect(new URL(next, request.url).toString(), 302);
  const state = randomHex(16);
  return new Response(null, { status: 302, headers: { location: authorizeUrl(env, request, state), 'set-cookie': cookie(request, STATE_COOKIE, packState(state, next), 600), 'cache-control': 'no-store' } });
}
