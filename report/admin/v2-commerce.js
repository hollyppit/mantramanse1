/* 관리자 '결제·상품' 화면: 상품 이름·가격·판매 여부, 세계 유료 여부 안내, 최근 주문(취소·권한 다시 주기), 무료 사용자로 보기.
   서버: /api/commerce/admin (functions/api/commerce/admin.js). 잠금 규칙은 functions/_commerce.js 한 곳에 있다.
   '무료 사용자로 보기'는 이 브라우저에만 저장(localStorage mt_view_as_free)하고, 무빙툰 화면이 관리자 요청에 x-view-as: free 를 붙인다. */
(function () {
  'use strict';
  var pw = '', root = null, S = { data: null, msg: '', err: false };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var won = function (n) { return (+n || 0).toLocaleString('ko-KR') + '원'; };
  var who = function () { try { return localStorage.getItem('iching_reviewer') || ''; } catch (e) { return ''; } };
  var INQ_CAT = { payment: '결제', refund: '환불', content: '풀이·콘텐츠', account: '계정·로그인', etc: '기타' }, INQ_ST = { received: '답변 대기', answered: '답변 완료', closed: '종료' };
  var kstAt = function (t) { if (!t) return ''; var d = new Date(Date.parse(t) + 9 * 3600000); return isNaN(d) ? '' : d.toISOString().slice(0, 16).replace('T', ' '); };   // 한국 시간
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
    // 판매 준비 점검(실판매 전환 체크리스트): 서버가 실제 신호(마지막 결제의 채널 종류·웹훅 수신 등)로 판단한다
    var rd = d.readiness || [], rdIcon = function (ok) { return ok === true ? '✅' : ok === false ? '⚠️' : '⬜'; };
    var rdDone = rd.filter(function (x) { return x.ok === true; }).length;
    var readyHtml = rd.length ? '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">판매 준비 점검 <span class="muted" style="font-size:.85rem">' + rdDone + ' / ' + rd.length + '</span></h3><p class="muted" style="margin:0 0 8px">실제 판매를 시작하기 전에 모두 ✅ 가 되는지 확인하세요. ⬜ 는 아직 확인할 신호가 없는 항목입니다.</p><ul style="margin:0;padding-left:4px;list-style:none;line-height:1.7">' +
      rd.map(function (x) { return '<li>' + rdIcon(x.ok) + ' <b>' + esc(x.label) + '</b> <span class="muted">— ' + esc(x.note || '') + '</span></li>'; }).join('') + '</ul></div>' : '';
    // 매출 요약(테스트 주문 제외, 한국 시간) + 기간 CSV 내려받기(부가세 신고·정산 대조용)
    var sl = d.sales, salesHtml = '';
    if (sl) {
      var col = function (s) {
        var prods = Object.keys(s.products || {}).map(function (k) { var p = s.products[k]; return esc(p.name) + ' ' + p.count + '건'; }).join(' · ');
        return '<td style="vertical-align:top"><div class="muted" style="font-size:.82rem">' + esc(s.label) + '</div><div style="font-size:1.25rem;font-weight:700">' + won(s.net) + '</div>' +
          '<div class="muted" style="font-size:.8rem;line-height:1.5">매출 ' + won(s.gross) + ' (' + s.orders + '건)<br>환불 ' + won(s.refundAmount) + ' (' + s.refunds + '건)' + (prods ? '<br>' + prods : '') + '</div></td>';
      };
      salesHtml = '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">매출 요약 <span class="muted" style="font-size:.85rem">실매출 = 매출 − 환불 · 테스트 주문 제외 · 한국 시간</span></h3>' +
        '<table style="width:100%;table-layout:fixed"><tr>' + col(sl.today) + col(sl.week) + col(sl.month) + '</tr></table>' +
        '<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap;align-items:center"><span class="muted">CSV 내려받기</span><input type="date" id="cmFrom" value="' + esc(S.from) + '"> ~ <input type="date" id="cmTo" value="' + esc(S.to) + '">' +
        '<label class="muted" style="font-size:.85rem"><input type="checkbox" id="cmWithTest"> 테스트 포함</label><button class="btn" id="cmCsv">CSV 내려받기</button></div>' +
        '<p class="muted" style="margin:6px 0 0;font-size:.82rem">그 기간에 결제되었거나 환불된 주문. 공급가액 = 금액 ÷ 1.1(반올림), 부가세 = 나머지. 엑셀에서 바로 열립니다.</p></div>';
    }
    // 구매 전환(최근 14일, 방문자 = 브라우저 수): 단계별 인원과 바로 앞 단계 대비 비율, 날짜별 표
    var fn = d.funnel, funnelHtml = '';
    if (fn && fn.steps) {
      var pct = function (a, b) { return b ? Math.round(a / b * 1000) / 10 + '%' : '-'; };
      var tot = fn.total.steps, prev = null;
      var rows = fn.steps.map(function (s) {
        var n = tot[s], r = '<tr><td>' + esc(fn.labels[s] || s) + '</td><td style="text-align:right"><b>' + n.toLocaleString('ko-KR') + '</b></td><td class="muted" style="text-align:right">' + (prev == null ? '' : pct(n, tot[prev])) + '</td><td class="muted" style="text-align:right">' + (s === 'read' ? '' : pct(n, tot.read)) + '</td></tr>';
        prev = s; return r;
      }).join('');
      var dayRows = fn.days.map(function (x) {
        return '<tr><td>' + esc(x.day.slice(5)) + '</td>' + fn.steps.map(function (s) { return '<td style="text-align:right">' + (x.steps[s] || '<span class="muted">0</span>') + '</td>'; }).join('') + '<td style="text-align:right">' + x.orders + '</td><td style="text-align:right">' + x.paidOrders + '</td></tr>';
      }).join('');
      funnelHtml = '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">구매 전환 <span class="muted" style="font-size:.85rem">최근 14일 · ' + esc(fn.from) + ' ~ ' + esc(fn.to) + ' · 한국 시간</span></h3>' +
        '<p class="muted" style="margin:0 0 8px;font-size:.84rem">숫자는 그날 그 단계까지 온 브라우저 수(같은 날 여러 번 해도 한 번). 관리자 브라우저·미리보기는 세지 않습니다. 가장 크게 줄어드는 단계가 손볼 곳입니다.</p>' +
        '<table class="tbl" style="width:100%;font-size:.88rem"><thead><tr><th>단계</th><th style="text-align:right">인원</th><th style="text-align:right">앞 단계 대비</th><th style="text-align:right">읽은 사람 대비</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p class="muted" style="margin:8px 0 0;font-size:.84rem">주문표 기준(테스트 제외): 주문 생성 <b>' + fn.total.orders + '</b>건 · 결제 완료 <b>' + fn.total.paidOrders + '</b>건</p>' +
        '<details style="margin-top:8px"><summary class="muted">날짜별 보기</summary><div style="overflow-x:auto"><table class="tbl" style="width:100%;font-size:.8rem;margin-top:6px"><thead><tr><th>날짜</th>' + fn.steps.map(function (s) { return '<th style="text-align:right">' + esc(fn.labels[s] || s) + '</th>'; }).join('') + '<th style="text-align:right">주문</th><th style="text-align:right">결제</th></tr></thead><tbody>' + dayRows + '</tbody></table></div></details></div>';
    }
    // 1:1 문의(마이페이지): 답변은 알림 메일에 답장해서 보내고, 여기서는 '답변 완료'로 표시만 한다(회원 마이페이지 문의 내역에 보인다)
    var iq = d.inquiries, inqHtml = '';
    if (iq) {
      var waiting = iq.filter(function (q) { return q.status === 'received'; });
      var list = S.inqAll ? iq : waiting;
      inqHtml = '<div class="card" style="margin-top:12px" id="cmInq"><h3 style="margin:0 0 6px;color:var(--gold)">1:1 문의 <span class="muted" style="font-size:.85rem">답변 대기 ' + waiting.length + '건 · 최근 ' + iq.length + '건</span></h3>' +
        '<p class="muted" style="margin:0 0 8px;font-size:.84rem">아래 칸에 답변을 쓰고 <b>답변 보내기</b>를 누르면 회원에게 메일로 가고, 회원 마이페이지 문의 내역에도 답변이 보입니다. 메일 앱으로 직접 답장한 경우에는 내용이 남지 않으니 <b>답변 완료</b>만 눌러 주세요.</p>' +
        '<label class="muted" style="font-size:.85rem"><input type="checkbox" id="cmInqAll"' + (S.inqAll ? ' checked' : '') + '> 답변 완료·종료도 보기</label>' +
        (list.length ? '<div style="display:grid;gap:8px;margin-top:8px">' + list.map(function (q) {
          var st = q.status, color = st === 'received' ? '#E8B04B' : st === 'answered' ? '#7FD1A8' : 'var(--muted, #999)';
          var ansHtml = q.answer ? '<div style="margin:6px 0;padding:8px 10px;border-left:3px solid #7FD1A8;background:rgba(127,209,168,.08);border-radius:6px"><div class="muted" style="font-size:.8rem">보낸 답변' + (q.answered_by ? ' · ' + esc(q.answered_by) : '') + (q.answered_at ? ' · ' + esc(kstAt(q.answered_at)) : '') + (q.answer_mailed ? ' · 메일 보냄' : ' · <span style="color:#E8B04B">메일 발송 안 됨</span>') + '</div><div style="white-space:pre-wrap">' + esc(q.answer) + '</div></div>' : '';
          var form = st !== 'closed' ? '<textarea data-ans="' + q.id + '" rows="4" maxlength="4000" placeholder="' + (q.answer ? '답변을 고쳐 다시 보내려면 여기에 쓰세요' : '회원에게 보낼 답변') + '" style="width:100%;box-sizing:border-box;margin:6px 0">' + '</textarea><div class="row" style="gap:6px;margin-bottom:6px"><button class="btn" data-ans-send="' + q.id + '">' + (q.answer ? '답변 다시 보내기' : '답변 보내기') + '</button></div>' : '';
          var acts = st === 'received' ? '<button class="btn" data-inq="' + q.id + '" data-st="answered">답변 완료</button> <button class="btn" data-inq="' + q.id + '" data-st="closed">종료(답변 없이)</button>'
            : '<button class="btn" data-inq="' + q.id + '" data-st="received">답변 대기로 되돌리기</button>' + (st === 'answered' ? ' <button class="btn" data-inq="' + q.id + '" data-st="closed">종료</button>' : '');
          var mailto = 'mailto:' + encodeURIComponent(q.email || '') + '?subject=' + encodeURIComponent('Re: [1:1 문의 #' + q.id + '] ' + (q.subject || ''));
          return '<details style="border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 12px"' + (st === 'received' ? ' open' : '') + '><summary style="cursor:pointer"><b>#' + q.id + ' ' + esc(q.subject) + '</b> <span style="color:' + color + ';font-size:.85rem">· ' + esc(INQ_ST[st] || st) + '</span> <span class="muted" style="font-size:.82rem">' + esc(INQ_CAT[q.category] || q.category) + ' · ' + esc(kstAt(q.created_at)) + '</span></summary>' +
            '<div style="margin-top:8px;font-size:.88rem;line-height:1.6"><div class="muted">회원 ' + esc(q.email) + (q.order_id ? ' · 주문 ' + esc(q.order_id) : '') + (q.mailed ? '' : ' · <span style="color:#E8B04B">알림 메일 발송 실패</span>') + (q.answered_at ? ' · 답변 ' + esc(kstAt(q.answered_at)) : '') + '</div>' +
            '<div style="white-space:pre-wrap;margin:6px 0;padding:8px 10px;background:rgba(0,0,0,.25);border-radius:8px">' + esc(q.body) + '</div>' + ansHtml + form +
            '<div class="row" style="gap:6px;flex-wrap:wrap">' + acts + ' <a class="btn" href="' + esc(mailto) + '">메일로 답장 쓰기</a></div></div></details>';
        }).join('') + '</div>' : '<p class="muted" style="margin:8px 0 0">' + (S.inqAll ? '문의가 없습니다.' : '답변을 기다리는 문의가 없습니다.') + '</p>') + '</div>';
    }
    var html = readyHtml + inqHtml + salesHtml + funnelHtml +'<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">결제 준비 상태</h3><ul style="margin:0;padding-left:18px;line-height:1.8">' +
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
        // 환불 판단(환불정책: 7일 이내·유료 장 미열람이면 전액): 결제 완료 주문에만
        var days = o.paid_at ? (Date.now() - Date.parse(o.paid_at)) / 86400000 : 0;
        var refund = o.status !== 'paid' ? '' : o.viewed_at ? ' <span class="muted">· 열람함(' + esc(String(o.viewed_at).slice(5, 16).replace('T', ' ')) + ') 환불 제한</span>' : days > 7 ? ' <span class="muted">· 7일 지남</span>' : ' <span style="color:#7FD1A8">· 환불 가능(미열람·7일 이내)</span>';
        var act = o.status === 'paid' ? '<button class="btn" data-cancel="' + esc(o.order_id) + '">결제 취소</button> <button class="btn" data-regrant="' + esc(o.order_id) + '">권한 다시 주기</button>' : '';
        if (o.status === 'paid' || o.status === 'canceled' || o.status === 'partial_canceled') act += ' <button class="btn" data-test="' + esc(o.order_id) + '" data-on="' + (o.is_test ? '0' : '1') + '">' + (o.is_test ? '테스트 해제' : '테스트로 표시') + '</button>';
        if (o.is_test) refund += ' <span style="color:#E8B04B">· 테스트(매출 제외)</span>';
        return '<tr><td>' + esc((o.created_at || '').slice(0, 16).replace('T', ' ')) + '</td><td>' + esc(o.product_name) + (o.saju_label ? ' <span class="muted">' + esc(o.saju_label) + '</span>' : '') + '</td><td>' + won(o.amount) + '</td><td>' + (o.status === 'failed' && o.failure === 'expired' ? '만료 <span class="muted">결제 안 함(30분 경과)</span>' : esc(STATUS[o.status] || o.status) + (o.failure ? ' <span class="muted">' + esc(o.failure) + '</span>' : '')) + (o.cancel_reason ? ' <span class="muted">' + esc(o.cancel_reason) + '</span>' : '') + refund + '</td><td class="muted" style="font-size:.76rem">' + esc(o.order_id) + '</td><td>' + act + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">아직 주문이 없습니다.</p>') + '</div>';
    if (S.msg) html = '<p class="' + (S.err ? 'err' : 'ok') + '" style="margin:0 0 8px">' + esc(S.msg) + '</p>' + html;
    root.innerHTML = html;
    root.querySelector('#cmSave').onclick = save;
    root.querySelector('#cmView').onclick = function () { try { localStorage.setItem('mt_view_as_free', viewAsFree() ? '0' : '1'); } catch (e) { } msg(viewAsFree() ? '무료 사용자로 보기를 켰습니다. 무빙툰을 새로 열면 적용됩니다.' : '무료 사용자로 보기를 껐습니다.'); };
    root.querySelectorAll('[data-cancel]').forEach(function (b) { b.onclick = function () { var reason = prompt('취소 사유(고객에게 보이지 않음)', '고객 요청 환불'); if (reason == null) return; if (!confirm('이 주문을 전액 취소하고 열람 권한을 회수합니다. 되돌릴 수 없습니다. 계속할까요?')) return; post({ action: 'cancel', orderId: b.dataset.cancel, reason: reason }, '취소했습니다'); }; });
    root.querySelectorAll('[data-regrant]').forEach(function (b) { b.onclick = function () { post({ action: 'regrant', orderId: b.dataset.regrant }, '권한을 다시 넣었습니다'); }; });
    root.querySelectorAll('[data-test]').forEach(function (b) { b.onclick = function () { var on = b.dataset.on === '1'; post({ action: 'set-test', orderId: b.dataset.test, isTest: on }, on ? '테스트 주문으로 표시했습니다(매출에서 빠집니다)' : '테스트 표시를 해제했습니다(매출에 들어갑니다)'); }; });
    var csvBtn = root.querySelector('#cmCsv'); if (csvBtn) csvBtn.onclick = downloadCsv;
    var inqAll = root.querySelector('#cmInqAll'); if (inqAll) inqAll.onchange = function () { S.inqAll = inqAll.checked; draw(); };
    root.querySelectorAll('[data-ans-send]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.dataset.ansSend, ta = root.querySelector('[data-ans="' + id + '"]'), text = (ta && ta.value || '').trim();
        if (text.length < 2) { msg('답변 내용을 적어 주세요', true); if (ta) ta.focus(); return; }
        var q = (S.data.inquiries || []).filter(function (x) { return x.id === id; })[0];
        if (!confirm('#' + id + ' 문의에 이 답변을 ' + (q && q.email ? q.email + '(으)로 ' : '') + '메일로 보냅니다. 계속할까요?')) return;
        b.disabled = true; b.textContent = '보내는 중…';
        api('POST', { action: 'inquiry-answer', id: id, answer: text }).then(function (r) {
          (S.data.inquiries || []).forEach(function (x, i) { if (x.id === id) S.data.inquiries[i] = Object.assign({}, x, r.inquiry); });
          try { window.dispatchEvent(new CustomEvent('mantra:inquiry-change')); } catch (e) { }
          msg('#' + id + ' 답변을 저장했습니다' + (r.mailed ? '. 회원에게 메일을 보냈습니다.' : '. 메일은 보내지 못했습니다(메일 설정·회원 이메일 확인). 마이페이지에는 보입니다.'), !r.mailed);
        }).catch(function (e) { b.disabled = false; b.textContent = '답변 보내기'; msg(e.message, true); });
      };
    });
    root.querySelectorAll('[data-inq]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.dataset.inq, st = b.dataset.st; b.disabled = true;
        api('POST', { action: 'inquiry-status', id: id, status: st }).then(function (r) {
          (S.data.inquiries || []).forEach(function (q) { if (q.id === id) { q.status = r.inquiry.status; q.answered_at = r.inquiry.answered_at; } });
          msg('#' + id + ' 문의를 ' + (INQ_ST[st] || st) + '로 바꿨습니다'); try { window.dispatchEvent(new CustomEvent('mantra:inquiry-change')); } catch (e) { }
        }).catch(function (e) { b.disabled = false; msg(e.message, true); });
      };
    });
  }
  // 오늘(한국 시간)·이번 달 1일
  function kstToday() { return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); }
  S.to = kstToday(); S.from = S.to.slice(0, 8) + '01';
  function downloadCsv() {
    var from = root.querySelector('#cmFrom').value, to = root.querySelector('#cmTo').value, t = root.querySelector('#cmWithTest').checked;
    if (!from || !to || from > to) { msg('기간을 올바르게 골라 주세요', true); return; }
    S.from = from; S.to = to;
    fetch('/api/commerce/admin?export=csv&from=' + from + '&to=' + to + (t ? '&test=1' : ''), { headers: { authorization: 'Bearer ' + pw } })
      .then(function (r) { if (!r.ok) return r.json().catch(function () { return {}; }).then(function (d) { throw new Error(d.error || ('오류 ' + r.status)); }); return r.blob(); })
      .then(function (blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sales_' + from + '_' + to + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); })
      .catch(function (e) { msg('CSV 를 받지 못했습니다: ' + e.message, true); });
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
