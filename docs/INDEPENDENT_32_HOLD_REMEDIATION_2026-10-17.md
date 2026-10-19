# 32개 유보 유형과 보완 계획

2026-10-17. 기존 자료로 6개 검토 항목을 보강했으며 추가 확정 0건, 유보 32건이다. 게시·운영 수정·외부 AI 호출 없음.

## 1. 유보 사유 유형

중복 없는 주된 장애 기준으로 시주 미상 6건, 시주가 있는 원국의 상대 세력 미정 20건, 시주가 있는 연도 합성 미정 6건이다. 연도 사례는 총 8건이지만 2건은 주된 장애가 시주 미상이므로 위 6건에 중복 집계하지 않았다.

| 주된 장애 | 수 | 사례 ID |
|---|---:|---|
| 출생 시각·시주 누락 | 6 | G01-N, G01-Y, G08-N, G15-N, G22-N, G22-Y |
| 원국 상대 세력 기준 미정 | 20 | G02-N, G03-N, G04-N, G05-N, G06-N, G07-N, G09-N, G10-N, G11-N, G12-N, G13-N, G14-N, G16-N, G17-N, G18-N, G19-N, G20-N, G21-N, G23-N, G24-N |
| 연도 총작용·감당 능력 합성 미정 | 6 | G04-Y, G07-Y, G10-Y, G13-Y, G16-Y, G19-Y |

교차 항목: 여름·겨울 조후 우선 검토 대상은 16건이다. 이는 실제 조후 불균형이나 충돌을 확정한 수가 아니다. 특수구조는 32건 모두 별도 확정 검수가 남아 있으며 ‘없음’으로 처리하지 않는다. 같은 원국의 N/Y는 반복 관측이다.

## 2. 기존 자료에서 완료한 보완

- **strength-inputs**: 검토할 위치를 월지·일지·주변 연주/월간/시간/시지로 분리. 근거: dmuzadnbj9xm/c1, dmuzadnbj9xm/c1, dmuzadnbj9xm/c1. 남은 사항: 지장간 원표와 판정 관법을 독립 확인하고 생조·설기·제어를 합성하는 우선순위와 예외를 명시해야 함.
- **climate-priority**: 사오미월/해자축월 사례를 조후 우선 검토 대상으로 표시. 근거: dmuzadnbj9xm/c2. 남은 사항: 계절만으로 실제 한난조습 또는 조후 우선 적용을 확정하지 않음.
- **special-structures**: 통관·전왕 검토와 일반 강약 판정을 별도 항목으로 분리. 근거: dmuzadnbj9xm/c2. 남은 사항: 모든 사례에서 특수구조 유무는 미검수; 없다고 기본 처리 금지.
- **partner-palace-interactions**: 연애 사례에 일지 지장간 투출·월지/시지와의 합충형 검토 항목 추가. 근거: dmux5aqvjp2m/c1. 남은 사항: 해당 자료는 관계 종합 해석의 한계이며 과다 판정의 충분조건으로 전용하지 않음.
- **recovery**: 인비 운의 존재와 실제 일간 힘 증가를 분리. 근거: dmux66n2o7uf/c1. 남은 사항: 지원 변화 및 상쇄를 판정할 독립 기준 미정.
- **annual-composition**: 대운 지지·통근, 세운 합충의 대상과 원국 역할, 해당 연도 과도 조건을 명시. 근거: dmux83hs0cje/c1, dmux88rgx1fo/c1, dmux7q9nwg6m/c1. 남은 사항: 이를 합성해 감당 능력 초과를 정하는 함수·정성적 판정 절차는 여전히 원문에 없음.

각 사례에 월지, 일지, 알려진 천간과 적용할 원문 항목을 연결했다. 계절 표시는 원문의 사오미/해자축 구분만 적용한다. 비표시 계절도 조후 검토가 불필요하다는 뜻이 아니다. 전체 원문 인용은 비공개 hold-remediation.json에 정확 문장으로 보관했다. 자료는 2026-10-16 백업이며 이번에 새 운영 원문을 조회한 것은 아니다.

## 3. 확정에 필요한 적용 기준

1. **자료 완전성**: 시주 미상은 기존 자료로 복원할 수 없다. 출생기록을 추가 확보하거나, 시주 미상에서도 결론이 유지되는지를 검증하는 별도 절차가 필요하다. 임의 시주·정오를 대입해 채우지 않는다.
2. **상대 세력**: 득령·득지·득세는 검토 위치를 제시하지만 합성 판정식은 아니다. 지장간 표와 관법을 독립 확인하고, 계절·근·주변 생조·설기·제어의 우선순위와 충돌 해소 원리를 문서화해야 한다. 글자 개수나 기존 엔진 임계값으로 대체하지 않는다.
3. **예외**: 조후 우선 여부, 통관·전왕 등 특수구조의 성립·배제 기준을 먼저 결정한다. 검토 미완료를 false로 넣지 않는다. 관계 종합 자료의 합충형 설명을 곧 상대 과다 판정으로 쓰지 않는다.
4. **연도**: 대운 지지·통근과 세운의 천간/지지, 원국과 합충형의 대상 및 역할을 적고, 실제 지원 변화까지 판단할 합성 명세가 필요하다. 인비 운이 들어오는 것과 일간이 힘을 얻는 것은 구분한다.
5. **정답 라벨**: supported는 필수 명제 전체와 예외 해소의 근거가 있어야 한다. contradicted는 필수 명제의 명백한 부정 근거가 있어야 한다. 자료 없음·애매함은 unknown이다. 확정 판단 전에 엔진 비교 결과를 열지 않는다.

