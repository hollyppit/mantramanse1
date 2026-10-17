// Local editorial supplement only. Never publishes rules or modifies AI review history.
const fs=require('fs'),crypto=require('crypto');
if(fs.existsSync('docs/TIMELINE84_HEALTH_SUPPLEMENT.json')&&JSON.parse(fs.readFileSync('docs/TIMELINE84_HEALTH_SUPPLEMENT.json')).aiReview){
 throw Error('AI 검수된 본문이 있습니다. 재생성으로 덮어쓰지 말고 해당 초안을 직접 편집한 뒤 재검수하세요.');
}
const corpus=JSON.parse(fs.readFileSync('output/timeline84-review/corpus.json'));
const traditional=[['balance','dmux34os0thh','c1'],['stars','dmux6klw5wy0','c2']].map(([id,documentId,chunkId])=>{
 const d=corpus.documents.find(x=>x.id===documentId),c=d.chunks.find(x=>x.id===chunkId);
 return {id,kind:'traditional-reference',documentId,chunkId,title:d.title,sha256:crypto.createHash('sha256').update(c.text).digest('hex'),scope:'용어·상징 설명만 지원. 의학적 검증 자료가 아님.',limitations:'저자·발행정보 및 원문 내 cite 번호의 원출처 미확인. 개인 사건 예측에 사용하지 않음.'};
});
const sources=[...traditional,{id:'who-activity',kind:'public-health',title:'WHO · Physical activity',url:'https://www.who.int/news-room/fact-sheets/detail/physical-activity',accessedAt:'2026-10-18',scope:'일반적인 신체 활동과 좌식 시간 관리. 오행·체질·개인 질환 추론은 지원하지 않음.',summary:'신체 활동은 건강에 도움이 되며, 적은 양의 활동도 의미가 있고 오래 앉아 있는 시간을 줄이는 것이 권고된다.'},{id:'nhtsa-drowsy',kind:'public-safety',title:'NHTSA · Drowsy Driving',url:'https://www.nhtsa.gov/risky-driving/drowsy-driving',accessedAt:'2026-10-18',scope:'졸음운전 예방. 개인의 사고 발생 여부·시기·확률은 지원하지 않음.',summary:'충분한 수면이 졸음운전 예방의 기본이다. 졸릴 때 운전을 계속하지 않고 안전한 장소에서 멈추는 대응을 안내한다.'}];
const chapters=[
 {id:'timeline_health_01',sourceIds:['balance','who-activity'],paragraphs:[
 '이 장의 건강 균형은 생활을 돌아보기 위한 질문입니다. 사주의 오행 비율이나 신강·신약으로 현재 건강 상태, 체력 또는 특정 질환을 판단할 수는 없습니다.',
 '기존 명리 자료에서 균형은 일간과 주변 오행의 관계를 읽는 해석 용어입니다. 여기서 말하는 강함과 약함을 몸의 강함과 약함으로 바꾸어 읽거나, 부족한 오행을 영양 결핍으로 해석하지 않습니다.',
 '일반 건강 정보로는 신체 활동과 오래 앉아 있는 시간을 점검할 수 있습니다. WHO는 신체 활동의 건강상 이점과 좌식 시간 줄이기를 안내합니다. 이 내용은 생년월일과 관계없이 참고하는 정보입니다.',
 '예를 들어 책상 앞에서 보내는 날이 많다면, 실제로 얼마나 오래 앉아 있었는지 확인하고 일상에서 가능한 움직임을 찾아볼 수 있습니다. 이는 오행을 보충하는 치료법이나 개인별 운동 처방이 아닙니다.',
 '지금 할 일은 원국에서 병명을 찾는 대신 생활 기록과 실제 몸의 변화를 살피는 것입니다. 증상이나 건강 문제가 있다면 사주 해석 대신 의료진의 평가를 기준으로 판단합니다.'
 ]},
 {id:'timeline_health_06',sourceIds:['stars','nhtsa-drowsy'],paragraphs:[
 '이 콘텐츠에서 사고수는 전통 운세의 주의·변동 표현을 설명하는 말로만 사용합니다. 개인에게 사고가 일어난다는 뜻이나 실제 위험도를 계산한 결과가 아닙니다.',
 '검토한 신살 자료는 길흉을 하나의 신살만으로 결정하지 말라는 주의를 담고 있습니다. 다만 출처의 원저자와 인용 번호를 확인하지 못했으므로, 이를 사고 예측의 검증된 이론이나 통일된 정의로 제시하지 않습니다.',
 '특정 신살이나 충이 있다는 이유로 교통사고, 수술, 재난을 예고하지 않습니다. 또한 그런 표시가 없다고 안전을 보장하지도 않습니다. 실제 안전 판단은 지금의 환경과 행동을 확인하는 데서 출발합니다.',
 '예를 들어 졸린 상태로 운전할지 고민한다면, 판단 기준은 운세가 아니라 현재의 졸음입니다. NHTSA는 충분한 수면을 기본 예방책으로 안내하며, 운전 중 졸리면 안전한 장소에서 멈추도록 권고합니다.',
 '이 장은 불길한 사건을 찾기보다 일정을 조정하거나 이동 수단을 바꾸는 현실적 선택을 생각하게 하는 안내입니다. 예방 행동은 위험을 줄이기 위한 것이며 특정 사건의 발생이나 회피를 보장하지 않습니다.'
 ]},
 {id:'timeline_health_08',sourceIds:['nhtsa-drowsy'],paragraphs:[
 '무리한 선택을 점검할 때는 사주보다 확인 가능한 상황을 먼저 봅니다. 이 질문에 개인의 무모함이나 사고 성향을 판단할 승인 근거는 없어, 누구에게나 적용할 수 있는 안전 사례로 설명합니다.',
 '구체적인 사례는 잠을 충분히 자지 못했거나 운전 중 졸린데도 도착 시간을 맞추려고 계속 운전하는 상황입니다. NHTSA의 졸음운전 안내는 수면과 운전 중 대응을 다루며, 이는 생년월일에 따른 위험 해석과 별개입니다.',
 '출발 전 충분히 잘 수 있는 일정인지 확인하고, 졸린 상태라면 이동을 미루거나 다른 교통수단을 고려할 수 있습니다. 이미 운전 중 졸리다면 안전한 장소에서 멈추는 것이 우선입니다.',
 '예를 들어 밤늦게 일을 마친 뒤 장거리 이동이 남았다면, 오늘 도착해야 한다는 계획 자체를 다시 검토하는 것입니다. 이 예시는 독자의 현재 수면 상태나 운전 습관을 추정한 내용이 아닙니다.',
 '같은 원칙을 다른 위험 작업에 적용할 때에는 해당 작업의 안전 지침을 따로 확인해야 합니다. 졸음운전 자료를 근거로 모든 작업의 위험도나 개인의 사고 확률을 일반화하지 않습니다.'
 ]}
].map(c=>({...c,state:'draft',mode:'educational-only',personalizedEvidenceAccepted:false,expertApproved:false,sourceRuleIds:[],paragraphs:c.paragraphs.map(text=>({text}))}));
const result={version:1,reviewedAt:'2026-10-18',productionWrites:0,deployed:false,aiProviderCalls:0,expertApproved:false,sources,chapters};
fs.writeFileSync('docs/TIMELINE84_HEALTH_SUPPLEMENT.json',JSON.stringify(result,null,2));
const tasks=JSON.parse(fs.readFileSync('docs/TIMELINE84_RESEARCH_TASKS.json'));
for(const j of tasks.jobs){if(!chapters.some(c=>c.id===j.chapterId))continue;j.state='educational-supplement-draft-personalized-evidence-unavailable';j.reason='전통 용어의 한계와 공식 보건·안전 자료에 기반한 일반 안내 본문 보완. 개인 건강·사고 판단 근거는 계속 부족.';j.supplementFile='docs/TIMELINE84_HEALTH_SUPPLEMENT.json';}
fs.writeFileSync('docs/TIMELINE84_RESEARCH_TASKS.json',JSON.stringify(tasks,null,2));
console.log(JSON.stringify({chapters:chapters.length,sources:sources.length,productionWrites:0,deployed:false}));
