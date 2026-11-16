/* 2026-11-17 인연의 광장 벚꽃 테마 켜기(theme-sakura.css).
   · 관리자 스위치(/api/luck-flags sakuraTheme)를 따른다. 기본 꺼짐. 지난번 값을 기기에 기억해 바로 적용(깜빡임 방지).
   · 이 기기에서만 미리보기: ?sakura=1 → 켜기, ?sakura=0 → 끄기, ?sakura=auto → 스위치 따르기.
   · 켜지면 화면 뒤에 꽃잎 12장이 천천히 흩날린다(움직임 줄이기 설정이면 CSS가 숨긴다). */
(function () {
  if (window.__sakuraTheme) return; window.__sakuraTheme = 1;
  var KO = 'mt.theme.sakura', KF = 'mt.theme.sflag', de = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
  var m = /[?&]sakura=(1|0|auto)\b/.exec(location.search + '&' + location.hash);
  if (m) put(KO, m[1] === 'auto' ? null : m[1]);
  var flag = get(KF) === '1';
  function enabled() { var o = get(KO); return o === '1' ? true : o === '0' ? false : flag; }
  var meta = null, metaOld = null;
  function apply() {
    var on = enabled();
    if (on !== de.classList.contains('theme-sakura')) {
      de.classList.toggle('theme-sakura', on);
      meta = meta || document.querySelector('meta[name="theme-color"]');
      if (meta) { if (metaOld == null) metaOld = meta.getAttribute('content') || ''; meta.setAttribute('content', on ? '#FBF4F6' : metaOld); }
    }
    if (on) petals();
  }
  var made = false;
  function petals() {
    if (made || !document.body) return; made = true;
    var box = document.createElement('div'); box.className = 'sk-petals'; box.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 12; i++) {
      var p = document.createElement('i'), r = function (a, b) { return a + Math.random() * (b - a); };
      p.style.cssText = 'left:' + r(0, 100).toFixed(1) + '%;--s:' + r(8, 15).toFixed(1) + 'px;--o:' + r(.45, .8).toFixed(2) + ';--d:' + r(14, 26).toFixed(1) + 's;--w:' + (-r(0, 26)).toFixed(1) + 's;--dx:' + r(-90, 90).toFixed(0) + 'px';
      box.appendChild(p);
    }
    document.body.insertBefore(box, document.body.firstChild);
  }
  // 다른 코드가 <html> 클래스를 바꿔도 다시 붙인다
  new MutationObserver(function () { if (de.classList.contains('theme-sakura') !== enabled()) apply(); }).observe(de, { attributes: true, attributeFilter: ['class'] });
  apply();
  if (!document.body) document.addEventListener('DOMContentLoaded', apply);
  try {
    fetch('/api/luck-flags', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || typeof d !== 'object') return;
      flag = d.sakuraTheme === true; put(KF, flag ? '1' : '0'); apply();
    }).catch(function () { });
  } catch (e) { }
})();
