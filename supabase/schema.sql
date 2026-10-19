-- 만트라 만세력: Cloudflare KV 대신 Supabase 에 두는 키-값 테이블 (functions/_store.js 가 사용)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run.
-- 서버(Cloudflare Pages Functions)만 service_role 키로 접근한다. 브라우저에는 이 키를 절대 넣지 않는다.

create table if not exists public.kv (
  key        text primary key,
  value      text,                       -- JSON 문자열 또는 문자열. null 이면 "삭제됨" 표시(기존 KV 값을 되살리지 않게 하는 묘비)
  expires_at timestamptz,                -- 호출 횟수·AI 합성 캐시처럼 기한이 있는 값
  updated_at timestamptz not null default now()
);

-- 접두어 검색(대기자 명단 등)과 만료 정리에 쓰는 인덱스
create index if not exists kv_key_prefix_idx on public.kv (key text_pattern_ops);
create index if not exists kv_expires_idx    on public.kv (expires_at) where expires_at is not null;

-- 공개 접근 차단: RLS 를 켜고 정책을 하나도 만들지 않는다. service_role 은 RLS 를 우회하므로 서버에서만 읽고 쓸 수 있다.
alter table public.kv enable row level security;
revoke all on public.kv from anon, authenticated;

-- (선택) 만료된 행을 매일 새벽에 지운다. Database → Extensions 에서 pg_cron 을 켠 뒤 실행.
-- select cron.schedule('kv-expire', '17 3 * * *', $$ delete from public.kv where expires_at is not null and expires_at < now() $$);

-- Narrow service-only projections: public reads never transfer drafts, scenarios or history.
create or replace function public.reading_published_library(p_chapter text)
returns jsonb language sql stable security invoker set search_path = '' as $fn$
  with entry as materialized (
    select case when value is null or (expires_at is not null and expires_at <= now()) then '{}'::jsonb else value::jsonb end as doc
    from public.kv
    where p_chapter ~ '^timeline_(self|wealth|career|love|health|creative|remedy)_[0-9]{2}$'
      and key = 'ik:blocks:chapter:library.' || p_chapter
  )
  select jsonb_build_object('version',coalesce((doc->>'version')::integer,0),'published',coalesce(doc->'published','[]'::jsonb)) from entry;
$fn$;
revoke all on function public.reading_published_library(text) from public, anon, authenticated;
grant execute on function public.reading_published_library(text) to service_role;

create or replace function public.reading_library_summaries(p_chapters text[])
returns table(chapter text, version integer, draft_count integer, published_count integer)
language sql stable security invoker set search_path = '' as $fn$
  with entries as materialized (
    select c.chapter, case when k.value is null or (k.expires_at is not null and k.expires_at <= now()) then '{}'::jsonb else k.value::jsonb end as doc
    from unnest(p_chapters) as c(chapter)
    join public.kv k on k.key = 'ik:blocks:chapter:library.' || c.chapter
    where cardinality(p_chapters) <= 100 and c.chapter ~ '^timeline_(self|wealth|career|love|health|creative|remedy)_[0-9]{2}$'
  )
  select chapter, coalesce((doc->>'version')::integer,0), jsonb_array_length(coalesce(doc->'draft','[]'::jsonb)),jsonb_array_length(coalesce(doc->'published','[]'::jsonb)) from entries;
$fn$;
revoke all on function public.reading_library_summaries(text[]) from public, anon, authenticated;
grant execute on function public.reading_library_summaries(text[]) to service_role;
