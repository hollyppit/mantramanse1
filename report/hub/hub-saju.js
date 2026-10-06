// 사주가 필요한 화면: 입력(필요할 때만) · 오늘의 운세 · 일주 각성 · MY 운명 홈.
// 계산은 전부 기존 엔진을 그대로 쓴다: Manse.compute / ilun / evaluateDomainLuck / careerLuckActivation / flowName·flowLabel, 일간·일주 소개는 /report/v2/intro-text.js, 일진 "그날 할 일"은 MantraCore.DAYMODE.
// 새로운 점수나 명리 판단은 만들지 않는다 — 여기서는 엔진 값을 화면 문장에 끼워 넣을 뿐이다.
(function (root) {
  'use strict';
  var H = root.Hub, P = H.profile, esc = H.esc, br = H.br, $ = H.$, DAYMODE = root.MantraCore.DAYMODE;
  var Saju = H.Saju = {};
  var CITIES = [['서울', 126.98], ['부산', 129.08], ['대구', 128.60], ['인천', 126.70], ['광주', 126.85], ['대전', 127.38], ['울산', 129.31], ['세종', 127.29], ['수원', 127.03], ['고양', 126.83], ['성남', 127.14], ['용인', 127.18], ['청주', 127.49], ['천안', 127.15], ['전주', 127.15], ['목포', 126.39], ['여수', 127.66], ['포항', 129.36], ['경주', 129.22], ['안동', 128.73], ['창원', 128.68], ['진주', 128.11], ['춘천', 127.73], ['강릉', 128.90], ['제주', 126.53]];
  var NEXT_NAME = { today: '오늘의 운세', awaken: '나의 일주 각성', life: '내 인생의 흐름', my: '나의 운명 이야기' };
  var EL_COL = ['#5E9E78', '#D0634A', '#BC9C62', '#AEB9C6', '#4A7AB5'];
  var GROUPS5 = ['비겁', '식상', '재성', '관성', '인성'];
  var POTENTIAL = { 비겁: '스스로 길을 여는 힘', 식상: '생각을 형태로 만드는 힘', 재성: '기회를 알아보는 힘', 관성: '사람들이 믿고 따르게 만드는 힘', 인성: '깊이 이해하고 꿰뚫는 힘' };
  var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];

  /* ───────── 오늘의 흐름 (엔진 값 읽기) ───────── */
  // 주 흐름(기회·확장·수확·축적)별 한 문장. 틀은 엔진의 FLOW_DESC / 일진 행동모드(DAYMODE) 뜻과 같다.
  var FLOW_LINE = { opportunity: '오늘은 기회를 발견하고 움직일 수 있는 날입니다.', expansion: '이미 하고 있는 일을 키우기 좋은 날입니다.', harvest: '쌓아 온 결과를 거두기 좋은 날입니다.', accumulation: '밖으로 나서기보다 안을 채우기 좋은 날입니다.' };
  var cache = { ch: null, v: null };
  Saju.todayData = function (ch) {
    if (cache.ch === ch && cache.v) return cache.v;
    var M = root.Manse, now = Date.now(), k = new Date(now + 9 * 3600e3), y = k.getUTCFullYear(), mo = k.getUTCMonth() + 1, d = k.getUTCDate();
    var il = M.ilun(ch, y, mo)[d - 1], ev = il.ev, f = ev.flow, key = f.primaryFlow, cond = f.condition.name;
    var dm = M.evaluateDomainLuck(ch, il, 'ilun', { ms: Date.UTC(y, mo - 1, d, 3) }), career = null;
    try { var top = (M.careerProfile(ch).top || []).slice(0, 3).map(function (c) { return c.category; }), a = M.careerLuckActivation(ch, il); if (top.length) career = clamp(top.reduce(function (s, c) { return s + (a[c] || 0); }, 0) / top.length); } catch (e) { }
    var note = [];
    if (cond === '주의' || cond === '부담') note.push('다만 무리한 확장은 피하세요.');
    if (f.overlays.volatility.active) note.push('변동 신호가 있어 일정에 여유를 두세요.');
    if (f.overlays.defense.active) note.push('부담이 커질 수 있어 컨디션을 먼저 챙기세요.');
    var mode = DAYMODE[ev.phase] || [];
    var v = {
      y: y, mo: mo, d: d, dow: DOW[k.getUTCDay()], gz: M.gzName(il), score: clamp((ev.fitScore + 100) / 2), flowKey: key, phase: ev.phase, flowLabel: M.flowLabel(ev, { overlay: 'top' }), cond: cond,
      line: FLOW_LINE[key] || '', notes: note, todo: mode[2] || '', meaning: mode[1] || '',
      fields: { money: { s: dm.wealth.score, b: dm.wealth.band }, work: career == null ? null : { s: career, b: career >= 70 ? '높음' : career >= 55 ? '무난' : career >= 40 ? '다소 낮음' : '낮음' }, love: { s: dm.love.score, b: dm.love.band }, health: { s: dm.health.score, b: dm.health.band } },
    };
    cache = { ch: ch, v: v }; return v;
  };

  /* ───────── 입력 ───────── */
  var opts = function (a, b, sel, suf) { var h = ''; for (var i = a; i <= b; i++) h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + i + suf + '</option>'; return h; };
  function after(next) { // 입력을 마친 뒤 가는 곳
    if (next === 'today') return '#/today';
    if (next === 'life') return '#/go?to=life';
    if (next === 'my') return P.awakened() ? '#/my' : '#/awaken';
    return '#/awaken';
  }
  H.route('input', function (q, ctx) {
    var next = NEXT_NAME[q.next] ? q.next : 'my', has = P.has(), s = P.get() || {}, y = new Date().getFullYear();
    H.engine().catch(function () { }); // 미리 불러 둔다
    var sy = +s.year || 1990, sm = +s.month || 1, sd = +s.day || 1, g = s.gender === 'M' ? 'M' : s.gender === 'F' ? 'F' : '', minY = 1900;
    var el = H.view('<section class="hero" style="text-align:left;padding-bottom:0"><p class="kick">BIRTH</p><h1 class="h1">' + (q.next && NEXT_NAME[q.next] ? esc(NEXT_NAME[q.next]) + '을 보려면<br>태어난 순간이 필요해요' : '당신이 태어난<br>순간을 알려주세요') + '</h1><p class="sub">한 번만 입력하면 다른 콘텐츠에서도 그대로 쓰입니다.<br>입력한 정보는 이 기기 안에서만 계산되고 서버로 보내지 않습니다.</p></section>' +
      '<form class="form" id="sf" novalidate autocomplete="off">' +
      '<label class="f"><span>이름 (선택)</span><input type="text" name="name" maxlength="20" autocomplete="off" value="' + esc(s.name || '') + '"></label>' +
      '<div class="f seg" role="radiogroup" aria-label="성별"><span>성별</span><label><input type="radio" name="gender" value="F"' + (g === 'F' ? ' checked' : '') + '><i>여</i></label><label><input type="radio" name="gender" value="M"' + (g === 'M' ? ' checked' : '') + '><i>남</i></label></div>' +
      '<div class="f seg" role="radiogroup" aria-label="달력"><span>달력</span><label><input type="radio" name="calendar" value="solar"' + (s.calendar === 'lunar' ? '' : ' checked') + '><i>양력</i></label><label><input type="radio" name="calendar" value="lunar"' + (s.calendar === 'lunar' ? ' checked' : '') + '><i>음력</i></label><label class="leap" hidden><input type="checkbox" name="leap"' + (s.leap ? ' checked' : '') + '><i>윤달</i></label></div>' +
      '<div class="f row3"><span>생년월일</span><select name="year" aria-label="년">' + opts(minY, y, sy, '년') + '</select><select name="month" aria-label="월">' + opts(1, 12, sm, '월') + '</select><select name="day" aria-label="일">' + opts(1, 31, sd, '일') + '</select></div>' +
      '<div class="f"><span>태어난 시간</span><div class="inl"><input type="time" name="time" value="' + (s.hourUnknown || s.hour == null || s.hour === '' ? '' : ('0' + s.hour).slice(-2) + ':' + ('0' + (s.minute || 0)).slice(-2)) + '" aria-label="태어난 시간"><label class="chk"><input type="checkbox" name="unknown"' + (!has || s.hourUnknown || s.hour == null ? ' checked' : '') + '><i>시간을 몰라요</i></label></div></div>' +
      '<label class="f"><span>태어난 곳</span><select name="city">' + CITIES.map(function (c) { return '<option value="' + c[1] + '"' + (c[0] === (s.city || '서울') ? ' selected' : '') + '>' + c[0] + '</option>'; }).join('') + '</select></label>' +
      '<p class="msg err" id="sm" role="alert"></p><button type="submit" class="btn">' + (q.next === 'today' ? '오늘의 운세 보기' : q.next === 'life' ? '내 인생 지도 펼치기' : '내 운명 이야기 시작') + '</button></form>');
    var f = $('#sf', el), msg = $('#sm', el);
    function fix() { f.leap.parentElement.hidden = f.calendar.value !== 'lunar'; f.time.disabled = f.unknown.checked; }
    f.addEventListener('change', fix); fix();
    f.addEventListener('focusin', function () { H.track('saju_input_start', { next: next }, true); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); msg.textContent = '';
      if (!f.gender.value) { msg.textContent = '성별을 선택해 주세요.'; return; }
      var t = f.time.value, hasT = !f.unknown.checked && /^\d\d:\d\d$/.test(t), city = CITIES.filter(function (c) { return String(c[1]) === f.city.value; })[0];
      var saved = { name: String(f.name.value || '').trim().slice(0, 20), gender: f.gender.value, calendar: f.calendar.value, leap: f.calendar.value === 'lunar' && f.leap.checked, year: +f.year.value, month: +f.month.value, day: +f.day.value, hour: hasT ? +t.slice(0, 2) : 12, minute: hasT ? +t.slice(3) : 0, hourUnknown: !hasT, city: city ? city[0] : '서울', lon: +f.city.value, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };
      H.engine().then(function (M) {
        try { M.compute(P.toInput(saved)); } catch (err) { msg.textContent = (err && err.message) || '입력을 확인해 주세요.'; return; }
        if (!P.save(saved)) { H.toast('이 브라우저에서는 정보를 저장할 수 없어 이번만 사용합니다.'); }
        H.afterInput(); H.track('saju_input_complete', { next: next, hour_known: hasT ? 1 : 0 });
        H.replace(after(next)); // 입력 화면은 기록에 남기지 않는다(뒤로가기가 입력 폼으로 돌아가지 않게)
      }).catch(function () { msg.textContent = '분석 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'; });
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
  H.route('today', function (q, ctx) {
    needSaju(ctx, 'today', function (ch) {
      var t = Saju.todayData(ch), nm = P.name();
      var cards = FLD.filter(function (f) { return t.fields[f[0]]; }).map(function (f) { var v = t.fields[f[0]]; return '<div class="dc' + (q.f === f[0] ? ' hl' : '') + '" id="d-' + f[0] + '"><small>' + f[2] + '</small><b>' + f[1] + '</b><span>' + esc(v.b) + '</span><div class="bar"><i style="width:' + clamp(v.s) + '%"></i></div></div>'; }).join('');
      var el = H.view('<section class="tscore"><p class="kick">' + t.mo + '월 ' + t.d + '일 ' + t.dow + '요일 · ' + esc(t.gz) + '日</p><div class="ring" style="--p:' + t.score + '"><b>' + t.score + '</b></div><div class="tflow">' + esc(t.phase) + ' · ' + esc(t.cond) + '</div><p class="sub" style="margin-top:6px">' + (nm ? esc(nm) + '님, ' : '') + esc(t.line) + '</p>' + (t.notes.length ? '<p class="note">' + esc(t.notes.join(' ')) + '</p>' : '') + '</section>' +
        '<div class="dgrid">' + cards + '</div>' +
        '<div class="actbox" id="d-action"' + (q.f === 'action' ? ' style="border-color:var(--gold)"' : '') + '><h3>오늘의 행동 가이드</h3><p>오늘의 주 흐름은 <em>' + esc(t.phase) + '</em>입니다 — ' + esc(t.meaning) + '.</p><p>이런 일에 활용해 보세요: ' + esc(t.todo) + '.</p></div>' +
        '<p class="dis">점수는 오늘의 일진이 내 사주에 필요한 기운인지를 따진 값입니다. 사건을 확정하지 않는 참고용 흐름입니다.</p>' +
        '<div class="next2"><a class="btn" href="#/go?to=money" data-track="fortune_content_click" data-p="from_today_money">10년 재물 흐름 보기</a><a class="btn ghost" href="#/my" data-track="fortune_content_click" data-p="from_today_my">MY 운명으로</a></div>');
      H.track('fortune_content_view', { content: 'today', flow: t.flowKey });
      if (q.f) { var tg = $('#d-' + q.f, el); if (tg && tg.scrollIntoView) setTimeout(function () { tg.scrollIntoView({ block: 'center', behavior: H.reduce ? 'auto' : 'smooth' }); }, 120); }
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
    steps.push({ ms: 4200, vid: 'ilgan', html: '<p class="a1 aw-in">당신의 중심은</p><div class="big aw-in">' + esc(ig ? ig.title.split(' · ')[0] : M.STEM[day.s]) + '</div>' + (ig ? '<p class="a1 aw-in">' + br(ig.line) + '</p>' : '') });
    steps.push({ ms: 3200, vid: 'iju', html: '<p class="a1 aw-in">그리고 당신이 태어난 날은</p><div class="big aw-in">' + esc(M.gzName(day)) + '</div>' });
    if (jc) steps.push({ ms: 6500, vid: 'iju', html: '<p class="film aw-in">' + br(jc.film) + '</p><p class="ttl aw-in">' + esc(jc.title) + '</p><p class="trait aw-in">' + br(jc.trait) + '</p>' });
    steps.push({ ms: 2600, vid: 'iju', html: '<p class="film aw-in">이제,<br>당신의 이야기를 시작합니다.</p>' });
    var host = document.createElement('div'); host.id = 'awk'; host.setAttribute('role', 'dialog'); host.setAttribute('aria-label', '일주 각성');
    host.innerHTML = '<video class="vid" muted playsinline loop preload="auto" hidden></video><div class="shade"></div><div class="stage" id="awStage" aria-live="polite"></div><button type="button" class="skip" id="awSkip">건너뛰기 ›</button><div class="tap" aria-hidden="true">TAP</div>';
    document.body.appendChild(host);
    var stage = $('#awStage', host), vid = $('.vid', host), timer = 0, i = -1, done = false, clips = null;
    function setVideo(kind) { // 있을 때만: 일간 영상 → 일주 변신 영상
      var c = clips && (kind === 'iju' ? (clips.video || clips.fallback) : clips.ilgan); var u = c && (c.videoUrl || c.videoWebm);
      if (!u) { vid.classList.remove('on'); return; }
      if (vid.getAttribute('data-k') === kind) return; vid.setAttribute('data-k', kind);
      vid.hidden = false; if (c.posterUrl) vid.poster = c.posterUrl; vid.src = u; vid.onerror = function () { vid.classList.remove('on'); vid.hidden = true; }; vid.oncanplay = function () { vid.classList.add('on'); }; var p = vid.play(); if (p && p.catch) p.catch(function () { });
    }
    function show() {
      clearTimeout(timer); i++; if (i >= steps.length) return finish(false);
      var s = steps[i]; stage.innerHTML = s.html; setVideo(s.vid); timer = setTimeout(show, s.ms);
    }
    function finish(skipped) {
      if (done) return; done = true; clearTimeout(timer); host.remove(); H.cleanup = null;
      if (!replay) P.markAwakened(); H.track('ilju_awakening_complete', { skipped: skipped ? 1 : 0, replay: replay ? 1 : 0 });
      H.replace('#/my');
    }
    H.cleanup = function () { done = true; clearTimeout(timer); };
    host.onclick = function (e) { if (e.target.id === 'awSkip') finish(true); else show(); };
    H.track('ilju_awakening_start', { replay: replay ? 1 : 0 }); show();
    if (!(navigator.connection && navigator.connection.saveData)) fetch('/api/awakening?pillar=' + encodeURIComponent(ju) + '&gender=' + g).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && !done) { clips = d; if (steps[i]) setVideo(steps[i].vid); } }).catch(function () { });
  }

  /* ───────── MY 운명 홈 ───────── */
  var tile = function (title, small, href, p, extra) { return '<a class="tile' + (extra ? ' ' + extra : '') + '" href="' + href + '" data-track="fortune_content_click" data-p="' + p + '"><b>' + title + '</b><small>' + small + '</small></a>'; };
  H.route('my', function (q, ctx) {
    if (!P.has()) return H.replace('#/input?next=my');
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
        '<a class="todaycard" href="#/today" data-track="fortune_content_click" data-p="today_card"><div class="ring" style="--p:' + t.score + '"><b>' + t.score + '</b></div><div><p class="lb">오늘의 흐름 · ' + esc(t.phase) + '</p><h3>' + esc(t.cond) + '의 날</h3><p>' + esc(t.line) + '</p></div></a>' +
        '<section class="grp"><h2>오늘의 나</h2><div class="tiles">' +
        tile('오늘의 운세', '오늘 들어온 흐름', '#/today', 'today') + tile('재물운', '오늘의 돈 흐름', '#/today?f=money', 'today_money') + tile('일·사업운', '오늘의 일 흐름', '#/today?f=work', 'today_work') + tile('연애운', '오늘의 인연 흐름', '#/today?f=love', 'today_love') + tile('컨디션', '몸과 마음의 균형', '#/today?f=health', 'today_health') + tile('오늘의 행동 가이드', '오늘 하면 좋은 일', '#/today?f=action', 'today_action') + '</div></section>' +
        '<section class="grp"><h2>나라는 사람</h2><div class="tiles">' +
        '<button type="button" class="tile wide" id="meBtn" data-track="fortune_content_click" data-p="me_profile"><b>오행 · 십성 · 강점과 주의할 성향</b><small>내 안의 다섯 기운과 가장 큰 동력</small></button>' + me +
        tile('일간 · 일주 다시 보기', '일주 각성 연출', '#/awaken?replay=1', 'ilju_replay', 'wide') + '</div></section>' +
        '<section class="grp"><h2>인생의 흐름</h2><div class="tiles">' + tile('인생 그래프', '대운 · 인생의 계절', '#/go?to=life', 'life_graph') + tile('올해와 12개월', '세운 · 월운', '#/go?to=future', 'life_year') + '</div></section>' +
        '<section class="grp"><h2>돈과 일</h2><div class="tiles">' + tile('돈 이야기', '재물 구조 · 들어오는 길 · 새는 길', '#/go?to=money', 'money') + tile('일과 성공', '직업 적성 · 사업/직장 성향', '#/go?to=career', 'career') + '</div></section>' +
        '<section class="grp"><h2>사람과 사랑</h2><div class="tiles">' + tile('연애 · 인연', '연애 성향과 인연의 때', '#/go?to=love', 'love') + tile('배우자 · 결혼', '어떤 사람과 오래 갈까', '#/go?to=marriage', 'marriage') + tile('인간관계', '편한 사람과 힘든 사람', '#/go?to=relation', 'relation') +
        '<button type="button" class="tile" id="compat" data-track="fortune_content_click" data-p="compat"><b>궁합</b><small>준비 중이에요</small></button></div></section>' +
        '<section class="grp"><h2>심층 콘텐츠</h2><div class="tiles"><a class="tile wide" href="#/go?to=deep" data-track="premium_cta_click" data-p="deep_movingtoon"><b>심층 무빙툰 · 종합 리포트</b><small>20챕터로 읽는 나의 운로 전체</small></a></div></section>' +
        '<p class="dis">사주는 참고용 콘텐츠이며 미래를 단정하지 않습니다.</p>');
      $('#meBtn', el).onclick = function () { var b = $('#meBody', el); b.hidden = !b.hidden; };
      $('#compat', el).onclick = function () { H.toast('궁합은 곧 열립니다.'); };
      H.track('fortune_home_view', { awakened: 1 });
    });
  });
})(window);
