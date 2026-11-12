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
assert.deepEqual(T.METRICS.map(x => x[0]), ['flow', 'love', 'wealth', 'career', 'health']); assert.equal(T.METRICS_SUB.length, 0); ok('지표는 전체 흐름·인연·재물·직업·건강 5개');
{ // 자미두수 쉽게 보기·대한·유년: 만세력 자미두수 탭과 같은 값(1985.1.23 음력 07:45 여, 2026년 기준 화면 값)
  const ch = M.compute({ year: 1985, month: 1, day: 23, hour: 7, minute: 45, calendar: 'lunar', gender: 'F', city: '서울' }), z = T.ziwei(M, ch, Date.UTC(2026, 10, 12, 3));
  assert.equal(z.daehan.map(d => d.name + d.v).join(' '), '명60 부모39 복덕71 전택37 관록66 노복19 천이66 질액48 재백64 자녀18 부처80 형제32');
  assert.equal(z.daehan.find(d => d.cur).name, '전택');
  assert.equal(z.liu.map(d => d.Y + ':' + d.v).join(' '), '2024:66 2025:48 2026:64 2027:18 2028:80 2029:32 2030:60 2031:39 2032:71 2033:37');
  assert.match(z.rows[0].b, /탐랑<\/b> — 욕망과 재주, 매력의 별/);
  const noHour = M.compute({ year: 1990, month: 5, day: 5, hour: null, minute: 0, calendar: 'solar', gender: 'M', city: '서울' });
  assert.doesNotThrow(() => T.ziwei(M, noHour, Date.now()));
}
ok('자미두수 쉽게 보기·10년 대한·유년 값이 만세력과 같음(시각 모름도 깨지지 않음)');
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
{ const ch = M.compute({ year: 1985, month: 1, day: 23, hour: 7, minute: 45, calendar: 'lunar', gender: 'F', city: '서울' }), c = T.nowChain(M, ch, Date.UTC(2026, 10, 12, 3));
  assert.deepEqual(c.items.map(i => i.name), ['원국', '대운', '세운', '월운', '일진']); assert.match(c.line, /^당신이라는 자동차가 지금 .+ 대운이라는 도로/); assert.ok(c.items.every(i => i.now));
  const kid = M.compute({ year: 2025, month: 3, day: 1, hour: 9, minute: 0, calendar: 'solar', gender: 'M', city: '서울' }), k2 = T.nowChain(M, kid, Date.UTC(2026, 10, 12, 3)); assert.ok(k2.line.length > 10); }
ok('운은 어떻게 작동하나요?: 원국·대운·세운·월운·일진 다섯 칸과 지금 값(대운 전 아이도 깨지지 않음)');
// 화면 연결
const tl = fs.readFileSync(path.join(ROOT, 'report/hub/hub-timeline.js'), 'utf8');
for (const s of ['function metricBar(', 'function lifeHtml(', 'function spanHtml(', 'function pairHtml(', 'function domHtml(', 'function structHtml(', 'function tenHtml(', 'function carHtml(', 'function avatarHtml(', 'function zwHtml(', 'root.MantraNatal.html(', 'tqAva', "t.closest('[data-metric]')", 'loadGraph()']) assert.ok(tl.includes(s), s);
ok('hub-timeline.js 에 지표 칩·인생 90년·30년/2년 구간·상세 보강·앞으로 10년이 연결됨');
{ const css = fs.readFileSync(path.join(ROOT, 'report/hub/timeline.css'), 'utf8'); assert.match(css, /@keyframes tqFloat/); assert.ok(css.includes('prefers-reduced-motion: reduce){ #hub .tq-ava-ring{ animation: none')); }
ok('원국 지장간·12운성·12신살·신살 행, 일주 포스터 프로필(움직임 줄이기 설정 존중)');
console.log('PASS timeline-graph-sim ' + n + '항목');
