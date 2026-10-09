// 전체 원국 기반 새 풀이, DB 검수 조건, 공급자 폴백, 캐시 및 자식운 연결.
const fs=require('fs'),vm=require('vm'),path=require('path'),{pathToFileURL}=require('url'),assert=require('assert');
const imp=p=>import(pathToFileURL(path.resolve(p)).href);
global.window=globalThis;
for(const p of ['engine.js','report/v2/saju-data.js','report/v2/deep.js','report/v2/deep-life.js','report/v2/deep-time.js','report/v2/deep-wealth.js','report/v2/deep-love.js','report/v2/full-reading.js']) vm.runInThisContext(fs.readFileSync(p,'utf8'),{filename:p});
(async()=>{
const R=ReportV2,M=Manse,now=Date.UTC(2026,9,9),ch=M.compute({year:1992,month:6,day:23,hour:1,minute:0,calendar:'solar',gender:'M',city:'서울'}),sd=R.SajuData.build(ch,{now});
const A=await imp('functions/_assetart.js'),K=await imp('functions/_ik.js'),F=await imp('functions/_movingtoon-reading.js'),API=await imp('functions/api/movingtoon-reading.js');
const facts=K.deriveFacts(sd);
assert.deepEqual(facts.natal.month.ko,sd.pillars.month.ko);assert.deepEqual(facts.natal.hour.hidden,sd.pillars.hour.hidden);assert.deepEqual(facts.natalRelations.map(x=>x.members),[...sd.combinations,...sd.clashes].map(x=>x.members||[]));
assert(K.composerSystem(null,'SELF').includes('원국 전체'));assert(F.SYSTEM.includes('시주만이 아니라 전체 원국'));
const H={M,ch,sd,now,name:'',assets:{}},profile=R.ChildReading.profile(H),child=R.Deep.SECTIONS.deep_children(H);
assert(A.SLOT_BY_ID[profile.slot]);assert(child.scenes.map(s=>s.html).join('').includes('원국 전체'));assert(A.slots().filter(s=>s.group==='children').length===10);
for(const slot of A.slots().filter(s=>s.group==='children')){assert(A.promptOf(slot.id,{}).includes('보호자'));assert(A.klingOf(slot.id));}
const rep={chapters:[{id:'c10',base:'c10',no:1,act:3,scenes:[]}]};R.Deep.augment(rep,H);const bs=rep.chapters.map(c=>c.base);assert(bs.indexOf('deep_children')===bs.indexOf('deep_marriage')+1);
const unknown=M.compute({year:1992,month:6,day:23,hour:null,minute:0,calendar:'solar',gender:'M',city:'서울'}),su=R.SajuData.build(unknown,{now});assert(!R.ChildReading.profile({M,ch:unknown,sd:su}).known);assert(!K.deriveFacts(su).natal.hour);
const input={sd,outline:[{id:'one',title:'성격'}],chapter:{id:'one',title:'성격',paragraphs:[{id:'0',text:'기존 원국을 바탕으로 성향과 반복되는 행동을 살펴보는 긴 초안 문장입니다.'}]}};
const clean=F.validate(input);assert(!clean.sd.birth);const src=F.sources([],clean.sd,new Set(),clean.chapter);
const base={id:'SELF-0001',title:'원국 근거',domain:'SELF',subDomain:'personality',status:'published',reviewed:true,sourceType:'expert',conditions:{dayMaster:[facts.dayMaster]},interpretation:'재성 비중은 {pct.재성}%입니다.',modifiers:[{when:{dayMaster:['갑']},effect:'replace',text:'다른 원국에만 적용할 내용입니다.'}]};
const approved=K.cleanItem(base),draft=K.cleanItem({...base,id:'SELF-0002',reviewed:false}),blocked=K.cleanItem({...base,id:'SELF-0003',evidence:[{docId:'off'}]});
const grounded=F.sources([approved,draft,blocked],clean.sd,new Set(['off']),clean.chapter);
assert(grounded.knowledge.length===1&&grounded.knowledge[0].id==='SELF-0001');assert(!grounded.knowledge[0].interpretation.includes('{'));assert(grounded.knowledge[0].modifiers.length===0);
const answer={paragraphs:[{id:'0',text:'월령과 일간의 힘을 함께 살피면 기준을 세우는 장점이 드러납니다. 다만 새로운 상황에서는 같은 기준을 먼저 설명하고 조정할 여지를 남기는 쪽으로 보완합니다.',refs:['natal']}]};
assert(F.sanitize(JSON.stringify(answer),clean,src));assert(!F.sanitize(JSON.stringify({paragraphs:[{...answer.paragraphs[0],refs:['invented']}]}),clean,src));assert(!F.sanitize(JSON.stringify({paragraphs:[]}),clean,src));assert(!F.sanitize(JSON.stringify({paragraphs:[{...answer.paragraphs[0],text:'반드시 자녀를 낳고 부자가 됩니다. 원국과 무관하게 확정되는 해석입니다.'}]}),clean,src));
const memory=new Map(),kv={get:async(k,t)=>memory.has(k)?t==='json'?JSON.parse(memory.get(k)):memory.get(k):null,put:async(k,v)=>memory.set(k,v)};
const env={GLOSSARY_KV:kv,OPENAI_API_KEY:'mock',ANTHROPIC_API_KEY:'mock'};let calls=[];const orig=global.fetch;
global.fetch=async(url,o)=>{calls.push(url);const b=JSON.parse(o.body);assert(!JSON.stringify(b).includes('hourKnown'));if(url.includes('openai'))return new Response(JSON.stringify({output_text:'invalid'}));return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(answer)}]}));};
const call=()=>API.onRequestPost({env,request:new Request('http://x/api/movingtoon-reading',{method:'POST',body:JSON.stringify(input),headers:{'cf-connecting-ip':'test'}})});
let res=await call(),d=await res.json();assert(res.status===200&&d.provider==='anthropic');assert(calls[0].includes('openai')&&calls[1].includes('anthropic'));assert(d.knowledgeCount===0);res=await call();d=await res.json();assert(d.cached&&calls.length===2);
const small={id:'simple',scenes:[{body:input.chapter.paragraphs[0].text}],meaning:'원국 전체의 균형과 반복되는 행동을 함께 검토하는 또 다른 충분히 긴 풀이입니다.'};const job=R.FullReading.collect(small,'');assert(job.targets.length===2);assert(!R.FullReading.apply(job,{paragraphs:[{id:'0',text:answer.paragraphs[0].text}]}));assert(R.FullReading.apply(job,{paragraphs:job.chapter.paragraphs.map(p=>({id:p.id,text:answer.paragraphs[0].text}))}));assert(small.scenes[0].body===answer.paragraphs[0].text);
global.fetch=orig;console.log('원국 전체·자식운·AI 새 풀이·검증 실패 Claude 폴백·캐시·원자적 적용 통과');
})().catch(e=>{console.error(e);process.exit(1)});
