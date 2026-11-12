// 오행 사이클(luck-cycle.js) 검증 — 대운 30년 묶음(장기 분석 구간)·세운 2년 묶음(천간 오행 구간)
//   node tests/luck-cycle-sim.cjs
// (1) 점수 불변: 묶음 해석을 만든 뒤에도 대운·세운·월운·일진 흐름 점수가 한 자리도 바뀌지 않는다(같은 입력을 새로 계산한 값과 비교)
// (2) 대운 3개씩 빠짐·겹침 없이 묶이고, 구간 나이·연도가 대운과 맞다 (3) 2년 묶음은 천간 오행이 같은 양→음 두 해이고, 해마다 점수는 엔진 값 그대로
// (4) 세 단계 해석(특징→영향→전략)과 근거(억부·조후·십성·합충형해)가 모두 있다 (5) 문장 이상(undefined·NaN·조사 오류·반말) 없음
// (6) 고른 문구 ID가 모두 문구 DB에 있다 (7) 한 해석 성격(도움·중립·부담)이 85%를 넘게 몰리지 않는다 (8) 화면 연결: 스위치 꺼짐 기본·월운·일진은 묶지 않음
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a = src.indexOf('var MANSE_DATA'), b = src.indexOf('})(typeof window', a);
vm.runInThisContext(src.slice(a, src.indexOf('\n', b)));
const M = globalThis.Manse, LC = require(path.join(root, 'luck-cycle.js'));
const fails = [], ok = (c, m) => { if (!c && fails.length < 25) fails.push(m); };
let seed = 1112; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const IDS = new Set(LC.PHRASES.map(p => p.id));
const badText = t => /undefined|NaN|null|\[object/.test(t);
const badJosa = /(수\(水\)|화\(火\)|토\(土\))(이|을|은|과) |(목\(木\)|금\(金\))(가|를|는|와) /;
const notPolite = t => /(한다|이다|된다|있다|없다)\.(\s|$)/.test(t);
const snap = (ch, Y0) => JSON.stringify({
  du: ch.daeun.list.map(d => [d.ev.fitScore, d.ev.ownFit, d.combined, d.score.total]),
  se: M.seunRange(ch, Y0, Y0 + 11).map(x => [x.combined, x.score.total]),
  wo: M.wolun(ch, Y0).map(x => x.combined), il: M.ilun(ch, Y0, 3).map(x => x.combined),
});
const tones = { span: {}, pair: {} }; let nSpan = 0, nPair = 0, nCh = 0;
for (let i = 0; i < 160; i++) {
  const inp = { year: 1940 + Math.floor(rnd() * 75), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' };
  let ch; try { ch = M.compute(inp); } catch (e) { continue; }
  nCh++;
  const Y0 = 2020 + Math.floor(rnd() * 10), before = snap(ch, Y0);
  // ── 대운 30년
  const sp = LC.daeunSpans(M, ch), L = ch.daeun.list;
  ok(sp.reduce((s, x) => s + x.idx.length, 0) === L.length && sp.every((x, k) => x.idx.every((d, j) => d === k * 3 + j)), '대운 묶음이 빠지거나 겹침');
  sp.forEach((s, k) => {
    nSpan++; tones.span[s.tone] = (tones.span[s.tone] || 0) + 1;
    ok(s.idx.length === 3 || k === sp.length - 1, '마지막이 아닌 구간이 3개가 아님');
    ok(s.type === '장기 분석 구간' && s.label === '장기 분석 구간 ' + (k + 1), '구간 이름');
    ok(s.startAge === L[s.idx[0]].startAge && s.endAge === L[s.idx[s.idx.length - 1]].startAge + 9 && s.endYear === L[s.idx[s.idx.length - 1]].startYear + 9, '구간 나이·연도 불일치');
    ok(s.scores.every((v, j) => v === L[s.idx[j]].ev.fitScore), '구간 점수가 엔진 대운 점수와 다름');
    ok(['rise', 'fall', 'peak', 'valley', 'flat', 'short'].includes(s.trend) && (s.trend === 'short') === (s.idx.length < 3), '흐름 모양 값');
    ok(['good', 'mid', 'bad'].includes(s.tone) && s.mainEl >= 0 && s.mainEl < 5, '성격·오행 값');
    const all = [s.hook, s.steps.trait, s.steps.impact, s.steps.strategy, s.opp, s.risk, ...s.basis, ...s.turns.map(t => t.text)];
    all.forEach(t => { ok(typeof t === 'string' && t.length > 4 && !badText(t), `빈 문장/값 이상: ${t}`); ok(!badJosa.test(t), `조사 오류: ${t}`); });
    [s.steps.trait, s.steps.impact, s.steps.strategy, s.opp, s.risk].forEach(t => ok(!notPolite(t), `해요체 아님: ${t}`));
    ok(['억부', '조후', '십성', '합충형해', '통합 용신', '흐름 점수'].every(k2 => s.basis.some(x => x.startsWith(k2))), '근거 항목 빠짐');
    ok(s.steps.impact.includes(s.role) && s.steps.trait.startsWith(LC.EL_TRAIT[s.mainEl].name), '영향 문단이 역할·오행과 맞지 않음');
    ok(s.trace.length >= 4 && s.trace.every(id => IDS.has(id)), '문구 ID 없음');
    s.turns.forEach(t => ok(Math.abs(t.delta) >= 10 || t.cond, '전환점 기준 미달'));
  });
  ok(LC.spanIndexOf(sp, 0) === 0 && LC.spanIndexOf(sp, L.length - 1) === sp.length - 1, '대운→구간 찾기');
  // ── 세운 2년
  for (let Y = Y0; Y < Y0 + 12; Y++) {
    const p = LC.seunPair(M, ch, Y); if (!p) { ok(false, '2년 묶음 없음 ' + Y); continue; }
    nPair++; tones.pair[p.tone] = (tones.pair[p.tone] || 0) + 1;
    const ys = M.seunRange(ch, p.start, p.end);
    ok(p.years.length === 2 && p.start <= Y && Y <= p.end && p.end === p.start + 1, '2년 범위');
    ok(ys[0].s % 2 === 0 && M.stemEl(ys[0].s) === M.stemEl(ys[1].s) && p.el === M.stemEl(ys[0].s), '천간 오행이 같은 양→음 두 해가 아님');
    ok(p.years.every((y, j) => y.score === ys[j].combined && y.cond === ys[j].ev.condition), '해마다 점수·상태가 엔진 값과 다름(연도별 길흉 유지)');
    ok(p.type === '천간 오행 구간' && /두 해/.test(p.diff), '두 해 차이 문장 없음');
    const all = [p.hook, p.steps.trait, p.steps.impact, p.steps.strategy, p.diff, ...p.basis];
    all.forEach(t => { ok(typeof t === 'string' && t.length > 4 && !badText(t), `빈 문장/값 이상: ${t}`); ok(!badJosa.test(t), `조사 오류: ${t}`); });
    ok(['억부', '조후', '십성', '합충형해', '흐름 점수'].every(k2 => p.basis.some(x => x.startsWith(k2))), '2년 근거 항목 빠짐');
    ok(p.trace.every(id => IDS.has(id)), '2년 문구 ID 없음');
  }
  // ── 점수 불변: 해석 후 같은 객체의 점수, 그리고 새로 계산한 사주의 점수가 처음과 같다
  ok(snap(ch, Y0) === before, '해석 후 같은 사주의 점수가 바뀜');
  ok(snap(M.compute(inp), Y0) === before, '새로 계산한 점수와 다름');
}
// 2년 묶음 나누기
const g = LC.pairGroups([2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036]).map(x => x.years.length);
ok(JSON.stringify(g) === '[1,2,2,2,2,1]', '가장자리 1년 묶음 처리 ' + g);
ok(LC.pairStart(2024) === 2024 && LC.pairStart(2025) === 2024 && LC.pairStart(2026) === 2026 && LC.pairStart(1983) === 1982, '양 천간 해 시작');
const share = o => { const n = Object.values(o).reduce((s, v) => s + v, 0); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v / n * 100)])); };
const s1 = share(tones.span), s2 = share(tones.pair);
ok(Math.max(...Object.values(s1)) <= 85 && Math.max(...Object.values(s2)) <= 85, '해석 성격이 한쪽으로 몰림');
// ── 화면 연결
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), flags = fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8');
ok(/luckCycle: false/.test(flags), '스위치 기본값이 꺼짐이 아님');
ok(html.includes('<script src="luck-cycle.js"></script>'), '모듈 스크립트 연결 없음');
ok(/const lcOn = \(\) => !!\(window\.MANTRA_FLAGS && window\.MANTRA_FLAGS\.luckCycle === true/.test(html), '화면이 스위치를 확인하지 않음');
const cal = html.slice(html.indexOf('function renderCalendar('), html.indexOf('function yearSummary('));
ok(cal.length > 100 && !/lc[A-Z]|luckCycle|MantraLuckCycle/.test(cal), '일진 달력에 묶음이 들어감');
const wol = html.slice(html.indexOf("} else if (k === 'wolun') {"), html.indexOf("} else if (k === 'life')"));
ok(wol.length > 50 && !/lc[A-Z]/.test(wol), '월운 그래프에 묶음이 들어감');
console.log('사주', nCh, '· 30년 구간', nSpan, '성격(%)', JSON.stringify(s1), '· 2년 구간', nPair, '성격(%)', JSON.stringify(s2), '· 문구', IDS.size);
if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log('모든 검증 통과');
