/* 관리자 "커뮤니티 공개·베타" 탭 — 운명의 광장 1단계 운영.
   ① 공개 단계(/api/community/status PUT): 개발 중 → 비공개 베타 → 정식 공개. 정식 공개는 확인 문구를 직접 입력해야 한다.
   ② 접근 권한(/api/community/access): 테스터(개발 중에도 입장)·베타 회원(비공개 베타부터 입장) 주기·회수. 가입한 회원의 이메일로 찾는다.
   ③ 출시 알림 현황(/api/community/alert GET): 신청자 수·회원/비회원·최근 신청(이메일 가림).
   ④ 관리자 입장(/api/community/enter): 이 브라우저에 입장 쿠키를 받아 /community/ 를 연다.
   모든 변경은 서버가 감사 로그(admin_audit_log)에 작업자 이름과 함께 남긴다. */
(function () {
  'use strict';
  var pw = '', root;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); };
  var who = function () { try { return localStorage.getItem('iching_reviewer') || ''; } catch (e) { return ''; } };
  var when = function (t) { try { return t ? new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; } catch (e) { return String(t); } };
  var LABEL = { dev: '개발 중', beta: '비공개 베타', public: '정식 공개' };
  var ROLE = { tester: '테스터', beta: '베타 회원', moderator: '운영자' };
  function call(path, opt) {
    opt = opt || {};
    return fetch(path, { method: opt.method || 'GET', cache: 'no-store', credentials: 'same-origin', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who()) }, body: opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || ('오류 ' + r.status)); return d; }); });
  }
  function msg(id, t, bad) { var e = $('#' + id); if (e) { e.textContent = t; e.style.color = bad ? '#FF8A78' : ''; } }

  function drawStage(s) {
    var box = $('#cmStage'); if (!box) return;
    var cur = s.stage || 'dev';
    box.innerHTML = '<p style="margin:0 0 10px">지금 단계: <b style="color:var(--gold)">' + esc(LABEL[cur]) + '</b></p>' +
      '<div class="row">' + ['dev', 'beta', 'public'].map(function (k) { return '<button class="btn' + (k === cur ? '' : ' ghost') + '" data-stage="' + k + '"' + (k === cur ? ' disabled' : '') + '>' + LABEL[k] + '</button>'; }).join('') + '</div>' +
      '<ul class="muted" style="margin:10px 0 0;padding-left:1.2em;line-height:1.8"><li>개발 중: 관리자·테스터만 들어갑니다. 일반 방문자는 주소를 직접 입력해도 처음 화면의 "준비 중"으로 돌아갑니다.</li><li>비공개 베타: 위 + 베타 회원. 베타에서 개발 중으로 낮추면 베타 회원의 입장 쿠키는 즉시 무효가 됩니다.</li><li>정식 공개: 누구나 들어갑니다. 공개 기준(가입자·알림 신청자·베타 활동·재방문·신고 처리·보안 점검)을 확인한 뒤에만 바꾸세요.</li></ul>' +
      '<p class="muted" id="cmStageMsg" style="margin:8px 0 0"></p>';
    [].forEach.call(box.querySelectorAll('[data-stage]'), function (b) {
      b.onclick = function () {
        var to = b.getAttribute('data-stage'), body = { stage: to };
        if (to === 'public') { var c = prompt('운명의 광장을 모든 방문자에게 공개합니다. 계속하려면 "정식 공개"라고 입력해 주세요.'); if (c !== '정식 공개') return; body.confirm = c; }
        else if (!confirm('공개 단계를 "' + LABEL[to] + '"(으)로 바꿉니다. 계속할까요?')) return;
        call('/api/community/status', { method: 'PUT', body: body }).then(function (d) { drawStage(d); msg('cmStageMsg', '바뀌었습니다' + (d.audited ? '(감사 로그 기록됨)' : '(감사 로그 기록 실패 — Supabase 표 확인)')); }).catch(function (e) { msg('cmStageMsg', e.message, true); });
      };
    });
  }
  function loadAccess() {
    var box = $('#cmAccList'); if (!box) return;
    box.innerHTML = '<p class="muted">불러오는 중…</p>';
    call('/api/community/access').then(function (d) {
      if (!d.items.length) { box.innerHTML = '<p class="muted">아직 권한을 준 회원이 없습니다.</p>'; return; }
      box.innerHTML = '<p class="muted" style="margin:0 0 6px">유효 ' + d.active + '명</p><table class="tbl"><thead><tr><th>이메일</th><th>권한</th><th>메모</th><th>준 사람·시각</th><th></th></tr></thead><tbody>' +
        d.items.map(function (x) { return '<tr' + (x.revokedAt ? ' style="opacity:.5"' : '') + '><td>' + esc(x.email || x.userId.slice(0, 8)) + '</td><td>' + esc(ROLE[x.role] || x.role) + '</td><td>' + esc(x.note || '') + '</td><td>' + esc(x.grantedBy || '') + ' · ' + when(x.grantedAt) + '</td><td>' + (x.revokedAt ? '회수 ' + when(x.revokedAt) : '<button class="btn ghost sm" data-rv="' + esc(x.userId) + '">회수</button>') + '</td></tr>'; }).join('') + '</tbody></table>';
      [].forEach.call(box.querySelectorAll('[data-rv]'), function (b) { b.onclick = function () { if (!confirm('이 회원의 커뮤니티 접근 권한을 회수할까요? 이미 받은 입장 쿠키는 최대 12시간 남습니다.')) return; call('/api/community/access?user=' + encodeURIComponent(b.getAttribute('data-rv')), { method: 'DELETE' }).then(loadAccess).catch(function (e) { alert(e.message); }); }; });
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function loadAlerts() {
    var box = $('#cmAlert'); if (!box) return;
    call('/api/community/alert').then(function (d) {
      box.innerHTML = '<div class="row" style="gap:18px"><span>신청 중 <b style="color:var(--gold)">' + d.active + '</b>명</span><span>회원 ' + d.members + ' · 비회원 ' + d.guests + '</span><span>최근 7일 ' + d.last7days + '</span><span class="muted">철회 ' + d.revoked + '</span></div>' +
        '<p class="muted" style="margin:6px 0">동의 문구 버전 ' + esc(d.consentVersion) + '</p>' +
        (d.recent.length ? '<table class="tbl"><thead><tr><th>이메일</th><th>구분</th><th>경로</th><th>신청</th><th>철회</th></tr></thead><tbody>' + d.recent.map(function (r) { return '<tr><td>' + esc(r.email) + '</td><td>' + (r.member ? '회원' : '비회원') + '</td><td>' + esc(r.source || '') + '</td><td>' + when(r.at) + '</td><td>' + (r.revokedAt ? when(r.revokedAt) : '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">아직 신청이 없습니다.</p>');
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  function draw() {
    root.innerHTML =
      '<div class="card"><h3 style="margin:0 0 8px">① 공개 단계</h3><div id="cmStage"><p class="muted">불러오는 중…</p></div>' +
      '<div class="row" style="margin-top:12px"><button class="btn ghost" id="cmEnter">관리자로 커뮤니티 열어 보기</button><span class="muted" id="cmEnterMsg"></span></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">② 테스터·베타 회원</h3>' +
      '<p class="muted" style="margin:0 0 8px">먼저 그 사람이 심층 분석에서 로그인(가입)해야 합니다. 테스터는 개발 중에도, 베타 회원은 비공개 베타부터 들어갑니다.</p>' +
      '<div class="row"><input type="email" id="cmEmail" placeholder="회원 이메일" style="min-width:220px"><select id="cmRole"><option value="beta">베타 회원</option><option value="tester">테스터</option></select><input type="text" id="cmNote" placeholder="메모(선택)" maxlength="80"><button class="btn" id="cmGrant">권한 주기</button><span class="muted" id="cmGrantMsg"></span></div>' +
      '<div id="cmAccList" style="margin-top:10px"></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">③ 출시 알림 신청</h3><div id="cmAlert"><p class="muted">불러오는 중…</p></div>' +
      '<p class="muted" style="margin:8px 0 0">출시 알림은 광고성 정보 수신 동의와 별개입니다. 정식 공개 때 출시 소식 1회만 보낼 수 있습니다.</p></div>';
    $('#cmGrant').onclick = function () {
      var em = $('#cmEmail').value.trim(); if (!em) { msg('cmGrantMsg', '이메일을 입력해 주세요', true); return; }
      call('/api/community/access', { method: 'POST', body: { email: em, role: $('#cmRole').value, note: $('#cmNote').value.trim() } }).then(function () { msg('cmGrantMsg', '권한을 주었습니다'); $('#cmEmail').value = ''; $('#cmNote').value = ''; loadAccess(); }).catch(function (e) { msg('cmGrantMsg', e.message, true); });
    };
    $('#cmEnter').onclick = function () { call('/api/community/enter', { method: 'POST' }).then(function (d) { window.open(d.to || '/community/', '_blank', 'noopener'); msg('cmEnterMsg', '새 탭에서 열었습니다(12시간 유효)'); }).catch(function (e) { msg('cmEnterMsg', e.message, true); }); };
    fetch('/api/community/status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(drawStage).catch(function () { drawStage({ stage: 'dev' }); });
    loadAccess(); loadAlerts();
  }
  window.V2Community = { open: function (p) { pw = p || ''; root = document.getElementById('t-community'); if (root) draw(); } };
})();
