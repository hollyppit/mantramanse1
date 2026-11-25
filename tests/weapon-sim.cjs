// 나의 주무기(weapon.js · weapon-data.js · weapon-view.js) 검증:  node tests/weapon-sim.cjs [--write] [--engine=경로]
//  표본: 운세 엔진 감사 dev 300 생성식(tools/luck-engine-audit-20261125/compare.cjs 와 같은 식) + 같은 300개를 시간 모름으로
//  · 원국 판정 불변식: 무기 ≤2 · 상태와 개수 일치 · 무기는 핵심 조건(세력≥20%·투간·통근) 또는 십신형 경로(2판) 충족 · 유형·표시 이름 · 없음이면 후보 없음 · 복합형이면 3개 이상 동률
//  · 네 탭 일치: 원국·오행·강약·특기·적성·운세 흐름 블록의 data-wp 가 analyze 결과와 같다
//  · 운별 분석: 대운 전부·세운 10년·월운 12개월에 활성도 등급이 있고, 유리도는 엔진 흐름 점수 등급과 같다(합산 값 없음)
//  · 엔진 불변: 주무기 모듈을 부르기 전후 · 모듈을 안 올린 VM과 운세 점수·용신·격국·종격·합충이 같다
//  · 결정론(다른 VM 같은 결과) · 금지 표현 없음 · 스위치 기본 켬
//  · --write: docs/weapon-analysis/results-300.json · summary.json 저장
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=').slice(1).join('=');
const ENGINE = arg('engine') || path.join(root, 'engine.js');
const BASE = ['feature-flags.js', 'gyeok-structure.js', 'luck-grade.js', 'aptitude-data.js', 'aptitude.js', 'ten-god-roles.js'];   // ten-god-roles: 3판 생극제화 근거(운영 화면과 같은 로드)
const WP = ['weapon-data.js', 'weapon.js', 'weapon-view.js'];
const mk = withWp => { const c = { console }; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(ENGINE, 'utf8'), c, { filename: 'engine.js' }); [...BASE, ...(withWp ? WP : [])].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f })); return c; };
const X = mk(true), X2 = mk(true), Y = mk(false);
const M = X.Manse, W = X.MantraWeapon, V = X.MantraWeaponView, DD = X.MantraWeaponData, LG = X.MantraLuckGrade;
const EL_K = ['목', '화', '토', '금', '수'];
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const BAN = /성공 확률|확률이|확률로|반드시|무조건|틀림없이|천재|성공(할|합니다|한다|해요)|실패(할|합니다|한다)|운명이 정해/;
const CUR_Y = 2026;
const snap = (Mx, ch) => JSON.stringify({
  d: ch.daeun.list.map(x => [x.ev.fitScore, x.combined, x.score]), s: Mx.seunRange(ch, CUR_Y, CUR_Y + 9).map(x => [x.combined, x.ev.fitScore]), w: Mx.wolun(ch, CUR_Y).map(x => [x.combined]),
  u: { yong: ch.unified.yong, hee: ch.unified.hee, roles: ch.unified.roles, roleV: ch.unified.roleV, mode: ch.unified.mode }, g: Mx.gyeokCore(ch).kind, j: Mx.jongCore ? JSON.stringify(Mx.jongCore(ch)).length : 0,
  r: ch.relations, wp: ch.weights.pct, st: ch.strength,
});
const htmlTxt = h => h.replace(/<[^>]+>/g, ' ');
let fails = 0; const T = (name, f) => { try { f(); } catch (e) { fails++; console.log('✗', name, '—', e.message.split('\n')[0]); } };
const stat = { confidence: {}, types: {}, typesByKind: { daeun: {}, seun: {}, wolun: {} }, status: {}, exceptions: {}, act: {}, actByKind: { daeun: {}, seun: {}, wolun: {} }, favorByAct: {}, weaponGroups: {}, nWeapons: {}, nohour: { status: {}, keepFirst: {} } };
const inc = (o, k) => o[k] = (o[k] || 0) + 1;
const examples = {}; const ex = (code, rec) => { (examples[code] = examples[code] || []).length < 3 && examples[code].push(rec); };
const results = [];

