// CinemaRender — 시네마틱 장면 렌더러.  html(): 순수 함수(문자열) · play(): 풀스크린 순차 재생 · mount(): 리더 안에서 화면에 들어오면 재생.
// 글자 애니메이션은 INTRO 에서만 허용한다(o.intro = allowTextAnimation). 어휘는 네 가지 + 보조 한 가지로 고정:
//   fade(FADE_IN · 일반 문장) · slow-scale-in(SLOW_SCALE_IN · 중요 문장) · ink-reveal(INK_REVEAL · 한자) · cinematic-reveal(CINEMATIC_REVEAL · 이름·運路) · blur-to-focus(보조)
//   그 밖의 값(옛 fade-up·zoom-in·typewriter …)은 모두 fade 로 그린다. 본편(BODY)·엔딩은 o.intro 가 없어 항상 단순 fade 다. 저장된 textAnimation·segments.animation 값은 지우지 않고 여기서 무시한다.
// 저사양 · prefers-reduced-motion · 데이터 절약(o.lowFx): 어휘 전체를 fade 로 대신한다. 효과음·음성은 없다. 전환은 crossfade · dip-black 두 가지뿐.
// 배속(o.rate): 문장 등장 시각·카메라·장면 길이를 rate 로 나눈다. 글자 애니메이션 길이는 CSS 에서 최소 340ms 를 지킨다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var C = function () { return R.Cinema; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var EL_COLOR = { wood: '#5E9E78', fire: '#D0634A', earth: '#BC9C62', metal: '#AEB9C6', water: '#4A7AB5' };

  // 카메라 폭(강도별 확대 비율) · 패닝 거리(%)
  function camVars(c, reduce) {
    var amp = C().INTENSITY_SCALE[Math.max(0, Math.min(2, c.motionIntensity | 0))] || 0; // 배경 움직임은 약하게(강도 2 상한)
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

  var VOCAB = { 'fade': 1, 'slow-scale-in': 1, 'ink-reveal': 1, 'cinematic-reveal': 1, 'blur-to-focus': 1 };
  // scene → 장면 HTML. o: { media: asset|null, reduce, color, layers, actChange, intro(글자 애니메이션 허용), lowFx, rate(배속) }
  function html(scene, o) {
    o = o || {}; var K = C(), b = K.build(scene, o.layers), c = b.c, segs = b.segments, tm = b.timing, reduce = !!o.reduce, rate = Math.max(0.25, +o.rate || 1), sc = function (ms) { return Math.round(ms / rate); }, fx = !!o.intro && !o.lowFx && !reduce;
    var cv = camVars(c, reduce), trans = K.limitTransition(c, !!o.actChange); trans = trans === 'dip-black' ? 'dip-black' : 'crossfade'; // 전환은 CROSSFADE · DIP_BLACK 두 가지만
    var motion = c.imageMotion === 'focus-pull' ? 'slow-zoom-in' : c.imageMotion; // 글자가 아닌 배경에도 흐림(blur) 효과는 쓰지 않는다
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
      txt += '<div class="cn-blk"' + (nextBlockAt != null ? ' style="--out:' + sc(nextBlockAt - 150) + 'ms"' : '') + '>';
      idxs.forEach(function (i, k) {
        var s = segs[i], nx = k < idxs.length - 1 ? tm.at[idxs[k + 1]] : null;
        var anim = fx && VOCAB[s.animation] ? s.animation : 'fade'; // INTRO 만 어휘 5개 중 하나, 그 밖(본편·엔딩·저사양)은 단순 페이드
        txt += '<p class="cn-seg" data-e="' + s.emphasis + '"' + (s.name ? ' data-nm="1"' : '') + (s.big ? ' data-big="1"' : '') + (anim === 'cinematic-reveal' && /^(運路|四柱八字)$/.test(String(s.text).trim()) ? ' data-title="1"' : '') + ' data-a="' + esc(anim) + '" style="--at:' + sc(tm.at[i]) + 'ms;' + (nx != null ? '--nx:' + sc(nx) + 'ms;' : '') + '">' + splitInner(s.text, anim, reduce) + '</p>';
      });
      txt += '</div>';
    });
    var prof = '';
    if (scene.profile && scene.profile.length) {
      prof = '<dl class="cn-prof">' + scene.profile.map(function (r, i) { return '<div class="cn-row" style="--at:' + sc(tm.at[Math.min(i, tm.at.length - 1)] || 0) + 'ms"><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>'; }).join('') + '</dl>';
      txt = ''; // 프로필 카드는 카드 자체가 텍스트
    }
    var pil = '';
    if (scene.pillars && scene.pillars.length) pil = '<div class="cn-pil" style="--at:' + sc(tm.at[scene.pillarsAt != null && tm.at[scene.pillarsAt] != null ? scene.pillarsAt : 0] || 0) + 'ms">' + scene.pillars.map(function (p, i) { return '<div class="cn-pc" style="--i:' + (scene.pillars.length - 1 - i) + '"><i>' + esc(p.label) + '</i>' + (p.hj ? '<b>' + esc(p.hj.charAt(0)) + '</b><b>' + esc(p.hj.charAt(1)) + '</b><em>' + esc(p.ko) + '</em>' : '<b>—</b>') + '</div>'; }).join('') + '</div>'; // 명식: 時 日 月 年 (년주부터 차례로)
    var sub = scene.sub ? '<p class="cn-sub" style="--at:' + sc(tm.end + 200) + 'ms">' + esc(scene.sub).replace(/\n/g, '<br>') + '</p>' : '';
    var firstImpact = -1; segs.forEach(function (s, i) { if (firstImpact < 0 && s.emphasis === 'impact') firstImpact = i; });
    var dimAt = firstImpact >= 0 ? sc(Math.max(0, tm.at[firstImpact] - 350)) : -1;
    var style = '--cn-ov:' + c.overlayStrength + ';--cn-fx:' + Math.round(c.focalPoint.x * 100) + '%;--cn-fy:' + Math.round(c.focalPoint.y * 100) + '%;--rate:' + rate + ';--cn-dur:' + sc(tm.total) + 'ms;--cn-amp:' + cv.amp + ';--cn-pan:' + cv.pan + '%;--pc:' + pc + ';' + (dimAt >= 0 ? '--dim-at:' + dimAt + 'ms;' : '');
    var cls = 'cn-scene' + (cv.on ? ' cn-cam-on' : '') + (dimAt >= 0 ? ' cn-has-impact' : '') + (reduce ? ' cn-reduce' : '') + (scene.kind === 'profile' ? ' cn-k-profile' : '') + (scene.kind === 'title' ? ' cn-k-title' : '') + (o.intro ? ' cn-intro' : '');
    return '<section class="' + cls + '" data-sc="' + esc(scene.sceneId || '') + '" data-cn-type="' + c.sceneType + '" data-cn-preset="' + (c.preset || '') + '" data-pos="' + c.textPosition + '" data-size="' + c.textSize + '" data-mi="' + c.motionIntensity + '" data-pace="' + c.pacing + '" data-motion="' + (cv.on ? motion : 'none') + '" data-tr="' + trans + '" data-bgm="' + c.bgmMood + '" data-nm-e="' + c.nameEmphasis + '"' + (scene.phTone ? ' data-ph="' + esc(scene.phTone) + '"' : '') + ' style="' + style + '">' +
      '<div class="cn-bg"><div class="cn-cam">' + bg + '</div></div><div class="cn-dim" aria-hidden="true"></div>' + pil + '<div class="cn-txt">' + (o.kicker ? '<div class="cn-kick">' + esc(o.kicker) + '</div>' : '') + txt + prof + sub + '</div></section>';
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
    o = o || {}; var rate = Math.max(0.25, +o.rate || 1), K = C(), idx = -1, cur = null, timer = 0, paused = false, t0 = 0, left = 0, dead = false, started = 0, doc = root.document, cues = [], cueClock = 0, cuePoll = 0, cuePausedAt = 0;
    stage.classList.add('cn-stage'); stage.innerHTML = '';
    var ui = doc.createElement('div'); ui.className = 'cn-ui';
    ui.innerHTML = '<button type="button" class="cn-skip">' + esc(o.skipLabel || '건너뛰기 ›') + '</button><div class="cn-pause" aria-hidden="true">❚❚</div><div class="cn-prog" aria-hidden="true"><i></i></div>';
    stage.appendChild(ui);
    var skipBtn = ui.querySelector('.cn-skip'), pauseEl = ui.querySelector('.cn-pause'), progEl = ui.querySelector('.cn-prog i');
    stage.setAttribute('role', 'region'); stage.setAttribute('aria-label', o.label || '운의 흐름을 영화처럼 보는 장면');
    var items = scenes.map(function (s, i) { return { s: s, media: o.mediaFor ? o.mediaFor(s) : null, i: i }; });

    function sceneEl(it) {
      var tmp = doc.createElement('div'); tmp.innerHTML = html(it.s, { media: it.media, reduce: o.reduce, layers: o.layers, saveData: o.saveData, actChange: it.s.actChange, intro: o.intro, lowFx: o.lowFx, rate: rate });
      return tmp.firstChild;
    }
    function setProg() { var done = idx >= 0 ? idx : 0, total = items.length; progEl.style.transform = 'scaleX(' + Math.min(1, (done + 1) / total) + ')'; }
    function stopCues() { clearInterval(cuePoll); cuePoll = 0; cues = []; }
    function startCues(it, seq, delay) { // 문장 등장 시각(at)에 맞춰 소리 신호를 낸다. 일시정지하면 시계도 멈춘다
      stopCues(); if (!o.onCue) return; var s = it.s;
      if (s.bgmCue) cues.push({ at: 0, c: { cue: s.bgmCue, scene: s } }); // 배경음악 신호만(효과음 신호는 보내지 않는다)
      (seq.segments || []).forEach(function (g, i) { if (g.cue && /^bgm/.test(g.cue) || g.cue === 'full') cues.push({ at: Math.round(seq.timing.at[i] / rate), c: { cue: g.cue, text: g.text, scene: s } }); });
      if (!cues.length) return; cueClock = Date.now() + (delay || 0);
      cuePoll = setInterval(function () { if (paused) return; var e = Date.now() - cueClock; cues.forEach(function (q) { if (!q.done && q.at <= e) { q.done = true; try { o.onCue(q.c); } catch (er) { } } }); }, 40);
    }
    function advance(n) { if (dead) return; go(n + 1); }
    function go(n) {
      if (dead) return; clearTimeout(timer);
      if (n >= items.length) { end('completed'); return; }
      var prev = cur, it = items[n], el = sceneEl(it), tr = el.getAttribute('data-tr') || 'crossfade', dur = o.reduce || tr === 'hard-cut' ? 0 : (tr === 'dip-black' || tr === 'dip-white' ? 520 : 760);
      idx = n; setProg(); stage.insertBefore(el, ui); loadMedia(el);
      el.classList.add('cn-in', 'cn-tr-' + (o.reduce ? 'fade' : tr)); if (paused) el.classList.add('cn-paused');
      cur = el; var run = function () { void el.offsetWidth; el.classList.add('cn-run'); };
      if (prev) { prev.classList.add('cn-leave', 'cn-tr-' + (o.reduce ? 'fade' : tr)); setTimeout(function () { if (prev.parentNode) prev.remove(); }, dur + 60); }
      var seq = it.s._built || (it.s._built = K.build(it.s, o.layers)); // 시간 계산은 html() 과 같은 규칙
      var total = Math.round(seq.timing.total / rate);
      var runDelay = dur && (tr === 'dip-black' || tr === 'dip-white') && prev ? dur * 0.6 : 0;
      if (runDelay) setTimeout(run, runDelay); else run();
      startCues(it, seq, runDelay);
      if (o.onScene) try { o.onScene(it.s, seq.c, el); } catch (e) { }
      if (items[n + 1]) preload(items[n + 1].media); // 다음 장면만 미리 불러온다(그 뒤는 지연 로드)
      left = total; t0 = Date.now(); if (!paused) timer = setTimeout(function () { advance(n); }, left);
    }
    function pause() { if (paused || dead) return; paused = true; cuePausedAt = Date.now(); clearTimeout(timer); left = Math.max(200, left - (Date.now() - t0)); if (cur) cur.classList.add('cn-paused'); pauseEl.classList.add('on'); [].forEach.call(stage.querySelectorAll('video'), function (v) { try { v.pause(); } catch (e) { } }); }
    function resume() { if (!paused || dead) return; paused = false; if (cuePausedAt) cueClock += Date.now() - cuePausedAt; cuePausedAt = 0; if (cur) { cur.classList.remove('cn-paused'); loadMedia(cur); } pauseEl.classList.remove('on'); t0 = Date.now(); var n = idx; timer = setTimeout(function () { advance(n); }, left); }
    function end(kind) { if (dead) return; destroy(); if (o.onEnd) o.onEnd(kind); }
    function destroy() { dead = true; clearTimeout(timer); stopCues(); doc.removeEventListener('keydown', key); stage.removeEventListener('click', tap); stage.innerHTML = ''; stage.classList.remove('cn-stage'); }
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
  //  데이터 그래프의 막대가 처음 한 번 짧게 자란다(그 밖의 장면 연출은 읽기 문서에서 쓰지 않는다)
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
      });
    }, { threshold: 0.4 });
    [].forEach.call(rootEl.querySelectorAll('.cn-cam-on, .s-cinema, .cn-data-fig'), function (e) { io.observe(e); });
    return { destroy: function () { io.disconnect(); } };
  }
  R.CinemaRender = { watch: watch, html: html, play: play, mount: mount, camVars: camVars, splitInner: splitInner, EL_COLOR: EL_COLOR };
})(typeof window !== 'undefined' ? window : globalThis);
