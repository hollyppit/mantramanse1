// 운명의 타임라인(#/timeline) — 태어난 순간 → 인생 전체의 흐름(대운) → 지금과 앞으로(세운·월운·일진) → 인생의 주요 주제.
//   · 모든 값은 기존 엔진의 계산 결과다: Manse.compute(원국·오행·십성·자미두수) / ReportV2.Timeline(대운·세운·월운 + 십신, 근거) / Hub.Saju.todayData(일진).
  //   · 2026-11-20: 시기 이름은 옛 6분류 대신 십신(/ten-god-luck.js). 막대 색(신호등)·흐름 점수·변화/부담 신호는 그대로다.
//   · 이 파일은 점수나 명리 판단을 만들지 않는다. 그래프 높이 = 엔진의 흐름 점수(fit, -100~100)를 0~100 으로 옮긴 값(월운 캘린더와 같은 식).
//   · 심층 풀이(재물·직업·연애 등)는 기존 무빙툰 뷰어(/report/v2/)로 연결한다. 홈(#/)의 기능은 그대로 두고, 홈 상단에서 이 화면으로 들어온다.
//   · 구성(영역 순서·표시·그래프 설정·주제 타일)은 관리자 설정 config.timeline 이 정한다.
(function (root) {
  'use strict';
  var H = root.Hub, Ob = H.Onboard, O = root.Onboard, Q = root.Quest, P = H.profile, esc = H.esc, DOC = document;
  var $ = H.$, $$ = H.$$;
  var V2 = ['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'story-director', 'luck6', 'timeline', 'explore'];
  var EL_COL = ['#34C26B', '#F0483E', '#E8B23A', '#E6EAF0', '#3B7FF0'], GROUPS5 = ['비겁', '식상', '재성', '관성', '인성'], GROUP_MEAN = { 비겁: '나·동료·자존심', 식상: '표현·재능·활동', 재성: '돈·현실 감각', 관성: '직장·책임·규칙', 인성: '배움·도움·생각' }, EL_HJ = ['木', '火', '土', '金', '水'];
  var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  var pct = function (fit) { return clamp((fit + 100) / 2); };
  var SAMPLE = { year: 1992, month: 6, day: 23, hour: 7, minute: 30, calendar: 'solar', leap: false, gender: 'M', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto' };

  // 무빙툰 뷰어의 시간 모듈(대운·세운·월운 + 십신)은 이 화면에서만 필요하므로 처음 열 때 순서대로 불러온다(내려받기는 동시에, 실행은 순서대로).
  var tlP = null;
  function loadTl() {
    if (root.ReportV2 && root.ReportV2.Timeline) return Promise.resolve();
    if (!tlP) tlP = Promise.all(V2.map(function (n) { return new Promise(function (ok, no) { var s = DOC.createElement('script'); s.src = '/report/v2/' + n + '.js?v=20261124-sec'; s.async = false; s.onload = ok; s.onerror = function () { no(new Error('load ' + n)); }; DOC.head.appendChild(s); }); })).catch(function (e) { tlP = null; throw e; });
    return tlP;
  }

  // 신년운세 입구 카드 설정(/api/newyear/entry, 관리자 › 신년운세). undefined = 아직 안 받음, null = 숨김. 못 받으면 숨긴다.
  var NYE, nyP = null;
  function loadNyEntry() {
    if (!nyP) nyP = new Promise(function (ok) {
      var done = false, fin = function (v) { if (!done) { done = true; NYE = v; ok(v); } }; setTimeout(function () { fin(null); }, 5000);
      try { fetch('/api/newyear/entry').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { fin(d && d.entry ? d.entry : null); }).catch(function () { fin(null); }); } catch (e) { fin(null); }
    });
    return nyP;
  }
  function nyEntryHtml() {
    var e = NYE; if (!e || !e.year) return '';
    var won = e.paid && e.price > 0 ? ' · ' + (+e.price).toLocaleString('ko-KR') + '원' : '';
    return '<a class="tq-fc tq-ny" href="/report/newyear/?from=timeline" data-ny-go="' + (+e.year) + '" data-track="fortune_content_click" data-p="newyear_' + (+e.year) + '" style="grid-column:1/-1;border-color:rgba(214,90,70,.55);background:linear-gradient(120deg,rgba(150,40,30,.28),rgba(0,0,0,0) 70%)"><small>' + esc(e.kick) + esc(won) + '</small><h4>' + esc(e.title) + '</h4><p>' + esc(e.line) + '</p><span>' + esc(e.go) + ' →</span></a>';
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
    graphP = Promise.all([root.MantraTLGraph ? Promise.resolve() : H.load('/report/hub/timeline-graph.js?v=20261125-el2').catch(function () { }), flagsJson(), root.MantraNatal ? Promise.resolve() : H.load('/report/natal-table.js?v=20261124-plain').catch(function () { }),
      // 2026-11-23: /report/ 화면(story.js 가 허브를 끼워 넣음)은 hub/index.html 의 십신 문안·신호 색 모듈을 싣지 않아 시기 카드 제목·설명이 비었다 → 없으면 여기서 싣는다
      root.MantraTenGodLuck ? Promise.resolve() : H.load('/ten-god-luck.js?v=20261120-tg').catch(function () { }), root.MantraSamjae ? Promise.resolve() : H.load('/samjae-copy.js?v=20261124-sj').catch(function () { }), root.MantraSignalColors ? Promise.resolve() : H.load('/signal-colors.js?v=20261118-sw2').catch(function () { })]).then(function (r) {
      var F = root.MANTRA_FLAGS || {}, f = r[1] || {}, lc = F.luckCycle === true || f.luckCycle === true, ef = F.elementFlow === true || f.elementFlow === true;
      // 운 분석 층(2026-11-18, 만세력 운세 흐름과 같은 계산): 외부 환경·전환·상하위(luckEnv) · 오행 겹쳐 보기(luckOverlay) · 십성 작용(tenGodRoles)
      // 시대 흐름(삼원구운·원회운세·오운육기)은 2026-11-20부터 타임라인에서 빼고 만세력 운세 흐름의 시대 흐름 카드에만 둔다(개인 인생 흐름에 집중)
      var on = function (k) { return F[k] === true || f[k] === true; }, lv = { luckEnv: on('luckEnv'), luckOverlay: on('luckOverlay'), tenGodRoles: on('tenGodRoles') }, LV_V = '?v=20261124-sec';
      var need = [].concat(lv.luckOverlay ? ['/luck-overlay.js'] : [], lv.tenGodRoles || lv.luckEnv ? ['/ten-god-roles.js'] : [], lv.luckEnv ? ['/luck-env.js'] : [], ['/amhap.js', '/element-strategy.js', '/luck-layers-view.js']);   // 암합·오행 전략(2026-11-20, 만세력과 같은 공용 모듈)
      var seq = function (list) { return list.reduce(function (pr, u) { return pr.then(function () { return H.load(u + LV_V).catch(function () { }); }); }, Promise.resolve()); };
      // 원국 한눈에 보기(2026-11-20, 만세력 원국 탭과 같은 natal-overview.js): 격국 판정(gyeok-structure.js)을 함께 읽는다. 스위치 없이 늘 보인다
      var ovNeed = [].concat(root.MantraGyeokStructure ? [] : ['/gyeok-structure.js'], root.MantraAmhap ? [] : ['/amhap.js'], root.MantraElementStrategy ? [] : ['/element-strategy.js'], root.MantraNatalOverview ? [] : ['/natal-overview.js']);
      return Promise.all([lc && !root.MantraLuckCycle ? H.load('/luck-cycle.js?v=20261118-ls').catch(function () { }) : Promise.resolve(), root.MantraLuckView ? Promise.resolve() : seq(need), seq(ovNeed)]).then(function () { return { lc: lc && !!root.MantraLuckCycle, ef: ef, lv: root.MantraLuckView ? lv : null, ow: f.overlayWeights || null }; });
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
    // 2026-11-23: 화면 용어 풀이가 없으면 상세풀이 용어 사전(term-notes-data.js, 만세력 사전 명리 240개)의 쉬운 뜻을 쓴다
    var TND = function (w) { var d = root.MantraTermNotesData && root.MantraTermNotesData[w]; return d ? (d.e ? d.e.replace(/^["“]|["”]$/g, '') + ' — ' : '') + d.p : ''; };
    var tip = function (w) { var t = O.TERMS[w] || TL_TERMS[w] || TND(w); return t ? '<span class="tip" tabindex="0" role="button" aria-label="' + esc(w + ': ' + t) + '" data-tip="' + esc(t) + '">' + esc(w) + '</span>' : esc(w); };
    var gzc = function (gz) { gz = String(gz || ''); if (gz.length !== 2) return esc(gz); var si = M.STEM_K.indexOf(gz[0]), bi = M.BR_K.indexOf(gz[1]); if (si < 0) si = M.STEM.indexOf(gz[0]); if (bi < 0) bi = M.BR.indexOf(gz[1]); if (si < 0 || bi < 0) return esc(gz); return '<i class="tq-gzc" style="color:' + EL_COL[M.stemEl(si)] + '">' + esc(gz[0]) + '</i><i class="tq-gzc" style="color:' + EL_COL[M.BR_EL[bi]] + '">' + esc(gz[1]) + '</i>'; }; // 2026-11-16: 간지 글자를 오행 원색으로
    var KEYC = function (it) { return 'k-' + (it.tg ? 'tg-' + esc(it.tg.gkey || 'na') : 'pre'); };
    var TGN = function (it) { return (it.tg && it.tg.label) || ''; };
    // 분야 점수는 분야마다 분포가 달라(재물은 좁게, 직업은 넓게) 같은 숫자가 다른 등급이 된다(engine.js DOMAIN_SCORE_THRESHOLDS).
    // 숫자를 나란히 보여 주면 "직업 34 무난 · 재물 45 다소 낮음"처럼 앞뒤가 안 맞아 보여서, 막대 길이와 표시는 등급 기준으로 맞춘다.
    var BAND_W = { '낮음': 16, '다소 낮음': 34, '무난': 55, '높음': 76, '매우 높음': 94 };
    function fieldBars(it) {
      var f = it.fields || {}, names = { money: '재물', career: '직업', love: '애정·인연' };
      return '<div class="tq-fs">' + ['money', 'career', 'love'].filter(function (k) { return f[k]; }).map(function (k) { var v = f[k], w = BAND_W[v.band] || Math.max(2, Math.min(100, v.score)); return '<div class="tq-f"><span>' + names[k] + '</span><div class="tq-fb" role="img" aria-label="' + names[k] + ' ' + esc(v.band) + '"><i style="width:' + w + '%"></i></div><b><small>' + esc(v.band) + '</small></b></div>'; }).join('') + '</div>';
    }
    function detail(it, title, lvl) { // 한 시기의 상세 카드(십신·분야 점수) + 근거 보기
      var ov = it.overlays && (it.overlays.volatility || it.overlays.defense) ? '<p class="tq-ov">' + (it.overlays.volatility ? '<i>변화 신호</i>' : '') + (it.overlays.defense ? '<i>부담 신호</i>' : '') + '</p>' : '';
      var open = st.ev === lvl + ':' + (it.idx != null ? it.idx : it.year != null ? it.year : it.month);
      // 십신 문안(ten-god-luck.js): 시기 첫 문장(제목)·설명·할 일·함정. 십신 이름과 뜻은 작은 글씨로 함께 둔다(2026-11-20, 옛 6분류 문안 대신)
      var TGM = root.MantraTenGodLuck, tg = it.tg || {}, cp = TGM && tg.label ? TGM.copy(tg.label, lvl) : null;
      // 문안은 "올해는…", "이번 달은…"으로 쓰여 있다. 지금이 아닌 해·달을 눌렀을 때는 "이 해", "이 달"로 바꿔 읽히게 한다.
      if (cp && !(it.isNow || it.isCurrent)) { var rel = function (t) { return String(t || '').replace(/올해도/g, '이 해에도').replace(/올해/g, '이 해').replace(/이번 달/g, '이 달'); }; cp = { hook: rel(cp.hook), body: rel(cp.body), do: rel(cp.do), trap: rel(cp.trap) }; }
      var qk = qkHtml(it, lvl, cp);   // 2026-11-18 한눈에 보기(핵심·큰 운과·바뀌는 점·2년 흐름·해 볼 것·조심할 것)
      var head = cp
        ? '<h3>' + esc(cp.hook) + '<small>' + esc(tg.label) + ' · ' + esc(tg.meaning) + '</small></h3>' + qk + '<p class="tq-copy">' + esc(cp.body) + '</p>' + (qk ? '' : '<ul class="tq-copy-l"><li><b>해 볼 것</b>' + esc(cp.do) + '</li><li><b>조심할 것</b>' + esc(cp.trap) + '</li></ul>')
        : '<h3>' + esc(tg.label) + '<small>' + esc(tg.meaning || '') + '</small></h3>' + qk;
      return '<article class="tq-card u-' + lvl + ' ' + KEYC(it) + (cp ? ' has-copy' : '') + '"><p class="tq-ct">' + esc(title) + '</p>' + head + themeHtml(it, lvl) + '<p class="tq-rule"><b>십신</b> ' + esc(tg.line || '') + '</p>' + ov + (TG && it._ref ? domHtml(it, lvl) : fieldBars(it)) +
        (root.MantraLuckGrade && it.scores.fit != null ? '<p class="tq-sc">등급 ' + root.MantraLuckGrade.flow(it.scores.fit).n + '</p>' : it.condition ? '<p class="tq-sc">상태 ' + esc(it.condition) + '</p>' : '')   /* 2026-11-24: 흐름 점수·운의 세기·변화 신호 숫자는 타임라인에서 숨김(계산 근거 보호) */ + ovFig(it, lvl) + lvHtml(it, lvl, (TG && it._ref ? structHtml(it, lvl) : '') + (lvl === 'seun' && LV ? pairHtml(it.year) : '')) +
        '<div class="tq-card-acts"><button type="button" class="tq-lnk" data-ev="' + lvl + '" aria-expanded="' + open + '">' + (open ? '근거 닫기' : '자세한 근거 보기') + '</button><a class="tq-lnk" href="#/go?to=future" data-track="timeline_topic_click" data-p="detail_' + lvl + '">이 시기 상세 풀이 →</a></div>' +
        (open ? '<div class="tq-evbox">' + TL.evidenceHtml(TL.evidence(M, ch, it), { secret: true }) + '</div>' : '') + '</article>';
    }
    /* ── 그래프 지표(2026-11-12, 만세력 운세 흐름 탭과 같은 기준): 전체 흐름 · 연애 · 재물 · 건강 · 사고수 · 직업·가족 세부.
          막대 높이 = 고른 지표 점수(0~100), 막대 색·위 글자 = 신호 등급(좋음·무난·조심), 아래 작은 글자 = 그 시기의 성격(6분류).
          계산은 timeline-graph.js(엔진 값 그대로). 모듈을 못 불러오면 예전처럼 흐름 점수·십성 묶음 색으로 그린다. ── */
    var TG = root.MantraTLGraph || null;
    var metric = function () { return TG ? st.metric : 'flow'; };
    var mName = function () { return TG ? TG.NAME[metric()] : '전체 흐름'; };
    var valOf = function (it) { var r = it && it._ref, v = TG && r ? TG.value(M, ch, r.p, r.level, metric()) : null; return v || { v: pct(it.scores.fit), sig: null, tags: [], summary: '' }; };
    // 오행 색(2026-11-25): 전체 흐름 그래프의 막대 색 = 그 시기에 두드러지는 오행(길흉 아님). 테마별 색은 그릴 때 고른다(안개 테마는 밝은 색)
    var LTm = function () { return root.MantraLuckTheme; }, ELD = ['#46C27E', '#F2604F', '#EDBB3A', '#C9CED9', '#6A8FEA'], ELL = ['#16A34A', '#DC2626', '#CA8A04', '#94A3B8', '#2F55B8'];
    var elC = function (e) { return (document.documentElement.classList.contains('theme-mist') ? ELL : ELD)[e]; };
    // 분야 지표(인연·재물·직업·건강, 2026-11-25)도 같은 오행 색 — 범례·카드 말만 그 분야로(LTm().legendFor·readDomain). 등급(좋음·무난·조심)은 카드·한 줄 결론의 보조
    var domEl = function () { var T = LTm(), m = metric(); return !!(T && m !== 'flow' && T.readDomain && T.DOMAIN && T.DOMAIN[m]); };
    var useEl = function (v) { return (metric() === 'flow' || domEl()) && v && v.el != null && !!LTm(); };
    var elChip = function (e) { return '<i class="tq-elb" style="color:' + elC(e) + '">' + LTm().EL_H[e] + '</i>'; };
    var elLegend = function () { if (domEl()) { var G = LTm().legendFor(metric()), A = G[0].area; return '<p class="tq-elleg">' + G.map(function (g) { return '<span><i style="background:' + elC(g.el) + '"></i><b>' + g.hanja + ' ' + g.name + '</b> ' + esc(g.words.join('·')) + '</span>'; }).join('') + '<small>' + esc(mName()) + ' 그래프 · 막대 색 = 그 시기에 두드러지는 기운을 ' + esc(A) + ' 쪽 말로 푼 것(길흉 아님) · 막대 높이 = ' + esc(mName()) + ' 점수 · 막대를 누르면 ' + esc(A) + '에서 이 기운을 어떻게 쓰면 좋을지 보여요</small></p>'; } return LTm() ? '<p class="tq-elleg">' + LTm().LEGEND.map(function (g) { return '<span><i style="background:' + elC(g.el) + '"></i><b>' + g.hanja + ' ' + g.name + '</b> ' + g.words.slice(0, 2).join('·') + '</span>'; }).join('') + '<small>막대 색 = 그 시기에 두드러지는 기운(길흉 아님) · 막대 높이 = 흐름 점수 · 막대를 누르면 이 기운을 어떻게 쓰면 좋을지 보여요</small></p>' : ''; };
    // 고른 시기 카드의 오행 테마(만세력 운세 흐름 상세와 같은 공용 계산)
    var themeHtml = function (it, lvl) {
      var T = LTm(), r0 = it && it._ref, dm = domEl(); if (!T || !r0 || (metric() !== 'flow' && !dm)) return '';
      var r; try { r = dm ? T.readDomain(M, ch, r0.p, lvl, metric(), { score: valOf(it).v, name: mName() + (/운$/.test(mName()) ? '' : '운'), grade: valOf(it).sig ? valOf(it).sig.k : null }) : T.read(M, ch, r0.p, lvl); } catch (e) { return ''; } if (!r) return '';
      var li = function (a) { return a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join(''); };
      return '<div class="tq-elth" style="--ec:' + elC(r.el) + '"><p class="tq-elth-h"><b>' + r.hanja + ' ' + r.elName + '</b> ' + (r.area ? esc(r.area) + '에서 두드러지는 기운' : '이 시기에 두드러지는 기운') + ' <span>' + esc(r.words.join(' · ')) + '</span></p><p class="tq-elth-s">' + esc(r.summary) + '</p>' +
        '<div class="tq-elth-g"><div><b>내 원국과의 작용</b><ul>' + li(r.interact) + '</ul></div><div><b>' + (r.area ? esc(r.area) + ' 쪽 추천·활용 방향' : '추천 활동·활용 방향') + '</b><ul>' + li(r.recommend) + '</ul></div>' + (r.caution.length ? '<div><b>주의할 점</b><ul>' + li(r.caution) + '</ul></div>' : '') + '</div>' +
        '<p class="tq-sub">' + (r.area ? esc(r.basis.filter(function (t) { return /점\(막대 높이/.test(t); }).join(' · ')) + (r.basis.some(function (t) { return /점\(막대 높이/.test(t); }) ? '. ' : '') : '') + '색은 그 시기에 두드러지는 기운이고 길흉이 아니에요.' + (r.area ? ' 좋음·무난·조심은 아래 분야 칸의 보조 표시예요.' : '') + '</p></div>';
    };
    var sgChip = function (sg) { return sg ? '<i class="tq-sgb" style="background:' + sg.c + ';color:' + sg.t + '">' + sg.n + '</i>' : ''; };
    function metricBar(compact) {
      if (!TG) return '';
      if (compact) return '<div class="tq-metric compact" role="group" aria-label="그래프 지표"><div class="tq-mchips">' + TG.METRICS.map(function (x) { return '<button type="button" class="tq-mchip' + (metric() === x[0] ? ' on' : '') + '" data-metric="' + x[0] + '" aria-pressed="' + (metric() === x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div></div>';
      var m = metric(), btn = function (x, suf) { return '<button type="button" class="tq-mchip' + (m === x[0] ? ' on' : '') + '" data-metric="' + x[0] + '" aria-pressed="' + (m === x[0]) + '">' + esc(x[1]) + (suf || '') + '</button>'; };
      var note = TG.NOTE[m] || TG.NOTE.sub;
      var legendTxt = (m !== 'flow' && domEl() ? '막대 색 = 그 시기에 두드러지는 오행(길흉 아님, ' + LTm().DOMAIN[m].area + ' 쪽 말은 위 범례) · 좋음·무난·조심은 ' + mName() + ' 점수 등급(보조, 막대를 눌러 보는 카드·위 한 줄 결론에 표시)' : m === 'flow' ? (LTm() ? '막대 색 = 그 시기에 두드러지는 오행(길흉 아님) · 좋음·무난·조심은 점수 등급(보조, 막대를 눌러 보는 카드·위 한 줄 결론에 표시)' : '색 = 이 시기가 나에게 얼마나 유리한가(흐름 점수 기준)') : '색 = 이 사주의 평소 수준보다 얼마나 좋은가' + (m === 'accident' ? '(사고수는 낮을수록 좋음)' : '')) + ' · 막대 높이 = ' + mName() + ' 점수(0~100) · 막대 아래 작은 글자 = 그 시기 천간의 십신(일간 기준)';
      return '<div class="tq-metric" role="group" aria-label="그래프 지표"><p class="tq-mh"><b>그래프 지표</b><span>인생 전체·대운·해·달 그래프에 함께 적용돼요</span></p>' +
        '<div class="tq-mchips">' + TG.METRICS.map(function (x) { return btn(x); }).join('') + '</div>' +
        '<p class="tq-sub">' + esc(note) + '</p>' + (m === 'flow' || domEl() ? elLegend() : '') +
        '<details class="tq-how"><summary>그래프 보는 법</summary><p class="tq-sgleg">' + ((m === 'flow' && LTm()) || domEl() ? '<small>보조 표시(점수 등급) </small>' : '') + TG.SIG.map(function (g) { return sgChip(g); }).join('') + '</p><p class="tq-sub">' + esc(legendTxt) + '</p></details></div>';
    }
    /* ── 단위 머리띠(2026-11-23): 대운·세운·월운을 헷갈리지 않게 그래프마다 단위(10년·1년·1달)·비유·색을 다르게 하고,
          세 단위가 겹쳐 있는 눈금자(10년 ▸ 1년 ▸ 1달)에 지금 보는 단위와 그 시기를 표시한다. 값은 이미 계산된 대운·해·달 목록 그대로. ── */
    var UNIT = { daeun: { k: '10년', n: '대운', p: '인생의 계절', d: '10년마다 바뀌는 큰 환경이에요. 막대 하나가 10년이에요.' },
      seun: { k: '1년', n: '세운', p: '그해의 날씨', d: '대운(계절) 안에서 해마다 바뀌는 분위기예요. 막대 하나가 1년이에요.' },
      wolun: { k: '1달', n: '월운', p: '이번 달의 기온', d: '한 해 안에서 달마다 바뀌는 흐름이에요(절기 기준). 막대 하나가 한 달이에요.' } };
    function unitHead(u, ctx) {
      var U = UNIT[u], dd = ctx && ctx.d || real.filter(function (x) { return x.idx === st.d; })[0] || cur, yy = ctx && ctx.y || st.y, mm = ctx && ctx.m != null ? ctx.m : st.m != null ? st.m : (yy === nowY ? new Date(now + 9 * 3600e3).getUTCMonth() + 1 : null);
      var step = function (k, label, val) { return '<li class="u-' + k + (k === u ? ' on' : '') + '"' + (k === u ? ' aria-current="true"' : '') + '><b>' + label + '</b><span>' + esc(val || '—') + '</span></li>'; };
      return '<div class="tq-unit-h"><p class="tq-unit-t"><i class="tq-unit-k">' + U.k + '</i><b>' + tip(U.n) + ' · ' + esc(U.p) + '</b></p><p class="tq-unit-d">' + esc(U.d) + '</p>' +
        '<ol class="tq-ruler" aria-label="운의 단위: 10년 안에 1년, 1년 안에 1달">' + step('daeun', '10년 · 대운', dd ? dd.ganzhi + ' ' + dd.startYear + '~' + dd.endYear : '') + step('seun', '1년 · 세운', yy + '년') + step('wolun', '1달 · 월운', mm ? mm + '월' : '') + '</ol></div>';
    }
    function unitWrap(u, inner, ctx) { return '<section class="tq-unit u-' + u + '">' + unitHead(u, ctx) + unitLine(u, ctx) + inner + '</section>'; }
    // 그래프 위 한 줄 결론(2026-11-23): 지금 시기의 단계와 가장 좋은·조심할 때를 먼저 말한다. 값은 그래프와 같은 valOf(고른 지표).
    var gradeOf = function (it) { var v = it ? valOf(it) : null; return v ? { v: v.v, n: v.sig ? v.sig.n : (v.v >= 58 ? '좋음' : v.v >= 43 ? '무난' : '조심'), k: v.sig ? v.sig.k : '' } : null; };
    var gTag = function (g) { return g ? '<b class="tq-g tq-g-' + esc(g.k || (g.n === '좋음' ? 'good' : g.n === '조심' ? 'care' : 'ok')) + '">' + esc(g.n) + '</b>' : ''; };
    function bestWorst(list, label) {
      var sc = list.map(function (it) { return { it: it, g: gradeOf(it) }; }).filter(function (x) { return x.g; }), acc = metric() === 'accident';
      if (sc.length < 2) return '';
      sc.sort(function (a, b) { return acc ? a.g.v - b.g.v : b.g.v - a.g.v; });
      var hi = sc[0], lo = sc[sc.length - 1];
      var ie = function (w) { var c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '이에요' : '예요'; }, lw = label(lo.it);
      return hi.g.v === lo.g.v ? '' : ' 가장 힘이 실리는 때는 <b>' + esc(label(hi.it)) + '</b>, ' + (lo.g.n === '조심' ? '가장 조심할 때는' : '상대적으로 가장 약한 때는') + ' <b>' + esc(lw) + '</b>' + ie(lw) + '.';
    }
    function unitLine(u, ctx) {
      try {
        if (u === 'daeun') {
          var c0 = real.filter(function (x) { return x.isCurrent; })[0], nx = c0 ? real.filter(function (x) { return x.idx === c0.idx + 1; })[0] : null, gc = gradeOf(c0), gn = gradeOf(nx);
          if (!c0 || !gc) return '';
          return '<p class="tq-unit-line">지금은 <b>만 ' + c0.startAge + '~' + c0.endAge + '세 ' + esc(c0.ganzhi) + ' 대운</b>, 흐름은 ' + gTag(gc) + '이에요.' + (nx && gn ? ' ' + nx.startYear + '년부터 다음 10년은 ' + gTag(gn) + '이에요.' : '') + bestWorst(real.filter(function (x) { return x.startAge < 80; }), function (it) { return '만 ' + it.startAge + '~' + it.endAge + '세'; }) + '</p>';
        }
        if (u === 'seun') {
          var dd = ctx && ctx.d, ys = dd ? years(dd.startYear) : years(blockStart(st.y)), yi = ys.filter(function (x) { return x.year === st.y; })[0], gy = gradeOf(yi);
          if (!gy) return '';
          return '<p class="tq-unit-line">' + st.y + '년은 ' + gTag(gy) + '이에요.' + bestWorst(ys, function (it) { return it.year + '년'; }).replace(' 가장 힘이', ' 이 10년 안에서 가장 힘이') + '</p>';
        }
        if (u === 'wolun') {
          var ms = months(st.y), mi = ms.filter(function (x) { return st.m != null ? x.month === st.m : x.isNow; })[0], gm = gradeOf(mi);
          return '<p class="tq-unit-line">' + (mi && gm ? (st.m != null ? st.m + '월' : '이번 달') + '은 ' + gTag(gm) + '이에요.' : st.y + '년의 달별 흐름이에요.') + bestWorst(ms, function (it) { return it.month + '월'; }).replace(' 가장 힘이', ' 이 해 안에서 가장 힘이') + '</p>';
        }
      } catch (e) { }
      return '';
    }
    /* ── 맨 위: 한눈에 보는 나(2026-11-23) — 명리를 몰라도 읽히는 다섯 줄. 나는 · 지금 10년 · 올해 · 이번 달 · 오늘.
          문장은 이미 화면에 쓰는 문안(일주 카드·십신 문안 TenGodLuck.copy·오늘의 일진)에서 첫 줄만 가져온다. ── */
    function glanceHtml() {
      var TGM = root.MantraTenGodLuck, first = function (t) { var m = String(t || '').match(/^[^.!?]+[.!?]/); return (m ? m[0] : String(t || '')).trim(); };
      var hook = function (it, lvl) { var tg = it && it.tg, c = TGM && tg && tg.label ? TGM.copy(tg.label, lvl) : null; return c ? { h: c.hook, d: c.do } : null; };
      var row = function (k, u, when, g, h, d, href) { return '<li class="tq-gl-r u-' + u + '"><i class="tq-unit-k">' + k + '</i><div><p class="tq-gl-w">' + when + (g ? ' ' + gTag(g) : '') + '</p>' + (h ? '<p class="tq-gl-h">' + esc(h) + '</p>' : '') + (d ? '<p class="tq-gl-d">해 볼 것 · ' + esc(d) + '</p>' : '') + '</div>' + (href ? '<a class="tq-gl-go" href="' + href + '"' + (/^#tq-/.test(href) ? ' data-z="' + href.slice(4) + '"' : '') + ' aria-label="자세히">›</a>' : '') + '</li>'; };
      var me = first(jc && jc.trait || ig && ig.line || S5.strength || '').replace(/합니다.$/, '해요.').replace(/됩니다.$/, '돼요.').replace(/있습니다.$/, '있어요.').replace(/없습니다.$/, '없어요.').replace(/([가-힣])입니다.$/, function (m, c) { return c + ((c.charCodeAt(0) - 0xAC00) % 28 ? '이에요.' : '예요.'); });   // 다른 줄과 같은 해요체
      var c0 = real.filter(function (x) { return x.isCurrent; })[0] || cur, yi = yearItem(nowY), mi = months(nowY).filter(function (x) { return x.isNow; })[0];
      var hd = hook(c0, 'daeun'), hy = hook(yi, 'seun'), hm = hook(mi, 'wolun'), td = null;
      if (!PREVIEW && H.Saju && H.Saju.todayData) { try { td = H.Saju.todayData(ch); } catch (e) { td = null; } }
      return '<ol class="tq-glance">' +
        (me ? '<li class="tq-gl-r tq-gl-me"><i class="tq-unit-k">나</i><div><p class="tq-gl-w">' + esc(ju) + '일주로 태어난 나</p><p class="tq-gl-h">' + esc(me) + '</p></div><a class="tq-gl-go" href="#tq-birth" data-z="birth" aria-label="태어난 순간 보기">›</a></li>' : '') +
        (c0 ? row('10년', 'daeun', '지금 10년 · 만 ' + c0.startAge + '~' + c0.endAge + '세 (' + c0.startYear + '~' + c0.endYear + ')', gradeOf(c0), hd && hd.h, '', '#tq-flow') : '') +
        (yi ? row('1년', 'seun', '올해 · ' + nowY + '년', gradeOf(yi), hy && hy.h, hy && hy.d, '#tq-now') : '') +
        (mi ? row('1달', 'wolun', '이번 달 · ' + mi.month + '월', gradeOf(mi), hm && hm.h, '', '#tq-now') : '') +
        (td ? '<li class="tq-gl-r u-day"><i class="tq-unit-k">오늘</i><div><p class="tq-gl-w">오늘 · ' + esc(td.gradeDay || (td.cond ? td.cond + '의 날' : '')) + '</p><p class="tq-gl-h">' + esc(td.line || '') + '</p></div><a class="tq-gl-go" href="#/today" aria-label="일진 캘린더">›</a></li>' : '') +
        '</ol><p class="tq-sub">좋음 · 무난 · 조심은 내 사주에 얼마나 잘 맞는 시기인지예요. 아래로 내려가면 10년(대운) ▸ 1년(세운) ▸ 1달(월운) 순서로 자세히 볼 수 있어요.</p>';
    }
    // 처음 한 번만 보이는 '이 화면 읽는 법'(닫으면 이 기기에서 다시 안 보임)
    var GUIDE_KEY = 'mt_tl_guide_v1', guideSeen = true; try { guideSeen = localStorage.getItem(GUIDE_KEY) === '1'; } catch (e) { guideSeen = true; }
    function guideHtml() {
      if (PREVIEW || guideSeen) return '';
      return '<aside class="tq-guide" id="tqGuide" role="note"><b>이 화면 읽는 법</b><ol><li><b>한눈에 보는 나</b>에서 나와 지금 시기를 먼저 보세요.</li><li>그래프는 <span class="u-daeun"><i class="tq-unit-k">10년</i></span> 대운 ▸ <span class="u-seun"><i class="tq-unit-k">1년</i></span> 세운 ▸ <span class="u-wolun"><i class="tq-unit-k">1달</i></span> 월운 순서로, 큰 흐름 안에 작은 흐름이 들어 있어요.</li><li>밑줄 친 용어는 누르면 뜻이 나와요. 궁금한 주제는 아래 카드에서 깊게 읽어요.</li></ol><button type="button" class="tq-guide-x" data-guide-x>알겠어요</button></aside>';
    }
    function barChart(items, o) { // 막대 그래프: 버튼 하나가 막대 하나. 높이 = 고른 지표 점수, 색·위 글자 = 신호등 단계, 아래 글자 = 십신(천간 기준)
      return '<div class="tq-chart ' + (o.cls || '') + '" role="group" aria-label="' + esc(o.label) + '">' + items.map(function (it, i) {
        if (it.pre) return '<span class="tq-bar pre" aria-label="' + esc(it.startAge + '~' + it.endAge + '세 대운 전') + '"><b>—</b><u></u><span>' + esc(it.startAge) + '세</span><small>대운 전</small></span>';
        var vv = valOf(it), sc = vv.v, sg = vv.sig, sel = o.sel(it), now = o.now(it), sj = o.sj ? o.sj(it) : null, E = useEl(vv) ? vv.el : null;
        return '<button type="button" class="tq-bar ' + KEYC(it) + (sg || E != null ? ' sg' : '') + (sel ? ' sel' : '') + (now ? ' now' : '') + (sj ? ' sjy' : '') + '" ' + o.attr(it) + (E != null ? ' style="--bc:' + elC(E) + '"' : sg ? ' style="--bc:' + sg.c + '"' : '') + ' aria-pressed="' + sel + '" aria-label="' + esc(o.name(it) + ', ' + mName() + ' ' + sc + (E != null ? ' ' + LTm().EL_K[E] + ' 기운' : '') + (sg ? ' ' + sg.n : '') + ', ' + TGN(it) + (now ? ', 지금' : '') + (sj ? ', 삼재 ' + sj.stage : '')) + '"><b>' + sc + (E != null ? elChip(E) : sgChip(sg)) + '</b><u><i style="height:' + sc + '%"></i></u><span>' + esc(o.top(it)) + '</span><small>' + gzc(o.sub(it)) + '</small><em>' + esc(TGN(it)) + '</em>' + (sj ? '<q class="tq-sjq" title="' + esc(sj.stage) + '">' + esc(sj.stage[0]) + '</q>' : '') + (now ? '<s>지금</s>' : '') + '</button>';
      }).join('') + '</div>';
    }
    // "운은 어떻게 작동하나요?" — 만세력 운세 흐름 탭의 자동차 비유. 지금의 대운·세운·월운·일진을 그대로 넣는다(timeline-graph.js nowChain)
    function carHtml() {
      if (!TG || !TG.nowChain || PREVIEW) return '';
      var c; try { c = TG.nowChain(M, ch, now); } catch (e) { return ''; }
      var IC = { car: '車', road: '路', weather: '天', signal: '月', pin: '日' };
      var items = c.items.map(function (x) { return '<li><i aria-hidden="true">' + IC[x.k] + '</i><div><p><b>' + tip(x.name) + '</b> <span>= ' + esc(x.role) + '</span></p><p class="tq-sub">' + esc(x.desc) + '</p>' + (x.now ? '<p class="tq-car-now">지금: <b>' + esc(x.now) + '</b></p>' : '') + '</div></li>'; }).join('');
      return '<details class="tq-car"><summary><b>운은 어떻게 작동하나요?</b> <span>자동차로 쉽게 보기</span></summary>' +
        '<p class="tq-car-line">' + esc(c.line) + '</p><ol class="tq-car-stack">' + items + '</ol>' +
        '<p class="tq-sub">운은 한 가지로 정해지지 않아요. 같은 자동차라도 어떤 도로를 달리는지, 날씨와 노면이 어떤지에 따라 주행이 달라지듯, 사주도 원국 위에 대운·세운·월운·일진이 겹쳐 지금의 흐름을 만들어요. 비가 온다고 반드시 사고가 나는 것이 아니듯, 어떤 운이 들어왔다고 특정한 일이 꼭 생기는 것은 아니에요.</p>' +
        '<div class="tq-car-keys"><p><b>그래프 글자는 세 가지를 함께 보여 줘요</b></p><ul>' +
        '<li><b>어떤 기운이 들어오나</b> 십신(비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인) <span>— 막대 아래 작은 글자, 그 운 천간 기준</span></li>' +
        '<li><b>변화와 부담은 얼마나</b> 변화 신호 · 부담 신호 <span>— 날씨 변화가 크거나, 조심해서 운전할 때</span></li>' +
        '<li><b>나에게 얼마나 잘 맞나</b> 좋음 · 무난 · 조심 <span>— 막대 위 색 이름표</span></li></ul>' +
        '<p><b>점수는 이렇게 읽어요</b></p><ul><li><b>흐름 점수</b> 지금의 자동차와 주행 환경이 얼마나 잘 맞는지(50이 보통, 높을수록 잘 맞음)</li><li><b>인연·재물·직업 점수</b> 그 분야가 이 사주의 평소 수준보다 얼마나 좋은지 — 사건이나 결과를 예측하지 않는 참고 지표예요</li></ul></div></details>';
    }
    // 인생 전체(태어난 해부터 90년) 연도별 막대 — 대운 구간은 배경 띠, 해를 누르면 그 해의 세운·월운이 열린다
    /* 삼재 보조 지표(2026-11-24): 만세력 운세 흐름 탭과 같은 문장(공용 samjae-copy.js)·같은 계산(엔진 getSamjae, 입춘 기준 연지).
       막대 색·높이·신호 등급과 별개로, 남보라 빗금 띠와 들·눌·날 꼬리표로만 그린다. */
    var SJ = function () { return root.MantraSamjae || null; };
    var sjAt = function (Y) { var S = SJ(); if (S) return S.at(M, ch.pillars.year.b, Y); try { var s = M.getSamjae(ch.pillars.year.b, Y); return s && s.active ? s : null; } catch (e) { return null; } };
    var sjLegend = function () { return '<p class="tq-sjleg"><i></i><b data-mt="1">빗금 · 들/눌/날 = 삼재 3년</b> <span>띠 기준 전통 참고 보조 지표 · 막대 색·점수와 별개</span></p>'; };
    function sjLife(data, L0, step, T0, H0, B0) {
      var s = '<defs><pattern id="tqSjh" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" class="tq-sjfill"/><line x1="0" y1="0" x2="0" y2="5" class="tq-sjline"/></pattern></defs>';
      data.forEach(function (q, i) {
        var sj = sjAt(q.year); if (!sj) return;
        var x = L0 + i * step;
        s += '<rect x="' + x + '" y="' + T0 + '" width="' + step + '" height="' + (H0 - T0 - B0) + '" fill="url(#tqSjh)"><title>' + esc(q.year + '년 ' + sj.stage + ' (삼재 · 전통 참고, 점수 미반영)') + '</title></rect>';
        s += '<rect x="' + (x + 0.5) + '" y="' + (H0 - B0 + 1) + '" width="' + (step - 1) + '" height="4" rx="1" class="tq-sjmark"/>';
      });
      return s;
    }
    // 앞으로 10년 아래 삼재 카드: 내 띠의 삼재 3년(고른 해가 삼재가 아니면 다음 3년), 몇 번째 해인지, 그 단계의 생활 조심 장면, 접힌 설명
    function sjCard(Y) {
      var S = SJ(); if (!S) { var s0 = sjAt(Y); return s0 ? '<p class="tq-sj"><b>' + Y + '년 삼재 · ' + esc(s0.stage) + '</b> <span>전통 민속 참고 신호이며 흐름 점수에는 넣지 않아요.</span></p>' : ''; }
      var c = S.cycle(M, ch.pillars.year.b, Y); if (!c || c.pos < 0) return '';   // 삼재인 해에만 띄운다(2026-11-24)
      var gOf = function (y) { var it = yearItem(y); return it ? gradeOf(it) : null; };
      var steps = c.years.map(function (q, i) { var g = gOf(q.year); return '<button type="button" class="tq-sjs' + (i === c.pos ? ' on' : '') + '" data-y="' + q.year + '"><span><b>' + q.year + '년</b> ' + esc(q.br) + '년' + (q.year === nowY ? ' <em>올해</em>' : '') + '</span><strong>' + esc(q.stage) + '</strong><small>' + esc(q.nick) + (g ? ' · ' + esc(mName()) + ' ' + esc(g.n) : '') + '</small></button>'; }).join('');
      var cur = c.pos >= 0 ? c.years[c.pos] : null, g = gOf(Y);
      var head = cur ? '<b>' + Y + '년은 삼재 3년 중 ' + (c.pos + 1) + '번째 해, ' + esc(cur.stage) + '(' + esc(cur.nick) + ')</b>예요.' + (g ? ' 이 해의 ' + esc(mName()) + ' ' + g.v + '(' + gTag(g) + ')은 삼재로 깎은 값이 아니라 사주와 운의 관계로만 계산한 값이에요.' : '')
        : '<b>' + Y + '년은 삼재가 아니에요.</b> 다음 삼재는 ' + c.start + '~' + (c.start + 2) + '년(' + c.gap + '년 뒤)이고, 그다음은 ' + c.next + '~' + (c.next + 2) + '년이에요.';
      var why = '<p>' + esc(S.WHAT) + ' ' + esc(c.group || '') + '는 ' + c.years.map(function (q) { return esc(q.br); }).join('·') + '년이 삼재예요.</p><ul>' + c.years.map(function (q) { return '<li><b>' + esc(q.stage) + '(' + esc(q.nick) + ')</b> · ' + esc(q.tip) + '</li>'; }).join('') + '</ul><p class="tq-sub">' + esc(S.NOTE) + ' 띠는 입춘 기준 연지(' + esc(M.BR_K[ch.pillars.year.b]) + '년생)로 계산해요.</p>';
      return ('<div class="tq-sjc sg-skip"><p class="tq-sjc-h"><i>삼재</i><b>' + esc(c.group || '') + '</b><span>사주(입춘) 기준 ' + esc(M.BR_K[ch.pillars.year.b]) + '년생 · 전통 참고 · 점수 미반영</span></p><div class="tq-sjsteps">' + steps + '</div><p class="tq-sjc-t">' + head + '</p>' + (cur ? '<p class="tq-sjc-tip">' + esc(cur.tip) + '</p>' : '') + '<details class="tq-sjc-more"><summary>삼재가 뭔가요? · 들삼재·눌삼재·날삼재 읽는 법</summary>' + why + '</details></div>').replace(/<(b|strong)>/g, '<$1 data-mt="1">');   // 안개 테마 글자 색칠(theme-mist.js tone: '삼재'를 나쁨 빨강으로 칠함)에서 빼서 조심 신호색과 섞이지 않게
    }
    function lifeHtml() {
      if (!TG) return '';
      var data; try { data = TG.life(M, ch, metric(), 90); } catch (e) { return ''; }
      if (!data.length) return '';
      var dEl = function (d) { var g = String(d.ganzhi || ''), si = M.STEM_K.indexOf(g[0]); if (si < 0) si = M.STEM.indexOf(g[0]); return si < 0 ? '#8a8f9c' : EL_COL[M.stemEl(si)]; };
      var n = data.length, step = 8, L0 = 30, R0 = 8, T0 = 14, B0 = 30, H0 = 170, W = L0 + R0 + n * step, y = function (v) { return T0 + (100 - v) / 100 * (H0 - T0 - B0); };
      var s = '<svg class="tq-lifesvg" viewBox="0 0 ' + W + ' ' + H0 + '" width="' + W + '" height="' + H0 + '" role="img" aria-label="' + esc('인생 전체 ' + mName() + ' 그래프') + '">';
      real.forEach(function (d, i) { var a = Math.max(0, d.startYear - data[0].year), b = Math.min(n, d.endYear - data[0].year + 1); if (b <= a) return; s += '<rect x="' + (L0 + a * step) + '" y="' + T0 + '" width="' + ((b - a) * step) + '" height="' + (H0 - T0 - B0) + '" fill="' + dEl(d) + '" fill-opacity="' + (i % 2 ? '.07' : '.11') + '"/><text x="' + (L0 + a * step + 3) + '" y="' + (T0 + 10) + '" font-size="9.5" font-weight="700" fill="' + dEl(d) + '">' + esc(d.ganzhi) + '</text>'; });
      s += sjLife(data, L0, step, T0, H0, B0);
      [0, 50, 100].forEach(function (g) { s += '<line x1="' + L0 + '" x2="' + (W - R0) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="rgba(255,255,255,' + (g === 50 ? '.18' : '.08') + ')" ' + (g === 50 ? 'stroke-dasharray="3 3"' : '') + '/><text x="' + (L0 - 5) + '" y="' + (y(g) + 3) + '" font-size="9" text-anchor="end" fill="#8a8f9c">' + g + '</text>'; });
      data.forEach(function (q, i) {
        var x = L0 + i * step, h = Math.max(2, y(0) - y(q.v)), on = q.year === st.y, isNow = q.year === nowY;
        s += '<rect data-y="' + q.year + '" x="' + (x + 1) + '" y="' + (y(0) - h) + '" width="' + (step - 2) + '" height="' + h + '" rx="1.5" fill="' + (useEl(q) ? elC(q.el) : q.sig.c) + '"' + (on ? ' stroke="#fff" stroke-width="1.5"' : '') + ' style="cursor:pointer"><title>' + esc(q.year + '년 ' + q.gz + ' · ' + q.age + '세 · ' + mName() + ' ' + q.v + (useEl(q) ? ' · ' + LTm().EL_K[q.el] + ' 기운' : '') + ' · ' + q.sig.n) + '</title></rect>';
        if (isNow) s += '<text x="' + (x + step / 2) + '" y="' + (y(0) - h - 4) + '" font-size="9" text-anchor="middle" fill="#cdb27a">지금</text>';
        if (q.age % 10 === 0) s += '<text x="' + (x + step / 2) + '" y="' + (H0 - B0 + 13) + '" font-size="9" text-anchor="middle" fill="#8a8f9c">' + q.age + '세</text><text x="' + (x + step / 2) + '" y="' + (H0 - B0 + 24) + '" font-size="8" text-anchor="middle" fill="#6c7180">' + q.year + '</text>';
      });
      s += '</svg>';
      return '<details class="tq-fold tq-lifef"><summary>태어나서 90년까지, 해마다 한 막대로 펼쳐 보기</summary><h4 class="tq-h4">인생 전체 · ' + esc(mName()) + '</h4><p class="tq-unit-key"><span class="u-seun"><i>1년</i>가는 막대 하나 = 한 해(세운)</span><span class="u-daeun"><i>10년</i>뒤의 넓은 띠 = 대운 한 구간</span></p><p class="tq-sub">태어난 해부터 90년을 한 해씩 그렸어요. 막대를 누르면 아래 "지금과 앞으로"에서 그 해가 열려요.</p>' + sjLegend() + '<div class="tq-life">' + s + '</div></details>';
    }
    // 30년 장기 구간(대운 3개 묶음)·2년 천간 오행 구간 — luck-cycle.js(사전 문구 조합, 스위치 luckCycle)
    var LCm = function () { return GF && GF.lc && root.MantraLuckCycle ? root.MantraLuckCycle : null; }, lcSpans = null;
    // 운 분석 층(luck-layers-view.js): 시기 카드 아래 ①외부 환경 ②내 사주 반응 ③상위·하위 운 ④영역 + 지장간, 대운 그래프 위 시대 흐름
    var LV = GF && GF.lv && root.MantraLuckView ? root.MantraLuckView : null;
    if (LV && !DOC.getElementById('lv-css')) { var lvs = DOC.createElement('style'); lvs.id = 'lv-css'; lvs.textContent = LV.CSS + '#hub .lv-sec{--lv-line:rgba(205,178,122,.3)}#hub .lv-era{color:#1b1b1b}#hub .lv-nf{--lv-halo:#e9eef0}#hub .lv-qr.good .lv-qt,#hub .lv-qr.good b,#hub .lv-qr.good .lv-qm,html:not(.theme-mist) #hub .lv-qr.good .lv-qt,html:not(.theme-mist) #hub .lv-qr.good b,html:not(.theme-mist) #hub .lv-qr.good .lv-qm{color:#178a4a!important}#hub .lv-qr.bad .lv-qt,#hub .lv-qr.bad b,#hub .lv-qr.bad .lv-qm,html:not(.theme-mist) #hub .lv-qr.bad .lv-qt,html:not(.theme-mist) #hub .lv-qr.bad b,html:not(.theme-mist) #hub .lv-qr.bad .lv-qm{color:#c9412d!important}html:not(.theme-mist) #hub .lv-qr.good .lv-qt,html:not(.theme-mist) #hub .lv-qr.good b,html:not(.theme-mist) #hub .lv-qr.good .lv-qm{color:#5fd68d!important}html:not(.theme-mist) #hub .lv-qr.bad .lv-qt,html:not(.theme-mist) #hub .lv-qr.bad b,html:not(.theme-mist) #hub .lv-qr.bad .lv-qm{color:#ff7a66!important}#hub .lv-up,#hub b.lv-up,#hub .lv-r.good,#hub .lv-d.good{color:#178a4a!important}#hub .lv-down,#hub b.lv-down,#hub .lv-r.bad,#hub .lv-d.bad{color:#c9412d!important}html:not(.theme-mist) #hub .lv-up,html:not(.theme-mist) #hub b.lv-up,html:not(.theme-mist) #hub .lv-r.good,html:not(.theme-mist) #hub .lv-d.good{color:#5fd68d!important}html:not(.theme-mist) #hub .lv-down,html:not(.theme-mist) #hub b.lv-down,html:not(.theme-mist) #hub .lv-r.bad,html:not(.theme-mist) #hub .lv-d.bad{color:#ff7a66!important}html:not(.theme-mist) #hub .lv-nf{--lv-halo:#17161d}html:not(.theme-mist) #hub .lv-et0{fill:#8fd19c}html:not(.theme-mist) #hub .lv-et1{fill:#f39a86}html:not(.theme-mist) #hub .lv-et2{fill:#ecc970}html:not(.theme-mist) #hub .lv-et3{fill:#dfe3ea}html:not(.theme-mist) #hub .lv-et4{fill:#8fb0ec}'; DOC.head.appendChild(lvs); }
    function lvHtml(it, lvl, extra) { extra = extra || ''; var h = ''; if (LV && it && it._ref && it._ref.p) { try { h = LV.card(M, ch, it._ref.p, lvl, { flags: GF.lv, esc: esc, secret: true, weights: GF.ow || undefined, noFigure: true }); } catch (e) { h = ''; } } if (!h) return extra; return '<details class="tq-fold tq-lvf"><summary>더 깊이 보기 · 운과 원국의 구조 · 오행·십성으로 본 이 시기</summary>' + extra + h + '</details>'; }   /* 구조·오행 흐름(structHtml)도 함께 접는다 */
    function pairOf(y) { var LC = LCm(); if (!LC) return null; try { return LC.seunPair(M, ch, y); } catch (e) { return null; } }
    function qkHtml(it, lvl, cp) {
      if (!LV || !LV.quick || !it || !it._ref || !it._ref.p) return '';
      var extra = [], pr = lvl === 'seun' ? pairOf(it.year) : null;
      if (pr) extra.push(['2년 흐름', esc(pr.hook) + ' <small class="tq-q-sm">' + pr.start + '~' + pr.end + '년 천간 ' + esc(M.EL_K[pr.el]) + '</small>', pr.tone === 'good' ? 'good' : pr.tone === 'bad' ? 'bad' : '']);
      var after = cp && cp.trap ? [['조심할 것', esc(cp.trap)]] : [];
      try { return LV.quick(M, ch, it._ref.p, lvl, { flags: GF.lv, esc: esc, secret: true, weights: GF.ow || undefined, extra: extra, todo: cp && cp.do, after: after }); } catch (e) { return ''; }
    }
    // 오행 겹쳐 보기 그림(만세력과 같은 그림): 시기 카드 안에 접지 않고 바로 보인다
    function ovFig(it, lvl) { if (!LV || !GF.lv.luckOverlay || !it || !it._ref || !it._ref.p) return ''; try { return LV.overlayFigure(M, ch, it._ref.p, lvl, { flags: GF.lv, esc: esc, secret: true, weights: GF.ow || undefined }); } catch (e) { return ''; } }
    // 뚜렷한 신호 자동 알림은 2026-11-20 사용자 요청으로 만세력에서만 띄운다(타임라인 알림 제거, luck-alerts.js 는 index.html 에서만 쓴다)
    // 2026-11-24: 판단 근거는 십성·통합 용신 이름만(점수 구성·비중·평균 같은 계산 값은 타임라인에서 숨김)
    var SAFE_BASIS = function (b) { return /^(십성|통합 용신)/.test(String(b || '')); };
    function lcSteps(r) { return '<ol class="tq-lc-steps"><li><b>오행의 특징</b>' + esc(r.steps.trait) + '</li><li><b>나에게 미치는 영향</b>' + esc(r.steps.impact) + '</li><li><b>추천 전략</b>' + esc(r.steps.strategy) + '</li></ol>' + (r.basis && r.basis.filter(SAFE_BASIS).length ? '<details class="tq-how"><summary>판단 근거 보기</summary><ul class="tq-lc-basis">' + r.basis.filter(SAFE_BASIS).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul><p class="tq-sub">미리 써 둔 문구를 이 사주의 계산값으로 골라 조합했어요(AI 미사용). 흐름 점수는 바꾸지 않아요.</p></details>' : ''); }
    // 장기 운세 요약(2026-11-18): 대운 3개를 하나의 오행·하나의 길흉으로 묶던 30년 구간 판정을 걷고, 대운마다의 흐름과 그 사이 변화를 순서대로 보여 준다(luck-cycle.js longSummary)
    function spanHtml() {
      var LC = LCm(); if (!LC || !LC.longSummary) return '';
      try { var r = LC.longSummary(M, ch); if (!r || !r.rows.length) return '';
        return '<div class="tq-lc"><p class="tq-lc-k">장기 운세 요약 · 대운 ' + r.rows.length + '개를 순서대로</p><ol class="tq-lc-steps">' + r.rows.map(function (x) { return '<li' + (x.tense === 'now' ? ' style="font-weight:700"' : '') + '><b>' + (x.tense === 'now' ? '지금 · ' : x.tense === 'past' ? '지난 · ' : '다음 · ') + esc(x.gz) + '</b>' + esc(x.text) + '</li>'; }).join('') + '</ol>' + (r.shifts.length ? '<p class="tq-sub">' + r.shifts.map(function (t) { return esc(t.text); }).join('<br>') + '</p>' : '') + '<p class="tq-sub">' + esc(r.note) + '</p></div>';
      } catch (e) { return ''; }
    }
    function pairHtml(y) {
      var LC = LCm(); if (!LC) return '';
      // 2026-11-18: 천간 오행 2년 구간 — 핵심·특징·나에게·해 볼 것 한 줄씩, 전체 문장과 판단 근거는 접는다(세운 카드 '더 깊이 보기' 안)
      try { var r = LC.seunPair(M, ch, y || st.y); if (!r) return '';
        var sent = function (t, n) { var m = String(t || '').match(/[^.!?]+[.!?]/g) || [String(t || '')]; return m.slice(0, n || 1).join(' ').trim(); };
        var yrs = (r.years || []).map(function (y) { return '<span class="tq-q-yr' + (y.year === st.y ? ' on' : '') + '">' + y.year + ' ' + esc(y.gz || '') + '</span>'; }).join('');
        var row = function (k, v) { return v ? '<p class="tq-q-r"><span class="tq-q-k">' + k + '</span><span>' + v + '</span></p>' : ''; };
        return '<div class="tq-lc tq-q"><p class="tq-lc-k">천간 오행 2년 구간 ' + esc(r.start + '~' + r.end + '년') + '</p>' + (yrs ? '<p class="tq-q-yrs">' + yrs + '</p>' : '') +
          row('핵심', '<b>' + esc(r.hook) + '</b>') + row('특징', esc(sent(r.steps.trait))) + row('나에게', esc(sent(r.steps.impact, 2))) + row('해 볼 것', esc(r.steps.strategy)) +
          '<details class="tq-fold"><summary>자세히 보기 · 2년 전체 풀이와 판단 근거</summary>' + lcSteps(r) + '</details></div>'; } catch (e) { return ''; }
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
      var chip = function (q) { return '<button type="button" class="tq-ychip' + (q.year === st.y ? ' on' : '') + '" data-y="' + q.year + '" style="--bc:' + (useEl(q) ? elC(q.el) : q.sig.c) + '">' + q.year + ' ' + esc(q.gz) + ' <b>' + q.v + '</b></button>'; };
      var sj = TG.samjae(M, ch, st.y);
      return '<div class="tq-ten"><p class="tq-mh"><b>앞으로 10년 · ' + esc(mName()) + '</b><span>' + nowY + '~' + (nowY + 9) + '년</span></p>' +
        '<p class="tq-trow"><span>좋은 해</span>' + (t.good.length ? t.good.map(chip).join('') : '<em>뚜렷이 좋은 해가 없어요</em>') + '</p>' +
        '<p class="tq-trow"><span>조심할 해</span>' + (t.bad.length ? t.bad.map(chip).join('') : '<em>뚜렷이 조심할 해가 없어요</em>') + '</p></div>' +
        sjCard(st.y, sj);
    }
    var TGM0 = root.MantraTenGodLuck, legend = TGM0 ? '<ul class="tq-leg" aria-label="십신">' + TGM0.TG.map(function (n) { return '<li class="k-tg-' + TGM0.GKEY[TGM0.groupOf(n)] + '"><i></i><b>' + n + '</b><span>' + esc(TGM0.MEAN[n]) + '</span></li>'; }).join('') + '</ul>' : '';

    /* ── 영역 1: 태어난 순간 ── */
    function birthHtml() {
      var order = ['hour', 'day', 'month', 'year'], lab = { hour: '시주', day: '일주', month: '월주', year: '연주' };
      // 2026-11-13: 원국을 만세력처럼 자세히 — 주제별 풀이(/report/v2/)와 같은 공용 표(report/natal-table.js)
      var cols = root.MantraNatal ? '<div class="mt-natal">' + root.MantraNatal.html(M, Object.assign({}, ch, { hourKnown: true }), { tip: tip }) + '</div>' : '';
      // 원국 한눈에 보기(2026-11-20): 신강신약·통근·용신/기신·격국 — 만세력 원국 탭과 같은 natal-overview.js
      var ovw = ''; try { var NO = root.MantraNatalOverview; if (NO) { NO.injectCss(DOC); ovw = NO.html(M, ch, { esc: esc, term: function (k) { return tip(k); } }); } } catch (e) { ovw = ''; }
      if (ovw) cols += '<div class="tq-box tq-ov" style="display:block"><h4>원국 한눈에 보기 <small style="font-weight:400;opacity:.65">강약·뿌리·필요한 기운·격을 한 장에</small></h4>' + ovw + '</div>';
      var pc = (ch.weights && ch.weights.pct) || [], gr = (ch.weights && ch.weights.groups) || [], mi = 0; for (var i = 1; i < gr.length; i++) if (gr[i] > gr[mi]) mi = i;
      var els = G.elements ? '<div class="tq-box"><h4>오행 · 십성</h4><div class="tq-els">' + M.EL_K.map(function (e, i) { var v = Math.round(pc[i] || 0); return '<div class="tq-el"><span style="color:' + EL_COL[i] + '">' + EL_HJ[i] + ' ' + e + '</span><div class="tq-eb"><i style="width:' + Math.max(2, Math.min(100, v * 2)) + '%;background:' + EL_COL[i] + '"></i></div><b>' + v + '%</b></div>'; }).join('') + '</div>' +
        '<div class="tq-gr">' + GROUPS5.map(function (n, i) { var v = Math.round(gr[i] || 0); return '<span class="' + (i === mi ? 'big' : '') + '">' + esc(n) + ' <b>' + v + '%</b></span>'; }).join('') + '</div><p class="tq-sub">가장 큰 비중은 <b>' + GROUPS5[mi] + '</b>이에요(' + GROUP_MEAN[GROUPS5[mi]] + '). ' + tip('십성') + '은 나(일간)와 다른 글자의 관계를 다섯 묶음으로 나눈 것이에요: ' + GROUPS5.map(function (n) { return n + ' ' + GROUP_MEAN[n]; }).join(' · ') + '.</p></div>' : '';
      var z = ch.ziwei, zw = '';
      if (G.ziwei) {
        if (z) { var mp = z.palaces.filter(function (p) { return p.name === '명궁'; })[0], sp = z.palaces.filter(function (p) { return p.shen; })[0]; zw = '<div class="tq-box"><h4>자미두수 명반 요약</h4><dl class="tq-dl"><div><dt>명궁 주성</dt><dd>' + esc(mp && mp.main.length ? mp.main.join(' · ') : '주성 없음') + '</dd></div><div><dt>오행국</dt><dd>' + esc(z.gukEl) + ' (' + z.guk + '국)</dd></div><div><dt>명주 · 신주</dt><dd>' + esc(z.mingju + ' · ' + z.shinju) + '</dd></div>' + (sp ? '<div><dt>신궁</dt><dd>' + esc(sp.name) + '</dd></div>' : '') + '</dl><p class="tq-sub">삼합파 기준 명반입니다. 생일은 음력으로 바꿔 계산하며, 태어난 시각이 정확할수록 잘 맞습니다.</p></div>'; }
        else zw = '<div class="tq-box"><h4>자미두수 명반 요약</h4><p class="tq-sub">태어난 시각을 모르면 명반을 세울 수 없습니다.</p></div>';
      }
      // 원국 바로 아래 오행 흐름(2026-11-18, 만세력 오행·강약 탭과 같은 그림·판정 — luck-layers-view.js natalFlowFigure)
      var nf = ''; try { nf = LV ? LV.natalFlowFigure(M, ch, { esc: esc }) : ''; } catch (e) { nf = ''; }
      var nfBox = nf ? '<div class="tq-box tq-nf"><h4>내 사주의 기운 흐름 <small>오행이 서로 돕고(생) 누르는(극) 모습</small></h4>' + nf + '</div>' : '';   // 일간·일주와 오행·십성 아래에 둔다(2026-11-18)
      // 2026-11-23: 명리를 모르는 사용자를 위해 전문 표(원국표·원국 한눈에·오행·십성·기운 흐름·자미두수)는 '명리 자세히 보기'로 접는다. 일간·일주 소개는 그대로 보인다.
      var proOpen = false; try { proOpen = sessionStorage.getItem('mt_tl_pro') === '1'; } catch (e) { }
      var hourNote = ch.hourKnown ? '' : '<p class="tq-sub">출생 시각을 몰라 시주(時柱) 없이 계산했습니다. 일간·일주는 날짜 기준이라 그대로입니다.</p>';
      return hourNote +
        '<div class="tq-two tq-two-me"><div class="tq-box tq-me"><h4>' + tip('일간') + ' · ' + tip('일주') + '</h4><p class="tq-ju"><b>' + esc(M.STEM[day.s] + M.BR[day.b]) + '</b><span>' + esc(ju) + '일주</span></p>' + (ig ? '<p class="tq-line">' + esc(String(ig.line).replace(/\n/g, ' ')) + '</p>' : '') + (jc ? '<p class="tq-trait">' + esc(jc.trait) + '</p>' : S5.strength ? '<p class="tq-trait">' + esc(S5.strength) + '</p>' : '') +
        '<a class="tq-lnk" href="#/awaken?replay=1&to=timeline" data-track="fortune_content_click" data-p="ilju_replay">일주 각성 영상 다시 보기 →</a></div></div>' +
        '<details class="tq-pro" data-pro' + (proOpen ? ' open' : '') + '><summary><b>명리 자세히 보기</b><span>원국표 · 오행 · 십성 · 기운 흐름' + (G.ziwei ? ' · 자미두수' : '') + ' — 명리를 아는 분을 위한 표예요</span></summary>' + cols + els + nfBox + (G.ziwei && TG && TG.ziwei ? zwHtml() : zw) + '</details>';
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
      return '<div class="tq-box tq-zw"><h4>자미두수 쉽게 보기 <small>자미두수 용어 옆 괄호에 쉬운 풀이를 붙였어요</small></h4><div class="tq-zw-rows">' + z.rows.map(function (r) { return '<div class="tq-zw-row"><span>' + esc(r.t) + '</span><p>' + r.b + (r.s ? '<br><small>' + esc(r.s) + '</small>' : '') + '</p></div>'; }).join('') + '</div>' +
        '<details class="tq-fold"><summary>10년·해마다 자미두수 흐름 보기</summary>' +
        '<h4 class="tq-h4">10년 대한 흐름 <small>막대 = 그 10년 동안 명궁 역할을 하는 칸의 강도</small></h4>' + dh + '<p class="tq-sub">막대 하나가 10년이에요. 금색 배경이 지금 걷는 대한이며, 막대가 높을수록 그 10년은 해당 영역을 중심으로 힘이 실린다고 읽어요.</p>' +
        '<h4 class="tq-h4">유년 흐름 <small>앞으로 10년</small></h4>' + lv + '<p class="tq-sub">막대는 그해 명궁 역할을 하는 칸의 강도, 아래 글자는 그해 화록(초록)·화기(빨강)가 떨어지는 영역이에요. 점수는 좋고 나쁨의 판정이 아니라 내 명반 안에서 비교한 상대 지표예요. 삼합파 기준이며 태어난 시각이 정확할수록 잘 맞아요.</p></details></div>';
    }

    /* ── 영역 2: 인생 전체의 흐름 ── */
    var LIFE_AFTER = '';
    function flowHtml() {
      var graph = G.daeun ? barChart(dl, { label: '대운 흐름 그래프', cls: 'daeun', attr: function (it) { return 'data-d="' + it.idx + '"'; }, sel: function (it) { return st.d === it.idx; }, now: function (it) { return !!it.isCurrent; }, name: function (it) { return it.startAge + '~' + it.endAge + '세 ' + it.ganzhi + ' 대운'; }, top: function (it) { return it.startAge + '세'; }, sub: function (it) { return it.ganzhi; } })
        : '<div class="tq-chips">' + real.map(function (it) { return '<button type="button" class="tq-chip ' + KEYC(it) + (st.d === it.idx ? ' sel' : '') + '" data-d="' + it.idx + '"><b>' + it.startAge + '~' + it.endAge + '세</b><span>' + esc(it.ganzhi) + ' · ' + esc(TGN(it)) + '</span></button>'; }).join('') + '</div>';
      var sel = real.filter(function (x) { return x.idx === st.d; })[0], body = '';
      if (sel) {
        body = detail(sel, '대운 ' + sel.ganzhi + ' · ' + sel.startYear + '~' + sel.endYear + '년 (' + sel.startAge + '~' + sel.endAge + '세)', 'daeun');
        if (G.seun) {
          var ys = years(sel.startYear);
          body += unitWrap('seun', '<h4 class="tq-h4">' + esc(sel.ganzhi) + ' 대운 10년 안의 해</h4><p class="tq-sub">해를 누르면 아래 “지금과 앞으로”에서 그 해의 세운과 월운이 열립니다.</p>' + barChart(ys, { label: sel.ganzhi + ' 대운 안의 해별 흐름', cls: 'seun', attr: function (it) { return 'data-y="' + it.year + '"'; }, sel: function (it) { return st.y === it.year; }, now: function (it) { return !!it.isNow; }, name: function (it) { return it.year + '년 ' + it.ganzhi + ' 세운'; }, top: function (it) { return String(it.year).slice(2) + '년'; }, sub: function (it) { return it.age + '세'; }, sj: function (it) { return sjAt(it.year); } }) + (ys.some(function (it) { return sjAt(it.year); }) ? sjLegend() : ""), { d: sel });
        }
      }
      if (TG) return carHtml() + metricBar() + (function () { var lf = lifeHtml(); return LIFE_AFTER = lf, ''; })() + unitWrap('daeun', '<p class="tq-sub">지표: ' + esc(mName()) + ' · 막대가 높을수록 ' + (metric() === 'accident' ? '주의 신호가 많은 시기예요(사고수는 낮을수록 좋음)' : '나에게 유리한 시기예요') + '. ' + ((metric() === 'flow' && LTm()) || domEl() ? '막대 색과 위 글자는 그 시기에 두드러지는 오행(길흉 아님' + (domEl() ? ', ' + LTm().DOMAIN[metric()].area + ' 쪽 뜻은 위 범례' : '') + ')' : '막대 위 글자는 좋고 나쁨 단계') + ', 아래 작은 글자는 그 시기의 성격이에요. 막대를 누르면 자세한 풀이가 열려요.</p>' + graph) + LIFE_AFTER + spanHtml() + body;
      return unitWrap('daeun', '<p class="tq-sub">막대가 높을수록 내 사주에 잘 맞는 시기예요(흐름 점수 0~100, 50이 보통). 색과 이름은 그 시기의 성격 6가지 중 하나예요. 막대를 누르면 자세한 풀이가 열려요.</p>' + graph + legend) + spanHtml() + body;
    }

    /* ── 영역 3: 지금과 앞으로 ── */
    function nowHtml() {
      var yi = yearItem(st.y), ms = months(st.y), isThis = st.y === nowY;
      var yr = '<div class="tq-yrnav"><button type="button" data-yy="-1" aria-label="이전 해"' + (st.y <= 1901 ? ' disabled' : '') + '>‹</button><h3>' + st.y + '년' + (isThis ? ' <small>올해</small>' : '') + '</h3><button type="button" data-yy="1" aria-label="다음 해"' + (st.y >= 2098 ? ' disabled' : '') + '>›</button></div>';
      var seun = yi ? detail(yi, '세운 ' + yi.ganzhi + ' · ' + yi.year + '년' + (yi.age != null ? ' (' + yi.age + '세)' : ''), 'seun') : '';
      var mon = G.wolun ? '<h4 class="tq-h4">' + st.y + '년 월별 흐름 (절기 기준)</h4>' + barChart(ms, { label: st.y + '년 월별 흐름', cls: 'wolun', attr: function (it) { return 'data-m="' + it.month + '"'; }, sel: function (it) { return st.m === it.month; }, now: function (it) { return !!it.isNow; }, name: function (it) { return st.y + '년 ' + it.month + '월 ' + it.ganzhi + ' 월운'; }, top: function (it) { return it.month + '월'; }, sub: function (it) { return it.ganzhi; } }) : '';
      var cm = st.m != null ? ms.filter(function (x) { return x.month === st.m; })[0] : null, monthCard = cm ? detail(cm, '월운 ' + cm.ganzhi + ' · ' + st.y + '년 ' + cm.month + '월 (' + cm.term + ' 이후)', 'wolun') : '';
      var dy = dOf(st.y);
      return (TG ? metricBar(true) + tenHtml() : '') + unitWrap('seun', yr + seun + (LV && LV.quick ? '' : pairHtml()), { d: dy }) +
        (mon ? unitWrap('wolun', mon + monthCard + '<p class="tq-sub">월운은 절기를 기준으로 하며, 1월 막대는 소한 이후입니다. 일별 흐름과 택일은 일진 캘린더에서 볼 수 있습니다.</p>', { d: dy }) : '<p class="tq-sub">일별 흐름과 택일은 일진 캘린더에서 볼 수 있습니다.</p>');
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
      if (!PREVIEW && H.Saju && H.Saju.todayData) { try { var t = H.Saju.todayData(ch), ph = t.tg || ''; today = '<a class="tq-today" href="#/today" data-track="fortune_content_click" data-p="today_card"><div class="ring" style="--p:' + t.score + '"><b>' + t.score + '</b></div><div><small>TODAY · 오늘의 일진 ' + esc(t.gz) + '日' + (ph ? ' · ' + esc(ph) : '') + '</small><h4>' + esc(t.gradeDay || t.cond + '의 날') + '</h4><p>' + esc(t.line || '') + '</p><span>일진 캘린더 열기 →</span></div></a>'; } catch (e) { } }
      var card = function (href, p, kick, title, line, go) { return '<a class="tq-fc" href="' + href + '" data-track="fortune_content_click" data-p="' + p + '"><small>' + kick + '</small><h4>' + title + '</h4><p>' + line + '</p><span>' + go + ' →</span></a>'; };
      var chip = function (f, label, p) { return '<a class="tq-fchip" href="#/today?f=' + f + '" data-track="fortune_content_click" data-p="' + p + '">' + label + '</a>'; };
      return today +
        '<div class="tq-fcs">' +
        card('#/today', 'calendar', 'CALENDAR · 무료', '일진 캘린더', '월운 그래프와 날짜별 일진, 내 일정에 맞는 날 고르기', '캘린더 열기') +
        card('#/tarot', 'tarot', 'FREE TAROT · 무료', '무료 타로', '마음속 질문 하나, 카드 한 장으로 가볍게 확인합니다', '카드 뽑기') +
        card('#/awaken?replay=1&to=timeline', 'ilju_replay', 'ILJU · 무료', '일주 각성 영상 다시 보기', esc(ju) + '일주 · 타고난 기질과 강점을 영상으로 다시 만납니다', '영상 보기') +
        // 신년운세(별도 연도 상품, /report/newyear/) 입구. 보이기·문구는 관리자 › 신년운세 › 공개 범위에서 정하고 /api/newyear/entry 로 받는다(nyEntryHtml).
        // 누르면 지금 사주를 넘겨 바로 풀이가 열린다(아래 [data-ny-go] 처리).
        (PREVIEW ? '' : '<div id="tqNy" style="display:contents">' + nyEntryHtml() + '</div>') +
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
    var secs = [{ id: 'glance', title: '한눈에 보는 나', sub: '명리를 몰라도 읽히는 다섯 줄 · 나와 지금 시기' }, { id: 'free', title: '오늘 · 무료 콘텐츠', sub: '오늘의 일진과 바로 볼 수 있는 무료 풀이' }].concat(TC.sections.filter(function (s) { return s.enabled !== false && s.id !== 'free' && s.id !== 'mine'; })).concat([{ id: 'mine', title: '내 정보', sub: '마이페이지 · 출생정보 관리' }]);
    var TNm = function (id, h) { return root.ReportV2 && root.ReportV2.TermNotes && (id === 'birth' || id === 'flow' || id === 'now') ? root.ReportV2.TermNotes.mark(h) : h; };
    var build = function (id) { return TNm(id, builders[id]()); };
    // 2026-11-24 홈 구성: 사람들이 먼저 궁금한 '지금'을 위로, 전문 표(태어난 순간)는 아래로. 켜고 끄기는 관리자 설정을 따른다
    var SEC_ORDER = ['glance', 'now', 'free', 'flow', 'themes', 'birth', 'mine'], SEC_NAME = { now: ['지금 나의 운', '올해 · 이번 달 — 지금 내게 오는 흐름'], free: ['오늘 무료로 보기', '오늘의 일진 · 무료 타로 · 일진 캘린더'], flow: ['인생의 큰 물줄기', '10년마다 바뀌는 계절(대운)과 그 안의 해'], themes: ['더 깊이 읽을 주제', '돈 · 일 · 인연… 궁금한 분야를 골라 펼쳐 보세요'], birth: ['태어난 순간의 명부', '원국표 · 오행 · 십성 — 명리를 아는 분을 위한 기록'] };
    secs = secs.map(function (x) { var nm2 = SEC_NAME[x.id]; return nm2 ? Object.assign({}, x, { title: nm2[0], sub: nm2[1] }) : x; }).sort(function (a, b) { var ia = SEC_ORDER.indexOf(a.id), ib = SEC_ORDER.indexOf(b.id); return (ia < 0 ? 50 : ia) - (ib < 0 ? 50 : ib); });
    var builders = { glance: glanceHtml, free: freeHtml, birth: birthHtml, flow: flowHtml, now: nowHtml, themes: themesHtml, mine: mineHtml };
    var heroBg = asset('archive'), pos = Q.assetFocus(cfg, 'archive', mobile);
    var html = '<div class="tq" id="tq"><header class="tq-hero" style="--hero:url(\'' + esc(heroBg) + '\');--pos:' + esc(pos) + '"><p class="kick">MANTRA · FATE TIMELINE</p><h1>운명의 타임라인</h1>' + (nm ? '<p class="tq-who">' + esc(A()) + '</p>' : '') + birthLine() + '<p class="tq-intro">' + esc(O.fill(TC.texts.intro, nm, cfg)) + '</p></header>' +
      '<nav class="tq-nav" id="tqNav" aria-label="타임라인 영역">' + secs.map(function (s, i) { return '<a href="#tq-' + s.id + '" data-z="' + s.id + '"><i>' + (i + 1) + '</i>' + esc(s.title) + '</a>'; }).join('') + (PREVIEW ? '' : '<a class="tq-edit" href="#/me" data-track="mypage_open" data-p="timeline_nav" aria-label="마이페이지">' + ME_ICON + ' 마이페이지</a>') + '</nav>' + guideHtml() +
      secs.map(function (s, i) { return '<section class="tq-sec" id="tq-' + s.id + '" data-z="' + s.id + '">' + (s.id === 'glance' && !PREVIEW ? avatarHtml() : '') + '<div class="tq-sech"><span>' + (i + 1) + '</span><div><h2>' + esc(s.title) + '</h2>' + (s.sub ? '<p>' + esc(s.sub) + '</p>' : '') + '</div></div><div class="tq-body" id="tqb-' + s.id + '">' + build(s.id) + '</div></section>'; }).join('') +
      '<footer class="tq-foot"><p class="dis">' + esc(TC.texts.notice) + '</p></footer></div>';
    var el = H.view(html);
    var swPaint = function (x) { if (root.MantraSignalColors && x) { try { root.MantraSignalColors.paint(x); } catch (e) { } } };   // 좋은 신호·주의할 신호 글자 색(signal-colors.js)
    swPaint(el);
    DOC.body.classList.add('tq-wide'); var prevClean = H.cleanup; H.cleanup = function () { DOC.body.classList.remove('tq-wide'); if (io) io.disconnect(); if (prevClean) prevClean(); };
    var root0 = $('#tq', el);
    if (!PREVIEW && H.Auth && H.Auth.badge) H.Auth.badge(root0);   // 1:1 문의 새 답변 표시(hub-me.js)
    if (!PREVIEW) loadNyEntry().then(function () { var s = $('#tqNy', root0); if (s && H.alive(ctx)) s.innerHTML = nyEntryHtml(); });   // 신년운세 입구 카드(관리자 설정)

    function redraw(id) { var b = $('#tqb-' + id, root0); if (b) { var y = root.scrollY; b.innerHTML = build(id); swPaint(b); root.scrollTo(0, y); } }
    root0.addEventListener('click', function (e) {
      var t = e.target, b;
      if ((b = t.closest('[data-ny-go]'))) {   // 신년운세로 지금 사주 넘기기(report/newyear/newyear-app.js 가 mt_ny_input 을 읽는다)
        var s = P.get();
        if (s) {
          var nb = { year: +s.year, month: +s.month, day: +s.day, calendar: s.calendar === 'lunar' ? 'lunar' : 'solar', gender: s.gender, hour: null };
          if (nb.calendar === 'lunar' && s.leap) nb.leap = true;
          if (!s.hourUnknown && s.hour != null && s.hour !== '') { nb.hour = +s.hour; nb.minute = +s.minute || 0; }
          try { sessionStorage.setItem('mt_ny_input', JSON.stringify({ birth: nb, year: +b.getAttribute('data-ny-go') })); } catch (er) { }
        }
        return;   // 링크 이동은 그대로(넘기기에 실패하면 신년운세 화면에서 입력)
      }
      if ((b = t.closest('[data-guide-x]'))) { try { localStorage.setItem(GUIDE_KEY, '1'); } catch (er) { } guideSeen = true; var gd = $('#tqGuide', root0); if (gd) gd.remove(); Ob.track('timeline_guide_close', {}); return; }
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
    root0.addEventListener('toggle', function (e) { if (e.target && e.target.matches && e.target.matches('[data-pro]')) { try { sessionStorage.setItem('mt_tl_pro', e.target.open ? '1' : '0'); } catch (er) { } if (e.target.open) Ob.track('timeline_pro_open', {}); } }, true);   // 명리 자세히 보기 펼침 기억(탭 세션)
    // 현재 보고 있는 영역을 상단 바로가기에 표시
    var io = null;
    if ('IntersectionObserver' in root) { io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { var nv = $('#tqNav', root0); $$('#tqNav a', root0).forEach(function (a) { var on = a.getAttribute('data-z') === x.target.getAttribute('data-z'); a.classList.toggle('on', on); if (on && nv && nv.scrollWidth > nv.clientWidth + 4) { try { nv.scrollTo({ left: Math.max(0, a.offsetLeft - 8), behavior: 'smooth' }); } catch (_) { nv.scrollLeft = Math.max(0, a.offsetLeft - 8); } } }); } }); }, { rootMargin: '-35% 0px -55% 0px' }); $$('.tq-sec', root0).forEach(function (s) { io.observe(s); }); }
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