function check(inp, idx, tag) {
  const ch = M.compute(inp), before = snap(M, ch);
  const A = W.analyze(M, ch);
  assert.ok(A.ok, 'analyze ok');
  // 불변식
  assert.ok(A.weapons.length <= 2, '무기 2개 이하');
  const n = A.weapons.length;
  if (A.status === 'single') assert.equal(n, 1); if (A.status === 'dual') assert.equal(n, 2);
  if (A.status === 'complex') { assert.equal(n, 0); assert.ok(A.complex.length >= 3); }
  if (A.rawStatus === 'none') assert.ok(!A.facts.some(f => f.cond.core || (f.pct >= 10 && f.cond.exposed && f.roots.length && f.cond.intact && f.cond.structure)), '없음이면 핵심 후보·구조 후보 없음');
  // 판정 2판: 핵심 조건(세력≥20%·투간·통근) 또는 십신형 경로(세력≥10%·투간·통근·온전함·격국·상신 구조 역할)
  A.weapons.forEach(w => { if (w.path === 'structure') { assert.ok(w.pct >= 10 && w.cond.exposed && w.roots.length && w.cond.intact && w.cond.structure, '십신형 경로 조건'); assert.equal(w.confidence, 'low', '십신형 경로는 잠정'); } else { assert.ok(w.cond.force && w.cond.exposed && w.cond.rooted, '핵심 조건'); assert.ok(w.pct >= 20); } assert.ok(w.stems.length && w.roots.length); assert.ok(['element', 'tengod', 'complex'].includes(w.type), '유형'); if (w.type === 'element') assert.ok(!w.tgEvidence, '오행형은 십신 근거 없음'); else assert.ok(w.cond.structure || w.cond.act, '십신형·복합형은 구조 역할 또는 실제 작용'); if (A.label === '주무기' && w.order === 1) assert.ok(w.tgEvidence && w.path === 'core', '확정은 오행+십신 근거 둘 다'); });
  assert.ok(['주무기', '잠정 주무기', '주무기 미확정'].includes(A.label), '표시 이름'); if (!A.weapons.length) assert.equal(A.label, '주무기 미확정');
  if (A.weapons.length === 2 && A.weapons[1].path !== 'structure') assert.ok(A.weapons[0].plusN >= A.weapons[1].plusN || A.weapons[0].cond.intact > A.weapons[1].cond.intact, '순위 규칙');
  // 네 탭
  const o = { esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]), now: Date.UTC(2026, 10, 26), curY: CUR_Y, wolY: CUR_Y };
  const H = { wonguk: V.wonguk(M, ch, o), ohaeng: V.ohaeng(M, ch, o), apt: V.apt(M, ch, o), luck: V.luck(M, ch, o), luckSummary: V.luck(M, ch, { ...o, part: 'summary' }) };
  // 운세 흐름 탭은 2026-11-26부터 요약(지금의 운 아래) + 대운·세운·월운 그래프 카드 아래 세 조각으로 나뉜다 — 무기가 있으면 세 조각도 같은 판정
  if (A.candidates.length) ['daeun', 'seun', 'wolun'].forEach(p => { H['luck-' + p] = V.luck(M, ch, { ...o, part: p }); assert.ok(H['luck-' + p].includes('id="weapon-luck-' + p + '"'), p + ' 조각'); });
  else ['daeun', 'seun', 'wolun'].forEach(p => assert.equal(V.luck(M, ch, { ...o, part: p }), '', p + ' 조각은 무기 없으면 빈 값'));
  const sig = V.sigOf(A);
  Object.entries(H).forEach(([k, h]) => { assert.ok(h, k + ' 화면 비어 있음'); const m = /data-wp="([^"]*)"/.exec(h); assert.ok(m, k + ' data-wp'); assert.equal(m[1], sig, k + ' 탭 판정 불일치'); assert.ok(!BAN.test(htmlTxt(h)), k + ' 금지 표현: ' + (htmlTxt(h).match(BAN) || [])[0]); });
  // 운별
  const tl = W.timeline(M, ch, { fromY: CUR_Y, years: 10, wolY: CUR_Y });
  const L = A.weapons.length ? A.weapons : A.complex;
  const rows = { daeun: tl.daeun, seun: tl.seun, wolun: tl.wolun };
  const src = { daeun: ch.daeun.list, seun: M.seunRange(ch, CUR_Y, CUR_Y + 9), wolun: M.wolun(ch, CUR_Y) };
  Object.entries(rows).forEach(([k, arr]) => {
    assert.equal(arr.length, src[k].length, k + ' 개수');
    arr.forEach((r, i) => {
      const x = src[k][i], v = Number.isFinite(x.combined) ? x.combined : x.ev.fitScore, g = LG.flow(v, M);
      assert.ok(r.favor && r.favor.n === g.n, k + ' 유리도 = 엔진 등급');
      assert.ok(!('total' in r) && !('sum' in r), '합산 값 없음');
      if (L.length) { assert.ok(r.best && W.ACT[r.best.level], k + ' 활성도'); r.acts.forEach(a => assert.ok(W.ACT[a.level])); if (tag === 'main') { r.best.types.forEach(t => { inc(stat.types, t); inc(stat.typesByKind[k], t); }); inc(stat.act, r.best.level); inc(stat.actByKind[k], r.best.level); inc(stat.favorByAct[r.best.level] = stat.favorByAct[r.best.level] || {}, r.favor.n); } }
      else assert.ok(r.none);
    });
  });
  // 엔진 불변(호출 전후)
  assert.equal(snap(M, ch), before, '주무기 호출 뒤 엔진 값이 바뀜');
  return { ch, A, tl, before };
}

