-- 보안 3차(2026-11-26): ① 탈퇴해도 제재·차단이 풀리지 않게(본인인증 CI 해시 기준 보존) ② 횟수 제한을 DB 에서 한 번에 세기(동시 요청으로 한도 넘기기 막기)
-- 원칙(1~9단계와 같음): RLS 켬·정책 없음·anon/authenticated 권한 회수 → 서버(service_role)만 쓴다. 기존 표 구조는 바꾸지 않는다.
-- 다시 적용해도 같은 결과(create if not exists · create or replace · 예약 이름 교체).

-- ① 탈퇴 전 제재·차단 보존 ------------------------------------------------------------
-- 왜: 회원을 지우면 cm_sanctions·cm_blocks·adult_verifications 가 함께 지워져(on delete cascade), 정지된 사람이 탈퇴 → 재가입 → 본인인증만 다시 하면
--     정지·차단이 모두 풀렸다. 이제 본인인증한 회원이 지워질 때 남아 있는 정지(mute·ban)와 '남이 이 사람을 막은 차단'을 CI 해시로 잠깐 보관하고,
--     같은 CI 로 다시 본인인증하면 새 계정에 그대로 다시 건다. CI 원문·이름·연락처는 저장하지 않는다(해시만, 기존 adult_verifications 와 같은 값).
-- 보관 기간: 기간 정지는 그 기간 끝까지, 무기한 정지·차단은 3년. 지난 것은 매시간 지운다(아래 sec_purge).
-- 한계: 본인인증을 하지 않은 회원은 CI 가 없어 보존할 수 없다(광장 글쓰기는 본인인증을 요구하지 않음).
create table if not exists public.cm_ci_holds (
  id          bigserial primary key,
  ci_hash     text not null,
  kind        text not null check (kind in ('mute','ban','block')),
  blocker_id  uuid references auth.users(id) on delete cascade,   -- kind='block' 일 때 막은 사람(그 사람이 탈퇴하면 보관도 지워짐)
  reason      text,
  until       timestamptz,
  by_actor    text,
  held_at     timestamptz not null default now(),
  expires_at  timestamptz not null,
  check ((kind = 'block') = (blocker_id is not null))
);
create index if not exists cm_ci_holds_ci_idx on public.cm_ci_holds (ci_hash);
create index if not exists cm_ci_holds_exp_idx on public.cm_ci_holds (expires_at);
alter table public.cm_ci_holds enable row level security;
revoke all on public.cm_ci_holds from anon, authenticated;
revoke all on public.cm_ci_holds from public;
grant all on public.cm_ci_holds to service_role;
grant usage, select on sequence public.cm_ci_holds_id_seq to service_role;

-- 회원 행이 지워지기 직전(cascade 전)에 보관한다. 직접 탈퇴·카카오 연결 해제·관리자 화면 삭제 모두 여기를 지난다.
-- 보관이 실패해도 탈퇴는 막지 않는다(탈퇴는 회원의 권리) — 경고만 남긴다.
create or replace function public.cm_hold_on_user_delete() returns trigger
language plpgsql security definer set search_path = public as $$
declare h text;
begin
  begin
    select ci_hash into h from public.adult_verifications where user_id = old.id;
    if h is not null then
      insert into public.cm_ci_holds (ci_hash, kind, reason, until, by_actor, expires_at)
      select h, s.kind, s.reason, s.until, s.by_actor, coalesce(s.until, now() + interval '3 years')
        from public.cm_sanctions s
       where s.user_id = old.id and s.lifted_at is null and s.kind in ('mute','ban') and (s.until is null or s.until > now());
      insert into public.cm_ci_holds (ci_hash, kind, blocker_id, expires_at)
      select h, 'block', b.blocker_id, now() + interval '3 years'
        from public.cm_blocks b where b.blocked_id = old.id;
    end if;
  exception when others then
    raise warning 'cm_hold_on_user_delete failed: %', sqlerrm;
  end;
  return old;
end $$;
revoke all on function public.cm_hold_on_user_delete() from public, anon, authenticated;
drop trigger if exists cm_hold_on_user_delete on auth.users;
create trigger cm_hold_on_user_delete before delete on auth.users for each row execute function public.cm_hold_on_user_delete();

