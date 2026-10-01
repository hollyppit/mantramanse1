// 기회기(기회 활성도)와 시기 분류 검증
//   node tests/opportunity-sim.js [차트 수=300]
// 기회 활성도가 흐름 점수·변동성과 독립인지, 십성 종류별 기회 유형, 기회/확장/수확/축적/변동/방어 우선순위, 동반 신호 보존, 금지 표현을 단언으로 확인한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
vm.runInThisContext(html.slice(a, html.indexOf('\n', b)));
const M = globalThis.Manse;

const N = +process.argv[2] || 300;
let seed = 2024; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) { try { charts.push(M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' })); } catch (e) { /* 없는 날짜 */ } }
const fails = [], ok = (cond, msg) => { if (!cond) fails.push(msg); };
const mean = arr => arr.reduce((p, q) => p + q, 0) / (arr.length || 1);
const sd = arr => { const m = mean(arr); return Math.sqrt(mean(arr.map(x => (x - m) ** 2))); };
const corr = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sx = 0, sy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sx += (v - mx) ** 2; sy += (y[i] - my) ** 2; }); return sxy / Math.sqrt(sx * sy || 1); };
const dEl = c => M.stemEl(c.pillars.day.s), grpOf = (c, s) => (M.stemEl(s) - dEl(c) + 5) % 5;   // 0 비겁 1 식상 2 재성 3 관성 4 인성

// 전수: 차트 × 60갑자(세운 단위) + 일진 표본
const rows = [];
for (const c of charts) for (let y = 1984; y < 2044; y++) { const p = M.yearPillarOf(y), ev = M.evaluateLuck(c, p, 'seun'); rows.push({ c, p, ev, g: grpOf(c, p.s) }); }
console.log(`차트 ${charts.length}개 × 60갑자 = ${rows.length}건`);

// 0. 범위·필드·금지 표현
let bad = 0, nofield = 0; const banned = ['공격기', '공격일', '성공하는', '반드시 실행', '무조건'];
for (const r of rows) {
  const e = r.ev;
  if (!Number.isFinite(e.opportunityActivation) || e.opportunityActivation < 0 || e.opportunityActivation > 100) bad++;
  for (const k of ['opportunity', 'expansion', 'harvest', 'accumulation']) if (!(e.phaseScores[k] >= 0 && e.phaseScores[k] <= 100)) bad++;
  if (!Array.isArray(e.opportunityType) || !Array.isArray(e.opportunityReasons) || !Array.isArray(e.companions)) nofield++;
  if (!['기회기', '확장기', '수확기', '축적기'].includes(e.phase)) bad++;
  if (!e.overlays || typeof e.overlays.volatility.active !== 'boolean' || typeof e.overlays.defense.active !== 'boolean' || !e.flow || e.flow.primaryFlow !== ['opportunity', 'expansion', 'harvest', 'accumulation'][['기회', '확장', '수확', '축적'].indexOf(e.activityType)]) bad++;
  if (['기회', '확장', '수확', '축적'].indexOf(e.activityType) < 0) bad++;
  if (banned.some(w => (e.reasons.join('') + e.opportunityReasons.join('') + M.opportunityNote(e)).includes(w))) bad++;
}
ok(bad === 0, `범위·필드·표현 위반 ${bad}건`); ok(nofield === 0, '필수 필드 누락');
console.log(`0. 위반 ${bad}건 · 필드 누락 ${nofield}건`);

