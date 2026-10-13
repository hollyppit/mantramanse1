/* Public and administrator preview share this renderer. */
(function(root){
'use strict';
root.Renewal.render=function(cfg,esc,fill){
var r=cfg.renewal, text=function(t){return esc(fill(t||'')).replace(/\n/g,'<br>')};
var media=function(s){var content=s.video?'<video class="rn-media" controls playsinline preload="none" src="'+esc(s.video)+'"></video>':s.image?'<picture>'+(s.imageMobile?'<source media="(max-width:720px)" srcset="'+esc(s.imageMobile)+'">':'')+'<img class="rn-media" src="'+esc(s.image)+'" loading="lazy" alt=""></picture>':'';return content?'<div class="rn-visual">'+content+'</div>':'';};
return '<div class="rn">'+r.scenes.filter(function(s){return s.enabled!==false}).map(function(s,i){
var research=(s.researchIds||[]).map(function(id){return root.Onboard.publicCases(cfg.cases).find(function(c){return c.id===id})}).filter(Boolean).map(function(c){return '<article class="rn-card" data-case="'+esc(c.id)+'"><p>'+esc(c.year+' · '+c.source.label)+'</p><h3>'+text(c.title)+'</h3>'+(c.body||[]).map(function(p){return '<p>'+text(p)+'</p>'}).join('')+'<details><summary>연구 상세·출처</summary><p>'+text((c.story||[]).join('\n'))+'</p><p>'+text(c.caveat)+'</p><p>'+text(c.who)+'</p><a href="'+esc(c.source.url||'https://doi.org/'+c.source.doi)+'" target="_blank" rel="noopener noreferrer" data-ob-ev="research_source_click" data-case="'+esc(c.id)+'">논문 원문 · '+esc(c.source.doi||'출처')+'</a></details></article>'}).join('');
var sample=s.id==='preview'?'<p class="rn-label">예시 리포트 · 실제 사용자 분석 데이터가 아닙니다.</p><div class="rn-cards">'+r.previews.filter(function(p){return p.enabled!==false}).map(function(p){return '<article class="rn-card">'+media(p)+'<h3>'+text(p.title)+'</h3><p>'+text(p.sample)+'</p><p>'+text(p.description)+'</p>'+(p.graph&&p.graph.length?'<div class="rn-chart" role="img" aria-label="예시 흐름 그래프. 성공 또는 사고 확률이 아닙니다.">'+p.graph.map(function(n,j){return '<div><i style="height:'+Math.max(0,Math.min(100,+n||0))+'%"></i><small>'+(j+1)+'</small></div>'}).join('')+'</div><small>해석 흐름 예시 · 확률 수치가 아닙니다.</small>':'')+'</article>'}).join('')+'</div>':'';
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
