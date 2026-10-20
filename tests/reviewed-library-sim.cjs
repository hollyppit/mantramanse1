const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.window=globalThis;for(const f of ['engine.js','report/v2/saju-data.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
(async()=>{
 const API=await import('../functions/api/movingtoon-reading.js'),Admin=await import('../functions/api/reading-library.js'),L=await import('../functions/_reviewed-library.js'),K=await import('../functions/_ik.js'),{Polite}=await import('../functions/_polite.js');
 const calc=(y,m,d,h,g)=>{let sd=ReportV2.SajuData.build(Manse.compute({year:y,month:m,day:d,hour:h,minute:0,gender:g,calendar:'solar',city:'서울'}),{now:Date.UTC(2026,9,19,3)});delete sd.birth;delete sd.name;return sd;};
 const charts=[calc(1968,4,22,9,'M'),calc(1977,1,4,12,'F'),calc(1987,11,20,18,'F'),calc(2000,12,3,null,'M')];
 const catalog=global.MantraEditorial.defaults(),contract=catalog.chapters[0];
 const rule=K.cleanItem({id:contract.sourceRuleIds[0],domain:'SELF',title:'합성 검증용 근거',status:'published',reviewed:true,sourceType:'expert',conditions:{dayMaster:[charts[0].dayMaster.stem],gender:['남']},principle:'이 자료는 일간과 성별 조건을 함께 확인하는 합성 검증용 원리입니다.',interpretation:'역할의 범위를 먼저 확인하는 경향이 있다. 조건이 맞지 않는 상황에서는 다르게 나타날 수 있다.',strengths:['책임과 권한이 분명한 상황에서 맡은 일을 끝까지 이어 가는 힘이 있다.'],risks:['역할의 경계가 모호하면 다른 사람의 책임까지 떠안기 쉽다.'],actions:['새 역할을 맡기 전에 결정권과 책임 범위를 확인한다.'],evidence:[{docId:'fixture',chunkId:'c1',quote:'합성 검증용 원문'}]});rule.version=1;
 const memory=new Map([['ik:d:SELF',JSON.stringify([rule])],['src:idx',JSON.stringify([{id:'fixture',active:true}])],['src:chunks:fixture',JSON.stringify([{id:'c1',text:'합성 검증용 원문'}])]]);
 const kv={get:async(k,t)=>memory.has(k)?t==='json'?JSON.parse(memory.get(k)):memory.get(k):null,put:async(k,v)=>memory.set(k,v),readingCAS:async(k,e,n)=>{if((memory.get(k)||null)!==e)return false;memory.set(k,n);return true;}};
 const env={GLOSSARY_KV:kv,ADMIN_PASSWORD:'test-admin',OPENAI_API_KEY:'configured-but-never-used',ANTHROPIC_API_KEY:'configured-but-never-used'};
 const request=(chapter,sd,extra={})=>new Request('https://test/api/movingtoon-reading',{method:'POST',body:JSON.stringify({sd,chapter:{id:chapter.id,title:chapter.title,paragraphs:['title','reality','strength','risk','reinforce','practice','evidence'].map((role,i)=>({id:String(i),role,text:'이 질문에 대한 검수된 내용을 확인하는 요청입니다.'}))},...extra})});
 const advice={id:'general-action',role:'practice',kind:'general',text:'검토할 항목을 하나 골라 실행 전과 실행 후의 차이를 기록해 확인합니다.',ruleIds:[],when:{},unless:{},adviceKey:'shared-decision-review'};
 const bookContext={clean:{sd:charts[0],chapter:{paragraphs:[{id:'0',role:'practice'}]}},contract,analysis:{claims:[]},library:{version:1,published:[advice]}};
 assert.equal(L.composeReviewed(bookContext).blocks.length,1);assert.equal(L.composeReviewed({...bookContext,usedAdviceKeys:[advice.adviceKey]}).blocks.length,0,'same advice focus must not repeat across questions');
 const realFetch=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('network-and-paid-provider-forbidden');};
 for(const sd of charts)for(const c of catalog.chapters){const r=await API.onRequestPost({env,request:request(c,sd,{force:true,mode:'ai',adviceHistory:[{chapter:'other',practice:'기존에 읽은 문장도 AI 호출의 사유가 되지 않습니다.'}]})}),d=await r.json();assert.equal(r.status,200,JSON.stringify({id:c.id,...d}));assert(d.aiSkipped&&d.providerCallCount===0&&d.requestCostUSD===0);assert.equal(d.result.paragraphs.length,7);}
 const passage={id:'reviewed-core',role:'title',kind:'personal',text:'책임의 범위를 먼저 확인하는 태도를 활용할 수 있습니다. 권한과 책임이 맞는지 확인한 뒤 선택해 주세요.',ruleIds:[rule.id],when:{gender:['남']},unless:{},adviceKey:'role-boundary'};
 const admin=async(body,auth=true)=>{const r=await Admin.onRequest({env,request:new Request('https://test/api/reading-library?chapter='+contract.id,{method:body?'POST':'GET',headers:auth?{authorization:'Bearer test-admin'}:{},body:body?JSON.stringify(body):undefined})});return {r,d:await r.json()};};
 assert.equal((await admin(null,false)).r.status,401);
 let current=await admin();assert(current.d.library.version===0);
 let x=await admin({action:'save',expectRevision:current.d.revision,passages:[{...passage,text:'책임을 확인하는 힘이 있다. 실제 권한과 책임의 범위를 함께 확인한다.'}]});assert.equal(x.r.status,200);assert(x.d.library.draft[0].text.includes('있습니다'));assert.equal(x.d.library.published.length,0);
 const stale=current.d.revision;current=await admin();assert.equal((await admin({action:'save',expectRevision:stale,passages:[]})).r.status,409);
 const cases=[{sd:charts[0],expectedPassageIds:[passage.id],forbiddenPassageIds:[]},{sd:charts[2],expectedPassageIds:[],forbiddenPassageIds:[passage.id]}];
 x=await admin({action:'check',expectRevision:current.d.revision,passages:[passage],scenarios:cases});assert.equal(x.d.issues.length,0,JSON.stringify(x.d));assert.equal(x.d.providerCallCount,0);
 assert.equal((await admin({action:'publish',expectRevision:current.d.revision,passages:[passage],scenarios:cases})).r.status,422);
 x=await admin({action:'publish',expectRevision:current.d.revision,passages:[passage],scenarios:cases,reviewed:true});assert.equal(x.r.status,200,JSON.stringify(x.d));
 let d=await (await API.onRequestPost({env,request:request(contract,charts[0])})).json();assert.equal(d.result.paragraphs[0].text,(await import('../functions/_plain-copy.js')).plainText(passage.text));
 d=await (await API.onRequestPost({env,request:request(contract,charts[2])})).json();assert(!d.blocks.some(b=>b.id===passage.id),'counterexample must not receive personal passage');
 rule.version++;memory.set('ik:d:SELF',JSON.stringify([rule]));d=await (await API.onRequestPost({env,request:request(contract,charts[0])})).json();assert(!d.blocks.some(b=>b.id===passage.id),'source revision invalidates approved passage');
 memory.set('src:idx',JSON.stringify([{id:'fixture',active:false}]));d=await (await API.onRequestPost({env,request:request(contract,charts[0])})).json();assert.equal(d.interpretation.claims.length,0,'source withdrawal must take effect immediately');
 assert(L.validatePassages([{...passage,when:{unsupported:['x']}}],contract,[rule]).some(i=>i.code==='invalid-when'));
 for(const f of ['compose','life-ai','past-story']){const endpoint=await import('../functions/api/'+f+'.js');const r=await endpoint.onRequestPost({env,request:new Request('https://test/api/'+f,{method:'POST',body:'{}'})});assert.equal(r.status,409);}
 global.fetch=realFetch;assert.equal(calls,0);assert.equal(Polite.text('읽는다. 많다. 시기다. 모른다.'),'읽습니다. 많습니다. 시기입니다. 모릅니다.');
 console.log('PASS: 4 charts × 84 chapters, zero network/provider calls, force/history cannot bypass; draft isolation, CAS, review + positive/counterexample publication, stale/withdrawn sources, automatic paid-flow guards');
})().catch(e=>{console.error(e);process.exit(1)});

