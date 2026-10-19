export const STATE_KEY = 'ik:agentic:runtime';
export const DEFAULTS = { enabled:false, autoPublish:false, autoApproveChanges:false, legacyOnly:false, time:'03:00', dailyBudget:0, monthlyBudget:0, taskBudget:0, maxTasks:10, maxSearches:5, maxDocs:10, retries:2, cooldownDays:30, model:'', inputPrice:0, outputPrice:0, searchPrice:0, documentPrice:0, storagePricePerKB:0, maxInputBytes:24000, maxOutputTokens:2500, allowed:[], blocked:[] };
export const initialState = () => ({ schema:2, revision:0, indexVersion:0, config:{...DEFAULTS}, jobs:{}, candidates:{}, active:{}, events:[], ledger:{}, usage:{}, lastDaily:null, lock:null });
export async function readState(kv) { return (await kv?.get(STATE_KEY,'json')) || initialState(); }
export async function updateState(kv, mutate) {
  if (!kv?.researchCAS) throw Error('atomic-storage-required');
  for(let i=0;i<8;i++) {
    const raw=await kv.get(STATE_KEY), state=raw ? JSON.parse(raw) : initialState();
    const before=JSON.stringify(state),result=await mutate(state);
    if(JSON.stringify(state)===before)return result;
    state.revision++;
    const next=JSON.stringify(state); if(new TextEncoder().encode(next).length>7500000)throw Error('research-storage-limit-export-history-required');
    if(await kv.researchCAS(raw,next))return result;
  }
  throw Error('research-write-conflict');
}
export const dates = now => { const local=new Date(now+9*3600000).toISOString();return {day:local.slice(0,10),month:local.slice(0,7),time:local.slice(11,16)}; };
export function event(s,type,detail,actor='research-agent',now=Date.now()) { const row={id:crypto.randomUUID(),type,...detail,actor,at:new Date(now).toISOString()};s.events.push(row);return row; }
const bounded=(v,min,max,def)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:def;
export function cleanConfig(input) {
  const c={...DEFAULTS,...input};
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.time))throw Error('invalid-schedule-time');
  for(const k of ['enabled','autoPublish','autoApproveChanges','legacyOnly'])c[k]=c[k]===true;
  for(const k of ['dailyBudget','monthlyBudget','taskBudget','inputPrice','outputPrice','searchPrice','documentPrice','storagePricePerKB']) {if(typeof c[k]!=='number'||!Number.isFinite(c[k])||c[k]<0||c[k]>10000)throw Error('invalid-price-or-budget:'+k);}
  c.maxTasks=Math.floor(bounded(c.maxTasks,1,10,10));c.maxSearches=Math.floor(bounded(c.maxSearches,1,5,5));c.maxDocs=Math.floor(bounded(c.maxDocs,1,10,10));c.retries=Math.floor(bounded(c.retries,0,2,2));c.cooldownDays=bounded(c.cooldownDays,1,365,30);c.maxInputBytes=Math.floor(bounded(c.maxInputBytes,4000,24000,24000));c.maxOutputTokens=Math.floor(bounded(c.maxOutputTokens,512,4000,2500));
  c.model=String(c.model||'').trim().slice(0,100);
  c.allowed=(Array.isArray(c.allowed)?c.allowed:[]).slice(0,40).map(x=>{
    const u=new URL(x.origin);if(u.protocol!=='https:'||u.port||u.username||u.password||!publicHost(u.hostname)||u.pathname!=='/'||u.search||u.hash)throw Error('invalid-source-origin');
    if(!['A','B','C','D'].includes(x.grade))throw Error('invalid-source-grade');
    return {origin:u.origin,grade:x.grade,author:String(x.author||'').slice(0,120),license:String(x.license||'').slice(0,500),rightsUrl:String(x.rightsUrl||'').slice(0,1000),commercial:x.commercial===true,quote:x.quote===true,store:x.store===true,aiGenerated:x.aiGenerated===true,automaticSupport:x.automaticSupport===true};
  });
  c.blocked=(Array.isArray(c.blocked)?c.blocked:[]).map(x=>String(x).toLowerCase()).slice(0,100);
  return Object.fromEntries(Object.keys(DEFAULTS).map(k=>[k,c[k]]));
}
export function publicHost(host) {return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(host)&&!/(?:^|\.)(localhost|local|internal|test|invalid|example|lan|home|onion)$/i.test(host)&&!/(^|\.)\d+\./.test(host);}
export function sourcePolicy(url,c) {
  let u;try{u=new URL(url);}catch{throw Error('invalid-source-url');}
  if(u.protocol!=='https:'||u.port||u.username||u.password||!publicHost(u.hostname)||c.blocked.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))throw Error('blocked-source-url');
  const p=c.allowed.find(p=>p.origin===u.origin);
  if(!p||!p.commercial||!p.quote||!p.store||!p.license||!p.rightsUrl||!p.author||p.aiGenerated)throw Error('source-rights-not-approved');
  return p;
}

// Queue only evidence gaps, never private charts or prose. Keyed by chapter and rule.
export async function queueResearch(kv,knowledgeIds,chapter,options={}) {
 return queueResearchMany(kv,[{knowledgeIds,chapter}],options);
}
// Batch the existing gaps in one CAS transaction; never drop a chapter or alter research budgets.
export async function queueResearchMany(kv,gaps,{now=Date.now()}={}) {
 if(!kv?.researchCAS)return {queued:0};
 const requests=gaps.filter(g=>/^[\w.-]{1,80}$/.test(g.chapter||'')).map(g=>({chapter:g.chapter,ids:[...new Set(g.knowledgeIds||[])].filter(id=>typeof id==='string'&&/^[\w.-]{1,120}$/.test(id))}));
 if(!requests.length)return {queued:0};
 return updateState(kv,s=>{s.readingRequests ||= {};let queued=0;
  for(const {chapter,ids} of requests){const added=[];
   for(const id of ids){const key=chapter+':'+id;if(s.readingRequests[key])continue;if(Object.keys(s.readingRequests).length>=500)break;
    s.readingRequests[key]={knowledgeId:id,chapter,state:'pending',at:new Date(now).toISOString(),attempts:0};added.push(id);queued++;
   }
   if(added.length)event(s,'reading-evidence-queued',{chapter,knowledgeIds:added,queued:added.length},'reading-service',now);
  }
  return {queued};
 });
}
