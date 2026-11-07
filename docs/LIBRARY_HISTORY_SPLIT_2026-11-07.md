# 장 라이브러리 이력 분리 (2026-11-07)

## 왜
- 장 하나의 저장 값(`ik:blocks:chapter:library.<장>`)에는 7.5MB 한도가 있습니다(`supabase/reading-block-runtime.sql` 의 `reading_compare_and_swap`).
- 큰 장은 행의 약 87%가 예전 버전 보관분(history)이었고, 버전마다 검증 사례(scenarios, 0.5~0.75MB)를 통째로 복사했습니다. 예: self_20 7.04MB 중 이력 6.13MB, 게시 본문 0.08MB.
- 그래서 게시할 때마다 큰 장의 이력 보관 수를 손으로 줄여야 했습니다.
- 사용자 화면은 미리 뽑아 둔 `reading_published` 열을 읽어서 영향이 없었고, 관리자 화면과 게시 쓰기만 느려지고 막혔습니다.

## 바뀐 것
- 이전 버전은 별도 키 `ik:blocks:chapter:library.<장>:history` 에 둡니다. 본 행에는 현재 초안·게시본·검증 사례만 남습니다.
  - 쓰기 함수의 키 규칙이 이미 `:history` 를 허용하고, Polite 변환도 `:history` 키는 건드리지 않아 DB 함수는 고치지 않았습니다.
- 이력 형식 `library-history-2`(`functions/_library-history.js`)
  - `{format, entries:[{version, at, published, draft?, review?, scenariosRef}], scenarios:{ref:[…]}}`
  - 같은 검증 사례는 한 번만 저장하고, 초안이 게시본과 같으면 draft 를 생략합니다.
  - 최대 15개를 보관하고, 7,000,000바이트를 넘으면 오래된 것부터 뺍니다(최소 1개).
- 관리자 API(`functions/api/reading-library.js`)
  - 이력 키를 읽고, 본 행에 예전 history 배열이 남아 있으면 합쳐서 보여 줍니다(다음 저장 때 옮겨짐).
  - 화면에는 버전 목록만 보내고, 복원은 이력 키에서 꺼냅니다.
  - 저장할 때는 이력 키를 먼저 쓰고 본 행을 씁니다(둘 다 CAS).
  - 리비전(`libraryRevision`)은 history 를 빼고 계산합니다. 배포 직후 열려 있던 관리자 화면은 한 번 '버전 충돌'이 날 수 있으니 새로 고침하면 됩니다.
- 게시 도구(`editorial/rebuild-20261022/publish/prepare.mjs` + `history-sql.mjs`)
  - 적용·되돌리기 SQL이 이력 키를 쓰고, 본 행은 `old-'history'` 로 씁니다.
  - 드라이런은 결과 행·이력 크기를 함께 보여 줍니다. 이제 `limit 14` 를 손으로 낮출 필요가 없습니다.
- 한 번만 하는 이전 도구 `tools/migrate-library-history.mjs`
  - `prepare` → `output/library-history-split-20261107/sql/{dry,apply,rollback}`
  - `run dry|apply|verify` 는 `SUPABASE_ACCESS_TOKEN` 이 필요합니다.

## 드라이런 (운영, 읽기 전용, 2026-11-07)
- 107/107 `DRYRUN-OK`, 잘려 나가는 이력 0개
- 이전 후 본 행 최대 1.80MB(self_01, 이전 6.94MB), self_20 7.04MB → 0.91MB
- 이력 키 최대 4.28MB(self_20)

## 운영 반영 순서
1. 코드 배포(main 푸시)
   - 새 코드는 예전 행과 이전된 행을 모두 읽습니다.
   - 예전 코드는 이전된 행을 저장할 때 오류가 나므로, 반드시 배포를 먼저 합니다.
2. 이전: `node tools/migrate-library-history.mjs run apply` (사용자 승인 후)
3. 확인: `node tools/migrate-library-history.mjs run verify`
   - 107행 모두 history 없음
   - `reading_published` == published
   - 이력 키 107개, 형식 일치
   - 이전 전과 같은 published_digest
- 되돌리기: `sql/rollback/<장>.sql`(펼친 이력을 본 행에 다시 넣음, 7.5MB 넘으면 멈춤)

## 검사
- `node tests/library-history-split-sim.mjs` — 형식·중복 제거·한도·예전 행 합치기·리비전·생성 SQL·관리자 API 저장/복원
- 기존 통과 유지: reading-library-batch(이력 키 기대로 수정), editorial-manuscript-review, reading-focus-eight, admin-adjustment-comparison, conditional-reading-library, reading-public-projection, luck-everyday
