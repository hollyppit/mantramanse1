// GET /api/auth/naver/callback — 네이버가 돌려보내는 주소(네이버 개발자센터에 이 주소를 등록한다).
// state 쿠키와 대조 → 코드 교환·프로필 → Supabase 세션 → 60초 보관 열쇠 쿠키 → 원래 화면(?naver_login=1|cancel|fail)
import { naverReady, getCookie, unpackState, same, cookie, STATE_COOKIE, CLAIM_COOKIE, finishLogin, withFlag } from '../../../_naver-login.js';

const go = (request, to, cookies) => { const h = new Headers({ location: new URL(to, request.url).toString(), 'cache-control': 'no-store' }); cookies.forEach(c => h.append('set-cookie', c)); return new Response(null, { status: 302, headers: h }); };

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), saved = unpackState(getCookie(request, STATE_COOKIE));
  const clear = cookie(request, STATE_COOKIE, '', 0), next = saved ? saved.next : '/report/';
  if (!naverReady(env)) return go(request, next, [clear]);
  // 동의 화면에서 취소했거나, 다른 탭·오래된 요청(state 불일치)이면 로그인하지 않는다
  if (u.searchParams.get('error')) return go(request, withFlag(next, 'cancel'), [clear]);
  const code = u.searchParams.get('code'), state = u.searchParams.get('state');
  if (!saved || !code || !same(state, saved.state)) return go(request, withFlag(next, 'fail'), [clear]);
  let key;
  try { key = await finishLogin(env, request, code, state); } catch (e) { console.log('[naver-login]', String(e && e.message || e).slice(0, 120)); return go(request, withFlag(next, 'fail'), [clear]); }
  return go(request, withFlag(next, '1'), [clear, cookie(request, CLAIM_COOKIE, key, 120)]);
}
