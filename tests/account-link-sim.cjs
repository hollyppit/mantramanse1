// 로그인 방법 연결·회원 합치기 검증: node tests/account-link-sim.cjs
// 가짜 Supabase(Auth 관리자·verify·REST·RPC)·메모리 KV 로 functions/_account-link.js 와 /api/account/link·logins 를 실행한다. 네트워크 호출 0.
const path = require('path'), url = require('url');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const link = await imp('functions/api/account/link.js'), logins = await imp('functions/api/account/logins.js');
  const L = await imp('functions/_account-link.js');
  const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b', C = '00000000-0000-0000-0000-00000000000c', D = '00000000-0000-0000-0000-00000000000d';
  const NK = 'ab'.repeat(16);
  let users, ids, orders, ents, sajus, nlinks, glinks;
  const reset = () => {
    users = {
      [A]: { id: A, email: 'a@gmail.com', user_metadata: {}, app_metadata: { provider: 'google' } },
      [B]: { id: B, email: 'b@kakao.test', user_metadata: {}, app_metadata: { provider: 'kakao' } },
      [C]: { id: C, email: `naver-${NK}@users.mantrafortune.com`, user_metadata: { provider: 'naver', email: 'same@x.test' }, app_metadata: { provider: 'naver' } },
      [D]: { id: D, email: 'same@x.test', user_metadata: {}, app_metadata: { provider: 'google' } },
    };
    ids = [{ user_id: A, provider: 'google', provider_id: 'g1' }, { user_id: B, provider: 'kakao', provider_id: 'k1' }, { user_id: D, provider: 'google', provider_id: 'g2' }];
    orders = [{ order_id: 'oA', user_id: A }, { order_id: 'oB', user_id: B }];
    ents = [{ user_id: A, saju_key: 's1', world: 'w1', order_id: 'oA', revoked_at: null }, { user_id: B, saju_key: 's2', world: 'w2', order_id: 'oB', revoked_at: null }, { user_id: D, saju_key: 's9', world: 'w3', order_id: 'oD', revoked_at: null }];
    sajus = [{ user_id: B, saju_key: 's2', label: '홍길동', birth: {} }];
    nlinks = []; glinks = [];
  };
  reset();
  const TOK = { 'tok-a': A, 'tok-b': B, 'tok-c': C, 'tok-d': D };
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  const eqv = v => v && v.replace(/^eq\./, '');
  const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
  const store = new Map();
  const KV = { async get(k, t) { const v = store.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); } };
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(); const body = init.body ? JSON.parse(init.body) : null;
    if (u.endsWith('/auth/v1/user')) { const t = (init.headers.authorization || '').slice(7); const id = TOK[t]; return id && users[id] ? res(users[id]) : res({}, 401); }
    let m = /\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/.exec(u);
    if (m) { if (method === 'DELETE') { if (!users[m[1]]) return res({}, 404); delete users[m[1]]; ids = ids.filter(i => i.user_id !== m[1]); ents = ents.filter(e => e.user_id !== m[1]); sajus = sajus.filter(s => s.user_id !== m[1]); nlinks = nlinks.filter(l => l.user_id !== m[1]); return res({}); } return users[m[1]] ? res(users[m[1]]) : res({}, 404); }
    if (u.endsWith('/auth/v1/admin/generate_link')) { const uu = Object.values(users).find(x => x.email === body.email); return uu ? res({ hashed_token: 'h-' + uu.id }) : res({}, 404); }
    if (u.endsWith('/auth/v1/verify')) return res({ access_token: 'at-' + body.token_hash.slice(2), refresh_token: 'rt' });
    if (u.includes('/rest/v1/rpc/commerce_identities')) return res(ids.filter(i => i.user_id === body.p_user).map(i => ({ provider: i.provider, provider_id: i.provider_id })));
    if (u.includes('/rest/v1/rpc/commerce_move_identities')) { let n = 0; ids.forEach(i => { if (i.user_id === body.p_from && !ids.some(j => j.user_id === body.p_to && j.provider === i.provider)) { i.user_id = body.p_to; n++; } }); return res(n); }
    if (u.includes('/rest/v1/rpc/commerce_members_by_email')) {
      const e = body.p_email.toLowerCase();
      return res(Object.values(users).filter(x => x.email.toLowerCase() === e || (x.user_metadata.provider === 'naver' && (x.user_metadata.email || '').toLowerCase() === e))
        .map(x => ({ user_id: x.id, providers: [...new Set(ids.filter(i => i.user_id === x.id).map(i => i.provider))], naver: x.user_metadata.provider === 'naver' || nlinks.some(l => l.user_id === x.id) })));
    }
    if (u.includes('/rest/v1/member_google_links')) {
      glinks = glinks || [];
      const uid = eqv(q(u, 'user_id')); const rows = glinks.filter(l => !uid || l.user_id === uid);
      if (method === 'PATCH') { rows.forEach(l => Object.assign(l, body)); return res(null, 204); }
      return res(rows.map(l => ({ google_sub: l.google_sub, user_id: l.user_id })));
    }
    if (u.includes('/rest/v1/member_naver_links')) {
      if (method === 'POST') { for (const r of body) { const ex = nlinks.find(l => l.naver_key === r.naver_key); if (ex) ex.user_id = r.user_id; else nlinks.push({ ...r }); } return res(null, 201); }
      const uid = eqv(q(u, 'user_id')); const rows = nlinks.filter(l => !uid || l.user_id === uid);
      if (method === 'PATCH') { rows.forEach(l => Object.assign(l, body)); return res(null, 204); }
      return res(rows.map(l => ({ naver_key: l.naver_key, user_id: l.user_id })));
    }
    if (u.includes('/rest/v1/commerce_orders') && method === 'PATCH') { const uid = eqv(q(u, 'user_id')); orders.filter(o => o.user_id === uid).forEach(o => Object.assign(o, body)); return res(null, 204); }
    if (u.includes('/rest/v1/commerce_entitlements')) {
      if (method === 'POST') { for (const r of body) if (!ents.some(e => e.user_id === r.user_id && e.saju_key === r.saju_key && e.world === r.world && e.order_id === r.order_id)) ents.push({ ...r }); return res(null, 201); }
      const uid = eqv(q(u, 'user_id')); return res(ents.filter(e => e.user_id === uid && (q(u, 'revoked_at') !== 'is.null' || !e.revoked_at)));
    }
    if (u.includes('/rest/v1/member_sajus')) {
      if (method === 'POST') { for (const r of body) if (!sajus.some(s => s.user_id === r.user_id && s.saju_key === r.saju_key)) sajus.push({ ...r }); return res(null, 201); }
      const uid = eqv(q(u, 'user_id')); return res(sajus.filter(s => s.user_id === uid));
    }
    throw new Error('unexpected fetch ' + method + ' ' + u);
  };
  const env = { GLOSSARY_KV: KV, SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon' };
  const call = (mod, tok, body) => mod.onRequestPost({ request: new Request('https://x.test/api/account/x', { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { 'x-member-token': tok } : {}) }, body: JSON.stringify(body || {}) }), env });

  // ── 시작: 회원만, 알려진 로그인 방법만
  let r = await call(link, null, { action: 'start', provider: 'kakao' }); ok(r.status === 401, '비회원 연결 시작 401');
  r = await call(link, 'tok-a', { action: 'start', provider: 'facebook' }); ok(r.status === 400, '모르는 로그인 방법 거부');
  r = await call(link, 'tok-a', { action: 'start', provider: 'kakao' }); let d = await r.json(); const t1 = d.ticket;
  ok(r.status === 200 && /^[0-9a-f]{48}$/.test(t1), '연결표 발급');

  // ── 마무리: 카카오 회원 B 를 구글 회원 A 에 합침
  r = await call(link, 'tok-b', { action: 'finish', ticket: t1 }); d = await r.json();
  ok(r.status === 200 && d.ok && d.session.access_token === 'at-' + A, '합친 뒤 A 의 세션');
  ok(!users[B] && ids.find(i => i.provider_id === 'k1').user_id === A, 'B 의 카카오 로그인이 A 로, B 삭제');
  ok(orders.find(o => o.order_id === 'oB').user_id === A, 'B 의 주문이 A 로');
  ok(ents.filter(e => e.user_id === A).map(e => e.world).sort().join() === 'w1,w2', '구매 권한 합침(w1+w2)');
  ok(sajus.some(s => s.user_id === A && s.saju_key === 's2'), '저장한 사주도 A 로');
  r = await call(link, 'tok-a', { action: 'finish', ticket: t1 }); ok(r.status === 409 && (await r.json()).error === 'expired', '연결표는 한 번만');

  // ── 같은 회원으로 돌아오면(자동 연결 등) 그대로
  r = await call(link, 'tok-a', { action: 'start', provider: 'kakao' }); const t2 = (await r.json()).ticket;
  r = await call(link, 'tok-a', { action: 'finish', ticket: t2 }); d = await r.json(); ok(d.ok && d.same && !d.session, '같은 회원: same');

  // ── 양쪽에 같은 회사 로그인: 합치지 않음
  reset(); ids.push({ user_id: A, provider: 'kakao', provider_id: 'k0' });
  r = await call(link, 'tok-a', { action: 'start', provider: 'kakao' }); const t3 = (await r.json()).ticket;
  r = await call(link, 'tok-b', { action: 'finish', ticket: t3 }); d = await r.json();
  ok(r.status === 409 && d.error === 'same-provider' && d.provider === 'kakao' && users[B] && orders.find(o => o.order_id === 'oB').user_id === B, '같은 회사 로그인 충돌: 아무것도 안 바꿈');

  // ── 네이버 회원 C 를 구글 회원 A 에 합침: 네이버 연결표가 A 로
  reset();
  r = await call(link, 'tok-a', { action: 'start', provider: 'naver' }); const t4 = (await r.json()).ticket;
  r = await call(link, 'tok-c', { action: 'finish', ticket: t4 }); d = await r.json();
  ok(d.ok && !users[C] && nlinks.some(l => l.naver_key === NK && l.user_id === A), '네이버 회원 합침: 연결표 생성, C 삭제');
  r = await call(logins, 'tok-a'); d = await r.json();
  ok(d.linked.join() === 'google,naver' && d.hasPurchases, '로그인 방법 목록: 구글+네이버');

  // ── 서버 구글 로그인 회원(연결표만 있음): 로그인 방법에 구글, 합치면 연결표가 A 로
  reset(); ids = ids.filter(i => i.user_id !== A); glinks.push({ google_sub: '999999', user_id: A });
  ok(await L.loginsOf(env, users[A]).then(x => x.join()) === 'google', '연결표만 있는 구글 회원도 구글로 표시');
  r = await call(link, 'tok-b', { action: 'start', provider: 'google' }); const t5 = (await r.json()).ticket;
  r = await call(link, 'tok-a', { action: 'finish', ticket: t5 }); d = await r.json();
  ok(d.ok && !users[A] && glinks.some(l => l.google_sub === '999999' && l.user_id === B), '구글 회원을 합치면 구글 연결표도 옮김');

  // ── 안내: 구매 없는 네이버 회원 C 와 같은 이메일의 구글 회원 D(구매 있음)
  reset();
  r = await call(logins, 'tok-c'); d = await r.json();
  ok(!d.hasPurchases && d.suggest && d.suggest.provider === 'google' && d.suggest.hasPurchases === true, '같은 이메일 다른 계정 안내(구글, 구매 있음)');
  r = await call(logins, 'tok-d'); d = await r.json(); ok(d.hasPurchases && d.suggest === null, '구매 있으면 안내 안 함');
  r = await call(logins, null); ok(r.status === 401, '비회원 401');
  ok(await L.loginsOf(env, users[C]).then(x => x.join()) === 'naver', '네이버 회원 로그인 방법');
})().catch(e => ok(false, '실행 오류: ' + (e.stack || e.message))).then(() => {
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log('로그인 연결 검증 통과');
});
