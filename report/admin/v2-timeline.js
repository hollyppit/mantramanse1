/* 타임라인과 동일한 세계 정의·실제 문서 조립기로 구성과 편집을 연결한다. */
(function () {
  'use strict';
  var R = window.ReportV2, C = window.V2Content, X = R.Explore, esc = C.esc;
  var state = { worlds: [], chapters: [], selected: 'w1', dirty: false, loaded: false, generation: 0 };
  (window.AdminDirty = window.AdminDirty || {})['타임라인 구성'] = function () { return state.dirty; };
  function settings(w, id) { w.chapterSettings = w.chapterSettings || {}; return w.chapterSettings[id] || (w.chapterSettings[id] = {}); }
  function list(w) { return state.chapters.filter(function (c) { return X.worldFor(c, state.worlds) === w.id; }).sort(function (a,b) {
    var sa = (w.chapterSettings || {})[a.id] || {}, sb = (w.chapterSettings || {})[b.id] || {};
    return (sa.order == null ? state.chapters.indexOf(a) : sa.order) - (sb.order == null ? state.chapters.indexOf(b) : sb.order);
  }); }
  function build(box) {
    var token = ++state.generation;
    box.querySelector('[data-document]').textContent = '사용자 화면과 같은 목차를 구성하는 중…';
    var date = box.querySelector('[data-date]').value.split('-').map(Number), time = box.querySelector('[data-time]').value.split(':').map(Number), gender = box.querySelector('[data-gender]').value;
    C.engine().then(function (M) {
      var now = Date.now(), ch = M.compute({ year:date[0], month:date[1], day:date[2], hour:time[0], minute:time[1], calendar:'solar', gender:gender, city:'서울' });
      var sd = R.SajuData.build(ch, { now:now }), pack = R.Compose.fromSaved(C.ST.saved, C.ST.media || [], 'full');
      var rep = R.Compose.build(sd, pack.lib, pack.cfg, { name:'' });
      var H = { M:M, ch:ch, sd:sd, now:now, name:'', interest:'', rep:rep, assets:{}, videos:{}, soc:R.StoryDirector.social(M,ch,sd,now), plan:null };
      if (R.Deep) R.Deep.augment(rep,H);
      H.plan = (rep.chapters.find(function(c){return c.plan;}) || {}).plan || null;
      return (R.IKDeep ? R.IKDeep.load(M,ch,sd,6000) : Promise.resolve(null)).then(function(ik) {
        H.ik=ik; var doc=R.LifeDoc.build(H);
        var intro=R.CharIntro && R.CharIntro.chapter(sd,'',{},(doc.acts[0] || {}).id);
        if(intro) {
          var keep={'ci-head':1,'ci-v1':1,'ci-t1':1,'ci-v2':1,'ci-t3':1,'ci-end':1}, main=[], more=[];
          intro.scenes.forEach(function(s){(keep[s.sceneId]?main:more).push(s);});
          doc.chapters.unshift(Object.assign({},intro,{scenes:main.length?main:intro.scenes}));
          if(more.length && main.length) { var at=doc.chapters.findIndex(function(c){return c.id==='life_here';}); doc.chapters.splice(at>=0?at+1:1,0,Object.assign({},intro,{id:'c-char-more',base:'c-char-more',title:'일간·일주 더 깊이 읽기',scenes:more})); }
        }
        if(token!==state.generation)return;
        state.chapters=doc.chapters; draw(box);
      });
    }).catch(function(e){ if(token===state.generation) box.querySelector('[data-document]').textContent='목차를 구성하지 못했습니다: '+e.message; });
  }
  function draw(box) {
    var host=box.querySelector('[data-document]'), w=state.worlds.find(function(w){return w.id===state.selected;}) || state.worlds[0]; state.selected=w.id;
    host.innerHTML='<div class="cols"><div class="card">'+state.worlds.map(function(topic){var items=list(topic);return '<button type="button" class="pjc'+(topic.id===w.id?' on':'')+'" style="width:100%;text-align:left" data-topic="'+esc(topic.id)+'"><b>'+esc(topic.name)+'</b><small>'+esc(topic.line || '')+'</small><span>'+items.length+'개 챕터'+(topic.enabled===false?' · 비공개':'')+'</span></button>';}).join('')+'</div><div class="card"><h3>'+esc(w.name)+'</h3><p>'+esc(w.desc || '')+'</p><div class="row"><a class="btn" target="_blank" rel="noopener" href="/report/v2/?from=hub&amp;world='+esc(w.id)+'">사용자 화면 열기 ↗</a><button type="button" data-prologue>이 주제 프롤로그</button><button type="button" data-world>이름·이미지·주제 순서</button></div><p class="muted">아래는 선택한 테스트 사주로 조립한 실제 목차입니다. 제목·노출·순서를 저장하면 새로 여는 사용자 화면에 적용됩니다. 원본의 문구·모듈은 원본 편집에서, 생성 풀이의 근거는 풀이 지식에서 관리합니다.</p>'+list(w).map(function(c,i){var s=(w.chapterSettings || {})[c.id] || {}, base=c.base || c.id;return '<div class="card" style="margin:8px 0;padding:12px" data-chapter="'+esc(c.id)+'"><div class="row"><label><input type="checkbox" data-visible'+(s.enabled!==false?' checked':'')+'> 노출</label><b>'+(i+1)+'</b><input data-title aria-label="챕터 제목" value="'+esc(s.title || c.title)+'" style="flex:1;min-width:160px"><button type="button" data-move="-1"'+(i===0?' disabled':'')+'>↑</button><button type="button" data-move="1"'+(i===list(w).length-1?' disabled':'')+'>↓</button></div><small class="muted">'+esc(c.id)+' · '+(/^life_|^deep_|^c-char/.test(c.id)?'주제별 조립 챕터':'원본 연결 챕터')+'</small><div class="row" style="margin-top:8px"><button type="button" data-preview>내용 확인</button><button type="button" data-source="'+esc(base)+'">원본 편집</button></div><div data-body hidden></div></div>';}).join('')+'</div></div>';
    box.querySelector('[data-save]').disabled=!state.dirty;
  }
  function open(box) {
    if(state.dirty && state.loaded){ shell(box); draw(box); return; }
    box.innerHTML='<div class="card">타임라인 설정을 불러오는 중…</div>';
    Promise.all([C.load(), C.reloadMedia(), C.api('/api/worlds')]).then(function(a){state.worlds=X.mergeWorlds(a[2].worlds || []);state.loaded=true;state.dirty=false;shell(box);build(box);}).catch(function(e){box.innerHTML='<div class="card">'+esc(e.message)+'</div>';});
  }
  function shell(box) {
    box.classList.add('timeline-admin');
    box.innerHTML='<div class="card"><h3>운명의 타임라인 · 주제와 챕터</h3><p>사용자 타임라인과 같은 주제·분류를 기준으로 관리합니다. 사주 조건에 따라 추가 풀이와 챕터 수는 달라질 수 있습니다.</p><div class="row"><label>테스트 생일 <input type="date" data-date value="1992-06-23"></label><label>시각 <input type="time" data-time value="01:30"></label><label>성별 <select data-gender><option value="M">남성</option><option value="F">여성</option></select></label><button type="button" data-rebuild>목차 다시 구성</button><button type="button" class="pri" data-save disabled>주제별 챕터 저장</button><button type="button" data-legacy>기존 상품 원본 관리</button></div><p data-status class="muted"></p></div><div data-document></div>';
    box.onchange=function(e){var row=e.target.closest('[data-chapter]');if(!row)return;var w=state.worlds.find(function(w){return w.id===state.selected;}),s=settings(w,row.dataset.chapter);if(e.target.matches('[data-title]'))s.title=e.target.value.trim();if(e.target.matches('[data-visible]'))s.enabled=e.target.checked;state.dirty=true;box.querySelector('[data-save]').disabled=false;};
    box.onclick=function(e){var b=e.target.closest('button');if(!b)return;
      if(b.hasAttribute('data-topic')){state.selected=b.dataset.topic;draw(box);return;}
      if(b.hasAttribute('data-rebuild')){build(box);return;}
      if(b.hasAttribute('data-world')){window.AdminShowTab('v2world');return;}
      if(b.hasAttribute('data-legacy')){window.AdminShowTab('v2proj','legacy');return;}
      if(b.hasAttribute('data-prologue')){window.AdminShowTab('v2chap',{source:'intro:prologue',world:state.selected});return;}
      if(b.hasAttribute('data-save')){
        b.disabled=true;C.api('/api/worlds',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({worlds:state.worlds})}).then(function(){state.dirty=false;box.querySelector('[data-status]').textContent='저장했습니다. 타임라인과 사용자 본문에 같은 설정을 적용합니다.';}).catch(function(err){b.disabled=false;C.toast(err.message,true);});return;
      }
      var row=b.closest('[data-chapter]');if(!row)return;
      var w=state.worlds.find(function(w){return w.id===state.selected;}),items=list(w),at=items.findIndex(function(c){return c.id===row.dataset.chapter;}),c=items[at];
      if(b.hasAttribute('data-move')){var to=at+(+b.dataset.move);if(to<0 || to>=items.length)return;var old=items[at];items[at]=items[to];items[to]=old;items.forEach(function(c,i){settings(w,c.id).order=i;});state.dirty=true;draw(box);return;}
      if(b.hasAttribute('data-source')){var source=R.Chapters.libraryOf(C.ST.saved).find(function(x){return x.project==='full' && (x.id===c.id || x.base===b.dataset.source || x.id===b.dataset.source);});if(source)window.AdminShowTab('v2chap',{source:source.id});else window.AdminShowTab('ikknow');return;}
      if(b.hasAttribute('data-preview')){var body=row.querySelector('[data-body]');body.hidden=!body.hidden;if(!body.hidden){var scratch=document.createElement('div');scratch.innerHTML=(c.scenes || []).map(function(s){return s.html || s.body || s.narration || s.text || '';}).join('\n');body.textContent=scratch.textContent || c.meaning || '도표·영상 중심 챕터입니다. 사용자 화면에서 확인하세요.';body.style.cssText='white-space:pre-wrap;line-height:1.8;padding:16px 0;max-height:400px;overflow:auto';} }
    };
  }
  window.V2Timeline={open:open};
  var style=document.createElement('style');style.textContent='.timeline-admin input:not([type=checkbox]),.timeline-admin select{background:#080b14;color:#eee5d5;border:1px solid #353b50;border-radius:6px;padding:8px;color-scheme:dark}.timeline-admin [data-body]{word-break:keep-all;overflow-wrap:anywhere}.timeline-admin [data-chapter] input[type=checkbox]{width:auto}.timeline-admin a.btn{color:#d5b97f;text-decoration:none}';document.head.appendChild(style);
})();
