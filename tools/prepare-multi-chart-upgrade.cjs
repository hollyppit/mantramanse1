// Reversible copy-only upgrade with exact baseline/CAS guards and preserved synthetic cases.
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const dir='output/multi-chart-review-20261020',quote=x=>"'"+String(x).replace(/'/g,"''")+"'",ordered=x=>x.slice().sort((a,b)=>a.id.localeCompare(b.id,'en'));
(async()=>{
 global.window=globalThis;require('../report/v2/reading-catalog.js');
 const L=await import('../functions/_reviewed-library.js'),S=await import('../functions/_reading-library-seed.js'),oldS=await import('../output/multi-chart-review-20261020/baseline-functions/_reading-library-seed.js');
 const parse=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')),oldPack=parse('output/attached-chart-review-20261020/new-pack/library-pack.json'),roots=parse(dir+'/prior-coverage-charts.json'),matrix=parse(dir+'/matrix.json'),priorCases=new Map(parse(dir+'/prior-scenario-ids.json').map(r=>[r.chapter,r.ids]));
 const facts=sd=>({dayMaster:sd.dayMaster,strength:{band:sd.strength.band},groups:sd.groups,tenGods:sd.tenGods});
 const samples=new Map([...oldPack.samples,...roots.map((sd,i)=>({id:'flow-review-'+i,sd})),...matrix].map(s=>[s.id,s]));
 const hash=xs=>crypto.createHash('md5').update(xs.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map(p=>p.id+'\x1f'+p.text).join('\x1e')).digest('hex');
 const files=[],summary=[];fs.mkdirSync(dir+'/sql',{recursive:true});
 for(const c of MantraEditorial.defaults().chapters.filter(c=>c.topicId!=='creative')){
  const passages=S.seedPassages(c),baseline=oldS.seedPassages(c),all=[...samples.values()].map(s=>({...s,ids:L.selectPassages(passages,c,{claims:[]},s.sd).map(p=>p.id)})),byId=new Map(all.map(s=>[s.id,s])),original=priorCases.get(c.id);assert(original?.length);
  const chosen=original.map(id=>{assert(byId.has(id),'unknown baseline case '+id);return byId.get(id);}),covered=new Set(chosen.flatMap(s=>s.ids)),conditional=passages.filter(p=>Object.keys(p.when).length);
  while(conditional.some(p=>!covered.has(p.id))){const best=all.filter(s=>!chosen.includes(s)).sort((a,b)=>b.ids.filter(id=>!covered.has(id)).length-a.ids.filter(id=>!covered.has(id)).length)[0];assert(best&&best.ids.some(id=>!covered.has(id)),'missing positive');chosen.push(best);best.ids.forEach(id=>covered.add(id));}
  assert(chosen.length<=20,c.id+' needs '+chosen.length+' cases');for(const p of conditional)assert(chosen.some(s=>!s.ids.includes(p.id)),'missing counterexample '+p.id);
  const incoming={passages,cases:chosen.map(s=>({id:s.id,facts:facts(s.sd),indices:s.ids.map(id=>passages.findIndex(p=>p.id===id)),...(original.includes(s.id)?{}:{sd:s.sd})})),review:{at:new Date().toISOString(),actor:'codex-editorial',seedVersion:S.SEED_VERSION,engine:L.LIBRARY_VERSION,editorialReviewed:true,externalExpertApproved:false,scope:'traditional-conditional-guides-not-verified-biography',fullBooks:37*84,stemStrengthCombinations:30,profileInteractions:13,providerCalls:0}};
  const meta=baseline.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map(({text,...p})=>p),key='ik:blocks:chapter:library.'+c.id;
  const sql=`do $upgrade$ declare prior text; old jsonb; incoming jsonb:=${quote(JSON.stringify(incoming))}::jsonb; passages jsonb:=incoming->'passages'; cases jsonb:='[]'::jsonb; prior_case jsonb; matched jsonb; expected jsonb; forbidden jsonb; next jsonb; n int; begin
select value into prior from public.kv where key=${quote(key)} for update;old:=prior::jsonb;
if old->>'version' is distinct from '9' or old#>>'{review,seedVersion}' is distinct from 'coherent-bundles-84-20261020-9' then raise exception 'library changed';end if;
if old->'draft' is distinct from old->'published' then raise exception 'unpublished admin edits';end if;
if (select md5(string_agg((p->>'id')||chr(31)||(p->>'text'),chr(30) order by p->>'id')) from jsonb_array_elements(old->'published') p) is distinct from ${quote(hash(baseline))} then raise exception 'baseline text changed';end if;
if (select jsonb_agg(p-'text' order by p->>'id') from jsonb_array_elements(old->'published') p) is distinct from ${quote(JSON.stringify(meta))}::jsonb then raise exception 'baseline conditions changed';end if;
for prior_case in select value from jsonb_array_elements(old->'scenarios') loop
select u into matched from jsonb_array_elements(incoming->'cases') u where u->>'id'=prior_case->>'sampleId';if matched is null then raise exception 'missing original validation';end if;
if prior_case#>'{sd,dayMaster}' is distinct from matched#>'{facts,dayMaster}' or prior_case#>>'{sd,strength,band}' is distinct from matched#>>'{facts,strength,band}' or prior_case#>'{sd,groups}' is distinct from matched#>'{facts,groups}' or prior_case#>'{sd,tenGods}' is distinct from matched#>'{facts,tenGods}' then raise exception 'original calculation changed';end if;
select jsonb_agg(passages->(i::int)->>'id') into expected from jsonb_array_elements_text(matched->'indices') i;
select coalesce(jsonb_agg(p->>'id'),'[]'::jsonb) into forbidden from jsonb_array_elements(passages) p where p->'when'<>'{}'::jsonb and not expected ? (p->>'id');
cases:=cases||jsonb_build_array(prior_case||jsonb_build_object('expectedPassageIds',expected,'forbiddenPassageIds',forbidden));end loop;
for matched in select value from jsonb_array_elements(incoming->'cases') where value ? 'sd' loop
if matched#>'{sd,birth}' is not null or matched#>'{sd,name}' is not null then raise exception 'not anonymous';end if;
select jsonb_agg(passages->(i::int)->>'id') into expected from jsonb_array_elements_text(matched->'indices') i;
select coalesce(jsonb_agg(p->>'id'),'[]'::jsonb) into forbidden from jsonb_array_elements(passages) p where p->'when'<>'{}'::jsonb and not expected ? (p->>'id');
cases:=cases||jsonb_build_array(jsonb_build_object('sampleId',matched->>'id','sd',matched->'sd','expectedPassageIds',expected,'forbiddenPassageIds',forbidden));end loop;
if jsonb_array_length(cases)>20 then raise exception 'too many cases';end if;
if exists(select 1 from jsonb_array_elements(passages) p where p->'when'<>'{}'::jsonb and (not exists(select 1 from jsonb_array_elements(cases) s where (s->'expectedPassageIds') ? (p->>'id')) or not exists(select 1 from jsonb_array_elements(cases) s where (s->'forbiddenPassageIds') ? (p->>'id')))) then raise exception 'missing positive or counterexample';end if;
for n in 0..jsonb_array_length(old->'scenarios')-1 loop if cases#>array[n::text,'sd'] is distinct from old#>array['scenarios',n::text,'sd'] then raise exception 'original chart overwritten';end if;end loop;
next:=old||jsonb_build_object('version',10,'draft',passages,'published',passages,'scenarios',cases,'review',incoming->'review','updatedAt',clock_timestamp(),'history',jsonb_build_array(jsonb_build_object('version',9,'draft',old->'draft','published',old->'published','scenarios',old->'scenarios','review',old->'review','at',clock_timestamp()))||coalesce(old->'history','[]'::jsonb));
if not public.reading_compare_and_swap(${quote(key)},prior,next::text,null) then raise exception 'concurrent edit';end if;end $upgrade$;`;
  const file=c.id+'.sql';fs.writeFileSync(dir+'/sql/'+file,sql);files.push(file);summary.push({chapter:c.id,passages:passages.length,originalCases:original.length,cases:chosen.length,addedCases:chosen.filter(s=>!original.includes(s.id)).map(s=>s.id)});
 }
 fs.writeFileSync(dir+'/sql/index.json',JSON.stringify(files));fs.writeFileSync(dir+'/upgrade-plan.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({chapters:summary.length,totalPassages:summary.reduce((n,s)=>n+s.passages,96),maxCases:Math.max(...summary.map(s=>s.cases)),addedCases:summary.reduce((n,s)=>n+s.addedCases.length,0),preservedOriginalCharts:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
