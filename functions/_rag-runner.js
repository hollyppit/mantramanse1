import { audit } from './_agentic-rag.js';
import { loadAll } from './_ikstore.js';
import { cleanItem, cleanConds, BANNED_RE, isProduction } from './_ik.js';
import { compareCandidate } from './_src.js';
import { DEFAULTS, readState, updateState, cleanConfig, dates, event, sourcePolicy } from './_rag-state.js';
import { searchWeb, collectDocument, extractKnowledge, extractionInput, EXTRACT_SYSTEM, riskyText } from './_rag-network.js';
import { researchView, recordHash } from './_rag-view.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const normalized=x=>JSON.stringify(ordered(x??{}));
function ordered(x){return Array.isArray(x)?x.map(ordered):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,ordered(x[k])])):x;}
const round=x=>Math.ceil(x*1e8)/1e8;
export function taskCeiling(c) {return round((c.maxSearches*c.searchPrice+c.maxDocs*c.documentPrice+(c.maxInputBytes+new TextEncoder().encode(EXTRACT_SYSTEM).length+4096)*c.inputPrice/1e6+c.maxOutputTokens*c.outputPrice/1e6)*(1+c.retries)+128*c.storagePricePerKB);}
function configured(c,env) {return !!(env.BRAVE_SEARCH_API_KEY&&(env.RAG_OPENAI_API_KEY||env.OPENAI_API_KEY)&&c.model&&c.inputPrice>0&&c.outputPrice>0&&c.searchPrice>0&&c.dailyBudget>0&&c.monthlyBudget>0&&c.taskBudget>0&&c.allowed.length);}
function ledger(s,key){return s.ledger[key]||(s.ledger[key]={reserved:0,spent:0,started:0});}
function reserve(s,task,c,now) {
  const d=dates(now),day=ledger(s,d.day),month=ledger(s,d.month),amount=taskCeiling(c);
  if(amount>c.taskBudget||day.reserved+day.spent+amount>c.dailyBudget||month.reserved+month.spent+amount>c.monthlyBudget||day.started>=c.maxTasks)throw Error('budget-limit');
  day.reserved=round(day.reserved+amount);month.reserved=round(month.reserved+amount);day.started++;month.started++;
  task.reservation={amount,day:d.day,month:d.month};task.cost=0;task.unknownCost=false;
}
function settle(s,t,c) {
  if(!t.reservation||t.settled)return;
  const outstanding=Math.max(0,t.cost-(t.accountedPrior||0));
  const cost=t.unknownCost?Math.max(outstanding,t.reservation.amount):round(outstanding+128*c.storagePricePerKB);
  if(cost>t.reservation.amount){s.config.enabled=false;event(s,'cost-bound-exceeded',{taskId:t.id,cost,reserved:t.reservation.amount});}
  for(const key of [t.reservation.day,t.reservation.month]){const l=ledger(s,key);l.reserved=Math.max(0,round(l.reserved-t.reservation.amount));l.spent=round(l.spent+cost);}
  t.accountedCost=round(cost+(t.accountedPrior||0));t.settled=true;
}
function moveReservation(s,t,c,now) {
  const d=dates(now),old=t.reservation;if(!old||old.day===d.day)return;
  const incurred=t.unknownCost?Math.max(0,t.cost-(t.accountedPrior||0),old.amount):Math.max(0,t.cost-(t.accountedPrior||0));
  const remaining=Math.max(0,round(old.amount-incurred)),day=ledger(s,d.day),month=ledger(s,d.month);
  const monthlyAfter=month.spent+month.reserved-(old.month===d.month?old.amount:0)+(old.month===d.month?incurred:0)+remaining;
  if(day.spent+day.reserved+remaining>c.dailyBudget||monthlyAfter>c.monthlyBudget||day.started>=c.maxTasks)throw Error('rollover-budget-limit');
  for(const key of [old.day,old.month]){const l=ledger(s,key);l.reserved=Math.max(0,round(l.reserved-old.amount));l.spent=round(l.spent+incurred);}
  day.reserved=round(day.reserved+remaining);month.reserved=round(month.reserved+remaining);day.started++;if(old.month!==d.month)month.started++;
  t.accountedPrior=round((t.accountedPrior||0)+incurred);t.reservation={amount:remaining,day:d.day,month:d.month};
  event(s,'reservation-rollover',{taskId:t.id,previous:old,next:t.reservation,incurred},'research-agent',now);
}
export async function saveConfig(kv,input,expectedRevision) {
  const cleaned=cleanConfig(input);return updateState(kv,s=>{if(s.revision!==expectedRevision)throw Error('settings-version-conflict');const prev=s.config;if(prev.legacyOnly!==cleaned.legacyOnly||normalized(prev.allowed)!==normalized(cleaned.allowed)||normalized(prev.blocked)!==normalized(cleaned.blocked))s.indexVersion=(s.indexVersion||0)+1;s.config=cleaned;event(s,'settings',{previous:prev,next:cleaned,reason:'관리자 연구 설정 변경'},'admin');return cleaned;});
}
export async function startResearch(kv,env,{scheduled=false,now=Date.now()}={}) {
  const id=crypto.randomUUID();
  const gate=await updateState(kv,s=>{
    const c=s.config,d=dates(now);
    if(!c.enabled||!configured(c,env))return {blocked:'research-disabled-or-unconfigured'};
    if(Object.values(s.jobs).some(j=>['planning','running','paused'].includes(j.state)))return {blocked:'run-already-active'};
    if(scheduled&&(d.time<c.time||s.lastDaily===d.day))return {blocked:'not-due'};
    s.jobs[id]={id,state:'planning',planningUntil:now+120000,createdAt:new Date(now).toISOString(),day:d.day,config:copy(c),tasks:[],actor:scheduled?'scheduler':'admin'};
    if(scheduled)s.lastDaily=d.day;
    event(s,'run-started',{runId:id,scheduled},scheduled?'scheduler':'admin',now);return {id};
  });
  if(gate.blocked)return gate;
  try {
    const report=await audit(kv),all=await loadAll(kv);
    await updateState(kv,s=>{
      const j=s.jobs[id],c=j.config;
      for(const row of report.rows.filter(r=>r.flags.some(f=>['evidence','source','conflict','conditions'].includes(f))).sort((a,b)=>b.priority-a.priority)) {
        if(j.tasks.length>=c.maxTasks)break;
        const target=all.find(x=>x.id===row.id);if(!target)continue;
        const recent=Object.values(s.jobs).flatMap(x=>x.tasks).some(t=>t.knowledgeId===target.id&&t.baseVersion===target.version&&['completed','failed'].includes(t.state)&&now-Date.parse(t.finishedAt)<c.cooldownDays*86400000);
        if(recent)continue;
        j.tasks.push({id:crypto.randomUUID(),knowledgeId:target.id,baseVersion:target.version,target:copy(target),priority:row.priority,flags:row.flags,stage:'search',state:'pending',searches:0,urls:[],documents:[],errors:[],attempt:0});
      }
      j.auditId=report.id;j.state=j.tasks.length?'running':'completed';if(!j.tasks.length)j.finishedAt=new Date(now).toISOString();
      event(s,'research-planned',{runId:id,auditId:report.id,knowledgeIds:j.tasks.map(t=>t.knowledgeId)},'research-agent',now);
    });
    return {id};
  }catch(e){await updateState(kv,s=>{s.jobs[id].state='failed';s.jobs[id].error=e.message;event(s,'planning-failed',{runId:id,error:e.message});});throw e;}
}

