// CinemaRender — 시네마틱 장면 렌더러.  html(): 순수 함수(문자열) · play(): 풀스크린 순차 재생 · mount(): 리더 안에서 화면에 들어오면 재생.
// 모든 움직임은 transform / opacity 기반 CSS 애니메이션(가능한 한 filter 는 blur-in·focus-pull 에만). 시각 값은 CSS 변수로 넘기고 JS 는 타이밍만 정한다.
// prefers-reduced-motion: 카메라 움직임·parallax·큰 slide 제거, typewriter 는 단순 페이드로. 정보(문장)는 그대로 나온다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var C = function () { return R.Cinema; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var EL_COLOR = { wood: '#5E9E78', fire: '#D0634A', earth: '#BC9C62', metal: '#AEB9C6', water: '#4A7AB5' };

  // 카메라 폭(강도별 확대 비율) · 패닝 거리(%)
  function camVars(c, reduce) {
    var amp = C().INTENSITY_SCALE[Math.max(0, Math.min(4, c.motionIntensity | 0))] || 0;
    if (reduce || c.imageMotion === 'none' || !amp) return { amp: 1, pan: 0, on: false };
    return { amp: 1 + amp, pan: Math.round(amp * 60 * 10) / 10, on: true };
  }
  // 글자 단위로 쪼개는 애니메이션(word-reveal / typewriter): span 마다 지연을 준다. 줄바꿈 접근성 위해 aria-label 유지.
  function splitInner(text, anim, reduce) {
    if (reduce || (anim !== 'word-reveal' && anim !== 'typewriter')) return esc(text);
    var out = '', i = 0;
    if (anim === 'word-reveal') String(text).split(/(\s+)/).forEach(function (w) { if (/^\s+$/.test(w)) out += ' '; else if (w) out += '<i class="cn-w" style="--i:' + (i++) + '">' + esc(w) + '</i>'; });
    else String(text).split('').forEach(function (ch) { out += ch === ' ' ? ' ' : '<i class="cn-c" style="--i:' + (i++) + '">' + esc(ch) + '</i>'; });
    return '<span aria-hidden="true">' + out + '</span><span class="cn-sr">' + esc(text) + '</span>';
  }

  // scene → 장면 HTML. o: { media: asset|null, reduce, color, layers, actChange }
  function html(scene, o) {
    o = o || {}; var K = C(), b = K.build(scene, o.layers), c = b.c, segs = b.segments, tm = b.timing, reduce = !!o.reduce;
    var cv = camVars(c, reduce), trans = K.limitTransition(c, !!o.actChange);
    var m = o.media, pc = o.color || EL_COLOR[(scene.mediaIntent && scene.mediaIntent.elements && scene.mediaIntent.elements[0]) || 'water'];
    var bg = '';
    if (scene.bg !== 'black' && m) {
      var vid = /video|transition/i.test(m.type || '') && (m.url || m.webmUrl) && !o.saveData;
      bg = vid ? '<video class="cn-media" muted playsinline loop preload="metadata" poster="' + esc(m.posterUrl || '') + '" data-w="' + esc(m.webmUrl || '') + '" data-m="' + esc(m.url || '') + '" aria-hidden="true"></video>'
        : (m.url || m.posterUrl) ? '<img class="cn-media" src="' + esc(m.posterUrl && /video|transition/i.test(m.type || '') ? m.posterUrl : (m.url || m.posterUrl)) + '" alt="" decoding="async">' : '';
    }
    if (!bg && scene.bg !== 'black') bg = '<div class="cn-ph" aria-hidden="true"></div>';
    var first = {}; segs.forEach(function (s, i) { if (first[s.block] == null) first[s.block] = i; });
    var blocks = {}; segs.forEach(function (s, i) { (blocks[s.block] = blocks[s.block] || []).push(i); });
    var order = Object.keys(blocks).map(Number).sort(function (a, b) { return a - b; });
    var txt = '';
    order.forEach(function (bk, bi) {
      var idxs = blocks[bk], nextBlockAt = order[bi + 1] != null ? tm.at[blocks[order[bi + 1]][0]] : null;
      txt += '<div class="cn-blk"' + (nextBlockAt != null ? ' style="--out:' + (nextBlockAt - 150) + 'ms"' : '') + '>';
      idxs.forEach(function (i, k) {
        var s = segs[i], nx = k < idxs.length - 1 ? tm.at[idxs[k + 1]] : null;
        var anim = reduce && /^(slide|parallax|typewriter|word|zoom|blur|focus|impact)/.test(s.animation) ? 'fade' : s.animation;
        txt += '<p class="cn-seg" data-e="' + s.emphasis + '"' + (s.name ? ' data-nm="1"' : '') + ' data-a="' + esc(anim) + '" style="--at:' + tm.at[i] + 'ms;' + (nx != null ? '--nx:' + nx + 'ms;' : '') + '">' + splitInner(s.text, anim, reduce) + '</p>';
      });
      txt += '</div>';
    });
    var prof = '';
    if (scene.profile && scene.profile.length) {
      prof = '<dl class="cn-prof">' + scene.profile.map(function (r, i) { return '<div class="cn-row" style="--at:' + (tm.at[Math.min(i, tm.at.length - 1)] || 0) + 'ms"><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>'; }).join('') + '</dl>';
      txt = ''; // 프로필 카드는 카드 자체가 텍스트
    }
    var sub = scene.sub ? '<p class="cn-sub" style="--at:' + (tm.end + 200) + 'ms">' + esc(scene.sub).replace(/\n/g, '<br>') + '</p>' : '';
    var firstImpact = -1; segs.forEach(function (s, i) { if (firstImpact < 0 && s.emphasis === 'impact') firstImpact = i; });
    var dimAt = firstImpact >= 0 ? Math.max(0, tm.at[firstImpact] - 350) : -1;
    var style = '--cn-ov:' + c.overlayStrength + ';--cn-fx:' + Math.round(c.focalPoint.x * 100) + '%;--cn-fy:' + Math.round(c.focalPoint.y * 100) + '%;--cn-dur:' + tm.total + 'ms;--cn-amp:' + cv.amp + ';--cn-pan:' + cv.pan + '%;--pc:' + pc + ';' + (dimAt >= 0 ? '--dim-at:' + dimAt + 'ms;' : '');
    var cls = 'cn-scene' + (cv.on ? ' cn-cam-on' : '') + (dimAt >= 0 ? ' cn-has-impact' : '') + (reduce ? ' cn-reduce' : '') + (scene.kind === 'profile' ? ' cn-k-profile' : '') + (scene.kind === 'title' ? ' cn-k-title' : '');
    return '<section class="' + cls + '" data-sc="' + esc(scene.sceneId || '') + '" data-cn-type="' + c.sceneType + '" data-cn-preset="' + (c.preset || '') + '" data-pos="' + c.textPosition + '" data-size="' + c.textSize + '" data-mi="' + c.motionIntensity + '" data-pace="' + c.pacing + '" data-motion="' + (cv.on ? c.imageMotion : 'none') + '" data-tr="' + trans + '" data-bgm="' + c.bgmMood + '" data-nm-e="' + c.nameEmphasis + '" style="' + style + '">' +
      '<div class="cn-bg"><div class="cn-cam">' + bg + '</div></div><div class="cn-dim" aria-hidden="true"></div><div class="cn-txt">' + (o.kicker ? '<div class="cn-kick">' + esc(o.kicker) + '</div>' : '') + txt + prof + sub + '</div></section>';
  }

  // ── DOM 쪽 ──
  function loadMedia(el) { // 영상은 화면에 올릴 때 소스를 붙이고 재생(그 전에는 preload 만)
    [].forEach.call(el.querySelectorAll('video.cn-media'), function (v) {
      if (!v.dataset.ready) { v.dataset.ready = 1; if (v.dataset.w && v.canPlayType && v.canPlayType('video/webm')) { var a = document.createElement('source'); a.src = v.dataset.w; a.type = 'video/webm'; v.appendChild(a); } if (v.dataset.m) { var b = document.createElement('source'); b.src = v.dataset.m; b.type = 'video/mp4'; v.appendChild(b); } v.addEventListener('error', function () { var p = v.getAttribute('poster'); if (p) { var im = new Image(); im.src = p; im.alt = ''; im.className = 'cn-media'; v.replaceWith(im); } }, true); v.load(); }
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () { });
    });
  }
  function preload(media) { if (!media) return; var u = media.posterUrl || (!/video|transition/i.test(media.type || '') ? media.url : ''); if (u) { var im = new Image(); im.src = u; } }

  // stage 안에서 scenes 를 차례로 재생한다.
  //  o: { reduce, mediaFor(scene) → asset, onScene(scene, c), onEnd(kind), skippable, label }  반환: { pause, resume, skip, destroy }
  function play(stage, scenes, o) {
    o = o || {}; var K = C(), idx = -1, cur = null, timer = 0, paused = false, t0 = 0, left = 0, dead = false, started = 0, doc = root.document;
    stage.classList.add('cn-stage'); stage.innerHTML = '';
    var ui = doc.createElement('div'); ui.className = 'cn-ui';
    ui.innerHTML = '<button type="button" class="cn-skip">' + esc(o.skipLabel || '건너뛰기 ›') + '</button><div class="cn-pause" aria-hidden="true">❚❚</div><div class="cn-prog" aria-hidden="true"><i></i></div>';
    stage.appendChild(ui);
    var skipBtn = ui.querySelector('.cn-skip'), pauseEl = ui.querySelector('.cn-pause'), progEl = ui.querySelector('.cn-prog i');
    stage.setAttribute('role', 'region'); stage.setAttribute('aria-label', o.label || '운의 흐름을 영화처럼 보는 장면');
    var items = scenes.map(function (s, i) { return { s: s, media: o.mediaFor ? o.mediaFor(s) : null, i: i }; });

    function sceneEl(it) {
      var tmp = doc.createElement('div'); tmp.innerHTML = html(it.s, { media: it.media, reduce: o.reduce, layers: o.layers, saveData: o.saveData, actChange: it.s.actChange });
      return tmp.firstChild;
    }
    function setProg() { var done = idx >= 0 ? idx : 0, total = items.length; progEl.style.transform = 'scaleX(' + Math.min(1, (done + 1) / total) + ')'; }
    function go(n) {
      if (dead) return; clearTimeout(timer);
      if (n >= items.length) { end('completed'); return; }
      var prev = cur, it = items[n], el = sceneEl(it), tr = el.getAttribute('data-tr') || 'crossfade', dur = o.reduce || tr === 'hard-cut' ? 0 : (tr === 'dip-black' || tr === 'dip-white' ? 520 : 760);
      idx = n; setProg(); stage.insertBefore(el, ui); loadMedia(el);
      el.classList.add('cn-in', 'cn-tr-' + (o.reduce ? 'fade' : tr)); if (paused) el.classList.add('cn-paused');
      cur = el; var run = function () { void el.offsetWidth; el.classList.add('cn-run'); };
      if (prev) { prev.classList.add('cn-leave', 'cn-tr-' + (o.reduce ? 'fade' : tr)); setTimeout(function () { if (prev.parentNode) prev.remove(); }, dur + 60); }
      var seq = it.s._built || (it.s._built = K.build(it.s, o.layers)); // 시간 계산은 html() 과 같은 규칙
      var total = seq.timing.total + (it.s.cinema && it.s.cinema.pauseAfter || 0) * 0;
      if (dur && (tr === 'dip-black' || tr === 'dip-white') && prev) setTimeout(run, dur * 0.6); else run();
      if (o.onScene) try { o.onScene(it.s, seq.c, el); } catch (e) { }
      if (items[n + 1]) preload(items[n + 1].media); // 다음 장면만 미리 불러온다(그 뒤는 지연 로드)
      left = total; t0 = Date.now(); if (!paused) timer = setTimeout(function () { go(n + 1); }, left);
    }
    function pause() { if (paused || dead) return; paused = true; clearTimeout(timer); left = Math.max(200, left - (Date.now() - t0)); if (cur) cur.classList.add('cn-paused'); pauseEl.classList.add('on'); [].forEach.call(stage.querySelectorAll('video'), function (v) { try { v.pause(); } catch (e) { } }); }
    function resume() { if (!paused || dead) return; paused = false; if (cur) { cur.classList.remove('cn-paused'); loadMedia(cur); } pauseEl.classList.remove('on'); t0 = Date.now(); var n = idx; timer = setTimeout(function () { go(n + 1); }, left); }
    function end(kind) { if (dead) return; destroy(); if (o.onEnd) o.onEnd(kind); }
    function destroy() { dead = true; clearTimeout(timer); doc.removeEventListener('keydown', key); stage.removeEventListener('click', tap); stage.innerHTML = ''; stage.classList.remove('cn-stage'); }
    function tap(e) { if (e.target.closest('.cn-skip')) return; if (paused) resume(); else pause(); }
    function key(e) { if (e.key === ' ') { e.preventDefault(); paused ? resume() : pause(); } else if (e.key === 'Escape') end('skipped'); else if (e.key === 'ArrowRight' || e.key === 'Enter') go(idx + 1); }
    stage.addEventListener('click', tap); doc.addEventListener('keydown', key); skipBtn.onclick = function (e) { e.stopPropagation(); end('skipped'); }; skipBtn.hidden = o.skippable === false;
    started = Date.now(); go(0);
    return { pause: pause, resume: resume, skip: function () { end('skipped'); }, next: function () { go(idx + 1); }, destroy: destroy, state: function () { return { idx: idx, paused: paused, total: items.length, elapsed: Date.now() - started }; } };
  }

  // 리더 안의 단발 장면(kind 'cinemaScene'): 화면에 들어오면 재생, 나가면 멈춤(다시 들어오면 처음부터)
  function mount(el, scene, o) {
    o = o || {}; var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var sc = e.target.querySelector('.cn-scene'); if (!sc) return;
        if (e.isIntersecting) { if (!sc.classList.contains('cn-run')) { void sc.offsetWidth; sc.classList.add('cn-run'); loadMedia(sc); } }
        else if (sc.classList.contains('cn-run') && !o.once) { sc.classList.remove('cn-run'); }
      });
    }, { threshold: 0.55 });
    io.observe(el); return { destroy: function () { io.disconnect(); } };
  }

  // 리더(스크롤 화면) 안의 연출 시작 장치:
  //  ① .cn-cam-on 장면의 이미지에 카메라 모션  ② .s-cinema 단발 시네마 장면  ③ .rs 문장 분절 reveal
  function watch(rootEl, o) {
    o = o || {}; var doc = root.document; if (!rootEl || !root.IntersectionObserver) return null;
    [].forEach.call(rootEl.querySelectorAll('.cn-cam-on'), function (sc) { [].forEach.call(sc.querySelectorAll('.media img, .media video, .media .ph, .bg img, .bg video, .bg .ph'), function (e) { e.classList.add('cn-cam'); }); });
    // 데이터 장면(그래프): 대시보드처럼 갑자기 나타나지 않고, 막대가 한 줄씩 자라난다(모션 그래픽). reduced-motion 이면 건드리지 않는다.
    if (!o.reduce) [].forEach.call(rootEl.querySelectorAll('figure[role="img"]'), function (fig) {
      var bars = [].filter.call(fig.querySelectorAll('i'), function (b) { return /left:0;top:0;bottom:0;width/.test(b.getAttribute('style') || ''); });
      if (!bars.length) return; bars.forEach(function (b, i) { b.setAttribute('data-bar', '1'); b.style.setProperty('--r', i); }); fig.classList.add('cn-data-fig');
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var el = e.target;
        if (el.classList.contains('cn-data-fig')) { if (e.isIntersecting) { el.classList.add('cn-go'); io.unobserve(el); } }
        else if (el.classList.contains('cn-cam-on')) { if (e.isIntersecting) el.classList.add('cn-run'); else el.classList.remove('cn-run'); }
        else if (el.classList.contains('s-cinema')) { var sc = el.querySelector('.cn-scene'); if (!sc) return; if (e.isIntersecting) { if (!sc.classList.contains('cn-run')) { void sc.offsetWidth; sc.classList.add('cn-run'); loadMedia(sc); } } else if (sc.classList.contains('cn-run')) sc.classList.remove('cn-run'); }
        else if (el.classList.contains('rs-host')) { if (e.isIntersecting) { el.classList.add('rs-go'); io.unobserve(el); } }
      });
    }, { threshold: 0.4 });
    [].forEach.call(rootEl.querySelectorAll('.cn-cam-on, .s-cinema, .rs-host, .cn-data-fig'), function (e) { io.observe(e); });
    return { destroy: function () { io.disconnect(); } };
  }
  // 긴 문장을 호흡 단위(.rs)로 나눠 차례로 나타낸다. 텍스트는 그대로(공백으로 이어 읽힘). reduced-motion 이면 건드리지 않는다.
  var REVEAL_ROLES = '[data-tx="insight.lead"],[data-tx="explain.lead"],[data-tx="choice.line"],[data-tx="end.quote"]';
  function revealify(rootEl, o) {
    o = o || {}; if (o.reduce || !rootEl || !C()) return;
    [].forEach.call(rootEl.querySelectorAll(REVEAL_ROLES), function (el) {
      if (el.classList.contains('rs-host') || el.querySelector('.rs')) return;
      var t = el.cloneNode(true); [].forEach.call(t.querySelectorAll('br'), function (br) { br.replaceWith('\n'); });
      var text = t.textContent.trim(); if (!text || text.length > 700) return;
      var lines = text.split(/\n/), idx = 0, all = [];
      var per = lines.map(function (ln) { var sg = C().splitSegments(ln, { impact: false }); all = all.concat(sg); return sg; });
      if (all.length < 2) return;
      var step = Math.min(260, 3000 / all.length), htmlOut = [];
      per.forEach(function (sg, li) {
        sg.forEach(function (s, k) {
          var last = li === per.length - 1 && k === sg.length - 1, e = last && all.length > 2 ? 'impact' : s.emphasis === 'impact' ? 'normal' : s.emphasis;
          htmlOut.push('<span class="rs" data-e="' + e + '" style="--d:' + Math.round(idx * step + (e === 'pause' ? 0 : 0)) + 'ms">' + esc(s.text) + '</span>'); idx += e === 'pause' || e === 'impact' ? 1.6 : 1;
        });
        if (li < per.length - 1) htmlOut.push('<br>');
      });
      el.innerHTML = htmlOut.join(' '); el.classList.add('rs-host');
    });
  }

  R.CinemaRender = { watch: watch, revealify: revealify, html: html, play: play, mount: mount, camVars: camVars, splitInner: splitInner, EL_COLOR: EL_COLOR };
})(typeof window !== 'undefined' ? window : globalThis);
