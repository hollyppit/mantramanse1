# 데이터 품질 점검 (2026-11-25)

원본 파일: arts.json, business.json, sports.json

| 직업군 | 인원 | 출생시간 verified | reported | 미상 |
|---|---|---|---|---|
| arts | 10 | 5 | 3 | 2 |
| business | 10 | 4 | 4 | 2 |
| sports | 10 | 6 | 1 | 3 |

- 사건 전체 395건 · 분석 가능(출처·형식 확인) 392건 · 그중 중요도 2 이상 364건
- 중요도 2 이상 사건의 성격: change 133 · positive 112 · negative 119
- 분할: dev 15명 · test 15명

## 문제 목록(지우지 않고 남김)
- arts-06-madonna: 보정 적용 — {"birth_place.tz":"Etc/GMT+5"} · Astro-Databank 가 출생 시각을 EST(UTC−5, 표준시)로 기록 — America/Detroit 의 1958년 8월 시차 대신 출처의 시차를 그대로 씀(수집자 보고)
