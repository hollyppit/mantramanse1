/* 통합 첫 화면 동작
   - 마지막 이용 서비스: 이 기기(localStorage 'mt_last_service' = deep|community)에만 기억. 자동 이동하지 않고 "바로 가기" 버튼과 표시만 보여 준다.
   - 커뮤니티 카드: 서버(/api/community/status)가 들어가도 된다고 하면 /community/ 로, 아니면 '준비 중' 시트(출시 알림 신청·초대 회원 입장)를 연다.
   - 출시 알림: /api/community/alert. 동의 문구가 바뀌면 CONSENT_VERSION 을 서버(functions/api/community/alert.js)와 함께 올린다.
   - 회원 확인: 심층 분석에서 로그인한 Supabase 세션(이 기기 localStorage 'sb-…-auth-token')의 토큰을 x-member-token 으로 보낸다. SDK 를 불러오지 않는다.
   - 벚꽃잎: 커뮤니티 카드 안 캔버스 1개, 화면에 보일 때만, 움직임 줄이기 설정이면 그리지 않는다. */
(function () {
  'use strict';
  var CONSENT_VERSION = 'launch-alert-2026-11-15';
  var LAST = 'mt_last_service';
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } };
  var track = function (name, props) { try { if (typeof window.gtag === 'function') window.gtag('event', name, props || {}); } catch (e) { } try { if (window.dataLayer) window.dataLayer.push(Object.assign({ event: name }, props || {})); } catch (e) { } };

  // ── 로그인 토큰(심층 분석에서 로그인한 세션). 만료됐으면 없는 것으로 본다.
  function memberToken() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (!/^sb-[\w-]+-auth-token$/.test(k)) continue;
        var s = JSON.parse(localStorage.getItem(k) || 'null'), t = s && (s.access_token || (s.currentSession && s.currentSession.access_token));
        var exp = s && (s.expires_at || (s.currentSession && s.currentSession.expires_at));
        if (t && (!exp || exp * 1000 > Date.now() + 30000)) return t;
      }
    } catch (e) { }
    return '';
  }
  function api(path, opt) {
    opt = opt || {}; var h = { 'content-type': 'application/json' }, tok = memberToken(); if (tok) h['x-member-token'] = tok;
    return fetch(path, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined, credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; }); })
      .catch(function () { return { _status: 0, error: '인터넷 연결을 확인해 주세요' }; });
  }

  // ── 마지막 이용 서비스
  var last = lsGet(LAST), status = null;
  function markLast() {
    var card = last === 'deep' ? $('#goDeep') : last === 'community' ? $('#goPlaza') : null;
    if (!card) return;
    card.querySelector('.last').hidden = false;
    var r = $('#resume'); r.hidden = false; document.body.classList.add('has-resume');
    r.textContent = (last === 'deep' ? '심층 분석' : '인연의 광장') + '으로 바로 가기 →';
    r.href = last === 'deep' ? '/report/' : '/community/';
    r.onclick = function (e) { track('gate_resume', { svc: last }); if (last === 'community') { e.preventDefault(); openCommunity(); } };
  }
  markLast();

  $('#goDeep').addEventListener('click', function () { lsSet(LAST, 'deep'); track('gate_select', { svc: 'deep' }); });
  $('#goPlaza').addEventListener('click', function (e) { e.preventDefault(); track('gate_select', { svc: 'community' }); openCommunity(); });

  var statusP = api('/api/community/status').then(function (d) { status = d && d.stage ? d : { stage: 'dev', label: '개발 중', inside: false }; if (status.inside) $('#plazaGo').textContent = '인연의 광장 들어가기 →'; return status; });

  function openCommunity() {
    statusP.then(function (s) {
      if (s.inside) { lsSet(LAST, 'community'); location.href = '/community/'; return; }
      showSoon(s);
    });
  }

  // ── 시트
  var sheet = $('#sheet'), body = $('#shBody'), lastFocus = null;
  function openSheet(html) { lastFocus = document.activeElement; body.innerHTML = html; sheet.hidden = false; document.body.style.overflow = 'hidden'; var f = sheet.querySelector('input, button.btn'); if (f) f.focus(); }
  function closeSheet() { sheet.hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  sheet.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  function showSoon(s) {
    var tok = memberToken();
    openSheet(
      '<span class="stage">' + esc(s.label || '개발 중') + '</span>' +
      '<h3 id="shTitle">인연의 광장을 준비하고 있습니다</h3>' +
      '<p>같은 일주를 타고난 사람들이 경험을 나누고, 사주로 이어지는 인연을 만나는 공간입니다. 문을 여는 날 가장 먼저 알려 드릴게요.</p>' +
      '<form id="alertForm" novalidate>' +
      (tok ? '<p class="sep">로그인한 계정의 이메일로 알려 드립니다.</p>' :
        '<label class="fld" for="alEmail">알림 받을 이메일</label><input type="email" id="alEmail" name="email" autocomplete="email" inputmode="email" placeholder="name@example.com" required>') +
      '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<dl class="notice" aria-label="출시 알림 개인정보 안내">' +
      '<dt>목적</dt><dd>인연의 광장 출시 소식 1회 안내</dd>' +
      '<dt>수집 항목</dt><dd>이메일 주소' + (tok ? '(로그인 계정)' : '') + ', 신청 일시</dd>' +
      '<dt>보유 기간</dt><dd>출시 알림 발송 또는 철회 시까지</dd>' +
      '<dt>철회 방법</dt><dd>확인 메일의 철회 버튼(로그인 회원은 이 화면에서도). 철회하면 바로 지웁니다</dd>' +
      '</dl>' +
      '<label class="agree"><input type="checkbox" id="alAgree"> <span>(필수) 출시 알림을 받기 위한 위 개인정보 수집·이용에 동의합니다.</span></label>' +
      '<p class="sep">이 알림은 광고성 정보 수신 동의와 별개이며, 동의하지 않으셔도 심층 분석은 그대로 이용하실 수 있습니다.</p>' +
      '<button class="btn" type="submit" id="alBtn" disabled>출시 알림 신청하기</button>' +
      '<div class="msg" id="alMsg" role="status" aria-live="polite"></div>' +
      '</form>' +
      (tok ? '<div class="invite"><p>베타 테스트에 초대받으셨나요?</p><button class="btn ghost" type="button" id="enterBtn">초대받은 계정으로 들어가기</button><p class="sep" id="mineLine"></p></div>'
        : '<div class="invite"><p>베타 테스트에 초대받으셨다면 심층 분석에서 먼저 로그인해 주세요.</p><a class="btn ghost" href="/report/#/me">로그인하러 가기</a></div>')
    );
    var agree = $('#alAgree'), btn = $('#alBtn'), msg = $('#alMsg');
    agree.onchange = function () { btn.disabled = !agree.checked; };
    $('#alertForm').onsubmit = function (e) {
      e.preventDefault(); if (!agree.checked) return;
      var em = $('#alEmail'), hp = sheet.querySelector('input[name=website]');
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) { msg.className = 'msg err'; msg.textContent = '이메일 형식을 확인해 주세요.'; em.focus(); return; }
      btn.disabled = true; msg.className = 'msg'; msg.textContent = '신청하고 있습니다…';
      api('/api/community/alert', { method: 'POST', body: { consent: true, consentVersion: CONSENT_VERSION, email: em ? em.value.trim() : undefined, source: 'gate', website: hp ? hp.value : '' } }).then(function (d) {
        if (d.ok) { msg.className = 'msg ok'; msg.textContent = '신청되었습니다. 확인 메일을 보내 드렸어요. 출시되면 가장 먼저 알려 드리겠습니다.'; track('community_alert_signup', { member: d.member ? 1 : 0 }); refreshMine(); }
        else { msg.className = 'msg err'; msg.textContent = d.error || '잠시 후 다시 시도해 주세요.'; btn.disabled = !agree.checked; }
      });
    };
    var enter = $('#enterBtn');
    if (enter) enter.onclick = function () {
      enter.disabled = true;
      api('/api/community/enter', { method: 'POST' }).then(function (d) {
        if (d.ok) { lsSet(LAST, 'community'); location.href = d.to || '/community/'; return; }
        if (d.need === 'consent') { showRequired(d.docs || []); return; }
        enter.disabled = false; msg.className = 'msg err';
        msg.textContent = d.need === 'login' ? '로그인이 만료되었습니다. 심층 분석에서 다시 로그인해 주세요.' : (d.error || '아직 초대되지 않은 계정입니다.');
      });
    };
    refreshMine();
  }
  // 필수 동의(인연의 광장 입장 조건): 두 항목을 각각 체크해야 버튼이 켜진다. 동의 기록은 서버(/api/account/consent)에 이력으로 남는다
  function showRequired(docs) {
    var link = { terms: '/report/legal/terms.html', privacy: '/report/legal/privacy.html' };
    openSheet('<h3 id="shTitle">인연의 광장 이용 동의</h3><p class="lead">처음 들어가실 때 한 번만 여쭙니다. 두 항목 모두 필수이며, 광고성 정보 수신은 마이페이지에서 따로 고르실 수 있습니다(기본은 받지 않음).</p>' +
      '<form id="reqForm">' + docs.map(function (d) { return '<label class="agree"><input type="checkbox" data-kind="' + esc(d.kind) + '" data-ver="' + esc(d.version) + '"><span>[필수] ' + esc(d.title) + '에 동의합니다 · <a href="' + (link[d.kind] || '#') + '" target="_blank" rel="noopener">전문 보기</a></span></label>'; }).join('') +
      '<button class="btn" type="submit" disabled>동의하고 들어가기</button><p class="msg" id="reqMsg" role="status"></p></form>');
    var form = $('#reqForm'), boxes = form.querySelectorAll('input[type=checkbox]'), btn = form.querySelector('.btn'), m = $('#reqMsg');
    var all = function () { return [].every.call(boxes, function (b) { return b.checked; }); };
    form.onchange = function () { btn.disabled = !all(); };
    form.onsubmit = function (e) {
      e.preventDefault(); if (!all()) return; btn.disabled = true; m.className = 'msg'; m.textContent = '저장하는 중입니다…';
      var changes = {}, versions = {}; [].forEach.call(boxes, function (b) { changes[b.dataset.kind] = true; versions[b.dataset.kind] = b.dataset.ver; });
      api('/api/account/consent', { method: 'POST', body: { action: 'set', changes: changes, versions: versions, via: 'gate' } }).then(function (d) {
        if (!d.ok) { btn.disabled = false; m.className = 'msg err'; m.textContent = d._status === 401 ? '로그인이 만료되었습니다. 심층 분석에서 다시 로그인해 주세요.' : (d.error || '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'); return; }
        track('community_consent', { via: 'gate' });
        return api('/api/community/enter', { method: 'POST' }).then(function (x) {
          if (x.ok) { lsSet(LAST, 'community'); location.href = x.to || '/community/'; return; }
          btn.disabled = false; m.className = 'msg err'; m.textContent = x.error || '아직 초대되지 않은 계정입니다.';
        });
      });
    };
  }
  // 로그인 회원: 이미 신청했는지 보여 주고 철회 버튼 제공
  function refreshMine() {
    var line = $('#mineLine'); if (!line || !memberToken()) return;
    api('/api/community/alert', { method: 'POST', body: { action: 'mine' } }).then(function (d) {
      if (!d.subscribed) { line.textContent = ''; return; }
      line.innerHTML = esc(d.email || '') + ' 로 출시 알림을 신청해 두셨습니다. <a href="#" id="mineOff">알림 철회하기</a>';
      $('#mineOff').onclick = function (e) { e.preventDefault(); api('/api/community/alert', { method: 'POST', body: { action: 'revoke' } }).then(function (r) { line.textContent = r.ok ? '출시 알림을 철회했습니다.' : (r.error || '잠시 후 다시 시도해 주세요.'); }); };
    });
  }

  // ── 메일 속 철회 링크(?alert=revoke&t=…): 링크를 여는 것만으로는 철회하지 않고(메일 보안 검사기가 링크를 미리 열 수 있다) 버튼을 눌러야 한다
  function showRevoke(token) {
    openSheet('<h3 id="shTitle">출시 알림 철회</h3><p>인연의 광장 출시 알림을 더 이상 받지 않으시겠어요? 철회하면 출시 소식을 보내 드리지 않습니다.</p>' +
      '<button class="btn" type="button" id="rvBtn">출시 알림 철회하기</button><div class="msg" id="rvMsg" role="status" aria-live="polite"></div>');
    $('#rvBtn').onclick = function () {
      var b = $('#rvBtn'), m = $('#rvMsg'); b.disabled = true;
      api('/api/community/alert', { method: 'POST', body: { action: 'revoke', token: token } }).then(function (d) { m.className = 'msg ' + (d.ok ? 'ok' : 'err'); m.textContent = d.ok ? '철회되었습니다. 그동안 관심 가져 주셔서 감사합니다.' : (d.error || '잠시 후 다시 시도해 주세요.'); if (!d.ok) b.disabled = false; });
    };
  }
  var qs = new URLSearchParams(location.search);
  if (qs.get('alert') === 'revoke' && /^[0-9a-f]{48}$/.test(qs.get('t') || '')) { showRevoke(qs.get('t')); history.replaceState(null, '', location.pathname); }
  else if (qs.get('community') === 'closed') { statusP.then(showSoon); history.replaceState(null, '', location.pathname); }

  // ── 벚꽃잎(커뮤니티 카드 안에서만, 은은하게)
  var cv = $('#petals');
  if (cv && !REDUCE && cv.getContext) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), petals = [], visible = true, raf = 0, prev = 0;
    var resize = function () { var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    var count = function () { return Math.round(Math.min(26, Math.max(10, W * H / 26000))); };
    var make = function (top) { return { x: Math.random() * W, y: top ? -20 - Math.random() * H * .3 : Math.random() * H, s: 5 + Math.random() * 6, vy: 14 + Math.random() * 18, vx: 6 + Math.random() * 10, r: Math.random() * 6.28, vr: (Math.random() - .5) * 1.6, ph: Math.random() * 6.28, a: .45 + Math.random() * .4 }; };
    var draw = function (p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = p.a;
      ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.bezierCurveTo(p.s * .9, -p.s * .7, p.s * .7, p.s * .6, 0, p.s); ctx.bezierCurveTo(-p.s * .7, p.s * .6, -p.s * .9, -p.s * .7, 0, -p.s);
      ctx.fillStyle = '#EDBFC6'; ctx.fill(); ctx.globalAlpha = p.a * .5; ctx.fillStyle = '#F8E1E4'; ctx.beginPath(); ctx.ellipse(0, -p.s * .2, p.s * .25, p.s * .5, 0, 0, 6.28); ctx.fill(); ctx.restore();
    };
    var tick = function (t) {
      raf = 0; if (!visible) return;
      var dt = Math.min(.05, (t - (prev || t)) / 1000); prev = t;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < petals.length; i++) { var p = petals[i]; p.ph += dt; p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.ph) * 8) * dt; p.r += p.vr * dt; if (p.y > H + 20 || p.x > W + 20) petals[i] = make(true); draw(p); }
      raf = requestAnimationFrame(tick);
    };
    var start = function () { if (!raf && visible) { prev = 0; raf = requestAnimationFrame(tick); } };
    resize(); for (var i = 0; i < count(); i++) petals.push(make(false));
    window.addEventListener('resize', function () { resize(); var n = count(); while (petals.length < n) petals.push(make(false)); petals.length = n; });
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !document.hidden; start(); }, { threshold: 0.05 }).observe(cv);
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; start(); });
    start();
  }
  track('gate_view', { last: last || '' });
})();
