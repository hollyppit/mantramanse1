// 네이버 로그인 → Supabase 회원 세션. Supabase 에는 네이버 로그인이 없어서 서버가 대신 처리한다.
//
// 흐름: /api/auth/naver/start → 네이버 동의 화면 → /api/auth/naver/callback(코드 교환·프로필 확인·Supabase 세션 발급)
//       → 세션을 KV 에 60초 보관하고 같은 브라우저 쿠키로만 꺼낼 수 있게 한 뒤 원래 화면(?naver_login=1)으로 돌려보낸다
//       → 화면이 POST /api/auth/naver/claim 으로 세션을 받아 supabase.auth.setSession 한다(주소에 토큰을 싣지 않는다).
//
// 계정: 네이버 고유 id 마다 Supabase 회원 하나. 이메일은 'naver-<id 해시>@users.mantrafortune.com' 이라는 내부 주소로 만들고
//       다른 로그인(카카오·구글)과 이메일로 합치지 않는다(네이버 프로필 이메일은 인증된 주소라는 보장이 없어 계정 탈취를 막는다).
//       네이버가 준 이메일·이름은 user_metadata 에만 둔다(구매 내역 화면 표시용).
//
// 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET(서버 전용) + SUPABASE_URL·SUPABASE_SERVICE_KEY·SUPABASE_ANON_KEY
import { kvOf } from './_store.js';

