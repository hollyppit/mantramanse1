-- 마이페이지 1:1 문의(2026-11-13). 서버(functions/api/account/inquiry.js)만 service_role 키로 읽고 쓴다.
-- 흐름: 회원이 마이페이지에서 문의 → 이 표에 저장 → 관리자(ADMIN_ALERT_EMAIL)에게 알림 메일(회신 주소 = 회원 이메일) → 관리자가 메일로 바로 답장.
-- 보관: 소비자 불만·분쟁 처리 기록 3년(전자상거래법, 개인정보처리방침 제3조). 회원이 탈퇴해도 기록은 남기고 user_id 만 비운다.
create table if not exists public.support_inquiries (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null,                 -- 답장 받을 주소(로그인 계정 이메일)
  category     text not null check (category in ('payment','refund','content','account','etc')),
  subject      text not null check (char_length(subject) between 1 and 80),
  body         text not null check (char_length(body) between 5 and 2000),
  order_id     text,                          -- 선택: 관련 주문번호
  status       text not null default 'received' check (status in ('received','answered','closed')),
  mailed       boolean not null default false, -- 관리자 알림 메일 발송 성공 여부
  created_at   timestamptz not null default now(),
  answered_at  timestamptz
);
create index if not exists support_inquiries_user_idx on public.support_inquiries (user_id, created_at desc);
create index if not exists support_inquiries_status_idx on public.support_inquiries (status, created_at desc);

alter table public.support_inquiries enable row level security;
revoke all on public.support_inquiries from anon, authenticated;
revoke all on sequence public.support_inquiries_id_seq from anon, authenticated;
