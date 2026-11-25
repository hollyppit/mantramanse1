// 관리자 비밀번호 대입 막기(2026-11-26 보안 점검): /api/admin·/api/community/* 만이 아니라 모든 /api/* 에서
// 같은 IP(IPv6 는 /64)가 1시간에 20번 틀리면 그 시간 동안 Bearer 요청을 429 로 막는다. 메모리 KV·합성 요청만(네트워크 0). node tests/admin-bruteforce-sim.mjs
import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';
import { AUTH_FAIL_MAX } from '../functions/_community.js';
const memory = new Map(), kv = { get: async k => memory.has(k) ? memory.get(k) : null, put: async (k, v) => { memory.set(k, v); }, delete: async k => { memory.delete(k); } };
const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'right-password-0123456789', RAG_SCHEDULER_SECRET: 'scheduler-secret-0123456789' };
const call = (path, { pw, ip = '1.2.3.4' } = {}) => onRequest({ env, request: new Request('https://mantrafortune.com' + path, { headers: { 'cf-connecting-ip': ip, ...(pw ? { authorization: 'Bearer ' + pw } : {}) } }), next: () => new Response('ok') });
// 맞는 비밀번호·예약 작업 열쇠·Bearer 없는 요청은 세지 않는다
for (let i = 0; i < AUTH_FAIL_MAX + 5; i++) {
  assert.equal((await call('/api/errlog', { pw: env.ADMIN_PASSWORD })).status, 200);
  assert.equal((await call('/api/agentic-rag', { pw: env.RAG_SCHEDULER_SECRET })).status, 200);
  assert.equal((await call('/api/luck-flags')).status, 200);
}
// 틀린 비밀번호 20번까지는 각 API 로 넘어가고(그 API 가 401), 그다음부터 429
for (let i = 0; i < AUTH_FAIL_MAX; i++) assert.equal((await call(i % 2 ? '/api/errlog' : '/api/commerce/admin', { pw: 'guess-' + i })).status, 200, i + '번째 틀림은 아직 통과');
assert.equal((await call('/api/commerce/admin', { pw: 'guess-x' })).status, 429, '21번째: 막힘');
assert.equal((await call('/api/errlog', { pw: env.ADMIN_PASSWORD })).status, 429, '막힌 시간엔 맞는 비밀번호도 막힘(대입 성공 확인 불가)');
assert.equal((await call('/api/luck-flags')).status, 200, 'Bearer 없는 일반 요청은 그대로');
assert.equal((await call('/api/errlog', { pw: env.ADMIN_PASSWORD, ip: '5.6.7.8' })).status, 200, '다른 IP 의 관리자는 영향 없음');
// IPv6 는 /64 묶음: 끝자리만 바꿔 가며 대입해도 같은 칸으로 센다
for (let i = 0; i < AUTH_FAIL_MAX; i++) await call('/api/media', { pw: 'g' + i, ip: '2001:db8:1:2::' + (i + 1).toString(16) });
assert.equal((await call('/api/media', { pw: 'g', ip: '2001:db8:1:2:ffff::9' })).status, 429, 'IPv6 /64 안에서 주소를 바꿔도 막힘');
assert.equal((await call('/api/media', { pw: env.ADMIN_PASSWORD, ip: '2001:db8:1:3::1' })).status, 200, '다른 /64 는 영향 없음');
console.log(`admin-bruteforce-sim OK: 모든 /api/* 에서 ${AUTH_FAIL_MAX}번 틀리면 429, IPv6 /64 묶음, 맞는 열쇠·일반 요청 영향 없음`);
