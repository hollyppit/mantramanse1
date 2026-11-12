// GET /api/auth/google/start?next=/report/… — 구글 로그인 화면으로 보낸다. 흐름 설명: functions/_google-login.js
import { googleReady, randomHex, packState, safeNext, cookie, STATE_COOKIE, authorizeUrl } from '../../../_google-login.js';

export async function onRequestGet({ request, env }) {
  const next = safeNext(new URL(request.url).searchParams.get('next'));
  if (!googleReady(env)) return Response.redirect(new URL(next, request.url).toString(), 302);
  const state = randomHex(16);
  return new Response(null, { status: 302, headers: { location: authorizeUrl(env, request, state), 'set-cookie': cookie(request, STATE_COOKIE, packState(state, next), 600), 'cache-control': 'no-store' } });
}
