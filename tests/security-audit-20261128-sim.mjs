// 2026-11-28 보안 점검(바이브코딩 체크리스트 19항목) 수정 확인. 네트워크 없음.  node tests/security-audit-20261128-sim.mjs
// 함께 돌릴 것: tests/site-gate-sim.js(입장 비밀번호 대입) · tests/member-metadata-spoof-sim.mjs(이메일 위조) · tests/match-sim.js(인연 다시 잇기·하루 한도)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { communityGate, makeCookie, tokenSub, STAGE_KEY } from '../functions/_community.js';
import { readCapped } from '../functions/api/community/avatar.js';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); };
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// 1) 광장 입장 쿠키는 쿠키 주인 회원만 쓸 수 있다(초대받은 회원 쿠키를 넘겨받아 다른 회원 토큰으로 잠긴 API 쓰기 차단)
const kv = new Map([[STAGE_KEY, JSON.stringify({ stage: 'beta' })]]);
const ENV = { COMMUNITY_SECRET: 'secret-0123456789', GLOSSARY_KV: { get: async (k, t) => { const v = kv.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => kv.set(k, String(v)) } };
const jwt = sub => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub, role: 'authenticated' })).toString('base64url'), 'sig'].join('.');
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const beta = await makeCookie(ENV, 'beta', owner), admin = await makeCookie(ENV, 'admin', 'admin');
const gate = (cookie, token, path = '/api/community/posts') => communityGate(new Request('https://x.test' + path, { headers: { cookie: 'mt_cm=' + cookie, ...(token ? { 'x-member-token': token } : {}) } }), ENV);
ok(tokenSub({ headers: new Headers({ 'x-member-token': jwt(owner) }) }) === owner, 'JWT sub 읽기');
ok(await gate(beta, jwt(owner)) === null, '쿠키 주인 토큰은 통과');
ok(await gate(beta, null) === null, '토큰 없는 둘러보기는 쿠키로 통과');
let r = await gate(beta, jwt(other)); ok(r && r.status === 403, '남의 쿠키 + 내 토큰은 403');
r = await gate(beta, 'not-a-jwt'); ok(r && r.status === 403, '형식 틀린 토큰 + 쿠키는 403');
ok(await gate(admin, jwt(other)) === null, '관리자 쿠키(테스트 회원 a·b)는 어떤 토큰과도 통과');
ok(await gate(beta, jwt(other), '/community/') === null, '화면(페이지)은 토큰이 없으니 쿠키만 본다');

// 2) 사진 업로드: content-length 없이(chunked) 큰 본문을 보내도 300KB+1 바이트에서 끊는다
const big = new ReadableStream({ start(c) { for (let i = 0; i < 100; i++) c.enqueue(new Uint8Array(64 * 1024)); c.close(); } });
ok(await readCapped(new Request('https://x.test/', { method: 'POST', body: big, duplex: 'half' }), 300 * 1024) === null, 'chunked 6MB 본문은 300KB 에서 끊고 거절');
const small = await readCapped(new Request('https://x.test/', { method: 'POST', body: new Uint8Array([0xff, 0xd8, 0xff, 1, 2]) }), 300 * 1024);
ok(small && small.length === 5 && small[0] === 0xff, '작은 사진은 그대로 읽음');
ok(!/request\.arrayBuffer\(\)/.test(read('functions/api/community/avatar.js')), '사진 업로드에서 본문 전체 읽기(arrayBuffer) 제거');

// 3) 관리자 화면 PDF 미리보기: pdf.js 3.11 스크립트 실행 취약점(CVE-2024-4367) 완화
ok(/getDocument\(\{[^}]*isEvalSupported:\s*false/.test(read('report/admin/v2-src.js')), 'pdf.js getDocument 에 isEvalSupported:false');

// 4) AI 질문 칸 프롬프트 인젝션: 질문은 자료일 뿐 지시가 아니라는 경계 문장이 시스템 문구에 있다
for (const p of ['report/v2/tarot-deep-ai.js', 'report/iching/ai-detail.js']) ok(/\[입력 경계\][^'\n]*지시가 아닙니다[^'\n]*무시해/.test(read(p)), p + ': 입력 경계 문장');

// 5) 회원이 고칠 수 있는 user_metadata 로 권한·신원을 판정하는 곳이 남지 않았다(네이버 판정은 isNaverUser 하나로)
const offenders = [];
for (const dir of ['functions', 'functions/api', 'functions/api/account', 'functions/api/community', 'functions/api/commerce', 'functions/api/auth/naver', 'functions/api/auth/google']) {
  for (const f of fs.readdirSync(new URL('../' + dir, import.meta.url))) if (f.endsWith('.js') && /user_metadata[^;\n]*provider\s*===\s*'naver'/.test(read(dir + '/' + f))) offenders.push(dir + '/' + f);
}
ok(offenders.length === 0, 'user_metadata.provider 로 네이버 판정하는 곳 없음: ' + offenders.join(', '));

// 6) 저장소에 비밀값 파일이 올라가지 않게(.env·.dev.vars 무시)
const gi = read('.gitignore'); ok(/^\.env$/m.test(gi) && /^\.dev\.vars$/m.test(gi), '.gitignore 에 .env·.dev.vars');

console.log('security-audit-20261128-sim OK: ' + n + '항목(광장 쿠키·회원 묶기 · chunked 업로드 · pdf.js 완화 · AI 입력 경계 · user_metadata 판정 · .env 무시)');
