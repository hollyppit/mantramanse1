/* 무빙툰 유료 잠금·로그인·결제(화면 쪽). 서버: /api/commerce/* · 잠금 규칙 원본: functions/_commerce.js
   - 서버가 장 본문(검수 풀이)을 잠그고, 이 파일은 같은 규칙으로 화면에서 잠긴 장을 가리고 구매 창을 띄운다.
   - 장 → 세계: 장의 카탈로그 주제(editorialTopicId)로 정한다(서버 TOPIC_WORLD 와 같은 표). 주제가 없는 장은 잠그지 않는다.
   - 세계의 무료 장: 서버가 알려 준 freeChapter(카탈로그 id)와 장의 editorialContractId(없으면 id)가 같으면 무료.
   - 로그인: Supabase(카카오·구글). 결제: 토스페이먼츠 결제창(카드·간편결제). 키가 없으면 '준비 중'으로 보이고 잠금은 그대로다.
   - 관리자: 같은 브라우저 탭의 관리자 비밀번호(sessionStorage mt_pw)가 있으면 서버가 잠그지 않는다. '무료 사용자로 보기'(localStorage mt_view_as_free=1)면 무료처럼 본다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var TOPIC_WORLD = { self: 'w1', timing: 'w1', health: 'w1', creative: 'w1', remedy: 'w1', wealth: 'w2', career: 'w7', love: 'w3', relationships: 'w3' };
  var SB_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var TOSS_SDK = 'https://js.tosspayments.com/v2/standard';
  var P = { info: null, sd: null, sb: null, token: '', loading: null, chapters: function () { return []; }, onChange: null };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var won = function (n) { return (+n || 0).toLocaleString('ko-KR') + '원'; };
  var ls = function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } };
  var adminPw = function () { try { return root.sessionStorage.getItem('mt_pw') || ''; } catch (e) { return ''; } };
  function script(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error('load ' + src)); }; document.head.appendChild(s); }); }
  function track(ev, d) { try { if (R.track) R.track(ev, d); } catch (e) { } }

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
  function fetchInfo() {
    return fetch('/api/commerce/access', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers()), body: JSON.stringify({ sd: safeSd(P.sd) }) })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  // 서버에는 기둥·성별만 보낸다(이름·생일 원문 제외)
  function safeSd(sd) { if (!sd || !sd.pillars) return null; var p = sd.pillars, h = function (k) { return p[k] ? { hanja: p[k].hanja } : null; }; return { pillars: { year: h('year'), month: h('month'), day: h('day'), hour: h('hour') }, gender: sd.gender }; }
  function refresh() {
    P.loading = fetchInfo().then(function (d) {
      P.info = d;
      if (d && d.configured && d.configured.login && !P.sb) sbClient().then(function (sb) { return sb.auth.getSession(); }).then(function (r) { var t = r && r.data && r.data.session && r.data.session.access_token || ''; if (t && t !== P.token) { P.token = t; refresh(); } }).catch(function () { });
      if (P.onChange) P.onChange(d);
      return d;
    });
    return P.loading;
  }

  function worldOf(c) { return c && c.editorialTopicId ? (TOPIC_WORLD[c.editorialTopicId] || 'w1') : null; }
  // 잠겼으면 { world, info } 아니면 null
  function lockOf(c) {
    var d = P.info, w = worldOf(c); if (!d || !w || !d.worlds || !d.worlds[w]) return null;
    var s = d.worlds[w]; if (!s.paid || s.owned) return null;
    if ((c.editorialContractId || c.id) === s.freeChapter) return null;
    return { world: w, state: s };
  }
  function lockedIndex(i) { var c = P.chapters()[i]; return !!(c && lockOf(c)); }

  // ── 잠금 창
  function close() { var el = document.getElementById('pw-sheet'); if (el) el.parentNode.removeChild(el); }
  function show(c, opts) {
    opts = opts || {}; close();
    var lk = lockOf(c); if (!lk) return false;
    var d = P.info, worldName = (opts.worldName || '').trim() || '이 주제';
    var products = (d.products || []).filter(function (p) { return p.worlds.indexOf(lk.world) >= 0; });
    var logged = !!(d.member), canPay = d.configured && d.configured.pay, canLogin = d.configured && d.configured.login;
    var body;
    if (!products.length || !canPay) body = '<p class="pw-note">지금은 결제를 준비하고 있습니다. 조금만 기다려 주세요.</p>';
    else if (!logged) body = '<p class="pw-note">구매한 내용은 계정에 저장되어 다른 기기에서도 다시 볼 수 있어요. 먼저 로그인해 주세요.</p>' +
      (canLogin ? '<div class="pw-login"><button type="button" class="pw-btn pw-kakao" data-pw-login="kakao">카카오로 시작하기</button><button type="button" class="pw-btn pw-google" data-pw-login="google">구글로 시작하기</button><button type="button" class="pw-btn" disabled title="준비 중">네이버(준비 중)</button></div>' : '<p class="pw-note">로그인을 준비하고 있습니다.</p>');
    else body = '<ul class="pw-list">' + products.map(function (p) {
      return '<li><div><b>' + esc(p.name) + '</b>' + (p.kind === 'bundle' ? '<small>지금 열려 있는 유료 주제 ' + p.worlds.length + '개를 한 번에</small>' : '') + '</div>' + (p.owned ? '<span class="pw-own">구매함</span>' : '<button type="button" class="pw-btn pw-buy" data-pw-buy="' + esc(p.id) + '">' + won(p.price) + ' 구매</button>') + '</li>';
    }).join('') + '</ul><p class="pw-fine">이 사주(' + esc(opts.who || '지금 보고 있는 사주') + ')에만 열립니다. 디지털 콘텐츠 특성상 열람을 시작하면 청약 철회가 제한될 수 있습니다.</p>' +
      '<p class="pw-fine">' + esc(d.member.email || '') + ' 로그인 중 · <button type="button" class="pw-link" data-pw-logout>로그아웃</button></p>';
    var el = document.createElement('div'); el.id = 'pw-sheet'; el.className = 'pw-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '구매 안내');
    el.innerHTML = '<div class="pw-card"><button type="button" class="pw-x" data-pw-close aria-label="닫기">×</button><p class="pw-k">🔒 잠긴 장</p><h3>' + esc(worldName) + '의 다음 이야기는 구매 후 이어집니다</h3><p class="pw-sub">첫 장은 무료로 볼 수 있어요. 지금 고른 장: ' + esc(c.title || '') + '</p>' + body + '</div>';
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.closest('[data-pw-close]')) { close(); if (opts.onClose) opts.onClose(); return; }
      var lg = e.target.closest('[data-pw-login]'); if (lg) { login(lg.dataset.pwLogin); return; }
      var by = e.target.closest('[data-pw-buy]'); if (by) { buy(by.dataset.pwBuy, opts.who, by); return; }
      if (e.target.closest('[data-pw-logout]')) { logout(); }
    });
    document.body.appendChild(el); track('paywall_view', { world: lk.world, chapter: c.id, logged: logged });
    var first = el.querySelector('.pw-btn:not([disabled])'); if (first) first.focus();
    return true;
  }

  function login(provider) {
    track('login_start', { provider: provider });
    sbClient().then(function (sb) { return sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: root.location.href } }); })
      .catch(function () { alert('로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'); });
  }
  function logout() { sbClient().then(function (sb) { return sb.auth.signOut(); }).then(function () { P.token = ''; close(); refresh(); }).catch(function () { }); }

  function buy(productId, who, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '결제 준비 중…'; }
    var d = P.info; track('purchase_start', { product: productId });
    fetch('/api/commerce/order', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers()), body: JSON.stringify({ productId: productId, sd: safeSd(P.sd), label: who || null }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'order'); return j; }); })
      .then(function (o) {
        return (root.TossPayments ? Promise.resolve() : script(TOSS_SDK)).then(function () {
          var back = root.location.origin + root.location.pathname;
          var keep = new URLSearchParams(root.location.search); ['pay', 'paymentKey', 'orderId', 'amount', 'code', 'message', 'paymentType'].forEach(function (k) { keep.delete(k); });
          keep.set('pay', 'success'); var ok = back + '?' + keep.toString() + root.location.hash; keep.set('pay', 'fail'); var no = back + '?' + keep.toString() + root.location.hash;
          var pay = root.TossPayments(d.keys.tossClientKey).payment({ customerKey: o.customerKey });
          return pay.requestPayment({ method: 'CARD', amount: { currency: 'KRW', value: o.amount }, orderId: o.orderId, orderName: o.orderName, successUrl: ok, failUrl: no, card: { flowMode: 'DEFAULT' } });
        });
      })
      .catch(function (e) {
        if (btn) { btn.disabled = false; btn.textContent = '다시 시도'; }
        var m = { 'already-owned': '이미 구매한 상품입니다.', 'login-required': '로그인이 풀렸습니다. 다시 로그인해 주세요.', 'not-configured': '결제를 준비하고 있습니다.' }[e && e.message];
        if (e && e.code === 'USER_CANCEL') return;
        alert(m || '결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      });
  }

  // 결제창에서 돌아왔을 때: 성공이면 서버 승인 → 잠금 정보 다시 받기. 주소의 결제 값은 바로 지운다.
  function handleReturn() {
    var u = new URL(root.location.href), st = u.searchParams.get('pay'); if (!st) return Promise.resolve(null);
    var pk = u.searchParams.get('paymentKey'), oid = u.searchParams.get('orderId'), amt = u.searchParams.get('amount'), msg = u.searchParams.get('message');
    ['pay', 'paymentKey', 'orderId', 'amount', 'code', 'message', 'paymentType'].forEach(function (k) { u.searchParams.delete(k); });
    try { root.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } catch (e) { }
    if (st !== 'success' || !pk || !oid) { if (st === 'fail' && msg) toast('결제가 완료되지 않았습니다: ' + msg); return Promise.resolve(null); }
    return (P.loading || Promise.resolve()).then(function () { return P.token ? null : sbClient().then(function (sb) { return sb.auth.getSession(); }).then(function (r) { P.token = r && r.data && r.data.session && r.data.session.access_token || ''; }).catch(function () { }); })
      .then(function () { return fetch('/api/commerce/confirm', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers()), body: JSON.stringify({ paymentKey: pk, orderId: oid, amount: +amt }) }); })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (x.ok && x.j.ok) { track('purchase_done', { order: oid }); toast('구매가 완료되었습니다. 이어서 읽어 보세요.'); }
        else toast(x.j.error === 'grant-failed' ? '결제는 되었지만 열람 권한 기록에 실패했습니다. 문의해 주시면 바로 열어 드립니다(주문번호 ' + oid + ').' : '결제를 확인하지 못했습니다: ' + (x.j.message || x.j.error || ''));
        return refresh();
      }).catch(function () { toast('결제 확인 중 연결이 끊겼습니다. 새로고침하면 다시 확인합니다.'); });
  }
  function toast(t) { if (R.toast) { R.toast(t, 5000); return; } var el = document.createElement('div'); el.className = 'pw-toast'; el.textContent = t; document.body.appendChild(el); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5000); }

  (function css() {
    var s = document.createElement('style');
    s.textContent = '.pw-sheet{position:fixed;inset:0;z-index:9999;background:rgba(6,8,16,.62);display:flex;align-items:flex-end;justify-content:center;padding:16px}@media(min-width:640px){.pw-sheet{align-items:center}}' +
      '.pw-card{position:relative;width:min(440px,100%);max-height:88vh;overflow:auto;background:#141826;color:#F3EEDF;border:1px solid rgba(213,185,127,.35);border-radius:18px;padding:22px 20px 18px;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:inherit}' +
      '.pw-card h3{margin:4px 0 6px;font-size:1.12rem;line-height:1.45}.pw-k{margin:0;color:#D5B97F;font-size:.8rem;font-weight:700;letter-spacing:.04em}.pw-sub{margin:0 0 12px;color:#B9B3A4;font-size:.86rem}' +
      '.pw-x{position:absolute;top:8px;right:10px;border:0;background:none;color:#B9B3A4;font-size:1.6rem;cursor:pointer;line-height:1}.pw-note{color:#DCD5C4;font-size:.9rem;line-height:1.6}' +
      '.pw-login{display:grid;gap:8px;margin-top:10px}.pw-btn{border:0;border-radius:12px;padding:12px 14px;font:inherit;font-weight:700;cursor:pointer;background:#2A3047;color:#F3EEDF}.pw-btn[disabled]{opacity:.45;cursor:default}' +
      '.pw-kakao{background:#FEE500;color:#191600}.pw-google{background:#fff;color:#1f1f1f}.pw-buy{background:#C8442F;color:#fff;white-space:nowrap}' +
      '.pw-list{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}.pw-list li{display:flex;gap:10px;align-items:center;justify-content:space-between;background:rgba(255,255,255,.05);border-radius:12px;padding:10px 12px}.pw-list small{display:block;color:#B9B3A4;font-size:.76rem}' +
      '.pw-own{color:#7FD1A8;font-weight:700;font-size:.86rem}.pw-fine{margin:10px 0 0;color:#8F8A7E;font-size:.74rem;line-height:1.5}.pw-fine a,.pw-link{color:#D5B97F;background:none;border:0;padding:0;font:inherit;cursor:pointer;text-decoration:underline}' +
      '.pw-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10000;background:#141826;color:#F3EEDF;border-radius:12px;padding:12px 16px;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:90vw;font-size:.9rem}' +
      '.xp-lock{margin-left:6px;font-size:.8em;opacity:.8}';
    document.head.appendChild(s);
  })();

  R.Paywall = {
    TOPIC_WORLD: TOPIC_WORLD,
    // viewer 가 사주 데이터와 장 목록 읽는 함수를 넘긴다
    init: function (sd, opts) { P.sd = sd; opts = opts || {}; if (opts.chapters) P.chapters = opts.chapters; if (opts.onChange) P.onChange = opts.onChange; return refresh().then(handleReturn); },
    refresh: refresh, headers: headers, lockOf: lockOf, lockedIndex: lockedIndex, show: show, close: close, info: function () { return P.info; },
    _state: P,
  };
})(typeof window !== 'undefined' ? window : globalThis);
