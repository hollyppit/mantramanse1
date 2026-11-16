// 운세 흐름 전수 분석 검증(읽기 전용) — 엔진·표시 모듈을 불러 값만 계산한다. 어떤 파일도 쓰지 않는다.
//   node tools/luck-flow-audit-sim.cjs   (결과 해설: docs/LUCK_FLOW_FULL_AUDIT.md)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = process.argv[2] || path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a = src.indexOf('var MANSE_DATA'), b = src.indexOf('})(typeof window', a);
vm.runInThisContext(src.slice(a, src.indexOf('\n', b)));
const M = globalThis.Manse;
require(path.join(root, 'report/v2/luck6.js')); const L6 = globalThis.ReportV2.Luck6;
const LI = require(path.join(root, 'luck-interpret.js'));
const LC = require(path.join(root, 'luck-cycle.js'));
const r1 = v => Math.round(v * 10) / 10;
const corr = (x, y) => { const n = x.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0; };
let seed = 20261116; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const out = {};

// ── 1. 표본 600명 → 경계 사례 자동 선택
const pool = [];
for (let i = 0; i < 600; i++) {
  const inp = { year: 1950 + Math.floor(rnd() * 55), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < 0.5 ? 'M' : 'F' };
  try { pool.push({ inp, ch: M.compute(inp) }); } catch (e) { }
}
const desc = ({ inp, ch }) => {
  const u = ch.unified;
  return { 입력: `${inp.year}-${inp.month}-${inp.day} ${inp.hour}시 ${inp.gender}`, 원국: ['year', 'month', 'day', 'hour'].map(k => M.gzName(ch.pillars[k])).join(' '),
    돕는힘: r1(ch.strength.help), 강약: ch.strength.zone, 기후: `temp ${r1(ch.climate.temp)} hum ${r1(ch.climate.hum)}`, 오행: ch.weights.pct.map(r1).join('/'), 십성묶음: ch.weights.groups.map(r1).join('/'),
    통합: `${u.mode} · ${u.primaryName}${u.secondaryName ? '+' + u.secondaryName : ''} · 용 ${M.EL_K[u.yong]} 희 ${M.EL_K[u.hee]} 기 ${M.EL_K[u.gi]}`, 역할값: u.roleV.map(v => r1(v)).join('/'), 종격: u.jong.status, 충돌: u.conflicts.length };
};
const pick = {};
const by = (f) => pool.slice().sort((x, y) => f(y) - f(x))[0];
pick['신강(극단)'] = by(x => x.ch.strength.help);
pick['신약(극단)'] = by(x => -x.ch.strength.help);
pick['한랭(조후 불균형)'] = by(x => -x.ch.climate.temp);
pick['조열(조후 불균형)'] = by(x => x.ch.climate.temp);
pick['억부·조후 충돌'] = pool.find(x => x.ch.unified.mode === 'conflict') || null;
pick['오행 과다'] = by(x => Math.max(...x.ch.weights.pct));
pick['오행 결핍(0% 오행 2개 이상)'] = pool.find(x => x.ch.weights.pct.filter(v => v < 1).length >= 2) || by(x => -Math.min(...x.ch.weights.pct));
pick['종격(jin)'] = pool.find(x => x.ch.unified.jong.status === 'jin') || null;
out.modeDist = pool.reduce((m, x) => (m[x.ch.unified.mode] = (m[x.ch.unified.mode] || 0) + 1, m), {});
out.primaryDist = pool.reduce((m, x) => (m[x.ch.unified.primary] = (m[x.ch.unified.primary] || 0) + 1, m), {});

