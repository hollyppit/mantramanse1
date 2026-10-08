/* 관리자 "패널 이미지" 탭 맨 아래의 "풀이 화면 이미지" — 자동차 비유 · 직업 후보 · 배우자 인상 · 전생 (71장). 화풍·감성 등 비주얼 디렉션은 위의 패널 이미지 설정을 같이 쓴다.
   서버: /api/asset-art (확정한 주소는 공개 /api/assets 로 뷰어에 전달된다). v2-panel.js 가 draw() 끝에서 V2Assets.open(컨테이너) 를 부른다. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, BOX = null, G = { d: null, busy: false, stop: false, provider: '', group: '' }, LOG = [];
  var $ = function (s) { return BOX.querySelector(s); };
  var css = document.createElement('style');
  css.textContent = '.as-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px;margin:6px 0 14px}.as-c{aspect-ratio:3/4;border:1px dashed var(--line);border-radius:8px;background:#000 center/cover;display:flex;align-items:flex-end;justify-content:center;font-size:.64rem;color:var(--ink3);cursor:pointer;overflow:hidden}' +
    '.as-c.has{border:1px solid var(--line)}.as-c.run{outline:2px solid var(--gold)}.as-c b{background:rgba(0,0,0,.66);width:100%;text-align:center;padding:2px 2px;font-weight:400;line-height:1.25}.as-log{font-size:.8rem;color:var(--ink2);max-height:150px;overflow:auto;margin-top:8px;line-height:1.6}';
  document.head.appendChild(css);
  function log(t) { LOG.unshift(t); LOG = LOG.slice(0, 40); var b = BOX && $('.as-log'); if (b) b.innerHTML = LOG.map(esc).join('<br>'); }
  var post = function (b) { return C.api('/api/asset-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); };
  function open(box) { BOX = box; BOX.innerHTML = '<div class="card" style="margin-top:12px"><p class="muted">풀이 화면 이미지 목록을 불러오는 중…</p></div>'; return Promise.all([C.api('/api/asset-art'), C.api('/api/panel-video').catch(function () { return { enabled: false, tasks: [] }; })]).then(function (a) { G.d = a[0]; G.vid = a[1]; draw(); }).catch(function (e) { BOX.innerHTML = '<div class="card" style="margin-top:12px"><p class="err">' + esc(e.message) + '</p></div>'; }); }
  function reload() { return Promise.all([C.api('/api/asset-art'), C.api('/api/panel-video').catch(function () { return { enabled: false, tasks: [] }; })]).then(function (a) { G.d = a[0]; G.vid = a[1]; }); }
  var inGroup = function (s) { return !G.group || s.group === G.group; };

  function draw() {
    var d = G.d, pv = d.providers, have = d.slots.filter(function (s) { return s.url; }).length;
    var grid = Object.keys(d.groups).filter(function (g) { return !G.group || g === G.group; }).map(function (g) {
      return '<div class="cap2" style="margin-top:12px">' + esc(d.groups[g]) + ' · ' + d.slots.filter(function (s) { return s.group === g && s.url; }).length + ' / ' + d.slots.filter(function (s) { return s.group === g; }).length + '</div><div class="as-grid">' +
        d.slots.filter(function (s) { return s.group === g; }).map(function (s) { return '<div class="as-c' + (s.url ? ' has' : '') + '" data-id="' + esc(s.id) + '" title="' + esc(s.title) + ' — 눌러서 세부 수정"' + (s.url ? ' style="background-image:url(\'' + esc(s.url) + '\')"' : '') + '><b>' + (s.video ? '▶ ' : '') + esc(s.title.replace(/ ·.*$/, '').slice(0, 14) + (s.group === 'spouse' || s.group === 'past' ? ' ' + s.title.split(' · ')[1].slice(0, 8) : '')) + '</b></div>'; }).join('') + '</div>'; }).join('');
    BOX.innerHTML = '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">풀이 화면 이미지 · ' + have + ' / ' + d.slots.length + '장</b><p class="muted" style="margin:6px 0 10px">풀이 본문에 들어가는 이미지입니다: <b>자동차 비유(10)</b> · <b>직업 후보(12)</b> · <b>배우자 인상(24)</b> · <b>전생(25)</b>. 화풍·감성·세계관은 위의 "비주얼 디렉션"을 같이 씁니다. 이미지가 없으면 풀이 화면에는 한자 자리표시가 나옵니다. 칸을 누르면 세부 수정(프롬프트·추가 요청·현재 이미지 바탕 수정)을 할 수 있습니다.</p>' +
      '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><label class="muted">구분 <select id="asGroup"><option value="">전체</option>' + Object.keys(d.groups).map(function (g) { return '<option value="' + g + '"' + (G.group === g ? ' selected' : '') + '>' + esc(d.groups[g]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="muted">모델 <select id="asProv"><option value="">GPT 우선 · 실패 시 Gemini 로 자동 전환</option><option value="openai"' + (pv.openai ? '' : ' disabled') + (G.provider === 'openai' ? ' selected' : '') + '>OpenAI ' + esc(d.models.openai) + '</option><option value="gemini"' + (pv.gemini ? '' : ' disabled') + (G.provider === 'gemini' ? ' selected' : '') + '>Gemini ' + esc(d.models.gemini) + '</option></select></label>' +
      '<button class="btn" id="asMissing"' + (G.busy ? ' disabled' : '') + '>빈 칸 모두 만들기</button><button class="btn" id="asAll"' + (G.busy ? ' disabled' : '') + '>모두 다시 만들기</button><button id="asStop"' + (G.busy ? '' : ' disabled') + '>중지</button><button class="btn" id="asBatch"' + (G.busy ? ' disabled' : '') + '>영상 일괄 만들기</button></div>' +
      (!d.r2 ? '<p class="err">R2(CLIPS_R2)가 연결되지 않아 저장할 수 없습니다.</p>' : '') + '<label class="muted" style="display:block;margin-top:10px">패션 이미지 · 이번 시즌 트렌드 메모 <small>(선택 · 예: 퍼플 포인트, 와이드 팬츠, 경량 쉘 재킷 — 패션·그루밍 이미지를 만들 때마다 "지금 시점"의 연도·계절과 함께 프롬프트에 들어갑니다)</small><textarea id="asTrend" rows="2" maxlength="400" style="width:100%" placeholder="비워 두면 생성 시점의 연도·계절만 반영합니다">' + esc(d.trend || '') + '</textarea></label><div class="row" style="gap:8px;align-items:center;margin-top:4px"><button type="button" id="asTrendSave">트렌드 메모 저장</button><span class="muted" id="asTrendMsg"></span></div>' + grid + '<div class="as-log"></div></div>';
    $('#asTrendSave').onclick = function () { var b = $('#asTrendSave'); b.disabled = true; post({ trend: $('#asTrend').value }).then(function (r) { G.d.trend = r.trend; $('#asTrendMsg').textContent = '저장했습니다. 이후 만드는 패션 이미지부터 반영됩니다.'; }).catch(function (e) { toast(e.message, true); }).then(function () { b.disabled = false; }); };
    $('#asGroup').onchange = function () { G.group = this.value; draw(); }; $('#asProv').onchange = function () { G.provider = this.value; };
    $('#asMissing').onclick = function () { runList(G.d.slots.filter(function (s) { return inGroup(s) && !s.url; }), false); };
    $('#asAll').onclick = function () { var list = G.d.slots.filter(inGroup), custom = list.filter(function (s) { return s.custom; }).length; if (!confirm(list.length + '장을 현재 비주얼 디렉션으로 모두 다시 만듭니다.\n이미지 비용이 장당 발생하고 오래 걸리며, 성공한 칸의 기존 이미지는 삭제됩니다. 계속할까요?')) return;
      runList(list, custom ? confirm('칸별로 직접 고쳐 저장한 프롬프트가 ' + custom + '개 있습니다.\n[확인] 버리고 현재 디렉션으로 만듭니다.\n[취소] 고친 프롬프트를 그대로 사용합니다.') : false, true); };
    $('#asBatch').onclick = function () {
      if (G.busy) return; var cells = G.d.slots.filter(function (s) { return inGroup(s) && s.url; }).map(function (s) { return { id: s.id, label: s.title.replace(/ ·.*$/, '').slice(0, 16) + (s.group === 'spouse' || s.group === 'past' ? ' ' + (s.title.split(' · ')[1] || '').slice(0, 10) : ''), imageUrl: s.url, hasVideo: !!s.video, body: { slot: s.id },
        apply: function (key) { return post({ slot: s.id, uploadVideo: key }).then(function (r) { s.video = r.video; return r; }); } }; });
      if (!cells.length) { toast('이미지가 있는 칸이 없습니다'); return; }
      window.V2Batch.open({ title: '영상 일괄 만들기 · 풀이 화면 이미지' + (G.group ? ' · ' + G.d.groups[G.group] : ''), cells: cells, onClose: function () { reload().then(draw); } }); };
    $('#asStop').onclick = function () { G.stop = true; log('중지 요청 — 진행 중인 한 장이 끝나면 멈춥니다'); };
    [].forEach.call(BOX.querySelectorAll('.as-c'), function (c) { c.onclick = function () { if (!G.busy) editor(c.dataset.id); }; }); log('');
  }
  function one(s, useDefault) {
    var cell = BOX.querySelector('.as-c[data-id="' + s.id.replace(/"/g, '\\"') + '"]'); if (cell) cell.classList.add('run'); G.busy = true; log(s.title + ' 만드는 중… (보통 20~60초)');
    return post({ slot: s.id, provider: G.provider, useDefault: !!useDefault }).then(function (r) { log('✓ ' + s.title + ' — ' + r.provider); if (cell) { cell.classList.remove('run'); cell.classList.add('has'); cell.style.backgroundImage = 'url(\'' + r.url + '\')'; } return true; })
      .catch(function (e) { if (cell) cell.classList.remove('run'); log('✗ ' + s.title + ' — ' + e.message); toast(e.message, true); return false; }).then(function (ok) { G.busy = false; return ok; });
  }
  function runList(todo, useDefault, skip) {
    if (!todo.length) { toast('만들 칸이 없습니다'); return; } if (!skip && !confirm('빈 칸 ' + todo.length + '장을 차례로 만듭니다. 이미지 비용이 장당 발생합니다. 계속할까요?')) return;
    G.stop = false; $('#asMissing').disabled = true; $('#asAll').disabled = true; $('#asStop').disabled = false; var fails = 0;
    (function next(i) {
      if (G.stop || i >= todo.length || fails >= 3) { log(fails >= 3 ? '연속 실패 3회로 멈춥니다. 위 오류를 확인하세요.' : G.stop ? '중지했습니다.' : '모두 끝났습니다.'); G.busy = false; reload().then(draw); return; }
      log((i + 1) + ' / ' + todo.length); one(todo[i], useDefault).then(function (ok) { fails = ok ? 0 : fails + 1; G.busy = true; next(i + 1); });
    })(0);
  }
  /* 슬롯 하나 세부 수정 */
  function editor(id) {
    var s = G.d.slots.filter(function (x) { return x.id === id; })[0], pv = G.d.providers, cur = s.url, previews = [], shown = cur, busy = false;
    var d = document.createElement('dialog'); d.className = 'v2dlg'; d.style.width = 'min(900px,96vw)';
    d.innerHTML = '<h3>' + esc(s.title) + ' <small class="muted">' + esc(s.id) + '</small></h3><div style="display:grid;grid-template-columns:minmax(0,270px) minmax(0,1fr);gap:16px"><div><div id="aeImg" style="aspect-ratio:2/3;background:#000 center/cover;border:1px solid var(--line);border-radius:10px;display:grid;place-items:center;color:var(--ink3);font-size:.82rem"></div><div id="aeTh" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div><p class="muted" id="aeMsg" style="margin-top:8px;font-size:.8rem"></p></div>' +
      '<div style="display:grid;gap:10px;align-content:start"><label class="muted">추가 요청 <small>(예: 더 어둡게, 인물을 작게)</small><textarea id="aeExtra" rows="2"></textarea></label><label class="muted">방식 <select id="aeMode"><option value="new">처음부터 다시 그리기</option><option value="edit"' + (cur ? '' : ' disabled') + '>지금 이미지를 바탕으로 수정 (추가 요청만 반영)</option></select></label>' +
      '<label class="muted">모델 <select id="aeProv"><option value="">GPT 우선 · 실패 시 Gemini 로 자동 전환</option><option value="openai"' + (pv.openai ? '' : ' disabled') + '>OpenAI ' + esc(G.d.models.openai) + '</option><option value="gemini"' + (pv.gemini ? '' : ' disabled') + '>Gemini ' + esc(G.d.models.gemini) + '</option></select></label>' +
      '<details><summary class="muted" style="cursor:pointer">프롬프트 전체 보기·편집' + (s.custom ? ' <b style="color:var(--gold)">(수정됨)</b>' : '') + '</summary><textarea id="aePrompt" rows="8" style="width:100%;margin-top:6px"></textarea><div class="row" style="gap:6px;margin-top:4px"><button type="button" id="aeReset">기본 프롬프트로 되돌리기</button><label class="muted" style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="aeSave"> 확정할 때 이 프롬프트를 기본으로 저장</label></div></details>' +
      '<div class="card" style="padding:10px"><b style="color:var(--gold)">Kling 으로 영상 만들기 (이 칸의 현재 이미지 → 영상)</b><label class="muted" style="display:block">영상 프롬프트 (영어, 고쳐 쓸 수 있어요)<textarea id="aeKP" rows="5" style="width:100%"></textarea></label><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px"><label class="muted">품질 <select id="aeKM"><option value="std">표준 (720p)</option><option value="pro">고화질 (1080p · 크레딧 더 사용)</option><option value="4k">초고화질 (4K · 크레딧 가장 많이 사용)</option></select></label><label class="muted">길이 <select id="aeKD"><option value="5">5초</option><option value="10">10초</option><option value="15">15초</option></select></label><button type="button" class="btn" id="aeKGo"' + (cur ? '' : ' disabled') + '>' + (s.video ? 'Kling 으로 영상 다시 만들기' : 'Kling 으로 영상 만들기') + '</button></div><p class="muted" id="aeKMsg" style="margin-top:6px;font-size:.8rem">' + (cur ? '' : '이 칸에 이미지가 먼저 있어야 합니다.') + '</p><div id="aeVidBox" style="margin-top:10px"></div></div>' +
      '<div class="card" style="padding:10px"><b style="color:var(--gold)">영상으로 교체 (업로드)</b><p class="muted" style="margin:4px 0 8px;font-size:.8rem">mp4·webm 파일을 올리면 이 칸이 영상이 됩니다. 정지 이미지는 영상이 로드되기 전 포스터로 그대로 쓰입니다. 소리는 꺼진 채 화면에 보일 때 반복 재생됩니다.</p><input type="file" id="aeVid" accept="video/mp4,video/webm,video/quicktime"> <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button type="button" class="btn" id="aeVUp">영상 올리고 교체</button><button type="button" id="aeVClr"' + (s.video ? '' : ' disabled') + '>영상 빼고 이미지로 되돌리기</button></div><p class="muted" id="aeVMsg" style="margin-top:6px;font-size:.8rem">' + (s.video ? '현재 이 칸은 영상입니다.' : '') + '</p></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="aeGo">미리 만들기</button><button type="button" class="btn gold" id="aeOk" disabled>이 이미지로 교체</button><button type="button" id="aeClose">닫기</button></div></div></div>';
    document.body.appendChild(d); d.showModal(); var q = function (x) { return d.querySelector(x); }; q('#aePrompt').value = s.prompt;
    function show(url, label) { shown = url; var im = q('#aeImg'); im.style.backgroundImage = url ? 'url(\'' + url + '\')' : 'none'; im.textContent = url ? '' : '아직 이미지가 없습니다'; q('#aeMsg').textContent = label || ''; q('#aeOk').disabled = !previews.some(function (x) { return x.url === url; }); thumbs(); }
    function thumbs() { var th = function (u, t) { return '<button type="button" data-u="' + esc(u) + '" title="' + t + '" style="width:46px;height:68px;padding:0;border:2px solid ' + (shown === u ? 'var(--gold)' : 'var(--line)') + ';border-radius:6px;background:#000 url(\'' + esc(u) + '\') center/cover"></button>'; };
      q('#aeTh').innerHTML = (cur ? th(cur, '현재 이미지') : '') + previews.map(function (x, i) { return th(x.url, '새 결과 ' + (i + 1)); }).join(''); [].forEach.call(q('#aeTh').querySelectorAll('button'), function (b) { b.onclick = function () { show(b.dataset.u, b.dataset.u === cur ? '현재 이미지' : '새 결과'); }; }); }
    function finish() { discardPend(); previews.forEach(function (x) { post({ discard: x.key }).catch(function () { }); }); d.remove(); reload().then(draw); }
    q('#aeReset').onclick = function () { q('#aePrompt').value = s.defaultPrompt; };
    q('#aeGo').onclick = function () { if (busy) return; busy = true; q('#aeGo').disabled = true; q('#aeMsg').textContent = '만드는 중… (보통 20~60초)';
      post({ slot: id, preview: true, prompt: q('#aePrompt').value, extra: q('#aeExtra').value, fromCurrent: q('#aeMode').value === 'edit', provider: q('#aeProv').value }).then(function (r) { previews.push({ key: r.preview, url: r.url }); show(r.url, '새 결과 · ' + r.provider + ' ' + r.model + ' — 마음에 들면 "이 이미지로 교체"'); })
        .catch(function (e) { q('#aeMsg').textContent = '실패: ' + e.message; toast(e.message, true); }).then(function () { busy = false; q('#aeGo').disabled = false; }); };
    q('#aeOk').onclick = function () { var x = previews.filter(function (v) { return v.url === shown; })[0]; if (!x || busy) return; if (cur && !confirm('현재 이미지를 이 결과로 교체합니다. 이전 이미지는 삭제됩니다. 계속할까요?')) return; busy = true;
      post({ slot: id, accept: x.key, prompt: q('#aeSave').checked ? q('#aePrompt').value : '' }).then(function (r) { x.used = true; cur = r.url; previews = previews.filter(function (v) { return v !== x; }); toast('교체했습니다'); show(cur, '교체 완료 — 현재 이미지'); }).catch(function (e) { toast(e.message, true); }).then(function () { busy = false; }); };
    /* ── 영상: Kling 으로 만들기(미리보기 → 확정) · 직접 올리기 · 빼기 ── */
    var pend = null, kb = false; q('#aeKP').value = s.tools ? s.tools.prompt : '';
    var upFile = function (file, name) { return C.api('/api/clipfile?name=' + encodeURIComponent(name), { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file }).then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); return r.key; }); };
    function jpegOf(url) { return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); c.toBlob(function (b) { b ? ok(b) : no(new Error('이미지를 JPEG 로 바꾸지 못했습니다')); }, 'image/jpeg', 0.95); }; im.onerror = function () { no(new Error('현재 이미지를 불러오지 못했습니다')); }; im.src = url; }); }
    function vtag(u) { return '<video controls loop muted playsinline preload="metadata" poster="' + esc(cur || '') + '" src="' + esc(u) + '" style="width:100%;max-width:300px;margin-top:6px;border:1px solid var(--line);border-radius:10px;background:#000;display:block"></video>'; }
    function discardPend() { if (pend) { C.api('/api/clipfile?k=' + encodeURIComponent(pend.key), { method: 'DELETE' }).catch(function () { }); pend = null; } }
    function setLabels() { q('#aeKGo').textContent = s.video ? 'Kling 으로 영상 다시 만들기' : 'Kling 으로 영상 만들기'; q('#aeVClr').disabled = !s.video; }
    function vidBox() { var b = q('#aeVidBox'), h = '';
      if (pend) h += '<b style="color:var(--gold);font-size:.82rem">새로 만든 영상 (미리보기)</b>' + vtag(pend.url) + '<div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap"><button type="button" class="btn gold" id="aeVOk">이 영상으로 교체</button><button type="button" id="aeVNo">버리고 다시 만들기</button></div>';
      if (s.video) h += '<div style="margin-top:10px"><b style="color:var(--gold);font-size:.82rem">현재 영상</b>' + vtag(s.video) + '</div>';
      b.innerHTML = h;
      if (q('#aeVOk')) q('#aeVOk').onclick = function () {
        if (busy || !pend) return; if (s.video && !confirm('이 칸의 현재 영상을 새 영상으로 교체합니다. 이전 영상은 삭제됩니다. 계속할까요?')) return; busy = true; q('#aeVOk').disabled = true;
        post({ slot: id, uploadVideo: pend.key }).then(function (r) { s.video = r.video; pend = null; q('#aeKMsg').textContent = '교체했습니다.'; setLabels(); toast('영상으로 교체했습니다'); vidBox(); })
          .catch(function (e) { toast(e.message, true); if (q('#aeVOk')) q('#aeVOk').disabled = false; }).then(function () { busy = false; });
      };
      if (q('#aeVNo')) q('#aeVNo').onclick = function () { discardPend(); q('#aeKMsg').textContent = '버렸습니다. 프롬프트를 고쳐 다시 만들 수 있습니다.'; vidBox(); };
    }
    function kPoll() {
      var msg = q('#aeKMsg'), n = 0; kb = true; q('#aeKGo').disabled = true;
      (function tick() {
        if (!d.isConnected) return;
        C.api('/api/panel-video?id=' + encodeURIComponent(id)).then(function (r) {
          if (r.status === 'processing') { n++; msg.textContent = 'Kling 이 영상을 만드는 중… ' + (n * 8) + '초 경과 (보통 1~5분)'; if (n > 110) { msg.textContent = '아직 처리 중입니다. 창을 닫았다가 나중에 이 칸을 다시 열면 이어서 확인합니다.'; kb = false; q('#aeKGo').disabled = false; return; } setTimeout(tick, 8000); return; }
          kb = false; q('#aeKGo').disabled = false; G.vid.tasks = (G.vid.tasks || []).filter(function (x) { return x.id !== id; });
          if (r.status === 'done') { if (pend) discardPend(); pend = { key: r.preview, url: r.video }; msg.textContent = '영상이 만들어졌습니다. 미리보기로 확인하고, 마음에 들면 "이 영상으로 교체"를 누르세요.'; toast('영상이 만들어졌습니다 — 미리보기를 확인하세요'); vidBox(); }
          else { msg.textContent = '실패: ' + (r.error || '알 수 없는 오류'); toast(r.error || 'Kling 영상 생성에 실패했습니다', true); }
        }).catch(function (er) { kb = false; q('#aeKGo').disabled = false; msg.textContent = '확인 실패: ' + er.message; });
      })();
    }
    if (((G.vid && G.vid.tasks) || []).some(function (x) { return x.id === id; })) { q('#aeKMsg').textContent = 'Kling 이 이 칸의 영상을 만드는 중입니다…'; kPoll(); }
    q('#aeKGo').onclick = function () {
      if (kb || busy) return; var msg = q('#aeKMsg'); if (!cur) { msg.textContent = '이 칸에 이미지가 먼저 있어야 합니다'; return; }
      if (!confirm((s.video ? '새 영상을 만듭니다(확정하기 전에는 현재 영상이 그대로 유지됩니다). ' : '이 칸의 현재 이미지로 Kling 영상을 만듭니다. ') + 'Kling 크레딧이 사용되고 1~5분 걸립니다. 계속할까요?')) return;
      kb = true; q('#aeKGo').disabled = true; msg.textContent = '시작 프레임 준비 중…';
      jpegOf(cur).then(function (b) { return upFile(b, 'assetstart-' + Date.now() + '.jpg'); })
        .then(function (k) { msg.textContent = 'Kling 에 제출하는 중…'; var ex = q('#aeExtra').value.trim(); return C.api('/api/panel-video', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot: id, startKey: k, prompt: q('#aeKP').value + (ex ? ' Additional direction: ' + ex : ''), mode: q('#aeKM').value, duration: Number(q('#aeKD').value) }) }); })
        .then(function () { G.vid.tasks = (G.vid.tasks || []).concat({ id: id }); kb = false; kPoll(); })
        .catch(function (er) { kb = false; q('#aeKGo').disabled = false; msg.textContent = '실패: ' + er.message; toast(er.message, true); });
    };
    q('#aeVUp').onclick = function () {
      var f = q('#aeVid').files[0], msg = q('#aeVMsg'); if (!f || busy) { msg.textContent = '영상 파일을 먼저 고르세요'; return; } if (!cur) { msg.textContent = '이 칸에 이미지가 먼저 있어야 합니다'; return; }
      if (s.video && !confirm('이 칸의 영상을 올린 영상으로 교체합니다. 이전 영상은 삭제됩니다. 계속할까요?')) return; busy = true; q('#aeVUp').disabled = true; msg.textContent = '영상 올리는 중… (파일이 크면 시간이 걸립니다)';
      upFile(f, 'asset-' + Date.now() + '-' + f.name).then(function (k) { return post({ slot: id, uploadVideo: k }); })
        .then(function (r) { s.video = r.video; msg.textContent = '교체했습니다 — 이 칸은 이제 영상입니다.'; setLabels(); vidBox(); toast('영상으로 교체했습니다'); })
        .catch(function (e) { msg.textContent = '실패: ' + e.message; toast(e.message, true); }).then(function () { busy = false; q('#aeVUp').disabled = false; });
    };
    q('#aeVClr').onclick = function () { if (busy || !confirm('영상을 빼고 정지 이미지로 되돌립니다. 영상 파일은 삭제됩니다. 계속할까요?')) return; busy = true;
      post({ slot: id, clearVideo: true }).then(function () { s.video = ''; setLabels(); vidBox(); q('#aeVMsg').textContent = '이미지로 되돌렸습니다.'; toast('이미지로 되돌렸습니다'); }).catch(function (e) { toast(e.message, true); }).then(function () { busy = false; }); };
    vidBox();
    q('#aeClose').onclick = function () { d.close(); }; d.addEventListener('close', finish); show(cur, cur ? '현재 이미지' : '');
  }
  window.V2Assets = { open: open };
})();
