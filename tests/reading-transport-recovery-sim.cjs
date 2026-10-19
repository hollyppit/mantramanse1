const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(process.argv[2] || 'report/v2/full-reading.js','utf8');
async function check(replies){
 const calls=[],delays=[];let done;
 const ready=new Promise(r=>done=r),context={AbortController,Map,Promise,SyntaxError,Error,Number,Array,Object,JSON,
  setTimeout:(fn,ms)=>{delays.push(ms);return setTimeout(fn,[800,2000].includes(ms)?0:ms);},clearTimeout,
  fetch:async(url,init)=>{calls.push(init.body);const row=replies[Math.min(calls.length-1,replies.length-1)];if(row instanceof Error)throw row;return new Response(row.body,{status:row.status});}};
 vm.runInNewContext(source,context);
 const chapter={id:'timeline_self_17',scenes:[{body:'일시 장애가 발생해도 수동 재생성 없이 정상 본문으로 돌아오는지 확인하는 테스트 전용 충분한 길이의 문장입니다.'}]},rep={chapters:[chapter]};
 context.ReportV2.FullReading.prepare(rep,{},'',done);if(context.ReportV2.FullReading.prioritize)context.ReportV2.FullReading.prioritize(chapter.id);
 await ready;return {chapter,rep,calls,delays};
}
(async()=>{
 const success={status:200,body:JSON.stringify({ok:true,result:{paragraphs:[{id:'0',text:'일시적인 서버 전송 오류가 복구된 후에만 보여 주는 검수 완료된 본문이며 실제 AI 호출이 없는 테스트용 응답입니다.',refs:[]}]}})};
 for(const first of [{status:502,body:'<html>Bad gateway</html>'},{status:200,body:'{"ok":'},new TypeError('network'),{status:503,body:JSON.stringify({ok:false,error:'storage-unavailable'})},{status:202,body:JSON.stringify({ok:false,error:'generation-in-progress'})}]){
  const r=await check([first,success]);assert.equal(r.calls.length,2);assert.equal(r.rep.readingStatus.completed,1);assert.equal(r.rep.readingStatus.failed,0);assert(!r.chapter.readingDeferred);assert.equal(new Set(r.calls).size,1,'retry must preserve body');
 }
 const twice=await check([{status:503,body:'gateway'},{status:502,body:'gateway'},success]);assert.equal(twice.calls.length,3);assert.equal(twice.rep.readingStatus.completed,1);
 const failed=await check([{status:502,body:'gateway'}]);assert.equal(failed.calls.length,3);assert.equal(failed.chapter.readingWarning,'server-response-invalid');assert.equal(failed.rep.readingStatus.failed,1);
 for(const error of ['rate-limited','cost-limit','chapter-validation-failed','insufficient-evidence','ai-unavailable','no-ai']){const r=await check([{status:502,body:JSON.stringify({ok:false,error})},success]);assert.equal(r.calls.length,1,error);assert.equal(r.rep.readingStatus.failed,1);}
 const permanent=await check([{status:401,body:'denied'},success]);assert.equal(permanent.calls.length,1);
 console.log('Transport recovery PASS: non-JSON gateway/truncated body/network/in-progress recover automatically; identical payload; bounded attempts; no quality/quota retry; mock-only, zero production AI calls');
})().catch(e=>{console.error(e);process.exitCode=1;});
