import { json, isAdmin } from '../_lib.js';
import { kvOf } from '../_store.js';
import { loadAll, blockedDocs, meta } from '../_ikstore.js';
import { loadSettings, loadSourceIndex } from '../_interpretation-store.js';
import { analyze, ENGINE_VERSION } from '../_interpretation-engine.js';
import { validate } from '../_movingtoon-reading.js';
import { generate } from './movingtoon-reading.js';
import { VERSION, PLAN_SYSTEM, WRITE_SYSTEM, REVIEW_SYSTEM, validatePlan, validateStory, validateReview, planIssues, stageSchema } from '../_past-story.js';
import { SLOT_BY_ID } from '../_assetart.js';

export function visualFor(chart){
 const element=({wood:'목',fire:'화',earth:'토',metal:'금',water:'수'})[chart.dayMaster.el] || chart.dayMaster.el;
 const slot='past:'+chart.dominantGroup+':'+element+':'+chart.gender,asset=SLOT_BY_ID[slot];
 return asset?{slot,title:asset.title,era:'조선 시대 무렵의 한국',constraint:'주인공의 직업·의복·일터는 이 기존 전생 이미지의 인물과 일치시킨다. 사건·적대자·딜레마·선택·결말은 원국 전체의 검수 근거를 조합해 새로 설계한다.'}:null;
}

