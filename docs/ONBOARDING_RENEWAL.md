# 온보딩 리뉴얼 구현 및 검증 보고서

2026-10-13. 로컬 구현과 테스트 완료. 운영 배포 및 운영 DB 변경은 수행하지 않았다.

## 기존 구조 분석

- 사용자 진입: `/report/`의 `story/story.js`가 허브를 로드하고, `#/welcome`에서 온보딩, `#/begin`에서 기존 출생정보 입력, 이후 기존 각성·홈·타임라인으로 연결한다.
- 관리자: `/report/admin/`의 기존 `온보딩` 탭과 `v2-onboard.js`, `v2-quest.js`를 사용한다. 기존 비밀번호 인증과 `V2Content.api`의 Bearer 인증을 유지한다.
- 콘텐츠: `/api/onboarding`의 공개 GET, 관리자 초안 PUT, 게시·폐기·복원 POST를 재사용한다. 연구 사례는 기존 `cases`, 입력 대사·해독관은 기존 `quest.steps`, `quest.guides`에 유지한다.
- 저장소: 기존 `_store.js`를 사용한다. Supabase 연결 시 기존 `public.kv`, 연결이 없으면 기존 `GLOSSARY_KV`; 키는 `free:onboard`, `free:onboard:draft`, `free:onboard:hist`, `free:onboard:h:<id>` 그대로다. 최근 20개 게시 이력을 재사용한다.
- 자산: 기존 R2 `/api/clipfile` 업로드 및 `/api/media?all=1` 라이브러리를 사용한다. 이전 에셋을 삭제하거나 재등록하지 않는다.
- 캐시: API 응답은 기존 `Cache-Control: no-store`. 클라이언트 fetch도 `cache: no-store`를 사용한다. 1.5초 폴백 이후 늦게 도착한 공개 설정도 현재 온보딩에 반영한다. 운영 Cloudflare KV의 지역 간 전파 지연은 로컬 환경에서 재현하지 못했다.

## 변경한 관리자 메뉴

기존 `온보딩 → 랜딩 첫 화면`을 `온보딩 5개 장면` 편집 화면으로 확장했다. 별도 관리자나 중복 연구 테이블을 만들지 않았다.

- 5개 장면 각각 제목, 부제, 문단, 강조 문구, 상세 설명, 이미지, 모바일 이미지, 영상, 배경, 오버레이, 캐릭터 표시, 해독관 선택, 대사, CTA 문구·내부 경로를 편집한다.
- 장면 위·아래 순서 변경과 활성화·비활성화를 제공한다. 최종 장면도 비활성화할 수 있지만 활성 장면에 CTA가 최소 하나 있어야 게시된다.
- 마지막 장면에서 예시 리포트 항목의 노출, 제목, 샘플 문구, 설명, 이미지, 그래프 값과 순서를 편집한다. 실제 사주 계산이나 분석 데이터는 접근하지 않는다.
- 기존 연구 사례·출처 메뉴에서 연구 연도, 저널, 연구자, 요약, 상세, DOI, URL, 검증 상태와 공개 여부를 수정한다. 장면은 연구 ID를 참조하며 공개·검증된 연구만 출력한다.
- 기존 스토리 장면·에셋 관리에서 남녀 해독관 이미지와 출생정보 입력 대사를 수정한다. 기본 역할을 운명 감찰관·명운 해독관으로 변경했다.
- PC·390px 모바일 미리보기가 실제 사용자 렌더러와 같은 함수를 사용한다. 입력 중 열린 미리보기에 초안이 반영된다. 초안 저장, 게시, 게시 전 서버 검증, 이전 이력 복원은 기존 기능을 사용한다.
- 업로드와 기존 라이브러리 선택을 제공한다. `기존 DB 대사 호칭을 초안으로 정리`와 `검증된 기본 연구 추가`는 기존 데이터를 보존하며 초안에 반영한다.

## DB 변경과 마이그레이션

SQL 테이블 변경 없음. 기존 콘텐츠 JSON에 `renewal: {revision, enabled, scenes, previews}`와 `copyRevision`을 추가한다. 기존 `cover`, `sections`, `cases`, `quest`, 사용자 정보와 계산 결과는 보존한다. 이전 설정에 `renewal`이 없으면 5개 장면 기본값을 사용하고 기존 커버의 제목·부제·미디어·CTA가 있으면 첫 장면에 승계한다.

`functions/_onboarding-migration.js`는 온보딩 표시 문구와 대사만 정리한다. `{이름귀인}`은 `{name}`으로 바꾸고, 사용자 호칭을 현대어로 정리한다. ID·에셋 주소·연구 자료·명리학의 신살 이름인 천을귀인 등의 식별자는 변경하지 않는다. 저장 시 초안에 적용되며 `action=migrate-copy` 역시 초안만 만든다. 게시 직전 원래 공개본이 기존 이력에 보관된다. 운영 DB에는 아직 실행하지 않았다.

## 사용자 흐름과 에셋

