/* 관리자 "패널 이미지" 탭 아래의 "타로 카드 이미지" — 78장을 AI 로 만든다. 화풍·감성·세계관·분위기·카드 틀·카드 이름 글자 + 레퍼런스(참고) 이미지 + 카드별 세부 수정.
   서버: /api/tarot-art (확정된 이미지는 R2 + free:content 의 tarot.images 에 저장되어 타로 화면에 바로 쓰인다). v2-panel.js 가 draw() 끝에서 V2Tarot.open(컨테이너) 를 부른다. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, BOX = null, G = { d: null, busy: false, stop: false, provider: '' };
  var SUIT = { M: '메이저 아르카나 (22)', W: '완드 (14)', C: '컵 (14)', S: '소드 (14)', P: '펜타클 (14)' };
  var $ = function (s) { return BOX.querySelector(s); };
  var css = document.createElement('style');
  css.textContent = '.ta-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:6px;margin:6px 0 14px}.ta-c{aspect-ratio:2/3;border:1px dashed var(--line);border-radius:6px;background:#000 center/cover;display:flex;align-items:flex-end;justify-content:center;font-size:.64rem;color:var(--ink3);cursor:pointer;overflow:hidden;position:relative}' +
    '.ta-c.has{border:1px solid var(--line)}.ta-c.run{outline:2px solid var(--gold)}.ta-c b{background:rgba(0,0,0,.62);width:100%;text-align:center;padding:2px 1px;font-weight:400;line-height:1.25}.ta-rf{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px}' +
    '.ta-rf .rf{width:54px;height:80px;border-radius:6px;border:1px solid var(--line);background:#000 center/cover;position:relative}.ta-rf .rf button{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;padding:0;line-height:1;font-size:.7rem}.ta-log{font-size:.8rem;color:var(--ink2);max-height:150px;overflow:auto;margin-top:8px;line-height:1.6}';
  document.head.appendChild(css);
  var LOG = []; function log(t) { LOG.unshift(t); LOG = LOG.slice(0, 40); var b = BOX && $('.ta-log'); if (b) b.innerHTML = LOG.map(esc).join('<br>'); }
  var post = function (b) { return C.api('/api/tarot-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); };
  // 레퍼런스 이미지 업로드(/api/clipfile, 관리자 전용 R2) → '/api/clipfile?k=키'
  function upload(file) {
    if (!/^image[/](webp|png|jpeg|jpg)$/.test(file.type) && !/[.](webp|png|jpe?g)$/i.test(file.name)) return Promise.reject(new Error('이미지 파일(webp·png·jpg)만 올릴 수 있습니다'));
    var ext = ((file.name.match(/[.](webp|png|jpe?g)$/i) || [])[1] || file.type.split('/')[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
    return C.api('/api/clipfile?name=' + encodeURIComponent('tarot-ref.' + ext), { method: 'POST', headers: { 'content-type': file.type || 'image/png' }, body: file }).then(function (d) { if (!d.key) throw new Error('업로드 응답에 key 가 없습니다'); return '/api/clipfile?k=' + encodeURIComponent(d.key); });
  }
  function refStrip(urls, attr) { return urls.map(function (u, i) { return '<span class="rf" style="background-image:url(\'' + esc(u) + '\')"><button type="button" ' + attr + '="' + i + '" title="빼기">✕</button></span>'; }).join(''); }

  function open(box) { BOX = box; BOX.innerHTML = '<div class="card" style="margin-top:12px"><p class="muted">타로 카드 목록을 불러오는 중…</p></div>'; return C.api('/api/tarot-art').then(function (d) { G.d = d; draw(); }).catch(function (e) { BOX.innerHTML = '<div class="card" style="margin-top:12px"><p class="err">' + esc(e.message) + '</p></div>'; }); }
  function reload() { return C.api('/api/tarot-art').then(function (d) { G.d = d; }); }

  function draw() {
    var d = G.d, v = d.direction, O = d.options, have = d.cards.filter(function (c) { return c.url; }).length, pv = d.providers;
    var dir = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">' + Object.keys(O).map(function (k) { return '<label class="muted">' + esc(O[k].label) + '<select data-td="' + k + '">' + Object.keys(O[k].items).map(function (i) { return '<option value="' + i + '"' + (v[k] === i ? ' selected' : '') + '>' + esc(O[k].items[i]) + '</option>'; }).join('') + '</select></label>'; }).join('') + '</div>' +
      '<label class="muted" style="display:block;margin-top:10px">추가 방향 <small>(예: 금박 장식, 보라색 계열, 80년대 필름 느낌)</small><input data-td="extra" value="' + esc(v.extra || '') + '" maxlength="300" style="width:100%"></label>' +
      '<div style="margin-top:10px"><span class="muted">레퍼런스 이미지 (최대 3장 · 모든 카드를 만들 때 함께 참고)</span><div class="ta-rf" id="taRefs">' + refStrip(v.refs || [], 'data-rmref') + ((v.refs || []).length < 3 ? '<label class="navbtn" style="cursor:pointer;padding:6px 12px;font-size:.8rem">+ 레퍼런스 올리기<input type="file" id="taRefUp" accept="image/png,image/jpeg,image/webp" multiple hidden></label>' : '') +
      '<label class="muted">참고 방식 <select data-td="refUse">' + Object.keys(d.refUse).map(function (k) { return '<option value="' + k + '"' + (v.refUse === k ? ' selected' : '') + '>' + esc(d.refUse[k]) + '</option>'; }).join('') + '</select></label></div></div>' +
      '<div class="row" style="margin-top:10px;gap:8px;align-items:center"><button class="btn" id="taDirSave">디렉션·레퍼런스 저장</button><span class="muted" id="taDirMsg"></span></div>';
    var grid = ['M', 'W', 'C', 'S', 'P'].map(function (s) { return '<div class="cap2" style="margin-top:12px">' + SUIT[s] + '</div><div class="ta-grid">' + d.cards.filter(function (c) { return c.suit === s; }).map(function (c) { return '<div class="ta-c' + (c.url ? ' has' : '') + '" data-id="' + c.id + '" title="' + esc(c.nameKo + ' · ' + c.nameEn) + ' — 눌러서 세부 수정"' + (c.url ? ' style="background-image:url(\'' + esc(c.url) + '\')"' : '') + '><b>' + esc(c.nameKo) + '</b></div>'; }).join('') + '</div>'; }).join('');
    BOX.innerHTML = '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">타로 카드 이미지 · ' + have + ' / ' + d.cards.length + '장</b><p class="muted" style="margin:6px 0 10px">타로 78장의 카드 이미지를 AI 로 만듭니다. 확정한 이미지는 무료 콘텐츠의 타로 화면에 바로 쓰입니다. 화풍·감성·세계관은 아래에서 정하고, 레퍼런스 이미지를 올리면 그 화풍을 참고해 그립니다. 카드를 누르면 세부 수정(프롬프트·추가 요청·카드별 레퍼런스·현재 이미지 바탕 수정)을 할 수 있습니다.</p>' + dir +
      '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin-top:16px"><label class="muted">모델 <select id="taProv"><option value="">GPT 우선 · 실패 시 Gemini 로 자동 전환</option><option value="openai"' + (pv.openai ? '' : ' disabled') + (G.provider === 'openai' ? ' selected' : '') + '>OpenAI ' + esc(d.models.openai) + '</option><option value="gemini"' + (pv.gemini ? '' : ' disabled') + (G.provider === 'gemini' ? ' selected' : '') + '>Gemini ' + esc(d.models.gemini) + '</option></select></label>' +
      '<button class="btn" id="taMissing"' + (G.busy ? ' disabled' : '') + '>빈 칸 모두 만들기</button><button class="btn" id="taAll"' + (G.busy ? ' disabled' : '') + '>모두 다시 만들기</button><button id="taStop"' + (G.busy ? '' : ' disabled') + '>중지</button></div>' +
      (!d.r2 ? '<p class="err">R2(CLIPS_R2)가 연결되지 않아 저장할 수 없습니다.</p>' : '') + grid + '<div class="ta-log"></div></div>';
    bind(); log('');
  }
  function bind() {
    var v = G.d.direction;
    function readDir() { var o = Object.assign({}, v); [].forEach.call(BOX.querySelectorAll('[data-td]'), function (e) { o[e.dataset.td] = e.value; }); o.refs = v.refs || []; return o; }
    $('#taProv').onchange = function () { G.provider = this.value; };
    var up = $('#taRefUp'); if (up) up.onchange = function () { var fs = [].slice.call(up.files).slice(0, 3 - (v.refs || []).length), n = $('#taDirMsg'); if (!fs.length) return; n.textContent = '올리는 중…';
      Promise.all(fs.map(upload)).then(function (us) { v.refs = (v.refs || []).concat(us).slice(0, 3); G.d.direction = readDir(); draw(); $('#taDirMsg').textContent = '올렸습니다 — "저장"을 눌러야 적용됩니다'; }).catch(function (e) { n.textContent = e.message; toast(e.message, true); }); };
    [].forEach.call(BOX.querySelectorAll('[data-rmref]'), function (b) { b.onclick = function () { var o = readDir(); o.refs = (v.refs || []).filter(function (_, i) { return i !== +b.dataset.rmref; }); G.d.direction = o; draw(); $('#taDirMsg').textContent = '뺐습니다 — "저장"을 눌러야 적용됩니다'; }; });
    $('#taDirSave').onclick = function () { var btn = this; btn.disabled = true; C.api('/api/tarot-art', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ direction: readDir() }) })
      .then(function (r) { G.d.direction = r.direction; toast('타로 디렉션을 저장했습니다'); return reload(); }).then(draw).catch(function (e) { toast(e.message, true); btn.disabled = false; }); };
    $('#taMissing').onclick = function () { runList(G.d.cards.filter(function (c) { return !c.url; }), false); };
    $('#taAll').onclick = function () {
      var custom = G.d.cards.filter(function (c) { return c.custom; }).length; if (!confirm('78장 전체를 현재 디렉션으로 다시 만듭니다.\n이미지 비용이 장당 발생하고 1시간 이상 걸릴 수 있으며, 성공한 카드의 기존 이미지는 삭제됩니다. 계속할까요?')) return;
      var reset = custom ? confirm('카드별로 직접 고쳐 저장한 프롬프트가 ' + custom + '개 있습니다.\n[확인] 버리고 현재 디렉션으로 만듭니다.\n[취소] 고친 프롬프트를 그대로 사용합니다.') : false; runList(G.d.cards.slice(), reset, true); };
    $('#taStop').onclick = function () { G.stop = true; log('중지 요청 — 진행 중인 한 장이 끝나면 멈춥니다'); };
    [].forEach.call(BOX.querySelectorAll('.ta-c'), function (c) { c.onclick = function () { if (!G.busy) editor(c.dataset.id); }; });
  }
  function one(c, useDefault) {
    var cell = BOX.querySelector('.ta-c[data-id="' + c.id + '"]'); if (cell) cell.classList.add('run'); G.busy = true; log(c.nameKo + ' 만드는 중… (보통 20~60초)');
    return post({ card: c.id, provider: G.provider, useDefault: !!useDefault }).then(function (r) { log('✓ ' + c.nameKo + ' — ' + r.provider + (r.refs ? ' · 레퍼런스 ' + r.refs + '장' : '')); if (cell) { cell.classList.remove('run'); cell.classList.add('has'); cell.style.backgroundImage = 'url(\'' + r.url + '\')'; } return true; })
      .catch(function (e) { if (cell) cell.classList.remove('run'); log('✗ ' + c.nameKo + ' — ' + e.message); toast(e.message, true); return false; }).then(function (ok) { G.busy = false; return ok; });
  }
  function runList(todo, useDefault, skip) {
    if (!todo.length) { toast('만들 카드가 없습니다'); return; }
    if (!skip && !confirm('빈 카드 ' + todo.length + '장을 차례로 만듭니다. 이미지 비용이 장당 발생합니다. 계속할까요?')) return;
    G.stop = false; $('#taMissing').disabled = true; $('#taAll').disabled = true; $('#taStop').disabled = false; var fails = 0;
    (function next(i) {
      if (G.stop || i >= todo.length || fails >= 3) { log(fails >= 3 ? '연속 실패 3회로 멈춥니다. 위 오류를 확인하세요.' : G.stop ? '중지했습니다.' : '모두 끝났습니다.'); G.busy = false; reload().then(draw); return; }
      log((i + 1) + ' / ' + todo.length); one(todo[i], useDefault).then(function (ok) { fails = ok ? 0 : fails + 1; G.busy = true; next(i + 1); });
    })(0);
  }

  /* 카드 하나 세부 수정: 프롬프트·추가 요청·이 카드 전용 레퍼런스로 여러 번 미리 만들어 보고, 마음에 드는 결과만 확정한다. */
  function editor(id) {
    var c = G.d.cards.filter(function (x) { return x.id === id; })[0], pv = G.d.providers, cur = c.url, previews = [], shown = cur, busy = false, refs = [], gl = G.d.direction.refs || [];
    var d = document.createElement('dialog'); d.className = 'v2dlg'; d.style.width = 'min(940px,96vw)';
    d.innerHTML = '<h3>' + esc(c.nameKo) + ' <small class="muted">' + esc(c.nameEn) + ' · ' + esc(c.id) + '</small></h3><div style="display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr);gap:16px">' +
      '<div><div id="teImg" style="aspect-ratio:2/3;background:#000 center/cover;border:1px solid var(--line);border-radius:10px;display:grid;place-items:center;color:var(--ink3);font-size:.82rem"></div><div id="teTh" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div><p class="muted" id="teMsg" style="margin-top:8px;font-size:.8rem"></p></div>' +
      '<div style="display:grid;gap:10px;align-content:start"><label class="muted">추가 요청 <small>(예: 배경을 더 어둡게, 별을 크게, 인물을 작게)</small><textarea id="teExtra" rows="2"></textarea></label>' +
      '<label class="muted">방식 <select id="teMode"><option value="new">처음부터 다시 그리기 (프롬프트 + 추가 요청 + 레퍼런스)</option><option value="edit"' + (cur ? '' : ' disabled') + '>지금 이미지를 바탕으로 수정 (추가 요청만 반영, 구도 유지)</option></select></label>' +
      '<div><span class="muted">이 카드 전용 레퍼런스 <small>(이번에 만들 때만 사용 · 최대 3장)</small></span><div class="ta-rf" id="teRefs"></div>' + (gl.length ? '<label class="muted" style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="teGlobal" checked> 전체 레퍼런스 ' + gl.length + '장도 함께 사용</label>' : '') + '</div>' +
      '<label class="muted">모델 <select id="teProv"><option value="">GPT 우선 · 실패 시 Gemini 로 자동 전환</option><option value="openai"' + (pv.openai ? '' : ' disabled') + '>OpenAI ' + esc(G.d.models.openai) + '</option><option value="gemini"' + (pv.gemini ? '' : ' disabled') + '>Gemini ' + esc(G.d.models.gemini) + '</option></select></label>' +
      '<details><summary class="muted" style="cursor:pointer">프롬프트 전체 보기·편집' + (c.custom ? ' <b style="color:var(--gold)">(수정됨)</b>' : '') + '</summary><textarea id="tePrompt" rows="9" style="width:100%;margin-top:6px"></textarea><div class="row" style="gap:6px;margin-top:4px"><button type="button" id="teReset">기본 프롬프트로 되돌리기</button><label class="muted" style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="teSave"> 확정할 때 이 프롬프트를 이 카드의 기본으로 저장</label></div></details>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="teGo">미리 만들기</button><button type="button" class="btn gold" id="teOk" disabled>이 이미지로 교체</button><button type="button" id="teClose">닫기</button></div></div></div>';
    document.body.appendChild(d); d.showModal();
    var q = function (s) { return d.querySelector(s); }; q('#tePrompt').value = c.prompt;
    function refDraw() { q('#teRefs').innerHTML = refStrip(refs, 'data-rm') + (refs.length < 3 ? '<label class="navbtn" style="cursor:pointer;padding:6px 12px;font-size:.8rem">+ 올리기<input type="file" id="teUp" accept="image/png,image/jpeg,image/webp" multiple hidden></label>' : '');
      [].forEach.call(q('#teRefs').querySelectorAll('[data-rm]'), function (b) { b.onclick = function () { refs.splice(+b.dataset.rm, 1); refDraw(); }; });
      var up = q('#teUp'); if (up) up.onchange = function () { var fs = [].slice.call(up.files).slice(0, 3 - refs.length); q('#teMsg').textContent = '레퍼런스 올리는 중…'; Promise.all(fs.map(upload)).then(function (us) { refs = refs.concat(us).slice(0, 3); refDraw(); q('#teMsg').textContent = ''; }).catch(function (e) { q('#teMsg').textContent = e.message; }); }; }
    refDraw();
    function show(url, label) { shown = url; var im = q('#teImg'); im.style.backgroundImage = url ? 'url(\'' + url + '\')' : 'none'; im.textContent = url ? '' : '아직 이미지가 없습니다'; q('#teMsg').textContent = label || ''; q('#teOk').disabled = !previews.some(function (x) { return x.url === url; }); thumbs(); }
    function thumbs() { var th = function (u, t) { return '<button type="button" data-u="' + esc(u) + '" title="' + t + '" style="width:46px;height:68px;padding:0;border:2px solid ' + (shown === u ? 'var(--gold)' : 'var(--line)') + ';border-radius:6px;background:#000 url(\'' + esc(u) + '\') center/cover"></button>'; };
      q('#teTh').innerHTML = (cur ? th(cur, '현재 이미지') : '') + previews.map(function (x, i) { return th(x.url, '새 결과 ' + (i + 1)); }).join(''); [].forEach.call(q('#teTh').querySelectorAll('button'), function (b) { b.onclick = function () { show(b.dataset.u, b.dataset.u === cur ? '현재 이미지' : '새 결과'); }; }); }
    function finish() { previews.forEach(function (x) { post({ discard: x.key }).catch(function () { }); }); d.remove(); reload().then(draw); }
    q('#teReset').onclick = function () { q('#tePrompt').value = c.defaultPrompt; };
    q('#teGo').onclick = function () {
      if (busy) return; busy = true; q('#teGo').disabled = true; q('#teMsg').textContent = '만드는 중… (보통 20~60초)'; var g = q('#teGlobal');
      post({ card: id, preview: true, prompt: q('#tePrompt').value, extra: q('#teExtra').value, fromCurrent: q('#teMode').value === 'edit', refs: refs, useGlobalRefs: g ? g.checked : false, provider: q('#teProv').value })
        .then(function (r) { previews.push({ key: r.preview, url: r.url }); show(r.url, '새 결과 · ' + r.provider + ' ' + r.model + (r.refs ? ' · 레퍼런스 ' + r.refs + '장 참고' : '') + ' — 마음에 들면 "이 이미지로 교체"'); })
        .catch(function (e) { q('#teMsg').textContent = '실패: ' + e.message; toast(e.message, true); }).then(function () { busy = false; q('#teGo').disabled = false; });
    };
    q('#teOk').onclick = function () {
      var x = previews.filter(function (v) { return v.url === shown; })[0]; if (!x || busy) return; if (cur && !confirm('현재 이미지를 이 결과로 교체합니다. 이전 이미지는 삭제됩니다. 계속할까요?')) return; busy = true;
      post({ card: id, accept: x.key, prompt: q('#teSave').checked ? q('#tePrompt').value : '' }).then(function (r) { x.used = true; cur = r.url; previews = previews.filter(function (v) { return v !== x; }); toast('교체했습니다'); show(cur, '교체 완료 — 현재 이미지'); })
        .catch(function (e) { toast(e.message, true); }).then(function () { busy = false; });
    };
    q('#teClose').onclick = function () { d.close(); }; d.addEventListener('close', finish); show(cur, cur ? '현재 이미지' : '');
  }
  window.V2Tarot = { open: open };
})();
