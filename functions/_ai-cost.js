import {monitorProvider} from './_production-monitor.js';
import { kvOf } from './_store.js';

const count = n => Number.isFinite(n) && n >= 0 ? n : null;
export function tokenUsage(d) {
  const u=d?.usage || d?.usageMetadata;
  if(!u)return null;
  const anthropic=u.cache_read_input_tokens!=null || u.cache_creation_input_tokens!=null;
  return {input:count(anthropic ? (count(u.input_tokens)==null?null:u.input_tokens+(u.cache_read_input_tokens||0)+(u.cache_creation_input_tokens||0)) : u.input_tokens ?? u.promptTokenCount),output:count(u.output_tokens ?? (count(u.candidatesTokenCount)==null?null:u.candidatesTokenCount+(u.thoughtsTokenCount||0))),cached:count(u.input_tokens_details?.cached_tokens ?? u.cache_read_input_tokens ?? u.cachedContentTokenCount ?? 0),cacheWrite:count(u.cache_creation_input_tokens ?? 0)};
}
export function callCost(usage, rates) {
  if(!usage || !rates || usage.input==null || usage.output==null)return null;
  const {input,output,cached,cacheWrite}=usage;
  if(![rates.input,rates.output].every(n=>count(n)!=null) || cached+cacheWrite>input)return null;
  if(cached && count(rates.cached)==null || cacheWrite && count(rates.cacheWrite)==null)return null;
  return ((input-cached-cacheWrite)*rates.input+output*rates.output+cached*(rates.cached||0)+cacheWrite*(rates.cacheWrite||0))/1e6;
}
export async function writeAIEvent(env, record) {
  if(env.AI_COST_LOG_ON!=='1')return;
  try {const kv=kvOf(env);if(kv)await kv.put((record.scope==='reading-outcome'?'ai:outcome:':'ai:cost:')+record.at.slice(0,10)+':'+crypto.randomUUID(),JSON.stringify(record),{expirationTtl:93*86400});}
  catch {console.warn('ai-cost-ledger-write-failed');}
}
// Never persist request bodies, charts, text, provider errors, credentials or personal identifiers.
const costConfigs=new WeakMap();
async function costEnvironment(env){
 if(env.AI_COST_LOG_ON!=null)return env;
 const cached=costConfigs.get(env);if(cached&&cached.until>Date.now())return {...env,...cached.flags};
 try{const runtime=await kvOf(env)?.get('ik:blocks:runtime','json'),c=runtime?.config,flags={AI_COST_LOG_ON:c?.logging?'1':'0',AI_PRICING_JSON:env.AI_PRICING_JSON||JSON.stringify(c?.pricing||{})};costConfigs.set(env,{until:Date.now()+5000,flags});return {...env,...flags};}catch{return env;}
}
export async function aiFetch(env, scope, url, init) {
  env=await costEnvironment(env);
  if(env.AI_COST_LOG_ON!=='1' && !env.__AI_COST_COLLECTOR && !env.__AI_BEFORE_CALL){monitorProvider(env,scope);return fetch(url,init);}
  const started=Date.now();let response,usage=null,model='unknown',rates,requestBody;
  try {requestBody=typeof init?.body==='string'?JSON.parse(init.body):null;model=requestBody?.model || requestBody?.model_id || (typeof init?.body?.get==='function'?init.body.get('model'):null) || (url.match(/\/models\/([^/:?]+)/)||[])[1] || 'unknown';}catch{}
  try {rates=JSON.parse(env.AI_PRICING_JSON || '{}')[model];}catch{}
  const provider=url.includes('openai.com')?'openai':url.includes('anthropic.com')?'anthropic':url.includes('googleapis.com')?'google':url.includes('kling')?'kling':url.includes('elevenlabs.io')?'elevenlabs':'other';
  if(env.__AI_BEFORE_CALL)await env.__AI_BEFORE_CALL({scope,model,rates,requestBody});
  try {
    monitorProvider(env,scope);
    response=await fetch(url,init);
    if(scope!=='panelart' && (response.headers.get('content-type')||'').includes('json'))try{const d=await response.clone().json();usage=tokenUsage(d);}catch{}
    return response;
  } finally {
    const event={at:new Date().toISOString(),scope,provider,model:String(model).slice(0,120),ok:response?.ok===true,status:response?.status||0,requestId:env.__AI_CONTEXT?.requestId||null,chapter:env.__AI_CONTEXT?.chapter||null,elapsedMs:Date.now()-started,usage,costUSD:callCost(usage,rates),priceSource:rates?'deployment-configured':null};
    if(env.__AI_COST_COLLECTOR)env.__AI_COST_COLLECTOR(event);
    await writeAIEvent(env,event);
  }
}
export function summarizeAICost(events) {
  const s={calls:events.length,failed:0,pricedCalls:0,knownCostUSD:0,unpricedCalls:0,byModel:{},byScope:{},byChapter:{},billingVerified:false};
  for(const e of events){if(!e.ok)s.failed++;if(e.costUSD==null)s.unpricedCalls++;else{s.pricedCalls++;s.knownCostUSD+=e.costUSD;}for(const [target,key] of [[s.byModel,e.model],[s.byScope,e.scope],[s.byChapter,e.chapter||'unattributed']]){const r=target[key]||(target[key]={calls:0,knownCostUSD:0,unpricedCalls:0});r.calls++;if(e.costUSD==null)r.unpricedCalls++;else r.knownCostUSD+=e.costUSD;}}
  s.failureRate=s.calls?s.failed/s.calls:null;return s;
}
