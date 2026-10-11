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
