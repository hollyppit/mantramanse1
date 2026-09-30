// 일간의 통근(뿌리) 분석 검증
//   node tests/root-sim.js [최대 차트 수=60000]
// 10개 일간 × 시나리오 A~P, 그리고 원국/운 분리·지속 기간·포화·흐름 점수 비연결·억부/조후 분리·충합 처리·득령 분리를 단언으로 확인한다. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
vm.runInThisContext(html.slice(a, html.indexOf('\n', b)));
const M = globalThis.Manse;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const STEM = M.STEM, cfg = M.ROOT_CONFIG, LW = M.ROOT_LEVEL_WEIGHTS;

// 0. 데이터·규칙 검증
const v = M.validateRootHiddenData(); console.log('0. 지장간 구조 검증', v.ok ? '통과' : v.issues.join(' / ')); ok(v.ok, '지장간 본기·중기·여기 구조 불일치: ' + v.issues.join(','));
const table = M.rootRuleTable(); ok(table.length === 10 && table.every(t => t.roots.length >= 4), '일간별 근 규칙표가 비어 있음');
for (const d of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) for (const h of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) { const r = M.getRootRelation(d, h); ok(r.isRoot === (M.stemEl(d) === M.stemEl(h)), `${STEM[d]}-${STEM[h]} 근 판정이 오행 일치와 다름`); if (d === h) ok(r.baseStrength === 1, '동일 천간 강도'); else if (r.isRoot) ok(r.baseStrength < 1, '음양이 다른 같은 오행이 동일 천간과 같은 강도'); }
ok(M.rootLevelLabel(0) === '무근' && M.rootLevelLabel(1) === '매우 약한 통근' && M.rootLevelLabel(29) === '매우 약한 통근' && M.rootLevelLabel(30) === '약한 통근' && M.rootLevelLabel(49) === '약한 통근' && M.rootLevelLabel(50) === '통근' && M.rootLevelLabel(69) === '통근' && M.rootLevelLabel(70) === '강한 통근' && M.rootLevelLabel(84) === '강한 통근' && M.rootLevelLabel(85) === '매우 강한 통근' && M.rootLevelLabel(100) === '매우 강한 통근', '통근 등급 경계');

