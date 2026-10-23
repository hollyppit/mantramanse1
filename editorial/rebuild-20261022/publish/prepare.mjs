// Prepares (never executes) the production publication of the rebuild drafts:
//   per-chapter payload, apply SQL, read-only dry-run SQL and rollback SQL under output/rebuild-publication-20261023/.
// Guards are anchored on the READ-ONLY observation in observed-prod.json (version + published-text hash), so any change made in production
// after the observation (administrator edit, other publication) aborts the apply instead of being overwritten.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {allEntries,chapterPassages,loadService,ROOT} from './convert.mjs';
import {loadEngine} from '../admin/sim.mjs';
import {deriveFacts,evalConds} from '../../../functions/_ik.js';

export const OUT=path.join(ROOT,'output','rebuild-publication-20261023');
const md5=x=>crypto.createHash('md5').update(x).digest('hex'),byId=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
export const textHash=ps=>md5(ps.slice().sort(byId).map(p=>p.id+'\x1f'+p.text).join('\x1e'));
const strip=sd=>{sd=structuredClone(sd);for(const k of ['birth','name','ziwei','calculationProvenance'])delete sd[k];return sd;};
export const MAX_SCENARIOS=40;

const POOLS=new Map();
export function chartPool(n,offset=0){const k=n+':'+offset;if(!POOLS.has(k))POOLS.set(k,buildPool(n,offset));return POOLS.get(k);}
function buildPool(n,offset){
 const {Manse,ReportV2}=loadEngine(ROOT),out=[];let seed=20261023+offset;const rnd=m=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%m;};
 for(let i=0;i<n;i++){
  const birth={year:1930+rnd(95),month:1+rnd(12),day:1+rnd(28),hour:rnd(9)===0?null:rnd(24),minute:0,calendar:'solar',gender:rnd(2)?'M':'F',city:'서울'};
  const chart=Manse.compute(birth);if(!chart)continue;
  const sd=strip(ReportV2.SajuData.build(chart,{now:Date.UTC(2026,9,22,3)}));out.push({id:`pool-${offset}-${i}`,sd,facts:deriveFacts(sd)});
 }
 return out;
}

// Greedy cover: every conditional passage needs a positive chart and a counterexample chart (the same rule the admin publish API enforces).
export function chooseScenarios(L,contract,passages,pools){
 const conditional=passages.filter(p=>Object.keys(p.when||{}).length),cands=[];
 const matches=(p,facts)=>{try{if(Object.keys(p.when||{}).length&&!evalConds(p.when,facts).match)return false;if(Object.keys(p.unless||{}).length){const x=evalConds(p.unless,facts);if(x.match||x.missing.length)return false;}return true;}catch{return false;}};
 const add=s=>cands.push({id:s.id,sd:s.sd,ids:new Set(passages.filter(p=>matches(p,s.facts)).map(p=>p.id))});
 pools[0].forEach(add);
 const covered=()=>new Set(cands.flatMap(s=>[...s.ids]));
 for(let k=1;k<pools.length&&conditional.some(p=>!covered().has(p.id));k++)pools[k]().forEach(add);
 const missing=conditional.filter(p=>!covered().has(p.id)).map(p=>p.id);
 const chosen=[],have=new Set(),missingSet=new Set(missing),target=conditional.filter(p=>!missingSet.has(p.id)).map(p=>p.id),sdLen=new Map(cands.map(s=>[s,JSON.stringify(s.sd).length]));
 while(target.some(id=>!have.has(id))){
  let best=null,bg=0;
  for(const s of cands){if(chosen.includes(s))continue;let g=0;for(const id of s.ids)if(!have.has(id))g++;
   if(g>bg||(g===bg&&g>0&&(sdLen.get(s)<sdLen.get(best)||(sdLen.get(s)===sdLen.get(best)&&s.id<best.id)))){best=s;bg=g;}}
  if(!best||!bg)break;
  chosen.push(best);best.ids.forEach(id=>have.add(id));
 }
 while(chosen.length<2)chosen.push(cands.find(s=>!chosen.includes(s)));
 // counterexamples: a chart that does not select the passage
 for(const p of conditional){if(missing.includes(p.id))continue;if(!chosen.some(s=>!s.ids.has(p.id)))chosen.push(cands.find(s=>!chosen.includes(s)&&!s.ids.has(p.id)));}
 return {chosen:chosen.filter(Boolean),missing,conditional:conditional.length};
}