dev.forEach((inp, i) => T('dev#' + i, () => {
  const { ch, A, tl, before } = check(inp, i, 'main');
  // 모듈 없는 VM과 같은 엔진 값
  const chY = Y.Manse.compute(inp); assert.equal(snap(Y.Manse, chY), before, '모듈 없는 VM과 엔진 값 다름');
  // 결정론
  const A2 = X2.MantraWeapon.analyze(X2.Manse, X2.Manse.compute(inp));
  assert.equal(JSON.stringify(A2), JSON.stringify(A), '결정론');
  inc(stat.status, A.status); A.weapons.forEach(w => inc(stat.confidence, w.confidence)); A.exceptions.forEach(e => inc(stat.exceptions, e)); inc(stat.nWeapons, A.weapons.length);
  A.weapons.forEach(w => inc(stat.weaponGroups, w.groupName));
  const chart = `${inp.year}-${inp.month}-${inp.day} ${inp.hour}시 ${inp.gender}`, gz = ['year', 'month', 'day', 'hour'].map(k => ch.pillars[k] ? M.gzName(ch.pillars[k]) : '--').join(' ');
  const brief = { i, chart, pillars: gz, status: A.status, weapons: A.weapons.map(w => ({ el: EL_K[w.el], group: w.groupName, tgs: w.tgs, pct: w.pct, plus: w.plus, shaky: w.shaky })),
    complex: A.complex.map(w => EL_K[w.el]), near: (A.near || []).map(e => EL_K[e]), strongest: EL_K[A.strongest.el] + ' ' + A.strongest.pct + '%' + (A.strongest.isWeapon ? '' : ' (주무기 아님: ' + A.strongest.why + ')'),
    yong: A.yong ? EL_K[A.yong.el] + (A.yong.isWeapon ? ' (=주무기)' : '') : null, strength: A.strength.zone + ' ' + A.strength.help + '%', confidence: A.confidence, log: A.log, dayGanyeo: A.dayPillar.ganyeo, mode: ch.unified.mode, exceptions: A.exceptions,
    daeun: tl.daeun.map(r => r && r.best ? `${r.startAge}세 ${r.gz} ${r.best.levelK}/${r.favor.n}` : `${r && r.gz} —/${r && r.favor ? r.favor.n : ''}`),
    seun: tl.seun.map(r => r && r.best ? `${r.year} ${r.gz} ${r.best.levelK}/${r.favor.n}` : `${r.year} —/${r.favor ? r.favor.n : ''}`) };
  results.push(brief);
  A.exceptions.forEach(e => ex(e, { chart, pillars: gz, status: A.status, weapons: brief.weapons.map(w => w.el + '(' + w.group + ')').join('·') || '—', strongest: brief.strongest, yong: brief.yong, strength: brief.strength }));
  if (A.status === 'none') ex('status-none', { chart, pillars: gz, hidden: A.hiddenPow.map(e => EL_K[e]), thin: A.thinEdge.map(e => EL_K[e]), strongest: brief.strongest });
}));
// 시간 모름(같은 300개에서 시간만 지움)
const nohour = [];
dev.forEach((inp, i) => T('nohour#' + i, () => {
  const q = { ...inp, hour: null, minute: null }; const { ch, A } = check(q, i, 'nohour');
  assert.equal(A.hourKnown, false); assert.ok(A.exceptions.includes('hour-unknown'));
  assert.ok(A.hourCheck && A.hourCheck.variants === 12, '시진 12개 점검');
  // 2026-11-26: 시간 모름도 세 기둥으로 판정(잠정) — 미확정으로 빼지 않고, 12시진 유지 수는 신뢰도·안내에만
  assert.notEqual(A.status, 'undetermined', '시간 모름도 판정'); assert.ok(A.provisional, '잠정 판정 표시');
  if (A.weapons.length) { assert.ok(A.hourKeep && A.hourKeep.of === 12, '유지 수'); if (A.hourKeep.keep < 9) assert.equal(A.weapons[0].confidence, 'low', '자주 바뀌면 신뢰도 약함'); }
  const st = W.analyze(M, ch, { hourMode: 'strict' }); if (st.status !== 'undetermined') assert.equal(st.hourCheck.keepFirst, 12, '예전 엄격 규칙 유지');
  inc(stat.nohour.status, A.status); inc(stat.nohour.keepFirst, A.hourCheck.keepFirst == null ? 'none' : A.hourCheck.keepFirst);
  const full = results[i]; nohour.push({ i, status: A.status, cand: A.candidates.map(e => EL_K[e]).join('·'), withHour: full ? full.status + ':' + full.weapons.map(w => w.el).join('·') : '', keepFirst: A.hourCheck.keepFirst });
  if (A.status === 'undetermined') ex('status-undetermined', { chart: `${inp.year}-${inp.month}-${inp.day} 시간 모름`, cand: A.candidates.map(e => EL_K[e]).join('·') || '—', keepFirst: A.hourCheck.keepFirst + '/12', withHour: nohour[nohour.length - 1].withHour });
}));
// 그래프 지표(2026-11-26): 지표를 고르면 띠·풀이가 그 지표로, 건강·사고수는 전체 흐름 + 안내
T('그래프 지표 연동', () => { const ch = M.compute(dev[1]); const o = { now: Date.UTC(2026, 10, 26), curY: CUR_Y, wolY: CUR_Y, part: 'seun' };
  const w = V.luck(M, ch, { ...o, metric: 'wealth', metricName: '재물', favorOf: () => ({ k: 'good', n: '좋음' }) }); assert.ok(w.includes('재물 좋음') && w.includes('재물 등급') && /돈/.test(w) && w.includes('재물 흐름도 받쳐 줘요'), '재물 지표 띠·풀이');
  const h = V.luck(M, ch, { ...o, metric: 'health', metricName: '건강', favorOf: () => ({ k: 'good', n: '좋음' }) }); assert.ok(!h.includes('건강 좋음') && h.includes('건강과 잇지 않아요'), '건강 지표는 전체 흐름 + 안내');
  const f0 = V.luck(M, ch, o); assert.ok(f0.includes('흐름 등급') && !f0.includes('재물'), '전체 흐름 기본'); });
