// 결제 화면(paywall.js) 결제 뒤 흐름 검사(2026-11-24)
// 1) 모바일 복귀 확인이 '처리 중(202)'이면 주소의 결제 값을 지우지 않고 주문번호를 남긴다
// 2) 다음에 보통으로 열면 남긴 주문번호로 다시 확인하고, 확정되면 지운다
// 3) 모바일 복귀 확인이 성공하면 주소의 결제 값을 지운다
// 4) 확인 요청이 끊겨도 주문번호를 남긴다
// 5) 포트원 결제창이 모바일 이동으로 끝나면(결과 없음) 이어 읽기 값을 지우지 않는다(코드 순서)
// 6) 결제 완료 주문의 권한 기록 실패는 서버가 실패로 답한다(commerce-sim 에서 확인)
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const SRC = fs.readFileSync(process.env.PW_SRC || path.join(__dirname, '..', 'report/v2/paywall.js'), 'utf8');
function store() { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m }; }
function el() { return { style: {}, appendChild() { }, setAttribute() { }, addEventListener() { }, classList: { add() { }, remove() { }, toggle() { } }, querySelector: () => null, querySelectorAll: () => [], remove() { } }; }
async function run({ search, confirm, pending, failNetwork }) {
  const calls = [], toasts = [], replaced = [];
  const ss = store(); if (pending) ss.setItem('mt_pay_pending', pending);
  const loc = new URL('https://x.test/report/v2/' + (search || '') + '#/r');
  const win = {
    location: { href: loc.href, search: loc.search, hash: loc.hash, origin: loc.origin, pathname: loc.pathname },
    history: { replaceState: (a, b, u) => { replaced.push(u); } },
    sessionStorage: ss, localStorage: store(), console: { warn() { }, log() { } },
    setTimeout: (f) => { f(); return 0; }, clearTimeout() { }, URL, URLSearchParams, Promise, JSON, Object, Array, String, Number, Error, Date, Math, RegExp,
    fetch: async (u, o) => {
      calls.push(u);
      if (/\/api\/commerce\/access/.test(u)) return { ok: true, status: 200, json: async () => ({ configured: {}, owned: [], keys: {} }) };
      if (/\/api\/commerce\/confirm/.test(u)) { if (failNetwork) throw new Error('Failed to fetch'); const c = confirm(); return { ok: c.status < 300, status: c.status, json: async () => c.body }; }
      return { ok: true, status: 200, json: async () => ({}) };
    },
    ReportV2: { toast: t => toasts.push(t) },
  };
  win.window = win; win.globalThis = win;
  win.document = { createElement: el, head: el(), body: el(), querySelector: () => null, querySelectorAll: () => [], addEventListener() { }, getElementById: () => null };
  const ctx = vm.createContext(win);
  vm.runInContext(SRC.replace(/\(typeof window !== 'undefined' \? window : globalThis\)\s*;?\s*$/, '(window);'), ctx);
  const PW = win.ReportV2.Paywall || win.ReportV2.paywall || Object.values(win.ReportV2).find(v => v && v.init && v.buy);
  assert.ok(PW && PW.init, 'Paywall 모듈');
  await PW.init({}, {});
  await new Promise(r => setImmediate(r));
  return { calls: calls.filter(u => /confirm/.test(u)).length, toasts, replaced, pending: ss.getItem('mt_pay_pending') };
}
(async () => {
  // 1) 모바일 복귀 + 처리 중
  let r = await run({ search: '?pay=portone&paymentId=mtP1', confirm: () => ({ status: 202, body: { error: 'payment-pending' } }) });
  assert.ok(r.calls >= 3, '처리 중이면 두 번 더 묻는다: ' + r.calls);
  assert.equal(r.pending, 'mtP1', '처리 중 주문번호를 남긴다');
  assert.ok(!r.replaced.some(u => !/paymentId=/.test(u)), '처리 중이면 주소의 결제 값을 지우지 않는다');
  assert.ok(r.toasts.some(t => /새로고침하면 다시 확인/.test(t)), '처리 중 안내');
  // 2) 보통 열기 + 남은 주문번호 → 다시 확인 → 확정되면 지움
  r = await run({ search: '', pending: 'mtP1', confirm: () => ({ status: 200, body: { ok: true } }) });
  assert.equal(r.calls, 1, '남은 주문번호로 한 번 다시 확인');
  assert.equal(r.pending, null, '확정되면 남긴 주문번호를 지운다');
  assert.ok(r.toasts.some(t => /구매가 완료/.test(t)), '구매 완료 안내');
  // 2-1) 남은 주문번호가 없으면 확인 요청을 보내지 않는다
  r = await run({ search: '', confirm: () => ({ status: 200, body: { ok: true } }) });
  assert.equal(r.calls, 0, '보통 열기에서 확인 요청 없음');
  // 3) 모바일 복귀 성공 → 주소 정리
  r = await run({ search: '?pay=portone&paymentId=mtP2', confirm: () => ({ status: 200, body: { ok: true } }) });
  assert.ok(r.replaced.some(u => !/paymentId=|pay=/.test(u)), '성공하면 주소의 결제 값을 지운다');
  assert.equal(r.pending, null, '성공하면 남길 주문번호 없음');
  // 3-1) 확정 실패(결제 실패 400)도 주소는 지운다
  r = await run({ search: '?pay=portone&paymentId=mtP3', confirm: () => ({ status: 400, body: { error: 'payment-failed' } }) });
  assert.ok(r.replaced.some(u => !/paymentId=/.test(u)), '확정 실패도 주소 정리');
  assert.equal(r.pending, null, '확정 실패는 다시 확인하지 않음');
  // 3-2) 권한 기록 실패(500)는 남겨 두고 다시 확인
  r = await run({ search: '?pay=portone&paymentId=mtP4', confirm: () => ({ status: 500, body: { error: 'grant-failed' } }) });
  assert.equal(r.pending, 'mtP4', '권한 기록 실패는 다시 확인하도록 남긴다');
  // 4) 연결 끊김
  r = await run({ search: '?pay=portone&paymentId=mtP5', failNetwork: true, confirm: () => ({ status: 200, body: { ok: true } }) });
  assert.equal(r.pending, 'mtP5', '연결이 끊기면 주문번호를 남긴다');
  assert.ok(r.toasts.some(t => /연결이 끊겼습니다/.test(t)), '연결 끊김 안내');
  // 5) 코드 순서: 결과가 없으면(모바일 이동) 이어 읽기 값을 지우기 전에 끝난다
  const body = SRC.slice(SRC.indexOf('function payPortone'), SRC.indexOf('function confirmPortone'));
  assert.ok(body.indexOf('if (!res) return;') >= 0 && body.indexOf('if (!res) return;') < body.indexOf('dropResume();'), '모바일 이동이면 이어 읽기 값을 지우지 않는다');
  assert.ok(/confirmPortone\(o\.orderId\)\.catch\(/.test(body), 'PC 확인 끊김은 결제 시작 실패로 넘어가지 않는다');
  console.log('PASS paywall-return-sim: 모바일 복귀 처리 중·성공·실패·권한 실패·끊김, 남은 결제 다시 확인, 이어 읽기 보존');
})().catch(e => { console.error(e); process.exit(1); });
