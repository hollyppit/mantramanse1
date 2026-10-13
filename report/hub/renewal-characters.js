/* Character layers share the existing scene draft, publish and history. */
(function(root){
'use strict';
var R=root.Renewal;
R.characters=function(scene,esc){return '<div class="rn-character-stage">'+(scene.characters||[]).filter(function(c){return c.enabled!==false&&c.image}).map(function(c){var p=c.pc||{x:50,y:50,width:22},m=c.mobile||p;return '<div class="rn-character" data-character="'+esc(c.id)+'" data-scene="'+esc(scene.id)+'" style="--cx:'+p.x+'%;--cy:'+p.y+'%;--cw:'+p.width+'%;--mx:'+m.x+'%;--my:'+m.y+'%;--mw:'+m.width+'%;--flip:'+(c.flip?-1:1)+'"><img src="'+esc(c.image)+'" alt="'+esc(c.name||'캐릭터')+'" draggable="false"><span class="rn-character-handle" aria-hidden="true"></span></div>'}).join('')+'</div>';};
R.editCharacters=function(host){
var handlers=[];
host.querySelectorAll('.rn-character,.rn-icon').forEach(function(el){
el.classList.add('editable');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','캐릭터 이동. 모서리를 끌어 크기 조절. 방향키로 이동, + 또는 -로 크기 조절');
var stage=el.parentElement;
function values(){if(el.dataset.icon&&!el.classList.contains('placed')){var r=el.getBoundingClientRect(),sr=stage.getBoundingClientRect(),v={mobile:root.innerWidth<=720,x:(r.left+r.width/2-sr.left)/sr.width*100,y:(r.top+r.height/2-sr.top)/sr.height*100,width:r.width/sr.width*100};return v;}var mobile=root.innerWidth<=720,s=root.getComputedStyle(el);return {mobile:mobile,x:parseFloat(s.getPropertyValue(mobile?'--mx':'--cx')),y:parseFloat(s.getPropertyValue(mobile?'--my':'--cy')),width:parseFloat(s.getPropertyValue(mobile?'--mw':'--cw'))};}
function apply(v){el.classList.add('placed');var prefix=v.mobile?'--m':'--c';el.style.setProperty(prefix+'x',v.x+'%');el.style.setProperty(prefix+'y',v.y+'%');el.style.setProperty(prefix+'w',v.width+'%');}
function send(v){root.parent.postMessage({t:'mt-character-place',scene:el.dataset.scene,id:el.dataset.character,icon:!!el.dataset.icon,mobile:v.mobile,x:v.x,y:v.y,width:v.width},location.origin);}
var drag=null;
function down(e){if(e.button!==0)return;e.preventDefault();e.stopPropagation();el.focus({preventScroll:true});var rect=stage.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,rect:rect,start:values(),resize:e.target.classList.contains('rn-character-handle')};el.setPointerCapture(e.pointerId);}
function move(e){if(!drag||e.pointerId!==drag.id)return;var v=Object.assign({},drag.start),dx=(e.clientX-drag.x)/drag.rect.width*100,dy=(e.clientY-drag.y)/drag.rect.height*100;if(drag.resize)v.width=Math.max(3,Math.min(80,v.width+dx*2));else{v.x=Math.max(0,Math.min(100,v.x+dx));v.y=Math.max(0,Math.min(100,v.y+dy));}apply(v);}
function up(e){if(!drag||e.pointerId!==drag.id)return;send(values());drag=null;}
function key(e){var v=values(),step=e.shiftKey?5:1;if(e.key==='ArrowLeft')v.x-=step;else if(e.key==='ArrowRight')v.x+=step;else if(e.key==='ArrowUp')v.y-=step;else if(e.key==='ArrowDown')v.y+=step;else if(e.key==='+')v.width+=step;else if(e.key==='-')v.width-=step;else return;e.preventDefault();v.x=Math.max(0,Math.min(100,v.x));v.y=Math.max(0,Math.min(100,v.y));v.width=Math.max(3,Math.min(80,v.width));apply(v);send(v);}
[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['keydown',key]].forEach(function(pair){el.addEventListener(pair[0],pair[1]);handlers.push(function(){el.removeEventListener(pair[0],pair[1])});});
function center(e){if(e.origin!==location.origin||e.source!==root.parent||!e.data||e.data.t!=='st-center'||document.activeElement!==el)return;var v=values();v.x=50;apply(v);send(v);}
root.addEventListener('message',center);handlers.push(function(){root.removeEventListener('message',center)});
});
return function(){handlers.forEach(function(fn){fn()})};
};
})(window);
