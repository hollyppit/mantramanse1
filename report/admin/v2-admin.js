/* 관리자 v2: 미디어 라이브러리 · 일주 캐릭터 영상(120) 탭.  admin/index.html 의 탭 핸들러가 V2Admin.open('media'|'awk', 비밀번호) 를 부른다.
   API: /api/media (목록·저장·AI 태그 추천) · /api/awakening (영상 매핑) · /api/clipfile (R2 파일). 새 명리 계산은 없다. */
(function () {
  'use strict';
  var R = window.ReportV2, TAX = R.Scenes.TAX, PW = '', $ = function (s, e) { return (e || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var LBL = { element: 'ELEMENT 오행', state: 'STATE 상태', emotion: 'EMOTION 감정', scene: 'SCENE 장면', theme: 'THEME 주제', action: 'ACTION 행동', role: 'VISUAL ROLE' };
  var TYPE_KO = { image: '이미지', video: '영상', videoLoop: '루프 영상', backgroundVideo: '배경 영상', character: '캐릭터 컷', symbol: '상징 장면', transition: '전환용', chapterCover: '챕터 커버' };
  var FIELD = { element: 'elementTags', state: 'stateTags', emotion: 'emotionTags', scene: 'sceneTags', theme: 'themeTags', action: 'actionTags', role: 'visualRole' };

  function api(path, opt) {
    opt = opt || {}; opt.headers = Object.assign({ authorization: 'Bearer ' + PW }, opt.headers || {});
    return fetch(path, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || ('오류 ' + r.status)); return d; }); });
  }
  function toast(msg, bad) {
    var t = document.createElement('div'); t.textContent = msg; t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;padding:10px 16px;border-radius:8px;background:' + (bad ? '#4A1F1F' : '#16301F') + ';color:#fff;border:1px solid ' + (bad ? '#FF8A78' : '#62C2AE') + ';max-width:90vw';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3500);
  }
  var mediaUrl = function (k) { return '/api/clipfile?k=' + encodeURIComponent(k); };

  /* ── 업로드: 진행률 표시 XHR. 서버가 영상 90MB·이미지 15MB 로 제한 ───────────────────── */
  function upload(file, name, onProg) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest(); x.open('POST', '/api/clipfile?name=' + encodeURIComponent(name || file.name)); x.setRequestHeader('authorization', 'Bearer ' + PW);
      x.upload.onprogress = function (e) { if (onProg && e.lengthComputable) onProg(e.loaded / e.total); };
      x.onload = function () { var d = {}; try { d = JSON.parse(x.responseText); } catch (e) { } if (x.status < 300 && d.key) res(mediaUrl(d.key)); else rej(new Error(d.error || ('업로드 실패 ' + x.status))); };
      x.onerror = function () { rej(new Error('네트워크 오류')); }; x.send(file);
    });
  }
  // 큰 이미지는 가로 1600px webp 로 줄여 올린다(모바일 데이터 사용량). gif·작은 파일은 원본 그대로.
  function shrinkImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return Promise.resolve(file);
    return new Promise(function (res) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1600 / img.naturalWidth), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { res(b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' }) : file); }, 'image/webp', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(u); res(file); }; img.src = u;
    });
  }
  // 영상 정보 + 대표 프레임(poster) 추출
  function probeVideo(file) {
    return new Promise(function (res) {
      var v = document.createElement('video'), u = URL.createObjectURL(file); v.muted = true; v.preload = 'metadata'; v.playsInline = true;
      var done = function (o) { URL.revokeObjectURL(u); res(o || {}); };
      v.onerror = function () { done(); };
      v.onloadedmetadata = function () { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
      v.onseeked = function () {
        var s = Math.min(1, 900 / v.videoWidth), c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        var o = { duration: Math.round(v.duration * 10) / 10, orientation: v.videoHeight > v.videoWidth * 1.1 ? 'portrait' : v.videoWidth > v.videoHeight * 1.1 ? 'landscape' : 'square', dataUrl: c.toDataURL('image/jpeg', 0.8) };
        c.toBlob(function (b) { o.poster = b ? new File([b], 'poster.webp', { type: 'image/webp' }) : null; done(o); }, 'image/webp', 0.8);
      };
      v.src = u;
    });
  }
  function frameOf(a) { // AI 태깅용 이미지(dataURL). 영상이면 poster/thumbnail 이미지를 쓴다
    var src = a.type && /video|transition/i.test(a.type) ? (a.posterUrl || a.thumbnailUrl) : (a.url || a.posterUrl);
    if (!src) return Promise.reject(new Error('분석할 이미지가 없습니다(영상은 포스터가 필요합니다)'));
    return fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
      return new Promise(function (res, rej) {
        var img = new Image(), u = URL.createObjectURL(b);
        img.onload = function () { var s = Math.min(1, 768 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.8)); };
        img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('이미지를 읽지 못했습니다')); }; img.src = u;
      });
    });
  }

  var css = document.createElement('style');
  css.textContent = '.v2bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}.v2bar input[type=text],.v2bar select{width:auto;min-width:110px}.v2grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}' +
    '.v2card{background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}.v2card.off{opacity:.55}.v2card .th{aspect-ratio:9/12;background:#05060b center/cover no-repeat;position:relative;display:grid;place-items:center;color:var(--ink3)}' +
    '.v2card .th .bd{position:absolute;left:6px;top:6px;display:flex;gap:4px;flex-wrap:wrap}.v2card .bd span{font-size:.7rem;padding:1px 6px;border-radius:4px;background:#000a;color:#fff}.v2card .bd .pend{background:#7A5A10;color:#FFE6A8}' +
    '.v2card .bd2{padding:8px 10px;display:grid;gap:4px;font-size:.82rem}.v2card .acts{display:flex;gap:4px;flex-wrap:wrap;padding:0 10px 10px}.v2card .acts button{padding:2px 8px;font-size:.76rem}' +
    '.v2drop{border:2px dashed var(--line);border-radius:10px;padding:18px;text-align:center;color:var(--ink2);margin-bottom:12px}.v2drop.over{border-color:var(--gold);background:#1a1d2e}' +
    '.v2q{display:grid;gap:4px;margin:6px 0}.v2q .it{display:flex;gap:8px;align-items:center;font-size:.8rem}.v2q progress{flex:1;height:8px}' +
    '.tg{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 10px}.tg label{cursor:pointer}.tg input{display:none}.tg span{display:inline-block;padding:2px 9px;border-radius:999px;border:1px solid var(--line);font-size:.78rem;color:var(--ink2)}.tg input:checked+span{background:#2A2410;border-color:var(--gold);color:var(--gold)}' +
    '.tg.pendg span{border-style:dashed}.v2dlg{border:1px solid var(--line);border-radius:12px;background:var(--bg2);color:var(--ink);padding:18px;width:min(760px,96vw);max-height:92vh;overflow:auto}.v2dlg::backdrop{background:#000b}' +
    '.v2dlg h3{margin-bottom:10px}.v2f{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:8px 0}.v2f.two{grid-template-columns:1fr 1fr;gap:10px}.v2f.two>div{display:grid;gap:3px}' +
    '.mx{border-collapse:separate;border-spacing:3px}.mx th{font-size:.72rem;padding:2px 4px;text-align:center;border:0}.mx td{padding:0;border:0}.cellx{display:flex;border-radius:5px;overflow:hidden;border:1px solid var(--line);min-width:62px}.cellx button{flex:1;border:0;border-radius:0;padding:5px 2px;font-size:.7rem;line-height:1.2;background:#1B1F30;color:var(--ink3)}' +
    '.cellx button.ok{background:#17402F;color:#7FE0BC}.cellx button.missing{background:#2A1A1A;color:#FF9C8C}.cellx button.disabled{background:#2A2A2A;color:#999}.cellx button.error{background:#4A2A10;color:#FFC080}.cellx button.poster-only{background:#2B2B12;color:#E8DC8A}.cellx button.sel{outline:2px solid var(--gold);outline-offset:-2px}' +
    '.cellx em{font-style:normal;display:block;font-weight:700}.v2stat{display:flex;gap:18px;flex-wrap:wrap;font-size:.95rem}.v2stat b{color:var(--gold)}.v2warn{color:#FFC080}.dbg{font-size:.76rem;color:var(--ink3)}';
  document.head.appendChild(css);

  function dlg(html, wide) {
    var d = document.createElement('dialog'); d.className = 'v2dlg'; if (wide) d.style.width = 'min(1000px,96vw)'; d.innerHTML = html; document.body.appendChild(d);
    d.addEventListener('close', function () { d.remove(); }); d.showModal(); return d;
  }
  function tagPicker(kind, sel, pending, name) { // 체크 칩 선택기. pending 은 AI 추천(점선)
    return '<div class="tg' + (pending ? ' pendg' : '') + '" data-kind="' + name + '">' + TAX[kind].map(function (t) { return '<label><input type="checkbox" value="' + t + '"' + (sel.indexOf(t) >= 0 ? ' checked' : '') + '><span>' + t + '</span></label>'; }).join('') + '</div>';
  }
  var checked = function (root, kind) { return [].slice.call(root.querySelectorAll('.tg[data-kind="' + kind + '"] input:checked')).map(function (i) { return i.value; }); };

  /* ═════════════ 미디어 라이브러리 ═════════════ */
  var M = { list: [], filter: { q: '', type: '', element: '', state: '', emotion: '', scene: '', theme: '', action: '', role: '', enabled: '', pending: '' }, dirty: false, loaded: false, root: null, queue: [] };
  var rid = function () { return 'media_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); };

  function mediaOpen(root) {
    M.root = root;
    if (!root.dataset.built) {
      root.dataset.built = 1;
      root.innerHTML = '<div class="card"><div class="v2bar"><b style="color:var(--gold)">미디어 라이브러리</b><span class="muted">이미지·영상·루프·배경·캐릭터·상징·전환·챕터 커버. 태그로 의미 기반 재사용됩니다.</span><span style="flex:1"></span>' +
        '<label class="navbtn" style="cursor:pointer">파일 업로드(여러 개)<input type="file" id="mFile" multiple accept="image/*,video/mp4,video/webm,video/quicktime" hidden></label><button id="mCov">커버리지·선택 테스트</button><button class="pri" id="mSave" disabled>변경사항 저장</button></div>' +
        '<div class="v2drop" id="mDrop">여기로 이미지·영상을 끌어다 놓으세요<div class="v2q" id="mQ"></div></div>' +
        '<div class="v2bar" id="mFilters"></div><div class="muted" id="mCount"></div><div class="v2grid" id="mGrid"></div></div>';
      var drop = $('#mDrop', root);
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });
      $('#mFile', root).onchange = function (e) { addFiles(e.target.files); e.target.value = ''; };
      $('#mSave', root).onclick = mediaSave; $('#mCov', root).onclick = coverageDlg;
      buildFilters();
    }
    if (!M.loaded) api('/api/media?all=1').then(function (d) { M.list = d.media || []; M.loaded = true; mediaRender(); }).catch(function (e) { toast(e.message, true); });
    else mediaRender();
  }
  function buildFilters() {
    var f = $('#mFilters', M.root), opt = function (arr, lbl) { return '<option value="">' + lbl + '</option>' + arr.map(function (v) { return '<option value="' + v + '">' + (TYPE_KO[v] ? TYPE_KO[v] + ' (' + v + ')' : v) + '</option>'; }).join(''); };
    f.innerHTML = '<input type="text" id="fq" placeholder="파일명·제목·태그 검색">' + [['type', '타입'], ['element', '오행'], ['state', '상태'], ['emotion', '감정'], ['scene', '장면'], ['theme', '주제/챕터'], ['action', '행동'], ['role', 'Visual Role']].map(function (p) {
      return '<select data-f="' + p[0] + '">' + opt(TAX[p[0]], p[1]) + '</select>'; }).join('') + '<select data-f="enabled"><option value="">사용 여부</option><option value="1">활성</option><option value="0">비활성</option></select><select data-f="pending"><option value="">태그 승인</option><option value="1">AI 추천 승인 대기</option><option value="0">태그 없음</option></select>';
    $('#fq', f).oninput = function (e) { M.filter.q = e.target.value; mediaRender(); };
    [].forEach.call(f.querySelectorAll('select'), function (s) { s.onchange = function () { M.filter[s.dataset.f] = s.value; mediaRender(); }; });
  }
  var tagsOf = function (a) { return [].concat(a.elementTags || [], a.stateTags || [], a.emotionTags || [], a.sceneTags || [], a.themeTags || [], a.actionTags || []); };
  function filtered() {
    var F = M.filter, q = F.q.trim().toLowerCase();
    return M.list.filter(function (a) {
      if (q && (a.title + ' ' + a.description + ' ' + a.id + ' ' + tagsOf(a).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      if (F.type && a.type !== F.type) return false;
      if (F.element && (a.elementTags || []).indexOf(F.element) < 0) return false;
      if (F.state && (a.stateTags || []).indexOf(F.state) < 0) return false;
      if (F.emotion && (a.emotionTags || []).indexOf(F.emotion) < 0) return false;
      if (F.scene && (a.sceneTags || []).indexOf(F.scene) < 0) return false;
      if (F.theme && (a.themeTags || []).indexOf(F.theme) < 0 && (a.chapterTags || []).indexOf(F.theme) < 0) return false;
      if (F.action && (a.actionTags || []).indexOf(F.action) < 0) return false;
      if (F.role && (a.visualRole || []).indexOf(F.role) < 0) return false;
      if (F.enabled && (F.enabled === '1') !== (a.enabled !== false)) return false;
      if (F.pending === '1' && !(a.pending && a.pending.tags && Object.keys(a.pending.tags).some(function (k) { return a.pending.tags[k].length; }))) return false;
      if (F.pending === '0' && tagsOf(a).length) return false;
      return true;
    });
  }
  function hasPending(a) { return !!(a.pending && a.pending.tags && Object.keys(a.pending.tags).some(function (k) { return a.pending.tags[k].length; })); }
  function mediaRender() {
    var g = $('#mGrid', M.root), list = filtered();
    $('#mCount', M.root).textContent = '전체 ' + M.list.length + '개 · 표시 ' + list.length + '개' + (M.dirty ? ' · 저장되지 않은 변경 있음' : '');
    $('#mSave', M.root).disabled = !M.dirty;
    g.innerHTML = list.map(function (a) {
      var th = a.thumbnailUrl || a.posterUrl || (a.type.indexOf('video') < 0 && a.type !== 'transition' ? a.url : '');
      return '<div class="v2card' + (a.enabled === false ? ' off' : '') + '" data-id="' + esc(a.id) + '"><div class="th" style="' + (th ? 'background-image:url(\'' + esc(th) + '\')' : '') + '">' + (th ? '' : '미리보기 없음') +
        '<div class="bd"><span>' + esc(TYPE_KO[a.type] || a.type) + (a.duration ? ' · ' + a.duration + '초' : '') + '</span>' + (hasPending(a) ? '<span class="pend">AI 추천 대기</span>' : '') + ((a.chapterIds || []).length ? '<span class="pend" style="background:#124a3a;color:#9fe8cf">챕터 전용 ' + a.chapterIds.length + '</span>' : '') + (a.enabled === false ? '<span>비활성</span>' : '') + '</div></div>' +
        '<div class="bd2"><b>' + esc(a.title || '(제목 없음)') + '</b><div>' + (tagsOf(a).slice(0, 7).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') || '<span class="chip gray">태그 없음</span>') + '</div><span class="dbg">우선순위 ' + (a.priority || 0) + '</span></div>' +
        '<div class="acts"><button data-a="pv">미리보기</button><button data-a="ed">수정</button><button data-a="cp">복제</button><button data-a="tg">' + (a.enabled === false ? '활성' : '비활성') + '</button><button class="danger" data-a="rm">삭제</button></div></div>';
    }).join('') || '<p class="muted">조건에 맞는 미디어가 없습니다.</p>';
    g.onclick = function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return; var id = b.closest('.v2card').dataset.id, a = M.list.filter(function (x) { return x.id === id; })[0]; if (!a) return;
      ({ pv: function () { previewDlg(a); }, ed: function () { editDlg(a); },
        cp: function () { var c = JSON.parse(JSON.stringify(a)); c.id = rid(); c.title = (a.title || '') + ' (복사)'; M.list.unshift(c); dirty(); },
        tg: function () { a.enabled = a.enabled === false; dirty(); },
        rm: function () { if (confirm('"' + (a.title || a.id) + '" 를 삭제할까요? 저장 전까지는 되돌릴 수 있습니다(새로고침).')) { M.list = M.list.filter(function (x) { return x !== a; }); dirty(); } } })[b.dataset.a]();
    };
  }
  function dirty() { M.dirty = true; mediaRender(); }
  function mediaSave() {
    var b = $('#mSave', M.root); b.disabled = true; b.textContent = '저장 중…';
    api('/api/media', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ media: M.list }) }).then(function (d) { M.dirty = false; toast('저장했습니다 (' + d.count + '개)'); }).catch(function (e) { toast(e.message, true); }).then(function () { b.textContent = '변경사항 저장'; mediaRender(); });
  }

  /* 업로드 큐: 파일 하나씩 → (이미지) 축소 → R2 → 영상이면 포스터 추출·업로드 → 카드 생성 */
  function addFiles(files) {
    [].forEach.call(files || [], function (f) { M.queue.push(f); }); if (!M.busy) runQueue();
  }
  function runQueue() {
    var f = M.queue.shift(); if (!f) { M.busy = false; $('#mQ', M.root).innerHTML = ''; return; } M.busy = true;
    var q = $('#mQ', M.root), row = document.createElement('div'); row.className = 'it'; row.innerHTML = '<span style="min-width:150px;text-align:left">' + esc(f.name) + '</span><progress max="1" value="0"></progress><span class="st">준비</span>'; q.appendChild(row);
    var prog = row.querySelector('progress'), st = row.querySelector('.st'), isVid = /^video\//.test(f.type) || /\.(mp4|webm|mov|m4v)$/i.test(f.name);
    var a = { id: rid(), type: isVid ? 'video' : 'image', url: '', webmUrl: '', thumbnailUrl: '', posterUrl: '', title: f.name.replace(/\.\w+$/, ''), description: '', elementTags: [], stateTags: [], emotionTags: [], sceneTags: [], themeTags: [], chapterTags: [], actionTags: [], visualRole: [], orientation: 'portrait', duration: 0, loopable: false, hasAudio: false, priority: 50, enabled: true, tagsApproved: true, bytes: f.size, uploadedAt: Date.now() };
    var step = isVid ? probeVideo(f) : shrinkImage(f).then(function (s) { f = s; return {}; });
    step.then(function (info) {
      if (isVid) { a.duration = info.duration || 0; a.orientation = info.orientation || 'portrait'; }
      st.textContent = '올리는 중'; return upload(f, f.name, function (p) { prog.value = p; }).then(function (u) {
        if (/\.webm$/i.test(f.name)) a.webmUrl = u; a.url = u;
        if (isVid && info.poster) return upload(info.poster, a.title + '-poster.webp').then(function (pu) { a.posterUrl = pu; a.thumbnailUrl = pu; });
      });
    }).then(function () { st.textContent = '완료'; st.className = 'st ok'; M.list.unshift(a); dirty(); }).catch(function (e) { st.textContent = e.message; st.className = 'st err'; }).then(function () { setTimeout(runQueue, 50); });
  }

  function previewDlg(a) {
    var src = a.webmUrl || a.url, isV = /video|transition/i.test(a.type) && src;
    var d = dlg('<h3>' + esc(a.title) + '</h3>' + (isV ? '<video src="' + esc(src) + '" poster="' + esc(a.posterUrl || '') + '" controls muted playsinline ' + (a.loopable ? 'loop ' : '') + 'style="width:100%;max-height:70vh;background:#000"></video>' : '<img src="' + esc(a.url || a.posterUrl) + '" alt="' + esc(a.title) + '" style="width:100%;max-height:70vh;object-fit:contain;background:#000">') +
      '<p class="muted">' + esc(a.description) + '</p><div class="row" style="justify-content:flex-end"><button id="x">닫기</button></div>', true);
    d.querySelector('#x').onclick = function () { d.close(); };
  }

  /* 편집 화면: 파일·thumbnail·poster·type·태그 7종·priority·loop·enabled + AI 태그 추천(승인 방식) */
  function editDlg(a) {
    var p = a.pending || { tags: {}, description: '' };
    var html = '<h3>미디어 편집</h3><div class="v2f two"><div><label>제목</label><input type="text" id="eT" value="' + esc(a.title) + '"></div><div><label>타입</label><select id="eType">' + TAX.type.map(function (t) { return '<option value="' + t + '"' + (a.type === t ? ' selected' : '') + '>' + TYPE_KO[t] + ' (' + t + ')</option>'; }).join('') + '</select></div></div>' +
      '<div class="v2f"><label>설명 (어떤 상황의 표현에 쓰는지)</label><textarea id="eD">' + esc(a.description) + '</textarea></div>' +
      '<div class="v2f two"><div><label>파일 주소 (MP4/이미지)</label><input type="text" id="eU" value="' + esc(a.url) + '"></div><div><label>WebM 주소 (선택)</label><input type="text" id="eW" value="' + esc(a.webmUrl) + '"></div>' +
      '<div><label>포스터 주소</label><input type="text" id="eP" value="' + esc(a.posterUrl) + '"></div><div><label>썸네일 주소</label><input type="text" id="eTh" value="' + esc(a.thumbnailUrl) + '"></div></div>' +
      '<div class="row"><label class="navbtn" style="cursor:pointer">파일 교체<input type="file" id="eF" accept="image/*,video/*" hidden></label><label class="navbtn" style="cursor:pointer">포스터 교체<input type="file" id="ePf" accept="image/*" hidden></label><span class="muted" id="eUp"></span></div>' +
      '<div class="v2f two"><div><label>우선순위 (0~100)</label><input type="number" id="ePr" min="0" max="100" value="' + (a.priority || 0) + '"></div><div><label>길이(초) / 방향</label><div class="row"><input type="number" id="eDur" value="' + (a.duration || 0) + '" style="width:90px"><select id="eOr" style="width:auto">' + ['portrait', 'landscape', 'square'].map(function (o) { return '<option' + (a.orientation === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div></div></div>' +
      '<div class="row"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="eLoop"' + (a.loopable ? ' checked' : '') + '>루프 가능</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="eAud"' + (a.hasAudio ? ' checked' : '') + '>소리 있음</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="eEn"' + (a.enabled !== false ? ' checked' : '') + '>사용</label></div>';
    Object.keys(TAX).filter(function (k) { return k !== 'type'; }).forEach(function (k) { html += '<div class="muted" style="margin-top:8px">' + LBL[k] + '</div>' + tagPicker(k, a[FIELD[k]] || [], false, k); });
    html += '<div class="muted" style="margin-top:6px">챕터 연결 (THEME 중 이 미디어가 특히 어울리는 주제)</div>' + tagPicker('theme', a.chapterTags || [], false, 'chapter');
    var chs = (window.ReportV2 && window.V2Content) ? ReportV2.Chapters.libraryOf(V2Content.ST.saved || {}) : [], prj = {}; ((window.V2Content && ReportV2.Chapters.projects(V2Content.ST.saved || {})) || []).forEach(function (p) { prj[p.id] = p.name; });
    html += '<div class="muted" style="margin-top:8px">이 챕터에서만 쓰기 (체크하면 선택한 챕터의 후보로만 쓰입니다 · 비우면 모든 챕터가 후보로 씁니다)</div><div class="tg" data-kind="chapterIds">' + chs.map(function (c) { return '<label><input type="checkbox" value="' + esc(c.id) + '"' + ((a.chapterIds || []).indexOf(c.id) >= 0 ? ' checked' : '') + '><span>' + esc((prj[c.project] || c.project) + ' · ' + c.title) + '</span></label>'; }).join('') + '</div>';
    html += '<div class="card" style="margin-top:12px" id="eCn"><div class="row" style="justify-content:space-between"><b>시네마틱 연출 (이 클립을 쓰는 장면)</b><button type="button" id="eCnAi">AI 연출 추천</button></div><p class="muted v2cn-note" style="margin:4px 0 8px">비워 두면 기본 연출을 따릅니다.</p>' + (window.V2Cinema ? V2Cinema.fields(a.cinema) : '') + '</div>';
    html += '<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><b>AI 태그 추천</b><button id="eAi">AI로 태그 추천</button></div><div id="eAiBox">' + pendingHtml(p) + '</div></div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:14px"><button id="eCancel">취소</button><button class="pri" id="eOk">적용</button></div>';
    var d = dlg(html, true);
    function pendingHtml(pp) {
      if (!hasPending({ pending: pp })) return '<p class="muted">추천 결과가 없습니다. AI 추천은 바로 확정되지 않고, 아래에서 승인한 태그만 반영됩니다.</p>';
      var s = (pp.description ? '<div class="v2f"><label>추천 설명</label><div>' + esc(pp.description) + '</div></div>' : '');
      Object.keys(TAX).filter(function (k) { return k !== 'type'; }).forEach(function (k) { var v = (pp.tags || {})[FIELD[k]] || []; if (v.length) s += '<div class="muted">' + LBL[k] + ' — 승인할 태그 선택</div><div class="tg pendg" data-kind="p_' + k + '">' + v.map(function (t) { return '<label><input type="checkbox" value="' + t + '" checked><span>' + t + '</span></label>'; }).join('') + '</div>'; });
      return s + '<div class="row"><button id="aiAll">전체 승인</button><button id="aiSel">선택한 것만 승인</button><button class="danger" id="aiDel">추천 삭제</button></div>';
    }
    function bindPending() {
      var b = d.querySelector('#aiAll'); if (!b) return;
      function merge(only) { // 승인: 선택 태그를 본 태그 칩에 체크로 합친다(저장은 "적용" 시)
        Object.keys(TAX).filter(function (k) { return k !== 'type'; }).forEach(function (k) {
          var src = [].slice.call(d.querySelectorAll('.tg[data-kind="p_' + k + '"] input')).filter(function (i) { return only ? i.checked : true; }).map(function (i) { return i.value; });
          src.forEach(function (t) { var i = d.querySelector('.tg[data-kind="' + k + '"] input[value="' + t + '"]'); if (i) i.checked = true; });
        });
        if (p.description && !d.querySelector('#eD').value) d.querySelector('#eD').value = p.description;
        if (!only) a.chapterTags = (p.tags.chapterTags || []).slice(0, 4); p = { tags: {}, description: '' }; d.querySelector('#eAiBox').innerHTML = pendingHtml(p); toast('승인한 태그를 반영했습니다. "적용"을 눌러야 저장 목록에 들어갑니다.');
      }
      b.onclick = function () { merge(false); }; d.querySelector('#aiSel').onclick = function () { merge(true); };
      d.querySelector('#aiDel').onclick = function () { p = { tags: {}, description: '' }; d.querySelector('#eAiBox').innerHTML = pendingHtml(p); };
    }
    bindPending();
    if (window.V2Cinema) V2Cinema.bindAi(d.querySelector('#eCnAi'), d.querySelector('#eCn'), function () { return { narration: d.querySelector('#eD').value || d.querySelector('#eT').value, sceneType: 'insight', chapter: { id: '', title: '' }, media: { type: d.querySelector('#eType').value, tags: [].concat(checked(d, 'scene'), checked(d, 'emotion'), checked(d, 'action')) } }; }, api, toast);
    d.querySelector('#eAi').onclick = function () {
      var btn = this; btn.disabled = true; btn.textContent = '분석 중…';
      frameOf({ type: d.querySelector('#eType').value, url: d.querySelector('#eU').value, posterUrl: d.querySelector('#eP').value || d.querySelector('#eTh').value, thumbnailUrl: d.querySelector('#eTh').value })
        .then(function (img) { return api('/api/media', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: 'tag', image: img, title: d.querySelector('#eT').value, description: d.querySelector('#eD').value }) }); })
        .then(function (r) { var s = r.suggestion; p = { tags: s, description: s.description }; d.querySelector('#eAiBox').innerHTML = pendingHtml(p); bindPending(); toast('추천을 받았습니다. 승인한 태그만 반영됩니다.'); })
        .catch(function (e) { toast(e.message, true); }).then(function () { btn.disabled = false; btn.textContent = 'AI로 태그 추천'; });
    };
    function repl(inp, setter) {
      d.querySelector(inp).onchange = function (e) { var f = e.target.files[0]; if (!f) return; var u = d.querySelector('#eUp'); u.textContent = '올리는 중…';
        (/^image\//.test(f.type) ? shrinkImage(f) : Promise.resolve(f)).then(function (ff) { return upload(ff, ff.name); }).then(function (url) { setter(url); u.textContent = '올렸습니다'; }).catch(function (er) { u.textContent = er.message; }); };
    }
    repl('#eF', function (u) { d.querySelector('#eU').value = u; if (/\.webm/i.test(u)) d.querySelector('#eW').value = u; }); repl('#ePf', function (u) { d.querySelector('#eP').value = u; d.querySelector('#eTh').value = u; });
    d.querySelector('#eCancel').onclick = function () { d.close(); };
    d.querySelector('#eOk').onclick = function () {
      a.title = d.querySelector('#eT').value.trim(); a.type = d.querySelector('#eType').value; a.description = d.querySelector('#eD').value; a.url = d.querySelector('#eU').value.trim(); a.webmUrl = d.querySelector('#eW').value.trim();
      a.posterUrl = d.querySelector('#eP').value.trim(); a.thumbnailUrl = d.querySelector('#eTh').value.trim(); a.priority = +d.querySelector('#ePr').value || 0; a.duration = +d.querySelector('#eDur').value || 0; a.orientation = d.querySelector('#eOr').value;
      a.loopable = d.querySelector('#eLoop').checked; a.hasAudio = d.querySelector('#eAud').checked; a.enabled = d.querySelector('#eEn').checked;
      Object.keys(TAX).filter(function (k) { return k !== 'type'; }).forEach(function (k) { a[FIELD[k]] = checked(d, k); }); a.chapterTags = checked(d, 'chapter'); a.chapterIds = checked(d, 'chapterIds');
      if (window.V2Cinema) { var cn = V2Cinema.read(d.querySelector('#eCn')); if (Object.keys(cn).length) a.cinema = cn; else delete a.cinema; } // 클립 개별 연출
      a.pending = hasPending({ pending: p }) ? p : null; M.dirty = true; d.close(); mediaRender();
    };
  }

  /* 커버리지 + 이미지 선택 테스트 (Scene Intent 를 직접 만들어 후보와 점수 이유를 본다) */
  function coverageDlg(el) {
    var c = R.Scenes.coverage(M.list), row = function (k) { return '<div style="min-width:170px"><b>' + k.toUpperCase() + '</b>' + Object.keys(c[k]).map(function (t) { var low = c.warnings.some(function (w) { return w.kind === k && w.tag === t; }); return '<div class="' + (low ? 'v2warn' : '') + '">' + t + ' <b>' + c[k][t] + '</b>' + (low ? ' ⚠' : '') + '</div>'; }).join('') + '</div>'; };
    var html = '<h3>미디어 커버리지</h3><p class="muted">전체 ' + c.total + '개 · ' + Object.keys(c.byType).map(function (t) { return (TYPE_KO[t] || t) + ' ' + c.byType[t]; }).join(' · ') + '</p>' +
      '<div class="row" style="align-items:start">' + row('element') + row('state') + row('theme') + row('emotion') + '</div>' +
      (c.warnings.length ? '<p class="v2warn"><b>부족한 태그 ' + c.warnings.length + '개</b> — ' + c.warnings.slice(0, 14).map(function (w) { return w.tag + ' ' + w.have + '/' + w.recommended; }).join(', ') + (c.warnings.length > 14 ? ' …' : '') + '</p>' : '<p class="ok">권장 최소 수를 모두 채웠습니다.</p>') +
      '<hr style="border:0;border-top:1px solid var(--line)"><h3>선택 테스트</h3><p class="muted">원하는 장면의 의미를 고르면 Scene Intent 로 후보를 검색합니다.</p><div class="row">' + ['element', 'state', 'theme', 'emotion'].map(function (k) { return '<label>' + k + '<select data-t="' + k + '"><option value="">-</option>' + TAX[k].map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>'; }).join('') + '<label>미디어 타입<select data-t="type"><option value="">전체</option>' + TAX.type.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label><button id="tGo">검색</button></div><div id="tOut" style="margin-top:10px"></div><div class="row" style="justify-content:flex-end"><button id="x">닫기</button></div>';
    var d = el ? { querySelector: function (q) { return el.querySelector(q); } } : dlg(html, true); if (el) el.innerHTML = html.replace('<div class="row" style="justify-content:flex-end"><button id="x">닫기</button></div>', '');
    if (!el) d.querySelector('#x').onclick = function () { d.close(); };
    d.querySelector('#tGo').onclick = function () {
      var v = function (k) { var x = d.querySelector('[data-t="' + k + '"]').value; return x ? [x] : []; }, ty = v('type');
      var it = { chapterKey: '', desiredElements: v('element'), desiredStates: v('state'), desiredThemes: v('theme'), desiredEmotion: v('emotion'), desiredActions: [], desiredScenes: [], preferredMediaType: ty, visualRole: '' };
      var out = R.Scenes.search(M.list.filter(function (a) { return a.enabled !== false; }), it, { usedIds: [] }).filter(function (x) { return !ty.length || x.asset.type === ty[0]; }).slice(0, 8);
      d.querySelector('#tOut').innerHTML = out.length ? out.map(function (x) { return '<div class="row" style="align-items:center;margin:4px 0"><div class="hmthumb" style="width:44px;height:56px;background:#000 center/cover url(\'' + esc(x.asset.thumbnailUrl || x.asset.posterUrl || x.asset.url) + '\')"></div><div><b>' + esc(x.asset.title || x.asset.id) + '</b> · 점수 ' + x.score + '<div class="dbg">' + x.breakdown.map(function (w) { return w.label + (w.v > 0 ? '+' : '') + w.v; }).join(' ') + '</div></div></div>'; }).join('') : '<p class="muted">일치하는 후보가 없습니다.</p>';
    };
  }

  /* ═════════════ 일주 캐릭터 영상 120 ═════════════ */
  var A = { videos: [], fallback: { videoUrl: '', videoWebm: '', posterUrl: '', title: '' }, loaded: false, root: null, sel: null, f: { stem: '', branch: '', gender: '', status: '' }, dirty: false };
  var STEMS = '갑을병정무기경신임계'.split(''), BRS = '자축인묘진사오미신유술해'.split('');
  function awkOpen(root) {
    A.root = root;
    if (!root.dataset.built) {
      root.dataset.built = 1;
      root.innerHTML = '<div class="card"><div class="v2bar"><b style="color:var(--gold)">일주 캐릭터 영상 (60일주 × 남·여 = 120)</b><span style="flex:1"></span><label class="navbtn" style="cursor:pointer">파일 한꺼번에 올리기<input type="file" id="aFile" multiple accept="video/mp4,video/webm,image/*" hidden></label><button id="aFb">기본(fallback) 영상</button><button class="pri" id="aSave" disabled>변경사항 저장</button></div>' +
        '<p class="muted">파일명 규칙으로 자동 배정: <code>갑자_남.mp4</code> · <code>갑자_여.webm</code> · <code>갑자_남_poster.webp</code> (한자 <code>甲子</code>, <code>M/F</code>도 가능)</p>' +
        '<div class="v2bar" style="margin:8px 0"><label for="aBase" style="white-space:nowrap">공개 영상 기본 주소</label><input id="aBase" type="url" placeholder="https://video.내도메인.com  (비우면 /api/clipfile 경유)" style="flex:1;min-width:220px"><span class="muted">R2 공개 커스텀 도메인. 설정하면 일주·일간 영상이 함수를 거치지 않고 바로 재생됩니다. 기존 업로드 키는 그대로 씁니다.</span></div><div class="v2q" id="aQ"></div><div class="v2stat" id="aStat"></div><div class="v2bar" id="aFilters" style="margin-top:12px"></div><div style="overflow:auto"><table class="mx" id="aMx"></table></div><div id="aMiss" class="muted" style="margin-top:10px"></div></div><div class="card" id="aEd" style="margin-top:12px" hidden></div><div class="card" id="aIlg" style="margin-top:12px"></div>';
      $('#aFile', root).onchange = function (e) { awkBulk(e.target.files); e.target.value = ''; }; $('#aSave', root).onclick = awkSave; $('#aFb', root).onclick = fbDlg;
      $('#aFilters', root).innerHTML = '<select data-f="stem"><option value="">일간 전체</option>' + STEMS.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select><select data-f="branch"><option value="">일지 전체</option>' + BRS.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select><select data-f="gender"><option value="">성별 전체</option><option value="M">남</option><option value="F">여</option></select><select data-f="status"><option value="">상태 전체</option><option value="ok">완료</option><option value="missing">누락</option><option value="disabled">비활성</option><option value="error">오류</option><option value="poster-only">포스터만</option></select>';
      [].forEach.call($('#aFilters', root).querySelectorAll('select'), function (s) { s.onchange = function () { A.f[s.dataset.f] = s.value; awkRender(); }; });
    }
    if (!A.loaded) api('/api/awakening?all=1').then(function (d) { A.videos = d.videos || []; A.ilgan = d.ilgan || []; A.fallback = d.fallback || A.fallback; A.base = d.publicBase || ''; var bi = $('#aBase', root); if (bi) { bi.value = A.base; bi.oninput = function () { A.base = bi.value.trim(); A.dirty = true; $('#aSave', root).disabled = false; }; } A.loaded = true; awkRender(); }).catch(function (e) { toast(e.message, true); }); else awkRender();
  }
  var vget = function (p, g) { return A.videos.filter(function (v) { return v.dayPillar === p && v.gender === g; })[0]; };
  function awkRender() {
    var cov = R.Media.awakeningCoverage(A.videos), st = {}; cov.cells.forEach(function (c) { st[c.dayPillar + c.gender] = c.status; });
    $('#aStat', A.root).innerHTML = '<span>남성 <b>' + cov.male + ' / 60</b></span><span>여성 <b>' + cov.female + ' / 60</b></span><span>전체 <b>' + cov.total + ' / 120</b></span>' + (cov.invalid ? '<span class="err">해석 불가 ' + cov.invalid + '개</span>' : '');
    $('#aSave', A.root).disabled = !A.dirty;
    // 행 = 일간 10, 열 = 일지 12 중 같은 음양 6개. 각 칸은 남|여 반쪽 두 개.
    var t = '<tr><th></th>' + BRS.map(function (b) { return '<th>' + b + '</th>'; }).join('') + '</tr>';
    STEMS.forEach(function (s, si) {
      if (A.f.stem && A.f.stem !== s) return;
      t += '<tr><th>' + s + '</th>' + BRS.map(function (b, bi) {
        if (si % 2 !== bi % 2) return '<td></td>'; if (A.f.branch && A.f.branch !== b) return '<td></td>'; var p = s + b;
        var half = function (g) { var status = st[p + g] || 'missing'; if (A.f.gender && A.f.gender !== g) return ''; if (A.f.status && A.f.status !== status) return '<button disabled style="opacity:.2">' + (g === 'M' ? '남' : '여') + '</button>';
          return '<button class="' + status + (A.sel && A.sel.p === p && A.sel.g === g ? ' sel' : '') + '" data-p="' + p + '" data-g="' + g + '" title="' + p + ' ' + (g === 'M' ? '남' : '여') + ' · ' + status + '"><em>' + p + '</em>' + (g === 'M' ? '남' : '여') + '</button>'; };
        return '<td><div class="cellx">' + half('M') + half('F') + '</div></td>';
      }).join('') + '</tr>';
    });
    var mx = $('#aMx', A.root); mx.innerHTML = t; mx.onclick = function (e) { var b = e.target.closest('button[data-p]'); if (b) { A.sel = { p: b.dataset.p, g: b.dataset.g }; awkRender(); awkEdit(); } };
    $('#aMiss', A.root).innerHTML = cov.missing.length ? '<b>누락 ' + cov.missing.length + '개:</b> ' + cov.missing.slice(0, 40).map(function (k) { var p = k.split('|'); return p[0] + (p[1] === 'M' ? '(남)' : '(여)'); }).join(' · ') + (cov.missing.length > 40 ? ' …' : '') : '<span class="ok">120개가 모두 등록되었습니다.</span>';
    ilgRender();
    if (A.sel) awkEdit();
  }
  function awkEdit() {
    var s = A.sel, box = $('#aEd', A.root), v = vget(s.p, s.g) || { dayPillar: s.p, gender: s.g, videoUrl: '', videoWebm: '', posterUrl: '', captionsUrl: '', title: s.p + '일주', subtitle: '', keywords: [], enabled: true, _new: true };
    box.hidden = false;
    var f = function (id, lbl, key, ph) { return '<div class="v2f"><label>' + lbl + '</label><div class="row" style="flex-wrap:nowrap"><input type="text" id="' + id + '" value="' + esc(v[key] || '') + '" placeholder="' + (ph || '') + '"><label class="navbtn" style="cursor:pointer;white-space:nowrap">올리기<input type="file" data-up="' + id + '" hidden></label></div></div>'; };
    box.innerHTML = '<h3>' + s.p + '일주 · ' + (s.g === 'M' ? '남성' : '여성') + '</h3><div class="v2f two"><div>' + f('aMp4', 'MP4 영상', 'videoUrl') + f('aWebm', 'WebM 영상 (선택)', 'videoWebm') + '</div><div>' + f('aPo', '포스터 이미지', 'posterUrl') + '' + '</div></div>' +
      '<div class="v2f two"><div><label>제목</label><input type="text" id="aT" value="' + esc(v.title) + '"></div><div><label>키워드 (쉼표)</label><input type="text" id="aK" value="' + esc((v.keywords || []).join(', ')) + '"></div></div><div class="v2f"><label>부제</label><input type="text" id="aS" value="' + esc(v.subtitle) + '"></div>' +
      f('aCap', '자막 파일(VTT, 선택)', 'captionsUrl') + '<div class="row"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="aEn"' + (v.enabled !== false ? ' checked' : '') + '>사용</label><span style="flex:1"></span>' + (v._new ? '' : '<button class="danger" id="aRm">이 영상 등록 삭제</button>') + '<button class="pri" id="aOk">적용</button></div><span class="muted" id="aUp"></span>';
    [].forEach.call(box.querySelectorAll('input[data-up]'), function (i) { i.onchange = function () { var file = i.files[0]; if (!file) return; $('#aUp', box).textContent = '올리는 중…'; (/^image\//.test(file.type) ? shrinkImage(file) : Promise.resolve(file)).then(function (ff) { return upload(ff, ff.name); }).then(function (u) { box.querySelector('#' + i.dataset.up).value = u; $('#aUp', box).textContent = '올렸습니다'; }).catch(function (e) { $('#aUp', box).textContent = e.message; }); }; });
    $('#aOk', box).onclick = function () {
      var n = { dayPillar: s.p, gender: s.g, videoUrl: $('#aMp4', box).value.trim(), videoWebm: $('#aWebm', box).value.trim(), posterUrl: $('#aPo', box).value.trim(), captionsUrl: $('#aCap', box).value.trim(), title: $('#aT', box).value.trim(), subtitle: $('#aS', box).value.trim(), keywords: $('#aK', box).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), enabled: $('#aEn', box).checked };
      A.videos = A.videos.filter(function (x) { return !(x.dayPillar === s.p && x.gender === s.g); }); A.videos.push(n); A.dirty = true; awkRender();
    };
    var rm = $('#aRm', box); if (rm) rm.onclick = function () { A.videos = A.videos.filter(function (x) { return !(x.dayPillar === s.p && x.gender === s.g); }); A.sel = null; box.hidden = true; A.dirty = true; awkRender(); };
  }
  // 파일명 → 일주(또는 일간)·성별·종류. 예) 갑자_남.mp4 / 甲子_F_poster.webp / 을축_여_poster.webp  ·  일간 소개: 경금_남.mp4 / 경_여.webm / 庚_M_poster.webp
  function fileKind(n) {
    var ext = (n.split('.').pop() || '').toLowerCase(), low = n.toLowerCase();
    return /poster|포스터/.test(low) ? 'posterUrl' : /[.]vtt$/.test(low) ? 'captionsUrl' : ext === 'webm' ? 'videoWebm' : /^(mp4|mov|m4v)$/.test(ext) ? 'videoUrl' : /^(jpg|jpeg|png|webp|avif|gif)$/.test(ext) ? 'posterUrl' : null;
  }
  var RE_PILLAR = /^([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])[\s_.-]*(남성|여성|남|여|male|female|m|f)/i;
  var RE_ILGAN = new RegExp('^([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])(목|화|토|금|수|木|火|土|金|水)?[ _.-]*(남성|여성|남|여|male|female|m|f)', 'i');
  function parseName(n) {
    var kind = fileKind(n); if (!kind) return null;
    var m = RE_PILLAR.exec(n);
    if (m) { var p = R.Media.normPillar(m[1]); return p ? { p: p, g: R.Media.normGender(m[2]), kind: kind } : null; }
    var mi = RE_ILGAN.exec(n); if (!mi) return null;
    var stem = R.Media.normStem(mi[1]), g = R.Media.normGender(mi[3]); return stem && g ? { ilgan: true, stem: stem, g: g, kind: kind } : null;
  }

  /* ── 일간 소개 영상 (일간 10 × 남·여 = 20): 일주 캐릭터 영상 앞에 나온다 ─────────── */
  var ELN = { '갑': '목', '을': '목', '병': '화', '정': '화', '무': '토', '기': '토', '경': '금', '신': '금', '임': '수', '계': '수' };
  var IL = { sel: null };
  var ilget = function (s, g) { return (A.ilgan || []).filter(function (v) { return v.stem === s && v.gender === g; })[0]; };
  function ilgSet(pn, url, st) { // 일괄 업로드에서 호출
    var v = ilget(pn.stem, pn.g); if (!v) { v = { stem: pn.stem, gender: pn.g, videoUrl: '', videoWebm: '', posterUrl: '', captionsUrl: '', title: '', subtitle: '', keywords: [], enabled: true }; (A.ilgan = A.ilgan || []).push(v); }
    v[pn.kind] = url; A.dirty = true; if (st) { st.textContent = '일간 소개 ' + pn.stem + (pn.g === 'M' ? ' 남' : ' 여') + ' → ' + pn.kind; st.className = 'st ok'; } awkRender();
  }
  function ilgRender() {
    var box = $('#aIlg', A.root); if (!box) return; var cov = R.Media.ilganCoverage(A.ilgan || []), st = {}; cov.cells.forEach(function (c) { st[c.stem + c.gender] = c.status; });
    var h = '<div class="v2bar"><b style="color:var(--gold)">일간 소개 영상 (10일간 × 남·여 = 20)</b><span class="muted">일주 캐릭터 영상 <u>앞</u>에 나옵니다. 없는 일간은 이 단계를 건너뜁니다.</span></div><div class="v2stat">남성 <b>' + cov.male + ' / 10</b> 여성 <b>' + cov.female + ' / 10</b> 전체 <b>' + cov.total + ' / 20</b></div>' +
      '<p class="muted">위의 "파일 한꺼번에 올리기"로도 올릴 수 있습니다: <code>경금_남.mp4</code> · <code>경_여.webm</code> · <code>경금_남_poster.webp</code> (한자 <code>庚_M</code> 가능)</p><table class="mx"><tr><th></th><th>남</th><th>여</th></tr>';
    R.Media.STEMS.forEach(function (s) {
      h += '<tr><th>' + s + ELN[s] + '</th>' + ['M', 'F'].map(function (g) { var x = st[s + g] || 'missing'; return '<td><div class="cellx"><button type="button" class="' + x + (IL.sel && IL.sel.s === s && IL.sel.g === g ? ' sel' : '') + '" data-is="' + s + '" data-ig="' + g + '" style="min-width:90px;padding:8px"><em>' + s + ELN[s] + '</em>' + (g === 'M' ? '남' : '여') + '</button></div></td>'; }).join('') + '</tr>';
    });
    var bad = (A.ilgan || []).map(function (x) { var m = R.Media.ilganTextMismatch(x.stem, (x.title || '') + ' ' + (x.subtitle || '') + ' ' + (x.keywords || []).join(' ')); return m ? x.stem + ELN[x.stem] + (x.gender === 'M' ? ' 남' : ' 여') + ' → "' + m + '" 문구' : ''; }).filter(Boolean);
    if (bad.length) h = h.replace('<table class="mx">', '<div class="warn" style="margin:8px 0;padding:8px 12px;border:1px solid #c0634a;border-radius:8px;color:#f0b8a8"><b>제목·부제가 다른 일간을 말하는 항목:</b> ' + esc(bad.join(' · ')) + ' <span class="muted">— 이 항목은 시청자 화면에서 기본 문구로 대체됩니다. 해당 칸을 열어 고치거나 "기본 문구 채우기"를 누르세요.</span></div><table class="mx">');
    box.innerHTML = h + '</table><div id="aIlEd" style="margin-top:12px"></div>';
    $('.mx', box).onclick = function (e) { var b = e.target.closest('button[data-is]'); if (b) { IL.sel = { s: b.dataset.is, g: b.dataset.ig }; ilgRender(); ilgEdit(); } };
    if (IL.sel) ilgEdit();
  }
  function ilgEdit() {
    var s = IL.sel, box = $('#aIlEd', A.root), v = ilget(s.s, s.g) || { stem: s.s, gender: s.g, videoUrl: '', videoWebm: '', posterUrl: '', captionsUrl: '', title: '', subtitle: '', keywords: [], enabled: true, _new: true };
    var f = function (id, lbl, key) { return '<div class="v2f"><label>' + lbl + '</label><div class="row" style="flex-wrap:nowrap"><input type="text" id="' + id + '" value="' + esc(v[key] || '') + '"><label class="navbtn" style="cursor:pointer;white-space:nowrap">올리기<input type="file" data-up="' + id + '" hidden></label></div></div>'; };
    box.innerHTML = '<div class="card" style="background:var(--bg)"><b>' + s.s + ELN[s.s] + ' 일간 소개 · ' + (s.g === 'M' ? '남성' : '여성') + '</b><div class="v2f two"><div>' + f('iMp4', 'MP4 영상', 'videoUrl') + f('iWebm', 'WebM 영상 (선택)', 'videoWebm') + '</div><div>' + f('iPo', '포스터 이미지', 'posterUrl') + f('iCap', '자막 파일(VTT, 선택)', 'captionsUrl') + '</div></div>' +
      '<div class="v2f two"><div><label>제목 (비우면 "' + (R.IntroText ? R.IntroText.ilganTitle(s.s) : s.s + ELN[s.s]) + '")</label><input type="text" id="iT" value="' + esc(v.title) + '"></div><div><label>키워드 (쉼표)</label><input type="text" id="iK" value="' + esc((v.keywords || []).join(', ')) + '"></div></div><div class="v2f"><label>부제 (비우면 이 일간의 기본 4줄이 나옵니다)</label><textarea id="iS" rows="3" style="width:100%">' + esc(v.subtitle) + '</textarea><div class="row" style="margin-top:6px"><button type="button" id="iFill">기본 문구 채우기</button><span class="muted" id="iChk"></span></div></div>' +
      '<div class="row"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="iEn"' + (v.enabled !== false ? ' checked' : '') + '>사용</label><span style="flex:1"></span>' + (v._new ? '' : '<button type="button" class="danger" id="iRm">삭제</button>') + '<button type="button" class="pri" id="iOk">적용</button></div><span class="muted" id="iUp"></span></div>';
    [].forEach.call(box.querySelectorAll('input[data-up]'), function (i) { i.onchange = function () { var file = i.files[0]; if (!file) return; $('#iUp', box).textContent = '올리는 중…'; (/^image\//.test(file.type) ? shrinkImage(file) : Promise.resolve(file)).then(function (ff) { return upload(ff, ff.name); }).then(function (u) { box.querySelector('#' + i.dataset.up).value = u; $('#iUp', box).textContent = '올렸습니다'; }).catch(function (e) { $('#iUp', box).textContent = e.message; }); }; });
    $('#iOk', box).onclick = function () {
      var mm = chk(); if (mm && !window.confirm('제목·부제가 "' + mm + '" 문구입니다. 이대로 적용할까요? (시청자에게는 기본 문구로 대체되어 보입니다)')) return;
      var n = { stem: s.s, gender: s.g, videoUrl: $('#iMp4', box).value.trim(), videoWebm: $('#iWebm', box).value.trim(), posterUrl: $('#iPo', box).value.trim(), captionsUrl: $('#iCap', box).value.trim(), title: $('#iT', box).value.trim(), subtitle: $('#iS', box).value.trim(), keywords: $('#iK', box).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), enabled: $('#iEn', box).checked };
      A.ilgan = (A.ilgan || []).filter(function (x) { return !(x.stem === s.s && x.gender === s.g); }); A.ilgan.push(n); A.dirty = true; awkRender();
    };
    var chk = function () { var m = R.Media.ilganTextMismatch(s.s, $('#iT', box).value + ' ' + $('#iS', box).value + ' ' + $('#iK', box).value); $('#iChk', box).textContent = m ? '⚠ 이 일간(' + s.s + ELN[s.s] + ')이 아니라 "' + m + '"을(를) 말하는 문구입니다' : ''; $('#iChk', box).style.color = m ? '#f0b8a8' : ''; return m; };
    ['#iT', '#iS', '#iK'].forEach(function (id) { $(id, box).oninput = chk; }); chk();
    $('#iFill', box).onclick = function () { if (!R.IntroText) return; $('#iT', box).value = R.IntroText.ilganTitle(s.s); $('#iS', box).value = R.IntroText.ilgan(s.s).join('\n'); chk(); };
    var rm = $('#iRm', box); if (rm) rm.onclick = function () { A.ilgan = A.ilgan.filter(function (x) { return !(x.stem === s.s && x.gender === s.g); }); IL.sel = null; A.dirty = true; awkRender(); };
  }
  var aq = [];
  function awkBulk(files) { [].forEach.call(files, function (f) { aq.push(f); }); if (!A.busy) awkRun(); }
  function awkRun() {
    var f = aq.shift(), q = $('#aQ', A.root); if (!f) { A.busy = false; return; } A.busy = true;
    var row = document.createElement('div'); row.className = 'it'; row.innerHTML = '<span style="min-width:180px;text-align:left">' + esc(f.name) + '</span><progress max="1" value="0"></progress><span class="st">준비</span>'; q.appendChild(row);
    var pn = parseName(f.name), st = row.querySelector('.st'), pr = row.querySelector('progress');
    if (!pn) { st.textContent = '파일명을 해석할 수 없습니다 (예: 갑자_남.mp4)'; st.className = 'st err'; return setTimeout(awkRun, 30); }
    (/^image\//.test(f.type) ? shrinkImage(f) : Promise.resolve(f)).then(function (ff) { return upload(ff, ff.name, function (p) { pr.value = p; }); }).then(function (u) {
      if (pn.ilgan) { ilgSet(pn, u, st); return; }
      var v = vget(pn.p, pn.g); if (!v) { v = { dayPillar: pn.p, gender: pn.g, videoUrl: '', videoWebm: '', posterUrl: '', captionsUrl: '', title: pn.p + '일주', subtitle: '', keywords: [], enabled: true }; A.videos.push(v); }
      v[pn.kind] = u; A.dirty = true; st.textContent = pn.p + (pn.g === 'M' ? ' 남' : ' 여') + ' → ' + pn.kind; st.className = 'st ok'; awkRender();
    }).catch(function (e) { st.textContent = e.message; st.className = 'st err'; }).then(function () { setTimeout(awkRun, 30); });
  }
  function awkSave() {
    var b = $('#aSave', A.root); b.disabled = true; b.textContent = '저장 중…';
    api('/api/awakening', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ videos: A.videos, ilgan: A.ilgan || [], fallback: A.fallback, publicBase: A.base || '' }) }).then(function (d) { A.dirty = false; toast('저장했습니다 (일주 각성 ' + d.count + '개 · 일간 소개 ' + (d.ilgan || 0) + '개)'); }).catch(function (e) { toast(e.message, true); }).then(function () { b.textContent = '변경사항 저장'; awkRender(); });
  }
  function fbDlg() {
    var fb = A.fallback || {}, d = dlg('<h3>기본(fallback) 일주 영상</h3><p class="muted">해당 일주·성별 영상이 없을 때 대신 재생합니다.</p><div class="v2f"><label>MP4</label><input type="text" id="fV" value="' + esc(fb.videoUrl || '') + '"></div><div class="v2f"><label>WebM</label><input type="text" id="fW" value="' + esc(fb.videoWebm || '') + '"></div><div class="v2f"><label>포스터</label><input type="text" id="fP" value="' + esc(fb.posterUrl || '') + '"></div><div class="row" style="justify-content:flex-end"><button id="fC">취소</button><button class="pri" id="fO">적용</button></div>');
    d.querySelector('#fC').onclick = function () { d.close(); }; d.querySelector('#fO').onclick = function () { A.fallback = { videoUrl: d.querySelector('#fV').value.trim(), videoWebm: d.querySelector('#fW').value.trim(), posterUrl: d.querySelector('#fP').value.trim(), title: fb.title || '' }; A.dirty = true; d.close(); awkRender(); };
  }

  /* ── 기존 클립(구 9장 방식) → 새 라이브러리로 가져오기 ─────────────────────────────
     일주+성별이 정해진 클립은 "일주 캐릭터 영상"으로, 나머지는 "장면 미디어(영상)"로 복사한다(원본 클립은 지우지 않는다). 태그는 일간 오행만 확실한 것만 붙인다. */
  var STEM_EL = { '갑': 'wood', '을': 'wood', '병': 'fire', '정': 'fire', '무': 'earth', '기': 'earth', '경': 'metal', '신': 'metal', '임': 'water', '계': 'water' };
  function importLegacy(done) {
    Promise.all([api('/api/clips'), M.loaded ? Promise.resolve({ media: M.list }) : api('/api/media?all=1'), A.loaded ? Promise.resolve({ videos: A.videos, ilgan: A.ilgan, fallback: A.fallback }) : api('/api/awakening?all=1')]).then(function (r) {
      var clips = r[0].clips || [], mlist = r[1].media || [], vids = r[2].videos || [], fb = r[2].fallback || A.fallback; if (!A.loaded) A.ilgan = r[2].ilgan || [];
      var srcUrl = function (x) { return !x ? '' : x.type === 'r2' ? mediaUrl(x.value) : x.value; };
      var nAwk = 0, nMed = 0, nIlg = 0, skip = 0, haveMedia = {}; mlist.forEach(function (m) { haveMedia['legacy_' + m.id] = 1; if (m.legacyId) haveMedia[m.legacyId] = 1; });
      clips.forEach(function (c) {
        var url = srcUrl(c.src); if (!url) { skip++; return; }
        var cd = c.cond || {}, ilju = (cd.ilju || []).length === 1 ? cd.ilju[0] : '', g = (cd.gender || []).length === 1 ? cd.gender[0] : '';
        var ilg = (cd.ilgan || []).length === 1 ? cd.ilgan[0] : '';
        if (!ilju && ilg && g) { // 일간 소개 영상
          var is = R.Media.normStem(ilg), ig2 = R.Media.normGender(g); if (!is || !ig2) { skip++; return; }
          var ex2 = (A.ilgan || (A.ilgan = [])).filter(function (v) { return v.stem === is && v.gender === ig2; })[0];
          if (ex2 && (ex2.videoUrl || ex2.videoWebm)) { skip++; return; }
          if (!ex2) { ex2 = { stem: is, gender: ig2, videoUrl: '', videoWebm: '', posterUrl: '', captionsUrl: '', title: '', subtitle: '', keywords: [], enabled: true }; A.ilgan.push(ex2); }
          ex2.videoUrl = url; nIlg++; return;
        }
        if (ilju && g) { // 일주 캐릭터 영상
          var p = R.Media.normPillar(ilju), gg = R.Media.normGender(g); if (!p || !gg) { skip++; return; }
          var ex = vids.filter(function (v) { return v.dayPillar === p && v.gender === gg; })[0];
          if (ex && (ex.videoUrl || ex.videoWebm)) { skip++; return; }
          if (!ex) { ex = { dayPillar: p, gender: gg, videoUrl: '', videoWebm: '', posterUrl: '', captionsUrl: '', title: p + '일주', subtitle: '', keywords: [], enabled: true }; vids.push(ex); }
          ex.videoUrl = url; ex.title = ex.title || c.title || ''; nAwk++;
        } else { // 장면 미디어
          var lid = 'legacy_' + c.id; if (haveMedia[lid]) { skip++; return; }
          var els = (cd.ilgan || []).map(function (s) { return STEM_EL[s]; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
          mlist.unshift({ id: lid, legacyId: c.id, type: 'video', url: url, webmUrl: '', thumbnailUrl: '', posterUrl: '', title: c.title || lid, description: '기존 클립에서 가져옴', elementTags: els.length === 1 ? els : [], stateTags: [], emotionTags: [], sceneTags: [], themeTags: [], chapterTags: [], actionTags: [], visualRole: [], orientation: 'portrait', duration: 0, loopable: false, hasAudio: true, priority: 40, enabled: true, tagsApproved: true, bytes: 0, uploadedAt: Date.now() }); nMed++;
        }
      });
      M.list = mlist; M.loaded = true; M.dirty = M.dirty || nMed > 0; A.videos = vids; A.fallback = fb; A.loaded = true; A.dirty = A.dirty || nAwk > 0 || nIlg > 0;
      done && done({ awakening: nAwk, ilgan: nIlg, media: nMed, skipped: skip, total: clips.length });
    }).catch(function (e) { toast(e.message, true); done && done(null); });
  }

  /* ── 조합 테스트 미리보기에서 바로 올리기 ──────────────────────────────────────
     quickAdd: 파일 하나를 올려 미디어 라이브러리에 등록(장면 의도에서 뽑은 태그 포함)하고 저장까지 한다 → 등록된 asset 을 돌려준다.
     quickAwakening: 일간 소개/일주 캐릭터 영상 칸에 파일(영상 또는 포스터)을 바로 연결한다. */
  function quickAdd(file, preset, onProg) {
    preset = preset || {};
    return (M.loaded ? Promise.resolve() : api('/api/media?all=1').then(function (d) { M.list = d.media || []; M.loaded = true; })).then(function () {
      var isVid = /^video\//.test(file.type) || /\.(mp4|webm|mov|m4v)$/i.test(file.name), VIDEOISH = ['video', 'videoLoop', 'backgroundVideo', 'transition'], IMAGEISH = ['image', 'character', 'symbol', 'chapterCover'];
      var type = isVid ? (VIDEOISH.indexOf(preset.type) >= 0 ? preset.type : 'video') : (IMAGEISH.indexOf(preset.type) >= 0 ? preset.type : 'image');
      var a = { id: rid(), type: type, url: '', webmUrl: '', thumbnailUrl: '', posterUrl: '', title: preset.title || file.name.replace(/\.\w+$/, ''), description: preset.description || '', elementTags: preset.elementTags || [], stateTags: preset.stateTags || [], emotionTags: preset.emotionTags || [], sceneTags: preset.sceneTags || [],
        themeTags: preset.themeTags || [], chapterTags: preset.chapterTags || [], chapterIds: preset.chapterIds || [], actionTags: preset.actionTags || [], visualRole: preset.visualRole || [], orientation: 'portrait', duration: 0, loopable: type === 'videoLoop', hasAudio: false, priority: 60, enabled: true, tagsApproved: true, bytes: file.size, uploadedAt: Date.now() };
      var step = isVid ? probeVideo(file) : shrinkImage(file).then(function (s) { file = s; return {}; });
      return step.then(function (info) {
        if (isVid) { a.duration = info.duration || 0; a.orientation = info.orientation || 'portrait'; }
        return upload(file, file.name, onProg).then(function (u) {
          a.url = u; if (/\.webm$/i.test(file.name)) a.webmUrl = u;
          if (isVid && info.poster) return upload(info.poster, a.title + '-poster.webp').then(function (pu) { a.posterUrl = pu; a.thumbnailUrl = pu; });
        });
      }).then(function () { M.list.unshift(a); return api('/api/media', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ media: M.list }) }); }).then(function () { M.dirty = false; return a; });
    });
  }
  function quickAwakening(kind, key, file, onProg) { // kind: 'ilgan' {stem, gender} · 'iju' {pillar, gender}
    var isVid = /^video\//.test(file.type) || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    var step = isVid ? probeVideo(file) : shrinkImage(file).then(function (s) { file = s; return {}; });
    return step.then(function (info) {
      return upload(file, file.name, onProg).then(function (u) {
        var poster = isVid && info.poster ? upload(info.poster, 'poster-' + file.name + '.webp') : Promise.resolve('');
        return poster.then(function (pu) { return { u: u, pu: pu }; });
      });
    }).then(function (r) {
      return api('/api/awakening?all=1').then(function (d) {
        var list = kind === 'ilgan' ? (d.ilgan || (d.ilgan = [])) : (d.videos || (d.videos = []));
        var ex = list.filter(function (v) { return kind === 'ilgan' ? (v.stem === key.stem && v.gender === key.gender) : (v.dayPillar === key.pillar && v.gender === key.gender); })[0];
        if (!ex) { ex = kind === 'ilgan' ? { stem: key.stem, gender: key.gender, videoUrl: '', videoWebm: '', posterUrl: '', captionsUrl: '', title: '', subtitle: '', keywords: [], enabled: true } : { dayPillar: key.pillar, gender: key.gender, videoUrl: '', videoWebm: '', posterUrl: '', captionsUrl: '', title: key.pillar + '일주', subtitle: '', keywords: [], enabled: true }; list.push(ex); }
        if (isVid) { if (/\.webm$/i.test(file.name)) ex.videoWebm = r.u; else ex.videoUrl = r.u; if (r.pu && !ex.posterUrl) ex.posterUrl = r.pu; } else ex.posterUrl = r.u;
        return api('/api/awakening', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ videos: d.videos || [], ilgan: d.ilgan || [], fallback: d.fallback || null }) });
      });
    }).then(function () { A.loaded = false; });
  }

  window.V2Admin = {
    quickAdd: function (file, preset, pw, onProg) { PW = pw; return quickAdd(file, preset, onProg); },
    upload: function (file, name, pw, onProg) { PW = pw; return upload(file, name, onProg); },
    quickAwakening: function (kind, key, file, pw, onProg) { PW = pw; return quickAwakening(kind, key, file, onProg); },
    // root 를 주면 그 안에 그린다(클립 라이브러리의 하위 탭). 없으면 t-<tab> 컨테이너.
    coverage: function (root, pw) { PW = pw; var go = function () { coverageDlg(root); }; if (M.loaded) go(); else api('/api/media?all=1').then(function (d) { M.list = d.media || []; M.loaded = true; go(); }).catch(function (e) { toast(e.message, true); }); },
    importLegacy: function (pw, done) { PW = pw; importLegacy(done); },
    open: function (tab, pw, rootEl) { PW = pw; var root = rootEl || document.getElementById('t-' + tab); if (tab === 'media') mediaOpen(root); else if (tab === 'awk') awkOpen(root); },
    parseName: parseName, shrinkImage: shrinkImage,
    // 기존 클립 가져오기 뒤 일간·일주 소개 상태(A)를 바로 서버에 저장한다(새 "일간·일주 소개" 화면은 서버에서 다시 읽는다)
    saveAwakening: function (pw) { PW = pw; return api('/api/awakening', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ videos: A.videos, ilgan: A.ilgan || [], fallback: A.fallback }) }).then(function (d) { A.dirty = false; return d; }); },
  };
})();
