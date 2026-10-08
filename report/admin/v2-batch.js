/* 관리자 "영상 일괄 만들기" — 여러 칸의 현재 이미지를 시작 프레임으로 Kling 영상을 동시에 몇 개씩 만든다.
   쓰는 곳: 패널 이미지 탭(v2-panel.js) · 풀이 화면 이미지(v2-assets.js). V2Batch.open({ title, cells, onClose }) 를 부른다.
   cells[i] = { id(진행 중 작업 id = 칸 id), label, imageUrl, hasVideo, body(/api/panel-video POST 에 넣는 칸 지정: {kind,element,theme} 또는 {slot}), apply(영상키) → Promise }
   흐름: 칸 고르기 → 화질·길이·동시 수 정하기 → 만들기 → 완료된 것은 미리보기로 모인다 → 마음에 드는 것만 "적용"(안 고른 것은 닫을 때 삭제).
   서버는 칸마다 작업을 따로 저장하므로 동시에 여러 개를 제출해도 기록이 서로 덮어쓰이지 않는다. 결과 확인(8초마다)은 이 창이 열려 있는 동안만 한다. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast;
  var css = document.createElement('style');
  css.textContent = '.bv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:8px 0}.bv-c{border:1px solid var(--line);border-radius:10px;padding:6px;background:#0a0d1a;display:grid;gap:4px;align-content:start}.bv-c.sel{border-color:var(--gold)}' +
    '.bv-th{aspect-ratio:2/3;background:#000 center/cover;border-radius:6px;cursor:pointer}.bv-c video{width:100%;border-radius:6px;background:#000}.bv-st{font-size:.72rem;color:var(--ink3);line-height:1.35;min-height:2em}.bv-st.ok{color:#5FBF9A}.bv-st.err{color:#FF9A3C}.bv-bar{height:6px;background:var(--line);border-radius:4px;overflow:hidden;margin:6px 0}.bv-bar i{display:block;height:100%;background:var(--gold);width:0}';
  document.head.appendChild(css);
  var RETRY = /429|동시|concurren|rate|too many|busy|limit|exceed/i, TICK = 8000, MAX_WAIT = 110;
  var post = function (url, b) { return C.api(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); };
  var upFile = function (file, name) { return C.api('/api/clipfile?name=' + encodeURIComponent(name), { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file }).then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); return r.key; }); };
  function jpegOf(url) { return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); c.toBlob(function (b) { b ? ok(b) : no(new Error('이미지를 JPEG 로 바꾸지 못했습니다')); }, 'image/jpeg', 0.95); }; im.onerror = function () { no(new Error('이미지를 불러오지 못했습니다')); }; im.src = url; }); }

  function open(cfg) {
    C.api('/api/panel-video').catch(function () { return { enabled: false, tasks: [] }; }).then(function (vid) { build(cfg, vid || { tasks: [] }); });
  }
  function build(cfg, vid) {
    var cells = cfg.cells.map(function (c) { return { id: c.id, label: c.label, imageUrl: c.imageUrl, hasVideo: !!c.hasVideo, body: c.body, apply: c.apply, st: 'idle', msg: '', sel: false, pv: null, n: 0 }; });
    var running = {}; (vid.tasks || []).forEach(function (t) { running[t.id] = true; });
    cells.forEach(function (c) { if (running[c.id]) { c.st = 'processing'; c.msg = '이미 Kling 이 만드는 중입니다 — 이어서 확인합니다'; } });
    var external = (vid.tasks || []).filter(function (t) { return !cells.some(function (c) { return c.id === t.id; }); }).length;
    var onlyNo = true, stopped = false, queue = [], timer = null, retryAt = 0, closed = false;
    var d = document.createElement('dialog'); d.className = 'v2dlg'; d.style.width = 'min(1040px,96vw)';
    d.innerHTML = '<h3>' + esc(cfg.title || '영상 일괄 만들기') + '</h3>' +
      '<p class="muted" style="margin:4px 0 8px;font-size:.82rem">칸의 현재 이미지를 시작 프레임으로 Kling 영상을 여러 개 동시에 만듭니다. 프롬프트는 칸마다 기본 프롬프트를 쓰고, 아래 "추가 요청"은 모두에 덧붙습니다. 완료된 영상은 <b>미리보기</b>로 모이고, 마음에 드는 것만 "적용"하세요(적용하지 않은 영상은 창을 닫을 때 삭제됩니다). 진행 확인은 이 창이 열려 있는 동안만 합니다.</p>' +
      '<div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><label class="muted">품질 <select id="bvQ"><option value="std">표준 (720p)</option><option value="pro">고화질 (1080p)</option><option value="4k">초고화질 (4K)</option></select></label>' +
      '<label class="muted">동작·감정 <select id="bvA">' + C.motionOptions() + '</select></label><label class="muted">길이 <select id="bvD"><option value="5">5초</option><option value="10">10초</option><option value="15">15초</option></select></label>' +
      '<label class="muted">동시 <select id="bvC"><option>1</option><option>2</option><option>3</option><option selected>4</option><option>5</option></select>개</label>' +
      '<label class="muted" style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="bvNo" checked> 영상 없는 칸만 보기</label>' +
      '<button type="button" id="bvAll">보이는 칸 모두 선택</button><button type="button" id="bvNone">선택 해제</button></div>' +
      '<label class="muted" style="display:block;margin-top:6px">추가 요청 (선택 · 영어 · 모든 영상에 덧붙음)<input id="bvX" maxlength="300" style="width:100%" placeholder="예: slower camera movement"></label>' +
      '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn" id="bvGo">선택한 칸 영상 만들기</button><button type="button" id="bvStop" disabled>새로 보내기 중지</button><button type="button" class="btn gold" id="bvApplyAll" disabled>완료된 영상 모두 적용</button><span class="muted" id="bvSum" style="font-size:.82rem"></span></div>' +
      '<div class="bv-bar"><i id="bvBar"></i></div><div id="bvList" class="bv-grid"></div>' +
      '<div class="row" style="gap:8px;margin-top:8px"><button type="button" id="bvClose">닫기</button></div>';
    document.body.appendChild(d); d.showModal();
    var q = function (s) { return d.querySelector(s); };
    var live = function (c) { return c.st === 'sending' || c.st === 'processing'; };
    function liveCount() { return cells.filter(live).length + external; }
    function limit() { return Number(q('#bvC').value) || 4; }
    function visible() { return cells.filter(function (c) { return !onlyNo || !c.hasVideo || c.st !== 'idle'; }); }
    function stText(c) { return { idle: '', queued: '대기 중', sending: '시작 프레임 올리는 중…', processing: 'Kling 이 만드는 중… ', ready: '완료 — 미리보기', failed: '실패', applied: '적용됨' }[c.st] + (c.st === 'processing' && c.n ? (c.n * 8) + '초' : '') + (c.msg ? ' ' + c.msg : ''); }
    function render() {
      var list = visible();
      q('#bvList').innerHTML = list.map(function (c) {
        var cls = c.st === 'ready' || c.st === 'applied' ? 'ok' : c.st === 'failed' ? 'err' : '';
        var body = '<div class="bv-th" data-i="' + cells.indexOf(c) + '" style="background-image:url(\'' + esc(c.imageUrl) + '\')"></div>';
        if (c.st === 'ready' && c.pv) body = '<video src="' + esc(c.pv.url) + '" poster="' + esc(c.imageUrl) + '" controls muted loop playsinline preload="metadata"></video>';
        var act = c.st === 'ready' ? '<div class="row" style="gap:4px"><button type="button" class="btn gold bv-ap" data-i="' + cells.indexOf(c) + '">적용</button><button type="button" class="bv-no" data-i="' + cells.indexOf(c) + '">버리기</button></div>' : '';
        return '<div class="bv-c' + (c.sel ? ' sel' : '') + '">' + body + '<label class="muted" style="font-size:.74rem;display:flex;gap:4px;align-items:center"><input type="checkbox" class="bv-ck" data-i="' + cells.indexOf(c) + '"' + (c.sel ? ' checked' : '') + (c.st === 'idle' || c.st === 'failed' ? '' : ' disabled') + '> ' + esc(c.label) + (c.hasVideo ? ' ▶' : '') + '</label><div class="bv-st ' + cls + '">' + esc(stText(c)) + '</div>' + act + '</div>';
      }).join('') || '<p class="muted">표시할 칸이 없습니다(이미지가 있는 칸만 대상입니다).</p>';
      [].forEach.call(q('#bvList').querySelectorAll('.bv-ck'), function (b) { b.onchange = function () { cells[+b.dataset.i].sel = b.checked; sum(); render(); }; });
      [].forEach.call(q('#bvList').querySelectorAll('.bv-th'), function (b) { b.onclick = function () { var c = cells[+b.dataset.i]; if (c.st === 'idle' || c.st === 'failed') { c.sel = !c.sel; sum(); render(); } }; });
      [].forEach.call(q('#bvList').querySelectorAll('.bv-ap'), function (b) { b.onclick = function () { applyOne(cells[+b.dataset.i]); }; });
      [].forEach.call(q('#bvList').querySelectorAll('.bv-no'), function (b) { b.onclick = function () { discard(cells[+b.dataset.i]); }; });
      sum();
    }
    function sum() {
      var sel = cells.filter(function (c) { return c.sel && (c.st === 'idle' || c.st === 'failed'); }).length, done = cells.filter(function (c) { return c.st === 'ready' || c.st === 'applied' || c.st === 'failed'; }).length, total = cells.filter(function (c) { return c.st !== 'idle'; }).length;
      var ready = cells.filter(function (c) { return c.st === 'ready'; }).length, lv = cells.filter(live).length, qd = cells.filter(function (c) { return c.st === 'queued'; }).length;
      q('#bvSum').textContent = '선택 ' + sel + '칸' + (total ? ' · 진행 ' + done + ' / ' + total + ' (만드는 중 ' + lv + ' · 대기 ' + qd + ' · 미리보기 ' + ready + ')' : '');
      q('#bvBar').style.width = (total ? Math.round(done / total * 100) : 0) + '%';
      q('#bvApplyAll').disabled = !ready; q('#bvStop').disabled = !(qd || lv) || stopped;
    }
    // ── 보내기 · 확인
    function submit(c) {
      c.st = 'sending'; c.msg = ''; render();
      var ex = (C.motionText(q('#bvA').value) + ' ' + q('#bvX').value.trim()).trim();
      jpegOf(c.imageUrl).then(function (b) { return upFile(b, 'bstart-' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '.jpg'); })
        .then(function (k) { var b = Object.assign({}, c.body, { startKey: k, mode: q('#bvQ').value, duration: Number(q('#bvD').value) }); if (ex) b.extra = ex; return post('/api/panel-video', b); })
        .then(function () { c.st = 'processing'; c.n = 0; render(); })
        .catch(function (e) { if (RETRY.test(e.message || '') && !stopped) { c.st = 'queued'; c.msg = '— 동시 한도라 잠시 후 다시 보냅니다'; queue.push(c); retryAt = Date.now() + 15000; } else { c.st = 'failed'; c.msg = '— ' + e.message; } render(); });
    }
    function pump() {
      if (stopped || closed) return;
      while (queue.length && liveCount() < limit() && Date.now() >= retryAt) submit(queue.shift());
      sum();
    }
    function poll() {
      cells.filter(function (c) { return c.st === 'processing'; }).forEach(function (c) {
        c.n++;
        C.api('/api/panel-video?id=' + encodeURIComponent(c.id)).then(function (r) {
          if (closed) return;
          if (r.status === 'processing') { if (c.n > MAX_WAIT) { c.st = 'failed'; c.msg = '— 너무 오래 걸립니다. 나중에 이 창을 다시 열면 이어서 확인합니다'; } render(); return; }
          if (r.status === 'done') { c.st = 'ready'; c.pv = { key: r.preview, url: r.video }; c.msg = ''; } else { c.st = 'failed'; c.msg = '— ' + (r.error || '알 수 없는 오류'); }
          render();
        }).catch(function (e) { if (/없습니다|404/.test(e.message || '')) { c.st = 'failed'; c.msg = '— ' + e.message; render(); } });
      });
      pump();
    }
    timer = setInterval(poll, TICK);
    // ── 적용 · 버리기
    function applyOne(c) {
      if (!c.pv || c.busy) return Promise.resolve(); if (c.hasVideo && !confirm(c.label + ': 현재 영상을 새 영상으로 교체합니다. 이전 영상은 삭제됩니다. 계속할까요?')) return Promise.resolve();
      c.busy = true; c.msg = '적용 중…'; render();
      return c.apply(c.pv.key).then(function () { c.st = 'applied'; c.hasVideo = true; c.pv = null; c.msg = ''; }).catch(function (e) { c.msg = '— 적용 실패: ' + e.message; toast(e.message, true); }).then(function () { c.busy = false; render(); });
    }
    function discard(c) { if (c.pv) { C.api('/api/clipfile?k=' + encodeURIComponent(c.pv.key), { method: 'DELETE' }).catch(function () { }); } c.pv = null; c.st = 'idle'; c.msg = ''; render(); }
    // ── 버튼
    q('#bvNo').onchange = function () { onlyNo = this.checked; render(); };
    q('#bvAll').onclick = function () { visible().forEach(function (c) { if (c.st === 'idle' || c.st === 'failed') c.sel = true; }); render(); };
    q('#bvNone').onclick = function () { cells.forEach(function (c) { c.sel = false; }); render(); };
    q('#bvGo').onclick = function () {
      var sel = cells.filter(function (c) { return c.sel && (c.st === 'idle' || c.st === 'failed'); }); if (!sel.length) { toast('만들 칸을 먼저 선택하세요'); return; }
      var withV = sel.filter(function (c) { return c.hasVideo; }).length;
      if (!confirm(sel.length + '편을 ' + q('#bvD').value + '초 · ' + q('#bvQ').options[q('#bvQ').selectedIndex].text + '로 만듭니다(동시 ' + limit() + '개).\n편마다 Kling 크레딧이 사용됩니다(Kling 콘솔의 Deduction Details 에서 편당 차감량을 확인할 수 있습니다).' + (withV ? '\n이 중 ' + withV + '칸은 이미 영상이 있으며, 새 영상은 미리보기로만 만들어지고 "적용"을 눌러야 교체됩니다.' : '') + '\n계속할까요?')) return;
      stopped = false; sel.forEach(function (c) { c.st = 'queued'; c.msg = ''; queue.push(c); }); render(); pump();
    };
    q('#bvStop').onclick = function () { stopped = true; queue.forEach(function (c) { c.st = 'idle'; c.msg = ''; }); queue = []; render(); toast('새로 보내기를 멈췄습니다. 이미 시작한 영상은 계속 확인합니다'); };
    q('#bvApplyAll').onclick = function () {
      var ready = cells.filter(function (c) { return c.st === 'ready'; }); if (!ready.length || !confirm('미리보기가 끝난 ' + ready.length + '편을 모두 적용합니다. 영상이 있던 칸의 이전 영상은 삭제됩니다. 계속할까요?')) return;
      q('#bvApplyAll').disabled = true; var chain = Promise.resolve(); ready.forEach(function (c) { chain = chain.then(function () { c.hasVideo = false; return applyOne(c); }); });
    };
    function finish() {
      closed = true; clearInterval(timer);
      cells.forEach(function (c) { if (c.pv) C.api('/api/clipfile?k=' + encodeURIComponent(c.pv.key), { method: 'DELETE' }).catch(function () { }); });
      d.remove(); if (cfg.onClose) cfg.onClose();
    }
    q('#bvClose').onclick = function () {
      var ready = cells.filter(function (c) { return c.st === 'ready'; }).length, lv = cells.filter(live).length + queue.length;
      if (ready && !confirm('적용하지 않은 미리보기 ' + ready + '편은 삭제됩니다. 닫을까요?')) return;
      if (lv && !confirm('아직 ' + lv + '편이 진행·대기 중입니다. 닫으면 결과 확인이 멈춥니다(Kling 쪽은 계속 만들며 크레딧은 이미 사용됨). 나중에 이 창을 다시 열면 3시간 안에는 이어서 확인합니다. 닫을까요?')) return;
      d.close();
    };
    d.addEventListener('close', function () { if (!closed) finish(); }); d.addEventListener('cancel', function (e) { e.preventDefault(); q('#bvClose').click(); });
    render();
  }
  window.V2Batch = { open: open };
})();
