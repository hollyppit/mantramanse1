/* 관리자 "지역 데이터" 탭 — 나의 운명 지도의 지역 환경 항목을 출처·기준일과 함께 등록하고, 변경 이력에서 되돌린다.
   API: /api/region (관리자 PUT). 출처 이름·https 주소·기준일이 없으면 저장되지 않는다. 등록하지 않은 항목은 사용자 화면에 "자료 부족"으로 보인다. */
(function () {
  'use strict';
  var pw = '', root, R = window.MantraRegion;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); };
  var S = { items: {}, version: 0, history: [] };
  function call(method, qs, body) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/region' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(t, bad) { var m = $('#rgMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function today() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
  function draw() {
    var regs = R.REGIONS, keys = R.FACT_KEYS, rows = '', n = 0;
    regs.forEach(function (r) {
      keys.forEach(function (k) {
        var f = (S.items[r.id] || {})[k]; if (!f) return; n++;
        rows += '<tr><td>' + esc(r.name) + '</td><td>' + esc(R.FACT_LABEL[k]) + '</td><td>' + esc(f.value) + '</td><td><a href="' + esc(f.source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.source.name) + '</a></td><td>' + esc(f.updated) + '</td><td><button class="btn" data-del="' + r.id + ':' + k + '">삭제</button></td></tr>';
      });
    });
    var hist = S.history.map(function (h) {
      var rn = (R.get(h.id) || {}).name || h.id;
      return '<tr><td>' + h.v + '</td><td>' + esc(h.at.slice(0, 16).replace('T', ' ')) + (h.by ? ' · ' + esc(h.by) : '') + '</td><td>' + esc(rn) + ' · ' + esc(R.FACT_LABEL[h.fact]) + '</td><td>' + esc(h.before ? h.before.value : '없음') + ' → ' + esc(h.after ? h.after.value : '삭제') + (h.restoredFrom ? ' (되돌림)' : '') + '</td><td><button class="btn" data-rs="' + h.v + '">이 변경 되돌리기</button></td></tr>';
    }).join('');
    root.innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">지역 환경 데이터</h3>' +
      '<p class="muted" style="margin:0 0 10px">공식 통계 등 <b>출처를 확인한 값만</b> 등록하세요. 출처 이름·https 주소·기준일이 모두 있어야 저장됩니다. 등록하지 않은 항목은 사용자 화면에 "자료 부족"으로 표시되며, 지역 오행은 원국 계산에 쓰이지 않습니다.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">' +
      '<label>지역 <select id="rgId">' + regs.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + ' (' + esc(r.admin) + ')</option>'; }).join('') + '</select></label>' +
      '<label>항목 <select id="rgFact">' + keys.map(function (k) { return '<option value="' + k + '">' + esc(R.FACT_LABEL[k]) + '</option>'; }).join('') + '</select></label>' +
      '<label style="flex:1;min-width:220px">값 (1~300자) <input id="rgVal" maxlength="300" style="width:100%"></label></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:8px"><label>출처 이름 <input id="rgSrc" maxlength="80" placeholder="예: 통계청 KOSIS"></label><label style="flex:1;min-width:220px">출처 주소 (https) <input id="rgUrl" maxlength="300" style="width:100%" placeholder="https://"></label><label>기준일 <input id="rgDate" type="date" max="' + today() + '"></label><button class="btn" id="rgSave">저장</button><span id="rgMsg" class="muted"></span></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">등록된 값 (' + n + '건 · 버전 ' + S.version + ')</h3>' + (n ? '<div style="overflow:auto"><table style="width:100%;font-size:.88rem"><thead><tr><th>지역</th><th>항목</th><th>값</th><th>출처</th><th>기준일</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="muted">아직 등록된 값이 없습니다. 모든 지역의 모든 항목이 "자료 부족"입니다.</p>') + '</div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">변경 이력 (최근 50건)</h3>' + (hist ? '<div style="overflow:auto"><table style="width:100%;font-size:.86rem"><thead><tr><th>번호</th><th>시각</th><th>지역·항목</th><th>변경</th><th></th></tr></thead><tbody>' + hist + '</tbody></table></div>' : '<p class="muted">이력이 없습니다.</p>') + '</div>';
    $('#rgSave').onclick = function () {
      call('PUT', '', { id: $('#rgId').value, fact: $('#rgFact').value, value: $('#rgVal').value, source: { name: $('#rgSrc').value, url: $('#rgUrl').value }, updated: $('#rgDate').value })
        .then(function (d) { if (!d._ok) return msg(d.error || '저장하지 못했습니다', true); load('저장했습니다'); });
    };
    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.del.split(':'); if (!confirm('이 값을 삭제할까요? (이력에서 되돌릴 수 있습니다)')) return;
        call('PUT', '', { id: p[0], fact: p[1], value: null }).then(function (d) { if (!d._ok) return msg(d.error || '삭제하지 못했습니다', true); load('삭제했습니다'); });
      };
    });
    root.querySelectorAll('[data-rs]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('이 변경 직전 값으로 되돌릴까요?')) return;
        call('PUT', '', { restore: +b.dataset.rs }).then(function (d) { if (!d._ok) return msg(d.error || '되돌리지 못했습니다', true); load('되돌렸습니다'); });
      };
    });
  }
  function load(note) {
    return Promise.all([call('GET', ''), call('GET', '?history=1')]).then(function (a) {
      S.items = a[0].items || {}; S.version = a[0].version || 0; S.history = a[1].history || []; draw(); if (note) msg(note);
    });
  }
  window.V2Region = { open: function (password) { pw = password; root = document.getElementById('t-regiondata'); if (!root || !R) return; load(); } };
})();
