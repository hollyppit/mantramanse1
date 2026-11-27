// 만세력 PDF 알림톡 발송·내려받기 검사(네트워크 없음): node tests/kakao-pdf-sim.mjs
import assert from 'node:assert';
import { createHmac } from 'node:crypto';
import { onRequestPost, onRequestGet } from '../functions/api/kakao-pdf.js';
import { onRequestGet as getPdf } from '../functions/api/pdf/[code].js';
import { tokenFor } from '../functions/_site-gate.js';

// 가짜 R2
const store = new Map();
const R2 = {
  async put(k, v, o) { store.set(k, { body: v, size: v.byteLength, customMetadata: o.customMetadata, uploaded: new Date() }); },
  async get(k) { const o = store.get(k); return o ? { body: o.body, size: o.size, customMetadata: o.customMetadata } : null; },
  async delete(k) { [].concat(k).forEach(x => store.delete(x)); },
  async list({ prefix }) { return { objects: [...store].filter(([k]) => k.startsWith(prefix)).map(([key, o]) => ({ key, customMetadata: o.customMetadata, uploaded: o.uploaded })) }; },
};
const env = { ADMIN_PASSWORD: 'pw-test', SOLAPI_API_KEY: 'k1', SOLAPI_API_SECRET: 's1', SOLAPI_PFID: 'pf1', SOLAPI_TEMPLATE_ID: 't1', SOLAPI_SENDER: '070-4519-6416', CLIPS_R2: R2 };
const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
let sent = [], reply = { status: 200, body: { statusCode: '2000' } };
globalThis.fetch = async (url, opt) => { sent.push({ url, auth: opt.headers.authorization, body: JSON.parse(opt.body) }); return new Response(JSON.stringify(reply.body), { status: reply.status }); };
const call = async (body, { auth = 'pw-test', e = env, cookie = '' } = {}) => {
  const r = await onRequestPost({ env: e, request: new Request('https://x/api/kakao-pdf', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + auth, cookie }, body: typeof body === 'string' ? body : JSON.stringify(body) }) });
  return { status: r.status, body: await r.json() };
};
const good = { to: '010-1234-5678', name: '홍길동', label: '원국 · 용신', filename: '만세력_원국/홍.pdf', content: pdf };

// 권한
assert.strictEqual((await call(good, { auth: 'wrong' })).status, 401);
const gated = { ...env, SITE_GATE_PASSWORD: 'door' }, ticket = 'mantra_gate=' + await tokenFor('door');
assert.strictEqual((await call(good, { auth: '', e: gated })).status, 401, '입장 쿠키가 없으면 거절');
assert.strictEqual(sent.length, 0);
// 설정 상태
const st = await onRequestGet({ env: { ADMIN_PASSWORD: 'pw-test' }, request: new Request('https://x/api/kakao-pdf?status=1', { headers: { authorization: 'Bearer pw-test' } }) });
assert.deepStrictEqual((await st.json()).missing, ['SOLAPI_API_KEY', 'SOLAPI_API_SECRET', 'SOLAPI_PFID', 'SOLAPI_TEMPLATE_ID', 'SOLAPI_SENDER', 'CLIPS_R2']);
assert.strictEqual((await call(good, { e: { ADMIN_PASSWORD: 'pw-test' } })).status, 503);
// 입력 검사
assert.strictEqual((await call('{')).status, 400);
for (const to of ['', '02-123-4567', '010-12', '01012345678901', '+1 555 1234']) assert.strictEqual((await call({ ...good, to })).status, 400, to);
assert.strictEqual((await call({ ...good, content: Buffer.from('<html>').toString('base64') })).status, 400);
assert.strictEqual((await call({ ...good, content: 'JVBERi0' + 'A'.repeat(21 * 1024 * 1024) })).status, 413);
assert.strictEqual(sent.length, 0, '거절한 요청은 솔라피를 부르지 않는다');
assert.strictEqual(store.size, 0);

// 정상 발송(입장 쿠키만으로도)
const r = await call(good, { auth: '', e: gated, cookie: ticket });
assert.strictEqual(r.status, 200); assert.ok(r.body.until);
assert.strictEqual(sent.length, 1);
const m = sent[0].body.message, v = m.kakaoOptions.variables;
assert.strictEqual(sent[0].url, 'https://api.solapi.com/messages/v4/send');
assert.strictEqual(m.to, '01012345678'); assert.strictEqual(m.from, '07045196416');
assert.strictEqual(m.kakaoOptions.pfId, 'pf1'); assert.strictEqual(m.kakaoOptions.templateId, 't1'); assert.strictEqual(m.kakaoOptions.disableSms, true, '기본은 문자 대체 발송 안 함');
assert.strictEqual(v['#{이름}'], '홍길동'); assert.strictEqual(v['#{내용}'], '원국 · 용신'); assert.match(v['#{코드}'], /^[0-9a-f]{32}$/);
// 서명: HMAC-SHA256(date+salt, secret)
const a = Object.fromEntries(sent[0].auth.replace(/^HMAC-SHA256 /, '').split(', ').map(x => x.split('=')));
assert.strictEqual(a.apiKey, 'k1');
assert.strictEqual(a.signature, createHmac('sha256', 's1').update(a.date + a.salt).digest('hex'));
// 이름에 템플릿 변수 기호·줄바꿈을 넣어도 지운다
sent = []; await call({ ...good, name: '#{코드}\n<b>' }); assert.strictEqual(sent[0].body.message.kakaoOptions.variables['#{이름}'], '코드 b');

// 내려받기
const code = v['#{코드}'];
const g = await getPdf({ params: { code }, env });
assert.strictEqual(g.status, 200); assert.strictEqual(g.headers.get('content-type'), 'application/pdf');
assert.match(g.headers.get('content-disposition'), /filename\*=UTF-8''%EB%A7%8C%EC%84%B8%EB%A0%A5_%EC%9B%90%EA%B5%AD_%ED%99%8D\.pdf/);
assert.strictEqual(Buffer.from(await new Response(g.body).arrayBuffer()).toString(), '%PDF-1.4 test');
for (const c of ['../x', 'ABCDEF0123456789ABCDEF0123456789', '0'.repeat(31)]) assert.strictEqual((await getPdf({ params: { code: c }, env })).status, 404, c);
assert.strictEqual((await getPdf({ params: { code: 'f'.repeat(32) }, env })).status, 404);
// 기한 지남 → 410 + 삭제
store.get('share-pdf/' + code + '.pdf').customMetadata.exp = String(Date.now() - 1);
assert.strictEqual((await getPdf({ params: { code }, env })).status, 410);
assert.ok(!store.has('share-pdf/' + code + '.pdf'));

// 솔라피 실패 → 502, 올린 PDF 는 지운다
const before = store.size; reply = { status: 400, body: { errorCode: 'ValidationError', errorMessage: '템플릿 변수 불일치' } };
const f = await call(good); assert.strictEqual(f.status, 502); assert.match(f.body.error, /ValidationError/);
assert.strictEqual(store.size, before);
// 기한 지난 파일은 다음 발송 때 정리
reply = { status: 200, body: { statusCode: '2000' } };
store.set('share-pdf/' + 'a'.repeat(32) + '.pdf', { body: new Uint8Array(1), size: 1, customMetadata: { exp: '1' }, uploaded: new Date() });
await call(good); assert.ok(!store.has('share-pdf/' + 'a'.repeat(32) + '.pdf'));
console.log('kakao-pdf-sim 통과');
