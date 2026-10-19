-- Narrow, service-only CAS for reading blocks, budgets, and transient generation leases.
create or replace function public.reading_compare_and_swap(p_key text,p_expected text,p_next text,p_ttl integer default null)
returns boolean language plpgsql security invoker set search_path=pg_catalog as $$
declare current_value text; expiry timestamptz;
begin
 if p_key !~ '^(ik:blocks:(runtime|chapter:[A-Za-z0-9_.-]+(:history)?)|ai:flight:[a-f0-9]{64})$'
 or p_next is null or octet_length(p_next)>7500000 or (p_ttl is not null and (p_ttl<1 or p_ttl>604800)) then raise exception 'invalid reading state'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key,0));
 select value,expires_at into current_value,expiry from public.kv where key=p_key;
 if expiry is not null and expiry<=clock_timestamp() then current_value:=null; end if;
 if current_value is distinct from p_expected then return false; end if;
 insert into public.kv(key,value,expires_at,updated_at) values(p_key,p_next,case when p_ttl is null then null else clock_timestamp()+make_interval(secs=>p_ttl) end,clock_timestamp())
 on conflict(key) do update set value=excluded.value,expires_at=excluded.expires_at,updated_at=excluded.updated_at;
 return true;
end $$;
revoke all on function public.reading_compare_and_swap(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.reading_compare_and_swap(text,text,text,integer) to service_role;
