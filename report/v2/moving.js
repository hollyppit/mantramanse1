// 무빙툰 연출 — ① 장면 안의 풀이 박스·글·이미지가 위에서부터 차례로 나타나는 효과  ② 자동 스크롤(누르면 멈춤, 버튼으로 이어서 보기).
// 설정(flow)은 관리자 "설정 → 무빙 연출"에서 저장되고(content.flow) 값은 아래 clean() 으로 걸러진다. 서버(functions/api/report-content.js)의 검증과 같은 범위여야 한다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var ANIMS = [['rise', '아래에서 떠오르기'], ['fade', '서서히 나타나기'], ['zoom', '살짝 커지며 나타나기'], ['blur', '흐릿하다가 선명해지기'], ['wipe', '왼쪽에서 펼쳐지기'], ['drop', '위에서 내려오기']];
  var POS = [['right', '오른쪽 아래'], ['center', '가운데 아래'], ['left', '왼쪽 아래']];
  var DEFAULTS = {
    enabled: true,        // 차례로 나타나는 효과
    anim: 'rise', duration: 0.8, distance: 28, // 효과 · 나타나는 데 걸리는 시간(초) · 움직이는 거리(px)
    stagger: 0.35,        // 한 번에 보이는 요소들 사이 간격(초)
    trigger: 88,          // 화면 위에서 몇 % 지점에 닿으면 나타나는가(100=맨 아래, 50=가운데)
    auto: true,           // 자동 스크롤
    speed: 55,            // 초당 내려가는 px
    startDelay: 1.5,      // 챕터가 열린 뒤 자동 스크롤 시작까지(초)
    stopAtChoice: true,   // 질문·선택이 있는 장면 앞에서 멈춤
    resumeAfter: 0,       // 사용자가 멈춘 뒤 자동으로 다시 시작까지(초, 0=누를 때까지 멈춤)
    btnShow: true, btnPos: 'right',
  };
  var num = function (v, lo, hi, d) { v = v === '' || v == null ? NaN : +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  var has = function (list, v) { return list.some(function (x) { return x[0] === v; }); };
  function clean(f) {
    f = f && typeof f === 'object' ? f : {}; var D = DEFAULTS;
    return { enabled: f.enabled !== false, anim: has(ANIMS, f.anim) ? f.anim : D.anim, duration: num(f.duration, 0.1, 4, D.duration), distance: num(f.distance, 0, 120, D.distance),
      stagger: num(f.stagger, 0, 2, D.stagger), trigger: num(f.trigger, 40, 100, D.trigger), auto: f.auto !== false, speed: num(f.speed, 10, 400, D.speed), startDelay: num(f.startDelay, 0, 10, D.startDelay),
      stopAtChoice: f.stopAtChoice !== false, resumeAfter: num(f.resumeAfter, 0, 60, D.resumeAfter), btnShow: f.btnShow !== false, btnPos: has(POS, f.btnPos) ? f.btnPos : D.btnPos };
  }

  // root: 챕터 컨테이너(#chapter). state: { wanted } 챕터를 넘어가도 유지되는 "자동 스크롤을 원하는가".
  // 반환: { destroy, pause, resume } — 효과를 쓰지 않는 설정이면 null (호출한 쪽이 기본 등장 효과를 쓴다)
  function mount(host, flow, o) {
    o = o || {}; var f = clean(flow), reduce = !!o.reduce, st = o.state || { wanted: true };
    if (!f.enabled || reduce) return null;
    var doc = root.document, win = root, timers = [], dead = false;
    host.style.setProperty('--mv-dur', f.duration + 's'); host.style.setProperty('--mv-dist', f.distance + 'px'); host.setAttribute('data-mv', f.anim);
    // 장면의 직계 요소를 감싸 순서대로 등장시킨다(글자 효과(data-tx)와 transform·opacity 가 겹치지 않도록 바깥에 감싼다)
    var items = [];
    [].slice.call(host.querySelectorAll('.scene')).forEach(function (sc) {
      sc.classList.add('in');
      [].slice.call(sc.children).forEach(function (k) {
        if (k.hidden || k.classList.contains('mvw')) return;
        var w = doc.createElement('div'); w.className = 'mvw'; sc.insertBefore(w, k); w.appendChild(k); items.push(w);
      });
    });
    var io = new IntersectionObserver(function (es) {
      var show = []; es.forEach(function (e) { if (e.isIntersecting) show.push(e.target); else if (e.boundingClientRect.top < 0) { e.target.style.transitionDelay = '0s'; e.target.classList.add('on'); io.unobserve(e.target); } });
      show.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; }).forEach(function (w, i) { w.style.transitionDelay = (i * f.stagger) + 's'; w.classList.add('on'); io.unobserve(w); });
    }, { rootMargin: '0px 0px -' + (100 - f.trigger) + '% 0px', threshold: 0 });
    items.forEach(function (w) { io.observe(w); });

    // ── 자동 스크롤 ──
    var btn = null, running = false, raf = 0, last = 0, y = 0, resumeT = 0, startT = 0, holdT = 0;
    function ui() {
      if (!btn) return; btn.textContent = running ? '⏸ 멈추기' : '▶ 이어서 보기'; btn.setAttribute('aria-pressed', String(running)); btn.setAttribute('aria-label', running ? '자동 스크롤 멈추기' : '자동 스크롤 이어서 보기');
    }
    function atBottom() { return win.scrollY + win.innerHeight >= doc.documentElement.scrollHeight - 2; }
    function choiceAhead() {
      if (!f.stopAtChoice) return null; var sc = host.querySelectorAll('.scene');
      for (var i = 0; i < sc.length; i++) { var s = sc[i]; if (s.dataset.mvStopped || !s.querySelector('.vd, [data-stop]')) continue; if (s.getBoundingClientRect().top <= win.innerHeight * 0.3) return s; }
      return null;
    }
    function holdAhead() { // 시네마 장면(data-hold=ms): 화면 위쪽에 닿으면 그 시간만큼 멈췄다가 이어서 내려간다
      var sc = host.querySelectorAll('.scene[data-hold]');
      for (var i = 0; i < sc.length; i++) { var s = sc[i]; if (s.dataset.mvHeld) continue; var r = s.getBoundingClientRect(); if (r.top <= win.innerHeight * 0.2 && r.bottom > win.innerHeight * 0.5) return s; }
      return null;
    }
    function tick(t) {
      if (!running || dead) return; var dt = Math.min(0.1, (t - last) / 1000); last = t;
      if (Math.abs(win.scrollY - y) > 2) y = win.scrollY; // 바깥에서 위치가 바뀌었으면 거기서부터
      y += f.speed * dt; win.scrollTo(0, y);
      var s = choiceAhead(); if (s) { s.dataset.mvStopped = '1'; pause(false); return; }
      var hd = holdAhead(); if (hd) { hd.dataset.mvHeld = '1'; pause(false); holdT = setTimeout(function () { if (!dead && st.wanted !== false) resume(); }, Math.min(15000, +hd.dataset.hold || 4000)); return; }
      if (atBottom()) { pause(false); return; }
      raf = win.requestAnimationFrame(tick);
    }
    function resume(fromUser) {
      if (dead || running) return; clearTimeout(resumeT); st.wanted = true; if (atBottom()) return;
      running = true; y = win.scrollY; last = win.performance.now(); raf = win.requestAnimationFrame(tick); ui();
    }
    function pause(byUser) {
      if (!running && !byUser) return; running = false; win.cancelAnimationFrame(raf); clearTimeout(startT); ui();
      if (byUser) { st.wanted = false; if (f.resumeAfter > 0) { clearTimeout(resumeT); resumeT = setTimeout(function () { resume(); }, f.resumeAfter * 1000); } if (o.onPause) o.onPause(); }
    }
    function press(e) { if (e.target && e.target.closest && e.target.closest('#mvBtn')) return; if (running) pause(true); }
    function key(e) { if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key) && running) pause(true); }
    function vis() { if (doc.hidden && running) pause(false); }
    if (f.auto) {
      btn = doc.createElement('button'); btn.type = 'button'; btn.id = 'mvBtn'; btn.className = 'mv-btn pos-' + f.btnPos; btn.hidden = !f.btnShow;
      btn.onclick = function () { if (running) pause(true); else resume(true); }; doc.body.appendChild(btn); ui();
      ['wheel', 'touchstart', 'pointerdown'].forEach(function (ev) { doc.addEventListener(ev, press, { passive: true, capture: true }); });
      doc.addEventListener('keydown', key); doc.addEventListener('visibilitychange', vis);
      if (st.wanted !== false) startT = setTimeout(function () { resume(); }, f.startDelay * 1000);
    }
    function destroy() {
      dead = true; running = false; win.cancelAnimationFrame(raf); clearTimeout(startT); clearTimeout(resumeT); clearTimeout(holdT); io.disconnect();
      ['wheel', 'touchstart', 'pointerdown'].forEach(function (ev) { doc.removeEventListener(ev, press, { capture: true }); }); doc.removeEventListener('keydown', key); doc.removeEventListener('visibilitychange', vis);
      if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    }
    return { destroy: destroy, pause: function () { pause(true); }, resume: function () { resume(true); }, flow: f };
  }

  R.Moving = { DEFAULTS: DEFAULTS, ANIMS: ANIMS, POS: POS, clean: clean, mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
