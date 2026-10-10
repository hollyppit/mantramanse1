/* 윤회의 문 — 개인화된 전생 서사를 무빙툰 형태(전체 화면 컷 + 천천히 움직이는 카메라 + 문장)로 감상한다.
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
      m.frames.slice(0, per).forEach(function (f) { frames.push({ cap: (c.title ? c.title + (f.cap && f.cap !== c.title ? ' · ' + f.cap : '') : f.cap), paras: f.paras, img: f.img || meta.bg || '' }); });
    });
    if (frames.length < 2) return null;
    return { id: meta.id || '', title: meta.title || '', hero: meta.title || '', slot: '', frames: frames.slice(0, max), notice: '', label: meta.label || meta.title || '' };
  }
  function toonCard(info) {
    var E2 = E, n = info.frames || 0, thumb = info.thumb || '';
    return '<div class="cs-card sm-card"><div class="sm-th' + (thumb ? '' : ' none') + '"' + (thumb ? ' style="background-image:url(' + E2(thumb) + ')"' : '') + '>' + (thumb ? '' : '<span aria-hidden="true">' + E2(info.icon || '像') + '</span>') + '</div><div><p class="cs-ct">' + E2(info.name || '') + ' · 무빙툰</p><h4>챕터별 핵심 장면으로 보는 ' + E2(info.name || '이 세계') + '</h4>' +
      '<p class="cs-sum">' + n + '개의 컷 · 챕터마다 앞부분의 핵심 문장을 이미지와 함께 이어서 봅니다. 자동 재생·이전/다음·건너뛰기를 고를 수 있습니다.</p><button type="button" class="btn gold big" data-wtoon="' + E2(info.wid || '') + '">무빙툰으로 감상하기</button></div></div>';
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
  // 문장이 길수록 오래 머문다(읽는 속도). 4~16초.
  function dwell(f, rate) { var n = f.paras.join('').length + (f.cap || '').length; return Math.max(4000, Math.min(16000, 3200 + n * 70)) / (rate && rate > 1 ? rate : 1); }

  function frameHtml(model, i) {
    var f = model.frames[i], last = i === model.frames.length - 1;
    return '<p class="sm-cap">' + E(f.cap) + '</p>' + f.paras.map(function (p) { return '<p class="sm-p">' + E(p) + '</p>'; }).join('') + (last ? '<p class="sm-end">이 이야기는 창작이며, 지금의 나에게 건네는 질문으로만 읽어 주세요.</p>' : '');
  }

  /** 전체 화면 감상 창. opts: { reduce, saveData, rate, onDone(), onClose() } */
  function open(model, assets, videos, opts) {
    opts = opts || {}; var doc = root.document; if (!doc || !model) return null;
    var img = imageOf(model, assets) || ((model.frames.filter(function (f) { return f.img; })[0] || {}).img) || '', vid = !opts.saveData && !opts.reduce ? videoOf(model, assets, videos) : '';
    var dlg = doc.createElement('dialog'); dlg.className = 'sm'; dlg.setAttribute('aria-label', '윤회의 문 · ' + model.title);
    dlg.innerHTML = '<div class="sm-bg' + (img ? '' : ' none') + '"' + (img ? ' style="background-image:url(' + E(img) + ')"' : '') + '>' + (vid ? '<video src="' + E(vid) + '" poster="' + E(img) + '" muted loop playsinline autoplay preload="metadata"></video>' : '') + (img ? '' : '<span aria-hidden="true">前</span>') + '</div>' +
      '<div class="sm-sh" aria-hidden="true"></div><div class="sm-top"><span class="sm-nt' + (model.notice ? '' : ' sm-lb') + '">' + E(model.notice || model.label || '') + '</span><button type="button" class="chipbtn" data-smx>닫기</button></div>' +
      '<div class="sm-tx" role="region" aria-live="polite"></div><div class="sm-bar"><button type="button" class="chipbtn" data-smp aria-label="이전 컷">‹</button><div class="sm-dots" role="progressbar" aria-valuemin="1" aria-valuemax="' + model.frames.length + '"></div>' +
      '<button type="button" class="chipbtn" data-sma aria-pressed="false">자동 ▶</button><button type="button" class="chipbtn" data-smn aria-label="다음 컷">›</button></div>';
    doc.body.appendChild(dlg);
    var cur = '', shown = img, i = 0, auto = !opts.reduce, timer = 0, tx = dlg.querySelector('.sm-tx'), bg = dlg.querySelector('.sm-bg'), dots = dlg.querySelector('.sm-dots'), btnA = dlg.querySelector('[data-sma]'), dead = false;
    function clear() { clearTimeout(timer); timer = 0; }
    function schedule() { clear(); if (!auto || dead) return; timer = setTimeout(function () { next(true); }, dwell(model.frames[i], opts.rate)); }
    function show() {
      tx.classList.remove('in'); tx.innerHTML = frameHtml(model, i); void tx.offsetWidth; tx.classList.add('in');
      var fi = model.frames[i].img || cur || img; if (model.frames[i].img) cur = model.frames[i].img;
      if (fi && fi !== shown) { bg.style.backgroundImage = 'url(' + fi + ')'; shown = fi; }
      bg.className = 'sm-bg' + (fi ? '' : ' none') + (opts.reduce ? '' : ' mv-' + MOVES[i % MOVES.length]);
      dots.setAttribute('aria-valuenow', String(i + 1)); dots.innerHTML = model.frames.map(function (_, k) { return '<i class="' + (k === i ? 'on' : k < i ? 'dn' : '') + '"></i>'; }).join('');
      btnA.setAttribute('aria-pressed', String(auto)); btnA.textContent = auto ? '자동 ❚❚' : '자동 ▶'; schedule();
    }
    function finish() { if (dead) return; if (opts.onDone) opts.onDone(); close(); }
    function next(fromAuto) { if (i >= model.frames.length - 1) { if (fromAuto) { auto = false; show(); return; } finish(); return; } i++; show(); }
    function close() { if (dead) return; dead = true; clear(); try { dlg.close(); } catch (e) { } if (dlg.parentNode) dlg.parentNode.removeChild(dlg); if (opts.onClose) opts.onClose(); }
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) { if (e.target.closest('.sm-tx')) return; next(false); return; }
      if (b.hasAttribute('data-smx')) close(); else if (b.hasAttribute('data-smn')) next(false); else if (b.hasAttribute('data-smp')) { if (i > 0) { i--; show(); } } else if (b.hasAttribute('data-sma')) { auto = !auto; show(); }
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    doc.addEventListener('keydown', function onKey(e) { if (dead) { doc.removeEventListener('keydown', onKey); return; } if (e.key === 'ArrowRight') next(false); else if (e.key === 'ArrowLeft' && i > 0) { i--; show(); } });
    if (dlg.showModal) dlg.showModal(); show();
    return { close: close };
  }

  /** 세계 5 상세 화면 위쪽의 시작 카드 */
  function card(model, assets, esc) {
    if (!model) return '<div class="cs-card sm-card"><p class="cs-sum">전생 이야기를 만들지 못했습니다. 아래 챕터 목록에서 기존 이야기를 읽을 수 있습니다.</p></div>';
    var img = imageOf(model, assets);
    return '<div class="cs-card sm-card"><div class="sm-th' + (img ? '' : ' none') + '"' + (img ? ' style="background-image:url(' + E(img) + ')"' : '') + '>' + (img ? '' : '<span aria-hidden="true">前</span>') + '</div><div><p class="cs-ct">내 사주로 만든 창작 전생 서사</p><h4>' + E(model.hero || model.title) + '</h4>' +
      '<p class="cs-sum">' + model.frames.length + '개의 컷 · 컷마다 이어서 읽기, 자동 재생, 건너뛰기를 고를 수 있습니다.</p><button type="button" class="btn gold big" data-smopen>무빙툰으로 감상하기</button></div></div>';
  }

  R.Samsara = { fromChapters: fromChapters, toonCard: toonCard, fromHtml: fromHtml, fromDom: fromDom, extract: extract, open: open, card: card, imageOf: imageOf, videoOf: videoOf, dwell: dwell, NOTICE: NOTICE };
})(typeof window !== 'undefined' ? window : globalThis);
