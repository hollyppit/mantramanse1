const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const worker=(await import(pathToFileURL(path.resolve('workers/rag-scheduler.js')))).default;
 let calls=0;const replies=[{id:'job'},{state:'pending',stage:'fetch'},{state:'pending',stage:'extract'},{state:'pending',stage:'validate'},{state:'completed'}];
 global.fetch=async(url,init)=>{assert.equal(url,'https://mantramanse.pages.dev/api/agentic-rag?a=scheduled');assert.equal(init.redirect,'manual');assert.equal(init.headers.authorization,'Bearer test-secret');return Response.json(replies[calls++]);};
 const result=await worker.scheduled({}, {RAG_API_ORIGIN:'https://mantramanse.pages.dev',RAG_SCHEDULER_SECRET:'test-secret'});assert.equal(result.state,'completed');assert.equal(calls,5);
 calls=0;global.fetch=async()=>{calls++;return Response.json({blocked:'not-due'});};await worker.scheduled({}, {RAG_API_ORIGIN:'https://mantramanse.pages.dev',RAG_SCHEDULER_SECRET:'test-secret'});assert.equal(calls,1);
 assert(fs.readFileSync('workers/rag-scheduler.enabled.example.toml','utf8').includes('crons = ["0 18 * * *"]'));
 console.log('once-daily 03:00 KST cron; bounded checkpoint drain; not-due stops; edge-compatible redirect refusal PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
