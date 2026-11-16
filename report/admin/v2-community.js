/* 관리자 "커뮤니티 공개·베타" 탭 — 인연의 광장 1단계 운영.
   ① 공개 단계(/api/community/status PUT): 개발 중 → 비공개 베타 → 정식 공개. 정식 공개는 확인 문구를 직접 입력해야 한다.
   ② 접근 권한(/api/community/access): 테스터(개발 중에도 입장)·베타 회원(비공개 베타부터 입장) 주기·회수. 가입한 회원의 이메일로 찾는다.
   ③ 출시 알림 현황(/api/community/alert GET): 신청자 수·회원/비회원·최근 신청(이메일 가림).
   ④ 관리자 입장(/api/community/enter): 이 브라우저에 입장 쿠키를 받아 /community/ 를 연다.
   ⑤ 회원 동의 현황(/api/account/consent GET, 2단계): 항목별 동의 수·2년 재확인 대상·최근 변경(회원 id 없이).
   ⑥ 감사 로그(/api/community/audit): 관리자 작업 최근 50건.
   ⑦ 성인 확인(테스트용 수동, /api/community/verify manual, 5단계): 포트원 본인인증 채널(PORTONE_IDV_CHANNEL_KEY) 연결 전 테스터 계정을 확인해 인연 매칭·대화를 시험
   ⑨ 크레딧·유료(/api/community/credits, 6단계): 유료 스위치(기본 꺼짐, 켜려면 '유료 켜기' 입력)·가격·테스트 지급·최근 원장
   ⑩ 성과 지표·⑪ 매칭·대화·매출 현황(/api/community/metrics, 7단계) · ⑫ 회원 찾기(/api/community/members) · ⑬ 운테크 문안(/api/community/today-copy) · ⑭ 운영자 열쇠(/api/community/staff, 관리자만)
   ⑮ 정식 공개 점검표(/api/community/launch, 8단계): 8항목 통과 여부·사람 확인 체크·기준값(관리자만). 미달이면 정식 공개 때 사유를 받는다
   역할별 표시: V2Community.open(열쇠, 역할) — 운영자 콘솔(report/admin/staff.html)은 역할에 맞는 카드만 그린다(서버도 같은 권한을 다시 확인)
   ⑧ 광장 운영(/api/community/mod, 3단계): 신고 묶음 처리(숨김·삭제·기각·제재), 숨겨진 글, 제재 목록·해제.
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
        if (to === 'public') { var c = prompt('인연의 광장을 모든 방문자에게 공개합니다. 계속하려면 "정식 공개"라고 입력해 주세요.'); if (c !== '정식 공개') return; body.confirm = c; }
        else if (!confirm('공개 단계를 "' + LABEL[to] + '"(으)로 바꿉니다. 계속할까요?')) return;
        putStage(body).then(function (d) { drawStage(d); if (typeof loadLaunch === 'function') loadLaunch(); msg('cmStageMsg', '바뀌었습니다' + (d.audited ? '(감사 로그 기록됨)' : '(감사 로그 기록 실패 — Supabase 표 확인)')); }).catch(function (e) { msg('cmStageMsg', e.message, true); });
      };
    });
  }
  function putStage(body) {
    return fetch('/api/community/status', { method: 'PUT', cache: 'no-store', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who()) }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) {
        if (r.ok) return d;
        if (r.status === 409 && d.need === 'checklist' && !body.override) {
          var why = prompt('정식 공개 조건을 아직 다 채우지 못했습니다.\n\n미달: ' + (d.failing || []).join(', ') + '\n\n그래도 공개하려면 사유를 적어 주세요(5자 이상, 작업 기록에 남습니다). 취소하면 공개하지 않습니다.');
          if (!why) throw new Error('공개하지 않았습니다(점검표 미달)');
          return putStage(Object.assign({}, body, { override: true, reason: why }));
        }
        throw new Error(d.error || ('오류 ' + r.status));
      }); });
  }
  /* ── 8단계: 정식 공개 조건 점검표(/api/community/launch). 보기: 지표 권한, 기준값·사람 확인 체크: 관리자 비밀번호만 ── */
  function loadLaunch() {
    var box = $('#cmLaunch'); if (!box) return;
    box.innerHTML = '<p class="muted">점검하는 중…</p>';
    call('/api/community/launch').then(function (d) {
      var own = role === 'owner', T = d.cfg.targets, M = d.cfg.manual, L = d.manualLabels || {};
      var mark = function (p) { return p ? '<b style="color:var(--green,#62C2AE)">통과</b>' : '<b style="color:#FF8A78">미달</b>'; };
      var v = function (x) { return x.value == null ? '<span class="muted">계산 못 함</span>' : esc(typeof x.value === 'number' ? Number(x.value).toLocaleString('ko-KR') : x.value) + esc(typeof x.value !== 'number' || !x.unit ? '' : x.unit === '시간 이내' ? '시간' : x.unit); };
      box.innerHTML = '<p style="margin:0 0 8px">' + (d.ready ? '<b style="color:var(--green,#62C2AE)">모든 조건 통과</b> — 정식 공개를 검토할 수 있습니다.' : '<b style="color:#FF8A78">미달 ' + d.failing.length + '항목</b> — ' + esc(d.failing.join(', '))) + ' <span class="muted">(기준일 ' + esc(d.day) + (d.metricsOk === false ? ' · 지표 함수를 읽지 못함' : '') + ')</span></p>' +
        '<table class="tbl"><thead><tr><th>항목</th><th>지금</th><th>기준</th><th>결과</th></tr></thead><tbody>' +
        d.items.map(function (it) { return it.rows.map(function (x, i) { return '<tr>' + (i === 0 ? '<td rowspan="' + it.rows.length + '"><b>' + it.no + '. ' + esc(it.title) + '</b><br>' + mark(it.pass) + '</td>' : '') + '<td>' + esc(x.label) + ': ' + v(x) + '</td><td class="muted">' + (typeof x.target === 'number' ? (x.unit === '시간 이내' ? x.target + '시간 이내' : '≥ ' + Number(x.target).toLocaleString('ko-KR') + (x.unit && x.unit.charAt(0) !== '/' ? x.unit : '')) : esc(x.target)) + '</td><td>' + (x.pass ? '✓' : '✗') + '</td></tr>'; }).join(''); }).join('') + '</tbody></table>' +
        '<h4 style="margin:12px 0 6px">사람이 확인하는 항목</h4>' + Object.keys(L).map(function (k) { var m = M[k] || {}; return '<div class="row" style="gap:8px;align-items:center;margin:4px 0"><span style="min-width:16px">' + (m.done ? '✓' : '·') + '</span><span style="flex:1;min-width:200px">' + esc(L[k]) + (m.at ? ' <span class="muted">— ' + (m.done ? '확인 ' : '해제 ') + esc(m.by || '') + ' · ' + when(m.at) + (m.note ? ' · ' + esc(m.note) : '') + '</span>' : '') + '</span>' + (own ? '<button class="btn ghost sm" data-chk="' + k + '" data-done="' + (m.done ? '0' : '1') + '">' + (m.done ? '확인 해제' : '확인 완료') + '</button>' : '') + '</div>'; }).join('') +
        (own ? '<details style="margin-top:10px"><summary class="muted">기준값 바꾸기(운영 데이터에 맞게)</summary><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">' +
          [['members', '전체 가입자'], ['mau', '30일 활성'], ['alerts', '출시 알림'], ['betaMin', '베타 인원'], ['betaRate', '베타 참여율 %'], ['posts30', '30일 글'], ['comments30', '30일 댓글'], ['reactions30', '30일 공감'], ['ret7', '7일 재방문 %'], ['ret30', '30일 재방문 %'], ['seedPosts', '보이는 글'], ['seedPerCat', '주제별 글'], ['reportHours', '신고 처리 시간']].map(function (x) { return '<label class="muted">' + x[1] + ' <input type="number" data-tg="' + x[0] + '" value="' + T[x[0]] + '" min="0" style="width:90px"></label>'; }).join('') +
          '<button class="btn ghost sm" id="lnSave">기준 저장</button><span class="muted" id="lnMsg"></span></div></details>' : '') +
        '<p class="muted" style="margin:8px 0 0;font-size:.8rem">정식 공개는 ① 공개 단계에서 관리자 비밀번호로만 바꿉니다. 미달 상태에서 열면 사유를 따로 적어야 하고, 점검 결과와 함께 작업 기록에 남습니다.</p>';
      if (own) {
        [].forEach.call(box.querySelectorAll('[data-chk]'), function (b) { b.onclick = function () { var done = b.getAttribute('data-done') === '1', note = done ? prompt('무엇을 어떻게 확인했나요? (작업 기록에 남습니다)') : (prompt('해제 사유(선택)') || ''); if (done && !note) return; call('/api/community/launch', { method: 'POST', body: { action: 'check', item: b.getAttribute('data-chk'), done: done, note: note } }).then(function () { loadLaunch(); loadAudit(); }).catch(function (e) { alert(e.message); }); }; });
        $('#lnSave').onclick = function () { var t = {}; [].forEach.call(box.querySelectorAll('[data-tg]'), function (el) { t[el.getAttribute('data-tg')] = +el.value; }); call('/api/community/launch', { method: 'PUT', body: { targets: t } }).then(function (r) { msg('lnMsg', r.changed.length ? '저장했습니다(' + r.changed.length + '개 바뀜)' : '바뀐 값이 없습니다'); loadLaunch(); loadAudit(); }).catch(function (e) { msg('lnMsg', e.message, true); }); };
      }
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
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
  var ACT = { 'community.stage': '공개 단계 변경', 'community.access.grant': '권한 주기', 'community.access.revoke': '권한 회수', 'community.mod.hide': '글 숨김', 'community.mod.restore': '글 되살림', 'community.mod.delete': '글 삭제', 'community.mod.dismiss': '신고 기각', 'community.sanction.warn': '경고', 'community.sanction.mute': '쓰기 정지', 'community.sanction.ban': '이용 정지', 'community.sanction.lift': '제재 해제', 'community.mod.avatar': '프로필 사진 지움', 'community.verify.manual': '성인 확인(수동)', 'community.chat.purge': '대화 자동 파기(90일)', 'community.premium.config': '유료 설정 변경', 'community.credit.grant': '크레딧 지급', 'community.staff.create': '운영자 열쇠 만들기', 'community.staff.revoke': '운영자 열쇠 회수', 'community.member.view': '회원 조회', 'community.daily.copy': '운테크 문안 수정', 'community.daily.copy.reset': '운테크 문안 기본으로', 'community.activity.purge': '이용 기록 자동 파기(13개월)', 'community.launch.targets': '공개 기준 변경', 'community.launch.check': '공개 점검 확인' };
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
          var link = x.type === 'post' ? '/community/#/p/' + x.id : x.type === 'comment' ? '/community/#/p/' + x.post : '';
          return '<div class="card" style="margin:8px 0;padding:10px 12px"><div class="row" style="justify-content:space-between;gap:8px"><b>' + (x.type === 'post' ? '글' : '댓글') + ' #' + x.id + ' · ' + esc(x.who) + '</b><span class="muted">' + (modView === 'reports' ? '신고 ' + x.count + '건 · ' + Object.keys(x.reasons).map(function (k) { return esc(k) + ' ' + x.reasons[k]; }).join(', ') + ' · 상태 ' + esc(x.status) : '신고 ' + x.reports + '건 · ' + when(x.at)) + '</span></div>' +
            '<p style="margin:6px 0">' + (x.type === 'message' ? '<b>[대화]</b> ' : '') + esc(x.preview) + '</p>' + (x.context && x.context.length ? '<div class="muted" style="margin:0 0 6px;padding:6px 8px;border-left:2px solid var(--line);font-size:.8rem">' + x.context.map(function (m) { return '<div' + (m.reported ? ' style="color:#FF8A78"' : '') + '>' + esc(m.who) + ': ' + esc(m.body) + '</div>'; }).join('') + '</div>' : '') + (x.details && x.details.length ? '<p class="muted" style="margin:0 0 6px">신고 내용: ' + x.details.map(esc).join(' / ') + '</p>' : '') +
            '<div class="row" style="gap:6px;flex-wrap:wrap">' + (link ? '<a class="btn ghost sm" href="' + link + '" target="_blank" rel="noopener">열기</a>' : '') +
            (x.type === 'message' ? '' : x.status === 'hidden' || modView === 'hidden' ? '<button class="btn ghost sm" data-mod="restore" data-t="' + x.type + '" data-i="' + x.id + '">되살리기</button>' : '<button class="btn ghost sm" data-mod="hide" data-t="' + x.type + '" data-i="' + x.id + '">숨기기</button>') +
            (x.type === 'message' ? '' : '<button class="btn ghost sm" data-mod="delete" data-t="' + x.type + '" data-i="' + x.id + '">삭제</button>') + (modView === 'reports' ? '<button class="btn ghost sm" data-mod="dismiss" data-t="' + x.type + '" data-i="' + x.id + '">신고 기각</button>' : '') +
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

  function loadCredits() {
    var box = $('#cmCr'); if (!box) return;
    call('/api/community/credits?view=admin').then(function (d) {
      var c = d.config;
      box.innerHTML = '<p style="margin:0 0 8px">유료 기능: <b style="color:' + (c.enabled ? '#FF8A78' : 'var(--gold)') + '">' + (c.enabled ? '켜짐' : '꺼짐') + '</b> <button class="btn ghost sm" id="crTog">' + (c.enabled ? '끄기' : '켜기') + '</button></p>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap"><label class="muted">더 보기 가격 <input type="number" id="crMp" min="1" max="100" value="' + c.prices.morePicks + '" style="width:64px"></label><label class="muted">추가 잇기 가격 <input type="number" id="crXl" min="1" max="100" value="' + c.prices.extraLike + '" style="width:64px"></label><label class="muted">더 보기 인원 <input type="number" id="crMc" min="1" max="10" value="' + c.morePicksCount + '" style="width:56px"></label><label class="muted">하루 더 보기 <input type="number" id="crMd" min="0" max="10" value="' + c.morePicksPerDay + '" style="width:56px">번</label><button class="btn ghost sm" id="crSave">가격 저장</button><span class="muted" id="crMsg"></span></div>' +
        '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><input type="email" id="crEmail" placeholder="회원 이메일" style="min-width:200px"><input type="number" id="crAmt" placeholder="크레딧(회수는 -)" style="width:130px"><input type="text" id="crNote" placeholder="메모(선택)" maxlength="60"><button class="btn sm" id="crGrant">지급</button><span class="muted" id="crGMsg"></span></div>' +
        '<p class="muted" style="margin:10px 0 4px">누적: ' + Object.keys(d.totals).map(function (k) { return esc(k) + ' ' + d.totals[k]; }).join(' · ') + '</p>' +
        (d.recent.length ? '<table class="tbl"><thead><tr><th>시각</th><th>회원</th><th>내용</th><th>크레딧</th><th>메모·작업자</th></tr></thead><tbody>' + d.recent.map(function (r) { return '<tr><td>' + when(r.at) + '</td><td>' + esc(r.who) + '</td><td>' + esc(r.label) + '</td><td>' + (r.delta > 0 ? '+' : '') + r.delta + '</td><td class="muted">' + esc([r.ref, r.by].filter(Boolean).join(' · ')) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">아직 원장 기록이 없습니다.</p>');
      $('#crTog').onclick = function () {
        var body = { enabled: !c.enabled };
        if (!c.enabled) { var p = prompt('회원에게 크레딧 기능(더 보기·추가 잇기)을 보여 줍니다. 결제 연결 전에는 관리자가 지급한 크레딧만 쓸 수 있습니다. 계속하려면 "유료 켜기"라고 입력해 주세요.'); if (p !== '유료 켜기') return; body.confirm = p; }
        else if (!confirm('크레딧 기능을 끕니다. 회원 잔액은 그대로 남습니다. 계속할까요?')) return;
        call('/api/community/credits', { method: 'PUT', body: body }).then(function () { loadCredits(); loadAudit(); }).catch(function (e) { alert(e.message); });
      };
      $('#crSave').onclick = function () { call('/api/community/credits', { method: 'PUT', body: { prices: { morePicks: +$('#crMp').value, extraLike: +$('#crXl').value }, morePicksCount: +$('#crMc').value, morePicksPerDay: +$('#crMd').value } }).then(function () { msg('crMsg', '저장했습니다'); loadAudit(); }).catch(function (e) { msg('crMsg', e.message, true); }); };
      $('#crGrant').onclick = function () { call('/api/community/credits', { method: 'POST', body: { action: 'grant', email: $('#crEmail').value.trim(), amount: +$('#crAmt').value, note: $('#crNote').value.trim() } }).then(function (r) { msg('crGMsg', '지급했습니다(잔액 ' + r.balance + ')'); $('#crAmt').value = ''; loadCredits(); loadAudit(); }).catch(function (e) { msg('crGMsg', e.message, true); }); };
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  /* ── 7단계: 성과 지표 · 운영 현황 · 회원 찾기 · 운테크 문안 · 운영자 열쇠 ── */
  var role = 'owner';
  var PERM = { owner: ['metrics', 'members', 'mod', 'audit', 'content', 'staff', 'owner'], operator: ['metrics', 'members', 'mod', 'audit', 'content'], moderator: ['mod', 'members', 'audit'], analyst: ['metrics'] };
  var can = function (p) { return (PERM[role] || []).indexOf(p) >= 0; };
  var num = function (n) { return n == null ? '—' : Number(n).toLocaleString('ko-KR'); };
  var rate = function (v) { return v == null ? '<span class="muted" title="표본이 작아 비율을 보이지 않습니다">표본 부족</span>' : v + '%'; };
  var won = function (n) { return num(n || 0) + '원'; };
  var tile = function (label, value, sub) { return '<div class="card" style="padding:10px 12px;min-width:132px;flex:1"><div class="muted" style="font-size:.78rem">' + esc(label) + '</div><div style="font-size:1.25rem;font-weight:700;margin-top:2px">' + value + '</div>' + (sub ? '<div class="muted" style="font-size:.74rem;margin-top:2px">' + sub + '</div>' : '') + '</div>'; };
  var SURF = { all: '전체', report: '심층 분석', community: '인연의 광장' };
  function loadMetrics() {
    var box = $('#cmMet'), box2 = $('#cmOps'); if (!box && !box2) return;
    var day = $('#cmMetDay') ? $('#cmMetDay').value : '';
    if (box) box.innerHTML = '<p class="muted">계산하는 중…</p>';
    call('/api/community/metrics' + (day ? '?day=' + encodeURIComponent(day) : '')).then(function (m) {
      var r = m.rates || {}, a = m.active || {}, c = m.convert || {}, e = m.engage || {};
      if (box) {
        box.innerHTML = '<p class="muted" style="margin:0 0 8px">기준일 ' + esc(m.day) + ' · 이용 기록 시작 ' + esc(c.since || '아직 없음') + ' · 분모가 ' + m.minBase + '명 미만인 비율은 표본 부족으로 표시합니다.</p>' +
          '<table class="tbl"><thead><tr><th>영역</th><th>DAU</th><th>WAU</th><th>MAU</th><th>DAU/MAU</th><th>7일 재방문</th><th>30일 재방문</th></tr></thead><tbody>' +
          ['all', 'report', 'community'].map(function (s) { var x = a[s] || {}, rr = r[s] || {}; return '<tr><td>' + SURF[s] + '</td><td>' + num(x.dau) + '</td><td>' + num(x.wau) + '</td><td>' + num(x.mau) + '</td><td>' + rate(rr.stick) + '</td><td>' + rate(rr.ret7) + ' <span class="muted">(' + num((x.ret7 || {}).back) + '/' + num((x.ret7 || {}).base) + ')</span></td><td>' + rate(rr.ret30) + ' <span class="muted">(' + num((x.ret30 || {}).back) + '/' + num((x.ret30 || {}).base) + ')</span></td></tr>'; }).join('') + '</tbody></table>' +
          spark(m.series || []) +
          '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">' +
          tile('광장 참여율(30일)', rate(r.engage), num(e.engaged) + '/' + num(e.base) + '명 · 글 ' + num(e.posts) + ' · 댓글 ' + num(e.comments) + ' · 기록 ' + num(e.logs)) +
          tile('심층 분석 유료 전환(30일)', rate(r.reportPaid30), '이용 ' + num(c.reportUsers) + '명 중 결제 ' + num(c.reportBuyers) + '명') +
          tile('누적 구매 회원 비율', rate(r.paidEver), '회원 ' + num(c.members) + '명 중 ' + num(c.buyersEver) + '명') +
          tile('광장 → 심층 분석 이동(30일)', rate(r.communityToReport), '광장 ' + num(c.communityUsers) + '명 중 ' + num(c.communityAlsoReport) + '명') +
          tile('심층 분석 → 광장 이동(30일)', rate(r.reportToCommunity), '심층 분석 ' + num(c.reportUsers) + '명 중 ' + num(c.reportAlsoCommunity) + '명') +
          tile('광장 이용 뒤 심층 분석 구매', rate(r.communityThenPaid), '광장 이용자 ' + num(c.communityEver) + '명 중 ' + num(c.communityThenPaid) + '명') + '</div>' +
          '<details style="margin-top:8px"><summary class="muted">지표 정의</summary><ul class="muted" style="margin:6px 0 0;padding-left:1.2em;line-height:1.7;font-size:.82rem"><li>활성 사용자: 로그인한 회원이 그 영역을 연 날 기준(DAU 그날 · WAU 최근 7일 · MAU 최근 30일). 비로그인 방문은 세지 않습니다.</li><li>7일 재방문: 기준일 13~7일 전에 쓴 회원 중 최근 7일에도 쓴 비율 · 30일 재방문: 59~30일 전에 쓴 회원 중 최근 30일에도 쓴 비율</li><li>참여율: 최근 30일 광장 이용 회원 중 글·댓글·운명의 기록·인연 잇기·대화를 하나라도 남긴 비율</li><li>유료 전환: 결제 완료 주문만(테스트 결제·크레딧 주문·취소 제외)</li><li>이용 기록은 7단계 배포일부터 쌓입니다. 그 전 기간의 재방문·이동 비율은 낮게 나옵니다.</li></ul></details>';
      }
      if (box2) {
        var mt = m.match || {}, sl = m.sales || {}, mb = m.members || {}, ro = mt.reportsOpen || {};
        var led = sl.ledger || {}, LED = { grant: '지급', purchase: '구매', refund: '환불 회수', more_picks: '더 보기', extra_like: '추가 잇기', adjust: '조정' };
        box2.innerHTML = '<div class="row" style="gap:8px;flex-wrap:wrap">' +
          tile('회원', num(mb.total), '최근 7일 +' + num(mb.new7) + ' · 30일 +' + num(mb.new30)) + tile('광장 프로필', num(mb.profiles), '출시 알림 신청 ' + num(mb.alerts)) +
          tile('켜진 인연 프로필', num(mt.profilesOn), '성인 확인 ' + num(mt.adults) + '명') + tile('최근 7일 잇기·매칭', num(mt.likes7) + ' · ' + num(mt.matches7), '열린 대화방 ' + num(mt.roomsOpen)) +
          tile('최근 7일 메시지', num(mt.messages7), '경고 표시 ' + num(mt.flagged7)) +
          tile('처리 안 된 신고', num((ro.post || 0) + (ro.comment || 0) + (ro.message || 0) + (ro.user || 0)), '글 ' + num(ro.post || 0) + ' · 댓글 ' + num(ro.comment || 0) + ' · 대화 ' + num(ro.message || 0) + ' · 진행 중 제재 ' + num(mt.sanctionsActive)) +
          tile('심층 분석 매출(30일)', won((sl.report30 || {}).won), num((sl.report30 || {}).n) + '건') + tile('크레딧 매출(30일)', won((sl.credits30 || {}).won), num((sl.credits30 || {}).n) + '건 · 환불 누적 ' + num((sl.creditsRefunded || {}).n) + '건') +
          tile('남은 크레딧 합계', num(sl.outstanding), Object.keys(led).map(function (k) { return esc(LED[k] || k) + ' ' + num(led[k]); }).join(' · ') || '원장 기록 없음') + '</div>' +
          '<p class="muted" style="margin:8px 0 0;font-size:.8rem">매출은 결제 완료·테스트 제외 금액입니다. 회원별 내역은 결제·상품 화면과 ⑨ 크레딧에서 봅니다.</p>';
      }
    }).catch(function (e2) { if (box) box.innerHTML = '<p class="err">' + esc(e2.message) + '</p>'; if (box2) box2.innerHTML = '<p class="err">' + esc(e2.message) + '</p>'; });
  }
  // 최근 30일 일별 활성(막대) — 심층 분석(금색)·광장(분홍)
  function spark(series) {
    if (!series.length) return '';
    var max = Math.max(1, Math.max.apply(null, series.map(function (s) { return Math.max(s.report, s.community); })));
    var W = 600, H = 70, bw = W / series.length;
    var bars = series.map(function (s, i) { var h1 = Math.round((s.report / max) * (H - 14)), h2 = Math.round((s.community / max) * (H - 14)); return '<rect x="' + (i * bw + 1) + '" y="' + (H - h1) + '" width="' + (bw / 2 - 1) + '" height="' + h1 + '" fill="#E0BC74"><title>' + esc(s.day) + ' 심층 분석 ' + s.report + '</title></rect><rect x="' + (i * bw + bw / 2) + '" y="' + (H - h2) + '" width="' + (bw / 2 - 1) + '" height="' + h2 + '" fill="#E58FA0"><title>' + esc(s.day) + ' 광장 ' + s.community + '</title></rect>'; }).join('');
    return '<div style="margin-top:10px"><div class="muted" style="font-size:.78rem">최근 30일 일별 활성 회원 <span style="color:#E0BC74">■</span> 심층 분석 <span style="color:#E58FA0">■</span> 인연의 광장 (최대 ' + max + '명)</div><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="width:100%;height:70px;display:block" role="img" aria-label="최근 30일 일별 활성 회원">' + bars + '</svg></div>';
  }
  function loadMembers() {
    var box = $('#cmMem'); if (!box) return;
    $('#cmMemGo').onclick = function () {
      var q = $('#cmMemQ').value.trim(); if (!q) return;
      box.innerHTML = '<p class="muted">찾는 중…</p>';
      call('/api/community/members?q=' + encodeURIComponent(q)).then(function (d) {
        box.innerHTML = d.items.length ? '<table class="tbl"><thead><tr><th>닉네임</th><th>일주</th><th>프로필 만든 날</th><th></th></tr></thead><tbody>' + d.items.map(function (x) { return '<tr><td>' + esc(x.nickname || '(닉네임 없음)') + '</td><td>' + esc(x.ilju || '') + '</td><td>' + when(x.joined) + '</td><td><button class="btn ghost sm" data-mem="' + esc(x.id) + '">자세히</button></td></tr>'; }).join('') + '</tbody></table><div id="cmMemOne"></div>' : '<p class="muted">찾은 회원이 없습니다.</p>';
        [].forEach.call(box.querySelectorAll('[data-mem]'), function (b) { b.onclick = function () { memberOne(b.getAttribute('data-mem')); }; });
      }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
    };
    $('#cmMemQ').onkeydown = function (e) { if (e.key === 'Enter') $('#cmMemGo').click(); };
  }
  function memberOne(id) {
    var box = $('#cmMemOne'); if (!box) return; box.innerHTML = '<p class="muted">불러오는 중…</p>';
    call('/api/community/members?id=' + encodeURIComponent(id)).then(function (m) {
      var row = function (k, v) { return '<tr><th style="width:150px;text-align:left">' + esc(k) + '</th><td>' + v + '</td></tr>'; };
      box.innerHTML = '<div class="card" style="margin-top:10px;padding:10px 12px"><table class="tbl"><tbody>' +
        row('닉네임', esc(m.nickname || '(없음)')) + row('이메일', esc(m.email || '—') + ' <span class="muted">(가림)</span>') + row('가입', when(m.joined)) +
        row('일주·일간', esc((m.ilju || '—') + ' · ' + (m.ilgan || '—')) + ' <span class="muted">공개: 일주 ' + (m.show.ilju ? '예' : '아니오') + ' · 일간 ' + (m.show.ilgan ? '예' : '아니오') + '</span>') +
        row('사진·휴대폰', (m.hasAvatar ? '직접 올린 사진 있음' : '기본 포스터') + ' · 휴대폰 ' + (m.hasPhone ? '등록됨' : '없음')) +
        row('동의', (m.consents.required ? '필수 동의 완료' : '<b style="color:#FF8A78">필수 동의 없음</b>') + ' · 광고: ' + (m.consents.marketing.length ? esc(m.consents.marketing.join(', ')) : '없음') + (m.consents.night ? ' · 야간 수신' : '')) +
        row('성인 확인', m.adult ? esc(m.adult.ageBand + ' · ' + m.adult.provider) + ' · ' + when(m.adult.at) : '안 함') + row('광장 접근 권한', esc(m.access ? (ROLE[m.access] || m.access) : '없음')) +
        row('활동', '글 ' + num(m.counts.posts) + ' · 댓글 ' + num(m.counts.comments) + ' · 기록 ' + num(m.counts.logs) + ' · 받은 신고 ' + num(m.counts.reportsAgainst)) +
        row('인연', (m.match.on ? '프로필 켜짐' : '꺼짐') + ' · 보낸 잇기 ' + num(m.match.likesSent) + ' · 대화방 ' + num(m.match.rooms)) + row('크레딧 잔액', num(m.credits)) +
        row('제재', m.sanctions.length ? m.sanctions.map(function (s) { return esc(SK[s.kind] + ' · ' + s.reason) + ' <span class="muted">' + (s.active ? '진행 중' : s.lifted ? '해제됨' : s.kind === 'warn' ? '기록' : '끝남') + ' · ' + esc(s.by) + ' · ' + when(s.at) + '</span>'; }).join('<br>') : '없음') +
        '</tbody></table><p class="muted" style="margin:6px 0 0;font-size:.8rem">조회 기록이 작업 기록(⑥)에 남습니다. 제재·사진 지우기는 ⑤ 광장 운영에서 그 회원의 글·댓글로 처리합니다.</p></div>';
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  var TGF = [['key', '이름'], ['head0', '제목 1'], ['head1', '제목 2'], ['body', '하루 결'], ['money', '돈'], ['people', '사람'], ['do', '해 볼 일'], ['avoid', '피할 일']];
  var RELN = { hap: '합(마음이 맞물림)', chung: '충(흔들림)', same: '같은 글자', none: '두드러진 관계 없음' };
  function loadCopy() {
    var box = $('#cmCopy'); if (!box) return;
    call('/api/community/today-copy').then(function (d) {
      var tg = Object.keys(d.current.tg), ch = d.changed || { tg: [], rel: [] };
      box.innerHTML = '<p class="muted" style="margin:0 0 8px">고친 칸 ' + (ch.tg.length + ch.rel.length) + '개' + (d.at ? ' · 마지막 저장 ' + when(d.at) + ' · ' + esc(d.by || '') : ' · 지금은 모두 기본 문안') + '. 회원 화면의 "오늘의 운테크" 카드에 바로 반영됩니다.</p>' +
        '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px"><select id="cpPick">' + tg.map(function (k) { return '<option value="tg:' + esc(k) + '">십성 · ' + esc(k) + (ch.tg.indexOf(k) >= 0 ? ' (고침)' : '') + '</option>'; }).join('') + Object.keys(d.current.rel).map(function (k) { return '<option value="rel:' + k + '">일지 관계 · ' + esc(RELN[k] || k) + (ch.rel.indexOf(k) >= 0 ? ' (고침)' : '') + '</option>'; }).join('') + '</select><button class="btn ghost sm" id="cpReset">모두 기본으로</button></div><div id="cpForm"></div>';
      var form = function () {
        var v = $('#cpPick').value.split(':'), kind = v[0], k = v[1], cur = d.current[kind][k], def = d.defaults[kind][k];
        var fields = kind === 'tg' ? TGF : [['key', '이름'], ['line', '문장']];
        var val = function (f) { return f === 'head0' ? cur.head[0] : f === 'head1' ? cur.head[1] : cur[f]; };
        var dv = function (f) { return f === 'head0' ? def.head[0] : f === 'head1' ? def.head[1] : def[f]; };
        $('#cpForm').innerHTML = fields.map(function (f) { var long = /body|money|people|line/.test(f[0]); return '<label style="display:block;margin:6px 0"><span class="muted" style="font-size:.8rem">' + f[1] + (val(f[0]) !== dv(f[0]) ? ' <b style="color:var(--gold)">· 고침</b>' : '') + '</span>' + (long ? '<textarea data-cf="' + f[0] + '" rows="3" maxlength="300">' + esc(val(f[0])) + '</textarea>' : '<input type="text" data-cf="' + f[0] + '" maxlength="60" value="' + esc(val(f[0])) + '">') + '</label>'; }).join('') +
          '<div class="row" style="gap:6px"><button class="btn sm" id="cpSave">저장</button><button class="btn ghost sm" id="cpDef">이 항목만 기본으로</button><span class="muted" id="cpMsg"></span></div>';
        var collect = function (useDefault) {
          var o = {}; [].forEach.call($('#cpForm').querySelectorAll('[data-cf]'), function (el) { var f = el.getAttribute('data-cf'), x = useDefault ? dv(f) : el.value; if (f === 'head0' || f === 'head1') { o.head = o.head || [cur.head[0], cur.head[1]]; o.head[f === 'head0' ? 0 : 1] = x; } else o[f] = x; });
          var all = { tg: {}, rel: {} }; ch.tg.forEach(function (t) { all.tg[t] = d.current.tg[t]; }); ch.rel.forEach(function (t) { all.rel[t] = d.current.rel[t]; });
          all[kind][k] = o; return all;
        };
        var save = function (useDefault) { call('/api/community/today-copy', { method: 'PUT', body: collect(useDefault) }).then(function () { msg('cpMsg', '저장했습니다'); loadCopy(); loadAudit(); }).catch(function (e) { msg('cpMsg', e.message, true); }); };
        $('#cpSave').onclick = function () { save(false); }; $('#cpDef').onclick = function () { save(true); };
      };
      $('#cpPick').onchange = form; form();
      $('#cpReset').onclick = function () { if (!confirm('운테크 문안을 모두 기본으로 되돌릴까요?')) return; call('/api/community/today-copy', { method: 'DELETE' }).then(function () { loadCopy(); loadAudit(); }).catch(function (e) { alert(e.message); }); };
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  var SROLE = { moderator: '모더레이터 — 신고·제재·회원 찾기·작업 기록', operator: '운영 매니저 — 위 + 성과 지표·운테크 문안', analyst: '분석 담당 — 성과 지표만' };
  function loadStaff() {
    var box = $('#cmStaff'); if (!box) return;
    call('/api/community/staff').then(function (d) {
      box.innerHTML = '<div class="row" style="gap:6px;flex-wrap:wrap"><input type="text" id="stName" placeholder="운영자 이름(작업 기록에 남음)" maxlength="30" style="min-width:180px"><select id="stRole">' + Object.keys(SROLE).map(function (k) { return '<option value="' + k + '">' + esc(SROLE[k]) + '</option>'; }).join('') + '</select><button class="btn sm" id="stMake">열쇠 만들기</button><span class="muted" id="stMsg"></span></div>' +
        (d.items.length ? '<table class="tbl" style="margin-top:8px"><thead><tr><th>이름</th><th>역할</th><th>만든 사람·시각</th><th></th></tr></thead><tbody>' + d.items.map(function (x) { return '<tr' + (x.revokedAt ? ' style="opacity:.5"' : '') + '><td>' + esc(x.name) + '</td><td>' + esc(d.roles[x.role] || x.role) + '</td><td>' + esc(x.createdBy || '') + ' · ' + when(x.createdAt) + '</td><td>' + (x.revokedAt ? '회수 ' + when(x.revokedAt) : '<button class="btn ghost sm" data-strv="' + x.id + '">회수</button>') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted" style="margin-top:8px">아직 만든 열쇠가 없습니다.</p>');
      $('#stMake').onclick = function () {
        var name = $('#stName').value.trim(); if (!name) { msg('stMsg', '이름을 적어 주세요', true); return; }
        call('/api/community/staff', { method: 'POST', body: { action: 'create', name: name, role: $('#stRole').value } }).then(function (r) {
          $('#stKeyOut').innerHTML = '<div class="card" style="margin-top:8px;padding:10px 12px;border-color:var(--gold)"><b>' + esc(r.name) + '</b>님의 열쇠 — <b>지금 한 번만</b> 보입니다. 안전한 경로로 전달해 주세요.<div style="margin:6px 0;font-family:monospace;user-select:all;word-break:break-all">' + esc(r.key) + '</div><span class="muted">운영자 콘솔: ' + esc(location.origin) + '/report/admin/staff.html</span></div>';
          loadStaff(); loadAudit();
        }).catch(function (e) { msg('stMsg', e.message, true); });
      };
      [].forEach.call(box.querySelectorAll('[data-strv]'), function (b) { b.onclick = function () { if (!confirm('이 열쇠를 회수할까요? 최대 1분 안에 쓸 수 없게 됩니다.')) return; call('/api/community/staff', { method: 'POST', body: { action: 'revoke', id: +b.getAttribute('data-strv') } }).then(function () { loadStaff(); loadAudit(); }).catch(function (e) { alert(e.message); }); }; });
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  function draw() {
    var C = function (perm, html) { return can(perm) ? html : ''; };
    var head = role === 'owner' ? '' : '<p class="muted" style="margin:0 0 10px">운영자 열쇠로 들어왔습니다 · 역할: <b>' + esc(SROLE[role] || role) + '</b>. 공개 단계·권한·유료 설정은 관리자만 바꿀 수 있습니다.</p>';
    root.innerHTML = head +
      C('owner', '<div class="card"><h3 style="margin:0 0 8px">① 공개 단계</h3><div id="cmStage"><p class="muted">불러오는 중…</p></div>' +
      '<div class="row" style="margin-top:12px"><button class="btn ghost" id="cmEnter">관리자로 커뮤니티 열어 보기</button><span class="muted" id="cmEnterMsg"></span></div></div>') +
      C('metrics', '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑮ 정식 공개 점검표</h3><div id="cmLaunch"><p class="muted">불러오는 중…</p></div></div>') +
      C('metrics', '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑩ 성과 지표</h3><div class="row" style="gap:6px;margin-bottom:8px"><input type="date" id="cmMetDay" style="width:160px"><button class="btn ghost sm" id="cmMetGo">다시 계산</button></div><div id="cmMet"></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑪ 매칭·대화·매출 현황</h3><div id="cmOps"><p class="muted">불러오는 중…</p></div></div>') +
      C('members', '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑫ 회원 찾기</h3><p class="muted" style="margin:0 0 8px">닉네임 일부(2자 이상) 또는 가입 이메일 전체로 찾습니다. 이메일은 가려서 보이고 전화번호·생년월일·출생 정보는 보이지 않습니다.</p><div class="row" style="gap:6px"><input type="text" id="cmMemQ" placeholder="닉네임 또는 이메일" style="min-width:220px"><button class="btn sm" id="cmMemGo">찾기</button></div><div id="cmMem" style="margin-top:8px"></div></div>') +
      C('owner', '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">② 테스터·베타 회원</h3>' +
      '<p class="muted" style="margin:0 0 8px">먼저 그 사람이 심층 분석에서 로그인(가입)해야 합니다. 테스터는 개발 중에도, 베타 회원은 비공개 베타부터 들어갑니다.</p>' +
      '<div class="row"><input type="email" id="cmEmail" placeholder="회원 이메일" style="min-width:220px"><select id="cmRole"><option value="beta">베타 회원</option><option value="tester">테스터</option></select><input type="text" id="cmNote" placeholder="메모(선택)" maxlength="80"><button class="btn" id="cmGrant">권한 주기</button><span class="muted" id="cmGrantMsg"></span></div>' +
      '<div id="cmAccList" style="margin-top:10px"></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">③ 출시 알림 신청</h3><div id="cmAlert"><p class="muted">불러오는 중…</p></div>' +
      '<p class="muted" style="margin:8px 0 0">출시 알림은 광고성 정보 수신 동의와 별개입니다. 정식 공개 때 출시 소식 1회만 보낼 수 있습니다.</p></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">④ 회원 동의 현황</h3><div id="cmConsent"><p class="muted">불러오는 중…</p></div>' +
      '<p class="muted" style="margin:8px 0 0">광고 발송 기능은 아직 없습니다. 보낼 때는 동의 중인 채널로만, 앞에 (광고)·보낸 곳·무료 수신 거부 방법을 넣고, 밤 9시~아침 8시에는 야간 수신 동의자에게만 보냅니다.</p></div>') +
      C('mod', '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑤ 광장 운영 · 신고 처리</h3><div class="row" style="gap:6px;margin-bottom:8px"><button class="btn sm" data-mv="reports">처리할 신고</button><button class="btn ghost sm" data-mv="hidden">숨겨진 글</button><button class="btn ghost sm" data-mv="sanctions">제재 목록</button></div><p class="muted" style="margin:0 0 8px">서로 다른 회원 5명이 신고하면 자동으로 숨겨집니다. 확인 후 되살리거나 삭제해 주세요. 모든 처리는 작업자 이름과 함께 기록됩니다.</p><div id="cmMod"></div></div>') +
      C('content', '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑬ 운테크 문안</h3><div id="cmCopy"><p class="muted">불러오는 중…</p></div></div>') +
      C('owner', '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑦ 성인 확인 · 테스트용</h3><p class="muted" style="margin:0 0 8px">포트원 본인인증 채널(환경변수 PORTONE_IDV_CHANNEL_KEY)을 연결하기 전, 테스터 계정이 인연 매칭·대화를 시험할 수 있게 수동으로 확인합니다. 실제 회원에게는 쓰지 마세요. 기록이 남습니다.</p>' +
      '<div class="row"><input type="email" id="cmVeEmail" placeholder="회원 이메일" style="min-width:200px"><input type="number" id="cmVeYear" placeholder="출생 연도" min="1900" max="2010" style="width:110px"><select id="cmVeG"><option value="F">여성</option><option value="M">남성</option></select><button class="btn" id="cmVeGo">확인 처리</button><span class="muted" id="cmVeMsg"></span></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑨ 크레딧 · 유료 기능</h3><p class="muted" style="margin:0 0 8px">기본은 꺼짐입니다. 크레딧 묶음 판매는 결제·상품 화면에서 가격을 넣고 여기서 유료 기능을 켜야 시작됩니다. 아래 지급은 테스트·보상용입니다.</p><div id="cmCr"><p class="muted">불러오는 중…</p></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑭ 운영자 열쇠 · 권한 분리</h3><p class="muted" style="margin:0 0 8px">관리자 비밀번호를 나누지 않고, 사람마다 역할이 정해진 열쇠를 줍니다. 열쇠로는 운영자 콘솔(/report/admin/staff.html)에서 역할에 맞는 화면만 열리고, 작업 기록에 그 이름이 남습니다.</p><div id="stKeyOut"></div><div id="cmStaff"><p class="muted">불러오는 중…</p></div></div>') +
      C('audit', '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">⑥ 관리자 작업 기록</h3><div id="cmAudit"><p class="muted">불러오는 중…</p></div></div>');
    if (can('owner')) {
      $('#cmGrant').onclick = function () {
        var em = $('#cmEmail').value.trim(); if (!em) { msg('cmGrantMsg', '이메일을 입력해 주세요', true); return; }
        call('/api/community/access', { method: 'POST', body: { email: em, role: $('#cmRole').value, note: $('#cmNote').value.trim() } }).then(function () { msg('cmGrantMsg', '권한을 주었습니다'); $('#cmEmail').value = ''; $('#cmNote').value = ''; loadAccess(); loadAudit(); }).catch(function (e) { msg('cmGrantMsg', e.message, true); });
      };
      $('#cmEnter').onclick = function () { call('/api/community/enter', { method: 'POST' }).then(function (d) { window.open(d.to || '/community/', '_blank', 'noopener'); msg('cmEnterMsg', '새 탭에서 열었습니다(12시간 유효)'); }).catch(function (e) { msg('cmEnterMsg', e.message, true); }); };
        fetch('/api/community/status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(drawStage).catch(function () { drawStage({ stage: 'dev' }); });
      loadAccess(); loadAlerts(); loadConsents(); loadCredits(); loadStaff();
    }
    if (can('metrics')) { $('#cmMetGo').onclick = loadMetrics; loadMetrics(); loadLaunch(); }
    if (can('members')) loadMembers();
    if (can('mod')) { [].forEach.call(root.querySelectorAll('[data-mv]'), function (b) { b.onclick = function () { modView = b.getAttribute('data-mv'); loadMod(); }; }); loadMod(); }
    if (can('content')) loadCopy();
    if (can('audit')) loadAudit();
  }
  // p: 관리자 비밀번호 또는 운영자 열쇠, r: 역할(운영자 콘솔이 /api/community/staff?view=me 로 확인해 넘긴다. 없으면 관리자)
  window.V2Community = { open: function (p, r) { pw = p || ''; role = PERM[r] ? r : 'owner'; root = document.getElementById('t-community'); if (root) draw(); } };
})();
