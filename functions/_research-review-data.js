// Sanitized, authenticated research snapshot. Never imports operational backups.
export const researchReview = {
  "version": "research-review-2026-10-17.1",
  "asOf": "2026-10-17",
  "sourceSnapshot": "2026-10-16 기존 자료 + 2026-10-17 문헌 조사",
  "scope": "합성 명조의 원문 대조 검수 기록. 운영 DB의 현재 게시 상태를 조회하는 화면은 아닙니다.",
  "limitations": [
    "Codex 단독 원문 검수이며 독립 전문가 합의 판정이 아닙니다.",
    "장간·근 참조 확인과 실효 강도·최종 규칙 판정은 다릅니다.",
    "문헌은 온라인 전사본이며 원판 교감·경험적 예측 검증은 완료하지 않았습니다.",
    "모든 사례의 최종 판정은 유보입니다. 게시·AI 생성·운영 데이터 수정 기능이 없습니다."
  ],
  "sources": [
    {
      "id": "YH",
      "title": "淵海子平 卷一·地支藏遁歌",
      "url": "https://sajumania.com/ebook/to01-06/to01-06-01-61.htm",
      "layer": "고전 원문 전사",
      "locator": "lines 12–16; digital transcription"
    },
    {
      "id": "ZP6",
      "title": "子平真詮·得時不旺失時不弱",
      "url": "https://www.donglishuzhai.net/chapter/3719.html",
      "layer": "collated original transcription",
      "locator": "lines 50–53"
    },
    {
      "id": "SM2-original",
      "title": "SM2-original",
      "url": "https://zh.wikisource.org/zh-hant/三命通會/卷二",
      "layer": "三命通會 원문 전사",
      "locator": "論地支 辰/午/戌 paragraphs lines 181,185,192"
    },
    {
      "id": "ZP7-original",
      "title": "ZP7-original",
      "url": "https://www.donglishuzhai.net/chapter/3720.html",
      "layer": "沈氏原文 전사",
      "locator": "lines 50–59"
    },
    {
      "id": "ZP14",
      "title": "子平真詮·用神配氣候得失",
      "url": "https://www.donglishuzhai.net/chapter/3727.html",
      "layer": "collated original transcription",
      "locator": "lines 48–59"
    },
    {
      "id": "ZP17-original",
      "title": "ZP17-original",
      "url": "https://8s8s.com/text/literature/31/18047.612262.html",
      "layer": "沈氏原文 대체 전사",
      "locator": "lines 26–55"
    },
    {
      "id": "ZP20-original",
      "title": "ZP20-original",
      "url": "https://www.donglishuzhai.net/chapter/3733.html",
      "layer": "沈氏原文 교정 전사",
      "locator": "lines 48–65"
    },
    {
      "id": "ZP5",
      "title": "子平真詮·十干合而不合",
      "url": "https://www.donglishuzhai.net/chapter/3718.html",
      "layer": "original text and marked editorial objections",
      "locator": "lines 48–57"
    },
    {
      "id": "XU7-commentary",
      "title": "XU7-commentary",
      "url": "https://ncc.com.tw/fate/paleo/bg/bg_032.htm",
      "layer": "徐樂吾評註 전사; 沈氏 본문과 혼합 수록되어 대조 필요",
      "locator": "lines 429–441, 470–483; transformation discussion 227–239"
    }
  ],
  "cases": [
    {
      "id": "G01-N",
      "group": "G01",
      "split": "development",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": false,
        "pillars": {
          "year": "庚子",
          "month": "戊子",
          "day": "乙未",
          "hour": null
        }
      },
      "finalStatus": "held",
      "observation": "자월 을목에 경금 관성과 무토 재성이 보인다. 자수의 생조와 미지 작용을 함께 봐야 하며 시주가 없어 관성의 상대적 과다를 확정할 수 없다.",
      "blockers": [
        "unknown-hour",
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": null,
          "hiddenStems": null,
          "rootReference": null,
          "rootVerdict": "unknown-hour"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G01-Y",
      "group": "G01",
      "split": "development",
      "ruleId": "D27-20261016-M-risk",
      "raw": {
        "gender": "F",
        "hourKnown": false,
        "pillars": {
          "year": "庚子",
          "month": "戊子",
          "day": "乙未",
          "hour": null
        },
        "targetYear": 2028,
        "annualPillar": "戊申",
        "daewoonPillar": "壬午",
        "periodContextStatus": "calendar-context-present"
      },
      "finalStatus": "held",
      "observation": "자월 을목에 경금 관성과 무토 재성이 보인다. 자수의 생조와 미지 작용을 함께 봐야 하며 시주가 없어 관성의 상대적 과다를 확정할 수 없다.",
      "blockers": [
        "unknown-hour",
        "annual-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": null,
          "hiddenStems": null,
          "rootReference": null,
          "rootVerdict": "unknown-hour"
        }
      ],
      "annualReview": "운 간지는 확인되지만 원국 지원·설기·제어와 운의 합충형·조후를 합성해 해당 연도 재성 총작용과 감당 능력 초과를 판정할 원문 기준이 없다. 운 천간이나 재성의 존재로 손재 위험을 확정하지 않는다.",
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G02-N",
      "group": "G02",
      "split": "development",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "壬寅",
          "month": "丙午",
          "day": "壬午",
          "hour": "甲辰"
        }
      },
      "finalStatus": "held",
      "observation": "오월 임수에 병화 재성·연간 임수 비겁이 함께 보인다. 오화의 반복만으로 재다신약을 정할 수 없고 갑목·진지와 생조의 합성 판단이 남는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "寅",
          "hiddenStems": [
            "甲",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "午",
          "hiddenStems": [
            "丁",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "午",
          "hiddenStems": [
            "丁",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": "묘고 근 예시",
          "rootVerdict": "source-explicit-root-reference-only"
        }
      ],
      "annualReview": null,
      "effectReview": {
        "climate": "오월 임수. 월·일 오화와 병화 재성, 갑목 식상, 연간 임수 비겁이 함께 있다. 진 속 계수와 임수의 진 묘고 참조는 확인되므로 여름이라는 이유만으로 무근·신약이라 할 수 없다.",
        "effective": "해당 원국의 알려진 지지에는 진 근에 대한 술충이 보이지 않는다. 이는 진 근의 무손상·충분한 실효 강도를 증명하지 않는다. 인오 부분 배치·화 재성과 갑목 설기가 수 지원보다 우세한지는 유보.",
        "needs": "수 묘고 근의 실제 지원과 여름 화·목 설기의 상대 작용. 부분 조합을 완전 합화로 볼 조건.",
        "relations": [
          {
            "type": "partial-fire-components",
            "positions": [
              "year",
              "month",
              "day"
            ],
            "branches": [
              "寅",
              "午",
              "午"
            ],
            "status": "戌 없음; 완전 寅午戌 세 글자 조합 아님"
          }
        ]
      },
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G03-N",
      "group": "G03",
      "split": "holdout",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "癸卯",
          "month": "癸亥",
          "day": "辛未",
          "hour": "甲午"
        }
      },
      "finalStatus": "held",
      "observation": "해월 신금에 시간 갑목, 시지 오화와 두 계수가 있다. 오화 관성의 존재는 확인되지만 겨울 조후·미지·설기와의 상대 작용이 미정이다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "卯",
          "hiddenStems": [
            "乙"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "亥",
          "hiddenStems": [
            "壬",
            "甲"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "午",
          "hiddenStems": [
            "丁",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G04-N",
      "group": "G04",
      "split": "holdout",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "甲辰",
          "month": "戊辰",
          "day": "己丑",
          "hour": "癸酉"
        }
      },
      "finalStatus": "held",
      "observation": "진월 기토에 계수 재성과 갑목 관성, 무토 및 진·축지가 함께 있다. 재성의 존재와 일간의 약함은 별개여서 전체 강약을 확정하지 않는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "丑",
          "hiddenStems": [
            "癸",
            "辛",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "酉",
          "hiddenStems": [
            "辛"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G04-Y",
      "group": "G04",
      "split": "holdout",
      "ruleId": "D27-20261016-M-risk",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "甲辰",
          "month": "戊辰",
          "day": "己丑",
          "hour": "癸酉"
        },
        "targetYear": 2031,
        "annualPillar": "辛亥",
        "daewoonPillar": "甲戌",
        "periodContextStatus": "calendar-context-present"
      },
      "finalStatus": "held",
      "observation": "진월 기토에 계수 재성과 갑목 관성, 무토 및 진·축지가 함께 있다. 재성의 존재와 일간의 약함은 별개여서 전체 강약을 확정하지 않는다.",
      "blockers": [
        "annual-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "丑",
          "hiddenStems": [
            "癸",
            "辛",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "酉",
          "hiddenStems": [
            "辛"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": "운 간지는 확인되지만 원국 지원·설기·제어와 운의 합충형·조후를 합성해 해당 연도 재성 총작용과 감당 능력 초과를 판정할 원문 기준이 없다. 운 천간이나 재성의 존재로 손재 위험을 확정하지 않는다.",
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G05-N",
      "group": "G05",
      "split": "development",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "乙巳",
          "month": "乙酉",
          "day": "戊寅",
          "hour": "癸亥"
        }
      },
      "finalStatus": "held",
      "observation": "유월 무토에 두 을목 관성과 계수 재성이 투간한다. 관성 두 글자만으로 과다라 정하지 않으며 사·인·해의 지지 작용과 계절을 함께 봐야 한다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "酉",
          "hiddenStems": [
            "辛"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "寅",
          "hiddenStems": [
            "甲",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "亥",
          "hiddenStems": [
            "壬",
            "甲"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G06-N",
      "group": "G06",
      "split": "development",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "丙午",
          "month": "庚寅",
          "day": "丁酉",
          "hour": "壬寅"
        }
      },
      "finalStatus": "held",
      "observation": "인월 정화에 경금 재성·임수 관성, 병화 비겁과 두 인목이 있다. 인비 지원과 재성의 상대 작용을 평가할 기준이 부족하다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "午",
          "hiddenStems": [
            "丁",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "寅",
          "hiddenStems": [
            "甲",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "酉",
          "hiddenStems": [
            "辛"
          ],
          "rootReference": "음간 장생 예외: 여기와 비교하는 근",
          "rootVerdict": "source-explicit-root-reference-only"
        },
        {
          "position": "hour",
          "branch": "寅",
          "hiddenStems": [
            "甲",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": {
        "climate": "인월 정화. 병화 비겁, 인의 갑·병, 오의 정화가 지원 단서이며 경금 재성·임수 관성도 있다. 정유는 장간의 화 근이 아니라 ZP6의 음간 장생 예외로만 기록한다.",
        "effective": "지지에 유를 직접 충하는 묘는 없지만 유의 근이 유효하다는 충분조건은 아니다. 정임 합을 관성 소멸이나 목으로 변환해 지원 증가로 자동 처리하지 않는다.",
        "needs": "음간 장생의 정성적 참조와 오·인 화 지원을 구별한 실효 평가, 정임 합의 관성 보존·변화 조건.",
        "relations": [
          {
            "type": "partial-fire-components",
            "positions": [
              "year",
              "month",
              "hour"
            ],
            "branches": [
              "午",
              "寅",
              "寅"
            ],
            "status": "戌 없음; 완전 화 조합 아님"
          },
          {
            "type": "stem-combination-pair",
            "positions": [
              "day",
              "hour"
            ],
            "branches": [],
            "stems": [
              "丁",
              "壬"
            ],
            "status": "丁壬 합 배속 검토; 합거·목 합화 미확정"
          }
        ]
      },
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G07-N",
      "group": "G07",
      "split": "holdout",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "丁未",
          "month": "丁未",
          "day": "癸未",
          "hour": "丙辰"
        }
      },
      "finalStatus": "held",
      "observation": "미월 계수에 세 미지와 진지, 정·정·병화가 있다. 토 관성 집중의 관찰은 가능하지만 통근·조후·특수 편중 검토 없이 관다신약을 확정하지 않는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G07-Y",
      "group": "G07",
      "split": "holdout",
      "ruleId": "D27-20261016-M-risk",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "丁未",
          "month": "丁未",
          "day": "癸未",
          "hour": "丙辰"
        },
        "targetYear": 2030,
        "annualPillar": "庚戌",
        "daewoonPillar": "癸丑",
        "periodContextStatus": "calendar-context-present"
      },
      "finalStatus": "held",
      "observation": "미월 계수에 세 미지와 진지, 정·정·병화가 있다. 토 관성 집중의 관찰은 가능하지만 통근·조후·특수 편중 검토 없이 관다신약을 확정하지 않는다.",
      "blockers": [
        "annual-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": "운 간지는 확인되지만 원국 지원·설기·제어와 운의 합충형·조후를 합성해 해당 연도 재성 총작용과 감당 능력 초과를 판정할 원문 기준이 없다. 운 천간이나 재성의 존재로 손재 위험을 확정하지 않는다.",
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G08-N",
      "group": "G08",
      "split": "holdout",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": false,
        "pillars": {
          "year": "戊申",
          "month": "癸亥",
          "day": "戊申",
          "hour": null
        }
      },
      "finalStatus": "held",
      "observation": "해월 무토에 계수 재성과 무토 비겁, 두 신지가 보인다. 수 계절만으로 재성 과도를 판정할 수 없고 시주도 미상이다.",
      "blockers": [
        "unknown-hour",
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "申",
          "hiddenStems": [
            "庚",
            "壬",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "亥",
          "hiddenStems": [
            "壬",
            "甲"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "申",
          "hiddenStems": [
            "庚",
            "壬",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": null,
          "hiddenStems": null,
          "rootReference": null,
          "rootVerdict": "unknown-hour"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G09-N",
      "group": "G09",
      "split": "development",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "己酉",
          "month": "己巳",
          "day": "庚寅",
          "hour": "乙酉"
        }
      },
      "finalStatus": "held",
      "observation": "사월 경금에 을목 재성, 두 기토와 두 유지가 있다. 사화 관성과 인비 지원을 함께 비교해야 하므로 관성의 상대 과다를 유보한다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "酉",
          "hiddenStems": [
            "辛"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "寅",
          "hiddenStems": [
            "甲",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "酉",
          "hiddenStems": [
            "辛"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G10-N",
      "group": "G10",
      "split": "development",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "庚戌",
          "month": "丙戌",
          "day": "己卯",
          "hour": "甲子"
        }
      },
      "finalStatus": "held",
      "observation": "술월 기토에 자수 재성·갑목 관성과 병화, 두 술지가 있다. 화토 지원의 존재만으로 신강을 확정하거나 자수만으로 재다신약을 확정하지 않는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "卯",
          "hiddenStems": [
            "乙"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G10-Y",
      "group": "G10",
      "split": "development",
      "ruleId": "D27-20261016-M-risk",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "庚戌",
          "month": "丙戌",
          "day": "己卯",
          "hour": "甲子"
        },
        "targetYear": 2029,
        "annualPillar": "己酉",
        "daewoonPillar": "壬辰",
        "periodContextStatus": "calendar-context-present"
      },
      "finalStatus": "held",
      "observation": "술월 기토에 자수 재성·갑목 관성과 병화, 두 술지가 있다. 화토 지원의 존재만으로 신강을 확정하거나 자수만으로 재다신약을 확정하지 않는다.",
      "blockers": [
        "annual-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "卯",
          "hiddenStems": [
            "乙"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": "운 간지는 확인되지만 원국 지원·설기·제어와 운의 합충형·조후를 합성해 해당 연도 재성 총작용과 감당 능력 초과를 판정할 원문 기준이 없다. 운 천간이나 재성의 존재로 손재 위험을 확정하지 않는다.",
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G11-N",
      "group": "G11",
      "split": "holdout",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "辛亥",
          "month": "辛卯",
          "day": "丙申",
          "hour": "庚寅"
        }
      },
      "finalStatus": "held",
      "observation": "묘월 병화에 두 신금·경금 재성과 해수가 보이고 인·묘목 지원도 있다. 관성인 수의 작용은 목의 생조·조후와 분리해 확정할 수 없다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "亥",
          "hiddenStems": [
            "壬",
            "甲"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "卯",
          "hiddenStems": [
            "乙"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "申",
          "hiddenStems": [
            "庚",
            "壬",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "寅",
          "hiddenStems": [
            "甲",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G12-N",
      "group": "G12",
      "split": "holdout",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "壬子",
          "month": "戊申",
          "day": "丙戌",
          "hour": "癸巳"
        }
      },
      "finalStatus": "held",
      "observation": "신월 병화에 임·계수 관성과 신금 재성, 사화와 무·술토가 있다. 비겁 지원·설기·재성 작용의 전체 비교가 남는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "申",
          "hiddenStems": [
            "庚",
            "壬",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": "묘고 근 예시",
          "rootVerdict": "source-explicit-root-reference-only"
        },
        {
          "position": "hour",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": {
        "climate": "신월 병화. 일지 술의 정화 묘고 참조 외에 시지 사에는 병화가 실제 배속된다. 임·계 관성, 무토 식상과 신금 재성이 함께 있어 근이 있다는 사실만으로 감당 가능을 확정하지 않는다.",
        "effective": "알려진 지지에 술을 직접 충하는 진은 없다. 그러나 사신 합·형이 사의 병화 및 신의 금수 작용에 미치는 효과는 유보한다. 신자 두 글자를 완전 수국으로 처리하지 않는다.",
        "needs": "술의 묘고 근과 사의 직접 화 배속을 구별한 지원 평가, 사신 합형 처리 관법, 수 관성·토 설기와의 상대 작용.",
        "relations": [
          {
            "type": "六合-pair",
            "positions": [
              "month",
              "hour"
            ],
            "branches": [
              "申",
              "巳"
            ],
            "status": "사신 합 배속; 합화 미확정"
          },
          {
            "type": "刑-components",
            "positions": [
              "month",
              "hour"
            ],
            "branches": [
              "申",
              "巳"
            ],
            "status": "ZP7의 巳申 형 용례도 검토. 합과 형이 병존하는 효과 미확정"
          },
          {
            "type": "partial-water-components",
            "positions": [
              "year",
              "month"
            ],
            "branches": [
              "子",
              "申"
            ],
            "status": "辰 없음; 완전 申子辰 조합 아님"
          }
        ]
      },
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G13-N",
      "group": "G13",
      "split": "development",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "壬子",
          "month": "癸丑",
          "day": "乙巳",
          "hour": "癸未"
        }
      },
      "finalStatus": "held",
      "observation": "축월 을목에 임·계·계수 인성이 투간하고 천간 금은 없다. 천간에 관성이 없다는 사실을 원국 무관으로 확대하지 않고 축·사·미의 지장간과 조후를 검토해야 한다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "丑",
          "hiddenStems": [
            "癸",
            "辛",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G13-Y",
      "group": "G13",
      "split": "development",
      "ruleId": "D27-20261016-M-risk",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "壬子",
          "month": "癸丑",
          "day": "乙巳",
          "hour": "癸未"
        },
        "targetYear": 2028,
        "annualPillar": "戊申",
        "daewoonPillar": "丁未",
        "periodContextStatus": "calendar-context-present"
      },
      "finalStatus": "held",
      "observation": "축월 을목에 임·계·계수 인성이 투간하고 천간 금은 없다. 천간에 관성이 없다는 사실을 원국 무관으로 확대하지 않고 축·사·미의 지장간과 조후를 검토해야 한다.",
      "blockers": [
        "annual-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "丑",
          "hiddenStems": [
            "癸",
            "辛",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": "운 간지는 확인되지만 원국 지원·설기·제어와 운의 합충형·조후를 합성해 해당 연도 재성 총작용과 감당 능력 초과를 판정할 원문 기준이 없다. 운 천간이나 재성의 존재로 손재 위험을 확정하지 않는다.",
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G14-N",
      "group": "G14",
      "split": "development",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "甲寅",
          "month": "庚午",
          "day": "壬辰",
          "hour": "庚戌"
        }
      },
      "finalStatus": "held",
      "observation": "오월 임수에 두 경금 인성과 갑목, 진·술지가 있다. 오화 재성의 계절 작용과 경금 지원을 합성할 기준 없이 재다신약을 확정하지 않는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "寅",
          "hiddenStems": [
            "甲",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "午",
          "hiddenStems": [
            "丁",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": "묘고 근 예시",
          "rootVerdict": "source-explicit-root-reference-only"
        },
        {
          "position": "hour",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": {
        "climate": "오월 임수. 갑목 식상·두 경금 인성과 인오술 구성, 일지 진의 계수 배속이 함께 보인다. 인성 천간 두 개를 수의 충분한 지원으로 바로 환산하지 않는다.",
        "effective": "일지 진 근에 술충이 직접 걸리고 술은 인오술 구성에도 참여한다. SM2의 개고 관점과 ZP17의 수 성분 손상 경계를 분리한다. 완전 구성만으로 진술충이 풀리거나 진 근이 증강·소멸한다고 확정할 수 없다.",
        "needs": "화 조합과 진술충의 우선순위, 수 묘고 근의 실효 보존·손상, 경금 지원과 화·목 작용의 합성 판단.",
        "relations": [
          {
            "type": "沖-pair",
            "positions": [
              "day",
              "hour"
            ],
            "branches": [
              "辰",
              "戌"
            ],
            "status": "진술 대립 배속 확인; 근 소멸·개고 강화 미확정"
          },
          {
            "type": "full-fire-components",
            "positions": [
              "year",
              "month",
              "hour"
            ],
            "branches": [
              "寅",
              "午",
              "戌"
            ],
            "status": "세 구성 글자 확인; 실제 합화 및 충 해소 미확정"
          }
        ]
      },
      "overlap": {
        "confirmedFacts": [
          "甲寅 / 庚午 / 壬辰 / 庚戌의 일지 辰·시지 戌은 인접한다.",
          "연지 寅·월지 午·시지 戌의 세 구성원이 모두 있다.",
          "戌은 인오술 구성과 진술충에 동시에 참여한다.",
          "천간 甲庚壬庚에는 丙丁이 없고 두 庚이 있다. 부재는 천간에 한정한다."
        ],
        "analysis": "壬의 辰 근 참조는 유지하지만 인접 辰戌沖 때문에 실효 지원을 추가 검토한다. 완전 寅午戌 구성·午월은 화 작용 검토 근거다. 그러나 이를 곧 완전 합화·水根 소멸로 바꾸지 않는다. 평주의 천간 지원 조건을 검토하면 丙丁 천간이 없다는 제한이 보이지만, 해당 설명만으로 모든 조건이 정리되는 것은 아니다. 두 庚의 금생수 가능성과 甲의 설기도 실제 효력 검토가 남는다.",
        "needs": "같은 午월·壬辰·庚 인성·寅午戌/辰戌 경합의 대조 명조 또는 동일 조건의 독립 적용 논증",
        "hypotheses": [
          {
            "id": "fire-meeting-resolves-clash",
            "status": "unproven",
            "missing": "寅午戌 실효 결속/합화와 戌의 공유 처리, 인접 진술충 해소 근거"
          },
          {
            "id": "clash-destroys-water-root",
            "status": "unproven",
            "missing": "癸 성분의 실효 손상·보존, 다른 지원과의 종합 근거"
          }
        ]
      },
      "comparators": [
        {
          "id": "L01",
          "pillars": [
            "丙子",
            "甲午",
            "甲戌",
            "戊辰"
          ],
          "url": "https://ncc.com.tw/fate/paleo/bg/bg_032.htm",
          "locator": "刑沖會合解法·陸宗輿例, lines 436–441",
          "layer": "徐樂吾評註中的案例說明",
          "authorClaim": "午戌會的解沖作用會被辰戌沖改變。",
          "match": [
            "午·戌·辰競合",
            "辰戌兩支相鄰"
          ],
          "differences": [
            "甲日而非壬日",
            "有子午沖、無寅",
            "根與喜用角色不同"
          ],
          "notEstablished": "G14的辰中癸是否受損、寅午戌是否被破"
        },
        {
          "id": "L02",
          "pillars": [
            "庚辰",
            "壬午",
            "甲午",
            "丙寅"
          ],
          "url": "https://zh.wikisource.org/zh-hant/滴天髓闡微",
          "locator": "木奔南而軟怯·庚辰壬午甲午丙寅例, lines 9259–9277",
          "layer": "任氏闡釋命例，不是滴天髓短句本經",
          "authorClaim": "任氏把辰的晦火、蓄水、生金作用作為此例的調節關鍵。",
          "match": [
            "午月",
            "庚金、壬水、辰、寅午並存"
          ],
          "differences": [
            "甲日",
            "無戌沖辰",
            "丙透且兩午",
            "辰在年而非日"
          ],
          "notEstablished": "沒有辰戌沖的此例不能證明G14遭沖仍保根"
        },
        {
          "id": "L03",
          "pillars": [
            "庚寅",
            "癸未",
            "甲午",
            "甲戌"
          ],
          "url": "https://zh.wikisource.org/zh-hant/滴天髓闡微",
          "locator": "疾病篇·庚寅癸未甲午甲戌例, lines 10318–10336",
          "layer": "任氏命例；只取結構論述，不採信健康事件為實證",
          "authorClaim": "作者認為庚癸缺乏地支承載，戌參與火局後金水難以發揮。",
          "match": [
            "寅午戌組成",
            "庚與水干透出"
          ],
          "differences": [
            "未月而非午月",
            "癸而非壬",
            "甲日",
            "無辰"
          ],
          "notEstablished": "G14有辰和兩庚，不能直接套用此例失效結論"
        },
        {
          "id": "L06",
          "pillars": [
            "壬戌",
            "甲辰",
            "甲戌",
            "丙寅"
          ],
          "url": "https://zh.wikisource.org/zh-hant/滴天髓闡微",
          "locator": "出身篇·壬戌甲辰甲戌丙寅例, lines 10386–10403",
          "layer": "任氏命例",
          "authorClaim": "有辰戌結構但作者仍結合木餘氣、比祿與透火分析全局。",
          "match": [
            "辰戌並存",
            "木火透出和支持條件需合看"
          ],
          "differences": [
            "甲日辰月",
            "兩戌",
            "寅祿支持",
            "根成分不是壬辰癸或丙戌丁"
          ],
          "notEstablished": "此例沒有替G14/G15的特定水火根提供保留或損傷定量結論"
        }
      ]
    },
    {
      "id": "G15-N",
      "group": "G15",
      "split": "holdout",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": false,
        "pillars": {
          "year": "乙卯",
          "month": "丙戌",
          "day": "丙辰",
          "hour": null
        }
      },
      "finalStatus": "held",
      "observation": "술월 병화에 을목 인성·병화 비겁과 진·술지가 있다. 천간에 수가 없다는 관찰은 원국 무관 판정이 아니며 시주가 없어 유보한다.",
      "blockers": [
        "unknown-hour",
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "卯",
          "hiddenStems": [
            "乙"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": "묘고 근 예시",
          "rootVerdict": "source-explicit-root-reference-only"
        },
        {
          "position": "day",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": null,
          "hiddenStems": null,
          "rootReference": null,
          "rootVerdict": "unknown-hour"
        }
      ],
      "annualReview": null,
      "effectReview": {
        "climate": "술월 병화, 을목 인성과 월간 병화 비겁. 묘·진의 을목, 술의 정화 배속은 확인되지만 시간·시지는 없다. 알려진 술 근의 존재와 전체 근 평가 미완성은 구별한다.",
        "effective": "월지 술 근은 묘술 합과 진술충에 동시에 연결된다. ZP7의 묘술 합 해충 예시를 이 다른 배치에 그대로 적용하지 않는다. SM2와 ZP17의 묘고 충 관점도 구분하며, 시주 미상으로 추가 합충형 가능성은 열어 둔다.",
        "needs": "묘술 합과 진술충 동시 배치의 작용 순서·근 보존, 시주 자료, 전체 화 지원·토 설기 및 금 재성의 상대 작용.",
        "relations": [
          {
            "type": "六合-pair",
            "positions": [
              "year",
              "month"
            ],
            "branches": [
              "卯",
              "戌"
            ],
            "status": "묘술 합 배속; 화 합화 미확정"
          },
          {
            "type": "沖-pair",
            "positions": [
              "month",
              "day"
            ],
            "branches": [
              "戌",
              "辰"
            ],
            "status": "술 근에 진충 배속; 합으로 해소 여부 미확정"
          }
        ]
      },
      "overlap": {
        "confirmedFacts": [
          "乙卯 / 丙戌 / 丙辰 / 시주 미상의 월지 戌·일지 辰은 인접한다.",
          "연지 卯·월지 戌의 합 배속과 월지 戌·일지 辰의 충 배속이 겹친다.",
          "戌은 卯戌合과 辰戌沖의 공유 지지다.",
          "알려진 월간·일간은 丙이고 연간은 乙이다. 시간·시지는 비어 있다."
        ],
        "analysis": "丙의 戌 묘고 근 참조와 丁 배속은 확인된다. 卯戌의 화 방향과 丙 투간을 검토할 수 있으나 이것만으로 합화 또는 해충을 확정하지 않는다. ZP7의 卯戌 해충 예시는 원래 卯酉沖을 다루므로 이번 辰戌沖에 그대로 대입할 수 없다. 근 위치와 충 위치가 같다는 관찰을 기록하되 卯 인성의 지원·土 설기 및 미상 시주의 추가 작용을 남겨 둔다.",
        "needs": "시주 자료 또는 시주 미상 전용 안정성 절차; 같은 丙日·戌月·卯戌/辰戌 배치의 독립 적용 논증",
        "hypotheses": [
          {
            "id": "liu-he-preserves-fire-root",
            "status": "unproven",
            "missing": "卯戌의 실효 합화/결속과 인접 辰戌沖의 해소 우선순위"
          },
          {
            "id": "clash-destroys-fire-root",
            "status": "unproven",
            "missing": "戌中丁의 손상·보존 정도 및 생조/설기 합성, 시주 정보"
          }
        ]
      },
      "comparators": [
        {
          "id": "L04",
          "pillars": [
            "己卯",
            "甲戌",
            "甲子",
            "己巳"
          ],
          "url": "https://ncc.com.tw/fate/paleo/bg/bg_032.htm",
          "locator": "十干合而不合·張紹曾例及假化討論, lines 75–80, 214–220",
          "layer": "徐評的天干化氣/假化討論，非純地支保根專例",
          "authorClaim": "同例中卯戌相合與假化條件分開論述，不以有合直接認定真化。",
          "match": [
            "年卯、月戌",
            "卯戌相鄰"
          ],
          "differences": [
            "甲日",
            "日子而非辰",
            "無辰戌沖",
            "天干甲己化氣主題"
          ],
          "notEstablished": "不能從化氣格案例推斷G15的丁火根保留比例"
        },
        {
          "id": "L05",
          "pillars": [
            "甲寅",
            "丁丑",
            "丁卯",
            "庚戌"
          ],
          "url": "https://zh.wikisource.org/zh-hant/滴天髓闡微",
          "locator": "出身篇·甲寅丁丑丁卯庚戌例, lines 10405–10423",
          "layer": "任氏命例；只取作説明，不當作可重現實驗",
          "authorClaim": "作者在此局的配合中認為卯戌合與丑土作用相容。",
          "match": [
            "火日干",
            "卯戌配對",
            "木火支持線索"
          ],
          "differences": [
            "丁日、丑月",
            "卯日戌時",
            "無辰戌沖",
            "時柱完整"
          ],
          "notEstablished": "沒有競合的此例不能證明G15合可解除辰戌沖"
        },
        {
          "id": "L06",
          "pillars": [
            "壬戌",
            "甲辰",
            "甲戌",
            "丙寅"
          ],
          "url": "https://zh.wikisource.org/zh-hant/滴天髓闡微",
          "locator": "出身篇·壬戌甲辰甲戌丙寅例, lines 10386–10403",
          "layer": "任氏命例",
          "authorClaim": "有辰戌結構但作者仍結合木餘氣、比祿與透火分析全局。",
          "match": [
            "辰戌並存",
            "木火透出和支持條件需合看"
          ],
          "differences": [
            "甲日辰月",
            "兩戌",
            "寅祿支持",
            "根成分不是壬辰癸或丙戌丁"
          ],
          "notEstablished": "此例沒有替G14/G15的特定水火根提供保留或損傷定量結論"
        }
      ]
    },
    {
      "id": "G16-N",
      "group": "G16",
      "split": "holdout",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "丙辰",
          "month": "壬辰",
          "day": "己亥",
          "hour": "丁卯"
        }
      },
      "finalStatus": "held",
      "observation": "진월 기토에 임수·해수 재성과 병·정화 인성이 함께 있다. 재성 존재가 일간의 감당 능력 초과를 의미하지 않으며 진·묘의 작용도 남는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "亥",
          "hiddenStems": [
            "壬",
            "甲"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "卯",
          "hiddenStems": [
            "乙"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G16-Y",
      "group": "G16",
      "split": "holdout",
      "ruleId": "D27-20261016-M-risk",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "丙辰",
          "month": "壬辰",
          "day": "己亥",
          "hour": "丁卯"
        },
        "targetYear": 2031,
        "annualPillar": "辛亥",
        "daewoonPillar": "丁酉",
        "periodContextStatus": "calendar-context-present"
      },
      "finalStatus": "held",
      "observation": "진월 기토에 임수·해수 재성과 병·정화 인성이 함께 있다. 재성 존재가 일간의 감당 능력 초과를 의미하지 않으며 진·묘의 작용도 남는다.",
      "blockers": [
        "annual-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "辰",
          "hiddenStems": [
            "乙",
            "戊",
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "亥",
          "hiddenStems": [
            "壬",
            "甲"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "卯",
          "hiddenStems": [
            "乙"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": "운 간지는 확인되지만 원국 지원·설기·제어와 운의 합충형·조후를 합성해 해당 연도 재성 총작용과 감당 능력 초과를 판정할 원문 기준이 없다. 운 천간이나 재성의 존재로 손재 위험을 확정하지 않는다.",
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G17-N",
      "group": "G17",
      "split": "development",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "丁巳",
          "month": "戊申",
          "day": "癸亥",
          "hour": "丁巳"
        }
      },
      "finalStatus": "held",
      "observation": "신월 계수에 무토 관성과 두 정화 재성, 해수·신금 지원 단서가 있다. 무토 투간만으로 관다신약을 정할 수 없다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "申",
          "hiddenStems": [
            "庚",
            "壬",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "亥",
          "hiddenStems": [
            "壬",
            "甲"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G18-N",
      "group": "G18",
      "split": "development",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "戊午",
          "month": "甲寅",
          "day": "丁未",
          "hour": "戊申"
        }
      },
      "finalStatus": "held",
      "observation": "인월 정화에 갑목 인성·두 무토 식상과 신금 재성, 오·미지가 있다. 생조·설기·재성의 상대 작용에 대한 원문 적용 기준이 부족하다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "午",
          "hiddenStems": [
            "丁",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "寅",
          "hiddenStems": [
            "甲",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": "여기 가벼운 근 예시",
          "rootVerdict": "source-explicit-root-reference-only"
        },
        {
          "position": "hour",
          "branch": "申",
          "hiddenStems": [
            "庚",
            "壬",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": {
        "climate": "인월 정화. 월간 갑목이 월지 인의 갑목과 대응하고 미의 정화 여기 참조와 오의 정화 배속이 있다. 두 무토 식상의 설기와 신금 재성 작용도 함께 검토한다.",
        "effective": "명시된 미의 여기 근은 알려진 지지에서 축충을 만나지 않지만 오미 합에 참여한다. 별도의 월지 인목 지원은 신충 대상이다. 인목 지원이 손상될 가능성과 미의 근 존재는 다른 판단이다.",
        "needs": "인신충이 갑목 생조와 신금 재성에 미치는 효과, 오미 합 후 미의 화 성분 실효성, 목화 지원과 토 설기의 상대 작용.",
        "relations": [
          {
            "type": "沖-pair",
            "positions": [
              "month",
              "hour"
            ],
            "branches": [
              "寅",
              "申"
            ],
            "status": "월지 인목 지원 위치의 인신충 배속 확인; 지원 소멸 미확정"
          },
          {
            "type": "六合-pair",
            "positions": [
              "year",
              "day"
            ],
            "branches": [
              "午",
              "未"
            ],
            "status": "오미 합 배속; 합화 및 충 해소 미확정"
          }
        ]
      },
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G19-N",
      "group": "G19",
      "split": "holdout",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "己未",
          "month": "辛未",
          "day": "癸巳",
          "hour": "壬戌"
        }
      },
      "finalStatus": "held",
      "observation": "미월 계수에 기토 관성·신금 인성·임수 비겁과 미·미·술지가 있다. 토의 반복만큼 인비 지원도 검토해야 하므로 상대 과다를 확정하지 않는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G19-Y",
      "group": "G19",
      "split": "holdout",
      "ruleId": "D27-20261016-M-risk",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "己未",
          "month": "辛未",
          "day": "癸巳",
          "hour": "壬戌"
        },
        "targetYear": 2030,
        "annualPillar": "庚戌",
        "daewoonPillar": "丙子",
        "periodContextStatus": "calendar-context-present"
      },
      "finalStatus": "held",
      "observation": "미월 계수에 기토 관성·신금 인성·임수 비겁과 미·미·술지가 있다. 토의 반복만큼 인비 지원도 검토해야 하므로 상대 과다를 확정하지 않는다.",
      "blockers": [
        "annual-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": "운 간지는 확인되지만 원국 지원·설기·제어와 운의 합충형·조후를 합성해 해당 연도 재성 총작용과 감당 능력 초과를 판정할 원문 기준이 없다. 운 천간이나 재성의 존재로 손재 위험을 확정하지 않는다.",
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G20-N",
      "group": "G20",
      "split": "holdout",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "庚申",
          "month": "戊子",
          "day": "戊午",
          "hour": "癸丑"
        }
      },
      "finalStatus": "held",
      "observation": "자월 무토에 계수 재성과 무토 비겁, 오화·축토가 있다. 겨울 조후와 수화 작용이 미정이라 자월만으로 재다신약을 확정하지 않는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "申",
          "hiddenStems": [
            "庚",
            "壬",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "午",
          "hiddenStems": [
            "丁",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "丑",
          "hiddenStems": [
            "癸",
            "辛",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G21-N",
      "group": "G21",
      "split": "development",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "辛酉",
          "month": "癸巳",
          "day": "庚子",
          "hour": "己卯"
        }
      },
      "finalStatus": "held",
      "observation": "사월 경금에 기토 인성·신금 비겁과 계수·자수·묘목이 있다. 관성 사화의 계절 작용과 지원·설기 비교를 거쳐야 한다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "酉",
          "hiddenStems": [
            "辛"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "巳",
          "hiddenStems": [
            "庚",
            "丙",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "卯",
          "hiddenStems": [
            "乙"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G22-N",
      "group": "G22",
      "split": "development",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": false,
        "pillars": {
          "year": "壬戌",
          "month": "己酉",
          "day": "甲子",
          "hour": null
        }
      },
      "finalStatus": "held",
      "observation": "유월 갑목에 기토 재성·임수 인성과 자수가 있다. 생조와 제어가 함께 보이고 시주도 없어 기토의 상대 과다를 확정하지 않는다.",
      "blockers": [
        "unknown-hour",
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "酉",
          "hiddenStems": [
            "辛"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": null,
          "hiddenStems": null,
          "rootReference": null,
          "rootVerdict": "unknown-hour"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G22-Y",
      "group": "G22",
      "split": "development",
      "ruleId": "D27-20261016-M-risk",
      "raw": {
        "gender": "M",
        "hourKnown": false,
        "pillars": {
          "year": "壬戌",
          "month": "己酉",
          "day": "甲子",
          "hour": null
        },
        "targetYear": 2029,
        "annualPillar": "己酉",
        "daewoonPillar": "甲寅",
        "periodContextStatus": "calendar-context-present"
      },
      "finalStatus": "held",
      "observation": "유월 갑목에 기토 재성·임수 인성과 자수가 있다. 생조와 제어가 함께 보이고 시주도 없어 기토의 상대 과다를 확정하지 않는다.",
      "blockers": [
        "unknown-hour",
        "annual-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "戌",
          "hiddenStems": [
            "辛",
            "丁",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "酉",
          "hiddenStems": [
            "辛"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": null,
          "hiddenStems": null,
          "rootReference": null,
          "rootVerdict": "unknown-hour"
        }
      ],
      "annualReview": "운 간지는 확인되지만 원국 지원·설기·제어와 운의 합충형·조후를 합성해 해당 연도 재성 총작용과 감당 능력 초과를 판정할 원문 기준이 없다. 운 천간이나 재성의 존재로 손재 위험을 확정하지 않는다.",
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G23-N",
      "group": "G23",
      "split": "holdout",
      "ruleId": "D27-20261016-L-female-over",
      "raw": {
        "gender": "F",
        "hourKnown": true,
        "pillars": {
          "year": "癸亥",
          "month": "乙卯",
          "day": "丙午",
          "hour": "丙申"
        }
      },
      "finalStatus": "held",
      "observation": "묘월 병화에 계수·해수 관성과 을목 인성·병화 비겁, 오화가 있다. 관성 수의 존재와 인비 지원을 합성하지 않고 관다신약이라 할 수 없다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "亥",
          "hiddenStems": [
            "壬",
            "甲"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "卯",
          "hiddenStems": [
            "乙"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "午",
          "hiddenStems": [
            "丁",
            "己"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "申",
          "hiddenStems": [
            "庚",
            "壬",
            "戊"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    },
    {
      "id": "G24-N",
      "group": "G24",
      "split": "holdout",
      "ruleId": "D27-20261016-L-male-over",
      "raw": {
        "gender": "M",
        "hourKnown": true,
        "pillars": {
          "year": "甲子",
          "month": "辛未",
          "day": "辛未",
          "hour": "己亥"
        }
      },
      "finalStatus": "held",
      "observation": "미월 신금에 갑목 재성·신금 비겁·기토 인성과 두 미지·해수가 있다. 인비 존재만으로 감당 가능을, 갑목 존재만으로 재성 과도를 확정하지 않는다.",
      "blockers": [
        "source-relative-strength-composition-unspecified"
      ],
      "rootPositions": [
        {
          "position": "year",
          "branch": "子",
          "hiddenStems": [
            "癸"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "month",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "day",
          "branch": "未",
          "hiddenStems": [
            "乙",
            "己",
            "丁"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        },
        {
          "position": "hour",
          "branch": "亥",
          "hiddenStems": [
            "壬",
            "甲"
          ],
          "rootReference": null,
          "rootVerdict": "hidden-membership-confirmed-effective-root-unresolved"
        }
      ],
      "annualReview": null,
      "effectReview": null,
      "overlap": null,
      "comparators": []
    }
  ]
};
