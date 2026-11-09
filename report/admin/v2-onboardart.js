/* 관리자 "패널 이미지" 탭의 "시네마틱 온보딩 장면 이미지·영상" — 콘텐츠·온보딩 > 시네마틱 온보딩의 장면(1. 운이라는 것 ~ 7. 당신의 운을 펼치다)마다
   PC(가로)·모바일(세로) 이미지를 위의 비주얼 디렉션으로 만들고, 그 이미지로 Kling 영상을 만든 뒤, 장면 슬롯(image·imageMobile·video·videoMobile)에 연결한다.
   연결 = 온보딩 초안 저장(PUT /api/onboarding { renewal }). 방문자 반영은 콘텐츠·온보딩의 [게시]로 한다. 서버: /api/onboard-art. v2-panel.js 가 draw() 에서 V2OnboardArt.open(컨테이너) 를 부른다. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, BOX = null;
  var G = { scenes: [], renewal: null, art: null, sel: 0, pend: {}, prompt: {}, psrc: {}, edit: {}, extra: {}, busy: {}, vbusy: {}, msg: {}, brief: {}, bedit: {}, bwait: {}, ai: null };
  var OR = [['pc', 'PC(가로)', 'image', 'video'], ['mobile', '모바일(세로)', 'imageMobile', 'videoMobile']];
  var $ = function (s) { return BOX.querySelector(s); }, $$ = function (s) { return [].slice.call(BOX.querySelectorAll(s)); };
  var css = document.createElement('style');
  css.textContent = '.oa-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:10px}.oa-col{border:1px solid var(--line);border-radius:10px;padding:10px}' +
    '.oa-shot{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.oa-shot figure{margin:0;flex:1 1 140px;min-width:0}.oa-shot figcaption{font-size:.74rem;color:var(--ink3);margin-bottom:3px}' +
    '.oa-shot img,.oa-shot video{width:100%;border:1px solid var(--line);border-radius:8px;background:#000;display:block;object-fit:cover}.oa-pc img,.oa-pc video{aspect-ratio:16/9}.oa-mobile img,.oa-mobile video{aspect-ratio:9/16;max-height:300px}' +
    '.oa-empty{border:1px dashed var(--line);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--ink3);font-size:.75rem}.oa-pc .oa-empty{aspect-ratio:16/9}.oa-mobile .oa-empty{aspect-ratio:9/16;max-height:300px}' +
    '.oa-col textarea{width:100%;min-height:96px;font-size:.76rem}.oa-col input[type=text]{width:100%}.oa-msg{font-size:.78rem;color:var(--ink2);min-height:1.2em;margin-top:6px}.oa-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}' +
    '.oa-brief{border:1px solid var(--line);border-radius:10px;padding:10px;margin-top:10px}.oa-brief textarea{width:100%;min-height:74px;font-size:.8rem}.oa-brief input{width:100%}.oa-brief label{display:block;font-size:.78rem;color:var(--ink2);margin-top:6px}.oa-warn{color:#f0b36a}' +
    '.oa-mono{font-size:.8rem;color:var(--ink2);line-height:1.6;margin:6px 0 0;max-height:110px;overflow:auto}';
  document.head.appendChild(css);

  var api = function (u, b, m) { return C.api(u, b === undefined ? (m ? { method: m } : undefined) : { method: m || 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); };
  function sceneBody(s, i) { return { id: s.id, title: s.title, index: i, lines: (s.segments || []).map(function (p) { return p.text; }) }; }
  function cur() { return G.scenes[G.sel]; }
  function k(o) { var s = cur(); return (s ? s.id : '') + '.' + o; }

  // 온보딩 초안을 읽는다(관리자 온보딩 화면과 같은 병합 규칙). 초안이 없으면 공개본, 그것도 없으면 코드 기본값.
  function loadDraft() {
    return api('/api/onboarding?draft=1').then(function (d) {
      var O = window.Onboard, cfg = O && O.merge ? O.merge(O.DEFAULTS, d.config || null) : (d.config || {}), r = cfg.renewal || {};
      if (!r.cinematic) r.cinematic = JSON.parse(JSON.stringify(window.Cinematic.defaults));
      G.renewal = r; G.scenes = r.cinematic.scenes || []; G.sel = Math.min(G.sel, Math.max(0, G.scenes.length - 1));
    });
  }
  function open(box) {
    BOX = box; BOX.innerHTML = '<div class="card" style="margin-top:12px"><p class="muted">시네마틱 온보딩 장면을 불러오는 중…</p></div>';
    return Promise.all([loadDraft(), api('/api/onboard-art').catch(function (e) { return { error: e.message, providers: {}, tasks: [] }; })]).then(function (a) { G.art = a[1]; draw(); resume(); })
      .catch(function (e) { BOX.innerHTML = '<div class="card" style="margin-top:12px"><p class="err">' + esc(e.message) + '</p></div>'; });
  }

  function shot(label, url, video, poster) {
    if (!url) return '<figure><figcaption>' + label + '</figcaption><div class="oa-empty">없음</div></figure>';
    return '<figure><figcaption>' + label + '</figcaption>' + (video ? '<video controls loop muted playsinline preload="metadata"' + (poster ? ' poster="' + esc(poster) + '"' : '') + ' src="' + esc(url) + '"></video>' : '<a href="' + esc(url) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(url) + '" alt=""></a>') + '</figure>';
  }
  function col(o) {
    var s = cur(), id = k(o[0]), p = G.pend[id] || {}, kling = G.art && G.art.kling, img = s[o[2]], vid = s[o[3]], start = p.image || img;
    return '<div class="oa-col oa-' + o[0] + '" data-o="' + o[0] + '"><b style="color:var(--gold)">' + o[1] + '</b>' +
      '<div class="oa-shot">' + shot('연결된 이미지(초안)', img) + shot('연결된 영상(초안)', vid, true, img) + '</div>' +
      (p.image || p.video ? '<div class="oa-shot">' + (p.image ? shot('새로 만든 이미지 · 미연결', p.image) : '') + (p.video ? shot('새로 만든 영상 · 미연결', p.video, true, start) : '') + '</div>' : '') +
      '<div class="oa-row">' + (p.image ? '<button type="button" class="btn gold" data-link="image">이 이미지를 장면에 연결</button><button type="button" data-drop="image">버리기</button>' : '') +
      (p.video ? '<button type="button" class="btn gold" data-link="video">이 영상을 장면에 연결</button><button type="button" data-drop="video">버리기</button>' : '') + '</div>' +
      '<details style="margin-top:8px"><summary class="muted">프롬프트 보기·고치기</summary><textarea data-prompt placeholder="프롬프트를 불러오는 중…">' + esc(G.edit[id] || G.prompt[id] || '') + '</textarea><button type="button" data-reprompt>기본 프롬프트로 되돌리기</button></details>' +
      '<label class="muted" style="display:block;margin-top:6px;font-size:.78rem">추가 요청(선택)<input type="text" data-extra value="' + esc(G.extra[id] || '') + '" placeholder="예: 촛불 하나만, 더 어둡게"></label>' +
      '<div class="oa-row"><button type="button" class="btn" data-gen' + (G.busy[id] ? ' disabled' : '') + '>' + (img || p.image ? '이미지 다시 만들기' : '이미지 만들기') + '</button>' +
      '<button type="button" class="btn" data-vgen' + (!kling || !start || G.vbusy[id] ? ' disabled' : '') + ' title="' + (kling ? (start ? (p.image ? '새로 만든(미연결) 이미지' : '연결된 이미지') + '를 첫 프레임으로 씁니다' : '이미지가 먼저 있어야 합니다') : 'Kling 키가 설정되지 않았습니다') + '">' + (p.image ? '새 이미지로 영상 만들기' : '이 이미지로 영상 만들기') + '</button>' +
      '<select data-dur title="영상 길이"><option value="5">5초</option><option value="10">10초</option></select><select data-mode title="화질"><option value="std">표준(720p)</option><option value="pro">고화질(1080p)</option></select></div>' +
      '<div class="oa-msg" data-msg>' + esc(G.msg[id] || '') + '</div></div>';
  }
  function draw() {
    if (!BOX) return; var s = cur(), A = G.art || {}, prov = A.providers || {};
    if (!s) { BOX.innerHTML = '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">시네마틱 온보딩 장면 이미지·영상</b><p class="muted">시네마틱 온보딩 장면이 없습니다. 콘텐츠·온보딩 > 시네마틱 온보딩에서 장면을 먼저 추가하세요.</p></div>'; return; }
    var miss = G.scenes.filter(function (x) { return !x.image || !x.imageMobile; }).length;
    BOX.innerHTML = '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">시네마틱 온보딩 장면 이미지·영상 · ' + G.scenes.length + '장면</b>' +
      '<p class="muted" style="margin:6px 0 8px">첫 화면 시네마틱 온보딩(콘텐츠·온보딩 > 시네마틱 온보딩)의 장면 배경을 만듭니다. 장면마다 독백을 읽고 <b>장면 연출</b>(PC·모바일 따로)을 먼저 짠 뒤 그 연출로 그림을 그려, 함께 나오는 문구와 그림이 맞게 합니다. 화풍·감성·세계관·그림체 레퍼런스는 위의 <b>비주얼 디렉션</b>을 그대로 씁니다. ' +
      '<b>PC는 가로 16:9</b>, <b>모바일은 세로 9:16</b>으로 만들고, 만든 이미지를 첫 프레임으로 Kling 영상을 만들 수 있습니다. [연결]을 누르면 그 장면의 <b>초안</b>에 저장되며, 방문자 화면에는 콘텐츠·온보딩에서 <b>[게시]</b>해야 반영됩니다.</p>' +
      '<p class="muted" style="margin:0 0 8px;font-size:.78rem">이미지 모델: ' + (prov.openai ? esc(A.models.openai) : '') + (prov.openai && prov.gemini ? ' → ' : '') + (prov.gemini ? esc(A.models.gemini) : '') + (!prov.openai && !prov.gemini ? '<span class="err">키 없음(OPENAI_API_KEY 또는 GEMINI_API_KEY)</span>' : '') +
      ' · 영상: ' + (A.kling ? 'Kling 사용 가능' : '<span class="err">Kling 키 없음(KLING_API_KEY)</span>') + (A.error ? ' · <span class="err">' + esc(A.error) + '</span>' : '') + ' · 이미지가 빈 장면 ' + miss + '개</p>' +
      '<div class="ob-bar" style="display:flex;gap:6px;flex-wrap:wrap">' + G.scenes.map(function (x, i) { return '<button type="button" class="btn' + (i === G.sel ? ' gold' : '') + '" data-sc="' + i + '">' + esc((i + 1) + '. ' + x.title) + (x.image && x.imageMobile ? '' : ' ·빈칸') + '</button>'; }).join('') + '</div>' +
      '<div class="oa-mono"><b>' + esc((G.sel + 1) + '. ' + s.title) + '</b>' + (s.enabled === false ? ' <span class="muted">(꺼진 장면)</span>' : '') + '<br>' + (s.segments || []).map(function (p) { return esc(p.text); }).join('<br>') + '</div>' +
      '<div class="oa-brief" id="oaBrief"></div>' +
      '<div class="oa-row"><button type="button" class="btn" id="oaBoth">PC·모바일 이미지 둘 다 만들기</button><button type="button" id="oaReload">초안 다시 불러오기</button></div>' +
      '<div class="oa-cols">' + OR.map(col).join('') + '</div></div>';
    bind();
  }
  function setMsg(id, t) { G.msg[id] = t; var o = id.split('.').pop(), c = BOX && BOX.querySelector('.oa-col[data-o="' + o + '"] [data-msg]'); if (c && k(o) === id) c.textContent = t; }
  function loadPrompt(o, force) {
    var id = k(o[0]), sb = sceneBody(cur(), G.sel), src = JSON.stringify(sb); if (force) delete G.edit[id]; if (G.prompt[id] && G.psrc[id] === src && !force) return Promise.resolve(G.prompt[id]);
    return api('/api/onboard-art', { scene: sb, orient: o[0], promptOnly: true }).then(function (r) { G.brief[sb.id] = r.brief; G.ai = r.ai; if (cur() && cur().id === sb.id) drawBrief(); G.prompt[id] = r.prompt; G.psrc[id] = src; var t = BOX.querySelector('.oa-col[data-o="' + o[0] + '"] [data-prompt]'); if (t && k(o[0]) === id && !G.edit[id]) t.value = r.prompt; return r.prompt; });
  }
  function colEl(o) { return BOX.querySelector('.oa-col[data-o="' + o[0] + '"]'); }

  function gen(o) {
    var s = cur(), i = G.sel, id = k(o[0]), el = colEl(o); if (G.busy[id]) return Promise.resolve();
    var ta = el.querySelector('[data-prompt]'), prompt = ta.value.trim(), extra = el.querySelector('[data-extra]').value.trim(), def = G.prompt[id], custom = !!(prompt && prompt !== def && G.edit[id]);
    G.busy[id] = true; el.querySelector('[data-gen]').disabled = true;
    var body = { scene: sceneBody(s, i), orient: o[0], provider: '' }; if (custom) body.prompt = prompt; if (extra) body.extra = extra;
    var b0 = G.brief[s.id], need = !custom && G.ai && (!b0 || b0.stale), making = function () { setMsg(id, o[1] + ' 이미지를 만드는 중… (보통 30초~1분)'); };
    if (need) setMsg(id, '문구에 맞는 장면 연출을 먼저 짜는 중…'); else making();
    return (need ? ensureBrief(s, i).then(making, making) : Promise.resolve()).then(function () { return api('/api/onboard-art', body); }).then(function (r) {
      if (r.brief) G.brief[s.id] = r.brief;
      var p = G.pend[id] = G.pend[id] || {}; if (p.imageKey) api('/api/onboard-art?k=' + encodeURIComponent(p.imageKey), undefined, 'DELETE').catch(function () { });
      p.image = r.url; p.imageKey = r.key; G.busy[id] = false; G.msg[id] = '만들었습니다(' + r.provider + (r.briefUsed ? ' · 장면 연출 반영' : ' · 연출 없이 독백만') + (r.refs ? ' · 레퍼런스 ' + r.refs + '장' : '') + '). 확인하고 [이 이미지를 장면에 연결]을 누르세요.'; if (k(o[0]) === id) draw(); toast(o[1] + ' 이미지를 만들었습니다');
    }).catch(function (e) { G.busy[id] = false; setMsg(id, '실패: ' + e.message); if (k(o[0]) === id) draw(); toast(e.message, true); });
  }

  /* ── 영상: 첫 프레임(JPEG) 업로드 → Kling 제출 → 8초마다 조회 → 미리보기 → 연결 ── */
  function jpegOf(url) { return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); c.toBlob(function (b) { b ? ok(b) : no(new Error('이미지를 JPEG 로 바꾸지 못했습니다')); }, 'image/jpeg', 0.95); }; im.onerror = function () { no(new Error('첫 프레임 이미지를 불러오지 못했습니다')); }; im.src = url; }); }
  function upFile(file, name) { return C.api('/api/clipfile?name=' + encodeURIComponent(name), { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file }).then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); return r.key; }); }
  function vgen(o) {
    var s = cur(), i = G.sel, id = k(o[0]), el = colEl(o), p = G.pend[id] || {}, start = p.image || s[o[2]];
    if (G.vbusy[id] || !start) return; if (!confirm(o[1] + ' 이미지를 첫 프레임으로 Kling 영상을 만듭니다. Kling 크레딧이 쓰이고 1~5분 걸립니다. 계속할까요?')) return;
    var extra = el.querySelector('[data-extra]').value.trim(), dur = Number(el.querySelector('[data-dur]').value), mode = el.querySelector('[data-mode]').value;
    G.vbusy[id] = true; el.querySelector('[data-vgen]').disabled = true; setMsg(id, '첫 프레임 준비 중…');
    jpegOf(start).then(function (b) { return upFile(b, 'onbstart-' + s.id + '-' + o[0] + '-' + Date.now() + '.jpg'); })
      .then(function (key) { setMsg(id, 'Kling 에 제출하는 중…'); return api('/api/onboard-art', { video: true, scene: sceneBody(s, i), orient: o[0], startKey: key, extra: extra, duration: dur, mode: mode }); })
      .then(function () { poll(id, o); })
      .catch(function (e) { G.vbusy[id] = false; setMsg(id, '실패: ' + e.message); if (k(o[0]) === id) draw(); toast(e.message, true); });
  }
  function poll(id, o) {
    var n = 0; G.vbusy[id] = true;
    (function tick() {
      if (!BOX || !BOX.isConnected) { G.vbusy[id] = false; return; }
      api('/api/onboard-art?task=' + encodeURIComponent(id)).then(function (r) {
        if (r.status === 'processing') { n++; setMsg(id, 'Kling 이 영상을 만드는 중… ' + (n * 8) + '초 경과 (보통 1~5분)'); if (n > 110) { G.vbusy[id] = false; setMsg(id, '아직 처리 중입니다. 나중에 이 탭을 다시 열면 이어서 확인합니다.'); return; } setTimeout(tick, 8000); return; }
        G.vbusy[id] = false;
        if (r.status === 'done') { var p = G.pend[id] = G.pend[id] || {}; if (p.videoKey) api('/api/onboard-art?k=' + encodeURIComponent(p.videoKey), undefined, 'DELETE').catch(function () { }); p.video = r.url; p.videoKey = r.key; G.msg[id] = '영상이 만들어졌습니다. 확인하고 [이 영상을 장면에 연결]을 누르세요.'; toast('영상이 만들어졌습니다'); }
        else { G.msg[id] = '실패: ' + (r.error || '알 수 없는 오류'); toast(r.error || 'Kling 영상 생성에 실패했습니다', true); }
        if (G.scenes[G.sel] && k(o[0]) === id) draw();
      }).catch(function (e) { G.vbusy[id] = false; setMsg(id, '확인 실패: ' + e.message); });
    })();
  }
  function resume() { ((G.art && G.art.tasks) || []).forEach(function (t) { var o = OR.filter(function (x) { return x[0] === t.orient; })[0]; if (o && !G.vbusy[t.id]) { G.msg[t.id] = 'Kling 이 영상을 만드는 중입니다…'; poll(t.id, o); } }); }

  /* ── 연결: 최신 초안을 다시 읽어 이 장면의 칸만 바꾼 뒤 renewal 만 초안에 저장(다른 온보딩 설정은 그대로) ── */
  function link(o, what) {
    var s0 = cur(), id = k(o[0]), p = G.pend[id] || {}, url = p[what], field = what === 'image' ? o[2] : o[3], sid = s0.id;
    if (!url) return; var prevUrl = s0[field];
    if (prevUrl && !confirm('이 장면의 ' + o[1] + (what === 'image' ? ' 이미지' : ' 영상') + '를 새 파일로 바꿉니다(이전 파일은 지우지 않습니다 — 공개본이 아직 쓰고 있을 수 있음). 초안에 저장할까요?')) return;
    setMsg(id, '초안에 저장하는 중…');
    loadDraft().then(function () {
      var s = G.scenes.filter(function (x) { return x.id === sid; })[0]; if (!s) throw new Error('초안에서 이 장면을 찾지 못했습니다(그 사이 장면이 지워졌을 수 있습니다)');
      s[field] = url; return api('/api/onboarding', { renewal: G.renewal }, 'PUT');
    }).then(function (d) {
      (d.notes || []).forEach(function (n) { toast(n, true); });
      // 열려 있는 콘텐츠·온보딩 편집 화면의 메모리 설정에도 같은 값을 넣는다(나중에 거기서 저장해도 이 연결이 덮이지 않게).
      var T = window.V2Onboard && window.V2Onboard.tools && window.V2Onboard.tools(), cf = T && T.G && T.G.cfg, rc = cf && cf.renewal && cf.renewal.cinematic;
      if (rc && rc.scenes) rc.scenes.forEach(function (x) { if (x.id === sid) x[field] = url; });
      if (what === 'image') { delete p.image; delete p.imageKey; } else { delete p.video; delete p.videoKey; }
      G.msg[id] = '초안에 연결했습니다. 콘텐츠·온보딩 > 시네마틱 온보딩에서 미리보기 후 [게시]하면 방문자에게 반영됩니다.'; toast('장면 ' + o[1] + (what === 'image' ? ' 이미지' : ' 영상') + '를 초안에 연결했습니다'); draw();
    }).catch(function (e) { setMsg(id, '연결 실패: ' + e.message); toast(e.message, true); });
  }
  function drop(o, what) {
    var id = k(o[0]), p = G.pend[id] || {}, key = p[what + 'Key']; if (key) api('/api/onboard-art?k=' + encodeURIComponent(key), undefined, 'DELETE').catch(function () { });
    delete p[what]; delete p[what + 'Key']; G.msg[id] = '버렸습니다.'; draw();
  }

  /* ── 장면 연출: 독백 → PC·모바일 화면별 연출(AI 가 짜고 고칠 수 있음). 이미지 프롬프트에서 가장 우선한다. ── */
  function briefState(b) {
    if (!b) return '<span class="oa-warn">아직 연출이 없습니다 — 이미지를 만들면 먼저 AI가 짭니다' + (G.ai === false ? '(AI 키 없음: 직접 적어 저장하세요)' : '') + '</span>';
    if (b.stale) return '<span class="oa-warn">문구가 바뀌어 연출이 지금 문구와 맞지 않습니다 — 다시 짜거나 고쳐 저장하세요</span>';
    return '지금 문구에 맞춘 연출 · ' + (b.by === 'admin' ? '직접 고침' : 'AI가 짬') + (b.at ? ' · ' + esc(String(b.at).slice(0, 16).replace('T', ' ')) : '');
  }
  function drawBrief() {
    var box = BOX && BOX.querySelector('#oaBrief'), s = cur(); if (!box || !s) return;
    var b = G.brief[s.id], e = G.bedit[s.id] || {}, v = function (f) { return esc(e[f] != null ? e[f] : (b && b[f]) || ''); };
    box.innerHTML = '<b style="color:var(--gold)">장면 연출 · 문구 → 그림</b> <span class="muted" style="font-size:.78rem">' + (G.bwait[s.id] ? 'AI가 연출을 짜는 중…' : briefState(b)) + '</span>' +
      '<p class="muted" style="margin:4px 0 0;font-size:.76rem">위 독백을 읽으며 보게 될 장면입니다. PC는 문구가 화면 가운데 아래쪽, 모바일은 왼쪽 아래쪽에 나오므로 화면마다 구도를 따로 잡습니다. 여기 적은 내용이 이미지 프롬프트에서 가장 우선합니다.</p>' +
      '<label>장면의 핵심<input type="text" data-bf="core" value="' + v('core') + '" placeholder="예: 가난한 집 마루에서 낡은 만세력을 처음 펼친 밤"></label>' +
      '<label>PC(가로) 연출<textarea data-bf="pc" placeholder="장소·인물·행동·소품·빛·카메라 위치">' + v('pc') + '</textarea></label>' +
      '<label>모바일(세로) 연출<textarea data-bf="mobile" placeholder="같은 장면을 세로로, 더 가까이">' + v('mobile') + '</textarea></label>' +
      '<div class="oa-row"><button type="button" class="btn" id="oaBAi"' + (G.bwait[s.id] || G.ai === false ? ' disabled' : '') + '>' + (b ? 'AI로 연출 다시 짜기' : 'AI로 연출 짜기') + '</button><button type="button" id="oaBSave">고친 연출 저장</button></div>';
    [].forEach.call(box.querySelectorAll('[data-bf]'), function (x) { x.oninput = function () { (G.bedit[s.id] = G.bedit[s.id] || {})[x.dataset.bf] = x.value; }; });
    box.querySelector('#oaBAi').onclick = function () { if (G.bedit[s.id] && !confirm('고치던 연출을 버리고 AI가 다시 짭니다. 계속할까요?')) return; ensureBrief(s, G.sel, true).catch(function () { }); };
    box.querySelector('#oaBSave').onclick = function () {
      var ed = Object.assign({}, b || {}, G.bedit[s.id] || {});
      api('/api/onboard-art', { scene: sceneBody(s, G.sel), brief: 'save', core: ed.core || '', pc: ed.pc || '', mobile: ed.mobile || '', motion: ed.motion || '' })
        .then(function (r) { briefChanged(s, r.brief); toast('장면 연출을 저장했습니다 — 이제 만드는 이미지에 반영됩니다'); }).catch(function (er) { toast(er.message, true); });
    };
  }
  function briefChanged(s, nb) {
    G.brief[s.id] = nb; delete G.bedit[s.id]; OR.forEach(function (o) { delete G.prompt[s.id + '.' + o[0]]; });
    if (cur() && cur().id === s.id) { drawBrief(); OR.forEach(function (o) { loadPrompt(o).catch(function () { }); }); }
  }
  function ensureBrief(s, i, force) {
    if (G.bwait[s.id]) return G.bwait[s.id]; var b = G.brief[s.id]; if (b && !b.stale && !force) return Promise.resolve(b);
    G.bwait[s.id] = api('/api/onboard-art', { scene: sceneBody(s, i), brief: 'ai' }).then(function (r) { delete G.bwait[s.id]; briefChanged(s, r.brief); toast('장면 연출을 짰습니다'); return r.brief; },
      function (e) { delete G.bwait[s.id]; if (cur() && cur().id === s.id) drawBrief(); toast(e.message, true); throw e; });
    if (cur() && cur().id === s.id) drawBrief(); return G.bwait[s.id];
  }

  function bind() {
    $$('[data-sc]').forEach(function (b) { b.onclick = function () { G.sel = +b.dataset.sc; draw(); }; });
    $('#oaReload').onclick = function () { loadDraft().then(draw).then(function () { toast('초안을 다시 불러왔습니다'); }).catch(function (e) { toast(e.message, true); }); };
    $('#oaBoth').onclick = function () { var s = cur(), b = G.brief[s.id]; (G.ai && (!b || b.stale) && !G.edit[k('pc')] && !G.edit[k('mobile')] ? ensureBrief(s, G.sel).catch(function () { }) : Promise.resolve()).then(function () { gen(OR[0]); gen(OR[1]); }); };
    drawBrief();
    OR.forEach(function (o) {
      var el = colEl(o); loadPrompt(o).catch(function (e) { setMsg(k(o[0]), '프롬프트를 불러오지 못했습니다: ' + e.message); });
      el.querySelector('[data-gen]').onclick = function () { gen(o); };
      el.querySelector('[data-vgen]').onclick = function () { vgen(o); };
      el.querySelector('[data-prompt]').oninput = function () { G.edit[k(o[0])] = this.value; }; el.querySelector('[data-extra]').oninput = function () { G.extra[k(o[0])] = this.value; };
      el.querySelector('[data-reprompt]').onclick = function () { loadPrompt(o, true); };
      [].forEach.call(el.querySelectorAll('[data-link]'), function (b) { b.onclick = function () { link(o, b.dataset.link); }; });
      [].forEach.call(el.querySelectorAll('[data-drop]'), function (b) { b.onclick = function () { drop(o, b.dataset.drop); }; });
    });
  }
  window.V2OnboardArt = { open: open };
})();
