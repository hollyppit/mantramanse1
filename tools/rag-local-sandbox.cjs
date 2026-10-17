// Local-only PostgreSQL sandbox. No production credentials, URLs, data or paid API calls.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {PGlite}=require('../output/rag-staging-tools/node_modules/@electric-sql/pglite');
(async()=>{
  const imp=f=>import(pathToFileURL(path.resolve(f))),K=await imp('functions/_ik.js'),R=await imp('functions/_rag-runner.js'),S=await imp('functions/_rag-state.js'),V=await imp('functions/_rag-view.js'),API=await imp('functions/api/agentic-rag.js');
  const db=await PGlite.create(),session=crypto.randomUUID(),admin=crypto.randomUUID();
  await db.exec('create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;');
  await db.exec(fs.readFileSync('supabase/schema.sql','utf8'));await db.exec('grant usage on schema public to service_role,anon,authenticated;grant all on public.kv to service_role;');await db.exec(fs.readFileSync('supabase/migrations/20261017_rag_cas.sql','utf8'));
  const originals=[1,2].map(n=>({...K.cleanItem({id:'SELF-000'+n,title:'로컬 검증 지식 '+n,domain:'SELF',subDomain:K.DEFAULT_DESIGN.SELF.sections[0].id,status:'published',reviewed:true,sourceType:'book',principle:'검증 문헌의 조건부 원칙 '+n,interpretation:'조건에 따른 전통 설명 '+n,conditions:{dayMaster:[n===1?'갑':'을']},stance:'neutral'},null),version:1}));
  const originalRows=[['ik:d:SELF',JSON.stringify(originals)],['src:idx',JSON.stringify([{id:'local-original',title:'운영과 무관한 테스트 자료',approved:true}])],['src:cand:local-original',JSON.stringify([{id:'local-approved',status:'approved'}])]];
  for(const[k,v]of originalRows)await db.query('insert into public.kv(key,value) values($1,$2)',[k,v]);
  const base=JSON.stringify((await db.query("select key,value from public.kv where key not like 'ik:agentic:%' order by key")).rows);
  const role=fn=>db.transaction(async tx=>{await tx.exec('set local role service_role');return fn(tx);});
  const kv={get:async(k,t)=>{const x=await role(tx=>tx.query('select value from public.kv where key=$1',[k]));const v=x.rows[0]?.value??null;return v!==null&&t==='json'?JSON.parse(v):v;},put:async(k,v)=>{if(!k.startsWith('ik:agentic:'))throw Error('original-write-forbidden');await role(tx=>tx.query('insert into public.kv(key,value) values($1,$2) on conflict(key) do update set value=excluded.value',[k,v]));},researchCAS:async(a,b)=>(await role(tx=>tx.query('select public.rag_compare_and_swap($1,$2) as ok',[a,b]))).rows[0].ok};
  global.fetch=async(url,init={})=>{
    if(String(url).startsWith('https://api.search.brave.com/'))return Response.json({web:{results:[{url:'https://sandbox-fixture.org/book',title:'모의 문헌'}]}});
    if(String(url)==='https://sandbox-fixture.org/book')return new Response(originals.map(x=>x.principle+' '+x.interpretation).join(' '),{headers:{'content-type':'text/plain'}});
    if(String(url)==='https://api.openai.com/v1/responses'){const t=JSON.parse(JSON.parse(init.body).input).target;delete t.id;return Response.json({status:'completed',model:'local-fixture-model',usage:{input_tokens:100,output_tokens:100},output_text:JSON.stringify({kind:'evidence',sourceUrl:'https://sandbox-fixture.org/book',quote:t.principle+' '+t.interpretation,item:t})});}
    throw Error('sandbox-external-network-forbidden');
  };
  const env={GLOSSARY_KV:kv,ADMIN_PASSWORD:admin,BRAVE_SEARCH_API_KEY:'fixture-no-real-key',OPENAI_API_KEY:'fixture-no-real-key'};
  const config={...S.DEFAULTS,enabled:true,autoPublish:true,maxTasks:2,maxSearches:1,maxDocs:1,retries:0,model:'local-fixture-model',dailyBudget:1,monthlyBudget:1,taskBudget:1,inputPrice:1,outputPrice:1,searchPrice:.01,allowed:[{origin:'https://sandbox-fixture.org',grade:'A',author:'로컬 테스트 저자',license:'테스트 fixture 전용',rightsUrl:'https://sandbox-fixture.org/rights',commercial:true,quote:true,store:true,automaticSupport:true}]};
  const css=fs.readFileSync('report/admin/index.html','utf8').match(/<style>([\s\S]*?)<\/style>/)[1];let origin,scenarioRunning=false;
  const json=(r,d,status=200)=>{r.writeHead(status,{'content-type':'application/json;charset=utf-8','cache-control':'no-store'});r.end(JSON.stringify(d));};
  const check=async()=>JSON.stringify((await db.query("select key,value from public.kv where key not like 'ik:agentic:%' order by key")).rows)===base;
  const server=http.createServer(async(q,r)=>{try{
    if(q.headers.host!==new URL(origin).host)return json(r,{error:'invalid-host'},403);
    if(q.method==='POST'&&q.headers.origin!==origin)return json(r,{error:'invalid-origin'},403);
    if(q.url==='/panel.js'){r.writeHead(200,{'content-type':'text/javascript;charset=utf-8'});r.end(fs.readFileSync('report/admin/v2-agentic-rag.js'));return;}
    if(q.url==='/'){
      r.writeHead(200,{'content-type':'text/html;charset=utf-8','set-cookie':'rag_sandbox='+session+'; HttpOnly; SameSite=Strict; Path=/','cache-control':'no-store'});
      r.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><title>만트라 RAG 로컬 검증</title><style>'+css+'</style><div class="wrap"><div class="card"><h1>운영과 분리된 로컬 검증</h1><p>실제 PostgreSQL · 운영 데이터 접근 없음 · 외부 API 응답은 모의 · 유료 호출 없음</p><p>아래 실행 후 게시 이력에서 지식 하나만 롤백해 볼 수 있습니다. 화면의 비용은 모의값입니다.</p><button id="scenario">자동 게시 검증 실행</button><button id="integrity">원본 보존 검사</button><p id="localStatus" role="status"></p></div><div id="t-agentic"></div></div><script src="/panel.js"></script><script>async function refresh(){await V2AgenticRag.open("local-test");}document.querySelector("#scenario").onclick=async function(){this.disabled=true;try{var r=await fetch("/sandbox/run",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});var d=await r.json();document.querySelector("#localStatus").textContent=JSON.stringify(d);await refresh();}finally{this.disabled=false;}};document.querySelector("#integrity").onclick=async function(){var d=await(await fetch("/sandbox/check")).json();document.querySelector("#localStatus").textContent=d.originalRowsUnchanged?"원본 자료·승인·게시 상태 보존 확인":"원본 검사 실패";};refresh();</script></html>');return;
    }
    if(!String(q.headers.cookie||'').split(';').some(x=>x.trim()==='rag_sandbox='+session))return json(r,{error:'sandbox-session-required'},401);
    if(q.url==='/sandbox/check'&&q.method==='GET')return json(r,{originalRowsUnchanged:await check(),productionAccess:false,externalAPIs:'fixture',...(await V.researchView(kv,originals)).items.reduce((a,x)=>(a.versions[x.id]=x.version,a),{versions:{}})});
    if(q.url==='/sandbox/run'&&q.method==='POST'){
      if(scenarioRunning)return json(r,{error:'scenario-already-running'},409);scenarioRunning=true;
      try{let s=await S.readState(kv);if(Object.keys(s.candidates).length)return json(r,{message:'기존 검증 결과를 보존합니다. 재검증하려면 서버를 새로 시작하세요.',originalRowsUnchanged:await check()});await R.saveConfig(kv,config,s.revision);await R.startResearch(kv,env);for(let i=0;i<20;i++){const step=await R.tickResearch(kv,env);if(step.blocked||step.completed)break;}s=await S.readState(kv);return json(r,{automaticPublished:Object.keys(s.active).length,originalRowsUnchanged:await check(),database:'real PostgreSQL',externalAPIs:'fixture',actualAPICost:0});}finally{scenarioRunning=false;}
    }
    if(q.url.startsWith('/api/agentic-rag')){
      let body='';for await(const part of q){body+=part;if(Buffer.byteLength(body)>65536)return json(r,{error:'request-too-large'},413);}
      const response=await API.onRequest({request:new Request(origin+q.url,{method:q.method,headers:{authorization:'Bearer '+admin,'content-type':'application/json'},...(q.method==='POST'?{body}:{})}),env});r.writeHead(response.status,{'content-type':'application/json;charset=utf-8','cache-control':'no-store'});r.end(await response.text());return;
    }
    json(r,{error:'not-found'},404);
  }catch(e){json(r,{error:e.message},500);}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;console.log(JSON.stringify({url:origin,mode:'local-postgres-fixture',productionAccess:false,paidAPICalls:false}));
  async function close(){server.close();const dir=path.resolve('output/rag-local-sandbox');fs.mkdirSync(dir,{recursive:true});const dump=await db.dumpDataDir();fs.writeFileSync(path.join(dir,'session-'+session+'.tar.gz'),Buffer.from(await dump.arrayBuffer()));await db.close();process.exit(0);}
  process.once('SIGINT',close);process.once('SIGTERM',close);
})().catch(e=>{console.error(e.message||String(e));process.exitCode=1;});
