// 사주가 필요한 화면: 입력(필요할 때만) · 오늘의 운세 · 일주 각성 · MY 운명 홈.
// 계산은 전부 기존 엔진을 그대로 쓴다: Manse.compute / ilun / evaluateDomainLuck / careerLuckActivation / flowName·flowLabel, 일간·일주 소개는 /report/v2/intro-text.js, 일진 "그날 할 일"은 MantraCore.DAYMODE.
// 새로운 점수나 명리 판단은 만들지 않는다 — 여기서는 엔진 값을 화면 문장에 끼워 넣을 뿐이다.
(function (root) {
  'use strict';
  var H = root.Hub, P = H.profile, esc = H.esc, br = H.br, $ = H.$, DAYMODE = root.MantraCore.DAYMODE;
  var Saju = H.Saju = {};
  var CITIES = [['서울', 126.98], ['부산', 129.08], ['대구', 128.60], ['인천', 126.70], ['광주', 126.85], ['대전', 127.38], ['울산', 129.31], ['세종', 127.29], ['수원', 127.03], ['고양', 126.83], ['성남', 127.14], ['용인', 127.18], ['청주', 127.49], ['천안', 127.15], ['전주', 127.15], ['목포', 126.39], ['여수', 127.66], ['포항', 129.36], ['경주', 129.22], ['안동', 128.73], ['창원', 128.68], ['진주', 128.11], ['춘천', 127.73], ['강릉', 128.90], ['제주', 126.53]];
  var NEXT_NAME = { today: '월운 그래프 · 일진 캘린더', awaken: '나의 일주 각성', life: '내 인생의 흐름', deep: '심층 무빙툰', my: '나의 운명 이야기' };
  var EL_COL = ['#5E9E78', '#D0634A', '#BC9C62', '#AEB9C6', '#4A7AB5'];
  var GROUPS5 = ['비겁', '식상', '재성', '관성', '인성'];
  var POTENTIAL = { 비겁: '스스로 길을 여는 힘', 식상: '생각을 형태로 만드는 힘', 재성: '기회를 알아보는 힘', 관성: '사람들이 믿고 따르게 만드는 힘', 인성: '깊이 이해하고 꿰뚫는 힘' };
  var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  /* ───────── 오늘의 흐름 (엔진 값 읽기) ───────── */
  // 계산은 FreeCore.todayData(= 기존 엔진 값 읽기, 점수·단계 산식은 그대로)가 하고, 문장·행동·근거·다음 콘텐츠는 FreeCore.buildDaily 가 한 객체(DailyFortuneResult)로 묶는다.
  // 홈의 점수 줄과 #/today 가 이 객체 하나를 같이 쓴다. 같은 사람·같은 날은 localStorage 에 저장해 다시 열어도 같은 결과가 나온다.
  var FC = root.FreeCore;
  var cache = { ch: null, v: null };
  Saju.todayData = function (ch) {
    if (cache.ch === ch && cache.v) return cache.v;
    var v = FC.todayData(root.Manse, ch, Date.now(), DAYMODE); cache = { ch: ch, v: v }; return v;
  };
  var dailyMem = null;
  Saju.daily = function (ch) { // → Promise<DailyFortuneResult>
    var t = Saju.todayData(ch), day = t.y + '-' + t.mo + '-' + t.d, sig = P.sig(), key = 'mt_daily_v2';
    return H.freeContent().then(function (ov) {
      var ver = (ov && ov.version) || '', id = day + '|' + sig + '|' + ver;
      if (dailyMem && dailyMem.id === id) return dailyMem.r;
      try { var s = JSON.parse(localStorage.getItem(key) || 'null'); if (s && s.id === id) { dailyMem = s; return s.r; } } catch (e) { }
      var r = FC.buildDaily(t, { seed: sig, name: P.name(), overrides: ov }); r.line = t.line; r.todo = t.todo; r.meaning = t.meaning;
      dailyMem = { id: id, r: r }; try { localStorage.setItem(key, JSON.stringify(dailyMem)); } catch (e) { }
      return r;
    });
  };

  /* ───────── 입력 ───────── */
  var opts = function (a, b, sel, suf) { var h = ''; for (var i = a; i <= b; i++) h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + i + suf + '</option>'; return h; };
  function after(next) { // 입력을 마친 뒤 가는 곳
    if (next === 'today') return '#/today';
    if (next === 'life') return '#/go?to=life';
    if (next === 'deep') return '#/go?to=deep';
    if (next === 'my') return P.awakened() ? '#/timeline' : '#/awaken';
    return '#/awaken';
  }
  H.route('input', function (q, ctx) {
    var next = NEXT_NAME[q.next] ? q.next : 'my', has = P.has(), s = P.get() || {}, y = new Date().getFullYear();
    H.engine().catch(function () { }); // 미리 불러 둔다
    var sy = +s.year || 1990, sm = +s.month || 1, sd = +s.day || 1, g = s.gender === 'M' ? 'M' : s.gender === 'F' ? 'F' : '', minY = 1900;
    var el = H.view('<section class="hero" style="text-align:left;padding-bottom:0"><p class="kick">BIRTH</p><h1 class="h1">' + (q.next && NEXT_NAME[q.next] ? esc(NEXT_NAME[q.next]) + ' 콘텐츠를 보려면<br>태어난 순간이 필요해요' : '당신이 태어난<br>순간을 알려주세요') + '</h1><p class="sub">한 번만 입력하면 다른 콘텐츠에서도 그대로 쓰입니다.<br>입력한 정보는 이 기기 안에서만 계산되고 서버로 보내지 않습니다.</p></section>' +
      '<form class="form" id="sf" novalidate autocomplete="off">' +
      '<label class="f"><span>이름 (선택)</span><input type="text" name="name" maxlength="20" autocomplete="off" value="' + esc(s.name || '') + '"></label>' +
      '<div class="f seg" role="radiogroup" aria-label="성별"><span>성별</span><label><input type="radio" name="gender" value="F"' + (g === 'F' ? ' checked' : '') + '><i>여</i></label><label><input type="radio" name="gender" value="M"' + (g === 'M' ? ' checked' : '') + '><i>남</i></label></div>' +
      '<div class="f seg" role="radiogroup" aria-label="달력"><span>달력</span><label><input type="radio" name="calendar" value="solar"' + (s.calendar === 'lunar' ? '' : ' checked') + '><i>양력</i></label><label><input type="radio" name="calendar" value="lunar"' + (s.calendar === 'lunar' ? ' checked' : '') + '><i>음력</i></label><label class="leap" hidden><input type="checkbox" name="leap"' + (s.leap ? ' checked' : '') + '><i>윤달</i></label></div>' +
      '<div class="f row3"><span>생년월일</span><select name="year" aria-label="년">' + opts(minY, y, sy, '년') + '</select><select name="month" aria-label="월">' + opts(1, 12, sm, '월') + '</select><select name="day" aria-label="일">' + opts(1, 31, sd, '일') + '</select></div>' +
      '<div class="f"><span>태어난 시간</span><div class="inl"><input type="time" name="time" value="' + (s.hourUnknown || s.hour == null || s.hour === '' ? '' : ('0' + s.hour).slice(-2) + ':' + ('0' + (s.minute || 0)).slice(-2)) + '" aria-label="태어난 시간"><label class="chk"><input type="checkbox" name="unknown"' + (!has || s.hourUnknown || s.hour == null ? ' checked' : '') + '><i>시간을 몰라요</i></label></div></div>' +
      '<label class="f"><span>태어난 곳</span><select name="city">' + CITIES.map(function (c) { return '<option value="' + c[1] + '"' + (c[0] === (s.city || '서울') ? ' selected' : '') + '>' + c[0] + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span>합에 따른 오행 변화 적용</span><select name="combinationMode"><option value="auto"' + (s.combinationMode === 'off' ? '' : ' selected') + '>자동 적용</option><option value="off"' + (s.combinationMode === 'off' ? ' selected' : '') + '>미적용</option></select></label><label class="f"><span>조후와 궁성에 따른 보정</span><select name="climatePalaceMode"><option value="auto"' + (s.climatePalaceMode === 'off' ? '' : ' selected') + '>자동 적용</option><option value="off"' + (s.climatePalaceMode === 'off' ? ' selected' : '') + '>미적용</option></select></label><p class="fine">합의 성립 조건과 태어난 계절·글자의 자리를 살펴 오행 비중을 보정해요. 원국 글자는 그대로이며, 무빙툰도 같은 기준으로 풀이해요.</p>' +
      '<p class="msg err" id="sm" role="alert"></p><button type="submit" class="btn">' + (q.next === 'today' ? '내 운 캘린더 보기' : q.next === 'life' ? '내 인생 지도 펼치기' : '내 운명 이야기 시작') + '</button></form>');
    var f = $('#sf', el), msg = $('#sm', el), busy = false, submit = f.querySelector('[type=submit]'), submitLabel = submit.textContent;
    function fail(text, field) { msg.textContent = text; if (field) field.focus(); }
    function fixDays() {
      var limit = f.calendar.value === 'lunar' ? 30 : new Date(+f.year.value, +f.month.value, 0).getDate();
      var day = Math.min(+f.day.value || 1, limit);
      f.day.innerHTML = opts(1, limit, day, '일');
    }
    function fix() { f.leap.parentElement.hidden = f.calendar.value !== 'lunar'; f.time.disabled = f.unknown.checked; }
    f.addEventListener('change', function (e) { fix(); if (['year', 'month', 'calendar'].indexOf(e.target.name) >= 0) fixDays(); msg.textContent = ''; }); fix(); fixDays();
    f.addEventListener('focusin', function () { H.track('saju_input_start', { next: next }, true); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (busy) return; msg.textContent = '';
      if (!f.gender.value) { fail('성별을 선택해 주세요.', f.querySelector('[name=gender]')); return; }
      if (!f.unknown.checked && !/^\d\d:\d\d$/.test(f.time.value)) { fail('태어난 시간을 입력하거나 ‘시간을 몰라요’를 선택해 주세요.', f.time); return; }
      var t = f.time.value, hasT = !f.unknown.checked && /^\d\d:\d\d$/.test(t), city = CITIES.filter(function (c) { return String(c[1]) === f.city.value; })[0];
      var saved = { name: String(f.name.value || '').trim().slice(0, 20), gender: f.gender.value, calendar: f.calendar.value, leap: f.calendar.value === 'lunar' && f.leap.checked, year: +f.year.value, month: +f.month.value, day: +f.day.value, hour: hasT ? +t.slice(0, 2) : 12, minute: hasT ? +t.slice(3) : 0, hourUnknown: !hasT, city: city ? city[0] : '서울', lon: +f.city.value, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto', combinationMode:f.combinationMode.value, climatePalaceMode:f.climatePalaceMode.value };
      busy = true; submit.disabled = true; submit.textContent = '분석 준비 중…'; f.setAttribute('aria-busy', 'true');
      H.engine().then(function (M) {
        if (!H.alive(ctx)) return;
        try { M.compute(P.toInput(saved)); } catch (err) { msg.textContent = (err && err.message) || '입력을 확인해 주세요.'; return; }
        if (!P.save(saved)) { fail('정보를 저장하지 못했습니다. 브라우저의 사이트 저장 허용 여부와 저장 공간을 확인한 뒤 다시 시도해 주세요.'); return; }
        H.afterInput(); H.track('saju_input_complete', { next: next, hour_known: hasT ? 1 : 0 });
        H.replace(after(next)); // 입력 화면은 기록에 남기지 않는다(뒤로가기가 입력 폼으로 돌아가지 않게)
      }).catch(function () { if (H.alive(ctx)) msg.textContent = '분석 엔진을 불러오지 못했습니다. 다시 시도해 주세요.'; }).finally(function () { busy = false; submit.disabled = false; submit.textContent = submitLabel; f.removeAttribute('aria-busy'); });
    });
  });

  // 사주가 필요한 화면의 공통 시작: 정보가 없으면 입력으로, 있으면 엔진·소개 문구·계산 결과를 준비한다
  function needSaju(ctx, next, fn) {
    if (!P.has()) { H.replace('#/input?next=' + next); return; }
    H.view('<p class="pend">당신의 사주를 펼치는 중…</p>');
    H.sajuKit().then(function (kit) { return H.chart().then(function (ch) { return { kit: kit, ch: ch }; }); }).then(function (o) { if (H.alive(ctx)) fn(o.ch, o.kit); }).catch(function () { if (!H.alive(ctx)) return; H.view('<p class="pend">사주를 불러오지 못했습니다.<br><br><button type="button" class="btn ghost" id="rt">다시 시도</button></p>'); $('#rt').onclick = function () { H.render(); }; });
  }

  /* ───────── 오늘의 운세 ───────── */
  var FLD = [['money', '재물운', 'MONEY'], ['work', '일·사업운', 'WORK'], ['love', '연애운', 'LOVE'], ['health', '컨디션', 'BODY']];
  var tags = function (a) { return a.map(function (x) { return '<i>' + esc(String(x).trim()) + '</i>'; }).join(''); }; // 띄어쓰기를 지운 해시태그(#협력할사람에게연락하기)는 읽기 어려워 문장 그대로 칩으로 보여 준다
  var lis = function (a) { return '<ul class="dl">' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
  // Calendar presentation policy: suitability sets height.
  // 2026-11-20: 조심 = 만세력과 같은 신호 등급(/luck-grade.js: 흐름 점수 −12 이하). 부담 신호(defense)는 등급과 따로 '부담 점검'으로만 보인다.
  var CalendarPolicy = H.CalendarPolicy = {
    assess: function (ev) {
      var M = root.Manse, f = ev.flow, fit = ev.fitScore;
      var burden = f.overlays.defense.score;
      var LG = root.MantraLuckGrade, grade = LG ? LG.flow(fit, M) : { k: fit <= M.LUCK_CFG.condition.caution ? 'care' : fit >= M.LUCK_CFG.condition.tailwind ? 'good' : 'ok', n: fit <= M.LUCK_CFG.condition.caution ? '조심' : fit >= M.LUCK_CFG.condition.tailwind ? '좋음' : '무난' };
      var cautious = grade.k === 'care';
      return { score: clamp((fit + 100) / 2), fit: fit, burden: burden, cautious: cautious, grade: grade, key: cautious ? 'defense' : f.primaryFlow };
    }
  };
  // 일진 조심 신호(2026-11-22): 만세력 '지금의 운'과 같은 공용 계산(/luck-care.js). 선택한 날(기본 오늘) 지표마다 조심이면 무엇을 조심할지 한 줄씩. 전체 흐름 등급과 상관없이
  var CRP = null;
  // 일진 칸 오행 색(2026-11-25, /luck-element-theme.js — 만세력 일진 달력·운세 그래프와 같은 기준). 길흉이 아니며, 등급(조심·추천)은 칸 아래 글자·밑줄로 보조
  var ELD = ['#46C27E', '#F2604F', '#EDBB3A', '#C9CED9', '#6A8FEA'], ELL = ['#16A34A', '#DC2626', '#CA8A04', '#94A3B8', '#2F55B8'];
  function dayEl(x) { var T = root.MantraLuckTheme; if (!T || !x) return null; try { var m = T.mainEl(root.Manse, x); return m ? m.el : null; } catch (e) { return null; } }
  function elCol(e) { return (document.documentElement.classList.contains('theme-mist') ? ELL : ELD)[e]; }
  function careReady() {
    if (CRP) return CRP;
    var V = '?v=20261122-care';
    CRP = ['/luck-grade.js', '/health-body.js', '/accident-hint.js', '/luck-care.js'].reduce(function (pr, u) { return pr.then(function () { if (document.querySelector('script[src^="' + u + '"]')) return; return H.load(u + V).catch(function () { }); }); }, Promise.resolve()).then(function () { return root.MantraLuckCare || null; });
    return CRP;
  }
  function careBlock(M, ch, x, label) {
    var LC = root.MantraLuckCare; if (!LC || !x) return '';
    var hits = []; try { hits = LC.signals(M, ch, x, { names: { love: '인연운' } }); } catch (e) { return ''; }
    return '<div class="mc-care"><p class="mc-care-k">' + esc(label) + ' 일진 조심 신호</p>' + (hits.length ? '<ul>' + hits.map(function (h) { return '<li><b class="mc-care-c' + (h.strong ? ' strong' : '') + '">' + esc(h.name) + ' ' + h.v + '</b><span>' + esc(h.why) + '</span></li>'; }).join('') + '</ul><p class="dsub">' + esc(LC.NOTE) + '</p>' : '<p class="dsub">이 날 일진에서 조심 신호가 뜬 지표는 없습니다.</p>') + '</div>';
  }
  // 운 분석 층(2026-11-18): 만세력 일진 달력처럼 선택한 달(월운)·날(일진)에 한눈에 보기 + 오행 겹쳐 보기 — luck-layers-view.js
  var LVP = null, LVF = null;
  function lvReady() {
    if (LVP) return LVP;
    var LG = root.MantraLastGood, F = root.MANTRA_FLAGS || {};
    var fl = LG ? LG.load('/api/luck-flags', { timeout: 4000 }).catch(function () { return null; }) : Promise.resolve(null);
    LVP = Promise.resolve(fl).then(function (r) {
      var f = (r && (r.data || r.d || r)) || {}, on = function (k) { return F[k] === true || f[k] === true; };
      LVF = { flags: { luckEnv: on('luckEnv'), luckOverlay: on('luckOverlay'), tenGodRoles: on('tenGodRoles') }, ow: f.overlayWeights || null };
      if (!LVF.flags.luckEnv && !LVF.flags.luckOverlay) return null;
      var V = '?v=20261124-sec', need = [].concat(LVF.flags.luckOverlay ? ['/luck-overlay.js'] : [], ['/ten-god-roles.js'], LVF.flags.luckEnv ? ['/luck-env.js'] : [], ['/amhap.js', '/element-strategy.js', '/luck-layers-view.js']);   /* 암합·오행 전략(2026-11-20, 만세력과 같은 공용 모듈) */
      return need.reduce(function (pr, u) { return pr.then(function () { if (document.querySelector('script[src^="' + u + '"]')) return; return H.load(u + V).catch(function () { }); }); }, Promise.resolve()).then(function () {
        if (root.MantraLuckView && !document.getElementById('lv-css')) { var st = document.createElement('style'); st.id = 'lv-css'; st.textContent = root.MantraLuckView.CSS; document.head.appendChild(st); }
        return root.MantraLuckView || null;
      });
    }).catch(function () { return null; }).then(function (V) { if (!V) LVP = null; return V; });   /* 스위치가 꺼져 있었으면 다음에 다시 확인 */
    return LVP;
  }
  function lvBlock(ch, x, kind, title, todo, id) {
    var LV = root.MantraLuckView; if (!LV || !LVF || !x) return '';
    var q = '', fig = '';
    try { q = LV.quick(root.Manse, ch, x, kind, { flags: LVF.flags, esc: esc, secret: true, weights: LVF.ow || undefined, todo: todo || '' }); } catch (e) { q = ''; }
    try { fig = LV.overlayFigure(root.Manse, ch, x, kind, { flags: LVF.flags, esc: esc, secret: true, weights: LVF.ow || undefined }); } catch (e) { fig = ''; }
    var ext = ''; try { ext = LV.extras ? LV.extras(root.Manse, ch, x, kind, { esc: esc }) : ''; } catch (e) { ext = ''; }   /* 이 달·이 날의 암합·일 전략 */
    if (!q && !fig && !ext) return '';
    return '<section class="fortune-panel lv-cal"' + (id ? ' id="' + id + '"' : '') + '><p class="kick">' + (kind === 'wolun' ? 'MONTH · 월운' : 'DAY · 일진') + '</p><h2 class="lv-cal-h">' + esc(title) + '</h2>' + q + fig + ext + '</section>';
  }
  function calendar(ch, ctx) {
    var M = root.Manse, today = Saju.todayData(ch), y = today.y, m = today.mo, d = today.d, purpose = '', range = 30, weekday = 'all', generation = 0, searchY = y, searchM = m;
    // 2026-11-20: 월 막대·날짜 칸의 이름은 옛 6분류 대신 십신(엔진 stemTG). 색은 십성 묶음 색, 조심 등급(cautious)이면 붉은색.
    var picked = null, C = { draws: 0 }, TGK = { 비견: 'bg', 겁재: 'bg', 식신: 'ss', 상관: 'ss', 편재: 'jc', 정재: 'jc', 편관: 'gw', 정관: 'gw', 편인: 'is', 정인: 'is' }, names = { 'tg-bg': '비겁', 'tg-ss': '식상', 'tg-jc': '재성', 'tg-gw': '관성', 'tg-is': '인성', defense: '조심' };
    var fk = function (x) { return assess(x).cautious ? 'defense' : 'tg-' + (TGK[x.stemTG] || 'bg'); }, tgn = function (x) { return (x.stemTG || '') + (assess(x).cautious ? ' · 조심' : ''); };
    var key = function (yy,mm,dd) { return yy + '-' + ('0'+mm).slice(-2) + '-' + ('0'+dd).slice(-2); };
    var assess = function (x) { return CalendarPolicy.assess(x.ev); };
    var score = function (x) { return assess(x).score; };
    C.dayBlock = function (todo) { var days = M.ilun(ch, y, m), x = days[d - 1]; return x ? lvBlock(ch, x, 'ilun', m + '월 ' + d + '일 일진 ' + M.gzName(x), todo) : ''; };
    C.title = function () { return key(y,m,d) === key(today.y,today.mo,today.d) ? '오늘의 운 지수' : '선택한 날의 운 지수'; };
    C.refresh = function () {
      var gen = ++generation, td = FC.todayData(M,ch,Date.UTC(y,m-1,d,3),DAYMODE);
      H.freeContent().then(function (ov) {
        if (!H.alive(ctx) || gen !== generation) return;
        var result = FC.buildDaily(td,{seed:P.sig(),name:P.name(),overrides:ov}); result.line = td.line; C.paint(result);
      });
    };
    C.html = function () {
      var months = M.wolun(ch,y), days = M.ilun(ch,y,m), choices = [], lookup = {};
      C.selectedState = assess(days[d-1]);
      if (purpose) choices = M.pickDays(ch,purpose,searchY,searchM,searchY === today.y && searchM === today.mo ? today.d : 1,range).filter(function (x) { return weekday === 'all' || (weekday === 'weekend' ? x.dow === 0 || x.dow === 6 : x.dow > 0 && x.dow < 6); }).sort(function (a,b) { return b.score-a.score || a.jdn-b.jdn; });
      choices.forEach(function (x) { lookup[key(x.y,x.m,x.d)] = x; });
      var top = choices.filter(function (x) { return x.score >= 62; }).slice(0,3);
      var avoid = choices.filter(function (x) { return x.score < 48; }).sort(function (a,b) { return a.score-b.score || a.jdn-b.jdn; }).slice(0,3);
      var tailwind = days.filter(function (x) { return assess(x).grade.k === 'good'; }).sort(function (a,b) { return b.ev.fitScore-a.ev.fitScore || a.date[2]-b.date[2]; }).slice(0,3);
      var risk = days.filter(function (x) { return assess(x).cautious; }).sort(function (a,b) { return a.ev.fitScore-b.ev.fitScore || a.date[2]-b.date[2]; }).slice(0,3);
      function hasDate(list,k) { return list.some(function (x) { return (x.date ? key(x.date[0],x.date[1],x.date[2]) : key(x.y,x.m,x.d)) === k; }); }
      function dateList(list,title,tone,election) {
        return '<section class="mc-shortlist '+tone+'"><h3>'+title+'</h3><p class="dsub">'+(election ? tone==='good'?'목적에 맞는 일정 후보':'중요한 일정은 다른 날짜와 비교해 보세요' : tone==='good'?'우선순위를 정해 움직이기 좋은 흐름':'일정에 여유를 두고 확인을 늘리세요')+'</p>'+(list.length ? list.map(function (x) {
          var a=x.date || [x.y,x.m,x.d], k=key(a[0],a[1],a[2]), detail;
          if(election) detail=x.reasons.filter(function (r) { return tone==='good'?r.pts>0:r.pts<0; }).slice(0,2).map(function (r) { return r.text; }).join(' · ');
          else detail=tone==='good'?(x.stemTG||'')+' · '+assess(x).grade.n:(x.ev.flow.overlays.defense.active?'부담 점검 · ':'')+(x.ev.flow.overlays.volatility.active?'변화 · ':'')+(x.stemTG?x.stemTG+' · ':'')+assess(x).grade.n;
          return '<button type="button" class="mc-pick" data-date="'+k+'"><b>'+a[1]+'/'+a[2]+' · '+(election?'택일 '+x.score:'흐름 '+score(x))+'</b><span>'+esc(detail)+'</span></button>';
        }).join('') : '<p class="mc-empty">'+(tone==='good'?'이 조건에 해당하는 날짜가 없습니다.':'이 조건에서 뚜렷하게 조심할 날짜는 없습니다.')+'</p>')+'</section>';
      }
      var h = '<section class="fortune-panel"><p class="kick">FORTUNE CALENDAR</p><h1 class="h1">월운 그래프 · 일진 캘린더</h1><p class="sub">달의 흐름을 보고, 내 일정에 맞는 날을 골라보세요.</p><div class="mc-nav"><button type="button" data-year="-1" aria-label="이전 연도">‹</button><h2>'+y+'년 월운 그래프</h2><button type="button" data-year="1" aria-label="다음 연도">›</button></div><div class="mc-chart">';
      months.forEach(function (x) { var dt = new Date(x.startMs+9*3600e3), yy=dt.getUTCFullYear(), mm=dt.getUTCMonth()+1, state=assess(x), sc=state.score; var me = dayEl(x); h += '<button type="button" class="mc-bar'+(yy===y && mm===m?' active':'')+(me != null && state.grade.k === 'care' ? ' care' : '')+'" data-month="'+yy+'-'+mm+'" aria-label="'+yy+'년 '+mm+'월 '+esc(x.termName)+(me != null ? ', '+root.MantraLuckTheme.EL_K[me]+' 기운' : '')+', '+esc(tgn(x))+', 적합도 '+sc+', 부담도 '+state.burden+'"><em class="mc-tg flow-tg-'+(TGK[x.stemTG] || 'bg')+'">'+esc(x.stemTG||'')+'</em><b>'+(me != null ? '<var class="mc-elh" style="color:'+elCol(me)+'">'+root.MantraLuckTheme.EL_H[me]+'</var> ' : '')+sc+'</b><i class="'+(me != null ? 'mg-el' : 'mg-'+state.grade.k)+'" style="height:'+sc+'%'+(me != null ? ';--flow:'+elCol(me) : '')+'"></i><span>'+mm+'월</span><small>'+esc(x.termName)+'</small></button>'; });
      h += '</div><div class="mc-legend">'+(root.MantraLuckTheme ? root.MantraLuckTheme.LEGEND.map(function (g) { return '<span><i style="background:'+elCol(g.el)+'"></i>'+g.hanja+' '+g.name+' '+g.words.slice(0, 2).join('·')+'</span>'; }).join('')+'<span><i class="mc-care-k"></i>조심(막대 아래 주황 줄)</span>' : [['good','좋음'],['ok','무난'],['care','조심']].map(function (g) { return '<span><i class="mg-'+g[0]+'"></i>'+g[1]+'</span>'; }).join(''))+'</div><p class="dsub">높이: 내 사주와의 적합도(0~100). 막대 색: 그 달에 두드러지는 오행(길흉 아님). 막대 아래 주황 줄: 조심 등급(흐름 점수 −12 이하). 막대 위 글자: 그 달 천간의 십신. 월을 누르면 캘린더가 바뀝니다.<br>월운은 절기 기준이며 양력 한 달 안에서도 절기 전후로 흐름이 바뀝니다. 1월 막대는 다음 해 소한입니다.</p><details class="fc-method"><summary>월운·일진 계산 기준</summary><p>적합도 = (엔진 적합 점수 + 100) ÷ 2를 반올림한 값입니다. 원국의 오행 균형·조후·십성 구조·합충 관계·통관을 개인별 필요에 따라 가중 합산합니다. 월운은 해당 절기의 작용 60%와 대운 40%를 반영하고, 일진은 해당 날짜의 작용을 계산합니다.</p><p>부담도는 적합도·오행 균형·구조·조후·관계의 부담과 변동성에 작용 강도를 반영한 별도 지수입니다. 신호 등급은 만세력과 같은 좋음·무난·조심 3단계이며, 엔진 적합 점수 +18 이상은 좋음(초록), −12 이하는 조심(주황), 그 사이는 무난(회색)으로 칠합니다. 부담도 40 이상은 등급과 따로 &quot;부담 점검&quot;으로 알려 줍니다. 그 달·그날 천간의 십신은 글자로 따로 표시합니다.</p><p>조심 날짜는 위 조심 기준에 해당하는 모든 날입니다. 택일에서는 목적별 점수 48 미만인 날도 조심 표시합니다. 변동성만 높다는 이유로 조심 날짜로 정하지 않습니다.</p></details></section>';
      var activeMonths = M.wolun(ch,y-1).concat(months).filter(function (x) { return x.startMs <= Date.UTC(y,m-1,d,3); }), activeMonth = activeMonths[activeMonths.length-1];
      if (activeMonth) h += '<p class="mc-month-note">선택한 날의 월운: ' + esc(activeMonth.termName) + ' · ' + esc(tgn(activeMonth)) + ' · ' + esc(assess(activeMonth).grade.n) + ' · 적합도 ' + score(activeMonth) + ' · 부담도 ' + assess(activeMonth).burden + '<br>' + esc((!assess(activeMonth).cautious && root.MantraTenGodLuck && root.MantraTenGodLuck.copy(activeMonth.stemTG, 'wolun') ? root.MantraTenGodLuck.copy(activeMonth.stemTG, 'wolun').do : '') || {opportunity:'새로운 연락과 작은 시도를 시작해 보세요.',expansion:'하던 일을 넓히되 감당할 수 있는 범위를 정하세요.',harvest:'결과를 정리하고 마무리할 일을 챙겨 보세요.',accumulation:'배우고 준비하면서 다음 단계의 기반을 다져 보세요.',defense:'새로운 확장보다 일정의 여유, 지출과 약속의 재확인을 우선하세요.'}[assess(activeMonth).key]) + '</p>';
      var pm = picked ? M.wolun(ch,y-1).concat(months, M.wolun(ch,y+1)).filter(function (x) { var dt = new Date(x.startMs+9*3600e3); return dt.getUTCFullYear()+'-'+(dt.getUTCMonth()+1) === picked; })[0] : null, lm = pm || activeMonth;
      if (lm) h += lvBlock(ch, lm, 'wolun', (pm ? '' : '선택한 날의 ') + '월운 ' + M.gzName(lm) + ' · ' + lm.termName + ' 이후', '', 'mc-lv-month');
      h += '<section class="fortune-panel"><div class="mc-nav"><button type="button" data-nav="-1" aria-label="이전 달">‹</button><h2>'+y+'년 '+m+'월 일진 캘린더</h2><button type="button" data-nav="1" aria-label="다음 달">›</button></div>'+(function () { var dl = M.ilun(ch,y,m), sx = dl[d-1]; return careBlock(M, ch, sx, (y===today.y&&m===today.mo&&d===today.d?'오늘('+m+'/'+d+')':m+'/'+d)); })()+'<div class="fc-controls"><label>보기<select id="mc-purpose"><option value="">일상 흐름</option>'+['move','wedding','contract','trip','exam'].map(function (k) { return '<option value="'+k+'"'+(purpose===k?' selected':'')+'>'+esc(M.TAEK_PURPOSE[k].label)+' 택일</option>'; }).join('')+'</select></label>';
      if (purpose) h += '<label>검색 기간<select id="mc-range">'+[30,60,90].map(function (n) { return '<option value="'+n+'"'+(range===n?' selected':'')+'>'+n+'일</option>'; }).join('')+'</select></label><label>요일<select id="mc-weekday">'+[['all','전체'],['weekday','평일'],['weekend','주말']].map(function (x) { return '<option value="'+x[0]+'"'+(weekday===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></label>';
      h += '<button type="button" id="mc-today">오늘로</button></div><div class="mc-grid" role="group" aria-label="날짜 선택">'+DOW.map(function (x) { return '<span class="mc-week">'+x+'</span>'; }).join('');
      for(var i=0;i<new Date(Date.UTC(y,m-1,1)).getUTCDay();i++) h += '<span></span>';
      days.forEach(function (x,idx) { var dd=idx+1, f=x.ev.flow, k=key(y,m,dd), pick=lookup[k], cautious=assess(x).cautious || !!(pick && pick.score < 48), recommended=!cautious && hasDate(purpose?top:tailwind,k), son=x.lunar && [9,10,19,20,29,30].indexOf(x.lunar.d)>=0;
        var de = dayEl(x); h += '<button type="button" class="mc-day '+(de != null ? 'elm' : 'mg-'+assess(x).grade.k)+(recommended?' favorable':'')+(cautious?' caution':'')+(dd===d?' selected':'')+(k===key(today.y,today.mo,today.d)?' is-today':'')+'"'+(de != null ? ' style="--flow:'+elCol(de)+'"' : '')+' data-date="'+k+'" aria-pressed="'+(dd===d)+'" aria-label="'+m+'월 '+dd+'일 '+esc(M.gzNameK(x))+(de != null ? ', '+root.MantraLuckTheme.EL_K[de]+' 기운' : '')+', '+esc(x.stemTG||'')+', 흐름 '+score(x)+', '+esc(assess(x).grade.n)+(cautious&&!assess(x).cautious?', 조심':'')+(son?', 손 없는 날':'')+'"><b>'+dd+(de != null ? '<i class="mc-el">'+root.MantraLuckTheme.EL_H[de]+'</i>' : '')+'</b><small>'+esc(M.gzNameK(x))+'</small><span class="mc-metric"><strong>'+(pick?pick.score:score(x))+'</strong><span class="flow-tg-'+(TGK[x.stemTG] || 'bg')+'">'+(pick?'택일':esc(x.stemTG||''))+'</span></span><em>'+(recommended?'추천':cautious?'조심':f.overlays.defense.active?'부담 점검':f.overlays.volatility.active?'변화':esc(assess(x).grade.n))+'</em>'+(son?'<i class="mc-son" title="손 없는 날 · 음력 '+x.lunar.d+'일" aria-label="손 없는 날">손</i>':'')+'</button>';
      });
      h += '</div><p class="dsub"><span class="mc-key good">추천</span> 움직이기 좋은 날 · <span class="mc-key caution">조심</span> 확인이 필요한 날<br><span class="mc-key son">손</span> 손 없는 날(음력 9·10·19·20·29·30일) · 점: 오늘<br>칸 배경색·숫자 옆 한자: 그날 일진에 두드러지는 오행(木 초록 · 火 빨강 · 土 노랑 · 金 회색 · 水 파랑, 길흉 아님)<br>칸 아래 글자·주황 밑줄: 조심 등급(흐름 점수 −12 이하) · 초록 밑줄: 추천 / 칸 안 글자: 그날 천간의 십신 / 테두리: 선택한 날<br>날짜를 누르면 아래 운 지수와 행동 안내가 함께 바뀝니다.</p>';
      if(purpose) {
        h += '<p class="dsub">'+searchY+'년 '+searchM+'월 '+(searchY===today.y && searchM===today.mo?today.d:1)+'일부터 '+range+'일간 · '+esc(M.TAEK_PURPOSE[purpose].label)+'</p>';
        h += '<div class="mc-lists">'+dateList(top,'추천 날짜','good',true)+dateList(avoid,'피하면 좋은 날','caution',true)+'</div>';
        var selected=lookup[key(y,m,d)]; if(selected) h += '<p>선택한 날의 '+esc(M.TAEK_PURPOSE[purpose].label)+' 택일 적합도: '+selected.score+' · '+esc(selected.grade)+'</p>';
        h += '<p class="dsub">택일은 목적별 적합도를 따로 계산합니다. 운 흐름 지수와 다른 점수이며 성공 확률이 아닙니다.</p>';
      }
      else h += '<div class="mc-lists">'+dateList(tailwind,'좋은 날','good',false)+dateList(risk,'조심할 날','caution',false)+'</div>';
      return h+'</section>';
    };
    C.bind = function (el) {
      H.$$('[data-date]',el).forEach(function (b) { b.onclick=function () { var a=b.dataset.date.split('-').map(Number); y=a[0];m=a[1];d=a[2];picked=null;C.refresh(); }; });
      H.$$('[data-month]',el).forEach(function (b) { b.onclick=function () { var a=b.dataset.month.split('-').map(Number); if(a[0]>2098)return;y=a[0];m=a[1];searchY=y;searchM=m;d=1;picked=b.dataset.month;C.pickScroll=true;C.refresh(); }; });
      H.$$('[data-nav],[data-year]',el).forEach(function (b) { b.onclick=function () { var dt=new Date(Date.UTC(y+(+b.dataset.year||0),m-1+(+b.dataset.nav||0),1));if(dt.getUTCFullYear()<1901||dt.getUTCFullYear()>2098)return;y=dt.getUTCFullYear();m=dt.getUTCMonth()+1;searchY=y;searchM=m;d=1;picked=null;C.refresh(); }; });
      $('#mc-today',el).onclick=function () { picked=null;y=today.y;m=today.mo;searchY=y;searchM=m;d=today.d;C.refresh(); };
      $('#mc-purpose',el).onchange=function () { purpose=this.value;C.refresh(); };
      if(purpose) { $('#mc-range',el).onchange=function () { range=+this.value;C.refresh(); };$('#mc-weekday',el).onchange=function () { weekday=this.value;C.refresh(); }; }
    };
    return C;
  }

  H.route('today', function (q, ctx) {
    needSaju(ctx, 'today', function (ch) {
      var cal = calendar(ch, ctx);
      cal.paint = function (d) {
        if (!H.alive(ctx)) return; var nm = P.name();
        var meta = function (k) { return FLD.filter(function (x) { return x[0] === k; })[0]; };
        var cards = d.order.map(function (k) { var v = d.fields[k], f = meta(k); return '<a class="dc' + (q.f === k ? ' hl' : '') + '" id="d-' + k + '" href="#dd-' + k + '" data-jump="' + k + '"><small>' + f[2] + '</small><b>' + f[1] + '</b><span>' + esc(v.grade || v.band) + '</span><div class="bar"><i style="width:' + clamp(v.score) + '%"></i></div></a>'; }).join('');
        var detail = d.order.map(function (k) {
          var v = d.fields[k], f = meta(k);
          return '<details class="dd" id="dd-' + k + '" data-f="' + k + '"' + (q.f === k ? ' open' : '') + '><summary><span><small>' + f[2] + '</small><b>' + f[1] + ' · ' + esc(v.grade || v.band) + '</b><em>' + esc(v.summary) + '</em></span><i class="chev" aria-hidden="true"></i></summary><div class="ddb">' +
            (v.hook && v.hook !== v.summary ? '<p class="dd-hook"><b>' + esc(v.hook) + '</b></p>' : '') +
            (v.theme ? '<p class="dd-el"><small>' + esc(v.theme.hanja + ' ' + v.theme.el + ' 기운 · ' + v.theme.area + ' 쪽: ' + v.theme.words.join('·')) + '</small><br>' + esc(v.theme.rec) + '</p>' : '') +
            v.detail.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + (v.examples ? '<div class="chips ex">' + v.examples.map(function (x) { return '<i>' + esc(x.trim()) + '</i>'; }).join('') + '</div>' : '') +
            '<div class="gc"><div class="g"><h5>좋은 행동</h5>' + lis(v.goodActions) + '</div><div class="c"><h5>주의할 행동</h5>' + lis(v.cautions) + '</div></div></div></details>';
        }).join('');
        var ev = d.evidence, why = '<details class="dd why" id="d-why"><summary><span><b>왜 이런 결과가 나왔나요?</b></span><i class="chev" aria-hidden="true"></i></summary><div class="ddb"><p>' + esc(ev.intro) + '</p>' +
          ev.plain.map(function (x) { return '<div class="ev"><h5>' + esc(x.title) + '</h5><p>' + esc(x.body) + '</p></div>'; }).join('') +
          '<details class="pro"><summary>전문 해석 보기</summary>' + lis(ev.pro) + '</details></div></details>';
        var el = H.view(cal.html() + '<section class="tscore" id="selected-fortune"><h2>' + cal.title() + '</h2><p class="kick">' + +d.date.slice(5, 7) + '월 ' + +d.date.slice(8) + '일 ' + d.dow + '요일 · ' + esc(d.gz) + '日</p><div class="ring" style="--p:' + d.overallScore + '"><b>' + d.overallScore + '</b></div><div class="tflow">' + esc((d.tg || '') + '') + ' · ' + esc(d.grade || d.cond) + '</div><p class="sub" style="margin-top:6px">' + (nm ? esc(nm) + '님, ' : '') + esc(d.line) + '</p>' +
          '<p class="dhead">“' + esc(d.headline) + '”</p>' + (d.notes.length ? '<p class="note">' + esc(d.notes.join(' ')) + '</p>' : '') + '</section>' +
          cal.dayBlock('') + '<div class="dgrid">' + cards + '</div>' +
          '<section class="dsec"><h3>이날의 핵심</h3><p>' + esc(d.summary) + '</p><p>' + esc(d.summary2) + '</p></section>' +
          '<section class="dsec"><h3>분야별로 자세히 보기</h3><p class="dsub">궁금한 분야를 눌러 펼쳐 보세요.</p>' + detail + '</section>' +
          '<section class="actcard" id="d-action"><h3>이날의 행동 처방</h3><h5>하면 좋은 것</h5><div class="chips tg">' + tags(d.todayActions) + '</div><h5>미루면 좋은 것</h5><div class="chips tg avoid">' + tags(d.avoidActions) + '</div><div class="one"><small>이날의 한 문장</small><p>“' + esc(d.closingMessage) + '”</p></div></section>' +
          '<section class="dsec">' + why + '</section>' +
          '<p class="dis">점수는 선택한 날의 일진이 내 사주에 필요한 기운인지를 따진 값입니다. 사건을 확정하지 않는 참고용 흐름이며, 컨디션은 의학적 진단이 아닌 생활 리듬의 참고입니다.</p>' +
          '<section class="nextc"><p class="q">' + esc(d.next.q) + '</p><a class="btn" href="' + esc(d.next.to) + '" data-track="today_cta_click" data-p="' + esc(d.next.track) + '">' + esc(d.next.btn) + '</a><a class="btn ghost sm" href="#/my" data-track="fortune_content_click" data-p="from_today_my">MY 운명으로</a></section>', { keepScroll: cal.draws++ > 0 });
        cal.bind(el);
        if (root.MantraSignalColors) { try { root.MantraSignalColors.paint(el); } catch (e) { } }   // 좋은 신호·주의할 신호 글자 색
        if (cal.pickScroll) { cal.pickScroll = false; var mb = $('#mc-lv-month', el); if (mb && mb.scrollIntoView) setTimeout(function () { mb.scrollIntoView({ block: 'start', behavior: H.reduce ? 'auto' : 'smooth' }); }, 60); }
        H.track('fortune_content_view', { content: 'today', flow: d.flowKey }); H.track('today_open', { flow: d.flowKey, cta: d.next.key }, true);
        H.$$('details.dd', el).forEach(function (x) { x.addEventListener('toggle', function () { if (x.open) H.track(x.id === 'd-why' ? 'today_evidence_expand' : 'today_detail_expand', { field: x.dataset.f || 'why' }); }); });
        H.$$('[data-jump]', el).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var t = H.$('#dd-' + a.dataset.jump, el); if (t) { t.open = true; t.scrollIntoView({ block: 'center', behavior: H.reduce ? 'auto' : 'smooth' }); } }; });
        if (q.f && cal.draws === 1) { var tg = $('#dd-' + q.f, el) || $('#d-' + q.f, el); if (tg && tg.scrollIntoView) setTimeout(function () { tg.scrollIntoView({ block: 'center', behavior: H.reduce ? 'auto' : 'smooth' }); }, 120); }
      };
      cal.refresh();
      lvReady().then(function (V) { if (V && H.alive(ctx)) cal.refresh(); });   // 운 분석 층 모듈이 늦게 오면 다시 그린다
      if (!root.MantraLuckCare) careReady().then(function (LC) { if (LC && H.alive(ctx)) cal.refresh(); });   // 일진 조심 신호 모듈이 늦게 오면 다시 그린다
    });
  });

  /* ───────── 일주 각성 (15~30초) ─────────
     사주 계산 → 이름 → 일간 → 일주 → 짧은 설명 → "이제, 당신의 이야기를 시작합니다" → MY 운명. 화면을 탭하면 다음으로, 건너뛰기도 가능.
     영상은 관리자가 올려 둔 일간·일주 영상(/api/awakening)이 있을 때만 배경으로 깔고, 없으면 글만 나온다. */
  H.route('awaken', function (q, ctx) {
    needSaju(ctx, 'awaken', function (ch, kit) { play(ch, kit, ctx, !!q.replay); });
  });
  function play(ch, kit, ctx, replay) {
    var M = kit.M, T = kit.T, nm = P.name(), g = ch.gender, day = ch.pillars.day, stemK = M.STEM_K[day.s], ju = M.gzNameK(day);
    var ig = T.ilganCard(stemK, nm), jc = T.ijuCard(ju, nm, g), pot = null;
    try { var gr = ch.weights.groups, mi = 0; for (var i = 1; i < 5; i++) if (gr[i] > gr[mi]) mi = i; pot = { group: GROUPS5[mi], name: POTENTIAL[GROUPS5[mi]] }; } catch (e) { }
    var steps = [];
    if (nm) steps.push({ ms: 2300, vid: 'ilgan', html: '<div class="nm aw-in">' + esc(nm) + '.</div>' });
    steps.push({ ms: 4200, vid: 'ilgan', html: '<p class="a1 aw-in">당신의 중심은</p><div class="big aw-in">' + esc(ig ? ig.title.split(' · ')[0] : M.STEM[day.s]) + '</div>' + (ig && ig.title.split(' · ')[1] ? '<p class="rd aw-in">' + esc(ig.title.split(' · ')[1]) + '</p>' : '') + (ig ? '<p class="a1 aw-in">' + br(ig.line) + '</p>' : '') });
    steps.push({ ms: 3200, vid: 'iju', html: '<p class="a1 aw-in">그리고 당신이 태어난 날은</p><div class="big aw-in">' + esc(M.gzName(day)) + '</div><p class="rd aw-in">' + esc(ju) + '일주</p>' });
    if (jc) steps.push({ ms: 6500, vid: 'iju', html: '<p class="film aw-in">' + br(jc.film) + '</p><p class="ttl aw-in">' + esc(jc.title) + '</p><p class="trait aw-in">' + br(jc.trait) + '</p>' });
    steps.push({ ms: 2600, vid: 'iju', html: '<p class="film aw-in">이제,<br>당신의 이야기를 시작합니다.</p>' });
    var host = document.createElement('div'); host.id = 'awk'; host.setAttribute('role', 'dialog'); host.setAttribute('aria-label', '일주 각성');
    host.innerHTML = '<div class="fb" id="awFb" hidden></div><video class="vid" data-k="ilgan" muted playsinline loop preload="auto" hidden></video><video class="vid" data-k="iju" muted playsinline loop preload="auto" hidden></video><div class="shade"></div><div class="stage" id="awStage" aria-live="polite"></div><button type="button" class="skip" id="awSkip">건너뛰기 ›</button><div class="tap" aria-hidden="true">TAP</div><p class="fbn" id="awFbn" hidden>이 일주의 각성 영상은 아직 준비되지 않았습니다.</p>';
    document.body.appendChild(host);
    var stage = $('#awStage', host), vids = { ilgan: $('.vid[data-k="ilgan"]', host), iju: $('.vid[data-k="iju"]', host) }, cur = null, want = '', timer = 0, i = -1, done = false, clips = null;
    // 영상이 늦게 오면 기다린다(2026-11-16): 장면 글은 그 장면 영상이 실제로 재생되기 시작한 뒤에 띄우고, 그때부터 장면 시간을 잰다.
    // 기다리지 않는 경우: 영상 정보가 없음·불러오기 실패·재생 거부(저전력 모드 등)·데이터 절약 모드 → 지금처럼 글만 진행. 기다리는 동안에도 건너뛰기는 된다.
    var clipState = navigator.connection && navigator.connection.saveData ? 'none' : 'loading', bad = {}, waiting = null;
    var load = document.createElement('div'); load.className = 'aw-load'; load.setAttribute('role', 'status'); load.hidden = true; load.innerHTML = '<span class="aw-spin" aria-hidden="true"></span><p>영상을 불러오는 중이에요</p>'; host.appendChild(load);
    function wait(s) { waiting = s; stage.innerHTML = ''; load.hidden = false; host.classList.add('aw-wait'); }
    function ready(kind) { return clipState !== 'loading' && (clipState === 'none' || bad[kind] || !urlOf(kind) || cur === vids[kind]); }
    function render(s) { waiting = null; load.hidden = true; host.classList.remove('aw-wait'); stage.innerHTML = s.html; clearTimeout(timer); timer = setTimeout(show, s.ms); }
    function kick() { if (!done && waiting && ready(waiting.vid)) render(waiting); }
    function giveUp(kind) { bad[kind] = true; kick(); }
    // 영상이 없을 때(등록 전·불러오기 실패): 기록의 문 풍경 이미지와 안내를 보여 준다. 이미지 주소는 인터랙티브 스토리 설정(portal 에셋)을 따른다.
    function showFallback() {
      var fb = $('#awFb', host), n = $('#awFbn', host), Qt = root.Quest, url = Qt && Qt.assetUrl && H.Onboard && H.Onboard.cfg ? Qt.assetUrl(H.Onboard.cfg(), 'portal', (root.innerWidth || 1024) < 768) : '/report/hub/quest/portal.webp';
      if (!fb || cur) return; fb.style.backgroundImage = 'url("' + url + '")'; fb.hidden = false; void n; // "영상 준비 안 됨" 안내는 운영 사정이라 고객 화면에는 띄우지 않는다(풍경 이미지만 보여 준다)
    }
    // 일간 영상 → 일주 변신 영상. 두 영상을 미리 따로 불러 두고, 다음 영상이 실제로 재생되기 시작한 뒤에 위로 겹쳐 띄운다.
    // 다음 영상이 아직 준비되지 않았으면 지금 영상을 계속 반복한다(사이에 포스터·빈 화면이 끼지 않게). 포스터는 처음 보이는 영상에만 쓴다.
    var clipOf = function (kind) { return clips && (kind === 'iju' ? (clips.video || clips.fallback) : clips.ilgan); };
    var urlOf = function (kind) { var c = clipOf(kind); return c && (c.videoUrl || c.videoWebm); };
    function prepare(kind) {
      var v = vids[kind], u = urlOf(kind); if (!u || v.getAttribute('src') === u) return;
      v.onerror = function () { v.classList.remove('on'); v.hidden = true; if (cur === v) cur = null; if (!cur) showFallback(); giveUp(kind); };
      v.hidden = false; v.src = u; v.load(); // 투명(.on 전)한 채로 미리 받아 둔다
    }
    function reveal(v) {
      var prev = cur; cur = v; v.classList.add('on');
      if (prev && prev !== v) setTimeout(function () { if (cur !== prev) { prev.classList.remove('on'); prev.pause(); } }, 1300);
      kick();
    }
    function setVideo(kind) {
      want = kind; var v = vids[kind]; if (!urlOf(kind)) return; // 이 단계 영상이 없으면 지금 영상을 그대로 둔다
      prepare(kind); if (cur === v) return;
      var c = clipOf(kind); if (!cur && c.posterUrl && !v.poster) v.poster = c.posterUrl;
      var go = function () { if (done || want !== kind || cur === v) return; reveal(v); };
      v.onplaying = go; var p = v.play(); if (p && p.catch) p.catch(function (e) { if (e && e.name === 'NotAllowedError') giveUp(kind); });   // 자동 재생이 막히면 영상을 기다리지 않는다
      if (!v.paused && v.readyState >= 3) go();
    }
    function show() {
      clearTimeout(timer); i++; if (i >= steps.length) return finish(false);
      var s = steps[i]; setVideo(s.vid);
      if (ready(s.vid)) render(s); else wait(s);   // 영상이 재생되면 reveal → kick 이 이 장면을 띄운다
    }
    function finish(skipped) {
      if (done) return; done = true; clearTimeout(timer); host.remove(); H.cleanup = null;
      if (!replay) P.markAwakened(); H.track('ilju_awakening_complete', { skipped: skipped ? 1 : 0, replay: replay ? 1 : 0 });
      var aq = (H.ctx && H.ctx.q) || {}; try { sessionStorage.setItem('mt_tl_awk', P.sig()); } catch (e) { } H.replace('#/timeline?aw=1' + (aq.z ? '&z=' + encodeURIComponent(aq.z) : '')); // 2026-11-12: 홈·MY 홈을 타임라인으로 모아, 각성 뒤에는 항상 타임라인으로 간다(이번 탭에서 각성을 다시 틀지 않게 표시) // 새 홈에서 온 경우 홈으로, 인터랙티브 스토리에서 온 경우 운명의 타임라인으로
    }
    H.cleanup = function () { done = true; clearTimeout(timer); };
    host.onclick = function (e) { if (e.target.id === 'awSkip') finish(true); else if (!waiting) show(); };   // 불러오는 동안 화면 탭은 무시(건너뛰기만)
    H.track('ilju_awakening_start', { replay: replay ? 1 : 0 }); show();
    if (!(navigator.connection && navigator.connection.saveData)) fetch('/api/awakening?pillar=' + encodeURIComponent(ju) + '&gender=' + g).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && !done) { clips = d; var has = function (c) { return c && (c.videoUrl || c.videoWebm); }; clipState = has(d.video) || has(d.fallback) || has(d.ilgan) ? 'ok' : 'none'; if (steps[i]) setVideo(steps[i].vid); prepare('ilgan'); prepare('iju'); if (clipState === 'none') showFallback(); kick(); } else if (!d && !done) { clipState = 'none'; showFallback(); kick(); } }).catch(function () { if (!done) { clipState = 'none'; showFallback(); kick(); } });
  }

  /* ───────── MY 운명 홈 ───────── */
  var tile = function (title, small, href, p, extra) { return '<a class="tile' + (extra ? ' ' + extra : '') + '" href="' + href + '" data-track="fortune_content_click" data-p="' + p + '"><b>' + title + '</b><small>' + small + '</small></a>'; };
  // 2026-11-12: MY 운명 홈은 운명의 타임라인으로 합쳤다(오늘의 흐름·분야별 운·무료 콘텐츠·내 정보). 옛 화면은 #/my?old=1 로만 열린다.
  H.route('my', function (q, ctx) {
    if (!P.has()) return H.replace('#/input?next=my');
    if (!q.old) return H.replace('#/timeline' + (q.z ? '?z=' + encodeURIComponent(q.z) : ''));
    if (!P.awakened() && !q.s) return H.replace('#/awaken'); // 첫 방문: 일주 각성을 먼저 거친다
    needSaju(ctx, 'my', function (ch, kit) {
      var M = kit.M, T = kit.T, nm = P.name(), day = ch.pillars.day, t = Saju.todayData(ch), stemK = M.STEM_K[day.s], S = T.DATA.S[stemK] || {};
      var pct = (ch.weights && ch.weights.pct) || [], bars = M.EL_K.map(function (e, i) { var v = Math.round(pct[i] || 0); return '<div class="eb"><span>' + esc(e) + '</span><div class="eb-t"><i style="width:' + Math.max(2, Math.min(100, v * 2)) + '%;background:' + EL_COL[i] + '"></i></div><b>' + v + '%</b></div>'; }).join('');
      var gr = (ch.weights && ch.weights.groups) || [], mi = 0; for (var i = 1; i < gr.length; i++) if (gr[i] > gr[mi]) mi = i;
      var jc = T.ijuCard(M.gzNameK(day), nm, ch.gender);
      var me = '<div class="me-body" id="meBody" hidden><div class="eb-wrap">' + bars + '</div>' + (gr.length ? '<p class="sub" style="margin-top:8px;font-size:.92rem">가장 큰 동력은 <em>' + esc(POTENTIAL[GROUPS5[mi]]) + '</em>입니다 (' + GROUPS5[mi] + ' 기운 ' + Math.round(gr[mi]) + '%).</p>' : '') +
        '<div class="sw">' + (S.strength ? '<div><small>나의 강점</small>' + esc(S.strength) + '</div>' : '') + (jc ? '<div><small>주의할 성향</small>' + esc(jc.trait.split(', ').slice(-1)[0] || '') + '</div>' : '') + (S.tip ? '<div><small>이렇게 다뤄 보세요</small>' + esc(S.tip) + '</div>' : '') + '</div></div>';
      var el = H.view(
        '<section class="myhead"><p class="kick">MY 運命</p><h1 class="who">' + (nm ? esc(nm) + '님의 운명' : '나의 운명') + '</h1><div class="ilju"><b>' + esc(M.gzName(day)) + '</b><span>' + esc(M.gzNameK(day)) + '일주</span></div></section>' +
        '<a class="todaycard" href="#/today" data-track="fortune_content_click" data-p="today_card"><div class="ring" style="--p:' + t.score + '"><b>' + t.score + '</b></div><div><p class="lb">오늘의 흐름 · ' + esc(t.tg || '') + '</p><h3>' + esc(t.gradeDay || t.cond + '의 날') + '</h3><p>' + esc(t.line) + '</p></div></a>' +
        '<section class="grp"><h2>오늘의 나</h2><div class="tiles">' +
        tile('월운 · 일진 캘린더', '흐름을 보고 날짜 고르기', '#/today', 'today') + tile('재물운', '오늘의 돈 흐름', '#/today?f=money', 'today_money') + tile('일·사업운', '오늘의 일 흐름', '#/today?f=work', 'today_work') + tile('연애운', '오늘의 인연 흐름', '#/today?f=love', 'today_love') + tile('컨디션', '몸과 마음의 균형', '#/today?f=health', 'today_health') + tile('오늘의 행동 가이드', '오늘 하면 좋은 일', '#/today?f=action', 'today_action') + '</div></section>' +
        '<section class="grp"><h2>나라는 사람</h2><div class="tiles">' +
        '<button type="button" class="tile wide" id="meBtn" data-track="fortune_content_click" data-p="me_profile"><b>오행 · 십성 · 강점과 주의할 성향</b><small>내 안의 다섯 기운과 가장 큰 동력</small></button>' + me +
        tile('일간 · 일주 다시 보기', '일주 각성 연출', '#/awaken?replay=1', 'ilju_replay', 'wide') + '</div></section>' +
        '<section class="grp"><h2>심층 콘텐츠</h2><div class="tiles"><a class="tile wide" href="#/go?to=life" data-track="premium_cta_click" data-p="deep_movingtoon"><b>심층 무빙툰, 종합 리포트</b><small>인생 지도부터 연애·재물·직장, 개운 가이드까지 한 편으로 읽는 나의 운로</small></a></div></section>' +
        '<p class="dis">사주는 참고용 콘텐츠이며 미래를 단정하지 않습니다.</p>');
      $('#meBtn', el).onclick = function () { var b = $('#meBody', el); b.hidden = !b.hidden; };
      H.track('fortune_home_view', { awakened: 1 });
    });
  });
})(window);
