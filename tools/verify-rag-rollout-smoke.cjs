// Local built-artifact checks only; no production host or real API credentials.
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const base='http://127.0.0.1:51527',checks=[];
  for(const pathname of ['/','/report/admin/']){const r=await fetch(base+pathname);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/html/);checks.push({pathname,status:r.status});}
  const denied=await fetch(base+'/api/agentic-rag');assert.equal(denied.status,401);checks.push({pathname:'/api/agentic-rag',anonymousStatus:401});
  const r=await fetch(base+'/api/agentic-rag',{headers:{authorization:'Bearer local-rollout-test'}});assert.equal(r.status,200);const j=await r.json();
  assert.equal(j.runtime.config.enabled,false);assert.equal(j.runtime.config.autoPublish,false);
  for(const k of ['dailyBudget','monthlyBudget','taskBudget'])assert.equal(j.runtime.config[k],0);
  assert.equal(j.capabilities.search,false);assert.equal(j.capabilities.extractor,false);assert.equal(j.capabilities.atomicStorage,false);
  checks.push({pathname:'/api/agentic-rag',authorizedStatus:200,researchEnabled:false,autoPublish:false,budgets:0,externalProvidersConfigured:false});
  const productionCompat=process.argv.includes('--production-compat');
  const result={checkedAt:new Date().toISOString(),passed:true,wrangler:'4.151.1',compatibilityDate:productionCompat?'2026-09-29':'2026-10-17',compatibilityFlags:productionCompat?[]:['nodejs_compat'],checks,productionWrites:0,paidAPICalls:0,limitations:['Local KV/R2 only, no hosted RPC in this smoke test.','Fresh local runtime defaults; production legacyOnly=true verified separately in SQL rehearsal.','Request.cf metadata fetch blocked by sandbox; local HTTP checks passed.']};
  fs.writeFileSync('docs/AGENTIC_RAG_ROLLOUT_SMOKE_2026-10-17.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
