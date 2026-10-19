/* Text-only reading view. Evidence and accepted wording remain available; calculations are never rewritten. */
(function(root){'use strict';var R=root.ReportV2=root.ReportV2||{};
 var LABELS={title:'먼저 들려드리고 싶은 이야기',reality:'생활 속에서는 이렇게 나타나요',strength:'이런 점이 참 든든해요',risk:'이 부분은 조금 조심해 주세요',reinforce:'내 장점을 더 잘 살리려면',practice:'오늘은 이렇게 해보세요'};
 var TECH=/오행|신살|원국|육친|십간|양간|음간|한난조습|사고수|관성|재성|인성|식상|비겁|정관|편관|정재|편재|식신|통근|무근|신강|신약|용신|기신|희신|격국|조후|억부|합충|지장간|십성|월령|일간|일주(?!일)|월주|시주|배우자궁|자녀궁|[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]|상관(?=[은이가을의\s·])/;
 var METHOD=/전통 해석.{0,20}(?:보장|학파)|학파.{0,35}(?:차이|다르|달라)|(?:가정|가능한|비교).{0,12}(?:사례|예시).{0,12}(?:아니|뜻하지|전제하지)|실제 (?:경험|생활|성향)을 (?:전제|확인).{0,18}(?:않|아니)|이는.{0,22}(?:가정|예시).{0,25}(?:실제|뜻하지|아니)/;
 var edit=function(t){t=root.MantraPlainCopy?root.MantraPlainCopy.text(t):t;return (root.MantraPolite?root.MantraPolite.text(String(t||'')):String(t||'')).replace(/\bvs\b/g,'그리고').replace(/자기 결정을 함께 확보하는 태도/g,'스스로 선택할 여지를 남기는 태도').replace(/직설적인 표현이 있다는 이유로 호감을 얻는 면까지 없다고 판단하지 않습니다\./g,'분명한 표현과 배려는 함께 드러날 수 있습니다.').replace(/판단의 범위는 직무 후보까지입니다\./g,'어떤 일을 탐색할지 정하는 참고로 읽어 주세요.').replace(/실리 계산과 마무리/g,'수입·비용 확인과 정산').replace(/실리 계산/g,'수입과 비용 계산').replace(/조직형 판단/g,'조직에서 일하는 방식에 대한 판단').trim();};
 var esc=function(t){return String(t==null?'':t).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});};
 var sentences=function(t){return String(t||'').split(/(?<=[.!?。])\s+|\n{2,}/).map(function(x){return x.trim();}).filter(Boolean);};
 var key=function(t){return t.replace(/[\s\p{P}\p{S}]/gu,'');};
 function organize(chapter){
  var c=chapter||{},basis=[],seen=new Set(),rows=[],moved=[],duplicates=[],creative=c.editorialTopicId==='creative',education=c.readingProvider==='local-reviewed-education';
  function basisAdd(text,reason){if(!text)return;var k=key(text);if(!basis.some(function(x){return key(x.text)===k;}))basis.push({text:text,reason:reason||'basis'});}
  if(c.readingDeferred)return {pending:true,notice:String(c.readingNotice||'이 장의 풀이를 준비하고 있습니다.').replace(/ \(오류: [^)]*\)$/,''),rows:[],basis:[],moved:[],duplicates:[]};
  if(creative){
    var core=c.readingCore||{};rows.push({role:'story',label:core.title||c.title||'이야기',text:core.reality||c.readingFullText||''});
    return {creative:true,rows:rows,basis:[],notice:c.readingNotice||'사주를 모티브로 만든 창작 이야기입니다. 실제 전생이나 개인의 과거를 확인한 내용은 아닙니다.',moved:[],duplicates:[]};
  }
  var source=education?(c.readingParagraphs||[]).map(function(p){return {role:'education',text:p.text};}):Object.keys(LABELS).map(function(role){var p=(c.readingParagraphs||[]).find(function(p){return p.role===role;});return {role:role,text:p?p.text:(c.readingCore||{})[role]||''};});
  source=source.filter(function(p){return (c.readingPendingRoles||[]).indexOf(p.role)<0;});
  source.forEach(function(p){var paragraphs=[];edit(p.text).split(/\n{2,}/).forEach(function(paragraph){var visible=[];sentences(paragraph).forEach(function(text){var k=key(text);if(seen.has(k)){duplicates.push({role:p.role,text:text});return;}seen.add(k);
    if(TECH.test(text)||root.MantraPlainCopy&&root.MantraPlainCopy.technical(text)||METHOD.test(text)||text==='감당할 여력과 전체 조건을 함께 봐야 합니다.'){basisAdd(text,TECH.test(text)?'terminology':'scope');moved.push({role:p.role,text:text});}else visible.push(text);
  });if(visible.length)paragraphs.push(visible.join(' '));});if(paragraphs.length)rows.push({role:p.role,label:education?'':LABELS[p.role],text:paragraphs.join('\n\n')});});
  (c.interpretationAnalysis&&c.interpretationAnalysis.claims||[]).forEach(function(cl){if(cl.judgment)basisAdd(cl.judgment,'original');});
  ['why','evidence'].forEach(function(role){if((c.readingPendingRoles||[]).indexOf(role)>=0)return;var p=(c.readingParagraphs||[]).find(function(p){return p.role===role;});var text=p?p.text:(c.readingCore||{})[role];if(text)basisAdd(edit(text),role);});
  if(!rows.length && basis.length)rows.push({role:'scope',label:'이번 풀이의 범위',text:'현재 연결된 자료로 설명할 수 있는 범위와 판단하기 어려운 부분을 풀이 근거에서 확인할 수 있습니다.'});
  return {rows:rows,basis:basis,creative:false,education:education,notice:education?'일반적인 건강·안전 안내입니다. 사주로 질병이나 사고를 예측하지 않습니다.':c.readingNotice||'생활 속 예시는 가정한 상황입니다. 실제 경험과 다른 부분은 적용하지 않아도 됩니다.',moved:moved,duplicates:duplicates};
 }
 function section(c,ci,suffix,body,extra){return '<section class="scene rd-sec rd-prose text-reading-section '+(extra||'')+'" data-bg="-1" data-ch="'+ci+'" data-sc="'+esc(c.id+'_text_'+suffix)+'">'+body+'</section>';}
 function html(c,ci){var out=organize(c),h=section(c,ci,'head','<h2>'+esc(c.title)+'</h2>','rd-head rd-chead text-reading-head');
  if(out.pending)return h+section(c,ci,'pending','<p role="status" data-reading-notice>'+esc(out.notice)+'</p>'+(c.readingWarning?'<button type="button" class="chipbtn" data-reading-retry>이 장 다시 불러오기</button>':'')+(c.readingFailure?'<details class="reading-error-detail"><summary>오류 상세 정보</summary><p>'+esc(c.readingFailure.code)+(c.readingFailure.requestId?' · '+esc(c.readingFailure.requestId):'')+'</p></details>':''),'reading-pending');
  if(out.notice)h+=section(c,ci,'notice','<p class="text-reading-note">'+esc(out.notice)+'</p>');
  out.rows.forEach(function(row,i){if((i===0||i===3)&&R.ReadingMedia){var media=(c.readingMedia||[])[i===0?0:1];if(media)h+=section(c,ci,'panel_'+i,R.ReadingMedia.html(media),'text-reading-media');}h+=section(c,ci,'body_'+i,(out.creative||out.education?(row.label?'<h3>'+esc(row.label)+'</h3>':''):row.role==='strength'?'<h3>이 특징이 힘이 되는 순간</h3>':row.role==='reinforce'?'<h3>생활에서는 이렇게 활용해 보세요</h3>':'')+row.text.split(/\n{2,}/).map(function(t){return '<p class="lead" data-reading-role="'+row.role+'">'+esc(t)+'</p>';}).join(''));});
  var body=out.basis.map(function(b){return '<p data-reading-role="'+(b.reason==='why'?'why':'evidence')+'">'+esc(b.text)+'</p>';}).join('');
  var claims=(c.interpretationAnalysis||{}).claims||[],sources=[],conditions=[];
  claims.forEach(function(cl){(cl.elements||[]).forEach(function(e){var value=e.have!==undefined?e.have:e.value;if(value==null||typeof value==='object')return;var line=(e.label||e.key)+': '+value;if(conditions.indexOf(line)<0)conditions.push(line);});(cl.evidence||[]).forEach(function(e){var name=(e.title||e.docId)+(e.pageStart?' · '+e.pageStart+'쪽':'');if(sources.indexOf(name)<0)sources.push(name);});});
  if(conditions.length)body+='<h3>연결된 계산값</h3><ul>'+conditions.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>';
  if(sources.length)body+='<h3>참고한 자료</h3><ul>'+sources.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>';
  (c.readingEducationSources||[]).forEach(function(s){body+='<p>'+(/^https:\/\//.test(s.url||'')?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a>':esc(s.title))+'<br>'+esc(s.scope||'')+'</p>';});
  if(body)h+=section(c,ci,'basis','<details class="reading-evidence text-reading-basis"><summary>풀이 근거 · 명리 설명과 출처</summary>'+body+'</details>');
  return h+section(c,ci,'end','<span aria-hidden="true">·</span>','s-end');
 }
 function update(article,c,ci){var opened=!!article.querySelector('.text-reading-basis[open]');article.innerHTML=html(c,ci);if(opened){var d=article.querySelector('.text-reading-basis');if(d)d.open=true;}}
 function stripVisuals(markup){if(!root.document)return String(markup).replace(/<(img|video|picture|figure|svg|canvas|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<img\b[^>]*>/gi,'');var box=root.document.createElement('div');box.innerHTML=markup;box.querySelectorAll('img,video,picture,figure,svg,canvas,iframe').forEach(function(n){n.remove();});box.querySelectorAll('[style]').forEach(function(n){if(/url\(/i.test(n.getAttribute('style')))n.style.backgroundImage='none';});return box.innerHTML;}
 R.ReadingText={organize:organize,html:html,update:update,edit:edit,TECH:TECH,stripVisuals:stripVisuals};
 if(typeof module!=='undefined'&&module.exports)module.exports=R.ReadingText;
})(typeof window!=='undefined'?window:globalThis);
