// 배경 분위기 효과: 불씨(위로 날아오르는 불빛) · 빛(천천히 번지는 빛무리) · 연기(은은한 안개).
// 설정은 content.js 의 settings.ambient (관리자 "스토리 페이지" → 문구 설정 → 페이지 기본 → 배경 효과).
// 글 뒤에 깔리는 고정 캔버스 하나만 쓰며, 화면이 가려지면 멈추고, '동작 줄이기' 설정에서는 정지된 한 장면만 그린다.
(function (root) {
  'use strict';
  var DEF = { embers: true, light: true, smoke: true, amount: 1, speed: 1, opacity: 0.8, color: '#E8B26A' };
  var cv, ctx, W, H, dpr, raf = 0, cfg = DEF, E = [], SM = [], LT = [], last = 0, T = 0, sprites = {}, timer = 0;
  var REDUCE = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rgb(h) { var m = /^#([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) m = /^#([0-9a-f]{6})$/i.exec(DEF.color); var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  // 부드러운 원형 그라데이션 스프라이트(색별로 한 번만 만든다)
  function sprite(key, c, size, stops) {
    var id = key + c.join(',') + size; if (sprites[id]) return sprites[id];
    var s = document.createElement('canvas'); s.width = s.height = size; var g = s.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
    stops.forEach(function (p) { gr.addColorStop(p[0], 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + p[1] + ')'); });
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return (sprites[id] = s);
  }
  function build() {
    var a = Math.max(0, +cfg.amount || 0), area = W * H;
    E = []; SM = []; LT = [];
    if (cfg.embers) for (var i = 0, n = Math.min(80, Math.round(area / 26000 * a)); i < n; i++) E.push(ember(true));
    if (cfg.smoke) for (var j = 0, m = Math.min(9, Math.max(1, Math.round(5 * a))); j < m; j++) SM.push({ x: rnd(0, W), y: rnd(0, H * 1.3), s: rnd(Math.max(W, H) * 0.35, Math.max(W, H) * 0.7), vy: rnd(5, 12), vx: rnd(-4, 4), a: rnd(0.04, 0.085), ph: rnd(0, 6.28) });
    if (cfg.light) for (var k = 0; k < 3; k++) LT.push({ cx: rnd(0.2, 0.8), cy: rnd(0.2, 0.8), rx: rnd(0.1, 0.25), ry: rnd(0.08, 0.2), sp: rnd(0.04, 0.09), ph: rnd(0, 6.28), s: rnd(Math.max(W, H) * 0.5, Math.max(W, H) * 0.9), tone: k });
  }
  function ember(init) { return { x: rnd(0, W), y: init ? rnd(0, H) : H + rnd(5, 40), r: rnd(0.7, 2.3), vy: rnd(14, 42), sw: rnd(8, 26), f: rnd(0.8, 2.4), ph: rnd(0, 6.28), x0: 0 }; }
  function resize() {
    if (!cv) return; dpr = Math.min(root.devicePixelRatio || 1, 1.5); W = root.innerWidth; H = root.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); build(); if (REDUCE) frame(0);
  }
  function frame(dt) {
    var sp = +cfg.speed > 0 ? +cfg.speed : 1, op = Math.max(0, Math.min(1, +cfg.opacity)), c = rgb(cfg.color);
    T += dt * sp; ctx.clearRect(0, 0, W, H);
    // 연기: 위로 천천히 올라가며 퍼지는 회청색 안개
    if (SM.length) {
      var sm = sprite('smoke', [150, 160, 195], 128, [[0, 0.5], [0.5, 0.18], [1, 0]]); ctx.globalCompositeOperation = 'source-over';
      SM.forEach(function (o) {
        o.y -= o.vy * dt * sp; o.x += (o.vx + Math.sin(T * 0.25 + o.ph) * 6) * dt * sp; if (o.y < -o.s * 0.6) { o.y = H + o.s * 0.5; o.x = rnd(0, W); }
        var fade = Math.min(1, Math.max(0, (o.y + o.s * 0.5) / (H * 0.35)), Math.max(0, (H + o.s - o.y) / (H * 0.35)));
        ctx.globalAlpha = o.a * op * fade * 1.6; ctx.drawImage(sm, o.x - o.s / 2, o.y - o.s / 2, o.s, o.s);
      });
    }
    // 빛: 크고 부드러운 빛무리가 천천히 떠다닌다 (밝게 겹침)
    if (LT.length) {
      ctx.globalCompositeOperation = 'lighter';
      LT.forEach(function (o) {
        var col = o.tone === 1 ? [120, 105, 220] : o.tone === 2 ? [90, 150, 190] : c, sp2 = sprite('light', col, 128, [[0, 0.55], [0.4, 0.2], [1, 0]]);
        var x = (o.cx + Math.cos(T * o.sp + o.ph) * o.rx) * W, y = (o.cy + Math.sin(T * o.sp * 0.8 + o.ph) * o.ry) * H;
        ctx.globalAlpha = (0.10 + 0.04 * Math.sin(T * 0.3 + o.ph)) * op; ctx.drawImage(sp2, x - o.s / 2, y - o.s / 2, o.s, o.s);
      });
    }
    // 불씨: 흔들리며 올라가고 깜빡인다
    if (E.length) {
      var es = sprite('ember', c, 32, [[0, 1], [0.25, 0.7], [1, 0]]); ctx.globalCompositeOperation = 'lighter';
      E.forEach(function (o, i) {
        o.y -= o.vy * dt * sp; if (o.y < -12) { E[i] = o = ember(false); }
        var x = o.x + Math.sin(T * 0.6 * o.f + o.ph) * o.sw, tw = 0.35 + 0.65 * Math.abs(Math.sin(T * o.f + o.ph)), up = Math.min(1, Math.max(0, o.y / (H * 0.25))), sz = o.r * 7;
        ctx.globalAlpha = tw * (0.35 + 0.65 * up) * op; ctx.drawImage(es, x - sz / 2, o.y - sz / 2, sz, sz);
      });
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function loop(t) {
    raf = root.requestAnimationFrame(loop); var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; frame(dt);
  }
  function stop() { if (raf) root.cancelAnimationFrame(raf); raf = 0; }
  function start() { if (raf || REDUCE || document.hidden) return; last = performance.now(); raf = root.requestAnimationFrame(loop); }

  function apply(c) {
    cv = cv || document.getElementById('amb'); if (!cv) return;
    cfg = Object.assign({}, DEF, c || {});
    if (!ctx) {
      ctx = cv.getContext('2d');
      root.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(resize, 150); });
      document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    }
    var any = (cfg.embers || cfg.light || cfg.smoke) && +cfg.amount > 0 && +cfg.opacity > 0;
    cv.hidden = !any; stop();
    if (!any) { ctx.clearRect(0, 0, cv.width, cv.height); return; }
    resize(); start();
  }
  root.Ambient = { apply: apply, defaults: DEF };
})(window);
