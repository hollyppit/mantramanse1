/* 관리자 "챕터 감사 성적표" 탭 — 읽기 전용.
   tools/timeline-chapter-audit.cjs(측정) + tools/timeline-chapter-audit-report.cjs(판단 붙이기)가 만든 report/admin/data/timeline-chapter-audit.json 을 그대로 보여 준다.
   서버에 아무것도 저장하지 않고, 문안·DB·엔진을 바꾸지 않는다. 숫자를 새로 하려면 로컬에서 두 도구를 다시 돌리고 배포한다. */
(function () {
  'use strict';
  var root, data = null, S = { topic: 'all', sort: 'order', only: '' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pct = function (v) { return v == null ? '-' : Math.round(100 * v) + '%'; };
  var TOPIC = { self: '종합풀이', wealth: '재물운', career: '커리어운', love: '인연운' };
  var V_COL = { '유지': '#62C2AE', '보완': '#E0BC74', '보완(우선)': '#FF8A78', '통합 후보': '#9AA8FF' };
  // 나쁠수록 붉게(값, 주의 기준, 위험 기준, 높을수록 좋은 지표면 true)
  function cell(v, warn, bad, goodHigh) { var x = goodHigh ? 1 - v : v, c = x >= bad ? '#FF8A78' : x >= warn ? '#E0BC74' : ''; return '<td style="text-align:right' + (c ? ';color:' + c + ';font-weight:600' : '') + '">' + pct(v) + '</td>'; }
  function verdictOf(r) { var m = data.mergeHints && data.mergeHints[r.short]; return m ? { v: m.v, why: r.why.concat([m.why]) } : { v: r.v, why: r.why }; }

  function summary() {
    var rows = data.rows, avg = function (k) { return rows.reduce(function (s, r) { return s + r[k]; }, 0) / rows.length; };
    var cnt = {}; rows.forEach(function (r) { var v = verdictOf(r).v; cnt[v] = (cnt[v] || 0) + 1; });
    return '<div class="card"><h3 style="margin:0 0 6px">한눈에 보기</h3><p class="muted" style="margin:0 0 8px">가상 사주 ' + data.N + '명 × 공개 ' + rows.length + '장 · 측정 ' + esc(data.generated) + ' · 운영 게시 목차 v' + data.catalogVersion + ' · 서사 엔진 켜짐, topicDeep 꺼짐 상태로 조립</p>' +
      '<div class="row" style="flex-wrap:wrap;gap:8px">' + [['얇은 장', avg('thin')], ['같은 글', avg('sameText')], ['문장 겹침', avg('jaccard')], ['앞 장 반복', avg('repeat')], ['근거에 내 값 줄', avg('evidHas')], ['20세↓ 어른 장면', avg('youngBad')], ['65세↑ 어색', avg('seniorBad')], ['그래프 어긋남', avg('graphBad')]].map(function (x) { return '<span class="chip">' + x[0] + ' <b>' + pct(x[1]) + '</b></span>'; }).join('') + '</div>' +
      '<p style="margin:8px 0 0">' + Object.keys(cnt).map(function (k) { return '<b style="color:' + (V_COL[k] || 'inherit') + '">' + esc(k) + ' ' + cnt[k] + '장</b>'; }).join(' · ') + '</p></div>';
  }
  function table() {
    var rows = data.rows.filter(function (r) { return S.topic === 'all' || r.topic === S.topic; }).filter(function (r) { return !S.only || verdictOf(r).v === S.only; });
    var keyF = { order: null, thin: 'thin', jaccard: 'jaccard', evidHas: 'evidHas', youngBad: 'youngBad', seniorBad: 'seniorBad' }[S.sort];
    if (keyF) rows = rows.slice().sort(function (a, b) { return keyF === 'evidHas' ? a[keyF] - b[keyF] : b[keyF] - a[keyF]; });
    var h = '<div class="card" style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.85rem"><thead><tr>' + ['장', '제목', 'DB 없음', '서사', '얇음', '글자', '문장 겹침', '고정 문장', '앞 장 반복', '근거 값 줄', '근거 부족', '20세↓', '65세↑', '그래프', '판정'].map(function (t) { return '<th style="text-align:left;padding:4px 6px;border-bottom:1px solid #333">' + t + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var v = verdictOf(r);
      h += '<tr data-ca="' + esc(r.short) + '" style="cursor:pointer;border-bottom:1px solid #222"><td style="padding:4px 6px">' + esc(r.short) + '</td><td>' + esc(r.title) + '</td>' + cell(r.dbFallback, .3, .6) + '<td style="text-align:right">' + pct(r.narrative) + '</td>' + cell(r.thin, .1, .3) + '<td style="text-align:right">' + r.avgChars.toLocaleString() + '</td>' + cell(r.jaccard, .25, .45) + cell(r.fixedShare, .25, .4) + cell(r.repeat, .1, .3) + cell(r.evidHas, .3, .5, true) + cell(r.evidThin, .1, .3) + (r.youngN ? cell(r.youngBad, .3, .6) : '<td>-</td>') + (r.seniorN ? cell(r.seniorBad, .1, .3) : '<td>-</td>') + (r.graphChecked ? cell(r.graphBad, .05, .15) : '<td>-</td>') + '<td><b style="color:' + (V_COL[v.v] || 'inherit') + '">' + esc(v.v) + '</b></td></tr>';
    });
    return h + '</tbody></table><p class="muted" style="margin:8px 0 0">줄을 누르면 그 장의 층·엔진·근거·예문을 펼칩니다. 열 뜻은 docs/TIMELINE_CHAPTER_AUDIT_2026-11-15.md 3절.</p></div>';
  }
  function detail(id) {
    var r = data.rows.find(function (x) { return x.short === id; }); if (!r) return '';
    var v = verdictOf(r), ex = function (box) { return Object.keys(box || {}).slice(0, 4).map(function (k) { var e = box[k]; return '<li>' + esc(k) + ' — ' + (e && e.n != null ? e.n + '명 · “' + esc(e.ex) + '”' : esc(e)) + '</li>'; }).join(''); };
    return '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">' + esc(r.short + ' · ' + r.title) + ' <b style="color:' + (V_COL[v.v] || 'inherit') + '">' + esc(v.v) + '</b></h3>' +
      '<p style="margin:0 0 6px">' + (v.why.length ? esc(v.why.join(' · ')) : '기준 통과') + '</p>' +
      '<p style="margin:0 0 4px"><b>붙는 층</b> ' + esc(r.layers.join(', ')) + '</p>' +
      '<p style="margin:0 0 4px"><b>층별 평균 글자</b> ' + esc(Object.keys(r.layerAvg).filter(function (k) { return k !== 'head' && k !== 'end'; }).map(function (k) { return k + ' ' + r.layerAvg[k] + (r.layerShare[k] < .95 ? '(' + pct(r.layerShare[k]) + ')' : ''); }).join(' · ')) + '</p>' +
      '<p style="margin:0 0 4px"><b>쓰는 엔진</b> ' + esc((data.chapterEngine[r.short] || []).join(', ') || '-') + '</p>' +
      '<p style="margin:0 0 4px"><b>DB 문안</b> 서로 다른 ' + r.dbEntryKinds + '편이 나옴 · 가장 흔한 ' + esc(r.dbTopEntry || '-') + ' ' + pct(r.dbTopShare) + ' · 서사 규칙 ' + r.narrRuleKinds + '가지</p>' +
      (r.repeatEx.length ? '<p style="margin:6px 0 2px"><b>앞 장 반복 예</b></p><ul>' + r.repeatEx.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') +
      (Object.keys(r.youngEx).length ? '<p style="margin:6px 0 2px"><b>20세 미만 어른 장면 예</b> (층 · 낱말)</p><ul>' + ex(r.youngEx) + '</ul>' : '') +
      (Object.keys(r.seniorEx).length ? '<p style="margin:6px 0 2px"><b>65세 이상 어색한 장면 예</b></p><ul>' + ex(r.seniorEx) + '</ul>' : '') +
      (Object.keys(r.banEx).length ? '<p style="margin:6px 0 2px"><b>단정 표현 예</b></p><ul>' + ex(r.banEx) + '</ul>' : '') +
      (r.graphEx.length ? '<p style="margin:6px 0 2px"><b>그래프와 어긋난 문장</b></p><ul>' + r.graphEx.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  function engines() {
    return '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">엔진 활용 지도</h3><table style="width:100%;font-size:.85rem;border-collapse:collapse"><tr><th style="text-align:left">계산 결과</th><th style="white-space:nowrap">쓰는 장</th><th style="text-align:left">장</th></tr>' +
      data.engineMap.map(function (e) { return '<tr style="border-bottom:1px solid #222"><td>' + esc(e.label) + '</td><td style="text-align:right;color:' + (e.chapters.length ? '' : '#FF8A78') + '">' + e.chapters.length + '</td><td>' + esc(e.chapters.length >= 55 ? '거의 전부' : e.chapters.join(', ') || '안 씀') + (e.offOnly.length ? ' <span class="muted">(꺼진 topicDeep: ' + esc(e.offOnly.join(', ')) + ')</span>' : '') + '</td></tr>'; }).join('') + '</table>' +
      '<h4 style="margin:12px 0 4px">별도 엔진 모듈</h4><table style="width:100%;font-size:.85rem;border-collapse:collapse"><tr><th style="text-align:left">모듈</th><th style="text-align:left">계산</th><th>타임라인 로드</th><th style="text-align:left">topicDeep 켜면</th></tr>' +
      data.modMap.map(function (m) { return '<tr style="border-bottom:1px solid #222"><td>' + esc(m.file) + '</td><td>' + esc(m.what) + '</td><td style="text-align:center;color:' + (m.timelineLoaded ? '#62C2AE' : '#FF8A78') + '">' + (m.timelineLoaded ? '예' : '아니오') + '</td><td>' + esc(m.topicDeepOff.join(', ') || '-') + '</td></tr>'; }).join('') + '</table></div>';
  }
  function plans() {
    return '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">우선순위 제안</h3><ol>' + (data.priorities || []).map(function (p) { return '<li style="margin:6px 0"><b>' + esc(p.title) + '</b><br><span class="muted">' + esc(p.why) + '</span><br>할 일: ' + esc(p.do) + '</li>'; }).join('') + '</ol>' +
      '<h3 style="margin:12px 0 6px">비공개 3주제 후보 장</h3>' + (data.hiddenPlan || []).map(function (t) { return '<details style="margin:6px 0"><summary><b>' + esc(t.name) + '</b></summary><p class="muted">' + esc(t.note) + '</p><ul>' + t.chapters.map(function (c) { return '<li><b>' + esc(c[0]) + '</b> — ' + esc(c[1]) + ' · 재료 ' + esc(c[2]) + ' · ' + esc(c[3]) + '</li>'; }).join('') + '</ul></details>'; }).join('') + '</div>';
  }
  function draw() {
    var sel = function (id, opts, cur) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
    root.innerHTML = summary() + '<div class="row" style="margin:12px 0;gap:8px;flex-wrap:wrap">' +
      sel('caTopic', [['all', '전체 주제']].concat(Object.keys(TOPIC).map(function (k) { return [k, TOPIC[k]]; })), S.topic) +
      sel('caSort', [['order', '목차 순서'], ['thin', '얇은 장 많은 순'], ['jaccard', '문장 겹침 높은 순'], ['evidHas', '근거 값 줄 적은 순'], ['youngBad', '20세↓ 문제 많은 순'], ['seniorBad', '65세↑ 문제 많은 순']], S.sort) +
      sel('caOnly', [['', '모든 판정'], ['보완(우선)', '보완(우선)'], ['보완', '보완'], ['통합 후보', '통합 후보'], ['유지', '유지']], S.only) + '</div>' +
      table() + '<div id="caDetail"></div>' + engines() + plans();
    ['caTopic', 'caSort', 'caOnly'].forEach(function (id) { root.querySelector('#' + id).onchange = function (e) { S[{ caTopic: 'topic', caSort: 'sort', caOnly: 'only' }[id]] = e.target.value; draw(); }; });
    root.onclick = function (e) { var tr = e.target.closest && e.target.closest('[data-ca]'); if (!tr) return; var box = root.querySelector('#caDetail'); box.innerHTML = detail(tr.getAttribute('data-ca')); box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
  }
  window.V2ChapterAudit = { open: function () {
    root = document.getElementById('t-chapteraudit'); if (!root) return;
    if (data) { draw(); return; }
    root.innerHTML = '<div class="card">성적표를 불러오는 중…</div>';
    fetch('data/timeline-chapter-audit.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('성적표 파일이 없습니다(' + r.status + '). 로컬에서 node tools/timeline-chapter-audit.cjs 360 → node tools/timeline-chapter-audit-report.cjs 를 돌린 뒤 배포하세요.'); return r.json(); })
      .then(function (d) { data = d; draw(); }).catch(function (e) { root.innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p></div>'; });
  } };
})();
