/* 인생 지도 흐름(Life Flow) 화면 — PROLOGUE(전체 인생) → YOU ARE HERE → 관심 분야 선택 → 심화(기존 챕터 재사용 + 시간축 카드) → FINAL(행동 전략).
   값은 전부 StoryDirector(엔진 계산 결과를 읽기만 함)에서 온다. 이 파일은 그리기만 한다. 뷰어(viewer.js)가 host 를 넘겨 준다.
   host: { M, ch, sd, now, name, esc, show(), track(), toast(), playChapters(bases, opt), plan, gate } */
(function () {
  'use strict';
  var R = window.ReportV2, D = R.StoryDirector, $ = function (s, e) { return (e || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || document).querySelectorAll(s)); };
  var H, st, box, ICON = { opportunity: '◆', expansion: '▲', harvest: '●', accumulation: '■', transition: '◇', defense: '▽' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var br = function (s) { return esc(s).replace(/\n/g, '<br>'); };
  var MAX_AGE = 90;

  function begin(host) {
    H = host; box = $('#v-life'); st = { field: 'all', zoom: 'life', decade: null, year: null, interest: H.interest || null, flow: null, done: {}, map: null, cache: {} };
    st.map = D.lifeMap(H.M, H.ch, H.now).filter(function (x) { return x.startAge <= MAX_AGE; });
    try { st.rule = D.social(H.M, H.ch, H.sd, H.now); st.soc = st.rule; } catch (e) { st.soc = null; } // 즉시 쓰는 규칙 추정. AI 추정이 도착하면 바꿔 끼운다
    loadAi();
    H.show(); H.track('life_started', {}); opening();
  }

  /* ── 0. 첫 질문 ─ 명리학 설명 없이 인생 전체를 묻는다 ─────────────────────── */
  function opening() {
    var lines = ['당신의 인생을\n90년짜리 지도처럼 펼쳐보면\n어떤 모습일까요?', '사람마다 인생이 움직이는 시기는 다릅니다.', '일찍 기회를 만나는 사람이 있고,\n조금 늦게 힘을 받는 사람도 있습니다.', '그렇다면 당신은 언제일까요?'], i = 0;
    box.className = 'view lf lf-open'; box.innerHTML = '<div class="lf-wrap"><p class="lf-kick">MANTRA · 運路</p><p class="lf-q" id="lfQ"></p><button type="button" class="btn big" id="lfNext">다음</button><button type="button" class="lf-skip" id="lfSkip">건너뛰기 ›</button></div>';
    var q = $('#lfQ', box), n = $('#lfNext', box);
    function show() { q.style.opacity = 0; setTimeout(function () { q.innerHTML = br(lines[i]); q.style.opacity = 1; n.textContent = i === lines.length - 1 ? '내 인생 지도 펼치기' : '다음'; }, 200); }
    show(); n.onclick = function () { if (i < lines.length - 1) { i++; show(); } else mapScreen(); }; $('#lfSkip', box).onclick = mapScreen;
  }

  /* ── 1. PROLOGUE: 인생 전체 지도 → 10년 → 연도 → 12개월 (확대) ───────────────── */
  var FIELDTAB = function () { return D.FIELDS.map(function (f) { return '<button type="button" role="tab" class="lf-tab' + (st.field === f.id ? ' on' : '') + (f.available ? '' : ' off') + '" data-f="' + f.id + '" aria-selected="' + (st.field === f.id) + '"' + (f.available ? '' : ' aria-disabled="true"') + '>' + f.name + '</button>'; }).join(''); };
  function val(it) { // 한 칸의 높이 값(0~100). 종합은 흐름 점수(-100~100)를 0~100 으로, 분야는 엔진 점수 그대로. 데이터가 없으면 null
    var f = it.fields && it.fields[st.field]; if (!f) return null; return st.field === 'all' ? Math.max(0, Math.min(100, (f.fit + 100) / 2)) : f.score;
  }
  function curve(items, o) { // 인생의 지형: 부드러운 면 + 계절 기호. 숫자 점수는 보여 주지 않는다
    var vs = items.map(val).filter(function (v) { return v != null; }), lo = Math.min.apply(null, vs.concat([100])) - 8, hi = Math.max.apply(null, vs.concat([0])) + 8; if (hi - lo < 40) { var mid = (hi + lo) / 2; lo = mid - 20; hi = mid + 20; } // 지형이 보이도록 이 화면의 값 범위에 맞춰 늘린다(숫자 점수는 보이지 않는다)
    var W = 320, Hh = 120, n = items.length, pad = 18, xs = items.map(function (_, i) { return pad + (W - pad * 2) * (n === 1 ? .5 : i / (n - 1)); }), pts = items.map(function (it, i) { var v = val(it); return v == null ? null : [xs[i], Hh - 14 - (Hh - 40) * (v - lo) / (hi - lo)]; });
    var ok = pts.filter(Boolean), d = '';
    if (ok.length > 1) { d = 'M' + ok[0][0] + ',' + ok[0][1]; for (var k = 1; k < ok.length; k++) { var a = ok[k - 1], b = ok[k], cx = (a[0] + b[0]) / 2; d += ' C' + cx + ',' + a[1] + ' ' + cx + ',' + b[1] + ' ' + b[0] + ',' + b[1]; } }
    var area = d ? d + ' L' + ok[ok.length - 1][0] + ',' + (Hh - 14) + ' L' + ok[0][0] + ',' + (Hh - 14) + ' Z' : '';
    var cols = items.map(function (it, i) { var w = (W - pad * 2) / Math.max(1, n - 1); return '<rect x="' + (xs[i] - w / 2) + '" y="0" width="' + w + '" height="' + Hh + '" fill="transparent" data-i="' + i + '" class="lf-hit"><title>' + esc(it.label) + '</title></rect>'; }).join('');
    var dots = items.map(function (it, i) { var p = pts[i]; if (!p) return '<circle cx="' + xs[i] + '" cy="' + (Hh - 14) + '" r="2" class="lf-nodata"/>'; return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (it.isCurrent ? 5 : 3) + '" class="lf-dot' + (it.isCurrent ? ' cur' : '') + '"/>'; }).join('');
    var cur = items.filter(function (it) { return it.isCurrent; })[0], ci = cur ? items.indexOf(cur) : -1, here = ci >= 0 ? '<line x1="' + xs[ci] + '" x2="' + xs[ci] + '" y1="6" y2="' + (Hh - 14) + '" class="lf-hereline"/>' : '';
    return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" class="lf-svg" role="img" aria-label="' + esc(o.aria) + '"><path d="' + area + '" class="lf-area"/><path d="' + d + '" class="lf-line"/>' + here + dots + cols + '</svg>';
  }
  function rows(items, o) { // 지형 아래 목록: 구간 · 계절 기호 · 한 줄 설명(눌러서 확대)
    return '<ol class="lf-rows">' + items.map(function (it, i) { var f = it.fields && it.fields[st.field], band = f && f.band, sea = it.season;
      return '<li><button type="button" class="lf-row' + (it.isCurrent ? ' cur' : '') + '" data-i="' + i + '"' + (it.pre ? ' disabled' : '') + '><span class="lf-age">' + esc(it.label) + '</span><span class="lf-sea' + (sea ? ' s-' + sea : '') + '">' + (sea ? '<b aria-hidden="true">' + ICON[sea] + '</b> ' + esc(it.seasonName) : '—') + '</span><span class="lf-desc">' + esc(it.pre ? it.tag : (st.field === 'all' ? (it.tag || it.label2 || '') : (band ? '이 분야 · ' + band : ''))) + '</span>' + (it.isCurrent ? '<span class="lf-now">지금</span>' : '') + '</button></li>'; }).join('') + '</ol>';
  }
  function itemsFor() {
    if (st.zoom === 'life') return D.attachSocial(st.map.map(function (x) { return Object.assign({}, x, { label: x.pre ? '0~' + x.endAge + '세' : x.startAge + '~' + x.endAge + '세' }); }), st.soc, 'decade');
    var key = st.zoom + ':' + (st.zoom === 'years' ? st.decade : st.year) + ':' + (st.soc && st.soc.source); if (st.cache[key]) return st.cache[key];
    var out;
    if (st.zoom === 'years') { var d = st.map[st.decade]; out = D.yearsOf(H.M, H.ch, d.startYear, d.endYear, H.now).map(function (y) { return Object.assign({}, y, { label: y.year + '년 · ' + y.age + '세', isCurrent: y.isNow }); }); D.attachSocial(out, st.soc, 'year'); }
    else out = D.monthsOf(H.M, H.ch, st.year, H.now).map(function (m) { return Object.assign({}, m, { label: m.month + '월', isCurrent: m.isNow }); });
    return (st.cache[key] = out);
  }
  function crumbs() {
    var h = '<button type="button" data-z="life">나의 인생 전체</button>';
    if (st.decade != null && st.zoom !== 'life') { var d = st.map[st.decade]; h += ' › <button type="button" data-z="years">' + d.startAge + '~' + d.endAge + '세</button>'; }
    if (st.zoom === 'months') h += ' › <b>' + st.year + '년의 열두 달</b>';
    return '<nav class="lf-crumb" aria-label="시간 확대 단계">' + h + '</nav>';
  }
  function mapScreen() {
    box.className = 'view lf'; var items = itemsFor(), fld = D.FIELDS.filter(function (f) { return f.id === st.field; })[0];
    var title = st.zoom === 'life' ? '당신의 인생 지도' : st.zoom === 'years' ? st.map[st.decade].startAge + '~' + st.map[st.decade].endAge + '세, 해마다' : st.year + '년, 달마다';
    var hint = st.zoom === 'life' ? '구간을 눌러 10년씩 확대해 보세요.' : st.zoom === 'years' ? '해를 눌러 12개월로 더 확대해 보세요.' : '달마다 어울리는 움직임이 다릅니다.';
    var srcName = st.soc && st.soc.source === 'ai' ? 'AI 추정' : '규칙 추정', note = !fld.available ? '<p class="lf-note">이 분야의 시기별 흐름은 아직 계산 모델이 없어 보여 드리지 않습니다.</p>' : (fld.ai ? '<p class="lf-note"><b>' + srcName + '</b> · ' + (st.zoom === 'months' ? '관계 흐름은 월 단위로 제공하지 않습니다. 한 단계 넓게 보세요.' : '엔진에 인간관계 전용 모델이 없어 대운·세운의 십성·합충을 근거로 추정한 값입니다.') + '</p>' : '');
    box.innerHTML = '<div class="lf-wrap"><p class="lf-kick">PROLOGUE · 전체 인생</p><h2 class="lf-h">' + esc(title) + '</h2><p class="lf-sub">' + esc(hint) + '</p>' + crumbs() +
      '<div class="lf-tabs" role="tablist" aria-label="분야 보기">' + FIELDTAB() + '</div>' + note + (fld.available && !(fld.ai && st.zoom === 'months') ? '<div class="lf-chart">' + curve(items, { aria: title }) + '</div>' + rows(items, {}) : '') +
      '<p class="lf-fine">시기의 성격을 보여 줄 뿐, 특정한 사건을 예언하지 않습니다.</p>' +
      (st.zoom === 'life' ? '<button type="button" class="btn big gold" id="lfHere">지금 내가 서 있는 곳 보기</button>' : '<button type="button" class="btn big" id="lfUp">‹ 한 단계 넓게 보기</button>') + '</div>';
    box.onclick = function (e) {
      var t = e.target.closest('[data-f]'); if (t) { var f = D.FIELDS.filter(function (x) { return x.id === t.dataset.f; })[0]; st.field = f.id; H.track('life_field', { field: f.id }); mapScreen(); return; }
      var z = e.target.closest('[data-z]'); if (z) { st.zoom = z.dataset.z; if (st.zoom === 'life') { st.decade = null; st.year = null; } else st.year = null; mapScreen(); return; }
      var r = e.target.closest('[data-i]'); if (r) { var i = +r.dataset.i, it = items[i]; if (!it || it.pre) return;
        if (st.zoom === 'life') { st.decade = i; st.zoom = 'years'; } else if (st.zoom === 'years') { st.year = it.year; st.zoom = 'months'; } else return; H.track('life_zoom', { level: st.zoom }); mapScreen(); window.scrollTo(0, 0); return; }
      if (e.target.id === 'lfHere') here(); if (e.target.id === 'lfUp') { st.zoom = st.zoom === 'months' ? 'years' : 'life'; if (st.zoom === 'life') st.decade = null; mapScreen(); }
    };
    window.scrollTo(0, 0);
  }

  /* ── 2. ACT 1 — YOU ARE HERE ─ 현실 언어 먼저, 근거는 [왜 이렇게 나오나요?] 안에 ───── */
  function here() {
    var pos = D.position(H.M, H.ch, H.sd, H.now); st.pos = pos; box.className = 'view lf';
    var cur = st.map.filter(function (x) { return x.isCurrent; })[0], items = st.map.map(function (x) { return Object.assign({}, x, { label: x.startAge + '~' + x.endAge + '세' }); }), prevField = st.field; st.field = 'all';
    var fl = Object.keys(pos.fields).map(function (k) { var nm = { money: '돈', career: '일', love: '사랑' }[k]; return '<div class="lf-fcard"><b>' + nm + '</b><span>' + esc(pos.fields[k].line) + '</span></div>'; }).join('');
    box.innerHTML = '<div class="lf-wrap"><p class="lf-kick">ACT 1 · 현재 위치</p><p class="lf-q sm">긴 인생에서<br>지금 당신이 서 있는 곳은…</p>' +
      '<div class="lf-chart">' + curve(items, { aria: '인생 지도에서 지금 위치' }) + '</div><div class="lf-hereb"><b>' + pos.year + '</b><span>YOU ARE HERE</span><i>' + pos.age + '세</i></div>' +
      '<h2 class="lf-h">지금 당신은<br><em>' + esc(pos.seasonName) + '</em>에 있습니다.</h2><p class="lf-lead">' + esc(pos.headline) + '</p>' + pos.body.map(function (b) { return '<p class="lf-p">' + esc(b) + '</p>'; }).join('') +
      (pos.decadeLine ? '<p class="lf-p dim">' + esc(pos.decadeLine) + '</p>' : '') + '<div class="lf-dt"><div><small>지금 할 일</small>' + esc(pos.doThis) + '</div><div class="warn"><small>함정</small>' + esc(pos.trap) + '</div></div>' + (fl ? '<div class="lf-fcards">' + fl + '</div>' : '') +
      '<details class="lf-why"><summary>왜 이렇게 나오나요?</summary><dl>' + pos.evidence.map(function (e) { return '<dt>' + esc(e.k) + '</dt><dd>' + esc(e.v) + '</dd>'; }).join('') + '</dl><p class="lf-fine">명리학 근거는 이 화면의 결론을 만든 실제 계산 값입니다.</p></details>' +
      '<button type="button" class="btn big gold" id="lfPick">가장 궁금한 이야기 고르기</button><button type="button" class="lf-skip" id="lfBack">‹ 인생 지도로</button></div>';
    st.field = prevField; $('#lfPick', box).onclick = pick; $('#lfBack', box).onclick = mapScreen; box.onclick = null; window.scrollTo(0, 0); H.track('life_here', { season: pos.seasonKey });
  }

  /* ── 3. ACT 2 — 관심 분야 선택 ───────────────────────────────────────────── */
  function pick() {
    box.className = 'view lf';
    box.innerHTML = '<div class="lf-wrap"><p class="lf-kick">ACT 2 · 관심 분야</p><h2 class="lf-h">그렇다면 지금,<br>가장 궁금한 이야기는 무엇인가요?</h2><div class="lf-cards">' +
      D.INTERESTS.map(function (it) { return '<button type="button" class="lf-card" data-it="' + it.id + '"><i aria-hidden="true">' + it.icon + '</i><b>' + esc(it.name) + '</b><span>' + br(it.hook) + '</span></button>'; }).join('') + '</div></div>';
    box.onclick = function (e) { var c = e.target.closest('[data-it]'); if (c) { st.interest = c.dataset.it; H.track('life_interest', { interest: st.interest }); steps(); } };
    window.scrollTo(0, 0);
  }

  /* ── 4. 이야기 순서(Story Flow): 이 사용자에게 실제로 생성된 순서. 무료·잠금 표시 ───── */
  function steps() {
    var fl = st.flow = D.flow(st.interest, { pos: st.pos || D.position(H.M, H.ch, H.sd, H.now) }), it = D.INTERESTS.filter(function (x) { return x.id === st.interest; })[0]; box.className = 'view lf';
    var gate = !!H.gate, rowsH = fl.steps.map(function (s, i) { var lock = gate && s.premium, done = st.done[s.id];
      return '<li><button type="button" class="lf-step' + (lock ? ' lock' : '') + (done ? ' done' : '') + '" data-s="' + i + '"><span class="no">' + String(i + 1).padStart(2, '0') + '</span><span class="tt"><b>' + esc(s.title) + '</b><small>' + esc(s.sub) + (s.note ? ' · ' + esc(s.note) : '') + '</small></span><span class="st">' + (lock ? '🔒' : done ? '✓' : '›') + '</span></button></li>'; }).join('');
    box.innerHTML = '<div class="lf-wrap"><p class="lf-kick">ACT 3 · ' + esc(it.name) + '</p><h2 class="lf-h">' + esc(it.name) + ' 이야기,<br>이 순서로 펼쳐 봅니다.</h2><p class="lf-sub">' + (gate ? '앞부분은 바로 열려 있고, 나머지는 “내 이야기 전체 열기”로 볼 수 있습니다.' : '위에서부터 차례로 읽으면 한 편의 이야기가 됩니다.') + '</p><ol class="lf-steps">' + rowsH + '</ol>' +
      (gate ? '<div class="lf-lockbox"><p>당신의 인생에는<br>아직 열어보지 않은 이야기가 있습니다.</p><button type="button" class="btn big gold" id="lfOpenAll">내 이야기 전체 열기</button></div>' : '') +
      '<div class="lf-two"><button type="button" class="btn" id="lfOther">다른 분야 고르기</button><button type="button" class="btn" id="lfMapB">인생 지도</button></div></div>';
    box.onclick = function (e) {
      if (e.target.id === 'lfOther') return pick(); if (e.target.id === 'lfMapB') return mapScreen(); if (e.target.id === 'lfOpenAll') { H.track('life_unlock_cta', {}); H.toast('전체 열기는 곧 열립니다.'); return; }
      var b = e.target.closest('[data-s]'); if (b) openStep(+b.dataset.s);
    };
    window.scrollTo(0, 0);
  }
    function openStep(i) {
    var s = st.flow.steps[i]; if (H.gate && s.premium) { H.track('life_locked_click', { step: s.id }); H.toast('이 이야기는 “내 이야기 전체 열기”에서 볼 수 있습니다.'); return; }
    H.track('life_step', { step: s.id }); var done = function () { st.done[s.id] = 1; steps(); };
    if (s.kind === 'life') { st.zoom = 'life'; st.decade = null; mapScreen(); st.done.life = 1; return; }
    if (s.kind === 'here') { here(); st.done.here = 1; return; }
    if (s.id === 'act_remedy') return final();
    if (s.gen && !s.chapters.length) return genScreen(s, done);
    if (R.StoryComposer && R.StoryComposer.has(s.id)) return composeScreen(s, done);
    deep(s, done);
  }

  /* ── 5. 시간축 카드(엔진 실데이터): "언제?" · 앞으로 10년 ───────────────────────── */
  function genScreen(s, done) {
    var h = '<div class="lf-wrap"><p class="lf-kick">' + esc(s.sub) + '</p><h2 class="lf-h">' + esc(s.title) + '</h2>';
    if (/^social:/.test(s.gen)) {
      var sf = s.gen.split(':')[1], sn = sf === 'marriage' ? '인연' : '사람 사이', t2 = D.timing(H.M, H.ch, H.sd, H.now, sf, st.soc);
      h += '<p class="lf-lead">' + esc(t2.line) + '</p><p class="lf-note"><b>' + (t2.source === 'ai' ? 'AI 추정' : '규칙 추정') + '</b> · ' + esc(t2.caution || '') + '</p>' + (t2.note ? '<p class="lf-p">' + esc(t2.note) + '</p>' : '') + (t2.windows || []).map(function (w) { return '<div class="lf-fu exp"><small>' + sn + '의 움직임이 커질 수 있는 구간</small><b>' + esc(w.range) + '</b> ' + esc(w.note || '') + '</div>'; }).join('');
      if (t2.years) h += '<div class="lf-bars" role="img" aria-label="앞으로 10년 ' + sn + ' 흐름">' + t2.years.map(function (y) { var on = (t2.windows || []).some(function (w) { return y.year >= w.fromYear && y.year <= w.toYear; }); return '<div class="lf-bar' + (on ? ' on' : '') + '"><i style="height:' + Math.max(8, y.score) + '%"></i><b>' + String(y.year).slice(2) + '</b><small>' + esc(y.band) + '</small></div>'; }).join('') + '</div>';
    } else if (/^timing:/.test(s.gen)) {
      var f = s.gen.split(':')[1], t = D.timing(H.M, H.ch, H.sd, H.now, f), nm = { money: '돈', career: '일', love: '인연' }[f];
      h += '<p class="lf-lead">' + esc(t.line) + '</p>' + (s.proxy ? '<p class="lf-note">결혼 전용 계산이 아니라 인연·관계의 활성도를 기준으로 한 참고 흐름입니다.</p>' : '');
      if (t.years) h += '<div class="lf-bars" role="img" aria-label="앞으로 10년 ' + nm + ' 흐름">' + t.years.map(function (y) { var on = t.windows.some(function (w) { return y.year >= w.fromYear && y.year <= w.toYear; }); return '<div class="lf-bar' + (on ? ' on' : '') + '"><i style="height:' + Math.max(8, y.score) + '%"></i><b>' + String(y.year).slice(2) + '</b><small>' + esc(y.band) + '</small></div>'; }).join('') + '</div><p class="lf-fine">막대가 진한 해가 상대적으로 ' + nm + ' 이야기가 두드러지는 해입니다.</p>';
      h += '<p class="lf-fine">' + esc(t.caution || '') + '</p>';
    } else if (s.gen === 'future') {
      var fu = D.future(H.M, H.ch, H.sd, H.now, 10), sec = function (t, g, cls) { return g.length ? '<div class="lf-fu ' + cls + '"><small>' + t + '</small>' + g.map(function (x) { return '<b>' + x.range + '</b> ' + (x.fromAge === x.toAge ? x.fromAge + '세' : x.fromAge + '~' + x.toAge + '세'); }).join(' · ') + '</div>' : ''; };
      h += '<p class="lf-lead">앞으로 3년은 ' + fu.years.slice(0, 3).map(function (y) { return y.seasonName; }).join(' → ') + ' 순으로 흘러갑니다.</p>' + sec('가장 큰 전환 구간', fu.change, 'chg') + sec('확장하기 좋은 구간', fu.expand, 'exp') + sec('성과를 굳히는 구간', fu.harvest, 'hv') + sec('지키는 것이 중요한 구간', fu.protect, 'pr') + sec('준비해야 하는 구간', fu.prepare, 'pp') +
        '<div class="lf-yrs">' + fu.years.map(function (y) { return '<div class="lf-yr' + (y.isNow ? ' now' : '') + '"><b>' + y.year + '</b><span class="lf-sea s-' + y.season + '"><b aria-hidden="true">' + (ICON[y.season] || '') + '</b> ' + esc(y.seasonName) + '</span></div>'; }).join('') + '</div><p class="lf-fine">' + esc(fu.caution) + '</p>';
    }
    box.className = 'view lf'; box.innerHTML = h + '<button type="button" class="btn big" id="lfDone">이야기 목록으로</button></div>'; $('#lfDone', box).onclick = done; box.onclick = null; window.scrollTo(0, 0);
  }

  /* ── 관계·결혼 AI 추정 로딩: 기기 캐시 → 서버(/api/life-ai, 생년월일 없음). 실패하면 규칙 추정을 그대로 쓴다. ── */
  function loadAi() {
    var pl; try { pl = D.aiPayload(H.M, H.ch, H.sd); } catch (e) { return; }
    var key = 'mt_life_ai_l2_' + hash(JSON.stringify(pl)), got; try { got = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { }
    function apply(ai) { if (!ai) return; st.soc = D.mergeSocial(st.rule, ai); st.cache = {}; if (st.field === 'relation' && box.querySelector('.lf-tabs')) mapScreen(); }
    if (got) { apply(got); return; }
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    fetch('/api/life-ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(pl), signal: ctl && ctl.signal }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok && d.result) { try { localStorage.setItem(key, JSON.stringify(d.result)); } catch (e) { } apply(d.result); H.track('life_ai_ok', { cached: !!d.cached }); } else H.track('life_ai_fail', { err: d && d.error || '' }); }).catch(function () { H.track('life_ai_fail', {}); }).then(function () { clearTimeout(tm); });
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  /* ── 새 문체 카드: 한 장면에 하나의 주장(결론 → 현실 → 예시 → 장점 → 함정 → 행동 → 근거). 끝에서 기존 챕터로 더 깊이 읽을 수 있다. ── */
  function deep(s, done) {
    var rn = s.chapters.map(function (b, i) { return i === 0 ? { title: s.title, sub: (s.id === 'self_who' ? H.sd.dayPillar.ko + '일주 · ' + H.sd.dayPillar.hanja + ' — ' : '') + s.sub } : null; });
    H.playChapters(s.chapters, { kicker: 'DEEP DIVE', title: s.title, rename: rn, onBack: done });
  }
  function composeScreen(s, done) {
    var C = R.StoryComposer, sc = C.scenes(s.id, H.sd), i = 0; if (!sc.length) return deep(s, done); box.className = 'view lf lf-scene';
    function draw() {
      var x = sc[i], last = i === sc.length - 1;
      box.innerHTML = '<div class="lf-wrap lf-sc"><p class="lf-kick">' + esc(s.title) + ' · ' + (i + 1) + ' / ' + sc.length + '</p><div class="lf-prog"><i style="width:' + Math.round((i + 1) / sc.length * 100) + '%"></i></div><div class="lf-sbody k-' + x.kind + '"><small>' + esc(x.cap) + '</small><p>' + esc(x.text) + '</p></div>' +
        (last ? '<details class="lf-why"><summary>왜 이렇게 나오나요?</summary><dl>' + C.evidence(s.id, H.sd).map(function (e) { return '<dt>' + esc(e.k) + '</dt><dd>' + esc(e.v) + '</dd>'; }).join('') + '</dl><p class="lf-fine">' + esc(s.sub) + ' 분석에서 나온 값입니다.</p></details>' : '') +
        '<div class="lf-two">' + (i ? '<button type="button" class="btn" id="lfPrev">이전</button>' : '') + (last ? '<button type="button" class="btn gold" id="lfMore">더 깊이 읽기</button>' : '<button type="button" class="btn gold" id="lfNx">다음</button>') + '</div>' + (last ? '<button type="button" class="lf-skip" id="lfDone2">이야기 목록으로</button>' : '') + '</div>';
      window.scrollTo(0, 0);
    }
    box.onclick = function (e) { var id = e.target.id; if (id === 'lfNx') { i++; draw(); } else if (id === 'lfPrev') { i--; draw(); } else if (id === 'lfMore') deep(s, done); else if (id === 'lfDone2') done(); };
    draw(); H.track('life_scene_card', { step: s.id });
  }

  /* ── 6. FINAL — 그래서 지금 무엇을 해야 하는가 ──────────────────────────────── */
  function final() {
    var pos = st.pos || D.position(H.M, H.ch, H.sd, H.now), a = D.action(H.sd, H.plan, pos.seasonKey), col = function (t, cls, arr) { return '<div class="lf-col ' + cls + '"><small>' + t + '</small><ul>' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; };
    box.className = 'view lf'; box.innerHTML = '<div class="lf-wrap"><p class="lf-kick">FINAL · 행동 전략</p><h2 class="lf-h">그래서 지금,<br>무엇을 해야 할까요?</h2><p class="lf-sub">' + esc(pos.seasonName) + '의 흐름에 맞춘 세 가지입니다.</p>' + col('버릴 것', 'drop', a.drop) + col('지킬 것', 'keep', a.keep) + col('시작할 것', 'start', a.start) +
      '<button type="button" class="btn big" id="lfRemedy">개운법·나의 사용설명서 자세히 보기</button><div class="lf-two"><button type="button" class="btn" id="lfOther">다른 분야 보기</button><button type="button" class="btn" id="lfBackS">이야기 목록</button></div></div>';
    box.onclick = function (e) { if (e.target.id === 'lfOther') pick(); else if (e.target.id === 'lfBackS') steps(); else if (e.target.id === 'lfRemedy') { st.done.act_remedy = 1; H.playChapters(['c19', 'c20'], { kicker: 'ACTION', title: '개운 · 사용설명서', onBack: function () { final(); } }); } };
    st.done.act_remedy = 1; H.track('life_final', {}); window.scrollTo(0, 0);
  }

  R.Life = { begin: begin, steps: function () { steps(); } };
})();
