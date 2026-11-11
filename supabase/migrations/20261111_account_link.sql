-- 로그인 방법 연결(2026-11-11): 같은 사람이 카카오·구글·네이버로 따로 가입한 회원을 하나로 합친다.
-- 합치는 방법: 회원 A 로 로그인한 상태에서 다른 방법(B)으로 한 번 더 로그인하면 B 의 로그인·구매 내역을 A 로 옮기고 B 를 지운다(functions/_account-link.js).

-- 1) 네이버 연결: 네이버는 Supabase 기본 로그인이 아니라 서버가 처리하므로(functions/_naver-login.js) '네이버 회원 키 → 회원' 연결표를 둔다.
--    키는 네이버 고유 id 의 해시(내부 주소 naver-<키>@users.mantrafortune.com 의 <키>). 연결이 있으면 네이버 로그인은 그 회원으로 들어간다.
create table if not exists public.member_naver_links (
  naver_key  text primary key check (naver_key ~ '^[0-9a-f]{32}$'),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists member_naver_links_user_idx on public.member_naver_links (user_id);
alter table public.member_naver_links enable row level security;
revoke all on public.member_naver_links from anon, authenticated;

-- 2) 카카오·구글 로그인(auth.identities)을 다른 회원으로 옮긴다. 같은 회사 로그인이 이미 있으면 옮기지 않는다(한 회원에 같은 회사 하나).
create or replace function public.commerce_move_identities(p_from uuid, p_to uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_from = p_to then return 0; end if;
  update auth.identities i set user_id = p_to, updated_at = now()
   where i.user_id = p_from and i.provider in ('kakao', 'google')
     and not exists (select 1 from auth.identities j where j.user_id = p_to and j.provider = i.provider);
  get diagnostics n = row_count;
  -- 로그인 회사 목록(app_metadata.providers)도 맞춘다
  update auth.users u set raw_app_meta_data = jsonb_set(coalesce(u.raw_app_meta_data, '{}'::jsonb), '{providers}',
         coalesce((select jsonb_agg(distinct i.provider) from auth.identities i where i.user_id = p_to), '[]'::jsonb))
   where u.id = p_to;
  return n;
end $$;

-- 3) 같은 이메일의 다른 회원 찾기(안내용): 실제 이메일 또는 네이버 회원의 네이버 이메일(user_metadata.email)
create or replace function public.commerce_members_by_email(p_email text)
returns table(user_id uuid, providers text[], naver boolean) language sql stable security definer set search_path = '' as $$
  select u.id,
         coalesce((select array_agg(distinct i.provider) from auth.identities i where i.user_id = u.id and i.provider in ('kakao','google')), '{}'),
         (u.raw_user_meta_data->>'provider') = 'naver' or exists (select 1 from public.member_naver_links l where l.user_id = u.id)
    from auth.users u
   where p_email is not null and length(p_email) between 3 and 200
     and (lower(u.email) = lower(p_email) or ((u.raw_user_meta_data->>'provider') = 'naver' and lower(u.raw_user_meta_data->>'email') = lower(p_email)))
   limit 5
$$;

revoke all on function public.commerce_move_identities(uuid, uuid) from public, anon, authenticated;
revoke all on function public.commerce_members_by_email(text) from public, anon, authenticated;
grant execute on function public.commerce_move_identities(uuid, uuid) to service_role;
grant execute on function public.commerce_members_by_email(text) to service_role;
grant select, insert, update, delete on public.member_naver_links to service_role;
