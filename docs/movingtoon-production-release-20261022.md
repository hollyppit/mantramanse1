# 승인 후보 운영 게시·배포 완료 — 2026-10-22

승인받은 `everyday-all-84-20261021-15`를 운영 DB에 게시하고 Cloudflare Pages 프로덕션 배포를 완료했다. 실제 서비스에서 **84챕터 × 4명조 구간 = 336건**의 출력·클라이언트 적용 검사가 최종 통과했다. 모든 검증 요청의 **AI 호출 0회·생성 문단 0개·요청 비용 0 USD**를 확인했다.

## 운영 릴리스

- 서비스: https://mantramanse.pages.dev/report/v2/
- 릴리스 ID: `reviewed15-20261021`
- Supabase: `mantramanse1` / `devkslhggrkqtianjamj`
- 새 프로덕션 배포: `82aae49e-877d-49f3-85bf-4f6bff7fea3d`
- 이전 배포(복원 대상): `fb01bced-b2e3-4abc-bb7e-bc841c91e275`
- 배포 완료: 2026-10-21 20:34:46 KST
- 실서비스 전체 검증 완료: 2026-10-22 01:16:48 KST
- 게시와 배포는 명시적 사용자 승인 뒤 수행했다. 관리자 승인 대기 상태는 해제됐다.

## 백업과 롤백

운영 라이브러리 84개의 **전체 원래 저장값**을 별도 키에 보존했다. 본문만이 아니라 초안·게시본·시나리오·승인 정보·이력을 포함한 원래 문자열과 MD5, 원래 expires_at·updated_at을 보존했다.

- 게시 전 백업: `backup:reading-release:reviewed15-20261021:before:<chapter>`
- 게시 직후 정확한 저장값: `backup:reading-release:reviewed15-20261021:applied:<chapter>`
- 두 백업 모두 기존 비공개 `public.kv` 저장소 안에 보존. RLS·권한·스키마 변경 없음.
- `rollback-all.sql`: 전체 84챕터를 한 트랜잭션으로 원래 저장값으로 복원. 게시 뒤 관리자 수정이 있다면 자동 중단해 그 수정을 덮어쓰지 않는다.
- 배포 롤백: `node tools/deploy-reviewed15-release.cjs rollback`. 현재 배포가 이번 배포인지 확인한 뒤 이전 프로덕션 배포로 되돌린다. 더 새로운 배포가 있으면 중단한다.
- 이전 코드: `before-code.tar`, 승인된 현재 코드: `approved-source.tar`, 현재 변경 패치: `approved-working-tree.patch`.

실제 운영 DB에서 게시→전체 복원을 **같은 트랜잭션 안에서 리허설**했고 84개 복원을 확인했다. 마지막에 ROLLBACK해 리허설의 변경이 방문자에게 공개되지 않게 했다. 이후 운영값 84개가 백업과 동일하며, 적용 스냅샷이 0개인 것을 확인한 다음 실제 게시했다.

실제 게시 이후에는 적용 스냅샷 84개를 보존했다. 실제 릴리스를 다시 원복하지는 않았으며, 롤백 준비와 리허설만 검증했다. DB 롤백은 저장값을 복원하면서 수정 시각은 복원 실행 시각으로 기록한다.

## 게시와 배포 검증

38개의 합성 명조를 준비 데이터로 공유하고 84챕터에 총 1,038개의 정례·반례 사례를 연결했다. 모든 조건부 문안에 적용 사례와 적용하면 안 되는 사례가 존재하는지 로컬에서 확인했다. 준비 데이터 122개(명조 38·챕터 84)의 MD5가 모두 일치한 후 전체 라이브러리를 한 트랜잭션으로 게시했다. 기존 이력은 유지하고 새 판의 승인 정보에 사용자 명시 승인과 릴리스 ID를 기록했다.

게시 직후와 실서비스 검증 후 다음 항목을 다시 확인했다.

| 항목 | 결과 |
|---|---:|
| 게시 챕터 | 84/84 |
| 승인 후보와 본문 해시 일치 | 84/84 |
| 역할·종류·적용/제외 조건·근거 연결 해시 일치 | 84/84 |
| 새 릴리스 ID 일치 | 84/84 |
| 초안과 게시본 일치 | 84/84 |
| 연결된 검증 시나리오 | 1,038 |
| 게시 직후 전체 저장값 스냅샷 | 84 |

정적 자산 175개를 이전 Git 프로덕션 배포와 대조했다. 정적 파일은 관리자 비교 화면 `report/admin/v2-reading-library.js` 한 개만 교체했고, 나머지 174개는 운영 원본과 같은 바이트로 패키징했다. `engine.js`, 사용자 HTML과 뷰어 스크립트의 실제 서비스 해시도 확인했다. 새 Worker는 운영과 같은 호환 날짜 `2026-09-29`로 빌드했다. 기존 바인딩·비밀 값·운영 설정 해시는 유지됐다. 만세력 계산 엔진과 RAG·영상 자산을 삭제하거나 교체하지 않았다.

배포는 승인된 로컬 패키지의 직접 업로드 방식으로 수행했다. Git 커밋·푸시는 하지 않았으므로 이후 Git 자동 배포에도 이번 작업의 코드 변경을 포함해야 한다. 승인된 소스 아카이브와 컴파일 Worker, 정적 자산 manifest를 릴리스 폴더에 보존했다.

## 실제 서비스 검증

공개 주소의 `POST /api/movingtoon-reading`을 실제로 호출했다. 챕터별 주된 비중의 약함·중간·강함 명조와 시각 미상 명조를 사용했다.