const q=x=>'$j$'+x+'$j$';
const HASH_SQL=x=>`(select md5(string_agg((p->>'id')||chr(31)||(p->>'text'),chr(30) order by (p->>'id') collate "C")) from jsonb_array_elements(${x}) p)`;
const NOW=`to_jsonb(to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))`;
const CAP=x=>`(select coalesce(jsonb_agg(x order by n),'[]'::jsonb) from (select x,n from jsonb_array_elements(${x}) with ordinality t(x,n) order by n limit 14) s)`;

export function sqlFor({chapter,incoming,newHash,obs,mode}){
 const key='ik:blocks:chapter:library.'+chapter;
 const head=`-- ${chapter}: ${mode==='apply'?'APPLY':'READ-ONLY DRY RUN (no write statement)'} rebuild-20261022 drafts. Guards: draft==published, version ${obs.v}, published text hash ${obs.h}.
do $run$ declare prior text; old jsonb; v int; next jsonb; stamp jsonb; incoming jsonb:=${q(JSON.stringify(incoming))}::jsonb; passages jsonb:=incoming->'passages'; scenarios jsonb;
begin
select value into prior from public.kv where key='${key}'${mode==='apply'?' for update':''};
if prior is null then raise exception 'library missing';end if;
old:=prior::jsonb;
if old->'draft' is distinct from old->'published' then raise exception 'unpublished administrator edits';end if;
if (old->>'version')::int<>${obs.v} then raise exception 'version changed since the observed backup';end if;
if ${HASH_SQL("old->'published'")}<>'${obs.h}' then raise exception 'published text changed since the observed backup';end if;
if ${HASH_SQL("old->'published'")}='${newHash}' then raise exception 'already applied';end if;
scenarios:=(select jsonb_agg(s||jsonb_build_object('forbiddenPassageIds',(select coalesce(jsonb_agg(p->>'id'),'[]'::jsonb) from jsonb_array_elements(passages) p where p->'when'<>'{}'::jsonb and not ((s->'expectedPassageIds') ? (p->>'id')))) order by n) from jsonb_array_elements(incoming->'scenarios') with ordinality t(s,n));
if jsonb_array_length(scenarios)<2 or jsonb_array_length(scenarios)>${MAX_SCENARIOS} then raise exception 'scenario count';end if;
if exists(select 1 from jsonb_array_elements(scenarios) s where s->'sd' ? 'birth' or s->'sd' ? 'name') then raise exception 'scenario is not anonymous';end if;
if exists(select 1 from jsonb_array_elements(passages) p where p->'when'<>'{}'::jsonb and (not exists(select 1 from jsonb_array_elements(scenarios) s where (s->'expectedPassageIds') ? (p->>'id')) or not exists(select 1 from jsonb_array_elements(scenarios) s where (s->'forbiddenPassageIds') ? (p->>'id')))) then raise exception 'missing positive or counterexample';end if;
`;
 if(mode==='dry')return head+`raise exception 'DRYRUN-OK % passages %, scenarios %, current version %',${q(chapter)},jsonb_array_length(passages),jsonb_array_length(scenarios),(old->>'version');
end $run$;
`;
 return head+`v:=(old->>'version')::int;stamp:=${NOW};
next:=old||jsonb_build_object('version',v+1,'draft',passages,'published',passages,'scenarios',scenarios,'review',(incoming->'review')||jsonb_build_object('at',stamp),'updatedAt',stamp,
 'history',jsonb_build_array(jsonb_build_object('version',v,'draft',old->'draft','published',old->'published','scenarios',coalesce(old->'scenarios','[]'::jsonb),'review',coalesce(old->'review','null'::jsonb),'at',stamp))||${CAP("coalesce(old->'history','[]'::jsonb)")});
if not public.reading_compare_and_swap('${key}',prior,next::text,null) then raise exception 'concurrent edit';end if;
end $run$;
`;
}
export function rollbackSqlFor({chapter,newHash,obs}){
 const key='ik:blocks:chapter:library.'+chapter;
 return `-- ${chapter}: ROLLBACK to the library that rebuild-20261022 replaced (history[0]). Aborts if anything changed after the upgrade.
do $rollback$ declare prior text; old jsonb; prev jsonb; v int; next jsonb; stamp jsonb;
begin
select value into prior from public.kv where key='${key}' for update;
if prior is null then raise exception 'library missing';end if;
old:=prior::jsonb;
if old->'draft' is distinct from old->'published' then raise exception 'unpublished administrator edits';end if;
if ${HASH_SQL("old->'published'")} is distinct from '${newHash}' then raise exception 'published text changed after the upgrade';end if;
v:=(old->>'version')::int;prev:=old->'history'->0;
if prev is null or (prev->>'version')::int is distinct from v-1 then raise exception 'history does not hold the previous version';end if;
if ${HASH_SQL("prev->'published'")} is distinct from '${obs.h}' then raise exception 'history[0] is not the observed backup';end if;
stamp:=${NOW};
next:=old||jsonb_build_object('version',v+1,'draft',prev->'published','published',prev->'published','scenarios',coalesce(prev->'scenarios','[]'::jsonb),'review',coalesce(prev->'review','null'::jsonb),'updatedAt',stamp,
 'history',jsonb_build_array(jsonb_build_object('version',v,'draft',old->'draft','published',old->'published','scenarios',coalesce(old->'scenarios','[]'::jsonb),'review',coalesce(old->'review','null'::jsonb),'at',stamp))||${CAP("old->'history'")});
if not public.reading_compare_and_swap('${key}',prior,next::text,null) then raise exception 'concurrent edit';end if;
end $rollback$;
`;
}

