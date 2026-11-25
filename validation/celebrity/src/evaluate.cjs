// 3단계(대조·통계): 사건(data/events.json) × 블라인드 계산 결과(out/computed, out/null) → out/results.json
//   · 사전 등록(protocol/mapping.json)의 대응표·가설·지표만 쓴다. 결과를 보고 대응표를 바꾸지 않는다
//   · 백분위 = 그 사람의 만 15세~종료 연도 값 분포 안의 위치(중간 순위, 0~100)
//   · 무작위 기준: 같은 통계를 가짜 명식(같은 출생 연도·다른 월일시)으로 다시 계산 → 경험적 p = (가짜 ≥ 실제 개수 + 1) / (N + 1)
//   · 사용: node validation/celebrity/src/evaluate.cjs
const fs = require('fs'), path = require('path');
const A = require('./adapter.cjs');
const BASE = process.env.CV_BASE || path.join(__dirname, '..'), OUT = path.join(BASE, 'out');
const MAP = JSON.parse(fs.readFileSync(path.join(BASE, 'protocol', 'mapping.json'), 'utf8'));
const persons = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'persons.json'), 'utf8')).filter(p => !p.excluded);
const evAll = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'events.json'), 'utf8'));
const E = A.engine(), M = E.M;
const MINSIG = MAP.primary_analysis.min_significance;
const P = {}, NUL = {};
persons.forEach(p => { P[p.id] = JSON.parse(fs.readFileSync(path.join(OUT, 'computed', p.id + '.json'), 'utf8')); NUL[p.id] = JSON.parse(fs.readFileSync(path.join(OUT, 'null', p.id + '.json'), 'utf8')); });
const NN = Math.min(...persons.map(p => NUL[p.id].length));

// ── 사주 연도(입춘 기준). 월까지 알면 그 달 15일(일까지 알면 그날) 정오로 판정, 연도만 알면 그 연도
function sajuYear(dateStr, tz) {
  const [y, m, d] = dateStr.split('-').map(Number); if (!m) return y;
  try { return M.yearPillarAt(Date.UTC(y, m - 1, d || 15, 3)).sajuYear; } catch (e) { return y; }
}
// ── 사람별 연도 값 꺼내기(실제: rows / 가짜: slim)
const flowOf = (s, Y) => s.years ? (s.years[Y] && s.years[Y].flow) : (s[Y] && s[Y].f);
const volOf = (s, Y) => s.years ? (s.years[Y] && s.years[Y].vol) : (s[Y] && s[Y].v);
const domOf = (s, Y, k) => s.years ? (s.years[Y] && s.years[Y].dom && s.years[Y].dom[k]) : (s[Y] && s[Y].d && s[Y].d[k]);
const yearsOf = s => Object.keys(s.years || s).map(Number);
function pctIn(vals, v) { if (v == null || !vals.length) return null; let lo = 0, eq = 0; vals.forEach(x => { if (x < v) lo++; else if (x === v) eq++; }); return Math.round((lo + eq / 2) / vals.length * 1000) / 10; }
function pctFn(s, get) { const ys = yearsOf(s), cache = {}; return (Y, k) => { const key = k || '_'; if (!cache[key]) cache[key] = ys.map(y => get(s, y, k)).filter(v => v != null); return pctIn(cache[key], get(s, Y, k)); }; }

// ── 사건 정리(분석 대상: 제외 아님·중요도 기준 이상·사람 있음)
const events = evAll.filter(e => !e.excluded && e.event_significance >= MINSIG && P[e.person_id]).map(e => {
  const p = persons.find(q => q.id === e.person_id); const Y = sajuYear(String(e.event_date), p.birth_place.tz);
  const key = e.event_category === 'financial_event' || e.event_category === 'relationship_event' ? e.event_type : e.event_category;
  return Object.assign({}, e, { Y, key, profession: p.profession, birthConf: p.birth_time_confidence, split: p.split, age: Y - +p.birth_date.slice(0, 4) });
}).filter(e => P[e.person_id].years[e.Y]);
const domainsFor = e => { const m = MAP.domain_map[e.key]; if (!m) return []; return m[e.profession] || m.all || []; };
const expectFor = e => (MAP.domain_map[e.key] || {}).expect;

