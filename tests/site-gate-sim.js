// 사이트 비밀번호 잠금 검증:  node tests/site-gate-sim.js
const path = require('path'), url = require('url');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
import(url.pathToFileURL(path.join(__dirname, '..', 'functions/_middleware.js')).href).then(async mod => {
  const B = 'https://mantramanse.pages.dev';
  let nexted = 0; const next = () => { nexted++; return new Response('own'); };
  const run = (u, env, init) => mod.onRequest({ request: new Request(u, init), env, next });
  const form = (pw, nx) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'pw=' + encodeURIComponent(pw) + (nx ? '&next=' + encodeURIComponent(nx) : '') });
  const ENV = { SITE_GATE_PASSWORD: 'open-sesame' };

  // 변수가 없거나 비면 오픈(통과)
  for (const env of [undefined, {}, { SITE_GATE_PASSWORD: '' }]) { nexted = 0; const r = await run(B + '/', env); ok(nexted === 1 && (await r.text()) === 'own', '변수 없음/빈값은 통과'); }

  // 잠금: 페이지 401 + noindex, API 401 JSON
  nexted = 0;
  let r = await run(B + '/report/admin/', ENV); const html = await r.text();
  ok(r.status === 401 && nexted === 0 && html.includes('type="password"') && r.headers.get('x-robots-tag').includes('noindex') && r.headers.get('cache-control') === 'no-store', '잠금 화면');
  ok(!html.includes('open-sesame'), '비밀번호가 화면에 노출되지 않음');
  r = await run(B + '/api/fengshui', ENV); ok(r.status === 401 && (await r.json()).error === 'site locked' && nexted === 0, 'API 는 401 JSON');
  r = await run(B + '/api/fengshui', ENV, { method: 'PUT', body: '{}' }); ok(r.status === 401 && nexted === 0, '쓰기 요청도 차단');

  // 틀린 비밀번호
  r = await run(B + '/__gate', ENV, form('wrong')); ok(r.status === 401 && !r.headers.get('set-cookie') && (await r.text()).includes('맞지 않습니다'), '틀린 비밀번호');
  r = await run(B + '/__gate', ENV, form('')); ok(r.status === 401 && !r.headers.get('set-cookie'), '빈 비밀번호');
  r = await run(B + '/__gate', ENV, { method: 'GET' }); ok(r.status === 401 && nexted === 0, '/__gate GET 은 잠금 화면');

  // 맞는 비밀번호 → 쿠키 + 리다이렉트
  r = await run(B + '/__gate', ENV, form('open-sesame', '/report/admin/?x=1'));
  const sc = r.headers.get('set-cookie') || '';
  ok(r.status === 303 && r.headers.get('location') === '/report/admin/?x=1' && /HttpOnly/.test(sc) && /Secure/.test(sc) && /SameSite=Lax/.test(sc) && !sc.includes('open-sesame'), '로그인 성공: 쿠키 속성·리다이렉트·원문 미포함');
  const cookie = sc.split(';')[0];

  // 쿠키가 있으면 통과, 변조·다른 비밀번호 쿠키는 차단
  nexted = 0; r = await run(B + '/', ENV, { headers: { cookie } }); ok(nexted === 1 && (await r.text()) === 'own', '쿠키로 통과');
  nexted = 0; r = await run(B + '/api/x', ENV, { headers: { cookie: 'a=1; ' + cookie } }); ok(nexted === 1, '다른 쿠키와 섞여도 통과');
  nexted = 0; r = await run(B + '/', ENV, { headers: { cookie: cookie.slice(0, -1) + '0' } }); ok(r.status === 401 && nexted === 0, '변조 쿠키 차단');
  nexted = 0; r = await run(B + '/', { SITE_GATE_PASSWORD: 'changed' }, { headers: { cookie } }); ok(r.status === 401 && nexted === 0, '비밀번호를 바꾸면 기존 쿠키 무효');

  // 오픈 리다이렉트 방지
  for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', '/__gate']) { r = await run(B + '/__gate', ENV, form('open-sesame', bad)); ok(r.headers.get('location') === '/', '안전하지 않은 next 는 / 로: ' + bad); }

  // 무빙툰만 공개(SITE_GATE_REPORT_PUBLIC=1): /report/·API·정적 파일은 통과, 만세력 화면·관리자는 잠금, 루트는 /report/ 로
  const PUB = { ...ENV, SITE_GATE_REPORT_PUBLIC: '1' };
  for (const p of ['/report/', '/report', '/report/v2/viewer.js', '/report/hub/quest/archive.webp', '/api/movingtoon-reading', '/engine.js', '/feature-flags.js']) { nexted = 0; r = await run(B + p, PUB); ok(nexted === 1, '공개 모드 통과: ' + p); }
  nexted = 0; r = await run(B + '/index.html', PUB); ok(r.status === 302 && nexted === 0, '공개 모드 /index.html 도 /report/ 로');
  nexted = 0; r = await run(B + '/', PUB, { method: 'POST' }); ok(r.status === 401 && nexted === 0, '루트 POST 는 리다이렉트 없이 잠금');
  for (const p of ['/report/admin/', '/report/admin', '/something', '/x.html']) { nexted = 0; r = await run(B + p, PUB); ok(r.status === 401 && nexted === 0, '공개 모드에서도 잠금: ' + p); }
  nexted = 0; r = await run(B + '/', PUB); ok(r.status === 302 && r.headers.get('location') === '/report/' && nexted === 0, '공개 모드 루트는 /report/ 로');
  nexted = 0; r = await run(B + '/', PUB, { headers: { cookie } }); ok(nexted === 1, '공개 모드에서도 비밀번호 쿠키가 있으면 만세력 열림');
  nexted = 0; r = await run(B + '/report/admin/', PUB, { headers: { cookie } }); ok(nexted === 1, '공개 모드 관리자 화면은 쿠키로 열림');
  nexted = 0; r = await run(B + '//report/admin/', PUB); ok(r.status === 401 && nexted === 0, '슬래시 겹친 관리자 경로도 잠금');
  r = await run(B + '/__gate', PUB, form('open-sesame')); ok(r.status === 303, '공개 모드에서도 /__gate 로그인 동작');
  for (const v of ['0', '', 'no']) { nexted = 0; r = await run(B + '/report/', { ...ENV, SITE_GATE_REPORT_PUBLIC: v }); ok(r.status === 401 && nexted === 0, '공개 변수가 꺼진 값이면 전체 잠금: ' + JSON.stringify(v)); }

  // 약관·정책 페이지는 잠금 중에도 공개(공개 모드 변수 없이도), 그 밖의 /report/ 는 그대로 잠금
  for (const p of ['/report/legal/terms.html', '/report/legal/privacy.html', '/report/legal/refund.html', '/report/legal/business.js', '/report/legal/legal.css', '/report/legal/']) { nexted = 0; r = await run(B + p, ENV); ok(nexted === 1, '정책 페이지는 잠금 중에도 공개: ' + p); }
  nexted = 0; r = await run(B + '/api/commerce/access', ENV, { method: 'POST', body: '{}' }); ok(nexted === 1, '상품 가격 API(POST)는 잠금 중에도 공개');
  nexted = 0; r = await run(B + '/api/commerce/access', ENV); ok(r.status === 401 && nexted === 0, '상품 가격 API GET 은 잠금');
  for (const p of ['/api/commerce/order', '/api/commerce/admin', '/api/commerce/confirm']) { nexted = 0; r = await run(B + p, ENV, { method: 'POST', body: '{}' }); ok(r.status === 401 && nexted === 0, '다른 결제 API 는 잠금: ' + p); }
  for (const p of ['/report/legal/../admin/', '/report/legal/x/y.html', '/report/legalx.html']) { nexted = 0; r = await run(B + p, ENV); ok(r.status === 401 && nexted === 0, '정책 폴더 밖은 잠금: ' + p); }

  // http(로컬)에서는 Secure 없이 쿠키
  r = await run('http://localhost:8788/__gate', ENV, form('open-sesame')); ok(!/Secure/.test(r.headers.get('set-cookie') || '') && r.status === 303, '로컬 http 쿠키');
}).catch(e => ok(false, '실행 오류: ' + e.message)).then(() => {
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log('사이트 잠금 검증 통과');
});
