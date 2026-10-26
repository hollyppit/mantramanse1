/* 유료 풀이 보강 카드: 나의 시그니처(조합 해석)·한 장 요약, 주제별 시그니처 렌즈, 이번 대운의 과제, 앞으로 12개월 테마 달력, 30일 실천 체크리스트,
   그리고 개인화 문단마다 "내 얘기 같나요?" 반응 버튼. 엔진이 계산한 값만 쓰고 AI·네트워크 호출이 없다. 시기는 사건이 아니라 생활 과제로만 말한다. */
(function(root){'use strict';var R=root.ReportV2=root.ReportV2||{};
var D=root.MantraSignatureData||{F:{},ORDER:[],P:{},MAP:{},BAND:{},YEAR:{}};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var TOPIC_KO={self:'나',wealth:'재물',career:'일',love:'관계',health:'생활 리듬',remedy:'개운 습관'};
var SEASON_KO={opportunity:'기회기',expansion:'확장기',harvest:'수확기',accumulation:'축적기',transition:'전환기',defense:'방어기'};
var SEASON_MONTH={opportunity:'새 일을 시작하거나 제안하기 좋은 달이에요.',expansion:'하던 일을 넓히고 알리기 좋은 달이에요.',harvest:'결과를 정리하고 받을 것을 챙기기 좋은 달이에요.',accumulation:'배우고 준비하며 힘을 모으기 좋은 달이에요.',transition:'방향을 점검하고 정리하기 좋은 달이에요.',defense:'무리한 확장보다 지키고 쉬기 좋은 달이에요.'};
var TG_MONTH={비견:'내 기준대로 밀고 가는 힘',겁재:'경쟁 속에서 버티는 힘',식신:'만들고 즐기는 힘',상관:'말과 표현으로 돌파하는 힘',편재:'기회를 넓게 잡는 힘',정재:'꼼꼼히 챙기고 모으는 힘',편관:'압박을 견디는 힘',정관:'규칙 안에서 인정받는 힘',편인:'혼자 깊이 생각하는 힘',정인:'배우고 준비하는 힘'};
var DAEWOON={opportunity:'이번 10년은 새로운 시도로 판을 여는 시기로 읽어요.',expansion:'이번 10년은 해 온 일을 넓히고 키우는 시기로 읽어요.',harvest:'이번 10년은 쌓아 온 것을 거두고 정리하는 시기로 읽어요.',accumulation:'이번 10년은 배우고 다지며 힘을 모으는 시기로 읽어요.',transition:'이번 10년은 방향을 바꾸고 새 판을 준비하는 시기로 읽어요.',defense:'이번 10년은 무리보다 지키고 정비하는 시기로 읽어요.'};
var TG_TASK={비견:'과제는 내 힘으로 서는 기반을 만드는 거예요.',겁재:'과제는 경쟁 속에서 내 몫을 지키는 기준을 세우는 거예요.',식신:'과제는 재능을 꾸준한 결과물로 만드는 거예요.',상관:'과제는 표현과 개성을 일로 연결하는 거예요.',편재:'과제는 넓어진 기회를 관리하는 구조를 만드는 거예요.',정재:'과제는 안정적인 수입과 저축의 틀을 다지는 거예요.',편관:'과제는 압박을 버티되 소진되지 않는 리듬을 찾는 거예요.',정관:'과제는 책임과 평판을 쌓아 자리를 다지는 거예요.',편인:'과제는 나만의 전문 영역을 깊게 파는 거예요.',정인:'과제는 배움과 자격으로 기반을 단단히 하는 거예요.'};
var EL_TIP={목:'배우고 키우는 활동',화:'사람과 어울리고 표현하는 활동',토:'규칙적인 생활 리듬',금:'정리와 마무리 습관',수:'생각을 정리하고 쉬는 시간'};
var CONDITION={순풍:' 흐름이 순한 때라 미뤄 둔 일을 꺼내기 좋아요.',주의:' 다만 부담 신호가 있어서 속도를 한 단계 낮추고 확인을 한 번 더 하세요.',부담:' 다만 부담이 큰 때라 새로 벌이기보다 쉬는 시간과 여유를 먼저 확보하세요.'};
var TIMING_NOTE='시기 해석은 엔진이 계산한 운의 흐름을 생활 과제로 바꾼 것이고, 사건이나 결과를 예측하지 않아요.';
var DISPLAY={연살:'도화살'};
function topicOf(id){var m=/^timeline_([a-z]+)_([0-9]+)$/.exec(id||'');return m?{topic:m[1],n:Number(m[2])}:null;}
// ───────── 시그니처: 사주 요소를 성향군으로 묶어 점수를 매긴다(드문 요소일수록 무겁게) ─────────
function signature(sd){
 if(!sd||!sd.dayMaster)return null;
 var CL=root.MantraChartLines,FREQ=CL&&CL.FREQ||{},parts={},bonus={},score={},src={};
 var rarity=function(n){var f=FREQ[n];return f?Math.min(3,Math.sqrt(1500/Math.max(f,30))):1;};
 var add=function(kind,name,w){var fam=D.MAP[kind]&&D.MAP[kind][name];if(!fam||!(w>0))return;if(kind==='tg'||kind==='group')bonus[fam]=(bonus[fam]||0)+w;else (parts[fam]=parts[fam]||[]).push(w);(src[fam]=src[fam]||[]);var shown=DISPLAY[name]||name;if(src[fam].indexOf(shown)<0)src[fam].push(shown);};
 (sd.specialStars||[]).forEach(function(s){if(s&&s.name)add('star',s.name,rarity(s.name));});
 Object.keys(sd.sinsal12||{}).forEach(function(k){var n=sd.sinsal12[k];if(typeof n==='string')add('s12',n,rarity(n));});
 [].concat(sd.combinations||[],sd.clashes||[]).forEach(function(r){if(r&&r.type)add('rel',r.type,rarity(r.type)*0.8);});
 Object.keys(sd.tenGods||{}).forEach(function(k){var v=Number(sd.tenGods[k]);if(v>=20)add('tg',k,v/20);});
 var g=sd.groups||{},top=Object.keys(g).sort(function(a,b){return g[b]-g[a];})[0];if(top)add('group',top,Number(g[top])/25);
 // 같은 성향군에 묶인 요소가 많아도 기여도 상위 2개만 더한다(십성·십성군은 따로 더한다).
 D.ORDER.forEach(function(f){var top2=(parts[f]||[]).slice().sort(function(a,b){return b-a;}).slice(0,2).reduce(function(x,y){return x+y;},0);score[f]=top2+(bonus[f]||0);});
 var fams=D.ORDER.filter(function(f){return score[f]>0;}).sort(function(a,b){return score[b]-score[a]||D.ORDER.indexOf(a)-D.ORDER.indexOf(b);}).slice(0,3);
 if(fams.length<2)return null;
 var pair=D.P[fams[0]+'+'+fams[1]]||D.P[fams[1]+'+'+fams[0]]||'';
 return {top:fams.map(function(f){return {key:f,label:D.F[f].label,core:D.F[f].core,sources:(src[f]||[]).slice(0,3),score:Math.round(score[f]*10)/10};}),pair:pair,band:sd.strength&&D.BAND[sd.strength.band]||''};
}
function feedback(part,label,force){if(force!==true)return '';return '<div class="part-feedback" data-part="'+esc(part)+'"><span>'+esc(label||'내 얘기 같나요?')+'</span><button type="button" data-part-feedback="agree">맞아요</button><button type="button" data-part-feedback="disagree">아니에요</button><em data-part-status></em></div>';}
// ───────── 개인화 문단 판별(반응 버튼용): 사주 요소 문장·일간/월지/용신 문장 ─────────
var AGAIN=/^([가-힣]+?)(?:은|는) 이 장에서도|^([가-힣]+)의 (?:결이|흔적은|영향이|결은|힘은|기운이) |^이 장에서도 ([가-힣]+)의 /;
function partFor(text){
 var t=String(text||'').replace(/^[^ ]{1,41}님은 (?=사주)/,''),m;
 if((m=/^사주에 ([가-힣]+?)(?:이|가) 있어요[.]/.exec(t))||(m=/^사주 글자들 사이에 ([가-힣]+?)(?:이|가) 걸려 있어요[.]/.exec(t))||(m=/^사주에 ([가-힣]+)의 힘이 두드러져요[.]/.exec(t)))return 'el:'+m[1];
 if((m=AGAIN.exec(t)))return 'el:'+(m[1]||m[2]||m[3]);
 if(/^[갑을병정무기경신임계][목화토금수] 일간/.test(t))return 'dt:dm';
 if(/^[가-힣]+[(][자축인묘진사오미신유술해]월[)](?: 출생|에 태어나)/.test(t))return 'dt:mb';
 if(/^용신|^[목화토금수] 용신의 결|^균형을 잡아 주는 [목화토금수] 기운/.test(t))return 'dt:yong';
 return '';
}
// ───────── 카드들 ─────────
function signatureCard(sd){
 var s=signature(sd);if(!s)return '';var name=sd.name?esc(sd.name)+'님':'이 사주';
 return '<div class="plus-card plus-signature"><h3>나의 시그니처</h3><p class="plus-lead">'+name+'을 가장 잘 설명하는 세 가지 성향이에요. 아래 장들의 풀이는 이 세 가지가 장면마다 어떻게 나타나는지를 보여 줘요.</p><ol>'+
  s.top.map(function(f){return '<li><strong>'+esc(f.label)+'</strong><span>'+esc(f.core)+'</span>'+(f.sources.length?'<small>계산 근거: '+esc(f.sources.join(' · '))+'</small>':'')+'</li>';}).join('')+'</ol>'+
  (s.pair?'<p class="plus-pair">'+esc(s.pair)+'</p>':'')+(s.band?'<p>'+esc(s.band)+'</p>':'')+feedback('sig:'+s.top[0].key)+'</div>';
}
function summaryCard(sd){
 var s=signature(sd),rows=[];if(s)rows.push(['성향',s.top.map(function(f){return f.label;}).join(' · ')]);
 var band=sd.strength&&sd.strength.band;if(band)rows.push(['힘의 균형',band+'. '+(D.BAND[band]||'')]);
 var yong=sd.usefulElements&&sd.usefulElements.yong;if(yong&&EL_TIP[yong])rows.push(['균형을 잡아 주는 기운',yong+'(용신). '+EL_TIP[yong]+'이 생활의 중심을 잡아 줘요.']);
 var se=sd.sewoon;if(se&&se.season&&D.YEAR[se.season])rows.push([(se.year||sd.nowYear||'올해')+'년 흐름',(se.label?se.label+'. ':'')+D.YEAR[se.season]+(CONDITION[se.condition]||'')]);
 var dw=sd.currentDaewoon;if(dw&&dw.season&&DAEWOON[dw.season])rows.push(['지금 대운',(dw.ganzhi?dw.ganzhi+' 대운'+(dw.startYear?'('+dw.startYear+'~'+dw.endYear+')':'')+'. ':'')+DAEWOON[dw.season]]);
 if(!rows.length)return '';
 var hourUnknown=sd.pillars&&!sd.pillars.hour||sd.reviewConditions&&sd.reviewConditions.hourUnknown;
 return '<div class="plus-card plus-summary"><h3>한 장 요약</h3><dl>'+rows.map(function(r){return '<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>';}).join('')+'</dl><p class="plus-note">'+esc(TIMING_NOTE)+(hourUnknown?' 출생 시간이 없어 시주(일의 마무리·말년·자녀와 관련된 자리)를 근거로 한 풀이는 정확도가 낮을 수 있어요.':'')+'</p></div>';
}
function lensCard(sd,topic){
 var s=signature(sd);if(!s)return '';var a=D.F[s.top[0].key].topic[topic],b=D.F[s.top[1].key].topic[topic];if(!a)return '';
 return '<div class="plus-card plus-lens"><h3>내 시그니처로 보는 '+esc(TOPIC_KO[topic]||'')+'</h3><p>'+esc(a)+'</p>'+(b&&b!==a?'<p>'+esc(b)+'</p>':'')+feedback('lens:'+topic)+'</div>';
}
function daewoonCard(sd){
 var dw=sd.currentDaewoon;if(!dw||!dw.season||!DAEWOON[dw.season])return '';
 var list=sd.daewoon||[],idx=-1;for(var i=0;i<list.length;i++)if(list[i]&&list[i].startYear===dw.startYear)idx=i;var nx=idx>=0?list[idx+1]:null;
 var lines=[DAEWOON[dw.season]];if(dw.stemTG&&TG_TASK[dw.stemTG])lines.push(TG_TASK[dw.stemTG]);
 if(nx&&nx.startYear&&nx.season&&SEASON_KO[nx.season])lines.push('다음 대운은 '+nx.startYear+'년부터 '+(nx.ganzhi?nx.ganzhi+' 대운, ':'')+SEASON_KO[nx.season]+' 흐름으로 이어져요.'+(sd.nowYear&&nx.startYear>sd.nowYear?' 앞으로 '+(nx.startYear-sd.nowYear)+'년 동안 지금의 과제를 정리해 두면 전환이 편해요.':''));
 return '<div class="plus-card plus-daewoon"><h3>이번 대운 10년의 과제</h3><p class="plus-lead">'+esc((dw.ganzhi||'')+' 대운 · '+(dw.startYear||'')+'~'+(dw.endYear||'')+' · '+(SEASON_KO[dw.season]||''))+'</p>'+lines.map(function(t){return '<p>'+esc(t)+'</p>';}).join('')+'<p class="plus-note">'+esc(TIMING_NOTE)+'</p>'+feedback('lens:daewoon')+'</div>';
}
function calendarCard(sd){
 var months=(sd.monthlyLuck||[]).filter(function(m){return m&&m.month&&m.season;});if(!months.length)return '';
 return '<div class="plus-card plus-calendar"><h3>앞으로 12개월 테마 달력</h3><p class="plus-lead">달마다 쓰기 좋은 힘과 집중할 방향이에요. 좋은 달·나쁜 달을 가르는 표가 아니라 그달의 생활 과제를 정리한 표예요.</p><ol>'+
  months.slice(0,12).map(function(m){return '<li'+(m.isNow?' class="is-now"':'')+'><b>'+esc(m.year+'.'+m.month+'월')+(m.isNow?' (이번 달)':'')+'</b><em>'+esc(m.label||SEASON_KO[m.season]||'')+'</em><span>'+esc((SEASON_MONTH[m.season]||'')+(TG_MONTH[m.stemTG]?' 이달은 '+TG_MONTH[m.stemTG]+'이 잘 쓰여요.':'')+(CONDITION[m.condition]||''))+'</span></li>';}).join('')+
  '</ol><p class="plus-note">'+esc(TIMING_NOTE)+'</p>'+feedback('lens:calendar')+'</div>';
}
function planItems(sd){
 var s=signature(sd);if(!s)return [];var weeks=[];
 s.top.forEach(function(f,i){weeks.push({title:(i+1)+'주차 · '+f.label+' 다루기',items:D.F[f.key].practice.slice(0,3)});});
 var yong=sd.usefulElements&&sd.usefulElements.yong,last=['30일 동안 가장 잘 맞았던 습관 하나를 다음 달에도 이어 가기'];if(yong&&EL_TIP[yong])last.unshift(EL_TIP[yong]+'을 하루 10분 넣기');
 weeks.push({title:'4주차 · 균형 잡기',items:last});return weeks;
}
function planKey(sd){var s=signature(sd);return 'mt-plan-'+((sd.dayPillar&&sd.dayPillar.ko)||(sd.pillars&&sd.pillars.day&&sd.pillars.day.ko)||'x')+'-'+(s?s.top.map(function(f){return f.key;}).join('.'):'');}
function readPlan(key){try{return JSON.parse(root.localStorage&&root.localStorage.getItem(key)||'{}')||{};}catch(e){return {};}}
function checklistCard(sd){
 var weeks=planItems(sd);if(!weeks.length)return '';var key=planKey(sd),done=readPlan(key),n=0;
 return '<div class="plus-card plus-plan" data-plan-key="'+esc(key)+'"><h3>나만의 30일 실천 체크리스트</h3><p class="plus-lead">내 시그니처에서 뽑은 습관이에요. 체크는 이 기기에만 저장돼요.</p>'+
  weeks.map(function(w){return '<fieldset><legend>'+esc(w.title)+'</legend>'+w.items.map(function(t){var id='p'+(n++);return '<label><input type="checkbox" data-plan-item="'+id+'"'+(done[id]?' checked':'')+'> '+esc(t)+'</label>';}).join('')+'</fieldset>';}).join('')+feedback('lens:plan','이 계획, 나에게 맞나요?')+'</div>';
}
function html(c){
 var id=c&&(c.editorialContractId||c.id),sd=c&&c.readingVisualData,t=topicOf(id);if(!t||!sd||!sd.dayMaster)return '';
 if(id==='timeline_self_01')return signatureCard(sd)+summaryCard(sd);
 if(id==='timeline_self_20')return daewoonCard(sd);
 if(id==='timeline_self_21')return calendarCard(sd);
 if(id==='timeline_remedy_07')return checklistCard(sd);
 if(t.n===1&&t.topic!=='self'&&t.topic!=='creative')return lensCard(sd,t.topic);
 return '';
}
// ───────── 클릭 처리: 반응 버튼(측정), 체크리스트(이 기기 저장) ─────────
var installed=false;
function install(){
 if(installed||!root.document)return;installed=true;
 root.document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('[data-part-feedback]');if(!b)return;var box=b.closest('[data-part]'),sec=b.closest('[data-sc]'),chapter=sec&&sec.getAttribute('data-sc')?sec.getAttribute('data-sc').split('_text_')[0]:'';
  if(!box||!chapter)return;try{if(R.Analytics)R.Analytics.trackEvent('part_feedback',{chapter:chapter,part:box.getAttribute('data-part'),answer:b.getAttribute('data-part-feedback')});}catch(x){}
  var st=box.querySelector('[data-part-status]');if(st)st.textContent='알려 주셔서 고마워요.';box.querySelectorAll('button').forEach(function(x){x.disabled=true;});});
 root.document.addEventListener('change',function(e){var i=e.target;if(!i||!i.getAttribute||!i.getAttribute('data-plan-item'))return;var card=i.closest('[data-plan-key]');if(!card)return;var key=card.getAttribute('data-plan-key'),done=readPlan(key);done[i.getAttribute('data-plan-item')]=!!i.checked;try{root.localStorage&&root.localStorage.setItem(key,JSON.stringify(done));}catch(x){}});
}
install();
R.ReadingPlus={html:html,signature:signature,partFor:partFor,feedback:feedback,planItems:planItems,version:'reading-plus-20261026-1'};
})(typeof window!=='undefined'?window:globalThis);
