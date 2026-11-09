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
 timeline_self_26:{title:'타고난 강점과 맞는 일',parts:[{custom:'talent'},{sec:'deep_jobs',skip:/일하는 방식의 성향|솔직하게, 힘들 수 있는 일/}]},
 timeline_self_27:{title:'인연이 열리는 곳 · 순위',parts:[{custom:'places'},{sec:'deep_love',match:/인연이 붙는 추천 행동|만남이 이뤄질 것 같은 (해|달)/}]},
 timeline_self_28:{title:'맞는 일주 · 끌리는 일주 · 부딪히는 일주',parts:[{sec:'deep_ilju',skip:/서로 끌리는 일주 TOP 5/}]},
 timeline_self_29:{title:'미래 배우자 더 자세히',lead:1,parts:[{sec:'dossier_spouse'},{sec:'deep_spouse',skip:/미래 연인 · 배우자 추정/}]},
 timeline_self_36:{title:'전생 이야기 · 네 장면',lead:1,parts:[{sec:'dossier_past'},{sec:'deep_past',skip:/전생 · 이걸 드라마로/}]},
 timeline_self_31:{title:'내 재물 그릇 자세히 보기',lead:1,parts:[{sec:'deep_wealth',match:/MY WEALTH BOWL|② 재물의 성질|④ 재물 인연/}]},
 timeline_self_32:{title:'돈 버는 방식 · 점수표',parts:[{sec:'deep_wealth',match:/나에게 유리한 돈 버는 방식/}]},
 timeline_self_34:{title:'내 자식 자리 자세히 보기',lead:1,parts:[{sec:'deep_children',take:[0,1,2]}]},
 timeline_self_35:{title:'몸과 일상을 챙길 타이밍',parts:[{custom:'healthmap'},{sec:'deep_health',skip:/내 생활에 해당하는 예방 행동/}]},
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
var EL_MOOD={목:'자라고 배우는',화:'밝고 들뜬',토:'편안하고 믿음 가는',금:'정돈되고 분명한',수:'흐르고 넓게 이어지는'};
function hasDohwa(sd){var s=sd.sinsal12||{};return s.day==='연살'||s.hour==='연살'||(sd.specialStars||[]).some(function(x){return x.name==='홍염살'&&(x.pillar==='day'||x.pillar==='hour');});}
function placeRank(H){var D=R.Deep,L=R.DeepLove;if(!D||!L||!L.PLACES)return null;var sd=H.sd,P=L.partnerOf(sd),band=sd.strength&&sd.strength.band,ds=hasDohwa(sd),pct=Math.round(P.pct||0),rows=Object.keys(PLACE_EL).map(function(k,i){
  var el=PLACE_EL[k],score=38,why=[];
  if(el===P.el){score+=30;why.push('이곳은 '+EL_MOOD[el]+' '+el+'('+EL_HJ[el]+') 기운의 자리예요. 내 사주에서 배우자를 뜻하는 기운(배우자성)도 '+el+'이라, 이런 곳에서 결이 맞는 사람을 만나기 쉬워요');}
  else if(GEN[el]===P.el){score+=20;why.push('이곳의 '+el+'('+EL_HJ[el]+') 기운은 배우자를 뜻하는 '+P.el+'('+EL_HJ[P.el]+') 기운을 키워 주는 관계(상생)라, 인연의 기운이 살아나는 자리예요');}
  else if(GEN[P.el]===el){score+=8;why.push('배우자를 뜻하는 '+P.el+'('+EL_HJ[P.el]+') 기운이 이곳의 '+el+' 기운으로 자연스럽게 흘러가서(상생), 무리 없이 마음을 열기 좋아요');}
  if(ds&&(k==='event'||k==='bar')){score+=12;why.push('사주에 사람의 눈길을 끄는 기운(도화·홍염)이 있어서, 사람 많고 화려한 자리에서 인연이 붙기 쉬워요');}
  if(band==='신약'&&(k==='intro'||k==='local'||k==='work')){score+=k==='intro'?8:5;why.push('힘이 여린 사주라 믿을 만한 사람을 통해 천천히 알아 가는 자리가 안전해요');}
  if(band==='신강'&&(k==='event'||k==='trip'||k==='gym')){score+=k==='trip'?6:5;why.push('힘이 센 사주라 내가 먼저 움직이는 자리에서 더 잘 풀려요');}
  if(pct<10&&(k==='online'||k==='class'||k==='intro')){score+=5;why.push('배우자를 뜻하는 기운이 사주에 약 '+pct+'%로 적은 편이라, 만날 기회를 직접 만드는 자리가 유리해요');}
  return {k:k,i:i,score:Math.max(20,Math.min(96,score)),why:why};}).sort(function(a,b){return b.score-a.score||a.i-b.i;}).slice(0,5);
 var out='<section class="dp-embed dp"><div class="cap">'+esc('인연이 열리기 쉬운 곳 TOP 5')+'</div><p class="lead">'+esc((D.who(H))+'의 사주에서 '+(P.male?'아내':'남편')+'를 뜻하는 기운(배우자성)은 ')+'<b>'+esc(P.grp+' · '+P.el+'('+EL_HJ[P.el]+')')+'</b>'+esc('이에요. 그래서 '+EL_MOOD[P.el]+' 분위기의 자리일수록 인연이 편하게 열려요. 자주 가는 장소 10곳을 이 기준으로 견줘 순서를 매겼어요. 누구를 만날지 맞히는 점수가 아니라, 어디서 마음이 잘 열리는지 보는 순위예요.')+(ds?esc(' 도화 기운이 있어 사람이 모이는 자리도 함께 올렸어요.'):'')+'</p></section>';
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
  var kd=new Date(x.startMs+9*3600e3);return {i:i,v:v,label:label,why:why,y:scope==='month'?kd.getUTCFullYear():x.year,m:scope==='month'?kd.getUTCMonth()+1:null,gz:M.gzNameK(x)};}).filter(Boolean);}
