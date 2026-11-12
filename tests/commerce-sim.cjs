// 무빙툰 결제·잠금 검증: node tests/commerce-sim.cjs
// 가짜 Supabase(REST·Auth)·가짜 토스·메모리 KV 로 functions/_commerce.js 와 /api/commerce/* 를 실행한다. 네트워크 호출 0.
const path = require('path'), url = require('url');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const C = await imp('functions/_commerce.js');
  const access = await imp('functions/api/commerce/access.js'), order = await imp('functions/api/commerce/order.js');
  const confirm = await imp('functions/api/commerce/confirm.js'), admin = await imp('functions/api/commerce/admin.js'), webhook = await imp('functions/api/commerce/webhook.js'), mine = await imp('functions/api/commerce/mine.js');
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
  const po = {}; let poCalls = []; const mails = [];   // 가짜 포트원: 결제 id → 결제 객체
  const USERS = { 'tok-a': { id: '00000000-0000-0000-0000-00000000000a', email: 'a@x.test' }, 'tok-b': { id: '00000000-0000-0000-0000-00000000000b', email: 'b@x.test' } };
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  const eqv = v => v && v.startsWith('eq.') ? v.slice(3) : null;
  const allq = (u, k) => [...u.matchAll(new RegExp('[?&]' + k + '=([^&]+)', 'g'))].map(m => decodeURIComponent(m[1]));
  const inRange = (u, k, v) => allq(u, k).every(c => c.startsWith('gte.') ? (v != null && v >= c.slice(4)) : c.startsWith('lt.') && k !== 'created_at' ? (v != null && v < c.slice(3)) : true);
  const testOk = (u, o) => { const t = q(u, 'is_test'); return !t || String(!!o.is_test) === eqv(t); };
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(), body = init.body ? JSON.parse(init.body) : null;
    const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    if (u.startsWith('https://api.resend.com/')) { mails.push({ to: body.to[0], subject: body.subject, html: body.html, kind: body.tags[0].value, auth: init.headers.authorization }); return res({ id: 'm' + mails.length }); }
    { const m = /\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/.exec(u); if (m) { const uu = Object.values(USERS).find(x => x.id === m[1]); return uu ? res(uu) : res({}, 404); } }
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
    if (u.includes('/rest/v1/member_sajus')) {
      db.sajus = db.sajus || [];
      if (method === 'POST') { for (const r of body) { const ex = db.sajus.find(x => x.user_id === r.user_id && x.saju_key === r.saju_key); if (ex) Object.assign(ex, r); else db.sajus.push({ ...r }); } return res(null, 201); }
      const rows = db.sajus.filter(x => (!q(u, 'user_id') || x.user_id === eqv(q(u, 'user_id'))) && (!q(u, 'saju_key') || x.saju_key === eqv(q(u, 'saju_key'))));
      if (method === 'DELETE') { db.sajus = db.sajus.filter(x => !rows.includes(x)); return res(null, 204); }
      return res(rows);
    }
    if (u.includes('/rest/v1/commerce_orders')) {
      if (method === 'POST') { db.orders.push({ status: 'pending', ...body }); return res(null, 201); }
      const lt = q(u, 'created_at'), rows = db.orders.filter(o => (!q(u, 'order_id') || o.order_id === eqv(q(u, 'order_id'))) && (!q(u, 'user_id') || o.user_id === eqv(q(u, 'user_id'))) && (!q(u, 'status') || o.status === eqv(q(u, 'status'))) && (!lt || (o.created_at && o.created_at < lt.slice(3))) && inRange(u, 'paid_at', o.paid_at) && inRange(u, 'canceled_at', o.canceled_at) && testOk(u, o));
      if (method === 'PATCH') { rows.forEach(o => Object.assign(o, body)); return ((init.headers && init.headers.prefer) || '').includes('representation') ? res(rows) : res(null, 204); }
      return res(rows);
    }
    if (u.includes('/rest/v1/commerce_entitlements')) {
      if (method === 'POST') { for (const r of body) if (!db.ent.some(e => e.user_id === r.user_id && e.saju_key === r.saju_key && e.world === r.world && e.order_id === r.order_id)) db.ent.push({ ...r, revoked_at: null }); return res(null, 201); }
      const oid = q(u, 'order_id'), inList = oid && oid.startsWith('in.(') ? oid.slice(4, -1).split(',') : null, fv = q(u, 'first_viewed_at');
      const rows = db.ent.filter(e => (!q(u, 'user_id') || e.user_id === eqv(q(u, 'user_id'))) && (!q(u, 'saju_key') || e.saju_key === eqv(q(u, 'saju_key'))) && (!q(u, 'world') || e.world === eqv(q(u, 'world')))
        && (!oid || (inList ? inList.includes(e.order_id) : e.order_id === eqv(oid))) && (q(u, 'revoked_at') !== 'is.null' || e.revoked_at == null)
        && (!fv || (fv === 'is.null' ? !e.first_viewed_at : !!e.first_viewed_at)));
      if (method === 'PATCH') { rows.forEach(e => Object.assign(e, body)); return res(null, 204); }
      if ((q(u, 'select') || '').includes('first_viewed_at')) return res(rows.map(e => ({ order_id: e.order_id, first_viewed_at: e.first_viewed_at })));
      return res(rows.map(e => ({ world: e.world, saju_key: e.saju_key })));
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

  // ── 오래된 결제 대기 주문 정리
  const ago = m => new Date(Date.now() - m * 60000).toISOString(), UA = USERS['tok-a'].id, UB = USERS['tok-b'].id;
  const mk = (id, min, user = UA) => db.orders.push({ order_id: id, user_id: user, saju_key: k1, product_id: 'w2', product_name: '재물운 심화', worlds: ['w2'], amount: 7800, status: 'pending', created_at: ago(min) });
  mk('mtoldnone1', 120); mk('mtoldready1', 120); mk('mtoldpaid1', 120); mk('mt_old_toss1', 120); mk('mtfresh1', 5); mk('mtoldb1', 120, UB);
  po.mtoldready1 = { id: 'mtoldready1', status: 'READY', amount: { total: 7800 }, currency: 'KRW', storeId: 'store-x' };
  po.mtoldpaid1 = { id: 'mtoldpaid1', status: 'PAID', amount: { total: 7800 }, currency: 'KRW', storeId: 'store-x', method: { type: 'PaymentMethodCard' } };
  const od = id => db.orders.find(x => x.order_id === id);
  let sw = await C.expirePending(penv, { userId: UA });
  ok(sw.checked === 4 && sw.expired === 3 && sw.paid === 1, '정리: 이 회원의 30분 넘은 대기 주문만(' + JSON.stringify(sw) + ')');
  ok(od('mtoldnone1').status === 'failed' && od('mtoldnone1').failure === 'expired' && od('mtoldready1').failure === 'expired' && od('mt_old_toss1').failure === 'expired', '결제 없는 주문·결제창만 연 주문·토스 주문은 만료');
  ok(od('mtoldpaid1').status === 'paid' && db.ent.some(e => e.order_id === 'mtoldpaid1' && e.world === 'w2'), '뒤늦게 결제된 포트원 주문은 완료 처리·권한');
  ok(od('mtfresh1').status === 'pending' && od('mtoldb1').status === 'pending', '30분 안 된 주문·다른 회원 주문은 그대로');
  sw = await C.expirePending(penv); ok(sw.expired === 1 && od('mtoldb1').failure === 'expired' && od('mtfresh1').status === 'pending', '관리자 정리: 모든 회원');
  // 만료 뒤에 결제가 들어오면(웹훅) 다시 살려 권한을 준다
  Object.assign(po.mtoldready1, { status: 'PAID', method: { type: 'PaymentMethodCard' } });
  r = await hook({ type: 'Transaction.Paid', data: { paymentId: 'mtoldready1' } }); d = await r.json();
  ok(d.result === 'paid' && od('mtoldready1').status === 'paid' && od('mtoldready1').failure === null && db.ent.some(e => e.order_id === 'mtoldready1'), '만료 주문에 늦게 온 결제: 완료로 되살림');
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: 'mtoldnone1' } }), env: penv }); ok(r.status === 502 && od('mtoldnone1').failure === 'expired', '결제 없는 만료 주문 확인 요청은 그대로');
  po.mtoldnone1 = { id: 'mtoldnone1', status: 'FAILED', amount: { total: 7800 }, currency: 'KRW', storeId: 'store-x' };
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: 'mtoldnone1' } }), env: penv }); ok(r.status === 400 && od('mtoldnone1').failure === 'expired', '실패 결제는 만료 표시 유지');
  r = await admin.onRequestGet({ request: req('/api/commerce/admin', { adminPw: 'adm', method: 'GET' }), env: penv }); d = await r.json(); ok(d.sweep && typeof d.sweep.checked === 'number', '관리자 목록이 정리 결과를 돌려줌');

  // ── 내 구매 내역: 본인 주문만, 결제 완료·취소·30분 안 된 대기만, 사주 식별값은 내려 보내지 않음
  r = await mine.onRequestPost({ request: req('/api/commerce/mine', { body: {} }), env: penv }); ok(r.status === 401, '내 구매 내역: 비회원 401');
  mk('mtfreshmine1', 3);
  r = await mine.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-a', body: {} }), env: penv }); d = await r.json();
  const ids = d.orders.map(o => o.order_id), all = db.orders.filter(o => o.user_id === UA);
  ok(r.status === 200 && d.member.email === 'a@x.test' && d.orders.length > 0, '내 구매 내역: 회원 200');
  ok(d.orders.every(o => all.some(a => a.order_id === o.order_id)) && !ids.includes('mtoldb1'), '본인 주문만');
  ok(d.orders.every(o => ['paid', 'canceled', 'partial_canceled', 'pending'].includes(o.status)) && !ids.includes('mtoldnone1') && ids.includes('mtfreshmine1') && ids.includes('mtoldpaid1'), '실패·만료 주문은 숨기고 결제 완료·최근 대기는 보임');
  ok(!JSON.stringify(d).includes(k1) && !JSON.stringify(d).includes('saju_key') && !JSON.stringify(d).includes(UA), '사주 식별값·회원 id 는 내려 보내지 않음');

  // ── 열람 기록·구매한 사주 저장
  const mineMod = await imp('functions/api/commerce/mine.js');
  const clean = C.cleanBirth({ year: 1992, month: 6, day: 23, hour: 14, minute: 5, gender: 'M', calendar: 'solar', name: '비밀', phone: '010', lon: 127.1 });
  ok(clean && clean.year === 1992 && clean.hour === 14 && !('name' in clean) && !('phone' in clean) && clean.lon === 127.1, '출생 입력 정리: 계산 칸만');
  ok(C.cleanBirth({ year: 'x' }) === null && C.cleanBirth(null) === null, '잘못된 출생 입력은 저장 안 함');
  o = await (await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-a', body: { productId: 'bundle', sd, label: '홍길동', birth: { year: 1992, month: 6, day: 23, hour: 14, gender: 'M', name: '빼야 함' } } }), env: penv })).json();
  const PV = o.orderId; po[PV] = { id: PV, status: 'PAID', amount: { total: 19900 }, currency: 'KRW', storeId: 'store-x', method: { type: 'PaymentMethodCard' } };
  ok(db.orders.find(x => x.order_id === PV).birth.year === 1992 && !('name' in db.orders.find(x => x.order_id === PV).birth), '주문에 정리된 출생 입력');
  r = await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-a', body: { paymentId: PV } }), env: penv });
  ok((db.sajus || []).some(x => x.user_id === UA && x.saju_key === k1 && x.birth.year === 1992 && x.label === '홍길동'), '결제가 끝나면 구매한 사주 저장');
  let mm = await (await mineMod.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-a', body: {} }), env: penv })).json();
  const pv = mm.orders.find(x => x.order_id === PV);
  ok(pv && pv.viewed_at === null && mm.sajus.length === 1 && mm.sajus[0].birth.year === 1992 && mm.sajus[0].worlds.includes('w2') && !JSON.stringify(mm).includes(k1), '내 구매 내역: 미열람·구매한 사주(식별값 없이)');
  // 유료 장을 열면 첫 열람 시각이 남고, 두 번째부터는 바뀌지 않음
  ok((await gate({ tok: 'tok-a' })).ok, '구매한 유료 장 열림');
  const firstView = db.ent.find(e => e.order_id === PV && e.world === 'w2').first_viewed_at;
  ok(!!firstView && !db.ent.find(e => e.order_id === PV && e.world === 'w7').first_viewed_at, '연 주제(w2)에만 첫 열람 기록');
  mm = await (await mineMod.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-a', body: {} }), env: penv })).json();
  ok(mm.orders.find(x => x.order_id === PV).viewed_at === firstView, '묶음은 한 주제만 열어도 열람');
  r = await admin.onRequestGet({ request: req('/api/commerce/admin', { adminPw: 'adm', method: 'GET' }), env: penv }); d = await r.json();
  ok(d.orders.find(x => x.order_id === PV).viewed_at === firstView, '관리자 주문 목록에 열람 시각');
  // 저장 삭제: 저장본·주문의 출생 입력 삭제, 구매는 유지
  r = await mineMod.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-a', body: { action: 'forget', ref: mm.sajus[0].ref } }), env: penv });
  ok(r.status === 200 && !(db.sajus || []).some(x => x.user_id === UA) && db.orders.find(x => x.order_id === PV).birth === null && (await gate({ tok: 'tok-a' })).ok, '저장 삭제: 출생 정보만 지우고 구매 유지');
  r = await mineMod.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-b', body: { action: 'forget', ref: 'deadbeef' } }), env: penv }); ok(r.status === 404, '남의 저장은 못 지움');

  // ── 고객 바로 환불: 본인·결제 완료·7일 이내·미열람만, 결제사 취소 + 권한 회수
  ok(C.refundCheck({ status: 'paid', paid_at: new Date().toISOString() }, null).ok && C.refundCheck({ status: 'paid', paid_at: new Date(Date.now() - 8 * 86400000).toISOString() }, null).reason === 'over-7-days'
    && C.refundCheck({ status: 'paid', paid_at: new Date().toISOString() }, '2026-11-11T00:00:00Z').reason === 'viewed' && C.refundCheck({ status: 'canceled' }, null).reason === 'not-paid', '환불 조건 판단');
  const ref = (tok, orderId) => mineMod.onRequestPost({ request: req('/api/commerce/mine', { tok, body: { action: 'refund', orderId } }), env: penv });
  r = await ref('tok-a', PV); d = await r.json(); ok(r.status === 409 && d.reason === 'viewed', '열람한 주문은 바로 환불 안 됨');
  o = await (await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-b', body: { productId: 'w2', sd } }), env: penv })).json();
  const PR = o.orderId; po[PR] = { id: PR, status: 'PAID', amount: { total: 9900 }, currency: 'KRW', storeId: 'store-x', method: { type: 'PaymentMethodCard' } };
  await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-b', body: { paymentId: PR } }), env: penv });
  db.ent.filter(e => e.order_id === PR).forEach(e => { e.first_viewed_at = null; });
  r = await ref('tok-a', PR); ok(r.status === 404, '남의 주문은 환불 못 함');
  poCalls = []; r = await ref('tok-b', PR); d = await r.json();
  ok(r.status === 200 && d.ok && db.orders.find(x => x.order_id === PR).status === 'canceled' && poCalls.some(c => c.u.endsWith('/payments/' + PR + '/cancel')) && !db.ent.some(e => e.order_id === PR && !e.revoked_at), '미열람·7일 이내: 바로 환불(포트원 취소·권한 회수)');
  r = await ref('tok-b', PR); d = await r.json(); ok(r.status === 409 && d.reason === 'not-paid', '이미 환불한 주문은 다시 안 됨');
  const old = db.orders.find(x => x.order_id === P4); // 관리자 취소도 같은 함수(이미 취소된 주문은 거부)
  r = await admin.onRequestPost({ request: req('/api/commerce/admin', { adminPw: 'adm', body: { action: 'cancel', orderId: P4 } }), env: penv }); ok(r.status === 409 && old.status === 'canceled', '관리자: 취소된 주문 재취소 거부');

  // ── 판매 준비 점검: 마지막 결제의 채널 종류·웹훅 수신을 신호로
  po[PV].channel = { type: 'TEST', pgProvider: 'KPN' };
  o = await (await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-b', body: { productId: 'bundle', sd } }), env: penv })).json();
  const PS = o.orderId; po[PS] = { id: PS, status: 'PAID', amount: { total: 19900 }, currency: 'KRW', storeId: 'store-x', channel: { type: 'TEST', pgProvider: 'PG_PROVIDER_KPN', name: 'KPN 테스트' }, method: { type: 'PaymentMethodCard' } };
  await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-b', body: { paymentId: PS } }), env: penv });
  r = await admin.onRequestGet({ request: req('/api/commerce/admin', { adminPw: 'adm', method: 'GET' }), env: penv }); d = await r.json();
  const rd = Object.fromEntries(d.readiness.map(x => [x.id, x]));
  ok(rd.provider.ok === true && rd['live-channel'].ok === false && /TEST/.test(rd['live-channel'].note) && rd.products.ok === true && rd.worlds.ok === true, '판매 준비 점검: 테스트 채널이면 실연동 경고');
  ok(rd.webhook.ok === true && rd['webhook-secret'].ok === false, '웹훅 수신 기록(앞선 웹훅 시험)·서명 시크릿 미설정 표시');
  { const kvKey = 'commerce:signal:portone-webhook'; const before = store.get(kvKey); store.delete(kvKey); await hook({ type: 'Transaction.Paid', data: { paymentId: 'mtnotours12345' } }); ok(!store.has(kvKey), '우리 주문이 아닌 알림은 웹훅 수신으로 안 셈'); if (before) store.set(kvKey, before); }
  po[PS].channel.type = 'LIVE'; o = await (await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-b', body: { productId: 'w2', sd: { ...sd, gender: 'F' } } }), env: penv })).json();
  po[o.orderId] = { ...po[PS], id: o.orderId, amount: { total: 9900 } }; await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-b', body: { paymentId: o.orderId } }), env: penv });
  d = await (await admin.onRequestGet({ request: req('/api/commerce/admin', { adminPw: 'adm', method: 'GET' }), env: penv })).json();
  ok(d.readiness.find(x => x.id === 'live-channel').ok === true, '실연동 결제가 확인되면 ✅');
  ok(!JSON.stringify(d.readiness).includes('po-secret-x'), '점검 결과에 비밀값 없음');

  // ── 거래 메일(Resend): 결제 완료·환불 때 한 번씩, 키 없으면 안 보냄
  ok(mails.length === 0, '메일 키가 없으면 보내지 않음');
  const mailEnv = { ...penv, RESEND_API_KEY: 're_test' };
  o = await (await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-b', body: { productId: 'w2', sd: { ...sd, pillars: { ...sd.pillars, hour: { hanja: '甲子' } } }, label: '테스트' } }), env: mailEnv })).json();
  const PM = o.orderId; po[PM] = { id: PM, status: 'PAID', amount: { total: 9900 }, currency: 'KRW', storeId: 'store-x', method: { type: 'PaymentMethodCard' }, paidAt: '2026-11-12T01:00:00Z' };
  await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-b', body: { paymentId: PM } }), env: mailEnv });
  await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-b', body: { paymentId: PM } }), env: mailEnv });
  await webhook.onRequestPost({ request: new Request('https://x.test/api/commerce/webhook', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'Transaction.Paid', data: { paymentId: PM } }) }), env: mailEnv });
  const pm = mails.filter(m => m.kind === 'purchase');
  ok(pm.length === 1 && pm[0].to === 'b@x.test' && pm[0].auth === 'Bearer re_test' && pm[0].subject.includes('재물운 심화') && pm[0].html.includes(PM) && pm[0].html.includes('9,900원') && pm[0].html.includes('775-24-01924') && pm[0].html.includes('바로 환불'), '구매 확인 메일 한 번(확인 두 번·웹훅 겹쳐도)');
  r = await mineMod.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-b', body: { action: 'refund', orderId: PM } }), env: mailEnv });
  r = await mineMod.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-b', body: { action: 'refund', orderId: PM } }), env: mailEnv });
  const rm = mails.filter(m => m.kind === 'refund');
  ok(rm.length === 1 && rm[0].to === 'b@x.test' && rm[0].subject.includes('환불') && rm[0].html.includes('3~7'), '환불 완료 메일 한 번');

  // ── 영수증·관리자 알림 메일
  ok(!mails.some(m => m.kind.startsWith('admin-')), '관리자 주소가 없으면 관리자 알림 안 보냄');
  const MAIL = await imp('functions/_mail.js');
  const alertEnv = { ...penv, RESEND_API_KEY: 're_test', ADMIN_ALERT_EMAIL: 'boss@x.test, ops@x.test' };
  o = await (await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-b', body: { productId: 'w2', sd: { ...sd, pillars: { ...sd.pillars, hour: { hanja: '丙寅' } } }, label: '알림' } }), env: alertEnv })).json();
  const PA = o.orderId; po[PA] = { id: PA, status: 'PAID', amount: { total: o.amount || db.orders.find(x => x.order_id === PA).amount }, currency: 'KRW', storeId: 'store-x', channel: { type: 'LIVE' }, method: { type: 'PaymentMethodCard' }, receiptUrl: 'https://receipt.portone.test/r/' + PA };
  const nMail = mails.length;
  await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-b', body: { paymentId: PA } }), env: alertEnv });
  await confirm.onRequestPost({ request: req('/api/commerce/confirm', { tok: 'tok-b', body: { paymentId: PA } }), env: alertEnv });
  const after = mails.slice(nMail), buy = after.find(m => m.kind === 'purchase'), adm = after.filter(m => m.kind === 'admin-paid');
  ok(buy && buy.html.includes('https://receipt.portone.test/r/' + PA) && buy.html.includes('카드 매출전표'), '구매 확인 메일에 영수증 링크');
  ok(adm.length === 2 && adm.map(m => m.to).sort().join() === 'boss@x.test,ops@x.test' && adm[0].subject.includes('새 결제') && adm[0].html.includes(PA) && !adm[0].html.includes('b@x.test') && adm[0].html.includes('/report/admin/'), '관리자 결제 알림: 주소마다 한 번(확인 두 번 와도), 고객 이메일 없음');
  r = await mine.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-b', body: {} }), env: alertEnv }); d = await r.json();
  { const mo = d.orders.find(x => x.order_id === PA); ok(mo && mo.receipt === true && !('payment_key' in mo), '내 구매 내역: 영수증 표시(결제 키는 안 내려감)'); }
  r = await mine.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-b', body: { action: 'receipt', orderId: PA } }), env: alertEnv }); d = await r.json();
  ok(r.status === 200 && d.url === 'https://receipt.portone.test/r/' + PA, '영수증 주소 받기');
  r = await mine.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-a', body: { action: 'receipt', orderId: PA } }), env: alertEnv }); ok(r.status === 404, '남의 주문 영수증은 안 됨');
  po[PA].receiptUrl = 'javascript:alert(1)'; r = await mine.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-b', body: { action: 'receipt', orderId: PA } }), env: alertEnv }); ok(r.status === 404, 'https 가 아닌 영수증 주소는 버림');
  ok(MAIL.safeHttps('http://x.test') === null && MAIL.safeHttps('https://x.test/a') === 'https://x.test/a', 'https 만 허용');
  const nM2 = mails.length;
  await mine.onRequestPost({ request: req('/api/commerce/mine', { tok: 'tok-b', body: { action: 'refund', orderId: PA } }), env: alertEnv });
  const admR = mails.slice(nM2).filter(m => m.kind === 'admin-refund');
  ok(admR.length === 2 && admR[0].subject.includes('환불') && admR[0].html.includes('고객 바로 환불'), '관리자 환불 알림(사유 포함)');
  const nM3 = mails.length, fake = { order_id: 'mtfail1234567', product_name: '재물운 심화', amount: 9900, is_test: true };
  await MAIL.mailAdmin(alertEnv, 'grant-failed', fake, { detail: 'x' }); await MAIL.mailAdmin(alertEnv, 'grant-failed', fake, { detail: 'x' });
  const gf = mails.slice(nM3);
  ok(gf.length === 2 && gf[0].subject.includes('권한 기록 실패') && gf[0].subject.startsWith('[관리자] [테스트] ') && gf[0].html.includes('권한 다시 주기'), '실패 경보: 할 일 안내·테스트 표시, 같은 주문은 하루 한 번');
  d = await (await admin.onRequestGet({ request: req('/api/commerce/admin', { adminPw: 'adm', method: 'GET' }), env: alertEnv })).json();
  ok(d.readiness.find(x => x.id === 'admin-alert').ok === true && !JSON.stringify(d.readiness).includes('boss@x.test'), '점검표: 관리자 알림 켜짐(주소는 안 보임)');

  // ── 테스트 주문 표시·매출 요약·CSV
  const SL = await imp('functions/_sales.js');
  ok(db.orders.find(x => x.order_id === PS).is_test === true, '포트원 테스트 채널 결제는 테스트 주문으로 자동 표시');
  const liveO = db.orders.find(x => String(x.payment_key || '').startsWith('portone:') && x.is_test === false && x.status === 'paid');
  ok(!!liveO, '실연동 채널 결제는 테스트 아님');
  ok(db.orders.filter(x => String(x.payment_key || '').startsWith('pk') || (x.payment_key && !String(x.payment_key).startsWith('portone:'))).every(x => x.is_test === true), '토스 테스트 키 결제는 테스트 주문');
  { const kr = SL.kstRanges(Date.parse('2026-11-12T16:00:00Z'));   // 한국 시간 11-13(금) 01:00
    ok(kr.today.from === '2026-11-12T15:00:00.000Z' && kr.week.from === '2026-11-08T15:00:00.000Z' && kr.week.to === '2026-11-15T15:00:00.000Z' && kr.month.from === '2026-10-31T15:00:00.000Z' && kr.month.to === '2026-11-30T15:00:00.000Z', '한국 시간 오늘·이번 주(월요일)·이번 달 범위');
    ok(SL.kstDay('2026-11-01') === '2026-10-31T15:00:00.000Z' && SL.kstDay('2026-11-30', true) === '2026-11-30T15:00:00.000Z' && SL.kstDay('2026/11/01') === null, '날짜 입력(KST) 변환'); }
  const ALL = [SL.kstDay('2000-01-01'), SL.kstDay('2100-12-31', true)];
  const want = () => { const real = db.orders.filter(x => !x.is_test); return { gross: real.filter(x => x.paid_at).reduce((a, x) => a + x.amount, 0), refund: real.filter(x => x.canceled_at).reduce((a, x) => a + x.amount, 0), n: real.filter(x => x.paid_at).length }; };
  let sm = await SL.summarize(penv, ...ALL), w = want();
  ok(sm.gross === w.gross && sm.refundAmount === w.refund && sm.net === w.gross - w.refund && sm.orders === w.n && w.n > 0, '매출 요약: 테스트 제외 매출·환불·실매출');
  ok(Object.values(sm.products).reduce((a, p) => a + p.count, 0) === sm.orders, '상품별 건수 합 = 매출 건수');
  r = await admin.onRequestPost({ request: req('/api/commerce/admin', { adminPw: 'adm', body: { action: 'set-test', orderId: liveO.order_id, isTest: true } }), env: penv });
  ok(r.status === 200 && liveO.is_test === true, '관리자: 테스트로 표시');
  const sm2 = await SL.summarize(penv, ...ALL); ok(sm2.gross === sm.gross - liveO.amount, '테스트로 표시하면 매출에서 빠짐');
  await admin.onRequestPost({ request: req('/api/commerce/admin', { adminPw: 'adm', body: { action: 'set-test', orderId: liveO.order_id, isTest: false } }), env: penv });
  ok(liveO.is_test === false && (await SL.summarize(penv, ...ALL)).gross === sm.gross, '테스트 해제하면 다시 매출');
  d = await (await admin.onRequestGet({ request: req('/api/commerce/admin', { adminPw: 'adm', method: 'GET' }), env: penv })).json();
  ok(d.sales && d.sales.today && d.sales.week && d.sales.month && d.sales.month.label === '이번 달' && d.orders.some(x => 'is_test' in x), '관리자 화면: 오늘·이번 주·이번 달 요약과 테스트 표시');
  r = await admin.onRequestGet({ request: req('/api/commerce/admin?export=csv&from=2000-01-01&to=2100-12-31', { adminPw: 'adm', method: 'GET' }), env: penv });
  const csvBytes = new Uint8Array(await r.arrayBuffer()); let csv = '﻿' + new TextDecoder('utf-8', { ignoreBOM: false }).decode(csvBytes);
  ok(csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf, 'CSV 첫 바이트가 BOM(엑셀 한글)');
  ok(r.status === 200 && r.headers.get('content-type').includes('text/csv') && /attachment; filename="sales_2000-01-01_2100-12-31.csv"/.test(r.headers.get('content-disposition')), 'CSV 응답 머리');
  ok(csv.charCodeAt(0) === 0xfeff && csv.includes('주문번호,결제 일시(KST),상품,결제 금액,공급가액,부가세'), 'CSV: 엑셀용 BOM·머리줄');
  ok(csv.includes(liveO.order_id) && csv.includes(',9900,9000,900,') && !csv.includes(PS), 'CSV: 공급가액·부가세, 테스트 주문 제외');
  ok(csv.includes('환불(취소)') && csv.includes('포트원'), 'CSV: 환불 주문·결제사');
  csv = await (await admin.onRequestGet({ request: req('/api/commerce/admin?export=csv&from=2000-01-01&to=2100-12-31&test=1', { adminPw: 'adm', method: 'GET' }), env: penv })).text();
  ok(csv.includes(PS) && csv.includes(',예\r\n'), 'CSV: 테스트 포함 선택');
  r = await admin.onRequestGet({ request: req('/api/commerce/admin?export=csv&from=2026-11-30&to=2026-11-01', { adminPw: 'adm', method: 'GET' }), env: penv }); ok(r.status === 400, 'CSV: 기간이 거꾸로면 거부');
  r = await admin.onRequestGet({ request: req('/api/commerce/admin?export=csv&from=2000-01-01&to=2100-12-31', { method: 'GET' }), env: penv }); ok(r.status === 401, 'CSV: 관리자만');

  // ── 키가 없으면 결제 API 는 'not-configured'
  const bare = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm' };
  r = await order.onRequestPost({ request: req('/api/commerce/order', { tok: 'tok-a', body: { productId: 'w2', sd } }), env: bare }); ok(r.status === 503, '키 없음: 주문 503');
  r = await access.onRequestPost({ request: req('/api/commerce/access', { body: { sd } }), env: bare }); d = await r.json(); ok(!d.configured.login && !d.configured.pay, '키 없음: 미설정 표시');
})().catch(e => ok(false, '실행 오류: ' + (e.stack || e.message))).then(() => {
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log('결제·잠금 검증 통과');
});
