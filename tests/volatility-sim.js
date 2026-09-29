// 변동성(volatilityScore)·변동기 판정 검증
//   node tests/volatility-sim.js [차트 수=400]
// 요구 사항 A~G를 각각 단언으로 확인한다. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
vm.runInThisContext(html.slice(a, html.indexOf('\n', b)));
const M = globalThis.Manse, V = M.VOLATILITY_CONFIG;

const N = +process.argv[2] || 400;
let seed = 424242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) {
  try { charts.push(M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar' })); } catch (e) { /* 없는 날짜 */ }
}
const pillars = []; for (let Y = 1984; Y < 2044; Y++) pillars.push(M.yearPillarOf(Y)); // 60갑자 한 바퀴
const fails = [], ok = (cond, msg) => { if (!cond) fails.push(msg); };
const rel = (type, pos, kind = 'branch', name = type) => ({ type, kind, name: `${name}`, members: [pos, 'luck'] });
const volOf = (c, rels) => M.calculateVolatility(c, rels);
const c0 = charts[0];

console.log(`차트 ${charts.length}개 × 60갑자 · 변동기 기준 ${V.phaseThreshold} · 단계 ${V.bands.map(x => x[1]).join(' / ')}`);

// ── 실제 운 전수 평가
const evs = [];
for (const c of charts) for (const p of pillars) {
  const ev = M.evaluateLuck(c, p, 'seun'), rels = M.luckRelations(c, p).rels;
  ok(Number.isFinite(ev.volatilityScore) && ev.volatilityScore >= 0 && ev.volatilityScore <= 100, `범위 밖 volatilityScore ${ev.volatilityScore}`);
  ok(typeof ev.volatilityBand === 'string' && ev.volatilityBand, '단계 이름 없음');
  evs.push({ c, p, ev, rels, vol: M.calculateVolatility(c, rels) });
}

// A. 합충형파해가 없는 운 → 변동성 낮음
const A = evs.filter(x => !x.rels.length);
console.log(`A. 관계 없는 운 ${A.length}건: 최대 변동성 ${Math.max(...A.map(x => x.ev.volatilityScore)).toFixed(1)}`);
ok(A.length > 0, 'A: 관계 없는 운 표본이 없음');
ok(A.every(x => x.ev.volatilityScore < 25 && x.ev.phase !== '변동기'), 'A: 관계가 없는데 변동성 25 이상이거나 변동기');

// B. 약한 관계 하나 → 변동기가 되면 안 됨
const B = evs.filter(x => x.vol.signals.length === 1 && x.vol.signals[0].pts < 25);
const Bph = B.filter(x => x.ev.phase === '변동기').length;
console.log(`B. 약한 신호 하나 ${B.length}건: 최대 변동성 ${Math.max(...B.map(x => x.ev.volatilityScore)).toFixed(1)}, 변동기 ${Bph}건`);
ok(B.length > 0 && Bph === 0, `B: 약한 관계 하나로 변동기가 된 경우 ${Bph}건`);
ok(B.every(x => x.ev.volatilityScore < V.phaseThreshold), 'B: 약한 신호 하나가 기준 이상');

// C. 일지·월지 충 → 변동성 상승 (년지 충보다 커야 함)
const cDay = volOf(c0, [rel('충', 'day', 'branch', '일지충')]).score, cMonth = volOf(c0, [rel('충', 'month')]).score, cHour = volOf(c0, [rel('충', 'hour')]).score, cYear = volOf(c0, [rel('충', 'year')]).score;
console.log(`C. 충 하나의 변동성 — 일지 ${cDay.toFixed(0)} · 월지 ${cMonth.toFixed(0)} · 시지 ${cHour.toFixed(0)} · 년지 ${cYear.toFixed(0)}`);
ok(cDay > cMonth && cMonth > cHour && cHour > cYear, 'C: 자리별 가중치 순서(일>월>시>년)가 어긋남');
ok(cDay >= 50 && cMonth >= 45, 'C: 일지·월지 충이 "변동성 높음" 근처까지 오르지 않음');
const dayClash = evs.filter(x => x.rels.some(r => r.type === '충' && r.members.includes('day')));
ok(dayClash.every(x => x.ev.volatilityScore >= 50), 'C: 일지 충이 있는데 변동성 50 미만인 운이 있음');
const gzTwoStem = volOf(c0, [rel('천간충', 'day', 'stem')]).score, gzYearStem = volOf(c0, [rel('천간충', 'year', 'stem')]).score;
ok(gzTwoStem > gzYearStem, 'C: 일간 천간충이 년간 천간충보다 크지 않음');

// D. 여러 신호 중첩 → 누적
const d1 = volOf(c0, [rel('충', 'day')]).score;
const d2 = volOf(c0, [rel('충', 'day'), rel('천간충', 'month', 'stem')]).score;
const d3 = volOf(c0, [rel('충', 'day'), rel('천간충', 'month', 'stem'), rel('형', 'month')]).score;
const d4 = volOf(c0, [rel('충', 'day'), rel('천간충', 'month', 'stem'), rel('형', 'month'), { type: '삼합', kind: 'branch', name: '삼합', members: ['day', 'month', 'luck'] }]).score;
console.log(`D. 신호를 하나씩 더할 때 변동성 — ${[d1, d2, d3, d4].map(x => x.toFixed(0)).join(' → ')}`);
ok(d1 < d2 && d2 < d3 && d3 < d4 && d4 <= 100, 'D: 신호가 겹쳐도 점수가 누적되지 않음');
const weakOnly = volOf(c0, [rel('해', 'year'), rel('파', 'year')]).score;
ok(weakOnly < V.phaseThreshold, 'D: 약한 신호 둘이 겹쳤다고 변동기가 됨');
const ov = volOf(c0, [rel('충', 'day'), rel('형', 'month')]), ovNo = volOf(c0, [rel('충', 'day'), rel('형', 'year')]);
ok(ov.nCore === 2 && ov.overlapBonus > 0 && ovNo.overlapBonus === 0, 'D: 핵심 궁(일·월) 중첩 가산이 동작하지 않음');
const compl = volOf(c0, [{ type: '삼합', kind: 'branch', name: '삼합', members: ['day', 'month', 'luck'] }]).score, half = volOf(c0, [{ type: '반합', kind: 'branch', name: '반합', members: ['month', 'luck'] }]).score;
ok(compl > half, 'D: 삼합 완성이 반합보다 크지 않음');

// E·F. 변동기는 어떤 상태와도 짝지어질 수 있다
const chg = evs.filter(x => x.ev.phase === '변동기'), cnt = {};
chg.forEach(x => cnt[x.ev.condition] = (cnt[x.ev.condition] || 0) + 1);
console.log(`E·F. 변동기 ${chg.length}건 — ${['순풍', '보통', '주의', '부담'].map(k => `${k} ${cnt[k] || 0}`).join(' · ')}`);
for (const k of ['순풍', '보통', '주의', '부담']) ok((cnt[k] || 0) > 0, `E·F: 변동기 · ${k} 조합이 하나도 없음`);
ok(chg.every(x => x.ev.volatilityScore >= V.phaseThreshold), '변동기인데 기준 미만');
// 변동성이 흐름 점수를 깎지 않는다: 변동성과 흐름 점수의 상관이 약해야 한다
const mean = arr => arr.reduce((p, q) => p + q, 0) / arr.length;
const xs = evs.map(x => x.ev.volatilityScore), ys = evs.map(x => x.ev.fitScore), mx = mean(xs), my = mean(ys);
const corr = xs.reduce((p, x, i) => p + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((p, x) => p + (x - mx) ** 2, 0) * ys.reduce((p, y) => p + (y - my) ** 2, 0));
const hi = evs.filter(x => x.ev.volatilityScore >= 70), lo = evs.filter(x => x.ev.volatilityScore < 25);
console.log(`   변동성 ↔ 흐름 점수 상관 ${corr.toFixed(3)} · 흐름 점수 평균: 변동성 매우 높음 ${mean(hi.map(x => x.ev.fitScore)).toFixed(1)} vs 안정적 ${mean(lo.map(x => x.ev.fitScore)).toFixed(1)}`);
ok(Math.abs(corr) < 0.15, `변동성과 흐름 점수의 상관이 큼(${corr.toFixed(2)}) — 서로 독립이어야 함`);
ok(Math.abs(mean(hi.map(x => x.ev.fitScore)) - mean(lo.map(x => x.ev.fitScore))) < 6, '변동성이 높은 운의 흐름 점수가 눈에 띄게 다름(감점 의심)');

// G. 변동성 낮음 + 흐름 점수 낮음 → 변동기가 아니라 다른 시기 또는 방어기
const G = evs.filter(x => x.ev.volatilityScore < 25 && x.ev.fitScore <= -20);
const gph = {}; G.forEach(x => gph[x.ev.phase] = (gph[x.ev.phase] || 0) + 1);
console.log(`G. 변동성 낮음 + 흐름 낮음 ${G.length}건 — ${Object.entries(gph).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
ok(G.length > 0 && !gph['변동기'], 'G: 변동성이 낮은데 변동기로 분류됨');
ok((gph['방어기'] || 0) > 0, 'G: 낮은 흐름 점수 + 강한 작용이 방어기로 잡히지 않음');

// 분포와 문구 점검
const bandCnt = {}; evs.forEach(x => bandCnt[x.ev.volatilityBand] = (bandCnt[x.ev.volatilityBand] || 0) + 1);
console.log('\n변동성 단계 분포:', V.bands.map(x => `${x[1]} ${((bandCnt[x[1]] || 0) / evs.length * 100).toFixed(0)}%`).join(' · '), `· 변동기 ${(chg.length / evs.length * 100).toFixed(0)}%`);
const gl = html.split('\n').find(l => l.startsWith("  '변동기': ['운의 시기'")) || '';
ok(gl.includes('길흉을 의미하지 않으며'), '용어 사전: 변동기 정의에 "길흉을 의미하지 않으며"가 없음');
for (const bad of ['흉운', '나쁜 일이 생기는', '손실이 발생', '반드시 이직', '반드시 이사', '반드시 이별']) ok(!gl.includes(bad), `용어 사전에 금지 표현 "${bad}"`);
ok(!/전환기|전환일/.test(html), '"전환기"/"전환일" 문자열이 남아 있음');

if (fails.length) { console.log('\n실패', fails.length, '건'); fails.forEach(x => console.log(' ', x)); process.exit(1); }
console.log('\n모든 검증 통과');
