const assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url');
const O=require('../report/hub/onboard-data.js');require('../report/hub/quest-data.js');
(async()=>{const api=await import(pathToFileURL(path.resolve(__dirname,'../functions/api/onboarding.js'))),values=new Map();
const env={ADMIN_PASSWORD:'test',GLOSSARY_KV:{get:async(k,t)=>values.has(k)?t==='json'?JSON.parse(values.get(k)):values.get(k):null,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k)}};
async function call(fn,method,url,body,auth=true){const r=await fn({env,request:new Request('https://test'+url,{method,headers:{'content-type':'application/json',...(auth?{authorization:'Bearer test'}:{})},body:body?JSON.stringify(body):undefined})});return {status:r.status,data:await r.json()};}
const pc='/api/clipfile?k=pc.mp4',mobile='/api/clipfile?k=mobile.webm';
assert.equal((await call(api.onRequestPut,'PUT','/api/onboarding',{quest:{inputLoopVideo:pc}},false)).status,401);
await call(api.onRequestPut,'PUT','/api/onboarding',{quest:{inputLoopVideo:pc,inputLoopVideoMobile:mobile}});
let d=(await call(api.onRequestGet,'GET','/api/onboarding?draft=1')).data,merged=O.merge(O.DEFAULTS,d.config);
assert.equal(merged.quest.inputLoopVideo,pc);assert.equal(merged.quest.inputLoopVideoMobile,mobile);
assert.equal((await call(api.onRequestGet,'GET','/api/onboarding')).data.config,null);
await call(api.onRequestPost,'POST','/api/onboarding?action=publish');d=(await call(api.onRequestGet,'GET','/api/onboarding')).data;assert.equal(d.config.quest.inputLoopVideo,pc);assert.equal(d.config.quest.inputLoopVideoMobile,mobile);
await call(api.onRequestPut,'PUT','/api/onboarding',{quest:{...d.config.quest,inputLoopVideoMobile:''}});d=(await call(api.onRequestGet,'GET','/api/onboarding?draft=1')).data;assert.equal(d.config.quest.inputLoopVideo,pc);assert.equal(d.config.quest.inputLoopVideoMobile,'');
await call(api.onRequestPut,'PUT','/api/onboarding',{quest:{inputLoopVideo:'javascript:alert(1)',inputLoopVideoMobile:'https://test/"unsafe'}});d=(await call(api.onRequestGet,'GET','/api/onboarding?draft=1')).data;assert.equal(d.config.quest.inputLoopVideo,'');assert.equal(d.config.quest.inputLoopVideoMobile,'');
console.log('input-loop-sim PASS: auth, separate PC/mobile, draft isolation, client merge, publish, remove mobile, unsafe URL filtering');
})().catch(e=>{console.error(e);process.exitCode=1});
