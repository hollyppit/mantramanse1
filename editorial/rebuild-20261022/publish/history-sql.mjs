// SQL pieces that keep a chapter library's previous versions in its own key (<library key>:history),
// in the same document format as functions/_library-history.js (format library-history-2):
//   {format, entries:[{version, at, published, draft?, review?, scenariosRef}], scenarios:{ref: [...]}}
// The main row then holds only the current draft/published/scenarios and stays far below the 7.5MB CAS limit.
// Every piece runs inside a plpgsql block that declares HIST_DECL.
export const HISTORY_CAP = 15, HISTORY_MAX_BYTES = 7000000;
export const historyKeyOf = key => key + ':history';
export const HIST_DECL = `hprior text; hdoc jsonb; hent jsonb; href text; hsrc jsonb;`;
const EMPTY = `'{"format":"library-history-2","entries":[],"scenarios":{}}'::jsonb`;

// Load the history document (for update when writing) and fold any legacy inline history array of `old`.
export const loadHistory = (key, lock) => `select value into hprior from public.kv where key='${historyKeyOf(key)}'${lock ? ' for update' : ''};
hdoc:=case when hprior is null then ${EMPTY} when jsonb_typeof(hprior::jsonb)='array' then ${EMPTY} else hprior::jsonb end;
hsrc:=coalesce(case when hprior is not null and jsonb_typeof(hprior::jsonb)='array' then hprior::jsonb end,'[]'::jsonb)||coalesce(case when jsonb_typeof(old->'history')='array' then old->'history' end,'[]'::jsonb);
for hent in select x from jsonb_array_elements(hsrc) with ordinality t(x,n) order by n loop
 if not exists(select 1 from jsonb_array_elements(hdoc->'entries') y where y->'version'=hent->'version') then ${put('hent')}
 end if;
end loop;
`;
// Put one version state (jsonb with version, published, draft, scenarios, review, at) in front, replacing the same version.
export const put = e => `href:='m'||md5(coalesce(${e}->'scenarios','[]'::jsonb)::text);
 hdoc:=jsonb_set(hdoc,array['scenarios',href],coalesce(${e}->'scenarios','[]'::jsonb));
 hdoc:=jsonb_set(hdoc,'{entries}',jsonb_build_array(jsonb_build_object('version',${e}->'version','at',coalesce(${e}->'at','null'::jsonb),'published',coalesce(${e}->'published','[]'::jsonb),'scenariosRef',href)
  ||case when ${e} ? 'review' then jsonb_build_object('review',${e}->'review') else '{}'::jsonb end
  ||case when ${e}->'draft' is not null and ${e}->'draft' is distinct from coalesce(${e}->'published','[]'::jsonb) then jsonb_build_object('draft',${e}->'draft') else '{}'::jsonb end)
  ||(select coalesce(jsonb_agg(y order by n),'[]'::jsonb) from jsonb_array_elements(hdoc->'entries') with ordinality t(y,n) where y->'version' is distinct from ${e}->'version'));`;
// Newest first, at most HISTORY_CAP entries, drop unreferenced scenario sets, then drop oldest entries while over the byte budget.
export const finishHistory = () => `hdoc:=jsonb_set(hdoc,'{entries}',(select coalesce(jsonb_agg(y order by (y->>'version')::int desc),'[]'::jsonb) from (select y from jsonb_array_elements(hdoc->'entries') y order by (y->>'version')::int desc limit ${HISTORY_CAP}) s));
loop
 hdoc:=jsonb_set(hdoc,'{scenarios}',(select coalesce(jsonb_object_agg(sk,sv),'{}'::jsonb) from jsonb_each(hdoc->'scenarios') se(sk,sv) where exists(select 1 from jsonb_array_elements(hdoc->'entries') y where y->>'scenariosRef'=sk)));
 exit when octet_length(hdoc::text)<=${HISTORY_MAX_BYTES} or jsonb_array_length(hdoc->'entries')<=1;
 hdoc:=jsonb_set(hdoc,'{entries}',(hdoc->'entries')-(jsonb_array_length(hdoc->'entries')-1));
end loop;
`;
// Expand an entry back to {published, draft, scenarios, review}.
export const entryScenarios = e => `coalesce(hdoc->'scenarios'->(${e}->>'scenariosRef'),'[]'::jsonb)`;
export const entryDraft = e => `coalesce(${e}->'draft',${e}->'published')`;
// Write the history first, then the main row without any inline history.
export const writeBoth = key => `if not public.reading_compare_and_swap('${historyKeyOf(key)}',hprior,hdoc::text,null) then raise exception 'concurrent history edit';end if;
if not public.reading_compare_and_swap('${key}',prior,next::text,null) then raise exception 'concurrent edit';end if;`;
