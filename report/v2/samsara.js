/* 기억 너머의 문 — 개인화된 전생 서사를 무빙툰 형태(전체 화면 컷 + 천천히 움직이는 카메라 + 문장)로 감상한다.
   서사 문장은 새로 만들지 않는다: 이미 생성된 '전생의 모습'(deep_past, 없으면 c14) 챕터의 장면을 컷으로 나눠 보여 줄 뿐이다.
   이미지는 관리자가 올린 전생 에셋(past:십성군:오행:성별)을 쓰고, 없으면 색 바탕 + 한자(前)로 대신한다. 영상 슬롯이 있으면 영상을 쓴다.
   전생은 역사적 사실이나 검증된 개인 정보가 아니라 사주 상징을 모티브로 한 창작 판타지임을 모든 컷에 표시한다.
   본문 텍스트 애니메이션 없음(컷 전환은 페이드, 카메라 이동은 이미지에만). 동작 줄이기·데이터 절약 설정을 따른다.
   R.Samsara.extract(rep) → { title, sub, slot, frames:[{cap, paras}] } | null     R.Samsara.open(model, assets, videos, opts)     검증: node tests/samsara-sim.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var UN = function (s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); };
  var NOTICE = '사주 상징을 모티브로 한 창작 판타지입니다. 역사적 사실이나 검증된 개인 정보가 아닙니다.';
  var MOVES = ['zi', 'pl', 'zo', 'pr'];

  /** rep → 컷 목록. 챕터 장면의 HTML 에서 제목·문단을 읽는다(생성기 형식: <div class="cap">…</div><p class="lead">…</p>). */
  function extract(rep) {
    var cs = (rep && rep.chapters) || [], c = cs.filter(function (x) { return x.id === 'deep_past'; })[0] || cs.filter(function (x) { return (x.base || x.id) === 'c14'; })[0];
    if (!c) return null;
    var frames = [], slot = '', hero = '';
    (c.scenes || []).forEach(function (s) {
      var h = s.html || ''; if (!h) return;
      var cap = (/class="cap"[^>]*>([^<]*)</.exec(h) || [])[1] || '', paras = [], re = /<p class="lead">([^<]*)<\/p>/g, m, sl = /data-slot="(past:[^"]+)"/.exec(h);
      if (sl && !slot) slot = UN(sl[1]);
      while ((m = re.exec(h))) paras.push(UN(m[1]));
      var h3 = /<h3 class="dp-h">([^<]*)</.exec(h); if (h3 && !hero) hero = UN(h3[1]);
      if (cap || paras.length) frames.push({ cap: UN(cap), paras: paras, title: h3 ? UN(h3[1]) : '' });
    });
    if (!frames.length) return null;
    return { id: c.id, title: c.title || '전생의 모습', sub: c.subtitle || hero, hero: hero, slot: slot, frames: frames, notice: NOTICE };
  }

  /* 일반 챕터: 화면에 그려진 챕터 HTML(<article> 안)에서 컷을 만든다. 섹션마다 제목(.cap·h2·h3)과 문단(p·li)을 읽고, 섹션 안 이미지가 있으면 그 컷의 배경으로 쓴다
     (없으면 앞 컷의 배경을 이어 쓴다). 버튼·입력·선택지·그래프 설명은 제외. 문장을 새로 만들거나 바꾸지 않는다. */
  var TAGS = function (s) { return UN(String(s).replace(/<(script|style|button|select|textarea|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()); };
  function splitSentences(t) { return String(t).split(/(?<=[.!?。])\s+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function fromHtml(html, meta) {
    meta = meta || {}; var secs = String(html || '').split(/<section\b/i).slice(1), frames = [], lastImg = '', seen = {};
    secs.forEach(function (s) {
      var body = '<section' + s, img = (/<img[^>]+src="([^"]+)"/i.exec(body) || /<video[^>]+poster="([^"]+)"/i.exec(body) || [])[1] || '', cap = TAGS((/<(?:div|h2|h3|p|span)[^>]*class="[^"]*\b(?:cap|no|eyebrow)\b[^"]*"[^>]*>([\s\S]*?)<\/(?:div|h2|h3|p|span)>/i.exec(body) || /<h[23][^>]*>([\s\S]*?)<\/h[23]>/i.exec(body) || [])[1] || ''), paras = [], re = /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi, m;
      if (img) img = UN(img);
      while ((m = re.exec(body))) { if (/class="[^"]*\b(?:cap|no|disc|ctl|cta)\b/.test(m[0].slice(0, 120))) continue; var t = TAGS(m[2]); if (t.length >= 8 && !seen[t]) { seen[t] = 1; paras.push(t); } }
      if (img) lastImg = img; if (!paras.length) return;
      var sents = []; paras.forEach(function (p) { splitSentences(p).forEach(function (x) { sents.push(x); }); });
      for (var i = 0; i < sents.length;) { var chunk = [sents[i++]]; while (i < sents.length && chunk.length < 2 && chunk.join(' ').length + sents[i].length <= 150) chunk.push(sents[i++]); frames.push({ cap: cap, paras: [chunk.join(' ')], img: img || lastImg }); }
    });
    if (frames.length < (meta.min || 2)) return null;
    return { id: meta.id || '', title: meta.title || '', hero: meta.title || '', slot: '', frames: frames.slice(0, 60), notice: meta.notice || '', label: meta.label || meta.title || '' };
  }
  /* 세계 무빙툰: 세계에 속한 챕터들의 핵심(앞쪽 컷 몇 개씩)을 이어 한 편으로 만든다. list: [{ title, html }], meta: { id, title, label, bg, per, max } */
  function fromChapters(list, meta) {
    meta = meta || {}; var per = meta.per || 3, max = meta.max || 36, frames = [];
    (list || []).forEach(function (c) {
      var m = fromHtml(c.html, { id: c.id, title: c.title, min: 1 }); if (!m) return;
      // 챕터 앞부분 컷에는 이미지가 아직 나오지 않은 경우가 많다(삽화는 첫 해설 장면부터 붙는다). 그대로 두면 이미지 없는 컷이 전부 세계의 첫 이미지 한 장으로
      // 채워져 "다 똑같은 이미지"가 된다. 그래서 컷에 이미지가 없으면 그 챕터 안의 서로 다른 이미지를 나오는 순서대로 나눠 쓴다. 챕터에도 없으면 세계 배경.
      var own = []; m.frames.forEach(function (f) { if (f.img && own.indexOf(f.img) < 0) own.push(f.img); });
      // 관리자가 챕터에 지정한 컷 이미지(meta.cut[챕터id])는 본문 삽화보다 우선한다. 컷 순서대로 쓰고 모자라면 돌려 쓴다.
      var ov = (meta.cut && meta.cut[c.id]) || [];
      m.frames.slice(0, per).forEach(function (f, k) { frames.push({ cap: (c.title ? c.title + (f.cap && f.cap !== c.title ? ' · ' + f.cap : '') : f.cap), paras: f.paras, img: (ov.length ? ov[k % ov.length] : '') || f.img || own[Math.min(k, own.length - 1)] || meta.bg || '' }); });
    });
    if (frames.length < 2) return null;
    return { id: meta.id || '', title: meta.title || '', hero: meta.title || '', slot: '', frames: frames.slice(0, max), notice: '', label: meta.label || meta.title || '' };
  }
  function toonCard(info) {
    var E2 = E, n = info.frames || 0, thumb = info.thumb || '';
    return '<div class="cs-card sm-card"><div class="sm-th' + (thumb ? '' : ' none') + '"' + (thumb ? ' style="background-image:url(' + E2(thumb) + ')"' : '') + '>' + (thumb ? '' : '<span aria-hidden="true">' + E2(info.icon || '像') + '</span>') + '</div><div><p class="cs-ct">' + E2(info.name || '') + ' · 웹소설</p><h4>' + E2(info.title || ('챕터별 핵심 장면으로 보는 ' + (info.name || '이 세계'))) + '</h4>' +
      '<p class="cs-sum">' + n + '개 장면 · '+(info.story?'인물의 선택을 따라 읽는 한 편의 단편 이야기입니다.':'각 주제의 이야기를 글로 차분히 읽습니다.')+' 원하는 속도로 읽고 이전·다음으로 이동할 수 있습니다.</p><button type="button" class="btn gold big" data-wtoon="' + E2(info.wid || '') + '">내 사주 웹소설 감상하기</button></div></div>';
  }
  function fromDom(article, meta) { return article ? fromHtml(article.innerHTML, meta) : null; }

  function imageOf(model, assets) {
    if (!model || !model.slot) return '';
    var base = model.slot.replace(/^(past:[^:]+:[^:]+):[FM]$/, '$1');
    return (assets && (assets[model.slot] || assets[base])) || '';
  }
  function videoOf(model, assets, videos) {
    if (!model || !model.slot || !videos) return '';
    var base = model.slot.replace(/^(past:[^:]+:[^:]+):[FM]$/, '$1');
    return videos[model.slot] || (assets && assets[model.slot] ? '' : videos[base]) || '';
  }
  // 문장이 길수록 오래 머문다(읽는 속도). 4~120초. 화면 아래에 본문이 남으면 자동 넘김을 멈춘다.
  function dwell(f, rate) { var n = f.paras.join('').length + (f.cap || '').length; return Math.max(4000, Math.min(120000, 3200 + n * 70)) / (rate && rate > 0 ? rate : 1); }

  function frameHtml(model, i) {
    var f = model.frames[i], last = i === model.frames.length - 1;
    return '<p class="sm-cap">' + E(f.cap) + '</p>' + (R.ReadingMedia&&f.media?R.ReadingMedia.html(f.media):'') + f.paras.map(function (p) { return '<p class="sm-p">' + E(p) + '</p>'; }).join('') + (last ? '<p class="sm-end">이 이야기는 창작이며, 지금의 나에게 건네는 질문으로만 읽어 주세요.</p>' : '');
  }

  /** 전체 화면 감상 창. opts: { reduce, saveData, rate, onDone(), onClose() } */
  function open(model, assets, videos, opts) {
    opts = opts || {}; var doc = root.document; if (!doc || !model || !model.frames || !model.frames.length) return null;
    if (!doc.getElementById('smReaderStyles')) { var style = doc.createElement('link'); style.id = 'smReaderStyles'; style.rel = 'stylesheet'; style.href = '/report/v2/toon-reader.css'; doc.head.appendChild(style); }
    var oldOverflow = doc.body.style.overflow, previousFocus = doc.activeElement; doc.body.style.overflow = 'hidden';
    var dlg = doc.createElement('dialog'); dlg.className = 'sm'; dlg.setAttribute('aria-label', '내 사주 웹소설 · ' + model.title);
    dlg.innerHTML = '<div class="sm-top"><div class="sm-heading"><p class="sm-kicker">내 사주 웹소설</p><h1 class="sm-title">' + E(model.title || model.hero || '나의 이야기') + '</h1><p class="sm-nt">' + E(model.notice || model.label || '') + '</p></div><button type="button" class="chipbtn" data-smx>닫기</button></div>' +
      '<div class="sm-tx" role="region" aria-label="이야기 본문" tabindex="0" aria-live="polite"></div><div class="sm-bar"><div class="sm-dots" role="group" aria-label="원하는 페이지로 이동"></div><button type="button" class="chipbtn" data-smp aria-label="이전 페이지">← 이전</button>' +
      '<div class="sm-middle"><span class="sm-count" role="status"></span><button type="button" class="chipbtn" data-sma aria-pressed="false">자동 ▶</button></div><button type="button" class="chipbtn" data-smn aria-label="다음 페이지">다음 →</button></div>';
    doc.body.appendChild(dlg);
    var i = 0, auto = false, timer = 0, tx = dlg.querySelector('.sm-tx'), dots = dlg.querySelector('.sm-dots'), btnA = dlg.querySelector('[data-sma]'), dead = false;
    function clear() { clearTimeout(timer); timer = 0; }
    function schedule() { clear(); if (!auto || dead) return; timer = setTimeout(function () {
      if (tx.scrollHeight - tx.clientHeight - tx.scrollTop > 8) { auto = false; updateAuto(); btnA.textContent = '본문 아래로'; return; }
      next(true);
    }, dwell(model.frames[i], opts.rate)); }
    function pageWindow() { var size = root.innerWidth <= 600 ? 5 : 9, start = Math.max(0, Math.min(i - Math.floor(size / 2), model.frames.length - size)); return { start: start, end: Math.min(model.frames.length, start + size) }; }
    function show() {
      tx.classList.remove('in');if(R.ReadingMedia)R.ReadingMedia.unmount(tx); tx.innerHTML = frameHtml(model, i); tx.scrollTop = 0;if(R.ReadingMedia)R.ReadingMedia.mount(tx,opts); void tx.offsetWidth; tx.classList.add('in');
      var seekFocused = dots.contains(doc.activeElement);
      var windowPages = pageWindow();
      dots.innerHTML = model.frames.slice(windowPages.start, windowPages.end).map(function (f, offset) { var k = windowPages.start + offset; return '<button type="button" data-smseek="' + k + '" class="' + (k === i ? 'on' : k < i ? 'dn' : '') + '" aria-label="' + (k + 1) + '번째 페이지: ' + E(f.cap) + '"' + (k === i ? ' aria-current="step"' : '') + '></button>'; }).join('');
      if (seekFocused) dots.querySelector('[aria-current]').focus({ preventScroll: true });
      dlg.querySelector('.sm-count').textContent = (i + 1) + ' / ' + model.frames.length;
      dlg.querySelector('[data-smp]').disabled = i === 0;
      var nextButton = dlg.querySelector('[data-smn]'); nextButton.textContent = i === model.frames.length - 1 ? '감상 마치기 ✓' : '다음 →'; nextButton.setAttribute('aria-label', i === model.frames.length - 1 ? '감상 마치기' : '다음 페이지');
      updateAuto(); schedule();
    }
    function updateAuto() { btnA.setAttribute('aria-pressed', String(auto)); btnA.textContent = auto ? '자동 넘김 중 Ⅱ' : '자동 넘김'; }
    function manual(n) { auto = false; i = Math.max(0, Math.min(model.frames.length - 1, n)); show(); }
    function finish() { if (dead) return; close(); if (opts.onDone) opts.onDone(); }
    function next(fromAuto) { if (i >= model.frames.length - 1) { if (fromAuto) { auto = false; show(); return; } finish(); return; } i++; show(); }
    function close() { if (dead) return;if(R.ReadingMedia)R.ReadingMedia.unmount(dlg); dead = true; clear(); doc.removeEventListener('visibilitychange', onVisibility); root.removeEventListener('resize', onResize); try { dlg.close(); } catch (e) { } if (dlg.parentNode) dlg.parentNode.removeChild(dlg); doc.body.style.overflow = oldOverflow; if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus(); if (opts.onClose) opts.onClose(); }
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-smx')) close(); else if (b.hasAttribute('data-smn')) { if (i === model.frames.length - 1) finish(); else manual(i + 1); } else if (b.hasAttribute('data-smp')) { manual(i - 1); } else if (b.hasAttribute('data-smseek')) { manual(+b.getAttribute('data-smseek')); } else if (b.hasAttribute('data-sma')) { auto = !auto; updateAuto(); schedule(); }
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('keydown', function (e) { if (e.altKey || e.ctrlKey || e.metaKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); manual(i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); manual(i - 1); } else if (e.key === 'Home') { e.preventDefault(); manual(0); } else if (e.key === 'End') { e.preventDefault(); manual(model.frames.length - 1); } });
    tx.addEventListener('scroll', function () { if (auto && tx.scrollTop > 8) { auto = false; clear(); updateAuto(); } }, { passive: true });
    var touch = null;
    dlg.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: true });
    dlg.addEventListener('touchend', function (e) { if (!touch || e.target.closest('button')) return; var t = e.changedTouches[0], x = t.clientX - touch.x, y = t.clientY - touch.y; touch = null; if (Math.abs(x) > 60 && Math.abs(x) > Math.abs(y) * 1.5) manual(i + (x < 0 ? 1 : -1)); }, { passive: true });
    function onVisibility() { if (doc.hidden && auto) { auto = false; clear(); updateAuto(); } }
    function onResize() { if (!dead) { var top = tx.scrollTop; show(); tx.scrollTop = top; } }
    doc.addEventListener('visibilitychange', onVisibility); root.addEventListener('resize', onResize);
    if (dlg.showModal) dlg.showModal(); show();
    return { close: close };
  }

  /** 세계 5 상세 화면 위쪽의 시작 카드 */
  function card(model, assets, esc) {
    if (!model) return '<div class="cs-card sm-card"><p class="cs-sum">전생 이야기를 만들지 못했습니다. 아래 챕터 목록에서 기존 이야기를 읽을 수 있습니다.</p></div>';
    var img = imageOf(model, assets);
    return '<div class="cs-card sm-card"><div class="sm-th' + (img ? '' : ' none') + '"' + (img ? ' style="background-image:url(' + E(img) + ')"' : '') + '>' + (img ? '' : '<span aria-hidden="true">前</span>') + '</div><div><p class="cs-ct">내 사주로 만든 창작 전생 서사</p><h4>' + E(model.hero || model.title) + '</h4>' +
      '<p class="cs-sum">' + model.frames.length + '개 장면 · 원하는 속도로 읽고 이전·다음으로 이동할 수 있습니다.</p><button type="button" class="btn gold big" data-smopen>내 사주 웹소설 감상하기</button></div></div>';
  }

  R.Samsara = { fromChapters: fromChapters, toonCard: toonCard, fromHtml: fromHtml, fromDom: fromDom, extract: extract, open: open, card: card, imageOf: imageOf, videoOf: videoOf, dwell: dwell, NOTICE: NOTICE };
})(typeof window !== 'undefined' ? window : globalThis);
