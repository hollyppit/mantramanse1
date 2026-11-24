// 운 시기 주요 오행·활동 테마(luck-element-theme.js) 검증 — node tests/luck-element-theme-sim.cjs
//  · 주요 오행 = 천간 1 + 지지 지장간(날수 비율) 합이 가장 큰 오행(같으면 천간) · 결정론
//  · 개인 해석: 같은 오행이라도 사주(용신 역할·원국 세력·합충)에 따라 문장이 달라짐
//  · 길흉 단정 표현 없음 · 엔진 결과 불변 · 대운·세운·월운·일진 모두 · 화면 연결(만세력)
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'luck-element-theme.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, T = ctx.MantraLuckTheme, J = JSON.stringify;
const BAN = /대길|대흉|반드시|무조건|확정|망한다|undefined|NaN|null/;
// 1) 주요 오행 규칙
{ const se = s => M.stemEl(s);
  for (let s = 0; s < 10; s++) for (let b = 0; b < 12; b++) {
    const m = T.mainEl(M, { s, b }), w = [0, 0, 0, 0, 0]; w[se(s)] += 1; const H = M.HIDDEN[b], tot = H.reduce((a, h) => a + h[1], 0); H.forEach(h => { w[se(h[0])] += h[1] / tot; });
    const best = Math.max(...w); assert.ok(Math.abs(w[m.el] - best) < 1e-9, '가장 큰 오행 ' + s + ',' + b);
    if (Math.abs(w[se(s)] - best) < 1e-9) assert.equal(m.el, se(s), '같으면 천간 쪽 ' + s + ',' + b);
  } }
// 2) 여러 사주 × 대운·세운·월운·일진
let n = 0; const byEl = {}, states = {};
for (let i = 0; i < 40; i++) {
  const ch = M.compute({ year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' });
  const snap = J(ch.daeun.list.map(x => x.ev.fitScore));
  const items = [...ch.daeun.list.map(x => [x, 'daeun']), ...M.seunRange(ch, 2024, 2030).map(x => [x, 'seun']), ...M.wolun(ch, 2026).map(x => [x, 'wolun']), ...M.ilun(ch, 2026, 11).slice(0, 5).map(x => [x, 'ilun'])];
  for (const [x, kind] of items) {
    const r = T.read(M, ch, x, kind), r2 = T.read(M, ch, x, kind); n++;
    assert.equal(J(r), J(r2), '결정론');
    assert.ok(r.el >= 0 && r.el <= 4 && r.words.length === 4 && r.summary && r.interact.length >= 1 && r.recommend.length >= 1, '빈 값');
    [r.summary, ...r.interact, ...r.recommend, ...r.caution, ...r.basis].forEach(t => assert.ok(!BAN.test(t), '금지 표현 ' + t));
    assert.equal(r.role, (ch.unified.roles || {})[r.el] || '한신', '용신 역할은 엔진 값');
    if (r.fit != null) assert.equal(r.fit, x.ev.fitScore, '흐름 점수는 엔진 값 그대로');
    states[r.state] = (states[r.state] || 0) + 1;
    (byEl[r.el] = byEl[r.el] || new Set()).add(r.interact.concat(r.recommend).join('|'));
  }
  assert.equal(J(ch.daeun.list.map(x => x.ev.fitScore)), snap, '엔진 결과 불변');
}
// 같은 오행이라도 사람마다 해석이 갈라짐
Object.keys(byEl).forEach(e => assert.ok(byEl[e].size >= 5, '오행 ' + e + ' 해석이 사람마다 달라야 함 ' + byEl[e].size));
['use', 'mixed', 'careful', 'steady', 'neutral'].forEach(k => assert.ok(states[k] > 0, '상태 ' + k + ' 가 한 번도 안 나옴'));
// 3) 화면 연결
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(/<script src="luck-element-theme\.js"><\/script>/.test(html), '스크립트');
assert.ok(/el: elOf\(d\), v: luckV\(d\)/.test(html) && /el: elOf\(m\), v: luckV\(m\)/.test(html), '대운·월운 막대에 오행');
assert.ok(/samjaeLayer\(/.test(html) && /tjOverlay\(/.test(html), '삼재·토정 보조 지표 유지');
// 4) 운명의 타임라인: 전체 흐름 값에 같은 주요 오행, 막대·인생 그래프·10년 칩·카드 연결
{ const TG = require(path.join(root, 'report/hub/timeline-graph.js')), ch = M.compute({ year: 1992, month: 6, day: 23, hour: 1, minute: 45, calendar: 'solar', gender: 'M' });
  for (const d of ch.daeun.list) { const v = TG.value(M, ch, d, 'daeun', 'flow'); assert.equal(v.el, T.mainEl(M, d).el, '타임라인 흐름 값의 오행'); assert.ok(v.sig && v.sig.n, '등급은 보조로 그대로'); }
  assert.ok(TG.value(M, ch, ch.daeun.list[2], 'daeun', 'love').el === undefined, '분야 지표는 오행 없음(등급 색 그대로)');
  assert.ok(TG.life(M, ch, 'flow', 90).every(q => q.el != null), '인생 전체 연도에 오행');
  const ht = fs.readFileSync(path.join(root, 'report/hub/hub-timeline.js'), 'utf8');
  assert.ok(/E = useEl\(vv\) \? vv\.el : null/.test(ht) && /useEl\(q\) \? elC\(q\.el\) : q\.sig\.c/.test(ht) && /head \+ themeHtml\(it, lvl\)/.test(ht) && /elLegend\(\)/.test(ht), '타임라인 막대·인생·카드·범례 연결');
  const hi = fs.readFileSync(path.join(root, 'report/hub/index.html'), 'utf8'), st = fs.readFileSync(path.join(root, 'report/story/story.js'), 'utf8');
  assert.ok(/\/luck-element-theme\.js\?v=/.test(hi) && /'\/luck-element-theme\.js' \+ HV/.test(st), '허브·/report/ 둘 다 모듈을 불러옴'); }
console.log(`luck-element-theme-sim ok · 해석 ${n}건 · 상태 ${J(states)} · 오행별 서로 다른 해석 ${Object.keys(byEl).map(e => T.EL_K[e] + byEl[e].size).join(' ')}`);
