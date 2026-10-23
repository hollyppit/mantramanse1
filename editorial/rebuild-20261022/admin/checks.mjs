// Automated content checks used by the local rebuild admin. Hard failures block approval; soft findings are warnings.
// Scores are CONTENT-QUALITY indicators (1-5) and say nothing about the accuracy of fortune predictions. A condition error is an automatic fail regardless of style scores.
import {validateEntry} from '../engine.mjs';
import {COND_FIELDS} from '../../../functions/_ik.js';
import * as R from './rules.mjs';
export const TEXT_FIELDS=['core','basis','example','positive','negative','advice'];
const SENT=/(?<=[.!?])\s+/;
export const sentences=t=>String(t||'').split(SENT).map(s=>s.trim()).filter(Boolean);
export const tokensOf=t=>new Set(String(t||'').replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>1));
export const jaccard=(a,b)=>{if(!a.size||!b.size)return 0;let i=0;for(const x of a)if(b.has(x))i++;return i/(a.size+b.size-i);};
export const visibleText=e=>[e.core,e.basis,e.example,e.positive,e.negative,e.advice,...Object.values(e.applications||{})].join(' ');
const ALLOWED_PLACEHOLDER=/^\{((daewoon|seun)(Ganzhi|Start|End|NextGanzhi|NextStart|Season|Year))\}$/;
const SITUATION=/(때|경우|날|주에|달에|회의|퇴근|출근|모임|상사|동료|친구|가족|거래|계약|발표|연락|메시지|일정|마감|통장|장터|성문|선창|서고)/;
const RISK=/(손해|어렵|위험|약점|지치|놓치|흔들|갈등|소진|부담|후회|밀리|끊기|서운|오해|무너|늦어)/;
const HEDGE=/(수 있습니다|할 수도|일 수도|수도 있습니다)/g;
const stripNotices=t=>String(t).replace(R.HEALTH_NOTICE,'').replace(R.CREATIVE_NOTICE,'').replace(R.REMEDY_NOTICE,'');
const clamp=(n)=>Math.max(1,Math.min(5,Math.round(n)));

export function chapterKind(chapterId){return /_health_/.test(chapterId)?'health':/_creative_/.test(chapterId)?'creative':/_remedy_/.test(chapterId)?'remedy':'general';}

