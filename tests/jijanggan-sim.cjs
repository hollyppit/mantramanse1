// 지장간 원본 데이터 검증:  node tests/jijanggan-sim.cjs
//  · 지장간 구성(JIJANGGAN)과 월률분야 일수표(WOLRYUL)는 따로 관리한다. 비율(HIDDEN)은 구성 글자의 월률분야 일수를 30일로 다시 나눈 값.
//  · 子·卯·酉는 정기 하나뿐(癸·乙·辛 100%). 酉에 庚이 있으면 실패한다(2026-11-20 운세 흐름 화면 辛67%·庚33% 오류).
//  · 12지지 전부가 기준표와 같아야 하고, 비율 합은 100%(30일)여야 한다.
//  · 사령(司令)은 월률분야 일수표로 계속 계산한다(子월 첫 10일 壬 사령 등 — 학설 원문 보존).
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'luck-env.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, STEM = M.STEM, BR = M.BR;
const J = x => JSON.parse(JSON.stringify(x)), deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);   // vm 컨텍스트 배열은 프로토타입이 달라 JSON으로 풀어 비교
const name = b => M.HIDDEN[b].map(([s]) => STEM[s]).join('');
const pct = b => { const H = M.HIDDEN[b], t = H.reduce((a, h) => a + h[1], 0); return H.map(([s, d]) => [STEM[s], d / t * 100]); };

// 기준 지장간(여기·중기·정기 순). 午·亥는 여기(丙·戊)를 빼는 기준(2026-11-20 사용자 결정) — 午 己·丁, 亥 甲·壬.
const REF = { 子: '癸', 丑: '癸辛己', 寅: '戊丙甲', 卯: '乙', 辰: '乙癸戊', 巳: '戊庚丙', 午: '己丁', 未: '丁乙己', 申: '戊壬庚', 酉: '辛', 戌: '辛丁戊', 亥: '甲壬' };
// 작업 지시서의 구성(순서 무관).
const SPEC = { 子: '癸', 丑: '己癸辛', 寅: '甲丙戊', 卯: '乙', 辰: '戊乙癸', 巳: '丙戊庚', 午: '丁己', 未: '己丁乙', 申: '庚壬戊', 酉: '辛', 戌: '戊辛丁', 亥: '壬甲' };
const YEOGI_SCHOOL = {};   // 학설 차이로 남겨 둔 여기 없음
const sorted = s => [...s].sort().join('');

// 1) 酉는 辛 하나, 金 100%
assert.equal(name(9), '辛', '酉 지장간은 辛 하나');
assert.ok(!M.HIDDEN[9].some(([s]) => STEM[s] === '庚'), '酉에 庚이 있으면 안 됨');
deq(pct(9), [['辛', 100]], '酉 = 辛 100%');
const env = ctx.MantraLuckEnv;
deq(env.mixOf(M, 7, 9), [0, 0, 0, 100, 0], '辛酉 운 기둥 오행 = 金 100%(운세 흐름 화면 셈법)');
const envText = env.env(M, [{ level: 'seun', s: 7, b: 9 }]).branch.text || '';
assert.ok(/辛\(금\) 한 글자만/.test(envText) && !/庚/.test(envText), '화면 문구 辛(금) 한 글자, 庚 없음: ' + envText);
deq(env.env(M, [{ level: 'seun', s: 7, b: 9 }]).branch.hidden.map(h => [h.stem, h.pct]), [['辛', 100]], '운세 흐름 지장간 비율 辛 100%');

// 2) 卯 乙木 100%, 子 癸水 100%
deq(pct(3), [['乙', 100]], '卯 = 乙 100%'); assert.equal(M.stemEl(M.HIDDEN[3][0][0]), 0, '乙 = 木');
deq(pct(0), [['癸', 100]], '子 = 癸 100%'); assert.equal(M.stemEl(M.HIDDEN[0][0][0]), 4, '癸 = 水');

// 3) 12지지 전부 기준표와 일치
for (let b = 0; b < 12; b++) {
  const br = BR[b];
  assert.equal(name(b), REF[br], br + ' 지장간 구성·순서');
  const noSchool = [...name(b)].filter(s => s !== YEOGI_SCHOOL[br]).join('');
  assert.equal(sorted(noSchool), sorted(SPEC[br]), br + ' 지시서 구성과 일치');
  assert.equal(M.JIJANGGAN[b].map(s => STEM[s]).join(''), REF[br], br + ' 구성표(JIJANGGAN)');
  assert.equal(M.mainHidden(b), M.JIJANGGAN[b][M.JIJANGGAN[b].length - 1], br + ' 본기 = 구성표 마지막');
}

