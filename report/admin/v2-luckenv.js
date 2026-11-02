/* 관리자 "운세 환경 문구" 탭 — ① 환경 해석 문구의 검수(수정·승인·게시·되돌리기) ② 통합 운세 시뮬레이터(해석 추적)
   API: /api/luck-phrases. 문구는 승인 → 게시 두 단계를 거쳐야 사용자 화면에 반영되고, 수정하면 게시본에서 즉시 빠진다.
   시뮬레이터는 브라우저에서 engine.js·luck-interpret.js를 그대로 써서 사용자 화면과 같은 결과를 보여 주며, 서버에 아무것도 저장하지 않는다. */
(function () {
  'use strict';
  var pw = '', root, M = window.Manse, LI = window.MantraLuckInterpret, RG = window.MantraRegion;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); };
  var BASE = {};
  var S = { items: {}, phrases: [], version: 0, f: { type: '', status: '', q: '' }, cur: null };
  var ST = { draft: '초안', reviewed: '승인(게시 전)', published: '게시됨' }, TYPE = { core: '핵심 기운', scene: '상황', good: '유리 조건', bad: '불리 조건', act: '대응' };
  var stOf = function (id) { return (S.items[id] && S.items[id].status) || 'draft'; };
  var txOf = function (p) { return (S.items[p.id] && S.items[p.id].text) || p.text; };
  function call(method, qs, body) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/luck-phrases' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(t, bad) { var m = $('#leMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function load(note) {
    return call('GET', '?all=1').then(function (d) {
      if (!d._ok) { root.innerHTML = '<div class="card"><p class="muted">' + esc(d.error || '불러오지 못했습니다') + '</p></div>'; return; }
      S.items = d.items || {}; S.phrases = d.phrases || []; S.version = d.version || 0; draw(); if (note) msg(note);
    });
  }
  function counts() { var c = { draft: 0, reviewed: 0, published: 0 }; S.phrases.forEach(function (p) { c[stOf(p.id)]++; }); return c; }
  function draw() {
    var c = counts(), f = S.f;
    var list = S.phrases.filter(function (p) { return (!f.type || p.type === f.type) && (!f.status || stOf(p.id) === f.status) && (!f.q || (p.id + txOf(p)).indexOf(f.q) >= 0); });
    root.innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">운세 환경 문구 검수</h3>' +
      '<p class="muted" style="margin:0 0 8px">문구는 <b>승인 → 게시</b> 두 단계를 거쳐야 사용자 화면에 반영됩니다. 수정하면 초안으로 돌아가 게시본에서 즉시 빠지고(사용자에게는 기본 문구), 같은 문구가 이미 있거나 단정·반말 표현이면 저장되지 않습니다. 전체 ' + S.phrases.length + '건 · 초안 ' + c.draft + ' · 승인 ' + c.reviewed + ' · 게시 ' + c.published + '</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>유형 <select id="leT"><option value="">전체</option>' + Object.keys(TYPE).map(function (k) { return '<option value="' + k + '"' + (f.type === k ? ' selected' : '') + '>' + TYPE[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>상태 <select id="leS"><option value="">전체</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (f.status === k ? ' selected' : '') + '>' + ST[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>검색 <input id="leQ" value="' + esc(f.q) + '" style="width:160px"></label><span id="leMsg" class="muted"></span></div>' +
      '<div style="overflow:auto;max-height:340px;margin-top:8px"><table style="width:100%;font-size:.86rem"><thead><tr><th>ID</th><th>유형</th><th>본문</th><th>상태</th></tr></thead><tbody>' +
      list.slice(0, 200).map(function (p) { return '<tr data-id="' + esc(p.id) + '" style="cursor:pointer' + (S.cur === p.id ? ';background:rgba(255,255,255,.06)' : '') + '"><td>' + esc(p.id) + '</td><td>' + (TYPE[p.type] || '') + '</td><td>' + esc(txOf(p)) + '</td><td>' + ST[stOf(p.id)] + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (list.length > 200 ? '<p class="muted">처음 200건만 표시합니다. 필터로 좁혀 주세요.</p>' : '') + '<div id="leEd" style="margin-top:10px"></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">통합 운세 시뮬레이터</h3><div id="leSim"></div></div>';
    $('#leT').onchange = function () { S.f.type = this.value; draw(); }; $('#leS').onchange = function () { S.f.status = this.value; draw(); };
    $('#leQ').onchange = function () { S.f.q = this.value.trim(); draw(); };
    root.querySelectorAll('tr[data-id]').forEach(function (tr) { tr.onclick = function () { S.cur = tr.dataset.id; draw(); }; });
    if (S.cur) editor(); drawSim();
  }
  function editor() {
    var p = S.phrases.filter(function (x) { return x.id === S.cur; })[0]; if (!p) return;
    var it = S.items[p.id], st = stOf(p.id), hist = (it && it.history || []).slice().reverse();
    $('#leEd').innerHTML = '<div style="border-top:1px solid var(--line,#333);padding-top:10px"><b>' + esc(p.id) + '</b> · ' + ST[st] + ' · 버전 ' + (it ? it.version : 1) + (it && it.by ? ' · 마지막 ' + esc(it.by) : '') +
      '<p class="muted" style="margin:4px 0">기본 문구: ' + esc(p.text) + '</p><textarea id="leTx" rows="3" maxlength="200" style="width:100%">' + esc(txOf(p)) + '</textarea>' +
      '<div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap"><button class="btn" data-a="save">저장(초안)</button><button class="btn" data-a="approve"' + (st === 'published' ? ' disabled' : '') + '>승인</button><button class="btn" data-a="publish"' + (st !== 'reviewed' ? ' disabled' : '') + '>게시</button><button class="btn" data-a="unpublish"' + (st !== 'published' ? ' disabled' : '') + '>게시 취소</button></div>' +
      (hist.length ? '<details style="margin-top:8px"><summary>이력 ' + hist.length + '건</summary><ul style="margin:6px 0 0 18px">' + hist.map(function (h) { return '<li>v' + h.v + ' · ' + ST[h.status] + ' · ' + esc(h.at.slice(0, 16).replace('T', ' ')) + (h.by ? ' · ' + esc(h.by) : '') + ' — ' + esc(h.text) + ' <button class="btn" data-rs="' + h.v + '">이 본문으로</button></li>'; }).join('') + '</ul></details>' : '') + '</div>';
    root.querySelectorAll('#leEd [data-a]').forEach(function (b) { b.onclick = function () { var body = { id: p.id, action: b.dataset.a }; if (b.dataset.a === 'save') body.text = $('#leTx').value; call('PUT', '', body).then(function (d) { if (!d._ok) return msg(d.error || '실패했습니다', true); load('처리했습니다'); }); }; });
    root.querySelectorAll('#leEd [data-rs]').forEach(function (b) { b.onclick = function () { call('PUT', '', { id: p.id, action: 'restore', v: +b.dataset.rs }).then(function (d) { if (!d._ok) return msg(d.error || '실패했습니다', true); load('되돌렸습니다'); }); }; });
  }

  // ── 시뮬레이터 ──
  var SIM = { year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'F', lon: 126.98, level: 'seun', Y: new Date().getFullYear(), m: 1, d: 1, region: '' };
  function drawSim() {
    var o = function (arr, v) { return arr.map(function (a) { return '<option value="' + a[0] + '"' + (String(a[0]) === String(v) ? ' selected' : '') + '>' + a[1] + '</option>'; }).join(''); };
    var num = function (id, v, w) { return '<input id="' + id + '" type="number" value="' + v + '" style="width:' + (w || 70) + 'px">'; };
    $('#leSim').innerHTML = '<p class="muted" style="margin:0 0 8px">테스트 사주와 기간을 넣으면 사용자 화면과 같은 해석, 적용·배제된 규칙, 선택된 문구를 보여 줍니다. 서버에 저장하지 않습니다.</p><div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">' +
      '<label>생년 ' + num('sY', SIM.year) + '</label><label>월 ' + num('sM', SIM.month, 50) + '</label><label>일 ' + num('sD', SIM.day, 50) + '</label><label>시 ' + num('sH', SIM.hour, 50) + '</label><label>분 ' + num('sMi', SIM.minute, 50) + '</label>' +
      '<label>성별 <select id="sG">' + o([['M', '남'], ['F', '여']], SIM.gender) + '</select></label><label>경도 ' + num('sL', SIM.lon, 80) + '</label>' +
      '<label>단계 <select id="sLv">' + o([['daeun', '대운'], ['seun', '세운'], ['wolun', '월운'], ['ilun', '일진']], SIM.level) + '</select></label><label>연도 ' + num('sPY', SIM.Y) + '</label><label>월 ' + num('sPM', SIM.m, 50) + '</label><label>일 ' + num('sPD', SIM.d, 50) + '</label>' +
      '<label>지역 <select id="sRg"><option value="">없음</option>' + RG.REGIONS.map(function (r) { return '<option value="' + r.id + '"' + (SIM.region === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('') + '</select></label>' +
      '<label><input type="checkbox" id="sDraft" checked> 미게시 문구 포함</label><button class="btn" id="sGo">실행</button></div><div id="sOut" style="margin-top:10px"></div>';
    $('#sGo').onclick = run;
  }
  function ctxOf(ch, x, kind) {
    var c = {};
    if (kind === 'daeun') { var i = ch.daeun.list.indexOf(x); if (i > 0) c.prev = ch.daeun.list[i - 1]; }
    else if (kind === 'seun') { c.daeun = x.daeun; c.prev = M.seunRange(ch, x.year - 1, x.year - 1)[0]; }
    else if (kind === 'wolun') { var Y = M.yearPillarAt(x.startMs).sajuYear, wl = M.wolun(ch, Y), i2 = wl.findIndex(function (m) { return m.startMs === x.startMs; }); c.seun = M.seunRange(ch, Y, Y)[0]; c.daeun = M.daeunAt(ch, x.startMs); c.prev = i2 > 0 ? wl[i2 - 1] : M.wolun(ch, Y - 1)[11]; }
    else { var y = x.date[0], m = x.date[1], d = x.date[2], ms = Date.UTC(y, m - 1, d, 3), Y2 = M.yearPillarAt(ms).sajuYear, wm = null; M.wolun(ch, Y2).forEach(function (q) { if (q.startMs <= ms) wm = q; }); c.wolun = wm || M.wolun(ch, Y2 - 1)[11]; c.seun = M.seunRange(ch, Y2, Y2)[0]; c.daeun = M.daeunAt(ch, ms); if (d > 1) c.prev = M.ilun(ch, y, m)[d - 2]; }
    return c;
  }
  function run() {
    var g = function (id) { return $('#' + id).value; }, out = $('#sOut');
    try {
      SIM = { year: +g('sY'), month: +g('sM'), day: +g('sD'), hour: +g('sH'), minute: +g('sMi'), gender: g('sG'), lon: +g('sL'), level: g('sLv'), Y: +g('sPY'), m: +g('sPM'), d: +g('sPD'), region: g('sRg') };
      var ch = M.compute({ year: SIM.year, month: SIM.month, day: SIM.day, hour: SIM.hour, minute: SIM.minute, calendar: 'solar', leap: false, gender: SIM.gender, lon: SIM.lon, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
      var x;
      if (SIM.level === 'daeun') x = M.daeunAt(ch, Date.UTC(SIM.Y, Math.max(0, SIM.m - 1), SIM.d || 1, 3));
      else if (SIM.level === 'seun') x = M.seunRange(ch, SIM.Y, SIM.Y)[0];
      else if (SIM.level === 'wolun') { x = M.wolun(ch, SIM.Y)[Math.min(11, Math.max(0, SIM.m - 1))]; }
      else x = M.ilun(ch, SIM.Y, SIM.m)[SIM.d - 1];
      if (!x) throw new Error('해당 기간을 계산할 수 없습니다(범위를 확인하세요)');
      var withDraft = $('#sDraft').checked;
      LI.PHRASES.forEach(function (p) { if (!(p.id in BASE)) BASE[p.id] = p.text; var it = S.items[p.id]; p.text = withDraft && it && it.text ? it.text : BASE[p.id]; });
      var r = LI.build(M, ch, x, SIM.level, ctxOf(ch, x, SIM.level)), ev = r.evidence, list = function (a) { return a.length ? '<ul style="margin:2px 0 6px 18px">' + a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="muted">없음</p>'; };
      var h = '<p><b>원국</b> ' + esc(ev.natal.join(' · ')) + ' · 적합도 ' + esc(x.ev.condition) + '</p><h4 style="margin:6px 0 2px">' + esc(r.core.title) + '</h4><p>' + esc(r.core.text) + '</p><p>' + esc(r.relation) + '</p>' +
        '<p><b>영역</b> ' + r.areas.map(function (a) { return esc(a.name) + ' ' + a.level + '(' + a.value + ')'; }).join(' · ') + '</p>' +
        '<b>상황</b>' + list(r.scenes.map(function (s) { return s.name + ' — ' + s.text + ' [' + s.phraseId + ']'; })) + '<b>유리</b>' + list(r.good) + '<b>불리</b>' + list(r.bad) + '<b>연결</b>' + list(r.chain.map(function (c) { return c.text; }).concat(r.change ? [r.change] : [])) + '<b>대응</b>' + list(r.strategy);
      if (SIM.region) { var rgn = RG.get(SIM.region); h += '<b>지역 연결(' + esc(rgn.name) + ')</b>' + list(RG.link(rgn, r.topAreas, '이 기간').map(function (l) { return l.text; })); }
      h += '<details open><summary><b>해석 추적</b></summary><p><b>적용된 규칙</b> ' + esc(ev.rules.map(function (q) { return q.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ')) + '</p>' +
        '<p><b>선택된 문구</b> ' + ev.phraseIds.map(function (id) { return esc(id) + '(' + ST[stOf(id)] + ')'; }).join(', ') + '</p><p><b>배제된 규칙</b></p>' + list(ev.excluded.map(function (q) { return q.id + ' — ' + q.why; })) + '</details>';
      out.innerHTML = h;
    } catch (e) { out.innerHTML = '<p style="color:#FF8A78">' + esc(e.message) + '</p>'; }
  }
  window.V2LuckEnv = { open: function (password) { pw = password; root = document.getElementById('t-luckenv'); if (!root || !M || !LI || !RG) return; load(); } };
})();
