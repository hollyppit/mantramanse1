# 1차 운영 적용 완료

사용자 명시 승인 후 2026-10-17 21:39 KST경 운영에 적용했다.

- 운영 사이트: https://mantramanse.pages.dev
- 새 배포: `a5b6c5e1-d746-4cf0-9b0f-d2486d938083`
- 복구 대상 이전 배포: `af43e068-9557-4614-9136-ab585f94f406`
- Supabase 마이그레이션: `agentic_rag_first_rollout_safe_off`. CAS 함수 및 신규 런타임 행만 추가했다.
- 원본 159개 행의 해시 `b032d9871790dea1ccca4f8e91f30343`는 적용 전후 동일하다. 지식 386개, 승인 382개, 게시 333개를 유지했다. 원본 내용·ID·출처·챕터 연결·승인·게시 상태는 바꾸지 않았다.
- 연구 OFF, 자동 게시 OFF, 기존 지식만 사용 ON, 일·월·작업 예산 0. 작업·후보·활성 오버레이·비용 장부는 비어 있고 일일 실행 이력도 없다. 예약 Worker와 Cron은 배포하지 않았다.
- 기존 Cloudflare 설정 전체가 적용 전후 동일하다. DB/KV/R2 바인딩·비밀 환경 변수·호환 설정을 유지했고 API 키 업로드와 유료 AI 호출은 하지 않았다.
- 운영 공개 파일 3개의 배포 후보 해시 일치, 공개 콘텐츠 API 200, 미인증 관리자 API 401을 확인했다. 운영 관리자 비밀번호를 읽을 수 없어 인증 후 대시보드 HTTP 검사는 수행하지 않았다. 운영 OFF 상태는 SQL로 확인했고 관리자 인증 성공 경로는 동일 후보의 로컬 환경에서 확인했다.
- CAS는 SECURITY INVOKER, search_path=pg_catalog이며 anon/authenticated 실행 불가, service_role만 실행 가능하다. 보안 진단의 INFO 1건은 기존 서버 전용 public.kv의 RLS 정책 없음 안내다. 공개 역할의 접근을 열지 않았다. 안내: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

상세 증거는 `AGENTIC_RAG_PRODUCTION_DEPLOYMENT_2026-10-17.json`, `AGENTIC_RAG_PRODUCTION_DB_VERIFIED_2026-10-17.json`, `AGENTIC_RAG_ROLLOUT_SMOKE_2026-10-17.json`에 기록했다. 새 연구 기능 활성화와 반복 비용 설정은 별도 승인 범위다.
