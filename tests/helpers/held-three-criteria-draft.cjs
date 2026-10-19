// Offline research scaffold. Never imported by production; not a traditional diagnosis.
'use strict';
const VERSION='held-three-draft-0.2';
const RULES={male:'D27-20261016-L-male-over',female:'D27-20261016-L-female-over',annual:'D27-20261016-M-risk'};
const THRESHOLDS=Object.freeze({groupStrong:28,patternGroup:30,weakHelpExclusive:42});
function screen(groupPct,helpPct){return groupPct>=THRESHOLDS.patternGroup&&helpPct<THRESHOLDS.weakHelpExclusive;}
// Arithmetic uncertainty guard, NOT a change to the engine or a traditional threshold.
const NUMERIC_TOLERANCE=1e-10;
function observation(model,groupPct,helpPct){return {model,groupPct,helpPct,groupPass:groupPct>=30,helpPass:helpPct<42,screen:screen(groupPct,helpPct),groupMargin:groupPct-30,helpMargin:42-helpPct,numericBoundary:Math.abs(groupPct-30)<=NUMERIC_TOLERANCE||Math.abs(helpPct-42)<=NUMERIC_TOLERANCE};}
function evaluateDraft(input={}){
 const {ruleId,gender,hourKnown,groupPct,helpPct,context,alternatives,targetYear,annual,daewoon}=input;
 if(!Object.values(RULES).includes(ruleId))throw Error('Unknown draft rule');
 const out={version:VERSION,ruleId,publishable:false,traditionalVerdict:'unvalidated',screen:'unknown',reasons:[],sourcePremises:[],engineObservations:{}};
 const fail=reason=>{out.reasons.push(reason);return out;};
 if(!['M','F'].includes(gender))return fail('missing-or-invalid-gender');
 if(ruleId===RULES.male&&gender!=='M'||ruleId===RULES.female&&gender!=='F'){out.screen='not-candidate';return fail('gender-outside-source-scope');}
 if(hourKnown!==true)return fail('unknown-hour');
 if(input.precision!=='raw-engine')return fail('missing-raw-engine-precision');
 if(![groupPct,helpPct].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100)||groupPct+helpPct>100+1e-8)return fail('invalid-or-inconsistent-percentages');
 // These percentages are separate disjoint groups from the same RAW engine weights, not rounded sd.groups or tgPct.
 if(!context||['deukryeong','deukji','deukse','hasRoot','methodConflict','specialStructure'].some(k=>typeof context[k]!=='boolean'))return fail('missing-structural-context');
 out.engineObservations={groupPct,helpPct,groupStrong:groupPct>=28,patternScreen:screen(groupPct,helpPct),context:{...context}};
 out.sourcePremises=['relative-excess-over-daymaster-not-established','actual-strength-gain-not-established'];
 if(context.methodConflict||context.specialStructure)return fail('requires-separate-method-or-special-structure-review');
 if(!Array.isArray(alternatives)||alternatives.length!==2||new Set(alternatives.map(a=>a?.model)).size!==2||!alternatives.every(a=>['hidden','simple8'].includes(a?.model)&&[a.groupPct,a.helpPct].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100)&&a.groupPct+a.helpPct<=100+1e-8))return fail('missing-or-invalid-model-comparison');
 const models=[observation('season',groupPct,helpPct),...alternatives.map(a=>observation(a.model,a.groupPct,a.helpPct))];
 const signals=models.map(m=>m.screen);out.engineObservations.modelScreens=signals;out.engineObservations.models=models;
 out.engineObservations.disagreementAxes=['groupPass','helpPass'].filter(k=>new Set(models.map(m=>m[k])).size>1);
 out.engineObservations.numericBoundaryModels=models.filter(m=>m.numericBoundary).map(m=>m.model);
 if(ruleId===RULES.annual){
  if(!Number.isInteger(targetYear)||!annual||annual.year!==targetYear||!Number.isInteger(daewoon?.startYear)||!Number.isInteger(daewoon?.endYear)||daewoon.startYear>targetYear||daewoon.endYear<targetYear)return fail('missing-or-stale-period');
  const tg=['비견','겁재','식신','상관','정재','편재','정관','편관','정인','편인'];
  if(![annual.stemTG,annual.branchTG,daewoon.stemTG,daewoon.branchTG].every(x=>tg.includes(x)))return fail('missing-period-stem-or-branch');
  out.sourcePremises.push('annual-total-wealth-vs-capacity-not-established');
  // No annual weights, annual capacity, interaction composition or recovery formula has been validated.
  return fail('annual-composition-unspecified');
 }
 if(!signals.every(s=>s===signals[0]))return fail('model-sensitive');
 if(models.some(m=>m.numericBoundary))return fail('numeric-boundary-review');
 out.screen=signals[0]?'candidate':'not-candidate';
 return fail(signals[0]?'existing-engine-screen-only':'outside-existing-engine-screen');
}
module.exports={VERSION,RULES,THRESHOLDS,NUMERIC_TOLERANCE,screen,evaluateDraft};
