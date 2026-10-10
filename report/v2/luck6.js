/* 운의 6분류(기회기·확장기·수확기·축적기·변동기·방어기) — 표시 계층.
   엔진(engine.js)은 운을 "주 흐름 4 + 변동·방어 overlay 2 + 적합 상태 4"의 독립된 세 층으로 계산한다(커밋 e68a17d).
   이 모듈은 그 값을 읽어 옛 6분류의 "대표 시기 하나"로 합쳐 보여 줄 뿐, 엔진 값을 바꾸지 않는다.
   판정 순서(옛 구현과 같다): ① 방어(강) → ② 변동 → ③ 방어(약) → ④ 주 흐름(기회·확장·수확·축적).
   임계값은 모두 CONFIG 에서만 조절한다. 옛 구현과의 비교: node tests/luck6-sim.js, tests/luck6-compare.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var CONFIG = {
    defenseHard: { fit: -45, intensity: 30 },   // 흐름 점수가 매우 낮고 작용 강도도 있으면 방어기
    volatility: 55,                             // 변동성 점수가 이 이상이면 변동기
    defenseSoft: { fit: -20, intensity: 50 },   // 흐름 점수가 낮고 작용 강도가 높으면 방어기
  };
  var NAMES = ['기회기', '확장기', '수확기', '축적기', '변동기', '방어기'];
  var FLOW_NAME = { opportunity: '기회기', expansion: '확장기', harvest: '수확기', accumulation: '축적기' };
  var MEANING = {
    '기회기': '새로운 활동이나 선택지가 활성화되는 시기',
    '확장기': '이미 있는 활동·역할을 키우기 좋은 시기',
    '수확기': '이미 만든 결과를 거두고 정리하기 좋은 시기',
    '축적기': '기반과 역량을 쌓는 데 힘이 실리는 시기',
    '변동기': '변화 신호가 커져 환경·계획이 움직이기 쉬운 시기',
    '방어기': '부담이 커서 무리하지 않고 지키는 편이 나은 시기',
  };
  var KEY = { '기회기': 'opportunity', '확장기': 'expansion', '수확기': 'harvest', '축적기': 'accumulation', '변동기': 'volatility', '방어기': 'defense' };
  var r0 = function (v) { return Math.round(v); };

  /** ev(엔진 evaluateLuck 결과) → { label, key, meaning, rule, scores } — 결정론적. 같은 ev 는 항상 같은 값. */
  function of(ev) {
    var C = CONFIG, fit = ev.fitScore, inten = ev.intensityScore, vol = ev.volatilityScore, label, rule;
    if (fit <= C.defenseHard.fit && inten >= C.defenseHard.intensity) { label = '방어기'; rule = '흐름 점수 ' + r0(fit) + '(≤ ' + C.defenseHard.fit + ')이고 작용 강도 ' + r0(inten) + '(≥ ' + C.defenseHard.intensity + ')'; }
    else if (vol >= C.volatility) { label = '변동기'; rule = '변동성 ' + r0(vol) + '(≥ ' + C.volatility + ')'; }
    else if (fit <= C.defenseSoft.fit && inten >= C.defenseSoft.intensity) { label = '방어기'; rule = '흐름 점수 ' + r0(fit) + '(≤ ' + C.defenseSoft.fit + ')이고 작용 강도 ' + r0(inten) + '(≥ ' + C.defenseSoft.intensity + ')'; }
    else { label = FLOW_NAME[ev.primaryFlow] || ev.phase || '축적기'; rule = '네 활동 흐름 중 ' + label.replace('기', '') + ' 활성도가 가장 높음'; }
    return {
      label: label, key: KEY[label], meaning: MEANING[label], rule: rule,
      scores: { fit: r0(fit), intensity: r0(inten), volatility: r0(vol), flows: ev.phaseScores ? { opportunity: ev.phaseScores.opportunity, expansion: ev.phaseScores.expansion, harvest: ev.phaseScores.harvest, accumulation: ev.phaseScores.accumulation } : null },
      condition: ev.condition || (ev.flow && ev.flow.condition && ev.flow.condition.name) || '',
    };
  }

  R.Luck6 = { CONFIG: CONFIG, NAMES: NAMES, MEANING: MEANING, KEY: KEY, of: of };
})(typeof window !== 'undefined' ? window : globalThis);
