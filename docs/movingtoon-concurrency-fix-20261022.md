# 병렬 503 원인 해결 및 운영 검증 — 2026-10-22

운영 배포 `a710eb44-1270-4775-a2a7-4f43d2df457b`에 CPU 최적화를 적용하고, Supabase 운영 프로젝트 `devkslhggrkqtianjamj`에 게시 조회 최적화 migration `reading_publication_projection`을 적용했다. 승인된 원고 `everyday-all-84-20261021-15`와 원본 저장값 84개는 변경하지 않았다.

최종 공개 서비스에서 **동시 24요청 × 336건을 연속 두 차례, 총 672건** 검사했다. 전부 HTTP 200, 승인 조합 결과 일치, 실제 클라이언트 적용 성공이었다. **503·500·재시도·AI 호출·생성 문단·요청 비용 모두 0**이다. 시각 미상 168건도 포함했다. 이는 해당 동시성과 합성 입력에 대한 실측이며 무제한 부하 보장은 아니다.

## 확인한 원인과 변경

1. 기존 HTML 503을 동시 12요청에서 재현했다. 응답 본문은 Cloudflare 1102 `Worker exceeded resource limits`였고, 실제 tail 로그에 `exceededCpu`와 `Worker exceeded CPU time limit.`가 있었다. 첫 재현 336건 중 64건, 로그 동반 재현에서는 83건이 실패했다. DB 장애로 추정해 넘기지 않고 실행 로그로 CPU 한도를 확인했다. [Cloudflare 오류 1102 설명](https://developers.cloudflare.com/support/troubleshooting/cloudflare-1xxx-errors/error-1102/).
2. 게시된 문안이 이미 있는데도 요청마다 전체 내장 문안을 재생성·문체 변환하던 경로를 제거했다. 84챕터의 seed ID만 담은 생성 인덱스로 누락 여부를 먼저 확인한다. 누락·알 수 없는 챕터·버전 차이는 기존 seed 보충 경로를 유지한다. 같은 명조의 사실값은 조합과 flow 렌더링에서 재사용한다.
3. 문체 변환 때마다 생성하던 세 치환표와 어미 정규식을 모듈 초기화 때 한 번 준비하도록 했다. 승인 원고 **14,892개 전체**의 변환 결과가 이전 코드와 같다. 이전 배포와 조합·선택·조건·근거 결과 **420건**도 정확히 일치했다.
4. CPU 개선만으로는 동시 24요청에서 DB 10초 시간 초과가 남았다. 기존 게시 조회 RPC는 최대 **5,151,125바이트**의 초안·이력·검증 사례 포함 원본을 매번 JSONB로 파싱했다. 대표 `timeline_self_01`의 EXPLAIN ANALYZE는 **341.639ms, 임시 쓰기 589블록**이었다.
5. 원본 `public.kv.value`를 보존하고 `reading_published` JSONB 조회용 필드를 추가했다. BEFORE INSERT/UPDATE 트리거가 게시본·버전을 같은 행·같은 트랜잭션에서 갱신한다. 기존 공개 RPC는 이를 바로 읽고 만료·묘비를 확인한다. 조회용 필드는 챕터당 **7,661~103,900바이트**이며 대표 쿼리는 **1.431ms, 임시 쓰기 0블록**으로 바뀌었다. 관리자 API/CAS 및 기존 백업 복원도 같은 트리거를 거치므로 별도 동기화 작업이 필요 없다.

요청 사이 진행 중인 DB 읽기를 공유하는 중간 시도는 24 동시 요청에서 Worker 런타임 취소를 일으켰다. 즉시 롤백하고 소스에서 제거했다. 최종 배포에는 이 비동기 공유가 없다. 해당 실패 증거도 보존했다. 공개 요청은 완료된 풀이·출처 상태를 캐시하지 않아 변경/철회를 다음 읽기에서 확인한다.

## 최종 검증

| 항목 | 결과 |
|---|---:|
| 동시 요청 수 | 24 |
| 연속 실행 | 336건 × 2 |
| 전체 챕터 | 84, 매 회 전부 |
| 입력 구간 | 약함·중간·강함·시각 미상 |
| HTTP 성공 / 승인 출력 일치 / FullReading.apply | 각각 672/672 |
| 문단 | 5,376개 |
| 최장 문단 | 1,031자, 클라이언트 1,200자 제한 이내 |
| 503 / 500 / 재시도 | 0 / 0 / 0 |
| providerCallCount / generatedParagraphCount | 0 / 0 |
| requestCostUSD / generation.model | 0 / none |
| 미해결 pending / 템플릿 토큰 | 0 / 0 |
| 원본 전체 문자열 보존 | 84/84 |
| 조회용 필드와 원본 게시본 일치 | 84/84 |

최종 배포 tail은 해당 합성 검증 헤더만 수집했다. 수집된 **150개 이벤트 모두 outcome=ok, HTTP 200, 예외 0개**였다. tail은 전체 672건의 완전한 로그가 아니며 전체 응답 성공 여부는 검증 도구의 672개 기록으로 확인했다. CPU 중앙값 11ms, P95 22ms, 최대 42ms였다. CPU 수치가 항상 특정 한도 아래라고 주장하지 않는다. 최종 연속 부하에서 한도 오류가 없었다는 결과다.

`force=true`, `mode=ai`, body의 관리자 플래그를 넣어도 공개 방문자 경로는 AI를 호출하지 않았다. 공개 compose/life-ai/past-story는 409·AI 0회, 관리자 reading-library 익명 요청은 401이었다. AI 0회는 이 검증 요청의 실제 응답 계측과 무AI 코드 경로, 네트워크를 금지한 로컬 전체 회귀검사 결과다. 제공업체 계정 전체의 청구 내역을 조회한 결과는 아니다.

추가로 운영 DB 안에서 CAS 게시 교체→즉시 조회 반영→만료→묘비 테스트를 한 트랜잭션으로 실행하고 ROLLBACK했다. 실제 게시 원고에는 이 테스트 변경이 공개되지 않았다. 이후 84개 원본 문자열이 기존 적용 스냅샷과 같은 것을 재확인했다. RLS 활성, anon/authenticated SELECT 불가, anon RPC 실행 불가, service_role 실행 허용도 확인했다. 보안 advisor는 의도된 service-only kv의 `RLS Enabled No Policy` INFO 한 건뿐이다. [관련 advisor 설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

로컬 검증: reviewed-library-sim, reading-cpu-regression, reading-composition-policy-sim, editorial-manuscript-review-sim 통과. 4명조×84챕터의 네트워크·제공업체 호출 0회, 기존 초안 격리/CAS/승인/철회 검증 포함. git diff --check 통과.

## 수정 모듈과 운영

- `functions/_reviewed-reading.js`, `_reviewed-library.js`, `_reading-flow-copy.js`: 불필요한 seed 재생성 제거, 요청 내 사실 재사용.
- `functions/_reading-seed-index.js`, `tools/build-reading-seed-index.cjs`, `tests/reading-cpu-regression.cjs`: 본문 없는 내장 ID 인덱스·동등성 검사. 내장 seed 수정 시 생성 도구와 테스트를 다시 실행한다.
- `report/v2/plain-copy.js`: 동일한 변환표·정규식의 반복 생성 제거. 정적 자산 변경은 이 파일 1개, 나머지 174개는 이전 배포와 동일하다.
- `supabase/reading-publication-projection.sql`: 조회용 필드·트리거·동일 인터페이스의 게시 조회 RPC.
- `tools/verify-concurrency-production.cjs`: 재시도 없이 HTTP 원문/헤더·정확한 승인 출력·클라이언트 적용·AI 계측 검증.

관리자 사용 방법은 그대로다. 초안 편집·비교·검사·승인 게시를 수행하면 조회용 필드는 자동 갱신된다. 이력·원본·시나리오를 삭제하거나 수동 재동기화하지 않는다. 새 환경에는 기존 schema/CAS SQL 적용 후 `reading-publication-projection.sql`을 적용한다. 기존 `schema.sql`을 다시 실행하면 RPC가 과거 구현으로 돌아갈 수 있으므로 이 최적화 SQL도 마지막에 재적용한다.

## 백업·롤백·기록

`output/concurrency-20261022/optimized-release/`에 이전 Worker·이전 plain-copy·배포 manifest·소스 아카이브·현재/이전 배포 ID·설정 해시를 보존했다. 설정·바인딩·비밀 값은 변경하지 않았다. Git 커밋/푸시는 하지 않았으므로 차후 Git 자동 배포에 이번 소스 변경도 포함해야 한다.

- 현재: `a710eb44-1270-4775-a2a7-4f43d2df457b`
- 직전(초기 CPU 최적화): `e9ca829b-584a-4339-a9f7-843cc11c6bfe`
- 작업 전: `82aae49e-877d-49f3-85bf-4f6bff7fea3d`
- 코드 1단계 복원: `node tools/deploy-reading-cpu-fix.cjs rollback`. 더 새 배포가 있으면 중단한다.
- DB 조회 개선 복원 SQL: `output/concurrency-20261022/rollback-projection.sql`. 과거 RPC를 먼저 복원하고 이번 트리거·함수·조회 필드만 제거한다. 원본 value는 그대로다. 조회 성능은 과거 수준으로 돌아가므로 장애 복구 목적일 때만 실행한다.
- 최초 원고 게시 전 백업과 복원 SQL은 `output/reviewed15-release-20261021/`에 계속 보존한다.

최종 재현:

```powershell
$env:RELEASE_DIR='output/concurrency-20261022/optimized-release'
$env:CONCURRENCY='24'
$env:CHECK_DIR='output/concurrency-20261022/new-verification'
node tools/verify-concurrency-production.cjs
```

최종 결과: `optimized-c24/live-verification.json`, `optimized-c24-repeat/live-verification.json`, 각 `live-output-samples.json`. 원인 증거: `c12/last-transient-response.html`, `before-worker-tail.log`, `tail-summaries.json`, `db-performance.json`. 중간 실패와 롤백 기록은 삭제하지 않았다. 백업·원고·운영 로그·SQL은 공개 정적 배포에 포함하지 않았다.
