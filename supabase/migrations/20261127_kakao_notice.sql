-- 카카오 알림톡 거래 안내(구매 완료·문의 답변·이용 기간 만료 30일 전). 2026-11-27
-- 서버: functions/_notice.js · functions/api/account/notify.js · functions/api/commerce/expiry-notice.js
-- member_profiles·commerce_orders 는 anon/authenticated 권한이 없다(서버 service key 만) — 새 열도 그대로 서버 전용.

-- 1) 회원이 마이페이지에서 직접 적은 '알림 받을 번호'. 광고 수신용 phone 과 따로 둔다(목적이 다르다). 끄면 지운다. 탈퇴하면 행째 지워진다(cascade)
alter table public.member_profiles add column if not exists notify_phone text check (notify_phone is null or notify_phone ~ '^01[016789][0-9]{7,8}$');
alter table public.member_profiles add column if not exists notify_at timestamptz;   -- 켠 시각

-- 2) 만료 예고를 이미 처리한 주문(한 번만 보내기)
alter table public.commerce_orders add column if not exists expiry_noticed_at timestamptz;
create index if not exists commerce_orders_expiry_notice_idx on public.commerce_orders (paid_at) where status = 'paid' and expiry_noticed_at is null;

-- 3) 매일 10시(한국) 만료 예고 실행. pg_net 이 필요하다. 비밀값은 Vault 'cron_secret'(Cloudflare Secret CRON_SECRET 과 같은 값, 24자 이상)
--    먼저: select vault.create_secret('<무작위 32자 이상>', 'cron_secret');
create extension if not exists pg_net;
select cron.unschedule('kakao-expiry-notice') where exists (select 1 from cron.job where jobname = 'kakao-expiry-notice');
select cron.schedule('kakao-expiry-notice', '0 1 * * *', $cron$
  select net.http_post(
    url := 'https://mantrafortune.com/api/commerce/expiry-notice',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$cron$);

-- 되돌리기:
--   select cron.unschedule('kakao-expiry-notice');
--   alter table public.commerce_orders drop column if exists expiry_noticed_at;
--   alter table public.member_profiles drop column if exists notify_at, drop column if exists notify_phone;
