// 2026-11-28 보안 점검: 회원이 스스로 고칠 수 있는 user_metadata 로 '네이버 회원'인 척 남의 이메일을 쓰지 못하는지.
//   공격: 카카오·구글 회원이 PUT /auth/v1/user {data:{provider:'naver', email:'victim@…'}} → 예전엔 서버가 그 이메일을 회원 이메일로 믿어
//         출시 알림 철회(남의 신청 삭제)·조회, 같은 이메일 회원 안내(가입·구매 여부 엿보기), 문의 답장 메일 주소가 바뀌었다.
//   실행: node tests/member-metadata-spoof-sim.mjs
import assert from 'node:assert/strict';
import { memberOf, isNaverUser } from '../functions/_commerce.js';
import { displayEmail, loginsOf } from '../functions/_account-link.js';

const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'svc' };
let user = null;
globalThis.fetch = async (u) => {
  const s = String(u);
  if (s.endsWith('/auth/v1/user')) return new Response(JSON.stringify(user), { status: user ? 200 : 401 });
  if (s.includes('/auth/v1/admin/users/') && s.includes('/factors') === false) return new Response(JSON.stringify({ identities: [] }), { status: 200 });
  return new Response('[]', { status: 200 });
};
const req = () => new Request('https://x.test/api/x', { headers: { 'x-member-token': 'tok' } });

// 1) 위조: 카카오 회원이 user_metadata 만 네이버로 바꿈 → 실제 이메일 그대로
user = { id: 'u1', email: 'attacker@kakao.test', app_metadata: { provider: 'kakao' }, user_metadata: { provider: 'naver', email: 'victim@example.com' } };
let m = await memberOf(req(), env);
assert.equal(m.email, 'attacker@kakao.test', '위조한 user_metadata 이메일을 믿지 않음');
assert.equal(m.provider, 'kakao');
assert.equal(isNaverUser(user), false);
assert.equal(displayEmail(user), 'attacker@kakao.test', '화면·안내용 이메일도 위조 불가');

// 2) 진짜 네이버 회원(서버가 app_metadata 를 정함) → 네이버 이메일 표시는 그대로
user = { id: 'u2', email: 'naver-' + 'a'.repeat(32) + '@users.mantrafortune.com', app_metadata: { provider: 'naver', providers: ['naver'] }, user_metadata: { provider: 'naver', email: 'real@naver.com' } };
m = await memberOf(req(), env);
assert.equal(m.email, 'real@naver.com'); assert.equal(m.provider, 'naver');
assert.equal(displayEmail(user), 'real@naver.com');

// 3) 내부 주소만 있는 예전 네이버 회원도 네이버로 인정(app_metadata 가 비어 있어도)
user = { id: 'u3', email: 'naver-' + 'b'.repeat(32) + '@users.mantrafortune.com', app_metadata: {}, user_metadata: { email: 'old@naver.com' } };
assert.equal(isNaverUser(user), true); assert.equal(displayEmail(user), 'old@naver.com');

// 4) 로그인 방법 목록도 위조로 '네이버'가 끼지 않음(연결 합치기 판정에 쓰임)
const fake = { id: 'u4', email: 'a@b.test', app_metadata: { provider: 'google' }, user_metadata: { provider: 'naver' } };
const logins = await loginsOf(env, fake).catch(() => []);
assert.ok(!logins.includes('naver'), '위조 user_metadata 로 네이버 로그인이 생기지 않음');

// 5) 토큰이 틀리면 회원 아님
user = null; assert.equal(await memberOf(req(), env), null);
console.log('member-metadata-spoof-sim OK: user_metadata 위조 이메일 무시 · 진짜 네이버 회원 표시 유지 · 로그인 방법 위조 불가');
