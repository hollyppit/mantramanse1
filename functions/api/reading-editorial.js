import {json,isAdmin} from '../_lib.js';
import {kvOf} from '../_store.js';
import {loadAll,blockedDocs} from '../_ikstore.js';
import {loadSourceIndex} from '../_interpretation-store.js';
import {Editorial,DRAFT_KEY,PUBLISHED_KEY,HISTORY_KEY,loadEditorial,validateEditorial,publicationIssues} from '../_editorial.js';
// 공개 응답 모양(관리자 전용 sourceRuleIds 는 빼고, 보관 장은 연결 정보만).
export const publicCatalog=catalog=>({version:catalog.version,topics:catalog.topics,chapters:catalog.chapters.filter(c=>['active','archived'].includes(c.state)).map(c=>c.state==='archived'?{id:c.id,legacyIds:c.legacyIds,topicId:c.topicId,state:c.state}:Object.fromEntries(Object.entries(c).filter(([k])=>k!=='sourceRuleIds')))});
export const EDGE_TTL=60;
const edgeKey=url=>new Request(url.origin+'/api/reading-editorial?edge=public');
const edgeCache=()=>{try{return typeof caches!=='undefined'&&caches.default||null;}catch{return null;}};
async function edgeGet(url){const c=edgeCache();if(!c)return null;try{const r=await c.match(edgeKey(url));if(!r)return null;const h=new Headers(r.headers);h.set('cache-control','no-store');h.set('x-editorial-cache','hit');return new Response(r.body,{status:200,headers:h});}catch{return null;}}
async function edgePut(url,body){const text=JSON.stringify(body),c=edgeCache();
 // 게시본이 아직 없는 기본 목차(version 0)는 보관하지 않는다(게시 직후 바로 보이게).
 if(c&&body.version>0){try{await c.put(edgeKey(url),new Response(text,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age='+EDGE_TTL}}));}catch{}}
 return new Response(text,{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-editorial-cache':'miss'}});}
export async function onRequest({request,env}){
 const admin=isAdmin(request,env),kv=kvOf(env),url=new URL(request.url);
 if(request.method==='GET'&&url.searchParams.get('view')!=='admin'){
  // 2026-11-12: 저장소 읽기가 1~30초로 들쭉날쭉해 화면이 기본 목차로 넘어가곤 했다. 공개 게시본은 모두에게 같으므로 엣지에 60초 보관한다.
  const hit=await edgeGet(url);if(hit)return hit;
  try{const catalog=await loadEditorial(kv);return await edgePut(url,publicCatalog(catalog));}catch{return json({error:'storage-unavailable'},503);}
 }
 if(!admin)return json({error:'unauthorized'},401);
 if(!kv)return json({error:'storage-unavailable'},503);
 try{
  const current=await loadEditorial(kv,true),published=await kv.get(PUBLISHED_KEY,'json');
  if(request.method==='GET')return json({catalog:current,publishedVersion:published?.version || 0,history:((await kv.get(HISTORY_KEY,'json'))||[]).map(x=>({at:x.at,version:x.catalog.version,action:x.action}))});
  if(request.method!=='POST')return json({error:'method-not-allowed'},405);
  const raw=await request.text();if(raw.length>900000)return json({error:'too-large'},413);
  let b;try{b=JSON.parse(raw);}catch{return json({error:'invalid-json'},400);}
  if(!['save','publish','restore','check'].includes(b.action))return json({error:'invalid-action'},400);
  if(b.expectVersion!==current.version)return json({error:'version-conflict',version:current.version},409);
  let candidate=b.catalog;
  if(b.action==='restore'){
   const history=(await kv.get(HISTORY_KEY,'json'))||[];candidate=history.find(h=>h.catalog.version===b.restoreVersion)?.catalog;
   if(!candidate)return json({error:'history-not-found'},404);
   // Preserve entries created since that historical version as archived, never silently delete them.
   candidate=structuredClone(candidate);for(const key of ['topics','chapters','cases'])for(const row of current[key])if(!candidate[key].some(x=>x.id===row.id))candidate[key].push({...row,...(key==='topics'?{enabled:false}:{state:'archived'})});
  }
  const invalid=validateEditorial(candidate,current);if(invalid)return json({error:invalid},400);
  if(b.action==='publish'||b.action==='check'){
   const items=await loadAll(kv),blocked=await blockedDocs(kv),index=await loadSourceIndex(kv,items,blocked);
   const issues=publicationIssues(candidate,items,blocked,index,{includeDrafts:b.action==='check'});
   if(b.action==='check')return json({ok:true,version:current.version,issues,scope:'source-links-only',writesPerformed:false});
   if(issues.length)return json({error:'publication-blocked',issues},422);
  }
  const next={version:current.version+1,updatedAt:new Date().toISOString(),topics:candidate.topics,chapters:candidate.chapters,cases:candidate.cases};
  const history=(await kv.get(HISTORY_KEY,'json'))||[];
  await kv.put(HISTORY_KEY,JSON.stringify([{at:next.updatedAt,action:b.action,catalog:current},...history].slice(0,15)));
  await kv.put(DRAFT_KEY,JSON.stringify(next));
  if(b.action==='publish')await kv.put(PUBLISHED_KEY,JSON.stringify(next));
  if(b.action==='publish'){const c=edgeCache();if(c)try{await c.delete(edgeKey(url));}catch{}}
  return json({ok:true,catalog:next,published:b.action==='publish',publishedVersion:b.action==='publish'?next.version:published?.version||0});
 }catch{return json({error:'editorial-unavailable'},503);}
}
