-- 회원 탈퇴(2026-11-11): 로그인 정보는 지우고, 주문·결제 기록은 전자상거래법에 따라 5년 보관하되 회원과의 연결을 끊는다.
-- 1) 주문의 회원 연결을 탈퇴 시 비운다(이전: on delete restrict 라 회원을 지울 수 없었다). 구매 권한·저장한 사주는 원래대로 함께 지운다(cascade).
alter table public.commerce_orders alter column user_id drop not null;
alter table public.commerce_orders drop constraint if exists commerce_orders_user_id_fkey;
alter table public.commerce_orders add constraint commerce_orders_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.commerce_orders add column if not exists withdrawn_at timestamptz;   -- 회원이 탈퇴해 연결을 끊은 시각

-- 2) 소셜 로그인 식별값 ↔ 회원: 카카오 연결 해제 알림(회원번호)으로 회원을 찾고, 탈퇴 때 카카오 연결을 끊는 데 쓴다.
--    auth 스키마는 REST 로 열리지 않아 서버 전용 함수로만 읽는다(익명·로그인 사용자는 실행 불가).
create or replace function public.commerce_user_by_identity(p_provider text, p_provider_id text)
returns uuid language sql stable security definer set search_path = '' as $$
  select i.user_id from auth.identities i where i.provider = p_provider and i.provider_id = p_provider_id limit 1
$$;
create or replace function public.commerce_identities(p_user uuid)
returns table(provider text, provider_id text) language sql stable security definer set search_path = '' as $$
  select i.provider, i.provider_id from auth.identities i where i.user_id = p_user
$$;
revoke all on function public.commerce_user_by_identity(text, text) from public, anon, authenticated;
revoke all on function public.commerce_identities(uuid) from public, anon, authenticated;
grant execute on function public.commerce_user_by_identity(text, text) to service_role;
grant execute on function public.commerce_identities(uuid) to service_role;
