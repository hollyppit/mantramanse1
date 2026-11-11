// POST /api/auth/naver/claim — 네이버 로그인 직후 같은 브라우저가 세션을 한 번 받아 간다(쿠키 열쇠, 60초, 한 번만).
import { json } from '../../../_lib.js';
import { getCookie, cookie, CLAIM_COOKIE, claimSession } from '../../../_naver-login.js';

export async function onRequestPost({ request, env }) {
  const key = getCookie(request, CLAIM_COOKIE);
  const s = key ? await claimSession(env, key).catch(() => null) : null;
  const r = json(s ? { access_token: s.access_token, refresh_token: s.refresh_token } : { error: 'no-session' }, s ? 200 : 404);
  r.headers.set('cache-control', 'no-store');
  if (s) r.headers.append('set-cookie', cookie(request, CLAIM_COOKIE, '', 0));
  return r;
}
