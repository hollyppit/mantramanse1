// 직업 · 활동 적성(원국 기반) 검증
//   node tests/career-sim.js [차트 수=4000] [--json]
// 원국 유형 A~O, 12개 분야 정상 계산, 분야 편향(평균·상위 3위 빈도), 단일 규칙 부재, 운과의 분리를 단언으로 확인한다. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
vm.runInThisContext(html.slice(a, html.indexOf('\n', b)));
const M = globalThis.Manse;

const N = +process.argv[2] || 4000;
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) {
  try { charts.push(M.compute({ year: 1900 + Math.floor(rnd() * 140), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' })); } catch (e) { /* 없는 날짜 */ }
}
const fails = [], ok = (cond, msg) => { if (!cond) fails.push(msg); };
const mean = arr => arr.reduce((p, q) => p + q, 0) / (arr.length || 1);
const sd = arr => { const m = mean(arr); return Math.sqrt(mean(arr.map(x => (x - m) ** 2))); };
const corr = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sx = 0, sy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sx += (v - mx) ** 2; sy += (y[i] - my) ** 2; }); return sxy / Math.sqrt(sx * sy || 1); };
const K = M.CAREER_KEYS, NAME = k => M.CAREER_CONFIG.categories[k].name.replace(/ /g, '');
const P = charts.map(c => M.careerProfile(c));
console.log(`차트 ${charts.length}개 × 12개 활동 분야`);

// 0. 범위·NaN·근거
let bad = 0, noReason = 0, noEx = 0;
P.forEach(p => {
  ok(p.categories.length === 12, '분야 수가 12가 아님');
  for (const c of p.categories) {
    for (const v of [c.score, c.activity, c.fit, c.sustainability, c.overload, c.burden, c.tenGodFit, c.elementFit, c.strengthFit, c.climateFit, c.styleFit]) if (!Number.isFinite(v) || v < 0 || v > 100) bad++;
    if (!c.reasons.length) noReason++; if (!c.examples.length) noEx++;
  }
  for (const e of p.envs) if (!Number.isFinite(e.burden) || e.burden < 0 || e.burden > 100) bad++;
  for (const k of Object.keys(p.workStyle)) if (!(p.workStyle[k].value >= 0 && p.workStyle[k].value <= 100)) bad++;
});
ok(bad === 0, `범위 밖·NaN ${bad}건`); ok(noReason / (P.length * 12) < 0.05, `근거가 빈 결과 ${noReason}건`); ok(noEx === 0, '직업 예시가 빈 분야가 있음');
console.log(`0. 범위·NaN 위반 ${bad}건 · 근거 빈 결과 ${(noReason / (P.length * 12) * 100).toFixed(1)}% · 예시 빈 분야 ${noEx}건`);

// 1. 업무 성향 축 분포
console.log('\n1. 업무 성향 6축 분포 (앞쪽 극의 값)');
for (const ax of M.CAREER_KEYS.length ? Object.keys(M.WORK_STYLE_AXES) : []) {
  const v = P.map(p => p.workStyle[ax].value), atLim = v.filter(x => x <= 6 || x >= 94).length / v.length;
  console.log('  ', (M.WORK_STYLE_AXES[ax].join('↔')).padEnd(10), `평균 ${mean(v).toFixed(0)} sd ${sd(v).toFixed(1)} p05 ${v.slice().sort((x, y) => x - y)[Math.floor(v.length * .05)]} p95 ${v.slice().sort((x, y) => x - y)[Math.floor(v.length * .95)]} 극단(≤6·≥94) ${(atLim * 100).toFixed(1)}%`);
  ok(sd(v) > 8, `${ax} 축 분포가 너무 좁음`); ok(atLim < 0.12, `${ax} 축이 양 끝에 몰림(${(atLim * 100).toFixed(0)}%)`);
}

// 2. 분야별 평균과 상위 3위 빈도
console.log('\n2. 분야별 평균 점수 · 1위 빈도 · 상위 3위 빈도 · 평균 부담도');
const top1 = {}, top3 = {}, avg = {}; K.forEach(k => { top1[k] = 0; top3[k] = 0; avg[k] = mean(P.map(p => p.byKey[k].score)); });
P.forEach(p => { top1[p.categories[0].category]++; p.categories.slice(0, 3).forEach(c => top3[c.category]++); });
for (const k of K.slice().sort((x, y) => avg[y] - avg[x])) console.log('  ', NAME(k).padEnd(9), `평균 ${avg[k].toFixed(1)}  sd ${sd(P.map(p => p.byKey[k].score)).toFixed(1)}  1위 ${(top1[k] / P.length * 100).toFixed(1)}%  상위3 ${(top3[k] / P.length * 100).toFixed(1)}%  부담 ${mean(P.map(p => p.byKey[k].burden)).toFixed(0)}`);
for (const k of K) { ok(top1[k] / P.length < 0.28, `${NAME(k)}가 1위에 ${(top1[k] / P.length * 100).toFixed(0)}% 나옴(편향)`); ok(top3[k] / P.length < 0.55, `${NAME(k)}가 상위 3위에 ${(top3[k] / P.length * 100).toFixed(0)}% 나옴(편향)`); ok(top3[k] / P.length > 0.03, `${NAME(k)}가 상위 3위에 거의 나오지 않음`); }
ok(Math.max(...K.map(k => avg[k])) - Math.min(...K.map(k => avg[k])) < 14, '분야 간 평균 점수 차이가 너무 큼(구조적 편향)');
ok(sd(P.map(p => p.categories[0].score)) > 4, '1위 점수가 거의 일정함');
const spread = mean(P.map(p => p.categories[0].score - p.categories[11].score));
console.log(`   사주 한 명 안에서 1위−12위 평균 격차 ${spread.toFixed(1)}점`); ok(spread > 15, '한 사주 안에서 분야 간 차이가 너무 작음');

// 3. 원국 유형 A~O
const G = c => c.weights.groups, top = p => p.categories[0].category;
const TYPES = {
  'A 극신약': c => c.strength.help < 25, 'B 신약': c => c.strength.help >= 25 && c.strength.help < 42, 'C 중화': c => c.strength.zone === '중화',
  'D 신강': c => c.strength.help >= 58 && c.strength.help < 72, 'E 극신강': c => c.strength.help >= 72,
  'F 식상 과다': c => G(c)[1] >= 32, 'G 재성 과다': c => G(c)[2] >= 32, 'H 관성 과다': c => G(c)[3] >= 32, 'I 인성 과다': c => G(c)[4] >= 32, 'J 비겁 과다': c => G(c)[0] >= 32,
  'K 오행 극단 과다': c => Math.max(...c.weights.pct) >= 45, 'L 오행 극단 부족': c => Math.min(...c.weights.pct) <= 2,
  'M 조후 편차 큼': c => Math.abs(c.climate.temp) >= 0.8 || Math.abs(c.climate.hum) >= 1.0,
  'N 억부=조후': c => { const j = c.yongAll.johu, e = c.yongAll.eokbu; return j.applicable && ['용신', '희신'].includes(e.roles[j.yong]); },
  'O 억부≠조후': c => { const j = c.yongAll.johu, e = c.yongAll.eokbu; return j.applicable && ['기신', '구신'].includes(e.roles[j.yong]); },
};
console.log('\n3. 원국 유형별 (표본 수 · 가장 많이 1위인 분야와 비율 · 상위 3개 평균 · 평균 과부하 · 평균 부담도)');
for (const [name, f] of Object.entries(TYPES)) {
  const idx = charts.map((c, i) => f(c) ? i : -1).filter(i => i >= 0);
  if (!idx.length) { console.log('  ', name.padEnd(14), '해당 사주 없음'); ok(false, `${name}: 표본 없음`); continue; }
  const cnt = {}; idx.forEach(i => cnt[top(P[i])] = (cnt[top(P[i])] || 0) + 1);
  const [mk, mv] = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0];
  const t3 = K.slice().sort((x, y) => mean(idx.map(i => P[i].byKey[y].score)) - mean(idx.map(i => P[i].byKey[x].score))).slice(0, 3).map(k => `${NAME(k)} ${mean(idx.map(i => P[i].byKey[k].score)).toFixed(0)}`).join(', ');
  console.log('  ', name.padEnd(14), String(idx.length).padStart(4) + '명', `1위 최빈 ${NAME(mk)} ${(mv / idx.length * 100).toFixed(0)}%`.padEnd(20), '|', t3.padEnd(34), '| 과부하', mean(idx.flatMap(i => P[i].categories.map(c => c.overload))).toFixed(0), '부담', mean(idx.flatMap(i => P[i].categories.map(c => c.burden))).toFixed(0));
  if (idx.length >= 15) ok(mv / idx.length < 0.6, `${name}: 한 분야가 1위의 ${(mv / idx.length * 100).toFixed(0)}%를 차지(단일 규칙 의심)`);
}

