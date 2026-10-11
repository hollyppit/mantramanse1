// 운명의 타임라인(#/timeline) — 태어난 순간 → 인생 전체의 흐름(대운) → 지금과 앞으로(세운·월운·일진) → 인생의 주요 주제.
//   · 모든 값은 기존 엔진의 계산 결과다: Manse.compute(원국·오행·십성·자미두수) / ReportV2.Timeline(대운·세운·월운 + 6분류, 근거) / Hub.Saju.todayData(일진).
//   · 이 파일은 점수나 명리 판단을 만들지 않는다. 그래프 높이 = 엔진의 흐름 점수(fit, -100~100)를 0~100 으로 옮긴 값(월운 캘린더와 같은 식).
//   · 심층 풀이(재물·직업·연애 등)는 기존 무빙툰 뷰어(/report/v2/)로 연결한다. 홈(#/)의 기능은 그대로 두고, 홈 상단에서 이 화면으로 들어온다.
//   · 구성(영역 순서·표시·그래프 설정·주제 타일)은 관리자 설정 config.timeline 이 정한다.
(function (root) {
  'use strict';
  var H = root.Hub, Ob = H.Onboard, O = root.Onboard, Q = root.Quest, P = H.profile, esc = H.esc, DOC = document;
  var $ = H.$, $$ = H.$$;
  var V2 = ['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'story-director', 'luck6', 'timeline'];
  var EL_COL = ['#5E9E78', '#D0634A', '#BC9C62', '#AEB9C6', '#4A7AB5'], GROUPS5 = ['비겁', '식상', '재성', '관성', '인성'], EL_HJ = ['木', '火', '土', '金', '水'];
  var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  var pct = function (fit) { return clamp((fit + 100) / 2); };
  var SAMPLE = { year: 1992, month: 6, day: 23, hour: 7, minute: 30, calendar: 'solar', leap: false, gender: 'M', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };

  // 무빙툰 뷰어의 시간 모듈(대운·세운·월운 + 6분류)은 이 화면에서만 필요하므로 처음 열 때 순서대로 불러온다(내려받기는 동시에, 실행은 순서대로).
  var tlP = null;
  function loadTl() {
    if (root.ReportV2 && root.ReportV2.Timeline) return Promise.resolve();
    if (!tlP) tlP = Promise.all(V2.map(function (n) { return new Promise(function (ok, no) { var s = DOC.createElement('script'); s.src = '/report/v2/' + n + '.js'; s.async = false; s.onload = ok; s.onerror = function () { no(new Error('load ' + n)); }; DOC.head.appendChild(s); }); })).catch(function (e) { tlP = null; throw e; });
    return tlP;
  }

  H.route('timeline', function (q, ctx) {
    var PREVIEW = !!Ob.preview;
    if (!P.has() && !PREVIEW) return H.replace('#/welcome');
    H.view('<p class="pend">운명의 타임라인을 펼치는 중…</p>');
    Ob.config().then(function (cfg) {
      if (!cfg.timeline || cfg.timeline.enabled === false) return H.replace('#/');
      return Promise.all([H.sajuKit(), PREVIEW ? H.engine().then(function (M) { return M.compute(SAMPLE); }) : H.chart(), loadTl()]).then(function (r) { if (H.alive(ctx)) draw(q, ctx, cfg, r[0], r[1], PREVIEW); });
    }).catch(function () { if (!H.alive(ctx)) return; H.view('<p class="pend">타임라인을 불러오지 못했습니다.<br><br><button type="button" class="btn ghost" id="rt">다시 시도</button><br><br><a class="btn ghost sm" href="#/">홈으로</a></p>'); $('#rt').onclick = function () { H.render(); }; });
  });

  function draw(q, ctx, cfg, kit, ch, PREVIEW) {
    var M = kit.M, T = kit.T, R = root.ReportV2, TL = R.Timeline, L = R.Luck6, TC = cfg.timeline, G = TC.graph, nm = PREVIEW ? '미리보기' : P.name(), mobile = (root.innerWidth || 1024) < 768;
    var now = Date.now(), nowY = new Date(now + 9 * 3600e3).getUTCFullYear(), day = ch.pillars.day, stemK = M.STEM_K[day.s], ju = M.gzNameK(day), g = ch.gender;
    var ig = T.ilganCard(stemK, nm), jc = T.ijuCard(ju, nm, g), S5 = (T.DATA.S || {})[stemK] || {};
    var dl = TL.daeun(M, ch, now), real = dl.filter(function (x) { return !x.pre; });
    var cur = real.filter(function (x) { return x.isCurrent; })[0] || real[0];
    var st = { d: cur ? cur.idx : null, y: nowY, m: null, ev: null };
    if (q.y && +q.y >= 1901 && +q.y <= 2098) st.y = +q.y;
    var dOf = function (y) { return real.filter(function (x) { return x.startYear <= y && y <= x.endYear; })[0] || null; };
    var d0 = dOf(st.y); if (d0 && q.y) st.d = d0.idx;
    var yearsCache = {}, monthsCache = {};
    // 해 목록: 대운 구간(10년) 단위. 대운 전(어린 시기)의 해는 출생 해부터 10년 블록으로 묶는다.
    var blockStart = function (y) { var dd = dOf(y); if (dd) return dd.startYear; var first = real[0]; return first && y < first.startYear ? first.startYear - 10 : y; };
    var years = function (start) { return yearsCache[start] || (yearsCache[start] = TL.years(M, ch, start, now)); };
    var months = function (y) { return monthsCache[y] || (monthsCache[y] = TL.months(M, ch, y, now)); };
    var yearItem = function (y) { return years(blockStart(y)).filter(function (x) { return x.year === y; })[0] || null; };

    var A = function () { return O.addr(nm, cfg); };
    var asset = function (key) { return Q.assetUrl(cfg, key, mobile); };

    /* ── 공통 조각 ── */
    var tip = function (w) { var t = O.TERMS[w]; return t ? '<span class="tip" tabindex="0" role="button" aria-label="' + esc(w + ': ' + t) + '" data-tip="' + esc(t) + '">' + esc(w) + '</span>' : esc(w); };
    var KEYC = function (it) { return 'k-' + esc(it.key || 'pre'); };
    function fieldBars(it) {
      var f = it.fields || {}, names = { money: '재물', career: '직업', love: '애정·인연' };
      return '<div class="tq-fs">' + ['money', 'career', 'love'].filter(function (k) { return f[k]; }).map(function (k) { var v = f[k]; return '<div class="tq-f"><span>' + names[k] + '</span><div class="tq-fb" role="img" aria-label="' + names[k] + ' ' + v.score + '점, ' + esc(v.band) + '"><i style="width:' + Math.max(2, Math.min(100, v.score)) + '%"></i></div><b>' + v.score + '<small>' + esc(v.band) + '</small></b></div>'; }).join('') + '</div>';
    }
    function detail(it, title, lvl) { // 한 시기의 상세 카드(엔진의 6분류·판정 근거·분야 점수) + 근거 보기
      var ov = it.overlays && (it.overlays.volatility || it.overlays.defense) ? '<p class="tq-ov">' + (it.overlays.volatility ? '<i>변동 신호</i>' : '') + (it.overlays.defense ? '<i>방어 신호</i>' : '') + '</p>' : '';
      var open = st.ev === lvl + ':' + (it.idx != null ? it.idx : it.year != null ? it.year : it.month);
      return '<article class="tq-card ' + KEYC(it) + '"><p class="tq-ct">' + esc(title) + '</p><h3>' + esc(it.six) + '<small>' + esc(it.meaning) + '</small></h3><p class="tq-rule"><b>이렇게 판정했어요</b> ' + esc(it.rule) + '</p>' + ov + fieldBars(it) +
        '<p class="tq-sc">흐름 점수 ' + it.scores.fit + ' · 작용 강도 ' + it.scores.intensity + ' · 변동성 ' + it.scores.volatility + (it.condition ? ' · 상태 ' + esc(it.condition) : '') + '</p>' +
        '<div class="tq-card-acts"><button type="button" class="tq-lnk" data-ev="' + lvl + '" aria-expanded="' + open + '">' + (open ? '근거 닫기' : '자세한 근거 보기') + '</button><a class="tq-lnk" href="#/go?to=future" data-track="timeline_topic_click" data-p="detail_' + lvl + '">이 시기 상세 풀이 →</a></div>' +
        (open ? '<div class="tq-evbox">' + TL.evidenceHtml(TL.evidence(M, ch, it)) + '</div>' : '') + '</article>';
    }
    function barChart(items, o) { // 막대 그래프: 버튼 하나가 막대 하나. 높이 = 흐름 점수, 색 = 6분류(이름 글자도 함께 표시 — 색에만 의존하지 않는다)
      return '<div class="tq-chart ' + (o.cls || '') + '" role="group" aria-label="' + esc(o.label) + '">' + items.map(function (it, i) {
        if (it.pre) return '<span class="tq-bar pre" aria-label="' + esc(it.startAge + '~' + it.endAge + '세 대운 전') + '"><b>—</b><u></u><span>' + esc(it.startAge) + '세</span><small>대운 전</small></span>';
        var sc = pct(it.scores.fit), sel = o.sel(it), now = o.now(it);
        return '<button type="button" class="tq-bar ' + KEYC(it) + (sel ? ' sel' : '') + (now ? ' now' : '') + '" ' + o.attr(it) + ' aria-pressed="' + sel + '" aria-label="' + esc(o.name(it) + ', ' + it.six + ', 흐름 ' + sc + (now ? ', 지금' : '')) + '"><b>' + sc + '</b><u><i style="height:' + sc + '%"></i></u><span>' + esc(o.top(it)) + '</span><small>' + esc(o.sub(it)) + '</small><em>' + esc(it.six) + '</em>' + (now ? '<s>지금</s>' : '') + '</button>';
      }).join('') + '</div>';
    }
    var legend = '<ul class="tq-leg" aria-label="운의 6분류">' + L.NAMES.map(function (n) { return '<li class="k-' + L.KEY[n] + '"><i></i><b>' + n + '</b><span>' + esc(L.MEANING[n]) + '</span></li>'; }).join('') + '</ul>';

    /* ── 영역 1: 태어난 순간 ── */
    function birthHtml() {
      var order = ['hour', 'day', 'month', 'year'], lab = { hour: '시주', day: '일주', month: '월주', year: '연주' };
      var cols = order.map(function (k) {
        var p = ch.pillars[k], c = ch.cells && ch.cells[k];
        if (!p) return '<div class="tq-pl none"><small>' + lab[k] + '</small><span class="tq-unk">시각<br>미상</span></div>';
        var se = M.stemEl(p.s), be = M.BR_EL[p.b];
        return '<div class="tq-pl' + (k === 'day' ? ' me' : '') + '"><small>' + lab[k] + '</small><i class="tg">' + esc(k === 'day' ? '나(일간)' : c ? c.stemTG : '') + '</i><b style="color:' + EL_COL[se] + '" title="' + M.EL_K[se] + '">' + M.STEM[p.s] + '</b><b style="color:' + EL_COL[be] + '" title="' + M.EL_K[be] + '">' + M.BR[p.b] + '</b><i class="tg">' + esc(c ? c.branchTG : '') + '</i><span>' + esc(M.gzNameK(p)) + '</span></div>';
      }).join('');
      var pc = (ch.weights && ch.weights.pct) || [], gr = (ch.weights && ch.weights.groups) || [], mi = 0; for (var i = 1; i < gr.length; i++) if (gr[i] > gr[mi]) mi = i;
      var els = G.elements ? '<div class="tq-box"><h4>오행 · 십성</h4><div class="tq-els">' + M.EL_K.map(function (e, i) { var v = Math.round(pc[i] || 0); return '<div class="tq-el"><span style="color:' + EL_COL[i] + '">' + EL_HJ[i] + ' ' + e + '</span><div class="tq-eb"><i style="width:' + Math.max(2, Math.min(100, v * 2)) + '%;background:' + EL_COL[i] + '"></i></div><b>' + v + '%</b></div>'; }).join('') + '</div>' +
        '<div class="tq-gr">' + GROUPS5.map(function (n, i) { var v = Math.round(gr[i] || 0); return '<span class="' + (i === mi ? 'big' : '') + '">' + esc(n) + ' <b>' + v + '%</b></span>'; }).join('') + '</div><p class="tq-sub">가장 큰 비중은 <b>' + GROUPS5[mi] + '</b>입니다. ' + tip('십성') + ' 분포는 일간을 기준으로 한 다섯 묶음입니다.</p></div>' : '';
      var z = ch.ziwei, zw = '';
      if (G.ziwei) {
        if (z) { var mp = z.palaces.filter(function (p) { return p.name === '명궁'; })[0], sp = z.palaces.filter(function (p) { return p.shen; })[0]; zw = '<div class="tq-box"><h4>자미두수 명반 요약</h4><dl class="tq-dl"><div><dt>명궁 주성</dt><dd>' + esc(mp && mp.main.length ? mp.main.join(' · ') : '주성 없음') + '</dd></div><div><dt>오행국</dt><dd>' + esc(z.gukEl) + ' (' + z.guk + '국)</dd></div><div><dt>명주 · 신주</dt><dd>' + esc(z.mingju + ' · ' + z.shinju) + '</dd></div>' + (sp ? '<div><dt>신궁</dt><dd>' + esc(sp.name) + '</dd></div>' : '') + '</dl><p class="tq-sub">삼합파 기준 명반이며 음력 생일과 태어난 시각이 필요합니다.</p></div>'; }
        else zw = '<div class="tq-box"><h4>자미두수 명반 요약</h4><p class="tq-sub">태어난 시각을 모르면 명반을 세울 수 없습니다.</p></div>';
      }
      return '<div class="tq-pillars" role="group" aria-label="사주 원국">' + cols + '</div>' + (ch.hourKnown ? '' : '<p class="tq-sub">출생 시각을 몰라 시주(時柱) 없이 계산했습니다. 일간·일주는 날짜 기준이라 그대로입니다.</p>') +
        '<div class="tq-two"><div class="tq-box tq-me"><h4>' + tip('일간') + ' · ' + tip('일주') + '</h4><p class="tq-ju"><b>' + esc(M.STEM[day.s] + M.BR[day.b]) + '</b><span>' + esc(ju) + '일주</span></p>' + (ig ? '<p class="tq-line">' + esc(String(ig.line).replace(/\n/g, ' ')) + '</p>' : '') + (jc ? '<p class="tq-trait">' + esc(jc.trait) + '</p>' : S5.strength ? '<p class="tq-trait">' + esc(S5.strength) + '</p>' : '') +
        '<a class="tq-lnk" href="#/awaken?replay=1&to=timeline" data-track="fortune_content_click" data-p="ilju_replay">일주 각성 영상 다시 보기 →</a></div>' + els + '</div>' + zw;
    }

    /* ── 영역 2: 인생 전체의 흐름 ── */
    function flowHtml() {
      var graph = G.daeun ? barChart(dl, { label: '대운 흐름 그래프', cls: 'daeun', attr: function (it) { return 'data-d="' + it.idx + '"'; }, sel: function (it) { return st.d === it.idx; }, now: function (it) { return !!it.isCurrent; }, name: function (it) { return it.startAge + '~' + it.endAge + '세 ' + it.ganzhi + ' 대운'; }, top: function (it) { return it.startAge + '세'; }, sub: function (it) { return it.ganzhi; } })
        : '<div class="tq-chips">' + real.map(function (it) { return '<button type="button" class="tq-chip ' + KEYC(it) + (st.d === it.idx ? ' sel' : '') + '" data-d="' + it.idx + '"><b>' + it.startAge + '~' + it.endAge + '세</b><span>' + esc(it.ganzhi) + ' · ' + esc(it.six) + '</span></button>'; }).join('') + '</div>';
      var sel = real.filter(function (x) { return x.idx === st.d; })[0], body = '';
      if (sel) {
        body = detail(sel, '대운 ' + sel.ganzhi + ' · ' + sel.startYear + '~' + sel.endYear + '년 (' + sel.startAge + '~' + sel.endAge + '세)', 'daeun');
        if (G.seun) {
          var ys = years(sel.startYear);
          body += '<h4 class="tq-h4">이 10년 안의 해</h4><p class="tq-sub">해를 누르면 아래 “지금과 앞으로”에서 그 해의 세운과 월운이 열립니다.</p>' + barChart(ys, { label: sel.ganzhi + ' 대운 안의 해별 흐름', cls: 'seun', attr: function (it) { return 'data-y="' + it.year + '"'; }, sel: function (it) { return st.y === it.year; }, now: function (it) { return !!it.isNow; }, name: function (it) { return it.year + '년 ' + it.ganzhi + ' 세운'; }, top: function (it) { return String(it.year).slice(2) + '년'; }, sub: function (it) { return it.age + '세'; } });
        }
      }
      return '<p class="tq-sub">막대 높이는 흐름 점수(0~100), 색과 이름은 6분류입니다. 막대를 누르면 그 시기의 상세가 열립니다.</p>' + graph + legend + body;
    }

    /* ── 영역 3: 지금과 앞으로 ── */
    function nowHtml() {
      var yi = yearItem(st.y), ms = months(st.y), isThis = st.y === nowY;
      var yr = '<div class="tq-yrnav"><button type="button" data-yy="-1" aria-label="이전 해"' + (st.y <= 1901 ? ' disabled' : '') + '>‹</button><h3>' + st.y + '년' + (isThis ? ' <small>올해</small>' : '') + '</h3><button type="button" data-yy="1" aria-label="다음 해"' + (st.y >= 2098 ? ' disabled' : '') + '>›</button></div>';
      var seun = yi ? detail(yi, '세운 ' + yi.ganzhi + ' · ' + yi.year + '년' + (yi.age != null ? ' (' + yi.age + '세)' : ''), 'seun') : '';
      var mon = G.wolun ? '<h4 class="tq-h4">월별 흐름 (절기 기준)</h4>' + barChart(ms, { label: st.y + '년 월별 흐름', cls: 'wolun', attr: function (it) { return 'data-m="' + it.month + '"'; }, sel: function (it) { return st.m === it.month; }, now: function (it) { return !!it.isNow; }, name: function (it) { return st.y + '년 ' + it.month + '월 ' + it.ganzhi + ' 월운'; }, top: function (it) { return it.month + '월'; }, sub: function (it) { return it.ganzhi; } }) : '';
      var cm = st.m != null ? ms.filter(function (x) { return x.month === st.m; })[0] : null, monthCard = cm ? detail(cm, '월운 ' + cm.ganzhi + ' · ' + st.y + '년 ' + cm.month + '월 (' + cm.term + ' 이후)', 'wolun') : '';
      var today = '';
      if (G.today && isThis && H.Saju && H.Saju.todayData) { try { var t = H.Saju.todayData(ch); today = '<a class="tq-today" href="#/today" data-track="fortune_content_click" data-p="today_card"><div class="ring" style="--p:' + t.score + '"><b>' + t.score + '</b></div><div><small>TODAY · 오늘의 일진 ' + esc(t.gz) + '日</small><h4>' + esc(t.cond) + '의 날</h4><p>' + esc(t.line || '') + '</p><span>일진 캘린더 열기 →</span></div></a>'; } catch (e) { } }
      return yr + today + seun + mon + monthCard + '<p class="tq-sub">월운은 절기를 기준으로 하며, 1월 막대는 소한 이후입니다. 일별 흐름과 택일은 일진 캘린더에서 볼 수 있습니다.</p>';
    }

    /* ── 영역 4: 인생의 주요 주제 ── */
    function themesHtml() {
      var list = TC.topics.filter(function (t) { return t.enabled !== false; });
      return '<div class="tq-topics">' + list.map(function (t) {
        var href = t.kind === 'link' && t.link ? t.link : '#/go?to=' + (t.interest || 'life'), img = t.image || asset(t.asset);
        return '<a class="tq-topic" href="' + esc(href) + '" data-track="timeline_topic_click" data-p="' + esc(t.id) + '" data-ob-ev="timeline_topic_click" data-case="t-' + esc(t.id) + '"><img src="' + esc(img) + '" alt="" loading="lazy" decoding="async"><span class="tq-acc ' + t.access + '">' + esc(Q.ACCESS[t.access] || '') + '</span><div><h3>' + esc(t.title) + '</h3><p>' + esc(t.desc) + '</p></div></a>';
      }).join('') + '</div>';
    }

    /* ── 화면 조립 ── */
    var secs = TC.sections.filter(function (s) { return s.enabled !== false; });
    var builders = { birth: birthHtml, flow: flowHtml, now: nowHtml, themes: themesHtml };
    var heroBg = asset('archive'), pos = Q.assetFocus(cfg, 'archive', mobile);
    var html = '<div class="tq" id="tq"><header class="tq-hero" style="--hero:url(\'' + esc(heroBg) + '\');--pos:' + esc(pos) + '"><p class="kick">MANTRA · FATE TIMELINE</p><h1>운명의 타임라인</h1><p class="tq-who">' + esc(A()) + '</p><p class="tq-intro">' + esc(O.fill(TC.texts.intro, nm, cfg)) + '</p></header>' +
      '<nav class="tq-nav" id="tqNav" aria-label="타임라인 영역">' + secs.map(function (s, i) { return '<a href="#tq-' + s.id + '" data-z="' + s.id + '"><i>' + (i + 1) + '</i>' + esc(s.title) + '</a>'; }).join('') + '</nav>' +
      secs.map(function (s, i) { return '<section class="tq-sec" id="tq-' + s.id + '" data-z="' + s.id + '"><div class="tq-sech"><span>' + (i + 1) + '</span><div><h2>' + esc(s.title) + '</h2>' + (s.sub ? '<p>' + esc(s.sub) + '</p>' : '') + '</div></div><div class="tq-body" id="tqb-' + s.id + '">' + builders[s.id]() + '</div></section>'; }).join('') +
      '<footer class="tq-foot"><div class="tq-acts"><a class="btn" href="#/" data-track="fortune_content_click" data-p="timeline_home">내 홈으로 가기</a><a class="btn ghost sm" href="#/my?s=1" data-track="fortune_content_click" data-p="timeline_my">MY 운명 홈</a><a class="btn ghost sm" href="#/begin?edit=1">출생정보 수정</a></div><p class="dis">' + esc(TC.texts.notice) + '</p></footer></div>';
    var el = H.view(html);
    DOC.body.classList.add('tq-wide'); var prevClean = H.cleanup; H.cleanup = function () { DOC.body.classList.remove('tq-wide'); if (io) io.disconnect(); if (prevClean) prevClean(); };
    var root0 = $('#tq', el);

    function redraw(id) { var b = $('#tqb-' + id, root0); if (b) { var y = root.scrollY; b.innerHTML = builders[id](); root.scrollTo(0, y); } }
    root0.addEventListener('click', function (e) {
      var t = e.target, b;
      if ((b = t.closest('[data-d]'))) { st.d = +b.getAttribute('data-d'); st.ev = null; redraw('flow'); return; }
      if ((b = t.closest('[data-y]'))) { st.y = +b.getAttribute('data-y'); st.m = null; st.ev = null; Ob.track('timeline_year_select', {}); redraw('flow'); if ($('#tqb-now', root0)) { redraw('now'); var s3 = $('#tq-now', root0); if (s3) s3.scrollIntoView({ behavior: H.reduce ? 'auto' : 'smooth', block: 'start' }); } return; }
      if ((b = t.closest('[data-yy]'))) { st.y = Math.max(1901, Math.min(2098, st.y + (+b.getAttribute('data-yy')))); st.m = null; st.ev = null; var dd = dOf(st.y); if (dd) st.d = dd.idx; redraw('now'); redraw('flow'); return; }
      if ((b = t.closest('[data-m]'))) { var mm = +b.getAttribute('data-m'); st.m = st.m === mm ? null : mm; st.ev = null; redraw('now'); return; }
      if ((b = t.closest('[data-ev]'))) { var lvl = b.getAttribute('data-ev'), key = lvl + ':' + (lvl === 'daeun' ? st.d : lvl === 'seun' ? st.y : st.m); st.ev = st.ev === key ? null : key; redraw(lvl === 'daeun' ? 'flow' : 'now'); return; }
      if ((b = t.closest('.tip'))) { e.preventDefault(); var open = b.classList.contains('open'); $$('.tip.open', root0).forEach(function (x) { x.classList.remove('open'); }); if (!open) b.classList.add('open'); return; }
      if ((b = t.closest('[data-z]')) && b.tagName === 'A') { e.preventDefault(); var sec = $('#tq-' + b.getAttribute('data-z'), root0); if (sec) sec.scrollIntoView({ behavior: H.reduce ? 'auto' : 'smooth', block: 'start' }); }
    });
    // 현재 보고 있는 영역을 상단 바로가기에 표시
    var io = null;
    if ('IntersectionObserver' in root) { io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { $$('#tqNav a', root0).forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-z') === x.target.getAttribute('data-z')); }); } }); }, { rootMargin: '-35% 0px -55% 0px' }); $$('.tq-sec', root0).forEach(function (s) { io.observe(s); }); }
    if (q.z) { var zt = $('#tq-' + q.z, root0); if (zt) setTimeout(function () { zt.scrollIntoView({ block: 'start' }); }, 60); }
    Ob.track('timeline_view', {}, true);
  }
})(window);
