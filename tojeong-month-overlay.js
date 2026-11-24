/* 토정비결 월별 운세 → 만세력 월운 그래프 보조지표(2026-11-24)
 *  · 데이터는 기존 신년운세 API(/api/newyear/reading)가 돌려준 풀이를 그대로 읽는다. 점수·풀이를 새로 만들지 않는다.
 *  · 토정비결은 음력 달, 명리 월운은 절기 달이다. 둘을 같은 달로 보지 않고, 음력 달의 양력 날짜 구간을 월운 그래프의 시간축 위에 그대로 놓는다.
 *  · 표시 단계는 현대어 풀이의 월별 판정(tone: good·neutral·caution·burden) 그대로이며, 명리 월운 점수와 합치지 않는다.
 *    판정이 없는 달(검수 전·자료 없음)은 점을 찍지 않고 원문만 보여 준다.
 *  브라우저: window.MantraTojeongMonth · Node: module.exports
 */
(function (root) {
  'use strict';
  var DAY = 86400000;
  // 보조축 위치(그래프 세로 ±60 칸 안의 자리일 뿐, 점수가 아니다)
  var TONE = { good: { n: '길', pos: 44, r: 2 }, neutral: { n: '평', pos: 14, r: 1 }, caution: { n: '주의', pos: -16, r: 0 }, burden: { n: '부담', pos: -46, r: -1 } };
  var GRADE_R = { good: 2, ok: 1, care: 0 };
  var COLOR = '#7B4FC9';
  var kstDay = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim()); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) - 9 * 3600000 : null; };

  // 신년운세 풀이 → 음력 달 목록. 잠긴 맛보기(locked)·자료 없음은 그대로 알린다
  function parse(reading) {
    if (!reading || !Array.isArray(reading.chapters)) return { state: 'none', months: [] };
    var ch = null; reading.chapters.forEach(function (c) { if (!ch && Array.isArray(c.months) && c.months.length) ch = c; });
    if (!ch) return { state: 'none', months: [] };
    if (ch.locked || ch.months.every(function (m) { return m.locked; })) return { state: 'locked', months: [] };
    var months = ch.months.map(function (m) {
      var sol = String(m.solar || '').split('~').map(function (x) { return x.trim(); }), a = kstDay(sol[0]), b = kstDay(sol[1]);
      var tj = (m.paras || []).filter(function (p) { return p && p.role === 'tojeong'; }).map(function (p) { return String(p.text || ''); });
      var orig = tj.filter(function (t) { return /^토정비결 \d+월/.test(t); })[0] || '', gist = tj.filter(function (t) { return !/^토정비결 \d+월/.test(t); })[0] || '';
      return { lm: m.lunarMonth, label: m.label || ('음력 ' + m.lunarMonth + '월'), solar: m.solar || '', start: a, end: b == null ? null : b + DAY,
        tone: TONE[m.tojeongTone] ? m.tojeongTone : null, original: orig.replace(/^토정비결 \d+월( 원문)?:\s*/, ''), gist: gist, locked: !!m.locked };
    }).filter(function (m) { return m.start != null && m.end != null && !m.locked; });
    return { state: months.length ? 'ok' : 'none', months: months };
  }

  // 그래프 시간축: 월운 i번째 막대는 [startMs(i), startMs(i+1)) — 음력 달 가운데 날짜가 어느 막대의 몇 % 지점인지
  function place(months, wol, endMs) {
    var edge = wol.map(function (w) { return w.startMs; }).concat([endMs]), n = wol.length;
    var at = function (t) { for (var i = 0; i < n; i++) if (t >= edge[i] && t < edge[i + 1]) return i + (t - edge[i]) / (edge[i + 1] - edge[i]); return null; };
    return months.map(function (m) { var mid = (m.start + m.end) / 2, f = at(mid); return { m: m, f: f, inRange: f != null }; });
  }
  // 한 절기월(월운) 구간과 겹치는 음력 달들 — 겹친 날수와 함께(같은 달로 보지 않는다)
  function overlap(months, a, b) {
    return months.map(function (m) { var d = Math.round((Math.min(b, m.end) - Math.max(a, m.start)) / DAY); return { m: m, days: d }; }).filter(function (x) { return x.days > 0; });
  }
  // 두 체계 비교(점수를 섞지 않고 방향만): 명리 등급(좋음·무난·조심) vs 토정 판정(길·평·주의·부담)
  function compare(tone, gradeKey) {
    if (!tone || !TONE[tone] || !(gradeKey in GRADE_R)) return { kind: 'unknown', text: '토정비결 현대어 판정이 없는 달이라 두 해석을 비교하지 않아요. 원문만 참고해 주세요.' };
    var d = TONE[tone].r - GRADE_R[gradeKey];
    if (d === 0) return { kind: 'same', text: '두 해석이 같은 방향이에요.' };
    if (Math.abs(d) === 1) return { kind: 'near', text: '방향은 비슷하고 정도만 조금 달라요.' };
    return { kind: 'opposite', text: '두 해석이 서로 반대 방향이에요. 섞지 말고 따로 읽어 주세요.' };
  }
  // 보조선 SVG(막대 위에 겹침, 클릭은 막대로 통과): g = { L, step, y, W, R, T, H, B }
  function svg(points, g) {
    var on = points.filter(function (p) { return p.inRange && p.m.tone; });
    var s = '<g class="tj-ov" style="pointer-events:none">';
    // 오른쪽 보조축(토정 4단계) — 막대 점수 눈금과 다른 축임을 글자로 표시
    ['good', 'neutral', 'caution', 'burden'].forEach(function (k) { var yy = g.y(TONE[k].pos); s += '<text x="' + (g.W - g.R - 2) + '" y="' + (yy + 3.5) + '" text-anchor="end" style="fill:' + COLOR + ';font-size:9px;font-weight:800;opacity:.85">' + TONE[k].n + '</text>'; });
    if (on.length > 1) s += '<polyline points="' + on.map(function (p) { return (g.L + g.step * p.f).toFixed(1) + ',' + g.y(TONE[p.m.tone].pos).toFixed(1); }).join(' ') + '" style="fill:none;stroke:' + COLOR + ';stroke-width:2;stroke-dasharray:5 4;opacity:.9"/>';
    on.forEach(function (p) {
      var x = g.L + g.step * p.f, yy = g.y(TONE[p.m.tone].pos), r = 6;
      s += '<path d="M' + x.toFixed(1) + ',' + (yy - r) + ' L' + (x + r).toFixed(1) + ',' + yy + ' L' + x.toFixed(1) + ',' + (yy + r) + ' L' + (x - r).toFixed(1) + ',' + yy + ' Z" style="fill:#fff;stroke:' + COLOR + ';stroke-width:2.2"/>';
      s += '<text x="' + x.toFixed(1) + '" y="' + (yy - 9) + '" text-anchor="middle" style="fill:' + COLOR + ';font-size:9px;font-weight:800;paint-order:stroke;stroke:#fff;stroke-width:3px">음' + p.m.lm + '</text>';
    });
    return s + '</g>';
  }

  var api = { TONE: TONE, COLOR: COLOR, parse: parse, place: place, overlap: overlap, compare: compare, svg: svg, kstDay: kstDay };
  root.MantraTojeongMonth = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
