// 구매 콘텐츠 이용 기간 12개월(이용약관 제6조) 검증: node tests/access-period-sim.cjs
// 가짜 Supabase 로 ownedWorlds·내 구매 내역(mine)을 실행한다. 네트워크 호출 0.
// 보는 것: 받은 지 12개월 안 된 권한만 유효 · 지난 권한은 잠기고 다시 살 수 있음 · 내 구매 내역에 이용 기간 끝 날짜 · 크레딧 상품 없음
const path = require('path'), url = require('url');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const C = await imp('functions/_commerce.js'), mine = await imp('functions/api/commerce/mine.js');
  const U = '00000000-0000-0000-0000-00000000000a', KEY = 'sj_0123456789abcdef0123456789abcdef';
  const now = Date.now(), ago = d => new Date(now - d * 86400000).toISOString();
  const ents = [
    { user_id: U, saju_key: KEY, world: 'w1', granted_at: ago(30), revoked_at: null },     // 한 달 전: 유효
    { user_id: U, saju_key: KEY, world: 'w2', granted_at: ago(400), revoked_at: null },    // 13개월 전: 지남
    { user_id: U, saju_key: KEY, world: 'w3', granted_at: ago(10), revoked_at: ago(5) },   // 환불: 회수
  ];
  const orders = [{ order_id: 'mtaaaaaaaa', user_id: U, saju_key: KEY, product_name: '종합풀이', worlds: ['w1'], amount: 19800, status: 'paid', paid_at: '2026-03-15T03:00:00.000Z', created_at: '2026-03-15T02:59:00.000Z', payment_key: 'portone:mtaaaaaaaa' }];
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  let lastEntUrl = '';
  global.fetch = async (u, init = {}) => {
    u = String(u); const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    if (u.includes('/auth/v1/user')) return res({ id: U, email: 'a@x.test' });
    if (u.includes('/rest/v1/commerce_entitlements')) {
      lastEntUrl = u; let rows = ents.filter(e => e.user_id === U);
      if (q(u, 'revoked_at') === 'is.null') rows = rows.filter(e => !e.revoked_at);
      const g = q(u, 'granted_at'); if (g && g.startsWith('gt.')) rows = rows.filter(e => e.granted_at > g.slice(3));
      return res(rows);
    }
    if (u.includes('/rest/v1/commerce_orders')) return res(orders);
    if (u.includes('/rest/v1/member_sajus')) return res([{ saju_key: KEY, label: '나', birth: { year: 1990, month: 1, day: 1 } }]);
    return res([]);
  };
  const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon' };

  ok(C.ACCESS_MONTHS === 12, '이용 기간 12개월');
  ok(C.accessUntil('2026-03-15T03:00:00.000Z') === '2027-03-15T03:00:00.000Z', '결제일 + 12개월');
  ok(C.accessSince(Date.parse('2027-03-15T03:00:00.000Z')) === '2026-03-15T03:00:00.000Z', '12개월 전 경계');
  const owned = await C.ownedWorlds(env, U, KEY, now);
  ok(owned.join() === 'w1', '12개월 안 권한만 유효(13개월 지난 것·환불한 것 제외): ' + owned.join());
  ok(/granted_at=gt\./.test(lastEntUrl), '권한 조회에 기간 조건');
  ok(!C.DEFAULT_PRODUCTS.some(p => p.kind === 'credits') && !('CREDIT_PACKS' in C) && !('isCreditOrder' in C), '크레딧 상품·주문 처리 없음');
  ok(C.cleanProducts([{ id: 'cr10', price: 5000 }]).every(p => p.id !== 'cr10'), '관리자가 크레딧 상품을 되살릴 수 없음');

  const r = await mine.onRequestPost({ request: new Request('https://x.test/api/commerce/mine', { method: 'POST', headers: { 'x-member-token': 't', 'content-type': 'application/json' }, body: '{}' }), env });
  const d = await r.json();
  ok(r.status === 200 && d.orders[0].access_until === '2027-03-15T03:00:00.000Z' && !('credits' in d.orders[0]), '내 구매 내역: 이용 기간 끝 날짜');
  ok(/granted_at=gt\./.test(lastEntUrl) && d.sajus.length === 1 && d.sajus[0].worlds.join() === 'w1', '이 사주로 바로 읽기: 기간 안 주제만');

  if (fails.length) { console.error('access-period-sim 실패 ' + fails.length + '/' + n + '\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('access-period-sim OK: ' + n + '항목');
})().catch(e => { console.error(e); process.exit(1); });
