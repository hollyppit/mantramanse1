// 나침반으로 향 재기(compass.js) 검증
//   node tests/compass-sim.cjs
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const C = require(path.join(root, 'compass.js'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const near = (a, b, t = 0.01) => Math.abs(a - b) <= t;

// 센서 값 → 방향: 아이폰은 webkitCompassHeading 그대로, 안드로이드는 360-alpha
ok(near(C.headingFromEvent({ webkitCompassHeading: 123.4 }), 123.4), '아이폰 방향값을 그대로 쓰지 않음');
ok(C.headingFromEvent({ type: 'deviceorientationabsolute', alpha: 90 }) === 270, '안드로이드 alpha 90 → 270(서)이어야 함');
ok(C.headingFromEvent({ absolute: true, alpha: 0 }) === 0, 'alpha 0 → 북');
ok(C.headingFromEvent({ absolute: true, alpha: 359 }) === 1, 'alpha 359 → 1°');
ok(C.headingFromEvent({ absolute: false, type: 'deviceorientation', alpha: 90 }) === null, '상대 방향(absolute 아님)은 무시해야 함');
ok(C.headingFromEvent({ alpha: null, absolute: true }) === null && C.headingFromEvent(null) === null && C.headingFromEvent({}) === null, '값이 없으면 null');
ok(C.headingFromEvent({ webkitCompassHeading: 360 }) === 0, '360은 0으로 정리');

// 원형 평균: 359°와 1°의 평균은 0°이지 180°가 아니다
ok(near(C.circMean([350, 10]), 0) || near(C.circMean([350, 10]), 360), `350·10 평균 ${C.circMean([350, 10])}`);
ok(near(C.circMean([88, 92]), 90), '88·92 평균 90');
ok(C.circMean([]) === null, '빈 목록 평균은 null');
ok(C.circSpread([180, 180, 180]) < 0.001 && near(C.circSpread([350, 10]), 10), '흔들림 계산');

// 진북 보정: 끄면 그대로, 켜면 -8°(0° 근처는 352°로 감김)
ok(C.applyDecl(200, false) === 200 && C.applyDecl(200, true) === 192 && C.applyDecl(5, true) === 357, '진북 보정 계산');
ok(C.DECL === -8, '한국 편각 상수');

// 8방위 이름: 경계(22.5°)에서 올림
const L = { 0: '북향', 44: '북동향', 90: '동향', 135: '남동향', 180: '남향', 225: '남서향', 270: '서향', 315: '북서향', 359: '북향', 22: '북향', 23: '북동향' };
for (const [d, n] of Object.entries(L)) ok(C.dir8Label(+d) === n, `${d}° → ${C.dir8Label(+d)} (기대 ${n})`);

// 지원 여부: 센서 API와 터치가 있어야 버튼을 보인다(PC에서는 숨김)
const vm = require('vm');
const load = (win) => { const ctx = { window: win, globalThis: win }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root, 'compass.js'), 'utf8').replace(/\}\)\(typeof window !== 'undefined' \? window : globalThis\);\s*$/, '})(window);'), ctx); return win.MantraCompass; };
ok(load({ DeviceOrientationEvent: function () { }, navigator: { maxTouchPoints: 5 } }).supported() === true, '센서+터치면 지원');
ok(load({ DeviceOrientationEvent: function () { }, navigator: { maxTouchPoints: 0 } }).supported() === false, '터치 없는 PC는 숨김');
ok(load({ navigator: { maxTouchPoints: 5 } }).supported() === false, '센서 API가 없으면 숨김');

// 화면 연결
ok(html.includes('<script src="compass.js"></script>'), 'index.html이 compass.js를 읽지 않음');
ok(/data-compass="\$\{kind\}:\$\{i\}">나침반으로 재기<\/button>/.test(html), '향 입력칸에 버튼이 없음');
ok(/window\.MantraCompass && window\.MantraCompass\.supported\(\)/.test(html), '지원할 때만 버튼을 보여야 함');
ok(/SP\[k\]\[\+i\]\.facing = String\(deg\)/.test(html), '읽은 각도가 향 입력칸(facing)에 들어가지 않음');
ok(/spField\(kind, i, 'facing'/.test(html) && /min="0" max="359"/.test(html), '향 입력칸(0~359)이 바뀌었음');

if (fails.length) { console.error('FAIL ' + fails.length + '\n' + fails.join('\n')); process.exit(1); }
console.log('OK compass: 센서 변환·원형 평균·편각·8방위·지원 판정·화면 연결');
