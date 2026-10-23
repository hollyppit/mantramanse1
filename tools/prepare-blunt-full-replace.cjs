// Full-library replacement SQL (+ rollback SQL) for the plain-spoken reading copy, one file per chapter.
//   node tools/prepare-blunt-full-replace.cjs [--only timeline_self_01,timeline_self_02]
// Baseline dumps (git archive <commit> functions report/v2 -> node tools/dump-seed-passages.cjs <dir> <out>)
// live in output/blunt-copy-20261021/baseline-dumps/dump_<commit>.json. The guard accepts a published
// library only if its text hash matches one of those seed versions, so administrator edits are never overwritten.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
const out='output/blunt-copy-20261021',dumpDir=out+'/baseline-dumps',quote=x=>"'"+String(x).replace(/'/g,"''")+"'";
const only=process.argv.includes('--only')?process.argv[process.argv.indexOf('--only')+1].split(','):null;
global.window=globalThis;for(const f of ['engine.js','report/v2/saju-data.js','report/v2/reading-catalog.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const md5=x=>crypto.createHash('md5').update(x).digest('hex'),byId=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0,hash=xs=>crypto.createHash('md5').update(xs.slice().sort(byId).map(p=>p.id+'\x1f'+p.text).join('\x1e')).digest('hex');
const parse=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^﻿/,''));
const strip=sd=>{sd=structuredClone(sd);for(const k of ['birth','name','ziwei','calculationProvenance'])delete sd[k];return sd;};
(async()=>{
 const L=await import('../functions/_reviewed-library.js'),S=await import('../functions/_reading-library-seed.js');
 const oldPack=parse('output/attached-chart-review-20261020/new-pack/library-pack.json'),roots=parse('output/multi-chart-review-20261020/prior-coverage-charts.json'),matrix=parse('output/multi-chart-review-20261020/matrix.json'),batch=parse('output/batch-adjustment-audit-20261021/samples.json');
 const pool=new Map([...oldPack.samples,...roots.map((sd,i)=>({id:'flow-review-'+i,sd})),...matrix].map(s=>[s.id,{id:s.id,sd:strip(s.sd)}]));
 const fallback=batch.map(s=>({id:'batch-'+s.id,sd:strip(s.sd.off||s.sd)}));
 const dumps=fs.readdirSync(dumpDir).filter(f=>/^dump_.*\.json$/.test(f)).map(f=>parse(dumpDir+'/'+f));
 const catalog=MantraEditorial.defaults().chapters.filter(c=>c.topicId!=='creative'),targets=catalog.filter(c=>!only||only.includes(c.id));
 let engineN=0;const engineCharts=function*(){for(let n=0;n<60000;n++){engineN=n;yield {id:'engine-'+n,sd:strip(ReportV2.SajuData.build(Manse.compute({year:1940+n%85,month:1+Math.floor(n/85)%12,day:1+Math.floor(n/1020)%28,hour:n%11===0?null:n%24,minute:0,gender:n%2?'F':'M',calendar:'solar',city:'서울'}),{now:Date.UTC(2026,9,20)}))};}};
 for(const d of ['sql','rollback'])fs.mkdirSync(out+'/full/'+d,{recursive:true});
 const files=[],plan=[];
 for(const c of targets){
  const passages=S.seedPassages(c);assert.deepEqual(L.validatePassages(passages,c,[]),[],c.id);
  const conditional=passages.filter(p=>Object.keys(p.when).length),idsOf=s=>L.selectPassages(passages,c,{claims:[]},s.sd).map(p=>p.id);
  const cands=[...pool.values()].map(s=>({...s,ids:idsOf(s),size:JSON.stringify(s.sd).length})),covered=()=>new Set(cands.flatMap(s=>s.ids));
  const add=s=>{const ids=idsOf(s);cands.push({...s,ids,size:JSON.stringify(s.sd).length});};
  if(conditional.some(p=>!covered().has(p.id)))fallback.forEach(add);
  if(conditional.some(p=>!covered().has(p.id))){const gen=engineCharts();for(const s of gen){const ids=idsOf(s);if(ids.some(id=>!covered().has(id)&&conditional.some(p=>p.id===id)))cands.push({...s,ids,size:JSON.stringify(s.sd).length});if(conditional.every(p=>covered().has(p.id)))break;}}
  const missing=conditional.filter(p=>!covered().has(p.id));assert(!missing.length,c.id+' no positive chart for '+missing.map(p=>p.id).slice(0,5));
  const chosen=[],have=new Set();
  while(conditional.some(p=>!have.has(p.id))){const best=cands.filter(s=>!chosen.includes(s)).sort((a,b)=>b.ids.filter(id=>!have.has(id)).length-a.ids.filter(id=>!have.has(id)).length||a.size-b.size||(a.id<b.id?-1:1))[0];assert(best&&best.ids.some(id=>!have.has(id)),c.id+' cover');chosen.push(best);best.ids.forEach(id=>have.add(id));}
  while(chosen.length<2)chosen.push(cands.find(s=>!chosen.includes(s)));
  for(const p of conditional)if(!chosen.some(s=>!s.ids.includes(p.id))){const extra=cands.find(s=>!chosen.includes(s)&&!s.ids.includes(p.id));assert(extra,c.id+' counterexample '+p.id);chosen.push(extra);}
  assert(chosen.length<=20,c.id+' needs '+chosen.length+' cases');
  const scenarios=chosen.map(s=>({sampleId:s.id,sd:s.sd,expectedPassageIds:s.ids,forbiddenPassageIds:conditional.map(p=>p.id).filter(id=>!s.ids.includes(id))}));
  for(const s of scenarios){assert(!s.sd.birth&&!s.sd.name&&s.expectedPassageIds.length+s.forbiddenPassageIds.length,c.id+' scenario');}
  for(const p of conditional){assert(scenarios.some(s=>s.expectedPassageIds.includes(p.id)),'positive '+p.id);assert(scenarios.some(s=>s.forbiddenPassageIds.includes(p.id)),'counter '+p.id);}
  const meta=xs=>xs.slice().sort(byId).map(p=>({id:p.id,role:p.role,when:p.when||{},unless:p.unless||{},ruleIds:p.ruleIds||[]})),newHash=hash(passages),newMeta=meta(passages);
  const known={},idSets=new Set(),pm=p=>({id:p.id,role:p.role,when:p.when||{},unless:p.unless||{},ruleIds:p.ruleIds||[]});
  for(const d of dumps){const ps=d.chapters[c.id];if(!ps)continue;idSets.add(md5(ps.map(p=>p.id).sort().join(',')));for(const p of ps){const k=known[p.id]=known[p.id]||{h:[],m:[]},hh=md5(p.text),mj=JSON.stringify(pm(p));if(!k.h.includes(hh))k.h.push(hh);if(!k.m.some(x=>JSON.stringify(x)===mj))k.m.push(pm(p));}}
  assert(!dumps.some(d=>d.chapters[c.id]&&hash(d.chapters[c.id])===newHash),c.id+' new text equals a baseline');
  const key='ik:blocks:chapter:library.'+c.id,at=new Date().toISOString();
  const incoming={passages,scenarios:scenarios.map(({forbiddenPassageIds,...s})=>s),review:{at,actor:'claude-editorial',seedVersion:S.SEED_VERSION,engine:L.LIBRARY_VERSION,editorialReviewed:true,externalExpertApproved:false,scope:'plain-spoken-copy-no-new-fortune-rules',providerCalls:0}};
  const textHash=`(select md5(string_agg((p->>'id')||chr(31)||(p->>'text'),chr(30) order by (p->>'id') collate "C")) from jsonb_array_elements(%s) p)`,metaOfSql=x=>`(select jsonb_agg(jsonb_build_object('id',p->'id','role',p->'role','when',coalesce(p->'when','{}'::jsonb),'unless',coalesce(p->'unless','{}'::jsonb),'ruleIds',coalesce(p->'ruleIds','[]'::jsonb)) order by (p->>'id') collate "C") from jsonb_array_elements(${x}) p)`;
  const nowIso=`to_jsonb(to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))`;
  const cap=`(select coalesce(jsonb_agg(x order by n),'[]'::jsonb) from (select x,n from jsonb_array_elements(%s) with ordinality t(x,n) order by n limit 14) s)`;
  const guard=x=>`if not coalesce((select md5(string_agg(p->>'id',',' order by (p->>'id') collate "C")) from jsonb_array_elements(${x}) p)=any(idsets),false) then raise exception 'passage list is not a known seed version';end if;
select p->>'id' into bad from jsonb_array_elements(${x}) p where not coalesce((known->(p->>'id')->'h') ? md5(p->>'text'),false) limit 1;
if bad is not null then raise exception 'text is not a known seed text (administrator edit?): %',bad;end if;
select p->>'id' into bad from jsonb_array_elements(${x}) p where not exists(select 1 from jsonb_array_elements(coalesce(known->(p->>'id')->'m','[]'::jsonb)) e where e=jsonb_build_object('id',p->'id','role',p->'role','when',coalesce(p->'when','{}'::jsonb),'unless',coalesce(p->'unless','{}'::jsonb),'ruleIds',coalesce(p->'ruleIds','[]'::jsonb))) limit 1;
if bad is not null then raise exception 'conditions are not a known seed version (administrator edit?): %',bad;end if;`;
  const apply=`-- ${c.id}: ${S.SEED_VERSION} full replace. Aborts without changes unless the published library is an untouched earlier seed.
do $upgrade$ declare prior text; old jsonb; cur text; v int; next jsonb; stamp jsonb;
incoming jsonb:=${quote(JSON.stringify(incoming))}::jsonb; passages jsonb:=incoming->'passages'; scenarios jsonb;
known jsonb:=${quote(JSON.stringify(known))}::jsonb; idsets text[]:=array[${[...idSets].map(quote)}]; bad text;
begin
select value into prior from public.kv where key=${quote(key)} for update;
if prior is null then raise exception 'library missing';end if;
old:=prior::jsonb;
if old->'draft' is distinct from old->'published' then raise exception 'unpublished admin edits';end if;
cur:=${textHash.replace('%s',"old->'published'")};
if cur=${quote(newHash)} then raise exception 'already applied';end if;
${guard("old->'published'")}
scenarios:=(select jsonb_agg(s||jsonb_build_object('forbiddenPassageIds',(select coalesce(jsonb_agg(p->>'id'),'[]'::jsonb) from jsonb_array_elements(passages) p where p->'when'<>'{}'::jsonb and not ((s->'expectedPassageIds') ? (p->>'id')))) order by n) from jsonb_array_elements(incoming->'scenarios') with ordinality t(s,n));
if jsonb_array_length(scenarios)<2 or jsonb_array_length(scenarios)>20 then raise exception 'scenario count';end if;
if exists(select 1 from jsonb_array_elements(scenarios) s where s->'sd' ? 'birth' or s->'sd' ? 'name') then raise exception 'not anonymous';end if;
if exists(select 1 from jsonb_array_elements(passages) p where p->'when'<>'{}'::jsonb and (not exists(select 1 from jsonb_array_elements(scenarios) s where (s->'expectedPassageIds') ? (p->>'id')) or not exists(select 1 from jsonb_array_elements(scenarios) s where (s->'forbiddenPassageIds') ? (p->>'id')))) then raise exception 'missing positive or counterexample';end if;
v:=(old->>'version')::int;stamp:=${nowIso};
next:=old||jsonb_build_object('version',v+1,'draft',passages,'published',passages,'scenarios',scenarios,'review',(incoming->'review')||jsonb_build_object('at',stamp),'updatedAt',stamp,
 'history',jsonb_build_array(jsonb_build_object('version',v,'draft',old->'draft','published',old->'published','scenarios',coalesce(old->'scenarios','[]'::jsonb),'review',coalesce(old->'review','null'::jsonb),'at',stamp))||${cap.replace('%s',"coalesce(old->'history','[]'::jsonb)")});
if not public.reading_compare_and_swap(${quote(key)},prior,next::text,null) then raise exception 'concurrent edit';end if;
end $upgrade$;
`;
  const rollback=`-- ${c.id}: restore the library that ${S.SEED_VERSION} replaced (from history[0]). Aborts if anything changed since the upgrade.
do $rollback$ declare prior text; old jsonb; prev jsonb; v int; next jsonb; stamp jsonb;
known jsonb:=${quote(JSON.stringify(known))}::jsonb; idsets text[]:=array[${[...idSets].map(quote)}]; bad text;
begin
select value into prior from public.kv where key=${quote(key)} for update;
if prior is null then raise exception 'library missing';end if;
old:=prior::jsonb;
if old->'draft' is distinct from old->'published' then raise exception 'unpublished admin edits';end if;
if ${textHash.replace('%s',"old->'published'")} is distinct from ${quote(newHash)} then raise exception 'published text changed after the upgrade';end if;
if ${metaOfSql("old->'published'")} is distinct from ${quote(JSON.stringify(newMeta))}::jsonb then raise exception 'conditions changed after the upgrade';end if;
v:=(old->>'version')::int;prev:=old->'history'->0;
if prev is null or (prev->>'version')::int is distinct from v-1 then raise exception 'history does not hold the previous version';end if;
${guard("prev->'published'")}
stamp:=${nowIso};
next:=old||jsonb_build_object('version',v+1,'draft',prev->'published','published',prev->'published','scenarios',coalesce(prev->'scenarios','[]'::jsonb),'review',coalesce(prev->'review','null'::jsonb),'updatedAt',stamp,
 'history',jsonb_build_array(jsonb_build_object('version',v,'draft',old->'draft','published',old->'published','scenarios',coalesce(old->'scenarios','[]'::jsonb),'review',coalesce(old->'review','null'::jsonb),'at',stamp))||${cap.replace('%s',"old->'history'")});
if not public.reading_compare_and_swap(${quote(key)},prior,next::text,null) then raise exception 'concurrent edit';end if;
end $rollback$;
`;
  fs.writeFileSync(`${out}/full/sql/${c.id}.sql`,apply);fs.writeFileSync(`${out}/full/rollback/${c.id}.sql`,rollback);files.push(c.id+'.sql');
  plan.push({chapter:c.id,passages:passages.length,conditional:conditional.length,cases:scenarios.length,caseIds:chosen.map(s=>s.id),knownBaselines:dumps.length,idSets:idSets.size,applyBytes:Buffer.byteLength(apply),rollbackBytes:Buffer.byteLength(rollback)});
  console.log(JSON.stringify(plan[plan.length-1]));
 }
 if(!only){fs.writeFileSync(out+'/full/sql/index.json',JSON.stringify(files));fs.writeFileSync(out+'/full/plan.json',JSON.stringify(plan,null,1));}
 console.log('engine charts scanned up to',engineN);
})().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});