// 서사 엔진(life-narrative.js)이 '좋은 해·달'을 고를 때 그래프·후킹과 같은 점수를 쓰게 한다. 높은 순.
function rank(M,ch,now,kind,scope){try{var H={M:M,ch:ch,now:now,sd:{nowYear:M.yearPillarAt(now).sajuYear}};return rowsOf(H,kind,scope).slice().sort(function(a,b){return b.v-a.v||a.i-b.i;});}catch(e){return null;}}
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
/* ───── 타고난 강점 분야 ─────
   원국의 십성 비율(엔진 weights.tgPct = sd.tenGods)에서 가장 큰 두 십성과 월지 십성(사회에서 쓰는 자리)을 읽어, 어떤 분야에서 강점이 드러나기 쉬운지 풀어 준다. 점수를 새로 만들지 않는다. */
var TALENT={
 비견:['내 영역을 직접 꾸리는 일','스스로 정한 기준대로 끝까지 밀고 가는 힘','1인 사업·프리랜서','운동·코칭','전문 기술 자영업'],
 겁재:['경쟁과 협업 속에서 성과를 내는 일','사람을 모으고 승부처에서 버티는 힘','영업·세일즈','공동 창업·팀 프로젝트','스포츠·현장 리더'],
 식신:['한 가지 기술을 꾸준히 다듬는 일','익숙한 것을 깊게 파서 품질로 보여 주는 힘','요리·제조·공예','교육·콘텐츠 연재','기술 전문직'],
 상관:['말과 표현으로 바꾸고 고치는 일','남이 못 본 문제를 짚고 더 나은 방법을 내놓는 힘','기획·마케팅','방송·작가·강연','컨설팅·변론'],
 편재:['사람과 기회를 넓게 굴리는 일','흐름을 빨리 읽고 판을 키우는 힘','영업·유통·무역','사업 개발·투자','이벤트·중개'],
 정재:['숫자와 살림을 꼼꼼히 관리하는 일','들어오고 나가는 것을 정확히 맞추는 힘','재무·회계','구매·운영 관리','안정적인 장사·관리직'],
 편관:['급한 문제를 맡아 해결하는 일','압박 속에서도 결단하고 책임지는 힘','군경·보안·응급','현장 관리·문제 해결','감사·위기 대응'],
 정관:['조직과 규칙 안에서 신뢰를 쌓는 일','맡은 역할을 지키며 차근차근 올라가는 힘','공공기관·대기업','법무·인사·행정','관리직·품질 관리'],
 편인:['남다른 관점과 전문 지식을 쓰는 일','깊이 파고들어 나만의 해석을 만드는 힘','연구·IT·데이터','심리·상담','디자인·특수 기술'],
 정인:['배우고 가르치며 자격으로 인정받는 일','배운 것을 정리해 믿을 만한 답을 내는 힘','교육·학술','자격 전문직(의료·법·회계)','문서·출판·인증']
};
var TG_KEYS=['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
function ig(w){var c=String(w).charCodeAt(String(w).length-1)-0xAC00;return w+(c>=0&&c%28?'이':'가');}
function talentBlock(H){var sd=H&&H.sd,tg=sd&&sd.tenGods;if(!tg)return null;
 var rows=TG_KEYS.map(function(k,i){return {k:k,i:i,v:+tg[k]||0};}).filter(function(r){return r.v>0;}).sort(function(a,b){return b.v-a.v||a.i-b.i;});if(!rows.length)return null;
 var top=rows.slice(0,2),mon=sd.pillars&&sd.pillars.month&&sd.pillars.month.branchTG,band=sd.strength&&sd.strength.band,nm=R.Deep&&R.Deep.who?R.Deep.who(H):'내';
 var out='<section class="dp-embed dp dp-talents"><div class="cap">'+esc('타고난 강점 · 어떤 분야에서 드러날까')+'</div><p class="lead">'+esc(nm+'의 사주 여덟 글자를 열 가지 성향(십성)으로 나눠 보면, 가장 크게 자리 잡은 성향은 ')+'<b>'+esc(top.map(function(r){return r.k+' '+Math.round(r.v)+'%';}).join(' · '))+'</b>'+esc('예요. 많이 가진 성향일수록 애쓰지 않아도 손에 익어서, 그 성향을 쓰는 분야에서 강점이 먼저 드러나요.')+'</p>';
 top.forEach(function(r,n){var t=TALENT[r.k];out+='<div class="dp-talent"><h4>'+(n+1)+'. '+esc(t[0])+' <small>'+esc(r.k+' '+Math.round(r.v)+'%')+'</small></h4><p>'+esc('타고난 무기는 '+t[1]+'이에요. 이런 분야에서 남보다 빨리 인정받기 쉬워요.')+'</p><div class="dp-tags">'+t.slice(2).map(function(x){return '<span class="dp-chip">'+esc(x)+'</span>';}).join('')+'</div></div>';});
 if(mon&&TALENT[mon])out+='<p class="dp-pl">＋ '+esc(top.some(function(r){return r.k===mon;})?'태어난 달(사회에 나가 쓰는 자리)에도 '+ig(mon)+' 있어서, 이 강점이 일터에서 특히 잘 보여요.':'태어난 달(사회에 나가 쓰는 자리)에는 '+ig(mon)+' 있어요. 일터에서는 '+TALENT[mon][1]+'도 함께 쓰게 돼요. '+TALENT[mon].slice(2,4).join(', ')+' 같은 쪽이에요.')+'</p>';
 if(band)out+='<p class="dp-mi">'+esc(band==='신강'?'힘이 센 사주라 이 강점을 혼자 밀고 나가도 잘 버텨요. 다만 내 방식만 고집하지 않도록 함께 일하는 사람의 속도도 챙기세요.':band==='신약'?'힘이 여린 사주라 이 강점은 받쳐 주는 조직·스승·동료가 있을 때 더 크게 드러나요. 혼자 다 하려 하기보다 기댈 곳을 먼저 만드세요.':'힘이 중간인 사주라 이 강점을 혼자서도, 조직 안에서도 쓸 수 있어요. 지금 환경에서 더 자주 쓰이는 쪽을 골라 키우세요.')+'</p>';
 return out+'</section>';}
/* ───── 건강·사고수 달력 ─────
   원국의 약한 오행·넘치는 오행(sd.weakestEl·dominantEl)을 몸의 부위로, 세운·월운의 십성과 원국과의 충·형(엔진 luckRelations)을 사고·사기 신호로 읽는다.
   전통 오행-장부 대응과 십성 의미를 생활 언어로 옮긴 해석이다. 점수를 새로 계산하지 않고 엔진이 준 십성·관계만 센다. */
var HB_STEM={갑:'목',을:'목',병:'화',정:'화',무:'토',기:'토',경:'금',신:'금',임:'수',계:'수'},HB_BR={자:'수',축:'토',인:'목',묘:'목',진:'토',사:'화',오:'화',미:'토',신:'금',유:'금',술:'토',해:'수'};
var HB_KE={목:'토',화:'금',토:'수',금:'목',수:'화'};
var HB_ORG={목:'간·쓸개·눈·근육·힘줄',화:'심장·혈압·혈관',토:'위장·소화기·비장',금:'폐·기관지·대장·피부',수:'신장·방광·허리·생식기'};
var HB_CARE={목:'눈을 혹사하지 말고, 근육·관절에 무리가 가는 운동은 강도를 낮추세요.',화:'혈압을 재 두고, 과로와 과음은 이때만큼은 끊으세요.',토:'폭식·야식을 끊고, 미뤄 둔 위 내시경을 받아 두세요.',금:'담배를 끊고, 기침이 2주 넘게 가면 바로 검사받으세요.',수:'허리를 아끼고 물을 자주 마시세요. 건강검진에서 신장 수치를 꼭 확인하세요.'};
var HB_POS={year:'태어난 해',month:'태어난 달',day:'태어난 날',hour:'태어난 시간'};
// seen: 같은 목록 안에서 같은 신호가 다시 나오면 다른 부위·다른 문장으로 쓴다(해마다 같은 문장 반복 방지).
function hbSignals(p,sd,seen){
 seen=seen||{};var nth=function(k){seen[k]=(seen[k]||0)+1;return seen[k]-1;};
 var gz=String(p.ganzhi||''),se=HB_STEM[gz.charAt(0)],be=HB_BR[gz.charAt(1)],weak=sd.weakestEl,strong=sd.dominantEl,out={body:null,accident:null,fraud:null,score:0};
 var els=[se,be].filter(Boolean);
 var press=els.filter(function(e){return HB_KE[e]===weak;})[0];
 if(weak&&press){var bn=nth('bw'),parts=HB_ORG[weak].split('·'),fo=parts[bn%parts.length];out.body={el:weak,w:2,text:bn?[jhb(press)+' 기운이 다시 '+weak+'을 눌러요. 이번에는 '+hbj(fo,'이','가')+' 먼저 신호를 보내요. 무리했다 싶으면 그날 바로 쉬세요.',fo+' 쪽이 약해지는 때예요. 미뤄 둔 검진이 있다면 이때 받으세요.',hbj(fo,'이','가')+' 피로를 먼저 드러내요. 이 시기엔 일정을 한 칸 비워 두세요.'][(bn-1)%3]:jhb(press)+' 기운이 강해져 원래 약한 '+weak+'('+HB_ORG[weak]+') 쪽을 누르는 때예요. '+fo+'부터 탈이 나요. '+HB_CARE[weak]};}
 else if(strong&&els.indexOf(strong)>=0){var sn=nth('bs');out.body={el:strong,w:1,text:sn?'넘치는 '+strong+' 기운이 또 쌓여요. '+HB_ORG[strong].split('·')[sn%HB_ORG[strong].split('·').length]+' 쪽 검사를 이때 받아 두세요.':'원래 넘치는 '+strong+' 기운이 더 쌓이는 때라 '+hbj(HB_ORG[strong],'이','가')+' 과열돼요. '+HB_CARE[strong]};}
 var rel=p.relations||[],hit=function(type){return rel.filter(function(r){return r&&r.type===type&&Array.isArray(r.members)&&r.members.indexOf('luck')>=0;}).map(function(r){return r.members.filter(function(k){return HB_POS[k];})[0];}).filter(Boolean);};
 var ch=hit('충'),hy=hit('형');
 var an=(ch.length||p.stemTG==='편관'||p.branchTG==='편관'||hy.length)?nth('acc'):0;
 if(an&&(ch.length||p.stemTG==='편관'||p.branchTG==='편관'))out.accident={w:ch.indexOf('day')>=0?3:2,text:ch.length?['또 한 번 사주와 부딪히는 글자(충)가 들어와요. 이동이 잦아지니 차량 점검과 보험을 미리 챙기고, 낯선 길 운전은 피하세요.','충이 다시 걸리는 때예요. 계단·욕실·빙판처럼 미끄러운 곳에서 넘어지기 쉬워요.','부딪히는 글자가 또 들어와요. 급하게 서두르다 다치는 때라 약속 시간을 넉넉히 잡으세요.'][(an-1)%3]:['다시 몸을 몰아붙이는 편관이 들어와요. 이때 다치는 건 대부분 피곤할 때예요. 수면 시간부터 지키세요.','편관이 또 들어와 몸이 혹사당해요. 무거운 짐·높은 곳 작업은 남에게 맡기세요.','편관의 압박이 다시 와요. 화가 난 상태로 운전하거나 운동하지 마세요.'][(an-1)%3]};
 else if(ch.indexOf('day')>=0)out.accident={w:3,text:'들어오는 운이 태어난 날의 글자와 정면으로 부딪혀요(충). 몸을 다치기 쉬운 때라 교통사고·낙상을 조심하고, 고를 수 있다면 수술·시술 날짜는 이때를 피하세요.'};
 else if(ch.length)out.accident={w:2,text:'들어오는 운이 '+HB_POS[ch[0]]+'의 글자와 부딪혀요(충). 이사·이동·출장이 늘고 그 길에서 사고가 나기 쉬워요. 운전은 평소보다 천천히, 장거리는 쉬어 가며 하세요.'};
 else if(p.stemTG==='편관'||p.branchTG==='편관')out.accident={w:2,text:'몸과 마음을 몰아붙이는 편관이 들어와요. 무리한 운동·위험한 작업·밤샘 운전에서 다치기 쉬워요. 피곤한 날은 운전대를 잡지 마세요.'};
 else if(hy.length)out.accident={w:1,text:'형(刑)이 걸려 수술·시술이나 법적 다툼이 생기기 쉬운 때예요. 계약서와 몸 상태 둘 다 미리 점검하세요.'};
 var fn=(p.stemTG==='겁재'||p.branchTG==='겁재'||p.stemTG==='비견'||p.branchTG==='비견')?nth('fr'):0;
 if(fn&&(p.stemTG==='겁재'||p.branchTG==='겁재'))out.fraud={w:2,text:['또 겁재가 들어와요. 이번엔 지인·가족을 통한 돈 부탁이 많아져요. 거절하는 게 관계를 지키는 길이에요.','겁재가 다시 들어와 "확실한 정보"라는 말에 흔들리기 쉬워요. 남이 권하는 투자는 하루 자고 결정하세요.','돈이 새는 겁재의 때가 또 와요. 중고거래·온라인 결제는 직접 확인한 곳에서만 하세요.'][(fn-1)%3]};
 else if(fn&&(p.stemTG==='비견'||p.branchTG==='비견'))out.fraud={w:1,text:['가까운 사람과 돈을 섞는 일이 다시 생겨요. 빌려준 돈은 돌려받지 못한다고 생각하고 결정하세요.','친한 사이의 동업·공동 투자 이야기가 나와요. 지분과 정산을 글로 남기지 않으면 하지 마세요.','내 돈을 남이 대신 관리하게 두지 마세요. 통장·카드는 내가 직접 챙기세요.'][(fn-1)%3]};
 else if(p.stemTG==='겁재'||p.branchTG==='겁재')out.fraud={w:2,text:'겁재가 들어와 내 돈을 노리는 사람이 다가와요. 돈 빌려 달라는 부탁, 동업 제안, 고수익 투자 권유는 이때 들어오는 것일수록 거절하세요.'};
 else if(p.stemTG==='비견'||p.branchTG==='비견')out.fraud={w:1,text:'가까운 사람과 돈이 엮이기 쉬워요. 보증·공동 명의·돈 빌려주기는 이때 하지 마세요.'};
 else if(p.stemTG==='편인')out.fraud={w:1,text:'문서와 계약에서 속기 쉬운 때예요. 도장 찍기 전에 조건을 한 번 더 읽고, 급하게 재촉하는 계약은 미루세요.'};
 out.score=(out.body?out.body.w:0)+(out.accident?out.accident.w:0)+(out.fraud?out.fraud.w:0);
 return out;}
function hbj(w,a,b){var t=String(w).replace(/\([^)]*\)$/,''),c=t.charCodeAt(t.length-1)-0xAC00;return w+(c>=0&&c%28?a:b);}
function jhb(el){var hj={목:'木',화:'火',토:'土',금:'金',수:'水'}[el];return el+'('+hj+')';}
function hbItem(label,s){var lines=[];if(s.body)lines.push(['몸',s.body.text]);if(s.accident)lines.push(['사고',s.accident.text]);if(s.fraud)lines.push(['사기',s.fraud.text]);
 return '<li class="hb-item"><b>'+esc(label)+'</b>'+lines.map(function(l){return '<p><span class="hb-k hb-'+(l[0]==='몸'?'body':l[0]==='사고'?'acc':'fraud')+'">'+l[0]+'</span>'+esc(l[1])+'</p>';}).join('')+'</li>';}
