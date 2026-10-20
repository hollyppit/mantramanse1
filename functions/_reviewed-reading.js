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
import {seedPassages,SEED_VERSION} from './_reading-library-seed.js';
export async function prepareReviewed(env,body,{draft=false,passages=null,store:requestStore=null}={}){
 const clean=validate(body);if(!clean)throw Error('bad-payload');
 const store=requestStore||kvOf(env);if(!store)throw Error('storage-unavailable');
 // Reuse identical reads only within this request; later requests always observe withdrawals and edits.
 const reads=new Map(),kv=new Proxy(store,{get(target,key){if(key==='get')return (id,type)=>{const k=id+'\0'+(type||'');if(!reads.has(k))reads.set(k,Promise.resolve().then(()=>!draft&&id==='ik:agentic:runtime'&&type==='json'&&target.readingResearchState?target.readingResearchState():target.get(id,type)));return reads.get(k);};const v=target[key];return typeof v==='function'?v.bind(target):v;}});
 const catalog=await loadEditorial(kv,draft),saved=Editorial.find(catalog,clean.chapter);
 if(!draft&&saved&&(saved.state==='archived'||catalog.topics.some(t=>t.id===saved.topicId&&!t.enabled)))throw Error('unknown-reviewed-chapter');
 const contract=draft&&saved?saved:contractFor(catalog,clean.chapter);
 if(!contract)throw Error('unknown-reviewed-chapter');
 const [items,blocked,settings,library]=await Promise.all([loadServiceRules(kv,contract.sourceRuleIds,contractDomains(catalog,contract)),blockedDocs(kv),loadSettings(kv),draft?readLibrary(kv,contract.id):readPublishedLibrary(kv,contract.id)]);
 const sourceIndex=await loadSourceIndex(kv,items.filter(r=>contract.sourceRuleIds.includes(r.id)),blocked),linked=new Set(contract.sourceRuleIds);
 const analysis=analyze(body.sd,items.filter(r=>linked.has(r.id)),{...settings,sourceIndex,blockedDocs:blocked,domains:contractDomains(catalog,contract)});
 if(passages){library.published=passages;library.preview=true;}else if(draft){library.published=library.draft;library.preview=true;}
 if(!draft){const have=new Set(library.published.map(p=>p.id));library.published=[...library.published,...seedPassages(contract).filter(p=>!have.has(p.id))];}
 const usedAdviceKeys=(Array.isArray(body.usedAdviceKeys)?body.usedAdviceKeys:[]).filter(k=>typeof k==='string'&&/^[\w.-]{1,80}$/.test(k)).slice(0,512);
 const result=composeReviewed({clean,contract,analysis,library,usedAdviceKeys,adviceHistory:cleanAdviceHistory(body.adviceHistory,contract.id),previous:Array.isArray(body.previous)?body.previous.slice(-80):[]});
 if(isHealthEducation(contract)){
  // The current coherent guide already includes the educational context; keep the original supplement as references, not repeated body copy.
  result.pending=[];
 }
 return {ok:true,...result,conditionalParagraphCount:result.result.paragraphs.filter(p=>p.contentKind==='conditional-guide').length,provider:'reviewed-library',aiSkipped:true,cached:false,generatedParagraphCount:0,generation:{model:'none',usage:null,estimatedCost:0},chapterContractId:contract.id,editorialVersion:catalog.version,interpretation:{version:analysis.version,mode:'reviewed-only',claims:result.claims,features:analysis.features,cross_analysis:analysis.cross_analysis,warnings:analysis.warnings},hook:null,contentMode:'reviewed-only',seedVersion:SEED_VERSION,scopeNotice:contract.topicId==='creative'?'사주에서 빌린 상징을 넣은 창작 연작입니다. 실제 전생이나 과거의 사실을 확인한 내용이 아닙니다.':!result.claims.length&&result.result.paragraphs.some(p=>p.contentKind==='conditional-guide')?'계산 조건에 맞춰 고른 참고 조언입니다. 내 생활과 맞는 부분부터 써보세요.':!result.claims.length?'이 항목은 생활 속 예시와 참고 조언입니다. 실제 경험과 맞는 부분부터 골라 읽어주세요.':null};
}
export async function serveReviewed({request,env}){
 const context={requestId:crypto.randomUUID(),started:Date.now(),chapter:''};
 try{const raw=await request.text();if(raw.length>160000)throw Error('too-large');let body;try{body=JSON.parse(raw);}catch{throw Error('bad-payload');}context.chapter=body.chapter?.id||'';const value=await prepareReviewed(env,body);const {claims,...publicValue}=value;return json({...publicValue,requestCostUSD:0,providerCallCount:0,requestId:context.requestId,libraryEngine:LIBRARY_VERSION});}
 catch(e){const known=['too-large','bad-payload','invalid-chart','unknown-hour-has-pillar','invalid-distribution','unknown-reviewed-chapter'],status=e.message==='too-large'?413:known.includes(e.message)?400:503,body={ok:false,error:known.includes(e.message)?e.message:'storage-unavailable',aiSkipped:true,providerCallCount:0,requestCostUSD:0},failure=diagnosticRecord(body,status,context);await saveDiagnostic(env,failure).catch(()=>{});return json({...body,requestId:context.requestId,failure},status);}
}
