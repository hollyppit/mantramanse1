// 무료 콘텐츠 허브(/report/hub/): 공통 도구 · 해시 라우터 · 분석 이벤트 · 저장된 사주 정보 · 허브 홈.
//   타로    → hub-tarot.js (데이터·해석은 /shared-core.js 의 MantraCore.Tarot, 생성형 AI 호출 없음)
//   사주    → hub-saju.js  (입력 · 오늘의 운세 · 일주 각성 · MY 운명 — 계산은 /engine.js 의 Manse 그대로)
//   심층    → /report/v2/?from=hub (기존 무빙툰 뷰어. 허브에서 넘어오면 인트로·프롤로그를 건너뛰고 인생 지도로 바로 들어간다)
// 사주 엔진(246KB)은 사주가 필요한 화면에서 처음 필요할 때만 불러와, 타로·허브 첫 화면은 가볍게 뜬다.
(function (root) {
  'use strict';
  var H = root.Hub = { routes: {}, ctx: {} };
  var DOC = root.document, DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&]dev=1\b/.test(location.search);

  /* ── 공통 도구 ─────────────────────────────────────────────── */
  var esc = H.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  H.br = function (s) { return esc(s).replace(/\n/g, '<br>'); };
  H.$ = function (s, e) { return (e || DOC).querySelector(s); };
  H.$$ = function (s, e) { return [].slice.call((e || DOC).querySelectorAll(s)); };
  H.reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sget = function (k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  var sset = function (k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  H.ss = function (k, v) { return arguments.length > 1 ? sset(k, v) : sget(k); };
  H.toast = function (m, ms) { var t = H.$('#toast'); t.textContent = m; t.hidden = false; clearTimeout(H.toast._t); H.toast._t = setTimeout(function () { t.hidden = true; }, ms || 2800); };

  /* ── 분석 이벤트 ───────────────────────────────────────────────
     랜딩(story.js)과 같은 연결 지점: GA4(gtag) · dataLayer · 'mantra:track' 이벤트로 내보낸다. 사이트에 분석 도구가 없으면 아무 일도 일어나지 않는다(개발 화면은 콘솔에 표시).
     생년월일·이름 등 개인정보는 보내지 않는다.
     퍼널: landing_view → explore_click → tarot_view → tarot_category_select → tarot_card_select → tarot_result_view → tarot_to_saju_click → saju_input_start → saju_input_complete
           → ilju_awakening_start → ilju_awakening_complete → fortune_home_view → fortune_content_click → movingtoon_start/complete → premium_cta_click */
  var sent = {};
  H.track = function (name, props, once) {
    if (!name) return; if (once) { if (sent[name]) return; sent[name] = 1; }
    props = Object.assign({ src: 'hub' }, props || {});
    try { if (typeof root.gtag === 'function') root.gtag('event', name, props); } catch (e) { }
    try { if (root.dataLayer && root.dataLayer.push) root.dataLayer.push(Object.assign({ event: name }, props)); } catch (e) { }
    try { root.dispatchEvent(new CustomEvent('mantra:track', { detail: { name: name, props: props } })); } catch (e) { }
    if (DEV && root.console) console.log('[track]', name, props);
  };

  /* ── 저장된 사주 정보 ──────────────────────────────────────────
     만세력 앱·랜딩과 같은 키(mantra-manse-v1)와 같은 모양으로 이 기기(localStorage)에만 저장한다. 한 번 입력하면 모든 콘텐츠에서 다시 쓴다. */
  var STORE = 'mantra-manse-v1';
  var P = H.profile = {
    get: function () { try { var s = JSON.parse(localStorage.getItem(STORE) || 'null'); return s && s.year && s.month && s.day && (s.gender === 'M' || s.gender === 'F') ? s : null; } catch (e) { return null; } },
    has: function () { return !!P.get(); },
    save: function (saved) { try { var old = JSON.parse(localStorage.getItem(STORE) || 'null') || {}; localStorage.setItem(STORE, JSON.stringify(Object.assign({}, old, saved))); return true; } catch (e) { return false; } },
    // 저장 형태 → 엔진 입력(만세력 앱 run() 과 같은 변환)
    toInput: function (s) { s = s || P.get(); if (!s) return null; return { year: +s.year, month: +s.month, day: +s.day, hour: s.hourUnknown || s.hour == null || s.hour === '' ? null : +s.hour, minute: +s.minute || 0, calendar: s.calendar || 'solar', leap: !!s.leap, gender: s.gender, lon: +s.lon || 126.98, timeMode: s.timeMode || 'lmt', jasi: s.jasi || 'jeong', sinsalBase: s.sinsalBase || 'year', model: s.model || 'season', school: s.school || 'eokbu' }; },
    name: function () { var s = P.get(); return s && s.name ? String(s.name).slice(0, 20) : ''; },
    sig: function () { var s = P.get(); return s ? [s.year, s.month, s.day, s.hour, s.minute, s.gender, s.calendar, s.leap].join('-') : ''; },
    awakened: function () { try { return localStorage.getItem('mt_hub_awk') === P.sig(); } catch (e) { return false; } },
    markAwakened: function () { try { localStorage.setItem('mt_hub_awk', P.sig()); } catch (e) { } },
  };

  /* ── 지연 로딩 ─────────────────────────────────────────────── */
  var loaded = {};
  H.load = function (src) {
    return loaded[src] || (loaded[src] = new Promise(function (ok, no) { var s = DOC.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { delete loaded[src]; no(new Error('load ' + src)); }; DOC.head.appendChild(s); }));
  };
  // 사주 엔진 + 일간·일주 소개 문구(순수 데이터 파일). 둘 다 기존 파일을 그대로 쓴다.
  H.engine = function () { return root.Manse ? Promise.resolve(root.Manse) : H.load('/engine.js').then(function () { return root.Manse; }); };
  H.sajuKit = function () { return H.engine().then(function () { return root.ReportV2 && root.ReportV2.IntroText ? 1 : H.load('/report/v2/intro-text.js'); }).then(function () { return { M: root.Manse, T: root.ReportV2.IntroText }; }); };
  var chartCache = { sig: '', ch: null };
  H.chart = function () { // 저장된 정보로 계산한 사주(같은 정보면 재사용)
    var s = P.get(); if (!s) return Promise.reject(new Error('no profile'));
    return H.engine().then(function (M) { var sg = P.sig(); if (chartCache.sig !== sg) chartCache = { sig: sg, ch: M.compute(P.toInput(s)) }; return chartCache.ch; });
  };
  H.afterInput = function () { chartCache = { sig: '', ch: null }; };

  /* ── 기존 무빙툰 뷰어로 이어 가기 (입력값은 이 탭의 sessionStorage 로만 넘기고 서버로 보내지 않는다) ── */
  H.toV2 = function (o) {
    o = o || {}; var s = P.get(); if (!s) { H.go('#/input?next=' + encodeURIComponent(o.next || 'my')); return; }
    try { sessionStorage.setItem('mt_v2_input', JSON.stringify({ inp: P.toInput(s), name: P.name(), interest: o.interest || '' })); } catch (e) { H.toast('이 브라우저에서는 이어 볼 수 없습니다.'); return; }
    location.href = '/report/v2/?from=hub' + (o.classic ? '&flow=classic' : '');
  };

  /* ── 라우터: #/경로?키=값 ──────────────────────────────────── */
  H.route = function (name, fn) { H.routes[name] = fn; };
  H.go = function (hash) { if (location.hash === hash) H.render(); else location.hash = hash; };
  H.replace = function (hash) { history.replaceState(null, '', location.pathname + location.search + hash); H.render(); };
  function parse() { var h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('?'), path = i < 0 ? h : h.slice(0, i), q = {}; (i < 0 ? '' : h.slice(i + 1)).split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); try { q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } catch (e) { } }); return { path: path.replace(/\/$/, ''), q: q }; }
  H.view = function (html, o) { // 화면 교체: 위로 스크롤 + 부드러운 등장
    var el = H.$('#screen'); el.className = ''; el.innerHTML = html; void el.offsetWidth; el.className = 'fx'; if (!(o && o.keepScroll)) root.scrollTo(0, 0); return el;
  };
  H.render = function () {
    var r = parse(), fn = H.routes[r.path]; H.ctx = { token: (H.ctx.token || 0) + 1, q: r.q, path: r.path };
    var aw = H.$('#awk'); if (aw) aw.remove(); // 각성 연출 중 뒤로가기
    if (H.cleanup) { try { H.cleanup(); } catch (e) { } H.cleanup = null; }
    H.$('#tbBack').style.visibility = r.path ? 'visible' : 'hidden';
    if (!fn) { H.replace('#/'); return; }
    fn(r.q, H.ctx);
  };
  H.alive = function (ctx) { return ctx.token === H.ctx.token; }; // 비동기 작업이 끝났을 때 아직 같은 화면인지
  H.start = function () {
    // 카드 이미지 불러오기 실패 시 깨진 아이콘 대신 자리표시를 남긴다(error 는 버블링하지 않으므로 캡처 단계에서 받는다)
    DOC.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.classList.contains('tcimg')) t.remove(); }, true);
    DOC.addEventListener('load', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.classList.contains('tcimg')) t.classList.add('on'); }, true);
    DOC.addEventListener('click', function (e) { // data-track="이벤트" data-p="값": 링크·버튼 클릭 측정
      var a = e.target.closest && e.target.closest('[data-track]'); if (a) H.track(a.getAttribute('data-track'), a.getAttribute('data-p') ? { content: a.getAttribute('data-p') } : null);
    });
    H.$('#tbBack').onclick = function () { if (history.length > 1) history.back(); else H.go('#/'); }; // 브라우저 뒤로가기와 같다 — 화면 상태는 sessionStorage 에 있어 그대로 돌아온다
    root.addEventListener('hashchange', H.render); H.render();
  };

  /* ── 허브 홈 ───────────────────────────────────────────────── */
  H.route('', function (q, ctx) {
    var has = P.has(), nm = P.name(), need = function (next, to) { return has ? to : '#/input?next=' + next; };
    var el = H.view(
      '<section class="hero"><p class="kick">MANTRA FORTUNE</p><h1 class="h1">잠시, 운명의 이야기를<br>들여다볼까요?</h1><p class="sub">가볍게 오늘의 운세를 확인하거나,<br>당신이 타고난 이야기를 시작해보세요.</p></section>' +
      (has ? '<a class="todaybar" id="tbar" href="#/today" data-track="fortune_content_click" data-p="today_bar"><b>·</b><div><span>' + (nm ? esc(nm) + '님의 ' : '') + '오늘의 흐름</span><p id="tbarT">불러오는 중…</p></div></a>' : '') +
      '<div class="cards">' +
      '<a class="cc main" href="#/tarot" data-track="fortune_content_click" data-p="tarot"><i class="glyph" aria-hidden="true">運</i><small>FREE TAROT</small><h3>무료 타로</h3><p>마음속 질문 하나를 떠올려보세요.</p><div class="chips"><i>오늘의 카드</i><i>연애운</i><i>재물운</i><i>일·사업운</i><i>YES / NO</i></div><span class="go">카드 한 장 뽑기 →</span></a>' +
      '<a class="cc" href="' + need('today', '#/today') + '" data-track="fortune_content_click" data-p="today"><small>TODAY</small><h3>오늘의 운세</h3><p>오늘 나에게 들어온 흐름은?</p><span class="go">' + (has ? '지금 확인하기 →' : '생년월일로 확인하기 →') + '</span></a>' +
      '<a class="cc" href="' + need('awaken', '#/awaken') + '" data-track="fortune_content_click" data-p="ilju"><small>ILJU</small><h3>나의 일주 각성</h3><p>나는 어떤 기질을 타고났을까?</p><span class="go">나의 일주 확인하기 →</span></a>' +
      '<a class="cc" href="' + need('life', '#/go?to=life') + '" data-track="fortune_content_click" data-p="life"><small>LIFE FLOW</small><h3>내 인생의 흐름</h3><p>언제 움직이고,<br>언제 기다려야 할까?</p><span class="go">인생 지도 펼치기 →</span></a>' +
      '</div>' +
      '<details class="more"><summary>더 많은 운세 콘텐츠</summary>' +
      '<a href="#/my" data-track="fortune_content_click" data-p="my_home">MY 운명 홈 <small>내 사주 콘텐츠 모아보기</small></a>' +
      '<a href="/index.html" data-track="fortune_content_click" data-p="manse_app">만세력 원국 보기 <small>합충·신살·대운 전체</small></a>' +
      '<a href="/report/v2/?flow=classic" data-track="fortune_content_click" data-p="movingtoon_classic">심층 무빙툰 20챕터 <small>종합 리포트</small></a></details>');
    if (has) H.sajuKit().then(function () { return H.chart(); }).then(function (ch) { if (!H.alive(ctx)) return; var t = H.Saju && H.Saju.todayData(ch); if (t) { H.$('#tbar b', el).textContent = t.score; H.$('#tbarT', el).textContent = t.flowLabel + ' · ' + t.line; } }).catch(function () { var b = H.$('#tbar', el); if (b) b.hidden = true; });
    H.track('hub_view', { profile: has ? 1 : 0 }, true);
  });
  H.route('go', function (q) { // 저장된 정보가 있어야 하는 심층 콘텐츠로의 관문
    if (!P.has()) return H.replace('#/input?next=' + encodeURIComponent(q.to || 'my'));
    var INT = ['money', 'career', 'love', 'marriage', 'future', 'relation', 'self'];
    if (q.to === 'deep') H.toV2({ classic: true }); else if (INT.indexOf(q.to) >= 0) H.toV2({ interest: q.to }); else H.toV2(); // life(기본): 인생 지도 문서. 관심 분야(interest)를 넘기면 그 이야기가 먼저 나온다
  });
})(window);