// ── 2. 사례별 대운 10개 + 올해 세운 계산값
const Y0 = 2026;
out.cases = {};
for (const [name, x] of Object.entries(pick)) {
  if (!x) { out.cases[name] = '표본에서 찾지 못함'; continue; }
  const ch = x.ch;
  const du = ch.daeun.list.map(d => ({ 대운: M.gzName(d), 나이: d.startAge, 십성: d.stemTG + '/' + d.branchTG, 운성: d.unseong, fit: r1(d.ev.fitScore), 통합: r1(d.ev.weights.unified * d.ev.unifiedScore), 관계: r1(d.ev.weights.relation * d.ev.relationScore), 구조: r1(d.ev.weights.structure * d.ev.structureScore), 억부단독: r1(d.ev.eokbuScore), 조후단독: r1(d.ev.johuScore), 흐름: M.flowLabel(d.ev), 육분류: L6.of(d.ev).label, 변동: Math.round(d.ev.volatilityScore), 부담: Math.round(d.ev.defenseLoad) }));
  const se = M.seunRange(ch, Y0, Y0)[0];
  out.cases[name] = { ...desc(x), 가중치_대운: Object.fromEntries(Object.entries(ch.daeun.list[0].ev.weights).map(([k, v]) => [k, r1(v * 100) + '%'])), 대운: du,
    세운2026: { 간지: M.gzName(se), fit: r1(se.ev.fitScore), own: r1(se.ev.ownFit), 대운fit: se.daeun ? r1(se.daeun.ev.fitScore) : null, chain: se.ev.chain ? r1(se.ev.chain.v) : 0, 화면식_40_60: se.daeun ? r1(0.4 * se.daeun.score.total + 0.6 * se.score.total) : null } };
}

// ── 3. 중복 반영: 60갑자 × 표본 200명에서 성분 사이 상관
{
  const U = [], S = [], E = [], J = [], R = [], F = [];
  for (const { ch } of pool.slice(0, 200)) for (let i = 0; i < 60; i++) {
    const p = { s: i % 10, b: i % 12 }; const ev = M.evaluateLuck(ch, p, 'seun');
    U.push(ev.unifiedScore); S.push(ev.structureScore); E.push(ev.eokbuScore); J.push(ev.johuScore); R.push(ev.relationScore); F.push(ev.fitScore);
  }
  out.corr = { '통합↔구조': r1(corr(U, S) * 100) / 100, '통합↔억부단독': r1(corr(U, E) * 100) / 100, '통합↔조후단독': r1(corr(U, J) * 100) / 100, '통합↔관계': r1(corr(U, R) * 100) / 100, '구조↔억부단독': r1(corr(S, E) * 100) / 100 };
  // 구조 성분의 roleGate: 한신(역할값 0) 묶음은 채움 보상이 그대로 들어가는가
  let hanFill = 0, hanTot = 0;
  for (const { ch } of pool.slice(0, 200)) { const dEl = M.stemEl(ch.pillars.day.s); ch.weights.groups.forEach((pc, gi) => { const e = (dEl + gi) % 5; if (ch.unified.roleV[e] === 0) { hanTot++; if (pc < 20) hanFill++; } }); }
  out.roleGateHanshin = { 한신묶음수: hanTot, 그중_부족해서_채움보상받는묶음: hanFill };
}

// ── 4. 화면 세운 설명식(대운 40% + 세운 60%)과 실제 흐름 점수 차이
{
  let n = 0, diff = 0, maxD = 0, big = 0;
  for (const { ch } of pool.slice(0, 200)) for (const se of M.seunRange(ch, 2020, 2035)) {
    if (!se.daeun) continue; const shown = 0.4 * se.daeun.score.total + 0.6 * se.score.total, d = Math.abs(shown - se.combined);
    n++; diff += d; maxD = Math.max(maxD, d); if (d >= 3) big++;
  }
  out.seunFormula = { 표본: n, 평균차: r1(diff / n), 최대차: r1(maxD), 차이3점이상비율: r1(big / n * 100) + '%' };
}

