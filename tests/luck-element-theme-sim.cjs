// 운 시기 주요 오행·활동 테마(luck-element-theme.js) 검증 — node tests/luck-element-theme-sim.cjs
//  · 주요 오행 = 천간 1 + 지지 지장간(날수 비율) 합이 가장 큰 오행(같으면 천간) · 결정론
//  · 개인 해석: 같은 오행이라도 사주(용신 역할·원국 세력·합충)에 따라 문장이 달라짐
//  · 길흉 단정 표현 없음 · 엔진 결과 불변 · 대운·세운·월운·일진 모두 · 화면 연결(만세력)
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'luck-grade.js', 'luck-element-theme.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, T = ctx.MantraLuckTheme, LGm = ctx.MantraLuckGrade, J = JSON.stringify;
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
// 3-2) 분야 지표 그래프(만세력): 같은 주요 오행·같은 색, 말만 그 지표에 맞게
let nd = 0;
{ const keys = [...html.match(/const DOM_ORDER = \[([^\]]+)\]/)[1].matchAll(/'(\w+)'/g), ...html.match(/const DOM_SUB = \[([^\]]+)\]/)[1].matchAll(/'(\w+)'/g)].map(m => m[1]);
  assert.equal(keys.length, 16, '분야 지표 16개');
  assert.deepEqual(Object.keys(T.DOMAIN).sort(), keys.slice().sort(), '모든 분야 지표에 오행별 말이 있음');
  for (const k of keys) { const D = T.DOMAIN[k]; assert.ok(D.area && D.e.length === 5, k);
    assert.equal(new Set(D.e.map(e => e.words.join())).size, 5, k + ' 오행마다 다른 핵심어');
    D.e.forEach((e, i) => { assert.ok(e.words.length >= 1 && /일$/.test(e.use) && e.acts.length === 2, k + i + ' 칸 형식'); [...e.words, e.use, ...e.acts].forEach(t => assert.ok(t && !BAN.test(t), k + ' 금지 표현 ' + t)); });
    const L = T.legendFor(k); assert.equal(L.length, 5); L.forEach((g, e) => { assert.equal(g.el, e); assert.deepEqual(g.words, D.e[e].words); }); }
  for (let i = 0; i < 12; i++) {
    const ch = M.compute({ year: 1960 + i * 4, month: 1 + (i * 7) % 12, day: 2 + (i * 5) % 26, hour: (i * 5) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' });
    const snap = J(ch.daeun.list.map(x => x.ev.fitScore));
    const items = [...ch.daeun.list.map(x => [x, 'daeun']), ...M.seunRange(ch, 2025, 2027).map(x => [x, 'seun']), ...M.wolun(ch, 2026).slice(0, 4).map(x => [x, 'wolun'])];
    for (const [x, kind] of items) {
      const base = T.read(M, ch, x, kind), sums = new Set();
      for (const k of keys) {
        let sc; try { sc = M.evaluateDomainLuck(ch, x, kind)[k].score; } catch (e) { sc = undefined; }
        const r = T.readDomain(M, ch, x, kind, k, { score: sc, name: k }); nd++;
        assert.equal(J(r), J(T.readDomain(M, ch, x, kind, k, { score: sc, name: k })), '분야 결정론');
        assert.equal(r.el, base.el, '분야가 달라도 주요 오행(막대 색)은 같음'); assert.equal(r.role, base.role); assert.equal(r.state, base.state);
        assert.deepEqual(r.words, T.DOMAIN[k].e[r.el].words, '핵심어는 그 분야 말'); assert.equal(r.area, T.DOMAIN[k].area);
        assert.ok(r.summary.includes(r.area) && r.recommend[0].includes(r.area), '요약·추천이 그 분야 말로');
        if (typeof sc === 'number') assert.ok(r.basis.some(t => t.includes(sc + '점')), '분야 점수는 엔진 값 그대로');
        assert.ok(!r.basis.some(t => /^흐름 점수.*막대 높이/.test(t)), '분야 그래프에서 막대 높이는 분야 점수');
        [r.summary, ...r.interact, ...r.recommend, ...r.caution, ...r.basis].forEach(t => assert.ok(!BAN.test(t) && !/을을|를를|이이 |가가 /.test(t), '금지 표현·조사 ' + t));
        sums.add(r.summary);
      }
      assert.equal(sums.size, keys.length, '같은 시기라도 지표마다 다른 말');
    }
    assert.equal(J(ch.daeun.list.map(x => x.ev.fitScore)), snap, '엔진 결과 불변(분야)');
  }
  assert.equal(T.readDomain(M, null, ch0(), 'daeun', 'love'), null, '사주 없음');
  assert.ok(/el: elDomOn\(\) \? elOf\(d\) : null, v: r\[m\]\.score/.test(html) && /el: elDomOn\(\) \? elOf\(x\) : null, v: r\[m\]\.score/.test(html), '분야 대운·월운 막대에 오행');
  assert.ok(/ELM && d\.el != null \? elFill\(d\.el\) : domCol\(k, v\)/.test(html), '분야 연도별 막대에 오행');
  assert.ok(/isDomain\(\) \? elLegendDomain\(\)/.test(html) && /LT\(\)\.legendFor\(k\)/.test(html), '분야 범례가 그 분야 말');
  assert.ok(/T\.readDomain\(M, S\.ch, x, kind, dk/.test(html), '선택 카드가 그 분야 말');
  assert.ok(html.includes('sigMetric(k, it.v), by = top - (it.el != null ? 25 : 22)'), '분야 등급 칩은 보조로 유지'); }
function ch0() { return { s: 0, b: 0 }; }
// 3-3) 지표 풀이(만세력 상세 맨 위): 16지표 × 4단위 의미 문장·등급별 한 줄·성분·이유, 오행 상자와 지표 등급이 어긋나지 않음
let nf = 0;
{ const blk = html.slice(html.indexOf('const DOM_ORDER = '), html.indexOf('const DOM_LEVEL_NAME'));
  const c2 = {}; vm.createContext(c2); vm.runInContext(blk.replace(/^\s*const /gm, 'var ') , c2);
  const keys = [...c2.DOM_ORDER, ...c2.DOM_SUB];
  for (const lv of ['daeun', 'seun', 'wolun', 'ilun']) for (const k of keys) { const t = c2.DOM_SCOPE[lv][k]; assert.ok(t && !/undefined/.test(t), '시기별 의미 문장 ' + lv + ' ' + k); }
  for (const k of keys) for (const gk of ['good', 'ok', 'care']) { const t = T.gradeLine(k, gk); assert.ok(t && t.length > 15 && !BAN.test(t), '등급별 한 줄 ' + k + ' ' + gk); }
  assert.equal(new Set(keys.map(k => T.gradeLine(k, 'good'))).size, 16, '지표마다 다른 한 줄');
  // 엔진 값: 모든 지표에 점수·성분·요약(풀이 상자가 빈 칸 없이 나옴)
  for (let i = 0; i < 10; i++) {
    const ch = M.compute({ year: 1955 + i * 6, month: 1 + (i * 5) % 12, day: 3 + (i * 7) % 25, hour: (i * 7) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' });
    const items = [[ch.daeun.list[2], 'daeun'], [M.seunRange(ch, 2026, 2026)[0], 'seun'], [M.wolun(ch, 2026)[3], 'wolun'], [M.ilun(ch, 2026, 11)[4], 'ilun']];
    for (const [x, kind] of items) { const res = M.evaluateDomainLuck(ch, x, kind); for (const k of keys) { const r = res[k]; nf++;
      assert.ok(r && typeof r.score === 'number' && r.summary && Array.isArray(r.parts) && r.parts.length, '지표 값 ' + k + ' ' + kind);
      const gk = LGm.metric(k, r.score), rd = T.readDomain(M, ch, x, kind, k, { score: r.score, name: k, grade: LGm.GRADES[gk.i].k });
      const all = [rd.summary, ...rd.recommend, ...rd.caution];
      all.forEach(t => assert.ok(!BAN.test(t), '금지 표현 ' + t));
      if (k !== 'accident' && LGm.GRADES[gk.i].k === 'care') assert.ok(!/적극 활용/.test(rd.summary), '지표 조심인데 적극 활용 ' + k);
      if (k === 'accident' && LGm.GRADES[gk.i].k === 'care') assert.ok(/더 챙겨/.test(rd.summary), '사고수 조심이면 더 챙기기');
    } }
  }
  // 등급 반영 규칙(직접 확인)
  { const ch = M.compute({ year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'F', calendar: 'solar' }); const x = ch.daeun.list[3];
    const b = T.read(M, ch, x, 'daeun');
    const care = T.readDomain(M, ch, x, 'daeun', 'wealth', { name: '재물운', grade: 'care' }), good = T.readDomain(M, ch, x, 'daeun', 'wealth', { name: '재물운', grade: 'good' });
    if (b.state === 'use' || b.state === 'neutral') assert.ok(/조심 구간/.test(care.caution[0]));
    if (b.state === 'careful' || b.state === 'steady') assert.ok(/좋음 구간/.test(good.recommend[0])); }
  // 화면 연결
  assert.ok(/\$\{themeBox\(x, kind\)\}\$\{domFocusBox\(x, kind\)\}/.test(html) && (html.match(/\$\{detailHead\(x, kind\)\}/g) || []).length === 2, '상세 맨 위 지표 풀이·머리 점수');
  assert.ok(/grade: typeof sc === 'number' \? sigMetric\(dk, sc\)\.k : null/.test(html), '오행 상자에 지표 등급');
  assert.ok(/isDomain\(\) \? domNote\('daeun'\)/.test(html) && /isDomain\(\) \? domNote\('seun'\)/.test(html), '그래프 아래 기본 안내가 지표 말');
  assert.ok(/const dk = isDomain\(\) \? S\.metric : null;   \/\/ 지표를 골랐으면 그 지표 점수/.test(html), '앞으로 10년이 지표 기준');
  assert.ok(/dcard\$\{S\.metric === k \? ' on' : ''\}/.test(html), '④ 분야 카드에 지금 지표 표시'); }
// 4) 운명의 타임라인: 전체 흐름 값에 같은 주요 오행, 막대·인생 그래프·10년 칩·카드 연결
{ const TG = require(path.join(root, 'report/hub/timeline-graph.js')), ch = M.compute({ year: 1992, month: 6, day: 23, hour: 1, minute: 45, calendar: 'solar', gender: 'M' });
  for (const d of ch.daeun.list) { const v = TG.value(M, ch, d, 'daeun', 'flow'); assert.equal(v.el, T.mainEl(M, d).el, '타임라인 흐름 값의 오행'); assert.ok(v.sig && v.sig.n, '등급은 보조로 그대로'); }
  // 분야 지표(인연·재물·직업·건강)도 같은 주요 오행(2026-11-25), 등급은 보조로 그대로
  for (const mk of TG.METRICS.map(m => m[0]).filter(k => k !== 'flow')) {
    assert.ok(T.DOMAIN[mk], '타임라인 분야 지표 ' + mk + ' 에 분야 말');
    for (const d of ch.daeun.list) { const v = TG.value(M, ch, d, 'daeun', mk); assert.equal(v.el, T.mainEl(M, d).el, '타임라인 분야 값의 오행 ' + mk); assert.ok(v.sig && v.sig.n, '분야 등급은 보조로 그대로'); }
    assert.ok(TG.life(M, ch, mk, 90).every(q => q.el != null), '분야 인생 전체에 오행 ' + mk);
  }
  assert.ok(TG.life(M, ch, 'flow', 90).every(q => q.el != null), '인생 전체 연도에 오행');
  const ht = fs.readFileSync(path.join(root, 'report/hub/hub-timeline.js'), 'utf8');
  assert.ok(/E = useEl\(vv\) \? vv\.el : null/.test(ht) && /useEl\(q\) \? elC\(q\.el\) : q\.sig\.c/.test(ht) && /head \+ themeHtml\(it, lvl\)/.test(ht) && /elLegend\(\)/.test(ht), '타임라인 막대·인생·카드·범례 연결');
  assert.ok(ht.includes("return (metric() === 'flow' || domEl()) && v && v.el != null") && ht.includes('LTm().legendFor(metric())') && ht.includes('T.readDomain(M, ch, r0.p, lvl, metric()'), '타임라인 분야 지표 막대·범례·카드 연결');
  const hi = fs.readFileSync(path.join(root, 'report/hub/index.html'), 'utf8'), st = fs.readFileSync(path.join(root, 'report/story/story.js'), 'utf8');
  assert.ok(/\/luck-element-theme\.js\?v=/.test(hi) && /'\/luck-element-theme\.js' \+ HV/.test(st), '허브·/report/ 둘 다 모듈을 불러옴'); }
// 5) 상세풀이 타이밍 그래프(reading-text.js): 막대 색 = 같은 주요 오행, 범례는 오행, 페이지가 모듈을 불러옴(2026-11-25)
{ const rt = fs.readFileSync(path.join(root, 'report/v2/reading-text.js'), 'utf8'), v2 = fs.readFileSync(path.join(root, 'report/v2/index.html'), 'utf8');
  assert.ok(/T\.mainEl\(Mn,\{s:s,b:b\}\)/.test(rt) && /--t:'\+EL_COL\[ei\]/.test(rt) && /막대 색 = 그 시기에 두드러지는 기운\(길흉 아님\)/.test(rt), '상세풀이 막대 오행 색·범례');
  assert.ok(/<script src="\/engine\.js"><\/script><script src="\/luck-element-theme\.js\?v=/.test(v2), '상세풀이 페이지가 모듈을 엔진 다음에 불러옴'); }
// 6) 운명의 타임라인 일진 캘린더 칸(hub-saju.js): 배경 = 그날의 주요 오행, 등급은 보조(2026-11-25)
{ const sj = fs.readFileSync(path.join(root, 'report/hub/hub-saju.js'), 'utf8');
  assert.ok(/var de = dayEl\(x\)/.test(sj) && /--flow:'\+elCol\(de\)/.test(sj) && /<i class="mc-el">/.test(sj), '타임라인 일진 캘린더 칸 오행 색·한자'); }
console.log(`luck-element-theme-sim ok · 해석 ${n}건 · 분야 해석 ${nd}건 · 지표 풀이 ${nf}건 · 상태 ${J(states)} · 오행별 서로 다른 해석 ${Object.keys(byEl).map(e => T.EL_K[e] + byEl[e].size).join(' ')}`);
