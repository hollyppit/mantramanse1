// 회원 탈퇴·카카오 연결 해제 알림 검증: node tests/account-sim.cjs
// 가짜 Supabase(Auth·REST·RPC)·가짜 카카오로 functions/_account.js, /api/account/withdraw, /api/auth/kakao/unlink 를 실행한다. 네트워크 호출 0.
const path = require('path'), url = require('url');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const A = await imp('functions/_account.js');
  const wd = await imp('functions/api/account/withdraw.js'), unlink = await imp('functions/api/auth/kakao/unlink.js');
  const UA = '00000000-0000-0000-0000-00000000000a', UB = '00000000-0000-0000-0000-00000000000b';
  let db, users, ids, kakaoCalls;
  const reset = () => {
    users = { [UA]: { id: UA, email: 'a@x.test' }, [UB]: { id: UB, email: 'b@x.test' } };
    ids = [{ user_id: UA, provider: 'kakao', provider_id: '4242' }, { user_id: UB, provider: 'google', provider_id: 'g-1' }];
    db = { orders: [
      { order_id: 'mto1', user_id: UA, status: 'paid', amount: 7800 }, { order_id: 'mto2', user_id: UA, status: 'pending', amount: 7800 },
      { order_id: 'mto3', user_id: UB, status: 'paid', amount: 7800 } ],
      ent: [{ user_id: UA, world: 'w2' }, { user_id: UB, world: 'w2' }], sajus: [{ user_id: UA }] };
    kakaoCalls = [];
  };
  reset();
  const TOK = { 'tok-a': UA, 'tok-b': UB };
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(); let body = null;
    try { body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
    if (u.endsWith('/auth/v1/user')) { const t = (init.headers.authorization || '').slice(7); return TOK[t] && users[TOK[t]] ? res(users[TOK[t]]) : res({ msg: 'bad' }, 401); }
    if (u.includes('/rest/v1/rpc/commerce_identities')) return res(ids.filter(i => i.user_id === body.p_user).map(i => ({ provider: i.provider, provider_id: i.provider_id })));
    if (u.includes('/rest/v1/rpc/commerce_user_by_identity')) { const i = ids.find(x => x.provider === body.p_provider && x.provider_id === body.p_provider_id); return res(i ? i.user_id : null); }
    if (u.includes('/rest/v1/commerce_orders') && method === 'PATCH') {
      const uid = (q(u, 'user_id') || '').replace('eq.', ''), st = q(u, 'status');
      const rows = db.orders.filter(o => o.user_id === uid && (!st || o.status === st.replace('eq.', '')));
      rows.forEach(o => Object.assign(o, body));
      return (init.headers.prefer || '').includes('representation') ? res(rows) : res(null, 204);
    }
    const m = /\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/.exec(u);
    if (m && method === 'DELETE') {
      if (!users[m[1]]) return res({ msg: 'not found' }, 404);
      // 테이블 규칙: 주문 user_id 는 set null(이미 비웠음), 권한·저장 사주는 cascade
      if (db.orders.some(o => o.user_id === m[1])) return res({ msg: 'fk' }, 500);
      delete users[m[1]]; ids = ids.filter(i => i.user_id !== m[1]); db.ent = db.ent.filter(e => e.user_id !== m[1]); db.sajus = db.sajus.filter(s => s.user_id !== m[1]);
      return res({});
    }
    if (u === 'https://kapi.kakao.com/v1/user/unlink') { kakaoCalls.push({ auth: init.headers.authorization, body: String(init.body) }); return res({ id: 4242 }); }
    throw new Error('unexpected fetch ' + method + ' ' + u);
  };
  const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', KAKAO_ADMIN_KEY: 'kadmin', KAKAO_APP_ID: '1646155' };
  const post = (tok, body) => wd.onRequestPost({ request: new Request('https://x.test/api/account/withdraw', { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { 'x-member-token': tok } : {}) }, body: JSON.stringify(body || {}) }), env });

  // ── 직접 탈퇴
  let r = await post(null, { confirm: '탈퇴' }); ok(r.status === 401, '비회원 탈퇴 401');
  r = await post('tok-a', {}); ok(r.status === 400 && users[UA], '확인 문구 없으면 거부');
  r = await post('tok-a', { confirm: '탈퇴' }); let d = await r.json();
  ok(r.status === 200 && d.ok && d.orders === 2, '탈퇴 성공: 주문 2건 분리');
  ok(!users[UA] && !db.ent.some(e => e.user_id === UA) && !db.sajus.length, '회원·구매 권한·저장 사주 삭제');
  const o1 = db.orders.find(o => o.order_id === 'mto1'), o2 = db.orders.find(o => o.order_id === 'mto2');
  ok(o1.user_id === null && o1.status === 'paid' && o1.withdrawn_at && o2.status === 'failed' && o2.failure === 'withdrawn', '주문 기록은 남기고 회원 연결만 끊음(대기 주문은 닫음)');
  ok(kakaoCalls.length === 1 && kakaoCalls[0].auth === 'KakaoAK kadmin' && /target_id_type=user_id/.test(kakaoCalls[0].body) && /target_id=4242/.test(kakaoCalls[0].body), '카카오 연결도 끊음(어드민 키)');
  ok(users[UB] && db.orders.find(o => o.order_id === 'mto3').user_id === UB, '다른 회원은 그대로');
  r = await post('tok-a', { confirm: '탈퇴' }); ok(r.status === 401, '탈퇴 뒤 같은 토큰은 로그인 필요');
  // 구글 회원: 카카오 호출 없음
  kakaoCalls = []; r = await post('tok-b', { confirm: '탈퇴' }); ok((await r.json()).ok && kakaoCalls.length === 0, '구글 회원 탈퇴: 카카오 호출 없음');

  // ── 카카오 연결 해제 알림
  reset();
  const hook = (method, params, auth = 'KakaoAK kadmin') => {
    const qs = new URLSearchParams(params).toString();
    const init = { method, headers: auth ? { authorization: auth } : {} };
    if (method === 'POST') { init.headers['content-type'] = 'application/x-www-form-urlencoded'; init.body = qs; }
    const req = new Request('https://x.test/api/auth/kakao/unlink' + (method === 'GET' ? '?' + qs : ''), init);
    return (method === 'GET' ? unlink.onRequestGet : unlink.onRequestPost)({ request: req, env });
  };
  r = await hook('POST', { app_id: '1646155', user_id: '4242', referrer_type: 'UNLINK_FROM_APPS' }, null); ok(r.status === 401 && users[UA], '어드민 키 없는 알림 거부');
  r = await hook('POST', { app_id: '1646155', user_id: '4242' }, 'KakaoAK wrong'); ok(r.status === 401 && users[UA], '틀린 키 거부');
  r = await hook('POST', { app_id: '999', user_id: '4242' }); ok(r.status === 200 && users[UA], '다른 앱 알림은 무시(200)');
  r = await hook('POST', { app_id: '1646155', user_id: '777', referrer_type: 'ACCOUNT_DELETE' }); ok(r.status === 200 && users[UA], '모르는 카카오 회원: 200, 아무 일 없음');
  kakaoCalls = [];
  r = await hook('POST', { app_id: '1646155', user_id: '4242', referrer_type: 'UNLINK_FROM_APPS' });
  ok(r.status === 200 && !users[UA] && db.orders.find(o => o.order_id === 'mto1').user_id === null && kakaoCalls.length === 0, 'POST 알림: 탈퇴 처리, 카카오에 다시 끊기 요청 안 함');
  reset(); r = await hook('GET', { app_id: '1646155', user_id: '4242', referrer_type: 'ACCOUNT_DELETE' }); ok(r.status === 200 && !users[UA], 'GET 알림도 처리');
  ok(A.kakaoAuthOk(new Request('https://x.test', { headers: { authorization: 'KakaoAK kadmin' } }), {}) === false, '키 설정 없으면 알림 거부');
  // 점검 기록: 최근 알림을 KV 에 남기되 키 값·회원번호는 남기지 않음
  const store = new Map(); const KV = { async get(k, t) { const v = store.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); } };
  const kenv = { ...env, GLOSSARY_KV: KV };
  const hk = (params, auth) => unlink.onRequestPost({ request: new Request('https://x.test/api/auth/kakao/unlink', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...(auth ? { authorization: auth } : {}) }, body: new URLSearchParams(params).toString() }), env: kenv });
  reset(); await hk({ app_id: '1646155', user_id: '777', referrer_type: 'ACCOUNT_DELETE' }, 'KakaoAK kadmin'); await hk({ app_id: '1646155', user_id: '4242' }, 'KakaoAK nope');
  const diag = JSON.parse(store.get('diag:kakao-unlink') || '[]');
  ok(diag.length === 2 && diag[0].result === 'rejected-401' && diag[0].authOk === false && diag[1].result === 'not-member' && diag[1].authOk === true && diag[1].appOk === true, '점검 기록: 결과·키 일치 여부');
  ok(!JSON.stringify(diag).includes('kadmin') && !JSON.stringify(diag).includes('777') && !JSON.stringify(diag).includes('4242'), '점검 기록에 키·회원번호 없음');
})().catch(e => ok(false, '실행 오류: ' + (e.stack || e.message))).then(() => {
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log('회원 탈퇴 검증 통과');
});