export function checkEntry(e,ctx={}){
 const hard=[],soft=[],ch=e.chapters?.[0]||'',kind=chapterKind(ch),text=visibleText(e),clean=stripNotices(text);
 const base={...e,status:'draft'};delete base.review;
 for(const issue of validateEntry(base))hard.push({code:'entry-'+issue,msg:`문안 계약 위반: ${issue}`});
 // banned abstract phrases used as a stand-alone, unexplained sentence
 for(const f of ['core','example','positive','negative','advice'])for(const s of sentences(e[f])){
  if(R.ABSTRACT_STEMS.some(x=>s.includes(x))&&s.length<48)hard.push({code:'abstract-phrase',msg:`구체적 설명 없이 쓰인 추상 표현: "${s.slice(0,40)}"`,field:f});}
 if(R.DETERMINISTIC.test(clean))hard.push({code:'deterministic',msg:'사건 발생을 확정하는 표현이 있습니다.'});
 for(const m of clean.match(/\{[^}]*\}/g)||[])if(!ALLOWED_PLACEHOLDER.test(m))hard.push({code:'unknown-placeholder',msg:`허용되지 않은 자리표시자 ${m}`});
 if(R.GENDERED.test(`${e.basis} ${e.core}`)&&!/일지|시지|월지/.test(e.basis)&&!(e.when?.gender&&e.when.gender.length===1))hard.push({code:'gender-condition-required',msg:'성별에 따라 달라지는 해석이므로 성별 조건이 필요합니다.'});
 if(kind==='health'){const m=clean.replace(R.HEALTH_NOTICE,'').match(R.HEALTH_FORBID);if(m)hard.push({code:'health-forbidden',msg:`건강 풀이 금지 표현: ${m[0]}`});if(!/의료기관/.test(e.basis))hard.push({code:'health-missing-medical-note',msg:'의료기관 진료 우선 안내가 없습니다.'});if(!/(예측하지 않|진단하지 않|판정하지 않|예고하지 않)/.test(e.basis))hard.push({code:'health-missing-nonprediction-note',msg:'비예측·비진단 고지가 없습니다.'});}
 if(kind==='creative'){const m=clean.match(R.CREATIVE_FORBID);if(m)hard.push({code:'creative-forbidden',msg:`전생 체험 금지 표현: ${m[0]}`});if(!/창작/.test(e.basis))hard.push({code:'creative-missing-fiction-note',msg:'창작 체험 고지가 없습니다.'});if(!e.storyKey)hard.push({code:'creative-missing-storyKey',msg:'줄거리 키가 없습니다.'});}
 if(kind==='remedy'){const m=clean.match(R.REMEDY_FORBID);if(m)hard.push({code:'remedy-forbidden',msg:`개운법 금지 표현: ${m[0]}`});if(!/(단정하지 않|보장하지 않)/.test(e.basis))hard.push({code:'remedy-missing-nonguarantee-note',msg:'비보장 고지가 없습니다.'});}
 // soft findings
 if((e.example||'').length<60)soft.push({code:'short-example',msg:'현실 사례가 짧습니다(60자 미만).'});
 else if(!/[0-9]/.test(e.example)&&!SITUATION.test(e.example))soft.push({code:'no-concrete-marker',msg:'사례에 구체적인 상황 단서(숫자·장면)가 보이지 않습니다.'});
 const first=sentences(e.core)[0]||'';if(first.length>90)soft.push({code:'long-first-sentence',msg:'첫 문장이 90자를 넘어 핵심 진단이 늦게 드러납니다.'});
 if(((e.core+e.example+e.positive+e.negative).match(HEDGE)||[]).length>=4)soft.push({code:'hedge-heavy',msg:'"~할 수 있습니다" 류 완곡 표현이 많아 직설성이 낮습니다.'});
 if(/일주/.test(e.basis+e.core)&&!e.when?.dayPillar&&!(e.when?.positionTG||[]).some(x=>/^day\./.test(x)))soft.push({code:'ilju-condition-check',msg:'일주를 말하는데 일주·일지 조건이 없습니다. 조건을 확인하세요.'});
 if(ctx.needsTimeJudgment)soft.push({code:'needs-time-judgment',msg:'대운·세운을 쓰는 장입니다. 승인에는 "승인된 시기 판단" 확인이 필요합니다.'});
 // scores
 const sl=sentences([e.core,e.example,e.positive,e.negative,e.advice].join(' ')),avg=sl.length?sl.reduce((n,s)=>n+s.length,0)/sl.length:0;
 const units=Object.entries(e.when||{}).reduce((n,[k,v])=>n+(Array.isArray(v)?1:Object.keys(v||{}).length),0);
 const weight=Object.keys(e.when||{}).reduce((n,k)=>n+(COND_FIELDS[k]?.[1]||0)*(COND_FIELDS[k]?.[2]==='map'?Object.keys(e.when[k]).length:1),0);
 const tk=String(clean).replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>1),uniq=new Set(tk).size/(tk.length||1);
 const kw=R.TOPIC_KEYWORDS[ctx.topicId||ch.replace(/^timeline_/,'').split('_')[0]]||[],ss=sentences(clean),focus=ss.length?ss.filter(s=>kw.some(w=>s.includes(w))).length/ss.length:0;
 const condErr=hard.some(h=>/^entry-(invalid-condition|compound-required|invalid-conflicts|invalid-metadata)|gender-condition/.test(h.code));
 const scores={
  clarity:clamp(avg<=45?5:avg<=60?4:avg<=75?3:avg<=90?2:1),
  concreteness:clamp(1+((e.example||'').length>=100?1:0)+(SITUATION.test(e.example||'')?1:0)+(/[0-9]|하루|매일|매주|한 달|분기|상한|한도|기한/.test(e.advice||'')?1:0)+(new Set(Object.values(e.applications||{})).size===3?1:0)),
  candor:clamp(1+((e.negative||'').length>=30?1:0)+(RISK.test(e.negative||'')?1:0)+(SITUATION.test(e.example||'')?1:0)+(/(가능성이며 확정이 아닙니다|단정하지 않)/.test(visibleText(e))?1:0)),
  accuracy:condErr?0:5,
  personalization:clamp(weight>=12?5:weight>=9?4:weight>=7?3:weight>=5?2:1),
  density:clamp(uniq>=0.8?5:uniq>=0.7?4:uniq>=0.6?3:uniq>=0.5?2:1),
  focus:clamp(focus>=0.7?5:focus>=0.5?4:focus>=0.35?3:focus>=0.2?2:1),
  consistency:clamp(5-(ctx.conflictCount||0)),
 };
 const total=Object.values(scores).reduce((n,v)=>n+v,0)/8;
 return {id:e.id,chapter:ch,pass:hard.length===0,hard,soft,scores,total:+total.toFixed(2),units};
}

