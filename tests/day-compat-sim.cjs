// 60갑자 일주 적합도 2판(compat-day.js) 검증:  node tests/day-compat-sim.cjs [사주 수=600] [--md]
//  ① 스위치 꺼짐이면 기존 엔진 결과 그대로, 켜짐이면 2판 ② 필드 호환(saju-data·deep-life·garden 이 읽는 값) ③ 범위·NaN·결정성
//  ④ 결핍이지만 꺼리는 오행 가산 없음 ⑤ 일지 충 조건부 ⑥ 종격 정합 ⑦ 성분 중복(상관) ⑧ 끌림 '내게 필요한 기운'만 바뀜 ⑨ 기존 대비 비교표
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'compat-day.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, D = ctx.MantraDayCompat;
const N = +process.argv[2] || 600, MD = process.argv.includes('--md');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
let seed = 20261117; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) { try { charts.push(M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: rnd() < 0.08 ? null : Math.floor(rnd() * 24), minute: 0, gender: rnd() < 0.5 ? 'M' : 'F', calendar: 'solar' })); } catch (e) { } }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; a.forEach((x, i) => { n += (x - ma) * (b[i] - mb); da += (x - ma) ** 2; db += (b[i] - mb) ** 2; }); return n / Math.sqrt(da * db || 1); };
const rank = v => { const idx = v.map((x, i) => [x, i]).sort((p, r) => p[0] - r[0]); const rk = []; idx.forEach(([, i], k) => { rk[i] = k; }); return rk; };

// ① 스위치
ctx.MANTRA_FLAGS = { dayCompat: false };
const c0 = charts[0], offA = M.compatDayPillars(c0), offB = M.compatDayPillarsV1(c0);
ok(offA === offB && offA[0].version === undefined, '꺼짐인데 기존 계산이 아님');
ok(M.compatAttraction(c0) === M.compatAttractionV1(c0), '꺼짐인데 끌림이 기존 계산이 아님');
ctx.MANTRA_FLAGS = { dayCompat: true };
ok(M.compatDayPillars(c0)[0].version === 2, '켜짐인데 2판이 아님');

