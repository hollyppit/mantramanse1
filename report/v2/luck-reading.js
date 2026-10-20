/* Explain only supplied engine luck values. No calendar, ten-god or clash calculation here. */
(function(root){'use strict';
var ids=['timeline_self_20','timeline_self_21','timeline_self_peak','timeline_wealth_06','timeline_wealth_10','timeline_career_08','timeline_career_12','timeline_love_08'];
var gods={
비견:['내가 직접 정하고 움직이는 힘','예를 들어, 누가 정해주길 기다리기보다 내가 맡을 일과 원하는 방식을 먼저 제안해 볼 수 있어요.'],
겁재:['사람들과 함께 움직이거나 경쟁하며 힘을 내는 모습','예를 들어, 동료와 새 일을 시작한다면 의욕만 맞추기보다 비용과 역할을 처음부터 나눠두면 좋아요.'],
식신:['익숙한 기술을 꾸준히 써서 결과를 만드는 힘','예를 들어, 사업을 한다면 새 상품을 한꺼번에 늘리기보다 이미 잘하는 작업의 품질과 제공 시간을 다듬어볼 수 있어요.'],
상관:['당연하게 하던 방법을 고치고 생각을 밖으로 표현하는 힘','예를 들어, 고객이 자주 묻는 점을 보고 안내문이나 서비스를 고쳐보는 식으로 활용할 수 있어요.'],
편재:['새로운 사람과 거래 기회를 찾아 연결하는 모습','예를 들어, 새 고객을 만날 제안이 오면 작은 거래부터 해보고 실제로 제공할 시간과 비용을 확인해 보세요.'],
정재:['들어오고 나가는 돈과 약속한 몫을 꼼꼼히 챙기는 힘','예를 들어, 주문은 늘었는데 남는 돈이 적다면 재료비와 작업 시간을 다시 적어보는 것이 도움이 돼요.'],
편관:['급한 요구에 대응하고 어려운 일을 책임지려는 모습','예를 들어, 갑자기 맡을 일이 늘면 지금 할 일과 도움을 요청할 일을 먼저 나눠보세요.'],
정관:['정해진 역할과 약속을 지키고 신뢰를 쌓는 모습','예를 들어, 새 직책이나 계약을 맡을 때 무엇을 언제까지 책임지는지 분명히 해두면 좋아요.'],
편인:['익숙한 답을 다시 살피고 새로운 관점이나 전문 지식을 찾는 모습','예를 들어, 사업을 한다면 곧바로 매장을 늘리기보다 고객의 불편을 조사하거나 새 기술을 작은 서비스에 시험해 볼 수 있어요.'],
정인:['배우고 준비하며 믿을 만한 도움을 받아들이는 모습','예를 들어, 필요한 교육을 듣거나 경험 있는 사람의 검토를 받은 뒤 배운 방법을 실제 작업에 써볼 수 있어요.']
};
var flows={opportunity:'새로운 시도를 작게 해보는 데 초점을 둘 수 있어요.',expansion:'해오던 일을 넓히되 실제로 유지할 분량도 함께 살펴보세요.',harvest:'해온 일의 결과를 정리하고 받을 몫을 확인하는 데 초점을 둘 수 있어요.',accumulation:'배운 것을 실제 작업에 쓰며 실력을 쌓는 데 초점을 둘 수 있어요.',transition:'익숙한 방법을 그대로 유지할지 조정할지 살펴보는 흐름이에요.',defense:'새 부담을 더 받기 전에 이미 맡은 일과 생활의 여유부터 챙겨보세요.'};
var pos={year:'태어난 해',month:'태어난 달',day:'태어난 날',hour:'태어난 시간'},han='子丑寅卯辰巳午未申酉戌亥',ko='자축인묘진사오미신유술해';
function relationName(name){return String(name||'').replace(/[子丑寅卯辰巳午未申酉戌亥]/g,function(c){return ko[han.indexOf(c)];});}
function particle(word,yes,no){return word+((word.charCodeAt(word.length-1)-44032)%28?yes:no);}
function validYear(v){return Number.isInteger(v)&&v>=1900&&v<=2200;}
function selected(id){return ids.indexOf(id)>=0;}
function context(id,sd){
 if(!selected(id)||!sd||!validYear(sd.nowYear))return null;
 var lines=[],basis=[],dw=sd.currentDaewoon,sy=sd.sewoon,longFirst=id==='timeline_self_20'||id==='timeline_self_peak',annual=sy&&sy.year===sd.nowYear&&gods[sy.stemTG],decade=dw&&validYear(dw.startYear)&&validYear(dw.endYear)&&dw.startYear<=sd.nowYear&&sd.nowYear<=dw.endYear&&gods[dw.stemTG];
 function explain(p,scope){var g=gods[p.stemTG];if(!g)return;var lead=scope==='annual'?p.year+'년은 천간에 '+particle(p.stemTG,'이','가')+' 들어오는 해예요.':p.startYear+'~'+p.endYear+'년 대운의 천간에는 '+particle(p.stemTG,'이','가')+' 들어와요.';lead+=' '+particle(p.stemTG,'은','는')+' '+g[0]+'으로 풀어 읽어요.';lines.push(lead+' '+g[1]);if(flows[p.season])lines.push('원래 사주와 함께 본 흐름에서는 '+flows[p.season]);basis.push({scope:scope,path:scope==='annual'?'sewoon.stemTG':'currentDaewoon.stemTG',tenGod:p.stemTG,branchTenGod:gods[p.branchTG]?p.branchTG:null,ganzhi:p.ganzhi||null,year:p.year||null,startYear:p.startYear||null,endYear:p.endYear||null,flow:p.season||null,source:'existing-manse-engine'});}
 if(longFirst&&decade)explain(dw,'decade');if(annual)explain(sy,'annual');if(!longFirst&&!annual&&decade)explain(dw,'decade');
 // Only luck/natal clashes copied from the engine are eligible. Natal-only clashes cannot become a dated claim.
 var candidates=[];if(annual)candidates.push({p:sy,scope:'annual',label:sy.year+'년'});
 (sd.monthlyLuck||[]).forEach(function(p){if(!p||!/^\d{4}-\d{2}-\d{2}$/.test(p.startDate||'')||!validYear(p.year)||p.year<sd.nowYear||p.year>sd.nowYear+1||Number(p.startDate.slice(0,4))!==p.year||Number(p.startDate.slice(5,7))!==p.month)return;var asOf=sd.currentRoots&&sd.currentRoots.asOfDate;if(asOf&&p.endBefore&&p.endBefore<=asOf)return;candidates.push({p:p,scope:'month',label:p.year+'년 '+p.month+'월'+(p.term?' '+p.term+' 무렵':'')});});
 var picked=null;
 candidates.some(function(c){var rel=(c.p.relations||[]).find(function(r){return r&&r.type==='충'&&r.kind==='branch'&&Array.isArray(r.members)&&r.members.length===2&&r.members.indexOf('luck')>=0&&r.members.some(function(k){return pos[k]&&sd.pillars&&sd.pillars[k];});});if(rel){picked={period:c,relation:rel};return true;}return false;});
 if(picked){var c=picked.period,r=picked.relation,target=r.members.find(function(k){return pos[k];});lines.push('특히 '+c.label+'에는 들어오는 운과 '+pos[target]+'의 글자 사이에 '+relationName(r.name||'충')+'이 있어요. 충은 기존 방식이 흔들리거나 바뀔 여지가 있는 때로 읽어요. 예를 들어, 업무 분담이나 약속을 바꿀 제안을 받으면 원래 조건과 달라지는 점부터 함께 확인해 보세요.');basis.push({scope:c.scope,path:c.scope==='annual'?'sewoon.relations':'monthlyLuck.relations',type:r.type,name:r.name,members:r.members.slice(),ganzhi:c.p.ganzhi||null,year:c.p.year,startDate:c.p.startDate||null,endBefore:c.p.endBefore||null,term:c.p.term||null,source:'existing-manse-engine'});}
 if(!lines.length)return null;return {text:lines.join('\n\n'),basis:basis,scope:'calculated-luck-with-editorial-examples',note:'십성과 충은 계산된 항목이며, 생활 예시는 이해를 돕는 참고 해설입니다. 특정 사건이나 사업 성과를 뜻하지 않습니다.'};
}
root.MantraLuckReading={version:'luck-everyday-20261020-1',context:context,selected:selected,gods:gods};
})(typeof window!=='undefined'?window:globalThis);
