-- 무빙툰(/report/) 회원 결제: 주문 · 구매 권한 · 회원 사주
-- 서버(Cloudflare Pages Functions)만 service_role 키로 읽고 쓴다. RLS 를 켜고 정책을 두지 않아 브라우저(anon·authenticated)는 직접 접근할 수 없다.
-- 상품·가격표는 자주 바뀌고 관리자 화면에서만 고치므로 KV 'commerce:products' 에 둔다(functions/_commerce.js).
-- 구매 단위: 회원(user_id) × 사주(saju_key) × 세계(world). 묶음은 구매 시점에 켜져 있던 세계 목록을 주문(worlds)에 저장한다.

create table if not exists public.commerce_orders (
  order_id     text primary key,                         -- 토스에 넘기는 주문번호(mt_ + 무작위)
  user_id      uuid not null references auth.users(id) on delete restrict,
  saju_key     text not null,                            -- 사주 식별값(원국 기둥·성별·시간 여부의 해시). 출생 정보 원문은 저장하지 않는다
  saju_label   text,                                     -- 마이페이지 표시용(예: '나', 사용자가 붙인 이름)
  product_id   text not null,
  product_name text not null,
  worlds       text[] not null,                          -- 이 주문으로 열리는 세계(구매 당시 목록)
  amount       integer not null check (amount > 0),      -- 원
  status       text not null default 'pending' check (status in ('pending','paid','failed','canceled','partial_canceled')),
  payment_key  text unique,
  method       text,
  failure      text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  canceled_at  timestamptz,
  cancel_reason text
);
create index if not exists commerce_orders_user_idx on public.commerce_orders (user_id, created_at desc);
create index if not exists commerce_orders_status_idx on public.commerce_orders (status, created_at desc);

create table if not exists public.commerce_entitlements (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  saju_key   text not null,
  world      text not null,
  order_id   text references public.commerce_orders(order_id) on delete set null,
  granted_at timestamptz not null default now(),
  granted_by text,                                       -- 'payment' 또는 관리자 이름(수동 부여)
  revoked_at timestamptz,                                -- 환불·취소 시 행을 지우지 않고 회수 시각만 남긴다
  unique (user_id, saju_key, world, order_id)
);
create index if not exists commerce_entitlements_active_idx on public.commerce_entitlements (user_id, saju_key) where revoked_at is null;

-- 회원이 저장한 사주(다른 기기에서 다시 열기용). 출생 정보는 회원 본인 열람에만 쓴다.
create table if not exists public.member_sajus (
  user_id    uuid not null references auth.users(id) on delete cascade,
  saju_key   text not null,
  label      text,
  birth      jsonb not null,                             -- 무빙툰 입력 화면 값(이름 제외 가능)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, saju_key)
);

alter table public.commerce_orders       enable row level security;
alter table public.commerce_entitlements enable row level security;
alter table public.member_sajus          enable row level security;
revoke all on public.commerce_orders, public.commerce_entitlements, public.member_sajus from anon, authenticated;
revoke all on sequence public.commerce_entitlements_id_seq from anon, authenticated;