- 84챕터, 336요청, 2,688문단 검사 완료.
- 승인 후보와 실제 조합 결과 일치: 336/336.
- 실제 `ReportV2.FullReading.apply` 클라이언트 적용 검사: 336/336.
- 시각 미상: 84/84.
- 미완성 pending·미해결 템플릿 토큰: 0.
- 최장 문단 1,031자. 클라이언트의 1,200자 제한 이내.
- `aiSkipped=true`, `providerCallCount=0`, `generatedParagraphCount=0`, `requestCostUSD=0`, 생성 모델 `none` 확인.
- 요청 body에 `force=true`, `mode=ai`, `__READING_ADMIN_GENERATION=true`를 넣어도 유료 생성 경로가 열리지 않음.
- 공개 `/api/compose`, `/api/life-ai`, `/api/past-story`는 409와 AI 호출 0회를 유지.
- 관리자 `/api/reading-library` 비로그인 접근은 401.
- 새 프로덕션 배포 ID와 운영 설정 유지 재확인.

검증 중 관찰한 사항을 숨기지 않고 기록했다. 최초 대조는 근거 목록의 객체 키 순서 때문에 63건을 불일치로 보았다. PostgreSQL JSONB는 객체 키를 UTF-8 길이와 바이트 순으로 저장하므로, 로컬 검증 도구도 같은 직렬화를 재현하도록 고쳤다. 본문·조건 동등성 검사를 완화하거나 실제 게시 문안을 고친 것은 아니다.

연속 병렬 검증 중에는 HTML 503 응답도 발생했다. 부하를 중단하고 공개 홈/API의 단일 요청 정상 응답을 확인한 뒤 동시성을 1로 낮춰 전체를 다시 검증했다. **최종 336건은 모두 통과했고 전송 재시도 1건이 있었다.** 병렬 요청의 503은 특정 애플리케이션 원인까지 확정하지 않았다. 과도한 동시 요청 조건의 성능 보장은 이번 기능 검증 범위가 아니다. 검증용 요청 헤더에 한정한 오류 로그 조회 기록도 보존했다.

AI 0회는 해당 검증 요청의 서비스 계측과 무AI 공개 경로를 확인한 결과다. 제공업체 계정 전체의 청구액을 대조했다는 뜻은 아니다. 관리자 기능과 별도 백그라운드 작업의 설정은 변경하지 않았다.

## 운영 중 승인 검토와 해결

준비 데이터 일부 전송이 자동 승인 검토에서 목적지 소유 관계 미확인을 이유로 거부됐다. 우회 경로를 사용하지 않고 다음 근거를 추가 확인했다.

1. 연결된 현재 사용자가 속한 조직 `wwxbvtgangkdtfhbddnn`과 대상 프로젝트의 조직이 일치함.
2. 기존 운영 연결 증거가 `mantramanse.pages.dev`의 읽기 경로를 같은 프로젝트로 확인한 기록임.
3. 새 실제 API 호출도 해당 DB의 백업 게시본·버전과 일치함.
4. 전송 대상은 사용자가 명시 승인한 자체 원고와 이름·원시 생년월일을 제외한 합성 명조임.

추가 근거를 포함한 재검토 후 동일 도구·동일 목적지의 전송이 허용돼 완료했다. 배포 비밀 URL·키를 해독하거나 외부에 노출하지 않았다. 현재 남아 있는 승인 차단은 없다.

## 산출물과 재현

모든 릴리스 파일은 저장소의 ignored 경로 `output/reviewed15-release-20261021/`에 보존했다. 공개 배포 패키지에는 백업·SQL·운영 기록을 넣지 않았다.

- `live-verification.json`: 최종 336건 검증·요청 ID·AI 호출 수·비용·클라이언트 적용 결과.
- `live-output-samples.json`: 실제 반환된 챕터별 문단.
- `operation-receipts.json`: 백업·리허설·게시와 첫 DB 검증 도구 결과.
- `post-live-db-verification.json`: 실서비스 검사 후 최종 DB 해시 검증.
- `deployment.json`, `preflight.json`, `manifest.json`: 현재/이전 배포와 운영 설정·파일 해시.
- `backup.sql`, `publish-all.sql`, `rollback-all.sql`: 백업·게시·복원 SQL.
- `publication-plan.json`, `stage-batches.json`: 후보와 검증 시나리오의 무결성 명세.
- `initial-verification-order-differences.json`, `concurrent-transient-results.json`: 초기 검증 차이와 병렬 요청의 전송 문제 기록.

```powershell
# 조회 전용 검증 SQL 생성. 이 명령만으로 DB를 변경하지 않음.
node tools/reviewed15-release-sql.cjs verify-publication

# 실제 공개 서비스를 다시 검증. AI 생성은 호출하지 않음.
node tools/verify-reviewed15-production.cjs

# 필요할 때만: 전체 DB 복원 SQL 생성 후 승인된 DB에서 실행
node tools/reviewed15-release-sql.cjs rollback

# 필요할 때만: 이번 배포를 이전 Cloudflare 프로덕션 배포로 복원
node tools/deploy-reviewed15-release.cjs rollback
```

롤백은 DB 복원과 Cloudflare 배포 복원이 각각 필요하다. 이후 새 게시나 배포가 있다면 자동 보호 조건을 해제하지 말고 변경분을 먼저 확인해야 한다.

후속 병렬 503 원인 해결·최신 운영 배포 결과: [동시성 개선 보고서](movingtoon-concurrency-fix-20261022.md). 기존 '원인 미확정' 상태는 이 후속 검증으로 갱신됐다.
