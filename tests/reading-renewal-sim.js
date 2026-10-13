const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url');
global.window=globalThis;
vm.runInThisContext(fs.readFileSync('engine.js','utf8'));
for(const f of ['chapters','saju-data','rules','narrator','content','content-pro','content-pro2','topics','intro-text','story-director','story-composer','content-v3','verdict','remedy','media','scenes','compose','reading-answer','reading-flow','deep','deep-time','deep-life','deep-wealth','deep-love','life-doc','consistency','full-reading','charts','pdf','explore'])vm.runInThisContext(fs.readFileSync('report/v2/'+f+'.js','utf8'),{filename:f});
const R=ReportV2,M=Manse,now=Date.UTC(2026,9,13,3),outputs=new Set();
const samples=[[1992,6,23,1,'M'],[1985,3,14,9,'F'],[1978,11,2,18,'M'],[2001,8,30,12,'F'],[1994,7,24,null,'F'],[1960,1,1,23,'M'],[2020,2,4,0,'F'],[2026,10,13,12,'M']];
for(const [year,month,day,hour,gender] of samples){
 const ch=M.compute({year,month,day,hour,minute:0,calendar:'solar',gender,city:'서울'}),sd=R.SajuData.build(ch,{now}),snapshot=JSON.stringify(ch),pack=R.Compose.fromSaved(null,[],'full'),rep=R.Compose.build(sd,pack.lib,pack.cfg,{name:'귀인'});
 const H={M,ch,sd,now,name:'귀인',assets:{},rep};R.Deep.augment(rep,H);
 const before=JSON.stringify(rep),next=R.ReadingFlow.build(rep,sd,H);
 assert.equal(JSON.stringify(rep),before);assert.equal(JSON.stringify(ch),snapshot);
 assert.equal(next.readingFlow.sections.length,15);assert.equal(next.readingFlow.future.length,10);
 assert.equal(new Set(next.chapters.map(c=>c.id)).size,next.chapters.length);
 assert(rep.chapters.every(c=>next.chapters.some(x=>x.id===c.id)));
 assert(next.chapters.every((c,i)=>!i||c.readingSection>=next.chapters[i-1].readingSection));
 assert(next.chapters.every((c,i)=>c.no===i+1&&next.acts.some(a=>a.id===c.act)));
 const audit=R.ReadingFlow.audit(next);assert.equal(audit.missing.length,0);assert.equal(audit.duplicates.length,0,JSON.stringify(audit.duplicates));
 for(const c of next.chapters.filter(c=>c.readingCore)){
  assert.equal(c.scenes.filter(s=>s.readingRole).length,8);
  const violations=R.Consistency.checkAll(sd,Object.values(c.readingCore).join(' '));assert.equal(violations.length,0,JSON.stringify(violations));
  if(hour===null)assert(c.readingCore.evidence.includes('시간 미상'));
 }
 const pages=R.Pdf.pages(next,sd,{name:'귀인'}),all=pages.join('');assert(pages.length>=20);assert(all.includes('향후 10년 세운 계산표'));
 for(const section of next.readingFlow.sections) for(const f of R.ReadingFlow.FIELDS) assert(all.includes(section.core[f[0]].slice(0,12).replace(/&/g,'&amp;')));
 assert.strictEqual(R.ReadingFlow.build(next,sd,H),next);outputs.add(JSON.stringify(next.readingFlow.sections.map(x=>x.core)));
 const life=R.LifeDoc.build({...H,soc:R.StoryDirector.social(M,ch,sd,now)}),flow=R.ReadingFlow.build(life,sd,H);assert.equal(flow.readingFlow.sections.length,15);
}
assert(outputs.size>=7);
assert(R.Consistency.checkAll({groups:{재성:24},fiveElements:{}},'재성 비중은 91%입니다.').some(x=>x.rule==='percentage'));
assert.equal(R.Consistency.checkAll({groups:{재성:24.2},fiveElements:{}},'재성 비중은 24%입니다.').length,0);
const customSD=R.SajuData.build(M.compute({year:1992,month:6,day:23,hour:1,minute:0,calendar:'solar',gender:'M',city:'서울'}),{now});
const customized=R.ReadingFlow.build({chapters:[{id:'c06',base:'c06',scenes:[],lead:{id:'approved_rule',readingCoreTemplate:{practice:'{dominantGroup}의 쓰임을 실제 업무 과제와 비교해 결과를 기록합니다.'}}}]},customSD);
assert(customized.chapters.find(c=>c.readingSection===5).readingCore.practice.includes(customSD.dominantGroup));
assert.equal(customized.readingFlow.sections[4].templateId,'approved_rule');
const special={project:{id:'love'},chapters:[]};assert.strictEqual(R.ReadingFlow.build(special,{},{}),special);
assert.equal(R.FullReading.uniqueAcross({paragraphs:[{text:'동일 문장'}]},new Map([['동일문장','a']]),'b'),false);
(async()=>{
 const F=await import(pathToFileURL(path.resolve('functions/_movingtoon-reading.js'))),K=await import(pathToFileURL(path.resolve('functions/_ik.js')));
 assert.deepEqual(F.inventedNames({specialStars:[{name:'역마살'}],patterns:[{name:'정관격'}]},'역마살과 정관격은 입력의 이름입니다.'),[]);
 assert(F.inventedNames({specialStars:[],patterns:[]},'천상살이 있는 사주입니다.').includes('천상살'));
 assert(F.inventedNames({specialStars:[],patterns:[]},'역마살은 특별한 능력입니다.').includes('역마살'));
 assert(F.inventedNames({specialStars:[],patterns:[]},'문창귀인과 천상격국이 함께 있습니다.').includes('문창귀인'));
 assert(F.inventedNames({specialStars:[],patterns:[]},'문창귀인과 천상격국이 함께 있습니다.').includes('천상격국'));
 assert(F.SYSTEM.includes('엔진 선택값을 임의로 바꾸거나'));
 assert(F.inventedNames({specialStars:[],patterns:[]},'천황격(天皇格)이 있다고 합니다.').includes('天皇格'));
 assert(F.inventedNames({specialStars:[],patterns:[]},'天乙貴人이 있습니다.').includes('天乙貴人'));
 assert.deepEqual(F.inventedNames({sinsal12:{day:'화개살'},specialStars:[],patterns:[]},'화개살의 조건을 확인합니다.'),[]);
 assert.deepEqual(F.inventedNames({specialStars:[],patterns:[]},'性格은 일반 설명입니다.'),[]);
 const old=K.cleanItem({id:'SELF-9090',domain:'SELF',actions:['기존 행동']});assert.deepEqual(old.strengthenActions,[]);
 const item=K.cleanItem({...old,strengthenActions:['강점 강화'],copingActions:['약점 보완'],theory:['조후']});assert.deepEqual(item.copingActions,['약점 보완']);assert.deepEqual(item.theory,['조후']);
 const preserved=K.cleanItem({id:item.id,domain:item.domain},item);assert.deepEqual(preserved.strengthenActions,['강점 강화']);assert.deepEqual(preserved.copingActions,['약점 보완']);
 const API=await import(pathToFileURL(path.resolve('functions/api/report-content.js'))),memory=new Map(),env={ADMIN_PASSWORD:'test',GLOSSARY_KV:{get:async(k,t)=>memory.has(k)?(t==='json'?JSON.parse(memory.get(k)):memory.get(k)):null,put:async(k,v)=>memory.set(k,v)}};
 const template={id:'reading_template_test',category:'career',status:'approved',conditions:{dayPillar:[customSD.dayPillar.ko],dayMasterStem:[customSD.dayMaster.stem]},priority:100,headline:'업무에서 확인할 강점',summary:'승인된 원국 조건을 업무의 실제 과제와 비교합니다.',detail:'역할과 지원을 함께 확인합니다.',extra:{readingCore:{practice:'{dominantGroup}의 쓰임을 실제 업무 과제와 비교하고 결과와 부담을 기록합니다.'}}};
 const response=await API.onRequestPut({env,request:new Request('http://x/api/report-content',{method:'PUT',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify({modules:[template],flow:{readSpeed:8,playbackRate:1.5}})})});assert.equal(response.status,200);
 const saved=(await (await API.onRequestGet({env})).json()).content;assert.equal(saved.flow.readSpeed,8);assert.equal(saved.modules[0].extra.readingCore.practice,template.extra.readingCore.practice);
 const pack=R.Compose.fromSaved(saved,[],'full'),report=R.Compose.build(customSD,pack.lib,pack.cfg,{}),view=R.ReadingFlow.build(report,customSD);assert.equal(view.readingFlow.sections[4].templateId,template.id);assert(view.chapters.find(c=>c.readingSection===5).readingCore.practice.includes(customSD.dominantGroup));
 saved.modules[0].status='draft';const draftPack=R.Compose.fromSaved(saved,[],'full'),draftReport=R.Compose.build(customSD,draftPack.lib,draftPack.cfg,{});assert.equal(R.ReadingFlow.build(draftReport,customSD).readingFlow.sections[4].templateId,null);
 console.log('reading-renewal: 8명식 · 15주제/8요소 · 시간 미상 · 원본/엔진/특화 보존 · 개인화 · 모순/중복 · PDF 계산표 · 명칭 가드 · DB 호환 통과');
})().catch(e=>{console.error(e);process.exit(1)});
