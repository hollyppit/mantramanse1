-- 테스트 주문 표시(2026-11-12): 매출 요약·CSV 에서 테스트 결제를 뺀다.
-- 자동 표시: 포트원 테스트 채널(channel.type = TEST)·토스 테스트 키로 결제된 주문. 관리자 화면에서 직접 켜고 끌 수도 있다.
alter table public.commerce_orders add column if not exists is_test boolean not null default false;
-- 이 시점까지의 주문은 모두 판매 시작 전 테스트(포트원 테스트 채널·토스 테스트 키)였다
update public.commerce_orders set is_test = true where created_at < '2026-11-12T03:00:00Z';
create index if not exists commerce_orders_paid_idx on public.commerce_orders (paid_at) where is_test = false;
