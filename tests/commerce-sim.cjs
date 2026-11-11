// 무빙툰 결제·잠금 검증: node tests/commerce-sim.cjs
// 가짜 Supabase(REST·Auth)·가짜 토스·메모리 KV 로 functions/_commerce.js 와 /api/commerce/* 를 실행한다. 네트워크 호출 0.
const path = require('path'), url = require('url');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const C = await imp('functions/_commerce.js');
  const access = await imp('functions/api/commerce/access.js'), order = await imp('functions/api/commerce/order.js');
  const confirm = await imp('functions/api/commerce/confirm.js'), admin = await imp('functions/api/commerce/admin.js'), webhook = await imp('functions/api/commerce/webhook.js');
  const { Editorial } = await imp('functions/_editorial.js');

  // ── 메모리 KV + 활성 카탈로그(재물 주제 장 15개 중 order 가 가장 작은 장이 무료)
  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
  const cat = Editorial.defaults(); cat.chapters.forEach(c => { if (['self', 'wealth', 'career', 'love'].includes(c.topicId)) c.state = 'active'; });
  store.set('ik:editorial:published', JSON.stringify(cat));
  const wealth = cat.chapters.filter(c => c.topicId === 'wealth').sort((a, b) => a.order - b.order);
  const FREE = wealth[0].id, PAID = wealth[1].id;

  // ── 가짜 Supabase · 토스
  const db = { orders: [], ent: [] }; let tossCalls = [], tossMode = 'done';
  const po = {}; let poCalls = [];   // 가짜 포트원: 결제 id → 결제 객체
  const USERS = { 'tok-a': { id: '00000000-0000-0000-0000-00000000000a', email: 'a@x.test' }, 'tok-b': { id: '00000000-0000-0000-0000-00000000000b', email: 'b@x.test' } };
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  const eqv = v => v && v.startsWith('eq.') ? v.slice(3) : null;
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(), body = init.body ? JSON.parse(init.body) : null;
    const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    if (u.includes('/auth/v1/user')) { const t = (init.headers.authorization || '').slice(7); return USERS[t] ? res(USERS[t]) : res({ msg: 'bad' }, 401); }
    if (u.includes('api.tosspayments.com')) {
      tossCalls.push({ u, body });
      if (u.endsWith('/payments/confirm')) return tossMode === 'done' ? res({ status: 'DONE', method: '카드', approvedAt: '2026-11-10T00:00:00+09:00' }) : res({ code: 'REJECT_CARD_PAYMENT', message: '거절' }, 400);
      if (u.includes('/cancel')) return res({ status: 'CANCELED' });
    }
    if (u.startsWith('https://api.portone.io/')) {
      poCalls.push({ u, body, auth: init.headers.authorization });
      const m = /payments\/([^/?]+)(\/cancel)?/.exec(u), id = m && decodeURIComponent(m[1]);
      if (m && m[2]) { if (po[id]) po[id].status = 'CANCELLED'; return res({ cancellation: { status: 'SUCCEEDED' } }); }
      return po[id] ? res(po[id]) : res({ type: 'PAYMENT_NOT_FOUND' }, 404);
    }
    if (u.includes('/rest/v1/kv')) return res([]);
    if (u.includes('/rest/v1/commerce_orders')) {
      if (method === 'POST') { db.orders.push({ status: 'pending', ...body }); return res(null, 201); }
      const rows = db.orders.filter(o => (!q(u, 'order_id') || o.order_id === eqv(q(u, 'order_id'))) && (!q(u, 'user_id') || o.user_id === eqv(q(u, 'user_id'))) && (!q(u, 'status') || o.status === eqv(q(u, 'status'))));
      if (method === 'PATCH') { rows.forEach(o => Object.assign(o, body)); return res(null, 204); }
      return res(rows);
    }
    if (u.includes('/rest/v1/commerce_entitlements')) {
      if (method === 'POST') { for (const r of body) if (!db.ent.some(e => e.user_id === r.user_id && e.saju_key === r.saju_key && e.world === r.world && e.order_id === r.order_id)) db.ent.push({ ...r, revoked_at: null }); return res(null, 201); }
      const rows = db.ent.filter(e => (!q(u, 'user_id') || e.user_id === eqv(q(u, 'user_id'))) && (!q(u, 'saju_key') || e.saju_key === eqv(q(u, 'saju_key'))) && (!q(u, 'order_id') || e.order_id === eqv(q(u, 'order_id'))) && (q(u, 'revoked_at') !== 'is.null' || e.revoked_at == null));
      if (method === 'PATCH') { rows.forEach(e => Object.assign(e, body)); return res(null, 204); }
      return res(rows.map(e => ({ world: e.world })));
    }
    throw new Error('unexpected fetch ' + u);
  };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm', SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', TOSS_SECRET_KEY: 'test_sk_x', TOSS_CLIENT_KEY: 'test_ck_x' };
  const sd = { pillars: { year: { hanja: '壬申' }, month: { hanja: '丙午' }, day: { hanja: '庚午' }, hour: null }, gender: 'M' };
  const req = (u, { tok, adminPw, viewAsFree, body, method = 'POST' } = {}) => new Request('https://x.test' + u, { method, headers: { 'content-type': 'application/json', ...(tok ? { 'x-member-token': tok } : {}), ...(adminPw ? { authorization: 'Bearer ' + adminPw } : {}), ...(viewAsFree ? { 'x-view-as': 'free' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const gate = (opts, chapterId = PAID) => C.chapterGate(req('/', opts), env, { topicId: 'wealth', chapterId, sd });

  // ── 사주 식별값
  const k1 = await C.sajuKey(sd), k2 = await C.sajuKey({ ...sd, gender: 'F' }), k3 = await C.sajuKey({ ...sd, pillars: { ...sd.pillars, hour: { hanja: '壬午' } } });
  ok(/^sj_[0-9a-f]{32}$/.test(k1) && k1 === await C.sajuKey(JSON.parse(JSON.stringify(sd))), '사주 식별값 형식·재현성');
  ok(k1 !== k2 && k1 !== k3, '성별·시주가 다르면 다른 사주');
  ok(await C.sajuKey({ pillars: { year: { hanja: 'x' } } }) === null && await C.sajuKey(null) === null, '기둥이 없으면 식별값 없음');

  // ── 세계가 유료가 아니면 아무것도 잠그지 않는다
  ok((await gate({})).ok, '저장본 없음: 잠금 없음');
  store.set('worlds:config', JSON.stringify({ worlds: [{ id: 'w1', access: 'free' }, { id: 'w2', access: 'paid', enabled: true }, { id: 'w7', access: 'paid', enabled: true }, { id: 'w3', access: 'free' }] }));
  ok((await C.chapterGate(req('/'), env, { topicId: 'love', chapterId: 'x', sd })).ok, '무료 세계(인연) 장은 열림');
  ok((await gate({}, FREE)).ok && (await gate({}, FREE)).free, '유료 세계의 첫 장은 무료');
  let g = await gate({}); ok(!g.ok && g.reason === 'login' && g.world === 'w2' && g.freeChapter === FREE, '비로그인: 로그인 요구');
  g = await gate({ tok: 'bogus' }); ok(!g.ok && g.reason === 'login', '가짜 토큰: 로그인 요구');
  g = await gate({ tok: 'tok-a' }); ok(!g.ok && g.reason === 'purchase', '로그인했지만 미구매: 구매 요구');
  ok((await gate({ adminPw: 'adm' })).ok, '관리자는 열림');
  g = await gate({ adminPw: 'adm', viewAsFree: true }); ok(!g.ok && g.reason === 'purchase' && g.viewAsFree, '관리자 무료 사용자로 보기: 잠김');
  ok(!(await gate({ adminPw: 'wrong', viewAsFree: true })).ok, '틀린 관리자 비밀번호는 잠김');
  // 운영 모니터 열쇠: 맞으면 통과, 틀리거나 짧은 열쇠·설정 없음은 잠김
  const MK = 'm'.repeat(40), menv = { ...env, MONITOR_READING_KEY: MK };
  const mreq = k => new Request('https://x.test/', { method: 'POST', headers: k ? { 'x-monitor-key': k } : {} });
  ok((await C.chapterGate(mreq(MK), menv, { topicId: 'wealth', chapterId: PAID, sd })).ok, '모니터 열쇠: 잠긴 장 통과');
  ok(!(await C.chapterGate(mreq(MK + 'x'), menv, { topicId: 'wealth', chapterId: PAID, sd })).ok, '틀린 모니터 열쇠: 잠김');
  ok(!(await C.chapterGate(mreq(''), menv, { topicId: 'wealth', chapterId: PAID, sd })).ok, '열쇠 없음: 잠김');
  ok(!(await C.chapterGate(mreq('short'), { ...env, MONITOR_READING_KEY: 'short' }, { topicId: 'wealth', chapterId: PAID, sd })).ok, '짧은 열쇠는 쓰지 않음');
  ok(!(await C.chapterGate(mreq(MK), env, { topicId: 'wealth', chapterId: PAID, sd })).ok, '서버에 열쇠 설정이 없으면 잠김');
  const lr = C.lockedResponse({ ok: false, world: 'w2', reason: 'purchase', freeChapter: FREE }); ok(lr.status === 402 && (await lr.json()).locked.world === 'w2', '잠금 응답 402');

  // ── 상품: 가격 0 은 판매 안 함, 관리자만 저장
  let r = await access.onRequestPost({ request: req('/api/commerce/access', { tok: 'tok-a', body: { sd } }), env }); let d = await r.json();
  ok(d.configured.login && d.configured.pay && d.keys.tossClientKey === 'test_ck_x' && !JSON.stringify(d).includes('test_sk_x') && !JSON.stringify(d).includes('"svc"'), '공개 키만 내려 보냄');
  ok(d.products.length === 0 && d.worlds.w2.paid && !d.worlds.w2.owned && d.worlds.w2.freeChapter === FREE && d.worlds.w3 && !d.worlds.w3.paid && d.worlds.w3.owned, '가격 없으면 판매 상품 없음·세계 상태');
  r = await admin.onRequestPut({ request: req('/api/commerce/admin', { body: { products: [{ id: 'w2', price: 9900 }] } , method: 'PUT' }), env }); ok(r.status === 401, '비관리자 상품 저장 거부');
  r = await admin.onRequestPut({ request: req('/api/commerce/admin', { adminPw: 'adm', method: 'PUT', body: { products: [{ id: 'w2', price: 9900, name: '재물운 심화' }, { id: 'bundle', price: 19900 }, { id: 'w7', price: -5 }, { id: 'evil', price: 1 }] } }), env }); d = await r.json();
  ok(r.status === 200 && d.products.find(p => p.id === 'w2').price === 9900 && d.products.find(p => p.id === 'w7').price === 0 && !d.products.some(p => p.id === 'evil'), '상품 저장: 음수·모르는 상품 무시');
  r = await access.onRequestPost({ request: req('/api/commerce/access', { tok: 'tok-a', body: { sd } }), env }); d = await r.json();
  const bundle = d.products.find(p => p.id === 'bundle');
  ok(d.products.some(p => p.id === 'w2') && bundle && bundle.worlds.join() === 'w2,w7' && !d.products.some(p => p.id === 'w1'), '판매 상품: 유료 세계만, 묶음은 지금 유료인 세계');

  // ── 주문: 회원 전용, 금액은 서버 상품표
  r = await order.onRequestPost({ request: req('/api/commerce/order', { body: { productId: 'w2', sd } }), env }); ok(r.status === 401, '비회원 주문 거부');
  r = await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-a', body: { productId: 'w1', sd } }), env }); ok(r.status === 400, '판매 안 하는 상품 거부');
  r = await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-a', body: { productId: 'w2', sd, amount: 1 } }), env }); d = await r.json();
  ok(r.status === 200 && d.amount === 9900 && /^mt[a-z0-9]{20,}$/.test(d.orderId) && db.orders[0].amount === 9900 && db.orders[0].saju_key === k1, '주문 생성: 서버 가격');
  const oid = d.orderId;

  // ── 승인: 남의 주문·금액 위조·실패·성공·재시도
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-b', body: { paymentKey: 'pk1', orderId: oid, amount: 9900 } }), env }); ok(r.status === 404, '남의 주문 승인 거부');
  tossMode = 'reject';
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentKey: 'pk1', orderId: oid, amount: 9900 } }), env }); ok(r.status === 400 && db.orders[0].status === 'failed' && db.ent.length === 0, '카드 거절: 실패 기록·권한 없음');
  r = await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-a', body: { productId: 'w2', sd } }), env }); const oid2 = (await r.json()).orderId; tossMode = 'done'; tossCalls = [];
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentKey: 'pk2', orderId: oid2, amount: 100 } }), env }); ok(r.status === 400 && tossCalls.length === 0 && db.orders[1].status === 'failed', '금액 위조: 토스 호출 없이 실패');
  r = await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-a', body: { productId: 'w2', sd } }), env }); const oid3 = (await r.json()).orderId;
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentKey: 'pk3', orderId: oid3, amount: 9900 } }), env }); d = await r.json();
  const o3 = db.orders.find(o => o.order_id === oid3);
  ok(r.status === 200 && d.ok && o3.status === 'paid' && o3.payment_key === 'pk3' && db.ent.length === 1 && db.ent[0].world === 'w2', '승인 성공: 결제 완료·권한 1건');
  ok(tossCalls[0].body.amount === 9900 && tossCalls[0].body.orderId === oid3, '토스에는 주문 금액 그대로');
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentKey: 'pk3', orderId: oid3, amount: 9900 } }), env }); d = await r.json(); ok(d.ok && d.already && db.ent.length === 1, '같은 주문 재승인: 중복 없음');

  // ── 구매 후 잠금 해제: 그 사주만
  ok((await gate({ tok: 'tok-a' })).ok, '구매한 사주: 열림');
  ok(!(await C.chapterGate(req('/', { tok: 'tok-a' }), env, { topicId: 'wealth', chapterId: PAID, sd: { ...sd, gender: 'F' } })).ok, '다른 사주: 잠김');
  ok(!(await gate({ tok: 'tok-b' })).ok, '다른 회원: 잠김');
  ok(!(await C.chapterGate(req('/', { tok: 'tok-a' }), env, { topicId: 'career', chapterId: 'x', sd })).ok, '산 적 없는 세계(커리어): 잠김');
  r = await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-a', body: { productId: 'w2', sd } }), env }); ok(r.status === 409, '이미 산 상품 재주문 거부');
  r = await access.onRequestPost({ request: req('/api/commerce/access', { tok: 'tok-a', body: { sd } }), env }); d = await r.json(); ok(d.worlds.w2.owned && !d.worlds.w7.owned && d.products.find(p => p.id === 'w2').owned, '접근 정보에 구매 반영');

  // ── 관리자: 주문 목록·취소(권한 회수)·다시 주기
  r = await admin.onRequestGet({ request: req('/api/commerce/admin', { adminPw: 'adm', method: 'GET' }), env }); d = await r.json(); ok(d.orders.length === 3 && d.configured.toss, '관리자 주문 목록');
  r = await admin.onRequestPost({ request: req('/api/commerce/admin', { adminPw: 'adm', body: { action: 'cancel', orderId: oid3, reason: '테스트' } }), env });
  ok(r.status === 200 && o3.status === 'canceled' && db.ent[0].revoked_at && tossCalls.some(c => c.u.includes('/payments/pk3/cancel')), '취소: 토스 취소·권한 회수');
  ok(!(await gate({ tok: 'tok-a' })).ok, '취소 후 다시 잠김');
  r = await admin.onRequestPost({ request: req('/api/commerce/admin', { adminPw: 'adm', body: { action: 'regrant', orderId: oid3 } }), env }); ok(r.status === 409, '취소된 주문은 권한 다시 주기 거부');
  r = await admin.onRequestPost({ request: req('/api/commerce/admin', { body: { action: 'cancel', orderId: oid3 } }), env }); ok(r.status === 401, '비관리자 취소 거부');

  // ── 포트원: 결제창 복귀 확인·금액 위조·대기·웹훅·취소
  const penv = { ...env, PORTONE_STORE_ID: 'store-x', PORTONE_CHANNEL_KEY: 'channel-key-x', PORTONE_API_SECRET: 'po-secret-x' };
  ok(C.payProvider(penv) === 'portone' && C.payProvider(env) === 'toss' && C.payProvider({ ...penv, PAY_PROVIDER: 'toss' }) === 'toss' && C.payProvider({ ...env, PAY_PROVIDER: 'portone' }) === null, '결제사 고르기: 포트원 우선·고정값');
  r = await access.onRequestPost({ request: req('/api/commerce/access', { tok: 'tok-a', body: { sd } }), env: penv }); d = await r.json();
  ok(d.keys.provider === 'portone' && d.keys.portone.storeId === 'store-x' && d.keys.portone.channelKey === 'channel-key-x' && !d.keys.tossClientKey && !JSON.stringify(d).includes('po-secret-x'), '포트원 공개 값만 내려 보냄');
  const poOrder = async () => { const x = await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-a', body: { productId: 'bundle', sd } }), env: penv }); return x.json(); };
  let o = await poOrder(); ok(o.provider === 'portone' && o.amount === 19900, '포트원 주문: 서버 가격');
  const P1 = o.orderId;
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: P1 } }), env: penv }); ok(r.status === 502, '포트원에 결제가 없으면 다시 시도(502)');
  po[P1] = { id: P1, status: 'READY', amount: { total: 19900 }, currency: 'KRW', storeId: 'store-x' };
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: P1 } }), env: penv }); ok(r.status === 202 && db.orders.find(x => x.order_id === P1).status === 'pending', '결제 대기: 202·주문 그대로');
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-b', body: { paymentId: P1 } }), env: penv }); ok(r.status === 404, '포트원: 남의 주문 거부');
  Object.assign(po[P1], { status: 'PAID', paidAt: '2026-11-11T00:00:00Z', method: { type: 'PaymentMethodCard' } }); poCalls = [];
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: P1, amount: 1 } }), env: penv }); d = await r.json();
  const op1 = db.orders.find(x => x.order_id === P1), ents = () => db.ent.filter(e => e.order_id === P1 && !e.revoked_at).map(e => e.world).sort().join();
  ok(r.status === 200 && d.ok && op1.status === 'paid' && op1.payment_key === 'portone:' + P1 && op1.method === '카드' && ents() === 'w2,w7', '포트원 결제 완료: 묶음 권한 2건');
  ok(poCalls[0].auth === 'PortOne po-secret-x' && poCalls[0].u.includes('storeId=store-x'), '포트원 조회: 시크릿 머리글·상점 ID');
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: P1 } }), env: penv }); d = await r.json(); ok(d.ok && d.already && ents() === 'w2,w7', '포트원 재확인: 중복 없음');
  // 금액 바꿔 치기: 결제창에서 100원만 결제 → 자동 취소·실패
  db.ent.forEach(e => { if (e.order_id === P1) e.revoked_at = 'x'; }); op1.status = 'canceled';
  o = await poOrder(); const P2 = o.orderId; po[P2] = { id: P2, status: 'PAID', amount: { total: 100 }, currency: 'KRW', storeId: 'store-x' }; poCalls = [];
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: P2 } }), env: penv }); d = await r.json();
  ok(r.status === 400 && d.error === 'amount-mismatch' && db.orders.find(x => x.order_id === P2).status === 'failed' && poCalls.some(c => c.u.includes('/cancel')) && !db.ent.some(e => e.order_id === P2), '포트원 금액 위조: 자동 취소·권한 없음');
  // 다른 상점의 결제
  o = await poOrder(); const P3 = o.orderId; po[P3] = { id: P3, status: 'PAID', amount: { total: 19900 }, currency: 'KRW', storeId: 'store-other' };
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: P3 } }), env: penv }); ok(r.status === 400 && !db.ent.some(e => e.order_id === P3), '다른 상점 결제는 거부');
  // 웹훅: 창을 닫아 복귀 확인이 없어도 결제 완료 처리
  o = await poOrder(); const P4 = o.orderId; po[P4] = { id: P4, status: 'PAID', amount: { total: 19900 }, currency: 'KRW', storeId: 'store-x', method: { type: 'PaymentMethodEasyPay', provider: 'KAKAOPAY' } };
  const hook = (body, headers = {}, e = penv) => webhook.onRequestPost({ request: new Request('https://x.test/api/commerce/webhook', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }), env: e });
  r = await hook({ type: 'Transaction.Paid', data: { paymentId: P4, storeId: 'store-x' } }); d = await r.json();
  ok(r.status === 200 && d.result === 'paid' && db.orders.find(x => x.order_id === P4).status === 'paid' && db.orders.find(x => x.order_id === P4).method === '간편결제(KAKAOPAY)', '웹훅: 결제 완료·권한');
  r = await hook({ type: 'Transaction.Paid', data: { paymentId: 'other_1' } }); d = await r.json(); ok(r.status === 200 && d.ignored, '웹훅: 우리 주문 아님은 무시');
  r = await hook({ type: 'Transaction.Cancelled', data: { paymentId: P4 } }); d = await r.json(); ok(d.ignored && db.orders.find(x => x.order_id === P4).status === 'paid', '위조 취소 알림은 무시(포트원 조회 기준)');
  // 서명
  const secret = 'whsec_' + Buffer.from('hook-secret-0123456789').toString('base64'), senv = { ...penv, PORTONE_WEBHOOK_SECRET: secret };
  const wbody = { type: 'Transaction.Paid', data: { paymentId: P4 } }, ts = String(Math.floor(Date.now() / 1000));
  const sig = require('crypto').createHmac('sha256', Buffer.from('hook-secret-0123456789')).update('msg_1.' + ts + '.' + JSON.stringify(wbody)).digest('base64');
  r = await hook(wbody, {}, senv); ok(r.status === 401, '웹훅 서명 없음 거절');
  r = await hook(wbody, { 'webhook-id': 'msg_1', 'webhook-timestamp': ts, 'webhook-signature': 'v1,' + (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1) }, senv); ok(r.status === 401, '웹훅 틀린 서명 거절');
  r = await hook(wbody, { 'webhook-id': 'msg_1', 'webhook-timestamp': String(+ts - 1000), 'webhook-signature': 'v1,' + sig }, senv); ok(r.status === 401, '오래된 웹훅 거절');
  r = await hook(wbody, { 'webhook-id': 'msg_1', 'webhook-timestamp': ts, 'webhook-signature': 'v0,xx v1,' + sig }, senv); ok(r.status === 200, '웹훅 맞는 서명 통과');
  // 관리자 취소: 포트원 주문은 포트원으로 취소
  poCalls = [];
  r = await admin.onRequestPost({ request: req('/api/commerce/admin', { adminPw: 'adm', body: { action: 'cancel', orderId: P4, reason: '테스트' } }), env: penv });
  ok(r.status === 200 && db.orders.find(x => x.order_id === P4).status === 'canceled' && poCalls.some(c => c.u.endsWith('/payments/' + P4 + '/cancel') && c.body.storeId === 'store-x') && !db.ent.some(e => e.order_id === P4 && !e.revoked_at), '관리자 취소: 포트원 취소·권한 회수');
  r = await admin.onRequestGet({ request: req('/api/commerce/admin', { adminPw: 'adm', method: 'GET' }), env: penv }); d = await r.json(); ok(d.configured.provider === 'portone' && d.configured.portone && !d.configured.portoneWebhook, '관리자 준비 상태: 포트원');
  // 포트원 콘솔에서 취소한 결제: 웹훅 취소 알림으로 권한 회수
  o = await poOrder(); const P5 = o.orderId; po[P5] = { id: P5, status: 'PAID', amount: { total: 19900 }, currency: 'KRW', storeId: 'store-x' };
  await hook({ type: 'Transaction.Paid', data: { paymentId: P5 } }); po[P5].status = 'CANCELLED';
  r = await hook({ type: 'Transaction.Cancelled', data: { paymentId: P5 } }); d = await r.json(); ok(d.canceled && db.orders.find(x => x.order_id === P5).status === 'canceled' && !db.ent.some(e => e.order_id === P5 && !e.revoked_at), '웹훅 취소: 권한 회수');

  // ── 키가 없으면 결제 API 는 'not-configured'
  const bare = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm' };
  r = await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-a', body: { productId: 'w2', sd } }), env: bare }); ok(r.status === 503, '키 없음: 주문 503');
  r = await access.onRequestPost({ request: req('/api/commerce/access', { body: { sd } }), env: bare }); d = await r.json(); ok(!d.configured.login && !d.configured.pay, '키 없음: 미설정 표시');
})().catch(e => ok(false, '실행 오류: ' + (e.stack || e.message))).then(() => {
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log('결제·잠금 검증 통과');
});
