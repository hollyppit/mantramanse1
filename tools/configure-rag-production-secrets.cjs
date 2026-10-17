// Approved activation only. Never prints credential values. Existing shared OPENAI_API_KEY is preserved.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{cf}=require('./rag-connection-inventory.cjs'),{readConfig}=require('./check-rag-provider-connections.cjs');
(async()=>{
 assert(process.argv.includes('--approved-activation'),'owner approval required');
 const base='accounts/9691f5fe73bf481a5d884db649c7eb01/pages/projects/mantramanse',p=await cf(base),cfg=p.deployment_configs.production;
 const keys=readConfig('output/protected-backup/api-probe.env');assert(keys.OPENAI_API_KEY&&keys.BRAVE_SEARCH_API_KEY,'missing local keys');
 const privateFile='output/protected-backup/rag-production-scheduler.json';
 const secret=fs.existsSync(privateFile)?JSON.parse(fs.readFileSync(privateFile)).secret:crypto.randomBytes(32).toString('base64url');
 fs.writeFileSync(privateFile,JSON.stringify({secret,origin:'https://mantramanse.pages.dev'}));
 fs.writeFileSync('output/protected-backup/rag-activation-cloud-before.json',JSON.stringify(p));
 const env_vars={RAG_OPENAI_API_KEY:{type:'secret_text',value:keys.OPENAI_API_KEY},BRAVE_SEARCH_API_KEY:{type:'secret_text',value:keys.BRAVE_SEARCH_API_KEY},RAG_SCHEDULER_SECRET:{type:'secret_text',value:secret}};
 // Official secret-specific CLI operations only. No hand-built project PATCH or old secret replay.
 const {spawnSync}=require('node:child_process'),path=require('node:path');
 const env={...process.env,CLOUDFLARE_ACCOUNT_ID:'9691f5fe73bf481a5d884db649c7eb01',CLOUDFLARE_API_TOKEN:fs.readFileSync('E:/만트라 스튜디오 사업/앱 개발 소스/Cloudflare Workers API token 260411.txt','utf8').trim(),WRANGLER_SEND_METRICS:'false',XDG_CONFIG_HOME:path.resolve('output/rag-deploy-tools/config'),WRANGLER_LOG_PATH:path.resolve('output/rag-deploy-tools/secret-put.log')};
 for(const [name,v]of Object.entries(env_vars)){
  const r=spawnSync(process.execPath,['output/rag-deploy-tools/node_modules/wrangler/bin/wrangler.js','pages','secret','put',name,'--project-name','mantramanse'],{env,input:v.value+'\n',encoding:'utf8',timeout:60000});
  assert.equal(r.status,0,'official secret put failed: '+name);
 }
 const after=await cf(base),next=after.deployment_configs.production;
 for(const [k,v]of Object.entries(cfg.env_vars))if(!Object.hasOwn(env_vars,k))assert.deepEqual(next.env_vars[k],v,'existing variable changed '+k);
 for(const k of ['kv_namespaces','r2_buckets','compatibility_date','compatibility_flags'])assert.deepEqual(next[k],cfg[k]);
 const report={at:new Date().toISOString(),uploadedNames:Object.keys(env_vars),existingVariablesPreserved:true,bindingsPreserved:true,secretValuesPrinted:false};fs.writeFileSync('docs/AGENTIC_RAG_ACTIVATION_SECRETS_2026-10-17.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
