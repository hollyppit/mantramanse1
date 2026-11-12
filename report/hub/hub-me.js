// 마이페이지(#/me) — 로그인한 회원만 보는 화면. 2026-11-13 (1:1 문의: /api/account/inquiry, 답변은 메일)
//   · 로그인은 무빙툰 구매 창(report/v2/paywall.js)·내 구매 내역(/report/my/)과 같은 Supabase 세션을 쓴다(같은 주소라 로그인 상태가 이어진다).
//   · 서버·DB 변경 없음: 기존 API 만 부른다 — POST /api/commerce/access(공개 키), /api/commerce/mine(내 주문·저장한 사주), /api/account/logins(연결된 로그인 방법).
//   · 출생정보는 지금처럼 이 기기(localStorage)에만 둔다. 계정에 남는 사주는 구매할 때 '계정에 저장'을 고른 것뿐이다(member_sajus).
//   · 전체 결제 기록·영수증·바로 환불·로그인 연결·회원 탈퇴는 /report/my/ 에 그대로 두고, 여기서는 요약과 링크만 보여 준다.
//   · 비로그인: 로그인 안내 + 이 기기 정보 수정·삭제(삭제는 로그인과 상관없이 할 수 있어야 한다).
(function (root) {
  'use strict';
  var H = root.Hub; if (!H) return;
  var esc = H.esc, $ = H.$, $$ = H.$$, P = H.profile;
  var SB_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var LN = { kakao: '카카오', google: '구글', naver: '네이버' };
  var WORLD = { w1: '종합풀이', w2: '재물운 심화', w7: '커리어운 심화', w3: '인연운 심화' };
  var ST = { paid: '결제 완료', canceled: '환불 완료', partial_canceled: '부분 환불', pending: '결제 확인 중' };
  var CAT = { payment: '결제', refund: '환불', content: '풀이·콘텐츠', account: '계정·로그인', etc: '기타' };
  var IST = { received: '접수됨', answered: '답변 완료', closed: '종료' };
  var GUIDE = { male: '운명 감찰관', female: '명운 해독관' };
  var ls = function (k) { try { return root.localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  var lastLogin = function () { var v = ls('mt_last_login'); return LN[v] ? v : ''; };
  var won = function (n) { return (+n || 0).toLocaleString('ko-KR') + '원'; };
  var day = function (t) { if (!t) return ''; try { return new Date(t).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; } };
  var post = function (url, token, body) {
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-member-token': token }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); });
  };

  /* ── 로그인 상태(H.Auth) ── */
  var A = H.Auth = {};
  var infoP = null, sbP = null;
  A.info = function () {
    if (!infoP) infoP = fetch('/api/commerce/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"sd":null}' })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (d) { if (!d) infoP = null; return d; });   // 실패하면 다음에 다시 받는다
    return infoP;
  };
  A.ready = function (d) { return !!(d && d.configured && d.configured.login && d.keys && d.keys.supabaseUrl && d.keys.supabaseAnonKey); };
  A.client = function () {
    if (!sbP) sbP = A.info().then(function (d) {
      if (!A.ready(d)) throw new Error('login-off');
      return (root.supabase ? Promise.resolve() : H.load(SB_SDK)).then(function () {
        return root.supabase.createClient(d.keys.supabaseUrl, d.keys.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
      });
    });
    sbP.catch(function () { sbP = null; });
    return sbP;
  };
  // 네이버·구글(서버 로그인)에서 돌아왔으면(?naver_login=1 / ?google_login=1) 서버가 맡아 둔 세션을 받아 로그인 상태로 만든다(/report/my/ 와 같은 흐름)
  function serverReturn(sb, provider) {
    var u, v; try { u = new URL(root.location.href); v = u.searchParams.get(provider + '_login'); } catch (e) { return Promise.resolve(); }
    if (!v) return Promise.resolve();
    u.searchParams.delete(provider + '_login'); try { history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (e) { }
    if (v === 'cancel') { H.toast('로그인을 취소했습니다.'); return Promise.resolve(); }
    if (v !== '1') { H.toast('로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.'); return Promise.resolve(); }
    var claim = function (n) {
      return fetch('/api/auth/' + provider + '/claim', { method: 'POST', credentials: 'same-origin' }).then(function (r) {
        if (r.ok) return r.json(); if (n < 2) return new Promise(function (ok) { setTimeout(ok, 700); }).then(function () { return claim(n + 1); }); return null;
      });
    };
    return claim(0).then(function (s) { if (s && s.access_token) return sb.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token }); }).catch(function () { });
  }
  // 지금 로그인 세션(없으면 null). 로그인이 준비되지 않았으면 { off: true }
  A.session = function () {
    return A.client().then(function (sb) {
      return serverReturn(sb, 'naver').then(function () { return serverReturn(sb, 'google'); })
        .then(function () { return sb.auth.getSession(); })
        .then(function (r) { return (r && r.data && r.data.session) || null; });
    }, function (e) { return e && e.message === 'login-off' ? { off: true } : Promise.reject(e); });
  };
  // 네트워크 없이 "로그인한 적이 있는지"만 본다(타임라인 6번 영역 표시용). Supabase 가 이 기기에 남긴 세션 키(sb-…-auth-token)
  A.peek = function () {
    try {
      for (var i = 0; i < root.localStorage.length; i++) {
        var k = root.localStorage.key(i); if (!/^sb-.+-auth-token$/.test(k)) continue;
        var s = JSON.parse(root.localStorage.getItem(k) || 'null'), u = s && (s.user || (s.currentSession && s.currentSession.user));
        if (u) return { email: u.email || '' };
      }
    } catch (e) { }
    return null;
  };
  A.login = function (provider) {
    try { root.localStorage.setItem('mt_last_login', provider); } catch (e) { }
    H.track('login_start', { provider: provider, from: 'mypage' });
    var back = root.location.pathname + root.location.search + '#/me';
    A.info().then(function (d) {
      if (provider === 'naver' || (provider === 'google' && d && d.configured && d.configured.googleServer)) { root.location.href = '/api/auth/' + provider + '/start?next=' + encodeURIComponent(back); return; }
      return A.client().then(function (sb) { return sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: root.location.origin + back } }); });
    }).catch(function () { H.toast('로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'); });
  };
  A.logout = function () { return A.client().then(function (sb) { return sb.auth.signOut(); }).catch(function () { }); };

  /* ── 화면 조각 ── */
  function guideName() { var g = root.Quest && root.Quest.guide ? root.Quest.guide() : (ls('mt_guide') === '"female"' ? 'female' : 'male'); var c = null; try { c = H.Onboard && H.Onboard.cfg ? H.Onboard.cfg() : null; } catch (e) { } var qc = c && c.quest; return (qc && qc.guides && qc.guides[g] && qc.guides[g].name) || GUIDE[g]; }
  function birthText(s) {
    if (!s) return '';
    var t = s.year + '년 ' + s.month + '월 ' + s.day + '일' + (s.calendar === 'lunar' ? '(음력' + (s.leap ? '·윤달' : '') + ')' : '');
    t += s.hourUnknown || s.hour == null || s.hour === '' ? ' · 시각 모름' : ' ' + s.hour + '시' + (+s.minute ? ' ' + s.minute + '분' : '');
    return t + ' · ' + (s.gender === 'F' ? '여' : '남');
  }
  function head(sub) { return '<header class="me-head"><p class="kick">MY PAGE</p><h1>마이페이지</h1>' + (sub ? '<p class="me-sub">' + sub + '</p>' : '') + '</header>'; }
  // 이 기기에 저장된 사주: 로그인과 상관없이 보여 준다(수정·삭제는 언제나 할 수 있어야 한다)
  function deviceHtml(full) {
    var s = P.get();
    var body = s
      ? '<div class="me-row"><div><b>' + esc(s.name || '이름 없는 사주') + '</b><small>' + esc(birthText(s)) + '</small></div></div>' +
        '<div class="me-acts"><a class="btn ghost sm" href="#/begin?edit=1" data-track="profile_edit" data-p="mypage">출생정보 수정</a>' +
        (full ? '<button type="button" class="btn ghost sm" data-guide-open data-track="guide_change" data-p="mypage">안내자 변경 <small>' + esc(guideName()) + '</small></button><a class="btn ghost sm" href="#/welcome?replay=1" data-track="onboarding_replay" data-p="mypage">온보딩 다시 보기</a>' : '') +
        '<button type="button" class="btn ghost sm me-danger" data-me="del">이 기기에서 삭제</button></div>'
      : '<p class="me-muted">이 기기에 저장된 사주가 없습니다.</p><div class="me-acts"><a class="btn sm" href="#/begin" data-track="saju_input_start" data-p="mypage">내 사주 입력하기</a></div>';
    return '<section class="me-card"><h2>이 기기의 사주</h2>' + body + '<p class="me-note">출생정보는 이 기기에만 저장되며 서버로 보내지 않습니다. 계정에는 구매할 때 ‘계정에 저장’을 고른 사주만 남습니다.</p></section>';
  }
  function loginButtons(d) {
    var list = ['kakao', 'google'].concat(d && d.configured && d.configured.naver ? ['naver'] : []), last = lastLogin();
    return '<div class="me-login">' + list.map(function (p) { return '<button type="button" class="me-lb ' + p + '" data-login="' + p + '">' + LN[p] + '로 로그인' + (last === p ? '<small>이 기기에서 지난번에 쓴 방법</small>' : '') + '</button>'; }).join('') + '</div>';
  }
  function guestHtml(d, off) {
    return head('로그인한 회원만 볼 수 있는 화면입니다.') +
      '<section class="me-card me-guest"><h2>로그인하고 마이페이지 열기</h2>' +
      '<ul class="me-why"><li>구매한 주제를 <b>어느 기기에서든</b> 다시 열기</li><li>결제 기록·영수증·환불을 <b>한 곳에서</b> 확인</li><li>계정에 저장한 사주를 <b>출생정보 입력 없이</b> 바로 읽기</li></ul>' +
      (off ? '<p class="me-muted">지금은 로그인을 준비하고 있습니다. 잠시 후 다시 열어 주세요.</p>' : loginButtons(d) + '<p class="me-note">구매한 적이 있다면 그때 쓴 로그인 방법을 골라 주세요. 로그인하지 않아도 운명의 타임라인과 무료 콘텐츠는 그대로 볼 수 있어요.</p>') +
      '</section>' + deviceHtml(false);
  }
  function memberHtml(sess, mine, logins) {
    var m = (mine && mine.member) || {}, email = m.email || (sess.user && sess.user.email) || '', s = P.get();
    var names = Object.assign({}, WORLD, (mine && mine.worldNames) || {}), nm = function (w) { return names[w] || w; };
    var orders = (mine && mine.orders) || [], saved = (mine && mine.sajus) || [];
    var linked = (logins && logins.linked) || [], via = linked.length ? linked.map(function (p) { return LN[p] || p; }).join(' · ') : (LN[lastLogin()] || '');
    var initial = (s && s.name ? s.name : email || '나').trim().charAt(0).toUpperCase();
    var h = head('') +
      '<section class="me-card me-profile"><div class="me-ava" aria-hidden="true">' + esc(initial) + '</div><div class="me-id"><b>' + esc(s && s.name ? s.name + '님' : '회원님') + '</b><small>' + esc(email) + '</small>' +
      (via ? '<span class="me-tag">' + esc(via) + ' 로그인</span>' : '') + '<span class="me-tag">안내자 · ' + esc(guideName()) + '</span></div></section>';
    // 열린 주제(결제 완료 주문을 사주 이름표별로)
    var bySaju = {};
    orders.forEach(function (o) { if (o.status !== 'paid') return; var who = o.saju_label || '이름 없는 사주'; bySaju[who] = bySaju[who] || {}; (o.worlds || []).forEach(function (w) { bySaju[who][w] = 1; }); });
    var whos = Object.keys(bySaju);
    h += '<section class="me-card"><h2>이용 중인 주제</h2>' + (whos.length
      ? '<div class="me-list">' + whos.map(function (w) { return '<div class="me-row"><div><b>' + esc(w) + '</b><div class="me-chips">' + Object.keys(bySaju[w]).map(function (x) { return '<span>' + esc(nm(x)) + '</span>'; }).join('') + '</div></div></div>'; }).join('') + '</div><p class="me-note">구매한 주제는 같은 계정으로 로그인하고 <b>그 사주</b>로 열면 잠금 없이 보입니다.</p>'
      : '<p class="me-muted">아직 구매한 주제가 없습니다. 각 주제의 첫 장은 무료로 읽어 볼 수 있어요.</p><div class="me-acts"><a class="btn ghost sm" href="#/timeline?z=themes" data-track="mypage_click" data-p="themes">주제별 풀이 둘러보기</a></div>') + '</section>';
    // 계정에 저장한 사주: 출생정보 입력 없이 바로 읽기
    if (saved.length) h += '<section class="me-card"><h2>계정에 저장한 사주</h2><div class="me-list">' + saved.map(function (x, i) {
      var b = x.birth || {}, t = b.year ? b.year + '년 ' + b.month + '월 ' + b.day + '일' + (b.calendar === 'lunar' ? '(음력)' : '') + (Number.isInteger(b.hour) ? ' ' + b.hour + '시' : ' · 시각 모름') + (b.gender ? ' · ' + (b.gender === 'F' ? '여' : '남') : '') : '';
      return '<div class="me-row"><div><b>' + esc(x.label || '이름 없는 사주') + '</b><small>' + esc(t) + '</small></div><button type="button" class="btn sm" data-open="' + i + '">바로 읽기</button></div>';
    }).join('') + '</div><p class="me-note">저장을 지우려면 <a href="/report/my/">구매 내역</a>에서 ‘저장 삭제’를 눌러 주세요.</p></section>';
    // 최근 결제 3건
    var pend = orders.filter(function (o) { return o.status === 'pending'; }).length;
    h += '<section class="me-card"><h2>최근 결제</h2>' + (orders.length
      ? '<div class="me-list">' + orders.slice(0, 3).map(function (o) { return '<div class="me-row"><div><b>' + esc(o.product_name || '') + '</b><small>' + esc(day(o.paid_at || o.created_at)) + ' · ' + esc(ST[o.status] || o.status) + '</small></div><span class="me-amt">' + won(o.amount) + '</span></div>'; }).join('') + '</div>' +
        (pend ? '<p class="me-note">‘결제 확인 중’ 주문은 결제가 끝나지 않은 것입니다. 실제로 결제했다면 잠시 후 결제 완료로 바뀌고, 그렇지 않으면 자동으로 정리됩니다.</p>' : '')
      : '<p class="me-muted">결제 기록이 없습니다.</p>') +
      '<div class="me-acts"><a class="btn ghost sm" href="/report/my/" data-track="mypage_click" data-p="orders">전체 구매 내역 · 영수증 · 환불 →</a></div></section>';
    h += inquiryHtml(email, orders);
    h += deviceHtml(true);
    h += '<section class="me-card"><h2>계정</h2><div class="me-acts"><a class="btn ghost sm" href="/report/my/" data-track="mypage_click" data-p="logins">로그인 방법 연결</a><button type="button" class="btn ghost sm" data-me="logout">로그아웃</button></div>' +
      '<p class="me-note">회원 탈퇴는 <a href="/report/my/">구매 내역</a> 화면 맨 아래에서 할 수 있습니다. 환불받을 구매가 있다면 탈퇴 전에 먼저 환불해 주세요.</p></section>';
    return h;
  }

  // 1:1 문의: 답변은 메일로 온다(관리자가 알림 메일에 답장 → 회원 메일함). 서버: POST /api/account/inquiry
  function inquiryHtml(email, orders) {
    var opts = Object.keys(CAT).map(function (k) { return '<option value="' + k + '">' + CAT[k] + '</option>'; }).join('');
    var ord = orders.filter(function (o) { return o.status !== 'pending'; }).slice(0, 10);
    return '<section class="me-card" id="meInq"><h2>1:1 문의</h2>' +
      '<p class="me-muted">결제·환불·풀이 내용 등 궁금한 점을 남겨 주세요. 답변은 메일로 보내 드립니다(받는 주소 <b>' + esc(email || '로그인한 계정 이메일') + '</b> · 영업일 기준 1~2일).</p>' +
      '<div class="me-acts"><button type="button" class="btn sm" data-me="inq-open" aria-expanded="false" aria-controls="meInqForm">문의하기</button></div>' +
      '<form class="me-form" id="meInqForm" hidden novalidate>' +
      '<label><span>분류</span><select name="category">' + opts + '</select></label>' +
      (ord.length ? '<label><span>관련 주문 <small>(선택)</small></span><select name="orderId"><option value="">선택 안 함</option>' + ord.map(function (o) { return '<option value="' + esc(o.order_id) + '">' + esc(o.product_name + ' · ' + day(o.paid_at || o.created_at)) + '</option>'; }).join('') + '</select></label>' : '') +
      '<label><span>제목</span><input name="subject" maxlength="80" autocomplete="off" placeholder="예) 결제했는데 주제가 열리지 않아요"></label>' +
      '<label><span>내용</span><textarea name="body" rows="6" maxlength="2000" placeholder="상황을 자세히 적어 주시면 빠르게 도와드릴 수 있어요. 생년월일 같은 출생정보는 적지 않아도 됩니다."></textarea><small class="me-count">0 / 2000</small></label>' +
      '<p class="me-note" style="margin-top:0">문의 내용과 이메일은 답변과 분쟁 처리 기록을 위해 3년간 보관합니다(개인정보처리방침).</p>' +
      '<div class="me-acts"><button type="submit" class="btn sm">보내기</button><button type="button" class="btn ghost sm" data-me="inq-close">취소</button></div><p class="me-msg" role="status" aria-live="polite"></p></form>' +
      '<div id="meInqList"></div></section>';
  }
  function inquiryList(box, token) {
    if (!box) return;
    post('/api/account/inquiry', token, { action: 'list' }).then(function (x) {
      var items = (x.ok && x.j.items) || []; if (!box.isConnected) return;
      box.innerHTML = items.length ? '<h3 class="me-h3">내 문의 내역</h3><div class="me-list">' + items.map(function (q) { return '<div class="me-row"><div><b>' + esc(q.subject) + '</b><small>' + esc((CAT[q.category] || '') + ' · ' + day(q.created_at)) + '</small></div><span class="me-st ' + esc(q.status) + '">' + esc(IST[q.status] || q.status) + '</span></div>'; }).join('') + '</div><p class="me-note">답변은 메일로 보내 드립니다. 메일이 보이지 않으면 스팸함도 확인해 주세요.</p>' : '';
    }).catch(function () { });
  }
  function inquirySubmit(form, token, email) {
    var f = form.elements, msg = form.querySelector('.me-msg'), btn = form.querySelector('[type=submit]');
    var subject = f.subject.value.trim(), body = f.body.value.trim();
    if (!subject) { msg.textContent = '제목을 적어 주세요.'; f.subject.focus(); return; }
    if (body.length < 5) { msg.textContent = '내용을 5자 이상 적어 주세요.'; f.body.focus(); return; }
    btn.disabled = true; msg.textContent = '보내는 중입니다…';
    post('/api/account/inquiry', token, { action: 'send', category: f.category.value, subject: subject, body: body, orderId: f.orderId ? f.orderId.value : '' }).then(function (x) {
      btn.disabled = false;
      if (x.ok && x.j.ok) {
        var cat = f.category.value; form.reset(); msg.textContent = ''; form.hidden = true; var ob = $('[data-me="inq-open"]'); if (ob) ob.setAttribute('aria-expanded', 'false');
        H.toast('문의를 보냈습니다.', 3500);
        var sec = $('#meInq'); if (sec) { var p = sec.querySelector('.me-sent') || sec.insertBefore(root.document.createElement('p'), $('#meInqList')); p.className = 'me-sent'; p.textContent = '문의를 접수했습니다' + (x.j.id ? '(#' + x.j.id + ')' : '') + '. 답변은 메일로 보내 드립니다(받는 주소 ' + (x.j.email || email || '계정 이메일') + ').'; }
        H.track('inquiry_send', { category: cat });
        inquiryList($('#meInqList'), token); return;
      }
      msg.textContent = x.status === 429 ? '오늘은 문의를 더 보낼 수 없습니다(하루 ' + (x.j.limit || 5) + '건). 급한 일은 전화로 연락해 주세요.' : x.status === 401 ? '로그인이 만료됐습니다. 다시 로그인해 주세요.' : '보내지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }).catch(function () { btn.disabled = false; msg.textContent = '연결이 끊겼습니다. 잠시 후 다시 시도해 주세요.'; });
  }

  /* ── 라우트 ── */
  H.route('me', function (q, ctx) {
    var el = H.view('<div class="me">' + head('') + '<p class="me-muted me-wait">불러오는 중입니다…</p></div>');
    var paint = function (html) { if (!H.alive(ctx)) return null; el = H.view('<div class="me">' + html + '</div>', { keepScroll: true }); return el; };
    A.info().then(function (d) {
      return A.session().then(function (sess) {
        if (!H.alive(ctx)) return;
        if (!sess || sess.off) { paint(guestHtml(d, !!(sess && sess.off) || !A.ready(d))); H.track('mypage_view', { logged: 0 }); return; }
        return Promise.all([
          post('/api/commerce/mine', sess.access_token, {}),
          post('/api/account/logins', sess.access_token, {}).catch(function () { return null; }),
        ]).then(function (rs) {
          if (!H.alive(ctx)) return;
          if (rs[0].status === 401) { return A.logout().then(function () { paint(guestHtml(d, false)); }); }   // 세션이 만료됐거나 탈퇴한 계정
          paint(memberHtml(sess, rs[0].ok ? rs[0].j : null, rs[1] && rs[1].ok ? rs[1].j : null) + (rs[0].ok ? '' : '<p class="me-muted">구매 정보를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>'));
          el.__mine = rs[0].ok ? rs[0].j : null; el.__token = sess.access_token; el.__email = (rs[0].ok && rs[0].j.member && rs[0].j.member.email) || (sess.user && sess.user.email) || '';
          inquiryList($('#meInqList'), sess.access_token);
          if (q.inq) { var io = $('[data-me="inq-open"]'); if (io) { io.click(); $('#meInq').scrollIntoView({ block: 'start' }); } }
          H.track('mypage_view', { logged: 1 });
        });
      });
    }).catch(function () { if (H.alive(ctx)) paint(head('') + '<p class="me-muted">마이페이지를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 열어 주세요.</p><div class="me-acts"><button type="button" class="btn ghost sm" data-me="retry">다시 시도</button></div>' + deviceHtml(false)); });

    var onClick = function (e) {
      var scr = $('#screen'); if (!scr || !scr.contains(e.target)) return;
      var b = e.target.closest('[data-login],[data-me],[data-open]'); if (!b) return;
      if (b.hasAttribute('data-login')) { A.login(b.getAttribute('data-login')); return; }
      if (b.hasAttribute('data-open')) {
        var mine = scr.querySelector('.me') && el.__mine, x = mine && mine.sajus && mine.sajus[+b.getAttribute('data-open')]; if (!x || !x.birth) return;
        // 무빙툰 화면이 시작할 때 읽는 이어 읽기 값(report/v2/viewer.js handoff) — /report/my/ 의 '이 사주로 바로 읽기'와 같다
        try { sessionStorage.setItem('mt_v2_input', JSON.stringify({ inp: x.birth, name: x.label || '', interest: '', resumeChapter: null })); } catch (er) { H.toast('이 브라우저에서는 바로 열 수 없어요.'); return; }
        root.location.href = '/report/v2/?from=my'; return;
      }
      var a = b.getAttribute('data-me');
      if (a === 'del') { if (root.confirm('저장된 출생정보를 이 기기에서 삭제할까요? 되돌릴 수 없습니다. (로그인 계정과 구매한 주제는 그대로 남습니다.)')) { if (H.Onboard && H.Onboard.clear) H.Onboard.clear(); H.toast('삭제했습니다.'); H.replace('#/welcome'); } return; }
      if (a === 'logout') { b.disabled = true; A.logout().then(function () { H.toast('로그아웃했습니다.'); H.render(); }); return; }
      if (a === 'retry') H.render();
      if (a === 'inq-open' || a === 'inq-close') { var fm = $('#meInqForm'), ob = $('[data-me="inq-open"]'); if (!fm) return; fm.hidden = a === 'inq-close' ? true : !fm.hidden; if (ob) ob.setAttribute('aria-expanded', String(!fm.hidden)); if (!fm.hidden) fm.elements.subject.focus(); }
    };
    root.document.addEventListener('click', onClick);
    var onSubmit = function (e) { if (e.target && e.target.id === 'meInqForm') { e.preventDefault(); inquirySubmit(e.target, el.__token, el.__email); } };
    var onInput = function (e) { if (e.target && e.target.name === 'body' && e.target.closest('#meInqForm')) { var c = e.target.parentNode.querySelector('.me-count'); if (c) c.textContent = e.target.value.length + ' / 2000'; } };
    root.document.addEventListener('submit', onSubmit); root.document.addEventListener('input', onInput);
    // 안내자를 바꾸면(guide-control.js) 이름 표시를 고친다
    var onGuide = function () { $$('[data-guide-open] small').forEach(function (n) { n.textContent = guideName(); }); };
    root.addEventListener('mantra:guide-change', onGuide);
    var prev = H.cleanup; H.cleanup = function () { root.document.removeEventListener('click', onClick); root.document.removeEventListener('submit', onSubmit); root.document.removeEventListener('input', onInput); root.removeEventListener('mantra:guide-change', onGuide); if (prev) prev(); };
  });
})(window);
