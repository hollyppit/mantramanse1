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
