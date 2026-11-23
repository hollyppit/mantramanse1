// 삼재 보조 지표 검증(2026-11-24): engine samjaeCycle 이 getSamjae 와 맞는지, 만세력 운세 흐름 탭 표시가 점수와 분리됐는지
//   node tests/samjae-sim.cjs
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a = eng.indexOf('var MANSE_DATA'), b = eng.indexOf('})(typeof window', a);
const ctx = vm.createContext({ console }); vm.runInContext(eng.slice(a, eng.indexOf('\n', b)), ctx);
const M = ctx.Manse; let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('  ✗ ' + m); } };

console.log('1. samjaeCycle ↔ getSamjae (띠 12개 × 1900~2100)');
for (let br = 0; br < 12; br++) for (let Y = 1900; Y <= 2100; Y++) {
  const sj = M.getSamjae(br, Y), c = M.samjaeCycle(br, Y);
  ok(c && c.years.length === 3, `${br} ${Y} 3년`);
  ok((c.pos >= 0) === sj.active, `${br} ${Y} active 일치`);
  if (sj.active) { ok(c.years[c.pos].year === Y && c.years[c.pos].stage === sj.stage, `${br} ${Y} 단계 ${sj.stage}`); ok(c.gap === 0, `${br} ${Y} gap 0`); }
  else { ok(c.start > Y && c.start - Y <= 9 && c.gap === c.start - Y, `${br} ${Y} 다음 시작 ${c.start}`); for (let k = Y + 1; k < c.start; k++) ok(!M.getSamjae(br, k).active, `${br} ${Y}~${c.start} 사이 비삼재`); }
  c.years.forEach(q => ok(M.getSamjae(br, q.year).stage === q.stage, `${br} ${q.year} 바퀴 단계`));
  ok(c.next === c.start + 12, `${br} ${Y} 12년 주기`);
}
console.log('2. 알려진 값: 子띠(申子辰) 2022 들·2023 눌·2024 날, 酉띠(巳酉丑) 2031~2033');
{ const c = M.samjaeCycle(0, 2023); ok(c.start === 2022 && c.pos === 1 && c.years[1].stage === '눌삼재', '子띠 2023 눌삼재'); }
{ const c = M.samjaeCycle(9, 2026); ok(c.pos === -1 && c.start === 2031 && c.gap === 5, '酉띠 2026 → 2031 시작 5년 뒤'); }
{ const c = M.samjaeCycle(6, 2026); ok(c.pos === -1 && c.start === 2028, '午띠 2026 → 2028(申년) 시작'); }

console.log('3. 만세력 화면 표시: 점수와 분리 · 3색 신호와 다른 색');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
ok(/--samjae:\s*#4A47C9/.test(html), '--samjae 색 정의');
ok(!/--sg-(good|ok|care):\s*#4A47C9/i.test(html), '3색 신호와 같은 색 아님');
ok(html.includes('function samjaeLayer(') && (html.match(/samjaeLayer\(\{/g) || []).length === 2, '연도 그래프 2종(흐름·지표)에 삼재 층');
ok(html.includes('function samjaeBox(') && html.includes('${samjaeBox('), '연도별 흐름 카드에 삼재 상자');
ok(html.includes('sw sj-sw') && html.includes('삼재 3년</b>'), '범례에 삼재 빗금');
ok(!/data-term="\$\{sj\.stage\}">[^`]*var\(--d-chg\)/.test(html), '삼재 배지에 변화 신호 색(--d-chg) 안 씀');
const sjFn = html.slice(html.indexOf('function samjaeLayer('), html.indexOf('function drawLife('));
ok(!/combined|score|luckV/.test(sjFn), '그래프 삼재 층이 점수를 읽거나 바꾸지 않음');

console.log('4. 공용 문안 samjae-copy.js (만세력·타임라인 같은 문장)');
const SJS = fs.readFileSync(path.join(root, 'samjae-copy.js'), 'utf8'); vm.runInContext(SJS, ctx); const MS = ctx.MantraSamjae;
ok(MS && MS.STAGES.length === 3, '공용 모듈 로드');
['들삼재', '눌삼재', '날삼재'].forEach(k => ok(MS.STAGE[k] && MS.STAGE[k][1].length >= 30, k + ' 생활 조심 문안'));
ok(!/겁나|무서|큰일|재앙|화를 당|불행/.test(JSON.stringify(MS.STAGE) + MS.WHAT + MS.NOTE), '겁주는 표현 없음');
for (let br = 0; br < 12; br++) for (let Y = 1950; Y <= 2080; Y++) { const x = MS.cycle(M, br, Y), y = M.samjaeCycle(br, Y); ok(x && x.start === y.start && x.pos === y.pos && x.gap === y.gap, `공용 cycle = 엔진 samjaeCycle ${br} ${Y}`); }
ok(html.includes('<script src="samjae-copy.js"></script>') && html.includes('const SJ_STAGE = window.MantraSamjae.STAGE'), '만세력이 공용 문안 사용');

console.log('5. 운명의 타임라인(report/hub)');
const tl = fs.readFileSync(path.join(root, 'report/hub/hub-timeline.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'report/hub/timeline.css'), 'utf8');
ok(tl.includes("H.load('/samjae-copy.js?v="), '공용 문안 불러오기(캐시 꼬리표)');
ok(tl.includes('s += sjLife(data, L0, step, T0, H0, B0);'), '인생 전체 그래프에 삼재 띠');
ok(tl.includes('sj: function (it) { return sjAt(it.year); }') && tl.includes("(sj ? ' sjy' : '')"), '대운 안 해별 막대에 삼재 표시');
ok(tl.includes('sjCard(st.y, sj)') && tl.includes('function sjCard('), '앞으로 10년 아래 삼재 카드');
ok(tl.split('sjLegend()').length - 1 >= 2, '그래프 범례 2곳');
const sjTl = tl.slice(tl.indexOf('function sjLife('), tl.indexOf('function sjCard('));
ok(!/q\.v\b|\.fit\b|scores/.test(sjTl), '타임라인 삼재 띠가 점수를 읽지 않음');
ok(/--sj: #ABA8FF/.test(css) && !/--sj:[^;]*(#2DB36B|#E8622C|#B5BDCB)/i.test(css), '타임라인 삼재 색이 3색 신호와 다름');
const HV = (fs.readFileSync(path.join(root, 'report/story/story.js'), 'utf8').match(/HV = '\?v=([^']+)'/) || [])[1], hubIdx = fs.readFileSync(path.join(root, 'report/hub/index.html'), 'utf8');
ok(HV && hubIdx.includes('hub-timeline.js?v=' + HV) && hubIdx.includes('timeline.css?v=' + HV), '허브 캐시 꼬리표 HV 와 hub/index.html 일치');

console.log('6. 카드는 삼재인 해에만 · 그래프 안 "삼재" 글씨 없음');
ok(html.includes("const c = sjCycleOf(Y); if (!c || c.pos < 0) return '';"), '만세력 삼재 상자: 삼재 해에만');
ok(tl.includes("if (!c || c.pos < 0) return '';"), '타임라인 삼재 카드: 삼재 해에만');
ok(!/>삼재<\/text>/.test(html) && !/>삼재<\/text>/.test(tl), '그래프 SVG 안에 "삼재" 글씨 없음');
ok(tl.includes("esc(sj.stage[0]) + '</q>'"), '타임라인 막대 꼬리표는 들·눌·날 한 글자');

console.log(fail ? `\n✗ ${fail}/${n} 실패` : `\n✓ 삼재 검증 ${n}항목 통과`);
process.exit(fail ? 1 : 0);
