// 분야별 지수(애정·재물·건강·사고수) 검증
//   node tests/domain-sim.js [차트 수=400]
// 원국 유형 A~L, 운 시나리오, 지표 간 독립성, 금지된 단일 규칙 부재, 상위 운 결합을 단언으로 확인한다. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
vm.runInThisContext(html.slice(a, html.indexOf('\n', b)));
const M = globalThis.Manse;

const N = +process.argv[2] || 400;
let seed = 31337; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) {
  try { charts.push(M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' })); } catch (e) { /* 없는 날짜 */ }
}
const pillars = []; for (let Y = 1984; Y < 2044; Y++) pillars.push(M.yearPillarOf(Y));
const MS = Date.UTC(2026, 5, 1);
const fails = [], ok = (cond, msg) => { if (!cond) fails.push(msg); };
const mean = arr => arr.reduce((p, q) => p + q, 0) / (arr.length || 1);
const sd = arr => { const m = mean(arr); return Math.sqrt(mean(arr.map(x => (x - m) ** 2))); };
const corr = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sx = 0, sy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sx += (v - mx) ** 2; sy += (y[i] - my) ** 2; }); return sxy / Math.sqrt(sx * sy); };
const K = M.DOMAIN_KEYS;

// ── 전수 계산
const rows = [];
for (const c of charts) for (const p of pillars) {
  const dm = M.evaluateDomainLuck(c, p, 'seun', { ms: MS }), F = M.extractLuckFeatures(c, p, 'seun');
  rows.push({ c, p, dm, F, ev: F.ev });
}
console.log(`차트 ${charts.length}개 × 60갑자(세운) = ${rows.length}건`);

// 0. 범위·NaN·근거
let nanBad = 0, noReason = 0;
for (const r of rows) for (const k of K) {
  const x = r.dm[k];
  if (!Number.isFinite(x.score) || x.score < 0 || x.score > 100 || !x.band) nanBad++;
  for (const v of Object.values(x.components)) if (!Number.isFinite(v) || v < -0.001 || v > 100.001) nanBad++;
  if (!x.reasons.length) noReason++;
}
ok(nanBad === 0, `범위 밖·NaN ${nanBad}건`);
console.log(`0. 범위·NaN 위반 ${nanBad}건 · 근거(reasons)가 빈 경우 ${(noReason / (rows.length * 4) * 100).toFixed(1)}%`);
ok(noReason / (rows.length * 4) < 0.25, '근거가 빈 결과가 너무 많음');

// 1. 지표별 분포와 독립성
console.log('\n1. 지표 분포(p05/p50/p95)와 상관');
const vals = {}; for (const k of K) vals[k] = rows.map(r => r.dm[k].score);
const q = (arr, p) => arr.slice().sort((x, y) => x - y)[Math.floor(arr.length * p)];
for (const k of K) console.log('  ', k.padEnd(9), q(vals[k], .05), q(vals[k], .5), q(vals[k], .95), `sd ${sd(vals[k]).toFixed(1)}`);
for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
  const r = corr(vals[K[i]], vals[K[j]]);
  console.log(`   상관 ${K[i]}↔${K[j]} ${r.toFixed(2)}`);
  ok(Math.abs(r) < 0.7, `지표 ${K[i]}↔${K[j]} 상관이 너무 큼(${r.toFixed(2)}) — 같은 숫자를 복사하는 구조 의심`);
}
for (const k of K) ok(sd(vals[k]) > 6, `${k} 분포가 너무 좁음(sd ${sd(vals[k]).toFixed(1)})`);

