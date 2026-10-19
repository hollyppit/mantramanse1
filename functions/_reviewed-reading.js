import {json} from './_lib.js';
import {kvOf} from './_store.js';
import {loadServiceAll,blockedDocs} from './_ikstore.js';
import {loadSourceIndex,loadSettings} from './_interpretation-store.js';
import {analyze} from './_interpretation-engine.js';
import {Editorial,loadEditorial,contractFor,contractDomains} from './_editorial.js';
import {validate} from './_movingtoon-reading.js';
import {readLibrary,composeReviewed,LIBRARY_VERSION} from './_reviewed-library.js';
import {cleanAdviceHistory} from './_reading-advice.js';
import {HEALTH_EDUCATION,isHealthEducation} from './_health-education.js';
import {diagnosticRecord,saveDiagnostic} from './_reading-diagnostics.js';
import {seedPassages,SEED_VERSION} from './_reading-library-seed.js';
export async function prepareReviewed(env,body,{draft=false,passages=null}={}){
 const clean=validate(body);if(!clean)throw Error('bad-payload');
 const kv=kvOf(env);if(!kv)throw Error('storage-unavailable');
 const catalog=await loadEditorial(kv,draft),saved=Editorial.find(catalog,clean.chapter);
 if(!draft&&saved&&(saved.state==='archived'||catalog.topics.some(t=>t.id===saved.topicId&&!t.enabled)))throw Error('unknown-reviewed-chapter');
 const contract=draft&&saved?saved:contractFor(catalog,clean.chapter);
 if(!contract)throw Error('unknown-reviewed-chapter');
 const [items,blocked,settings,library]=await Promise.all([loadServiceAll(kv,contractDomains(catalog,contract)),blockedDocs(kv),loadSettings(kv),readLibrary(kv,contract.id)]);
 const sourceIndex=await loadSourceIndex(kv,items.filter(r=>contract.sourceRuleIds.includes(r.id)),blocked),linked=new Set(contract.sourceRuleIds);
 const analysis=analyze(body.sd,items.filter(r=>linked.has(r.id)),{...settings,sourceIndex,blockedDocs:blocked,domains:contractDomains(catalog,contract)});
 if(passages){library.published=passages;library.preview=true;}else if(draft){library.published=library.draft;library.preview=true;}
 if(!draft){const have=new Set(library.published.map(p=>p.id));library.published=[...library.published,...seedPassages(contract).filter(p=>!have.has(p.id))];}
 const usedAdviceKeys=(Array.isArray(body.usedAdviceKeys)?body.usedAdviceKeys:[]).filter(k=>typeof k==='string'&&/^[\w.-]{1,80}$/.test(k)).slice(0,512);
 const result=composeReviewed({clean,contract,analysis,library,usedAdviceKeys,adviceHistory:cleanAdviceHistory(body.adviceHistory,contract.id),previous:Array.isArray(body.previous)?body.previous.slice(-80):[]});
 if(isHealthEducation(contract)){
  const edu=HEALTH_EDUCATION.chapters.find(c=>c.id===contract.id);
  const texts=(edu.paragraphs||[]).map(p=>p.text);if(texts.length){result.pending=[];result.result.paragraphs=result.result.paragraphs.map(p=>p.role==='title'||p.role==='reality'?{...p,text:p.text+'\n\n'+texts[p.role==='title'?0:Math.min(1,texts.length-1)],claim_ids:[],refs:[],contentKind:'education'}:p);}
 }
 return {ok:true,...result,provider:'reviewed-library',aiSkipped:true,cached:false,generatedParagraphCount:0,generation:{model:'none',usage:null,estimatedCost:0},chapterContractId:contract.id,editorialVersion:catalog.version,interpretation:{version:analysis.version,mode:'reviewed-only',claims:result.claims,features:analysis.features,cross_analysis:analysis.cross_analysis,warnings:analysis.warnings},hook:null,contentMode:'reviewed-only',seedVersion:SEED_VERSION,scopeNotice:contract.topicId==='creative'?'사주에서 빌린 상징을 넣은 창작 연작입니다. 실제 전생이나 과거의 사실을 확인한 내용이 아닙니다.':!result.claims.length?'이 항목은 질문별 참고 해설과 가상 사례입니다. 개인 성향이나 미래를 확정한 풀이로 읽지 않습니다.':null};
}
export async function serveReviewed({request,env}){
 const context={requestId:crypto.randomUUID(),started:Date.now(),chapter:''};
 try{const raw=await request.text();if(raw.length>160000)throw Error('too-large');let body;try{body=JSON.parse(raw);}catch{throw Error('bad-payload');}context.chapter=body.chapter?.id||'';const value=await prepareReviewed(env,body);const {claims,...publicValue}=value;return json({...publicValue,requestCostUSD:0,providerCallCount:0,requestId:context.requestId,libraryEngine:LIBRARY_VERSION});}
 catch(e){const known=['too-large','bad-payload','invalid-chart','unknown-hour-has-pillar','invalid-distribution','unknown-reviewed-chapter'],status=e.message==='too-large'?413:known.includes(e.message)?400:503,body={ok:false,error:known.includes(e.message)?e.message:'storage-unavailable',aiSkipped:true,providerCallCount:0,requestCostUSD:0},failure=diagnosticRecord(body,status,context);await saveDiagnostic(env,failure).catch(()=>{});return json({...body,requestId:context.requestId,failure},status);}
}
