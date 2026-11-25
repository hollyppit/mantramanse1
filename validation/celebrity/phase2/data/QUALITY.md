# 데이터 품질 점검 (2026-11-25)

원본 파일: arts.json, business.json, professional.json, sports.json

| 직업군 | 인원 | 출생시간 verified | reported | 미상 |
|---|---|---|---|---|
| arts | 10 | 7 | 0 | 3 |
| business | 10 | 6 | 2 | 2 |
| professional | 10 | 5 | 2 | 3 |
| sports | 10 | 3 | 3 | 4 |

- 사건 전체 543건 · 분석 가능(출처·형식 확인) 543건 · 그중 중요도 2 이상 491건
- 중요도 2 이상 사건의 성격: positive 158 · change 168 · negative 165
- 분할: dev 21명 · test 19명

## 문제 목록(지우지 않고 남김)
- p2-arts-07-ernest-hemingway: 엔진 지원 범위 밖 출생 연도(1900~2100년만 계산, 서비스도 같음) → 분석 제외
- p2-business-02-coco-chanel: 보정 적용 — {"birth_time":"16:10"} · 출처 16:00 LMT(0w05) = UTC 16:00:20 → Europe/Paris(1883년 파리 평균시 +9.35분) 벽시계 16:10
- p2-business-02-coco-chanel: 엔진 지원 범위 밖 출생 연도(1900~2100년만 계산, 서비스도 같음) → 분석 제외
- p2-professional-02-einstein: 보정 적용 — {"birth_time":"11:44"} · 출처 11:30 LMT(울름 9.99E, +39.96분) = UTC 10:50:02 → Europe/Berlin(1879년 베를린 평균시 +53.47분) 벽시계 11:44
- p2-professional-02-einstein: 엔진 지원 범위 밖 출생 연도(1900~2100년만 계산, 서비스도 같음) → 분석 제외
- p2-professional-04-armstrong: 보정 적용 — {"birth_place.tz":"Etc/GMT+5"} · Astro-Databank 가 EST(UTC−5, 표준시)로 기록 — America/New_York 의 1930년 8월 서머타임(−4) 대신 출처 시차를 씀(1차 마돈나와 같은 처리)
- p2-professional-05-curie: 엔진 지원 범위 밖 출생 연도(1900~2100년만 계산, 서비스도 같음) → 분석 제외
- p2-professional-06-wright: 보정 적용 — {"birth_time":"17:11"} · 출처 17:00 LMT(리치랜드 센터 90.39W, −361.6분) = UTC 23:01:34 → America/Chicago(1867년 시카고 평균시 −350.6분) 벽시계 17:11
- p2-professional-06-wright: 엔진 지원 범위 밖 출생 연도(1900~2100년만 계산, 서비스도 같음) → 분석 제외
