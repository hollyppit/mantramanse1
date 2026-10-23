# 만트라 풀이 개편: 로컬 감사·대표 3장 시범 검수

작성일: 2026-10-22. 상태: **시범 검수 대기**. 전체 개편·운영 감사·배포 완료 보고가 아니다.

## 보존 및 작업 범위

운영 DB 쓰기, 배포, 기존 코드 교체, 저장 리포트 재작성은 하지 않았다. engine.js, shared-core.js, 사용자 정보, 원국, 기존 관리자 자료 및 이미지·영상·속도 설정은 수정하지 않았다. 시작 당시 tools/verify-concurrency-production.cjs 및 기존 editorial/life-action-candidate.js 등 미커밋 작업은 보존했다.

새 파일은 editorial/rebuild-20261022/, tools/audit-rebuild-20261022.cjs, tests/rebuild-pilot-20261022.cjs 및 이 문서다. source-backup은 읽은 로컬 소스의 백업이며 운영 DB·에셋의 백업이 아니다.

## 감사에서 확인한 구조

- 계산: engine.js → report/v2/saju-data.js → functions/_ik.js의 deriveFacts. 월지·일간·일주·강약·십성·지장간 위치·원국 관계·통근·현재 운 관련 필드를 확인했다. 필드가 존재하는 것과 개별 풀이에서 실제로 사용하는 것은 구분한다.
- 장 구성: report/v2/reading-catalog.js의 7개 주제, 84개 장. 각 장의 질문·요구 근거·연결 rule ID를 audit.json에 기록했다.
- 로컬 문구: functions/_reading-library-seed.js가 focus/detail/bundle/conditional/compound/flow/guide/fiction 문구를 합친 뒤 editorial revisions를 적용한다. 실행 시점 SEED_VERSION은 everyday-all-84-20261021-15다.
- 적용: functions/api/movingtoon-reading.js, _reviewed-reading.js, _reviewed-library.js가 게시 라이브러리·명리 판단과 장별 슬롯을 연결한다. 게시본은 ik:blocks:chapter:library.<chapter>에 있으며 readPublishedLibrary는 게시본만 읽는다. normalizePassages는 정해진 필드만 남기므로 새 메타데이터를 기존 passage에 그대로 추가하면 소실될 수 있다.
- 기존 composition 정책은 의미 태그·우선순위·상충 판정·생활 구성 요소를 지원한다. 새로운 중복 DB를 곧바로 만들기보다 이 정책과 승인·CAS·history 체계를 확장하는 것이 적합하다.
- 화면 관련 소스는 report/v2/ 및 report/admin/에 있다. 소스의 한글 문자열 후보를 파일·행 단위로 수집했다. 이 목록에는 관리자 안내와 코드 주석도 포함된다. 모든 분기의 실제 사용자 노출 여부를 렌더링으로 확정한 목록은 아니다.
- DB 스키마: supabase/schema.sql의 public.kv 및 게시 projection/CAS SQL을 읽었다. 실제 운영 행·관리자 수정·R2 에셋·실행 중 설정은 조회하지 않았다. 10월 21일 인수인계의 운영 상태는 과거 기록이며 현재 DB 상태로 간주하지 않는다.

## 자동 감사 결과

output/rebuild-20261022/audit.json: 289개 소스 파일, 84개 장, 시드 passage 14,892개. 서로 다른 장에서 완전히 같은 문구 179종. 공통 안내문과 증거 설명도 포함하므로 편집 검토 후보이지 오류 확정 건수가 아니다. 추상 표현 탐지는 제한적인 정규식 휴리스틱이다. 의미상 반복·모순·명리 근거 적합성을 전수 검수한 결과로 해석하지 않는다.

- source-backup/: 원본 소스 복사. baseline-manifest.json: 파일별 SHA-256.
- literal-source-index.json: 한글 문자열 후보 파일·행·앞 400자. 긴 행은 truncated 표시. 전체 원문은 백업 파일에서 확인한다.
- audit.json: 장별 모든 시드 문구·조건·규칙 ID·중복 및 검토 후보.
- 기존 DB 게시 문안과 로컬 시드의 차이, 구버전 PDF·deep/life 경로의 최종 노출 차이는 후속 확인 대상이다.

## 새 콘텐츠 계약과 호환성 설계

시범 JSON은 기존 저장소에 연결하지 않은 버전 1 후보 계약이다. 필드: id/version/edition, system, chapters, when/unless, calculationSources, priority/confidence, conflicts/correction, core/basis/example/positive/negative, applications.employee/business/freelance, advice/timing, meaningTags, evidenceKind/sourceRuleIds, status/review.

