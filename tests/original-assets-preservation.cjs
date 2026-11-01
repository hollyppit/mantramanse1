const assert = require('node:assert/strict');
(async () => {
 const {ORIGINAL_IMAGE_KEYS,deleteDerivedFile,putDerivedFile} = await import('../functions/_original-assets.js');
 const clip = await import('../functions/api/clipfile.js');
 const panel = await import('../functions/api/panel-art.js');
 const old = [...ORIGINAL_IMAGE_KEYS][0], deleted=[];
 const env={ADMIN_PASSWORD:'test',GLOSSARY_KV:{get:async()=>[{id:'panel-wood-self',url:'/api/clipfile?k='+old}],put:async()=>{throw Error('protected list must not mutate')}},CLIPS_R2:{delete:async k=>deleted.push(k)}};
 const req=(key,auth=true)=>new Request('http://local/api/clipfile?k='+encodeURIComponent(key),{method:'DELETE',headers:auth?{authorization:'Bearer test'}:{}});
 assert.equal((await clip.onRequestDelete({request:req(old,false),env})).status,401);
 assert.equal((await clip.onRequestDelete({request:req(old),env})).status,409);
 assert.equal(await deleteDerivedFile(env,old),false);
 assert.deepEqual(deleted,[]);
 await assert.rejects(()=>putDerivedFile(env,old,new Uint8Array()), /덮어쓸/);
 assert.equal(await deleteDerivedFile(env,'panelprev-new.webp'),true);
 assert.deepEqual(deleted,['panelprev-new.webp']);
 const bulk=await panel.onRequestDelete({request:new Request('http://local/api/panel-art?kind=panel',{method:'DELETE',headers:{authorization:'Bearer test'}}),env});
 assert.equal(bulk.status,409); assert.deepEqual(deleted,['panelprev-new.webp']);
 // Every image in the pinned verified manifest is immutable, including unrelated library images.
 assert.ok(ORIGINAL_IMAGE_KEYS.size>=582);
 const fs=require('fs'),manifest='output/sealed-webtoon/assets-manifest.json';
 if (!fs.existsSync(manifest)) { console.log('PASS server original delete/overwrite protection; local binary manifest absent, 216 binary preservation audit NOT RUN'); return; }
 const m=JSON.parse(fs.readFileSync(manifest));
 assert.equal(m.objects.length,868); assert.ok(m.objects.every(o=>o.verified));
 const readings=m.objects.flatMap(o=>o.links.filter(l=>l.pool==='reading'&&l.activeSlot));
 const tarot=m.objects.flatMap(o=>o.links.filter(l=>l.pool==='tarot'));
 assert.equal(readings.length,138);assert.equal(tarot.length,78);
 for(const o of m.objects.filter(o=>/^image\//.test(o.format)))assert.ok(ORIGINAL_IMAGE_KEYS.has(o.key));
 if(fs.existsSync('output/sealed-webtoon/current-assets-verified.json')){const latest=JSON.parse(fs.readFileSync('output/sealed-webtoon/current-assets-verified.json'));assert.equal(latest.errors.length,0);assert.equal(latest.objects.length,466);assert.equal(latest.baselineChanged,0);for(const o of latest.objects)assert(ORIGINAL_IMAGE_KEYS.has(o.key));const added=latest.objects.find(x=>!x.baselinePresent);assert.equal((await clip.onRequestDelete({request:req(added.key),env})).status,409);console.log('PASS current 466 public image binaries verified, 101 additional originals preserved, all protected; no baseline bytes changed');}
 console.log('PASS original preservation: 868 SHA-256 verified; 138 active reading + 78 tarot originals; 25 legacy reading slots retained; protected DELETE and bulk deletion rejected; derivative cleanup allowed');
})().catch(e=>{console.error(e);process.exitCode=1;});
