// Read-only account/config/usage inspection. No data writes, deployments or inference.
const fs=require('node:fs'),crypto=require('node:crypto');
const {cf}=require('./rag-connection-inventory.cjs');
const ACCOUNT='9691f5fe73bf481a5d884db649c7eb01',BASE='accounts/'+ACCOUNT;
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function gql(query){const token=process.env.CLOUDFLARE_API_TOKEN||fs.readFileSync('E:/만트라 스튜디오 사업/앱 개발 소스/Cloudflare Workers API token 260411.txt','utf8').trim();const r=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.timeout(20000),redirect:'error'});const d=await r.json();if(!r.ok||d.errors?.length)throw Error('analytics-unavailable:'+r.status+':'+(d.errors||[]).map(e=>e.message).join(',').slice(0,250));return d.data;}
async function main(){
  const now=new Date(),month=now.toISOString().slice(0,7)+'-01T00:00:00Z',today=now.toISOString().slice(0,10);
  const p=await cf(BASE+'/pages/projects/mantramanse'),c=p.deployment_configs.production;
  const report={checkedAt:now.toISOString(),productionWrites:0,productionDeployment:p.canonical_deployment?.id,configFingerprint:digest(c),kv:c.kv_namespaces,r2:c.r2_buckets,secretReadable:false,providerKeys:Object.fromEntries(['OPENAI_API_KEY','BRAVE_SEARCH_API_KEY'].map(k=>[k,{present:!!c.env_vars?.[k],sealed:c.env_vars?.[k]?.type==='secret_text'}])),usage:{},blockers:[]};
  for(const endpoint of ['billable/usage','subscriptions'])try{const data=await cf(BASE+'/'+endpoint);fs.mkdirSync('output/protected-backup/cloud-preflight',{recursive:true});fs.writeFileSync('output/protected-backup/cloud-preflight/'+endpoint.replaceAll('/','-')+'.json',JSON.stringify(data,null,2));report.usage[endpoint]={retrieved:true};}catch(e){report.usage[endpoint]={retrieved:false,error:e.message};}
  const queries={r2:`{viewer{accounts(filter:{accountTag:"${ACCOUNT}"}){r2OperationsAdaptiveGroups(limit:10000,filter:{datetime_geq:"${month}",datetime_leq:"${now.toISOString()}"}){sum{requests} dimensions{actionType}}}}}`,kv:`{viewer{accounts(filter:{accountTag:"${ACCOUNT}"}){kvOperationsAdaptiveGroups(limit:10000,filter:{date_geq:"${today}",date_leq:"${today}"}){sum{requests} dimensions{actionType}}}}}`};
  for(const [kind,q]of Object.entries(queries))try{report.usage[kind]=await gql(q);}catch(e){report.usage[kind]={error:e.message};}
  const checked=await cf(BASE+'/pages/projects/mantramanse');report.productionConfigUnchanged=digest(checked.deployment_configs.production)===report.configFingerprint;
  report.freeQuotaVerified=false;report.blockers.push('Usage must establish remaining free allowance before bulk reads.');
  fs.writeFileSync('docs/AGENTIC_RAG_CLOUD_PREFLIGHT_2026-10-17.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={gql,ACCOUNT,BASE};
