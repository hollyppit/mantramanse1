/* 무빙툰 유료 잠금·로그인·결제(화면 쪽). 서버: /api/commerce/* · 잠금 규칙 원본: functions/_commerce.js
   - 서버가 장 본문(검수 풀이)을 잠그고, 이 파일은 같은 규칙으로 화면에서 잠긴 장을 가리고 구매 창을 띄운다.
   - 장 → 세계: 장의 카탈로그 주제(editorialTopicId)로 정한다(서버 TOPIC_WORLD 와 같은 표). 주제가 없는 장은 잠그지 않는다.
   - 세계의 무료 장: 서버가 알려 준 freeChapter(카탈로그 id)와 장의 editorialContractId(없으면 id)가 같으면 무료.
   - 로그인: Supabase(카카오·구글). 결제: 서버가 고른 결제사(keys.provider) — 포트원 V2 결제창(PG 는 채널 키가 정함) 또는 토스페이먼츠 결제창. 키가 없으면 '준비 중'으로 보이고 잠금은 그대로다.
   - 관리자: 같은 브라우저 탭의 관리자 비밀번호(sessionStorage mt_pw)가 있으면 서버가 잠그지 않는다. '무료 사용자로 보기'(localStorage mt_view_as_free=1)면 무료처럼 본다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var TOPIC_WORLD = { self: 'w1', timing: 'w1', health: 'w1', creative: 'w1', remedy: 'w1', wealth: 'w2', career: 'w7', love: 'w3', relationships: 'w3' };
  var SB_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var TOSS_SDK = 'https://js.tosspayments.com/v2/standard';
  var PORTONE_SDK = 'https://cdn.portone.io/v2/browser-sdk.js';
  var PAY_KEYS = ['pay', 'paymentKey', 'orderId', 'amount', 'code', 'message', 'paymentType', 'paymentId', 'txId', 'transactionType', 'pgCode', 'pgMessage'];
  var P = { info: null, sd: null, sb: null, token: '', loading: null, chapters: function () { return []; }, onChange: null };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var won = function (n) { return (+n || 0).toLocaleString('ko-KR') + '원'; };
  var ls = function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } };
  var adminPw = function () { try { return root.sessionStorage.getItem('mt_pw') || ''; } catch (e) { return ''; } };
  function script(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error('load ' + src)); }; document.head.appendChild(s); }); }
  function track(ev, d) {
    try { if (R.track) R.track(ev, d); } catch (e) { }
    // 구매 전환 측정(관리자 결제·상품 탭): 화면 이벤트 → 단계
    if (ev === 'paywall_view') { funnel('gate'); if (d && d.logged) funnel('gate_logged'); }
    else if (ev === 'login_start') funnel('login_start');
    else if (ev === 'purchase_start') funnel('checkout');
    else if (ev === 'purchase_done') funnel('paid');
  }
  // 브라우저마다 무작위 id 하나(개인정보 아님). 같은 날 같은 단계는 한 번만 보낸다. 관리자·미리보기·추적 거부 브라우저는 세지 않는다.
  var FUNNEL_SENT = {};
  function funnelVid() {
    var v = ls('mt_vid'); if (v && /^[0-9a-f-]{36}$/.test(v)) return v;
    try { v = root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : null; if (v) root.localStorage.setItem('mt_vid', v); } catch (e) { }
    return v;
  }
  function funnel(step) {
    try {
      if (adminPw() || /[?&]preview=1/.test(root.location.search) || root.navigator.doNotTrack === '1') return;
      var day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10), key = day + ':' + step;
      if (FUNNEL_SENT[key]) return; FUNNEL_SENT[key] = 1;
      var once = 'mt_funnel:' + key; try { if (root.sessionStorage.getItem(once)) return; root.sessionStorage.setItem(once, '1'); } catch (e) { }
      var vid = funnelVid(); if (!vid) return;
      var body = JSON.stringify({ step: step, vid: vid });
      if (root.navigator.sendBeacon && root.navigator.sendBeacon('/api/commerce/funnel', new Blob([body], { type: 'application/json' }))) return;
      fetch('/api/commerce/funnel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true }).catch(function () { });
    } catch (e) { }
  }
  // 장을 읽음: 무빙툰의 장 열람 이벤트(analytics.js 가 보내는 mt:track)
  try { root.addEventListener('mt:track', function (e) { if (e && e.detail && e.detail.name === 'chapter_viewed') funnel('read'); }); } catch (e) { }

  // 서버 요청에 붙일 머리글: 회원 토큰·관리자 비밀번호·무료 사용자로 보기
  function headers() {
    var h = {}; if (P.token) h['x-member-token'] = P.token;
    var pw = adminPw(); if (pw) { h.authorization = 'Bearer ' + pw; if (ls('mt_view_as_free') === '1') h['x-view-as'] = 'free'; }
    return h;
  }
  function sbClient() {
    if (P.sb) return Promise.resolve(P.sb);
    var k = P.info && P.info.keys; if (!k || !k.supabaseUrl || !k.supabaseAnonKey) return Promise.reject(new Error('login-not-configured'));
    return (root.supabase ? Promise.resolve() : script(SB_SDK)).then(function () {
      P.sb = root.supabase.createClient(k.supabaseUrl, k.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
      P.sb.auth.onAuthStateChange(function (_e, session) { var t = session && session.access_token || ''; if (t !== P.token) { P.token = t; refresh(); } });
      return P.sb;
    });
  }
  function fetchOnce() {
    return fetch('/api/commerce/access', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers()), body: JSON.stringify({ sd: safeSd(P.sd) }) })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  // 잠금 정보가 한 번 실패하면 예전에는 끝까지 비어 있어(아무것도 잠그지 않음) 서버가 잠근 장이 '불러오는 중'에 멈췄다. 두 번 더 묻는다
  function fetchInfo() {
    var wait = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
    return fetchOnce().then(function (d) { return d || wait(1500).then(fetchOnce); }).then(function (d) { return d || wait(4000).then(fetchOnce); });
  }
  // 서버가 잠근 장(full-reading.js 의 readingLocked)인데 새 잠금 정보로는 열려 있으면(구매·로그인 뒤) 다시 받게 되돌린다
  function releaseLocks(d) {
    if (!d || !d.worlds || !R.FullReading || !R.FullReading.unlock) return;
    var ids = P.chapters().filter(function (c) { if (!c || !c.readingLocked) return false; var w = c.readingLocked.world || worldOf(c), s = w && d.worlds[w]; return !!(s && (!s.paid || s.owned)); }).map(function (c) { c.readingLocked = null; return c.id; });
    if (ids.length) R.FullReading.unlock(ids, P.current && ids.indexOf(P.current.id) >= 0 ? P.current.id : null);
  }
  // 서버에는 기둥·성별만 보낸다(이름·생일 원문 제외)
  function safeSd(sd) { if (!sd || !sd.pillars) return null; var p = sd.pillars, h = function (k) { return p[k] ? { hanja: p[k].hanja } : null; }; return { pillars: { year: h('year'), month: h('month'), day: h('day'), hour: h('hour') }, gender: sd.gender }; }
  function refresh() {
    P.loading = fetchInfo().then(function (d) {
      P.info = d;
      releaseLocks(d);
      if (d && d.configured && d.configured.login && !P.sb) sbClient().then(function (sb) { return sb.auth.getSession(); }).then(function (r) { var t = r && r.data && r.data.session && r.data.session.access_token || ''; if (t && t !== P.token) { P.token = t; refresh(); } }).catch(function () { });
      if (P.onChange) P.onChange(d);
      return d;
    });
    return P.loading;
  }

  function worldOf(c) { return c && c.editorialTopicId ? (TOPIC_WORLD[c.editorialTopicId] || 'w1') : null; }
  // 잠겼으면 { world, info } 아니면 null
  function lockOf(c) {
    // 서버가 이 장을 잠갔다고 답했으면(402·401) 화면 쪽 정보보다 서버를 따른다
    if (c && c.readingLocked) {
      var sw = c.readingLocked.world || worldOf(c) || 'w1', ss = P.info && P.info.worlds && P.info.worlds[sw];
      return { world: sw, state: ss || { paid: true, owned: false, freeChapter: c.readingLocked.freeChapter }, server: c.readingLocked };
    }
    var d = P.info, w = worldOf(c); if (!d || !w || !d.worlds || !d.worlds[w]) return null;
    var s = d.worlds[w]; if (!s.paid || s.owned) return null;
    if ((c.editorialContractId || c.id) === s.freeChapter) return null;
    return { world: w, state: s };
  }
  function lockedIndex(i) { var c = P.chapters()[i]; return !!(c && lockOf(c)); }

  // ── 결제창·로그인으로 페이지를 떠났다 돌아와도 읽던 사주·장으로 바로 이어지게: 떠나기 직전 viewer 의 이어 읽기 값(mt_v2_input)을 저장한다.
  //    viewer.js handoff() 가 돌아온 페이지에서 이 값을 한 번 꺼내 입력창 없이 시작하고, 그 장(resumeChapter)으로 들어간다.
  function saveResume() { try { if (P.resume) { var v = P.resume(P.current && P.current.id); if (v) root.sessionStorage.setItem('mt_v2_input', JSON.stringify(v)); } } catch (e) { } }
  function dropResume() { try { root.sessionStorage.removeItem('mt_v2_input'); } catch (e) { } }

  // ── 잠금 창
  function close() { var el = document.getElementById('pw-sheet'); if (el) el.parentNode.removeChild(el); }
  function show(c, opts) {
    opts = opts || {}; close();
    var lk = lockOf(c); if (!lk) return false;
    P.current = c;
    var d = P.info || {}, worldName = (opts.worldName || '').trim() || '이 주제';
    var products = (d.products || []).filter(function (p) { return p.worlds && p.worlds.indexOf(lk.world) >= 0; });
    var logged = !!(d.member), canPay = d.configured && d.configured.pay, canLogin = d.configured && d.configured.login;
    var body;
    // 서버는 잠갔는데 화면 정보로는 구매(또는 관리자)로 보이는 경우: 구매 버튼 대신 확인 방법을 안내한다(로그인이 풀렸거나 다른 사주·계정)
    var mismatch = lk.server && lk.state && lk.state.owned;
    // 상품·가격은 로그인 전에도 보여 준다(결제사 심사 요건: 상품 정보·결제 금액·환불 정보를 한 곳에서 확인). 구매 버튼만 로그인 뒤에 나타난다
    var list = function (buy) {
      return '<ul class="pw-list">' + products.map(function (p) {
        var right = p.owned ? '<span class="pw-own">구매함</span>' : buy ? '<button type="button" class="pw-btn pw-buy" data-pw-buy="' + esc(p.id) + '">' + won(p.price) + ' 구매</button>' : '<span class="pw-price">' + won(p.price) + '</span>';
        return '<li><div><b>' + esc(p.name) + '</b>' + (p.kind === 'bundle' ? '<small>지금 열려 있는 유료 주제 ' + p.worlds.length + '개를 한 번에</small>' : '') + '</div>' + right + '</li>';
      }).join('') + '</ul>';
    };
    var fine = '<p class="pw-fine">이 사주(' + esc(opts.who || '지금 보고 있는 사주') + ')에만 열리고, 결제 즉시 열리고 결제일로부터 12개월 동안 볼 수 있습니다. 디지털 콘텐츠 특성상 열람을 시작하면 청약 철회가 제한될 수 있습니다. 구매 후 7일 이내·유료 장 미열람 시 전액 환불. <a href="/report/legal/products.html" target="_blank" rel="noopener">상품 안내</a> · <a href="/report/legal/refund.html" target="_blank" rel="noopener">환불정책</a> · <a href="/report/legal/terms.html" target="_blank" rel="noopener">이용약관</a></p>';
    if (mismatch) body = '<p class="pw-note">구매 내역을 서버에서 확인하지 못해 이 장을 열지 못했습니다. 로그인이 풀렸거나, 구매한 사주·계정과 지금 보는 사주·계정이 다를 수 있어요.</p><div class="pw-login"><button type="button" class="pw-btn pw-buy" data-pw-recheck>다시 확인하기</button></div><p class="pw-fine"><a href="/report/my/" target="_blank" rel="noopener">내 구매 내역</a></p>';
    else if (!P.info) body = '<p class="pw-note">구매 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p><div class="pw-login"><button type="button" class="pw-btn pw-buy" data-pw-recheck>다시 확인하기</button></div>';
    else if (!products.length || !canPay) body = '<p class="pw-note">지금은 결제를 준비하고 있습니다. 조금만 기다려 주세요.</p>';
    else if (!logged) body = list(false) + '<p class="pw-note">구매하려면 먼저 로그인해 주세요. 구매한 내용은 계정에 저장되어 다른 기기에서도 다시 볼 수 있어요.</p>' +
      (canLogin ? '<div class="pw-login">' + loginBtn('kakao') + loginBtn('google') + (d.configured.naver ? loginBtn('naver') : '<button type="button" class="pw-btn" disabled title="준비 중">네이버(준비 중)</button>') + '</div>' +
        (lastLogin() ? '<p class="pw-fine">구매한 계정과 <b>같은 방법</b>으로 로그인해야 구매한 주제가 열려요. 이 기기에서는 지난번에 <b>' + LN[lastLogin()] + '</b>로 로그인했어요.</p>' : '') : '<p class="pw-note">로그인을 준비하고 있습니다.</p>') + fine;
    else body = list(true) + (d.keys && d.keys.portone && d.keys.portone.testChannel ? '<p class="pw-hint">🧪 ' + (d.admin ? '관리자 시험 결제' : '결제 시험 운영 중') + ': <b>' + esc(d.keys.portone.testChannel) + ' 테스트 채널</b>로 결제돼요. 실제로 청구되지 않고 매입 전에 자동 취소돼요.</p>' : '') + fine +
      '<label class="pw-save"><input type="checkbox" id="pw-save"> <span>이 사주의 출생 정보(생년월일·시각·성별)를 내 계정에 저장해 <b>다른 기기에서도 바로 열기</b> <small>(선택 · 내 구매 내역에서 언제든 삭제)</small></span></label>' +
      '<p class="pw-buyer">' + (LN[lastLogin()] ? '<b>' + LN[lastLogin()] + ' 계정</b>' : '<b>지금 로그인한 계정</b>') + '(' + esc(d.member.email || '') + ')으로 구매됩니다.</p><div id="pw-hint"></div>' +
      '<p class="pw-fine"><a href="/report/my/" target="_blank" rel="noopener">내 구매 내역</a> · <button type="button" class="pw-link" data-pw-logout>로그아웃</button></p>';
    var el = document.createElement('div'); el.id = 'pw-sheet'; el.className = 'pw-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '구매 안내');
    el.innerHTML = '<div class="pw-card"><button type="button" class="pw-x" data-pw-close aria-label="닫기">×</button><p class="pw-k">🔒 잠긴 장</p><h3>' + esc(worldName) + '의 다음 이야기는 구매 후 이어집니다</h3><p class="pw-sub">첫 장은 무료로 볼 수 있어요. 지금 고른 장: ' + esc(c.title || '') + '</p>' + body + '</div>';
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.closest('[data-pw-close]')) { close(); if (opts.onClose) opts.onClose(); return; }
      var lg = e.target.closest('[data-pw-login]'); if (lg) { login(lg.dataset.pwLogin); return; }
      var by = e.target.closest('[data-pw-buy]'); if (by) { buy(by.dataset.pwBuy, opts.who, by); return; }
      if (e.target.closest('[data-pw-logout]')) { logout(); return; }
      // 다시 확인: 서버가 잠근 표시를 풀고 다시 요청한다. 여전히 잠겨 있으면 서버 답에 따라 이 창이 다시 뜬다
      var rc = e.target.closest('[data-pw-recheck]'); if (rc) { rc.disabled = true; rc.textContent = '확인 중…'; close(); refresh().then(function () { c.readingLocked = null; if (R.FullReading && R.FullReading.unlock) R.FullReading.unlock([c.id], c.id); }); }
    });
    document.body.appendChild(el); track('paywall_view', { world: lk.world, chapter: c.id, logged: logged });
    if (logged && products.length && canPay) loginHint(el.querySelector('#pw-hint'));
    var first = el.querySelector('.pw-btn:not([disabled])'); if (first) first.focus();
    return true;
  }

  // 로그인 방법 헷갈림 막기: 이 기기에서 마지막으로 쓴 방법 표시, 구매 내역이 없으면 같은 이메일의 다른 가입 계정 안내
  var LN = { kakao: '카카오', google: '구글', naver: '네이버' };
  function lastLogin() { var v = ls('mt_last_login'); return LN[v] ? v : ''; }
  function loginBtn(p) { return '<button type="button" class="pw-btn pw-' + p + '" data-pw-login="' + p + '">' + LN[p] + '로 시작하기' + (lastLogin() === p ? '<small class="pw-last">지난번에 쓴 방법</small>' : '') + '</button>'; }
  function loginHint(box) {
    if (!box) return;
    fetch('/api/account/logins', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers()), body: '{}' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || d.hasPurchases || !box.isConnected) return;
        if (d.suggest && d.linked.indexOf(d.suggest.provider) < 0) box.innerHTML = '<p class="pw-hint"><b>' + LN[d.suggest.provider] + '로 가입한 계정' + (d.suggest.hasPurchases ? '에 구매 내역이 있어요.' : '이 있어요.') + '</b> 같은 분이라면 <a href="/report/my/" target="_blank" rel="noopener">내 구매 내역</a>에서 두 계정을 합칠 수 있어요.</p>';
        else box.innerHTML = '<p class="pw-hint">전에 산 주제가 안 보이나요? 다른 방법(카카오·구글·네이버)으로 산 적이 있다면 그 방법으로 로그인하거나 <a href="/report/my/" target="_blank" rel="noopener">내 구매 내역</a>에서 계정을 연결하세요.</p>';
      }).catch(function () { });
  }
  function login(provider) {
    track('login_start', { provider: provider });
    try { root.localStorage.setItem('mt_last_login', provider); } catch (e) { }
    saveResume();
    // 네이버는 Supabase 기본 로그인이 아니라 서버가 처리한다(functions/_naver-login.js): 돌아오면 ?naver_login=1 로 세션을 받아 간다
    // 네이버, 그리고 서버 구글 로그인이 켜져 있으면 구글도 우리 서버가 처리(돌아오면 ?naver_login=1 / ?google_login=1 로 세션을 받아 간다)
    if (provider === 'naver' || (provider === 'google' && P.info && P.info.configured && P.info.configured.googleServer)) { root.location.href = '/api/auth/' + provider + '/start?next=' + encodeURIComponent(root.location.pathname + root.location.search + root.location.hash); return; }
    sbClient().then(function (sb) { return sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: root.location.href } }); })
      .catch(function () { dropResume(); alert('로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'); });
  }
  function logout() { sbClient().then(function (sb) { return sb.auth.signOut(); }).then(function () { P.token = ''; close(); refresh(); }).catch(function () { }); }

  // ── 결제 방법 고르기 + 구매자 정보(서버 /api/commerce/access 의 keys.portone.channels).
  //    채널이 둘 이상이면(예: 이니시스 '신용·체크카드' / KPN '카드·간편결제') 손님이 고른다. 마지막 선택은 이 브라우저(mt_pay_channel)에 기억.
  //    고른 채널이 구매자 정보를 요구하면(이니시스: 이름·휴대폰·이메일) 같은 창에서 받아 결제창(포트원 → 결제사)에만 넘긴다. 우리 서버에는 보내지 않는다.
  //    '이 기기에 기억'을 고르면 구매자 정보를 이 브라우저(localStorage mt_buyer)에만 남겨 다음 구매 때 채운다.
  var BUYER_KEY = 'mt_buyer', CH_KEY = 'mt_pay_channel';
  function payChannels() {
    var k = P.info && P.info.keys && P.info.keys.portone; if (!k) return [];
    if (k.channels && k.channels.length) return k.channels;
    return [{ id: 'main', label: '카드 결제', sub: '', channelKey: k.channelKey, buyer: k.buyer || [] }];   // 예전 서버 응답
  }
  function cleanPhone(v) { var x = String(v || '').replace(/[^0-9]/g, ''); return /^01[016789]\d{7,8}$/.test(x) ? x.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') : ''; }
  function cleanMail(v) { v = String(v || '').trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 120 && !/@users\.mantrafortune\.com$/i.test(v) ? v : ''; }
  // 반환 Promise<{ channel, buyer|null }>. 고를 것도 적을 것도 없으면 창 없이 바로 넘어간다
  function askPay(chs) {
    var last = ls(CH_KEY), pick0 = chs.filter(function (c) { return c.id === last; })[0] || chs[0];
    if (chs.length < 2 && !(pick0.buyer && pick0.buyer.length)) return Promise.resolve({ channel: pick0, buyer: null });
    return new Promise(function (resolve, reject) {
      var saved = {}; try { saved = JSON.parse(ls(BUYER_KEY) || '{}') || {}; } catch (e) { saved = {}; }
      var mail = saved.email || cleanMail(P.info.member && P.info.member.email);
      var el = document.createElement('div'); el.id = 'pw-buyer-sheet'; el.className = 'pw-sheet pw-top'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '결제 방법');
      el.innerHTML = '<form class="pw-card pw-bform" novalidate><button type="button" class="pw-x" data-pw-bx aria-label="닫기">×</button><p class="pw-k">결제</p><h3>' + (chs.length > 1 ? '결제 방법을 골라 주세요' : '결제에 필요한 정보를 적어 주세요') + '</h3>' +
        (chs.length > 1 ? '<div class="pw-chs" role="radiogroup">' + chs.map(function (c) { return '<label class="pw-ch"><input type="radio" name="ch" value="' + esc(c.id) + '"' + (c === pick0 ? ' checked' : '') + '><span><b>' + esc(c.label) + '</b>' + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</span></label>'; }).join('') + '</div>' : '') +
        '<div class="pw-binfo"><p class="pw-sub">카드 결제사(<span data-pg></span>)가 결제 확인·영수증·결제 문의에 씁니다. 우리 서버에는 저장하지 않아요.</p>' +
        '<label data-f="fullName">이름<input name="fullName" autocomplete="name" maxlength="30" value="' + esc(saved.fullName || '') + '"></label>' +
        '<label data-f="phoneNumber">휴대폰 번호<input name="phoneNumber" type="tel" inputmode="numeric" autocomplete="tel" maxlength="13" placeholder="010-0000-0000" value="' + esc(saved.phoneNumber || '') + '"></label>' +
        '<label data-f="email">이메일<input name="email" type="email" autocomplete="email" maxlength="120" value="' + esc(mail) + '"></label>' +
        '<label class="pw-save"><input type="checkbox" name="remember"' + (saved.fullName ? ' checked' : '') + '> <span>이 기기에 기억하기 <small>(이 브라우저에만 남아요)</small></span></label>' +
        '<p class="pw-fine">입력한 정보는 결제대행사(포트원·<span data-pg></span>)로 전달됩니다. <a href="/report/legal/privacy.html" target="_blank" rel="noopener">개인정보처리방침</a></p></div>' +
        '<p class="pw-berr" role="alert"></p><button type="submit" class="pw-btn pw-buy pw-bgo">결제 계속</button></form>';
      var f = el.querySelector('form'), err = el.querySelector('.pw-berr'), info = el.querySelector('.pw-binfo');
      var cur = function () { var r = f.querySelector('input[name=ch]:checked'); return r ? chs.filter(function (c) { return c.id === r.value; })[0] || pick0 : pick0; };
      var sync = function () {
        var c = cur(), need = c.buyer || [];
        info.hidden = !need.length; err.textContent = '';
        Array.prototype.forEach.call(info.querySelectorAll('[data-f]'), function (l) { var on = need.indexOf(l.dataset.f) >= 0; l.hidden = !on; l.querySelector('input').required = on; });
        Array.prototype.forEach.call(info.querySelectorAll('[data-pg]'), function (x) { x.textContent = c.sub || c.label; });
      };
      var done = function () { if (el.parentNode) el.parentNode.removeChild(el); };
      var cancel = function () { done(); reject(new Error('user-cancel')); };
      el.addEventListener('click', function (e) { if (e.target === el || e.target.closest('[data-pw-bx]')) cancel(); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Escape') cancel(); });
      f.addEventListener('change', function (e) { if (e.target.name === 'ch') sync(); });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var c = cur(), need = c.buyer || [], want = function (x) { return need.indexOf(x) >= 0; };
        try { root.localStorage.setItem(CH_KEY, c.id); } catch (x) { }
        if (!need.length) { done(); resolve({ channel: c, buyer: null }); return; }
        var name = String(f.elements.fullName.value || '').replace(/\s+/g, ' ').trim();
        var tel = want('phoneNumber') ? cleanPhone(f.elements.phoneNumber.value) : '', em = want('email') ? cleanMail(f.elements.email.value) : '';
        var bad = want('fullName') && name.length < 2 ? ['fullName', '이름을 2글자 이상 적어 주세요'] : want('phoneNumber') && !tel ? ['phoneNumber', '휴대폰 번호를 확인해 주세요(예: 010-1234-5678)'] : want('email') && !em ? ['email', '이메일 주소를 확인해 주세요'] : null;
        if (bad) { err.textContent = bad[1]; f.elements[bad[0]].focus(); return; }
        var b = {}; if (want('fullName')) b.fullName = name; if (tel) b.phoneNumber = tel; if (em) b.email = em;
        try { if (f.elements.remember.checked) root.localStorage.setItem(BUYER_KEY, JSON.stringify(b)); else root.localStorage.removeItem(BUYER_KEY); } catch (x) { }
        done(); resolve({ channel: c, buyer: b });
      });
      document.body.appendChild(el); sync();
      var first = chs.length > 1 ? f.querySelector('input[name=ch]:checked') : Array.prototype.filter.call(f.querySelectorAll('input[required]'), function (i) { return !i.value; })[0] || f.querySelector('.pw-bgo'); if (first) first.focus();
    });
  }

  function buy(productId, who, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '결제 준비 중…'; }
    var d = P.info; track('purchase_start', { product: productId });
    var pay = null;
    (d && d.keys && d.keys.provider === 'portone' ? askPay(payChannels()).then(function (x) { pay = x; }) : Promise.resolve()).then(function () { return fetch('/api/commerce/order', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers()), body: JSON.stringify({ productId: productId, sd: safeSd(P.sd), label: who || null, birth: (function () { try { var box = document.getElementById('pw-save'); if (!box || !box.checked) return null; var v = P.resume && P.resume(); return v && v.inp || null; } catch (e) { return null; } })() }) }); })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'order'); return j; }); })
      .then(function (o) {
        if (o.provider === 'portone' || (!o.provider && d.keys.provider === 'portone')) return payPortone(o, pay);
        return (root.TossPayments ? Promise.resolve() : script(TOSS_SDK)).then(function () {
          var back = root.location.origin + root.location.pathname;
          var keep = new URLSearchParams(root.location.search); PAY_KEYS.forEach(function (k) { keep.delete(k); });
          keep.set('pay', 'success'); var ok = back + '?' + keep.toString() + root.location.hash; keep.set('pay', 'fail'); var no = back + '?' + keep.toString() + root.location.hash;
          var pay = root.TossPayments(d.keys.tossClientKey).payment({ customerKey: o.customerKey });
          saveResume();
          return pay.requestPayment({ method: 'CARD', amount: { currency: 'KRW', value: o.amount }, orderId: o.orderId, orderName: o.orderName, successUrl: ok, failUrl: no, card: { flowMode: 'DEFAULT' } });
        });
      })
      .catch(function (e) {
        dropResume();   // 결제창을 닫았거나 실패: 페이지를 떠나지 않았으므로 저장한 이어 읽기 값을 지운다
        if (btn) { btn.disabled = false; btn.textContent = '다시 시도'; }
        var m = { 'already-owned': '이미 구매한 상품입니다.', 'login-required': '로그인이 풀렸습니다. 다시 로그인해 주세요.', 'not-configured': '결제를 준비하고 있습니다.' }[e && e.message];
        if (e && (e.code === 'USER_CANCEL' || e.message === 'user-cancel')) return;
        // 포트원 SDK 가 결제창을 열기 전에 거절하면(잘못된 값 등) 그 이유를 그대로 보여 준다: 문의받을 때 원인을 바로 알 수 있게
        var why = e && (e.portone || (e.code && e.message)) ? '결제가 완료되지 않았습니다: ' + e.message : '';
        if (!m && !why && e && e.message && !/^[a-z-]+$/.test(e.message)) why = '결제를 시작하지 못했습니다: ' + String(e.message).slice(0, 120);
        alert(m || why || '결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        if (root.console) console.warn('[paywall] 결제 시작 실패', e);
      });
  }

  // 포트원 결제창: PC 는 같은 페이지에서 창이 떴다가 결과를 돌려주고, 모바일은 redirectUrl 로 페이지를 옮겼다가 돌아온다(handleReturn).
  // 결제 id 는 서버 주문번호를 그대로 쓴다. 서버가 포트원에 결제를 다시 조회해 금액을 확인한 뒤에만 권한을 준다.
  function payPortone(o, pay) {
    var k = P.info.keys.portone || {}, buyer = pay && pay.buyer, chKey = pay && pay.channel && pay.channel.channelKey || k.channelKey;
    return (root.PortOne ? Promise.resolve() : script(PORTONE_SDK)).then(function () {
      var u = new URL(root.location.href); PAY_KEYS.forEach(function (x) { u.searchParams.delete(x); }); u.searchParams.set('pay', 'portone');
      var cust = { customerId: o.customerKey }; if (P.info.member && P.info.member.email) cust.email = P.info.member.email;
      if (buyer) { if (buyer.fullName) cust.fullName = buyer.fullName; if (buyer.phoneNumber) cust.phoneNumber = buyer.phoneNumber; if (buyer.email) cust.email = buyer.email; }   // 결제사 필수 구매자 정보(이니시스)
      saveResume();
      return root.PortOne.requestPayment({ storeId: k.storeId, channelKey: chKey, paymentId: o.orderId, orderName: o.orderName, totalAmount: o.amount, currency: 'KRW', payMethod: 'CARD', redirectUrl: u.toString(), customer: cust });
    }).then(function (res) {
      if (!res) return;   // 모바일: 이미 다른 페이지로 이동 중 — 이어 읽기 값은 돌아왔을 때 써야 하므로 지우지 않는다(2026-11-24)
      dropResume();   // 여기까지 오면 PC 결제창: 페이지를 떠나지 않았다
      if (res.code != null) { var e = new Error(/취소/.test(res.message || '') ? 'user-cancel' : (res.message || res.code)); e.portone = true; throw e; }
      // 결제창은 끝났고 돈은 나갔을 수 있다: 확인 요청이 끊겨도 '결제를 시작하지 못했습니다'로 다시 사게 하지 않고, 다음에 다시 확인한다
      return confirmPortone(o.orderId).catch(function () { pendingPay(o.orderId); toast('결제 확인 중 연결이 끊겼습니다. 새로고침하면 다시 확인합니다.'); });
    });
  }
  // 확인이 끝나지 않은 결제(처리 중·서버 오류·연결 끊김): 이 탭에 주문번호를 남겨 다음에 열 때 다시 확인한다
  var PENDING_KEY = 'mt_pay_pending';
  function pendingPay(oid) { try { if (oid) root.sessionStorage.setItem(PENDING_KEY, oid); else root.sessionStorage.removeItem(PENDING_KEY); } catch (e) { } }
  // 서버 확인: 결제사 승인이 막 끝나 '처리 중'이면 잠깐 기다렸다 두 번 더 묻는다
  function confirmPortone(paymentId, tries) {
    tries = tries || 0;
    return fetch('/api/commerce/confirm', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers()), body: JSON.stringify({ paymentId: paymentId }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (x) {
        if ((x.status === 202 || x.status === 502) && tries < 2) return new Promise(function (ok) { setTimeout(ok, 2000); }).then(function () { return confirmPortone(paymentId, tries + 1); });
        return finishPurchase(x, paymentId);
      });
  }
  function finishPurchase(x, oid) {
    var unsettled = !(x.ok && x.j.ok) && (x.status === 202 || x.status >= 500);   // 아직 답이 정해지지 않음: 다음에 다시 확인
    pendingPay(unsettled ? oid : null);
    if (x.ok && x.j.ok) { track('purchase_done', { order: oid }); toast('구매가 완료되었습니다. 이어서 읽어 보세요.'); }
    else toast(x.j.error === 'grant-failed' ? '결제는 되었지만 열람 권한 기록이 늦어지고 있습니다. 새로고침하면 다시 확인하고, 계속 안 되면 문의해 주세요(주문번호 ' + oid + ').' : unsettled ? '결제를 확인하고 있습니다. 잠시 후 새로고침하면 다시 확인합니다.' : '결제를 확인하지 못했습니다: ' + (x.j.message || x.j.error || ''));
    return refresh().then(function () { if (x.ok && x.j.ok) { close(); if (P.onPurchased) { try { P.onPurchased(); } catch (e) { } } } }).then(function () { return x; });
  }

  // 결제창에서 돌아왔을 때: 성공이면 서버 승인 → 잠금 정보 다시 받기. 주소의 결제 값은 바로 지운다.
  function handleReturn() {
    var u = new URL(root.location.href), st = u.searchParams.get('pay');
    var pk =u.searchParams.get('paymentKey'), oid = u.searchParams.get('orderId'), amt = u.searchParams.get('amount'), msg = u.searchParams.get('message');
    // 주소의 결제 값은 서버가 확실한 답을 준 뒤에 지운다(연결이 끊기면 남겨 두어 새로고침으로 다시 승인할 수 있게)
    var clearUrl = function () { PAY_KEYS.forEach(function (k) { u.searchParams.delete(k); }); try { root.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } catch (e) { } };
    var getToken = function () { return (P.loading || Promise.resolve()).then(function () { return P.token ? null : sbClient().then(function (sb) { return sb.auth.getSession(); }).then(function (r) { P.token = r && r.data && r.data.session && r.data.session.access_token || ''; }).catch(function () { }); }); };
    if (!st) {   // 결제 값이 없는 보통 열기: 지난번에 확인이 끝나지 않은 결제가 있으면 다시 확인한다(2026-11-24)
      var pend = ''; try { pend = root.sessionStorage.getItem(PENDING_KEY) || ''; } catch (e) { }
      return pend ? getToken().then(function () { return confirmPortone(pend); }).catch(function () { }) : Promise.resolve(null);
    }
    if (st === 'portone') {   // 포트원 모바일 복귀: ?pay=portone&paymentId=…(&code=…&message=… 이면 실패·취소)
      var pid = u.searchParams.get('paymentId'), code = u.searchParams.get('code');
      if (!pid || code) { clearUrl(); if (code && !/취소/.test(msg || '')) toast('결제가 완료되지 않았습니다: ' + (msg || code)); return Promise.resolve(null); }
      // 답이 정해진 뒤에만 주소의 결제 값을 지운다: 처리 중(202)·서버 오류(5xx)면 남겨 두어 새로고침으로 다시 확인
      return getToken().then(function () { return confirmPortone(pid); }).then(function (x) { if (!x || !(x.status === 202 || x.status >= 500) || (x.ok && x.j && x.j.ok)) clearUrl(); }).catch(function () { pendingPay(pid); toast('결제 확인 중 연결이 끊겼습니다. 새로고침하면 다시 확인합니다.'); });
    }
    if (st !== 'success' || !pk || !oid) { clearUrl(); if (st === 'fail' && msg) toast('결제가 완료되지 않았습니다: ' + msg); return Promise.resolve(null); }
    return getToken()
      .then(function () { return fetch('/api/commerce/confirm', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers()), body: JSON.stringify({ paymentKey: pk, orderId: oid, amount: +amt }) }); })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      // 구매가 끝나면 열려 있던 잠금 창을 닫고, 사려던 장으로 이어 간다(viewer 가 onPurchased 를 넘긴다)
      .then(function (x) { clearUrl(); return finishPurchase(x, oid); }).catch(function () { toast('결제 확인 중 연결이 끊겼습니다. 새로고침하면 다시 확인합니다.'); });
  }
  // 네이버 로그인에서 돌아온 페이지: 서버가 잠깐 맡아 둔 세션을 받아 Supabase 로그인 상태로 만든다(쿠키 열쇠, 한 번만)
  // 서버 로그인(네이버·구글)에서 돌아온 페이지: 서버가 잠깐 맡아 둔 세션을 받아 Supabase 로그인 상태로 만든다(쿠키 열쇠, 한 번만)
  function handleServerLogin(provider) {
    var param = provider + '_login', name = provider === 'google' ? '구글' : '네이버';
    var u = new URL(root.location.href), v = u.searchParams.get(param); if (!v) return Promise.resolve();
    var clean = function () { u.searchParams.delete(param); try { root.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } catch (e) { } };
    if (v !== '1') { clean(); if (v === 'fail') toast(name + ' 로그인을 마치지 못했습니다. 다시 시도해 주세요.'); return Promise.resolve(); }
    var claim = function (n) { return fetch('/api/auth/' + provider + '/claim', { method: 'POST', credentials: 'same-origin' }).then(function (r) { if (r.ok) return r.json(); if (n < 2) return new Promise(function (ok) { setTimeout(ok, 700); }).then(function () { return claim(n + 1); }); return null; }); };
    return claim(0).then(function (s) {
      clean();
      if (!s || !s.access_token) { toast(name + ' 로그인을 마치지 못했습니다. 다시 시도해 주세요.'); return; }
      return sbClient().then(function (sb) { return sb.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token }); })
        .then(function () { P.token = s.access_token; track('login_done', { provider: provider }); return refresh(); });
    }).catch(function () { clean(); });
  }
  function handleNaver() { return handleServerLogin('naver').then(function () { return handleServerLogin('google'); }); }
  function toast(t) { if (R.toast) { R.toast(t, 5000); return; } var el = document.createElement('div'); el.className = 'pw-toast'; el.textContent = t; document.body.appendChild(el); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5000); }

  (function css() {
    var s = document.createElement('style');
    s.textContent = '.pw-sheet{position:fixed;inset:0;z-index:9999;background:rgba(6,8,16,.62);display:flex;align-items:flex-end;justify-content:center;padding:16px 16px max(16px,env(safe-area-inset-bottom))}@media(min-width:640px){.pw-sheet{align-items:center}}' +
      '.pw-card{position:relative;width:min(440px,100%);max-height:88vh;max-height:88dvh;overflow:auto;overscroll-behavior:contain;background:#141826;color:#F3EEDF;border:1px solid rgba(213,185,127,.35);border-radius:18px;padding:22px 20px 18px;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:inherit}' +
      '.pw-card h3{margin:4px 0 6px;font-size:1.12rem;line-height:1.45}.pw-k{margin:0;color:#D5B97F;font-size:.8rem;font-weight:700;letter-spacing:.04em}.pw-sub{margin:0 0 12px;color:#B9B3A4;font-size:.86rem}' +
      '.pw-x{position:absolute;top:4px;right:4px;width:44px;height:44px;display:grid;place-items:center;padding:0;border:0;background:none;color:#B9B3A4;font-size:1.6rem;cursor:pointer;line-height:1}.pw-note{color:#DCD5C4;font-size:.9rem;line-height:1.6}' +
      '.pw-login{display:grid;gap:8px;margin-top:10px}.pw-btn{border:0;border-radius:12px;padding:12px 14px;font:inherit;font-weight:700;cursor:pointer;background:#2A3047;color:#F3EEDF}.pw-btn[disabled]{opacity:.45;cursor:default}' +
      '.pw-kakao{background:#FEE500;color:#191600}.pw-naver{background:#03C75A;color:#fff}.pw-google{background:#fff;color:#1f1f1f}.pw-buy{background:#C8442F;color:#fff;white-space:nowrap}' +
      '.pw-list{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}.pw-list li{display:flex;gap:10px;align-items:center;justify-content:space-between;background:rgba(255,255,255,.05);border-radius:12px;padding:10px 12px}.pw-list small{display:block;color:#B9B3A4;font-size:.76rem}' +
      '.pw-save{display:flex;gap:8px;align-items:flex-start;margin:10px 0 0;color:#DCD5C4;font-size:.8rem;line-height:1.45;cursor:pointer}.pw-save input{margin-top:3px}.pw-save small{color:#8F8A7E}' +
      '.pw-last{display:block;font-size:.72rem;font-weight:500;opacity:.8;margin-top:2px}.pw-buyer{margin:10px 0 0;color:#DCD5C4;font-size:.84rem}.pw-hint{margin:8px 0 0;padding:8px 10px;border:1px solid rgba(213,185,127,.4);border-radius:10px;color:#DCD5C4;font-size:.8rem;line-height:1.5}.pw-hint a{color:#D5B97F}' +
      '.pw-own{color:#7FD1A8;font-weight:700;font-size:.86rem}.pw-price{color:#F3EEDF;font-weight:700;white-space:nowrap}.pw-fine{margin:10px 0 0;color:#8F8A7E;font-size:.74rem;line-height:1.5}.pw-fine a,.pw-link{color:#D5B97F;background:none;border:0;padding:0;font:inherit;cursor:pointer;text-decoration:underline}' +
      '.pw-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10000;background:#141826;color:#F3EEDF;border-radius:12px;padding:12px 16px;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:90vw;font-size:.9rem}' +
      '.xp-lock{margin-left:6px;font-size:.8em;opacity:.8}' +
      '.pw-sheet.pw-top{z-index:10001}.pw-bform label:not(.pw-save):not(.pw-ch){display:grid;gap:5px;margin:10px 0 0;color:#DCD5C4;font-size:.84rem;font-weight:600}' +
      '.pw-bform input:not([type=checkbox]):not([type=radio]){width:100%;box-sizing:border-box;border:1px solid rgba(213,185,127,.35);border-radius:10px;padding:11px 12px;background:#0E1220;color:#F3EEDF;font:inherit;font-size:16px}' +
      '.pw-bform input:focus{outline:2px solid #D5B97F;outline-offset:1px}.pw-chs{display:grid;gap:8px;margin:12px 0 4px}.pw-ch{display:flex;gap:10px;align-items:center;padding:12px;margin:0;color:#F3EEDF;font-weight:400;border:1px solid rgba(213,185,127,.35);border-radius:12px;cursor:pointer}.pw-ch:has(input:checked){border-color:#D5B97F;background:rgba(213,185,127,.08)}.pw-ch span{display:grid;gap:2px}.pw-ch input{margin:0;width:18px;height:18px;flex:none;accent-color:#D5B97F}.pw-ch small{color:#8F8A7E;font-size:.76rem}.pw-binfo[hidden],.pw-bform label[hidden]{display:none}.pw-berr{min-height:1.2em;margin:8px 0 0;color:#FF8A78;font-size:.82rem}.pw-bgo{width:100%;margin-top:4px}';
    document.head.appendChild(s);
  })();

  R.Paywall = {
    TOPIC_WORLD: TOPIC_WORLD,
    // viewer 가 사주 데이터와 장 목록 읽는 함수를 넘긴다
    init: function (sd, opts) { P.sd = sd; opts = opts || {}; if (opts.chapters) P.chapters = opts.chapters; if (opts.onChange) P.onChange = opts.onChange; if (opts.resume) P.resume = opts.resume; if (opts.onPurchased) P.onPurchased = opts.onPurchased; return (P.early || Promise.resolve()).then(refresh).then(handleNaver).then(handleReturn); },
    refresh: refresh, headers: headers, lockOf: lockOf, lockedIndex: lockedIndex, show: show, close: close, info: function () { return P.info; },
    // 신년운세 화면(report/newyear/)처럼 세계 장이 없는 화면이 같은 로그인·결제 흐름을 쓰도록 꺼내 둔다(기존 무빙툰 동작은 그대로)
    login: login, logout: logout, buy: buy, toast: toast,
    _state: P,
  };
  // 결제창에서 돌아온 페이지: 사주 입력·계산을 기다리지 않고 바로 서버 승인을 시작한다(토스는 승인이 늦으면 결제를 자동 취소한다).
  if (/[?&]pay=(success|fail|portone)/.test(root.location.search || '')) P.early = refresh().then(handleReturn).catch(function () { });
})(typeof window !== 'undefined' ? window : globalThis);
