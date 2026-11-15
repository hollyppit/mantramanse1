-- 통합 플랫폼 4단계(2026-11-16): 운명의 기록 — 하루 한 줄 기분·경험 기록(본인만 봄)
-- 계획: docs/PLATFORM_EXPANSION_PLAN_2026-11-15.md · 서버: functions/_daily.js, functions/api/community/{today,records}.js
-- 원칙(1~3단계와 같음): RLS 켬·정책 없음·anon/authenticated 권한 회수 → 서버만 읽고 쓴다. 기존 표 변경 없음.
-- 익명 통계는 이 표를 서버가 모아 계산하며, 같은 일주·일간 20명 이상일 때만, 10명 미만 칸은 숨기고, 비율은 5% 단위로 반올림해 보여 준다.
-- 일주·일간·그날 십성은 기록할 때의 값을 함께 적어 둔다(나중에 일주를 다시 확인해도 지난 기록 통계가 흔들리지 않게). 탈퇴하면 함께 지워진다.

create table if not exists public.cm_logs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  mood       smallint not null check (mood between 1 and 5),
  tags       text[] not null default '{}',
  note       text check (note is null or char_length(note) <= 500),
  ilju       text,
  ilgan      text,
  ten_god    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists cm_logs_ilju_idx  on public.cm_logs (day, ilju);
create index if not exists cm_logs_ilgan_idx on public.cm_logs (day, ilgan);

alter table public.cm_logs enable row level security;
revoke all on public.cm_logs from anon, authenticated;

-- 되돌리기: drop table if exists public.cm_logs;
