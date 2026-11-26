# 나의 주무기 · 주무기 발현 타이밍 (2026-11-26)

| 파일 | 내용 |
|---|---|
| `00_지시문_원문.md` | 사용자 지시문 원문 |
| `01-판정근거.md` | 기존 코드 조사, 판정 규칙, 신뢰도, 기준 민감도 |
| `02-발현타이밍.md` | 활성도·유리도 계산, 300명식 운별 분포, 독립성 |
| `03-예외와-미확정.md` | 예외 사례 12종, 시간 모름, 사람 판단이 필요한 항목 |
| `04-회귀테스트.md` | 바꾼 파일, 엔진 불변, 기존 테스트, 미리보기 확인 |
| `05-최종보고.md` | 지시문 12절 10개 질문 답 |
| `results-300.json` | dev 300 명식별 판정·대운·세운 결과 + 시간 모름 300 (작업 사본 엔진) |
| `results-300-head-engine.json` | 같은 표본, HEAD 엔진 |
| `summary.json` · `summary-head-engine.json` | 집계·예외 사례 묶음 |
| `stats.json` | 분포·민감도·병존 영향·운별 교차표 |
| `PAID_CONTENT_INTEGRATION_REPORT.md` | 유료 상세풀이(종합·재물·커리어·인연·개운) 주무기 연결 보고서 (2026-11-26) |
| `V3_ABILITY_REPORT.md` | 판정 3판(생극제화·확정 규칙·발현 조합·A/B/C·조합형 운) 보고서와 집중 검사 |
| `V4_LUCK_REPORT.md` | 운세 흐름 4판(발현 단계 이름·오행/십성 축·유형별 분기·대운 상세 카드 7칸·단정 문체) 보고서, 검사 `tools/weapon-analysis/luck-v4.cjs` → `v4-luck.json` |
| `V6_SELECTION_REPORT.md` | 선정 6판(지지 병존·월령 장악·사령·지지 중심 경로·구조적 중요도·보조 역량) 보고서, 사례 검사 `case-v6.cjs` → `v6-case.json`, 300명식 비교 `v6-vs-v5.json` |
| `V7_CROSS_REPORT.md` | 7판 탭 사이 일관성(기반 역량·보조 역량·판정별 관계·모순 재검토 표시) 보고서, 검사 `cross-v7.cjs` → `v7-cross.json` |
| `V8_PERIOD_CORE_REPORT.md` | 8판 타고난 주무기와 시기별 핵심 역량(원국과의 실제 작용 점수·강화/보완/전환), 검사 `period-v8.cjs` → `v8-period.json` |
| `v3-focus.json` · `v3-vs-v1.json` · `v3-vs-v2.json` | 3판 집중 검사·판별 비교 결과 |
| `V2_JUDGMENT_REPORT.md` | 판정 2판(격국·상신·십신형·유형·잠정/미확정) 보고서와 1판 비교 |
| `v2-compare.json` | 1판↔2판 300명식 비교 결과 |
| `paid-content-300.json` | 유료 블록 300명식 검증 결과 |

코드: `weapon.js`(판정) · `weapon-data.js`(문안) · `weapon-view.js`(화면) · `index.html` `wpBlock()` · 스위치 `feature-flags.js` `weapon`(2026-11-26 사용자 승인으로 기본 켬·배포)

다시 돌리기
```
node tests/weapon-sim.cjs --write
node tools/weapon-analysis/stats.cjs
```
미리보기: 로컬에서 `index.html?mantraFlags=weapon,aptitude`