function semanticKey(x){return normalized({domain:x.domain,subDomain:x.subDomain||'',conditions:cleanConds(x.conditions),exclusions:cleanConds(x.exclusions),modifiers:x.modifiers||[],alsoWhen:x.alsoWhen||[],theory:x.theory||[],stance:x.stance||'neutral'});}
export async function validateExtraction(raw,target,docs,original,config) {
  let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('extractor-json-invalid');}
  if(parsed.kind==='unsupported')throw Error('no-supported-knowledge');
  if(!['evidence','conditions','exception','interpretation','definition','method'].includes(parsed.kind)||!parsed.item)throw Error('extraction-schema-invalid');
  const source=docs.find(d=>d.url===parsed.sourceUrl),quote=String(parsed.quote||'');
  if(!source||quote.length<12||quote.length>500||!source.text.includes(quote))throw Error('source-quote-not-found');
  const policy=sourcePolicy(source.url,config);
  if(riskyText(JSON.stringify(parsed))||BANNED_RE.test(JSON.stringify(parsed)))throw Error('unsafe-knowledge');
  const it=cleanItem({...parsed.item,id:'RAG-validation',sourceType:'research',reviewed:true,status:'published'},null);
  if(!it||!it.title||!it.principle||!it.interpretation||!Object.keys(it.conditions).length||it.status!=='published')throw Error('knowledge-conditions-or-content-invalid');
  // Never silently drop unknown conditions, exceptions or out-of-engine fields.
  if(normalized(parsed.item.conditions)!==normalized(it.conditions)||normalized(parsed.item.exclusions||{})!==normalized(it.exclusions))throw Error('unsupported-condition');
  const comparison=compareCandidate({suggested:{...it,domains:[it.domain]}},original);
  const same=semanticKey(it)===semanticKey(target)&&it.principle===target.principle&&it.interpretation===target.interpretation;
  const duplicate=original.find(x=>semanticKey(x)===semanticKey(it)&&x.principle===it.principle&&x.interpretation===it.interpretation);
  const core=/신강|신약|용신|조후|억부|격국|대운.*계산|세운.*계산|자미.*계산|공식|핵심\s*규칙/.test(JSON.stringify(parsed));
  let kind=parsed.kind,risk=3;
  // Automatic support requires the actual original conclusion in the source, not AI's same-meaning assertion.
  const supported=quote.includes(it.principle)&&quote.includes(it.interpretation);
  if(same||duplicate){kind='evidence';risk=1;}else if(parsed.kind==='definition'&&it.principle===quote&&it.interpretation===quote&&!core){risk=1;}else if(!core&&parsed.kind!=='method'){risk=2;}
  if(core&&kind!=='evidence')risk=3;
  const targetItem=duplicate||target;
  const exactDuplicate=duplicate||same;
  if(kind==='evidence'&&!exactDuplicate)risk=Math.max(risk,2);
  const newKnowledge=!exactDuplicate&&kind==='definition';
  const id=newKnowledge?'RAG-'+crypto.randomUUID():targetItem.id;
  const docId='rag-'+crypto.randomUUID().replace(/-/g,'').slice(0,24),at=new Date().toISOString();
  const evidence={docId,title:source.title||it.title,chunkId:'c1',quote,addedAt:at,pageStart:0,pageEnd:0,heading:source.url};
  const doc={id:docId,title:source.title||it.title,author:source.author,url:source.url,license:source.license,rightsUrl:source.rightsUrl,grade:source.grade,accessedAt:source.accessedAt,active:true,policy:{production:true},chunks:[{id:'c1',text:quote}]};
  const next=exactDuplicate?{...targetItem,evidence:[...(targetItem.evidence||[]),evidence],version:(targetItem.version||0)+1}:{...it,id,version:(newKnowledge?0:target.version||0)+1,evidence:[evidence]};
  const linked=exactDuplicate?targetItem:null;
  const ancillaryEmpty=['strengths','risks','behaviorPatterns','actions','strengthenActions','copingActions'].every(k=>!it[k]?.length)&&!Object.values(it.realWorldExamples||{}).some(Boolean)&&!it.modifiers.length&&!it.alsoWhen.length&&!Object.keys(it.exclusions).length;
  const conditionWords=Object.values(it.conditions).flatMap(v=>Array.isArray(v)?v:Object.values(v));
  const definitionSupported=newKnowledge&&comparison.status==='new'&&ancillaryEmpty&&conditionWords.every(v=>typeof v==='string'&&quote.includes(v));
  // Explicit owner opt-in permits conclusion/condition changes, without weakening grounding.
  // Every condition literal and both conclusions must occur in the cited passage.
  const changeAuthorized=!!(config.autoApproveChanges&&!exactDuplicate&&isProduction(target)&&ancillaryEmpty&&conditionWords.length&&conditionWords.every(v=>typeof v==='string'&&quote.includes(v)));
  const automatic=!!(supported&&policy.automaticSupport&&['A','B','C'].includes(policy.grade)&&((risk===1&&!comparison.conflict&&(!linked||isProduction(linked))&&(exactDuplicate||definitionSupported)&&!targetItem.modifiers?.length&&!targetItem.alsoWhen?.length)||changeAuthorized));
  const base=original.find(x=>x.id===id)||null;
  return {id:crypto.randomUUID(),knowledgeId:id,baseHash:await recordHash(base),baseVersion:base?.version||0,previous:base,next,kind,risk,comparison,source:doc,sources:[{url:source.url,quote,author:source.author,license:source.license,accessedAt:source.accessedAt}],reason:kind==='evidence'?'기존 결론을 보존하는 외부 원문 근거 추가':'새 조건·예외·해석 후보',actor:'research-agent',at,validation:{source:true,rights:true,quote:true,conditions:true,supported,changeAuthorized,automaticEligible:automatic,checksVersion:'rag-policy-3'},approval:automatic?'automatic_approved':'review_required',publication:'unpublished'};
}

