// 궁합 기운(evaluateCompatibleElement · evaluateDayPillarCompatibility) 검증
//   node tests/compat-sim.js [차트 수=800] [학파=eokbu|johu|tonggwan]
// 사주 유형별로 (1) NaN·빈 값이 없는지 (2) 점수 분포가 한쪽으로 쏠리지 않는지 (3) 방향성이 상식과 맞는지 확인한다.
//   - 극신약·신약 사주는 인성·비겁 오행이, 신강·극신강 사주는 식상·재성·관성 오행이 평균적으로 높아야 한다
//   - 한기 사주는 화(火), 열기 사주는 수(水), 건조 사주는 수, 습 사주는 화 쪽 후보가 조후 성분에서 높아야 한다
//   - 일주 후보의 충·형 마찰은 '주의 요소'로 잡히되, 합이 있다고 무조건 최고점이 되지는 않아야 한다
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
vm.runInThisContext(html.slice(a, html.indexOf('\n', b)));
const M = globalThis.Manse;

const N = +process.argv[2] || 800, SCHOOL = process.argv[3] || 'eokbu';
let seed = 20240607; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) {
  try { charts.push(M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: SCHOOL })); } catch (e) { /* 없는 날짜 */ }
}
const TYPES = {
  '극신약': c => c.strength.help < 25, '신약': c => c.strength.help >= 25 && c.strength.help < 42, '중화': c => c.strength.zone === '중화',
  '신강': c => c.strength.help >= 58 && c.strength.help < 72, '극신강': c => c.strength.help >= 72,
  '한기 편중': c => c.climate.temp <= -0.7, '열기 편중': c => c.climate.temp >= 0.7, '건조 편중': c => c.climate.hum <= -0.9, '습 편중': c => c.climate.hum >= 0.9,
  'ALL': () => true,
};
const CO = ['조화 높음', '조화', '혼합', '주의 요소 있음'], TY = ['보완형', '활성형', '안정형', '상호자극형', '혼합형'];
const fails = [], mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const pct = (o, ks, n) => ks.map(k => String(Math.round((o[k] || 0) / n * 100)).padStart(3)).join(' ');
const NUMS = ['score', 'risk', 'elementFit', 'stemRelation', 'branchRelation', 'tenGodEffect', 'climateFit', 'balanceFit', 'relationFit', 'excessRisk'];

console.log(`차트 ${charts.length}개 · 학파 ${SCHOOL}`);
console.log('유형'.padEnd(10), 'n'.padStart(4), ' 일주평균  sd  최저~최고  상위5평균 | ' + TY.map(t => t.slice(0, 2)).join(' ') + ' | ' + CO.map(t => t.slice(0, 2)).join(' ') + ' | 오행 5개 평균(목화토금수)');
for (const [name, f] of Object.entries(TYPES)) {
  const cs = charts.filter(f); if (!cs.length) { console.log(name.padEnd(10), '해당 사주 없음'); continue; }
  const all = [], top = [], ty = {}, co = {}, elAvg = [[], [], [], [], []];
  for (const c of cs) {
    const list = M.compatDayPillars(c);
    if (list.length !== 60) fails.push(`${name}: 일주 ${list.length}개`);
    list.forEach(x => { all.push(x.score); ty[x.type] = (ty[x.type] || 0) + 1; co[x.condition] = (co[x.condition] || 0) + 1; for (const k of NUMS) if (!Number.isFinite(x[k])) fails.push(`${name}: ${x.ganzhi} ${k}=${x[k]}`); if (!x.reasons.length) fails.push(`${name}: ${x.ganzhi} 이유 없음`); });
    top.push(mean(list.slice(0, 5).map(x => x.score)));
    for (let e = 0; e < 5; e++) { const r = M.evaluateCompatibleElement(c, e); elAvg[e].push(r.score); for (const k of ['score', 'eokbuFit', 'johuFit', 'balanceFit', 'tenGodEffect', 'excessRisk']) if (!Number.isFinite(r[k])) fails.push(`${name}: 오행${e} ${k}`); if (r.score < 0 || r.score > 100) fails.push(`${name}: 오행 점수 범위 ${r.score}`); }
  }
  const n = all.length;
  console.log(name.padEnd(10), String(cs.length).padStart(4), mean(all).toFixed(1).padStart(7), sd(all).toFixed(1).padStart(5), `${Math.min(...all)}~${Math.max(...all)}`.padStart(8), mean(top).toFixed(1).padStart(8), '|', pct(ty, TY, n), '|', pct(co, CO, n), '|', elAvg.map(x => mean(x).toFixed(0).padStart(3)).join(' '));
}

// 방향성 점검: 십성 묶음(비겁·식상·재성·관성·인성) 별 오행 점수 평균
console.log('\n[방향성] 유형별 십성 묶음에 해당하는 오행의 평균 궁합 오행 점수');
console.log('유형'.padEnd(10), TY.length ? ['비겁', '식상', '재성', '관성', '인성'].map(x => x.padStart(4)).join('') : '');
for (const [name, f] of Object.entries(TYPES)) {
  const cs = charts.filter(f); if (!cs.length) continue;
  const g = [[], [], [], [], []];
  for (const c of cs) { const dEl = M.stemEl(c.pillars.day.s); for (let e = 0; e < 5; e++) g[(e - dEl + 5) % 5].push(M.evaluateCompatibleElement(c, e).score); }
  console.log(name.padEnd(10), g.map(x => mean(x).toFixed(0).padStart(4)).join(''));
}
console.log('\n[조후] 조후 편중 사주의 오행별 조후 성분(johuFit) 평균 — 한기는 화, 열기는 수 쪽이 높아야 함');
for (const name of ['한기 편중', '열기 편중', '건조 편중', '습 편중']) {
  const cs = charts.filter(TYPES[name]); if (!cs.length) { console.log(name.padEnd(10), '해당 없음'); continue; }
  console.log(name.padEnd(10), [0, 1, 2, 3, 4].map(e => `${M.EL_K[e]} ${mean(cs.map(c => M.evaluateCompatibleElement(c, e).johuFit)).toFixed(2)}`).join('  '));
}

// 일주 규칙 점검: 충이 있는 후보는 주의가 되는지, 합만 있다고 항상 최상위가 아닌지
let clash = 0, clashWarn = 0, hap = 0, hapTop = 0, hapAll = 0;
for (const c of charts) {
  const list = M.compatDayPillars(c), mb = c.pillars.day.b, top = new Set(list.slice(0, 5).map(x => x.i));
  for (const x of list) {
    if (x.tags.some(t => t.where === '일지' && t.name.endsWith('충'))) { clash++; if (x.condition === '주의 요소 있음') clashWarn++; }
    if (x.tags.some(t => t.where === '일지' && t.name.includes('합') && t.kind === 'bond')) { hap++; if (top.has(x.i)) hapTop++; if (x.condition === '조화 높음') hapAll++; }
  }
}
console.log(`\n[규칙] 일지 충 후보 ${clash}건 중 '주의 요소 있음' ${(clashWarn / clash * 100).toFixed(0)}%`);
console.log(`[규칙] 일지 합 후보 ${hap}건 중 상위5 진입 ${(hapTop / hap * 100).toFixed(0)}% · '조화 높음' ${(hapAll / hap * 100).toFixed(0)}% (100%면 합=무조건 최고라는 뜻이라 실패)`);

if (fails.length) { console.log('\n실패', fails.length, '건'); fails.slice(0, 10).forEach(x => console.log(' ', x)); process.exit(1); }
console.log('\n오류 없음');
