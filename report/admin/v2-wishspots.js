/* 관리자 "소원 성취 명당" 탭 — 장소를 출처·확인일과 함께 등록·검수·게시하고, 사주·기준 지역·소원 분야를 넣어 점수 순위를 미리 본다.
   API: /api/wish-spots. 게시 전에는 사용자 화면에 영향이 없고, 공개 스위치가 꺼져 있으면 게시해도 보이지 않는다. 장소는 출처(이름·https 주소·확인일)가 있어야 저장된다.
   미리보기는 브라우저에서 engine.js·region-reading.js·wish-spots.js 를 그대로 써서 사용자 화면과 같은 순위를 보여 주며 서버에 저장하지 않는다. */
(function () {
  'use strict';
  var pw = '', root, M = window.Manse, WS = window.MantraWishSpots, RG = window.MantraRegion;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); }, $$ = function (s) { return [].slice.call(root.querySelectorAll(s)); };
  var S = { doc: null, tab: 'list', cur: null, isNew: false, sel: {}, sim: { year: 1992, month: 6, day: 23, hour: 2, gender: 'M', base: 'jeonju', wish: 'wealth', draft: true } };
  var ST = { draft: '초안', reviewed: '승인(미게시)', published: '게시됨' };
  function call(method, qs, body) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/wish-spots' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(t, bad) { var m = $('#wsMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function load(note) { return call('GET', '?all=1').then(function (d) { if (!d._ok) { root.innerHTML = '<div class="card"><p class="muted">' + esc(d.error || '불러오지 못했습니다') + '</p></div>'; return; } S.doc = d.doc; draw(); if (note) msg(note); }); }
  var fail = function (d) { msg(d.error || '실패했습니다', true); };
  var ids = function () { return Object.keys(S.doc.spots); };

  function draw() {
    var on = S.doc.enabled === true, pubN = ids().filter(function (k) { return S.doc.spots[k].status === 'published'; }).length;
    root.innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">소원 성취 명당 관리</h3><p class="muted" style="margin:0 0 8px">“나의 운명 지도”의 소원 성취 명당에 쓸 장소를 출처와 함께 등록합니다. 점수는 장소를 만들지 않고, 등록된 장소를 내 사주·소원 분야에 맞춰 계산해 순위를 매깁니다(방위 적합도 40 · 소원-방위 적합도 30 · 소원 분야 태그 20 · 거리 10). 출처 이름·https 주소·확인일이 없으면 저장되지 않습니다.</p>' +
      '<p style="margin:0 0 8px">사용자 화면: <b style="color:' + (on ? '#62C2AE' : '#E0BC74') + '">' + (on ? '● 켜짐 — 게시된 장소 ' + pubN + '곳이 보입니다' : '○ 꺼짐 — 게시해도 보이지 않습니다') + '</b> <button class="btn" id="wsOn">켜기</button> <button class="btn" id="wsOff">끄기</button> <span class="muted">(약 1분 안에 반영 · “나의 운명 지도”가 켜져 있어야 보임)</span></p>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' + [['list', '장소'], ['sim', '미리보기·순위']].map(function (t) { return '<button class="btn" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' style="outline:2px solid var(--gold)"' : '') + '>' + t[1] + '</button>'; }).join('') + '<span id="wsMsg" class="admin-msg" style="margin-left:8px"></span></div></div><div id="wsBody" style="margin-top:12px"></div>';
    $$('[data-tab]').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; draw(); }; });
    var set = function (v) { if (v && !confirm('소원 성취 명당을 모든 사용자에게 공개합니다. 게시된 장소만 보입니다. 켜시겠습니까?')) return; call('PUT', '', { kind: 'flag', enabled: v }).then(function (d) { d._ok ? load(v ? '켰습니다(약 1분 안에 반영)' : '껐습니다(약 1분 안에 반영)') : fail(d); }); };
    $('#wsOn').onclick = function () { set(true); }; $('#wsOff').onclick = function () { set(false); };
    (S.tab === 'list' ? drawList : drawSim)();
  }
  var selIds = function () { return Object.keys(S.sel).filter(function (k) { return S.sel[k]; }); };
  function drawList() {
    var n = selIds().length;
    $('#wsBody').innerHTML = '<div class="card"><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="wsNew">새 장소 등록</button><button class="btn" id="wsBp"' + (n ? '' : ' disabled') + '>선택 게시 (' + n + ')</button><button class="btn" id="wsBu"' + (n ? '' : ' disabled') + '>선택 게시 취소</button><span class="muted">' + ids().length + '곳</span></div>' +
      '<div style="overflow:auto;max-height:300px;margin-top:8px"><table style="width:100%;font-size:.84rem"><thead><tr><th style="width:26px"></th><th>ID</th><th>이름</th><th>유형</th><th>태그</th><th>확인일</th><th>상태</th></tr></thead><tbody>' + (ids().length ? ids().map(function (k) { var it = S.doc.spots[k], f = it.fields; return '<tr data-id="' + esc(k) + '" style="cursor:pointer' + (S.cur === k ? ';background:rgba(255,255,255,.07)' : '') + '"><td><input type="checkbox" data-ck="' + esc(k) + '"' + (S.sel[k] ? ' checked' : '') + '></td><td>' + esc(k) + '</td><td>' + esc(f.name) + (f.on === false ? ' <span style="color:#FF8A78">비활성</span>' : '') + '</td><td>' + esc(WS.TYPES[f.type]) + '</td><td>' + esc(f.tags.map(function (t) { return (WS.WISH.filter(function (w) { return w.id === t; })[0] || {}).name; }).join('·')) + '</td><td>' + esc(f.source.checked) + '</td><td>' + ST[it.status] + '</td></tr>'; }).join('') : '<tr><td colspan="7" class="muted">등록된 장소가 없습니다. “새 장소 등록”으로 출처가 확인된 장소를 추가하세요.</td></tr>') + '</tbody></table></div><div id="wsEd" style="margin-top:10px"></div></div>';
    $$('input[data-ck]').forEach(function (cb) { cb.onclick = function (e) { e.stopPropagation(); S.sel[cb.dataset.ck] = cb.checked; var m = selIds().length; $('#wsBp').disabled = $('#wsBu').disabled = !m; $('#wsBp').textContent = '선택 게시 (' + m + ')'; }; });
    $$('tr[data-id]').forEach(function (tr) { tr.onclick = function () { S.cur = tr.dataset.id; S.isNew = false; drawList(); }; });
    var bulk = function (op) { var a = selIds(); if (!a.length || !confirm(a.length + '곳을 ' + (op === 'publish' ? '게시' : '게시 취소') + '합니다.')) return; call('PUT', '', { kind: 'spot', action: 'bulk', ids: a, op: op }).then(function (d) { S.sel = {}; d._ok ? load((op === 'publish' ? '게시 ' : '게시 취소 ') + d.done + '곳' + (d.failed.length ? ' · 실패 ' + d.failed.length + '곳: ' + d.failed.slice(0, 2).map(function (x) { return x.id + ' ' + x.error; }).join(' / ') : '')) : fail(d); }); };
    $('#wsBp').onclick = function () { bulk('publish'); }; $('#wsBu').onclick = function () { bulk('unpublish'); };
    $('#wsNew').onclick = function () { S.isNew = true; S.cur = null; editor({ name: '', lat: '', lon: '', type: 'mountain', tags: ['general'], source: { name: '', url: 'https://', checked: new Date().toISOString().slice(0, 10) }, note: '', on: true }, ''); };
    if (S.cur && S.doc.spots[S.cur]) editor(S.doc.spots[S.cur].fields, S.cur);
  }
  function editor(f, id) {
    var it = id ? S.doc.spots[id] : null, st = it ? it.status : 'new', hist = it ? it.history.slice().reverse() : [];
    $('#wsEd').innerHTML = '<div style="border-top:1px solid var(--line,#333);padding-top:10px"><b>' + (id ? esc(id) + ' · ' + ST[st] + ' · v' + it.version : '새 장소') + '</b>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">' + (id ? '' : '<label>ID(영문 소문자·숫자·-) <input id="wsId" placeholder="my-spot-1" style="width:150px"></label>') + '<label>이름 <input id="wsName" value="' + esc(f.name) + '" maxlength="40" style="width:200px"></label><label>위도 <input id="wsLat" type="number" step="0.0001" value="' + esc(f.lat) + '" style="width:100px"></label><label>경도 <input id="wsLon" type="number" step="0.0001" value="' + esc(f.lon) + '" style="width:100px"></label>' +
      '<label>유형 <select id="wsType">' + Object.keys(WS.TYPES).map(function (k) { return '<option value="' + k + '"' + (f.type === k ? ' selected' : '') + '>' + WS.TYPES[k] + '</option>'; }).join('') + '</select></label><label><input type="checkbox" id="wsAct"' + (f.on !== false ? ' checked' : '') + '> 사용</label></div>' +
      '<p style="margin:8px 0 2px"><b>소원 분야 태그</b> <span class="muted">이 장소가 전통적으로 연결되는 분야(1개 이상)</span></p><div>' + WS.WISH.map(function (w) { return '<label style="margin-right:10px"><input type="checkbox" data-tg="' + w.id + '"' + (f.tags.indexOf(w.id) >= 0 ? ' checked' : '') + '> ' + w.name + '</label>'; }).join('') + '</div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><label>출처 이름 <input id="wsSn" value="' + esc(f.source.name) + '" maxlength="60" style="width:200px"></label><label>출처 주소(https) <input id="wsSu" value="' + esc(f.source.url) + '" style="width:300px"></label><label>확인한 날짜 <input id="wsSd" type="date" value="' + esc(f.source.checked) + '"></label></div>' +
      '<label style="display:block;margin-top:6px">비고(이용 안내 등, 200자) <textarea id="wsNote" rows="2" maxlength="200" style="width:100%">' + esc(f.note) + '</textarea></label>' +
      '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn" data-a="pub">' + (st === 'published' ? '수정해서 다시 게시' : '저장하고 게시') + '</button><button class="btn" data-a="save">' + (id ? '수정만 저장(미게시)' : '초안으로 등록') + '</button>' + (st === 'published' ? '<button class="btn" data-a="unpublish">게시 취소</button>' : '') + (id ? '<button class="btn" data-a="del">삭제</button>' : '') + '</div>' +
      (hist.length ? '<details style="margin-top:8px"><summary>이력 ' + hist.length + '건</summary><ul style="margin:6px 0 0 18px">' + hist.map(function (h) { return '<li>v' + h.v + ' · ' + ST[h.status] + ' · ' + esc((h.at || '').slice(0, 16).replace('T', ' ')) + (h.by ? ' · ' + esc(h.by) : '') + ' <button class="btn" data-rs="' + h.v + '">이 버전으로 되돌리기</button></li>'; }).join('') + '</ul></details>' : '') + '</div>';
    var fields = function () { return { name: $('#wsName').value, lat: parseFloat($('#wsLat').value), lon: parseFloat($('#wsLon').value), type: $('#wsType').value, on: $('#wsAct').checked, tags: $$('#wsEd [data-tg]').filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.tg; }), source: { name: $('#wsSn').value, url: $('#wsSu').value.trim(), checked: $('#wsSd').value }, note: $('#wsNote').value }; };
    $$('#wsEd [data-a]').forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.a, sid = id || ($('#wsId') ? $('#wsId').value.trim() : '');
        if (a === 'unpublish') return call('PUT', '', { kind: 'spot', id: sid, action: 'unpublish' }).then(function (d) { d._ok ? load('게시를 취소했습니다') : fail(d); });
        if (a === 'del') { if (!confirm('이 장소를 삭제합니다.')) return; return call('PUT', '', { kind: 'spot', id: sid, action: 'delete' }).then(function (d) { if (d._ok) { S.cur = null; load('삭제했습니다'); } else fail(d); }); }
        var go = id ? call('PUT', '', { kind: 'spot', id: sid, action: 'save', fields: fields() }) : call('PUT', '', { kind: 'spot', id: sid, action: 'create', fields: fields() });
        go.then(function (d) { if (!d._ok) return fail(d); S.cur = sid; S.isNew = false; if (a === 'save') return load('저장했습니다(미게시)'); return call('PUT', '', { kind: 'spot', id: sid, action: 'approve_publish' }).then(function (d2) { d2._ok ? load('게시했습니다') : fail(d2); }); });
      };
    });
    $$('#wsEd [data-rs]').forEach(function (b) { b.onclick = function () { call('PUT', '', { kind: 'spot', id: id, action: 'restore', v: +b.dataset.rs }).then(function (d) { d._ok ? load('되돌렸습니다(초안)') : fail(d); }); }; });
  }

  function drawSim() {
    var o = S.sim, num = function (i, v, w) { return '<input id="' + i + '" type="number" value="' + v + '" style="width:' + (w || 70) + 'px">'; };
    $('#wsBody').innerHTML = '<div class="card"><p class="muted" style="margin:0 0 8px">테스트 사주·기준 지역·소원 분야를 넣으면 사용자 화면과 같은 점수 순위를 보여 줍니다. 서버에 저장하지 않습니다.</p><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>생년 ' + num('sY', o.year) + '</label><label>월 ' + num('sM', o.month, 50) + '</label><label>일 ' + num('sD', o.day, 50) + '</label><label>시 ' + num('sH', o.hour, 50) + '</label><label>성별 <select id="sG"><option value="M"' + (o.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (o.gender === 'F' ? ' selected' : '') + '>여</option></select></label>' +
      '<label>기준 지역 <select id="sB">' + RG.REGIONS.map(function (r) { return '<option value="' + r.id + '"' + (o.base === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('') + '</select></label><label>소원 <select id="sW">' + WS.WISH.map(function (w) { return '<option value="' + w.id + '"' + (o.wish === w.id ? ' selected' : '') + '>' + w.name + '</option>'; }).join('') + '</select></label><label><input type="checkbox" id="sDr"' + (o.draft ? ' checked' : '') + '> 미게시(초안) 포함</label><button class="btn" id="sGo">실행</button></div><div id="sOut" style="margin-top:10px"></div></div>';
    $('#sGo').onclick = function () {
      var g = function (i) { return $('#' + i).value; }, out = $('#sOut');
      try {
        S.sim = { year: +g('sY'), month: +g('sM'), day: +g('sD'), hour: +g('sH'), gender: g('sG'), base: g('sB'), wish: g('sW'), draft: $('#sDr').checked };
        var ch = M.compute({ year: S.sim.year, month: S.sim.month, day: S.sim.day, hour: S.sim.hour, minute: 0, gender: S.sim.gender, calendar: 'solar', school: 'eokbu' }), b = RG.get(S.sim.base);
        var spots = ids().filter(function (k) { return S.sim.draft || S.doc.spots[k].status === 'published'; }).map(function (k) { return Object.assign({ id: k }, S.doc.spots[k].fields); });
        var r = WS.rank(M, ch, spots, { lat: b.lat, lon: b.lon, name: b.name }, S.sim.wish);
        out.innerHTML = '<p><b>소원</b> ' + esc(r.wish.name) + (r.wish.element ? ' → ' + esc(r.wish.label) + '(' + esc(r.wish.element) + ' 기운)' : '') + ' · 기준 ' + esc(r.base.name) + ' · 장소 ' + r.items.length + '곳</p>' + (r.items.length ? '<table style="width:100%;font-size:.82rem"><thead><tr><th>순위</th><th>장소</th><th>점수</th><th>방위</th><th>소원</th><th>태그</th><th>거리</th><th>방향</th></tr></thead><tbody>' + r.items.map(function (x) { return '<tr><td>' + x.rank + '</td><td>' + esc(x.name) + '</td><td><b>' + x.score + '</b></td><td>' + x.parts.dir + '</td><td>' + x.parts.wish + '</td><td>' + x.parts.tag + '</td><td>' + x.parts.dist + '</td><td>' + esc(x.direction) + (x.deg != null ? ' ' + x.deg + '°' : '') + ' · ' + esc(x.element) + ' · ' + esc(x.distKm) + 'km · ' + esc(x.toneLabel) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">등록된 장소가 없습니다.</p>');
      } catch (e) { out.innerHTML = '<p style="color:#FF8A78">' + esc(e.message) + '</p>'; }
    };
  }
  window.V2WishSpots = { open: function (password) { pw = password; root = document.getElementById('t-wishspots'); if (!root || !M || !WS || !RG) return; load(); } };
})();
