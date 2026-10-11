// 온보딩 · 슬라이드 툰 · 일간·일주 공개 · 개인화 홈 (허브 라우트 확장).
//   #/welcome  연구·유명인 사례(랜덤 후킹) → 명리학 소개 3장 → [나의 운 확인하기]
//   #/begin    무협 슬라이드 툰 '귀인의 천명록' — 출생정보 입력(6장면, 초안 자동 저장)
//   #/reveal   실제 계산한 일간·일주 공개
//   #/         프로필이 있으면 개인화 홈, 없으면 온보딩(?skip=1 이면 기존 허브 홈)
// 데이터·검증·호칭은 onboard-data.js(순수 로직), 계산은 /engine.js 의 Manse 그대로. 여기서 점수·명리 판단을 만들지 않는다.
(function (root) {
  'use strict';
  var H = root.Hub, O = root.Onboard, P = H.profile, esc = H.esc, br = H.br, $ = H.$, $$ = H.$$;
  var Ob = H.Onboard = {};
  var DRAFT = 'mt_onb_draft', RECENT = 'mt_onb_recent', SEEN = 'mt_onb_seen';
  var lget = function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  var lset = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

  /* ── 설정(관리자 공개본을 기본값 위에 얹는다) ─ 1.5초 안에 못 받으면 기본 문구로 간다 ──
     ?preview=1 로 관리자 화면 iframe 안에서 열리면 서버 대신 부모 창이 보내는 초안(postMessage)을 쓴다.
     같은 출처의 부모만 받아들이고 측정은 보내지 않는다 — 일반 방문자는 초안을 볼 수 없다. */
  var PREVIEW = false; try { PREVIEW = /[?&]preview=1\b/.test(location.search) && root.parent && root.parent !== root && new URL(document.referrer || location.href).origin === location.origin; } catch (e) { }
  Ob.preview = PREVIEW;
  var DEV = (root.innerWidth || 1024) < 768 ? 'm' : 'd';
  var cfgP = null, CFG = O.merge(O.DEFAULTS, null), version = '';
  if (PREVIEW) root.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== root.parent || !e.data || e.data.t !== 'mt-onb-preview') return;
    CFG = O.merge(O.DEFAULTS, e.data.config || null); cfgP = Promise.resolve(CFG);
    if (e.data.hash) { try { if (location.hash !== e.data.hash) { location.hash = e.data.hash; return; } } catch (x) { } }
    try { H.render(); } catch (x) { }
  });
  if (PREVIEW) { // 관리자 미리보기: 섹션을 누르면 부모 창이 해당 편집 입력란을 연다(링크·버튼·입력은 그대로 동작)
    try {
      var st = document.createElement('style'); st.textContent = '[data-sec],[data-intro]{cursor:pointer}[data-sec]:hover{outline:2px dashed rgba(224,179,106,.75);outline-offset:-2px}[data-intro]:hover{outline:2px dashed rgba(120,200,255,.75);outline-offset:-2px}'; document.head.appendChild(st);
      document.addEventListener('click', function (e) {
        var t = e.target; if (!t || !t.closest || t.closest('a,button,input,select,textarea,label,summary')) return;
        var it = t.closest('[data-intro]'), sc = t.closest('[data-sec]'); if (!it && !sc) return;
        root.parent.postMessage({ t: 'mt-onb-select', intro: it ? it.getAttribute('data-intro') : '', sec: sc ? sc.getAttribute('data-sec') : '' }, location.origin);
      }, true);
    } catch (e) { }
  }
  Ob.config = function () {
    if (!cfgP) cfgP = new Promise(function (ok) {
      var done = false, fin = function (c, v) { if (done) return; done = true; if (c) { CFG = O.merge(O.DEFAULTS, c); version = v || ''; } ok(CFG); };
      if (PREVIEW) { setTimeout(function () { fin(null); }, 4000); try { root.parent.postMessage({ t: 'mt-onb-ready' }, location.origin); } catch (e) { } return; }
      setTimeout(function () { fin(null); }, 1500);
      try { fetch('/api/onboarding').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { fin(d && d.config, d && d.version); }).catch(function () { fin(null); }); } catch (e) { fin(null); }
    });
    return cfgP;
  };
  Ob.cfg = function () { return CFG; };
  var SA = function (map, role) { return root.ObStyle ? root.ObStyle.attr(map && map[role]) : ''; }; // 관리자가 정한 글자 스타일(글씨체·크기·굵기·색) → style 속성
  var A = function (name) { return O.addr(name, CFG); };           // [이름] 귀인
  var F = function (t, name) { return O.fill(t, name, CFG); };      // 대사 치환

  /* ── 측정: 허브 분석 이벤트 + 서버 집계(이름과 사례 id 만. 출생정보·이름은 보내지 않는다) ── */
  Ob.track = function (name, props, once) {
    if (PREVIEW) return; // 관리자 미리보기는 통계에 섞지 않는다
    H.track(name, props, once);
    try { fetch('/api/onboarding?ev=' + encodeURIComponent(name) + '&d=' + DEV, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ case: props && props.case || '' }), keepalive: true }).catch(function () { }); } catch (e) { }
  };
  var onceSent = {};
  // 세션(탭을 닫을 때까지)당 한 번: 방문자 수가 아니라 "세션 수" 지표용
  var sessOnce = function (name, props) { var k = 'mt_onb_s_' + name + '|' + (props && props.case || ''); try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { if (onceSent[k]) return; onceSent[k] = 1; } Ob.track(name, props); };
  var tOnce = function (name, props) { var k = name + '|' + (props && props.case || ''); if (onceSent[k]) return; onceSent[k] = 1; Ob.track(name, props); };

  /* ── 화면 그리기: 온보딩은 허브의 "홈화면으로 가기" 줄 없이 직접 그린다 ── */
  var firstPaint = true;
  function toHubTop() {
    if (!H.embed) { root.scrollTo(0, 0); return; }
    if (firstPaint) { firstPaint = false; return; } // 랜딩 첫 화면을 보고 있는 동안에는 건드리지 않는다
    var hb = H.$('#hub'); root.scrollTo(0, Math.max(0, hb.getBoundingClientRect().top + root.scrollY - 8));
  }
  function paint(html, cls) {
    var el = H.$('#screen'); el.className = ''; el.innerHTML = '<div class="ob ' + (cls || '') + (H.reduce ? ' rm' : '') + '">' + html + '</div>'; void el.offsetWidth; el.className = 'fx'; toHubTop(); return el;
  }
  /* 전체 화면 무빙툰 장면: 같은 html(진행률·무대·입력·버튼)을 배경 / 캐릭터+말풍선 / 하단 입력 시트로 다시 배치한다.
     id(#obBub #obForm #obMsg #obBack #obOk …)는 그대로라 기존 bind() 가 그대로 동작한다. 화면을 떠나면 걷어 낸다. */
  function paintFs(html, cls) {
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    var prog = tmp.querySelector('.ob-prog'), stage = tmp.querySelector('.ob-stage'); if (!stage) return paint(html, cls);
    var host = document.getElementById('hub') || document.body, fs = document.getElementById('obFs');
    if (!fs) { fs = document.createElement('div'); fs.id = 'obFs'; host.appendChild(fs); onLeave(function () { var e = document.getElementById('obFs'); if (e && e.parentNode) e.parentNode.removeChild(e); }); }
    var mk = function (c) { var d = document.createElement('div'); d.className = c; return d; };
    var bg = mk('ob-fs-bg ' + stage.className.replace(/\bob-stage\b/, '').trim()), sh = mk('ob-fs-shade'), top = mk('ob-fs-top'), mid = mk('ob-fs-mid'), sheet = mk('ob-fs-sheet');
    var st = stage.getAttribute('style'); if (st) bg.setAttribute('style', st);
    if (prog) top.appendChild(prog); // appendChild 가 원래 자리에서 옮긴다
    while (stage.firstChild) mid.appendChild(stage.firstChild);
    stage.parentNode.removeChild(stage);
    var root0 = tmp.firstElementChild && tmp.children.length === 1 ? tmp.firstElementChild : tmp; while (root0.firstChild) sheet.appendChild(root0.firstChild);
    fs.className = 'ob-fs' + (H.reduce ? ' rm' : ''); fs.innerHTML = '';
    [bg, sh, top, mid, sheet].forEach(function (n) { fs.appendChild(n); });
    var scr = H.$('#screen'); if (scr) { scr.className = ''; scr.innerHTML = ''; }
    toHubTop(); return fs;
  }
  // 화면을 떠날 때(허브 라우터가 H.cleanup 을 부른다) 리스너를 걷어 낸다
  function onLeave(fn) { var prev = H.cleanup; H.cleanup = function () { try { fn(); } catch (e) { } if (prev) prev(); }; }
  function swipe(el, onL, onR) { // 좌우 스와이프(세로 스크롤과 구분)
    var x0 = 0, y0 = 0, t0 = 0;
    var ts = function (e) { var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); };
    var te = function (e) { var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; if (Date.now() - t0 < 700 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) { if (dx < 0) onL(); else onR(); } };
    el.addEventListener('touchstart', ts, { passive: true }); el.addEventListener('touchend', te, { passive: true });
    onLeave(function () { el.removeEventListener('touchstart', ts); el.removeEventListener('touchend', te); });
  }
  function keynav(onL, onR) {
    var f = function (e) { var a = document.activeElement; if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return; if (e.key === 'ArrowRight') onL(); else if (e.key === 'ArrowLeft') onR(); };
    document.addEventListener('keydown', f); onLeave(function () { document.removeEventListener('keydown', f); });
  }

  /* ── 수련생 캐릭터(같은 인물, 표정만 바뀐다). 관리자가 올린 이미지가 있으면 그것을 쓴다 ── */
  function avatar(face, img) {
    if (img) return '<img class="ob-av" src="' + esc(img) + '" alt="" loading="lazy">';
    var eyes = { greet: '<path d="M38 56q4-6 8 0M64 56q4-6 8 0" /><circle cx="42" cy="57" r="0"/>', ask: '<circle cx="42" cy="55" r="3.2"/><circle cx="68" cy="55" r="3.2"/><path d="M34 46l12-3M64 43l12 3"/>', shock: '<circle cx="42" cy="55" r="5" class="o"/><circle cx="68" cy="55" r="5" class="o"/><circle cx="42" cy="55" r="1.6"/><circle cx="68" cy="55" r="1.6"/><path d="M34 42l10-4M66 38l10 4"/>', serious: '<path d="M37 55h11M62 55h11"/><path d="M34 47l13 2M63 49l13-2"/>', proud: '<path d="M37 57q5-7 10 0M63 57q5-7 10 0"/>', worry: '<circle cx="42" cy="56" r="3"/><circle cx="68" cy="56" r="3"/><path d="M34 49l12-4M64 45l12 4"/>' };
    var mouth = { greet: '<path d="M46 72q9 8 18 0"/>', ask: '<circle cx="55" cy="74" r="3"/>', shock: '<ellipse cx="55" cy="75" rx="5" ry="6.5" class="o"/>', serious: '<path d="M48 74h14"/>', proud: '<path d="M44 70q11 13 22 0" /><path d="M46 71h18" class="f"/>', worry: '<path d="M47 76q8-6 16 0"/>' };
    face = eyes[face] ? face : 'greet';
    return '<svg class="ob-av" viewBox="0 0 110 150" role="img" aria-label="무림 수련생" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#2a2118" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M18 150q4-44 37-44t37 44z" fill="#4c6a63"/><path d="M42 108l13 16 13-16" stroke="#d8c9a5"/><rect x="48" y="96" width="14" height="14" rx="5" fill="#e9cfa6"/>' +
      '<ellipse cx="55" cy="58" rx="31" ry="34" fill="#f0d8b2"/><path d="M24 50q4-30 31-30t31 30q-14-12-31-12T24 50z" fill="#2a2118"/><circle cx="55" cy="14" r="9" fill="#2a2118"/><path d="M24 48q31-10 62 0" stroke="#b5432f" stroke-width="5"/>' +
      '<g class="fe">' + eyes[face] + '</g><g class="fm">' + mouth[face] + '</g></g></svg>';
  }
  var BGTHEME = { gate: 'bg-gate', scroll: 'bg-scroll', stars: 'bg-stars', map: 'bg-map', ledger: 'bg-ledger', reveal: 'bg-reveal' };

  /* ═════════ 온보딩 1부: 연구·유명인 사례 + 명리학 소개 ═════════ */
  var TYPE_LABEL = { research: '실제 연구', celebrity: '실제 인물 이야기' };
  // 유형(research | celebrity)마다 한 건. 같은 세션에서는 고른 사례를 유지하고, 최근 본 사례는 피한다.
  function currentCase(type) {
    var id = null; try { id = sessionStorage.getItem('mt_onb_case_' + type); } catch (e) { }
    return id && O.publicCases(CFG.cases).filter(function (x) { return x.id === id && x.type === type; })[0] || null;
  }
  function chooseCase(type, forceNew) {
    var cur = currentCase(type); if (cur && !forceNew) return cur;
    var recent = lget(RECENT) || []; if (forceNew && cur) recent = [cur.id].concat(recent.filter(function (r) { return r !== cur.id; }));
    var c = O.pickCase(CFG, { recent: recent.slice(0, 4), type: type });
    if (c) { try { sessionStorage.setItem('mt_onb_case_' + type, c.id); } catch (e) { } lset(RECENT, [c.id].concat(recent.filter(function (r) { return r !== c.id; })).slice(0, 6)); }
    return c;
  }
  // 랜딩 아래 이어지는 한 페이지: CFG.sections 순서대로 연구 카드 → 명리학 → 서비스 소개 → 최종 CTA. 장면은 화면에 들어올 때 나타난다(스크롤은 방문자가 쥔다).
  var nl = function (s) { return esc(s).replace(/\n/g, '<br>'); };
  var KIND_NUM = { research: '02', myeongri: '03', service: '04' };
  function welcome(q, ctx) {
    Ob.config().then(function () {
      if (!H.alive(ctx)) return;
      if (!PREVIEW) { try { sessionStorage.setItem('mt_onb_shown', '1'); } catch (e) { } }
      var Art = root.OnboardArt || { forCase: function () { return ''; }, forIntro: function () { return ''; }, forTopic: function () { return ''; } };
      var intro = CFG.intro.filter(function (s) { return s.enabled !== false; }), BR = CFG.bridge || {}, seenN = 0, hasProfile = P.has();
      var secs = (CFG.sections || []).filter(function (s) { return s.enabled !== false; });
      if (!secs.some(function (s) { return s.type === 'final'; })) secs.push(O.SECTIONS.filter(function (s) { return s.type === 'final'; })[0]); // 최종 CTA 는 끌 수 없다(막다른 길 방지)
      var cur = { research: null, celebrity: null };
      var media = function (o, svg, fx) {
        var m = o && o.video ? '<video class="cn-media" data-lazyvid src="' + esc(o.video) + '" muted playsinline loop preload="metadata"></video>' : o && o.image ? '<img class="cn-media" src="' + esc(o.image) + '" alt="' + esc(o.alt || '') + '" loading="lazy" decoding="async">' : '';
        if (!m) return svg || '';
        return fx === 'crossfade' && svg ? '<div class="cn-xf">' + svg + m.replace('class="cn-media"', 'class="cn-media xf"') + '</div>' : m;
      };
      var cta = function (sec, big) { return sec.cta && sec.cta.show && sec.cta.text ? '<div class="cn-cta-row"><button type="button" class="btn ' + (big ? 'cn-go' : 'cn-go sm') + '" data-go="' + esc(sec.id) + '"' + SA(sec.sty, 'cta') + '>' + esc(F(sec.cta.text)) + '</button></div>' : ''; };
      var head = function (sec) {
        return (sec.kicker ? '<p class="cn-kick"' + SA(sec.sty, 'kicker') + '>' + esc(sec.kicker) + '</p>' : '') + (sec.title ? '<h2 class="cn-title"' + SA(sec.sty, 'title') + '>' + nl(F(sec.title)) + '</h2>' : '') + (sec.sub ? '<p class="tx-p cn-rev"' + SA(sec.sty, 'sub') + '>' + nl(F(sec.sub)) + '</p>' : '');
      };
      var wrap = function (sec, inner, extra) {
        var st = (sec.bg ? '--sec-bg:url(' + esc(sec.bg) + ');' : '') + (sec.bgMobile ? '--sec-bg-m:url(' + esc(sec.bgMobile) + ');' : '');
        return '<section class="cn-sec cn-s-' + sec.type + ' fxe-' + esc(sec.effect || 'fade') + (sec.bg ? ' has-bg' : '') + (extra || '') + '" data-sec="' + esc(sec.id) + '" data-type="' + sec.type + '"' + (st ? ' style="' + st + '"' : '') + '>' + inner + '</section>';
      };

      /* 연구: 카드가 아니라 "컷". 그림 한 장 → 질문 → 문장이 하나씩 → 한 줄 단서 → 작은 출처 */
      function researchCard(c) {
        var st = c.study || {}, m = c.media || {}, d = c.display || {}, sum = (c.body || []).slice(0, 4);
        var art = media({ video: m.video, image: m.image, alt: m.alt }, Art.forCase(c.visual), 'fade');
        var full = String(st.limits || c.caveat || ''), k = full.indexOf('. '), cav = k > 0 ? full.slice(0, k + 1) : full; // 한계는 라벨 없이 한 문장으로 자연스럽게
        var foot = [st.org || c.who, st.year || c.year].filter(Boolean).join(', ');
        return '<article class="rc cn-rev" data-case="' + esc(c.id) + '"><div class="rc-art">' + art + '</div>' +
          (c.hook ? '<p class="tx-q cn-rev"' + SA(c.sty, 'hook') + '>' + esc(c.hook) + '</p>' : '') +
          (d.showTitle !== false ? '<h3 class="tx-h cn-rev"' + SA(c.sty, 'title') + '>' + esc(c.title) + '</h3>' : '') +
          (d.showSummary !== false ? sum.map(function (p) { return '<p class="tx-p cn-rev"' + SA(c.sty, 'body') + '>' + esc(p) + '</p>'; }).join('') : '') +
          (cav ? '<p class="tx-soft cn-rev"' + SA(c.sty, 'caveat') + '>' + esc(cav) + '</p>' : '') +
          (d.showSource !== false && foot ? '<p class="tx-src cn-rev"' + SA(c.sty, 'source') + '>— ' + esc(foot) + '</p>' : '') + '</article>';
      }
      function researchSec(sec) {
        var cards = O.birthCards(CFG.cases); if (!cards.length) return '';
        return wrap(sec, head(sec) + cards.map(researchCard).join('') +
          (sec.notice ? '<p class="tx-soft cn-rev"' + SA(sec.sty, 'notice') + '>' + nl(F(sec.notice)) + '</p>' : '') + (sec.bridge ? '<p class="tx-turn cn-rev"' + SA(sec.sty, 'bridge') + '>' + nl(F(sec.bridge)) + '</p>' : '') + cta(sec), '');
      }

      /* 명리학: 장면 몇 컷. 원리 나열(주제 목록)은 섹션 설정에서 켠 경우에만 */
      function topicHtml(tp) {
        return '<details class="tp"><summary><span class="tp-t">' + esc(tp.title) + '</span></summary><div class="tp-b"><p class="tx-p">' + esc(tp.summary || '') + '</p>' + (tp.detail ? '<p class="tx-soft">' + esc(tp.detail) + '</p>' : '') + (tp.analogy ? '<p class="tx-soft">' + esc(tp.analogy) + '</p>' : '') + '</div></details>';
      }
      function myeongriSec(sec) {
        var scenes = intro.map(function (s) {
          return '<div class="cn-sub-sec" data-intro="' + esc(s.id) + '"><div class="cn-art">' + media(s, Art.forIntro(s.id), sec.effect) + '</div><h3 class="tx-h cn-rev"' + SA(s.sty, 'title') + '>' + esc(s.title) + '</h3><p class="tx-p cn-rev"' + SA(s.sty, 'body') + '>' + esc(s.body) + '</p>' + (s.sub ? '<p class="tx-soft cn-rev"' + SA(s.sty, 'sub') + '>' + esc(s.sub) + '</p>' : '') + '</div>';
        }).join('');
        var tps = sec.topics ? (CFG.topics || []).filter(function (x) { return x.enabled !== false; }) : [];
        return wrap(sec, head(sec) + scenes + (tps.length ? '<div class="tp-list cn-rev">' + tps.map(topicHtml).join('') + '</div>' : '') + (sec.notice ? '<p class="tx-soft cn-rev"' + SA(sec.sty, 'notice') + '>' + nl(F(sec.notice)) + '</p>' : '') + cta(sec), '');
      }

      /* 서비스 소개 */
      function serviceSec(sec) {
        var list = (CFG.services || []).filter(function (x) { return x.visible !== false; });
        if (!list.length) return '';
        return wrap(sec, head(sec) + '<ul class="sv-list">' + list.map(function (x) {
          var soon = x.status === 'soon', body = (x.video || x.image) ? media(x, '', sec.effect) : '<span class="sv-glyph" aria-hidden="true">' + esc(x.glyph || '') + '</span>';
          return '<li class="sv sv-' + (soon ? 'soon' : 'live') + ' cn-rev"><div class="sv-media">' + body + '</div><div class="sv-t"><h3>' + esc(x.title) + '</h3><p>' + esc(x.desc) + '</p>' +
            '<span class="sv-badge">' + (soon ? '준비 중' : '이용 가능') + '</span>' + (x.link && !soon ? '<a class="sv-link" href="' + esc(x.link) + '" data-ob-ev="movingtoon_preview_view" data-case="s-' + esc(x.id) + '">미리 보기 →</a>' : '') + '</div></li>';
        }).join('') + '</ul>' + cta(sec), '');
      }

      /* 예전 "연구 → 유명인" 후킹(기본 꺼짐, 관리자가 켤 수 있다) */
      var TYPE_LABEL2 = { research: '실제 연구', celebrity: '실제 인물 이야기' };
      function storyCase(c) {
        var src = c.source || {}, link = src.url ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer" data-ob-ev="onboarding_source_click" data-case="' + esc(c.id) + '">' + esc(src.doi ? 'DOI ' + src.doi : '원문 보기') + '</a>' : '';
        var paras = (c.story && c.story.length ? c.story : c.body || []).slice(0, 6);
        return '<p class="cn-kick">' + esc(O.KINDS[c.kind] || TYPE_LABEL2[c.type] || '') + (c.year ? ' · ' + c.year : '') + '</p><div class="cn-art">' + media(c, Art.forCase(c.visual)) + '</div>' +
          '<p class="cn-hook">' + esc(c.hook) + '</p><h2 class="cn-title">' + esc(c.title) + '</h2><div class="cn-story">' + paras.map(function (p) { return '<p class="cn-rev">' + esc(p) + '</p>'; }).join('') + '</div>' +
          (c.takeaway ? '<p class="cn-take cn-rev">' + esc(c.takeaway) + '</p>' : '') + (c.caveat ? '<p class="cn-cav">' + esc(c.caveat) + '</p>' : '') +
          '<details class="cn-src"><summary>출처 확인</summary><p>' + esc(c.who || '') + (c.who && src.label ? ' · ' : '') + esc(src.label || '') + (link ? '<br>' + link : '') + '</p></details>' +
          '<div class="cn-links"><button type="button" data-other="' + esc(c.type) + '">다른 ' + (c.type === 'research' ? '연구' : '인물') + ' 이야기 보기</button></div>';
      }
      function storySec(sec) {
        cur.research = chooseCase('research', false); cur.celebrity = chooseCase('celebrity', false);
        var h = '';
        if (cur.research) h += '<section class="cn-sec" data-type="research" data-case="' + esc(cur.research.id) + '">' + storyCase(cur.research) + '</section>';
        if (cur.research && cur.celebrity) h += '<section class="cn-sec cn-bridge"><p class="cn-bridge-t cn-rev">' + esc(BR.toCelebrity || '') + '</p></section>';
        if (cur.celebrity) h += '<section class="cn-sec" data-type="celebrity" data-case="' + esc(cur.celebrity.id) + '">' + storyCase(cur.celebrity) + '</section>';
        return h;
      }

      /* 최종 CTA */
      function finalSec(sec) {
        var inner = '<div class="cn-art">' + media({ image: sec.art || '', video: sec.artVideo || '' }, Art.forIntro('end')) + '</div>' +
          '<h2 class="cn-title big"' + SA(sec.sty, 'title') + '>' + nl(F(sec.title || CFG.introLast.line)) + '</h2>' + (sec.sub ? '<p class="cn-body cn-rev"' + SA(sec.sty, 'sub') + '>' + nl(F(sec.sub)) + '</p>' : '') +
          '<button type="button" class="btn cn-go" id="obGo" data-go="' + esc(sec.id) + '"' + SA(sec.sty, 'cta') + '>' + esc(F((sec.cta && sec.cta.text) || CFG.introLast.cta)) + '</button>' +
          '<div class="cn-links" style="justify-content:center">' + (hasProfile ? '<a class="cn-lnk" href="#/?nogate=1" data-track="onboarding_home_back">내 홈으로 돌아가기</a>' : '<a class="cn-lnk" href="#/?skip=1" data-track="onboarding_browse_click">먼저 무료 타로·캘린더 둘러보기</a>') + '</div>' +
          '<p class="tx-soft" style="text-align:center">' + esc(O.INTRO_NOTICE) + '</p>';
        return wrap(sec, inner, ' cn-last" id="cnLast');
      }
      var builders = { research: researchSec, myeongri: myeongriSec, service: serviceSec, story: storySec, final: finalSec };
      var h = '<div class="cn-prog" id="cnProg" aria-hidden="true"></div>';
      secs.forEach(function (sec) { h += (builders[sec.type] ? builders[sec.type](sec) : ''); });
      h += '<button type="button" class="cn-skip" id="obSkip">건너뛰기 ↓</button>';
      var el = paint('<div class="cn">' + h + '</div>', 'ob-cine');
      var allSecs = $$('.cn-sec', el), skip = $('#obSkip', el), last = $('#cnLast', el);
      var caseId = function () { return (cur.research && cur.research.id) || (cur.celebrity && cur.celebrity.id) || ''; };
      var EV = { research: ['research_section_view'], myeongri: ['myeongri_section_view'], service: ['service_section_view', 'movingtoon_preview_view'] };
      function enter(sec) {
        if (sec.classList.contains('in')) return; sec.classList.add('in'); seenN++;
        var type = sec.getAttribute('data-type'), sid = sec.getAttribute('data-sec');
        (EV[type] || []).forEach(function (ev) { sessOnce(ev, { case: 's-' + sid }); }); // 세션당 1회 — 전환 흐름의 분모(랜딩 진입)와 같은 기준
        var id = sec.getAttribute('data-case'); if (id) tOnce('onboarding_card_impression', { case: id, type: type });
        $$('.rc', sec).forEach(function (c) { sessOnce('onboarding_card_impression', { case: c.getAttribute('data-case'), type: 'research' }); });
        if (sec === last) { tOnce('onboarding_intro_complete', { case: caseId() }); skip.hidden = true; }
      }
      var prog = $('#cnProg', el), hubEl = H.$('#hub'), mobile = (root.innerWidth || 1024) < 768;
      var vids = $$('video[data-lazyvid]', el), vio = null;
      if (vids.length && 'IntersectionObserver' in root && !H.reduce) { // 영상은 화면에 있을 때만 재생(성능)
        vio = new IntersectionObserver(function (es) { es.forEach(function (e) { var v = e.target; if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () { }); } else v.pause(); }); }, { threshold: 0.25 });
        vids.forEach(function (v) { vio.observe(v); });
      }
      var tick = function () {
        var d = document.documentElement, m = d.scrollHeight - d.clientHeight, vh = root.innerHeight || d.clientHeight;
        if (H.embed && hubEl) { var hr = hubEl.getBoundingClientRect(), inHub = hr.top < vh * 0.6 && hr.bottom > vh * 0.3; skip.style.visibility = inHub && last && !last.classList.contains('in') ? 'visible' : 'hidden'; prog.hidden = true; }
        else prog.style.transform = 'scaleX(' + (m > 0 ? Math.min(1, root.scrollY / m) : 0) + ')';
        allSecs.forEach(function (x) {
          var r = x.getBoundingClientRect();
          if (!x.classList.contains('in') && r.top < vh * 0.8) enter(x);
          if (!H.reduce && !mobile && x.classList.contains('fxe-parallax') && r.bottom > 0 && r.top < vh) x.style.setProperty('--py', Math.round((r.top / vh) * -28) + 'px'); // 배경만 살짝 느리게(본문은 그대로)
        });
        $$('.cn-rev:not(.in)', el).forEach(function (x) { if (x.getBoundingClientRect().top < vh * 0.88) x.classList.add('in'); });
      };
      root.addEventListener('scroll', tick, { passive: true }); root.addEventListener('resize', tick);
      var t0 = setTimeout(tick, 60), t1 = setTimeout(tick, 600);
      onLeave(function () { root.removeEventListener('scroll', tick); root.removeEventListener('resize', tick); clearTimeout(t0); clearTimeout(t1); if (vio) vio.disconnect(); });
      skip.onclick = function () { Ob.track('onboarding_skip', { seen: seenN, case: caseId() }); if (last) last.scrollIntoView({ behavior: H.reduce ? 'auto' : 'smooth', block: 'center' }); };
      el.addEventListener('click', function (e) {
        var dt = e.target.closest && e.target.closest('[data-detail]'); // 연구 자세히 보기
        if (dt) { var box = dt.closest('.rc'), pane = $('.rc-detail', box), open = pane.hidden; pane.hidden = !open; dt.setAttribute('aria-expanded', String(open)); dt.textContent = open ? '자세히 보기 닫기' : '연구 자세히 보기'; if (open) Ob.track('research_detail_open', { case: dt.getAttribute('data-detail') }); return; }
        var go = e.target.closest && e.target.closest('[data-go]'); // 나의 운 확인하기(섹션 어디서나)
        if (go) { var sid = go.getAttribute('data-go'); Ob.track('landing_cta_click', { case: 's-' + sid }); Ob.track('onboarding_cta_click', { case: caseId() }); if (PREVIEW) return; lset(SEEN, 1); var so = secs.filter(function (x) { return x.id === sid; })[0]; if (so && so.cta && so.cta.to === 'quick') { H.go('#/input?next=my'); return; } /* CTA 연결 경로: 기본은 인터랙티브 스토리 */ H.go(q.replay && P.has() ? '#/begin?edit=1' : '#/begin'); return; }
        var b = e.target.closest && e.target.closest('[data-other]'); if (!b) return; // 다른 연구/인물 이야기 보기(예전 후킹)
        var type = b.getAttribute('data-other'), n = chooseCase(type, true), sec = b.closest('.cn-sec'); if (!n || !sec) return;
        cur[type] = n; Ob.track('onboarding_other_case', { case: n.id });
        sec.classList.remove('in'); sec.setAttribute('data-case', n.id); sec.innerHTML = storyCase(n); void sec.offsetWidth; sec.classList.add('in');
        tOnce('onboarding_card_impression', { case: n.id, type: type }); sec.scrollIntoView({ behavior: H.reduce ? 'auto' : 'smooth', block: 'start' }); setTimeout(tick, 80);
      });
      sessOnce('landing_view', {});
      Ob.track('onboarding_view', { replay: q.replay ? 1 : 0, case: caseId() }, true);
    });
  }
  H.route('welcome', welcome);

  /* ═════════ 출생정보 슬라이드 툰 ═════════ */
  var blank = function () { return { name: '', calendar: 'solar', leap: false, year: '', month: '', day: '', hour: '', minute: '', hourUnknown: false, country: 'KR', place: '서울', gender: '' }; };
  function fromProfile(s) {
    return { name: s.name || '', calendar: s.calendar === 'lunar' ? 'lunar' : 'solar', leap: !!s.leap, year: s.year || '', month: s.month || '', day: s.day || '', hour: s.hourUnknown ? '' : s.hour, minute: s.hourUnknown ? '' : s.minute, hourUnknown: !!s.hourUnknown, country: s.country || 'KR', place: s.city || '서울', gender: s.gender || '' };
  }
  H.route('begin', function (q, ctx) {
    if (P.has() && !q.edit) return H.replace('#/'); // 이미 프로필이 있으면 입력을 건너뛴다
    H.engine().catch(function () { }); // 미리 불러 둔다(음력·윤달 검증에 필요)
    Ob.config().then(function () {
      if (!H.alive(ctx)) return;
      var scenes = CFG.scenes.filter(function (s) { return s.enabled !== false; });
      var dr = lget(DRAFT), d, step = 0;
      if (q.edit && P.get()) { d = fromProfile(P.get()); }
      else if (dr && dr.d && dr.v === 1) { d = Object.assign(blank(), dr.d); step = Math.max(0, Math.min(scenes.length - 1, +dr.step || 0)); }
      else d = blank();
      var started = !!(dr && dr.d);
      var save = function () { lset(DRAFT, { v: 1, step: step, d: d }); };
      function summary() { return '<dl class="ob-sum">' + [['이름', d.name ? esc(d.name) : '입력 안 함', 'name'], ['생년월일', dateText(), 'date'], ['태어난 시각', d.hourUnknown || d.hour === '' ? '모름' : d.hour + '시 ' + (+d.minute || 0) + '분', 'time'], ['태어난 곳', d.country === 'KR' ? esc(d.place) : '해외·기타 (한국 표준시 기준)', 'place'], ['성별', d.gender === 'M' ? '남' : d.gender === 'F' ? '여' : '-', 'gender']].map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd><button type="button" class="lnk" data-jump="' + r[2] + '">수정</button></div>'; }).join('') + '</dl>'; }
      function dateText() { return d.year ? d.year + '년 ' + d.month + '월 ' + d.day + '일 · ' + (d.calendar === 'lunar' ? '음력' + (d.leap ? ' 윤달' : '') : '양력') : '-'; }
      var opt = function (a, b, sel, suf, ph, desc) { var h = '<option value="">' + ph + '</option>', i; if (desc) for (i = b; i >= a; i--) h += '<option value="' + i + '"' + (String(sel) === String(i) ? ' selected' : '') + '>' + i + suf + '</option>'; else for (i = a; i <= b; i++) h += '<option value="' + i + '"' + (String(sel) === String(i) ? ' selected' : '') + '>' + i + suf + '</option>'; return h; };

      function fieldHtml(s) {
        if (s.field === 'name') return '<label class="f"><span>이름 또는 별호</span><input type="text" id="fName" maxlength="20" autocomplete="off" placeholder="' + esc(s.hint || '이름 또는 별호를 입력하세요') + '" value="' + esc(d.name) + '"></label><p class="note">입력하지 않아도 계속할 수 있습니다.</p>';
        if (s.field === 'date') {
          var y = new Date().getFullYear();
          return '<div class="f seg" role="radiogroup" aria-label="달력"><span>달력</span><label><input type="radio" name="cal" value="solar"' + (d.calendar === 'solar' ? ' checked' : '') + '><i>양력</i></label><label><input type="radio" name="cal" value="lunar"' + (d.calendar === 'lunar' ? ' checked' : '') + '><i>음력</i></label></div>' +
            '<div class="f row3"><span>생년월일</span><select id="fY" aria-label="년">' + opt(1900, y, d.year, '년', '년', true) + '</select><select id="fM" aria-label="월">' + opt(1, 12, d.month, '월', '월') + '</select><select id="fD" aria-label="일">' + opt(1, 31, d.day, '일', '일') + '</select></div>' +
            '<label class="chk ob-leap" id="fLeapW"' + (d.calendar === 'lunar' ? '' : ' hidden') + '><input type="checkbox" id="fLeap"' + (d.leap ? ' checked' : '') + '><i>윤달에 태어났어요</i></label>' +
            '<label class="f"><span>빠른 입력 (예: 19900315)</span><input type="text" id="fQuick" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="숫자 8자리"></label>';
        }
        if (s.field === 'time') return '<div class="f row2"><span>태어난 시각</span><select id="fH" aria-label="시"' + (d.hourUnknown ? ' disabled' : '') + '>' + opt(0, 23, d.hour, '시', '시') + '</select><input type="number" id="fMin" min="0" max="59" inputmode="numeric" placeholder="분" aria-label="분" value="' + esc(d.minute) + '"' + (d.hourUnknown ? ' disabled' : '') + '></div>' +
          '<label class="chk"><input type="checkbox" id="fUnk"' + (d.hourUnknown ? ' checked' : '') + '><i>시각을 몰라요</i></label>';
        if (s.field === 'place') return '<div class="f seg" role="radiogroup" aria-label="출생 국가"><span>국가</span><label><input type="radio" name="cty" value="KR"' + (d.country === 'KR' ? ' checked' : '') + '><i>대한민국</i></label><label><input type="radio" name="cty" value="OT"' + (d.country === 'KR' ? '' : ' checked') + '><i>해외·기타</i></label></div>' +
          '<div id="fPlaceKR"' + (d.country === 'KR' ? '' : ' hidden') + '><label class="f"><span>지역 검색</span><input type="text" id="fPS" autocomplete="off" placeholder="예: 부산"></label><div class="ob-places" id="fPL" role="listbox" aria-label="지역">' + placeChips('') + '</div></div>' +
          '<p class="ob-warn" id="fPlaceOT"' + (d.country === 'KR' ? ' hidden' : '') + '>현재 계산은 한국 표준시를 기준으로 합니다. 해외에서 태어났다면 한국 시각으로 환산한 시각을 입력해야 정확합니다. 시각이 불확실하면 이전 단계에서 "시각을 몰라요"를 선택하세요.</p>';
        if (s.field === 'gender') return '<div class="ob-gender" role="radiogroup" aria-label="성별"><button type="button" role="radio" aria-checked="' + (d.gender === 'F') + '" data-g="F" class="' + (d.gender === 'F' ? 'on' : '') + '">여</button><button type="button" role="radio" aria-checked="' + (d.gender === 'M') + '" data-g="M" class="' + (d.gender === 'M' ? 'on' : '') + '">남</button></div>';
        if (s.field === 'confirm') return summary();
        return '';
      }
      function placeChips(f) { f = String(f || '').trim(); return O.PLACES.filter(function (p) { return !f || p.name.indexOf(f) >= 0; }).map(function (p) { return '<button type="button" role="option" aria-selected="' + (p.name === d.place) + '" class="' + (p.name === d.place ? 'on' : '') + '" data-p="' + esc(p.name) + '">' + esc(p.name) + '</button>'; }).join('') || '<p class="note">검색 결과가 없습니다. "해외·기타"를 선택해 주세요.</p>'; }

      function render() {
        var s = scenes[step], last = step === scenes.length - 1, nm = d.name;
        var lines = (s.field === 'time' && d.hourUnknown && s.unknownLines && s.unknownLines.length ? s.unknownLines : s.lines).map(function (t) { return F(t, nm); });
        var el = paintFs('<div class="ob-prog" role="progressbar" aria-valuemin="1" aria-valuemax="' + scenes.length + '" aria-valuenow="' + (step + 1) + '"><i style="width:' + Math.round((step + 1) / scenes.length * 100) + '%"></i><span>' + esc(String(CFG.progressLabel || '{n} / {total} · {title}').replace(/{n}/g, step + 1).replace(/{total}/g, scenes.length).replace(/{title}/g, s.title)) + '</span></div>' +
          '<div class="ob-stage ' + (BGTHEME[s.theme] || '') + '"' + (s.bg ? ' style="background-image:url(' + esc(s.bg) + ')"' : '') + '>' + avatar(s.face, s.image) + '<div class="ob-bubble' + (s.bubble ? ' bub-' + esc(s.bubble) : '') + '" id="obBub" aria-live="polite">' + lines.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div></div>' +
          '<div class="ob-form" id="obForm">' + fieldHtml(s) + '</div>' + (s.hint && s.field !== 'name' ? '<p class="note ob-hint">' + esc(s.hint) + '</p>' : '') +
          '<p class="msg err" id="obMsg" role="alert"></p><div class="ob-nav"><button type="button" class="btn ghost sm" id="obBack"' + (step === 0 ? ' hidden' : '') + '>‹ 이전</button><button type="button" class="btn sm" id="obOk">' + esc(s.button || '다음') + '</button></div>' +
          '<p class="note ob-priv">출생정보는 개인정보입니다. 이 기기 안에서 계산되며 서버로 보내지 않고, 홈 하단에서 언제든 수정·삭제할 수 있습니다.</p>', 'ob-toonpage');
        bind(el, s, last);
        if (!started) { started = true; Ob.track('birth_input_start', {}, true); }
        save();
      }
      var msg = function (t) { var m = $('#obMsg'); if (m) m.textContent = t || ''; };
      function bind(el, s, last) {
        var f = s.field;
        if (f === 'name') $('#fName', el).oninput = function () { d.name = this.value.trim().slice(0, 20); save(); };
        if (f === 'date') {
          var chk = function () { // 입력 즉시 안내
            save(); var leapW = $('#fLeapW', el); if (leapW) leapW.hidden = d.calendar !== 'lunar';
            if (d.year && d.month && d.day) { var M = root.Manse; var r = O.validateDate(M, d); msg(r.ok ? '' : (M || d.calendar !== 'lunar' ? r.msg : '')); }
            else msg('');
          };
          $$('input[name=cal]', el).forEach(function (r) { r.onchange = function () { d.calendar = this.value; if (d.calendar !== 'lunar') d.leap = false; chk(); }; });
          ['Y', 'M', 'D'].forEach(function (k) { $('#f' + k, el).onchange = function () { d[{ Y: 'year', M: 'month', D: 'day' }[k]] = this.value; chk(); }; });
          $('#fLeap', el).onchange = function () { d.leap = this.checked; chk(); };
          $('#fQuick', el).oninput = function () { var v = this.value.replace(/\D/g, ''); if (v.length === 8) { d.year = +v.slice(0, 4); d.month = +v.slice(4, 6); d.day = +v.slice(6); $('#fY', el).value = d.year; $('#fM', el).value = d.month; $('#fD', el).value = d.day; chk(); } };
        }
        if (f === 'time') {
          var sync = function () { $('#fH', el).disabled = $('#fMin', el).disabled = d.hourUnknown; var b = $('#obBub'); var ls = (d.hourUnknown && s.unknownLines && s.unknownLines.length ? s.unknownLines : s.lines).map(function (t) { return F(t, d.name); }); if (b) b.innerHTML = ls.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join(''); save(); };
          $('#fH', el).onchange = function () { d.hour = this.value; save(); }; $('#fMin', el).oninput = function () { d.minute = this.value; save(); };
          $('#fUnk', el).onchange = function () { d.hourUnknown = this.checked; sync(); };
        }
        if (f === 'place') {
          $$('input[name=cty]', el).forEach(function (r) { r.onchange = function () { d.country = this.value === 'KR' ? 'KR' : 'OT'; $('#fPlaceKR', el).hidden = d.country !== 'KR'; $('#fPlaceOT', el).hidden = d.country === 'KR'; save(); }; });
          var pl = $('#fPL', el), pickP = function () { $$('button', pl).forEach(function (b) { b.onclick = function () { d.place = b.dataset.p; $$('button', pl).forEach(function (x) { var on = x === b; x.className = on ? 'on' : ''; x.setAttribute('aria-selected', on); }); save(); }; }); };
          pickP(); $('#fPS', el).oninput = function () { pl.innerHTML = placeChips(this.value); pickP(); };
        }
        if (f === 'gender') $$('[data-g]', el).forEach(function (b) { b.onclick = function () { d.gender = b.dataset.g; $$('[data-g]', el).forEach(function (x) { var on = x === b; x.className = on ? 'on' : ''; x.setAttribute('aria-checked', on); }); msg(''); save(); }; });
        if (f === 'confirm') $$('[data-jump]', el).forEach(function (b) { b.onclick = function () { var i = scenes.map(function (x) { return x.field; }).indexOf(b.dataset.jump); if (i >= 0) { step = i; render(); } }; });
        $('#obBack', el).onclick = function () { if (step > 0) { step--; render(); } };
        $('#obOk', el).onclick = function () { advance(s, last); };
        var inp = $('input[type=text],input[type=number]', el); if (inp && f !== 'place') inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); advance(s, last); } });
      }
      function advance(s, last) {
        msg('');
        var f = s.field;
        if (f === 'date') {
          var r = O.validateDate(root.Manse, d);
          if (!r.ok) {
            if (d.calendar === 'lunar' && !root.Manse && d.year && d.month && d.day) { msg('계산 엔진을 불러오는 중입니다. 잠시 후 다시 눌러 주세요.'); return; }
            msg(r.msg); return;
          }
        }
        if (f === 'time') { var t = O.validateTime(d); if (!t.ok) { msg(t.msg); return; } }
        if (f === 'gender' && !d.gender) { msg('성별을 선택해 주세요.'); return; }
        if (f === 'confirm') { return calc(); }
        Ob.track('birth_input_step_complete', { step: f, n: step + 1 });
        step++; render();
      }
      function calc() {
        var btn = $('#obOk'); if (btn) { btn.disabled = true; btn.textContent = '천기를 펼치는 중…'; }
        var place = O.PLACES.filter(function (p) { return p.name === d.place; })[0], saved = O.toProfile(d, d.country === 'KR' ? place : null);
        H.engine().then(function (M) {
          var ch; try { ch = M.compute(P.toInput(saved)); } catch (err) { Ob.track('calculation_failure', { reason: 'compute' }); msg((err && err.message) || '입력을 확인해 주세요.'); if (btn) { btn.disabled = false; btn.textContent = '나의 사주 확인하기'; } return; }
          if (!ch || !ch.pillars || !ch.pillars.day) { Ob.track('calculation_failure', { reason: 'empty' }); msg('계산 결과를 만들지 못했습니다. 입력을 확인해 주세요.'); if (btn) { btn.disabled = false; btn.textContent = '나의 사주 확인하기'; } return; }
          if (!P.save(saved)) H.toast('이 브라우저에서는 정보를 저장할 수 없어 이번만 사용합니다.');
          H.afterInput(); lset(DRAFT, null);
          Ob.track('birth_input_complete', { hour_known: saved.hourUnknown ? 0 : 1, calendar: saved.calendar });
          Ob.track('calculation_success', {}); Ob.track('saju_input_complete', { next: 'onboarding', hour_known: saved.hourUnknown ? 0 : 1 });
          H.replace(CFG.afterDone === 'home' ? '#/?nogate=1' : '#/reveal');
        }).catch(function () { Ob.track('calculation_failure', { reason: 'engine' }); msg('분석 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); if (btn) { btn.disabled = false; btn.textContent = '나의 사주 확인하기'; } });
      }
      render();
      swipe(document.getElementById('obFs') || $('#screen'), function () { }, function () { if (step > 0) { step--; render(); } }); // 오른쪽으로 쓸면 이전 (입력 중 실수로 넘어가지 않게 다음은 버튼으로만)
    });
  });

  /* ═════════ 일간·일주 공개 ═════════ */
  H.route('reveal', function (q, ctx) {
    if (!P.has()) return H.replace('#/welcome');
    H.view('<p class="pend">당신의 명식을 펼치는 중…</p>');
    Ob.config().then(function () { return H.sajuKit(); }).then(function (kit) { return H.chart().then(function (ch) { return { kit: kit, ch: ch }; }); }).then(function (o) {
      if (!H.alive(ctx)) return;
      var M = o.kit.M, T = o.kit.T, ch = o.ch, nm = P.name(), day = ch.pillars.day, stemK = M.STEM_K[day.s], ju = M.gzNameK(day);
      var ig = T.ilganCard(stemK, nm), jc = T.ijuCard(ju, nm, ch.gender), S = (T.DATA.S || {})[stemK] || {};
      var el = paint('<p class="ob-kick">천명록 · 명식 완성</p><div class="ob-stage bg-reveal">' + avatar('proud', (CFG.scenes.filter(function (s) { return s.id === 'confirm'; })[0] || {}).image) + '<div class="ob-bubble">' + CFG.revealLines.map(function (t) { return '<p>' + esc(F(t, nm)) + '</p>'; }).join('') + '</div></div>' +
        '<section class="ob-card"><p class="who">' + esc(A(nm)) + '</p><div class="pair"><div><small>일간(日干)</small><b>' + esc(M.STEM[day.s]) + '</b><span>' + esc(ig ? ig.title.split(' · ')[1] || stemK : stemK) + '</span></div><div><small>일주(日柱)</small><b>' + esc(M.gzName(day)) + '</b><span>' + esc(ju) + '일주</span></div></div>' +
        (ig ? '<p class="ln">' + br(ig.line) + '</p>' : '') + (jc ? '<p class="tr">' + esc(jc.trait) + '</p>' : S.strength ? '<p class="tr">' + esc(S.strength) + '</p>' : '') +
        (ch.hourKnown ? '' : '<p class="note">출생 시각을 몰라 시주(時柱) 없이 계산했습니다. 일간·일주는 날짜 기준이라 그대로입니다.</p>') + '</section>' +
        '<button type="button" class="btn" id="obHome">나의 운 홈으로 이동</button><p class="note ob-priv">사주는 전통 해석에 바탕한 참고용 콘텐츠이며 미래를 단정하지 않습니다.</p>', 'ob-revealpage');
      $('#obHome', el).onclick = function () { H.go('#/'); };
    }).catch(function () { if (!H.alive(ctx)) return; H.view('<p class="pend">결과를 불러오지 못했습니다.<br><br><button type="button" class="btn ghost" id="rt">다시 시도</button></p>'); $('#rt').onclick = function () { H.render(); }; });
  });

  /* ═════════ 개인화 홈 ═════════ */
  var oldHome = H.routes[''];
  H.route('', function (q, ctx) {
    if (PREVIEW) return welcome({ preview: 1 }, ctx); // 관리자 미리보기는 항상 랜딩 아래 흐름을 보여 준다
    if (!P.has()) {
      if (q.skip) { try { sessionStorage.setItem('mt_onb_skip', '1'); } catch (e) { } return oldHome(q, ctx); }
      if (H.embed) return welcome({}, ctx);
      var skipped = false; try { skipped = sessionStorage.getItem('mt_onb_skip') === '1'; } catch (e) { }
      if (skipped) return oldHome(q, ctx);
      return H.replace('#/welcome');
    }
    var shown = false; try { shown = sessionStorage.getItem('mt_onb_shown') === '1'; } catch (e) { }
    if (!shown && !q.nogate) {
      Ob.config().then(function () { if (!H.alive(ctx)) return; if (CFG.forceOnboarding) { if (H.embed) welcome({ replay: 1 }, ctx); else H.replace('#/welcome?replay=1'); } else renderHome(q, ctx); });
      return;
    }
    renderHome(q, ctx);
  });
  function renderHome(q, ctx) {
    var nm = P.name();
    H.view('<section class="hhome"><p class="kick">MANTRA FORTUNE</p><h1 class="h1">' + esc(A(nm)) + ',<br>오늘의 흐름을 펼칩니다</h1><p class="pend">명식을 불러오는 중…</p></section>');
    Ob.config().then(function () { return H.sajuKit(); }).then(function (kit) { return H.chart().then(function (ch) { return { kit: kit, ch: ch }; }); }).then(function (o) {
      if (!H.alive(ctx)) return;
      var M = o.kit.M, T = o.kit.T, ch = o.ch, t = H.Saju.todayData(ch), day = ch.pillars.day, ju = M.gzNameK(day), now = Date.now();
      var cur = null; try { (ch.daeun.list || []).forEach(function (x) { if (x.startMs <= now) cur = x; }); } catch (e) { }
      var jc = T.ijuCard(ju, nm, ch.gender), flow = String(t.phase || '').replace(/기$/, '운');
      var daeunTxt = cur ? esc(M.gzNameK(cur)) + ' 대운 <small>(' + cur.startYear + '년~)</small>' : '대운 시작 전';
      var tip = function (w) { var d = O.TERMS[w]; return d ? '<span class="tip" tabindex="0" role="button" aria-label="' + esc(w + ': ' + d) + '" data-tip="' + esc(d) + '">' + esc(w) + '</span>' : esc(w); };
      var trait = (jc && jc.trait) || '', flowSub = t.flowLabel && String(t.flowLabel).indexOf(String(t.phase || '').replace(/기$/, '')) < 0 ? t.flowLabel : ''; // 같은 말이 겹치면(축적운 · 축적) 한 번만
      var flowLine = cur ? '지금은 <b>' + esc(M.gzNameK(cur)) + ' 대운</b>(' + cur.startYear + '년~) 안에 있고, 오늘의 흐름은 <b>' + esc(flow || t.cond) + '</b>' + (flowSub ? ' · ' + esc(flowSub) : '') + '입니다.' : '대운이 시작되기 전의 시기입니다. 오늘의 흐름은 <b>' + esc(flow || t.cond) + '</b>입니다.';
      var el = H.view(
        '<section class="hhome"><div class="hh-top"><p class="kick">MANTRA FORTUNE</p><a class="hh-me" href="#/me" data-track="profile_open">' + esc(A(nm)) + ' ›</a></div>' +
        '<div class="hh-guide"><div class="gav">' + avatar('greet', (CFG.scenes[0] || {}).image) + '</div><p>' + esc(F('{귀인}! 오늘의 일진이 도착했사옵니다!', nm)) + '</p></div>' +
        // 1·2. 타고난 기질 한 문장 / 지금의 운 흐름 — 용어를 몰라도 읽히도록 쉬운 말을 먼저, 용어는 눌러서 설명
        '<section class="hh-core" aria-label="나의 기질과 지금의 흐름">' +
        '<div class="hhc"><small>나의 타고난 기질</small><p>' + esc(trait || t.line || '') + '</p><span class="hhc-sub">' + tip('일간') + ' ' + esc(M.STEM_K[day.s]) + ' · ' + tip('일주') + ' ' + esc(ju) + '</span></div>' +
        '<div class="hhc"><small>지금의 운 흐름</small><p>' + flowLine + '</p><span class="hhc-sub">' + tip('대운') + ' · ' + tip('일진') + '</span></div></section>' +
        '<h2 class="hh-h">무료 콘텐츠</h2><div class="hh-cards">' +
        // 운명의 타임라인(별도 화면 #/timeline): 태어난 순간 · 대운 · 세운·월운 · 주제. 관리자에서 끌 수 있다(config.timeline.enabled)
        (CFG.timeline && CFG.timeline.enabled === false ? '' : '<a class="cc feat" href="#/timeline" data-ob-ev="free_content_click" data-case="s-home-timeline" data-track="fortune_content_click" data-p="timeline"><small>FATE TIMELINE · 무료</small><h3>운명의 타임라인</h3><p>태어난 순간부터 대운·세운·월운까지, 내 운의 흐름을 직접 눌러 따라가 봅니다.</p><span class="go">타임라인 열기 →</span></a>') +
        // 3. 일주
        '<a class="cc feat" href="#/awaken?replay=1&to=home" data-ob-ev="ilju_video_play free_content_click" data-case="s-home-ilju" data-track="fortune_content_click" data-p="ilju"><small>ILJU · 무료</small><h3>나의 일주 확인하기</h3><p>' + esc(ju) + '일주 · 타고난 기질과 강점, 주의할 점을 영상으로 만납니다.</p><span class="go">일주 보기 →</span></a>' +
        // 4. 오늘의 운세
        '<a class="cc today" href="#/today" data-ob-ev="calendar_open free_content_click" data-case="s-home-today" data-track="fortune_content_click" data-p="today_card"><div class="ring" style="--p:' + t.score + '"><b>' + t.score + '</b></div><div><small>TODAY · 오늘의 일진</small><h3>' + esc(t.cond) + '의 날</h3><p>' + esc(t.line || '') + '</p></div></a>' +
        // 5. 무료 타로 (+ 일진 캘린더)
        '<a class="cc" href="#/tarot" data-ob-ev="tarot_start free_content_click" data-case="s-home-tarot" data-track="fortune_content_click" data-p="tarot"><small>FREE TAROT · 무료</small><h3>무료 타로</h3><p>마음속 질문 하나, 카드 한 장으로 가볍게 확인합니다.</p><span class="go">카드 뽑기 →</span></a>' +
        '<a class="cc" href="#/today" data-ob-ev="calendar_open free_content_click" data-case="s-home-calendar" data-track="fortune_content_click" data-p="calendar"><small>CALENDAR · 무료</small><h3>일진 캘린더</h3><p>월운 그래프와 날짜별 일진, 내 일정에 맞는 날 고르기.</p><span class="go">캘린더 열기 →</span></a>' +
        '</div>' +
        // 6. 종합 무빙툰 리포트 미리보기
        '<h2 class="hh-h">종합 무빙툰 리포트</h2>' +
        '<a class="cc premium" href="#/go?to=deep" data-ob-ev="movingtoon_preview_start paid_report_view" data-case="s-home-report" data-track="premium_cta_click" data-p="deep_movingtoon"><small>DEEP MOVINGTOON · 프리미엄</small><h3>심층 무빙툰</h3><p>타고난 성향, 직업과 재물, 연애·결혼, 인생의 전환점과 대운·세운, 개운법까지 — 내 명식 하나로 읽는 종합 풀이입니다.</p><span class="go">무빙툰 열어 보기 →</span></a>' +
        // 명식 요약(기존 계산 결과 그대로)
        '<section class="hh-sum" aria-label="나의 명식 요약"><h2>나의 명식 요약</h2><div class="gr">' +
        '<div><small>' + tip('일간') + ' · ' + tip('일주') + '</small><b>' + esc(M.STEM_K[day.s]) + '일간 · ' + esc(ju) + '일주</b></div>' +
        '<div><small>현재 ' + tip('대운') + '</small><b>' + daeunTxt + '</b></div>' +
        '<div><small>오늘의 ' + tip('일진') + '</small><b>' + esc(t.gz) + '日 <small>' + esc(t.cond) + '</small></b></div>' +
        '<div><small>현재 운의 흐름</small><b>' + esc(flow) + (t.flowLabel ? ' <small>' + esc(t.flowLabel) + '</small>' : '') + '</b></div></div>' +
        '<p class="hh-line">' + (nm ? esc(nm) + '님, ' : '') + esc(t.line || '') + (jc ? '<br><span>' + esc(jc.trait) + '</span>' : '') + '</p></section>' +
        '<details class="hh-more"><summary>내 정보 · 더 보기</summary><div class="hh-acts">' +
        '<a href="#/begin?edit=1" data-track="profile_edit">출생정보 수정</a><a href="#/welcome?replay=1" data-track="onboarding_replay">온보딩 다시 보기</a><a href="#/my?s=1" data-track="fortune_content_click" data-p="my_home">MY 운명 홈</a>' +
        '<a href="/index.html" data-track="fortune_content_click" data-p="manse_app">만세력 원국 보기</a><button type="button" id="hhDel">내 정보 삭제</button></div>' +
        '<p class="note">출생정보는 이 기기에만 저장되며 서버로 보내지 않습니다. 삭제하면 저장된 정보와 입력 중이던 초안이 모두 지워집니다.</p></details>' +
        '<p class="dis">사주는 전통 해석에 바탕한 참고용 콘텐츠이며 미래를 단정하지 않습니다. 컨디션·주의 표시는 의학적 진단이나 사고 확률이 아닙니다.</p></section>');
      $$('.tip', el).forEach(function (n) { n.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var open = n.classList.contains('open'); $$('.tip.open', el).forEach(function (x) { x.classList.remove('open'); }); if (!open) n.classList.add('open'); }); });
      document.addEventListener('click', function f(e) { if (!el.isConnected) { document.removeEventListener('click', f); return; } if (!(e.target.closest && e.target.closest('.tip'))) $$('.tip.open', el).forEach(function (x) { x.classList.remove('open'); }); });
      var del = $('#hhDel', el); if (del) del.onclick = function () { if (root.confirm('저장된 출생정보를 이 기기에서 삭제할까요? 되돌릴 수 없습니다.')) { Ob.clear(); H.toast('삭제했습니다.'); H.replace('#/welcome'); } };
      Ob.track('home_view', { daeun: cur ? 1 : 0 }, true);
    }).catch(function () { if (!H.alive(ctx)) return; H.view('<p class="pend">홈을 불러오지 못했습니다.<br><br><button type="button" class="btn ghost" id="rt">다시 시도</button><br><br><a class="btn ghost sm" href="#/welcome?replay=1">온보딩 다시 보기</a></p>'); $('#rt').onclick = function () { H.render(); }; });
  }
  // 내 정보: 홈 상단 링크 → 같은 홈의 접힌 영역으로
  H.route('me', function () { H.replace('#/'); setTimeout(function () { var d = H.$('.hh-more'); if (d) { d.open = true; d.scrollIntoView({ behavior: H.reduce ? 'auto' : 'smooth', block: 'center' }); } }, 400); });
  Ob.clear = function () { try { localStorage.removeItem('mantra-manse-v1'); localStorage.removeItem('mt_hub_awk'); localStorage.removeItem('mt_daily_v1'); localStorage.removeItem(DRAFT); localStorage.removeItem(SEEN); localStorage.removeItem('mt_quest_draft'); localStorage.removeItem('mt_guide'); } catch (e) { } H.afterInput(); };

  // 기존 입력 화면(#/input)은 온보딩 슬라이드 툰으로 대체한다. 옛 폼이 필요하면 #/input?classic=1
  var oldInput = H.routes.input;
  H.route('input', function (q, ctx) { if (q.classic || q.next) return oldInput(q, ctx); H.replace('#/begin' + (q.edit ? '?edit=1' : '')); }); // 빠른 진입("바로 사주 분석하기" 등 next 지정)은 일반 입력 화면 — 인터랙티브 스토리는 "나의 운 확인하기"(#/begin)로만 들어간다

  // data-ob-ev: 클릭 측정(서버 집계 포함). 사례 id 는 data-case
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-ob-ev]'); if (a) a.getAttribute('data-ob-ev').split(/\s+/).filter(Boolean).forEach(function (ev) { Ob.track(ev, { case: a.getAttribute('data-case') || '' }); }); });
})(window);
