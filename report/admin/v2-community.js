/* 관리자 "커뮤니티 공개·베타" 탭 — 운명의 광장 1단계 운영.
   ① 공개 단계(/api/community/status PUT): 개발 중 → 비공개 베타 → 정식 공개. 정식 공개는 확인 문구를 직접 입력해야 한다.
   ② 접근 권한(/api/community/access): 테스터(개발 중에도 입장)·베타 회원(비공개 베타부터 입장) 주기·회수. 가입한 회원의 이메일로 찾는다.
   ③ 출시 알림 현황(/api/community/alert GET): 신청자 수·회원/비회원·최근 신청(이메일 가림).
   ④ 관리자 입장(/api/community/enter): 이 브라우저에 입장 쿠키를 받아 /community/ 를 연다.
   ⑤ 회원 동의 현황(/api/account/consent GET, 2단계): 항목별 동의 수·2년 재확인 대상·최근 변경(회원 id 없이).
   ⑥ 감사 로그(/api/community/audit): 관리자 작업 최근 50건.
   ⑦ 광장 운영(/api/community/mod, 3단계): 신고 묶음 처리(숨김·삭제·기각·제재), 숨겨진 글, 제재 목록·해제.
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

  var KIND = { terms: '이용약관(필수)', privacy: '개인정보 수집·이용(필수)', marketing_email: '광고 · 이메일', marketing_sms: '광고 · 문자', marketing_kakao: '광고 · 카카오톡', marketing_night: '광고 · 야간 수신' };
  var VIA = { mypage: '마이페이지', gate: '처음 화면', community: '광장', signup: '가입', admin: '관리자', system: '자동' };
  function loadConsents() {
    var box = $('#cmConsent'); if (!box) return;
    call('/api/account/consent').then(function (d) {
      var ks = Object.keys(KIND);
      box.innerHTML = '<table class="tbl"><thead><tr><th>항목</th><th>동의 중</th><th>지금 문구 버전</th><th>2년 재확인 대상</th></tr></thead><tbody>' +
        ks.map(function (k) { var b = d.byKind[k] || {}; return '<tr><td>' + esc(KIND[k]) + '</td><td>' + (b.agreed || 0) + '</td><td>' + (b.current || 0) + '</td><td>' + (k.indexOf('marketing_') === 0 ? (b.renewDue || 0) : '—') + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<p class="muted" style="margin:8px 0 4px">최근 변경(누구인지는 표시하지 않습니다)</p>' +
        (d.recent.length ? '<table class="tbl"><thead><tr><th>시각</th><th>항목</th><th>처리</th><th>경로</th></tr></thead><tbody>' + d.recent.map(function (r) { return '<tr><td>' + when(r.at) + '</td><td>' + esc(KIND[r.kind] || r.kind) + '</td><td>' + (r.action === 'grant' ? '동의' : '철회') + '</td><td>' + esc(VIA[r.via] || r.via || '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">아직 변경 기록이 없습니다.</p>');
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  var ACT = { 'community.stage': '공개 단계 변경', 'community.access.grant': '권한 주기', 'community.access.revoke': '권한 회수', 'community.mod.hide': '글 숨김', 'community.mod.restore': '글 되살림', 'community.mod.delete': '글 삭제', 'community.mod.dismiss': '신고 기각', 'community.sanction.warn': '경고', 'community.sanction.mute': '쓰기 정지', 'community.sanction.ban': '이용 정지', 'community.sanction.lift': '제재 해제' };
  var SK = { warn: '경고', mute: '쓰기 정지', ban: '이용 정지' };
  var modView = 'reports';
  function loadMod() {
    var box = $('#cmMod'); if (!box) return;
    box.innerHTML = '<p class="muted">불러오는 중…</p>';
    [].forEach.call(root.querySelectorAll('[data-mv]'), function (b) { b.className = 'btn sm' + (b.getAttribute('data-mv') === modView ? '' : ' ghost'); });
    call('/api/community/mod?view=' + modView).then(function (d) {
      if (modView === 'sanctions') {
        box.innerHTML = d.items.length ? '<table class="tbl"><thead><tr><th>회원</th><th>종류</th><th>사유</th><th>기한</th><th>처리</th><th></th></tr></thead><tbody>' + d.items.map(function (x) { return '<tr' + (x.lifted ? ' style="opacity:.5"' : '') + '><td>' + esc(x.who) + '</td><td>' + esc(SK[x.kind]) + '</td><td>' + esc(x.reason) + '</td><td>' + (x.kind === 'warn' ? '—' : x.until ? when(x.until) : '무기한') + '</td><td>' + esc(x.by) + ' · ' + when(x.at) + '</td><td>' + (x.lifted || x.kind === 'warn' ? (x.lifted ? '해제 ' + when(x.lifted) : '') : '<button class="btn ghost sm" data-lift="' + x.id + '">해제</button>') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">제재 기록이 없습니다.</p>';
      } else {
        box.innerHTML = d.items.length ? d.items.map(function (x) {
          var link = x.type === 'post' ? '/community/#/p/' + x.id : '/community/#/p/' + x.post;
          return '<div class="card" style="margin:8px 0;padding:10px 12px"><div class="row" style="justify-content:space-between;gap:8px"><b>' + (x.type === 'post' ? '글' : '댓글') + ' #' + x.id + ' · ' + esc(x.who) + '</b><span class="muted">' + (modView === 'reports' ? '신고 ' + x.count + '건 · ' + Object.keys(x.reasons).map(function (k) { return esc(k) + ' ' + x.reasons[k]; }).join(', ') + ' · 상태 ' + esc(x.status) : '신고 ' + x.reports + '건 · ' + when(x.at)) + '</span></div>' +
            '<p style="margin:6px 0">' + esc(x.preview) + '</p>' + (x.details && x.details.length ? '<p class="muted" style="margin:0 0 6px">신고 내용: ' + x.details.map(esc).join(' / ') + '</p>' : '') +
            '<div class="row" style="gap:6px;flex-wrap:wrap"><a class="btn ghost sm" href="' + link + '" target="_blank" rel="noopener">열기</a>' +
            (x.status === 'hidden' || modView === 'hidden' ? '<button class="btn ghost sm" data-mod="restore" data-t="' + x.type + '" data-i="' + x.id + '">되살리기</button>' : '<button class="btn ghost sm" data-mod="hide" data-t="' + x.type + '" data-i="' + x.id + '">숨기기</button>') +
            '<button class="btn ghost sm" data-mod="delete" data-t="' + x.type + '" data-i="' + x.id + '">삭제</button>' + (modView === 'reports' ? '<button class="btn ghost sm" data-mod="dismiss" data-t="' + x.type + '" data-i="' + x.id + '">신고 기각</button>' : '') +
            '<button class="btn ghost sm" data-sanc data-t="' + x.type + '" data-i="' + x.id + '">글쓴이 제재</button></div></div>';
        }).join('') : '<p class="muted">' + (modView === 'reports' ? '처리할 신고가 없습니다.' : '숨겨진 글이 없습니다.') + '</p>';
      }
      [].forEach.call(box.querySelectorAll('[data-mod]'), function (b) { b.onclick = function () { var a = b.getAttribute('data-mod'); if (a === 'delete' && !confirm('삭제하면 회원에게 다시 보이지 않습니다. 계속할까요?')) return; call('/api/community/mod', { method: 'POST', body: { action: a, type: b.getAttribute('data-t'), id: +b.getAttribute('data-i') } }).then(function () { loadMod(); loadAudit(); }).catch(function (e) { alert(e.message); }); }; });
      [].forEach.call(box.querySelectorAll('[data-sanc]'), function (b) { b.onclick = function () {
        var kind = prompt('제재 종류를 입력해 주세요: 경고 / 쓰기 정지 / 이용 정지'); var k = { '경고': 'warn', '쓰기 정지': 'mute', '이용 정지': 'ban' }[String(kind || '').trim()]; if (!k) return;
        var days = k === 'warn' ? '' : prompt('며칠 동안? (비우면 무기한)', k === 'mute' ? '7' : ''); if (days === null) return;
        var reason = prompt('사유(회원에게 안내됩니다)'); if (!reason) return;
        call('/api/community/mod', { method: 'POST', body: { action: 'sanction', type: b.getAttribute('data-t'), id: +b.getAttribute('data-i'), kind: k, days: days ? +days : null, reason: reason } }).then(function () { alert('제재했습니다.'); loadMod(); loadAudit(); }).catch(function (e) { alert(e.message); });
      }; });
      [].forEach.call(box.querySelectorAll('[data-lift]'), function (b) { b.onclick = function () { if (!confirm('제재를 해제할까요?')) return; call('/api/community/mod', { method: 'POST', body: { action: 'lift', sanctionId: +b.getAttribute('data-lift') } }).then(function () { loadMod(); loadAudit(); }).catch(function (e) { alert(e.message); }); }; });
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function loadAudit() {
    var box = $('#cmAudit'); if (!box) return;
    call('/api/community/audit?limit=50').then(function (d) {
      box.innerHTML = d.items.length ? '<table class="tbl"><thead><tr><th>시각</th><th>작업자</th><th>작업</th><th>대상</th><th>내용</th></tr></thead><tbody>' + d.items.map(function (r) { return '<tr><td>' + when(r.at) + '</td><td>' + esc(r.actor) + '</td><td>' + esc(ACT[r.action] || r.action) + '</td><td>' + esc(r.target || '') + '</td><td class="muted">' + esc(JSON.stringify(r.detail || {})).slice(0, 160) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">아직 기록이 없습니다.</p>';
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
      '<p class="muted" style="margin:8px 0 0">출시 알림은 광고성 정보 수신 동의와 별개입니다. 정식 공개 때 출시 소식 1회만 보낼 수 있습니다.</p></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">④ 회원 동의 현황</h3><div id="cmConsent"><p class="muted">불러오는 중…</p></div>' +
      '<p class="muted" style="margin:8px 0 0">광고 발송 기능은 아직 없습니다. 보낼 때는 동의 중인 채널로만, 앞에 (광고)·보낸 곳·무료 수신 거부 방법을 넣고, 밤 9시~아침 8시에는 야간 수신 동의자에게만 보냅니다.</p></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑤ 광장 운영 · 신고 처리</h3><div class="row" style="gap:6px;margin-bottom:8px"><button class="btn sm" data-mv="reports">처리할 신고</button><button class="btn ghost sm" data-mv="hidden">숨겨진 글</button><button class="btn ghost sm" data-mv="sanctions">제재 목록</button></div><p class="muted" style="margin:0 0 8px">서로 다른 회원 5명이 신고하면 자동으로 숨겨집니다. 확인 후 되살리거나 삭제해 주세요. 모든 처리는 작업자 이름과 함께 기록됩니다.</p><div id="cmMod"></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑥ 관리자 작업 기록</h3><div id="cmAudit"><p class="muted">불러오는 중…</p></div></div>';
    $('#cmGrant').onclick = function () {
      var em = $('#cmEmail').value.trim(); if (!em) { msg('cmGrantMsg', '이메일을 입력해 주세요', true); return; }
      call('/api/community/access', { method: 'POST', body: { email: em, role: $('#cmRole').value, note: $('#cmNote').value.trim() } }).then(function () { msg('cmGrantMsg', '권한을 주었습니다'); $('#cmEmail').value = ''; $('#cmNote').value = ''; loadAccess(); loadAudit(); }).catch(function (e) { msg('cmGrantMsg', e.message, true); });
    };
    $('#cmEnter').onclick = function () { call('/api/community/enter', { method: 'POST' }).then(function (d) { window.open(d.to || '/community/', '_blank', 'noopener'); msg('cmEnterMsg', '새 탭에서 열었습니다(12시간 유효)'); }).catch(function (e) { msg('cmEnterMsg', e.message, true); }); };
    fetch('/api/community/status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(drawStage).catch(function () { drawStage({ stage: 'dev' }); });
    [].forEach.call(root.querySelectorAll('[data-mv]'), function (b) { b.onclick = function () { modView = b.getAttribute('data-mv'); loadMod(); }; });
    loadAccess(); loadAlerts(); loadConsents(); loadAudit(); loadMod();
  }
  window.V2Community = { open: function (p) { pw = p || ''; root = document.getElementById('t-community'); if (root) draw(); } };
})();