// ── 한 명식 집합(실제 또는 가짜 r번째)으로 사건별 측정값 계산
function measure(getSeries) {
  const fp = {}, vp = {}, dp = {};
  return events.map(e => {
    const s = getSeries(e.person_id); if (!s) return null;
    fp[e.person_id] = fp[e.person_id] || pctFn(s, (x, y) => flowOf(x, y));
    vp[e.person_id] = vp[e.person_id] || pctFn(s, (x, y) => volOf(x, y));
    dp[e.person_id] = dp[e.person_id] || pctFn(s, (x, y, k) => domOf(x, y, k));
    const flowPct = fp[e.person_id](e.Y), volPct = vp[e.person_id](e.Y);
    const prev = [flowOf(s, e.Y - 1), flowOf(s, e.Y - 2)].filter(v => v != null), f0 = flowOf(s, e.Y);
    const delta = prev.length && f0 != null ? f0 - prev.reduce((a, b) => a + b, 0) / prev.length : null;
    let domScore = null, domHit = null; const ex = expectFor(e), ks = domainsFor(e);
    if (ks.length && (ex === 'high' || ex === 'low')) { const v = ks.map(k => dp[e.person_id](e.Y, k)).filter(x => x != null); if (v.length) { domScore = v.reduce((a, b) => a + b, 0) / v.length; domHit = ex === 'high' ? domScore > 50 : domScore < 50; } }
    else if (ex === 'low_health_high_accident') { const h = dp[e.person_id](e.Y, 'health'), a = dp[e.person_id](e.Y, 'accident'); if (h != null && a != null) { domScore = ((100 - h) + a) / 2; domHit = domScore > 50; } }
    return { flowPct, volPct, delta, domScore, domHit, flow: f0 };
  });
}
const stats = rows => {
  const pos = [], neg = [], chg = [], dom = [];
  rows.forEach((r, i) => { if (!r) return; const e = events[i]; if (e.valence === 'positive' && r.flowPct != null) pos.push(r.flowPct); if (e.valence === 'negative' && r.flowPct != null) neg.push(r.flowPct);
    if (['career_change', 'retirement', 'marriage', 'divorce'].includes(e.key) && r.volPct != null) chg.push(r.volPct); if (r.domHit != null) dom.push(r.domHit ? 1 : 0); });
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  return { H1: pos.length && neg.length ? mean(pos) - mean(neg) : null, posMean: mean(pos), negMean: mean(neg), nPos: pos.length, nNeg: neg.length, H2: mean(dom), nDom: dom.length, H3: mean(chg), nChg: chg.length };
};

// ── H4: 사람-사건 단위 로지스틱(긍정=1, 부정=0), 사람 단위 교차검증(LOPO) AUC — 기준(나이·나이²·경력 연차) vs 기준+흐름 백분위
const firstCareer = {}; events.forEach(e => { if (firstCareer[e.person_id] == null || e.Y < firstCareer[e.person_id]) firstCareer[e.person_id] = e.Y; });
function logit(X, y, l2 = 0.01, it = 400, lr = 0.3) {
  const n = X.length, d = X[0].length, mu = Array(d).fill(0), sd = Array(d).fill(1);
  for (let j = 0; j < d; j++) { mu[j] = X.reduce((a, r) => a + r[j], 0) / n; sd[j] = Math.sqrt(X.reduce((a, r) => a + (r[j] - mu[j]) ** 2, 0) / n) || 1; }
  const Z = X.map(r => r.map((v, j) => (v - mu[j]) / sd[j])); let w = Array(d).fill(0), b = 0;
  for (let t = 0; t < it; t++) { const gw = Array(d).fill(0); let gb = 0; Z.forEach((r, i) => { const p = 1 / (1 + Math.exp(-(b + r.reduce((a, v, j) => a + v * w[j], 0)))), e = p - y[i]; gb += e; r.forEach((v, j) => gw[j] += e * v); });
    b -= lr * gb / n; w = w.map((wj, j) => wj - lr * (gw[j] / n + l2 * wj)); }
  return x => 1 / (1 + Math.exp(-(b + x.reduce((a, v, j) => a + (v - mu[j]) / sd[j] * w[j], 0))));
}
function auc(score, y) { const P1 = [], P0 = []; score.forEach((s, i) => (y[i] ? P1 : P0).push(s)); if (!P1.length || !P0.length) return null; let c = 0; P1.forEach(a => P0.forEach(b => c += a > b ? 1 : a === b ? 0.5 : 0)); return c / (P1.length * P0.length); }
function h4(rows) {
  const D = []; rows.forEach((r, i) => { const e = events[i]; if (!r || r.flowPct == null || (e.valence !== 'positive' && e.valence !== 'negative')) return; D.push({ pid: e.person_id, y: e.valence === 'positive' ? 1 : 0, base: [e.age, e.age * e.age, e.Y - firstCareer[e.person_id]], flow: r.flowPct }); });
  const ids = [...new Set(D.map(d => d.pid))]; if (ids.length < 5) return null;
  const sb = [], sf = [], yy = [];
  ids.forEach(id => { const tr = D.filter(d => d.pid !== id), te = D.filter(d => d.pid === id); if (new Set(tr.map(d => d.y)).size < 2) return;
    const mb = logit(tr.map(d => d.base), tr.map(d => d.y)), mf = logit(tr.map(d => d.base.concat([d.flow])), tr.map(d => d.y));
    te.forEach(d => { sb.push(mb(d.base)); sf.push(mf(d.base.concat([d.flow]))); yy.push(d.y); }); });
  const a0 = auc(sb, yy), a1 = auc(sf, yy); return { n: yy.length, aucBase: a0, aucFlow: a1, gain: a0 != null && a1 != null ? a1 - a0 : null };
}

