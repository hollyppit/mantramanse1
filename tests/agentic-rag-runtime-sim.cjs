const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
  const imp=f=>import(pathToFileURL(path.resolve(f))),R=await imp('functions/_rag-runner.js'),S=await imp('functions/_rag-state.js'),V=await imp('functions/_rag-view.js'),K=await imp('functions/_ik.js'),I=await imp('functions/_ikstore.js'),D=await imp('functions/_interpretation-store.js'),API=await imp('functions/api/agentic-rag.js');
  const now=Date.UTC(2026,9,17,1),source={origin:'https://library.org',grade:'A',author:'시험용 문헌',license:'테스트 허용',rightsUrl:'https://library.org/rights',commercial:true,quote:true,store:true,automaticSupport:true};
  const config={...S.DEFAULTS,enabled:true,autoPublish:true,time:'03:00',dailyBudget:5,monthlyBudget:10,taskBudget:1,maxSearches:1,maxDocs:1,maxTasks:2,retries:2,model:'test-model',inputPrice:1,outputPrice:1,searchPrice:.01,allowed:[source]};
  const originals=[1,2].map((n)=>({...K.cleanItem({id:'SELF-000'+n,domain:'SELF',subDomain:K.DEFAULT_DESIGN.SELF.sections[0].id,title:'시험 지식 '+n,status:'published',reviewed:true,sourceType:'book',conditions:{dayMaster:[n===1?'갑':'을']},principle:'전통 문헌의 조건부 원칙 '+n,interpretation:'해당 조건의 전통 설명 '+n,stance:'neutral'},null),version:4}));
  function fixture(items=originals){
    const map=new Map([['ik:d:SELF',JSON.stringify(items)],['src:idx',JSON.stringify([{id:'old-doc',title:'기존 원본',approved:true}])],['src:cand:old-doc',JSON.stringify([{id:'old-cand',status:'approved',knowledgeId:items[0].id}])]]),baseline=new Map(map);let commits=0;
    const kv={get:async(k,t)=>map.has(k)?t==='json'?JSON.parse(map.get(k)):map.get(k):null,put:async(k,v)=>{assert(k.startsWith('ik:agentic:'));map.set(k,v);},researchCAS:async(expected,next)=>{await Promise.resolve();if((map.get(S.STATE_KEY)||null)!==expected)return false;map.set(S.STATE_KEY,next);commits++;return true;}};
    return {map,kv,baseline,env:{ADMIN_PASSWORD:'test',RAG_SCHEDULER_SECRET:'cron-test',GLOSSARY_KV:kv,BRAVE_SEARCH_API_KEY:'search-test',OPENAI_API_KEY:'ai-test'},preserved(){for(const[k,v]of baseline)assert.equal(map.get(k),v,k+' changed');},get commits(){return commits;}};
  }
  let calls=[],mode='same',httpFailure=0,blockedFetch=null,extractCount=0;
  global.fetch=async(url,init={})=>{
    const u=String(url);calls.push(u);
    if(u.startsWith('https://api.search.brave.com/')){assert.equal(init.headers['X-Subscription-Token'],'search-test');if(httpFailure-->0)return new Response('busy',{status:503});return Response.json({web:{results:[{url:'https://library.org/book',title:'원문'},{url:'http://127.0.0.1/secret',title:'차단'}]}});}
    if(u==='https://library.org/book'||u==='https://library.org/book?revision=1'){if(blockedFetch)await blockedFetch;return new Response(originals.map(t=>t.principle+' '+t.interpretation).join(' '),{headers:{'content-type':'text/plain'}});}
    if(u==='https://api.openai.com/v1/responses'){
      extractCount++;const b=JSON.parse(init.body);assert.equal(b.store,false);assert.equal(b.max_output_tokens,config.maxOutputTokens);const input=JSON.parse(b.input),t=input.target;
      const item={...t};delete item.id;if(mode==='changed'){item.conditions={dayMaster:['경']};item.interpretation='추가 조건에서의 다른 설명';}
      const payload={kind:mode==='changed'?'conditions':'evidence',quote:t.principle+' '+t.interpretation,sourceUrl:'https://library.org/book',item};
      if(mode==='canonical')payload.sourceUrl='https://library.org/book?revision=1';
      if(mode==='external-citation')payload.sourceUrl='https://not-approved.org/source';
      return Response.json({status:'completed',model:'test-model',output_text:JSON.stringify(payload),usage:{input_tokens:1000,output_tokens:300}});
    }
    throw Error('Unexpected URL '+u);
  };
  const f=fixture();await R.saveConfig(f.kv,config,0);
  const starts=await Promise.all([R.startResearch(f.kv,f.env,{now}),R.startResearch(f.kv,f.env,{now})]);assert.equal(starts.filter(x=>x.id).length,1,'duplicate run');
  async function drain(f){for(let i=0;i<50;i++){const x=await R.tickResearch(f.kv,f.env,{now});if(x.completed||x.blocked)return x;}throw Error('run did not finish');}
  await drain(f);let state=await S.readState(f.kv);assert.equal(Object.keys(state.candidates).length,2);assert.equal(Object.keys(state.active).length,2);assert.equal(extractCount,2);
  assert(Object.values(state.candidates).every(c=>c.approval==='automatic_approved'&&c.publication==='published'&&c.validation.quote));
  const view=await V.researchView(f.kv,originals);assert.equal(view.items.length,2);assert(view.items.every(x=>x.evidence.length===1&&x.reviewed&&x.status==='published'&&x.version===5));
  assert.equal((await I.loadAll(f.kv))[0].version,4);assert.equal((await I.loadServiceAll(f.kv))[0].version,5);
  const sourceIndex=await D.loadSourceIndex(f.kv,view.items,new Set());assert.equal(sourceIndex.size,2);assert(sourceIndex.get(view.items[0].evidence[0].docId).chunks[0].text.includes(originals[0].principle));
  const condResult=K.retrieve(view.items,{dayMaster:'갑'},{domain:'SELF',includeDraft:false});assert(condResult.used.some(x=>x.id===originals[0].id));assert(!condResult.used.some(x=>x.id===originals[1].id));
  const month=state.ledger['2026-10'];assert.equal(month.reserved,0);assert(month.spent>0&&month.spent<config.monthlyBudget);assert(state.events.some(x=>x.type==='daily-report'));
  const c1=Object.values(state.candidates).find(c=>c.knowledgeId===originals[0].id),c2=Object.values(state.candidates).find(c=>c.knowledgeId===originals[1].id),vBefore=(await I.meta(f.kv)).research;
  await R.rollbackCandidate(f.kv,c1.id,state.revision,'보강 오류 개별 복원');
  const rolled=await V.researchView(f.kv,originals);assert.equal(rolled.items[0].evidence.length,0);assert.equal(rolled.items[1].evidence.length,1);assert.equal(rolled.items[0].version,4);assert((await I.meta(f.kv)).research>vBefore);
  state=await S.readState(f.kv);assert.equal(state.candidates[c1.id].publication,'rolled_back');assert.equal(state.candidates[c2.id].publication,'published');assert(state.events.some(e=>e.type==='rollback'&&e.previousVersion&&e.nextVersion));f.preserved();
  const edited=[{...originals[0],version:6,interpretation:'관리자가 수정한 결론'},originals[1]];const editedView=await V.researchView(f.kv,edited);assert.equal(editedView.items[0].interpretation,'관리자가 수정한 결론');
  // Disable all research overlays without hiding any legacy publication.
  await R.saveConfig(f.kv,{...config,legacyOnly:true},state.revision);assert.deepEqual((await V.researchView(f.kv,originals)).items,originals);
  const scheduled=fixture();await R.saveConfig(scheduled.kv,config,0);
  assert.equal((await R.startResearch(scheduled.kv,scheduled.env,{scheduled:true,now:Date.UTC(2026,9,16,17)})).blocked,'not-due');
  assert((await R.startResearch(scheduled.kv,scheduled.env,{scheduled:true,now})).id);await drain(scheduled);
  assert.equal((await R.startResearch(scheduled.kv,scheduled.env,{scheduled:true,now:now+3600000})).blocked,'not-due');
  assert((await R.startResearch(scheduled.kv,scheduled.env,{scheduled:true,now:now+86400000})).id);
  const budget=fixture();await R.saveConfig(budget.kv,{...config,monthlyBudget:.00001},0);await R.startResearch(budget.kv,budget.env,{now});let before=calls.length;assert.equal((await R.tickResearch(budget.kv,budget.env,{now})).blocked,'budget-limit');assert.equal(calls.length,before);budget.preserved();
  const daily=fixture();await R.saveConfig(daily.kv,{...config,dailyBudget:.00001},0);await R.startResearch(daily.kv,daily.env,{now});assert.equal((await R.tickResearch(daily.kv,daily.env,{now})).blocked,'budget-limit');
  const perTask=fixture();await R.saveConfig(perTask.kv,{...config,taskBudget:.00001},0);await R.startResearch(perTask.kv,perTask.env,{now});assert.equal((await R.tickResearch(perTask.kv,perTask.env,{now})).blocked,'budget-limit');
  const concurrent=fixture([originals[0]]);await R.saveConfig(concurrent.kv,{...config,maxSearches:3},0);await R.startResearch(concurrent.kv,concurrent.env,{now});httpFailure=1;
  const parallel=await Promise.all([R.tickResearch(concurrent.kv,concurrent.env,{now}),R.tickResearch(concurrent.kv,concurrent.env,{now})]);assert(parallel.some(x=>x.blocked==='run-busy'));await drain(concurrent);assert(Object.values((await S.readState(concurrent.kv)).jobs)[0].tasks[0].errors.some(x=>x.retry));
  const exhausted=fixture([originals[0]]);await R.saveConfig(exhausted.kv,config,0);await R.startResearch(exhausted.kv,exhausted.env,{now});httpFailure=10;
  await R.tickResearch(exhausted.kv,exhausted.env,{now});const end=await R.tickResearch(exhausted.kv,exhausted.env,{now});assert.equal(end.state,'failed');assert.equal(end.reason,'search-request-limit');assert.equal((await R.tickResearch(exhausted.kv,exhausted.env,{now})).blocked,'no-active-run');httpFailure=0;
  // Changed conditions never auto-publish; admin approval creates a separate effective version.
  const changed=fixture([originals[0]]);await R.saveConfig(changed.kv,config,0);await R.startResearch(changed.kv,changed.env,{now});mode='changed';await drain(changed);mode='same';
  state=await S.readState(changed.kv);const review=Object.values(state.candidates)[0];assert.equal(review.risk,2);assert.equal(review.publication,'unpublished');assert.deepEqual((await V.researchView(changed.kv,[originals[0]])).items,[originals[0]]);
  await R.publishCandidate(changed.kv,review.id,state.revision,'조건 변경 근거를 관리자 검토함');assert.equal((await V.researchView(changed.kv,[originals[0]])).items[0].interpretation,'추가 조건에서의 다른 설명');changed.preserved();
  // Rights, SSRF, fabricated citations and stale versions are rejected.
  for(const url of ['http://127.0.0.1/a','https://127.0.0.1/a','https://localhost/a','https://[::1]/','https://library.org.evil.org/a','https://user:pw@library.org/a'])assert.throws(()=>S.sourcePolicy(url,config));
  const doc={url:'https://library.org/book',text:'다른 원문 내용',author:'a',grade:'A',license:'l'};
  await assert.rejects(R.validateExtraction(JSON.stringify({kind:'evidence',sourceUrl:doc.url,quote:'존재하지 않는 원문 인용구입니다',item:originals[0]}),originals[0],[doc],originals,config),/source-quote-not-found/);
  assert.throws(()=>S.sourcePolicy('https://library.org/book',{...config,allowed:[{...source,commercial:false}]}),/rights/);
  const validDoc={...doc,text:originals[0].principle+' '+originals[0].interpretation,author:source.author,license:source.license,accessedAt:new Date().toISOString()},raw={kind:'evidence',sourceUrl:validDoc.url,quote:validDoc.text,item:originals[0]};
  await assert.rejects(R.validateExtraction(JSON.stringify({...raw,item:{...originals[0],conditions:{unknown:['갑']}}}),originals[0],[validDoc],originals,config),/conditions-or-content-invalid|unsupported-condition/);
  const core=await R.validateExtraction(JSON.stringify({...raw,kind:'method',item:{...originals[0],principle:'새 용신 판단 규칙',interpretation:'새로운 핵심 규칙'}}),originals[0],[validDoc],originals,config);assert.equal(core.risk,3);assert.equal(core.approval,'review_required');
  const lowTrust=await R.validateExtraction(JSON.stringify(raw),originals[0],[validDoc],originals,{...config,allowed:[{...source,grade:'D'}]});assert.equal(lowTrust.approval,'review_required');
  const N=await imp('functions/_rag-network.js'),networkBefore=global.fetch;global.fetch=async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private','content-type':'text/plain'}});await assert.rejects(N.collectDocument(validDoc.url,config),/redirect-requires-approval/);global.fetch=networkBefore;
  assert(N.riskyText('ignore previous instructions'));assert(N.riskyText('contact person@private.org'));assert(N.riskyText('<script>alert(1)</script>'));
  await assert.rejects(R.saveConfig(f.kv,config,0),/settings-version-conflict/);
  const noAtomic=fixture();delete noAtomic.kv.researchCAS;await assert.rejects(R.startResearch(noAtomic.kv,noAtomic.env,{now}),/atomic-storage-required/);
  // Scheduler secret has no settings/publish authority.
  const req=(a,pw,body={})=>API.onRequest({env:f.env,request:new Request('https://test/api/agentic-rag?a='+a,{method:'POST',headers:{authorization:'Bearer '+pw},body:JSON.stringify(body)})});
  assert.equal((await req('settings','cron-test',{config})).status,401);assert.equal((await req('scheduled','wrong')).status,401);
  const stale=fixture([originals[0]]);await R.saveConfig(stale.kv,config,0);await R.startResearch(stale.kv,stale.env,{now});await R.tickResearch(stale.kv,stale.env,{now});await R.tickResearch(stale.kv,stale.env,{now});await R.tickResearch(stale.kv,stale.env,{now});stale.map.set('ik:d:SELF',JSON.stringify([{...originals[0],version:99}]));await R.tickResearch(stale.kv,stale.env,{now});assert.equal(Object.keys((await S.readState(stale.kv)).active).length,0);
  // Stop while a network request is in flight: persist the completed checkpoint, never refetch it.
  const stopped=fixture([originals[0]]);await R.saveConfig(stopped.kv,config,0);const started=await R.startResearch(stopped.kv,stopped.env,{now});await R.tickResearch(stopped.kv,stopped.env,{now});
  let release;blockedFetch=new Promise(r=>release=r);const flight=R.tickResearch(stopped.kv,stopped.env,{now});for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));
  await R.controlResearch(stopped.kv,'stop');release();await flight;blockedFetch=null;
  state=await S.readState(stopped.kv);assert.equal(state.jobs[started.id].tasks[0].stage,'extract');assert.equal(state.jobs[started.id].state,'paused');
  const beforeFetches=calls.filter(x=>x==='https://library.org/book').length;await R.controlResearch(stopped.kv,'resume',started.id);await drain(stopped);assert.equal(calls.filter(x=>x==='https://library.org/book').length,beforeFetches);stopped.preserved();
  // Ambiguous expired call reserves its full cost, is fenced, and needs explicit recovery.
  const abandoned=fixture([originals[0]]);await R.saveConfig(abandoned.kv,config,0);const abandonedRun=await R.startResearch(abandoned.kv,abandoned.env,{now});
  await S.updateState(abandoned.kv,s=>{const t=s.jobs[abandonedRun.id].tasks[0];t.reservation={amount:.1,day:'2026-10-17',month:'2026-10'};t.cost=0;s.ledger['2026-10-17']={reserved:.1,spent:0,started:1};s.ledger['2026-10']={reserved:.1,spent:0,started:1};s.lock={token:'old-worker',jobId:abandonedRun.id,taskId:t.id,stage:'search',until:0};});
  assert.equal((await R.tickResearch(abandoned.kv,abandoned.env,{now})).blocked,'expired-step-needs-recovery');await R.controlResearch(abandoned.kv,'recover');state=await S.readState(abandoned.kv);assert.equal(state.lock,null);assert.equal(state.ledger['2026-10'].reserved,0);assert.equal(state.ledger['2026-10'].spent,.1);assert.equal(state.jobs[abandonedRun.id].tasks[0].state,'failed');
  const unconfigured=fixture();before=calls.length;assert.equal((await R.startResearch(unconfigured.kv,unconfigured.env,{now})).blocked,'research-disabled-or-unconfigured');assert.equal(calls.length,before);
  const planning=fixture();await R.saveConfig(planning.kv,config,0);await S.updateState(planning.kv,s=>{s.jobs.interrupted={id:'interrupted',state:'planning',planningUntil:0,day:'2026-10-17',tasks:[]};s.lastDaily='2026-10-17';});await R.controlResearch(planning.kv,'recover');assert.equal((await S.readState(planning.kv)).jobs.interrupted.state,'failed');assert.equal((await S.readState(planning.kv)).lastDaily,null);
  const revBefore=(await S.readState(f.kv)).revision;await S.updateState(f.kv,()=>({blocked:true}));assert.equal((await S.readState(f.kv)).revision,revBefore,'no-op polling must not change revision');
  // Outstanding reservations cross KST day/month boundaries without resetting budget exposure.
  const rollover=fixture([originals[0]]);await R.saveConfig(rollover.kv,config,0);const endOfMonth=Date.UTC(2026,9,31,14,59);await R.startResearch(rollover.kv,rollover.env,{now:endOfMonth});await R.tickResearch(rollover.kv,rollover.env,{now:endOfMonth});
  await R.tickResearch(rollover.kv,rollover.env,{now:endOfMonth+120000});state=await S.readState(rollover.kv);assert.equal(state.ledger['2026-10'].reserved,0);assert.equal(state.ledger['2026-10'].spent,.01);assert(state.ledger['2026-11'].reserved>0);assert(state.events.some(e=>e.type==='reservation-rollover'));
  // A cited revision must be fetched, stay in the allowlist/document cap, and be charged.
  mode='canonical';const citation=fixture([originals[0]]);await R.saveConfig(citation.kv,{...config,maxDocs:2,documentPrice:.02},0);await R.startResearch(citation.kv,citation.env,{now});await drain(citation);state=await S.readState(citation.kv);assert.equal(Object.values(state.candidates)[0].sources[0].url,'https://library.org/book?revision=1');assert(state.jobs[Object.keys(state.jobs)[0]].tasks[0].accountedCost>.04);citation.preserved();
  const cappedCitation=fixture([originals[0]]);await R.saveConfig(cappedCitation.kv,config,0);const citationCalls=calls.filter(x=>x.includes('revision=1')).length;await R.startResearch(cappedCitation.kv,cappedCitation.env,{now});await drain(cappedCitation);state=await S.readState(cappedCitation.kv);assert.equal(Object.keys(state.candidates).length,0);assert(Object.values(state.jobs)[0].tasks[0].errors.some(e=>e.error==='citation-document-limit'));assert.equal(calls.filter(x=>x.includes('revision=1')).length,citationCalls);
  mode='external-citation';const externalCitation=fixture([originals[0]]);await R.saveConfig(externalCitation.kv,{...config,maxDocs:2},0);await R.startResearch(externalCitation.kv,externalCitation.env,{now});await drain(externalCitation);assert.equal(Object.keys((await S.readState(externalCitation.kv)).candidates).length,0);assert(!calls.some(x=>x.includes('not-approved.org')));mode='same';
  // Worker wiring calls only scheduled API; no password sent through a redirect.
  const worker=(await imp('workers/rag-scheduler.js')).default,fetchBefore=global.fetch;let cronUrl;
  global.fetch=async(url,init)=>{cronUrl=String(url);assert.equal(init.redirect,'manual');assert.equal(init.headers.authorization,'Bearer cron-test');return Response.json({blocked:'not-due'});};
  await worker.scheduled({scheduledTime:now},{RAG_API_ORIGIN:'https://app.org',RAG_SCHEDULER_SECRET:'cron-test'});assert.equal(cronUrl,'https://app.org/api/agentic-rag?a=scheduled');
  await assert.rejects(worker.scheduled({},{}),/scheduler-not-configured/);global.fetch=fetchBefore;
  console.log('agentic-rag-runtime OK: external provider contracts, checkpoints, atomic concurrency, daily KST scheduling, three budget caps, bounded retries, original ID/approval/publication preservation, source grounding/retrieval, automatic evidence publication, admin-only changed conclusions, isolated rollback/cache version, security/fabrication rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
