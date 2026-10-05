// 입장 인트로: 관리자(입장 인트로 탭)에서 켠 경우에만 첫 화면 위에 영상을 음소거로 재생하고, 끝나거나 건너뛰면 아래 스토리 페이지가 이어진다.
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var preview = /[?&]preview=1\b/.test(location.search); // 관리자 미리보기 창에서는 인트로를 건너뛴다
  {
    if (reduce || preview) return;
    try { if (sessionStorage.getItem('mt_intro') === '1') return; } catch (e) {}
    fetch('/api/intro').then(function (r) { return r.ok ? r.json() : { on: false }; }).then(function (c) {
      var mobile = window.matchMedia('(max-width: 768px)').matches;
      var url = mobile ? (c.urlMobile || c.url) : (c.url || c.urlMobile);
      if (!c.on || !url) return;
      if (c.once !== 'always') { try { sessionStorage.setItem('mt_intro', '1'); } catch (e) {} }
      var isImg = /\.(gif|png|jpe?g|webp|avif)(\?.*)?$/i.test(url); // 이미지·GIF 인트로: 정해진 시간(문구가 더 길면 문구가 끝날 때까지) 보여 주고 닫는다
      var cues = (c.fx && c.fx.cues) || [], withText = cues.length > 0;
      var box = document.createElement('div'); box.id = 'intro'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '입장 영상');
      var v = document.createElement(isImg ? 'img' : 'video'); if (isImg) { v.alt = ''; v.decoding = 'async'; v.src = url; } else v.playsInline = true; v.setAttribute('playsinline', ''); if (!isImg) { v.preload = 'auto'; v.muted = true; v.src = url; }
      var stage = null, player = null;
      var skip = document.createElement('button'); skip.className = 'skip'; skip.type = 'button'; skip.textContent = '건너뛰기 ›';
      var done = false;
      function close() {
        if (done) return; done = true; document.documentElement.style.overflow = ''; box.classList.add('out'); if (v.pause) v.pause(); if (player) player.stop();
        setTimeout(function () { box.remove(); }, 700);
      }
      skip.onclick = close; v.onended = close; v.onerror = close; if (isImg) { v.onload = function () { setTimeout(close, Math.max(0.5, +c.imageSeconds || 4) * 1000); }; }
      document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
      var wait = +c.skipAfter || 0; if (wait) { skip.style.display = 'none'; setTimeout(function () { skip.style.display = ''; }, wait * 1000); }
      document.body.appendChild(box); document.documentElement.style.overflow = 'hidden';
      if (withText) {
        // 문구가 있으면 클립 자막과 같은 엔진(fx.js)으로 영상 위에 글자를 얹어 재생한다. 영상이 끝나면 마지막 화면에서 문구가 끝날 때까지 이어진다.
        v.removeAttribute('src'); stage = document.createElement('div'); stage.style.cssText = 'position:absolute;inset:0'; box.appendChild(stage); box.appendChild(skip);
        var js = document.createElement('script'); js.src = '/report/fx.js';
        js.onload = function () {
          // 공통 연출 위에 이 기기(모바일/웹)용 값을 덮어쓴다 — 글자 크기는 화면 폭에 비례하므로 기기별로 따로 맞춘다
          var ov = (mobile ? c.fxMobile : c.fxPc) || {}, fx = { cues: c.fx.cues, video: { loop: 'freeze', hold: 0.3 } };
          ['sub', 'trans'].forEach(function (g) { var o = Object.assign({}, c.fx[g], ov[g]); if (Object.keys(o).length) fx[g] = o; });
          player = window.MovingFx.play(stage, { refW: mobile ? 390 : 1280, clip: { fx: fx }, url: isImg ? '' : url, image: isImg ? url : '', minSeconds: Math.max(0.5, +c.imageSeconds || 4), muteVideo: true, silent: true, defaults: {}, onend: close, onerror: close });
        };
        js.onerror = close; document.head.appendChild(js);
        if (!isImg) setTimeout(function () { var pv = stage.querySelector('video'); if (!done && pv && pv.currentTime === 0) close(); }, 6000); // 재생이 시작되지 않으면 생략
      } else {
        box.appendChild(v); box.appendChild(skip);
        var pr = isImg ? null : v.play();
        if (pr && pr.catch) pr.catch(close); // 재생이 막히면 인트로 생략
      }
      setTimeout(close, 60000); // 안전장치
    }).catch(function () {});
  }

})();
