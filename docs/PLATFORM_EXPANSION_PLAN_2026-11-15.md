# MANTRA 통합 플랫폼 확장 — 분석·계획 (2026-11-15)

대상: 심층 분석(기존 /report/) + 커뮤니티(신규, 서비스명 운명의 광장·운명의 기록·운명의 인연).
상태: **분석·설계만 완료. 코드·DB·배포 변경 없음.** 1단계 착수 전 승인 필요 항목은 맨 아래 "승인 요청".

---

## 1. 현재 시스템 구조와 재활용 가능한 기능

| 영역 | 현재 구조 | 커뮤니티에서 재활용 |
|---|---|---|
| 호스팅 | Cloudflare Pages 정적 파일 + Pages Functions(`functions/`), main 푸시 → Git 빌드 배포. 미리보기 배포(`*.mantramanse.pages.dev`)는 공개 읽기 API만 운영으로 대신 요청(`functions/_middleware.js`) | 그대로. 커뮤니티 화면은 `/community/`, API는 `/api/community/*` 로 분리 |
| 첫 진입 | `functions/_site-gate.js`: `SITE_GATE_PASSWORD` 가 있으면 사이트 잠금, `SITE_GATE_REPORT_PUBLIC=1` 이면 `/report/`·`/api/*`·정적 파일만 공개. **쿠키 없는 방문자가 `/` 로 오면 `/report/` 로 302** | 게이트웨이는 이 302 목적지만 바꾸면 기존 `/report/` 직접·공유 링크는 그대로 |
| 심층 분석 랜딩 | `/report/index.html`(먹색·고금색 오컬트) + 허브(`report/hub/hub.js`, 해시 라우터 `#/timeline` 등) 끼워 넣기 | 디자인·연출 그대로 유지. 게이트웨이의 "심층 분석" 카드가 여기로 연결 |
| 만세력 엔진 | `/engine.js`(Manse.compute). 서버에서도 이미 import 해서 씀(`functions/_newyear-runtime.js`) | **일간·일주를 서버에서 계산**해 프로필에 넣을 수 있음(브라우저가 보낸 일주를 믿지 않아도 됨) |
| 궁합 | `/compat-pair.js`: 관계 종류별(연인·직장·친구·가족) 가중치, 오행 보완·일간 십성·일지·간지 조화·강약 균형 | 5단계 매칭 점수의 명리 지표로 그대로 사용. 생활 선호 지표는 별도 |
| 회원 | Supabase Auth(브라우저 supabase-js 2.45.4, PKCE). 카카오·구글·(설정 시)네이버. 서버는 `x-member-token` 을 Supabase 에 물어 확인(`functions/_commerce.js` memberOf) | 그대로. 커뮤니티 API도 같은 확인 함수 사용 |
| DB 원칙 | **RLS 켜고 정책 없음 + anon/authenticated 권한 회수 → 서버(service_role)만 읽고 씀**(commerce_orders·entitlements·member_sajus·support_inquiries) | 신규 표도 같은 원칙. 예외는 6단계 실시간 채팅(Realtime은 브라우저 직접 구독이라 RLS 정책 필요) |
| 저장한 사주 | `member_sajus`(회원 본인 열람 전용, 출생 정보 jsonb) | 프로필 일주 자동 연동의 출처. 원본은 절대 공개 표에 복사하지 않음 |
| 결제 | 포트원(KPN)·토스, 회원×사주×세계 권한, 서버 검증·웹훅·환불 시 권한 회수(revoked_at) | 6단계에서 상품 종류(`kind`)만 추가해 커뮤니티 권한을 분리 |
| 기능 스위치 | 브라우저 `feature-flags.js`(운영 도메인에선 주소로 못 켬) + 서버 KV 스위치(`/api/luck-flags`) | 커뮤니티 공개 단계는 **서버 KV**에 둠(브라우저 스위치는 우회 가능하므로 잠금에 쓰지 않음) |
| 관리자 | `/report/admin/`, 공용 비밀번호 1개(`ADMIN_PASSWORD`, Bearer) + 작업자 이름(`x-reviewer`) | 1차는 그대로 쓰고 감사 로그에 작업자 이름 기록. 권한 분리는 7단계 |
| 출시 알림 | `/api/waitlist` (KV `waitlist:<이메일>`, 철회·동의 버전 없음, 랜딩 story.js 가 사용) | **건드리지 않음.** 커뮤니티 알림은 동의 이력이 필요해 Supabase 신규 표로 따로 만듦 |
| 마이페이지·탈퇴 | `#/me`(hub-me.js), 1:1 문의, 탈퇴(`functions/_account.js`: 주문 기록 분리 → 회원 삭제 cascade → 카카오 연결 해제) | 탈퇴 시 커뮤니티 데이터 처리 단계를 이 함수에 추가 |
| 테스트 | `tests/*.cjs` 353개 시뮬레이션(예: site-gate-sim.js, commerce-sim.cjs) | 같은 방식으로 단계별 sim 추가 |

