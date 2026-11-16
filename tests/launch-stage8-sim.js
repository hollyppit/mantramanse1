// 8단계(정식 공개 조건 점검표) 검증: node tests/launch-stage8-sim.js
// 가짜 Supabase(REST·count 머리말)·메모리 KV 로 functions/_launch.js · /api/community/launch · /api/community/status(정식 공개 막기)를 실행한다. 네트워크 호출 0.
const path = require('path'), url = require('url'), fs = require('fs');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

(async () => {
  const L = await imp('functions/_launch.js'), S = await imp('functions/_staff.js');
  const launch = await imp('functions/api/community/launch.js'), status = await imp('functions/api/community/status.js'), staffApi = await imp('functions/api/community/staff.js');

  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
  const B1 = '11111111-1111-1111-1111-111111111111', B2 = '22222222-2222-2222-2222-222222222222';
  // 운영 데이터(가짜): 기준을 다 넘는 상태로 시작
  const W = { metrics: { active: { all: { mau: 500 }, community: { ret7: { base: 100, back: 40 }, ret30: { base: 100, back: 30 } } }, engage: { posts: 80, comments: 200 }, members: { total: 1000, alerts: 400 } },
    access: Array.from({ length: 12 }, (_, i) => ({ user_id: String(i).padStart(8, '0') + B1.slice(8) })), activity: Array.from({ length: 6 }, (_, i) => ({ user_id: String(i).padStart(8, '0') + B1.slice(8) })), reactions: 500, posts: 150, perCat: 20, oldest: [], fail: {} };
  const db = { staff: [], audit: [] };
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  const counted = (nn, s = 200) => new Response('[]', { status: s, headers: { 'content-range': '0-0/' + nn } });
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(), body = init.body ? JSON.parse(init.body) : null;
    const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    if (u.includes('/rest/v1/rpc/cm_metrics')) return W.fail.metrics ? res({}, 500) : res(W.metrics);
    if (u.includes('/rest/v1/community_access')) return res(W.access);
    if (u.includes('/rest/v1/cm_activity')) return res(W.activity);
    if (u.includes('/rest/v1/cm_reactions')) { ok(init.headers.prefer === 'count=exact' && /limit=1$/.test(u), '공감 개수: count 머리말 요청'); return counted(W.reactions); }
    if (u.includes('/rest/v1/cm_posts')) return W.fail.posts ? res({}, 500) : counted(q(u, 'category') ? W.perCat : W.posts);
    if (u.includes('/rest/v1/cm_reports')) return res(W.oldest);
    if (u.includes('/rest/v1/admin_staff')) { if (method === 'POST') { db.staff.push({ id: db.staff.length + 1, revoked_at: null, ...body }); return res(null, 201); } return res(db.staff.filter(s => s.key_hash === (q(u, 'key_hash') || '').slice(3))); }
    if (u.includes('/rest/v1/admin_audit_log')) { db.audit.push(body); return res(null, 201); }
    throw new Error('unexpected fetch ' + method + ' ' + u);
  };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm', COMMUNITY_SECRET: 'c'.repeat(32), SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc' };
  const req = (p, { key, body, method = 'GET' } = {}) => new Request('https://x.test' + p, { method, headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const call = async (m, fn, p, o) => { const r = await m[fn]({ request: req(p, o), env }); return { s: r.status, d: await r.json() }; };
  const keyOf = async role => (await call(staffApi, 'onRequestPost', '/api/community/staff', { key: 'adm', method: 'POST', body: { action: 'create', name: role, role } })).d.key;
  const ANA = await keyOf('analyst'), OPR = await keyOf('operator'), MOD = await keyOf('moderator');
  const allManual = async () => { for (const k of Object.keys(L.MANUAL)) await call(launch, 'onRequestPost', '/api/community/launch', { key: 'adm', method: 'POST', body: { action: 'check', item: k, done: true, note: '테스트 계정으로 확인' } }); };

  // ── 기본값·기준 정리
  const c0 = L.cleanConfig(null);
  ok(c0.targets.members === 300 && c0.targets.reportHours === 48 && Object.values(c0.manual).every(m => !m.done), '기본 기준·사람 확인은 모두 미완료');
  ok(L.cleanConfig({ targets: { members: -1, betaRate: 150, ret7: '30', reportHours: 0 } }).targets.members === 300 && L.cleanConfig({ targets: { betaRate: 150 } }).targets.betaRate === 40 && L.cleanConfig({ targets: { ret7: '30' } }).targets.ret7 === 30 && L.cleanConfig({ targets: { reportHours: 0 } }).targets.reportHours === 48, '범위 밖 기준은 기본값');
  ok(Object.keys(L.MANUAL).join() === 'moderation,privacy,security,performance', '사람 확인 4개');

  // ── 순수 판정
  let e = L.evaluate({}, c0); ok(!e.ready && e.items.length === 8 && e.failing.length === 8, '자료 없음: 8항목 모두 미달');
  ok(e.items.map(i => i.no).join() === '1,2,3,4,5,6,7,8', '지시문 순서 8항목');

  // ── API 권한
  let r = await call(launch, 'onRequestGet', '/api/community/launch', {}); ok(r.s === 401, '비로그인 불가');
  r = await call(launch, 'onRequestGet', '/api/community/launch', { key: MOD }); ok(r.s === 403, '모더레이터: 점검표 볼 수 없음');
  r = await call(launch, 'onRequestGet', '/api/community/launch', { key: ANA }); ok(r.s === 200 && r.d.items.length === 8 && r.d.role === 'analyst', '분석 담당: 점검표 보기');
  ok(!r.d.ready && r.d.failing.join().includes('7.') && r.d.failing.join().includes('8.') && r.d.failing.length === 2, '자료는 통과·사람 확인(7·8)만 미달');
  const it = id => r.d.items.find(i => i.id === id);
  ok(it('beta').rows[1].value === 50 && it('retention').rows[0].value === 40 && it('content').rows[1].value === 5 && it('moderation').rows[0].value === 0, '베타 참여율 50%·재방문 40%·주제 5/5·미처리 신고 0시간');
  r = await call(launch, 'onRequestPut', '/api/community/launch', { key: OPR, method: 'PUT', body: { targets: { members: 1 } } }); ok(r.s === 403, '운영 매니저: 기준 못 바꿈');
  r = await call(launch, 'onRequestPost', '/api/community/launch', { key: OPR, method: 'POST', body: { action: 'check', item: 'privacy', done: true, note: 'x확인' } }); ok(r.s === 403, '운영 매니저: 사람 확인 못 함');

  // ── 사람 확인
  r = await call(launch, 'onRequestPost', '/api/community/launch', { key: 'adm', method: 'POST', body: { action: 'check', item: 'privacy', done: true } }); ok(r.s === 400, '확인 메모 필수');
  r = await call(launch, 'onRequestPost', '/api/community/launch', { key: 'adm', method: 'POST', body: { action: 'check', item: 'evil', done: true, note: '메모' } }); ok(r.s === 400, '모르는 항목 거절');
  await allManual();
  ok(db.audit.filter(a => a.action === 'community.launch.check').length === 4, '사람 확인 감사 로그');
  r = await call(launch, 'onRequestGet', '/api/community/launch', { key: ANA }); ok(r.d.ready && !r.d.failing.length, '모두 통과');
  r = await call(launch, 'onRequestPost', '/api/community/launch', { key: 'adm', method: 'POST', body: { action: 'check', item: 'security', done: false, note: '재점검 필요' } });
  r = await call(launch, 'onRequestGet', '/api/community/launch', { key: ANA }); ok(!r.d.ready && r.d.failing.length === 1 && r.d.failing[0].startsWith('8.'), '확인 해제하면 다시 미달');
  await allManual();

  // ── 데이터별 미달
  const fresh = async () => (await call(launch, 'onRequestGet', '/api/community/launch', { key: ANA })).d;
  W.oldest = [{ created_at: new Date(Date.now() - 72 * 3600000).toISOString() }]; ok((await fresh()).failing.some(f => f.startsWith('7.')), '72시간 묵은 신고 → 7 미달'); W.oldest = [];
  W.activity = []; ok((await fresh()).failing.some(f => f.startsWith('3.')), '베타 회원이 광장을 안 씀 → 3 미달'); W.activity = Array.from({ length: 6 }, (_, i) => ({ user_id: String(i).padStart(8, '0') + B1.slice(8) }));
  W.perCat = 2; ok((await fresh()).failing.some(f => f.startsWith('6.')), '주제별 글 부족 → 6 미달'); W.perCat = 20;
  W.fail.metrics = true; let d = await fresh(); ok(!d.ready && d.metricsOk === false && d.failing.some(f => f.startsWith('1.')), '지표 함수 실패 → 미달(통과로 보지 않음)'); W.fail.metrics = false;
  W.fail.posts = true; ok((await fresh()).failing.some(f => f.startsWith('6.')), '글 개수 실패 → 미달'); W.fail.posts = false;
  ok((await fresh()).ready, '되돌리면 다시 통과');

  // ── 기준값 바꾸기(운영 데이터에 맞게)
  r = await call(launch, 'onRequestPut', '/api/community/launch', { key: 'adm', method: 'PUT', body: { targets: { members: 5000, mau: 'x' } } });
  ok(r.s === 200 && r.d.targets.members === 5000 && r.d.targets.mau === 100 && r.d.changed.join() === 'members', '기준 저장·잘못된 값 무시');
  ok(db.audit.some(a => a.action === 'community.launch.targets' && a.detail.changed.members[1] === 5000), '기준 변경 감사 로그');
  d = await fresh(); ok(!d.ready && d.failing[0].startsWith('1.'), '기준을 올리면 미달');
  ok(JSON.parse(store.get(L.LAUNCH_KEY)).manual.privacy.done, '기준을 바꿔도 사람 확인은 유지');

  // ── 정식 공개 전환
  store.set('community:stage', JSON.stringify({ stage: 'beta' }));
  const put = b => call(status, 'onRequestPut', '/api/community/status', { key: 'adm', method: 'PUT', body: b });
  r = await put({ stage: 'public', confirm: '정식 공개' }); ok(r.s === 409 && r.d.need === 'checklist' && r.d.failing[0].startsWith('1.'), '미달이면 정식 공개 막힘');
  ok(JSON.parse(store.get('community:stage')).stage === 'beta', '막히면 단계 그대로');
  r = await put({ stage: 'public', confirm: '정식 공개', override: true }); ok(r.s === 400 && r.d.need === 'reason', '사유 없는 기준 미달 공개 거절');
  r = await call(status, 'onRequestPut', '/api/community/status', { key: OPR, method: 'PUT', body: { stage: 'public', confirm: '정식 공개', override: true, reason: '운영자가 몰래 공개' } }); ok(r.s === 401, '운영자 열쇠로는 공개 단계를 못 바꿈');
  await call(launch, 'onRequestPut', '/api/community/launch', { key: 'adm', method: 'PUT', body: { targets: { members: 300 } } });
  r = await put({ stage: 'public', confirm: '정식 공개' }); ok(r.s === 200 && r.d.checklist.ready && !r.d.checklist.override, '모두 통과면 사유 없이 정식 공개');
  ok(db.audit.some(a => a.action === 'community.stage' && a.detail.checklist && a.detail.checklist.ready === true), '공개 감사 로그에 점검 결과');
  r = await put({ stage: 'dev' }); ok(r.s === 200 && !r.d.checklist, '닫을 때는 점검 없이 바로');
  W.metrics.members.total = 10;
  r = await put({ stage: 'public', confirm: '정식 공개', override: true, reason: '대표 승인 시범 공개' }); ok(r.s === 200 && r.d.checklist.override && r.d.checklist.failing.length === 1, '사유와 함께 기준 미달 공개');
  ok(db.audit.some(a => a.action === 'community.stage' && a.detail.checklist && a.detail.checklist.reason === '대표 승인 시범 공개'), '기준 미달 공개 사유가 감사 로그에');
  r = await put({ stage: 'public', confirm: '정식 공개' }); ok(r.s === 200, '이미 공개 중이면 다시 저장해도 막지 않음');

  // ── 화면·문서
  const v2 = read('report/admin/v2-community.js'), gate = read('functions/api/community/status.js');
  ok(/⑮ 정식 공개 점검표/.test(v2) && /loadLaunch/.test(v2) && /override: true, reason: why/.test(v2) && /data-chk/.test(v2) && /lnSave/.test(v2), '관리자 화면: 점검표·사람 확인·기준·미달 공개 사유');
  ok(/role === 'owner'/.test(v2), '관리자 화면: 바꾸기는 관리자만');
  ok(/checklist/.test(gate) && /need: 'reason'/.test(gate), '공개 전환 코드에 점검');
  ok(/v2-community\.js\?v=20261116-stage8/.test(read('report/admin/index.html')) && /v2-community\.js\?v=20261116-stage8/.test(read('report/admin/staff.html')), '캐시 버전');

  if (fails.length) { console.error('launch-stage8-sim 실패 ' + fails.length + '/' + n + '\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('launch-stage8-sim OK: ' + n + '항목(기준값·8항목 판정·권한·사람 확인·자료 실패는 미달·기준 변경·정식 공개 막기/사유·화면)');
})().catch(e => { console.error(e); process.exit(1); });
