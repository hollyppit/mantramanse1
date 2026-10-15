/* Public and administrator preview share this renderer. */
(function(root){
'use strict';
root.Renewal.render=function(cfg,esc,fill){
var r=cfg.renewal, text=function(t){return esc(fill(t||'')).replace(/\n/g,'<br>')};
var media=function(s){var content=s.video?'<video class="rn-media" controls playsinline preload="none" src="'+esc(s.video)+'"></video>':s.image?'<picture>'+(s.imageMobile?'<source media="(max-width:720px)" srcset="'+esc(s.imageMobile)+'">':'')+'<img class="rn-media" src="'+esc(s.image)+'" loading="lazy" alt=""></picture>':'';if(s.image&&!s.video&&s.id&&['hook','research','prepare','decode','preview'].includes(s.id)){var p=s.imagePlacement&&s.imagePlacement.pc,m=s.imagePlacement&&s.imagePlacement.mobile;return '<div class="rn-visual rn-icon-slot"><div class="rn-icon'+(p?' placed':'')+'" data-icon="true" data-scene="'+esc(s.id)+'" style="'+(p?'--cx:'+p.x+'%;--cy:'+p.y+'%;--cw:'+p.width+'%;':'')+(m?'--mx:'+m.x+'%;--my:'+m.y+'%;--mw:'+m.width+'%;':'')+'">'+content+'<span class="rn-character-handle" aria-hidden="true"></span></div></div>';}return content?'<div class="rn-visual">'+content+'</div>':'';};
var reportInfo=[
['타고난 기질이 어떤 상황에서 힘이 되고, 언제 부담으로 바뀌는지 함께 살펴봅니다.',['타고난 기질','살릴 강점','보완할 습관']],
['잘 맞는 일의 방식과 돈을 벌고 쓰는 성향을 나누어, 선택의 기준을 정리합니다.',['수입의 방식','지출의 습관','관리의 기준']],
['10년의 큰 흐름 안에서 올해와 이번 달의 변화를 차례로 살펴봅니다.',['대운 · 10년','세운 · 1년','월운 · 1개월']],
['확장할 때와 속도를 조절할 때를 구분하고, 각 시기에 할 일을 연결합니다.',['준비하기','움직이기','점검하기']],
['애정을 표현하는 방식, 상대에게 기대하는 것, 갈등을 풀어가는 단서를 읽습니다.',['나의 표현','상대의 기대','함께할 대화']],
['풀이를 생활 속 행동으로 옮길 수 있도록 환경과 습관의 실천 방향을 제안합니다.',['현재 점검','한 가지 실천','변화 돌아보기']]
];
function reportCard(p){var match=/^sample-([0-5])$/.exec(p.id||''), info=match&&reportInfo[+match[1]];
var clean=function(v){return String(v||'').replace(/예시 리포트\s*[·ㆍ]?\s*(?:개인 분석 결과가 아닙니다\.?|실제 사용자 분석 데이터가 아닙니다\.?)/g,'').trim()};
var description=info?info[0]:clean(p.description)||clean(p.sample), visual='';
if(info){visual='<div class="rn-report-flow" role="img" aria-label="'+esc(info[1].join(' → '))+'">'+info[1].map(function(label,j){return '<div><span>'+String(j+1).padStart(2,'0')+'</span><b>'+esc(label)+'</b></div>'}).join('')+'</div>';
if(+match[1]===2)visual='<svg class="rn-report-wave" viewBox="0 0 440 100" role="img" aria-label="긴 흐름 안에 짧은 변화가 이어지는 구조"><path d="M5 90H435" stroke="#55504a" fill="none"/><path d="M5 75C75 75 90 20 160 20S250 80 310 58S385 12 435 30" stroke="#d5b97f" stroke-width="3" fill="none"/><path d="M5 80Q30 40 55 65T105 52T155 30T205 48T255 65T305 58T355 45T405 28T435 35" stroke="#79aaa8" stroke-width="2" fill="none" opacity=".7"/></svg>'+visual;}
return '<article class="rn-card">'+media(p)+'<h3>'+text(p.title)+'</h3><p>'+text(description)+'</p>'+visual+'</article>';}
return '<div class="rn">'+r.scenes.filter(function(s){return s.enabled!==false}).map(function(s,i){
var research=(s.researchIds||[]).map(function(id){return root.Onboard.publicCases(cfg.cases).find(function(c){return c.id===id})}).filter(Boolean).map(function(c){return '<article class="rn-card" data-case="'+esc(c.id)+'"><p>'+esc(c.year+' · '+c.source.label)+'</p><h3>'+text(c.title)+'</h3>'+(c.body||[]).map(function(p){return '<p>'+text(p)+'</p>'}).join('')+'<details><summary>연구 상세·출처</summary><p>'+text((c.story||[]).join('\n'))+'</p><p>'+text(c.caveat)+'</p><p>'+text(c.who)+'</p><a href="'+esc(c.source.url||'https://doi.org/'+c.source.doi)+'" target="_blank" rel="noopener noreferrer" data-ob-ev="research_source_click" data-case="'+esc(c.id)+'">논문 원문 · '+esc(c.source.doi||'출처')+'</a></details></article>'}).join('');
var sample=s.id==='preview'?'<p class="rn-label">내 리포트에서 확인할 여섯 가지</p><div class="rn-cards">'+r.previews.filter(function(p){return p.enabled!==false}).map(reportCard).join('')+'</div>':'';
var guide=cfg.quest&&cfg.quest.guides&&cfg.quest.guides[s.guide], image=guide&&root.Quest?root.Quest.guideImage(cfg,s.guide,root.innerWidth<720):guide&&guide.image;
var char=s.character&&guide?'<aside class="rn-guide">'+(image?'<img src="'+esc(image)+'" alt="'+esc(guide.name)+'">':'')+'<b>'+text(guide.name)+'</b><p>'+text(s.dialogue)+'</p></aside>':'';
return '<section class="cn-sec rn-scene" data-sec="'+esc(s.id)+'" data-type="'+esc(s.id)+'" style="'+(s.bg?'background-image:linear-gradient(rgba(5,8,18,'+s.overlay+'),rgba(5,8,18,'+s.overlay+')),url(&quot;'+esc(s.bg)+'&quot;);':'')+'">'+(root.Renewal.characters?root.Renewal.characters(s,esc):'')+'<div class="rn-inner"><p class="rn-label">SCENE '+String(i+1).padStart(2,'0')+'</p><h2>'+text(s.title)+'</h2><p class="rn-sub">'+text(s.sub)+'</p>'+media(s)+(s.id==='prepare'&&!s.image&&!s.video&&root.OnboardArt?'<div class="rn-seasons">'+root.OnboardArt.forCase('season')+'</div>':'')+(s.body||[]).map(function(p){return '<p>'+text(p)+'</p>'}).join('')+research+sample+char+'<p class="rn-emphasis">'+text(s.emphasis)+'</p>'+(s.detail?'<details><summary>자세히 보기</summary><p>'+text(s.detail)+'</p></details>':'')+(s.cta&&s.cta.show&&s.cta.text?'<button class="btn cn-go" data-go="'+esc(s.id)+'">'+text(s.cta.text)+'</button>':'')+'</div></section>';
}).join('')+'</div>';
};
root.Renewal.animate=function(host){
var query=root.matchMedia('(prefers-reduced-motion: reduce)'),animations=new Set(),observer;
if(!root.IntersectionObserver||!root.Element.prototype.animate||query.matches)return function(){};
var nodes=host.querySelectorAll('.rn-inner > h2,.rn-inner > p,.rn-inner > .rn-visual,.rn-inner > .rn-card,.rn-cards > .rn-card,.rn-guide,.rn-seasons');
observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;observer.unobserve(entry.target);if(query.matches)return;var node=entry.target,visual=node.classList.contains('rn-visual');
var animation=node.animate([{opacity:0,transform:visual?'translateY(24px) scale(.975)':'translateY(20px)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:visual?1000:750,easing:'cubic-bezier(.22,1,.36,1)'});animations.add(animation);animation.onfinish=function(){animations.delete(animation)};
if(node.classList.contains('rn-card'))node.querySelectorAll('.rn-chart i').forEach(function(bar){var a=bar.animate([{transform:'scaleY(0)',transformOrigin:'bottom'},{transform:'scaleY(1)',transformOrigin:'bottom'}],{duration:1000,easing:'cubic-bezier(.22,1,.36,1)'});animations.add(a);a.onfinish=function(){animations.delete(a)}});
});},{threshold:0.12,rootMargin:'0px 0px -35px 0px'});
nodes.forEach(function(n){observer.observe(n)});
var stop=function(){observer.disconnect();animations.forEach(function(a){a.cancel()});animations.clear()};
var change=function(){if(query.matches)stop()};query.addEventListener('change',change);
return function(){stop();query.removeEventListener('change',change)};
};
})(window);
