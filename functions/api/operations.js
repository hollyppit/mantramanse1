// Authenticated operations console. GET is read-only; restore requires a reviewed, staged plan.
import { json, isAdmin } from '../_lib.js';
import { supabaseOn, operationsPage, operationsRead, operationsWrite } from '../_store.js';
import { onRequestPost as readingProbe } from './movingtoon-reading.js';
import { cleanAwakening, cleanIlgan } from '../_media.js';
const FORMAT='mantra-operations-backup', MAX_BYTES=12*1024*1024, MAX_RECORDS=6000, PLAN_TTL=3600;
const SKIP=/^ops:|^adminfail:|^rl:|^ai:|^compose:|^lifeai:|^ik:pkg:|^ik:ping$/;
export async function checksum(records){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(records)));return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function parallel(xs,fn){let at=0;const out=new Array(xs.length);await Promise.all(Array.from({length:Math.min(6,xs.length)},async()=>{while(at<xs.length){const i=at++;out[i]=await fn(xs[i],i);}}));return out;}
const hex=x=>typeof x==='string'?x:Array.from(new Uint8Array(x||[])).map(n=>n.toString(16).padStart(2,'0')).join('');
function sameBinary(head,f){return !!(head && head.size===f.size && (f.etag && head.etag===f.etag || f.sha256 && hex(head.checksums?.sha256)===f.sha256));}
async function binaryState(env,files){if(files.length&&!env.CLIPS_R2)throw Error('r2-unavailable');return parallel(files,async f=>{const h=await env.CLIPS_R2.head(f.key);return {key:f.key,file:f.file,status:!h?'missing':sameBinary(h,f)?'same':'conflict',size:f.size};});}
async function status(env){const raw=env.GLOSSARY_KV,awk=await raw.get('awakening:index','json')||{},records=(awk.videos||[]).map(cleanAwakening).filter(Boolean),ilgan=(awk.ilgan||[]).map(cleanIlgan).filter(Boolean),cells=[];const ss='갑을병정무기경신임계',bs='자축인묘진사오미신유술해';for(let i=0;i<60;i++)for(const gender of ['M','F']){const pillar=ss[i%10]+bs[i%12],v=records.find(x=>x.dayPillar===pillar&&x.gender===gender);cells.push({pillar,gender,status:v?.enabled&&(v.videoUrl||v.videoWebm)?'video':v?.enabled&&v.posterUrl?'poster':v?'disabled':'missing'});}
return {backend:supabaseOn(env)?'supabase+kv':'kv',r2Bound:!!env.CLIPS_R2,ai:{openai:!!env.OPENAI_API_KEY,anthropic:!!env.ANTHROPIC_API_KEY},videos:{total:120,connected:cells.filter(x=>x.status==='video').length,cells,ilgan:ilgan.filter(x=>x.enabled&&(x.videoUrl||x.videoWebm)).length},backup:{stores:supabaseOn(env)?['kv','supabase']:['kv'],maxBytes:MAX_BYTES,maxRecords:MAX_RECORDS,scope:'persistent-server-data',assets:'R2 metadata manifest; binary files remain in R2',localProfiles:'device-only profiles are not stored on the server'}};}
export async function onRequest({request,env}) {
 if(!isAdmin(request,env))return json({error:'관리자 인증이 필요합니다'},401);
 if(!env.GLOSSARY_KV)return json({error:'저장소 연결이 필요합니다'},503);
 const q=new URL(request.url).searchParams,a=q.get('a')||'status';
 try {
  if(request.method==='GET') {
   if(a==='r2-object'){if(!env.CLIPS_R2)return json({error:'원본 저장소 연결이 필요합니다'},503);const key=q.get('key')||'',etag=q.get('etag');if(!key||key.length>1024)return json({error:'잘못된 파일'},400);const obj=await env.CLIPS_R2.get(key,etag?{onlyIf:{etagMatches:etag}}:undefined);if(!obj)return json({error:'원본 파일이 없습니다'},404);if(!obj.body)return json({error:'백업 중 원본이 바뀌었습니다. 다시 시작하세요'},412);return new Response(obj.body,{headers:{'content-type':obj.httpMetadata?.contentType||'application/octet-stream','content-length':String(obj.size),'cache-control':'no-store'}});}
   if(a==='status')return json(await status(env));
   if(a==='backup-page')return json(await operationsPage(env,q.get('store')||'kv',q.get('cursor')||''));
   if(a==='r2-manifest'){if(!env.CLIPS_R2)return json({objects:[],complete:true,available:false});const p=await env.CLIPS_R2.list({limit:200,cursor:q.get('cursor')||undefined,include:['httpMetadata','customMetadata']});return json({available:true,complete:!p.truncated,cursor:p.cursor||'',objects:p.objects.map(x=>({key:x.key,size:x.size,etag:x.etag,uploaded:x.uploaded,httpMetadata:x.httpMetadata,customMetadata:x.customMetadata}))});}
   if(a==='rollback'){const token=q.get('token');if(!/^[a-f0-9-]{36}$/.test(token||''))return json({error:'잘못된 복구 항목'},400);const d=await env.GLOSSARY_KV.get('ops:undo:'+token,'json');return d?json(d):json({error:'복구 전 백업이 만료되었습니다'},404);}
   return json({error:'알 수 없는 작업'},400);
  }
  if(request.method==='PUT'&&a==='r2-restore'){
   const token=q.get('token'),index=Number(q.get('index'));if(!/^[a-f0-9-]{36}$/.test(token||'')||!Number.isInteger(index))return json({error:'파일 복구 미리보기가 필요합니다'},400);
   const plan=await env.GLOSSARY_KV.get('ops:plan:'+token,'json'),f=plan?.files?.[index];if(!f||!env.CLIPS_R2)return json({error:'복구 계획이나 저장소를 확인하세요'},410);
   const head=await env.CLIPS_R2.head(f.key);if(head)return sameBinary(head,f)?json({ok:true,skipped:true}):json({error:'현재 다른 원본이 있어 덮어쓰지 않았습니다'},409);
   const length=Number(request.headers.get('content-length'));if(!request.body||length!==f.size||length>90*1024*1024)return json({error:'파일 크기가 다르거나 90MB를 넘습니다'},413);
   const obj=await env.CLIPS_R2.put(f.key,request.body,{onlyIf:new Headers({'if-none-match':'*'}),httpMetadata:f.httpMetadata||{},customMetadata:f.customMetadata||{},...(f.sha256?{sha256:f.sha256}:{})});if(!obj)return json({error:'복구 중 원본이 추가되어 덮어쓰지 않았습니다'},409);return json({ok:true,key:f.key});
  }
  if(request.method!=='POST')return json({error:'method'},405);
  const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>MAX_BYTES)return json({error:'백업 파일은 12MB 이하여야 합니다'},413);let b;try{b=JSON.parse(raw)}catch{return json({error:'잘못된 JSON 파일'},400)}
  if(a==='ai-probe') { const started=Date.now(),response=await readingProbe({env,request:new Request('http://internal/api/movingtoon-reading',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':request.headers.get('cf-connecting-ip')||'admin-probe'},body:JSON.stringify(b.sample||{})})});const data=await response.json();return json({...data,probeElapsedMs:Date.now()-started},response.status); }
  if(a==='preview') {
   const snap=b.snapshot;if(!snap||snap.format!==FORMAT||snap.version!==1||!Array.isArray(snap.records)||snap.records.length>MAX_RECORDS)return json({error:'지원되는 만트라 백업 파일이 아닙니다'},400);
   if(await checksum(snap.records)!==snap.checksum)return json({error:'백업 무결성 검사가 실패했습니다'},400);
   if(snap.assets?.backupComplete===false)return json({error:'원본 폴더 백업이 완료되지 않은 파일입니다'},400);
   let files=[];if(snap.assets?.binaryIncluded){files=snap.assets.files;if(!Array.isArray(files)||files.length>6000||await checksum(files)!==snap.assetChecksum)return json({error:'원본 파일 명세를 확인하세요'},400);const names=new Set();for(const f of files){if(!f||typeof f.key!=='string'||!f.key||f.key.length>1024||names.has(f.key)||!Number.isInteger(f.size)||f.size<0||!(/^[a-f0-9]{64}\.[a-z0-9]{1,12}$/i.test(f.file||''))||!(/^[a-f0-9]{64}$/i.test(f.sha256||'')))return json({error:'원본 파일 명세가 올바르지 않습니다'},400);names.add(f.key);}}
   const binaries=await binaryState(env,files);
   const seen=new Set();for(const r of snap.records){if(!r || typeof r!=='object' || Array.isArray(r) || r.missing && snap.kind!=='rollback')return json({error:'복구 항목 형식을 확인하세요'},400);const id=r.store+':'+r.key;if(!['kv','supabase'].includes(r.store)||r.store==='supabase'&&!supabaseOn(env)||typeof r.key!=='string'||r.key.length<1||r.key.length>512||SKIP.test(r.key)||seen.has(id)||!(r.missing===true&&r.value===null||typeof r.value==='string'||r.store==='supabase'&&r.value===null)||r.expiration!=null&&(!Number.isFinite(r.expiration)||r.expiration<0))return json({error:'백업 키·저장소·값을 확인하세요'},400);seen.add(id);}
   const entries=snap.records.filter(r=>!r.expiration||r.expiration>Date.now()/1000),before=await parallel(entries,r=>operationsRead(env,r.store,r.key)),expected=await parallel(before,x=>checksum(x));
   const changes=entries.map((r,i)=>({store:r.store,key:r.key,change:r.missing?(before[i].missing?'same':'delete'):before[i].missing?'create':before[i].value===r.value&&before[i].expiration===(r.expiration||null)?'same':'replace'}));
   const token=crypto.randomUUID(),undo={format:FORMAT,version:1,kind:'rollback',createdAt:new Date().toISOString(),records:before};undo.checksum=await checksum(before);
   const plan={entries,before,expected,files,next:0,createdAt:undo.createdAt};if(new TextEncoder().encode(JSON.stringify(plan)).byteLength>24*1024*1024)return json({error:'현재 데이터가 커서 분할 백업이 필요합니다'},413);
   await env.GLOSSARY_KV.put('ops:plan:'+token,JSON.stringify(plan),{expirationTtl:PLAN_TTL});await env.GLOSSARY_KV.put('ops:undo:'+token,JSON.stringify(undo),{expirationTtl:PLAN_TTL});
   return json({token,changes,binaries,expired:snap.records.length-entries.length,total:entries.length,expiresIn:PLAN_TTL,rollbackAvailable:true});
  }
  if(a==='apply') {
   if(!/^[a-f0-9-]{36}$/.test(b.token||''))return json({error:'복구 미리보기가 필요합니다'},400);
   const key='ops:plan:'+b.token,p=await env.GLOSSARY_KV.get(key,'json');if(!p)return json({error:'미리보기가 만료되었습니다. 다시 검사하세요'},410);
   const progress=await env.GLOSSARY_KV.get('ops:cursor:'+b.token,'json');if(progress)p.next=progress.next; if(b.offset!==p.next)return json({error:'복구 순서를 다시 확인하세요'},409);
   if(p.next===0&&p.files?.length){const binary=await binaryState(env,p.files);if(binary.some(x=>x.status!=='same'))return json({error:'누락되거나 다른 원본이 있습니다. 파일을 먼저 복원하세요',binaries:binary},409);}
   const from=p.next,to=Math.min(from+40,p.entries.length),current=await parallel(p.entries.slice(from,to),r=>operationsRead(env,r.store,r.key));
   for(let i=0;i<current.length;i++)if(await checksum(current[i])!==p.expected[from+i])return json({error:'검사 이후 데이터가 바뀌었습니다. 다시 미리보기하세요',key:p.entries[from+i].key},409);
   const touched=[];try{for(let i=from;i<to;i++){touched.push(i);await operationsWrite(env,p.entries[i]);}await env.GLOSSARY_KV.put('ops:cursor:'+b.token,JSON.stringify({next:to}),{expirationTtl:PLAN_TTL});}catch{let recovered=true;for(const i of touched.reverse())try{await operationsWrite(env,p.before[i])}catch{recovered=false}return json({error:recovered?'저장 실패로 이번 묶음을 되돌렸습니다':'저장 실패. 복구 전 백업으로 확인이 필요합니다',recovered,token:b.token},503);}
   return json({ok:true,done:to===p.entries.length,processed:to,total:p.entries.length,token:b.token});
  }
  return json({error:'알 수 없는 작업'},400);
 }catch{return json({error:'저장소 조회·처리를 완료하지 못했습니다'},503);}
}
