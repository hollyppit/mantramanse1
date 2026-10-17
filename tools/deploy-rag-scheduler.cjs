// Explicitly approved scheduler deployment. Secrets are delivered through stdin only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
assert(process.argv.includes('--approved-activation'));
const activate=process.argv.includes('--enable-cron'),config='output/rag-activation/'+(activate?'worker-on.toml':'worker-off.toml');
const env={...process.env,CLOUDFLARE_ACCOUNT_ID:'9691f5fe73bf481a5d884db649c7eb01',CLOUDFLARE_API_TOKEN:fs.readFileSync('E:/만트라 스튜디오 사업/앱 개발 소스/Cloudflare Workers API token 260411.txt','utf8').trim(),WRANGLER_SEND_METRICS:'false',XDG_CONFIG_HOME:path.resolve('output/rag-deploy-tools/config'),WRANGLER_LOG_PATH:path.resolve('output/rag-deploy-tools/scheduler-deploy.log')};
function run(args,input){const r=spawnSync(process.execPath,['output/rag-deploy-tools/node_modules/wrangler/bin/wrangler.js',...args],{env,input,encoding:'utf8',timeout:120000});if(r.status!==0){console.error(r.stderr||r.stdout);throw Error('scheduler command failed');}return r.stdout;}
if(!activate){console.log(run(['deploy','--config',config]));const secret=JSON.parse(fs.readFileSync('output/protected-backup/rag-production-scheduler.json')).secret;run(['secret','put','RAG_SCHEDULER_SECRET','--config',config],secret+'\n');console.log('scheduler secret configured; cron OFF');}
else console.log(run(['deploy','--config',config]));
