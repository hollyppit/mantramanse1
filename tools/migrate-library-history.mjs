// Prepares the one-time move of each chapter library's inline `history` array into its own key
// (ik:blocks:chapter:library.<chapter>:history, format library-history-2 — see functions/_library-history.js).
// The current draft/published/scenarios are not touched, so the public projection (reading_published) stays identical.
//   node tools/migrate-library-history.mjs prepare             writes output/library-history-split-20261107/sql/{dry,apply,rollback}/<chapter>.sql and verify.sql
//   node tools/migrate-library-history.mjs run dry [chapter…]   read-only, needs SUPABASE_ACCESS_TOKEN (never paste it into chat)
//   node tools/migrate-library-history.mjs run apply [chapter…] writes; asks for typed "apply" first; stops at the first error
//   node tools/migrate-library-history.mjs run verify           read-only summary after the move
//   dry      : read-only; computes the split and raises DRYRUN-OK with the resulting sizes.
//   apply    : writes the history key first, then the main row without `history` (both via reading_compare_and_swap).
//   rollback : puts the expanded history back inline and deletes nothing (the history key is left; the API folds both).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {HIST_DECL,loadHistory,finishHistory,writeBoth,historyKeyOf} from '../editorial/rebuild-20261022/publish/history-sql.mjs';

const TOPICS={self:37,wealth:15,career:15,love:15,health:10,creative:8,remedy:8};
export const CHAPTERS=Object.entries(TOPICS).flatMap(([t,n])=>Array.from({length:n},(_,i)=>`timeline_${t}_${String(i+1).padStart(2,'0')}`)).filter(c=>c!=='timeline_self_23');
const HASH_SQL=x=>`(select md5(string_agg((p->>'id')||chr(31)||(p->>'text'),chr(30) order by (p->>'id') collate "C")) from jsonb_array_elements(${x}) p)`;

export function migrateSql(chapter,mode){
 const key='ik:blocks:chapter:library.'+chapter,lock=mode==='apply';
 const head=`-- ${chapter}: ${mode==='apply'?'APPLY':'READ-ONLY DRY RUN'} move inline history to ${historyKeyOf(key)}. Current draft/published/scenarios unchanged.
do $mig$ declare prior text; old jsonb; next jsonb; n_before int; ${HIST_DECL}
begin
select value into prior from public.kv where key='${key}'${lock?' for update':''};
if prior is null then raise notice 'SKIP % (no library row)','${chapter}';return;end if;
old:=prior::jsonb;
if not (old ? 'history') then raise notice 'SKIP % (already split)','${chapter}';return;end if;
n_before:=coalesce(jsonb_array_length(case when jsonb_typeof(old->'history')='array' then old->'history' end),0);
${loadHistory(key,lock)}${finishHistory()}next:=old-'history';
if next->'published' is distinct from old->'published' or next->'draft' is distinct from old->'draft' or next->'version' is distinct from old->'version' then raise exception 'current state changed';end if;
`;
 if(mode==='dry')return head+`raise exception 'DRYRUN-OK % history % -> % entries, row % -> % bytes, history key % bytes',${"'"+chapter+"'"},n_before,jsonb_array_length(hdoc->'entries'),octet_length(prior),octet_length(next::text),octet_length(hdoc::text);
end $mig$;
`;
 return head+`${writeBoth(key)}
end $mig$;
`;
}
export function rollbackSql(chapter){
 const key='ik:blocks:chapter:library.'+chapter;
 return `-- ${chapter}: ROLLBACK the history split (expanded history back inline). Refuses when the row would exceed 7,500,000 bytes.
do $rb$ declare prior text; old jsonb; next jsonb; h jsonb;
begin
select value into prior from public.kv where key='${key}' for update;
if prior is null then raise exception 'library missing';end if;
old:=prior::jsonb;
if old ? 'history' then raise notice 'SKIP % (history already inline)','${chapter}';return;end if;
select value::jsonb into h from public.kv where key='${historyKeyOf(key)}';
if h is null then raise exception 'history key missing';end if;
next:=old||jsonb_build_object('history',(select coalesce(jsonb_agg(jsonb_build_object('version',e->'version','at',e->'at','published',e->'published','draft',coalesce(e->'draft',e->'published'),'scenarios',coalesce(h->'scenarios'->(e->>'scenariosRef'),'[]'::jsonb))||case when e ? 'review' then jsonb_build_object('review',e->'review') else '{}'::jsonb end order by n),'[]'::jsonb) from jsonb_array_elements(h->'entries') with ordinality t(e,n)));
if octet_length(next::text)>7500000 then raise exception 'row would exceed the limit: % bytes',octet_length(next::text);end if;
if not public.reading_compare_and_swap('${key}',prior,next::text,null) then raise exception 'concurrent edit';end if;
end $rb$;
`;
}
// Read-only: every main row has no inline history, the projection equals published, and each history key parses.
export const VERIFY_SQL=`select count(*) rows_total,
 count(*) filter (where not (m.value::jsonb ? 'history')) split,
 count(*) filter (where m.reading_published->'published'=m.value::jsonb->'published' and (m.reading_published->>'version')::int=(m.value::jsonb->>'version')::int) projection_ok,
 count(h.key) history_keys,
 count(*) filter (where h.value::jsonb->>'format'='library-history-2') history_format_ok,
 max(octet_length(m.value)) max_row_bytes, max(octet_length(h.value)) max_history_bytes,
 min(jsonb_array_length(h.value::jsonb->'entries')) min_entries, max(jsonb_array_length(h.value::jsonb->'entries')) max_entries,
 md5(string_agg(substring(m.key from 'library\\.(.*)$')||':'||${HASH_SQL("m.value::jsonb->'published'")},',' order by m.key)) published_digest
from public.kv m left join public.kv h on h.key=m.key||':history'
where m.key ~ '^ik:blocks:chapter:library\\.timeline_(self|wealth|career|love|health|creative|remedy)_[0-9]{2}$';`;

