-- 구글 로그인을 우리 서버가 처리(2026-11-12): 구글 로그인 화면이 Supabase 주소가 아니라 mantrafortune.com 으로만 돌아오게 해 브랜드 인증을 받기 위해.
-- 구글 고유 id(sub) → 회원 연결표. 예전에 Supabase 로 가입한 구글 회원은 auth.identities(provider='google', provider_id=sub)로 찾고,
-- 새로 들어오는 회원과 다른 방법에 연결된 구글 계정은 이 표로 찾는다(functions/_google-login.js).
create table if not exists public.member_google_links (
  google_sub text primary key check (google_sub ~ '^[0-9]{5,40}$'),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists member_google_links_user_idx on public.member_google_links (user_id);
alter table public.member_google_links enable row level security;
revoke all on public.member_google_links from anon, authenticated;
grant select, insert, update, delete on public.member_google_links to service_role;

-- 같은 이메일의 회원(구글은 인증된 이메일만 받는다: Supabase 의 '인증 이메일 자동 연결'과 같은 규칙)
create or replace function public.commerce_user_by_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where p_email is not null and lower(u.email) = lower(p_email) limit 1
$$;
revoke all on function public.commerce_user_by_email(text) from public, anon, authenticated;
grant execute on function public.commerce_user_by_email(text) to service_role;
