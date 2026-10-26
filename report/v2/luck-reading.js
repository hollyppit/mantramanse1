/* Explain only supplied engine luck values. No calendar, ten-god or clash calculation here. */
(function(root){'use strict';
var ids=['timeline_self_20','timeline_self_21','timeline_self_24','timeline_self_peak','timeline_wealth_06','timeline_wealth_10','timeline_career_08','timeline_career_12','timeline_love_08'];
var gods={
비견:['내가 직접 정하고 밀고 나가는 힘이 커지는 시기예요.','누가 정해 주길 기다리지 말고 내가 맡을 일과 하고 싶은 방식을 먼저 말해 보세요.','돈 문제에서는 남이 정해 주길 기다리지 말고 내가 쓸 한도와 받을 몫을 먼저 정해 보세요.','일에서는 누가 시키기 전에 내가 맡을 범위와 하고 싶은 방식을 먼저 제안해 보세요.','관계에서는 상대가 정해 주길 기다리지 말고 내가 원하는 거리와 방식을 먼저 말해 보세요.'],
겁재:['사람들과 함께 움직이고 경쟁하면서 힘이 붙는 시기예요.','함께하는 일이 생기면 의욕만 맞추지 말고 역할과 몫을 처음부터 나눠 두세요.','동료나 친구와 돈이 얽힌 일을 한다면 비용과 정산 방식을 시작 전에 정해 두세요.','동료와 새 일을 시작한다면 의욕만 맞추지 말고 역할과 책임을 처음부터 나눠 두세요.','사람들 사이에서 경쟁심이 올라올 수 있어요. 연애에서는 남과 비교하기보다 둘만의 속도를 지키세요.'],
식신:['익숙한 기술을 꾸준히 써서 결과를 만들어 내는 시기예요.','새로 벌이기보다 이미 잘하는 것을 꾸준히 다듬어서 결과로 남기세요.','새 상품을 한꺼번에 늘리기보다 이미 잘하는 작업의 품질과 제공 시간을 다듬어 보세요.','새 프로젝트를 늘리기보다 익숙한 업무의 품질과 속도를 올려서 실적으로 남겨 보세요.','큰 이벤트보다 꾸준한 작은 챙김이 잘 통하는 때예요. 반복할 수 있는 다정함을 하나 정해 보세요.'],
상관:['당연하게 하던 방식을 고치고 하고 싶은 말을 밖으로 꺼내게 되는 시기예요.','불편했던 방식을 하나 골라 고쳐 보고, 하고 싶은 말은 정리해서 꺼내 보세요.','고객이나 거래처가 자주 묻는 점을 보고 안내문이나 가격 구조를 고쳐 보세요.','당연하게 해 오던 업무 방식을 하나 골라 개선안을 만들어 제안해 보세요.','말이 예리해지기 쉬운 때예요. 서운한 점은 비난 대신 부탁하는 문장으로 바꿔서 말하세요.'],
편재:['새로운 사람과 거래 기회가 눈에 들어오는 시기예요.','새로운 사람이나 기회가 눈에 들어오면 작게 시험해 보고 넓힐지 정하세요.','새 고객을 만날 제안이 오면 작은 거래부터 해 보고, 실제로 낼 수 있는 시간과 비용을 확인하세요.','새로운 사람이나 일 제안이 오면 작은 일부터 맡아 보고, 감당할 범위를 확인한 뒤 넓히세요.','새로운 만남이 눈에 들어올 수 있어요. 설렘은 즐기되 한 번에 마음을 다 쓰지는 마세요.'],
정재:['들어오고 나가는 돈과 약속한 몫을 꼼꼼히 챙기게 되는 시기예요.','약속한 몫과 내 몫을 분명히 해 두세요. 들어오고 나가는 것을 한 번 정리하면 마음이 편해져요.','주문은 늘었는데 남는 돈이 적다면 재료비와 작업 시간을 다시 적어 보세요.','맡은 일의 범위와 받을 보상이 맞는지 점검해 보세요. 일한 만큼의 대가를 분명히 하세요.','관계에서 주고받는 것이 한쪽으로 기울지 않았는지 살펴보세요. 마음도 시간도 균형이 중요해요.'],
편관:['급한 요구와 어려운 책임이 한꺼번에 오기 쉬운 시기예요.','갑자기 일이 몰릴 수 있어요. 지금 할 일과 도움을 청할 일을 먼저 나누세요.','급한 지출이나 책임이 한꺼번에 올 수 있어요. 예비 자금과 우선순위를 먼저 정해 두세요.','갑자기 맡을 일이 늘면 지금 할 일과 도움을 청할 일을 먼저 나누세요.','일이 몰려서 관계에 소홀해지기 쉬워요. 바빠도 연락할 시간을 따로 정해 두세요.'],
정관:['정해진 역할과 약속을 지키면서 신뢰를 쌓는 시기예요.','책임질 범위를 분명히 해 두세요. 내가 맡을 일과 맡지 않을 일을 말로 정해 두면 신뢰가 오래 가요.','계약이나 약속이 걸린 돈은 조건을 문서로 남기세요. 신뢰를 지키는 만큼 내 몫도 분명히 하세요.','새 직책이나 계약을 맡을 때는 무엇을 언제까지 책임지는지 분명히 해 두세요.','약속을 지키는 사람에게 마음이 가는 때예요. 나도 작은 약속부터 지키며 믿음을 보여 주세요.'],
편인:['익숙한 답을 다시 살펴보고 새로운 관점이나 전문 지식을 찾게 되는 시기예요.','혼자 오래 고민하기보다 아는 사람에게 물어보세요. 새 답을 찾기 전에 쓰던 방법도 한 번 점검해 보세요.','곧바로 돈을 넣기보다 조건을 더 조사하고 작은 금액으로 먼저 시험해 보세요.','곧바로 매장을 늘리기보다 고객의 불편을 조사하거나 새 기술을 작은 서비스에 시험해 보세요.','상대의 속마음이 궁금해도 혼자 추측하지 말고 가볍게 물어보세요. 생각이 길어지면 오해가 커져요.'],
정인:['배우고 준비하면서 믿을 만한 도움을 받아들이는 시기예요.','경험 있는 사람의 조언을 구해 보세요. 배운 것은 작게라도 바로 써 봐야 내 것이 돼요.','큰돈이 오가는 결정 전에 전문가나 경험 있는 사람의 검토를 받아 보세요.','필요한 교육을 듣거나 경험 있는 사람의 검토를 받은 뒤, 배운 방법을 실제 작업에 써 보세요.','가까운 사람의 조언과 지지가 힘이 되는 때예요. 속마음을 믿는 사람에게 털어놓아 보세요.']
};
function topicIndex(id){return /^timeline_wealth_/.test(id)?2:/^timeline_career_/.test(id)?3:/^timeline_love_/.test(id)?4:1;}
var flows={
opportunity:['새로운 시도를 작게 해 보는 쪽이 잘 맞아요.','새 수입원을 작게 시험해 보는 쪽이 잘 맞아요.','새 역할이나 새 일을 작게 시험해 보는 쪽이 잘 맞아요.','새로운 만남이나 새로운 표현을 작게 시도해 보는 쪽이 잘 맞아요.'],
expansion:['하던 일을 넓히되 실제로 유지할 수 있는 분량도 같이 따져 보세요.','하던 수입원을 넓히되 늘어나는 비용과 시간도 같이 따져 보세요.','하던 일의 범위를 넓히되 실제로 감당할 수 있는 분량도 같이 따져 보세요.','관계를 한 걸음 넓히되 서로가 편한 속도인지 같이 확인해 보세요.'],
harvest:['해 온 일의 결과를 정리하고 받을 몫을 확인하는 게 먼저예요.','해 온 일의 대가를 정리하고 받을 돈과 날짜를 확인하는 게 먼저예요.','해 온 일의 성과를 정리해서 평가와 보상으로 연결하는 게 먼저예요.','쌓아 온 관계의 결실을 확인하고 앞으로의 약속을 구체적으로 이야기해 볼 때예요.'],
accumulation:['배운 것을 실제 작업에 써서 실력을 쌓는 데 힘을 쓰세요.','지금은 크게 벌기보다 돈 관리 실력과 기반을 쌓는 데 힘을 쓰세요.','배운 것을 실제 업무에 써서 나만의 실력을 쌓는 데 힘을 쓰세요.','서둘러 결론 내기보다 서로를 이해하는 시간을 쌓는 데 힘을 쓰세요.'],
transition:['익숙한 방법을 그대로 둘지 바꿀지 따져 보는 때예요.','돈을 벌고 쓰는 방식을 그대로 둘지 바꿀지 따져 보는 때예요.','일하는 방식이나 자리를 그대로 둘지 바꿀지 따져 보는 때예요.','관계의 방식을 그대로 둘지 바꿀지 서로 이야기해 볼 때예요.'],
defense:['새 부담을 받기 전에 이미 맡은 일과 생활의 여유부터 챙기세요.','새 지출을 늘리기 전에 고정비와 예비 자금부터 챙기세요.','새 일을 받기 전에 이미 맡은 일과 체력부터 챙기세요.','새 관계를 서두르기보다 지금의 관계와 내 마음의 여유부터 챙기세요.']
};
var pos={year:'태어난 해',month:'태어난 달',day:'태어난 날',hour:'태어난 시간'},han='子丑寅卯辰巳午未申酉戌亥',ko='자축인묘진사오미신유술해';
function relationName(name){return String(name||'').replace(/[子丑寅卯辰巳午未申酉戌亥]/g,function(c){return ko[han.indexOf(c)];});}
function particle(word,yes,no){return word+((word.charCodeAt(word.length-1)-44032)%28?yes:no);}
function validYear(v){return Number.isInteger(v)&&v>=1900&&v<=2200;}
function selected(id){return ids.indexOf(id)>=0;}
function context(id,sd){
 if(!selected(id)||!sd||!validYear(sd.nowYear))return null;
 var lines=[],basis=[],dw=sd.currentDaewoon,sy=sd.sewoon,longFirst=id==='timeline_self_20'||id==='timeline_self_peak',annual=sy&&sy.year===sd.nowYear&&gods[sy.stemTG],decade=dw&&validYear(dw.startYear)&&validYear(dw.endYear)&&dw.startYear<=sd.nowYear&&sd.nowYear<=dw.endYear&&gods[dw.stemTG];
 function explain(p,scope){var g=gods[p.stemTG];if(!g)return;var example=g[topicIndex(id)];var lead=scope==='annual'?p.year+'년은 \''+p.stemTG+'\'의 해예요.':p.startYear+'~'+p.endYear+'년은 10년 단위로 \''+p.stemTG+'\'의 흐름이 들어와요.';lines.push(lead+' '+g[0]+' '+example);if(flows[p.season])lines.push('내 사주와 겹쳐 보면 '+flows[p.season][topicIndex(id)-1]);basis.push({scope:scope,path:scope==='annual'?'sewoon.stemTG':'currentDaewoon.stemTG',tenGod:p.stemTG,branchTenGod:gods[p.branchTG]?p.branchTG:null,ganzhi:p.ganzhi||null,year:p.year||null,startYear:p.startYear||null,endYear:p.endYear||null,flow:p.season||null,source:'existing-manse-engine'});}
 if(longFirst&&decade)explain(dw,'decade');if(annual)explain(sy,'annual');if(!longFirst&&!annual&&decade)explain(dw,'decade');
 // Only luck/natal clashes copied from the engine are eligible. Natal-only clashes cannot become a dated claim.
 var candidates=[];if(annual)candidates.push({p:sy,scope:'annual',label:sy.year+'년'});
 (sd.monthlyLuck||[]).forEach(function(p){if(!p||!/^\d{4}-\d{2}-\d{2}$/.test(p.startDate||'')||!validYear(p.year)||p.year<sd.nowYear||p.year>sd.nowYear+1||Number(p.startDate.slice(0,4))!==p.year||Number(p.startDate.slice(5,7))!==p.month)return;var asOf=sd.currentRoots&&sd.currentRoots.asOfDate;if(asOf&&p.endBefore&&p.endBefore<=asOf)return;candidates.push({p:p,scope:'month',label:p.year+'년 '+p.month+'월'+(p.term?' '+p.term+' 무렵':'')});});
 var picked=null;
 candidates.some(function(c){var rel=(c.p.relations||[]).find(function(r){return r&&r.type==='충'&&r.kind==='branch'&&Array.isArray(r.members)&&r.members.length===2&&r.members.indexOf('luck')>=0&&r.members.some(function(k){return pos[k]&&sd.pillars&&sd.pillars[k];});});if(rel){picked={period:c,relation:rel};return true;}return false;});
 if(picked){var c=picked.period,r=picked.relation,target=r.members.find(function(k){return pos[k];});lines.push(c.label+'에는 들어오는 운과 '+pos[target]+'의 글자가 서로 부딪히는 '+relationName(r.name||'충')+'이 있어요. 하던 방식이 흔들리거나 바뀔 수 있는 때라서, '+['생활이나 약속을 바꾸자는 제안이 오면 원래 조건과 뭐가 달라지는지부터 확인하세요.','금액이나 계약 조건을 바꾸자는 제안이 오면 원래 조건과 뭐가 달라지는지부터 확인하세요.','업무 분담이나 일정을 바꾸자는 제안이 오면 원래 조건과 뭐가 달라지는지부터 확인하세요.','연락 방식이나 만나는 약속을 바꾸자는 말이 나오면 서운해하기 전에 이유부터 물어보세요.'][topicIndex(id)-1]);basis.push({scope:c.scope,path:c.scope==='annual'?'sewoon.relations':'monthlyLuck.relations',type:r.type,name:r.name,members:r.members.slice(),ganzhi:c.p.ganzhi||null,year:c.p.year,startDate:c.p.startDate||null,endBefore:c.p.endBefore||null,term:c.p.term||null,source:'existing-manse-engine'});}
 if(!lines.length)return null;return {text:lines.join('\n\n'),basis:basis,scope:'calculated-luck-with-editorial-examples',note:'십성과 충은 계산된 항목이며, 생활 예시는 이해를 돕는 참고 해설입니다. 특정 사건이나 사업 성과를 뜻하지 않습니다.'};
}
root.MantraLuckReading={version:'luck-everyday-20261021-1',context:context,selected:selected,gods:gods};
})(typeof window!=='undefined'?window:globalThis);
