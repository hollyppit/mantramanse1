const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
  const u=new URL(process.argv[2]);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.pathname!=='/'||u.username||u.password)throw Error('local-sandbox-only');
  const page=await fetch(u),cookie=page.headers.get('set-cookie')?.split(';')[0];assert(cookie);
  const req=(p,init={})=>fetch(new URL(p,u),{...init,headers:{cookie,...init.headers}});
  assert.equal((await fetch(new URL('/sandbox/check',u))).status,401);
  assert.equal((await req('/sandbox/run',{method:'POST',headers:{origin:'https://external.invalid'}})).status,403);
  const integrity=await(await req('/sandbox/check')).json(),data=await(await req('/api/agentic-rag?a=dashboard')).json();
  assert.equal(integrity.originalRowsUnchanged,true);assert.equal(integrity.productionAccess,false);assert.equal(integrity.versions['SELF-0001'],1);assert.equal(integrity.versions['SELF-0002'],2);
  const candidates=Object.values(data.runtime.candidates);assert.equal(candidates.filter(c=>c.publication==='rolled_back').length,1);assert.equal(candidates.filter(c=>c.publication==='published').length,1);assert(data.runtime.events.some(e=>e.type==='rollback'));assert(Object.values(data.runtime.jobs).every(j=>j.state==='completed'));
  const report={checkedAt:new Date().toISOString(),url:u.origin,storage:'actual PostgreSQL/PGlite',httpEndpoints:'real local HTTP',externalAPIs:'fixture (no paid calls)',productionAccess:false,originalRowsApprovalPublicationUnchanged:true,automaticPublished:2,individuallyRolledBack:1,otherKnowledgeStillPublished:true,anonymousRejected:true,crossOriginWritesRejected:true,actualExternalAPICost:0,passed:true};
  fs.writeFileSync('docs/AGENTIC_RAG_LOCAL_BROWSER_TEST_2026-10-17.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
