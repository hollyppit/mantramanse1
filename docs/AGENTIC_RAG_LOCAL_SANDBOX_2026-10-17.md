# 운영과 분리된 로컬 검증 결과

## 범위

사용자가 비용 안내 후 **“추가 비용 없이 로컬 검증만 진행”**을 선택했다. 따라서 유료 Supabase 프로젝트/브랜치는 생성하지 않았고 OpenAI·Brave 유료 API도 호출하지 않았다. 실제 외부 API 성공이나 Supabase 클라우드 SQL 적용을 완료했다고 보고하지 않는다.

운영 배포와 운영 DB/KV/R2 변경은 하지 않았다. 테스트에는 운영 자료나 사용자 데이터 대신 2개의 합성 지식과 테스트 출처를 사용했다.

## 완료 결과

| 검사 | 결과 |
| --- | --- |
| 실제 PostgreSQL 엔진에서 기존 schema.sql 및 RAG CAS migration 적용 | 통과 |
| anon/authenticated 역할의 테이블 접근 및 CAS 함수 실행 차단 | 통과 |
| 동일 기대값으로 6회 CAS 요청, 한 번만 성공 및 오래된 버전 거절 | 통과 |
| 실제 DB에 연구 상태·보강 버전·감사 이력 저장 | 통과 |
| 자동 승인과 자동 게시 상태 분리, 2개 보강 버전 게시 | 통과 |
| 첫 번째 지식만 이전 버전으로 롤백, 두 번째 보강본 게시 유지 | 통과 |
| 원본 자료·지식 ID·승인·게시 상태의 저장값 동일성 | 통과 |
| 롤백 후에도 후보와 감사 이력 유지 | 통과 |
| DB 백업 파일 생성 및 다시 불러온 후 상태 유지 | 통과 |
| 실제 로컬 HTTP API 및 Codex 브라우저 화면에서 게시/롤백 | 통과 |
| 인증 없는 HTTP 요청 및 다른 Origin의 쓰기 요청 차단 | 통과 |
| 실제 유료 외부 API 호출 | 사용자 선택에 따라 미실행 |
| Supabase 클라우드 DB SQL 적용 | 사용자 선택에 따라 미실행 |

PostgreSQL은 npm의 `@electric-sql/pglite` 0.5.10에 포함된 PostgreSQL 18.6 엔진을 사용한다. SQL/권한/상태 저장은 모의 Map이 아닌 실제 PostgreSQL 실행 결과다. 연결된 Supabase 프로젝트 목록에서 확인된 PostgreSQL 17과 메이저 버전이 다르므로 운영 버전의 호환성 검증을 대체하지 않는다. 또한 단일 엔진의 동시 요청 시험이며 Supabase 클라우드의 다중 연결 부하 시험을 대신하지 않는다. 검색 결과·수집 문헌·AI 응답은 명시적인 fixture다. 화면의 달러 금액은 예산 로직 확인용 모의값이고 실제 API 비용은 0이다.

## 실행 중인 로컬 화면

현재 주소: http://127.0.0.1:55478/

`tools/rag-local-sandbox.cjs`가 127.0.0.1에만 바인딩한다. 운영 API 주소나 운영 인증 정보를 로드하지 않으며 외부 네트워크 호출은 허용된 fixture 응답으로 대체하거나 거절한다. 브라우저에서 자동 게시 2건을 실행하고 SELF-0001만 롤백했다. SELF-0002는 게시 상태를 유지한다. 원본 보존 검사 버튼으로 이를 다시 확인할 수 있다.

현재 Node 서버가 종료되면 주소는 사용할 수 없다. 다시 시작할 때는 다음 명령을 사용한다.

```powershell
# 의존성이 없을 때만, 무료 로컬 테스트 엔진 설치
npm.cmd install --prefix output/rag-staging-tools --no-audit --no-fund @electric-sql/pglite@0.5.10

# 새 독립 세션 시작. 시작 로그에 실제 포트가 표시된다.
node tools/rag-local-sandbox.cjs
```

서버를 새로 시작하면 새 합성 데이터 세션이 열린다. 종료 시 현재 DB를 `output/rag-local-sandbox/`에 백업한다. 기존 세션 기록을 자동 삭제하지 않는다.

## 재현 가능한 SQL 시험

```powershell
node tests/rag-postgres-integration.cjs
```

이 테스트는 운영 연결 없이 실제 PostgreSQL을 생성하고 migration·권한·자동 게시·개별 롤백·보존·백업 재로딩을 검사한다. Windows 경로를 직접 가상 파일시스템에 마운트할 때 발생한 오류는 메모리 DB와 공식 dump/load API를 이용해 해결했다. 백업 파일 자체는 일반 파일시스템에 저장된다.

현재 브라우저 실행 결과의 읽기 전용 검사는 다음과 같다. 포트는 시작 로그에 맞춘다.

```powershell
node tools/check-rag-local-sandbox.cjs http://127.0.0.1:55478/
```

## 증거 파일

- `docs/AGENTIC_RAG_POSTGRES_TEST_2026-10-17.json`: 실제 SQL 엔진 검증 결과.
- `docs/AGENTIC_RAG_LOCAL_BROWSER_TEST_2026-10-17.json`: 실제 로컬 HTTP/브라우저 게시·롤백 결과.
- `output/rag-local-postgres-verified.jpg`: 전체 화면.
- `output/rag-local-postgres-rollback.jpg`: 한 지식의 롤백과 다른 지식의 게시 유지 화면.

## 먼저 생성한 Cloudflare 테스트 자원

사용자의 테스트 환경 생성 요청에 따라 비용 선택 전에 `mantramanse-rag-test-20261017`이라는 전용 Pages 프로젝트·KV·R2를 생성했다. 운영 자원과 바인딩이 다름을 확인했다. 운영 자료를 복사하지 않았고 이 프로젝트에 사이트나 스케줄러를 배포하지 않았다. Supabase 테스트 DB나 유료 브랜치는 생성하지 않았다. 이후 사용자가 로컬 검증을 선택했으므로 클라우드 자원에서 연구나 API 호출은 실행하지 않았다.

생성 내역: `docs/AGENTIC_RAG_STAGING_RESOURCES_2026-10-17.json`. 아직 실사용하지 않은 자원을 임의로 운영에 연결하지 않는다. 운영 Pages 설정은 조회 전후 동일했으며 운영 데이터 무결성을 실제 DB 전체에 연결해 재측정한 것은 아니다.

## 남은 운영 전 검증

현재 결과는 로컬 검증 완료다. 실제 사업자 API 인증·요금·응답 모델과 클라우드 DB 권한/환경에서의 통합 검증은 포함하지 않는다. 이를 진행할 경우 별도의 사용자 지시 및 연결 준비가 필요하다. 운영 배포는 이번 결과 보고 이후 별도 승인 전까지 수행하지 않는다.
