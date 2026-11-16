/* 2026-11-16 밝은 안개 테마 켜기(theme-mist.css).
   · 관리자 스위치(/api/luck-flags mistTheme)를 따른다. 기본 꺼짐. 지난번 값을 기기에 기억해 두었다가 바로 적용하고(화면 깜빡임 방지), 새 값을 받으면 바꾼다.
   · 이 기기에서만 미리보기: 주소에 ?mist=1 → 켜기, ?mist=0 → 끄기, ?mist=auto → 스위치를 따르게 되돌리기.
   · 적용 화면은 운명의 타임라인·일진 캘린더(#/today)·무료 타로(#/tarot…)뿐이다. 입력·영상·마이페이지 등 다른 화면은 기존 먹빛 그대로.
   · 켜졌을 때 '인생 흐름'·'지금과 앞으로'·'주요 주제' 영역은 화면에 들어오면 안개가 걷힌다. */
(function () {
  if (window.__mistTheme) return; window.__mistTheme = 1;
  var KO = 'mt.theme.mist', KF = 'mt.theme.flag';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
  var m = /[?&]mist=(1|0|auto)\b/.exec(location.search + '&' + location.hash);
  if (m) put(KO, m[1] === 'auto' ? null : m[1]);
  var flag = get(KF) === '1';
  var ROUTE = /^#\/(timeline|today|tarot)(?=[/?&]|$)/;
  function enabled() { var o = get(KO); return o === '1' ? true : o === '0' ? false : flag; }
  // 주소에 화면 이름이 있으면 그것만 본다(#/awaken 같은 다른 화면은 꺼짐). 이름이 없을 때(첫 화면)만 타임라인이 그려졌는지로 판단.
  function onScreen() { var h = location.hash || ''; if (h.length > 2) return ROUTE.test(h); return !!document.getElementById('tq'); }
  var de = document.documentElement, meta = null, metaOld = null;
  function apply() {
    var on = enabled() && onScreen();
    if (on === de.classList.contains('theme-mist')) return;
    de.classList.toggle('theme-mist', on);
    meta = meta || document.querySelector('meta[name="theme-color"]');
    if (meta) { if (metaOld == null) metaOld = meta.getAttribute('content') || ''; meta.setAttribute('content', on ? '#E9EEEE' : metaOld); }
  }
  // 앞날의 안개(영역이 화면에 들어오면 걷힘). 테마가 꺼져 있으면 CSS가 없어 아무 효과 없다.
  var VEIL = ['tq-flow', 'tq-now', 'tq-themes'];
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('mist-clear'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -30% 0px' }) : null;
  function tag() {
    for (var i = 0; i < VEIL.length; i++) {
      var s = document.getElementById(VEIL[i]);
      if (!s || s.classList.contains('mist-veil')) continue;
      s.classList.add('mist-veil');
      if (io) io.observe(s); else s.classList.add('mist-clear');
    }
  }
  var queued = false;
  function tick() { if (queued) return; queued = true; setTimeout(function () { queued = false; apply(); tag(); }, 0); }
  window.addEventListener('hashchange', tick);
  // 다른 코드가 <html> 클래스를 통째로 바꿔 theme-mist 가 지워지면 다시 붙인다
  new MutationObserver(function () { if (de.classList.contains('theme-mist') !== (enabled() && onScreen())) tick(); }).observe(de, { attributes: true, attributeFilter: ['class'] });
  function watch() { var t = document.getElementById('screen') || document.getElementById('hub') || document.body; if (!t) return setTimeout(watch, 50); new MutationObserver(tick).observe(t, { childList: true, subtree: true }); tick(); }
  watch(); apply();
  // 관리자 스위치 값(60초 캐시). 실패하면 기억해 둔 값 그대로.
  try {
    fetch('/api/luck-flags', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || typeof d !== 'object') return;
      flag = d.mistTheme === true; put(KF, flag ? '1' : '0'); apply();
    }).catch(function () { });
  } catch (e) { }
})();