## 2. 단계별 구현 계획과 의존성

```
1 게이트웨이 ─┬─> 1-2 커뮤니티 잠금(서버) ─> 1-4 출시 알림
             │
2 회원정보·동의 ──> 3 디자인 시스템 ─> 3 광장 MVP ─┬─> 4 운명의 기록·개인화
   (감사 로그 공통)                              └─> 5 인연 매칭(성인 확인 필요) ─> 6 채팅·유료
7 관리자 고도화는 각 단계에서 조금씩, 마지막에 권한 분리
```

| 단계 | 핵심 작업 | 선행 조건 |
|---|---|---|
| 1-1 게이트웨이 | 신규 `/gate/`(또는 `/start/`) 페이지. 두 카드: 심층 분석(먹색·남색·고금색, 안개·빛) / 커뮤니티(미색·연분홍·옥색·먹색, 벚꽃잎 소량, 한지 질감). 마지막 이용 서비스는 이 기기에만 기억(localStorage `mt_last_service`) → "지난번에 보던 곳으로 바로 가기" 버튼. 모든 화면에 게이트웨이로 돌아가는 링크 | 루트 302 목적지 변경 승인 |
| 1-2 잠금 | KV `community:stage` = `dev`/`beta`/`public`(기본 `dev`, 값 없거나 읽기 실패 = `dev`). 미들웨어가 `/community/*`·`/api/community/*` 를 서버에서 막음. 통과 조건: 관리자 / `community_access` 표의 베타 회원 / `public` 단계의 로그인 회원. 페이지 접근은 서버가 서명한 짧은 쿠키(HMAC, 회원 id·만료)로 확인 | 1-1 |
| 1-4 출시 알림 | `launch_alerts` 표. 회원은 계정 이메일, 비회원은 이메일 입력. "출시 알림 목적" 별도 동의(광고성 동의와 분리). 메일 속 철회 링크(토큰 해시만 저장) + 마이페이지 철회. 관리자 신청자 수 | 1-2 |
| 2 회원정보·동의 | `member_profiles`·`consent_*`·`admin_audit_log`. 가입·로그인 직후 필수 2개 확인(기존 회원은 다음 로그인 때 **필수만** 다시 받고 선택은 모두 미동의로 시작). 마이페이지에 채널별 동의 현황·변경·철회 | 개인정보처리방침·약관 개정 문안 |
| 2-3 카카오 채널 | 채널 추가 버튼만 연결. 채널 친구 ≠ 광고 동의로 따로 저장. 발송(알림톡·브랜드메시지)은 **이번 범위에서 끔** | 채널 개설, 발송 대행사 선정 |
| 3 디자인 시스템 | `community/cm-tokens.css`(색·한지 질감·여백·카드), 벚꽃잎은 진입 화면·상단에만 캔버스 1개, `prefers-reduced-motion` 이면 정지, 스크롤 중 정지 | 1 |
| 3 광장 MVP | 피드(전체·인기·최신), 카테고리 5개, 글·댓글·답글, 이미지(Storage 비공개 버킷 + 서명 주소), 좋아요·북마크, 검색·해시태그, 신고·차단, 일주(60)·일간(10) 그룹, 공감 투표, 소수 그룹(기준 인원 미만)은 전체 피드에 합쳐 보이기 | 2 |
| 4 운명의 기록 | 오늘의 운테크 카드(기존 일진·운세 흐름 계산 재사용, 사전 문안, AI 없음), 기분·경험 기록, 주간·월간 회고, 같은 일주 익명 통계(**최소 표본 20명, 10명 미만 칸은 숨김, 반올림**) | 3 |
| 5 운명의 인연 | 매칭 프로필·목적·선호, 명리 지표(compat-pair) + 생활 선호 지표 **분리 표시**, "관계 성공 확률" 표현 금지, 관심 → 상호 매칭 | 성인 본인확인 수단(아래 위험 참고) |
| 6 채팅·유료 | 상호 매칭 1:1 채팅(Supabase Realtime + RLS 정책), 크레딧 원장(지급·차감 이력, 멱등 키), 심층 궁합 리포트 건별 결제 | 5, 기존 결제 |
| 7 관리자 | 단계 스위치·신청자·동의 통계·신고·제재·지표(DAU/WAU/MAU, 재방문, 전환) | 각 단계 |