// 1. 분포와 독립성
const O = rows.map(r => r.ev.opportunityActivation), F = rows.map(r => r.ev.fitScore), V = rows.map(r => r.ev.volatilityScore);
const q = (arr, p) => arr.slice().sort((x, y) => x - y)[Math.floor(arr.length * p)];
console.log(`\n1. 기회 활성도 p05 ${q(O, .05)} p50 ${q(O, .5)} p95 ${q(O, .95)} sd ${sd(O).toFixed(1)}`);
const cf = corr(O, F), cv = corr(O, V);
console.log(`   상관: 기회↔흐름 점수 ${cf.toFixed(2)} · 기회↔변동성 ${cv.toFixed(2)}`);
ok(Math.abs(cf) < 0.3, `기회 활성도와 흐름 점수 상관이 큼(${cf.toFixed(2)}) — fit이 기회를 올리거나 그 반대`); ok(Math.abs(cv) < 0.3, `기회 활성도와 변동성 상관이 큼(${cv.toFixed(2)})`);
ok(sd(O) > 8, '기회 활성도 분포가 너무 좁음');
const quad = { 'HH': 0, 'HL': 0, 'LH': 0, 'LL': 0 }; rows.forEach(r => quad[(r.ev.opportunityActivation >= 60 ? 'H' : 'L') + (r.ev.fitScore >= 18 ? 'H' : 'L')]++);
console.log(`   기회 높음(≥60) × 순풍(fit≥18): 높음·순풍 ${quad.HH} · 높음·비순풍 ${quad.HL} · 낮음·순풍 ${quad.LH} · 낮음·비순풍 ${quad.LL}`);
ok(quad.HH > 0 && quad.HL > 0 && quad.LH > 0, '기회/흐름 점수의 조합이 모두 나오지 않음');
const hi = rows.filter(r => r.ev.opportunityActivation >= 60);
console.log(`   기회 높음 ${hi.length}건 중 condition 분포:`, ['순풍', '보통', '주의', '부담'].map(k => `${k} ${hi.filter(r => r.ev.condition === k).length}`).join(' '));
ok(['순풍', '보통', '주의', '부담'].filter(k => hi.some(r => r.ev.condition === k)).length >= 3, '기회 높음이 특정 condition에만 나옴');

// 2. 시기 분포
console.log('\n2. 대표 시기 분포'); const phc = {}; rows.forEach(r => phc[r.ev.phase] = (phc[r.ev.phase] || 0) + 1);
for (const [k, v] of Object.entries(phc).sort((x, y) => y[1] - x[1])) console.log('  ', k, (v / rows.length * 100).toFixed(1) + '%');
for (const k of ['기회기', '확장기', '수확기', '축적기']) ok((phc[k] || 0) / rows.length > 0.05, `${k}가 거의 나오지 않음`);
console.log('   overlay: +변동', (rows.filter(r => r.ev.overlays.volatility.active).length / rows.length * 100).toFixed(1) + '% · +방어', (rows.filter(r => r.ev.overlays.defense.active).length / rows.length * 100).toFixed(1) + '%');
ok((phc['기회기'] || 0) / rows.length < 0.4, '기회기가 40% 이상(편향)');