export async function composeStory(analysis,call){
 const claims=analysis.claims;
 const context={chart:analysis.normalized.chart,features:analysis.features,claims,cross_analysis:analysis.cross_analysis,visual:visualFor(analysis.normalized.chart)};
 const planText=await call(PLAN_SYSTEM,JSON.stringify(context),5000,'plan');
 const plan=validatePlan(planText,claims);
 if(!plan)throw Object.assign(Error('plan-rejected'),{issues:planIssues(planText,claims)});
 const input={...context,plan};
 let revision=null;
 for(let attempt=0;attempt<2;attempt++){
  const story=validateStory(await call(WRITE_SYSTEM,JSON.stringify({...input,...(revision?{previous:revision.story,revision:revision.issues}:{})}),8000,'write'),plan,claims);
  if(!story)throw Error('story-rejected');
  const reviewText=await call(REVIEW_SYSTEM,JSON.stringify({...input,story}),1600,'review');
  if(validateReview(reviewText))return {story,plan,review:{passed:true,grounding:true,causality:true,dilemma:true,arc:true,prose:true,issues:[]}};
  let review;try{review=JSON.parse(reviewText.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{}
  revision={story,issues:Array.isArray(review?.issues)?review.issues.slice(0,12):['근거·인과·딜레마·변화·문장의 검토를 다시 확인하라.']};
 }
 throw Error('review-rejected');
}
export async function onRequestPost({request,env}){
 const started=Date.now(),deadline=started+78000,traceId=crypto.randomUUID(),attempts=[];
 let body,clean;
 try{const raw=await request.text();if(raw.length>150000)return json({ok:false,error:'too-large'},413);body=JSON.parse(raw);
   clean=validate({sd:body.sd,chapter:{id:'deep_past',title:'창작 전생 단편',paragraphs:[{id:'context',text:'원국 전체의 근거를 인물의 욕망과 선택으로 옮기는 창작 단편.'}]}});
 }catch{}
 if(!clean)return json({ok:false,error:'bad-payload'},400);
 // 전생 단편은 오늘의 운세가 아니라 원국에서 출발한다. 날짜가 바뀌어도 같은 원국의 이야기를 재사용한다.
 for(const k of ['nowYear','daewoon','currentDaewoon','sewoon','monthlyLuck','currentRoots'])delete clean.sd[k];
 const kv=kvOf(env);if(!kv)return json({ok:false,error:'storage-unavailable'},503);
 try{
  const [items,blocked,version,settings]=await Promise.all([loadAll(kv),blockedDocs(kv),meta(kv),loadSettings(kv)]);
  const sourceIndex=await loadSourceIndex(kv,items,blocked);
  // 이름·출생 날짜·자미두수는 외부 집필 입력과 캐시에서 제외한다.
  const analysis=analyze(clean.sd,items,{...settings,maxClaims:24,sourceIndex,blockedDocs:blocked,domains:['SELF','CAREER','MONEY','LOVE','MARRIAGE','RELATIONSHIP','ACTION']});
  if(analysis.claims.length<3)return json({ok:false,error:'insufficient-evidence'},422);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({version:VERSION,engine:ENGINE_VERSION,db:version,chart:analysis.normalized.chart,claims:analysis.claims,models:[settings.openaiModel,settings.anthropicModel,env.OPENAI_MODEL,env.ANTHROPIC_MODEL]})));
  const key='ai:past-story:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const cached=await kv.get(key,'json');
  if(cached&&validatePlan(cached.plan,analysis.claims)&&validateStory(cached.story,cached.plan,analysis.claims)&&validateReview(cached.review))return json({ok:true,story:cached.story,visual:visualFor(analysis.normalized.chart),cached:true,version:VERSION});
  if(!env.OPENAI_API_KEY&&!env.ANTHROPIC_API_KEY)return json({ok:false,error:'no-ai'},503);
  if(settings.maxRequestCost!=null){
   const byteInput=new TextEncoder().encode(JSON.stringify(analysis)).length;
   const providers=[env.OPENAI_API_KEY,env.ANTHROPIC_API_KEY].filter(Boolean).length;
   const estimate=settings.inputPricePerMillion!=null&&settings.outputPricePerMillion!=null?(((byteInput*5+100000)*settings.inputPricePerMillion+19600*settings.outputPricePerMillion)/1e6)*providers:null;
   if(estimate==null||estimate>settings.maxRequestCost)return json({ok:false,error:'cost-limit'},429);
  }
  const ip=request.headers.get('cf-connecting-ip')||'local',hour=new Date().toISOString().slice(0,13),day=hour.slice(0,10);
  const hk='rl:past-story:'+ip+':'+hour,dk='rl:past-story:day:'+ip+':'+day;
  const [h,d]=await Promise.all([kv.get(hk),kv.get(dk)]);
  if(+h>=6||+d>=20)return json({ok:false,error:'rate-limited'},429);
  await Promise.all([kv.put(hk,String((+h||0)+1),{expirationTtl:7200}),kv.put(dk,String((+d||0)+1),{expirationTtl:172800})]);
  let last='generation-failed';
  for(const [provider,secret] of [['openai','OPENAI_API_KEY'],['anthropic','ANTHROPIC_API_KEY']]){
   if(!env[secret]||Date.now()>deadline-15000)continue;
   try{
    const result=await composeStory(analysis,async(system,input,tokens,stage)=>{
     const remaining=deadline-Date.now();if(remaining<3000)throw Error('deadline');
     const at=Date.now(),budget=Math.min(remaining,stage==='plan'?20000:stage==='write'?35000:12000);
     try{
      const r=await generate(env,provider,input,system,{...settings,outputSchema:stageSchema(stage,analysis.claims),maxOutputTokens:tokens,timeoutMs:budget});
      attempts.push({provider,stage,model:r.model,elapsedMs:Date.now()-at,usage:r.usage,status:'returned',completionStatus:r.completionStatus,incompleteReason:r.incompleteReason,empty:!r.text});return r.text;
     }catch(e){attempts.push({provider,stage,elapsedMs:Date.now()-at,status:'failed',error:/^provider-http-\d{3}(?:-[a-z_]+)?$/.test(e.message)?e.message:e.name==='TimeoutError'?'timeout':'call-error'});throw e;}
    });
    await kv.put(key,JSON.stringify({...result,version:VERSION,at:new Date().toISOString()}),{expirationTtl:2592000});
    return json({ok:true,story:result.story,visual:visualFor(analysis.normalized.chart),cached:false,version:VERSION});
   }catch(e){last=['plan-rejected','story-rejected','review-rejected','deadline'].includes(e.message)?e.message:'provider-unavailable';attempts.push({provider,status:'rejected',error:last,...(e.issues?{issues:e.issues}:{})});}
  }
  // Short-lived internal trace: allowlisted metadata only, no prompts, IDs or prose.
  try{await kv.put('diag:past-story:'+traceId,JSON.stringify({version:VERSION,at:new Date().toISOString(),elapsedMs:Date.now()-started,attempts}),{expirationTtl:86400});}catch{}
  return json({ok:false,error:last,traceId},503);
 }catch{return json({ok:false,error:'story-unavailable'},503);}
}

export async function onRequestGet({request,env}){
 if(!isAdmin(request,env))return json({ok:false,error:'unauthorized'},401);
 const id=new URL(request.url).searchParams.get('traceId');
 if(!/^[a-f0-9-]{36}$/.test(id||''))return json({ok:false,error:'bad-trace'},400);
 const kv=kvOf(env);if(!kv)return json({ok:false,error:'storage-unavailable'},503);
 const trace=await kv.get('diag:past-story:'+id,'json');
 return trace?json({ok:true,trace}):json({ok:false,error:'trace-expired'},404);
}
