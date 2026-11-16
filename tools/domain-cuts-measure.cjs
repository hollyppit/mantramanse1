// 분야 지수 신호등 기준값(SIG_CUTS)·등급 구간(DOMAIN_SCORE_THRESHOLDS love·wealth) 측정(읽기 전용) — 2026-11-16
//   node tools/domain-cuts-measure.cjs [기준 커밋=HEAD]
// 같은 표본으로 기준 커밋 엔진과 작업 파일 엔진을 각각 돌려 분포를 잰다.
//   SIG_CUTS: 하위 10%·30%, 상위 30%·10% 지점(최고·좋음·무난·주의·부담 = 10·20·40·20·10%)
//   등급 구간: 매우 높음 ~3% · 높음 ~15% · 무난 ~55% · 다소 낮음 ~20% · 낮음 ~7% (docs/FIELD_BAND_REVIEW_2026-11-06.md)
// 기준 커밋 엔진으로 잰 값이 지금 index.html 의 SIG_CUTS 와 거의 같으면 측정 방법이 맞는 것이다.
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..'), BASE = process.argv[2] || 'HEAD', N = +(process.env.N || 150);
const load = src => { const a = src.indexOf('var MANSE_DATA'), b = src.indexOf('})(typeof window', a), ctx = vm.createContext({ console }); vm.runInContext(src.slice(a, src.indexOf('\n', b)), ctx); return ctx.Manse; };
const MO = load(cp.execFileSync('git', ['show', BASE + ':engine.js'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })), MN = load(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), cur = JSON.parse(/const SIG_CUTS = (\{.*?\});/.exec(html)[1]);
const KEYS = [...MN.DOMAIN_KEYS, ...MN.SUB_DOMAIN_KEYS];
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p / 100 * (s.length - 1))))]; };
function measure(M) {
  let seed = 20261116; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pool = {}, band = { love: [], wealth: [] }; [...KEYS, 'windfallLoss'].forEach(k => { pool[k] = []; });
  for (let i = 0; i < N; i++) {
    let ch; try { ch = M.compute({ year: 1945 + Math.floor(rnd() * 65), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar' }); } catch (e) { continue; }
    const add = (r, lv) => { KEYS.forEach(k => { if (r[k]) pool[k].push(r[k].score); }); if (r.windfall && r.windfall.loss) pool.windfallLoss.push(r.windfall.loss.score); if (lv !== 'ilun') { band.love.push(r.love.score); band.wealth.push(r.wealth.score); } };
    ch.daeun.list.forEach(d => add(M.evaluateDomainLuck(ch, d, 'daeun', { ms: d.startMs }), 'daeun'));
    M.seunRange(ch, 2000, 2035).forEach(x => add(M.evaluateDomainLuck(ch, x, 'seun', { ms: x.midMs }), 'seun'));
    M.wolun(ch, 2026).forEach(x => add(M.evaluateDomainLuck(ch, x, 'wolun', { ms: x.startMs + 86400000 }), 'wolun'));
  }
  const cuts = {}; Object.keys(pool).forEach(k => { cuts[k] = [10, 30, 70, 90].map(p => Math.round(q(pool[k], p))); });
  const bands = {}; Object.keys(band).forEach(k => { bands[k] = [97, 82, 27, 7].map(p => Math.round(q(band[k], p))); });
  return { cuts, bands, n: pool.love.length };
}
const O = measure(MO), Nw = measure(MN);
const out = { 표본: { 명식: N, 점수: Nw.n }, 기준커밋으로잰값_vs_현재SIG_CUTS: {}, 새SIG_CUTS: Nw.cuts, 기준커밋_등급구간: O.bands, 새등급구간: Nw.bands, 기준커밋_SIG_CUTS: O.cuts };
Object.keys(cur).forEach(k => { out.기준커밋으로잰값_vs_현재SIG_CUTS[k] = `${(O.cuts[k] || []).join('/')} vs ${cur[k].join('/')}`; });
console.log(JSON.stringify(out, null, 1));
