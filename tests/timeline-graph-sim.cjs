// 2026-11-12 운명의 타임라인 그래프 업그레이드 검사(report/hub/timeline-graph.js).
// ① 신호등 단계 기준이 만세력(index.html SIG_CUTS)과 같다 ② 지표 4개(전체 흐름·인연·재물·직업)
// ③ 값은 엔진 그대로(흐름 = ev.fitScore, 분야 = evaluateDomainLuck) ④ 인생 90년·앞으로 10년·구조 판정이 사주 여러 개에서 깨지지 않는다
const assert = require('assert/strict'), fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = globalThis; vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8'));
const M = globalThis.Manse, T = require(path.join(ROOT, 'report/hub/timeline-graph.js'));
let n = 0; const ok = m => { n++; console.log('  ok ' + m); };

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), m = html.match(/const SIG_CUTS = (\{[^;]*\});/);
assert.ok(m, 'index.html SIG_CUTS'); assert.deepEqual(T.SIG_CUTS, JSON.parse(m[1])); ok('신호등 단계 기준이 만세력과 같다');
assert.deepEqual(T.METRICS.map(x => x[0]), ['flow', 'love', 'wealth', 'career']); assert.equal(T.METRICS_SUB.length, 0); ok('지표는 전체 흐름·인연·재물·직업 4개');
assert.equal(T.sigMetric('accident', 10).k, 'best'); assert.equal(T.sigMetric('accident', 90).k, 'bad'); assert.equal(T.sigFlow(M, 40).k, 'best'); assert.equal(T.sigFlow(M, -50).k, 'bad'); ok('사고수는 거꾸로, 흐름은 엔진 상태 기준');

const people = [[1985, 1, 23, 7, 45, 'lunar', 'F'], [1992, 6, 23, 1, 30, 'solar', 'M'], [1970, 3, 3, 12, 0, 'solar', 'F'], [2001, 11, 30, 22, 10, 'solar', 'M'], [1958, 8, 8, 5, 5, 'solar', 'M']];
for (const [y, mo, d, h, mi, cal, g] of people) {
  const ch = M.compute({ year: y, month: mo, day: d, hour: h, minute: mi, calendar: cal, gender: g, city: '서울' });
  const du = ch.daeun.list[2], se = M.seunRange(ch, 2026, 2026)[0];
  const f = T.value(M, ch, du, 'daeun', 'flow'); assert.equal(f.v, T.pct(du.ev.fitScore)); assert.equal(f.raw, du.ev.fitScore);
  for (const k of ['love', 'wealth', 'career']) { const v = T.value(M, ch, se, 'seun', k), e = M.evaluateDomainLuck(ch, se, 'seun', { ms: se.midMs })[k]; assert.equal(v.raw, e.score); assert.ok(v.v >= 0 && v.v <= 100); assert.ok(T.SIG.includes(v.sig)); }
  const life = T.life(M, ch, 'wealth', 90); assert.ok(life.length >= 90 && life[0].year === ch.solar.y); assert.ok(life.every(q => q.v >= 0 && q.v <= 100 && q.sig));
  const ten = T.tenYears(M, ch, 2026, 'flow'); assert.equal(ten.years.length, 10); assert.ok(ten.good.every(q => ['best', 'good'].includes(q.sig.k)) && ten.bad.every(q => ['warn', 'bad'].includes(q.sig.k)));
  const s = T.structure(M, ch, du, 'daeun'); assert.ok(s.flow && s.flow.verdict && Array.isArray(s.patterns));
}
ok('사주 5개: 흐름·분야 값이 엔진과 같고, 인생 90년·앞으로 10년·구조 판정이 정상');
// 화면 연결
const tl = fs.readFileSync(path.join(ROOT, 'report/hub/hub-timeline.js'), 'utf8');
for (const s of ['function metricBar(', 'function lifeHtml(', 'function spanHtml(', 'function pairHtml(', 'function domHtml(', 'function structHtml(', 'function tenHtml(', "t.closest('[data-metric]')", 'loadGraph()']) assert.ok(tl.includes(s), s);
ok('hub-timeline.js 에 지표 칩·인생 90년·30년/2년 구간·상세 보강·앞으로 10년이 연결됨');
console.log('PASS timeline-graph-sim ' + n + '항목');
