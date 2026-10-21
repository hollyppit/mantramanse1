// Opt-in editorial policy. Legacy passages retain their stored order until reviewed replacements are published.
export const COMPOSITION_VERSION='living-structure-1';
const key=s=>typeof s==='string'&&/^[\w.-]{1,80}$/.test(s);
export const specificity=p=>Object.values(p.when||{}).reduce((n,v)=>n+(v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).length:1),0);
export function compositionIssues(p){
 const m=p.composition;if(m==null)return [];
 const issues=[];
 if(!m||m.version!==1||!key(m.meaningKey)||!Number.isInteger(m.priority)||Math.abs(m.priority)>1000||!['saju','ziwei','general','fiction'].includes(m.perspective))return ['invalid-composition'];
 if(m.conflictKey!=null&&(!key(m.conflictKey)||!key(m.verdict)))issues.push('invalid-conflict-verdict');
 if(m.perspective==='fiction'&&p.kind!=='fiction')issues.push('fiction-kind-required');
 if(p.kind==='personal'&&!['saju','ziwei'].includes(m.perspective))issues.push('personal-perspective-required');
 const fields=['judgment','behavior','risk','sublimation','structuralDifference','action'];
 if(!m.life||fields.some(k=>typeof m.life[k]!=='string'||m.life[k].trim().length<10||m.life[k].length>1000||/[<>{}]/.test(m.life[k])))issues.push('six-life-elements-required');
 if(p.kind==='personal'&&specificity(p)<2)issues.push('compound-conditions-required');
 return issues;
}
export function rankPassages(passages){
 if(!passages.some(p=>p.composition))return passages;
 return passages.map((p,i)=>({p,i})).sort((a,b)=>specificity(b.p)-specificity(a.p)||(b.p.composition?.priority||0)-(a.p.composition?.priority||0)||a.i-b.i).map(x=>x.p);
}
export function selectionConflict(p,selected,claims=[]){
 const m=p.composition;
 for(const q of selected){
  const n=q.composition;
  if(m&&n&&m.perspective===n.perspective){
   if(m.meaningKey===n.meaningKey)return {code:'duplicate-meaning',other:q.id};
   if(m.conflictKey&&m.conflictKey===n.conflictKey&&m.verdict!==n.verdict)return {code:'conflicting-verdict',other:q.id};
  }
  if(m||n){
   const a=claims.filter(c=>(p.ruleIds||[]).includes(c.knowledge_id)),b=claims.filter(c=>(q.ruleIds||[]).includes(c.knowledge_id));
   if(a.some(x=>b.some(y=>x.system===y.system&&((x.counter_evidence||[]).includes(y.claim_id)||(y.counter_evidence||[]).includes(x.claim_id)))))return {code:'conflicting-source-claims',other:q.id};
  }
 }
 return null;
}
