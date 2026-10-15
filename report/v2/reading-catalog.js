(function(root){'use strict';
var SEED={
  "version": 0,
  "topics": [
    {
      "id": "self",
      "title": "본래의 나",
      "order": 0,
      "enabled": true
    },
    {
      "id": "wealth",
      "title": "재물운",
      "order": 1,
      "enabled": true
    },
    {
      "id": "career",
      "title": "일·사업·성공운",
      "order": 2,
      "enabled": true
    },
    {
      "id": "love",
      "title": "연애·결혼·배우자운",
      "order": 3,
      "enabled": true
    },
    {
      "id": "relationships",
      "title": "인간관계·가족운",
      "order": 4,
      "enabled": true
    },
    {
      "id": "timing",
      "title": "인생의 흐름",
      "order": 5,
      "enabled": true
    },
    {
      "id": "health",
      "title": "건강·생활운",
      "order": 6,
      "enabled": true
    },
    {
      "id": "creative",
      "title": "기억 너머의 문",
      "order": 7,
      "enabled": true
    },
    {
      "id": "remedy",
      "title": "개운법·인생 전략",
      "order": 8,
      "enabled": true
    }
  ],
  "chapters": [
    {
      "id": "self_01",
      "topicId": "self",
      "title": "나의 일간과 일주",
      "question": "나의 일간과 일주",
      "purpose": "「나의 일간과 일주」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "처음 맡은 일을 스스로 정리할 때와 다른 사람의 방식에 맞출 때를 비교한다.",
      "difference": "이 장은 처음 맡은 일을 스스로 정리할 때와 다른 사람의 방식에 맞출 때를 비교한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "c01",
        "c-char"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_02",
      "topicId": "self",
      "title": "일간·일주 더 깊이 읽기",
      "question": "일간·일주 더 깊이 읽기",
      "purpose": "「일간·일주 더 깊이 읽기」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "같은 일간이라도 월령·통근이 다른 두 상징 사례를 구분한다.",
      "difference": "이 장은 같은 일간이라도 월령·통근이 다른 두 상징 사례를 구분한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나의 일간과 일주」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "deep_ilju"
      ],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_03",
      "topicId": "self",
      "title": "나는 왜 이렇게 행동할까?",
      "question": "나는 왜 이렇게 행동할까?",
      "purpose": "「나는 왜 이렇게 행동할까?」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "동료에게 맡긴 일을 다시 가져오고 싶어지는 순간의 판단을 살핀다.",
      "difference": "이 장은 동료에게 맡긴 일을 다시 가져오고 싶어지는 순간의 판단을 살핀다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「일간·일주 더 깊이 읽기」의 결론·사례 재설명"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "c03",
        "life_self_who"
      ],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [],
      "core": true
    },
    {
      "id": "self_04",
      "topicId": "self",
      "title": "내 사주를 자동차로 비유하면?",
      "question": "내 사주를 자동차로 비유하면?",
      "purpose": "「내 사주를 자동차로 비유하면?」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "같은 기본 차종이 다른 짐·도로·정비 조건에서 달리는 교육용 장면을 구성한다.",
      "difference": "이 장은 같은 기본 차종이 다른 짐·도로·정비 조건에서 달리는 교육용 장면을 구성한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나는 왜 이렇게 행동할까?」의 결론·사례 재설명"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "deep_car"
      ],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [],
      "core": true
    },
    {
      "id": "self_05",
      "topicId": "self",
      "title": "남들이 보는 나와 실제 나",
      "question": "남들이 보는 나와 실제 나",
      "purpose": "「남들이 보는 나와 실제 나」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "회의에서 보이는 모습과 혼자 결정하는 과정을 비교한다.",
      "difference": "이 장은 회의에서 보이는 모습과 혼자 결정하는 과정을 비교한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「내 사주를 자동차로 비유하면?」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_06",
      "topicId": "self",
      "title": "내가 유독 예민하게 반응하는 것",
      "question": "내가 유독 예민하게 반응하는 것",
      "purpose": "「내가 유독 예민하게 반응하는 것」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "작은 지적을 받았을 때 사실 확인과 감정 반응을 나눈다.",
      "difference": "이 장은 작은 지적을 받았을 때 사실 확인과 감정 반응을 나눈다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「남들이 보는 나와 실제 나」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_07",
      "topicId": "self",
      "title": "압박받을 때 드러나는 성격",
      "question": "압박받을 때 드러나는 성격",
      "purpose": "「압박받을 때 드러나는 성격」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "납기 직전에 일이 늘어날 때 통제를 늘리거나 도움을 요청하는 반응을 비교한다.",
      "difference": "이 장은 납기 직전에 일이 늘어날 때 통제를 늘리거나 도움을 요청하는 반응을 비교한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「내가 유독 예민하게 반응하는 것」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_08",
      "topicId": "self",
      "title": "내가 가진 가장 강력한 무기",
      "question": "내가 가진 가장 강력한 무기",
      "purpose": "「내가 가진 가장 강력한 무기」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "어려운 과제에서 기존 기술을 어느 역할에 집중할지 살핀다.",
      "difference": "이 장은 어려운 과제에서 기존 기술을 어느 역할에 집중할지 살핀다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「압박받을 때 드러나는 성격」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "c04",
        "deep_proscons"
      ],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_09",
      "topicId": "self",
      "title": "스스로 발목을 잡는 약점",
      "question": "스스로 발목을 잡는 약점",
      "purpose": "「스스로 발목을 잡는 약점」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "완성도를 높이려다 제출을 미룰 때 이득과 비용을 비교한다.",
      "difference": "이 장은 완성도를 높이려다 제출을 미룰 때 이득과 비용을 비교한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「내가 가진 가장 강력한 무기」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "c05"
      ],
      "order": 8,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_10",
      "topicId": "self",
      "title": "반복되는 실수와 행동 패턴",
      "question": "반복되는 실수와 행동 패턴",
      "purpose": "「반복되는 실수와 행동 패턴」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "같은 부탁을 반복해서 떠안을 때 이전 선택과 이번 선택을 대조한다.",
      "difference": "이 장은 같은 부탁을 반복해서 떠안을 때 이전 선택과 이번 선택을 대조한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「스스로 발목을 잡는 약점」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 9,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_11",
      "topicId": "self",
      "title": "타고난 욕망과 숨겨진 야망",
      "question": "타고난 욕망과 숨겨진 야망",
      "purpose": "「타고난 욕망과 숨겨진 야망」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "안정적인 역할과 눈에 띄는 도전 중 원하는 보상을 질문한다.",
      "difference": "이 장은 안정적인 역할과 눈에 띄는 도전 중 원하는 보상을 질문한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「반복되는 실수와 행동 패턴」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 10,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_12",
      "topicId": "self",
      "title": "내 안의 십성과 오행",
      "question": "내 안의 십성과 오행",
      "purpose": "「내 안의 십성과 오행」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "아이디어·실행·관리·학습 역할을 나눠 맡는 모임을 가정한다.",
      "difference": "이 장은 아이디어·실행·관리·학습 역할을 나눠 맡는 모임을 가정한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「타고난 욕망과 숨겨진 야망」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "c02",
        "life_tengods",
        "life_stars"
      ],
      "order": 11,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_13",
      "topicId": "self",
      "title": "나와 잘 맞는 환경",
      "question": "나와 잘 맞는 환경",
      "purpose": "「나와 잘 맞는 환경」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "자율적인 작업 공간과 촘촘한 승인 절차가 있는 환경을 비교한다.",
      "difference": "이 장은 자율적인 작업 공간과 촘촘한 승인 절차가 있는 환경을 비교한다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「내 안의 십성과 오행」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [],
      "order": 12,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "self_14",
      "topicId": "self",
      "title": "내 인생의 핵심 과제",
      "question": "내 인생의 핵심 과제",
      "purpose": "「내 인생의 핵심 과제」에 답한다. 기질을 사실로 단정하지 않고 행동의 발현 조건을 비교한다.",
      "requiredEvidence": [
        "일간·일주",
        "오행·십성 구조",
        "강약·통근의 별도 근거"
      ],
      "example": "여러 목표가 충돌할 때 이번 달에 지킬 기준 하나를 고르는 장면을 살핀다.",
      "difference": "이 장은 여러 목표가 충돌할 때 이번 달에 지킬 기준 하나를 고르는 장면을 살핀다. 성격 정의와 장단점은 이 주제에서 설명한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나와 잘 맞는 환경」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "오행·십성 비교",
      "legacyIds": [
        "c00",
        "deep_stages",
        "life_here"
      ],
      "order": 13,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "wealth_01",
      "topicId": "wealth",
      "title": "내 재물 그릇은?",
      "question": "내 재물 그릇은?",
      "purpose": "「내 재물 그릇은?」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "그릇의 유입·보관·누수를 구분하되 실제 재산으로 환산하지 않는다.",
      "difference": "이 장은 그릇의 유입·보관·누수를 구분하되 실제 재산으로 환산하지 않는다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "deep_wealth",
        "life_money_nature",
        "life_money_timing"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [],
      "core": true
    },
    {
      "id": "wealth_02",
      "topicId": "wealth",
      "title": "나는 돈복이 있는 사주일까?",
      "question": "나는 돈복이 있는 사주일까?",
      "purpose": "「나는 돈복이 있는 사주일까?」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "뜻밖의 수입과 반복 가능한 소득을 구분하고 준비 조건을 점검한다.",
      "difference": "이 장은 뜻밖의 수입과 반복 가능한 소득을 구분하고 준비 조건을 점검한다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「내 재물 그릇은?」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "wealth_03",
      "topicId": "wealth",
      "title": "돈이 들어오는 방식",
      "question": "돈이 들어오는 방식",
      "purpose": "「돈이 들어오는 방식」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "견적 제시부터 실제 대금을 회수할 때까지의 과정을 살핀다.",
      "difference": "이 장은 견적 제시부터 실제 대금을 회수할 때까지의 과정을 살핀다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나는 돈복이 있는 사주일까?」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [
        "c08"
      ],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "wealth_04",
      "topicId": "wealth",
      "title": "돈을 잘 벌어도 남지 않는 이유",
      "question": "돈을 잘 벌어도 남지 않는 이유",
      "purpose": "「돈을 잘 벌어도 남지 않는 이유」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "매출이 늘어도 세금·고정비·미수금 때문에 잔액이 달라지는 상황을 가정한다.",
      "difference": "이 장은 매출이 늘어도 세금·고정비·미수금 때문에 잔액이 달라지는 상황을 가정한다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「돈이 들어오는 방식」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "wealth_05",
      "topicId": "wealth",
      "title": "큰돈을 벌 기회와 조건",
      "question": "큰돈을 벌 기회와 조건",
      "purpose": "「큰돈을 벌 기회와 조건」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "큰 계약을 받을 때 선지출과 회수 기간을 감당할 여유가 있는지 묻는다.",
      "difference": "이 장은 큰 계약을 받을 때 선지출과 회수 기간을 감당할 여유가 있는지 묻는다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「돈을 잘 벌어도 남지 않는 이유」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "wealth_06",
      "topicId": "wealth",
      "title": "직장 소득·사업 소득·투자 소득 비교",
      "question": "직장 소득·사업 소득·투자 소득 비교",
      "purpose": "「직장 소득·사업 소득·투자 소득 비교」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "급여·독립 매출·투자 수입의 변동성과 실제 준비 시간을 비교한다.",
      "difference": "이 장은 급여·독립 매출·투자 수입의 변동성과 실제 준비 시간을 비교한다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「큰돈을 벌 기회와 조건」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "wealth_07",
      "topicId": "wealth",
      "title": "돈 때문에 반복하기 쉬운 실수",
      "question": "돈 때문에 반복하기 쉬운 실수",
      "purpose": "「돈 때문에 반복하기 쉬운 실수」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "공동 지출이나 돈을 빌려 달라는 부탁에 한도를 정하는 장면을 살핀다.",
      "difference": "이 장은 공동 지출이나 돈을 빌려 달라는 부탁에 한도를 정하는 장면을 살핀다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「직장 소득·사업 소득·투자 소득 비교」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "wealth_08",
      "topicId": "wealth",
      "title": "재물운의 대운·세운 흐름",
      "question": "재물운의 대운·세운 흐름",
      "purpose": "「재물운의 대운·세운 흐름」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "승인된 시간 조건이 있는 구간의 확대·유지·회수 점검을 나눈다.",
      "difference": "이 장은 승인된 시간 조건이 있는 구간의 확대·유지·회수 점검을 나눈다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「돈 때문에 반복하기 쉬운 실수」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "wealth_09",
      "topicId": "wealth",
      "title": "재정적으로 주의할 시기",
      "question": "재정적으로 주의할 시기",
      "purpose": "「재정적으로 주의할 시기」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "현금 여유가 줄었을 때 기존 약정과 납부일을 먼저 확인한다.",
      "difference": "이 장은 현금 여유가 줄었을 때 기존 약정과 납부일을 먼저 확인한다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「재물운의 대운·세운 흐름」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 8,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "wealth_10",
      "topicId": "wealth",
      "title": "나에게 맞는 자산 축적 전략",
      "question": "나에게 맞는 자산 축적 전략",
      "purpose": "「나에게 맞는 자산 축적 전략」에 답한다. 수입과 축적·지출·손실의 조건을 구분한다.",
      "requiredEvidence": [
        "재성의 위치·비중",
        "식상·비겁과 재성의 관계",
        "관련 시기 판단"
      ],
      "example": "입금일에 저축·지출·예비 항목을 나누고 월말에 실제 잔액을 대조한다.",
      "difference": "이 장은 입금일에 저축·지출·예비 항목을 나누고 월말에 실제 잔액을 대조한다. 성격을 재소개하지 않고 자금 운용의 선택에 적용한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「재정적으로 주의할 시기」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "재물 그릇·현금 흐름",
      "legacyIds": [],
      "order": 9,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "career_01",
      "topicId": "career",
      "title": "나는 어떤 방식으로 성공하는 사람인가?",
      "question": "나는 어떤 방식으로 성공하는 사람인가?",
      "purpose": "「나는 어떤 방식으로 성공하는 사람인가?」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "혼자 완성하는 역할과 협업을 조율하는 역할의 성과 조건을 비교한다.",
      "difference": "이 장은 혼자 완성하는 역할과 협업을 조율하는 역할의 성과 조건을 비교한다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "c07",
        "life_career_style",
        "life_career_timing"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [],
      "core": true
    },
    {
      "id": "career_02",
      "topicId": "career",
      "title": "직장인과 사업가 중 어느 쪽이 어울릴까?",
      "question": "직장인과 사업가 중 어느 쪽이 어울릴까?",
      "purpose": "「직장인과 사업가 중 어느 쪽이 어울릴까?」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "급여의 안정성과 독립 활동의 영업·정산 책임을 준비 조건과 함께 비교한다.",
      "difference": "이 장은 급여의 안정성과 독립 활동의 영업·정산 책임을 준비 조건과 함께 비교한다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나는 어떤 방식으로 성공하는 사람인가?」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "career_03",
      "topicId": "career",
      "title": "타고난 직업 적성과 업무 스타일",
      "question": "타고난 직업 적성과 업무 스타일",
      "purpose": "「타고난 직업 적성과 업무 스타일」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "새 과제에서 조사·제작·설명·납품 중 시간을 쓰는 방식을 살핀다.",
      "difference": "이 장은 새 과제에서 조사·제작·설명·납품 중 시간을 쓰는 방식을 살핀다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「직장인과 사업가 중 어느 쪽이 어울릴까?」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "c06"
      ],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "career_04",
      "topicId": "career",
      "title": "나와 잘 맞는 업종",
      "question": "나와 잘 맞는 업종",
      "purpose": "「나와 잘 맞는 업종」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "관심 업종의 실제 자격·경력·채용 조건을 확인하는 체크리스트를 만든다.",
      "difference": "이 장은 관심 업종의 실제 자격·경력·채용 조건을 확인하는 체크리스트를 만든다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「타고난 직업 적성과 업무 스타일」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "업무 환경 비교",
      "legacyIds": [
        "deep_jobs"
      ],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "career_05",
      "topicId": "career",
      "title": "나와 맞지 않는 업무 환경",
      "question": "나와 맞지 않는 업무 환경",
      "purpose": "「나와 맞지 않는 업무 환경」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "평가 기준이 불분명하거나 긴급 지시가 잦은 환경의 부담을 비교한다.",
      "difference": "이 장은 평가 기준이 불분명하거나 긴급 지시가 잦은 환경의 부담을 비교한다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나와 잘 맞는 업종」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "career_06",
      "topicId": "career",
      "title": "리더형인가, 전문가형인가?",
      "question": "리더형인가, 전문가형인가?",
      "purpose": "「리더형인가, 전문가형인가?」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "팀의 우선순위 결정과 한 분야의 품질 책임을 비교한다.",
      "difference": "이 장은 팀의 우선순위 결정과 한 분야의 품질 책임을 비교한다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나와 맞지 않는 업무 환경」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "career_07",
      "topicId": "career",
      "title": "동업과 독립의 장단점",
      "question": "동업과 독립의 장단점",
      "purpose": "「동업과 독립의 장단점」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "동업의 결정권·기여·수익 배분·종료 조건을 합의하는 상황을 구성한다.",
      "difference": "이 장은 동업의 결정권·기여·수익 배분·종료 조건을 합의하는 상황을 구성한다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「리더형인가, 전문가형인가?」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "career_08",
      "topicId": "career",
      "title": "조직에서 갈등이 발생하기 쉬운 이유",
      "question": "조직에서 갈등이 발생하기 쉬운 이유",
      "purpose": "「조직에서 갈등이 발생하기 쉬운 이유」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "업무 수정이 반복될 때 완료 기준을 다시 정하는 대화를 살핀다.",
      "difference": "이 장은 업무 수정이 반복될 때 완료 기준을 다시 정하는 대화를 살핀다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「동업과 독립의 장단점」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "career_09",
      "topicId": "career",
      "title": "커리어의 전환점",
      "question": "커리어의 전환점",
      "purpose": "「커리어의 전환점」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "직무 전환에서 승인된 시기 근거와 실제 채용·생활 조건을 분리한다.",
      "difference": "이 장은 직무 전환에서 승인된 시기 근거와 실제 채용·생활 조건을 분리한다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「조직에서 갈등이 발생하기 쉬운 이유」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 8,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "career_10",
      "topicId": "career",
      "title": "지금부터 키워야 할 경쟁력",
      "question": "지금부터 키워야 할 경쟁력",
      "purpose": "「지금부터 키워야 할 경쟁력」에 답한다. 실제 자격·경력·업무 환경을 함께 고려한다.",
      "requiredEvidence": [
        "관성·인성·식상·재성 관계",
        "조직·독립 활동의 검수 근거"
      ],
      "example": "부족한 기술 하나를 골라 작은 결과물로 검증하는 계획을 만든다.",
      "difference": "이 장은 부족한 기술 하나를 골라 작은 결과물로 검증하는 계획을 만든다. 추진력 칭찬 대신 업무 방식과 성과 조건에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「커리어의 전환점」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "업무 환경 비교",
      "legacyIds": [],
      "order": 9,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_01",
      "topicId": "love",
      "title": "나는 연애할 때 어떤 사람인가?",
      "question": "나는 연애할 때 어떤 사람인가?",
      "purpose": "「나는 연애할 때 어떤 사람인가?」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "만남 초기에 연락 간격과 애정 표현 방식이 다를 때의 합의를 살핀다.",
      "difference": "이 장은 만남 초기에 연락 간격과 애정 표현 방식이 다를 때의 합의를 살핀다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "c09",
        "life_love_style",
        "life_love_timing",
        "life_marriage_who",
        "life_marriage_timing"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_02",
      "topicId": "love",
      "title": "나에게 끌리는 사람들의 특징",
      "question": "나에게 끌리는 사람들의 특징",
      "purpose": "「나에게 끌리는 사람들의 특징」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "상대의 실제 마음을 추정하지 않고 편안한 상호 반응을 질문한다.",
      "difference": "이 장은 상대의 실제 마음을 추정하지 않고 편안한 상호 반응을 질문한다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나는 연애할 때 어떤 사람인가?」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_03",
      "topicId": "love",
      "title": "내가 끌리는 상대의 특징",
      "question": "내가 끌리는 상대의 특징",
      "purpose": "「내가 끌리는 상대의 특징」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "매력적인 특성과 함께 생활할 때 필요한 조건을 구분한다.",
      "difference": "이 장은 매력적인 특성과 함께 생활할 때 필요한 조건을 구분한다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나에게 끌리는 사람들의 특징」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_04",
      "topicId": "love",
      "title": "연애가 쉽게 풀리지 않는 이유",
      "question": "연애가 쉽게 풀리지 않는 이유",
      "purpose": "「연애가 쉽게 풀리지 않는 이유」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "호감 표현을 기다리는 동안 추측이 길어지는 상황을 가정한다.",
      "difference": "이 장은 호감 표현을 기다리는 동안 추측이 길어지는 상황을 가정한다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「내가 끌리는 상대의 특징」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_05",
      "topicId": "love",
      "title": "관계에서 반복되는 갈등",
      "question": "관계에서 반복되는 갈등",
      "purpose": "「관계에서 반복되는 갈등」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "약속 변경이나 연락 공백 뒤 서운함을 전달하는 대화를 비교한다.",
      "difference": "이 장은 약속 변경이나 연락 공백 뒤 서운함을 전달하는 대화를 비교한다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「연애가 쉽게 풀리지 않는 이유」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "deep_love"
      ],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_06",
      "topicId": "love",
      "title": "나와 잘 맞는 배우자 유형",
      "question": "나와 잘 맞는 배우자 유형",
      "purpose": "「나와 잘 맞는 배우자 유형」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "생활 속도·독립 공간·갈등 해결 방식이 맞는 동반자의 조건을 비교한다.",
      "difference": "이 장은 생활 속도·독립 공간·갈등 해결 방식이 맞는 동반자의 조건을 비교한다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「관계에서 반복되는 갈등」의 결론·사례 재설명"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "c10",
        "deep_spouse"
      ],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [],
      "core": true
    },
    {
      "id": "love_07",
      "topicId": "love",
      "title": "배우자 덕의 전통적 해석",
      "question": "배우자 덕의 전통적 해석",
      "purpose": "「배우자 덕의 전통적 해석」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "상대의 도움을 당연시하지 않고 상호 지원과 부담을 나눈다.",
      "difference": "이 장은 상대의 도움을 당연시하지 않고 상호 지원과 부담을 나눈다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나와 잘 맞는 배우자 유형」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_08",
      "topicId": "love",
      "title": "결혼운이 강해지는 시기",
      "question": "결혼운이 강해지는 시기",
      "purpose": "「결혼운이 강해지는 시기」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "관계 상태가 미상일 때 혼인을 단정하지 않고 시간 조건과 선택 여지를 설명한다.",
      "difference": "이 장은 관계 상태가 미상일 때 혼인을 단정하지 않고 시간 조건과 선택 여지를 설명한다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「배우자 덕의 전통적 해석」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_09",
      "topicId": "love",
      "title": "결혼 후 관계의 변화",
      "question": "결혼 후 관계의 변화",
      "purpose": "「결혼 후 관계의 변화」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "함께 생활한다고 가정할 때 가사·가계·개인 시간을 나누는 합의를 살핀다.",
      "difference": "이 장은 함께 생활한다고 가정할 때 가사·가계·개인 시간을 나누는 합의를 살핀다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「결혼운이 강해지는 시기」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [
        "deep_marriage"
      ],
      "order": 8,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_10",
      "topicId": "love",
      "title": "이별과 관계 변화의 가능성",
      "question": "이별과 관계 변화의 가능성",
      "purpose": "「이별과 관계 변화의 가능성」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "갈등 회피와 관계 재협상의 조건을 비교하되 이별을 예언하지 않는다.",
      "difference": "이 장은 갈등 회피와 관계 재협상의 조건을 비교하되 이별을 예언하지 않는다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「결혼 후 관계의 변화」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [],
      "order": 9,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "love_11",
      "topicId": "love",
      "title": "좋은 관계를 오래 유지하는 방법",
      "question": "좋은 관계를 오래 유지하는 방법",
      "purpose": "「좋은 관계를 오래 유지하는 방법」에 답한다. 관계 행동과 상대의 선택을 분리한다.",
      "requiredEvidence": [
        "배우자성·배우자궁",
        "관계에 적용되는 검수 규칙",
        "시기 주장에 대한 시간 조건"
      ],
      "example": "작은 불편을 미루지 않고 서로의 요청을 정기적으로 확인하는 대화를 구성한다.",
      "difference": "이 장은 작은 불편을 미루지 않고 서로의 요청을 정기적으로 확인하는 대화를 구성한다. 보편적 인정 욕구 대신 상호작용과 갈등에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「이별과 관계 변화의 가능성」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 합의 비교",
      "legacyIds": [],
      "order": 10,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "relationships_01",
      "topicId": "relationships",
      "title": "사람들이 나를 보는 방식",
      "question": "사람들이 나를 보는 방식",
      "purpose": "「사람들이 나를 보는 방식」에 답한다. 가족의 실제 상황을 추정하지 않는다.",
      "requiredEvidence": [
        "관계·궁위의 검수 규칙",
        "상반된 판단과 예외"
      ],
      "example": "처음 만난 모임의 역할과 가까운 사이에서의 반응을 비교한다.",
      "difference": "이 장은 처음 만난 모임의 역할과 가까운 사이에서의 반응을 비교한다. 연애와 구분해 친구·동료·가족의 경계에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 경계 지도",
      "legacyIds": [
        "c11",
        "life_relation_style",
        "life_relation_timing"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "relationships_02",
      "topicId": "relationships",
      "title": "사람을 믿고 실망하는 반복 패턴",
      "question": "사람을 믿고 실망하는 반복 패턴",
      "purpose": "「사람을 믿고 실망하는 반복 패턴」에 답한다. 가족의 실제 상황을 추정하지 않는다.",
      "requiredEvidence": [
        "관계·궁위의 검수 규칙",
        "상반된 판단과 예외"
      ],
      "example": "약속을 지키지 않은 사람에 대해 확인한 사실과 붙인 의미를 나눈다.",
      "difference": "이 장은 약속을 지키지 않은 사람에 대해 확인한 사실과 붙인 의미를 나눈다. 연애와 구분해 친구·동료·가족의 경계에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「사람들이 나를 보는 방식」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 경계 지도",
      "legacyIds": [],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "relationships_03",
      "topicId": "relationships",
      "title": "친구·동료 관계의 특징",
      "question": "친구·동료 관계의 특징",
      "purpose": "「친구·동료 관계의 특징」에 답한다. 가족의 실제 상황을 추정하지 않는다.",
      "requiredEvidence": [
        "관계·궁위의 검수 규칙",
        "상반된 판단과 예외"
      ],
      "example": "친구·동료의 부탁에서 호의와 업무 책임의 경계를 정한다.",
      "difference": "이 장은 친구·동료의 부탁에서 호의와 업무 책임의 경계를 정한다. 연애와 구분해 친구·동료·가족의 경계에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「사람을 믿고 실망하는 반복 패턴」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 경계 지도",
      "legacyIds": [],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "relationships_04",
      "topicId": "relationships",
      "title": "나와 잘 맞는 사람의 오행적 특징",
      "question": "나와 잘 맞는 사람의 오행적 특징",
      "purpose": "「나와 잘 맞는 사람의 오행적 특징」에 답한다. 가족의 실제 상황을 추정하지 않는다.",
      "requiredEvidence": [
        "관계·궁위의 검수 규칙",
        "상반된 판단과 예외"
      ],
      "example": "오행은 상징으로 읽고 실제 가치관·약속·대화 습관을 확인한다.",
      "difference": "이 장은 오행은 상징으로 읽고 실제 가치관·약속·대화 습관을 확인한다. 연애와 구분해 친구·동료·가족의 경계에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「친구·동료 관계의 특징」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 경계 지도",
      "legacyIds": [
        "c12"
      ],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "relationships_05",
      "topicId": "relationships",
      "title": "갈등이 생기기 쉬운 관계",
      "question": "갈등이 생기기 쉬운 관계",
      "purpose": "「갈등이 생기기 쉬운 관계」에 답한다. 가족의 실제 상황을 추정하지 않는다.",
      "requiredEvidence": [
        "관계·궁위의 검수 규칙",
        "상반된 판단과 예외"
      ],
      "example": "의견이 다른 사람과 협상 가능한 범위를 정하는 상황을 살핀다.",
      "difference": "이 장은 의견이 다른 사람과 협상 가능한 범위를 정하는 상황을 살핀다. 연애와 구분해 친구·동료·가족의 경계에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나와 잘 맞는 사람의 오행적 특징」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 경계 지도",
      "legacyIds": [],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "relationships_06",
      "topicId": "relationships",
      "title": "부모·형제 관계의 전통적 해석",
      "question": "부모·형제 관계의 전통적 해석",
      "purpose": "「부모·형제 관계의 전통적 해석」에 답한다. 가족의 실제 상황을 추정하지 않는다.",
      "requiredEvidence": [
        "관계·궁위의 검수 규칙",
        "상반된 판단과 예외"
      ],
      "example": "부모·형제의 존재나 과거를 추정하지 않고 가족 역할에 대한 가정 질문을 제시한다.",
      "difference": "이 장은 부모·형제의 존재나 과거를 추정하지 않고 가족 역할에 대한 가정 질문을 제시한다. 연애와 구분해 친구·동료·가족의 경계에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「갈등이 생기기 쉬운 관계」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 경계 지도",
      "legacyIds": [
        "c13"
      ],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "relationships_07",
      "topicId": "relationships",
      "title": "자녀운과 양육 성향",
      "question": "자녀운과 양육 성향",
      "purpose": "「자녀운과 양육 성향」에 답한다. 가족의 실제 상황을 추정하지 않는다.",
      "requiredEvidence": [
        "관계·궁위의 검수 규칙",
        "상반된 판단과 예외"
      ],
      "example": "자녀가 있다고 가정하지 않고 돌봄 역할의 자율성과 기준을 살핀다.",
      "difference": "이 장은 자녀가 있다고 가정하지 않고 돌봄 역할의 자율성과 기준을 살핀다. 연애와 구분해 친구·동료·가족의 경계에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「부모·형제 관계의 전통적 해석」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 경계 지도",
      "legacyIds": [
        "deep_children"
      ],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "relationships_08",
      "topicId": "relationships",
      "title": "인간관계에서 지켜야 할 경계선",
      "question": "인간관계에서 지켜야 할 경계선",
      "purpose": "「인간관계에서 지켜야 할 경계선」에 답한다. 가족의 실제 상황을 추정하지 않는다.",
      "requiredEvidence": [
        "관계·궁위의 검수 규칙",
        "상반된 판단과 예외"
      ],
      "example": "감당하기 어려운 부탁에 대체안과 가능한 범위를 말하는 대화를 구성한다.",
      "difference": "이 장은 감당하기 어려운 부탁에 대체안과 가능한 범위를 말하는 대화를 구성한다. 연애와 구분해 친구·동료·가족의 경계에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「자녀운과 양육 성향」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "관계 경계 지도",
      "legacyIds": [],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timing_01",
      "topicId": "timing",
      "title": "내 인생의 전체 흐름",
      "question": "내 인생의 전체 흐름",
      "purpose": "「내 인생의 전체 흐름」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "고정된 원국과 여러 시기 조건을 한 타임라인에서 구분한다.",
      "difference": "이 장은 고정된 원국과 여러 시기 조건을 한 타임라인에서 구분한다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "대운·세운 타임라인",
      "legacyIds": [
        "c15",
        "life_prologue"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timing_02",
      "topicId": "timing",
      "title": "어린 시절부터 현재까지의 대운",
      "question": "어린 시절부터 현재까지의 대운",
      "purpose": "「어린 시절부터 현재까지의 대운」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "계산된 지난 대운 구간을 표시하되 실제 과거 사건을 만들지 않는다.",
      "difference": "이 장은 계산된 지난 대운 구간을 표시하되 실제 과거 사건을 만들지 않는다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「내 인생의 전체 흐름」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "대운·세운 타임라인",
      "legacyIds": [
        "deep_daewoon"
      ],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timing_03",
      "topicId": "timing",
      "title": "지금 지나고 있는 운",
      "question": "지금 지나고 있는 운",
      "purpose": "「지금 지나고 있는 운」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "현재 대운·세운이 겹치는 조건과 실제 준비할 일을 나눈다.",
      "difference": "이 장은 현재 대운·세운이 겹치는 조건과 실제 준비할 일을 나눈다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「어린 시절부터 현재까지의 대운」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "대운·세운 타임라인",
      "legacyIds": [
        "c16"
      ],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timing_04",
      "topicId": "timing",
      "title": "인생의 주요 전환점",
      "question": "인생의 주요 전환점",
      "purpose": "「인생의 주요 전환점」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "계산된 대운 전환점 양옆에서 유지할 일과 검토할 일을 비교한다.",
      "difference": "이 장은 계산된 대운 전환점 양옆에서 유지할 일과 검토할 일을 비교한다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「지금 지나고 있는 운」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "대운·세운 타임라인",
      "legacyIds": [],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timing_05",
      "topicId": "timing",
      "title": "재물·일·연애운의 시기별 비교",
      "question": "재물·일·연애운의 시기별 비교",
      "purpose": "「재물·일·연애운의 시기별 비교」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "같은 시기의 돈·업무·관계에 서로 다른 부담과 지원 조건을 비교한다.",
      "difference": "이 장은 같은 시기의 돈·업무·관계에 서로 다른 부담과 지원 조건을 비교한다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「인생의 주요 전환점」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "대운·세운 타임라인",
      "legacyIds": [],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timing_06",
      "topicId": "timing",
      "title": "향후 3년 집중 분석",
      "question": "향후 3년 집중 분석",
      "purpose": "「향후 3년 집중 분석」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "다음 세 해의 계산표와 각 해에 적용되는 승인 판단만 비교한다.",
      "difference": "이 장은 다음 세 해의 계산표와 각 해에 적용되는 승인 판단만 비교한다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「재물·일·연애운의 시기별 비교」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "대운·세운 타임라인",
      "legacyIds": [
        "c17",
        "life_future"
      ],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timing_07",
      "topicId": "timing",
      "title": "향후 10년 연도별 분석",
      "question": "향후 10년 연도별 분석",
      "purpose": "「향후 10년 연도별 분석」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "열 해의 연도별 계산값을 보여 주고 근거 없는 사건 예측은 미완료로 나눈다.",
      "difference": "이 장은 열 해의 연도별 계산값을 보여 주고 근거 없는 사건 예측은 미완료로 나눈다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「향후 3년 집중 분석」의 결론·사례 재설명"
      ],
      "targetMin": 1000,
      "targetMax": 1600,
      "visual": "대운·세운 타임라인",
      "legacyIds": [
        "deep_seun"
      ],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [],
      "core": true
    },
    {
      "id": "timing_08",
      "topicId": "timing",
      "title": "기회기·축적기·전환기·방어기",
      "question": "기회기·축적기·전환기·방어기",
      "purpose": "「기회기·축적기·전환기·방어기」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "내부 흐름 지표와 실제 자원 여유를 나눠 준비·유지·전환을 비교한다.",
      "difference": "이 장은 내부 흐름 지표와 실제 자원 여유를 나눠 준비·유지·전환을 비교한다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「향후 10년 연도별 분석」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "대운·세운 타임라인",
      "legacyIds": [],
      "order": 7,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timing_09",
      "topicId": "timing",
      "title": "운의 변화와 관련된 전통적 해석",
      "question": "운의 변화와 관련된 전통적 해석",
      "purpose": "「운의 변화와 관련된 전통적 해석」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "운의 변화를 실제 사건의 원인으로 단정하지 않고 학파별 적용 조건을 설명한다.",
      "difference": "이 장은 운의 변화를 실제 사건의 원인으로 단정하지 않고 학파별 적용 조건을 설명한다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「기회기·축적기·전환기·방어기」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "대운·세운 타임라인",
      "legacyIds": [
        "c18",
        "deep_wolun"
      ],
      "order": 8,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "timing_10",
      "topicId": "timing",
      "title": "앞으로의 선택 전략",
      "question": "앞으로의 선택 전략",
      "purpose": "「앞으로의 선택 전략」에 답한다. 고정 원국과 전달된 시기 조건을 분리한다.",
      "requiredEvidence": [
        "실제 대운·세운·월운 계산",
        "시간 조건이 있는 승인 판단"
      ],
      "example": "시기별 계획을 실제 일정·예산·관계 변화에 따라 다시 점검한다.",
      "difference": "이 장은 시기별 계획을 실제 일정·예산·관계 변화에 따라 다시 점검한다. 연도별 사건을 만들지 않고 근거 있는 변화만 비교한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「운의 변화와 관련된 전통적 해석」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "대운·세운 타임라인",
      "legacyIds": [],
      "order": 9,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "health_01",
      "topicId": "health",
      "title": "전통 오행으로 보는 생활 균형",
      "question": "전통 오행으로 보는 생활 균형",
      "purpose": "「전통 오행으로 보는 생활 균형」에 답한다. 질병·사고·수명 예측 없이 생활 점검을 제안한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "오행의 상징과 실제 수면·식사·휴식 기록을 별도 정보로 표시한다.",
      "difference": "이 장은 오행의 상징과 실제 수면·식사·휴식 기록을 별도 정보로 표시한다. 의학적 판단 대신 자가 관찰과 생활 균형에 한정한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [
        "deep_health"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "health_02",
      "topicId": "health",
      "title": "스트레스 상황과 대처 방식",
      "question": "스트레스 상황과 대처 방식",
      "purpose": "「스트레스 상황과 대처 방식」에 답한다. 질병·사고·수명 예측 없이 생활 점검을 제안한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "갈등이나 마감이 겹친 날 긴장 반응과 회복에 도움이 된 행동을 기록한다.",
      "difference": "이 장은 갈등이나 마감이 겹친 날 긴장 반응과 회복에 도움이 된 행동을 기록한다. 의학적 판단 대신 자가 관찰과 생활 균형에 한정한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「전통 오행으로 보는 생활 균형」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "health_03",
      "topicId": "health",
      "title": "과로와 생활 리듬",
      "question": "과로와 생활 리듬",
      "purpose": "「과로와 생활 리듬」에 답한다. 질병·사고·수명 예측 없이 생활 점검을 제안한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "업무가 길어진 날 취침·기상·휴식 시간을 살피되 질병으로 연결하지 않는다.",
      "difference": "이 장은 업무가 길어진 날 취침·기상·휴식 시간을 살피되 질병으로 연결하지 않는다. 의학적 판단 대신 자가 관찰과 생활 균형에 한정한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「스트레스 상황과 대처 방식」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "health_04",
      "topicId": "health",
      "title": "시기별 생활관리 참고 사항",
      "question": "시기별 생활관리 참고 사항",
      "purpose": "「시기별 생활관리 참고 사항」에 답한다. 질병·사고·수명 예측 없이 생활 점검을 제안한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "일정 부담이 커질 때 쉴 시간과 조정 가능한 약속을 확인한다.",
      "difference": "이 장은 일정 부담이 커질 때 쉴 시간과 조정 가능한 약속을 확인한다. 의학적 판단 대신 자가 관찰과 생활 균형에 한정한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「과로와 생활 리듬」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "health_05",
      "topicId": "health",
      "title": "나에게 맞는 운동과 휴식 습관",
      "question": "나에게 맞는 운동과 휴식 습관",
      "purpose": "「나에게 맞는 운동과 휴식 습관」에 답한다. 질병·사고·수명 예측 없이 생활 점검을 제안한다.",
      "requiredEvidence": [
        "전통 오행 상징",
        "생활관리 원칙의 출처"
      ],
      "example": "건강 상태를 추정하지 않고 무리하지 않는 활동과 충분한 휴식을 제안한다.",
      "difference": "이 장은 건강 상태를 추정하지 않고 무리하지 않는 활동과 충분한 휴식을 제안한다. 의학적 판단 대신 자가 관찰과 생활 균형에 한정한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「시기별 생활관리 참고 사항」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "생활 리듬 기록",
      "legacyIds": [],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "creative_01",
      "topicId": "creative",
      "title": "전생 이야기",
      "question": "전생 이야기",
      "purpose": "「전생 이야기」에 답한다. 사주 상징을 활용한 창작임을 표시한다.",
      "requiredEvidence": [
        "실제로 계산된 사주 상징"
      ],
      "example": "계산된 상징을 재료로 옛 시대 가상 인물이 선택하는 창작 장면을 쓴다.",
      "difference": "이 장은 계산된 상징을 재료로 옛 시대 가상 인물이 선택하는 창작 장면을 쓴다. 사실·전생 기억·미래 예측으로 표현하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·세계관",
      "legacyIds": [
        "c14",
        "deep_past"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "creative_02",
      "topicId": "creative",
      "title": "내 운을 상징하는 인물과 세계관",
      "question": "내 운을 상징하는 인물과 세계관",
      "purpose": "「내 운을 상징하는 인물과 세계관」에 답한다. 사주 상징을 활용한 창작임을 표시한다.",
      "requiredEvidence": [
        "실제로 계산된 사주 상징"
      ],
      "example": "상징적 인물과 세계를 창작하되 실제 역사 인물과 동일시하지 않는다.",
      "difference": "이 장은 상징적 인물과 세계를 창작하되 실제 역사 인물과 동일시하지 않는다. 사실·전생 기억·미래 예측으로 표현하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「전생 이야기」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·세계관",
      "legacyIds": [],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "creative_03",
      "topicId": "creative",
      "title": "다른 시대에 태어났다면?",
      "question": "다른 시대에 태어났다면?",
      "purpose": "「다른 시대에 태어났다면?」에 답한다. 사주 상징을 활용한 창작임을 표시한다.",
      "requiredEvidence": [
        "실제로 계산된 사주 상징"
      ],
      "example": "다른 시대의 가상 직업과 갈등으로 현재 선택을 비추는 이야기를 구성한다.",
      "difference": "이 장은 다른 시대의 가상 직업과 갈등으로 현재 선택을 비추는 이야기를 구성한다. 사실·전생 기억·미래 예측으로 표현하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「내 운을 상징하는 인물과 세계관」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·세계관",
      "legacyIds": [],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "creative_04",
      "topicId": "creative",
      "title": "내 인생을 무협 이야기로 표현한다면?",
      "question": "내 인생을 무협 이야기로 표현한다면?",
      "purpose": "「내 인생을 무협 이야기로 표현한다면?」에 답한다. 사주 상징을 활용한 창작임을 표시한다.",
      "requiredEvidence": [
        "실제로 계산된 사주 상징"
      ],
      "example": "강점이 약점으로 바뀌는 가상 무협 대결에서 인물이 전략을 바꾸는 장면을 쓴다.",
      "difference": "이 장은 강점이 약점으로 바뀌는 가상 무협 대결에서 인물이 전략을 바꾸는 장면을 쓴다. 사실·전생 기억·미래 예측으로 표현하지 않는다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「다른 시대에 태어났다면?」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "기존 전생 이미지·세계관",
      "legacyIds": [],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "remedy_01",
      "topicId": "remedy",
      "title": "지금 내게 필요한 변화",
      "question": "지금 내게 필요한 변화",
      "purpose": "「지금 내게 필요한 변화」에 답한다. 실제 상황에서 시험하고 점검할 행동을 정한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "현재 제약을 확인하고 이번 주에 바꿀 행동 하나를 고른다.",
      "difference": "이 장은 현재 제약을 확인하고 이번 주에 바꿀 행동 하나를 고른다. 색·물건의 효능을 보장하지 않고 관찰 가능한 선택에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [
        "c19"
      ],
      "order": 0,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "remedy_02",
      "topicId": "remedy",
      "title": "부족한 오행을 해석하는 방법",
      "question": "부족한 오행을 해석하는 방법",
      "purpose": "「부족한 오행을 해석하는 방법」에 답한다. 실제 상황에서 시험하고 점검할 행동을 정한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "부족한 오행과 도움이 되는 오행의 차이를 학파 근거와 함께 비교한다.",
      "difference": "이 장은 부족한 오행과 도움이 되는 오행의 차이를 학파 근거와 함께 비교한다. 색·물건의 효능을 보장하지 않고 관찰 가능한 선택에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「지금 내게 필요한 변화」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 1,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "remedy_03",
      "topicId": "remedy",
      "title": "나에게 맞는 운동과 생활 습관",
      "question": "나에게 맞는 운동과 생활 습관",
      "purpose": "「나에게 맞는 운동과 생활 습관」에 답한다. 실제 상황에서 시험하고 점검할 행동을 정한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "일정에 맞는 짧은 활동과 회복 시간을 정하고 부담이 늘면 조정한다.",
      "difference": "이 장은 일정에 맞는 짧은 활동과 회복 시간을 정하고 부담이 늘면 조정한다. 색·물건의 효능을 보장하지 않고 관찰 가능한 선택에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「부족한 오행을 해석하는 방법」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [
        "deep_remedy"
      ],
      "order": 2,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "remedy_04",
      "topicId": "remedy",
      "title": "추천하는 공부와 자기계발",
      "question": "추천하는 공부와 자기계발",
      "purpose": "「추천하는 공부와 자기계발」에 답한다. 실제 상황에서 시험하고 점검할 행동을 정한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "현재 목표와 연결되는 학습 과제를 결과물로 점검한다.",
      "difference": "이 장은 현재 목표와 연결되는 학습 과제를 결과물로 점검한다. 색·물건의 효능을 보장하지 않고 관찰 가능한 선택에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「나에게 맞는 운동과 생활 습관」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [],
      "order": 3,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "remedy_05",
      "topicId": "remedy",
      "title": "상징적 의미를 담은 행운의 장소",
      "question": "상징적 의미를 담은 행운의 장소",
      "purpose": "「상징적 의미를 담은 행운의 장소」에 답한다. 실제 상황에서 시험하고 점검할 행동을 정한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "장소를 상징과 기분 전환의 선택지로 소개하고 효능을 보장하지 않는다.",
      "difference": "이 장은 장소를 상징과 기분 전환의 선택지로 소개하고 효능을 보장하지 않는다. 색·물건의 효능을 보장하지 않고 관찰 가능한 선택에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「추천하는 공부와 자기계발」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [
        "deep_places"
      ],
      "order": 4,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "remedy_06",
      "topicId": "remedy",
      "title": "지금 버려야 할 행동 습관",
      "question": "지금 버려야 할 행동 습관",
      "purpose": "「지금 버려야 할 행동 습관」에 답한다. 실제 상황에서 시험하고 점검할 행동을 정한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "소모적 습관의 시작 신호를 기록하고 대체 행동을 정한다.",
      "difference": "이 장은 소모적 습관의 시작 신호를 기록하고 대체 행동을 정한다. 색·물건의 효능을 보장하지 않고 관찰 가능한 선택에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「상징적 의미를 담은 행운의 장소」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [
        "reading_transform"
      ],
      "order": 5,
      "state": "draft",
      "sourceRuleIds": [],
      "core": false
    },
    {
      "id": "remedy_07",
      "topicId": "remedy",
      "title": "앞으로 1년간의 실천 계획",
      "question": "앞으로 1년간의 실천 계획",
      "purpose": "「앞으로 1년간의 실천 계획」에 답한다. 실제 상황에서 시험하고 점검할 행동을 정한다.",
      "requiredEvidence": [
        "앞선 채택 판단과 행동 전략",
        "실행 제약과 점검 기준"
      ],
      "example": "한 해 목표를 월별 점검·조정·중단 기준을 갖춘 실행 계획으로 만든다.",
      "difference": "이 장은 한 해 목표를 월별 점검·조정·중단 기준을 갖춘 실행 계획으로 만든다. 색·물건의 효능을 보장하지 않고 관찰 가능한 선택에 답한다.",
      "avoid": [
        "다른 챕터의 동일 결론·사례",
        "실제 개인 사실 추정",
        "근거 없는 시기·미래 사건 확정",
        "앞 장 「지금 버려야 할 행동 습관」의 결론·사례 재설명"
      ],
      "targetMin": 600,
      "targetMax": 1000,
      "visual": "실천 체크리스트",
      "legacyIds": [
        "c20",
        "life_action",
        "life_actions"
      ],
      "order": 6,
      "state": "draft",
      "sourceRuleIds": [],
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
function find(catalog,chapter){var id=chapter && chapter.id,base=chapter && chapter.base;return (catalog.chapters || []).find(function(c){return c.id===id;}) || (catalog.chapters || []).find(function(c){return c.legacyIds.indexOf(id)>=0 || c.legacyIds.indexOf(base)>=0;}) || null;}
function instruction(c){if(!c)return '';return '[개별 챕터 계약]\n핵심 질문: '+c.question+'\n목표: '+c.purpose+'\n근거 검토: '+c.requiredEvidence.join(' / ')+'\n현실 장면: '+c.example+'\n차별점: '+c.difference+'\n반복 금지: '+c.avoid.join(' / ')+'\n목표 '+c.targetMin+'~'+c.targetMax+'자. 근거가 부족하면 분량을 채우지 않는다. 첫 문장은 핵심 질문에 답하고 장점·취약점·반대 조건·관찰 가능한 전략으로 확장한다. 사례는 가정이며 사용자의 실제 경험으로 쓰지 않는다.';}

function generationChapter(existing,c,sd){
 var R=root.ReportV2,sections={self:1,wealth:5,career:4,love:6,relationships:7,timing:11,health:8,creative:7,remedy:14},i=sections[c.topicId]==null?1:sections[c.topicId],basic=R.ReadingFlow.card(sd,i),core={};
 R.ReadingFlow.FIELDS.forEach(function(f){core[f[0]]=f[0]==='why'?basic.why:'';});
 var oldScenes=(existing && existing.scenes || []).filter(function(scene){return !scene.readingRole;}).map(function(scene){return Object.assign({},scene,{readingSupplementary:true});});
 var id=existing?existing.id:c.id;
 return Object.assign({},existing || {},{id:id,base:existing?existing.base:c.id,title:c.title,act:existing?existing.act:i+1,kind:'life',aiEnabled:true,readingSupplementary:false,readingCore:core,readingSection:i+1,editorialContractId:c.id,editorialTopicId:c.topicId,editorialDraft:true,readingDeferred:true,readingNotice:'이 장의 풀이를 준비하고 있습니다.',scenes:[{sceneId:id+'_editorial_header',sceneType:'chapterIntro',compact:true}].concat(R.ReadingFlow.scenes(core,id)).concat([{sceneId:id+'_editorial_end',sceneType:'chapterEnding'}]).concat(oldScenes)});
}
function prepare(rep,published,sd){
 var source=(rep.chapters || []).slice(),catalog=published || defaults(),seed=defaults(),active=(catalog.chapters || []).filter(function(c){return c.state==='active'&&catalog.topics.some(function(t){return t.id===c.topicId&&t.enabled;});}),out=[],archive=[];
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
var api={defaults:defaults,questions:QUESTIONS,cleanContext:cleanContext,contextLabels:contextLabels,find:find,instruction:instruction,prepare:prepare};
root.MantraEditorial=api;var R=root.ReportV2=root.ReportV2 || {};R.Editorial=api;
})(typeof window!=='undefined'?window:globalThis);
