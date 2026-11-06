/* 관리자 "지역 방위 해석" 탭 — 지역 방위오행 × 개인 사주 해석(region-reading.js)의 규칙 수치와 사전 문구를 코드 수정 없이 관리한다.
   ① 공개 스위치 ② 해석 규칙(수치) ③ 문구(수정·조건·우선순위·게시·되돌리기·추가) ④ 미리보기(오행별 판정·근거 점수·적용된 문구 ID·배제 사유)
   API: /api/region-reading. 게시 전에는 사용자 화면에 영향이 없고, 스위치가 꺼져 있으면 게시해도 기존 한 줄 해석 그대로다. 미리보기는 서버에 저장하지 않는다. */
(function () {
  'use strict';
  var pw = '', root, M = window.Manse, RR = window.MantraRegionReading, D = window.MantraRegionReadingData, RG = window.MantraRegion;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); }, $$ = function (s) { return [].slice.call(root.querySelectorAll(s)); };
  var S = { doc: null, base: null, tab: 'flag', f: { role: '', st: '', q: '' }, cur: null, sel: {}, sim: { year: 1992, month: 6, day: 23, hour: 2, minute: 0, gender: 'M', region: 'seoul', mode: 'auto', draft: true } };
  var ST = { draft: '초안', reviewed: '승인(미게시)', published: '게시됨', none: '기본값' };
  var ROLE = { dir: '방위 설명', grp: '십성 의미', eok: '억부', johu: '조후', climate: '한난조습', month: '월령', lack: '원국의 양', flow: '상생상극', pro: '유리한 점', con: '불리한 점', conflict: '충돌 이유', headline: '종합 제목', overall: '종합 해석', caveat: '유의 안내' };
  function call(method, qs, body) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/region-reading' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(t, bad) { var m = $('#rrMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function load(note) { return call('GET', '?all=1').then(function (d) { if (!d._ok) { root.innerHTML = '<div class="card"><p class="muted">' + esc(d.error || '불러오지 못했습니다') + '</p></div>'; return; } S.doc = d.doc; S.base = d.base; draw(); if (note) msg(note); }); }
  var item = function (kind, id) { var h = kind === 'phrase' ? [S.doc.phrases, S.doc.custom] : [S.doc.rules, {}]; return h[0][id] || h[1][id] || null; };
  var stOf = function (kind, id) { var it = item(kind, id); return it ? it.status : 'none'; };
  var fail = function (d) { msg(d.error || '실패했습니다', true); };
  var lines = function (s) { return String(s || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); };
  function hist(kind, id) {
    var it = item(kind, id), h = (it && it.history || []).slice().reverse(); if (!h.length) return '';
    return '<details style="margin-top:8px"><summary>이력 ' + h.length + '건</summary><ul style="margin:6px 0 0 18px">' + h.map(function (x) { return '<li>v' + x.v + ' · ' + ST[x.status] + ' · ' + esc((x.at || '').slice(0, 16).replace('T', ' ')) + (x.by ? ' · ' + esc(x.by) : '') + ' <button class="btn" data-rs="' + x.v + '" data-k="' + kind + '" data-i="' + esc(id) + '">이 버전으로 되돌리기</button></li>'; }).join('') + '</ul></details>';
  }
  function bindRestore() { $$('[data-rs]').forEach(function (b) { b.onclick = function () { call('PUT', '', { kind: b.dataset.k, id: b.dataset.i, action: 'restore', v: +b.dataset.rs }).then(function (d) { d._ok ? load('되돌렸습니다(초안) — 게시하려면 [저장하고 게시]를 누르세요') : fail(d); }); }; }); }

  function draw() {
    var tabs = [['flag', '공개 스위치'], ['rule', '해석 규칙'], ['phrase', '문구'], ['sim', '미리보기·근거']];
    root.innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">지역 방위 해석 관리</h3><p class="muted" style="margin:0 0 8px">“나의 운명 지도”에서 지역의 방위오행이 이 사주에 어떻게 작용하는지(월령·조후·억부·십성·상생상극)를 풀어 주는 규칙 수치와 사전 문구를 관리합니다. 게시한 항목만 반영되고 수정하면 게시본에서 빠집니다. AI 호출은 없습니다.</p>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' + tabs.map(function (t) { return '<button class="btn" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' style="outline:2px solid var(--gold)"' : '') + '>' + t[1] + '</button>'; }).join('') + '<span id="rrMsg" class="admin-msg" style="margin-left:8px"></span></div></div><div id="rrBody" style="margin-top:12px"></div>';
    $$('[data-tab]').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; draw(); }; });
    ({ flag: drawFlag, rule: drawRule, phrase: drawPhrase, sim: drawSim })[S.tab]();
  }
  function drawFlag() {
    var on = S.doc.enabled === true, n = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k].status === 'published'; }).length; };
    $('#rrBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">사용자 화면 공개 스위치</h3><p style="margin:0 0 8px">현재: <b style="color:' + (on ? '#62C2AE' : '#E0BC74') + '">' + (on ? '● 켜짐 — 지역 카드가 새 해석으로 보입니다' : '○ 꺼짐 — 기존 한 줄 해석 그대로입니다') + '</b></p>' +
      '<p class="muted" style="margin:0 0 8px">게시된 항목: 문구 ' + (n(S.doc.phrases) + n(S.doc.custom)) + '건 · 규칙 ' + n(S.doc.rules) + '건. 켜면 약 1분 안에 반영되고 끄면 같은 방식으로 돌아갑니다(재배포 불필요). 이 해석은 “나의 운명 지도” 기능(지역 스위치)이 켜져 있을 때만 보입니다.</p>' +
      '<div class="row" style="gap:8px"><button class="btn" id="rrOn">켜기</button><button class="btn" id="rrOff">끄기</button></div></div>';
    var set = function (v) { if (v && !confirm('지역 해석을 새 방식(월령·조후·억부·상생상극 반영)으로 공개합니다.\n게시한 문구·규칙만 바뀐 값이고 나머지는 기본값입니다.\n켜시겠습니까?')) return; call('PUT', '', { kind: 'flag', enabled: v }).then(function (d) { d._ok ? load(v ? '켰습니다(약 1분 안에 반영)' : '껐습니다(약 1분 안에 반영)') : fail(d); }); };
    $('#rrOn').onclick = function () { set(true); }; $('#rrOff').onclick = function () { set(false); };
  }

  // ───────── 규칙(수치) ─────────
  function drawRule() {
    $('#rrBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">해석 규칙</h3><p class="muted" style="margin:0 0 8px">판정의 기준이 되는 수치입니다. 값을 바꾸면 모든 사주·지역의 해석이 달라질 수 있으니, 바꾼 뒤 [미리보기]에서 여러 사주로 확인하고 게시하세요. 허용 범위를 벗어난 값은 저장되지 않습니다.</p>' +
      '<table style="width:100%;font-size:.85rem"><thead><tr><th>규칙</th><th>값</th><th>범위</th><th>상태</th><th></th></tr></thead><tbody>' + S.base.rules.map(function (r) {
        var it = item('rule', r.id), v = it && it.fields.value != null ? it.fields.value : r.v;
        return '<tr data-r="' + r.id + '"><td><b>' + esc(r.label) + '</b><div class="muted" style="font-size:.78rem">' + esc(r.desc) + ' (기본 ' + r.v + ')</div></td><td><input type="number" data-v step="any" min="' + r.min + '" max="' + r.max + '" value="' + v + '" style="width:80px"></td><td>' + r.min + '~' + r.max + '</td><td>' + ST[stOf('rule', r.id)] + '</td><td><button class="btn" data-go>저장하고 게시</button>' + (stOf('rule', r.id) === 'published' ? ' <button class="btn" data-un>게시 취소</button>' : '') + '</td></tr><tr><td colspan="5">' + hist('rule', r.id) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    $$('tr[data-r]').forEach(function (tr) {
      var id = tr.dataset.r;
      tr.querySelector('[data-go]').onclick = function () { call('PUT', '', { kind: 'rule', id: id, action: 'save', fields: { value: +tr.querySelector('[data-v]').value } }).then(function (d) { if (!d._ok) return fail(d); return call('PUT', '', { kind: 'rule', id: id, action: 'approve_publish' }).then(function (d2) { d2._ok ? load('게시했습니다') : fail(d2); }); }); };
      var un = tr.querySelector('[data-un]'); if (un) un.onclick = function () { call('PUT', '', { kind: 'rule', id: id, action: 'unpublish' }).then(function (d) { d._ok ? load('게시를 취소했습니다(기본값으로 복귀)') : fail(d); }); };
    });
    bindRestore();
  }

  // ───────── 문구 ─────────
  function allPhrases() {
    var list = S.base.phrases.map(function (p) { var it = S.doc.phrases[p.id], f = it ? it.fields : {}; return { id: p.id, role: p.role, base: p, tag: f.tag || p.tag, pri: f.pri != null ? f.pri : p.pri, when: f.when || p.when, unless: f.unless || p.unless, basis: f.basis != null ? f.basis : p.basis, on: f.on != null ? f.on : p.on, text: f.text || p.text, custom: false }; });
    Object.keys(S.doc.custom).forEach(function (id) { var f = S.doc.custom[id].fields; list.push({ id: id, role: f.role, base: null, tag: f.tag, pri: f.pri, when: f.when || [], unless: f.unless || [], basis: f.basis || '', on: f.on !== false, text: f.text, custom: true }); });
    return list;
  }
  function visible() { var f = S.f; return allPhrases().filter(function (p) { var st = stOf('phrase', p.id); return (!f.role || p.role === f.role) && (!f.st || (f.st === 'published' ? st === 'published' : f.st === 'draft' ? (st === 'draft' || st === 'reviewed') : st === 'none')) && (!f.q || (p.id + p.text).indexOf(f.q) >= 0); }); }
  var selIds = function () { return Object.keys(S.sel).filter(function (k) { return S.sel[k]; }); };
  function bulk(ids, op) {
    if (!ids.length || !confirm(ids.length + '건을 ' + (op === 'publish' ? '게시' : '게시 취소') + '합니다.')) return;
    call('PUT', '', { kind: 'phrase', action: 'bulk', ids: ids.slice(0, 200), op: op }).then(function (d) { S.sel = {}; d._ok ? load((op === 'publish' ? '게시 ' : '게시 취소 ') + d.done + '건' + (d.skipped ? ' · 이미 처리됨 ' + d.skipped + '건' : '') + (d.failed.length ? ' · 실패 ' + d.failed.length + '건: ' + d.failed.slice(0, 2).map(function (x) { return x.id + ' ' + x.error; }).join(' / ') : '')) : fail(d); });
  }
  function drawPhrase() {
    var f = S.f, list = visible(), shown = list.slice(0, 150), n = selIds().length;
    $('#rrBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">사전 문구</h3><p class="muted" style="margin:0 0 8px">문구마다 역할·적용 조건(when)·제외 조건(unless)·우선순위(pri)·같은 tag끼리 하나만 선택(충돌·중복 제거)·명리학적 근거(basis)를 관리합니다. 자리표시자: ' + D.PLACEHOLDERS.map(function (x) { return '{' + x + '}'; }).join(' ') + '</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>역할 <select id="rrRole"><option value="">전체</option>' + Object.keys(ROLE).map(function (k) { return '<option value="' + k + '"' + (f.role === k ? ' selected' : '') + '>' + ROLE[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>상태 <select id="rrSt"><option value="">전체</option><option value="published"' + (f.st === 'published' ? ' selected' : '') + '>게시됨</option><option value="draft"' + (f.st === 'draft' ? ' selected' : '') + '>초안/승인</option><option value="none"' + (f.st === 'none' ? ' selected' : '') + '>기본값</option></select></label><label>검색 <input id="rrQ" value="' + esc(f.q) + '" style="width:150px"></label><button class="btn" id="rrNew">새 문구 추가</button></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px"><button class="btn" id="rrBp"' + (n ? '' : ' disabled') + '>선택 게시 (' + n + ')</button><button class="btn" id="rrBu"' + (n ? '' : ' disabled') + '>선택 게시 취소</button><span class="muted">' + list.length + '건' + (list.length > 150 ? ' · 처음 150건만 표시' : '') + '</span></div>' +
      '<div style="overflow:auto;max-height:300px;margin-top:8px"><table style="width:100%;font-size:.84rem"><thead><tr><th style="width:26px"></th><th>ID</th><th>상태</th><th>본문</th></tr></thead><tbody>' + shown.map(function (p) { return '<tr data-id="' + esc(p.id) + '" style="cursor:pointer' + (S.cur === p.id ? ';background:rgba(255,255,255,.07)' : '') + '"><td><input type="checkbox" data-ck="' + esc(p.id) + '"' + (S.sel[p.id] ? ' checked' : '') + '></td><td>' + esc(p.id) + (p.custom ? ' <span class="muted">(추가)</span>' : '') + (p.on ? '' : ' <span style="color:#FF8A78">비활성</span>') + '</td><td>' + ST[stOf('phrase', p.id)] + '</td><td>' + esc(p.text.slice(0, 56)) + (p.text.length > 56 ? '…' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<details style="margin-top:8px"><summary>조건 키 보기</summary><table style="font-size:.8rem;margin-top:6px"><tbody>' + S.base.factKeys.map(function (k) { return '<tr><td><code>' + esc(k[0]) + '</code></td><td>' + esc(k[1]) + '</td><td>' + esc(k[2]) + '</td></tr>'; }).join('') + '</tbody></table><p class="muted">형식: <code>키=값</code> <code>키!=값</code>(| 로 여러 값) · <code>zone&gt;=값</code> <code>zone&lt;=값</code>. 적용 조건은 모두 만족해야 하고, 제외 조건은 하나라도 맞으면 빠집니다.</p></details><div id="rrEd" style="margin-top:10px"></div></div>';
    $('#rrRole').onchange = function () { S.f.role = this.value; drawPhrase(); }; $('#rrSt').onchange = function () { S.f.st = this.value; drawPhrase(); }; $('#rrQ').onchange = function () { S.f.q = this.value.trim(); drawPhrase(); };
    $$('input[data-ck]').forEach(function (cb) { cb.onclick = function (e) { e.stopPropagation(); S.sel[cb.dataset.ck] = cb.checked; var m = selIds().length; $('#rrBp').disabled = $('#rrBu').disabled = !m; $('#rrBp').textContent = '선택 게시 (' + m + ')'; }; });
    $$('tr[data-id]').forEach(function (tr) { tr.onclick = function () { S.cur = tr.dataset.id; drawPhrase(); }; });
    $('#rrBp').onclick = function () { bulk(selIds(), 'publish'); }; $('#rrBu').onclick = function () { bulk(selIds(), 'unpublish'); };
    $('#rrNew').onclick = newPhrase; if (S.cur) editor();
  }
  function editor() {
    var p = allPhrases().filter(function (x) { return x.id === S.cur; })[0]; if (!p) return;
    var st = stOf('phrase', p.id), it = item('phrase', p.id), b = p.base || {};
    $('#rrEd').innerHTML = '<div style="border-top:1px solid var(--line,#333);padding-top:10px"><b>' + esc(p.id) + '</b> · ' + (ROLE[p.role] || p.role) + ' · ' + ST[st] + (it && it.by ? ' · 마지막 ' + esc(it.by) : '') + ' · v' + (it ? it.version : 1) + (b.text ? '<p class="muted" style="margin:4px 0">기본 문구: ' + esc(b.text) + '</p>' : '') +
      '<textarea id="rrTx" rows="3" maxlength="360" style="width:100%">' + esc(p.text) + '</textarea><p class="muted" style="margin:2px 0">존댓말로 끝나야 하며 단정 표현(반드시·무조건·보장·절대 등)은 저장되지 않습니다. 오행 뒤에는 “기운”을 붙여 조사를 피합니다.</p>' +
      '<div class="row" style="gap:12px;flex-wrap:wrap;margin-top:6px"><label>우선순위(0~10) <input id="rrPri" type="number" min="0" max="10" step="0.5" value="' + esc(p.pri) + '" style="width:70px"></label><label>tag <input id="rrTag" value="' + esc(p.tag) + '" style="width:160px"></label><label><input type="checkbox" id="rrOnCk"' + (p.on ? ' checked' : '') + '> 활성</label></div>' +
      '<div class="row" style="gap:12px;margin-top:6px;flex-wrap:wrap"><label style="flex:1 1 240px">적용 조건(한 줄에 하나)<textarea id="rrWhen" rows="3" style="width:100%">' + esc(p.when.join('\n')) + '</textarea></label><label style="flex:1 1 240px">제외 조건<textarea id="rrUnl" rows="3" style="width:100%">' + esc(p.unless.join('\n')) + '</textarea></label></div>' +
      '<label style="display:block;margin-top:6px">명리학적 근거 메모 <input id="rrBasis" value="' + esc(p.basis) + '" maxlength="120" style="width:100%"></label>' +
      '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn" data-a="pub">' + (st === 'published' ? '수정해서 다시 게시' : '저장하고 게시') + '</button><button class="btn" data-a="save">수정만 저장(미게시)</button>' + (st === 'published' ? '<button class="btn" data-a="unpublish">게시 취소</button>' : '') + (p.custom ? '<button class="btn" data-a="del">삭제</button>' : '') + '</div>' + hist('phrase', p.id) + '</div>';
    var fields = function () { return { text: $('#rrTx').value, pri: +$('#rrPri').value, tag: $('#rrTag').value.trim(), on: $('#rrOnCk').checked, when: lines($('#rrWhen').value), unless: lines($('#rrUnl').value), basis: $('#rrBasis').value }; };
    $$('#rrEd [data-a]').forEach(function (btn) {
      btn.onclick = function () {
        var a = btn.dataset.a; if (a === 'unpublish') return call('PUT', '', { kind: 'phrase', id: p.id, action: 'unpublish' }).then(function (d) { d._ok ? load('게시를 취소했습니다') : fail(d); });
        if (a === 'del') { if (!confirm('직접 추가한 문구를 삭제합니다.')) return; return call('PUT', '', { kind: 'phrase', id: p.id, action: 'delete' }).then(function (d) { if (d._ok) { S.cur = null; load('삭제했습니다'); } else fail(d); }); }
        call('PUT', '', { kind: 'phrase', id: p.id, action: 'save', fields: fields() }).then(function (d) { if (!d._ok) return fail(d); if (a === 'save') return load('저장했습니다(미게시)'); return call('PUT', '', { kind: 'phrase', id: p.id, action: 'approve_publish' }).then(function (d2) { d2._ok ? load('게시했습니다') : fail(d2); }); });
      };
    });
    bindRestore();
  }
  function newPhrase() {
    $('#rrEd').innerHTML = '<div style="border-top:1px solid var(--line,#333);padding-top:10px"><b>새 문구 추가</b><p class="muted" style="margin:4px 0">추가한 문구는 조건에 맞을 때 같은 역할의 다른 문구와 함께 후보가 되고, 우선순위가 높고 tag가 같으면 기본 문구를 대신합니다.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><label>ID <input id="npId" placeholder="R.pro.mycase" style="width:170px"></label><label>역할 <select id="npRole">' + Object.keys(ROLE).map(function (k) { return '<option value="' + k + '">' + ROLE[k] + '</option>'; }).join('') + '</select></label><label>적용 조건 <input id="npWhen" placeholder="el=수, johu=yong" style="width:240px"></label></div>' +
      '<textarea id="npTx" rows="3" maxlength="360" style="width:100%;margin-top:6px" placeholder="존댓말 문구"></textarea><button class="btn" id="npGo" style="margin-top:6px">추가(초안)</button></div>';
    $('#npGo').onclick = function () { var id = $('#npId').value.trim(); call('PUT', '', { kind: 'phrase', id: id, action: 'create', fields: { role: $('#npRole').value, text: $('#npTx').value, when: $('#npWhen').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), unless: [], pri: 2 } }).then(function (d) { if (d._ok) { S.cur = id; load('추가했습니다(초안) — 조건·우선순위를 다듬고 게시하세요'); } else fail(d); }); };
  }

  // ───────── 미리보기 ─────────
  function pubView(withDraft) {
    var ok = function (it) { return it.status === 'published' || withDraft; }, ph = {}, rules = {}, cus = [];
    Object.keys(S.doc.phrases).forEach(function (k) { if (ok(S.doc.phrases[k])) ph[k] = S.doc.phrases[k].fields; });
    Object.keys(S.doc.custom).forEach(function (k) { if (ok(S.doc.custom[k])) cus.push(Object.assign({ id: k }, S.doc.custom[k].fields)); });
    Object.keys(S.doc.rules).forEach(function (k) { var it = S.doc.rules[k]; if (ok(it) && it.fields && typeof it.fields.value === 'number') rules[k] = it.fields.value; });
    return { phrases: ph, custom: cus, rules: rules };
  }
  function drawSim() {
    var o = S.sim, num = function (id, v, w) { return '<input id="' + id + '" type="number" value="' + v + '" style="width:' + (w || 70) + 'px">'; };
    $('#rrBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">사주 입력 후 지역 해석 미리보기</h3><p class="muted" style="margin:0 0 8px">사용자 화면과 같은 엔진으로 한 지역의 해석과, 같은 사주에서 5가지 방위 오행이 각각 어떻게 읽히는지 보여 줍니다. 서버에 저장하지 않습니다.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>생년 ' + num('rsY', o.year) + '</label><label>월 ' + num('rsM', o.month, 50) + '</label><label>일 ' + num('rsD', o.day, 50) + '</label><label>시 ' + num('rsH', o.hour, 50) + '</label><label>성별 <select id="rsG"><option value="M"' + (o.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (o.gender === 'F' ? ' selected' : '') + '>여</option></select></label>' +
      '<label>지역 <select id="rsR">' + RG.REGIONS.map(function (r) { return '<option value="' + r.id + '"' + (o.region === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('') + '</select></label><label>해석 기준 <select id="rsM2"><option value="auto"' + (o.mode === 'auto' ? ' selected' : '') + '>자동</option><option value="eokbu"' + (o.mode === 'eokbu' ? ' selected' : '') + '>억부</option><option value="johu"' + (o.mode === 'johu' ? ' selected' : '') + '>조후</option><option value="both"' + (o.mode === 'both' ? ' selected' : '') + '>병행</option></select></label>' +
      '<label><input type="checkbox" id="rsDr"' + (o.draft ? ' checked' : '') + '> 미게시(초안) 포함</label><button class="btn" id="rsGo">실행</button></div><div id="rsOut" style="margin-top:10px"></div></div>';
    $('#rsGo').onclick = run;
  }
  function run() {
    var g = function (id) { return $('#' + id).value; }, out = $('#rsOut');
    try {
      S.sim = { year: +g('rsY'), month: +g('rsM'), day: +g('rsD'), hour: +g('rsH'), minute: 0, gender: g('rsG'), region: g('rsR'), mode: g('rsM2'), draft: $('#rsDr').checked };
      var ch = M.compute({ year: S.sim.year, month: S.sim.month, day: S.sim.day, hour: S.sim.hour, minute: 0, gender: S.sim.gender, calendar: 'solar', school: 'auto' });
      RR.applyPublished(pubView(S.sim.draft));
      var r = RG.get(S.sim.region), tr = RG.tradition(r), d = RR.read(M, ch, tr, { region: r.name, mode: S.sim.mode }), els = RR.EL5.map(function (e) { var a = RR.analyze(M, ch, RR.EL5.indexOf(e), S.sim.mode); return { e: e, a: a }; }), iss = RR.check(d), phStatus = {};
      RR.phrases().forEach(function (p) { phStatus[p.id] = (S.doc.phrases[p.id] || S.doc.custom[p.id] || {}).status || 'none'; });
      RR.applyPublished(null);
      var li = function (a) { return a.length ? '<ul style="margin:2px 0 6px 18px">' + a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="muted" style="margin:2px 0 6px">없음</p>'; }, tx = function (a) { return a.map(function (x) { return x.text; }); };
      var bs = d.basis, ev = d.evidence, sc = ev.scores;
      out.innerHTML = '<p><b>' + esc(r.name) + '</b> ' + esc(d.direction) + (d.deg != null ? ' ' + d.deg + '°' : '') + ' · ' + esc(d.element) + ' → <b>' + esc(d.toneLabel) + '</b> (종합 ' + sc.net + ')</p>' +
        '<p><b>사주</b> ' + esc(bs.zone) + '(돕는 힘 ' + bs.help + '%) · ' + esc(bs.season) + '(월령 ' + esc(bs.seasonEl) + ') · 한난 ' + bs.climate.temp + ' · 조습 ' + bs.climate.hum + ' · 엔진 판정 ' + esc({ eokbu: '억부', johu: '조후', both: '병행' }[bs.verdict]) + ' · 사용한 기준 ' + esc({ eokbu: '억부', johu: '조후', both: '병행' }[bs.mode]) + (d.conflictOn ? ' · <b>충돌</b>(앞세운 기준: ' + esc({ eokbu: '억부', johu: '조후', both: '없음' }[bs.prio]) + ')' : '') + '</p>' +
        '<b>사주와의 관계</b>' + li(tx(d.relation)) + '<b>유리한 점</b>' + li(tx(d.pros)) + '<b>불리한 점</b>' + li(tx(d.cons)) + (d.conflict.length ? '<b>충돌 이유</b>' + li(tx(d.conflict)) : '') + '<b>종합</b>' + li(tx(d.overall)) +
        '<details open><summary><b>같은 사주에서 오행별 판정</b></summary><table style="width:100%;font-size:.82rem"><thead><tr><th>오행</th><th>십성</th><th>억부</th><th>조후</th><th>월령</th><th>억부 점수</th><th>조후 점수</th><th>한난조습</th><th>상생상극</th><th>월령 배율</th><th>종합</th><th>판정</th></tr></thead><tbody>' + els.map(function (x) { var a = x.a; return '<tr><td>' + x.e + '</td><td>' + esc(a.grp) + '</td><td>' + esc(a.eokR) + '</td><td>' + esc(a.johuR) + '</td><td>' + esc(a.mstate) + '</td><td>' + a.E.toFixed(2) + '</td><td>' + a.J.toFixed(2) + '</td><td>' + a.Cl.toFixed(2) + '</td><td>' + a.Rel.toFixed(2) + '</td><td>' + a.sf + '</td><td><b>' + a.net.toFixed(2) + '</b></td><td>' + esc(D.TONE_LABEL[a.tone]) + (a.conflict ? ' ⚔' : '') + '</td></tr>'; }).join('') + '</tbody></table></details>' +
        '<details><summary><b>적용된 문구 ID</b> (' + d.trace.phrases.length + ')</summary><p style="font-size:.8rem">' + d.trace.phrases.map(function (id) { var s = phStatus[id]; return esc(id) + '<span class="muted">[' + (s === 'none' ? '기본' : ST[s]) + ']</span>'; }).join(', ') + '</p></details>' +
        '<details><summary><b>배제된 문구와 사유</b> (' + d.trace.excluded.length + ')</summary>' + li(d.trace.excluded.slice(0, 80).map(function (x) { return x.id + ' — ' + x.why; })) + '</details>' +
        '<p><b>일관성 점검</b> ' + (iss.length ? '<span style="color:#FF8A78">' + esc(iss.join(' / ')) + '</span>' : '문제 없음') + '</p>';
    } catch (e) { RR.applyPublished(null); out.innerHTML = '<p style="color:#FF8A78">' + esc(e.message) + '</p>'; }
  }
  window.V2RegionReading = { open: function (password) { pw = password; root = document.getElementById('t-regionreading'); if (!root || !M || !RR || !D || !RG) return; load(); } };
})();
