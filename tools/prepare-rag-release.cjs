// Offline review bundle only. No API access, DB connection, credentials or deploy commands.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const SOURCES=[
  'functions/_agentic-rag.js','functions/_rag-state.js','functions/_rag-network.js','functions/_rag-runner.js','functions/_rag-view.js',
  'functions/_ikstore.js','functions/_interpretation-store.js','functions/_store.js','functions/api/agentic-rag.js','functions/api/ik.js','functions/api/interpretation.js','functions/api/movingtoon-reading.js',
  'report/admin/index.html','report/admin/navigation.js','report/admin/v2-ik.js','report/admin/v2-agentic-rag.js',
  'supabase/migrations/20261017_rag_cas.sql','workers/rag-scheduler.js','workers/rag-scheduler.wrangler.toml','workers/rag-scheduler.enabled.example.toml','config/agentic-rag.production-safe.json'
];
const TESTS=['tests/agentic-rag-sim.cjs','tests/agentic-rag-runtime-sim.cjs','tests/rag-store-sim.cjs','tests/rag-postgres-integration.cjs','tests/ik-sim.js','tests/src-sim.js','tests/interpretation-engine-sim.js','tests/movingtoon-reading-sim.js','tests/reading-answer-sim.js','tests/store-sim.js','tests/store-integration-sim.js','tests/admin-navigation-sim.js','tests/admin-login-sim.js','tests/research-review-api-sim.cjs','tests/chapter-output-schema-sim.js'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
SOURCES.push('tools/rag-backup-audit.cjs');
SOURCES.push('tools/verify-rag-backup-local.cjs');
TESTS.push('tests/rag-backup-audit-sim.cjs');
SOURCES.push('tools/rag-cloud-backup-preflight.cjs','tools/backup-rag-cloud-stores.cjs','tools/verify-rag-cloud-backup.cjs','tools/check-rag-provider-connections.cjs','tools/rag-connection-inventory.cjs');
SOURCES.push('tools/check-rag-backup-links.cjs');
TESTS.push('tests/rag-cloud-backup-sim.cjs','tests/rag-provider-probe-sim.cjs');
TESTS.push('tests/rag-postgres17-sim.cjs');
TESTS.push('tests/rag-extractor-contract.cjs');
TESTS.push('tests/rag-owner-policy.cjs','tests/rag-bulk-fallback.cjs','tests/rag-empty-search.cjs','tests/rag-daily-worker.cjs');
SOURCES.push('tools/rag-pdf-test-server.cjs','tests/reading-pdf-download.cjs');
SOURCES.push('docs/AGENTIC_RAG_FINAL_VALIDATION_2026-10-17.md','docs/AGENTIC_RAG_LIVE_RESEARCH_2026-10-17.json','docs/AGENTIC_RAG_HOSTED_RPC_2026-10-17.json');
const SECRET=/(?:sk-proj-|sk-ant-api03-|sb_secret_)[A-Za-z0-9_-]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
async function main(){
  const root=fs.realpathSync('.'),clock=new Date().toISOString(),result={checkedAt:clock,mode:'offline-review-only',costGeneratingCalls:0,productionReads:0,productionWrites:0,localPreparationPassed:false,operationalDeploymentReady:false,checks:{},tests:[],remaining:['운영 백업 및 실제 ID·승인·게시 집계 대조','실제 검색·AI 연결과 출처 이용 권한·비용 상한 확인','운영과 같은 PostgreSQL 17 환경에서 SQL·REST 권한 확인','무빙툰·PDF 운영 조건 회귀 확인','결과 보고 후 사용자 운영 배포 승인']};
  const {cleanConfig}=await import(pathToFileURL(path.join(root,'functions/_rag-state.js'))),safe=cleanConfig(JSON.parse(fs.readFileSync('config/agentic-rag.production-safe.json','utf8')));
  if(safe.enabled||safe.autoPublish||!safe.legacyOnly||safe.dailyBudget||safe.monthlyBudget||safe.taskBudget)throw Error('unsafe-rollout-template');result.checks.safeRolloutTemplate=true;
  const cron=fs.readFileSync('workers/rag-scheduler.wrangler.toml','utf8');if(!/^crons\s*=\s*\[\s*\]/m.test(cron))throw Error('scheduler-enabled-by-default');result.checks.schedulerDefaultOff=true;
  const sql=fs.readFileSync('supabase/migrations/20261017_rag_cas.sql','utf8');if(!/security invoker/i.test(sql)||/security definer/i.test(sql)||!/search_path = pg_catalog/.test(sql)||/drop\s+table|truncate|delete\s+from/i.test(sql))throw Error('unsafe-sql-migration');result.checks.restrictedAdditiveSQL=true;
  for(const file of TESTS){const r=spawnSync(process.execPath,[file],{cwd:root,encoding:'utf8',maxBuffer:2*1024*1024,timeout:120000});result.tests.push({file,passed:r.status===0,error:r.status===0?null:String(r.stderr||r.stdout||r.error).slice(0,2000)});if(r.status!==0){fs.writeFileSync('docs/AGENTIC_RAG_RELEASE_CHECKS_2026-10-17.json',JSON.stringify(result,null,2)+'\n');throw Error('test-failed:'+file);}}
  const folder=path.join(root,'output','rag-release-review-'+clock.replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8));fs.mkdirSync(folder,{recursive:true});const manifest=[];
  const reviewFiles=[...SOURCES,...TESTS,'docs/AGENTIC_RAG_LOCAL_SANDBOX_2026-10-17.md','docs/AGENTIC_RAG_DEPLOYMENT_GUIDE_2026-10-17.md','docs/AGENTIC_RAG_POSTGRES_TEST_2026-10-17.json'];
  for(const file of reviewFiles){const absolute=fs.realpathSync(path.join(root,file));if(!absolute.toLowerCase().startsWith(root.toLowerCase()+path.sep))throw Error('file-outside-workspace');const data=fs.readFileSync(absolute);if(SECRET.test(data.toString('utf8')))throw Error('possible-secret-in-review-file:'+file);const target=path.join(folder,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(absolute,target);if(sha(fs.readFileSync(target))!==sha(data))throw Error('copy-hash-mismatch:'+file);manifest.push({file,bytes:data.length,sha256:sha(data)});}
  fs.writeFileSync(path.join(folder,'MANIFEST.json'),JSON.stringify({mode:'review-not-deploy',files:manifest},null,2)+'\n');
  fs.writeFileSync(path.join(folder,'README.txt'),'검토용 소스 묶음입니다. 완성된 사이트 배포물이 아닙니다.\n운영 배포 명령·실제 비밀 키·원본 자료·사용자 데이터·운영 백업은 포함하지 않습니다.\n승인 전 SQL 적용·배포·자동 연구 활성화를 하지 마세요.\n');
  result.localPreparationPassed=true;result.checks.allowlistCopyHashesVerified=true;result.checks.knownSecretPatternsAbsent=true;result.reviewFolder=path.relative(root,folder).replace(/\\/g,'/');result.reviewFileCount=manifest.length;
  fs.writeFileSync('docs/AGENTIC_RAG_RELEASE_CHECKS_2026-10-17.json',JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(folder,'CHECKS.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({localPreparationPassed:true,operationalDeploymentReady:false,testsPassed:result.tests.length,reviewFileCount:manifest.length,reviewFolder:result.reviewFolder,costGeneratingCalls:0,productionWrites:0},null,2));
}
module.exports={SOURCES,TESTS};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
