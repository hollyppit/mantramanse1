-- 9단계 운영 DB 보안 점검(읽기만). Supabase SQL 편집기 또는 관리 도구로 실행한다. 한 줄 = 한 점검, problems 가 0 이어야 정상.
-- 짝: tools/security-audit.cjs(코드·마이그레이션 정적 점검)
with
pub as (select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
-- 1) RLS 가 꺼진 public 표
no_rls as (select p.relname from pub p join pg_class c on c.oid = p.oid where not c.relrowsecurity),
-- 2) 브라우저 역할(anon·authenticated)에 권한이 남아 있는 커뮤니티·회원·결제 표
granted as (
  select distinct table_name from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
    and (table_name like 'cm\_%' or table_name in ('member_profiles','member_consents','consent_events','consent_documents','community_access','launch_alerts','admin_audit_log','admin_staff','adult_verifications','commerce_orders','commerce_entitlements','member_sajus','support_inquiries'))),
-- 3) 커뮤니티 표에 걸린 RLS 정책(서버 전용 설계라 없어야 한다)
pol as (select tablename from pg_policies where schemaname = 'public' and (tablename like 'cm\_%' or tablename in ('member_profiles','member_consents','community_access','admin_staff','adult_verifications'))),
-- 4) public 의 security definer 함수 중 search_path 를 고정하지 않은 것
defs as (select p.oid, p.proname, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef),
no_path as (select proname from defs where not exists (select 1 from unnest(coalesce(proconfig, '{}')) x where x like 'search_path=%')),
-- 5) security definer 함수 중 anon·authenticated 가 실행할 수 있는 것
anon_exec as (select proname from defs where has_function_privilege('anon', oid, 'execute') or has_function_privilege('authenticated', oid, 'execute'))
select '1 RLS 꺼진 표' as check, count(*) as problems, coalesce(string_agg(relname, ', '), '') as items from no_rls
union all select '2 브라우저 역할 권한이 남은 표', count(*), coalesce(string_agg(table_name, ', '), '') from granted
union all select '3 커뮤니티 표 RLS 정책', count(*), coalesce(string_agg(tablename, ', '), '') from pol
union all select '4 search_path 고정 안 된 definer 함수', count(*), coalesce(string_agg(proname, ', '), '') from no_path
union all select '5 브라우저 역할이 실행 가능한 definer 함수', count(*), coalesce(string_agg(proname, ', '), '') from anon_exec
union all select '6 자동 파기 예약(대화 90일·이용 기록 13개월)', 2 - count(*), coalesce(string_agg(jobname || ' ' || schedule, ', '), '') from cron.job where jobname in ('cm-purge-chats', 'cm-purge-activity');
