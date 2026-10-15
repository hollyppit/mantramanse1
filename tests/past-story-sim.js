// 인위적 근거·모델 응답으로 파이프라인을 검증한다. 문학 품질의 실제 검토는 별도다.
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path'),{pathToFileURL}=require('url');
global.window=globalThis;for(const f of ['engine.js','report/v2/saju-data.js','report/v2/past-story.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const imp=f=>import(pathToFileURL(path.resolve(f)).href);
(async()=>{
 const P=await imp('functions/_past-story.js'),API=await imp('functions/api/past-story.js'),K=await imp('functions/_ik.js');
 const now=Date.UTC(2026,9,15),chart=Manse.compute({year:1992,month:6,day:23,hour:1,minute:30,calendar:'solar',gender:'M',city:'서울'}),sd=ReportV2.SajuData.build(chart,{now}),facts=K.deriveFacts(sd);
 const rules=[1,2,3].map(i=>K.cleanItem({id:'SELF-900'+i,domain:'SELF',title:'검사 전용 '+i,subDomain:'personality',status:'published',reviewed:true,sourceType:'book',conditions:{dayMaster:[facts.dayMaster],monthBranch:[facts.monthBranch]},principle:'검사 전용 조건을 함께 확인합니다.',interpretation:'두 계산 조건이 함께 맞을 때 적용하는 테스트 판단입니다. 실제 성향의 권위 근거가 아닙니다.',strengths:['검사 전용 장점'],risks:['검사 전용 부담'],actions:['검사 전용 행동'],evidence:[{docId:'test',chunkId:'c1',quote:'검사 전용 근거'}],theory:['검사 전용']}));
 const memory=new Map([['ik:d:SELF',JSON.stringify(rules)],['src:idx',JSON.stringify([{id:'test',active:true}])],['src:chunks:test',JSON.stringify([{id:'c1',text:'검사 전용 근거'}])]]);
 const env={GLOSSARY_KV:{get:async(k,t)=>memory.has(k)?t==='json'?JSON.parse(memory.get(k)):memory.get(k):null,put:async(k,v)=>memory.set(k,v)},OPENAI_API_KEY:'mock'};
 let calls=0,plans=[],deny=false;const originalFetch=global.fetch;
 global.fetch=async(url,opts)=>{
  calls++;const req=JSON.parse(opts.body),input=JSON.parse(req.input);assert.equal(req.text.format.type,'json_schema');assert(!req.input.includes('PRIVATE_NAME'));assert(!input.chart.birth&&!input.chart.name&&!input.chart.ziwei);
  const ids=input.claims.map(c=>c.claim_id);let result;
  assert(input.visual && input.visual.slot.startsWith('past:'));assert(!input.chart.currentRoots&&!input.chart.nowYear);
  if(req.instructions===P.PLAN_SYSTEM){
   result={title:'검사 단편',premise:'서로 다른 조건의 충돌을 인물의 선택으로 옮기는 검사 전용 기획입니다.',setting:{era:'가상의 시대',place:'항구',pressure:'해가 지기 전'},protagonist:{name:'윤',desire:'기록을 지킨다',fear:'혼자가 된다',contradiction:'지키려다 놓친다',claim_ids:ids.slice(0,2)},antagonist:{name:'현',desire:'사람을 보낸다',fear:'책임을 진다'},dilemma:{choiceA:'남는다',costA:'약속을 잃는다',choiceB:'떠난다',costB:'직책을 잃는다'},callback:{object:'열쇠',openingUse:'감춘다',endingUse:'건넨다'},beats:P.STAGES.map((stage,i)=>({id:'b'+(i+1),stage,action:'인물이 행동하며 상황을 바꾸는 장면 '+i,consequence:'그 행동으로 다음 상황이 생기는 인과 '+i,claim_ids:[ids[i%ids.length]]}))};plans.push(input.chart);
  }else if(req.instructions===P.WRITE_SYSTEM){result={title:'검사 단편',logline:'목표와 대가 사이에서 다른 선택을 하는 검사 단편입니다.',frames:input.plan.beats.map((b,i)=>({id:b.id,cap:'장면 '+i,paras:['“이제 출발하자.” 장면 '+i+'에서 윤은 열쇠를 쥐고 문을 바라봤다. '+('문밖의 소리를 듣고, 전날의 약속을 떠올렸다. ').repeat(3),'다음 순간 '+i+'의 선택은 돌아갈 길을 바꿨다. '+('동행은 멈춰 서서 그가 하려던 말을 기다렸다. ').repeat(3)],claim_ids:b.claim_ids}))};
  }else{result={passed:!deny,grounding:!deny,causality:true,dilemma:true,arc:true,prose:true,issues:deny?['근거 불일치']:[]};}
  return new Response(JSON.stringify({output_text:JSON.stringify(result)}));
 };
 const request=data=>new Request('http://test/api/past-story',{method:'POST',headers:{'cf-connecting-ip':'test'},body:JSON.stringify({sd:{...data,name:'PRIVATE_NAME'}})});
 let r=await API.onRequestPost({request:request(sd),env}),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(d.story.frames.length,8);assert.equal(calls,3);
 r=await API.onRequestPost({request:request(sd),env});d=await r.json();assert(d.cached);assert.equal(calls,3);
 r=await API.onRequestPost({request:request({...sd,nowYear:sd.nowYear+1,currentRoots:{changed:true}}),env});d=await r.json();assert(d.cached);assert.equal(calls,3);
 const second=JSON.parse(JSON.stringify(sd));second.groups={...sd.groups,비겁:sd.groups.비겁+0.01};
 deny=true;r=await API.onRequestPost({request:request(second),env});assert.equal(r.status,503);assert.equal((await r.json()).error,'review-rejected');assert.equal(plans.length,2);assert.notDeepEqual(plans[0],plans[1]);
 assert.equal(Array.from(memory.keys()).filter(k=>k.startsWith('ai:past-story:')).length,1,'failed review never cached');
 memory.set('src:idx',JSON.stringify([{id:'test',active:false}]));r=await API.onRequestPost({request:request(sd),env});assert.equal(r.status,422,'disabled evidence invalidates previous cache');
 const traces=Array.from(memory.entries()).filter(([k])=>k.startsWith('diag:past-story:'));assert.equal(traces.length,1);
 const trace=JSON.parse(traces[0][1]);assert(trace.attempts.some(x=>x.stage==='review'));assert(!JSON.stringify(trace).includes('PRIVATE_NAME'));assert(!JSON.stringify(trace).includes('검사 단편'));
 const traceRequest=new Request('http://test/api/past-story?traceId='+traces[0][0].split(':').pop());
 assert.equal((await API.onRequestGet({request:traceRequest,env})).status,401);
 const authRequest=new Request(traceRequest,{headers:{authorization:'Bearer test-admin'}});
 assert.equal((await API.onRequestGet({request:authRequest,env:{...env,ADMIN_PASSWORD:'test-admin'}})).status,200);
 assert.deepEqual(P.planIssues('not-json',[]),['json-invalid']);
 assert(P.planIssues({title:'x',beats:[]},[]).includes('beats:count'));
 for(const stage of ['plan','write','review'])assert.equal(P.stageSchema(stage,[{claim_id:'test'}]).additionalProperties,false);
 await assert.rejects(API.composeStory({claims:[{claim_id:'test'}],normalized:{chart:plans[0]}},async()=>'{"title":"x"}'),e=>e.message==='plan-rejected'&&e.issues.includes('title:length-or-type'));
 assert(!P.validateReview({passed:true,grounding:false,causality:true,dilemma:true,arc:true,prose:true,issues:[]}));
 const payload=ReportV2.PastStory.payload({...sd,name:'PRIVATE_NAME'});assert(!payload.sd.birth&&!payload.sd.name&&!payload.sd.ziwei);
 global.fetch=originalFetch;console.log('Past story: full chart egress, grounded three-stage generation, independent rejection, exact-chart cache and deactivation passed');
})().catch(e=>{console.error(e);process.exit(1)});