const OUT='output/library-history-split-20261107';
async function query(sql){
 const token=process.env.SUPABASE_ACCESS_TOKEN;if(!token)throw Error('SUPABASE_ACCESS_TOKEN is not set');
 const r=await fetch('https://api.supabase.com/v1/projects/devkslhggrkqtianjamj/database/query',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});
 return {status:r.status,text:await r.text()};
}
const isMain=!!process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
 const [cmd='prepare',mode,...names]=process.argv.slice(2);
 if(cmd==='prepare'){
  for(const d of ['sql/dry','sql/apply','sql/rollback'])fs.mkdirSync(path.join(OUT,d),{recursive:true});
  for(const c of CHAPTERS){fs.writeFileSync(path.join(OUT,'sql/dry',c+'.sql'),migrateSql(c,'dry'));fs.writeFileSync(path.join(OUT,'sql/apply',c+'.sql'),migrateSql(c,'apply'));fs.writeFileSync(path.join(OUT,'sql/rollback',c+'.sql'),rollbackSql(c));}
  fs.writeFileSync(path.join(OUT,'verify.sql'),VERIFY_SQL);
  console.log(JSON.stringify({out:OUT,chapters:CHAPTERS.length}));
 }else if(cmd==='run'&&mode==='verify'){const r=await query(VERIFY_SQL);console.log(r.status,r.text);}
 else if(cmd==='run'&&['dry','apply'].includes(mode)){
  const list=names.length?names:CHAPTERS,log=path.join(OUT,mode+'.log');
  if(mode==='apply'){const rl=(await import('node:readline/promises')).createInterface({input:process.stdin,output:process.stdout});const a=await rl.question(`WRITE to production: split history of ${list.length} chapters? type "apply": `);rl.close();if(a.trim()!=='apply'){console.log('cancelled');process.exit(0);}}
  let ok=0,skip=0;
  for(const c of list){
   const r=await query(migrateSql(c,mode)),msg=(r.text.match(/(DRYRUN-OK[^"\\]*|SKIP[^"\\]*)/)||[''])[0];
   const good=mode==='dry'?/DRYRUN-OK|SKIP/.test(r.text):r.status<300;
   const line=`${good?'ok  ':'FAIL'} ${c} ${good?(msg||'applied'):r.status+' '+r.text.slice(0,300)}`;console.log(line);fs.appendFileSync(log,new Date().toISOString()+' '+line+'\n');
   if(!good)process.exit(1);if(/SKIP/.test(msg))skip++;else ok++;
  }
  console.log(JSON.stringify({mode,ok,skip}));
 }else{console.error('usage: node tools/migrate-library-history.mjs prepare | run dry|apply|verify [chapter…]');process.exit(1);}
}
