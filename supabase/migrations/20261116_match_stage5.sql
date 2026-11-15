-- 통합 플랫폼 5단계(2026-11-16): 성인 본인확인 · 인연 매칭 · 1:1 대화(서버 경유)
-- 설계: docs/MATCHING_CHAT_PLAN_2026-11-16.md · 서버: functions/_match.js, functions/api/community/{verify,match,chat}.js
-- 원칙(1~4단계와 같음): RLS 켬·정책 없음·anon/authenticated 권한 회수 → 서버만 읽고 쓴다. 기존 서비스 표 변경 없음.
--   (cm_reports 는 3단계에서 만든 광장 표: 신고 대상에 'message'·'user' 를 더한다)

-- 1) 성인 본인확인 결과 요약. 이름·전화번호·생년월일 전체는 저장하지 않는다(출생 연도·성별·중복 가입 확인값의 해시만)
create table if not exists public.adult_verifications (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  provider    text not null check (provider in ('portone','manual')),
  birth_year  smallint not null check (birth_year between 1900 and 2100),
  gender      text check (gender is null or gender in ('M','F')),
  ci_hash     text unique,                               -- 같은 사람이 여러 계정으로 인증하지 못하게(원문 CI 는 저장하지 않음)
  verified_at timestamptz not null default now(),
  verified_by text                                       -- manual 일 때 관리자 작업자 이름
);

-- 2) 인연 프로필(켜야만 다른 사람의 '오늘의 인연'에 나온다. 기본 꺼짐)
create table if not exists public.cm_match_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  active       boolean not null default false,
  purposes     text[] not null default '{}',             -- chat(대화) · friend(친구) · love(연애)
  intro        text check (intro is null or char_length(intro) <= 200),
  region       text,                                     -- 시·도까지만
  interests    text[] not null default '{}',
  want_gender  text[] not null default '{}',             -- 연애 목적일 때 만나고 싶은 성별(M·F)
  want_age_min smallint not null default 19 check (want_age_min between 19 and 99),
  want_age_max smallint not null default 99 check (want_age_max between 19 and 99),
  want_region  text not null default 'any' check (want_region in ('any','same')),
  updated_at   timestamptz not null default now()
);

-- 3) 오늘의 인연(하루 고정 목록, 다시 열어도 같은 사람들)
create table if not exists public.cm_daily_picks (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  picks   uuid[] not null default '{}',
  primary key (user_id, day)
);

-- 4) 인연 잇기(관심). 서로 이으면 matched → 대화방
create table if not exists public.cm_likes (
  from_id    uuid not null references auth.users(id) on delete cascade,
  to_id      uuid not null references auth.users(id) on delete cascade,
  note       text check (note is null or char_length(note) <= 100),
  status     text not null default 'pending' check (status in ('pending','matched','passed','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index if not exists cm_likes_to_idx on public.cm_likes (to_id, status, created_at desc);

-- 5) 대화방(두 사람, a_id < b_id) · 메시지
create table if not exists public.cm_rooms (
  id         bigserial primary key,
  a_id       uuid references auth.users(id) on delete set null,
  b_id       uuid references auth.users(id) on delete set null,
  status     text not null default 'open' check (status in ('open','closed')),
  closed_by  uuid,
  closed_at  timestamptz,
  a_read     bigint not null default 0,                  -- 그 사람이 읽은 마지막 메시지 id
  b_read     bigint not null default 0,
  last_id    bigint not null default 0,
  last_at    timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists cm_rooms_pair_idx on public.cm_rooms (a_id, b_id) where a_id is not null and b_id is not null;
create index if not exists cm_rooms_a_idx on public.cm_rooms (a_id, last_at desc);
create index if not exists cm_rooms_b_idx on public.cm_rooms (b_id, last_at desc);

create table if not exists public.cm_messages (
  id         bigserial primary key,
  room_id    bigint not null references public.cm_rooms(id) on delete cascade,
  sender_id  uuid references auth.users(id) on delete set null,
  body       text not null check (char_length(body) between 1 and 1000),
  flagged    text,                                       -- 연락처·송금 유도 등 서버가 경고한 종류
  created_at timestamptz not null default now()
);
create index if not exists cm_messages_room_idx on public.cm_messages (room_id, id);

-- 6) 신고 대상에 메시지·회원 추가(광장 표)
alter table public.cm_reports drop constraint if exists cm_reports_target_type_check;
alter table public.cm_reports add constraint cm_reports_target_type_check check (target_type in ('post','comment','message','user'));
-- 신고 수 트리거: 글·댓글만 센다(메시지·회원 신고가 다른 표의 같은 번호 행을 세지 않도록)
create or replace function public.cm_count_report() returns trigger language plpgsql set search_path = public as $$
begin
  if new.target_type = 'post' then update cm_posts set report_count = report_count + 1 where id = new.target_id;
  elsif new.target_type = 'comment' then update cm_comments set report_count = report_count + 1 where id = new.target_id; end if;
  return null;
end $$;
revoke all on function public.cm_count_report() from public, anon, authenticated;

alter table public.adult_verifications enable row level security;
alter table public.cm_match_profiles   enable row level security;
alter table public.cm_daily_picks      enable row level security;
alter table public.cm_likes            enable row level security;
alter table public.cm_rooms            enable row level security;
alter table public.cm_messages         enable row level security;
revoke all on public.adult_verifications, public.cm_match_profiles, public.cm_daily_picks, public.cm_likes, public.cm_rooms, public.cm_messages from anon, authenticated;
revoke all on sequence public.cm_rooms_id_seq, public.cm_messages_id_seq from anon, authenticated;

-- 되돌리기(새 표만):
-- drop table if exists public.cm_messages, public.cm_rooms, public.cm_likes, public.cm_daily_picks, public.cm_match_profiles, public.adult_verifications;
-- alter table public.cm_reports drop constraint if exists cm_reports_target_type_check; alter table public.cm_reports add constraint cm_reports_target_type_check check (target_type in ('post','comment'));
