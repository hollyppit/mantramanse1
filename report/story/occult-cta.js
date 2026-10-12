// 첨부 콘셉트의 봉인 연출. 입력·계산은 기존 버튼 동작을 그대로 사용한다.
(function () {
  'use strict';
  var replay = null, busy = false, timer = null, overlay = null;
  function clear() { if (timer) clearTimeout(timer); timer = null; if (overlay) overlay.remove(); overlay = null; busy = false; }
  document.addEventListener('click', function (e) {
    var button = e.target.closest && e.target.closest('#cover [data-cover="go"], #productGuide [data-product-event="product_trial_bottom_click"]');
    if (!button || /[?&]preview=1\b/.test(location.search)) return;
    if (replay === button) { replay = null; return; }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (busy) return;
    busy = true; overlay = document.createElement('div'); overlay.className = 'occult-opening'; overlay.setAttribute('role', 'status');
    overlay.innerHTML = '<div class="occult-seal" aria-hidden="true"><div class="occult-paper"><span class="occult-ink">命<br>運</span><span class="occult-hole"></span></div><span class="occult-embers">✦ · · ✧</span></div><p>봉인이 풀리고, 기록의 문이 열립니다.</p>';
    document.body.appendChild(overlay);
    timer = setTimeout(function () { clear(); if (!document.body.contains(button)) return; replay = button; try { button.click(); } finally { replay = null; } }, 1250);
  }, true);
  window.addEventListener('hashchange', clear);
  window.addEventListener('pagehide', clear);
})();
