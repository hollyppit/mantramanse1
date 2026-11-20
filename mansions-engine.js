/* 28수(二十八宿) 천문방위 엔진: 현공비성과 완전히 독립. fengshui-engine.js 를 읽지도 바꾸지도 않는다.
   날짜별 28수(값일수)·행사 길흉은 이 엔진이 아니라 mansions-day.js 가 맡는다(공통 데이터 mansions-data.js 만 함께 쓴다).
   · 도수 프로필(DEGREE_PROFILES)은 검증 규칙을 통과하고 status 'verified' 인 것만 계산에 쓴다.
     기본 기준: 적도(equatorial) 365¼도, 균등 분할 아님, ¼도 위치가 원문으로 확인된 프로필.
   · 천문 도수(古度)는 나침반 방위각이 아니다. 원형도에 그리기 위한 비례 환산(guToRingDeg)은 '그림 배치용'이며 방위 판정에 쓰지 않는다.
   · 건물 방위 → 28수 판정은 출전 확인된 나경 대응 프로필(LUOPAN_PROFILES)이 있을 때만 한다. 없으면 '판정 안 함'.
   · 24산은 공통 나침반 층(bearing.js mountain24)에서 받는다. 현공 계산식은 건드리지 않는다.
   사용: MantraMansions.analyze({ bearing }) */
