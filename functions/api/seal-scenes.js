import {json,isAdmin} from '../_lib.js';
import {kvOf} from '../_store.js';
import {SEAL_KEY,emptySeals,sealDigest,validateSealScenes} from '../_seal-scenes.js';
export async function onRequest({request,env}){
 const url=new URL(request.url),admin=url.searchParams.get('a')==='admin';
 if((request.method!=='GET'||admin)&&!isAdmin(request,env))return json({error:'unauthorized'},401);
 const kv=kvOf(env);if(!kv)return request.method==='GET'&&!admin?json({schemaVersion:1,version:0,chapters:[]}):json({error:'storage-unavailable'},503);
 try{
  const raw=await kv.get(SEAL_KEY),state=raw?JSON.parse(raw):emptySeals();
  if(request.method==='GET')return admin?json({ok:true,state,atomicWrites:!!kv.readingCAS}):json({schemaVersion:1,version:state.publishedVersion||0,chapters:(state.published||[]).map(c=>({...c,status:"published",version:state.publishedVersion||0}))});
  if(request.method!=='POST')return json({error:'method-not-allowed'},405);
  if(!kv.readingCAS)return json({error:'atomic-storage-required',message:'기존 readingCAS 저장소가 필요합니다. KV 단독 환경에서는 동시 수정 보호를 위해 저장을 차단합니다.'},503);
  const rawBody=await request.text();if(new TextEncoder().encode(rawBody).length>250000)return json({error:'too-large'},413);
  let b;try{b=JSON.parse(rawBody);}catch{return json({error:'invalid-json'},400);}
  if(b.expectVersion!==state.version)return json({error:'version-conflict',version:state.version},409);
  const media=await env.GLOSSARY_KV.get('media:index','json')||[];
  const next=structuredClone(state);let issues;
  if(b.action==='save'){issues=validateSealScenes(b.chapters,media);if(issues.length)return json({error:'validation-failed',issues},422);next.draft=b.chapters;next.review=null;}
  else if(b.action==='validate')return json({ok:true,issues:validateSealScenes(state.draft,media),version:state.version});
  else if(b.action==='review'){issues=validateSealScenes(state.draft,media);if(issues.length||!state.draft.length)return json({error:'validation-failed',issues},422);if(b.confirm!==true||typeof b.reviewer!=='string'||!b.reviewer.trim()||b.reviewer.length>80)return json({error:'review-confirmation-required'},400);next.review={by:b.reviewer.trim(),at:new Date().toISOString(),digest:await sealDigest(state.draft)};}
  else if(b.action==='publish'){issues=validateSealScenes(state.draft,media);if(issues.length||!state.draft.length)return json({error:'validation-failed',issues},422);if(!state.review||state.review.digest!==await sealDigest(state.draft))return json({error:'review-required'},409);next.published=structuredClone(state.draft);next.publishedVersion=state.version+1;}
  else if(b.action==='withdraw'){if(b.confirm!==true)return json({error:'withdraw-confirmation-required'},400);next.published=[];next.publishedVersion=state.version+1;}
  else if(b.action==='restore'){const snapshot=state.history.find(h=>h.version===b.restoreVersion);if(!snapshot)return json({error:'unknown-version'},404);issues=validateSealScenes(snapshot.draft,media);if(issues.length)return json({error:'validation-failed',issues},422);next.draft=structuredClone(snapshot.draft);next.review=null;}
  else return json({error:'invalid-action'},400);
  next.history=[{version:state.version,at:new Date().toISOString(),draft:state.draft,published:state.published,review:state.review},...(state.history||[])].slice(0,20);
  next.version=state.version+1;
  if(!await kv.readingCAS(SEAL_KEY,raw,JSON.stringify(next)))return json({error:'version-conflict'},409);
  const stored=await kv.get(SEAL_KEY,'json');if(stored?.version!==next.version)return json({error:'write-not-confirmed'},503);
  return json({ok:true,state:stored,verified:true,atomicWrites:true});
 }catch(e){return json({error:'seal-scenes-unavailable'},503);}
}