function install(s,c,actor) {
  const previous=s.active[c.knowledgeId]||null;c.previousActive=previous;c.publication='published';c.publishedAt=new Date().toISOString();s.active[c.knowledgeId]=c.id;
  s.indexVersion=(s.indexVersion||0)+1;
  event(s,'published',{knowledgeId:c.knowledgeId,changeId:c.id,previousVersion:previous?s.candidates[previous].next:c.previous,nextVersion:c.next,sources:c.sources,reason:c.reason,indexVersion:s.indexVersion},actor);
}
function finishJob(s,j,now) {
  if(j.state!=='completed'&&j.tasks.every(t=>['completed','failed','cancelled'].includes(t.state))){j.state='completed';j.finishedAt=new Date(now).toISOString();event(s,'daily-report',{runId:j.id,completed:j.tasks.filter(t=>t.state==='completed').length,failed:j.tasks.filter(t=>t.state==='failed').length,accountedCost:j.tasks.reduce((n,t)=>n+(t.accountedCost||0),0)},'research-agent',now);}
}
export async function tickResearch(kv,env,{now=Date.now()}={}) {
  const token=crypto.randomUUID();
  const lease=await updateState(kv,s=>{
    if(!s.config.enabled)return {blocked:'research-stopped'};
    if(s.lock){if(s.lock.until>now)return {blocked:'run-busy'};return {blocked:'expired-step-needs-recovery'};}
    const job=Object.values(s.jobs).find(j=>j.state==='running');if(!job)return {blocked:'no-active-run'};
    const task=job.tasks.find(t=>!['completed','failed','cancelled'].includes(t.state));
    if(!task){job.state='completed';job.finishedAt=new Date(now).toISOString();event(s,'daily-report',{runId:job.id,completed:job.tasks.filter(t=>t.state==='completed').length,failed:job.tasks.filter(t=>t.state==='failed').length,accountedCost:job.tasks.reduce((n,t)=>n+(t.accountedCost||0),0)});return {completed:true};}
    try{if(!task.reservation)reserve(s,task,{...job.config,dailyBudget:s.config.dailyBudget,monthlyBudget:s.config.monthlyBudget,taskBudget:s.config.taskBudget,maxTasks:s.config.maxTasks},now);else moveReservation(s,task,s.config,now);}catch(e){job.state='budget_stopped';event(s,'budget-stopped',{runId:job.id,taskId:task.id,reason:e.message});return {blocked:'budget-limit'};}
    if(task.stage==='search'&&(task.searchRequests||0)>=job.config.maxSearches){if(task.urls.length)task.stage='fetch';else{task.state='failed';task.finishedAt=new Date(now).toISOString();settle(s,task,job.config);finishJob(s,job,now);return {taskId:task.id,state:'failed',reason:'search-request-limit'};}}
    if(task.stage==='search')task.searchRequests=(task.searchRequests||0)+1;
    task.state='running';s.lock={token,jobId:job.id,taskId:task.id,stage:task.stage,until:now+120000};
    return {job:copy(job),task:copy(task)};
  });
  if(lease.blocked||lease.completed||!lease.job)return lease;
  const {job,task}=lease,c=job.config;let result,cost=0,unknown=false;
  try {
    if(!configured(c,env))throw Error('research-provider-configuration-missing');
    const latest=await readState(kv);if(!latest.config.enabled)throw Error('research-stopped');
    if(task.stage==='search') {
      const p=c.allowed[task.searches%c.allowed.length],focus=task.searches===0?String(task.target.principle||'').slice(0,100):['적용 조건','예외','반대 근거','학파 차이'][task.searches-1],query=(task.target.title+' '+focus+' site:'+new URL(p.origin).hostname).slice(0,500);
      unknown=true;const hits=await searchWeb(env,query,c.maxDocs);cost=c.searchPrice;unknown=false;
      result={kind:'search',query,hits:hits.filter(x=>{try{sourcePolicy(x.url,c);return true;}catch{return false;}})};
    }else if(task.stage==='fetch') {
      const url=task.urls[task.documents.length+task.errors.filter(e=>e.stage==='fetch'&&!e.retry).length];
      sourcePolicy(url,latest.config);
      unknown=true;const doc=await collectDocument(url,c);cost=c.documentPrice;unknown=false;
      result={kind:'fetch',doc};
    }else if(task.stage==='extract') {
      const docs=task.documents.map(d=>({...d,text:d.text}));
      while(docs.length&&new TextEncoder().encode(extractionInput(task.target,docs)).length>c.maxInputBytes)docs.pop();
      if(!docs.length)throw Error('no-documents-within-input-limit');
      unknown=true;const extraction=await extractKnowledge(env,c,task.target,docs);
      const u=extraction.usage;
      if(u&&Number.isFinite(u.input_tokens)&&u.input_tokens>=0&&Number.isFinite(u.output_tokens)&&u.output_tokens>=0){cost=round((u.input_tokens*c.inputPrice+u.output_tokens*c.outputPrice)/1e6);unknown=false;}
      if(extraction.model!==c.model)throw Error('extractor-model-price-mismatch');
      result={kind:'extract',extraction,docs};
    }else if(task.stage==='validate') {
      const original=await loadAll(kv),snapshot=await readState(kv),view=await researchView(kv,original),target=view.items.find(x=>x.id===task.knowledgeId);
      if(!target||await recordHash(original.find(x=>x.id===task.knowledgeId)||null)!==await recordHash(task.target))throw Error('target-version-changed');
      const documents=task.documents.slice();let verifiedDocument=null,claimedURL;
      try{claimedURL=JSON.parse(task.extraction.text).sourceUrl;}catch{}
      if(typeof claimedURL==='string'&&!documents.some(d=>d.url===claimedURL)){
        if(documents.length>=c.maxDocs)throw Error('citation-document-limit');
        sourcePolicy(claimedURL,latest.config);
        unknown=true;verifiedDocument=await collectDocument(claimedURL,c);cost=c.documentPrice;unknown=false;documents.push(verifiedDocument);
      }
      const candidate=await validateExtraction(task.extraction.text,target,documents,view.items,c);
      candidate.baseHash=await recordHash(original.find(x=>x.id===candidate.knowledgeId)||null);candidate.previous=original.find(x=>x.id===candidate.knowledgeId)||null;
      candidate.expectedActive=snapshot.active[candidate.knowledgeId]||null;candidate.previousEffective=view.items.find(x=>x.id===candidate.knowledgeId)||null;
      result={kind:'validate',candidate,verifiedDocument};
    }else throw Error('invalid-research-stage');
  }catch(e){if(e.message==='extractor-model-price-mismatch')unknown=true;if(/upstream-http-(429|5\d\d)/.test(e.message)&&task.stage!=='extract'){unknown=false;cost=task.stage==='search'?c.searchPrice:c.documentPrice;}result={kind:'error',error:e.message};}
  return updateState(kv,s=>{
    if(s.lock?.token!==token)throw Error('research-lease-lost');
    const j=s.jobs[job.id],t=j.tasks.find(x=>x.id===task.id);s.lock=null;t.cost=round(t.cost+cost);if(unknown)t.unknownCost=true;
    if(result.kind==='error') {
      const retry=!unknown&&t.attempt<c.retries&&/upstream-http-(429|5\d\d)/.test(result.error);
      t.errors.push({stage:t.stage,error:result.error,retry,at:new Date(now).toISOString()});
      if(retry){t.attempt++;t.state='pending';}
      else if(t.stage==='fetch'&&!unknown){t.attempt=0;if(t.documents.length+t.errors.filter(e=>e.stage==='fetch'&&!e.retry).length>=Math.min(c.maxDocs,t.urls.length))t.stage=t.documents.length?'extract':'failed';if(t.stage==='failed')t.state='failed';}
      else t.state='failed';
      if(t.state==='failed'){t.finishedAt=new Date(now).toISOString();settle(s,t,c);}
      event(s,'step-failed',{runId:j.id,taskId:t.id,error:result.error,costUncertain:unknown});
    }else {
      t.attempt=0;
      if(result.kind==='search'){t.searches++;t.queries=[...(t.queries||[]),result.query];t.urls=[...new Set([...t.urls,...result.hits.map(x=>x.url)])].slice(0,c.maxDocs);if(t.searches>=c.maxSearches||t.urls.length>=c.maxDocs)t.stage=t.urls.length?'fetch':'failed';if(t.stage==='failed'){t.state='failed';t.finishedAt=new Date(now).toISOString();settle(s,t,c);}}
      if(result.kind==='fetch'){t.documents.push(result.doc);if(t.documents.length+t.errors.filter(e=>e.stage==='fetch'&&!e.retry).length>=Math.min(c.maxDocs,t.urls.length))t.stage='extract';}
      if(result.kind==='extract'){t.extraction=result.extraction;t.documents=result.docs;t.stage=result.extraction.completed?'validate':'failed';if(t.stage==='failed'){t.state='failed';t.finishedAt=new Date(now).toISOString();settle(s,t,c);}}
      if(result.kind==='validate'){
        if(result.verifiedDocument)t.documents.push(result.verifiedDocument);
        const candidate=result.candidate;candidate.runId=j.id;candidate.taskId=t.id;
        if((s.active[candidate.knowledgeId]||null)!==candidate.expectedActive){candidate.approval='review_required';candidate.validation.automaticEligible=false;candidate.validation.concurrentChange=true;}
        const already=Object.values(s.candidates).find(x=>x.knowledgeId===candidate.knowledgeId&&x.sources.some(e=>candidate.sources.some(n=>n.url===e.url&&n.quote===e.quote))&&x.publication==='published');
        if(!already){s.candidates[candidate.id]=candidate;event(s,'candidate-created',{runId:j.id,taskId:t.id,changeId:candidate.id,knowledgeId:candidate.knowledgeId,previousVersion:candidate.previous,nextVersion:candidate.next,sources:candidate.sources,reason:candidate.reason});let rights=false;try{sourcePolicy(candidate.sources[0].url,s.config);rights=true;}catch{}if(candidate.approval==='automatic_approved'&&c.autoPublish&&s.config.autoPublish&&s.config.enabled&&(!candidate.validation.changeAuthorized||s.config.autoApproveChanges)&&j.state!=='paused'&&!s.config.legacyOnly&&rights)install(s,candidate,'research-agent');}
        t.changeId=already?.id||candidate.id;t.state='completed';t.finishedAt=new Date(now).toISOString();settle(s,t,c);
      }
      event(s,'step-completed',{runId:j.id,taskId:t.id,stage:task.stage,nextStage:t.stage});
    }
    finishJob(s,j,now);
    return {runId:j.id,taskId:t.id,state:t.state,stage:t.stage};
  });
}

