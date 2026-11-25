// 2차 확증 검정 C1~C7(phase2/protocol/PREREGISTRATION_PHASE2.md 그대로). 1차·2차 어느 폴더에도 쓸 수 있다.
//   사용: node validation/celebrity/src2/evaluate2.cjs <base 폴더> <출력 json>
//   base 폴더 구조: data/persons.json · data/events.json · out/computed · out/null (src/compute.cjs 결과)
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const BASE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'phase2')), OUTF = path.resolve(process.argv[3] || path.join(BASE, 'out', 'confirmatory.json'));
const gradeOk = e => !e.source_grade || ['A', 'B', 'C'].includes(String(e.source_grade).toUpperCase());
const D = L.load(BASE, { gradeOk }), { persons, real, nul, events } = D;
const NR = Math.min(...persons.map(p => (nul[p.id] || []).length));
const rows = L.measure(events, e => real[e.person_id]);
const nullRows = []; for (let r = 0; r < NR; r++) nullRows.push(L.measure(events, e => nul[e.person_id][r]));
const isPos = e => e.valence === 'positive', isNeg = e => e.valence === 'negative', isAny = e => ['positive', 'negative', 'change'].includes(e.valence), isChg = e => ['career_change', 'retirement', 'marriage', 'divorce'].includes(e.key);
function vsFake(filt, field = 'flowPct') {
  const per = []; persons.forEach(p => {
    const ix = events.map((e, i) => i).filter(i => events[i].person_id === p.id && filt(events[i]) && rows[i] && rows[i][field] != null); if (!ix.length) return;
    const rv = L.mean(ix.map(i => rows[i][field])), nv = L.mean(nullRows.map(nr => L.mean(ix.map(i => nr[i] && nr[i][field]).filter(v => v != null))).filter(v => v != null));
    per.push({ id: p.id, real: rv, fake: nv, diff: rv - nv });
  });
  const pooledReal = L.mean(events.map((e, i) => filt(e) && rows[i] ? rows[i][field] : null).filter(v => v != null));
  const pooledNull = nullRows.map(nr => L.mean(events.map((e, i) => filt(e) && nr[i] ? nr[i][field] : null).filter(v => v != null)));
  const d = per.map(x => x.diff), w = L.wilcoxon(d);
  return { persons: per.length, real: L.r1(pooledReal), fake: L.r1(L.mean(pooledNull)), personDiffMean: L.r1(L.mean(d)), personDiffMedian: L.r1(L.median(d)), ci95: L.clusterBoot(per, x => x.id, s => L.mean(s.map(x => x.diff))).ci95.map(L.r1), wilcoxonP: L.r3(w.p), pEmp: L.r3((pooledNull.filter(v => v >= pooledReal).length + 1) / (pooledNull.length + 1)) };
}
const items = events.map((e, i) => ({ e, r: rows[i] })).filter(x => x.r && x.r.flowPct != null && (isPos(x.e) || isNeg(x.e)));
const h1 = s => { const a = s.filter(x => isPos(x.e)).map(x => x.r.flowPct), b = s.filter(x => isNeg(x.e)).map(x => x.r.flowPct); return a.length && b.length ? L.mean(a) - L.mean(b) : null; };
const C2perm = L.withinPermute(items, x => x.e.person_id, x => x.e.valence, (x, v) => ({ e: Object.assign({}, x.e, { valence: v }), r: x.r }), h1);
// C4·C5: 비율·평균을 가짜 명식 분포와 비교
const domRate = rs => { const h = rs.map((r, i) => r && r.domHit != null ? (r.domHit ? 1 : 0) : null).filter(v => v != null); return h.length ? L.mean(h) : null; };
const volChg = rs => L.mean(rs.map((r, i) => r && isChg(events[i]) && r.volPct != null ? r.volPct : null).filter(v => v != null));
const empP = (obs, arr) => obs == null ? null : (arr.filter(v => v != null && v >= obs).length + 1) / (arr.filter(v => v != null).length + 1);
// C6: 나이·경력 로지스틱(LOPO) AUC 증가
const firstY = {}; events.forEach(e => { if (firstY[e.person_id] == null || e.Y < firstY[e.person_id]) firstY[e.person_id] = e.Y; });
function logit(X, y, l2 = 0.01, it = 400, lr = 0.3) { const n = X.length, d = X[0].length, mu = Array(d).fill(0), sg = Array(d).fill(1); for (let j = 0; j < d; j++) { mu[j] = X.reduce((a, r) => a + r[j], 0) / n; sg[j] = Math.sqrt(X.reduce((a, r) => a + (r[j] - mu[j]) ** 2, 0) / n) || 1; } const Z = X.map(r => r.map((v, j) => (v - mu[j]) / sg[j])); let w = Array(d).fill(0), b = 0; for (let t = 0; t < it; t++) { const gw = Array(d).fill(0); let gb = 0; Z.forEach((r, i) => { const p = 1 / (1 + Math.exp(-(b + r.reduce((a, v, j) => a + v * w[j], 0)))), e = p - y[i]; gb += e; r.forEach((v, j) => gw[j] += e * v); }); b -= lr * gb / n; w = w.map((wj, j) => wj - lr * (gw[j] / n + l2 * wj)); } return x => 1 / (1 + Math.exp(-(b + x.reduce((a, v, j) => a + (v - mu[j]) / sg[j] * w[j], 0)))); }
function auc(s, y) { const P1 = [], P0 = []; s.forEach((v, i) => (y[i] ? P1 : P0).push(v)); if (!P1.length || !P0.length) return null; let c = 0; P1.forEach(a => P0.forEach(b => c += a > b ? 1 : a === b ? 0.5 : 0)); return c / (P1.length * P0.length); }
function aucGain(rs) { const Dd = []; rs.forEach((r, i) => { const e = events[i]; if (!r || r.flowPct == null || !(isPos(e) || isNeg(e))) return; Dd.push({ pid: e.person_id, y: isPos(e) ? 1 : 0, base: [e.age, e.age * e.age, e.Y - firstY[e.person_id]], f: r.flowPct }); });
  const ids = [...new Set(Dd.map(d => d.pid))], sb = [], sf = [], yy = []; ids.forEach(id => { const tr = Dd.filter(d => d.pid !== id), te = Dd.filter(d => d.pid === id); if (new Set(tr.map(d => d.y)).size < 2) return; const mb = logit(tr.map(d => d.base), tr.map(d => d.y)), mf = logit(tr.map(d => d.base.concat([d.f])), tr.map(d => d.y)); te.forEach(d => { sb.push(mb(d.base)); sf.push(mf(d.base.concat([d.f]))); yy.push(d.y); }); });
  const a0 = auc(sb, yy), a1 = auc(sf, yy); return { n: yy.length, aucBase: a0, aucFlow: a1, gain: a0 != null && a1 != null ? a1 - a0 : null }; }
