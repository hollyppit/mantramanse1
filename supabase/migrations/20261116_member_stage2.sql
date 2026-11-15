-- 통합 플랫폼 2단계(2026-11-16): 회원 동의(필수·광고성 채널별) · 동의 변경 이력 · 회원 프로필
-- 계획: docs/PLATFORM_EXPANSION_PLAN_2026-11-15.md · 서버: functions/_consent.js, functions/api/account/{consent,profile}.js
-- 원칙(1단계와 같음): RLS 를 켜고 정책을 두지 않으며 anon·authenticated 권한을 회수한다 → 서버(service_role)만 읽고 쓴다.
-- 기존 표는 건드리지 않는다(추가만). 기존 회원에게 동의를 임의로 넣지 않는다(행이 없으면 '동의 안 함').

-- 1) 동의 문서(무엇에 동의했는지 버전으로 남긴다). 문구가 바뀌면 새 버전 행을 추가한다(기존 행은 고치지 않는다)
create table if not exists public.consent_documents (
  kind         text not null check (kind in ('terms','privacy','marketing_email','marketing_sms','marketing_kakao','marketing_night')),
  version      text not null,
  title        text not null,
  required     boolean not null default false,
  effective_at timestamptz not null default now(),
  body_sha256  text,
  primary key (kind, version)
);

-- 2) 회원별 현재 동의 상태(한 종류에 한 행). 행이 없으면 동의 안 함
create table if not exists public.member_consents (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('terms','privacy','marketing_email','marketing_sms','marketing_kakao','marketing_night')),
  agreed     boolean not null default false,
  version    text,
  granted_at timestamptz,                                   -- 마지막으로 동의한 시각(광고성 정보: 2년마다 수신 동의 여부 통지 기준)
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);
create index if not exists member_consents_kind_idx on public.member_consents (kind) where agreed;

-- 3) 동의 변경 이력(추가만, 수정·삭제하지 않는다). 탈퇴하면 user_id 만 비우고 기록은 남긴다(동의·철회 처리 증빙)
create table if not exists public.consent_events (
  id      bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  kind    text not null,
  action  text not null check (action in ('grant','revoke')),
  version text,
  at      timestamptz not null default now(),
  via     text check (via is null or via in ('mypage','community','gate','signup','admin','system'))
);
create index if not exists consent_events_user_idx on public.consent_events (user_id, at desc);
create index if not exists consent_events_at_idx on public.consent_events (at desc);

-- 4) 회원 프로필(운명의 광장에서 쓰는 이름·소개·공개 범위). 생년월일시·원국 원본은 넣지 않는다
--    phone: 문자·카카오 광고 수신에 동의한 경우에만 둔다(두 동의를 모두 철회하면 서버가 지운다)
create table if not exists public.member_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nickname   text unique check (nickname is null or char_length(nickname) between 2 and 12),
  bio        text check (bio is null or char_length(bio) <= 160),
  avatar_path text,
  phone      text check (phone is null or phone ~ '^01[016789][0-9]{7,8}$'),
  ilgan      text,
  ilju       text,
  show_ilgan boolean not null default false,
  show_ilju  boolean not null default false,
  visibility text not null default 'members' check (visibility in ('public','members','private')),
  interests  text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) 현재 문서 버전(서버 functions/_consent.js 의 DOCS 와 같아야 한다)
insert into public.consent_documents (kind, version, title, required, effective_at) values
  ('terms',           '2026-11-10', '이용약관',                         true,  '2026-11-10'),
  ('privacy',         '2026-11-10', '개인정보 수집·이용(개인정보처리방침)', true,  '2026-11-10'),
  ('marketing_email', 'mkt-2026-11-16', '광고성 정보 이메일 수신',        false, '2026-11-16'),
  ('marketing_sms',   'mkt-2026-11-16', '광고성 정보 문자 수신',          false, '2026-11-16'),
  ('marketing_kakao', 'mkt-2026-11-16', '광고성 정보 카카오톡 수신',      false, '2026-11-16'),
  ('marketing_night', 'mkt-2026-11-16', '야간(21시~다음 날 8시) 광고성 정보 수신', false, '2026-11-16')
on conflict do nothing;

alter table public.consent_documents enable row level security;
alter table public.member_consents   enable row level security;
alter table public.consent_events    enable row level security;
alter table public.member_profiles   enable row level security;
revoke all on public.consent_documents, public.member_consents, public.consent_events, public.member_profiles from anon, authenticated;
revoke all on sequence public.consent_events_id_seq from anon, authenticated;

-- 되돌리기(기존 서비스와 무관한 새 표만 지운다):
-- drop table if exists public.member_profiles; drop table if exists public.consent_events;
-- drop table if exists public.member_consents; drop table if exists public.consent_documents;