// 2. 원국 유형 A~L
const TYPES = {
  'A 극신약': c => c.strength.help < 25, 'B 신약': c => c.strength.help >= 25 && c.strength.help < 42, 'C 중화': c => c.strength.zone === '중화',
  'D 신강': c => c.strength.help >= 58 && c.strength.help < 72, 'E 극신강': c => c.strength.help >= 72,
  'F 오행 극단 과다': c => Math.max(...c.weights.pct) >= 45, 'G 오행 극단 부족': c => Math.min(...c.weights.pct) <= 2,
  'H 한기 강함': c => c.climate.temp <= -0.7, 'I 열기 강함': c => c.climate.temp >= 0.7, 'J 조·습 편차': c => Math.abs(c.climate.hum) >= 0.9,
  'K 억부=조후': c => { const j = c.yongAll.johu, e = c.yongAll.eokbu; return j.applicable && ['용신', '희신'].includes(e.roles[j.yong]); },
  'L 억부≠조후': c => { const j = c.yongAll.johu, e = c.yongAll.eokbu; return j.applicable && ['기신', '구신'].includes(e.roles[j.yong]); },
};
console.log('\n2. 원국 유형별 평균(애정·재물·건강·사고수) · 표본 수');
for (const [name, f] of Object.entries(TYPES)) {
  const rs = rows.filter(r => f(r.c));
  if (!rs.length) { console.log('  ', name.padEnd(14), '해당 사주 없음'); ok(false, `${name}: 표본 없음`); continue; }
  const m = K.map(k => mean(rs.map(r => r.dm[k].score)));
  console.log('  ', name.padEnd(14), String(rs.length / 60).padStart(3) + '명', m.map(x => x.toFixed(0).padStart(3)).join(' '));
  K.forEach((k, i) => ok(sd(rs.map(r => r.dm[k].score)) > 3, `${name}: ${k} 점수가 거의 일정함`));
}
// 방향성 점검
const cold = rows.filter(r => TYPES['H 한기 강함'](r.c)), hot = rows.filter(r => TYPES['I 열기 강함'](r.c));
const fire = r => r.F.elv[1] >= 0.4, water = r => r.F.elv[4] >= 0.4;
console.log('\n   조후 방향: 한기 사주 — 화 강한 운 건강 조후 균형', mean(cold.filter(fire).map(r => r.dm.health.components.climate)).toFixed(0), 'vs 수 강한 운', mean(cold.filter(water).map(r => r.dm.health.components.climate)).toFixed(0));
ok(mean(cold.filter(fire).map(r => r.dm.health.components.climate)) > mean(cold.filter(water).map(r => r.dm.health.components.climate)), '한기 사주에서 화 운이 수 운보다 조후 균형이 높지 않음');
ok(mean(hot.filter(water).map(r => r.dm.health.components.climate)) > mean(hot.filter(fire).map(r => r.dm.health.components.climate)), '열기 사주에서 수 운이 화 운보다 조후 균형이 높지 않음');

// 3. 운 시나리오 — 재물
const has = (r, gi, th) => r.F.g[gi] >= th;
const wSet = {
  '재성 강함': rows.filter(r => has(r, 2, 0.55)),
  '식상+재성': rows.filter(r => has(r, 1, 0.3) && has(r, 2, 0.3)),
  '비겁+재성': rows.filter(r => has(r, 0, 0.3) && has(r, 2, 0.3)),
};
console.log('\n3. 재물 시나리오(평균 활동/적합/안정/변동)');
for (const [n, rs] of Object.entries(wSet)) { console.log('  ', n.padEnd(10), String(rs.length).padStart(5), ['activity', 'fit', 'stability', 'volatility'].map(c => mean(rs.map(r => r.dm.wealth.components[c])).toFixed(0).padStart(4)).join(' ')); ok(rs.length > 20, `재물 시나리오 ${n}: 표본 부족`); }
const allActivity = mean(rows.map(r => r.dm.wealth.components.activity));
ok(mean(wSet['재성 강함'].map(r => r.dm.wealth.components.activity)) > allActivity + 15, '재성 강한 운의 재정 활동성이 평균보다 충분히 높지 않음');
ok(mean(wSet['식상+재성'].map(r => r.dm.wealth.components.activity)) > allActivity + 15, '식상+재성 운의 재정 활동성이 평균보다 충분히 높지 않음');
// 재성이 강해도 점수를 크게 올리지 않는다: 활동성과 적합도가 갈라진다
const weakBig = wSet['재성 강함'].filter(r => r.F.weak > 0.5), strongBig = wSet['재성 강함'].filter(r => r.F.strong > 0.5);
console.log(`   재성 강함 · 원국 약함 ${weakBig.length}건 적합도 ${mean(weakBig.map(r => r.dm.wealth.components.fit)).toFixed(0)} vs 원국 강함 ${strongBig.length}건 ${mean(strongBig.map(r => r.dm.wealth.components.fit)).toFixed(0)}`);
ok(mean(weakBig.map(r => r.dm.wealth.components.fit)) < mean(strongBig.map(r => r.dm.wealth.components.fit)) - 5, '재성 강함: 약한 원국의 재정 적합도가 강한 원국보다 낮지 않음(감당 여부 미반영)');
ok(mean(wSet['비겁+재성'].map(r => r.dm.wealth.components.volatility)) > mean(wSet['식상+재성'].map(r => r.dm.wealth.components.volatility)), '비겁+재성이 식상+재성보다 재정 변동성이 높지 않음');
const r2 = rows.map(r => r.F.g[2]), ws = vals.wealth;
console.log(`   재성 끌어옴 ↔ 재물 점수 상관 ${corr(r2, ws).toFixed(2)} · 재성 강한 운 재물 점수 sd ${sd(wSet['재성 강함'].map(r => r.dm.wealth.score)).toFixed(1)}`);
ok(corr(r2, ws) < 0.6, '재성만으로 재물 점수가 결정됨(단일 규칙 의심)');
ok(sd(wSet['재성 강함'].map(r => r.dm.wealth.score)) > 8, '재성 강한 운의 재물 점수가 거의 같음');

