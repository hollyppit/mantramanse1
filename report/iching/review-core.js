/* 주역 콘텐츠 검수·게시 코어(순수 함수). 서버 API(functions/api/iching-review.js)·관리자 화면·테스트가 같은 규칙을 쓴다. 저장·네트워크·AI 호출 없음.
   항목 상태: missing(없음) · source-imported(원문 가져옴, 대조 전) · draft(초안) · reviewed(관리자 승인) · rejected(반려) · stale(승인 뒤 내용이 바뀜, 재검수 필요).
   게시(release)는 별도의 불변 스냅샷이다: 승인된 항목의 "내용 해시"를 묶어 버전을 올린다. 사용자 화면은 최신 게시본에 같은 해시로 들어 있는 문구만 본다.
   롤백은 이전 게시본의 항목 목록으로 새 게시 버전을 만드는 것(이력은 지우지 않는다).
   편집은 항상 초안으로 되돌리고(승인 무효), 문구 규칙(확정·확률·날짜·반말·지양 표현)을 어기면 저장을 막는다. */
(function(root){'use strict';
var K=function(){return root.IchingContent;},Q=function(){return root.IchingQuality;},HX=function(){return root.IchingHexagrams;};
var DIRS=['실행 검토','준비 우선','현상 유지','재검토','신중한 접근'];
var TYPE_KO={classics:'원문(괘사·단전·효사)',modern:'현대어·핵심 의미','pack':'분야 해석','pack-line':'변효 해석'};
function info(key){var k=K().parseKey(key);if(!k)return null;var h=HX().byNum(k.num);
 var label=k.type==='classics'?TYPE_KO.classics:k.type==='modern'?TYPE_KO.modern:k.type==='pack'?K().CAT_KO[k.cat]+' 분야 해석':['초','이','삼','사','오','상'][k.pos-1]+'효 해석';
 return {key:key,type:k.type,num:k.num,cat:k.cat||null,pos:k.pos||null,hex:h?h.ko+'('+h.hanja+')':'',label:label};}
function isS(v){return typeof v==='string'&&v.trim().length>0;}
function sa(v,min,max){return Array.isArray(v)&&v.length>=min&&(max==null||v.length<=max)&&v.every(isS);}
function strings(o,out){if(typeof o==='string')out.push(o);else if(Array.isArray(o))o.forEach(function(x){strings(x,out);});else if(o&&typeof o==='object')Object.keys(o).forEach(function(k){strings(o[k],out);});return out;}
// 구조 검사 + (원문 제외) 문구 규칙 검사. 오류가 있으면 저장·승인이 막힌다. 반환: { errors[], warnings[] }
function validateContent(key,c){
 var e=[],w=[],k=K().parseKey(key);if(!k)return {errors:['알 수 없는 항목 키'],warnings:[]};
 if(!c||typeof c!=='object')return {errors:['내용이 객체가 아닙니다'],warnings:[]};
 if(k.type==='classics'){
  if(!isS(c.guaci)||!isS(c.tuan)||!isS(c.daexiang))e.push('괘사·단전·대상전은 비워 둘 수 없습니다');
  if(!Array.isArray(c.lines)||c.lines.length!==6||!c.lines.every(function(l,i){return l&&l.position===i+1&&isS(l.label)&&isS(l.yaoci)&&isS(l.xiaoxiang);}))e.push('효사는 6개(위치 1~6, 이름·효사·소상 필수)여야 합니다');
  if(k.num<=2&&!(c.yong&&isS(c.yong.label)&&isS(c.yong.yaoci)))e.push('건·곤은 용구·용육이 필요합니다');
  return {errors:e,warnings:w};
 }
 if(k.type==='modern'){
  if(!sa(c.kw,3,3))e.push('키워드는 3개여야 합니다');
  if(!isS(c.guaci)||!isS(c.core))e.push('괘사 현대어와 핵심 의미는 필수입니다');
  if(!sa(c.lines,6,6))e.push('효사 현대어는 6개여야 합니다');
  if(k.num<=2&&!isS(c.yong))e.push('건·곤은 용구·용육 현대어가 필요합니다');
 }else if(k.type==='pack'){
  if(DIRS.indexOf(c.direction)<0)e.push('판단 방향은 5가지 중 하나여야 합니다');
  ['issue','summary','final'].forEach(function(f){if(!isS(c[f]))e.push(f+' 필수');});
  [['conditions',2,6],['favorable',1,5],['unfavorable',1,5],['errors',1,5],['improve',1,5],['check',1,5],['review',1,5]].forEach(function(r){if(!sa(c[r[0]],r[1],r[2]))e.push(r[0]+' 항목 수 오류');});
  if(!sa(c['do'],3,3))e.push('해야 할 행동은 3개여야 합니다');
  if(!sa(c.avoid,2,2))e.push('피해야 할 행동은 2개여야 합니다');
  if(!c.good||!sa(c.good.conditions,1,5)||!sa(c.good.actions,1,5)||!c.bad||!sa(c.bad.gaps,1,5)||!sa(c.bad.repeats,1,5))e.push('시나리오(유리·불리) 항목 오류');
 }else{
  if(!isS(c.meaning)||!isS(c.caution)||!isS(c.check))e.push('변효 의미·주의·확인 조건은 모두 필요합니다');
 }
 if(!e.length){var all=strings(c,[]),seen={};all.forEach(function(t){var r=Q().scanText(t);r.errors.forEach(function(x){e.push('"'+t.slice(0,24)+'…" — '+x);});r.warnings.forEach(function(x){if(!seen[x]){seen[x]=1;w.push(x);}});});
  // 한 항목 안에서 같은 문장이 반복되면 막는다
  var norm={};all.forEach(function(t){t.split(/(?<=[.!?])\s+/).forEach(function(s){var n=s.replace(/[\s.,!?'"()·:]/g,'');if(n.length<14)return;if(norm[n])e.push('같은 문장 반복 — "'+s.slice(0,24)+'…"');norm[n]=1;});});}
 return {errors:e,warnings:w};
}
function emptyState(){return {version:0,items:{},updatedAt:null};}
// 상태 전환 규칙. approve 는 draft·stale·source-imported 에서만, reject 는 reviewed 가 아닌 항목도 가능, reset 은 어디서나 초안으로.
function applyReview(state,req,ctx){
 var next={version:state.version,items:Object.assign({},state.items),updatedAt:state.updatedAt},changed=[],errors=[];
 var act=req.action,keys=Array.isArray(req.keys)?req.keys.slice(0,1000):[];
 if(['approve','reject','reset'].indexOf(act)<0)return {state:state,changed:[],errors:[{key:null,reason:'알 수 없는 작업'}]};
 if(!keys.length)return {state:state,changed:[],errors:[{key:null,reason:'대상 항목이 없습니다'}]};
 if(act==='reject'&&!isS(req.note))return {state:state,changed:[],errors:[{key:null,reason:'반려 사유를 적어 주세요'}]};
 var Kc=K();Kc.setReviewState(state.items);
 keys.forEach(function(key){
  if(!info(key)||!Kc.exists(key)){errors.push({key:key,reason:'없는 항목'});return;}
  var from=Kc.status(key),h=Kc.currentHash(key);
  if(act==='approve'){
   if(from==='reviewed'){return;}
   if(from==='rejected'){errors.push({key:key,reason:'반려된 항목은 수정하거나 되돌린 뒤 승인할 수 있습니다'});return;}
   var v=validateContent(key,Kc.effective(key));if(v.errors.length){errors.push({key:key,reason:'규칙 위반: '+v.errors[0]});return;}
   next.items[key]={status:'reviewed',contentHash:h,by:ctx.by,at:ctx.now,note:req.note||''};changed.push({key:key,from:from,to:'reviewed'});
  }else if(act==='reject'){
   if(from==='rejected')return;
   next.items[key]={status:'rejected',contentHash:h,by:ctx.by,at:ctx.now,note:req.note};changed.push({key:key,from:from,to:'rejected'});
  }else{
   if(from==='draft'||from==='source-imported'){return;}
   next.items[key]={status:'draft',contentHash:h,by:ctx.by,at:ctx.now,note:req.note||''};changed.push({key:key,from:from,to:'draft'});
  }
 });
 if(changed.length){next.version=state.version+1;next.updatedAt=ctx.now;}
 return {state:next,changed:changed,errors:errors};
}
// 문구 수정: 규칙 검사를 통과해야 저장되고, 승인 상태는 초안으로 돌아간다(해시가 바뀌므로 이전 게시본에서도 자동으로 빠진다).
function applyEdit(store,key,content,ctx){
 var Kc=K();if(!info(key)||!Kc.builtin(key)&&!Kc.effective(key))return {errors:[{key:key,reason:'없는 항목'}]};
 var v=validateContent(key,content);if(v.errors.length)return {errors:v.errors.map(function(r){return {key:key,reason:r};}),warnings:v.warnings};
 var base=Kc.builtin(key),baseHash=base===undefined?null:Kc.hash(Kc.canon(base)),overrides=Object.assign({},store.overrides);
 overrides[key]={content:content,by:ctx.by,at:ctx.now,baseHash:baseHash,note:ctx.note||''};
 var state={version:store.state.version+1,items:Object.assign({},store.state.items),updatedAt:ctx.now};
 state.items[key]={status:'draft',contentHash:Kc.hash(Kc.canon(content)),by:ctx.by,at:ctx.now,note:'수정됨'+(ctx.note?': '+ctx.note:'')};
 return {overrides:overrides,state:state,errors:[],warnings:v.warnings};
}
function applyRevert(store,key,ctx){
 if(!store.overrides[key])return {errors:[{key:key,reason:'수정본이 없습니다'}]};
 var overrides=Object.assign({},store.overrides);delete overrides[key];
 var state={version:store.state.version+1,items:Object.assign({},store.state.items),updatedAt:ctx.now};
 delete state.items[key];
 return {overrides:overrides,state:state,errors:[]};
}
function hydrate(store){var Kc=K(),ov={};Object.keys(store.overrides||{}).forEach(function(k){ov[k]=store.overrides[k].content;});Kc.setOverrides(ov);Kc.setReviewState((store.state||emptyState()).items);Kc.setRelease(store.release||{version:0,items:{}});} // 서버는 항상 게시본 기준: 게시본이 없으면 빈 게시본(아무것도 노출되지 않음)
// 게시: 승인(reviewed)이며 내용 해시가 그대로인 항목만 묶는다. 규칙 위반으로 빠진 항목은 skipped 에 이유를 남긴다.
function buildRelease(state,prev,ctx){
 var Kc=K();Kc.setReviewState(state.items);var items={},skipped=[];
 Object.keys(state.items).forEach(function(key){var it=state.items[key];if(it.status!=='reviewed')return;
  if(!Kc.exists(key)){skipped.push({key:key,reason:'없는 항목'});return;}
  if(Kc.status(key)==='stale'){skipped.push({key:key,reason:'승인 뒤 내용이 바뀜'});return;}
  var v=validateContent(key,Kc.effective(key));if(v.errors.length){skipped.push({key:key,reason:'규칙 위반: '+v.errors[0]});return;}
  items[key]=Kc.currentHash(key);});
 return {release:{version:(prev?prev.version:0)+1,items:items,count:Object.keys(items).length,createdAt:ctx.now,by:ctx.by,note:ctx.note||'',reviewVersion:state.version,restoredFrom:null},skipped:skipped};
}
function rollbackRelease(prev,target,ctx){
 return {version:(prev?prev.version:0)+1,items:Object.assign({},target.items),count:Object.keys(target.items).length,createdAt:ctx.now,by:ctx.by,note:ctx.note||'롤백',reviewVersion:target.reviewVersion||null,restoredFrom:target.version};
}
function diffRelease(prev,next){var p=(prev&&prev.items)||{},n=next.items,added=[],removed=[],changed=[];
 Object.keys(n).forEach(function(k){if(!(k in p))added.push(k);else if(p[k]!==n[k])changed.push(k);});Object.keys(p).forEach(function(k){if(!(k in n))removed.push(k);});
 return {added:added,removed:removed,changed:changed};}
// 서비스 개방 점검: 모든 괘의 원문·현대어, 선택한 분야의 해석 모듈과 효 6개가 게시본에 있어야 한다(변효에 따라 어느 괘가 쓰일지 모르므로 부분 개방은 허용하지 않는다).
function readiness(release,scope){
 var Kc=K(),cats=(scope&&scope.categories)||Kc.CATEGORIES,missing=[],items=(release&&release.items)||{};
 var ok=function(key){return !!items[key]&&items[key]===Kc.currentHash(key);};
 for(var n=1;n<=64;n++){['classics:'+n,'modern:'+n].forEach(function(k){if(!ok(k))missing.push(k);});
  cats.forEach(function(c){var k='pack:'+n+':'+c;if(!ok(k))missing.push(k);});
  if(cats.length)for(var l=1;l<=6;l++){var kl='pack:'+n+':line:'+l;if(!ok(kl))missing.push(kl);}}
 return {ready:missing.length===0,missing:missing.length,sample:missing.slice(0,20),categories:cats};
}
function summary(state,release){
 var Kc=K();Kc.setReviewState(state.items);var counts={},byType={};
 Kc.allKeys().forEach(function(key){var s=Kc.status(key),t=Kc.parseKey(key).type;counts[s]=(counts[s]||0)+1;(byType[t]=byType[t]||{})[s]=((byType[t]||{})[s]||0)+1;});
 var released=0;Kc.allKeys().forEach(function(key){if(release&&release.items&&release.items[key]===Kc.currentHash(key))released++;});
 return {total:Kc.allKeys().length,counts:counts,byType:byType,released:released,releaseVersion:release?release.version:0,reviewVersion:state.version};
}
function logEntry(seq,action,keys,ctx,extra){return Object.assign({seq:seq,at:ctx.now,by:ctx.by,action:action,keys:keys.slice(0,1000),keyCount:keys.length,note:ctx.note||''},extra||{});}
var api={DIRECTIONS:DIRS,info:info,validateContent:validateContent,emptyState:emptyState,applyReview:applyReview,applyEdit:applyEdit,applyRevert:applyRevert,hydrate:hydrate,buildRelease:buildRelease,rollbackRelease:rollbackRelease,diffRelease:diffRelease,readiness:readiness,summary:summary,logEntry:logEntry};
root.IchingReview=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