// ── 5. 만세력(주 흐름+overlay) vs 타임라인(Luck6) 판정 불일치
{
  let n = 0, volMismatch = 0, defMismatch = 0, labelDiff = 0;
  for (const { ch } of pool.slice(0, 200)) for (const se of M.seunRange(ch, 2020, 2035)) {
    const ev = se.ev, l6 = L6.of(ev).label; n++;
    const ovV = ev.overlays.volatility.active, ovD = ev.overlays.defense.active;
    if (ovV && l6 !== '변동기' && l6 !== '방어기') volMismatch++;
    if (ovD && l6 !== '방어기') defMismatch++;
    if (l6 !== ev.phase) labelDiff++;
  }
  out.luck6 = { 세운표본: n, '만세력 변동 표시인데 타임라인은 변동기·방어기 아님': r1(volMismatch / n * 100) + '%', '만세력 방어 표시인데 타임라인은 방어기 아님': r1(defMismatch / n * 100) + '%', '두 화면 대표 분류가 다름': r1(labelDiff / n * 100) + '%' };
}

// ── 6. luck-interpret: 기신·구신 묶음인데 "부족을 채우는 쪽" 문장이 나가는 비율, 같은 카드에 좋음·나쁨이 함께 나가는 비율
{
  let n = 0, lowGi = 0, contra = 0, highYong = 0;
  for (const { ch } of pool.slice(0, 200)) for (const se of M.seunRange(ch, 2020, 2035)) {
    let r; try { r = LI.build(M, ch, se, 'seun', { daeun: se.daeun }); } catch (e) { continue; }
    n++;
    const dEl = M.stemEl(ch.pillars.day.s), tr = JSON.stringify(r);
    const ids = (r.evidence && r.evidence.rules || []).map(x => x.id);
    const lowIds = ids.filter(id => /^NATAL-LOW-/.test(id)), highIds = ids.filter(id => /^NATAL-HIGH-/.test(id));
    const GN = ['비겁', '식상', '재성', '관성', '인성'];
    for (const id of lowIds) { const gi = GN.indexOf(id.replace('NATAL-LOW-', '')); const e = (dEl + gi) % 5; if (ch.unified.roleV[e] < 0) { lowGi++; break; } }
    for (const id of highIds) { const gi = GN.indexOf(id.replace('NATAL-HIGH-', '')); const e = (dEl + gi) % 5; if (ch.unified.roleV[e] > 0) { highYong++; break; } }
    const hasG = ids.some(id => /^ROLE-GOOD|^NATAL-LOW/.test(id)), hasB = ids.some(id => /^ROLE-BAD|^NATAL-HIGH/.test(id));
    if (hasG && hasB) contra++;
  }
  out.interpret = { 세운표본: n, '기신·구신 묶음을 부족 채움(좋음)으로 쓴 카드': r1(lowGi / n * 100) + '%', '용신·희신 묶음을 과다(나쁨)로 쓴 카드': r1(highYong / n * 100) + '%', '한 카드에 좋음·나쁨 근거가 함께': r1(contra / n * 100) + '%' };
}

// ── 7. 관계 성분: 기신 자리를 충하면 점수는 +인데 화면 문구(LUCK_EVENT 충)는 늘 변동·다툼으로 쓰는지 → 점수 부호 분포
{
  let pos = 0, neg = 0;
  for (const { ch } of pool.slice(0, 200)) for (let i = 0; i < 60; i++) {
    const p = { s: i % 10, b: i % 12 }, ev = M.evaluateLuck(ch, p, 'seun');
    for (const pt of ev.parts) if (pt.comp === 'relation' && /충돌·변동/.test(pt.label)) { if (pt.v > 0) pos++; else neg++; }
  }
  out.chungSign = { '지지충 점수 +(기신 자리 충)': pos, '지지충 점수 −': neg };
}

// ── 8. 60갑자 평균 빼기: 사람마다 대운 10개 흐름 점수 평균
{
  const avgs = pool.slice(0, 200).map(({ ch }) => ch.daeun.list.reduce((s, d) => s + d.ev.fitScore, 0) / 10);
  avgs.sort((x, y) => x - y);
  out.daeunMean = { 최소: r1(avgs[0]), 중앙: r1(avgs[100]), 최대: r1(avgs[199]) };
  // 같은 사람의 조건상태 분포(순풍·보통·주의·부담) — 대운 전체
  const cnt = {}; pool.slice(0, 200).forEach(({ ch }) => ch.daeun.list.forEach(d => { cnt[d.ev.condition] = (cnt[d.ev.condition] || 0) + 1; }));
  out.daeunCondDist = cnt;
}

