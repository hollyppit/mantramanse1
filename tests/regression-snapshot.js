// 기존 계산 결과가 바뀌지 않았는지 확인하는 회귀 스냅샷
//   node tests/regression-snapshot.js <engine.js 경로> [차트 수=120]      → 스냅샷의 SHA-1과 항목별 해시를 출력
//   node tests/regression-snapshot.js --compare <이전.html> <현재.html>    → 두 파일의 스냅샷을 항목별로 비교(다르면 종료 코드 1)
//   --ignore-phase 를 붙이면 시기 유형(phase·activityType)만 비교에서 뺀다. 시기 분류 기준을 일부러 바꾼 뒤에 나머지가 그대로인지 볼 때 쓴다.
// 사주 원국·오행 비율·강약·용신(3학파)·억부/조후·한난조습·대운·세운·월운·일진·흐름 점수·6분류·volatilityScore·삼재를 고정 표본으로 뽑아 해시한다.
// 분야별 지수 계층이 추가된 뒤에도 위 값이 그대로여야 한다.
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');

function load(file) {
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
  const ctx = vm.createContext({ console });
  vm.runInContext(html.slice(a, html.indexOf('\n', b)), ctx);
  return ctx.Manse;
}
const r3 = v => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);
function snapshot(M, N) {
  let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const inputs = [];
  while (inputs.length < N) {
    const inp = { year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: ['eokbu', 'johu', 'tonggwan'][inputs.length % 3] };
    try { M.compute(inp); inputs.push(inp); } catch (e) { /* 없는 날짜 */ }
  }
  const IGN = process.argv.includes('--ignore-phase');
  const evF = ev => [ev.fitScore, ev.ownFit, ev.eokbuScore, ev.johuScore, ev.relationScore, ev.structureScore, ev.intensityScore, ...(IGN ? [] : [ev.phase]), ev.condition, ev.volatilityScore, ev.volatilityBand, ...(IGN ? [] : [ev.activityType]), ev.triggers, ev.relations].map(r3);
  const out = { pillars: [], weights: [], strength: [], yong: [], climate: [], daeun: [], seun: [], wolun: [], ilun: [], samjae: [], domain: [], career: [], root: [] };
  for (const inp of inputs) {
    const c = M.compute(inp), pl = k => c.pillars[k] ? c.pillars[k].s + '-' + c.pillars[k].b : null;
    out.pillars.push([pl('year'), pl('month'), pl('day'), pl('hour'), c.gender]);
    out.weights.push([c.weights.pct.map(r3), c.weights.groups.map(r3), Object.values(c.weights.tgPct).map(r3)]);
    out.strength.push([r3(c.strength.help), c.strength.zone, c.strength.deukryeong, c.strength.deukji, c.strength.deukse]);
    out.yong.push(['eokbu', 'johu', 'tonggwan'].map(k => { const y = c.yongAll[k]; return [y.applicable, y.yong ?? null, y.hee ?? null, y.roles ? Object.values(y.roles) : null]; }));
    out.climate.push([r3(c.climate.temp), r3(c.climate.hum)]);
    out.daeun.push(c.daeun.list.map(x => [x.s, x.b, x.startAge, x.startYear, ...evF(x.ev)]));
    out.seun.push(M.seunRange(c, 2020, 2032).map(x => [x.s, x.b, r3(x.combined), ...evF(x.ev)]));
    out.wolun.push(M.wolun(c, 2026).map(x => [x.s, x.b, r3(x.combined), ...evF(x.ev)]));
    out.ilun.push(M.ilun(c, 2026, 5).map(x => [x.s, x.b, ...evF(x.ev)]));
    if (M.evaluateDomainLuck) out.domain.push(M.seunRange(c, 2024, 2030).map(x => { const d = M.evaluateDomainLuck(c, x, 'seun', { ms: x.midMs }); return M.DOMAIN_KEYS.map(k => [d[k].score, d[k].band]); }));
    if (M.careerProfile) out.career.push(M.careerProfile(c).categories.map(x => [x.category, x.score, x.burden]));
    if (M.analyzeNatalRoot) { const r = M.analyzeNatalRoot(c); out.root.push([r.hasNatalRoot, r.natalRootScore, r.natalRootLevel, r.roots.length, ...c.daeun.list.slice(0, 3).map(x => { const a = M.analyzeLuckRootSupport(c, x, 'daeun'); return a && typeof a === 'object' ? Object.values(a).filter(v => typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string').map(r3) : null; })]); }
    out.samjae.push([2024, 2025, 2026, 2027].map(y => { const s = M.getSamjae(c.pillars.year.b, y); return [s.active, s.stage]; }));
  }
  return out;
}
const hash = o => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 12);

const args = process.argv.slice(2).filter(a => a !== '--ignore-phase');
if (args[0] === '--compare') {
  const [oldF, newF] = [args[1], args[2]], N = +args[3] || 120;
  const A = snapshot(load(oldF), N), B = snapshot(load(newF), N);
  let bad = 0;
  console.log(`회귀 비교: ${oldF.split(/[\\/]/).pop()} ↔ ${newF.split(/[\\/]/).pop()} · 사주 ${N}개`);
  for (const k of Object.keys(A)) {
    const same = JSON.stringify(A[k]) === JSON.stringify(B[k]);
    if (!same) bad++;
    console.log(`  ${same ? '동일' : '변경'}  ${k.padEnd(9)} ${hash(A[k])} ${same ? '=' : '≠'} ${hash(B[k])}`);
  }
  if (bad) { console.log(`\n변경된 항목 ${bad}개 — 기존 계산이 바뀌었습니다`); process.exit(1); }
  console.log('\n모든 기존 항목이 동일합니다');
} else {
  const snap = snapshot(load(args[0]), +args[1] || 120);
  console.log('전체', hash(snap)); for (const k of Object.keys(snap)) console.log(' ', k.padEnd(9), hash(snap[k]));
}
