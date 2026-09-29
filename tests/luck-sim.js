// 운세 흐름 엔진(evaluateLuck) 검증: index.html의 계산 모듈을 그대로 꺼내 실행한다.
//   node tests/luck-sim.js [차트 수=600] [시간 단위=daeun|seun|wolun|ilun|sijin] [학파=eokbu|johu|tonggwan]
// 사주 유형(A~K)별로 60갑자 전체를 운으로 넣어 (1) NaN·빈 값이 없는지 (2) 평균 흐름 점수·시기 분포가 한쪽으로 치우치지 않는지 본다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
vm.runInThisContext(html.slice(a, html.indexOf('\n', b)));
const M = globalThis.Manse;

const N = +process.argv[2] || 600, LEVEL = process.argv[3] || 'daeun', SCHOOL = process.argv[4] || 'eokbu';
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) {
  try {
    charts.push(M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: SCHOOL }));
  } catch (e) { /* 존재하지 않는 날짜 등은 건너뜀 */ }
}
const pillars = []; for (let Y = 1984; Y < 2044; Y++) pillars.push(M.yearPillarOf(Y)); // 60갑자 한 바퀴
const eok = c => c.yongAll.eokbu, jo = c => c.yongAll.johu;
const TYPES = {
  'A 극신약': c => c.strength.help < 25, 'B 신약': c => c.strength.help >= 30 && c.strength.help < 42, 'C 중화': c => c.strength.zone === '중화',
  'D 신강': c => c.strength.help >= 58 && c.strength.help < 70, 'E 극신강': c => c.strength.help >= 72,
  'F 한기 강함': c => c.climate.temp <= -0.7, 'G 열기 강함': c => c.climate.temp >= 0.7,
  'H 건조 심함': c => c.climate.hum <= -0.9, 'I 습 심함': c => c.climate.hum >= 0.9,
  'J 억부=조후 용신': c => jo(c).applicable && jo(c).yong === eok(c).yong,
  'K 억부≠조후(반대)': c => jo(c).applicable && ['기신', '구신'].includes(eok(c).roles[jo(c).yong]),
  'ALL': () => true,
};
const PH = ['공격기', '확장기', '수확기', '축적기', '변동기', '방어기'], CO = ['순풍', '보통', '주의', '부담'];
const NUM = ['fitScore', 'ownFit', 'eokbuScore', 'johuScore', 'relationScore', 'structureScore', 'volatilityScore', 'intensityScore'];
const pct = (o, ks, n) => ks.map(k => String(Math.round((o[k] || 0) / n * 100)).padStart(3)).join(' ');
const fails = [];
console.log(`차트 ${charts.length}개 · 단위 ${LEVEL} · 학파 ${SCHOOL} · 각 사주에 60갑자 전부를 운으로 대입`);
console.log('유형'.padEnd(18), 'n'.padStart(4), '평균', ' 표준편차', '| ' + PH.map(p => p.slice(0, 2)).join(' ') + ' | ' + CO.join(' ') + ' | 변화 강도 억부w 조후w');
for (const [name, f] of Object.entries(TYPES)) {
  const cs = charts.filter(f); if (!cs.length) { console.log(name.padEnd(18), '해당 사주 없음'); continue; }
  let sum = 0, sq = 0, n = 0, chg = 0, int = 0, wE = 0, wJ = 0; const ph = {}, co = {};
  for (const c of cs) for (const p of pillars) {
    const ev = M.evaluateLuck(c, p, LEVEL);
    for (const k of NUM) if (!Number.isFinite(ev[k])) fails.push(`${name}: ${k}=${ev[k]}`);
    if (!PH.includes(ev.phase) || !CO.includes(ev.condition) || !ev.activityType || !ev.dominantTenGodGroup) fails.push(`${name}: 빈 phase/condition (${ev.phase}/${ev.condition})`);
    if (ev.reasons.length < 1 || ev.reasons.length > 4 || ev.reasons.some(r => /undefined|NaN/.test(r))) fails.push(`${name}: reasons 이상`);
    if (ev.parts.some(x => !Number.isFinite(x.v) || /undefined|NaN/.test(x.label))) fails.push(`${name}: parts 이상`);
    if (Math.abs(ev.fitScore) > 100.0001) fails.push(`${name}: 범위 초과 ${ev.fitScore}`);
    sum += ev.fitScore; sq += ev.fitScore ** 2; n++; ph[ev.phase] = (ph[ev.phase] || 0) + 1; co[ev.condition] = (co[ev.condition] || 0) + 1;
    chg += ev.volatilityScore; int += ev.intensityScore; wE += ev.weights.eokbu; wJ += ev.weights.johu;
  }
  const m = sum / n;
  console.log(name.padEnd(18), String(cs.length).padStart(4), m.toFixed(1).padStart(5), Math.sqrt(sq / n - m * m).toFixed(1).padStart(7), '|', pct(ph, PH, n), '|', pct(co, CO, n).replace(/ {2}/g, '   '), '|', (chg / n).toFixed(0).padStart(3), (int / n).toFixed(0).padStart(4), (wE / n).toFixed(2), (wJ / n).toFixed(2));
  // 편향 검사: 유형별 평균 흐름 점수가 0에서 멀지 않고, 어느 시기 유형도 한 유형이 절반 이상을 차지하지 않는다
  if (n >= 300 && Math.abs(m) > 6) fails.push(`${name}: 평균 흐름 점수 ${m.toFixed(1)} — 한 방향 편향`);
  if (n >= 300 && Math.max(...PH.map(p => (ph[p] || 0) / n)) > 0.5) fails.push(`${name}: 한 시기 유형이 50% 초과`);
  if (n >= 300 && (ph['방어기'] || 0) / n > 0.25) fails.push(`${name}: 방어기 비중 25% 초과`);
}
console.log(fails.length ? `\n실패 ${fails.length}건\n` + [...new Set(fails)].slice(0, 20).join('\n') : '\nNaN/undefined/빈 phase 없음, 유형별 편향 기준 통과');
process.exit(fails.length ? 1 : 0);
