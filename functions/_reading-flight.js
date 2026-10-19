import { digest } from './_reading-blocks.js';
import { json } from './_lib.js';
const registries=new WeakMap();
export async function singleFlight(env,key,work){
 let map=registries.get(env);if(!map){map=new Map();registries.set(env,map);}
 let promise=map.get(key);
 if(!promise){if(map.size>=128)return work();promise=Promise.resolve().then(work);map.set(key,promise);promise.finally(()=>{if(map.get(key)===promise)map.delete(key);}).catch(()=>{});}
 return (await promise).clone();
}
// Source/config versions are part of key. Personal responses never enter this shared lease/result.
export async function distributedFlight(kv,key,work,{waitMs=155000,leaseMs=300000,pollMs=350,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(!kv?.readingCAS)throw Error('reading-atomic-storage-required');
 const storageKey='ai:flight:'+await digest(key),owner=crypto.randomUUID(),deadline=now()+waitMs;
 for(;;){
  const raw=await kv.get(storageKey),current=raw?JSON.parse(raw):null;
  if(current?.state==='done' && current.until>now())return new Response(JSON.stringify(current.body),{status:current.status,headers:{'content-type':'application/json','cache-control':'no-store','x-reading-coalesced':'1'}});
  if(!current || current.until<=now()){
   const lease={state:'running',owner,until:now()+leaseMs};const expected=JSON.stringify(lease);
   if(await kv.readingCAS(storageKey,raw,expected,Math.ceil(leaseMs/1000)+60)){
    let response;
    try{response=await work();}catch{response=json({ok:false,error:'pipeline-unavailable'},503);}
    const body=await response.clone().json();
    const done={state:'done',owner,until:now()+(response.ok?60000:2500),status:response.status,body};
    if(!await kv.readingCAS(storageKey,expected,JSON.stringify(done),response.ok?60:3))return json({ok:false,error:'generation-lease-lost'},503);
    return response;
   }
  }
  if(now()>=deadline)return json({ok:false,error:'generation-in-progress',retryAfter:3},202);
  await sleep(pollMs);
 }
}
