'use strict';
// Offline packet construction: engine is used only for calendar pillars, never reference labels.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'output/independent-reference-2026-10-17');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function build(){
 global.window=globalThis;vm.runInThisContext(fs.readFileSync(path.join(ROOT,'engine.js'),'utf8'));
 const old=new Set(Array.from({length:480},(_,i)=>[1940+i%85,1+i%12,1+i*7%27,i%8===0?null:i%24,i%2?'M':'F'].join('/')));
 const births=[];for(let i=0;births.length<24;i++){const b={year:1961+i%47,month:1+(i*5)%12,day:2+(i*11)%25,hour:i%7===0?null:(i*5+3)%24,minute:17,gender:i%2?'M':'F',calendar:'solar',city:'서울'};if(!old.has([b.year,b.month,b.day,b.hour,b.gender].join('/')))births.push(b);}
 const cases=[],comparison=[];births.forEach((birth,i)=>{
 const chart=Manse.compute(birth),caseGroup='G'+String(i+1).padStart(2,'0'),split=i%4<2?'development':'holdout';
 const raw={gender:birth.gender,hourKnown:chart.hourKnown,pillars:Object.fromEntries(['year','month','day','hour'].map(k=>[k,chart.pillars[k]?Manse.gzName(chart.pillars[k]):null]))};
 const add=(annual)=>{const id=caseGroup+(annual?'-Y':'-N'),ruleId=annual?'D27-20261016-M-risk':birth.gender==='M'?'D27-20261016-L-male-over':'D27-20261016-L-female-over';
 const packet={id,caseGroup,split,ruleId,raw:structuredClone(raw)};
 if(annual){const year=2028+i%4,p=Manse.yearPillarOf(year);packet.raw.targetYear=year;packet.raw.annualPillar=Manse.gzName(p);const dw=chart.daeun.list.find(x=>x.startYear<=year&&year<=x.startYear+9);packet.raw.daewoonPillar=dw?Manse.gzName(dw):null;packet.raw.periodContextStatus=dw?'calendar-context-present':'incomplete';}
 cases.push(packet);comparison.push({id,models:['season','hidden','simple8'].map(model=>{const w=chart.weightsAll[model],groupPct=w.groups[ruleId.includes('female')?3:2],helpPct=w.groups[0]+w.groups[4];return {model,groupPct,helpPct,engineScreen:groupPct>=30&&helpPct<42};})});};add(false);if(i%3===0)add(true);
 });
 // Reference statuses are assigned from source sufficiency only; no access to comparison values.
 const reference=cases.map(c=>({id:c.id,reviewer:'Codex source-sufficiency precheck; not independent expert',reviewStatus:'provisional-abstention',referenceLabel:'unknown',sourceBasis:c.ruleId.endsWith('M-risk')?['dmux7q9nwg6m/c1']:['dmux66n2o7uf/c1','dmuzadnbj9xm/c1'],reasonCodes:c.ruleId.endsWith('M-risk')?['annual-composition-unspecified',...(c.raw.daewoonPillar?[]:['missing-daewoon-context'])]:['source-to-relative-excess-criterion-unresolved'],criteriaVersion:'independent-reference-0.1'}));
 const commitment=hash(reference);
 const templates=['A','B'].map(reviewer=>({reviewer,status:'not-started',instructions:'Inspect blinded packet and original source only; do not inspect comparison file. Unknown is valid. Do not use engine thresholds as reference.',cases:cases.map(c=>({id:c.id,referenceLabel:null,evidence:[],weakDaymaster:'unknown',relativeExcess:'unknown',specialStructure:'unknown',recovery:'unknown',reason:'',independentReviewComplete:false}))}));
 const manifest={version:'independent-reference-0.1',seed:'calendar-inputs-fixed-2026-10-17',sampleSelection:'fixed birth-input sequence; no model-score filtering',cases:cases.length,birthGroups:births.length,development:cases.filter(c=>c.split==='development').length,holdout:cases.filter(c=>c.split==='holdout').length,natal:24,annual:8,referenceCommitment:commitment,expertReviewed:0,referenceDefinitive:0,sourceScope:'existing private original documents',calendarProvenance:'Existing Manse calendar pillars only; arithmetic/calendar accuracy is not independently validated here.',publicationAllowed:false,externalAIRequests:0};
 return {cases,reference,templates,comparison,manifest};
}
if(require.main===module){const x=build();fs.mkdirSync(OUT,{recursive:true});for(const [name,value]of Object.entries(x))fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));console.log(JSON.stringify(x.manifest,null,2));}
module.exports={build,hash};
