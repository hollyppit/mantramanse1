-- Public reading needs one contract, not every chapter and administrator case.
-- Read current storage on each request; do not cache publication/withdrawal state.
create or replace function public.reading_editorial_contract(p_id text,p_base text default null,p_title text default null)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 with original as materialized(select value,expires_at from public.kv where key='ik:editorial:published'),
 snapshot as materialized(select value::jsonb d from original where value is not null and (expires_at is null or expires_at>now()))
 select jsonb_build_object('present',exists(select 1 from original),'catalog',(
  select d||jsonb_build_object('chapters',coalesce((select jsonb_agg(c order by ord)
   from jsonb_array_elements(d->'chapters')with ordinality x(c,ord)
   where c->>'id'=p_id or coalesce(c->'legacyIds','[]'::jsonb)?p_id
    or coalesce(c->'legacyIds','[]'::jsonb)?p_base or c->>'title'=p_title),'[]'::jsonb),'cases','[]'::jsonb)
  from snapshot));
$fn$;
revoke all on function public.reading_editorial_contract(text,text,text) from public,anon,authenticated;
grant execute on function public.reading_editorial_contract(text,text,text) to service_role;
