// 카카오 알림톡 거래 안내(구매 완료·문의 답변·만료 예고)와 마이페이지 번호 설정 검사(네트워크 없음): node tests/kakao-notice-sim.mjs
import assert from 'node:assert';
import { noticePaid, noticeAnswer, noticeReady, noticeAny, paidVars, expireVars } from '../functions/_notice.js';
import { onRequestPost as notifyApi } from '../functions/api/account/notify.js';
import { onRequestPost as expiryApi } from '../functions/api/commerce/expiry-notice.js';

const UID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', UID2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DB = { member_profiles: [{ user_id: UID, notify_phone: '01011112222', phone: '01099998888' }], commerce_orders: [] };
let sms = [];
const base = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_PFID: 'pf', SOLAPI_SENDER: '07045196416', ADMIN_PASSWORD: 'pw-admin' };
const full = { ...base, SOLAPI_TPL_PAID: 'tp', SOLAPI_TPL_ANSWER: 'ta', SOLAPI_TPL_EXPIRE: 'te', CRON_SECRET: 'c'.repeat(32) };
const filt = (rows, qs) => rows.filter(r => [...qs].every(([k, v]) => {
  if (['select', 'order', 'limit'].includes(k)) return true;
  const val = r[k] == null ? null : String(r[k]);
  if (v === 'is.null') return r[k] == null;
  if (v.startsWith('eq.')) return val === v.slice(3);
  if (v.startsWith('gt.')) return val != null && val > v.slice(3);
  if (v.startsWith('lte.')) return val != null && val <= v.slice(4);
  return true;
}));
globalThis.fetch = async (url, opt = {}) => {
  url = String(url);
  if (url.startsWith('https://api.solapi.com/')) { sms.push(JSON.parse(opt.body).message); return new Response('{"statusCode":"2000"}'); }
  if (url.endsWith('/auth/v1/user')) return opt.headers.authorization === 'Bearer tok-a' ? new Response(JSON.stringify({ id: UID, email: 'a@x.com' })) : opt.headers.authorization === 'Bearer tok-b' ? new Response(JSON.stringify({ id: UID2, email: 'b@x.com' })) : new Response('{}', { status: 401 });
  if (url.includes('/rest/v1/rpc/')) return new Response('1');
  const u = new URL(url), t = u.pathname.split('/').pop(), qs = [];
  u.searchParams.forEach((v, k) => qs.push([k, v]));   // 같은 열 조건 두 개(paid_at gt·lte)를 모두 본다
  const rows = DB[t]; if (!rows) return new Response('[]');
  const m = (opt.method || 'GET').toUpperCase();
  if (m === 'GET') return new Response(JSON.stringify(filt(rows, qs)));
  if (m === 'POST') { rows.push(JSON.parse(opt.body)); return new Response('', { status: 201 }); }
  if (m === 'PATCH') { const hit = filt(rows, qs); hit.forEach(r => Object.assign(r, JSON.parse(opt.body))); return new Response(JSON.stringify(hit)); }
  return new Response('[]');
};

// 설정이 없으면 아무것도 보내지 않는다
assert.strictEqual(noticeAny(base), false);
assert.strictEqual(await noticePaid(base, { user_id: UID, product_name: 'x', amount: 1, paid_at: '2026-11-27T00:00:00Z' }), false);
assert.strictEqual(sms.length, 0);
assert.ok(noticeReady({ ...base, SOLAPI_TPL_PAID: 'tp' }, 'paid') && !noticeReady({ ...base, SOLAPI_TPL_PAID: 'tp' }, 'answer'));

// 구매 완료: 알림 번호로만(광고용 phone 은 쓰지 않음)
const order = { user_id: UID, product_name: '종합풀이 {특가}', amount: 19900, paid_at: '2026-11-27T03:00:00Z' };
assert.strictEqual(await noticePaid(full, order), true);
assert.strictEqual(sms[0].to, '01011112222'); assert.strictEqual(sms[0].kakaoOptions.templateId, 'tp');
assert.deepStrictEqual(sms[0].kakaoOptions.variables, { '#{상품}': '종합풀이 특가', '#{금액}': '19,900원', '#{기한}': '2027년 11월 27일' });
// 번호를 등록하지 않은 회원은 건너뜀
sms = []; assert.strictEqual(await noticePaid(full, { ...order, user_id: UID2 }), false); assert.strictEqual(sms.length, 0);
// 문의 답변
assert.strictEqual(await noticeAnswer(full, { user_id: UID, subject: '환불\n문의', answered_at: '2026-11-27T05:30:00Z' }), true);
assert.strictEqual(sms[0].kakaoOptions.templateId, 'ta'); assert.strictEqual(sms[0].kakaoOptions.variables['#{제목}'], '환불 문의');
// 비회원 문의(user_id 없음)는 보내지 않음
sms = []; assert.strictEqual(await noticeAnswer(full, { user_id: null, subject: 'x' }), false); assert.strictEqual(sms.length, 0);

