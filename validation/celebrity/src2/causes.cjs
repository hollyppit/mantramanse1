// 일치·불일치 원인 분석(2026-11-25): 사건 해의 엔진 성분을 사람 안 백분위로 바꿔, 어떤 성분이 긍정·부정 사건을 가르는지 본다.
//   성분: 흐름(최종)·세운 자체·대운·통합 용신·억부·조후·격국·관계·구조·상하위 연결·변동성·기회·확장·수확·축적
//   반례 목록(지우거나 재해석하지 않음): 높은 흐름+부정 · 낮은 흐름+긍정 · 높은 재물 지표+재물 손실 · 낮은 직업 지표+성취 · 흐름 중간(무관)
//   사용: node validation/celebrity/src2/causes.cjs [base=validation/celebrity] [출력=audit/CAUSES.json]
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const BASE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..');
const OUTF = process.argv[3] ? path.resolve(process.argv[3]) : path.join(__dirname, '..', 'audit', 'CAUSES.json');
const D = L.load(BASE, { nulls: false }), { persons, real, events } = D, M = L.E().M;
const COMP = ['flow', 'own', 'daeun', 'unified', 'eokbu', 'johu', 'gyeok', 'relation', 'structure', 'chain', 'vol', 'opportunity', 'expansion', 'harvest', 'accumulation'];
// 사람마다 연도별 성분(엔진 값 그대로)
const comp = {}, meta = {};
persons.forEach(p => {
  const inp = L.A.toInput(p), ch = M.compute(inp), by = ch.solar.y, endY = Math.min(2025, p.death_date ? +p.death_date.slice(0, 4) : 9999), ys = {};
  M.seunRange(ch, by + 15, endY).forEach(x => { const e = x.ev; ys[x.year] = { flow: x.combined, own: e.ownFit, daeun: x.daeun ? x.daeun.ev.fitScore : null, unified: e.unifiedScore, eokbu: e.eokbuScore, johu: e.johuScore, gyeok: e.gyeokScore, relation: e.relationScore, structure: e.structureScore, chain: e.chain ? e.chain.v : 0, vol: e.volatilityScore,
    opportunity: e.phaseScores && e.phaseScores.opportunity, expansion: e.phaseScores && e.phaseScores.expansion, harvest: e.phaseScores && e.phaseScores.harvest, accumulation: e.phaseScores && e.phaseScores.accumulation, structs: (e.luckStructures || []).map(s => s.name), primary: e.primaryFlow }; });
  comp[p.id] = ys; meta[p.id] = { mode: ch.unified.mode, primary: ch.unified.primaryName, help: ch.strength.help, gyeok: (M.gyeokCore(ch) || {}).status };
});
const pctOf = (pid, Y, k) => { const ys = comp[pid], vals = Object.keys(ys).map(y => ys[y][k]).filter(v => v != null); return L.pctIn(vals, ys[Y] && ys[Y][k]); };
const rows = events.map(e => { const o = { e }; COMP.forEach(k => o[k] = pctOf(e.person_id, e.Y, k)); return o; }).filter(o => o.flow != null);
// 성분별: 긍정·부정·변화 평균 백분위, 긍정−부정 차이, 사람 단위 부트스트랩, 사람 안 순열
const comps = {};
COMP.forEach(k => {
  const it = rows.filter(o => o[k] != null), pv = v => it.filter(o => o.e.valence === v).map(o => o[k]);
  const fn = s => { const a = s.filter(o => o.e.valence === 'positive').map(o => o[k]), b = s.filter(o => o.e.valence === 'negative').map(o => o[k]); return a.length && b.length ? L.mean(a) - L.mean(b) : null; };
  const pol = it.filter(o => o.e.valence === 'positive' || o.e.valence === 'negative');
  comps[k] = { positive: L.r1(L.mean(pv('positive'))), negative: L.r1(L.mean(pv('negative'))), change: L.r1(L.mean(pv('change'))), diff: L.r1(fn(it)), cliff: L.r3(L.cliff(pv('positive'), pv('negative'))),
    ci95: L.clusterBoot(it, o => o.e.person_id, fn, 1000).ci95.map(L.r1), pPerm: L.r3(L.withinPermute(pol, o => o.e.person_id, o => o.e.valence, (o, v) => Object.assign({}, o, { e: Object.assign({}, o.e, { valence: v }) }), fn, 1000).p) };
});
const ps = L.holm(COMP.map(k => comps[k].pPerm)); COMP.forEach((k, i) => comps[k].pHolm = L.r3(ps[i]));
// 사건 종류별 성분
const byKey = {}; [...new Set(rows.map(o => o.e.key))].forEach(key => { const it = rows.filter(o => o.e.key === key); byKey[key] = { n: it.length, valence: it[0].e.valence }; COMP.forEach(k => byKey[key][k] = L.r1(L.mean(it.map(o => o[k]).filter(v => v != null)))); });
// 통합 용신 방식·강약 경계·격국 상태별 불일치율
const isMiss = o => (o.e.valence === 'positive' && o.flow <= 30) || (o.e.valence === 'negative' && o.flow >= 70);
const grp = f => { const g = {}; rows.filter(o => o.e.valence === 'positive' || o.e.valence === 'negative').forEach(o => { const k = f(o); g[k] = g[k] || { n: 0, miss: 0 }; g[k].n++; if (isMiss(o)) g[k].miss++; }); Object.values(g).forEach(v => v.rate = L.r1(v.miss / v.n * 100)); return g; };
const groups = { yongPrimary: grp(o => meta[o.e.person_id].primary), strength: grp(o => { const h = meta[o.e.person_id].help; return h < 42 ? '신약(<42)' : h <= 58 ? '경계(42~58)' : '신강(>58)'; }), gyeokStatus: grp(o => meta[o.e.person_id].gyeok || '-'),
  luckStructure: grp(o => (comp[o.e.person_id][o.e.Y].structs || []).join('+') || '없음'), primaryFlow: grp(o => comp[o.e.person_id][o.e.Y].primary || '-'), birthTime: grp(o => o.e.birthConf === 'unknown' ? '시간 미상' : '시간 앎') };
