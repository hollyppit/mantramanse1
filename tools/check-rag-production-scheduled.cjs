// Approved live production research: ONE daily job, one task, bounded by durable $1 caps.
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 assert(process.argv.includes('--approved-live-research'));
 const conf=JSON.parse(fs.readFileSync('output/protected-backup/rag-production-scheduler.json'));
 assert.equal(conf.origin,'https://mantramanse.pages.dev');
 const r=await fetch(conf.origin+'/api/agentic-rag?a=scheduled',{method:'POST',redirect:'error',signal:AbortSignal.timeout(55000),headers:{authorization:'Bearer '+conf.secret,'content-type':'application/json'},body:'{}'}),data=await r.json();
 assert.equal(r.status,200,JSON.stringify(data));
 const p='docs/AGENTIC_RAG_ACTIVATION_LIVE_STEPS_2026-10-17.json',old=fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):[];old.push({at:new Date().toISOString(),status:r.status,result:data});fs.writeFileSync(p,JSON.stringify(old,null,2));console.log(JSON.stringify(data));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