// 마이페이지 번호 설정
const call = (tok, body, e = full) => notifyApi({ env: e, request: new Request('https://x/api/account/notify', { method: 'POST', headers: { 'x-member-token': tok, 'content-type': 'application/json' }, body: JSON.stringify(body) }) }).then(async r => ({ status: r.status, body: await r.json() }));
assert.strictEqual((await call('bad', { action: 'get' })).status, 401);
let r = await call('tok-a', { action: 'get' });
assert.deepStrictEqual([r.body.available, r.body.on, r.body.phone], [true, true, '010-****-2222']);
assert.deepStrictEqual(r.body.kinds, ['paid', 'answer', 'expire']);
assert.strictEqual((await call('tok-a', { action: 'get' }, base)).body.available, false, '템플릿이 하나도 없으면 카드를 숨긴다');
assert.strictEqual((await call('tok-b', { action: 'set', phone: '02-123-4567' })).status, 400);
r = await call('tok-b', { action: 'set', phone: '010-3333-4444' });
assert.strictEqual(r.status, 200); assert.strictEqual(DB.member_profiles.find(x => x.user_id === UID2).notify_phone, '01033334444');
r = await call('tok-a', { action: 'off' });
assert.strictEqual(r.body.on, false); const a = DB.member_profiles.find(x => x.user_id === UID);
assert.strictEqual(a.notify_phone, null); assert.strictEqual(a.phone, '01099998888', '광고 수신용 번호는 건드리지 않는다');
a.notify_phone = '01011112222';

// 만료 예고: 만료 30일 안·아직 안 알린 결제 완료 주문만, 한 번만
const ago = d => new Date(Date.now() - d * 864e5).toISOString();
const sub12 = d => { const x = new Date(Date.now() + d * 864e5); x.setUTCMonth(x.getUTCMonth() - 12); return x.toISOString(); };
DB.commerce_orders.push(
  { order_id: 'o1', user_id: UID, product_name: '재물운 심화', status: 'paid', paid_at: sub12(10), expiry_noticed_at: null },    // 10일 뒤 만료 → 보냄
  { order_id: 'o2', user_id: UID2, product_name: '인연운 심화', status: 'paid', paid_at: sub12(20), expiry_noticed_at: null },   // 번호 있는 다른 회원 → 보냄
  { order_id: 'o3', user_id: UID, product_name: 'x', status: 'paid', paid_at: sub12(40), expiry_noticed_at: null },              // 40일 뒤 → 아직
  { order_id: 'o4', user_id: UID, product_name: 'x', status: 'paid', paid_at: sub12(-1), expiry_noticed_at: null },              // 이미 만료 → 안 보냄
  { order_id: 'o5', user_id: UID, product_name: 'x', status: 'canceled', paid_at: sub12(5), expiry_noticed_at: null },           // 환불 → 안 보냄
  { order_id: 'o6', user_id: UID, product_name: 'x', status: 'paid', paid_at: sub12(5), expiry_noticed_at: ago(1) },             // 이미 알림 → 안 보냄
);
const cron = (key, e = full) => expiryApi({ env: e, request: new Request('https://x/api/commerce/expiry-notice', { method: 'POST', headers: key ? { 'x-cron-key': key } : {} }) }).then(async r => ({ status: r.status, body: await r.json() }));
assert.strictEqual((await cron('')).status, 401);
assert.strictEqual((await cron('wrong')).status, 401);
assert.strictEqual((await cron('c'.repeat(32), { ...full, CRON_SECRET: 'short' })).status, 401, '짧은 비밀값은 거절');
sms = []; r = await cron('c'.repeat(32));
assert.deepStrictEqual([r.status, r.body.checked, r.body.marked, r.body.sent], [200, 2, 2, 2]);
assert.deepStrictEqual(sms.map(x => x.kakaoOptions.templateId), ['te', 'te']);
assert.deepStrictEqual(sms.map(x => x.kakaoOptions.variables['#{상품}']).sort(), ['인연운 심화', '재물운 심화']);
sms = []; r = await cron('c'.repeat(32)); assert.deepStrictEqual([r.body.checked, sms.length], [0, 0], '두 번째 실행은 보내지 않는다');
assert.deepStrictEqual(expireVars({ product_name: 'a', paid_at: '2026-01-31T00:00:00Z' })['#{기한}'], '2027년 1월 31일');
assert.ok(paidVars({ amount: 0 })['#{상품}'] === '-');
// 템플릿 없으면 건너뜀(표시만)
r = await cron('c'.repeat(32), { ...full, SOLAPI_TPL_EXPIRE: '' }); assert.strictEqual(r.body.skipped, 'template-not-set');
console.log('kakao-notice-sim 통과');
