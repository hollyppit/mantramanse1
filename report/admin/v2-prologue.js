/* 관리자 챕터 관리 → 도입 → "프롤로그 영상": 무빙툰 시작 전에 나오는 프롤로그 영상(남·여)을 올린다. 올리면 텍스트 프롤로그 대신 이 영상이 나온다(해당 성별 영상이 없으면 기존 텍스트 프롤로그). */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, G = { d: { on: true, M: '', F: '' }, busy: false };
  function mount(box) {
    box.innerHTML = '<div class="card"><p class="muted">불러오는 중…</p></div>';
    C.api('/api/prologue').then(function (d) { G.d = { on: d.on !== false, M: d.M || '', F: d.F || '' }; draw(box); }).catch(function (e) { box.innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p></div>'; });
  }
  function slot(g, label) {
    var u = G.d[g];
    return '<div class="card" style="background:var(--bg)"><b>' + label + '</b>' +
      (u ? '<video src="' + esc(u) + '" controls muted playsinline preload="metadata" style="display:block;width:100%;max-width:300px;margin:8px 0;border-radius:8px;background:#000"></video><p class="muted" style="font-size:.8rem;word-break:break-all">' + esc(u) + '</p>'
        : '<p class="muted" style="margin:8px 0">아직 영상이 없습니다 — 이 성별은 기존 텍스트 프롤로그가 나옵니다.</p>') +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><input type="file" data-up="' + g + '" accept="video/mp4,video/webm,video/quicktime"><button type="button" data-rm="' + g + '"' + (u ? '' : ' disabled') + '>영상 빼기</button></div><p class="muted" data-msg="' + g + '" style="font-size:.8rem;margin-top:6px"></p></div>';
  }
  function draw(box) {
    box.innerHTML = '<div class="card"><b style="color:var(--gold)">프롤로그 영상</b><p class="muted" style="margin:6px 0 10px">무빙툰 시작 전에 나오는 프롤로그입니다. 영상을 올리면 <b>텍스트 프롤로그 대신</b> 이 영상이 재생되고, 끝나면(또는 건너뛰면) 바로 본문이 시작됩니다. 남성·여성 영상을 따로 올립니다. 파일은 90MB 이하 mp4·webm, 소리는 꺼진 채 시작해 "소리 켜기"로 켤 수 있습니다.</p>' +
      '<label class="muted" style="display:flex;gap:6px;align-items:center;margin-bottom:10px"><input type="checkbox" id="prOn"' + (G.d.on ? ' checked' : '') + '> 프롤로그 영상 사용</label><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px">' + slot('M', '프롤로그 · 남성') + slot('F', '프롤로그 · 여성') + '</div></div>';
    box.querySelector('#prOn').onchange = function () { G.d.on = this.checked; save('').catch(function () { }); };
    [].forEach.call(box.querySelectorAll('[data-up]'), function (i) { i.onchange = function () { if (i.files[0]) upload(box, i.dataset.up, i.files[0]); }; });
    [].forEach.call(box.querySelectorAll('[data-rm]'), function (b) { b.onclick = function () { if (!confirm('이 성별의 프롤로그 영상을 뺍니다. 계속할까요?')) return; G.d[b.dataset.rm] = ''; save('').then(function () { draw(box); }).catch(function () { }); }; });
  }
  function save(msg) {
    return C.api('/api/prologue', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(G.d) })
      .then(function (r) { if (msg) toast(msg); return r; }).catch(function (e) { toast(e.message, true); throw e; });
  }
  function upload(box, g, file) {
    if (G.busy) return; var m = box.querySelector('[data-msg="' + g + '"]'); G.busy = true; m.textContent = '올리는 중… (' + Math.round(file.size / 1048576) + 'MB, 잠시 기다려 주세요)';
    C.api('/api/clipfile?name=' + encodeURIComponent('prologue-' + g + '-' + file.name), { method: 'POST', headers: { 'content-type': file.type || 'video/mp4' }, body: file })
      .then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); G.d[g] = '/api/clipfile?k=' + r.key; return save('프롤로그 영상을 저장했습니다'); })
      .then(function () { G.busy = false; draw(box); })
      .catch(function (e) { G.busy = false; m.textContent = '실패: ' + e.message; toast(e.message, true); });
  }
  window.V2Prologue = { mount: mount };
})();