export function mergePlan(){
 const dir=path.join(OUT,'plan-parts'),plan=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
 fs.writeFileSync(path.join(OUT,'plan.json'),JSON.stringify(plan,null,1));return plan;
}
export async function prepareAll({only=null}={}){
 const {L,S,chapters}=await loadService(),all=allEntries(),observed=JSON.parse(fs.readFileSync(path.join(OUT,'observed-prod.json'),'utf8')).chapters;
 for(const d of ['payload','sql/apply','sql/dry','sql/rollback','plan-parts'])fs.mkdirSync(path.join(OUT,d),{recursive:true});
 const pool0=chartPool(3000),plan=[];
 for(const c of chapters){
  const es=all.filter(e=>e.chapters[0]===c.id);if(!es.length||(only&&!only.includes(c.id)))continue;
  const conv=await chapterPassages(c,S.seedPassages(c),es,{L});let passages=L.normalizePassages(conv.passages);
  const pools=[pool0,()=>chartPool(9000,1),()=>[0,1,2,3,4,5].flatMap(k=>chartPool(7000,10+k))];
  let sc=chooseScenarios(L,c,passages,pools);
  // A conditional passage that no chart of the 51,000-chart search selects can never be shown (self-contradicting or non-occurring condition) and would fail the publish guard, so it is left out and reported.
  const unreachable=sc.missing.slice();
  if(unreachable.length){passages=passages.filter(p=>!unreachable.includes(p.id));sc=chooseScenarios(L,c,passages,pools);}
  const issues=L.validatePassages(passages,c,[]);
  const at=new Date().toISOString(),obsRow=observed[c.id];if(!obsRow)throw new Error('no observation for '+c.id);
  const scenarios=sc.chosen.map(s=>({sampleId:s.id,sd:s.sd,expectedPassageIds:[...s.ids]}));
  const incoming={passages,scenarios,review:{at,actor:'claude-editorial',source:'rebuild-20261022-drafts',seedVersion:'rebuild-20261022-drafts-1',engine:L.LIBRARY_VERSION,editorialReviewed:false,human:false,externalExpertApproved:false,providerCalls:0,
   note:'Unreviewed drafts converted from editorial/rebuild-20261022. Authored entries first; currently published unconditional passages kept as fallback.'}};
  const newHash=textHash(passages),obs={v:obsRow[0],h:obsRow[1],n:obsRow[2]};
  fs.writeFileSync(path.join(OUT,'payload',c.id+'.json'),JSON.stringify(incoming));
  const apply=sqlFor({chapter:c.id,incoming,newHash,obs,mode:'apply'});
  fs.writeFileSync(path.join(OUT,'sql/apply',c.id+'.sql'),apply);
  fs.writeFileSync(path.join(OUT,'sql/dry',c.id+'.sql'),sqlFor({chapter:c.id,incoming,newHash,obs,mode:'dry'}));
  fs.writeFileSync(path.join(OUT,'sql/rollback',c.id+'.sql'),rollbackSqlFor({chapter:c.id,newHash,obs}));
  plan.push({chapter:c.id,entries:es.length,passages:passages.length,authored:conv.authored.length,fallback:conv.fallback.length,validatorIssues:issues.length,droppedForDuplicate:conv.log.droppedForDuplicate.length,prefixed:conv.log.prefixed,
   scenarios:scenarios.length,scenariosOverAdminLimit:scenarios.length>20,uncoveredConditionalPassages:sc.missing.length,droppedUnreachable:unreachable,observedVersion:obs.v,observedHash:obs.h,newHash,applyBytes:Buffer.byteLength(apply)});
 }
 for(const r of plan)fs.writeFileSync(path.join(OUT,'plan-parts',r.chapter+'.json'),JSON.stringify(r));
 return mergePlan();
}
