import {specificity} from './_reading-composition-policy.js';
// Administrator-only diagnostics: distinguish eligibility from the passage actually composed.
import {deriveFacts,evalConds,COND_FIELDS} from './_ik.js';
import {validatePassages,selectPassages} from './_reviewed-library.js';
export const conditionFields=Object.fromEntries(Object.entries(COND_FIELDS).map(([key,v])=>[key,{label:v[0],type:v[2]}]));
export function auditPassages(passages,contract,analysis,sd,composed){
 const facts=deriveFacts(sd),claims=new Map(analysis.claims.map(c=>[c.knowledge_id,c]));
 const eligible=new Set(selectPassages(passages,contract,analysis,sd).map(p=>p.id));
 const used=new Set([...(composed.blocks||[]).map(b=>b.id),...(composed.result?.paragraphs||[]).flatMap(p=>(p.components||[]).map(c=>c.id))]);
 const items=analysis.claims.map(c=>({id:c.knowledge_id,status:'published',reviewed:true}));
 return passages.map(p=>{const when=evalConds(p.when||{},facts),unless=evalConds(p.unless||{},facts),excluded=Object.keys(p.unless||{}).length>0&&(unless.match||unless.missing.length>0),missingRules=(p.ruleIds||[]).filter(id=>!claims.has(id)),issues=validatePassages([p],contract,items),reason=[];
 if(!when.match)reason.push('적용 조건 불충족');if(when.missing.length)reason.push('적용 계산값 없음: '+when.missing.join(', '));if(excluded)reason.push(unless.missing.length?'제외 조건 계산값 없음: 적용 보류':'제외 조건 충족');if(missingRules.length)reason.push('미적용·미검증 근거: '+missingRules.join(', '));if(issues.length)reason.push(...issues.map(i=>i.code));
 if(eligible.has(p.id)&&!used.has(p.id))reason.push('조건은 맞지만 역할별 우선순위 또는 중복 조언 제한으로 미사용');
 reason.push(...(composed.selectionTrace||[]).filter(t=>t.id===p.id).map(t=>t.code+': '+t.other));
 return {specificity:specificity(p),composition:p.composition||null,id:p.id,role:p.role,kind:p.kind,status:used.has(p.id)?'applied':eligible.has(p.id)?'eligible':'blocked',reason,when:when.rows,unless:Object.keys(p.unless||{}).length?unless.rows:[],missing:[...when.missing,...unless.missing],basis:p.kind==='guide'?'계산 조건별 참고 해설 · 원문 증거 아님':p.kind==='fiction'?'창작 설정':p.kind==='general'?'일반 실천 점검':'검증된 원문 근거 연결',rules:(p.ruleIds||[]).map(id=>{const c=claims.get(id);return {id,matched:!!c,version:c?.knowledge_version??null,principles:c?.traditional_rules||[],evidence:c?.evidence||[]};})};});
}