function healthMap(H){var sd=H&&H.sd;if(!sd||!sd.weakestEl)return null;
 var yrs=(sd.annualLuck||[]).map(function(p){return {p:p,s:hbSignals(p,sd)};}).filter(function(x){return x.s.score>=2;}).sort(function(a,b){return b.s.score-a.s.score||a.p.year-b.p.year;}).slice(0,4).sort(function(a,b){return a.p.year-b.p.year;});
 var mos=(sd.monthlyLuck||[]).map(function(p){return {p:p,s:hbSignals(p,sd)};}).filter(function(x){return x.s.score>=2;}).sort(function(a,b){return b.s.score-a.s.score||a.p.startDate.localeCompare(b.p.startDate);}).slice(0,3).sort(function(a,b){return a.p.startDate.localeCompare(b.p.startDate);});
 var sy={},sm={};yrs.forEach(function(x){x.s=hbSignals(x.p,sd,sy);});mos.forEach(function(x){x.s=hbSignals(x.p,sd,sy);});
 var weak=sd.weakestEl,strong=sd.dominantEl,nm=R.Deep&&R.Deep.who?R.Deep.who(H):'내';
 var out='<section class="dp-embed dp hb"><div class="cap">'+esc('건강·사고수 달력 · 언제, 무엇을 조심할까')+'</div>'+
  '<p class="lead">'+esc(nm+'의 사주에서 가장 약한 기운은 '+hbj(jhb(weak),'이라','라')+' '+hbj(HB_ORG[weak],'이','가')+' 타고난 약점이에요. ')+(strong&&strong!==weak?esc('반대로 '+jhb(strong)+' 기운은 넘쳐서 '+hbj(HB_ORG[strong],'이','가')+' 쉽게 과열돼요. '):'')+esc('운에서 이 두 곳을 건드리는 때, 사주와 부딪히는 글자(충·형)가 들어오는 때, 내 돈을 노리는 기운(겁재)이 들어오는 때를 골랐어요.')+'</p>';
 out+='<h4 class="hb-h">앞으로 10년, 조심할 해</h4>'+(yrs.length?'<ul class="hb-list">'+yrs.map(function(x){return hbItem(x.p.year+'년 ('+x.p.ganzhi+')',x.s);}).join('')+'</ul>':'<p>'+esc('앞으로 10년 안에 몸·사고·사기 신호가 겹치는 해는 없어요. 위의 타고난 약점만 꾸준히 챙기면 돼요.')+'</p>');
 out+='<h4 class="hb-h">앞으로 12개월, 조심할 달</h4>'+(mos.length?'<ul class="hb-list">'+mos.map(function(x){return hbItem(x.p.year+'년 '+x.p.month+'월'+(x.p.term?' ('+x.p.term+'부터)':''),x.s);}).join('')+'</ul>':'<p>'+esc('앞으로 12개월 안에는 신호가 겹치는 달이 없어요.')+'</p>');
 out+='<p class="dp-note">'+esc('오행과 장부를 잇는 전통 해석이에요. 몸에 이상이 느껴지면 시기와 상관없이 병원부터 가세요.')+'</p>';
 return out+'</section>';}
