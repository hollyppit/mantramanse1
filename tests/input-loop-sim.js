const assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url');
const O=require('../report/hub/onboard-data.js');const Q=require('../report/hub/quest-data.js');
(async()=>{const api=await import(pathToFileURL(path.resolve(__dirname,'../functions/api/onboarding.js'))),values=new Map();
const env={ADMIN_PASSWORD:'test',GLOSSARY_KV:{get:async(k,t)=>values.has(k)?t==='json'?JSON.parse(values.get(k)):values.get(k):null,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k)}};
async function call(fn,method,url,body,auth=true){const r=await fn({env,request:new Request('https://test'+url,{method,headers:{'content-type':'application/json',...(auth?{authorization:'Bearer test'}:{})},body:body?JSON.stringify(body):undefined})});return {status:r.status,data:await r.json()};}
const pc='/api/clipfile?k=pc.mp4',mobile='/api/clipfile?k=mobile.webm';
const guideFields={inputLoopMale:'/api/clipfile?k=male.mp4',inputLoopMaleMobile:'/api/clipfile?k=male-mobile.mp4',inputLoopFemale:'/api/clipfile?k=female.mp4',inputLoopFemaleMobile:'/api/clipfile?k=female-mobile.mp4'};
assert.equal((await call(api.onRequestPut,'PUT','/api/onboarding',{quest:{inputLoopVideo:pc}},false)).status,401);
await call(api.onRequestPut,'PUT','/api/onboarding',{quest:{inputLoopVideo:pc,inputLoopVideoMobile:mobile,...guideFields}});
let d=(await call(api.onRequestGet,'GET','/api/onboarding?draft=1')).data,merged=O.merge(O.DEFAULTS,d.config);
for(const [key,url] of Object.entries(guideFields))assert.equal(merged.quest[key],url);
for(const guide of ['male','female'])for(const mobile of [true,false]){const prefix=guide==='female'?'inputLoopFemale':'inputLoopMale';assert.equal(Q.inputLoopUrl(merged,guide,mobile),guideFields[prefix+(mobile?'Mobile':'')]);}
assert.equal(Q.inputLoopUrl({quest:{inputLoopFemale:guideFields.inputLoopFemale,inputLoopVideoMobile:mobile}},'female',true),guideFields.inputLoopFemale);
assert.equal(Q.inputLoopUrl({quest:{inputLoopVideo:pc,inputLoopVideoMobile:mobile}},'female',true),mobile);
assert.equal(Q.inputLoopUrl({quest:{inputLoopMale:guideFields.inputLoopMale}},'female',true),'');
assert.equal(merged.quest.inputLoopVideo,pc);assert.equal(merged.quest.inputLoopVideoMobile,mobile);
assert.equal((await call(api.onRequestGet,'GET','/api/onboarding')).data.config,null);
await call(api.onRequestPost,'POST','/api/onboarding?action=publish');d=(await call(api.onRequestGet,'GET','/api/onboarding')).data;assert.equal(d.config.quest.inputLoopVideo,pc);assert.equal(d.config.quest.inputLoopVideoMobile,mobile);for(const [key,url] of Object.entries(guideFields))assert.equal(d.config.quest[key],url);
await call(api.onRequestPut,'PUT','/api/onboarding',{quest:{...d.config.quest,inputLoopVideoMobile:''}});d=(await call(api.onRequestGet,'GET','/api/onboarding?draft=1')).data;assert.equal(d.config.quest.inputLoopVideo,pc);assert.equal(d.config.quest.inputLoopVideoMobile,'');
await call(api.onRequestPut,'PUT','/api/onboarding',{quest:{inputLoopVideo:'javascript:alert(1)',inputLoopVideoMobile:'https://test/"unsafe'}});d=(await call(api.onRequestGet,'GET','/api/onboarding?draft=1')).data;assert.equal(d.config.quest.inputLoopVideo,'');assert.equal(d.config.quest.inputLoopVideoMobile,'');
console.log('input-loop-sim PASS: auth, separate PC/mobile, draft isolation, client merge, publish, remove mobile, unsafe URL filtering');
})().catch(e=>{console.error(e);process.exitCode=1});
