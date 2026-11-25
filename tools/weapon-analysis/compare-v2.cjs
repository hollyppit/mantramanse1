// 주무기 판정 1판 ↔ 2판 비교:  node tools/weapon-analysis/compare-v2.cjs [이전 판 커밋=HEAD] [--write]
//  · 이전 판: git show <커밋>:weapon.js (기본 HEAD — 2판을 커밋하기 전 비교용), 새 판: 작업 사본 weapon.js
//  · dev 300(시간 있음) + 같은 300 시간 모름. 판정(상태+오행)·1순위 변화, 유형·표시 이름 분포, 바뀐 이유 분류, 경계 사례
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..', '..'), rev = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'HEAD';
const oldSrc = fs.existsSync(rev) ? fs.readFileSync(rev, 'utf8') : cp.execSync('git show ' + rev + ':weapon.js', { cwd: root, encoding: 'utf8' });   // 커밋 또는 파일 경로
const mk = wsrc => { const c = { console }; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), c); ['luck-grade.js', 'ten-god-roles.js', 'weapon-data.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c)); vm.runInContext(wsrc, c); return c; };
const O = mk(oldSrc), N = mk(fs.readFileSync(path.join(root, 'weapon.js'), 'utf8'));
const EL = ['목', '화', '토', '금', '수'];
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const sig = A => A.status + ':' + (A.weapons.length ? A.weapons : A.complex).map(w => EL[w.el] + '(' + w.groupName + ')').join('·');
const inc = (o, k) => o[k] = (o[k] || 0) + 1;
const out = { rev, n: 0 };
for (const [tag, xf] of [['withHour', x => x], ['noHour', x => ({ ...x, hour: null })]]) {
  const R = { changed: 0, firstChanged: 0, oldStatus: {}, newStatus: {}, label: {}, type: {}, path: {}, reasons: {}, cases: {} };
  dev.forEach((inp0, i) => {
    const inp = xf(inp0), a = O.MantraWeapon.analyze(O.Manse, O.Manse.compute(inp)), b = N.MantraWeapon.analyze(N.Manse, N.Manse.compute(inp));
    inc(R.oldStatus, a.status); inc(R.newStatus, b.status); inc(R.label, b.label);
    b.weapons.forEach(w => { inc(R.type, w.typeK); inc(R.path, w.path); });
    const sa = sig(a), sb = sig(b), fa = a.weapons[0] && a.weapons[0].el, fb = b.weapons[0] && b.weapons[0].el;
    if (sa === sb) return; R.changed++; if (fa !== fb) R.firstChanged++;
    // 바뀐 이유 분류
    let why;
    if (!a.weapons.length && b.weapons.length) why = b.weapons[0].path === 'structure' ? '없음 → 십신형 경로로 주무기' : '미확정/없음 → 주무기';
    else if (a.weapons.length && !b.weapons.length) why = '주무기 → 미확정(동률)';
    else if (b.weapons.some(w => w.path === 'structure') && !a.weapons.some(w => w.el === b.weapons.find(x => x.path === 'structure').el)) why = '십신형 경로 후보가 보조 주무기로 추가';
    else if (fa !== fb) why = '격국·상신 보탬으로 1순위 순서 바뀜';
    else if (a.weapons.length === 2 && b.weapons.length === 1) why = '2·3위 동률이 생겨 보조 주무기 빠짐';
    else if (a.weapons.length === 1 && b.weapons.length === 2) why = '동률이 풀려 보조 주무기 생김';
    else why = '2순위 바뀜';
    inc(R.reasons, why);
    (R.cases[why] = R.cases[why] || []).length < 3 && R.cases[why].push({ chart: `${inp.year}-${inp.month}-${inp.day} ${inp.hour == null ? '시간 모름' : inp.hour + '시'} ${inp.gender}`, before: sa, after: sb, gyeok: (N.Manse.gyeokCore(N.Manse.compute(inp)) || {}).kind, log: b.log.slice(-2) });
  });
  out[tag] = R;
}
// 경계 사례: 구조 역할 + 파격 동시 / 기신·구신 주무기 / 십신형 경로 1순위 / 세력 1위인데 구조로 밀림
const B = { breaksWeapon: [], structFirst: [], gisinComplex: [], topNotWeaponStruct: [] };
dev.forEach(inp => { const ch = N.Manse.compute(inp), A = N.MantraWeapon.analyze(N.Manse, ch), c = `${inp.year}-${inp.month}-${inp.day} ${inp.hour}시 ${inp.gender}`;
  A.weapons.forEach(w => { if (w.breaks.length && B.breaksWeapon.length < 4) B.breaksWeapon.push({ chart: c, weapon: EL[w.el] + '(' + w.groupName + ')', breaks: w.breaks[0], structure: w.structure.map(x => x.text) }); if (/기신|구신/.test(w.role) && w.type === 'complex' && B.gisinComplex.length < 3) B.gisinComplex.push({ chart: c, weapon: EL[w.el] + '(' + w.groupName + ')', role: w.role, structure: w.structure.map(x => x.text) }); });
  if (A.weapons[0] && A.weapons[0].path === 'structure' && B.structFirst.length < 4) B.structFirst.push({ chart: c, weapon: EL[A.weapons[0].el] + '(' + A.weapons[0].groupName + ') ' + A.weapons[0].pct + '%', structure: A.weapons[0].structure.map(x => x.text) });
  const t = A.facts.find(f => f.rank === 1); if (A.weapons.length && !A.strongest.isWeapon && t.cond.core && B.topNotWeaponStruct.length < 3) B.topNotWeaponStruct.push({ chart: c, top: EL[t.el] + ' ' + t.pct + '%', weapon: sig(A), log: A.log.slice(-2) });
});
out.boundary = B;
console.log(JSON.stringify({ withHour: { changed: out.withHour.changed, firstChanged: out.withHour.firstChanged, oldStatus: out.withHour.oldStatus, newStatus: out.withHour.newStatus, label: out.withHour.label, type: out.withHour.type, path: out.withHour.path, reasons: out.withHour.reasons }, noHour: { changed: out.noHour.changed, firstChanged: out.noHour.firstChanged, newStatus: out.noHour.newStatus, label: out.noHour.label, reasons: out.noHour.reasons } }, null, 1));
const outName = (process.argv.find(a => a.startsWith('--out=')) || '--out=v2-compare.json').slice(6);
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'docs/weapon-analysis', outName), JSON.stringify(out, null, 1));