// ── 9. 교운기: 대운이 바뀌는 해의 세운이 어느 대운을 상위 운으로 쓰는가
{
  const rows = []; let mismatchYears = 0, total = 0;
  for (const { ch } of pool.slice(0, 100)) for (let k = 1; k < 6; k++) {
    const d = ch.daeun.list[k], Y = new Date(d.startMs).getUTCFullYear(); if (Y < 1900 || Y > 2099) continue;
    const se = M.seunRange(ch, Y, Y)[0]; if (!se) continue; total++;
    const used = se.daeun; const startInYear = d.startMs; const ip = M.termsOf(Y)[2];
    const frac = (startInYear - ip) / (365.2422 * 86400000);
    if (used !== d) mismatchYears++;
    if (rows.length < 4) rows.push({ 대운시작: new Date(d.startMs).toISOString().slice(0, 10), 그해세운이쓴대운: M.gzName(used), 새대운: M.gzName(d), 새대운이그해차지하는비율: r1(Math.max(0, Math.min(1, 1 - frac)) * 100) + '%' });
  }
  out.gyoungi = { 대운바뀌는해: total, '그해 세운이 이전 대운을 씀': mismatchYears, 예시: rows };
  // 교운기 전후 흐름 점수 점프
  const jumps = []; for (const { ch } of pool.slice(0, 200)) for (let k = 1; k < 8; k++) jumps.push(Math.abs(ch.daeun.list[k].ev.fitScore - ch.daeun.list[k - 1].ev.fitScore));
  jumps.sort((x, y) => x - y); out.gyoungi.대운간점프 = { 중앙: r1(jumps[jumps.length >> 1]), 상위10: r1(jumps[Math.floor(jumps.length * 0.9)]), 최대: r1(jumps[jumps.length - 1]) };
}

// ── 10. 분야 지수의 적합도 중복: 재물 fit 성분 = own·fit + 억부단독 + 조후단독
{
  const F1 = [], W1 = [];
  for (const { ch } of pool.slice(0, 100)) for (let i = 0; i < 60; i++) { const p = { s: i % 10, b: i % 12 }; const F = M.extractLuckFeatures(ch, p, 'seun'); F1.push(F.fit); W1.push(F.eokbu); }
  out.domainFit = { 'F.fit(통합 포함)↔F.eokbu(억부 단독) 상관': r1(corr(F1, W1) * 100) / 100, 설명: '분야 적합도 = 50 + general×0.5×(own×fit + eokbu×억부 + johu×조후)' };
  // 분야 지수 상위 운 비율 vs 흐름 점수 상위 운 비율
  out.chainWeights = { 흐름점수_세운: '자기 60% + 대운 40% + 기둥 사이 합충(±12)', 분야지수_세운: M.DOMAIN_LEVEL_WEIGHTS.seun, 흐름점수_월운: '자기 60% + 세운 40%(세운이 대운 품음)', 분야지수_월운: M.DOMAIN_LEVEL_WEIGHTS.wolun, 흐름점수_일진: '자기 75% + 월운 25%', 분야지수_일진: M.DOMAIN_LEVEL_WEIGHTS.ilun };
}

// ── 11. 12운성은 점수에 들어가는가(같은 간지·다른 운성 비교가 불가하므로 소스 검색 결과만 표시)
out.unseongInScore = /unseong\(/.test(src.slice(src.indexOf('function evaluateLuck('), src.indexOf('function evaluateLuckFlow(')));

// ── 12. 월운 체인: 대운과 월운 사이 합충은 보는가(상위 운 기둥은 세운 하나)
{
  const ch = pool[0].ch, mo = M.monthsOfYear(2026)[0], se = M.seunRange(ch, 2026, 2026)[0];
  const ev = M.evaluateLuck(ch, mo, 'wolun', { parent: se.ev });
  out.wolunChain = { 상위운이름: ev.chain && ev.chain.upName, 링크수: ev.chain ? ev.chain.links.length : 0 };
}

console.log(JSON.stringify(out, null, 1));
