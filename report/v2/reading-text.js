/* Text-only reading view. Evidence and accepted wording remain available; calculations are never rewritten. */
(function(root){'use strict';var R=root.ReportV2=root.ReportV2||{};
 var LABELS={title:'먼저 들려드리고 싶은 이야기',reality:'실제로는 이래요',strength:'이게 내 무기예요',risk:'솔직히 여기가 약점이에요',reinforce:'이렇게 쓰면 더 잘 풀려요',practice:'오늘 바로 해볼 것'};
 var TECH=/오행|신살|원국|육친|십간|양간|음간|한난조습|사고수|관성|재성|인성|식상|비겁|정관|편관|정재|편재|식신|통근|무근|신강|신약|용신|기신|희신|격국|조후|억부|합충|지장간|십성|월령|일간|일주(?!일)|월주|시주|배우자궁|자녀궁|[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]|상관(?=[은이가을의\s·])/;
 var METHOD=/전통 해석.{0,20}(?:보장|학파)|학파.{0,35}(?:차이|다르|달라)|(?:가정|가능한|비교).{0,12}(?:사례|예시).{0,12}(?:아니|뜻하지|전제하지)|실제 (?:경험|생활|성향)을 (?:전제|확인).{0,18}(?:않|아니)|이는.{0,22}(?:가정|예시).{0,25}(?:실제|뜻하지|아니)/;
 var edit=function(t){t=root.MantraPlainCopy?root.MantraPlainCopy.text(t):t;return (root.MantraPolite?root.MantraPolite.text(String(t||'')):String(t||'')).replace(/\bvs\b/g,'그리고').replace(/자기 결정을 함께 확보하는 태도/g,'스스로 선택할 여지를 남기는 태도').replace(/직설적인 표현이 있다는 이유로 호감을 얻는 면까지 없다고 판단하지 않습니다\./g,'분명한 표현과 배려는 함께 드러날 수 있습니다.').replace(/판단의 범위는 직무 후보까지입니다\./g,'어떤 일을 탐색할지 정하는 참고로 읽어 주세요.').replace(/실리 계산과 마무리/g,'수입·비용 확인과 정산').replace(/실리 계산/g,'수입과 비용 계산').replace(/조직형 판단/g,'조직에서 일하는 방식에 대한 판단').trim();};
 var esc=function(t){return String(t==null?'':t).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});};
 var sentences=function(t){return String(t||'').split(/(?<=[.!?。])\s+|\n{2,}/).map(function(x){return x.trim();}).filter(Boolean);};
 var key=function(t){return t.replace(/[\s\p{P}\p{S}]/gu,'');};
  var MAYBE_NOTE=/^(이건 |이것은 )?(가능성이지|가능성일 뿐) 정해진 (일|것)은 아니에요\.?$/;
 function organize(chapter){
  var c=chapter||{},basis=[],seen=new Set(),rows=[],moved=[],duplicates=[],creative=c.editorialTopicId==='creative',education=c.readingProvider==='local-reviewed-education';
  function basisAdd(text,reason){if(!text)return;var k=key(text);if(!basis.some(function(x){return key(x.text)===k;}))basis.push({text:text,reason:reason||'basis'});}
  if(c.readingDeferred)return {pending:true,notice:String(c.readingNotice||'이 장의 풀이를 준비하고 있습니다.').replace(/ \(오류: [^)]*\)$/,''),rows:[],basis:[],moved:[],duplicates:[]};
  if(creative){
    var core=c.readingCore||{},reflection=root.MantraEverydayReading&&root.MantraEverydayReading.scenes[c.editorialContractId||c.id],story=String(core.reality||c.readingFullText||'');
    if(reflection){var owned=[reflection.example,reflection.action,edit(reflection.example),edit(reflection.action)];story=story.split(/\n{2,}/).filter(function(p){return owned.indexOf(p.trim())<0;}).join('\n\n');}
    rows.push({role:'story',label:core.title||c.title||'이야기',text:story});
    if(reflection)rows.push({role:'reflection',label:'내 일상에 비유해 보면',text:reflection.example+'\n\n'+reflection.action});
    return {creative:true,rows:rows,basis:[],notice:c.readingNotice||'사주를 모티브로 만든 창작 이야기입니다. 실제 전생이나 개인의 과거를 확인한 내용은 아닙니다.',moved:[],duplicates:[]};
  }
  var source=education?(c.readingParagraphs||[]).map(function(p){return {role:'education',text:p.text};}):Object.keys(LABELS).map(function(role){var p=(c.readingParagraphs||[]).find(function(p){return p.role===role;});return {role:role,text:p?p.text:(c.readingCore||{})[role]||'',editorialReview:p&&p.editorialReview,components:p&&p.components};});
  source=source.filter(function(p){return (c.readingPendingRoles||[]).indexOf(p.role)<0;});
  source.forEach(function(p){var paragraphs=[],everyday=root.MantraEverydayReading,id=c.editorialContractId||c.id;var review=p.editorialReview&&p.editorialReview.sceneVersion===3?p.editorialReview:everyday&&everyday.chapterReview(c.readingVisualData,id,p.components&&p.components[0]?{id:p.components[0].id,when:p.components[0].when}:undefined);var prose=everyday?everyday.apply(p.text,id,p.role,c.readingVisualData,review):p.text;if(everyday)prose=everyday.personalize(prose,c.readingVisualData&&c.readingVisualData.name);edit(prose).split(/\n{2,}/).forEach(function(paragraph){var visible=[];sentences(paragraph).forEach(function(text){if(MAYBE_NOTE.test(text.trim()))return;var k=key(text);if(seen.has(k)){duplicates.push({role:p.role,text:text});return;}seen.add(k);
    var semantic=c.readingVisualData&&c.readingVisualData.name?text.split(c.readingVisualData.name+'님').join(''):text;
    if(c.readingProvider!=='local-engine-luck'&&((p.role!=='reality'&&(TECH.test(semantic)||root.MantraPlainCopy&&root.MantraPlainCopy.technical(semantic)))||METHOD.test(semantic))||text==='감당할 여력과 전체 조건을 함께 봐야 합니다.'){basisAdd(text,TECH.test(semantic)?'terminology':'scope');moved.push({role:p.role,text:text});}else visible.push(text);
  });if(visible.length)paragraphs.push(visible.join(' '));});if(paragraphs.length)rows.push({role:p.role,label:education?'':LABELS[p.role],text:paragraphs.join('\n\n')});});
  (c.interpretationAnalysis&&c.interpretationAnalysis.claims||[]).forEach(function(cl){if(cl.judgment){basisAdd(cl.judgment,'original');}});
  ['why','evidence'].forEach(function(role){if((c.readingPendingRoles||[]).indexOf(role)>=0)return;var p=(c.readingParagraphs||[]).find(function(p){return p.role===role;});var text=p?p.text:(c.readingCore||{})[role];if(text){basisAdd(String(text),role);}});
  if(education&&root.MantraEverydayReading){var daily=root.MantraEverydayReading.scenes[c.editorialContractId||c.id];if(daily)rows.push({role:'daily-example',label:'생활 속 예를 들어보면',text:daily.example+'\n\n'+daily.action});}
  var person=c.readingVisualData&&c.readingVisualData.name;if(typeof person==='string'&&person.trim()){person=person.trim().slice(0,40);var lead=rows.find(function(r){return r.role==='title';});if(lead&&lead.text.indexOf(person+'님')!==0)lead.text=person+'님, '+lead.text;}
  var luck=root.MantraLuckReading&&root.MantraLuckReading.context(c.editorialContractId||c.id,c.readingVisualData);if(luck&&!education){rows.splice(Math.min(1,rows.length),0,{role:'luck-context',label:'운 흐름을 쉽게 풀어보면',text:luck.text});basisAdd(luck.note,'scope');}
  if(!rows.length && basis.length)rows.push({role:'scope',label:'이번 풀이의 범위',text:'현재 연결된 자료로 설명할 수 있는 범위와 판단하기 어려운 부분을 풀이 디테일에서 확인할 수 있습니다.'});
  return {rows:rows,basis:basis,creative:false,education:education,notice:education?'일반적인 건강·안전 안내입니다. 사주로 질병이나 사고를 예측하지 않습니다.':c.readingNotice||'생활 속 예시는 가정한 상황입니다. 실제 경험과 다른 부분은 적용하지 않아도 됩니다.',moved:moved,duplicates:duplicates};
 }

 // Copy edits are limited to owned reading prose. Quoted evidence never passes through this function.
 var shortCopy=[
 ['예를 들어, 동료가 “이것도 잠깐 해줄 수 있어요?”라고 물을 때 내 마감부터 떠올리는지, 상대가 곤란하겠다 싶어 바로 받아주는지 살펴보세요.','동료가 “이것도 잠깐 해줄 수 있어요?”라고 부탁하는 상황을 떠올려 보세요. 내 마감을 확인하는지, 곤란해 보여 바로 받아주는지 돌아보세요.'],
 ['예를 들어, 미용사가 머리 길이를 세밀하게 맞추거나 의료인이 정밀한 작업을 할 때처럼, 세부를 놓치지 않는 일이 장점이 될 수 있어요.','예를 들어, 미용사의 커트나 의료인의 정밀 작업을 떠올려 보세요. 작은 차이를 놓치지 않는 일이 장점이 될 수 있어요.'],
 ['예를 들어, 친구에게 앱 사용법을 알려줄 때 복잡한 기능을 쉽게 설명한다면 교육이나 고객 안내에서도 써볼 수 있는 능력이에요.','친구에게 복잡한 앱 기능을 쉽게 설명해 준 적이 있나요? 그런 설명 능력은 교육이나 고객 안내에서도 써볼 수 있어요.'],
 ['예를 들어, 늘 같은 시간에 연락했는데 상대의 일정이 바뀌자 관심이 줄었다고 느끼기 전에 새로운 연락 시간을 물어보는 거예요.','늘 같은 시간에 연락하다 상대의 일정이 바뀐 상황을 떠올려 보세요. 관심이 줄었다고 생각하기 전에 편한 연락 시간을 물어보는 거예요.'],
 ['두 방식의 장점만 기대하면 회사에서 맡아주던 영업·정산·업무 지원은 그대로 받고 결정만 자유롭게 하려는 계획이 될 수 있어요.','독립하면 회사가 맡던 영업·정산·업무 지원도 챙겨야 해요. 결정의 자유만 기대하고 이 부담을 빼놓지는 않았는지 보세요.']
 ];
 function concise(text){var value=String(text||'');shortCopy.forEach(function(pair){value=value.split(pair[0]).join(pair[1]);});return value.replace(/^(?:한 번의 결과보다 계속 남을 것을 생각해|내가 정할 부분이 있어야 편해서|충분히 이해한 뒤 움직이고 싶어서|정해진 몫과 약속을 함께 지키고 싶어서|직접 해보고 판단하는 쪽이 편해서|따르기 전에 그 기준의 이유를 알고 싶어서|고르기 전에 조건부터 확인하다 보면|겉으로 안 보이는 이유도 생각하며),\s*/,'').replace(/하는 장면에 초점을 둘 수 있어요\./g,'할 때를 살펴보세요.').replace(/하는 모습을 보이세요\./g,'할 수 있어요.').replace(/하는 모습이 자연스러워요\./g,'할 수 있어요.').replace(/하는 장면을 살펴볼 수 있어요\./g,'할 때를 돌아보세요.').replace(/원래 사주와 함께 본 흐름에서는 /g,'원래 사주와 함께 보면, ').replace(/일하는 방식를/g,'일하는 방식을');}
 // 쉬운 말 다듬기(2026-11-23): 게시 문안 근거 문장의 정해진 틀(일간을 돕는 힘이 …쪽(신약)이라 …)을 읽히는 말로, 내부 설명(엔진이 계산·같은 문안)은 걷고, 조사 오류를 고친다.
 // 판정·값은 바꾸지 않는다. DB 재게시 없이 화면에서만 적용된다(문안 원본은 editorial/rebuild-20261022).
 var EL_WORD={'목':'나무','화':'불','토':'흙','금':'쇠','수':'물'};
 var PLAIN_SAY=[
  [/(?:^|\s)두 힘이 모두 높은 경우보다 약한 형태이고, 일간의 힘과 상관없이 같은 문안을 써요\./g,''],
  [/일간을 돕는 힘이 상대적으로 약한 쪽\(신약\)이라/g,'내 힘이 약한 편(신약)이라'],[/일간을 돕는 힘이 상대적으로 약한 쪽\(신약\)이에요\./g,'내 힘이 약한 편(신약)이에요.'],[/일간을 돕는 힘이 충분한 쪽\(신강·중화\)이에요\./g,'내 힘이 넉넉한 편이에요.'],[/일간을 돕는 힘이 충분한 쪽\(신강·중화\)이라/g,'내 힘이 넉넉한 편이라'],
  [/일간의 힘이 (약한|충분한) 구조로 엔진이 계산했고,/g,function(m,a){return '내 힘이 '+(a==='약한'?'약한':'넉넉한')+' 편이고,';}],
  [/로 엔진이 계산했고,/g,'이고,'],[/엔진이 계산한 /g,''],[/만세력 엔진이 계산한 /g,''],
  [/일간 ([갑을병정무기경신임계])·([갑을병정무기경신임계])[은는] 오행으로 ([목화토금수])\(([^)]+)\)에 해당하고,/g,function(m,a,b,e,d){return '태어난 날 글자('+a+'·'+b+')가 '+EL_WORD[e]+' 기운('+d+')이고,';}],
  [/이 사주의 용신 오행은 ([목화토금수])이고\(억부·조후 기준이 같은 오행을 가리킴\),/g,function(m,e){return '내게 가장 필요한 기운(용신)은 '+EL_WORD[e]+' 기운이고,';}],
  [/억부와 조후 기준이 같은 용신 오행[이은] ([목화토금수])(\([^)]+\))?(이고|이에요)/g,function(m,e,d,t){return '내게 가장 필요한 기운(용신)은 '+EL_WORD[e]+' 기운'+(d||'')+t;}],
  [/용신은 원국의 균형을 맞추는 데 가장 필요하다고 계산된 오행인데, 이 사주에서는 ([목화토금수])/g,function(m,e){return '내게 가장 필요한 기운(용신)은 '+EL_WORD[e]+' 기운';}],
  [/이를 누르는 성질의 환경은 ([목화토금수])(\([^)]+\))인데,/g,function(m,e,d){return '이 기운을 누르는 환경은 '+EL_WORD[e]+' 기운'+d+'이고,';}],
  [/(비겁|식상|재성|관성|인성)과 (비겁|식상|재성|관성|인성)가 모두 높게 계산돼서/g,function(m,a,b){return a+'과 '+b+'이 모두 높아서';}],
  [/(비겁|식상|재성|관성|인성)가 /g,'$1이 '],[/(무·기|병·정|임·계|갑·을|경·신)은 /g,function(m,a){var c=a.charCodeAt(a.length-1);return a+((c-0xAC00)%28?'은 ':'는 ');}],
  [/(비겁|식상|재성|관성|인성)의 세력이 높은 편이고,/g,'$1이 많은 편이고,'],[/(비겁|식상|재성|관성|인성)의 세력이 중간이고,/g,'$1이 보통이고,'],
  [/원국에 ([가-힣]+살|[가-힣]+귀인) 요소가 있고,/g,'타고난 사주에 $1이 있고,'],
  [/원국에 (충|형|파|해|원진|합)(\([^)]+\))? 요소가 있고,/g,function(m,r,d){return '타고난 사주에 '+r+(d||'')+(/[해파]$/.test(r)?'가':'이')+' 있고,';}],
  [/(?:해석|생활 패턴|생활 습관|전통 상징|상징)이고, (마음이나 몸|몸|체력이나 건강|사고의 발생이나 건강)(?:의)? 상태를 판정하지 않아요\./g,function(m,a){return '풀이이고, '+a+' 상태를 진단하지는 않아요.';}],
  [/이 해석은 대운·세운 값만 근거로 하고,/g,'이 풀이는 대운·세운 계산값만 근거로 하고,']];
 // 용어 바로 뒤 괄호 뜻풀이('관성(압박·평가·책임에 쓰는 에너지)의')를 쉬운 말 규칙보다 먼저 걷는다. 걷는 기준은 용어 각주(term-notes.js)와 같고, 뜻은 각주 단추로 보여 줘요(2026-11-24).
 var GLOSS_RE=null;function glossRe(){if(GLOSS_RE!==null)return GLOSS_RE;var D=root.MantraTermNotesData;if(!D){return null;}var keys=Object.keys(D).filter(function(k){return k.length>=2;}).sort(function(a,b){return b.length-a.length;}).map(function(k){return k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');});GLOSS_RE=keys.length?new RegExp('('+keys.join('|')+')\\(([^()%~]{1,40})\\)','g'):false;return GLOSS_RE;}
 function stripGloss(v){var re=glossRe();if(!re)return v;return v.replace(re,function(m,k,g,off,all){if(off>0&&/[가-힣]/.test(all.charAt(off-1)))return m;if(!/[가-힣]/.test(g)||/\d{3,}|\d+\s*(?:점|세|살)/.test(g))return m;return k;});}
 function plainSay(t){var v=stripGloss(String(t||''));PLAIN_SAY.forEach(function(p){v=v.replace(p[0],p[1]);});return v.replace(/\s{2,}/g,' ').trim();}
 // 접힌 근거 칸(왜 이렇게 풀이했는지·명리 근거) 전용 쉬운 말(2026-11-24). 본문에는 쓰지 않는다.
 //   원국→타고난 사주, 일간의 힘→내 힘, 한자 글자쌍→한글+뜻, '○○격 성격'(成格)→'○○격이 잘 짜인', 정의 문장 끝 '십성군·신살·분류예요'→'뜻해요', 조사 오류
 var HZ_K={'子':'자','丑':'축','寅':'인','卯':'묘','辰':'진','巳':'사','午':'오','未':'미','申':'신','酉':'유','戌':'술','亥':'해','甲':'갑','乙':'을','丙':'병','丁':'정','戊':'무','己':'기','庚':'경','辛':'신','壬':'임','癸':'계','木':'목','火':'화','土':'토','金':'금','水':'수'};
 function hzK(s){return String(s).replace(/[子丑寅卯辰巳午未申酉戌亥甲乙丙丁戊己庚辛壬癸木火土金水]/g,function(c){return HZ_K[c];});}
 function jo(w,a,b){var c=String(w).charCodeAt(String(w).length-1);return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b;}
 var REL_K={'반합':'반합(절반 묶임)','삼합':'삼합(셋이 묶임)','방합':'방합(같은 계절로 묶임)','충':'충(부딪힘)','합':'합(묶임)','원진':'원진(서로 꺼림)','자형':'자형(스스로 깎임)','형':'형(서로 깎임)','파':'파(깨짐)','해':'해(틀어짐)'};
 var SEAT_K={'일지':'나와 배우자 자리','월지':'사회생활 자리','연지':'집안 자리','년지':'집안 자리','시지':'자녀·말년 자리','일간':'나','월간':'사회생활 자리 윗글자'};
 var PLAIN_WHY=[
  // 값 줄: '함께 본 조건: 일지 亥巳충 / 관성 42% · 인성 24% · 정인격 성격.'
  [/^(?:함께 본 조건|이 사주에서 확인된 조건):\s*/,'함께 확인한 것: '],
  [/ — 지지 정기 포함 판정/g,''],[/ — 둘 다 천간에 드러남/g,' — 둘 다 윗글자에 드러남'],
  [/(일지|월지|연지|년지|시지|일간|월간) ([子丑寅卯辰巳午未申酉戌亥甲乙丙丁戊己庚辛壬癸]{2}) ?(반합|삼합|방합|충|원진|자형|형|파|해|합)([木火土金水])?/g,function(m,seat,pair,rel,el){var a=hzK(pair);return SEAT_K[seat]+'('+seat+')의 '+a.charAt(0)+'·'+a.charAt(1)+' '+REL_K[rel]+(el?'→'+hzK(el)+' 기운':'');}],
  [/([子丑寅卯辰巳午未申酉戌亥]{2})(자형|충|원진|형|파|해|합)/g,function(m,pair,rel){var a=hzK(pair);return a.charAt(0)+'·'+a.charAt(1)+' '+REL_K[rel];}],
  [/([가-힣]{2})격 성격/g,'$1격이 잘 짜인 사주'],[/([가-힣]{2})격 파격/g,'$1격이 흐트러진 사주'],
  [/원국 온도 ([+-]?\d+(?:\.\d+)?)/g,function(m,n){var v=Number(n);return '타고난 사주의 온도 '+(v>=0.3?'따뜻한 편':v<=-0.3?'차가운 편':'보통')+'('+n+')';}],
  [/용신이 원국에 (\d+)%/g,'가장 필요한 기운(용신)이 사주에 $1%뿐'],
  [/근거 강도: ([가-힣]+) — 맞는 세부 규칙이 없어, 가장 큰 기운 묶음으로 읽은 바탕 풀이예요\./g,'확신 정도: $1 — 딱 맞는 세부 조건이 없어서, 가장 큰 기운으로 읽은 기본 풀이예요.'],
  [/근거 강도:/g,'확신 정도:'],
  // 내 힘(일간)
  [/일간\(나를 뜻하는 글자\)을 돕는 힘이 원국에서 적은 상태예요\./g,'나를 돕는 기운이 타고난 사주에 적은 편이에요.'],
  [/일간을 돕는 힘이 원국에서 적은 상태예요\./g,'나를 돕는 기운이 타고난 사주에 적은 편이에요.'],
  [/일간의 힘이 신약이라/g,'내 힘이 약한 편이라'],[/일간의 힘이 중화이라/g,'내 힘이 한쪽으로 기울지 않아서'],[/일간의 힘이 신강이라/g,'내 힘이 센 편이라'],
  [/일간의 힘\(신강·중화\)에 따라/g,'내 힘의 크기에 따라'],
  [/일간의 힘이 약한데\(신약\)/g,'내 힘이 약한 편인데'],
  [/일간의 힘이 약하고 원국의 지지에 일간의 뿌리\(통근\)가 거의 없어요\./g,'내 힘이 약하고, 그 힘을 받쳐 줄 뿌리(통근)도 아래 글자에 거의 없어요.'],
  [/일간이 지지에 뿌리\(통근\)를 두지 못했어요\./g,'내 힘을 받쳐 줄 뿌리(통근)가 아래 글자에 없어요.'],[/일간이 지지에 뿌리를 두지 못했어요\(통근 없음\)\./g,'내 힘을 받쳐 줄 뿌리(통근)가 아래 글자에 없어요.'],
  [/일간의 힘이 약하고 뿌리\(통근\)도 얕아요\./g,'내 힘이 약하고, 받쳐 줄 뿌리(통근)도 얕아요.'],
  [/일간의 뿌리\(통근\)가 원국 지지에 단단하고/g,'내 힘을 받쳐 줄 뿌리(통근)가 아래 글자에 단단하고'],
  [/통근 모델 구간이 [가-힣·\s]+?이에요\./g,'내 힘을 받쳐 줄 뿌리(통근)가 약한 편이에요.'],
  [/일간이 크게 강하지 않아요/g,'내 힘이 크게 세지 않아요'],
  [/일간(?:의 힘)?(이|은) (약해|약하|약한|넉넉하지|충분한|충분하)/g,function(m,j,w){return '내 힘'+(j==='은'?'은':'이')+' '+w;}],
  [/일간의 힘이/g,'내 힘이'],[/일간의 힘은/g,'내 힘은'],[/일간의 힘과/g,'내 힘과'],[/일간의 힘/g,'내 힘'],
  [/일간을 다스리는 힘/g,'나를 다스리는 기운'],[/일간이 다루는 대상의 힘/g,'내가 다루는 대상의 기운'],[/일간을 덜어내는/g,'내 힘을 빼 가는'],[/일간을 돕는 힘/g,'나를 돕는 힘'],[/나와 같은 오행의 힘/g,'나와 같은 기운'],
  // 정의 문장 끝
  [/를 뜻하는 십성군이에요\./g,'를 뜻해요.'],[/을 뜻하는 십성군이에요\./g,'을 뜻해요.'],
  [/(와|과) 연결해 보는 신살이에요\./g,'$1 연결해 보는 별이에요.'],[/을 상징하는 신살이에요\./g,'을 상징하는 별이에요.'],[/를 상징하는 신살이에요\./g,'를 상징하는 별이에요.'],
  [/(?:가|이) 상대적으로 많다는 분류예요\./g,'이 상대적으로 많다는 뜻이에요.'],[/크게 기울지 않았다는 분류예요\./g,'어느 쪽으로도 크게 기울지 않았다는 뜻이에요.'],
  [/(?:구조|구도|경우)로 계산된 경우예요\./g,'구조라는 뜻이에요.'],[/(?:크다고|많다고) 계산된 경우예요\./g,'크다는 뜻이에요.'],
  // 대운·세운
  [/대운은 (순행|역행)이며, 첫 대운은 실제로 만 ([\d.]+)세에 시작해요\(대운수 \d+\)\./g,function(m,d,a){return '10년 운(대운)은 '+(d==='순행'?'앞으로 흐르는 순서(순행)':'거꾸로 흐르는 순서(역행)')+'이고, 첫 10년 운은 만 '+a+'세에 시작해요.';}],
  [/나이 구간은 대운이 바뀌는 실제 시각으로 계산했어요\./g,'나이 구간은 10년 운이 실제로 바뀌는 날짜에 맞췄어요.'],
  [/(현재|다음) 대운 천간 십성이 ([가-힣]{2}) 쪽이고/g,function(m,w,g){return (w==='현재'?'지금':'다음')+' 10년 운(대운)의 윗글자가 '+g+' 쪽이고';}],
  [/다음 대운 교체까지/g,'다음 10년 운으로 바뀌기까지'],[/교체까지 (\d+)년 이내예요/g,'바뀌기까지 $1년이 안 남았어요'],
  [/올해 세운이 일지와 충·형·파·해 계열의 관계를 이루(?:는 구조이)?고(?: 내 힘이 약한 편이고)?, 올해 세운이 원국 일지와 부딪히는 관계(?:인 데다|라)/g,'올해 운이 나와 배우자 자리(일지)와 부딪히는 해인 데다'],
  [/올해 세운이 일지와 충·형·파·해 계열의 관계를 이루/g,'올해 운이 나와 배우자 자리(일지)와 부딪히는 관계를 이루'],
  [/(현재 대운|올해 세운) 흐름이 전환기·방어기로 분류되고/g,function(m,w){return (w==='현재 대운'?'지금 10년 운':'올해 운')+'이 바뀌거나 지키는 흐름이고';}],
  [/이 풀이는 (?:대운·세운|10년 운·1년 운) 계산값만 근거로 하고,/g,'이 풀이는 10년 운·1년 운만 보고,'],
  // 자리·관계
  [/일지가 원진·귀문관을 이(뤄요|루고 있어요)\./g,'나와 배우자 자리(일지)에 서로 꺼리고 예민해지는 관계(원진·귀문관)가 있어요.'],
  [/일지나 월지에 형\(서로 깎아내는 긴장\)이 걸려 있어요\./g,'나와 배우자 자리나 사회생활 자리에 서로 깎아내는 긴장(형)이 걸려 있어요.'],
  [/원국 글자 사이에 천간충이 있어요\./g,'타고난 사주의 윗글자끼리 부딪히는 관계(천간충)가 있어요.'],
  [/배우자 자리인 일지에/g,'나와 배우자 자리(일지)에'],
  [/지지 속에 숨은 글자\(지장간\)에/g,'아래 글자 속에 숨은 글자(지장간)에'],
  // 오행·십성 비중
  [/원국에서 ([목화토금수])(\([^)]+\))? 오행의 비중이 (높은|낮은) 편이에요\./g,function(m,e,d,h){return '타고난 사주에 '+EL_WORD[e]+' 기운'+(d||'')+'이 '+(h==='높은'?'많은':'적은')+' 편이에요.';}],
  [/([목화토금수])\(([^)]+?)(?:의 기운)?\)(?:이|가) 높고 ([목화토금수])\(([^)]+?)(?:의 기운)?\)(?:이|가) 낮음 조합이라 전통에서는 [^,]+? 읽어서,/g,function(m,a,da,b,db){return EL_WORD[a]+' 기운('+da+')은 많고 '+EL_WORD[b]+' 기운('+db+')은 적어서,';}],
  [/([가-힣]{2})(?:이|가) 높고 (?:내 힘|일간의 힘)이 약함 조합이라/g,function(m,a){return a+jo(a,'은','는')+' 많은데 내 힘은 약해서';}],
  [/([가-힣]{2})(?:이|가) 높고 ([가-힣]{2})(?:이|가) 낮음 조합이라/g,function(m,a,b){return a+jo(a,'은','는')+' 많고 '+b+jo(b,'은','는')+' 적어서';}],
  [/([가-힣]{2})의 세력이 높고 ([가-힣]{2})의 세력이 낮은 불균형이라,/g,function(m,a,b){return a+jo(a,'은','는')+' 많고 '+b+jo(b,'은','는')+' 적어서,';}],
  [/([가-힣]{2})(?:이|가) 높고 ([가-힣]{2})(?:이|가) 중간이라/g,function(m,a,b){return a+jo(a,'은','는')+' 많고 '+b+jo(b,'은','는')+' 보통이라';}],
  [/(비겁|식상|재성|관성|인성)의 세력이 (?:낮은 편이고|낮은 편이에요)/g,function(m,g){return g+jo(g,'이','가')+' 적은 편'+(/이고$/.test(m)?'이고':'이에요');}],
  [/(비겁|식상|재성|관성|인성)의 세력(?:이|은) (높은 편|중간|낮은 편)이에요/g,function(m,g,h){return g+jo(g,'이','가')+' '+(h==='높은 편'?'많은 편':h==='중간'?'보통':'적은 편')+'이에요';}],
  [/(비겁|식상|재성|관성|인성)과 (비겁|식상|재성|관성|인성)의 세력이 모두 큰 편이고/g,'$1과 $2이 모두 많은 편이고'],
  [/(비겁|식상|재성|관성|인성) 세력이/g,'$1이'],
  [/원국 전체에서는? /g,'타고난 사주 전체에서 '],[/원국 십성의/g,'사주 전체 기운의'],[/원국의 (\d+)%/g,'사주의 $1%'],
  [/원국에 /g,'타고난 사주에 '],[/원국에서 /g,'타고난 사주에서 '],[/원국의 /g,'타고난 사주의 '],[/원국 /g,'타고난 사주 '],
  // 조사: '겁재이', '편재이', '인성가'
  [/([가-힣])·([가-힣]{2})(이|가) (있고|있어요|많|두드러)/g,function(m,a,b,j,t){return a+'·'+b+jo(b,'이','가')+' '+t;}],
  [/(정관|편관|정인|편인|식신|상관|정재|편재|비견|겁재|비겁|식상|재성|관성|인성)(이|가) /g,function(m,w){return w+jo(w,'이','가')+' ';}],
  [/중화이라/g,'중화라'],
  [/(큰데 [^.,]*?힘이 약해)서, /g,'$1요. 그래서 '],   // '…적어서 …힘은 큰데 …힘이 약해서, …'처럼 '서'가 두 번 이어진 긴 문장을 끊는다
  [/억부와 조후 기준이 같은 용신 오행이 ([목화토금수])(\([^)]+\))?(?:이에요|예요)/g,function(m,e,d){return '내게 가장 필요한 기운(용신)은 '+EL_WORD[e]+' 기운'+(d||'')+'이에요';}],
  [/용신은 균형을 맞추는 쪽의 상징이고, 이 전략은 그 상징을 분기 단위의 행동 원칙으로 옮긴 것이에요\./g,'용신(가장 필요한 기운)은 균형을 맞추는 쪽의 상징이고, 이 전략은 그걸 석 달 단위 행동 원칙으로 옮긴 거예요.'],
  [/일간 ([갑을병정무기경신임계][목화토금수])([은는]) /g,'태어난 날 글자인 $1$2 '],
  // 문장 첫머리 십성 이름: 생활 말을 앞에 붙여 '용어로 시작'을 피한다(뒤 조사는 용어에 맞춘 그대로)
  [/(^|[.?!] )(비겁|식상|재성|관성|인성|정관|편관|정인|편인|식신|상관|정재|편재|비견|겁재)(이 |가 |과 |와 |은 많|는 많|은 적|는 적)/g,function(m,a,g,j){return a+TG_PLAIN[g]+'('+g+')'+j;}],
  [/용신은 균형을 맞추는 쪽의 상징이고, 이 해석은 그 상징을 생활 습관으로 옮긴 것이에요\./g,'용신(가장 필요한 기운)은 균형을 맞추는 쪽의 상징이고, 이 풀이는 그걸 생활 습관으로 옮긴 거예요.'],
  [/같은 구조도 내 힘의 크기에 따라 행동으로 나타나는 모습이 달라서 나눠서 풀었어요\./g,'같은 구조라도 내 힘의 크기에 따라 행동으로 드러나는 모습이 달라서 나눠 풀었어요.']];
 var TG_PLAIN={비겁:'나와 같은 기운',식상:'표현의 기운',재성:'돈과 결과의 기운',관성:'책임의 기운',인성:'배움과 도움의 기운',정관:'바른 책임의 기운',편관:'강한 압박의 기운',정인:'따뜻한 도움의 기운',편인:'혼자 깊이 보는 기운',식신:'꾸준한 재주의 기운',상관:'솔직한 표현의 기운',정재:'꾸준히 쌓는 돈',편재:'크게 오가는 돈',비견:'나란한 동료의 기운',겁재:'경쟁하는 동료의 기운'};
 // 값 줄('함께 확인한 것: 관성 42% · 인성 24% · 정인격이 잘 짜인 사주.')은 용어 없이 생활 말로만 보여 준다(2026-11-24). 용어 뜻은 같은 칸의 풀이 문장과 각주에 있다.
 var PATTERN_PLAIN={재다신약:'돈은 많은데 내 힘이 약한 구조',관살과다:'책임과 압박이 많은 구조',관살혼잡:'책임의 기운 두 갈래가 섞인 구조',군겁쟁재:'여럿이 돈을 나눠 갖는 구조',상관견관:'솔직한 표현이 책임과 부딪히는 구조','식상과다(설기)':'표현으로 힘이 많이 빠져나가는 구조',식상과다:'표현으로 힘이 많이 빠져나가는 구조',식신제살:'꾸준한 재주가 압박을 눌러 주는 구조',상관패인:'배움이 솔직한 표현을 다듬어 주는 구조',신약:'내 힘이 약한 편',신강:'내 힘이 센 편',중화:'내 힘이 균형 잡힌 편'};
 var BAND_PLAIN={신약:'약한 편',신강:'센 편',중화:'균형'};
 var TG_RE='비겁|식상|재성|관성|인성|정관|편관|정인|편인|식신|상관|정재|편재|비견|겁재';
 var VAL_PLAIN={비겁:'나와 같은 힘',식상:'표현',재성:'돈과 결과',관성:'책임',인성:'배움과 도움',정관:'바른 책임',편관:'강한 압박',정인:'따뜻한 도움',편인:'혼자 깊이 보기',식신:'꾸준한 재주',상관:'솔직한 표현',정재:'꾸준히 쌓는 돈',편재:'크게 오가는 돈',비견:'나란한 동료',겁재:'경쟁하는 동료'};
 function valueLine(body){var v=body;
  v=v.replace(/가장 큰 묶음 /g,'가장 많은 것은 ');
  v=v.split(' / ').join('. ');   // 값 여러 묶음은 문장으로 나눠 보여 준다
  Object.keys(PATTERN_PLAIN).sort(function(a,b){return b.length-a.length;}).forEach(function(k){v=v.split(k+' — ').join(PATTERN_PLAIN[k]+' — ');});
  v=v.replace(/정관과 편관이 함께 있음/g,'바른 책임과 강한 압박이 함께 있음').replace(/상관과 정관이 함께 있음/g,'솔직한 표현과 바른 책임이 함께 있음');
  v=v.replace(new RegExp('('+TG_RE+')격이 잘 짜인 사주','g'),function(m,g){return VAL_PLAIN[g]+'을 중심으로 잘 짜인 사주';}).replace(new RegExp('('+TG_RE+')격이 흐트러진 사주','g'),function(m,g){return VAL_PLAIN[g]+'을 중심으로 한 틀이 흐트러진 사주';});
  v=v.replace(new RegExp('(^|[\\s·(,—/])('+TG_RE+') (\\d+(?:\\.\\d+)?%)','g'),function(m,a,g,n){return a+VAL_PLAIN[g]+' '+n;});
  v=v.replace(new RegExp('(^|[\\s·(,—/])('+TG_RE+')(이|가) (\\d+(?:\\.\\d+)?%)','g'),function(m,a,g,j,n){return a+VAL_PLAIN[g]+(jo(VAL_PLAIN[g],'이','가'))+' '+n;});
  v=v.replace(/나를 돕는 힘 (\d+(?:\.\d+)?%)\((신약|신강|중화)\)/g,function(m,n,b){return '나를 돕는 힘 '+n+'('+BAND_PLAIN[b]+')';});
  v=v.replace(/(나를 돕는 힘 \d+(?:\.\d+)?%)(.*?) · \1(?:\([^)]*\))?/g,'$1$2');   // 같은 값 두 번
  v=v.replace(/일지 ([가-힣])·([가-힣]) (원진|자형|충|형|파|해|합)/g,function(m,a,b,r){return '나와 배우자 자리의 '+a+'·'+b+' '+REL_K[r];});
  v=v.replace(/(^|[\s·])([가-힣])·([가-힣]) (자형|원진)(?!\()/g,function(m,p,a,b,r){return p+a+'·'+b+' '+REL_K[r];});
  v=v.replace(new RegExp('(일지|월지) ([子丑寅卯辰巳午未申酉戌亥])\\(('+TG_RE+')\\)','g'),function(m,seat,b,g){return SEAT_K[seat]+'의 '+hzK(b)+'('+VAL_PLAIN[g]+')';});
  return v;}
 function plainBasis(t){var v=plainSay(t);PLAIN_WHY.forEach(function(p){v=v.replace(p[0],p[1]);});v=v.replace(/(함께 확인한 것|내 사주에서 확인한 것): (.+?)(?=\.(?:\s|$)|$)/g,function(m,h,b){return h+': '+valueLine(b);});return v.replace(/\s{2,}/g,' ').trim();}
 function readingParagraphs(text,shorten){var blocks=[];String(text||'').split(/\n+/).filter(function(t){return t.trim();}).forEach(function(block){block=plainSay(block);if(!block)return;if(shorten)block=concise(block.trim());var group=[],size=0;sentences(block).forEach(function(sentence){var example=/^예를\s*들[어면]/.test(sentence);if(group.length&&(example||group.length>=2||size+sentence.length>110)){blocks.push(group.join(' '));group=[];size=0;}group.push(sentence);size+=sentence.length+1;});if(group.length)blocks.push(group.join(' '));});return blocks;}
 function withPart(part,html){return part&&R.ReadingPlus?html+R.ReadingPlus.feedback(part):html;}
 function readingParagraphHtml(text,role,shorten){return readingParagraphs(text,shorten).map(function(t){var part=R.ReadingPlus&&R.ReadingPlus.partFor?R.ReadingPlus.partFor(t):'';return '<p class="lead'+(/^예를\s*들[어면]/.test(t)?' reading-example':'')+'" data-reading-role="'+esc(role)+'">'+esc(t)+'</p>';}).join('');}
 function midFeedback(text){var found='';readingParagraphs(text,false).some(function(t){var part=R.ReadingPlus&&R.ReadingPlus.partFor?R.ReadingPlus.partFor(t):'';if(part){found=part;return true;}return false;});return found&&R.ReadingPlus?R.ReadingPlus.feedback(found,null,true):'';}

 function section(c,ci,suffix,body,extra){return '<section class="scene rd-sec rd-prose text-reading-section '+(extra||'')+'" data-bg="-1" data-ch="'+ci+'" data-sc="'+esc(c.id+'_text_'+suffix)+'">'+body+'</section>';}
 // Display only supplied engine proportions. These are not personality scores or predictions.
 var elementOrder=['목','화','토','금','수'],elementColors={목:'#58b88a',화:'#e97a70',토:'#d8b74e',금:'#d8dee9',수:'#566b88'};function groupElement(sd,k){var idx=sd&&sd.dayMaster&&(typeof sd.dayMaster.elIdx==='number'?sd.dayMaster.elIdx:elementOrder.indexOf(sd.dayMaster.el));return idx>=0?elementOrder[(idx+['비겁','식상','재성','관성','인성'].indexOf(k))%5]:'';}
 // 심화 장(재물·커리어·인연 13~15) 그래프: 엔진이 이미 계산한 오행 비율·용신 역할, 대운표·월운만 쓴다.
 var TG_GROUP={비견:'비겁',겁재:'비겁',식신:'식상',상관:'식상',편재:'재성',정재:'재성',편관:'관성',정관:'관성',편인:'인성',정인:'인성'},TOPIC_KO={wealth:'재물',career:'커리어',love:'인연'};
 function topicGroups(topic,sd){return topic==='wealth'?['재성','식상']:topic==='career'?['관성','식상']:(sd&&sd.gender==='M'?['재성','식상']:['관성','식상']);}
 // 타이밍 장 공통: 인생 전체 대운 흐름 그래프 → 앞으로 올 시기 순위·점수·이유 → (해당 장) 가까운 12개월 순위. 점수는 엔진의 적합도(fitScore)와 주제에 맞는 십성으로만 만든 읽기용 지표이고 확률이 아니다.
 var TIMING_TOPIC={timeline_self_20:'life',timeline_self_peak:'life',timeline_self_24:'life',timeline_wealth_06:'wealth',timeline_wealth_10:'wealth',timeline_wealth_14:'wealth',timeline_career_08:'career',timeline_career_12:'career',timeline_career_14:'career',timeline_love_08:'love',timeline_love_14:'love'},MONTH_IDS={timeline_self_24:1,timeline_wealth_14:1,timeline_career_14:1,timeline_love_14:1,timeline_career_08:1,timeline_wealth_06:1,timeline_love_08:1};
 var GROUP_MEANING={life:{비겁:'내 힘으로 밀고 나가는 기운',식상:'재주와 표현이 살아나는 기운',재성:'결과가 손에 잡히는 기운',관성:'자리와 책임이 커지는 기운',인성:'배움과 도움이 들어오는 기운'},wealth:{재성:'돈이 직접 오가는 기운',식상:'재주가 수입으로 바뀌는 기운',비겁:'사람과 돈이 얽히는 기운',관성:'신용과 안정 수입의 기운',인성:'실력을 쌓아 두는 기운'},career:{관성:'자리와 승진의 기운',식상:'결과물로 인정받는 기운',재성:'성과가 보상으로 이어지는 기운',비겁:'독립과 경쟁의 기운',인성:'자격과 배움의 기운'},love:{관성:'인연이 진지해지는 기운',재성:'만남이 현실로 이어지는 기운',식상:'마음을 표현하는 기운',비겁:'친구 같은 인연과 자존심의 기운',인성:'마음을 돌보는 기운'}};
 var COND_TEXT={순풍:'원래 사주와 흐름이 잘 맞아 순풍을 받아요',보통:'원래 사주를 무난하게 받쳐 줘요',주의:'힘을 쓰려면 조심이 필요한 흐름이 섞여 있어요',부담:'버거운 흐름이 섞여 있어 점수를 낮췄어요'};
 var TOPIC_LABEL={life:'인생',wealth:'재물',career:'커리어',love:'인연'};
 function hasClash(x){return (x.relations||[]).some(function(r){return r&&/충/.test(r.type||'');});}
 function timingWant(topic,gender){return topic==='wealth'?['재성','식상']:topic==='career'?['관성','식상']:topic==='love'?(gender==='M'?['재성','인성']:['관성','인성']):null;}
 function timingScore(p,topic,gender){var fit=p.assessment&&typeof p.assessment.fitScore==='number'?p.assessment.fitScore:({순풍:25,보통:5,주의:-15,부담:-25}[p.condition]||0),want=timingWant(topic,gender),sg=TG_GROUP[p.stemTG],bg=TG_GROUP[p.branchTG],n;
  if(!want)n=50+Math.max(-30,Math.min(40,fit))*0.9+({opportunity:5,expansion:6,harvest:6,accumulation:2}[p.season]||0);
  else n=45+Math.max(-30,Math.min(40,fit))*0.6+(sg===want[0]?22:sg===want[1]?10:0)+(bg===want[0]?10:bg===want[1]?5:0);
  if(hasClash(p))n-=6;
  return Math.round(Math.max(5,Math.min(99,n)));}
 function timingReason(p,topic,gender){var g=TG_GROUP[p.stemTG],m=GROUP_MEANING[topic][g],want=timingWant(topic,gender),out='';
  if(p.stemTG)out+=p.stemTG+' 대운이라 '+(m||'새로운 기운')+'이 들어오고, ';
  out+=(COND_TEXT[p.condition]||'원래 사주와의 관계는 보통이에요')+'.';
  if(want&&g===want[0])out+=' '+TOPIC_LABEL[topic]+((TOPIC_LABEL[topic].charCodeAt(TOPIC_LABEL[topic].length-1)-0xAC00)%28?'과':'와')+' 가장 직접 닿는 기운이라 점수를 더했어요.';
  if(hasClash(p))out+=' 원래 사주와 부딪히는 글자가 있어 변동이 섞여요.';
  return out;}
 // 타이밍 장 그래프: 대운(10년)·세운(해마다)·월운(달마다) 세 층. 만세력 운세 흐름 그래프처럼 가운데 선(50점=보통)에서 위(힘이 실림)·아래(조심)로 막대를 그린다.
 // 막대 색 = 그 시기에 두드러지는 오행(2026-11-25, 만세력·타임라인과 같은 /luck-element-theme.js: 천간 1 + 지지 지장간). 길흉이 아니며, 좋음·무난·조심은 점수 옆 보조 표시. 점수는 읽기용 지표예요(확률 아님).
 var STEM_EL={갑:'목',을:'목',병:'화',정:'화',무:'토',기:'토',경:'금',신:'금',임:'수',계:'수'},TIMING_COLOR={목:'#6fae7f',화:'#c8705f',토:'#c4a65e',금:'#cfcabd',수:'#6f8fc4'};
 var TIERS=[{k:'good',n:'좋음',min:65},{k:'ok',n:'무난',min:45},{k:'care',n:'조심',min:-1}],SEASON_KW={opportunity:'기회',expansion:'확장',harvest:'수확',accumulation:'축적',transition:'전환',defense:'방어'};
 function tierOf(n){for(var i=0;i<TIERS.length;i++)if(n>=TIERS[i].min)return TIERS[i];return TIERS[TIERS.length-1];}
 function stemEl(gz){return STEM_EL[String(gz||'').charAt(0)]||'';}
 var EL_ORD=['목','화','토','금','수'],EL_HJ=['木','火','土','金','水'],EL_WORDS=['성장·기획','표현·창작','안정·관리','실행·계약','탐구·전략'],EL_COL=['#46C27E','#F2604F','#EDBB3A','#C9CED9','#6A8FEA'];
 // 간지 글자(한글·한자) → 주요 오행 번호. 엔진·공용 모듈이 없으면 천간 오행으로
 function elIdx(gz){gz=String(gz||'');var Mn=root.Manse,T=root.MantraLuckTheme;if(Mn&&T&&gz.length>=2){var s=Mn.STEM_K.indexOf(gz.charAt(0)),b=Mn.BR_K.indexOf(gz.charAt(1));if(s<0)s=Mn.STEM.indexOf(gz.charAt(0));if(b<0)b=Mn.BR.indexOf(gz.charAt(1));if(s>=0&&b>=0){try{var m=T.mainEl(Mn,{s:s,b:b});if(m)return m.el;}catch(e){}}}var e=stemEl(gz);return e?EL_ORD.indexOf(e):-1;}
 function colorOf(gz){var i=elIdx(gz);return i>=0?EL_COL[i]:'#d5b97f';}
 function legendHtml(){return '<div class="rt-legend" aria-label="막대 색은 그 시기에 두드러지는 오행이에요">'+EL_ORD.map(function(k,i){return '<span style="--t:'+EL_COL[i]+'"><i></i>'+EL_HJ[i]+' '+k+' '+EL_WORDS[i]+'</span>';}).join('')+'<small>막대 색 = 그 시기에 두드러지는 기운(길흉 아님) · 가운데 선 = 보통(50점), 위로 길수록 힘이 실리고 아래로 길수록 조심할 때예요 · 숫자 옆 좋음·무난·조심 = 점수 등급(보조)</small></div>';}
 function luckScore(x,topic,gender){var want=timingWant(topic,gender),sg=TG_GROUP[x.stemTG],bg=TG_GROUP[x.branchTG],cond=({순풍:8,보통:0,주의:-8,부담:-12}[x.condition]||0),n;
  if(!want)n=50+cond*1.6+({opportunity:6,expansion:7,harvest:7,accumulation:3}[x.season]||0);
  else n=50+(sg===want[0]?25:sg===want[1]?12:0)+(bg===want[0]?12:bg===want[1]?6:0)+cond;
  if(hasClash(x))n-=8;return Math.round(Math.max(5,Math.min(99,n)));}
 function luckReason(x,topic,unit){var g=TG_GROUP[x.stemTG],m=(GROUP_MEANING[topic]||{})[g],el=stemEl(x.ganzhi),out='';
  if(x.stemTG)out+=(x.ganzhi?x.ganzhi+'('+el+') ':'')+x.stemTG+'의 '+(unit==='해'?'해라 ':'달이라 ')+(m||'새로운 기운')+'이 들어와요.';
  if(x.condition)out+=' '+(COND_TEXT[x.condition]||'원래 사주와의 관계는 보통이에요')+'.';
  if(hasClash(x))out+=' 부딪히는 글자가 있어 서두르지 않는 게 좋아요.';return out;}
 function bars(items,aria){var dense=items.length>10?' rt-dense':'';return '<div class="rt-flow'+dense+'" role="img" aria-label="'+esc(aria)+'"><div class="rt-bands" aria-hidden="true"><span>50</span></div>'+items.map(function(x){var t=tierOf(x.n),v=Math.max(-50,Math.min(50,x.n-50)),up=v>=0;var ei=elIdx(x.gz||(x.p&&x.p.ganzhi)||x.ganzhi);return '<div class="rt-col t-'+t.k+(up?' is-up':' is-down')+(x.cur?' is-current':'')+(x.past?' is-past':'')+'" style="--v:'+(Math.abs(v)/50).toFixed(3)+(ei>=0?';--t:'+EL_COL[ei]:'')+'" title="'+esc(String(x.title||'').replace(/<[^>]+>/g,''))+' '+x.n+'점 · '+(ei>=0?EL_ORD[ei]+' 기운 · ':'')+t.n+'"><div class="rt-plot"><i class="rt-bar"></i><span class="rt-tag"><b>'+x.n+'</b><em>'+t.n+'</em></span></div><small class="rt-lab">'+x.label+'</small></div>';}).join('')+'</div>';}
 function rankList(items,cls){return items.length?'<ol class="rt-rank'+(cls?' '+cls:'')+'">'+items.map(function(x,i){var t=tierOf(x.n);return '<li class="t-'+t.k+'"><span class="rt-no">'+(i+1)+'위</span><div><strong><i class="rt-dot" style="--e:'+colorOf(x.gz)+'"></i>'+x.title+'</strong><em>'+x.n+'점 <span class="rt-pill">'+t.n+'</span></em><p>'+esc(x.reason)+'</p></div></li>';}).join('')+'</ol>':'';}
 function gzHtml(gz){return '<b class="rt-dw"><i class="rt-dot" style="--e:'+colorOf(gz)+'"></i>'+esc(gz||'')+'</b>';}
 function kwHtml(x){var k=SEASON_KW[x&&x.season];return k?'<span class="rt-kw">'+k+'</span>':'';}
 function topOf(items,k){return items.filter(function(x){return !x.past&&!x.endingSoon&&!x.late;}).slice().sort(function(a,b){return b.n-a.n||a.ord-b.ord;}).slice(0,k);}
 // 지금 대운: 날짜(startDate~endBefore)가 있으면 오늘 날짜로, 없으면 연도로 고른다. 연도만 보면 대운이 바뀌는 해에 두 대운이 겹쳐 풀이(날짜 기준)와 어긋난다.
 function todayKst(){return new Date(Date.now()+9*3600e3).toISOString().slice(0,10);}
 function currentIndex(rows,now){var td=todayKst(),k=-1;if(rows.some(function(p){return p.startDate;})){rows.forEach(function(p,i){if(p.startDate&&p.startDate<=td&&(!p.endBefore||td<p.endBefore))k=i;});if(k>=0)return k;}rows.forEach(function(p,i){if(k<0&&p.startYear<=now&&now<=p.endYear)k=i;});return k;}
 // 2026-11-23: 해·달 점수는 장 첫 문장·본문·'앞으로 10년' 그래프와 같은 순위 함수(ReadingFeature.rank)에서 가져온다 — 같은 장에서 '가장 좋은 해'가 서로 다르지 않게.
 // 그 함수가 없거나 값이 빠진 해·달만 예전 점수(luckScore)를 쓴다.
 function rfScores(c,topic){var R0=R.ReadingFeature,H=c&&c.readingFeature;if(!R0||!R0.rank||!H||!H.M||!H.ch||['wealth','career','love'].indexOf(topic)<0)return null;var out={y:{},m:{}};
  try{(R0.rank(H.M,H.ch,H.now||Date.now(),topic,'year')||[]).forEach(function(r){if(Number.isFinite(r.y))out.y[r.y]=r.v;});(R0.rank(H.M,H.ch,H.now||Date.now(),topic,'month')||[]).forEach(function(r){if(Number.isFinite(r.y)&&Number.isFinite(r.m))out.m[r.y+'-'+r.m]=r.v;});}catch(e){return null;}return out;}
 // 대운 점수 묶음(2026-11-23): 아래 rankedTiming 그래프와 같은 계산 — 서사의 '힘이 실리는 10년' 문장과 시기표 카드 등급이 함께 쓴다
 function dwItems(rows,now,topic,gender){var curIdx=currentIndex(rows,now),soonIdx=-1;
  if(curIdx>=0&&rows[curIdx+1]&&rows[curIdx].endBefore){var td=todayKst(),eb=rows[curIdx].endBefore,mm=(+eb.slice(0,4)-+td.slice(0,4))*12+(+eb.slice(5,7))-(+td.slice(5,7));if(mm<=12)soonIdx=curIdx+1;}
  return rows.map(function(p,i){var cur=i===curIdx;return {p:p,n:timingScore(p,topic,gender),cur:cur,endingSoon:cur&&soonIdx>=0,late:p.startAge>=80||p.condition==='주의'||p.condition==='부담'||!!(p.assessment&&p.assessment.defense),past:curIdx>=0?i<curIdx:p.endYear<now};});}
 // 앞으로 힘이 실리는 10년 k개(그래프 '앞으로 힘이 실리는 시기 순위'와 같은 순서)와 가장 약한 10년
 function topDecades(sd,topic,k){var rows=(sd&&sd.daewoon||[]).filter(function(p){return Number.isFinite(p.startYear)&&Number.isFinite(p.endYear)&&Number.isFinite(p.startAge)&&p.startAge<90;});if(!rows.length)return null;
  var it=dwItems(rows,sd.nowYear||new Date().getFullYear(),topic,sd.gender).filter(function(x){return !x.past&&!x.endingSoon&&!x.late;}),by=it.slice().sort(function(a,b){return b.n-a.n||a.p.startYear-b.p.startYear;});
  return {top:by.slice(0,k||2).map(function(x){return x.p;}),low:by.length>2?by[by.length-1].p:null};}
 // 대운 하나의 등급(그래프와 같은 점수): 시기표 카드 칸 표시에 쓴다
 function dwTier(sd,topic,gz,startYear){var p=(sd&&sd.daewoon||[]).filter(function(x){return x.ganzhi===gz&&(!startYear||Math.abs(x.startYear-startYear)<=1);})[0];return p?tierOf(timingScore(p,topic,sd.gender)):null;}
 // 운의 단위(2026-11-24): 대운·세운·월운·일진을 헷갈리지 않게 단위·비유·색·막대 모양을 다르게(타임라인과 같은 색: 10년 호박·1년 청록·1달 보라·하루 빨강)
 var UNITS={daeun:['10년','대운','인생의 계절','막대 하나가 10년이에요. 10년마다 바뀌는 큰 환경이에요.'],seun:['1년','세운','그해의 날씨','막대 하나가 1년이에요. 대운(계절) 안에서 해마다 바뀌는 분위기예요.'],wolun:['1달','월운','이번 달의 기온','막대 하나가 한 달이에요(절기 기준). 한 해 안에서 달마다 바뀌는 흐름이에요.'],iljin:['하루','일진','오늘의 바람','그날그날의 흐름이에요. 날짜별로는 일진 캘린더에서 볼 수 있어요.']};
 function unitChip(u){var U=UNITS[u];return U?'<i class="u-chip u-'+u+'">'+U[0]+' · '+U[1]+'</i>':'';}
 function unitRuler(on){return '<ol class="u-ruler" aria-label="운의 단위: 10년 안에 1년, 1년 안에 1달, 1달 안에 하루">'+['daeun','seun','wolun','iljin'].map(function(u){var U=UNITS[u];return '<li class="u-'+u+(on&&on.indexOf(u)>=0?' on':'')+'"><b>'+U[0]+'</b><span>'+U[1]+' · '+U[2]+'</span></li>';}).join('')+'</ol><p class="u-ruler-note">큰 흐름 안에 작은 흐름이 들어 있어요. 10년의 계절(대운) 안에 해마다 날씨(세운)가, 그 안에 달마다 기온(월운)이, 그 안에 그날의 바람(일진)이 있어요.</p>';}
 function unitHead(u){var U=UNITS[u];return '<div class="u-head"><i class="u-chip u-'+u+'">'+U[0]+'</i><b>'+U[1]+' · '+U[2]+'</b><span>'+U[3]+'</span></div>';}
 // 운 문단의 단위 알아보기: 달 > 10년 > 해 순서로 보고, 문단 앞에 단위 표를 붙인다
 function unitOfPara(t){t=String(t||'');if(/\d{4}년 \d{1,2}월|12개월|달은|달이에요|월은 /.test(t))return 'wolun';if(/대운|10년은|만 \d+~\d+세/.test(t))return 'daeun';if(/\d{4}년|해는|올해|내년|5년 중/.test(t))return 'seun';return '';}
 function unitParasHtml(text,role){return readingParagraphs(text,false).map(function(t){var u=unitOfPara(t);return '<p class="lead u-p'+(u?' u-'+u:'')+'" data-reading-role="'+esc(role)+'">'+(u?unitChip(u)+' ':'')+esc(t)+'</p>';}).join('');}
 function rankedTiming(periods,now,topic,gender,monthly,withMonths,annual,rf){
  var rows=(periods||[]).filter(function(p){return Number.isFinite(p.startYear)&&Number.isFinite(p.endYear)&&Number.isFinite(p.startAge)&&p.startAge<90;});if(!rows.length)return '';
  var curIdx=currentIndex(rows,now),soonIdx=-1;
  // 교운기: 지금 대운이 12개월 안에 끝나면 다음 대운에 '곧' 표시(풀이의 교운기 문장과 같은 기준).
  if(curIdx>=0&&rows[curIdx+1]&&rows[curIdx].endBefore){var td=todayKst(),eb=rows[curIdx].endBefore,mm=(+eb.slice(0,4)-+td.slice(0,4))*12+(+eb.slice(5,7))-(+td.slice(5,7));if(mm<=12)soonIdx=curIdx+1;}
  var dw=rows.map(function(p,i){var cur=i===curIdx;return {p:p,n:timingScore(p,topic,gender),cur:cur,endingSoon:cur&&soonIdx>=0,late:p.startAge>=80||p.condition==='주의'||p.condition==='부담'||!!(p.assessment&&p.assessment.defense),past:curIdx>=0?i<curIdx:p.endYear<now,gz:p.ganzhi,ord:p.startYear,label:gzHtml(p.ganzhi)+'<span class="rt-age">'+Math.floor(p.startAge)+'<span class="rt-age2">~'+(Math.floor(p.startAge)+10)+'</span>세</span>'+kwHtml(p)+(cur?'<em class="rt-now">지금</em>':i===soonIdx?'<em class="rt-now rt-soon">곧</em>':''),title:esc(p.ganzhi||'')+' 대운 · 만 '+Math.floor(p.startAge)+'~'+(Math.floor(p.startAge)+10)+'세 ('+p.startYear+'~'+p.endYear+'년)'+(cur?' · 지금':''),reason:timingReason(p,topic,gender)};});
  var out='<figure class="reading-overview reading-timing-rank" data-reading-chart data-chart-kind="timing-rank"><figcaption>'+esc(TOPIC_LABEL[topic])+' 흐름 한눈에 보기</figcaption>'+legendHtml();
  // 2026-11-24: 맨 위 단위 눈금자(10년 ▸ 1년 ▸ 1달 ▸ 하루), 층마다 단위 머리띠·색·막대 모양을 다르게
  var layers=['daeun'].concat(withMonths&&annual&&annual.length?['seun']:[]).concat(withMonths&&monthly&&monthly.length?['wolun']:[]);out+=unitRuler(layers);
  var tp=topOf(dw,3);out+='<section class="rt-unit u-daeun">'+unitHead('daeun')+bars(dw,TOPIC_LABEL[topic]+' 대운 흐름 그래프')+(tp.length?'<p class="rt-sub">앞으로 힘이 실리는 10년 순위</p>'+rankList(tp):'')+'</section>';
  if(withMonths&&annual&&annual.length){
   var yr=annual.filter(function(y){return Number.isFinite(y.year);}).map(function(y){var n=rf&&Number.isFinite(rf.y[y.year])?rf.y[y.year]:luckScore(y,topic,gender);return {n:n,gz:y.ganzhi,cur:!!y.isNow,past:false,ord:y.year,label:gzHtml(y.ganzhi)+'<span class="rt-age">'+y.year+'</span>'+kwHtml(y)+(y.isNow?'<em class="rt-now">올해</em>':''),title:y.year+'년 ('+esc(y.ganzhi||'')+')'+(y.isNow?' · 올해':''),reason:luckReason(y,topic,'해')};});
   if(yr.length)out+='<section class="rt-unit u-seun">'+unitHead('seun')+'<p class="rt-sub">앞으로 10년, 해마다</p>'+bars(yr,TOPIC_LABEL[topic]+' 세운 흐름 그래프')+'<p class="rt-sub">힘이 실리는 해 순위</p>'+rankList(topOf(yr,3))+'</section>';}
  if(withMonths&&monthly&&monthly.length){
   var mo=monthly.filter(function(m){return Number.isFinite(m.year)&&Number.isFinite(m.month);}).map(function(m,i){var n=rf&&Number.isFinite(rf.m[m.year+'-'+m.month])?rf.m[m.year+'-'+m.month]:luckScore(m,topic,gender);return {n:n,gz:m.ganzhi,cur:!!m.isNow,past:false,ord:m.year*12+m.month,label:'<b class="rt-dw rt-mo">'+m.month+'월</b><span class="rt-age"><i class="rt-dot" style="--e:'+colorOf(m.ganzhi)+'"></i>'+esc(m.ganzhi||'')+'</span>'+kwHtml(m)+(m.isNow?'<em class="rt-now">이번 달</em>':''),title:m.year+'년 '+m.month+'월'+(m.term?' ('+esc(m.term)+' 무렵부터)':''),reason:luckReason(m,topic,'달')};});
   if(mo.length)out+='<section class="rt-unit u-wolun">'+unitHead('wolun')+'<p class="rt-sub">가까운 12개월, 달마다</p>'+bars(mo,TOPIC_LABEL[topic]+' 월운 흐름 그래프')+'<p class="rt-sub">힘이 실리는 달 순위</p>'+rankList(topOf(mo,3),'rt-months')+'</section>';}
  return out+'</figure>';}
 function elementRoleChart(sd,id){var f=sd.fiveElements,roles=sd.usefulElements&&sd.usefulElements.roles;if(!f||!roles)return '';var tag={용신:'나를 채워 주는 기운',희신:'나를 돕는 기운',한신:'중간 기운',구신:'부딪히기 쉬운 기운',기신:'부딪히기 쉬운 기운'};
  return '<figure class="reading-overview reading-chart-bars" data-reading-chart data-chart-kind="element-roles"><figcaption>나를 채워 주는 기운과 부딪히기 쉬운 기운</figcaption>'+elementOrder.map(function(el){var n=Math.round((+f[el]||0)*10)/10;return '<div class="reading-chart-row" data-element="'+el+'" style="--element-color:'+elementColors[el]+'"><span>'+el+' <small>'+esc(tag[roles[el]]||'')+'</small></span><span class="reading-chart-track"><i style="width:'+n+'%;--value:'+n+'%"></i></span><b>'+n+'%</b></div>';}).join('')+seasonalCaption(sd)+'</figure>';}
 // 계절·월령 한 줄(2026-11-20): 태어난 달의 주도 기운과, 글자 수로만 볼 때와 실제 힘의 차이 — 만세력 오행·강약 탭과 같은 계산(sd.seasonal)
 function seasonalCaption(sd){var S=sd.seasonal,f=sd.fiveElements;if(!S||!f)return '';var st=S.states||{},wang=elementOrder.filter(function(e){return st[e]==='왕';})[0],weak=elementOrder.filter(function(e){return st[e]==='사';})[0];var diff=elementOrder.map(function(e){return {e:e,d:(+f[e]||0)-(+S.appearance[e]||0)};}).filter(function(x){return Math.abs(x.d)>=3;}).sort(function(a,b){return Math.abs(b.d)-Math.abs(a.d);}).slice(0,2);
  return '<p class="reading-chart-note">태어난 달은 '+esc(S.command.el)+' 기운이 주도하는 때라'+(wang&&wang!==S.command.el?'':'')+(weak?' '+esc(weak)+' 기운은 눌리기 쉬워요':' 그 기운이 힘을 얻어요')+'. '+(diff.length?'글자 수로만 세면 '+diff.map(function(x){return esc(x.e)+' '+Math.round(+S.appearance[x.e])+'%';}).join(' · ')+'인데, 계절과 뿌리를 따지면 '+diff.map(function(x){return esc(x.e)+' '+Math.round(+f[x.e])+'%';}).join(' · ')+'로 달라져요. 막대는 계절까지 따진 실제 힘이에요.':'막대는 계절까지 따진 실제 힘이에요.')+'</p>';}
 // 기질 장 첫머리: 사주 원국표(시·일·월·년 순, 천간/지지 한자 + 오행 색 + 십성). 이 표를 먼저 보여 주고 풀이를 이어 간다.
 var GZ_EL={'甲':'목','乙':'목','丙':'화','丁':'화','戊':'토','己':'토','庚':'금','辛':'금','壬':'수','癸':'수','寅':'목','卯':'목','巳':'화','午':'화','辰':'토','戌':'토','丑':'토','未':'토','申':'금','酉':'금','亥':'수','子':'수'};
 // 2026-11-13: 원국표는 주제마다 첫 장에서 한 번만 보여 준다(종합풀이 timeline_self_03 · 재물·커리어·인연 각 주제의 첫 장 = 게시 목차 순서 0).
 //   표는 운명의 타임라인과 같은 자세한 원국표(report/natal-table.js: 지장간·12운성·12신살·신살)를 쓰고, 그 모듈이 없으면 예전 간단한 표.
 var ORIGIN_FIRST=/^timeline_(self_03|wealth_01|career_01|love_01)$/;
 function isOriginChapter(c){var id=c.editorialContractId||c.id||'';return (ORIGIN_FIRST.test(id)||/^timeline_(wealth|career|love)_/.test(id)&&c.editorialSequence===0)&&!!(c.readingVisualData&&c.readingVisualData.pillars);}
 function originHtml(c){var f=c.readingFeature,N=root.MantraNatal;if(N&&f&&f.M&&f.ch){try{return '<figure class="reading-overview reading-origin reading-origin-full mt-natal rd" data-reading-chart data-chart-kind="pillars-full"><figcaption>내 사주 원국<small>이 주제를 읽기 전에 먼저 보는 타고난 여덟 글자</small></figcaption>'+N.html(f.M,f.ch)+'</figure>';}catch(e){}}return originChart(c.readingVisualData);}
 function originChart(sd){var P=sd.pillars,cols=[['hour','시주','태어난 시간'],['day','일주','나'],['month','월주','태어난 달'],['year','연주','태어난 해']];
  var cell=function(ch,tg,me){var el=GZ_EL[ch]||'';return '<div class="og-gz" data-el="'+esc(el)+'" style="--og-c:'+(elementColors[el]||'#888')+'"><b>'+esc(ch||'?')+'</b><small>'+esc(el)+'</small></div>'+(tg||me?'<span class="og-tg">'+esc(me?'나 · 일간':tg)+'</span>':'');};
  return '<figure class="reading-overview reading-origin" data-reading-chart data-chart-kind="pillars"><figcaption>내 사주 원국<small>태어난 순간의 여덟 글자</small></figcaption><div class="og-grid">'+cols.map(function(k){var p=P[k[0]],hz=p&&p.hanja?String(p.hanja):'';if(!p)return '<div class="og-col is-empty"><p class="og-h">'+k[1]+'<small>'+k[2]+'</small></p><div class="og-gz og-none"><b>?</b></div><div class="og-gz og-none"><b>?</b></div><span class="og-tg">시각 미상</span></div>';
   return '<div class="og-col'+(k[0]==='day'?' is-day':'')+'"><p class="og-h">'+k[1]+'<small>'+k[2]+'</small></p>'+cell(hz.charAt(0),p.stemTG,k[0]==='day')+cell(hz.charAt(1),p.branchTG,false)+'<span class="og-ko">'+esc(p.ko||'')+'</span></div>';}).join('')+'</div><p class="og-note">위 글자가 천간, 아래 글자가 지지예요. 가운데 <b>일주</b>의 위 글자가 나 자신(일간)이고, 나머지 일곱 글자와의 관계로 기질을 읽어요.</p></figure>';}
 function overview(c){if(c.readingVisualData&&c.readingVisualData.peakPeriods){var pk=rankedTiming(c.readingVisualData.peakPeriods,c.readingVisualData.nowYear||new Date().getFullYear(),'life',c.readingVisualData.gender,null,false);if(pk)return pk;var d=c.readingVisualData;return '<figure class="reading-overview" data-reading-chart><figcaption>내 인생의 대운 흐름</figcaption><ol class="reading-luck-timeline">'+d.peakPeriods.map(function(p){return '<li'+(p.startYear===d.peakSelected?' class="is-selected" aria-label="선정된 대운"':'')+'><b>'+p.startYear+'~'+p.endYear+'년</b><span>'+Math.floor(p.startAge)+'세 무렵 · '+esc(d.peakLabels[p.season]||p.season)+'</span></li>';}).join('')+'</ol></figure>';}var sd=c.readingVisualData,id=c.editorialContractId||c.id||'';if(sd&&TIMING_TOPIC[id]&&sd.daewoon){var tc=rankedTiming(sd.daewoon,sd.nowYear||new Date().getFullYear(),TIMING_TOPIC[id],sd.gender,sd.monthlyLuck,true,sd.annualLuck,rfScores(c,TIMING_TOPIC[id]));if(tc)return tc;}if(sd&&/^timeline_(wealth|career|love)_1[35]$/.test(id)){var ec=elementRoleChart(sd,id);if(ec)return ec;}if(sd&&id==='timeline_self_03'&&sd.pillars)return originChart(sd);if(sd&&/^timeline_self_(20|21)$/.test(id)&&sd.daewoon){var now=sd.nowYear||new Date().getFullYear(),periods=sd.daewoon.filter(function(p){return id==='timeline_self_20'||p.endYear>=now&&p.startYear<=now+9;}),labels={opportunity:'새 일 꺼내기',expansion:'해온 일 넓히기',harvest:'대가 챙기기',accumulation:'실력 쌓기',transition:'방향 바꾸기',defense:'생활 지키기'};return '<figure class="reading-overview" data-reading-chart data-chart-kind="timeline"><figcaption>'+esc(id==='timeline_self_20'?'내 인생의 대운 흐름':'앞으로 10년에 걸치는 대운')+'</figcaption><ol class="reading-luck-timeline">'+periods.map(function(p){return '<li><b>'+p.startYear+'~'+p.endYear+'년</b><span>'+esc(labels[p.season]||p.season)+'</span></li>';}).join('')+'</ol></figure>';}if(!sd||!/^timeline_(self|wealth|career|love|remedy|timing)_\d+$/.test(id))return '';var groups=sd.groups||{},names={비겁:'내 방식·주도성',식상:'표현·실행',재성:'돈·결과',관성:'약속·책임',인성:'배움·준비'},keys=Object.keys(names);if(!keys.every(function(k){return typeof groups[k]==='number'&&Number.isFinite(groups[k])&&groups[k]>=0&&groups[k]<=100;}))return '';
 var n=Number(id.split('_').pop()),topic=id.split('_')[1],labels={wealth:['내 몫 지키기','수입으로 잇는 재주','돈 관리 관심','계약과 약속','준비와 정보'],career:['스스로 결정','결과물 만들기','성과 챙기기','역할과 책임','배우고 익히기'],love:['내 마음 지키기','마음 표현','함께 생활하기','관계의 약속','상대 이해'],remedy:['내 페이스','밖으로 풀기','생활 정돈','기준 세우기','쉬며 채우기'],timing:['주도권','시도와 표현','현실의 결실','책임과 변화','준비와 배움']};var focused={timeline_self_07:['내 뜻 지키기','솔직한 표현','결과 챙기기','책임감','생각과 준비'],timeline_self_10:['내 방식 유지','말과 행동으로 풀기','결과를 살피는 마음','책임을 느끼는 마음','생각하고 정리하기'],timeline_self_17:['내 힘으로 해결','직접 방법 찾기','돈과 시간 챙기기','혼란 속 기준 잡기','배운 방법 다시 쓰기'],timeline_wealth_03:['내 돈 지키기','돈 버는 재주','수입·지출 관심','지불 약속','지출 전 확인'],timeline_love_03:['내 마음 먼저 보기','애정 표현','함께 쓰는 돈과 시간','관계의 약속','상대 이해하기']};if(focused[id])labels[topic]=focused[id];if(labels[topic])keys.forEach(function(k,i){names[k]=labels[topic][i];});if(id==='timeline_self_01')keys.forEach(function(k){names[k]=k+' · '+names[k];});if(id==='timeline_self_02')keys.forEach(function(k,i){names[k]=['구동축 · 내 중심','엔진 · 표현과 실행','계기판 · 현실 확인','브레이크 · 책임과 기준','연료 · 배움과 준비'][i];});var kind=id==='timeline_self_02'?'parts':['bars','radar','columns','stacked'][(n-1)%4];
 var body='<figure class="reading-overview reading-chart-'+kind+'" data-reading-chart data-chart-kind="'+kind+'"><figcaption>'+esc(id==='timeline_self_02'?'내 사주의 자동차 설계도':c.title+' · 기운의 구성')+'</figcaption>'+keys.map(function(k){var n=Math.round(groups[k]*10)/10,el=groupElement(sd,k),color=elementColors[el]||'#d5b97f';return '<div class="reading-chart-row" data-element="'+el+'" style="--element-color:'+color+'"><span>'+names[k]+' <small>'+el+'</small></span><span class="reading-chart-track"><i style="width:'+n+'%;--value:'+n+'%"></i></span><b>'+n+'%</b></div>';}).join('')+'<details class="reading-chart-basis"><summary>이 그래프는 무엇인가요</summary><p>내 사주에서 다섯 가지 힘이 각각 얼마나 차지하는지를 이 장의 주제에 맞는 이름으로 보여 줘요. 능력이나 재산의 점수는 아니에요.</p></details></figure>';
 if(kind==='stacked'){var strip='<div class="reading-stacked-strip" role="img" aria-label="기운의 전체 구성">'+keys.map(function(k){var el=groupElement(sd,k);return '<span style="width:'+groups[k]+'%;background:'+(elementColors[el]||'#d5b97f')+'" title="'+esc(names[k])+' '+groups[k]+'%"></span>';}).join('')+'</div>';body=body.replace('</figcaption>','</figcaption>'+strip);}
 if(kind==='radar'){var pt=function(i,r){var a=(i*72-90)*Math.PI/180;return (150+Math.cos(a)*r).toFixed(1)+','+(125+Math.sin(a)*r).toFixed(1);},svg='<svg viewBox="0 0 300 250" role="img" aria-label="십성 기운 구성 오각형">';[25,50,75,100].forEach(function(r){svg+='<polygon class="radar-grid" points="'+keys.map(function(k,i){return pt(i,r);}).join(' ')+'"/>';});svg+='<polygon class="radar-value" points="'+keys.map(function(k,i){return pt(i,groups[k]);}).join(' ')+'"/></svg>';svg=svg.replace('</svg>',keys.map(function(k,i){var xy=pt(i,groups[k]).split(',');return '<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="4" fill="'+(elementColors[groupElement(sd,k)]||'#d5b97f')+'"/>';}).join('')+'</svg>');body=body.replace('</figcaption>','</figcaption>'+svg);}
 if(id==='timeline_self_02'){var mode=groups.식상>=28?['출발은 빠르게','동시에 벌이는 일은 줄이기','새 일 전에 하나 마무리']:groups.식상<12?['준비한 뒤 출발','완벽한 준비만 기다리지 않기','10분짜리 첫 단계부터']:['달리며 속도 조절','목적지가 흐려지지 않게','점검 날짜와 마감 나누기'];body+='<div class="reading-car-route" aria-label="자동차 비유로 보는 일 처리 방식">'+mode.map(function(t,i){return '<div><small>'+['출발','주행 중 주의','도착을 돕는 습관'][i]+'</small><strong>'+esc(t)+'</strong></div>';}).join('')+'</div>';}
 return body;
 }

 var TITLE_HOOKS={"運路·序章":"이 이야기는 당신이 태어난 날에서 시작해요.","나의일주":"이름보다 먼저, 태어난 날이 나를 소개해 줘요.","나의일간과일주":"이름보다 먼저, 태어난 날이 나를 소개해 줘요.","내안의다섯기운":"내 안에서 제일 센 것과 제일 약한 것은 뭘까요?","타고난성격과기질":"남들 앞에서 버티는 나와 혼자 있을 때의 나, 어느 쪽이 진짜일까요?","타고난특징과성향":"남들은 모르는 내 기본값이 궁금하지 않나요?","숨겨진재능":"아직 써 보지 않은 능력이 내 안에 남아 있을지도 몰라요.","나의약점과그림자":"잘하는 만큼 어딘가 약한 데가 있어요. 솔직하게 짚어 볼게요.","나의강점과취약점":"잘하는 것만큼 약한 곳도 솔직하게 짚어 볼게요.","나의사주핵심요약":"한 장으로 줄이면, 나는 어떤 사람일까요?","지금내가서있는곳":"지금 내가 서 있는 자리는 인생의 어디쯤일까요?","직업적성진단":"어떤 일을 할 때 내 실력이 제일 잘 나올까요?","나의성공방식":"나는 어떤 방식으로 일할 때 결과가 나오는 사람일까요?","재물그릇과돈버는방식":"돈이 들어오는 길과 새는 길, 내 사주는 어디가 열려 있을까요?","연애성향":"좋아하면 티가 나는 사람인가요, 속으로만 삼키는 사람인가요?","결혼과배우자":"같이 오래 살 사람에게 나는 어떤 사람일까요?","대인관계설명서":"사람들이 나를 좋아하는 이유와 불편해하는 이유가 따로 있어요.","나와잘맞는사람":"끌리는 사람과 편한 사람, 같은 사람인가요?","가족과뿌리":"가족에게 물려받은 것 중 계속 가져갈 것과 내려놓을 것은 뭘까요?","오래된뿌리":"지금의 나를 만든 오래된 뿌리를 한 번 짚어 볼게요.","인생전체의계절":"내 인생, 어느 계절을 지나고 있을까요?","전체인생흐름":"내 인생 전체를 한 번에 보면 어떤 모양일까요?","지금나는어느계절에있는지알아보세요":"지금 나는 봄일까요, 겨울일까요?","대운분석":"10년마다 분위기가 바뀐다는데, 지금은 어떤 때일까요?","향후10년의세운분석":"앞으로 10년, 해마다 무엇이 달라질까요?","앞으로10년의구간":"앞으로 10년은 몇 개의 구간으로 나뉠까요?","올해의흐름":"올해, 힘을 줄 때와 쉬어 갈 때는 언제일까요?","올해와월별운세":"올해는 어느 달에 힘을 주고 어느 달에 쉬어야 할까요?","앞으로12개월":"앞으로 12개월, 어느 달이 고비이고 어느 달이 기회일까요?","월운지도":"이번 달부터 열두 달을 지도처럼 펼쳐 볼게요.","다음길을여는방법":"운을 바꾸는 건 거창한 게 아니에요. 오늘 할 수 있는 작은 것부터요.","終章·운로사용설명서":"지금까지 읽은 걸 한 장의 사용설명서로 줄여 볼게요.","신살·사주에붙은별":"사주에 붙은 별들은 좋은 걸까요, 나쁜 걸까요?","12운성과12신살":"내 안의 에너지는 지금 오르막일까요, 내리막일까요?","십성·내안의다섯힘":"내 안의 힘들은 서로 어떻게 부딪히고 도울까요?","맞는일주·끌리는일주·부딪히는일주":"끌리는 사람과 부딪히는 사람, 어떤 차이가 있을까요?"};
 function personalOpening(c){if(c.id==='timeline_self_peak')return {hook:'운이 열리는 때를 알았다면, 이제 무엇을 준비할까요?',text:null};var sd=c.readingVisualData,id=c.editorialContractId||c.id||'',g=sd&&sd.groups;if(!g||!sd.dayMaster||c.editorialTopicId==='creative'||c.readingProvider==='local-reviewed-education')return null;var keys=['비겁','식상','재성','관성','인성'].filter(function(k){return Number.isFinite(g[k]);}).sort(function(a,b){return g[b]-g[a];});if(keys.length!==5)return null;
 var top=keys[0],second=keys[1],traits={비겁:['스스로 납득한 기준대로 움직이는','내 기준을 세우는'],식상:['생각을 말과 결과물로 꺼내는','직접 표현하고 실행하는'],재성:['들인 노력과 남는 결과를 따져보는','현실의 결과를 챙기는'],관성:['맡은 일과 약속을 끝까지 챙기는','약속과 책임을 지키는'],인성:['이유를 이해하고 준비한 뒤 움직이는','배우고 이해하는']},name=sd.name?sd.name+'님은':'당신은',stem=sd.dayMaster.stem||'',el=sd.dayMaster.el||'',band=sd.strength&&sd.strength.band;
 var text=name+' '+stem+el+' 일간에 '+traits[top][1]+' '+top+' 기운이 두드러져서, '+traits[top][0]+' 특성을 갖고 있어요. '+traits[second][1]+' '+second+' 기운도 함께 있어 '+({비겁:'다른 사람의 말만 듣고 내 결정을 바꾸지는 않으세요.',식상:'머릿속에만 담아두기보다 직접 말하거나 만들어보며 답을 찾으세요.',재성:'좋아 보이는 제안도 시간과 비용을 확인한 뒤 판단하세요.',관성:'하고 싶은 일에도 지켜야 할 선과 책임을 먼저 확인하세요.',인성:'결정하기 전에 이유와 배경부터 확인하세요.'}[second]);
 if(band==='신약')text+=' 주변의 부탁을 받아내는 데 힘을 쓰세요. 겉으로는 잘해내도, 내 할 일까지 겹치면 혼자 지쳐요.';
 else if(band==='신강')text+=' 스스로 밀고 나가는 힘도 받쳐줘서 한번 정한 일은 쉽게 놓지 않으세요. 대신 다른 방법을 받아들이는 데 시간이 걸려요.';
 else if(band==='중화')text+=' 자기 뜻을 밀고 나가면서도 상황을 살피는 힘이 함께 있어요. 모두의 조건을 맞추려 할 때는 내 결정이 늦어져요.';
 var hooks={비겁:'내 기준을 지키는 힘, 언제 고집으로 바뀔까요?',식상:'생각을 밖으로 꺼내야 마음이 풀리는 이유가 있어요.',재성:'말보다 결과를 먼저 보는 눈을 갖고 있어요.',관성:'남들은 넘기는 약속도 그냥 지나치지 못하시죠?',인성:'머리로 납득해야 마음도 움직이시죠?'},hook=hooks[top];var alt={비겁:['남이 정해 주는 건 싫고 내가 정하는 건 끝까지 가죠?','양보하면 지는 것 같은 순간, 있지 않나요?'],식상:['속에 담아 두면 답답하고 말하고 나면 후회되죠?','말이 먼저 나가는 날과 막히는 날, 차이는 어디서 올까요?'],재성:['돈이든 시간이든 남는 게 있어야 마음이 놓이죠?','내 몫이 얼마인지 계산부터 하게 되는 순간이 있어요.'],관성:['해야 한다는 생각이 쉬는 시간까지 따라오죠?','기대에 맞추느라 내 마음은 뒤로 미룬 적 있죠?'],인성:['알아야 안심이 되는데, 알수록 시작은 늦어지죠?','충분히 이해하고 나서야 움직이는 편이죠?']},pick=(Number(String(id).replace(/[^0-9]/g,'')||0)+String(c.title||'').length)%3;if(alt[top]&&pick>0)hook=alt[top][pick-1];
 if(id==='timeline_self_02'){hook=top==='관성'?'잘 달리는 것만큼, 제때 멈추는 게 중요한 차예요.':top==='식상'?'시동은 빠른데, 멈출 타이밍을 놓치시나요?':top==='인성'?'지도와 연료를 챙기느라 출발이 늦어지는 차예요.':'내 사주가 자동차라면, 힘이 실리는 부품부터 달라요.';text=name+' '+({관성:'약속과 책임을 지키는 관성 기운이 강해요. 자동차로 치면 브레이크와 안전장치를 꼼꼼히 챙기는 차예요.\n\n일을 맡기면 빠진 게 없는지 확인하고 끝까지 챙기세요. 대신 달려도 되는 길에서도 자꾸 멈춰 확인하는 습관이 있어요.',인성:'배우고 준비하는 인성 기운이 강해요. 자동차로 치면 연료를 넉넉히 채우고 지도를 익혀야 출발하는 차예요.\n\n낯선 일도 꼼꼼히 준비해서 실수를 줄이세요. 대신 준비를 끝낼 기준이 없으면 출발이 늦어져요.',식상:'직접 표현하고 실행하는 식상 기운이 강해요. 자동차로 치면 시동이 빠르고 가속이 시원한 차예요.\n\n생각한 것을 직접 해보면서 답을 찾으세요. 대신 여러 일을 동시에 벌이면 마무리를 놓쳐요.',재성:'시간과 돈, 결과를 챙기는 재성 기운이 강해요. 자동차로 치면 연비와 도착 시간을 자주 확인하는 차예요.\n\n들인 만큼 무엇이 남는지 꼼꼼히 살피세요. 대신 숫자만 보느라 함께하는 사람의 마음을 지나칠 때가 있어요.',비겁:'내 기준으로 움직이는 비겁 기운이 강해요. 자동차로 치면 핸들을 스스로 잡고 내가 정한 길로 가는 차예요.\n\n결정한 일은 남의 말에 쉽게 흔들리지 않고 밀고 나가세요. 대신 함께하는 사람의 속도도 살펴야 해요.'}[top]);}
 else if(id==='timeline_self_03'){hook='겉으로 보이는 나와 가까운 사람이 아는 나는 왜 다를까요?';var day=sd.pillars&&sd.pillars.day;if(day)text+=' '+day.ko+' 일주는 이 기운이 일상의 관계에서 드러나는 모습을 함께 보는 자리예요.';}
 else {var title=c.title||'';hook=TITLE_HOOKS[String(title).replace(/[\s?？.]/g,'')]||hook||title.replace(/[?？]$/,'');}
 return {hook:hook,text:/^timeline_self_0[23]$/.test(id)?text:null};
 }
 var NOTE_SENTENCE=/(진단하지|예측하지|단정하지|증명하거나|가정한 (설명|상황)|사실로 제시하지|고전 원문|새로운 명리 근거로)/,CALC_SENTENCE=/(\d+(?:\.\d+)?\s*%|적용 조건|[a-z]+-[a-z]+|게시 근거|만세력에서 계산|엔진으로 계산)/;
 // 대인관계 궁합 장: 만세력 엔진이 60일주를 내 원국과 비교한 값(보완도·충돌 주의·끌림)을 그대로 보여 준다. 상대 일주 두 글자만 가정한 참고예요.
 function cpFriendly(t){return String(t||'').replace(/입니다/g,'이에요').replace(/합니다/g,'해요');}
 function cpTile(x,withWhy,whyKey){var sc=elementColors[elementOrder[x.sEl]]||'#d5b97f',bc=elementColors[elementOrder[x.bEl]]||'#d5b97f',why=withWhy?cpFriendly((x[whyKey]||[])[0]||''):'';
  return '<li class="rc-tile"><span class="rc-gz" aria-hidden="true"><b style="background:'+sc+'">'+esc(x.s)+'</b><b style="background:'+bc+'">'+esc(x.b)+'</b></span><span class="rc-k">'+esc(x.k)+'일주</span><strong>'+x.score+'<small>점</small></strong><em>'+esc(x.type||'')+(x.condition?' · '+esc(x.condition):'')+'</em>'+(why?'<p>'+esc(why)+'</p>':'')+'</li>';}
 function cpList(title,note,rows,withWhy,whyKey,n){rows=(rows||[]).slice(0,n||5);if(!rows.length)return '';return '<h4>'+esc(title)+(note?' <small>'+esc(note)+'</small>':'')+'</h4><ul class="rc-tiles n'+rows.length+'">'+rows.map(function(x){return cpTile(x,withWhy,whyKey);}).join('')+'</ul>';}
 // 서사 규칙이 없는 장(자동차 비유·대인관계 궁합·돈 버는 법·건강)은 근거 상자에 '내 사주에서는' 값 줄이 없었다(감사 2026-11-15). 그 장의 질문에 맞는 사주 값을 쉬운 말로 붙인다
 var FACT_GLOSS={비겁:'내 힘',식상:'표현·재능',재성:'돈·성과',관성:'일·책임',인성:'배움·도움'},FACT_IDS={timeline_self_02:1,timeline_self_28:1,timeline_self_32:1,timeline_self_35:1};
 function chapterFacts(c){var id=c&&(c.editorialContractId||c.id),sd=c&&c.readingVisualData;if(!FACT_IDS[id]||!sd||!sd.dayMaster)return '';
  var r1=function(v){return Math.round(+v||0);},g=sd.groups||{},st=sd.strength||{},ue=sd.usefulElements||{},dm=sd.dayMaster,gl=function(k){return k&&FACT_GLOSS[k]?k+'('+FACT_GLOSS[k]+') '+r1(g[k])+'%':'';};
  var cl=sd.climate||{},clTxt=(cl.temp>0.3?'더운':cl.temp<-0.3?'찬':'온도가 고른')+' 편'+(cl.hum>0.3?', 습한 쪽':cl.hum<-0.3?', 건조한 쪽':''),fe=sd.fiveElements||{},lines=[];
  var band=st.band?({신약:'약한 편',극약:'아주 약한 편',태약:'아주 약한 편',중화:'고른 편',신강:'센 편',태강:'아주 센 편',극왕:'아주 센 편'}[st.band]||st.band)+'('+st.band+(Number.isFinite(st.help)?', 나를 돕는 힘 '+r1(st.help)+'%':'')+')':'';   // 2026-11-23: 쉬운 말 먼저, 용어는 괄호
  var ELW={목:'나무(목)',화:'불(화)',토:'흙(토)',금:'쇠(금)',수:'물(수)'};
  if(id==='timeline_self_02'){lines.push('나를 뜻하는 글자(일간) '+dm.hanja+'('+dm.stem+dm.el+')'+(band?' · 내 힘 '+band:''));lines.push('가장 큰 기운 '+gl(sd.dominantGroup)+(sd.weakestGroup?' · 가장 약한 기운 '+gl(sd.weakestGroup):''));if(ue.yong)lines.push('가장 필요한 기운(용신) '+(ELW[ue.yong]||ue.yong)+(ue.hee?' · 함께 돕는 기운(희신) '+(ELW[ue.hee]||ue.hee):'')+' · 타고난 온도 '+clTxt);}
  if(id==='timeline_self_28'){var cp=sd.compat||{},dp=sd.dayPillar||{};lines.push('태어난 날 두 글자(일주) '+(dp.ko||'')+'('+(dp.hanja||'')+') — 가까운 관계의 모습은 아래 글자(일지)로 봐요');if((cp.good||[]).length)lines.push('나와 잘 맞는 일주 상위: '+cp.good.slice(0,3).map(function(x){return x.k+'('+x.score+'점)';}).join(' · '));if((cp.risky||[]).length)lines.push('자극이 큰 일주: '+cp.risky.slice(0,2).map(function(x){return x.k;}).join(' · '));if(sd.dominantGroup)lines.push('관계에서 가장 많이 쓰는 기운 '+gl(sd.dominantGroup));}
  if(id==='timeline_self_32'){lines.push(['식상','재성','관성'].map(gl).join(' · '));if(ue.yong||band)lines.push((ue.yong?'가장 필요한 기운(용신) '+(ELW[ue.yong]||ue.yong):'')+(ue.yong&&band?' · ':'')+(band?'내 힘 '+band:''));if(sd.dominantGroup)lines.push('가장 큰 기운 '+gl(sd.dominantGroup));}
  if(id==='timeline_self_35'){lines.push('오행 비율 '+['목','화','토','금','수'].map(function(e){return e+' '+r1(fe[e])+'%';}).join(' · '));lines.push('가장 많은 기운 '+(sd.dominantEl||'')+(sd.lackEl?' · 없거나 가장 적은 기운 '+sd.lackEl:'')+' · 원국의 온도 '+clTxt);if(ue.yong)lines.push('균형을 잡아 주는 기운(용신) '+(ELW[ue.yong]||ue.yong));}
  lines=lines.filter(function(t){return t&&!/undefined|NaN|null/.test(t);});if(!lines.length)return '';
  return '<div class="reading-basis-group reading-facts"><h3>이 사주에서 확인된 조건</h3>'+lines.map(function(t){return '<p class="reading-mine" data-reading-role="evidence"><b>내 사주에서는</b> '+esc(t)+'.</p>';}).join('')+'</div>';}
 function compatHtml(c){var sd=c&&c.readingVisualData,cp=sd&&sd.compat;if(!cp||!(cp.good||[]).length)return '';
  return '<div class="reading-compat"><h3>만세력이 계산한 나의 궁합 일주</h3><p class="rc-note">내 원국의 억부·조후·오행 균형을 기준으로 60일주를 하나씩 비교한 값이에요. 상대의 전체 사주가 아니라 일주 두 글자만 가정한 참고라서, 두 사람의 전체 사주를 보면 달라질 수 있어요.</p>'
   +cpList('나와 잘 맞는 일주','보완도가 높은 순',cp.good,true,'reasons',5)
   +cpList('충돌·마찰에 주의할 일주','일지 충·형 같은 자극이 큰 순',cp.risky,true,'cautions',5)
   +cpList('내가 끌리는 일주','내 사주가 좋아하는 타입',cp.toThem,false,'',3)
   +cpList('나를 좋아하기 쉬운 일주','상대 일주가 나를 좋아하기 쉬운 조합',cp.toMe,false,'',3)
   +cpList('서로 끌리는 일주','양쪽 끌림이 모두 높은 조합',cp.mutual,false,'',3)
   +'<p class="rc-note">충돌·마찰 일주는 만나면 안 된다는 뜻이 아니에요. 서로 자극이 큰 조합이라 속도를 맞추고 대화를 더 해야 편해진다는 뜻이고, 끌림이 강해도 궁합 조건은 따로 볼 수 있어요.</p></div>';}
 // 서사 엔진(life-narrative.js, 스위치 lifeNarrative): 결과가 있으면 본문 5단계·후킹·근거 펼쳐보기를 그 결과로 쓴다. 없으면 기존 DB 문안 그대로.
 function narrativeBasis(ln){var ev=ln.evidence||{};return '<details class="reading-basis-group reading-narrative-basis"><summary>명리 근거 펼쳐보기</summary>'+(ev.lines||[]).map(function(t){t=plainBasis(t);return t?'<p data-reading-role="why">'+esc(t)+'</p>':'';}).join('')+((ev.terms||[]).length?'<dl class="reading-terms">'+ev.terms.map(function(x){return '<dt>'+esc(x.term)+'</dt><dd>'+esc(plainBasis(x.text))+'</dd>';}).join('')+'</dl>':'')+'</details>';}
 // 시기표 카드가 다루는 운 문단(life-narrative.js chapterLuck·luckStage0 의 대운 문장): 지금 대운·교운기·다음 대운·말년 대운
 var PERIOD_PARA=/^(?:지금 지나는 만 \d|지금은 \S+ 대운이 저물고|곧 들어올 만 \d|\d{4}년 무렵\(만 \d+~\d+세\)(?:부터는| \S+ 대운으로 넘어가면)|만 \d+~\d+세\(\S+ 대운, \d{4}년~\))/;
 var TONE_TAG={good:['t-good','흐름 좋음'],mixed:['t-ok','좋고 나쁨 섞임'],hard:['t-care','무게 실림']};
 // 칸 등급은 같은 장 그래프와 같은 점수(dwTier: 대운 점수 → 좋음·무난·조심), 고지·교운기 안내는 리포트에서 처음 한 번만(2026-11-23)
 var PERIOD_SEEN={},TIER_TAG={good:['t-good','흐름 좋음'],ok:['t-ok','흐름 무난'],care:['t-care','흐름 조심']};
 function periodsHtml(card,c){var items=card.items||[],sd=c&&c.readingVisualData,topic=c&&/^(wealth|career|love)$/.test(c.editorialTopicId||'')?c.editorialTopicId:((c&&(c.editorialContractId||c.id)||'').split('_')[1]||'life'),pk=sd?[sd.gender,sd.dayPillar&&sd.dayPillar.ko,sd.daewoon&&sd.daewoon[0]&&sd.daewoon[0].startYear,sd.nowYear].join('|'):'',seen=PERIOD_SEEN[pk]||(PERIOD_SEEN[pk]={});if(!/^(wealth|career|love)$/.test(topic))topic='life';
  var cur=items.filter(function(x){return x.tense==='current';})[0],crossTxt='';if(card.cross&&cur){var ye=+String(cur.years).split('~')[1]||0,ae=+(String(cur.age).match(/~(d+)/)||[])[1]||0;crossTxt=ye?ye+'년에 10년 운이 바뀌어요. 앞뒤 한 해씩('+(ye-1)+'~'+(ye+1)+'년'+(ae?', 만 '+(ae-1)+'~'+(ae+1)+'세':'')+')은 일·관계·생활이 흔들리기 쉬우니, 큰 결정은 새 흐름이 자리 잡는 걸 보고 내리세요.':card.cross;}
  var showCross=crossTxt&&!seen.cross,showFoot=!seen.foot;if(showCross)seen.cross=1;seen.foot=1;
  return '<div class="rd-periods u-daeun"><h3>시기별로 보면 '+unitChip('daeun')+'</h3><p class="u-line">칸 하나가 10년 운(대운)이에요. 해마다·달마다의 흐름은 "운이 바꾸는 것"에서 짚어요.</p><ol class="rp-list">'+items.map(function(x){var tr=sd&&R.ReadingText&&dwTier(sd,topic,x.gz,+String(x.years).slice(0,4)),t=tr?TIER_TAG[tr.k]:(TONE_TAG[x.tone]||TONE_TAG.mixed),now=x.tense==='current';
   return '<li class="rp-item '+t[0]+(now?' rp-now':'')+(x.tense==='past'?' rp-past':'')+'"><div class="rp-when"><b>'+esc(x.label)+'</b><span class="rp-age">'+esc(x.age)+' · '+esc(x.years)+'</span><em class="rp-tone">'+esc(t[1])+'</em></div><p>'+esc(x.text)+'</p><span class="rp-gz">'+esc(x.gz)+' 대운</span></li>';}).join('')+'</ol>'
  +(showCross?'<p class="rp-note">'+esc(crossTxt)+'</p>':'')+(showFoot?'<p class="rp-foot">지난 시기는 기억과 맞춰 보고, 앞으로의 시기는 준비할 방향으로 읽어 주세요. 좋음·무난·조심은 그 10년이 이 주제에서 나에게 얼마나 잘 맞는지예요.</p>':'')+'</div>';}
 function html(c,ci){var out=organize(c),h=section(c,ci,'head','<h2>'+esc(c.title)+'</h2>','rd-head rd-chead text-reading-head');
  var ln=!out.pending&&!out.creative&&!out.education&&R.LifeNarrative?R.LifeNarrative.forChapter(c):null;if(ln){out.rows=ln.rows.map(function(r){return {role:r.stage==='conflict'?'risk':r.stage==='advice'?'practice':'narr-'+r.stage,label:r.label,text:r.text,narr:true};});out.basis=[];}
  // 나이대(age-fit.js): 20세 미만에게 지금 겪는 어른 장면, 65세 이상에게 취업·승진·첫 연애 장면 문장을 뺀다. 생활 장면 문단이 통째로 비면 지금 나이의 장면으로 바꾼다
  var AF=R.AgeFit,ab=AF&&!out.pending&&!out.creative&&!out.education?AF.band(c.readingVisualData):'';if(ab){out.rows=out.rows.map(function(r){var sc=r.role==='reality'||r.role==='narr-life',t=AF.text(r.text,ab,sc);if(!t&&(r.role==='title'||r.role==='narr-core'))t=r.text;if(!t&&sc)t=AF.fill(ab,c.editorialTopicId||'self',c.title);return Object.assign({},r,{text:t});}).filter(function(r){return r.text;});}
  // 다음 대운까지 남은 해(게시 문안 self_21 의 '3년쯤 뒤면/3년 안에'는 3년 이내를 한데 묶은 말이라, 실제 해로 바꿔 보여 준다 2026-11-23)
  (function(){var sd0=c.readingVisualData,id0=c.editorialContractId||c.id;if(id0!=='timeline_self_21'||!sd0||!sd0.daewoon)return;var rows0=sd0.daewoon,ci0=currentIndex(rows0,sd0.nowYear||new Date().getFullYear()),nx=ci0>=0?rows0[ci0+1]:null,Y0=sd0.nowYear||new Date().getFullYear();if(!nx||!Number.isFinite(nx.startYear))return;var gap=nx.startYear-Y0;if(gap<0||gap>3)return;var when=gap<=0?'올해('+nx.startYear+'년)':gap===1?'내년('+nx.startYear+'년)':gap+'년 뒤('+nx.startYear+'년)';
   out.rows=out.rows.map(function(r){return Object.assign({},r,{text:String(r.text||'').replace(/3년쯤 뒤면/g,when+'이면').replace(/3년 안에/g,nx.startYear+'년부터').replace(/3년이라는 시간은/g,'남은 '+(gap<=1?'1년':gap+'년')+'은')});});})();
  // 시기표 카드(2026-11-23): 서사 엔진의 card(지나온 10년·지금·다음 10년·그다음)를 운 단계 자리에 넣고, 카드가 다룬 대운 문단은 운 문단에서 뺀다.
  // 전체 인생 흐름 장(self_20)은 '지나온 시기'·'지금과 앞으로' 두 문단을 카드 하나로 바꾼다.
  if(ln&&ln.card&&(ln.card.items||[]).length>=2){var pRow={role:'periods',card:ln.card,text:' '},li=out.rows.findIndex(function(r){return r.role==='narr-luck';});
   if(ln.chapterId==='timeline_self_20'){var lf=out.rows.findIndex(function(r){return r.role==='narr-life';});out.rows=out.rows.filter(function(r){return r.role!=='narr-life'&&r.role!=='narr-luck';});out.rows.splice(lf>=0?Math.min(lf,out.rows.length):Math.min(1,out.rows.length),0,pRow);}
   else{if(li>=0){var lr=out.rows[li],keep=String(lr.text||'').split(/\n{2,}/).filter(function(p){return !PERIOD_PARA.test(p.trim())&&p.trim()!==ln.card.cross;}).join('\n\n');if(keep.trim())out.rows[li]=Object.assign({},lr,{text:keep});else out.rows.splice(li,1);}out.rows.splice(li>=0?li:Math.min(1,out.rows.length),0,pRow);}}
  if(out.pending)return h+section(c,ci,'pending','<p role="status" data-reading-notice>'+esc(out.notice)+'</p>'+(c.readingWarning?'<button type="button" class="chipbtn" data-reading-retry>이 장 다시 불러오기</button>':'')+(c.readingLocked?'<button type="button" class="chipbtn" data-reading-unlock>구매 안내 보기</button>':'')+(c.readingFailure?'<details class="reading-error-detail"><summary>오류 상세 정보</summary><p>'+esc(c.readingFailure.code)+(c.readingFailure.requestId?' · '+esc(c.readingFailure.requestId):'')+'</p></details>':''),'reading-pending');
  var opening=personalOpening(c);if(opening)opening.text=null;var CHK=root.MantraChapterHooks,metaHook=CHK&&CHK[c.editorialContractId||c.id];if(metaHook){var hvd=c.readingVisualData||{},bigHook=CHK.fill?CHK.fill(metaHook,hvd.name):String(metaHook).split('{님}').join('당신'),ph=root.MantraPersonalHook&&root.MantraPersonalHook(c.editorialContractId||c.id,hvd);var hImg=(bigHook.match(/^.*?[.?!](?=\s|$)/)||[bigHook])[0],hTease=R.ReadingFeature&&R.ReadingFeature.teaser?R.ReadingFeature.teaser(c):null,hLine=ph&&ph.line?ph.line+'.':'';
  opening=hTease?{hook:hImg+' '+hTease,sub:hLine+(ph&&ph.tail?' '+ph.tail:''),text:null}:hLine?{hook:hImg+' '+hLine,sub:ph.tail||'',text:null}:{hook:bigHook,sub:'',text:null};}if(opening&&!metaHook&&!opening.text&&c.id!=='timeline_self_peak'&&(c.editorialContractId||c.id)!=='timeline_self_03'){var firstRow=out.rows.find(function(r){return r.role==='title';}),leadSentences=firstRow&&sentences(firstRow.text);if(leadSentences&&leadSentences.length>=1&&leadSentences[0].length<=90){opening.hook=leadSentences[0];firstRow.text=leadSentences.slice(1).join(' ');if(!firstRow.text)out.rows=out.rows.filter(function(r){return r!==firstRow;});}}if(ln)opening=metaHook?{hook:hImg+(hTease?' '+hTease:''),sub:ln.hook,text:null}:{hook:ln.hook,text:null};if(opening&&!out.creative&&!out.education)h+=section(c,ci,'hook','<h3 class="reading-hook">'+esc(opening.hook)+'</h3>'+(opening.sub?'<p class="reading-hook-sub">'+esc(opening.sub)+'</p>':''));var feat=R.ReadingFeature?R.ReadingFeature.build(c):null;if(feat&&feat.lead)h+=section(c,ci,'feature_lead',feat.lead,'text-reading-feature');if(out.education&&out.rows.length){var eduFirst=out.rows[0],eduSentences=sentences(eduFirst.text);if(eduSentences.length>1){h+=section(c,ci,'hook','<h3 class="reading-hook">'+esc(eduSentences[0])+'</h3>');eduFirst.text=eduSentences.slice(1).join(' ');}}
  if(out.creative)out.rows=out.rows.flatMap(function(row){var parts=row.text.split(/\n{2,}/);return parts.map(function(text,index){return {role:'story',label:index===0?row.label:'',text:text,scenePhase:['daily','conflict','practice'][Math.min(2,Math.floor(index*3/parts.length))]};});});
  var shownMedia=new Set(),feedbackAt=Math.floor(out.rows.length/2),feedbackDone=false;
  out.rows.forEach(function(row,i){if(row.role==='periods'){h+=section(c,ci,'periods',periodsHtml(row.card,c),'text-reading-periods');return;}if(R.ReadingMedia){(c.readingMedia||[]).forEach(function(media,mi){var phase=media.phase||'daily',at=out.creative?row.scenePhase===phase:(c.editorialContractId||c.id)==='timeline_self_03'?i===1:phase==='conflict'?row.role==='risk':phase==='practice'?row.role==='practice':i===1;if(at&&!shownMedia.has(mi)){shownMedia.add(mi);h+=section(c,ci,'panel_'+i+'_'+mi,R.ReadingMedia.html(media),'text-reading-media');}});}if(i===0&&isOriginChapter(c)){var oc=originHtml(c);if(oc)h+=section(c,ci,'chart',oc,'text-reading-chart text-reading-origin');}h+=section(c,ci,'body_'+i,(row.narr?'<h3>'+esc(row.label)+'</h3>':out.creative||out.education?(row.label?'<h3>'+esc(row.label)+'</h3>':''):row.role==='luck-context'?'<h3>지금 내 운 흐름, 쉽게 말하면</h3>':row.role==='insight'?'<h3>사주에서 드러나는 내 모습</h3>':row.role==='strength'?'<h3>이게 내 무기예요</h3>':row.role==='reinforce'?'<h3>이렇게 쓰면 더 잘 풀려요</h3>':'')+((row.role==='narr-luck'||row.role==='luck-context')?unitParasHtml(row.text,row.role):readingParagraphHtml(row.text,row.role,!out.creative&&!out.education))+(!feedbackDone&&i>=feedbackAt?(function(){var f=midFeedback(row.text);if(f)feedbackDone=true;return f;})():''));if(i===0){var chart=(c.editorialContractId||c.id)==='timeline_self_03'?'':overview(c);if(chart)h+=section(c,ci,'chart',chart,'text-reading-chart');var whyHtml=ln?narrativeBasis(ln):basisGroup('why');if(whyHtml)h+=section(c,ci,'why',whyHtml,'text-reading-why');var plusHtml=R.ReadingPlus?R.ReadingPlus.html(c):'';if(plusHtml)h+=section(c,ci,'plus',plusHtml,'text-reading-plus');if(feat&&feat.rest)h+=section(c,ci,'feature',feat.rest,'text-reading-feature');}});
   function basisGroup(role){var items=out.basis.filter(function(b){return (b.reason==='why'?'why':'evidence')===role;});var MINE=/^이 사주: /;   // 서버가 붙인 '이 사주의 실제 값' 한 줄(functions/_reading-personal.js)은 숫자가 있어도 남기고 강조한다(2026-11-07)
   var paras=items.map(function(b){return readingParagraphs(plainBasis(b.text),false).filter(function(t){return MINE.test(t)||(!NOTE_SENTENCE.test(t)&&!CALC_SENTENCE.test(t));}).map(function(t){return MINE.test(t)?'<p class="reading-mine" data-reading-role="'+role+'"><b>내 사주에서는</b> '+esc(t.replace(MINE,''))+'</p>':'<p data-reading-role="'+role+'">'+esc(t)+'</p>';}).join('');}).join('');if(!paras)return '';return '<div class="reading-basis-group"><h3>'+(role==='why'?'왜 이렇게 풀이했는지 짚어 볼게요':'명리로 본 근거')+'</h3>'+paras+'</div>';}
  if((c.editorialContractId||c.id)==='timeline_self_28'&&!out.creative&&!out.education&&!(feat&&feat.rest)){var cph=compatHtml(c);if(cph)h+=section(c,ci,'compat',cph,'text-reading-compat');}
  if(R.ReadingDepth&&!out.creative&&!out.education){var depth=R.ReadingDepth.html(c,esc);if(depth)h+=section(c,ci,'depth',depth,'text-reading-depth');}
  // 안 쓰던 엔진 블록(engine-blocks.js): 전체 인생 흐름 ← 30년 대운 구간, 기질·자동차 비유 ← 격국
  if(R.EngineBlocks&&!out.creative&&!out.education){var eb=R.EngineBlocks.html(c,esc);if(eb)h+=section(c,ci,'engine',eb,'text-reading-engine');}if(R.LuckLayerBlocks&&!out.creative&&!out.education){var lb=R.LuckLayerBlocks.html(c,esc);if(lb)h+=section(c,ci,'luck',lb,'text-reading-luck');}   /* 운 분석 층 블록(2026-11-18) */
  if(R.ReadingInsight&&!out.creative&&!out.education){var insight=R.ReadingInsight.html(c,esc);if(insight)h+=section(c,ci,'insight',insight,'text-reading-insight');}
  // 장 사이 사실 소개 반복(fact-once.js trimIntro): 근거 상자를 붙이기 전에, 이 장이 처음 소개하는 장이 아니면 소개 구절을 걷는다
  if(R.FactOnce&&R.FactOnce.trimIntro&&!out.creative&&!out.education)h=R.FactOnce.trimIntro(c.readingVisualData,h,c.editorialContractId||c.id);
  var body=chapterFacts(c)+basisGroup('evidence');
  var claims=(c.interpretationAnalysis||{}).claims||[],sources=[],conditions=[];
  claims.forEach(function(cl){(cl.elements||[]).forEach(function(e){var value=e.have!==undefined?e.have:e.value;if(value==null||typeof value==='object')return;var line=(e.label||e.key)+': '+value;if(conditions.indexOf(line)<0)conditions.push(line);});(cl.evidence||[]).forEach(function(e){var name=(e.title||e.docId)+(e.pageStart?' · '+e.pageStart+'쪽':'');if(sources.indexOf(name)<0)sources.push(name);});});
  (c.readingEducationSources||[]).forEach(function(s){body+='<p>'+(/^https:\/\//.test(s.url||'')?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a>':esc(s.title))+'<br>'+esc(s.scope||'')+'</p>';});
  if(body)h+=section(c,ci,'basis','<div class="reading-evidence text-reading-basis"><h3 class="reading-basis-title">풀이 디테일</h3>'+body+'</div>');
  // 용어 각주(term-notes.js, 2026-11-23): 용어를 누르면 짧은 뜻이 뜨고, 용어 뒤 괄호 뜻은 말풍선으로 옮긴다
  if(R.TermNotes&&!out.creative)h=R.TermNotes.mark(h,c.readingVisualData);
  return h+section(c,ci,'end','<span aria-hidden="true"></span>','s-end');
 }
 function update(article,c,ci){var opened=!!article.querySelector('.text-reading-basis[open]');article.innerHTML=html(c,ci);if(opened){var d=article.querySelector('.text-reading-basis');if(d)d.open=true;}}
 function stripVisuals(markup){if(!root.document)return String(markup).replace(/<(img|video|picture|figure|svg|canvas|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<img\b[^>]*>/gi,'');var box=root.document.createElement('div');box.innerHTML=markup;box.querySelectorAll('img,video,picture,figure,svg,canvas,iframe').forEach(function(n){n.remove();});box.querySelectorAll('[style]').forEach(function(n){if(/url\(/i.test(n.getAttribute('style')))n.style.backgroundImage='none';});return box.innerHTML;}
 R.ReadingText={topDecades:topDecades,dwTier:dwTier,chapterFacts:chapterFacts,isOriginChapter:isOriginChapter,originHtml:originHtml,timingScore:timingScore,tierOf:tierOf,currentIndex:currentIndex,concise:concise,readingParagraphs:readingParagraphs,organize:organize,html:html,update:update,edit:edit,TECH:TECH,stripVisuals:stripVisuals,overview:overview,groupElement:groupElement,personalOpening:personalOpening};
 if(typeof module!=='undefined'&&module.exports)module.exports=R.ReadingText;
})(typeof window!=='undefined'?window:globalThis);
