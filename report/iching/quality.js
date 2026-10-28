/* 주역 해석 자동 품질 검사. 문장 길이·키워드 수로 품질을 판정하지 않는다 — 규칙으로 잡을 수 있는 오류(계산값 불일치, 확정·확률 표현, 반말, 반복 문장,
   사주 사실 불일치)만 검사하고, 의미 일관성(괘사와의 충돌, 질문과의 관련성)은 관리자 샘플 검수 몫이다.
   check(result, ctx) → { errors[], warnings[] }.  ctx: { cast, saju } — 같은 입력값으로 결과를 대조한다. */
(function(root){'use strict';
var FORBID=[[/\d+(\.\d+)?\s*%/,'퍼센트(확률·수익률)'],[/(반드시|틀림없이|확실히|무조건|100\s*%)/,'확정 표현'],[/(수익률|승률|성공률|당첨)/,'확률·수익 표현'],[/\d{4}년\s*\d{1,2}월\s*\d{1,2}일|\d{1,2}월\s*\d{1,2}일/,'구체 날짜'],[/(행운의 날|길일|길한 날)/,'행운 날짜']];
var AVOID=['좋은 기운이 들어오고','새로운 변화의 흐름이 느껴','자신의 내면을 돌아보','우주의 기운','귀한 인연이 찾아올','긍정적인 마음으로 기다려'];
var JARGON=['비겁','식상','재성','관성','인성','용신','희신','기신','격국','십성','편관','정관','편재','정재','상관','식신','겁재','비견','편인','정인','신살','공망'];
var CASUAL=/(이다|한다|된다|있다|없다|했다|이었다|한다고|하자|해라|하라|이니라|이로다)\s*[.!]$/;
function strings(o,path,out,skip){
 if(typeof o==='string')out.push({p:path,t:o});
 else if(Array.isArray(o))o.forEach(function(v,i){strings(v,path+'['+i+']',out,skip);});
 else if(o&&typeof o==='object')Object.keys(o).forEach(function(k){if(skip.indexOf(k)<0)strings(o[k],path?path+'.'+k:k,out,skip);});
 return out;
}
var norm=function(s){return s.replace(/[\s.,!?'"()·:]/g,'');};
function check(r,ctx){
 ctx=ctx||{};var errors=[],warnings=[];
 // 사용자 문구만 모은다(원문·번역 인용·메타·사주 연도 설명은 제외)
 var SKIP_ORIG=['guaci_original','details','original','figure','missing','content_refs','rule','facts','values','generated_at','result_id','question','upper','lower'];
 var user=[];['conclusion','hexagram_explanation','situation_analysis','transformation_analysis','scenarios','action_plan','final_message'].forEach(function(k){strings(r[k],k,user,SKIP_ORIG.concat(['modern']));});
 var saju=[];if(r.saju_cross_analysis&&r.saju_cross_analysis.status==='ok')strings(r.saju_cross_analysis,'saju_cross_analysis',saju,['facts']);
 // 1) 확정·확률·날짜 표현 / 지양 표현 / 반말 / 전문 용어 (사주 섹션의 연도 표기는 날짜 검사에서 제외)
 user.concat(saju).forEach(function(s){
  FORBID.forEach(function(f){if(f[0].test(s.t)&&!(s.p.indexOf('saju_cross_analysis')===0&&f[1]==='구체 날짜'))errors.push(s.p+': '+f[1]+' — "'+s.t.slice(0,40)+'"');});
  AVOID.forEach(function(a){if(s.t.indexOf(a)>=0)errors.push(s.p+': 지양 표현 "'+a+'"');});
  s.t.split(/(?<=[.!?])\s+/).forEach(function(sen){if(CASUAL.test(sen.trim()))errors.push(s.p+': 존댓말이 아닙니다 — "'+sen.slice(0,40)+'"');});
  JARGON.forEach(function(j){if(s.t.indexOf(j)>=0)warnings.push(s.p+': 전문 용어 "'+j+'"');});
 });
 // 2) 같은 문장이 섹션 안팎에서 반복되는지(정규화 후 완전 일치, 짧은 항목은 제외)
 var seen={};user.concat(saju).forEach(function(s){if(s.t.length<14)return;s.t.split(/(?<=[.!?])\s+/).forEach(function(sen){var k=norm(sen);if(k.length<14)return;(seen[k]=seen[k]||[]).push(s.p);});});
 Object.keys(seen).forEach(function(k){if(seen[k].length>1)errors.push('같은 문장 반복: '+seen[k].join(' / '));});
 // 3) 계산값 대조: 본괘·변효·변괘가 입력 cast 와 같은지
 if(ctx.cast){var c=ctx.cast;
  if(r.hexagram.num!==c.hexagram.num||r.hexagram.lines.join('')!==c.hexagram.lines.join(''))errors.push('본괘가 계산값과 다릅니다');
  if(JSON.stringify(r.hexagram.values)!==JSON.stringify(c.values))errors.push('효 값이 계산값과 다릅니다');
  if(r.changing_lines.map(function(x){return x.position;}).join()!==c.changingLines.map(function(x){return x.position;}).join())errors.push('변효 위치가 계산값과 다릅니다');
  if((r.transformed_hexagram&&r.transformed_hexagram.num)!==(c.transformedHexagram&&c.transformedHexagram.num))errors.push('변괘가 계산값과 다릅니다');
  if(r.transformation_analysis.relation&&c.transformedHexagram&&r.transformation_analysis.relation.to.indexOf('('+c.transformedHexagram.num+')')<0)errors.push('본괘와 변괘가 뒤바뀌었습니다');
  (r.transformation_analysis.readings||[]).forEach(function(x){var okRef=(c.reading||[]).some(function(y){return y.kind===x.kind&&y.hexagram===x.hexagram&&y.role===x.role&&(y.line||0)===(x.position||0);});if(!okRef)errors.push('변효 해석 참조가 규칙 결과와 다릅니다');});
 }
 // 4) 사주 사실 대조
 if(ctx.saju&&r.saju_cross_analysis.status==='ok'){var f=r.saju_cross_analysis.facts,s=ctx.saju;
  if(f.dayMaster!==s.dayMaster.stem||f.band!==s.strength.band)errors.push('사주 일간·신강약이 입력과 다릅니다');
  var d=f.daewoon;if(d){var src=(s.daewoon||[]).filter(function(p){return p.ganzhi===d.ganzhi&&p.startYear===d.startYear&&p.endYear===d.endYear;})[0];if(!src)errors.push('대운 정보가 입력에 없는 값입니다');if(!(d.startYear<=s.nowYear&&s.nowYear<=d.endYear))errors.push('현재 대운이 현재 연도와 맞지 않습니다');}
 }
 // 5) 원문·번역 비어 있는 채로 노출되는지
 if(r.publishable){['guaci_original','guaci_modern'].forEach(function(k){if(!r.hexagram_explanation[k])errors.push('publishable 인데 '+k+' 없음');});}
 return {errors:errors,warnings:warnings};
}
// 문구 한 줄에 대한 규칙 검사(관리자 편집 저장 전 검사용): 확정·확률·날짜 표현, 지양 표현, 반말. 전문 용어는 경고로 돌려 준다.
function scanText(t){
 var errors=[],warnings=[];
 FORBID.forEach(function(f){if(f[0].test(t))errors.push(f[1]);});
 AVOID.forEach(function(a){if(t.indexOf(a)>=0)errors.push('지양 표현 "'+a+'"');});
 t.split(/(?<=[.!?])\s+/).forEach(function(sen){if(CASUAL.test(sen.trim()))errors.push('존댓말이 아님 "'+sen.slice(0,30)+'"');});
 JARGON.forEach(function(j){if(t.indexOf(j)>=0)warnings.push('전문 용어 "'+j+'"');});
 return {errors:errors,warnings:warnings};
}
var api={check:check,scanText:scanText};
root.IchingQuality=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
