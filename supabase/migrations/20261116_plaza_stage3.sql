-- 통합 플랫폼 3단계(2026-11-16): 운명의 광장 MVP — 글·댓글·좋아요/북마크·신고·차단·제재
-- 계획: docs/PLATFORM_EXPANSION_PLAN_2026-11-15.md · 서버: functions/_plaza.js, functions/api/community/{posts,post,comments,react,report,block,me,mod}.js
-- 원칙(1·2단계와 같음): RLS 를 켜고 정책을 두지 않으며 anon·authenticated 권한을 회수한다 → 서버(service_role)만 읽고 쓴다.
-- 기존 표는 건드리지 않는다(추가만). 숫자(좋아요·댓글 수)는 트리거가 맞춘다(서버가 직접 더하지 않음 → 동시 요청에도 맞음).
-- 탈퇴: 서버(functions/_account.js withdraw)가 글·댓글을 '삭제됨'으로 바꾼 뒤 회원을 지운다 → author_id 는 비워지고 본문은 누구에게도 보이지 않는다. 반응·차단·제재는 함께 지운다.

create table if not exists public.cm_posts (
  id            bigserial primary key,
  author_id     uuid references auth.users(id) on delete set null,
  category      text not null check (category in ('wealth','love','work','people','daily')),
  group_kind    text check (group_kind is null or group_kind in ('ilju','ilgan')),
  group_key     text check (group_key is null or char_length(group_key) between 1 and 4),
  title         text not null check (char_length(title) between 2 and 60),
  body          text not null check (char_length(body) between 2 and 5000),
  hashtags      text[] not null default '{}',
  status        text not null default 'visible' check (status in ('visible','hidden','deleted')),
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  report_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  edited_at     timestamptz,
  check ((group_kind is null) = (group_key is null))
);
create index if not exists cm_posts_feed_idx  on public.cm_posts (created_at desc) where status = 'visible';
create index if not exists cm_posts_cat_idx   on public.cm_posts (category, created_at desc) where status = 'visible';
create index if not exists cm_posts_group_idx on public.cm_posts (group_kind, group_key, created_at desc) where status = 'visible';
create index if not exists cm_posts_author_idx on public.cm_posts (author_id);
create index if not exists cm_posts_tags_idx  on public.cm_posts using gin (hashtags);

create table if not exists public.cm_comments (
  id         bigserial primary key,
  post_id    bigint not null references public.cm_posts(id) on delete cascade,
  parent_id  bigint references public.cm_comments(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  body       text not null check (char_length(body) between 1 and 1000),
  status     text not null default 'visible' check (status in ('visible','hidden','deleted')),
  report_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cm_comments_post_idx on public.cm_comments (post_id, created_at);
create index if not exists cm_comments_author_idx on public.cm_comments (author_id);

create table if not exists public.cm_reactions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  post_id    bigint not null references public.cm_posts(id) on delete cascade,
  kind       text not null check (kind in ('like','bookmark')),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id, kind)
);
create index if not exists cm_reactions_post_idx on public.cm_reactions (post_id, kind);

create table if not exists public.cm_reports (
  id          bigserial primary key,
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('post','comment')),
  target_id   bigint not null,
  target_author uuid references auth.users(id) on delete set null,
  reason      text not null check (reason in ('spam','abuse','sexual','privacy','scam','etc')),
  detail      text check (detail is null or char_length(detail) <= 300),
  status      text not null default 'open' check (status in ('open','resolved','dismissed')),
  handled_by  text,
  handled_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index if not exists cm_reports_open_idx on public.cm_reports (created_at desc) where status = 'open';

create table if not exists public.cm_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.cm_sanctions (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('warn','mute','ban')),
  reason     text not null check (char_length(reason) between 1 and 200),
  until      timestamptz,                       -- 비우면 무기한(경고는 기록만)
  by_actor   text not null,
  created_at timestamptz not null default now(),
  lifted_at  timestamptz
);
create index if not exists cm_sanctions_user_idx on public.cm_sanctions (user_id) where lifted_at is null;

-- 숫자 맞추기: 좋아요 수·댓글 수·신고 수(트리거)
create or replace function public.cm_count_reaction() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.kind = 'like' then update cm_posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' and old.kind = 'like' then update cm_posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if; return null;
end $$;
drop trigger if exists cm_reactions_count on public.cm_reactions;
create trigger cm_reactions_count after insert or delete on public.cm_reactions for each row execute function public.cm_count_reaction();

create or replace function public.cm_count_comment() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'visible' then update cm_posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' and old.status = 'visible' and new.status <> 'visible' then update cm_posts set comment_count = greatest(0, comment_count - 1) where id = new.post_id;
  elsif tg_op = 'UPDATE' and old.status <> 'visible' and new.status = 'visible' then update cm_posts set comment_count = comment_count + 1 where id = new.post_id;
  end if; return null;
end $$;
drop trigger if exists cm_comments_count on public.cm_comments;
create trigger cm_comments_count after insert or update of status on public.cm_comments for each row execute function public.cm_count_comment();

create or replace function public.cm_count_report() returns trigger language plpgsql set search_path = public as $$
begin
  if new.target_type = 'post' then update cm_posts set report_count = report_count + 1 where id = new.target_id;
  else update cm_comments set report_count = report_count + 1 where id = new.target_id; end if;
  return null;
end $$;
drop trigger if exists cm_reports_count on public.cm_reports;
create trigger cm_reports_count after insert on public.cm_reports for each row execute function public.cm_count_report();

alter table public.cm_posts     enable row level security;
alter table public.cm_comments  enable row level security;
alter table public.cm_reactions enable row level security;
alter table public.cm_reports   enable row level security;
alter table public.cm_blocks    enable row level security;
alter table public.cm_sanctions enable row level security;
revoke all on public.cm_posts, public.cm_comments, public.cm_reactions, public.cm_reports, public.cm_blocks, public.cm_sanctions from anon, authenticated;
revoke all on sequence public.cm_posts_id_seq, public.cm_comments_id_seq, public.cm_reports_id_seq, public.cm_sanctions_id_seq from anon, authenticated;
revoke all on function public.cm_count_reaction(), public.cm_count_comment(), public.cm_count_report() from public, anon, authenticated;

-- 되돌리기(기존 서비스와 무관한 새 표만 지운다):
-- drop table if exists public.cm_sanctions, public.cm_blocks, public.cm_reports, public.cm_reactions, public.cm_comments, public.cm_posts;
-- drop function if exists public.cm_count_reaction(), public.cm_count_comment(), public.cm_count_report();
