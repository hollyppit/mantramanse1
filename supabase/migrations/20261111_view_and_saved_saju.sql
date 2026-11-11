-- 열람 기록·구매한 사주 저장(2026-11-11)
-- 1) 구매 권한별 첫 유료 장 열람 시각: 환불정책 '7일 이내·유료 장 미열람 시 전액 환불' 판단 근거. 묶음은 포함된 주제 중 하나라도 열면 열람으로 본다.
alter table public.commerce_entitlements add column if not exists first_viewed_at timestamptz;
-- 2) 주문 당시의 출생 입력(구매한 사주를 다른 기기에서 다시 열기 위해). 결제가 끝나면 회원의 저장한 사주(member_sajus)로 옮겨 적는다.
--    회원이 탈퇴하면 주문에 남은 출생 입력도 지운다(functions/_account.js).
alter table public.commerce_orders add column if not exists birth jsonb;
