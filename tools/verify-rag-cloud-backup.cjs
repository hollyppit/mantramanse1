// Local verification only; never restore to a cloud store.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
async function fileHash(file){const h=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))h.update(chunk);return h.digest('hex');}
async function verify(folder){
  const base=fs.realpathSync(folder),allowed=fs.realpathSync('output/protected-backup');assert(base.startsWith(allowed+path.sep),'backup folder must stay inside ignored output/protected-backup');
  const inventory=JSON.parse(fs.readFileSync(path.join(base,'inventory.json'))),manifest=JSON.parse(fs.readFileSync(path.join(base,'MANIFEST.json')));
  assert.equal(manifest.namespace,inventory.namespace);assert.equal(manifest.bucket,inventory.bucket);assert.equal(manifest.kv.length,inventory.keys.length);assert.equal(manifest.r2.length,inventory.objects.length);
  const seen=new Set();let total=0;
  for(const [kind,entries]of [['kv',manifest.kv],['r2',manifest.r2]])for(const entry of entries){
    const key=kind==='kv'?entry.name:entry.key,token=kind+':'+key;assert(!seen.has(token),'duplicate backup key');seen.add(token);
    assert.equal(entry.file,kind+'/'+sha(key)+'.bin','unexpected backup path');const file=fs.realpathSync(path.join(base,entry.file));assert(file.startsWith(base+path.sep),'symlink outside backup');
    assert.equal(fs.statSync(file).size,entry.bytes,'byte length mismatch');assert.equal(await fileHash(file),entry.sha256,'checksum mismatch');total+=entry.bytes;
    const original=(kind==='kv'?inventory.keys:inventory.objects).find(x=>(kind==='kv'?x.name:x.key)===key);assert(original,'missing inventory entry');
    for(const [k,v]of Object.entries(original))assert.deepEqual(entry[k],v,'metadata differs');
  }
  return {checkedAt:new Date().toISOString(),mode:'offline-local-verification',complete:true,kvKeys:manifest.kv.length,r2Objects:manifest.r2.length,bytes:total,allHashesMatch:true,allInventoryMetadataPreserved:true,cloudWrites:0,manifestSHA256:sha(fs.readFileSync(path.join(base,'MANIFEST.json')))};
}
module.exports={verify};
if(require.main===module)verify(process.argv[2]).then(result=>{fs.writeFileSync('docs/AGENTIC_RAG_CLOUD_BACKUP_VERIFIED_2026-10-17.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}).catch(e=>{console.error(e.message);process.exitCode=1;});
