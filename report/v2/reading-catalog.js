(function(root){'use strict';
var SEED={
  "version": 0,
  "topics": [
    {
      "id": "self",
      "title": "종합풀이",
      "order": 0,
      "enabled": true
    },
    {
      "id": "wealth",
      "title": "재물운 심화",
      "order": 1,
      "enabled": true
    },
    {
      "id": "career",
      "title": "커리어운 심화",
      "order": 2,
      "enabled": true
    },
    {
      "id": "love",
      "title": "인연운 심화",
      "order": 3,
      "enabled": true
    },
    {
      "id": "health",
      "title": "건강 및 사고수",
      "order": 4,
      "enabled": false
    },
    {
      "id": "creative",
      "title": "전생 체험",
      "order": 5,
      "enabled": false
    },
    {
      "id": "remedy",
      "title": "개운법",
      "order": 6,
      "enabled": false
    }
  ],
  "chapters": [
    {
      "id": "timeline_self_03",
      "topicId": "self",
      "title": "나의 타고난 기질은?",
      "question": "나의 타고난 기질은?",
      "purpose": "「나의 타고난 기질은?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "일간과 일주의 계산값을 실제 행동 가설과 구분",
      "difference": "핵심 질문 「나의 타고난 기질은?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_01",
        "c01",
        "c-char",
        "self_02",
        "deep_ilju"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [
        "SELF-0015",
        "SELF-0017",
        "SELF-0019",
        "SELF-0020",
        "SELF-0021",
        "SELF-0022",
        "SELF-0023",
        "SELF-0024",
        "SELF-0025",
        "SELF-0026",
        "SELF-0027",
        "SELF-0028",
        "SELF-0029",
        "SELF-0030",
        "SELF-0031",
        "SELF-0032",
        "SELF-0033",
        "SELF-0034",
        "SELF-0035",
        "SELF-0036",
        "SELF-0037",
        "SELF-0038",
        "SELF-0039",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_self_02",
      "topicId": "self",
      "title": "내 사주를 자동차로 비유하면?",
      "question": "내 사주를 자동차로 비유하면?",
      "purpose": "「내 사주를 자동차로 비유하면?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "자동차의 출력·연료·제동과 도로·날씨를 구분하는 비유",
      "difference": "핵심 질문 「내 사주를 자동차로 비유하면?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_04",
        "deep_car"
      ],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [
        "SELF-0001",
        "SELF-0002"
      ],
      "core": true
    },
    {
      "id": "timeline_self_20",
      "topicId": "self",
      "title": "전체 인생 흐름",
      "question": "전체 인생 흐름",
      "purpose": "「전체 인생 흐름」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "대운 경계 전후의 선택 조건을 비교",
      "difference": "핵심 질문 「전체 인생 흐름」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "timing_01",
        "c15",
        "life_prologue",
        "timing_02",
        "deep_daewoon",
        "timing_03",
        "c16",
        "timing_04",
        "timing_08"
      ],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-T-peerD",
        "D27-20261016-T-outputD",
        "D27-20261016-T-wealthD",
        "D27-20261016-T-officerD",
        "D27-20261016-T-resourceD"
      ],
      "core": false
    },
    {
      "id": "timeline_self_24",
      "topicId": "self",
      "title": "움직여야 될 때와 기다려야 할 때",
      "question": "움직여야 될 때와 기다려야 할 때",
      "purpose": "「움직여야 될 때와 기다려야 할 때」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "이직·이사·투자 같은 선택 앞에서 서두르는 쪽과 기다리는 쪽",
      "difference": "핵심 질문 「움직여야 될 때와 기다려야 할 때」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "행동·대기 신호 비교",
      "legacyIds": [
        "timing_05",
        "timing_06",
        "c17",
        "life_future",
        "timing_07",
        "deep_seun",
        "timing_09",
        "c18",
        "deep_wolun"
      ],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-T-peerS",
        "D27-20261016-T-outputS",
        "D27-20261016-T-wealthS",
        "D27-20261016-T-officerS",
        "D27-20261016-T-resourceS",
        "D27-20261016-C-transition",
        "D27-20261016-C-officer-output"
      ],
      "core": false
    },
    {
      "id": "timeline_self_18",
      "topicId": "self",
      "title": "최고의 나와 최악의 나",
      "question": "최고의 나와 최악의 나",
      "purpose": "「최고의 나와 최악의 나」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "같은 추진력을 조율에 쓸 때와 독주에 쓸 때",
      "difference": "핵심 질문 「최고의 나와 최악의 나」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0064"
      ],
      "core": false
    },
    {
      "id": "timeline_self_25",
      "topicId": "self",
      "title": "나의 타고난 강점과 약점",
      "question": "나의 타고난 강점과 약점",
      "purpose": "「나의 타고난 강점과 약점」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "잘하는 일을 맡았다가 약점이 같이 드러나는 순간",
      "difference": "핵심 질문 「나의 타고난 강점과 약점」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0064"
      ],
      "core": false
    },
    {
      "id": "timeline_self_26",
      "topicId": "self",
      "title": "나와 잘 맞는 업",
      "question": "나와 잘 맞는 업",
      "purpose": "「나와 잘 맞는 업」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "일의 방식·환경·업종을 고를 때 기준이 되는 것",
      "difference": "핵심 질문 「나와 잘 맞는 업」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "업종 성향 비교",
      "legacyIds": [],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0001",
        "CAREER-0002",
        "CAREER-0004",
        "CAREER-0005",
        "CAREER-0006",
        "CAREER-0007",
        "CAREER-0009",
        "CAREER-0010",
        "CAREER-0011",
        "CAREER-0012",
        "CAREER-0013"
      ],
      "core": false
    },
    {
      "id": "timeline_self_27",
      "topicId": "self",
      "title": "전체 인연운",
      "question": "전체 인연운",
      "purpose": "「전체 인연운」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "새 사람을 만나 가까워지고 거리를 두는 방식",
      "difference": "핵심 질문 「전체 인연운」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "관계 성향 비교",
      "legacyIds": [],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [
        "RELATIONSHIP-0009",
        "RELATIONSHIP-0010",
        "RELATIONSHIP-0011",
        "RELATIONSHIP-0012",
        "RELATIONSHIP-0008"
      ],
      "core": false
    },
    {
      "id": "timeline_self_28",
      "topicId": "self",
      "title": "대인관계 궁합",
      "question": "대인관계 궁합",
      "purpose": "「잘 맞는 일주와 충돌하는 일주」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "편한 사람과 부딪히는 사람의 차이",
      "difference": "핵심 질문 「잘 맞는 일주와 충돌하는 일주」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "일주 궁합 비교",
      "legacyIds": [],
      "order": 8,
      "state": "draft",
      "sourceRuleIds": [
        "LOVE-0008",
        "LOVE-0009",
        "LOVE-0010",
        "LOVE-0011",
        "LOVE-0012",
        "LOVE-0013",
        "LOVE-0014",
        "LOVE-0015",
        "LOVE-0016",
        "LOVE-0017",
        "D27-20261016-R-yong-0",
        "D27-20261016-R-yong-1",
        "D27-20261016-R-yong-2",
        "D27-20261016-R-yong-3",
        "D27-20261016-R-yong-4"
      ],
      "core": false
    },
    {
      "id": "timeline_self_29",
      "topicId": "self",
      "title": "내 미래 배우자는?",
      "question": "내 미래 배우자는?",
      "purpose": "「내 미래 배우자는?」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "오래 같이 살 사람에게서 확인할 것",
      "difference": "핵심 질문 「내 미래 배우자는?」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "배우자궁 비교",
      "legacyIds": [],
      "order": 9,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-R-yong-0",
        "D27-20261016-R-yong-1",
        "D27-20261016-R-yong-2",
        "D27-20261016-R-yong-3",
        "D27-20261016-R-yong-4",
        "D27-20261016-B-time-male-daewoon",
        "D27-20261016-B-time-male-seun",
        "D27-20261016-B-time-female-daewoon",
        "D27-20261016-B-time-female-seun"
      ],
      "core": false
    },
    {
      "id": "timeline_self_30",
      "topicId": "self",
      "title": "전체 재물운",
      "question": "전체 재물운",
      "purpose": "「전체 재물운」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "돈이 들어오고 나가는 큰 흐름",
      "difference": "핵심 질문 「전체 재물운」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "재물 흐름 비교",
      "legacyIds": [],
      "order": 10,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0006",
        "MONEY-0007",
        "MONEY-0008",
        "MONEY-0011",
        "MONEY-0012",
        "D27-20261016-M-wealthD",
        "D27-20261016-M-wealthS"
      ],
      "core": false
    },
    {
      "id": "timeline_self_31",
      "topicId": "self",
      "title": "나의 재물 그릇은?",
      "question": "나의 재물 그릇은?",
      "purpose": "「나의 재물 그릇은?」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "들어온 돈을 담고 지키는 방식",
      "difference": "핵심 질문 「나의 재물 그릇은?」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "재물 그릇 비교",
      "legacyIds": [],
      "order": 11,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0006",
        "MONEY-0007",
        "MONEY-0008",
        "MONEY-0011",
        "MONEY-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_self_32",
      "topicId": "self",
      "title": "내 사주와 맞는 돈 버는 법",
      "question": "내 사주와 맞는 돈 버는 법",
      "purpose": "「내 사주와 맞는 돈 버는 법」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "월급·사업·전문성 중 내 기운이 편한 방식",
      "difference": "핵심 질문 「내 사주와 맞는 돈 버는 법」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "수입 방식 비교",
      "legacyIds": [],
      "order": 12,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0006",
        "MONEY-0012",
        "MONEY-0014",
        "MONEY-0009",
        "MONEY-0010",
        "CAREER-0006",
        "CAREER-0007"
      ],
      "core": false
    },
    {
      "id": "timeline_self_33",
      "topicId": "self",
      "title": "나의 말년운",
      "question": "나의 말년운",
      "purpose": "「나의 말년운」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "후반기에 쉬는 모습과 계속 움직이는 모습",
      "difference": "핵심 질문 「나의 말년운」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "후반기 흐름 비교",
      "legacyIds": [],
      "order": 13,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-T-peerD",
        "D27-20261016-T-outputD",
        "D27-20261016-T-wealthD",
        "D27-20261016-T-officerD",
        "D27-20261016-T-resourceD",
        "D27-20261016-T-peerS",
        "D27-20261016-T-outputS",
        "D27-20261016-T-wealthS",
        "D27-20261016-T-officerS",
        "D27-20261016-T-resourceS",
        "D27-20261016-R-child-female",
        "D27-20261016-R-child-male"
      ],
      "core": false
    },
    {
      "id": "timeline_self_34",
      "topicId": "self",
      "title": "나의 자식운",
      "question": "나의 자식운",
      "purpose": "「나의 자식운」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "아이와 가까워지는 방식과 부딪히는 방식",
      "difference": "핵심 질문 「나의 자식운」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "자식 자리 비교",
      "legacyIds": [],
      "order": 14,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-R-child-female",
        "D27-20261016-R-child-male"
      ],
      "core": false
    },
    {
      "id": "timeline_self_35",
      "topicId": "self",
      "title": "건강 및 사고수",
      "question": "건강 및 사고수",
      "purpose": "「건강 및 사고수」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "피곤이 쌓이는 순서와 무리하기 쉬운 순간",
      "difference": "핵심 질문 「건강 및 사고수」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "질병 진단·예측",
        "사고 발생 예고",
        "치료·약 권유"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "생활 균형·안전 점검",
      "legacyIds": [
        "health_01",
        "deep_health"
      ],
      "order": 15,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-A-rest",
        "D27-20261016-A-health-year"
      ],
      "core": false
    },
    {
      "id": "timeline_self_36",
      "topicId": "self",
      "title": "전생의 나",
      "question": "전생의 나",
      "purpose": "「전생의 나」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "계산된 사주 상징 (창작 모티브)",
        "앞뒤 장면의 인물·사건·선택 일관성"
      ],
      "example": "현실의 이름을 지닌 주인공이 오래된 문 앞에 서는 도입",
      "difference": "핵심 질문 「전생의 나」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "역사적 사실처럼 단정",
        "실제 전생 주장"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "기존 전생 이미지·영상과 연결된 서사 장면",
      "legacyIds": [
        "creative_01",
        "c14",
        "deep_past"
      ],
      "order": 16,
      "state": "draft",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0017",
        "SELF-0019",
        "SELF-0025",
        "SELF-0029",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_self_37",
      "topicId": "self",
      "title": "개운법",
      "question": "개운법",
      "purpose": "「개운법」에 한 장으로 답한다. 종합풀이 20장 중 요약 장이라 같은 주제의 상세 장(재물운·커리어운·인연운)의 결론을 그대로 옮기지 않고 한 화면 분량으로 압축한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "명소·귀인·행동 시기·코디를 한 장에서 점검",
      "difference": "핵심 질문 「개운법」의 판단과 행동에 한정하며 상세 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "색·물건·방위 단정",
        "구매 권유",
        "특정 장소 방문 효과 단정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "실천 체크리스트",
      "legacyIds": [
        "remedy_01",
        "c19",
        "remedy_07",
        "c20",
        "life_action",
        "life_actions",
        "remedy_03",
        "deep_remedy",
        "remedy_05",
        "deep_places",
        "remedy_06",
        "reading_transform"
      ],
      "order": 17,
      "state": "draft",
      "sourceRuleIds": [
        "ACTION-0011",
        "ACTION-0012",
        "D27-20261016-A-place-0",
        "D27-20261016-A-place-1",
        "D27-20261016-A-place-2",
        "D27-20261016-A-place-3",
        "D27-20261016-A-place-4",
        "D27-20261016-A-year-peer",
        "D27-20261016-A-year-output",
        "D27-20261016-A-year-wealth",
        "D27-20261016-A-year-officer",
        "D27-20261016-A-year-resource"
      ],
      "core": false
    },
    {
      "id": "timeline_self_22",
      "topicId": "self",
      "title": "나라는 사람의 최종 사용설명서",
      "question": "나라는 사람의 최종 사용설명서",
      "purpose": "「나라는 사람의 최종 사용설명서」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "시작·지속·중단 신호를 한 장의 사용설명서로 정리",
      "difference": "핵심 질문 「나라는 사람의 최종 사용설명서」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_14",
        "c00",
        "deep_stages",
        "life_here",
        "timing_10"
      ],
      "order": 18,
      "state": "draft",
      "sourceRuleIds": [
        "SELF-0001",
        "SELF-0002",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_01",
      "topicId": "wealth",
      "title": "내 재물 그릇은 얼마나 클까?",
      "question": "내 재물 그릇은 얼마나 클까?",
      "purpose": "「내 재물 그릇은 얼마나 클까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "소득 기회와 관리 여력을 별도로 점검",
      "difference": "핵심 질문 「내 재물 그릇은 얼마나 클까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "wealth_01",
        "deep_wealth",
        "life_money_nature",
        "life_money_timing",
        "wealth_02"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0006",
        "MONEY-0007",
        "MONEY-0008",
        "MONEY-0011",
        "MONEY-0012"
      ],
      "core": true
    },
    {
      "id": "timeline_wealth_02",
      "topicId": "wealth",
      "title": "나는 어떤 방식으로 돈을 벌까?",
      "question": "나는 어떤 방식으로 돈을 벌까?",
      "purpose": "「나는 어떤 방식으로 돈을 벌까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "급여·납품·판매대금의 수입 경로를 구분",
      "difference": "핵심 질문 「나는 어떤 방식으로 돈을 벌까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "wealth_03",
        "c08"
      ],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0006",
        "MONEY-0012",
        "MONEY-0014"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_03",
      "topicId": "wealth",
      "title": "돈이 들어와도 왜 남지 않을까?",
      "question": "돈이 들어와도 왜 남지 않을까?",
      "purpose": "「돈이 들어와도 왜 남지 않을까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "입금 후 고정비·상환·충동지출을 대조",
      "difference": "핵심 질문 「돈이 들어와도 왜 남지 않을까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "wealth_04"
      ],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0007",
        "MONEY-0008",
        "MONEY-0011",
        "MONEY-0013"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_04",
      "topicId": "wealth",
      "title": "월급형 인간일까, 사업형 인간일까?",
      "question": "월급형 인간일까, 사업형 인간일까?",
      "purpose": "「월급형 인간일까, 사업형 인간일까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "정기 급여와 불규칙 매출의 부담을 비교",
      "difference": "핵심 질문 「월급형 인간일까, 사업형 인간일까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "wealth_06"
      ],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0006",
        "MONEY-0009",
        "MONEY-0010",
        "CAREER-0006",
        "CAREER-0007"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_05",
      "topicId": "wealth",
      "title": "나는 돈을 모으는 사람일까, 쓰는 사람일까?",
      "question": "나는 돈을 모으는 사람일까, 쓰는 사람일까?",
      "purpose": "「나는 돈을 모으는 사람일까, 쓰는 사람일까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "저축 자동이체와 계획 밖 소비의 비율 점검",
      "difference": "핵심 질문 「나는 돈을 모으는 사람일까, 쓰는 사람일까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0007",
        "MONEY-0008",
        "MONEY-0011"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_06",
      "topicId": "wealth",
      "title": "큰돈을 만날 기회는 언제일까?",
      "question": "큰돈을 만날 기회는 언제일까?",
      "purpose": "「큰돈을 만날 기회는 언제일까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "기회가 와도 현금 여유가 없는 경우 비교",
      "difference": "핵심 질문 「큰돈을 만날 기회는 언제일까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "wealth_05"
      ],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-M-wealthD",
        "D27-20261016-M-wealthS"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_07",
      "topicId": "wealth",
      "title": "돈 때문에 가장 조심해야 할 선택",
      "question": "돈 때문에 가장 조심해야 할 선택",
      "purpose": "「돈 때문에 가장 조심해야 할 선택」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "대출·보증·계약 서명 전에 부담 점검",
      "difference": "핵심 질문 「돈 때문에 가장 조심해야 할 선택」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "wealth_07",
        "wealth_09"
      ],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0007",
        "MONEY-0008",
        "MONEY-0011",
        "MONEY-0013"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_08",
      "topicId": "wealth",
      "title": "나는 투자와 재테크에 어울리는 성향일까?",
      "question": "나는 투자와 재테크에 어울리는 성향일까?",
      "purpose": "「나는 투자와 재테크에 어울리는 성향일까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "투자 변동을 견디는 성향과 손실 감당 능력 구분",
      "difference": "핵심 질문 「나는 투자와 재테크에 어울리는 성향일까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0007",
        "MONEY-0008",
        "MONEY-0011"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_09",
      "topicId": "wealth",
      "title": "사람 때문에 돈을 잃기 쉬울까?",
      "question": "사람 때문에 돈을 잃기 쉬울까?",
      "purpose": "「사람 때문에 돈을 잃기 쉬울까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "지인과 공동사업을 할 때 책임·회수 조건 합의",
      "difference": "핵심 질문 「사람 때문에 돈을 잃기 쉬울까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 8,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0008",
        "MONEY-0010",
        "MONEY-0013"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_10",
      "topicId": "wealth",
      "title": "나에게 유리한 재물운의 시기",
      "question": "나에게 유리한 재물운의 시기",
      "purpose": "「나에게 유리한 재물운의 시기」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "재물 관련 승인 판단의 적용 기간 비교",
      "difference": "핵심 질문 「나에게 유리한 재물운의 시기」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "wealth_08"
      ],
      "order": 9,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-M-wealthD",
        "D27-20261016-M-wealthS"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_11",
      "topicId": "wealth",
      "title": "최고의 재물 시나리오 vs 최악의 재물 시나리오",
      "question": "최고의 재물 시나리오 vs 최악의 재물 시나리오",
      "purpose": "「최고의 재물 시나리오 vs 최악의 재물 시나리오」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 같은 기질 → 유리한 조건 → 최고의 케이스 → 불리한 조건 → 최악의 케이스 → 결과를 가르는 선택·환경 → 현실 개선 전략. 범죄·파산·이혼·질병을 억지로 연결하지 않는다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "동일한 확장 성향을 예산 안팎에서 실행할 때 비교",
      "difference": "핵심 질문 「최고의 재물 시나리오 vs 최악의 재물 시나리오」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 10,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0006",
        "MONEY-0007",
        "MONEY-0008",
        "MONEY-0011",
        "MONEY-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_12",
      "topicId": "wealth",
      "title": "내 재산을 키우기 위한 현실 전략",
      "question": "내 재산을 키우기 위한 현실 전략",
      "purpose": "「내 재산을 키우기 위한 현실 전략」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "수입·고정비·예비비·점검일을 실행 계획으로 정리",
      "difference": "핵심 질문 「내 재산을 키우기 위한 현실 전략」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "wealth_10"
      ],
      "order": 11,
      "state": "draft",
      "sourceRuleIds": [
        "MONEY-0006",
        "MONEY-0007",
        "MONEY-0008",
        "MONEY-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_13",
      "topicId": "wealth",
      "title": "재물운에서 나와 맞는 사람과 피해야 할 사람",
      "question": "재물운에서 나와 맞는 사람과 피해야 할 사람",
      "purpose": "「재물운에서 나와 맞는 사람과 피해야 할 사람」에 답한다. 재물운 심화 장으로 계산값(용신·대운·월운)에 맞춰 사람·시기·행동을 구체적으로 말하고 사건을 단정하지 않는다.",
      "requiredEvidence": [
        "용신 오행",
        "일간의 힘"
      ],
      "example": "함께하면 힘이 나는 사람과 부딪히기 쉬운 사람의 차이 (재물운)",
      "difference": "핵심 질문 「재물운에서 나와 맞는 사람과 피해야 할 사람」에 한정하며 같은 탭의 다른 장 결론을 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "용신 오행 비교",
      "legacyIds": [],
      "order": 12,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-M-wealthD",
        "D27-20261016-M-wealthS"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_14",
      "topicId": "wealth",
      "title": "재물운 타이밍: 힘이 실리는 때",
      "question": "재물운 타이밍: 힘이 실리는 때",
      "purpose": "「재물운 타이밍: 힘이 실리는 때」에 답한다. 재물운 심화 장으로 계산값(용신·대운·월운)에 맞춰 사람·시기·행동을 구체적으로 말하고 사건을 단정하지 않는다.",
      "requiredEvidence": [
        "현재 대운 천간 십성",
        "대운표·월운 계산값"
      ],
      "example": "지금 10년과 다가오는 달 중 힘이 실리는 때 (재물운)",
      "difference": "핵심 질문 「재물운 타이밍: 힘이 실리는 때」에 한정하며 같은 탭의 다른 장 결론을 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "대운·월운 흐름 그래프",
      "legacyIds": [],
      "order": 13,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-M-wealthD",
        "D27-20261016-M-wealthS"
      ],
      "core": false
    },
    {
      "id": "timeline_wealth_15",
      "topicId": "wealth",
      "title": "재물운을 끌어올리는 개운법",
      "question": "재물운을 끌어올리는 개운법",
      "purpose": "「재물운을 끌어올리는 개운법」에 답한다. 재물운 심화 장으로 계산값(용신·대운·월운)에 맞춰 사람·시기·행동을 구체적으로 말하고 사건을 단정하지 않는다.",
      "requiredEvidence": [
        "용신 오행",
        "일간의 힘"
      ],
      "example": "이번 주부터 바꿀 수 있는 습관과 시기 (재물운)",
      "difference": "핵심 질문 「재물운을 끌어올리는 개운법」에 한정하며 같은 탭의 다른 장 결론을 반복하지 않는다.",
      "avoid": [
        "색·물건·방위 단정",
        "구매 권유",
        "결과 보장"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 14,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-M-wealthD",
        "D27-20261016-M-wealthS"
      ],
      "core": false
    },
    {
      "id": "timeline_career_01",
      "topicId": "career",
      "title": "나는 어떤 일을 해야 잘할까?",
      "question": "나는 어떤 일을 해야 잘할까?",
      "purpose": "「나는 어떤 일을 해야 잘할까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "실제 맡은 업무와 선호하는 역할을 비교",
      "difference": "핵심 질문 「나는 어떤 일을 해야 잘할까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "career_01",
        "c07",
        "life_career_style",
        "life_career_timing",
        "career_03",
        "c06"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0001",
        "CAREER-0002",
        "CAREER-0004",
        "CAREER-0005",
        "CAREER-0006",
        "CAREER-0007"
      ],
      "core": true
    },
    {
      "id": "timeline_career_02",
      "topicId": "career",
      "title": "내가 가진 가장 돈 되는 재능",
      "question": "내가 가진 가장 돈 되는 재능",
      "purpose": "「내가 가진 가장 돈 되는 재능」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "기술·설명·조율 능력이 유료 가치로 이어지는 조건",
      "difference": "핵심 질문 「내가 가진 가장 돈 되는 재능」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0001",
        "CAREER-0005",
        "CAREER-0016",
        "CAREER-0007",
        "CAREER-0029"
      ],
      "core": false
    },
    {
      "id": "timeline_career_03",
      "topicId": "career",
      "title": "직장인과 사업가, 어느 쪽이 맞을까?",
      "question": "직장인과 사업가, 어느 쪽이 맞을까?",
      "purpose": "「직장인과 사업가, 어느 쪽이 맞을까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "조직의 지원과 독립의 책임을 비교",
      "difference": "핵심 질문 「직장인과 사업가, 어느 쪽이 맞을까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "career_02"
      ],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0006",
        "CAREER-0007"
      ],
      "core": false
    },
    {
      "id": "timeline_career_04",
      "topicId": "career",
      "title": "나는 리더일까, 전문가일까?",
      "question": "나는 리더일까, 전문가일까?",
      "purpose": "「나는 리더일까, 전문가일까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "팀을 이끄는 역할과 깊이 파는 역할 비교",
      "difference": "핵심 질문 「나는 리더일까, 전문가일까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "career_06"
      ],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0014",
        "CAREER-0015",
        "CAREER-0006"
      ],
      "core": false
    },
    {
      "id": "timeline_career_05",
      "topicId": "career",
      "title": "나에게 잘 맞는 업종과 맞지 않는 업종",
      "question": "나에게 잘 맞는 업종과 맞지 않는 업종",
      "purpose": "「나에게 잘 맞는 업종과 맞지 않는 업종」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "업종 이름보다 업무·고객·책임 구조를 대조",
      "difference": "핵심 질문 「나에게 잘 맞는 업종과 맞지 않는 업종」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "career_04",
        "deep_jobs"
      ],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0009",
        "CAREER-0010",
        "CAREER-0011",
        "CAREER-0012",
        "CAREER-0013"
      ],
      "core": false
    },
    {
      "id": "timeline_career_06",
      "topicId": "career",
      "title": "나는 어떤 직장 환경에서 성공할까?",
      "question": "나는 어떤 직장 환경에서 성공할까?",
      "purpose": "「나는 어떤 직장 환경에서 성공할까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "자율성·평가·지원이 맞는 직장을 비교",
      "difference": "핵심 질문 「나는 어떤 직장 환경에서 성공할까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "career_05"
      ],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0006",
        "CAREER-0007",
        "CAREER-0014"
      ],
      "core": false
    },
    {
      "id": "timeline_career_07",
      "topicId": "career",
      "title": "조직생활에서 내가 부딪히는 문제",
      "question": "조직생활에서 내가 부딪히는 문제",
      "purpose": "「조직생활에서 내가 부딪히는 문제」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "상사와 우선순위·권한이 충돌하는 회의",
      "difference": "핵심 질문 「조직생활에서 내가 부딪히는 문제」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "career_08"
      ],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0008",
        "CAREER-0006",
        "CAREER-0007"
      ],
      "core": false
    },
    {
      "id": "timeline_career_08",
      "topicId": "career",
      "title": "이직과 독립, 언제 움직이는 게 좋을까?",
      "question": "이직과 독립, 언제 움직이는 게 좋을까?",
      "purpose": "「이직과 독립, 언제 움직이는 게 좋을까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "퇴사 전 제안·현금 여유·운의 조건 점검",
      "difference": "핵심 질문 「이직과 독립, 언제 움직이는 게 좋을까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "career_09"
      ],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-C-transition",
        "D27-20261016-C-officer-output"
      ],
      "core": false
    },
    {
      "id": "timeline_career_09",
      "topicId": "career",
      "title": "창업과 사업에서 내가 조심해야 할 것",
      "question": "창업과 사업에서 내가 조심해야 할 것",
      "purpose": "「창업과 사업에서 내가 조심해야 할 것」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "창업 전 고객 검증·고정비·공동책임 점검",
      "difference": "핵심 질문 「창업과 사업에서 내가 조심해야 할 것」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "career_07"
      ],
      "order": 8,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0003",
        "CAREER-0007",
        "CAREER-0008"
      ],
      "core": false
    },
    {
      "id": "timeline_career_10",
      "topicId": "career",
      "title": "성공을 가로막는 나의 습관",
      "question": "성공을 가로막는 나의 습관",
      "purpose": "「성공을 가로막는 나의 습관」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "미루기·과잉 약속이 성과를 막는 상황",
      "difference": "핵심 질문 「성공을 가로막는 나의 습관」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 9,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0003",
        "CAREER-0008",
        "CAREER-0006",
        "CAREER-0007"
      ],
      "core": false
    },
    {
      "id": "timeline_career_11",
      "topicId": "career",
      "title": "최고의 커리어 시나리오 vs 최악의 커리어 시나리오",
      "question": "최고의 커리어 시나리오 vs 최악의 커리어 시나리오",
      "purpose": "「최고의 커리어 시나리오 vs 최악의 커리어 시나리오」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 같은 기질 → 유리한 조건 → 최고의 케이스 → 불리한 조건 → 최악의 케이스 → 결과를 가르는 선택·환경 → 현실 개선 전략. 범죄·파산·이혼·질병을 억지로 연결하지 않는다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "같은 독립성을 전문성에 쓸 때와 협업을 거부할 때 비교",
      "difference": "핵심 질문 「최고의 커리어 시나리오 vs 최악의 커리어 시나리오」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 10,
      "state": "draft",
      "sourceRuleIds": [
        "CAREER-0006",
        "CAREER-0007",
        "CAREER-0008"
      ],
      "core": false
    },
    {
      "id": "timeline_career_12",
      "topicId": "career",
      "title": "앞으로 10년, 나의 커리어 전략",
      "question": "앞으로 10년, 나의 커리어 전략",
      "purpose": "「앞으로 10년, 나의 커리어 전략」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "향후 10년 역량·이동·안정화 전략을 조건별로 정리",
      "difference": "핵심 질문 「앞으로 10년, 나의 커리어 전략」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "career_10"
      ],
      "order": 11,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-C-transition",
        "D27-20261016-C-officer-output"
      ],
      "core": false
    },
    {
      "id": "timeline_career_13",
      "topicId": "career",
      "title": "커리어운에서 나와 맞는 사람과 피해야 할 사람",
      "question": "커리어운에서 나와 맞는 사람과 피해야 할 사람",
      "purpose": "「커리어운에서 나와 맞는 사람과 피해야 할 사람」에 답한다. 커리어운 심화 장으로 계산값(용신·대운·월운)에 맞춰 사람·시기·행동을 구체적으로 말하고 사건을 단정하지 않는다.",
      "requiredEvidence": [
        "용신 오행",
        "일간의 힘"
      ],
      "example": "함께하면 힘이 나는 사람과 부딪히기 쉬운 사람의 차이 (커리어운)",
      "difference": "핵심 질문 「커리어운에서 나와 맞는 사람과 피해야 할 사람」에 한정하며 같은 탭의 다른 장 결론을 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "용신 오행 비교",
      "legacyIds": [],
      "order": 12,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-C-transition",
        "D27-20261016-C-officer-output"
      ],
      "core": false
    },
    {
      "id": "timeline_career_14",
      "topicId": "career",
      "title": "커리어운 타이밍: 힘이 실리는 때",
      "question": "커리어운 타이밍: 힘이 실리는 때",
      "purpose": "「커리어운 타이밍: 힘이 실리는 때」에 답한다. 커리어운 심화 장으로 계산값(용신·대운·월운)에 맞춰 사람·시기·행동을 구체적으로 말하고 사건을 단정하지 않는다.",
      "requiredEvidence": [
        "현재 대운 천간 십성",
        "대운표·월운 계산값"
      ],
      "example": "지금 10년과 다가오는 달 중 힘이 실리는 때 (커리어운)",
      "difference": "핵심 질문 「커리어운 타이밍: 힘이 실리는 때」에 한정하며 같은 탭의 다른 장 결론을 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "대운·월운 흐름 그래프",
      "legacyIds": [],
      "order": 13,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-C-transition",
        "D27-20261016-C-officer-output"
      ],
      "core": false
    },
    {
      "id": "timeline_career_15",
      "topicId": "career",
      "title": "커리어운을 끌어올리는 개운법",
      "question": "커리어운을 끌어올리는 개운법",
      "purpose": "「커리어운을 끌어올리는 개운법」에 답한다. 커리어운 심화 장으로 계산값(용신·대운·월운)에 맞춰 사람·시기·행동을 구체적으로 말하고 사건을 단정하지 않는다.",
      "requiredEvidence": [
        "용신 오행",
        "일간의 힘"
      ],
      "example": "이번 주부터 바꿀 수 있는 습관과 시기 (커리어운)",
      "difference": "핵심 질문 「커리어운을 끌어올리는 개운법」에 한정하며 같은 탭의 다른 장 결론을 반복하지 않는다.",
      "avoid": [
        "색·물건·방위 단정",
        "구매 권유",
        "결과 보장"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 14,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-C-transition",
        "D27-20261016-C-officer-output"
      ],
      "core": false
    },
    {
      "id": "timeline_love_01",
      "topicId": "love",
      "title": "나는 사람들과 어떤 관계를 맺을까?",
      "question": "나는 사람들과 어떤 관계를 맺을까?",
      "purpose": "「나는 사람들과 어떤 관계를 맺을까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "새 모임에서 친밀감과 거리를 정하는 방식",
      "difference": "핵심 질문 「나는 사람들과 어떤 관계를 맺을까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "relationships_03"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [
        "RELATIONSHIP-0009",
        "RELATIONSHIP-0010",
        "RELATIONSHIP-0011",
        "RELATIONSHIP-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_love_02",
      "topicId": "love",
      "title": "사람들이 나를 좋아하거나 불편해하는 이유",
      "question": "사람들이 나를 좋아하거나 불편해하는 이유",
      "purpose": "「사람들이 나를 좋아하거나 불편해하는 이유」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "상대에게 편안함과 부담을 주는 말의 차이",
      "difference": "핵심 질문 「사람들이 나를 좋아하거나 불편해하는 이유」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "relationships_01",
        "c11",
        "life_relation_style",
        "life_relation_timing"
      ],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [
        "RELATIONSHIP-0009",
        "RELATIONSHIP-0010",
        "RELATIONSHIP-0011",
        "RELATIONSHIP-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_love_03",
      "topicId": "love",
      "title": "내 곁에 남는 사람과 멀어지는 사람",
      "question": "내 곁에 남는 사람과 멀어지는 사람",
      "purpose": "「내 곁에 남는 사람과 멀어지는 사람」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "연락이 뜸해진 관계의 상호 노력 점검",
      "difference": "핵심 질문 「내 곁에 남는 사람과 멀어지는 사람」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "relationships_02"
      ],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [
        "RELATIONSHIP-0008",
        "RELATIONSHIP-0009",
        "RELATIONSHIP-0010"
      ],
      "core": false
    },
    {
      "id": "timeline_love_04",
      "topicId": "love",
      "title": "나는 사랑할 때 어떤 사람이 될까?",
      "question": "나는 사랑할 때 어떤 사람이 될까?",
      "purpose": "「나는 사랑할 때 어떤 사람이 될까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "애정 표현과 갈등 후 회복 방식을 비교",
      "difference": "핵심 질문 「나는 사랑할 때 어떤 사람이 될까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "love_01",
        "c09",
        "life_love_style",
        "life_love_timing",
        "life_marriage_who",
        "life_marriage_timing"
      ],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [
        "LOVE-0004",
        "LOVE-0005"
      ],
      "core": false
    },
    {
      "id": "timeline_love_05",
      "topicId": "love",
      "title": "내가 끌리는 사람과 실제 잘 맞는 사람",
      "question": "내가 끌리는 사람과 실제 잘 맞는 사람",
      "purpose": "「내가 끌리는 사람과 실제 잘 맞는 사람」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "강한 끌림과 생활 가치 합의의 차이",
      "difference": "핵심 질문 「내가 끌리는 사람과 실제 잘 맞는 사람」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "love_02",
        "love_03",
        "relationships_04",
        "c12"
      ],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [
        "LOVE-0008",
        "LOVE-0009",
        "LOVE-0010",
        "LOVE-0011",
        "LOVE-0012",
        "LOVE-0013",
        "LOVE-0014",
        "LOVE-0015",
        "LOVE-0016",
        "LOVE-0017"
      ],
      "core": false
    },
    {
      "id": "timeline_love_06",
      "topicId": "love",
      "title": "연애에서 반복하기 쉬운 실수",
      "question": "연애에서 반복하기 쉬운 실수",
      "purpose": "「연애에서 반복하기 쉬운 실수」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "불편한 감정을 미뤘다가 폭발하는 상황",
      "difference": "핵심 질문 「연애에서 반복하기 쉬운 실수」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "love_04",
        "love_10"
      ],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [
        "LOVE-0004",
        "LOVE-0005"
      ],
      "core": false
    },
    {
      "id": "timeline_love_07",
      "topicId": "love",
      "title": "나에게 잘 맞는 배우자의 성향",
      "question": "나에게 잘 맞는 배우자의 성향",
      "purpose": "「나에게 잘 맞는 배우자의 성향」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "생활 속도·경계·소통이 맞는 동반자 조건",
      "difference": "핵심 질문 「나에게 잘 맞는 배우자의 성향」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "love_06",
        "c10",
        "deep_spouse",
        "love_07"
      ],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-R-yong-0",
        "D27-20261016-R-yong-1",
        "D27-20261016-R-yong-2",
        "D27-20261016-R-yong-3",
        "D27-20261016-R-yong-4"
      ],
      "core": true
    },
    {
      "id": "timeline_love_08",
      "topicId": "love",
      "title": "결혼운은 언제 강해질까?",
      "question": "결혼운은 언제 강해질까?",
      "purpose": "「결혼운은 언제 강해질까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "인연 관련 시기 판단과 실제 결혼 결정을 구분",
      "difference": "핵심 질문 「결혼운은 언제 강해질까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "love_08"
      ],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-B-time-male-daewoon",
        "D27-20261016-B-time-male-seun",
        "D27-20261016-B-time-female-daewoon",
        "D27-20261016-B-time-female-seun"
      ],
      "core": false
    },
    {
      "id": "timeline_love_09",
      "topicId": "love",
      "title": "결혼생활에서 가장 조심해야 할 갈등",
      "question": "결혼생활에서 가장 조심해야 할 갈등",
      "purpose": "「결혼생활에서 가장 조심해야 할 갈등」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 배우자궁의 성별·위치 배속만으로 특정 부부 갈등, 상대의 경제 책임·가사 태도·관계 안정성을 추론하지 않는다. 위치 정보만으로 갈등을 알 수 없음을 결론에서 밝히고 가사·생활비·개인 시간 사례는 일반 대화 점검으로만 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "가사·생활비·개인 시간 합의가 깨지는 상황",
      "difference": "핵심 질문 「결혼생활에서 가장 조심해야 할 갈등」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "배우자궁의 성별·위치 배속만으로 특정 부부 갈등, 상대의 경제 책임·가사 태도·관계 안정성을 추론하지 않는다. 위치 정보만으로 갈등을 알 수 없음을 결론에서 밝히고 가사·생활비·개인 시간 사례는 일반 대화 점검으로만 구분한다."
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "love_05",
        "deep_love",
        "love_09",
        "deep_marriage",
        "relationships_05"
      ],
      "order": 8,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-B-male",
        "D27-20261016-B-female"
      ],
      "core": false
    },
    {
      "id": "timeline_love_10",
      "topicId": "love",
      "title": "나의 가족운과 부모·형제 관계",
      "question": "나의 가족운과 부모·형제 관계",
      "purpose": "「나의 가족운과 부모·형제 관계」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "부모·형제의 요청과 자신의 경계를 협의",
      "difference": "핵심 질문 「나의 가족운과 부모·형제 관계」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "relationships_06",
        "c13"
      ],
      "order": 9,
      "state": "draft",
      "sourceRuleIds": [
        "RELATIONSHIP-0018",
        "RELATIONSHIP-0025"
      ],
      "core": false
    },
    {
      "id": "timeline_love_11",
      "topicId": "love",
      "title": "나의 자식운과 부모가 되었을 때의 모습",
      "question": "나의 자식운과 부모가 되었을 때의 모습",
      "purpose": "「나의 자식운과 부모가 되었을 때의 모습」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "자녀 유무를 추정하지 않고 양육 가치관을 점검",
      "difference": "핵심 질문 「나의 자식운과 부모가 되었을 때의 모습」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "relationships_07",
        "deep_children"
      ],
      "order": 10,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-R-child-female",
        "D27-20261016-R-child-male"
      ],
      "core": false
    },
    {
      "id": "timeline_love_12",
      "topicId": "love",
      "title": "최고의 인연 시나리오 vs 최악의 인연 시나리오",
      "question": "최고의 인연 시나리오 vs 최악의 인연 시나리오",
      "purpose": "「최고의 인연 시나리오 vs 최악의 인연 시나리오」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 같은 기질 → 유리한 조건 → 최고의 케이스 → 불리한 조건 → 최악의 케이스 → 결과를 가르는 선택·환경 → 현실 개선 전략. 범죄·파산·이혼·질병을 억지로 연결하지 않는다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "같은 친밀 욕구가 배려와 간섭으로 갈리는 조건",
      "difference": "핵심 질문 「최고의 인연 시나리오 vs 최악의 인연 시나리오」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "love_11",
        "relationships_08"
      ],
      "order": 11,
      "state": "draft",
      "sourceRuleIds": [
        "RELATIONSHIP-0009",
        "RELATIONSHIP-0010",
        "RELATIONSHIP-0011",
        "RELATIONSHIP-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_love_13",
      "topicId": "love",
      "title": "인연운에서 나와 맞는 사람과 피해야 할 사람",
      "question": "인연운에서 나와 맞는 사람과 피해야 할 사람",
      "purpose": "「인연운에서 나와 맞는 사람과 피해야 할 사람」에 답한다. 인연운 심화 장으로 계산값(용신·대운·월운)에 맞춰 사람·시기·행동을 구체적으로 말하고 사건을 단정하지 않는다.",
      "requiredEvidence": [
        "용신 오행",
        "일간의 힘"
      ],
      "example": "함께하면 힘이 나는 사람과 부딪히기 쉬운 사람의 차이 (인연운)",
      "difference": "핵심 질문 「인연운에서 나와 맞는 사람과 피해야 할 사람」에 한정하며 같은 탭의 다른 장 결론을 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "용신 오행 비교",
      "legacyIds": [],
      "order": 12,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-B-time-male-daewoon",
        "D27-20261016-B-time-male-seun",
        "D27-20261016-B-time-female-daewoon",
        "D27-20261016-B-time-female-seun"
      ],
      "core": false
    },
    {
      "id": "timeline_love_14",
      "topicId": "love",
      "title": "인연운 타이밍: 힘이 실리는 때",
      "question": "인연운 타이밍: 힘이 실리는 때",
      "purpose": "「인연운 타이밍: 힘이 실리는 때」에 답한다. 인연운 심화 장으로 계산값(용신·대운·월운)에 맞춰 사람·시기·행동을 구체적으로 말하고 사건을 단정하지 않는다.",
      "requiredEvidence": [
        "현재 대운 천간 십성",
        "대운표·월운 계산값"
      ],
      "example": "지금 10년과 다가오는 달 중 힘이 실리는 때 (인연운)",
      "difference": "핵심 질문 「인연운 타이밍: 힘이 실리는 때」에 한정하며 같은 탭의 다른 장 결론을 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "대운·월운 흐름 그래프",
      "legacyIds": [],
      "order": 13,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-B-time-male-daewoon",
        "D27-20261016-B-time-male-seun",
        "D27-20261016-B-time-female-daewoon",
        "D27-20261016-B-time-female-seun"
      ],
      "core": false
    },
    {
      "id": "timeline_love_15",
      "topicId": "love",
      "title": "인연운을 끌어올리는 개운법",
      "question": "인연운을 끌어올리는 개운법",
      "purpose": "「인연운을 끌어올리는 개운법」에 답한다. 인연운 심화 장으로 계산값(용신·대운·월운)에 맞춰 사람·시기·행동을 구체적으로 말하고 사건을 단정하지 않는다.",
      "requiredEvidence": [
        "용신 오행",
        "일간의 힘"
      ],
      "example": "이번 주부터 바꿀 수 있는 습관과 시기 (인연운)",
      "difference": "핵심 질문 「인연운을 끌어올리는 개운법」에 한정하며 같은 탭의 다른 장 결론을 반복하지 않는다.",
      "avoid": [
        "색·물건·방위 단정",
        "구매 권유",
        "결과 보장"
      ],
      "targetMin": 500,
      "targetMax": 900,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 14,
      "state": "draft",
      "sourceRuleIds": [
        "D27-20261016-B-time-male-daewoon",
        "D27-20261016-B-time-male-seun",
        "D27-20261016-B-time-female-daewoon",
        "D27-20261016-B-time-female-seun"
      ],
      "core": false
    },
    {
      "id": "timeline_self_01",
      "topicId": "self",
      "title": "나는 어떤 사람으로 태어났을까?",
      "question": "나는 어떤 사람으로 태어났을까?",
      "purpose": "「나는 어떤 사람으로 태어났을까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "낯선 팀에서 첫 역할을 맡을 때의 반응",
      "difference": "핵심 질문 「나는 어떤 사람으로 태어났을까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_12",
        "c02",
        "life_tengods",
        "life_stars"
      ],
      "order": 0,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_self_04",
      "topicId": "self",
      "title": "나는 왜 이렇게 행동할까?",
      "question": "나는 왜 이렇게 행동할까?",
      "purpose": "「나는 왜 이렇게 행동할까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "마감 앞에서 먼저 행동하는 방식",
      "difference": "핵심 질문 「나는 왜 이렇게 행동할까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_03",
        "c03",
        "life_self_who"
      ],
      "order": 3,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012"
      ],
      "core": true
    },
    {
      "id": "timeline_self_05",
      "topicId": "self",
      "title": "남들이 보는 나와 진짜 나",
      "question": "남들이 보는 나와 진짜 나",
      "purpose": "「남들이 보는 나와 진짜 나」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 내면 몰입 근거만으로 타인이 보는 모습·외향성·겉과 속의 차이를 추정하지 않는다. 타인의 인식은 이 근거로 알 수 없음을 핵심 결론에서 밝히고, 실제 피드백과 내면 기록을 비교하는 일반 점검과 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "회의에서 보이는 모습과 혼자 결정할 때의 차이",
      "difference": "핵심 질문 「남들이 보는 나와 진짜 나」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "내면 몰입 근거만으로 타인이 보는 모습·외향성·겉과 속의 차이를 추정하지 않는다. 타인의 인식은 이 근거로 알 수 없음을 핵심 결론에서 밝히고, 실제 피드백과 내면 기록을 비교하는 일반 점검과 구분한다."
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_05"
      ],
      "order": 4,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0044"
      ],
      "core": false
    },
    {
      "id": "timeline_self_06",
      "topicId": "self",
      "title": "내가 타고난 가장 강력한 무기",
      "question": "내가 타고난 가장 강력한 무기",
      "purpose": "「내가 타고난 가장 강력한 무기」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "막힌 업무를 해결할 때 가장 먼저 쓰는 능력",
      "difference": "핵심 질문 「내가 타고난 가장 강력한 무기」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_08",
        "c04",
        "deep_proscons"
      ],
      "order": 5,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_self_07",
      "topicId": "self",
      "title": "나의 약점과 그림자",
      "question": "나의 약점과 그림자",
      "purpose": "「나의 약점과 그림자」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "강점이 지나쳐 주변을 지치게 하는 순간",
      "difference": "핵심 질문 「나의 약점과 그림자」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_09",
        "c05"
      ],
      "order": 6,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0064"
      ],
      "core": false
    },
    {
      "id": "timeline_self_08",
      "topicId": "self",
      "title": "내가 숨기고 있는 욕망",
      "question": "내가 숨기고 있는 욕망",
      "purpose": "「내가 숨기고 있는 욕망」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "보상과 인정 중 무엇을 먼저 고르는지",
      "difference": "핵심 질문 「내가 숨기고 있는 욕망」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_11"
      ],
      "order": 7,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0019",
        "SELF-0029",
        "SELF-0064"
      ],
      "core": false
    },
    {
      "id": "timeline_self_09",
      "topicId": "self",
      "title": "나는 무엇에 유독 예민할까?",
      "question": "나는 무엇에 유독 예민할까?",
      "purpose": "「나는 무엇에 유독 예민할까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "갑작스러운 일정 변경에 예민해지는 조건",
      "difference": "핵심 질문 「나는 무엇에 유독 예민할까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_06"
      ],
      "order": 8,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0011",
        "SELF-0012",
        "SELF-0034"
      ],
      "core": false
    },
    {
      "id": "timeline_self_10",
      "topicId": "self",
      "title": "내가 스트레스를 받는 진짜 이유",
      "question": "내가 스트레스를 받는 진짜 이유",
      "purpose": "「내가 스트레스를 받는 진짜 이유」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "통제할 수 없는 요청이 겹치는 상황",
      "difference": "핵심 질문 「내가 스트레스를 받는 진짜 이유」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 9,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0011",
        "SELF-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_self_11",
      "topicId": "self",
      "title": "나도 몰랐던 숨겨진 재능",
      "question": "나도 몰랐던 숨겨진 재능",
      "purpose": "「나도 몰랐던 숨겨진 재능」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "익숙하지 않은 과제에서 드러나는 능력",
      "difference": "핵심 질문 「나도 몰랐던 숨겨진 재능」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 10,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0025",
        "SELF-0036",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_self_12",
      "topicId": "self",
      "title": "내가 반복하기 쉬운 실수",
      "question": "내가 반복하기 쉬운 실수",
      "purpose": "「내가 반복하기 쉬운 실수」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "피드백을 받고도 같은 선택을 반복하는 순간",
      "difference": "핵심 질문 「내가 반복하기 쉬운 실수」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_10"
      ],
      "order": 11,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0009",
        "SELF-0010",
        "SELF-0012",
        "SELF-0064"
      ],
      "core": false
    },
    {
      "id": "timeline_self_13",
      "topicId": "self",
      "title": "나는 어떤 환경에서 가장 빛날까?",
      "question": "나는 어떤 환경에서 가장 빛날까?",
      "purpose": "「나는 어떤 환경에서 가장 빛날까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "자율성과 지원이 충분한 작업 환경",
      "difference": "핵심 질문 「나는 어떤 환경에서 가장 빛날까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_13"
      ],
      "order": 12,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0001",
        "SELF-0002",
        "SELF-0003",
        "SELF-0004",
        "SELF-0071"
      ],
      "core": false
    },
    {
      "id": "timeline_self_14",
      "topicId": "self",
      "title": "나에게 독이 되는 환경",
      "question": "나에게 독이 되는 환경",
      "purpose": "「나에게 독이 되는 환경」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "과도한 간섭과 역할 모호성이 겹치는 환경",
      "difference": "핵심 질문 「나에게 독이 되는 환경」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 13,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0011",
        "SELF-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_self_15",
      "topicId": "self",
      "title": "위기가 닥쳤을 때 드러나는 모습",
      "question": "위기가 닥쳤을 때 드러나는 모습",
      "purpose": "「위기가 닥쳤을 때 드러나는 모습」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "계획이 무너졌을 때의 첫 대응",
      "difference": "핵심 질문 「위기가 닥쳤을 때 드러나는 모습」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "self_07"
      ],
      "order": 14,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0010",
        "SELF-0011",
        "SELF-0064"
      ],
      "core": false
    },
    {
      "id": "timeline_self_16",
      "topicId": "self",
      "title": "나를 성장시키는 경쟁과 압박",
      "question": "나를 성장시키는 경쟁과 압박",
      "purpose": "「나를 성장시키는 경쟁과 압박」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "동료와 비교되는 목표를 받는 상황",
      "difference": "핵심 질문 「나를 성장시키는 경쟁과 압박」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 15,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0011",
        "SELF-0064"
      ],
      "core": false
    },
    {
      "id": "timeline_self_17",
      "topicId": "self",
      "title": "나의 가장 강한 생존 능력",
      "question": "나의 가장 강한 생존 능력",
      "purpose": "「나의 가장 강한 생존 능력」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "자원이 부족할 때 우선순위를 정하는 방식",
      "difference": "핵심 질문 「나의 가장 강한 생존 능력」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 16,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0044"
      ],
      "core": false
    },
    {
      "id": "timeline_self_19",
      "topicId": "self",
      "title": "내 사주의 가장 큰 모순",
      "question": "내 사주의 가장 큰 모순",
      "purpose": "「내 사주의 가장 큰 모순」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "안정을 바라면서 변화를 선택하는 갈등",
      "difference": "핵심 질문 「내 사주의 가장 큰 모순」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 18,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_self_21",
      "topicId": "self",
      "title": "앞으로 10년, 무엇이 달라질까?",
      "question": "앞으로 10년, 무엇이 달라질까?",
      "purpose": "「앞으로 10년, 무엇이 달라질까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "향후 10개 연도의 계산과 승인된 시기 판단을 구분",
      "difference": "핵심 질문 「앞으로 10년, 무엇이 달라질까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 20,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-T-peerS",
        "D27-20261016-T-outputS",
        "D27-20261016-T-wealthS",
        "D27-20261016-T-officerS",
        "D27-20261016-T-resourceS"
      ],
      "core": true
    },
    {
      "id": "timeline_health_01",
      "topicId": "health",
      "title": "내 사주에서 보는 건강의 기본 균형",
      "question": "내 사주에서 보는 건강의 기본 균형",
      "purpose": "「내 사주에서 보는 건강의 기본 균형」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "오행 상징과 실제 건강 상태를 구분",
      "difference": "핵심 질문 「내 사주에서 보는 건강의 기본 균형」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 0,
      "state": "archived",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timeline_health_02",
      "topicId": "health",
      "title": "나는 어떤 상황에서 쉽게 지칠까?",
      "question": "나는 어떤 상황에서 쉽게 지칠까?",
      "purpose": "「나는 어떤 상황에서 쉽게 지칠까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "업무·이동·돌봄 일정이 겹쳐 지치는 상황",
      "difference": "핵심 질문 「나는 어떤 상황에서 쉽게 지칠까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 1,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-A-rest"
      ],
      "core": false
    },
    {
      "id": "timeline_health_03",
      "topicId": "health",
      "title": "스트레스가 쌓일 때 나타나는 생활 패턴",
      "question": "스트레스가 쌓일 때 나타나는 생활 패턴",
      "purpose": "「스트레스가 쌓일 때 나타나는 생활 패턴」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "스트레스 뒤 수면·식사·휴식 기록 비교",
      "difference": "핵심 질문 「스트레스가 쌓일 때 나타나는 생활 패턴」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [
        "health_02"
      ],
      "order": 2,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-A-rest"
      ],
      "core": false
    },
    {
      "id": "timeline_health_04",
      "topicId": "health",
      "title": "내가 무리하기 쉬운 순간",
      "question": "내가 무리하기 쉬운 순간",
      "purpose": "「내가 무리하기 쉬운 순간」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "성과를 위해 휴식 신호를 무시하는 순간",
      "difference": "핵심 질문 「내가 무리하기 쉬운 순간」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 3,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-A-health-year"
      ],
      "core": false
    },
    {
      "id": "timeline_health_05",
      "topicId": "health",
      "title": "내 생활 리듬에서 조심할 점",
      "question": "내 생활 리듬에서 조심할 점",
      "purpose": "「내 생활 리듬에서 조심할 점」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "수면 시간이 일정하지 않은 한 주 점검",
      "difference": "핵심 질문 「내 생활 리듬에서 조심할 점」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [
        "health_03"
      ],
      "order": 4,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-A-rest"
      ],
      "core": false
    },
    {
      "id": "timeline_health_06",
      "topicId": "health",
      "title": "전통 명리학에서 보는 사고수란?",
      "question": "전통 명리학에서 보는 사고수란?",
      "purpose": "「전통 명리학에서 보는 사고수란?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "전통적인 주의 개념과 사고 확률을 구분",
      "difference": "핵심 질문 「전통 명리학에서 보는 사고수란?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 5,
      "state": "archived",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timeline_health_07",
      "topicId": "health",
      "title": "사고수와 주의 시기를 어떻게 해석할까?",
      "question": "사고수와 주의 시기를 어떻게 해석할까?",
      "purpose": "「사고수와 주의 시기를 어떻게 해석할까?」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다. 사고수는 전통 운세의 주의 개념이며 실제 사고 위험 가능성·확률을 알려 주지 않는다. 편관 세운의 과제·피로 언급은 생활 일정 점검의 참고로만 읽고 실제 건강 상태·사고 증가·피로 발생을 개인 예측하지 않는다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처",
        "대운·세운 계산과 해당 시기 조건이 충족된 승인 판단 (계산값만으로 사건 추론 금지)"
      ],
      "example": "주의 기간 해석을 운전·작업 안전 점검에 연결",
      "difference": "핵심 질문 「사고수와 주의 시기를 어떻게 해석할까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현",
        "사고수는 전통 운세의 주의 개념이며 실제 사고 위험 가능성·확률을 알려 주지 않는다. 편관 세운의 과제·피로 언급은 생활 일정 점검의 참고로만 읽고 실제 건강 상태·사고 증가·피로 발생을 개인 예측하지 않는다."
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [
        "health_04"
      ],
      "order": 6,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-A-health-year"
      ],
      "core": false
    },
    {
      "id": "timeline_health_08",
      "topicId": "health",
      "title": "무리한 선택이 위험을 키우는 상황",
      "question": "무리한 선택이 위험을 키우는 상황",
      "purpose": "「무리한 선택이 위험을 키우는 상황」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "피로한 상태에서 무리한 이동을 결정하는 상황",
      "difference": "핵심 질문 「무리한 선택이 위험을 키우는 상황」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 7,
      "state": "archived",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timeline_health_09",
      "topicId": "health",
      "title": "건강과 안전을 지키는 생활 습관",
      "question": "건강과 안전을 지키는 생활 습관",
      "purpose": "「건강과 안전을 지키는 생활 습관」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "수면·휴식·운동·검진 계획을 점검",
      "difference": "핵심 질문 「건강과 안전을 지키는 생활 습관」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [
        "health_05"
      ],
      "order": 8,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-A-rest"
      ],
      "core": false
    },
    {
      "id": "timeline_health_10",
      "topicId": "health",
      "title": "최고의 건강관리 시나리오 vs 최악의 관리 시나리오",
      "question": "최고의 건강관리 시나리오 vs 최악의 관리 시나리오",
      "purpose": "「최고의 건강관리 시나리오 vs 최악의 관리 시나리오」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 사고수는 전통 운세의 주의 개념이다. 증상이 있으면 의료기관 진료를 우선하며 수면·과로 방지·교통안전 등 예방 행동을 제시한다. 같은 기질 → 유리한 조건 → 최고의 케이스 → 불리한 조건 → 최악의 케이스 → 결과를 가르는 선택·환경 → 현실 개선 전략. 범죄·파산·이혼·질병을 억지로 연결하지 않는다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "같은 책임감을 휴식 계획과 과로에 쓸 때 비교",
      "difference": "핵심 질문 「최고의 건강관리 시나리오 vs 최악의 관리 시나리오」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "질병·암·수술·사망·교통사고 발생 예측",
        "사고 확률이나 신체 진단으로 오인할 표현"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 9,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-A-rest"
      ],
      "core": false
    },
    {
      "id": "timeline_creative_01",
      "topicId": "creative",
      "title": "전생의 문이 열리다",
      "question": "전생의 문이 열리다",
      "purpose": "8장 중 1장: 전생의 문이 열리다. 앞 장의 인물·사건·선택을 이어받고 다음 장의 변화로 연결하는 창작 판타지.",
      "requiredEvidence": [
        "계산된 사주 상징 (창작 모티브)",
        "앞뒤 장면의 인물·사건·선택 일관성"
      ],
      "example": "현실의 이름을 지닌 주인공이 문을 넘어가는 도입",
      "difference": "핵심 질문 「전생의 문이 열리다」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·영상과 연결된 서사 장면",
      "legacyIds": [],
      "order": 0,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0017",
        "SELF-0019",
        "SELF-0025",
        "SELF-0029",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_creative_02",
      "topicId": "creative",
      "title": "나는 어떤 시대에 살았을까?",
      "question": "나는 어떤 시대에 살았을까?",
      "purpose": "8장 중 2장: 나는 어떤 시대에 살았을까?. 앞 장의 인물·사건·선택을 이어받고 다음 장의 변화로 연결하는 창작 판타지.",
      "requiredEvidence": [
        "계산된 사주 상징 (창작 모티브)",
        "앞뒤 장면의 인물·사건·선택 일관성"
      ],
      "example": "앞 장의 문 너머 시대와 세계의 규칙을 발견",
      "difference": "핵심 질문 「나는 어떤 시대에 살았을까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·영상과 연결된 서사 장면",
      "legacyIds": [
        "creative_03"
      ],
      "order": 1,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0017",
        "SELF-0019",
        "SELF-0025",
        "SELF-0029",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_creative_03",
      "topicId": "creative",
      "title": "전생의 나는 어떤 신분이었을까?",
      "question": "전생의 나는 어떤 신분이었을까?",
      "purpose": "8장 중 3장: 전생의 나는 어떤 신분이었을까?. 앞 장의 인물·사건·선택을 이어받고 다음 장의 변화로 연결하는 창작 판타지.",
      "requiredEvidence": [
        "계산된 사주 상징 (창작 모티브)",
        "앞뒤 장면의 인물·사건·선택 일관성"
      ],
      "example": "그 세계에서 맡은 신분과 책임이 드러남",
      "difference": "핵심 질문 「전생의 나는 어떤 신분이었을까?」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·영상과 연결된 서사 장면",
      "legacyIds": [
        "creative_02"
      ],
      "order": 2,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0017",
        "SELF-0019",
        "SELF-0025",
        "SELF-0029",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_creative_04",
      "topicId": "creative",
      "title": "전생에서 가장 중요했던 사람",
      "question": "전생에서 가장 중요했던 사람",
      "purpose": "8장 중 4장: 전생에서 가장 중요했던 사람. 앞 장의 인물·사건·선택을 이어받고 다음 장의 변화로 연결하는 창작 판타지.",
      "requiredEvidence": [
        "계산된 사주 상징 (창작 모티브)",
        "앞뒤 장면의 인물·사건·선택 일관성"
      ],
      "example": "주인공의 선택을 바꾸는 한 사람과 만남",
      "difference": "핵심 질문 「전생에서 가장 중요했던 사람」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·영상과 연결된 서사 장면",
      "legacyIds": [],
      "order": 3,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0017",
        "SELF-0019",
        "SELF-0025",
        "SELF-0029",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_creative_05",
      "topicId": "creative",
      "title": "전생에서 가장 빛났던 순간",
      "question": "전생에서 가장 빛났던 순간",
      "purpose": "8장 중 5장: 전생에서 가장 빛났던 순간. 앞 장의 인물·사건·선택을 이어받고 다음 장의 변화로 연결하는 창작 판타지.",
      "requiredEvidence": [
        "계산된 사주 상징 (창작 모티브)",
        "앞뒤 장면의 인물·사건·선택 일관성"
      ],
      "example": "앞 장의 관계를 통해 능력이 빛나는 사건",
      "difference": "핵심 질문 「전생에서 가장 빛났던 순간」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·영상과 연결된 서사 장면",
      "legacyIds": [
        "creative_04"
      ],
      "order": 4,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0017",
        "SELF-0019",
        "SELF-0025",
        "SELF-0029",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_creative_06",
      "topicId": "creative",
      "title": "전생에서 저질렀던 가장 큰 실수",
      "question": "전생에서 저질렀던 가장 큰 실수",
      "purpose": "8장 중 6장: 전생에서 저질렀던 가장 큰 실수. 앞 장의 인물·사건·선택을 이어받고 다음 장의 변화로 연결하는 창작 판타지.",
      "requiredEvidence": [
        "계산된 사주 상징 (창작 모티브)",
        "앞뒤 장면의 인물·사건·선택 일관성"
      ],
      "example": "같은 능력을 지나치게 써 돌이킬 수 없는 실수",
      "difference": "핵심 질문 「전생에서 저질렀던 가장 큰 실수」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·영상과 연결된 서사 장면",
      "legacyIds": [],
      "order": 5,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0017",
        "SELF-0019",
        "SELF-0025",
        "SELF-0029",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_creative_07",
      "topicId": "creative",
      "title": "끝내 이루지 못한 소망",
      "question": "끝내 이루지 못한 소망",
      "purpose": "8장 중 7장: 끝내 이루지 못한 소망. 앞 장의 인물·사건·선택을 이어받고 다음 장의 변화로 연결하는 창작 판타지.",
      "requiredEvidence": [
        "계산된 사주 상징 (창작 모티브)",
        "앞뒤 장면의 인물·사건·선택 일관성"
      ],
      "example": "실수 뒤 남은 소망을 선택과 대가로 드러냄",
      "difference": "핵심 질문 「끝내 이루지 못한 소망」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·영상과 연결된 서사 장면",
      "legacyIds": [],
      "order": 6,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0017",
        "SELF-0019",
        "SELF-0025",
        "SELF-0029",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_creative_08",
      "topicId": "creative",
      "title": "전생의 나에게서 받는 마지막 메시지",
      "question": "전생의 나에게서 받는 마지막 메시지",
      "purpose": "8장 중 8장: 전생의 나에게서 받는 마지막 메시지. 앞 장의 인물·사건·선택을 이어받고 다음 장의 변화로 연결하는 창작 판타지.",
      "requiredEvidence": [
        "계산된 사주 상징 (창작 모티브)",
        "앞뒤 장면의 인물·사건·선택 일관성"
      ],
      "example": "앞선 사건의 갈등을 마무리하고 현재에 메시지를 전함",
      "difference": "핵심 질문 「전생의 나에게서 받는 마지막 메시지」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·영상과 연결된 서사 장면",
      "legacyIds": [],
      "order": 7,
      "state": "archived",
      "sourceRuleIds": [
        "SELF-0005",
        "SELF-0006",
        "SELF-0007",
        "SELF-0009",
        "SELF-0010",
        "SELF-0011",
        "SELF-0012",
        "SELF-0017",
        "SELF-0019",
        "SELF-0025",
        "SELF-0029",
        "SELF-0031",
        "SELF-0040",
        "SELF-0041"
      ],
      "core": false
    },
    {
      "id": "timeline_remedy_01",
      "topicId": "remedy",
      "title": "내 운을 바꾸는 첫 번째 습관",
      "question": "내 운을 바꾸는 첫 번째 습관",
      "purpose": "「내 운을 바꾸는 첫 번째 습관」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "내일부터 관찰할 작은 행동 하나를 정하기",
      "difference": "핵심 질문 「내 운을 바꾸는 첫 번째 습관」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 0,
      "state": "archived",
      "sourceRuleIds": [
        "ACTION-0011",
        "ACTION-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_remedy_02",
      "topicId": "remedy",
      "title": "나에게 맞는 운동과 생활 리듬",
      "question": "나에게 맞는 운동과 생활 리듬",
      "purpose": "「나에게 맞는 운동과 생활 리듬」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "선호·제약에 맞춰 운동과 취침 시간을 조정",
      "difference": "핵심 질문 「나에게 맞는 운동과 생활 리듬」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 1,
      "state": "archived",
      "sourceRuleIds": [
        "ACTION-0011",
        "ACTION-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_remedy_03",
      "topicId": "remedy",
      "title": "나에게 잘 맞는 공부와 자기계발",
      "question": "나에게 잘 맞는 공부와 자기계발",
      "purpose": "「나에게 잘 맞는 공부와 자기계발」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "관심 직무에 필요한 학습을 주간 계획으로 분할",
      "difference": "핵심 질문 「나에게 잘 맞는 공부와 자기계발」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [
        "remedy_04"
      ],
      "order": 2,
      "state": "archived",
      "sourceRuleIds": [
        "ACTION-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_remedy_04",
      "topicId": "remedy",
      "title": "나를 회복시키는 환경과 공간",
      "question": "나를 회복시키는 환경과 공간",
      "purpose": "「나를 회복시키는 환경과 공간」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "집·일터에서 소음·빛·휴식 공간을 점검",
      "difference": "핵심 질문 「나를 회복시키는 환경과 공간」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [
        "remedy_02"
      ],
      "order": 3,
      "state": "archived",
      "sourceRuleIds": [
        "ACTION-0011",
        "ACTION-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_remedy_05",
      "topicId": "remedy",
      "title": "나에게 어울리는 행운의 장소",
      "question": "나에게 어울리는 행운의 장소",
      "purpose": "「나에게 어울리는 행운의 장소」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "지역·접근성·선호를 확인한 뒤 공원·도서관 유형 제안",
      "difference": "핵심 질문 「나에게 어울리는 행운의 장소」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 4,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-A-place-0",
        "D27-20261016-A-place-1",
        "D27-20261016-A-place-2",
        "D27-20261016-A-place-3",
        "D27-20261016-A-place-4"
      ],
      "core": false
    },
    {
      "id": "timeline_remedy_06",
      "topicId": "remedy",
      "title": "돈과 인간관계에서 운을 지키는 방법",
      "question": "돈과 인간관계에서 운을 지키는 방법",
      "purpose": "「돈과 인간관계에서 운을 지키는 방법」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "계약·지출·연락의 점검 시간을 정하기",
      "difference": "핵심 질문 「돈과 인간관계에서 운을 지키는 방법」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 5,
      "state": "archived",
      "sourceRuleIds": [
        "ACTION-0011",
        "ACTION-0012"
      ],
      "core": false
    },
    {
      "id": "timeline_remedy_07",
      "topicId": "remedy",
      "title": "앞으로 30일, 나만의 개운 프로젝트",
      "question": "앞으로 30일, 나만의 개운 프로젝트",
      "purpose": "「앞으로 30일, 나만의 개운 프로젝트」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "30일을 시작·실천·회고·조정의 네 구간으로 나누기",
      "difference": "핵심 질문 「앞으로 30일, 나만의 개운 프로젝트」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 6,
      "state": "archived",
      "sourceRuleIds": [
        "D27-20261016-A-year-peer",
        "D27-20261016-A-year-output",
        "D27-20261016-A-year-wealth",
        "D27-20261016-A-year-officer",
        "D27-20261016-A-year-resource"
      ],
      "core": false
    },
    {
      "id": "timeline_remedy_08",
      "topicId": "remedy",
      "title": "내 인생을 더 좋은 방향으로 이끄는 최종 전략",
      "question": "내 인생을 더 좋은 방향으로 이끄는 최종 전략",
      "purpose": "「내 인생을 더 좋은 방향으로 이끄는 최종 전략」에 먼저 답하고 장점·약점·적용 조건·예외를 구분한다. 같은 기질 → 유리한 조건 → 최고의 케이스 → 불리한 조건 → 최악의 케이스 → 결과를 가르는 선택·환경 → 현실 개선 전략. 범죄·파산·이혼·질병을 억지로 연결하지 않는다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "강점 발현 조건과 취약 신호를 실행·중단 기준으로 통합",
      "difference": "핵심 질문 「내 인생을 더 좋은 방향으로 이끄는 최종 전략」의 판단과 행동에 한정하며 다른 장의 결론·사례를 반복하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 7,
      "state": "archived",
      "sourceRuleIds": [
        "ACTION-0011",
        "ACTION-0012"
      ],
      "core": false
    }
  ],
  "cases": []
};
var QUESTIONS={
 income:{label:'현재 소득 형태',options:{salary:'직장 급여',business:'사업·프리랜서',mixed:'여러 소득',none:'현재 소득 없음'}},
 moneyFocus:{label:'돈과 관련된 관심사',options:{saving:'저축·축적',debt:'부채·고정비',sales:'매출·대금 회수',investing:'투자 판단'}},
 relationship:{label:'현재 관계 상태',options:{single:'현재 연애하지 않음',dating:'연애 중',partnered:'배우자·동반자 관계',private:'말하고 싶지 않음'}},
 loveFocus:{label:'관계에서의 관심사',options:{meeting:'새로운 만남',communication:'대화·갈등',marriage:'결혼·생활 합의',boundaries:'거리·경계'}},
 work:{label:'현재 일하는 형태',options:{employee:'조직 근무',independent:'독립·사업',student:'학업·준비',break:'휴식·구직'}},
 careerFocus:{label:'직업에서의 관심사',options:{change:'이직',startup:'창업',promotion:'승진·책임',skill:'전문성·경력'}}
};
function clone(x){return JSON.parse(JSON.stringify(x));}
function defaults(){return clone(SEED);}
function cleanContext(raw){var out={};Object.keys(QUESTIONS).forEach(function(k){if(raw && Object.prototype.hasOwnProperty.call(QUESTIONS[k].options,raw[k]) && raw[k]!=='private')out[k]=raw[k];});return out;}
function contextLabels(raw){var c=cleanContext(raw);return Object.keys(c).map(function(k){return {field:k,label:QUESTIONS[k].label,value:c[k],text:QUESTIONS[k].options[c[k]],source:'user-provided'};});}
function find(catalog,chapter){var id=chapter && chapter.id,base=chapter && chapter.base,rows=catalog.chapters || [];return rows.find(function(c){return c.state!=='archived' && c.id===id;}) || rows.find(function(c){return c.state!=='archived' && (c.legacyIds.indexOf(id)>=0 || c.legacyIds.indexOf(base)>=0);}) || rows.find(function(c){return c.id===id;}) || rows.find(function(c){return c.legacyIds.indexOf(id)>=0 || c.legacyIds.indexOf(base)>=0;}) || null;}
function instruction(c){if(!c)return '';return '[개별 챕터 계약]\n핵심 질문: '+c.question+'\n목표: '+c.purpose+'\n근거 검토: '+c.requiredEvidence.join(' / ')+'\n현실 장면: '+c.example+'\n차별점: '+c.difference+'\n반복 금지: '+c.avoid.join(' / ')+'\n목표 '+c.targetMin+'~'+c.targetMax+'자. 근거가 부족하면 분량을 채우지 않는다. 첫 문장은 핵심 질문에 답하고 장점·취약점·반대 조건·관찰 가능한 전략으로 확장한다. 사례는 가정이며 사용자의 실제 경험으로 쓰지 않는다.';}

