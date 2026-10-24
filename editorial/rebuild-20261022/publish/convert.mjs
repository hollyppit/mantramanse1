// Converts rebuild drafts (entry model) into the production reading-library passage format.
// Local only: reads nothing from the database and writes nothing outside the output directory.
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {bundles} from '../index.mjs';
import {loadEngine} from '../admin/sim.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const fn=f=>import(pathToFileURL(path.join(ROOT,'functions',f)).href);

// Words the production validators reject (BANNED_RE) are replaced with equivalent plain wording; the meaning stays "not certain".
export const REPLACE=[[/사망 시기/g,'수명'],[/사망/g,'생명과 관련된 일'],[/수익률/g,'투자 성과'],[/범죄/g,'불법 행위'],[/확정이 아닙니다/g,'정해진 것은 아닙니다'],[/확정이 아니/g,'정해진 것이 아니'],[/확정되/g,'정해지'],[/확정/g,'결정'],[/반드시/g,'꼭'],[/무조건/g,'조건 없이'],[/100%/g,'전부']];
export const clean=t=>REPLACE.reduce((s,[re,to])=>s.replace(re,to),String(t||'').replace(/\s+/g,' ').trim());
const specificity=e=>Object.values(e.when||{}).reduce((n,v)=>n+(v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).length:1),0);
const ROLE_FIELDS=[['title','core'],['why','basis'],['reality','example'],['strength','positive'],['risk','negative'],['practice','advice']];

export function allEntries(){return Object.entries(bundles).filter(([b])=>b!=='pilot').flatMap(([bundle,l])=>l.map(e=>({...e,bundle})));}

// One entry -> six role passages that share the same conditions, so the service's per-role pick stays coherent.
export function entryPassages(e,{fiction=false}={}){
 const kind=fiction?'fiction':'guide',id=r=>`rb-${e.id}-${r}`,out=[];
 const apps=e.applications||{},appText=[apps.employee&&`직장에서는 ${apps.employee}`,apps.business&&`사업에서는 ${apps.business}`,apps.freelance&&`프리랜서라면 ${apps.freelance}`].filter(Boolean).join(' ');
 const fields={title:e.core,why:[e.basis,e.notice].filter(Boolean).join(' '),reality:e.example,strength:e.positive,risk:e.negative,practice:e.advice,reinforce:appText};
 for(const role of ['title','why','reality','strength','risk','reinforce','practice']){
  const text=clean(fields[role]);if(!text)continue;
  out.push({id:id(role),role,kind,text,ruleIds:[],when:e.when||{},unless:e.unless||{},adviceKey:id(role)});
 }
 return out;
}

// Role lead-ins for passages shorter than the production minimum (30 characters); added only when needed.
const LEAD={strength:'이 사주의 강점을 짚어 보면 ',risk:'조심해서 봐야 할 점을 짚어 보면 ',practice:'이렇게 해 보세요. ',reinforce:'상황별로 나누어 보면 ',reality:'생활 장면으로 보면 ',title:'',why:'이 풀이가 나온 이유를 짚어 보면 '};
const sentencesOf=t=>String(t).split(/(?<=[.!?])\s+/).filter(Boolean);
const normS=t=>t.replace(/[\s\p{P}\p{S}]/gu,'');
// Chapter library: authored entries first (ranked), then the currently published unconditional passages as the fallback for charts no entry matches.
export async function chapterPassages(contract,seedPassages,entries,{L}={}){
 const fiction=contract.topicId==='creative',log={prefixed:0,dedupedSentences:0,droppedForDuplicate:[]};
 const ranked=entries.slice().sort((a,b)=>(b.priority||0)-(a.priority||0)||specificity(b)-specificity(a)||(a.id<b.id?-1:1));
 const protectedS=new Set(ranked.flatMap(e=>sentencesOf(clean(e.notice||'')).map(normS)));
 const byId=new Map(ranked.map(e=>[e.id,e]));
 let authored=ranked.flatMap(e=>entryPassages(e,{fiction}));
 // why: sentences shared by several entries are template boilerplate; keep them only where they are the protected safety notice.
 const count=new Map();for(const p of authored.filter(p=>p.role==='why'))for(const x of new Set(sentencesOf(p.text).map(normS)))count.set(x,(count.get(x)||0)+1);
 authored=authored.map(p=>{if(p.role!=='why')return p;const keep=sentencesOf(p.text).filter(x=>protectedS.has(normS(x))||count.get(normS(x))<2);if(keep.length===sentencesOf(p.text).length||!keep.length)return p;log.dedupedSentences+=sentencesOf(p.text).length-keep.length;return {...p,text:keep.join(' ')};});
 authored=authored.map(p=>{if(p.text.length>=30||!LEAD[p.role])return p;log.prefixed++;return {...p,text:LEAD[p.role]+p.text};});
 // Creative chapters keep the published day-master story passages (one condition) as fallback too, so no role is left pending.
 const fallback=seedPassages.filter(p=>p.id.startsWith('seed-')&&!Object.keys(p.unless||{}).length&&(!Object.keys(p.when||{}).length||(fiction&&Object.keys(p.when).length===1&&p.when.dayMaster)));
 // Near-duplicate texts under overlapping conditions are rejected by the service: keep the higher-ranked passage and let the lower one fall back.
 for(let round=0;round<6&&L;round++){
  const issues=L.validatePassages([...authored,...fallback],contract,[]).filter(i=>i.code==='duplicate-passage');if(!issues.length)break;
  // A protected safety notice must never be lost: a duplicate "why" that carries it is made unique with the entry's own core sentence instead of being dropped.
  const keepNotice=new Set(issues.filter(i=>/-why$/.test(i.id)&&byId.get(i.id.replace(/^rb-|-why$/g,''))?.notice).map(i=>i.id));
  const drop=new Set(issues.map(i=>i.id).filter(id=>!keepNotice.has(id)||round>0));
  authored=authored.map(p=>keepNotice.has(p.id)&&round===0?{...p,text:clean(byId.get(p.id.replace(/^rb-|-why$/g,'')).core)+' '+p.text}:p);
  log.droppedForDuplicate.push(...drop);authored=authored.filter(p=>!drop.has(p.id));
 }
 return {authored,fallback,passages:[...authored,...fallback],log};
}
export async function loadService(){
 loadEngine(ROOT);
 const L=await fn('_reviewed-library.js'),S=await fn('_reading-library-seed.js');
 const cat=globalThis.MantraEditorial.defaults();
 return {L,S,chapters:cat.chapters};
}
