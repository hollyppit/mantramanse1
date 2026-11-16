-- 통합 플랫폼 6단계(2026-11-16): 인연의 광장 크레딧 원장 — 지급·사용 이력(추가만), 잔액은 원장 합계, 같은 요청 두 번 처리 방지(멱등 키)
-- 서버: functions/_credits.js, functions/api/community/credits.js · 유료 스위치(KV 'plaza:premium')는 기본 꺼짐
-- 원칙: RLS 켬·정책 없음·anon/authenticated 권한 회수 → 서버만. 심층 분석 결제 표(commerce_*)는 건드리지 않는다.
-- 결제로 산 크레딧을 연결할 때(다음 단계, 승인 후) reason='purchase', ref=주문번호 로 같은 원장에 넣는다.

create table if not exists public.cm_credit_ledger (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  delta      integer not null check (delta <> 0 and delta between -10000 and 10000),
  reason     text not null check (reason in ('grant','purchase','refund','more_picks','extra_like','adjust')),
  ref        text,                                       -- 주문번호·날짜 등
  idem_key   text not null unique,                       -- 같은 지급·사용을 두 번 넣지 않는다
  by_actor   text,                                       -- 관리자 지급이면 작업자 이름
  created_at timestamptz not null default now()
);
create index if not exists cm_credit_ledger_user_idx on public.cm_credit_ledger (user_id, created_at desc);

-- 잔액
create or replace function public.cm_credit_balance(p_user uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from cm_credit_ledger where user_id = p_user
$$;

-- 원자적 사용: 회원별 잠금 → 잔액 확인 → 차감 기록. 같은 idem_key 로 다시 부르면 차감하지 않고 지금 잔액만 돌려준다
-- 반환: { ok, balance, dup } 또는 { ok:false, error:'insufficient', balance }
create or replace function public.cm_credit_spend(p_user uuid, p_amount integer, p_reason text, p_ref text, p_idem text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 1000 then return jsonb_build_object('ok', false, 'error', 'bad-amount'); end if;
  if p_reason not in ('more_picks','extra_like','adjust') then return jsonb_build_object('ok', false, 'error', 'bad-reason'); end if;
  perform pg_advisory_xact_lock(hashtext('cm-credit:' || p_user::text));
  if exists (select 1 from cm_credit_ledger where idem_key = p_idem) then
    return jsonb_build_object('ok', true, 'dup', true, 'balance', public.cm_credit_balance(p_user));
  end if;
  bal := public.cm_credit_balance(p_user);
  if bal < p_amount then return jsonb_build_object('ok', false, 'error', 'insufficient', 'balance', bal); end if;
  insert into cm_credit_ledger (user_id, delta, reason, ref, idem_key) values (p_user, -p_amount, p_reason, p_ref, p_idem);
  return jsonb_build_object('ok', true, 'dup', false, 'balance', bal - p_amount);
end $$;

-- 지급(관리자·결제·환불 보정): 같은 idem_key 는 한 번만
create or replace function public.cm_credit_grant(p_user uuid, p_amount integer, p_reason text, p_ref text, p_idem text, p_by text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_amount is null or p_amount = 0 or abs(p_amount) > 10000 then return jsonb_build_object('ok', false, 'error', 'bad-amount'); end if;
  if p_reason not in ('grant','purchase','refund','adjust') then return jsonb_build_object('ok', false, 'error', 'bad-reason'); end if;
  perform pg_advisory_xact_lock(hashtext('cm-credit:' || p_user::text));
  insert into cm_credit_ledger (user_id, delta, reason, ref, idem_key, by_actor) values (p_user, p_amount, p_reason, p_ref, p_idem, p_by)
    on conflict (idem_key) do nothing;
  return jsonb_build_object('ok', true, 'balance', public.cm_credit_balance(p_user));
end $$;

alter table public.cm_credit_ledger enable row level security;
revoke all on public.cm_credit_ledger from anon, authenticated;
revoke all on sequence public.cm_credit_ledger_id_seq from anon, authenticated;
revoke all on function public.cm_credit_balance(uuid), public.cm_credit_spend(uuid, integer, text, text, text), public.cm_credit_grant(uuid, integer, text, text, text, text) from public, anon, authenticated;
grant execute on function public.cm_credit_balance(uuid), public.cm_credit_spend(uuid, integer, text, text, text), public.cm_credit_grant(uuid, integer, text, text, text, text) to service_role;

-- 되돌리기: drop function if exists public.cm_credit_spend(uuid,integer,text,text,text), public.cm_credit_grant(uuid,integer,text,text,text,text), public.cm_credit_balance(uuid); drop table if exists public.cm_credit_ledger;
