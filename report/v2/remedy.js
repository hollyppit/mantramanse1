// 개운법 라이브러리(7유형) + 추천 엔진.
// 유형: action(행동) exercise(운동) growth(성장/학습) people(사람) place(공간) environment(환경) timing(타이밍)
// 아이템: { id, type, title, summary, detail, tags, conditions, priority, enabled, extra }
// 운동은 건강 처방이 아니라 "현재 필요한 행동 성향과 맞는 활동" 추천이다. 실제 장소는 하드코딩하지 않는다(장소 유형만; 위치 기반은 Location layer 로 분리).
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, L = [];
  function add(type, id, title, summary, tags, cond, pri, extra) {
    L.push({ id: id, type: type, title: title, summary: summary, detail: (extra && extra.detail) || '', tags: tags, conditions: cond || {}, priority: pri || 50, enabled: true, extra: extra || null });
  }
  var S = { op: ['opportunity'], ex: ['expansion'], ha: ['harvest'], ac: ['accumulation'], tr: ['transition'], de: ['defense'] };

  /* ACTION */
  add('action', 'action_publish', '결과물을 밖으로 보여 주세요', '준비보다 공개가 필요한 흐름입니다. 완성도 100%를 기다리지 말고 작은 결과물이라도 먼저 보여 주세요.', ['output', 'opportunity', 'expansion'], {}, 80, { check: '결과물 하나 완성해 외부에 공개하기', avoid: ['지나친 공부', '완벽주의', '준비만 반복'] });
  add('action', 'action_propose', '제안하고 연결하세요', '새로운 사람·기회와 접점을 만들면 흐름이 열리기 쉽습니다.', ['connection', 'opportunity'], {}, 70, { check: '새로운 사람 2명 만나기' });
  add('action', 'action_learn', '배우는 시간을 먼저 확보하세요', '지금은 성과보다 기반을 쌓는 시간이 나중의 힘이 됩니다.', ['learning', 'accumulate', 'foundation'], {}, 80, { check: '하루 30분 배움 시간 고정하기', avoid: ['성급한 결과 기대'] });
  add('action', 'action_organize', '정리하고 한 가지에 집중하세요', '벌여 놓은 것을 줄이고 남길 것을 고르는 것이 지금의 행동입니다.', ['organize', 'transition', 'choice'], {}, 75, { check: '진행 중인 프로젝트 하나 정리하기', avoid: ['무리한 확장'] });
  add('action', 'action_expand', '검증된 것을 한 단계 키우세요', '이미 잘 되고 있는 것의 범위를 넓히는 데 힘이 실립니다.', ['expansion', 'execution'], {}, 70, { check: '기존 성과 중 하나의 범위 확대 계획 세우기' });
  add('action', 'action_reinvest', '거둔 것의 일부를 다시 투자하세요', '성과를 정리하고 일부는 실력·도구·관계에 재투자해 다음 흐름을 준비하세요.', ['reinvest', 'harvest', 'organize'], {}, 70, { check: '이번 성과 중 재투자할 항목 1개 정하기' });
  add('action', 'action_protect', '리듬을 지키고 줄일 것을 줄이세요', '무리한 확장보다 일정·지출·약속을 줄여 에너지를 지키는 것이 유리한 흐름입니다.', ['protect', 'reduce', 'recovery', 'rest'], {}, 80, { check: '이번 달 줄일 약속·지출 1가지 정하기', avoid: ['큰 지출', '과로'] });
  add('action', 'action_reflect', '선택 기준을 글로 적어 보세요', '전환의 시기에는 무엇을 남기고 버릴지 기준을 적어 두면 흔들림이 줄어듭니다.', ['reflection', 'choice', 'transition'], {}, 70, { check: '남길 것·버릴 것 3가지씩 적기' });
  add('action', 'action_restraint', '결정 전에 한 번 더 들어 보세요', '주도하는 힘이 큰 구조일수록 의견을 구하고 결정하면 실수가 줄어듭니다.', ['listening', 'restraint'], { strength: ['신강'] }, 55, { check: '중요한 결정 전 한 사람에게 의견 묻기' });
  add('action', 'action_support', '도움을 청하고 곁을 고르세요', '혼자 해결하려 하기보다 도움을 주는 사람·환경을 먼저 갖추는 것이 힘이 됩니다.', ['support', 'connection'], { strength: ['신약'] }, 55, { check: '도움을 청할 사람 1명에게 연락하기' });

  /* EXERCISE: 건강 처방이 아님 */
  var EX = [
    ['running', '달리기', '혼자 일정한 리듬으로 앞으로 나아가는 활동이 실행력을 끌어올리는 현재의 흐름과 잘 맞습니다.', ['execution', 'output', 'focus'], 'mid', 'solo', ['outdoor']],
    ['walking', '걷기', '속도를 낮추고 생각을 정리하는 활동으로, 정비와 회복이 필요한 흐름과 잘 맞습니다.', ['recovery', 'reflection', 'rest'], 'low', 'solo', ['outdoor']],
    ['hiking', '등산', '긴 호흡으로 오르며 기반을 다지는 감각이 축적의 흐름과 어울립니다.', ['accumulate', 'foundation', 'reflection'], 'mid', 'solo', ['mountain']],
    ['weightTraining', '근력운동', '반복과 기록으로 쌓이는 활동이 꾸준한 축적과 기반 다지기와 잘 맞습니다.', ['accumulate', 'foundation', 'protect'], 'mid', 'solo', ['indoor']],
    ['swimming', '수영', '흐름에 몸을 맡기며 긴장을 풀고 회복하는 활동이 전환과 정리의 시기에 어울립니다.', ['recovery', 'transition', 'reflection'], 'mid', 'solo', ['water']],
    ['yoga', '요가', '호흡과 자세로 속도를 늦추고 중심을 잡는 활동이 방어·정비의 흐름과 잘 맞습니다.', ['recovery', 'protect', 'rest'], 'low', 'solo', ['indoor']],
    ['boxing', '복싱', '짧고 강한 집중으로 에너지를 밖으로 내보내는 활동이 답답함을 풀고 추진력을 높이는 데 어울립니다.', ['output', 'execution', 'expansion'], 'high', 'solo', ['indoor']],
    ['climbing', '클라이밍', '문제를 하나씩 풀며 올라가는 활동이 도전과 집중이 필요한 흐름과 잘 맞습니다.', ['execution', 'focus', 'opportunity'], 'high', 'mixed', ['indoor']],
    ['cycling', '자전거', '바람을 가르며 일정한 리듬으로 이동하는 활동이 확장과 기분 전환에 어울립니다.', ['expansion', 'transition', 'output'], 'mid', 'mixed', ['outdoor']],
    ['teamSports', '팀 스포츠', '함께 뛰며 연결과 협업 감각을 키우는 활동이 사람과 기회를 넓히는 흐름과 잘 맞습니다.', ['connection', 'expansion', 'opportunity'], 'mid', 'group', ['outdoor']],
    ['dance', '댄스', '몸으로 표현하며 감정을 밖으로 꺼내는 활동이 표현과 공개의 흐름과 어울립니다.', ['output', 'connection', 'opportunity'], 'mid', 'mixed', ['indoor']],
    ['meditationMovement', '명상·스트레칭', '조용히 몸을 풀며 생각을 비우는 활동이 정리와 회복이 필요한 시기에 어울립니다.', ['reflection', 'recovery', 'transition'], 'low', 'solo', ['indoor']],
  ];
  EX.forEach(function (e) {
    add('exercise', 'ex_' + e[0], e[1], e[2] + ' (건강 처방이 아니라 활동 추천입니다.)', e[3], {}, 50, { exercise: e[0], energyTags: e[3], behaviorTags: e[3], environmentTags: e[6], intensity: e[4], socialType: e[5] });
  });

  /* GROWTH: 배우기/만들기/보여주기/연결하기/반복하기/정리하기 */
  var GR = [
    ['learn', '배우기', ['학습', '자격증', '독서', '연구'], ['learning', 'accumulate', 'foundation']],
    ['make', '만들기', ['개발·코딩', '창작', '글쓰기', '포트폴리오'], ['output', 'execution', 'creation']],
    ['show', '보여주기', ['콘텐츠 제작', 'SNS 발행', '사이드 프로젝트', '발표'], ['output', 'opportunity', 'expansion']],
    ['connect', '연결하기', ['네트워킹', '멘토링', '커뮤니티 참여'], ['connection', 'expansion', 'opportunity']],
    ['repeat', '반복하기', ['루틴 만들기', '꾸준한 기록', '사업 실험 반복'], ['accumulate', 'foundation', 'execution']],
    ['organize', '정리하기', ['포트폴리오 정리', '지식 정리', '목표 재설정'], ['organize', 'reflection', 'transition']],
  ];
  GR.forEach(function (g) {
    add('growth', 'growth_' + g[0], g[1] + '에 집중하세요', '지금은 "' + g[1] + '"이(가) 가장 필요한 성장 방식입니다. 예: ' + g[2].join(' · ') + '.', g[3], {}, 50, { mode: g[1], examples: g[2] });
  });

  /* PEOPLE: 단순 띠 궁합이 아니라 필요한 관계 유형 */
  [['practitioner', '경험 많은 실무형', '이미 해 본 사람의 경험을 빌리면 시행착오가 줄어듭니다.', ['learning', 'support', 'accumulate']],
   ['market', '새로운 시장을 아는 사람', '내가 모르는 시장의 사람과 연결되면 기회가 넓어집니다.', ['expansion', 'opportunity', 'connection']],
   ['doer', '실행력이 강한 사람', '함께 움직이는 사람이 있으면 미루던 일이 굴러가기 시작합니다.', ['execution', 'output']],
   ['stabilizer', '안정적인 조력자', '곁에서 균형을 잡아 주는 사람이 회복과 방어에 힘이 됩니다.', ['protect', 'recovery', 'support']],
   ['creative', '창의적인 사람', '다른 관점을 가진 사람과의 대화가 막힌 곳을 풀어 줍니다.', ['creation', 'transition', 'output']],
   ['expert', '해당 분야 전문가', '결정이 필요할 때 전문가의 의견이 판단 기준이 됩니다.', ['choice', 'organize', 'learning']],
   ['mentor', '멘토', '앞서 걸은 사람의 조언이 방향을 잡아 줍니다.', ['reflection', 'learning', 'transition']],
   ['peer', '비슷한 길의 동료', '같은 고민을 가진 동료가 꾸준함을 지켜 줍니다.', ['accumulate', 'connection']],
   ['collaborator', '협업자', '서로 부족한 부분을 채워 주는 협업자가 성과를 키웁니다.', ['expansion', 'connection', 'reinvest']]].forEach(function (p) {
    add('people', 'people_' + p[0], p[1], p[2], p[3], {}, 50, { person: p[0] });
  });

  /* PLACE: 장소 유형 + 목적 태그만. 실제 장소는 Location layer(미구현, 별도 모듈)에서 붙인다. */
  var PL = [
    ['forest', '숲 · 산책로', '외부 자극을 줄이고 생각을 정리하며 방향을 잡기 좋은 곳', ['recovery', 'reflection', 'transition']],
    ['mountain', '산', '긴 호흡으로 기반과 중심을 다지기 좋은 곳', ['foundation', 'reflection', 'accumulate']],
    ['ocean', '바다', '막힌 마음을 풀고 큰 방향을 생각하기 좋은 곳', ['recovery', 'reflection', 'transition']],
    ['river', '강변', '일정한 흐름을 따라 걸으며 머리를 비우기 좋은 곳', ['recovery', 'reflection']],
    ['lake', '호수', '조용히 마음을 가라앉히기 좋은 곳', ['recovery', 'rest']],
    ['park', '공원', '가볍게 움직이며 기분을 환기하기 좋은 곳', ['recovery', 'connection']],
    ['library', '도서관', '몰입해서 배우고 정리하기 좋은 곳', ['focus', 'learning', 'organize']],
    ['bookstore', '서점', '새로운 관점과 영감을 얻기 좋은 곳', ['learning', 'creation']],
    ['museum', '박물관', '긴 시간의 흐름 속에서 시야를 넓히기 좋은 곳', ['reflection', 'learning']],
    ['gallery', '전시·갤러리', '감각을 깨우고 표현의 영감을 얻기 좋은 곳', ['creation', 'output']],
    ['city', '도심 번화가', '사람과 기회의 흐름을 가까이서 느끼기 좋은 곳', ['expansion', 'opportunity', 'connection']],
    ['coworking', '코워킹 공간', '비슷한 목표의 사람들 사이에서 집중과 연결을 얻기 좋은 곳', ['focus', 'connection', 'execution']],
    ['cafe', '카페', '가볍게 작업하고 사람을 만나기 좋은 곳', ['focus', 'connection']],
    ['temple', '고요한 사찰·명상 공간', '마음을 비우고 중심을 잡기 좋은 곳', ['reflection', 'rest', 'protect']],
    ['travel', '여행지', '환경을 바꿔 시야와 방향을 새로 하기 좋은 곳', ['transition', 'expansion', 'reflection']],
    ['event', '행사·모임', '새로운 사람과 기회를 만나기 좋은 곳', ['connection', 'opportunity', 'expansion']],
    ['community', '커뮤니티·스터디', '꾸준히 함께 하며 힘을 얻기 좋은 곳', ['connection', 'accumulate', 'support']],
  ];
  PL.forEach(function (p) { add('place', 'place_' + p[0], p[1], p[2] + '입니다.', p[3], {}, 50, { place: p[0], purposeTags: p[3], layer: 'type-only' }); });

  /* ENVIRONMENT: 미신적 색상보다 행동 전략과 연결된 환경 */
  [['workspace', '정돈된 책상과 작업 공간', '시작과 마무리가 쉬운 작업 환경이 실행력을 지켜 줍니다.', ['focus', 'organize', 'execution']],
   ['lighting', '자연광과 따뜻한 조명', '낮에는 자연광, 저녁에는 은은한 조명이 리듬을 잡아 줍니다.', ['recovery', 'focus']],
   ['nature', '식물과 자연 요소', '시야에 자연이 있으면 긴장이 풀리고 환기가 됩니다.', ['recovery', 'reflection']],
   ['organization', '물건 줄이기와 분류', '눈에 보이는 것을 줄이면 선택과 정리가 쉬워집니다.', ['organize', 'transition', 'reduce']],
   ['noise', '소음과 알림 줄이기', '알림과 소음을 줄이면 한 가지에 오래 머물기 쉬워집니다.', ['focus', 'reduce', 'protect']],
   ['digitalEnvironment', '디지털 환경 정리', '앱·알림·폴더를 정돈해 필요한 것에만 집중하세요.', ['organize', 'focus', 'reduce']],
   ['material', '나무·천 같은 부드러운 질감', '부드러운 질감은 마음을 가라앉히는 데 도움이 될 수 있습니다.', ['recovery', 'rest']],
   ['color', '목적에 맞는 색 포인트', '집중이 필요하면 차분한 색, 활력이 필요하면 밝은 색 등 목적에 맞춰 소품으로 가볍게 활용해 보세요.', ['focus', 'output']]].forEach(function (e) {
    add('environment', 'env_' + e[0], e[1], e[2], e[3], {}, 50, { element: e[0], reduce: ['지나친 시각 자극', '동시에 여러 작업', '알림 많은 환경'] });
  });

  /* TIMING: 대운→세운→월운 흐름을 현재 전략으로 연결 */
  [['timing_hold', '지금은 기반을 쌓는 때', '큰 움직임보다 준비와 기초 작업에 시간을 쓰는 것이 유리한 흐름입니다.', ['accumulate', 'learning', 'foundation'], S.ac],
   ['timing_go', '지금은 움직일 때', '공개·제안·연결 같은 외부로 향하는 행동이 힘을 받는 흐름입니다.', ['output', 'opportunity', 'connection'], S.op],
   ['timing_grow', '지금은 키울 때', '이미 해 온 일의 범위를 넓히기에 좋은 흐름입니다.', ['expansion', 'execution'], S.ex],
   ['timing_reap', '지금은 거두고 정리할 때', '성과를 회수하고 일부를 재투자하며 다음을 준비하는 흐름입니다.', ['organize', 'reinvest', 'harvest'], S.ha],
   ['timing_turn', '지금은 방향을 고를 때', '무엇을 남길지 정하고 작은 실험으로 방향을 확인하는 흐름입니다.', ['transition', 'choice', 'reflection'], S.tr],
   ['timing_guard', '지금은 지키고 쉬어 갈 때', '확장보다 점검과 회복에 무게를 두는 흐름입니다.', ['protect', 'recovery', 'rest'], S.de]].forEach(function (t) {
    add('timing', t[0], t[1], t[2], t[3], { seunSeason: t[4] }, 60, null);
  });

  // 계절 → 필요한 행동 태그. 십성군·신강약으로 보정한다. (엔진이 낸 계절/구조를 행동 태그로 "옮기는" 표현 규칙)
  var SEASON_NEEDS = {
    opportunity: ['output', 'opportunity', 'connection', 'expansion'], expansion: ['expansion', 'execution', 'connection'],
    harvest: ['organize', 'reinvest', 'output', 'rest'], accumulation: ['learning', 'accumulate', 'focus', 'foundation'],
    transition: ['reflection', 'transition', 'choice', 'organize'], defense: ['recovery', 'protect', 'reduce', 'rest'],
  };
  var GROUP_NEEDS = { '비겁': ['listening', 'connection'], '식상': ['organize', 'focus'], '재성': ['reflection', 'protect'], '관성': ['recovery', 'rest'], '인성': ['output', 'execution'] };
  var STR_NEEDS = { '신강': ['listening', 'restraint'], '신약': ['support', 'connection', 'rest'], '중화': [] };
  var SEASON_PLAN = {
    opportunity: ['만들기', '공개하기', '연결하기', '확장하기'], expansion: ['점검하기', '넓히기', '연결하기', '정리하기'],
    harvest: ['정리하기', '거두기', '나누기', '재투자하기'], accumulation: ['배우기', '쌓기', '만들기', '다듬기'],
    transition: ['정리하기', '선택하기', '재구성하기', '시작하기'], defense: ['점검하기', '줄이기', '지키기', '쉬어 가기'],
  };
  var GROWTH_MODE = { opportunity: 'show', expansion: 'connect', harvest: 'organize', accumulation: 'learn', transition: 'make', defense: 'repeat' };

  // 현재 사용자에게 필요한 행동 방향. 가중치: 올해(세운)>현재 대운>이달. 모두 이미 계산된 계절에서 옮긴다.
  function needs(sd) {
    var ses = (sd.sewoon && sd.sewoon.season) || (sd.currentDaewoon && sd.currentDaewoon.season) || 'accumulation';
    var m0 = (sd.monthlyLuck || [])[0], dw = sd.currentDaewoon && sd.currentDaewoon.season;
    var w = {}, add2 = function (arr, v) { (arr || []).forEach(function (t) { w[t] = (w[t] || 0) + v; }); };
    add2(SEASON_NEEDS[ses], 3); if (dw) add2(SEASON_NEEDS[dw], 2); if (m0 && m0.season) add2(SEASON_NEEDS[m0.season], 1);
    add2(GROUP_NEEDS[sd.dominantGroup], 1); add2(STR_NEEDS[sd.strength.band], 1);
    var tags = Object.keys(w).sort(function (a, b) { return w[b] - w[a] || (a < b ? -1 : 1); });
    return { season: ses, tags: tags, weights: w, steps: SEASON_PLAN[ses], growthMode: GROWTH_MODE[ses] };
  }

  // 한 유형에서 상위 n개. 점수 = 필요 태그 가중 합 + 조건 구체성 + priority/100. 조건 불일치는 제외.
  function recommend(sd, facts, library, nd, perType) {
    var Rules = R.Rules, out = {};
    var types = ['action', 'exercise', 'growth', 'people', 'place', 'environment', 'timing'];
    types.forEach(function (t) {
      var cands = [];
      library.forEach(function (it) {
        if (it.enabled === false || it.type !== t) return;
        var ev = Rules.evaluate(it, facts); if (!ev.match) return;
        var s = 0; (it.tags || []).forEach(function (g) { s += nd.weights[g] || 0; });
        if (t === 'growth' && it.id === 'growth_' + nd.growthMode) s += 6;
        cands.push({ item: it, score: s * 10 + ev.specificity + (+it.priority || 0) / 100, rows: ev.rows, matchedTags: (it.tags || []).filter(function (g) { return nd.weights[g]; }) });
      });
      cands.sort(function (a, b) { return b.score - a.score || (a.item.id < b.item.id ? -1 : 1); });
      out[t] = cands.slice(0, (perType && perType[t]) || 2).filter(function (c, i) { return i === 0 || c.score > 0; });
    });
    return out;
  }

  // 최종 Action Plan: 숫자·행동은 추천 모듈의 값만 사용한다(AI가 만들지 않음).
  function actionPlan(sd, nd, rec) {
    var steps = nd.steps.map(function (s, i) { return { no: i + 1, label: s }; });
    var checklist = [];
    ['action', 'growth', 'people'].forEach(function (t) { (rec[t] || []).forEach(function (c) { var ck = c.item.extra && c.item.extra.check; if (ck && checklist.indexOf(ck) < 0) checklist.push(ck); }); });
    var avoid = []; (rec.action || []).forEach(function (c) { ((c.item.extra && c.item.extra.avoid) || []).forEach(function (a) { if (avoid.indexOf(a) < 0) avoid.push(a); }); });
    return { season: nd.season, strategy: steps, checklist: checklist.slice(0, 6), avoid: avoid.slice(0, 6), basedOn: nd.tags.slice(0, 4) };
  }

  R.Remedy = { LIBRARY: L, needs: needs, recommend: recommend, actionPlan: actionPlan, SEASON_NEEDS: SEASON_NEEDS, TYPES: ['action', 'exercise', 'growth', 'people', 'place', 'environment', 'timing'] };
})(typeof window !== 'undefined' ? window : globalThis);
