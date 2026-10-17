// Read-only post-deployment check. Never logs secret values or calls AI providers.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{cf}=require('./rag-connection-inventory.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
(async()=>{
 const activation=process.argv.includes('--activation');
 const before=activation?JSON.parse(fs.readFileSync('output/protected-backup/rag-activation-cloud-before.json')):JSON.parse(fs.readFileSync('output/protected-backup/production-rollout-before.json')).project;
 const p=await cf('accounts/9691f5fe73bf481a5d884db649c7eb01/pages/projects/mantramanse');
 const comparable=JSON.parse(JSON.stringify(p.deployment_configs.production));if(activation)for(const k of ['RAG_OPENAI_API_KEY','BRAVE_SEARCH_API_KEY','RAG_SCHEDULER_SECRET'])delete comparable.env_vars[k];
 assert.deepEqual(comparable,before.deployment_configs.production,'existing production configuration changed');
 assert.notEqual(p.canonical_deployment.id,before.canonical_deployment.id);
 assert.equal(p.canonical_deployment.environment,'production');
 const manifest=JSON.parse(fs.readFileSync(activation?'output/rag-activation-empty-search-fix/SITE_MANIFEST.json':'output/rag-production-proposal-bb496616/SITE_MANIFEST.json')),checks=[];
 for(const file of ['index.html','report/admin/index.html','report/admin/v2-agentic-rag.js']){
  const r=await fetch('https://mantramanse.pages.dev/'+file,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);
  const data=Buffer.from(await r.arrayBuffer()),expected=manifest.files.find(x=>x.file===file);assert(expected,'file absent from manifest');assert.equal(hash(data),expected.sha256,'deployed asset mismatch: '+file);checks.push({file,status:200,hashMatched:true});
 }
 for(const path of ['/api/agentic-rag','/api/ik?a=stats']){const r=await fetch('https://mantramanse.pages.dev'+path);assert.equal(r.status,401);checks.push({path,anonymousStatus:401});}
 const publicResponse=await fetch('https://mantramanse.pages.dev/api/free-content');assert.equal(publicResponse.status,200);checks.push({path:'/api/free-content',status:200});
 const result={checkedAt:new Date().toISOString(),passed:true,productionDeployment:p.canonical_deployment.id,url:p.canonical_deployment.url,previousDeployment:before.canonical_deployment.id,environment:'production',productionConfigUnchanged:true,compatibilityDate:p.deployment_configs.production.compatibility_date,compatibilityFlags:p.deployment_configs.production.compatibility_flags,checks,aiCalls:0,cronDeployed:false,keysUploaded:false,limitations:['Authenticated dashboard HTTP check unavailable without production admin session; stored production OFF state verified through Supabase SQL.']};
 if(activation){result.scheduler=await cf('accounts/9691f5fe73bf481a5d884db649c7eb01/workers/scripts/mantra-rag-scheduler/schedules');assert.deepEqual(result.scheduler.schedules.map(x=>x.cron),['0 18 * * *']);result.cronDeployed=true;result.keysUploaded=true;result.aiCalls=null;result.limitations=['Authenticated dashboard visually checked separately. No provider-generation success was observed in this production run; search response failed validation.'];}
 fs.writeFileSync('docs/'+(activation?'AGENTIC_RAG_ACTIVATION_DEPLOYMENT_2026-10-17.json':'AGENTIC_RAG_PRODUCTION_DEPLOYMENT_2026-10-17.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
