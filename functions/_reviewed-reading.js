import {monitorReading,MONITOR_VERSION} from './_production-monitor.js';
import {json} from './_lib.js';
import {kvOf} from './_store.js';
import {loadServiceRules,blockedDocs} from './_ikstore.js';
import {loadSourceIndex,loadSettings} from './_interpretation-store.js';
import {analyze} from './_interpretation-engine.js';
import {Editorial,loadEditorial,contractFor,contractDomains} from './_editorial.js';
import {validate} from './_movingtoon-reading.js';
import {readLibrary,readPublishedLibrary,composeReviewed,LIBRARY_VERSION} from './_reviewed-library.js';
import {cleanAdviceHistory} from './_reading-advice.js';
import {HEALTH_EDUCATION,isHealthEducation} from './_health-education.js';
import {diagnosticRecord,saveDiagnostic} from './_reading-diagnostics.js';
import {seedPassageIds,SEED_INDEX_VERSION} from './_reading-seed-index.js';
import {seedPassages,SEED_VERSION} from './_reading-library-seed.js';
export async function prepareReviewed(env,body,{draft=false,passages=null,store:requestStore=null,timings={}}={}){
 const clean=validate(body);if(!clean)throw Error('bad-payload');
 const store=requestStore||kvOf(env);if(!store)throw Error('storage-unavailable');
 // Reuse identical reads only within this request; later requests always observe withdrawals and edits.
 const reads=new Map(),kv=new Proxy(store,{get(target,key){if(key==='get')return (id,type)=>{const k=id+'\0'+(type||'');if(!reads.has(k))reads.set(k,Promise.resolve().then(()=>!draft&&id==='ik:agentic:runtime'&&type==='json'&&target.readingResearchState?target.readingResearchState():target.get(id,type)));return reads.get(k);};const v=target[key];return typeof v==='function'?v.bind(target):v;}});
 // Independent metadata reads start together, scoped to this request only.
 let stageStarted=Date.now();const [catalog,blocked,settings]=await Promise.all([loadEditorial(kv,draft),blockedDocs(kv),loadSettings(kv),kv.get('ik:agentic:runtime','json').catch(()=>null)]);timings.catalog=Date.now()-stageStarted;const saved=Editorial.find(catalog,clean.chapter);
 if(!draft&&saved&&(saved.state==='archived'||catalog.topics.some(t=>t.id===saved.topicId&&!t.enabled)))throw Error('unknown-reviewed-chapter');
 const contract=draft&&saved?saved:contractFor(catalog,clean.chapter);
 if(!contract)throw Error('unknown-reviewed-chapter');
 stageStarted=Date.now();const [items,library]=await Promise.all([loadServiceRules(kv,contract.sourceRuleIds,contractDomains(catalog,contract)),draft?readLibrary(kv,contract.id):readPublishedLibrary(kv,contract.id)]);
 timings.core=Date.now()-stageStarted;stageStarted=Date.now();const sourceIndex=await loadSourceIndex(kv,items.filter(r=>contract.sourceRuleIds.includes(r.id)),blocked),linked=new Set(contract.sourceRuleIds);
 timings.sources=Date.now()-stageStarted;stageStarted=Date.now();const analysis=analyze(body.sd,items.filter(r=>linked.has(r.id)),{...settings,sourceIndex,blockedDocs:blocked,domains:contractDomains(catalog,contract)});
 if(passages){library.published=passages;library.preview=true;}else if(draft){library.published=library.draft;library.preview=true;}
 if(!draft){const have=new Set(library.published.map(p=>p.id)),ids=SEED_INDEX_VERSION===SEED_VERSION?seedPassageIds(contract):null;
  // Only IDs are inspected on complete publications. Rebuilding all reviewed prose here exhausted Worker CPU.
  // Missing or unknown editions retain the original fallback; no publication/source state is cached.
  if(!ids||ids.some(id=>!have.has(id)))library.published=[...library.published,...seedPassages(contract).filter(p=>!have.has(p.id))];
 }
 const usedAdviceKeys=(Array.isArray(body.usedAdviceKeys)?body.usedAdviceKeys:[]).filter(k=>typeof k==='string'&&/^[\w.-]{1,80}$/.test(k)).slice(0,512);
 const result=composeReviewed({clean,contract,analysis,library,usedAdviceKeys,adviceHistory:cleanAdviceHistory(body.adviceHistory,contract.id),previous:Array.isArray(body.previous)?body.previous.slice(-80):[]});
 if(isHealthEducation(contract)){
  // The current coherent guide already includes the educational context; keep the original supplement as references, not repeated body copy.
  result.pending=[];
 }
 timings.compose=Date.now()-stageStarted;return {ok:true,...result,conditionalParagraphCount:result.result.paragraphs.filter(p=>p.contentKind==='conditional-guide').length,provider:'reviewed-library',aiSkipped:true,cached:false,generatedParagraphCount:0,generation:{model:'none',usage:null,estimatedCost:0},chapterContractId:contract.id,editorialVersion:catalog.version,interpretation:{version:analysis.version,mode:'reviewed-only',claims:result.claims,features:analysis.features,cross_analysis:analysis.cross_analysis,warnings:analysis.warnings},hook:null,contentMode:'reviewed-only',seedVersion:SEED_VERSION,scopeNotice:contract.topicId==='creative'?'사주에서 빌린 상징을 넣은 창작 연작입니다. 실제 전생이나 과거의 사실을 확인한 내용이 아닙니다.':!result.claims.length&&result.result.paragraphs.some(p=>p.contentKind==='conditional-guide')?'계산 조건에 맞춰 고른 참고 조언입니다. 내 생활과 맞는 부분부터 써보세요.':!result.claims.length?'이 항목은 생활 속 예시와 참고 조언입니다. 실제 경험과 맞는 부분부터 골라 읽어주세요.':null};
}
export async function serveReviewed({request,env}){
 const context={requestId:crypto.randomUUID(),started:Date.now(),chapter:'',timings:{},synthetic:request.headers.has('x-release-verification')||request.headers.has('x-mantra-monitor')};
 try{const raw=await request.text();if(raw.length>160000)throw Error('too-large');let body;try{body=JSON.parse(raw);}catch{throw Error('bad-payload');}context.chapter=body.chapter?.id||'';context.expected=body.chapter?.paragraphs?.length;const value=await prepareReviewed(env,body,{timings:context.timings});const {claims,selectionTrace,...publicValue}=value;const payload={...publicValue,requestCostUSD:0,providerCallCount:0,requestId:context.requestId,libraryEngine:LIBRARY_VERSION};const tracked=monitorReading(env,context,payload,200,context.expected),response=json(payload);if(context.synthetic)response.headers.set('Server-Timing',Object.entries(context.timings).map(([k,v])=>k+';dur='+Math.max(0,v)).join(', '));response.headers.set('x-mantra-monitor',tracked?MONITOR_VERSION:'unavailable');return response;}
 catch(e){const known=['too-large','bad-payload','invalid-chart','unknown-hour-has-pillar','invalid-distribution','unknown-reviewed-chapter'],status=e.message==='too-large'?413:known.includes(e.message)?400:503,body={ok:false,error:known.includes(e.message)?e.message:'storage-unavailable',aiSkipped:true,providerCallCount:0,requestCostUSD:0},failure=diagnosticRecord(body,status,context);await saveDiagnostic(env,failure).catch(()=>{});const tracked=monitorReading(env,context,body,status,context.expected),response=json({...body,requestId:context.requestId,failure},status);response.headers.set('x-mantra-monitor',tracked?MONITOR_VERSION:'unavailable');return response;}
}
