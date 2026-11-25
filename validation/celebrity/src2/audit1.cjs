// 1차 검증 정밀 감사(2026-11-25) — 1차 데이터·결과는 읽기만 한다. 결과: validation/celebrity/audit/AUDIT_RESULTS.json
//   ① 재현성(임시 폴더에서 1차 계산·평가를 다시 돌려 같은지) ② 가짜 명식 조건 일치 ③ 사건 데이터 품질
//   ④ 인물 단위 통계(효과크기·부트스트랩·사람 안 순열·Wilcoxon·Holm) ⑤ 동료 교차 비교(같은 직업군 다른 사람 명식, 같은 나이)
//   사용: node validation/celebrity/src2/audit1.cjs [--skip-repro]
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const L = require('./lib.cjs');
const BASE = path.join(__dirname, '..'), AUD = path.join(BASE, 'audit'); fs.mkdirSync(AUD, { recursive: true });
const out = { runAt: new Date().toISOString(), engineHash: L.A.engineHash(), dataVersion: 'phase1 (data/persons.json · data/events.json)' };

// ① 재현성
if (!process.argv.includes('--skip-repro')) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-repro-'));
  fs.mkdirSync(path.join(tmp, 'data'), { recursive: true }); ['persons.json', 'events.json'].forEach(f => fs.copyFileSync(path.join(BASE, 'data', f), path.join(tmp, 'data', f)));
  fs.cpSync(path.join(BASE, 'protocol'), path.join(tmp, 'protocol'), { recursive: true });
  const env = Object.assign({}, process.env, { CV_BASE: tmp });
  cp.execFileSync(process.execPath, [path.join(BASE, 'src', 'compute.cjs'), '200'], { env, stdio: 'ignore' });
  cp.execFileSync(process.execPath, [path.join(BASE, 'src', 'evaluate.cjs')], { env, stdio: 'ignore' });
  const a = JSON.parse(fs.readFileSync(path.join(BASE, 'out', 'results.json'), 'utf8')), b = JSON.parse(fs.readFileSync(path.join(tmp, 'out', 'results.json'), 'utf8'));
  const strip = r => JSON.stringify({ h: r.hypotheses, t: r.table, d: r.deltaByValence, b: r.breakdown });
  let seriesSame = 0, seriesN = 0; fs.readdirSync(path.join(BASE, 'out', 'computed')).filter(f => f !== '_manifest.json').forEach(f => { seriesN++; if (fs.readFileSync(path.join(BASE, 'out', 'computed', f), 'utf8') === fs.readFileSync(path.join(tmp, 'out', 'computed', f), 'utf8')) seriesSame++; });
  let nullSame = 0, nullN = 0; fs.readdirSync(path.join(BASE, 'out', 'null')).forEach(f => { nullN++; if (fs.readFileSync(path.join(BASE, 'out', 'null', f), 'utf8') === fs.readFileSync(path.join(tmp, 'out', 'null', f), 'utf8')) nullSame++; });
  out.reproducibility = { resultsIdentical: strip(a) === strip(b), computedFilesIdentical: `${seriesSame}/${seriesN}`, nullFilesIdentical: `${nullSame}/${nullN}`, engineHashSame: a.engineHash === b.engineHash };
  fs.rmSync(tmp, { recursive: true, force: true });
}

const D = L.load(BASE); const { persons, real, nul, events } = D, M = L.E().M;
// ② 가짜 명식 조건 일치(입력을 다시 만들어 확인 — compute.cjs 와 같은 시드·규칙)
const crypto = require('crypto');
const seedOf = id => crypto.createHash('sha256').update(id).digest().readUInt32LE(0);
const R0 = s => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const nc = { persons: persons.length, sameBirthYear: 0, total: 0, sameGender: 0, samePlace: 0, hourKnownMatch: 0, sameObsYears: 0, yearPillarDiffers: 0, daeunDirSame: 0 };
persons.forEach(p => {
  const base = L.A.toInput(p), R = R0(seedOf(p.id)), rc = M.compute(base), realYears = Object.keys(real[p.id].years).length;
  for (let i = 0; i < 200; i++) {
    const m = 1 + Math.floor(R() * 12), d = 1 + Math.floor(R() * dim(base.year, m)); const over = { month: m, day: d }; if (base.hour != null) { over.hour = Math.floor(R() * 24); over.minute = Math.floor(R() * 60); }
    const inp = Object.assign({}, base, over); nc.total++;
    if (inp.year === base.year) nc.sameBirthYear++; if (inp.gender === base.gender) nc.sameGender++; if (inp.tz === base.tz && inp.lon === base.lon) nc.samePlace++; if ((inp.hour == null) === (base.hour == null)) nc.hourKnownMatch++;
    const s = nul[p.id][i]; if (s && Object.keys(s).length === realYears) nc.sameObsYears++;
    if (i < 40) { const fc = M.compute(inp); if (fc.pillars.year.s !== rc.pillars.year.s || fc.pillars.year.b !== rc.pillars.year.b) nc.yearPillarDiffers++; if (fc.daeun.forward === rc.daeun.forward) nc.daeunDirSame++; }
  }
});
nc.checkedPillarSample = persons.length * 40;
out.nullGenerator = nc;