// C7: 동료 교차 비교
function peer(filt) { const per = []; persons.forEach(p => { const ix = events.map((e, i) => i).filter(i => events[i].person_id === p.id && filt(events[i]) && rows[i] && rows[i].flowPct != null); if (!ix.length) return; const own = L.mean(ix.map(i => rows[i].flowPct)); const pv = persons.filter(q => q.id !== p.id && q.profession === p.profession).map(q => { const by = +q.birth_date.slice(0, 4); const r = L.measure(ix.map(i => events[i]), () => real[q.id], e => real[q.id].years[by + e.age] ? by + e.age : null).filter(x => x && x.flowPct != null); return r.length ? L.mean(r.map(x => x.flowPct)) : null; }).filter(v => v != null); if (pv.length) per.push({ id: p.id, own, peer: L.mean(pv) }); });
  const d = per.map(x => x.own - x.peer); return { persons: per.length, own: L.r1(L.mean(per.map(x => x.own))), peer: L.r1(L.mean(per.map(x => x.peer))), diffMean: L.r1(L.mean(d)), ci95: L.clusterBoot(per, x => x.id, s => L.mean(s.map(x => x.own - x.peer))).ci95.map(L.r1), wilcoxonP: L.r3(L.wilcoxon(d).p) }; }

const C = {};
C.C1 = vsFake(isPos);
C.C2 = { stat: L.r1(h1(items)), posMean: L.r1(L.mean(items.filter(x => isPos(x.e)).map(x => x.r.flowPct))), negMean: L.r1(L.mean(items.filter(x => isNeg(x.e)).map(x => x.r.flowPct))), ci95: L.clusterBoot(items, x => x.e.person_id, h1).ci95.map(L.r1), pPerm: L.r3(C2perm.p) };
C.C3 = vsFake(isAny);
const dr = domRate(rows), drN = nullRows.map(domRate); C.C4 = { stat: L.r3(dr), fake: L.r3(L.mean(drN.filter(v => v != null))), pEmp: L.r3(empP(dr, drN)) };
const vc = volChg(rows), vcN = nullRows.map(volChg); C.C5 = { stat: L.r1(vc), fake: L.r1(L.mean(vcN.filter(v => v != null))), pEmp: L.r3(empP(vc, vcN)) };
const g = aucGain(rows), gN = nullRows.slice(0, 100).map(aucGain).map(x => x.gain); C.C6 = { n: g.n, aucBase: L.r3(g.aucBase), aucFlow: L.r3(g.aucFlow), gain: L.r3(g.gain), fakeGainMean: L.r3(L.mean(gN.filter(v => v != null))), pEmp: L.r3(empP(g.gain, gN)) };
C.C7 = peer(isPos);
const P = { C1: C.C1.wilcoxonP, C2: C.C2.pPerm, C3: C.C3.wilcoxonP, C4: C.C4.pEmp, C5: C.C5.pEmp, C6: C.C6.pEmp, C7: C.C7.wilcoxonP };
const keys = Object.keys(P), adj = L.holm(keys.map(k => P[k])); keys.forEach((k, i) => { C[k].p = P[k]; C[k].pHolm = L.r3(adj[i]); });
// 보조: 출생시간·직업군별 C1
const sub = f => { const keep = new Set(persons.filter(f).map(p => p.id)); const per = []; persons.filter(f).forEach(p => { const ix = events.map((e, i) => i).filter(i => events[i].person_id === p.id && isPos(events[i]) && rows[i] && rows[i].flowPct != null); if (!ix.length) return; const rv = L.mean(ix.map(i => rows[i].flowPct)), nv = L.mean(nullRows.map(nr => L.mean(ix.map(i => nr[i] && nr[i].flowPct).filter(v => v != null))).filter(v => v != null)); per.push(rv - nv); }); return { persons: per.length, diffMean: L.r1(L.mean(per)), wilcoxonP: L.r3(L.wilcoxon(per).p) }; };
const profs = [...new Set(persons.map(p => p.profession))];
const secondary = { C1_birthTimeKnown: sub(p => p.birth_time_confidence !== 'unknown'), C1_birthTimeUnknown: sub(p => p.birth_time_confidence === 'unknown'), C1_byProfession: Object.fromEntries(profs.map(k => [k, sub(p => p.profession === k)])) };
const res = { runAt: new Date().toISOString(), engineHash: L.A.engineHash(), base: path.basename(BASE), persons: persons.length, events: events.length, fakesPerPerson: NR, confirmatory: C, secondary };
fs.mkdirSync(path.dirname(OUTF), { recursive: true }); fs.writeFileSync(OUTF, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ persons: res.persons, events: res.events, C: Object.fromEntries(keys.map(k => [k, { p: C[k].p, pHolm: C[k].pHolm }])) }));