// 4. 애정 시나리오
const spHap = rows.filter(r => r.F.spouse.bond > 0.5 && r.F.spouse.tension < 0.2), spClash = rows.filter(r => r.F.spouse.clash > 0.5), spNone = rows.filter(r => !r.F.spouse.rels.length);
const both = rows.filter(r => r.F.spouse.bond > 0.5 && r.F.spouse.tension > 0.5);
const avg = (rs, c) => mean(rs.map(r => r.dm.love.components[c]));
console.log('\n4. 애정 시나리오(평균 활동/적합/안정/변동)');
for (const [n, rs] of [['배우자궁 합', spHap], ['배우자궁 충', spClash], ['합+충 동시', both], ['배우자궁 무관계', spNone]]) console.log('  ', n.padEnd(12), String(rs.length).padStart(5), ['activity', 'fit', 'stability', 'volatility'].map(c => avg(rs, c).toFixed(0).padStart(4)).join(' '));
ok(spHap.length > 20 && spClash.length > 20 && both.length > 5, '애정 시나리오 표본 부족');
ok(avg(spClash, 'activity') > avg(spNone, 'activity') + 10, '배우자궁 충: 관계 활성도가 오르지 않음');
ok(avg(spClash, 'volatility') > avg(spNone, 'volatility') + 15, '배우자궁 충: 관계 변동성이 오르지 않음');
ok(avg(spClash, 'stability') < avg(spNone, 'stability') - 15, '배우자궁 충: 관계 안정성이 내려가지 않음');
ok(avg(spHap, 'activity') > avg(spNone, 'activity') + 10 && avg(spHap, 'stability') > avg(spClash, 'stability') + 20, '배우자궁 합: 활성도는 오르고 안정성은 충보다 높아야 함');
ok(Math.abs(mean(spClash.map(r => r.dm.love.score)) - mean(spNone.map(r => r.dm.love.score))) < 25 && spClash.some(r => r.dm.love.score >= 55) && spClash.some(r => r.dm.love.score < 45), '배우자궁 충이 점수를 일률적으로 낮추거나 올림(충=이별 식 규칙 의심)');
ok(spHap.some(r => r.dm.love.score < 50) && spHap.some(r => r.dm.love.score >= 60), '배우자궁 합이 점수를 일률적으로 정함(합=연애 성공 식 규칙 의심)');
// 성별과 무관한 활성도: 남녀 모두 재성·관성 활성이 활동성에 기여
const men = rows.filter(r => r.c.gender === 'M' && r.F.g[3] >= 0.55), women = rows.filter(r => r.c.gender === 'F' && r.F.g[2] >= 0.55);
const flat = rows.filter(r => r.F.g[2] < 0.15 && r.F.g[3] < 0.15);
console.log(`   성별 무관 활성: 남성+관성 강함 ${men.length}건 활동성 ${avg(men, 'activity').toFixed(0)} · 여성+재성 강함 ${women.length}건 ${avg(women, 'activity').toFixed(0)} · 재관 약함 ${avg(flat, 'activity').toFixed(0)}`);
ok(avg(men, 'activity') > avg(flat, 'activity') + 5 && avg(women, 'activity') > avg(flat, 'activity') + 5, '재성·관성이 성별과 무관하게 관계 활성도에 기여하지 않음');

