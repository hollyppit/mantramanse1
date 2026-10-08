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
  /* 용도 둘: 본문 컷(글과 함께 나오는 삽화) · 배경(화면 전체 뒤에 깔리는 장면). 각각 오행 5 × 주제 10 = 50칸. 서버는 id 접두사(panel- / panelbg-)로 구분한다. */
  var KIND = {
    panel: { title: '패널 이미지 · 본문 컷', desc: '무빙툰 본문에서 <b>글과 함께 나오는 삽화</b>(이미지 + 글 한 컷)입니다. 오행(5) × 이야기 주제(10)별로 한 장씩 만들고, 뷰어가 사용자의 오행과 챕터 주제에 맞는 컷을 골라 글 옆에 보여 줍니다. 칸을 누르면 <b>세부 수정</b>(프롬프트 편집 · 추가 요청 · 현재 이미지를 바탕으로 수정)이나 <b>영상 업로드</b>로 교체할 수 있습니다.' },
    bg: { title: '배경 이미지 · 무빙툰 배경', desc: '무빙툰 화면 <b>전체 뒤에 깔리는 배경</b>입니다. 글이 올라가도 읽히도록 어둡고 차분하게, 뚜렷한 초점 없이 만듭니다. 오행(5) × 이야기 주제(10)별로 한 장씩 만들면 뷰어가 장면에 맞는 배경을 고르고, 이 칸이 비어 있으면 기존 클립 라이브러리의 배경을 씁니다. 칸을 누르면 세부 수정이나 <b>반복 재생 배경 영상</b> 업로드로 교체할 수 있습니다. (본문 컷과 서로 섞이지 않습니다.)' } };
  function cardOf(kind) {
    var d = G.d, pv = d.providers, list = d.presets.filter(function (p) { return p.kind === kind; }), have = list.filter(function (p) { return p.url; }).length, I = KIND[kind];
    var cells = '<span></span>' + Object.keys(TH).map(function (t) { return '<span class="pa-h">' + esc(TH[t]) + '</span>'; }).join('');
    Object.keys(EL).forEach(function (e) {
      cells += '<span class="pa-r">' + esc(EL[e]) + '</span>' + Object.keys(TH).map(function (t) {
        var p = list.filter(function (x) { return x.element === e && x.theme === t; })[0];
        return '<div class="pa-c' + (p.url ? ' has' : '') + '" data-id="' + p.id + '" data-k="' + kind + '" data-e="' + e + '" data-t="' + t + '" title="' + esc(p.title) + ' — 눌러서 ' + (p.url ? '다시 만들기' : '만들기') + '"' + (p.url ? ' style="background-image:url(\'' + esc(p.url) + '\')"' : '') + '>' + (p.url ? (p.video ? '<b>▶ 영상</b>' : '') : '<b>비어 있음</b>') + '</div>';
      }).join('');
    });
    return '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">' + I.title + ' · ' + have + ' / ' + list.length + '장</b><p class="muted" style="margin:6px 0 10px">' + I.desc + '</p>' +
      '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><label class="muted">모델 <select class="paProv"><option value="">GPT 우선 · 실패 시 Gemini 로 자동 전환</option><option value="openai"' + (G.provider === 'openai' ? ' selected' : '') + (pv.openai ? '' : ' disabled') + '>OpenAI ' + esc(d.models.openai) + (pv.openai ? '' : ' (키 없음)') + '</option><option value="gemini"' + (G.provider === 'gemini' ? ' selected' : '') + (pv.gemini ? '' : ' disabled') + '>Gemini ' + esc(d.models.gemini) + (pv.gemini ? '' : ' (키 없음)') + '</option></select></label>' +
      '<button class="btn pa-run" data-run="missing" data-k="' + kind + '"' + (G.busy ? ' disabled' : '') + '>빈 칸 모두 만들기</button><button class="btn pa-run" data-run="all" data-k="' + kind + '"' + (G.busy ? ' disabled' : '') + '>모두 다시 만들기</button><button class="pa-stop"' + (G.busy ? '' : ' disabled') + '>중지</button></div>' +
      (kind === 'panel' && !d.r2 ? '<p class="err">R2(CLIPS_R2)가 연결되지 않아 저장할 수 없습니다.</p>' : '') + (kind === 'panel' && !pv.openai && !pv.gemini ? '<p class="err">OPENAI_API_KEY 또는 GEMINI_API_KEY 가 없습니다. Cloudflare 환경 변수에 추가하세요.</p>' : '') +
      '<div class="pa-grid">' + cells + '</div></div>';
  }
  function draw() {
    PANE.innerHTML = dirCard(G.d) + cardOf('panel') + cardOf('bg') + '<div class="card" style="margin-top:12px"><div class="pa-log"></div></div><div id="taBox"></div><div id="asBox"></div>';
    bindDir(); if (window.V2Tarot) window.V2Tarot.open(PANE.querySelector('#taBox')); if (window.V2Assets) window.V2Assets.open(PANE.querySelector('#asBox'));
    [].forEach.call(PANE.querySelectorAll('.paProv'), function (sel) { sel.onchange = function () { G.provider = this.value; [].forEach.call(PANE.querySelectorAll('.paProv'), function (o) { o.value = G.provider; }); }; });
    [].forEach.call(PANE.querySelectorAll('.pa-run'), function (b) { b.onclick = function () { (b.dataset.run === 'all' ? runAll : runMissing)(b.dataset.k); }; });
    [].forEach.call(PANE.querySelectorAll('.pa-stop'), function (b) { b.onclick = function () { G.stop = true; log('중지 요청 — 진행 중인 한 장이 끝나면 멈춥니다'); }; });
    [].forEach.call(PANE.querySelectorAll('.pa-c'), function (c) { c.onclick = function () { if (G.busy) return; editor(c.dataset.e, c.dataset.t, c.dataset.k); }; });
    log('');
  }
  /* 컷 하나 세부 수정: 프롬프트·추가 요청으로 여러 번 미리 만들어 보고, 마음에 드는 결과만 이 칸에 확정한다(안 고른 결과는 닫을 때 지운다). */
  // 외부 도구(Leonardo 이미지 · Kling 영상)용 프롬프트 상자: 읽기 전용 + 복사 버튼
  function toolBox(title, text, id) { return '<label class="muted" style="display:block;margin-top:6px">' + esc(title) + '<textarea readonly rows="4" id="' + id + '" style="width:100%">' + esc(text) + '</textarea></label><button type="button" class="pe-copy" data-for="' + id + '" style="margin-top:2px">복사</button>'; }
  function editor(e, t, kind) {
    var p = G.d.presets.filter(function (x) { return x.kind === kind && x.element === e && x.theme === t; })[0], pv = G.d.providers, cur = p.url, previews = [], shown = cur, busy = false;
    var d = document.createElement('dialog'); d.className = 'v2dlg'; d.style.width = 'min(920px,96vw)';
    d.innerHTML = '<h3>' + esc(p.title) + ' <small class="muted">' + esc(p.id) + '</small></h3><div style="display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:16px" class="pe-grid">' +
      '<div><div id="peImg" style="aspect-ratio:2/3;background:#000 center/cover;border:1px solid var(--line);border-radius:10px;display:grid;place-items:center;color:var(--ink3);font-size:.82rem"></div><div id="peTh" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div><p class="muted" id="peMsg" style="margin-top:8px;font-size:.8rem"></p></div>' +
      '<div style="display:grid;gap:10px;align-content:start"><label class="muted">추가 요청 <small>(예: 달을 더 크게, 더 어둡고 쓸쓸하게, 인물을 작게)</small><textarea id="peExtra" rows="2" placeholder="바꾸고 싶은 점을 한두 문장으로"></textarea></label>' +
      '<label class="muted">방식 <select id="peMode"><option value="new">처음부터 다시 그리기 (프롬프트 + 추가 요청)</option><option value="edit"' + (cur ? '' : ' disabled') + '>지금 이미지를 바탕으로 수정 (추가 요청만 반영, 구도 유지)</option></select></label>' +
      '<label class="muted">모델 <select id="peProv"><option value="">GPT 우선 · 실패 시 Gemini 로 자동 전환</option><option value="openai"' + (pv.openai ? '' : ' disabled') + '>OpenAI ' + esc(G.d.models.openai) + '</option><option value="gemini"' + (pv.gemini ? '' : ' disabled') + '>Gemini ' + esc(G.d.models.gemini) + '</option></select></label>' +
      '<details><summary class="muted" style="cursor:pointer">프롬프트 전체 보기·편집' + (p.custom ? ' <b style="color:var(--gold)">(수정됨)</b>' : '') + '</summary><textarea id="pePrompt" rows="9" style="width:100%;margin-top:6px"></textarea><div class="row" style="gap:6px;margin-top:4px"><button type="button" id="peReset">기본 프롬프트로 되돌리기</button><label class="muted" style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="peSave"> 확정할 때 이 프롬프트를 이 칸의 기본으로 저장</label></div></details>' +
      '<div class="card" style="padding:10px"><b style="color:var(--gold)">직접 만든 이미지로 교체 (Leonardo 등)</b><p class="muted" style="margin:4px 0 8px;font-size:.8rem">아래 프롬프트를 복사해 Leonardo 에서 이미지를 만든 뒤 올리면 이 칸이 그 이미지로 바뀝니다(jpg·png·webp, 15MB 이하). 칸에 영상이 있으면 영상은 그대로 두고 정지 이미지만 바뀝니다.</p>' + (p.tools ? toolBox('Leonardo 이미지 프롬프트 (영어)', p.tools.leo, 'peT1') + toolBox('네거티브 프롬프트', p.tools.leoNeg, 'peT2') + '<p class="muted" style="font-size:.78rem;margin:4px 0">권장 크기 ' + esc(p.tools.leoSize) + '</p>' : '') + '<input type="file" id="peImgUp" accept="image/jpeg,image/png,image/webp"> <button type="button" class="btn" id="peImgGo">이미지 올려 교체</button><p class="muted" id="peImgMsg" style="margin-top:6px;font-size:.8rem"></p></div>' +
      '<div class="card" style="padding:10px"><b style="color:var(--gold)">영상으로 교체 (업로드)</b>' + (p.tools ? '<p class="muted" style="margin:4px 0 0;font-size:.8rem">Kling 이미지→영상: 위 이미지를 시작 프레임으로 넣고 아래 프롬프트를 쓰세요. ' + esc(p.tools.klingSet) + '</p>' + toolBox('Kling 영상 프롬프트 (영어)', p.tools.kling, 'peT3') + toolBox('Kling 네거티브 프롬프트', p.tools.klingNeg, 'peT4') : '') + '<p class="muted" style="margin:4px 0 8px;font-size:.8rem">' + (kind === 'bg' ? 'mp4·webm 파일을 올리면 이 칸이 <b>반복 재생되는 배경 영상</b>이 됩니다(소리 없이 무한 반복). 글이 올라가도 읽히도록 어둡고 움직임이 잔잔한 영상이 좋습니다. 정지 이미지(포스터)는 영상의 첫 장면으로 자동 만들거나 직접 올릴 수 있습니다.' : 'mp4·webm 파일을 올리면 이 칸이 영상 컷이 됩니다. 정지 이미지(포스터)는 영상의 첫 장면으로 자동 만들거나, 아래에서 직접 올릴 수 있습니다. 소리는 꺼진 채 화면에 들어오면 재생됩니다.') + '</p><input type="file" id="peVid" accept="video/mp4,video/webm,video/quicktime"> <label class="muted" style="display:block;margin-top:6px">포스터 이미지(선택) <input type="file" id="pePoster" accept="image/*"></label><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button type="button" class="btn" id="peUp">영상 올리고 교체</button><button type="button" id="peUnvid"' + (p.video ? '' : ' disabled') + '>영상 빼고 이미지로 되돌리기</button></div><p class="muted" id="peUpMsg" style="margin-top:6px;font-size:.8rem">' + (p.video ? '현재 이 칸은 영상입니다.' : '') + '</p></div>' +
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
      C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: kind, element: e, theme: t, preview: true, prompt: q('#pePrompt').value, extra: q('#peExtra').value, fromCurrent: edit, provider: q('#peProv').value }) })
        .then(function (r) { previews.push({ key: r.preview, url: r.url, provider: r.provider + ' ' + r.model }); show(r.url, '새 결과 · ' + r.provider + ' ' + r.model + ' — 마음에 들면 "이 이미지로 교체"'); })
        .catch(function (er) { q('#peMsg').textContent = '실패: ' + er.message; toast(er.message, true); }).then(function () { busy = false; q('#peGo').disabled = false; });
    };
    q('#peOk').onclick = function () {
      var x = previews.filter(function (v) { return v.url === shown; })[0]; if (!x || busy) return; if (cur && !confirm('현재 이미지를 이 결과로 교체합니다. 이전 이미지는 삭제됩니다. 계속할까요?')) return; busy = true;
      C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: kind, element: e, theme: t, accept: x.key, by: x.provider, prompt: q('#peSave').checked ? q('#pePrompt').value : '' }) })
        .then(function (r) { x.used = true; cur = r.url; previews = previews.filter(function (v) { return v !== x; }); toast('교체했습니다'); show(cur, '교체 완료 — 현재 이미지'); })
        .catch(function (er) { toast(er.message, true); }).then(function () { busy = false; });
    };
    function upFile(file, name) { return C.api('/api/clipfile?name=' + encodeURIComponent(name), { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file }).then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); return r.key; }); }
    function frameOf(file) { // 영상의 첫 장면을 webp 이미지로 뽑는다
      return new Promise(function (ok, no) { var v = document.createElement('video'), u = URL.createObjectURL(file); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = u; var bye = function () { URL.revokeObjectURL(u); };
        v.onerror = function () { bye(); no(new Error('영상에서 첫 장면을 뽑지 못했습니다. 포스터 이미지를 직접 올려 주세요')); };
        v.onloadeddata = function () { try { v.currentTime = Math.min(0.2, (v.duration || 1) / 2); } catch (e) { } }; v.onseeked = function () { try { var c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); c.toBlob(function (b) { bye(); b ? ok(b) : no(new Error('첫 장면 변환 실패')); }, 'image/webp', 0.9); } catch (e) { bye(); no(e); } }; });
    }
    q('#peUp').onclick = function () {
      var f = q('#peVid').files[0], pf = q('#pePoster').files[0], msg = q('#peUpMsg'); if (!f || busy) { msg.textContent = '영상 파일을 먼저 고르세요'; return; }
      if (cur && !confirm('이 칸을 올린 영상으로 교체합니다. 계속할까요?')) return; busy = true; q('#peUp').disabled = true; msg.textContent = '영상 올리는 중… (파일이 크면 시간이 걸립니다)';
      var vk; upFile(f, (kind === 'bg' ? 'panelbg-' : 'panel-') + e + '-' + t + '-' + f.name).then(function (k) { vk = k; msg.textContent = '포스터 준비 중…'; if (pf) return upFile(pf, 'panel-poster-' + pf.name); if (cur) return ''; return frameOf(f).then(function (b) { return upFile(b, 'panel-poster.webp'); }); })
        .then(function (pk) { return C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: kind, element: e, theme: t, uploadVideo: vk, uploadPoster: pk || '' }) }); })
        .then(function (r) { cur = r.url; p.video = r.video; msg.textContent = '교체했습니다 — 이 칸은 이제 영상입니다.'; q('#peUnvid').disabled = false; toast('영상으로 교체했습니다'); show(cur, '현재 이미지(영상의 포스터)'); })
        .catch(function (er) { msg.textContent = '실패: ' + er.message; toast(er.message, true); }).then(function () { busy = false; q('#peUp').disabled = false; });
    };
    q('#peUnvid').onclick = function () { if (busy || !confirm('영상을 빼고 정지 이미지로 되돌립니다. 영상 파일은 삭제됩니다. 계속할까요?')) return; busy = true; C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: kind, element: e, theme: t, clearVideo: true }) }).then(function () { p.video = ''; q('#peUnvid').disabled = true; q('#peUpMsg').textContent = '이미지로 되돌렸습니다.'; toast('이미지로 되돌렸습니다'); }).catch(function (er) { toast(er.message, true); }).then(function () { busy = false; }); };
    [].forEach.call(d.querySelectorAll('.pe-copy'), function (b) { b.onclick = function () { var ta = q('#' + b.dataset.for); ta.select(); try { navigator.clipboard.writeText(ta.value).then(function () { toast('복사했습니다'); }, function () { document.execCommand('copy'); toast('복사했습니다'); }); } catch (er) { document.execCommand('copy'); toast('복사했습니다'); } }; });
    q('#peImgGo').onclick = function () {
      var f = q('#peImgUp').files[0], msg = q('#peImgMsg'); if (!f || busy) { msg.textContent = '이미지 파일을 먼저 고르세요'; return; }
      if (cur && !confirm('현재 이미지를 올린 이미지로 교체합니다. 이전 이미지는 삭제됩니다. 계속할까요?')) return; busy = true; q('#peImgGo').disabled = true; msg.textContent = '올리는 중…';
      upFile(f, (kind === 'bg' ? 'panelbg-' : 'panel-') + e + '-' + t + '.' + (f.name.split('.').pop() || 'webp')).then(function (k) { return C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: kind, element: e, theme: t, uploadImage: k }) }); })
        .then(function (r) { cur = r.url; p.video = r.video; msg.textContent = '교체했습니다.'; toast('이미지로 교체했습니다'); show(cur, '교체 완료 — 현재 이미지'); })
        .catch(function (er) { msg.textContent = '실패: ' + er.message; toast(er.message, true); }).then(function () { busy = false; q('#peImgGo').disabled = false; });
    };
    q('#peClose').onclick = function () { d.close(); }; d.addEventListener('close', finish); show(cur, cur ? '현재 이미지' : '');
  }
  /* 비주얼 디렉션: 감성(화풍) · 배경(세계관) · 분위기 · 인물 + 한 줄 추가. 저장하면 이후 새로 만드는 모든 이미지의 프롬프트에 들어간다(이미 만든 이미지·칸별로 직접 고친 프롬프트는 그대로). */
  function dirCard(d) {
    var O = d.directionOptions, v = d.direction, h = '<div class="card"><b style="color:var(--gold)">비주얼 디렉션</b><p class="muted" style="margin:6px 0 10px">모든 컷에 공통으로 적용되는 감성·배경 설정입니다. 저장한 뒤 새로 만들거나 다시 만드는 이미지부터 반영됩니다.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">';
    Object.keys(O).forEach(function (k) { h += '<label class="muted">' + esc(O[k].label) + '<select data-dir="' + k + '">' + Object.keys(O[k].items).map(function (i) { return '<option value="' + i + '"' + (v[k] === i ? ' selected' : '') + '>' + esc(O[k].items[i]) + '</option>'; }).join('') + '</select></label>'; });
    return h + '</div><label class="muted" style="display:block;margin-top:10px">추가 방향 <small>(예: 비 오는 밤 위주로, 보라색 계열 조명, 80년대 필름 느낌)</small><input data-dir="extra" value="' + esc(v.extra || '') + '" maxlength="300" style="width:100%"></label><div class="row" style="margin-top:10px;gap:8px;align-items:center"><button class="btn" id="paDirSave">디렉션 저장</button><span class="muted" id="paDirMsg"></span></div></div>';
  }
  function bindDir() {
    $('#paDirSave').onclick = function () {
      var v = {}; [].forEach.call(PANE.querySelectorAll('[data-dir]'), function (e) { v[e.dataset.dir] = e.value; }); $('#paDirSave').disabled = true;
      C.api('/api/panel-art', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ direction: v }) }).then(function (r) { G.d.direction = r.direction; $('#paDirMsg').textContent = '저장했습니다 — 지금부터 새로 만드는 이미지에 적용됩니다'; toast('비주얼 디렉션을 저장했습니다'); return load(); })
        .catch(function (e) { toast(e.message, true); }).then(function () { var b = $('#paDirSave'); if (b) b.disabled = false; });
    };
  }
  function one(kind, e, t, redraw, useDefault) {
    var cell = PANE.querySelector('.pa-c[data-k="' + kind + '"][data-e="' + e + '"][data-t="' + t + '"]'); if (cell) cell.classList.add('run'); G.busy = true; log((kind === 'bg' ? '[배경] ' : '[본문] ') + EL[e] + ' · ' + TH[t] + ' 만드는 중… (보통 20~60초)');
    return C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: kind, element: e, theme: t, provider: G.provider, useDefault: !!useDefault }) })
      .then(function (r) { log('✓ ' + EL[e] + ' · ' + TH[t] + ' — ' + r.provider + ' ' + r.model); if (cell && !redraw) { cell.classList.remove('run'); cell.classList.add('has'); cell.style.backgroundImage = 'url(\'' + r.url + '\')'; cell.innerHTML = ''; } return true; })
      .catch(function (er) { if (cell) cell.classList.remove('run'); log('✗ ' + EL[e] + ' · ' + TH[t] + ' — ' + er.message); toast(er.message, true); return false; })
      .then(function (ok) { G.busy = false; return ok; });
  }
  function runMissing(kind) { runList(G.d.presets.filter(function (p) { return p.kind === kind && !p.url; }), false); }
  // 모두 다시 만들기: 이미 있는 컷까지 현재 비주얼 디렉션으로 전부 새로 만든다. 새로 만드는 데 성공한 칸만 교체되고(실패하면 옛 이미지 유지) 옛 파일은 지워진다.
  function runAll(kind) {
    var all = G.d.presets.filter(function (p) { return p.kind === kind; }), n = all.length, custom = all.filter(function (p) { return p.custom; }).length; if (!confirm((kind === 'bg' ? '배경 ' : '본문 컷 ') + '50장 전체를 현재 비주얼 디렉션(화풍·감성·세계관…)으로 다시 만듭니다.\n이미지 비용이 장당 발생하고 30분 이상 걸릴 수 있으며, 성공한 칸의 기존 이미지는 삭제됩니다. 계속할까요?')) return;
    var reset = false; if (custom) reset = confirm('칸별로 직접 고쳐 저장한 프롬프트가 ' + custom + '개 있습니다.\n[확인] 그 프롬프트를 버리고 현재 디렉션으로 만듭니다.\n[취소] 고친 프롬프트를 그대로 사용합니다.');
    runList(all, reset, true);
  }
  function runList(todo, useDefault, skipConfirm) {
    if (!todo.length) { toast('만들 칸이 없습니다'); return; }
    if (!skipConfirm && !confirm('빈 칸 ' + todo.length + '장을 차례로 만듭니다. 이미지 비용이 장당 발생합니다. 계속할까요?')) return;
    G.stop = false; [].forEach.call(PANE.querySelectorAll('.pa-run'), function (b) { b.disabled = true; }); [].forEach.call(PANE.querySelectorAll('.pa-stop'), function (b) { b.disabled = false; }); var fails = 0;
    (function next(i) {
      if (G.stop || i >= todo.length || fails >= 3) { log(fails >= 3 ? '연속 실패 3회로 멈춥니다. 위 오류를 확인하세요.' : G.stop ? '중지했습니다.' : '모두 끝났습니다.'); G.busy = false; load().then(draw); return; }
      log((i + 1) + ' / ' + todo.length); one(todo[i].kind, todo[i].element, todo[i].theme, false, useDefault).then(function (ok) { fails = ok ? 0 : fails + 1; G.busy = true; next(i + 1); });
    })(0);
  }
  window.V2Panel = { open: open };
})();
