const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
global.window=globalThis;for(const f of ['engine.js','report/v2/saju-data.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const sd=ReportV2.SajuData.build(Manse.compute({year:1992,month:6,day:23,hour:1,minute:0,gender:'M',calendar:'solar',city:'서울'}),{now:Date.UTC(2026,9,21)});
(async()=>{
 const P=await import('../functions/_reading-composition-policy.js'),L=await import('../functions/_reviewed-library.js');
 const life=Object.fromEntries(['judgment','behavior','risk','sublimation','structuralDifference','action'].map(k=>[k,'생활에서 확인할 구체적인 조건을 기록합니다.']));
 const make=(id,when={},extra={})=>({id,role:'practice',kind:'general',text:'새 업무를 받기 전에 마감일과 맡을 범위를 적고 상대와 함께 확인합니다.',ruleIds:[],when,unless:{},composition:{version:1,meaningKey:id,priority:0,perspective:'general',life,...extra}});
 const general=make('general'),specific=make('specific',{gender:['남'],dayMaster:['갑']}),priority=make('priority',specific.when,{priority:10});
 assert.deepEqual(P.rankPassages([general,specific,priority]).map(p=>p.id),['priority','specific','general']);
 const legacy=[{id:'z'},{id:'a',when:{gender:['남']}}];assert.equal(P.rankPassages(legacy),legacy);
 assert.equal(P.specificity({when:{group:{'식상':'strong','재성':'weak'}}}),2);assert.deepEqual(P.compositionIssues(specific),[]);assert(P.compositionIssues({...specific,composition:{...specific.composition,life:{}}}).includes('six-life-elements-required'));
 assert(P.compositionIssues({...specific,kind:'personal',when:{gender:['남']},composition:{...specific.composition,perspective:'saju'}}).includes('compound-conditions-required'));
 const a=make('a',{}, {conflictKey:'pace',verdict:'fast'}),b=make('b',{}, {conflictKey:'pace',verdict:'slow'});
 assert.equal(P.selectionConflict(b,[a]).code,'conflicting-verdict');
 assert.equal(P.selectionConflict(make('c',{}, {meaningKey:'a'}),[a]).code,'duplicate-meaning');
 assert.equal(P.selectionConflict({...b,composition:{...b.composition,perspective:'ziwei'}},[a]),null);
 const claims=[{knowledge_id:'one',claim_id:'saju:one',system:'saju',counter_evidence:['saju:two']},{knowledge_id:'two',claim_id:'saju:two',system:'saju'}];
 assert.equal(P.selectionConflict({...b,composition:{...b.composition,conflictKey:undefined},ruleIds:['two']},[{...a,ruleIds:['one']}],claims).code,'conflicting-source-claims');
 assert.deepEqual(L.normalizePassages([specific])[0].composition,specific.composition);
 // Exercise the real composer, with opposing decisions in different paragraph roles.
 const first={...a,role:'title'},second={...b,role:'risk'};
 const context={clean:{sd,chapter:{paragraphs:[{id:'0',role:'title'},{id:'1',role:'risk'}]}},contract:{id:'test',title:'검사',sourceRuleIds:[],topicId:'self'},analysis:{claims:[]},library:{version:1,published:[first,second],preview:true}};
 // General kind is intentionally restricted to action roles; use guide for structural test.
 context.library.published=context.library.published.map(p=>({...p,kind:'guide'}));
 const out=L.composeReviewed(context);assert(out.blocks.some(x=>x.id==='a'));assert(!out.blocks.some(x=>x.id==='b'));assert(out.selectionTrace.some(x=>x.id==='b'&&x.code==='conflicting-verdict'));
 console.log('PASS composition schema, specificity, priority, legacy ordering, semantic duplicates, opposing verdicts, separate perspectives, source contradictions, metadata persistence, real composer suppression');
})().catch(e=>{console.error(e);process.exit(1)});