// ③ 사건 데이터 품질
const all = D.evAll, ok = all.filter(e => !e.excluded), host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return '?'; } };
const dup = {}; events.forEach(e => { const k = e.person_id + '|' + e.Y + '|' + e.key; dup[k] = (dup[k] || 0) + 1; });
const byProfVal = {}; events.forEach(e => { const k = e.profession + ':' + e.valence; byProfVal[k] = (byProfVal[k] || 0) + 1; });
const wiki = ok.filter(e => (e.evidence_urls || []).every(u => /wikipedia\.org/.test(u))).length;
out.eventQuality = { total: all.length, usable: ok.length, analyzed: events.length, excludedReasons: all.filter(e => e.excluded).map(e => `${e.person_id} ${e.event_date}: ${(e.issues || []).join(',') || e.evidence_confidence}`),
  significance: { 1: ok.filter(e => e.event_significance === 1).length, 2: ok.filter(e => e.event_significance === 2).length, 3: ok.filter(e => e.event_significance === 3).length },
  confidence: { high: ok.filter(e => e.evidence_confidence === 'high').length, medium: ok.filter(e => e.evidence_confidence === 'medium').length },
  datePrecision: { yearOnly: ok.filter(e => /^\d{4}$/.test(e.event_date)).length, month: ok.filter(e => /^\d{4}-\d{2}$/.test(e.event_date)).length, day: ok.filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.event_date)).length },
  wikipediaOnly: wiki, topHosts: Object.entries(ok.flatMap(e => (e.evidence_urls || []).map(host)).reduce((o, h) => (o[h] = (o[h] || 0) + 1, o), {})).sort((a, b) => b[1] - a[1]).slice(0, 12),
  duplicatesSamePersonYearKind: Object.entries(dup).filter(([, n]) => n > 1).map(([k, n]) => k + ' ×' + n),
  byProfessionValence: byProfVal, droppedOutOfRange: all.filter(e => !e.excluded && e.event_significance >= 2).length - events.length };

