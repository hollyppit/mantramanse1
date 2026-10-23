// Offline pilot. Not imported by service routes. Human review is still required.
import {deriveFacts, evalConds, cleanConds} from '../../functions/_ik.js';
export const VERSION='living-reading-pilot-20261022-1';
export function validateEntry(e){
 const issues=[];
 if(!e || !/^[\w.-]+$/.test(e.id||''))return ['invalid-id'];
 if(e.system!=='saju')issues.push('unsupported-system');
 if(!['draft','reviewed','retired'].includes(e.status))issues.push('invalid-status');
 for(const key of ['when','unless'])if(!e[key]||Array.isArray(e[key])||typeof e[key]!=='object'||JSON.stringify(cleanConds(e[key]))!==JSON.stringify(e[key]))issues.push('invalid-condition');
 if(!Array.isArray(e.conflicts)||e.conflicts.some(x=>typeof x!=='string'))issues.push('invalid-conflicts');
 if(Object.values(e.when||{}).reduce((n,v)=>n+(Array.isArray(v)?1:Object.keys(v||{}).length),0)<2)issues.push('compound-required');
 if(!e.version||!Number.isInteger(e.priority)||!['limited','moderate'].includes(e.confidence))issues.push('invalid-metadata');
 for(const k of ['core','basis','example','positive','negative','advice','timing'])if(typeof e[k]!=='string'||e[k].length<20)issues.push('missing-'+k);
 if(!e.chapters?.length||!e.meaningTags?.length||!e.calculationSources?.length)issues.push('missing-provenance');
 if(!e.applications || ['employee','business','freelance'].some(k=>!e.applications[k]))issues.push('missing-context');
 if(e.status==='reviewed'&&(!e.review?.reviewer||!e.review?.at||!e.review?.source||!e.review?.scenarios))issues.push('review-required');
 return issues;
}
export function simulate(entries,sd,chapter,{preview=false,previousTags=[]}={}){
 const facts=deriveFacts(sd),trace=[],selected=[],used=new Set(previousTags);
 for(const e of [...entries].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id))){
  if(!e.chapters?.includes(chapter))continue;
  const issues=validateEntry(e),match=evalConds(e.when||{},facts),exclude=Object.keys(e.unless||{}).length?evalConds(e.unless,facts):null;
  let reason=issues.length?'invalid-entry':e.status!=='reviewed'&&!(preview&&e.status==='draft')?'unreviewed':!match.match||match.missing.length?'conditions-not-met':exclude&&(exclude.match||exclude.missing.length)?'excluded-or-unknown':e.meaningTags.some(t=>used.has(t))?'duplicate-meaning':selected.some(s=>(e.conflicts||[]).includes(s.id)||(s.conflicts||[]).includes(e.id))?'conflict-lower-priority':'selected';
  trace.push({id:e.id,version:e.version,reason,issues,rows:match.rows,missing:match.missing,exclusion:exclude});
  if(reason==='selected'){selected.push(e);e.meaningTags.forEach(t=>used.add(t));}
 }
 return {version:VERSION,chapter,provisional:preview,coverage:selected.length?'matched':'missing-evidence',selected,trace,providerCalls:0};
}
