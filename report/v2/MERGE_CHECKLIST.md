# 병합 체크리스트 — `renewal/world-map` → `main`

## 요약

사주 계산 엔진은 바꾸지 않았다(120개 차트 해시 기준선 일치). 무빙툰 시작 후 **세계 지도**(6개 세계)에서 세계를 고르고, 읽는 중에는 상단 **챕터 탭 줄**로 같은 세계의 챕터를 오간다.
세계별 인터랙션 6종, 운 6분류 표시 계층, 운명 타임라인·근거 팝업, 관리자 "세계관"·"서비스 점검" 탭이 포함된다.

## 변경 범위

| 영역 | 파일 |
|---|---|
| 세계 지도·진행 저장·세계 정의 | `report/v2/explore.js`, `explore.css`, `functions/api/worlds.js` |
| 세계별 인터랙션 | `library.js`(서고) `castle.js`(성채) `garden.js`(정원) `timeline.js`·`luck6.js`(회랑) `samsara.js`(윤회의 문·세계 무빙툰) `sanctuary.js`(성역) |
| 뷰어 연결 | `report/v2/viewer.js`, `reader.js`(점프 오프셋), `index.html` |
| 기존 파일 소폭 | `life-doc.js`(읽기 전용 export), `deep-time.js`(명소 점수 `placeList`), `report/hub/hub.js`(카드 문구), `index.html`(루트: "무빙툰 ›" 링크) |
| 관리자 | `report/admin/v2-world.js`, `v2-quality.js`, `index.html`, `v2-shell.js` |
| 미리보기 전용 | `functions/_middleware.js` (미리보기 호스트의 공개 읽기 GET 만 운영으로 대신 요청) |
| 로컬 확인 | `.claude/report-dev.js`, `.claude/launch.json` |
| 테스트 | `tests/*-sim.js` 추가(엔진 기준선·세계 지도·6분류·타임라인·서고·성채·정원·성역·윤회의 문·서비스 점검·미들웨어) |

DB 스키마 변경 없음. 새 KV 키 `worlds:config` 하나만 추가(관리자가 저장할 때 생성, 없으면 코드 기본값).

## 병합 전

- [x] `main` 에 새 커밋 없음(충돌 없음)
- [x] 엔진 기준선 일치: `node tests/engine-baseline-sim.js`
- [x] 테스트 58개 통과. 실패 4개는 이번 변경과 무관한 기존 실패: `calendar-ui-sim`(playwright 미설치), `free-sim`(CTA 규칙이 낡음), `panel-sim`·`panel-edit-sim`(1인칭 POV 변경 뒤 낡은 문구)
- [x] 배포된 미리보기에서 프롤로그 영상 → 세계 지도 → 세계 → 탭 이동 확인(운영 영상 연결)
- [ ] 실기기(iPhone Safari·Android Chrome) 확인 — `QA_CHECKLIST.md`
- [ ] 허브 "심층 무빙툰" 진입 확인(`?from=hub&flow=classic`)

## 병합 후 (운영)

1. 새 배포가 끝나면 시크릿 창에서 `/report/v2/` 를 열어 한 번 끝까지 진행.
2. 관리자 → **서비스 점검** → "점검 실행": 에셋 누락·세계 매핑 확인.
3. 관리자 → **세계관**: 필요하면 이름·배경·연결 챕터를 조정하고 "저장"(저장 전에는 코드 기본값 6개 세계 사용).
4. 문제가 있으면 아래 롤백.

## 롤백

- **즉시(코드 변경 없이)**: 사용자에게 `/report/v2/?explore=0` 흐름은 예전 한 문서 읽기다. 문제 시 허브 링크에 `?explore=0` 을 임시로 붙일 수 있다.
- **전체**: 병합 커밋을 `git revert <merge-commit>` 하면 이전 동작으로 돌아간다. 새 KV 키 `worlds:config` 는 남아도 무해하다.

## 알려진 한계 (병합을 막지 않음)

- 유료 표시는 배지뿐이며 서버 권한 검증·결제가 없다.
- 전생 무빙툰·세계 무빙툰의 컷 이미지는 기존 에셋을 이어 쓴다(컷별 전용 이미지·영상 없음).
- 상대 전체 사주 궁합은 없고 일주 두 글자 상성만 제공한다.
- 운 분류 "변동기"가 전체의 약 32%로 많이 나온다(옛 구현도 동일). 조정은 엔진 비교 테스트를 먼저 만든 뒤 결정.
- `?map=생년월일,시각,성별` 은 입력·프롤로그를 건너뛰는 확인용 주소다. 운영에 두어도 무해하나, 원하지 않으면 `MAPQ` 를 제거한다.