// 4. 십성·용신 한 가지가 결과를 결정하지 않는다
console.log('\n4. 단일 요인 결정력 점검');
['비겁', '식상', '재성', '관성', '인성'].forEach((nm, g) => {
  const idx = charts.map((c, i) => G(c)[g] >= 30 ? i : -1).filter(i => i >= 0), cnt = {}; idx.forEach(i => cnt[top(P[i])] = (cnt[top(P[i])] || 0) + 1);
  const [mk, mv] = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0] || ['-', 0];
  console.log(`   ${nm} 30%↑ ${String(idx.length).padStart(4)}명 → 1위 최빈 ${mk === '-' ? '-' : NAME(mk)} ${(mv / (idx.length || 1) * 100).toFixed(0)}%`);
  if (idx.length >= 15) ok(mv / idx.length < 0.55, `${nm} 많음 → ${NAME(mk)} 1위가 ${(mv / idx.length * 100).toFixed(0)}% (십성 하나가 결과를 결정)`);
});
for (let e = 0; e < 5; e++) {
  const idx = charts.map((c, i) => c.yongAll.eokbu.applicable && c.yongAll.eokbu.yong === e ? i : -1).filter(i => i >= 0), cnt = {}; idx.forEach(i => cnt[top(P[i])] = (cnt[top(P[i])] || 0) + 1);
  const [mk, mv] = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0] || ['-', 0];
  console.log(`   억부 용신 ${M.EL[e]} ${String(idx.length).padStart(4)}명 → 1위 최빈 ${mk === '-' ? '-' : NAME(mk)} ${(mv / (idx.length || 1) * 100).toFixed(0)}%`);
  if (idx.length >= 15) ok(mv / idx.length < 0.5, `용신 ${M.EL[e]} → ${NAME(mk)} 1위가 ${(mv / idx.length * 100).toFixed(0)}% (용신이 결과를 결정)`);
}
const domEl = c => c.weights.pct.indexOf(Math.max(...c.weights.pct));
for (let e = 0; e < 5; e++) {
  const idx = charts.map((c, i) => domEl(c) === e && c.weights.pct[e] >= 32 ? i : -1).filter(i => i >= 0), cnt = {}; idx.forEach(i => cnt[top(P[i])] = (cnt[top(P[i])] || 0) + 1);
  const [mk, mv] = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0] || ['-', 0];
  console.log(`   ${M.EL[e]} 32%↑ ${String(idx.length).padStart(4)}명 → 1위 최빈 ${mk === '-' ? '-' : NAME(mk)} ${(mv / (idx.length || 1) * 100).toFixed(0)}%`);
  if (idx.length >= 15) ok(mv / idx.length < 0.5, `${M.EL[e]} 많음 → ${NAME(mk)} 1위가 ${(mv / idx.length * 100).toFixed(0)}% (오행 하나가 결과를 결정)`);
}
// 점수가 한 십성 비율의 단순 함수가 아니다: 분야 점수와 가장 가까운 십성 비율의 상관이 과하지 않다
const gcorr = K.map(k => { const y = P.map(p => p.byKey[k].score); return [k, Math.max(...[0, 1, 2, 3, 4].map(g => Math.abs(corr(charts.map(c => G(c)[g]), y))))]; });
console.log('   분야 점수 ↔ 가장 가까운 십성 비율 |상관|:', gcorr.map(([k, r]) => `${NAME(k)} ${r.toFixed(2)}`).join(' · '));
gcorr.forEach(([k, r]) => ok(r < 0.85, `${NAME(k)} 점수가 십성 비율 하나와 상관 ${r.toFixed(2)}(단일 규칙 의심)`));

