// 관리자 로그인 잠금 검증: 5번 틀리면 429, 그 뒤엔 맞는 비밀번호도 막힌다. 성공하면 횟수 초기화.
const path = require('path'), assert = require('assert');
(async () => {
  const API = await import(require('url').pathToFileURL(path.join(__dirname, '../functions/api/admin.js')).href);
  const store = new Map();
  const kv = { get: async k => store.has(k) ? store.get(k) : null, put: async (k, v) => { store.set(k, v); }, delete: async k => { store.delete(k); } };
  const env = { ADMIN_PASSWORD: 'pw', GLOSSARY_KV: kv };
  const call = (pw, ip = '1.1.1.1') => API.onRequestPost({ env, request: new Request('http://x/api/admin', { method: 'POST', headers: { authorization: 'Bearer ' + pw, 'cf-connecting-ip': ip } }) }).then(r => r.status);
  const realSet = global.setTimeout; global.setTimeout = (f) => realSet(f, 0); // 지연 생략
  assert.strictEqual(await call('pw'), 200);
  for (let i = 0; i < 4; i++) assert.strictEqual(await call('bad'), 401);
  assert.strictEqual(await call('pw'), 200, '4번 실패 뒤 성공은 통과');
  for (let i = 0; i < 5; i++) assert.strictEqual(await call('bad'), 401);
  assert.strictEqual(await call('pw'), 429, '5번 실패 뒤엔 맞는 비밀번호도 잠김');
  assert.strictEqual(await call('pw', '2.2.2.2'), 200, '다른 IP는 영향 없음');
  console.log('관리자 로그인 잠금 검증 모두 통과');
})().catch(e => { console.error(e); process.exit(1); });
