// 신년운세 화면 정적 검사: 파일 연결·구매 창 공개 함수·내 구매 내역 연결·맛보기 표시 규칙. 브라우저 동작 확인은 로컬 미리보기로 따로 한다.
const assert = require('assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), rd = p => fs.readFileSync(path.join(root, p), 'utf8');

// 1) index.html 이 부르는 파일이 모두 있다
const html = rd('report/newyear/index.html');
for (const m of html.matchAll(/(?:src|href)="([^"]+?)(?:\?[^"]*)?"/g)) {
  const u = m[1]; if (/^https?:|^\/\/|^#/.test(u) || u === '/report/my/' || /^\/report\/legal\//.test(u)) continue;
  const p = u.startsWith('/') ? u.slice(1) : 'report/newyear/' + u;
  assert.ok(fs.existsSync(path.join(root, p)), '없는 파일: ' + u);
}
assert.ok(fs.existsSync(path.join(root, 'report/legal/refund.html')) && fs.existsSync(path.join(root, 'report/legal/products.html')));
assert.match(html, /viewport-fit=cover/); assert.match(html, /id="ny-pdf"/); assert.match(html, /id="ny-prev"/);

// 2) 화면 스크립트 문법·구매 창 공개 함수
new vm.Script(rd('report/newyear/newyear-app.js'));
const pw = rd('report/v2/paywall.js');
assert.match(pw, /login: login, logout: logout, buy: buy, toast: toast/, '구매 창 로그인·결제 함수 공개');
const app = rd('report/newyear/newyear-app.js');
assert.match(app, /PW\(\)\.buy\(PRODUCT/); assert.match(app, /id="pw-save"/, '구매 시 사주 저장(선택) 체크박스 — paywall.buy 가 읽는 id');
assert.match(app, /__ny: true/); assert.match(app, /mt_v2_input/, '구매 창이 남긴 무빙툰 이어 읽기 값 정리');
assert.match(app, /mt_ny_input/); assert.match(app, /ny-retry|data-reload/);

// 3) 내 구매 내역: tjYYYY 권한이 있는 사주에 '신년운세 보기' 버튼, 무빙툰 버튼은 세계 권한이 있을 때만
const my = rd('report/my/index.html');
assert.match(my, /data-newyear=/); assert.match(my, /mt_ny_input/); assert.match(my, /\/report\/newyear\/\?from=my/);

// 4) 맛보기 표시 규칙: 잠긴 장은 본문 없이 제목만(서버 teaserOf 와 화면이 같은 모양을 기대)
const ny = rd('functions/_newyear.js');
assert.match(ny, /locked: true/); assert.match(app, /c\.locked/);

// 5) 인쇄(PDF) 스타일: 모든 장 펼침·밝은 종이
const css = rd('report/newyear/newyear.css');
assert.match(css, /@media print/); assert.match(css, /\.ny-print \.chap \{ page-break-before: always; \}/);
assert.match(css, /prefers-reduced-motion/);

console.log('newyear-ui-sim ok: 파일 연결·구매 창 연동·내 구매 내역 연결·맛보기·인쇄 스타일');