// 5. 과다는 활성도는 올리되 과부하·지속성에 반영된다 (식상·재성·관성 과다)
console.log('\n5. 과다·부족 처리 (해당 십성이 32%↑ vs 12~24%)');
[[1, '식상', 'creative'], [2, '재성', 'business'], [3, '관성', 'organization'], [4, '인성', 'research']].forEach(([g, nm, k]) => {
  const hi = charts.map((c, i) => G(c)[g] >= 32 ? i : -1).filter(i => i >= 0), mid = charts.map((c, i) => G(c)[g] >= 12 && G(c)[g] < 24 ? i : -1).filter(i => i >= 0);
  const f = (idx, key) => mean(idx.map(i => P[i].byKey[k][key]));
  console.log(`   ${nm} 과다→${NAME(k)}: 활성도 ${f(hi, 'activity').toFixed(0)} vs ${f(mid, 'activity').toFixed(0)} · 과부하 ${f(hi, 'overload').toFixed(0)} vs ${f(mid, 'overload').toFixed(0)} · 지속성 ${f(hi, 'sustainability').toFixed(0)} vs ${f(mid, 'sustainability').toFixed(0)} · 점수 ${f(hi, 'score').toFixed(0)} vs ${f(mid, 'score').toFixed(0)} (${hi.length}/${mid.length}명)`);
  if (hi.length >= 15) { ok(f(hi, 'activity') > f(mid, 'activity') + 8, `${nm} 과다: 활성도가 오르지 않음`); ok(f(hi, 'overload') > f(mid, 'overload') + 15, `${nm} 과다: 과부하가 오르지 않음`); ok(f(hi, 'sustainability') < f(mid, 'sustainability'), `${nm} 과다: 지속성이 낮아지지 않음`); ok(f(hi, 'score') < f(hi, 'activity'), `${nm} 과다: 점수가 활성도보다 낮아야 함`); }
});

