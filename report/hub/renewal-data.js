/* Five-scene content in the existing onboarding draft/live store. */
(function(root){
'use strict';
var O=root.Onboard, cta={show:true,text:'내 운의 흐름 확인하기',to:'#/begin'};
var scenes=[
{id:'hook',title:'성공한 사람들은 말합니다.\n운이 좋았다고.',sub:'그런데 그 운은 정말 선택받은 소수에게만 찾아오는 걸까요?',body:['어쩌면 당신에게도 기회가 다가오고 있을지 모릅니다.','아직 알아채지 못했을 뿐.'],emphasis:'아래로 내려 만트라 알아보기',image:'/report/hub/quest/mirror.webp',cta:cta},
{id:'research',title:'성공에도 특정한 시기가 존재했습니다.',sub:'실제 연구가 발견한 성공의 시기',body:[],emphasis:'누군가의 전성기가 당신의 전성기와 같을 필요는 없습니다.',researchIds:['r-liu-2018','r-gollwitzer-2006'],detail:'이 연구들은 사주명리학의 예측력을 입증하지 않습니다.',image:'/report/hub/quest/paths.webp'},
{id:'prepare',title:'봄이 오기 전에 씨앗을 준비하고,\n폭풍이 오기 전에 대비합니다.',body:['기회가 찾아와도 준비되지 않았다면 놓칠 수 있습니다.','반대로 위험에 대비했다면 피해를 줄일 수도 있습니다.'],emphasis:'중요한 건 언제 움직이고, 언제 지켜야 하는지 판단하는 일입니다.'},
{id:'decode',title:'수천 년간 전해진, 운을 읽는 또 하나의 방식.',body:['동양 명리학은 태어난 연·월·일·시를 바탕으로 개인의 기질과 시간에 따른 변화를 해석해 온 전통 체계입니다.','만트라는 이 체계를 활용해 타고난 강점과 약점, 기회와 주의 시기를 분석합니다.','잘되는 시기가 있다면 왜 그런지. 조심해야 할 시기가 있다면 무엇을 주의해야 하는지.'],emphasis:'좋은 말만 해주는 사주는 필요 없습니다.',detail:'듣기 좋은 위로보다 필요한 해석을 전달합니다.',image:'/report/hub/quest/archive.webp'},
{id:'preview',title:'당신의 운을 미화하지 않습니다.',sub:'강점은 기회로, 약점은 대비책으로.',body:[],emphasis:'이제, 당신의 운을 해독할 차례입니다.',cta:cta}
].map(function(s){return Object.assign({enabled:true,sub:'',body:[],emphasis:'',detail:'',image:'',imageMobile:'',video:'',bg:'',overlay:0.65,character:false,guide:'female',dialogue:'',researchIds:[],cta:{show:false,text:'',to:'#/begin'}},s)});
var previews=['타고난 강점과 취약점','직업 적성과 재물 관리 성향','대운·세운에 따른 운의 흐름','기회 시기와 주의 시기','연애·결혼·인간관계 해석','현실적인 대응 방향과 개운법'].map(function(t,i){return {id:'sample-'+i,enabled:true,title:t,sample:['추진력은 강점입니다. 성급한 결정에는 점검이 필요합니다.','수입과 지출을 기록하고 선택의 기준을 세워 보세요.','시간에 따른 해석의 흐름을 살펴봅니다.','움직일 때와 점검할 때를 구분합니다.','관계에서 반복되는 성향을 돌아봅니다.','지금 실천할 수 있는 대응 방향을 정리합니다.'][i],description:'예시 리포트 · 개인 분석 결과가 아닙니다.',image:'',graph:i===2?[35,58,74,48,62]:[]};});
var DEFAULT={revision:2,enabled:true,scenes:scenes,previews:previews};
var study={id:'r-gollwitzer-2006',type:'research',kind:'study',status:'published',visible:true,group:'story',weight:1,title:'구체적인 행동 계획은 목표 달성에 도움이 될 수 있습니다.',hook:'기회를 기다리는 것보다 중요한 건 준비하는 일입니다.',body:['상황과 행동을 연결한 실행의도 계획이 목표 달성에 미치는 영향을 종합한 메타분석입니다.'],story:['언제, 어디서, 어떻게 행동할지 미리 정하는 계획을 분석했습니다.'],caveat:'목표 달성에 관한 연구이며, 사주명리학의 예측력을 입증한 연구가 아닙니다.',who:'Peter M. Gollwitzer · Paschal Sheeran',year:2006,source:{label:'Advances in Experimental Social Psychology 38, 69–119',doi:'10.1016/S0065-2601(06)38002-1',url:'https://doi.org/10.1016/S0065-2601(06)38002-1'},verification:{state:'verified',reviewedAt:'2026-10-13',basis:'출판사 ScienceDirect 및 Konstanz 대학 연구자 출판 목록에서 제목·저자·연도·DOI 확인'},visual:'steps'};
O.DEFAULTS.renewal=DEFAULT;
O.DEFAULTS.cases.push(study);
var old=O.merge;
O.merge=function(base,ov){
var out=old(base,ov), r=ov&&ov.renewal;
out.renewal=JSON.parse(JSON.stringify(r&&typeof r==='object'?r:DEFAULT));
if(!Array.isArray(out.renewal.scenes)||!out.renewal.scenes.length)out.renewal.scenes=JSON.parse(JSON.stringify(scenes));
if(!Array.isArray(out.renewal.previews))out.renewal.previews=JSON.parse(JSON.stringify(previews));
if(!r && ov && ov.cover){var h=out.renewal.scenes[0], c=ov.cover; ['title','sub'].forEach(function(k){if(c[k])h[k]=c[k]}); if(c.src)h.image=c.src;if(c.bgSrc)h.bg=c.bgSrc;if(c.button)h.cta.text=c.button;}
out.renewal.scenes=out.renewal.scenes.map(function(s){return Object.assign({},scenes.find(function(d){return d.id===s.id})||scenes[0],s)});
return out;
};
root.Renewal={DEFAULT:DEFAULT};
if(typeof module!=='undefined')module.exports=root.Renewal;
})(typeof window!=='undefined'?window:globalThis);
