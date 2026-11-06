# 무빙툰 주제 심화 2차 — 만세력 계산을 장에 붙이기 (2026-11-06)

재물운·커리어운·인연운·개운법 장에 만세력이 이미 계산하는 값을 **순위·그래프 블록**으로 붙였습니다. 문장을 새로 쓰지 않고, 엔진이 만든 점수·요약·근거를 그대로 보여 줍니다.

- 모듈: `report/v2/topic-deep.js` (뷰어 `report/v2/index.html` 에서 `reading-feature.js` 다음에 불러옴)
- 연결: `reading-feature.js` 의 장별 SPEC 에 `td:*` 조각을 덧붙임 — 기존 조각은 그대로 앞에 남음
- 스위치: **`topicDeep`(기본 꺼짐)**. 관리자 → 운세 환경 탭 → **[주제 심화 켜기]**. 로컬·미리보기는 주소에 `?mantraFlags=topicDeep`. [모두 켜기·끄기]에 묶이지 않음
- 꺼져 있으면 의존 모듈(궁합·풍수·직업 엔진)도 불러오지 않습니다.
- 검사: `node tests/topic-deep-sim.cjs` · `node tests/luck-flags-api-sim.cjs`

## 장별 블록

| 장 | 붙는 블록 | 쓰는 계산 |
|---|---|---|
| wealth_04 월급형·사업형 | 돈 버는 방식 순위 · 사업운 10년 | wealth-career 수익 유형 · 확장 지표 business |
| wealth_06 큰돈 기회 | 횡재운 10년 그래프 + 손실 위험 해 | 확장 지표 windfall(+loss) |
| wealth_08 투자 성향 | 횡재운 12개월 | windfall(월운) |
| wealth_09 사람 때문에 돈 | 귀인운 10년 · 직장·동업 궁합 | noble · compat-pair |
| wealth_12 현실 전략 | 문서·이사운 10년 | estate |
| wealth_13 맞는 사람 | 저장한 사람들 궁합 순위 | compat-pair |
| wealth_15 개운법 | 재물 명당 TOP 5 · 사업장 방향 순위 | wish-spots · region-reading + 팔택 |
| career_01 어떤 일 | 직업 TOP 10 | wealth-career 직업 DB |
| career_02 돈 되는 재능 | 돈 버는 방식 순위 | 수익 유형 |
| career_03 직장·사업 | 업무 환경 5축 · 취업운 | wealth-career 업무 환경 · job |
| career_04 리더·전문가 | 업무 환경 5축 | wealth-career |
| career_05 업종 | 업종 순위(잘 맞음/보완 필요) | fengshui-data INDUSTRY × 용신 역할 |
| career_07 조직 문제 | 약해지기 쉬운 지점 | wealth-career 약점 |
| career_08 이직·독립 시기 | 이직운 10년 | move |
| career_09 창업 조심 | 사업운 10년 · 사업장 방향 | business · 방위 |
| career_12 10년 전략 | 직업운·학업운 10년 | career · study |
| career_13 맞는 사람 | 귀인운 · 동업 궁합 순위 | noble · compat-pair |
| career_15 개운법 | 커리어 명당 · 맞는 지역 TOP 5 | wish-spots · region-reading |
| love_03 남는 사람 | 대인·구설운 10년 | social |
| love_05 끌림·잘 맞음 | **궁합**(저장한 상대 또는 바로 입력) | compat-pair |
| love_08 결혼운 시기 | 결혼운 10년 | marriage |
| love_10 가족 | 부모·가족운 10년 | family |
| love_11 자식 | 자식운 10년 | child |
| love_13 맞는 사람 | 저장한 사람들 궁합 순위 | compat-pair |
| remedy_04 회복 환경·공간 | 거주 방향 순위 · **우리 집 현공풍수** | region-reading + 팔택 · fengshui-engine |
| remedy_05 행운의 장소 | 맞는 지역 TOP 5 · 소원성취 명당 TOP 5 | region-reading · wish-spots |

## 알아 둘 점
- **등급 색**(최고·좋음·무난·주의·부담)은 만세력 ‘운세 흐름 → 그래프 지표’와 같은 구간(`SIG_CUTS`)입니다. 테스트가 두 값이 같은지 확인합니다.
- **궁합**: 만세력 궁합 탭에 저장한 상대(이 기기 `localStorage`의 `mantra-manse-v1-partners`)를 그대로 쓰고, 장에서 새로 입력한 상대도 같은 곳에 저장돼 만세력에서 보입니다. 서버로 보내지 않습니다.
- **우리 집 현공풍수**: 만세력 공간·명당 탭에 저장한 집 향(`mantra-space-v1`)이 있을 때만 판정하고, 없으면 입력 안내를 보여 줍니다.
- **소원성취 명당**: 관리자가 등록·게시한 장소(`/api/wish-spots`, 명당 스위치 켜짐)가 있을 때만 나옵니다.
- **직업 TOP**: 엔진이 고른 직업 수만큼(사주에 따라 10개 미만일 수 있음) 보여 줍니다.
- 로컬 개발 서버에는 `timeline_*` 장 본문(운영 라이브러리)이 없어서, 블록은 뷰어 페이지에서 장 26개를 직접 조립해 확인했습니다. 운영 화면 확인은 배포 후 스위치를 켠 상태에서 해야 합니다.
