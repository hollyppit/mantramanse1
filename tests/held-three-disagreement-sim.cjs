const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),path=require('path');
const {RULES,evaluateDraft,screen,NUMERIC_TOLERANCE}=require('./helpers/held-three-criteria-draft.cjs');
global.fetch=()=>{throw Error('Network forbidden in offline validation');};global.window=globalThis;vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8'));
const conflicts=[],rounding=[],boundaryCases=[];let checks=0;const ctx={deukryeong:false,deukji:false,deukse:false,hasRoot:false,methodConflict:false,specialStructure:false};
function test(ok){assert(ok);checks++;}
for(let i=0;i<480;i++){
 const birth={year:1940+i%85,month:1+i%12,day:1+(i*7)%27,hour:i%8===0?null:i%24,minute:0,gender:i%2?'M':'F',calendar:'solar',city:'서울'},ch=Manse.compute(birth);
 for(const [kind,idx]of [['male',2],['female',3]]){
 const models=['season','hidden','simple8'].map(model=>{const w=ch.weightsAll[model],g=w.groups[idx],h=w.groups[0]+w.groups[4];return {model,groupPct:g,helpPct:h,groupPass:g>=30,helpPass:h<42,screen:screen(g,h),groupMargin:g-30,helpMargin:42-h};});
 const applicable=ch.hourKnown&&birth.gender===(kind==='male'?'M':'F'),base=models[0];
 const input={precision:'raw-engine',ruleId:RULES[kind],gender:birth.gender,hourKnown:ch.hourKnown,groupPct:base.groupPct,helpPct:base.helpPct,context:ctx,alternatives:models.slice(1)};
 const result=evaluateDraft(input);test(!result.publishable);test(evaluateDraft({...input,alternatives:input.alternatives.slice().reverse()}).screen===result.screen);
 if(applicable&&!models.every(m=>m.screen===base.screen)){conflicts.push({sampleId:i,birth,kind,models,axes:result.engineObservations.disagreementAxes});test(result.reasons.includes('model-sensitive'));}
 const roundedGroup=Math.round(base.groupPct*10)/10;
 if(screen(roundedGroup,base.helpPct)!==base.screen){rounding.push({sampleId:i,birth,kind,applicable,raw:base,roundedGroup,roundedScreen:screen(roundedGroup,base.helpPct)});test(!applicable);test(evaluateDraft({...input,gender:kind==='male'?'M':'F',precision:'display-rounded'}).screen==='unknown');}
 if(result.reasons.includes('numeric-boundary-review'))boundaryCases.push({sampleId:i,kind,models});
 }
}
const causeCounts={groupOnly:0,helpOnly:0,both:0};for(const c of conflicts){const group=c.axes.includes('groupPass'),help=c.axes.includes('helpPass');causeCounts[group&&help?'both':group?'groupOnly':'helpOnly']++;}
test(conflicts.length===27);test(rounding.length===1);test(JSON.stringify(causeCounts)===JSON.stringify({groupOnly:12,helpOnly:7,both:8}));
// Prevent both sides of floating point noise from becoming a research candidate.
for(const [g,h]of [[30,41],[30-1e-14,41],[30+1e-14,41],[31,42-1e-14],[31,42],[31,42+1e-14]]){const input={precision:'raw-engine',ruleId:RULES.male,gender:'M',hourKnown:true,groupPct:g,helpPct:h,context:ctx,alternatives:['hidden','simple8'].map(model=>({model,groupPct:g,helpPct:h}))};test(evaluateDraft(input).reasons.includes('numeric-boundary-review'));}
const result={date:'2026-10-17',baselineCharts:480,conflicts:conflicts.length,causeCounts,roundingCases:rounding.length,roundingApplicableCases:rounding.filter(x=>x.applicable).length,numericBoundaryCases:boundaryCases.length,numericTolerance:NUMERIC_TOLERANCE,checks,allPublicationDisabled:true,externalAIRequests:0};
if(process.argv.includes('--report'))fs.writeFileSync(path.join(__dirname,'../output/held-three-disagreement-analysis-2026-10-17.json'),JSON.stringify({...result,conflictDetails:conflicts,roundingDetails:rounding,boundaryDetails:boundaryCases},null,2));console.log(JSON.stringify(result,null,2));
