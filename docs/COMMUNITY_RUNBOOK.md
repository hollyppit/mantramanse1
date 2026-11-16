# 인연의 광장 운영·배포 절차서 (9단계, 2026-11-16)

통합 플랫폼(심층 분석 + 인연의 광장)을 바꾸고 배포할 때 따르는 순서와, 문제가 생겼을 때 되돌리는 방법. 계획·단계별 결과는 `docs/PLATFORM_EXPANSION_PLAN_2026-11-15.md`.

## 1. 기술 원칙(지금 상태)

| 원칙 | 지금 어떻게 지키나 |
|---|---|
| Cloudflare Pages 유지 | 정적 파일 + Pages Functions(`functions/`). main 푸시 → Git 빌드 배포 |
| Supabase(Auth·PostgreSQL·Storage·Realtime) | Auth 로그인·PostgreSQL 사용. 사진은 Cloudflare R2(`CLIPS_R2`), 대화는 서버 경유 4초 확인(Realtime 안 씀 — 브라우저가 DB 에 직접 닿지 않게) |
| 만세력 엔진 공통 | 서버도 `/engine.js`(Manse.compute)로 일주 계산(`functions/_plaza.js` iljuOfBirth) — 브라우저가 보낸 일주를 믿지 않음 |
| 기능별 독립 모듈 | `functions/_consent.js`(동의) · `_plaza.js`(광장) · `_daily.js`(운테크) · `_match.js`(인연) · `_credits.js`(크레딧) · `_activity.js`(이용 기록) · `_staff.js`(운영자 권한) · `_launch.js`(공개 점검) · `_features.js`(기능 스위치) |
| 서버 인증·인가 + RLS | 모든 커뮤니티 표: RLS 켬·정책 없음·anon/authenticated 권한 회수 → 서버(service_role)만. 회원은 `x-member-token`, 관리자는 비밀번호, 운영자는 역할별 열쇠 |
| 캐시·비용 | 지표는 DB 함수 한 번(`cm_metrics`), 이용 기록은 하루 한 줄·작업 공간 메모리로 중복 쓰기 안 함, 운영자 열쇠 확인 60초 기억, AI 호출 없음(사전 문안) |

## 2. 보안 점검(바꿀 때마다)

1. `node tools/security-audit.cjs --write` — 코드·마이그레이션 177개 점검(인증·도배 한도·감사 로그·RLS·비밀값·업로드·개인정보·기능 스위치·보안 머리말). 실패 0 이어야 한다. 결과: `docs/SECURITY_AUDIT.md`
2. 운영 DB: `tools/security-audit.sql` 실행 — 6줄 모두 problems 0(RLS 꺼진 표·브라우저 역할 권한·정책·함수 search_path·브라우저 실행 가능 함수·자동 파기 예약)
3. 새 API 를 만들면: 첫 줄에 인증(`viewer`·`writer`·`need`·`isAdmin`), 쓰기면 `overLimit`(하루 한도), 관리자 쓰기면 `audit`, 광장·기록·인연·대화면 `featureGate`
4. 새 표를 만들면: `enable row level security` + `revoke all … from anon, authenticated`, security definer 함수는 `set search_path` + 실행 권한 회수

보안 장치 요약
- 개인정보 최소 수집: 출생 정보 원문은 광장에 저장하지 않음(일주·일간만), 본인확인은 출생 연도·성별·중복 확인 해시만, 이용 기록은 날짜·영역만
- 공개 프로필과 원국 분리: 다른 사람에게는 닉네임·사진·공개를 켠 일주/일간만
- 파일 업로드: 형식(webp·jpg·png)·크기 서버 확인, 무작위 이름, 잠금 안쪽에서만 보기
- 스팸·봇: 글·댓글·공감·신고·차단·기록·본인인증·대화·잇기·글 고치기 하루 한도, 출시 알림 봇 함정·IP 한도, 관리자 인증 실패 IP 시간당 20번
- 신고·차단·제재: 5명 신고 시 자동 숨김, 운영자 처리·제재 기록
- 탈퇴: 프로필·동의·기록·사진·인연 프로필·이용 기록 삭제, 글은 '탈퇴한 회원'으로, 대화방 즉시 끝냄(90일 뒤 파기)
- 관리자 접근: 관리자 비밀번호(owner) + 역할별 운영자 열쇠, 모든 변경 감사 로그, 보안 머리말(다른 사이트 틀 금지 등)

