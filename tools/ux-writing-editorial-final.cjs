// Human-directed editorial review following the real first-pass comparison.
const fs=require('node:fs'),{fixtures}=require('./ux-writing-fixtures.cjs'),{generate,ledger}=require('./ux-writing-live-client.cjs');
const ROLES=['title','reality','strength','risk','reinforce','practice','evidence'];
const CHS=[{id:'c-char',title:'나의 일간과 일주',focus:'첫 문장에 계산된 일간과 일주를 짧게 답합니다. 이름만으로 성격을 만들지 않고 확인된 판단의 한계를 안내합니다.'},{id:'c03',title:'나는 왜 이렇게 행동할까?',focus:'동료와 협업하거나 업무를 시작하는 가정의 장면에 승인된 추진력·고집·답답함·휴식 조건을 적용합니다. 실제로 그런 일을 겪었다고 주장하지 않습니다.'},{id:'c05',title:'나의 약점과 그림자',focus:'승인된 부담이 나타나는 조건과 일상에서의 구체적인 손해를 가정으로 설명합니다. 비난·당위 대신 바꿔볼 행동을 제안합니다.'},{id:'deep_wealth',title:'내 재물 그릇은?',focus:'재물 계산값은 있지만 출처 검증을 통과한 MONEY 해석 판단이 없습니다. 그릇 크기·금전 성향·투자 운은 보류합니다. 개인 해석이 아닌 일반 점검 질문을 짧게 안내합니다.'},{id:'deep_car',title:'내 사주를 자동차로 비유하면?',focus:'승인된 활동/표현/휴식 조건을 같은 차의 운전·목적지·주차·정비 선택으로 설명하는 교육용 비유입니다. 차종·등급·브랜드·부유함을 정하지 않습니다.'}];
const instruction=`당신은 근거에 충실한 한국어 UX 라이터입니다. raw chart를 다시 해석하는 역술가가 아닙니다. 입력 approvedClaims에 없는 성격·실제 과거·미래·학파 판단을 추가하지 마세요. 기존 후보의 그럴듯한 문장도 사실로 믿지 말고 humanFindings를 반영해 다시 편집합니다.
모든 문장은 자연스러운 존댓말입니다. 각 문단 45~160자, 2문장 정도입니다. 0은 질문의 결론, 1은 구체적인 가정 장면, 2는 유리한 조건, 3은 같은 성향이 부담이 되는 조건과 구체적인 손해, 4는 그 둘을 가르는 선택, 5는 실행 가능한 행동, 6은 전문 근거와 한계입니다. 소제목을 본문 안에 반복하지 마세요.
본문은 사람의 행동과 선택을 설명하고 신강·신약·용신·관성·인성·식상·재성·비겁·조후·통근·억부·강약·오행 비중은 6 근거 문단에만 씁니다. 일간·일주 소개에서 그 이름은 허용하지만 이름을 성격으로 번역하지 않습니다.
기질 판단은 전통 모델에 따른 가설입니다. '당신은 활발한 사람입니다', '기토라 안정적입니다'처럼 실제 사람을 단정하지 마세요. 여름·겨울의 상징은 체온·수분·건강 처방의 근거가 아닙니다. '수분을 보충하세요', '건강한 균형에 필수' 등으로 옮기지 마세요. 최종 용신을 새로 선택하지 마세요. 쉼·차분한 환경·활동·표현은 승인된 actions가 있을 때만 현실 행동으로 연결하세요. 실제 직업·가족·돈을 추정하지 마세요.
sourceUnavailable인 챕터는 0(핵심 보류),5(일반 점검 질문),6(근거 한계) 문단만 씁니다. '재물 지표가 없다'가 아니라 '계산표는 있으나 연결된 승인 해석의 출처 근거가 부족하다'고 구분하세요. refs와 claim_ids는 비웁니다. 다른 챕터의 판단을 재물 성격으로 전용하지 마세요.
그 외 챕터는 0~6을 쓰고 각 문단에 allowedReferences의 knowledge_id와 claim_id만 인용합니다. source doc id는 refs가 아닙니다. 근거에 없는 강점·손해·약점은 채우지 말고 문단에서 한계를 짧게 알리세요. 구체적인 가정의 장면과 행동 권유는 명리의 새 판단이나 결과 보장과 구분합니다. '반드시', '무조건', '확정', '수익률' 단어는 인용과 부정문에도 넣지 않습니다. 새 숫자·HTML·강조 기호를 넣지 마세요.
level3은 불편한 행동과 대가를 직접 짚고, level4는 선택의 자기모순을 더 선명하게 짚되 사실·근거·불확실성은 바꾸지 않습니다. 모든 챕터에서 동일한 성격 정의를 반복하지 말고 각 focus의 새 장면만 다룹니다. JSON으로 chapters만 반환합니다.`;
const str={type:'string'},arr=items=>({type:'array',items}),obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const schema=obj({chapters:arr(obj({id:{type:'string',enum:CHS.map(x=>x.id)},paragraphs:arr(obj({id:{type:'string',enum:ROLES.map((_,i)=>String(i))},text:str,refs:arr(str),claim_ids:arr(str)}))}))});
(async()=>{
 const f=await fixtures(),U=await import('../functions/_ux-writing.js'),MT=await import('../functions/_movingtoon-reading.js');
 const selected=JSON.parse(fs.readFileSync('output/ux-writing/chart-selection.json')).filter(x=>['synthetic-5','synthetic-6','synthetic-10'].includes(x.id)),out={at:new Date().toISOString(),source:'actual-provider-human-directed-editorial',productionWrites:0,records:[]};
 fs.mkdirSync('output/ux-writing/editorial-final',{recursive:true});
 for(const sample of selected){
  const sd=ReportV2.SajuData.build(Manse.compute(sample.input),{now:Date.UTC(2026,9,17,3)}),analysis=f.engine.analyze(sd,f.items,{sourceIndex:f.sourceIndex,blockedDocs:f.blocked,maxClaims:45,disabledRules:[]});
  for(const level of [3,4]){
   const file='output/ux-writing/editorial-final/'+sample.id+'-'+level+'.json';
   if(fs.existsSync(file)){out.records.push(...JSON.parse(fs.readFileSync(file)).records);continue;}
   const chapters=CHS.map(c=>{const claims=analysis.claims.filter(x=>x.domain===(c.id==='deep_wealth'?'MONEY':'SELF')),previous=JSON.parse(fs.readFileSync('output/ux-writing/comparisons/'+sample.id+'-'+c.id+'-level'+level+'-ux-plan-v4.json'));return {...c,sourceUnavailable:!claims.length,approvedClaims:claims.map(x=>({claim_id:x.claim_id,knowledge_id:x.knowledge_id,judgment:x.judgment,strengths:x.strengths,vulnerabilities:x.vulnerabilities,actions:x.actions,exceptions:x.exceptions,uncertainty:x.uncertainty,elements:x.elements})),allowedReferences:claims.map(x=>({claim_id:x.claim_id,knowledge_id:x.knowledge_id})),candidate:previous.result?.paragraphs||[],humanFindings:['일간·일주 이름만으로 안정적이거나 활발한 성격을 단정하지 않습니다.','추상적인 주의로 끝내지 말고 구체적인 가정 장면과 실행 행동을 보여줍니다.','오행의 계절 표현을 건강·수분 보충 처방으로 바꾸지 않습니다.','새 최종 용신이나 필수적인 효과를 단정하지 않습니다.','자료 부족과 계산값 부재를 혼동하지 않습니다.']};});
   let response=await generate('editorial-final/'+sample.id+'/'+level,instruction,{identity:{dayMaster:sd.dayMaster.stem,dayPillar:sd.dayPillar.ko,hourKnown:!!sd.pillars.hour},level,chapters},6500,schema,'gpt-4.1-2025-04-14');
   let result=JSON.parse(response.text),records=[];
   for(const chapter of chapters){const generated=result.chapters.find(c=>c.id===chapter.id),roles=chapter.sourceUnavailable?[0,5,6]:[0,1,2,3,4,5,6];
    const clean=MT.validate({sd,chapter:{id:chapter.id,title:chapter.title,paragraphs:roles.map(i=>({id:String(i),role:ROLES[i],kind:'reading',text:'해당 주제의 질문에 답하는 조건부 풀이 문단을 작성하고 없는 근거를 만들지 않습니다.'}))}}),claims=analysis.claims.filter(c=>chapter.allowedReferences.some(r=>r.claim_id===c.claim_id)),src={knowledge:claims.map(c=>({id:c.knowledge_id,interpretation:c.judgment})),claims},diagnostics=[];
    const sanitized=chapter.sourceUnavailable?generated:MT.sanitize(JSON.stringify(generated),clean,src,{deep:true,diagnostics});
    const paragraphs=(sanitized?.paragraphs||[]).map(p=>({...p,role:ROLES[Number(p.id)]})),writing=U.inspectWriting(paragraphs,{directness:level}),grounding=chapter.sourceUnavailable?{ok:paragraphs.length===3&&paragraphs.every(p=>!p.refs.length&&!p.claim_ids.length)}:f.engine.validateWritten({paragraphs},{...analysis,claims},clean);
    const record={sample:sample.id,pillar:sd.dayPillar.ko,hourKnown:!!sd.pillars.hour,chapter:chapter.id,title:chapter.title,level,sourceUnavailable:chapter.sourceUnavailable,decision:chapter.sourceUnavailable?'withheld':'generated',responseId:response.responseId,model:response.model,writing,grounding,diagnostics,paragraphs,accepted:!!sanitized&&writing.ok&&grounding.ok};records.push(record);
   }
   fs.writeFileSync(file,JSON.stringify({records,usage:response.usage},null,2));out.records.push(...records);console.log(JSON.stringify({sample:sample.id,level,passed:records.filter(x=>x.accepted).length,total:records.length,cost:ledger().actualUSD}));
  }
 }
 out.summary={total:out.records.length,passed:out.records.filter(x=>x.accepted).length,failed:out.records.filter(x=>!x.accepted).map(x=>({sample:x.sample,chapter:x.chapter,level:x.level,writing:x.writing,grounding:x.grounding,diagnostics:x.diagnostics})),costUSD:ledger().actualUSD};fs.writeFileSync('output/ux-writing/editorial-final.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out.summary));
})().catch(e=>{console.error(e.message);process.exitCode=1});
