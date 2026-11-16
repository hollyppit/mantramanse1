// 인연의 광장 안에서 로그인 → 로그인 복귀 페이지(/report/auth-return.html) → 원래 광장 화면 검증: node tests/community-login-sim.js
// 복귀 페이지 스크립트를 가짜 브라우저(location·fetch·supabase·저장소)로 실행해 카카오(Supabase PKCE)·구글/네이버(서버 claim)·취소·실패·위험한 to 를 본다.
const path = require('path'), fs = require('fs'), vm = require('vm');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const html = read('report/auth-return.html'), script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function run(href, { claim = 'ok', session = true, access = true } = {}) {
  return new Promise(resolve => {
    const out = { replaced: null, calls: [], note: null, msg: '', setSession: null };
    const el = { textContent: '', innerHTML: '' }, sub = { textContent: '', innerHTML: '' };
    const sb = { auth: {
      getSession: () => Promise.resolve({ data: { session: session ? { access_token: 'at' } : null } }),
      setSession: s => { out.setSession = s; return Promise.resolve({}); },
    } };
    const ctx = {
      URL, Promise, setTimeout: (f) => f(), encodeURIComponent,
      location: { href, replace: u => { out.replaced = u; finish(); } },
      sessionStorage: { setItem: (k, v) => { out.note = v; } },
      document: { getElementById: id => (id === 'msg' ? el : sub), createElement: () => ({}), head: { appendChild: s => setTimeout(() => s.onload && s.onload(), 0) } },
      window: { supabase: { createClient: () => sb } },
      fetch: (u, o) => { out.calls.push(u); if (u === '/api/commerce/access') return Promise.resolve({ json: () => Promise.resolve(access ? { keys: { supabaseUrl: 'https://sb', supabaseAnonKey: 'anon' } } : {}) }); if (/\/claim$/.test(u)) return Promise.resolve(claim === 'ok' ? { ok: true, json: () => Promise.resolve({ access_token: 'g-at', refresh_token: 'g-rt' }) } : { ok: false }); return Promise.reject(new Error('x')); },
    };
    let done = false; const finish = () => { if (done) return; done = true; out.msg = el.textContent; out.sub = sub.innerHTML; resolve(out); };
    vm.runInNewContext(script, ctx);
    setTimeout(finish, 50);
  });
}
const B = 'https://mantrafortune.com/report/auth-return.html';
const back = '/community/#/match/inbox';

(async () => {
  let r = await run(B + '?to=' + encodeURIComponent(back) + '&code=abc');
  ok(r.replaced === back && r.note === 'ok' && r.calls[0] === '/api/commerce/access', '카카오: 세션 받고 광장 그 화면으로');
  r = await run(B + '?to=' + encodeURIComponent(back) + '&google_login=1');
  ok(r.replaced === back && r.setSession && r.setSession.access_token === 'g-at' && r.calls.includes('/api/auth/google/claim'), '구글: 서버 claim → 세션 → 광장으로');
  r = await run(B + '?to=' + encodeURIComponent(back) + '&naver_login=1');
  ok(r.replaced === back && r.calls.includes('/api/auth/naver/claim'), '네이버: 서버 claim → 광장으로');
  r = await run(B + '?to=' + encodeURIComponent(back) + '&google_login=cancel');
  ok(r.replaced === back && r.note === 'cancel', '취소: 안내와 함께 광장으로');
  r = await run(B + '?to=' + encodeURIComponent(back) + '&error=access_denied');
  ok(r.replaced === back && r.note === 'cancel', '카카오 거부: 광장으로');
  r = await run(B + '?to=' + encodeURIComponent(back) + '&google_login=fail');
  ok(!r.replaced && /하지 못했어요/.test(r.msg), '실패: 안내만(이동 안 함)');
  r = await run(B + '?to=' + encodeURIComponent(back) + '&google_login=1', { claim: 'bad' });
  ok(!r.replaced && /마무리하지 못했어요/.test(r.msg), 'claim 실패: 안내');
  r = await run(B + '?to=' + encodeURIComponent(back) + '&code=abc', { session: false });
  ok(!r.replaced && /받지 못했어요/.test(r.msg), '세션 없음: 안내');
  for (const evil of ['https://evil.test/', '//evil.test/x', '/\\evil.test', '/admin', 'javascript:alert(1)', '/community\n/x']) {
    r = await run(B + '?to=' + encodeURIComponent(evil) + '&code=abc');
    ok(r.replaced === '/community/', '위험한 to 는 광장 첫 화면으로: ' + JSON.stringify(evil));
  }
  r = await run(B + '?to=' + encodeURIComponent('/report/hub/#/me') + '&code=abc'); ok(r.replaced === '/report/hub/#/me', '/report/ 경로는 그대로');
  r = await run(B + '?code=abc'); ok(r.replaced === '/community/', 'to 없으면 광장 첫 화면');

  // 광장 화면 코드
  const cm = read('community/cm.js');
  ok(/function loginView\(\)/.test(cm) && /data-login/.test(cm) && !/href="\/report\/#\/me">로그인하러 가기/.test(cm), '광장: 바로 로그인 버튼(마이페이지로 보내지 않음)');
  ok(/\/report\/auth-return\.html\?to=' \+ encodeURIComponent\('\/community\/' \+ \(location\.hash/.test(cm), '광장: 지금 보던 화면으로 돌아오기');
  ok(/'\/api\/auth\/' \+ provider \+ '\/start\?next='/.test(cm) && /signInWithOAuth/.test(cm), '광장: 서버 로그인(구글·네이버)·Supabase 로그인(카카오)');
  ok(/function refreshSession/.test(cm) && /refreshSession\(\)\.then/.test(cm), '광장: 지난 로그인 자동 연장');
  ok(!/[^$]\$\('[^']+'(, [a-z.]+)?\)\.(forEach|map|length)/.test(cm), '광장: 목록 선택 오류 없음');
  ok(/noindex/.test(html) && /prefers-reduced-motion/.test(html), '복귀 페이지: 검색 제외·움직임 줄이기');

  if (fails.length) { console.error('community-login-sim 실패 ' + fails.length + '/' + n + '\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('community-login-sim OK: ' + n + '항목(카카오·구글·네이버 복귀·취소·실패·위험한 주소 막기·광장 로그인 버튼)');
})().catch(e => { console.error(e); process.exit(1); });