// 午·亥: 여기가 빠지면 중기·정기 이름표, 비율은 중기 일수 그대로·빠진 여기는 정기에(午 己9·丁21 → 30%·70%, 亥 甲7·壬23 → 23.3%·76.7%)
deq(M.hiddenLabels(6), ['중기', '정기'], '午 이름표'); deq(M.hiddenLabels(11), ['중기', '정기'], '亥 이름표');
deq(pct(6).map(x => +x[1].toFixed(1)), [30, 70], '午 비율'); deq(pct(11).map(x => +x[1].toFixed(1)), [23.3, 76.7], '亥 비율');
const c4 = M.compute({ year: 2025, month: 6, day: 7, hour: 12, minute: 0, gender: 'M', calendar: 'solar' });   // 芒種(6/5) 직후 → 午월 초 → 월률분야대로 丙 사령
assert.equal(BR[c4.pillars.month.b], '午'); assert.equal(STEM[c4.saryeong.stem], '丙', '午월 초 사령 丙(월률분야 원문)');

// 4) 비율 합 100% · 하나뿐이면 100% · 개수와 비율을 섞지 않음(비율은 일수에서, 개수는 구성에서)
for (let b = 0; b < 12; b++) {
  const H = M.HIDDEN[b], tot = H.reduce((a, h) => a + h[1], 0);
  assert.ok(Math.abs(tot - 30) < 1e-9, BR[b] + ' 일수 합 30(= 100%)');
  assert.ok(Math.abs(pct(b).reduce((a, x) => a + x[1], 0) - 100) < 1e-9, BR[b] + ' 비율 합 100%');
  if (H.length === 1) assert.equal(H[0][1], 30, BR[b] + ' 하나뿐인 지장간은 100%');
  assert.equal(H.length, M.JIJANGGAN[b].length, BR[b] + ' 개수 = 구성표 개수');
  const labels = M.hiddenLabels(b); assert.equal(labels.length, H.length, BR[b] + ' 이름표 수'); assert.equal(labels[labels.length - 1], '정기', BR[b] + ' 마지막은 정기');
  if (H.length === 1) deq(labels, ['정기'], BR[b] + ' 하나뿐이면 정기');
}

// 5) 월률분야 일수표는 원문 그대로(사령용) — 비율은 이 표의 일수에서 나온다
const WR = { 子: '壬10癸20', 丑: '癸9辛3己18', 寅: '戊7丙7甲16', 卯: '甲10乙20', 辰: '乙9癸3戊18', 巳: '戊7庚7丙16', 午: '丙10己9丁11', 未: '丁9乙3己18', 申: '戊7壬7庚16', 酉: '庚10辛20', 戌: '辛9丁3戊18', 亥: '戊7甲7壬16' };
for (let b = 0; b < 12; b++) {
  assert.equal(M.WOLRYUL[b].map(([s, d]) => STEM[s] + d).join(''), WR[BR[b]], BR[b] + ' 월률분야 원문');
  const W = M.WOLRYUL[b].filter(([s]) => M.JIJANGGAN[b].includes(s)), wt = W.reduce((a, x) => a + x[1], 0);
  M.HIDDEN[b].forEach(([s, d], i) => { assert.equal(s, W[i][0]); const want = i === W.length - 1 ? W[i][1] + 30 - wt : W[i][1]; assert.ok(Math.abs(d - want) < 1e-9, BR[b] + ' 비율 = 월률분야 일수(빠진 여기는 정기에)'); });
}

// 6) 사령: 酉월 절입 직후(10일 안)는 월률분야대로 庚 사령, 그 뒤는 辛
const c1 = M.compute({ year: 2025, month: 9, day: 9, hour: 12, minute: 0, gender: 'M', calendar: 'solar' });   // 白露(9/7) 직후 → 酉월
assert.equal(BR[c1.pillars.month.b], '酉');
const s1 = c1.saryeong; assert.equal(STEM[s1.stem], '庚', '酉월 초 사령 庚(월률분야)'); assert.equal(s1.label, '여기');
const c2 = M.compute({ year: 2025, month: 9, day: 28, hour: 12, minute: 0, gender: 'M', calendar: 'solar' });
const s2 = c2.saryeong; assert.equal(STEM[s2.stem], '辛', '酉월 후반 사령 辛'); assert.equal(s2.label, '정기');

// 7) 원국 표의 지장간(cells.hidden)도 같은 데이터를 쓴다
const c3 = M.compute({ year: 1993, month: 9, day: 20, hour: 10, minute: 0, gender: 'F', calendar: 'solar' });
for (const k of ['year', 'month', 'day', 'hour']) { const p = c3.pillars[k], cell = c3.cells && c3.cells[k]; if (!p || !cell || !cell.hidden) continue;
  deq(cell.hidden.map(h => h.s), M.JIJANGGAN[p.b], k + ' 원국 지장간'); deq(cell.hidden.map(h => h.label), M.hiddenLabels(p.b), k + ' 원국 지장간 이름표'); }

// 8) 엔진 자체 점검(본기·라벨·깊이)
const v = M.validateRootHiddenData(); assert.ok(v.ok, v.issues.join(' / '));

console.log('jijanggan-sim PASS: 12지지 지장간 구성·비율 100%·子卯酉 단일·월률분야 사령 분리');
