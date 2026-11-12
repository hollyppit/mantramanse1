// 구글 로그인(서버 처리) 검증: node tests/google-login-sim.cjs
// 가짜 구글(토큰·userinfo)·가짜 Supabase(Auth 관리자·verify·REST·RPC)·메모리 KV 로 functions/api/auth/google/* 를 실행한다. 네트워크 호출 0.
const path = require('path'), url = require('url');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const G = await imp('functions/_google-login.js');
  const start = await imp('functions/api/auth/google/start.js'), cb = await imp('functions/api/auth/google/callback.js'), claim = await imp('functions/api/auth/google/claim.js');
  const store = new Map();
  const KV = { async get(k, t) { const v = store.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
  const env = { GLOSSARY_KV: KV, GOOGLE_CLIENT_ID: 'g-id', GOOGLE_CLIENT_SECRET: 'g-secret', SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon' };
  let users, identities, links, profile, calls;
  const reset = () => {
    users = { old: { id: 'old', email: 'old@gmail.com' }, kakao: { id: 'kakao', email: 'same@gmail.com' } };
    identities = [{ user_id: 'old', provider: 'google', provider_id: '111111' }];
    links = {}; calls = [];
    profile = { sub: '111111', email: 'old@gmail.com', email_verified: true, name: '예전 회원' };
  };
  reset();
  const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(); let body = null;
    try { body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : null; } catch { body = String(init.body); }
    calls.push({ u, method, body: body || String(init.body || '') });
    if (u === 'https://oauth2.googleapis.com/token') return String(init.body).includes('code=bad') ? res({ error: 'invalid_grant' }, 400) : res({ access_token: 'g-at' });
    if (u === 'https://openidconnect.googleapis.com/v1/userinfo') return res(profile);
    if (u.endsWith('/rest/v1/rpc/commerce_user_by_identity')) { const i = identities.find(x => x.provider === body.p_provider && x.provider_id === body.p_provider_id); return res(i ? i.user_id : null); }
    if (u.endsWith('/rest/v1/rpc/commerce_user_by_email')) { const x = Object.values(users).find(v => v.email.toLowerCase() === body.p_email.toLowerCase()); return res(x ? x.id : null); }
    if (u.includes('/rest/v1/member_google_links')) {
      if (method === 'POST') { for (const r of body) links[r.google_sub] = r.user_id; return res(null, 201); }
      const m = /google_sub=eq\.(\d+)/.exec(u); return res(m && links[m[1]] ? [{ user_id: links[m[1]] }] : []);
    }
    if (u.endsWith('/auth/v1/admin/users') && method === 'POST') { if (Object.values(users).some(v => v.email === body.email)) return res({ msg: 'exists' }, 422); const id = 'new' + Object.keys(users).length; users[id] = { id, email: body.email, user_metadata: body.user_metadata }; return res(users[id]); }
    const m = /\/auth\/v1\/admin\/users\/([\w-]+)$/.exec(u); if (m) return users[m[1]] ? res(users[m[1]]) : res({}, 404);
    if (u.endsWith('/auth/v1/admin/generate_link')) { const x = Object.values(users).find(v => v.email === body.email); return x ? res({ hashed_token: 'h-' + x.id }) : res({}, 404); }
    if (u.endsWith('/auth/v1/verify')) return res({ access_token: 'at-' + body.token_hash.slice(2), refresh_token: 'rt' });
    throw new Error('unexpected fetch ' + method + ' ' + u);
  };
  const B = 'https://mantrafortune.com';
  const get = (mod, u, cookie) => mod.onRequestGet({ request: new Request(B + u, { headers: cookie ? { cookie } : {} }), env });
  const cookieOf = (r, name) => { const all = r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || '']; return (all.find(x => x.startsWith(name + '=')) || ''); };
  const cl = c => claim.onRequestPost({ request: new Request(B + '/api/auth/google/claim', { method: 'POST', headers: c ? { cookie: c } : {} }), env });
  async function login(code = 'c1') {
    const s = await get(start, '/api/auth/google/start?next=' + encodeURIComponent('/report/v2/?world=w1#/timeline'));
    const loc = new URL(s.headers.get('location')), sc = cookieOf(s, G.STATE_COOKIE).split(';')[0];
    const r = await get(cb, '/api/auth/google/callback?code=' + code + '&state=' + loc.searchParams.get('state'), sc);
    const ck = cookieOf(r, G.CLAIM_COOKIE).split(';')[0];
    const tokens = ck ? await (await cl(ck)).json() : null;
    return { start: s, loc, back: r.headers.get('location'), tokens, ck };
  }

  // ── 시작: 구글 동의 화면, 돌아올 곳은 우리 주소
  let x = await login();
  ok(x.loc.origin === 'https://accounts.google.com' && x.loc.searchParams.get('redirect_uri') === B + '/api/auth/google/callback' && x.loc.searchParams.get('client_id') === 'g-id' && x.loc.searchParams.get('scope') === 'openid email profile' && !x.loc.toString().includes('g-secret'), '구글 동의 화면 주소(우리 도메인으로 돌아옴)');
  ok(/Path=\/api\/auth\/google/.test(cookieOf(x.start, G.STATE_COOKIE)) && /HttpOnly/.test(cookieOf(x.start, G.STATE_COOKIE)), 'state 쿠키');
  // ① 예전 Supabase 구글 회원: 그대로 같은 회원
  ok(x.back === B + '/report/v2/?world=w1&google_login=1#/timeline' && x.tokens.access_token === 'at-old' && !calls.some(c => c.u.endsWith('/admin/users') && c.method === 'POST'), '예전 구글 회원은 같은 회원으로(새로 안 만듦)');
  r = await cl(x.ck); ok(r.status === 404, '세션은 한 번만');
  // ② 연결표
  reset(); profile = { sub: '222222', email: 'x@gmail.com', email_verified: true }; links['222222'] = 'kakao';
  x = await login(); ok(x.tokens.access_token === 'at-kakao', '연결된 구글 계정: 연결된 회원으로');
  // ③ 같은 인증 이메일의 회원(카카오로 가입): 연결표에 적고 그 회원으로
  reset(); profile = { sub: '333333', email: 'same@gmail.com', email_verified: true };
  x = await login(); ok(x.tokens.access_token === 'at-kakao' && links['333333'] === 'kakao', '같은 인증 이메일: 기존 회원에 연결');
  // ④ 새 회원
  reset(); profile = { sub: '444444', email: 'brandnew@gmail.com', email_verified: true, name: '새 회원' };
  x = await login(); const nu = Object.values(users).find(v => v.email === 'brandnew@gmail.com');
  ok(nu && x.tokens.access_token === 'at-' + nu.id && links['444444'] === nu.id && nu.user_metadata.provider === 'google', '새 구글 회원 생성·연결');
  x = await login(); ok(x.tokens.access_token === 'at-' + nu.id && Object.values(users).filter(v => v.email === 'brandnew@gmail.com').length === 1, '두 번째 로그인은 같은 회원');
  // 인증 안 된 이메일은 이메일로 합치지 않음(새 회원도 만들지 않고 실패)
  reset(); profile = { sub: '555555', email: 'same@gmail.com', email_verified: false };
  x = await login(); ok(/google_login=fail/.test(x.back) && !links['555555'], '인증 안 된 이메일: 실패(남의 회원에 붙지 않음)');
  // 코드 교환 실패·state 불일치
  reset(); x = await login('bad'); ok(/google_login=fail/.test(x.back) && !x.ck, '코드 교환 실패: 실패 표시');
  const s = await get(start, '/api/auth/google/start?next=/report/my/'); const sc = cookieOf(s, G.STATE_COOKIE).split(';')[0];
  var r = await get(cb, '/api/auth/google/callback?code=c1&state=' + 'f'.repeat(32), sc); ok(/google_login=fail/.test(r.headers.get('location')), 'state 불일치: 실패');
  r = await get(cb, '/api/auth/google/callback?error=access_denied&state=x', sc); ok(/google_login=cancel/.test(r.headers.get('location')), '동의 취소: cancel');
  r = await start.onRequestGet({ request: new Request(B + '/api/auth/google/start?next=/report/my/'), env: {} }); ok(r.headers.get('location') === B + '/report/my/', '설정 없으면 원래 화면으로');
})().catch(e => ok(false, '실행 오류: ' + (e.stack || e.message))).then(() => {
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log('구글 로그인 검증 통과');
});
