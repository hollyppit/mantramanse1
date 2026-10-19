import { queueResearch } from './_rag-state.js';
import { digest, blockKey } from './_reading-blocks.js';
export const RUNTIME_KEY='ik:blocks:runtime';
export const initialRuntime=()=>({revision:0,config:{enabled:false,autoPublish:false,mode:'off',distributed:'off',logging:false,pricing:{},dailyBudget:1,monthlyBudget:10,taskBudget:0.25,maxDailyTasks:4,maxBlocksPerTask:12,maxRetries:1,maxCallsPerTask:8},charts:{},samples:[],tasks:{},gaps:{},ledger:{},sourceVersion:null,events:[]});
export async function updateRuntime(kv,mutate){
 if(!kv?.readingCAS)throw Error('reading-atomic-storage-required');
 for(let attempt=0;attempt<12;attempt++){
  const raw=await kv.get(RUNTIME_KEY),s=raw?JSON.parse(raw):initialRuntime(),before=JSON.stringify(s),result=await mutate(s);
  if(before===JSON.stringify(s))return result;s.revision++;
  if(await kv.readingCAS(RUNTIME_KEY,raw,JSON.stringify(s)))return result;
 }throw Error('reading-write-conflict');
}
export async function publishLibrary(kv,chapter,next,expectedRevision){
 const key=blockKey(chapter),raw=await kv.get(key),old=raw?JSON.parse(raw):[];
 if(await digest(old)!==expectedRevision)throw Error('version-conflict');
 if(kv.readingCAS){if(!await kv.readingCAS(key,raw,JSON.stringify(next)))throw Error('version-conflict');}
 else {await kv.put(key,JSON.stringify(next));}
 const historyKey=key+':history';
 for(let attempt=0;attempt<12;attempt++){
  const before=await kv.get(historyKey),history=before?JSON.parse(before):[],value=JSON.stringify([{at:new Date().toISOString(),revision:expectedRevision,blocks:old},...history.filter(h=>h.revision!==expectedRevision)].slice(0,20));
  if(!kv.readingCAS){await kv.put(historyKey,value);break;}
  if(await kv.readingCAS(historyKey,before,value))break;
  if(attempt===11)throw Error('history-write-conflict');
 }
 return {blocks:next,revision:await digest(next)};
}
// Historical experiment costs stay visible but no longer consume production slots/budgets.
export function separateMeasurementLedger(s) {
 if(s.ledgerVersion===2)return;
 s.measurementLedger ||= {};
 for(const t of Object.values(s.tasks || {})){
  t.traffic ||= t.id?.startsWith('measurement:')?'benchmark':'prebuild';
  if(t.traffic!=='benchmark'||!t.reservation||t.accountingLane==='benchmark')continue;
  const amount=t.state==='running'?t.reservation.amount:0,cost=t.accountedUSD ?? t.costUSD ?? (t.state==='running'?0:t.reservation.amount);
  for(const period of [t.reservation.day,t.reservation.month]){
   const old=s.ledger[period] ||= {spent:0,reserved:0,started:0},next=s.measurementLedger[period] ||= {spent:0,reserved:0,started:0};
   old.started=Math.max(0,old.started-1);old.spent=Math.max(0,old.spent-cost);old.reserved=Math.max(0,old.reserved-amount);
   next.started++;next.spent+=cost;next.reserved+=amount;
  }
  t.accountingLane='benchmark';
 }
 s.ledgerVersion=2;
}
export async function recordGap(kv,{chapter,claims=[],missing=[],reason='block-gap'}){
 if(!kv?.readingCAS)return;
 const knowledgeIds=[...new Set(claims.map(c=>c.knowledge_id))].sort();
 const id=await digest({chapter,knowledgeIds,missing,reason});
 await updateRuntime(kv,s=>{
  const old=s.gaps[id];if(old){old.count++;old.lastSeen=new Date().toISOString();return;}
  if(Object.keys(s.gaps).length>=500)return;
  s.gaps[id]={id,chapter,knowledgeIds,missing,reason,count:1,createdAt:new Date().toISOString()};
 });
 // Register immediately, independently of production budgets and scheduler cadence.
 if(reason==='insufficient-evidence')await queueResearch(kv,knowledgeIds,chapter);
}

export async function readingEnvironment(env){
 const kv=(await import('./_store.js')).kvOf(env),runtime=kv?await kv.get(RUNTIME_KEY,'json'):null,c=runtime?.config||{};
 return {...env,READING_BLOCK_MODE:env.READING_BLOCK_MODE||c.mode||'off',READING_DISTRIBUTED:env.READING_DISTRIBUTED||c.distributed||'off',AI_COST_LOG_ON:env.AI_COST_LOG_ON||(c.logging?'1':'0'),AI_PRICING_JSON:env.AI_PRICING_JSON||JSON.stringify(c.pricing||{})};
}

export async function recordCoverageGap(kv,{chapter,claims=[],coverage=[]}){
 const missing=coverage.filter(row=>row.status==='missing-evidence');if(!missing.length)return;
 const ids=new Set(missing.flatMap(row=>row.claim_ids||[]));
 const relevant=claims.filter(c=>ids.has(c.claim_id)||ids.has(c.knowledge_id));
 return recordGap(kv,{chapter,claims:relevant.length?relevant:claims,missing:missing.map(row=>row.item),reason:'insufficient-evidence'});
}