// ④ 인물 단위 통계
const rows = L.measure(events, e => real[e.person_id]);
const items = events.map((e, i) => ({ e, r: rows[i] })).filter(x => x.r && x.r.flowPct != null);
const pv = v => items.filter(x => x.e.valence === v).map(x => x.r.flowPct);
const desc = a => ({ n: a.length, mean: L.r1(L.mean(a)), median: L.r1(L.median(a)), sd: L.r1(L.sd(a)) });
const H1fn = s => { const a = s.filter(x => x.e.valence === 'positive').map(x => x.r.flowPct), b = s.filter(x => x.e.valence === 'negative').map(x => x.r.flowPct); return a.length && b.length ? L.mean(a) - L.mean(b) : null; };
const perPersonDiff = []; persons.forEach(p => { const a = items.filter(x => x.e.person_id === p.id && x.e.valence === 'positive').map(x => x.r.flowPct), b = items.filter(x => x.e.person_id === p.id && x.e.valence === 'negative').map(x => x.r.flowPct); if (a.length && b.length) perPersonDiff.push(L.mean(a) - L.mean(b)); });
const stats = {
  flowPctByValence: { positive: desc(pv('positive')), negative: desc(pv('negative')), change: desc(pv('change')) },
  H1: { eventLevel: L.r3(H1fn(items)), cohenD: L.r3(L.cohenD(pv('positive'), pv('negative'))), cliffDelta: L.r3(L.cliff(pv('positive'), pv('negative'))),
    clusterBoot: L.clusterBoot(items, x => x.e.person_id, H1fn), withinPersonPermutation: L.withinPermute(items.filter(x => x.e.valence === 'positive' || x.e.valence === 'negative'), x => x.e.person_id, x => x.e.valence, (x, v) => ({ e: Object.assign({}, x.e, { valence: v }), r: x.r }), H1fn),
    personLevel: { n: perPersonDiff.length, mean: L.r1(L.mean(perPersonDiff)), median: L.r1(L.median(perPersonDiff)), wilcoxon: L.wilcoxon(perPersonDiff) } }
};
// 실제 vs 가짜 명식(사람 단위): 사람마다 실제 평균 백분위 − 가짜 200개 평균
function vsNull(valFilter, field = 'flowPct') {
  const NR = Math.min(...persons.map(p => (nul[p.id] || []).length));
  const nullRows = []; for (let r = 0; r < NR; r++) nullRows.push(L.measure(events, e => nul[e.person_id][r]));
  const per = []; persons.forEach(p => {
    const ix = events.map((e, i) => i).filter(i => events[i].person_id === p.id && valFilter(events[i]) && rows[i] && rows[i][field] != null); if (!ix.length) return;
    const rv = L.mean(ix.map(i => rows[i][field])), nv = L.mean(nullRows.map(nr => L.mean(ix.map(i => nr[i] && nr[i][field]).filter(v => v != null))).filter(v => v != null));
    per.push({ id: p.id, n: ix.length, real: rv, fake: nv, diff: rv - nv });
  });
  const pooledReal = L.mean(events.map((e, i) => valFilter(e) && rows[i] ? rows[i][field] : null).filter(v => v != null));
  const pooledNull = nullRows.map(nr => L.mean(events.map((e, i) => valFilter(e) && nr[i] ? nr[i][field] : null).filter(v => v != null)));
  const d = per.map(x => x.diff), bs = L.clusterBoot(per, x => x.id, s => L.mean(s.map(x => x.diff)));
  return { persons: per.length, pooledReal: L.r1(pooledReal), pooledFakeMean: L.r1(L.mean(pooledNull)), pEmp: (pooledNull.filter(v => v >= pooledReal).length + 1) / (pooledNull.length + 1),
    personDiffMean: L.r1(L.mean(d)), personDiffMedian: L.r1(L.median(d)), personDiffCI95: bs.ci95.map(L.r1), wilcoxon: L.wilcoxon(d), personsPositiveDiff: d.filter(x => x > 0).length };
}
stats.E1_positiveVsFake = vsNull(e => e.valence === 'positive');
stats.E2_anyEventVsFake = vsNull(e => ['positive', 'negative', 'change'].includes(e.valence));
stats.E3_negativeVsFake = vsNull(e => e.valence === 'negative');
stats.H3_volChangeVsFake = vsNull(e => ['career_change', 'retirement', 'marriage', 'divorce'].includes(e.key), 'volPct');
// ⑤ 동료 교차 비교: 같은 직업군 다른 사람의 실제 명식을 같은 나이에 대 본다(시대·세운은 다름, 직업·나이는 같음)
function peerSwap(valFilter) {
  const per = [];
  persons.forEach(p => {
    const ix = events.map((e, i) => i).filter(i => events[i].person_id === p.id && valFilter(events[i]) && rows[i] && rows[i].flowPct != null); if (!ix.length) return;
    const own = L.mean(ix.map(i => rows[i].flowPct)), peers = persons.filter(q2 => q2.id !== p.id && q2.profession === p.profession);
    const pv2 = peers.map(q2 => { const by = +q2.birth_date.slice(0, 4); const r = L.measure(ix.map(i => events[i]), () => real[q2.id], e => { const Y = by + e.age; return real[q2.id].years[Y] ? Y : null; }).filter(x => x && x.flowPct != null); return r.length ? L.mean(r.map(x => x.flowPct)) : null; }).filter(v => v != null);
    if (pv2.length) per.push({ id: p.id, own, peerMean: L.mean(pv2), rankFrac: pv2.filter(v => v < own).length / pv2.length });
  });
  const d = per.map(x => x.own - x.peerMean);
  return { persons: per.length, ownMean: L.r1(L.mean(per.map(x => x.own))), peerMean: L.r1(L.mean(per.map(x => x.peerMean))), diffMean: L.r1(L.mean(d)), diffCI95: L.clusterBoot(per, x => x.id, s => L.mean(s.map(x => x.own - x.peerMean))).ci95.map(L.r1), wilcoxon: L.wilcoxon(d), meanRankFrac: L.r3(L.mean(per.map(x => x.rankFrac))) };
}
stats.peerSwap_positive = peerSwap(e => e.valence === 'positive');
stats.peerSwap_anyEvent = peerSwap(e => ['positive', 'negative', 'change'].includes(e.valence));
// 다중비교(Holm): 사전 등록 H1~H4(1차 결과의 경험적 p) + 탐색 E1·E2·E3
const R1 = JSON.parse(fs.readFileSync(path.join(BASE, 'out', 'results.json'), 'utf8')).hypotheses;
const fam = [['H1', R1.H1.pEmp], ['H2', R1.H2.pEmp], ['H3', R1.H3.pEmp], ['H4', R1.H4.pEmp], ['E1 긍정 vs 가짜', stats.E1_positiveVsFake.pEmp], ['E2 모든 사건 vs 가짜', stats.E2_anyEventVsFake.pEmp], ['E3 부정 vs 가짜(높은 쪽)', stats.E3_negativeVsFake.pEmp]];
const adj = L.holm(fam.map(x => x[1])); stats.holm = fam.map((x, i) => ({ test: x[0], p: L.r3(x[1]), pHolm: L.r3(adj[i]) }));
out.statistics = stats;
fs.writeFileSync(path.join(AUD, 'AUDIT_RESULTS.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ repro: out.reproducibility, nullGen: nc, E1: stats.E1_positiveVsFake, E2: stats.E2_anyEventVsFake, peer: stats.peerSwap_positive, holm: stats.holm }, null, 1));