## 3. 배포 절차(단계마다)

1. **기존 시스템 분석** — 바꿀 파일·API·표를 찾는다
2. **영향 범위 확인** — 심층 분석(`/report/`)·결제·로그인에 닿는지. 닿으면 사전 승인
3. **DB 마이그레이션·구현** — 마이그레이션은 추가만(되돌리기 SQL 을 파일 끝 주석에)
4. **단위·통합·보안 테스트** — 해당 `tests/*-sim` + `tools/security-audit.cjs`
5. **모바일·PC 화면** — 375px 가로 넘침 없음, 가짜 응답으로 화면 확인
6. **기존 서비스 회귀** — 아래 회귀 묶음 전부 통과
7. **스테이징** — 운영 DB 에서 되돌리는 블록(오류로 끝나는 DO 블록)으로 마이그레이션·함수 점검
8. **관리자 승인** — 대표 승인 전에는 운영 DB 적용·배포 안 함
9. **프로덕션 배포** — DB 적용 → 권한 확인 SQL → 내 파일만 커밋 → main 푸시 → Cloudflare API 로 그 커밋 배포 성공 확인(`tools/rag-connection-inventory.cjs` 의 `cf`)
10. **모니터링·롤백 준비** — 관리자 ⑥ 작업 기록·⑪ 운영 현황·⑮ 점검표 확인, 아래 되돌리기 표 준비

회귀 묶음
```
node tests/stage9-security-sim.js && node tests/launch-stage8-sim.js && node tests/admin-stage7-sim.js && node tests/credit-pay-sim.cjs && node tests/match-sim.js && node tests/plaza-sim.js && node tests/community-gate-sim.js && node tests/member-consent-sim.js && node tests/commerce-sim.cjs && node tests/account-sim.cjs && node tests/site-gate-sim.js && node tests/middleware-sim.js && node tests/admin-navigation-sim.js && node tools/security-audit.cjs
```

## 4. 기능 공개를 독립적으로 제어

| 스위치 | 위치 | 기본 | 누가 |
|---|---|---|---|
| 커뮤니티 공개 단계(개발 중·비공개 베타·정식 공개) | KV `community:stage` · 관리자 ① | 개발 중 | 관리자 비밀번호. 정식 공개는 확인 문구 + 점검표(⑮) 통과 또는 사유 |
| 기능별: 광장·운테크/기록·인연 찾기·대화 | KV `community:features` · 관리자 ⑯ | 모두 켜짐 | 관리자 비밀번호. 끄면 화면 탭 숨김 + API 403(내 글·기록 지우기는 계속 가능) |
| 유료(크레딧 사용) | KV `plaza:premium` · 관리자 ⑨ | 꺼짐 | 관리자 비밀번호 + '유료 켜기' |
| 크레딧 판매 | KV `commerce:products` 가격 · 결제·상품 화면 | 가격 0(판매 안 함) | 관리자 비밀번호 |
| 공개 기준값·사람 확인 | KV `community:launch` · 관리자 ⑮ | 제안값 | 관리자 비밀번호 |

## 5. 되돌리기(롤백)

| 상황 | 가장 빠른 방법 |
|---|---|
| 커뮤니티 전체를 닫아야 함 | 관리자 ① → '개발 중'(즉시, 베타 쿠키도 바로 무효) |
| 한 기능만 문제 | 관리자 ⑯ → 그 기능 끄기(즉시) |
| 유료 문제 | 관리자 ⑨ → 끄기(잔액 유지), 크레딧 묶음 가격 0 |
| 운영자 열쇠 유출 | 관리자 ⑭ → 회수(최대 1분) |
| 코드 문제 | `git revert <커밋>` → main 푸시(Cloudflare 가 이전 상태로 다시 배포). 급하면 Cloudflare Pages 에서 이전 배포로 되돌리기 |
| DB 함수·예약 문제 | 각 마이그레이션 끝 '되돌리기' 주석의 SQL(표는 남겨 두고 함수·예약만 내려도 기존 서비스 영향 없음) |

## 6. 모니터링

- 관리자 ⑥ 작업 기록: 누가 무엇을 바꿨는지(자동 파기 포함)
- 관리자 ⑪: 처리 안 된 신고·경고 메시지·진행 중 제재
- 관리자 ⑩: 활성 사용자 급감·재방문
- 결제 문제는 결제·상품 화면과 관리자 알림 메일(ADMIN_ALERT_EMAIL)
