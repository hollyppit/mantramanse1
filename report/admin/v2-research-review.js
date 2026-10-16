/* Authenticated research snapshot viewer. No save, publish or provider actions. */
(function(){
 'use strict';
 var box, data, query='', filter='all', selected='', generation=0;
 var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
 var positions={year:'연지',month:'월지',day:'일지',hour:'시지'};
 function list(a){return '<ul>'+a.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';}
 function link(url,label){return /^https:\/\//.test(url||'')?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>':esc(label);}
 function detail(c){
  var h='<h3>'+esc(c.id)+' · 최종 판정 유보</h3><p>'+esc(c.ruleId)+' · '+(c.raw.gender==='M'?'남성':'여성')+' · '+(c.raw.hourKnown?'시주 확인':'시주 미상')+'</p><p>'+esc(Object.keys(c.raw.pillars).map(function(k){return c.raw.pillars[k]||'시 미상';}).join(' / '))+'</p>';
  if(c.raw.targetYear)h+='<p>대상 '+esc(c.raw.targetYear)+'년 · 세운 '+esc(c.raw.annualPillar)+' · 대운 '+esc(c.raw.daewoonPillar)+'</p>';
  h+='<h4>확인된 관찰과 유보 사유</h4><p>'+esc(c.observation)+'</p><p>'+esc(c.annualReview||'상대 세력·예외의 실효 작용 기준이 부족해 최종 판정을 유보합니다.')+'</p><h4>지장간·통근 참조</h4><p class="muted">장간 구성원은 연해자평 장간가 기준입니다. 나열 순서는 강도·일수 순위가 아닙니다. 직접 예시가 없다는 사실도 무근 판정이 아닙니다.</p><div style="overflow-x:auto"><table style="min-width:440px"><thead><tr><th>위치</th><th>지지·장간</th><th>자평진전 직접 예시</th></tr></thead><tbody>'+c.rootPositions.map(function(p){return '<tr><td>'+positions[p.position]+'</td><td>'+esc(p.branch||'미상')+' · '+esc(p.hiddenStems?p.hiddenStems.join('·'):'미확정')+'</td><td>'+esc(p.rootReference||'직접 예시 대응 없음 · 실효 판단 유보')+'</td></tr>';}).join('')+'</tbody></table></div>';
  if(c.effectReview)h+='<h4>합충형·조후와 근의 실효 작용</h4><p>'+esc(c.effectReview.climate)+'</p><p>'+esc(c.effectReview.effective)+'</p><p><b>추가 필요:</b> '+esc(c.effectReview.needs)+'</p>';
  if(c.overlap)h+='<h4>합회·진술충 경합 추가 검수</h4>'+list(c.overlap.confirmedFacts)+'<p>'+esc(c.overlap.analysis)+'</p><p><b>추가 필요:</b> '+esc(c.overlap.needs)+'</p>';
  if(c.comparators.length)h+='<h4>유사 문헌 명조·반례</h4><p class="muted">완전 대응 사례가 아닙니다. 문헌의 다른 명조를 이 사례의 정답으로 쓰지 않습니다.</p>'+c.comparators.map(function(x){return '<details><summary>'+esc(x.id+' · '+x.pillars.join(' / '))+'</summary><p>'+link(x.url,x.layer)+' · '+esc(x.locator)+'</p><p>저자의 설명: '+esc(x.authorClaim)+'</p><p>유사 조건</p>'+list(x.match)+'<p>다른 조건</p>'+list(x.differences)+'<p>확정할 수 없는 것: '+esc(x.notEstablished)+'</p></details>';}).join('');
  return h;
 }
 function drawList(){
  var rows=data.cases.filter(function(c){return (filter==='all'||filter==='root'&&c.effectReview||filter==='focus'&&c.overlap||filter==='hour'&&!c.raw.hourKnown)&&JSON.stringify([c.id,c.ruleId,c.raw.pillars,c.observation]).toLowerCase().includes(query.toLowerCase());});
  box.querySelector('#rrCount').textContent=rows.length+'건 / 전체 '+data.cases.length+'건';
  box.querySelector('#rrList').innerHTML=rows.map(function(c){return '<button type="button" data-case="'+esc(c.id)+'" aria-pressed="'+(c.id===selected)+'">'+esc(c.id)+' · '+(c.raw.targetYear?'연도':'원국')+' · 유보</button>';}).join('');
  if(!rows.some(function(c){return c.id===selected;}))selected=rows[0]?rows[0].id:'';
  box.querySelectorAll('[data-case]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.case===selected));});
  box.querySelector('#rrDetail').innerHTML=selected?detail(data.cases.find(function(c){return c.id===selected;})):'일치하는 사례가 없습니다.';
 }
 function draw(){
  box.innerHTML='<div class="card"><h2>문헌·명조 검수 기록</h2><p><b>읽기 전용 · 32건 최종 유보 · 게시 불가</b></p><p>'+esc(data.scope)+'</p><p class="muted">검수일 '+esc(data.asOf)+' · 자료 '+esc(data.sourceSnapshot)+' · '+esc(data.version)+'</p>'+list(data.limitations)+'</div><div class="card row"><label>사례 검색<input id="rrSearch" type="text" placeholder="ID·규칙·명조·검수 내용"></label><label>검토 범위<select id="rrFilter"><option value="all">전체 32건</option><option value="root">통근 직접 참조 6건</option><option value="focus">G14·G15 경합 검수</option><option value="hour">시주 미상</option></select></label><span id="rrCount" role="status"></span></div><div class="card"><div id="rrList" class="row" aria-label="검수 사례 목록"></div></div><section id="rrDetail" class="card" aria-label="사례별 검수 상세" style="overflow-wrap:anywhere"></section><details class="card"><summary>문헌 출처와 관법 구분</summary>'+data.sources.map(function(s){return '<p>'+link(s.url,s.title)+'<br>'+esc(s.layer)+' · '+esc(s.locator)+'</p>';}).join('')+'</details>';
  box.querySelector('#rrSearch').value=query;box.querySelector('#rrFilter').value=filter;
  box.querySelector('#rrSearch').oninput=function(e){query=e.target.value;drawList();};box.querySelector('#rrFilter').onchange=function(e){filter=e.target.value;drawList();};
  box.querySelector('#rrList').onclick=function(e){var b=e.target.closest('[data-case]');if(b){selected=b.dataset.case;drawList();}};drawList();
 }
 window.V2ResearchReview={open:async function(password){var current=++generation;box=document.getElementById('t-research');box.textContent='문헌 검수 기록을 불러오는 중…';try{var r=await fetch('/api/research-review',{headers:{authorization:'Bearer '+password},cache:'no-store'});if(!r.ok)throw Error(r.status===401?'관리자 로그인이 필요합니다.':'검수 기록을 불러오지 못했습니다.');var result=await r.json();if(current!==generation)return;data=result;draw();}catch(e){if(current===generation)box.textContent=e.message;}}};
})();
