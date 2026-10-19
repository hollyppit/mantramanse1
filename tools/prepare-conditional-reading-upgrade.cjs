// Offline preparation only. Review generated SQL before executing with a privileged database tool.
const fs=require('fs'),path=require('path');
(async()=>{
 const {build}=require('./build-complete-reading-library.cjs'),pack=await build(),dir=process.argv[2]||'output/conditional76-20261020/sql';fs.mkdirSync(dir,{recursive:true});
 const quote=s=>"'"+s.replace(/'/g,"''")+"'",files=[];
 for(const l of pack.libraries.filter(l=>l.passages.some(p=>p.id.startsWith('condition-')))){
  const additions=l.passages.filter(p=>p.id.startsWith('condition-'));
  for(const p of additions){if(!l.scenarios.some(s=>s.expectedPassageIds.includes(p.id))||!l.scenarios.some(s=>s.forbiddenPassageIds.includes(p.id)))throw Error('Missing positive/counterexample '+p.id);}
  const payload={additions,scenarios:l.scenarios,review:l.review},key='ik:blocks:chapter:library.'+l.chapter;
  const sql=`do $upgrade$ declare prior text; old jsonb; next jsonb; incoming jsonb := ${quote(JSON.stringify(payload))}::jsonb; begin
select value into prior from public.kv where key=${quote(key)};
if prior is null then raise exception 'library missing'; end if; old:=prior::jsonb;
if (old->>'version')::int<>1 or old->'review'->>'seedVersion'<>'complete-84-20261020-1' or jsonb_array_length(old->'published')<>8 or old->'draft'<>old->'published' then raise exception 'library changed; review required'; end if;
if exists(select 1 from jsonb_array_elements(old->'published') p where p->>'kind'<>'guide' or p->'when'<>'{}'::jsonb) then raise exception 'unexpected existing copy'; end if;
next:=old||jsonb_build_object('version',2,'draft',(old->'draft')||(incoming->'additions'),'published',(old->'published')||(incoming->'additions'),'scenarios',incoming->'scenarios','review',incoming->'review','updatedAt',clock_timestamp(),'history',jsonb_build_array(jsonb_build_object('version',1,'draft',old->'draft','published',old->'published','scenarios',old->'scenarios','review',old->'review','at',clock_timestamp()))||coalesce(old->'history','[]'::jsonb));
if not public.reading_compare_and_swap(${quote(key)},prior,next::text,null) then raise exception 'concurrent edit'; end if;
end $upgrade$;
select ${quote(l.chapter)} as chapter,2 as version,24 as added;
`;
  const file=l.chapter+'.sql';fs.writeFileSync(path.join(dir,file),sql);files.push(file);
 }
 fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify(files));console.log(JSON.stringify({chapters:files.length,additions:files.length*24,allConditionsHavePositiveAndCounterexamples:true,filesOnly:true}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
