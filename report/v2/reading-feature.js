/* 종합풀이 장에 "심화 풀이 블록"을 끼운다 — 점수 순위표·이미지·이유가 있는 깊이 풀이(Deep)를 새 풀이 화면(ReadingText)에서도 보여 준다.
   계산은 하지 않는다. deep*.js 의 SECTIONS 가 이미 만든 화면 조각을 장 질문에 맞는 것만 골라 붙이고, 장소 순위만 여기서 규칙으로 점수를 매긴다.
   입력: c.readingFeature = { M, ch, sd, now, name, assets, videos } (viewer.js 가 장마다 붙인다. 열거되지 않는 속성이라 저장·해시에 섞이지 않는다.)
   결과: { lead, rest } — lead 는 후킹 바로 아래(대표 이미지), rest 는 첫 풀이 문단 뒤. 해당 장이 아니거나 재료가 없으면 null. */
(function(root){'use strict';var R=root.ReportV2=root.ReportV2||{};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
// 장 → 붙일 조각. sec: Deep.SECTIONS 이름, take: 그 섹션의 화면 조각 번호, match: 화면 조각 글에 이 말이 있는 것만, custom: 이 파일이 만드는 조각, lead: 앞의 몇 개를 후킹 바로 아래에 둘지.
var SPEC={
 timeline_self_02:{title:'내 차의 사양 · 부품별 점검',parts:[{sec:'deep_car',take:[1,2,3,4]}]},
 timeline_self_20:{title:'내 에너지의 리듬 · 12운성',parts:[{sec:'deep_stages',take:[0,1,2]}]},
 timeline_self_25:{title:'솔직하게 · 장점과 단점',parts:[{sec:'deep_proscons'}]},
 timeline_self_26:{title:'나에게 맞는 일 · 점수 순위',parts:[{sec:'deep_jobs',skip:/일하는 방식의 성향|솔직하게, 힘들 수 있는 일/}]},
 timeline_self_27:{title:'인연이 열리는 곳 · 순위',parts:[{custom:'places'},{sec:'deep_love',match:/인연이 붙는 추천 행동|만남이 이뤄질 것 같은 (해|달)/}]},
 timeline_self_28:{title:'맞는 일주 · 끌리는 일주 · 부딪히는 일주',parts:[{sec:'deep_ilju',skip:/서로 끌리는 일주 TOP 5/}]},
 timeline_self_29:{title:'미래 배우자 한눈에 보기',lead:1,parts:[{sec:'deep_spouse'}]},
 timeline_self_31:{title:'내 재물 그릇 자세히 보기',lead:1,parts:[{sec:'deep_wealth',match:/MY WEALTH BOWL|② 재물의 성질|④ 재물 인연/}]},
 timeline_self_32:{title:'돈 버는 방식 · 점수표',parts:[{sec:'deep_wealth',match:/나에게 유리한 돈 버는 방식/}]},
 timeline_self_34:{title:'내 자식 자리 자세히 보기',lead:1,parts:[{sec:'deep_children',take:[0,1,2]}]},
 timeline_self_35:{title:'몸과 일상을 챙길 타이밍',parts:[{sec:'deep_health'}]},
 timeline_self_37:{title:'생활 속 개운법 · 근거',parts:[{sec:'deep_remedy'}]},
 timeline_self_24:{title:'움직이기 좋은 달 TOP 3',parts:[{custom:'timing',kind:'career',scope:'month'}]},
 timeline_self_33:{title:'50대 이후 대운 · 말년의 흐름',parts:[{custom:'late'}]},
 // ───── 재물운·커리어운·인연운 심화: 그 장의 질문에 해당하는 조각만. 같은 조각은 한 장에만 둔다.
 timeline_wealth_01:{title:'그릇의 힘과 사양표',parts:[{sec:'deep_wealth',match:/① 그릇의 힘|그릇 사양/}]},
 timeline_wealth_02:{title:'이렇게 벌면 편해요',parts:[{sec:'deep_wealth',match:/이렇게 벌면 편합니다/}]},
 timeline_wealth_03:{title:'돈이 새는 자리 점검',parts:[{sec:'deep_wealth',match:/③ 보관과 누수/}]},
 timeline_wealth_05:{title:'돈을 다루는 나의 성향',parts:[{sec:'deep_wealth',match:/돈을 다루는 나의 성향/}]},
 timeline_wealth_06:{title:'큰돈 기회가 몰리는 해 TOP 3',parts:[{custom:'timing',kind:'wealth',scope:'year'}]},
 timeline_wealth_07:{title:'이 그릇의 장점과 조심할 점',parts:[{sec:'deep_wealth',match:/이 그릇의 장점과 조심할 점/}]},
 timeline_wealth_10:{title:'재물이 유리한 달 TOP 3',parts:[{custom:'timing',kind:'wealth',scope:'month'}]},
 timeline_wealth_14:{title:'앞으로 10년 재물 흐름 그래프',parts:[{custom:'timing',kind:'wealth',scope:'chart'}]},
 timeline_career_01:{title:'일하는 방식 성향',parts:[{sec:'deep_jobs',match:/일하는 방식의 성향/}]},
 timeline_career_06:{title:'부담이 큰 일과 환경',parts:[{sec:'deep_jobs',match:/솔직하게, 힘들 수 있는 일/}]},
 timeline_career_08:{title:'일의 흐름이 좋은 해 TOP 3',parts:[{custom:'timing',kind:'career',scope:'year'}]},
 timeline_career_14:{title:'앞으로 10년 일의 흐름 그래프',parts:[{custom:'timing',kind:'career',scope:'chart'}]},
 timeline_love_05:{title:'서로 끌리는 일주 TOP 5',parts:[{sec:'deep_ilju',match:/서로 끌리는 일주 TOP 5/}]},
 timeline_love_08:{title:'결혼 이야기를 꺼내기 좋은 때',parts:[{sec:'deep_marriage',match:/결혼 이야기를 꺼내기 좋은 해|이야기를 나누기 좋은 달/}]},
 timeline_love_09:{title:'결혼 생활의 약한 고리와 예방',parts:[{sec:'deep_marriage',match:/결혼 생활에서 드러날|위험 요소|특히 조심할 시기|예방 처방/}]},
 timeline_love_11:{title:'부모가 되면 생기는 장면',parts:[{sec:'deep_children',take:[3,4]}]},
 timeline_love_14:{title:'앞으로 10년 인연 흐름 그래프',parts:[{custom:'timing',kind:'love',scope:'chart'}]}
};
/* ───── 인연이 열리는 장소 순위 ─────
   장소 10곳을 배우자성 오행·도화·신강약·배우자성 비중으로 점수화한다. 사건 예측이 아니라 "어떤 자리가 편한가"의 상대 순위다. */
var PLACE_EL={class:'목',nature:'목',intro:'토',event:'화',online:'수',work:'토',local:'토',gym:'금',trip:'수',bar:'화'};
var GEN={목:'화',화:'토',토:'금',금:'수',수:'목'};
var EL_HJ={목:'木',화:'火',토:'土',금:'金',수:'水'};
function hasDohwa(sd){var s=sd.sinsal12||{};return s.day==='연살'||s.hour==='연살'||(sd.specialStars||[]).some(function(x){return x.name==='홍염살'&&(x.pillar==='day'||x.pillar==='hour');});}
function placeRank(H){var D=R.Deep,L=R.DeepLove;if(!D||!L||!L.PLACES)return null;var sd=H.sd,P=L.partnerOf(sd),band=sd.strength&&sd.strength.band,ds=hasDohwa(sd),pct=Math.round(P.pct||0),rows=Object.keys(PLACE_EL).map(function(k,i){
  var el=PLACE_EL[k],score=38,why=[];
  if(el===P.el){score+=30;why.push('이 자리의 기운('+el+EL_HJ[el]+')이 '+P.grp+'(배우자성)의 기운과 같아서 마음이 잘 맞는 사람을 만나기 쉬워요');}
  else if(GEN[el]===P.el){score+=20;why.push('이 자리의 '+el+EL_HJ[el]+' 기운이 배우자성 '+P.el+EL_HJ[P.el]+' 기운을 키워 줘요');}
  else if(GEN[P.el]===el){score+=8;why.push('배우자성 '+P.el+EL_HJ[P.el]+' 기운이 자연스럽게 흘러가는 자리예요');}
  if(ds&&(k==='event'||k==='bar')){score+=12;why.push('도화·홍염 기운이 있어 눈에 띄는 자리에서 인연이 붙기 쉬워요');}
  if(band==='신약'&&(k==='intro'||k==='local'||k==='work')){score+=k==='intro'?8:5;why.push('힘이 여린 사주라 믿을 만한 사람을 통해 천천히 알아 가는 자리가 안전해요');}
  if(band==='신강'&&(k==='event'||k==='trip'||k==='gym')){score+=k==='trip'?6:5;why.push('힘이 센 사주라 내가 먼저 움직이는 자리에서 더 잘 풀려요');}
  if(pct<10&&(k==='online'||k==='class'||k==='intro')){score+=5;why.push('배우자성이 적은 편(약 '+pct+'%)이라 만날 기회를 직접 만드는 자리가 유리해요');}
  return {k:k,i:i,score:Math.max(20,Math.min(96,score)),why:why};}).sort(function(a,b){return b.score-a.score||a.i-b.i;}).slice(0,5);
 var out='<section class="dp-embed dp"><div class="cap">'+esc('인연이 열리기 쉬운 곳 TOP 5')+'</div><p class="lead">'+esc((D.who(H))+'의 '+(P.male?'아내':'남편')+'별은 ')+'<b>'+esc(P.grp+'('+P.el+EL_HJ[P.el]+')')+'</b>'+esc('이에요. 이 기운과 장소 10곳의 궁합을 점수로 옮겼어요. 만날 사람을 맞히는 점수가 아니라 "어느 자리에서 인연이 열리기 편한가"의 순위예요.')+(ds?esc(' 도화 기운이 있어 사람이 모이는 자리도 함께 올렸어요.'):'')+'</p></section>';
 rows.forEach(function(r,n){var p=L.PLACES[r.k];out+='<section class="dp-embed dp dp-job"><div class="dp-jobrow">'+D.fig(H,'place:'+r.k,'place',p[0],'dp-thumb')+'<div class="dp-jobtxt"><small>'+(n+1)+'순위</small><h4>'+esc(p[0])+'</h4><div class="dp-meter"><span>인연 열림 <b>'+r.score+'점</b></span>'+D.bar('',r.score,{cls:'dp-slim',color:'#D9869A',text:''})+'</div><p class="dp-tlb">'+esc(p[1])+'</p></div></div><p class="dp-pl">＋ '+esc(p[2])+'</p>'+(r.why.length?whyLine(r.why):'')+'</section>';});
 return out;}
/* ───── 앞으로 10년 시기 순위·그래프 ─────
   엔진이 세운마다 주는 값만 읽는다: 재물·인연은 evaluateDomainLuck 의 wealth/love 지수, 커리어는 엔진 운 점수(deep_seun 과 같은 환산).
   사건 예측이 아니라 "어느 해·달에 힘이 실리는가"의 상대 비교다. */
var KIND={wealth:{name:'재물 지수',color:'#E6B866',unit:'재물'},love:{name:'인연 지수',color:'#D9869A',unit:'인연'},career:{name:'일 흐름 지수',color:'#5FBF9A',unit:'일'}};
function rowsOf(H,kind,scope){var D=R.Deep,M=H.M,ch=H.ch,sd=H.sd,Y=sd.nowYear,list=[],lv=scope==='month'?'wolun':'seun';
 if(scope==='month'){var all=M.wolun(ch,Y).concat(M.wolun(ch,Y+1)),now=H.now||Date.now(),ci=0;all.forEach(function(x,i){if(x.startMs<=now)ci=i;});list=all.slice(ci,ci+12);}else list=M.seunRange(ch,Y,Y+9);
 return list.map(function(x,i){var v,why='',d=null;
  if(kind==='career'){v=D.pct10(D.scoreOf(x));why=(D.TG_DO[x.stemTG]||'새 흐름을 맞는')+' 시기';}
  else{try{d=M.evaluateDomainLuck(ch,x,lv);}catch(e){}var o=d&&d[kind];if(!o)return null;v=Math.max(0,Math.min(100,Math.round(o.score)));why=o.summary||o.band||'';}
  var label=scope==='month'?((new Date(x.startMs).getMonth()+1)+'월 · '+(x.termName||'')):(x.year+'년 '+M.gzNameK(x));
  return {i:i,v:v,label:label,why:why};}).filter(Boolean);}
function timingRank(H,kind,scope){var D=R.Deep,K=KIND[kind];if(!D||!K||!H.M)return null;var rows=rowsOf(H,kind,scope);if(rows.length<3)return null;
 var top=rows.slice().sort(function(a,b){return b.v-a.v||a.i-b.i;}).slice(0,3),star=top.map(function(r){return r.i;}),out='<section class="dp-embed dp"><div class="cap">'+esc(scope==='chart'?'앞으로 10년 '+K.unit+' 흐름':scope==='month'?'앞으로 12개월 중 '+K.unit+'에 힘이 실리는 달':'앞으로 10년 중 '+K.unit+'에 힘이 실리는 해')+'</div><p class="dp-lead2">'+esc(K.name+'는 엔진이 계산한 상대 점수예요. 사건을 맞히는 값이 아니라 어느 때에 힘이 실리는지 비교하는 참고예요.'+(scope==='chart'?' ★는 상위 3개예요.':''))+'</p>';
 if(scope==='chart'){out+='<div class="dp-bars">'+rows.map(function(r){return D.bar((star.indexOf(r.i)>=0?'★ ':'')+r.label,r.v,{text:r.v+'점',color:star.indexOf(r.i)>=0?K.color:''});}).join('')+'</div>';}
 else{out+='<div class="dp-bars">'+top.map(function(r,n){return D.bar((n+1)+'순위 · '+r.label,r.v,{text:r.v+'점',color:K.color});}).join('')+'</div><ul class="dp-ul">'+top.map(function(r){return '<li><b>'+esc(r.label)+'</b> — '+esc(r.why)+'</li>';}).join('')+'</ul>';}
 return out+'</section>';}
/* ───── 사주 값으로 점수를 매기는 순위·순서 블록 ─────
   문안은 reading-feature-data-*.js(MantraFeatureData). 특징키: b:신강약 · t:가장 큰 십성군 · l:가장 작은 십성군 · e:일간 오행 또는 천간 · g:성별.
   점수 = 40 + 맞는 특징의 가산점. 사건 예측이 아니라 "내 구조에서 어느 쪽이 더 두드러지거나 편한가"의 상대 순서다. */
function whySentence(t){t=String(t||'').trim().replace(/[.。]$/,'');if(!t)return '';t=t.replace(/(이)?(라서요|이어서요)$/,'이에요').replace(/되어서요$/,'돼요').replace(/서요$/,'요');return t+'.';}
function whyLine(list){var x=(list||[]).map(whySentence).filter(Boolean);return x.length?'<p class="dp-mi"><span class="dp-why-k">이 순위인 이유</span>'+esc(x.join(' '))+'</p>':'';}
function featuresOf(sd){var f={},st=sd.dayMaster||{};if(sd.strength&&sd.strength.band)f['b:'+sd.strength.band]=1;if(sd.dominantGroup)f['t:'+sd.dominantGroup]=1;if(sd.weakestGroup)f['l:'+sd.weakestGroup]=1;if(st.el)f['e:'+st.el]=1;if(st.stem)f['e:'+st.stem]=1;if(sd.gender)f['g:'+sd.gender]=1;return f;}
function rankBlock(id,H){var D=R.Deep,data=root.MantraFeatureData&&root.MantraFeatureData[id];if(!D||!data||!H.sd)return null;var f=featuresOf(H.sd),steps=data.mode==='steps',rows=data.items.map(function(it,i){var hit=(it.w||[]).filter(function(w){return f[w[0]];}),pts=hit.reduce(function(a,w){return a+w[1];},0);hit.sort(function(a,b){return b[1]-a[1];});return {it:it,i:i,score:Math.max(35,Math.min(96,52+pts)),why:hit.slice(0,2).map(function(w){return w[2];})};}).sort(function(a,b){return b.score-a.score||a.i-b.i;});
 var out='<section class="dp-embed dp"><p class="lead">'+esc(data.lead)+'</p></section>';
 rows.forEach(function(r,n){out+='<section class="dp-embed dp dp-job"><small class="dp-rank">'+(steps?'먼저 '+(n+1):(n+1)+'순위')+'</small><h4>'+esc(r.it.n)+'</h4>'+(steps?'':'<div class="dp-meter"><span>'+esc(data.label||'어울림')+' <b>'+r.score+'점</b></span>'+D.bar('',r.score,{cls:'dp-slim',color:'#D5B97F',text:''})+'</div>')+'<p class="dp-tlb">'+esc(r.it.d)+'</p><p class="dp-pl">해볼 일 · '+esc(r.it.t)+'</p>'+whyLine(r.why)+'</section>';});
 return out;}
/* 말년: 50세 이후 대운을 나이대별로 보여 준다(엔진이 계산한 대운 계절·십성만 읽는다). */
function lateLuck(H){var D=R.Deep,dw=((H.sd&&H.sd.daewoon)||[]).filter(function(x){return x.startAge>=50&&x.startAge<=75;}).slice(0,4);if(!D||!dw.length)return null;
 return '<section class="dp-embed dp"><div class="cap">'+esc('50대 이후 대운 · 나이대별 흐름')+'</div><p class="dp-lead2">'+esc('말년의 흐름은 한 줄로 정해지지 않고, 10년 단위 대운이 바뀌며 달라져요. 엔진이 계산한 대운의 계절과 십성을 나이대별로 풀었어요. 건강·수명을 말하는 표가 아니라 생활의 분위기를 보는 참고예요.')+'</p><ul class="dp-ul">'+dw.map(function(x){return '<li><b>'+esc(D.ageSpan(x.startAge,x.startAge+9))+' · '+esc(x.ganzhi)+' 대운</b> — '+esc((D.TG_DO[x.stemTG]||'새 흐름을 맞는')+' 시기')+(D.SEA_MOOD[x.season]?esc(' · 전체 분위기는 '+D.SEA_MOOD[x.season]+' 쪽이에요'):'')+'</li>';}).join('')+'</ul></section>';}
function embed(html){return String(html||'').replace(/^<section class="scene rv dp/,'<section class="dp-embed dp');}
function build(c){var f=c&&c.readingFeature,id=c&&(c.editorialContractId||c.id),spec=SPEC[id],D=R.Deep;if(!f||!f.sd||!spec||!D||!D.SECTIONS)return null;
 var key=id+':'+Object.keys(f.assets||{}).length+':'+(R.TopicDeep?R.TopicDeep.rev:0);   // TopicDeep(주제 심화 2차)이 늦게 준비되면 다시 만든다if(c.__rfCache&&c.__rfCache.key===key)return c.__rfCache.out;
 var scenes=[];
 spec.parts.forEach(function(part){try{
  if(part.custom==='places'){var p=placeRank(f);if(p)scenes.push(p);return;}
  if(part.custom==='rank'){var rk=rankBlock(id,f);if(rk)scenes.push(rk);return;}
  if(part.custom==='late'){var lt=lateLuck(f);if(lt)scenes.push(lt);return;}
  if(part.custom==='timing'){var t=timingRank(f,part.kind,part.scope);if(t)scenes.push(t);return;}
  if(part.custom&&R.TopicDeep&&R.TopicDeep.has(part.custom)){var td=R.TopicDeep.render(part,f,id);if(td)scenes.push(td);return;}   // topic-deep.js(스위치 topicDeep)
  var fn=D.SECTIONS[part.sec];if(!fn)return;var list=(fn(f).scenes||[]).map(function(s){return embed(s.html);});
  if(part.take)list=part.take.map(function(i){return list[i];}).filter(Boolean);
  if(part.match)list=list.filter(function(h){return part.match.test(h.replace(/<[^>]+>/g,' '));});
  if(part.skip)list=list.filter(function(h){return !part.skip.test(h.replace(/<[^>]+>/g,' '));});
  scenes=scenes.concat(list);}catch(e){}});
 var out=null;if(scenes.length){var lead=Math.min(spec.lead||0,scenes.length),rest=scenes.slice(lead);
  out={id:id,lead:lead?'<div class="reading-feature reading-feature-lead" data-reading-feature="'+esc(id)+'">'+scenes.slice(0,lead).join('')+'</div>':'',rest:rest.length?'<div class="reading-feature" data-reading-feature="'+esc(id)+'"><h3 class="reading-feature-title">'+esc(spec.title)+'</h3>'+rest.join('')+'</div>':''};}
 try{Object.defineProperty(c,'__rfCache',{value:{key:key,out:out},writable:true,configurable:true,enumerable:false});}catch(e){}
 return out;}
Object.keys(root.MantraFeatureData||{}).forEach(function(k){if(!SPEC[k])SPEC[k]={title:root.MantraFeatureData[k].title,parts:[{custom:'rank'}]};});
R.ReadingFeature={build:build,placeRank:placeRank,timingRank:timingRank,SPEC:SPEC};
if(typeof module!=='undefined'&&module.exports)module.exports=R.ReadingFeature;
})(typeof window!=='undefined'?window:globalThis);
