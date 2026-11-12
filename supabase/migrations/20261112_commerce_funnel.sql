-- 구매 전환 측정(2026-11-12): 하루(KST)·단계·방문자(브라우저마다 무작위 id)마다 한 줄. 개인정보 없음(IP·회원 id·사주 넣지 않음).
-- 단계: read(장을 읽음) → gate(잠긴 장에서 구매 창) → login_start(로그인 시작) → gate_logged(로그인한 채 구매 창) → checkout(결제창 열기) → paid(결제 완료 화면)
-- 같은 방문자가 같은 날 같은 단계를 여러 번 해도 한 번만 센다(기본 키). 180일 지난 줄은 관리자 화면을 열 때 지운다.
create table if not exists public.commerce_funnel (
  day date not null,
  step text not null check (step in ('read', 'gate', 'login_start', 'gate_logged', 'checkout', 'paid')),
  vid uuid not null,
  primary key (day, step, vid)
);
alter table public.commerce_funnel enable row level security;   -- 정책 없음: 서버(service_role)만 읽고 쓴다
revoke all on public.commerce_funnel from anon, authenticated;

-- 날짜·단계별 방문자 수
create or replace function public.commerce_funnel_counts(from_day date, to_day date)
returns table (day date, step text, n bigint)
language sql stable security definer set search_path = public as $$
  select f.day, f.step, count(*)::bigint from public.commerce_funnel f
  where f.day >= from_day and f.day <= to_day group by f.day, f.step order by f.day, f.step;
$$;
revoke all on function public.commerce_funnel_counts(date, date) from public, anon, authenticated;
grant execute on function public.commerce_funnel_counts(date, date) to service_role;
