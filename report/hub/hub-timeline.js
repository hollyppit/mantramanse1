// 운명의 타임라인(#/timeline) — 태어난 순간 → 인생 전체의 흐름(대운) → 지금과 앞으로(세운·월운·일진) → 인생의 주요 주제.
//   · 모든 값은 기존 엔진의 계산 결과다: Manse.compute(원국·오행·십성·자미두수) / ReportV2.Timeline(대운·세운·월운 + 6분류, 근거) / Hub.Saju.todayData(일진).
//   · 이 파일은 점수나 명리 판단을 만들지 않는다. 그래프 높이 = 엔진의 흐름 점수(fit, -100~100)를 0~100 으로 옮긴 값(월운 캘린더와 같은 식).
//   · 심층 풀이(재물·직업·연애 등)는 기존 무빙툰 뷰어(/report/v2/)로 연결한다. 홈(#/)의 기능은 그대로 두고, 홈 상단에서 이 화면으로 들어온다.
//   · 구성(영역 순서·표시·그래프 설정·주제 타일)은 관리자 설정 config.timeline 이 정한다.
(function (root) {
  'use strict';
  var H = root.Hub, Ob = H.Onboard, O = root.Onboard, Q = root.Quest, P = H.profile, esc = H.esc, DOC = document;
  var $ = H.$, $$ = H.$$;
  var V2 = ['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'story-director', 'luck6', 'timeline', 'explore'];
  var EL_COL = ['#5E9E78', '#D0634A', '#BC9C62', '#AEB9C6', '#4A7AB5'], GROUPS5 = ['비겁', '식상', '재성', '관성', '인성'], GROUP_MEAN = { 비겁: '나·동료·자존심', 식상: '표현·재능·활동', 재성: '돈·현실 감각', 관성: '직장·책임·규칙', 인성: '배움·도움·생각' }, EL_HJ = ['木', '火', '土', '金', '水'];
  var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  var pct = function (fit) { return clamp((fit + 100) / 2); };
  var SAMPLE = { year: 1992, month: 6, day: 23, hour: 7, minute: 30, calendar: 'solar', leap: false, gender: 'M', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto' };

  // 무빙툰 뷰어의 시간 모듈(대운·세운·월운 + 6분류)은 이 화면에서만 필요하므로 처음 열 때 순서대로 불러온다(내려받기는 동시에, 실행은 순서대로).
  var tlP = null;
  function loadTl() {
    if (root.ReportV2 && root.ReportV2.Timeline) return Promise.resolve();
    if (!tlP) tlP = Promise.all(V2.map(function (n) { return new Promise(function (ok, no) { var s = DOC.createElement('script'); s.src = '/report/v2/' + n + '.js'; s.async = false; s.onload = ok; s.onerror = function () { no(new Error('load ' + n)); }; DOC.head.appendChild(s); }); })).catch(function (e) { tlP = null; throw e; });
    return tlP;
  }

  // 관리자가 저장한 세계 정의(/api/worlds). 4초 안에 못 받으면 코드 기본 6개 세계로 간다(운명 세계 지도와 같은 규칙).
  function loadWorlds() {
    return new Promise(function (ok) {
      var done = false, fin = function (v) { if (!done) { done = true; ok(v); } }; setTimeout(function () { fin(null); }, 4000);
      try { fetch('/api/worlds').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { fin(d && d.worlds && d.worlds.length ? d.worlds : null); }).catch(function () { fin(null); }); } catch (e) { fin(null); }
    });
  }

  // 카드 첫머리 문안(6분류 × 대운·세운·월운, luck-interpret.js SIX) — 스위치 timelineCopy 가 켜졌을 때만 쓴다(기본 꺼짐).
  //   켜는 곳: 관리자 운세 환경 탭(/api/luck-flags timelineCopy) 또는 로컬·미리보기 주소 ?mantraFlags=timelineCopy(feature-flags.js).
  //   무엇이든 실패하거나 4초 안에 답이 없으면 null → 예전 카드 그대로. 게시된 문구(/api/luck-phrases)가 있으면 기본 문구 대신 쓴다.
  var copyP = null;
  function script(src) { return new Promise(function (ok, no) { var s = DOC.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; DOC.head.appendChild(s); }); }
  function getJson(u, ms) { return new Promise(function (ok) { var done = false, fin = function (v) { if (!done) { done = true; ok(v); } }; setTimeout(function () { fin(null); }, ms); try { fetch(u).then(function (r) { return r.ok ? r.json() : null; }).then(fin, function () { fin(null); }); } catch (e) { fin(null); } }); }
  // 스위치가 4초 안에 안 오면 예전에는 꺼진 문안으로 그렸다. 이제 이 기기에 저장된 마지막 스위치 값을 쓴다(report/last-good.js).
  function flagsJson() { var LG = root.MantraLastGood; return LG ? LG.load('/api/luck-flags', { timeout: 4000, coldTimeout: 8000, valid: function (d) { return !!(d && typeof d === 'object' && Number.isInteger(d.version)); } }).then(function (x) { return x.data; }) : getJson('/api/luck-flags', 4000); }
  function loadCopy() {
    if (copyP) return copyP;
    copyP = Promise.all([root.MANTRA_FLAGS ? Promise.resolve() : script('/feature-flags.js').catch(function () { }), flagsJson()]).then(function (r) {
      var on = !!(root.MANTRA_FLAGS && root.MANTRA_FLAGS.timelineCopy === true) || !!(r[1] && r[1].timelineCopy === true);
      if (!on) return null;
      return (root.MantraLuckInterpret ? Promise.resolve() : script('/luck-interpret.js')).then(function () { return getJson('/api/luck-phrases', 4000); }).then(function (d) {
        var LI = root.MantraLuckInterpret; if (!LI || !LI.sixCopy) return null;
        if (d && d.published) try { LI.applyPublished(d.published); } catch (e) { }
        return LI;
      });
    }).catch(function () { return null; });
    return copyP;
  }

  // 그래프 지표 계산 모듈(timeline-graph.js)과 30년·2년 구간(luck-cycle.js, 스위치 luckCycle)·오행 흐름(스위치 elementFlow)을 불러온다. 실패해도 예전 그래프로 그린다.
  var graphP = null;
  function loadGraph() {
    if (graphP) return graphP;
    graphP = Promise.all([root.MantraTLGraph ? Promise.resolve() : H.load('/report/hub/timeline-graph.js?v=20261113-zw').catch(function () { }), flagsJson(), root.MantraNatal ? Promise.resolve() : H.load('/report/natal-table.js?v=20261113-natal').catch(function () { })]).then(function (r) {
      var F = root.MANTRA_FLAGS || {}, f = r[1] || {}, lc = F.luckCycle === true || f.luckCycle === true, ef = F.elementFlow === true || f.elementFlow === true;
      return (lc && !root.MantraLuckCycle ? H.load('/luck-cycle.js?v=20261113-span').catch(function () { }) : Promise.resolve()).then(function () { return { lc: lc && !!root.MantraLuckCycle, ef: ef }; });
    }).catch(function () { return { lc: false, ef: false }; });
    return graphP;
  }
  H.route('timeline', function (q, ctx) {
    var PREVIEW = !!Ob.preview;
    if (!P.has() && !PREVIEW) return H.replace('#/welcome');
    // 들어올 때 일주 각성 영상(#/awaken)을 먼저 보여 준다. 탭(세션)마다 한 번: 풀이를 보고 돌아올 때는 다시 틀지 않는다. 각성이 끝나면 이 화면(같은 z)으로 돌아온다.
    if (!PREVIEW && !q.aw) {
      var awk = 'mt_tl_awk', seen = false; try { seen = sessionStorage.getItem(awk) === P.sig(); sessionStorage.setItem(awk, P.sig()); } catch (e) { seen = true; }
      if (!seen) return H.replace('#/awaken?to=timeline' + (P.awakened() ? '&replay=1' : '') + (q.z ? '&z=' + encodeURIComponent(q.z) : ''));
    }
    H.view('<p class="pend">운명의 타임라인을 펼치는 중…</p>');
    Ob.config().then(function (cfg) {
      if (!cfg.timeline || cfg.timeline.enabled === false) return H.replace('#/');
      return Promise.all([H.sajuKit(), PREVIEW ? H.engine().then(function (M) { return M.compute(SAMPLE); }) : H.chart(), loadTl().then(loadWorlds), loadCopy(), loadGraph()]).then(function (r) { if (H.alive(ctx)) draw(q, ctx, cfg, r[0], r[1], PREVIEW, root.ReportV2.Explore.mergeWorlds(r[2]), r[3], r[4]); });
    }).catch(function () { if (!H.alive(ctx)) return; H.view('<p class="pend">타임라인을 불러오지 못했습니다.<br><br><button type="button" class="btn ghost" id="rt">다시 시도</button><br><br><a class="btn ghost sm" href="#/?home=1">홈으로</a></p>'); $('#rt').onclick = function () { H.render(); }; });
  });

  function draw(q, ctx, cfg, kit, ch, PREVIEW, worlds, CP, GF) {
    var M = kit.M, T = kit.T, R = root.ReportV2, TL = R.Timeline, L = R.Luck6, TC = cfg.timeline, G = TC.graph, nm = PREVIEW ? '미리보기' : P.name(), mobile = (root.innerWidth || 1024) < 768;
    var now = Date.now(), nowY = new Date(now + 9 * 3600e3).getUTCFullYear(), day = ch.pillars.day, stemK = M.STEM_K[day.s], ju = M.gzNameK(day), g = ch.gender;
    var ig = T.ilganCard(stemK, nm), jc = T.ijuCard(ju, nm, g), S5 = (T.DATA.S || {})[stemK] || {};
    var dl = TL.daeun(M, ch, now), real = dl.filter(function (x) { return !x.pre; });
    var cur = real.filter(function (x) { return x.isCurrent; })[0] || real[0];
    var st = { d: cur ? cur.idx : null, y: nowY, m: null, ev: null, metric: 'flow' };
    try { var sm = sessionStorage.getItem('mt_tl_metric'); if (sm && root.MantraTLGraph && root.MantraTLGraph.NAME[sm]) st.metric = sm; } catch (e) { }
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

    // 지금 보고 있는 사주의 출생정보 한 줄 + 바꾸기(언제든 수정 화면으로). 미리보기에서는 표본이라 숨긴다.
    var EDIT = '#/begin?edit=1', ME_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
    var birthLine = function () {
      var s = PREVIEW ? null : P.get(); if (!s) return '';
      var hm = s.hourUnknown || s.hour == null || s.hour === '' ? '시각 모름' : ('0' + s.hour).slice(-2) + ':' + ('0' + (+s.minute || 0)).slice(-2);
      var txt = s.year + '.' + ('0' + s.month).slice(-2) + '.' + ('0' + s.day).slice(-2) + ' ' + (s.calendar === 'lunar' ? '음력' + (s.leap ? '(윤달)' : '') : '양력') + ' · ' + hm + ' · ' + (s.gender === 'F' ? '여' : '남');
      return '<p class="tq-birth"><span>' + esc(txt) + '</span><a href="' + EDIT + '" data-track="profile_edit" data-p="timeline_hero">바꾸기</a></p>';
    };

    /* ── 공통 조각 ── */
    var TL_TERMS = Object.assign({}, root.MantraNatal ? root.MantraNatal.TERMS : {}, { '천간': '기둥 위쪽 글자. 겉으로 드러나는 기운이에요(갑을병정무기경신임계).', '지지': '기둥 아래쪽 글자. 바탕·환경이 되는 기운이에요(자축인묘…).', '십성': '나(일간)와 다른 글자의 관계를 열 가지로 나눈 것이에요. 비겁·식상·재성·관성·인성 다섯 묶음으로 봐요.', '지장간': '지지 속에 숨어 있는 천간이에요. 겉으로는 안 보여도 때가 되면 드러나는 잠재된 기운이에요.', '12운성': '일간의 힘이 그 자리에서 어느 단계인지(태어남·자람·전성·쇠퇴…)를 열두 단계로 본 것이에요. "좌"는 그 기둥 천간 자신의 기준이에요.', '12신살': '연지(또는 일지) 기준으로 각 자리에 붙는 열두 가지 신호예요. 길흉을 단정하지 않는 참고 표시예요.', '신살': '특정 글자 조합에 붙는 별칭이에요. 초록은 도움이 되는 신호, 붉은색은 주의 신호이며 참고용이에요.', '원국': '태어난 순간의 네 기둥(연·월·일·시)으로 이루어진 타고난 구조예요.', '세운': '해마다 들어오는 운. 그해의 날씨 같은 1년 단위 환경이에요.', '월운': '달마다 들어오는 운. 이번 달의 노면 같은 환경이에요.', '일진': '그날의 간지. 오늘 직접 마주치는 짧은 흐름이에요.' });
    var tip = function (w) { var t = O.TERMS[w] || TL_TERMS[w]; return t ? '<span class="tip" tabindex="0" role="button" aria-label="' + esc(w + ': ' + t) + '" data-tip="' + esc(t) + '">' + esc(w) + '</span>' : esc(w); };
    var KEYC = function (it) { return 'k-' + esc(it.key || 'pre'); };
    // 분야 점수는 분야마다 분포가 달라(재물은 좁게, 직업은 넓게) 같은 숫자가 다른 등급이 된다(engine.js DOMAIN_SCORE_THRESHOLDS).
    // 숫자를 나란히 보여 주면 "직업 34 무난 · 재물 45 다소 낮음"처럼 앞뒤가 안 맞아 보여서, 막대 길이와 표시는 등급 기준으로 맞춘다.
    var BAND_W = { '낮음': 16, '다소 낮음': 34, '무난': 55, '높음': 76, '매우 높음': 94 };
    function fieldBars(it) {
      var f = it.fields || {}, names = { money: '재물', career: '직업', love: '애정·인연' };
      return '<div class="tq-fs">' + ['money', 'career', 'love'].filter(function (k) { return f[k]; }).map(function (k) { var v = f[k], w = BAND_W[v.band] || Math.max(2, Math.min(100, v.score)); return '<div class="tq-f"><span>' + names[k] + '</span><div class="tq-fb" role="img" aria-label="' + names[k] + ' ' + esc(v.band) + '"><i style="width:' + w + '%"></i></div><b><small>' + esc(v.band) + '</small></b></div>'; }).join('') + '</div>';
    }
    function detail(it, title, lvl) { // 한 시기의 상세 카드(엔진의 6분류·판정 근거·분야 점수) + 근거 보기
      var ov = it.overlays && (it.overlays.volatility || it.overlays.defense) ? '<p class="tq-ov">' + (it.overlays.volatility ? '<i>변동 신호</i>' : '') + (it.overlays.defense ? '<i>방어 신호</i>' : '') + '</p>' : '';
      var open = st.ev === lvl + ':' + (it.idx != null ? it.idx : it.year != null ? it.year : it.month);
      // 스위치가 켜졌으면 6분류 한 줄 대신 시기 첫 문장(제목)·설명·할 일·함정을 보여 준다. 6분류 이름은 색 범례와 맞추려고 작은 글씨로 남긴다.
      var cp = CP && CP.sixCopy(it.six, lvl);
      // 문안은 "올해는…", "이번 달은…"으로 쓰여 있다. 지금이 아닌 해·달을 눌렀을 때는 "이 해", "이 달"로 바꿔 읽히게 한다.
      if (cp && !(it.isNow || it.isCurrent)) { var rel = function (t) { return String(t || '').replace(/올해도/g, '이 해에도').replace(/올해/g, '이 해').replace(/이번 달/g, '이 달'); }; cp = { hook: rel(cp.hook), body: rel(cp.body), do: rel(cp.do), trap: rel(cp.trap) }; }
      var head = cp
        ? '<h3>' + esc(cp.hook) + '<small>' + esc(it.six) + ' · ' + esc(it.meaning) + '</small></h3><p class="tq-copy">' + esc(cp.body) + '</p><ul class="tq-copy-l"><li><b>해 볼 것</b>' + esc(cp.do) + '</li><li><b>조심할 것</b>' + esc(cp.trap) + '</li></ul>'
        : '<h3>' + esc(it.six) + '<small>' + esc(it.meaning) + '</small></h3>';
      return '<article class="tq-card ' + KEYC(it) + (cp ? ' has-copy' : '') + '"><p class="tq-ct">' + esc(title) + '</p>' + head + '<p class="tq-rule"><b>이렇게 판정했어요</b> ' + esc(it.rule) + '</p>' + ov + (TG && it._ref ? domHtml(it, lvl) + structHtml(it, lvl) : fieldBars(it)) +
        '<p class="tq-sc">흐름 점수 ' + pct(it.scores.fit) + ' · 운의 세기 ' + it.scores.intensity + ' · 변화 신호 ' + it.scores.volatility + (it.condition ? ' · 상태 ' + esc(it.condition) : '') + '</p>' +
        '<div class="tq-card-acts"><button type="button" class="tq-lnk" data-ev="' + lvl + '" aria-expanded="' + open + '">' + (open ? '근거 닫기' : '자세한 근거 보기') + '</button><a class="tq-lnk" href="#/go?to=future" data-track="timeline_topic_click" data-p="detail_' + lvl + '">이 시기 상세 풀이 →</a></div>' +
        (open ? '<div class="tq-evbox">' + TL.evidenceHtml(TL.evidence(M, ch, it)) + '</div>' : '') + '</article>';
    }
    /* ── 그래프 지표(2026-11-12, 만세력 운세 흐름 탭과 같은 기준): 전체 흐름 · 연애 · 재물 · 건강 · 사고수 · 직업·가족 세부.
          막대 높이 = 고른 지표 점수(0~100), 막대 색·위 글자 = 신호등 단계(최고·좋음·무난·주의·부담), 아래 작은 글자 = 그 시기의 성격(6분류).
          계산은 timeline-graph.js(엔진 값 그대로). 모듈을 못 불러오면 예전처럼 흐름 점수·6분류 색으로 그린다. ── */
    var TG = root.MantraTLGraph || null;
    var metric = function () { return TG ? st.metric : 'flow'; };
    var mName = function () { return TG ? TG.NAME[metric()] : '전체 흐름'; };
    var valOf = function (it) { var r = it && it._ref, v = TG && r ? TG.value(M, ch, r.p, r.level, metric()) : null; return v || { v: pct(it.scores.fit), sig: null, tags: [], summary: '' }; };
    var sgChip = function (sg) { return sg ? '<i class="tq-sgb" style="background:' + sg.c + ';color:' + sg.t + '">' + sg.n + '</i>' : ''; };
    function metricBar(compact) {
      if (!TG) return '';
      if (compact) return '<div class="tq-metric compact" role="group" aria-label="그래프 지표"><div class="tq-mchips">' + TG.METRICS.map(function (x) { return '<button type="button" class="tq-mchip' + (metric() === x[0] ? ' on' : '') + '" data-metric="' + x[0] + '" aria-pressed="' + (metric() === x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div></div>';
      var m = metric(), btn = function (x, suf) { return '<button type="button" class="tq-mchip' + (m === x[0] ? ' on' : '') + '" data-metric="' + x[0] + '" aria-pressed="' + (m === x[0]) + '">' + esc(x[1]) + (suf || '') + '</button>'; };
      var note = TG.NOTE[m] || TG.NOTE.sub;
      var legendTxt = (m === 'flow' ? '색 = 이 시기가 나에게 얼마나 유리한가(흐름 점수 기준)' : '색 = 이 사주의 평소 수준보다 얼마나 좋은가' + (m === 'accident' ? '(사고수는 낮을수록 좋음)' : '')) + ' · 막대 높이 = ' + mName() + ' 점수(0~100) · 막대 아래 작은 글자 = 그 시기의 성격(기회·확장·수확·축적·변동·방어)';
      return '<div class="tq-metric" role="group" aria-label="그래프 지표"><p class="tq-mh"><b>그래프 지표</b><span>인생 전체·대운·해·달 그래프에 함께 적용돼요</span></p>' +
        '<div class="tq-mchips">' + TG.METRICS.map(function (x) { return btn(x); }).join('') + '</div>' +
        '<p class="tq-sub">' + esc(note) + '</p>' +
        '<details class="tq-how"' + (mobile ? '' : ' open') + '><summary>그래프 보는 법</summary><p class="tq-sgleg">' + TG.SIG.map(function (g) { return sgChip(g); }).join('') + '</p><p class="tq-sub">' + esc(legendTxt) + '</p></details></div>';
    }
    function barChart(items, o) { // 막대 그래프: 버튼 하나가 막대 하나. 높이 = 고른 지표 점수, 색·위 글자 = 신호등 단계, 아래 글자 = 6분류(색에만 의존하지 않는다)
      return '<div class="tq-chart ' + (o.cls || '') + '" role="group" aria-label="' + esc(o.label) + '">' + items.map(function (it, i) {
        if (it.pre) return '<span class="tq-bar pre" aria-label="' + esc(it.startAge + '~' + it.endAge + '세 대운 전') + '"><b>—</b><u></u><span>' + esc(it.startAge) + '세</span><small>대운 전</small></span>';
        var vv = valOf(it), sc = vv.v, sg = vv.sig, sel = o.sel(it), now = o.now(it);
        return '<button type="button" class="tq-bar ' + KEYC(it) + (sg ? ' sg' : '') + (sel ? ' sel' : '') + (now ? ' now' : '') + '" ' + o.attr(it) + (sg ? ' style="--bc:' + sg.c + '"' : '') + ' aria-pressed="' + sel + '" aria-label="' + esc(o.name(it) + ', ' + mName() + ' ' + sc + (sg ? ' ' + sg.n : '') + ', ' + it.six + (now ? ', 지금' : '')) + '"><b>' + sc + sgChip(sg) + '</b><u><i style="height:' + sc + '%"></i></u><span>' + esc(o.top(it)) + '</span><small>' + esc(o.sub(it)) + '</small><em>' + esc(it.six) + '</em>' + (now ? '<s>지금</s>' : '') + '</button>';
      }).join('') + '</div>';
    }
    // "운은 어떻게 작동하나요?" — 만세력 운세 흐름 탭의 자동차 비유. 지금의 대운·세운·월운·일진을 그대로 넣는다(timeline-graph.js nowChain)
    function carHtml() {
      if (!TG || !TG.nowChain || PREVIEW) return '';
      var c; try { c = TG.nowChain(M, ch, now); } catch (e) { return ''; }
      var IC = { car: '車', road: '路', weather: '天', signal: '月', pin: '日' };
      var items = c.items.map(function (x) { return '<li><i aria-hidden="true">' + IC[x.k] + '</i><div><p><b>' + tip(x.name) + '</b> <span>= ' + esc(x.role) + '</span></p><p class="tq-sub">' + esc(x.desc) + '</p>' + (x.now ? '<p class="tq-car-now">지금: <b>' + esc(x.now) + '</b></p>' : '') + '</div></li>'; }).join('');
      return '<details class="tq-car"' + (mobile ? '' : ' open') + '><summary><b>운은 어떻게 작동하나요?</b> <span>자동차로 쉽게 보기</span></summary>' +
        '<p class="tq-car-line">' + esc(c.line) + '</p><ol class="tq-car-stack">' + items + '</ol>' +
        '<p class="tq-sub">운은 한 가지로 정해지지 않아요. 같은 자동차라도 어떤 도로를 달리는지, 날씨와 노면이 어떤지에 따라 주행이 달라지듯, 사주도 원국 위에 대운·세운·월운·일진이 겹쳐 지금의 흐름을 만들어요. 비가 온다고 반드시 사고가 나는 것이 아니듯, 어떤 운이 들어왔다고 특정한 일이 꼭 생기는 것은 아니에요.</p>' +
        '<div class="tq-car-keys"><p><b>그래프 글자는 세 가지를 함께 보여 줘요</b></p><ul>' +
        '<li><b>무엇이 활발해지나</b> 기회 · 확장 · 수확 · 축적 <span>— 막대 아래 작은 글자</span></li>' +
        '<li><b>변화와 부담은 얼마나</b> 변동 · 방어 <span>— 날씨 변화가 크거나, 조심해서 운전할 때</span></li>' +
        '<li><b>나에게 얼마나 잘 맞나</b> 최고 · 좋음 · 무난 · 주의 · 부담 <span>— 막대 위 색 이름표</span></li></ul>' +
        '<p><b>점수는 이렇게 읽어요</b></p><ul><li><b>흐름 점수</b> 지금의 자동차와 주행 환경이 얼마나 잘 맞는지(50이 보통, 높을수록 잘 맞음)</li><li><b>인연·재물·직업 점수</b> 그 분야가 이 사주의 평소 수준보다 얼마나 좋은지 — 사건이나 결과를 예측하지 않는 참고 지표예요</li></ul></div></details>';
    }
    // 인생 전체(태어난 해부터 90년) 연도별 막대 — 대운 구간은 배경 띠, 해를 누르면 그 해의 세운·월운이 열린다
    function lifeHtml() {
      if (!TG) return '';
      var data; try { data = TG.life(M, ch, metric(), 90); } catch (e) { return ''; }
      if (!data.length) return '';
      var n = data.length, step = 8, L0 = 30, R0 = 8, T0 = 14, B0 = 30, H0 = 170, W = L0 + R0 + n * step, y = function (v) { return T0 + (100 - v) / 100 * (H0 - T0 - B0); };
      var s = '<svg class="tq-lifesvg" viewBox="0 0 ' + W + ' ' + H0 + '" width="' + W + '" height="' + H0 + '" role="img" aria-label="' + esc('인생 전체 ' + mName() + ' 그래프') + '">';
      real.forEach(function (d, i) { var a = Math.max(0, d.startYear - data[0].year), b = Math.min(n, d.endYear - data[0].year + 1); if (b <= a) return; s += '<rect x="' + (L0 + a * step) + '" y="' + T0 + '" width="' + ((b - a) * step) + '" height="' + (H0 - T0 - B0) + '" fill="' + (i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(205,178,122,.05)') + '"/><text x="' + (L0 + a * step + 3) + '" y="' + (T0 + 10) + '" font-size="9" fill="#8a8f9c">' + esc(d.ganzhi) + '</text>'; });
      [0, 50, 100].forEach(function (g) { s += '<line x1="' + L0 + '" x2="' + (W - R0) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="rgba(255,255,255,' + (g === 50 ? '.18' : '.08') + ')" ' + (g === 50 ? 'stroke-dasharray="3 3"' : '') + '/><text x="' + (L0 - 5) + '" y="' + (y(g) + 3) + '" font-size="9" text-anchor="end" fill="#8a8f9c">' + g + '</text>'; });
      data.forEach(function (q, i) {
        var x = L0 + i * step, h = Math.max(2, y(0) - y(q.v)), on = q.year === st.y, isNow = q.year === nowY;
        s += '<rect data-y="' + q.year + '" x="' + (x + 1) + '" y="' + (y(0) - h) + '" width="' + (step - 2) + '" height="' + h + '" rx="1.5" fill="' + q.sig.c + '"' + (on ? ' stroke="#fff" stroke-width="1.5"' : '') + ' style="cursor:pointer"><title>' + esc(q.year + '년 ' + q.gz + ' · ' + q.age + '세 · ' + mName() + ' ' + q.v + ' ' + q.sig.n) + '</title></rect>';
        if (isNow) s += '<text x="' + (x + step / 2) + '" y="' + (y(0) - h - 4) + '" font-size="9" text-anchor="middle" fill="#cdb27a">지금</text>';
        if (q.age % 10 === 0) s += '<text x="' + (x + step / 2) + '" y="' + (H0 - B0 + 13) + '" font-size="9" text-anchor="middle" fill="#8a8f9c">' + q.age + '세</text><text x="' + (x + step / 2) + '" y="' + (H0 - B0 + 24) + '" font-size="8" text-anchor="middle" fill="#6c7180">' + q.year + '</text>';
      });
      s += '</svg>';
      return '<h4 class="tq-h4">인생 전체 · ' + esc(mName()) + '</h4><p class="tq-sub">태어난 해부터 90년을 한 해씩 막대로 그렸어요. 배경 띠는 대운 10년 구간이에요. 막대를 누르면 아래 "지금과 앞으로"에서 그 해가 열려요.</p><div class="tq-life">' + s + '</div>';
    }
    // 30년 장기 구간(대운 3개 묶음)·2년 천간 오행 구간 — luck-cycle.js(사전 문구 조합, 스위치 luckCycle)
    var LCm = function () { return GF && GF.lc && root.MantraLuckCycle ? root.MantraLuckCycle : null; }, lcSpans = null;
    function lcSteps(r) { return '<ol class="tq-lc-steps"><li><b>오행의 특징</b>' + esc(r.steps.trait) + '</li><li><b>나에게 미치는 영향</b>' + esc(r.steps.impact) + '</li><li><b>추천 전략</b>' + esc(r.steps.strategy) + '</li></ol>' + (r.basis && r.basis.length ? '<details class="tq-how"><summary>판단 근거 보기</summary><ul class="tq-lc-basis">' + r.basis.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul><p class="tq-sub">미리 써 둔 문구를 이 사주의 계산값으로 골라 조합했어요(AI 미사용). 흐름 점수는 바꾸지 않아요.</p></details>' : ''); }
    function spanHtml() {
      var LC = LCm(); if (!LC || st.d == null) return '';
      try { lcSpans = lcSpans || LC.daeunSpans(M, ch); var k = LC.spanIndexOf(lcSpans, st.d), sp = lcSpans[k]; if (!sp) return '';
        return '<div class="tq-lc"><p class="tq-lc-k">30년 장기 구간 · ' + esc(sp.startAge + '~' + sp.endAge + '세 (' + sp.startYear + '~' + sp.endYear + ')') + '</p><div class="tq-lc-bar">' + lcSpans.map(function (x, i) { return '<span class="' + (i === k ? 'on' : '') + '">' + esc(x.startAge + '~' + x.endAge + '세') + '</span>'; }).join('') + '</div><h4>' + esc(sp.hook) + '</h4>' + lcSteps(sp) + '</div>';
      } catch (e) { return ''; }
    }
    function pairHtml() {
      var LC = LCm(); if (!LC) return '';
      try { var r = LC.seunPair(M, ch, st.y); if (!r) return ''; return '<div class="tq-lc"><p class="tq-lc-k">' + esc(r.label + ' · ' + r.start + '~' + r.end + '년') + '</p><h4>' + esc(r.hook) + '</h4>' + lcSteps(r) + '</div>'; } catch (e) { return ''; }
    }
    // 상세 카드 보강: 고른 지표 점수·신호, 분야별 지수, 운+원국 구조·오행 흐름
    function domHtml(it, lvl) {
      if (!TG || !it._ref) return '';
      var r; try { r = TG.domainOf(M, ch, it._ref.p, lvl); } catch (e) { return ''; }
      var cell = function (k, label) { var x = r[k]; if (!x) return ''; var sg = TG.sigMetric(k, x.score); return '<div class="tq-dc"><span>' + label + '</span><b>' + Math.round(x.score) + '</b>' + sgChip(sg) + '</div>'; };
      var m = metric(), sel = m !== 'flow' && r[m] ? r[m] : null;
      var top = sel ? '<p class="tq-dsel"><b>' + esc(mName()) + ' ' + Math.round(sel.score) + '</b> ' + sgChip(TG.sigMetric(m, sel.score)) + (sel.tags && sel.tags.length ? ' <span>' + esc(sel.tags.join(' · ')) + '</span>' : '') + '</p>' + (sel.summary ? '<p class="tq-sub">' + esc(sel.summary) + '</p>' : '') : '';
      var loss = (m === 'wealth' || m === 'windfall') && r.windfall && r.windfall.loss ? '<p class="tq-sub">뜻밖의 재물손실 위험 <b>' + Math.round(r.windfall.loss.score) + '</b> ' + sgChip(TG.sigMetric('windfallLoss', r.windfall.loss.score)) + ' (낮을수록 좋음)</p>' : '';
      return '<div class="tq-dom">' + top + loss + '<div class="tq-dg">' + cell('love', '인연') + cell('wealth', '재물') + cell('career', '직업') + cell('health', '건강') + '</div></div>';
    }
    function structHtml(it, lvl) {
      if (!TG || !it._ref) return '';
      var s = TG.structure(M, ch, it._ref.p, lvl); if (!GF || !GF.ef) s.flow = null;
      if (!s.flow && !s.patterns.length) return '';
      return '<div class="tq-st">' + (s.flow ? '<p><b>오행 흐름 · ' + esc(s.flow.verdict) + '</b> <span>' + esc(s.flow.word) + '</span></p><p class="tq-sub">' + esc(s.flow.text) + '</p>' : '') +
        (s.patterns.length ? '<p class="tq-sub">이 운이 원국과 만드는 구조: ' + s.patterns.map(function (p) { return '<i class="tq-pat ' + (p.good ? 'g' : 'b') + '" title="' + esc(p.label || '') + '">' + esc(p.name) + '</i>'; }).join(' ') + '</p>' : '') + '</div>';
    }
    // 지금과 앞으로 맨 위: 앞으로 10년의 좋은 해·조심할 해(고른 지표 기준) + 삼재
    function tenHtml() {
      if (!TG) return '';
      var t; try { t = TG.tenYears(M, ch, nowY, metric()); } catch (e) { return ''; }
      var chip = function (q) { return '<button type="button" class="tq-ychip' + (q.year === st.y ? ' on' : '') + '" data-y="' + q.year + '" style="--bc:' + q.sig.c + '">' + q.year + ' ' + esc(q.gz) + ' <b>' + q.v + '</b></button>'; };
      var sj = TG.samjae(M, ch, st.y);
      return '<div class="tq-ten"><p class="tq-mh"><b>앞으로 10년 · ' + esc(mName()) + '</b><span>' + nowY + '~' + (nowY + 9) + '년</span></p>' +
        '<p class="tq-trow"><span>좋은 해</span>' + (t.good.length ? t.good.map(chip).join('') : '<em>뚜렷이 좋은 해가 없어요</em>') + '</p>' +
        '<p class="tq-trow"><span>조심할 해</span>' + (t.bad.length ? t.bad.map(chip).join('') : '<em>뚜렷이 조심할 해가 없어요</em>') + '</p></div>' +
        (sj ? '<p class="tq-sj"><b>' + st.y + '년 삼재 · ' + esc(sj.stage || '') + '</b> <span>' + esc(sj.group || '') + ' · 전통 민속 참고 신호이며 흐름 점수에는 넣지 않아요.</span></p>' : '');
    }
    var legend = '<ul class="tq-leg" aria-label="운의 6분류">' + L.NAMES.map(function (n) { return '<li class="k-' + L.KEY[n] + '"><i></i><b>' + n + '</b><span>' + esc(L.MEANING[n]) + '</span></li>'; }).join('') + '</ul>';

    /* ── 영역 1: 태어난 순간 ── */
    function birthHtml() {
      var order = ['hour', 'day', 'month', 'year'], lab = { hour: '시주', day: '일주', month: '월주', year: '연주' };
      // 2026-11-13: 원국을 만세력처럼 자세히 — 주제별 풀이(/report/v2/)와 같은 공용 표(report/natal-table.js)
      var cols = root.MantraNatal ? '<div class="mt-natal">' + root.MantraNatal.html(M, Object.assign({}, ch, { hourKnown: true }), { tip: tip }) + '</div>' : '';
      var pc = (ch.weights && ch.weights.pct) || [], gr = (ch.weights && ch.weights.groups) || [], mi = 0; for (var i = 1; i < gr.length; i++) if (gr[i] > gr[mi]) mi = i;
      var els = G.elements ? '<div class="tq-box"><h4>오행 · 십성</h4><div class="tq-els">' + M.EL_K.map(function (e, i) { var v = Math.round(pc[i] || 0); return '<div class="tq-el"><span style="color:' + EL_COL[i] + '">' + EL_HJ[i] + ' ' + e + '</span><div class="tq-eb"><i style="width:' + Math.max(2, Math.min(100, v * 2)) + '%;background:' + EL_COL[i] + '"></i></div><b>' + v + '%</b></div>'; }).join('') + '</div>' +
        '<div class="tq-gr">' + GROUPS5.map(function (n, i) { var v = Math.round(gr[i] || 0); return '<span class="' + (i === mi ? 'big' : '') + '">' + esc(n) + ' <b>' + v + '%</b></span>'; }).join('') + '</div><p class="tq-sub">가장 큰 비중은 <b>' + GROUPS5[mi] + '</b>이에요(' + GROUP_MEAN[GROUPS5[mi]] + '). ' + tip('십성') + '은 나(일간)와 다른 글자의 관계를 다섯 묶음으로 나눈 것이에요: ' + GROUPS5.map(function (n) { return n + ' ' + GROUP_MEAN[n]; }).join(' · ') + '.</p></div>' : '';
      var z = ch.ziwei, zw = '';
      if (G.ziwei) {
        if (z) { var mp = z.palaces.filter(function (p) { return p.name === '명궁'; })[0], sp = z.palaces.filter(function (p) { return p.shen; })[0]; zw = '<div class="tq-box"><h4>자미두수 명반 요약</h4><dl class="tq-dl"><div><dt>명궁 주성</dt><dd>' + esc(mp && mp.main.length ? mp.main.join(' · ') : '주성 없음') + '</dd></div><div><dt>오행국</dt><dd>' + esc(z.gukEl) + ' (' + z.guk + '국)</dd></div><div><dt>명주 · 신주</dt><dd>' + esc(z.mingju + ' · ' + z.shinju) + '</dd></div>' + (sp ? '<div><dt>신궁</dt><dd>' + esc(sp.name) + '</dd></div>' : '') + '</dl><p class="tq-sub">삼합파 기준 명반입니다. 생일은 음력으로 바꿔 계산하며, 태어난 시각이 정확할수록 잘 맞습니다.</p></div>'; }
        else zw = '<div class="tq-box"><h4>자미두수 명반 요약</h4><p class="tq-sub">태어난 시각을 모르면 명반을 세울 수 없습니다.</p></div>';
      }
      return cols + (ch.hourKnown ? '' : '<p class="tq-sub">출생 시각을 몰라 시주(時柱) 없이 계산했습니다. 일간·일주는 날짜 기준이라 그대로입니다.</p>') +
        '<div class="tq-two"><div class="tq-box tq-me"><h4>' + tip('일간') + ' · ' + tip('일주') + '</h4><p class="tq-ju"><b>' + esc(M.STEM[day.s] + M.BR[day.b]) + '</b><span>' + esc(ju) + '일주</span></p>' + (ig ? '<p class="tq-line">' + esc(String(ig.line).replace(/\n/g, ' ')) + '</p>' : '') + (jc ? '<p class="tq-trait">' + esc(jc.trait) + '</p>' : S5.strength ? '<p class="tq-trait">' + esc(S5.strength) + '</p>' : '') +
        '<a class="tq-lnk" href="#/awaken?replay=1&to=timeline" data-track="fortune_content_click" data-p="ilju_replay">일주 각성 영상 다시 보기 →</a></div>' + els + '</div>' + (G.ziwei && TG && TG.ziwei ? zwHtml() : zw);
    }
    // 2026-11-13: 자미두수 — 만세력 자미두수 탭의 "쉽게 보기"와 10년 대한·유년 그래프(같은 계산: timeline-graph.js ziwei)
    function zwHtml() {
      var z; try { z = TG.ziwei(M, ch, now); } catch (e) { z = null; }
      if (!z) return '<div class="tq-box"><h4>자미두수 쉽게 보기</h4><p class="tq-sub">태어난 시각을 모르면 자미두수 명반을 세울 수 없어요.</p></div>';
      var bars = function (items, o) {
        var n = items.length, step = o.step, W = n * step, H = o.h, T0 = 22, B0 = o.b, base = H - B0, hMax = base - T0;
        var s = '<svg class="tq-zwsvg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.label) + '"><line x1="0" x2="' + W + '" y1="' + (base - hMax * 0.5) + '" y2="' + (base - hMax * 0.5) + '" stroke="rgba(255,255,255,.15)" stroke-dasharray="3 3"/><text x="' + (W - 2) + '" y="' + (base - hMax * 0.5 - 3) + '" text-anchor="end" font-size="9" fill="#8a8f9c">내 평균(50)</text>';
        items.forEach(function (it, i) {
          var cx = step * (i + 0.5), h = hMax * it.v / 100, top = base - h;
          if (it.cur) s += '<rect x="' + (cx - step / 2) + '" y="0" width="' + step + '" height="' + H + '" fill="rgba(205,178,122,.10)"/>';
          s += '<rect x="' + (cx - 14) + '" y="' + top + '" width="28" height="' + h + '" rx="4" fill="' + it.col + '"' + (it.cur ? ' stroke="#fff" stroke-width="1.5"' : '') + '/><text x="' + cx + '" y="' + (top - 5) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#C9C2B2">' + it.v + '</text>';
          s += o.label2(it, cx, base);
        });
        return '<div class="tq-zwchart">' + s + '</svg></div>';
      };
      var dh = bars(z.daehan, { step: 50, h: 190, b: 50, label: '10년 대한 흐름', label2: function (it, cx, base) { return '<text x="' + cx + '" y="' + (base + 14) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#E9E4D8">' + esc(it.name) + '</text><text x="' + cx + '" y="' + (base + 27) + '" text-anchor="middle" font-size="9.5" fill="#8a8f9c">' + it.from + '~' + it.to + '세</text>' + (it.cur ? '<text x="' + cx + '" y="' + (base + 40) + '" text-anchor="middle" font-size="9.5" font-weight="800" fill="#cdb27a">▲ 지금</text>' : ''); } });
      var lv = bars(z.liu, { step: 56, h: 180, b: 48, label: '유년 흐름', label2: function (it, cx, base) { return '<text x="' + cx + '" y="' + (base + 14) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#E9E4D8">' + it.Y + '</text><text x="' + cx + '" y="' + (base + 27) + '" text-anchor="middle" font-size="9.5" fill="#8a8f9c">' + esc(it.name) + ' · ' + it.age + '세</text><text x="' + cx + '" y="' + (base + 40) + '" text-anchor="middle" font-size="9"><tspan fill="#7FD3A0">록' + esc(it.lu) + '</tspan> <tspan fill="#EB6B5B">기' + esc(it.gi) + '</tspan></text>'; } });
      return '<div class="tq-box tq-zw"><h4>자미두수 쉽게 보기 <small>별 이름·궁 이름 없이 먼저 요약해 드려요</small></h4><div class="tq-zw-rows">' + z.rows.map(function (r) { return '<div class="tq-zw-row"><span>' + esc(r.t) + '</span><p>' + r.b + (r.s ? '<br><small>' + esc(r.s) + '</small>' : '') + '</p></div>'; }).join('') + '</div>' +
        '<h4 class="tq-h4">10년 대한 흐름 <small>막대 = 그 10년 동안 명궁 역할을 하는 칸의 강도</small></h4>' + dh + '<p class="tq-sub">막대 하나가 10년이에요. 금색 배경이 지금 걷는 대한이며, 막대가 높을수록 그 10년은 해당 영역을 중심으로 힘이 실린다고 읽어요.</p>' +
        '<h4 class="tq-h4">유년 흐름 <small>앞으로 10년</small></h4>' + lv + '<p class="tq-sub">막대는 그해 명궁 역할을 하는 칸의 강도, 아래 글자는 그해 화록(초록)·화기(빨강)가 떨어지는 영역이에요. 점수는 좋고 나쁨의 판정이 아니라 내 명반 안에서 비교한 상대 지표예요. 삼합파 기준이며 태어난 시각이 정확할수록 잘 맞아요.</p></div>';
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
      if (TG) return carHtml() + metricBar() + lifeHtml() + '<h4 class="tq-h4">대운 10년 · ' + esc(mName()) + '</h4><p class="tq-sub">막대가 높을수록 ' + (metric() === 'accident' ? '주의 신호가 많은 시기예요(사고수는 낮을수록 좋음)' : '나에게 유리한 시기예요') + '. 막대 위 글자는 좋고 나쁨 단계, 아래 작은 글자는 그 시기의 성격이에요. 막대를 누르면 자세한 풀이가 열려요.</p>' + graph + body;
      return '<p class="tq-sub">막대가 높을수록 내 사주에 잘 맞는 시기예요(흐름 점수 0~100, 50이 보통). 색과 이름은 그 시기의 성격 6가지 중 하나예요. 막대를 누르면 자세한 풀이가 열려요.</p>' + graph + legend + body;
    }

    /* ── 영역 3: 지금과 앞으로 ── */
    function nowHtml() {
      var yi = yearItem(st.y), ms = months(st.y), isThis = st.y === nowY;
      var yr = '<div class="tq-yrnav"><button type="button" data-yy="-1" aria-label="이전 해"' + (st.y <= 1901 ? ' disabled' : '') + '>‹</button><h3>' + st.y + '년' + (isThis ? ' <small>올해</small>' : '') + '</h3><button type="button" data-yy="1" aria-label="다음 해"' + (st.y >= 2098 ? ' disabled' : '') + '>›</button></div>';
      var seun = yi ? detail(yi, '세운 ' + yi.ganzhi + ' · ' + yi.year + '년' + (yi.age != null ? ' (' + yi.age + '세)' : ''), 'seun') : '';
      var mon = G.wolun ? '<h4 class="tq-h4">월별 흐름 (절기 기준)</h4>' + barChart(ms, { label: st.y + '년 월별 흐름', cls: 'wolun', attr: function (it) { return 'data-m="' + it.month + '"'; }, sel: function (it) { return st.m === it.month; }, now: function (it) { return !!it.isNow; }, name: function (it) { return st.y + '년 ' + it.month + '월 ' + it.ganzhi + ' 월운'; }, top: function (it) { return it.month + '월'; }, sub: function (it) { return it.ganzhi; } }) : '';
      var cm = st.m != null ? ms.filter(function (x) { return x.month === st.m; })[0] : null, monthCard = cm ? detail(cm, '월운 ' + cm.ganzhi + ' · ' + st.y + '년 ' + cm.month + '월 (' + cm.term + ' 이후)', 'wolun') : '';
      return (TG ? metricBar(true) + tenHtml() : '') + yr + seun + pairHtml() + mon + monthCard + '<p class="tq-sub">월운은 절기를 기준으로 하며, 1월 막대는 소한 이후입니다. 일별 흐름과 택일은 일진 캘린더에서 볼 수 있습니다.</p>';
    }

    /* ── 영역 4: 인생의 주요 주제 = 운명 세계 ──
       기존 무빙툰의 "운명 세계" 지도(/report/v2/)와 같은 데이터(이름·한 줄 설명·아이콘·이미지·순서·유료 표시·활성화)를 그대로 쓴다.
       관리자 "세계관" 탭에서 고친 내용이 여기에도 같이 바뀌고, 타일을 누르면 그 세계가 바로 열린다(?world=). */
    function themesHtml() {
      var list = worlds.filter(function (w) { return w.enabled !== false; });
      return '<div class="tq-catalog"><div class="tq-catalog-nav"><span>좌우로 넘겨 나에게 맞는 풀이를 찾아보세요</span><div><button type="button" data-topic-slide="-1" aria-label="이전 상품">‹</button><button type="button" data-topic-slide="1" aria-label="다음 상품">›</button></div></div><div class="tq-topics" tabindex="0" role="region" aria-label="주제별 풀이 상품 슬라이드">' + list.map(function (w) {
        var href = '#/go?to=life&world=' + encodeURIComponent(w.id), accent = /^#[0-9a-fA-F]{6}$/.test(w.accent || '') ? w.accent : '#D5B97F', wc = /^#[0-9a-fA-F]{6}$/.test(w.color || '') ? w.color : '#0b1117';
        return '<a class="tq-topic" href="' + esc(href) + '" style="--wa:' + accent + ';--wc:' + wc + '" data-track="timeline_topic_click" data-p="' + esc(w.id) + '" data-ob-ev="timeline_topic_click" data-case="t-' + esc(w.id) + '"><img src="' + esc(R.Explore.artOf(w)) + '" alt="" loading="lazy" decoding="async">' +
          (w.access === 'paid' ? '<span class="tq-acc paid">유료</span>' : '') + '<div><h3><span class="tq-ic" aria-hidden="true">' + esc(w.icon || '') + '</span>' + esc(w.name) + '</h3><p>' + esc(w.line || '') + '</p></div></a>';
      }).join('') + '</div></div><p class="tq-sub">카드를 누르면 해당 주제의 풀이가 열립니다.</p>';
    }

    /* ── 맨 위: 오늘 · 무료 콘텐츠 (2026-11-12, 예전 홈·MY 운명 홈의 무료 콘텐츠를 여기로 모음) ── */
    function freeHtml() {
      var today = '';
      if (!PREVIEW && H.Saju && H.Saju.todayData) { try { var t = H.Saju.todayData(ch), ph = String(t.phase || '').replace(/기$/, '운'); today = '<a class="tq-today" href="#/today" data-track="fortune_content_click" data-p="today_card"><div class="ring" style="--p:' + t.score + '"><b>' + t.score + '</b></div><div><small>TODAY · 오늘의 일진 ' + esc(t.gz) + '日' + (ph ? ' · ' + esc(ph) : '') + '</small><h4>' + esc(t.cond) + '의 날</h4><p>' + esc(t.line || '') + '</p><span>일진 캘린더 열기 →</span></div></a>'; } catch (e) { } }
      var card = function (href, p, kick, title, line, go) { return '<a class="tq-fc" href="' + href + '" data-track="fortune_content_click" data-p="' + p + '"><small>' + kick + '</small><h4>' + title + '</h4><p>' + line + '</p><span>' + go + ' →</span></a>'; };
      var chip = function (f, label, p) { return '<a class="tq-fchip" href="#/today?f=' + f + '" data-track="fortune_content_click" data-p="' + p + '">' + label + '</a>'; };
      return today +
        '<div class="tq-fcs">' +
        card('#/today', 'calendar', 'CALENDAR · 무료', '일진 캘린더', '월운 그래프와 날짜별 일진, 내 일정에 맞는 날 고르기', '캘린더 열기') +
        card('#/tarot', 'tarot', 'FREE TAROT · 무료', '무료 타로', '마음속 질문 하나, 카드 한 장으로 가볍게 확인합니다', '카드 뽑기') +
        card('#/awaken?replay=1&to=timeline', 'ilju_replay', 'ILJU · 무료', '일주 각성 영상 다시 보기', esc(ju) + '일주 · 타고난 기질과 강점을 영상으로 다시 만납니다', '영상 보기') +
        '</div><p class="tq-fh">오늘의 분야별 흐름</p><div class="tq-fchips">' +
        chip('money', '재물운', 'today_money') + chip('work', '일·사업운', 'today_work') + chip('love', '연애운', 'today_love') + chip('health', '컨디션', 'today_health') + chip('action', '오늘의 행동 가이드', 'today_action') + '</div>';
    }
    /* ── 맨 아래: 내 정보 → 마이페이지 입구 (2026-11-13). 출생정보 수정·안내자 변경·온보딩·삭제는 마이페이지(#/me, hub-me.js) 안으로 옮겼다.
       로그인 여부는 네트워크 없이 이 기기의 Supabase 세션 키로만 본다(H.Auth.peek). 실제 확인은 마이페이지가 한다. */
    function mineHtml() {
      if (PREVIEW) return '<p class="tq-sub">미리보기에서는 내 정보 메뉴를 숨깁니다.</p>';
      var me = H.Auth && H.Auth.peek ? H.Auth.peek() : null;
      return '<a class="tq-mypage" href="#/me" data-track="mypage_open" data-p="timeline_foot"><span class="tq-mypage-ic" aria-hidden="true">' + ME_ICON + '</span><div><b>' + (me ? '마이페이지' : '로그인하고 마이페이지 보기') + '</b><small>' +
        (me ? esc(me.email ? me.email + ' 로그인 중 · ' : '') + '이용 중인 주제 · 결제 기록 · 1:1 문의 · 내 사주 관리' : '구매한 주제·결제 기록을 어느 기기에서든 한 곳에서 확인') + '</small></div><span class="tq-mypage-go">›</span></a>' +
        '<p class="tq-sub">출생정보 수정·안내자 변경·이 기기에서 삭제는 마이페이지에서 할 수 있습니다. 출생정보는 이 기기에만 저장되며 서버로 보내지 않습니다.</p>';
    }

    function avatarHtml() { return '<a class="tq-ava" id="tqAva" href="#/awaken?replay=1&to=timeline" data-track="fortune_content_click" data-p="ilju_avatar" aria-label="' + esc(ju + '일주 각성 영상 다시 보기') + '"><span class="tq-ava-ring"><img alt="" decoding="async"></span><b>' + esc(M.gzName(day)) + ' · ' + esc(ju) + '일주</b><small>눌러서 일주 영상 보기</small></a>'; }
    /* ── 화면 조립 ── */
    var secs = [{ id: 'free', title: '오늘 · 무료 콘텐츠', sub: '오늘의 일진과 바로 볼 수 있는 무료 풀이' }].concat(TC.sections.filter(function (s) { return s.enabled !== false && s.id !== 'free' && s.id !== 'mine'; })).concat([{ id: 'mine', title: '내 정보', sub: '마이페이지 · 출생정보 관리' }]);
    var builders = { free: freeHtml, birth: birthHtml, flow: flowHtml, now: nowHtml, themes: themesHtml, mine: mineHtml };
    var heroBg = asset('archive'), pos = Q.assetFocus(cfg, 'archive', mobile);
    var html = '<div class="tq" id="tq"><header class="tq-hero" style="--hero:url(\'' + esc(heroBg) + '\');--pos:' + esc(pos) + '"><p class="kick">MANTRA · FATE TIMELINE</p><h1>운명의 타임라인</h1>' + (nm ? '<p class="tq-who">' + esc(A()) + '</p>' : '') + birthLine() + '<p class="tq-intro">' + esc(O.fill(TC.texts.intro, nm, cfg)) + '</p></header>' +
      '<nav class="tq-nav" id="tqNav" aria-label="타임라인 영역">' + secs.map(function (s, i) { return '<a href="#tq-' + s.id + '" data-z="' + s.id + '"><i>' + (i + 1) + '</i>' + esc(s.title) + '</a>'; }).join('') + (PREVIEW ? '' : '<a class="tq-edit" href="#/me" data-track="mypage_open" data-p="timeline_nav" aria-label="마이페이지">' + ME_ICON + ' 마이페이지</a>') + '</nav>' +
      secs.map(function (s, i) { return '<section class="tq-sec" id="tq-' + s.id + '" data-z="' + s.id + '">' + (s.id === 'birth' && !PREVIEW ? avatarHtml() : '') + '<div class="tq-sech"><span>' + (i + 1) + '</span><div><h2>' + esc(s.title) + '</h2>' + (s.sub ? '<p>' + esc(s.sub) + '</p>' : '') + '</div></div><div class="tq-body" id="tqb-' + s.id + '">' + builders[s.id]() + '</div></section>'; }).join('') +
      '<footer class="tq-foot"><p class="dis">' + esc(TC.texts.notice) + '</p></footer></div>';
    var el = H.view(html);
    DOC.body.classList.add('tq-wide'); var prevClean = H.cleanup; H.cleanup = function () { DOC.body.classList.remove('tq-wide'); if (io) io.disconnect(); if (prevClean) prevClean(); };
    var root0 = $('#tq', el);
    if (!PREVIEW && H.Auth && H.Auth.badge) H.Auth.badge(root0);   // 1:1 문의 새 답변 표시(hub-me.js)

    function redraw(id) { var b = $('#tqb-' + id, root0); if (b) { var y = root.scrollY; b.innerHTML = builders[id](); root.scrollTo(0, y); } }
    root0.addEventListener('click', function (e) {
      var t = e.target, b;
      if ((b = t.closest('[data-topic-slide]'))) {
        var track = $('.tq-topics', root0), first = track && $('.tq-topic', track);
        if (first) track.scrollBy({ left: (+b.getAttribute('data-topic-slide')) * (first.getBoundingClientRect().width + 16), behavior: H.reduce ? 'auto' : 'smooth' });
        return;
      }
      if ((b = t.closest('[data-d]'))) { st.d = +b.getAttribute('data-d'); st.ev = null; redraw('flow'); return; }
      if ((b = t.closest('[data-metric]'))) { st.metric = b.getAttribute('data-metric'); st.ev = null; try { sessionStorage.setItem('mt_tl_metric', st.metric); } catch (e) { } Ob.track('timeline_metric_select', { m: st.metric }); redraw('flow'); redraw('now'); return; }
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
    // 일주 포스터를 프로필 사진처럼(태어난 순간 위 가운데, 둥둥 뜨는 애니메이션). 포스터는 일주 각성 영상 설정(/api/awakening)의 posterUrl.
    (function () {
      var box = $('#tqAva', root0); if (!box) return;
      var key = 'mt_tl_poster:' + ju + ':' + g, put = function (u) { if (!u || !box.isConnected) return; var im = box.querySelector('img'); im.onload = function () { box.classList.add('on'); }; im.src = u; };
      var saved = null; try { saved = sessionStorage.getItem(key); } catch (e) { }
      if (saved) return put(saved);
      fetch('/api/awakening?pillar=' + encodeURIComponent(ju) + '&gender=' + g).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var u = d && ((d.video && d.video.posterUrl) || (d.fallback && d.fallback.posterUrl) || (d.ilgan && d.ilgan.posterUrl)); if (!u) return;
        try { sessionStorage.setItem(key, u); } catch (e) { } put(u);
      }).catch(function () { });
    })();
    Ob.track('timeline_view', {}, true);
  }
})(window);
