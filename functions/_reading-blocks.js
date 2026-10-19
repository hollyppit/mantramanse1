import { similarity } from './_chapter-policy.js';
import { claimSignature } from './_chapter-engine.js';
export const BLOCK_VERSION='reading-blocks-2';
export const blockKey=chapter=>'ik:blocks:chapter:'+chapter;
const roles=new Set(['title','why','reality','strength','risk','reinforce','practice','evidence']);
const norm=t=>t.replace(/[\s\p{P}\p{S}]/gu,'');
export async function digest(value){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');}
export async function chartSignature(sd){
 const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).filter(k=>!['name','birth','ziwei','calculationProvenance','asOf'].includes(k)).sort().map(k=>[k,ordered(v[k])])):v;
 return digest(ordered(sd));
}
export async function conditionSignature(claim){const {elements,...binding}=claim;return digest(binding);}
export const generalConditionText=text=>typeof text==='string'&&!/\d|[갑을병정무기경신임계][자축인묘진사오미신유술해]|월령|일간|일주|대운|세운|년생|신강|신약|중화|여성|남성/.test(text);
export function checkBlock(b){
  const issues=[];
  if(!b || !/^[\w.-]{1,80}$/.test(b.id||'') || !/^[\w.-]{1,80}$/.test(b.chapter||''))issues.push('id');
  if(!roles.has(b?.role))issues.push('role');
  if(typeof b?.text!=='string' || b.text.length<30 || b.text.length>1200 || /[<>{}]/.test(b.text))issues.push('text');
  if(!Array.isArray(b?.claims) || !b.claims.length || b.claims.length>12 || b.claims.some(c=>!c || typeof c.id!=='string'||!/^[a-f0-9]{64}$/.test(c.signature||'')))issues.push('claims');
  if(b?.formatVersion===2 && !/^[a-f0-9]{64}$/.test(b.chartSignature||''))issues.push('chart-binding');
  if(b?.scope!=null && !['exact','conditions'].includes(b.scope))issues.push('scope');
  if(b?.scope==='conditions' && (!generalConditionText(b.text)||b.claims?.some(c=>!c||!/^[a-f0-9]{64}$/.test(c.conditionSignature||''))))issues.push('condition-scope');
  if(!Array.isArray(b?.excludes) || b.excludes.some(x=>typeof x!=='string'))issues.push('excludes');
  if(!Array.isArray(b?.conflicts) || b.conflicts.some(x=>typeof x!=='string'))issues.push('conflicts');
  if(typeof b?.styleSignature!=='string' || !Number.isInteger(b?.version) || b.version<1)issues.push('version-style');
  if(!['candidate','approved','retired'].includes(b?.status))issues.push('status');
  if(b?.status==='approved' && (b.review?.semantic!==true || b.review?.source!==true || b.review?.privacy!==true || b.review?.scenarios!==true))issues.push('review-required');
  return {ok:!issues.length,issues};
}
// Claims have already passed the existing multi-condition, exclusion, source and conflict engine.
// Full claim signatures preserve applied conditions, exceptions, evidence and rule versions.
export async function composeBlocks(blocks,{clean,analysis,styleSignature,previous=[],allowCandidates=false}){
  const chart=await chartSignature(clean.sd);
  const signatures=new Map(await Promise.all(analysis.claims.map(async c=>[c.claim_id,await claimSignature(c)])));
  const conditionSignatures=new Map(await Promise.all(analysis.claims.map(async c=>[c.claim_id,await conditionSignature(c)])));
  const candidates=blocks.filter(b=>checkBlock(b).ok && (b.status==='approved'||allowCandidates&&b.status==='candidate'&&(!b.automation?.validation||['source','semantic','privacy','scenarios'].every(k=>b.automation.validation[k]===true))) && (b.formatVersion!==2||b.scope==='conditions'||b.chartSignature===chart) && b.chapter===clean.chapter.id && b.styleSignature===styleSignature && b.claims.every(c=>b.scope==='conditions'?conditionSignatures.get(c.id)===c.conditionSignature && (analysis.claims.find(a=>a.claim_id===c.id)?.traditional_rules||[]).some(r=>Object.keys(r.conditions||{}).length>=2):signatures.get(c.id)===c.signature) && b.excludes.every(id=>!signatures.has(id)));
  const neededRoles=new Set(clean.chapter.paragraphs.map(p=>p.role));
  const groups=[...new Set(candidates.map(b=>b.automation?.taskId||'manual'))].map(id=>({id,coverage:new Set(candidates.filter(b=>(b.automation?.taskId||'manual')===id&&b.status==='approved'&&neededRoles.has(b.role)).map(b=>b.role)).size})).sort((a,b)=>b.coverage-a.coverage||a.id.localeCompare(b.id));
  const preferredGroup=groups[0]?.id;
  const selected=[],paragraphs=[],missing=[],seen=new Set(previous.map(p=>norm(p.text||'')));
  for(const p of clean.chapter.paragraphs){
    if(p.kind==='episode'){missing.push(p.id);continue;}
    const choices=candidates.filter(b=>b.role===p.role && !selected.some(s=>s.id===b.id || s.conflicts.includes(b.id) || b.conflicts.includes(s.id)) && !seen.has(norm(b.text)) && !previous.some(p=>similarity(p.text||'',b.text)>0.9) && !selected.some(s=>similarity(s.text,b.text)>0.9)).sort((a,b)=>((b.automation?.taskId||'manual')===preferredGroup?1000:0)-((a.automation?.taskId||'manual')===preferredGroup?1000:0)+(b.status==='approved'?100:0)-(a.status==='approved'?100:0)+b.claims.length-a.claims.length || a.id.localeCompare(b.id));
    const b=choices[0];if(!b){missing.push(p.id);continue;}
    selected.push(b);seen.add(norm(b.text));
    paragraphs.push({id:p.id,text:b.text,claim_ids:b.claims.map(c=>c.id),refs:[...new Set(b.claims.map(c=>analysis.claims.find(a=>a.claim_id===c.id).knowledge_id))]});
  }
  return {ok:missing.length===0,provisional:selected.some(b=>b.status!=='approved'),reason:missing.length?'block-gap':null,missing,hook:selected.map(b=>b.hook).find(h=>h && signatures.get(h.claim_id)===h.claimSignature)||null,result:{paragraphs},blocks:selected.map((b,i)=>({id:b.id,version:b.version,paragraphId:paragraphs[i].id})),semanticReview:'approved-blocks-runtime-checks-required'};
}
// Deliberately opt-in. Candidates never enter the serving path without explicit review.
export async function candidateBlocks({clean,analysis,result,styleSignature,hook=null}){
  const out=[];
  for(const p of result.paragraphs){const slot=clean.chapter.paragraphs.find(s=>s.id===p.id);if(!slot?.role || slot.kind==='episode')continue;
    const claims=analysis.claims.filter(c=>(p.claim_ids||[]).includes(c.claim_id));if(!claims.length)continue;
    const references=await Promise.all(claims.map(async c=>({id:c.claim_id,signature:await claimSignature(c),conditionSignature:await conditionSignature(c)})));
    const id='b-'+(await digest({chapter:clean.chapter.id,role:slot.role,text:p.text,claims:references.map(({id,signature})=>({id,signature}))})).slice(0,32);
    out.push({id,formatVersion:2,chartSignature:await chartSignature(clean.sd),scope:generalConditionText(p.text)&&claims.every(c=>(c.traditional_rules||[]).some(r=>Object.keys(r.conditions||{}).length>=2))?'conditions':'exact',chapter:clean.chapter.id,role:slot.role,text:p.text,claims:references,excludes:[],conflicts:[],styleSignature,status:'candidate',version:1,updatedAt:new Date().toISOString(),review:{semantic:false,source:false,privacy:false,scenarios:false},...(hook?{hook}:{})});
  }return out;
}

export function mergeGenerated(clean,partial,generated){
 const locked=new Map((partial?.result?.paragraphs||[]).map(p=>[p.id,p]));
 const required=clean.chapter.paragraphs.filter(p=>!locked.has(p.id));
 if(!Array.isArray(generated?.paragraphs) || generated.paragraphs.length!==required.length || new Set(generated.paragraphs.map(p=>p.id)).size!==required.length || generated.paragraphs.some(p=>!required.some(r=>r.id===p.id)))throw Error('generated-slot-mismatch');
 const fresh=new Map(generated.paragraphs.map(p=>[p.id,p]));
 return {...generated,paragraphs:clean.chapter.paragraphs.map(p=>locked.get(p.id)||fresh.get(p.id))};
}
