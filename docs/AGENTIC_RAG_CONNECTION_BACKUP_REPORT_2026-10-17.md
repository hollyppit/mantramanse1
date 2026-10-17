# DB 연결·R2/KV 백업 검증 결과

> 후속 완료: 사용자가 저장한 두 키로 OpenAI·Brave HTTP 200 인증 성공, PostgreSQL 17 로컬 SQL·자동 게시·롤백 검사 및 실제 36쪽 PDF 다운로드를 확인했다. 상세한 최신 결과와 남은 한계는 `AGENTIC_RAG_LIVE_CONNECTION_VALIDATION_2026-10-17.md`를 참고한다. 아래 외부 API 미인증 설명은 이전 시점 기록이다.

## 완료

- 운영 사이트 `https://mantramanse.pages.dev/api/free-content` 공개 GET 응답의 내용 해시가 Supabase `mantramanse1`의 `free:content`와 일치했다. 같은 키가 운영에 연결된 물리 KV에는 없어 Supabase 읽기 경로 사용을 확인했다. 비밀 URL 자체를 읽거나 복호화한 것은 아니다.
- 승인받은 Supabase RAG 159개 행의 백업·로컬 복원 비교가 일치했다. 지식 386건, 승인 382건, 게시 333건을 보존했다.
- 운영 KV `GLOSSARY_KV` 146개 키의 바이너리 값과 만료·메타데이터를 백업했다. 값을 다시 읽고 해시를 비교했다.
- 운영 R2 `mantra-clips` 920개 파일(2,923,467,818바이트)을 백업했다. 키·크기·ETag·수정 시각·HTTP/사용자 메타데이터를 보존했다. 원격 목록 전후 비교와 모든 로컬 파일 SHA-256 비교가 통과했다.
- 운영 설정과 배포 ID는 변경하지 않았다. Supabase RAG 해시도 기존 기준값과 일치한다. 연구용 SQL은 운영에 적용하지 않았다.

백업 위치: `output/protected-backup/cloud-2026-10-17T11-37-24-189Z/`. 이 폴더와 검증 키 파일은 Git·검토용 소스 묶음에서 제외한다. 폴더 이름만으로 OS 암호화가 제공되는 것은 아니다. R2/KV 복원은 실제 클라우드에 쓰지 않고 로컬의 바이너리·메타데이터 완전성 검사로 확인했다.

## 비용 확인 범위

실행 전 GraphQL 분석에서 R2 이번 달 작업 41,313건, KV 이번 달 전체 작업 65,639건, 오늘 읽기 1,686건·목록 0건으로 관측됐다. R2 920개 파일 모두 Standard 등급이었다. 공식 무료/포함 한도에 큰 여유가 있는 범위에서 GET만 수행했다. 유료 추론·유료 검색·새 유료 자원 생성은 실행하지 않았다. 청구 원장 API는 권한 부족(403)이어서 실제 청구 금액 확정까지 검증한 것은 아니며, 분석 지표에는 지연이 있을 수 있다.

참고: [R2 요금·무료 한도](https://developers.cloudflare.com/r2/pricing/), [KV 요금·포함 한도](https://developers.cloudflare.com/kv/platform/pricing/).

## 외부 API

OpenAI 모델 목록 GET은 HTTP 401, 인증·검색어 없는 Brave GET은 HTTP 422로 실제 HTTPS 응답을 받았다. 이는 네트워크 접속 확인이며 인증 성공이나 실제 자동 연구 성공이 아니다. OpenAI 키는 Cloudflare에 봉인되어 값을 읽을 수 없고 Brave 키는 미등록이다. 로컬 테스트 키 입력 파일은 `output/protected-backup/api-probe.env`다. OpenAI는 생성하지 않고 모델 목록 GET으로만 인증을 검사한다. Brave는 사용자가 무료 잔여 검색량을 확인·설정한 경우에만 검색 1회를 허용한다.

키는 채팅·Git·보고서에 기록하지 않는다. 참고: [OpenAI 모델 목록 API](https://developers.openai.com/api/reference/resources/models/methods/list), [Brave 키 발급 안내](https://api-dashboard.search.brave.com/documentation/guides/authentication).

## 기존 출처 자료의 검토 항목

Supabase 출처 목록 50건 중 39건은 해당 원문 청크 행이 원래 DB에 없었다. 이는 백업 과정에서 없어진 자료가 아니다. 메타데이터만 등록한 기존 출처인지 검토가 필요하다. `hasFile`로 원본 업로드 완료가 표시된 출처는 0건이며, 이 표시를 기준으로 한 R2 원본 누락은 0건이다. 표시되지 않은 원본 파일의 완전성까지 보증하지 않는다. 모든 R2 파일 자체는 백업했다. 진단 때문에 기존 지식을 삭제·재승인·비공개 처리하지 않았다.

## 운영 적용 전 남은 것

1. 검증 키를 로컬 파일에 설정하고 실제 API 인증 확인. 무료 혜택이 없다면 검색·생성 호출은 하지 않는다.
2. PostgreSQL 17의 격리 검증 환경에서 신규 SQL·REST 권한 검사. 현재 실제 서버의 조회·권한 검사는 완료했고, SQL 적용/복원 검사는 로컬 PostgreSQL 18.6으로 수행했다.
3. 운영 조건의 브라우저 PDF 다운로드 검사, 최신 변경 파일·비용 상한·복구 계획 보고.
4. 사용자 승인 후에만 운영 SQL·사이트·예약 실행을 단계적으로 적용. 첫 적용은 연구/자동 게시/예약 실행을 끈 상태로 시작한다.

Supabase RAG·KV·R2의 데이터 백업이며, DB 전체의 역할·스키마·비RAG 데이터·외부 서비스 설정까지 포함한 서비스 전체 재해 복구 백업은 아니다.