// 5. 사고수·변동성
const volHi = rows.filter(r => r.ev.volatilityScore >= 70), acc = r => r.dm.accident.score;
const rel3 = rows.filter(r => r.F.tensionRels.filter(x => x.type === '형' || x.type === '파' || x.type === '해').length >= 2);
const rel1 = rows.filter(r => r.F.tensionRels.length === 1 && r.F.tensionRels[0].type === '형');
console.log(`\n5. 사고수 — 변동성 70↑ ${volHi.length}건 평균 ${mean(volHi.map(acc)).toFixed(0)} · 전체 평균 ${mean(rows.map(acc)).toFixed(0)}`);
console.log(`   형·파·해 2개↑ ${rel3.length}건 충돌 ${mean(rel3.map(r => r.dm.accident.components.conflict)).toFixed(0)} vs 형 하나 ${rel1.length}건 ${mean(rel1.map(r => r.dm.accident.components.conflict)).toFixed(0)}`);
ok(mean(rel3.map(r => r.dm.accident.components.conflict)) > mean(rel1.map(r => r.dm.accident.components.conflict)), '형·파·해 중첩이 하나일 때보다 충돌 신호가 높지 않음');
ok(volHi.some(r => acc(r) < 40), '변동성만 높아도 사고수가 오르는 구조(변동성 단독 규칙 의심)');
ok(volHi.some(r => acc(r) >= 60), '변동성 + 충돌 + 부담이 겹쳐도 사고수가 오르지 않음');
const tw = rows.filter(r => r.ev.volatilityScore >= 60 && r.dm.accident.components.conflict >= 60 && r.dm.accident.components.instability >= 30);
ok(mean(tw.map(acc)) > mean(volHi.map(acc)) + 5, '여러 신호 중첩이 변동성 높은 운 평균보다 사고수가 높지 않음');
// 충·형 단독 규칙 부재
const clash1 = rows.filter(r => r.F.tensionRels.some(x => x.type === '충')), xing = rows.filter(r => r.F.tensionRels.some(x => x.type === '형'));
console.log(`   충 있음 ${clash1.length}건 사고수 sd ${sd(clash1.map(acc)).toFixed(1)} · 사고수<40인 비율 ${(clash1.filter(r => acc(r) < 40).length / clash1.length * 100).toFixed(0)}%`);
ok(clash1.some(r => acc(r) < 30) && clash1.some(r => acc(r) >= 55), '충이 있다고 사고수가 일률적으로 정해짐');
ok(xing.some(r => acc(r) < 30), '형이 있으면 사고수가 반드시 높아짐(단일 규칙 의심)');
// 신살만 강한 경우
const sinOnly = rows.filter(r => r.dm.accident.components.sinsal >= 40 && r.dm.accident.components.conflict < 25 && r.dm.accident.components.overload < 25 && r.dm.accident.components.instability < 25);
console.log(`   신살만 강함 ${sinOnly.length}건 사고수 평균 ${mean(sinOnly.map(acc)).toFixed(0)} 최대 ${Math.max(...sinOnly.map(acc), 0)}`);
ok(sinOnly.length > 0 && Math.max(...sinOnly.map(acc)) < 45, '신살만 강한 경우 사고수가 크게 오름');
ok(M.ACCIDENT_CONFIG.weights.sinsal <= 0.1, '신살 가중치가 10%를 넘음');
// 삼재 독립: 도메인 코드에 삼재 참조가 없어야 한다
const code = html.slice(html.indexOf('분야별 지수: 애정운'), html.indexOf('  G.Manse = {')).split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
ok(!/samjae|getSamjae|삼재/i.test(code), '분야별 지수 코드가 삼재를 참조함');

// 6. 요구된 조합이 모두 가능한가
console.log('\n6. 조합 가능 여부');
const combos = {
  '애정 높음 + 변동성 높음': r => r.dm.love.score >= 60 && r.dm.love.components.volatility >= 60,
  '재물 높음 + 재정 안정성 낮음': r => r.dm.wealth.score >= 60 && r.dm.wealth.components.stability < 50,
  '건강 균형 낮음 + 사고수 낮음': r => r.dm.health.score < 45 && r.dm.accident.score < 30,
  '건강 균형 높음 + 사고수 높음': r => r.dm.health.score >= 65 && r.dm.accident.score >= 55,
  '전체 흐름 높음 + 사고수 높음': r => r.ev.fitScore >= 18 && r.dm.accident.score >= 55,
  '전체 흐름 낮음 + 사고수 낮음': r => r.ev.fitScore <= -12 && r.dm.accident.score < 30,
};
for (const [n, f] of Object.entries(combos)) { const c = rows.filter(f).length; console.log('  ', n.padEnd(20), c, '건'); ok(c > 0, `조합 불가: ${n}`); }
const wealthEx = rows.find(r => r.dm.wealth.components.activity >= 75 && r.dm.wealth.components.fit < 50 && r.dm.wealth.components.volatility >= 55);
ok(!!wealthEx, '재물: 활동성 높음 + 적합도·안정성 낮음 + 변동성 높음 조합이 없음');
if (wealthEx) console.log('   예시:', wealthEx.dm.wealth.summary, JSON.stringify(Object.fromEntries(Object.entries(wealthEx.dm.wealth.components).map(([k, v]) => [k, Math.round(v)]))));

