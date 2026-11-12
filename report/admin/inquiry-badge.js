/* 관리자 화면 '새 1:1 문의' 표시(2026-11-13)
   로그인한 관리자 화면에서 2분마다 답변 대기 문의 수를 묻는다(GET /api/commerce/admin?inquiries=waiting).
   · 위 메뉴 '판매·타임라인'과 아래 메뉴 '결제·상품'에 빨간 숫자 배지
   · 이 화면을 연 뒤 새 문의가 들어오면 화면 아래에 알림 띠(누르면 결제·상품 → 1:1 문의로 이동)
   · 브라우저 탭 제목 앞에 (N)
   관리자 비밀번호는 index.html 이 이 탭 sessionStorage(mt_pw)에 둔 값을 쓴다. 로그인 전에는 아무것도 하지 않는다. */
(function () {
  'use strict';
  var EVERY = 120000, state = { waiting: 0, latest: 0, seenLatest: null }, title0 = document.title, timer = null;
  var pw = function () { try { return sessionStorage.getItem('mt_pw') || ''; } catch (e) { return ''; } };
  var css = document.createElement('style');
  css.textContent = '.inq-badge{display:inline-block;min-width:18px;margin-left:6px;padding:0 6px;border-radius:999px;background:#D0634A;color:#fff;font-size:11px;font-weight:700;line-height:18px;text-align:center;vertical-align:1px}' +
    '#inqToast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:3000;display:flex;gap:10px;align-items:center;max-width:calc(100% - 32px);padding:12px 16px;border-radius:12px;background:#2a1712;border:1px solid #D0634A;color:#fbe9e3;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.4)}' +
    '#inqToast button{font:inherit;font-size:13px;border-radius:8px;padding:6px 10px;cursor:pointer;border:1px solid #D0634A;background:#D0634A;color:#fff}#inqToast button.x{background:transparent;color:#fbe9e3}';
  document.head.appendChild(css);

  function mark(el, n) {
    if (!el) return; var b = el.querySelector('.inq-badge');
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'inq-badge'; el.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n); b.title = '답변 대기 1:1 문의 ' + n + '건'; b.setAttribute('aria-label', b.title);
  }
  function paint() {
    var n = state.waiting;
    mark(document.querySelector('#grpBar button[data-g="sell"]'), n);
    mark(document.querySelector('#subBar button[data-t="commerce"]'), n);
    document.title = (n ? '(' + n + ') ' : '') + title0.replace(/^\(\d+\+?\)\s*/, '');
  }
  function openInquiries() {
    var t = document.querySelector('#subBar button[data-t="commerce"]'); if (t) t.click();
    setTimeout(function () { var c = document.getElementById('cmInq'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 900);
  }
  function toast(n) {
    var old = document.getElementById('inqToast'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'inqToast'; el.setAttribute('role', 'status');
    el.innerHTML = '<span>새 1:1 문의가 왔습니다 · 답변 대기 <b>' + n + '</b>건</span><button type="button" class="go">보기</button><button type="button" class="x" aria-label="닫기">닫기</button>';
    el.querySelector('.go').onclick = function () { el.remove(); openInquiries(); };
    el.querySelector('.x').onclick = function () { el.remove(); };
    document.body.appendChild(el);
  }
  function check() {
    var p = pw(); if (!p || document.getElementById('app') && document.getElementById('app').classList.contains('hide')) return;
    fetch('/api/commerce/admin?inquiries=waiting', { headers: { authorization: 'Bearer ' + p }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        var first = state.seenLatest == null;
        state.waiting = +d.waiting || 0; state.latest = +d.latest || 0;
        if (!first && state.latest > state.seenLatest && state.waiting) toast(state.waiting);
        if (first || state.latest > state.seenLatest) state.seenLatest = state.latest;
        paint();
      }).catch(function () { });
  }
  // 메뉴 글자를 다시 쓰면(syncGroups) 배지가 지워지므로 메뉴가 바뀔 때마다 다시 붙인다
  function watch() {
    ['grpBar', 'subBar'].forEach(function (id) { var el = document.getElementById(id); if (el) new MutationObserver(function () { if (state.waiting) { var g = document.querySelector('#grpBar button[data-g="sell"]'), s = document.querySelector('#subBar button[data-t="commerce"]'); if ((g && !g.querySelector('.inq-badge')) || (s && !s.querySelector('.inq-badge'))) paint(); } }).observe(el, { childList: true, subtree: true, characterData: true }); });
  }
  // 결제·상품 화면에서 답변 완료를 누르면 바로 숫자를 줄인다(v2-commerce.js 가 보낸다)
  window.addEventListener('mantra:inquiry-change', function () { check(); });
  window.AdminInquiryBadge = { check: check, open: openInquiries };
  function start() { watch(); check(); timer = setInterval(check, EVERY); document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); }); }
  // 로그인 직후에도 바로 보이게: 로그인 상자가 사라지는 순간을 본다
  function boot() {
    start();
    var app = document.getElementById('app');
    if (app) new MutationObserver(function () { if (!app.classList.contains('hide')) check(); }).observe(app, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
