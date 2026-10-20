/* Existing Mantra assessments only. No AI calls, new astrology calculation, or success scores. */
(function(root){
'use strict';
var R=root.ReportV2=root.ReportV2||{};
var labels={opportunity:'새 일을 꺼내기 좋은 때',expansion:'해오던 일을 넓히기 좋은 때',harvest:'해온 일의 대가를 챙길 때',accumulation:'배워둔 실력을 단단히 만들 때',transition:'방법과 방향을 바꿔볼 때',defense:'생활과 약속을 지킬 때'};
var scenes={
 opportunity:{example:'예를 들어 혼자 만들어두던 작업물을 공개하거나, 관심 있던 회사에 지원서를 내는 식이에요. 아직 없는 성과를 약속하기보다 지금 보여줄 결과 하나를 꺼내세요.',risk:'새 제안이 늘어난다고 전부 받아들이면 시작만 많아져요. 이번에 실제로 끝낼 일 하나부터 고르세요.',practice:'보여줄 작업물 하나와 연락할 사람 한 명을 정하세요. 이번 달 안에 공개하거나 제안할 날짜를 달력에 적어두세요.'},
 expansion:{example:'예를 들어 이미 잘 팔리는 상품을 한 종류 더 내거나, 익숙한 업무에서 담당 고객을 늘리는 식이에요. 처음 해보는 일을 한꺼번에 벌이기보다 해본 일부터 넓히세요.',risk:'일을 더 받으면 매출보다 일정과 비용이 먼저 늘어요. 늦어지는 주문까지 혼자 떠안지 않도록 맡을 수 있는 양부터 정하세요.',practice:'더 맡고 싶은 일 하나의 작업 시간과 비용을 적어보세요. 지금 일정에서 실제로 더 받을 수 있는 양만 제안하세요.'},
 harvest:{example:'예를 들어 쌓아둔 작업물을 모아 연봉 협상에 쓰거나, 오래 해온 거래의 가격과 계약을 다시 정하는 식이에요. 잘했다는 말만 듣고 끝내지 말고 받을 대가도 이야기하세요.',risk:'평가를 잘 받으려고 새 일을 계속 맡으면 정작 끝낸 일의 대가를 놓쳐요. 받을 돈과 정산 날짜부터 확인하세요.',practice:'최근 끝낸 일 세 가지를 한 장에 정리하세요. 그 결과를 보여줄 자리와 보상에 대해 이야기할 날짜를 잡으세요.'},
 accumulation:{example:'예를 들어 현장에서 자주 막히던 일을 교육으로 익히고, 배운 방법을 다음 업무에 바로 써보는 식이에요. 한꺼번에 크게 벌기보다 나를 찾게 만드는 실력을 쌓는 때예요.',risk:'공부만 늘리고 실제로 써보지 않으면 준비가 길어져요. 자격증 이름을 하나 더 모으기보다 배운 것으로 끝낼 일을 정하세요.',practice:'배우고 싶은 것 하나를 고르고 이번 주 업무나 취미에 한 번 써보세요. 무엇이 쉬워졌고 어디에서 다시 막혔는지 짧게 남기세요.'}
};
function fit(p){var n=p.assessment&&p.assessment.fitScore;return typeof n==='number'&&Number.isFinite(n)?n:({순풍:2,보통:1,주의:-1,부담:-2}[p.condition]||0);}
function eligible(p){return !!scenes[p.season]&&p.startAge<80&&['순풍','보통'].includes(p.condition)&&!(p.assessment&&p.assessment.defense);}
function reason(p,sd){
 var rs=p.assessment&&p.assessment.reasons||[],positive=rs.filter(function(t){return /→ 보완$/.test(t);}),parts=[];
 if(positive.some(function(t){return /억부/.test(t);})){
  parts.push(sd.strength&&sd.strength.band==='신약'?'원래 사주는 일과 책임의 무게가 큰 편이라 혼자 버티기 벅찰 때가 있어요. 이 시기에는 나를 받쳐 주는 힘이 보충돼서 숨통이 트이는 구간이에요.':sd.strength&&sd.strength.band==='신강'?'원래 사주에는 내 뜻대로 밀고 나가는 힘이 이미 충분해요. 이 시기에는 그 힘이 일과 결과로 이어지도록 도와주는 흐름이 들어와요.':'원래 사주가 한쪽으로만 쏠리지 않도록, 이 시기가 균형을 잡아 줘요.');
 }
 var climate=positive.find(function(t){return /조후/.test(t);});
 if(climate)parts.push(/더운 원국/.test(climate)?'사주를 자동차에 빗대면 뜨겁게 달아오른 엔진에 냉각수가 들어오는 때예요. 원래 사주에 몰린 열기를 이 시기가 가라앉혀 줘요.':/찬 원국/.test(climate)?'사주를 자동차에 빗대면 차갑게 식은 엔진이 예열되는 때예요. 원래 사주가 차가운 쪽이라, 이 시기가 시동이 걸리게 데워 줘요.':'원래 사주의 차고 더운 쪽을 이 시기가 고르게 맞춰 주는 때예요.');
 if(!parts.length)parts.push('이 시기의 흐름을 원래 사주와 견주어 보면, 일을 무리하게 벌이는 부담보다 내 힘을 쓰기 좋은 쪽으로 계산됐어요.');
 return parts.slice(0,2).join(' ')+' 그래서 '+labels[p.season]+'로 읽어요.';
}
function build(sd,name){
 sd=sd||{};
 var periods=(sd.daewoon||[]).filter(function(p){return Number.isFinite(p.startYear)&&Number.isFinite(p.endYear)&&Number.isFinite(p.startAge)&&typeof p.season==='string';}),now=sd.nowYear||new Date().getFullYear(),valid=periods.filter(eligible),remaining=valid.filter(function(p){return p.endYear>=now;}),past=remaining.length===0&&valid.length>0;
 var candidates=(past?valid:remaining).slice().sort(function(a,b){return fit(b)-fit(a)||a.startYear-b.startYear;}),picked=candidates[0]||null,nm=String(name||'').trim().replace(/님$/,'')||'사용자';
 var current=picked&&picked.startYear<=now&&picked.endYear>=now,when=picked?(current?'지금부터 '+picked.endYear+'년까지':picked.startYear+'~'+picked.endYear+'년'):'',kind=picked&&scenes[picked.season];
 var title=picked?nm+'님'+(past?'이 지나온 흐름에서 힘을 받았던 구간은 ':'이 앞으로 힘을 쓰기 좋은 때는 ')+when+(current?'예요. ':'이에요. ')+labels[picked.season]+'에 해당해요.':nm+'님은 지금 계산된 대운에서 무리하게 일을 넓히기보다 생활을 다지고 준비하는 쪽을 먼저 살펴보세요.';
 var reality=picked?reason(picked,sd)+'\n\n'+(past?'이 구간은 이미 지난 시기예요. 당시 배운 방법과 남겨둔 결과 중 지금 다시 써볼 것을 골라보세요.':kind.example):periods.length?'대운표에서 지금 지나는 시기를 먼저 보세요. 일정이나 지출이 흔들리면 새 일을 늘리기 전에 이미 맡은 일부터 정리하세요.':'대운 계산값이 없어 구체적인 연도를 고르지 않았어요. 출생 정보를 확인한 뒤 대운표에서 시기를 살펴보세요.';
 var later=current?remaining.filter(function(p){return p.startYear>now;}).sort(function(a,b){return a.startYear-b.startYear;})[0]:null;
 var strength=later?'지금 배운 방법이나 완성한 결과는 '+later.startYear+'~'+later.endYear+'년에 다시 써볼 밑바탕이 돼요. 그때는 '+labels[later.season]+'에 해당하니, 준비한 것을 어떻게 써볼지 함께 생각해보세요.':picked?'이 시기의 장점은 '+({opportunity:'새로 해볼 일을 실제로 꺼내는 데',expansion:'이미 해본 일을 더 넓게 쓰는 데',harvest:'끝낸 일을 평가와 보상으로 연결하는 데',accumulation:'다음에도 써먹을 실력을 남기는 데'}[picked.season])+' 있어요. '+({opportunity:'먼저 제안한 작은 일이 다음 만남으로 이어지도록, 답을 받은 뒤 후속 약속도 챙기세요.',expansion:'잘되는 방법을 다른 일에도 반복할 수 있도록, 순서와 걸린 시간을 남겨두세요.',harvest:'만들어낸 결과가 기록에 남도록, 평가를 받은 내용과 실제 보상을 따로 확인하세요.',accumulation:'한 번 익힌 방법을 다음 작업에도 써보면서, 내 손에 익히는 데 시간을 쓰세요.'}[picked.season]):'지금 자주 막히는 일 하나를 익혀두면 다음에 같은 부탁을 받을 때 처음부터 헤매지 않아도 돼요.';
 var core={title:title,reality:reality,strength:strength,risk:kind?kind.risk:'좋은 때를 기다린다는 이유로 필요한 휴식과 생활 정리를 미루지 마세요.',reinforce:picked?'이 시기를 전성기로 살리려면 달력의 날짜보다 내가 끝낼 일을 먼저 정해야 해요. '+(past?'예전에 잘됐던 방법을 지금 생활에 맞게 작게 다시 써보세요.':'아래 행동을 실제 일정 하나로 옮겨보세요.'):'생활비와 이미 잡힌 일정을 확인하고, 새로 맡을 수 있는 일의 양을 정해두세요.',practice:kind?kind.practice:'이번 주에 가장 버거운 일 하나를 적고, 줄이거나 도움을 부탁할 부분을 정하세요.',why:'만트라 만세력의 기존 대운 계산값을 사용합니다. 80세 미만 시작 구간 중 방어 신호가 없고 적합 상태가 주의·부담이 아닌 기회·확장·수확·축적 구간을 대상으로, 현재 또는 미래 구간의 기존 fitScore가 높은 순서로 고릅니다. 동점은 이른 구간을 우선합니다. 미래·현재 후보가 없으면 과거라는 표시와 함께 과거 구간을 보여줍니다. 새 점수나 성공 확률을 만들지 않습니다.'+(picked?'\n선정: '+picked.ganzhi+' · '+picked.startYear+'~'+picked.endYear+' · '+picked.condition+' · 기존 적합값 '+fit(picked)+'\n'+(picked.assessment&&picked.assessment.reasons||[]).join('\n'):'')+'\n실제 성취가 보장되는 날짜는 아니며 출생시각과 계산 기준에 따라 구간이 달라집니다.'};
 return {id:'timeline_self_peak',base:'timeline_self_peak',title:'내 인생의 전성기는 언제?',kind:'life',editorialTopicId:'self',aiEnabled:false,readingSupplementary:true,readingDeferred:false,readingProvider:'local-engine-luck',readingCore:core,readingParagraphs:Object.keys(core).map(function(k){return {role:k,text:core[k]};}),readingVisualData:{name:nm,peakPeriods:periods,peakLabels:labels,peakSelected:picked&&picked.startYear},scenes:R.ReadingFlow?R.ReadingFlow.scenes(core,'timeline_self_peak'):[]};
}
function add(rep,sd,name){if(!rep||!sd||rep.chapters.some(function(c){return c.id==='timeline_self_peak';}))return rep;var i=rep.chapters.findIndex(function(c){return c.editorialContractId==='timeline_self_21';});if(i<0)i=rep.chapters.findIndex(function(c){return c.editorialTopicId==='self';});if(i<0)return rep;var c=build(sd,name);c.act=rep.chapters[i].act;rep.chapters.splice(i+1,0,c);rep.chapters.forEach(function(c,j){c.no=j+1;});return rep;}
R.PeakReading={build:build,add:add,eligible:eligible,reason:reason};
})(typeof window!=='undefined'?window:globalThis);
