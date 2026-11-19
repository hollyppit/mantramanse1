// 인연의 광장 크레딧 자동 충전(정기결제) 검증: node tests/autotopup-sim.cjs
// 가짜 Supabase·가짜 포트원(빌링키·빌링키 결제)·메모리 KV 로 /api/community/autotopup 과 크레딧 사용 뒤 자동 충전을 실행한다. 네트워크 호출 0.
// 보는 것: 채널 키·유료 스위치·동의·본인확인 없으면 막힘 · 남의 빌링키 거절 · 빌링키는 화면에 안 나감 · 기준 미만일 때만 결제
//          한 달 최대 횟수 · 겹쳐 불러도 한 번 · 연속 3번 실패하면 멈춤+메일 · 해지하면 포트원 빌링키 삭제·더 결제 안 함 · 크레딧 사용 직후 자동 충전
const path = require('path'), url = require('url');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const AT = await imp('functions/_autotopup.js');
  const api = await imp('functions/api/community/autotopup.js'), credits = await imp('functions/api/community/credits.js'), admin = await imp('functions/api/commerce/admin.js');
  const { DOCS } = await imp('functions/_consent.js');
  const M = await imp('functions/_mail.js');

  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
  const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b';
  const USERS = { 'tok-a': { id: A, email: 'a@x.test' }, 'tok-b': { id: B, email: 'b@x.test' } };
  const db = { orders: [], ledger: [], consents: [], verif: [], auto: [], mails: [] };
  const keys = { 'billing-key-a1': { status: 'ISSUED', storeId: 'store-1', customer: { id: A }, methods: [{ type: 'BillingKeyPaymentMethodCard', card: { name: '신한카드', number: '1234-56**-****-7890' } }] }, 'billing-key-a2': { status: 'ISSUED', storeId: 'store-1', customer: { id: A }, methods: [{ card: { publisher: '하나카드', number: '****1111' } }] }, 'billing-key-b': { status: 'ISSUED', storeId: 'store-1', customer: { id: B }, methods: [] } };
  const po = {}; let charges = [], deleted = [], payFail = false;
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  const eqv = v => v && v.startsWith('eq.') ? v.slice(3) : null;
  const bal = uid => db.ledger.filter(l => l.user_id === uid).reduce((s, l) => s + l.delta, 0);
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(), body = init.body ? JSON.parse(init.body) : null;
    const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    if (u.startsWith('https://api.resend.com/')) { db.mails.push(body); return res({ id: 'm' }); }
    { const m = /\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/.exec(u); if (m) { const uu = Object.values(USERS).find(x => x.id === m[1]); return uu ? res(uu) : res({}, 404); } }
    if (u.includes('/auth/v1/user')) { const t = (init.headers.authorization || '').slice(7); return USERS[t] ? res(USERS[t]) : res({}, 401); }
    if (u.startsWith('https://api.portone.io/billing-keys/')) {
      const id = decodeURIComponent(/billing-keys\/([^?]+)/.exec(u)[1]);
      if (method === 'DELETE') { deleted.push(id); if (keys[id]) keys[id].status = 'DELETED'; return res({ deletedAt: 'now' }); }
      return keys[id] ? res(keys[id]) : res({ type: 'BILLING_KEY_NOT_FOUND' }, 404);
    }
    if (u.startsWith('https://api.portone.io/payments/')) {
      const m = /payments\/([^/?]+)(\/billing-key|\/cancel)?/.exec(u), id = decodeURIComponent(m[1]);
      if (m[2] === '/billing-key') {
        charges.push({ id, body });
        if (payFail || keys[body.billingKey].status !== 'ISSUED') return res({ type: 'PG_PROVIDER_ERROR', message: '한도 초과' }, 400);
        po[id] = { status: 'PAID', amount: { total: body.amount.total }, currency: 'KRW', storeId: 'store-1', method: { type: 'PaymentMethodCard' }, paidAt: new Date().toISOString(), channel: { type: 'TEST' } };
        return res({ payment: { pgTxId: 'x', paidAt: po[id].paidAt } });
      }
      if (m[2] === '/cancel') return res({ cancellation: { status: 'SUCCEEDED' } });
      return po[id] ? res(po[id]) : res({ type: 'PAYMENT_NOT_FOUND' }, 404);
    }
    if (u.includes('/rest/v1/rpc/cm_credit_balance')) return res(bal(body.p_user));
    if (u.includes('/rest/v1/rpc/cm_credit_grant')) {
      if (!db.ledger.some(l => l.idem_key === body.p_idem)) db.ledger.push({ id: db.ledger.length + 1, user_id: body.p_user, delta: body.p_amount, reason: body.p_reason, ref: body.p_ref, idem_key: body.p_idem, created_at: new Date().toISOString() });
      return res({ ok: true, balance: bal(body.p_user) });
    }
    if (u.includes('/rest/v1/rpc/cm_credit_spend')) {
      if (db.ledger.some(l => l.idem_key === body.p_idem)) return res({ ok: true, dup: true, balance: bal(body.p_user) });
      if (bal(body.p_user) < body.p_amount) return res({ ok: false, error: 'insufficient', balance: bal(body.p_user) });
      db.ledger.push({ id: db.ledger.length + 1, user_id: body.p_user, delta: -body.p_amount, reason: body.p_reason, ref: body.p_ref, idem_key: body.p_idem, created_at: new Date().toISOString() });
      return res({ ok: true, balance: bal(body.p_user) });
    }
    if (u.includes('/rest/v1/cm_autotopup')) {
      if (method === 'POST') { const i = db.auto.findIndex(r => r.user_id === body.user_id); const row = { fail_count: 0, ...(i >= 0 ? db.auto[i] : {}), ...body }; if (i >= 0) db.auto[i] = row; else db.auto.push(row); return res([row]); }
      let rows = db.auto.filter(r => !q(u, 'user_id') || r.user_id === eqv(q(u, 'user_id')));
      if (q(u, 'active') === 'is.true') rows = rows.filter(r => r.active);
      const or = q(u, 'or'); if (or) { const lt = /charging_at\.lt\.([^)]+)\)/.exec(or)[1]; rows = rows.filter(r => !r.charging_at || r.charging_at < lt); }
      if (method === 'PATCH') { rows.forEach(r => Object.assign(r, body)); return res(rows.map(r => ({ ...r }))); }
      return res(rows.map(r => ({ ...r })));
    }
    if (u.includes('/rest/v1/cm_credit_ledger')) return res(db.ledger.filter(l => (!q(u, 'user_id') || l.user_id === eqv(q(u, 'user_id'))) && (!q(u, 'idem_key') || l.idem_key === eqv(q(u, 'idem_key'))) && (!q(u, 'reason') || l.reason === eqv(q(u, 'reason'))) && (!q(u, 'ref') || l.ref === eqv(q(u, 'ref')))).slice().reverse());
    if (u.includes('/rest/v1/member_consents')) return res(db.consents.filter(c => c.user_id === eqv(q(u, 'user_id'))));
    if (u.includes('/rest/v1/adult_verifications')) return res(db.verif.filter(c => c.user_id === eqv(q(u, 'user_id'))));
    if (u.includes('/rest/v1/admin_audit_log')) return res(null, 201);
    if (u.includes('/rest/v1/cm_match_profiles')) return res([{ user_id: A, active: true }]);
    if (u.includes('/rest/v1/cm_daily_picks')) return method === 'POST' ? res(null, 201) : res([]);
    if (u.includes('/rest/v1/commerce_orders')) {
      if (method === 'POST') { db.orders.push({ status: 'pending', created_at: new Date().toISOString(), ...body }); return res(null, 201); }
      let rows = db.orders.filter(o => (!q(u, 'order_id') || o.order_id === eqv(q(u, 'order_id'))) && (!q(u, 'user_id') || o.user_id === eqv(q(u, 'user_id'))));
      const st = q(u, 'status'); if (st && st.startsWith('eq.')) rows = rows.filter(o => o.status === st.slice(3)); if (st && st.startsWith('in.(')) rows = rows.filter(o => st.slice(4, -1).split(',').includes(o.status));
      if (q(u, 'auto_topup') === 'is.true') rows = rows.filter(o => o.auto_topup);
      const ca = q(u, 'created_at'); if (ca && ca.startsWith('gte.')) rows = rows.filter(o => o.created_at >= ca.slice(4));
      if (method === 'PATCH') { rows.forEach(o => Object.assign(o, body)); return ((init.headers && init.headers.prefer) || '').includes('representation') ? res(rows) : res(null, 204); }
      return res(rows);
    }
    if (u.includes('/rest/v1/kv')) return res([]);
    return res([]);
  };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm', SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', PORTONE_STORE_ID: 'store-1', PORTONE_CHANNEL_KEY: 'ch-1', PORTONE_API_SECRET: 'posecret', RESEND_API_KEY: 're' };
  const req = (u, { tok, adminPw, body, method = 'POST' } = {}) => new Request('https://x.test' + u, { method, headers: { 'content-type': 'application/json', ...(tok ? { 'x-member-token': tok } : {}), ...(adminPw ? { authorization: 'Bearer ' + adminPw } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const pending = []; const waitUntil = p => pending.push(p); const flush = async () => { while (pending.length) await pending.shift(); };
  const call = async (mod, fn, u, opts) => { const r = await mod[fn]({ request: req(u, opts), env, waitUntil }); await flush(); return { s: r.status, d: await r.json() }; };
  const G = tok => call(api, 'onRequestGet', '/api/community/autotopup', { tok, method: 'GET' });
  const P = (tok, body) => call(api, 'onRequestPost', '/api/community/autotopup', { tok, body });
  const reg = (tok, extra = {}) => P(tok, { action: 'register', billingKey: 'billing-key-a1', packId: 'cr10', threshold: 3, monthlyLimit: 2, agree: true, ...extra });
  const autoOrders = () => db.orders.filter(o => o.auto_topup);

  // ── 순수 함수
  ok(AT.kstMonthStart(Date.parse('2026-11-30T16:00:00Z')) === '2026-11-30T15:00:00.000Z', 'KST 달 시작: 12월 1일 01시(KST)면 12월');
  ok(AT.kstMonthStart(Date.parse('2026-11-19T00:00:00Z')) === '2026-10-31T15:00:00.000Z', 'KST 달 시작: 11월');
  ok(!AT.cleanAuto({ packId: 'cr999', threshold: 3, monthlyLimit: 2 }) && !AT.cleanAuto({ packId: 'cr10', threshold: 3, monthlyLimit: 99 }) && AT.cleanAuto({ packId: 'cr30', threshold: '5', monthlyLimit: 1 }).threshold === 5, '설정 값 검사');
  ok(AT.cardLabel(keys['billing-key-a1']) === '신한카드 ····7890' && AT.cardLabel({}) === '등록한 카드', '카드 표시: 끝 4자리만');

  // ── 준비 안 됨: 정기결제 채널 키 없음 → 기능 숨김
  let r = await G('tok-a'); ok(r.d.available === false, '채널 키 없으면 자동 충전 안 보임');
  r = await P('tok-a', { action: 'cancel' }); ok(r.s === 503, '채널 키 없으면 요청 거절');
  env.PORTONE_BILLING_CHANNEL_KEY = 'ch-billing';
  r = await G('tok-a'); ok(r.d.available === false, '유료 스위치 꺼짐: 안 보임');
  await call(admin, 'onRequestPut', '/api/commerce/admin', { adminPw: 'adm', method: 'PUT', body: { products: [{ id: 'cr10', price: 5000 }, { id: 'cr30', price: 13000 }] } });
  await call(credits, 'onRequestPut', '/api/community/credits', { adminPw: 'adm', method: 'PUT', body: { enabled: true, confirm: '유료 켜기' } });
  r = await G('tok-a'); ok(r.d.available && r.d.pay.channelKey === 'ch-billing' && r.d.customerId === A && r.d.packs.length === 2 && r.d.setting === null, '켜짐: 정기결제 채널·판매 묶음·설정 없음');
  r = await G(null); ok(r.s === 401, '비로그인 거절');

  // ── 등록 조건: 동의 → 본인확인 → 동의 체크 → 내 빌링키
  r = await reg('tok-a'); ok(r.s === 409 && r.d.need === 'consent', '동의 없으면 등록 불가');
  db.consents.push({ user_id: A, kind: 'terms', agreed: true, version: DOCS.terms.version }, { user_id: A, kind: 'privacy', agreed: true, version: DOCS.privacy.version });
  r = await reg('tok-a'); ok(r.s === 403 && r.d.need === 'verify', '본인확인 없으면 등록 불가');
  db.verif.push({ user_id: A, provider: 'portone', birth_year: 1990, gender: 'M', verified_at: '2026-11-16T00:00:00Z' });
  r = await reg('tok-a', { agree: false }); ok(r.s === 400 && db.auto.length === 0, '자동 결제 동의 없으면 등록 불가');
  r = await reg('tok-a', { packId: 'cr100' }); ok(r.s === 400, '판매 안 하는 묶음 거절');
  r = await reg('tok-a', { billingKey: 'billing-key-b' }); ok(r.s === 400 && db.auto.length === 0, '남의 빌링키 거절');
  r = await reg('tok-a', { billingKey: 'billing-key-nope' }); ok(r.s === 400, '없는 빌링키 거절');

  // ── 등록: 잔액 0 < 기준 3 → 바로 1회 충전
  r = await reg('tok-a');
  ok(r.s === 200 && r.d.charged && bal(A) === 10 && charges.length === 1 && charges[0].body.billingKey === 'billing-key-a1' && charges[0].body.amount.total === 5000 && charges[0].body.customer.id === A, '등록 즉시 1회 충전(서버 금액)');
  ok(autoOrders().length === 1 && autoOrders()[0].status === 'paid' && /자동 충전/.test(autoOrders()[0].product_name), '주문 표: 자동 충전 표시·결제 완료');
  ok(!JSON.stringify(r.d).includes('billing-key-a1') && r.d.setting.card === '신한카드 ····7890' && r.d.setting.usedThisMonth === 1, '응답에 빌링키 없음·카드 끝자리·이번 달 1회');
  ok(db.mails.some(m => /자동 충전이 설정/.test(m.subject)) && db.mails.some(m => /구매가 완료/.test(m.subject) && /자동 충전/.test(m.html)), '설정 메일·구매 메일(자동 충전 표시)');
  r = await G('tok-a'); ok(!JSON.stringify(r.d).includes('billing-key-a1') && r.d.setting.active, '조회에도 빌링키 없음');

  // ── 기준 이상이면 결제 안 함
  let x = await AT.maybeAutoTopup(env, A); ok(x.skipped === 'enough' && charges.length === 1, '잔액 충분: 결제 안 함');
  const use = (k, d) => db.ledger.push({ id: 900 + db.ledger.length, user_id: A, delta: -d, reason: 'more_picks', ref: 'd', idem_key: 'mp:' + k, created_at: new Date().toISOString() });
  use('t1', 7); x = await AT.maybeAutoTopup(env, A); ok(x.skipped === 'enough' && bal(A) === 3 && charges.length === 1, '잔액이 기준과 같음(3): 결제 안 함(미만일 때만)');
  // 크레딧 사용 API(더 보기 3개) → 잔액 0 → 응답과 따로 자동 충전
  const C = await imp('functions/_credits.js');
  const sp = await C.spend(env, A, 3, 'more_picks', 'd', 'mp:req-00001'); AT.afterSpend(env, A, waitUntil); await flush();
  ok(sp.ok && charges.length === 2 && bal(A) === 10, '크레딧 사용 직후 자동 충전(waitUntil)');
  const fs = require('fs'), src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  ok(/spend\([^)]*'more_picks'[\s\S]{0,400}afterSpend\(env, me\.id, waitUntil\)/.test(src('functions/api/community/credits.js')), '더 보기 사용 뒤 자동 충전 연결');
  ok(/spend\([^)]*'extra_like'[\s\S]{0,400}afterSpend\(env, w\.me\.id, waitUntil\)/.test(src('functions/api/community/match.js')), '추가 인연 잇기 사용 뒤 자동 충전 연결');
  // 한 달 최대 2회: 이번 달 이미 2회 → 더 결제 안 함
  use('t2', 10); x = await AT.maybeAutoTopup(env, A); ok(x.skipped === 'limit' && charges.length === 2, '한 달 최대 횟수 도달: 결제 안 함');
  r = await G('tok-a'); ok(r.d.setting.usedThisMonth === 2, '이번 달 2/2회 표시');
  // 지난달 주문은 세지 않는다
  autoOrders().forEach(o => { o.created_at = '2026-01-15T00:00:00Z'; });
  // 겹쳐 불러도 결제는 한 번(잠금)
  const both = await Promise.all([AT.maybeAutoTopup(env, A), AT.maybeAutoTopup(env, A)]);
  ok(charges.length === 3 && bal(A) === 10 && both.filter(v => v.charged).length === 1, '동시에 두 번: 결제 한 번');
  ok(db.auto[0].charging_at === null && db.auto[0].fail_count === 0, '결제 뒤 잠금 풀림');
  // 오래된 잠금(3분 넘음)은 풀린 것으로 본다
  db.auto[0].charging_at = new Date(Date.now() - 10 * 60000).toISOString(); use('t3', 10);
  x = await AT.maybeAutoTopup(env, A); ok(x.charged && charges.length === 4, '3분 넘은 잠금은 무시');
  // 아직 결제 중(1분 전 잠금) → 건너뜀
  autoOrders().forEach(o => { o.created_at = '2026-01-15T00:00:00Z'; }); use('t4', 10);
  db.auto[0].charging_at = new Date(Date.now() - 60000).toISOString();
  x = await AT.maybeAutoTopup(env, A); ok(x.skipped === 'busy' && charges.length === 4, '결제 중이면 건너뜀');
  db.auto[0].charging_at = null;

  // ── 연속 실패 3번 → 멈춤 + 메일, 실패 주문은 횟수에 안 셈
  payFail = true; db.mails = [];
  for (let i = 0; i < 3; i++) x = await AT.maybeAutoTopup(env, A);
  ok(x.failed && x.stopped && db.auto[0].active === false && db.auto[0].fail_count === 3 && bal(A) === 0, '3번 실패: 멈춤·크레딧 지급 없음');
  ok(autoOrders().filter(o => o.status === 'failed').length === 3 && db.mails.some(m => /멈췄습니다/.test(m.subject)), '실패 주문 기록·멈춤 메일');
  x = await AT.maybeAutoTopup(env, A); ok(x.skipped === 'off' && charges.length === 7, '멈춘 뒤 결제 시도 없음');
  r = await G('tok-a'); ok(r.d.setting.stopped && !r.d.setting.active && r.d.setting.lastError === '한도 초과', '화면: 결제 실패로 멈춤');
  // 다시 켜기 → 실패 횟수 초기화, 기준 미만이면 바로 충전
  payFail = false;
  r = await P('tok-a', { action: 'update', packId: 'cr30', threshold: 5, monthlyLimit: 3, active: true });
  ok(r.s === 200 && r.d.charged && bal(A) === 30 && db.auto[0].fail_count === 0 && db.auto[0].pack_id === 'cr30' && charges[charges.length - 1].body.amount.total === 13000, '다시 켜기: 조건 변경·바로 충전(30개 13,000원)');
  r = await P('tok-a', { action: 'update', packId: 'cr10', threshold: 3, monthlyLimit: 2, active: false }); ok(r.d.setting.active === false, '잠시 끄기');
  db.ledger.push({ id: 5000, user_id: A, delta: -30, reason: 'more_picks', ref: 'd', idem_key: 'mp:t5', created_at: new Date().toISOString() });
  const before = charges.length; x = await AT.maybeAutoTopup(env, A); ok(x.skipped === 'off' && charges.length === before, '꺼 두면 결제 안 함');
  // 유료 스위치를 끄면 켜져 있어도 결제 안 함
  await P('tok-a', { action: 'update', packId: 'cr10', threshold: 3, monthlyLimit: 5, active: true });
  const c2 = charges.length; ok(c2 === before + 1, '다시 켜기: 바로 1회');
  use('t6', bal(A)); await call(credits, 'onRequestPut', '/api/community/credits', { adminPw: 'adm', method: 'PUT', body: { enabled: false } });
  x = await AT.maybeAutoTopup(env, A); ok(x.skipped === 'premium-off' && charges.length === c2, '광장 유료 스위치 꺼지면 결제 안 함');
  await call(credits, 'onRequestPut', '/api/community/credits', { adminPw: 'adm', method: 'PUT', body: { enabled: true, confirm: '유료 켜기' } });
  // 묶음 판매 중지 → 결제 안 함
  await call(admin, 'onRequestPut', '/api/commerce/admin', { adminPw: 'adm', method: 'PUT', body: { products: [{ id: 'cr10', price: 0 }] } });
  x = await AT.maybeAutoTopup(env, A); ok(x.skipped === 'pack-off' && charges.length === c2, '묶음 판매 중지: 결제 안 함');
  await call(admin, 'onRequestPut', '/api/commerce/admin', { adminPw: 'adm', method: 'PUT', body: { products: [{ id: 'cr10', price: 5000 }] } });

  // ── 새 카드 등록 → 예전 빌링키 포트원에서 삭제
  r = await reg('tok-a', { billingKey: 'billing-key-a2' }); ok(r.s === 200 && deleted.includes('billing-key-a1') && db.auto[0].billing_key === 'billing-key-a2' && r.d.setting.card === '하나카드 ····1111', '카드 바꾸기: 예전 빌링키 삭제');
  // ── 해지 → 포트원 삭제·결제 안 함·메일
  db.mails = []; use('t7', bal(A));
  r = await P('tok-a', { action: 'cancel' });
  ok(r.s === 200 && deleted.includes('billing-key-a2') && db.auto[0].billing_key === null && !db.auto[0].active && r.d.setting.registered === false, '해지: 빌링키 삭제');
  ok(db.mails.some(m => /해지되었습니다/.test(m.subject)), '해지 메일');
  const c3 = charges.length; x = await AT.maybeAutoTopup(env, A); ok(x.skipped === 'off' && charges.length === c3, '해지 뒤 결제 없음');
  r = await P('tok-a', { action: 'update', packId: 'cr10', threshold: 3, monthlyLimit: 2, active: true }); ok(r.s === 409, '해지 뒤 조건 변경은 카드 등록부터');

  // ── 다른 회원·관리자 요약
  ok(bal(B) === 0 && !db.auto.some(a => a.user_id === B), '다른 회원 영향 없음');
  r = await call(api, 'onRequestGet', '/api/community/autotopup?view=admin', { method: 'GET' }); ok(r.s === 401, '관리자 요약: 인증 필요');
  r = await call(api, 'onRequestGet', '/api/community/autotopup?view=admin', { adminPw: 'adm', method: 'GET' }); ok(r.s === 200 && r.d.ready && r.d.active === 0, '관리자 요약');
  // 메일 문구
  const mOn = M.autoTopupMail('on', { card_label: '신한카드 ····7890', packName: '인연 크레딧 10개', price: 5000, threshold: 3, monthly_limit: 2 });
  ok(/별도 확인 없이/.test(mOn.html) && /10,000원/.test(mOn.html) && /해지/.test(mOn.text), '설정 메일: 자동 결제 고지·월 최대 금액·해지 방법');

  if (fails.length) { console.error('autotopup-sim 실패 ' + fails.length + '/' + n + '\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('autotopup-sim OK: ' + n + '항목');
})().catch(e => { console.error(e); process.exit(1); });