// 3. 시나리오 A~K
console.log('\n3. 시나리오');
const notDef = r => true;   // 변동·방어는 주 흐름을 덮어쓰지 않으므로 모든 운이 대상이다
const avgOf = (rs, f) => mean(rs.map(f));
// A/B: 비겁·식상 운 + fit 높음/낮음
const bs = rows.filter(r => r.g <= 1), A = bs.filter(r => r.ev.fitScore >= 18), B = bs.filter(r => r.ev.fitScore <= -12);
console.log(`   A 비겁·식상 운 + fit 높음 ${A.length}건: 기회기 ${(A.filter(r => r.ev.phase === '기회기').length / A.length * 100).toFixed(0)}% 기회 ${avgOf(A, r => r.ev.opportunityActivation).toFixed(0)}`);
console.log(`   B 비겁·식상 운 + fit 낮음 ${B.length}건: 기회 활성 ${avgOf(B, r => r.ev.opportunityActivation).toFixed(0)} · 주의/부담 ${(B.filter(r => ['주의', '부담'].includes(r.ev.condition)).length / B.length * 100).toFixed(0)}% · 기회기 ${B.filter(r => r.ev.phase === '기회기').length} · +변동 ${B.filter(r => r.ev.overlays.volatility.active).length} · +방어 ${B.filter(r => r.ev.overlays.defense.active).length}`);
ok(A.length > 20 && B.length > 20, 'A/B 표본 부족'); ok(A.some(r => r.ev.phase === '기회기'), 'A: 기회기 가능해야 함');
ok(avgOf(B, r => r.ev.opportunityActivation) > avgOf(rows, r => r.ev.opportunityActivation), 'B: 기회 활성이 평균보다 높아야 함');
ok(B.filter(r => r.ev.opportunityActivation >= 60 && ['주의', '부담'].includes(r.ev.condition)).length > 0, 'B: 기회는 높은데 주의/부담인 경우가 있어야 함');
// 종류
const TYPE_OF = { 0: '독립·협업·경쟁·인맥', 1: '창작·표현·생산·출시', 2: '사업·거래·재정 활동', 3: '직책·조직·사회적 역할', 4: '학습·자격·연구·지원' };
// 그 십성이 원국에 모자랄 때(15% 미만) 같은 십성 운이 오면 그 종류의 기회로 읽혀야 한다
const lead = (rs, g) => rs.filter(r => r.ev.opportunityActivation >= 40 && r.ev.opportunityType.includes(TYPE_OF[g]));
for (const [tag, g, nm] of [['C', 2, '재성 중심 새 거래 → 사업·거래'], ['D', 3, '관성 중심 새 직책 → 직책·사회활동'], ['E', 4, '인성 중심 → 학습·지원']]) {
  const pool = rows.filter(r => r.g === g && r.c.weights.groups[g] < 15), hit = lead(pool, g);
  console.log(`   ${tag} ${nm}: 해당 운 ${pool.length}건 중 기회 유형에 포함 ${hit.length}건 (${(hit.length / pool.length * 100).toFixed(0)}%) — 원국에 그 기운이 15% 미만일 때`);
  ok(pool.length > 20 && hit.length > pool.length * 0.4, `${tag}: ${TYPE_OF[g]} 유형이 충분히 나오지 않음`);
}
// 한 십성만으로 기회기가 결정되지 않는다
for (let g = 0; g < 5; g++) { const pool = rows.filter(r => r.g === g), opp = pool.filter(r => r.ev.phase === '기회기').length / pool.length; console.log(`   ${['비겁', '식상', '재성', '관성', '인성'][g]} 운의 기회기 비율 ${(opp * 100).toFixed(0)}%`); ok(opp < 0.75, `${g}번 십성 운이 기회기로 쏠림`); }
ok(rows.filter(r => r.g === 2 && r.ev.phase === '기회기').length > 0 && rows.filter(r => r.g === 3 && r.ev.phase === '기회기').length > 0 && rows.filter(r => r.g === 4 && r.ev.phase === '기회기').length > 0, '재성·관성·인성 운도 기회기가 될 수 있어야 함');
ok(rows.filter(r => r.g <= 1 && r.ev.phase !== '기회기' && notDef(r)).length > 0, '비겁·식상 운이라고 항상 기회기는 아님');
// F/G/H: 확장·수확·축적 우선
const F_ = rows.filter(r => notDef(r) && r.ev.phaseScores.expansion > r.ev.phaseScores.opportunity + 15), Gm = rows.filter(r => notDef(r) && r.ev.phaseScores.harvest > r.ev.phaseScores.opportunity + 15), H = rows.filter(r => notDef(r) && r.ev.phaseScores.accumulation > r.ev.phaseScores.opportunity + 15);
for (const [tag, pool, ph, nm] of [['F', F_, '확장기', '기존 활동만 커짐(새 신호 약함)'], ['G', Gm, '수확기', '결과 회수 신호 강함'], ['H', H, '축적기', '준비·기반 신호 강함']]) {
  const share = pool.filter(r => r.ev.phase === ph).length / (pool.length || 1);
  console.log(`   ${tag} ${nm}: ${pool.length}건 중 ${ph} ${(share * 100).toFixed(0)}% · 기회기 ${(pool.filter(r => r.ev.phase === '기회기').length / (pool.length || 1) * 100).toFixed(0)}%`);
  ok(pool.length > 20 && share > 0.5, `${tag}: ${ph} 우선이 아님(${(share * 100).toFixed(0)}%)`); ok(pool.every(r => r.ev.phase !== '기회기'), `${tag}: 새 활동 신호가 약한데 기회기로 판정`);
}
// 확장 vs 기회: 원국에 관성이 이미 많으면 관성 운은 확장 쪽, 원국에 관성이 거의 없으면 기회 쪽
const gan = rows.filter(r => r.g === 3), rich = gan.filter(r => r.c.weights.groups[3] >= 25), poor = gan.filter(r => r.c.weights.groups[3] < 10);
console.log(`   관성 운: 원국 관성 많음 ${rich.length}건 확장 ${avgOf(rich, r => r.ev.phaseScores.expansion).toFixed(0)}/기회 ${avgOf(rich, r => r.ev.opportunityActivation).toFixed(0)} · 원국 관성 적음 ${poor.length}건 확장 ${avgOf(poor, r => r.ev.phaseScores.expansion).toFixed(0)}/기회 ${avgOf(poor, r => r.ev.opportunityActivation).toFixed(0)}`);
ok(avgOf(rich, r => r.ev.phaseScores.expansion) > avgOf(poor, r => r.ev.phaseScores.expansion) + 8, '원국에 이미 있는 기운이 확장으로 읽히지 않음');
ok(avgOf(poor, r => r.ev.opportunityActivation) > avgOf(rich, r => r.ev.opportunityActivation) + 5, '원국에 모자란 기운이 기회로 읽히지 않음');
// I/J: 변동·방어는 overlay다 — 주 흐름은 사라지지 않는다
const I = rows.filter(r => r.ev.volatilityScore >= 55), J = rows.filter(r => r.ev.fitScore <= -20 && r.ev.intensityScore >= 50 && r.ev.volatilityScore < 55);
console.log(`   I 변동성 ≥55: ${I.length}건 모두 변동 overlay ${I.every(r => r.ev.overlays.volatility.active)} · 주 흐름 유지 ${I.every(r => r.ev.phase)} · J 부담+강도: ${J.length}건 평균 부담도 ${avgOf(J, r => r.ev.defenseLoad).toFixed(0)} (전체 ${avgOf(rows, r => r.ev.defenseLoad).toFixed(0)})`);
ok(I.every(r => r.ev.overlays.volatility.active && ['기회기', '확장기', '수확기', '축적기'].includes(r.ev.phase)), 'I: 변동성이 높은데 변동 overlay가 없거나 주 흐름이 사라짐');
ok(J.length > 20 && avgOf(J, r => r.ev.defenseLoad) > avgOf(rows, r => r.ev.defenseLoad) + 15, 'J: 부담이 크고 강도가 높은데 부담도가 높지 않음');
// K: 기회와 변동성이 모두 높을 때 정보 보존
const K = rows.filter(r => r.ev.opportunityActivation >= 60 && r.ev.volatilityScore >= 55);
console.log(`   K 기회≥60 & 변동성≥55: ${K.length}건, 대표 시기 ${Object.entries(K.reduce((m, r) => (m[r.ev.phase] = (m[r.ev.phase] || 0) + 1, m), {})).map(([k, v]) => k + ' ' + v).join(' ')}`);
ok(K.length > 10, 'K: 표본 부족');
ok(K.every(r => r.ev.phaseScores.volatility === Math.round(r.ev.volatilityScore) && r.ev.phaseScores.opportunity === r.ev.opportunityActivation), 'K: 두 값이 함께 보존되지 않음');
ok(K.filter(r => r.ev.phase !== '기회기').every(r => r.ev.companions.some(c => c.key === 'opportunity')), 'K: 기회 활성도가 동반 신호로 남지 않음');
ok(K.every(r => r.ev.overlays.volatility.active), 'K: 변동 overlay가 붙지 않음');

