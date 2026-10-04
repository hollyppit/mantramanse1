// 스토리 온보딩(/report/story) 검증:  node tests/story-sim.js
// 1. 콘텐츠 구조 점검(알 수 없는 type·alt 누락·id 참조)  2. A/B 문구·이미지 주소 규칙  3. 실제 엔진으로 무료 결과·월별 운 흐름·잠금·구매 화면 생성
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const run = f => vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a = eng.indexOf('var MANSE_DATA'), b = eng.indexOf('})(typeof window', a);
vm.runInThisContext(eng.slice(a, eng.indexOf('\n', b)));
globalThis.window = globalThis;
run('report/story/content.js'); run('report/story/story.js');

const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const St = globalThis.Story, C = globalThis.OnboardingContent;

console.log('1. 콘텐츠 점검');
const problems = St.validate();
console.log(`   블록 ${C.blocks.length}개, 문제 ${problems.length}개`); problems.forEach(p => console.log('   ! ' + p));
ok(problems.length === 0, '콘텐츠 점검 실패: ' + problems.join(' / '));
// 점검기가 실제로 오류를 잡는지
const bad = St.validate({ blocks: [{ type: 'nope' }, { type: 'image', src: 'a.webp' }, { type: 'cta', action: 'scroll:zzz', buttonText: 'x' }, { type: 'image', src: '../x.png', alt: 'a' }] });
ok(bad.some(x => /알 수 없는 type/.test(x)) && bad.some(x => /alt 없음/.test(x)) && bad.some(x => /scroll 대상/.test(x)) && bad.some(x => /주소 형식/.test(x)), '점검기가 오류를 놓침: ' + bad.join('|'));
// 글자 흐름 순서: 사주 입력 → 무료 결과 → 운 흐름 → 잠금 → 구매
const idx = id => C.blocks.findIndex(x => x.id === id);
ok(idx('interest') < idx('sajuInput') && idx('sajuInput') < idx('freeResult') && idx('freeResult') < idx('flowPreview') && idx('flowPreview') < idx('locked') && idx('locked') < idx('purchase'), '전환 흐름 순서가 맞지 않음');
// 결제 버튼 전에 개인화 결과가 있어야 한다 — 구매 영역과 잠금은 반드시 분석 뒤에만 열린다
ok(['flowPreview', 'locked', 'purchase'].every(id => C.blocks[idx(id)].requires === 'flowOpen') && C.blocks[idx('freeResult')].requires === 'chart', '결제 전 개인화 결과 게이트가 빠짐');

console.log('2. A/B · 주소 규칙');
ok(St.pick({ A: 'a', B: 'b' }) === 'a', '기본 variant 는 A');
ok(St.media('problem/x.webp') === '/report/story/img/problem/x.webp', '상대 경로 → imageBase');
ok(St.media('https://e.com/a.webp') === 'https://e.com/a.webp' && St.media('/x/y.webp') === '/x/y.webp', '절대 주소 유지');
ok(St.media('javascript:alert(1)') === '' && St.media('../a.png') === '' && St.media('//evil.com/a.png') === '', '위험한 주소 차단');
ok(!/<script/.test(St.fmt('<script>x</script>')) && St.fmt('*a*\nb') === '<em>a</em><br>b', 'fmt 이스케이프/강조');
const html = Object.keys(St.BLOCKS).filter(k => !['component', 'interest', 'cta', 'spacer', 'divider'].includes(k)).length;
ok(html >= 10, '블록 종류 부족');
// 이미지 없는 블록이 깨진 <img> 를 만들지 않는다
const imgHtml = St.BLOCKS.image({ type: 'image', src: '', alt: 'x', aspectRatio: '4/5', todo: '메모' });
ok(!/<img/.test(imgHtml) && /class="ph"/.test(imgHtml), '빈 src 는 자리표시여야 함');
ok(!/TODO/.test(imgHtml), '운영 화면에서 TODO 문구가 노출됨');

console.log('3. 실제 엔진 연결');
const M = globalThis.Manse, S = St.state;
const ch = M.compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 0, calendar: 'solar', gender: 'F', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
S.chart = ch; S.name = '하늘'; S.interest = 'money'; S.flowOpen = true;
const fr = St.COMPONENTS.FreeResult.render(), fp = St.COMPONENTS.FlowPreview.render(), lk = St.COMPONENTS.LockedContent.render(), pw = St.COMPONENTS.Paywall.render({ ctaText: '구매' });
ok(/하늘님의 기본 기질/.test(fr) && /경진/.test(fr) && /庚辰/.test(fr), '무료 결과에 이름/일주가 없음');
ok(/단단한 편/.test(fr) && /용신|균형을 도와주는 기운은/.test(fr), '신강약/용신 문구 없음');
ok((fp.match(/class="tl /g) || []).length === 12, '월별 운 흐름은 12칸이어야 함');
ok(/class="tl [^"]* now"/.test(fp), '지금 달 표시 없음');
ok(/(기회|확장|수확|축적)/.test(fp) && /(순풍|보통|주의)/.test(fp), '기존 운 흐름 분류(주 흐름·적합 상태)를 쓰지 않음');
ok(!/undefined|NaN/.test(fr + fp + lk + pw), '화면에 undefined/NaN 이 보임');
ok(/돈과 재물의 흐름/.test(lk) && (lk.match(/class="lk"/g) || []).length === 7 && /궁금하다고 한 이야기/.test(lk), '잠금 목록 7개/관심사 표시');
ok(/돈과 재물의 흐름/.test(fr) && /돈과 재물의 흐름/.test(pw), '관심사가 결과·구매 문구에 반영되지 않음');
// 시간 모름, 음력 입력도 렌더링되는지
S.chart = M.compute({ year: 1985, month: 11, day: 3, hour: null, minute: 0, calendar: 'lunar', leap: false, gender: 'M', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
const fr2 = St.COMPONENTS.FreeResult.render();
ok(/시간 모름/.test(fr2) && !/undefined|NaN/.test(fr2), '시간 모름 입력 처리');
// 수많은 사주에서 예외 없이
let n = 0;
for (let i = 0; i < 120; i++) { S.chart = M.compute({ year: 1940 + (i * 7) % 80, month: 1 + i % 12, day: 1 + (i * 5) % 28, hour: i % 24, minute: 0, calendar: 'solar', gender: i % 2 ? 'M' : 'F', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' }); const t = St.COMPONENTS.FreeResult.render() + St.COMPONENTS.FlowPreview.render(); if (/undefined|NaN/.test(t)) n++; }
ok(n === 0, `120개 사주 중 ${n}개에서 undefined/NaN`);

if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\n모두 통과');
