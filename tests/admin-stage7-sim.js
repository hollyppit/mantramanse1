// 7단계(통합 관리자·성과 분석) 검증: node tests/admin-stage7-sim.js
// 가짜 Supabase(REST·Auth)·메모리 KV 로 운영자 열쇠 권한, 잠금 통과, 지표·회원 찾기·운테크 문안·열쇠 API, 이용 기록, 화면 파일을 확인한다. 네트워크 호출 0.
const path = require('path'), url = require('url'), fs = require('fs');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

(async () => {
  const S = await imp('functions/_staff.js'), CM = await imp('functions/_community.js'), A = await imp('functions/_activity.js'), D = await imp('functions/_daily.js');
  const metrics = await imp('functions/api/community/metrics.js'), staffApi = await imp('functions/api/community/staff.js'), members = await imp('functions/api/community/members.js');
  const copyApi = await imp('functions/api/community/today-copy.js'), mod = await imp('functions/api/community/mod.js'), auditApi = await imp('functions/api/community/audit.js');
  const meApi = await imp('functions/api/community/me.js'), access = await imp('functions/api/commerce/access.js'), today = await imp('functions/api/community/today.js');
  const { DOCS } = await imp('functions/_consent.js');

  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
  const U1 = '11111111-1111-1111-1111-111111111111', U2 = '22222222-2222-2222-2222-222222222222';
  const USERS = { 'tok-1': { id: U1, email: 'alice.kim@x.test', created_at: '2026-11-01T00:00:00Z' }, 'tok-2': { id: U2, email: 'bo@x.test', created_at: '2026-11-02T00:00:00Z' } };
  const db = { staff: [], activity: [], audit: [], profiles: [{ user_id: U1, nickname: '달빛소녀', ilju: '갑자', ilgan: '갑', show_ilju: true, show_ilgan: false, visibility: 'members', avatar_path: null, phone: '01012345678', created_at: '2026-11-03T00:00:00Z' }, { user_id: U2, nickname: '새벽', ilju: '을축', ilgan: '을', show_ilju: false, show_ilgan: false, visibility: 'members', avatar_path: 'cm-av/x.webp', phone: null, created_at: '2026-11-04T00:00:00Z' }],
    consents: [{ user_id: U1, kind: 'terms', agreed: true, version: DOCS.terms.version }, { user_id: U1, kind: 'privacy', agreed: true, version: DOCS.privacy.version }, { user_id: U1, kind: 'marketing_email', agreed: true, version: DOCS.marketing_email.version }],
    verif: [{ user_id: U1, provider: 'portone', birth_year: 1994, verified_at: '2026-11-05T00:00:00Z' }], sanctions: [{ id: 1, user_id: U1, kind: 'mute', reason: '도배', until: '2099-01-01T00:00:00Z', by_actor: '관리자', created_at: '2026-11-06T00:00:00Z', lifted_at: null }],
    reports: [] };
  let metricsCalls = [];
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  const eqv = v => v && v.startsWith('eq.') ? v.slice(3) : null;
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(), body = init.body ? JSON.parse(init.body) : null;
    const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    { const m = /\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/.exec(u); if (m) { const uu = Object.values(USERS).find(x => x.id === m[1]); return uu ? res(uu) : res({}, 404); } }
    if (u.includes('/auth/v1/user')) { const t = (init.headers.authorization || '').slice(7); return USERS[t] ? res(USERS[t]) : res({}, 401); }
    if (u.includes('/rest/v1/admin_staff')) {
      if (method === 'POST') { if (db.staff.some(s => s.name === body.name)) return res({ code: '23505' }, 409); db.staff.push({ id: db.staff.length + 1, created_at: new Date().toISOString(), revoked_at: null, ...body }); return res(null, 201); }
      const rows = db.staff.filter(s => (!q(u, 'key_hash') || s.key_hash === eqv(q(u, 'key_hash'))) && (!q(u, 'id') || String(s.id) === eqv(q(u, 'id'))) && (q(u, 'revoked_at') !== 'is.null' || !s.revoked_at));
      if (method === 'PATCH') { rows.forEach(s => Object.assign(s, body)); return res(rows); }
      return res(rows.slice().reverse());
    }
    if (u.includes('/rest/v1/cm_activity')) { if (method === 'POST') { for (const r of [].concat(body)) if (!db.activity.some(a => a.user_id === r.user_id && a.day === r.day && a.surface === r.surface)) db.activity.push(r); return res(null, 201); } return res(db.activity); }
    if (u.includes('/rest/v1/rpc/cm_metrics')) { metricsCalls.push(body); return res({ day: body.p_day, active: { all: { dau: 3, wau: 8, mau: 20, ret7: { base: 10, back: 4 }, ret30: { base: 3, back: 1 } }, report: { dau: 2, wau: 6, mau: 15, ret7: { base: 6, back: 3 }, ret30: { base: 0, back: 0 } }, community: { dau: 1, wau: 3, mau: 8, ret7: { base: 4, back: 1 }, ret30: { base: 0, back: 0 } } }, series: [{ day: body.p_day, report: 2, community: 1 }], engage: { base: 8, engaged: 2, posts: 3, comments: 4, logs: 5 }, convert: { reportUsers: 15, reportBuyers: 3, buyersEver: 4, members: 40, communityUsers: 8, communityAlsoReport: 6, reportAlsoCommunity: 6, communityEver: 9, communityThenPaid: 1, since: '2026-11-16' }, match: { profilesOn: 2, adults: 3, likes7: 4, matches7: 1, roomsOpen: 1, messages7: 9, flagged7: 1, reportsOpen: { post: 1 }, sanctionsActive: 1 }, sales: { report30: { n: 3, won: 29700 }, credits30: { n: 0, won: 0 }, creditsRefunded: { n: 0, won: 0 }, ledger: {}, outstanding: 0 }, members: { total: 40, new7: 2, new30: 10, profiles: 12, alerts: 5 } }); }
    if (u.includes('/rest/v1/rpc/community_user_by_email')) { const uu = Object.values(USERS).find(x => x.email === body.p_email); return res(uu ? uu.id : null); }
    if (u.includes('/rest/v1/admin_audit_log')) { if (method === 'POST') { db.audit.push(body); return res(null, 201); } return res(db.audit.slice().reverse().map((a, i) => ({ id: i + 1, at: new Date().toISOString(), ...a }))); }
    if (u.includes('/rest/v1/member_profiles')) {
      const nick = q(u, 'nickname'), uid = q(u, 'user_id');
      let rows = db.profiles;
      if (uid) rows = rows.filter(p => p.user_id === eqv(uid) || (uid.startsWith('in.(') && uid.includes(p.user_id)));
      if (nick && nick.startsWith('ilike.*')) { const t = nick.slice(7, -1); rows = rows.filter(p => p.nickname.includes(t)); }
      return res(rows);
    }
    if (u.includes('/rest/v1/member_consents')) return res(db.consents.filter(c => c.user_id === eqv(q(u, 'user_id'))));
    if (u.includes('/rest/v1/adult_verifications')) return res(db.verif.filter(c => c.user_id === eqv(q(u, 'user_id'))));
    if (u.includes('/rest/v1/community_access')) return res([]);
    if (u.includes('/rest/v1/cm_sanctions')) return res(db.sanctions.filter(s => !q(u, 'user_id') || s.user_id === eqv(q(u, 'user_id'))));
    if (u.includes('/rest/v1/cm_posts')) return res(q(u, 'author_id') === 'eq.' + U1 ? [{ id: 1 }, { id: 2 }] : []);
    if (u.includes('/rest/v1/cm_comments')) return res(q(u, 'author_id') === 'eq.' + U1 ? [{ id: 1 }] : []);
    if (u.includes('/rest/v1/cm_logs')) return res([]);
    if (u.includes('/rest/v1/cm_reports')) return res([]);
    if (u.includes('/rest/v1/cm_match_profiles')) return res(q(u, 'user_id') === 'eq.' + U1 ? [{ active: true }] : []);
    if (u.includes('/rest/v1/cm_likes')) return res([{ to_id: U2 }]);
    if (u.includes('/rest/v1/cm_rooms')) return res([]);
    if (u.includes('/rest/v1/kv')) return res([]);
    if (u.includes('/rest/v1/member_sajus') || u.includes('/rest/v1/commerce_entitlements')) return res([]);
    throw new Error('unexpected fetch ' + method + ' ' + u);
  };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm-pass', COMMUNITY_SECRET: 'c'.repeat(32), SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon' };
  const req = (p, { key, tok, body, method = 'GET', reviewer, cookie } = {}) => new Request('https://x.test' + p, { method, headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}), ...(tok ? { 'x-member-token': tok } : {}), ...(reviewer ? { 'x-reviewer': encodeURIComponent(reviewer) } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const call = async (mod_, fn, p, opts) => { const r = await mod_[fn]({ request: req(p, opts), env }); return { s: r.status, d: await r.json() }; };
  const ADM = 'adm-pass';

  // ── 운영자 열쇠 만들기(관리자만) · 열쇠 원문은 저장하지 않음
  let r = await call(staffApi, 'onRequestPost', '/api/community/staff', { method: 'POST', body: { action: 'create', name: '민지', role: 'moderator' } });
  ok(r.s === 401, '비로그인: 열쇠 만들기 불가');
  r = await call(staffApi, 'onRequestPost', '/api/community/staff', { key: ADM, method: 'POST', reviewer: '대표', body: { action: 'create', name: '민지', role: 'moderator' } });
  ok(r.s === 200 && S.KEY_RE.test(r.d.key), '관리자: 모더레이터 열쇠 만들기');
  const MOD = r.d.key;
  ok(db.staff.length === 1 && db.staff[0].key_hash.length === 64 && !JSON.stringify(db.staff).includes(MOD) && db.staff[0].created_by === '대표', '저장은 해시만·만든 사람 기록');
  ok(db.audit.some(a => a.action === 'community.staff.create' && a.target === '민지'), '열쇠 만들기 감사 로그');
  const ANA = (await call(staffApi, 'onRequestPost', '/api/community/staff', { key: ADM, method: 'POST', body: { action: 'create', name: '분석', role: 'analyst' } })).d.key;
  const OPR = (await call(staffApi, 'onRequestPost', '/api/community/staff', { key: ADM, method: 'POST', body: { action: 'create', name: '운영', role: 'operator' } })).d.key;
  r = await call(staffApi, 'onRequestPost', '/api/community/staff', { key: ADM, method: 'POST', body: { action: 'create', name: '민지', role: 'analyst' } }); ok(r.s === 409, '같은 이름 거절');
  r = await call(staffApi, 'onRequestPost', '/api/community/staff', { key: ADM, method: 'POST', body: { action: 'create', name: '<b>', role: 'analyst' } }); ok(r.s === 400, '이름 특수문자 거절');
  r = await call(staffApi, 'onRequestPost', '/api/community/staff', { key: ADM, method: 'POST', body: { action: 'create', name: 'x', role: 'owner' } }); ok(r.s === 400, 'owner 역할은 만들 수 없음');
  r = await call(staffApi, 'onRequestPost', '/api/community/staff', { key: OPR, method: 'POST', body: { action: 'create', name: '몰래', role: 'operator' } }); ok(r.s === 403, '운영 매니저는 열쇠를 만들 수 없음');
  r = await call(staffApi, 'onRequestGet', '/api/community/staff', { key: OPR }); ok(r.s === 403, '운영 매니저는 열쇠 목록을 볼 수 없음');
  r = await call(staffApi, 'onRequestGet', '/api/community/staff', { key: ADM }); ok(r.s === 200 && r.d.items.length === 3 && !JSON.stringify(r.d).includes('key_hash'), '열쇠 목록: 해시 없이');

  // ── 역할 확인·권한표
  r = await call(staffApi, 'onRequestGet', '/api/community/staff?view=me', { key: MOD }); ok(r.s === 200 && r.d.role === 'moderator' && r.d.name === '민지' && r.d.perms.includes('mod') && !r.d.perms.includes('metrics'), 'view=me: 모더레이터');
  r = await call(staffApi, 'onRequestGet', '/api/community/staff?view=me', { key: ADM }); ok(r.d.role === 'owner', 'view=me: 관리자 비밀번호는 owner');
  r = await call(staffApi, 'onRequestGet', '/api/community/staff?view=me', { key: 'mts_' + '0'.repeat(32) }); ok(r.s === 401, '없는 열쇠 거절');
  r = await call(staffApi, 'onRequestGet', '/api/community/staff?view=me', { key: 'adm-passx' }); ok(r.s === 401, '틀린 비밀번호 거절');
  ok(S.can({ role: 'operator' }, 'content') && !S.can({ role: 'operator' }, 'staff') && S.can({ role: 'analyst' }, 'metrics') && !S.can({ role: 'analyst' }, 'members') && !S.can({ role: 'moderator' }, 'metrics') && !S.can(null, 'mod'), '권한표');
  const hashA = await S.hashKey(env, MOD), hashB = await S.hashKey({ ...env, COMMUNITY_SECRET: 'd'.repeat(32) }, MOD); ok(hashA !== hashB, '해시 소금은 비밀값에 묶임');

  // ── 잠금(개발 중): 운영자 열쇠는 API 만 통과, 페이지는 안 열림
  store.set('community:stage', JSON.stringify({ stage: 'dev' }));
  ok(await CM.communityGate(req('/api/community/mod', { key: MOD }), env) === null, '잠금: 열쇠로 API 통과');
  const pg = await CM.communityGate(req('/community/', { key: MOD }), env); ok(pg && pg.status === 302, '잠금: 열쇠로 페이지는 안 열림');
  const bad = await CM.communityGate(req('/api/community/mod', { key: 'mts_' + 'f'.repeat(32) }), env); ok(bad && bad.status === 403, '잠금: 없는 열쇠는 막힘');
  ok(await CM.communityGate(req('/api/community/mod', { key: ADM }), env) === null, '잠금: 관리자 비밀번호는 그대로 통과');

  // ── 광장 운영·작업 기록: 역할별 · 작업자 이름은 열쇠 이름
  r = await call(mod, 'onRequestGet', '/api/community/mod?view=sanctions', { key: MOD }); ok(r.s === 200, '모더레이터: 신고·제재 보기');
  r = await call(mod, 'onRequestGet', '/api/community/mod?view=sanctions', { key: ANA }); ok(r.s === 403, '분석 담당: 신고 처리 불가');
  r = await call(mod, 'onRequestGet', '/api/community/mod?view=sanctions', { key: ADM }); ok(r.s === 200, '관리자 비밀번호: 그대로');
  r = await call(mod, 'onRequestPost', '/api/community/mod', { key: MOD, method: 'POST', reviewer: '사칭', body: { action: 'lift', sanctionId: 1 } });
  ok(r.s === 200 && db.audit.some(a => a.action === 'community.sanction.lift' && a.actor === '민지(모더레이터)'), '감사 로그 작업자 = 열쇠 이름(헤더 무시)');
  r = await call(auditApi, 'onRequestGet', '/api/community/audit', { key: MOD }); ok(r.s === 200 && r.d.items.length > 0, '모더레이터: 작업 기록 보기');
  r = await call(auditApi, 'onRequestGet', '/api/community/audit', { key: ANA }); ok(r.s === 403, '분석 담당: 작업 기록 불가');

  // ── 성과 지표
  r = await call(metrics, 'onRequestGet', '/api/community/metrics', { key: ANA });
  ok(r.s === 200 && r.d.active.all.dau === 3 && r.d.role === 'analyst', '분석 담당: 지표 보기');
  ok(r.d.rates.all.ret7 === 40 && r.d.rates.all.ret30 === null && r.d.rates.reportPaid30 === 20 && r.d.rates.paidEver === 10 && r.d.rates.engage === 25 && r.d.rates.communityToReport === 75 && r.d.rates.all.stick === 15, '비율 계산·표본 5명 미만은 null');
  r = await call(metrics, 'onRequestGet', '/api/community/metrics?day=2026-11-10', { key: OPR }); ok(r.s === 200 && metricsCalls[metricsCalls.length - 1].p_day === '2026-11-10', '기준일 지정');
  await call(metrics, 'onRequestGet', '/api/community/metrics?day=2099-01-01', { key: OPR }); ok(metricsCalls[metricsCalls.length - 1].p_day === D.kstDay(), '미래 날짜는 오늘로');
  await call(metrics, 'onRequestGet', "/api/community/metrics?day=1';drop", { key: OPR }); ok(metricsCalls[metricsCalls.length - 1].p_day === D.kstDay(), '잘못된 날짜는 오늘로');
  r = await call(metrics, 'onRequestGet', '/api/community/metrics', { key: MOD }); ok(r.s === 403, '모더레이터: 지표 불가');

  // ── 회원 찾기
  r = await call(members, 'onRequestGet', '/api/community/members?q=달빛', { key: MOD }); ok(r.s === 200 && r.d.items.length === 1 && r.d.items[0].id === U1, '닉네임 일부로 찾기');
  r = await call(members, 'onRequestGet', '/api/community/members?q=' + encodeURIComponent('bo@x.test'), { key: MOD }); ok(r.d.items.length === 1 && r.d.items[0].id === U2, '이메일 정확히 일치로 찾기');
  r = await call(members, 'onRequestGet', '/api/community/members?q=a', { key: MOD }); ok(r.s === 400, '한 글자 검색 거절');
  r = await call(members, 'onRequestGet', '/api/community/members?q=' + encodeURIComponent('*%'), { key: MOD }); ok(r.s === 400, '와일드카드만 넣은 검색 거절');
  r = await call(members, 'onRequestGet', '/api/community/members?id=' + U1, { key: MOD }); const m1 = r.d, js = JSON.stringify(m1);
  ok(r.s === 200 && m1.email === 'al*******@x.test'.replace('*******', '*'.repeat(6)) && !js.includes('alice.kim') && !js.includes('01012345678') && m1.hasPhone === true, '자세히: 이메일 가림·전화번호 없음');
  ok(m1.consents.required && m1.consents.marketing.length === 1 && m1.adult && /대/.test(m1.adult.ageBand) && !js.includes('1994'), '동의 요약·성인 확인은 나이대만');
  ok(m1.counts.posts === 2 && m1.counts.comments === 1 && m1.match.on && m1.match.likesSent === 1 && !('credits' in m1) && m1.sanctions.length === 1, '활동·인연·제재(크레딧 없음)');
  ok(db.audit.some(a => a.action === 'community.member.view' && a.target === U1 && a.actor === '민지(모더레이터)'), '회원 조회 감사 로그');
  r = await call(members, 'onRequestGet', '/api/community/members?id=' + U1, { key: ANA }); ok(r.s === 403, '분석 담당: 회원 찾기 불가');
  r = await call(members, 'onRequestGet', '/api/community/members?id=nope', { key: MOD }); ok(r.s === 400, '잘못된 회원 id 거절');
  ok(members.maskEmail('ab@c.d') === 'a*@c.d' && members.maskEmail('x') === null, '이메일 가림 규칙');

  // ── 운테크 문안 관리
  const before = D.todayCard('갑자', '2026-11-16');
  r = await call(copyApi, 'onRequestGet', '/api/community/today-copy', { key: MOD }); ok(r.s === 403, '모더레이터: 문안 관리 불가');
  r = await call(copyApi, 'onRequestGet', '/api/community/today-copy', { key: OPR }); ok(r.s === 200 && Object.keys(r.d.current.tg).length === 10 && r.d.changed.tg.length === 0, '운영 매니저: 문안 보기');
  const tg = before.tenGod;
  r = await call(copyApi, 'onRequestPut', '/api/community/today-copy', { key: OPR, method: 'PUT', body: { tg: { [tg]: { body: '새 문장입니다.', key: D.TG_COPY[tg].key } } } });
  ok(r.s === 200 && r.d.changed.tg.join() === tg, '문안 저장: 고친 칸만');
  const saved = JSON.parse(store.get(D.DAILY_COPY_KEY)); ok(saved.tg[tg].body === '새 문장입니다.' && !('key' in saved.tg[tg]) && saved.by === '운영(운영 매니저)', '저장 형식·기본과 같은 칸은 빼기·작업자');
  const after = D.todayCard('갑자', '2026-11-16', await D.loadDailyCopy(env)); ok(after.body === '새 문장입니다.' && after.money === before.money, '카드에 반영(다른 칸은 기본)');
  r = await call(copyApi, 'onRequestPut', '/api/community/today-copy', { key: OPR, method: 'PUT', body: { tg: { '모름': { body: 'x' } } } }); ok(r.s === 400, '모르는 십성 거절');
  r = await call(copyApi, 'onRequestPut', '/api/community/today-copy', { key: OPR, method: 'PUT', body: { tg: { [tg]: { body: 'x'.repeat(301) } } } }); ok(r.s === 400, '너무 긴 문장 거절');
  r = await call(copyApi, 'onRequestPut', '/api/community/today-copy', { key: OPR, method: 'PUT', body: { tg: { [tg]: { head: ['하나'] } } } }); ok(r.s === 400, '제목 두 개 아니면 거절');
  r = await call(copyApi, 'onRequestPut', '/api/community/today-copy', { key: OPR, method: 'PUT', body: { rel: { hap: { line: '합 문장 새로' } } } }); ok(r.s === 200 && JSON.parse(store.get(D.DAILY_COPY_KEY)).rel.hap.line === '합 문장 새로', '관계 문안 저장');
  ok(db.audit.filter(a => a.action === 'community.daily.copy').length === 2, '문안 저장 감사 로그');
  r = await call(copyApi, 'onRequestDelete', '/api/community/today-copy', { key: OPR, method: 'DELETE' }); ok(r.s === 200 && !store.has(D.DAILY_COPY_KEY) && D.todayCard('갑자', '2026-11-16', await D.loadDailyCopy(env)).body === before.body, '모두 기본으로');
  ok(!D.cleanDailyCopy({ tg: { '비견': { do: '' } } }).ok && D.cleanDailyCopy({}).ok, '빈 칸 거절·빈 요청 허용');

  // ── 열쇠 회수 → 바로 못 씀(같은 작업 공간 기억 지움)
  const modId = db.staff.find(s => s.name === '민지').id;
  r = await call(staffApi, 'onRequestPost', '/api/community/staff', { key: ADM, method: 'POST', body: { action: 'revoke', id: modId } }); ok(r.s === 200, '열쇠 회수');
  r = await call(mod, 'onRequestGet', '/api/community/mod', { key: MOD }); ok(r.s === 401, '회수한 열쇠 거절');
  ok((await CM.communityGate(req('/api/community/mod', { key: MOD }), env)).status === 403, '회수한 열쇠: 잠금도 막힘');
  r = await call(staffApi, 'onRequestPost', '/api/community/staff', { key: ADM, method: 'POST', body: { action: 'revoke', id: modId } }); ok(r.s === 404, '두 번 회수는 404');
  ok(db.audit.some(a => a.action === 'community.staff.revoke' && a.target === '민지'), '회수 감사 로그');

  // ── 이용 기록: 광장 '나'·심층 분석 잠금 정보에서 하루 한 번
  A._resetSeen();
  await meApi.onRequestGet({ request: req('/api/community/me', { tok: 'tok-1' }), env });
  await meApi.onRequestGet({ request: req('/api/community/me', { tok: 'tok-1' }), env });
  ok(db.activity.filter(a => a.user_id === U1 && a.surface === 'community').length === 1 && db.activity[0].day === D.kstDay(), '광장 이용 기록 하루 한 줄');
  await access.onRequestPost({ request: req('/api/commerce/access', { tok: 'tok-2', method: 'POST', body: { sd: null } }), env });
  ok(db.activity.some(a => a.user_id === U2 && a.surface === 'report'), '심층 분석 이용 기록');
  await access.onRequestPost({ request: req('/api/commerce/access', { method: 'POST', body: { sd: null } }), env });
  ok(db.activity.length === 2, '비로그인은 기록 안 함');
  ok(Object.keys(db.activity[0]).sort().join() === 'day,surface,user_id', '기록 칸은 회원·날짜·영역뿐');
  let waited = null; const ctx = { waitUntil: p => { waited = p; } };
  ok(A.touchLater(ctx, env, U2, 'community') === null && waited, 'waitUntil 이 있으면 뒤에서 기록');
  ok(!(await A.touch(env, U2, 'evil')) && !(await A.touch(env, 'x', 'report')), '모르는 영역·잘못된 id 무시');

  // ── 운테크 카드 API 가 고친 문안을 쓴다
  store.set(D.DAILY_COPY_KEY, JSON.stringify({ tg: Object.fromEntries(Object.keys(D.TG_COPY).map(k => [k, { do: '관리자가 고친 할 일' }])), rel: {} }));
  db.profiles[0].ilgan = '갑';
  global.__orig = global.fetch; const of = global.fetch; global.fetch = async (u, init) => String(u).includes('/rest/v1/cm_logs') ? new Response('[]') : of(u, init);
  r = await call(today, 'onRequestGet', '/api/community/today', { tok: 'tok-1' }); global.fetch = of;
  ok(r.s === 200 && r.d.card && r.d.card.do === '관리자가 고친 할 일', '오늘의 운테크 카드에 반영');

  // ── 화면 파일
  const v2 = read('report/admin/v2-community.js'), st = read('report/admin/staff.html'), idx = read('report/admin/index.html'), mig = read('supabase/migrations/20261116_admin_stage7.sql'), priv = read('report/legal/privacy.html');
  ok(/open: function \(p, r\)/.test(v2) && /C\('owner'/.test(v2) && /C\('metrics'/.test(v2) && /C\('members'/.test(v2) && /C\('content'/.test(v2), '관리자 화면: 역할별 카드');
  ok(!/[^$]\$\('[^']+'(, [a-z.]+)?\)\.(forEach|map|length)/.test(v2), '관리자 화면: 단일 선택으로 목록을 돌리지 않음');
  ok(/staff\?view=me/.test(st) && /V2Community\.open\(key, d\.role\)/.test(st) && /sessionStorage/.test(st) && !/localStorage\.setItem\('mt_staff_key'/.test(st), '운영자 콘솔: 역할 확인·탭에만 보관');
  ok(/v2-community\.js\?v=20261116-\w+/.test(idx) && /v2-community\.js\?v=20261116-\w+/.test(st), '캐시 버전');
  ok(/enable row level security/.test(mig) && /revoke all on public\.cm_activity, public\.admin_staff from anon, authenticated/.test(mig) && /grant execute on function public\.cm_metrics\(date\) to service_role/.test(mig) && /13 months/.test(mig) && /cm-purge-activity/.test(mig), '마이그레이션: 서버 전용·13개월 파기');
  ok(/이용 기록\(날짜·이용한 영역\): 13개월/.test(priv), '개인정보처리방침: 이용 기록');

  if (fails.length) { console.error('admin-stage7-sim 실패 ' + fails.length + '/' + n + '\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('admin-stage7-sim OK: ' + n + '항목(운영자 열쇠·권한표·잠금 통과·역할별 API·감사 작업자·지표·회원 찾기·운테크 문안·이용 기록·화면·마이그레이션)');
})().catch(e => { console.error(e); process.exit(1); });