## 3. 신규 DB 스키마와 RLS 설계 (1~3단계, 모두 추가만)

공통: `enable row level security` + `revoke all from anon, authenticated` (서버 전용). 기존 표 변경 없음.

```sql
-- 1단계
community_access (user_id uuid pk → auth.users on delete cascade, role text check in ('beta','tester','moderator'),
                  granted_by text, granted_at timestamptz, revoked_at timestamptz)
launch_alerts    (id bigserial pk, email text, user_id uuid null → on delete set null, purpose text default 'community_launch',
                  consent_version text, consented_at timestamptz, revoked_at timestamptz, revoke_token_hash text unique,
                  source text, unique(email, purpose))
-- 2단계
consent_documents(kind text, version text, title text, effective_at timestamptz, body_sha256 text, pk(kind, version))
   -- kind: terms, privacy, marketing_sms, marketing_kakao, marketing_email, launch_alert
member_consents  (user_id uuid → cascade, kind text, agreed boolean, version text, updated_at timestamptz, pk(user_id, kind))
consent_events   (id bigserial pk, user_id uuid null → set null, kind text, action text check in ('grant','revoke'),
                  version text, at timestamptz, via text)   -- 추가만, 수정·삭제 없음(변경 이력)
member_profiles  (user_id uuid pk → cascade, nickname text unique (2~12자), avatar_path text, bio text (≤160),
                  phone text null, ilgan text, ilju text, show_ilgan boolean default false, show_ilju boolean default false,
                  visibility text check in ('public','members','private') default 'members', interests text[],
                  created_at, updated_at)
   -- 생년월일시·원국 원본은 넣지 않음. ilju/ilgan 은 서버가 member_sajus 의 '나' 사주로 계산
admin_audit_log  (id bigserial pk, at timestamptz, actor text, action text, target text, detail jsonb)
-- 3단계
cm_categories, cm_posts(id, author_id, category, title, body, images text[], hashtags text[], ilju, ilgan, status
                  'visible'|'hidden'|'deleted', like_count, comment_count, created_at, edited_at),
cm_comments(id, post_id, parent_id, author_id, body, status, created_at),
cm_reactions(user_id, post_id, kind 'like'|'bookmark', pk 3개), cm_votes(post_id, user_id, choice),
cm_reports(id, reporter_id, target_type, target_id, reason, status, handled_by, handled_at),
cm_blocks(blocker_id, blocked_id, pk), cm_sanctions(user_id, kind 'warn'|'mute'|'ban', until, reason, by),
cm_notices(id, title, body, pinned, published_at)
storage bucket: cm-images (비공개, 서버가 형식·크기 검사 후 저장, 보기는 서명 주소)
```

탈퇴 처리(`withdraw()`에 추가): 프로필·동의 현재값·반응·차단은 cascade 삭제. 글·댓글은 본문을 지우고 "탈퇴한 회원" 으로 남김(대화 흐름 보존) — 이 정책은 승인 필요. 신고·제재 기록은 user_id 만 비우고 보관.

## 4. 예상 난이도와 주요 위험

| 단계 | 난이도 | 주요 위험 |
|---|---|---|
| 1 | 낮음~중간 | 루트 302 변경이 광고·검색 유입 첫 화면을 바꿈. 잠금 우회(정적 파일 직접 요청) → 미들웨어에서 경로 전체 차단으로 해결 |
| 2 | 중간 | **광고성 정보 법규**: 야간(21~08시) 발송 별도 동의, 2년마다 수신 동의 여부 통지, 메시지 앞 "(광고)"·전송자·무료 수신거부 표시. 개인정보처리방침·약관 개정 필요(휴대폰·프로필·마케팅 항목). 기존 회원 동의 임의 부여 금지 |
| 3 | 높음 | 게시물 운영 부담(신고 처리 인력), 이미지 업로드 악용, 초기 콘텐츠 부족, 관리자 공용 비밀번호로는 제재 책임 추적이 약함 |
| 4 | 중간 | 익명 통계 재식별(소수 일주) → 최소 표본·숨김 규칙 |
| 5 | 높음 | **이성 매칭은 청소년 유해 소지 → 성인 본인확인(휴대폰 본인인증 등) 사실상 필수**, 결혼중개업법 해당 여부 법률 검토, 사칭·로맨스 스캠 대응 |
| 6 | 높음 | Realtime 사용 시 브라우저 직접 접근이 생겨 RLS 정책 설계가 처음으로 필요, 채팅 보존·열람 정책, 크레딧 중복 차감 |
| 7 | 중간 | 관리자 계정 분리(공용 비밀번호 → 개인 계정·역할)는 기존 관리자 화면 전체 로그인 방식 변경 |

