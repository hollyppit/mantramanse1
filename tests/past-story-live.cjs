// 명시적으로 실행할 때만 운영 생성 API를 호출한다. 실제 사용자 정보가 아닌 가상 명식이다.
const fs=require('fs'),vm=require('vm');
global.window=globalThis;for(const f of ['engine.js','report/v2/saju-data.js','report/v2/past-story.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
(async()=>{
 const input={year:1992,month:6,day:23,hour:1,minute:30,calendar:'solar',gender:'M',city:'서울'};
 const sd=ReportV2.SajuData.build(Manse.compute(input),{now:Date.UTC(2026,9,15,3)});
 const payload=ReportV2.PastStory.payload(sd),started=Date.now();
 fs.mkdirSync('output/past-story-live',{recursive:true});
 const response=await fetch('https://mantramanse.pages.dev/api/past-story',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(260000)});
 const body=await response.json();fs.writeFileSync('output/past-story-live/first.json',JSON.stringify(body,null,2));
 console.log(JSON.stringify({status:response.status,elapsedMs:Date.now()-started,ok:body.ok,error:body.error,title:body.story?.title,frames:body.story?.frames?.length,cached:body.cached,visual:body.visual}));
 if(!body.ok){process.exitCode=1;return;}
 const again=await fetch('https://mantramanse.pages.dev/api/past-story',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
 const cached=await again.json();console.log(JSON.stringify({repeatStatus:again.status,cached:cached.cached,sameStory:JSON.stringify(cached.story)===JSON.stringify(body.story)}));
 if(!cached.cached||JSON.stringify(cached.story)!==JSON.stringify(body.story))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
