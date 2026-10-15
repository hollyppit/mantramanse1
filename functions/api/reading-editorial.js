import {json,isAdmin} from '../_lib.js';
import {kvOf} from '../_store.js';
import {loadAll,blockedDocs} from '../_ikstore.js';
import {loadSourceIndex} from '../_interpretation-store.js';
import {Editorial,DRAFT_KEY,PUBLISHED_KEY,HISTORY_KEY,loadEditorial,validateEditorial,publicationIssues} from '../_editorial.js';
export async function onRequest({request,env}){
 const admin=isAdmin(request,env),kv=kvOf(env),url=new URL(request.url);
 if(request.method==='GET'&&url.searchParams.get('view')!=='admin'){
  try{const catalog=await loadEditorial(kv);return json({version:catalog.version,topics:catalog.topics,chapters:catalog.chapters.filter(c=>['active','archived'].includes(c.state)).map(c=>c.state==='archived'?{id:c.id,legacyIds:c.legacyIds,topicId:c.topicId,state:c.state}:Object.fromEntries(Object.entries(c).filter(([k])=>k!=='sourceRuleIds')))});}catch{return json({error:'storage-unavailable'},503);}
 }
 if(!admin)return json({error:'unauthorized'},401);
 if(!kv)return json({error:'storage-unavailable'},503);
 try{
  const current=await loadEditorial(kv,true),published=await kv.get(PUBLISHED_KEY,'json');
  if(request.method==='GET')return json({catalog:current,publishedVersion:published?.version || 0,history:((await kv.get(HISTORY_KEY,'json'))||[]).map(x=>({at:x.at,version:x.catalog.version,action:x.action}))});
  if(request.method!=='POST')return json({error:'method-not-allowed'},405);
  const raw=await request.text();if(raw.length>900000)return json({error:'too-large'},413);
  let b;try{b=JSON.parse(raw);}catch{return json({error:'invalid-json'},400);}
  if(!['save','publish','restore'].includes(b.action))return json({error:'invalid-action'},400);
  if(b.expectVersion!==current.version)return json({error:'version-conflict',version:current.version},409);
  let candidate=b.catalog;
  if(b.action==='restore'){
   const history=(await kv.get(HISTORY_KEY,'json'))||[];candidate=history.find(h=>h.catalog.version===b.restoreVersion)?.catalog;
   if(!candidate)return json({error:'history-not-found'},404);
   // Preserve entries created since that historical version as archived, never silently delete them.
   candidate=structuredClone(candidate);for(const key of ['topics','chapters','cases'])for(const row of current[key])if(!candidate[key].some(x=>x.id===row.id))candidate[key].push({...row,...(key==='topics'?{enabled:false}:{state:'archived'})});
  }
  const invalid=validateEditorial(candidate,current);if(invalid)return json({error:invalid},400);
  if(b.action==='publish'){
   const items=await loadAll(kv),blocked=await blockedDocs(kv),index=await loadSourceIndex(kv,items,blocked);
   const issues=publicationIssues(candidate,items,blocked,index);if(issues.length)return json({error:'publication-blocked',issues},422);
  }
  const next={version:current.version+1,updatedAt:new Date().toISOString(),topics:candidate.topics,chapters:candidate.chapters,cases:candidate.cases};
  const history=(await kv.get(HISTORY_KEY,'json'))||[];
  await kv.put(HISTORY_KEY,JSON.stringify([{at:next.updatedAt,action:b.action,catalog:current},...history].slice(0,15)));
  await kv.put(DRAFT_KEY,JSON.stringify(next));
  if(b.action==='publish')await kv.put(PUBLISHED_KEY,JSON.stringify(next));
  return json({ok:true,catalog:next,published:b.action==='publish',publishedVersion:b.action==='publish'?next.version:published?.version||0});
 }catch{return json({error:'editorial-unavailable'},503);}
}
