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
