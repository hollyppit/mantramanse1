/* Public catalog capture is optional local audit data. No test performs network or paid calls. */
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
global.window=globalThis;
for(const f of ['engine.js','report/v2/saju-data.js','report/v2/reading-catalog.js','report/v2/reading-media.js','report/v2/reading-peak.js','report/v2/seal-reader.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
(async()=>{
const capture='output/sealed-webtoon/all-topics/editorial-public.json',hasCapture=fs.existsSync(capture),catalog=hasCapture?JSON.parse(fs.readFileSync(capture)).body:MantraEditorial.defaults();
const active=catalog.chapters.filter(c=>(hasCapture?c.state==='active':c.state!=='archived')&&catalog.topics.some(t=>t.id===c.topicId&&t.enabled));
assert.equal(active.length,64);assert.deepEqual(Object.fromEntries(['self','wealth','career','love'].map(t=>[t,active.filter(c=>c.topicId===t).length])),{self:19,wealth:15,career:15,love:15});
const publicApi=await import('../functions/api/reading-editorial.js');let writes=0;
const kv={get:async(key)=>key==='ik:editorial:published'?catalog:null,put:async()=>{writes++;throw Error('write forbidden');}};
const res=await publicApi.onRequest({request:new Request('https://test/api/reading-editorial'),env:{GLOSSARY_KV:kv}}),returned=await res.json();
assert.equal(res.status,200);assert.equal(returned.chapters.filter(c=>c.state==='active').length,hasCapture?64:0);assert.equal(writes,0);assert(returned.chapters.every(c=>!('sourceRuleIds' in c)));
const snapshot='output/sealed-webtoon/current-public-state.json',state=fs.existsSync(snapshot)?JSON.parse(fs.readFileSync(snapshot)):null,find=p=>state?.requests.find(r=>r.path.split('?')[0].replace(/^\/api\//,'')===p.replace(/^\/api\//,''))?.body;
const raw=find('/api/media')?.media||[],assets=find('/api/assets')?.assets||{},videos=find('/api/assets')?.videos||{};
if(state)assert(raw.length>0,'current media snapshot must be exercised');
const rawBefore=JSON.stringify(raw),catalogBefore=JSON.stringify(catalog),M=ReportV2.ReadingMedia,S=ReportV2.SealReader;
let calls=0;const savedFetch=global.fetch;global.fetch=async()=>{calls++;throw Error('network/provider forbidden');};
const API=await import('../functions/api/movingtoon-reading.js');let contractChecks=0,sceneChecks=0,empty=0;const fallbackIds=new Set();
try{for(const [gender,hour]of [['M',14],['F',null],['M',23]]){
const sd=ReportV2.SajuData.build(Manse.compute({year:1990,month:5,day:15,hour,minute:30,calendar:'solar',gender,city:'서울'}),{now:Date.UTC(2026,9,30)}),sdBefore=JSON.stringify(sd);
const chapters=active.map(c=>({id:c.id,title:c.title,editorialContractId:c.id,editorialTopicId:c.topicId,act:['self','wealth','career','love'].indexOf(c.topicId)+1}));
ReportV2.PeakReading.add({chapters},sd,'검증');assert.equal(chapters.length,65);assert.equal(chapters.filter(c=>c.editorialTopicId==='self').length,20);assert.equal(chapters.findIndex(c=>c.id==='timeline_self_peak'),chapters.findIndex(c=>c.id==='timeline_self_20')+1);
const pool=raw.concat(M.fromAssets(assets,videos,sd)),plan=M.plan(pool,chapters,sd,3);assert.deepEqual(plan,M.plan(pool.slice().reverse(),chapters.slice().reverse(),sd,3));
for(const c of chapters){const one=M.pick(pool,c,sd,3);for(const other of chapters.filter(x=>x.editorialTopicId!==c.editorialTopicId).slice().reverse())M.pick(pool,other,sd,3);assert.deepEqual(one,M.pick(pool,c,sd,3));assert.deepEqual(one,plan[c.id]);assert.deepEqual(M.pick([],c,sd,3),[]);if(!one.length){empty++;fallbackIds.add(c.id);}for(const m of one){assert(!m.id.startsWith('panelbg-'));const src=pool.find(x=>x.id===m.id);assert.equal(src.tagsApproved,true);assert.notEqual(src.enabled,false);const binds=[].concat(src.chapters||[],src.chapterIds||[]);assert(!binds.length||binds.includes(c.id));const g=src.gender||(/-([MF])$/.exec(src.id)||[])[1];assert(!g||g===gender);if(m.background){const bg=pool.find(x=>x.id===m.background.id);assert.equal(bg.tagsApproved,true);assert.notEqual(bg.enabled,false);}sceneChecks++;}
if(c.id==='timeline_self_peak'){const before=JSON.stringify(c),p=S.plan(c);assert(p.scenes.some(s=>s.source.text.includes('기존 대운 계산값')));assert.equal(JSON.stringify(c),before);continue;}
// This isolated handler check verifies existing local reviewed/default selection, not live DB prose.
const response=await API.onRequestPost({env:{OPENAI_API_KEY:'must-not-be-used',GLOSSARY_KV:{get:async()=>null,put:async()=>{throw Error('write forbidden');}}},request:new Request('https://test/api/movingtoon-reading',{method:'POST',body:JSON.stringify({sd,chapter:{id:c.id,title:c.title,paragraphs:['title','reality','strength','risk','reinforce','practice','evidence'].map(role=>({id:role,role,text:'가상 명식에 맞는 기존 검수 문안을 확인하는 로컬 검증 요청입니다.'}))},force:true,mode:'ai'})})}),d=await response.json();assert.equal(response.status,200,c.id+JSON.stringify(d));assert.equal(d.providerCallCount,0);assert.equal(d.requestCostUSD,0);assert(d.aiSkipped);const core=Object.fromEntries(d.result.paragraphs.map(p=>[p.role,p.text])),book={...c,readingCore:core,readingMedia:one,readingParagraphs:d.result.paragraphs,interpretationAnalysis:d.interpretation},before=JSON.stringify(book),p=S.plan(book);assert.deepEqual(p.scenes.map(x=>x.source.text),Object.values(core).filter(x=>typeof x==='string'&&x.trim()));assert(p.scenes.every(x=>x.references===book.interpretationAnalysis));assert.equal(JSON.stringify(book),before);contractChecks++;
}
assert.equal(JSON.stringify(sd),sdBefore);
}
assert.equal(calls,0);assert.equal(writes,0);assert.equal(JSON.stringify(raw),rawBefore);assert.equal(JSON.stringify(catalog),catalogBefore);
const c={id:'timeline_career_01',editorialTopicId:'career'},sd={gender:'F',dayMaster:{el:'fire'}},base={url:'/ok.webp',enabled:true,tagsApproved:true,themeTags:['career'],elementTags:['fire']},bad=[{id:'draft',status:'draft'},{id:'unapproved',tagsApproved:false},{id:'inactive',enabled:false},{id:'wrong-M',gender:'M'},{id:'wrong-element',elementTags:['water']},{id:'wrong-chapter',chapterIds:['timeline_career_02']}].map(x=>({...base,...x}));assert.equal(M.pick(bad,c,sd,3).length,0);assert.equal(M.background(bad.map(x=>({...x,id:'panelbg-'+x.id})),c,sd,'daily'),null);
console.log(JSON.stringify({pass:true,scope:hasCapture?'public catalog snapshot v'+catalog.version:'seed fallback, live publication unverified',catalogContracts:64,derivedPeak:1,runtimeChapters:65,topicCounts:{self:20,wealth:15,career:15,love:15},charts:3,handlerContracts:contractChecks,selectedMedia:sceneChecks,textFallbacks:empty,textFallbackIds:[...fallbackIds].sort(),providerCalls:calls,networkCalls:calls,writes}));
}finally{global.fetch=savedFetch;}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