export const naverReady = env => !!(env && env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY && env.SUPABASE_ANON_KEY);
export const STATE_COOKIE = 'mt_naver_state', CLAIM_COOKIE = 'mt_naver_claim', COOKIE_PATH = '/api/auth/naver';
export const callbackUrl = request => new URL(request.url).origin + '/api/auth/naver/callback';
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
export const same = (a, b) => { a = String(a || ''); b = String(b || ''); if (!a || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
export const getCookie = (req, name) => { const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)')); return m ? m[1] : ''; };
export const cookie = (request, name, value, maxAge) => `${name}=${value}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
// 돌아갈 주소: 같은 사이트의 /report/ 아래 경로만(외부 주소로 보내는 열린 리디렉션 방지)
export const safeNext = n => (typeof n === 'string' && /^\/report(\/|$)/.test(n) && !/[\\\r\n]/.test(n) && !n.startsWith('//')) ? n.slice(0, 800) : '/report/';
export const packState = (state, next) => state + '.' + b64u(next);
export function unpackState(v) { const i = String(v || '').indexOf('.'); if (i < 0) return null; try { return { state: v.slice(0, i), next: safeNext(unb64u(v.slice(i + 1))) }; } catch { return null; } }
// 원래 화면 주소에 naver_login=<결과> 를 붙인다(해시 경로 #/… 는 그대로 둔다)
export function withFlag(next, value) {
  const h = next.indexOf('#'), path = h < 0 ? next : next.slice(0, h), hash = h < 0 ? '' : next.slice(h);
  const u = new URL(path, 'https://x.invalid'); u.searchParams.set('naver_login', value);
  return u.pathname + u.search + hash;
}

export function authorizeUrl(env, request, state) {
  const q = new URLSearchParams({ response_type: 'code', client_id: env.NAVER_CLIENT_ID, redirect_uri: callbackUrl(request), state });
  return 'https://nid.naver.com/oauth2.0/authorize?' + q;
}

async function naverProfile(env, request, code, state) {
  const q = new URLSearchParams({ grant_type: 'authorization_code', client_id: env.NAVER_CLIENT_ID, client_secret: env.NAVER_CLIENT_SECRET, code, state, redirect_uri: callbackUrl(request) });
  const t = await fetch('https://nid.naver.com/oauth2.0/token?' + q, { signal: AbortSignal.timeout(10000) });
  const tj = await t.json().catch(() => null);
  if (!t.ok || !tj || !tj.access_token) throw new Error('naver-token:' + ((tj && tj.error) || t.status));
  const p = await fetch('https://openapi.naver.com/v1/nid/me', { headers: { authorization: 'Bearer ' + tj.access_token }, signal: AbortSignal.timeout(10000) });
  const pj = await p.json().catch(() => null);
  const r = pj && pj.response;
  if (!p.ok || !r || typeof r.id !== 'string' || !r.id) throw new Error('naver-profile:' + ((pj && pj.resultcode) || p.status));
  return { id: r.id, email: typeof r.email === 'string' ? r.email.slice(0, 200) : '', name: String(r.nickname || r.name || '').slice(0, 60) };
}

const sbBase = env => String(env.SUPABASE_URL).replace(/\/+$/, '');
const admin = (env, path, body) => fetch(sbBase(env) + '/auth/v1/admin/' + path, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
export const internalEmail = async naverId => 'naver-' + (await sha('naver:v1:' + naverId)).slice(0, 32) + '@users.mantrafortune.com';

// 네이버 회원 → Supabase 세션 { access_token, refresh_token }
export async function supabaseSession(env, profile) {
  const email = await internalEmail(profile.id);
  const meta = { provider: 'naver', email: profile.email || null, name: profile.name || null };
  const c = await admin(env, 'users', { email, email_confirm: true, user_metadata: meta, app_metadata: { provider: 'naver', providers: ['naver'] } });
  if (!c.ok && c.status !== 422 && c.status !== 400) throw new Error('supabase-create:' + c.status);   // 422/400: 이미 있는 회원
  return sessionForEmail(env, email);
}
// 이미 있는 회원의 이메일로 세션을 만든다(메일은 보내지 않는다). 네이버 로그인·로그인 방법 연결 공용
export async function sessionForEmail(env, email) {
  const g = await admin(env, 'generate_link', { type: 'magiclink', email });
  const gj = await g.json().catch(() => null);
  const hashed = gj && (gj.hashed_token || (gj.properties && gj.properties.hashed_token));
  if (!g.ok || !hashed) throw new Error('supabase-link:' + g.status);
  // 링크를 메일로 보내지 않고 서버가 바로 확인해 세션을 받는다
  const v = await fetch(sbBase(env) + '/auth/v1/verify', { method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'magiclink', token_hash: hashed }), signal: AbortSignal.timeout(10000) });
  const vj = await v.json().catch(() => null);
  if (!v.ok || !vj || !vj.access_token || !vj.refresh_token) throw new Error('supabase-verify:' + v.status);
  return { access_token: vj.access_token, refresh_token: vj.refresh_token };
}

// 네이버 회원 키(내부 주소의 해시 부분): 로그인 방법 연결표(member_naver_links)의 열쇠
export const naverKeyOf = async naverId => (await internalEmail(naverId)).slice(6, 38);
// 이 네이버 계정이 다른 회원(카카오·구글로 가입한 회원)에 연결돼 있으면 그 회원의 이메일
async function linkedEmail(env, naverId) {
  const key = await naverKeyOf(naverId);
  const r = await fetch(sbBase(env) + '/rest/v1/member_naver_links?select=user_id&naver_key=eq.' + key, { headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }, signal: AbortSignal.timeout(8000) });
  const rows = r.ok ? await r.json().catch(() => []) : [];
  if (!rows.length) return null;
  const u = await fetch(sbBase(env) + '/auth/v1/admin/users/' + rows[0].user_id, { headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }, signal: AbortSignal.timeout(8000) });
  const uj = u.ok ? await u.json().catch(() => null) : null;
  return uj && uj.email ? uj.email : null;
}
export async function finishLogin(env, request, code, state) {
  const profile = await naverProfile(env, request, code, state);
  // 연결된 회원이 있으면 그 회원으로, 없으면 네이버 회원(없으면 새로 만든다)으로 들어간다
  const linked = await linkedEmail(env, profile.id);
  const session = linked ? await sessionForEmail(env, linked) : await supabaseSession(env, profile);
  const key = randomHex(24);
  const kv = kvOf(env); if (!kv) throw new Error('kv-missing');
  await kv.put('naverlogin:' + key, JSON.stringify(session), { expirationTtl: 60 });
  return key;
}
export async function claimSession(env, key) {
  if (!/^[0-9a-f]{48}$/.test(key || '')) return null;
  const kv = kvOf(env); if (!kv) return null;
  const v = await kv.get('naverlogin:' + key, 'json');
  if (v) await kv.delete('naverlogin:' + key);
  return v && v.access_token ? v : null;
}
