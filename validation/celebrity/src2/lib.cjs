// 2차 검증 공용 라이브러리(2026-11-25) — 1차 코드(src/)와 결과(out/)는 그대로 두고 읽기만 한다.
//   load(base): 사람·사건·실제 계산·가짜 명식을 읽어 1차와 같은 규칙으로 사건을 정리
//   measure(...): 사건별 흐름·변동성·분야 백분위(사람 안 분포 기준)
//   통계: 평균·중앙값·표준편차·효과크기(Cohen d·Cliff δ)·사람 단위 부트스트랩·사람 안 순열·Wilcoxon·Holm
const fs = require('fs'), path = require('path');
const A = require('../src/adapter.cjs');
const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'protocol', 'mapping.json'), 'utf8'));
let _E = null; const E = () => _E || (_E = A.engine());

function sajuYear(dateStr) { const [y, m, d] = String(dateStr).split('-').map(Number); if (!m) return y; try { return E().M.yearPillarAt(Date.UTC(y, m - 1, d || 15, 3)).sajuYear; } catch (e) { return y; } }
function load(base, opt = {}) {
  const J = f => JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'));
  const persons = J('data/persons.json').filter(p => !p.excluded);
  const real = {}, nul = {};
  persons.forEach(p => { real[p.id] = J(path.join(opt.computedDir || 'out/computed', p.id + '.json')); if (opt.nulls !== false) { const f = path.join(base, opt.nullDir || 'out/null', p.id + '.json'); if (fs.existsSync(f)) nul[p.id] = JSON.parse(fs.readFileSync(f, 'utf8')); } });
  const minSig = opt.minSig ?? MAP.primary_analysis.min_significance;
  const evAll = J('data/events.json');
  const events = evAll.filter(e => !e.excluded && e.event_significance >= minSig && real[e.person_id] && (!opt.gradeOk || opt.gradeOk(e))).map(e => {
    const p = persons.find(q => q.id === e.person_id), Y = sajuYear(e.event_date);
    const key = e.event_category === 'financial_event' || e.event_category === 'relationship_event' ? e.event_type : e.event_category;
    return Object.assign({}, e, { Y, key, profession: p.profession, birthConf: p.birth_time_confidence, split: p.split, age: Y - +p.birth_date.slice(0, 4), birthYear: +p.birth_date.slice(0, 4) });
  }).filter(e => real[e.person_id].years[e.Y]);
  return { persons, real, nul, events, evAll };
}
const flowOf = (s, Y) => s.years ? (s.years[Y] && s.years[Y].flow) : (s[Y] && s[Y].f);
const volOf = (s, Y) => s.years ? (s.years[Y] && s.years[Y].vol) : (s[Y] && s[Y].v);
const domOf = (s, Y, k) => s.years ? (s.years[Y] && s.years[Y].dom && s.years[Y].dom[k]) : (s[Y] && s[Y].d && s[Y].d[k]);
const yearsOf = s => Object.keys(s.years || s).map(Number);
function pctIn(vals, v) { if (v == null || !vals.length) return null; let lo = 0, eq = 0; vals.forEach(x => { if (x < v) lo++; else if (x === v) eq++; }); return (lo + eq / 2) / vals.length * 100; }
function pctFn(s, get) { const ys = yearsOf(s), c = {}; return (Y, k) => { const kk = k || '_'; if (!c[kk]) c[kk] = ys.map(y => get(s, y, k)).filter(v => v != null); return pctIn(c[kk], get(s, Y, k)); }; }
const domainsFor = e => { const m = MAP.domain_map[e.key]; if (!m) return []; return m[e.profession] || m.all || m.business || []; };
const expectFor = e => (MAP.domain_map[e.key] || {}).expect;
// 사건별 측정(series(pid, event) → 그 사건에 쓸 명식 값. 나이 맞춤 비교군은 사건마다 다른 연도를 쓸 수 있게 yearOf 를 받는다)
function measure(events, seriesOf, yearOf = e => e.Y) {
  const cache = new Map();
  return events.map(e => {
    const s = seriesOf(e); if (!s) return null; const Y = yearOf(e, s); if (Y == null) return null;
    let c = cache.get(s); if (!c) { c = { f: pctFn(s, flowOf), v: pctFn(s, volOf), d: pctFn(s, domOf) }; cache.set(s, c); }
    const f0 = flowOf(s, Y); if (f0 == null) return null;
    const prev = [flowOf(s, Y - 1), flowOf(s, Y - 2)].filter(v => v != null);
    let domScore = null, domHit = null; const ex = expectFor(e), ks = domainsFor(e);
    if (ks.length && (ex === 'high' || ex === 'low')) { const v = ks.map(k => c.d(Y, k)).filter(x => x != null); if (v.length) { domScore = v.reduce((a, b) => a + b, 0) / v.length; domHit = ex === 'high' ? domScore > 50 : domScore < 50; } }
    else if (ex === 'low_health_high_accident') { const h = c.d(Y, 'health'), a = c.d(Y, 'accident'); if (h != null && a != null) { domScore = ((100 - h) + a) / 2; domHit = domScore > 50; } }
    return { flowPct: c.f(Y), volPct: c.v(Y), flow: f0, delta: prev.length ? f0 - prev.reduce((a, b) => a + b, 0) / prev.length : null, domScore, domHit };
  });
}
// ── 통계 도구
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sd = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
const cohenD = (a, b) => { const na = a.length, nb = b.length; if (na < 2 || nb < 2) return null; const sp = Math.sqrt(((na - 1) * sd(a) ** 2 + (nb - 1) * sd(b) ** 2) / (na + nb - 2)); return sp ? (mean(a) - mean(b)) / sp : null; };
const cliff = (a, b) => { if (!a.length || !b.length) return null; let g = 0, l = 0; a.forEach(x => b.forEach(y => { if (x > y) g++; else if (x < y) l++; })); return (g - l) / (a.length * b.length); };
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; }
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))] : null; };
// 사람 단위 부트스트랩: fn(items) 를 사람을 복원 추출한 표본으로 반복
function clusterBoot(items, pidOf, fn, B = 2000, seed = 7) {
  const R = rng(seed), by = new Map(); items.forEach(it => { const k = pidOf(it); if (!by.has(k)) by.set(k, []); by.get(k).push(it); });
  const ids = [...by.keys()], out = [];
  for (let b = 0; b < B; b++) { const s = []; for (let i = 0; i < ids.length; i++) s.push(...by.get(ids[Math.floor(R() * ids.length)])); const v = fn(s); if (v != null && isFinite(v)) out.push(v); }
  return { ci95: [q(out, 0.025), q(out, 0.975)], se: sd(out) };
}
// 사람 안 순열: 각 사람 안에서 사건 성격 표지를 섞어 통계 분포를 만든다(사람 간 차이는 그대로)
function withinPermute(items, pidOf, labelOf, setLabel, fn, B = 2000, seed = 11) {
  const R = rng(seed), obs = fn(items), by = new Map(); items.forEach((it, i) => { const k = pidOf(it); if (!by.has(k)) by.set(k, []); by.get(k).push(i); });
  let ge = 0, n = 0;
  for (let b = 0; b < B; b++) {
    const labs = items.map(labelOf);
    by.forEach(ix => { const l = ix.map(i => labs[i]); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } ix.forEach((i, k) => labs[i] = l[k]); });
    const v = fn(items.map((it, i) => setLabel(it, labs[i]))); if (v == null) continue; n++; if (v >= obs) ge++;
  }
  return { obs, p: (ge + 1) / (n + 1) };
}
// Wilcoxon 부호 순위(정규 근사, 한쪽: 중앙값 > 0)
function wilcoxon(d) {
  const x = d.filter(v => v !== 0); const n = x.length; if (n < 5) return { n, p: null };
  const r = x.map(v => ({ a: Math.abs(v), s: Math.sign(v) })).sort((p, q2) => p.a - q2.a); let i = 0; const rk = [];
  while (i < n) { let j = i; while (j + 1 < n && r[j + 1].a === r[i].a) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) rk[k] = avg; i = j + 1; }
  const W = r.reduce((s, v, k) => s + (v.s > 0 ? rk[k] : 0), 0), mu = n * (n + 1) / 4, sg = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24), z = (W - mu - 0.5) / sg;
  return { n, W, z, p: 1 - phi(z) };
}
function phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
function holm(ps) { const ix = ps.map((p, i) => [p, i]).filter(x => x[0] != null).sort((a, b) => a[0] - b[0]), m = ix.length, out = ps.map(() => null); let mx = 0; ix.forEach(([p, i], k) => { mx = Math.max(mx, Math.min(1, p * (m - k))); out[i] = mx; }); return out; }
const r1 = x => x == null ? null : Math.round(x * 10) / 10, r3 = x => x == null ? null : Math.round(x * 1000) / 1000;
module.exports = { A, MAP, E, load, measure, sajuYear, flowOf, volOf, domOf, yearsOf, pctIn, domainsFor, expectFor, mean, median, sd, cohenD, cliff, rng, q, clusterBoot, withinPermute, wilcoxon, holm, r1, r3 };