// 문안 파일 금지 표현
T('data 금지 표현', () => { const walk = o => typeof o === 'string' ? assert.ok(!BAN.test(o), '금지: ' + o) : o && typeof o === 'object' && Object.values(o).forEach(walk); walk(DD); });
// 스위치 기본 꺼짐
T('스위치 기본 켬(2026-11-26 승인)', () => { const c = { console }; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8'), c); assert.equal(c.MANTRA_FLAGS.weapon, true); });

const agree = nohour.filter(r => results[r.i] && r.cand && results[r.i].weapons.map(w => w.el).join('·').startsWith(r.cand.split('·')[0])).length;
const summary = { engine: path.relative(root, ENGINE) || ENGINE, n: dev.length, fails, ...stat, nohourAgreeFirstWithFull: agree, examples };
console.log(JSON.stringify({ conf: stat.confidence, types: stat.types, status: stat.status, nWeapons: stat.nWeapons, exceptions: stat.exceptions, groups: stat.weaponGroups, act: stat.act, nohour: stat.nohour, agree }, null, 0));
if (process.argv.includes('--write')) {
  const out = path.join(root, 'docs', 'weapon-analysis'); fs.mkdirSync(out, { recursive: true });
  const suf = arg('suffix') ? '-' + arg('suffix') : '';
  fs.writeFileSync(path.join(out, 'results-300' + suf + '.json'), JSON.stringify({ version: W.VERSION, engine: summary.engine, sample: 'dev 300 (year 1950+(i*7)%55, month 1+(i*5)%12, day 1+(i*11)%28, hour (i*3)%24)', results, nohour }, null, 1));
  fs.writeFileSync(path.join(out, 'summary' + suf + '.json'), JSON.stringify(summary, null, 1));
  console.log('written', out);
}
console.log(fails ? `✗ ${fails}건 실패` : '✓ 주무기 검증 통과 (300 + 시간 모름 300)');
process.exit(fails ? 1 : 0);
