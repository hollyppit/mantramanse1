/* 관리자 현황 — 한눈에 보는 요약(읽기 전용). 비어 있거나 승인 대기인 곳을 찾아 해당 탭으로 바로 보낸다. */
(function () {
  'use strict';
  var C = window.V2Content, R = window.ReportV2, esc = C.esc;
  var root = function () { return document.getElementById('t-dash'); };
  var get = function (url, pw) { return fetch(url, { headers: { authorization: 'Bearer ' + pw } }).then(function (r) { return r.json().catch(function () { return {}; }); }).catch(function () { return {}; }); };
  var hasUrl = function (v) { return !!(v && v.enabled && (v.videoUrl || v.videoWebm || v.posterUrl)); };

  function card(title, big, lines, tab, label) {
    return '<div class="card" style="padding:14px"><div class="muted" style="font-size:.78rem">' + esc(title) + '</div>' +
      '<div style="font-size:1.6rem;color:var(--gold);font-family:\'Noto Serif KR\',serif">' + big + '</div>' +
      '<div style="font-size:.82rem;color:var(--ink2);margin:4px 0 8px">' + lines.join('<br>') + '</div>' +
      '<button type="button" data-go="' + tab + '">' + esc(label) + ' →</button></div>';
  }
  function warn(n, text) { return n ? '<span style="color:#FFC080">⚠ ' + text + ' ' + n + '</span>' : '<span class="ok">✓ ' + text + ' 없음</span>'; }

  function open(pw) {
    var el = root(); if (!el) return; C.setPw(pw);
    el.innerHTML = '<p class="muted">현황을 불러오는 중…</p>';
    Promise.all([get('/api/media?all=1', pw), get('/api/awakening?all=1', pw), C.load().catch(function () { })]).then(function (a) {
      var media = a[0].media || [], awk = a[1], vids = awk.videos || [], ilg = awk.ilgan || [];
      var ch = [];
      try { ch = R.Chapters.libraryOf(C.ST.saved || {}); } catch (e) { }
      var on = media.filter(function (m) { return m.enabled; }).length;
      var unappr = media.filter(function (m) { return !m.tagsApproved; }).length;
      var pend = media.filter(function (m) { return m.pending; }).length;
      var noUrl = media.filter(function (m) { return m.enabled && !(m.url || m.posterUrl); }).length;
      var iju = {}; vids.forEach(function (v) { if (hasUrl(v)) iju[v.dayPillar + '|' + v.gender] = 1; });
      var il = {}; ilg.forEach(function (v) { if (hasUrl(v)) il[v.stem + '|' + v.gender] = 1; });
      var nIju = Object.keys(iju).length, nIl = Object.keys(il).length;
      var chOff = ch.filter(function (c) { return c.enabled === false; }).length;
      var projs = {}; ch.forEach(function (c) { projs[c.project] = (projs[c.project] || 0) + 1; });
      var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">' +
        card('장면 미디어', media.length + '개', ['사용 중 ' + on + '개', warn(unappr, '태그 미승인'), warn(pend, 'AI 태그 대기'), warn(noUrl, '파일 없는 사용 중 항목')], 'v2clip', '클립 라이브러리') +
        card('일주 캐릭터 영상', nIju + ' / 120', [warn(120 - nIju, '미등록'), '(60일주 × 남·여)'], 'v2intro', '일간·일주 영상') +
        card('일간 소개 영상', nIl + ' / 20', [warn(20 - nIl, '미등록'), '(10일간 × 남·여)'], 'v2intro', '일간·일주 영상') +
        card('챕터', ch.length + '개', [Object.keys(projs).length + '개 프로젝트에 소속', warn(chOff, '비활성 챕터')], 'v2chap', '챕터 관리') +
        '</div>';
      html += '<p class="muted" style="margin-top:14px">저장된 값 기준입니다(저장 전 변경은 반영되지 않음). 숫자를 눌러 고치려면 각 카드의 버튼으로 이동하세요.</p>';
      el.innerHTML = html;
      el.onclick = function (e) { var b = e.target.closest('[data-go]'); if (b) window.AdminShowTab(b.dataset.go); };
    }).catch(function (e) { el.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  window.V2Dash = { open: open };
})();
