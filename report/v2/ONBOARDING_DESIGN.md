# 온보딩·슬라이드 툰·개인화 홈 (허브 `/report/hub/`)

## 동선
| 상태 | 경로 |
|---|---|
| 신규(프로필 없음) | `#/` → `#/welcome`(사례 후킹 → 명리학 소개 3장 → [나의 운 확인하기]) → `#/begin`(슬라이드 툰 6장면) → 계산 → `#/reveal`(일간·일주) → `#/`(개인화 홈) |
| 재방문(프로필 있음) | `#/` 이 곧바로 개인화 홈. `#/begin` 도 홈으로 돌려보낸다(`?edit=1` 일 때만 수정) |
| 입력 중 이탈 | `localStorage mt_onb_draft` 의 단계·값으로 마지막 장면에서 재개 |
| 건너뛰기 | `#/?skip=1` → 기존 허브 홈(타로 먼저). 랜딩 임베드(`data-embed`)에서는 기존 허브 홈 유지 |
| 온보딩 다시 보기 | 홈 하단 "내 정보" → `#/welcome?replay=1` |
| 옛 입력 폼 | `#/input` 은 `#/begin` 으로 대체. 필요하면 `#/input?classic=1` |

## 파일
- `report/hub/onboard-data.js` — 기본 사례·소개·장면, 호칭, 사례 고르기, 날짜·시각 검증(순수 로직, node 테스트 대상)
- `report/hub/hub-onboard.js` — 라우트 `welcome` `begin` `reveal` `me`, 홈(`''`) 재정의, 측정
- `report/hub/onboard.css`
- `functions/api/onboarding.js` — GET(공개: published 만) / PUT(관리자) / POST `?ev=`(집계) / GET `?stats=1`(관리자). KV `free:onboard`·`free:onbstat`
- `report/admin/v2-onboard.js` — 관리자 "온보딩" 탭(사례·소개·툰·호칭/가중치·통계)
- 테스트: `node tests/onboard-sim.js`

## 규칙
- 호칭은 `Onboard.honorific`(기본 '귀인') 한 곳. 대사는 `{귀인}`·`{이름귀인}` 템플릿. 대공·소협·대협은 코드·서버 양쪽에서 거른다.
- 사례 공개 조건: `status === 'published'` + 출처(DOI/URL). 서버는 출처 없는 공개를 `verified` 로 내린다.
- 기본 시드 중 공개: Pluchino 2018, Liu 2018, Salganik 2006, Chetty 2014(Crossref 로 제목·저자·연도·저널 확인), 해리슨 포드·브라이언 크랜스턴(보도 대조, 불확실한 세부는 본문에서 제외). 와이즈먼·알 파치노는 **검토 중**(비공개).
- 입력 종류(field)·필수 장면은 관리자가 끌 수 없다. 계산은 `Manse.compute` 그대로, 시각 미상은 `hourUnknown`.
- 분석 이벤트·서버 집계에는 이름·출생정보를 싣지 않는다(사례 id 와 이벤트 이름만).

## 한계 (보고서 참고)
- 출생 국가: 엔진이 한국 표준시 기준이라 "해외·기타" 는 경고만 표시하고 서울 경도로 계산한다.
- 자미두수 명반은 이번 단계에서 홈에 표시하지 않았다(기존 엔진의 해당 API 확인 필요).
- 결제·권한 시스템이 코드에 없어(NEXT_PLAN §5-B "유료화") 프리미엄 카드는 기존 `#/go?to=deep` 로 연결만 한다. `purchase_complete` 는 미연결.
- 수련생 캐릭터는 SVG 임시 그림이다. 관리자에서 장면별 캐릭터·배경 이미지 주소로 교체한다.

## 랜딩·관리자 개편 (2026-10-11, 브랜치 `landing-admin-v2`)