export async function controlResearch(kv,action,id,reason='관리자 요청') {
  return updateState(kv,s=>{
    if(action==='stop'){s.config.enabled=false;for(const j of Object.values(s.jobs))if(j.state==='running')j.state='paused';}
    else if(action==='resume'){const j=s.jobs[id];if(!j||!['paused','budget_stopped'].includes(j.state))throw Error('run-not-resumable');s.config.enabled=true;j.state='running';}
    else if(action==='recover'){
      if(!s.lock){const pending=Object.values(s.jobs).find(j=>j.state==='planning'&&j.planningUntil<Date.now());if(!pending)throw Error('no-expired-step');pending.state='failed';pending.error='planning-worker-expired';if(s.lastDaily===pending.day)s.lastDaily=null;}
      else{if(s.lock.until>Date.now())throw Error('no-expired-step');const j=s.jobs[s.lock.jobId],t=j.tasks.find(t=>t.id===s.lock.taskId);t.unknownCost=true;t.state='failed';t.finishedAt=new Date().toISOString();settle(s,t,j.config);s.lock=null;finishJob(s,j,Date.now());}
    }else throw Error('invalid-control');
    return event(s,action,{runId:id||null,reason},'admin');
  });
}
export async function publishCandidate(kv,id,expectedRevision,reason) {
  const all=await loadAll(kv);
  return updateState(kv,async s=>{
    if(s.revision!==expectedRevision)throw Error('research-version-conflict');const c=s.candidates[id];if(!c||c.publication==='published')throw Error('candidate-not-publishable');
    if(c.risk===3)throw Error('core-rule-requires-separate-regression-release');
    if((s.active[c.knowledgeId]||null)!==c.expectedActive)throw Error('active-research-version-changed');
    if(!reason?.trim())throw Error('approval-reason-required');
    if(c.baseHash!==await recordHash(all.find(x=>x.id===c.knowledgeId)||null))throw Error('target-version-changed');
    if(!c.validation.source||!c.validation.rights||!c.validation.quote||c.comparison.conflict)throw Error('candidate-validation-blocked');
    sourcePolicy(c.sources[0].url,s.config);c.approval='admin_approved';c.approvedAt=new Date().toISOString();c.reason=reason;install(s,c,'admin');return c;
  });
}
export async function rollbackCandidate(kv,id,expectedRevision,reason) {
  return updateState(kv,s=>{
    if(s.revision!==expectedRevision)throw Error('research-version-conflict');const c=s.candidates[id];
    if(!c||s.active[c.knowledgeId]!==id||c.publication!=='published')throw Error('rollback-current-version-required');if(!reason?.trim())throw Error('rollback-reason-required');
    const previous=c.previousActive?s.candidates[c.previousActive]:null;
    c.publication='rolled_back';if(previous&&previous.publication==='published')s.active[c.knowledgeId]=previous.id;else delete s.active[c.knowledgeId];
    s.indexVersion=(s.indexVersion||0)+1;
    return event(s,'rollback',{knowledgeId:c.knowledgeId,changeId:id,previousVersion:c.next,nextVersion:previous?.next||c.previous,sources:c.sources,reason,indexVersion:s.indexVersion},'admin');
  });
}
export async function scheduledResearch(kv,env,now=Date.now()) {const s=await readState(kv);const active=Object.values(s.jobs).some(j=>j.state==='running');return active?tickResearch(kv,env,{now}):startResearch(kv,env,{scheduled:true,now});}
export { DEFAULTS };
