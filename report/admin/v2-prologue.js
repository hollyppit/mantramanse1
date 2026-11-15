/* 관리자 > 프롤로그: 무빙툰(유료 주제) 시작 전에 나오는 안내자 프롤로그. 공통 + 주제별로, 운명 감찰관(M)·명운 해독관(F) 각각 영상·이미지를 올린다.
   사용자가 입력 전에 고른 안내자에 맞는 것이 나온다. 찾는 순서: 그 주제 → 공통. 영상이 있으면 영상(이미지는 로딩 중 포스터), 이미지만 있으면 정해진 시간 동안 이미지. 둘 다 없으면 바로 본문. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, G = { d: { on: true, M: '', F: '', MI: '', FI: '', imgSec: 6, worlds: {} }, target: '', busy: false, topics: null };
  var TOPICS = [['w1', '종합풀이'], ['w2', '재물운'], ['w7', '커리어운'], ['w3', '인연운'], ['w8', '건강 및 사고수'], ['w5', '전생 체험'], ['w6', '개운법']];
  var GUIDE = { M: '운명 감찰관', F: '명운 해독관' };
  function topics() { return [['', '공통 프롤로그']].concat(G.topics && G.topics.length ? G.topics : TOPICS); }
  function current() { if (!G.target) return G.d; return G.d.worlds[G.target] || (G.d.worlds[G.target] = { M: '', F: '', MI: '', FI: '' }); }
  function mount(box) {
    box.innerHTML = '<div class="card"><p class="muted">불러오는 중…</p></div>';
    Promise.all([C.api('/api/prologue'), C.api('/api/worlds').catch(function () { return null; })]).then(function (results) {
      var d = results[0], w = results[1] && results[1].worlds;
      G.d = { on: d.on !== false, M: d.M || '', F: d.F || '', MI: d.MI || '', FI: d.FI || '', imgSec: +d.imgSec || 6, worlds: d.worlds || {} };
      if (Array.isArray(w) && w.length) G.topics = w.filter(function (x) { return x && /^w\d{1,2}$/.test(x.id); }).map(function (x) { return [x.id, (x.name || x.id) + (x.enabled === false ? ' (비공개)' : '')]; });
      if (G.target && !topics().some(function (t) { return t[0] === G.target; })) G.target = '';
      draw(box);
    }).catch(function (e) { box.innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p></div>'; });
  }
  function filled(rec) { return rec && (rec.M || rec.F || rec.MI || rec.FI); }
  function slot(g) {
    var rec = current(), v = rec[g], im = rec[g + 'I'], common = G.target ? G.d : null;
    var fall = G.target ? (common[g] || common[g + 'I'] ? '비어 있으면 공통 프롤로그(' + GUIDE[g] + ')를 씁니다.' : '비어 있고 공통도 없으면 바로 본문으로 이어집니다.') : '비어 있으면 주제 프롤로그가 없는 주제는 바로 본문으로 이어집니다.';
    return '<div class="card" style="background:var(--bg)"><b>' + esc(GUIDE[g]) + '</b>' +
      '<p class="muted" style="margin:6px 0 10px;font-size:.8rem">' + (v ? '영상이 나오고, 이미지는 영상이 뜨기 전 포스터로 쓰입니다.' : im ? '영상이 없어 이미지가 ' + G.d.imgSec + '초 동안 나옵니다.' : fall) + '</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">' +
      '<div><p style="margin:0 0 6px;font-weight:600">영상</p>' + (v ? '<video src="' + esc(v) + '" controls muted playsinline preload="metadata" poster="' + esc(im || '') + '" style="display:block;width:100%;max-height:220px;border-radius:8px;background:#000"></video>' : '<div class="muted" style="height:120px;display:grid;place-items:center;border:1px dashed #444;border-radius:8px;font-size:.8rem">영상 없음</div>') +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><input style="max-width:100%" type="file" data-up="' + g + '" accept="video/mp4,video/webm,video/quicktime"><button type="button" data-rm="' + g + '"' + (v ? '' : ' disabled') + '>영상 빼기</button></div></div>' +
      '<div><p style="margin:0 0 6px;font-weight:600">이미지</p>' + (im ? '<img src="' + esc(im) + '" alt="" style="display:block;width:100%;max-height:220px;object-fit:contain;border-radius:8px;background:#000">' : '<div class="muted" style="height:120px;display:grid;place-items:center;border:1px dashed #444;border-radius:8px;font-size:.8rem">이미지 없음</div>') +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><input style="max-width:100%" type="file" data-up="' + g + 'I" accept="image/png,image/jpeg,image/webp,image/avif"><button type="button" data-rm="' + g + 'I"' + (im ? '' : ' disabled') + '>이미지 빼기</button></div></div>' +
      '</div><p class="muted" data-msg="' + g + '" style="font-size:.8rem;margin-top:6px"></p><p class="muted" data-msg="' + g + 'I" style="font-size:.8rem;margin-top:2px"></p></div>';
  }
  function draw(box) {
    var label = (topics().filter(function (t) { return t[0] === G.target; })[0] || ['', '공통 프롤로그'])[1];
    var chips = topics().map(function (t) { var rec = t[0] ? G.d.worlds[t[0]] : G.d; return '<button type="button" class="pjc' + (t[0] === G.target ? ' on' : '') + '" data-topic="' + esc(t[0]) + '" style="padding:6px 12px">' + esc(t[1]) + (filled(rec) ? ' ●' : '') + '</button>'; }).join('');
    box.innerHTML = '<div class="card"><b style="color:var(--gold)">안내자 프롤로그 (영상·이미지)</b><p class="muted" style="margin:6px 0 10px">유료 주제에 들어가면 사용자가 입력 전에 고른 안내자(운명 감찰관·명운 해독관)의 프롤로그가 나옵니다. 주제마다 따로 올릴 수 있고, 주제에 없으면 공통 프롤로그를 씁니다. 영상은 무음으로 시작·끝 0.6초 페이드, 이미지는 서서히 나타나 천천히 다가온 뒤 사라집니다. 영상 90MB 이하 mp4·webm·mov, 이미지 15MB 이하 png·jpg·webp·avif. 올리기·빼기는 바로 저장됩니다(운영에 바로 반영).</p>' +
      '<div class="row" style="gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><label class="muted" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="prOn"' + (G.d.on ? ' checked' : '') + '> 프롤로그 사용</label><label class="muted" style="display:flex;gap:6px;align-items:center">이미지만 있을 때 보여 주는 시간 <input type="number" id="prSec" min="2" max="30" value="' + esc(G.d.imgSec) + '" style="width:64px">초</label></div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0 12px" role="tablist" aria-label="주제">' + chips + '</div>' +
      '<p style="margin:0 0 8px"><b>' + esc(label) + '</b>' + (G.target ? ' <a class="muted" target="_blank" rel="noopener" href="/report/v2/?from=hub&amp;world=' + esc(G.target) + '">사용자 화면 열기 ↗</a>' : '') + '</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:10px">' + slot('M') + slot('F') + '</div></div>';
    [].forEach.call(box.querySelectorAll('video'), function (v) { // 올린 영상이 실제로 재생되는지 표시(해상도·길이, 실패 시 이유)
      v.muted = true; v.defaultMuted = true; v.volume = 0; v.onvolumechange = function () { if (!v.muted) v.muted = true; if (v.volume !== 0) v.volume = 0; };
      var st = document.createElement('p'); st.className = 'muted'; st.style.cssText = 'font-size:.8rem;margin:4px 0 0'; st.textContent = '영상 확인 중…'; v.insertAdjacentElement('afterend', st);
      v.addEventListener('loadedmetadata', function () { st.style.color = '#7FE0BC'; st.textContent = '✓ 재생 가능 · ' + v.videoWidth + '×' + v.videoHeight + ' · ' + (isFinite(v.duration) ? v.duration.toFixed(1) + '초' : '길이 알 수 없음'); });
      v.addEventListener('error', function () { st.style.color = '#FF9C8C'; st.textContent = '✕ 불러오기 실패 — 확인 중…'; var u = v.getAttribute('src'); (window.fetch ? fetch(u, { headers: { range: 'bytes=0-1' }, cache: 'no-store' }).then(function (r) { return r.status; }, function () { return 0; }) : Promise.resolve(0)).then(function (s) { st.textContent = '✕ 불러오기 실패 — ' + (s === 404 ? '파일이 저장소에 없습니다 (404)' : s && s < 300 ? '이 브라우저에서 재생할 수 없는 형식입니다 (코덱 확인)' : s ? '서버 응답 ' + s : '주소에 접근할 수 없습니다'); }); });
    });
    [].forEach.call(box.querySelectorAll('[data-topic]'), function (b) { b.onclick = function () { if (G.busy) return; G.target = b.dataset.topic; draw(box); }; });
    box.querySelector('#prOn').onchange = function () { G.d.on = this.checked; save('').catch(function () { }); };
    box.querySelector('#prSec').onchange = function () { var n = Math.round(+this.value); if (!(n >= 2 && n <= 30)) { toast('2~30초 사이로 넣어 주세요', true); this.value = G.d.imgSec; return; } G.d.imgSec = n; save('이미지 시간을 저장했습니다').then(function () { draw(box); }).catch(function () { }); };
    [].forEach.call(box.querySelectorAll('[data-up]'), function (i) { i.onchange = function () { if (i.files[0]) upload(box, i.dataset.up, i.files[0]); }; });
    [].forEach.call(box.querySelectorAll('[data-rm]'), function (b) { b.onclick = function () { var k = b.dataset.rm, img = /I$/.test(k); if (G.busy || !confirm(label + ' · ' + GUIDE[k[0]] + ' ' + (img ? '이미지' : '영상') + ' 연결을 뺍니다. 계속할까요?')) return; var record = current(), old = record[k]; record[k] = ''; G.busy = true; save('').then(function () { G.busy = false; draw(box); }).catch(function () { record[k] = old; G.busy = false; draw(box); }); }; });
  }
  function save(msg) {
    return C.api('/api/prologue', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(G.d) })
      .then(function (r) { if (msg) toast(msg); return r; }).catch(function (e) { toast(e.message, true); throw e; });
  }
  function upload(box, k, file) {
    if (G.busy) return;
    var img = /I$/.test(k);
    if (img ? (file.size > 15 * 1048576 || !/\.(png|jpe?g|webp|avif)$/i.test(file.name)) : (file.size > 90 * 1048576 || !/\.(mp4|webm|mov)$/i.test(file.name))) { toast(img ? '15MB 이하 png·jpg·webp·avif 이미지를 선택해 주세요' : '90MB 이하 mp4·webm·mov 파일을 선택해 주세요', true); return; }
    var m = box.querySelector('[data-msg="' + k + '"]'), record = current(), old = record[k]; G.busy = true; m.textContent = '올리는 중… (' + Math.max(1, Math.round(file.size / 1048576)) + 'MB, 잠시 기다려 주세요)';
    C.api('/api/clipfile?name=' + encodeURIComponent('prologue-' + (G.target || 'common') + '-' + k + '-' + file.name), { method: 'POST', headers: { 'content-type': file.type || (img ? 'image/webp' : 'video/mp4') }, body: file })
      .then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); record[k] = '/api/clipfile?k=' + r.key; return save(img ? '프롤로그 이미지를 저장했습니다' : '프롤로그 영상을 저장했습니다'); })
      .then(function () { G.busy = false; draw(box); })
      .catch(function (e) { record[k] = old; G.busy = false; m.textContent = '실패: ' + e.message; toast(e.message, true); });
  }
  window.V2Prologue = { mount: mount, selectWorld: function (w) { G.target = typeof w === 'string' && /^w\d{1,2}$/.test(w) ? w : ''; } };
})();