// ── 실제 값
const realRows = measure(id => P[id]), real = stats(realRows), realH4 = h4(realRows);
// ── 사람 단위 부트스트랩 CI(H1·H2)
const pids = persons.map(p => p.id); let seed = 20261125; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const boot = { H1: [], H2: [] };
for (let b = 0; b < 1000; b++) { const pick = pids.map(() => pids[Math.floor(rnd() * pids.length)]), cnt = {}; pick.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
  const rr = [], ee = []; realRows.forEach((r, i) => { const c = cnt[events[i].person_id] || 0; for (let k = 0; k < c; k++) { rr.push(r); ee.push(events[i]); } });
  const pos = [], neg = [], dom = []; rr.forEach((r, i) => { if (!r) return; if (ee[i].valence === 'positive' && r.flowPct != null) pos.push(r.flowPct); if (ee[i].valence === 'negative' && r.flowPct != null) neg.push(r.flowPct); if (r.domHit != null) dom.push(r.domHit ? 1 : 0); });
  const m = a => a.reduce((x, y) => x + y, 0) / a.length; if (pos.length && neg.length) boot.H1.push(m(pos) - m(neg)); if (dom.length) boot.H2.push(m(dom)); }
const ci = a => { const s = [...a].sort((x, y) => x - y); return s.length ? [s[Math.floor(0.025 * s.length)], s[Math.floor(0.975 * s.length)]] : null; };
// ── 무작위 기준(가짜 명식)
const nullStats = [], nullH4 = [];
for (let r = 0; r < NN; r++) { const rows = measure(id => NUL[id][r]); nullStats.push(stats(rows)); if (r < 100) nullH4.push(h4(rows)); }
const pEmp = (key, obs, dir = 1) => { if (obs == null) return null; const v = nullStats.map(s => s[key]).filter(x => x != null); return (v.filter(x => dir > 0 ? x >= obs : x <= obs).length + 1) / (v.length + 1); };
const nullMean = key => { const v = nullStats.map(s => s[key]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const h4p = realH4 && realH4.gain != null ? (nullH4.filter(x => x && x.gain != null && x.gain >= realH4.gain).length + 1) / (nullH4.filter(x => x && x.gain != null).length + 1) : null;

// ── 나눠 보기(직업군·나이대·출생시간 신뢰도·dev/test)
const sub = f => { const rows = realRows.map((r, i) => f(events[i]) ? r : null); const s = stats(rows); return { H1: s.H1, nPos: s.nPos, nNeg: s.nNeg, H2: s.H2, nDom: s.nDom }; };
const breakdown = {
  profession: Object.fromEntries(['sports', 'business', 'arts'].map(k => [k, sub(e => e.profession === k)])),
  age: { '<30': sub(e => e.age < 30), '30-44': sub(e => e.age >= 30 && e.age < 45), '45+': sub(e => e.age >= 45) },
  birthTime: { known: sub(e => e.birthConf !== 'unknown'), unknown: sub(e => e.birthConf === 'unknown') },
  split: { dev: sub(e => e.split === 'dev'), test: sub(e => e.split === 'test') }
};
// ── 사건 대조표·사례
const table = events.map((e, i) => { const r = realRows[i], s = P[e.person_id].years[e.Y];
  return { person_id: e.person_id, date: e.event_date, Y: e.Y, age: e.age, key: e.key, valence: e.valence, significance: e.event_significance, desc: e.event_description, evidence: e.evidence_text, url: (e.evidence_urls || [])[0],
    flow: s.flow, grade: s.grade, flowPct: r.flowPct, delta: r.delta != null ? Math.round(r.delta * 10) / 10 : null, volPct: r.volPct, domains: domainsFor(e), domScore: r.domScore != null ? Math.round(r.domScore) : null, domHit: r.domHit,
    seun: s.gz, daeun: s.daeun, tg: s.stemTG + '/' + s.branchTG, roles: s.roles, rels: s.rels, split: e.split, birthConf: e.birthConf, profession: e.profession }; });
const matches = table.filter(t => (t.valence === 'positive' && t.flowPct >= 70) || (t.valence === 'negative' && t.flowPct <= 30));
const mismatches = table.filter(t => (t.valence === 'positive' && t.flowPct <= 30) || (t.valence === 'negative' && t.flowPct >= 70));
// ── 취약점 후보(서술용, 표본 작음): 불일치가 몰리는 세운 십성 묶음·통합 용신 방식
const GOF = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
const pole = table.filter(t => t.valence === 'positive' || t.valence === 'negative'), grp = {};
pole.forEach(t => { const g = GOF[t.tg.split('/')[1]] || '?'; grp[g] = grp[g] || { n: 0, miss: 0 }; grp[g].n++; if (mismatches.includes(t)) grp[g].miss++; });
const modeGrp = {}; pole.forEach(t => { const m = P[t.person_id].unified.mode; modeGrp[m] = modeGrp[m] || { n: 0, miss: 0 }; modeGrp[m].n++; if (mismatches.includes(t)) modeGrp[m].miss++; });

const res = { generatedAt: new Date().toISOString(), engineHash: A.engineHash(), manifest: JSON.parse(fs.readFileSync(path.join(OUT, 'computed', '_manifest.json'), 'utf8')),
  sample: { persons: persons.length, events: events.length, nullCount: NN, minSignificance: MINSIG },
  hypotheses: {
    H1: { stat: real.H1, posMean: real.posMean, negMean: real.negMean, nPos: real.nPos, nNeg: real.nNeg, ci95: ci(boot.H1), nullMean: nullMean('H1'), pEmp: pEmp('H1', real.H1), nullPosMean: nullMean('posMean'), nullNegMean: nullMean('negMean'), pPos: pEmp('posMean', real.posMean), pNegLow: pEmp('negMean', real.negMean, -1) },
    H2: { stat: real.H2, n: real.nDom, ci95: ci(boot.H2), nullMean: nullMean('H2'), pEmp: pEmp('H2', real.H2) },
    H3: { stat: real.H3, n: real.nChg, nullMean: nullMean('H3'), pEmp: pEmp('H3', real.H3) },
    H4: Object.assign({ n: 0, aucBase: null, aucFlow: null, gain: null, note: realH4 ? '' : '사람 5명 미만이라 계산하지 않음' }, realH4 || {}, { pEmp: h4p, nullGainMean: nullH4.filter(x => x && x.gain != null).reduce((a, x, _, arr) => a + x.gain / arr.length, 0) })
  },
  deltaByValence: ['positive', 'negative', 'change'].map(v => { const d = table.filter(t => t.valence === v && t.delta != null).map(t => t.delta); return { valence: v, n: d.length, mean: d.length ? d.reduce((a, b) => a + b, 0) / d.length : null }; }),
  breakdown, table, matches, mismatches, weakness: { bySeunBranchGroup: grp, byYongMode: modeGrp } };
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
const f = x => x == null ? '—' : (Math.round(x * 1000) / 1000);
console.log(`사건 ${events.length} · H1 ${f(real.H1)} (p≈${f(res.hypotheses.H1.pEmp)}) · H2 ${f(real.H2)} (p≈${f(res.hypotheses.H2.pEmp)}) · H3 ${f(real.H3)} (p≈${f(res.hypotheses.H3.pEmp)}) · H4 이득 ${f(realH4 && realH4.gain)} (p≈${f(h4p)})`);
