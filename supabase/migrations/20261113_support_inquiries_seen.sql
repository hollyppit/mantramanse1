-- 1:1 문의 새 답변 알림(2026-11-13): 회원이 마이페이지 문의 내역에서 답변을 본 시각. 비어 있고 answer 가 있으면 '새 답변'으로 표시한다.
-- 관리자가 답변을 다시 보내면 비운다(functions/api/commerce/admin.js inquiry-answer).
alter table public.support_inquiries add column if not exists answer_seen_at timestamptz;
create index if not exists support_inquiries_unseen_idx on public.support_inquiries (user_id) where answer is not null and answer_seen_at is null;
