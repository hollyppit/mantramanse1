// AI 풀이 엔진(풀이 지식·풀이 구성) 분야 ↔ 운명의 타임라인 장 짝 목록 (2026-11-15)
//   관리자 '풀이 구성' 탭은 분야별로 짝이 되는 타임라인 장을, '챕터 계약' 탭은 장마다 짝이 되는 분야를 보여 준다.
//   표시 전용: 타임라인 본문은 이 짝을 쓰지 않는다(풀이 구성의 결과는 옛 인생 지도·관리자 실험실·'더 깊이 보기' 재료로만 쓰인다).
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var DOMAINS = ['SELF', 'MONEY', 'CAREER', 'LOVE', 'MARRIAGE', 'RELATIONSHIP', 'TIMING', 'ACTION'];
  var NAME = { SELF: '나 자신', MONEY: '재물', CAREER: '직업·사업', LOVE: '연애', MARRIAGE: '결혼', RELATIONSHIP: '인간관계', TIMING: '운의 흐름', ACTION: '행동·개운' };
  var T = function (s) { return s.split(' ').map(function (x) { return 'timeline_' + x; }); };
  // 분야 → 타임라인 장(주 짝). 한 장이 두 분야에 걸칠 수 있다(예: 시기 장은 주제 + 운의 흐름).
  var MAP = {
    SELF: { topics: ['self'], chapters: T('self_03 self_02 self_flow self_gyeok self_25 self_talent self_18 self_36 self_22 self_33 self_35 self_h1 self_h2 self_h3 self_h4 self_h5 self_h6') },
    MONEY: { topics: ['wealth'], chapters: T('self_30 self_31 self_32 wealth_01 wealth_flow wealth_02 wealth_03 wealth_04 wealth_05 wealth_06 wealth_07 wealth_08 wealth_09 wealth_10 wealth_11 wealth_12 wealth_13 wealth_14 wealth_15') },
    CAREER: { topics: ['career'], chapters: T('self_26 career_01 career_flow career_02 career_talent career_03 career_04 career_05 career_06 career_07 career_08 career_09 career_10 career_11 career_12 career_13 career_14 career_15') },
    LOVE: { topics: ['love'], chapters: T('self_27 love_04 love_05 love_06 love_12 love_13 love_14 love_15') },
    MARRIAGE: { topics: ['love'], chapters: T('self_29 self_34 love_flow love_07 love_08 love_09 love_11') },
    RELATIONSHIP: { topics: ['love', 'self'], chapters: T('self_28 love_01 love_02 love_03 love_10') },
    TIMING: { topics: ['self', 'wealth', 'career', 'love'], chapters: T('self_20 self_peak self_24 wealth_06 wealth_10 wealth_14 career_08 career_14 love_08 love_14') },
    ACTION: { topics: ['self', 'wealth', 'career', 'love'], chapters: T('self_37 wealth_15 career_recharge career_15 love_15') }
  };
  function domainsOf(chId) { return DOMAINS.filter(function (d) { return MAP[d].chapters.indexOf(chId) >= 0; }); }
  var API = { DOMAINS: DOMAINS, NAME: NAME, MAP: MAP, domainsOf: domainsOf,
    STATUS: '지금 운명의 타임라인 본문은 이 구성을 쓰지 않아요. 타임라인 장은 게시 원고(챕터 계약)와 만세력 엔진 값으로 만들고, 이 구성은 관리자 실험실·옛 인생 지도·“더 깊이 보기” 재료에 쓰여요.' };
  R.IKTimelineMap = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
