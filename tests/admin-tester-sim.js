// 관리자 테스트 회원으로 인연의 광장 들어가기 검증: node tests/admin-tester-sim.js
// 가짜 Supabase(Auth 관리자·REST)·메모리 KV 로 functions/_testers.js · /api/community/test-login · 오늘의 인연 제외를 실행한다. 네트워크 호출 0.
const path = require('path'), url = require('url'), fs = require('fs'), vm = require('vm');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

(async () => {
  const T = await imp('functions/_testers.js'), M = await imp('functions/_match.js'), api = await imp('functions/api/community/test-login.js');
  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
  const users = {}; const tables = {}; const audit = []; let created = 0, links = 0;
  const REAL = '99999999-9999-9999-9999-999999999999';
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase(), body = init.body ? JSON.parse(init.body) : null;
    const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    if (u.endsWith('/auth/v1/admin/users') && method === 'POST') { created++; const id = String(created).padStart(8, '0') + '-0000-0000-0000-000000000000'; users[body.email] = id; return res({ id, email: body.email }); }
    if (u.endsWith('/auth/v1/admin/generate_link')) { links++; return res({ hashed_token: 'h' + links }); }
    if (u.endsWith('/auth/v1/verify')) return res({ access_token: 'at-' + links, refresh_token: 'rt-' + links });
    if (u.includes('/rest/v1/rpc/community_user_by_email')) return res(users[body.p_email] || null);
    if (u.includes('/rest/v1/admin_audit_log')) { audit.push(body); return res(null, 201); }
    const m = /\/rest\/v1\/(\w+)/.exec(u); if (!m) throw new Error('unexpected ' + u);
    const t = tables[m[1]] = tables[m[1]] || [];
    if (method === 'POST') {
      const ignore = /ignore-duplicates/.test((init.headers || {}).prefer || ''); const conflict = (/on_conflict=([\w,]+)/.exec(u) || [])[1] || 'user_id'; const keys = conflict.split(',');
      for (const r of [].concat(body)) { const ex = t.find(x => keys.every(k => x[k] === r[k])); if (ex) { if (!ignore) Object.assign(ex, r); } else t.push({ ...r }); }
      return res(null, 201);
    }
    // GET (candidatePool 용 간단 필터)
    if (m[1] === 'cm_match_profiles') return res(t.filter(x => x.active && !u.includes('user_id=neq.' + encodeURIComponent(x.user_id))));
    if (m[1] === 'adult_verifications') return res(t);
    return res([]);
  };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm', COMMUNITY_SECRET: 'c'.repeat(32), SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon' };
  const call = async (body, key) => { const r = await api.onRequestPost({ request: new Request('https://x.test/api/community/test-login', { method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) }, body: JSON.stringify(body) }), env }); return { s: r.status, d: await r.json(), h: r.headers }; };

  // ── 권한
  let r = await call({ as: 'a' }); ok(r.s === 401, '관리자만 테스트 회원으로 열 수 있음');
  r = await call({ as: 'z' }, 'adm'); ok(r.s === 400, 'A·B 만');

  // ── 처음: 계정·동의·프로필·성인 확인·테스터 권한·인연 프로필 준비
  r = await call({ as: 'a' }, 'adm');
  const A = users[T.TESTERS.a.email];
  ok(r.s === 200 && /^[0-9a-f]{32}$/.test(r.d.code) && r.d.to === '/report/auth-return.html?to=%2Fcommunity%2F&admin_login=' + r.d.code && r.d.tester.label === '테스트 회원 A', '테스트 회원 A: 일회용 코드·복귀 주소');
  ok(/mt_cm=v1\.admin\./.test(r.h.get('set-cookie') || ''), '관리자 입장 쿠키도 함께(개발 중에도 열림)');
  ok(created === 1 && A && /@users\.mantrafortune\.com$/.test(T.TESTERS.a.email), '내부 주소 회원 1명 생성(메일 안 감)');
  const by = (tb) => (tables[tb] || []).filter(x => x.user_id === A);
  ok(by('member_consents').length === 2 && by('member_consents').every(x => x.agreed && x.version), '필수 동의 2개');
  ok(by('member_profiles')[0].nickname === '관리자테스트A' && by('member_profiles')[0].ilju === '갑자', '광장 프로필');
  ok(by('adult_verifications')[0].provider === 'manual' && by('adult_verifications')[0].birth_year === 1990, '성인 확인(관리자 수동)');
  ok(by('community_access')[0].role === 'tester', '테스터 권한');
  ok(by('cm_match_profiles')[0].active && by('cm_match_profiles')[0].purposes.length === 3, '인연 프로필 켜짐');
  ok(audit.some(a => a.action === 'community.tester.login' && a.target === '테스트 회원 A'), '감사 로그');
  ok(JSON.parse(store.get(T.TESTERS_KEY)).a === A, 'KV 테스트 회원 목록');

  // ── 일회용 코드: 한 번만
  const code = r.d.code;
  let c = await call({ code }); ok(c.s === 200 && c.d.access_token && c.d.refresh_token && c.d.slot === 'a', '코드로 세션 받기');
  c = await call({ code }); ok(c.s === 410, '같은 코드 두 번은 안 됨');
  c = await call({ code: 'nope' }); ok(c.s === 410, '형식이 틀린 코드');
  ok(!JSON.stringify([...store.keys()]).includes(code), '코드는 쓰면 지움');

  // ── 다시 열면: 계정은 그대로, 테스트 중 바꾼 프로필은 덮어쓰지 않음
  by('member_profiles')[0].nickname = '내가바꾼이름';
  r = await call({ as: 'a' }, 'adm'); ok(r.s === 200 && created === 1, '두 번째: 새 계정 안 만듦');
  ok(by('member_profiles')[0].nickname === '내가바꾼이름', '바꾼 닉네임 유지');
  r = await call({ as: 'b' }, 'adm'); const B = users[T.TESTERS.b.email]; ok(r.s === 200 && created === 2 && B !== A, '테스트 회원 B');

  // ── 오늘의 인연: 테스트 회원끼리는 보이고, 실제 회원에게는 안 보임
  tables.cm_match_profiles.push({ user_id: REAL, active: true, purposes: ['chat', 'friend', 'love'], want_gender: ['M', 'F'], want_age_min: 19, want_age_max: 99, want_region: 'any', region: '서울' });
  tables.adult_verifications.push({ user_id: REAL, birth_year: 1991, gender: 'F' });
  const me = id => tables.cm_match_profiles.find(x => x.user_id === id), mv = id => tables.adult_verifications.find(x => x.user_id === id);
  const forA = await M.candidatePool(env, A, me(A), mv(A));
  ok(forA.some(x => x.id === B) && forA.some(x => x.id === REAL), '테스트 A 에게는 B·실제 회원 모두 보임(시험용)');
  const forReal = await M.candidatePool(env, REAL, me(REAL), mv(REAL));
  ok(!forReal.some(x => x.id === A || x.id === B), '실제 회원에게는 테스트 회원이 안 보임');

  // ── 복귀 페이지: admin_login 코드로 세션 받기
  const html = read('report/auth-return.html'), script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const out = await new Promise(resolve => {
    const o = { calls: [], set: null, replaced: null };
    const sb = { auth: { setSession: s => { o.set = s; return Promise.resolve({}); }, getSession: () => Promise.resolve({ data: { session: { access_token: 'x' } } }) } };
    vm.runInNewContext(script, { URL, Promise, setTimeout: f => f(), encodeURIComponent, JSON,
      location: { href: 'https://mantrafortune.com/report/auth-return.html?to=%2Fcommunity%2F&admin_login=' + 'a'.repeat(32), replace: x => { o.replaced = x; resolve(o); } },
      sessionStorage: { setItem() { } }, document: { getElementById: () => ({}), createElement: () => ({}), head: { appendChild() { } } }, window: { supabase: { createClient: () => sb } },
      fetch: (u, op) => { o.calls.push([u, op && op.body]); if (u === '/api/commerce/access') return Promise.resolve({ json: () => Promise.resolve({ keys: { supabaseUrl: 's', supabaseAnonKey: 'a' } }) }); if (u === '/api/community/test-login') return Promise.resolve({ ok: true, json: () => Promise.resolve({ access_token: 'T', refresh_token: 'R' }) }); return Promise.reject(new Error('x')); } });
    setTimeout(() => resolve(o), 50);
  });
  ok(out.replaced === '/community/' && out.set && out.set.access_token === 'T' && out.calls.some(x => x[0] === '/api/community/test-login' && JSON.parse(x[1]).code === 'a'.repeat(32)), '복귀 페이지: 코드로 테스트 회원 로그인 → 광장');

  // ── 관리자 화면
  const idx = read('report/admin/index.html'), v2 = read('report/admin/v2-community.js');
  ok(/window\.openPlazaAs = function \(slot\)/.test(idx) && /\$\('openPlaza'\)\.onclick = function \(e\) \{ e\.preventDefault\(\); window\.openPlazaAs\('a'\); \}/.test(idx), '상단 인연의 광장 = 테스트 회원 A');
  ok(/data-tester="a"/.test(v2) && /data-tester="b"/.test(v2) && /로그인 없이 둘러보기/.test(v2), '커뮤니티 탭: A·B·로그인 없이');

  if (fails.length) { console.error('admin-tester-sim 실패 ' + fails.length + '/' + n + '\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('admin-tester-sim OK: ' + n + '항목(권한·준비·일회용 코드·덮어쓰기 안 함·A/B·실제 회원에게 숨김·복귀 페이지·관리자 화면)');
})().catch(e => { console.error(e); process.exit(1); });
