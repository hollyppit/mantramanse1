/* 두 사람 운 흐름 겹쳐 보기(2026-11-26) — 만세력 궁합 탭 카드, 표시 전용
 *  · 점수: 두 사람 각자의 세운 흐름 점수(engine.js seunRange(...).combined) 그대로. 새 점수를 만들지 않는다.
 *  · 등급: luck-grade.js flow() (좋음·무난·조심) 그대로.
 *  · 해석: 두 값의 관계(둘 다 좋음·둘 다 조심·한쪽만 좋음·방향이 엇갈림·곡선 교차)만 말한다. 궁합 길흉·관계 결과는 단정하지 않는다.
 *  · 축: 나이가 달라 연도 기준(사주 연도 = 입춘 기준).
 *  브라우저: window.MantraPairFlow · Node: module.exports
 */
(function (root) {
  'use strict';
  var VERSION = 'pair-flow-1-2026-11-26';
  var MOVE = 10;   // 해마다 흐름 점수가 이만큼 이상 반대로 움직이면 '방향이 엇갈림'(표시용 문턱, 점수는 그대로)

  function gradeOf(LG, M, v) { return LG && LG.flow ? LG.flow(v, M) : (v >= 18 ? { k: 'good', n: '좋음' } : v > -12 ? { k: 'ok', n: '무난' } : { k: 'care', n: '조심' }); }
  function point(M, LG, ch, Y) {
    if (!ch || !ch.solar || Y < ch.solar.y) return null;   // 태어나기 전 해는 비운다
    var x = (M.seunRange(ch, Y, Y) || [])[0];
    if (!x || !Number.isFinite(x.combined)) return null;
    var g = gradeOf(LG, M, x.combined), du = x.daeun;
    return { v: x.combined, gz: M.gzName(x), age: x.age, g: g.k, gn: g.n, s: x.s, b: x.b,
      daeun: du ? { gz: M.gzName(du), startYear: du.startYear, startAge: du.startAge } : null };
  }
  // 연속된 해 묶기: [{from,to,years}]
  function runs(years) {
    var out = [];
    years.forEach(function (Y) { var r = out[out.length - 1]; if (r && r.to === Y - 1) { r.to = Y; r.years.push(Y); } else out.push({ from: Y, to: Y, years: [Y] }); });
    return out;
  }
  var span = function (r) { return r.from === r.to ? r.from + '년' : r.from + '~' + r.to + '년'; };

  /* build(M, chA, chB, opt)
   *  opt: { from, to, names:{a,b}, LG(=MantraLuckGrade), curY }
   *  → { rows:[{year,a,b,kind,move}], crosses:[{x(연도 소수),year}], groups:{both,care,split,diverge}, lines:[...] , daeunMarks:{a:[],b:[]} }
   *  kind: 'both'(둘 다 좋음) · 'care'(둘 다 조심) · 'split'(한쪽 좋음·한쪽 조심) · 'mixed'(그 밖) · null(한쪽 값 없음)
   *  move: 'diverge'(전년 대비 한쪽 오르고 한쪽 내림, 둘 다 MOVE 이상) | null
   */
  function build(M, chA, chB, opt) {
    opt = opt || {};
    var LG = opt.LG || root.MantraLuckGrade, nm = opt.names || {}, A = nm.a || '나', B = nm.b || '상대';
    var lo = Math.max(M.MIN_Y || 1, opt.from), hi = Math.min((M.MAX_Y || 2100) - 1, opt.to);
    var rows = [];
    for (var Y = lo; Y <= hi; Y++) {
      var a = point(M, LG, chA, Y), b = point(M, LG, chB, Y), kind = null;
      if (a && b) kind = a.g === 'good' && b.g === 'good' ? 'both' : a.g === 'care' && b.g === 'care' ? 'care' : (a.g === 'good' && b.g === 'care') || (a.g === 'care' && b.g === 'good') ? 'split' : 'mixed';
      rows.push({ year: Y, a: a, b: b, kind: kind, move: null });
    }
    var crosses = [];
    for (var i = 1; i < rows.length; i++) {
      var p = rows[i - 1], q = rows[i];
      if (!p.a || !p.b || !q.a || !q.b) continue;
      var da = q.a.v - p.a.v, db = q.b.v - p.b.v;
      if ((da >= MOVE && db <= -MOVE) || (da <= -MOVE && db >= MOVE)) q.move = 'diverge';
      var d0 = p.a.v - p.b.v, d1 = q.a.v - q.b.v;
      if (d0 !== 0 && d1 !== 0 && (d0 > 0) !== (d1 > 0)) { var t = d0 / (d0 - d1); crosses.push({ x: p.year + t, year: t < 0.5 ? p.year : q.year, from: d0 > 0 ? 'a' : 'b' }); }
    }
    var pick = function (f) { return rows.filter(f).map(function (r) { return r.year; }); };
    var groups = { both: runs(pick(function (r) { return r.kind === 'both'; })), care: runs(pick(function (r) { return r.kind === 'care'; })), split: runs(pick(function (r) { return r.kind === 'split'; })), diverge: pick(function (r) { return r.move === 'diverge'; }) };
    // 해석 줄: 두 값의 관계만
    var lines = [], jo = function (w, a2, b2) { var c = String(w).charCodeAt(String(w).length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0 ? a2 : b2); };
    if (groups.both.length) lines.push({ k: 'both', t: groups.both.slice(0, 3).map(span).join(', ') + '에는 두 사람 흐름이 함께 좋음 구간이에요. 같이 계획을 세우거나 일을 벌이기에 서로 여유가 있는 때로 볼 수 있어요.' });
    else lines.push({ k: 'both', t: '이 기간에는 두 사람 흐름이 함께 좋음 구간에 드는 해가 없어요. 한 사람이 좋을 때 다른 사람이 받쳐 주는 식으로 번갈아 가는 흐름이에요.' });
    if (groups.split.length) lines.push({ k: 'split', t: groups.split.slice(0, 3).map(span).join(', ') + '에는 한 사람은 좋음, 한 사람은 조심 구간이라 속도가 달라요. 여유 있는 쪽이 일정을 조금 맞춰 주면 부딪힘이 줄어요.' });
    if (groups.care.length) lines.push({ k: 'care', t: groups.care.slice(0, 3).map(span).join(', ') + '에는 두 사람 모두 조심 구간이에요. 큰 결정은 서로 한 번 더 확인하고, 무리한 일정은 줄이는 편이 편해요.' });
    if (groups.diverge.length) lines.push({ k: 'diverge', t: groups.diverge.slice(0, 4).map(function (y) { return y + '년'; }).join(', ') + '에는 전년보다 한 사람은 오르고 한 사람은 내려가요. 체감하는 분위기가 달라 서로 이해가 엇갈리기 쉬운 해예요.' });
    if (crosses.length) lines.push({ k: 'cross', t: '두 곡선이 ' + crosses.length + '번 엇갈려요(' + crosses.slice(0, 4).map(function (c) { return c.year + '년 무렵'; }).join(', ') + '). 그때마다 누가 더 여유 있는지가 바뀌니, 기대는 쪽도 번갈아 바뀐다고 생각하면 편해요.' });
    else if (rows.some(function (r) { return r.a && r.b; })) {
      var all = rows.filter(function (r) { return r.a && r.b; }), up = all[0].a.v > all[0].b.v ? A : B;
      lines.push({ k: 'cross', t: '이 기간 동안 두 곡선은 엇갈리지 않고 ' + jo(up, '이', '가') + ' 계속 위에 있어요. 흐름 점수가 높은 쪽이 꼭 더 잘 된다는 뜻은 아니고, 각자의 사주 기준으로 본 흐름이에요.' });
    }
    // 대운이 바뀌는 해(각자)
    var dm = function (ch) { return ch && ch.daeun && ch.daeun.list ? ch.daeun.list.filter(function (d, k) { return k > 0 && d.startYear >= lo && d.startYear <= hi; }).map(function (d) { return { year: d.startYear, gz: M.gzName(d) }; }) : []; };
    return { version: VERSION, from: lo, to: hi, names: { a: A, b: B }, rows: rows, crosses: crosses, groups: groups, lines: lines, daeunMarks: { a: dm(chA), b: dm(chB) } };
  }

  // 그 해 한 줄(상세 패널): 두 값의 관계만
  function yearLine(r, names) {
    if (!r || !r.a || !r.b) return '한 사람은 아직 태어나기 전이라 비교할 흐름이 없어요.';
    var A = names.a, B = names.b, hi = r.a.v >= r.b.v ? A : B, gap = Math.abs(r.a.v - r.b.v);
    var base = r.kind === 'both' ? '두 사람 모두 좋음 구간이에요.' : r.kind === 'care' ? '두 사람 모두 조심 구간이에요.' : r.kind === 'split' ? '한 사람은 좋음, 한 사람은 조심 구간이라 흐름의 속도가 달라요.' : '두 사람 중 한 사람 이상이 무난 구간이에요.';
    var g = gap < 8 ? ' 흐름 점수도 비슷해요.' : ' 이 해는 ' + hi + ' 쪽 흐름이 ' + Math.round(gap) + '점 더 높아요.';
    return base + g +(r.move === 'diverge' ? ' 전년보다 한 사람은 오르고 한 사람은 내려가는 해예요.' : '');
  }

  /* 여러 명(3~6명) — buildGroup(M, members[{name,ch}], opt{from,to,LG})
   *  rows: [{year, vals:[point|null], good, ok, care, n, kind, top}]
   *  kind: 'many'(절반 이상 좋음·조심 없음) · 'care'(절반 이상 조심·좋음 없음) · 'split'(좋음과 조심이 섞임) · 'mixed' · null(비교할 사람 2명 미만)
   *  top: 그해 흐름 점수가 가장 높은 사람 번호(동점이면 앞 사람). topChanges: 맨 위 사람이 바뀌는 해
   */
  function buildGroup(M, members, opt) {
    opt = opt || {};
    var LG = opt.LG || root.MantraLuckGrade, mem = members || [];
    var lo = Math.max(M.MIN_Y || 1, opt.from), hi = Math.min((M.MAX_Y || 2100) - 1, opt.to);
    var names = mem.map(function (m, i) { return m.name || ('사람' + (i + 1)); });
    var rows = [];
    for (var Y = lo; Y <= hi; Y++) {
      var vals = mem.map(function (m) { return point(M, LG, m.ch, Y); }), c = { good: 0, ok: 0, care: 0 }, n = 0, top = -1;
      vals.forEach(function (p, i) { if (!p) return; n++; c[p.g]++; if (top < 0 || p.v > vals[top].v) top = i; });
      var half = Math.ceil(n / 2), kind = null;
      if (n >= 2) kind = c.good >= half && c.care === 0 ? 'many' : c.care >= half && c.good === 0 ? 'care' : c.good && c.care ? 'split' : 'mixed';
      rows.push({ year: Y, vals: vals, good: c.good, ok: c.ok, care: c.care, n: n, kind: kind, top: top });
    }
    var topChanges = [];
    for (var i = 1; i < rows.length; i++) { var p = rows[i - 1], q = rows[i]; if (p.n >= 2 && q.n >= 2 && p.top >= 0 && q.top >= 0 && p.top !== q.top) topChanges.push({ year: q.year, from: p.top, to: q.top }); }
    var pick = function (k) { return runs(rows.filter(function (r) { return r.kind === k; }).map(function (r) { return r.year; })); };
    var groups = { many: pick('many'), care: pick('care'), split: pick('split') };
    var lines = [];
    if (groups.many.length) lines.push({ k: 'both', t: groups.many.slice(0, 3).map(span).join(', ') + '에는 절반 넘는 사람이 좋음 구간이고 조심 구간인 사람이 없어요. 함께 무언가를 시작하거나 모이기에 서로 여유가 있는 때로 볼 수 있어요.' });
    else lines.push({ k: 'both', t: '이 기간에는 절반 넘는 사람이 함께 좋음 구간에 드는 해가 없어요. 사람마다 좋은 때가 번갈아 와서, 그때그때 여유 있는 사람이 무리를 받쳐 주는 흐름이에요.' });
    if (groups.split.length) lines.push({ k: 'split', t: groups.split.slice(0, 3).map(span).join(', ') + '에는 좋음 구간인 사람과 조심 구간인 사람이 함께 있어요. 같은 일을 해도 체감 속도가 달라, 일정과 기대치를 서로 맞춰 보면 편해요.' });
    if (groups.care.length) lines.push({ k: 'care', t: groups.care.slice(0, 3).map(span).join(', ') + '에는 절반 넘는 사람이 조심 구간이에요. 무리 전체가 큰 결정을 할 때는 한 번 더 확인하고 일정을 넉넉히 잡는 편이 편해요.' });
    if (topChanges.length) lines.push({ k: 'cross', t: '흐름 점수가 가장 높은 사람이 ' + topChanges.length + '번 바뀌어요(' + topChanges.slice(0, 4).map(function (c) { return c.year + '년 ' + names[c.to]; }).join(', ') + '). 해마다 여유 있는 사람이 달라지니, 기대는 쪽도 돌아가며 바뀐다고 생각하면 편해요.' });
    var dm = function (ch) { return ch && ch.daeun && ch.daeun.list ? ch.daeun.list.filter(function (d, k) { return k > 0 && d.startYear >= lo && d.startYear <= hi; }).map(function (d) { return { year: d.startYear, gz: M.gzName(d) }; }) : []; };
    return { version: VERSION, from: lo, to: hi, names: names, rows: rows, groups: groups, topChanges: topChanges, lines: lines, daeunMarks: mem.map(function (m) { return dm(m.ch); }) };
  }
  function groupYearLine(r, names) {
    if (!r || r.n < 2) return '이 해에는 비교할 사람이 2명보다 적어요.';
    var base = r.kind === 'many' ? '절반 넘는 사람이 좋음 구간이고 조심 구간인 사람이 없어요.' : r.kind === 'care' ? '절반 넘는 사람이 조심 구간이에요.' : r.kind === 'split' ? '좋음 구간인 사람과 조심 구간인 사람이 함께 있어 체감 속도가 달라요.' : '큰 쏠림 없이 무난 구간인 사람이 많은 해예요.';
    return base + ' (좋음 ' + r.good + '명 · 무난 ' + r.ok + '명 · 조심 ' + r.care + '명)';
  }

  var api = { VERSION: VERSION, MOVE: MOVE, build: build, yearLine: yearLine, buildGroup: buildGroup, groupYearLine: groupYearLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MantraPairFlow = api;
})(typeof window !== 'undefined' ? window : globalThis);
