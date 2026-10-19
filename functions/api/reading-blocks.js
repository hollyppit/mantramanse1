import { readCostPage } from '../_ai-cost-period.js';
import { tickReadingBlocks, measureApprovedBlocks, verifyEvidenceQueue } from '../_reading-block-runner.js';
import { RUNTIME_KEY, initialRuntime, updateRuntime, readingEnvironment } from '../_reading-block-store.js';
import { publishLibrary } from '../_reading-block-store.js';
import { json, isAdmin } from '../_lib.js';
import { kvOf } from '../_store.js';
import { blockKey, checkBlock, candidateBlocks, digest } from '../_reading-blocks.js';
import { loadSettings } from '../_interpretation-store.js';
import { summarizeAICost } from '../_ai-cost.js';
import { onRequestPost as writeChapter } from './movingtoon-reading.js';
const chapterOK=c=>typeof c==='string' && /^[\w.-]{1,80}$/.test(c) && !c.startsWith('library.');
export async function onRequest({request,env}){
 const initialURL=new URL(request.url),scheduler=['scheduled','measure','verify-evidence'].includes(initialURL.searchParams.get('a')) && request.method==='POST' && isAdmin(request,{ADMIN_PASSWORD:env.RAG_SCHEDULER_SECRET});
 if(!scheduler && !isAdmin(request,env))return json({error:'unauthorized'},401);
 env=await readingEnvironment(env);
 const kv=kvOf(env);if(!kv)return json({error:'storage-unavailable'},503);
 try{
  const url=new URL(request.url),action=url.searchParams.get('a')||'blocks';
  if(action==='verify-evidence' && request.method==='POST'){const raw=await request.text();if(raw.length>4000)return json({error:'too-large'},413);const b=JSON.parse(raw);if(b.historicalCoverage!=null&&!Array.isArray(b.historicalCoverage))return json({error:'invalid-historical-coverage'},400);return json(await verifyEvidenceQueue(env,b.sampleId,{historicalCoverage:b.historicalCoverage||[]}));}
  if(action==='measure' && request.method==='POST'){const raw=await request.text();if(raw.length>1000)return json({error:'too-large'},413);const b=JSON.parse(raw);if(!['baseline','blocks','hybrid'].includes(b.variant))return json({error:'invalid-variant'},400);return json({ok:true,...await (b.variant==='blocks'?measureApprovedBlocks(env,b.sampleId):tickReadingBlocks(env,{sampleId:b.sampleId,variant:b.variant}))});}
  if(action==='scheduled' && request.method==='POST')return json({ok:true,...await tickReadingBlocks(env)});
  if(action==='automation'){
   if(request.method==='GET')return json({ok:true,runtime:await kv.get(RUNTIME_KEY,'json')||initialRuntime()});
   if(request.method!=='POST')return json({error:'method-not-allowed'},405);
   const raw=await request.text();if(raw.length>1000000)return json({error:'too-large'},413);const input=JSON.parse(raw);
   const runtime=await updateRuntime(kv,s=>{
    if(input.expectRevision!==s.revision)throw Error('version-conflict');
    if(input.config){const c={...s.config,...input.config};for(const [key,max] of [['dailyBudget',10],['monthlyBudget',100],['taskBudget',5],...['measurementDailyBudget','measurementMonthlyBudget'].filter(k=>c[k]!=null).map(k=>[k,k==='measurementDailyBudget'?10:100])])if(!(typeof c[key]==='number' && c[key]>0 && c[key]<=max))throw Error('invalid-reading-budget');
     if(!['off','prefer'].includes(c.mode)||!['off','required'].includes(c.distributed)||typeof c.logging!=='boolean')throw Error('invalid-reading-mode');
     for(const [model,rates] of Object.entries(c.pricing||{}))if(!/^[a-zA-Z0-9_.-]{1,120}$/.test(model)||['input','output','cached','cacheWrite'].some(k=>rates[k]!=null&&(!Number.isFinite(rates[k])||rates[k]<0)))throw Error('invalid-reading-prices');
     if(!Number.isInteger(c.maxCallsPerTask)||c.maxCallsPerTask<1||c.maxCallsPerTask>12)throw Error('invalid-reading-call-limit');
     if(c.measurementMaxDailyTasks!=null && (!Number.isInteger(c.measurementMaxDailyTasks)||c.measurementMaxDailyTasks<1||c.measurementMaxDailyTasks>20))throw Error('invalid-measurement-task-limit');
     if(!Number.isInteger(c.maxDailyTasks)||c.maxDailyTasks<1||c.maxDailyTasks>50 || !Number.isInteger(c.maxBlocksPerTask)||c.maxBlocksPerTask<1||c.maxBlocksPerTask>60 || !Number.isInteger(c.maxRetries)||c.maxRetries<0||c.maxRetries>2 || typeof c.enabled!=='boolean' || typeof c.autoPublish!=='boolean')throw Error('invalid-reading-config');s.config=c;}
    if(input.charts){if(!input.charts||typeof input.charts!=='object'||Array.isArray(input.charts)||Object.keys(input.charts).length>20)throw Error('invalid-reading-charts');for(const [id,c] of Object.entries(input.charts))if(!/^[a-zA-Z0-9_.-]{1,80}$/.test(id)||!c.synthetic||!c.sd||c.sd.birth||c.sd.name)throw Error('synthetic-chart-required');s.charts=input.charts;}
    if(input.samples){if(!Array.isArray(input.samples)||input.samples.length>500)throw Error('invalid-reading-samples');for(const p of input.samples)if(!p.synthetic || !/^[a-zA-Z0-9_.-]{1,80}$/.test(p.id)||!(p.payload?.sd||s.charts?.[p.chartId]?.sd)||p.payload?.sd?.birth||p.payload?.sd?.name||p.payload.realityContext||!p.payload.chapter?.paragraphs?.length)throw Error('synthetic-chart-required');s.samples=input.samples;}
    return s;
   });return json({ok:true,runtime});
  }
  if(request.method==='GET' && action==='costs'){
   const period=url.searchParams.get('period')||new Date(Date.now()+9*3600000).toISOString().slice(0,10);
   if(!/^\d{4}-\d{2}(?:-\d{2})?$/.test(period))return json({error:'invalid-period'},400);
   const kind=url.searchParams.get('kind')==='outcomes'?'outcome':'cost';
   const page=await readCostPage(kv,{period,kind,cursor:url.searchParams.get('cursor'),timeZone:url.searchParams.get('timeZone')||'Asia/Seoul'}),rows=page.events;
   return json({ok:true,period,kind,...page,summary:kind==='cost'?summarizeAICost(rows):{requests:rows.length,cached:rows.filter(r=>r.cached).length,aiSkipped:rows.filter(r=>r.aiSkipped).length,failed:rows.filter(r=>!r.ok).length},scope:'this-page-only',loggingEnabled:env.AI_COST_LOG_ON==='1'});
  }
  const chapter=url.searchParams.get('chapter');if(!chapterOK(chapter))return json({error:'invalid-chapter'},400);
  const key=blockKey(chapter),blocks=await kv.get(key,'json')||[],revision=await digest(blocks);
  if(request.method==='GET')return json({ok:true,chapter,revision,blocks,mode:env.READING_BLOCK_MODE||'off',coverage:{total:blocks.length,approved:blocks.filter(b=>b.status==='approved').length,roles:[...new Set(blocks.filter(b=>b.status==='approved').map(b=>b.role))]},history:(await kv.get(key+':history','json')||[]).map(h=>({at:h.at,revision:h.revision}))});
  if(request.method!=='POST')return json({error:'method-not-allowed'},405);
  const raw=await request.text();if(raw.length>700000)return json({error:'too-large'},413);
  const body=JSON.parse(raw);if(body.expectRevision!==revision)return json({error:'version-conflict',revision},409);
  let next;
  if(action==='prebuild'){
   if(body.synthetic!==true || body.sample?.sd?.birth || body.sample?.sd?.name || Object.keys(body.sample?.realityContext||{}).length || body.sample?.chapter?.id!==chapter)return json({error:'synthetic-chart-required'},400);
   const settings=await loadSettings(kv);
   if(!(settings.maxRequestCost>0) || !(settings.inputPricePerMillion>0) || !(settings.outputPricePerMillion>0))return json({error:'prebuild-requires-configured-request-budget-and-prices'},409);
   const sample={sd:body.sample.sd,chapter:body.sample.chapter,outline:[]};
   const response=await writeChapter({env:{...env,__READING_ADMIN_GENERATION:true,READING_BLOCK_MODE:'off'},request:new Request(request.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(sample)})});
   const d=await response.json();if(!d.ok)return json({error:'prebuild-failed',failure:d.failure},422);
   if(!d.interpretation || !d.blockStyleSignature)return json({error:'grounded-prebuild-required'},422);
   const candidates=await candidateBlocks({clean:sample,analysis:d.interpretation,result:d.result,hook:d.hook,styleSignature:d.blockStyleSignature});
   next=[...blocks,...candidates.filter(b=>!blocks.some(o=>o.id===b.id))];
  }else if(action==='rollback'){
   const snapshot=(await kv.get(key+':history','json')||[]).find(h=>h.revision===body.revision);
   if(!snapshot)return json({error:'unknown-revision'},404);next=snapshot.blocks;
  }else{
   if(!Array.isArray(body.blocks)||body.blocks.length>500)return json({error:'invalid-blocks'},400);
   next=body.blocks;
  }
  if(next.length>500 || new Set(next.map(b=>b.id)).size!==next.length || next.some(b=>b.chapter!==chapter || !checkBlock(b).ok))return json({error:'invalid-block',issues:next.map(b=>({id:b.id,...checkBlock(b)})).filter(b=>!b.ok)},400);
  if(action!=='rollback')next=next.map(b=>{const old=blocks.find(x=>x.id===b.id);return {...b,version:old?Math.max(b.version,old.version+1):b.version,updatedAt:new Date().toISOString()};});
  const published=await publishLibrary(kv,chapter,next,revision);
  return json({ok:true,chapter,...published});
 }catch(e){return json({error:e.message==='version-conflict'?'version-conflict':'reading-blocks-unavailable'},e.message==='version-conflict'?409:503);}
}
