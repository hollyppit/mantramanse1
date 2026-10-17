// User-authorized production deployment. Only public site assets and the compiled worker are packaged.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const {cf}=require('./rag-connection-inventory.cjs');
const token=()=>process.env.CLOUDFLARE_API_TOKEN||fs.readFileSync('E:/만트라 스튜디오 사업/앱 개발 소스/Cloudflare Workers API token 260411.txt','utf8').trim();
const DIR='output/cinematic-deploy',BASE='https://mantramanse.pages.dev',PROJECT='accounts/9691f5fe73bf481a5d884db649c7eb01/pages/projects/mantramanse';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const changed=['report/admin/index.html','report/admin/v2-onboard.js','report/hub/index.html','report/hub/hub-onboard.js','report/story/story.js'];
const added=['report/admin/v2-cinematic.js','report/hub/cinematic-data.js','report/hub/cinematic.css','report/hub/cinematic.js'];
function tracked(){const p=spawnSync('git',['ls-files','-z'],{encoding:'utf8'});assert.equal(p.status,0);return p.stdout.split('\0').filter(f=>['index.html','engine.js','shared-core.js'].includes(f)||f.startsWith('report/')&&/\.(js|css|html|json|png|jpe?g|svg|webp|ico|woff2?|txt|xml)$/i.test(f));}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,url);return Buffer.from(await r.arrayBuffer())}
async function main(){const mode=process.argv[2];fs.mkdirSync(DIR,{recursive:true});
if(mode==='prepare'){
 const files=[...tracked(),...added],site=DIR+'/site';fs.mkdirSync(site,{recursive:true});const manifest=[];
 for(const f of files){const data=fs.readFileSync(f);assert(!/(?:sk-proj-|sb_secret_)[A-Za-z0-9_-]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(data.toString('utf8')),f);const out=path.join(site,f);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,data);manifest.push({file:f,sha256:sha(data),bytes:data.length})}
 for(const [name,source]of [['_worker.js','index.js'],['_routes.json','_routes.json']])fs.copyFileSync(DIR+'/build/'+source,site+'/'+name);
 fs.writeFileSync(DIR+'/manifest.json',JSON.stringify({files:manifest,workerSHA256:sha(fs.readFileSync(site+'/_worker.js')),excluded:['docs','tests','tools','output/protected-backup','config','supabase','workers','.git','.env']},null,2));console.log('Prepared '+manifest.length+' allowlisted public files');
}else if(mode==='audit'){
 const config=await get(BASE+'/api/onboarding');fs.writeFileSync(DIR+'/public-onboarding-before.json',config);
 const files=tracked(),mismatch=[],checks=[];let cursor=0;
 await Promise.all(Array.from({length:6},async()=>{while(cursor<files.length){const f=files[cursor++],remote=await get(BASE+'/'+f);let expected=fs.readFileSync(f);if(changed.includes(f)){const p=spawnSync('git',['show','HEAD:'+f],{maxBuffer:4*1024*1024});assert.equal(p.status,0);expected=p.stdout;}const matches=sha(remote)===sha(expected);checks.push({file:f,matches});if(!matches)mismatch.push(f)}}));
 fs.writeFileSync(DIR+'/baseline-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,mismatch},null,2));assert.deepEqual(mismatch,[],'Live assets differ from intended unchanged baseline');console.log('Production baseline matched '+checks.length+' files; public onboarding backed up');
}else if(mode==='deploy'){
 const before=JSON.parse(fs.readFileSync(DIR+'/metadata-before.json')),audit=JSON.parse(fs.readFileSync(DIR+'/baseline-audit.json'));assert.equal(audit.mismatch.length,0);
 const prior=fs.existsSync(DIR+'/deployment.json')?JSON.parse(fs.readFileSync(DIR+'/deployment.json')).deployment:before.deployment;
 const p=await cf(PROJECT);assert.equal(p.canonical_deployment.id,prior,'Production changed since preflight');assert.equal(sha(JSON.stringify(p.deployment_configs.production)),before.configHash);
 const env={...process.env,CLOUDFLARE_ACCOUNT_ID:'9691f5fe73bf481a5d884db649c7eb01',CLOUDFLARE_API_TOKEN:token(),WRANGLER_SEND_METRICS:'false',XDG_CONFIG_HOME:path.resolve('output/rag-deploy-tools/config'),WRANGLER_LOG_PATH:path.resolve(DIR+'/deploy.log')};
 const d=spawnSync(process.execPath,['output/rag-deploy-tools/node_modules/wrangler/bin/wrangler.js','pages','deploy',DIR+'/site','--project-name','mantramanse','--branch',before.branch,'--commit-dirty=true','--commit-message','Cinematic onboarding and integrated CMS','--no-bundle'],{env,encoding:'utf8',timeout:180000});console.log(d.stdout);if(d.status!==0){console.error(d.stderr);throw Error('Deployment failed')}
 const after=await cf(PROJECT);assert.equal(sha(JSON.stringify(after.deployment_configs.production)),before.configHash,'Production config changed');fs.writeFileSync(DIR+'/deployment.json',JSON.stringify({at:new Date().toISOString(),deployment:after.canonical_deployment.id,url:after.canonical_deployment.url,previousDeployment:prior,originalDeployment:before.deployment,environment:after.canonical_deployment.environment,configUnchanged:true},null,2));console.log('Production deployed; configuration unchanged');
}else if(mode==='verify'){
 const m=JSON.parse(fs.readFileSync(DIR+'/manifest.json')),checks=[];
 for(const f of [...changed,...added]){const d=await get(BASE+'/'+f);assert.equal(sha(d),m.files.find(x=>x.file===f).sha256,f);checks.push({file:f,hashMatched:true})}
 const data=await get(BASE+'/api/onboarding');
 if(process.argv.includes('--published')){const before=JSON.parse(fs.readFileSync(DIR+'/public-onboarding-before.json')).config,after=JSON.parse(data).config;assert.equal(after.renewal.cinematic.scenes.length,7);for(const k of Object.keys(before))if(k!=='renewal')assert.deepEqual(after[k],before[k],k);assert.deepEqual(after.renewal.scenes,before.renewal.scenes);assert.deepEqual(after.renewal.previews,before.renewal.previews);}
 else assert.equal(sha(data),sha(fs.readFileSync(DIR+'/public-onboarding-before.json')),'Published onboarding changed unexpectedly');
 for(const [method,url,body]of [['GET','/api/onboarding?draft=1'],['PUT','/api/onboarding',{}],['POST','/api/onboarding?action=publish']]){const r=await fetch(BASE+url,{method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,401);checks.push({method,url,unauthenticatedStatus:r.status})}
 for(const url of ['/api/free-content','/report/hub/','/report/v2/']){const r=await fetch(BASE+url);assert.equal(r.status,200);checks.push({url,status:r.status})}
 fs.writeFileSync(DIR+'/server-verification.json',JSON.stringify({passed:true,checks,publicContentPreserved:true},null,2));console.log('Production assets, auth gates, public content and report routes verified');
}else throw Error('mode required');}
main().catch(e=>{console.error(e.message);process.exitCode=1});