// 7. 시간 단위별 엔진·상위 운 결합
console.log('\n7. 대운·세운·월운·일진');
const c0 = charts[0], p0 = pillars[30];
const lv = {};
for (const level of ['daeun', 'seun', 'wolun', 'ilun', 'iljin']) lv[level] = M.evaluateDomainLuck(c0, p0, level, { ms: MS });
for (const level of ['daeun', 'seun', 'wolun', 'ilun']) {
  const w = lv[level].chain.reduce((s, x) => s + x.weight, 0);
  console.log('  ', level.padEnd(6), '체인', lv[level].chain.map(x => `${x.level}:${x.ganzhi}(${Math.round(x.weight * 100)}%)`).join(' → '), `합 ${w.toFixed(2)}`);
  ok(Math.abs(w - 1) < 1e-9, `${level}: 체인 가중치 합이 1이 아님`);
}
ok(lv.daeun.chain.length === 1 && lv.seun.chain.length === 2 && lv.wolun.chain.length === 3 && lv.ilun.chain.length === 4, '상위 운 체인 길이가 어긋남');
ok(JSON.stringify(lv.iljin.love.components) === JSON.stringify(lv.ilun.love.components), 'iljin이 ilun과 다름');
// 상위 운이 없을 때와 있을 때가 다르되 점수가 폭증하지 않는다
const solo = M.evaluateDomainLuck(c0, p0, 'ilun'), chained = lv.ilun;
console.log('   일진 단독 vs 대운·세운·월운 결합 — 애정', solo.love.score, '→', chained.love.score, '· 사고수', solo.accident.score, '→', chained.accident.score);
let maxJump = 0; for (const r of rows.slice(0, 600)) { const s1 = M.evaluateDomainLuck(r.c, r.p, 'ilun'), s2 = M.evaluateDomainLuck(r.c, r.p, 'ilun', { ms: MS }); for (const k of K) { maxJump = Math.max(maxJump, Math.abs(s1[k].score - s2[k].score)); ok(s2[k].score >= 0 && s2[k].score <= 100, '결합 후 범위 밖'); } }
console.log(`   상위 운 결합으로 인한 최대 점수 변화 ${maxJump}`);
ok(maxJump < 45, '상위 운 결합으로 점수가 과도하게 변함');
// 시간 단위가 짧을수록 자체 비중이 크다
const W = M.DOMAIN_LEVEL_WEIGHTS; ok(W.daeun.self === 1 && W.seun.self < 1 && W.ilun.self >= 0.5, 'DOMAIN_LEVEL_WEIGHTS 구조 오류');
// 이 운 자체 신호의 비중: 일진의 자체 비중이 세운보다 낮지 않아야 하며(짧을수록 자체 중심), 상위 운 총합은 일진이 가장 커도 40%를 넘지 않는다
const chainSum = l => Object.values(W[l].chain).reduce((s, x) => s + x, 0);
ok(chainSum('ilun') <= 0.4 && chainSum('wolun') <= 0.4, '상위 운 비중이 40%를 넘음');
// 원본 객체가 바뀌지 않는다
const beforeF = JSON.stringify(c0.strength), beforeY = JSON.stringify(c0.yongAll.eokbu.roles); M.evaluateDomainLuck(c0, p0, 'seun', { ms: MS });
ok(JSON.stringify(c0.strength) === beforeF && JSON.stringify(c0.yongAll.eokbu.roles) === beforeY, '분야별 계산이 원국 객체를 변경함');

if (fails.length) { console.log('\n실패', fails.length, '건'); fails.forEach(x => console.log(' ', x)); process.exit(1); }
console.log('\n모든 검증 통과');