// 4. fit·변동성을 바꾸지 않는다: 기존 값은 회귀 스냅샷이 담당하고, 여기서는 같은 운을 두 번 계산해 결정적임을 확인
const c0 = charts[0], p0 = M.yearPillarOf(2027);
ok(JSON.stringify(M.evaluateLuck(c0, p0, 'seun')) === JSON.stringify(M.evaluateLuck(c0, p0, 'seun')), '같은 입력의 결과가 다름');

// 5. 일진·월운·대운에서도 같은 체계
let dOK = 0, dBad = 0;
for (const c of charts.slice(0, 30)) { for (const x of M.ilun(c, 2026, 5)) { (['기회기', '확장기', '수확기', '축적기'].includes(x.ev.phase) && Number.isFinite(x.ev.opportunityActivation)) ? dOK++ : dBad++; } for (const x of c.daeun.list) (x.ev.phase && Number.isFinite(x.ev.opportunityActivation)) ? dOK++ : dBad++; for (const x of M.wolun(c, 2026)) (x.ev.phase && Number.isFinite(x.ev.opportunityActivation)) ? dOK++ : dBad++; }
console.log(`\n5. 일진·월운·대운 ${dOK}건 정상 · 비정상 ${dBad}건`); ok(dBad === 0, '일진·월운·대운에서 시기·기회 활성도 누락');

console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + fails.join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
