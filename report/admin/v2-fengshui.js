/* 관리자 "공간·명당 풍수" 탭 — 현공비성·팔택·형세 해석 문구와 계산 규칙을 코드 수정 없이 관리한다.
   ① 공개 스위치 ② 계산 규칙(겸향·공망 기준) ③ 해석 문구(수정·게시·되돌리기) ④ 계산 기준·예외 안내 ⑤ 미리보기(사주 없이 좌향·건축연도로 9궁 확인)
   API: /api/fengshui. 게시 전·스위치가 꺼져 있으면 사용자 화면은 기존 '풍수' 탭 그대로다. 지역·명당 장소 등록은 '소원 성취 명당' 탭, 지역 방위 규칙은 '지역 방위 해석' 탭을 쓴다. */
(function () {
  'use strict';
  var pw = '', root, F = window.MantraFengshui;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); }, $$ = function (s) { return [].slice.call(root.querySelectorAll(s)); };
  var S = { doc: null, base: null, tab: 'flag', f: { group: '', st: '', q: '' }, sim: { facing: 180, built: 2010, eval: new Date().getFullYear() } };
  var ST = { draft: '초안', reviewed: '승인(미게시)', published: '게시됨', none: '기본값' };
  function call(method, qs, body) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/fengshui' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(t, bad) { var m = $('#fsMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function load(note) { return call('GET', '?all=1').then(function (d) { if (!d._ok) { root.innerHTML = '<div class="card"><p class="muted">' + esc(d.error || '불러오지 못했습니다') + '</p></div>'; return; } S.doc = d.doc; S.base = d.base; draw(); if (note) msg(note); }); }
  var item = function (kind, id) { return (kind === 'text' ? S.doc.texts : S.doc.rules)[id] || null; };
  var stOf = function (kind, id) { var it = item(kind, id); return it ? it.status : 'none'; };
  var fail = function (d) { msg(d.error || '실패했습니다', true); };
  function hist(kind, id) {
    var it = item(kind, id), h = (it && it.history || []).slice().reverse(); if (!h.length) return '';
    return '<details style="margin-top:8px"><summary>이력 ' + h.length + '건</summary><ul style="margin:6px 0 0 18px">' + h.map(function (x) { return '<li>v' + x.v + ' · ' + ST[x.status] + ' · ' + esc((x.at || '').slice(0, 16).replace('T', ' ')) + ' ' + esc(x.by || '') + ' <button class="btn" data-k="' + kind + '" data-i="' + esc(id) + '" data-rs="' + x.v + '">이 버전으로 되돌리기</button></li>'; }).join('') + '</ul></details>';
  }
  function bindRestore() { $$('[data-rs]').forEach(function (b) { b.onclick = function () { call('PUT', '', { kind: b.dataset.k, id: b.dataset.i, action: 'restore', v: +b.dataset.rs }).then(function (d) { d._ok ? load('이전 버전을 초안으로 불러왔습니다') : fail(d); }); }; }); }
  function draw() {
    var tabs = [['flag', '공개 스위치'], ['rule', '계산 규칙'], ['text', '해석 문구'], ['basis', '계산 기준·예외'], ['sim', '미리보기']];
    root.innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">공간·명당 풍수 관리</h3><p class="muted" style="margin:0 0 8px">현공비성·팔택·형세 풍수의 해석 문구와 계산 규칙을 수정·게시합니다. 문구는 존댓말이어야 하고 단정·공포 표현은 저장되지 않습니다.</p>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' + tabs.map(function (t) { return '<button class="btn" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' style="outline:2px solid var(--gold)"' : '') + '>' + t[1] + '</button>'; }).join('') + '</div><p id="fsMsg" style="margin:8px 0 0;min-height:1.2em"></p></div><div id="fsBody"></div>';
    $$('[data-tab]').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; draw(); }; });
    ({ flag: drawFlag, rule: drawRule, text: drawText, basis: drawBasis, sim: drawSim })[S.tab]();
  }
  function drawFlag() {
    var on = S.doc.enabled === true, n = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k].status === 'published'; }).length; };
    $('#fsBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">사용자 화면 공개 스위치</h3><p style="margin:0 0 8px">현재: <b style="color:' + (on ? '#62C2AE' : '#FF8A78') + '">' + (on ? '켜짐 — 사용자 화면에 ‘공간·명당’ 탭이 보입니다' : '꺼짐 — 기존 ‘풍수’ 탭 그대로') + '</b></p>' +
      '<p class="muted" style="margin:0 0 8px">게시된 항목: 문구 ' + n(S.doc.texts) + '건 · 규칙 ' + n(S.doc.rules) + '건. 켜면 약 1분 안에 반영되고 끄면 즉시 이전 화면으로 돌아갑니다. 켜기 전에 미리보기와 문구 검수를 마치세요.</p><div class="row" style="gap:8px"><button class="btn" id="fsOn">켜기</button><button class="btn" id="fsOff">끄기</button></div></div>';
    $('#fsOn').onclick = function () { if (!confirm('사용자 화면에 공간·명당 탭을 공개할까요?')) return; call('PUT', '', { kind: 'flag', enabled: true }).then(function (d) { d._ok ? load('켰습니다') : fail(d); }); };
    $('#fsOff').onclick = function () { call('PUT', '', { kind: 'flag', enabled: false }).then(function (d) { d._ok ? load('껐습니다') : fail(d); }); };
  }
  function drawRule() {
    $('#fsBody').innerHTML = '<div class="card">' + S.base.rules.map(function (r) {
      var it = item('rule', r.id), cur = it && it.fields && typeof it.fields.value === 'number' ? it.fields.value : r.v;
      return '<div style="border-top:1px solid var(--line);padding:10px 0"><b>' + esc(r.label) + '</b> <span class="muted">[' + ST[stOf('rule', r.id)] + ' · 기본 ' + r.v + ' · 범위 ' + r.min + '~' + r.max + ']</span><p class="muted" style="margin:4px 0">' + esc(r.desc) + '</p>' +
        '<div class="row" style="gap:6px"><input type="number" step="0.1" min="' + r.min + '" max="' + r.max + '" value="' + cur + '" data-rv="' + r.id + '" style="width:90px"><button class="btn" data-sv="' + r.id + '">저장</button><button class="btn" data-pb="' + r.id + '">게시</button><button class="btn" data-up="' + r.id + '">게시 취소</button></div>' + hist('rule', r.id) + '</div>';
    }).join('') + '</div>';
    $$('[data-sv]').forEach(function (b) { b.onclick = function () { var v = parseFloat($('[data-rv="' + b.dataset.sv + '"]').value); call('PUT', '', { kind: 'rule', id: b.dataset.sv, action: 'save', fields: { value: v } }).then(function (d) { d._ok ? load('초안으로 저장했습니다') : fail(d); }); }; });
    $$('[data-pb]').forEach(function (b) { b.onclick = function () { call('PUT', '', { kind: 'rule', id: b.dataset.pb, action: 'approve_publish' }).then(function (d) { d._ok ? load('게시했습니다') : fail(d); }); }; });
    $$('[data-up]').forEach(function (b) { b.onclick = function () { call('PUT', '', { kind: 'rule', id: b.dataset.up, action: 'unpublish' }).then(function (d) { d._ok ? load('게시를 취소했습니다') : fail(d); }); }; });
    bindRestore();
  }
  function drawText() {
    var groups = []; S.base.texts.forEach(function (t) { if (groups.indexOf(t.group) < 0) groups.push(t.group); });
    var f = S.f, list = S.base.texts.filter(function (t) { var s = stOf('text', t.id); return (!f.group || t.group === f.group) && (!f.st || s === f.st) && (!f.q || (t.id + t.label + t.text).indexOf(f.q) >= 0); });
    $('#fsBody').innerHTML = '<div class="card"><div class="row" style="gap:6px;flex-wrap:wrap"><select id="fsG"><option value="">분류 전체</option>' + groups.map(function (g) { return '<option' + (f.group === g ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select>' +
      '<select id="fsS"><option value="">상태 전체</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (f.st === k ? ' selected' : '') + '>' + ST[k] + '</option>'; }).join('') + '</select><input id="fsQ" placeholder="검색" value="' + esc(f.q) + '"></div><p class="muted">' + list.length + '건 표시 (전체 ' + S.base.texts.length + ')</p></div>' +
      list.slice(0, 40).map(function (t) {
        var it = item('text', t.id), cur = it && it.fields && it.fields.text ? it.fields.text : t.text;
        return '<div class="card"><b>' + esc(t.label) + '</b> <span class="muted">' + esc(t.id) + ' · ' + ST[stOf('text', t.id)] + '</span><textarea data-tx="' + esc(t.id) + '" rows="3" style="width:100%;margin-top:6px">' + esc(cur) + '</textarea>' +
          '<div class="row" style="gap:6px;margin-top:6px"><button class="btn" data-ts="' + esc(t.id) + '">저장</button><button class="btn" data-tp="' + esc(t.id) + '">게시</button><button class="btn" data-tu="' + esc(t.id) + '">게시 취소</button></div>' + hist('text', t.id) + '</div>';
      }).join('') + (list.length > 40 ? '<p class="muted">처음 40건만 보입니다. 분류·검색으로 좁혀 주세요.</p>' : '');
    $('#fsG').onchange = function () { S.f.group = this.value; drawText(); }; $('#fsS').onchange = function () { S.f.st = this.value; drawText(); }; $('#fsQ').onchange = function () { S.f.q = this.value; drawText(); };
    $$('[data-ts]').forEach(function (b) { b.onclick = function () { call('PUT', '', { kind: 'text', id: b.dataset.ts, action: 'save', fields: { text: $('[data-tx="' + b.dataset.ts + '"]').value } }).then(function (d) { d._ok ? load('초안으로 저장했습니다') : fail(d); }); }; });
    $$('[data-tp]').forEach(function (b) { b.onclick = function () { call('PUT', '', { kind: 'text', id: b.dataset.tp, action: 'approve_publish' }).then(function (d) { d._ok ? load('게시했습니다') : fail(d); }); }; });
    $$('[data-tu]').forEach(function (b) { b.onclick = function () { call('PUT', '', { kind: 'text', id: b.dataset.tu, action: 'unpublish' }).then(function (d) { d._ok ? load('게시를 취소했습니다') : fail(d); }); }; });
    bindRestore();
  }
  function drawBasis() {
    var sc = S.base.school;
    $('#fsBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">계산 기준(유파)</h3><ul style="margin:0 0 0 18px"><li>' + esc(sc.name) + '</li><li>' + esc(sc.periodBoundary) + '</li><li>' + esc(sc.yuan) + '</li><li>' + esc(sc.chartBasis) + '</li><li>' + esc(sc.stateBasis) + '</li><li>' + esc(sc.fiveRule) + '</li></ul>' +
      '<h3 style="margin:12px 0 6px;color:var(--gold)">지원하지 않는 규칙·예외</h3><ul style="margin:0 0 0 18px">' + S.base.exceptions.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul></div>';
  }
  function drawSim() {
    var s = S.sim;
    $('#fsBody').innerHTML = '<div class="card"><p class="muted">사주 없이 건물만 계산합니다. 서버에 저장하지 않으며, 게시 전 초안 문구는 반영되지 않습니다(기본·게시 문구 기준).</p><div class="row" style="gap:6px;flex-wrap:wrap"><label>향(°) <input id="fsF" type="number" value="' + s.facing + '" style="width:80px"></label><label>준공연도 <input id="fsB" type="number" value="' + s.built + '" style="width:90px"></label><label>평가연도 <input id="fsE" type="number" value="' + s.eval + '" style="width:90px"></label><button class="btn" id="fsRun">계산</button></div><div id="fsOut"></div></div>';
    $('#fsRun').onclick = function () {
      var out = $('#fsOut'); S.sim = { facing: +$('#fsF').value, built: +$('#fsB').value, eval: +$('#fsE').value };
      try {
        var c = F.xuankong({ facingDeg: S.sim.facing, builtYear: S.sim.built, evalYear: S.sim.eval }), g = { SE: 0, S: 1, SW: 2, E: 3, C: 4, W: 5, NE: 6, N: 7, NW: 8 };
        var cells = ['SE', 'S', 'SW', 'E', 'C', 'W', 'NE', 'N', 'NW'].map(function (k) { var p = c.palaces.filter(function (x) { return x.key === k; })[0]; return '<div style="border:1px solid var(--line);border-radius:8px;padding:6px"><b>' + p.dir + '</b><br>운 ' + p.yun + ' · 산 ' + p.shan + ' · 향 ' + p.xiang + '</div>'; }).join('');
        out.innerHTML = '<p><b>' + esc(c.pattern.name) + '</b> — ' + esc(c.pattern.text) + '</p><p class="muted">향 ' + esc(c.facing.mt.label) + ' · 좌 ' + esc(c.sitting.mt.label) + ' · ' + c.period + '운 건물 · 평가 ' + c.nowPeriod + '운</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">' + cells + '</div>' + (c.warnings.length ? '<ul>' + c.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '');
      } catch (e) { out.innerHTML = '<p style="color:#FF8A78">' + esc(e.message) + '</p>'; }
    };
  }
  window.V2Fengshui = { open: function (password) { pw = password; root = document.getElementById('t-fengshui'); if (!root || !F) return; load(); } };
})();
