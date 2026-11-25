// 명리 정합성 개선 1차(M1·M3·M4·M6·M7) 회귀 비교 — 같은 300개 명식으로 수정 전(운영 폴더 파일)과 수정 후(개발 사본)를 비교한다.
//   수정 전: 이 저장소(운영 파일, 읽기만) · 수정 후: ../manse-dev-myeongri-fix-1 (개발 사본)
//   수정 후는 세 갈래로 돌려 변화의 원인을 가른다: M1(공통 판정만) · M1+M3(제화 성립 구조만) · 전체(M1+M3+M4)
//   비교: A 명식 기본(원국·오행·십성·강약·억부·조후·격국·종격·오신) · B 구조 상태 · C 운(대운·세운·월운·일진·분야 지표·등급) · D 화면 표시 모델
//   출력: docs/myeongri-audit-2026-11-25/data-fix1/ (기존 감사 data/ 는 건드리지 않음)
//   사용: node tools/myeongri-fix-20261125/regress.cjs
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const OPS = path.join(__dirname, '..', '..'), DEV = path.resolve(OPS, '..', 'manse-dev-myeongri-fix-1');
const OUT = path.join(OPS, 'docs', 'myeongri-audit-2026-11-25', 'data-fix1');
const FILES = ['engine.js', 'luck-grade.js', 'luck-element-theme.js', 'jonggyeok.js', 'ten-god-roles.js'];
const sha = (root, f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 16);
function load(root, flags) {
  const c = { console }; c.window = c; vm.createContext(c);
  FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f }));
  const M = c.Manse;
  if (flags) { Object.assign(M.UNIFIED_CFG, flags.U || {}); Object.assign(M.LUCK_CFG.structure, flags.S || {}); }
  return { M, LG: c.MantraLuckGrade, TR: c.MantraTenGodRoles };
}
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const mod = (a, n) => ((a % n) + n) % n, stemEl = s => Math.floor(s / 2), r3 = x => Math.round(x * 1000) / 1000;
const B4 = ['관살혼잡', '상관견관', '효신탈식(도식)', '군겁쟁재'], GOOD3 = ['식신제살', '살인상생', '상관패인'], ALL7 = [...B4, ...GOOD3];
const TKEY = { '살인상생': 'salin', '식신제살': 'sikjesal', '상관견관': 'gyeongwan', '상관패인': 'paein', '관살혼잡': 'honjap', '효신탈식(도식)': 'dosik', '군겁쟁재': 'bigeopjaeng' };
// 수정 전 엔진의 B안(내보내지 않는 함수라 같은 식 사본) — 운 점수가 쓰던 판정
function patEstablishedOld(ch, name) {
  const G = ch.weights.groups, help = ch.strength.help, dEl = stemEl(ch.pillars.day.s), tp = ch.weights.tgPct, rv = i => ch.unified.roleV[mod(dEl + i, 5)];
  if (name === '관살혼잡') return (tp['정관'] || 0) >= 5 && (tp['편관'] || 0) >= 5 && !((tp['식신'] || 0) >= 8) && !(help < 50 && G[4] >= 15);
  if (name === '상관견관') return rv(3) > 0 && (tp['정인'] || 0) < 8 && (tp['상관'] || 0) >= 5 && (tp['정관'] || 0) >= 5;
  if (name === '효신탈식(도식)') return rv(1) > 0 && G[2] < 10 && (tp['편인'] || 0) >= 8;
  if (name === '군겁쟁재') return G[3] < 10 && G[1] < 10;
  return true;
}
function snapshot(E, inp) {
  const { M, LG, TR } = E, ch = M.compute(inp), u = ch.unified, K = M.gyeokCore(ch), Z = M.jongCore(ch), by = ch.solar.y;
  const named = ch.patterns.named || ch.patterns.list, isNew = !!ch.patterns.named;
  // B 구조 상태: 성립·후보·미성립 (수정 전은 이름 판정 + 운 점수 B안으로 같은 기준을 덧씌워 본 값)
  const stat = {}; ALL7.forEach(n => { const p = named.find(x => x.name === n); stat[n] = !p ? '미성립' : isNew ? p.status : (B4.includes(n) ? (patEstablishedOld(ch, n) ? '성립' : '후보') : '이름만(역할 미확인)'); });
  // 운 점수가 감점에 쓰는 원국 구조(B4, 참고 제외)
  const scoreUse = B4.filter(n => { const p = named.find(x => x.name === n); return p && p.level !== '참고' && (isNew ? p.status === '성립' : patEstablishedOld(ch, n)); });
  // D 화면 표시 모델
  const ag = TR.agreePatterns(M, ch), dropped = ag.dropped || [];
  const nf = M.natalFlow(ch), flowChips = nf.chips.filter(c => c.plain && !dropped.includes(c.name)).map(c => c.name), chipPlain = nf.chips.filter(c => c.plain).map(c => c.name);
  const ix = TR.analyze(M, ch).interactions, tgr = {}; ALL7.forEach(n => { const o = ix.find(x => x.key === TKEY[n]); tgr[n] = o ? (o.candidate ? '후보' : o.status) : null; });
  const display = { chipPlain, relList: ch.patterns.list.map(p => p.name), relCand: (ch.patterns.candidates || []).map(p => p.name), flowChips, detail: ag.map(p => p.name), tgr };
  // C 운
  const daeun = ch.daeun.list.map(x => x.ev.fitScore);
  const seunX = M.seunRange(ch, by + 1, Math.min(by + 80, M.MAX_Y - 1)), seun = seunX.map(x => x.combined);
  const wol = M.wolun(ch, 2026).map(x => x.combined), il = M.ilun(ch, 2026, 3).map(x => x.combined);
  const dom = {}; seunX.filter(x => x.year >= 2020 && x.year <= 2029).forEach(x => { const r = M.evaluateDomainLuck(ch, x, 'seun', { ms: x.midMs }); Object.keys(r).forEach(k => { if (r[k] && typeof r[k].score === 'number') (dom[k] = dom[k] || []).push([r[k].score, r[k].band]); }); });
  const g = v => LG.flow(v, M).n;
  return {
    A: { pillars: ['year', 'month', 'day', 'hour'].map(k => M.gzName(ch.pillars[k])).join(' '), pct: ch.weights.pct.map(r3), tg: Object.values(ch.weights.tgPct).map(r3), help: r3(ch.strength.help), zone: ch.strength.zone,
      eokbu: ch.yongAll.eokbu.yong, johu: ch.yongAll.johu.applicable ? ch.yongAll.johu.yong : null, gyeok: K.kind + '/' + K.status, jong: Z.status, mode: u.mode, primary: u.primaryName,
      roles: [0, 1, 2, 3, 4].map(e => u.roles[e]).join(','), yong: u.yong, roleV: u.roleV.map(r3), conditions: Object.keys(u.conditions).length, eokbuLog: ch.yongAll.eokbu.log.join(' ') },
    B: stat, scoreUse, display, dedup: u.dedup || [], rounds: ch.patterns.settleRounds,
    C: { daeun, seun, wol, il, dom, gDaeun: daeun.map(g), gSeun: seun.map(g), gWol: wol.map(g), gIl: il.map(g) },
  };
}
const VERS = {
  before: { root: OPS },
  M1: { root: DEV, flags: { U: { jehwaEstablishedOnly: false, jehwaDedup: false } } },
  M1M3: { root: DEV, flags: { U: { jehwaEstablishedOnly: true, jehwaDedup: false } } },
  after: { root: DEV },
};
const S = {}; for (const [k, v] of Object.entries(VERS)) { const E = load(v.root, v.flags); S[k] = dev.map(inp => snapshot(E, inp)); }
// ── 비교 함수
const flat = c => [...c.daeun, ...c.seun, ...c.wol, ...c.il, ...Object.values(c.dom).flat().map(x => x[0])];
function scoreDiff(a, b) {
  let charts = 0, n = 0, sum = 0, max = 0, min = 0, cnt = 0, gradeCharts = 0, gradeN = 0, bandN = 0; const by = { daeun: 0, seun: 0, wol: 0, il: 0, dom: 0 };
  a.forEach((x, i) => {
    const y = b[i]; let hit = false, gh = false;
    const cmp = (p, q, key) => p.forEach((v, j) => { const d = q[j] - v; if (Math.abs(d) > 1e-9) { hit = true; by[key]++; n++; sum += d; cnt++; if (d > max) max = d; if (d < min) min = d; } });
    cmp(x.C.daeun, y.C.daeun, 'daeun'); cmp(x.C.seun, y.C.seun, 'seun'); cmp(x.C.wol, y.C.wol, 'wol'); cmp(x.C.il, y.C.il, 'il');
    Object.keys(x.C.dom).forEach(k => cmp(x.C.dom[k].map(z => z[0]), (y.C.dom[k] || []).map(z => z[0]), 'dom'));
    ['gDaeun', 'gSeun', 'gWol', 'gIl'].forEach(k => x.C[k].forEach((v, j) => { if (v !== y.C[k][j]) { gh = true; gradeN++; } }));
    Object.keys(x.C.dom).forEach(k => x.C.dom[k].forEach((z, j) => { if (y.C.dom[k] && z[1] !== y.C.dom[k][j][1]) { gh = true; bandN++; } }));
    if (hit) charts++; if (gh) gradeCharts++;
  });
  return { chartsChanged: charts, valuesChanged: n, mean: cnt ? r3(sum / cnt) : 0, max: r3(max), min: r3(min), byLevel: by, gradeChangedCharts: gradeCharts, gradeChanges: gradeN, domainBandChanges: bandN };
}
function basicDiff(a, b) {
  const keys = Object.keys(a[0].A), out = {}; keys.forEach(k => out[k] = 0);
  a.forEach((x, i) => keys.forEach(k => { if (JSON.stringify(x.A[k]) !== JSON.stringify(b[i].A[k])) out[k]++; }));
  return out;
}
// 상태 분포
const dist = arr => { const o = {}; ALL7.forEach(n => { o[n] = {}; arr.forEach(x => { const s = x.B[n]; o[n][s] = (o[n][s] || 0) + 1; }); }); return o; };
// 화면 표시 변화(수정 전 → 후): 화면마다 구조 이름 집합 비교
const SCREENS = ['relList', 'flowChips', 'detail'];
function displayDiff(a, b) {
  const o = {}; SCREENS.forEach(s => o[s] = { charts: 0, removed: {}, added: {} }); o.tgr = { charts: 0, changes: {} }; let any = 0;
  a.forEach((x, i) => {
    const y = b[i]; let hit = false;
    SCREENS.forEach(s => { const A0 = new Set(x.display[s]), B0 = new Set(y.display[s]); let h = false; A0.forEach(n => { if (!B0.has(n)) { o[s].removed[n] = (o[s].removed[n] || 0) + 1; h = true; } }); B0.forEach(n => { if (!A0.has(n)) { o[s].added[n] = (o[s].added[n] || 0) + 1; h = true; } }); if (h) { o[s].charts++; hit = true; } });
    let th = false; ALL7.forEach(n => { if (x.display.tgr[n] !== y.display.tgr[n]) { const k = `${n}: ${x.display.tgr[n]}→${y.display.tgr[n]}`; o.tgr.changes[k] = (o.tgr.changes[k] || 0) + 1; th = true; } }); if (th) { o.tgr.charts++; hit = true; }
    if (hit) any++;
  });
  o.anyScreenCharts = any; return o;
}
// 일관성: 7종 구조마다 [화면 목록 · 기운 흐름 칩(쉬운 말 있는 것만) · 상세풀이 목록 · 십성 카드 성립 · (약점 4종) 운 점수 사용]이 서로 같은가
function consistency(arr) {
  let bad = 0; const by = {}, ex = [];
  arr.forEach((x, i) => {
    let h = false;
    ALL7.forEach(n => {
      const rel = x.display.relList.includes(n);
      const vals = { 화면목록: rel, 상세풀이: x.display.detail.includes(n), 십성카드: x.display.tgr[n] === 'on' || x.display.tgr[n] === 'weak' };
      if (x.display.chipPlain.includes(n)) vals.기운흐름칩 = x.display.flowChips.includes(n);   // 쉬운 말 문구가 있는 구조만 칩으로 나온다
      if (B4.includes(n)) vals.운점수 = x.scoreUse.includes(n);
      const v = Object.values(vals);
      if (!v.every(z => z === v[0])) { h = true; by[n] = (by[n] || 0) + 1; if (ex.length < 12) ex.push({ idx: i, name: n, vals }); }
    });
    if (h) bad++;
  });
  return { chartsInconsistent: bad, byStructure: by, examples: ex };
}
const R = {
  runAt: new Date().toISOString(), sample: '300개 생성식(감사 03과 같은 표본)',
  hashes: { before: Object.fromEntries(FILES.map(f => [f, sha(OPS, f)])), after: Object.fromEntries(FILES.map(f => [f, sha(DEV, f)])) },
  structureDist: { before: dist(S.before), after: dist(S.after) },
  basic: { M1: basicDiff(S.before, S.M1), M1M3: basicDiff(S.before, S.M1M3), after: basicDiff(S.before, S.after) },
  score: { M1: scoreDiff(S.before, S.M1), M3: scoreDiff(S.M1, S.M1M3), M4: scoreDiff(S.M1M3, S.after), total: scoreDiff(S.before, S.after) },
  display: displayDiff(S.before, S.after),
  consistency: { before: consistency(S.before), after: consistency(S.after) },
  dedup: { charts: S.after.filter(x => x.dedup.length).length, items: S.after.flatMap((x, i) => x.dedup.map(d => Object.assign({ idx: i }, d))) },
  rounds: S.after.reduce((o, x) => (o[x.rounds] = (o[x.rounds] || 0) + 1, o), {}),
};
// M3 추적: 제화 근거가 바뀐 명식
R.jehwaChange = { M3: S.M1.map((x, i) => ({ i, a: x.A, b: S.M1M3[i].A })).filter(z => z.a.roleV.join() !== z.b.roleV.join() || z.a.conditions !== z.b.conditions).map(z => ({ idx: z.i, roleV: [z.a.roleV, z.b.roleV], conditions: [z.a.conditions, z.b.conditions], roles: [z.a.roles, z.b.roles] })) };
R.jehwaChange.M4 = S.M1M3.map((x, i) => ({ i, a: x.A, b: S.after[i].A })).filter(z => z.a.roleV.join() !== z.b.roleV.join()).map(z => ({ idx: z.i, roleV: [z.a.roleV, z.b.roleV], roles: [z.a.roles, z.b.roles] }));
// 점수 변화 명식 목록(원인별)
const changedIdx = (a, b) => a.map((x, i) => flat(x.C).some((v, j) => Math.abs(flat(b[i].C)[j] - v) > 1e-9) ? i : -1).filter(i => i >= 0);
R.changedCharts = { M1: changedIdx(S.before, S.M1), M3: changedIdx(S.M1, S.M1M3), M4: changedIdx(S.M1M3, S.after), total: changedIdx(S.before, S.after) };
// M6: 좋은 구조 역할 반대 사례(감사 42) 재검사 — 수정 후 성립으로 표시되는 좋은 구조 중 역할 반대가 남았는가
R.m6 = (() => { const E = load(DEV); let wrongShown = 0, keptOk = 0, toCand = 0; const ex = [];
  dev.forEach((inp, i) => { const { M } = E, ch = M.compute(inp), d = stemEl(ch.pillars.day.s), role = g => ch.unified.roles[mod(d + g, 5)];
    for (const p of ch.patterns.named) { if (!GOOD3.includes(p.name)) continue;
      const opp = (p.name === '식신제살' && ['용신', '희신'].includes(role(3)) && ch.weights.groups[3] < M.LUCK_CFG.structure.luck.heavy) || (p.name !== '식신제살' && ['기신', '구신'].includes(role(4)) && !(p.name === '상관패인' && !['용신', '희신'].includes(role(1))));
      if (p.status === '성립' && opp) { wrongShown++; if (ex.length < 5) ex.push({ idx: i, name: p.name }); }
      if (p.status === '성립' && !opp) keptOk++; if (p.status === '후보') toCand++; } });
  return { wrongShownAfter: wrongShown, keptEstablished: keptOk, toCandidate: toCand, examples: ex }; })();
// M7
R.m7 = { staleTextBefore: S.before.filter(x => x.A.eokbuLog.includes('종격을 판정하지 않으므로')).length, staleTextAfter: S.after.filter(x => x.A.eokbuLog.includes('종격을 판정하지 않으므로')).length, newTextAfter: S.after.filter(x => x.A.eokbuLog.includes('별도의 종격 판정')).length };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'regress-summary.json'), JSON.stringify(R, null, 1));
fs.writeFileSync(path.join(OUT, 'regress-charts.json'), JSON.stringify({ runAt: R.runAt, before: S.before.map(x => ({ A: x.A, B: x.B, scoreUse: x.scoreUse, display: x.display })), after: S.after.map(x => ({ A: x.A, B: x.B, scoreUse: x.scoreUse, display: x.display, dedup: x.dedup })) }));
const brief = Object.assign({}, R); delete brief.jehwaChange; delete brief.dedup; brief.dedupCharts = R.dedup.charts; brief.jehwaChangeN = { M3: R.jehwaChange.M3.length, M4: R.jehwaChange.M4.length };
console.log(JSON.stringify(brief, null, 1));
