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
// 그래프(reading-text.js rankedTiming, '인생' 흐름)와 같은 점수·같은 '지금' 기준으로 고른다. 그래프 순위와 풀이가 어긋나지 않게.
function scoreOf(p){var T=R.ReadingText;return T&&T.timingScore?T.timingScore(p,'life'):Math.round(Math.max(5,Math.min(99,50+Math.max(-30,Math.min(40,fit(p)))*0.9)));}
function tierName(n){var T=R.ReadingText;return T&&T.tierOf?T.tierOf(n).n:(n>=80?'최고':n>=65?'좋음':n>=45?'무난':n>=35?'주의':'부담');}
function curIndex(rows,sd){var T=R.ReadingText,cd=sd.currentDaewoon;if(cd){var k=rows.indexOf(cd);if(k<0)k=rows.findIndex(function(p){return p.startDate&&p.startDate===cd.startDate;});if(k>=0)return k;}return T&&T.currentIndex?T.currentIndex(rows,sd.nowYear||new Date().getFullYear()):-1;}
function ageOf(p){var a=Math.floor(p.startAge);return a+'~'+(a+10)+'세';}
var ORD=['첫째','둘째','셋째'];
var EDGE={opportunity:'새로 해볼 일을 실제로 꺼내는 데',expansion:'이미 해본 일을 더 넓게 쓰는 데',harvest:'끝낸 일을 평가와 보상으로 연결하는 데',accumulation:'다음에도 써먹을 실력을 남기는 데',transition:'방법과 방향을 바꿔 새 판을 짜는 데',defense:'흔들리지 않게 기반을 지키는 데'};
var EDGE_DO={opportunity:'먼저 제안한 작은 일이 다음 만남으로 이어지도록, 답을 받은 뒤 후속 약속도 챙기세요.',expansion:'잘되는 방법을 다른 일에도 반복할 수 있도록, 순서와 걸린 시간을 남겨두세요.',harvest:'만들어낸 결과가 기록에 남도록, 평가를 받은 내용과 실제 보상을 따로 확인하세요.',accumulation:'한 번 익힌 방법을 다음 작업에도 써보면서, 내 손에 익히는 데 시간을 쓰세요.',transition:'바꾸고 싶은 것 하나를 정하고, 바꾼 뒤 무엇이 나아졌는지 기록해 두세요.',defense:'고정비와 이미 맡은 일을 먼저 정리해서, 새 기회가 와도 받을 여유를 남겨 두세요.'};
function build(sd,name){
 sd=sd||{};
 var periods=(sd.daewoon||[]).filter(function(p){return Number.isFinite(p.startYear)&&Number.isFinite(p.endYear)&&Number.isFinite(p.startAge)&&typeof p.season==='string';}),now=sd.nowYear||new Date().getFullYear(),nm=String(name||'').trim().replace(/님$/,'')||'사용자';
 var rows=periods.filter(function(p){return p.startAge<90;}),ci=curIndex(rows,sd);
 var scored=rows.map(function(p,i){return {p:p,i:i,n:scoreOf(p),cur:i===ci,past:ci>=0?i<ci:p.endYear<now};});
 var shift=sd.daewoonShift,ending=shift&&shift.phase==='ending';
 // 교운기라 지금 대운이 1년 안에 끝나면 '앞으로의 시기'에서 뺀다(그래프 순위도 같은 기준).
 var ok=function(x){return !(['주의','부담'].indexOf(x.p.condition)>=0)&&!(x.p.assessment&&x.p.assessment.defense);};
 var ahead=scored.filter(function(x){return !x.past&&x.p.startAge<80&&!(x.cur&&ending)&&ok(x);}),past=!ahead.length&&scored.length>0,pool=(past?scored.filter(ok):ahead).slice().sort(function(a,b){return b.n-a.n||a.i-b.i;});
 var picks=pool.filter(function(x){return x.n>=65;}).slice(0,3);if(picks.length<2)picks=pool.filter(function(x){return x.n>=45;}).slice(0,Math.max(2,picks.length));
 var top=picks[0]||null,chron=picks.slice().sort(function(a,b){return a.i-b.i;}),curX=scored.filter(function(x){return x.cur;})[0]||null,G=root.MantraLuckReading&&root.MantraLuckReading.gods||{};
 var eun=function(w){var c=w.charCodeAt(w.length-1)-0xAC00;return w+(c>=0&&c%28?'은':'는');};
 var core0=function(p){return reason(p,sd).replace(/ 그래서 [^.]*로 읽어요\.$/,'');};
 var when=function(x){return x.cur?'지금부터 '+x.p.endYear+'년까지':x.p.startYear+'~'+x.p.endYear+'년';};
 var title=!top?nm+'님은 지금 계산된 대운에서 무리하게 일을 넓히기보다 생활을 다지고 준비하는 쪽을 먼저 살펴보세요.':past?nm+'님이 지나온 흐름에서 힘을 가장 크게 받았던 때는 '+when(top)+'('+ageOf(top.p)+')였어요.':picks.length>1?nm+'님 인생에서 힘이 크게 실리는 때는 '+picks.length+'번이에요. 그중 가장 강한 때는 '+when(top)+'('+ageOf(top.p)+')예요.':nm+'님이 앞으로 힘을 쓰기 좋은 때는 '+when(top)+'('+ageOf(top.p)+')예요. '+labels[top.p.season]+'에 해당해요.';
 var paras=chron.map(function(x,k){var g=G[x.p.stemTG],rc=core0(x.p),same=chron.slice(0,k).some(function(y){return core0(y.p)===rc;});return (chron.length>1?ORD[k]+', ':'')+when(x)+'('+ageOf(x.p)+', '+x.p.ganzhi+' 대운)은 그래프 '+x.n+'점으로 \''+tierName(x.n)+'\' 구간이에요'+(x===top&&chron.length>1?'(가장 높아요)':'')+'. '+(g?'\''+x.p.stemTG+'\'의 흐름이 들어와 '+g[0].replace(/시기예요\.$/,'시기라, ')+labels[x.p.season]+'예요. ':labels[x.p.season]+'예요. ')+(same?['','원래 사주를 받쳐 주는 방식은 앞 시기와 같아요.','이 시기도 같은 이유로 원래 사주에 힘을 보태요.'][k]||'':rc);});
 var ymd=function(d){return Number(d.slice(0,4))+'년 '+Number(d.slice(5,7))+'월';};
 if(top&&!past&&curX&&ending&&shift.to)paras.push('지금 지나는 '+curX.p.ganzhi+' 대운(그래프 '+curX.n+'점)은 '+ymd(shift.date)+'에 끝나서 앞으로의 순위에서는 뺐어요. 지금은 대운이 '+shift.from.ganzhi+'에서 '+shift.to.ganzhi+'로 바뀌는 교운기예요. 바뀌는 앞뒤 1년쯤은 두 흐름이 섞여서 새 대운의 성격이 바로 느껴지지 않을 수 있어요. 지금 마무리하는 일이 다음 시기의 밑천이 돼요.');
 else if(top&&!past&&curX&&picks.indexOf(curX)<0)paras.push('지금 지나는 '+curX.p.ganzhi+' 대운은 그래프 '+curX.n+'점으로 \''+tierName(curX.n)+'\' 구간이라 위 시기들보다 힘이 덜 실려요. 지금 준비해 둔 실력과 사람이 위 시기에 그대로 쓰여요.'+(shift&&shift.to?' 대운이 '+ymd(shift.date)+' 무렵 '+shift.from.ganzhi+'에서 '+shift.to.ganzhi+'로 막 바뀐 교운기라, 새 흐름이 자리 잡는 데 1년쯤 걸릴 수 있어요.':''));
 var kind=top&&scenes[top.p.season];
 var reality=top?paras.join('\n\n')+'\n\n'+(past?'이 구간은 이미 지난 시기예요. 당시 배운 방법과 남겨둔 결과 중 지금 다시 써볼 것을 골라보세요.':kind?kind.example:''):periods.length?'대운표에서 지금 지나는 시기를 먼저 보세요. 일정이나 지출이 흔들리면 새 일을 늘리기 전에 이미 맡은 일부터 정리하세요.':'대운 계산값이 없어 구체적인 연도를 고르지 않았어요. 출생 정보를 확인한 뒤 대운표에서 시기를 살펴보세요.';
 var first=chron.filter(function(x){return !x.cur;})[0];
 var strength=top?'가장 강한 시기의 장점은 '+EDGE[top.p.season]+' 있어요. '+EDGE_DO[top.p.season]+(first&&first!==top&&!past?' 그보다 먼저 오는 '+first.p.startYear+'~'+first.p.endYear+'년은 '+labels[first.p.season]+'라, 그때 만든 결과가 다음 시기의 밑바탕이 돼요.':''):'지금 자주 막히는 일 하나를 익혀두면 다음에 같은 부탁을 받을 때 처음부터 헤매지 않아도 돼요.';
 var core={title:title,reality:reality.replace(/\n\n$/,''),strength:strength,risk:kind?kind.risk:'좋은 때를 기다린다는 이유로 필요한 휴식과 생활 정리를 미루지 마세요.',reinforce:top?'이 시기들을 전성기로 살리려면 달력의 날짜보다 내가 끝낼 일을 먼저 정해야 해요. '+(past?'예전에 잘됐던 방법을 지금 생활에 맞게 작게 다시 써보세요.':'아래 행동을 실제 일정 하나로 옮겨보세요.'):'생활비와 이미 잡힌 일정을 확인하고, 새로 맡을 수 있는 일의 양을 정해두세요.',practice:kind?kind.practice:'이번 주에 가장 버거운 일 하나를 적고, 줄이거나 도움을 부탁할 부분을 정하세요.',why:'만트라 만세력의 기존 대운 계산값(적합값)을 0~100으로 옮긴, 위 그래프와 같은 인생 흐름 점수를 씁니다. 지금 또는 앞으로 올 80세 미만 시작 대운 중 상태가 주의·부담이거나 방어 신호가 있는 구간을 빼고, \'좋음\'(65점) 이상을 높은 순으로 최대 3개 고르고, 2개가 안 되면 \'무난\'(45점) 이상에서 채웁니다. 동점은 이른 구간을 우선합니다. 앞으로 올 구간이 없으면 지난 구간을 보여줍니다. 지금 대운은 오늘 날짜가 대운 시작일~다음 대운 시작일 사이인 것으로 봅니다.'+(picks.length?'\n선정: '+chron.map(function(x){return x.p.ganzhi+' '+x.p.startYear+'~'+x.p.endYear+' '+x.n+'점';}).join(' · ')+'\n'+(top.p.assessment&&top.p.assessment.reasons||[]).join('\n'):'')+'\n실제 성취가 보장되는 날짜는 아니며 출생시각과 계산 기준에 따라 구간이 달라집니다.'};
 return {id:'timeline_self_peak',base:'timeline_self_peak',title:'내 인생의 전성기는 언제?',kind:'life',editorialTopicId:'self',aiEnabled:false,readingSupplementary:true,readingDeferred:false,readingProvider:'local-engine-luck',readingCore:core,readingParagraphs:Object.keys(core).map(function(k){return {role:k,text:core[k]};}),readingVisualData:{name:nm,peakPeriods:periods,peakLabels:labels,peakSelected:top&&top.p.startYear,peakPicks:chron.map(function(x){return x.p.startYear;}),nowYear:now},scenes:R.ReadingFlow?R.ReadingFlow.scenes(core,'timeline_self_peak'):[]};
}
function add(rep,sd,name){if(!rep||!sd||rep.chapters.some(function(c){return c.id==='timeline_self_peak';}))return rep;var i=rep.chapters.findIndex(function(c){return c.editorialContractId==='timeline_self_20';});if(i<0)i=rep.chapters.findIndex(function(c){return c.editorialContractId==='timeline_self_21';});if(i<0)i=rep.chapters.findIndex(function(c){return c.editorialTopicId==='self';});if(i<0)return rep;var c=build(sd,name);c.act=rep.chapters[i].act;rep.chapters.splice(i+1,0,c);rep.chapters.forEach(function(c,j){c.no=j+1;});return rep;}
R.PeakReading={build:build,add:add,eligible:eligible,reason:reason};
})(typeof window!=='undefined'?window:globalThis);
