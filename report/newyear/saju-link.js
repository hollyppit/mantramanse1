/* 신년운세 사주 연결 — 만트라 만세력 엔진(engine.js, 전역 Manse)을 읽기만 해서 '그해'에 필요한 사주 재료를 한 덩어리로 모은다.
   토정비결 엔진(report/newyear/engine.js)과는 계산을 섞지 않는다. 두 결과는 compare() 에서 해석 단계로만 만난다.
   쓰는 만세력 기능: compute(원국·통합 용신), seunRange(세운), wolun(월운), luckRelations(합충형해), getSamjae(삼재), evaluateDomainLuck(분야 지수).
   절기·입춘 기준(사주)과 음력 설 기준(토정비결)이 다르므로 월 정보는 양력 기간·음력 월 대응을 함께 싣는다. */
(function (root) {
  'use strict';
  var EL_K = ['목', '화', '토', '금', '수'];
  var EL_H = ['木', '火', '土', '金', '水'];
  var POS_K = { year: '연주', month: '월주', day: '일주', hour: '시주' };
  var DIR = { '순풍': 'good', '보통': 'neutral', '주의': 'caution', '부담': 'burden' };

  function manse(M) {
    var m = M || root.Manse;
    if (!m || typeof m.compute !== 'function') throw new Error('만세력 엔진(Manse)이 먼저 로드되어야 합니다');
    return m;
  }
  var iso = function (ms) { return new Date(ms + 9 * 3600000).toISOString().slice(0, 10); };   // 한국 시각 날짜
  var elName = function (i) { return i == null || i < 0 ? null : EL_K[i] + '(' + EL_H[i] + ')'; };

  // 출생 입력: 토정 엔진과 같은 모양 + hour/minute(모르면 생략)/gender. 만세력 compute 입력으로 바꾼다.
  function chartOf(M, birth) {
    var inp = { year: birth.year, month: birth.month, day: birth.day, calendar: birth.calendar === 'lunar' ? 'lunar' : 'solar', leap: !!birth.leap };
    if (Number.isInteger(birth.hour)) { inp.hour = birth.hour; inp.minute = Number.isInteger(birth.minute) ? birth.minute : 0; }
    if (birth.gender === 'M' || birth.gender === 'F') inp.gender = birth.gender;
    ['timeMode', 'jasi', 'lon', 'tz', 'school'].forEach(function (k) { if (birth[k] != null) inp[k] = birth[k]; });
    return M.compute(inp);
  }
  function relsOf(M, ch, p) {
    return M.luckRelations(ch, p).rels.map(function (r) {
      return { kind: r.kind, type: r.type, name: r.name, with: r.members.filter(function (x) { return x !== 'luck'; }).map(function (x) { return POS_K[x] || x; }) };
    });
  }
  function luckSummary(M, ch, it) {
    var band = it.score && it.score.band;
    return {
      gz: M.gzName(it), stemTG: it.stemTG, branchTG: it.branchTG, unseong: it.unseong,
      band: band, direction: DIR[band] || 'neutral',
      own: Math.round(it.ev.ownFit), fit: Math.round(it.ev.fitScore),   // own = 이 운 자체, fit = 대운까지 겹친 체감
      relations: relsOf(M, ch, it),
      reasons: (it.ev.reasons || []).slice(0, 4),
    };
  }

  // 음력 Y년 m월의 양력 시작·끝(작은달 29·큰달 30)
  function lunarMonthSpan(M, Y, m) {
    var s = M.lunarToSolar(Y, m, 1, false), len = 29;
    try { M.lunarToSolar(Y, m, 30, false); len = 30; } catch (e) { len = 29; }
    var startMs = Date.UTC(s[0], s[1] - 1, s[2]), endMs = startMs + (len - 1) * 86400000;
    return { start: s.join('-').replace(/-(\d)(?=-|$)/g, '-0$1'), end: iso(endMs - 9 * 3600000), startMs: startMs, endMs: endMs + 86400000 - 1, days: len };
  }

  /* 그해 사주 재료. birth: { year, month, day, calendar, leap, hour?, minute?, gender? }, Y: 보는 해(예 2027) */
  function sajuYear(birth, Y, M) {
    M = manse(M);
    if (!Number.isInteger(Y)) throw new Error('보는 해를 정수로 입력하세요');
    var ch = chartOf(M, birth);
    var P = ch.pillars, u = ch.unified || {};
    var pillars = {}; ['year', 'month', 'day', 'hour'].forEach(function (k) { pillars[k] = P[k] ? M.gzName(P[k]) : null; });
    var natal = {
      pillars: pillars, hourKnown: !!ch.hourKnown,
      dayMaster: { stem: M.STEM[P.day.s], element: elName(M.stemEl(P.day.s)) },
      strength: { zone: ch.strength.zone, help: Math.round(ch.strength.help) },
      yongsin: { yong: elName(u.yong), hee: elName(u.hee), gi: elName(u.gi), basis: u.primaryName || null, summary: u.summary || '' },
      lunarBirth: ch.lunar ? { y: ch.lunar.y, m: ch.lunar.m, d: ch.lunar.d, leap: !!ch.lunar.leap } : null,
    };

    var seun = M.seunRange(ch, Y - 1, Y);   // [전년, 그해]
    var cur = seun.find(function (x) { return x.year === Y; }), prev = seun.find(function (x) { return x.year === Y - 1; });
    if (!cur) throw new Error(Y + '년은 만세력 지원 범위 밖입니다');
    var year = luckSummary(M, ch, cur);
    year.daeun = cur.daeun ? { gz: M.gzName(cur.daeun), startAge: cur.daeun.age != null ? cur.daeun.age : cur.daeun.startAge, band: cur.daeun.score && cur.daeun.score.band } : null;
    year.samjae = M.getSamjae(P.year.b, Y);
    year.koreanAge = cur.age;
    var prevYear = prev ? luckSummary(M, ch, prev) : null;
    var change = prevYear ? {
      from: prevYear.band, to: year.band, fitDelta: year.fit - prevYear.fit, ownDelta: year.own - prevYear.own,
      daeunChanged: !!(prev.daeun && cur.daeun && M.gzName(prev.daeun) !== M.gzName(cur.daeun)),
    } : null;

    // 분야 지수(세운): 애정·재물·건강·사고·직업 — 건강·사고는 '살필 신호'로만 쓴다(단정 금지)
    var dom = M.evaluateDomainLuck(ch, cur, 'seun', {});
    var domains = {};
    ['love', 'wealth', 'career', 'health', 'accident'].forEach(function (k) {
      if (dom[k]) domains[k] = { score: dom[k].score, band: dom[k].band, summary: dom[k].summary, tags: dom[k].tags || [] };
    });

    // 월운: 사주는 절기 기준(입춘 → 다음 입춘). 양력 기간을 함께 싣는다
    var wol = M.wolun(ch, Y), nextYearStart = M.wolun(ch, Y + 1)[0].startMs, prevWol = M.wolun(ch, Y - 1);
    var toMonth = function (list, endMs) {
      return function (it, i) {
        var nextStart = i + 1 < list.length ? list[i + 1].startMs : endMs;
        var s = luckSummary(M, ch, it);
        s.index = i + 1; s.solarStart = iso(it.startMs); s.solarEnd = iso(nextStart - 86400000); s.startMs = it.startMs;
        return s;
      };
    };
    var months = wol.map(toMonth(wol, nextYearStart));
    // 양력 1월~입춘 전(그해 1월 1일 ~ 입춘 전날)은 사주로는 전년도 子·丑월이다 — 양력 12개월 화면용으로 따로 싣는다
    var preMonths = prevWol.map(toMonth(prevWol, wol[0].startMs)).filter(function (x) { return x.solarEnd >= Y + '-01-01'; });
    preMonths.forEach(function (x) { x.belongsTo = Y - 1; });
    // 음력 월(토정비결 기준) ↔ 사주 월운 대응: 음력 한 달과 가장 많이 겹치는 월운
    var lunarMonths = [];
    for (var m = 1; m <= 12; m++) {
      var span = lunarMonthSpan(M, Y, m), best = null, bestOverlap = -1;
      months.forEach(function (mo, i) {
        var a = mo.startMs, b = i + 1 < months.length ? months[i + 1].startMs : a + 31 * 86400000;
        var ov = Math.min(b, span.endMs) - Math.max(a, span.startMs);
        if (ov > bestOverlap) { bestOverlap = ov; best = mo; }
      });
      lunarMonths.push({ lunarMonth: m, solarStart: span.start, solarEnd: span.end, days: span.days, sajuMonth: best ? best.gz : null, sajuIndex: best ? best.index : null, direction: best ? best.direction : null });
    }
    // 결정적 시기: 체감(fit) 기준 가장 높은 두 달·가장 낮은 두 달
    var sorted = months.slice().sort(function (a, b) { return b.fit - a.fit; });
    var peaks = { high: sorted.slice(0, 2).map(function (x) { return { gz: x.gz, solarStart: x.solarStart, solarEnd: x.solarEnd, band: x.band, fit: x.fit }; }), low: sorted.slice(-2).reverse().map(function (x) { return { gz: x.gz, solarStart: x.solarStart, solarEnd: x.solarEnd, band: x.band, fit: x.fit }; }) };

    return {
      targetYear: Y, basis: { saju: '절기(입춘) 기준 해·월', months: '월운 = 절기 시작일 ~ 다음 절기 전날(양력)', lunarMonths: '음력 월(토정비결 기준)과 가장 많이 겹치는 월운' },
      natal: natal, year: year, prevYear: prevYear, change: change, domains: domains, months: months, preMonths: preMonths, lunarMonths: lunarMonths, peaks: peaks,
    };
  }

  /* 토정비결과 사주의 방향 비교: 같으면 '같은 방향', 다르면 억지로 맞추지 않고 '서로 다른 해석'으로 나눈다.
     tojeongDir: 'good'|'neutral'|'caution'|'burden'|null(괘 길흉 표가 검수되기 전에는 null) */
  var RANK = { good: 2, neutral: 1, caution: 0, burden: -1 };
  function compare(tojeongDir, sajuDir) {
    if (!tojeongDir || !(tojeongDir in RANK) || !(sajuDir in RANK)) return { kind: 'unknown', tojeong: tojeongDir || null, saju: sajuDir || null };
    var d = RANK[tojeongDir] - RANK[sajuDir];
    var kind = d === 0 ? 'same' : Math.abs(d) === 1 ? 'near' : 'different';
    return { kind: kind, tojeong: tojeongDir, saju: sajuDir,
      rule: kind === 'different' ? '두 해석이 반대 방향: 섞지 말고 "토정비결은 …, 사주는 …"로 따로 보여 준다' : kind === 'near' ? '정도 차이: 한쪽을 근거로 다른 쪽을 덧붙인다' : '같은 방향: 함께 근거로 쓴다' };
  }

  var API = { sajuYear: sajuYear, compare: compare, DIR: DIR };
  root.NewyearSajuLink = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
