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
  function open(box) { BOX = box; BOX.innerHTML = '<div class="card" style="margin-top:12px"><p class="muted">풀이 화면 이미지 목록을 불러오는 중…</p></div>'; return C.api('/api/asset-art').then(function (d) { G.d = d; draw(); }).catch(function (e) { BOX.innerHTML = '<div class="card" style="margin-top:12px"><p class="err">' + esc(e.message) + '</p></div>'; }); }
  function reload() { return C.api('/api/asset-art').then(function (d) { G.d = d; }); }
  var inGroup = function (s) { return !G.group || s.group === G.group; };

  function draw() {
    var d = G.d, pv = d.providers, have = d.slots.filter(function (s) { return s.url; }).length;
    var grid = Object.keys(d.groups).filter(function (g) { return !G.group || g === G.group; }).map(function (g) {
      return '<div class="cap2" style="margin-top:12px">' + esc(d.groups[g]) + ' · ' + d.slots.filter(function (s) { return s.group === g && s.url; }).length + ' / ' + d.slots.filter(function (s) { return s.group === g; }).length + '</div><div class="as-grid">' +
        d.slots.filter(function (s) { return s.group === g; }).map(function (s) { return '<div class="as-c' + (s.url ? ' has' : '') + '" data-id="' + esc(s.id) + '" title="' + esc(s.title) + ' — 눌러서 세부 수정"' + (s.url ? ' style="background-image:url(\'' + esc(s.url) + '\')"' : '') + '><b>' + esc(s.title.replace(/ ·.*$/, '').slice(0, 14) + (s.group === 'spouse' || s.group === 'past' ? ' ' + s.title.split(' · ')[1].slice(0, 8) : '')) + '</b></div>'; }).join('') + '</div>'; }).join('');
    BOX.innerHTML = '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">풀이 화면 이미지 · ' + have + ' / ' + d.slots.length + '장</b><p class="muted" style="margin:6px 0 10px">풀이 본문에 들어가는 이미지입니다: <b>자동차 비유(10)</b> · <b>직업 후보(12)</b> · <b>배우자 인상(24)</b> · <b>전생(25)</b>. 화풍·감성·세계관은 위의 "비주얼 디렉션"을 같이 씁니다. 이미지가 없으면 풀이 화면에는 한자 자리표시가 나옵니다. 칸을 누르면 세부 수정(프롬프트·추가 요청·현재 이미지 바탕 수정)을 할 수 있습니다.</p>' +
      '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><label class="muted">구분 <select id="asGroup"><option value="">전체</option>' + Object.keys(d.groups).map(function (g) { return '<option value="' + g + '"' + (G.group === g ? ' selected' : '') + '>' + esc(d.groups[g]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="muted">모델 <select id="asProv"><option value="">GPT 우선 · 실패 시 Gemini 로 자동 전환</option><option value="openai"' + (pv.openai ? '' : ' disabled') + (G.provider === 'openai' ? ' selected' : '') + '>OpenAI ' + esc(d.models.openai) + '</option><option value="gemini"' + (pv.gemini ? '' : ' disabled') + (G.provider === 'gemini' ? ' selected' : '') + '>Gemini ' + esc(d.models.gemini) + '</option></select></label>' +
      '<button class="btn" id="asMissing"' + (G.busy ? ' disabled' : '') + '>빈 칸 모두 만들기</button><button class="btn" id="asAll"' + (G.busy ? ' disabled' : '') + '>모두 다시 만들기</button><button id="asStop"' + (G.busy ? '' : ' disabled') + '>중지</button></div>' +
      (!d.r2 ? '<p class="err">R2(CLIPS_R2)가 연결되지 않아 저장할 수 없습니다.</p>' : '') + grid + '<div class="as-log"></div></div>';
    $('#asGroup').onchange = function () { G.group = this.value; draw(); }; $('#asProv').onchange = function () { G.provider = this.value; };
    $('#asMissing').onclick = function () { runList(G.d.slots.filter(function (s) { return inGroup(s) && !s.url; }), false); };
    $('#asAll').onclick = function () { var list = G.d.slots.filter(inGroup), custom = list.filter(function (s) { return s.custom; }).length; if (!confirm(list.length + '장을 현재 비주얼 디렉션으로 모두 다시 만듭니다.\n이미지 비용이 장당 발생하고 오래 걸리며, 성공한 칸의 기존 이미지는 삭제됩니다. 계속할까요?')) return;
      runList(list, custom ? confirm('칸별로 직접 고쳐 저장한 프롬프트가 ' + custom + '개 있습니다.\n[확인] 버리고 현재 디렉션으로 만듭니다.\n[취소] 고친 프롬프트를 그대로 사용합니다.') : false, true); };
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
      '<div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="aeGo">미리 만들기</button><button type="button" class="btn gold" id="aeOk" disabled>이 이미지로 교체</button><button type="button" id="aeClose">닫기</button></div></div></div>';
    document.body.appendChild(d); d.showModal(); var q = function (x) { return d.querySelector(x); }; q('#aePrompt').value = s.prompt;
    function show(url, label) { shown = url; var im = q('#aeImg'); im.style.backgroundImage = url ? 'url(\'' + url + '\')' : 'none'; im.textContent = url ? '' : '아직 이미지가 없습니다'; q('#aeMsg').textContent = label || ''; q('#aeOk').disabled = !previews.some(function (x) { return x.url === url; }); thumbs(); }
    function thumbs() { var th = function (u, t) { return '<button type="button" data-u="' + esc(u) + '" title="' + t + '" style="width:46px;height:68px;padding:0;border:2px solid ' + (shown === u ? 'var(--gold)' : 'var(--line)') + ';border-radius:6px;background:#000 url(\'' + esc(u) + '\') center/cover"></button>'; };
      q('#aeTh').innerHTML = (cur ? th(cur, '현재 이미지') : '') + previews.map(function (x, i) { return th(x.url, '새 결과 ' + (i + 1)); }).join(''); [].forEach.call(q('#aeTh').querySelectorAll('button'), function (b) { b.onclick = function () { show(b.dataset.u, b.dataset.u === cur ? '현재 이미지' : '새 결과'); }; }); }
    function finish() { previews.forEach(function (x) { post({ discard: x.key }).catch(function () { }); }); d.remove(); reload().then(draw); }
    q('#aeReset').onclick = function () { q('#aePrompt').value = s.defaultPrompt; };
    q('#aeGo').onclick = function () { if (busy) return; busy = true; q('#aeGo').disabled = true; q('#aeMsg').textContent = '만드는 중… (보통 20~60초)';
      post({ slot: id, preview: true, prompt: q('#aePrompt').value, extra: q('#aeExtra').value, fromCurrent: q('#aeMode').value === 'edit', provider: q('#aeProv').value }).then(function (r) { previews.push({ key: r.preview, url: r.url }); show(r.url, '새 결과 · ' + r.provider + ' ' + r.model + ' — 마음에 들면 "이 이미지로 교체"'); })
        .catch(function (e) { q('#aeMsg').textContent = '실패: ' + e.message; toast(e.message, true); }).then(function () { busy = false; q('#aeGo').disabled = false; }); };
    q('#aeOk').onclick = function () { var x = previews.filter(function (v) { return v.url === shown; })[0]; if (!x || busy) return; if (cur && !confirm('현재 이미지를 이 결과로 교체합니다. 이전 이미지는 삭제됩니다. 계속할까요?')) return; busy = true;
      post({ slot: id, accept: x.key, prompt: q('#aeSave').checked ? q('#aePrompt').value : '' }).then(function (r) { x.used = true; cur = r.url; previews = previews.filter(function (v) { return v !== x; }); toast('교체했습니다'); show(cur, '교체 완료 — 현재 이미지'); }).catch(function (e) { toast(e.message, true); }).then(function () { busy = false; }); };
    q('#aeClose').onclick = function () { d.close(); }; d.addEventListener('close', finish); show(cur, cur ? '현재 이미지' : '');
  }
  window.V2Assets = { open: open };
})();
