/* 관리자 "주역 검수" 탭 — 64괘 원문·현대어·분야 해석·변효 해석(768항목)을 검수·수정·승인하고, 게시본(사용자에게 보이는 버전)을 점검·게시·롤백한다.
   API: /api/iching-review (관리자 전용). 규칙·저장: report/iching/review-core.js, functions/_iching-review.js. 설계: docs/ICHING_REVIEW_ADMIN_DESIGN.md
   승인과 게시는 다른 단계다: 승인(reviewed)한 문구는 게시 전에는 사용자에게 보이지 않고, 수정하면 승인이 무효가 되어 게시본에서도 즉시 빠진다. */
(function () {
  'use strict';
  var pw = '', root, esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var S = { sum: null, items: [], total: 0, offset: 0, filter: { type: '', status: '', hex: '', q: '' }, cur: null, rel: [], log: [], busy: false };
  var ST_KO = { draft: '초안', 'source-imported': '원문 가져옴', reviewed: '승인(게시 전)', rejected: '반려', stale: '수정됨·재검수 필요', missing: '없음' };
  var TYPE_KO = { classics: '원문', modern: '현대어', pack: '분야 해석', 'pack-line': '변효 해석' };
  var $ = function (s, e) { return (e || root).querySelector(s); };
  var reviewer = function () { try { return localStorage.getItem('iching_reviewer') || ''; } catch (e) { return ''; } };

  function call(method, qs, body) {
    var h = { authorization: 'Bearer ' + pw, 'content-type': 'application/json' }, r = reviewer(); if (r) h['x-reviewer'] = encodeURIComponent(r);
    return fetch('/api/iching-review?' + qs, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { d._status = res.status; return d; }); });
  }
  function msg(t, bad) { var m = $('#icMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function badge(s, rel) { var c = { reviewed: '#62C2AE', rejected: '#FF8A78', stale: '#E0BC74', draft: '#8A8678', 'source-imported': '#8A8678' }[s] || '#8A8678'; return '<span style="border:1px solid ' + c + ';color:' + c + ';border-radius:99px;padding:1px 8px;font-size:.75rem">' + esc(ST_KO[s] || s) + '</span>' + (rel ? ' <span style="border:1px solid #62C2AE;background:#16301F;color:#fff;border-radius:99px;padding:1px 8px;font-size:.75rem">게시됨</span>' : ''); }

  function shell() {
    root.innerHTML = '<div class="card"><h2 style="margin:0 0 6px;color:var(--gold)">주역 검수·승인·게시</h2>' +
      '<p class="muted" style="margin:0 0 10px">문구는 <b>승인 → 게시</b> 두 단계를 거쳐야 사용자에게 보입니다. 승인 뒤 내용을 고치면 승인이 무효가 되어 게시본에서도 바로 빠집니다. AI 초안은 승인 전까지 어디에도 노출되지 않습니다.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>검수자 이름 <input id="icWho" maxlength="30" style="width:130px" placeholder="이력에 남습니다"></label><span id="icMsg" role="status"></span></div><div id="icSum"></div></div>' +
      '<div class="card" style="margin-top:12px"><div id="icFilter"></div><div id="icList"></div></div>' +
      '<div id="icDetail" class="card" style="margin-top:12px" hidden></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px;color:var(--gold)">점괘 미리보기</h3><div id="icPrev"></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px;color:var(--gold)">게시·롤백·서비스 개방</h3><div id="icRel"></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px;color:var(--gold)">최근 변경 이력</h3><div id="icLog"></div></div>';
    var w = $('#icWho'); w.value = reviewer(); w.onchange = function () { try { localStorage.setItem('iching_reviewer', w.value.trim()); } catch (e) { } };
  }

  // ── 요약 ──
  function loadSum() {
    return call('GET', 'a=state').then(function (d) {
      if (!d.ok) { msg(d.error || '불러오지 못했습니다', true); return; }
      S.sum = d; var c = d.summary.counts, r = d.release;
      $('#icSum').innerHTML = '<div class="row" style="gap:14px;flex-wrap:wrap"><span>전체 <b>' + d.summary.total + '</b></span>' + ['source-imported', 'draft', 'reviewed', 'stale', 'rejected'].map(function (k) { return '<span>' + esc(ST_KO[k]) + ' <b>' + (c[k] || 0) + '</b></span>'; }).join('') + '<span>게시됨 <b>' + d.summary.released + '</b></span><span>게시본 <b>' + (r ? 'v' + r.version : '없음') + '</b></span><span>서비스 개방 <b style="color:' + (d.flags.enabled ? '#62C2AE' : '#FF8A78') + '">' + (d.flags.enabled ? '켜짐' : '꺼짐') + '</b></span></div>' +
        '<p class="muted" style="margin:8px 0 0">서비스 개방 점검: ' + (d.readiness.ready ? '<b style="color:#62C2AE">모든 괘·분야가 게시됨 — 개방 가능</b>' : '게시본에 빠진 항목 <b>' + d.readiness.missing + '</b>개 (원문·현대어 64괘, 분야 해석·효 해석이 모두 게시돼야 개방할 수 있습니다)') + '</p>';
      relPanel();
    });
  }

  // ── 목록 ──
  function filterBar() {
    var f = S.filter;
    $('#icFilter').innerHTML = '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>유형 <select id="fType"><option value="">전체</option>' + Object.keys(TYPE_KO).map(function (k) { return '<option value="' + k + '"' + (f.type === k ? ' selected' : '') + '>' + TYPE_KO[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>상태 <select id="fStatus"><option value="">전체</option>' + ['draft', 'source-imported', 'reviewed', 'stale', 'rejected', 'released'].map(function (k) { return '<option value="' + k + '"' + (f.status === k ? ' selected' : '') + '>' + esc(ST_KO[k] || '게시됨') + '</option>'; }).join('') + '</select></label>' +
      '<label>괘 번호 <input id="fHex" type="number" min="1" max="64" value="' + esc(f.hex) + '" style="width:70px"></label><label>검색 <input id="fQ" value="' + esc(f.q) + '" style="width:130px" placeholder="괘 이름"></label><button id="fGo" class="pri">조회</button>' +
      '<button id="fApprove" title="현재 조회된 목록 중 초안·재검수 대상만 승인합니다">조회 결과 일괄 승인</button></div>';
    $('#fGo').onclick = function () { S.filter = { type: $('#fType').value, status: $('#fStatus').value, hex: $('#fHex').value, q: $('#fQ').value }; S.offset = 0; loadList(); };
    $('#fApprove').onclick = bulkApprove;
  }
  function loadList() {
    var f = S.filter, qs = 'a=items&limit=50&offset=' + S.offset + '&type=' + encodeURIComponent(f.type) + '&status=' + encodeURIComponent(f.status) + '&hex=' + encodeURIComponent(f.hex) + '&q=' + encodeURIComponent(f.q);
    return call('GET', qs).then(function (d) {
      if (!d.ok) { $('#icList').innerHTML = '<p class="err">' + esc(d.error) + '</p>'; return; }
      S.items = d.items; S.total = d.total;
      $('#icList').innerHTML = '<table style="width:100%;border-collapse:collapse;margin-top:10px"><thead><tr style="text-align:left;color:var(--ink3)"><th>괘</th><th>항목</th><th>상태</th><th>마지막 처리</th></tr></thead><tbody>' +
        d.items.map(function (i) { return '<tr data-k="' + esc(i.key) + '" style="cursor:pointer;border-top:1px solid var(--line)"><td>' + i.num + ' ' + esc(i.hex) + '</td><td>' + esc(i.label) + (i.edited ? ' <small class="muted">(수정본)</small>' : '') + '</td><td>' + badge(i.status, i.released) + '</td><td class="muted">' + esc(i.reviewedBy || '') + ' ' + esc((i.at || '').slice(0, 10)) + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<div class="row" style="gap:8px;margin-top:8px;align-items:center"><button id="pgP"' + (S.offset ? '' : ' disabled') + '>이전</button><span class="muted">' + (d.total ? (S.offset + 1) + '–' + Math.min(d.total, S.offset + 50) : 0) + ' / ' + d.total + '</span><button id="pgN"' + (S.offset + 50 < d.total ? '' : ' disabled') + '>다음</button></div>';
      $('#icList').querySelectorAll('tr[data-k]').forEach(function (tr) { tr.onclick = function () { openItem(tr.dataset.k); }; });
      $('#pgP').onclick = function () { S.offset = Math.max(0, S.offset - 50); loadList(); }; $('#pgN').onclick = function () { S.offset += 50; loadList(); };
    });
  }
  function bulkApprove() {
    var keys = S.items.filter(function (i) { return ['draft', 'source-imported', 'stale'].indexOf(i.status) >= 0; }).map(function (i) { return i.key; });
    if (!keys.length) { msg('승인할 초안이 이 페이지에 없습니다', true); return; }
    if (!confirm('이 페이지의 초안 ' + keys.length + '개를 승인합니다. 문구를 실제로 읽고 확인했습니까?\n(승인은 게시 전에는 사용자에게 보이지 않습니다.)')) return;
    review(keys, 'approve', '');
  }
  function review(keys, action, note) {
    return call('POST', 'a=review', { action: action, keys: keys, note: note, expectVersion: S.sum ? S.sum.reviewVersion : undefined }).then(function (d) {
      if (d._status === 409) { msg('다른 곳에서 먼저 변경됐습니다. 새로 불러옵니다.', true); } else if (!d.ok) { msg((d.errors && d.errors[0] && d.errors[0].reason) || d.error || '처리하지 못했습니다', true); } else { msg(d.changed + '개 처리' + (d.errors && d.errors.length ? ' · 건너뜀 ' + d.errors.length + '개(' + d.errors[0].reason + ')' : '')); }
      return refresh(S.cur);
    });
  }

  // ── 항목 상세·편집 ──
  var SPEC = {
    modern: [['kw', '키워드(3개, 한 줄에 하나)', 'lines'], ['guaci', '괘사 현대어', 'text'], ['core', '핵심 의미', 'text'], ['lines', '효사 현대어(6개, 초효→상효)', 'lines'], ['yong', '용구·용육 현대어(건·곤만)', 'text']],
    pack: [['direction', '판단 방향', 'dir'], ['issue', '핵심 쟁점', 'text'], ['summary', '결론', 'text'], ['final', '최종 한마디', 'text'], ['conditions', '판단에 필요한 조건', 'lines'], ['favorable', '유리한 조건', 'lines'], ['unfavorable', '불리한 조건', 'lines'], ['errors', '주의할 판단 오류', 'lines'], ['improve', '상황 개선 조건', 'lines'], ['good.conditions', '유리한 전개: 충족 조건', 'lines'], ['good.actions', '유리한 전개: 행동', 'lines'], ['bad.gaps', '불리한 전개: 부족한 준비', 'lines'], ['bad.repeats', '불리한 전개: 반복 행동', 'lines'], ['do', '지금 해야 할 행동(정확히 3개)', 'lines'], ['avoid', '피해야 할 행동(정확히 2개)', 'lines'], ['check', '결정 전 확인 조건', 'lines'], ['review', '판단을 다시 점검할 기준', 'lines']],
    'pack-line': [['meaning', '변효 의미', 'text'], ['caution', '주의', 'text'], ['check', '확인 조건', 'text']]
  };
  var getp = function (o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); };
  var setp = function (o, p, v) { var ks = p.split('.'), l = ks.pop(), t = ks.reduce(function (a, k) { return a[k] = a[k] || {}; }, o); t[l] = v; };
  function openItem(key) {
    return call('GET', 'a=item&key=' + encodeURIComponent(key)).then(function (d) {
      if (!d.ok) { msg(d.error, true); return; }
      S.cur = key; var it = d.item, box = $('#icDetail'); box.hidden = false;
      var h = '<h3 style="margin:0 0 6px;color:var(--gold)">' + it.num + ' ' + esc(it.hex) + ' · ' + esc(it.label) + '</h3><p>' + badge(it.status, it.released) + ' <small class="muted">' + esc(key) + ' · 내용 해시 ' + esc(d.hash) + '</small></p>';
      if (d.override) h += '<p class="muted">관리자 수정본입니다(' + esc(d.override.by) + ', ' + esc((d.override.at || '').slice(0, 16)) + ')' + (d.override.builtinChanged ? ' <b style="color:#E0BC74">· 코드의 원본 초안이 이후 바뀌었습니다. 대조하세요.</b>' : '') + '</p>';
      if (d.source) h += '<p class="muted">출처: ' + esc(d.source.source.source) + ' · ' + esc(d.source.source.license) + '<br>' + esc(d.source.source.quality) + (d.source.variants.length ? '<br>판본 차이 ' + d.source.variants.length + '건(본문은 페이지가 택한 글자, 다른 판본 글자는 아래)' : '') + '</p>' + (d.source.variants.length ? '<ul class="muted">' + d.source.variants.map(function (v) { return '<li>' + esc(v.text || v.note) + (v.alt ? ' ↔ ' + esc(v.alt) : '') + '</li>'; }).join('') + '</ul>' : '');
      h += '<div id="icForm"></div><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px"><button id="dSave" class="pri">수정 저장(승인 해제)</button><button id="dApprove">승인</button><button id="dReject">반려</button><button id="dReset">초안으로</button>' + (d.override ? '<button id="dRevert">수정본 버리기</button>' : '') + '</div>';
      h += '<div id="icVal" style="margin-top:8px">' + (d.validation.errors.length ? '<p class="err">규칙 위반: ' + d.validation.errors.map(esc).join(' / ') + '</p>' : '<p class="muted">구조·문구 규칙 통과' + (d.validation.warnings.length ? ' · 경고: ' + d.validation.warnings.map(esc).join(', ') : '') + '</p>') + '</div>';
      h += '<details style="margin-top:8px"><summary>이 항목의 이력</summary>' + (d.history.length ? '<ul>' + d.history.map(function (e) { return '<li>' + esc(e.at.slice(0, 16)) + ' · ' + esc(e.by) + ' · ' + esc(e.action) + (e.note ? ' — ' + esc(e.note) : '') + '</li>'; }).join('') + '</ul>' : '<p class="muted">이력이 없습니다.</p>') + '</details>';
      box.innerHTML = h; drawForm(it, d.content, d.builtin);
      $('#dSave').onclick = function () { saveEdit(it, d.content); };
      $('#dApprove').onclick = function () { review([key], 'approve', ''); };
      $('#dReject').onclick = function () { var n = prompt('반려 사유를 적어 주세요(수정자가 볼 수 있습니다).'); if (n && n.trim()) review([key], 'reject', n.trim()); };
      $('#dReset').onclick = function () { review([key], 'reset', ''); };
      if ($('#dRevert')) $('#dRevert').onclick = function () { if (confirm('관리자 수정본을 버리고 코드의 초안으로 되돌립니다. 계속할까요?')) call('POST', 'a=revert', { key: key, expectVersion: S.sum.reviewVersion }).then(function (r) { msg(r.ok ? '되돌렸습니다' : (r.error || '실패'), !r.ok); refresh(key); }); };
      box.scrollIntoView({ block: 'nearest' });
    });
  }
  function drawForm(it, c, builtin) {
    var f = $('#icForm'), h = '';
    if (it.type === 'classics') {
      h = ['guaci', 'tuan', 'daexiang'].map(function (k) { return fld(k, { guaci: '괘사 원문', tuan: '단전 원문', daexiang: '대상전 원문' }[k], c[k], 'text'); }).join('') + c.lines.map(function (l, i) { return '<div class="fx"><span>' + esc(l.label) + ' (' + (i + 1) + '효)</span><input data-cl="' + i + '.yaoci" value="' + esc(l.yaoci) + '" style="width:100%" aria-label="효사"><input data-cl="' + i + '.xiaoxiang" value="' + esc(l.xiaoxiang) + '" style="width:100%;margin-top:4px" aria-label="소상"></div>'; }).join('') + (c.yong ? fld('yong.yaoci', c.yong.label + ' 효사', c.yong.yaoci, 'text') + fld('yong.xiaoxiang', c.yong.label + ' 소상', c.yong.xiaoxiang, 'text') : '');
    } else {
      h = SPEC[it.type].map(function (s) { var v = getp(c, s[0]); if (s[0] === 'yong' && v == null) return ''; return fld(s[0], s[1], v, s[2]); }).join('');
      if (builtin && JSON.stringify(builtin) !== JSON.stringify(c)) h += '<details><summary>코드의 원본 초안(참고)</summary><pre style="white-space:pre-wrap;font-size:.8rem">' + esc(JSON.stringify(builtin, null, 1)) + '</pre></details>';
    }
    f.innerHTML = h;
  }
  function fld(path, label, v, kind) {
    if (kind === 'dir') return '<div class="fx"><span>' + esc(label) + '</span><select data-p="' + path + '">' + ['실행 검토', '준비 우선', '현상 유지', '재검토', '신중한 접근'].map(function (d) { return '<option' + (d === v ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></div>';
    if (kind === 'lines') { var a = Array.isArray(v) ? v : []; return '<div class="fx"><span>' + esc(label) + '</span><textarea data-p="' + path + '" data-k="lines" rows="' + Math.max(2, a.length) + '" style="width:100%">' + esc(a.join('\n')) + '</textarea></div>'; }
    return '<div class="fx"><span>' + esc(label) + '</span><textarea data-p="' + path + '" rows="2" style="width:100%">' + esc(v) + '</textarea></div>';
  }
  function collect(it, base) {
    var c = JSON.parse(JSON.stringify(base));
    $('#icForm').querySelectorAll('[data-p]').forEach(function (e) { var v = e.dataset.k === 'lines' ? e.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean) : e.value.trim(); setp(c, e.dataset.p, v); });
    $('#icForm').querySelectorAll('[data-cl]').forEach(function (e) { var p = e.dataset.cl.split('.'); c.lines[+p[0]][p[1]] = e.value.trim(); });
    return c;
  }
  function saveEdit(it, base) {
    var note = prompt('수정 이유를 간단히 적어 주세요(이력에 남습니다).', ''); if (note === null) return;
    call('POST', 'a=edit', { key: it.key, content: collect(it, base), note: note, expectVersion: S.sum.reviewVersion }).then(function (d) {
      if (d._status === 409) msg('다른 곳에서 먼저 변경됐습니다. 새로 불러옵니다.', true);
      else if (!d.ok) { $('#icVal').innerHTML = '<p class="err">저장하지 않았습니다: ' + (d.errors || []).map(function (e) { return esc(e.reason); }).join(' / ') + '</p>'; msg('규칙 위반으로 저장하지 않았습니다', true); return; }
      else msg('저장했습니다. 승인이 해제되어 다시 승인·게시해야 사용자에게 보입니다.');
      refresh(it.key);
    });
  }
  function refresh(key) { return loadSum().then(loadList).then(function () { if (key) return openItem(key); }).then(loadLog); }

  // ── 미리보기 ──
  function prevPanel() {
    var H = window.IchingHexagrams; if (!H) { $('#icPrev').innerHTML = '<p class="err">괘 데이터를 불러오지 못했습니다.</p>'; return; }
    $('#icPrev').innerHTML = '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>괘 <select id="pvHex">' + H.HEXAGRAMS.map(function (h) { return '<option value="' + h.num + '">' + h.num + ' ' + h.ko + '(' + h.hanja + ')</option>'; }).join('') + '</select></label>' +
      '<label>분야 <select id="pvCat"><option value="general">종합</option><option value="wealth">재물</option><option value="career">커리어</option><option value="love">인연</option></select></label>' +
      '<label>보기 <select id="pvMode"><option value="preview">관리자 미리보기(초안 포함)</option><option value="public">사용자에게 실제로 보이는 결과</option></select></label><label><input id="pvSaju" type="checkbox"> 사주 예시 포함</label></div>' +
      '<div id="pvLines" class="row" style="gap:10px;flex-wrap:wrap;margin:8px 0"></div><button id="pvGo" class="pri">미리보기</button><div id="pvOut" style="margin-top:10px"></div>';
    var drawL = function () { var h = H.byNum(+$('#pvHex').value); $('#pvLines').innerHTML = '<span class="muted">변하는 효 체크:</span>' + h.lines.map(function (b, i) { return '<label><input type="checkbox" data-pl="' + i + '"> ' + (i + 1) + '효(' + (b ? '양' : '음') + ')</label>'; }).join(''); };
    $('#pvHex').onchange = drawL; drawL();
    $('#pvGo').onclick = function () {
      var h = H.byNum(+$('#pvHex').value), vals = h.lines.map(function (b, i) { var ch = $('#pvLines [data-pl="' + i + '"]').checked; return b ? (ch ? 9 : 7) : (ch ? 6 : 8); });
      call('GET', 'a=preview&cat=' + $('#pvCat').value + '&mode=' + $('#pvMode').value + '&saju=' + ($('#pvSaju').checked ? 1 : 0) + '&values=' + vals.join(',')).then(function (d) { $('#pvOut').innerHTML = d.ok ? showResult(d) : '<p class="err">' + esc(d.error) + '</p>'; });
    };
  }
  function li(a) { return (a && a.length ? '<ul style="margin:2px 0 6px 18px">' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="muted" style="margin:2px 0">(없음)</p>'); }
  function showResult(d) {
    var r = d.result, t = r.transformation_analysis, x = r.hexagram_explanation, s = r.situation_analysis, j = r.saju_cross_analysis, sc = r.scenarios, a = r.action_plan, st = [];
    if (r.missing.length) st.push('<p class="err">누락 ' + r.missing.length + '개 — ' + esc(r.missing.slice(0, 8).join(', ')) + (r.missing.length > 8 ? ' …' : '') + '</p>');
    st.push('<p class="muted">' + (r.preview ? '초안이 포함된 미리보기입니다(사용자에게는 보이지 않음).' : '') + ' 게시 가능: ' + (r.publishable ? '<b style="color:#62C2AE">예</b>' : '아니오') + ' · 구조 검증 ' + (d.validation.ok ? '통과' : '<b class="err">' + esc(d.validation.errors.join(' / ')) + '</b>') + ' · 품질 검사 ' + (d.quality.errors.length ? '<b class="err">' + esc(d.quality.errors.join(' / ')) + '</b>' : '통과') + '</p>');
    var out = st.join('') + '<h4>01 핵심 결론</h4><p>방향: <b>' + esc(r.conclusion.direction || '(결론 없음)') + '</b></p><p>' + esc(r.conclusion.summary || r.conclusion.note || '') + '</p>' + li(r.conclusion.conditions) +
      '<h4>02 본괘 · ' + esc(x.name) + '(' + esc(x.hanja) + ')</h4><p>' + esc(x.upper_lower) + ' · ' + esc((x.keywords || []).join(' · ')) + '</p><p>' + esc(x.guaci_original ? x.guaci_original.text : '') + '</p><p>' + esc(x.guaci_modern ? x.guaci_modern.text : '') + '</p><p>' + esc(x.core_meaning || '') + '</p>' +
      '<h4>03 현재 상황</h4><p>' + esc(s.issue || '') + '</p><b>유리</b>' + li(s.favorable) + '<b>불리</b>' + li(s.unfavorable) + '<b>판단 오류</b>' + li(s.judgment_errors) + '<b>개선 조건</b>' + li(s.improve_conditions) +
      '<h4>04 변효·변괘</h4><p>' + esc(t.statement || t.summary) + '</p>' + (t.readings || []).map(function (y) { return '<p>' + esc(y.label || '괘사') + ': ' + esc(y.original || '') + '<br>' + esc(y.modern || '') + '</p>'; }).join('') + (t.line_meanings ? li(t.line_meanings.map(function (l) { return l.label + ': ' + (l.meaning || '(없음)'); })) : '') + (t.relation ? '<p>' + esc(t.relation.from + ' → ' + t.relation.to) + ' · ' + esc(t.relation.transformed_core || '') + '</p>' : '') +
      '<h4>05 사주 교차</h4>' + (j.status === 'ok' ? li(j.luck_context) + li(j.category_traits) + '<b>공통</b>' + li(j.common) + '<b>다른 방향</b>' + li(j.divergent) + '<p>' + esc(j.reference_judgment) + '</p>' : '<p class="muted">' + esc(j.note) + '</p>') +
      '<h4>06 시나리오</h4><p class="muted">' + esc(sc.disclaimer) + '</p>' + (sc.favorable ? '<b>유리</b>' + li(sc.favorable.conditions.concat(sc.favorable.actions)) + '<b>불리</b>' + li(sc.unfavorable.gaps.concat(sc.unfavorable.repeats)) : '') +
      '<h4>07 행동 처방</h4><b>해야 할 행동</b>' + li(a['do']) + '<b>피할 행동</b>' + li(a.avoid) + '<b>확인 조건</b>' + li(a.check_before) + '<b>점검 기준</b>' + li(a.review_criteria) + '<h4>08 최종 한마디</h4><p>' + esc(r.final_message.text || '') + '</p>';
    return out;
  }

  // ── 게시·롤백·개방 ──
  function relPanel() {
    var box = $('#icRel'); if (!box || !S.sum) return;
    box.innerHTML = '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button id="rlDry">게시 점검(변경 내역 보기)</button><button id="rlPub" class="pri">게시</button><span class="muted">승인된 항목만 게시되며, 수정된 항목은 자동으로 빠집니다.</span></div><div id="rlOut" style="margin:8px 0"></div><div id="rlList"></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px"><b>서비스 개방</b>' + ['general', 'wealth', 'career', 'love'].map(function (c) { return '<label><input type="checkbox" data-fc="' + c + '"' + (S.sum.flags.categories.indexOf(c) >= 0 ? ' checked' : '') + '> ' + { general: '종합', wealth: '재물', career: '커리어', love: '인연' }[c] + '</label>'; }).join('') + '<button id="flOn">개방 켜기</button><button id="flOff">끄기</button></div>' +
      '<p class="muted">개방은 모든 괘의 원문·현대어와 선택한 분야의 해석·변효 해석이 게시돼야 켤 수 있습니다. 이 스위치는 점괘 서비스(무빙툰·회원 홈)가 만들어질 때 읽는 값이며, 지금은 사용자 화면에 영향을 주지 않습니다.</p>';
    $('#rlDry').onclick = function () { doPublish(true); }; $('#rlPub').onclick = function () { doPublish(false); };
    var fl = function (en) { var cats = [].map.call(box.querySelectorAll('[data-fc]:checked'), function (e) { return e.dataset.fc; }); if (en && !confirm('선택한 분야(' + cats.join(', ') + ')로 서비스 개방을 켭니다. 계속할까요?')) return; call('POST', 'a=flags', { enabled: en, categories: cats }).then(function (d) { msg(d.ok ? '저장했습니다' : (d.error === 'not-ready' ? '아직 게시되지 않은 항목이 ' + d.missing + '개 있어 켤 수 없습니다' : (d.error || '실패')), !d.ok); loadSum(); loadLog(); }); };
    $('#flOn').onclick = function () { fl(true); }; $('#flOff').onclick = function () { fl(false); };
    call('GET', 'a=releases').then(function (d) { S.rel = d.releases || []; $('#rlList').innerHTML = S.rel.length ? '<table style="width:100%;border-collapse:collapse"><tbody>' + S.rel.map(function (r, i) { return '<tr style="border-top:1px solid var(--line)"><td>v' + r.version + (i === 0 ? ' <b>(현재)</b>' : '') + '</td><td>' + r.count + '개</td><td class="muted">' + esc((r.createdAt || '').slice(0, 16)) + ' ' + esc(r.by) + (r.restoredFrom ? ' · v' + r.restoredFrom + ' 복원' : '') + '</td><td class="muted">' + esc(r.note) + '</td><td>' + (i ? '<button data-rb="' + r.version + '">이 버전으로 롤백</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">아직 게시한 적이 없습니다.</p>'; $('#rlList').querySelectorAll('[data-rb]').forEach(function (b) { b.onclick = function () { if (!confirm('v' + b.dataset.rb + ' 의 내용으로 새 게시 버전을 만들어 되돌립니다. 계속할까요?')) return; call('POST', 'a=rollback', { toVersion: +b.dataset.rb, expectReleaseVersion: S.sum.release ? S.sum.release.version : 0 }).then(function (r) { msg(r.ok ? '롤백했습니다(v' + r.version + ')' : (r.error || '실패'), !r.ok); loadSum(); loadLog(); }); }; }); });
  }
  function doPublish(dry) {
    var rv = S.sum.release ? S.sum.release.version : 0;
    if (!dry && !confirm('승인된 항목을 새 게시 버전으로 만들어 사용자에게 보이게 합니다. 먼저 "게시 점검"으로 변경 내역을 확인했습니까?')) return;
    call('POST', 'a=publish', { dryRun: dry, expectReleaseVersion: rv, expectReviewVersion: S.sum.reviewVersion, note: '' }).then(function (d) {
      var o = $('#rlOut');
      if (d.error === 'nothing-to-publish') { o.innerHTML = '<p class="muted">바뀐 내용이 없어 새 버전을 만들지 않습니다.</p>'; return; }
      if (!d.ok && d._status !== 200) { o.innerHTML = '<p class="err">' + esc(d.error) + '</p>'; return; }
      o.innerHTML = '<p>' + (dry ? '점검 결과(저장 안 함)' : '게시했습니다') + ': 게시본 v' + d.version + ' · 총 ' + d.count + '개 · 추가 ' + d.diff.added + ' · 제거 ' + d.diff.removed + ' · 변경 ' + d.diff.changed + (d.skippedCount ? ' · <b class="err">제외 ' + d.skippedCount + '개</b>(' + esc(d.skipped[0].key + ': ' + d.skipped[0].reason) + ')' : '') + '</p>';
      if (!dry) { msg('게시했습니다(v' + d.version + ')'); loadSum(); loadList(); loadLog(); }
    });
  }
  function loadLog() {
    return call('GET', 'a=log&limit=15').then(function (d) { var b = $('#icLog'); if (!b) return; b.innerHTML = (d.log || []).length ? '<ul style="margin:0 0 0 18px">' + d.log.map(function (e) { return '<li>' + esc(e.at.slice(0, 16)) + ' · ' + esc(e.by) + ' · <b>' + esc(e.action) + '</b> ' + (e.keyCount ? e.keyCount + '개' : '') + (e.releaseVersion ? ' (게시 v' + e.releaseVersion + ')' : '') + (e.note ? ' — ' + esc(e.note) : '') + '</li>'; }).join('') + '</ul>' : '<p class="muted">이력이 없습니다.</p>'; });
  }

  window.V2Iching = {
    open: function (password) {
      pw = password; root = document.getElementById('t-ichingreview'); if (!root) return;
      if (!root.dataset.ready) { root.dataset.ready = '1'; shell(); filterBar(); prevPanel(); }
      loadSum().then(loadList).then(loadLog);
    }
  };
})();
