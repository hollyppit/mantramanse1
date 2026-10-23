// Offline composer: calculated conditions -> candidate entries -> top 1-2 -> meaning dedupe -> paragraph assembly.
// Not imported by service routes. No network, no AI calls. Output is deterministic for a given chart.
import {deriveFacts, COND_FIELDS} from '../../functions/_ik.js';
import {simulate, validateEntry} from './engine.mjs';
import {NO_TIMING} from './lib.mjs';

export const COMPOSE_VERSION='compose-20261022-1';
const SENT_SPLIT=/(?<=[.!?])\s+/;
const tokens=s=>new Set(String(s).replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>1));
const jaccard=(a,b)=>{const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let i=0;for(const x of A)if(B.has(x))i++;return i/(A.size+B.size-i);};
// A family is the meaning group of an entry (first two tag segments): variants of the same family never appear together.
export const familyOf=e=>String(e.meaningTags?.[0]||e.id).split('.').slice(0,2).join('.');
// Dynamic luck placeholders come only from engine-computed daewoon data (no interpretation). Unknown or unfilled placeholders are removed by the test.
export function luckVars(sd,f={}){
 const dw=sd.currentDaewoon,at=Array.isArray(sd.daewoon)?sd.daewoon.indexOf(dw):-1,nx=at>=0?sd.daewoon[at+1]:null,v={};
 if(f.daewoonSeason)v.daewoonSeason=f.daewoonSeason;if(f.seunSeason)v.seunSeason=f.seunSeason;
 if(sd.sewoon&&sd.sewoon.year){v.seunYear=String(sd.sewoon.year);v.seunGanzhi=sd.sewoon.ganzhi;}
 if(dw){v.daewoonGanzhi=dw.ganzhi;v.daewoonStart=String(dw.startYear);v.daewoonEnd=String(dw.endYear);}
 if(nx){v.daewoonNextGanzhi=nx.ganzhi;v.daewoonNextStart=String(nx.startYear);}
 return v;}
export const fillVars=(t,v)=>String(t).replace(/\{((?:daewoon|seun)\w+)\}/g,(m,k)=>v[k]??m);
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)>>>0;}return h;};
const specOf=trace=>(trace.rows||[]).filter(r=>r.hit).reduce((n,r)=>n+(COND_FIELDS[String(r.key).split('.')[0]]?.[1]||1),0);

export function rank(selected,trace,facts,chapter){
 // Evidence first (priority, then how narrowly the matched conditions point). Equal evidence is varied by a stable per-chart hash so
 // charts with the same tied candidates do not all show the alphabetically first one. The hash is not a fortune-telling signal.
 const seed=`${facts.dayPillar}|${facts.monthBranch}|${chapter}`;
 return selected.map(e=>({e,spec:specOf(trace.find(t=>t.id===e.id)||{}),tie:hash(seed+'|'+e.id)}))
  .sort((a,b)=>b.e.priority-a.e.priority||b.spec-a.spec||a.tie-b.tie||a.e.id.localeCompare(b.e.id));
}

export function pick(ranked,{max=2,usedFamilies=new Set(),usedCores=[],overlapLimit=0.6}={}){
 const picks=[],suppressed=[];
 // A story chapter (entry.storyKey) shows exactly one story line so the narrative stays coherent across chapters.
 if(ranked[0]?.e?.storyKey)max=1;
 for(const c of ranked){
  const fam=familyOf(c.e);let reason=null;
  if(picks.length>=max)reason='over-limit';
  else if(usedFamilies.has(fam)||picks.some(p=>familyOf(p.e)===fam))reason='same-meaning-family';
  else if(picks.some(p=>p.e.conflicts?.includes(c.e.id)||c.e.conflicts?.includes(p.e.id)))reason='declared-conflict';
  else if([...usedCores,...picks.map(p=>p.e.core)].some(x=>jaccard(x,c.e.core)>=overlapLimit))reason='near-duplicate-core';
  if(reason)suppressed.push({id:c.e.id,reason});else picks.push(c);
 }
 return {picks,suppressed};
}