(function (G) {
  'use strict';
  var D = G.MantraMansionsData; if (!D || !D.MANSIONS) throw new Error('mansions-data.js 를 먼저 불러오세요');
  var VERSION = 'mansions-engine-20261121-2';
  var mod = function (a, n) { return ((a % n) + n) % n; };
  var GROUPS = ['east', 'north', 'west', 'south'];
  var REQUIRED = ['id', 'title', 'work', 'era', 'edition', 'sourceUrl', 'quote', 'coordinateSystem', 'circumference', 'unit', 'referencePoint', 'extents'];
  var EPS = 1e-9;

  // 기본 데이터 점검: 28개 누락·중복, 사신별 7개
  function checkBase(list) {
    list = list || D.MANSIONS; var errs = [], ids = {}, han = {};
    if (list.length !== 28) errs.push('28수가 ' + list.length + '개입니다');
    list.forEach(function (m) { if (ids[m.id]) errs.push('id 중복: ' + m.id); ids[m.id] = 1; if (han[m.hanja]) errs.push('한자 중복: ' + m.hanja); han[m.hanja] = 1; if (!D.GUARD[m.group]) errs.push('사신 없음: ' + m.id); if (!m.source) errs.push('출전 없음: ' + m.id); });
    GROUPS.forEach(function (g) { var n = list.filter(function (m) { return m.group === g; }).length; if (n !== 7) errs.push(D.GUARD[g].guardian + ' ' + n + '개'); });
    return errs;
  }

  // 도수 프로필 검증. 하나라도 걸리면 이 프로필로는 아무 계산도 하지 않는다.
  function validateProfile(p) {
    var errs = [];
    if (!p || typeof p !== 'object') return { ok: false, errors: ['프로필이 없습니다'] };
    REQUIRED.forEach(function (k) { if (p[k] == null || p[k] === '') errs.push(k + ' 없음'); });
    if (p.status !== 'verified') errs.push('검증 상태가 아님(' + (p.status || '없음') + ')' + (p.statusReason ? ': ' + p.statusReason : ''));
    if (p.coordinateSystem != null && ['equatorial', 'ecliptic'].indexOf(p.coordinateSystem) < 0) errs.push('좌표 체계는 equatorial·ecliptic 중 하나여야 합니다');
    var C = +p.circumference; if (!(C > 0)) errs.push('주천 도수가 없습니다');
    var ex = p.extents || {}, sum = 0, n = 0;
    D.MANSIONS.forEach(function (m) { var v = ex[m.id]; if (typeof v !== 'number' || !(v > 0)) errs.push(m.label + ' 도수 없음'); else { sum += v; n++; } });
    if (n === 28 && C > 0 && Math.abs(sum - C) > 1e-6) errs.push('28수 도수 합(' + Math.round(sum * 1e4) / 1e4 + ')이 주천(' + Math.round(C * 1e4) / 1e4 + ')과 다릅니다');
    if (n === 28) { var vals = D.MANSIONS.map(function (m) { return ex[m.id]; }); if (vals.every(function (v) { return Math.abs(v - vals[0]) < EPS; })) errs.push('모든 수의 도수가 같습니다(균등 분할) — 원문 도수가 필요합니다'); }
    if (p.fractionAt != null) { var fv = ex[p.fractionAt]; if (typeof fv !== 'number' || Math.abs(fv - Math.floor(fv) - p.fractionValue) > 1e-6) errs.push('끝수 위치(' + p.fractionAt + ')와 도수가 맞지 않습니다'); }
    else errs.push('끝수(¼도) 위치가 원문으로 확인되지 않았습니다');
    return { ok: errs.length === 0, errors: errs };
  }
  // 기본 기준(적도 365¼도)까지 맞는지
  function isBaseStandard(p) { return validateProfile(p).ok && p.coordinateSystem === 'equatorial' && Math.abs(p.circumference - 365.25) < 1e-9 && p.fractionValue === 0.25; }
  function profiles() { return (D.DEGREE_PROFILES || []).map(function (p) { var v = validateProfile(p); return { id: p.id, title: p.title, status: p.status, usable: v.ok, base: isBaseStandard(p), isDefault: !!p.isDefault, errors: v.errors, profile: p }; }); }
  function defaultProfile() { var d = (D.DEGREE_PROFILES || []).filter(function (p) { return p.isDefault && isBaseStandard(p); }); return d.length === 1 ? d[0] : null; }

  // 프로필 안에서 각 수의 시작·끝(古度). 각(角)수 시작 = 0, MANSIONS 순서로 쌓는다.
  function layout(p) {
    var v = validateProfile(p); if (!v.ok) throw new Error('검증되지 않은 도수 프로필로는 계산할 수 없습니다: ' + v.errors.join(', '));
    var acc = 0;
    return D.MANSIONS.map(function (m) { var e = p.extents[m.id], o = { id: m.id, label: m.label, group: m.group, mansionStart: acc, mansionEnd: acc + e, angularExtent: e, profileId: p.id }; acc += e; return o; });
  }
  // 古度 위치 → 수. 주천에서 순환하고, 경계값은 다음 수의 시작으로 본다.
  function mansionAtDegree(p, gu) {
    var lay = layout(p), C = +p.circumference, x = mod(+gu, C);
    for (var i = 0; i < 28; i++) if (x >= lay[i].mansionStart && x < lay[i].mansionEnd) return Object.assign({ position: x, offsetInMansion: x - lay[i].mansionStart }, lay[i]);
    return Object.assign({ position: x, offsetInMansion: x - lay[27].mansionStart }, lay[27]);
  }
  // 그림 배치용 비례 환산: 古度 → 원 둘레 360 눈금. 나침반 방위각이 아니다(별도 좌표 변환).
  function guToRingDeg(p, gu) { var C = +p.circumference; if (!(C > 0)) throw new Error('주천 도수 없음'); return mod(+gu, C) * 360 / C; }
  function ringLayout(p) { return layout(p).map(function (l) { return Object.assign({}, l, { ringStart: guToRingDeg(p, l.mansionStart), ringSpan: l.angularExtent * 360 / p.circumference }); }); }

  // ───────────── 나경 대응(24산 ↔ 28수) ─────────────
  function validateLuopan(l) {
    var errs = [];
    if (!l || typeof l !== 'object') return { ok: false, errors: ['프로필 없음'] };
    ['id', 'school', 'title', 'edition', 'sourceUrl', 'quote', 'table'].forEach(function (k) { if (!l[k]) errs.push(k + ' 없음'); });
    if (l.status !== 'verified') errs.push('검증 상태가 아님');
    var han = {}; D.MANSIONS.forEach(function (m) { han[m.hanja] = 1; });
    var B = G.MantraBearing, mts = B ? B.MT24 : [];
    if (l.table && typeof l.table === 'object') {
      var keys = Object.keys(l.table); if (keys.length !== 24 || mts.some(function (h) { return !l.table[h]; })) errs.push('24산 전체 표가 아닙니다');
      keys.forEach(function (k) { var v = l.table[k]; if (!Array.isArray(v) || !v.length || v.some(function (h) { return !han[h]; })) errs.push(k + ' 대응 수가 올바르지 않습니다'); });
    }
    return { ok: errs.length === 0, errors: errs };
  }
  function luopanProfiles() { return (D.LUOPAN_PROFILES || []).filter(function (l) { return validateLuopan(l).ok; }); }
  // 건물 방위각 → (프로필별) 24산 → 그 프로필이 정한 수. 프로필끼리 합치지 않는다.
  function azimuthToMansions(azimuth) {
    var B = G.MantraBearing; if (!B) return { ok: false, reason: 'bearing.js 가 없습니다' };
    var mt = B.mountain24(azimuth); if (!mt) return { ok: false, reason: '향 각도가 없습니다' };
    var ls = luopanProfiles(); if (!ls.length) return { ok: false, mountain: mt, reason: '출전이 확인된 나경 28수환↔24산 대응표가 없어 이 방위가 어느 수인지 판정하지 않습니다.' };
    return { ok: true, mountain: mt, results: ls.map(function (l) { return { profileId: l.id, school: l.school, title: l.title, source: l.edition, mansions: l.table[mt.hanja].map(function (h) { return D.MANSIONS.find(function (m) { return m.hanja === h; }); }) }; }) };
  }

  // 공간 분석: 상태 'determined'(나경 대응표로 판정) 또는 'unconfirmed'(판정 안 함). 도수 프로필은 원형 배치에만 쓴다.
  function analyze(o) {
    o = o || {}; var b = o.bearing || null, az = b && b.azimuth != null ? b.azimuth : null;
    var dp = defaultProfile(), B = G.MantraBearing;
    var out = { version: VERSION, dataVersion: D.VERSION, status: 'unconfirmed', baseErrors: checkBase(), bearing: b, mountain: az != null && B ? B.mountain24(az) : null,
      groups: GROUPS.map(function (g) { var G0 = D.GUARD[g]; return { group: g, dir: G0.dir, guardian: G0.guardian, season: G0.season, mansions: D.MANSIONS.filter(function (m) { return m.group === g; }) }; }),
      degreeProfile: dp, ring: dp ? ringLayout(dp) : null, profiles: profiles(), links: linkInfo(), luopan: null, results: [], undetermined: [], limits: [] };
    if (out.baseErrors.length) out.undetermined.push('28수 기본 데이터 점검 실패: ' + out.baseErrors.join(', '));
    if (!dp) out.undetermined.push('기본 기준(적도 365¼도)을 만족하는 검증된 도수 프로필이 없어 원형도를 분류형으로 그립니다.');
    if (az == null) out.undetermined.push('향 각도가 없어 건물 방위를 표시하지 않았습니다.');
    else {
      var r = azimuthToMansions(az); out.luopan = r;
      if (r.ok) { out.results = r.results; out.status = 'determined'; }
      else out.undetermined.push(r.reason);
    }
    out.limits.push('28수 도수는 하늘의 적도·황도를 따라 잰 천문 도수(古度, 주천 365¼도)이고, 건물 향은 땅 위 지평 방위(360°)입니다. 원형도의 도수 배치는 그림용 비례 환산이며 방위각과 같은 값이 아닙니다.');
    out.limits.push('사신(청룡·주작·백호·현무)의 동·남·서·북 배속은 별자리 분류입니다. 형세풍수의 좌청룡·우백호(집 뒤를 등지고 본 좌우 지형)와는 다른 개념입니다.');
    out.limits.push('28수 결과는 현공비성 결과를 바꾸거나 보정하지 않습니다.');
    return out;
  }
  function linkInfo() { var ok = luopanProfiles(); return { available: ok.length > 0, profiles: ok, text: ok.length ? ok.length + '개 나경 대응 프로필(유파·문헌별 분리)' : '출전이 확인된 나경 28수환↔24산 대응표가 없어 24산과 28수를 독립적으로 표시합니다.' }; }

  G.MantraMansions = { VERSION: VERSION, GROUPS: GROUPS, checkBase: checkBase, validateProfile: validateProfile, isBaseStandard: isBaseStandard, profiles: profiles, defaultProfile: defaultProfile, layout: layout, mansionAtDegree: mansionAtDegree, guToRingDeg: guToRingDeg, ringLayout: ringLayout, validateLuopan: validateLuopan, luopanProfiles: luopanProfiles, azimuthToMansions: azimuthToMansions, analyze: analyze, linkInfo: linkInfo };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.MantraMansions;
})(typeof window !== 'undefined' ? window : globalThis);
