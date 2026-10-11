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

  /* ── 설정(관리자 저장본을 기본값 위에 얹는다) ─ 1.5초 안에 못 받으면 기본 문구로 간다 ── */
  var cfgP = null, CFG = O.merge(O.DEFAULTS, null), version = '';
  Ob.config = function () {
    if (!cfgP) cfgP = new Promise(function (ok) {
      var done = false, fin = function (c, v) { if (done) return; done = true; if (c) { CFG = O.merge(O.DEFAULTS, c); version = v || ''; } ok(CFG); };
      setTimeout(function () { fin(null); }, 1500);
      try { fetch('/api/onboarding').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { fin(d && d.config, d && d.version); }).catch(function () { fin(null); }); } catch (e) { fin(null); }
    });
    return cfgP;
  };
  var A = function (name) { return O.addr(name, CFG); };           // [이름] 귀인
  var F = function (t, name) { return O.fill(t, name, CFG); };      // 대사 치환

  /* ── 측정: 허브 분석 이벤트 + 서버 집계(이름과 사례 id 만. 출생정보·이름은 보내지 않는다) ── */
  Ob.track = function (name, props, once) {
    H.track(name, props, once);
    try { fetch('/api/onboarding?ev=' + encodeURIComponent(name), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ case: props && props.case || '' }), keepalive: true }).catch(function () { }); } catch (e) { }
  };
  var onceSent = {};
  var tOnce = function (name, props) { var k = name + '|' + (props && props.case || ''); if (onceSent[k]) return; onceSent[k] = 1; Ob.track(name, props); };

  /* ── 화면 그리기: 온보딩은 허브의 "홈화면으로 가기" 줄 없이 직접 그린다 ── */
  function paint(html, cls) {
    var el = H.$('#screen'); el.className = ''; el.innerHTML = '<div class="ob ' + (cls || '') + (H.reduce ? ' rm' : '') + '">' + html + '</div>'; void el.offsetWidth; el.className = 'fx'; root.scrollTo(0, 0); return el;
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
  function currentCase() {
    var id = null; try { id = sessionStorage.getItem('mt_onb_case'); } catch (e) { }
    var c = id && O.publicCases(CFG.cases).filter(function (x) { return x.id === id; })[0];
    return c || null;
  }
  function chooseCase(forceNew) {
    var cur = currentCase(); if (cur && !forceNew) return cur;
    var recent = lget(RECENT) || []; if (forceNew && cur) recent = [cur.id].concat(recent.filter(function (r) { return r !== cur.id; }));
    var c = O.pickCase(CFG, { recent: recent.slice(0, 3) });
    if (c) { try { sessionStorage.setItem('mt_onb_case', c.id); } catch (e) { } lset(RECENT, [c.id].concat(recent.filter(function (r) { return r !== c.id; })).slice(0, 4)); }
    return c;
  }
  // 온보딩 1·2부는 한 페이지를 스크롤하며 읽는다: 사례 → 명리학 3장면 → [나의 운 확인하기]. 장면은 화면에 들어올 때 차례로 나타난다.
  H.route('welcome', function (q, ctx) {
    Ob.config().then(function () {
      if (!H.alive(ctx)) return;
      try { sessionStorage.setItem('mt_onb_shown', '1'); } catch (e) { }
      var Art = root.OnboardArt || { forCase: function () { return ''; }, forIntro: function () { return ''; } };
      var intro = CFG.intro.filter(function (s) { return s.enabled !== false; }), c = chooseCase(false);
      var media = function (o, svg) { return o && o.video ? '<video class="cn-media" src="' + esc(o.video) + '" muted playsinline autoplay loop></video>' : o && o.image ? '<img class="cn-media" src="' + esc(o.image) + '" alt="" loading="lazy">' : svg; };
      function caseHtml(c) {
        var src = c.source || {}, link = src.url ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer" data-ob-ev="onboarding_source_click" data-case="' + esc(c.id) + '">' + esc(src.doi ? 'DOI ' + src.doi : '원문 보기') + '</a>' : '';
        return '<p class="cn-kick">' + esc(TYPE_LABEL[c.type] || '') + (c.year ? ' · ' + c.year : '') + '</p><div class="cn-art">' + media(c, Art.forCase(c.visual)) + '</div>' +
          '<p class="cn-hook">' + esc(c.hook) + '</p><h1 class="cn-title">' + esc(c.title) + '</h1>' +
          '<ol class="cn-beats">' + c.body.slice(0, 3).map(function (b, i) { return '<li style="--i:' + i + '"><span aria-hidden="true">' + (i + 1) + '</span><p>' + esc(b) + '</p></li>'; }).join('') + '</ol>' +
          (c.caveat ? '<p class="cn-cav">' + esc(c.caveat) + '</p>' : '') +
          '<details class="cn-src"><summary>출처 확인</summary><p>' + esc(c.who || '') + (c.who && src.label ? ' · ' : '') + esc(src.label || '') + (link ? '<br>' + link : '') + '</p></details>' +
          '<div class="cn-links"><button type="button" id="obOther">다른 사례 보기</button></div>';
      }
      var h = '<div class="cn-prog" id="cnProg" aria-hidden="true"></div>';
      if (c) h += '<section class="cn-sec" id="cnCase" data-case="' + esc(c.id) + '">' + caseHtml(c) + '</section>';
      h += intro.map(function (s, i) {
        return '<section class="cn-sec" data-intro="' + esc(s.id) + '"><p class="cn-kick">동양 명리학 · ' + (i + 1) + ' / ' + intro.length + '</p><div class="cn-art">' + media(s, Art.forIntro(s.id)) + '</div>' +
          '<h2 class="cn-title">' + esc(s.title) + '</h2><p class="cn-body">' + esc(s.body) + '</p>' + (s.sub ? '<p class="cn-sub">' + esc(s.sub) + '</p>' : '') + '</section>';
      }).join('');
      h += '<section class="cn-sec cn-last" id="cnLast"><div class="cn-art">' + Art.forIntro('end') + '</div><h2 class="cn-title big">' + esc(CFG.introLast.line) + '</h2>' +
        '<button type="button" class="btn cn-go" id="obGo" data-ob-ev="onboarding_cta_click">' + esc(CFG.introLast.cta) + '</button><p class="cn-cav">' + esc(O.INTRO_NOTICE) + '</p></section>' +
        '<button type="button" class="cn-skip" id="obSkip">건너뛰기 ↓</button>';
      var el = paint('<div class="cn">' + h + '</div>', 'ob-cine');
      var secs = $$('.cn-sec', el), skip = $('#obSkip', el), last = $('#cnLast', el), seen = 0;
      function enter(sec) {
        if (sec.classList.contains('in')) return; sec.classList.add('in'); seen++;
        if (sec.id === 'cnCase' && c) tOnce('onboarding_card_impression', { case: c.id, type: c.type });
        if (sec === last) { tOnce('onboarding_intro_complete', { case: c && c.id || '' }); skip.hidden = true; }
      }
      // 화면 위쪽 80% 안으로 들어온 장면을 나타낸다(스크롤·크기 변경·처음 그릴 때). IntersectionObserver 가 멈추는 숨은 탭에서도 동작한다.
      var prog = $('#cnProg', el), tick = function () {
        var d = document.documentElement, m = d.scrollHeight - d.clientHeight, vh = root.innerHeight || d.clientHeight;
        prog.style.transform = 'scaleX(' + (m > 0 ? Math.min(1, root.scrollY / m) : 0) + ')';
        secs.forEach(function (x) { if (!x.classList.contains('in') && x.getBoundingClientRect().top < vh * 0.8) enter(x); });
      };
      root.addEventListener('scroll', tick, { passive: true }); root.addEventListener('resize', tick);
      var t0 = setTimeout(tick, 60), t1 = setTimeout(tick, 600);
      onLeave(function () { root.removeEventListener('scroll', tick); root.removeEventListener('resize', tick); clearTimeout(t0); clearTimeout(t1); });
      skip.onclick = function () { Ob.track('onboarding_skip', { seen: seen, case: c && c.id || '' }); last.scrollIntoView({ behavior: H.reduce ? 'auto' : 'smooth', block: 'center' }); };
      var oth = $('#obOther', el);
      if (oth) oth.onclick = function () {
        var n = chooseCase(true); if (!n) return; c = n; Ob.track('onboarding_other_case', { case: n.id });
        var sec = $('#cnCase', el); sec.classList.remove('in'); sec.setAttribute('data-case', n.id); sec.innerHTML = caseHtml(n); void sec.offsetWidth; sec.classList.add('in'); tOnce('onboarding_card_impression', { case: n.id, type: n.type });
        $('#obOther', el).onclick = oth.onclick; sec.scrollIntoView({ behavior: H.reduce ? 'auto' : 'smooth', block: 'start' });
      };
      $('#obGo', el).onclick = function () { Ob.track('onboarding_cta_click', { case: c && c.id || '' }); lset(SEEN, 1); H.go(q.replay && P.has() ? '#/begin?edit=1' : '#/begin'); }; // 다시 보기: 저장된 값이 채워진 채로 슬라이드 툰을 끝까지 볼 수 있다
      Ob.track('onboarding_view', { replay: q.replay ? 1 : 0, case: c && c.id || '' }, true);
    });
  });

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
        var el = paint('<div class="ob-prog" role="progressbar" aria-valuemin="1" aria-valuemax="' + scenes.length + '" aria-valuenow="' + (step + 1) + '"><i style="width:' + Math.round((step + 1) / scenes.length * 100) + '%"></i><span>' + (step + 1) + ' / ' + scenes.length + ' · ' + esc(s.title) + '</span></div>' +
          '<div class="ob-stage ' + (BGTHEME[s.theme] || '') + '"' + (s.bg ? ' style="background-image:url(' + esc(s.bg) + ')"' : '') + '>' + avatar(s.face, s.image) + '<div class="ob-bubble" id="obBub" aria-live="polite">' + lines.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div></div>' +
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
          H.replace('#/reveal');
        }).catch(function () { Ob.track('calculation_failure', { reason: 'engine' }); msg('분석 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); if (btn) { btn.disabled = false; btn.textContent = '나의 사주 확인하기'; } });
      }
      render();
      swipe($('#screen'), function () { }, function () { if (step > 0) { step--; render(); } }); // 오른쪽으로 쓸면 이전 (입력 중 실수로 넘어가지 않게 다음은 버튼으로만)
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
    if (!P.has()) {
      if (q.skip || H.embed) { try { sessionStorage.setItem('mt_onb_skip', '1'); } catch (e) { } return oldHome(q, ctx); }
      var skipped = false; try { skipped = sessionStorage.getItem('mt_onb_skip') === '1'; } catch (e) { }
      if (skipped) return oldHome(q, ctx);
      return H.replace('#/welcome');
    }
    var shown = false; try { shown = sessionStorage.getItem('mt_onb_shown') === '1'; } catch (e) { }
    if (!shown && !q.nogate && !H.embed) {
      Ob.config().then(function () { if (!H.alive(ctx)) return; if (CFG.forceOnboarding) H.replace('#/welcome?replay=1'); else renderHome(q, ctx); });
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
      var el = H.view(
        '<section class="hhome"><div class="hh-top"><p class="kick">MANTRA FORTUNE</p><a class="hh-me" href="#/me" data-track="profile_open">' + esc(A(nm)) + ' ›</a></div>' +
        '<div class="hh-guide"><div class="gav">' + avatar('greet', (CFG.scenes[0] || {}).image) + '</div><p>' + esc(F('{귀인}! 오늘의 일진이 도착했사옵니다!', nm)) + '</p></div>' +
        '<section class="hh-sum" aria-label="나의 운 요약"><h2>나의 운 요약</h2><div class="gr">' +
        '<div><small>일간 · 일주</small><b>' + esc(M.STEM_K[day.s]) + '일간 · ' + esc(ju) + '일주</b></div>' +
        '<div><small>현재 대운</small><b>' + daeunTxt + '</b></div>' +
        '<div><small>오늘의 일진</small><b>' + esc(t.gz) + '日 <small>' + esc(t.cond) + '</small></b></div>' +
        '<div><small>현재 운의 흐름</small><b>' + esc(flow) + (t.flowLabel ? ' <small>' + esc(t.flowLabel) + '</small>' : '') + '</b></div></div>' +
        '<p class="hh-line">' + (nm ? esc(nm) + '님, ' : '') + esc(t.line || '') + (jc ? '<br><span>' + esc(jc.trait) + '</span>' : '') + '</p></section>' +
        '<h2 class="hh-h">무료 콘텐츠</h2><div class="hh-cards">' +
        '<a class="cc today" href="#/today" data-ob-ev="calendar_open" data-track="fortune_content_click" data-p="today_card"><div class="ring" style="--p:' + t.score + '"><b>' + t.score + '</b></div><div><small>TODAY · 오늘의 일진</small><h3>' + esc(t.cond) + '의 날</h3><p>' + esc(t.line || '') + '</p></div></a>' +
        '<a class="cc" href="#/tarot" data-ob-ev="tarot_start" data-track="fortune_content_click" data-p="tarot"><small>FREE TAROT · 무료</small><h3>무료 타로</h3><p>마음속 질문 하나, 카드 한 장으로 가볍게 확인합니다.</p><span class="go">카드 뽑기 →</span></a>' +
        '<a class="cc" href="#/awaken?replay=1&to=home" data-ob-ev="ilju_video_play" data-track="fortune_content_click" data-p="ilju"><small>ILJU · 무료</small><h3>나의 일주 확인하기</h3><p>' + esc(ju) + '일주 · 타고난 기질과 강점, 주의할 점을 영상으로 만납니다.</p><span class="go">일주 보기 →</span></a>' +
        '<a class="cc" href="#/today" data-ob-ev="calendar_open" data-track="fortune_content_click" data-p="calendar"><small>CALENDAR · 무료</small><h3>일진 캘린더</h3><p>월운 그래프와 날짜별 일진, 내 일정에 맞는 날 고르기.</p><span class="go">캘린더 열기 →</span></a>' +
        '</div><h2 class="hh-h">프리미엄</h2>' +
        '<a class="cc premium" href="#/go?to=deep" data-ob-ev="movingtoon_preview_start" data-track="premium_cta_click" data-p="deep_movingtoon"><small>DEEP MOVINGTOON · 프리미엄</small><h3>심층 무빙툰</h3><p>타고난 성향, 직업과 재물, 연애·결혼, 인생의 전환점과 대운·세운, 개운법까지 — 내 명식 하나로 읽는 종합 풀이입니다.</p><span class="go">무빙툰 열어 보기 →</span></a>' +
        '<details class="hh-more"><summary>내 정보 · 더 보기</summary><div class="hh-acts">' +
        '<a href="#/begin?edit=1" data-track="profile_edit">출생정보 수정</a><a href="#/welcome?replay=1" data-track="onboarding_replay">온보딩 다시 보기</a><a href="#/my?s=1" data-track="fortune_content_click" data-p="my_home">MY 운명 홈</a>' +
        '<a href="/index.html" data-track="fortune_content_click" data-p="manse_app">만세력 원국 보기</a><button type="button" id="hhDel">내 정보 삭제</button></div>' +
        '<p class="note">출생정보는 이 기기에만 저장되며 서버로 보내지 않습니다. 삭제하면 저장된 정보와 입력 중이던 초안이 모두 지워집니다.</p></details>' +
        '<p class="dis">사주는 전통 해석에 바탕한 참고용 콘텐츠이며 미래를 단정하지 않습니다. 컨디션·주의 표시는 의학적 진단이나 사고 확률이 아닙니다.</p></section>');
      var del = $('#hhDel', el); if (del) del.onclick = function () { if (root.confirm('저장된 출생정보를 이 기기에서 삭제할까요? 되돌릴 수 없습니다.')) { Ob.clear(); H.toast('삭제했습니다.'); H.replace('#/welcome'); } };
      Ob.track('home_view', { daeun: cur ? 1 : 0 }, true);
    }).catch(function () { if (!H.alive(ctx)) return; H.view('<p class="pend">홈을 불러오지 못했습니다.<br><br><button type="button" class="btn ghost" id="rt">다시 시도</button><br><br><a class="btn ghost sm" href="#/welcome?replay=1">온보딩 다시 보기</a></p>'); $('#rt').onclick = function () { H.render(); }; });
  }
  // 내 정보: 홈 상단 링크 → 같은 홈의 접힌 영역으로
  H.route('me', function () { H.replace('#/'); setTimeout(function () { var d = H.$('.hh-more'); if (d) { d.open = true; d.scrollIntoView({ behavior: H.reduce ? 'auto' : 'smooth', block: 'center' }); } }, 400); });
  Ob.clear = function () { try { localStorage.removeItem('mantra-manse-v1'); localStorage.removeItem('mt_hub_awk'); localStorage.removeItem('mt_daily_v1'); localStorage.removeItem(DRAFT); localStorage.removeItem(SEEN); } catch (e) { } H.afterInput(); };

  // 기존 입력 화면(#/input)은 온보딩 슬라이드 툰으로 대체한다. 옛 폼이 필요하면 #/input?classic=1
  var oldInput = H.routes.input;
  H.route('input', function (q, ctx) { if (q.classic) return oldInput(q, ctx); H.replace('#/begin' + (q.edit ? '?edit=1' : '')); });

  // data-ob-ev: 클릭 측정(서버 집계 포함). 사례 id 는 data-case
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-ob-ev]'); if (a) Ob.track(a.getAttribute('data-ob-ev'), { case: a.getAttribute('data-case') || '' }); });
})(window);
