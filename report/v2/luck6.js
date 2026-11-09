/* 운의 6분류(기회기·확장기·수확기·축적기·변동기·방어기) — 표시 계층.
   엔진(engine.js)은 운을 "주 흐름 4 + 변동·방어 overlay 2 + 적합 상태 4"의 독립된 세 층으로 계산한다(커밋 e68a17d).
   이 모듈은 그 값을 읽어 옛 6분류의 "대표 시기 하나"로 합쳐 보여 줄 뿐, 엔진 값을 바꾸지 않는다.
   판정 순서(옛 구현과 같다): ① 방어(강) → ② 변동 → ③ 방어(약) → ④ 주 흐름(기회·확장·수확·축적).
   임계값은 모두 CONFIG 에서만 조절한다. 옛 구현과의 비교: node tests/luck6-sim.js, tests/luck6-compare.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var CONFIG = {
    defenseHard: { fit: -45, intensity: 30 },   // 흐름 점수가 매우 낮고 작용 강도도 있으면 방어기
    volatility: 65,                             // 변동성 점수가 이 이상이면 변동기. 옛 구현은 55 였다 — 55 면 운의 약 33%가 변동기라 65(약 18%)로 올렸다(report/v2/VOLATILITY_ANALYSIS.md).
                                                // 엔진의 변동 신호 overlay 기준(FLOW_CONFIG.overlay.volatility 55)은 그대로다: "변동 신호" 칩은 55 부터, 6분류 라벨의 변동기는 65 부터.
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
  // 화면에 보이는 흐름 점수는 0~100(그래프 막대와 같은 값)이다. 엔진 값(-100~100)을 그대로 쓰면 막대 52와 문장 "흐름 점수 4"가 서로 달라 보인다.
  var pct = function (fit) { return Math.max(0, Math.min(100, Math.round((fit + 100) / 2))); };
  var FLOW_WORD = { '기회기': '기회', '확장기': '확장', '수확기': '수확', '축적기': '축적' };

  /** ev(엔진 evaluateLuck 결과) → { label, key, meaning, rule, scores } — 결정론적. 같은 ev 는 항상 같은 값. */
  function of(ev) {
    var C = CONFIG, fit = ev.fitScore, inten = ev.intensityScore, vol = ev.volatilityScore, label, rule;
    if (fit <= C.defenseHard.fit && inten >= C.defenseHard.intensity) { label = '방어기'; rule = '흐름 점수 ' + pct(fit) + '(기준 ' + pct(C.defenseHard.fit) + ' 이하)로 매우 낮고, 운의 세기 ' + r0(inten) + '(기준 ' + C.defenseHard.intensity + ' 이상)도 실려 있어요'; }
    else if (vol >= C.volatility) { label = '변동기'; rule = '변화 신호 ' + r0(vol) + '로 기준(' + C.volatility + ' 이상)을 넘었어요'; }
    else if (fit <= C.defenseSoft.fit && inten >= C.defenseSoft.intensity) { label = '방어기'; rule = '흐름 점수 ' + pct(fit) + '(기준 ' + pct(C.defenseSoft.fit) + ' 이하)로 낮은데, 운의 세기 ' + r0(inten) + '(기준 ' + C.defenseSoft.intensity + ' 이상)는 강해요'; }
    else { label = FLOW_NAME[ev.primaryFlow] || ev.phase || '축적기'; rule = '기회·확장·수확·축적 네 흐름 중 ‘' + (FLOW_WORD[label] || label) + '’ 쪽 힘이 가장 커요'; } // 예전 label.replace('기','')는 기회기를 "회기"로 잘랐다
    return {
      label: label, key: KEY[label], meaning: MEANING[label], rule: rule,
      scores: { fit: r0(fit), intensity: r0(inten), volatility: r0(vol), flows: ev.phaseScores ? { opportunity: ev.phaseScores.opportunity, expansion: ev.phaseScores.expansion, harvest: ev.phaseScores.harvest, accumulation: ev.phaseScores.accumulation } : null },
      condition: ev.condition || (ev.flow && ev.flow.condition && ev.flow.condition.name) || '',
    };
  }

  R.Luck6 = { CONFIG: CONFIG, NAMES: NAMES, MEANING: MEANING, KEY: KEY, of: of, pct: pct };
})(typeof window !== 'undefined' ? window : globalThis);