confidence는 전통 해설의 검수 한계 등급이며 사건 확률이 아니다. 현재 모든 항목은 limited, conditional-guide, draft이며 출처 규칙이 없는 생활 해설이다. 승인된 고전 근거인 것처럼 personal로 바꾸지 않는다. 자미두수는 같은 조건 엔진에 섞지 않고 별도 system 계약과 평가기를 설계한다.

현 단계에서는 스키마 마이그레이션이 필요 없다. 승인 이후 기존 KV의 별도 후보 edition 키에 메타데이터를 보존하고, 검증된 변환기에서 기존 passage/구성 정책으로 투영하는 방식을 권장한다. 이 키와 변환기는 아직 구현·게시하지 않았다. review/scenarios/history/CAS를 재사용하되 normalizePassages 단계에서 메타데이터가 소실되지 않도록 변경이 필요하다.

배포 시에는 현재 게시본·draft·version·digest를 다시 읽어 미게시 관리자 변경을 보호해야 한다. 승인 증거와 전체 시나리오 통과, CAS 성공을 모두 요구하고 직전 게시본을 history로 보존한다. 롤백은 직전 내용을 새 버전으로 게시하여 이력을 유지한다. 시범본의 reviewed 값만 바꿔 운영에 연결하는 흐름은 없다.

## 시범 3개 장과 읽기 구조

종합 timeline_self_01, 재물 timeline_wealth_02, 커리어 timeline_career_01. 각 장에 서로 다른 복수 조건 2개씩, 총 6개 초안을 새로 작성했다. 기존 계산에서 실제 사용하는 조건 정의를 재사용했다.

핵심 진단·해석 근거·생활 사례·유리/불리한 상황·직장/사업/프리랜서 사례·실천 조언을 독립 저장한다. 원국 조건만으로 대운·세운·월운 시기를 만들지 않는다. 시기 해설은 검수 규칙 미연결 상태로 명시했다. 관계·건강·창작·개운은 아직 전면 재작성하지 않았다.

review.html은 정적 로컬 검수 화면이다. 조건별 검색, 기존 동일 조건 핵심 문구와 비교, 주요 문단 수정 및 후보 JSON 다운로드를 지원한다. 수정은 운영 DB에 저장되지 않고 새로 열면 원본으로 돌아간다. 기존 관리자 승인·일괄 업로드·롤백·시뮬레이터와의 통합 구현은 아직 남아 있다. 무빙툰 화면 개편이나 모든 장의 출력 연결도 아직 하지 않았다.

## 검증

실행: node tools/audit-rebuild-20261022.cjs / node tests/rebuild-pilot-20261022.cjs.

실제 계산 원국 1,200개 × 3개 장 = 3,600개 장 비교. 반복 실행 동일, 6개 초안 전부 실제 계산 원국에서 선택됨, 총 114회 선택. draft의 일반 선택 차단, 조건 누락·반례 차단, 의미 중복 억제, 상충 시 우선순위, 승인 메타데이터 요구, 알 수 없는 조건 거부 확인. fetch를 막은 상태에서 실행했고 AI/네트워크 호출 0.

별도의 조건 fixture는 경계 검사용이며 실제 계산 원국 결과와 구분해 테스트했다. 같은 문구가 같은 조건 집단에서 반복되는 것은 템플릿 방식의 한계다. 전체 원국의 유일 문구를 보장하지 않는다. 개인별 차이를 늘리려면 월령·통근·십성 위치·합충 및 실제 시기 규칙의 검수 커버리지를 확대해야 한다.

이 검사는 명리학의 정확성, 예측 타당성, 독자의 이해도, 운영 DB 호환 실행 또는 실제 무빙툰 레이아웃을 입증하지 않는다. 시범 UI는 생성한 정적 HTML이며 브라우저 시각 검수는 별도 대상이다.

## 다음 단계와 승인 기준

요청된 순서의 4번(시범 결과 검증 및 관리자 승인)을 위해 후보를 제출한다. 승인 전 전체 문구 교체·운영 게시는 진행하지 않는다. 승인 대상은 3개 장의 문체와 분리된 콘텐츠 계약이며 명리 근거의 최종 검수와 별개다.

승인 후: 실제 DB의 읽기 전용 목록/백업·복구 확인 → 기존 규칙 출처 대조 및 조건별 커버리지 확대 → 전체 84장 재작성 → 관리자 검색·조건 조회·시뮬레이션·업로드·비교·승인·롤백 통합 → 무빙툰 길이/장면 분할 및 조작·속도 보존 검증 → 기존 게시본과 비교 → 최종 승인 후 배포.

기존 회귀 추가 확인: node tests/reading-focus-eight-sim.cjs 통과. 계산 사례 3,640개, checks 53, passages 352, providerCalls 0. 기존 8개 장의 seed 검증·관리자/공개 API·인증·관리자 수정 보존을 확인했다. 전체 회귀 스위트를 실행한 결과는 아니다.
