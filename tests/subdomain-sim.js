// 분야별 지수 확장(취업운·이직운·직업운·사업운·자식운) 검증
//   node tests/subdomain-sim.js [차트 수=300]
// 범위·NaN·근거, 분포·지표 간 독립성, 성별·시주 미상 처리, 상위 운 결합, 기존 네 지수 불변을 단언한다. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
const a = src.indexOf('var MANSE_DATA'), b = src.indexOf('})(typeof window', a);
vm.runInThisContext(src.slice(a, src.indexOf('\n', b)));
const M = globalThis.Manse;

const N = +process.argv[2] || 300;
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) {
  try { charts.push(M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: charts.length % 10 === 0 ? '' : Math.floor(rnd() * 24), minute: 0, gender: charts.length % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' })); } catch (e) { }
}
const pillars = []; for (let Y = 1984; Y < 2044; Y++) pillars.push(M.yearPillarOf(Y));
const MS = Date.UTC(2026, 5, 1);
const fails = [], ok = (cond, msg) => { if (!cond) fails.push(msg); };
const mean = arr => arr.reduce((p, q) => p + q, 0) / (arr.length || 1);
const sd = arr => { const m = mean(arr); return Math.sqrt(mean(arr.map(x => (x - m) ** 2))); };
const corr = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sx = 0, sy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sx += (v - mx) ** 2; sy += (y[i] - my) ** 2; }); return sxy / Math.sqrt(sx * sy); };
const q = (arr, p) => arr.slice().sort((x, y) => x - y)[Math.floor(arr.length * p)];
const OLD = M.DOMAIN_KEYS, SUB = M.SUB_DOMAIN_KEYS;
ok(JSON.stringify(SUB) === JSON.stringify(['job', 'move', 'career', 'business', 'child', 'marriage', 'noble', 'study', 'estate', 'social', 'family']), '확장 지표 키 목록이 다름');
ok(JSON.stringify(OLD) === JSON.stringify(['love', 'wealth', 'health', 'accident']), '기존 지표 키 목록이 바뀜');

// 0. 기존 네 지수가 확장 계산 전후로 같은 값인가(읽기만 하는 계층)
const c0 = charts[1], p0 = pillars[20];
const before = JSON.stringify(OLD.map(k => M.evaluateDomainLuck(c0, p0, 'seun', { ms: MS })[k].score));
SUB.forEach(k => M.evaluateDomainLuck(c0, p0, 'seun', { ms: MS })[k]);
ok(JSON.stringify(OLD.map(k => M.evaluateDomainLuck(c0, p0, 'seun', { ms: MS })[k].score)) === before, '확장 지표 계산이 기존 지수를 바꿈');
ok(Object.keys(M.evaluateDomainLuck(c0, p0, 'seun', { ms: MS })).every(k => !SUB.includes(k)), '확장 지표가 열거 대상에 노출됨');

// 1. 전수 계산: 범위·NaN·근거·구성 성분
const rows = [];
for (const c of charts) for (const p of pillars) rows.push({ c, p, dm: M.evaluateDomainLuck(c, p, 'seun', { ms: MS }) });
console.log(`차트 ${charts.length}개 × 60갑자(세운) = ${rows.length}건`);
let bad = 0, noReason = 0;
for (const r of rows) for (const k of SUB) {
  const x = r.dm[k];
  if (!Number.isFinite(x.score) || x.score < 0 || x.score > 100 || !x.band || !x.summary) bad++;
  for (const v of Object.values(x.components)) if (!Number.isFinite(v) || v < -0.001 || v > 100.001) bad++;
  if (x.parts.length !== 4 || x.parts.some(pt => !pt.label || !Number.isFinite(pt.v))) bad++;
  if (!x.reasons.length) noReason++;
}
ok(bad === 0, `범위·NaN·구성 위반 ${bad}건`);
ok(noReason / (rows.length * SUB.length) < 0.2, `근거가 빈 결과 ${(noReason / (rows.length * SUB.length) * 100).toFixed(1)}%`);
console.log(`1. 범위·NaN 위반 ${bad}건 · 근거 없음 ${(noReason / (rows.length * SUB.length) * 100).toFixed(1)}%`);

// 2. 분포·독립성
const vals = {}; [...OLD, ...SUB].forEach(k => { vals[k] = rows.map(r => r.dm[k].score); });
console.log('\n2. 분포(p05/p50/p95)');
for (const k of SUB) {
  console.log('  ', k.padEnd(9), q(vals[k], .05), q(vals[k], .5), q(vals[k], .95), `sd ${sd(vals[k]).toFixed(1)}`);
  ok(sd(vals[k]) > 6, `${k} 분포가 너무 좁음`); ok(q(vals[k], .5) > 42 && q(vals[k], .5) < 62, `${k} 중앙값이 눈금 중앙에서 멀다(${q(vals[k], .5)})`);
  ok(q(vals[k], .95) - q(vals[k], .05) >= 18, `${k} p05~p95 폭이 좁음`);
}
for (const s of SUB) for (const o of [...OLD, ...SUB]) if (s < o || OLD.includes(o)) {
  if (s === o) continue; const r = corr(vals[s], vals[o]);
  ok(Math.abs(r) < 0.7, `${s}↔${o} 상관이 너무 큼(${r.toFixed(2)}) — 같은 숫자를 복사하는 구조 의심`);
}
console.log('   상관 사업↔재물 ' + corr(vals.business, vals.wealth).toFixed(2) + ' · 취업↔직업 ' + corr(vals.job, vals.career).toFixed(2));

