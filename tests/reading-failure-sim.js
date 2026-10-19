const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url');
const imp=f=>import(pathToFileURL(path.resolve(f)).href);
vm.runInThisContext(fs.readFileSync('report/v2/full-reading.js','utf8'));
const F=ReportV2.FullReading, originalFetch=global.fetch;
const draft='검증되지 않은 원래 해석이 실패 뒤에도 사용자에게 그대로 남으면 안 되는 검사 전용 문장입니다.';
function chapter(id){return {id,title:id,scenes:[{body:draft}]};}
async function run(fetcher,chapters){
 global.fetch=fetcher;const rep={chapters};let finish;const ready=new Promise(r=>finish=r);let n=0;
 const task=F.prepare(rep,{name:'SECRET_NAME',birth:'SECRET_BIRTH'},'SECRET_NAME',()=>{if(++n===chapters.length)finish();});
 await task.first;
 for(const c of chapters){F.prioritize(c.id);while(!c.readingFullText && !c.readingWarning)await new Promise(resolve=>setTimeout(resolve,0));}
 await Promise.race([ready,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('worker did not settle')),6000);t.unref();})]);
 return rep;
}
(async()=>{
 const D=await imp('functions/_reading-diagnostics.js'),API=await imp('functions/api/movingtoon-reading.js'),G=await imp('functions/api/reading-diagnostics.js');
 const body={ok:false,error:'chapter-validation-failed',providerAttempts:[{provider:'openai',status:'rejected',stage:'semantic-review',issues:[{reason:'SECRET_NAME'}],error:'secret API key'}]};
 const ctx={requestId:crypto.randomUUID(),started:Date.now(),chapter:'c08'};
 const record=D.diagnosticRecord(body,502,ctx);assert(!JSON.stringify(record).includes('secret'));assert(!JSON.stringify(record).includes('SECRET'));assert.equal(record.code,'CONSISTENCY_REJECTED');assert.equal(record.attempts[0].stage,'semantic-review');
 for(const [error,code] of [['bad-payload','CALCULATION_INPUT'],['storage-unavailable','KNOWLEDGE_UNAVAILABLE'],['insufficient-evidence','EVIDENCE_INSUFFICIENT'],['ai-unavailable','AI_GENERATION_FAILED'],['pipeline-unavailable','COMPOSITION_FAILED']])assert.equal(D.diagnosticRecord({error},503,ctx).code,code);
 assert.equal(D.diagnosticRecord(body,502,{...ctx,chapter:'SECRET_NAME'}).chapter,'other');
 const memory=new Map(),kv={put:async(k,v)=>memory.set(k,v),get:async(k,t)=>memory.has(k)?t==='json'?JSON.parse(memory.get(k)):memory.get(k):null,list:async({prefix})=>({keys:[...memory.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name})),list_complete:true})};
 await D.saveDiagnostic({GLOSSARY_KV:kv},record);assert.equal(memory.size,0);
 await D.saveDiagnostic({GLOSSARY_KV:kv,ERRLOG_ON:'1'},record);assert.equal(memory.size,1);
 let res=await API.onRequestPost({env:{GLOSSARY_KV:kv},request:new Request('http://test',{method:'POST',body:'{}'})}),data=await res.json();assert.equal(res.status,400);assert.match(data.requestId,/^[a-f0-9-]{36}$/);assert.equal(data.failure.code,'CALCULATION_INPUT');assert.equal(memory.size,1);
 const env={GLOSSARY_KV:kv,ADMIN_PASSWORD:'test',ERRLOG_ON:'1'};
 res=await G.onRequestGet({env,request:new Request('http://test')});assert.equal(res.status,401);
 res=await G.onRequestGet({env,request:new Request('http://test',{headers:{authorization:'Bearer test'}})});data=await res.json();assert.equal(data.summary.failed,1);assert.equal(data.records[0].requestId,ctx.requestId);
 let count=0;
 let rep=await run(async(_,o)=>{const input=JSON.parse(o.body);assert(!o.body.includes('SECRET'));count++;return count===1?new Response(JSON.stringify(body),{status:502}):new Response(JSON.stringify({ok:true,result:{paragraphs:[{id:'0',text:'이 장은 앞서 실패한 장과 별개로 검수한 문장으로 정상 처리되어야 하는 검사 전용 응답입니다.',refs:[]}]}}));},[chapter('c01'),chapter('c08')]);
 assert.equal(rep.readingStatus.failed,1);assert.equal(rep.readingStatus.completed,1);assert(rep.chapters[0].readingDeferred);assert.equal(rep.chapters[0].scenes[0].body,'');assert(!rep.chapters[0].readingFullText.includes('준비'));assert(rep.chapters[0].readingNotice);assert(!rep.chapters[1].readingDeferred);
 rep=await run(async()=>{throw Error('SECRET_NETWORK');},[chapter('c01')]);assert.equal(rep.chapters[0].readingWarning,'server-communication-failed');assert(!JSON.stringify(rep).includes('SECRET_NETWORK'));
 rep=await run(async()=>new Response('<html>gateway</html>',{status:502}),[chapter('c01')]);assert.equal(rep.chapters[0].readingWarning,'server-response-invalid');
 count=0;rep=await run(async()=>{count++;return new Response(JSON.stringify({ok:false,error:'no-ai'}),{status:503});},[chapter('c01'),chapter('c08')]);assert.equal(count,1);assert.equal(rep.readingStatus.failed,2);assert(rep.chapters.every(c=>c.readingDeferred && !c.scenes[0].body));
 count=0;rep=await run(async()=>{count++;return count===1?new Response(JSON.stringify({ok:false,error:'rate-limited'}),{status:429}):new Response(JSON.stringify({ok:true,cached:true,result:{paragraphs:[{id:'0',text:'앞 장의 생성 한도 초과와 관계없이 이 장에 저장된 검수 완료 본문을 정상적으로 읽을 수 있어야 합니다.',refs:[]}]}}));},[chapter('c01'),chapter('c08')]);assert.equal(count,2);assert.equal(rep.readingStatus.completed,1);assert.equal(rep.readingStatus.failed,1);
 console.log('reading-failure: isolated chapters, network/invalid JSON/global outage, safe diagnostics, auth, opt-in, no stale prose PASS');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{global.fetch=originalFetch;});
