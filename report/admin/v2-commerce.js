/* 관리자 '결제·상품' 화면: 상품 이름·가격·판매 여부, 세계 유료 여부 안내, 최근 주문(취소·권한 다시 주기), 무료 사용자로 보기.
   서버: /api/commerce/admin (functions/api/commerce/admin.js). 잠금 규칙은 functions/_commerce.js 한 곳에 있다.
   '무료 사용자로 보기'는 이 브라우저에만 저장(localStorage mt_view_as_free)하고, 무빙툰 화면이 관리자 요청에 x-view-as: free 를 붙인다. */
(function () {
  'use strict';
  var pw = '', root = null, S = { data: null, msg: '', err: false };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var won = function (n) { return (+n || 0).toLocaleString('ko-KR') + '원'; };
  var who = function () { try { return localStorage.getItem('iching_reviewer') || ''; } catch (e) { return ''; } };
  var STATUS = { pending: '결제 대기', paid: '결제 완료', failed: '실패', canceled: '취소', partial_canceled: '부분 취소' };
  function api(method, body) {
    return fetch('/api/commerce/admin', { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who()) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || ('오류 ' + r.status)); return d; }); });
  }
  function viewAsFree() { try { return localStorage.getItem('mt_view_as_free') === '1'; } catch (e) { return false; } }
  function draw() {
    if (!root) return;
    var d = S.data;
    if (!d) { root.innerHTML = '<div class="card"><p class="muted">불러오는 중…</p></div>'; return; }
    var cf = d.configured || {}, paidWorlds = Object.keys(d.worlds || {}).filter(function (k) { return d.worlds[k].paid; });
    var cfRow = function (on, label, hint) { return '<li>' + (on ? '✅' : '⬜') + ' ' + label + (on ? '' : ' <span class="muted">— ' + hint + '</span>') + '</li>'; };
    var html = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">결제 준비 상태</h3><ul style="margin:0;padding-left:18px;line-height:1.8">' +
      cfRow(cf.supabase, '회원·주문 저장소(Supabase)', 'Cloudflare 환경변수 SUPABASE_URL·SUPABASE_SERVICE_KEY') +
      cfRow(cf.anon, '로그인(Supabase 공개 키)', '환경변수 SUPABASE_ANON_KEY') +
      '<li><b>지금 쓰는 결제사: ' + (cf.provider === 'portone' ? '포트원' : cf.provider === 'toss' ? '토스페이먼츠' : '없음(결제 준비 중)') + '</b> <span class="muted">— 포트원 값 3개가 다 있으면 포트원, 아니면 토스. 환경변수 PAY_PROVIDER=portone|toss 로 고정 가능</span></li>' +
      cfRow(cf.portoneStore, '포트원 상점 ID', '환경변수 PORTONE_STORE_ID') +
      cfRow(cf.portoneChannel, '포트원 채널 키(결제대행사)', '환경변수 PORTONE_CHANNEL_KEY') +
      cfRow(cf.portoneSecret, '포트원 API 시크릿(서버 전용)', '환경변수 PORTONE_API_SECRET') +
      cfRow(cf.portoneWebhook, '포트원 웹훅 서명 확인(선택)', '환경변수 PORTONE_WEBHOOK_SECRET') +
      cfRow(cf.toss, '토스 시크릿 키(이전 결제 취소용)', '환경변수 TOSS_SECRET_KEY') +
      cfRow(cf.tossClient, '토스 클라이언트 키', '환경변수 TOSS_CLIENT_KEY') + '</ul>' +
      '<p class="muted" style="margin:8px 0 0">유료 세계: <b>' + (paidWorlds.length ? paidWorlds.map(function (k) { return esc(d.worlds[k].name || k); }).join(' · ') : '없음') + '</b> — 세계를 유료로 바꾸는 곳은 <b>주제·표지 설정</b>의 "이용 권한"입니다. 유료 세계가 없으면 아무것도 잠기지 않습니다. 유료 세계는 첫 장만 무료로 보입니다.</p></div>';
    html += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">상품과 가격</h3><p class="muted" style="margin:0 0 8px">가격이 0원이면 판매하지 않습니다. 가격을 바꿔도 이미 끝난 주문에는 영향이 없습니다. 전체 열기는 구매 시점의 유료 세계만 엽니다.</p>' +
      '<table class="tbl" style="width:100%"><thead><tr><th>상품</th><th>이름</th><th>가격(원)</th><th>판매</th></tr></thead><tbody>' +
      (d.products || []).map(function (p, i) { return '<tr><td class="muted">' + esc(p.id === 'bundle' ? '전체 열기(묶음)' : p.id) + '</td><td><input type="text" data-p="name" data-i="' + i + '" value="' + esc(p.name) + '" maxlength="40" style="width:100%"></td><td><input data-p="price" data-i="' + i + '" type="number" min="0" step="100" value="' + p.price + '" style="width:120px"></td><td><input data-p="active" data-i="' + i + '" type="checkbox"' + (p.active ? ' checked' : '') + '></td></tr>'; }).join('') +
      '</tbody></table><div class="row" style="margin-top:8px"><button class="btn" id="cmSave">상품 저장</button></div></div>';
    html += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">무료 사용자로 보기</h3><p class="muted" style="margin:0 0 8px">관리자는 잠금 없이 모든 장을 봅니다. 켜면 이 브라우저에서 무빙툰을 무료 사용자처럼 봐서, 어디까지 보이는지 확인할 수 있습니다.</p>' +
      '<button class="btn" id="cmView">' + (viewAsFree() ? '무료 사용자로 보기 끄기 (지금 켜짐)' : '무료 사용자로 보기 켜기') + '</button></div>';
    var orders = d.orders || [];
    var sw = d.sweep, swText = sw && (sw.expired || sw.paid) ? '<p class="muted" style="margin:0 0 8px">방금 30분 넘은 결제 대기 주문을 정리했습니다: 만료 ' + sw.expired + '건' + (sw.paid ? ', 뒤늦게 결제가 확인되어 완료 처리 ' + sw.paid + '건' : '') + '</p>' : '';
    html += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">최근 주문 ' + orders.length + '건</h3>' + swText + (d.ordersError ? '<p class="err">주문을 불러오지 못했습니다(저장소 연결 확인)</p>' : '') +
      (orders.length ? '<table class="tbl" style="width:100%;font-size:.86rem"><thead><tr><th>주문 시각</th><th>상품</th><th>금액</th><th>상태</th><th>주문번호</th><th></th></tr></thead><tbody>' + orders.map(function (o) {
        var act = o.status === 'paid' ? '<button class="btn" data-cancel="' + esc(o.order_id) + '">결제 취소</button> <button class="btn" data-regrant="' + esc(o.order_id) + '">권한 다시 주기</button>' : '';
        return '<tr><td>' + esc((o.created_at || '').slice(0, 16).replace('T', ' ')) + '</td><td>' + esc(o.product_name) + (o.saju_label ? ' <span class="muted">' + esc(o.saju_label) + '</span>' : '') + '</td><td>' + won(o.amount) + '</td><td>' + (o.status === 'failed' && o.failure === 'expired' ? '만료 <span class="muted">결제 안 함(30분 경과)</span>' : esc(STATUS[o.status] || o.status) + (o.failure ? ' <span class="muted">' + esc(o.failure) + '</span>' : '')) + (o.cancel_reason ? ' <span class="muted">' + esc(o.cancel_reason) + '</span>' : '') + '</td><td class="muted" style="font-size:.76rem">' + esc(o.order_id) + '</td><td>' + act + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">아직 주문이 없습니다.</p>') + '</div>';
    if (S.msg) html = '<p class="' + (S.err ? 'err' : 'ok') + '" style="margin:0 0 8px">' + esc(S.msg) + '</p>' + html;
    root.innerHTML = html;
    root.querySelector('#cmSave').onclick = save;
    root.querySelector('#cmView').onclick = function () { try { localStorage.setItem('mt_view_as_free', viewAsFree() ? '0' : '1'); } catch (e) { } msg(viewAsFree() ? '무료 사용자로 보기를 켰습니다. 무빙툰을 새로 열면 적용됩니다.' : '무료 사용자로 보기를 껐습니다.'); };
    root.querySelectorAll('[data-cancel]').forEach(function (b) { b.onclick = function () { var reason = prompt('취소 사유(고객에게 보이지 않음)', '고객 요청 환불'); if (reason == null) return; if (!confirm('이 주문을 전액 취소하고 열람 권한을 회수합니다. 되돌릴 수 없습니다. 계속할까요?')) return; post({ action: 'cancel', orderId: b.dataset.cancel, reason: reason }, '취소했습니다'); }; });
    root.querySelectorAll('[data-regrant]').forEach(function (b) { b.onclick = function () { post({ action: 'regrant', orderId: b.dataset.regrant }, '권한을 다시 넣었습니다'); }; });
  }
  function msg(t, err) { S.msg = t; S.err = !!err; draw(); }
  function save() {
    var list = (S.data.products || []).map(function (p, i) {
      var g = function (k) { return root.querySelector('[data-p="' + k + '"][data-i="' + i + '"]'); };
      return { id: p.id, name: g('name').value, price: Math.max(0, Math.round(+g('price').value || 0)), active: g('active').checked };
    });
    api('PUT', { products: list }).then(function (d) { S.data.products = d.products; msg('상품을 저장했습니다(약 1분 안에 반영)'); }).catch(function (e) { msg(e.message, true); });
  }
  function post(body, done) { api('POST', body).then(function () { msg(done); load(); }).catch(function (e) { msg(e.message, true); }); }
  function load() { api('GET').then(function (d) { S.data = d; draw(); }).catch(function (e) { S.data = { products: [], worlds: {}, orders: [], configured: {} }; msg('불러오지 못했습니다: ' + e.message, true); }); }
  window.V2Commerce = { open: function (password) { pw = password; root = document.getElementById('t-commerce'); if (!root) return; S.msg = ''; draw(); load(); } };
})();
