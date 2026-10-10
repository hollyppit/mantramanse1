// functions/_middleware.js 검증:  node tests/middleware-sim.js
// 미리보기 호스트의 공개 읽기(GET)만 운영으로 대신 요청하고, 운영·쓰기·관리자·그 외 호스트는 그대로 통과하는지 확인
const path = require('path'), url = require('url');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
import(url.pathToFileURL(path.join(__dirname, '..', 'functions/_middleware.js')).href).then(async mod => {
  const P = mod.proxiesToProd;
  ok(P('renewal-world-map.mantramanse.pages.dev', 'GET', '/api/assets') === true, '브랜치 미리보기: assets 프록시');
  ok(P('84e8acca.mantramanse.pages.dev', 'GET', '/api/clipfile') === true, '배포 미리보기: clipfile 프록시');
  ok(P('renewal-world-map.mantramanse.pages.dev', 'GET', '/api/prologue') && P('renewal-world-map.mantramanse.pages.dev', 'GET', '/api/awakening'), '프롤로그·각성');
  ok(P('mantramanse.pages.dev', 'GET', '/api/assets') === false, '운영 호스트는 통과');
  ok(P('example.com', 'GET', '/api/assets') === false && P('localhost', 'GET', '/api/assets') === false, '다른 호스트는 통과');
  ok(P('evil.mantramanse.pages.dev.attacker.com', 'GET', '/api/assets') === false, '호스트 위장 차단');
  ['POST', 'PUT', 'DELETE'].forEach(m => ok(P('renewal-world-map.mantramanse.pages.dev', m, '/api/assets') === false, m + ' 는 통과(프록시 안 함)'));
  ['/api/worlds', '/api/admin', '/api/asset-art', '/api/ai', '/api/life-ai', '/report/v2/viewer.js', '/api/assets/x'].forEach(p => ok(P('renewal-world-map.mantramanse.pages.dev', 'GET', p) === false, p + ' 는 통과'));
  // onRequest 동작: 프록시 대상이면 운영 주소로 요청하고 Range 를 전달, 아니면 next()
  const calls = []; global.fetch = async (u, o) => { calls.push({ u, o }); return new Response('video', { status: 206, headers: { 'content-type': 'video/mp4', 'content-range': 'bytes 0-4/100' } }); };
  let nexted = 0; const next = () => { nexted++; return new Response('own'); };
  const req = (u, h) => new Request(u, { headers: h || {} });
  const r1 = await mod.onRequest({ request: req('https://renewal-world-map.mantramanse.pages.dev/api/clipfile?k=a.mp4', { range: 'bytes=0-4' }), next });
  ok(r1.status === 206 && r1.headers.get('content-type') === 'video/mp4' && r1.headers.get('x-preview-proxy') === 'prod-readonly' && calls[0].u === 'https://mantramanse.pages.dev/api/clipfile?k=a.mp4' && calls[0].o.headers.range === 'bytes=0-4' && nexted === 0, '프록시 요청·Range 전달');
  await mod.onRequest({ request: req('https://mantramanse.pages.dev/api/clipfile?k=a.mp4'), next });
  await mod.onRequest({ request: new Request('https://renewal-world-map.mantramanse.pages.dev/api/assets', { method: 'POST', body: '{}' }), next });
  ok(nexted === 2 && calls.length === 1, '운영 호스트·POST 는 next()');
  global.fetch = async () => { throw new Error('offline'); };
  const r3 = await mod.onRequest({ request: req('https://renewal-world-map.mantramanse.pages.dev/api/assets'), next });
  ok(nexted === 3 && (await r3.text()) === 'own', '운영 요청 실패 시 미리보기 자체 응답으로 계속');
}).catch(e => ok(false, '실행 오류: ' + e.message)).then(() => {
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log('미들웨어 검증 통과');
});
