-- 1:1 문의 답변 내용 저장(2026-11-13). 관리자 화면(결제·상품 → 1:1 문의)에서 답변을 쓰면 여기에 남고, 회원에게 메일로 보내며 마이페이지 문의 내역에 보인다.
alter table public.support_inquiries add column if not exists answer text check (answer is null or char_length(answer) between 1 and 4000);
alter table public.support_inquiries add column if not exists answered_by text;
alter table public.support_inquiries add column if not exists answer_mailed boolean not null default false;
