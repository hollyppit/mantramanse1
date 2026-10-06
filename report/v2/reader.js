// Reading Flow — 무빙툰 본문을 "하나의 긴 문서"로 읽게 하는 층. 글자는 움직이지 않고, 화면(스크롤)과 배경이 움직인다.
//  ① 문서를 읽기 페이지(한 화면에 편하게 들어오는 덩어리)로 나눈다  ② 페이지마다 읽는 시간을 정한다(글자 수 추정 또는 음성 종료)
//  ③ MOVE → HOLD 리듬으로 다음 페이지로 천천히 넘긴다(일정 속도로 흐르지 않는다)  ④ 사용자가 직접 스크롤하면 즉시 멈춘다
//  ⑤ 고정 배경(StickyMediaBackground)을 현재 섹션에 맞춰 crossfade  ⑥ 하단 컨트롤러·상단 진행률
// 음성(TTS)·효과음은 쓰지 않는다. 읽는 시간은 글자 수로 추정한 값이고(BGM·음성과 무관), 재생 속도(playbackRate 0.5~3x)는 머묾·이동·진행 시간에 곱해진다.
// 상태: IDLE → PLAYING ⇄ PAUSED · PLAYING → USER_READING(직접 스크롤) → PLAYING · … → ENDED
// paginate / estimate / anchorY / clean 은 순수 함수라 Node 에서도 검증한다(tests/reader-sim.js).
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var DEFAULTS = { auto: true, startDelay: 1.5, stopAtChoice: true, readSpeed: 6.5, bgMotion: 1, playbackRate: 1 };
  var RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  var num = function (v, lo, hi, d) { v = v === '' || v == null ? NaN : +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  // 관리자 "읽기 모드" 설정(= 저장된 flow). 예전 연출 필드(anim·duration…)는 읽지 않고 그대로 둔다(스키마 삭제 없음).
  function clean(f) {
    f = f && typeof f === 'object' ? f : {}; var D = DEFAULTS;
    return { auto: f.auto !== false, startDelay: num(f.startDelay, 0, 10, D.startDelay), stopAtChoice: f.stopAtChoice !== false,
      readSpeed: num(f.readSpeed, 3, 12, D.readSpeed), bgMotion: Math.round(num(f.bgMotion, 0, 2, D.bgMotion)), playbackRate: RATES.indexOf(+f.playbackRate) >= 0 ? +f.playbackRate : D.playbackRate };
  }
  // 읽는 시간(초): 글자 수 ÷ 초당 글자 수 + 호흡. 글이 없는 요소(그래프 등)는 호출하는 쪽이 따로 정한다.
  function estimate(text, speed) { var n = String(text || '').replace(/\s+/g, '').length; return n ? 0.6 + n / (speed || DEFAULTS.readSpeed) : 0; }
  // items: 문서 순서대로 [{ top, bottom, text, dur, hd, sec, el }] (hd: 헤더 섹션이면 그 섹션 — 헤더는 본문과 한 페이지에 섞지 않는다)
  // 한 페이지 = 화면 높이의 약 60% 안에 들어오는 연속된 요소들. 작은 문단마다 넘기지 않고, 큰 요소는 혼자 한 페이지가 된다.
  function paginate(items, vh) {
    var limit = vh * 0.6, pages = [], cur = null;
    items.forEach(function (it) {
      if (!cur || it.hd !== cur.hd || it.bottom - cur.top > limit) { cur = { items: [], top: it.top, bottom: it.bottom, hd: it.hd, sec: it.sec, dur: 0 }; pages.push(cur); }
      cur.items.push(it); cur.bottom = Math.max(cur.bottom, it.bottom); cur.dur += it.dur;
    });
    pages.forEach(function (p) { p.dur = Math.max(2.2, p.dur) + (p.hd ? 1 : 0); }); // 헤더는 약 1초 더 머문다
    return pages;
  }
  // 읽는 줄(화면 높이의 약 44%)에 페이지 가운데가 오도록. 페이지가 화면보다 크면 위쪽(약 14%)에 맞춘다.
  function anchorY(p, vh, maxY) { var h = p.bottom - p.top, y = h <= vh * 0.7 ? p.top + h / 2 - vh * 0.44 : p.top - vh * 0.14; return Math.max(0, Math.min(Math.max(0, maxY), Math.round(y))); }
  var fmt = function (s) { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  /* ── 고정 배경: 두 겹을 번갈아 crossfade. 현재 영상 하나만 재생하고 다음 것은 이미지로 미리 불러온다. ── */
  function makeBg(host, o) {
    var doc = root.document, el = doc.createElement('div'); el.className = 'rd-bg'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="rd-bgl"></div><div class="rd-bgl"></div><div class="rd-shade"></div>'; host.insertBefore(el, host.firstChild);
    var L = [].slice.call(el.querySelectorAll('.rd-bgl')), on = 0, key = null, mc = 'm' + (o.reduce ? 0 : o.motion);
    function clear(l) { [].forEach.call(l.querySelectorAll('video'), function (v) { try { v.pause(); } catch (e) { } }); l.innerHTML = ''; }
    function probe(img, layer) { // 밝은 이미지 위에 흰 글자가 얹히지 않도록 어둡게 덮는 정도를 올린다(같은 출처 이미지만 측정 가능)
      try {
        var c = doc.createElement('canvas'); c.width = c.height = 12; var g = c.getContext('2d'); g.drawImage(img, 0, 0, 12, 12); var d = g.getImageData(0, 0, 12, 12).data, s = 0;
        for (var i = 0; i < d.length; i += 4) s += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s /= 144;
        layer.style.setProperty('--rd-ov', String(Math.min(0.85, 0.5 + Math.max(0, s - 0.35) * 0.7)));
      } catch (e) { /* 다른 출처 이미지는 측정하지 않는다 */ }
    }
    function fill(layer, m, color) {
      clear(layer); layer.className = 'rd-bgl ' + mc; layer.style.removeProperty('--rd-ov');
      if (m === 'black') { layer.classList.add('black'); return; }
      if (!m) { var ph = doc.createElement('div'); ph.className = 'ph'; ph.style.setProperty('--pc', color || '#4A5A8A'); layer.appendChild(ph); return; }
      var vid = /video|transition/i.test(m.type || '') && (m.url || m.webmUrl) && !o.saveData;
      function still() { var u = m.posterUrl && /video|transition/i.test(m.type || '') ? m.posterUrl : (m.url || m.posterUrl); if (!u) return null; var im = new Image(); im.alt = ''; im.decoding = 'async'; im.onload = function () { probe(im, layer); }; im.src = u; return im; }
      if (vid) {
        var v = doc.createElement('video'); v.muted = true; v.defaultMuted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; if (m.posterUrl) v.poster = m.posterUrl;
        if (m.webmUrl && v.canPlayType && v.canPlayType('video/webm')) { var a = doc.createElement('source'); a.src = m.webmUrl; a.type = 'video/webm'; v.appendChild(a); }
        if (m.url) { var b = doc.createElement('source'); b.src = m.url; b.type = 'video/mp4'; v.appendChild(b); }
        v.addEventListener('error', function () { var im = still(); if (im && v.parentNode) v.replaceWith(im); }, true);
        layer.appendChild(v); var pr = v.play(); if (pr && pr.catch) pr.catch(function () { });
      } else { var im = still(); if (im) layer.appendChild(im); }
    }
    function show(m, color, dip) {
      var k = m === 'black' ? 'black' : m ? (m.assetId || m.url || m.posterUrl || 'm') : 'ph:' + color; if (k === key) return; key = k;
      var next = L[1 - on], cur = L[on]; fill(next, m, color); el.classList.toggle('dip', !!dip && !o.reduce);
      void next.offsetWidth; next.classList.add('on'); cur.classList.remove('on'); on = 1 - on;
      clearTimeout(cur._t); cur._t = setTimeout(function () { if (!cur.classList.contains('on')) clear(cur); }, 1500);
    }
    function preload(m) { if (!m || m === 'black') return; var u = m.posterUrl || (!/video|transition/i.test(m.type || '') ? m.url : ''); if (u) { var im = new Image(); im.src = u; } }
    function destroy() { L.forEach(clear); if (el.parentNode) el.parentNode.removeChild(el); }
    return { show: show, preload: preload, destroy: destroy };
  }

  /* ── 문서 → 읽기 요소(소리 내어 읽을 단위) ── */
  var UNIT = 'h2,h3,p,li,figure,.months,.tl,.chain,.strategy,.check label';
  var MEDIA_UNIT = /(^|\s)(months|tl|chain)(\s|$)/;
  function unitsOf(sec) {
    var all = [].slice.call(sec.querySelectorAll(UNIT)), out = all.filter(function (u) { return !all.some(function (o) { return o !== u && o.contains(u); }); });
    return out.length ? out : [sec];
  }
  var textOf = function (u) { return (u.textContent || '').replace(/\s+/g, ' ').trim(); };

  // host: 문서 컨테이너(#chapter). o: { flow, reduce, saveData, bgList, autoStart, bgm, onSection(sec), onEnd(), label }
  function mount(host, o) {
    o = o || {}; var doc = root.document, win = root, f = clean(o.flow), reduce = !!o.reduce, view = host.closest('.view') || doc.body;
    var bg = makeBg(view, { reduce: reduce, motion: f.bgMotion, saveData: o.saveData });
    var pages = [], secs = [], offs = [], total = 0, state = 'IDLE', pi = 0, timer = 0, tStart = 0, remain = 0, userMoved = false, pausedBy = '', tween = 0, tweenGuard = 0, curSec = null, dead = false, tick = 0, touchY = 0, scrollOn = true;
    var rate = f.playbackRate, pageMs = function (p) { return p.dur * 1000 / rate; }; // 재생 속도: 머묾·이동·진행 시간에 적용

    /* 컨트롤러 */
    var ctl = doc.createElement('div'); ctl.className = 'rd-ctl'; ctl.setAttribute('role', 'group'); ctl.setAttribute('aria-label', '읽기 컨트롤');
    ctl.innerHTML = '<div class="rd-seek" role="progressbar" aria-label="진행률" aria-valuemin="0" aria-valuemax="100"><i></i></div><div class="rd-row"><button type="button" class="rd-play" aria-label="재생"></button><span class="rd-time">00:00 / 00:00</span><span class="rd-gap"></span>' +
      '<button type="button" class="rd-tg" data-k="scroll" aria-pressed="true">스크롤</button>' + (o.bgm ? '<button type="button" class="rd-tg" data-k="bgm" aria-pressed="true">BGM</button>' : '') + '</div>';
    var note = doc.createElement('div'); note.className = 'rd-note'; note.setAttribute('aria-live', 'polite'); note.hidden = true;
    doc.body.appendChild(ctl); doc.body.appendChild(note); doc.body.classList.add('rd-on');
    var $c = function (s) { return ctl.querySelector(s); }, playBtn = $c('.rd-play'), timeEl = $c('.rd-time'), seekEl = $c('.rd-seek'), fillEl = $c('.rd-seek i');
    var showNote = function (t, ms) { clearTimeout(note._t); if (!t) { note.hidden = true; return; } note.textContent = t; note.hidden = false; if (ms) note._t = setTimeout(function () { note.hidden = true; }, ms); };
    function elapsed() {
      var p = pages[pi]; if (!p) return 0; var pm = pageMs(p), inp = (pm - remain + (state === 'PLAYING' ? Date.now() - tStart : 0)) / pm;
      return offs[pi] + p.dur * Math.min(1, Math.max(0, inp)); // 문서 시간(1x 기준) — 화면 표시는 배속으로 나눈다
    }
    function ui() {
      var e = elapsed(), fr = total ? Math.min(1, e / total) : 0;
      playBtn.textContent = state === 'PLAYING' ? '❚❚' : state === 'ENDED' ? '↻' : '▶'; playBtn.setAttribute('aria-label', state === 'PLAYING' ? '일시정지' : state === 'ENDED' ? '처음부터 다시 보기' : state === 'USER_READING' ? '자동 진행' : '재생');
      playBtn.classList.toggle('resume', state === 'USER_READING');
      timeEl.textContent = fmt(e / rate) + ' / ' + fmt(total / rate) + (rate !== 1 ? ' · ' + rate + 'x' : ''); fillEl.style.transform = 'scaleX(' + fr + ')'; seekEl.setAttribute('aria-valuenow', String(Math.round(fr * 100)));
      var s = $c('[data-k="scroll"]'), b = $c('[data-k="bgm"]'); if (s) s.setAttribute('aria-pressed', String(scrollOn));
      if (b) b.setAttribute('aria-pressed', String(!(o.bgm.isMuted() || o.bgm.blocked())));
      if (o.onProgress) o.onProgress(fr);
    }

    /* 스크롤 이동: 재생 타임라인과 같이 도는 짧은 tween(끝나면 멈춘다). 읽는 동안은 아무것도 움직이지 않는다. */
    var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    function cancelTween() { if (tween) { win.cancelAnimationFrame(tween); tween = 0; } clearTimeout(tweenGuard); tweenGuard = 0; }
    function moveTo(y, ms) {
      cancelTween(); y = Math.max(0, Math.round(y)); var y0 = win.scrollY;
      if (reduce || ms <= 0 || Math.abs(y - y0) < 2) { win.scrollTo(0, y); return; }
      var t0 = win.performance.now();
      (function step(t) { var p = Math.min(1, (t - t0) / ms); win.scrollTo(0, y0 + (y - y0) * ease(p)); if (p < 1 && !dead) tween = win.requestAnimationFrame(step); else tween = 0; })(t0);
      tweenGuard = setTimeout(function () { if (tween && !dead) { win.cancelAnimationFrame(tween); tween = 0; win.scrollTo(0, y); } }, ms + 120);
    }

    /* 측정: 레이아웃을 읽는 건 문서를 만들 때·창 크기가 바뀔 때뿐(재생 중 프레임마다 읽지 않는다) */
    function measure() {
      var vh = win.innerHeight, sy = win.scrollY, items = [], keep = pages[pi] && pages[pi].items[0] && pages[pi].items[0].el;
      secs = [].slice.call(host.querySelectorAll('.rd-sec'));
      secs.forEach(function (sec) {
        var hd = sec.classList.contains('rd-head') ? sec : null;
        unitsOf(sec).forEach(function (u) {
          var r = u.getBoundingClientRect(), media = u === sec || u.tagName === 'FIGURE' || MEDIA_UNIT.test(u.className || ''), text = media ? '' : textOf(u);
          if (!text && !media) return; items.push({ top: r.top + sy, bottom: r.bottom + sy, text: text, dur: text ? estimate(text, f.readSpeed) : (u === sec ? 2 : 4), hd: hd, sec: sec, el: u });
        });
      });
      pages = paginate(items, vh); total = 0; offs = []; var maxY = doc.documentElement.scrollHeight - vh;
      pages.forEach(function (p) {
        offs.push(total); total += p.dur; p.y = anchorY(p, vh, maxY); p.choice = false;
      });
      secs.forEach(function (sec) { if (sec.querySelector('.vd,[data-stop]')) { for (var i = pages.length - 1; i >= 0; i--) if (pages[i].sec === sec || pages[i].items.some(function (x) { return x.sec === sec; })) { pages[i].choice = true; break; } } });
      if (keep) for (var i = 0; i < pages.length; i++) if (pages[i].items.some(function (x) { return x.el === keep; })) { if (i !== pi) { pi = i; if (state !== 'PLAYING') remain = pages[i].dur * 1000 / rate; } break; }
      if (!remain && pages[pi]) remain = pages[pi].dur * 1000 / rate; ui();
    }

    /* 현재 섹션: 배경 crossfade · 다음 배경 미리 불러오기 · 바깥(뷰어)에 알림 */
    function bgOf(sec) { var k = sec.getAttribute('data-bg'); return k == null ? undefined : k === '-1' ? 'black' : k === '-2' ? null : (o.bgList || [])[+k]; }
    function setCur(sec) {
      if (!sec || sec === curSec) return; curSec = sec; var m = bgOf(sec);
      if (m !== undefined) bg.show(m, sec.getAttribute('data-pc') || '#4A5A8A', sec.hasAttribute('data-dip'));
      var at = secs.indexOf(sec), n = 0; for (var i = at + 1; i < secs.length && n < 8; i++, n++) { var mm = bgOf(secs[i]); if (mm !== undefined) { bg.preload(mm); break; } }
      if (state !== 'PLAYING' && (userMoved || state === 'IDLE' || state === 'USER_READING')) for (var j = 0; j < pages.length; j++) if (pages[j].sec === sec || pages[j].items.some(function (x) { return x.sec === sec; })) { if (j !== pi) { pi = j; remain = pages[j].dur * 1000 / rate; } break; }
      if (o.onSection) o.onSection(sec); ui();
    }

    /* 재생 엔진 */
    function clearTimers() { clearTimeout(timer); timer = 0; }
    function halt(st) { if (state === 'PLAYING') remain = Math.max(300, remain - (Date.now() - tStart)); clearTimers(); cancelTween(); state = st; ui(); }
    function nearest() {
      var line = win.scrollY + win.innerHeight * 0.44, best = 0, bd = 1e9;
      for (var i = 0; i < pages.length; i++) { var p = pages[i]; if (p.top <= line && line <= p.bottom) return i; var d = Math.min(Math.abs(p.top - line), Math.abs(p.bottom - line)); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    function begin() { tStart = Date.now(); timer = setTimeout(next, Math.max(300, remain - Math.min(250, remain * 0.3))); } // 다음 페이지 이동은 읽기가 끝나기 조금 전에 시작
    function next() { if (state !== 'PLAYING' || dead) return; startPage(pi + 1); }
    function startPage(i) {
      if (dead) return; clearTimers(); if (i >= pages.length) { finish(); return; } pi = Math.max(0, i); var p = pages[pi]; userMoved = false;
      if (scrollOn) moveTo(p.y, Math.max(260, Math.min(900, Math.max(420, Math.abs(p.y - win.scrollY) * 0.7)) / Math.max(1, rate * 0.6))); // MOVE (0.4~0.9초) 뒤에는 움직이지 않는다 = HOLD
      setCur(p.sec); remain = pageMs(p);
      if (f.stopAtChoice && p.choice && !p.choiceDone) { p.choiceDone = true; state = 'PAUSED'; pausedBy = 'choice'; ui(); showNote('선택하면 이어집니다'); return; }
      ui(); begin();
    }
    function finish() { clearTimers(); state = 'ENDED'; pi = Math.max(0, pages.length - 1); remain = 0; ui(); if (o.onEnd) o.onEnd(); }
    function play() {
      if (dead) return; showNote('');
      if (state === 'ENDED') { state = 'PLAYING'; pausedBy = ''; startPage(0); return; }
      if (state === 'PLAYING') return;
      var resync = userMoved || state === 'USER_READING' || state === 'IDLE'; state = 'PLAYING'; pausedBy = '';
      if (resync) startPage(nearest()); else { ui(); begin(); } // 직접 스크롤했으면 지금 읽던 위치에서, 아니면 멈춘 자리에서 이어서
    }
    function pause() { if (state !== 'PLAYING') return; halt('PAUSED'); }
    function userTake() { // wheel · touchmove · 키보드 · 스크롤바: 자동 진행과 싸우지 않고 바로 양보한다
      userMoved = true; if (state === 'PLAYING') { halt('USER_READING'); showNote('자동 진행 일시정지'); } else if (state === 'IDLE') state = 'USER_READING';
      cancelTween();
    }
    function seek(fr) {
      var t = fr * total, i = 0; for (; i < pages.length - 1; i++) if (offs[i + 1] > t) break;
      if (state === 'PLAYING' || resume) { state = 'PLAYING'; pausedBy = ''; showNote(''); startPage(i); return; } pi = i; remain = pages[i].dur * 1000 / rate; userMoved = false; if (state === 'ENDED') state = 'PAUSED'; moveTo(pages[i].y, 500); setCur(pages[i].sec); ui();
    }

    /* 이벤트 */
    var inCtl = function (e) { return e.target && e.target.closest && e.target.closest('.rd-ctl'); };
    var onWheel = function (e) { if (!inCtl(e)) userTake(); };
    var onTStart = function (e) { touchY = e.touches && e.touches[0] ? e.touches[0].clientY : 0; };
    var onTMove = function (e) { if (inCtl(e)) return; var y = e.touches && e.touches[0] ? e.touches[0].clientY : touchY; if (Math.abs(y - touchY) > 8) userTake(); };
    var onKey = function (e) { if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key) && !/^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) userTake(); };
    var onPtr = function (e) { if (e.target === doc.documentElement) userTake(); }; // 스크롤바를 끌 때
    var onVis = function () { if (doc.hidden && state === 'PLAYING') halt('PAUSED'); };
    var rt = 0, onResize = function () { clearTimeout(rt); rt = setTimeout(function () { if (!dead) measure(); }, 220); };
    win.addEventListener('wheel', onWheel, { passive: true, capture: true }); win.addEventListener('touchstart', onTStart, { passive: true, capture: true }); win.addEventListener('touchmove', onTMove, { passive: true, capture: true });
    doc.addEventListener('keydown', onKey, true); doc.addEventListener('pointerdown', onPtr, true); doc.addEventListener('visibilitychange', onVis); win.addEventListener('resize', onResize);
    var ro = win.ResizeObserver ? new win.ResizeObserver(onResize) : null; if (ro) ro.observe(host);
    var io = new win.IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && state !== 'PLAYING') setCur(e.target); }); }, { rootMargin: '-44% 0px -55% 0px', threshold: 0 });
    playBtn.onclick = function () { if (state === 'PLAYING') pause(); else play(); };
    seekEl.onclick = function (e) { var r = seekEl.getBoundingClientRect(); seek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); };
    ctl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return; var k = b.dataset.k;
      if (k === 'scroll') { scrollOn = !scrollOn; showNote(scrollOn ? '' : '자동 스크롤 꺼짐 — 직접 넘겨 읽을 수 있어요', 4000); }
      else if (k === 'bgm' && o.bgm) { if (o.bgm.blocked() && !o.bgm.isMuted()) o.bgm.retry(); else o.bgm.setMuted(!o.bgm.isMuted()); }
      ui();
    });

    measure(); secs.forEach(function (s) { io.observe(s); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { if (!dead) measure(); });
    tick = setInterval(function () { if (state === 'PLAYING') ui(); else if (o.bgm) ui(); }, 500);
    if (o.autoStart !== false && f.auto) setTimeout(function () { if (!dead && state === 'IDLE') play(); }, f.startDelay * 1000);
    else if (o.autoStart === false && pages.length) { state = 'PAUSED'; }
    ui();

    function gotoEl(el, instant, resume) { // 챕터 목록 등에서 특정 위치로: 재생 중이면 그 페이지부터 이어서 읽는다
      var y = Math.max(0, el.getBoundingClientRect().top + win.scrollY - 72);
      for (var i = 0; i < pages.length; i++) if (pages[i].items.some(function (x) { return x.sec === el || el.contains(x.el); })) { if (state === 'PLAYING') { startPage(i); return; } pi = i; remain = pages[i].dur * 1000 / rate; userMoved = false; break; }
      moveTo(y, instant ? 0 : 600);
    }
    function destroy() {
      dead = true; clearTimers(); clearInterval(tick); clearTimeout(rt); cancelTween(); io.disconnect(); if (ro) ro.disconnect(); bg.destroy();
      win.removeEventListener('wheel', onWheel, true); win.removeEventListener('touchstart', onTStart, true); win.removeEventListener('touchmove', onTMove, true);
      doc.removeEventListener('keydown', onKey, true); doc.removeEventListener('pointerdown', onPtr, true); doc.removeEventListener('visibilitychange', onVis); win.removeEventListener('resize', onResize);
      [ctl, note].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }); doc.body.classList.remove('rd-on');
    }
    return { play: play, pause: pause, toggle: function () { if (state === 'PLAYING') pause(); else play(); }, state: function () { return state; }, measure: measure, gotoEl: gotoEl, destroy: destroy, pages: function () { return pages; }, flow: f,
      choiceMade: function () { if (pausedBy === 'choice' && state === 'PAUSED') setTimeout(function () { if (!dead && pausedBy === 'choice' && state === 'PAUSED') play(); }, 1800); } };
  }

  R.Reading = { RATES: RATES, DEFAULTS: DEFAULTS, clean: clean, estimate: estimate, paginate: paginate, anchorY: anchorY, fmt: fmt, mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