비용: 커뮤니티는 AI 호출 없음(사전 문안·규칙). Supabase 무료 한도 초과 가능성은 3단계 이미지·6단계 Realtime 부터.

## 5. 기존 서비스에 미치는 영향

- **바뀌는 것(승인 필요)**: 쿠키 없는 방문자의 `/` 302 목적지(`/report/` → 게이트웨이). 심층 분석 화면 상단에 "처음 화면" 링크 1개.
- **바뀌지 않는 것**: `/report/`·`/report/v2/`·`#/timeline` 직접·공유 링크, 만세력(`/index.html`), 결제·권한 표, 기존 `/api/waitlist`, 관리자 로그인 방식.
- 미들웨어에 커뮤니티 경로 검사가 추가됨 → 다른 경로는 기존과 같은 순서로 통과(테스트로 고정).
- 신규 표만 추가. 기존 표 변경 없음(탈퇴 함수에 단계 추가만).

## 6. 테스트·배포·롤백 계획

- **테스트**: 단계마다 `tests/` 에 sim 추가. 1단계: 게이트웨이 표시·마지막 서비스 기억, 잠금 단계 3종 × (비회원·회원·베타·관리자) × (페이지·정적 파일·API) 접근표, 기존 `site-gate-sim` 회귀, 출시 알림 동의·중복·철회·봇 함정. 모바일 375px·PC·움직임 감소 화면 확인.
- **스테이징**: 브랜치 미리보기 배포(`*.mantramanse.pages.dev`). DB 는 Supabase 운영 프로젝트 하나뿐이므로, 신규 표는 추가만 하는 마이그레이션을 **승인 후** 적용(또는 Supabase 브랜치 — 비용 발생).
- **배포**: 단계별 승인 → main 푸시. 커뮤니티 단계 값은 `dev` 로 배포되므로 코드가 올라가도 일반 사용자에겐 "준비 중"만 보임.
- **롤백**: 게이트웨이 = 302 목적지 되돌리기(환경변수 또는 1줄 커밋 되돌림). 커뮤니티 = KV 단계 `dev`. 신규 표는 기존 데이터와 무관해 남겨 둬도 영향 없음(삭제 SQL은 각 마이그레이션 아래 주석으로 둠).

---

## 승인 요청 (1단계 착수 전)

1. 쿠키 없는 첫 방문자의 `/` 302 목적지를 `/report/` → 새 게이트웨이로 바꿔도 되는지. (mantrafortune.com 첫 화면도 같이 바뀜)
2. 마지막 이용 서비스가 있을 때: **게이트웨이를 보여 주되 "바로 가기" 버튼을 크게**(권장) / 자동으로 바로 이동.
3. 커뮤니티 카드 클릭 시(개발 중): "준비 중" 안내 + 출시 알림 신청 화면.
4. 신규 표 마이그레이션(community_access·launch_alerts)을 운영 Supabase 에 적용하는 시점 — 로컬 구현·테스트 후 별도 승인.

---

## 1단계 로컬 구현 결과 (2026-11-15, 미커밋·미배포·DB 미적용)

승인 내용: 첫 방문자 `/` → `/gate/`, 마지막 이용 서비스는 자동 이동 없이 "바로 가기" 버튼.

