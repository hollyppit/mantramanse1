// 인연의 광장 크레딧 결제 검증(6단계): node tests/credit-pay-sim.cjs
// 가짜 Supabase(REST·Auth·원장 함수)·가짜 포트원·메모리 KV 로 /api/commerce/* 와 /api/community/credits 를 실행한다. 네트워크 호출 0.
// 보는 것: 유료 스위치·가격·본인확인·동의 없이는 주문 불가 · 결제 확인 시 크레딧 한 번만 지급(복귀·웹훅·다시 주기 겹쳐도)
//          금액 바꿔 치기 거절 · 바로 환불은 7일·미사용일 때만 · 환불·포트원 취소 알림 시 크레딧 회수(마이너스 없음) · 무빙툰 잠금 화면에 크레딧 상품 안 나옴
const path = require('path'), url = require('url');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const C = await imp('functions/_commerce.js');
  const order = await imp('functions/api/commerce/order.js'), confirm = await imp('functions/api/commerce/confirm.js'), mine = await imp('functions/api/commerce/mine.js');
  const webhook = await imp('functions/api/commerce/webhook.js'), access = await imp('functions/api/commerce/access.js'), admin = await imp('functions/api/commerce/admin.js');
  const credits = await imp('functions/api/community/credits.js');
  const { DOCS } = await imp('functions/_consent.js');
  const M = await imp('functions/_mail.js');

  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
  const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b';
  const USERS = { 'tok-a': { id: A, email: 'a@x.test' }, 'tok-b': { id: B, email: 'b@x.test' } };
  const db = { orders: [], ledger: [], consents: [], verif: [] }; const po = {}; let poCalls = [];
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  const eqv = v => v && v.startsWith('eq.') ? v.slice(3) : null;
  const bal = uid => db.ledger.filter(l => l.user_id === uid).reduce((s, l) => s + l.delta, 0);
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(), body = init.body ? JSON.parse(init.body) : null;
    const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    if (u.startsWith('https://api.resend.com/')) return res({ id: 'm' });
    { const m = /\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/.exec(u); if (m) { const uu = Object.values(USERS).find(x => x.id === m[1]); return uu ? res(uu) : res({}, 404); } }
    if (u.includes('/auth/v1/user')) { const t = (init.headers.authorization || '').slice(7); return USERS[t] ? res(USERS[t]) : res({}, 401); }
    if (u.startsWith('https://api.portone.io/')) {
      poCalls.push({ u, body });
      const m = /payments\/([^/?]+)(\/cancel)?/.exec(u), id = m && decodeURIComponent(m[1]);
      if (m && m[2]) { if (po[id]) po[id].status = 'CANCELLED'; return res({ cancellation: { status: 'SUCCEEDED' } }); }
      return po[id] ? res(po[id]) : res({ type: 'PAYMENT_NOT_FOUND' }, 404);
    }
    if (u.includes('/rest/v1/rpc/cm_credit_balance')) return res(bal(body.p_user));
    if (u.includes('/rest/v1/rpc/cm_credit_grant')) {
      if (!['grant', 'purchase', 'refund', 'adjust'].includes(body.p_reason)) return res({ ok: false, error: 'bad-reason' });
      if (!db.ledger.some(l => l.idem_key === body.p_idem)) db.ledger.push({ id: db.ledger.length + 1, user_id: body.p_user, delta: body.p_amount, reason: body.p_reason, ref: body.p_ref, idem_key: body.p_idem, by_actor: body.p_by, created_at: new Date().toISOString() });
      return res({ ok: true, balance: bal(body.p_user) });
    }
    if (u.includes('/rest/v1/rpc/cm_credit_spend')) {
      if (db.ledger.some(l => l.idem_key === body.p_idem)) return res({ ok: true, dup: true, balance: bal(body.p_user) });
      if (bal(body.p_user) < body.p_amount) return res({ ok: false, error: 'insufficient', balance: bal(body.p_user) });
      db.ledger.push({ id: db.ledger.length + 1, user_id: body.p_user, delta: -body.p_amount, reason: body.p_reason, ref: body.p_ref, idem_key: body.p_idem, created_at: new Date().toISOString() });
      return res({ ok: true, balance: bal(body.p_user) });
    }
    if (u.includes('/rest/v1/cm_credit_ledger')) return res(db.ledger.filter(l => (!q(u, 'user_id') || l.user_id === eqv(q(u, 'user_id'))) && (!q(u, 'idem_key') || l.idem_key === eqv(q(u, 'idem_key')))).slice().reverse());
    if (u.includes('/rest/v1/member_consents')) return res(db.consents.filter(c => c.user_id === eqv(q(u, 'user_id'))));
    if (u.includes('/rest/v1/adult_verifications')) return res(db.verif.filter(c => c.user_id === eqv(q(u, 'user_id'))));
    if (u.includes('/rest/v1/member_sajus')) { if (method === 'POST') { db.sajuWrites = (db.sajuWrites || 0) + 1; return res(null, 201); } return res([]); }
    if (u.includes('/rest/v1/commerce_entitlements')) { if (method === 'POST') { db.entWrites = (db.entWrites || 0) + 1; return res(null, 201); } return res([]); }
    if (u.includes('/rest/v1/commerce_orders')) {
      if (method === 'POST') { db.orders.push({ status: 'pending', created_at: new Date().toISOString(), ...body }); return res(null, 201); }
      const rows = db.orders.filter(o => (!q(u, 'order_id') || o.order_id === eqv(q(u, 'order_id'))) && (!q(u, 'user_id') || o.user_id === eqv(q(u, 'user_id'))) && (!q(u, 'status') || o.status === eqv(q(u, 'status'))));
      if (method === 'PATCH') { rows.forEach(o => Object.assign(o, body)); return ((init.headers && init.headers.prefer) || '').includes('representation') ? res(rows) : res(null, 204); }
      return res(rows);
    }
    if (u.includes('/rest/v1/kv')) return res([]);
    throw new Error('unexpected fetch ' + u);
  };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm', SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', PORTONE_STORE_ID: 'store-1', PORTONE_CHANNEL_KEY: 'ch-1', PORTONE_API_SECRET: 'posecret' };
  const req = (u, { tok, adminPw, body, method = 'POST' } = {}) => new Request('https://x.test' + u, { method, headers: { 'content-type': 'application/json', ...(tok ? { 'x-member-token': tok } : {}), ...(adminPw ? { authorization: 'Bearer ' + adminPw } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const call = async (mod, fn, u, opts) => { const r = await mod[fn]({ request: req(u, opts), env, waitUntil: () => { } }); return { s: r.status, d: await r.json() }; };
  const mkOrder = (tok, productId) => call(order, 'onRequestPost', '/api/commerce/order', { tok, body: { productId } });
  const paid = (id, amount) => { po[id] = { status: 'PAID', amount: { total: amount }, currency: 'KRW', storeId: 'store-1', method: { type: 'PaymentMethodCard' }, paidAt: new Date().toISOString(), channel: { type: 'TEST' } }; };

  // ── 상품표: 크레딧 묶음 3개, 기본 가격 0(판매 안 함), 크레딧 수는 코드가 정한다
  ok(C.CREDIT_PACKS.cr10 === 10 && C.CREDIT_PACKS.cr30 === 30 && C.CREDIT_PACKS.cr100 === 100, '크레딧 묶음 3개');
  ok(C.cleanProducts([]).filter(p => p.kind === 'credits').every(p => p.price === 0), '기본 가격 0');
  ok(C.cleanProducts([{ id: 'cr10', price: 5000, credits: 9999 }]).find(p => p.id === 'cr10').credits === 10, '관리자가 크레딧 수를 바꿀 수 없음');
  ok((await C.productWorlds(env, { kind: 'credits', worlds: [] })).length === 0, '크레딧 상품은 세계를 열지 않음');
  ok(C.isAnnualWorld('tj2027') && !C.isAnnualWorld('tjd{4}'), '연도 세계 검사식(백슬래시) 바로잡음');

  // ── 주문: 가격 없음 → 유료 스위치 꺼짐 → 동의 → 본인확인 순서로 막힘
  let r = await mkOrder('tok-a', 'cr10'); ok(r.s === 400 && r.d.error === 'unknown-product', '가격 0: 주문 불가');
  r = await call(admin, 'onRequestPut', '/api/commerce/admin', { adminPw: 'adm', method: 'PUT', body: { products: [{ id: 'cr10', price: 5000 }, { id: 'cr30', price: 13000 }] } });
  ok(r.s === 200 && r.d.products.find(p => p.id === 'cr10').price === 5000, '관리자 가격 저장');
  r = await mkOrder('tok-a', 'cr10'); ok(r.s === 403 && r.d.error === 'premium-off', '유료 스위치 꺼짐: 주문 불가');
  r = await call(credits, 'onRequestGet', '/api/community/credits', { tok: 'tok-a', method: 'GET' }); ok(r.d.enabled === false && !r.d.packs, '스위치 꺼짐: 크레딧 정보 안 보임');
  r = await call(credits, 'onRequestPut', '/api/community/credits', { adminPw: 'adm', method: 'PUT', body: { enabled: true, confirm: '유료 켜기' } }); ok(r.s === 200 && r.d.config.enabled, '관리자 유료 켜기');
  r = await call(order, 'onRequestPost', '/api/commerce/order', { body: { productId: 'cr10' } }); ok(r.s === 401, '비로그인 주문 불가');
  r = await mkOrder('tok-a', 'cr10'); ok(r.s === 409 && r.d.error === 'consent-required', '동의 없음: 주문 불가');
  db.consents.push({ user_id: A, kind: 'terms', agreed: true, version: DOCS.terms.version }, { user_id: A, kind: 'privacy', agreed: true, version: DOCS.privacy.version });
  r = await mkOrder('tok-a', 'cr10'); ok(r.s === 403 && r.d.error === 'verify-required', '본인확인 없음: 주문 불가');
  db.verif.push({ user_id: A, provider: 'portone', birth_year: 1990, gender: 'M', verified_at: '2026-11-16T00:00:00Z' });
  r = await mkOrder('tok-a', 'cr100'); ok(r.s === 400, '가격 없는 묶음(100개)은 주문 불가');
  r = await mkOrder('tok-a', 'cr10');
  ok(r.s === 200 && r.d.amount === 5000 && r.d.credits === 10 && r.d.provider === 'portone' && /^mt[a-z0-9]+$/.test(r.d.orderId), '주문 생성(서버 금액)');
  const o1 = r.d.orderId, row1 = db.orders.find(o => o.order_id === o1);
  ok(row1 && row1.saju_key === 'credits' && row1.worlds.length === 0 && row1.birth === null && row1.amount === 5000, '주문 표: 사주 없이 크레딧 표시');

  // ── 광장 크레딧 화면: 판매 중 묶음·공개 결제 키만
  r = await call(credits, 'onRequestGet', '/api/community/credits', { tok: 'tok-a', method: 'GET' });
  ok(r.d.enabled && r.d.packs.map(p => p.id).join() === 'cr10,cr30' && r.d.pay.storeId === 'store-1' && r.d.pay.channelKey === 'ch-1' && !JSON.stringify(r.d).includes('posecret'), '충전 화면: 판매 묶음·공개 키만');
  // 무빙툰 잠금 화면 상품에는 크레딧이 나오지 않는다
  r = await call(access, 'onRequestPost', '/api/commerce/access', { tok: 'tok-a', body: { sd: null } }); ok(!r.d.products.some(p => p.kind === 'credits') && !r.d.annual.some(p => p.kind === 'credits'), '무빙툰 상품 목록에 크레딧 없음');

  // ── 결제 확인: 금액이 맞을 때만, 한 번만 지급
  r = await call(confirm, 'onRequestPost', '/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: o1 } }); ok(r.s === 502 && r.d.error === 'payment-not-found' && bal(A) === 0, '결제 안 됨: 지급 없음');
  paid(o1, 5000);
  r = await call(confirm, 'onRequestPost', '/api/commerce/confirm', { tok: 'tok-b', body: { paymentId: o1 } }); ok(r.s === 404 && bal(A) === 0 && bal(B) === 0, '남의 주문 확인 불가');
  r = await call(confirm, 'onRequestPost', '/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: o1 } });
  ok(r.s === 200 && r.d.ok && bal(A) === 10 && row1.status === 'paid', '결제 확인: 크레딧 10 지급');
  ok(!db.entWrites && !db.sajuWrites, '크레딧 주문은 세계 권한·사주 저장을 만들지 않음');
  const pl = db.ledger.find(l => l.reason === 'purchase'); ok(pl && pl.ref === o1 && pl.idem_key === 'order:' + o1, '원장: 구매·주문번호·멱등 키');
  r = await call(confirm, 'onRequestPost', '/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: o1 } }); ok(r.d.ok && r.d.already && bal(A) === 10, '다시 확인해도 중복 지급 없음');
  const wh = (id, type) => webhook.onRequestPost({ request: new Request('https://x.test/api/commerce/webhook', { method: 'POST', body: JSON.stringify({ type, data: { paymentId: id } }) }), env });
  await wh(o1, 'Transaction.Paid'); ok(bal(A) === 10, '웹훅이 겹쳐도 중복 지급 없음');
  await C.grantOrder(env, row1, 'admin:test'); ok(bal(A) === 10, '관리자 다시 주기도 한 번만');
  // 금액 바꿔 치기
  r = await mkOrder('tok-a', 'cr30'); const o2 = r.d.orderId; paid(o2, 100);
  r = await call(confirm, 'onRequestPost', '/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: o2 } });
  ok(r.d.error === 'amount-mismatch' && bal(A) === 10 && db.orders.find(o => o.order_id === o2).status === 'failed', '금액 불일치: 지급 없음·결제 취소');
  // 구매 메일 문구
  const pm = M.purchaseMail({ ...row1, receipt_url: null }); ok(/크레딧을 하나도 쓰지 않았다면/.test(pm.html) && !/열리는 주제/.test(pm.html), '구매 메일: 크레딧 안내');
  ok(/잔액에서 빠집니다/.test(M.refundMail(row1).html) && /다시 잠깁니다/.test(M.refundMail({ ...row1, saju_key: 'sj_x' }).html), '환불 메일 문구 구분');

  // ── 내 구매 내역: 크레딧 수·사용 여부, 사주 식별값은 안 보냄
  r = await call(mine, 'onRequestPost', '/api/commerce/mine', { tok: 'tok-a', body: {} });
  let mo = r.d.orders.find(o => o.order_id === o1); ok(mo && mo.credits === 10 && mo.credits_used === false && !('saju_key' in mo) && !('product_id' in mo), '내역: 크레딧 10·미사용·식별값 없음');
  // 하나 쓰면 바로 환불 불가
  db.ledger.push({ id: 99, user_id: A, delta: -3, reason: 'more_picks', ref: 'd', idem_key: 'mp:x', created_at: new Date().toISOString() });
  r = await call(mine, 'onRequestPost', '/api/commerce/mine', { tok: 'tok-a', body: {} }); mo = r.d.orders.find(o => o.order_id === o1); ok(mo.credits_used === true, '내역: 사용 시작 표시');
  r = await call(mine, 'onRequestPost', '/api/commerce/mine', { tok: 'tok-a', body: { action: 'refund', orderId: o1 } }); ok(r.s === 409 && r.d.reason === 'credits-used' && row1.status === 'paid', '크레딧을 썼으면 바로 환불 불가');
  db.ledger = db.ledger.filter(l => l.id !== 99);
  // 7일 지남
  row1.paid_at = new Date(Date.now() - 8 * 86400000).toISOString();
  r = await call(mine, 'onRequestPost', '/api/commerce/mine', { tok: 'tok-a', body: { action: 'refund', orderId: o1 } }); ok(r.s === 409 && r.d.reason === 'over-7-days', '7일 지나면 바로 환불 불가');
  row1.paid_at = new Date().toISOString();
  poCalls = [];
  r = await call(mine, 'onRequestPost', '/api/commerce/mine', { tok: 'tok-a', body: { action: 'refund', orderId: o1 } });
  ok(r.s === 200 && row1.status === 'canceled' && bal(A) === 0 && poCalls.some(c => /cancel$/.test(c.u)), '바로 환불: 결제 취소·크레딧 회수');
  ok(db.ledger.filter(l => l.reason === 'refund').length === 1 && db.ledger.find(l => l.reason === 'refund').idem_key === 'refund:' + o1, '환불 원장 한 번');
  await wh(o1, 'Transaction.Cancelled'); ok(bal(A) === 0 && db.ledger.filter(l => l.reason === 'refund').length === 1, '취소 알림이 겹쳐도 다시 빼지 않음');

  // ── 포트원 콘솔 취소(웹훅): 일부 쓴 뒤 취소되면 남은 만큼만 빼고 마이너스 없음
  r = await mkOrder('tok-a', 'cr10'); const o3 = r.d.orderId; paid(o3, 5000);
  await call(confirm, 'onRequestPost', '/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: o3 } }); ok(bal(A) === 10, '두 번째 구매 지급');
  db.ledger.push({ id: 100, user_id: A, delta: -4, reason: 'extra_like', ref: 'x', idem_key: 'xl:y', created_at: new Date().toISOString() });
  po[o3].status = 'CANCELLED';
  await wh(o3, 'Transaction.Cancelled');
  ok(db.orders.find(o => o.order_id === o3).status === 'canceled' && bal(A) === 0, '콘솔 취소: 남은 6개만 회수·잔액 0(마이너스 없음)');

  // ── 다른 사람에게 영향 없음
  ok(bal(B) === 0, '다른 회원 잔액 그대로');

  if (fails.length) { console.error('credit-pay-sim 실패 ' + fails.length + '/' + n + '\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('credit-pay-sim OK: ' + n + '항목(상품·스위치·동의·본인확인·주문·결제 확인 멱등·금액 위조·내역·바로 환불·취소 알림 회수)');
})().catch(e => { console.error(e); process.exit(1); });
