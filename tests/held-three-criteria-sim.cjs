'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {RULES,evaluateDraft,screen}=require('./helpers/held-three-criteria-draft.cjs');
const ctx={deukryeong:false,deukji:false,deukse:false,hasRoot:false,methodConflict:false,specialStructure:false};
const base={precision:'raw-engine',ruleId:RULES.male,gender:'M',hourKnown:true,groupPct:31,helpPct:41.999,context:ctx,alternatives:[{model:'hidden',groupPct:31,helpPct:41},{model:'simple8',groupPct:35,helpPct:40}]};
let assertions=0;function check(c){assert(c);assertions++;}function run(x){const r=evaluateDraft(x);check(r.publishable===false&&r.traditionalVerdict==='unvalidated');return r;}
check(run(base).screen==='candidate');check(run({...base,gender:'F'}).screen==='not-candidate');check(run({...base,ruleId:RULES.female,gender:'F'}).screen==='candidate');
for(const v of [undefined,null,'MISSING',''])check(run({...base,gender:v}).screen==='unknown');
check(run({...base,hourKnown:false}).screen==='unknown');check(run({...base,context:{...ctx,deukji:undefined}}).screen==='unknown');
for(const groupPct of [27.999,28,29.999,30,30.001])for(const helpPct of [41.999,42,42.001]){const x={...base,groupPct,helpPct,alternatives:base.alternatives.map(a=>({...a,groupPct,helpPct}))};const r=run(x);check(r.screen===(groupPct===30||helpPct===42?'unknown':groupPct>=30&&helpPct<42?'candidate':'not-candidate'));}
for(const v of [NaN,Infinity,-1,101,'30',null])check(run({...base,groupPct:v}).screen==='unknown');check(run({...base,groupPct:70,helpPct:40}).screen==='unknown');
check(run({...base,context:{...ctx,methodConflict:true}}).screen==='unknown');check(run({...base,context:{...ctx,specialStructure:true}}).screen==='unknown');check(run({...base,alternatives:[]}).screen==='unknown');check(run({...base,alternatives:[base.alternatives[0],base.alternatives[0]]}).screen==='unknown');check(run({...base,alternatives:[base.alternatives[0],{model:'simple8',groupPct:29,helpPct:41}]}).reasons.includes('model-sensitive'));
const annual={...base,ruleId:RULES.annual,targetYear:2026,annual:{year:2026,stemTG:'정재',branchTG:'편재'},daewoon:{startYear:2020,endYear:2029,stemTG:'정재',branchTG:'편재'}};
check(run(annual).reasons.includes('annual-composition-unspecified'));check(run({...annual,annual:{...annual.annual,year:2025}}).reasons.includes('missing-or-stale-period'));check(run({...annual,daewoon:{...annual.daewoon,startYear:2027}}).reasons.includes('missing-or-stale-period'));check(run({...annual,annual:{year:2026,stemTG:'정재'}}).reasons.includes('missing-period-stem-or-branch'));
// Independent engine pattern agreement across deterministic synthetic birth profiles.
global.window=globalThis;vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8'));let charts=0,known=0,missingHour=0,modelSensitive=0,rawVsRounded=0;const counts={male:{candidate:0,'not-candidate':0,unknown:0},female:{candidate:0,'not-candidate':0,unknown:0},annual:{candidate:0,'not-candidate':0,unknown:0}};
for(let i=0;i<480;i++){
 const birth={year:1940+i%85,month:1+i%12,day:1+(i*7)%27,hour:i%8===0?null:i%24,minute:0,gender:i%2?'M':'F',calendar:'solar',city:'서울'},ch=Manse.compute(birth);charts++;
 for(const [kind,idx,pat] of [['male',2,'재다신약'],['female',3,'관살과다']]){
  const pct=ch.weights.groups[idx],help=ch.strength.help;check(screen(pct,help)===ch.patterns.list.some(p=>p.name===pat));
  if(screen(Math.round(pct*10)/10,help)!==screen(pct,help))rawVsRounded++;
  const alternatives=['hidden','simple8'].map(model=>({model,groupPct:ch.weightsAll[model].groups[idx],helpPct:ch.weightsAll[model].groups[0]+ch.weightsAll[model].groups[4]}));
  const input={precision:'raw-engine',ruleId:RULES[kind],gender:birth.gender,hourKnown:ch.hourKnown,groupPct:pct,helpPct:help,context:{...ctx,deukryeong:ch.strength.deukryeong,deukji:ch.strength.deukji,deukse:ch.strength.deukse},alternatives};
  const r=run(input);counts[kind][r.screen]++;if(r.reasons.includes('model-sensitive'))modelSensitive++;
 }
 if(ch.hourKnown)known++;else missingHour++;
 const r=run({...annual,gender:birth.gender,hourKnown:ch.hourKnown,groupPct:ch.weights.groups[2],helpPct:ch.strength.help});counts.annual[r.screen]++;
}
check(counts.male.candidate>0&&counts.female.candidate>0);check(counts.annual.candidate===0);check(modelSensitive>0);
const result={assertions,charts,knownHour:known,missingHour,counts,modelSensitive,rawVsRounded,enginePatternAgreement:true,allPublicationDisabled:true,annualComposition:'not-implemented-unvalidated',externalAIRequests:0,limitations:'Synthetic checks validate software contracts, not traditional equivalence or predictive accuracy. Context false values in the synthetic adapter are controls, not validated structural diagnoses.'};
if(process.argv.includes('--report')){fs.mkdirSync(path.join(__dirname,'../output'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../output/held-three-criteria-validation.json'),JSON.stringify(result,null,2));}console.log(JSON.stringify(result,null,2));