| 파일 | 내용 |
|---|---|
| `gate/index.html·gate.css·gate.js` | 통합 첫 화면. 심층 분석(먹색·남색·고금색, 안개·빛) / 운명의 광장(미색·연분홍·옥색, 한지 결·처마 선·벚꽃잎 캔버스). PC 좌우·모바일 위아래. 마지막 이용 서비스 표시·바로 가기(localStorage `mt_last_service`). 준비 중 시트 + 출시 알림 신청(목적·항목·보유 기간·철회 방법 고지, 동의 체크 기본 해제) + 초대 회원 입장 + 메일 철회 링크 처리(버튼을 눌러야 철회). 움직임 줄이기면 벚꽃·안개 정지, 화면 밖·탭 숨김이면 벚꽃 정지 |
| `functions/_community.js` | 공개 단계(KV `community:stage`, 기본·오류 시 dev), 역할별 허용, HMAC 서명 입장 쿠키(12시간, HttpOnly·Secure·SameSite=Lax), 감사 로그 |
| `functions/_middleware.js` | 사이트 잠금 다음에 커뮤니티 잠금. `/community/*` 모든 파일과 `/api/community/*`(status·alert·enter 제외)를 서버에서 차단 |
| `functions/_site-gate.js` | 첫 방문 302 → `/gate/`. `GATEWAY_OFF=1` 이면 예전처럼 `/report/`(코드 배포 없는 되돌리기). `/gate`·`/community` 는 비밀번호 대신 커뮤니티 잠금이 판단 |
| `functions/api/community/status·enter·alert·access.js` | 단계 조회·변경(정식 공개는 확인 문구 필수), 입장 쿠키, 출시 알림(회원=계정 이메일, 비회원=입력, 봇 함정, IP당 1시간 20회, 중복·없는 토큰도 같은 응답, 토큰 원문 미저장), 테스터·베타 권한 주기·회수(이메일 가림) |
| `functions/_mail.js` | 출시 알림 확인 메일(철회 버튼 포함) |
| `functions/_account.js` | 탈퇴 시 회원의 출시 알림 삭제(커뮤니티 권한은 cascade) |
| `report/index.html` | 상단 왼쪽 "‹ 처음 화면" 링크(기존 빈 자리) |
| `report/admin/v2-community.js` + 메뉴 | 관리자 "커뮤니티" 영역: 공개 단계 버튼, 관리자 입장, 테스터·베타 권한, 출시 알림 현황 |
| `community/index.html` | 잠금을 통과한 사람만 보는 자리 화면(3단계에서 교체) |
| `supabase/migrations/20261115_community_stage1.sql` | community_access · launch_alerts · admin_audit_log · community_user_by_email(서버 전용). **운영 미적용** |
| `tests/community-gate-sim.js` | 96항목 통과 |

테스트: community-gate-sim 96항목, site-gate-sim(첫 이동 기대값 갱신 + GATEWAY_OFF·/gate 공개 추가), middleware-sim, account-sim, commerce-sim, admin-navigation-sim 통과. 브라우저(로컬): PC·모바일 375px 가로 넘침 없음, 준비 중 시트, `/community/x.js` 직접 접근 → 준비 중으로, 관리자 입장 → 자리 화면 → 나가기 → 다시 차단 확인.
기존 실패(변경 전에도 같은 오류): cinematic-live·full-flow-usability·hub-input-usability·reader-navigation·agentic-rag-browser(playwright 경로).

### 배포 전 남은 일(승인 필요)
1. 운영 Supabase 에 마이그레이션 적용.
2. 개인정보처리방침에 "커뮤니티 출시 알림(이메일, 철회 시까지)" 항목 추가 — 문안 확인 필요.
3. 선택: Cloudflare 환경변수 `COMMUNITY_SECRET`(16자 이상). 없으면 관리자 비밀번호에서 파생(관리자 비밀번호를 바꾸면 입장 쿠키도 모두 무효).
4. 커밋·main 푸시(배포). 배포 직후 커뮤니티는 dev 단계라 일반 사용자에겐 준비 중만 보임. 첫 방문 이동이 바뀌는 것은 이때부터.

### 배포 준비 결과 (2026-11-15)
- 운영 Supabase(mantramanse1)에 `community_stage1` 마이그레이션 적용 완료. 새 표 3개 모두 RLS 켜짐·정책 0개, anon·authenticated 권한 없음, service_role 만 읽고 씀. 함수 `community_user_by_email` 도 service_role 만 실행. 보안 점검(advisors): 새 경고 없음(정책 없는 RLS 안내는 기존 표와 같은 의도된 설계).
- 출시 알림 철회 = 행 즉시 삭제로 변경(방침 "철회할 때까지 보유"와 일치). 테스트 97항목.
- 개인정보처리방침(report/legal/privacy.html) 보강: 출시 알림 수집 항목·목적(광고성 동의와 별개)·철회 시 즉시 파기·Resend 위탁·국외 이전 항목·첫 화면 기억값과 커뮤니티 입장 쿠키. 시행일(business.js effective)은 그대로 — 방침 12번 "시행 7일 전 고지" 적용 여부는 운영자 판단.
- 아직 안 한 것: 커밋·푸시(배포), COMMUNITY_SECRET(선택).
