// Structured Saju Data adapter — 기존 만세력 엔진(Manse)의 계산 결과를 리포트용 하나의 객체로 "옮겨 담기만" 한다.
// 새 명리 계산은 하지 않는다. 엔진이 주지 않는 값은 unavailable 목록에 남기고 null 로 둔다.
// 사용: ReportV2.SajuData.build(Manse.compute(input), { now: Date.now() })
(function (root) {
  var ELK = ['목', '화', '토', '금', '수'];
  var GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
  var SEASONS = { opportunity: '기회기', expansion: '확장기', harvest: '수확기', accumulation: '축적기', transition: '전환기', defense: '방어기' };

  // 운 한 기둥의 평가(ev)를 리포트용 "계절"로 읽는다. 엔진이 이미 낸 flow(주 흐름)·overlays(방어/변동)를 그대로 쓴다.
  //   방어 신호가 켜져 있으면 방어기, 변동 신호가 켜져 있으면 전환기, 아니면 주 흐름(기회·확장·수확·축적).
  function seasonOf(ev) {
    var f = ev && ev.flow; if (!f) return null;
    if (f.overlays && f.overlays.defense && f.overlays.defense.active) return 'defense';
    if (f.overlays && f.overlays.volatility && f.overlays.volatility.active) return 'transition';
    return f.primaryFlow || null;
  }
  function bandOfZone(z) { return /강|왕/.test(z || '') ? '신강' : /약/.test(z || '') ? '신약' : '중화'; }
  function round1(x) { return Math.round(x * 10) / 10; }

  function build(ch, opts) {
    var M = root.Manse, now = (opts && opts.now) || Date.now(), un = [];
    if (!M || !ch) throw new Error('Manse 엔진 또는 계산 결과가 없습니다');
    var P = ch.pillars, d = P.day, dEl = M.stemEl(d.s);
    var sd = { version: 1, birth: { solarY: ch.solar && ch.solar.y, hourKnown: !!ch.hourKnown }, gender: ch.gender === 'F' ? 'F' : 'M' };

    var pill = function (k) {
      var p = P[k], c = ch.cells && ch.cells[k]; if (!p) return null;
      return { hanja: M.gzName(p), ko: M.gzNameK(p), stemTG: c && c.stemTG, branchTG: c && c.branchTG, unseong: c && c.unseong };
    };
    sd.pillars = { year: pill('year'), month: pill('month'), day: pill('day'), hour: pill('hour') };
    sd.dayMaster = { stem: M.STEM_K[d.s], hanja: M.STEM[d.s], el: ELK[dEl], elIdx: dEl, yang: M.yang(d.s) };
    sd.dayPillar = { hanja: M.gzName(d), ko: M.gzNameK(d), key: M.gzNameK(d) };

    // 오행 분포(%) — 엔진 weights.pct
    sd.fiveElements = {}; ELK.forEach(function (e, i) { sd.fiveElements[e] = round1(ch.weights.pct[i]); });
    var order = ELK.slice().sort(function (a, b) { return sd.fiveElements[b] - sd.fiveElements[a]; });
    sd.dominantEl = order[0]; sd.weakestEl = order[4];
    sd.lackEl = sd.fiveElements[order[4]] < 8 ? order[4] : null; // 8% 미만만 "부족"으로 표기 (표현용 기준, 엔진 계산 아님)

    // 십성군(%) / 십성 10종(%)
    sd.groups = {}; GROUPS.forEach(function (g, i) { sd.groups[g] = round1(ch.weights.groups[i]); });
    var gOrder = GROUPS.slice().sort(function (a, b) { return sd.groups[b] - sd.groups[a]; });
    sd.dominantGroup = gOrder[0]; sd.weakestGroup = gOrder[4];
    sd.groupEl = {}; GROUPS.forEach(function (g, i) { sd.groupEl[g] = ELK[(dEl + i) % 5]; });
    sd.tenGods = ch.weights.tgPct || {};

    sd.strength = { zone: ch.strength.zone, band: bandOfZone(ch.strength.zone), help: ch.strength.help, deukryeong: !!ch.strength.deukryeong, deukji: !!ch.strength.deukji, deukse: !!ch.strength.deukse };
    try {
      var nr = M.analyzeNatalRoot(ch);
      sd.roots = { hasRoot: !!nr.hasNatalRoot, score: nr.natalRootScore, level: nr.natalRootLevel };
    } catch (e) { sd.roots = null; un.push('roots'); }

    sd.combinations = []; sd.clashes = [];
    (ch.relations || []).forEach(function (r) {
      var item = { type: r.type, name: r.name, members: r.members };
      if (/충|형|해|파|원진/.test(r.type)) sd.clashes.push(item); else sd.combinations.push(item);
    });

    if (ch.yong && ch.yong.applicable !== false && ch.yong.yong != null) {
      var roles = {}; ELK.forEach(function (e, i) { roles[e] = ch.yong.roles && ch.yong.roles[i] || null; });
      sd.usefulElements = { yong: ELK[ch.yong.yong], hee: ch.yong.hee != null ? ELK[ch.yong.hee] : null, roles: roles, school: ch.yong.school, fallback: !!ch.yongFallback };
    } else { sd.usefulElements = null; un.push('usefulElements'); }

    sd.twelveStages = {}; ['year', 'month', 'day', 'hour'].forEach(function (k) { var c = ch.cells && ch.cells[k]; if (c && P[k]) sd.twelveStages[k] = c.unseong; });
    var stars = {}; ['year', 'month', 'day', 'hour'].forEach(function (k) { ((ch.sinsal && ch.sinsal[k]) || []).forEach(function (s) { stars[s.name] = { name: s.name, good: !!s.good, pillar: k }; }); });
    sd.specialStars = Object.keys(stars).map(function (k) { return stars[k]; });
    // 12신살(역마살·연살=도화·화개살 …)은 기둥(궁)별로 따로 전한다 — 현실 장면(reality.js)이 "어느 시기의 일인지" 읽는 데 쓴다.
    sd.sinsal12 = {}; ['year', 'month', 'day', 'hour'].forEach(function (k) { var c = ch.cells && ch.cells[k]; if (c && P[k] && c.sinsal12) sd.sinsal12[k] = c.sinsal12; });
    sd.patterns = ((ch.patterns && ch.patterns.list) || []).map(function (p) { return { name: p.name, level: p.level }; });

    // 운 흐름: 대운 10개 + 현재 대운 + 올해 세운 + 앞으로 12개월
    sd.daewoon = ch.daeun.list.map(function (x) {
      var s = seasonOf(x.ev);
      return { ganzhi: M.gzNameK(x), startYear: x.startYear, endYear: x.startYear + 9, startAge: x.startAge, season: s, flow: x.ev.flow.primaryFlow, condition: x.ev.flow.condition.name, stemTG: x.stemTG, branchTG: x.branchTG };
    });
    var Y = M.yearPillarAt(now).sajuYear;
    sd.nowYear = Y;
    var cur = null; sd.daewoon.forEach(function (x) { if (x.startYear <= Y) cur = x; });
    sd.currentDaewoon = cur;
    if (!cur) un.push('currentDaewoon');
    try {
      var se = M.seunRange(ch, Y, Y)[0], dom = null;
      try { dom = M.evaluateDomainLuck(ch, se, 'seun'); } catch (e) { }
      sd.sewoon = { year: Y, ganzhi: M.gzNameK(se), season: seasonOf(se.ev), flow: se.ev.flow.primaryFlow, condition: se.ev.flow.condition.name, stemTG: se.stemTG, branchTG: se.branchTG,
        label: M.flowLabel(se.ev), summary: M.flowSummary(se.ev),
        // 건강·사고 영역은 리포트에서 쓰지 않는다(의료/사건 예측 금지 원칙). 연애·재물 밴드만 전달.
        love: dom ? { band: dom.love.band, summary: dom.love.summary } : null, wealth: dom ? { band: dom.wealth.band, summary: dom.wealth.summary } : null };
    } catch (e) { sd.sewoon = null; un.push('sewoon'); }
    try {
      var l1 = M.wolun(ch, Y), l2 = M.wolun(ch, Y + 1), all = l1.concat(l2), ci = 0;
      all.forEach(function (x, i) { if (x.startMs <= now) ci = i; });
      sd.monthlyLuck = all.slice(ci, ci + 12).map(function (x, i) {
        return { month: new Date(x.startMs + 9 * 3600e3).getUTCMonth() + 1, term: x.termName, ganzhi: M.gzNameK(x), season: seasonOf(x.ev), flow: x.ev.flow.primaryFlow, condition: x.ev.flow.condition.name, label: M.flowLabel(x.ev), isNow: i === 0 };
      });
    } catch (e) { sd.monthlyLuck = []; un.push('monthlyLuck'); }

    // 직업: 엔진 careerProfile 의 상위 분야만 전달 (직업명은 콘텐츠 DB가 관리)
    try {
      var cp = M.careerProfile(ch);
      sd.career = { top: (cp.top || []).map(function (c) { return { category: c.category, name: c.name, score: c.score }; }) };
    } catch (e) { sd.career = null; un.push('career'); }

    sd.unavailable = un;
    return sd;
  }

  root.ReportV2 = root.ReportV2 || {};
  root.ReportV2.SajuData = { build: build, seasonOf: seasonOf, SEASONS: SEASONS, GROUPS: GROUPS, ELK: ELK };
})(typeof window !== 'undefined' ? window : globalThis);
