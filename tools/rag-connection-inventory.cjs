// Read-only discovery. Never log credentials or write Cloudflare/Supabase state.
const fs=require('node:fs');
const crypto=require('node:crypto');
const TOKEN_FILE='E:/만트라 스튜디오 사업/앱 개발 소스/Cloudflare Workers API token 260411.txt';
function token(){return process.env.CLOUDFLARE_API_TOKEN||fs.readFileSync(TOKEN_FILE,'utf8').trim();}
async function cf(path){const r=await fetch('https://api.cloudflare.com/client/v4/'+path,{headers:{authorization:'Bearer '+token()},signal:AbortSignal.timeout(20000),redirect:'error'});let d;try{d=await r.json();}catch{throw Error('cloudflare-response-'+r.status);}if(!r.ok||!d.success)throw Error('cloudflare-'+r.status+'-'+(d.errors||[]).map(x=>x.code).join(','));return d.result;}
const envVars=c=>c?.env_vars||{};
const value=(c,k)=>envVars(c)[k]?.value;
const readable=v=>typeof v==='string'&&v.length>0&&!/^\*+$|^<.*>$/.test(v);
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function summary(c){const vars=envVars(c),url=value(c,'SUPABASE_URL');let host=null;try{host=new URL(url).hostname;}catch{}return {variables:Object.fromEntries(Object.entries(vars).map(([k,v])=>[k,{type:v.type,readable:readable(v.value)}])),supabaseHost:host,kv:Object.keys(c?.kv_namespaces||{}),r2:Object.keys(c?.r2_buckets||{})};}
async function inventory(){
  const out={checkedAt:new Date().toISOString(),mode:'read-only',tokenVerified:false,accounts:[],projects:[],writesPerformed:0};
  try{const v=await cf('user/tokens/verify');out.tokenVerified=v.status==='active';}catch(e){out.tokenVerificationError=e.message;}
  const accounts=await cf('accounts?per_page=50');
  for(const a of accounts){out.accounts.push({reference:digest(a.id).slice(0,12)});let projects;try{projects=await cf('accounts/'+a.id+'/pages/projects');}catch(e){out.projects.push({account:digest(a.id).slice(0,12),error:e.message});continue;}
    out.availableProjectNames=projects.map(p=>p.name);
    for(const p of projects){if(!/mantra|manse|rag|stag|test/i.test(p.name))continue;const project=await cf('accounts/'+a.id+'/pages/projects/'+p.name),prod=project.deployment_configs?.production||{},preview=project.deployment_configs?.preview||{};
      const keys=c=>Object.values(c||{}).map(x=>JSON.stringify(x));
      const shared=(x,y)=>keys(x).some(k=>keys(y).includes(k));
      const before=digest({config:prod,deployment:project.canonical_deployment?.id,branch:project.production_branch});
      const afterProject=await cf('accounts/'+a.id+'/pages/projects/'+p.name);
      const after=digest({config:afterProject.deployment_configs?.production||{},deployment:afterProject.canonical_deployment?.id,branch:afterProject.production_branch});
      const hasStageDB=!!envVars(preview).SUPABASE_URL;
      out.projects.push({name:project.name,domain:project.subdomain,productionBranch:project.production_branch,production:summary(prod),preview:summary(preview),previewSharesSupabase:hasStageDB?readable(value(prod,'SUPABASE_URL'))&&readable(value(preview,'SUPABASE_URL'))?value(prod,'SUPABASE_URL')===value(preview,'SUPABASE_URL'):'unknown-secret-values':null,previewHasSupabase:hasStageDB,previewSharesKV:shared(prod.kv_namespaces,preview.kv_namespaces),previewSharesR2:shared(prod.r2_buckets,preview.r2_buckets),productionConfigurationUnchanged:before===after,dataIntegrityChecked:false});
    }
  }
  return out;
}
module.exports={cf,inventory,value,readable};
if(require.main===module)inventory().then(d=>{if(process.argv.includes('--save-report'))fs.writeFileSync('docs/AGENTIC_RAG_CONNECTION_INVENTORY_2026-10-17.json',JSON.stringify(d,null,2)+'\n');console.log(JSON.stringify(d,null,2));}).catch(e=>{console.error(JSON.stringify({error:e.message,credentialsPrinted:false}));process.exitCode=1;});
