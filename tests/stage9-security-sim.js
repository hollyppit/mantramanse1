// 9단계(기술·보안·배포 원칙) 검증: node tests/stage9-security-sim.js
// 기능별 스위치 · 관리자 인증 대입 막기 · 보안 머리말 · 하루 한도 · 보안 점검 도구. 가짜 Supabase·메모리 KV, 네트워크 호출 0.
const path = require('path'), url = require('url'), fs = require('fs');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

(async () => {
  const F = await imp('functions/_features.js'), CM = await imp('functions/_community.js'), MW = await imp('functions/_middleware.js'), S = await imp('functions/_staff.js');
  const featuresApi = await imp('functions/api/community/features.js'), staffApi = await imp('functions/api/community/staff.js'), meApi = await imp('functions/api/community/me.js');
  const api = {}; for (const f of ['posts', 'post', 'comments', 'react', 'today', 'records', 'match', 'verify', 'chat']) api[f] = await imp('functions/api/community/' + f + '.js');

  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
  const U = '11111111-1111-1111-1111-111111111111';
  const db = { staff: [], audit: [] };
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(), body = init.body ? JSON.parse(init.body) : null;
    const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    if (u.includes('/auth/v1/user')) return (init.headers.authorization || '') === 'Bearer tok-1' ? res({ id: U, email: 'a@x.test' }) : res({}, 401);
    if (u.includes('/rest/v1/admin_staff')) { if (method === 'POST') { db.staff.push({ id: db.staff.length + 1, revoked_at: null, ...body }); return res(null, 201); } return res(db.staff.filter(s => s.key_hash === (q(u, 'key_hash') || '').slice(3))); }
    if (u.includes('/rest/v1/admin_audit_log')) { db.audit.push(body); return res(null, 201); }
    return res([]);   // 나머지는 빈 결과(이 테스트는 스위치·인증만 본다)
  };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm', COMMUNITY_SECRET: 'c'.repeat(32), SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc' };
  const req = (p, { key, tok, body, method = 'GET', ip = '1.1.1.1' } = {}) => new Request('https://x.test' + p, { method, headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(key ? { authorization: 'Bearer ' + key } : {}), ...(tok ? { 'x-member-token': tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const call = async (m, fn, p, o) => { const r = await m[fn]({ request: req(p, o), env, waitUntil: () => { } }); let d = {}; try { d = await r.json(); } catch { } return { s: r.status, d }; };
  const OPR = (await call(staffApi, 'onRequestPost', '/api/community/staff', { key: 'adm', method: 'POST', body: { action: 'create', name: '운영', role: 'operator' } })).d.key;

  // ── 기능 스위치 기본값: 모두 켜짐(지금까지와 같은 동작)
  ok(Object.values(F.cleanFeatures(null)).every(Boolean) && Object.keys(F.FEATURES).join() === 'plaza,records,match,chat', '기본 모두 켜짐·4개');
  ok(F.cleanFeatures({ match: false, plaza: 'no' }).match === false && F.cleanFeatures({ plaza: 'no' }).plaza === true, 'false 만 꺼짐');
  let r = await call(meApi, 'onRequestGet', '/api/community/me', {}); ok(r.d.member === false && r.d.features && r.d.features.match === true, '나 API: 비회원에게도 스위치 상태');

  // ── 스위치 바꾸기: 관리자만
  r = await call(featuresApi, 'onRequestPut', '/api/community/features', { key: OPR, method: 'PUT', body: { features: { match: false } } }); ok(r.s === 403, '운영 매니저는 스위치를 못 바꿈');
  r = await call(featuresApi, 'onRequestGet', '/api/community/features', { key: OPR }); ok(r.s === 200 && r.d.labels.chat, '운영자는 보기 가능');
  r = await call(featuresApi, 'onRequestGet', '/api/community/features', {}); ok(r.s === 401, '비로그인 보기 불가');
  r = await call(featuresApi, 'onRequestPut', '/api/community/features', { key: 'adm', method: 'PUT', body: { features: { evil: false } } }); ok(r.s === 400, '모르는 기능 거절');
  r = await call(featuresApi, 'onRequestPut', '/api/community/features', { key: 'adm', method: 'PUT', body: { features: { match: 'off' } } }); ok(r.s === 400, '켜짐/꺼짐 값만');
  r = await call(featuresApi, 'onRequestPut', '/api/community/features', { key: 'adm', method: 'PUT', body: { features: { match: false, chat: false } } });
  ok(r.s === 200 && r.d.changed.join() === 'match,chat' && db.audit.some(a => a.action === 'community.features' && a.detail.changed.match === false), '인연·대화 끄기·감사 로그');

  // ── 꺼진 기능 API 는 403 feature-off, 켜진 기능은 그대로
  for (const [f, fn] of [['match', 'onRequestGet'], ['match', 'onRequestPost'], ['verify', 'onRequestPost'], ['chat', 'onRequestGet'], ['chat', 'onRequestPost']]) {
    r = await call(api[f], fn, '/api/community/' + f, { tok: 'tok-1', method: fn === 'onRequestGet' ? 'GET' : 'POST', body: fn === 'onRequestGet' ? undefined : {} });
    ok(r.s === 403 && r.d.need === 'feature-off', '꺼짐: ' + f + ' ' + fn);
  }
  r = await call(api.posts, 'onRequestPost', '/api/community/posts', { tok: 'tok-1', method: 'POST', body: {} }); ok(r.d.need !== 'feature-off', '켜짐: 광장 글쓰기는 그대로');
  r = await call(api.match, 'onRequestGet', '/api/community/match', { key: 'adm' }); ok(r.d.need !== 'feature-off', '관리자 비밀번호는 꺼져도 점검 가능');
  r = await call(api.match, 'onRequestGet', '/api/community/match', { key: OPR }); ok(r.d.need !== 'feature-off', '유효한 운영자 열쇠도 점검 가능');
  r = await call(api.match, 'onRequestGet', '/api/community/match', { key: 'mts_' + 'f'.repeat(32), tok: 'tok-1' }); ok(r.d.need === 'feature-off', '가짜 운영자 열쇠로는 스위치를 못 넘음');
  await call(featuresApi, 'onRequestPut', '/api/community/features', { key: 'adm', method: 'PUT', body: { features: { plaza: false, records: false } } });
  for (const f of ['posts', 'comments', 'react', 'today', 'records']) { r = await call(api[f], 'onRequestGet' in api[f] && f !== 'react' ? 'onRequestGet' : 'onRequestPost', '/api/community/' + f, { tok: 'tok-1', method: f === 'react' ? 'POST' : 'GET', body: f === 'react' ? {} : undefined }); ok(r.d.need === 'feature-off', '꺼짐: ' + f); }
  r = await call(api.post, 'onRequestPatch', '/api/community/post', { tok: 'tok-1', method: 'PATCH', body: {} }); ok(r.d.need === 'feature-off', '꺼짐: 글 고치기');
  // 내 것 지우기는 꺼져 있어도 된다(개인정보 — 내 글·기록은 언제든 지울 수 있어야)
  r = await call(api.records, 'onRequestDelete', '/api/community/records', { tok: 'tok-1', method: 'DELETE' }); ok(r.d.need !== 'feature-off', '꺼져도 내 기록 지우기 가능');
  r = await call(api.post, 'onRequestDelete', '/api/community/post?id=1', { tok: 'tok-1', method: 'DELETE' }); ok(r.d.need !== 'feature-off', '꺼져도 내 글 지우기 가능');
  r = await call(api.comments, 'onRequestDelete', '/api/community/comments?id=1', { tok: 'tok-1', method: 'DELETE' }); ok(r.d.need !== 'feature-off', '꺼져도 내 댓글 지우기 가능');
  await call(featuresApi, 'onRequestPut', '/api/community/features', { key: 'adm', method: 'PUT', body: { features: { plaza: true, records: true, match: true, chat: true } } });
  r = await call(api.match, 'onRequestGet', '/api/community/match', { tok: 'tok-1' }); ok(r.d.need !== 'feature-off', '다시 켜면 바로 열림');

  // ── 관리자 인증 대입 막기
  const thr = (key, ip) => CM.authThrottle(req('/api/community/mod', { key, ip }), env);
  for (let i = 0; i < CM.AUTH_FAIL_MAX; i++) ok(await thr('wrong' + i, '9.9.9.9') === null || i < 0, i === 0 ? '틀린 비밀번호 20번까지는 통과(각 API 가 401)' : '');
  let t = await thr('wrong-x', '9.9.9.9'); ok(t && t.status === 429 && t.headers.get('retry-after') === '3600', '21번째부터 429');
  t = await thr('adm', '9.9.9.9'); ok(t && t.status === 429, '막힌 동안은 맞는 비밀번호도 429');
  ok(await thr('adm', '8.8.8.8') === null, '다른 IP 는 영향 없음');
  ok(await CM.authThrottle(req('/api/community/mod', { tok: 'tok-1', ip: '9.9.9.9' }), env) === null, '회원(Bearer 없음)은 영향 없음');
  for (let i = 0; i < 30; i++) await thr('adm', '7.7.7.7');
  ok(await thr('adm', '7.7.7.7') === null, '맞는 비밀번호는 몇 번을 써도 실패로 세지 않음');
  for (let i = 0; i < 30; i++) await thr(OPR, '6.6.6.6');
  ok(await thr(OPR, '6.6.6.6') === null, '유효한 운영자 열쇠도 실패로 세지 않음');
  const g = await CM.communityGate(req('/api/community/mod', { key: 'wrong', ip: '9.9.9.9' }), env); ok(g && g.status === 429, '잠금(미들웨어)에서 바로 429');
  ok((await CM.communityGate(req('/api/community/status', { key: 'adm', ip: '9.9.9.9' }), env)).status === 429, '공개 API(단계 변경)도 대입 막기 적용');

  // ── 보안 머리말
  const wrap = (p, res = new Response('x')) => MW.withSecurity(new Request('https://x.test' + p), res);
  for (const p of ['/community/', '/community/cm.js', '/gate/', '/report/admin/', '/report/admin/staff.html', '/api/community/me', '/api/account/consent']) {
    const h = wrap(p).headers; ok(h.get('x-content-type-options') === 'nosniff' && h.get('x-frame-options') === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(h.get('content-security-policy') || '') && h.get('referrer-policy'), '보안 머리말: ' + p);
  }
  // 2026-11-26 보안 2차: 결제 화면(/report/)·루트·나머지 API 에도 같은 머리말 + https 면 HSTS
  for (const p of ['/report/', '/report/v2/', '/', '/api/commerce/access', '/communityx', '/api/communityfeed']) { const h = wrap(p).headers; ok(h.get('x-frame-options') === 'SAMEORIGIN' && h.get('x-content-type-options') === 'nosniff' && /^max-age=\d{7,}/.test(h.get('strict-transport-security') || ''), '모든 경로 보안 머리말·HSTS: ' + p); }
  ok(!MW.withSecurity(new Request('http://localhost/report/'), new Response('x')).headers.get('strict-transport-security'), 'http(로컬)에는 HSTS 없음');
  const keep = wrap('/community/', new Response('x', { headers: { 'x-frame-options': 'DENY' } })); ok(keep.headers.get('x-frame-options') === 'DENY', '이미 있는 머리말은 덮어쓰지 않음');
  const redir = wrap('/community/', new Response(null, { status: 302, headers: { location: '/gate/' } })); ok(redir.status === 302 && redir.headers.get('location') === '/gate/', '되돌려 보내기 응답 유지');
  const mwRes = await MW.onRequest({ request: new Request('https://x.test/report/v2/'), env: {}, next: () => new Response('own') }); ok((await mwRes.text()) === 'own' && mwRes.headers.get('x-frame-options') === 'SAMEORIGIN', '미들웨어: 심층 분석 응답 본문 그대로 + 보안 머리말');

  // ── 하루 한도(도배·봇)
  const day = new Date().toISOString().slice(0, 10);
  store.set('cm:rate:idv:' + U + ':' + day, '20');
  r = await call(api.verify, 'onRequestPost', '/api/community/verify', { tok: 'tok-1', method: 'POST', body: { action: 'start' } }); ok(r.s === 429 || r.d.need === 'consent', '본인인증 하루 20번 한도(동의 확인 뒤)');
  const src = f => read('functions/api/community/' + f + '.js');
  ok(/overLimit\(env, 'react:' \+ uid, 500\)/.test(src('react')) && /overLimit\(env, 'block:' \+ me\.id, 50\)/.test(src('block')) && /overLimit\(env, 'log:' \+ w\.me\.id, 30\)/.test(src('today')) && /overLimit\(env, 'idv:' \+ me\.id, 20\)/.test(src('verify')) && /overLimit\(env, 'edit:' \+ w\.member\.id, 60\)/.test(src('post')), '새 하루 한도 5곳');

  // ── 보안 점검 도구
  const A = require(path.join(__dirname, '..', 'tools', 'security-audit.cjs'));
  const rows = A.run(), rep = A.report(rows);
  ok(rows.length > 150 && !rep.fails.length, '보안 점검 도구: ' + rows.length + '개 점검 실패 0');
  ok(['A 인증', 'B 도배·봇', 'C 감사', 'D DB', 'E 비밀값', 'F 업로드', 'G 개인정보', 'H 기능 스위치', 'I 보안 머리말'].every(a => rows.some(x => x.area === a)), '점검 9개 영역');
  ok(/RLS 꺼진 표/.test(read('tools/security-audit.sql')) && /search_path/.test(read('tools/security-audit.sql')) && /cm-purge-activity/.test(read('tools/security-audit.sql')), 'DB 점검 SQL');

  // ── 화면
  const cm = read('community/cm.js'), v2 = read('report/admin/v2-community.js');
  ok(/function applyFeatures/.test(cm) && /routeFeature\(p\)/.test(cm) && /featOn\('match'\)/.test(cm) && /cm\.js\?v=20261116-/.test(read('community/index.html')), '광장 화면: 꺼진 기능 탭 숨김·안내');
  ok(!/[^$]\$\('[^']+'(, [a-z.]+)?\)\.(forEach|map|length)/.test(cm), '광장 화면: 목록 선택 오류 없음');
  ok(/⑯ 기능별 스위치/.test(v2) && /loadFeatures\(\)/.test(v2) && /C\('owner', '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑯/.test(v2), '관리자 ⑯ 카드(관리자만)');

  if (fails.length) { console.error('stage9-security-sim 실패 ' + fails.length + '/' + n + '\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('stage9-security-sim OK: ' + n + '항목(기능 스위치·내 것 지우기 허용·대입 막기·보안 머리말·하루 한도·보안 점검 도구·화면)');
})().catch(e => { console.error(e); process.exit(1); });
