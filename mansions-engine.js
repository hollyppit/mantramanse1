/* 28수(二十八宿) 천문방위 엔진: 현공비성과 완전히 독립. fengshui-engine.js 를 읽지도 바꾸지도 않는다.
   · 도수 체계는 검증 규칙(validateSystem)을 통과하고 approved 인 것만 쓴다. 출전·기준점·좌표 체계·변환 규칙이 빠지면 계산을 막는다.
   · 승인된 도수 체계가 없으면 '분류형'(사신별 7수 묶음)만 돌려주고, 건물 방위가 어느 수인지는 판정하지 않는다(status 'unconfirmed').
   · 천문 도수(적도·황도)를 건물 방위각으로 쓰려면 체계에 conversionRule 이 있어야 한다. 없으면 원형 배치에만 쓰고 방위 판정은 막는다.
   · 값일수(날의 28수)는 날짜 순환 계산이며 방위 도수와 별개다. DAY_CYCLE 기준일이 확인된 경우에만 계산한다.
   사용: MantraMansions.analyze({ bearing }) · MantraMansions.dayMansion(jdn) */
(function (G) {
  'use strict';
  var D = G.MantraMansionsData; if (!D || !D.MANSIONS) throw new Error('mansions-data.js 를 먼저 불러오세요');
  var VERSION = 'mansions-engine-20261121-1';
  var mod = function (a, n) { return ((a % n) + n) % n; };
  var GROUPS = ['east', 'north', 'west', 'south'];
  var REQUIRED = ['id', 'sourceVersion', 'title', 'tradition', 'source', 'coordinateSystem', 'circumference', 'referencePoint', 'unit', 'extents'];

  // 데이터 점검: 28개 누락·중복, 사신별 7개
  function checkBase(list) {
    list = list || D.MANSIONS; var errs = [], ids = {}, han = {};
    if (list.length !== 28) errs.push('28수가 ' + list.length + '개입니다');
    list.forEach(function (m) { if (ids[m.id]) errs.push('id 중복: ' + m.id); ids[m.id] = 1; if (han[m.hanja]) errs.push('한자 중복: ' + m.hanja); han[m.hanja] = 1; if (!D.GUARD[m.group]) errs.push('사신 없음: ' + m.id); if (!m.source) errs.push('출전 없음: ' + m.id); });
    GROUPS.forEach(function (g) { var n = list.filter(function (m) { return m.group === g; }).length; if (n !== 7) errs.push(D.GUARD[g].guardian + ' ' + n + '개'); });
    return errs;
  }

  // 도수 체계 검증. 통과 못 하면 { ok:false, errors } — 이 체계로는 아무 계산도 하지 않는다.
  function validateSystem(s) {
    var errs = [];
    if (!s || typeof s !== 'object') return { ok: false, errors: ['체계가 없습니다'] };
    REQUIRED.forEach(function (k) { if (s[k] == null || s[k] === '') errs.push(k + ' 없음'); });
    if (s.source != null && String(s.source).trim().length < 4) errs.push('출전이 너무 짧습니다');
    if (['equatorial', 'ecliptic', 'luopan-ring'].indexOf(s.coordinateSystem) < 0) errs.push('좌표 체계는 equatorial·ecliptic·luopan-ring 중 하나여야 합니다');
    var C = +s.circumference; if (!(C > 0)) errs.push('한 바퀴 도수(circumference)가 없습니다');
    var ex = s.extents || {}, sum = 0, n = 0;
    D.MANSIONS.forEach(function (m) { var v = ex[m.id]; if (typeof v !== 'number' || !(v > 0)) errs.push(m.label + ' 도수 없음'); else { sum += v; n++; } });
    if (n === 28 && C > 0 && Math.abs(sum - C) > 1e-6) errs.push('28수 도수 합(' + sum + ')이 한 바퀴(' + C + ')와 다릅니다');
    // 균등 분할(360/28 등) 데이터는 근거 자료로 보지 않는다
    if (n === 28) { var vals = D.MANSIONS.map(function (m) { return ex[m.id]; }); if (vals.every(function (v) { return Math.abs(v - vals[0]) < 1e-9; })) errs.push('모든 수의 도수가 같습니다(균등 분할 의심) — 출전 있는 실제 도수가 필요합니다'); }
    if (s.conversionRule != null && (typeof s.conversionRule !== 'object' || typeof s.conversionRule.offsetDeg !== 'number' || !s.conversionRule.source)) errs.push('변환 규칙에는 offsetDeg(기준 수 시작점의 방위각)와 출전이 있어야 합니다');
    if (s.approved !== true) errs.push('검토 승인 전(approved 아님)');
    return { ok: errs.length === 0, errors: errs };
  }
  function approvedSystems() { return (D.DEGREE_SYSTEMS || []).filter(function (s) { return validateSystem(s).ok; }); }

  // 체계 안에서 각 수의 시작·끝(그 체계 단위). 각수 시작점 = 0
  function layout(s) {
    var v = validateSystem(s); if (!v.ok) throw new Error('검증되지 않은 도수 체계로는 계산할 수 없습니다: ' + v.errors.join(', '));
    var acc = 0;
    return D.MANSIONS.map(function (m) { var e = s.extents[m.id], o = { id: m.id, label: m.label, group: m.group, mansionStart: acc, mansionEnd: acc + e, angularExtent: e, sourceVersion: s.sourceVersion }; acc += e; return o; });
  }
  // 체계 도수(0=각수 시작) → 어느 수인지. 순환: C 는 0 으로 돈다. 경계값은 다음 수의 시작으로 본다.
  function mansionAtDegree(s, deg) {
    var lay = layout(s), C = +s.circumference, x = mod(+deg, C);
    for (var i = 0; i < 28; i++) if (x >= lay[i].mansionStart && x < lay[i].mansionEnd) return Object.assign({ position: x, offsetInMansion: x - lay[i].mansionStart }, lay[i]);
    return Object.assign({ position: x, offsetInMansion: x - lay[27].mansionStart }, lay[27]);   // 부동소수 끝점 보호
  }
  // 건물 방위각 → 수. 체계에 변환 규칙(conversionRule)이 있어야 한다. 없으면 null + 이유
  function azimuthToMansion(s, azimuth) {
    var v = validateSystem(s); if (!v.ok) return { ok: false, reason: '검증되지 않은 체계: ' + v.errors.join(', ') };
    if (!s.conversionRule) return { ok: false, reason: '이 체계는 천문 도수(' + s.coordinateSystem + ')만 있고 건물 방위각으로 바꾸는 출전 있는 규칙이 없어 방위 판정에 쓰지 않습니다.' };
    var r = s.conversionRule, C = +s.circumference, dir = r.direction === 'ccw' ? -1 : 1;
    var inSys = mod(dir * (mod(+azimuth, 360) - r.offsetDeg), 360) * C / 360;
    return { ok: true, mansion: mansionAtDegree(s, inSys), rule: r };
  }

  // 공간 분석: 상태 'determined'(승인 체계로 판정) 또는 'unconfirmed'(분류형만)
  function analyze(o) {
    o = o || {}; var b = o.bearing || null, az = b && b.azimuth != null ? b.azimuth : null;
    var base = checkBase(), sys = approvedSystems();
    var out = { version: VERSION, dataVersion: D.VERSION, status: 'unconfirmed', baseErrors: base, bearing: b,
      groups: GROUPS.map(function (g) { var G0 = D.GUARD[g]; return { group: g, dir: G0.dir, guardian: G0.guardian, season: G0.season, mansions: D.MANSIONS.filter(function (m) { return m.group === g; }) }; }),
      systems: (D.DEGREE_SYSTEMS || []).map(function (s) { var v = validateSystem(s); return { id: s.id, title: s.title, sourceVersion: s.sourceVersion, ok: v.ok, errors: v.errors }; }),
      links: linkInfo(), results: [], undetermined: [], limits: [] };
    if (base.length) out.undetermined.push('28수 기본 데이터 점검 실패: ' + base.join(', '));
    if (!sys.length) out.undetermined.push('출전·기준점·좌표 체계가 확인되고 승인된 28수 도수 자료가 아직 없습니다(데이터 미확정). 그래서 이 건물 방위가 어느 수에 해당하는지는 판정하지 않습니다.');
    if (az == null) out.undetermined.push('향 각도가 없어 건물 방위를 표시하지 않았습니다.');
    sys.forEach(function (s) {
      if (az == null) return;
      var r = azimuthToMansion(s, az);
      if (r.ok) out.results.push({ systemId: s.id, sourceVersion: s.sourceVersion, source: s.source, referencePoint: s.referencePoint, coordinateSystem: s.coordinateSystem, mansion: r.mansion, rule: r.rule });
      else out.undetermined.push(s.title + ': ' + r.reason);
    });
    if (out.results.length) out.status = 'determined';
    out.limits.push('28수는 별자리(하늘의 적도·황도 띠) 구분이고, 건물 향은 땅 위 지평 방위입니다. 두 값은 같은 좌표가 아니어서, 출전 있는 변환 규칙 없이는 서로 바꾸지 않습니다.');
    out.limits.push('사신(청룡·주작·백호·현무)의 동·남·서·북 배속은 별자리 분류입니다. 형세풍수의 좌청룡·우백호(집 뒤를 등지고 본 좌우 지형)와는 다른 개념입니다.');
    out.limits.push('28수 결과는 현공비성 결과를 바꾸거나 보정하지 않습니다.');
    return out;
  }
  function linkInfo() {
    var ok = (D.LINK_SYSTEMS || []).filter(function (l) { return l && l.approved === true && l.source && l.sourceVersion && Array.isArray(l.table) && l.table.length; });
    return { available: ok.length > 0, systems: ok, text: ok.length ? ok.length + '개 연계 체계(출전별 분리)' : '24산과 28수를 잇는 출전 확인된 연계 자료가 없어 두 체계를 따로 표시합니다.' };
  }

  // ───────────── 값일수(날의 28수) ─────────────
  // anchor: { jdn: 율리우스 적일(정수), mansionId } — 그날이 그 수. 이후 28일마다 돈다.
  function dayCycleOk(c) {
    c = c || D.DAY_CYCLE; return !!(c && c.verified === true && c.anchor && Number.isInteger(c.anchor.jdn) && D.MANSIONS.some(function (m) { return m.id === c.anchor.mansionId; }) && c.source);
  }
  function dayMansion(jdn, cycle) {
    var c = cycle || D.DAY_CYCLE;
    if (!dayCycleOk(c)) return { status: 'pending', text: '판단 보류 — 값일수 기준일과 출전이 확인되지 않았습니다.' };
    var a = D.MANSIONS.findIndex(function (m) { return m.id === c.anchor.mansionId; }), m = D.MANSIONS[mod(a + (jdn - c.anchor.jdn), 28)];
    return { status: 'ok', mansion: m, guardian: m.guardian, events: eventRules(m.id), source: c.source, sourceUrl: c.sourceUrl || null, anchor: c.anchor };
  }
  // 요일 점검용: JDN 의 요일(0=월 … 6=일)과 칠요 순번이 맞는지. 칠요: 목=목요일 금=금요일 토=토요일 일=일요일 월=월요일 화=화요일 수=수요일
  var LUM_TO_DOW = [3, 4, 5, 6, 0, 1, 2];   // 칠요 순번 → JDN 요일(0=월)
  function weekdayConsistent(jdn, m) { return mod(jdn, 7) === LUM_TO_DOW[m.dayLuminaryIdx]; }
  function eventRules(id) {
    var r = (D.EVENT_RULES || {})[id];
    return D.EVENTS.map(function (e) { var v = r && r.source ? r[e[0]] : null; return { id: e[0], label: e[1], verdict: v === '길' || v === '흉' ? v : null, text: v === '길' || v === '흉' ? v : '판단 보류', source: v ? r.source : null }; });
  }

  G.MantraMansions = { VERSION: VERSION, GROUPS: GROUPS, checkBase: checkBase, validateSystem: validateSystem, approvedSystems: approvedSystems, layout: layout, mansionAtDegree: mansionAtDegree, azimuthToMansion: azimuthToMansion, analyze: analyze, linkInfo: linkInfo, dayCycleOk: dayCycleOk, dayMansion: dayMansion, weekdayConsistent: weekdayConsistent, eventRules: eventRules };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.MantraMansions;
})(typeof window !== 'undefined' ? window : globalThis);
