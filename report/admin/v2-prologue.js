/* 관리자 챕터 관리 → 도입 → "프롤로그 영상": 무빙툰 시작 전에 나오는 프롤로그 영상(남·여)을 올린다. 올리면 텍스트 프롤로그 대신 이 영상이 나온다(해당 성별 영상이 없으면 기존 텍스트 프롤로그). */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, G = { d: { on: true, M: '', F: '', worlds: {} }, target: '', busy: false };
  var TOPICS = [['', '공통 프롤로그'], ['w1', '본래의 나'], ['w2', '재물운'], ['w7', '커리어운'], ['w3', '인연운'], ['w4', '운의 흐름'], ['w5', '기억 너머의 문'], ['w6', '개운법']];
  function current() { if (!G.target) return G.d; return G.d.worlds[G.target] || (G.d.worlds[G.target] = { M: '', F: '' }); }
  function mount(box) {
    box.innerHTML = '<div class="card"><p class="muted">불러오는 중…</p></div>';
    Promise.all([C.api('/api/prologue'), C.api('/api/worlds')]).then(function (results) { var d=results[0]; G.d = { on: d.on !== false, M: d.M || '', F: d.F || '', worlds: d.worlds || {} }; draw(box); }).catch(function (e) { box.innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p></div>'; });
  }
  function slot(g, label) {
    var u = current()[g];
    return '<div class="card" style="background:var(--bg)"><b>' + label + '</b>' +
      (u ? '<video src="' + esc(u) + '" controls muted playsinline preload="metadata" style="display:block;width:100%;max-width:300px;margin:8px 0;border-radius:8px;background:#000"></video><p class="muted" style="font-size:.8rem;word-break:break-all">' + esc(u) + '</p>'
        : '<p class="muted" style="margin:8px 0">' + (G.target ? '주제 영상이 없으면 선택한 안내자의 공통 영상을 사용합니다. 공통 영상도 없으면 바로 본문으로 이어집니다.' : '아직 공통 영상이 없습니다.') + '</p>') +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><input type="file" data-up="' + g + '" accept="video/mp4,video/webm,video/quicktime"><button type="button" data-rm="' + g + '"' + (u ? '' : ' disabled') + '>영상 빼기</button></div><p class="muted" data-msg="' + g + '" style="font-size:.8rem;margin-top:6px"></p></div>';
  }
  function draw(box) {
    var label = TOPICS.filter(function (t) { return t[0] === G.target; })[0][1];
    box.innerHTML = '<div class="card"><b style="color:var(--gold)">프롤로그 영상</b><p class="muted" style="margin:6px 0 10px">운명 감찰관·명운 해독관 영상을 각각 올리세요. 공통 프롤로그는 무음으로, 시작 0.6초 페이드인·마지막 0.6초 페이드아웃으로 재생됩니다. 영상이 끝나거나 건너뛰면 본문이 시작됩니다. 파일은 90MB 이하 mp4·webm·mov입니다. 업로드와 영상 빼기는 자동 저장됩니다.</p>' +
      '<label class="muted" style="display:flex;gap:6px;align-items:center;margin-bottom:10px"><input type="checkbox" id="prOn"' + (G.d.on ? ' checked' : '') + '> 전체 프롤로그 영상 사용</label>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:12px">' + slot('M', esc(label) + ' · 운명 감찰관') + slot('F', esc(label) + ' · 명운 해독관') + '</div></div>';
    [].forEach.call(box.querySelectorAll('video'), function (v) { v.muted = true; v.defaultMuted = true; v.volume = 0; v.onvolumechange = function () { if (!v.muted) v.muted = true; if (v.volume !== 0) v.volume = 0; }; });
    box.querySelector('#prOn').onchange = function () { G.d.on = this.checked; save('').catch(function () { }); };
    [].forEach.call(box.querySelectorAll('[data-up]'), function (i) { i.onchange = function () { if (i.files[0]) upload(box, i.dataset.up, i.files[0]); }; });
    [].forEach.call(box.querySelectorAll('[data-rm]'), function (b) { b.onclick = function () { if (G.busy || !confirm(label + '의 해당 안내자 영상 연결을 뺍니다. 계속할까요?')) return; var record = current(), old = record[b.dataset.rm]; record[b.dataset.rm] = ''; G.busy = true; save('').then(function () { G.busy = false; draw(box); }).catch(function () { record[b.dataset.rm] = old; G.busy = false; draw(box); }); }; });
  }
  function save(msg) {
    return C.api('/api/prologue', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(G.d) })
      .then(function (r) { if (msg) toast(msg); return r; }).catch(function (e) { toast(e.message, true); throw e; });
  }
  function upload(box, g, file) {
    if (G.busy) return;
    if (file.size > 90 * 1048576 || !/\.(mp4|webm|mov)$/i.test(file.name)) { toast('90MB 이하 mp4·webm·mov 파일을 선택해 주세요', true); return; }
    var m = box.querySelector('[data-msg="' + g + '"]'), record = current(), old = record[g]; G.busy = true; m.textContent = '올리는 중… (' + Math.round(file.size / 1048576) + 'MB, 잠시 기다려 주세요)';
    C.api('/api/clipfile?name=' + encodeURIComponent('prologue-' + (G.target || 'common') + '-' + g + '-' + file.name), { method: 'POST', headers: { 'content-type': file.type || 'video/mp4' }, body: file })
      .then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); record[g] = '/api/clipfile?k=' + r.key; return save('프롤로그 영상을 저장했습니다'); })
      .then(function () { G.busy = false; draw(box); })
      .catch(function (e) { record[g] = old; G.busy = false; m.textContent = '실패: ' + e.message; toast(e.message, true); });
  }
  window.V2Prologue = { mount: mount, selectWorld: function() { G.target=''; } };
})();
