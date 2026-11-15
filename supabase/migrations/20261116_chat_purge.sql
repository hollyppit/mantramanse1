-- 대화 90일 파기(2026-11-16). 개인정보처리방침: "대화 메시지는 대화가 끝난 뒤 신고 대응을 위해 90일 보관한 다음 파기"
-- 매일 새벽 3시 30분(한국 시간, UTC 18:30) Supabase pg_cron 이 public.cm_purge_chats() 를 실행한다.
--   1) 한쪽이 탈퇴해 상대가 없는데 아직 열린 대화방 → 지금 끝난 것으로 표시(90일 계산 시작)
--   2) 끝난 지(closed_at) 90일이 지난 대화방을 지운다 → 메시지는 함께 지워진다(on delete cascade)
--   3) 7일 지난 '오늘의 인연' 목록을 지운다(그날만 쓰는 값)
--   지운 것이 있으면 관리자 작업 기록(admin_audit_log)에 actor '자동 파기'로 남는다(대화 내용·회원은 적지 않음, 개수만)
-- 신고 기록(cm_reports)은 지우지 않는다: 메시지 본문이 사라져도 신고 사유·처리 결과는 남는다.
-- 수동 실행(관리자 SQL): select public.cm_purge_chats();

create extension if not exists pg_cron;

create or replace function public.cm_purge_chats() returns jsonb
language plpgsql security definer set search_path = public as $$
declare n_closed int := 0; n_rooms int := 0; n_msgs int := 0; n_picks int := 0;
begin
  update cm_rooms set status = 'closed', closed_at = coalesce(closed_at, now())
   where status = 'open' and (a_id is null or b_id is null);
  get diagnostics n_closed = row_count;

  select count(*) into n_msgs from cm_messages m join cm_rooms r on r.id = m.room_id
   where r.status = 'closed' and r.closed_at < now() - interval '90 days';
  delete from cm_rooms where status = 'closed' and closed_at < now() - interval '90 days';
  get diagnostics n_rooms = row_count;

  delete from cm_daily_picks where day < (now() at time zone 'Asia/Seoul')::date - 7;
  get diagnostics n_picks = row_count;

  if n_closed + n_rooms + n_picks > 0 then
    insert into admin_audit_log (actor, action, target, detail)
    values ('자동 파기', 'community.chat.purge', null, jsonb_build_object('closedOrphans', n_closed, 'rooms', n_rooms, 'messages', n_msgs, 'picks', n_picks));
  end if;
  return jsonb_build_object('closedOrphans', n_closed, 'rooms', n_rooms, 'messages', n_msgs, 'picks', n_picks);
end $$;
revoke all on function public.cm_purge_chats() from public, anon, authenticated;
grant execute on function public.cm_purge_chats() to service_role;

-- 같은 이름의 예약이 있으면 바꾼다(다시 적용해도 하나만 남는다)
select cron.unschedule(jobid) from cron.job where jobname = 'cm-purge-chats';
select cron.schedule('cm-purge-chats', '30 18 * * *', 'select public.cm_purge_chats()');

-- 되돌리기: select cron.unschedule('cm-purge-chats'); drop function if exists public.cm_purge_chats();
