// 만트라 개운 5계(/gaewoon.js) 검증:  node tests/gaewoon-sim.cjs [사주 수=200]
//  · 원칙 ↔ 십성 묶음 대응(1 관성·2 식상·3 비겁·4 인성·5 재성), 다섯 원칙은 늘 모두 보인다('조심할 원칙' 없음)
//  · 나의 원칙 = 통합 용신 오행의 십성 묶음 · 지금의 원칙 = 운에서 가장 크게 들어오는 묶음(순풍·무난) / 역풍이면 처방 묶음(용신·희신 묶음이면 나의 원칙)
//  · 상세풀이 종합 개운법 장(timeline_self_37)에 실제 조립 경로로 붙는지 · 결정론 · 엔진 결과 불변 · 금지 표현·조사
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 200;
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' }); globalThis.window = globalThis;
['luck-grade', 'gaewoon'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8'), { filename: f }));
const dir = path.join(root, 'report/v2'), load = f => vm.runInThisContext(fs.readFileSync(path.join(dir, f + '.js'), 'utf8'), { filename: f });
['fact-once', 'ilju-data', 'saju-data', 'deep', 'deep-life', 'deep-time', 'deep-wealth', 'deep-love', 'reading-feature-data-1', 'reading-feature-data-2', 'reading-feature'].forEach(load);
const M = Manse, G = MantraGaewoon, LG = MantraLuckGrade, R = ReportV2, J = x => JSON.stringify(x);
const BAN = /반드시|무조건|확실히|틀림없|보장|대박|undefined|NaN|null|비겁|식상|재성|관성|인성|조심할 원칙/;
const JOSA = /를을|을를|은는 |는은 |이이 |‘[^’]*[가-힣]’을 /;

// 대응표
assert.deepEqual(G.P.map(p => [p.no, G.GROUP_K[p.g]]), [[1, '관성'], [2, '식상'], [3, '비겁'], [4, '인성'], [5, '재성']]);
assert.deepEqual(Object.keys(G.REMEDY).map(k => [G.GROUP_K[k], G.GROUP_K[G.REMEDY[k].to]]).sort(), [['관성', '인성'], ['비겁', '식상'], ['식상', '인성'], ['인성', '재성'], ['재성', '비겁']].sort());
assert.equal(G.groupOfEl(3, 3), 0); assert.equal(G.groupOfEl(3, 4), 1); assert.equal(G.groupOfEl(3, 0), 2); assert.equal(G.groupOfEl(3, 1), 3); assert.equal(G.groupOfEl(3, 2), 4);

const cnt = { life: {}, seunNo: {}, wind: {}, care: 0, careMine: 0, block: 0 }, outs = new Set();
const now = Date.UTC(2026, 10, 28);
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 62, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: i % 13 === 0 ? null : (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  const ch = M.compute(inp), before = J({ w: ch.weights, s: ch.strength, u: ch.unified });
  const o = G.build(M, ch, now), o2 = G.build(M, ch, now);
  assert.equal(J(o), J(o2), '결정론');
  assert.ok(o.life, '나의 원칙');
  const dEl = M.stemEl(ch.pillars.day.s);
  assert.equal(o.life.g, G.groupOfEl(dEl, ch.unified.yong), '나의 원칙 = 용신 묶음');
  cnt.life[o.life.p.no] = (cnt.life[o.life.p.no] || 0) + 1;
  for (const [x, per] of [[(ch.daeun.list || []).find(d => d.startYear <= 2026 && 2026 < d.startYear + 10), o.daeun], [M.seunRange(ch, 2026, 2026)[0], o.seun]]) {
    if (!x) { assert.equal(per, null); continue; }
    const gp = M.groupPull(dEl, x); let top = -1; gp.forEach((v, k) => { if (v > 0 && (top < 0 || v > gp[top])) top = k; });
    if (top < 0) { assert.equal(per, null); continue; }
    const wind = LG.flow(x.ev.fitScore, M).k, mine = top === o.life.g || top === o.life.hee;
    assert.equal(per.wind, wind, '바람 = luck-grade 등급'); assert.equal(per.src, top, '들어오는 묶음 = groupPull 최대');
    if (wind !== 'care') assert.equal(per.g, top, '순풍·무난 = 들어오는 묶음의 원칙');
    else if (mine) { assert.equal(per.g, o.life.g, '역풍인데 용신·희신 묶음 = 나의 원칙'); cnt.careMine++; }
    else { assert.equal(per.g, G.REMEDY[top].to, '역풍 = 처방 묶음'); cnt.care++; }
  }
  if (o.seun) { cnt.seunNo[o.seun.p.no] = (cnt.seunNo[o.seun.p.no] || 0) + 1; cnt.wind[o.seun.wind] = (cnt.wind[o.seun.wind] || 0) + 1; }
  const h = G.html(o), txt = h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ');
  G.P.forEach(p => assert.ok(txt.includes(p.no + '. ' + p.title), '다섯 원칙 모두 보임: ' + p.title));
  assert.ok(!BAN.test(txt), '금지 표현: ' + (txt.match(BAN) || [''])[0]);
  assert.ok(!JOSA.test(txt), '조사: ' + (txt.match(JOSA) || [''])[0]);
  assert.ok(/class="gw-badge">나의 원칙/.test(h), '나의 원칙 표시');
  outs.add(o.life.line + '|' + (o.seun && o.seun.line));
  // 타임라인 한 줄: 다른 해도 '그해' 말로
  const yl = G.yearLine(M, ch, 2029); if (yl) assert.ok(!/^지금은/.test(yl.line) && !BAN.test(yl.line), '다른 해 한 줄');
  assert.equal(J({ w: ch.weights, s: ch.strength, u: ch.unified }), before, '엔진 결과 불변');
  // 실제 조립 경로: 종합 개운법 장에 붙는지
  if (i % 10 === 1) {
    const sd = R.SajuData.build(ch, { now });
    const c = { id: 'timeline_self_37', editorialContractId: 'timeline_self_37' }; Object.defineProperty(c, 'readingFeature', { value: { M, ch, sd, now, name: '', assets: {}, videos: {} }, enumerable: false });
    const b = R.ReadingFeature.build(c), all = b ? (b.lead || '') + (b.rest || '') : '';
    assert.ok(/gw5/.test(all) && /만트라 개운 5계/.test(all), '개운법 장에 5계 블록'); cnt.block++;
    const c2 = { id: 'timeline_career_14', editorialContractId: 'timeline_career_14' }; Object.defineProperty(c2, 'readingFeature', { value: { M, ch, sd, now, name: '', assets: {}, videos: {} }, enumerable: false });
    const b2 = R.ReadingFeature.build(c2); assert.ok(!/gw5/.test(b2 ? (b2.lead || '') + (b2.rest || '') : ''), '다른 장에는 없음');
  }
}
assert.equal(Object.keys(cnt.life).length, 5, '나의 원칙이 다섯 원칙에 고르게 나뉨');
assert.ok(cnt.care > 0 && outs.size >= 15, '역풍 처방·명식마다 다른 결과(나의 원칙 × 올해 원칙 조합)');
console.log('gaewoon-sim 통과', JSON.stringify(cnt), '서로 다른 결과', outs.size);
