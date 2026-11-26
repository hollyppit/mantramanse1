// 만세력 PDF 메일 발송 API 검사(네트워크 없음): node tests/mail-pdf-sim.mjs
import assert from 'node:assert';
import { onRequestPost } from '../functions/api/mail-pdf.js';

const env = { ADMIN_PASSWORD: 'pw-test', RESEND_API_KEY: 're_test' };
const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
let sent = [], status = 200;
globalThis.fetch = async (url, opt) => { sent.push({ url, body: JSON.parse(opt.body) }); return new Response('{}', { status }); };
const call = async (body, { auth = 'pw-test', e = env } = {}) => {
  const r = await onRequestPost({ env: e, request: new Request('https://x/api/mail-pdf', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + auth }, body: typeof body === 'string' ? body : JSON.stringify(body) }) });
  return r.status;
};
const good = { to: 'a@example.com', filename: '만세력_원국/홍.pdf', content: pdf };

assert.strictEqual(await call(good, { auth: 'wrong' }), 401);
assert.strictEqual(await call(good, { e: { ADMIN_PASSWORD: 'pw-test' } }), 503);
assert.strictEqual(await call('{'), 400);
for (const to of ['', 'abc', 'a@b.com,c@d.com', 'a@b.com\nbcc@x.com']) assert.strictEqual(await call({ ...good, to }), 400, to);
assert.strictEqual(await call({ ...good, content: Buffer.from('<html>').toString('base64') }), 400);
assert.strictEqual(await call({ ...good, content: 'JVBERi0' + 'A'.repeat(21 * 1024 * 1024) }), 413);
assert.strictEqual(sent.length, 0, '거절한 요청은 Resend 를 부르지 않는다');
assert.strictEqual(await call(good), 200);
assert.deepStrictEqual(sent[0].body.to, ['a@example.com']);
assert.deepStrictEqual(sent[0].body.attachments, [{ filename: '만세력_원국_홍.pdf', content: pdf }]);
status = 403;
assert.strictEqual(await call(good), 502);
console.log('mail-pdf-sim 통과');
