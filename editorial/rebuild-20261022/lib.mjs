import {cleanConds} from '../../functions/_ik.js';
// Authoring helpers for the full rebuild. Entries stay draft until a reviewer approves them.
export const NO_TIMING='이 문안은 원국 조건의 해설입니다. 현재 대운·세운·월운에 따른 변화는 이 항목에서 다루지 않으며, 운의 분류만으로 특정 사건의 시점을 만들지 않습니다.';
export const CORRECTION='시주 미상과 계산 학파 차이는 원국의 확정성과 구분해 검수합니다. 사례는 해석을 이해하기 위한 장면이며 개인 이력을 단정하지 않습니다.';
export const SOURCES=['engine.js','report/v2/saju-data.js','functions/_ik.js:deriveFacts'];
// [core, basis, example, positive, negative, advice, employee, business, freelance]
export function entry({id,chapter,when,unless={},tags,priority=100,text,timing=NO_TIMING,conflicts=[],storyKey}){
 const [core,basis,example,positive,negative,advice,employee,business,freelance]=text;
 return {id,version:1,system:'saju',status:'draft',confidence:'limited',priority,chapters:[chapter],when:cleanConds(when),unless:cleanConds(unless),conflicts,
  meaningTags:tags,calculationSources:SOURCES,sourceRuleIds:[],evidenceKind:'conditional-guide',basis,core,example,positive,negative,advice,
  applications:{employee,business,freelance},timing,correction:CORRECTION,...(storyKey?{storyKey}:{})};
}
export const ROMAN={갑:'gap',을:'eul',병:'byeong',정:'jeong',무:'mu',기:'gi',경:'gyeong',신:'sin',임:'im',계:'gye'};
// Declare that every entry in set A contradicts every entry in set B (symmetric). Used so the composer never shows opposite verdicts together.
export function oppose(entries,A,B){
 const by=new Map(entries.map(e=>[e.id,e]));
 for(const a of A)for(const b of B){const ea=by.get(a),eb=by.get(b);if(!ea||!eb)throw new Error('oppose: unknown id '+a+' / '+b);
  if(!ea.conflicts.includes(b))ea.conflicts.push(b);if(!eb.conflicts.includes(a))eb.conflicts.push(a);}
 return entries;
}
