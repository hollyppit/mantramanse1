// 읽기 문서(Reading Flow) 순수 로직 검증:  node tests/reader-sim.js
// 페이지 나누기 · 읽는 시간 추정 · 스크롤 목표 위치 · 설정 정리(클라이언트/서버 같은 범위) · 글자 애니메이션이 본문에서 쓰이지 않는지(소스 검사)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.window = globalThis;
['reader', 'moving'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const Rd = globalThis.ReportV2.Reading, fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

console.log('1. 읽는 시간(글자 수 기반)');
ok(Rd.estimate('', 6.5) === 0 && Rd.estimate('   ', 6.5) === 0, '빈 글은 0초');
const e1 = Rd.estimate('가'.repeat(65), 6.5);
ok(Math.abs(e1 - 10.6) < 1e-9, '65자 = 10초 + 호흡 0.6초: ' + e1);
ok(Rd.estimate('가'.repeat(65), 3) > Rd.estimate('가'.repeat(65), 12), '속도 설정이 길이에 반영');

console.log('2. 페이지 나누기: 작은 문단마다 넘기지 않는다');
const vh = 800, mk = (top, h, extra) => Object.assign({ top, bottom: top + h, text: '가'.repeat(30), dur: 5, hd: null, sec: {}, el: {} }, extra || {});
const small = [mk(100, 60), mk(180, 60), mk(260, 60), mk(340, 60), mk(420, 60), mk(500, 60), mk(580, 60), mk(660, 60)];
const pg = Rd.paginate(small, vh);
ok(pg.length >= 2 && pg.length <= 3, '짧은 문단 8개는 2~3 페이지로 묶인다(문단마다 이동하지 않음): ' + pg.length);
ok(pg.every(p => p.bottom - p.top <= vh * 0.6 + 1), '한 페이지는 화면 높이의 60% 안: ' + pg.map(p => p.bottom - p.top));
ok(pg.reduce((n, p) => n + p.items.length, 0) === small.length, '모든 요소가 정확히 한 번씩 들어간다');
const big = Rd.paginate([mk(100, 900)], vh);
ok(big.length === 1 && big[0].items.length === 1, '화면보다 큰 요소는 혼자 한 페이지');
const hdr = { hd: 'H', sec: 'H' };
const mixed = Rd.paginate([mk(0, 200, hdr), mk(210, 100, hdr), mk(900, 60), mk(980, 60)], vh);
ok(mixed.length === 2 && mixed[0].hd === 'H' && mixed[1].hd === null, '헤더는 본문과 한 페이지에 섞이지 않는다');
ok(mixed[0].dur >= 11 && mixed[0].dur > mixed[1].dur - 0.5 + 0, '헤더 페이지는 1초 더 머문다(dur ' + mixed[0].dur + ')');
ok(Rd.paginate([mk(0, 40, { dur: 0.3 })], vh)[0].dur >= 2.2, '아주 짧은 글도 최소 2.2초');

console.log('3. 스크롤 목표(읽는 줄 약 44%)');
const p1 = { top: 1000, bottom: 1300 }, y1 = Rd.anchorY(p1, vh, 5000);
ok(Math.abs((1150 - y1) - vh * 0.44) < 1.5, '작은 페이지는 가운데가 화면 44% 위치에: ' + (1150 - y1) / vh);
ok(Rd.anchorY({ top: 1000, bottom: 2000 }, vh, 5000) === Math.round(1000 - vh * 0.14), '큰 페이지는 위쪽(14%)에 맞춘다');
ok(Rd.anchorY({ top: 10, bottom: 100 }, vh, 5000) === 0, '문서 맨 위에서 음수로 가지 않는다');
ok(Rd.anchorY({ top: 4900, bottom: 5200 }, vh, 4300) === 4300, '문서 맨 아래를 넘지 않는다');

console.log('4. 설정(클라이언트·서버 같은 범위)');
const c = Rd.clean({ readSpeed: 99, bgMotion: 9, startDelay: -3, auto: false });
ok(c.readSpeed === 12 && c.bgMotion === 2 && c.startDelay === 0 && c.auto === false && c.stopAtChoice === true, '범위 밖 값은 고정: ' + JSON.stringify(c));
ok(Rd.clean({}).readSpeed === 6.5 && Rd.clean({}).bgMotion === 1, '기본값: 6.5자/초 · 배경 움직임 1');
const M = globalThis.ReportV2.Moving, old = { enabled: true, anim: 'blur', duration: 2, speed: 120, btnPos: 'left' };
const mc = M.clean(old);
ok(mc.anim === 'blur' && mc.duration === 2 && mc.speed === 120 && mc.btnPos === 'left' && mc.readSpeed === 6.5, '예전 연출 필드는 지우지 않고 보존(스키마 유지)');
const srv = fs.readFileSync(path.join(root, 'functions/api/report-content.js'), 'utf8');
ok(/readSpeed: n\(f\.readSpeed, 3, 12, 6\.5\)/.test(srv) && /bgMotion: Math\.round\(n\(f\.bgMotion, 0, 2, 1\)\)/.test(srv), '서버 cleanFlow 가 같은 범위(3~12, 0~2)');

console.log('5. 본문에서 글자 애니메이션이 쓰이지 않는다(소스 검사)');
const viewer = fs.readFileSync(path.join(root, 'report/v2/viewer.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'report/v2/viewer.css'), 'utf8') + fs.readFileSync(path.join(root, 'report/v2/reader.css'), 'utf8');
ok(!/R\.Moving\.mount|revealify|lanternTransition|actTransition\(|decorate\(/.test(viewer), '뷰어가 옛 연출 함수(Moving.mount·revealify·등불 전환·ACT 전환·카메라 decorate)를 부르지 않는다');
ok(/MOTION_KEYS/.test(viewer) && /function still\(/.test(viewer), '글자 스타일의 in·out·loop·seq·hold 는 그리기에서 무시');
ok(!/\.tx-in-|\.tx-out|@keyframes tx(Rise|Drop|Blur|Zoom|Wipe)/.test(css), '글자 등장/사라짐 CSS 가 없다');
ok(!/\.rv\.in|\.mvw|data-mv=/.test(css), '순차 등장(.rv/.mvw) CSS 가 없다');
ok(!/scroll-snap/.test(css), 'scroll-snap 을 쓰지 않는다');
ok(!/100vh/.test(fs.readFileSync(path.join(root, 'report/v2/reader.css'), 'utf8')), '읽기 문서는 100vh 대신 svh');
const rj = fs.readFileSync(path.join(root, 'report/v2/reader.js'), 'utf8');
ok(!/requestAnimationFrame\(tick|setInterval\([^)]*scrollTo/.test(rj) && /cancelTween/.test(rj), '일정 속도로 흐르는 스크롤이 없다(MOVE 때만 짧은 tween)');
ok(['wheel', 'touchmove', 'keydown', 'pointerdown'].every(ev => rj.indexOf("'" + ev + "'") > 0 || rj.indexOf('"' + ev + '"') > 0), '직접 스크롤(wheel·touch·키보드·스크롤바)을 감지한다');

console.log('6. 긴 풀이 문단 나누기(viewer.js chunk)');
const cs = viewer.indexOf('function chunk(text, max) {'), em = /\r?\n  \}\r?\n/.exec(viewer.slice(cs)), cm = cs >= 0 && em ? [viewer.slice(cs, cs + em.index + em[0].length)] : null;
ok(!!cm, 'viewer.js 에 chunk() 가 있다');
if (cm) {
  const chunk = new Function(cm[0] + 'return chunk;')(), cnt = x => (x.match(/[.!?](\s|$)/g) || []).length;
  const long = '첫째 문장은 이렇게 쓰입니다. 둘째 문장도 비슷한 길이로 이어집니다. 셋째 문장은 또 다른 이야기를 합니다. 넷째 문장이 마지막을 맺습니다. 조심할 점: 서두르다 놓치는 것입니다. 다섯째 문장입니다.';
  const parts = chunk(long);
  ok(parts.length >= 3, '긴 글은 여러 덩어리로 나뉜다: ' + parts.length);
  ok(parts.join(' ') === long, '나눈 덩어리를 이어 붙이면 원문과 같다(글자를 잃지 않는다)');
  ok(parts.every(x => cnt(x) <= 2), '한 덩어리는 문장 2개 이내');
  ok(parts.some(x => /^조심할 점:/.test(x) && cnt(x) === 1), '조심할 점 문장은 홀로 놓인다');
  ok(chunk('짧은 글입니다.').length === 1 && chunk('').length === 0 && chunk('가나다. 라마바.\n사아자. 차카타. 파하갸.').length === 1, '짧은 글·빈 글·줄바꿈 글은 그대로');
}

if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\n읽기 문서 로직 검증 모두 통과');
