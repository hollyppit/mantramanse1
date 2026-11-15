// 회원 동의·프로필 검증(통합 플랫폼 2단계):  node tests/member-consent-sim.js
// 가짜 Supabase(메모리 표)·가짜 KV·가짜 메일로 실제 functions 코드를 돌린다. 네트워크 없음.
const path = require('path'), url = require('url'), fs = require('fs');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);
const B = 'https://mantramanse.pages.dev';
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');

const USERS = { 'tok-a': { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'a@example.com' }, 'tok-b': { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'b@example.com' }, 'tok-t': { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', email: 't@example.com' } };
const T = { member_consents: [], consent_events: [], member_profiles: [], community_access: [{ user_id: USERS['tok-t'].id, role: 'tester', revoked_at: null }], admin_audit_log: [] };
const KEYS = { member_consents: ['user_id', 'kind'], member_profiles: ['user_id'] };
let seq = 1; const mails = [];
function match(row, qs) {
  for (const [k, v] of qs) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue;
    const val = row[k] == null ? null : String(row[k]);
    if (v === 'is.null') { if (row[k] != null) return false; }
    else if (v === 'is.true') { if (row[k] !== true) return false; }
    else if (v.startsWith('eq.')) { if (val !== decodeURIComponent(v.slice(3))) return false; }
    else if (v.startsWith('neq.')) { if (val === decodeURIComponent(v.slice(4))) return false; }
    else if (v.startsWith('like.')) { const p = decodeURIComponent(v.slice(5)).replace(/\*$/, ''); if (!val || !val.startsWith(p)) return false; }
  }
  return true;
}
global.fetch = async (u, o = {}) => {
  u = String(u); const m = o.method || 'GET', body = o.body ? JSON.parse(o.body) : null, res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
  if (u.startsWith('https://api.resend.com/')) { mails.push(body); return res({ id: 'm' }); }
  if (u.endsWith('/auth/v1/user')) { const t = (o.headers.authorization || '').slice(7), x = USERS[t]; return x ? res(x) : res({}, 401); }
  const mm = u.match(/\/rest\/v1\/(\w+)(?:\?(.*))?$/); if (!mm) throw Error('unexpected fetch ' + u);
  const name = mm[1], tbl = T[name]; if (!tbl) return res({ message: 'relation does not exist' }, 404);
  const qs = [...new URLSearchParams(mm[2] || '')];
  if (m === 'GET') { let rows = tbl.filter(r => match(r, qs)); const lim = qs.find(q => q[0] === 'limit'); if (lim) rows = rows.slice(0, +lim[1]); const sel = (qs.find(q => q[0] === 'select') || [])[1]; return res(rows.map(r => sel ? Object.fromEntries(sel.split(',').map(k => [k, r[k]])) : { ...r })); }
  if (m === 'POST') {
    const list = Array.isArray(body) ? body : [body], oc = qs.find(q => q[0] === 'on_conflict');
    for (const b of list) {
      if (name === 'member_profiles' && b.nickname && tbl.some(r => r.nickname === b.nickname && r.user_id !== b.user_id)) return res({ code: '23505' }, 409);
      const keys = oc ? oc[1].split(',') : KEYS[name];
      const i = keys ? tbl.findIndex(r => keys.every(k => r[k] === b[k])) : -1;
      if (i >= 0) { if (!oc) return res({ code: '23505' }, 409); Object.assign(tbl[i], b); } else tbl.push({ id: seq++, at: new Date().toISOString(), ...b });
    }
    return res(null, 201);
  }
  if (m === 'PATCH') { tbl.filter(r => match(r, qs)).forEach(r => Object.assign(r, body)); return res(null, 204); }
  if (m === 'DELETE') { for (let i = tbl.length - 1; i >= 0; i--) if (match(tbl[i], qs)) tbl.splice(i, 1); return res(null, 204); }
};
const kvMem = new Map();
const ENV = { ADMIN_PASSWORD: 'adm-pw', SUPABASE_URL: 'https://sb.local', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', RESEND_API_KEY: 'rk', KAKAO_CHANNEL_URL: 'https://pf.kakao.com/_abcDE',
  GLOSSARY_KV: { get: async (k, t) => { const v = kvMem.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { kvMem.set(k, String(v)); }, delete: async k => kvMem.delete(k), list: async () => ({ keys: [], list_complete: true }) } };

(async () => {
  const consent = await imp('functions/api/account/consent.js'), profile = await imp('functions/api/account/profile.js'), C = await imp('functions/_consent.js');
  const enter = await imp('functions/api/community/enter.js'), audit = await imp('functions/api/community/audit.js'), mw = await imp('functions/_middleware.js');
  const call = (mod, tok, b) => mod.onRequestPost({ request: new Request(B + '/api/x', { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { 'x-member-token': tok } : {}) }, body: JSON.stringify(b) }), env: ENV });
  const cs = async (tok, b) => { const r = await call(consent, tok, b); return { s: r.status, d: await r.json() }; };
  const pf = async (tok, b) => { const r = await call(profile, tok, b); return { s: r.status, d: await r.json() }; };
  const V = Object.fromEntries(C.KINDS.map(k => [k, C.DOCS[k].version]));
  const A = USERS['tok-a'].id, evs = (id, kind) => T.consent_events.filter(e => e.user_id === id && (!kind || e.kind === kind));

  // 1) 처음 = 모두 동의 안 함(기존 회원에게 동의를 임의로 넣지 않는다)
  let x = await cs(null, { action: 'get' }); ok(x.s === 401, '비로그인 → 401');
  x = await cs('tok-a', { action: 'get' });
  ok(x.s === 200 && C.KINDS.every(k => x.d.state[k].agreed === false) && x.d.requiredOk === false, '처음에는 모든 항목 동의 안 함');
  ok(x.d.docs.length === 6 && x.d.docs.filter(d => d.required).length === 2, '문서 6종(필수 2)');
  ok(x.d.kakaoChannel === 'https://pf.kakao.com/_abcDE' && x.d.phone === null, '카카오 채널 주소·번호 없음');
  ok(T.member_consents.length === 0, '조회만으로는 행이 생기지 않음');

  // 2) 입력 검사
  x = await cs('tok-a', { action: 'set', changes: { marketing_email: true }, versions: { marketing_email: 'old' } }); ok(x.s === 409, '옛 문구 버전으로 동의 → 409');
  x = await cs('tok-a', { action: 'set', changes: { marketing_email: 'yes' }, versions: V }); ok(x.s === 400, '예/아니오가 아닌 값 거절');
  x = await cs('tok-a', { action: 'set', changes: { marketing_fax: true }, versions: V }); ok(x.s === 400, '모르는 항목 거절');
  x = await cs('tok-a', { action: 'set', changes: { terms: false }, versions: V }); ok(x.s === 400, '필수 동의 철회 거절');
  x = await cs('tok-a', { action: 'set', changes: { marketing_night: true }, versions: V }); ok(x.s === 400, '받을 채널 없이 야간 수신만 동의 → 거절');
  ok(T.member_consents.length === 0 && T.consent_events.length === 0, '거절된 요청은 아무것도 저장하지 않음');

  // 3) 필수 동의 → 이력 2건, 광고 메일 없음
  let m0 = mails.length;
  x = await cs('tok-a', { action: 'set', changes: { terms: true, privacy: true }, versions: V, via: 'gate' });
  ok(x.s === 200 && x.d.requiredOk && evs(A).length === 2 && evs(A).every(e => e.action === 'grant' && e.via === 'gate'), '필수 동의 저장·이력(처음 화면 경로)');
  ok(mails.length === m0 && x.d.mailed === false, '필수 동의만 바뀌면 수신 설정 메일 없음');
  x = await cs('tok-a', { action: 'set', changes: { terms: true }, versions: V }); ok(x.s === 200 && x.d.changed.length === 0 && evs(A).length === 2, '같은 값 다시 보내면 이력 추가 없음');

  // 4) 이메일 광고 동의 → 처리 결과 메일
  m0 = mails.length;
  x = await cs('tok-a', { action: 'set', changes: { marketing_email: true }, versions: V });
  ok(x.s === 200 && x.d.state.marketing_email.agreed && x.d.mailed && mails.length === m0 + 1, '이메일 수신 동의 + 처리 결과 메일');
  const mail = mails[mails.length - 1];
  ok(mail.to[0] === 'a@example.com' && /처리 결과/.test(mail.subject) && /수신 동의/.test(mail.text) && /만트라 스튜디오/.test(mail.text), '메일: 보낸 곳·처리 일시·결과');
  ok(!mail.subject.includes('(광고)') && /법정 안내 메일/.test(mail.html), '처리 결과 메일은 광고가 아닌 법정 안내');
  x = await cs('tok-a', { action: 'set', changes: { marketing_night: true }, versions: V }); ok(x.s === 200 && x.d.state.marketing_night.agreed, '채널이 있으면 야간 수신 동의 가능');

  // 5) 문자: 휴대폰 번호 필수·형식 검사
  x = await cs('tok-a', { action: 'set', changes: { marketing_sms: true }, versions: V }); ok(x.s === 400 && x.d.needPhone, '문자 동의에 번호 없음 → 거절');
  x = await cs('tok-a', { action: 'set', changes: { marketing_sms: true }, versions: V, phone: '02-123-4567' }); ok(x.s === 400, '휴대폰이 아닌 번호 거절');
  ok(!evs(A, 'marketing_sms').length, '거절된 문자 동의는 이력 없음');
  x = await cs('tok-a', { action: 'set', changes: { marketing_sms: true }, versions: V, phone: '010-1234-5678' });
  ok(x.s === 200 && x.d.state.marketing_sms.agreed && x.d.phone === '010-****-5678', '문자 동의 + 번호 저장(가려서 응답)');
  ok(T.member_profiles.find(r => r.user_id === A).phone === '01012345678', '번호는 숫자만 저장');
  x = await cs('tok-a', { action: 'set', changes: { marketing_kakao: true }, versions: V }); ok(x.s === 200 && x.d.state.marketing_kakao.agreed, '이미 번호가 있으면 카카오톡 동의에 다시 안 적어도 됨');
  x = await cs('tok-a', { action: 'set', changes: {}, versions: V, phone: '01099998888' }); ok(x.s === 200 && x.d.phone === '010-****-8888', '번호만 바꾸기');
  x = await cs('tok-a', { action: 'set', changes: { marketing_sms: false }, versions: V }); ok(x.s === 200 && T.member_profiles.find(r => r.user_id === A).phone === '01099998888', '카카오톡 동의가 남아 있으면 번호 유지');
  x = await cs('tok-a', { action: 'set', changes: { marketing_kakao: false }, versions: V }); ok(x.s === 200 && T.member_profiles.find(r => r.user_id === A).phone === null && x.d.phone === null, '문자·카카오톡 모두 철회 → 번호 삭제');

  // 6) 모든 채널 철회 → 야간 수신도 같이 철회, 철회 이력·메일
  m0 = mails.length;
  x = await cs('tok-a', { action: 'set', changes: { marketing_email: false }, versions: V });
  ok(x.s === 200 && !x.d.state.marketing_night.agreed && x.d.changed.some(c => c.kind === 'marketing_night' && c.action === 'revoke'), '채널을 모두 끄면 야간 수신도 철회');
  ok(mails.length === m0 + 1 && /수신 거부/.test(mails[mails.length - 1].text), '철회 처리 결과 메일');
  ok(evs(A, 'marketing_email').map(e => e.action).join() === 'grant,revoke', '이메일 동의·철회 이력이 모두 남음');
  ok(x.d.requiredOk, '광고 철회는 필수 동의에 영향 없음');

  // 7) 프로필
  x = await pf('tok-b', { action: 'save', nickname: '벚꽃길' }); ok(x.s === 409 && x.d.need === 'consent', '필수 동의 전 프로필 저장 불가');
  x = await pf('tok-a', { action: 'get' }); ok(x.s === 200 && x.d.profile.nickname === '' && x.d.profile.visibility === 'members' && !x.d.profile.showIlju, '프로필 기본값(회원에게만·일주 숨김)');
  ok(x.d.communityOpen === false, '개발 중 일반 회원 → 광장 프로필 카드 안 보임');
  for (const [nick, why] of [['a', '1자'], ['열세글자가넘는닉네임입니다요', '13자 이상'], ['공식만트라', '운영자 사칭'], ['admin_kim', 'admin'], ['이름 공백', '공백'], ['<b>x</b>', '기호']]) { x = await pf('tok-a', { action: 'save', nickname: nick }); ok(x.s === 400, '닉네임 거절: ' + why); }
  x = await pf('tok-a', { action: 'save', nickname: '달빛', bio: '오픈채팅 https://open.kakao.com/o/x' }); ok(x.s === 400, '소개에 링크 거절');
  x = await pf('tok-a', { action: 'save', nickname: '달빛', bio: '연락 010-1234-5678' }); ok(x.s === 400, '소개에 전화번호 거절');
  x = await pf('tok-a', { action: 'save', nickname: '달빛', bio: '갑목 일간입니다', visibility: 'public', showIlju: true });
  ok(x.s === 200 && x.d.profile.nickname === '달빛' && x.d.profile.visibility === 'public' && x.d.profile.showIlju && !x.d.profile.showIlgan, '프로필 저장');
  ok(!('phone' in x.d.profile), '프로필 응답에 휴대폰 번호 없음');
  x = await pf('tok-a', { action: 'save', nickname: '달빛', visibility: 'everyone' }); ok(x.s === 200 && x.d.profile.visibility === 'members', '모르는 공개 범위 → 회원에게만');
  await cs('tok-b', { action: 'set', changes: { terms: true, privacy: true }, versions: V });
  x = await pf('tok-b', { action: 'save', nickname: '달빛' }); ok(x.s === 409 && x.d.field === 'nickname', '다른 회원과 같은 닉네임 → 409');
  x = await pf('tok-b', { action: 'save', nickname: '별빛' }); ok(x.s === 200, '다른 닉네임은 저장');
  x = await pf('tok-t', { action: 'get' }); ok(x.s === 200 && x.d.communityOpen === true, '테스터는 개발 중에도 광장 프로필 카드');

  // 8) 광장 입장: 필수 동의 전 409 → 동의 후 통과
  const enterAs = tok => enter.onRequestPost({ request: new Request(B + '/api/community/enter', { method: 'POST', headers: { 'x-member-token': tok } }), env: ENV });
  let r = await enterAs('tok-t'); let j = await r.json(); ok(r.status === 409 && j.need === 'consent' && j.docs.every(d => d.required), '테스터라도 필수 동의 전 → 동의 요청');
  await cs('tok-t', { action: 'set', changes: { terms: true, privacy: true }, versions: V, via: 'gate' });
  r = await enterAs('tok-t'); ok(r.status === 200 && /mt_cm=/.test(r.headers.get('set-cookie') || ''), '동의 후 테스터 입장');
  r = await enter.onRequestPost({ request: new Request(B + '/api/community/enter', { method: 'POST', headers: { authorization: 'Bearer adm-pw' } }), env: ENV }); ok(r.status === 200, '관리자는 동의 없이 입장');
  const saved = T.member_consents; T.member_consents = undefined;   // 표가 아직 없을 때(마이그레이션 전) → 닫힌 쪽
  delete T.member_consents; r = await enterAs('tok-t'); ok(r.status === 409, '동의 표를 못 읽으면 입장 불가(닫힌 쪽)'); T.member_consents = saved;

  // 9) 관리자 통계·감사 로그
  r = await consent.onRequestGet({ request: new Request(B + '/api/account/consent'), env: ENV }); ok(r.status === 401, '통계: 관리자만');
  r = await consent.onRequestGet({ request: new Request(B + '/api/account/consent', { headers: { authorization: 'Bearer adm-pw' } }), env: ENV }); j = await r.json();
  ok(r.status === 200 && j.byKind.terms.agreed === 3 && j.byKind.marketing_email.agreed === 0, '항목별 동의 수');
  ok(j.recent.length > 0 && j.recent.every(e => !('user_id' in e)), '최근 변경에 회원 id 없음');
  T.member_consents.push({ user_id: USERS['tok-b'].id, kind: 'marketing_email', agreed: true, version: V.marketing_email, granted_at: new Date(Date.now() - 710 * 864e5).toISOString() });
  r = await consent.onRequestGet({ request: new Request(B + '/api/account/consent', { headers: { authorization: 'Bearer adm-pw' } }), env: ENV }); j = await r.json();
  ok(j.byKind.marketing_email.renewDue === 1, '동의 2년 30일 전 → 재확인 대상');
  T.admin_audit_log.push({ id: 1, at: '2026-11-16T01:00:00Z', actor: '검수자', action: 'community.stage', target: 'beta', detail: {} }, { id: 2, at: '2026-11-16T02:00:00Z', actor: '검수자', action: 'other.x', target: null, detail: {} });
  r = await audit.onRequestGet({ request: new Request(B + '/api/community/audit'), env: ENV }); ok(r.status === 401, '감사 로그: 관리자만');
  r = await audit.onRequestGet({ request: new Request(B + '/api/community/audit?action=community.', { headers: { authorization: 'Bearer adm-pw' } }), env: ENV }); j = await r.json();
  ok(r.status === 200 && j.items.length === 1 && j.items[0].action === 'community.stage', '감사 로그 작업 종류로 거르기');
  kvMem.set('community:stage', JSON.stringify({ stage: 'dev' }));
  r = await mw.onRequest({ request: new Request(B + '/api/community/audit'), env: ENV, next: () => new Response('own') }); ok(r.status === 403, '감사 로그 API 는 커뮤니티 잠금 안쪽');
  r = await mw.onRequest({ request: new Request(B + '/api/account/consent', { method: 'POST' }), env: ENV, next: () => new Response('own') }); ok((await r.text()) === 'own', '동의 API 는 커뮤니티 잠금과 무관(마이페이지)');

  // 10) 파일 점검
  const sql = read('supabase/migrations/20261116_member_stage2.sql');
  ok(['consent_documents', 'member_consents', 'consent_events', 'member_profiles'].every(t => new RegExp('alter table public\\.' + t + '\\s+enable row level security').test(sql)), '새 표 4개 RLS 켬');
  ok(/revoke all on public\.consent_documents, public\.member_consents, public\.consent_events, public\.member_profiles from anon, authenticated/.test(sql) && !/grant .* to (anon|authenticated)/i.test(sql), '브라우저 권한 회수·부여 없음');
  ok(!/alter table public\.(commerce_|member_sajus|launch_alerts|community_access)/.test(sql), '기존 표 변경 없음');
  ok(/on delete set null/.test(sql.split('consent_events')[1] || ''), '탈퇴해도 동의 이력은 남김(회원 연결만 끊음)');
  ok(C.KINDS.every(k => sql.includes(`'${k}'`) && sql.includes(`'${C.DOCS[k].version}'`)), 'DB 문서 버전 = 서버 DOCS');
  const me = read('report/hub/hub-me.js');
  ok(/H\.MeConsent\.mount\(sess\.access_token, ctx\)/.test(me) && /id=\\?"meConsent\\?"/.test(me), '마이페이지에 수신 설정 카드');
  ok(/communityOpen/.test(me) && /채널을 추가해도 광고 수신에 동의한 것으로 보지 않습니다/.test(me), '광장 프로필은 입장 가능한 회원만·채널 추가 ≠ 광고 동의 안내');
  ok(!/checked'?\s*:\s*''\)\s*\+\s*' checked/.test(me) && /처음에는 모두 <b>받지 않음<\/b>/.test(me), '기본 받지 않음 안내');
  ok(read('report/hub/index.html').includes('hub-me.js?v=20261116-cs') && read('report/story/story.js').includes("HV = '?v=20261116-cs'"), '허브 캐시 버전 올림');
  const gate = read('gate/gate.js');
  ok(/function showRequired/.test(gate) && /\[필수\]/.test(gate) && /type="submit" disabled>동의하고 들어가기/.test(gate), '처음 화면 필수 동의 시트(체크 전 버튼 꺼짐)');

  if (fails.length) { console.error('member-consent-sim 실패 ' + fails.length + '/' + n + ':\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('member-consent-sim OK: ' + n + '항목(동의 기본값·입력 검사·필수/광고 분리·처리 결과 메일·휴대폰·야간·프로필·광장 입장·관리자 통계·감사 로그·파일)');
})().catch(e => { console.error(e); process.exit(1); });