이전 커버·여러 소개 섹션에서 5개 핵심 장면 → CTA → 기존 `#/begin` 입력 → 기존 계산·결과 흐름으로 연결된다. 실제 리포트와 무빙툰 생성 코드는 유지한다. 리포트 소개 제목의 사용자 호칭 한 곳만 수정했다.

기존 `mirror.webp`, `paths.webp`, `archive.webp`, 남녀 해독관 슬롯 및 계절 SVG를 재사용했다. 로컬에서 도심 군중 사진과 사계절 나무 사진은 확인되지 않아 새 슬롯에 대체 이미지·계절 도식을 사용했다. 요청한 군중 조명 장면, 사계절 나무 사진, 새 캐릭터 외형은 추가 자산이 있으면 관리자에서 교체할 수 있다. 운영에만 있는 기존 사진은 공개 API 접근 실패로 확인하지 못했다.

연구 출처:

- Hot Streaks: [Nature 원문](https://www.nature.com/articles/s41586-018-0315-8), DOI `10.1038/s41586-018-0315-8`. 기본 저자 표기를 Lu Liu·Roberta Sinatra·C. Lee Giles·Dashun Wang으로 정정했다.
- 실행의도: [연구자 소속 대학 출판 목록](https://www.socmot.uni-konstanz.de/publications/implementation-intentions-and-goal-achievement-meta-analysis-effects-and-processes), [출판사 원문](https://www.sciencedirect.com/science/article/abs/pii/S0065260106380021), DOI `10.1016/S0065-2601(06)38002-1`.
- 연구 결과를 사주 예측력의 증거로 설명하지 않는다. 예시 그래프는 성공·사고 확률이 아니라 콘텐츠 흐름 예시로 표시한다.

## 검증 결과

`tests/onboarding-renewal-browser.cjs`: Edge headless 브라우저, 실제 로컬 API 핸들러, 메모리 KV. 관리자 인증 후 UI에서 편집하고 게시했으며 테스트 데이터를 운영으로 보내지 않았다.

| 검증 항목 | 결과 |
|---|---|
| 첫 장면 제목 변경 → 저장 → 게시 → `/report/` 반영 | 통과 |
| 이미지 주소·캐릭터 대사 변경 반영 | 통과 |
| 순서 변경 | 통과 |
| 장면 비활성화 후 실제 DOM에서 숨김 | 통과 |
| 새로고침 후 공개 설정 유지 | 통과 |
| 데스크톱 1440px·모바일 390px, 가로 넘침 없음 | 통과 |
| PC·모바일 관리자 미리보기, 입력 중 갱신 | 통과 |
| 게시 이력 복원 → 다시 게시 → 5개 장면 복구 | 통과 |
| CTA → 기존 출생정보 입력 경로 | 통과 |
| 지연된 공개 API 응답 반영 | 통과 |
| 브라우저 JavaScript 예외 | 0건 |

`tests/onboarding-renewal-sim.js`: 인증, 초안·공개본 분리, 기존 설정·사용자 보존, 호칭 마이그레이션의 반복 실행 안전성, 잘못된 게시 차단, 미디어·경로 검증, 저장소 실패 시 기존 공개본 보존 통과.

기존 `onboarding-integration-sim.js`, `onboard-sim.js`, `quest-sim.js`, `admin-editing-sim.js`, `engine-baseline-sim.js`, `story-sim.js` 통과. 계산 엔진 120개 차트 기준선 일치. 변경한 JavaScript 13개 파일 문법 검사와 `git diff --check` 통과. 프로젝트에 package.json 기반 빌드·타입 검사 명령은 없다.

스크린샷·자동 결과: `output/onboarding-renewal/{desktop.png,mobile.png,admin.png,results.json}`. 스크린샷에는 반영 검증용 제목이 포함되어 있다.

## 변경 파일

- 신규: `functions/_renewal.js`, `functions/_onboarding-migration.js`, `report/admin/v2-renewal.js`, `report/hub/renewal-data.js`, `report/hub/renewal-view.js`, `report/hub/renewal.css`, `tests/onboarding-renewal-sim.js`, `tests/onboarding-renewal-browser.cjs`, 이 보고서.
- 수정: `functions/api/onboarding.js`, `report/admin/index.html`, `report/admin/v2-onboard.js`, `report/hub/index.html`, `report/hub/hub-onboard.js`, `report/hub/onboard-data.js`, `report/hub/quest-data.js`, `report/story/story.js`, `report/story/product-guide.js`, `report/v2/reading-flow.js`.

## 운영 완료까지 남은 작업

운영 배포, 기존 운영 데이터에 대한 초안 마이그레이션·연구 추가 확인·게시, 운영 DB와 R2를 사용하는 동일한 반영 테스트는 아직 수행하지 않았다. 이 결과만으로 실서비스 완료 기준을 충족했다고 판단할 수 없다. 실제 서버 재시작 후 영구 저장 및 Cloudflare 지역 간 캐시 반영도 배포 환경에서 확인해야 한다.
