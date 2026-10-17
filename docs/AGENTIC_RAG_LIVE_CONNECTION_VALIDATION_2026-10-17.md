# 실제 API 연결 및 무료 추가 검증 결과

> 후속 유료 검증 완료: 사용자 비용 승인 후 실제 추출·자동 게시·롤백과 격리 Supabase HTTP RPC 검사까지 수행했다. 최신 결과와 비용·검사 범위는 `AGENTIC_RAG_FINAL_VALIDATION_2026-10-17.md`를 참고한다. 아래 미검증 설명은 이전 시점의 기록이다.

## 이번 결과

- 로컬 검증 파일에 사용자가 직접 저장한 키로 OpenAI 모델 목록 GET이 HTTP 200을 반환했다. 모델 생성·추론 요청은 0회다.
- 사용자가 Brave 무료 잔여량을 확인하고 검색 1회를 명시적으로 허용했다. 해당 1회 검색이 HTTP 200을 반환했다. 허용 상태를 파일에 영구 저장하지 않아 다음 실행에서 자동으로 검색이 반복되지 않는다.
- PostgreSQL 17.5(PGlite 0.3.15)에서 신규 SQL·실행 권한·동시 CAS·모의 공급자 자동 게시·개별 롤백·이력 보존 검사를 통과했다. 운영 17.11과 주 버전은 같지만 세부 버전과 호스팅 계층은 다르다.
- 실제 백업 159개 행을 PostgreSQL 17.5의 빈 로컬 DB로 복원했다. 모든 값·ID·출처 연결·시간·승인·게시 상태 해시가 일치했고, 새 SQL을 두 번 적용한 뒤에도 기존 행이 동일했다. 지식 386건·승인 382건·게시 333건이다.
- 실제 Edge에서 합성 원국을 사용해 36쪽 PDF를 내려받았다. 파일은 6,013,681바이트이며 `pdfinfo`로 실제 36쪽·A4·JavaScript 없음이 확인됐다. 1·18·36쪽을 렌더링해 한글과 본문·쪽 표시를 확인했다. 시험 페이지의 API 요청 및 모든 POST는 차단했다. 운영 사이트에서 내려받은 사용자 PDF는 아니다.

## 검증의 경계

실제 API **인증 성공**과 자동 연구 **전체 성공**은 별개다. 실제 OpenAI 생성과 출처 추출·검증을 연결한 연구는 비용이 발생할 수 있어 실행하지 않았다. 자동 게시·롤백은 실제 로컬 PostgreSQL에 모의 공급자 응답으로 검증했다. 실제 Supabase PostgREST에서 새 RPC를 호출하는 격리 환경 검사는 아직 없다. 이 검사를 대신하려고 운영에 시험 SQL을 설치하지 않았다.

운영 쓰기·SQL 적용·배포·예약 활성화는 0회다. 기존 DB 연결 확인, Supabase RAG 백업 복원, R2 920개·KV 146개 백업 검증 결과는 이전 보고서를 참고한다. 이번에도 키는 로그·문서·배포 묶음에 포함하지 않았다.

## 재실행

무료 패키지는 ignored `output` 아래에 고정 버전으로 설치되어 있다. 키 없이 실행하는 DB 검사:

```powershell
node tests/rag-postgres17-sim.cjs
$env:RAG_TEST_PG_MAJOR='17'
node tools/verify-rag-backup-local.cjs output/protected-backup/mantramanse1-rag-20261017.json
```

실제 키를 사용하는 기본 연결 검사(생성 없음, 무료 잔여량 확인 설정이 없으면 Brave 검색 보류):

```powershell
node tools/check-rag-provider-connections.cjs output/protected-backup/api-probe.env
```

## 운영에 남은 일

1. 무료 범위를 넘는 실제 생성 연구 검증은 수행하지 않았다. 수행하려면 사용 가능한 무료 혜택과 호출 한도를 별도로 확인한다.
2. 격리 Supabase/PostgREST의 새 RPC·서비스 역할 연결 검증을 진행하거나, 안전한 OFF 상태 배포 범위와 남은 검증 한계를 먼저 합의한다. 운영에 시험 쓰기를 하지 않는다.
3. 최신 백업 기준시각과 배포 파일·복구 방법을 확인해 결과를 보고하고, 사용자의 운영 배포 승인을 받는다.
4. 승인받더라도 초기값은 연구 OFF·자동 게시 OFF·기존 지식만 사용·예약 OFF다. AI 자동 연구를 켜는 것은 그 이후 별도 단계다.

증거: `AGENTIC_RAG_PROVIDER_CONNECTIONS_2026-10-17.json`, `AGENTIC_RAG_POSTGRES17_TEST_2026-10-17.json`, `AGENTIC_RAG_REAL_BACKUP_RESTORE_PG17_2026-10-17.json`, `MOVINGTOON_DOWNLOAD_RESULTS.json`. PDF: `output/pdf/mantra-reading-validation.pdf`.
