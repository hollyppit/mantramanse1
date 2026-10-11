// 인터랙티브 스토리 온보딩(#/begin) — 부적 봉인 → 안내자 선택 → 출생정보 입력(이름·성별·달력·해·달·일·시각·출생지) → 확인 → 실제 만세력 계산 → #/awaken(일간·일주·각성 영상) → #/timeline.
//   · 계산은 기존 엔진(Manse.compute)과 허브 프로필 저장(Hub.profile.save)을 그대로 쓴다. 이 파일은 입력 화면과 연출만 담당한다.
//   · 장면 연출(안내자 선택·계절 색조·배경)과 사주 계산에 영향을 주는 입력(성별·달력·윤달·날짜·시각·출생지)은 단계 정의(quest-data.js)에서 구분된다.
//   · 설정(quest.enabled)을 끄면 예전 슬라이드 툰(hub-onboard.js 의 #/begin)으로 돌아간다.
//   · 개인정보: 이름·출생정보는 이 기기의 localStorage 에만 둔다. 분석 이벤트에는 단계 번호·안내자(male/female)만 싣는다.
(function (root) {
  'use strict';
  var H = root.Hub, Ob = H.Onboard, O = root.Onboard, Q = root.Quest, P = H.profile, esc = H.esc;
  var oldBegin = H.routes.begin, DOC = document;
  var GUIDE_KEY = 'mt_guide';
  var lget = function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  var lset = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  var nl = function (t) { return esc(t).replace(/\n/g, '<br>'); };
  var pad2 = function (n) { return ('0' + n).slice(-2); };
  var isMobile = function () { return (root.innerWidth || 1024) < 768; };
  Q.guide = function () { var g = lget(GUIDE_KEY); return g === 'female' ? 'female' : 'male'; };

  function onLeave(fn) { var prev = H.cleanup; H.cleanup = function () { try { fn(); } catch (e) { } if (prev) prev(); }; }

  H.route('begin', function (q, ctx) {
    if (P.has() && !q.edit && !Ob.preview) return H.replace('#/'); // 이미 프로필이 있으면 입력을 건너뛴다(수정은 ?edit=1)
    H.engine().catch(function () { }); // 윤달·일수 판정에 필요 — 미리 불러 둔다
    Ob.config().then(function (cfg) {
      if (!H.alive(ctx)) return;
      if (!cfg.quest || cfg.quest.enabled === false) return oldBegin(q, ctx);
      run(q, ctx, cfg);
    });
  });

  function run(q, ctx, cfg) {
    var PREVIEW = !!Ob.preview, QC = cfg.quest;
    var editing = !!(q.edit && P.get()) && !PREVIEW;
    var skip = editing && QC.skipReturning ? ['seal', 'guide'] : [];
    var steps = Q.order(cfg, skip), ids = steps.map(function (s) { return s.id; });
    if (!steps.length) return oldBegin(q, ctx);
    var d = Q.blank(), idx = 0, guide = Q.guide(), ret = null, busy = false, started = false, bgToken = 0, curBg = '', layers, mobileNow = isMobile();

    /* ── 시작 상태: 수정(프로필) / 이어하기(초안) / 처음 ── */
    var draft = (!PREVIEW && !editing && QC.resume) ? Q.cleanDraft(lget(Q.DRAFT_KEY), ids) : null;
    if (editing) {
      var s0 = P.get();
      d = Object.assign(Q.blank(), { name: s0.name || '', gender: s0.gender || '', calendar: s0.calendar === 'lunar' ? 'lunar' : 'solar', leap: !!s0.leap, year: s0.year || '', month: s0.month || '', day: s0.day || '', hour: s0.hourUnknown ? '' : s0.hour, minute: s0.hourUnknown ? '' : s0.minute, hourUnknown: !!s0.hourUnknown, country: s0.country === 'OT' ? 'OT' : 'KR', place: s0.city || '서울' });
    }
    if (PREVIEW) { // 관리자 미리보기: ?step=month&guide=female 로 장면을 바로 연다. 예시 값으로 채우고, 저장·계산은 하지 않는다.
      if (q.guide === 'female' || q.guide === 'male') guide = q.guide;
      d = Object.assign(Q.blank(), { name: '미리보기', gender: 'M', calendar: q.cal === 'lunar' ? 'lunar' : 'solar', year: 1992, month: 6, day: 23, hour: 7, minute: 30 });
      var pi = ids.indexOf(q.step); if (pi >= 0) idx = pi;
    }
    var hasProgress = draft && (draft.d.name || ids.indexOf(draft.step) > Math.max(ids.indexOf('name'), 1));

    /* ── 레이어 ── */
    var host = DOC.getElementById('hub') || DOC.body, qs = DOC.createElement('div');
    qs.id = 'qs'; qs.setAttribute('role', 'region'); qs.setAttribute('aria-label', '운명의 기록');
    qs.innerHTML = '<div class="qs-bgwrap"><div class="qs-bg" id="qsBgA"></div><div class="qs-bg" id="qsBgB"></div></div><div class="qs-season" id="qsSeason" aria-hidden="true"></div><div class="qs-shade"></div><div class="qs-vig"></div><div class="qs-grain"></div>' +
            '<header class="qs-top"><div class="qs-logo">MANTRA<span>운명의 기록</span></div><button type="button" class="qs-lnk" id="qsExit">' + (editing ? '수정 취소 ↗' : '처음 화면 ↗') + '</button></header>' +
      '<div class="qs-meter" aria-hidden="true"><i id="qsMeter"></i></div><main class="qs-main"><div class="qs-card" id="qsCard" aria-live="polite"></div></main>' +
      '<footer class="qs-foot"><button type="button" id="qsBack">← 이전 장면</button><span id="qsCount"></span><span></span></footer>' + (PREVIEW ? '<div class="qs-pv">미리보기 · 저장·계산하지 않음</div>' : '');
    host.appendChild(qs); DOC.body.classList.add('qs-open');
    var scr = H.$('#screen'); if (scr) { scr.className = ''; scr.innerHTML = ''; }
    var $ = function (s) { return qs.querySelector(s); }, $$ = function (s) { return [].slice.call(qs.querySelectorAll(s)); };
    layers = [$('#qsBgA'), $('#qsBgB')];
    var card = $('#qsCard');
    onLeave(function () { root.removeEventListener('resize', onResize); root.removeEventListener('popstate', onPop); if (qs.parentNode) qs.parentNode.removeChild(qs); DOC.body.classList.remove('qs-open'); });

    var step = function () { return steps[idx]; };
    var fill = function (t) { return Q.fill(t, d, cfg); };
    var save = function () { if (PREVIEW) return; lset(Q.DRAFT_KEY, { v: 2, step: step().id, d: d, guide: guide }); };
    var groupLast = function (g) { var last = ''; steps.forEach(function (s) { if (s.group === g) last = s.id; }); return last; };
    var calendarWord = function () { return d.calendar === 'lunar' ? '음력' : '양력'; };

    /* ── 배경: 새 이미지가 불러진 뒤에 교차(깜빡임·빈 화면 방지) ── */
    function setBg(url, pos) {
      var t = ++bgToken, key = url + '|' + pos; if (key === curBg) return; curBg = key;
      var on = layers.filter(function (l) { return l.classList.contains('on'); })[0], off = layers.filter(function (l) { return l !== on; })[0];
      var show = function () { if (t !== bgToken) return; off.style.backgroundImage = 'url("' + url.replace(/["\\()\s]/g, encodeURIComponent) + '")'; off.style.setProperty('--pos', pos); off.classList.add('on'); if (on) on.classList.remove('on'); };
      var im = new Image(); im.onload = show; im.onerror = show; im.src = url; if (im.complete) show();
    }
    function preloadNext() { var n = steps[idx + 1]; if (!n) return; var im = new Image(); im.src = Q.stepBg(cfg, n, mobileNow); }
    function applyBg() { var s = step(); setBg(Q.stepBg(cfg, s, mobileNow), Q.stepFocus(cfg, s, mobileNow)); }
    function setSeason(v) { $('#qsSeason').setAttribute('data-s', v || ''); }
    function onResize() { var m = isMobile(); if (m !== mobileNow) { mobileNow = m; curBg = ''; applyBg(); } }
    root.addEventListener('resize', onResize);

    /* ── 공통 조각 ── */
    function say(lines) {
      return '<div class="qs-spk"><img src="' + esc(Q.guideImage(cfg, guide, mobileNow)) + '" alt="" width="44" height="44" decoding="async"><b>' + esc(QC.guides[guide].name) + '</b></div><div class="qs-say">' + lines.map(function (t) { return '<p>' + esc(fill(t)) + '</p>'; }).join('') + '</div>';
    }
    var panel = function (inner, hint) { return '<div class="qs-panel">' + inner + (hint ? '<p class="qs-note">' + esc(fill(hint)) + '</p>' : '') + '</div>'; };
    var eyebrow = function (s) { return '<p class="qs-eyebrow">' + esc(s.title) + '</p>'; };
    var acts = function () { return '<div class="qs-acts">' + [].slice.call(arguments).join('') + '</div>'; };
    var btn = function (id, text, alt) { return '<button type="button" class="qs-btn' + (alt ? ' alt' : '') + '" id="' + id + '">' + esc(text) + '</button>'; };
    var errBox = '<p class="qs-err" id="qsErr" role="alert"></p>';
    function err(t) { var e = $('#qsErr'); if (e) e.textContent = t || ''; }

    /* ── 대화 상자(브라우저 기본 확인창 대신) ── */
    function dialog(o, cb) {
      var m = DOC.createElement('div'); m.className = 'qs-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', o.head);
      m.innerHTML = '<div class="qs-dlg"><h3>' + esc(o.head) + '</h3><p>' + nl(o.body) + '</p><div class="qs-acts"><button type="button" class="qs-btn" data-r="yes">' + esc(o.yes) + '</button><button type="button" class="qs-btn alt" data-r="no">' + esc(o.no) + '</button></div></div>';
      qs.appendChild(m); var first = m.querySelector('[data-r=yes]'); if (first) first.focus({ preventScroll: true });
      m.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-r]'); if (!b) return; if (m.parentNode) m.parentNode.removeChild(m); cb(b.getAttribute('data-r') === 'yes'); });
    }

    /* ── 이동 ── */
    function pushHist() { if (PREVIEW) return; try { history.pushState({ qs: idx }, '', location.href); } catch (e) { } }
    function go(i, fromPop) { idx = Math.max(0, Math.min(steps.length - 1, i)); busy = false; renderStep(); if (!fromPop) pushHist(); }
    function next() {
      var s = step();
      if (!started && s.kind === 'input') { started = true; Ob.track('birth_input_start', {}, true); }
      if (s.kind === 'input') Ob.track('birth_input_step_complete', { step: s.field, n: idx + 1 });
      if (ret && s.id === ret.until) { var c = ids.indexOf('confirm'); ret = null; return go(c >= 0 ? c : idx + 1); }
      go(idx + 1);
    }
    function back() { if (idx > 0) { ret = null; go(idx - 1); } }
    function jump(id) { var i = ids.indexOf(id); if (i < 0) return; var g = steps[i].group; ret = { until: groupLast(g) || id }; go(i); }
    function onPop(e) { var st = e.state; if (st && typeof st.qs === 'number') { ret = null; go(st.qs, true); } }
    root.addEventListener('popstate', onPop);
    if (!PREVIEW) { try { history.replaceState({ qs: idx }, '', location.href); } catch (e) { } }

    $('#qsBack').onclick = back;
    $('#qsExit').onclick = function () { H.go(P.has() ? '#/' : '#/welcome'); };

    /* ── 장면 그리기 ── */
    function renderStep() {
      var s = step(), html = '', kind = s.kind;
      qs.classList.toggle('at-seal', kind === 'seal');
      ['fade', 'rise', 'none'].forEach(function (f) { qs.classList.remove('fx-' + f); }); qs.classList.add('fx-' + (H.reduce ? 'none' : (s.fx || QC.fx || 'fade')));
      applyBg(); preloadNext();
      setSeason(['month', 'day'].indexOf(s.id) >= 0 ? Q.seasonOf(d.calendar, d.month) : '');
      $('#qsMeter').style.width = Math.round(idx / Math.max(1, steps.length - 1) * 100) + '%';
      $('#qsCount').textContent = s.title; $('#qsBack').disabled = idx === 0;
      var needEngine = d.calendar === 'lunar' && (s.id === 'month' || s.id === 'day' || s.id === 'confirm') && !root.Manse;
      if (needEngine) { card.innerHTML = '<div class="qs-panel"><p class="qs-say"><span class="qs-spin"></span>음력 달력을 불러오는 중…</p></div>'; var t = ctxToken; H.engine().then(function () { if (t === ctxToken && step() === s) renderStep(); }).catch(function () { card.innerHTML = '<div class="qs-panel"><p class="qs-err">계산 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</p></div>'; }); return; }
      var fn = VIEWS[kind === 'input' ? s.field : kind];
      card.innerHTML = fn ? fn(s) : '';
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; qs.scrollTop = 0;
      if (fn && BIND[kind === 'input' ? s.field : kind]) BIND[kind === 'input' ? s.field : kind](s);
      save();
    }
    var ctxToken = 1;

    var VIEWS = {}, BIND = {};

    /* 1. 부적 봉인 */
    VIEWS.seal = function (s) { return '<div class="qs-sigil" id="qsSigil" aria-hidden="true"><div class="qs-sigil-paper"><i class="qs-sigil-ink">命<br>運</i><div class="qs-hole"></div></div><span class="qs-embers">✦ · · ✧</span></div>' + eyebrow(s) + '<h1 class="qs-head">' + nl(s.head) + '</h1><p class="qs-desc">' + nl(s.desc) + '</p><div class="qs-inst">' + esc(s.hint) + '</div>' + acts(btn('qsGo', s.button || '봉인을 태워 문을 열기 →')); };
    BIND.seal = function () {
      var sg = $('#qsSigil'), go1 = $('#qsGo'); go1.focus({ preventScroll: true });
      go1.onclick = function () {
        if (busy) return; busy = true; Ob.track('quest_view', {}, true); sg.classList.remove('burning'); void sg.offsetWidth; sg.classList.add('burning');
        setTimeout(function () { sg.classList.remove('burning'); next(); }, H.reduce ? 150 : 1050);
      };
    };

    /* 2. 안내자 선택: 말투·진행 방식만 달라진다(계산 결과는 같다) */
    VIEWS.guide = function (s) {
      var g = function (k, c) { var o = QC.guides[k]; return '<button type="button" class="qs-guide ' + c + '" data-g="' + k + '" aria-label="' + esc(o.name + ' — ' + o.tag) + '"><img src="' + esc(Q.guideImage(cfg, k, mobileNow)) + '" alt="" decoding="async"><strong>' + esc(o.name) + '</strong><small>' + esc(o.tag) + '</small></button>'; };
      return eyebrow(s) + '<h1 class="qs-head">' + nl(s.head) + '</h1><p class="qs-cap">' + esc(s.hint) + '</p><div class="qs-guides">' + g('male', 'm') + g('female', 'f') + '</div>';
    };
    BIND.guide = function () { $$('[data-g]').forEach(function (b) { b.onclick = function () { guide = b.getAttribute('data-g'); lset(GUIDE_KEY, guide); Ob.track('quest_guide_pick', { case: guide }); next(); }; }); };

    /* 3. 이름 */
    VIEWS.name = function (s) { return eyebrow(s) + panel(say(Q.linesOf(s, guide)) + '<form id="qsForm" novalidate><input class="qs-field" id="qsName" maxlength="20" autocomplete="name" placeholder="이름을 입력해 주세요" aria-label="이름" value="' + esc(d.name) + '">' + errBox + acts('<button type="submit" class="qs-btn">' + esc(s.button) + '</button>') + '</form>', s.hint); };
    BIND.name = function () {
      var inp = $('#qsName'); if (!isMobile()) inp.focus({ preventScroll: true });
      $('#qsForm').onsubmit = function (e) { e.preventDefault(); var v = inp.value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20); if (!v) { err('이름을 입력해 주세요.'); inp.focus(); return; } d.name = v; next(); };
      inp.oninput = function () { d.name = inp.value.trim().slice(0, 20); save(); err(''); };
    };

    /* 4. 성별 — 대운 방향 계산에 쓰이는 입력 */
    VIEWS.gender = function (s) { return eyebrow(s) + panel(say(Q.linesOf(s, guide)) + '<div class="qs-opts" role="radiogroup" aria-label="성별"><button type="button" role="radio" aria-checked="' + (d.gender === 'M') + '" class="qs-opt' + (d.gender === 'M' ? ' sel' : '') + '" data-v="M">남성</button><button type="button" role="radio" aria-checked="' + (d.gender === 'F') + '" class="qs-opt' + (d.gender === 'F' ? ' sel' : '') + '" data-v="F">여성</button></div>', s.hint); };
    BIND.gender = function () { $$('[data-v]').forEach(function (b) { b.onclick = function () { d.gender = b.getAttribute('data-v'); $$('[data-v]').forEach(function (x) { x.classList.toggle('sel', x === b); }); setTimeout(next, H.reduce ? 0 : 140); }; }); };

    /* 5. 달력 */
    VIEWS.calendar = function (s) { return eyebrow(s) + panel(say(Q.linesOf(s, guide)) + '<div class="qs-opts" role="radiogroup" aria-label="달력"><button type="button" role="radio" aria-checked="' + (d.calendar === 'solar') + '" class="qs-opt' + (d.calendar === 'solar' ? ' sel' : '') + '" data-v="solar">양력으로 기억합니다</button><button type="button" role="radio" aria-checked="' + (d.calendar === 'lunar') + '" class="qs-opt' + (d.calendar === 'lunar' ? ' sel' : '') + '" data-v="lunar">음력으로 기억합니다</button></div>', s.hint); };
    BIND.calendar = function () { $$('[data-v]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-v'); if (d.calendar !== v) { d.leap = false; d.leapAsked = false; if (d.month) d.day = ''; } d.calendar = v; $$('[data-v]').forEach(function (x) { x.classList.toggle('sel', x === b); }); setTimeout(next, H.reduce ? 0 : 140); }; }); };

    /* 6. 태어난 해 */
    var yearBounds = function () { var M = root.Manse, nowY = new Date().getFullYear(); return { min: M ? M.MIN_Y : 1901, max: M ? Math.min(M.MAX_Y, nowY) : nowY }; };
    VIEWS.year = function (s) {
      var b = yearBounds();
      return eyebrow(s) + panel(say(Q.linesOf(s, guide)) + '<form id="qsForm" novalidate><div class="qs-yr"><button type="button" data-n="-10" aria-label="10년 전">‹‹</button><button type="button" data-n="-1" aria-label="1년 전">−</button><input id="qsYear" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="예: 1992" aria-label="태어난 해(' + calendarWord() + ')" value="' + esc(d.year) + '"><button type="button" data-n="1" aria-label="1년 후">+</button><button type="button" data-n="10" aria-label="10년 후">››</button></div><p class="qs-cap">' + b.min + '~' + b.max + '년 · ' + calendarWord() + ' 기준</p>' + errBox + acts('<button type="submit" class="qs-btn">' + esc(s.button) + '</button>') + '</form>', s.hint);
    };
    BIND.year = function () {
      var inp = $('#qsYear'), b = yearBounds(); if (!isMobile()) inp.focus({ preventScroll: true });
      inp.oninput = function () { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); err(''); };
      $$('[data-n]').forEach(function (x) { x.onclick = function () { var v = +inp.value || (new Date().getFullYear() - 34); inp.value = Math.max(b.min, Math.min(b.max, v + (+x.getAttribute('data-n')))); err(''); }; });
      $('#qsForm').onsubmit = function (e) {
        e.preventDefault(); var y = +inp.value;
        if (!(y > 0)) { err('태어난 해를 입력해 주세요.'); inp.focus(); return; }
        if (y < b.min || y > b.max) { err(b.min + '년부터 ' + b.max + '년 사이의 해만 계산할 수 있습니다.'); inp.focus(); return; }
        if (String(d.year) !== String(y)) { d.day = ''; if (d.calendar === 'lunar') { d.leap = false; d.leapAsked = false; } } d.year = y; next();
      };
    };

    /* 7. 태어난 달 — 달을 고르면 배경의 계절 색조가 바뀐다(별도 계절 선택 없음) */
    VIEWS.month = function (s) {
      return eyebrow(s) + panel(say(Q.linesOf(s, guide)) + '<div class="qs-months" role="group" aria-label="태어난 달">' + Array.from({ length: 12 }, function (_, i) { return '<button type="button" data-m="' + (i + 1) + '" class="' + (+d.month === i + 1 ? 'sel' : '') + '" aria-label="' + (i + 1) + '월">' + (i + 1) + '월</button>'; }).join('') + '</div><div class="qs-season-name" id="qsSeasonName">' + esc(Q.SEASON_KO[Q.seasonOf(d.calendar, d.month)] || '') + '</div>' + errBox, s.hint);
    };
    BIND.month = function () {
      var nm = $('#qsSeasonName'), restore = function () { var v = Q.seasonOf(d.calendar, d.month); setSeason(v); nm.textContent = Q.SEASON_KO[v] || ''; };
      $$('[data-m]').forEach(function (b) {
        var m = +b.getAttribute('data-m'), prev = function () { var v = Q.seasonOf(d.calendar, m); setSeason(v); nm.textContent = Q.SEASON_KO[v] || ''; };
        b.onmouseenter = prev; b.onfocus = prev; b.onmouseleave = restore; b.onblur = restore;
        b.onclick = function () {
          if (busy) return; busy = true; var changed = +d.month !== m; d.month = m; if (changed) d.day = ''; prev(); $$('[data-m]').forEach(function (x) { x.classList.toggle('sel', x === b); });
          var finish = function () { busy = false; setTimeout(next, H.reduce ? 0 : 160); };
          if (d.calendar !== 'lunar') { d.leap = false; return finish(); }
          H.engine().then(function (M) {
            var has = Q.leapExists(M, d.year, m);
            if (!has) { d.leap = false; return finish(); }
            // 그 해에 그 달의 윤달이 실제로 있을 때만 묻는다(의미 없는 선택지 방지)
            Ob.track('quest_leap_asked', {});
            var L = QC.leapText, sub = function (t) { return String(t).replace(/\{year\}/g, d.year).replace(/\{month\}/g, m); };
            dialog({ head: L.head, body: sub(L.body), yes: sub(L.yes), no: sub(L.no) }, function (isLeap) { d.leap = isLeap; d.leapAsked = true; save(); finish(); });
          }).catch(function () { busy = false; err('음력 달력을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); });
        };
      });
    };

    /* 8. 태어난 날 */
    VIEWS.day = function (s) {
      var n = Q.daysIn(root.Manse, d), cells = '';
      for (var i = 1; i <= n; i++) cells += '<button type="button" data-d="' + i + '" class="' + (+d.day === i ? 'sel' : '') + '"' + (Q.futureDay(d, i) ? ' disabled' : '') + '>' + i + '</button>';
      return eyebrow(s) + panel(say(Q.linesOf(s, guide)) + '<div class="qs-big">' + calendarWord() + ' ' + d.year + '. ' + (d.calendar === 'lunar' && d.leap ? '윤' : '') + pad2(d.month) + '</div><div class="qs-days" role="group" aria-label="태어난 날">' + cells + '</div>' + errBox, s.hint);
    };
    BIND.day = function () {
      $$('[data-d]').forEach(function (b) { b.onclick = function () {
        d.day = +b.getAttribute('data-d'); var r = O.validateDate(root.Manse, d);
        if (!r.ok) { err(r.msg); $$('[data-d]').forEach(function (x) { x.classList.remove('sel'); }); return; }
        $$('[data-d]').forEach(function (x) { x.classList.toggle('sel', x === b); }); setTimeout(next, H.reduce ? 0 : 140);
      }; });
    };

    /* 9. 태어난 시각 — 시·분 정확 입력. 모르면 시주 없이(엔진 미상 처리) */
    var clockText = function () { if (d.hourUnknown) return '시각 미상 · 시주 제외'; if (d.hour === '' || d.hour == null) return ''; var h = +d.hour; return (h < 12 ? '오전 ' : '오후 ') + (h % 12 === 0 ? 12 : h % 12) + '시 ' + (+d.minute || 0) + '분'; };
    VIEWS.time = function (s) {
      var hours = Array.from({ length: 24 }, function (_, h) { return '<button type="button" data-h="' + h + '" class="' + (!d.hourUnknown && d.hour !== '' && +d.hour === h && d.hour != null ? 'sel' : '') + '" aria-label="' + h + '시"><b>' + pad2(h) + '</b><small>' + (h < 12 ? '오전' : '오후') + '</small></button>'; }).join('');
      var mins = [0, 10, 20, 30, 40, 50].map(function (m) { return '<button type="button" data-q="' + m + '" class="' + (d.minute !== '' && +d.minute === m && !d.hourUnknown ? 'sel' : '') + '">' + pad2(m) + '</button>'; }).join('');
      return eyebrow(s) + panel('<div id="qsSay">' + say(Q.linesOf(s, guide, d.hourUnknown)) + '</div><div id="qsTimeBox"' + (d.hourUnknown ? ' style="opacity:.35;pointer-events:none"' : '') + '><p class="qs-cap" style="margin:0 0 8px">시 (24시간 기준)</p><div class="qs-hours" role="group" aria-label="태어난 시">' + hours + '</div><div class="qs-min"><span>분</span>' + mins + '<input id="qsMin" inputmode="numeric" maxlength="2" placeholder="직접" aria-label="분(0~59)" value="' + esc(d.minute) + '"></div></div><div class="qs-clock" id="qsClock">' + esc(clockText()) + '</div>' + errBox +
        acts('<button type="button" class="qs-btn" id="qsOk">' + esc(d.hourUnknown ? '시각 미상으로 기록하기 →' : s.button) + '</button>', '<button type="button" class="qs-btn alt" id="qsUnk">' + (d.hourUnknown ? '시각을 알고 있어요' : '태어난 시간을 모릅니다') + '</button>'), s.hint);
    };
    BIND.time = function (s) {
      var clock = function () { $('#qsClock').textContent = clockText(); }, mark = function () {
        $$('[data-h]').forEach(function (b) { b.classList.toggle('sel', !d.hourUnknown && d.hour !== '' && d.hour != null && +b.getAttribute('data-h') === +d.hour); });
        $$('[data-q]').forEach(function (b) { b.classList.toggle('sel', !d.hourUnknown && d.minute !== '' && +b.getAttribute('data-q') === +d.minute); }); $('#qsMin').value = d.minute; clock(); save();
      };
      $$('[data-h]').forEach(function (b) { b.onclick = function () { d.hour = +b.getAttribute('data-h'); if (d.minute === '' || d.minute == null) d.minute = 0; err(''); mark(); }; });
      $$('[data-q]').forEach(function (b) { b.onclick = function () { d.minute = +b.getAttribute('data-q'); err(''); mark(); }; });
      $('#qsMin').oninput = function () { var v = this.value.replace(/\D/g, '').slice(0, 2); this.value = v; d.minute = v === '' ? '' : Math.min(59, +v); if (v !== '' && +v > 59) this.value = 59; err(''); mark(); };
      $('#qsUnk').onclick = function () {
        d.hourUnknown = !d.hourUnknown; if (d.hourUnknown) { d.hour = ''; d.minute = ''; } err('');
        $('#qsSay').innerHTML = say(Q.linesOf(s, guide, d.hourUnknown)); $('#qsTimeBox').style.cssText = d.hourUnknown ? 'opacity:.35;pointer-events:none' : '';
        $('#qsOk').textContent = d.hourUnknown ? '시각 미상으로 기록하기 →' : s.button; $('#qsUnk').textContent = d.hourUnknown ? '시각을 알고 있어요' : '태어난 시간을 모릅니다'; mark();
      };
      $('#qsOk').onclick = function () { var t = O.validateTime(d); if (!t.ok) { err(t.msg); return; } if (!d.hourUnknown && (d.minute === '' || d.minute == null)) d.minute = 0; next(); };
    };

    /* 10. 출생지 — 기존 지역 목록(경도 보정)·해외 경고 정책을 그대로 쓴다 */
    var placeChips = function (f) { f = String(f || '').trim(); return O.PLACES.filter(function (p) { return !f || p.name.indexOf(f) >= 0; }).map(function (p) { return '<button type="button" data-p="' + esc(p.name) + '" class="' + (p.name === d.place ? 'sel' : '') + '">' + esc(p.name) + '</button>'; }).join('') || '<p class="qs-note">검색 결과가 없습니다. "해외·기타"를 선택해 주세요.</p>'; };
    VIEWS.place = function (s) {
      var kr = d.country !== 'OT';
      return eyebrow(s) + panel(say(Q.linesOf(s, guide)) + '<div class="qs-seg" role="radiogroup" aria-label="출생 국가"><button type="button" role="radio" aria-checked="' + kr + '" class="' + (kr ? 'sel' : '') + '" data-c="KR">대한민국</button><button type="button" role="radio" aria-checked="' + !kr + '" class="' + (!kr ? 'sel' : '') + '" data-c="OT">해외·기타</button></div>' +
        '<div id="qsKr"' + (kr ? '' : ' hidden') + '><input class="qs-field" id="qsPs" autocomplete="off" placeholder="지역 검색 (예: 부산)" aria-label="지역 검색"><div class="qs-places" id="qsPl" role="group" aria-label="지역">' + placeChips('') + '</div></div>' +
        '<p class="qs-warn" id="qsOt"' + (kr ? ' hidden' : '') + '>현재 계산은 한국 표준시를 기준으로 합니다. 해외에서 태어났다면 한국 시각으로 환산한 시각을 입력해야 정확합니다. 시각이 불확실하면 이전 단계에서 "태어난 시간을 모릅니다"를 선택하세요.</p>' + errBox + acts('<button type="button" class="qs-btn" id="qsOk">' + esc(s.button) + '</button>'), s.hint);
    };
    BIND.place = function () {
      var pl = $('#qsPl'), pick = function () { $$('[data-p]').forEach(function (b) { b.onclick = function () { d.place = b.getAttribute('data-p'); $$('[data-p]').forEach(function (x) { x.classList.toggle('sel', x === b); }); err(''); save(); }; }); };
      pick(); $('#qsPs').oninput = function () { pl.innerHTML = placeChips(this.value); pick(); };
      $$('[data-c]').forEach(function (b) { b.onclick = function () { d.country = b.getAttribute('data-c'); $$('[data-c]').forEach(function (x) { var on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-checked', on); }); $('#qsKr').hidden = d.country === 'OT'; $('#qsOt').hidden = d.country !== 'OT'; err(''); save(); }; });
      $('#qsOk').onclick = function () { if (d.country !== 'OT' && !O.PLACES.some(function (p) { return p.name === d.place; })) { err('출생 지역을 선택해 주세요.'); return; } next(); };
    };

    /* 11. 확인 — 항목별 수정 후 확인으로 돌아온다. 입력값은 그대로 보존 */
    function dateText() {
      var r = O.validateDate(root.Manse, d), t = d.year + '년 ' + (d.calendar === 'lunar' && d.leap ? '윤' : '') + d.month + '월 ' + d.day + '일';
      if (d.calendar === 'lunar') return '음력 ' + t + (r.ok && r.solar ? ' (양력 ' + r.solar.y + '.' + r.solar.m + '.' + r.solar.d + ')' : '');
      return '양력 ' + t;
    }
    VIEWS.confirm = function (s) {
      var row = function (label, val, jumpId) { return '<div><small>' + label + '</small><strong>' + esc(val) + '</strong><button type="button" data-j="' + jumpId + '" aria-label="' + label + ' 수정">수정</button></div>'; };
      var place = d.country === 'OT' ? '해외·기타 (한국 표준시 기준)' : d.place;
      return eyebrow(s) + '<h1 class="qs-head" style="font-size:clamp(24px,4vw,40px)">' + esc(fill('{이름귀인}의 기록이 완성되었습니다.')) + '</h1>' + panel(say(Q.linesOf(s, guide)) + '<div class="qs-sum">' +
        row('이름', d.name, 'name') + row('성별', d.gender === 'M' ? '남성' : d.gender === 'F' ? '여성' : '-', 'gender') + row('출생일', dateText(), 'calendar') + row('출생 시각', d.hourUnknown || d.hour === '' ? '모름 (시주 제외)' : clockText(), 'time') + row('출생지', place, 'place') + (ids.indexOf('guide') >= 0 ? row('안내자', QC.guides[guide].name, 'guide') : '') + '</div>' + errBox + acts(btn('qsCalc', s.button)), s.hint);
    };
    BIND.confirm = function () {
      $$('[data-j]').forEach(function (b) { b.onclick = function () { jump(b.getAttribute('data-j')); }; });
      $('#qsCalc').onclick = calc;
    };

    /* ── 계산: 기존 엔진 그대로. 실패하면 원인을 보여 주고 해당 입력으로 돌아간다 ── */
    function failTo(msg) {
      var target = /연도|년부터|해만|범위/.test(msg) ? 'year' : /윤/.test(msg) ? 'month' : /일|며칠|까지|뒤입니다/.test(msg) ? 'day' : /시각|분|시는|시를/.test(msg) ? 'time' : /지역|출생지/.test(msg) ? 'place' : 'year';
      return target;
    }
    function calc() {
      if (busy) return; busy = true; var s = step();
      card.innerHTML = eyebrow(s) + panel(say(QC.calcLines[guide]) + '<p class="qs-say" style="margin:0"><span class="qs-spin"></span></p>');
      var place = O.PLACES.filter(function (p) { return p.name === d.place; })[0], saved = O.toProfile(d, d.country === 'KR' ? place : null);
      var fail = function (msg, reason) {
        busy = false; Ob.track('calculation_failure', { reason: reason || 'compute' });
        var target = failTo(msg); card.innerHTML = eyebrow(s) + panel(say(QC.errLines[guide]) + '<p class="qs-err" role="alert">' + esc(msg) + '</p>' + acts('<button type="button" class="qs-btn" id="qsFix">입력 수정하기</button>', '<button type="button" class="qs-btn alt" id="qsRetry">다시 시도</button>'));
        $('#qsFix').onclick = function () { jump(ids.indexOf(target) >= 0 ? target : 'confirm'); }; $('#qsRetry').onclick = function () { renderStep(); };
      };
      H.engine().then(function (M) {
        var r = O.validateDate(M, d); if (!r.ok) return fail(r.msg, 'date');
        var t = O.validateTime(d); if (!t.ok) return fail(t.msg, 'time');
        if (d.gender !== 'M' && d.gender !== 'F') return fail('성별을 선택해 주세요.', 'gender');
        var ch; try { ch = M.compute(P.toInput(saved)); } catch (e) { return fail((e && e.message) || '입력을 확인해 주세요.'); }
        if (!ch || !ch.pillars || !ch.pillars.day) return fail('계산 결과를 만들지 못했습니다. 입력을 확인해 주세요.', 'empty');
        if (PREVIEW) { busy = false; card.innerHTML = eyebrow(s) + panel(say(['미리보기에서는 실제 계산을 하지 않습니다.']) + acts('<button type="button" class="qs-btn alt" id="qsPvBack">확인 화면으로</button>')); $('#qsPvBack').onclick = function () { renderStep(); }; return; }
        if (!P.save(saved)) H.toast('이 브라우저에서는 정보를 저장할 수 없어 이번만 사용합니다.');
        H.afterInput(); lset(Q.DRAFT_KEY, null); lset('mt_onb_draft', null);
        Ob.track('birth_input_complete', { hour_known: saved.hourUnknown ? 0 : 1, calendar: saved.calendar }); Ob.track('calculation_success', {}); H.track('saju_input_complete', { next: 'quest', hour_known: saved.hourUnknown ? 0 : 1 }); // 허브 분석 전용(서버 집계 목록에 없는 이벤트)
        H.replace(editing ? '#/timeline' : '#/awaken?to=timeline');
      }).catch(function () { fail('분석 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.', 'engine'); });
    }

    /* ── 시작 ── */
    if (hasProgress && !PREVIEW) { // 이어하기: 같은 디자인의 대화 상자로 묻는다
      renderStep();
      var R = QC.resumeText;
      dialog({ head: R.head, body: R.desc, yes: R.yes, no: R.no }, function (yes) {
        Ob.track('quest_resume', { case: yes ? 'yes' : 'no' });
        if (yes) { d = Object.assign(Q.blank(), draft.d); if (draft.guide) { guide = draft.guide; lset(GUIDE_KEY, guide); } go(Math.max(0, ids.indexOf(draft.step)), true); try { history.replaceState({ qs: idx }, '', location.href); } catch (e) { } }
        else { lset(Q.DRAFT_KEY, null); renderStep(); }
      });
    } else renderStep();
  }
})(window);