1~4의 세부 판단 절차는 이번 작업에서 새로 입증한 전통 규칙이 아니라 추가로 확보·검증해야 할 명세 요구사항이다. 현 원문에 없는 합산식·새 수치 임계값을 발명하지 않았다.

## 4. 사례별 보완 위치

| ID | 주된 장애 | 월지 / 조후 검토 표시 | 추가 필요 근거 |
|---|---|---|---|
| G01-N | missing-hour | 子 / winter-review | 독립 확인된 출생 시각 또는 시주 미상 전용 판정 명세 / 상대 세력·특수구조·예외의 근거 있는 판정 절차 |
| G01-Y | missing-hour | 子 / winter-review | 독립 확인된 출생 시각 또는 시주 미상 전용 판정 명세 / 상대 세력·특수구조·예외의 근거 있는 판정 절차 |
| G02-N | relative-strength | 午 / summer-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G03-N | relative-strength | 亥 / winter-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G04-N | relative-strength | 辰 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G04-Y | annual-composition | 辰 / not-in-listed-priority-months | 대운·세운·원국의 작용 및 실제 지원 변화를 합성하는 근거 있는 판정 절차 |
| G05-N | relative-strength | 酉 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G06-N | relative-strength | 寅 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G07-N | relative-strength | 未 / summer-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G07-Y | annual-composition | 未 / summer-review | 대운·세운·원국의 작용 및 실제 지원 변화를 합성하는 근거 있는 판정 절차 |
| G08-N | missing-hour | 亥 / winter-review | 독립 확인된 출생 시각 또는 시주 미상 전용 판정 명세 / 상대 세력·특수구조·예외의 근거 있는 판정 절차 |
| G09-N | relative-strength | 巳 / summer-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G10-N | relative-strength | 戌 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G10-Y | annual-composition | 戌 / not-in-listed-priority-months | 대운·세운·원국의 작용 및 실제 지원 변화를 합성하는 근거 있는 판정 절차 |
| G11-N | relative-strength | 卯 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G12-N | relative-strength | 申 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G13-N | relative-strength | 丑 / winter-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G13-Y | annual-composition | 丑 / winter-review | 대운·세운·원국의 작용 및 실제 지원 변화를 합성하는 근거 있는 판정 절차 |
| G14-N | relative-strength | 午 / summer-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G15-N | missing-hour | 戌 / not-in-listed-priority-months | 독립 확인된 출생 시각 또는 시주 미상 전용 판정 명세 / 상대 세력·특수구조·예외의 근거 있는 판정 절차 |
| G16-N | relative-strength | 辰 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G16-Y | annual-composition | 辰 / not-in-listed-priority-months | 대운·세운·원국의 작용 및 실제 지원 변화를 합성하는 근거 있는 판정 절차 |
| G17-N | relative-strength | 申 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G18-N | relative-strength | 寅 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G19-N | relative-strength | 未 / summer-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G19-Y | annual-composition | 未 / summer-review | 대운·세운·원국의 작용 및 실제 지원 변화를 합성하는 근거 있는 판정 절차 |
| G20-N | relative-strength | 子 / winter-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G21-N | relative-strength | 巳 / summer-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G22-N | missing-hour | 酉 / not-in-listed-priority-months | 독립 확인된 출생 시각 또는 시주 미상 전용 판정 명세 / 상대 세력·특수구조·예외의 근거 있는 판정 절차 |
| G22-Y | missing-hour | 酉 / not-in-listed-priority-months | 독립 확인된 출생 시각 또는 시주 미상 전용 판정 명세 / 상대 세력·특수구조·예외의 근거 있는 판정 절차 |
| G23-N | relative-strength | 卯 / not-in-listed-priority-months | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |
| G24-N | relative-strength | 未 / summer-review | 지장간·생조·설기·제어의 상대 작용 및 조후/특수구조 우선순위를 정한 독립 판정 명세 |

## 5. 검증과 다음 판단 조건

32개 ID 완전성, 주된 장애 집계 6+20+6, 원문 정확 인용·출처 활성 상태, 전체 unknown 및 게시 차단을 검사했다. 원문에서 확보한 검토 요소와 아직 없는 판정 절차를 분리했다. 새 supported/contradicted는 없으므로 동등성 지표는 산출하지 않는다.

재생성·검증: node tools/group-independent-holds.cjs. 상세: output/independent-reference-2026-10-17/hold-remediation.json. 원래 사례 검수와 독립 A/B 양식은 수정하지 않았다.