-- 같은 CI 로 다시 본인인증하면(새 계정) 보관한 정지·차단을 새 계정에 다시 건다 → 보관 행은 지운다(다시 탈퇴하면 위 트리거가 다시 보관).
-- 이 단계가 실패하면 본인인증 저장도 함께 실패한다(정지가 빠진 채 인증되지 않게).
create or replace function public.cm_restore_by_ci() returns trigger
language plpgsql security definer set search_path = public as $$
declare n_s int := 0; n_b int := 0;
begin
  if new.ci_hash is null then return new; end if;
  insert into public.cm_sanctions (user_id, kind, reason, until, by_actor)
  select new.user_id, h.kind, left(coalesce(h.reason, '탈퇴 전 제재'), 200), h.until, coalesce(h.by_actor, '자동') || ' · 탈퇴 전 제재 이어짐'
    from public.cm_ci_holds h
   where h.ci_hash = new.ci_hash and h.kind in ('mute','ban') and (h.until is null or h.until > now());
  get diagnostics n_s = row_count;
  insert into public.cm_blocks (blocker_id, blocked_id)
  select h.blocker_id, new.user_id from public.cm_ci_holds h
   where h.ci_hash = new.ci_hash and h.kind = 'block' and h.blocker_id <> new.user_id
  on conflict do nothing;
  get diagnostics n_b = row_count;
  delete from public.cm_ci_holds where ci_hash = new.ci_hash;
  if n_s + n_b > 0 then
    insert into public.admin_audit_log (actor, action, target, detail)
    values ('자동', 'community.ci.restore', new.user_id::text, jsonb_build_object('sanctions', n_s, 'blocks', n_b));
  end if;
  return new;
end $$;
revoke all on function public.cm_restore_by_ci() from public, anon, authenticated;
drop trigger if exists cm_restore_by_ci on public.adult_verifications;
create trigger cm_restore_by_ci after insert or update of ci_hash on public.adult_verifications
  for each row execute function public.cm_restore_by_ci();

-- ② 원자적 횟수 제한 ------------------------------------------------------------------
-- 왜: KV 는 '읽고 → 더해서 쓰기'라 동시에 들어온 요청이 같은 숫자를 읽고 한 번만 센다(관리자 비밀번호 대입을 한꺼번에 보내면 20번 제한이 1번으로 셈,
--     AI 깊이 읽기 하루 횟수도 동시에 누르면 넘음). DB 한 문장(insert … on conflict … returning)으로 세면 동시에 와도 정확히 센다.
-- 키에는 기간(날짜·시각)이 이미 들어 있다(예: cm:rate:idv:<회원>:2026-11-26). 값은 숫자뿐 — IP 는 서버에서 해시한 값만 넣는다.
create unlogged table if not exists public.rate_counters (
  key        text primary key check (char_length(key) <= 200),
  n          integer not null default 0,
  expires_at timestamptz not null
);
create index if not exists rate_counters_exp_idx on public.rate_counters (expires_at);
alter table public.rate_counters enable row level security;
revoke all on public.rate_counters from anon, authenticated;
revoke all on public.rate_counters from public;
grant all on public.rate_counters to service_role;

-- 더하기(빼기도 됨, 0 아래로는 안 내려감) → 더한 뒤 숫자
create or replace function public.rate_add(p_key text, p_add integer, p_ttl integer)
returns integer language sql security definer set search_path = public as $$
  insert into public.rate_counters as c (key, n, expires_at)
  values (p_key, greatest(p_add, 0), now() + make_interval(secs => greatest(p_ttl, 1)))
  on conflict (key) do update set n = greatest(0, c.n + p_add), expires_at = greatest(c.expires_at, excluded.expires_at)
  returning n;
$$;
-- 여러 키를 한꺼번에 1씩 올리되, 하나라도 한도를 넘으면 모두 되돌린다. 반환 0 = 통과, k = k번째 키(1부터)가 한도에 걸림
create or replace function public.rate_reserve(p_keys text[], p_max integer[], p_ttl integer)
returns integer language plpgsql security definer set search_path = public as $$
declare i int; v int; hit int := 0;
begin
  if p_keys is null or array_length(p_keys, 1) is null or array_length(p_keys, 1) <> array_length(p_max, 1) or array_length(p_keys, 1) > 8 then
    raise exception 'rate_reserve: bad arguments';
  end if;
  begin
    for i in 1 .. array_length(p_keys, 1) loop
      v := public.rate_add(p_keys[i], 1, p_ttl);
      if v > p_max[i] then hit := i; raise exception 'rate-limit'; end if;
    end loop;
  exception when raise_exception then
    if hit = 0 then raise; end if;   -- 한도가 아닌 다른 오류는 그대로
  end;
  return hit;
end $$;
revoke all on function public.rate_add(text, integer, integer) from public, anon, authenticated;
revoke all on function public.rate_reserve(text[], integer[], integer) from public, anon, authenticated;
grant execute on function public.rate_add(text, integer, integer) to service_role;
grant execute on function public.rate_reserve(text[], integer[], integer) to service_role;

-- ③ 매시간 정리: 지난 횟수·지난 보관 기록 지우기 -------------------------------------------
create or replace function public.sec_purge() returns jsonb
language plpgsql security definer set search_path = public as $$
declare n_r int := 0; n_h int := 0;
begin
  delete from public.rate_counters where expires_at < now(); get diagnostics n_r = row_count;
  delete from public.cm_ci_holds where expires_at < now(); get diagnostics n_h = row_count;
  return jsonb_build_object('rate', n_r, 'holds', n_h);
end $$;
revoke all on function public.sec_purge() from public, anon, authenticated;
grant execute on function public.sec_purge() to service_role;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'sec-purge';
select cron.schedule('sec-purge', '7 * * * *', 'select public.sec_purge()');