### 방문자 흐름
첫 화면(커버) → **02 출생 시기 연구 카드** → **03 명리학 소개(장면 3 + 원리 주제 접이식)** → **04 서비스 소개** → **05 최종 CTA**.
섹션 목록·순서·표시·연출·CTA 는 `config.sections` 한 곳에서 정한다(`onboard-data.js` 의 `SECTIONS`). 예전 "연구→유명인 후킹"은 `story` 섹션으로 남아 있고 **기본 꺼짐**이다(관리자가 켤 수 있음).
- 연구 카드: `group: 'birth'` + 공개 + 검증 완료인 사례만. 컬럼비아대(Boland 2015, DOI 10.1093/jamia/ocv046)·Coury 2023 메타분석(DOI 10.1016/j.schres.2022.12.016) — Crossref·초록 대조 완료, 수치는 `tests/onboard-sim.js` 가 지킨다.
- "출생 월·계절과 건강 지표의 연관성은 사주 예측의 근거가 아니다" 문구는 연구 섹션 `notice` 로 항상 표시(관리자가 지울 수 없게 하지는 않았으나 기본값이 들어 있다).
- 홈 순서: 기질 한 문장 → 지금의 운 흐름 → 일주 → 오늘의 운세 → 무료 타로(+캘린더) → 종합 무빙툰 리포트 → 명식 요약. 용어(일간·일주·대운·일진)는 눌러서 설명(`TERMS`).

### 데이터 모델 (모두 추가형, 옛 저장본 호환)
- 사례: `kind`(study·experiment·history·celebrity·classic·other) · `verification{state,reviewedAt,basis}` · `visible` · `study{…}` · `media{…}` · `display{…}`. 옛 `status` 는 파생 값으로 계속 내려준다.
  공개 조건 = 검증 완료 + 검토 근거 + 출처 + 공개 켬. 서버(`cleanCase`)와 클라이언트(`publicCases`)가 같은 규칙을 쓴다.
- 서버 저장: 공개본 `free:onboard`(기존 키 그대로) · 초안 `free:onboard:draft` · 이력 `free:onboard:hist` + `free:onboard:h:<id>`(최근 20). 초안이 없으면 공개본이 편집 시작점이라 **배포 직후 공개 중인 내용은 그대로**다.
- 미리보기는 서버를 거치지 않는다: 관리자 iframe(`/report/hub/?preview=1`)에 같은 출처 `postMessage` 로 초안을 보낸다.

### 측정(`/api/onboarding?ev=`)
`landing_view`(세션당 1회) · `landing_cta_click` · `research_section_view` · `research_detail_open` · `research_source_click` · `myeongri_section_view` · `service_section_view` · `movingtoon_preview_view` · `free_content_click` · `paid_report_view` · `purchase_complete`(결제 시스템 연결 전까지 미발생) + 기존 이벤트. `d=m|d` 로 기기 구분, 섹션은 `case=s-<섹션id>`.

### 한계
- AI 논문 검토 보조는 연결하지 않았다(규칙 기반 자동 점검 + Crossref DOI 대조만).
- 랜딩 첫 화면(커버) 편집기는 기존 것을 그대로 쓴다. PC/모바일 개별 값은 캐릭터 이미지 단위로만 지원(기존 기능).

## 인터랙티브 스토리 · 운명의 타임라인 (브랜치 `claude/mantra-manse-onboarding-tsoh7s`)

### 원칙: 기존 온보딩을 교체하지 않고, "나의 운 확인하기" 뒤에 새 체험을 연결한다
```
랜딩(/report/) 첫 화면 → 연구 사례 → 명리학 소개 → 서비스 소개 → [나의 운 확인하기]      ← 기존 그대로(#/welcome, 코드·문구·이미지 변경 없음)
  → 부적 봉인 오프닝 → 안내자 선택 → 이름 → 성별 → 달력 → 해 → 달(→윤달 확인) → 일 → 시각 → 출생지 → 확인   ← 신규 #/begin (hub-quest.js)
  → 실제 만세력 계산(Manse.compute) → 일간·일주 소개 + 일주 각성 영상(기존 #/awaken?to=timeline)
  → 운명의 타임라인(#/timeline) → 기존 홈(#/) · 상세 무빙툰(#/go?to=…)
```
- 기존 온보딩 스크롤 중에는 스토리가 실행되지 않는다. 진입은 CTA 클릭(`#/begin`)뿐이다. CTA 의 연결 경로는 섹션별로 관리자에서 고른다(`cta.to`: `story` 기본 / `quick`).
- **빠른 진입 유지**: "바로 사주 분석하기" 등 `#/input?next=…` 는 일반 입력 화면(`#sf`)으로 간다. `#/input` 이 `next` 없이 열릴 때만 스토리(`#/begin`)로 보낸다.
- `config.quest.enabled=false` 이면 `#/begin` 은 예전 슬라이드 툰으로 돌아간다(장애 시 즉시 되돌리는 스위치).

