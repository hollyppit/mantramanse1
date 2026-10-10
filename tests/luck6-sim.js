// 운의 6분류 표시 계층(report/v2/luck6.js) 검증:  node tests/luck6-sim.js
// 엔진 값을 바꾸지 않는지 · 판정 순서 · 6가지 이름만 나오는지 · 결정론 · 임계 경계를 확인한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2/luck6.js'), 'utf8'), { filename: 'luck6.js' });
const M = globalThis.Manse, L = globalThis.ReportV2.Luck6, C = L.CONFIG;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };

// 1. 판정 순서(합성 ev)
const ev = o => Object.assign({ fitScore: 0, intensityScore: 0, volatilityScore: 0, primaryFlow: 'harvest', phaseScores: { opportunity: 1, expansion: 2, harvest: 3, accumulation: 4 }, condition: '보통' }, o);
ok(L.of(ev({})).label === '수확기', '기본은 주 흐름');
ok(L.of(ev({ primaryFlow: 'opportunity' })).label === '기회기' && L.of(ev({ primaryFlow: 'expansion' })).label === '확장기' && L.of(ev({ primaryFlow: 'accumulation' })).label === '축적기', '주 흐름 4종 이름');
ok(L.of(ev({ volatilityScore: C.volatility })).label === '변동기', '변동성 경계값(≥55)은 변동기');
ok(L.of(ev({ volatilityScore: C.volatility - 0.1 })).label === '수확기', '변동성 경계 바로 아래는 주 흐름');
ok(L.of(ev({ fitScore: -45, intensityScore: 30, volatilityScore: 90 })).label === '방어기', '강한 방어가 변동보다 우선');
ok(L.of(ev({ fitScore: -20, intensityScore: 50, volatilityScore: 90 })).label === '변동기', '약한 방어는 변동보다 뒤');
ok(L.of(ev({ fitScore: -20, intensityScore: 50 })).label === '방어기', '약한 방어 경계');
ok(L.of(ev({ fitScore: -20, intensityScore: 49 })).label === '수확기', '약한 방어 경계 아래');
ok(/55/.test(L.of(ev({ volatilityScore: 60 })).rule) && L.of(ev({})).meaning, '판정 근거 문장·의미 제공');

// 2. 실제 엔진: 120개 차트 × 대운·세운·월운
let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const names = new Set(L.NAMES), seen = {}; let n = 0;
for (let i = 0; i < 120;) {
  const inp = { year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: ['eokbu', 'johu', 'tonggwan'][i % 3] };
  let c; try { c = M.compute(inp); } catch (e) { continue; } i++;
  const evs = [].concat(c.daeun.list.map(x => x.ev), M.seunRange(c, 2020, 2032).map(x => x.ev), M.wolun(c, 2026).map(x => x.ev));
  evs.forEach(e => {
    const before = JSON.stringify([e.fitScore, e.intensityScore, e.volatilityScore, e.phase, e.primaryFlow]);
    const a = L.of(e), b = L.of(e); n++;
    ok(names.has(a.label), '이름 범위: ' + a.label); ok(a.label === b.label && a.rule === b.rule, '결정론');
    ok(JSON.stringify([e.fitScore, e.intensityScore, e.volatilityScore, e.phase, e.primaryFlow]) === before, '엔진 값 불변');
    seen[a.label] = (seen[a.label] || 0) + 1;
  });
}
ok(L.NAMES.every(k => seen[k] > 0), '120개 차트에서 6분류가 모두 나온다: ' + JSON.stringify(seen));
console.log('6분류 분포', JSON.stringify(seen), '· 평가', n + '건');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
