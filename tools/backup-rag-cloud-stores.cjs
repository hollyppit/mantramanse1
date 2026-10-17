// Explicitly authorized local backup. GET-only Cloudflare data access; no cloud writes.
// Values and object names stay under ignored output/. Public report contains counts only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Readable,Transform}=require('node:stream'),{pipeline}=require('node:stream/promises');
const {gql,ACCOUNT,BASE}=require('./rag-cloud-backup-preflight.cjs');
const {cf}=require('./rag-connection-inventory.cjs');
const NS='1a48b15379fc4a7191c9b2249e225c80',BUCKET='mantra-clips';
const KV=BASE+'/storage/kv/namespaces/'+NS,R2=BASE+'/r2/buckets/'+BUCKET;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const configHash=p=>hash(JSON.stringify({config:p.deployment_configs.production,deployment:p.canonical_deployment?.id}));
async function request(endpoint,headers={}){
  if(!endpoint.startsWith(KV+'/keys?')&&!endpoint.startsWith(KV+'/values/')&&!endpoint.startsWith(R2+'/objects'))throw Error('non-backup-path');
  const token=process.env.CLOUDFLARE_API_TOKEN||fs.readFileSync('E:/만트라 스튜디오 사업/앱 개발 소스/Cloudflare Workers API token 260411.txt','utf8').trim();
  const r=await fetch('https://api.cloudflare.com/client/v4/'+endpoint,{method:'GET',headers:{authorization:'Bearer '+token,...headers},signal:AbortSignal.timeout(120000),redirect:'error'});
  if(!r.ok)throw Error('cloud-read-'+r.status);return r;
}
async function list(kind){
  let cursor='',all=[],pages=0;const seen=new Set();
  do{if(++pages>50)throw Error('list-page-cap');const u=(kind==='kv'?KV+'/keys?limit=1000':R2+'/objects?per_page=1000')+(cursor?'&cursor='+encodeURIComponent(cursor):'');const d=await(await request(u)).json();if(d.success!==true||!Array.isArray(d.result))throw Error('list-response-invalid');
    all.push(...d.result);const info=d.result_info||{};cursor=kind==='kv'?(info.cursor||''):(info.is_truncated?info.cursor:'');if(cursor&&seen.has(cursor))throw Error('pagination-loop');if(cursor)seen.add(cursor);if(all.length>10000)throw Error('inventory-cap');
  }while(cursor);return all;
}
function ops(data,name){const accounts=data?.viewer?.accounts;if(!Array.isArray(accounts)||accounts.length!==1||!Array.isArray(accounts[0][name]))throw Error('usage-unavailable');return accounts[0][name].reduce((n,x)=>{if(!Number.isFinite(x.sum?.requests)||x.sum.requests<0)throw Error('invalid-usage');return n+x.sum.requests;},0);}
async function quota(){
  const end=new Date().toISOString(),month=end.slice(0,7)+'-01',today=end.slice(0,10);
  const r=await gql(`{viewer{accounts(filter:{accountTag:"${ACCOUNT}"}){r2OperationsAdaptiveGroups(limit:10000,filter:{datetime_geq:"${month}T00:00:00Z",datetime_leq:"${end}"}){sum{requests}} kvOperationsAdaptiveGroups(limit:10000,filter:{date_geq:"${month}",date_leq:"${today}"}){sum{requests}} daily:kvOperationsAdaptiveGroups(limit:10000,filter:{date_geq:"${today}",date_leq:"${today}"}){sum{requests} dimensions{actionType}}}}}`);
  const r2=ops(r,'r2OperationsAdaptiveGroups'),kv=ops(r,'kvOperationsAdaptiveGroups'),daily=r.viewer.accounts[0].daily;
  if(!Array.isArray(daily))throw Error('daily-usage-missing');const dailyReads=daily.filter(x=>x.dimensions.actionType==='read').reduce((n,x)=>n+x.sum.requests,0),dailyLists=daily.filter(x=>x.dimensions.actionType==='list').reduce((n,x)=>n+x.sum.requests,0);
  // Allow at most 20k additional reads and 100 lists. Leave a large margin against
  // both Free daily allowances and Paid monthly included operations.
  if(r2>100000||kv>1000000||dailyReads>50000||dailyLists>500)throw Error('free-quota-margin-not-sufficient');
  return {checkedAt:end,r2MonthOperations:r2,kvMonthOperations:kv,dailyReads,dailyLists,conservativeMarginPassed:true,billingLedgerAvailable:false,analyticsCanLag:true};
}
async function saveObject(response,file,expected){
  let bytes=0;const sha=crypto.createHash('sha256'),md5=crypto.createHash('md5');
  const meter=new Transform({transform(chunk,enc,cb){bytes+=chunk.length;if(bytes>expected){cb(Error('object-larger-than-inventory'));return;}sha.update(chunk);md5.update(chunk);cb(null,chunk);}});
  await pipeline(Readable.fromWeb(response.body),meter,fs.createWriteStream(file,{flags:'wx'}));if(bytes!==expected)throw Error('object-size-mismatch');return {bytes,sha256:sha.digest('hex'),md5:md5.digest('hex')};
}
async function main(){
  const stamp=new Date().toISOString(),folder=path.join('output/protected-backup','cloud-'+stamp.replace(/[:.]/g,'-'));fs.mkdirSync(folder,{recursive:true});
  const p=await cf(BASE+'/pages/projects/mantramanse'),baseline=configHash(p);if(p.deployment_configs.production.kv_namespaces.GLOSSARY_KV.namespace_id!==NS||p.deployment_configs.production.r2_buckets.CLIPS_R2.name!==BUCKET)throw Error('binding-changed');
  const usage=await quota(),keys=await list('kv'),objects=await list('r2');
  fs.writeFileSync(path.join(folder,'inventory.json'),JSON.stringify({checkedAt:stamp,namespace:NS,bucket:BUCKET,keys,objects},null,2));
  const bytes=objects.reduce((n,x)=>n+Number(x.size||0),0),nonstandard=objects.filter(x=>x.storage_class!=='Standard');
  const report={checkedAt:stamp,productionWrites:0,deployments:0,folder:folder.replace(/\\/g,'/'),kvKeys:keys.length,r2Objects:objects.length,r2Bytes:bytes,nonStandardObjects:nonstandard.length,usage,complete:false};
  function save(){fs.writeFileSync('docs/AGENTIC_RAG_CLOUD_BACKUP_2026-10-17.json',JSON.stringify(report,null,2)+'\n');}save();
  if(!process.argv.includes('--backup')){console.log(JSON.stringify(report,null,2));return;}
  if(nonstandard.length)throw Error('infrequent-or-unknown-storage-class-cost-blocked');
  if(bytes>10*1024**3)throw Error('backup-size-cap');const disk=fs.statfsSync('.');if(Number(disk.bavail)*Number(disk.bsize)<bytes+2*1024**3)throw Error('insufficient-local-disk');
  fs.mkdirSync(path.join(folder,'kv'));fs.mkdirSync(path.join(folder,'r2'));const manifest={startedAt:stamp,namespace:NS,bucket:BUCKET,kv:[],r2:[]};
  for(const k of keys){const response=await request(KV+'/values/'+encodeURIComponent(k.name)),data=Buffer.from(await response.arrayBuffer());const file='kv/'+hash(k.name)+'.bin';fs.writeFileSync(path.join(folder,file),data,{flag:'wx'});manifest.kv.push({...k,file,bytes:data.length,sha256:hash(data),expirationHeader:response.headers.get('expiration')});}
  const checkpoint=()=>fs.writeFileSync(path.join(folder,'MANIFEST.partial.json'),JSON.stringify(manifest,null,2)+'\n');checkpoint();
  let nextObject=0,failed=false;const workers=Array.from({length:4},async()=>{while(!failed&&nextObject<objects.length){const o=objects[nextObject++];try{const file='r2/'+hash(o.key)+'.bin',r=await request(R2+'/objects/'+encodeURIComponent(o.key),{'If-Match':'"'+String(o.etag).replaceAll('"','')+'"'}),info=await saveObject(r,path.join(folder,file),o.size);if(/^[a-f0-9]{32}$/i.test(o.etag)&&info.md5.toLowerCase()!==o.etag.toLowerCase())throw Error('etag-content-mismatch');manifest.r2.push({...o,file,...info,responseETag:r.headers.get('etag'),contentType:r.headers.get('content-type')});if(manifest.r2.length%20===0)checkpoint();if(manifest.r2.length%100===0)console.log(JSON.stringify({downloaded:manifest.r2.length,total:objects.length}));}catch(e){failed=true;throw e;}}});
  const workerResults=await Promise.allSettled(workers);checkpoint();const failure=workerResults.find(r=>r.status==='rejected');if(failure)throw failure.reason;
  // Re-read KV bytes and listing metadata; fail closed if the service changed during backup.
  for(const entry of manifest.kv){const r=await request(KV+'/values/'+encodeURIComponent(entry.name));if(hash(Buffer.from(await r.arrayBuffer()))!==entry.sha256)throw Error('kv-changed-during-backup');}
  const keysAfter=await list('kv'),objectsAfter=await list('r2');const sorted=(a,k)=>a.slice().sort((x,y)=>String(x[k]).localeCompare(String(y[k])));
  report.kvListingUnchanged=hash(JSON.stringify(sorted(keys,'name')))===hash(JSON.stringify(sorted(keysAfter,'name')));report.r2ListingUnchanged=hash(JSON.stringify(sorted(objects,'key')))===hash(JSON.stringify(sorted(objectsAfter,'key')));report.productionConfigUnchanged=baseline===configHash(await cf(BASE+'/pages/projects/mantramanse'));
  if(!report.kvListingUnchanged||!report.r2ListingUnchanged||!report.productionConfigUnchanged)throw Error('source-changed-during-backup');
  fs.writeFileSync(path.join(folder,'MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');report.complete=true;report.localHashesVerified=manifest.kv.concat(manifest.r2).every(x=>hash(fs.readFileSync(path.join(folder,x.file)))===x.sha256);if(!report.localHashesVerified)throw Error('local-backup-corrupt');report.manifestSHA256=hash(fs.readFileSync(path.join(folder,'MANIFEST.json')));save();console.log(JSON.stringify(report,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={ops,saveObject};
