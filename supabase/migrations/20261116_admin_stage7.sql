-- 통합 플랫폼 7단계(2026-11-16): 통합 관리자·성과 분석 — 추가만(기존 표·함수 변경 없음)
-- 서버: functions/_activity.js(이용 기록) · functions/_staff.js(운영자 열쇠·권한) · functions/api/community/metrics.js(지표)
-- 원칙: RLS 켬·정책 없음·anon/authenticated 권한 회수 → 서버(service_role)만.
--
-- 1) cm_activity: 로그인 회원이 그날 어느 영역(심층 분석 report / 인연의 광장 community)을 썼는지 하루 한 줄.
--    시각·화면·행동은 남기지 않는다(날짜와 영역뿐). 13개월이 지나면 매일 새벽 자동 파기(pg_cron 'cm-purge-activity').
-- 2) admin_staff: 관리자 비밀번호와 별도로 운영자에게 주는 역할별 열쇠. 열쇠 원문은 저장하지 않고 해시만(만들 때 한 번만 보여 줌).
--    역할: moderator(신고·제재·회원 찾기·작업 기록) · operator(+지표·운테크 문안) · analyst(지표만). 공개 단계·권한·유료·지급은 관리자 비밀번호만.
-- 3) cm_metrics(p_day): 관리자 성과 지표 한 번에 계산(jsonb). p_day = 한국 날짜. 회원 단위 값은 내보내지 않고 개수·비율만.

create table if not exists public.cm_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  surface text not null check (surface in ('report','community')),
  primary key (user_id, day, surface)
);
create index if not exists cm_activity_day_idx on public.cm_activity (day, surface);

