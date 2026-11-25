// 엔진 개선 후보 V0~V3 비교(phase2/protocol/ENGINE_CANDIDATES.md 그대로, 2026-11-25)
//   V0 = 현행(1차 base '.', 2차 'phase2'), V1~V3 = variants/<p1|p2>-<V>/ (src/compute.cjs 를 CV_ENGINE·CV_SEUN_PARENT 로 돌린 결과)
//   지표: C1(사람별 실제−가짜) · C2(긍정−부정, 사람 안 순열) · 반례율 · V0와 연도별 흐름 상관·등급 비율
//   사용: node validation/celebrity/src2/variants.cjs → variants/VARIANTS.json
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const L = require('./lib.cjs');
const ROOT = path.join(__dirname, '..');
const bases = { p1: { V0: ROOT }, p2: { V0: path.join(ROOT, 'phase2') } };
['p1', 'p2'].forEach(ph => ['V1', 'V2', 'V3'].forEach(v => bases[ph][v] = path.join(ROOT, 'variants', ph + '-' + v)));
const gradeOk = e => !e.source_grade || ['A', 'B', 'C'].includes(String(e.source_grade).toUpperCase());
const PA = 'tools/luck-engine-audit-20261125/out/engine-prop-A.js', ENV = { V0: {}, V1: { CV_ENGINE: PA }, V2: { CV_SEUN_PARENT: '0.2' }, V3: { CV_ENGINE: PA, CV_SEUN_PARENT: '0.2' } };   // 엔진 해시 기록용
const out = { runAt: new Date().toISOString(), note: '후보 정의·판단 규칙은 ENGINE_CANDIDATES.md(2차 결과 전 고정)', results: {} };
for (const ph of ['p1', 'p2']) {
  out.results[ph] = {};
  const D0 = L.load(bases[ph].V0, { nulls: false, gradeOk });
  for (const v of ['V0', 'V1', 'V2', 'V3']) {
    const B = bases[ph][v], cf = path.join(B, 'out', 'confirmatory.' + v + '.json');
    execFileSync(process.execPath, [path.join(__dirname, 'evaluate2.cjs'), B, cf], { stdio: 'ignore', env: Object.assign({}, process.env, ENV[v]) });
    const C = JSON.parse(fs.readFileSync(cf, 'utf8'));
    const D = L.load(B, { nulls: false, gradeOk }), rows = L.measure(D.events, e => D.real[e.person_id]);
    const pos = D.events.map((e, i) => [e, rows[i]]).filter(([e, r]) => r && r.flowPct != null && e.valence === 'positive');
    const neg = D.events.map((e, i) => [e, rows[i]]).filter(([e, r]) => r && r.flowPct != null && e.valence === 'negative');
    const lowPos = pos.filter(([, r]) => r.flowPct <= 20).length, highNeg = neg.filter(([, r]) => r.flowPct >= 80).length;
    // V0와 연도별 흐름(엔진 값) 상관·등급 비율
    const a = [], b = [], gr = {};
    D.persons.forEach(p => { const y0 = D0.real[p.id].years, y1 = D.real[p.id].years; Object.keys(y1).forEach(Y => { if (y0[Y] && y0[Y].flow != null && y1[Y].flow != null) { a.push(y0[Y].flow); b.push(y1[Y].flow); } const g = y1[Y].grade; if (g) gr[g] = (gr[g] || 0) + 1; }); });
    const ma = L.mean(a), mb = L.mean(b), cov = a.reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0), r = cov / Math.sqrt(a.reduce((s, x) => s + (x - ma) ** 2, 0) * b.reduce((s, x) => s + (x - mb) ** 2, 0));
    const tot = Object.values(gr).reduce((s, x) => s + x, 0);
    out.results[ph][v] = { engineHash: C.engineHash, persons: C.persons, C1: { diff: C.confirmatory.C1.personDiffMean, ci95: C.confirmatory.C1.ci95, p: C.confirmatory.C1.wilcoxonP }, C2: { diff: C.confirmatory.C2.stat, ci95: C.confirmatory.C2.ci95, p: C.confirmatory.C2.pPerm },
      counter: { lowPos, pos: pos.length, highNeg, neg: neg.length, rate: L.r1((lowPos + highNeg) / (pos.length + neg.length) * 100) }, corrWithV0: L.r3(r), flowMean: L.r1(mb), gradeShare: Object.fromEntries(Object.entries(gr).map(([k, n]) => [k, L.r1(n / tot * 100)])), allC: Object.fromEntries(Object.entries(C.confirmatory).map(([k, c]) => [k, c.p])) };
  }
}
// 분류(ENGINE_CANDIDATES.md 규칙 그대로 기계 적용)
out.classification = {};
['V1', 'V2', 'V3'].forEach(v => {
  const R = out.results, b1 = R.p1.V0, c1 = R.p1[v], b2 = R.p2.V0, c2 = R.p2[v];
  const better1 = c1.C1.diff > b1.C1.diff || c1.C2.diff > b1.C2.diff;
  const sameDir2 = (c1.C1.diff > b1.C1.diff ? c2.C1.diff >= b2.C1.diff : true) && (c1.C2.diff > b1.C2.diff ? c2.C2.diff >= b2.C2.diff : true);
  const counterOk = c2.counter.rate <= b2.counter.rate && c1.counter.rate <= b1.counter.rate;
  const inCI = Math.abs(c1.C1.diff - b1.C1.diff) < (b1.C1.ci95[1] - b1.C1.ci95[0]) / 2 && Math.abs(c1.C2.diff - b1.C2.diff) < (b1.C2.ci95[1] - b1.C2.ci95[0]) / 2;
  out.classification[v] = !better1 ? '현행 유지(1차에서도 좋아지지 않음)' : (sameDir2 && counterOk && !inCI) ? '개선 권장' : '추가 검증 필요' + (inCI ? '(차이가 사람 단위 부트스트랩 구간 안)' : '') + (!sameDir2 ? '(2차 재현 안 됨)' : '') + (!counterOk ? '(반례율 늘어남)' : '');
});
fs.writeFileSync(path.join(ROOT, 'variants', 'VARIANTS.json'), JSON.stringify(out, null, 1));
for (const ph of ['p1', 'p2']) for (const v of ['V0', 'V1', 'V2', 'V3']) { const x = out.results[ph][v]; console.log(ph, v, x.engineHash, 'C1', x.C1.diff, x.C1.p, '| C2', x.C2.diff, x.C2.p, '| 반례', x.counter.rate + '%', '| r', x.corrWithV0, '| 평균', x.flowMean); }
console.log(out.classification);
