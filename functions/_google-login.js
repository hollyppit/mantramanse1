// 구글 로그인 → Supabase 회원 세션(우리 서버가 처리). 테이블: supabase/migrations/20261112_google_links.sql
// 왜: Supabase 기본 구글 로그인은 Supabase 주소(…supabase.co)로 돌아와서 구글 브랜드 인증(승인된 도메인 소유 확인)을 받을 수 없다.
//     이 흐름은 mantrafortune.com 으로만 돌아오므로 승인된 도메인을 mantrafortune.com 하나로 둘 수 있다.
//
// 흐름: /api/auth/google/start → 구글 동의 → /api/auth/google/callback(코드 교환·id 확인·회원 찾기/만들기·세션)
//       → 세션을 KV 에 60초 보관, 같은 브라우저 쿠키로만 꺼냄 → 원래 화면(?google_login=1) → POST /api/auth/google/claim → setSession
// 회원 찾기 순서: ① 예전 Supabase 구글 로그인 회원(auth.identities google=sub) ② 연결표(member_google_links) ③ 같은 '인증된' 이메일 회원(구글 이메일은
//   구글이 인증한 주소만 받는다: Supabase 의 인증 이메일 자동 연결과 같은 규칙) ④ 없으면 새 회원. ②~④ 는 연결표에 sub 를 적어 다음부터 바로 찾는다.
// 환경변수: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET(비밀) + SUPABASE_URL·SUPABASE_SERVICE_KEY·SUPABASE_ANON_KEY
import { kvOf } from './_store.js';
import { randomHex, same, getCookie, safeNext, packState, unpackState, sessionForEmail } from './_naver-login.js';
import { sbRest } from './_commerce.js';

export const googleReady = env => !!(env && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY && env.SUPABASE_ANON_KEY);
export const STATE_COOKIE = 'mt_google_state', CLAIM_COOKIE = 'mt_google_claim', COOKIE_PATH = '/api/auth/google';
export const callbackUrl = request => new URL(request.url).origin + '/api/auth/google/callback';
export const cookie = (request, name, value, maxAge) => `${name}=${value}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
export { getCookie, same, safeNext, packState, unpackState, randomHex };
export function withFlag(next, value) {
  const h = next.indexOf('#'), path = h < 0 ? next : next.slice(0, h), hash = h < 0 ? '' : next.slice(h);
  const u = new URL(path, 'https://x.invalid'); u.searchParams.set('google_login', value);
  return u.pathname + u.search + hash;
}
export function authorizeUrl(env, request, state) {
  const q = new URLSearchParams({ response_type: 'code', client_id: env.GOOGLE_CLIENT_ID, redirect_uri: callbackUrl(request), scope: 'openid email profile', state, prompt: 'select_account' });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q;
}

// 코드 교환 → 구글 사용자 정보(sub·이메일·인증 여부·이름). id_token 을 직접 검증하지 않고 받은 access_token 으로 userinfo 를 묻는다
async function googleProfile(env, request, code) {
  const t = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: callbackUrl(request), grant_type: 'authorization_code' }), signal: AbortSignal.timeout(10000) });
  const tj = await t.json().catch(() => null);
  if (!t.ok || !tj || !tj.access_token) throw new Error('google-token:' + ((tj && tj.error) || t.status));
  const p = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: 'Bearer ' + tj.access_token }, signal: AbortSignal.timeout(10000) });
  const pj = await p.json().catch(() => null);
  if (!p.ok || !pj || typeof pj.sub !== 'string' || !/^[0-9]{5,40}$/.test(pj.sub)) throw new Error('google-profile:' + p.status);
  return { sub: pj.sub, email: typeof pj.email === 'string' ? pj.email.slice(0, 200) : '', verified: pj.email_verified === true, name: String(pj.name || '').slice(0, 60), picture: typeof pj.picture === 'string' ? pj.picture.slice(0, 300) : null };
}

const sbBase = env => String(env.SUPABASE_URL).replace(/\/+$/, '');
const authAdmin = (env, path, init = {}) => fetch(sbBase(env) + '/auth/v1/admin/' + path, { ...init, headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'content-type': 'application/json' }, signal: AbortSignal.timeout(10000) });
async function emailOfUser(env, id) { const r = await authAdmin(env, 'users/' + encodeURIComponent(id)); const u = r.ok ? await r.json().catch(() => null) : null; return u && u.email ? u.email : null; }
const link = (env, sub, userId) => sbRest(env, 'member_google_links?on_conflict=google_sub', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ google_sub: sub, user_id: userId }]) });

// 구글 회원 → 이 사람의 회원 id(없으면 새로 만든다)
export async function memberForGoogle(env, prof) {
  const viaIdentity = await sbRest(env, 'rpc/commerce_user_by_identity', { method: 'POST', body: JSON.stringify({ p_provider: 'google', p_provider_id: prof.sub }) });
  if (typeof viaIdentity === 'string' && viaIdentity) return viaIdentity;   // ① 예전 Supabase 구글 로그인 회원
  const rows = (await sbRest(env, `member_google_links?select=user_id&google_sub=eq.${prof.sub}`)) || [];
  if (rows.length) return rows[0].user_id;                                  // ② 연결표
  if (!prof.email || !prof.verified) throw new Error('google-email-unverified');
  const byEmail = await sbRest(env, 'rpc/commerce_user_by_email', { method: 'POST', body: JSON.stringify({ p_email: prof.email }) });
  if (typeof byEmail === 'string' && byEmail) { await link(env, prof.sub, byEmail); return byEmail; }   // ③ 같은 인증 이메일
  const c = await authAdmin(env, 'users', { method: 'POST', body: JSON.stringify({ email: prof.email, email_confirm: true, user_metadata: { provider: 'google', name: prof.name || null, avatar_url: prof.picture }, app_metadata: { provider: 'google', providers: ['google'] } }) });
  const cj = await c.json().catch(() => null);
  if (!c.ok || !cj || !cj.id) throw new Error('supabase-create:' + c.status);
  await link(env, prof.sub, cj.id);                                          // ④ 새 회원
  return cj.id;
}

export async function finishLogin(env, request, code) {
  const prof = await googleProfile(env, request, code);
  const userId = await memberForGoogle(env, prof);
  const email = await emailOfUser(env, userId); if (!email) throw new Error('member-email-missing');
  const session = await sessionForEmail(env, email);
  const key = randomHex(24);
  const kv = kvOf(env); if (!kv) throw new Error('kv-missing');
  await kv.put('googlelogin:' + key, JSON.stringify(session), { expirationTtl: 60 });
  return key;
}
export async function claimSession(env, key) {
  if (!/^[0-9a-f]{48}$/.test(key || '')) return null;
  const kv = kvOf(env); if (!kv) return null;
  const v = await kv.get('googlelogin:' + key, 'json');
  if (v) await kv.delete('googlelogin:' + key);
  return v && v.access_token ? v : null;
}
