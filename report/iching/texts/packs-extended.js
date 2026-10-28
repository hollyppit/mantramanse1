/* 괘별 데이터(packs-ext-*.js 의 IchingExt)와 방향×분야 은행(packs-banks.js)을 합쳐 IchingPacks[n] 을 만든다. 이미 손으로 쓴 샘플 괘(5·14·29)는 건드리지 않는다.
   분야 모듈 = 괘 고유(핵심 쟁점·결론·최종 한마디·판단 조건·강점·함정) + 은행(해야 할 행동·피할 행동·확인 조건·점검 기준·시나리오·유리/불리 조건).
   모든 결과는 draft 이며 compose/content 의 검수 게이트를 그대로 거친다. 이 파일은 계산하지 않고 문구를 조립만 한다. */
(function(root){'use strict';
var P=root.IchingPacks=root.IchingPacks||{},X=root.IchingExt||{},B=root.IchingBanks||{};
var DIR={'실':'실행 검토','준':'준비 우선','유':'현상 유지','재':'재검토','신':'신중한 접근'};
var SAMPLE_DIR={'준비 우선':5,'신중한 접근':29,'실행 검토':14};
var CATS=['general','wealth','career','love'],KEY={general:'g',wealth:'w',career:'c',love:'l'};
var HAND={5:1,14:1,29:1}; // 손으로 쓴 샘플
function fromPack(p){ // 샘플 분야 모듈을 은행 항목 모양(13칸)으로
 return [p.conditions.slice(0,2),p.favorable.slice(0,2),p.unfavorable.slice(0,2),[p.errors[0]],p.improve.slice(0,2),p.good.conditions,p.good.actions,p.bad.gaps,[p.bad.repeats[0]],p.do,p.avoid,p.check,p.review];
}
function variants(dir,cat){
 var v=((B[dir]||{})[cat]||[]).slice();
 if(SAMPLE_DIR[dir]&&P[SAMPLE_DIR[dir]]&&P[SAMPLE_DIR[dir]][cat])v.unshift(fromPack(P[SAMPLE_DIR[dir]][cat]));
 return v;
}
Object.keys(X).forEach(function(k){
 var n=+k,x=X[k];if(HAND[n])return;
 var pack={name:null,lines:{}};
 CATS.forEach(function(cat,i){
  var dir=DIR[x.d.charAt(i)],vs=variants(dir,cat),v=vs[n%vs.length],g=x[KEY[cat]];
  if(!v)return;
  pack[cat]={direction:dir,issue:g[0],summary:g[1],final:g[2],
   conditions:[g[3]].concat(v[0]),favorable:[x.a].concat(v[1]),unfavorable:v[2],errors:[x.t].concat(v[3]),improve:v[4],
   good:{conditions:v[5],actions:v[6]},bad:{gaps:v[7],repeats:v[8]},do:v[9],avoid:v[10],check:v[11],review:v[12]};
 });
 x.L.forEach(function(l,i){pack.lines[i+1]={meaning:l[0],caution:l[1],check:l[2]};});
 P[n]=pack;
});
})(typeof window!=='undefined'?window:globalThis);