function generationChapter(existing,c,sd){
 var R=root.ReportV2,sections={self:1,wealth:5,career:4,love:6,relationships:7,timing:11,health:8,creative:7,remedy:14},i=sections[c.topicId]==null?1:sections[c.topicId],basic=R.ReadingFlow.card(sd,i),core={};
 R.ReadingFlow.FIELDS.forEach(function(f){core[f[0]]=f[0]==='why'?basic.why:'';});
 var oldScenes=(existing && existing.scenes || []).filter(function(scene){return !scene.readingRole;}).map(function(scene){return Object.assign({},scene,{readingSupplementary:true,readingInline:!!scene.readingInline || /^ci-/.test(scene.sceneId || '')});});
 var id=existing?existing.id:c.id;
 return Object.assign({},existing || {},{id:id,base:existing?existing.base:c.id,title:c.title,act:existing?existing.act:i+1,kind:'life',aiEnabled:true,readingSupplementary:false,readingCore:core,readingSection:i+1,editorialContractId:c.id,editorialTopicId:c.topicId,editorialDraft:true,readingDeferred:true,readingNotice:'검수된 문안을 불러오고 있습니다. 잠시만 기다려 주세요.',scenes:[{sceneId:id+'_editorial_header',sceneType:'chapterIntro',compact:true}].concat(R.ReadingFlow.scenes(core,id)).concat([{sceneId:id+'_editorial_end',sceneType:'chapterEnding'}]).concat(oldScenes)});
}
// 저장된 카탈로그의 이름이 옛 이름이면 화면에서는 새 이름으로 덮어쓴다(운영 카탈로그를 다시 게시하기 전까지).
var TITLE_OVERRIDE={timeline_self_28:'대인관계 궁합'};
function retitle(catalog){return Object.assign({},catalog,{chapters:(catalog.chapters || []).map(function(c){return TITLE_OVERRIDE[c.id]?Object.assign({},c,{title:TITLE_OVERRIDE[c.id],question:TITLE_OVERRIDE[c.id]}):c;})});}
function prepare(rep,published,sd){
 var source=(rep.chapters || []).slice(),catalog=retitle(published || defaults()),seed=defaults(),active=(catalog.chapters || []).filter(function(c){return c.state==='active'&&catalog.topics.some(function(t){return t.id===c.topicId&&t.enabled;});}),out=[],archive=[];
 if(active.some(function(c){return /^timeline_/.test(c.id);})){
 var ordered=active.slice().sort(function(a,b){var ta=catalog.topics.find(function(t){return t.id===a.topicId;}),tb=catalog.topics.find(function(t){return t.id===b.topicId;});return ta.order-tb.order || a.order-b.order;});
 var used={};var chapters=ordered.map(function(c){var originals=source.filter(function(x){return c.legacyIds.indexOf(x.id)>=0 || c.legacyIds.indexOf(x.base)>=0;});originals.forEach(function(x){used[x.id]=true;});var primary=originals[0];if(primary)primary=Object.assign({},primary,{scenes:originals.reduce(function(all,x){return all.concat(x.scenes || []);},[])});var ch=generationChapter(primary,c,sd);ch.legacyIds=c.legacyIds.slice();ch.editorialSequence=c.order;ch.editorialContractId=c.id;return ch;});
 var topics=catalog.topics.filter(function(t){return t.enabled;}).sort(function(a,b){return a.order-b.order;});chapters.forEach(function(c,i){c.no=i+1;c.act=topics.findIndex(function(t){return t.id===c.editorialTopicId;})+1;});
 return Object.assign({},rep,{chapters:chapters,editorialArchive:source,editorialTopics:topics,editorialVersion:catalog.version,acts:topics.map(function(t,i){return {id:i+1,title:t.title,roman:'제'+(i+1)+'부',line:'',pdfDone:''};})});
 }
 var primaries={};active.forEach(function(c){var primary=source.find(function(x){return x.id===c.id;}) || c.legacyIds.map(function(id){return source.find(function(x){return x.id===id;});}).find(Boolean);if(primary)primaries[c.id]=primary.id;});
 source.forEach(function(c){var saved=find(catalog,c),contract=saved && saved.state==='active'?saved:find(seed,c);if(saved && (saved.state==='archived'||saved.state==='active'&&catalog.topics.some(function(t){return t.id===saved.topicId&&!t.enabled;}))){archive.push(c);return;}
  if(published && contract && catalog.topics.some(function(t){return t.id===contract.topicId&&!t.enabled;})){archive.push(c);return;}
  var next=Object.assign({},c);if(contract){next.editorialContractId=contract.id;next.editorialTopicId=contract.topicId;if(saved && saved.state==='active' && primaries[saved.id]===c.id)next=generationChapter(next,saved,sd);}out.push(next);
 });
 active.forEach(function(c){if(source.some(function(old){return old.id===c.id || c.legacyIds.indexOf(old.id)>=0 || c.legacyIds.indexOf(old.base)>=0;}))return;
  var ch=generationChapter(null,c,sd);
  out.push(ch);
 });
 var acts=rep.acts;
 if(catalog.version>0){
  var ordered=catalog.topics.filter(function(t){return t.enabled;}).slice().sort(function(a,b){return a.order-b.order;}),topicOrder={},chapterOrder={};ordered.forEach(function(t,i){topicOrder[t.id]=i;});(catalog.chapters || []).forEach(function(c){chapterOrder[c.id]=c.order;});
  var originalOrder={};out.forEach(function(c,i){originalOrder[c.id]=i;});
  out.sort(function(a,b){if(a.id==='c-char')return -1;if(b.id==='c-char')return 1;var ta=topicOrder[a.editorialTopicId],tb=topicOrder[b.editorialTopicId],ca=chapterOrder[a.editorialContractId],cb=chapterOrder[b.editorialContractId];return (ta==null?999:ta)-(tb==null?999:tb)||(ca==null?999:ca)-(cb==null?999:cb)||originalOrder[a.id]-originalOrder[b.id];});
  acts=ordered.map(function(t,i){return {id:i+1,title:t.title,roman:'제'+(i+1)+'부',line:'',pdfDone:''};});
  if(out.some(function(c){return topicOrder[c.editorialTopicId]==null;}))acts.push({id:ordered.length+1,title:'기존 추가 콘텐츠',roman:'추가',line:'',pdfDone:''});
  out=out.map(function(c){var i=topicOrder[c.editorialTopicId];return Object.assign({},c,{act:i==null?ordered.length+1:i+1});});
 }
 out=out.map(function(c,i){return Object.assign({},c,{no:i+1});});
 return Object.assign({},rep,{acts:acts},{chapters:out,editorialArchive:archive,editorialTopics:catalog.topics,editorialVersion:catalog.version || 0});
}
// Pure proposal: existing rows and approvals are retained; nothing is written here.
function upgrade(current){
 var next=defaults();if(!current)return next;next.version=current.version || 0;next.cases=clone(current.cases || []);
 (current.chapters || []).forEach(function(old){var target=find(next,old);if(target){target.sourceRuleIds=Array.from(new Set(target.sourceRuleIds.concat(old.sourceRuleIds || [])));}if(!next.chapters.some(function(c){return c.id===old.id;}))next.chapters.push(Object.assign({},clone(old),{state:'archived'}));});
 (current.topics || []).forEach(function(t){if(!next.topics.some(function(n){return n.id===t.id;}))next.topics.push(Object.assign({},clone(t),{enabled:false}));});
 next.cases.forEach(function(c){c.chapterIds=Array.from(new Set((c.chapterIds || []).concat((c.chapterIds || []).map(function(id){var target=find(next,{id:id});return target && target.id;}).filter(Boolean))));if(c.topicId==='relationships')c.topicId='love';if(c.topicId==='timing')c.topicId='self';});
 return next;
}
function summary(catalog){return catalog.topics.filter(function(t){return t.enabled;}).map(function(t){var rows=catalog.chapters.filter(function(c){return c.topicId===t.id && c.state!=='archived';});return {id:t.id,title:t.title,total:rows.length,linked:rows.filter(function(c){return c.sourceRuleIds.length;}).length,missing:rows.filter(function(c){return !c.sourceRuleIds.length;}).map(function(c){return c.id;})};});}
var api={upgrade:upgrade,summary:summary,defaults:defaults,questions:QUESTIONS,cleanContext:cleanContext,contextLabels:contextLabels,find:find,instruction:instruction,prepare:prepare};
root.MantraEditorial=api;var R=root.ReportV2=root.ReportV2 || {};R.Editorial=api;
})(typeof window!=='undefined'?window:globalThis);
