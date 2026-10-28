/* 주역 점괘 결과(compose 의 출력) 런타임 검증 스키마. 의존성 없는 자체 검증기다(이 저장소에는 번들러·패키지가 없어 Ajv 를 쓰지 않는다).
   화면·PDF·무빙툰은 이 구조의 JSON 만 읽는다. validate(result) → { ok, errors[] }. 조건부 규칙:
   변효 0개 → transformed_hexagram=null, transformation_analysis.status='none' · 사주 없음 → saju_cross_analysis.status='no-saju'
   · action_plan 은 do 3개·avoid 2개 · direction 은 5종 중 하나 또는 null(답할 수 없을 때, 이때 conclusion.conditions 필요). */
(function(root){'use strict';
var DIRS=['실행 검토','준비 우선','현상 유지','재검토','신중한 접근'],CATS=['general','wealth','career','love'];
var TOP=['result_id','question','question_category','generated_at','hexagram','changing_lines','transformed_hexagram','interpretation_rule_version','content_version','conclusion','hexagram_explanation','situation_analysis','transformation_analysis','saju_cross_analysis','scenarios','action_plan','final_message'];
function validate(r){
 var e=[],isS=function(v){return typeof v==='string'&&v.length>0;},isA=function(v){return Array.isArray(v);},sa=function(v){return isA(v)&&v.every(function(x){return typeof x==='string'&&x;});};
 var need=function(cond,msg){if(!cond)e.push(msg);};
 if(!r||typeof r!=='object')return {ok:false,errors:['결과가 객체가 아닙니다']};
 TOP.forEach(function(k){if(!(k in r))e.push('필수 필드 없음: '+k);});
 if(e.length)return {ok:false,errors:e};
 need(isS(r.result_id),'result_id');need(typeof r.question==='string','question');need(CATS.indexOf(r.question_category)>=0,'question_category 값');need(!isNaN(Date.parse(r.generated_at)),'generated_at');
 need(isS(r.interpretation_rule_version)&&isS(r.content_version),'버전 필드');
 var h=r.hexagram;need(h&&h.num>=1&&h.num<=64&&isS(h.ko)&&isS(h.hanja)&&h.lines&&h.lines.length===6&&h.values&&h.values.length===6&&h.figure&&h.figure.length===6,'hexagram 구조');
 need(isA(r.changing_lines),'changing_lines 배열');
 if(isA(r.changing_lines)){r.changing_lines.forEach(function(c){need(c.position>=1&&c.position<=6&&(c.value===6||c.value===9),'changing_lines 항목');});
  if(r.changing_lines.length===0){need(r.transformed_hexagram===null,'변효 0개면 transformed_hexagram 은 null');need(r.transformation_analysis.status==='none','변효 0개면 transformation_analysis.status 는 none');need(r.transformation_analysis.statement==='변효 없음','변효 없음 문구');}
  else{need(r.transformed_hexagram&&r.transformed_hexagram.num>=1,'변효가 있으면 transformed_hexagram 필요');need(r.transformation_analysis.changing_count===r.changing_lines.length,'변효 개수 일치');need(r.transformation_analysis.rule&&isS(r.transformation_analysis.rule.id),'복수 변효 규칙 id');}}
 var c=r.conclusion;need(c&&c.question===r.question,'conclusion.question');
 need(c.direction===null||DIRS.indexOf(c.direction)>=0,'conclusion.direction 값');
 if(c.direction===null)need(isA(c.conditions)&&c.conditions.length>0||isS(c.note),'direction 이 null 이면 판단 조건 또는 사유 필요');
 else{need(isS(c.summary),'conclusion.summary');need(sa(c.conditions),'conclusion.conditions');}
 var x=r.hexagram_explanation;need(x&&x.number===r.hexagram.num&&sa(x.keywords),'hexagram_explanation');
 if(x.keywords.length)need(x.keywords.length===3,'키워드는 3개');
 var s=r.situation_analysis;need(s&&sa(s.favorable)&&sa(s.unfavorable)&&sa(s.judgment_errors)&&sa(s.improve_conditions),'situation_analysis 배열');
 var j=r.saju_cross_analysis;need(j&&(j.status==='ok'||j.status==='no-saju'),'saju_cross_analysis.status');
 if(j.status==='ok')need(sa(j.luck_context)&&sa(j.category_traits)&&sa(j.common)&&sa(j.divergent)&&isS(j.reference_judgment),'saju_cross_analysis 필드');
 var sc=r.scenarios;need(sc&&isS(sc.disclaimer),'scenarios.disclaimer');
 if(sc.favorable)need(sa(sc.favorable.conditions)&&sa(sc.favorable.actions)&&sa(sc.unfavorable.gaps)&&sa(sc.unfavorable.repeats),'scenarios 필드');
 var a=r.action_plan;need(a&&sa(a.do)&&sa(a.avoid)&&sa(a.check_before)&&sa(a.review_criteria),'action_plan 배열');
 if(c.direction!==null){need(a.do.length===3,'지금 해야 할 행동은 3개');need(a.avoid.length===2,'피해야 할 행동은 2개');}
 need(r.final_message&&(r.final_message.text===null||isS(r.final_message.text)),'final_message');
 need(isA(r.missing),'missing 배열');
 if(r.missing&&r.missing.length&&r.publishable)e.push('missing 이 있는데 publishable');
 return {ok:e.length===0,errors:e};
}
var api={validate:validate,DIRECTIONS:DIRS,CATEGORIES:CATS,TOP_LEVEL:TOP};
root.IchingResultSchema=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
