const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('report/v2/full-reading.js','utf8');
async function health(reply){
 let done,calls=0;const ready=new Promise(r=>done=r),ctx={AbortController,location:{hostname:'localhost'},setTimeout:(fn,ms)=>setTimeout(fn,ms===8000?5:ms),clearTimeout,fetch:(url)=>{if(url.includes('health'))return reply();calls++;return Promise.resolve(new Response(JSON.stringify({ok:false,error:'insufficient-evidence'}),{status:422}));}};
 vm.runInNewContext(source,ctx);
 const chapter={id:'health',editorialContractId:'timeline_health_01',scenes:[{body:'잘못된 건강 안내 데이터가 다른 풀이의 진행까지 멈추지 않도록 확인하기 위한 충분한 길이의 문장입니다.'}]};
 ctx.ReportV2.FullReading.prepare({chapters:[chapter]}, {}, '',done);ctx.ReportV2.FullReading.prioritize('health');
 await Promise.race([ready,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('queue stalled')),1000);t.unref();})]);assert.equal(calls,1);assert.equal(chapter.readingWarning,'insufficient-evidence');
}
(async()=>{
 for(const data of [{aiReview:{passed:true}},{aiReview:{passed:true},chapters:[null],sources:[]},{aiReview:{passed:true},chapters:[{id:'timeline_health_01',mode:'educational-only',state:'draft',personalizedEvidenceAccepted:false,paragraphs:[null],sourceIds:[]}],sources:[]}])await health(()=>Promise.resolve(new Response(JSON.stringify(data))));
 await health(()=>new Promise(()=>{}));await health(()=>{throw Error('sync network failure');});
 const hub=fs.readFileSync('report/hub/hub.js','utf8'),prefix=hub.slice(0,hub.indexOf('  /* ── 지연 로딩'))+'})(globalThis);';
 let stored='{broken';const ctx={location:{hostname:'localhost',search:''},document:{},localStorage:{getItem:()=>stored,setItem:(k,v)=>stored=v}};vm.runInNewContext(prefix,ctx);
 assert.equal(ctx.Hub.profile.get(),null);assert(ctx.Hub.profile.save({year:1992,month:6,day:23,gender:'M'}));assert.equal(ctx.Hub.profile.get().year,1992);
 stored='[]';assert(ctx.Hub.profile.save({year:2001,month:1,day:1,gender:'F'}));assert.equal(ctx.Hub.profile.get().year,2001);
 console.log('PASS: malformed/missing health arrays, stalled and synchronous fetch, corrupted profile recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
