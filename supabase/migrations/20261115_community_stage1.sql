-- 통합 플랫폼 1단계(2026-11-15): 커뮤니티 접근 권한 · 커뮤니티 출시 알림 · 관리자 감사 로그
-- 계획: docs/PLATFORM_EXPANSION_PLAN_2026-11-15.md · 서버 모듈: functions/_community.js, functions/api/community/*
-- 원칙(기존 commerce 표와 같음): RLS 를 켜고 정책을 두지 않으며 anon·authenticated 권한을 회수한다 → 서버(service_role)만 읽고 쓴다.
-- 기존 표는 건드리지 않는다(추가만). 되돌리기 SQL 은 맨 아래 주석.

-- 1) 커뮤니티 접근 권한: 개발 중에는 tester, 비공개 베타에는 beta 까지 들어간다(functions/_community.js roleAllowed)
create table if not exists public.community_access (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('tester','beta','moderator')),
  note       text check (note is null or char_length(note) <= 80),
  granted_by text,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz                                   -- 회수해도 행은 남겨 누가 언제 회수했는지 감사 로그와 맞춰 본다
);

-- 2) 커뮤니티 출시 알림 신청(출시 알림 목적의 별도 동의. 광고성 정보 수신 동의와 다르다)
--    철회 링크용 토큰은 원문을 저장하지 않고 SHA-256 해시만 둔다. 회원은 마이페이지·게이트웨이에서 로그인 상태로도 철회할 수 있다.
--    보유: 출시 알림 발송 완료 또는 철회 시까지. 철회하면 서버가 행을 바로 지운다(revoked_at 은 예비 칸).
create table if not exists public.launch_alerts (
  id                bigserial primary key,
  purpose           text not null default 'community_launch' check (purpose in ('community_launch')),
  email             text not null check (char_length(email) between 6 and 254),
  user_id           uuid references auth.users(id) on delete set null,
  consent_version   text not null,
  consented_at      timestamptz not null default now(),
  revoked_at        timestamptz,
  revoke_token_hash text unique,
  source            text check (source is null or source in ('gate','community','mypage')),
  history           jsonb not null default '[]'::jsonb,    -- [{a:'grant', at, v, via}] 신청 이력(동의 문구 버전·경로)
  notified_at       timestamptz,                           -- 출시 알림을 보낸 시각(발송은 정식 공개 때)
  unique (email, purpose)
);
create index if not exists launch_alerts_active_idx on public.launch_alerts (purpose) where revoked_at is null;
create index if not exists launch_alerts_user_idx on public.launch_alerts (user_id);

-- 3) 관리자 감사 로그(추가만, 수정·삭제하지 않는다). actor = 관리자 화면 작업자 이름(x-reviewer)
create table if not exists public.admin_audit_log (
  id     bigserial primary key,
  at     timestamptz not null default now(),
  actor  text not null,
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists admin_audit_log_at_idx on public.admin_audit_log (at desc);

-- 4) 관리자가 이메일로 베타·테스터 권한을 줄 때 회원 id 찾기(서버 전용)
create or replace function public.community_user_by_email(p_email text)
returns uuid language sql security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1
$$;

alter table public.community_access enable row level security;
alter table public.launch_alerts    enable row level security;
alter table public.admin_audit_log  enable row level security;
revoke all on public.community_access, public.launch_alerts, public.admin_audit_log from anon, authenticated;
revoke all on sequence public.launch_alerts_id_seq, public.admin_audit_log_id_seq from anon, authenticated;
revoke all on function public.community_user_by_email(text) from public, anon, authenticated;
grant execute on function public.community_user_by_email(text) to service_role;

-- 되돌리기(기존 서비스와 무관한 새 표만 지운다):
-- drop function if exists public.community_user_by_email(text);
-- drop table if exists public.admin_audit_log; drop table if exists public.launch_alerts; drop table if exists public.community_access;