/* ───── 후킹 큰 줄의 "내 답" 미리보기 ─────
   계산된 답이 있는 장은 후킹 큰 줄의 둘째 문장을 이 사람의 실제 답으로 쓴다(그래프·블록과 같은 값). 없으면 null → 일간별 문장을 쓴다. */
// [kind, scope, 문구, 이름 뒤 조사('의' = 민준님의 …, '이' = 민준님이 …)]
var TEASE_TIMING={timeline_wealth_06:['wealth','year','그물에 큰 고기가 드는 물때','의'],timeline_wealth_10:['wealth','month','돈이 익는 수확 철','의'],timeline_wealth_14:['wealth','year','재물 밀물이 가장 높은 때','의'],timeline_career_08:['career','year','날개를 펴기 좋은 바람이 부는 때','이'],timeline_career_14:['career','year','일에 가장 좋은 파도가 오는 때','의'],timeline_self_24:['career','month','노를 저을 때','이'],timeline_love_14:['love','year','인연에 볕이 가장 잘 드는 때','의']};
var SEA_KW={opportunity:'기회',expansion:'확장',harvest:'수확',accumulation:'축적',transition:'전환',defense:'방어'};
function tjo(w,a,b){var t=String(w),c=t.charCodeAt(t.length-1)-0xAC00;return t+(c>=0&&c<11172&&c%28?a:b);}
function teaser(c){var id=c&&(c.editorialContractId||c.id),H=c&&c.readingFeature,vd=c&&c.readingVisualData||{},sd=H&&H.sd;
 var raw=String((H&&H.name)||vd.name||'').trim().replace(/님$/,''),who=raw?raw.slice(0,20)+'님':'당신';
 try{
  if(id==='timeline_self_peak'){var ps=vd.peakPeriods||[],y=vd.peakSelected,p=ps.filter(function(x){return x.startYear===y;})[0];if(!p)return null;var a=Math.floor(p.startAge);return who+'의 꽃은 '+a+'~'+(a+10)+'세('+p.startYear+'~'+p.endYear+'년)에 가장 활짝 펴요.';}
  if(!sd)return null;
  if(id==='timeline_self_20'){var cd=sd.currentDaewoon,sh=sd.daewoonShift;if(!cd)return null;if(sh&&sh.phase==='ending'&&sh.to)return sh.to.season===cd.season?who+'은 지금 10년의 길이 바뀌는 길목에 서 있지만, 다음 10년도 \''+(SEA_KW[cd.season]||'같은')+'\'의 계절이 이어져요.':who+'은 지금 \''+(SEA_KW[cd.season]||'지금')+'\'의 계절이 끝나고 \''+(SEA_KW[sh.to.season]||'새')+'\'의 계절로 넘어가는 길목에 서 있어요.';return who+'은 지금 \''+(SEA_KW[cd.season]||'지금')+'\'의 계절을 걷고 있어요.';}
  if(id==='timeline_self_26'){var tg=sd.tenGods||{},k=TG_KEYS.slice().sort(function(a,b){return (+tg[b]||0)-(+tg[a]||0);})[0];if(!k||!TALENT[k]||!(+tg[k]))return null;return who+'은 '+TALENT[k][0].replace(/일$/,'일')+'에서 물 만난 고기가 돼요.';}
  if(id==='timeline_self_35'){var w=sd.weakestEl;if(!w||!HB_ORG[w])return null;var o=HB_ORG[w].split('·').slice(0,2).join('·');return who+'의 몸은 '+o+'부터 경고등을 켜요.';}
  var T=TEASE_TIMING[id];if(T&&H.M){var rows=rowsOf(H,T[0],T[1]);if(rows.length<3)return null;var top=rows.slice().sort(function(a,b){return b.v-a.v||a.i-b.i;})[0],when=T[1]==='month'?'다가오는 '+String(top.label).split(' · ')[0]:String(top.label).split(' ')[0];return who+(T[3]==='이'?'이 ':'의 ')+tjo(T[2],'은','는')+' '+when+'이에요.';}
 }catch(e){}
 return null;}
