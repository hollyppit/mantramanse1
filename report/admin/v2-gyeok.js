/* 관리자 "격국 판정 확인" 탭 — 오행·강약 탭 '사주 격국 분석' 카드(gyeok-structure.js)의 판정 근거를 확인한다.
   ① 공개 스위치(/api/luck-flags gyeokAnalysis) ② 사주별 전체 판정(취격 과정·성립·안정성·특수격·오행 구조·십성 작용 점검표·종합 해석)과
   용신 계산용 격국(engine.js gyeokCore)과의 비교 ③ 300명 분포 점검(대표 격·성립·안정성·특수격·주요 구조 빈도, 엔진 격국과 다른 사주 목록).
   브라우저에서 engine.js·gyeok-structure.js 를 그대로 써서 사용자 화면과 같은 결과를 보여 주며 서버에 아무것도 저장하지 않는다. 표시 전용 판정이라 점수·용신에 영향이 없다. */
(function () {
  'use strict';
  var pw = '', root, M = window.Manse, GS = window.MantraGyeokStructure;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); };
  var S = { flags: null, sim: { year: 1992, month: 6, day: 23, hour: 1, minute: 45, gender: 'M' }, dist: null };
  var OK = function (b) { return '<b style="color:' + (b ? '#62C2AE' : '#8A8FA8') + '">' + (b ? '충족' : '미충족') + '</b>'; };
  var ST_COL = { jin: '#62C2AE', ga: '#E0BC74', hold: '#E0BC74', none: '#8A8FA8', firm: '#62C2AE', weak: '#E0BC74', multi: '#E0BC74', seong: '#62C2AE', rescued: '#E0BC74', plain: '#8A8FA8', pa: '#FF8A78' };
  var tag = function (t, k) { return '<span class="chip" style="color:' + (ST_COL[k] || 'var(--gold)') + '">' + esc(t) + '</span>'; };

  function loadFlags() { return fetch('/api/luck-flags', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (f) { S.flags = f; }); }
  function setFlag(v) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { gyeokAnalysis: v } }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || '실패'); S.flags = d; }); });
  }
  function chartOf(o) { return M.compute({ year: +o.year, month: +o.month, day: +o.day, hour: o.hour === '' || o.hour == null ? '' : +o.hour, minute: +o.minute || 0, gender: o.gender, calendar: 'solar' }); }

  function drawResult() {
    var box = $('#gkOut'); if (!box) return;
    var ch; try { ch = chartOf(S.sim); } catch (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
    var r = GS.analyze(M, ch), j = r.jeong, st = j.stability, eg = M.gyeokCore(ch), old = window.MantraGyeokguk ? window.MantraGyeokguk.analyze(M, ch) : null;
    var pil = ['year', 'month', 'day', 'hour'].map(function (k) { var p = ch.pillars[k]; return p ? M.STEM[p.s] + M.BR[p.b] : '??'; }).join(' ');
    var h = '<div class="card" style="margin-top:12px"><p style="margin:0 0 6px">원국 <b>' + pil + '</b> · 돕는 힘 ' + ch.strength.help.toFixed(1) + '% (' + esc(ch.strength.zone) + ') · 모듈 ' + esc(r.version) + '</p>' +
      '<h3 style="margin:8px 0 4px;color:var(--gold)">대표: ' + esc(r.rep.name) + (r.rep.sub ? ' <span class="muted">' + esc(r.rep.sub) + '</span>' : '') + '</h3>' +
      '<p style="margin:0">' + tag(r.rep.establishLabel, r.rep.type === 'special' ? 'jin' : r.rep.establish) + (r.rep.type === 'special' ? tag('정격 참고: ' + j.name, '') : tag('안정성 ' + r.rep.stabilityLabel, r.rep.stability)) + '</p>' +
      (r.rep.relation ? '<p class="muted">' + esc(r.rep.relation) + '</p>' : '') +
      '<p style="margin:8px 0 0">용신 계산용 격국(engine gyeokCore): <b>' + esc(eg.kind) + '</b> · ' + esc(eg.status) + (old ? ' / 용신 탭 카드(gyeokguk.js): ' + esc(old.kind) + ' · ' + esc(old.statusLabel) : '') +
      (eg.kind !== j.name ? ' <b style="color:#FF8A78">← 정격 이름이 다름(합거·복수 투출 사령 기준 차이)</b>' : ' <span class="ok">일치</span>') + '</p></div>';
    // 취격
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">1. 격 정하기 — ' + tag(j.establishLabel, j.establish) + ' 방법: ' + esc(j.method) + '</h3><table class="tbl"><thead><tr><th>지장간</th><th>역할</th><th>십성</th><th>투출</th><th>합거</th><th>사령</th></tr></thead><tbody>' +
      j.order.map(function (o) { return '<tr><td>' + esc(o.stem) + '</td><td>' + esc(o.role) + '</td><td>' + esc(o.tg) + '</td><td>' + esc(o.exposedAt.join('·') || '—') + '</td><td>' + (o.hapGeo ? '합거' : '') + '</td><td>' + (o.saryeong ? '사령' : '') + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<ul>' + j.basis.concat(j.reasons).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      (j.candidates.length ? '<p><b>복수 후보</b></p><ul>' + j.candidates.map(function (c) { return '<li>' + esc(c.name) + ' (' + esc(c.stem) + ' ' + esc(c.role) + ') — ' + esc(c.why) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    // 안정성
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">2. 안정성 — ' + tag(st.label, st.status) + (st.statusRaw !== st.status ? ' <span class="muted">(시주 없이 본 임시: ' + esc(GS.STAB_LABEL[st.statusRaw]) + ')</span>' : '') + '</h3><ul>' +
      st.sang.map(function (x) { return '<li>상신 · ' + OK(x.on) + ' · ' + esc(x.text) + '</li>'; }).join('') +
      st.pa.map(function (x) { return '<li>파격 요인 · ' + (x.on ? '<b style="color:#FF8A78">있음</b>' : '<span class="muted">없음</span>') + ' · ' + esc(x.text) + (x.rescue ? ' → 구응 ' + OK(x.rescue.on) + ' ' + esc(x.rescue.text) : '') + '</li>'; }).join('') +
      st.notes.map(function (t) { return '<li class="muted">' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    // 특수격
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">3. 특수격 점검 (화격 → 전왕 1행격 → 종격)</h3>' + r.special.checks.map(function (c) {
      return '<p style="margin:8px 0 2px"><b>' + esc(c.name) + '</b> · ' + esc(c.family) + ' ' + tag(c.statusLabel, c.status) + '</p><ul style="margin:0">' + c.conds.map(function (x) { return '<li>' + OK(x.ok) + ' · ' + esc(x.label) + ' <span class="muted">(' + esc(x.detail) + ')</span></li>'; }).join('') + (c.note ? '<li class="muted">' + esc(c.note) + '</li>' : '') + '</ul>';
    }).join('') + '</div>';
    // 오행 구조·십성 작용
    var items = r.items.slice().sort(function (a, b) { return (b.on - a.on) || (b.score - a.score); });
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">4. 특수 오행 구조 · 십성 작용 (주요 항목: ' + esc(r.major.map(function (o) { return o.name; }).join('·') || '없음') + ')</h3><table class="tbl"><thead><tr><th>항목</th><th>분류</th><th>성격</th><th>결과</th><th>명확성</th><th>중요도</th><th>영향</th><th>점수</th><th>근거</th></tr></thead><tbody>' +
      items.map(function (o) { return '<tr><td><b>' + esc(o.name) + '</b></td><td>' + (o.kind === 'oheng' ? '오행 구조' : '십성 작용') + '</td><td>' + (o.pol === 'flow' ? '흐름' : '부담') + '</td><td>' + (o.on ? tag('성립', 'seong') : o.suppressed ? tag('제외', 'hold') : '<span class="muted">불성립</span>') + '</td><td>' + o.clarity.toFixed(2) + '</td><td>' + o.importance.toFixed(2) + '</td><td>' + o.impact.toFixed(2) + '</td><td>' + o.score + '</td><td class="muted" style="font-size:.8rem">' + o.why.map(esc).join('<br>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    // 종합 해석
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">5. 종합 해석 — ' + esc(r.summary.headline) + '</h3>' + r.summary.body.map(function (t) { return '<p style="margin:4px 0">' + esc(t) + '</p>'; }).join('') +
      '<p style="margin:8px 0 2px"><b class="ok">유리한 조건</b></p><ul>' + r.summary.good.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><p style="margin:8px 0 2px"><b class="err">주의할 조건</b></p><ul>' + r.summary.care.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      r.caveats.map(function (t) { return '<p class="muted">' + esc(t) + '</p>'; }).join('') + '<p class="muted">' + esc(r.disclaimer) + '</p></div>';
    box.innerHTML = h;
  }

  function runDist() {
    var seed = 20261115, rnd = function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    var D = { n: 0, rep: {}, est: {}, stab: {}, sp: {}, major: {}, noneMajor: 0, diff: [] }, inc = function (o, k) { o[k] = (o[k] || 0) + 1; };
    for (var i = 0; i < 300; i++) {
      var o = { year: 1940 + Math.floor(rnd() * 75), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 9 === 0 ? '' : Math.floor(rnd() * 24), minute: 0, gender: i % 2 ? 'M' : 'F' }, ch;
      try { ch = chartOf(o); } catch (e) { continue; }
      var r = GS.analyze(M, ch); D.n++;
      inc(D.rep, r.rep.type === 'special' ? '특수격 ' + r.rep.name : r.rep.name); inc(D.est, r.jeong.establishLabel); inc(D.stab, r.jeong.stability.label);
      r.special.checks.forEach(function (c) { if (c.status !== 'none') inc(D.sp, c.family + ' ' + c.statusLabel); });
      r.major.forEach(function (m) { inc(D.major, m.name); }); if (!r.major.length) D.noneMajor++;
      var eg = M.gyeokCore(ch); if (eg.kind !== r.jeong.name && D.diff.length < 30) D.diff.push({ o: o, mine: r.jeong.name + '(' + r.jeong.establishLabel + ')', eng: eg.kind, why: (r.jeong.basis.filter(function (t) { return /합거|사령/.test(t); })[0] || '') });
    }
    S.dist = D; drawDist();
  }
  function drawDist() {
    var box = $('#gkDist'), D = S.dist; if (!box || !D) return;
    var tbl = function (title, obj) { var ks = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }); return '<div style="min-width:220px;flex:1"><b>' + title + '</b><table class="tbl"><tbody>' + ks.map(function (k) { return '<tr><td>' + esc(k) + '</td><td style="text-align:right">' + obj[k] + '</td><td style="text-align:right" class="muted">' + Math.round(obj[k] / D.n * 100) + '%</td></tr>'; }).join('') + '</tbody></table></div>'; };
    box.innerHTML = '<p>' + D.n + '명(시주 모름 1/9 포함, 고정 난수) · 주요 구조 없음 ' + D.noneMajor + '명</p><div class="row" style="align-items:start">' + tbl('대표 격국', D.rep) + tbl('정격 성립', D.est) + tbl('안정성', D.stab) + tbl('특수격(불성립 제외)', D.sp) + tbl('주요 구조 빈도', D.major) + '</div>' +
      '<p style="margin-top:10px"><b>용신 계산용 격국(engine)과 이름이 다른 사주</b> ' + D.diff.length + '건 (최대 30건 표시)</p><ul>' + D.diff.map(function (x) { return '<li><button class="gkPick" data-o="' + esc(JSON.stringify(x.o)) + '">열기</button> ' + x.o.year + '.' + x.o.month + '.' + x.o.day + ' ' + (x.o.hour === '' ? '시간 모름' : x.o.hour + '시') + ' — 이 카드 ' + esc(x.mine) + ' / engine ' + esc(x.eng) + ' <span class="muted">' + esc(x.why) + '</span></li>'; }).join('') + '</ul>';
    [].slice.call(box.querySelectorAll('.gkPick')).forEach(function (b) { b.onclick = function () { S.sim = JSON.parse(b.dataset.o); draw(); root.scrollIntoView(); }; });
  }

  function draw() {
    var fl = S.flags, o = S.sim, num = function (id, v, w) { return '<input id="' + id + '" type="number" value="' + esc(v) + '" style="width:' + (w || 70) + 'px">'; };
    root.innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">사주 격국 분석 카드 공개 스위치</h3><p style="margin:0 0 8px">현재: <b style="color:' + (fl && fl.gyeokAnalysis ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '상태를 불러오지 못했습니다' : fl.gyeokAnalysis ? '● 켜짐 — 오행·강약 탭에 카드가 보입니다' : '○ 꺼짐 — 사용자에게 보이지 않습니다') + '</b></p>' +
      '<div class="row"><button class="btn" id="gkFlag"' + (fl ? '' : ' disabled') + '>' + (fl && fl.gyeokAnalysis ? '카드 끄기' : '카드 켜기') + '</button><span id="gkMsg" class="muted"></span></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 약 1분 안에 모든 사용자의 오행·강약 탭 ‘십성 분포·신강신약’ 아래에 카드가 나타나고, 끄면 같은 방식으로 사라집니다(코드 배포 필요 없음). 표시 전용이라 신강신약·용신·오행 비율·운세 점수는 바뀌지 않습니다. 미리보기: 주소 뒤에 ?mantraFlags=gyeokAnalysis (localhost·미리보기 주소에서만). 판정 규칙: docs/GYEOK_ANALYSIS_DESIGN_2026-11-15.md</p></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">사주별 판정 근거</h3><div class="row"><label>년' + num('gkY', o.year, 80) + '</label><label>월' + num('gkM', o.month, 60) + '</label><label>일' + num('gkD', o.day, 60) + '</label><label>시(비우면 모름)' + num('gkH', o.hour, 70) + '</label><label>분' + num('gkMi', o.minute, 60) + '</label><label>성별<select id="gkG" style="width:80px"><option value="M"' + (o.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (o.gender === 'F' ? ' selected' : '') + '>여</option></select></label><button class="pri" id="gkRun">판정 보기</button></div><p class="muted" style="margin:6px 0 0">양력·서울 경도·경도 보정 기본값으로 계산합니다.</p></div><div id="gkOut"></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">300명 분포 점검</h3><button class="btn" id="gkDistBtn">분포 계산</button><div id="gkDist" style="margin-top:8px"></div></div>';
    $('#gkRun').onclick = function () { var g = function (id) { return $('#' + id).value; }; S.sim = { year: g('gkY'), month: g('gkM'), day: g('gkD'), hour: g('gkH'), minute: g('gkMi'), gender: g('gkG') }; drawResult(); };
    $('#gkDistBtn').onclick = runDist;
    $('#gkFlag').onclick = function () { var v = !(S.flags && S.flags.gyeokAnalysis); if (!confirm(v ? '사주 격국 분석 카드를 모든 사용자에게 공개합니다. 계속할까요?' : '사주 격국 분석 카드를 사용자 화면에서 숨깁니다. 계속할까요?')) return; setFlag(v).then(function () { draw(); $('#gkMsg').textContent = v ? '켰습니다' : '껐습니다'; }).catch(function (e) { $('#gkMsg').textContent = e.message; }); };
    drawResult(); drawDist();
  }

  window.V2Gyeok = { open: function (p) { pw = p || ''; root = document.getElementById('t-gyeokcheck'); if (!root) return; M = window.Manse; GS = window.MantraGyeokStructure; if (!M || !GS) { root.innerHTML = '<div class="card"><p class="err">engine.js 또는 gyeok-structure.js 를 불러오지 못했습니다.</p></div>'; return; } loadFlags().then(draw); } };
})();
