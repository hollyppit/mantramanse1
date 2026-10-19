import {seedPassages} from '../_reading-library-seed.js';
import {json,isAdmin} from '../_lib.js';
import {kvOf} from '../_store.js';
import {loadServiceAll,blockedDocs} from '../_ikstore.js';
import {loadEditorial} from '../_editorial.js';
import {readLibrary,libraryKey,libraryRevision,validatePassages,normalizePassages,selectPassages,LIBRARY_VERSION} from '../_reviewed-library.js';
import {prepareReviewed} from '../_reviewed-reading.js';
const fail=(error,status=400,extra={})=>json({error,...extra},status);
export async function onRequest({request,env}){
 if(!isAdmin(request,env))return fail('unauthorized',401);
 const kv=kvOf(env);if(!kv)return fail('storage-unavailable',503);
 try{
  const url=new URL(request.url),catalog=await loadEditorial(kv,true),chapter=url.searchParams.get('chapter');
  if(request.method==='GET'&&!chapter){
   const libraries=kv.getMany?await kv.getMany(catalog.chapters.map(c=>libraryKey(c.id)),'json'):await Promise.all(catalog.chapters.map(c=>readLibrary(kv,c.id)));
   const rows=catalog.chapters.map((c,i)=>{const l=libraries[i]||{version:0,draft:[],published:[]};return {id:c.id,title:c.title,topicId:c.topicId,sourceRuleIds:c.sourceRuleIds,version:l.version,draftCount:l.draft.length,publishedCount:l.published.length};});
   return json({ok:true,chapters:rows,mode:'reviewed-only',providerCallsPerReading:0,engine:LIBRARY_VERSION});
  }
  const contract=catalog.chapters.find(c=>c.id===chapter);if(!contract)return fail('unknown-chapter',404);
  const library=await readLibrary(kv,chapter),revision=await libraryRevision(library);
  const items=await loadServiceAll(kv),linked=items.filter(r=>contract.sourceRuleIds.includes(r.id));
  const suggested=linked.filter(r=>r.status==='published'&&r.reviewed).flatMap(r=>[['title',r.interpretation],['strength',r.strengths?.[0]],['risk',r.risks?.[0]],['practice',r.actions?.[0]]].filter(([,t])=>typeof t==='string'&&t.length>=30&&t.length<=1000&&!/[<>{}]/.test(t)).map(([role,text])=>({id:r.id+'-'+role,role,kind:'personal',text,ruleIds:[r.id],when:{},unless:{},adviceKey:r.id+'-'+role}))).slice(0,60);
  if(request.method==='GET')return json({ok:true,contract,library,revision,suggested,compiledPassages:seedPassages(contract),rules:linked.map(r=>({id:r.id,title:r.title,interpretation:r.interpretation,conditions:r.conditions,exclusions:r.exclusions,status:r.status,reviewed:r.reviewed,version:r.version})),scope:'approved-rules-plus-published-passages'});
  if(request.method!=='POST')return fail('method-not-allowed',405);
  const raw=await request.text();if(raw.length>900000)return fail('too-large',413);let b;try{b=JSON.parse(raw);}catch{return fail('invalid-json');}
  if(!['save','check','publish','preview','restore'].includes(b.action))return fail('invalid-action');
  if(b.expectRevision!==revision)return fail('version-conflict',409,{revision});
  if(b.action==='preview'){
   if(!b.sample?.sd||b.sample.sd.birth||b.sample.sd.name)return fail('synthetic-chart-required');
   const passages=normalizePassages(b.passages||library.draft),issues=validatePassages(passages,contract,items);if(issues.length)return fail('invalid-passages',422,{issues});
   return json(await prepareReviewed(env,{...b.sample,chapter:{id:chapter,title:contract.title,paragraphs:['title','reality','strength','risk','reinforce','practice','evidence'].map((role,i)=>({id:String(i),role,text:'검수된 풀이 문장을 확인하는 관리자 미리보기입니다.'}))}},{draft:true,passages}));
  }
  const historical=b.action==='restore'?library.history.find(h=>h.version===b.restoreVersion):null;
  let passages=b.action==='restore'?(historical?.draft||historical?.published):b.passages;
  if(!Array.isArray(passages))return fail('invalid-passages');passages=normalizePassages(passages);
  const issues=validatePassages(passages,contract,items),blocked=await blockedDocs(kv);
  for(const p of passages)for(const id of p.ruleIds){const r=items.find(x=>x.id===id);if(!r?.evidence?.length||r.evidence.some(e=>blocked.has(e.docId)))issues.push({id:p.id,code:'source-disabled-or-missing:'+id});}
  const scenarios=[];
  if(['check','publish'].includes(b.action)){
   if(!Array.isArray(b.scenarios)||b.scenarios.length<2||b.scenarios.length>20)issues.push({code:'two-or-more-synthetic-scenarios-required'});
   else for(const [i,s] of b.scenarios.entries()){
    if(!s.sd||s.sd.birth||s.sd.name||!Array.isArray(s.expectedPassageIds)||!Array.isArray(s.forbiddenPassageIds)||![...s.expectedPassageIds,...s.forbiddenPassageIds].length){issues.push({code:'scenario-expectations-required',scenario:i});continue;}
    const sample=await prepareReviewed(env,{sd:s.sd,chapter:{id:chapter,title:contract.title,paragraphs:[{id:'0',role:'title',text:'검수된 풀이의 적용 조건을 확인하는 가상 사주입니다.'}]}},{draft:true,passages});
    const matches=selectPassages(passages,contract,{claims:sample.claims},s.sd).map(p=>p.id),bad=s.expectedPassageIds.filter(id=>!matches.includes(id)).concat(s.forbiddenPassageIds.filter(id=>matches.includes(id)));
    scenarios.push({index:i,matched:matches,ok:!bad.length,unexpected:bad});if(bad.length)issues.push({code:'scenario-mismatch',scenario:i,ids:bad});
   }
   // A reusable personal passage must be demonstrated on both a fitting chart and a counterexample.
   for(const p of passages.filter(p=>p.kind==='personal'||Object.keys(p.when||{}).length||Object.keys(p.unless||{}).length)){
    if(!b.scenarios?.some(s=>s.expectedPassageIds?.includes(p.id)))issues.push({id:p.id,code:'positive-example-required'});
    if(!b.scenarios?.some(s=>s.forbiddenPassageIds?.includes(p.id)))issues.push({id:p.id,code:'counterexample-required'});
   }
  }
  if(b.action==='check')return json({ok:true,issues,scenarios,providerCallCount:0,writesPerformed:false});
  if(issues.length)return fail('validation-blocked',422,{issues,scenarios});
  if(b.action==='publish'&&b.reviewed!==true)return fail('human-review-required',422);
  if(!kv.readingCAS)return fail('atomic-storage-required',503);
  if(b.scenarios!=null&&(!Array.isArray(b.scenarios)||b.scenarios.length>20||b.scenarios.some(s=>!s.sd||s.sd.birth||s.sd.name||!Array.isArray(s.expectedPassageIds)||!Array.isArray(s.forbiddenPassageIds))))return fail('synthetic-scenarios-required');
  const next={...library,version:library.version+1,draft:passages,scenarios:historical?.scenarios||b.scenarios||library.scenarios||[],updatedAt:new Date().toISOString()};
  if(b.action==='publish'){
   next.published=passages.map(p=>({...p,sourceVersions:Object.fromEntries(p.ruleIds.map(id=>[id,items.find(r=>r.id===id).version||0]))}));
   next.review={at:next.updatedAt,scenarios,engine:LIBRARY_VERSION,human:true};
  }
  next.history=[{version:library.version,published:library.published,draft:library.draft,scenarios:library.scenarios||[],at:next.updatedAt},...library.history].slice(0,15);
  const key=libraryKey(chapter),before=await kv.get(key);if(before&&await libraryRevision(JSON.parse(before))!==revision)return fail('version-conflict',409);
  if(!await kv.readingCAS(key,before,JSON.stringify(next)))return fail('version-conflict',409);
  return json({ok:true,library:next,revision:await libraryRevision(next),scenarios,providerCallCount:0});
 }catch(e){return fail(['invalid-chart','invalid-distribution','unknown-hour-has-pillar'].includes(e.message)?e.message:'library-unavailable',503);}
}
