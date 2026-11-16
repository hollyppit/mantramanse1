// 통합 첫 화면·커뮤니티 잠금·출시 알림 검증(1단계):  node tests/community-gate-sim.js
// 가짜 Supabase(메모리 표)·가짜 KV·가짜 메일로 실제 functions 코드를 돌린다. 네트워크 없음.
const path = require('path'), url = require('url'), fs = require('fs');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);
const B = 'https://mantramanse.pages.dev';

// ── 가짜 Supabase
const USERS = { 'tok-tester': { id: '11111111-1111-4111-8111-111111111111', email: 'tester@example.com' }, 'tok-beta': { id: '22222222-2222-4222-8222-222222222222', email: 'beta@example.com' }, 'tok-plain': { id: '33333333-3333-4333-8333-333333333333', email: 'plain@example.com' } };
// 2단계부터 회원 입장에는 필수 동의(이용약관·개인정보)가 필요하다 → 테스터·베타 회원은 동의를 마친 상태로 둔다(동의 규칙 자체는 tests/member-consent-sim.js)
const agreed = id => ['terms', 'privacy'].map(kind => ({ user_id: id, kind, agreed: true, version: '2026-11-10', granted_at: '2026-11-16T00:00:00Z' }));
const T = { community_access: [], launch_alerts: [], admin_audit_log: [], member_consents: [...agreed(USERS['tok-tester'].id), ...agreed(USERS['tok-beta'].id)] }; let seq = 1; const mails = [];
function match(row, qs) { for (const [k, v] of qs) { if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue; if (v === 'is.null') { if (row[k] != null) return false; } else if (v.startsWith('eq.')) { if (String(row[k]) !== decodeURIComponent(v.slice(3))) return false; } } return true; }
global.fetch = async (u, o = {}) => {
  u = String(u); const m = o.method || 'GET', body = o.body ? JSON.parse(o.body) : null, res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
  if (u.startsWith('https://api.resend.com/')) { mails.push(body); return res({ id: 'm' }); }
  if (u.endsWith('/auth/v1/user')) { const t = (o.headers.authorization || '').slice(7), x = USERS[t]; return x ? res(x) : res({}, 401); }
  const au = u.match(/\/auth\/v1\/admin\/users\/([\w-]+)$/); if (au) { const x = Object.values(USERS).find(z => z.id === au[1]); return x ? res(x) : res({}, 404); }
  if (u.includes('/rest/v1/rpc/community_user_by_email')) { const x = Object.values(USERS).find(z => z.email === body.p_email.toLowerCase()); return res(x ? x.id : null); }
  const mm = u.match(/\/rest\/v1\/(\w+)(?:\?(.*))?$/); if (!mm) throw Error('unexpected fetch ' + u);
  const tbl = T[mm[1]]; if (!tbl) return res({ message: 'relation does not exist' }, 404);
  const qs = [...new URLSearchParams(mm[2] || '')];
  if (m === 'GET') return res(tbl.filter(r => match(r, qs)));
  if (m === 'POST') { const oc = qs.find(q => q[0] === 'on_conflict'); if (oc) { const i = tbl.findIndex(r => r[oc[1]] === body[oc[1]]); if (i >= 0) { Object.assign(tbl[i], body); return res(null, 201); } } if (mm[1] === 'launch_alerts' && tbl.some(r => r.email === body.email && r.purpose === body.purpose)) return res({ message: 'dup' }, 409); tbl.push({ id: seq++, at: new Date().toISOString(), ...body }); return res(null, 201); }
  if (m === 'PATCH') { tbl.filter(r => match(r, qs)).forEach(r => Object.assign(r, body)); return res(null, 204); }
  if (m === 'DELETE') { for (let i = tbl.length - 1; i >= 0; i--) if (match(tbl[i], qs)) tbl.splice(i, 1); return res(null, 204); }
};
const kvMem = new Map();
const ENV = { ADMIN_PASSWORD: 'adm-pw', SUPABASE_URL: 'https://sb.local', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', RESEND_API_KEY: 'rk',
  GLOSSARY_KV: { get: async (k, t) => { const v = kvMem.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { kvMem.set(k, String(v)); }, delete: async k => kvMem.delete(k), list: async () => ({ keys: [], list_complete: true }) } };

(async () => {
  const mw = await imp('functions/_middleware.js'), C = await imp('functions/_community.js');
  const status = await imp('functions/api/community/status.js'), enter = await imp('functions/api/community/enter.js'), alert = await imp('functions/api/community/alert.js'), access = await imp('functions/api/community/access.js');
  const run = (p, env = ENV, init = {}) => mw.onRequest({ request: new Request(B + p, init), env, next: () => new Response('own') });
  const req = (p, init = {}) => new Request(B + p, init);
  const H = (h = {}) => ({ 'content-type': 'application/json', ...h });
  const admin = { authorization: 'Bearer adm-pw', 'x-reviewer': encodeURIComponent('검수자') };
  const setStage = async s => { kvMem.set('community:stage', JSON.stringify({ stage: s })); };
  let d0;
  const cookieOf = r => ((r.headers.get('set-cookie') || '').match(/mt_cm=([^;]*)/) || [])[1] || '';

  // 1) 기본 = 개발 중(값 없음·깨진 값·모르는 값도 닫힘)
  kvMem.delete('community:stage');
  let r = await run('/community/'); ok(r.status === 302 && r.headers.get('location') === '/gate/?community=closed', '값 없음 → 닫힘(준비 중으로)');
  kvMem.set('community:stage', '{"stage":"open"}'); r = await run('/community/'); ok(r.status === 302, '모르는 단계 값 → 닫힘');
  kvMem.set('community:stage', 'not json'); r = await run('/community/index.html'); ok(r.status === 302, '깨진 값 → 닫힘');
  await setStage('dev');
  for (const p of ['/community', '/community/', '/community/x.js', '/community/a/b.css', '//community/', '/community/index.html?x=1']) { r = await run(p); ok(r.status === 302, '개발 중 정적 경로 차단: ' + p); }
  r = await run('/api/community/feed'); ok(r.status === 403 && (await r.json()).error === 'community-closed', '개발 중 커뮤니티 API 차단');
  r = await run('/api/community/feed', ENV, { headers: { authorization: 'Bearer wrong' } }); ok(r.status === 403, '틀린 관리자 비밀번호 차단');
  r = await run('/api/community/feed', ENV, { headers: { authorization: 'Bearer adm-pw' } }); ok(r.status === 200 && (await r.text()) === 'own', '관리자 비밀번호는 API 통과');
  for (const p of ['/api/community/status', '/api/community/alert', '/api/community/enter']) { r = await run(p); ok(r.status === 200, '잠금 중에도 공개 API: ' + p); }
  for (const p of ['/report/', '/report/v2/', '/gate/?preview=1', '/api/commerce/access', '/communityx', '/api/communityfeed', '/']) { r = await run(p); ok((await r.text()) === 'own', '커뮤니티 밖 경로는 그대로 통과: ' + p); }

  // 2) 입장 쿠키
  r = await enter.onRequestPost({ request: req('/api/community/enter', { method: 'POST' }), env: ENV }); ok(r.status === 401 && (await r.json()).need === 'login', '비로그인 입장 → 로그인 필요');
  r = await enter.onRequestPost({ request: req('/api/community/enter', { method: 'POST', headers: { 'x-member-token': 'tok-plain' } }), env: ENV }); ok(r.status === 403, '초대 안 된 회원은 개발 중 입장 불가');
  r = await enter.onRequestPost({ request: req('/api/community/enter', { method: 'POST', headers: admin }), env: ENV });
  const adminCookie = cookieOf(r); ok(r.status === 200 && adminCookie && /HttpOnly/.test(r.headers.get('set-cookie')) && /Secure/.test(r.headers.get('set-cookie')), '관리자 입장 쿠키(HttpOnly·Secure)');
  ok(!adminCookie.includes('adm-pw'), '쿠키에 비밀번호 없음');
  r = await run('/community/', ENV, { headers: { cookie: 'mt_cm=' + adminCookie } }); ok((await r.text()) === 'own', '관리자 쿠키로 페이지 통과');
  r = await run('/api/community/feed', ENV, { headers: { cookie: 'mt_cm=' + adminCookie } }); ok(r.status === 200, '관리자 쿠키로 API 통과');
  const tamper = adminCookie.replace(/\.v1\.|^v1\.admin/, 'v1.admin').replace(/.$/, c => c === 'A' ? 'B' : 'A'); r = await run('/community/', ENV, { headers: { cookie: 'mt_cm=' + tamper } }); ok(r.status === 302, '서명 바꾼 쿠키 차단');
  const forged = adminCookie.split('.'); forged[1] = 'member'; r = await run('/community/', ENV, { headers: { cookie: 'mt_cm=' + forged.join('.') } }); ok(r.status === 302, '역할 바꾼 쿠키 차단');
  const expired = await C.makeCookie(ENV, 'admin', 'admin', Date.now() - 13 * 3600e3); r = await run('/community/', ENV, { headers: { cookie: 'mt_cm=' + expired } }); ok(r.status === 302, '만료 쿠키 차단');
  r = await run('/community/', { ...ENV, ADMIN_PASSWORD: 'changed' }, { headers: { cookie: 'mt_cm=' + adminCookie } }); ok(r.status === 302, '서명 열쇠가 바뀌면 기존 쿠키 무효');
  ok((await C.makeCookie({}, 'admin', 'admin')) === '', '열쇠가 없으면 쿠키를 만들지 않음');
  r = await enter.onRequestDelete({ request: req('/api/community/enter', { method: 'DELETE' }) }); ok(/Max-Age=0/.test(r.headers.get('set-cookie')), '나가기는 쿠키 삭제');

  // 3) 접근 권한(관리자) → 테스터·베타
  r = await access.onRequestPost({ request: req('/api/community/access', { method: 'POST', headers: H(), body: JSON.stringify({ email: 'tester@example.com', role: 'tester' }) }), env: ENV }); ok(r.status === 401, '권한 주기는 관리자만');
  r = await access.onRequestPost({ request: req('/api/community/access', { method: 'POST', headers: H(admin), body: JSON.stringify({ email: 'Tester@Example.com', role: 'tester', note: '내부' }) }), env: ENV }); ok(r.status === 200, '이메일로 테스터 권한 주기');
  r = await access.onRequestPost({ request: req('/api/community/access', { method: 'POST', headers: H(admin), body: JSON.stringify({ email: 'beta@example.com', role: 'beta' }) }), env: ENV }); ok(r.status === 200, '베타 권한 주기');
  r = await access.onRequestPost({ request: req('/api/community/access', { method: 'POST', headers: H(admin), body: JSON.stringify({ email: 'nobody@example.com', role: 'beta' }) }), env: ENV }); ok(r.status === 404, '가입 안 한 이메일은 404');
  r = await access.onRequestPost({ request: req('/api/community/access', { method: 'POST', headers: H(admin), body: JSON.stringify({ email: 'beta@example.com', role: 'admin' }) }), env: ENV }); ok(r.status === 400, 'admin 역할은 줄 수 없음');
  ok(T.admin_audit_log.filter(x => x.action === 'community.access.grant' && x.actor === '검수자').length === 2, '권한 주기 감사 로그(작업자 이름)');
  r = await access.onRequestGet({ request: req('/api/community/access', { headers: admin }), env: ENV }); let d = await r.json(); ok(d.active === 2 && d.items.every(x => !/^tester@|^beta@/.test(x.email) && x.email.includes('*')), '권한 목록 이메일 가림');

  const enterAs = async tok => enter.onRequestPost({ request: req('/api/community/enter', { method: 'POST', headers: { 'x-member-token': tok } }), env: ENV });
  r = await enterAs('tok-tester'); const testerCookie = cookieOf(r); ok(r.status === 200 && (await r.json()).role === 'tester', '테스터는 개발 중 입장');
  const keep = T.member_consents.splice(0, 2); r = await enterAs('tok-tester'); d0 = await r.json(); ok(r.status === 409 && d0.need === 'consent' && d0.docs.length === 2 && !cookieOf(r), '필수 동의 전 테스터 → 동의 요청(쿠키 없음)'); T.member_consents.unshift(...keep);
  r = await enterAs('tok-beta'); ok(r.status === 403, '베타 회원은 개발 중 입장 불가');
  await setStage('beta');
  r = await enterAs('tok-beta'); const betaCookie = cookieOf(r); ok(r.status === 200, '베타 단계에서 베타 회원 입장');
  r = await enterAs('tok-plain'); ok(r.status === 403, '베타 단계에서 일반 회원 입장 불가');
  r = await run('/community/', ENV, { headers: { cookie: 'mt_cm=' + betaCookie } }); ok((await r.text()) === 'own', '베타 쿠키로 페이지 통과');
  await setStage('dev');
  r = await run('/community/', ENV, { headers: { cookie: 'mt_cm=' + betaCookie } }); ok(r.status === 302, '개발 중으로 낮추면 베타 쿠키 즉시 무효');
  r = await run('/community/', ENV, { headers: { cookie: 'mt_cm=' + testerCookie } }); ok((await r.text()) === 'own', '테스터 쿠키는 개발 중에도 유효');
  r = await access.onRequestDelete({ request: req('/api/community/access?user=' + USERS['tok-tester'].id, { method: 'DELETE', headers: admin }), env: ENV }); ok(r.status === 200, '권한 회수');
  r = await enterAs('tok-tester'); ok(r.status === 403, '회수 뒤 새 입장 불가');
  ok(T.community_access.find(x => x.user_id === USERS['tok-tester'].id).revoked_at, '회수해도 행은 남음');

  // 4) 공개 단계 변경(관리자·정식 공개 확인)
  const put = (b, h = admin) => status.onRequestPut({ request: req('/api/community/status', { method: 'PUT', headers: H(h), body: JSON.stringify(b) }), env: ENV });
  r = await put({ stage: 'beta' }, {}); ok(r.status === 401, '단계 변경은 관리자만');
  r = await put({ stage: 'open' }); ok(r.status === 400, '모르는 단계 거부');
  r = await put({ stage: 'public' }); ok(r.status === 400, '정식 공개는 확인 문구 필요');
  r = await put({ stage: 'beta' }); d = await r.json(); ok(r.status === 200 && d.stage === 'beta' && d.audited && d.history[0].from === 'dev', '베타 전환·이력·감사 로그');
  r = await status.onRequestGet({ request: req('/api/community/status'), env: ENV }); d = await r.json(); ok(d.stage === 'beta' && d.label === '비공개 베타' && d.inside === false, '공개 상태 확인(쿠키 없음 → inside false)');
  r = await status.onRequestGet({ request: req('/api/community/status', { headers: { cookie: 'mt_cm=' + betaCookie } }), env: ENV }); ok((await r.json()).inside === true, '베타 쿠키 → inside true');
  // 8단계: 점검표 미달이면(이 가짜 DB 에는 지표가 없다) 사유 없이 못 연다
  r = await put({ stage: 'public', confirm: '정식 공개' }); d = await r.json(); ok(r.status === 409 && d.need === 'checklist' && d.failing.length > 0, '점검표 미달: 정식 공개 막힘');
  r = await put({ stage: 'public', confirm: '정식 공개', override: true, reason: '짧' }); ok(r.status === 400, '기준 미달 공개는 사유 필요');
  r = await put({ stage: 'public', confirm: '정식 공개', override: true, reason: '대표 승인 — 소규모 시범 공개' }); d = await r.json(); ok(r.status === 200 && d.checklist && d.checklist.override && T.admin_audit_log.some(x => x.action === 'community.stage' && x.detail && x.detail.checklist && x.detail.checklist.reason), '사유와 함께 정식 공개·감사 로그에 점검 결과');
  r = await run('/community/'); ok((await r.text()) === 'own', '정식 공개면 누구나 통과');
  r = await put({ stage: 'dev' }); ok(r.status === 200, '다시 개발 중으로 되돌리기');
  r = await run('/community/'); ok(r.status === 302, '되돌리면 즉시 닫힘');
  ok(T.admin_audit_log.filter(x => x.action === 'community.stage').length === 3, '단계 변경 3건 모두 감사 로그');

  // 5) 출시 알림
  const V = alert.CONSENT_VERSION;
  const post = (b, h = {}, ip = '1.1.1.1') => alert.onRequestPost({ request: req('/api/community/alert', { method: 'POST', headers: H({ 'cf-connecting-ip': ip, ...h }), body: JSON.stringify(b) }), env: ENV });
  r = await post({ email: 'g@example.com', consentVersion: V }); ok(r.status === 400, '동의 없으면 거부');
  r = await post({ email: 'g@example.com', consent: 'yes', consentVersion: V }); ok(r.status === 400, '동의는 true 만 인정');
  r = await post({ email: 'g@example.com', consent: true, consentVersion: 'old' }); ok(r.status === 409, '옛 동의 문구 버전 거부');
  r = await post({ email: 'not-mail', consent: true, consentVersion: V }); ok(r.status === 400, '이메일 형식 검사');
  r = await post({ email: 'x@users.mantrafortune.com', consent: true, consentVersion: V }); ok(r.status === 400, '내부용 주소 거부');
  r = await post({ email: 'bot@example.com', consent: true, consentVersion: V, website: 'http://spam' }); ok(r.status === 200 && !T.launch_alerts.some(x => x.email === 'bot@example.com'), '봇 함정: 성공한 척, 저장 안 함');
  r = await post({ email: ' G@Example.com ', consent: true, consentVersion: V }); ok(r.status === 200, '비회원 신청');
  const row = T.launch_alerts.find(x => x.email === 'g@example.com');
  ok(row && row.consent_version === V && !row.user_id && /^[0-9a-f]{64}$/.test(row.revoke_token_hash) && row.history.length === 1 && row.source === 'gate', '신청 행: 소문자 이메일·동의 버전·토큰 해시·이력');
  const mail = mails.find(x => x.tags[0].value === 'launch-alert' && x.to[0] === 'g@example.com'); const tok = mail && (mail.text.match(/t=([0-9a-f]{48})/) || [])[1];
  ok(tok && mail.html.includes('출시 알림 철회하기') && !JSON.stringify(T.launch_alerts).includes(tok), '확인 메일에 철회 링크, 서버에는 토큰 원문 없음');
  const mailsBefore = mails.length;
  r = await post({ email: 'g@example.com', consent: true, consentVersion: V }); ok(r.status === 200 && T.launch_alerts.filter(x => x.email === 'g@example.com').length === 1 && mails.length === mailsBefore, '중복 신청은 같은 응답·행 하나·메일 재발송 없음');
  r = await post({ action: 'revoke', token: 'f'.repeat(48) }); ok(r.status === 200 && T.launch_alerts.includes(row), '없는 토큰도 같은 응답, 철회 안 됨');
  r = await post({ action: 'revoke', token: 'bad' }); ok(r.status === 400, '토큰 형식 검사');
  r = await post({ action: 'revoke', token: tok }); ok(r.status === 200 && !T.launch_alerts.some(x => x.email === 'g@example.com'), '메일 링크로 철회 → 바로 삭제');
  r = await post({ action: 'revoke', token: tok }); ok(r.status === 200, '같은 링크 두 번 눌러도 같은 응답');
  r = await post({ email: 'g@example.com', consent: true, consentVersion: V }); ok(r.status === 200 && T.launch_alerts.filter(x => x.email === 'g@example.com').length === 1, '철회 뒤 다시 신청 가능');
  r = await post({ consent: true, consentVersion: V, email: 'ignored@example.com' }, { 'x-member-token': 'tok-plain' }); d = await r.json();
  const mrow = T.launch_alerts.find(x => x.email === 'plain@example.com'); ok(d.ok && d.member && mrow && mrow.user_id === USERS['tok-plain'].id && !T.launch_alerts.some(x => x.email === 'ignored@example.com'), '회원은 계정 이메일로 신청');
  r = await post({ action: 'mine' }, { 'x-member-token': 'tok-plain' }); d = await r.json(); ok(d.subscribed && d.email.includes('*'), '회원 본인 신청 여부(가린 이메일)');
  r = await post({ action: 'mine' }); ok(r.status === 401, '비회원 mine 은 로그인 필요');
  r = await post({ action: 'revoke' }, { 'x-member-token': 'tok-plain' }); ok(r.status === 200 && !T.launch_alerts.includes(mrow), '회원 본인 철회 → 바로 삭제');
  r = await alert.onRequestGet({ request: req('/api/community/alert'), env: ENV }); ok(r.status === 401, '현황은 관리자만');
  r = await alert.onRequestGet({ request: req('/api/community/alert', { headers: admin }), env: ENV }); d = await r.json();
  ok(d.active === 1 && d.revoked === 0 && d.guests === 1 && d.members === 0 && d.recent.every(x => x.email.includes('*') && !x.email.startsWith('g@')), '관리자 현황: 수·이메일 가림');
  let last; for (let i = 0; i < 22; i++) last = await post({ email: 'flood' + i + '@example.com', consent: true, consentVersion: V }, {}, '9.9.9.9'); ok(last.status === 429, '같은 IP 1시간 20회 제한');
  r = await alert.onRequestPost({ request: req('/api/community/alert', { method: 'POST', body: '{}' }), env: { ...ENV, SUPABASE_URL: '' } }); ok(r.status === 503, 'Supabase 없으면 503');

  // 6) 탈퇴 시 회원 출시 알림 삭제
  const acc = await imp('functions/_account.js');
  T.launch_alerts.push({ id: seq++, email: 'beta@example.com', purpose: 'community_launch', user_id: USERS['tok-beta'].id, history: [] });
  global.fetch = (f => async (u, o) => (String(u).includes('/rest/v1/commerce_orders') || String(u).includes('commerce_identities')) ? new Response('[]', { status: 200 }) : String(u).includes('/auth/v1/admin/users/') && o && o.method === 'DELETE' ? new Response('', { status: 200 }) : f(u, o))(global.fetch);
  const w = await acc.withdraw(ENV, USERS['tok-beta'].id, { unlinkKakao: false }); ok(w.ok && !T.launch_alerts.some(x => x.user_id === USERS['tok-beta'].id), '탈퇴하면 회원의 출시 알림 삭제');

  // 7) 사이트 잠금과 함께(무빙툰 공개 모드): 커뮤니티는 비밀번호 화면이 아니라 커뮤니티 잠금이 처리
  const PUB = { ...ENV, SITE_GATE_PASSWORD: 'pw', SITE_GATE_REPORT_PUBLIC: '1' };
  r = await run('/community/', PUB); ok(r.status === 302 && r.headers.get('location') === '/gate/?community=closed', '공개 모드 + 개발 중: 준비 중으로');
  r = await run('/community/', PUB, { headers: { cookie: 'mt_cm=' + testerCookie } }); ok((await r.text()) === 'own', '공개 모드 + 테스터 쿠키: 비밀번호 없이 통과');
  r = await run('/', PUB); ok(r.headers.get('location') === '/report/', '첫 방문 → 처음 화면 숨김(기본)이라 심층 분석으로(2026-11-16)');
  r = await run('/gate/gate.js', PUB); ok((await r.text()) === 'own', '첫 화면 파일 공개');

  // 8) 화면 파일 점검(정적): 동의 문구 버전 일치·선택 기본 미동의·움직임 줄이기·준비 중 처리
  const gjs = fs.readFileSync(path.join(__dirname, '../gate/gate.js'), 'utf8'), ghtml = fs.readFileSync(path.join(__dirname, '../gate/index.html'), 'utf8'), gcss = fs.readFileSync(path.join(__dirname, '../gate/gate.css'), 'utf8');
  ok(gjs.includes("CONSENT_VERSION = '" + V + "'"), '화면과 서버 동의 문구 버전 같음');
  ok(/id="alAgree">/.test(gjs) && !/id="alAgree" checked/.test(gjs) && /id="alBtn" disabled/.test(gjs), '동의 체크 기본 해제·버튼 비활성');
  ok(gjs.includes('REDUCE') && gcss.includes('prefers-reduced-motion'), '움직임 줄이기 지원');
  ok(/목적.*수집 항목.*보유 기간.*철회 방법/s.test(gjs), '목적·항목·보유 기간·철회 방법 고지');
  ok(gjs.includes("community') === 'closed'") && gjs.includes("alert') === 'revoke'"), '준비 중·철회 링크 처리');
  ok(!/location\.(href|replace)\s*=\s*['"]\/report/.test(gjs), '마지막 서비스로 자동 이동하지 않음');
  ok(ghtml.includes('href="/report/"') && fs.readFileSync(path.join(__dirname, '../report/index.html'), 'utf8').includes('href="/gate/"'), '심층 분석 ↔ 첫 화면 링크');

  if (fails.length) { console.log('실패 ' + fails.length + '건 / ' + n); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
  console.log('community-gate-sim OK: ' + n + '항목(잠금 단계·입장 쿠키·권한·단계 변경·출시 알림·탈퇴·사이트 잠금·화면)');
})().catch(e => { console.error(e); process.exit(1); });
