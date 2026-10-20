-- Read-only service projections. JSON (not JSONB) preserves original record key order for existing RAG hashes.
create or replace function public.reading_knowledge_records(p_ids text[])
returns json language sql stable security invoker set search_path = '' as $$
 with domain_keys(key) as (values ('ik:d:SELF'),('ik:d:MONEY'),('ik:d:CAREER'),('ik:d:LOVE'),('ik:d:MARRIAGE'),('ik:d:RELATIONSHIP'),('ik:d:TIMING'),('ik:d:ACTION')),
 records as materialized (
   select k.key,k.value,k.expires_at from public.kv k join domain_keys d on d.key=k.key
 ), items as (
   select item from records r cross join lateral json_array_elements(
     case when r.value is not null and (r.expires_at is null or r.expires_at>now()) and json_typeof(r.value::json)='array' then r.value::json else '[]'::json end
   ) item where cardinality(p_ids)<=1000 and item->>'id'=any(p_ids)
 )
 select json_build_object('items',coalesce((select json_agg(item) from items),'[]'::json),
 'missingDomains',coalesce((select json_agg(d.key) from domain_keys d where not exists(select 1 from records r where r.key=d.key)),'[]'::json));
$$;
create or replace function public.reading_research_state()
returns json language sql stable security invoker set search_path = '' as $$
 with original as materialized(select value,expires_at from public.kv where key='ik:agentic:runtime'),
 snapshot as materialized(select value::json as d from original where value is not null and (expires_at is null or expires_at>now()))
 select json_build_object('present',exists(select 1 from original),'state',(
 select json_build_object('schema',d->'schema','revision',d->'revision','indexVersion',d->'indexVersion','config',d->'config','active',d->'active','candidates',coalesce((
   select json_object_agg(a.value#>>'{}',json_build_object('id',c->'id','knowledgeId',c->'knowledgeId','publication',c->'publication','baseHash',c->'baseHash','next',c->'next','source',c->'source','sources',c->'sources',
   'previous',case when json_typeof(c->'previous')='object' then json_build_object('status',c#>'{previous,status}','reviewed',c#>'{previous,reviewed}','domain',c#>'{previous,domain}') else 'null'::json end))
   from json_each(d->'active') a cross join lateral (select d->'candidates'->(a.value#>>'{}') as c) selected where c is not null
 ),'{}'::json)) from snapshot));
$$;
revoke execute on function public.reading_knowledge_records(text[]) from public,anon,authenticated;
revoke execute on function public.reading_research_state() from public,anon,authenticated;
grant execute on function public.reading_knowledge_records(text[]) to service_role;
grant execute on function public.reading_research_state() to service_role;
