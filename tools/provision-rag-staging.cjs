// Only creates resources with the explicit isolated test name. Never patches production.
const fs=require('node:fs'),crypto=require('node:crypto');
const {cf}=require('./rag-connection-inventory.cjs');
const NAME='mantramanse-rag-test-20261017',OUT='docs/AGENTIC_RAG_STAGING_RESOURCES_2026-10-17.json';
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const snapshot=p=>hash({config:p.deployment_configs?.production,deployment:p.canonical_deployment?.id,branch:p.production_branch});
async function create(path,body){
  if(!path.endsWith('/pages/projects')&&!path.endsWith('/storage/kv/namespaces')&&!path.endsWith('/r2/buckets'))throw Error('write-path-not-authorized');
  if(![body.name,body.title].includes(NAME))throw Error('non-staging-resource-refused');
  const token=process.env.CLOUDFLARE_API_TOKEN||fs.readFileSync('E:/만트라 스튜디오 사업/앱 개발 소스/Cloudflare Workers API token 260411.txt','utf8').trim();
  const r=await fetch('https://api.cloudflare.com/client/v4/'+path,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000),redirect:'error'});
  const d=await r.json();if(!r.ok||!d.success)throw Error('cloudflare-'+r.status+'-'+(d.errors||[]).map(x=>x.code).join(','));return d.result;
}
async function main(){
  const accounts=await cf('accounts?per_page=50');let account,prod;
  for(const a of accounts){const projects=await cf('accounts/'+a.id+'/pages/projects');if(projects.some(p=>p.name==='mantramanse')){if(account)throw Error('ambiguous-production-account');account=a;prod=await cf('accounts/'+a.id+'/pages/projects/mantramanse');}}
  if(!account)throw Error('production-account-not-found');
  const base='accounts/'+account.id,original=snapshot(prod),prodKV=Object.values(prod.deployment_configs?.production?.kv_namespaces||{}).map(x=>x.namespace_id),prodR2=Object.values(prod.deployment_configs?.production?.r2_buckets||{}).map(x=>x.name);
  const report={name:NAME,createdAt:new Date().toISOString(),accountId:account.id,productionWrites:0,productionDataCopied:false,sqlApplied:false,externalResearchExecuted:false,resources:{},blockers:[]};
  function save(){fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');}
  const namespaces=await cf(base+'/storage/kv/namespaces?per_page=100');let kv=namespaces.find(x=>x.title===NAME);
  if(!kv)kv=await create(base+'/storage/kv/namespaces',{title:NAME});
  if(prodKV.includes(kv.id))throw Error('staging-kv-is-production');report.resources.kv={id:kv.id,title:kv.title,isolated:true};save();
  let r2;try{const buckets=await cf(base+'/r2/buckets');r2=(buckets.buckets||[]).find(x=>x.name===NAME);if(!r2)r2=await create(base+'/r2/buckets',{name:NAME});if(prodR2.includes(r2.name))throw Error('staging-r2-is-production');report.resources.r2={name:r2.name,isolated:true};save();}catch(e){report.blockers.push('test-r2:'+e.message);save();}
  let projects=await cf(base+'/pages/projects'),stage=projects.find(x=>x.name===NAME);
  if(!stage)stage=await create(base+'/pages/projects',{name:NAME,production_branch:'isolated-rag-test',deployment_configs:{production:{env_vars:{RAG_ENVIRONMENT:{type:'plain_text',value:'isolated-test'}},kv_namespaces:{GLOSSARY_KV:{namespace_id:kv.id}},...(r2?{r2_buckets:{CLIPS_R2:{name:r2.name}}}:{})}}});
  const checked=await cf(base+'/pages/projects/'+NAME),config=checked.deployment_configs?.production||{};
  if(checked.source)throw Error('unexpected-connected-git-source');
  if(Object.values(config.kv_namespaces||{}).some(x=>prodKV.includes(x.namespace_id))||Object.values(config.r2_buckets||{}).some(x=>prodR2.includes(x.name)))throw Error('shared-production-resource');
  const vars=config.env_vars||{};report.resources.pages={name:checked.name,domain:checked.subdomain,gitConnected:false,kvBoundToTest:config.kv_namespaces?.GLOSSARY_KV?.namespace_id===kv.id,r2BoundToTest:config.r2_buckets?.CLIPS_R2?.name===r2?.name,secretNames:Object.keys(vars).filter(k=>vars[k].type==='secret_text')};
  report.productionConfigurationUnchanged=original===snapshot(await cf(base+'/pages/projects/mantramanse'));
  report.blockers.push('Separate Supabase project and SQL management connection required','OpenAI and Brave test API keys required');save();console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(JSON.stringify({error:e.message,productionWrites:0,secretsPrinted:false}));process.exitCode=1;});
