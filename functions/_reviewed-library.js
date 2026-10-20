import {isFlow,renderFlow,flowTemplateIssue} from './_reading-flow-copy.js';
import {isCompound,COMPOUND_VERSION} from './_reading-compound-copy.js';
import {plainText,isTechnical} from './_plain-copy.js';
import {Polite,politeText} from './_polite.js';
import {deriveFacts,cleanConds,evalConds,BANNED_RE} from './_ik.js';
import {PROHIBITED_RE} from './_style.js';
import {similarity} from './_chapter-policy.js';
import {digest} from './_reading-blocks.js';
import {adviceFocus} from './_reading-advice.js';
export const LIBRARY_VERSION='reviewed-library-10-contextual-profiles';
// Reuse the existing service-only CAS namespace; no broader database privileges are required.
export const libraryKey=id=>'ik:blocks:chapter:library.'+id;
export const ROLES=['title','why','reality','strength','risk','reinforce','practice','evidence'];
const norm=t=>String(t||'').replace(/[\s\p{P}\p{S}]/gu,'');
const ordered=x=>Array.isArray(x)?x.map(ordered):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,ordered(x[k])])):x;
const disjoint=(a,b)=>Object.keys(a.when||{}).some(k=>{const x=a.when[k],y=b.when?.[k];return Array.isArray(x)&&Array.isArray(y)?!x.some(v=>y.includes(v)):x&&y&&typeof x==='object'&&typeof y==='object'&&Object.keys(x).some(key=>y[key]&&x[key]!==y[key]);});
// A retained legacy paragraph and its slot-bearing replacement intentionally coexist during migration.
const flowMigrationPair=(a,b)=>{
 const flow=isFlow(a)?a:isFlow(b)?b:null,old=flow===a?b:a;
 return !!flow&&flow.text.includes('〔')&&old.id===flow.id.replace(/^flow-/,'condition-');
};
export const emptyLibrary=()=>({version:0,draft:[],published:[],history:[],scenarios:[]});
export async function readLibrary(kv,id){return kv && await kv.get(libraryKey(id),'json') || emptyLibrary();}
// Public reads project the current published edition in the database, so CAS publication stays atomic.
export async function readPublishedLibrary(kv,id){
 const l=kv?.publishedLibrary?await kv.publishedLibrary(id):await readLibrary(kv,id);
 return {...emptyLibrary(),version:l?.version||0,published:l?.published||[]};
}
export function validatePassages(passages,contract,items){
 const issues=[],ids=new Set(),rules=new Map(items.map(r=>[r.id,r]));
 if(!Array.isArray(passages)||passages.length>200)return [{code:'invalid-passages'}];
 for(const b of passages){
  const add=code=>issues.push({id:b?.id||'',code});
  if(!b||!/^[\w.-]{1,80}$/.test(b.id||'')||ids.has(b.id)){add('invalid-id');continue;}ids.add(b.id);
  const flowIssue=flowTemplateIssue(b);if(flowIssue)add(flowIssue);
  if(!ROLES.includes(b.role)||!['personal','general','guide','fiction'].includes(b.kind))add('invalid-role-kind');
  if(typeof b.text!=='string'||b.text.trim().length<30||b.text.length>1000||/[<>{}]/.test(b.text)||BANNED_RE.test(b.text)||PROHIBITED_RE.test(b.text))add('invalid-text');
  if(b.kind==='general'&&!['practice','reinforce'].includes(b.role))add('general-advice-role-only');
  if(b.kind==='fiction'&&contract.topicId!=='creative')add('fiction-topic-only');
  if(!Array.isArray(b.ruleIds)||b.ruleIds.length>12||new Set(b.ruleIds).size!==b.ruleIds.length)add('invalid-rule-links');
  else {
   if(b.kind==='personal'&&!b.ruleIds.length)add('personal-source-required');
   for(const id of b.ruleIds){const r=rules.get(id);if(!contract.sourceRuleIds.includes(id)||!r||r.status!=='published'||!r.reviewed)add('source-not-published:'+id);}
  }
  for(const key of ['when','unless'])if(JSON.stringify(ordered(cleanConds(b[key]||{})))!==JSON.stringify(ordered(b[key]||{})))add('invalid-'+key);
  if(b.adviceKey!=null&&!/^[\w.-]{1,80}$/.test(b.adviceKey))add('invalid-advice-key');
 }
 for(let i=0;i<passages.length;i++)for(let j=i+1;j<passages.length;j++)if(passages[i]?.text&&passages[j]?.text&&!disjoint(passages[i],passages[j])&&!flowMigrationPair(passages[i],passages[j])&&similarity(passages[i].text,passages[j].text)>.9)issues.push({id:passages[j].id,code:'duplicate-passage',other:passages[i].id});
 return issues;
}
export function normalizePassages(passages){return passages.map(b=>({id:b?.id,role:b?.role,kind:b?.kind,text:politeText(typeof b?.text==='string'?b.text.trim():''),ruleIds:b?.ruleIds||[],when:b?.when||{},unless:b?.unless||{},adviceKey:b?.adviceKey||b?.id}));}
export function selectPassages(passages,contract,analysis,sd){
 const facts=deriveFacts(sd),claims=new Map(analysis.claims.map(c=>[c.knowledge_id,c]));
 const items=analysis.claims.map(c=>({id:c.knowledge_id,status:'published',reviewed:true}));
 // Reject unmatched conditions before expensive prose validation. Matching copy still passes every source/style gate.
 return passages.filter(b=>{try{
  if(!b||!b.when||!b.unless)return false;
  if(Object.keys(b.when).length&&!evalConds(b.when,facts).match)return false;
  if(Object.keys(b.unless).length){const excluded=evalConds(b.unless,facts);if(excluded.match||excluded.missing.length)return false;}
  return !validatePassages([b],contract,items).length&&b.ruleIds.every(id=>claims.has(id)&&(!b.sourceVersions||b.sourceVersions[id]===(claims.get(id).knowledge_version||0)));
 }catch{return false;}});
}
// Database rules remain the sole evidence. Editorial instructions and fiction are never evidence.
export function composeReviewed({clean,contract,analysis,library,adviceHistory=[],previous=[],usedAdviceKeys=[]}){
 const linked=new Set(contract.sourceRuleIds),claims=analysis.claims.filter(c=>linked.has(c.knowledge_id));
 const scoped={...analysis,claims},selected=selectPassages((library.published||[]).filter(b=>library.preview||b.kind!=='personal'||b.sourceVersions),contract,scoped,clean.sd);
 const history=[...previous.map(x=>x.text),...adviceHistory.flatMap(x=>[x.reinforce,x.practice,x.caution])].filter(Boolean),seen=new Set(),used=new Set();
 const repeats=t=>history.some(x=>norm(x)===norm(t)||similarity(x,t)>.9)||seen.has(norm(t));
 const available=text=>typeof text==='string'&&text.trim()&&!BANNED_RE.test(text)&&!PROHIBITED_RE.test(text)&&!/[<>{}]/.test(text);
 const pending=[],blocks=[],priorKeys=new Set(usedAdviceKeys),adviceKeys=[];
 const paragraphs=clean.chapter.paragraphs.map((p,i)=>{
  const role=ROLES.includes(p.role)?p.role:ROLES[Math.min(i,ROLES.length-1)];let text='',refs=[],claim_ids=[],contentKind='personal';
  const guide=selected.filter(b=>!isFlow(b)&&!isCompound(b)&&b.role===role&&b.kind==='guide').sort((a,b)=>Object.keys(b.when).length-Object.keys(a.when).length)[0];
  const authored=selected.find(b=>b.kind!=='guide'&&b.role===role&&!used.has(b.id)&&(!['practice','reinforce'].includes(role)||(!repeats(b.text)&&!priorKeys.has(b.adviceKey||b.id))))||(['why','practice','reinforce'].includes(role)&&guide&&!priorKeys.has(guide.adviceKey||guide.id)?guide:null);
  if(authored&&['practice','reinforce'].includes(role)){const key=authored.adviceKey||authored.id;priorKeys.add(key);adviceKeys.push(key);}
  if(authored){used.add(authored.id);text=authored.text;refs=authored.ruleIds;claim_ids=refs.map(id=>claims.find(c=>c.knowledge_id===id).claim_id);contentKind=authored.kind==='guide'&&Object.keys(authored.when).length?'conditional-guide':authored.kind;blocks.push({id:authored.id,version:library.version});if(authored.kind==='general')text='일반 실천 점검: '+text;}
  else if(contract.topicId==='creative'){pending.push(role);text='「'+contract.title+'」에 사용할 검수된 창작 문장을 준비하고 있습니다. 실제 전생이나 개인의 과거를 확인한 내용으로 제공하지 않습니다.';}
  else if(role==='evidence'){
   text=claims.length?claims.slice(0,3).map(c=>(c.traditional_rules||[]).map(r=>politeText(r.principle)).join(' ')).join('\n')+'\n적용 조건이 충족된 전통 해석입니다. 실제 경험과 다르면 그 차이를 우선 확인합니다.':guide?.text||'이 질문에 적용할 검수 근거가 아직 충분하지 않습니다. 출생 시간이 없으면 시주를 근거로 한 판단은 제공하지 않습니다.';
   if(!claims.length&&guide)contentKind=Object.keys(guide.when).length?'conditional-guide':'guide';
   if(guide&&Object.keys(guide.when).length){const evaluated=evalConds(guide.when,deriveFacts(clean.sd));text+='\n'+evaluated.rows.map(r=>r.label+': '+r.have).join(' · ');}
   refs=claims.slice(0,3).map(c=>c.knowledge_id);claim_ids=claims.slice(0,3).map(c=>c.claim_id);
  }else if(guide&&['title','reality','strength','risk','reinforce','practice'].includes(role)){text=guide.text;contentKind=Object.keys(guide.when).length?'conditional-guide':'guide';blocks.push({id:guide.id,version:library.version});
  }else{
   const values=claims.flatMap(c=>{let xs=role==='title'?[c.judgment]:role==='strength'?c.strengths:role==='risk'?c.vulnerabilities:role==='reality'?Object.values(c.examples||{}):role==='practice'?c.actions:role==='reinforce'?c.actions:[];return (xs||[]).filter(t=>available(t)&&!isTechnical(t)).map(t=>({c,t:plainText(politeText(t)),original:t}));});
   const row=values.find(x=>x.t.length<=900&&!repeats(x.t));
   if(row){text=row.t;refs=[row.c.knowledge_id];claim_ids=[row.c.claim_id];if(guide&&text.length<30&&text!==guide.text&&text.length+guide.text.length<1150){text+='\n\n'+guide.text;contentKind='mixed';}}
   else if(guide){text=guide.text;contentKind=Object.keys(guide.when).length?'conditional-guide':'guide';blocks.push({id:guide.id,version:library.version});}
   else if(['practice','reinforce'].includes(role)&&adviceFocus(contract)){
    text=role==='practice'?'일반 실천 점검: '+politeText(adviceFocus(contract).focus):'「'+contract.title+'」에서는 실제 생활과 맞는 부분만 선택해 활용합니다. 적용되지 않는 조건은 개인의 특성으로 단정하지 않습니다.';
   }else{pending.push(role);const label={title:'개인별 핵심 풀이',why:'적용 이유',reality:'생활 사례',strength:'강점',risk:'주의할 점'}[role]||'추가 설명',particle=(label.charCodeAt(label.length-1)-0xAC00)%28?'은':'는';text='「'+contract.title+'」의 '+label+particle+' 연결된 검수 문장이 충분해지면 제공하겠습니다. 현재 근거로는 구체적인 개인 성향이나 사건을 단정하기 어렵습니다.';}
  }
  let components=[];
  if(contentKind==='conditional-guide'&&guide?.id.startsWith('condition-')&&['reality','strength','risk','reinforce','practice'].includes(role)){
   const composed=renderFlow(role,selected,clean.sd);if(composed){text=composed.text;components=composed.components;}
   // Missing profile facts keep the question-specific reading; never append unrelated generic advice.
   for(const part of components)blocks.push({id:part.id,version:library.version});
  }
  if(guide?.id.startsWith('bundle-')&&contentKind==='conditional-guide'){components=[{id:guide.id,when:guide.when,rows:evalConds(guide.when,deriveFacts(clean.sd)).rows}];}
  if(role==='evidence'){
   const applied=selected.filter(isCompound);if(applied.length){text+='\n복합 문안 '+COMPOUND_VERSION+': 일간은 접근 방식의 전통 비유, 신강신약은 기존 가중 계산의 분류로 사용합니다. 개별 십성은 일간을 제외한 비중을 사용하며, 묶음 비중과 더하지 않습니다. 개별 십성 14% 이상인 후보 중 비중이 큰 조합을 우선하고, 두 조건을 모두 충족하는 검수된 쌍이 있으면 단독 설명을 대체합니다. 시주가 없으면 주어진 기둥만으로 계산한 결과입니다. 생활 사례는 실제 경험의 확인이나 건강 진단이 아닙니다.\n'+[...new Set(applied.flatMap(p=>evalConds(p.when,deriveFacts(clean.sd)).rows.map(r=>r.label+': '+r.have)))].join(' · ');}
  }
  seen.add(norm(text));if(text.length<30)text+=' 실제 생활에서 해당하는 조건과 다른 조건을 함께 확인해 주세요.';
  return {id:p.id,text,refs,claim_ids,role,contentKind,...(components.length?{components}: {})};
 });
 return {result:{paragraphs},blocks,adviceKeys,pending:[...new Set(pending)],claims,libraryVersion:library.version,engine:LIBRARY_VERSION,contentSignature:null};
}
export async function libraryRevision(library){return digest(library);}
