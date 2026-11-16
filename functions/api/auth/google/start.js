// GET /api/auth/google/start?next=/report/… — 구글 로그인 화면으로 보낸다. 흐름 설명: functions/_google-login.js
import { googleReady, randomHex, packState, safeNext, cookie, STATE_COOKIE, authorizeUrl, canonicalStart } from '../../../_google-login.js';

export async function onRequestGet({ request, env }) {
  const next = safeNext(new URL(request.url).searchParams.get('next'));
  if (!googleReady(env)) return Response.redirect(new URL(next, request.url).toString(), 302);
  const go = canonicalStart(request, env, next); if (go) return new Response(null, { status: 302, headers: { location: go, 'cache-control': 'no-store' } });   // 다른 주소면 대표 주소에서 다시 시작
  const state = randomHex(16);
  return new Response(null, { status: 302, headers: { location: authorizeUrl(env, request, state), 'set-cookie': cookie(request, STATE_COOKIE, packState(state, next), 600), 'cache-control': 'no-store' } });
}
