// 옛 6분류 구현(커밋 e68a17d 직전)과 복원한 표시 계층(luck6.js)을 같은 입력으로 비교한다.
//   node tests/luck6-compare.js        (git 저장소 안에서만 동작. git 이 없으면 건너뜀)
// 기대: 흐름 점수·작용 강도·변동성은 100% 같고, 변동기·방어기도 100% 같다.
//       기회·확장·수확·축적 4종은 이후에 추가된 시간 단위별 배율(LEVEL_WEIGHTS) 때문에 근소하게(1~2%) 다를 수 있다.
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..');
let oldSrc; try { oldSrc = cp.execFileSync('git', ['show', 'e68a17d^:index.html'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { console.log('git 기록을 읽을 수 없어 건너뜀'); process.exit(0); }
const load = src => { const a = src.indexOf('var MANSE_DATA'), b = src.indexOf('})(typeof window', a), ctx = vm.createContext({ console }); vm.runInContext(src.slice(a, src.indexOf('\n', b)), ctx); return ctx.Manse; };
const O = load(oldSrc), N = load(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'));
globalThis.window = globalThis; vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2/luck6.js'), 'utf8'), { filename: 'luck6.js' });
const L = globalThis.ReportV2.Luck6;
let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const inputs = [];
while (inputs.length < 120) { const inp = { year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: ['eokbu', 'johu', 'tonggwan'][inputs.length % 3] }; try { O.compute(inp); N.compute(inp); inputs.push(inp); } catch (e) { /* 없는 날짜 */ } }
let n = 0, same = 0, scoreDiff = 0, ovDiff = 0;
const cmp = (o, w) => {
  n++; const a = o.phase, b = L.of(w).label; if (a === b) same++;
  if (['fitScore', 'intensityScore', 'volatilityScore'].some(k => Math.abs(o[k] - w[k]) > 0.01)) scoreDiff++;
  if ((a === '변동기' || a === '방어기' || b === '변동기' || b === '방어기') && a !== b) ovDiff++;
};
for (const inp of inputs) {
  const co = O.compute(inp), cn = N.compute(inp);
  co.daeun.list.forEach((x, i) => cmp(x.ev, cn.daeun.list[i].ev));
  const so = O.seunRange(co, 2020, 2032), sn = N.seunRange(cn, 2020, 2032); so.forEach((x, i) => cmp(x.ev, sn[i].ev));
  const wo = O.wolun(co, 2026), wn = N.wolun(cn, 2026); wo.forEach((x, i) => cmp(x.ev, wn[i].ev));
}
console.log(`비교 ${n}건: 분류 일치 ${same} (${(same / n * 100).toFixed(1)}%) · 점수 불일치 ${scoreDiff} · 변동/방어 불일치 ${ovDiff}`);
if (scoreDiff || ovDiff || same / n < 0.97) { console.log('기대치와 다름'); process.exit(1); }
console.log('통과');
