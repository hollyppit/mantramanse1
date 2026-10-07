/* 관리자 "패널 이미지" — 무빙툰 컷(이미지 + 글)에 쓰는 삽화 50장(오행 5 × 주제 10)을 AI 로 만든다.
   모델: OpenAI gpt-image-2 → 안 되면 Gemini 이미지 모델(/api/panel-art 가 키 있는 쪽을 차례로 시도). 만들어진 컷은 R2 에 저장되고 미디어 라이브러리에 태그와 함께 등록돼
   뷰어의 조합 규칙(오행·주제 점수)이 장면마다 알맞은 컷을 고른다. 이 화면은 만들기·다시 만들기만 한다. index.html 의 showTab 이 V2Panel.open('panelart', 비밀번호) 를 부른다. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, PANE = null, G = { d: null, busy: false, stop: false, provider: '', log: [] };
  var EL = { wood: '木 목', fire: '火 화', earth: '土 토', metal: '金 금', water: '水 수' }, TH = { identity: '나는 누구', talent: '재능', career: '일', wealth: '돈', love: '사랑', relationship: '관계', family: '가족', shadow: '약점', daewoon: '지금 시기', remedy: '회복' };
  var $ = function (s) { return PANE.querySelector(s); };
  var css = document.createElement('style');
  css.textContent = '.pa-grid{display:grid;grid-template-columns:70px repeat(10,minmax(0,1fr));gap:6px;align-items:stretch;margin-top:12px}.pa-h{font-size:.72rem;color:var(--ink3);text-align:center;align-self:end}.pa-r{font-size:.82rem;color:var(--gold);align-self:center}' +
    '.pa-c{aspect-ratio:3/4;border:1px dashed var(--line);border-radius:8px;background:#000 center/cover;display:flex;align-items:flex-end;justify-content:center;font-size:.7rem;color:var(--ink3);cursor:pointer;position:relative;overflow:hidden}.pa-c.has{border:1px solid var(--line)}.pa-c.run{outline:2px solid var(--gold)}' +
    '.pa-c b{background:rgba(0,0,0,.6);width:100%;text-align:center;padding:2px 0;font-weight:400}.pa-log{font-size:.8rem;color:var(--ink2);max-height:160px;overflow:auto;margin-top:10px;line-height:1.6}@media(max-width:900px){.pa-grid{grid-template-columns:50px repeat(5,minmax(0,1fr))}}';
  document.head.appendChild(css);

  function load() { return C.api('/api/panel-art').then(function (d) { G.d = d; }); }
  function open(tab, pw) { C.setPw(pw); PANE = document.getElementById('t-panelart'); PANE.innerHTML = '<p class="muted">불러오는 중…</p>'; load().then(draw).catch(function (e) { PANE.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }); }
  function log(t) { G.log.unshift(t); G.log = G.log.slice(0, 40); var b = $('.pa-log'); if (b) b.innerHTML = G.log.map(esc).join('<br>'); }
  function draw() {
    var d = G.d, have = d.presets.filter(function (p) { return p.url; }).length, pv = d.providers;
    var cells = '<span></span>' + Object.keys(TH).map(function (t) { return '<span class="pa-h">' + esc(TH[t]) + '</span>'; }).join('');
    Object.keys(EL).forEach(function (e) {
      cells += '<span class="pa-r">' + esc(EL[e]) + '</span>' + Object.keys(TH).map(function (t) {
        var p = d.presets.filter(function (x) { return x.element === e && x.theme === t; })[0];
        return '<div class="pa-c' + (p.url ? ' has' : '') + '" data-id="' + p.id + '" data-e="' + e + '" data-t="' + t + '" title="' + esc(p.title) + ' — 눌러서 ' + (p.url ? '다시 만들기' : '만들기') + '"' + (p.url ? ' style="background-image:url(\'' + esc(p.url) + '\')"' : '') + '>' + (p.url ? '' : '<b>비어 있음</b>') + '</div>';
      }).join('');
    });
    PANE.innerHTML = '<div class="card"><b style="color:var(--gold)">패널 이미지 · ' + have + ' / ' + d.presets.length + '장</b><p class="muted" style="margin:6px 0 10px">무빙툰의 각 컷(이미지 + 글)에 들어가는 삽화입니다. 오행(5) × 이야기 주제(10)별로 한 장씩 만들고, 뷰어가 사용자의 오행과 이야기 주제에 맞는 컷을 자동으로 고릅니다. 칸을 누르면 그 컷을 <b>세부 수정</b>(프롬프트 편집 · 추가 요청 · 현재 이미지를 바탕으로 수정)하고 미리 본 뒤 교체할 수 있습니다.</p>' +
      '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><label class="muted">모델 <select id="paProv"><option value="">GPT 우선 · 실패 시 Gemini 로 자동 전환</option><option value="openai"' + (G.provider === 'openai' ? ' selected' : '') + (pv.openai ? '' : ' disabled') + '>OpenAI ' + esc(d.models.openai) + (pv.openai ? '' : ' (키 없음)') + '</option><option value="gemini"' + (G.provider === 'gemini' ? ' selected' : '') + (pv.gemini ? '' : ' disabled') + '>Gemini ' + esc(d.models.gemini) + (pv.gemini ? '' : ' (키 없음)') + '</option></select></label>' +
      '<button class="btn" id="paMissing"' + (G.busy ? ' disabled' : '') + '>빈 칸 모두 만들기</button><button id="paStop"' + (G.busy ? '' : ' disabled') + '>중지</button></div>' +
      (!d.r2 ? '<p class="err">R2(CLIPS_R2)가 연결되지 않아 저장할 수 없습니다.</p>' : '') + (!pv.openai && !pv.gemini ? '<p class="err">OPENAI_API_KEY 또는 GEMINI_API_KEY 가 없습니다. Cloudflare 환경 변수에 추가하세요.</p>' : '') +
      '<div class="pa-grid">' + cells + '</div><div class="pa-log"></div></div>';
    $('#paProv').onchange = function () { G.provider = this.value; };
    $('#paMissing').onclick = runMissing; $('#paStop').onclick = function () { G.stop = true; log('중지 요청 — 진행 중인 한 장이 끝나면 멈춥니다'); };
    [].forEach.call(PANE.querySelectorAll('.pa-c'), function (c) { c.onclick = function () { if (G.busy) return; editor(c.dataset.e, c.dataset.t); }; });
    log('');
  }
  /* 컷 하나 세부 수정: 프롬프트·추가 요청으로 여러 번 미리 만들어 보고, 마음에 드는 결과만 이 칸에 확정한다(안 고른 결과는 닫을 때 지운다). */
  function editor(e, t) {
    var p = G.d.presets.filter(function (x) { return x.element === e && x.theme === t; })[0], pv = G.d.providers, cur = p.url, previews = [], shown = cur, busy = false;
    var d = document.createElement('dialog'); d.className = 'v2dlg'; d.style.width = 'min(920px,96vw)';
    d.innerHTML = '<h3>' + esc(p.title) + ' <small class="muted">' + esc(p.id) + '</small></h3><div style="display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:16px" class="pe-grid">' +
      '<div><div id="peImg" style="aspect-ratio:2/3;background:#000 center/cover;border:1px solid var(--line);border-radius:10px;display:grid;place-items:center;color:var(--ink3);font-size:.82rem"></div><div id="peTh" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div><p class="muted" id="peMsg" style="margin-top:8px;font-size:.8rem"></p></div>' +
      '<div style="display:grid;gap:10px;align-content:start"><label class="muted">추가 요청 <small>(예: 달을 더 크게, 더 어둡고 쓸쓸하게, 인물을 작게)</small><textarea id="peExtra" rows="2" placeholder="바꾸고 싶은 점을 한두 문장으로"></textarea></label>' +
      '<label class="muted">방식 <select id="peMode"><option value="new">처음부터 다시 그리기 (프롬프트 + 추가 요청)</option><option value="edit"' + (cur ? '' : ' disabled') + '>지금 이미지를 바탕으로 수정 (추가 요청만 반영, 구도 유지)</option></select></label>' +
      '<label class="muted">모델 <select id="peProv"><option value="">GPT 우선 · 실패 시 Gemini 로 자동 전환</option><option value="openai"' + (pv.openai ? '' : ' disabled') + '>OpenAI ' + esc(G.d.models.openai) + '</option><option value="gemini"' + (pv.gemini ? '' : ' disabled') + '>Gemini ' + esc(G.d.models.gemini) + '</option></select></label>' +
      '<details><summary class="muted" style="cursor:pointer">프롬프트 전체 보기·편집' + (p.custom ? ' <b style="color:var(--gold)">(수정됨)</b>' : '') + '</summary><textarea id="pePrompt" rows="9" style="width:100%;margin-top:6px"></textarea><div class="row" style="gap:6px;margin-top:4px"><button type="button" id="peReset">기본 프롬프트로 되돌리기</button><label class="muted" style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="peSave"> 확정할 때 이 프롬프트를 이 칸의 기본으로 저장</label></div></details>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="peGo">미리 만들기</button><button type="button" class="btn gold" id="peOk" disabled>이 이미지로 교체</button><button type="button" id="peClose">닫기</button></div></div></div>';
    document.body.appendChild(d); d.showModal();
    var q = function (s) { return d.querySelector(s); }; q('#pePrompt').value = p.prompt;
    function show(url, label) { shown = url; var im = q('#peImg'); im.style.backgroundImage = url ? 'url(\'' + url + '\')' : 'none'; im.textContent = url ? '' : '아직 이미지가 없습니다'; q('#peMsg').textContent = label || ''; q('#peOk').disabled = !previews.some(function (x) { return x.url === url; }); thumbs(); }
    function thumbs() { var h = cur ? '<button type="button" data-u="' + esc(cur) + '" title="현재 이미지" style="width:46px;height:68px;padding:0;border:2px solid ' + (shown === cur ? 'var(--gold)' : 'var(--line)') + ';border-radius:6px;background:#000 url(\'' + esc(cur) + '\') center/cover"></button>' : '';
      previews.forEach(function (x, i) { h += '<button type="button" data-u="' + esc(x.url) + '" title="새 결과 ' + (i + 1) + '" style="width:46px;height:68px;padding:0;border:2px solid ' + (shown === x.url ? 'var(--gold)' : 'var(--line)') + ';border-radius:6px;background:#000 url(\'' + esc(x.url) + '\') center/cover"></button>'; });
      q('#peTh').innerHTML = h; [].forEach.call(q('#peTh').querySelectorAll('button'), function (b) { b.onclick = function () { show(b.dataset.u, b.dataset.u === cur ? '현재 이미지' : '새 결과'); }; }); }
    function finish() { previews.forEach(function (x) { if (!x.used) C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ discard: x.key }) }).catch(function () { }); }); d.remove(); load().then(draw); }
    q('#peReset').onclick = function () { q('#pePrompt').value = p.defaultPrompt; };
    q('#peGo').onclick = function () {
      if (busy) return; busy = true; q('#peGo').disabled = true; q('#peMsg').textContent = '만드는 중… (보통 20~60초)'; var edit = q('#peMode').value === 'edit';
      C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ element: e, theme: t, preview: true, prompt: q('#pePrompt').value, extra: q('#peExtra').value, fromCurrent: edit, provider: q('#peProv').value }) })
        .then(function (r) { previews.push({ key: r.preview, url: r.url, provider: r.provider + ' ' + r.model }); show(r.url, '새 결과 · ' + r.provider + ' ' + r.model + ' — 마음에 들면 "이 이미지로 교체"'); })
        .catch(function (er) { q('#peMsg').textContent = '실패: ' + er.message; toast(er.message, true); }).then(function () { busy = false; q('#peGo').disabled = false; });
    };
    q('#peOk').onclick = function () {
      var x = previews.filter(function (v) { return v.url === shown; })[0]; if (!x || busy) return; if (cur && !confirm('현재 이미지를 이 결과로 교체합니다. 이전 이미지는 삭제됩니다. 계속할까요?')) return; busy = true;
      C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ element: e, theme: t, accept: x.key, by: x.provider, prompt: q('#peSave').checked ? q('#pePrompt').value : '' }) })
        .then(function (r) { x.used = true; cur = r.url; previews = previews.filter(function (v) { return v !== x; }); toast('교체했습니다'); show(cur, '교체 완료 — 현재 이미지'); })
        .catch(function (er) { toast(er.message, true); }).then(function () { busy = false; });
    };
    q('#peClose').onclick = function () { d.close(); }; d.addEventListener('close', finish); show(cur, cur ? '현재 이미지' : '');
  }
  function one(e, t, redraw) {
    var cell = PANE.querySelector('.pa-c[data-e="' + e + '"][data-t="' + t + '"]'); if (cell) cell.classList.add('run'); G.busy = true; log(EL[e] + ' · ' + TH[t] + ' 만드는 중… (보통 20~60초)');
    return C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ element: e, theme: t, provider: G.provider }) })
      .then(function (r) { log('✓ ' + EL[e] + ' · ' + TH[t] + ' — ' + r.provider + ' ' + r.model); if (cell && !redraw) { cell.classList.remove('run'); cell.classList.add('has'); cell.style.backgroundImage = 'url(\'' + r.url + '\')'; cell.innerHTML = ''; } return true; })
      .catch(function (er) { if (cell) cell.classList.remove('run'); log('✗ ' + EL[e] + ' · ' + TH[t] + ' — ' + er.message); toast(er.message, true); return false; })
      .then(function (ok) { G.busy = false; return ok; });
  }
  function runMissing() {
    var todo = G.d.presets.filter(function (p) { return !p.url; }); if (!todo.length) { toast('빈 칸이 없습니다'); return; }
    if (!confirm('빈 칸 ' + todo.length + '장을 차례로 만듭니다. 이미지 비용이 장당 발생합니다. 계속할까요?')) return;
    G.stop = false; $('#paMissing').disabled = true; $('#paStop').disabled = false; var fails = 0;
    (function next(i) {
      if (G.stop || i >= todo.length || fails >= 3) { log(fails >= 3 ? '연속 실패 3회로 멈춥니다. 위 오류를 확인하세요.' : G.stop ? '중지했습니다.' : '모두 끝났습니다.'); G.busy = false; load().then(draw); return; }
      one(todo[i].element, todo[i].theme, false).then(function (ok) { fails = ok ? 0 : fails + 1; G.busy = true; next(i + 1); });
    })(0);
  }
  window.V2Panel = { open: open };
})();