const FIELDS = ['i', 's', 'b', 'ganzhi', 'ganzhiK', 'score', 'type', 'condition', 'risk', 'elementFit', 'stemRelation', 'branchRelation', 'tenGodEffect', 'climateFit', 'balanceFit', 'relationFit', 'excessRisk', 'bond', 'friction', 'natalBond', 'natalFriction', 'activeShare', 'compFit', 'stemTG', 'branchTG', 'parts', 'tags', 'reasons', 'cautions', 'myDay'];
const TYPES = ['보완형', '활성형', '안정형', '상호자극형', '혼합형'], CONDS = ['조화 높음', '조화', '혼합', '주의 요소 있음'];
const oldAll = [], newAll = [], sp = [], top5 = [], parts = { role: [], johu: [], struct: [], stem: [], branch: [], natal: [] };
let lackN = 0, lackOld = 0, lackNew = 0; const chBad = { o: [], n: [] }, chGood = { o: [], n: [] };
let jongN = 0, jongOld = 0, jongNew = 0; const typeOld = {}, typeNew = {}, condOld = {}, condNew = {};
let attOnlyNeed = true;
for (const ch of charts) {
  const neu = M.compatDayPillars(ch), old = M.compatDayPillarsV1(ch);
  ok(neu.length === 60 && new Set(neu.map(x => x.i)).size === 60, '60갑자 전부가 아님');
  for (const x of neu) {
    ok(FIELDS.every(k => x[k] !== undefined), '필드 누락: ' + FIELDS.filter(k => x[k] === undefined).join(','));
    ok(Number.isInteger(x.score) && x.score >= 0 && x.score <= 100 && x.risk >= 0 && x.risk <= 1, '범위');
    ok(TYPES.includes(x.type) && CONDS.includes(x.condition), '유형·조건 이름');
    ok(x.i % 10 === x.s && x.i % 12 === x.b, '갑자 번호');
    ok(JSON.stringify(x).indexOf('NaN') < 0 && JSON.stringify(x).indexOf('undefined') < 0, 'NaN/undefined');
    ok(x.reasons.length >= 1 && x.parts.reduce((a, p) => a + p.w, 0) === 100, '이유·가중치 합');
    ok(!/좋아합니다|사랑|반드시|확률/.test(x.reasons.join() + x.cautions.join()), '감정 예측·단정 표현');
    for (const k in parts) parts[k].push(x.parts.find(p => p.key === k).v);
  }
  const byI = a => a.slice().sort((x, y) => x.i - y.i);
  const os = byI(old).map(x => x.score), ns = byI(neu).map(x => x.score);
  oldAll.push(...os); newAll.push(...ns); sp.push(corr(rank(os), rank(ns)));
  top5.push(old.slice(0, 5).filter(x => neu.slice(0, 5).some(y => y.i === x.i)).length);
  old.forEach(x => { typeOld[x.type] = (typeOld[x.type] || 0) + 1; condOld[x.condition] = (condOld[x.condition] || 0) + 1; });
  neu.forEach(x => { typeNew[x.type] = (typeNew[x.type] || 0) + 1; condNew[x.condition] = (condNew[x.condition] || 0) + 1; });
  // ④ 결핍·기신 가산
  const u = ch.unified, oi = byI(old), ni = byI(neu);
  for (let i = 0; i < 60; i++) { const e = M.stemEl(oi[i].s); if ((ch.weights.pct[e] || 0) < 5 && u.roleV[e] < 0) { lackN++; if (oi[i].balanceFit > 0.15) lackOld++; if (ni[i].elementFit > 0.15) lackNew++; } }
  // ⑤ 일지 충
  const myB = ch.pillars.day.b, chB = (myB + 6) % 12, f = u.roleV[M.BR_EL[myB]];
  for (let i = 0; i < 60; i++) if (oi[i].b === chB) { if (f < 0) { chBad.o.push(oi[i].branchRelation); chBad.n.push(ni[i].branchRelation); } else if (f >= 0.5) { chGood.o.push(oi[i].branchRelation); chGood.n.push(ni[i].branchRelation); } }
  // ⑥ 종격
  if (u.mode === 'jong') { jongN++; jongOld += old.slice(0, 15).filter(x => M.stemEl(x.s) === u.yong).length / 15; jongNew += neu.slice(0, 15).filter(x => M.stemEl(x.s) === u.yong).length / 15; }
  // ⑧ 끌림: 나→상대의 need 성분 말고는 기존과 같다
  if (charts.indexOf(ch) < 40) {
    const an = M.compatAttraction(ch, 'opposite'), ao = M.compatAttractionV1(ch, 'opposite');
    for (const x of an) { const y = ao.find(z => z.i === x.i); const same = x.attract.toMe.score === y.attract.toMe.score && x.attract.toThem.comps.every((c, k) => c.key === 'need' || c.pts === y.attract.toThem.comps[k].pts); if (!same) attOnlyNeed = false; }
  }
}
ok(attOnlyNeed, '끌림에서 need 말고 다른 성분이 바뀜');
ok(lackNew <= lackN * 0.06, `결핍·기신 오행 가산 ${lackNew}/${lackN}`);
ok(mean(chBad.n) > mean(chBad.o) && mean(chGood.n) < mean(chBad.n), `일지 충 조건부 실패 ${mean(chBad.n).toFixed(2)}/${mean(chGood.n).toFixed(2)}`);
ok(!jongN || jongNew / jongN >= 0.3, `종격 정합 ${(jongNew / (jongN || 1)).toFixed(2)}`);
const pk = Object.keys(parts); let maxC = 0, maxPair = ''; for (let a = 0; a < pk.length; a++) for (let b = a + 1; b < pk.length; b++) { const c = Math.abs(corr(parts[pk[a]], parts[pk[b]])); if (c > maxC) { maxC = c; maxPair = pk[a] + '↔' + pk[b]; } }
ok(maxC < 0.5, `성분 중복 상관 ${maxPair} ${maxC.toFixed(2)}`);
ok(Math.abs(q(newAll, 0.5) - q(oldAll, 0.5)) <= 3, '중앙값이 크게 달라짐');
ok(new Set(newAll).size > 60, '점수 다양성');
// 결정성
const c1 = charts[1]; ok(JSON.stringify(D.evaluate(M, c1, 3, 7)) === JSON.stringify(D.evaluate(M, c1, 3, 7)), '결정적');

