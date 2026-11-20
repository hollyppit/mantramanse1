// 계절·월령 중심 오행 세력(engine.js season 모델, 2026-11-20) 검증:  node tests/seasonal-strength-sim.cjs
//  · 왕상휴수사 표(요구서 표와 같음), 월령 오행(사계월 토왕용사), 절입 전후 월령
//  · 세 지표 분리: ① 출현량 ② 계절 세력 ③ 최종 세력 — 가상 명식 5종에서 출현량과 실제 세력이 구분되는지
//  · 근거 로그(trace)가 모든 글자에 있고, 이전 방식(season1)은 f69cd50 엔진의 season 과 같다(기존 기능 보존)
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const load = src => { const c = { console }; c.window = c; vm.createContext(c); vm.runInContext(src, c); return c.Manse; };
const M = load(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'));
const J = x => JSON.parse(JSON.stringify(x)), deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const C = (y, mo, d, h, mi = 0, g = 'M') => M.compute({ year: y, month: mo, day: d, hour: h, minute: mi, gender: g, calendar: 'solar' });
const pil = ch => ['year', 'month', 'day', 'hour'].map(k => M.gzName(ch.pillars[k])).join(' ');
const S = ch => ch.weights.seasonal;

// 1) 왕상휴수사 표 — 요구서: 봄 목왕 화상 수휴 금수 토사 / 여름 화 토 목 수 금 / 가을 금 수 토 화 목 / 겨울 수 목 금 토 화
const TABLE = { 0: ['목', '화', '수', '금', '토'], 1: ['화', '토', '목', '수', '금'], 3: ['금', '수', '토', '화', '목'], 4: ['수', '목', '금', '토', '화'] };
for (const [c, order] of Object.entries(TABLE)) order.forEach((elK, i) => assert.equal(M.wangsangOf(M.EL_K.indexOf(elK), +c), ['왕', '상', '휴', '수', '사'][i], `월령 ${M.EL_K[c]}에서 ${elK}`));
// 사계월 토왕: 土 월령이면 토왕 금상 화휴 목수 수사
['토', '금', '화', '목', '수'].forEach((elK, i) => assert.equal(M.wangsangOf(M.EL_K.indexOf(elK), 2), ['왕', '상', '휴', '수', '사'][i], '토 월령 ' + elK));

// 2) 월령 오행: 辰월 절입 직후는 木, 12일 뒤(여기·중기 지남)부터 土 — 월률분야 일수와 같은 경계
const r1 = C(2025, 4, 6, 12), r2 = C(2025, 4, 25, 12);   // 淸明 2025-04-04
assert.equal(M.BR[r1.pillars.month.b], '辰'); assert.equal(M.BR[r2.pillars.month.b], '辰');
assert.equal(S(r1).command.el, 0, '辰월 초 월령 목: ' + S(r1).command.why); assert.equal(S(r2).command.el, 2, '辰월 정기 기간 월령 토: ' + S(r2).command.why);
assert.equal(M.monthCommand(r2, 'season').el, 0, 'season 설정이면 辰월은 늘 목'); assert.equal(M.monthCommand(r1, 'earth').el, 2, 'earth 설정이면 늘 토');
// 절입 전후: 2024 立春(2/4 17:27 KST) 전날은 丑월(겨울), 다음날은 寅월(봄)
const b1 = C(2024, 2, 3, 12), b2 = C(2024, 2, 5, 12);
assert.equal(M.BR[b1.pillars.month.b], '丑'); assert.equal(M.BR[b2.pillars.month.b], '寅');
assert.notEqual(S(b1).command.el, 0, '입춘 전은 봄 월령이 아님'); assert.equal(S(b2).command.el, 0, '입춘 뒤는 목 월령');
for (const ch of [r1, r2, b1, b2]) assert.equal(S(ch).states.find(x => x.state === '왕').el, S(ch).command.el, '왕 = 월령 오행');

// 3) 세 지표·근거 로그
const sum = a => a.reduce((x, y) => x + y, 0);
let n = 0;
for (let i = 0; i < 300; i++) {
  const ch = C(1950 + (i * 7) % 60, 1 + (i * 5) % 12, 1 + (i * 11) % 28, (i * 3) % 24); const s = S(ch); n++;
  for (const k of ['appearance', 'seasonalPct', 'finalPct']) assert.ok(Math.abs(sum(s[k]) - 100) < 1e-9, k + ' 합 100');
  deq(s.finalPct, ch.weights.pct, '최종 세력 = 판정에 쓰는 오행 비율');
  const pos = ['year', 'month', 'day', 'hour'].filter(k => ch.pillars[k]).length;
  assert.equal(s.trace.length, pos * 2, '글자마다 근거 로그'); s.trace.forEach(t => assert.ok(t.why && !/undefined|NaN/.test(t.why), t.why));
  assert.equal(ch.strengthAll.season.zone, ch.strength.zone, '판정은 새 season 모델');
  assert.ok(ch.weightsAll.season1 && ch.weightsAll.season1.seasonal === null, '이전 방식 보존(계절 지표 없음)');
}

// 4) 이전 방식(season1)은 f69cd50 의 season 과 같다
let old = null; try { old = load(cp.execSync('git show f69cd50:engine.js', { cwd: root, maxBuffer: 64 << 20 }).toString()); } catch (e) { console.log('  (git 기록 없음 — 이전 방식 대조 생략)'); }
if (old) for (let i = 0; i < 60; i++) { const inp = { year: 1950 + i, month: 1 + i % 12, day: 1 + (i * 3) % 28, hour: i % 24, minute: 0, gender: 'F', calendar: 'solar' };
  deq(M.compute(inp).weightsAll.season1.pct.map(v => +v.toFixed(9)), old.compute(inp).weights.pct.map(v => +v.toFixed(9)), '이전 방식 = f69cd50 season'); }

// 5) 가상 명식 5종 — 출현량과 실제 세력이 구분되는지
const f1 = a => Array.from(a, v => +v.toFixed(1));
// a) 봄에 목이 적지만 득령·통근
const a = C(1957, 3, 3, 10); assert.equal(pil(a), '丁酉 壬寅 甲戌 己巳');
assert.ok(S(a).appearance[0] < 22 && a.strength.deukryeong && M.analyzeNatalRoot(a).hasNatalRoot, 'a 조건');
assert.ok(S(a).finalPct[0] > S(a).appearance[0] + 8 && S(a).states[0].state === '왕', 'a 목: 출현 ' + f1(S(a).appearance)[0] + ' → 세력 ' + f1(S(a).finalPct)[0]);
assert.ok(a.strength.help > a.strengthAll.season1.help, 'a 이전 방식보다 일간이 강하게 잡힘');
// b) 가을에 목이 많지만 실령·금 극제
const b = C(1950, 8, 17, 2); assert.equal(pil(b), '庚寅 甲申 甲申 甲子');
assert.ok(S(b).appearance[0] >= 38 && !b.strength.deukryeong && S(b).states[0].state === '사' && S(b).states[3].state === '왕', 'b 조건');
assert.ok(S(b).finalPct[0] < S(b).appearance[0] - 8 && S(b).finalPct[3] > S(b).appearance[3], 'b 목은 출현보다 약하고 금은 강함');
// c) 겨울에 수 강·화 약
const c = C(1952, 11, 10, 2); assert.equal(pil(c), '壬辰 辛亥 庚申 丁丑');
assert.ok(S(c).states[4].state === '왕' && S(c).states[1].state === '사' && S(c).finalPct[4] > S(c).appearance[4] && S(c).finalPct[1] < S(c).appearance[1] / 1.5, 'c 수↑ 화↓');
// d) 여름에 화 강·수 부족
const d = C(1953, 5, 10, 18); assert.equal(pil(d), '癸巳 丁巳 辛酉 丁酉');
assert.ok(S(d).states[1].state === '왕' && S(d).states[4].state === '수' && S(d).finalPct[1] > S(d).appearance[1] && S(d).finalPct[4] < S(d).appearance[4], 'd 화↑ 수↓');
// e) 오행 출현량은 비슷하지만 월령이 다른 두 명식(같은 甲 일간)
const e1 = C(1968, 11, 10, 10), e2 = C(1972, 9, 10, 10); assert.equal(pil(e1), '戊申 癸亥 甲申 己巳'); assert.equal(pil(e2), '壬子 己酉 甲辰 己巳');
const gap = Math.max(...S(e1).appearance.map((v, k) => Math.abs(v - S(e2).appearance[k])));
assert.ok(gap < 4, 'e 출현량 차이 ' + gap.toFixed(1) + '%p');
assert.ok(e1.strength.help - e2.strength.help > 15 && e1.strength.zone !== e2.strength.zone, `e 강약이 갈림: 亥월 ${e1.strength.zone} ${e1.strength.help.toFixed(1)} / 酉월 ${e2.strength.zone} ${e2.strength.help.toFixed(1)}`);

// 6) 조후는 세력에 섞지 않음(설정), 이전 방식은 조후 계수 그대로
assert.equal(M.SEASONAL_CFG.johuInWeights, false);
assert.ok(a.weights.adjustments.climateFactors.every(x => x === 1), '새 방식 조후 계수 없음');

console.log(`seasonal-strength-sim PASS: 왕상휴수사 표·사계월 토왕·절입 전후 · 사주 ${n}명 세 지표·근거 로그 · 이전 방식 보존 · 가상 명식 5종`);
console.log(`  a 봄 목 적음: 목 출현 ${f1(S(a).appearance)[0]}% → 세력 ${f1(S(a).finalPct)[0]}% (${a.strengthAll.season1.zone}→${a.strength.zone})`);
console.log(`  b 가을 목 많음: 목 ${f1(S(b).appearance)[0]}% → ${f1(S(b).finalPct)[0]}%, 금 ${f1(S(b).appearance)[3]}% → ${f1(S(b).finalPct)[3]}%`);
console.log(`  c 겨울: 수 ${f1(S(c).appearance)[4]}→${f1(S(c).finalPct)[4]}%, 화 ${f1(S(c).appearance)[1]}→${f1(S(c).finalPct)[1]}%`);
console.log(`  d 여름: 화 ${f1(S(d).appearance)[1]}→${f1(S(d).finalPct)[1]}%, 수 ${f1(S(d).appearance)[4]}→${f1(S(d).finalPct)[4]}%`);
console.log(`  e 출현 차 ${gap.toFixed(1)}%p: 亥월 ${e1.strength.zone}(${e1.strength.help.toFixed(1)}) vs 酉월 ${e2.strength.zone}(${e2.strength.help.toFixed(1)})`);
