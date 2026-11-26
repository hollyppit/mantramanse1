// 비회원 1:1 문의 API 검사(네트워크 없음): node tests/inquiry-guest-sim.mjs
import assert from 'node:assert';
import { onRequestPost } from '../functions/api/account/inquiry.js';

const kv = new Map();
const env = { RESEND_API_KEY: 're_test', GLOSSARY_KV: { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
let sent = [], status = 200;
globalThis.fetch = async (url, opt) => { assert(String(url).startsWith('https://api.resend.com/'), '비회원 문의는 메일 말고 다른 곳을 부르지 않는다: ' + url); sent.push(JSON.parse(opt.body)); return new Response('{}', { status }); };
const call = async (body, { e = env, ip = '1.1.1.1', token } = {}) => {
  const headers = { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(token ? { 'x-member-token': token } : {}) };
  const r = await onRequestPost({ env: e, request: new Request('https://x/api/account/inquiry', { method: 'POST', headers, body: JSON.stringify(body) }) });
  return { s: r.status, j: await r.json() };
};
const good = { action: 'send', email: 'guest@example.com', agree: true, category: 'payment', subject: '결제 <b>문의</b>', body: '결제가 됐는지 확인해 주세요' };

for (const [patch, err] of [[{ email: 'x' }, 'email-required'], [{ email: 'a@b.com,c@d.com' }, 'email-required'], [{ agree: false }, 'agree-required'], [{ subject: ' ' }, 'subject-required'], [{ body: '짧' }, 'body-too-short']]) {
  const r = await call({ ...good, ...patch }); assert.strictEqual(r.s, 400); assert.strictEqual(r.j.error, err);
}
assert.strictEqual((await call({ ...good, website: 'http://spam' })).s, 200);
assert.strictEqual(sent.length, 0, '거절·자동 프로그램은 메일을 보내지 않는다');

const ok = await call(good);
assert.strictEqual(ok.s, 200); assert.strictEqual(sent.length, 1, '운영자에게만 한 통(입력한 주소로는 보내지 않는다)');
assert.deepStrictEqual(sent[0].to, ['critical5114@naver.com']);
assert.strictEqual(sent[0].reply_to, 'guest@example.com');
assert(sent[0].html.includes('결제 &lt;b&gt;문의&lt;/b&gt;') && !sent[0].html.includes('<b>문의</b>'), '입력값은 이스케이프');
assert(sent[0].subject.includes('비회원'));

sent = []; await call(good, { e: { ...env, ADMIN_ALERT_EMAIL: 'boss@example.com' }, ip: '2.2.2.2' });
assert.deepStrictEqual(sent[0].to, ['boss@example.com']);

await call(good); await call(good);
assert.strictEqual((await call(good)).s, 429, '같은 접속 주소 하루 3건');
assert.strictEqual((await call(good, { ip: '3.3.3.3' })).s, 200);
for (const k of kv.keys()) if (k.endsWith(':all')) kv.set(k, '30');
assert.strictEqual((await call(good, { ip: '4.4.4.4' })).s, 429, '비회원 전체 하루 30건');
kv.clear(); status = 500;
assert.strictEqual((await call(good)).s, 503, '메일이 안 가면 접수 실패로 알린다');
status = 200;
assert.strictEqual((await call(good, { e: { RESEND_API_KEY: 're_test' } })).s, 503);

// 토큰이 있는 요청과 비회원의 다른 동작은 예전 경로(회원 확인)로 간다
assert.strictEqual((await call({ action: 'list' })).s, 503);
assert.strictEqual((await call(good, { token: 'expired' })).s, 503);
console.log('inquiry-guest-sim 통과');
