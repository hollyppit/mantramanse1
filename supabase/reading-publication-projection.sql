-- Precompute only the publication. Preserve raw library text, history, drafts and timestamps.
alter table public.kv add column if not exists reading_published jsonb;
create or replace function public.reading_refresh_publication()
returns trigger language plpgsql security invoker set search_path='' as $fn$
declare doc jsonb;
begin
 if new.key ~ '^ik:blocks:chapter:library\.timeline_(self|wealth|career|love|health|creative|remedy)_[0-9]{2}$' then
  doc:=coalesce(new.value::jsonb,'{}'::jsonb);
  new.reading_published:=jsonb_build_object('version',coalesce((doc->>'version')::integer,0),'published',coalesce(doc->'published','[]'::jsonb));
 else new.reading_published:=null;
 end if;
 return new;
end $fn$;
revoke all on function public.reading_refresh_publication() from public,anon,authenticated;
create or replace trigger reading_publication_projection before insert or update on public.kv for each row execute function public.reading_refresh_publication();
update public.kv set value=value where key ~ '^ik:blocks:chapter:library\.timeline_(self|wealth|career|love|health|creative|remedy)_[0-9]{2}$';
create or replace function public.reading_published_library(p_chapter text)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select case when value is null or (expires_at is not null and expires_at<=now()) then jsonb_build_object('version',0,'published','[]'::jsonb)
 else reading_published end from public.kv
 where p_chapter ~ '^timeline_(self|wealth|career|love|health|creative|remedy)_[0-9]{2}$' and key='ik:blocks:chapter:library.'||p_chapter;
$fn$;
revoke all on function public.reading_published_library(text) from public,anon,authenticated;
grant execute on function public.reading_published_library(text) to service_role;