// Near-duplicate detection over core+example text. Returns pairs sorted by similarity.
export function findDuplicates(entries,{threshold=0.6,crossThreshold=0.5,limit=200}={}){
 const tk=entries.map(e=>({id:e.id,ch:e.chapters[0],core:tokensOf(e.core),both:tokensOf(e.core+' '+e.example),adv:tokensOf(e.advice)}));
 const out=[];
 for(let i=0;i<tk.length;i++)for(let j=i+1;j<tk.length;j++){
  const a=tk[i],b=tk[j],same=a.ch===b.ch,th=same?threshold:crossThreshold;
  const sc=Math.max(jaccard(a.core,b.core),jaccard(a.both,b.both));
  if(sc>=th)out.push({a:a.id,b:b.id,score:+sc.toFixed(2),scope:same?'same-chapter':'cross-chapter'});
 }
 out.sort((x,y)=>y.score-x.score);return {count:out.length,pairs:out.slice(0,limit)};
}

// Condition-set conflict audit: declared conflicts must be symmetric and reference existing ids; entries in the same family must not both carry the same condition set.
export function auditDeclaredConflicts(entries){
 const by=new Map(entries.map(e=>[e.id,e])),issues=[];
 for(const e of entries)for(const c of e.conflicts||[]){const o=by.get(c);if(!o)issues.push({id:e.id,code:'conflict-unknown-id',msg:`선언된 상충 대상 ${c}가 없습니다.`});else if(!(o.conflicts||[]).includes(e.id))issues.push({id:e.id,code:'conflict-not-symmetric',msg:`${e.id}→${c} 상충이 반대 방향에 선언되지 않았습니다.`});}
 const seen=new Map();
 for(const e of entries){const k=e.chapters[0]+'|'+JSON.stringify(e.when)+'|'+JSON.stringify(e.unless);if(seen.has(k))issues.push({id:e.id,code:'same-condition-set',msg:`${seen.get(k)}와 동일한 조건 집합입니다.`});else seen.set(k,e.id);}
 return issues;
}
// Opposing-verdict candidates for two displayed entries (heuristic, for admin review only).
export const ANTONYMS=[['월급형','사업형'],['모으는','쓰는'],['안정 분산','공격형'],['조직 안','독립'],['신중','충동'],['규칙적','즉흥'],['보수적','공격적'],['혼자','함께']];
export function antonymHit(a,b){const A=[a.core,a.negative].join(' '),B=[b.core,b.negative].join(' ');for(const [x,y] of ANTONYMS)if((A.includes(x)&&B.includes(y))||(A.includes(y)&&B.includes(x)))return [x,y];return null;}