// 차트 수집: 일간 × (무근/약근/강근) × 강약
let seed = 8080; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const MAXN = +process.argv[2] || 60000, pool = Array.from({ length: 10 }, () => ({ none: [], weak: [], strong: [], all: [] }));
const need = 12; let made = 0;
const enough = () => pool.every(p => p.none.length >= need && p.weak.length >= need && p.strong.length >= need);
while (made < MAXN && !enough()) {
  let c; try { c = M.compute({ year: 1900 + Math.floor(rnd() * 140), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { continue; }
  made++; const n = M.analyzeNatalRoot(c), p = pool[c.pillars.day.s]; p.all.push(c);
  (!n.hasNatalRoot ? p.none : n.natalRootScore >= 70 ? p.strong : n.natalRootScore < 50 ? p.weak : null)?.push(c);
}
console.log(`차트 ${made}개 생성 · 일간별 무근/약근(<50)/강근(≥70) 표본:`, pool.map((p, d) => `${STEM[d]} ${p.none.length}/${p.weak.length}/${p.strong.length}`).join(' '));
pool.forEach((p, d) => { ok(p.none.length >= 3 && p.weak.length >= 3 && p.strong.length >= 3, `${STEM[d]} 일간: 무근/약근/강근 표본 부족`); });

// 운 간지 60개에서 일간 d 기준 근이 있는 것/없는 것
const PIL = Array.from({ length: 60 }, (_, i) => M.yearPillarOf(1984 + i));
const gd = (c, p, lv) => M.analyzeLuckRootSupport(c, p, lv);
const strongP = c => PIL.filter(p => gd(c, p, 'daeun').supportScore >= 55), noneP = c => PIL.filter(p => !gd(c, p, 'daeun').providesRoot), midP = c => PIL.filter(p => { const s = gd(c, p, 'daeun').supportScore; return s > 0 && s < 55; });
const pick = (arr, i = 0) => arr[i % arr.length];
const FORBID = ['유근으로 변경', '유근으로 바뀌', '의지가 약', '사기', '성공하기 어려', '파산', '사고'];
const textOf = s => [s.status, M.rootSummary(s), ...s.reasons, s.fit.note].join(' ');

for (let d = 0; d < 10; d++) {
  const P = pool[d], nm = STEM[d];
  const cN = P.none[0], cW = P.weak[0], cS = P.strong[0];
  const sp = strongP(cN), np = noneP(cN);
  ok(sp.length > 0 && np.length > 0, `${nm}: 운 간지 표본(근 있음/없음) 없음`);
  // A 원국 무근 + 운도 근 없음
  { const s = M.evaluateCurrentRootState(cN, pick(noneP(cN), 1), pick(noneP(cN), 2), pick(noneP(cN), 3), pick(noneP(cN), 4)); ok(!s.natal.hasNatalRoot && s.natal.natalRootScore === 0 && s.currentRootSupport === 0 && s.changes.length === 0 && s.rootStability === null, `${nm} A: 무근+운 근 없음이 0이 아님`); }
  // B 무근 + 대운 강근
  { const before = JSON.stringify(M.analyzeNatalRoot(cN)); const s = M.evaluateCurrentRootState(cN, sp[0], null, null, null);
    ok(s.currentRootSupport > 0 && s.daeun.providesRoot && s.changes.length === 1, `${nm} B: 대운 근 보강이 계산되지 않음`);
    ok(!s.natal.hasNatalRoot && s.natal.natalRootScore === 0 && s.natal.natalRootLevel === '무근' && JSON.stringify(M.analyzeNatalRoot(cN)) === before, `${nm} B: 운 때문에 원국 무근 판정이 바뀜`);
    ok(s.status.includes('원국 무근') && s.status.includes('운에서 근 보강') && !FORBID.some(w => textOf(s).includes(w)), `${nm} B: 상태 문구(${s.status})`); }
  // C 무근 + 세운에서만
  { const s = M.evaluateCurrentRootState(cN, np[0], sp[0], np[1], np[2]); const B = M.evaluateCurrentRootState(cN, sp[0], null, null, null);
    ok(s.seun.providesRoot && !s.daeun.providesRoot && s.currentRootSupport > 0 && !s.natal.hasNatalRoot, `${nm} C: 세운만 근일 때 계산 오류`); ok(s.currentRootSupport < B.currentRootSupport, `${nm} C: 세운(1년)이 대운(10년)보다 크거나 같음`); }
  // D 약근 + 대운 강근
  { const s = M.evaluateCurrentRootState(cW, strongP(cW)[0], null, null, null); ok(s.currentRootSupport > s.natal.natalRootScore && s.currentRootSupport <= 100 && s.natal.hasNatalRoot, `${nm} D: 약근+강근 유입`); }
  // E 강근 + 추가 강근: 포화
  { const s = M.evaluateCurrentRootState(cS, strongP(cS)[0], strongP(cS)[1] || strongP(cS)[0], null, null); const B = M.evaluateCurrentRootState(cN, strongP(cN)[0], strongP(cN)[1] || strongP(cN)[0], null, null);
    ok(s.currentRootSupport <= 100 && s.currentRootSupport >= s.natal.natalRootScore, `${nm} E: 강근 위 추가 근 범위`); ok(s.rootSupportChange < B.rootSupportChange, `${nm} E: 이미 강한 근 위에 더해도 증가폭이 줄지 않음`); ok(s.natal.natalRootScore === M.analyzeNatalRoot(cS).natalRootScore, `${nm} E: 원국 점수 변경`); }
  // F 강근 + 핵심 근 충 / G 형·파·해 / 8·9 충·합
  { const n = M.analyzeNatalRoot(cS), core = n.strongestRoot, snap = JSON.stringify(n);
    const byType = t => PIL.filter(p => M.relationsAmong([{ id: 'n', b: core.branchIdx }, { id: 'luck', b: p.b }]).some(r => r.type === t));
    const ch = byType('충')[0], other = [...byType('형'), ...byType('파'), ...byType('해')][0], hap = byType('육합')[0];
    if (ch) { const s = M.evaluateCurrentRootState(cS, null, ch, null, null); ok(s.rootStability != null && s.rootStability < 100 && s.stabilitySignals.some(g => g.type === '충'), `${nm} F: 핵심 근 충이 안정성에 반영되지 않음`); ok(JSON.stringify(M.analyzeNatalRoot(cS)) === snap && s.natal.hasNatalRoot && s.natal.natalRootScore === n.natalRootScore && s.natal.roots.length === n.roots.length, `${nm} F: 충이 원국 근을 삭제·감점`); ok(s.currentRootSupport >= n.natalRootScore, `${nm} F: 충이 현재 통근을 원국 아래로 깎음`); }
    else fails.push(`${nm} F: 핵심 근(${core.branch})과 충하는 운 간지 없음`);
    if (other) { const s = M.evaluateCurrentRootState(cS, null, other, null, null); ok(s.rootStability != null && s.rootStability < 100, `${nm} G: 형·파·해가 안정성에 반영되지 않음`); ok(JSON.stringify(M.analyzeNatalRoot(cS)) === snap, `${nm} G: 원국 근 변경`); }
    if (hap) { const s = M.evaluateCurrentRootState(cS, null, hap, null, null), c2 = ch ? M.evaluateCurrentRootState(cS, null, ch, null, null) : null;
      ok(s.rootStability <= 100 && s.currentRootSupport === n.natalRootScore || gd(cS, hap, 'seun').providesRoot, `${nm} 합: 합이 근 점수를 바꿈`); { const bondMax = Math.max(0, ...s.stabilitySignals.filter(g => g.kind === 'bond').map(g => g.impact)), clashMax = c2 ? Math.max(0, ...c2.stabilitySignals.filter(g => g.type === '충').map(g => g.impact)) : Infinity; ok(bondMax < clashMax, `${nm} 합: 합 신호(${bondMax.toFixed(2)})가 충 신호(${clashMax.toFixed ? clashMax.toFixed(2) : clashMax})보다 큼`); } ok(s.stabilitySignals.every(g => g.kind === 'bond' ? /판정하지 않음/.test(g.text) : true), `${nm} 합: 합화 판정을 암시`); } }
  // H·K 중첩 / I·J 층 차이
  { const r = strongP(cN); const L = [r[0], r[1] || r[0], r[2] || r[0], r[3] || r[0]]; const s1 = M.evaluateCurrentRootState(cN, L[0]), s2 = M.evaluateCurrentRootState(cN, L[0], L[1]), s3 = M.evaluateCurrentRootState(cN, L[0], L[1], L[2]), s4 = M.evaluateCurrentRootState(cN, L[0], L[1], L[2], L[3]);
    ok(s1.currentRootSupport < s2.currentRootSupport && s2.currentRootSupport <= s3.currentRootSupport && s3.currentRootSupport <= s4.currentRootSupport, `${nm} H/K: 근이 겹칠수록 커지지 않음`);
    ok(s4.currentRootSupport <= 100 && s4.currentRootSupport < s1.daeun.effect + s2.seun.effect + s3.wolun.effect + s4.iljin.effect, `${nm} 4: 단순 합산(무한 증가)`); ok(s4.changes.length === 4, `${nm} K: 네 층 모두 근 유입이 표시되지 않음`);
    const I_ = M.evaluateCurrentRootState(cN, L[0], np[0], null, null), J_ = M.evaluateCurrentRootState(cN, np[0], L[0], null, null); ok(I_.daeun.providesRoot && !I_.seun.providesRoot && J_.seun.providesRoot && !J_.daeun.providesRoot, `${nm} I/J: 층별 구분`); ok(I_.currentRootSupport > J_.currentRootSupport, `${nm} I/J: 대운 근이 세운 근보다 작음`);
    // 3 지속 기간: 같은 간지를 각 층에 넣으면 점수는 같고 가중이 층 순서
    const e = ['daeun', 'seun', 'wolun', 'ilun'].map(lv => gd(cN, L[0], lv)); ok(e[0].supportScore === e[1].supportScore && e[1].supportScore === e[3].supportScore && e[0].effect > e[1].effect && e[1].effect > e[2].effect && e[2].effect > e[3].effect && e[0].durationWeight === LW.daeun, `${nm} 3: 층별 지속 가중 차이`); }
  // L·M·N 억부
  { const weak = P.all.find(c => c.strength.help < 42), str = P.all.find(c => c.strength.help >= 58 && c.strength.help < 72), ext = P.all.find(c => c.strength.help >= 70);
    for (const [tag, c, pred] of [['L 신약', weak, f => f.eokbuFit > 0], ['M 신강', str, f => f.eokbuFit <= 0], ['N 극신강', ext, f => f.eokbuFit < 0]]) { if (!c) { console.log(`   ${nm} ${tag}: 표본 없음`); continue; } const s = M.evaluateCurrentRootState(c, strongP(c)[0]); ok(s.rootSupportChange > 0 && pred(s.fit), `${nm} ${tag}: 억부 적합도 방향(${s.fit.eokbuFit})`); ok(s.fit.eokbuFit !== undefined && s.fit.johuFit !== undefined && 'overallFit' in s.fit, `${nm} 7: 억부·조후 필드 분리`); } }
}

// O·P 억부·조후 충돌 사례(일간별 표본에서 탐색)
console.log('\nO/P 억부·조후가 반대 방향인 사례');
for (let d = 0; d < 10; d++) { let O = 0, Pp = 0, n = 0; for (const c of pool[d].all) { n++; const f = M.rootFitEffect(c, 40); if (f.eokbuFit >= 8 && f.johuFit <= -8) O++; if (f.eokbuFit <= -8 && f.johuFit >= 8) Pp++; } console.log(`   ${STEM[d]}: O(억부+·조후−) ${O}/${n} · P(억부−·조후+) ${Pp}/${n}`); ok(O > 0 || Pp > 0 || n < 30, `${STEM[d]}: 억부·조후 충돌 사례 없음`); }
const anyO = pool.some(p => p.all.some(c => { const f = M.rootFitEffect(c, 40); return f.eokbuFit >= 8 && f.johuFit <= -8; })), anyP = pool.some(p => p.all.some(c => { const f = M.rootFitEffect(c, 40); return f.eokbuFit <= -8 && f.johuFit >= 8; }));
ok(anyO && anyP, 'O/P 사례가 전체에서 나오지 않음'); { const c = pool.flatMap(p => p.all).find(c => { const f = M.rootFitEffect(c, 40); return f.eokbuFit >= 8 && f.johuFit <= -8; }); if (c) { const f = M.rootFitEffect(c, 40); ok(/조후 측면에서는 일부 부담/.test(f.note) && f.overallFit !== f.eokbuFit, 'O: 문구·종합 적합도가 분리되지 않음'); } }

// 5. 기존 흐름 점수는 통근 계산 전후로 같다
{ const c = pool[0].all[0], p = M.yearPillarOf(2027); const e1 = JSON.stringify(M.evaluateLuck(c, p, 'seun')); M.evaluateCurrentRootState(c, p, p, p, p); ok(JSON.stringify(M.evaluateLuck(c, p, 'seun')) === e1, '통근 계산이 흐름 점수를 바꿈'); ok(!Object.keys(JSON.parse(e1)).some(k => /root/i.test(k)), 'evaluateLuck 결과에 통근 필드가 섞임'); }
// 6 신강에서 추가 근이 무조건 긍정이 아니다 / 10 통근과 득령은 별개
const allC = pool.flatMap(p => p.all);
{ const strongCh = allC.filter(c => c.strength.help >= 58), rs = strongCh.slice(0, 300).map(c => M.rootFitEffect(c, 40).eokbuFit); ok(rs.every(x => x <= 0), '6: 신강 원국에서 근 보강의 억부 적합도가 양수'); console.log(`\n6. 신강 원국 ${rs.length}개: 근 보강 억부 적합도 최대 ${Math.max(...rs)}`); }
{ const a1 = allC.filter(c => c.strength.deukryeong && !M.analyzeNatalRoot(c).hasNatalRoot).length, a2 = allC.filter(c => !c.strength.deukryeong && M.analyzeNatalRoot(c).natalRootScore >= 70).length, a3 = allC.filter(c => c.strength.deukryeong && M.analyzeNatalRoot(c).natalRootScore >= 70).length;
  console.log(`10. 득령 O·무근 ${a1}개 · 득령 X·강한 통근 ${a2}개 · 득령 O·강한 통근 ${a3}개`); ok(a1 > 0 && a2 > 0, '10: 득령과 통근이 독립적으로 나오지 않음'); ok(allC.slice(0, 50).every(c => M.analyzeNatalRoot(c).seasonalSupport && 'deukryeong' in M.analyzeNatalRoot(c).seasonalSupport), '10: 득령 정보 분리 필드'); }
// 통근 점수와 신강 자동 연결이 없다: 무근 원국이 신약만 있는 것이 아니고, 강한 통근이 신강만 있는 것이 아니다
{ const none = allC.filter(c => !M.analyzeNatalRoot(c).hasNatalRoot), strongRoot = allC.filter(c => M.analyzeNatalRoot(c).natalRootScore >= 70); const f = (arr, g) => arr.filter(g).length; console.log(`   무근 ${none.length}개 중 신강 이상 ${f(none, c => c.strength.help >= 58)} · 강한 통근 ${strongRoot.length}개 중 신약 이하 ${f(strongRoot, c => c.strength.help < 42)}`); ok(f(none, c => c.strength.help >= 58) > 0 && f(strongRoot, c => c.strength.help < 42) > 0, '무근=신약 / 강한 통근=신강처럼 자동 연결됨'); }
// 약한 근이 있으면 무근이 아니다
ok(allC.every(c => { const n = M.analyzeNatalRoot(c); return (n.roots.length > 0) === n.hasNatalRoot && (n.hasNatalRoot ? n.natalRootScore >= 1 : n.natalRootScore === 0); }), 'hasNatalRoot·natalRootScore 불일치');
// 점수 분포
{ const sc = allC.map(c => M.analyzeNatalRoot(c).natalRootScore), lv = {}; allC.forEach(c => { const l = M.analyzeNatalRoot(c).natalRootLevel; lv[l] = (lv[l] || 0) + 1; }); console.log('\n원국 통근 등급 분포', Object.entries(lv).map(([k, x]) => `${k} ${(x / allC.length * 100).toFixed(0)}%`).join(' · '), `· 평균 ${(sc.reduce((p, q) => p + q, 0) / sc.length).toFixed(0)}`); }
// 금지 표현(전체 문구)
{ let bad = 0; for (const c of allC.slice(0, 400)) { const s = M.evaluateCurrentRootState(c, PIL[3], PIL[8], PIL[15], PIL[22]); if (FORBID.some(w => textOf(s).includes(w))) bad++; } ok(bad === 0, `금지 표현 ${bad}건`); console.log(`금지 표현 ${bad}건`); }

console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + fails.join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