const LABEL={core:'핵심 진단',basis:'왜 이렇게 읽나',example:'현실에서는',positive:'잘 쓰이면',negative:'손해 보기 쉬운 곳',advice:'이렇게 써 보세요',second:'같은 원국에서 겹쳐 보이는 단서',secondAdvice:'함께 챙길 점'};
function sections(picks){
 const [a,b]=picks.map(p=>p.e),out=[];
 const add=(key,label,text)=>{if(text)out.push({key,label,text});};
 add('core',LABEL.core,a.core);add('basis',LABEL.basis,a.notice?a.basis.split(a.notice).join('').trim():a.basis);add('example',LABEL.example,a.example);
 add('positive',LABEL.positive,a.positive);add('negative',LABEL.negative,a.negative);add('advice',LABEL.advice,a.advice);
 add('applications','상황별',`직장: ${a.applications.employee} 사업: ${a.applications.business} 프리랜서: ${a.applications.freelance}`);
 if(b){add('second',LABEL.second,`${b.core} ${b.example}`);add('secondAdvice',LABEL.secondAdvice,b.advice);}
 if(a.timing&&a.timing!==NO_TIMING)add('timing','시기',a.timing);
 if(a.notice)add('notice','안내',a.notice);
 return out;
}

export function composeChapter(entries,sd,chapter,{preview=false,max=2,usedFamilies=new Set(),usedSentences=new Set(),usedCores=[]}={}){
 const facts=deriveFacts(sd),sim=simulate(entries,sd,chapter,{preview});
 if(!sim.selected.length)return {version:COMPOSE_VERSION,chapter,coverage:'missing-evidence',sections:[],text:'',picks:[],suppressed:[],providerCalls:0};
 const ranked=rank(sim.selected,sim.trace,facts,chapter),{picks,suppressed}=pick(ranked,{max,usedFamilies,usedCores});
 if(!picks.length)return {version:COMPOSE_VERSION,chapter,coverage:'suppressed-duplicate',sections:[],text:'',picks:[],suppressed,candidates:sim.selected.length,providerCalls:0};
 const vars=luckVars(sd,facts),secs=sections(picks).map(x=>({...x,text:fillVars(x.text,vars)}));
 // sentence-level dedupe across the whole report: drop a sentence already shown earlier, never the section's anchor (core).
 // safety and non-prediction notices (notice/timing) are never removed by cross-chapter sentence dedupe
 const kept=[];
 for(const s of secs){const keep=s.key==='core'||s.key==='notice'||s.key==='timing';const parts=keep?[s.text]:s.text.split(SENT_SPLIT).filter(x=>!usedSentences.has(x));if(!parts.length)continue;const text=keep?s.text:parts.join(' ');kept.push({...s,text});if(!keep||s.key!=='timing')text.split(SENT_SPLIT).forEach(x=>{if(!keep)usedSentences.add(x)});}
 picks.forEach(p=>{usedFamilies.add(familyOf(p.e));usedCores.push(p.e.core);});
 return {version:COMPOSE_VERSION,chapter,coverage:'matched',provisional:preview,
  sections:kept,text:kept.map(s=>`[${s.label}] ${s.text}`).join('\n'),
  picks:picks.map((p,i)=>({id:p.e.id,role:i?'secondary':'primary',spec:p.spec,priority:p.e.priority,family:familyOf(p.e),
   matched:(sim.trace.find(t=>t.id===p.e.id)?.rows||[]).filter(r=>r.hit).map(r=>({key:r.key,label:r.label,want:r.want,have:r.have}))})),
  suppressed,candidates:sim.selected.length,providerCalls:0};
}

export function composeReport(entries,sd,chapters,opts={}){
 const usedFamilies=new Set(),usedSentences=new Set(),usedCores=[],out=[];
 for(const chapter of chapters)out.push(composeChapter(entries,sd,chapter,{...opts,usedFamilies,usedSentences,usedCores}));
 return {version:COMPOSE_VERSION,chapters:out,providerCalls:0};
}
export {validateEntry};
