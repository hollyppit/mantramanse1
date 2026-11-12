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
// ── 30년 구간 개선 검사(2026-11-13): 오행 분류·점수 분해·조후 적용 여부·길흉 모순·전환점 누락
function spanChecks(ch, s, L, Y0) {
  const u = ch.unified, items = s.items, n = items.length;
  // (a) 오행 비중을 따로 다시 계산해 맞춘다: 천간 stemW×통근 배율, 지지 (1−stemW)×지장간 일수/30
  const share = [0, 0, 0, 0, 0];
  items.forEach(x => {
    const se = M.stemEl(x.s), rt = b => H[b].some(h => M.stemEl(h[0]) === se);
    const mul = rt(x.b) ? 1 + UL.rootUp : M.POS.some(k => ch.pillars[k] && rt(ch.pillars[k].b)) ? 1 : 1 - UL.floatDown;
    const v = [0, 0, 0, 0, 0]; v[se] += SW * mul; H[x.b].forEach(h => v[M.stemEl(h[0])] += (1 - SW) * h[1] / 30);
    const t = v.reduce((a, b) => a + b, 0); v.forEach((q, e) => share[e] += q / t / n * 100);
  });
  ok(share.every((v, e) => Math.abs(v - s.share[e]) < 1e-6), '오행 비중 계산이 다름');
  ok(Math.abs(s.share.reduce((a, b) => a + b, 0) - 100) < 1e-6, '오행 비중 합이 100%가 아님');
  const ord = [0, 1, 2, 3, 4].sort((a, b) => s.share[b] - s.share[a] || a - b), gapMin = M.ELEMENT_FLOW_CFG.present;
  ok(s.mainEl === ord[0], '우세 오행이 비중 1위가 아님');
  const mix = s.share[ord[0]] - s.share[ord[1]] >= gapMin ? 1 : s.share[ord[0]] - s.share[ord[2]] >= gapMin ? 2 : 3;
  ok(s.mix === mix && (mix === 1) === !/복합|혼재/.test(s.elLabel), '복합 오행 판정·표기 오류');
  cover.mix[mix] = (cover.mix[mix] || 0) + 1;
  // (b) 점수 분해: 오행별 몫 + 나머지(조후·격국·기준선) = 용신 성분, 용신+관계+구조 = 흐름 점수(엔진 값)
  s._el.forEach((z, j) => {
    const ev = items[j].ev, sumC = z.contrib.reduce((a, b) => a + b, 0);
    ok(Math.abs(z.uniCheck - ev.unifiedScore) < 1e-6, '통합 용신 점수 재계산이 엔진과 다름');
    ok(Math.abs(sumC + z.parts.rest - z.parts.yong) < 1e-6, '오행별 몫 합이 용신 성분과 다름');
    const tot = z.parts.yong + z.parts.relation + z.parts.structure;
    ok(Math.abs(Math.max(-100, Math.min(100, tot)) - ev.ownFit) < 1e-6, '성분 합이 흐름 점수와 다름');
    ok(useJ(ch) || Math.abs(z.parts.johu) < 1e-9, '조후 해당 없음인데 조후 몫이 점수에 있음');
    z.contrib.forEach((c, e) => ok(Math.abs(c) < 1e-9 || Math.sign(c) === Math.sign(u.roleV[e]), '오행 몫의 부호가 역할과 다름'));
  });
  ok(s.helpEl == null || (s.contrib[s.helpEl] >= 5 && s.contrib.every(c => c <= s.contrib[s.helpEl])), '도운 오행 판정 오류');
  ok(s.dragEl == null || (s.contrib[s.dragEl] <= -5 && s.contrib.every(c => c >= s.contrib[s.dragEl])), '누른 오행 판정 오류');
  // (c) 길흉 모순: 30년 성격과 대운 상태, 첫 문구의 위험 표시
  const conds = items.map(x => x.ev.condition), nG = conds.filter(c => c === '순풍').length, nB = conds.filter(c => c === '주의' || c === '부담').length;
  ok(s.tone !== 'good' || nB === 0, '주의·부담 대운이 있는데 30년 성격이 도움');
  ok(s.tone !== 'bad' || nG === 0, '순풍 대운이 있는데 30년 성격이 부담');
  ok((s.tone === 'mixed') === (nG > 0 && nB > 0), '순풍과 주의가 섞인 구간을 한 가지 길흉으로 단정');
  if (s.tone === 'mixed') cover.mixed++;
  const wi = s.scores.indexOf(Math.min(...s.scores));
  if (s.scores[wi] <= CC.caution) ok(s.hook.includes(items[wi].startAge + '~' + (items[wi].startAge + 9) + '세는 조심'), '주의 대운이 첫 문구에 없음: ' + s.hook);
  if (n === 3) {
    const [a0, a1, a2] = s.scores, drop = a2 - Math.max(a0, a1);
    if ((a2 <= CC.caution && drop <= -10) || drop <= -30) { ok(s.trend === 'lateDrop', '마지막 10년 급락을 놓침'); cover.lateDrop++; }
    if (s.trend === 'lateDrop' && a2 <= CC.caution) ok(s.hook.includes(items[2].startAge + '~'), '마지막 10년 위험이 첫 문구에 없음');
  }
  // (d) 역할과 최종 평가가 다른 이유
  const rv = u.roleV[s.mainEl], av = s.avg;
  if (rv < 0 && (av > 0 || nG) && s.helpEl != null && s.helpEl !== s.mainEl) { ok(s.steps.impact.includes('끌어올린 쪽은'), '기신이 많은데 오른 이유 설명 없음'); cover.lift++; }
  if (rv > 0 && (av < 0 || nB) && s.dragEl != null && s.dragEl !== s.mainEl) { ok(s.steps.impact.includes('끌어내린 쪽은'), '용신이 많은데 내린 이유 설명 없음'); cover.drag++; }
  if (Math.abs(s.parts.yong) >= 5 && Math.abs(av) >= 5 && (s.parts.yong > 0) !== (av > 0)) { ok(s.steps.impact.includes('실제 운의 평가가 다르게 나오는 이유'), '십성·관계가 뒤집은 이유 설명 없음'); cover.part++; }
  if ((rv < 0 && av >= 5) || (rv > 0 && av <= -5)) ok(/끌어올린 쪽은|끌어내린 쪽은|평가가 다르게 나오는 이유/.test(s.steps.impact), '대표 오행 역할과 최종 평가가 반대인데 이유 설명 없음');
  // (g) 사용자용 해석: 핵심 결론, 기본 해석에 점수 숫자 없음, 어린 시절에 어른 전략 없음, 지나온·앞으로 구분
  const ADULT = /이직|창업|사업|투자|대출|보증|동업|직장|직책|연봉|승진|노후|저축/, NUM = /[+−]d|ds*%|d+s*점/;
  ok(typeof s.steps.summary === 'string' && s.steps.summary.length > 20 && s.steps.summary.includes(s.startAge + '~' + s.endAge + '세'), '핵심 결론 없음');
  [s.steps.summary, s.steps.trait, s.steps.impact, s.steps.strategy, s.opp, s.risk].forEach(t => ok(!NUM.test(t), '기본 해석에 점수 숫자: ' + t));
  s.decades.filter(d => d.stage === 'teen' && d.when !== 'past').forEach(d => {
    ok(!ADULT.test(d.text), '어린 시절 10년에 어른 전략: ' + d.text);
    const tag = '(' + d.startAge + '~' + d.endAge + '세)';
    if (s.opp.includes(tag)) ok(!ADULT.test(s.opp), '어린 시절 기회 문장에 어른 전략: ' + s.opp);
    if (s.risk.includes(tag)) ok(!ADULT.test(s.risk), '어린 시절 위험 문장에 어른 전략: ' + s.risk);
  });
  if (s.youth && s.when !== 'past') [s.steps.summary, s.steps.impact, s.steps.strategyLead].forEach(t => ok(!ADULT.test(t), '어린 시절 구간에 어른 전략: ' + t));
  if (s.when === 'past') { ok(s.steps.summary.startsWith('지나온') && s.opp.startsWith('돌아보면') && s.risk.startsWith('돌아보면') && !s.trace.some(t => /^lc.(stage|act|trend|roleFx|roleYouth)./.test(t) || t === 'lc.trendYouth'), '지나온 30년이 경험 중심이 아님'); cover.past = (cover.past || 0) + 1; }
  else s.decades.forEach(d => ok(d.when === 'past' ? !/^지나온/.test(d.text) === false : /^지나온/.test(d.text) === false, '지나온·앞으로 10년 문구가 섞임'));
  if (s.youth) cover.youth = (cover.youth || 0) + 1;
  // (e) 전환점 누락: 구간 안 경계 중 기준을 넘는 것은 모두 있어야 한다
  for (let j = s.idx[0] + 1; j <= s.idx[n - 1]; j++) {
    const dv = L[j].ev.fitScore - L[j - 1].ev.fitScore, cond = L[j].ev.condition !== L[j - 1].ev.condition;
    if (Math.abs(dv) >= 10 || cond) ok(s.turns.some(t => t.i === j), '구간 안 전환점 누락');
  }
  ok(s.turns.length <= 4, '전환점이 너무 많음');
  // (f) 나이·기간에 맞는 전략
  ok(s.decades.length === n && s.decades.every((d, j) => d.startAge === items[j].startAge && s.steps.strategy.includes(d.startAge + '~' + (d.startAge + 9) + '세')), '10년별 전략 누락');
  ok(s.decades.every(d => d.when === (d.startYear + 9 < Y0 ? 'past' : d.startYear <= Y0 ? 'now' : 'future')), '지나온·지금·앞으로 구분 오류');
}
const tones = { span: {}, pair: {} }; let nSpan = 0, nPair = 0, nCh = 0;
const SCHOOLS = ['auto', 'auto', 'eokbu', 'johu'];
const CC = M.LUCK_CFG.condition, H = M.HIDDEN, UL = M.UNIFIED_CFG.luck, SW = M.LUCK_CFG.levels.daeun.stemW;
const useJ = ch => !!ch.unified.theories.johu.applicable, useE = ch => !!ch.unified.theories.eokbu.applicable && ch.unified.mode !== 'jong';
const cover = { mix: {}, lateDrop: 0, mixed: 0, lift: 0, drag: 0, part: 0, conflict: 0, johuNA: 0 };
for (let i = 0; i < 240; i++) {
  const inp = { year: 1940 + Math.floor(rnd() * 75), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: SCHOOLS[i % 4] };
  let ch; try { ch = M.compute(inp); } catch (e) { continue; }
  nCh++;
  const Y0 = 2020 + Math.floor(rnd() * 10), before = snap(ch, Y0);
  // ── 대운 30년
  const sp = LC.daeunSpans(M, ch, { year: Y0 }), L = ch.daeun.list, u = ch.unified;
if (!useJ(ch)) cover.johuNA++; if (u.mode === 'conflict') cover.conflict++;
  ok(sp.reduce((s, x) => s + x.idx.length, 0) === L.length && sp.every((x, k) => x.idx.every((d, j) => d === k * 3 + j)), '대운 묶음이 빠지거나 겹침');
  sp.forEach((s, k) => {
    nSpan++; tones.span[s.tone] = (tones.span[s.tone] || 0) + 1;
    ok(s.idx.length === 3 || k === sp.length - 1, '마지막이 아닌 구간이 3개가 아님');
    ok(s.type === '장기 분석 구간' && s.label === '장기 분석 구간 ' + (k + 1), '구간 이름');
    ok(s.startAge === L[s.idx[0]].startAge && s.endAge === L[s.idx[s.idx.length - 1]].startAge + 9 && s.endYear === L[s.idx[s.idx.length - 1]].startYear + 9, '구간 나이·연도 불일치');
    ok(s.scores.every((v, j) => v === L[s.idx[j]].ev.fitScore), '구간 점수가 엔진 대운 점수와 다름');
    ok(['rise', 'fall', 'peak', 'valley', 'flat', 'short', 'lateDrop'].includes(s.trend) && (s.trend === 'short') === (s.idx.length < 3), '흐름 모양 값');
    ok(['good', 'mid', 'bad', 'mixed'].includes(s.tone) && s.mainEl >= 0 && s.mainEl < 5, '성격·오행 값');
    spanChecks(ch, s, L, Y0);
    const all = [s.hook, s.steps.summary, s.steps.trait, s.steps.impact, s.steps.strategy, s.opp, s.risk, ...s.basis, ...s.turns.map(t => t.text)];
    all.forEach(t => { ok(typeof t === 'string' && t.length > 4 && !badText(t), `빈 문장/값 이상: ${t}`); ok(!badJosa.test(t), `조사 오류: ${t}`); });
    [s.steps.summary, s.steps.trait, s.steps.impact, s.steps.strategy, s.opp, s.risk].forEach(t => ok(!notPolite(t), `해요체 아님: ${t}`));
    ok(['오행 비중', '도움·부담 오행', '십성', '합충형해', '통합 용신', '점수 구성', '흐름 점수'].every(k2 => s.basis.some(x => x.startsWith(k2))), '근거 항목 빠짐');
    ok(s.basis.some(x => x.startsWith('억부(')) === useE(ch), '억부 줄이 적용 여부와 다름');
    ok(s.basis.some(x => x.startsWith('조후')) === useJ(ch) && (useJ(ch) || !s.trace.some(t => t.startsWith('lc.bal.johu'))), '적용되지 않는 조후의 점수·문구가 나옴');
    ok(useE(ch) || !s.trace.some(t => t.startsWith('lc.bal.eokbu')), '적용되지 않는 억부 문구가 나옴');
    ok(s.steps.impact.includes(s.role) && s.steps.trait.includes(LC.EL_TRAIT[s.mainEl].span.slice(0, 12)), '영향 문단이 역할·오행과 맞지 않음');
    ok(!all.some(t => /{w+}/.test(t)), '채우지 않은 {자리}가 남음');
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
    ok(['십성', '합충형해', '흐름 점수'].every(k2 => p.basis.some(x => x.startsWith(k2))), '2년 근거 항목 빠짐');
    ok(p.basis.some(x => x.startsWith('억부(')) === useE(ch) && p.basis.some(x => x.startsWith('조후')) === useJ(ch), '2년: 적용되지 않는 이론 줄이 나옴');
    ok(useJ(ch) || !p.trace.some(t => t.startsWith('lc.bal.johu')), '2년: 적용되지 않는 조후 문구');
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
console.log('검사 범위', JSON.stringify(cover));
if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log('모든 검증 통과');