const dist = a => `평균 ${mean(a).toFixed(1)} · 하위10% ${q(a, 0.1)} · 중앙 ${q(a, 0.5)} · 상위10% ${q(a, 0.9)} · ${Math.min(...a)}~${Math.max(...a)}`;
const lines = [
  `사주 ${charts.length}개 × 60일주 = ${newAll.length}건`,
  `기존 점수: ${dist(oldAll)}`, `2판 점수: ${dist(newAll)}`,
  `순위 상관 평균 ${mean(sp).toFixed(2)}(하위10% ${q(sp, 0.1).toFixed(2)}) · 상위 5 겹침 평균 ${mean(top5).toFixed(2)}/5`,
  `성분 최대 상관 ${maxPair} ${maxC.toFixed(2)}`,
  `결핍·기신 오행 일간 일주 가산(+0.15 초과): 기존 ${lackOld} → 2판 ${lackNew} / ${lackN}`,
  `일지 충 — 내 일지가 꺼리는 기운: 기존 ${mean(chBad.o).toFixed(2)} → 2판 ${mean(chBad.n).toFixed(2)} · 꼭 필요한 기운: 기존 ${mean(chGood.o).toFixed(2)} → 2판 ${mean(chGood.n).toFixed(2)}`,
  `종격 ${jongN}개 — 상위 15 중 용신 일간 비율: 기존 ${(jongOld / (jongN || 1) * 100).toFixed(0)}% → 2판 ${(jongNew / (jongN || 1) * 100).toFixed(0)}%`,
  `유형 분포(기존→2판): ${TYPES.map(t => `${t} ${typeOld[t] || 0}→${typeNew[t] || 0}`).join(' · ')}`,
  `조건 분포(기존→2판): ${CONDS.map(t => `${t} ${condOld[t] || 0}→${condNew[t] || 0}`).join(' · ')}`,
];
lines.forEach(l => console.log(l));
if (MD) {
  const ex = M.compute({ year: 1992, month: 6, day: 23, hour: 1, minute: 45, gender: 'M', calendar: 'solar', lon: 127.15, timeMode: 'lmt' });
  const o = M.compatDayPillarsV1(ex), n = M.compatDayPillars(ex);
  const md = ['# 60갑자 일주 적합도 2판 — 기존 대비 비교(2026-11-16)', '', `생성: \`node tests/day-compat-sim.cjs ${N} --md\``, '', ...lines.map(l => '- ' + l), '',
    '## 예시 1992.06.23 01:45 남 (' + ex.unified.headline + ' · ' + ex.strength.zone + ')', '', '| 순위 | 기존 | 2판 |', '|---|---|---|',
    ...[...Array(10).keys()].map(k => `| ${k + 1} | ${o[k].ganzhi} ${o[k].score} ${o[k].type} | ${n[k].ganzhi} ${n[k].score} ${n[k].type} |`), '',
    '하위 5(2판): ' + n.slice(-5).map(x => `${x.ganzhi} ${x.score}(기존 ${o.find(y => y.i === x.i).score})`).join(' · '), ''];
  fs.writeFileSync(path.join(root, 'docs', 'DAY_PILLAR_COMPAT_COMPARE_2026-11-16.md'), md.join('\n') + '\n'); console.log('비교표 저장: docs/DAY_PILLAR_COMPAT_COMPARE_2026-11-16.md');
}
if (fails.length) { console.log('FAIL', [...new Set(fails)].slice(0, 12)); process.exit(1); } else console.log('OK');
