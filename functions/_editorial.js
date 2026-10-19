import '../report/v2/reading-catalog.js';
import {isHealthEducation} from './_health-education.js';
export const Editorial=globalThis.MantraEditorial;
export const DRAFT_KEY='ik:editorial:draft',PUBLISHED_KEY='ik:editorial:published',HISTORY_KEY='ik:editorial:history';
const id=x=>typeof x==='string'&&/^[a-zA-Z][\w.-]{1,79}$/.test(x);
const text=(x,max)=>typeof x==='string'&&!!x.trim()&&x.length<=max&&!/[<>\u0000-\u0008]/.test(x);
const list=(x,limit,check)=>Array.isArray(x)&&x.length<=limit&&x.every(check)&&new Set(x).size===x.length;
export async function loadEditorial(kv,draft=false){return kv && await kv.get(draft?DRAFT_KEY:PUBLISHED_KEY,'json') || Editorial.defaults();}
export function validateEditorial(next,current){
 if(!next || !Array.isArray(next.topics)||next.topics.length>30||!Array.isArray(next.chapters)||next.chapters.length>250||!Array.isArray(next.cases)||next.cases.length>300)return 'invalid-catalog';
 const allowed={topics:new Set(['id','title','order','enabled','policyKind']),chapters:new Set(['id','topicId','title','question','purpose','requiredEvidence','example','difference','avoid','targetMin','targetMax','visual','legacyIds','order','state','sourceRuleIds','core']),cases:new Set(['id','topicId','title','chapterIds','ruleIds','state','situation','strength','risk','exception','strategy','source','contextConditions'])};
 for(const key of Object.keys(allowed))if(next[key].some(row=>!row||typeof row!=='object'||Object.keys(row).some(k=>!allowed[key].has(k))))return 'unknown-editorial-field';
 const topics=new Set(),chapters=new Set(),legacy=new Set(),cases=new Set();
 for(const t of next.topics){if(!id(t.id)||topics.has(t.id)||!text(t.title,100)||typeof t.enabled!=='boolean'||t.policyKind && !['self','wealth','career','love','relationships','timing','health','creative','remedy'].includes(t.policyKind)||!Number.isInteger(t.order)||t.order<0)return 'invalid-topic';topics.add(t.id);}
 for(const c of next.chapters){
  if(!id(c.id)||chapters.has(c.id)||!topics.has(c.topicId)||!['draft','reviewed','active','archived'].includes(c.state)||!Number.isInteger(c.order)||c.order<0)return 'invalid-chapter';
  for(const k of ['title','question','purpose','example','difference','visual'])if(!text(c[k],k==='title'?200:2000))return 'invalid-chapter-text';
  if(!list(c.requiredEvidence,20,x=>text(x,300))||!c.requiredEvidence.length||!list(c.avoid,20,x=>text(x,300))||!list(c.legacyIds,80,id)||!list(c.sourceRuleIds,100,id)||!Number.isInteger(c.targetMin)||!Number.isInteger(c.targetMax)||c.targetMin<200||c.targetMax<c.targetMin||c.targetMax>3000)return 'invalid-chapter-contract';
  for(const old of c.legacyIds){if(c.state!=='archived'){if(legacy.has(old))return 'duplicate-legacy-mapping';legacy.add(old);}}chapters.add(c.id);
 }
 for(const c of next.cases){
  if(!id(c.id)||cases.has(c.id)||!topics.has(c.topicId)||!list(c.chapterIds,100,x=>chapters.has(x))||!list(c.ruleIds,100,id)||!c.ruleIds.length||!['draft','reviewed','active','archived'].includes(c.state))return 'invalid-case';
  if(c.contextConditions && (Object.keys(c.contextConditions).some(k=>!Editorial.questions[k])||Object.keys(c.contextConditions).some(k=>!Object.prototype.hasOwnProperty.call(Editorial.questions[k].options,c.contextConditions[k])||c.contextConditions[k]==='private')))return 'invalid-case-context';
  for(const k of ['title','situation','strength','risk','exception','strategy','source'])if(!text(c[k],k==='title'?200:2000))return 'invalid-case-text';cases.add(c.id);
 }
 // Omission cannot delete an existing chapter/topic/case: archive or disable instead.
 if(current && ((current.topics || []).some(t=>!topics.has(t.id))||(current.chapters || []).some(c=>!chapters.has(c.id))||(current.cases || []).some(c=>!cases.has(c.id))))return 'preservation-required';
 return null;
}
const editorialDomains={self:['SELF'],wealth:['MONEY'],career:['CAREER'],love:['LOVE','MARRIAGE','RELATIONSHIP'],relationships:['RELATIONSHIP'],timing:['TIMING'],health:['ACTION'],creative:['SELF'],remedy:['ACTION']};
export function ruleSourceIssues(rule,blocked=new Set(),sourceIndex){
 if(!rule)return ['rule-missing'];
 const reasons=[];
 if(rule.status!=='published'||!rule.reviewed)reasons.push('rule-not-published-reviewed');
 if(!rule.conditions||!Object.keys(rule.conditions).length)reasons.push('conditions-missing');
 if(!rule.principle)reasons.push('principle-missing');
 if(!rule.evidence?.length)reasons.push('evidence-missing');
 for(const e of rule.evidence || []){
  if(!e.docId){reasons.push('document-missing');continue;}
  if(blocked.has(e.docId)){reasons.push('document-blocked');continue;}
  const doc=sourceIndex?.get(e.docId);if(!doc){reasons.push('document-missing');continue;}
  const chunks=(doc.chunks || []).filter(c=>!e.chunkId||c.id===e.chunkId);
  if(!chunks.length){reasons.push('chunk-missing');continue;}
  if(e.quote){if(!chunks.some(c=>String(c.text || '').includes(e.quote)))reasons.push('quote-mismatch');}
  else if(!e.chunkId)reasons.push('quote-or-chunk-required');
 }
 return [...new Set(reasons)];
}
export function contractDomains(catalog,contract){
 const base=editorialDomains[catalog.topics.find(t=>t.id===contract.topicId)?.policyKind || contract.topicId] || [];
 const timed=(contract.requiredEvidence || []).some(e=>/대운·세운 계산/.test(e));
 return [...new Set([...base,...(timed?['TIMING']:[]),...(contract.id==='timeline_wealth_04'?['CAREER']:[])])];
}
export function applyContractPolicy(policy,catalog,contract){
 if(!policy || !contract)return policy;
 return {...policy,domains:contractDomains(catalog,contract),purpose:contract.purpose,required:contract.requiredEvidence.slice(),excluded:[...new Set([...(policy.excluded || []),...(contract.avoid || [])])]};
}
export function publicationIssues(catalog,items,blocked=new Set(),sourceIndex,{includeDrafts=false}={}){
 const ruleMap=new Map(items.map(r=>[r.id,r])),cache=new Map(),issues=[];
 for(const [kind,rows,key] of [['chapter',catalog.chapters,'sourceRuleIds'],['case',catalog.cases,'ruleIds']])for(const c of rows){
  if(!(['active','reviewed'].includes(c.state)||includeDrafts&&c.state==='draft'))continue;
  // Fixed, reviewed general education is published separately from personal rule-based interpretations.
  if(kind==='chapter' && isHealthEducation(c))continue;
  const domains=contractDomains(catalog,c);
  const details=[];
  if(!c[key].length)details.push({code:'no-linked-rules'});
  for(const ruleId of c[key]){
   if(!cache.has(ruleId))cache.set(ruleId,ruleSourceIssues(ruleMap.get(ruleId),blocked,sourceIndex));
   const reasons=[...cache.get(ruleId)],rule=ruleMap.get(ruleId);
   if(rule&&!domains.includes(rule.domain))reasons.push('domain-mismatch');
   for(const code of reasons)details.push({ruleId,code});
  }
  if(details.length)issues.push({code:kind+'-source-not-ready',id:c.id,details});
 }
 return issues;
}
export function contractFor(catalog,chapter){
 const direct=Editorial.find(catalog,chapter);
 const byTitle=!direct && typeof chapter?.title==='string' ? catalog.chapters.filter(c=>c.state==='active' && c.title===chapter.title && catalog.topics.some(t=>t.id===c.topicId&&t.enabled)) : [];
 const candidate=direct || (byTitle.length===1?byTitle[0]:null);
 // Saved draft changes never leak into public generation. Built-in defaults are design constraints, not evidence.
 return candidate?.state==='active' && catalog.topics.some(t=>t.id===candidate.topicId&&t.enabled)?candidate:Editorial.find(Editorial.defaults(),chapter);
}
export function selectCases(catalog,contract,claims,rawContext){
 if(!contract)return [];
 const ids=new Set((claims || []).map(c=>c.knowledge_id)),context=Editorial.cleanContext(rawContext);
 return (catalog.cases || []).filter(c=>c.state==='active'&&c.topicId===contract.topicId&&(!c.chapterIds.length||c.chapterIds.includes(contract.id))&&c.ruleIds.every(id=>ids.has(id))&&Object.entries(c.contextConditions || {}).every(([k,v])=>context[k]===v))
 .sort((a,b)=>a.id.localeCompare(b.id)).slice(0,3).map(c=>({id:c.id,situation:c.situation,strength:c.strength,risk:c.risk,exception:c.exception,strategy:c.strategy,source:c.source,ruleIds:c.ruleIds,kind:'hypothetical-example',context:Editorial.contextLabels(context)}));
}

export function behaviorPlans(claims,examples){return (claims || []).map(c=>({claim_id:c.claim_id,knowledge_id:c.knowledge_id,system:c.system,
 conditions:c.elements,timeBasis:c.time_basis || {},hypothesis:c.judgment,realityQuestions:c.reality_questions || [],existingExamples:Object.entries(c.examples || {}).map(([kind,text])=>({kind,text,source:'approved-rule-hypothetical'})),
 examples:(examples || []).filter(e=>e.ruleIds.includes(c.knowledge_id)),strengths:c.strengths || [],vulnerabilities:c.vulnerabilities || [],
 exceptions:c.exceptions,counterEvidence:c.counter_evidence || [],actions:c.actions || [],evidence:c.evidence,
 kind:'conditional-traditional-interpretation-not-observed-user-fact'}));}