// 3. 시주 미상·성별: 시주를 모르면 자녀궁 근거를 쓰지 않고, 남녀는 자식성이 다르다
const noHour = rows.filter(r => !r.c.hourKnown), withHour = rows.filter(r => r.c.hourKnown);
ok(noHour.length > 0 && noHour.every(r => !r.dm.child.reasons.some(t => t.includes('자녀궁:'))), '시주 미상인데 자녀궁 근거가 나옴');
ok(noHour.some(r => r.dm.child.reasons.some(t => t.includes('시각을 몰라'))), '시주 미상 안내 문구가 없음');
ok(withHour.some(r => r.dm.child.reasons.some(t => t.includes('자녀궁:'))), '시주가 있는데 자녀궁 근거가 한 번도 안 나옴');
const mText = rows.filter(r => r.c.gender === 'M').flatMap(r => r.dm.child.reasons).filter(t => t.includes('기운(자식성)')), fText = rows.filter(r => r.c.gender === 'F').flatMap(r => r.dm.child.reasons).filter(t => t.includes('기운(자식성)'));
ok(mText.every(t => t.includes('관성')) && fText.every(t => t.includes('식상')), '자식성이 성별(남 관성·여 식상)과 다름');
console.log(`\n3. 시주 미상 ${noHour.length}건 · 자식성 근거 남 ${mText.length}/여 ${fText.length}건`);

// 4. 단일 규칙 금지: 한 십성이 많다고 점수가 곧바로 최고가 되지 않는다
const byOfficer = rows.map(r => ({ g: M.extractLuckFeatures(r.c, r.p, 'seun').g[3], job: r.dm.job.score }));
const strongOfficer = byOfficer.filter(x => x.g >= 0.7), weakJob = strongOfficer.filter(x => x.job < 55).length;
ok(strongOfficer.length > 20, '관성 강입 사례가 너무 적어 검증 불가'); ok(weakJob / strongOfficer.length > 0.15, '관성이 강하면 취업운이 거의 항상 높음 — 단일 규칙 의심');
console.log(`4. 관성 강입 ${strongOfficer.length}건 중 취업운 55 미만 ${weakJob}건`);

// 5. 상위 운 결합·시간 단위
const lv = {}; for (const level of ['daeun', 'seun', 'wolun', 'ilun', 'iljin']) lv[level] = M.evaluateDomainLuck(c0, p0, level, { ms: MS });
for (const level of Object.keys(lv)) for (const k of SUB) ok(lv[level][k].score >= 0 && lv[level][k].score <= 100 && lv[level][k].reasons, `${level} ${k} 범위 오류`);
ok(lv.ilun.chainNote.includes('세운'), '일진이 상위 운을 결합하지 않음');
let maxJump = 0; for (const r of rows.slice(0, 400)) { const s1 = M.evaluateDomainLuck(r.c, r.p, 'ilun'), s2 = M.evaluateDomainLuck(r.c, r.p, 'ilun', { ms: MS }); for (const k of SUB) maxJump = Math.max(maxJump, Math.abs(s1[k].score - s2[k].score)); }
ok(maxJump < 45, `상위 운 결합 전후 변화가 과도함(${maxJump})`);
console.log(`5. 상위 운 결합 전후 최대 변화 ${maxJump}`);

// 6. 원국 불변·결정성
const snap = JSON.stringify([c0.strength, c0.yongAll.eokbu.roles, c0.weights.pct]);
SUB.forEach(k => M.evaluateDomainLuck(c0, p0, 'daeun', {})[k]);
ok(JSON.stringify([c0.strength, c0.yongAll.eokbu.roles, c0.weights.pct]) === snap, '확장 지표 계산이 원국 값을 바꿈');
const r1 = SUB.map(k => M.evaluateDomainLuck(c0, p0, 'seun', { ms: MS })[k].score), r2 = SUB.map(k => M.evaluateDomainLuck(c0, p0, 'seun', { ms: MS })[k].score);
ok(JSON.stringify(r1) === JSON.stringify(r2), '같은 입력의 결과가 다름');

// 7. 금지 표현: 사건·결과를 단정하지 않는다
const FORBID = /합격합니다|취업합니다|이직합니다|반드시|틀림없|출산합니다|임신|성공합니다|망합니다|사고가 납니다/;
let forbidden = 0; for (const r of rows.slice(0, 3000)) for (const k of SUB) { const x = r.dm[k]; if (FORBID.test([x.summary, ...x.reasons, ...x.tags].join(' '))) forbidden++; }
ok(forbidden === 0, `단정 표현 ${forbidden}건`);
console.log(`7. 단정 표현 ${forbidden}건`);

if (fails.length) { console.log('\n실패:\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('\n모두 통과');
