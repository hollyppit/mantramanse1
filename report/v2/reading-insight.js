/* '이 사주에서만 읽히는 포인트' 층. 한 가지 요소가 아니라 요소들이 맞물리는 지점(가장 센 기운×가장 약한 기운, 구조, 글자가 놓인 자리,
   12운성, 글자 사이의 관계, 지금 대운·올해 세운과 원국의 만남)을 장의 관점(자기·재물·일·인연)에 맞게 읽어 준다.
   값은 엔진이 계산한 것만 읽고 새로 해석하지 않는다. 문안은 reading-insight-data-*.js 가 R.ReadingInsightData 에 등록한다.
   같은 리포트의 같은 관점 안에서는 한 요소를 한 장에만 쓰도록, 사주 하나를 기준으로 장마다 쓸 요소를 미리 나눠 정한다(결정적). */
(function(root){'use strict';var R=root.ReportV2=root.ReportV2||{};
var GROUPS=['비겁','식상','재성','관성','인성'],ELS=['목','화','토','금','수'];
var GLOSS={비겁:'내 편·경쟁심',식상:'표현·재주',재성:'돈·현실',관성:'책임·규칙',인성:'배움·보호'};
var EL_GLOSS={목:'시작·성장',화:'표현·열기',토:'안정·중심',금:'결단·정리',수:'지혜·흐름'};
var TG_GROUP={비견:'비겁',겁재:'비겁',식신:'식상',상관:'식상',편재:'재성',정재:'재성',편관:'관성',정관:'관성',편인:'인성',정인:'인성'};
var STEM_EL={갑:'목',을:'목',병:'화',정:'화',무:'토',기:'토',경:'금',신:'금',임:'수',계:'수'};
var PILLAR_NAME={year:'년',month:'월',day:'일',hour:'시'},PILLAR_ORDER=['year','month','day','hour'];
var PAT_ORDER=['재다신약','관살과다','군겁쟁재','식상과다(설기)','인성과다','관살혼잡','상관견관','효신탈식(도식)','식신제살','상관패인','살인상생','무재','무관','무식상','무인성','무비겁'];
var REL_TYPE_SCORE={충:5,형:4,육합:4,삼합:3,파:3,천간합:3,천간충:3,해:2,원진:2,반합:2,방합:2,귀문관:1};
var REL_TYPE_KEY={충:'충',형:'형',파:'파',해:'해',원진:'원진',귀문관:'귀문관',육합:'합',반합:'합',삼합:'합',방합:'합',천간합:'천간합',천간충:'천간충'};
var SEUN_TYPE_KEY={충:'충',형:'형',파:'파해',해:'파해',육합:'합',반합:'합',삼합:'합',방합:'합',원진:'원진귀문',귀문관:'원진귀문'};
// 장 → 관점과 요소 선호 순서. 앞 장부터 순서대로 아직 안 쓴 요소를 가져가므로, 같은 관점 안에서 한 요소는 한 장에만 나온다.
// 요소 이름: pair 강×약, pat1·pat2 구조, lack 비어 있는 오행, clim 기후, st_* 12운성(년·월·일·시), tg_* 십성(년간·년지·월간·월지·일지·시간·시지),
// rel1·rel2 글자 관계, dwg 대운×원국, dwy 대운 오행의 역할, seg 올해 세운 십성, ser 올해 세운과 일지·월지의 관계
var PLAN=[
 ['timeline_self_peak','self',['dwg','dwn','dwy','seg']],
 ['timeline_self_20','self',['dwg','dwn','st_m','seg']],
 ['timeline_self_24','self',['seg','sen','ser','dwy']],
 ['timeline_wealth_06','wealth',['dwg','seg','dwy','dwn']],
 ['timeline_wealth_10','wealth',['dwy','seg','sen','ser']],
 ['timeline_wealth_14','wealth',['seg','sen','ser','dwr']],
 ['timeline_career_08','career',['dwg','ser','seg','dwr']],
 ['timeline_career_12','career',['dwn','dwy','dwg','seg']],
 ['timeline_career_14','career',['seg','sen','dwg','ser']],
 ['timeline_love_08','love',['seg','dwg','ser','sen']],
 ['timeline_love_14','love',['dwg','dwn','seg','ser']],
 ['timeline_self_03','self',['pair','bandg','st_d','clim']],
 ['timeline_self_02','self',['clim','tg_ms','st_m']],
 ['timeline_self_18','self',['pat1','pat2','rel1']],
 ['timeline_self_25','self',['pat2','lack','tg_ms']],
 ['timeline_self_22','self',['pair','st_y','tg_ys','bandg']],
 ['timeline_self_33','self',['st_h','tg_hs','tg_hb']],
 ['timeline_self_37','self',['lack','dwy','clim']],
 ['timeline_wealth_01','wealth',['pair','bandg','st_m','tg_mb']],
 ['timeline_wealth_02','wealth',['tg_ms','tg_mb','rel1']],
 ['timeline_wealth_03','wealth',['pat1','rel1','pat2','tg_db']],
 ['timeline_wealth_04','wealth',['tg_mb','tg_ms','st_m']],
 ['timeline_wealth_05','wealth',['st_d','tg_db','clim']],
 ['timeline_wealth_07','wealth',['pat1','pat2','rel1','lack']],
 ['timeline_wealth_08','wealth',['clim','tg_hs','st_h']],
 ['timeline_wealth_09','wealth',['rel1','rel2','tg_yb','tg_ys']],
 ['timeline_wealth_11','wealth',['pat2','lack','pair']],
 ['timeline_wealth_12','wealth',['lack','clim','pat1']],
 ['timeline_wealth_13','wealth',['tg_db','tg_yb','tg_hb']],
 ['timeline_wealth_15','wealth',['lack','dwy','clim']],
 ['timeline_self_30','wealth',['pair','pat1','st_d','bandg']],
 ['timeline_self_31','wealth',['st_m','tg_mb','st_y']],
 ['timeline_self_32','wealth',['tg_ms','tg_hs','st_h']],
 ['timeline_career_01','career',['pair','bandg','tg_mb','st_m']],
 ['timeline_career_02','career',['tg_hs','tg_ms','st_h']],
 ['timeline_career_03','career',['tg_mb','pat1','tg_ms']],
 ['timeline_career_04','career',['pat2','st_d','tg_db']],
 ['timeline_career_05','career',['clim','lack','st_y']],
 ['timeline_career_06','career',['clim','tg_yb','rel1']],
 ['timeline_career_07','career',['rel1','rel2','tg_ms']],
 ['timeline_career_09','career',['pat1','rel2','lack']],
 ['timeline_career_10','career',['pat2','tg_db','pair']],
 ['timeline_career_11','career',['st_m','pat1','pair']],
 ['timeline_career_13','career',['tg_ms','tg_hb','tg_yb']],
 ['timeline_career_15','career',['lack','dwy','clim']],
 ['timeline_self_26','career',['tg_mb','pair','st_m']],
 ['timeline_love_01','love',['pair','bandg','st_d','tg_ms']],
 ['timeline_love_02','love',['tg_ms','clim','pat1']],
 ['timeline_love_03','love',['rel1','tg_yb','rel2']],
 ['timeline_love_04','love',['st_d','tg_db','pat1']],
 ['timeline_love_05','love',['pat1','pair','lack']],
 ['timeline_love_06','love',['pat2','rel2','tg_ys']],
 ['timeline_love_07','love',['tg_db','dwy','lack']],
 ['timeline_love_09','love',['rel1','pat1','tg_hb']],
 ['timeline_love_10','love',['tg_ys','tg_yb','st_y']],
 ['timeline_love_11','love',['tg_hs','tg_hb','st_h']],
 ['timeline_love_12','love',['pat2','st_m','pair']],
 ['timeline_love_13','love',['tg_db','tg_ms','dwy']],
 ['timeline_love_15','love',['lack','dwy','clim']],
 ['timeline_self_27','love',['pair','rel1','st_d','bandg']],
 ['timeline_self_28','love',['tg_hb','tg_db','rel2']],
 ['timeline_self_29','love',['tg_db','st_d','dwy']],
 ['timeline_self_34','love',['tg_hs','tg_hb','st_h']]
];
// 마지막 보루: 선호 요소가 모두 없거나 이미 쓰였으면 이 순서로 아직 안 쓴 요소를 찾는다.
var SPARE=['pair','bandg','clim','st_d','st_m','st_y','tg_ms','tg_mb','tg_db','tg_ys','tg_yb','dwg','dwy','seg','pat1','pat2','lack','rel1','rel2','rel3','dwn','sen','dwr','ser','st_h','tg_hs','tg_hb'];
var PLAN_BY_ID={};PLAN.forEach(function(p){PLAN_BY_ID[p[0]]={lens:p[1],prefs:p[2]};});
function D(){return R.ReadingInsightData||{};}
function josa(word,a,b){var s=String(word),c=s.charCodeAt(s.length-1);return (c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28)?a:b;}
function pickGroup(sd,max){var g=sd.groups||{},best=null;GROUPS.forEach(function(k){if(Number.isFinite(g[k])&&(best===null||(max?g[k]>g[best]:g[k]<g[best])))best=k;});
 var given=max?sd.dominantGroup:sd.weakestGroup;return GROUPS.indexOf(given)>=0?given:best;}
function climateKey(c){if(!c||!Number.isFinite(c.temp)||!Number.isFinite(c.hum))return null;var t=c.temp>0.3?'열':c.temp<-0.3?'한':'온',h=c.hum>0.3?'습':c.hum<-0.3?'조':'평';
 if(t==='열')return h==='조'?'열조':'열';if(t==='한')return h==='습'?'한습':'한';return h==='습'?'습':h==='조'?'조':'평';}
function pairKey(a,b){var i=PILLAR_ORDER.indexOf(a),j=PILLAR_ORDER.indexOf(b);return i<=j?a+'-'+b:b+'-'+a;}
function relPlace(type,members){var stem=/^천간/.test(type),parts=members.slice().sort(function(a,b){return PILLAR_ORDER.indexOf(a)-PILLAR_ORDER.indexOf(b);});
 return parts.map(function(m){return PILLAR_NAME[m]+(stem?'간':'지');}).join('와 ');}
// 대운·세운의 지지가 내 일지·월지와 맺는 관계 중 가장 눈에 띄는 하나. 일지를 먼저 본다.
function luckRel(rels,P){var best=null;(rels||[]).forEach(function(r){if(r&&r.kind==='branch'&&SEUN_TYPE_KEY[r.type]&&Array.isArray(r.members)){var place=r.members.indexOf('day')>=0?'day':r.members.indexOf('month')>=0?'month':null;if(place&&P[place]){var sc=(place==='day'?10:0)+(REL_TYPE_SCORE[r.type]||0);if(!best||sc>best.sc)best={place:place,type:r.type,sc:sc};}}});return best;}
// 사주 하나에서 쓸 수 있는 요소를 모은다. 값이 없으면 그 요소는 만들지 않는다.
function facts(sd){var f={},P=sd.pillars||{};
 var top=pickGroup(sd,true),weak=pickGroup(sd,false);if(top&&weak&&top!==weak)f.pair={s:top,w:weak};
 var band=sd.strength&&sd.strength.band;if(top&&(band==='신강'||band==='중화'||band==='신약'))f.bandg={band:band,g:top};
 var pats=(sd.patterns||[]).filter(function(p){return p&&PAT_ORDER.indexOf(p.name)>=0;}).sort(function(a,b){var la=a.level==='강'?0:1,lb=b.level==='강'?0:1;return la-lb||PAT_ORDER.indexOf(a.name)-PAT_ORDER.indexOf(b.name);});
 if(pats[0])f.pat1={name:pats[0].name};if(pats[1])f.pat2={name:pats[1].name};
 if(ELS.indexOf(sd.lackEl)>=0)f.lack={el:sd.lackEl};
 var ck=climateKey(sd.climate);if(ck)f.clim={key:ck};
 PILLAR_ORDER.forEach(function(k){var p=P[k];if(!p)return;if(p.unseong)f['st_'+k.charAt(0)]={pillar:k,stage:p.unseong};});
 [['ys','year','stemTG'],['yb','year','branchTG'],['ms','month','stemTG'],['mb','month','branchTG'],['db','day','branchTG'],['hs','hour','stemTG'],['hb','hour','branchTG']].forEach(function(x){var p=P[x[1]];if(p&&TG_GROUP[p[x[2]]])f['tg_'+x[0]]={pillar:x[1],stem:x[2]==='stemTG',tg:p[x[2]]};});
 var rels=[].concat(sd.combinations||[],sd.clashes||[]).filter(function(r){return r&&r.type&&REL_TYPE_KEY[r.type]&&Array.isArray(r.members)&&r.members.length===2&&PILLAR_ORDER.indexOf(r.members[0])>=0&&PILLAR_ORDER.indexOf(r.members[1])>=0&&P[r.members[0]]&&P[r.members[1]];}).map(function(r){
  var s=(REL_TYPE_SCORE[r.type]||1)+(r.members.indexOf('day')>=0?3:0)+(r.members.indexOf('month')>=0?2:0);return {type:r.type,members:r.members,pair:pairKey(r.members[0],r.members[1]),score:s};}).sort(function(a,b){return b.score-a.score;});
 var seen={},uniq=[];rels.forEach(function(r){var k=r.pair+'/'+r.type;if(!seen[k]){seen[k]=1;uniq.push(r);}});
 if(uniq[0])f.rel1=uniq[0];if(uniq[1])f.rel2=uniq[1];if(uniq[2])f.rel3=uniq[2];
 var dw=sd.currentDaewoon;
 if(dw&&TG_GROUP[dw.stemTG]&&(!sd.nowYear||(dw.startYear<=sd.nowYear&&sd.nowYear<=dw.endYear))){
  var g=TG_GROUP[dw.stemTG];f.dwg={group:g,state:g===top?'same':g===weak?'fill':'other'};
  var el=STEM_EL[String(dw.ganzhi||'').charAt(0)],role=el&&sd.usefulElements&&sd.usefulElements.roles&&sd.usefulElements.roles[el];if(role)f.dwy={el:el,role:role};
  var list=sd.daewoon||[],at=-1;list.forEach(function(x,i){if(x&&x.ganzhi===dw.ganzhi&&x.startYear===dw.startYear)at=i;});var nx=at>=0?list[at+1]:null;if(nx&&TG_GROUP[nx.stemTG]&&Number.isFinite(nx.startYear))f.dwn={year:nx.startYear,group:TG_GROUP[nx.stemTG]};
  var dr=luckRel(dw.relations,P);if(dr)f.dwr=dr;}
 var nextY=(sd.annualLuck||[]).filter(function(a){return a&&sd.nowYear&&a.year===sd.nowYear+1&&TG_GROUP[a.stemTG];})[0];if(nextY)f.sen={year:nextY.year,group:TG_GROUP[nextY.stemTG]};
 var sw=sd.sewoon;
 if(sw&&(!sd.nowYear||sw.year===sd.nowYear)){
  if(TG_GROUP[sw.stemTG])f.seg={year:sw.year||sd.nowYear,group:TG_GROUP[sw.stemTG]};
  var sr=luckRel(sw.relations,P);if(sr)f.ser={year:sw.year||sd.nowYear,place:sr.place,type:sr.type};}
 return f;}
// 자리 설명은 같은 관점에서 자리마다 세 가지 표현을 돌려 쓰고, 한 문단 묶음 안에서 같은 자리를 다시 말할 때는 생략한다. 다 쓰고 나면 생략한다.
function pillarLine(lens,pillar,opt){if(opt.skipPillar)return '';var d=D(),arr=d.PILLAR&&d.PILLAR[lens]&&d.PILLAR[lens][pillar];if(!arr||!arr.length)return '';var i=opt.pv||0;return i<arr.length?arr[i]+' ':'';}
// 관점(lens)·요소·값에 맞는 문단 하나. 없으면 ''.
function text(lens,slot,v,opt){var d=D(),t,x;opt=opt||{};
 if(slot==='pair'){t=d.PAIR&&d.PAIR[lens]&&d.PAIR[lens][v.s+'|'+v.w];return t?'가장 큰 기운 '+v.s+'('+GLOSS[v.s]+')과 가장 작은 기운 '+v.w+'('+GLOSS[v.w]+')의 조합이에요. '+t:'';}
 if(slot==='pat1'||slot==='pat2'){t=d.PATTERN&&d.PATTERN[lens]&&d.PATTERN[lens][v.name];var pl=d.PATTERN&&d.PATTERN.PLAIN&&d.PATTERN.PLAIN[v.name];return t&&pl?'이 사주는 '+pl+'예요('+v.name+'). '+t:'';}
 if(slot==='lack'){t=d.LACK&&d.LACK[lens]&&d.LACK[lens][v.el];return t?'원국에 '+v.el+'('+EL_GLOSS[v.el]+') 기운이 거의 없어요. '+t:'';}
 if(slot==='clim'){t=d.CLIMATE&&d.CLIMATE[lens]&&d.CLIMATE[lens][v.key];var lb=d.CLIMATE&&d.CLIMATE.LABEL&&d.CLIMATE.LABEL[v.key];return t&&lb?'사주 전체의 기후는 '+lb+josa(lb,'이에요','예요')+'. '+t:'';}
 if(/^st_/.test(slot)){t=d.STAGE&&d.STAGE[lens]&&d.STAGE[lens][v.stage];var nm=PILLAR_NAME[v.pillar]+'주';
  return t?nm+'의 12운성은 ‘'+v.stage+'’'+josa(v.stage,'이에요','예요')+'. '+pillarLine(lens,v.pillar,opt)+t:'';}
 if(/^tg_/.test(slot)){var tgm=d.TG&&d.TG[lens]&&d.TG[lens][v.tg];var pos=PILLAR_NAME[v.pillar]+(v.stem?'간':'지');
  return tgm?pos+'에 '+v.tg+josa(v.tg,'이','가')+' 놓여 있어요. '+pillarLine(lens,v.pillar,opt)+tgm:'';}
 if(slot==='rel1'||slot==='rel2'||slot==='rel3'){var key=REL_TYPE_KEY[v.type],tm=d.RELTYPE&&d.RELTYPE[lens]&&d.RELTYPE[lens][key],pm=d.RELPAIR&&d.RELPAIR[lens]&&d.RELPAIR[lens][v.pair];
  return tm&&pm?relPlace(v.type,v.members)+' 사이에 '+v.type+josa(v.type,'이','가')+' 걸려 있어요. '+pm+' '+tm:'';}
 if(slot==='dwg'){t=d.DWG&&d.DWG[lens]&&d.DWG[lens][v.group+'|'+v.state];return t||'';}
 if(slot==='dwy'){t=d.DWY&&d.DWY[lens]&&d.DWY[lens][v.role];var rl=d.DWY&&d.DWY.ROLE&&d.DWY.ROLE[v.role];return t&&rl?'지금 대운의 천간은 '+v.el+'이고, 내 사주에서 '+v.el+josa(v.el,'은','는')+' '+v.role+'에 해당해요. '+t:'';}
 if(slot==='seg'){t=d.SEG&&d.SEG[lens]&&d.SEG[lens][v.group];return t?v.year+'년 세운의 천간은 '+v.group+'('+GLOSS[v.group]+') 기운이에요. '+t:'';}
 if(slot==='bandg'){t=d.BANDG&&d.BANDG[lens]&&d.BANDG[lens][v.band+'|'+v.g];var pb=d.BANDG&&d.BANDG.PLAIN&&d.BANDG.PLAIN[v.band];return t&&pb?pb+'이고, 가장 큰 기운은 '+v.g+'('+GLOSS[v.g]+')이에요. '+t:'';}
 if(slot==='dwn'){t=d.DWN&&d.DWN[lens]&&d.DWN[lens][v.group];return t?v.year+'년부터는 '+v.group+'('+GLOSS[v.group]+') 기운의 대운으로 바뀌어요. '+t:'';}
 if(slot==='sen'){t=d.SEN&&d.SEN[lens]&&d.SEN[lens][v.group];return t?v.year+'년 세운의 천간은 '+v.group+'('+GLOSS[v.group]+') 기운이에요. '+t:'';}
 if(slot==='dwr'){var k3=SEUN_TYPE_KEY[v.type],p3=d.DWR&&d.DWR.POS&&d.DWR.POS[lens]&&d.DWR.POS[lens][v.place],t3=d.DWR&&d.DWR.TYPE&&d.DWR.TYPE[lens]&&d.DWR.TYPE[lens][k3];
  return p3&&t3?'지금 대운의 지지는 내 '+(v.place==='day'?'일지':'월지')+'와 '+v.type+josa(v.type,'이','가')+' 걸려 있어요. '+p3+' '+t3:'';}
 if(slot==='ser'){var key2=SEUN_TYPE_KEY[v.type],ps=d.SER&&d.SER.POS&&d.SER.POS[lens]&&d.SER.POS[lens][v.place],ty=d.SER&&d.SER.TYPE&&d.SER.TYPE[lens]&&d.SER.TYPE[lens][key2];
  return ps&&ty?v.year+'년 세운의 지지는 내 '+(v.place==='day'?'일지':'월지')+'와 '+v.type+josa(v.type,'이','가')+' 걸려요. '+ps+' '+ty:'';}
 return '';}
// 사주 하나에 대해 장마다 쓸 요소를 정한다. 같은 사주면 언제나 같은 결과이고, 한 번 계산한 뒤 보관한다.
var CACHE=typeof WeakMap==='function'?new WeakMap():null;
function assign(sd){if(CACHE&&CACHE.has(sd))return CACHE.get(sd);
 var f=facts(sd),out={},used={self:{},wealth:{},career:{},love:{}},pcount={self:{},wealth:{},career:{},love:{}};
 function take(lens,id,list,limit){var got=out[id]||(out[id]=[]);for(var i=0;i<list.length&&got.length<limit;i++){var s=list[i];if(used[lens][s]||!f[s])continue;var pil=f[s].pillar,same=!!pil&&got.some(function(g){return g.pillar===pil;});var t=text(lens,s,f[s],{pv:pil?(pcount[lens][pil]||0):0,skipPillar:same});if(!t)continue;used[lens][s]=1;if(pil&&!same)pcount[lens][pil]=(pcount[lens][pil]||0)+1;got.push({key:s,text:t,pillar:pil||null});}}
 PLAN.forEach(function(p){take(p[1],p[0],p[2].concat(SPARE),1);});
 PLAN.forEach(function(p){take(p[1],p[0],p[2].concat(SPARE),2);});
 if(CACHE)CACHE.set(sd,out);return out;}
function paragraphs(c,sd){var id=c&&(c.editorialContractId||c.id);if(!id||!sd||!sd.dayMaster||!PLAN_BY_ID[id])return [];
 var a=assign(sd);return (a[id]||[]).map(function(x){return {key:x.key,text:x.text};});}
function html(c,esc){var sd=c&&c.readingVisualData,ps=paragraphs(c,sd);if(!ps.length)return '';
 return '<div class="reading-insight"><h3>이 사주에서만 읽히는 포인트</h3>'+ps.map(function(p){return '<p class="lead" data-reading-role="insight" data-insight-key="'+p.key+'">'+esc(p.text)+'</p>';}).join('')+'</div>';}
R.ReadingInsightData=R.ReadingInsightData||{};
R.ReadingInsight={paragraphs:paragraphs,html:html,facts:facts,assign:assign,PLAN:PLAN,SPARE:SPARE};
})(typeof window!=='undefined'?window:globalThis);