create table if not exists public.admin_staff (
  id         bigserial primary key,
  name       text not null unique check (char_length(name) between 1 and 30),
  role       text not null check (role in ('moderator','operator','analyst')),
  key_hash   text not null unique,
  created_by text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.cm_activity enable row level security;
alter table public.admin_staff enable row level security;
revoke all on public.cm_activity, public.admin_staff from anon, authenticated;
revoke all on sequence public.admin_staff_id_seq from anon, authenticated;

-- 이용 기록 13개월 파기
create extension if not exists pg_cron;
create or replace function public.cm_purge_activity() returns integer
language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  delete from cm_activity where day < ((now() at time zone 'Asia/Seoul')::date - interval '13 months')::date;
  get diagnostics n = row_count;
  if n > 0 then
    insert into admin_audit_log (actor, action, target, detail) values ('자동 파기', 'community.activity.purge', null, jsonb_build_object('rows', n));
  end if;
  return n;
end $$;
revoke all on function public.cm_purge_activity() from public, anon, authenticated;
grant execute on function public.cm_purge_activity() to service_role;
select cron.unschedule(jobid) from cron.job where jobname = 'cm-purge-activity';
select cron.schedule('cm-purge-activity', '40 18 * * *', 'select public.cm_purge_activity()');

-- 성과 지표. 정의(관리자 화면에도 같은 말로 적는다):
--   활성 사용자: 그 기간에 한 번이라도 로그인해 그 영역을 쓴 회원 수(DAU=그날, WAU=최근 7일, MAU=최근 30일)
--   7일 재방문율: d-13~d-7 에 쓴 회원 중 d-6~d 에도 쓴 비율 / 30일 재방문율: d-59~d-30 에 쓴 회원 중 d-29~d 에도 쓴 비율
--   참여율(30일): 광장을 쓴 회원 중 글·댓글·운명의 기록·인연 잇기·대화 메시지를 하나라도 남긴 비율
--   심층 분석 유료 전환(30일): 심층 분석을 쓴 회원 중 30일 안에 심층 분석을 결제한 비율(테스트 결제·크레딧 주문 제외)
--   광장→심층 분석 이동: 30일 광장 이용자 중 심층 분석도 쓴 비율 / 광장 이용 뒤 구매: 광장을 처음 쓴 날 이후 심층 분석을 결제한 회원 수
create or replace function public.cm_metrics(p_day date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d date := coalesce(p_day, (now() at time zone 'Asia/Seoul')::date);
  r jsonb := '{}'::jsonb;
  kd text := 'Asia/Seoul';
begin
  -- 활성 사용자(영역별·전체)
  r := r || jsonb_build_object('active', (
    select jsonb_object_agg(s, jsonb_build_object(
      'dau', (select count(distinct user_id) from cm_activity where day = d and (s = 'all' or surface = s)),
      'wau', (select count(distinct user_id) from cm_activity where day between d - 6 and d and (s = 'all' or surface = s)),
      'mau', (select count(distinct user_id) from cm_activity where day between d - 29 and d and (s = 'all' or surface = s)),
      'ret7', (select jsonb_build_object('base', count(*), 'back', count(*) filter (where exists (select 1 from cm_activity b where b.user_id = a.user_id and b.day between d - 6 and d and (s = 'all' or b.surface = s))))
               from (select distinct user_id from cm_activity where day between d - 13 and d - 7 and (s = 'all' or surface = s)) a),
      'ret30', (select jsonb_build_object('base', count(*), 'back', count(*) filter (where exists (select 1 from cm_activity b where b.user_id = a.user_id and b.day between d - 29 and d and (s = 'all' or b.surface = s))))
               from (select distinct user_id from cm_activity where day between d - 59 and d - 30 and (s = 'all' or surface = s)) a)
    )) from unnest(array['all','report','community']) s));

  -- 최근 30일 일별 활성(그래프)
  r := r || jsonb_build_object('series', (
    select coalesce(jsonb_agg(jsonb_build_object('day', g.day, 'report', (select count(*) from cm_activity where day = g.day and surface = 'report'), 'community', (select count(*) from cm_activity where day = g.day and surface = 'community')) order by g.day), '[]'::jsonb)
    from (select generate_series(d - 29, d, interval '1 day')::date as day) g));

  -- 참여율(30일)
  r := r || jsonb_build_object('engage', (
    with act as (select distinct user_id from cm_activity where surface = 'community' and day between d - 29 and d),
    did as (
      select author_id u from cm_posts where (created_at at time zone kd)::date between d - 29 and d
      union select author_id from cm_comments where (created_at at time zone kd)::date between d - 29 and d
      union select user_id from cm_logs where day between d - 29 and d
      union select from_id from cm_likes where (created_at at time zone kd)::date between d - 29 and d
      union select sender_id from cm_messages where (created_at at time zone kd)::date between d - 29 and d)
    select jsonb_build_object('base', (select count(*) from act), 'engaged', (select count(*) from act where user_id in (select u from did where u is not null)),
      'posts', (select count(*) from cm_posts where (created_at at time zone kd)::date between d - 29 and d and status <> 'deleted'),
      'comments', (select count(*) from cm_comments where (created_at at time zone kd)::date between d - 29 and d and status <> 'deleted'),
      'logs', (select count(*) from cm_logs where day between d - 29 and d))));

  -- 심층 분석 결제 전환 · 광장과의 이동
  r := r || jsonb_build_object('convert', (
    with rep as (select distinct user_id from cm_activity where surface = 'report' and day between d - 29 and d),
    com as (select distinct user_id from cm_activity where surface = 'community' and day between d - 29 and d),
    paid as (select user_id, min((paid_at at time zone kd)::date) first_paid, max((paid_at at time zone kd)::date) last_paid from commerce_orders
             where status = 'paid' and not coalesce(is_test, false) and saju_key <> 'credits' and user_id is not null group by user_id),
    paid30 as (select distinct user_id from commerce_orders where status = 'paid' and not coalesce(is_test, false) and saju_key <> 'credits' and user_id is not null and (paid_at at time zone kd)::date between d - 29 and d),
    firstcom as (select user_id, min(day) first_day from cm_activity where surface = 'community' group by user_id)
    select jsonb_build_object(
      'reportUsers', (select count(*) from rep), 'reportBuyers', (select count(*) from rep where user_id in (select user_id from paid30)),
      'buyers30', (select count(*) from paid30),
      'members', (select count(*) from auth.users), 'buyersEver', (select count(*) from paid),
      'communityUsers', (select count(*) from com), 'communityAlsoReport', (select count(*) from com where user_id in (select user_id from rep)),
      'reportAlsoCommunity', (select count(*) from rep where user_id in (select user_id from com)),
      'communityEver', (select count(*) from firstcom),
      'communityThenPaid', (select count(*) from firstcom f join paid p on p.user_id = f.user_id where p.last_paid >= f.first_day),
      'since', (select min(day) from cm_activity))));

  -- 매칭·대화 운영 현황
  r := r || jsonb_build_object('match', jsonb_build_object(
    'profilesOn', (select count(*) from cm_match_profiles where active),
    'adults', (select count(*) from adult_verifications),
    'likes7', (select count(*) from cm_likes where created_at >= now() - interval '7 days'),
    'matches7', (select count(*) from cm_rooms where created_at >= now() - interval '7 days'),
    'roomsOpen', (select count(*) from cm_rooms where status = 'open'),
    'messages7', (select count(*) from cm_messages where created_at >= now() - interval '7 days'),
    'flagged7', (select count(*) from cm_messages where created_at >= now() - interval '7 days' and flagged is not null),
    'reportsOpen', (select coalesce(jsonb_object_agg(target_type, n), '{}'::jsonb) from (select target_type, count(*) n from cm_reports where status = 'open' group by target_type) x),
    'sanctionsActive', (select count(*) from cm_sanctions where lifted_at is null and kind <> 'warn' and (until is null or until > now()))));

  -- 매출·크레딧
  r := r || jsonb_build_object('sales', jsonb_build_object(
    'report30', (select jsonb_build_object('n', count(*), 'won', coalesce(sum(amount), 0)) from commerce_orders where status = 'paid' and not coalesce(is_test, false) and saju_key <> 'credits' and (paid_at at time zone kd)::date between d - 29 and d),
    'credits30', (select jsonb_build_object('n', count(*), 'won', coalesce(sum(amount), 0)) from commerce_orders where status = 'paid' and not coalesce(is_test, false) and saju_key = 'credits' and (paid_at at time zone kd)::date between d - 29 and d),
    'creditsRefunded', (select jsonb_build_object('n', count(*), 'won', coalesce(sum(amount), 0)) from commerce_orders where status = 'canceled' and not coalesce(is_test, false) and saju_key = 'credits'),
    'ledger', (select coalesce(jsonb_object_agg(reason, n), '{}'::jsonb) from (select reason, sum(delta) n from cm_credit_ledger group by reason) x),
    'outstanding', (select coalesce(sum(delta), 0) from cm_credit_ledger)));

  -- 회원
  r := r || jsonb_build_object('members', jsonb_build_object(
    'total', (select count(*) from auth.users),
    'new7', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'new30', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'profiles', (select count(*) from member_profiles),
    'alerts', (select count(*) from launch_alerts where revoked_at is null)));

  return r || jsonb_build_object('day', d, 'at', now());
end $$;
revoke all on function public.cm_metrics(date) from public, anon, authenticated;
grant execute on function public.cm_metrics(date) to service_role;

-- 되돌리기: select cron.unschedule('cm-purge-activity'); drop function if exists public.cm_metrics(date), public.cm_purge_activity(); drop table if exists public.cm_activity, public.admin_staff;
