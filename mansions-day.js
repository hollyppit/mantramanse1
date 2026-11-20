/* 날짜별 28수(값일수)·행사별 길흉 모듈. 천문방위 엔진(mansions-engine.js)과 계산을 나누고, 공통 28수 목록(mansions-data.js)만 함께 쓴다.
   · 배속은 ASSIGN_PROFILES 의 기준일에서 28일 순환. 원전 일지·수 조합(伏斷)과 칠요 요일로 기준일을 스스로 점검하고, 맞지 않으면 계산을 멈춘다.
   · 행사 길흉은 OMEN_PROFILES. 프로필이 'verified' 가 아니면 판정(verdict)은 null(미확정)로 두고, 원문 근거 구절만 참고로 돌려준다.
   · 원문에 언급이 없는 행사는 '원문 언급 없음 — 미확정'.
   · 기존 택일 점수에 더하거나 빼지 않는다. 사용: MantraMansionDay.day(jdn) */
(function (G) {
  'use strict';
  var D = G.MantraMansionsData, DD = G.MantraMansionDayData;
  if (!D || !DD) throw new Error('mansions-data.js · mansions-day-data.js 를 먼저 불러오세요');
  var VERSION = 'mansions-day-20261121-1';
  var mod = function (a, n) { return ((a % n) + n) % n; };
  var BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var LUM_TO_DOW = [3, 4, 5, 6, 0, 1, 2];   // 칠요 순번(목금토일월화수) → JDN 요일(0=월)
  var branchOfJdn = function (j) { return mod(j + 49, 12); };   // 2000-01-01(JDN 2451545) = 戊午
  function byId(id) { return D.MANSIONS.find(function (m) { return m.id === id; }) || null; }
  function rawAt(p, jdn) { var a = D.MANSIONS.findIndex(function (m) { return m.id === p.anchor.mansionId; }); return D.MANSIONS[mod(a + (jdn - p.anchor.jdn), 28)]; }

  // 배속 프로필 점검: 필수 값 + 원전 伏斷 조합이 주기 안에 실제로 나오는지 + 칠요 요일
  function checkAssign(p) {
    var errs = [];
    if (!p || !p.anchor || !Number.isInteger(p.anchor.jdn) || !byId(p.anchor.mansionId)) errs.push('기준일 없음');
    if (!p || p.status !== 'verified') errs.push('검증 상태가 아님');
    if (!p || !Array.isArray(p.sources) || !p.sources.some(function (s) { return s.url && s.quote; })) errs.push('출전 없음');
    if (errs.length) return { ok: false, errors: errs };
    if (!weekdayOk(p.anchor.jdn, byId(p.anchor.mansionId))) errs.push('기준일 요일과 칠요가 맞지 않음');
    Object.keys(p.fuduan || {}).forEach(function (b) {
      var bi = BR.indexOf(b), want = p.fuduan[b], seen = false;
      for (var k = 0; k < 84 && !seen; k++) { var j = p.anchor.jdn + k; if (branchOfJdn(j) === bi && rawAt(p, j).id === want) seen = true; }
      if (!seen) errs.push('원전 伏斷 조합 ' + b + '日-' + (byId(want) || {}).hanja + ' 이(가) 이 기준일로는 나오지 않음');
    });
    return { ok: errs.length === 0, errors: errs };
  }
  function weekdayOk(jdn, m) { return !!m && mod(jdn, 7) === LUM_TO_DOW[m.dayLuminaryIdx]; }
  function assignProfile(id) { var list = DD.ASSIGN_PROFILES || []; return id ? list.find(function (p) { return p.id === id; }) : list.find(function (p) { return p.isDefault; }); }
  function omenProfile(id) { var list = DD.OMEN_PROFILES || []; return id ? list.find(function (p) { return p.id === id; }) : list.find(function (p) { return p.isDefault; }); }

  // 날의 수
  function mansionOf(jdn, profileId) {
    var p = assignProfile(profileId), c = checkAssign(p);
    if (!c.ok) return { status: 'pending', text: '미확정 — 날짜 배속 기준이 확인되지 않았습니다(' + c.errors.join(', ') + ').' };
    var m = rawAt(p, jdn);
    return { status: 'ok', mansion: m, guardian: m.guardian, weekdayOk: weekdayOk(jdn, m), profile: { id: p.id, title: p.title, statusText: p.statusText, sources: p.sources, anchor: p.anchor } };
  }
  // 행사별 길흉(프로필 하나). 판정은 'verified' 프로필에서만 낸다.
  function omens(mansionId, profileId) {
    var p = omenProfile(profileId);
    if (!p) return { status: 'none', events: DD.EVENTS.map(function (e) { return { id: e[0], label: e[1], verdict: null, text: '미확정 — 원문 자료 없음' }; }) };
    var e = p.entries && p.entries[mansionId], ok = p.status === 'verified';
    return { status: ok ? 'verified' : p.status, profile: { id: p.id, title: p.title, edition: p.edition, sourceUrl: p.sourceUrl, statusText: p.statusText, readingStatus: p.readingStatus, transcriptionNotes: p.transcriptionNotes || [] },
      head: e ? e.head : null, headVerdict: e ? e.headVerdict : null, original: e ? e.original.slice() : [], plain: e ? e.plain : null,
      events: DD.EVENTS.map(function (ev) {
        var r = e && e.readings ? e.readings[ev[0]] : null;
        if (!ev[2] || !r) return { id: ev[0], label: ev[1], term: ev[2], verdict: null, reference: null, evidence: null, text: '미확정 — 원문에 이 행사 언급 없음' };
        return { id: ev[0], label: ev[1], term: ev[2], verdict: ok ? r.verdict : null, reference: r.verdict, evidence: r.evidence, text: ok ? r.verdict : '미확정 — 판본 미확인(원문 참고: ' + r.verdict + ')' };
      }) };
  }
  function day(jdn, o) { o = o || {}; var a = mansionOf(jdn, o.assign); if (a.status !== 'ok') return a; return Object.assign(a, { omens: omens(a.mansion.id, o.omen) }); }

  G.MantraMansionDay = { VERSION: VERSION, branchOfJdn: branchOfJdn, checkAssign: checkAssign, weekdayOk: weekdayOk, assignProfile: assignProfile, omenProfile: omenProfile, mansionOf: mansionOf, omens: omens, day: day };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.MantraMansionDay;
})(typeof window !== 'undefined' ? window : globalThis);