{ const env = (idx) => mean(idx.map(i => P[i].envs.find(e => e.env === 'competition').burden));
  const hi = charts.map((c, i) => G(c)[0] >= 32 ? i : -1).filter(i => i >= 0), mid = charts.map((c, i) => G(c)[0] >= 12 && G(c)[0] < 24 ? i : -1).filter(i => i >= 0);
  console.log(`   비겁 과다→단기 경쟁 환경 부담 ${env(hi).toFixed(0)} vs ${env(mid).toFixed(0)}`); ok(env(hi) > env(mid) + 3, '비겁 과다: 경쟁 환경 부담이 오르지 않음'); }

// 6. 적성과 재물운은 다른 지표: 사업 적성과 (운 없이 계산한) 재물 활성도는 원국에서 분리
console.log('\n6. 운과의 분리');
const c1 = M.compute({ year: 1988, month: 3, day: 9, hour: 14, minute: 0, gender: 'F', calendar: 'solar', school: 'eokbu' });
const snapBefore = JSON.stringify(c1);
const p1 = JSON.stringify(M.careerProfile(c1));
ok(JSON.stringify(c1) === snapBefore, '직업 적성 계산이 chart 객체를 바꿈');
const c2 = M.compute({ year: 1988, month: 3, day: 9, hour: 14, minute: 0, gender: 'F', calendar: 'solar', school: 'eokbu' });
M.seunRange(c2, 2020, 2035).forEach(x => M.evaluateDomainLuck(c2, x, 'seun', { ms: x.midMs })); M.wolun(c2, 2026); M.ilun(c2, 2026, 5); c2.daeun.list.forEach(x => M.evaluateDomainLuck(c2, x, 'daeun', {}));
ok(JSON.stringify(M.careerProfile(c2)) === p1, '대운·세운·월운·일진 계산 후 기본 적성 점수가 달라짐');
const la = M.careerLuckActivation(c2, M.yearPillarOf(2027)), lb = M.careerLuckActivation(c2, M.yearPillarOf(2028));
ok(K.every(k => Number.isFinite(la[k])), '운 활성도가 숫자가 아님'); ok(JSON.stringify(la) !== JSON.stringify(lb), '연도가 달라도 운 활성도가 같음');
ok(JSON.stringify(M.careerProfile(c2)) === p1, '운 활성도 계산이 기본 적성 점수를 바꿈');
console.log('   기본 적성은 운 계산 전후 동일 · 운 활성도(careerLuckActivation)는 별도 값으로 분리됨');
const wcorr = corr(P.map(p => p.byKey.business.score), charts.map(c => M.evaluateDomainLuck(c, M.yearPillarOf(2027), 'seun', { ms: Date.UTC(2027, 5, 1) }).wealth.score));
console.log(`   사업·거래 적성 ↔ 2027년 재물운 상관 ${wcorr.toFixed(2)}`); ok(Math.abs(wcorr) < 0.5, '사업 적성과 재물운이 거의 같은 값');

// 7. 금지된 표현이 결과 문구에 없다
const banned = ['천직', '반드시', '하면 안', '성공하는', '실패하는', '안 맞는'];
const texts = P.slice(0, 300).flatMap(p => [...p.categories.flatMap(c => [...c.reasons, c.band]), ...p.envs.flatMap(e => [e.name, e.desc, ...e.why]), p.envSummary.text]);
const hit = texts.filter(t => banned.some(w => t.includes(w))); ok(!hit.length, `금지 표현: ${hit[0]}`);
console.log(`   금지 표현 ${hit.length}건`);

if (process.argv.includes('--json')) console.log(JSON.stringify(P[0], null, 1).slice(0, 1500));
console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + fails.join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
