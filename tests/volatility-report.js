// 변동성(변동기) 분포 보고서 — 읽기 전용 분석 도구(통과/실패 테스트가 아니다):  node tests/volatility-report.js [차트수=240]
// 엔진 값만 읽는다. 임계값·sat 를 바꿨을 때 변동기 비율이 어떻게 달라지는지 "엔진을 바꾸지 않고" 재계산해 보여 준다.
//   · 임계값 민감도: 엔진이 돌려준 volatilityScore 를 기준만 바꿔 다시 센다(표시 계층 luck6.js 의 CONFIG.volatility 에 해당).
//   · sat 민감도: 엔진이 돌려준 변동 신호(volatilitySignals)로 점수 식(100×(1−exp(−합/sat)))을 다시 계산한다. 현재 sat 로 재계산한 값이
//     엔진 값과 일치함을 먼저 확인한다(일치하지 않으면 sat 표는 신뢰하지 않는다).
// 설계 근거·해석: report/v2/VOLATILITY_ANALYSIS.md
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2/luck6.js'), 'utf8'), { filename: 'luck6.js' });
const M = globalThis.Manse, L = globalThis.ReportV2.Luck6;
const N = Math.max(20, +process.argv[2] || 240), Y = 2026;

let seed = 20261010; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) {
  try { charts.push(M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, calendar: 'solar', leap: false, gender: rnd() < .5 ? 'M' : 'F', city: '서울' })); } catch (e) { /* 없는 날짜 */ }
}
const rows = [];
for (const ch of charts) {
  (ch.daeun.list || []).forEach(d => d.ev && rows.push({ level: '대운', ev: d.ev }));
  try { M.seunRange(ch, Y - 5, Y + 4).forEach(s => s.ev && rows.push({ level: '세운', ev: s.ev })); } catch (e) { }
  for (const y of [Y, Y + 1]) { try { M.wolun(ch, y).forEach(w => w.ev && rows.push({ level: '월운', ev: w.ev })); } catch (e) { } }
}
const pct = (n, d) => (100 * n / d).toFixed(1) + '%';
const share = (a, f) => pct(a.filter(f).length, a.length);

// 점수 식 재현(engine.js calculateVolatility: 신호를 큰 순으로 stack 0.75 씩 감쇠, 핵심궁 신호 2개 이상이면 overlap 가산)
const V = { stack: 0.75, coreMin: 10, bonus: 5 };
const rescore = (sigs, sat) => {
  const s = sigs.slice().sort((a, b) => b.pts - a.pts), nCore = s.filter(g => g.core && g.pts >= V.coreMin).length;
  const sum = s.reduce((a, g, i) => a + g.pts * V.stack ** i, 0) + (nCore >= 2 ? V.bonus * (nCore - 1) : 0);
  return 100 * (1 - Math.exp(-sum / sat));
};
const matches = rows.every(r => Math.abs(rescore(r.ev.volatilitySignals || [], 50) - r.ev.volatilityScore) < 0.01);

const out = [];
out.push('# 변동성 분포 보고서', '', '차트 ' + N + '개 · 운 ' + rows.length + '건(대운 ' + rows.filter(r => r.level === '대운').length + ' · 세운 ' + rows.filter(r => r.level === '세운').length + ' · 월운 ' + rows.filter(r => r.level === '월운').length + ') · 고정 시드', '');
out.push('현재 기준: 표시 계층(luck6) 변동기 ≥ ' + L.CONFIG.volatility + ', 엔진 overlay ≥ 55, sat 50. 단일 일지 충(40점) = ' + (100 * (1 - Math.exp(-40 / 50))).toFixed(1) + '점.', '');
out.push('## 1. 현재 변동성 ≥ 55 비율', '', '| 구분 | 건수 | ≥ 40 | ≥ 55 | ≥ 70 | 거의 0(<1) |', '|---|---|---|---|---|---|');
['대운', '세운', '월운', '전체'].forEach(l => { const a = l === '전체' ? rows : rows.filter(r => r.level === l); const v = r => r.ev.volatilityScore; out.push('| ' + l + ' | ' + a.length + ' | ' + share(a, r => v(r) >= 40) + ' | ' + share(a, r => v(r) >= 55) + ' | ' + share(a, r => v(r) >= 70) + ' | ' + share(a, r => v(r) < 1) + ' |'); });

out.push('', '## 2. 임계값만 바꿀 때(표시 계층 변동기 기준) — 6분류 표시 비율', '', '| 변동기 기준 | 변동기 | 방어기 | 기회기 | 확장기 | 수확기 | 축적기 |', '|---|---|---|---|---|---|---|');
const keep = L.CONFIG.volatility;
[50, 55, 60, 65, 70, 75].forEach(t => {
  L.CONFIG.volatility = t; const labs = rows.map(r => L.of(r.ev).label);
  const c = n => pct(labs.filter(x => x === n).length, labs.length);
  out.push('| ' + t + (t === keep ? ' (현재)' : '') + ' | ' + c('변동기') + ' | ' + c('방어기') + ' | ' + c('기회기') + ' | ' + c('확장기') + ' | ' + c('수확기') + ' | ' + c('축적기') + ' |');
});
L.CONFIG.volatility = keep;

out.push('', '## 3. 엔진 sat(포화 상수)를 바꿀 때 — 변동성 ≥ 55 비율(재계산)', '', matches ? '재계산 검증: 현재 sat 50 로 다시 계산한 점수가 엔진 값과 전부 일치(표를 신뢰할 수 있음).' : '**경고: 재계산이 엔진 값과 일치하지 않습니다. 이 표는 신뢰하지 마세요.**', '', '| sat | ≥ 55 | ≥ 70 | 평균 점수 |', '|---|---|---|---|');
[50, 60, 70, 80, 100].forEach(sat => {
  const sc = rows.map(r => rescore(r.ev.volatilitySignals || [], sat));
  out.push('| ' + sat + (sat === 50 ? ' (현재)' : '') + ' | ' + pct(sc.filter(x => x >= 55).length, sc.length) + ' | ' + pct(sc.filter(x => x >= 70).length, sc.length) + ' | ' + (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1) + ' |');
});

out.push('', '## 4. 변동기(≥ 55)를 만든 가장 큰 신호', '', '| 신호 | 건수 | 비율 |', '|---|---|---|');
const hi = rows.filter(r => r.ev.volatilityScore >= 55), top = {};
hi.forEach(r => { const s = (r.ev.volatilitySignals || []).slice().sort((a, b) => b.pts - a.pts)[0]; const k = s ? s.type + (s.core ? ' · 일지/월지(핵심궁)' : ' · 그 밖의 자리') : '(신호 없음)'; top[k] = (top[k] || 0) + 1; });
Object.entries(top).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => out.push('| ' + k + ' | ' + n + ' | ' + pct(n, hi.length) + ' |'));
const cnt = hi.map(r => (r.ev.volatilitySignals || []).length).sort((a, b) => a - b);
out.push('', '변동기 항목의 신호 개수 중앙값 ' + cnt[cnt.length >> 1] + '개 · 신호 1개뿐인 항목 ' + pct(cnt.filter(n => n === 1).length, cnt.length) + ' · 3개 이상 ' + pct(cnt.filter(n => n >= 3).length, cnt.length) + '.');
console.log(out.join('\n'));
