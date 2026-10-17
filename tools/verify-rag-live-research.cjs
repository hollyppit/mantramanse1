// Opt-in, explicitly cost-approved LIVE provider test, isolated PostgreSQL only.
// It never connects to production Supabase, KV or R2.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {PGlite}=require('../output/rag-pg17-tools/node_modules/@electric-sql/pglite');
const {readConfig}=require('./check-rag-provider-connections.cjs');
(async()=>{
  assert(process.argv.includes('--approved-api-cap-0.05'),'explicit cost approval required');
  const imp=f=>import(pathToFileURL(path.resolve(f))),K=await imp('functions/_ik.js'),R=await imp('functions/_rag-runner.js'),S=await imp('functions/_rag-state.js'),V=await imp('functions/_rag-view.js');
  const db=await PGlite.create(),keys=readConfig('output/protected-backup/api-probe.env'),report={checkedAt:new Date().toISOString(),mode:'live-search-fetch-extraction-local-pg17',productionWrites:0,apiCapUSD:.05,checks:{},requests:{search:0,generate:0,document:0},passed:false};
  const realFetch=global.fetch;let reserved=0;const previousReport='docs/AGENTIC_RAG_LIVE_RESEARCH_2026-10-17.json',old=fs.existsSync(previousReport)?JSON.parse(fs.readFileSync(previousReport)):{},journal='output/protected-backup/live-api-budget.json';
  const prior=Math.max(old.cumulativeReservedUSD??old.reservedWorstCaseUSD??0,fs.existsSync(journal)?JSON.parse(fs.readFileSync(journal)).reservedUSD:0);report.priorReservedUSD=prior;
  const revalidate=process.argv.includes('--revalidate-cached-response'),cachedTask=(revalidate||process.argv.includes('--resume-cached-source'))?Object.values(JSON.parse(fs.readFileSync('output/protected-backup/live-research/state.json')).jobs)[0].tasks[0]:null,cached=cachedTask?.documents;
  try{
    await db.exec('create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;');await db.exec(fs.readFileSync('supabase/schema.sql','utf8'));await db.exec('grant usage on schema public to service_role;grant all on public.kv to service_role;');await db.exec(fs.readFileSync('supabase/migrations/20261017_rag_cas.sql','utf8'));
    const originals=[K.cleanItem({id:'SELF-0001',title:'滴天髓/02 繁體 甲木',domain:'SELF',subDomain:K.DEFAULT_DESIGN.SELF.sections[0].id,status:'published',reviewed:true,sourceType:'book',principle:'甲木參天，脱胎要火，',interpretation:'春不容金，秋不容土，',conditions:{dayMaster:['갑']},stance:'neutral'},null),K.cleanItem({id:'SELF-0002',title:'격리 보존 확인용',domain:'SELF',subDomain:K.DEFAULT_DESIGN.SELF.sections[0].id,status:'published',reviewed:true,sourceType:'book',principle:'기존 보존 검사 원칙',interpretation:'기존 보존 검사 설명',conditions:{dayMaster:['을']},stance:'neutral'},null)];
    if(cached)originals[0].principle='甲木參天，脫胎要火，';
    const originalJSON=JSON.stringify(originals);await db.query('insert into public.kv(key,value) values($1,$2)',['ik:d:SELF',originalJSON]);
    const kv={get:async(k,t)=>{const v=(await db.query('select value from public.kv where key=$1',[k])).rows[0]?.value??null;return t==='json'&&v!==null?JSON.parse(v):v;},put:async(k,v)=>{assert(k.startsWith('ik:agentic:'));await db.query('insert into public.kv(key,value) values($1,$2) on conflict(key) do update set value=excluded.value',[k,v]);},researchCAS:async(a,b)=>(await db.query('select public.rag_compare_and_swap($1,$2) as ok',[a,b])).rows[0].ok};
    const config={...S.DEFAULTS,enabled:true,autoPublish:true,maxTasks:1,maxSearches:1,maxDocs:1,retries:0,model:'gpt-4.1-mini-2025-04-14',dailyBudget:.05,monthlyBudget:.05,taskBudget:.05,inputPrice:.4,outputPrice:1.6,searchPrice:.005,maxInputBytes:24000,maxOutputTokens:2500,allowed:[{origin:'https://zh.wikisource.org',grade:'B',author:'劉基 傳 / 滴天髓 고전 본문',license:'Public-domain historical text; Wikisource attribution and CC BY-SA 4.0 where applicable',rightsUrl:'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use',commercial:true,quote:true,store:true,automaticSupport:true}]};
    if(cached)config.maxOutputTokens=1000;
    if(revalidate)config.maxDocs=2;
    global.fetch=async(url,init={})=>{
      const u=new URL(url);
      if(u.hostname==='api.search.brave.com'){assert(++report.requests.search<=1);reserved+=.005;}
      else if(u.hostname==='api.openai.com'){assert.equal(u.pathname,'/v1/responses');assert.equal(init.method,'POST');assert(++report.requests.generate<=1);const b=JSON.parse(init.body);assert.equal(b.model,config.model);assert.equal(b.max_output_tokens,config.maxOutputTokens);assert.equal(b.store,false);reserved+=(Buffer.byteLength(b.instructions)+Buffer.byteLength(b.input)+4096)*.4/1e6+config.maxOutputTokens*1.6/1e6;}
      else{assert.equal(u.origin,'https://zh.wikisource.org');report.requests.document++;}
      assert(prior+reserved<=.05,'API cumulative budget exceeded before dispatch');report.cumulativeReservedUSD=prior+reserved;
      const budgetRecord=fs.existsSync(journal)?JSON.parse(fs.readFileSync(journal)):{};fs.writeFileSync(journal,JSON.stringify({...budgetRecord,reservedUSD:prior+reserved}));
      const response=await realFetch(url,init);if(!response.ok&&u.hostname==='api.openai.com'){try{const e=(await response.clone().json()).error;report.providerError={code:e?.code,type:e?.type,param:e?.param,message:String(e?.message||'').slice(0,300)};}catch{}}return response;
    };
    await R.saveConfig(kv,config,0);const job=await R.startResearch(kv,{...keys,GLOSSARY_KV:kv});assert(job.id);
    if(cached){await S.updateState(kv,s=>{const t=s.jobs[job.id].tasks[0];t.documents=cached;t.urls=cached.map(d=>d.url);t.stage=revalidate?'validate':'extract';t.searches=1;if(revalidate)t.extraction=cachedTask.extraction;});report.cachedSource='unmodified document from prior real Brave search and HTTPS collection';if(revalidate)report.cachedAIResponse='unmodified actual OpenAI response; follow cited URL with original quote checks';}
    for(let n=0;n<12;n++){const step=await R.tickResearch(kv,{...keys,GLOSSARY_KV:kv});if(step.completed||step.blocked)break;}
    let state=await S.readState(kv);const task=state.jobs[job.id].tasks[0];report.task={state:task.state,stage:task.stage,errors:task.errors,urls:task.urls};report.actualLedgerUSD=task.accountedCost;report.reservedWorstCaseUSD=reserved;
    report.checks.realSearch=report.requests.search===1;report.checks.realDocument=report.requests.document>0;report.checks.realExtraction=report.requests.generate===1;
    const candidates=Object.values(state.candidates);report.candidates=candidates.map(c=>({id:c.id,kind:c.kind,approval:c.approval,publication:c.publication,automaticEligible:c.validation.automaticEligible}));
    const published=candidates.find(c=>c.publication==='published');if(published){const before=await V.researchView(kv,originals);assert(before.items[0].evidence.length>0);await R.rollbackCandidate(kv,published.id,state.revision,'격리 실제 연구 검증 개별 롤백');const after=await V.researchView(kv,originals);assert.equal(after.items[0].evidence.length,0);assert.deepEqual(after.items[1],originals[1]);report.checks.realAutomaticPublicationAndRollback=true;}
    assert.equal(await kv.get('ik:d:SELF'),originalJSON);report.checks.originalsUnchanged=true;
    const finalState=await S.readState(kv);report.finalPublications=Object.values(finalState.candidates).map(c=>({id:c.id,publication:c.publication}));
    fs.mkdirSync('output/protected-backup/live-research',{recursive:true});fs.writeFileSync('output/protected-backup/live-research/state.json',JSON.stringify(finalState,null,2));report.passed=!!published;
    fs.writeFileSync('docs/AGENTIC_RAG_LIVE_RESEARCH_2026-10-17.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
  }finally{global.fetch=realFetch;await db.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
