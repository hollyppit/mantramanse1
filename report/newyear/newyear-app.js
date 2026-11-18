/* 2027 정미년 신년운세 화면. 풀이는 서버(/api/newyear/reading)가 조합하고, 이 파일은 입력·장 넘김·잠금/구매·이어보기·PDF만 맡는다.
   로그인·결제는 무빙툰과 같은 흐름(report/v2/paywall.js: Supabase 로그인, 포트원 KPN 결제, 복귀 확인)을 그대로 쓴다. */
(function (root) {
  'use strict';
  var YEAR = 2027, PRODUCT = 'tj' + YEAR, LS_KEY = 'mt_ny_' + YEAR, HANDOFF = 'mt_ny_input';
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var won = function (n) { return (+n || 0).toLocaleString('ko-KR') + '원'; };
  var lsGet = function (k) { try { return JSON.parse(root.localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { if (v == null) root.localStorage.removeItem(k); else root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  var ssTake = function (k) { try { var v = root.sessionStorage.getItem(k); root.sessionStorage.removeItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  var ssSet = function (k, v) { try { root.sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  var PW = function () { return root.ReportV2 && root.ReportV2.Paywall; };
  var S = { birth: null, data: null, idx: 0, month: 0, remember: true, pwReady: null };
  var ROLE_LABEL = { good: '좋은 점', caution: '조심할 점' };
  var DIR = { good: '좋음', neutral: '보통', caution: '조심', burden: '버팀' };
  var CMP = { same: '두 풀이 같은 방향', near: '결이 조금 다름', different: '두 풀이 다르게 봄', unknown: '' };

  // ── 화면 전환
  function view(name) { ['input', 'loading', 'msg', 'read'].forEach(function (v) { $('#v-' + v).hidden = v !== name; }); $('#ny').dataset.view = name; root.scrollTo(0, 0); }
  function msg(title, body, retry) { $('#ny-msg-t').textContent = title; $('#ny-msg-b').textContent = body || ''; $('#ny-retry').hidden = !retry; view('msg'); }

  // ── 입력 폼
  var form = $('#ny-form');
  function fillSelect(sel, from, to, suffix, keep) { var v = keep || sel.value; sel.innerHTML = ''; for (var i = from; i <= to; i++) { var o = document.createElement('option'); o.value = i; o.textContent = i + suffix; sel.appendChild(o); } if (v && +v >= from && +v <= to) sel.value = v; }
  function daysIn() {
    var y = +form.year.value, m = +form.month.value, lunar = form.calendar.value === 'lunar';
    if (!lunar) return new Date(Date.UTC(y, m, 0)).getUTCDate();
    try { root.Manse.lunarToSolar(y, m, 30, form.leap.checked); return 30; } catch (e) { return 29; }
  }
  function syncForm() {
    var lunar = form.calendar.value === 'lunar';
    form.leap.parentNode.classList.toggle('off', !lunar); if (!lunar) form.leap.checked = false;
    fillSelect(form.day, 1, daysIn(), '일');
    form.time.disabled = form.unknown.checked;
  }
  fillSelect(form.year, 1900, YEAR - 1, '년', 1990); fillSelect(form.month, 1, 12, '월', 1); fillSelect(form.day, 1, 31, '일', 1);
  form.addEventListener('change', syncForm); syncForm();
  function readForm() {
    var b = { year: +form.year.value, month: +form.month.value, day: +form.day.value, calendar: form.calendar.value };
    if (b.calendar === 'lunar' && form.leap.checked) b.leap = true;
    if (!form.unknown.checked && form.time.value) { var t = form.time.value.split(':'); b.hour = +t[0]; b.minute = +t[1]; } else b.hour = null;
    var g = form.querySelector('input[name=gender]:checked'); if (g) b.gender = g.value;
    return b;
  }
  function writeForm(b) {
    if (!b) return;
    form.calendar.value = b.calendar === 'lunar' ? 'lunar' : 'solar'; form.year.value = b.year; form.month.value = b.month; syncForm();
    form.leap.checked = !!b.leap; syncForm(); form.day.value = b.day;
    if (Number.isInteger(b.hour)) { form.unknown.checked = false; form.time.value = String(b.hour).padStart(2, '0') + ':' + String(b.minute || 0).padStart(2, '0'); } else form.unknown.checked = true;
    var g = form.querySelector('input[name=gender][value="' + b.gender + '"]'); if (g) g.checked = true;
    syncForm();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var b = readForm(), err = $('#ny-form-err');
    try { if (b.calendar === 'lunar') root.Manse.lunarToSolar(b.year, b.month, b.day, !!b.leap); } catch (x) { err.textContent = x.message; err.hidden = false; return; }
    err.hidden = true; S.remember = form.remember.checked; start(b, 0);
  });

  // ── 사주 식별값(구매 권한 열쇠): 무빙툰과 같은 규칙 — 네 기둥 한자 + 성별(서버 _commerce.sajuKey 와 같음)
  function sdOf(b) {
    var inp = { year: b.year, month: b.month, day: b.day, calendar: b.calendar, leap: !!b.leap };
    if (Number.isInteger(b.hour)) { inp.hour = b.hour; inp.minute = b.minute || 0; }
    var ch = root.Manse.compute(inp), P = ch.pillars, h = function (p) { return p ? { hanja: root.Manse.gzName(p) } : null; };
    return { pillars: { year: h(P.year), month: h(P.month), day: h(P.day), hour: ch.hourKnown ? h(P.hour) : null }, gender: b.gender };
  }

  // ── 시작·불러오기
  function start(b, idx) {
    S.birth = b; S.idx = idx || 0; S.month = 0;
    try { if (root.NewyearLook) root.NewyearLook.setPerson(sdOf(b).pillars.day.hanja.charAt(0), b.gender); } catch (e) { }   // 패널 이미지: 일간 오행·성별
    lsSet(LS_KEY, S.remember ? { birth: b, idx: S.idx } : null);
    var pw = PW();
    if (pw && !S.pwReady) S.pwReady = pw.init(sdOf(b), { chapters: function () { return []; }, resume: function () { return { inp: S.birth, __ny: true }; }, onPurchased: function () { load(); } }).catch(function () { });
    else if (pw) pw._state.sd = sdOf(b);
    load();
  }
  function headers() {
    var h = { 'content-type': 'application/json' }, pw = PW();
    if (pw) Object.assign(h, pw.headers());
    if (/[?&]preview=1/.test(root.location.search) && h.authorization) h['x-content-mode'] = 'preview';   // 관리자 미리보기(검수 전 문구 포함)
    return h;
  }
  function load() {
    view('loading');
    var go = function () {
      return fetch('/api/newyear/reading', { method: 'POST', headers: headers(), body: JSON.stringify({ birth: S.birth, year: YEAR }) })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); });
    };
    var panels = root.NewyearLook ? root.NewyearLook.loadPanels().catch(function () { }) : Promise.resolve();
    (S.pwReady || Promise.resolve()).then(go).then(function (x) { return panels.then(function () { return x; }); }).then(function (x) {
      if (x.status === 400) return msg('출생 정보를 확인해 주세요', x.j.message || '입력한 날짜로 계산하지 못했어요.', false);
      if (!x.j.ok) return msg('풀이를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.', true);
      if (x.j.access.state === 'closed') return msg('2027 신년운세는 곧 열려요', '지금은 준비 중이에요. 공개되면 이 화면에서 바로 볼 수 있어요.', false);
      S.data = x.j; S.idx = Math.min(S.idx, x.j.reading.chapters.length - 1);
      view('read'); render();
    }).catch(function () { msg('연결이 끊겼어요', '인터넷 연결을 확인한 뒤 다시 시도해 주세요. 입력한 정보는 그대로 있어요.', true); });
  }

  // ── 읽기 화면
  function chapters() { return S.data ? S.data.reading.chapters : []; }
  function p(x) {
    var cls = 'ny-p ' + x.role;
    return '<p class="' + cls + '">' + esc(x.text) + '</p>';
  }
  function paras(list) { return (list || []).map(p).join(''); }
  function lockCard(ch) {
    var a = S.data.access, prod = S.data.product || {}, info = PW() && PW().info(), cfg = (info && info.configured) || {};
    var titles = chapters().filter(function (c) { return c.locked; }).map(function (c) { return '<li>' + esc(c.title) + '</li>'; }).join('');
    var body;
    if (!prod.onSale) body = '<p>이 장은 정식 판매가 시작되면 열려요. 조금만 기다려 주세요.</p>';
    else if (a.reason === 'login') {
      var ls = ['kakao', 'naver', 'google'].filter(function (k) { return k === 'naver' ? cfg.naver : cfg.login; });
      body = '<div class="price">' + won(prod.price) + '</div><p>구매하려면 먼저 로그인해 주세요. 로그인한 뒤 이 화면으로 돌아와요.</p>' +
        '<div class="ny-actions" style="justify-content:center">' + ls.map(function (k) { return '<button type="button" class="ny-btn' + (k === 'kakao' ? '' : ' ghost') + '" data-login="' + k + '">' + { kakao: '카카오', naver: '네이버', google: '구글' }[k] + '로 시작하기</button>'; }).join('') + '</div>';
    } else if (a.reason === 'purchase') {
      body = '<div class="price">' + won(prod.price) + '</div><p>' + esc(prod.name) + ' — 이 사주로 2027년 안에 몇 번이든 다시 볼 수 있어요. 결제 후 7일 안, 유료 장을 열기 전이면 바로 환불할 수 있어요.</p>' +
        '<button type="button" class="ny-btn" data-buy="1">구매하고 전체 보기</button>' +
        '<label class="ny-save"><input type="checkbox" id="pw-save"> 내 구매 내역에 이 출생 정보를 저장해 다른 기기에서도 열기</label>';
    } else body = '<p>지금은 구매 정보를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.</p><button type="button" class="ny-btn ghost" data-reload="1">다시 확인</button>';
    var partial = ch.sections && ch.sections.length;
    return '<div class="ny-lock"><h3>' + (partial ? '이어지는 풀이는 구매 후 열려요' : '「' + esc(ch.title) + '」 장은 구매 후 열려요') + '</h3>' + body + '<ul class="ny-locked-list">' + titles + '</ul></div>';
  }
  function renderOpen(ch) {
    var t = S.data.reading.tojeong;
    return '<div class="ny-gua"><div class="num">' + esc(t.gua) + '</div><div class="zy">' + esc(t.zhouyi || '보충본 괘') + (t.source === 'nl-supplement' ? ' · 국립중앙도서관 필사본 보충' : ' · 규장각본') + '</div>' +
      (t.guaxiang ? '<div class="gx">' + esc(t.guaxiang.join(' ')) + '</div>' : '') + '</div>' + (S.data.intro ? '<p class="ny-p note">' + esc(S.data.intro) + '</p>' : '') + paras(ch.paras) + mvCard();
  }
  // 내 사주 뮤직비디오(2026-11-18, /report/v2/music-video.js): 유료로 판매하는 해에만, 산 사람(또는 관리자)에게 열린다. 스위치 musicVideo
  function mvState() {
    var MV = root.ReportV2 && root.ReportV2.MusicVideo, a = S.data && S.data.access; if (!MV || !S.mvOn || !a) return null;
    if (a.reason === 'owned' || a.reason === 'admin') return { locked: false };
    if (a.reason === 'login' || a.reason === 'purchase') return { locked: true };
    return null;   // 무료 공개(free)·비공개 해에는 보이지 않는다
  }
  function mvCard() { var st = mvState(); return st ? '<div class="ny-mv">' + root.ReportV2.MusicVideo.cardHtml({ topic: 'newyear', year: YEAR, locked: st.locked, esc: esc }) + '</div>' : ''; }
  if (root.ReportV2 && root.ReportV2.MusicVideo) root.ReportV2.MusicVideo.ready().then(function (on) { S.mvOn = !!on; if (on && S.data && !$('#v-read').hidden) render(); });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-mvopen]')) return; var st = mvState(); if (!st) return;
    var toLock = function () { var i = chapters().findIndex(function (c) { return c.locked; }); if (i >= 0) go(i); };
    if (st.locked) return toLock();
    root.ReportV2.MusicVideo.open({ topic: 'newyear', birth: S.birth, year: YEAR, headers: headers, onLocked: toLock });
  });
  // 사주 월운 별도 상자(심화 월 카드 시범) — 토정 본문과 섞지 않고 아래 접는 상자로 보여 준다
  function sajuBox(x) { return x && x.paras && x.paras.length ? '<details class="ny-saju"><summary>' + esc(x.title) + '</summary>' + paras(x.paras) + '</details>' : ''; }
  // 한 해의 흐름(시범): 음력 열두 달 원문 결을 한 줄 띠로
  function toneStrip(tl) { return tl && tl.length ? '<ol class="ny-tones">' + tl.map(function (t) { return '<li class="t-' + esc(t.tone || 'none') + '" title="' + esc(t.theme || '') + '"><b>' + t.m + '월</b><span>' + esc(DIR[t.tone] || '-') + '</span></li>'; }).join('') + '</ol>' : ''; }
  function renderMonths(ch) {
    var ms = ch.months || [], m = ms[S.month] || ms[0];
    var chips = '<div class="ny-mchips" role="tablist">' + ms.map(function (x, i) { return '<button type="button" role="tab" data-m="' + i + '" aria-current="' + (i === S.month) + '">' + x.lunarMonth + '월' + (x.direction ? '<i class="d-' + x.direction + '"></i>' : '') + '</button>'; }).join('') + '</div>';
    var card = !m ? '' : m.locked ? '<div class="ny-month"><h3>' + esc(m.label) + '</h3><p class="when">' + esc(m.solar) + '</p></div>' + lockCard(ch) :
      '<div class="ny-month"><h3>' + esc(m.label) + (m.compare && CMP[m.compare] ? '<span class="ny-cmp ' + m.compare + '">' + CMP[m.compare] + '</span>' : '') + '</h3>' +
      '<p class="when">양력 ' + esc(m.solar) + ' · 사주 ' + esc(m.sajuMonth) + '월 흐름 ' + esc(DIR[m.direction] || '') + (m.tojeongTone ? ' · 토정 ' + esc(DIR[m.tojeongTone]) : '') + '</p>' +
      (m.hook ? '<p class="ny-p hook">' + esc(m.hook) + '</p>' : '') + paras(m.paras) + sajuBox(m.saju) + '</div>';
    return (ch.note ? '<p class="ny-p note">' + esc(ch.note) + '</p>' : '') + chips + card;
  }
  function panel(ch, slot) { return root.NewyearLook ? root.NewyearLook.panelHtml(ch.id, slot) : ''; }   // 관리자 패널 이미지에서 고른 삽화(없으면 빈 문자열)
  function renderChapter(ch) {
    var html = '<p class="ny-ch-k">CHAPTER ' + (S.idx + 1) + '</p><h2 class="ny-ch-t">' + esc(ch.title) + '</h2>';
    if (!(ch.locked && !(ch.sections && ch.sections.length))) html += panel(ch, 0);
    if (ch.id === 'open') return html + renderOpen(ch);
    if (ch.id === 'months') return html + renderMonths(ch);
    if (ch.locked && !(ch.sections && ch.sections.length)) return html + lockCard(ch);
    if (ch.score != null) html += '<div class="ny-score">지수 <b>' + esc(ch.score) + '</b> ' + esc(ch.band || '') + '</div>';
    html += paras(ch.paras);
    (ch.sections || []).forEach(function (s, si, all) {
      if (si === 2 && all.length >= 3) html += panel(ch, 1);
      html += '<section class="ny-sec"><h3 class="ny-sec-t">' + esc(s.title) + (s.compare && CMP[s.compare.kind] ? '<span class="ny-cmp ' + s.compare.kind + '">' + CMP[s.compare.kind] + '</span>' : '') + '</h3>' + toneStrip(s.timeline) + paras(s.paras) + '</section>';
    });
    if (ch.locked) html += lockCard(ch);
    if (ch.note) html += '<p class="ny-p note">' + esc(ch.note) + '</p>';
    return html;
  }
  function render() {
    var cs = chapters(), ch = cs[S.idx]; if (!ch) return;
    $('#ny-stage').innerHTML = renderChapter(ch);
    $('#ny-stage').style.animation = 'none'; void $('#ny-stage').offsetWidth; $('#ny-stage').style.animation = '';
    $('#ny-prog-i').style.width = ((S.idx + 1) / cs.length * 100) + '%';
    $('#ny-count').textContent = (S.idx + 1) + '/' + cs.length;
    $('#ny-prev').disabled = S.idx === 0; $('#ny-next').textContent = S.idx === cs.length - 1 ? '처음으로' : '다음 장';
    $('#ny-toc').innerHTML = cs.map(function (c, i) { return '<button type="button" data-go="' + i + '" aria-current="' + (i === S.idx) + '"><span>' + esc(c.title) + '</span><small>' + (c.locked ? '잠김' : '') + '</small></button>'; }).join('');
    if (S.remember) lsSet(LS_KEY, { birth: S.birth, idx: S.idx });
    root.scrollTo(0, 0); $('#ny-stage').focus({ preventScroll: true });
  }
  function go(i) { var n = chapters().length; if (!n) return; S.idx = (i + n) % n; S.month = 0; $('#ny-toc').hidden = true; render(); }

  // ── 버튼·키보드·쓸어넘기기
  $('#ny-prev').onclick = function () { if (S.idx > 0) go(S.idx - 1); };
  $('#ny-next').onclick = function () { go(S.idx + 1); };
  $('#ny-home').onclick = function () { writeForm(S.birth); view('input'); };
  $('#ny-back').onclick = function () { writeForm(S.birth); view('input'); };
  $('#ny-retry').onclick = function () { load(); };
  $('#ny-toc-btn').onclick = function () { $('#ny-toc').hidden = !$('#ny-toc').hidden; };
  $('#ny-pdf').onclick = function () { printAll(); };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go],[data-m],[data-login],[data-buy],[data-reload]'); if (!t) return;
    if (t.dataset.go) return go(+t.dataset.go);
    if (t.dataset.m) { S.month = +t.dataset.m; return render(); }
    if (t.dataset.reload) return load();
    // 로그인·결제로 페이지를 떠났다 돌아오면 같은 사주·같은 장으로 이어지게
    ssSet(HANDOFF, { birth: S.birth, year: YEAR, idx: S.idx, remember: S.remember });
    if (t.dataset.login) return PW() && PW().login(t.dataset.login);
    if (t.dataset.buy) return PW() && PW().buy(PRODUCT, null, t);
  });
  document.addEventListener('keydown', function (e) {
    if ($('#v-read').hidden || /input|select|textarea/i.test((e.target || {}).tagName || '')) return;
    if (e.key === 'ArrowRight') go(S.idx + 1); else if (e.key === 'ArrowLeft' && S.idx > 0) go(S.idx - 1);
  });
  var tx = null;
  $('#ny-stage').addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  $('#ny-stage').addEventListener('touchend', function (e) {
    if (tx == null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) < 70 || e.target.closest('.ny-mchips')) return;
    if (dx < 0) go(S.idx + 1); else if (S.idx > 0) go(S.idx - 1);
  }, { passive: true });

  // ── PDF: 펼친 모든 장(잠긴 장은 제목만)을 인쇄용으로 만들고 브라우저 인쇄 창(PDF로 저장)을 연다
  function printAll() {
    if (!S.data) return;
    var r = S.data.reading, t = r.tojeong, out = [];
    var line = function (x) { return '<p>' + (x.role === 'basis' ? '<span class="k">근거 </span>' : x.role === 'advice' ? '<span class="k">조언 </span>' : ROLE_LABEL[x.role] ? '<span class="k">' + ROLE_LABEL[x.role] + ' </span>' : '') + esc(x.text) + '</p>'; };
    out.push('<h1>2027 정미년 토정비결 신년운세</h1><p class="meta">토정비결 ' + esc(t.gua) + '괘 ' + esc(t.zhouyi || '') + ' · ' + esc((t.guaxiang || []).join(' ')) + '</p>');
    r.chapters.forEach(function (c) {
      out.push('<div class="chap"><h2>' + esc(c.title) + '</h2>');
      if (c.locked && !(c.sections && c.sections.length) && c.id !== 'months') out.push('<p class="meta">구매 후 열리는 장입니다.</p>');
      (c.paras || []).forEach(function (x) { out.push(line(x)); });
      (c.sections || []).forEach(function (s) { out.push('<h3>' + esc(s.title) + '</h3>'); (s.paras || []).forEach(function (x) { out.push(line(x)); }); });
      (c.months || []).forEach(function (m) { out.push('<h3>' + esc(m.label) + ' (양력 ' + esc(m.solar) + ')</h3>'); if (m.locked) out.push('<p class="meta">구매 후 열립니다.</p>'); if (m.hook) out.push('<p><b>' + esc(m.hook) + '</b></p>'); (m.paras || []).forEach(function (x) { out.push(line(x)); }); });
      if (c.note) out.push('<p class="meta">' + esc(c.note) + '</p>');
      out.push('</div>');
    });
    out.push('<p class="meta">만트라 · 토정비결 원문 저본: 규장각 奎古 1077(보충: 국립중앙도서관 필사본). 이 풀이는 참고용이며 건강·법률·재정 결정은 전문가와 상의하세요.</p>');
    $('#ny-print').innerHTML = out.join('');
    root.print();
  }

  // ── 시작: 넘겨받기(내 구매 내역·로그인/결제 복귀) → 이 기기 이어보기 → 입력
  (function boot() {
    if (root.NewyearLook) root.NewyearLook.boot(YEAR);   // 관리자 화면 꾸미기: 배경 이미지·진입 프롤로그(같은 탭 한 번)
    try { var v2 = JSON.parse(root.sessionStorage.getItem('mt_v2_input') || 'null'); if (v2 && v2.__ny) root.sessionStorage.removeItem('mt_v2_input'); } catch (e) { }   // 구매 창이 남긴 무빙툰용 값은 지운다
    var h = ssTake(HANDOFF), saved = lsGet(LS_KEY);
    if (h && h.birth) { S.remember = h.remember !== false; writeForm(h.birth); return start(h.birth, h.idx || 0); }
    if (saved && saved.birth) { writeForm(saved.birth); return start(saved.birth, saved.idx || 0); }
    view('input');
    // 결제창에서 바로 돌아왔는데 넘겨받기 값이 없으면(다른 탭 등) 구매 확인만 처리해 둔다
    if (/[?&]pay=/.test(root.location.search) && PW()) PW().init(null, { chapters: function () { return []; } }).catch(function () { });
  })();
  // 이 기기 기억 지우기: 입력 화면에서 '이어보기'를 끄면 바로 지운다
  form.remember.addEventListener('change', function () { if (!form.remember.checked) lsSet(LS_KEY, null); });

  root.NewyearApp = { state: S, go: go, load: load };
})(typeof window !== 'undefined' ? window : globalThis);
