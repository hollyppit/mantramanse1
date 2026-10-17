// Real PostgreSQL engine and real migration. External providers are FIXTURES in this test.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const pg17=process.env.RAG_TEST_PG_MAJOR==='17';
const {PGlite}=require(pg17?'../output/rag-pg17-tools/node_modules/@electric-sql/pglite':'../output/rag-staging-tools/node_modules/@electric-sql/pglite');
const Backup=require('../tools/rag-backup-audit.cjs');
(async()=>{
  const root=path.resolve('output/rag-postgres-test'),dir=path.join(root,crypto.randomUUID());fs.mkdirSync(root,{recursive:true});
  let db=await PGlite.create();const imp=f=>import(pathToFileURL(path.resolve(f))),K=await imp('functions/_ik.js'),R=await imp('functions/_rag-runner.js'),S=await imp('functions/_rag-state.js'),V=await imp('functions/_rag-view.js');
  const result={checkedAt:new Date().toISOString(),databaseEngine:'PostgreSQL/PGlite',hostedSupabase:false,providerMode:'fixture',liveExternalAI:false,productionAccess:false,checks:{}};
  const originalFetch=global.fetch;
  try{
    result.postgresVersion=(await db.query('select version() as version')).rows[0].version;
    if(pg17)assert(result.postgresVersion.startsWith('PostgreSQL 17.'),'PostgreSQL 17 runtime required');
    await db.exec('create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;');
    await db.exec(fs.readFileSync('supabase/schema.sql','utf8'));
    await db.exec('grant usage on schema public to service_role,anon,authenticated;grant all on public.kv to service_role;');
    await db.exec(fs.readFileSync('supabase/migrations/20261017_rag_cas.sql','utf8'));result.checks.migrationApplied=true;
    const permissions=(await db.query("select prosecdef,proconfig from pg_proc where oid='public.rag_compare_and_swap(text,text)'::regprocedure")).rows[0];assert.equal(permissions.prosecdef,false);assert(permissions.proconfig.includes('search_path=pg_catalog'));result.checks.noOwnerPrivilegeEscalation=true;
    const role=(name,fn)=>db.transaction(async tx=>{assert(['anon','authenticated','service_role'].includes(name));await tx.exec('set local role '+name);return fn(tx);});
    const cas=(expected,next)=>role('service_role',async tx=>(await tx.query('select public.rag_compare_and_swap($1,$2) as ok',[expected,next])).rows[0].ok);
    for(const name of ['anon','authenticated']){
      await assert.rejects(role(name,tx=>tx.query('select public.rag_compare_and_swap(null,$1)',['{}'])),/permission denied/);
      await assert.rejects(role(name,tx=>tx.query('select * from public.kv')),/permission denied/);
    }
    result.checks.anonymousAndAuthenticatedDenied=true;
    const races=await Promise.all(Array.from({length:6},(_,i)=>cas(null,JSON.stringify({probe:i}))));assert.equal(races.filter(Boolean).length,1);assert.equal(await cas('stale','{}'),false);result.checks.atomicCAS=true;
    // This reset affects only the newly created disposable probe row in this test database.
    await db.query('delete from public.kv where key=$1',[S.STATE_KEY]);
    const originals=[1,2].map(n=>({...K.cleanItem({id:'SELF-000'+n,title:'격리 DB 검증 지식 '+n,domain:'SELF',subDomain:K.DEFAULT_DESIGN.SELF.sections[0].id,status:'published',reviewed:true,sourceType:'book',principle:'시험 문헌의 전통 원칙 '+n,interpretation:'시험 조건의 전통 설명 '+n,conditions:{dayMaster:[n===1?'갑':'을']},stance:'neutral'},null),version:8}));
    const seed=[['ik:d:SELF',JSON.stringify(originals)],['src:idx',JSON.stringify([{id:'original-document',title:'보존 검사 원본',approved:true}])],['src:cand:original-document',JSON.stringify([{id:'original-candidate',status:'approved',knowledgeId:originals[0].id}])]];
    for(const[k,v]of seed)await db.query('insert into public.kv(key,value) values($1,$2)',[k,v]);
    // Restore the complete pre-rollout archive into a separate empty engine, never the source.
    const preRows=(await db.query('select * from public.kv order by key')).rows;
    const preDump=await db.dumpDataDir(),restored=await PGlite.create({loadDataDir:preDump});
    try{result.backupRestore=Backup.compare(preRows,(await restored.query('select * from public.kv order by key')).rows);assert.equal(result.backupRestore.counts.knowledge,2);assert.equal(result.backupRestore.counts.published,2);assert.equal(result.backupRestore.counts.reviewed,2);}finally{await restored.close();}
    result.checks.preRolloutBackupRestoredExactly=true;
    const baseline=JSON.stringify((await db.query("select key,value from public.kv where key not like 'ik:agentic:%' order by key")).rows);
    const kv={get:async(k,t)=>{const x=await role('service_role',tx=>tx.query('select value from public.kv where key=$1',[k]));const v=x.rows[0]?.value??null;return t==='json'&&v!==null?JSON.parse(v):v;},put:async(k,v)=>{assert(k.startsWith('ik:agentic:'));await role('service_role',tx=>tx.query('insert into public.kv(key,value) values($1,$2) on conflict(key) do update set value=excluded.value',[k,v]));},researchCAS:cas};
    const allowed={origin:'https://rag-fixture.org',grade:'A',author:'격리 테스트 저자',license:'테스트 fixture 사용 허용',rightsUrl:'https://rag-fixture.org/rights',commercial:true,quote:true,store:true,automaticSupport:true};
    const config={...S.DEFAULTS,enabled:true,autoPublish:true,dailyBudget:1,monthlyBudget:1,taskBudget:1,maxTasks:2,maxSearches:1,maxDocs:1,retries:0,model:'postgres-test-model',searchPrice:.01,inputPrice:1,outputPrice:1,allowed:[allowed]};
    global.fetch=async(url,init={})=>{
      if(String(url).startsWith('https://api.search.brave.com/'))return Response.json({web:{results:[{url:'https://rag-fixture.org/book',title:'검증 원문'}]}});
      if(String(url)==='https://rag-fixture.org/book')return new Response(originals.map(x=>x.principle+' '+x.interpretation).join(' '),{headers:{'content-type':'text/plain'}});
      if(String(url)==='https://api.openai.com/v1/responses'){const input=JSON.parse(JSON.parse(init.body).input),item={...input.target};delete item.id;return Response.json({status:'completed',model:config.model,usage:{input_tokens:100,output_tokens:100},output_text:JSON.stringify({kind:'evidence',sourceUrl:'https://rag-fixture.org/book',quote:item.principle+' '+item.interpretation,item})});}
      throw Error('non-fixture-network-forbidden');
    };
    const env={GLOSSARY_KV:kv,BRAVE_SEARCH_API_KEY:'fixture-only',OPENAI_API_KEY:'fixture-only'};
    await R.saveConfig(kv,config,0);await R.startResearch(kv,env);
    for(let n=0;n<20;n++){const x=await R.tickResearch(kv,env);if(x.blocked||x.completed)break;}
    let s=await S.readState(kv);assert.equal(Object.keys(s.active).length,2);assert(Object.values(s.candidates).every(c=>c.approval==='automatic_approved'&&c.publication==='published'));
    result.checks.automaticPublicationWithFixtureProviders=true;
    let view=await V.researchView(kv,originals);assert(view.items.every(x=>x.version===9&&x.evidence.length===1));
    // Follow the published sidecar through the actual source index, rule engine and PDF template.
    const vm=require('node:vm'),E=await imp('functions/_interpretation-engine.js'),D=await imp('functions/_interpretation-store.js');
    for(const file of ['engine.js','report/v2/saju-data.js','report/v2/reading-flow.js','report/v2/pdf.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
    let sd;for(let day=1;day<=25;day++){const ch=Manse.compute({year:1992,month:6,day,hour:1,minute:0,calendar:'solar',gender:'M',city:'서울'}),candidate=ReportV2.SajuData.build(ch,{now:Date.UTC(2026,9,17)});if(K.deriveFacts(candidate).dayMaster==='갑'){sd=candidate;break;}}assert(sd);
    const analyze=async items=>E.analyze(sd,items,{sourceIndex:await D.loadSourceIndex(kv,items,new Set())});
    const publishedAnalysis=await analyze(view.items);assert(publishedAnalysis.claims.some(c=>c.knowledge_id===originals[0].id));
    const rep={readingFlow:{future:[]},chapters:[{title:'격리 검증 성격',readingSection:1,readingCore:{},readingParagraphs:[{role:'basis',text:originals[0].interpretation}],interpretationAnalysis:{...publishedAnalysis,mode:'grounded'}}]};
    const html=ReportV2.Pdf.pages(rep,sd,{name:'격리 테스트'}).join('');assert(html.includes(originals[0].principle));assert(html.includes(originals[0].interpretation));assert(html.includes('인용:'));
    result.checks.publishedEvidenceReachesReadingAndPdfTemplate=true;
    const selected=Object.values(s.candidates).find(c=>c.knowledgeId===originals[0].id);await R.rollbackCandidate(kv,selected.id,s.revision,'실제 PostgreSQL 개별 롤백 시험');
    view=await V.researchView(kv,originals);assert.equal(view.items[0].version,8);assert.equal(view.items[0].evidence.length,0);assert.equal(view.items[1].version,9);assert.equal(view.items[1].evidence.length,1);result.checks.individualRollback=true;
    const rolledAnalysis=await analyze(view.items);assert(!rolledAnalysis.claims.some(c=>c.knowledge_id===originals[0].id));result.checks.rolledBackEvidenceExcludedFromReading=true;
    const after=JSON.stringify((await db.query("select key,value from public.kv where key not like 'ik:agentic:%' order by key")).rows);assert.equal(after,baseline);result.checks.originalRowsApprovalPublicationUnchanged=true;
    s=await S.readState(kv);assert(s.events.some(e=>e.type==='rollback'));assert.equal(Object.values(s.candidates).length,2);result.checks.historyRetained=true;
    const postRows=(await db.query('select * from public.kv order by key')).rows;
    const dump=await db.dumpDataDir();fs.mkdirSync(dir,{recursive:true});const dumpPath=path.join(dir,'postgres-data.tar.gz');fs.writeFileSync(dumpPath,Buffer.from(await dump.arrayBuffer()));await db.close();db=await PGlite.create({loadDataDir:new Blob([fs.readFileSync(dumpPath)])});const stored=JSON.parse((await db.query('select value from public.kv where key=$1',[S.STATE_KEY])).rows[0].value);assert.equal(Object.values(stored.candidates).filter(c=>c.publication==='rolled_back').length,1);result.checks.diskPersistence=true;
    Backup.compare(postRows,(await db.query('select * from public.kv order by key')).rows);result.checks.postRolloutBackupRestoredExactly=true;
    assert.throws(()=>Backup.compare(preRows,preRows.map((r,i)=>i? r:{...r,value:'[]'})),/differs/);result.checks.corruptRestoreRejected=true;
    result.passed=true;fs.writeFileSync(pg17?'docs/AGENTIC_RAG_POSTGRES17_TEST_2026-10-17.json':'docs/AGENTIC_RAG_POSTGRES_TEST_2026-10-17.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
  }finally{global.fetch=originalFetch;await db.close();}
})().catch(e=>{console.error(require('node:util').inspect(e,{depth:2,maxArrayLength:5}));process.exitCode=1;});
