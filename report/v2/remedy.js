// 개운법 라이브러리(7유형) + 추천 엔진.
// 유형: action(행동) growth(성장/학습) people(사람) place(공간) environment(환경) timing(타이밍)
// 운동은 별도 유형이 아니라 "행동 개운법" 안의 한 종류다(extra.kind === 'exercise').
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

  /* 행동 개운법 중 "운동·활동" 종류 (extra.kind='exercise'): 건강 처방이 아니라 활동 추천 */
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
    add('action', 'ex_' + e[0], e[1], e[2] + ' (건강 처방이 아니라 활동 추천입니다.)', e[3], {}, 50, { kind: 'exercise', check: '이번 주 ' + e[1] + ' 한 번 해 보기', exercise: e[0], energyTags: e[3], behaviorTags: e[3], environmentTags: e[6], intensity: e[4], socialType: e[5] });
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

  /* ── 프로젝트(상품)별 개운법 ──────────────────────────────────────────────
     conditions.project 가 있는 항목은 그 프로젝트에서만 후보가 되고, 후보 중에서 우선한다(+THEME_BONUS).
     조건이 없는 항목은 모든 프로젝트가 같이 쓰는 공통 항목이다. 행동·활동 추천이며 의료·투자·법률 조언이 아니다. */
  var LOVE = { project: ['love'] }, WEALTH = { project: ['wealth'] }, NEWYEAR = { project: ['newyear'] };
  // 애정운
  add('action', 'love_action_express', '마음을 말로 꺼내 보세요', '짐작하게 두기보다 고마움·서운함·기대를 짧은 말로 먼저 건네는 쪽이 관계에 힘이 됩니다.', ['connection', 'output', 'romantic'], LOVE, 80, { check: '고마운 마음 한 문장 전하기', avoid: ['말하지 않고 기대하기'] });
  add('action', 'love_action_listen', '상대의 이야기를 끝까지 들어 보세요', '결론을 서두르지 않고 질문으로 이어 가면 오해가 줄고 마음이 가까워질 수 있습니다.', ['listening', 'connection', 'restraint'], LOVE, 78, { check: '오늘 대화에서 질문 두 개 하기', avoid: ['결론부터 말하기'] });
  add('action', 'love_action_space', '거리를 조절하는 연습을 해 보세요', '가까워지는 것만큼 혼자 쉬는 시간도 관계를 오래 가게 합니다. 서로의 속도를 존중하는 약속이 도움이 됩니다.', ['protect', 'reflection', 'recovery'], LOVE, 70, { check: '나만의 시간 하루 정해 두기' });
  add('growth', 'love_growth_write', '내 마음을 글로 정리해 보세요', '무엇을 원하고 무엇이 불편한지 적어 두면 감정이 올라올 때도 표현이 훨씬 차분해집니다.', ['reflection', 'organize', 'learning'], LOVE, 72, { mode: '정리하기', examples: ['감정 일기', '관계에서 바라는 것 목록'] });
  add('people', 'love_people_listener', '속마음을 편하게 말할 수 있는 사람', '관계 고민을 털어놓고 정리할 수 있는 친구·가족이 지금의 관계에 안정감을 줍니다.', ['support', 'connection', 'recovery'], LOVE, 76, { person: 'listener' });
  add('people', 'love_people_senior', '관계 경험이 깊은 선배', '비슷한 시기를 지나온 사람의 이야기가 내 패턴을 보는 데 도움이 됩니다.', ['learning', 'reflection', 'support'], LOVE, 66, { person: 'senior' });
  add('place', 'love_place_talk', '조용히 대화하기 좋은 카페·산책로', '소음이 적고 걸으면서 이야기할 수 있는 곳이 마음을 열기에 좋습니다.', ['connection', 'reflection', 'recovery'], LOVE, 74, { place: 'cafe', layer: 'type-only' });
  add('place', 'love_place_trip', '낯선 곳으로 가는 짧은 여행', '환경이 바뀌면 서로의 새로운 모습이 보이고 대화의 결이 달라질 수 있습니다.', ['transition', 'expansion', 'connection'], LOVE, 62, { place: 'travel', layer: 'type-only' });
  add('environment', 'love_env_warm', '따뜻한 조명과 정돈된 공간', '대화하는 자리의 조명과 소음을 정리하면 마음이 한결 편안해집니다.', ['recovery', 'focus', 'organize'], LOVE, 64, null);
  add('action', 'love_ex_walk', '함께 걷기', '나란히 걸으며 이야기하는 활동은 속도를 맞추고 마음을 가볍게 여는 데 어울립니다. (건강 처방이 아니라 활동 추천입니다.)', ['connection', 'recovery', 'reflection'], LOVE, 68, { kind: 'exercise', check: '이번 주 함께 걷는 시간 만들기', exercise: 'walking', energyTags: ['connection'], intensity: 'low', socialType: 'mixed', environmentTags: ['outdoor'] });
  add('timing', 'love_timing', '관계는 속도보다 때를 맞추는 쪽이 좋아요', '마음이 앞설 때일수록 한 걸음 쉬었다가 상대의 속도를 확인하고 움직여 보세요.', ['transition', 'reflection', 'protect'], LOVE, 60, null);
  // 재물운 (행동 습관 중심 · 수익·투자 예측 아님)
  add('action', 'wealth_action_track', '지출을 한 달만 기록해 보세요', '돈이 어디로 가는지 보이면 무엇을 지키고 무엇을 줄일지 스스로 정할 수 있습니다.', ['organize', 'accumulate', 'protect'], WEALTH, 80, { check: '이번 주 지출 항목 분류하기', avoid: ['기록 없이 감으로 쓰기'] });
  add('action', 'wealth_action_buffer', '여유 자금을 지키는 나만의 규칙', '고정 비용과 여유분을 나눠 두면 흔들리는 시기에도 선택지가 남습니다.', ['protect', 'accumulate', 'foundation'], WEALTH, 76, { check: '매달 고정 비용과 여유분 구분하기', avoid: ['충동적인 큰 지출'] });
  add('action', 'wealth_action_reinvest', '번 것의 일부를 실력에 다시 넣기', '도구·배움·관계에 일부를 되돌리면 다음 기회의 폭이 넓어지는 경향이 있습니다.', ['reinvest', 'learning', 'output'], WEALTH, 72, { check: '이번 달 재투자할 항목 1개 정하기' });
  add('action', 'wealth_action_price', '내가 제공하는 가치를 정리해 보세요', '무엇을 누구에게 어떻게 제공하는지 적어 두면 제안과 협상이 한결 분명해집니다.', ['output', 'opportunity', 'choice'], WEALTH, 70, { check: '내가 제공하는 것 3가지 적기' });
  add('growth', 'wealth_growth_basics', '돈의 기본기를 공부하세요', '예산·세금·계약 같은 기본 개념을 알아 두면 기회가 왔을 때 판단이 빨라집니다.', ['learning', 'accumulate', 'foundation'], WEALTH, 74, { mode: '배우기', examples: ['가계·현금흐름 관리', '계약서 읽는 법'] });
  add('people', 'wealth_people_expert', '해당 분야 전문가에게 확인받기', '큰 결정 앞에서는 경험 있는 전문가의 의견을 한 번 더 듣는 것이 안전합니다.', ['choice', 'learning', 'support'], WEALTH, 72, { person: 'expert' });
  add('people', 'wealth_people_partner', '함께 일할 협업 파트너', '내가 약한 부분을 채워 주는 파트너와 역할을 나누면 일이 더 단단해집니다.', ['expansion', 'connection', 'reinvest'], WEALTH, 66, { person: 'collaborator' });
  add('place', 'wealth_place_focus', '도서관·코워킹처럼 집중되는 곳', '계획을 세우고 숫자를 점검할 때는 방해가 적은 공간이 좋습니다.', ['focus', 'learning', 'organize'], WEALTH, 68, { place: 'library', layer: 'type-only' });
  add('environment', 'wealth_env_files', '영수증·계약서 정리함', '서류와 기록을 한 곳에 모아 두면 불안이 줄고 점검이 쉬워집니다.', ['organize', 'protect', 'focus'], WEALTH, 64, null);
  add('timing', 'wealth_timing', '큰 결정은 흐름이 안정된 때에', '들뜨거나 조급할 때의 큰 결정은 한 번 미루고, 정리된 상태에서 다시 확인해 보세요.', ['protect', 'choice', 'reflection'], WEALTH, 60, null);
  // 신년 운세
  add('action', 'ny_action_goal', '올해 목표를 세 가지로 줄이세요', '많은 계획보다 선명한 몇 가지가 한 해를 끝까지 끌고 갑니다.', ['choice', 'organize', 'reflection'], NEWYEAR, 78, { check: '올해 목표 3가지 적고 이유 한 줄씩 쓰기', avoid: ['한꺼번에 많이 벌이기'] });
  add('action', 'ny_action_review', '매달 첫 주에 점검하세요', '월마다 흐름이 달라지므로 한 달에 한 번 계획과 현실을 맞춰 보면 방향을 지키기 쉽습니다.', ['reflection', 'organize', 'accumulate'], NEWYEAR, 76, { check: '이번 달 점검 날짜를 달력에 넣기' });
  add('growth', 'ny_growth_plan', '올해 배우거나 만들 것을 정하세요', '배우기·만들기·보여주기 중 올해 가장 필요한 하나를 정해 두면 시간을 덜 흘립니다.', ['learning', 'output', 'choice'], NEWYEAR, 70, { mode: '만들기', examples: ['포트폴리오 완성', '자격 준비'] });
  add('environment', 'ny_env_calendar', '달력·플래너를 한 곳에 모으세요', '일정과 목표를 한 곳에서 보면 달마다 달라지는 흐름에 맞춰 움직이기 쉬워집니다.', ['organize', 'focus', 'reflection'], NEWYEAR, 62, null);
  add('timing', 'ny_timing', '달마다 흐름에 맞춰 강약을 조절하세요', '기회가 열리는 달에는 움직이고, 정비가 필요한 달에는 줄이는 식으로 한 해를 설계해 보세요.', ['transition', 'opportunity', 'protect'], NEWYEAR, 64, null);

  // 계절 → 필요한 행동 태그. 십성군·신강약으로 보정한다. (엔진이 낸 계절/구조를 행동 태그로 "옮기는" 표현 규칙)
  var isExercise = function (it) { return !!(it && it.extra && it.extra.kind === 'exercise'); };
  // 예전 저장본의 type:'exercise' 항목을 "행동"의 운동 종류로 옮긴다
  function normalize(it) { if (it && it.type === 'exercise') { it = Object.assign({}, it, { type: 'action' }); it.extra = Object.assign({}, it.extra || {}, { kind: 'exercise' }); } return it; }
  var THEME_BONUS = 40; // 프로젝트 전용 개운법은 공통 항목보다 먼저 뽑힌다
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
  function needs(sd, themeTags) {
    var ses = (sd.sewoon && sd.sewoon.season) || (sd.currentDaewoon && sd.currentDaewoon.season) || 'accumulation';
    var m0 = (sd.monthlyLuck || [])[0], dw = sd.currentDaewoon && sd.currentDaewoon.season;
    var w = {}, add2 = function (arr, v) { (arr || []).forEach(function (t) { w[t] = (w[t] || 0) + v; }); };
    add2(SEASON_NEEDS[ses], 3); if (dw) add2(SEASON_NEEDS[dw], 2); if (m0 && m0.season) add2(SEASON_NEEDS[m0.season], 1);
    add2(GROUP_NEEDS[sd.dominantGroup], 1); add2(STR_NEEDS[sd.strength.band], 1);
    add2(themeTags, 2); // 상품(프로젝트)이 우선하는 행동 방향
    var tags = Object.keys(w).sort(function (a, b) { return w[b] - w[a] || (a < b ? -1 : 1); });
    return { season: ses, tags: tags, weights: w, steps: SEASON_PLAN[ses], growthMode: GROWTH_MODE[ses] };
  }

  // 한 유형에서 상위 n개. 점수 = 필요 태그 가중 합 + 조건 구체성 + priority/100. 조건 불일치는 제외.
  function recommend(sd, facts, library, nd, perType) {
    var Rules = R.Rules, out = {};
    var types = ['action', 'growth', 'people', 'place', 'environment', 'timing'];
    types.forEach(function (t) {
      var cands = [];
      library.forEach(function (it) {
        if (it.enabled === false || it.type !== t) return;
        var ev = Rules.evaluate(it, facts); if (!ev.match) return;
        var s = 0; (it.tags || []).forEach(function (g) { s += nd.weights[g] || 0; });
        if (t === 'growth' && it.id === 'growth_' + nd.growthMode) s += 6;
        cands.push({ item: it, score: s * 10 + ev.specificity + (+it.priority || 0) / 100 + (it.conditions && it.conditions.project && it.conditions.project.length ? THEME_BONUS : 0), rows: ev.rows, matchedTags: (it.tags || []).filter(function (g) { return nd.weights[g]; }) });
      });
      cands.sort(function (a, b) { return b.score - a.score || (a.item.id < b.item.id ? -1 : 1); });
      if (t === 'action') { // 행동 개운법: 일반 행동 3개 + 운동·활동 1개(있으면)를 점수 순으로
        var ex = cands.filter(function (c) { return isExercise(c.item); }), non = cands.filter(function (c) { return !isExercise(c.item); });
        cands = non.slice(0, Math.max(1, ((perType && perType.action) || 4) - 1)).concat(ex.slice(0, 1)).sort(function (a, b) { return b.score - a.score || (a.item.id < b.item.id ? -1 : 1); });
      }
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

  R.Remedy = { LIBRARY: L, needs: needs, recommend: recommend, actionPlan: actionPlan, SEASON_NEEDS: SEASON_NEEDS, TYPES: ['action', 'growth', 'people', 'place', 'environment', 'timing'], isExercise: isExercise, normalize: normalize };
})(typeof window !== 'undefined' ? window : globalThis);
