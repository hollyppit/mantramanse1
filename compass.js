/* 나침반으로 향 재기: 휴대폰 방향 센서(DeviceOrientation)로 창이 바라보는 각도를 읽어 향 입력칸에 채운다.
   - 아이폰(Safari)은 webkitCompassHeading, 안드로이드(Chrome)는 deviceorientationabsolute의 alpha를 쓴다.
   - 읽는 값은 휴대폰 나침반 앱과 같은 자북 기준이다. 진북 보정(한국 약 8° 서편각)은 선택 사항이다.
   - 센서가 없거나 거절하면 안내만 보여 주고, 기존 직접 입력은 그대로 쓴다. 풍수 점수·판정 계산은 바꾸지 않는다. */
(function (root) {
  'use strict';
  var DECL = -8; // 한국의 자기편각(서편각 약 8°). 진북 = 자북 + DECL
  var DIR8 = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];

  function norm(d) { return ((d % 360) + 360) % 360; }
  // 센서 이벤트 하나에서 "휴대폰 윗부분이 가리키는 방향(0=북, 시계 방향)"을 뽑는다. 못 읽으면 null
  function headingFromEvent(ev) {
    if (!ev) return null;
    if (typeof ev.webkitCompassHeading === 'number' && isFinite(ev.webkitCompassHeading)) return norm(ev.webkitCompassHeading);
    if (typeof ev.alpha === 'number' && isFinite(ev.alpha) && (ev.absolute === true || ev.type === 'deviceorientationabsolute')) return norm(360 - ev.alpha);
    return null;
  }
  // 각도는 359°와 1°가 가까우므로 단순 평균이 아니라 원형 평균을 쓴다
  function circMean(a) {
    if (!a.length) return null;
    var s = 0, c = 0; a.forEach(function (d) { var r = d * Math.PI / 180; s += Math.sin(r); c += Math.cos(r); });
    return norm(Math.atan2(s, c) * 180 / Math.PI);
  }
  // 최근 값들이 평균에서 평균 몇 도씩 벗어나는지(흔들림)
  function circSpread(a) {
    var m = circMean(a); if (m == null) return 0;
    var t = 0; a.forEach(function (d) { var x = Math.abs(norm(d - m)); t += x > 180 ? 360 - x : x; });
    return t / a.length;
  }
  function applyDecl(deg, trueNorth) { return trueNorth ? norm(deg + DECL) : norm(deg); }
  function dir8Label(deg) { return DIR8[Math.round(norm(deg) / 45) % 8] + '향'; }
  function supported() {
    try { return !!(root.DeviceOrientationEvent && (root.navigator.maxTouchPoints || 0) > 0); } catch (e) { return false; }
  }

  var api = { DECL: DECL, norm: norm, headingFromEvent: headingFromEvent, circMean: circMean, circSpread: circSpread, applyDecl: applyDecl, dir8Label: dir8Label, supported: supported };

  /* ── 화면: 아래쪽에 뜨는 측정 창. 앱 화면을 다시 그리지 않고 이 창만 갱신한다. */
  var MSG = {
    insecure: '보안 연결(https)에서만 쓸 수 있어요. 각도를 직접 입력해 주세요.',
    denied: '센서 사용이 거절됐어요. 휴대폰 설정에서 이 사이트의 모션·방향 접근을 허용하거나, 각도를 직접 입력해 주세요.',
    nosensor: '이 기기에서 방향 센서를 찾지 못했어요. 휴대폰 나침반 앱으로 재서 직접 입력해 주세요.',
    unsupported: '이 브라우저는 방향 센서를 지원하지 않아요. 각도를 직접 입력해 주세요.'
  };
  var st = null; // 열려 있는 측정 상태

  function close() {
    if (!st) return;
    try { root.removeEventListener('deviceorientationabsolute', st.on, true); root.removeEventListener('deviceorientation', st.on, true); } catch (e) { }
    clearTimeout(st.timer);
    if (st.el && st.el.parentNode) st.el.parentNode.removeChild(st.el);
    st = null;
  }

  function open(onPick) {
    var doc = root.document; if (!doc) return;
    close();
    if (!doc.getElementById('mc-style')) {
      var css = doc.createElement('style'); css.id = 'mc-style';
      css.textContent = '#mc-sheet{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:var(--surface,#fff);color:var(--ink,#222);border-top:1px solid var(--line,#ddd);border-radius:16px 16px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.18);padding:16px 16px calc(16px + env(safe-area-inset-bottom));max-width:560px;margin:0 auto}'
        + '#mc-sheet .mc-deg{font-size:2.4rem;font-weight:800;line-height:1.1;text-align:center}#mc-sheet .mc-dir{text-align:center;font-weight:700;margin:2px 0 6px}'
        + '#mc-sheet .mc-stat{text-align:center;font-size:.84rem;min-height:1.3em;margin-bottom:8px}#mc-sheet .mc-ok{color:var(--good,#1a7f4b)}#mc-sheet .mc-warn{color:var(--bad,#b3261e)}'
        + '#mc-sheet p{font-size:.8rem;opacity:.8;margin:6px 0}#mc-sheet label{display:flex;gap:6px;align-items:center;font-size:.84rem;margin:6px 0}#mc-sheet .mc-row{display:flex;gap:8px;margin-top:10px}#mc-sheet .mc-row button{flex:1}';
      doc.head.appendChild(css);
    }
    var el = doc.createElement('div'); el.id = 'mc-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '나침반으로 향 재기');
    el.innerHTML = '<div class="mc-deg" id="mc-deg" aria-live="polite">—°</div><div class="mc-dir" id="mc-dir">방향 읽는 중…</div><div class="mc-stat" id="mc-stat"></div>'
      + '<label><input type="checkbox" id="mc-tn"> 진북으로 보정(한국 약 8° 서편각 · 보통은 끄고 사용)</label>'
      + '<p>휴대폰을 수평으로 들고, <b>윗부분이 창 바깥을 향하게</b> 서세요. 철문·가전·스피커 근처는 피하고, 숫자가 크게 흔들리면 휴대폰을 8자로 돌려 보정하세요.</p>'
      + '<div class="mc-row"><button type="button" class="btn primary" id="mc-ok" disabled>이 각도로 입력</button><button type="button" class="btn" id="mc-x">닫기</button></div>';
    doc.body.appendChild(el);
    var $ = function (id) { return doc.getElementById(id); };
    var s = { el: el, samples: [], got: false, timer: null, on: null, deg: null };
    st = s;

    function fail(code) { $('mc-dir').textContent = '측정할 수 없어요'; $('mc-stat').className = 'mc-stat mc-warn'; $('mc-stat').textContent = MSG[code] || MSG.nosensor; $('mc-ok').disabled = true; }
    function refresh() {
      var m = circMean(s.samples); if (m == null) return;
      var d = applyDecl(m, $('mc-tn').checked), sp = circSpread(s.samples);
      s.deg = d;
      $('mc-deg').textContent = Math.round(d) + '°'; $('mc-dir').textContent = dir8Label(d);
      var stable = s.samples.length >= 8 && sp < 3;
      $('mc-stat').className = 'mc-stat ' + (stable ? 'mc-ok' : 'mc-warn');
      $('mc-stat').textContent = stable ? '안정됨 — 이 각도로 입력할 수 있어요' : '흔들리는 중 — 휴대폰을 수평으로 잠시 멈춰 주세요';
      $('mc-ok').disabled = false;
    }
    s.on = function (ev) {
      var h = headingFromEvent(ev); if (h == null) return;
      s.got = true; s.samples.push(h); if (s.samples.length > 12) s.samples.shift(); refresh();
    };
    $('mc-tn').addEventListener('change', refresh);
    $('mc-x').addEventListener('click', close);
    $('mc-ok').addEventListener('click', function () { if (s.deg == null) return; var d = Math.round(s.deg) % 360; close(); if (typeof onPick === 'function') onPick(d); });

    if (!root.isSecureContext) return fail('insecure');
    var D = root.DeviceOrientationEvent;
    if (!D) return fail('unsupported');
    function listen() {
      root.addEventListener('deviceorientationabsolute', s.on, true);
      root.addEventListener('deviceorientation', s.on, true);
      s.timer = setTimeout(function () { if (st === s && !s.got) fail('nosensor'); }, 2500);
    }
    // 아이폰은 사용자가 누른 직후에 허용을 물어야 하므로 클릭 처리 안에서 바로 요청한다
    if (typeof D.requestPermission === 'function') {
      D.requestPermission().then(function (r) { if (st !== s) return; if (r === 'granted') listen(); else fail('denied'); }, function () { if (st === s) fail('denied'); });
    } else listen();
  }
  api.open = open; api.close = close;

  root.MantraCompass = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
