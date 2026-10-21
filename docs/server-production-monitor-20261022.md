# 서버 측 운영 모니터 — 2026-10-22

Cloudflare Analytics Engine 활성화, Pages 계측 자동 배포, 독립 Cron Worker, 이메일 경보 전환을 완료했다. 기존 로컬 자동화 `503-ai`는 서버 실행과 시험 이메일 발송 이력을 확인한 후 PAUSED로 전환했다. 다른 자동화는 변경하지 않았다.

## 서버 동작

- Worker `mantra-production-monitor`: PC/Codex 종료와 관계없이 5분마다 실행한다. 28건씩 최대4동시 요청으로 1시간에 84챕터×4명조(시각 미상 포함) 336조합을 순환한다. 유료 AI를 호출하지 않는다.
- HTTP/8문단/본문 길이/pending/미해결 토큰/AI 지표/계측 활성 헤더를 검사한다. 정밀 승인 출력과 클라이언트 적용은 별도 릴리스 검증 도구로 확인한다.
- 실제 공개 요청은 `READING_MONITOR` → `mantra_production_monitor`에 상태·시간·유효성·챕터 ID만 기록한다. 이름·명조·본문·키를 수집하지 않는다. 합성 요청/실제 요청/관리자 제공자 호출을 분리한다. 실제 aiFetch 시작을 비용 원장 설정과 무관하게 기록한다.
- 오류·빈 출력·방문자 AI 호출·10초 이상 응답은 즉시 incident를 기록한다. 실제 방문자 표본20건 이상인 구간에서 p95가3초 이상 또는 누적 정상 기준의2배 이상인 상태가 연속2구간이면 지연 경보를 기록한다. 정상 기준은 정상 구간의 지수이동평균이다.
- Pages 전용 GraphQL `pagesFunctionsInvocationsAdaptiveGroups`로 CPU/메모리/런타임 실패 집계도 확인한다. Workers 집계로 Pages가 보이지 않는 문제를 수정했다. 계측 조회 실패도 경보 대상이다.
- KV `f3499a45bd0c4018ac966e6be91f0838`의 `state`는 Cron 전용이다. 수동 실행은 `manual-state`에 저장해 정기 실행 중복 방지 및 dead-man heartbeat를 오염시키지 않는다.

## 이메일 경보

Cloudflare Notifications의 다음 두 정책이 지정 이메일로 활성화됐다. API 토큰의 알림 쓰기 권한 부족은 로그인된 대시보드에서 해결했으며 권한 확대는 하지 않았다.

- `54f100485fff41889e911c3c4c189151`: incident 1건 이상. 5분 평가, 최근10분 조회, 동일 알림 반복 간격1시간.
- `f515460729d24bcaa9b919d29b617704`: 실제 Cron의 scheduled-complete heartbeat가15분 동안0건이면 경보. 수동 실행은 heartbeat로 인정하지 않는다.

2026-10-21 18:41:48 UTC에 첫 정책의 이메일 시험 발송 이력을 확인했다. 수신함 도착/스팸 분류까지 확인한 것은 아니다. 시험 incident가 Analytics Engine에 수집된 것도 확인했다. 정책 자동 평가의 실제 장애 발송과 UI 시험 발송은 별개의 증거다.

## 검증 및 가시성

- Git `4e5283b5522795d69094f0d70089d9fe38e542fa`의 Pages 자동 배포 `3db1fb93-3541-464d-9230-113dc94162b5` 확인. 공개 응답 계측 헤더 확인.
- 전체84챕터×4명조×연속2회, 동시24요청: 672/672 통과. 승인 출력·8문단·클라이언트 적용·pending/토큰 검사 통과. 실패/재시도/AI 호출/AI 비용0.
- 18:35 UTC의 실제 Cron 자동 실행(manual=false): 28건 정상, 계측 조회 정상, Pages 집계754건 오류0. 해당 실제 방문자 표본0건이므로 실제 방문자 전체 AI0회나 p95 정상으로 단정하지 않는다.
- `tests/production-monitor-sim.cjs`: 상태503·AI·출력·가시성·최대4동시·336순환·개인정보 제한·관리자 구분·중복 실행·수동/정기 상태 분리 회귀 PASS.
- Analytics Engine/GraphQL의 수집 지연과 샘플링 한계가 있다. 계측 없음/표본 부족은 정상0건이라는 증거가 아니다. 실제 요청과 합성 요청을 구분해 해석한다.

## 운영 및 롤백

`workers/production-monitor.wrangler.toml`과 `tools/deploy-production-monitor.cjs`로 별도 Worker를 배포한다. 기존 비공개 인증 파일의 관리자 토큰을 재사용하며 Secret을 출력하지 않는다. Pages는 Git 자동 배포되지만 이 별도 Worker의 변경은 배포 도구 실행이 필요하다.

관리 상태 API `https://mantra-production-monitor.critical5114.workers.dev/status`와 POST `/run`은 저장된 관리자 Bearer 인증 없이는404다. 상태 조회는 Cron 결과이며 수동 실행 결과는 응답과 private KV로 확인한다. POST `/test-alert`는 시험 incident만 기록하며 실제 장애나 유료 AI 호출을 만들지 않는다.

Pages 설정 변경 전후 백업·비공개 인증·검증 원본·알림 이력은 ignored `output/server-monitor/`에 보존했다. 변경은 Analytics Engine 바인딩과 계측 코드만 추가한다. 원고·DB·계산·RAG·관리자·영상·기존 알림은 보존했다.

롤백 시 이전 정상 Git 커밋으로 Pages를 복구하고 모니터 Worker Cron/해당 두 정책만 중지한다. Pages 설정 복구는 저장된 백업과 대조해 해당 바인딩만 제거한다. 기존 로컬 감시를 재개할 경우 서버 감시와 의도치 않게 중복되지 않게 한다. 승인 DB 게시본은 모니터 롤백 대상이 아니다.

서버에서 상시 점검과 이메일 발송을 수행한다. 자율 코드 수정 에이전트를 서버에 설치한 것은 아니므로 원인 분석·코드 수정·Git 푸시에는 Codex 등 실행 환경이 필요하다.