function embed(html){return String(html||'').replace(/^<section class="scene rv dp/,'<section class="dp-embed dp');}
function build(c){var f=c&&c.readingFeature,id=c&&(c.editorialContractId||c.id),spec=SPEC[id],D=R.Deep;if(!f||!f.sd||!spec||!D||!D.SECTIONS)return null;
 var key=id+':'+Object.keys(f.assets||{}).length+':'+(R.TopicDeep?R.TopicDeep.rev:0);   // TopicDeep(주제 심화 2차)이 늦게 준비되면 다시 만든다if(c.__rfCache&&c.__rfCache.key===key)return c.__rfCache.out;
 var scenes=[];
 spec.parts.forEach(function(part){try{
  if(part.custom==='places'){var p=placeRank(f);if(p)scenes.push(p);return;}
  if(part.custom==='rank'){var rk=rankBlock(id,f);if(rk)scenes.push(rk);return;}
  if(part.custom==='healthmap'){var hm=healthMap(f);if(hm)scenes.push(hm);return;}
  if(part.custom==='talent'){var tb=talentBlock(f);if(tb)scenes.push(tb);return;}
  if(part.custom==='late'){var lt=lateLuck(f);if(lt)scenes.push(lt);return;}
  if(part.custom==='timing'){var t=timingRank(f,part.kind,part.scope);if(t)scenes.push(t);return;}
  if(part.custom&&R.FateBlocks&&R.FateBlocks.has(part.custom)){var fb=R.FateBlocks.render(part,f,id);if(fb)scenes.push(fb);return;}   // fate-blocks.js(구성 다양화)
  if(part.custom&&R.TopicDeep&&R.TopicDeep.has(part.custom)){var td=R.TopicDeep.render(part,f,id);if(td)scenes.push(td);return;}   // topic-deep.js(스위치 topicDeep)
  var fn=D.SECTIONS[part.sec];if(!fn)return;var list=(fn(f).scenes||[]).map(function(s){return embed(s.html);});
  if(part.take)list=part.take.map(function(i){return list[i];}).filter(Boolean);
  if(part.match)list=list.filter(function(h){return part.match.test(h.replace(/<[^>]+>/g,' '));});
  if(part.skip)list=list.filter(function(h){return !part.skip.test(h.replace(/<[^>]+>/g,' '));});
  scenes=scenes.concat(list);}catch(e){}});
 // 같은 블록·같은 안내 문장이 여러 장에 반복되지 않게: 똑같은 블록은 처음 보여 준 장에만, 문단 안 문장은 다른 장이 이미 보여 준 것을 뺀다(fact-once.js).
 var FO=R.FactOnce;if(FO&&FO.uniq){scenes=scenes.filter(function(h){var k=String(h).replace(/<[^>]+>/g,' ').replace(/\s+/g,'');return k.length<20||FO.own(f.sd,'blk:'+k,id);}).map(function(h){return String(h).replace(/(<(p|li)\b[^>]*>)((?:<span[^>]*>[^<]*<\/span>)?)([^<]+)(<\/\2>)/g,function(m,open,tag,lab,txt,close){var u=FO.uniq(f.sd,txt,id);return u.trim()?open+lab+u+close:'';}).replace(/<div><dt>([^<]*)<\/dt><dd>([^<]+)<\/dd><\/div>/g,function(m,dt,dd){var u=FO.uniq(f.sd,dd,id);return u.trim()?'<div><dt>'+dt+'</dt><dd>'+u+'</dd></div>':'';});});}
 var out=null;if(scenes.length){var lead=Math.min(spec.lead||0,scenes.length),rest=scenes.slice(lead);
  out={id:id,lead:lead?'<div class="reading-feature reading-feature-lead" data-reading-feature="'+esc(id)+'">'+scenes.slice(0,lead).join('')+'</div>':'',rest:rest.length?'<div class="reading-feature" data-reading-feature="'+esc(id)+'"><h3 class="reading-feature-title">'+esc(spec.title)+'</h3>'+rest.join('')+'</div>':''};}
 try{Object.defineProperty(c,'__rfCache',{value:{key:key,out:out},writable:true,configurable:true,enumerable:false});}catch(e){}
 return out;}
Object.keys(root.MantraFeatureData||{}).forEach(function(k){if(!SPEC[k])SPEC[k]={title:root.MantraFeatureData[k].title,parts:[{custom:'rank'}]};});
// 2026-11-09 구성 다양화: 순위·순서 블록만 있던 장 앞에 모양이 다른 블록을 하나씩(fate-blocks.js). 모듈이 없으면 조용히 빠진다.
[['timeline_wealth_11',{custom:'fx:scenario',topic:'wealth'}],['timeline_career_11',{custom:'fx:scenario',topic:'career'}],['timeline_love_12',{custom:'fx:scenario',topic:'love'}],['timeline_wealth_13',{custom:'fx:people',topic:'wealth'}],['timeline_career_13',{custom:'fx:people',topic:'career'}],['timeline_love_13',{custom:'fx:people',topic:'love'}],['timeline_wealth_15',{custom:'fx:rx',topic:'wealth'}],['timeline_career_15',{custom:'fx:rx',topic:'career'}],['timeline_love_15',{custom:'fx:rx',topic:'love'}],['timeline_self_37',{custom:'fx:rx',topic:'self'}],['timeline_self_22',{custom:'fx:letter'}],['timeline_self_18',{custom:'fx:scenario',topic:'self'}],['timeline_career_10',{custom:'fx:check',set:'habit'}],['timeline_love_06',{custom:'fx:check',set:'loveErr'}],['timeline_career_07',{custom:'fx:check',set:'org'}],['timeline_career_09',{custom:'fx:check',set:'biz'}],['timeline_wealth_09',{custom:'fx:check',set:'moneyPpl'}],['timeline_career_03',{custom:'fx:vs',set:'job'}],['timeline_career_04',{custom:'fx:vs',set:'lead'}],['timeline_wealth_04',{custom:'fx:vs',set:'salary'}],['timeline_wealth_08',{custom:'fx:vs',set:'invest'}],['timeline_love_01',{custom:'fx:profile',set:'relate'}],['timeline_love_04',{custom:'fx:profile',set:'love'}],['timeline_career_02',{custom:'fx:profile',set:'talent'}],['timeline_love_02',{custom:'fx:likes'}],['timeline_love_03',{custom:'fx:people',topic:'love'}],['timeline_career_05',{custom:'fx:fit'}],['timeline_career_12',{custom:'fx:road',topic:'career'}],['timeline_wealth_12',{custom:'fx:road',topic:'wealth'}],['timeline_love_07',{custom:'fx:profile',set:'spouse'}],['timeline_love_10',{custom:'fx:family'}],['timeline_self_30',{custom:'fx:meter',set:'wealth'}],['timeline_career_01',{custom:'fx:meter',set:'career'}],['timeline_self_25',{custom:'fx:profile',set:'self'}],['timeline_self_26',{custom:'fx:fit'}],['timeline_career_06',{custom:'fx:env'}],['timeline_wealth_03',{custom:'fx:check',set:'leak'}],['timeline_wealth_05',{custom:'fx:vs',set:'saveSpend'}],['timeline_wealth_07',{custom:'fx:check',set:'moneyChoice'}],['timeline_wealth_02',{custom:'fx:profile',set:'earn'}],['timeline_love_09',{custom:'fx:check',set:'marriage'}],['timeline_love_05',{custom:'fx:pair'}],['timeline_self_35',{custom:'fx:check',set:'safety'}],['timeline_wealth_06',{custom:'fx:actcal',topic:'wealth'}],['timeline_wealth_10',{custom:'fx:years',topic:'wealth'}],['timeline_wealth_14',{custom:'fx:cross',topic:'wealth'}],['timeline_career_08',{custom:'fx:years',topic:'career'}],['timeline_career_14',{custom:'fx:cross',topic:'career'}],['timeline_love_08',{custom:'fx:actcal',topic:'love'}],['timeline_love_14',{custom:'fx:cross',topic:'love'}],['timeline_wealth_01',{custom:'fx:meter',set:'bowl'}],['timeline_love_11',{custom:'fx:profile',set:'parent'}]].forEach(function(x){var sp=SPEC[x[0]];if(sp&&!sp.parts.some(function(p){return p.custom===x[1].custom;}))sp.parts=/^fx:(years|actcal|cross)$/.test(x[1].custom)?sp.parts.concat([x[1]]):[x[1]].concat(sp.parts);});   // 시기 장은 흐름 그래프를 앞에 두고 새 블록을 뒤에
R.ReadingFeature={build:build,teaser:teaser,rank:rank,talentBlock:talentBlock,healthMap:healthMap,placeRank:placeRank,timingRank:timingRank,SPEC:SPEC};
if(typeof module!=='undefined'&&module.exports)module.exports=R.ReadingFeature;
})(typeof window!=='undefined'?window:globalThis);