// 반례(전부)
const R = JSON.parse(fs.readFileSync(path.join(BASE, 'out', 'results.json'), 'utf8')).table;
const tableOf = o => R.find(t => t.person_id === o.e.person_id && t.date === o.e.event_date && t.desc === o.e.event_description) || {};
const line = o => { const t = tableOf(o), c = comp[o.e.person_id][o.e.Y]; return { person: o.e.person_id, date: o.e.event_date, Y: o.e.Y, kind: o.e.key, valence: o.e.valence, desc: o.e.event_description, flowPct: L.r1(o.flow), unifiedPct: L.r1(o.unified), relationPct: L.r1(o.relation), structurePct: L.r1(o.structure), daeunPct: L.r1(o.daeun), volPct: L.r1(o.vol), seun: t.seun, daeun: t.daeun, tg: t.tg, roles: t.roles, rels: t.rels, structs: c.structs, url: t.url }; };
const counter = {
  highFlowNegative: rows.filter(o => o.e.valence === 'negative' && o.flow >= 80).map(line),
  lowFlowPositive: rows.filter(o => o.e.valence === 'positive' && o.flow <= 20).map(line),
  highWealthLoss: rows.filter(o => o.e.key === 'financial_loss').map(o => Object.assign(line(o), { wealthPct: L.r1(tableOf(o).domScore) })).filter(x => x.wealthPct != null && x.wealthPct >= 70),
  lowCareerAchievement: rows.filter(o => o.e.key === 'achievement').map(o => Object.assign(line(o), { domainPct: L.r1(tableOf(o).domScore) })).filter(x => x.domainPct != null && x.domainPct <= 30),
  midFlowMajor: rows.filter(o => o.e.event_significance === 3 && o.flow > 40 && o.flow < 60).map(line)
};
const res = { runAt: new Date().toISOString(), engineHash: L.A.engineHash(), base: path.relative(path.join(__dirname, '..', '..', '..'), BASE), events: rows.length, components: comps, byKey, groups, counterexamples: counter, counts: Object.fromEntries(Object.entries(counter).map(([k, v]) => [k, v.length])) };
fs.mkdirSync(path.dirname(OUTF), { recursive: true }); fs.writeFileSync(OUTF, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ components: comps, counts: res.counts }, null, 1));
