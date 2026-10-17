-- Additive; execute only after deployment approval. Does not rewrite any existing row.
-- Atomic CAS is restricted to the NEW research runtime key, never original IK/SRC.
create or replace function public.rag_compare_and_swap(p_expected text, p_next text)
-- service_role already has the required table rights. Do not borrow the owner's privileges.
returns boolean language plpgsql security invoker set search_path = pg_catalog as $$
declare n integer;
begin
  if p_next is null or octet_length(p_next) > 8000000 then
    raise exception 'invalid research state';
  end if;
  if p_expected is null then
    insert into public.kv(key,value) values ('ik:agentic:runtime',p_next)
      on conflict (key) do nothing;
  else
    update public.kv set value=p_next, updated_at=clock_timestamp()
      where key='ik:agentic:runtime' and value=p_expected;
  end if;
  get diagnostics n = row_count;
  return n=1;
end $$;
revoke all on function public.rag_compare_and_swap(text,text) from public, anon, authenticated;
grant execute on function public.rag_compare_and_swap(text,text) to service_role;
