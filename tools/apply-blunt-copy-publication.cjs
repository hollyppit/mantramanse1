// Applies output/blunt-copy-20261021 changes through Supabase REST (same guards as the SQL files).
//   node tools/apply-blunt-copy-publication.cjs [--apply] [--only timeline_self_01] [--rollback]
// Dry run by default. Credentials come from the Pages production environment and are never printed.
const fs=require('fs'),assert=require('assert/strict'),{cf}=require('./rag-connection-inventory.cjs');
const dir='output/blunt-copy-20261021',apply=process.argv.includes('--apply'),back=process.argv.includes('--rollback');
const only=process.argv.includes('--only')?process.argv[process.argv.indexOf('--only')+1]:null;
(async()=>{
 const env=(await cf('accounts/9691f5fe73bf481a5d884db649c7eb01/pages/projects/mantramanse')).deployment_configs.production.env_vars;
 const url=env.SUPABASE_URL.value.replace(/\/+$/,''),key=env.SUPABASE_SERVICE_KEY.value;
 const sb=async(path,init)=>{const r=await fetch(url+'/rest/v1/'+path,{...init,signal:AbortSignal.timeout(30000),headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json',...(init&&init.headers||{})}});const t=await r.text();if(!r.ok)throw Error('supabase '+r.status+' '+t.slice(0,160));return t?JSON.parse(t):null;};
 const old=JSON.parse(fs.readFileSync(dir+'/old.json')),next=JSON.parse(fs.readFileSync(dir+'/new.json')),from=back?next:old,to=back?old:next;
 const report=[];
 for(const id of Object.keys(to.chapters)){
  if(only&&id!==only)continue;
  const changes=new Map();from.chapters[id].forEach((p,i)=>{const n=to.chapters[id][i];if(p.text!==n.text)changes.set(p.id,{old:p.text,new:n.text});});
  if(!changes.size)continue;
  const k='ik:blocks:chapter:library.'+id,rows=await sb('kv?key=eq.'+encodeURIComponent(k)+'&select=value');
  if(!rows||!rows.length){report.push({id,status:'missing library'});continue;}
  const prior=typeof rows[0].value==='string'?rows[0].value:JSON.stringify(rows[0].value),cur=JSON.parse(prior);
  if(JSON.stringify(cur.draft)!==JSON.stringify(cur.published)){report.push({id,status:'unpublished admin edits - skipped'});continue;}
  let replaced=0;const pub=cur.published.map(p=>{const c=changes.get(p.id);if(c&&p.text===c.old){replaced++;return {...p,text:c.new};}return p;});
  const already=cur.published.filter(p=>{const c=changes.get(p.id);return c&&p.text===c.new;}).length;
  if(!replaced){report.push({id,status:already?'already applied':'nothing matched',version:cur.version});continue;}
  const at=new Date().toISOString(),nxt={...cur,version:(+cur.version||0)+1,draft:pub,published:pub,updatedAt:at,
   review:{...(cur.review||{}),seedVersion:to.seedVersion,editorialReviewed:true,externalExpertApproved:false,scope:'plain-spoken-copy-no-new-fortune-rules',providerCalls:0},
   history:[{version:cur.version,draft:cur.draft,published:cur.published,scenarios:cur.scenarios,review:cur.review,at},...(cur.history||[])]};
  const row={id,status:apply?'applied':'would apply',from:cur.version,to:nxt.version,replaced,of:changes.size,keptEdited:changes.size-replaced-already};
  if(apply){const ok=await sb('rpc/reading_compare_and_swap',{method:'POST',body:JSON.stringify({p_key:k,p_expected:prior,p_next:JSON.stringify(nxt),p_ttl:null})});if(ok!==true){row.status='concurrent edit - not applied';}}
  report.push(row);
 }
 const sum={};for(const r of report)sum[r.status]=(sum[r.status]||0)+1;
 fs.writeFileSync(dir+(apply?'/apply-result':'/dry-run')+(back?'-rollback':'')+'.json',JSON.stringify(report,null,1));
 console.log(JSON.stringify(sum),'first:',JSON.stringify(report[0]));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
