// 운세 흐름 복합 용신 해석 정합성 검증(2026-11-16) — node tests/luck-yong-final-sim.cjs
//   기준: docs/LUCK_FLOW_FULL_AUDIT.md, docs/LUCK_FLOW_YONG_RECHECK.md. 결과 해설: docs/LUCK_FLOW_YONG_FINAL_2026-11-16.md
// 수정 전(git HEAD)과 수정 후(작업 파일)를 같은 명식·같은 운으로 돌려 비교한다. 파일을 쓰지 않는다.
//  (1) 점수 불변: 대운·세운·월운·일진 흐름 점수·성분·변동·부담·주 흐름·상태, 분야 지수가 한 자리도 바뀌지 않는다
//  (2) 오류 0: 십성 비율 문장이 좋음·나쁨 칸에 들어가면 반드시 통합 역할과 같은 방향이다
//  (3) 보존: 수정 전 정상 복합(개별 기준)·조건부(구조·합충) 해석은 하나도 빠지지 않고 '기준에 따라 달라지는 점'으로 남는다.
//      수정 전 통합 역할과 맞던 좋음·나쁨 문장, 용신·기신 역할 문장은 그대로 남는다
//  (4) 근거 없는 문장만 사실 문장으로 바뀐다(그 수가 수정 전 오류 수와 같다)
//  (5) 종격: 통근 상자가 억부 대신 종격 기준을 쓰고, 억부 칩 대신 종격 유지·파격 칩이 나온다. 종격이 아닌 사주는 그대로
//  (6) 문장 이상 없음(undefined·NaN·반말), 대운·세운·월운·일진 모두
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), os = require('os');
const root = path.join(__dirname, '..');
const head = f => cp.execSync(`git show HEAD:${f}`, { cwd: root, maxBuffer: 64 << 20 }).toString();
const loadEngine = src => { const a = src.indexOf('var MANSE_DATA'), b = src.indexOf('})(typeof window', a); delete globalThis.Manse; vm.runInThisContext(src.slice(a, src.indexOf('\n', b))); return globalThis.Manse; };
const MO = loadEngine(head('engine.js')), MN = loadEngine(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lyf-')), oldLiPath = path.join(tmp, 'luck-interpret-head.js');
fs.writeFileSync(oldLiPath, head('luck-interpret.js'));
const LIO = require(oldLiPath), LIN = require(path.join(root, 'luck-interpret.js'));
const fails = [], ok = (c, m) => { if (!c && fails.length < 30) fails.push(m); };
const pct = (n, d) => d ? Math.round(n / d * 1000) / 10 + '%' : '0%';
let seed = 20261116; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const inps = [];
for (let i = 0; i < 600; i++) inps.push({ year: 1950 + Math.floor(rnd() * 55), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < 0.5 ? 'M' : 'F' });
const GN = ['비겁', '식상', '재성', '관성', '인성'];
const N = +(process.env.N || 200);
const S = { strict: {}, hanshin: {}, strictCards: {}, cards: {}, score: 0, scoreDiff: 0, oldOpp: 0, oldType: { theory: 0, cond: 0, neutral: 0 }, theoryKeys: {}, condKinds: {}, newBadClaim: 0, mixedKept: 0, mixedNeed: 0, factNew: 0, keptUnified: 0, keptUnifiedNeed: 0, roleKept: 0, roleNeed: 0, text: 0, jong: { charts: 0, rootJong: 0, rootEok: 0, chipJong: 0, chipEok: 0, nonJongRootSame: 0, nonJongRootN: 0 }, cardsWithOldErr: {}, cardsWithNewErr: 0 };
const samples = [];
const sig = ev => JSON.stringify([ev.fitScore, ev.ownFit, ev.unifiedScore, ev.eokbuScore, ev.johuScore, ev.relationScore, ev.structureScore, ev.volatilityScore, ev.defenseLoad, ev.intensityScore, ev.primaryFlow, ev.secondaryFlow, ev.condition, ev.flow.flows, ev.alt && ev.alt.value]);
const badText = t => /undefined|NaN|null|\[object/.test(t) || /(한다|이다|된다|있다|없다)\.(\s|$)/.test(t);
for (let ci = 0; ci < N; ci++) {
  let co, cn; try { co = MO.compute(inps[ci]); cn = MN.compute(inps[ci]); } catch (e) { continue; }
  const items = (ch, M) => {
    const out = [];
    ch.daeun.list.forEach(d => out.push(['daeun', d, {}]));
    M.seunRange(ch, 2020, 2035).forEach(s => out.push(['seun', s, { daeun: s.daeun }]));
    const se = M.seunRange(ch, 2026, 2026)[0];
    M.wolun(ch, 2026).forEach(w => out.push(['wolun', w, { seun: se, daeun: se.daeun }]));
    const wm = M.wolun(ch, 2026); M.ilun(ch, 2026, 3).forEach(d => out.push(['ilun', d, { wolun: wm[1], seun: se, daeun: se.daeun }]));
    return out;
  };
  const IO = items(co, MO), IN = items(cn, MN);
  const isJong = cn.unified.mode === 'jong'; if (isJong) S.jong.charts++;
  IN.forEach(([lv, xn, ctxN], k) => {
    const [, xo, ctxO] = IO[k];
    // (1) 점수 불변
    S.score++; if (sig(xo.ev) !== sig(xn.ev)) { S.scoreDiff++; ok(false, `점수 변화 ${lv} ${MN.gzName(xn)} ${inps[ci].year}`); }
    if (lv === 'seun' && k % 4 === 0) { const a = MO.evaluateDomainLuck(co, xo, 'seun', { ms: xo.midMs }), b = MN.evaluateDomainLuck(cn, xn, 'seun', { ms: xn.midMs }); ok(JSON.stringify(['love', 'wealth', 'health', 'accident'].map(q => a[q].score)) === JSON.stringify(['love', 'wealth', 'health', 'accident'].map(q => b[q].score)), '분야 지수 변화'); }
    let ro, rn; try { ro = LIO.build(MO, co, xo, lv, ctxO); rn = LIN.build(MN, cn, xn, lv, ctxN); } catch (e) { ok(false, '해석 오류 ' + e.message); return; }
    S.cards[lv] = (S.cards[lv] || 0) + 1;
    const idsO = ro.evidence.rules.map(q => q.id), idsN = rn.evidence.rules.map(q => q.id), dEl = MN.stemEl(cn.pillars.day.s);
    const roleOf = gi => cn.unified.roleV[(dEl + gi) % 5];
    let oldErrHere = false, strictErrHere = false;
    // 수정 전 십성 비율 문장 → 새 판정으로 다시 분류
    [['NATAL-LOW-', 'good'], ['NATAL-HIGH-', 'bad']].forEach(([pre, dir]) => idsO.filter(id => id.startsWith(pre)).forEach(id => {
      const gname = id.slice(pre.length), gi = GN.indexOf(gname), v = roleOf(gi);
      const same = dir === 'good' ? v > 1e-9 : v < -1e-9;
      if (same) { S.keptUnifiedNeed++; if (idsN.includes(id)) S.keptUnified++; else ok(false, `통합과 맞던 문장 사라짐 ${id}`); return; }
      S.oldOpp++;
      const j = LIN.ratioJudge(MN, cn, xn, xn.ev, MN.luckRelations(cn, xn).rels, gi, dir);
      S.oldType[j.type] = (S.oldType[j.type] || 0) + 1; const strict = dir === 'good' ? v < -1e-9 : v > 1e-9; if (strict) { S.strict[j.type] = (S.strict[j.type] || 0) + 1; if (j.type === 'neutral') strictErrHere = true; } else S.hanshin[j.type] = (S.hanshin[j.type] || 0) + 1;
      if (j.type === 'theory') { j.keys.forEach(q => { S.theoryKeys[q] = (S.theoryKeys[q] || 0) + 1; }); S.mixedNeed++; if (idsN.includes(id + '-THEORY')) S.mixedKept++; else ok(false, '복합 해석 누락 ' + id); }
      else if (j.type === 'cond') { j.reasons.forEach(q => { S.condKinds[q.kind] = (S.condKinds[q.kind] || 0) + 1; }); S.mixedNeed++; if (idsN.includes(id + '-COND')) S.mixedKept++; else ok(false, '조건부 해석 누락 ' + id); }
      else { oldErrHere = true; if (idsN.includes(id + '-FACT')) S.factNew++; else ok(false, '사실 문장 없음 ' + id); }
      if (samples.length < 40 && (j.type !== 'unified')) samples.push({ type: j.type, lv, chart: `${inps[ci].year}-${inps[ci].month}-${inps[ci].day} ${inps[ci].hour}시 ${inps[ci].gender === 'M' ? '남' : '여'} ${['year', 'month', 'day', 'hour'].map(q => MN.gzName(cn.pillars[q])).join(' ')}`, headline: cn.unified.headline, luck: `${lv} ${MN.gzName(xn)}${xn.year ? ' ' + xn.year : ''}`, fit: Math.round(xn.ev.fitScore), before: (dir === 'good' ? ro.good : ro.bad).find(t => t.includes(gname)), after: rn.mixed.concat(rn.facts).find(t => t.includes(gname)) });
    }));
    if (strictErrHere) S.strictCards[lv] = (S.strictCards[lv] || 0) + 1;
    if (oldErrHere) S.cardsWithOldErr[lv] = (S.cardsWithOldErr[lv] || 0) + 1;
    // (2) 수정 후: 좋음·나쁨 칸의 비율 문장은 모두 통합 역할과 같은 방향
    let newErr = false;
    [['NATAL-LOW-', 'good'], ['NATAL-HIGH-', 'bad']].forEach(([pre, dir]) => idsN.filter(id => id.startsWith(pre) && !/-(THEORY|COND|FACT)$/.test(id)).forEach(id => { const v = roleOf(GN.indexOf(id.slice(pre.length))); if (!(dir === 'good' ? v > 1e-9 : v < -1e-9)) { S.newBadClaim++; newErr = true; } }));
    if (newErr) S.cardsWithNewErr++;
    // (3) 용신·기신 역할 문장 보존
    const roleIds = a => a.filter(id => /^ROLE-(GOOD|BAD)-/.test(id)).sort().join(',');
    S.roleNeed++; if (roleIds(idsO) === roleIds(idsN)) S.roleKept++; else ok(false, '역할 문장 변화');
    // (6) 문장
    [...rn.good, ...rn.bad, ...rn.mixed, ...rn.facts].forEach(t => { if (badText(t)) { S.text++; ok(false, '문장 이상: ' + t.slice(0, 80)); } if (isJong && /강약\(억부\)|억부상/.test(t)) { S.jong.eokText = (S.jong.eokText || 0) + 1; ok(false, '종격인데 억부 문구: ' + t.slice(0, 60)); } });
    // (5) 종격
    if (lv === 'seun') {
      const rs = MN.analyzeLuckRootSupport(cn, xn, 'seun');
      if (rs.providesRoot) {
        const fN = MN.rootFitEffect(cn, rs.effect, 'seun'), fO = MO.rootFitEffect(co, rs.effect, 'seun');
        if (isJong) { if (fN.basis === 'jong' && !/억부상/.test(fN.note)) S.jong.rootJong++; else S.jong.rootEok++; }
        else { S.jong.nonJongRootN++; if (fN.eokbuFit === fO.eokbuFit && fN.eokbuLabel === fO.eokbuLabel && fN.basis === 'eokbu') S.jong.nonJongRootSame++; }
        ok(fN.eokbuFit === fO.eokbuFit && fN.johuFit === fO.johuFit, '통근 억부·조후 값 변화');
      }
      const chips = xn.ev.theoryImpact || [];
      if (isJong) { if (chips.some(c => c.key === 'jong') && !chips.some(c => c.key === 'eokbu')) S.jong.chipJong++; else S.jong.chipEok++; }
      else ok(JSON.stringify(chips) === JSON.stringify(xo.ev.theoryImpact), '종격 아닌 사주 칩 변화');
    }
  });
}
const out = {
  범위: { 명식: N, 카드: S.cards },
  '(1) 점수 불변': `${S.score - S.scoreDiff}/${S.score} 동일`,
  '수정 전 반대 방향 비율 문장(오류 후보) 재분류': { 전체: S.oldOpp, '개별 기준으로 성립(정상 복합)': S.oldType.theory, '구조·합충으로 성립(조건부)': S.oldType.cond, '어떤 근거도 없음(실제 오류)': S.oldType.neutral, 기준별: S.theoryKeys, 조건별: S.condKinds },
  '그중 통합 역할이 정반대(기신=좋음·용신=나쁨)': S.strict, '그중 한신(통합 중립)': S.hanshin, '정반대인데 근거 없음이 있던 카드': S.strictCards, '수정 전 실제 오류가 있던 카드': S.cardsWithOldErr,
  '(2) 수정 후 좋음·나쁨 칸의 반대 방향 비율 문장': S.newBadClaim, '수정 후 오류 카드': S.cardsWithNewErr,
  '(3) 복합·조건부 보존': `${S.mixedKept}/${S.mixedNeed}`, '통합과 맞던 문장 보존': `${S.keptUnified}/${S.keptUnifiedNeed}`, '역할 문장 보존(카드)': `${S.roleKept}/${S.roleNeed}`,
  '(4) 사실 문장으로 바뀐 것': `${S.factNew}/${S.oldType.neutral}`,
  '(5) 종격': S.jong, '(6) 문장 이상': S.text,
};
console.log(JSON.stringify(out, null, 1));
if (process.env.SAMPLES) console.log(JSON.stringify(samples, null, 1));
ok(S.scoreDiff === 0, '점수 변화 있음'); ok(S.newBadClaim === 0, '오류 남음'); ok(S.mixedKept === S.mixedNeed, '복합·조건부 누락'); ok(S.factNew === S.oldType.neutral, '사실 문장 수 불일치'); ok(S.jong.rootEok === 0 && S.jong.chipEok === 0, '종격 억부 표시 남음'); ok(S.jong.nonJongRootSame === S.jong.nonJongRootN, '종격 아닌 통근 변화'); ok(S.text === 0, '문장 이상');
fs.rmSync(tmp, { recursive: true, force: true });
if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log('모든 검증 통과');
