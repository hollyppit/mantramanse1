-- 인연의 광장 크레딧 자동 충전(정기결제, 2026-11-19): 잔액이 기준 아래로 떨어지면 등록한 카드(포트원 빌링키)로 고른 묶음을 자동 결제
-- 서버: functions/_autotopup.js, functions/api/community/autotopup.js · 결제 기록은 기존 commerce_orders(auto_topup=true)
-- 원칙: RLS 켬·정책 없음·anon/authenticated 권한 회수 → 서버만. 빌링키는 화면에 내려 보내지 않는다.

create table if not exists public.cm_autotopup (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  billing_key    text,                                   -- 포트원 빌링키(해지하면 null)
  card_label     text,                                   -- 화면 표시용 '신한카드 ····1234'
  pack_id        text not null check (pack_id in ('cr10','cr30','cr100')),
  threshold      integer not null check (threshold between 0 and 100),       -- 잔액이 이 개수 미만이 되면 충전
  monthly_limit  integer not null check (monthly_limit between 1 and 10),    -- 한 달(KST) 최대 자동 결제 횟수
  active         boolean not null default true,
  fail_count     integer not null default 0,              -- 연속 실패(3번이면 멈춤)
  last_error     text,
  charging_at    timestamptz,                            -- 결제 중 표시(겹쳐 결제 방지 잠금, 3분 지나면 풀림)
  last_charged_at timestamptz,
  agreed_at      timestamptz not null default now(),     -- 자동 결제 동의 시각
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.commerce_orders add column if not exists auto_topup boolean not null default false;
create index if not exists commerce_orders_auto_idx on public.commerce_orders (user_id, paid_at) where auto_topup;

alter table public.cm_autotopup enable row level security;
revoke all on public.cm_autotopup from anon, authenticated;

-- 되돌리기: drop table if exists public.cm_autotopup; drop index if exists commerce_orders_auto_idx; alter table public.commerce_orders drop column if exists auto_topup;
