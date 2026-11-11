// 네이버 로그인 검증: node tests/naver-login-sim.cjs
// 가짜 네이버(토큰·프로필)·가짜 Supabase(Auth 관리자·verify)·메모리 KV 로 functions/api/auth/naver/* 를 실행한다. 네트워크 호출 0.
const path = require('path'), url = require('url');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const N = await imp('functions/_naver-login.js');
  const start = await imp('functions/api/auth/naver/start.js'), cb = await imp('functions/api/auth/naver/callback.js'), claim = await imp('functions/api/auth/naver/claim.js');
  const C = await imp('functions/_commerce.js');
  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v, o) { store.set(k, v); store.set('__ttl:' + k, o && o.expirationTtl); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
  const env = { GLOSSARY_KV: KV, NAVER_CLIENT_ID: 'nv-id', NAVER_CLIENT_SECRET: 'nv-secret', SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon' };
  let calls = [], mode = { token: 'ok', create: 200 };
  const res = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
  global.fetch = async (u, init = {}) => {
    u = String(u); const body = init.body ? JSON.parse(init.body) : null; calls.push({ u, body, headers: init.headers || {} });
    if (u.startsWith('https://nid.naver.com/oauth2.0/token')) return mode.token === 'ok' ? res({ access_token: 'nv-at', token_type: 'bearer' }) : res({ error: 'invalid_request' });
    if (u === 'https://openapi.naver.com/v1/nid/me') return res({ resultcode: '00', response: { id: 'NAVER_UID_123', email: 'buyer@naver.com', nickname: '구매자' } });
    if (u === 'https://sb.test/auth/v1/admin/users') return mode.create === 200 ? res({ id: 'u1' }) : res({ msg: 'already registered' }, mode.create);
    if (u === 'https://sb.test/auth/v1/admin/generate_link') return res({ id: 'u1', hashed_token: 'hash-abc', action_link: 'x' });
    if (u === 'https://sb.test/auth/v1/verify') return body && body.token_hash === 'hash-abc' ? res({ access_token: 'sb-at', refresh_token: 'sb-rt', user: { id: 'u1' } }) : res({ msg: 'bad' }, 400);
    if (u === 'https://sb.test/auth/v1/user') return res({ id: 'u1', email: 'naver-x@users.mantrafortune.com', user_metadata: { provider: 'naver', email: 'buyer@naver.com' }, app_metadata: { provider: 'email' } });
    throw new Error('unexpected fetch ' + u);
  };
  const B = 'https://mantrafortune.com';
  const get = (mod, u, cookie) => mod.onRequestGet({ request: new Request(B + u, { headers: cookie ? { cookie } : {} }), env });
  const cookieOf = (r, name) => { const all = r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || '']; const c = all.find(x => x.startsWith(name + '=')); return c || ''; };

  // ── 시작: 네이버 동의 화면으로, state 쿠키(HttpOnly·Secure·Lax·/api/auth/naver)
  let r = await get(start, '/api/auth/naver/start?next=' + encodeURIComponent('/report/v2/?world=w2#/timeline'));
  const loc = new URL(r.headers.get('location')), sc = cookieOf(r, N.STATE_COOKIE);
  ok(r.status === 302 && loc.origin === 'https://nid.naver.com' && loc.searchParams.get('client_id') === 'nv-id' && loc.searchParams.get('redirect_uri') === B + '/api/auth/naver/callback' && /^[0-9a-f]{32}$/.test(loc.searchParams.get('state')), '시작: 네이버 동의 화면 주소');
  ok(/HttpOnly/.test(sc) && /Secure/.test(sc) && /SameSite=Lax/.test(sc) && /Path=\/api\/auth\/naver/.test(sc) && !loc.toString().includes('nv-secret'), '시작: state 쿠키 속성·시크릿 비노출');
  const stateCookie = sc.split(';')[0], state = loc.searchParams.get('state');
  for (const bad of ['https://evil.com/report/', '//evil.com', '/admin', '/report\\x']) { r = await get(start, '/api/auth/naver/start?next=' + encodeURIComponent(bad)); ok(N.unpackState(cookieOf(r, N.STATE_COOKIE).split(';')[0].split('=')[1]).next === '/report/', '돌아갈 주소는 /report/ 아래만: ' + bad); }
  r = await start.onRequestGet({ request: new Request(B + '/api/auth/naver/start?next=/report/my/'), env: {} }); ok(r.status === 302 && r.headers.get('location') === B + '/report/my/', '설정 없으면 원래 화면으로');

  // ── 돌아오기: state 대조
  r = await get(cb, '/api/auth/naver/callback?code=c1&state=' + state); ok(new URL(r.headers.get('location')).searchParams.get('naver_login') === 'fail' && !cookieOf(r, N.CLAIM_COOKIE), '쿠키 없는 돌아오기: 실패');
  r = await get(cb, '/api/auth/naver/callback?code=c1&state=' + 'f'.repeat(32), stateCookie); ok(new URL(r.headers.get('location')).searchParams.get('naver_login') === 'fail', 'state 불일치: 실패');
  r = await get(cb, '/api/auth/naver/callback?error=access_denied&state=' + state, stateCookie); ok(new URL(r.headers.get('location')).searchParams.get('naver_login') === 'cancel', '동의 취소: cancel');
  mode.token = 'bad'; r = await get(cb, '/api/auth/naver/callback?code=c1&state=' + state, stateCookie); ok(new URL(r.headers.get('location')).searchParams.get('naver_login') === 'fail', '네이버 토큰 실패: fail'); mode.token = 'ok';

  // ── 성공: Supabase 회원(내부 주소)·세션 → 60초 보관·열쇠 쿠키 → 원래 화면(해시 경로 유지)
  calls = [];
  r = await get(cb, '/api/auth/naver/callback?code=c1&state=' + state, stateCookie);
  const back = r.headers.get('location'), claimCookie = cookieOf(r, N.CLAIM_COOKIE);
  ok(r.status === 302 && back === B + '/report/v2/?world=w2&naver_login=1#/timeline', '성공: 원래 화면 + naver_login=1, 해시 경로 유지 (' + back + ')');
  ok(/HttpOnly/.test(claimCookie) && /Max-Age=120/.test(claimCookie) && !back.includes('sb-at'), '세션은 주소에 싣지 않고 열쇠 쿠키로');
  const created = calls.find(c => c.u.endsWith('/admin/users')), email = await N.internalEmail('NAVER_UID_123');
  ok(created && created.body.email === email && /^naver-[0-9a-f]{32}@users\.mantrafortune\.com$/.test(email) && !email.includes('NAVER_UID_123') && created.body.user_metadata.email === 'buyer@naver.com' && created.body.email_confirm === true, '내부 주소로 회원 생성(네이버 이메일로 합치지 않음)');
  ok(calls.find(c => c.u.endsWith('/token?') || c.u.includes('/oauth2.0/token')).u.includes('redirect_uri=' + encodeURIComponent(B + '/api/auth/naver/callback')), '토큰 교환에 같은 돌아오기 주소');
  const keyName = [...store.keys()].find(k => k.startsWith('naverlogin:'));
  ok(keyName && store.get('__ttl:' + keyName) === 60, '세션 60초 보관');

  // ── 세션 받아 가기: 같은 쿠키로 한 번만
  const cl = c => claim.onRequestPost({ request: new Request(B + '/api/auth/naver/claim', { method: 'POST', headers: c ? { cookie: c } : {} }), env });
  r = await cl(); ok(r.status === 404, '열쇠 쿠키 없으면 404');
  r = await cl(N.CLAIM_COOKIE + '=' + 'a'.repeat(48)); ok(r.status === 404, '틀린 열쇠 404');
  r = await cl(claimCookie.split(';')[0]); const d = await r.json();
  ok(r.status === 200 && d.access_token === 'sb-at' && d.refresh_token === 'sb-rt' && r.headers.get('cache-control') === 'no-store', '같은 브라우저: 세션 받음');
  r = await cl(claimCookie.split(';')[0]); ok(r.status === 404, '두 번째는 없음(한 번만)');

  // ── 이미 있는 회원(422)도 로그인
  mode.create = 422; r = await get(cb, '/api/auth/naver/callback?code=c2&state=' + state, stateCookie); ok(new URL(r.headers.get('location')).searchParams.get('naver_login') === '1', '이미 있는 네이버 회원도 로그인'); mode.create = 200;

  // ── 결제 쪽 회원 표시: 내부 주소 대신 네이버 이메일
  const m = await C.memberOf(new Request(B + '/', { headers: { 'x-member-token': 'sb-at' } }), env);
  ok(m && m.id === 'u1' && m.email === 'buyer@naver.com' && m.provider === 'naver', '구매 화면 회원 표시: 네이버 이메일');
  ok(N.withFlag('/report/', '1') === '/report/?naver_login=1' && N.withFlag('/report/v2/?a=1#/x?y', 'fail') === '/report/v2/?a=1&naver_login=fail#/x?y', '주소에 표시 붙이기');
})().catch(e => ok(false, '실행 오류: ' + (e.stack || e.message))).then(() => {
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log('네이버 로그인 검증 통과');
});
