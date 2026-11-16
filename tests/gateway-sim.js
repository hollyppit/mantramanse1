// 통합 첫 화면(/gate/) 열기·숨기기 스위치 검증: node tests/gateway-sim.js
// 기본 숨김 · 관리자 비밀번호만 바꿈 · 열 때 확인 문구 · 공개 상태 API · 심층 분석 '처음 화면' 링크는 열렸을 때만. 네트워크 호출 0(Supabase 없음 → 감사 로그는 건너뜀).
const path = require('path'), url = require('url'), fs = require('fs');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);

(async () => {
  const G = await imp('functions/_gateway.js'), api = await imp('functions/api/community/gateway.js'), status = await imp('functions/api/community/status.js');
  const m = new Map(); const KV = { get: async (k, t) => m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null, put: async (k, v) => { m.set(k, v); } };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm' };
  const req = (method, body, pw) => new Request('https://x.test/api/community/gateway', { method, headers: { 'content-type': 'application/json', ...(pw ? { authorization: 'Bearer ' + pw } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const call = async (fn, r) => { const res = await api[fn]({ request: r, env }); return { s: res.status, d: await res.json() }; };

  ok((await G.readGateway(env)).open === false && (await G.readGateway({})).open === false, '기본은 숨김(값 없음·KV 없음)');
  let r = await call('onRequestGet', req('GET')); ok(r.s === 401, '비관리자는 상태 조회 불가');
  r = await call('onRequestPut', req('PUT', { open: true, confirm: '처음 화면 열기' })); ok(r.s === 401 && !(await G.gatewayOpen(env)), '비관리자는 열 수 없음');
  r = await call('onRequestPut', req('PUT', { open: true, confirm: '처음 화면 열기' }, 'wrong')); ok(r.s === 401, '틀린 비밀번호 거절');
  r = await call('onRequestPut', req('PUT', { open: 'yes' }, 'adm')); ok(r.s === 400, '켜짐/꺼짐 값이 아니면 거절');
  r = await call('onRequestPut', req('PUT', { open: true }, 'adm')); ok(r.s === 400 && !(await G.gatewayOpen(env)), '확인 문구 없이 열기 거절');
  r = await call('onRequestPut', req('PUT', { open: true, confirm: '처음 화면 열기' }, 'adm')); ok(r.s === 200 && r.d.open === true && await G.gatewayOpen(env), '관리자가 확인 문구와 함께 열기');
  r = await call('onRequestGet', req('GET', null, 'adm')); ok(r.d.open === true && !!r.d.at, '관리자 상태 조회');
  let st = await (await status.onRequestGet({ request: new Request('https://x.test/api/community/status'), env })).json(); ok(st.gateway === true, '공개 상태 API 에 열림 표시');
  const gr = await G.gatewayRedirect(new Request('https://x.test/gate/'), env); ok(gr === null, '열림: /gate/ 통과');
  r = await call('onRequestPut', req('PUT', { open: false }, 'adm')); ok(r.s === 200 && !(await G.gatewayOpen(env)), '다시 숨기기는 확인 문구 없이');
  st = await (await status.onRequestGet({ request: new Request('https://x.test/api/community/status'), env })).json(); ok(st.gateway === false, '공개 상태 API 에 숨김 표시');
  const hid = await G.gatewayRedirect(new Request('https://x.test/gate/'), env); ok(hid && hid.status === 302 && hid.headers.get('location') === '/report/', '숨김: /gate/ → /report/');

  // 심층 분석 화면: '처음 화면' 링크는 숨긴 채 시작하고, 상태 API 가 열림일 때만 보인다
  const html = fs.readFileSync(path.join(__dirname, '../report/index.html'), 'utf8');
  ok(/id="gateLink"[^>]*style="visibility:hidden"/.test(html) && /d\.gateway !== true/.test(html), "심층 분석의 '처음 화면' 링크는 열렸을 때만");
  // 관리자 화면 카드
  const adm = fs.readFileSync(path.join(__dirname, '../report/admin/v2-community.js'), 'utf8');
  ok(adm.includes('function loadGateway') && adm.includes("'처음 화면 열기'") && adm.includes('/gate/?preview=1'), '관리자 ⓪ 처음 화면 카드');

  if (fails.length) { console.error('gateway-sim 실패 ' + fails.length + '/' + n + '\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('gateway-sim OK: ' + n + '항목(기본 숨김·관리자만·확인 문구·공개 상태·링크·관리자 카드)');
})().catch(e => { console.error(e); process.exit(1); });