### 파일
| 파일 | 역할 |
|---|---|
| `report/hub/quest-data.js` | 단계 정의·안내자별 대사·에셋 12종(PC/모바일 초점)·월→계절·윤달/일수 판정(엔진)·설정 병합(`O.merge` 가 quest·timeline 도 병합)·초안 정리. 화면 없음 — `node tests/quest-sim.js` |
| `report/hub/hub-quest.js` · `quest.css` | `#/begin` 인터랙티브 스토리(전체 화면 레이어 `#qs`) |
| `report/hub/hub-timeline.js` · `timeline.css` | `#/timeline` — 기존 `ReportV2.Timeline`(대운·세운·월운·6분류·근거)·`Manse.compute` 값을 그대로 그린다. 점수·판단을 새로 만들지 않는다 |
| `report/hub/quest/*.webp` | 기본 에셋 12종(제공된 assets 폴더 그대로) |
| `report/admin/v2-quest.js` | 관리자 확장 메뉴 4개(스토리 장면·에셋 관리·운명의 타임라인·스토리 운영) |
| `functions/api/onboarding.js` | `cleanQuest`·`cleanTimeline`·`cta.to` 정제(같은 초안/공개본/이력 체계) |

### 입력 설계
- **계산에 영향을 주는 입력**: 성별(대운 방향)·달력·윤달·해·월·일·시·분·출생지(경도 보정). **연출용**: 안내자 선택, 월에 따른 배경 계절 색조(별도 계절 선택 단계 없음), 이름(계산 무관).
- 윤달 질문은 "음력 + 그 해 그 달에 윤달이 실제로 있을 때"만 나온다(`Quest.leapExists` = 엔진 `lunarToSolar`). 브라우저 기본 확인창이 아니라 자체 대화 상자.
- 시각 미상 = 엔진 `hourUnknown`(시주 제외). 해외·기타 출생지 = 기존 정책(한국 표준시 기준 경고, 서울 경도).
- 이전 단계로 돌아가도 값 보존(브라우저 뒤로가기 포함), 확인 화면에서 항목별 수정 후 확인으로 복귀. 이탈 시 `localStorage mt_quest_draft`(v2) 로 "이어하기".
- 계산 오류는 원인을 보여 주고 해당 입력 단계로 이동한다. 분석 이벤트에는 이름·출생정보를 싣지 않고 콘솔 출력도 하지 않는다.
- 안내자 대사는 스토리 연출이다(`quest.steps[].lines`). 일간·일주 풀이 문구는 `/report/v2/intro-text.js`·엔진에서 온다(분리).

### 관리자: 두 영역을 분리
- **A. 기존 온보딩**: 랜딩 첫 화면 · 연구 사례·출처 · 명리학 소개 · 서비스 소개 · 호칭·가중치 · 통계(+ 위쪽 "전체 흐름": 섹션 순서·표시·CTA 문구·**CTA 연결 경로**)
- **B. 인터랙티브 스토리**: 스토리 장면(순서 확인·켜기/끄기·배경·대사·버튼·전환 효과·안내자) · 에셋 관리(PC/모바일 이미지·초점·미등록 확인·일주 각성 영상 연결 상태) · 운명의 타임라인(영역·그래프·주제 타일·무료/프리미엄 표시·풀이 DB 연결 확인) · 스토리 운영(켜기/끄기·이어하기·재방문 건너뛰기·미리보기) · 슬라이드 툰(예전)
- 공통: 미리보기·게시 관리(초안 저장 → 게시 → 이력 20개 복원). 설정 키가 독립이라 A 를 게시해도 B 가 바뀌지 않는다(`cases·sections·intro·services·topics` ↔ `quest·timeline·scenes`).

### 한계(보고 참고)
- 안내자 "캐릭터"로 제공된 `male.webp`·`female.webp` 는 인물이 아니라 장면 일러스트다(프로토타입도 같은 용도). 인물 이미지는 관리자에서 올려 교체한다. `mirror.webp` 는 인물 컷이지만 시간 입력 배경으로만 쓴다.
- "무료/프리미엄"은 표시 배지다 — 결제·권한 시스템이 코드에 없다.
- 일주 각성 영상 120종 중 등록분만 재생되며, 없으면 `portal` 대체 이미지 + 안내를 보여 준다.
- 상세 풀이 이동은 기존 무빙툰 뷰어의 관심 분야(`#/go?to=…`) 단위다(특정 연도로 바로 여는 딥링크는 뷰어에 없다).
