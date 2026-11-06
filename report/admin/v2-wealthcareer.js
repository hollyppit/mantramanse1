/* 관리자 "직업·돈 버는 방식" 탭 — 직업·활동 적성 고도화(wealth-career.js)의 사전 문구·직업·수익 유형·취약점을 코드 수정 없이 관리한다.
   ① 공개 스위치 ② 문구(수정·조건·우선순위·게시·되돌리기·직접 추가) ③ 직업(속성·연결 규칙·추가·비활성) ④ 수익 유형·취약점(사용 여부·이름·판정 조건 확인) ⑤ 미리보기(판정 근거·적용된 문구 ID·배제 사유)
   API: /api/wealth-career. 게시하기 전에는 사용자 화면에 아무 영향이 없고, 공개 스위치가 꺼져 있으면 게시해도 기존 화면 그대로다.
   미리보기는 브라우저에서 engine.js·wealth-career.js 를 그대로 써서 사용자 화면과 같은 결과를 보여 주며 서버에 아무것도 저장하지 않는다. */
(function () {
  'use strict';
  var pw = '', root, M = window.Manse, W = window.MantraWealthCareer, D = window.MantraWealthCareerData;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); }, $$ = function (s) { return [].slice.call(root.querySelectorAll(s)); };
  var S = { doc: null, base: null, tab: 'flag', f: { sec: '', st: '', q: '' }, cur: null, jobCur: null, newJob: false, sel: {}, sim: { year: 1992, month: 6, day: 23, hour: 2, minute: 0, gender: 'M', draft: true } };
  var ST = { draft: '초안', reviewed: '승인(미게시)', published: '게시됨', none: '기본값' };
  var SEC = { S0: '전체 안내', S1: '01 돈 버는 방식', S2: '02 업무 환경', S3: '03 직업 연결', S4: '04 약점·해결', SP: '구조 설명' };
  var CATS = [['creative', '창작·콘텐츠'], ['planning', '기획·전략'], ['research', '연구·분석'], ['education', '교육·전문성'], ['business', '사업·거래'], ['sales', '영업·유통'], ['management', '운영·관리'], ['organization', '조직·행정'], ['technical', '기술·제작'], ['communication', '소통·관계'], ['asset', '재무·자원관리'], ['public', '공공·제도']];
  var EXP = [['repetitive', '반복성 높은 업무'], ['hierarchy', '강한 위계'], ['speculation', '고변동 단기 판단'], ['competition', '단기 경쟁'], ['lowAutonomy', '낮은 자율성'], ['emotional', '감정 소모 대인'], ['isolated', '홀로 정보 처리'], ['unstructured', '무정형 환경'], ['multitask', '동시다발 조율'], ['slowPayoff', '성과가 늦은 환경']];

  function call(method, qs, body) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/wealth-career' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(t, bad) { var m = $('#wcMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function load(note) {
    return call('GET', '?all=1').then(function (d) {
      if (!d._ok) { root.innerHTML = '<div class="card"><p class="muted">' + esc(d.error || '불러오지 못했습니다') + '</p></div>'; return; }
      S.doc = d.doc; S.base = d.base; draw(); if (note) msg(note);
    });
  }
  var item = function (kind, id) { var h = kind === 'phrase' ? [S.doc.phrases, S.doc.custom] : kind === 'job' ? [S.doc.jobs, S.doc.customJobs] : kind === 'type' ? [S.doc.types, {}] : [S.doc.weak, {}]; return h[0][id] || h[1][id] || null; };
  var stOf = function (kind, id) { var it = item(kind, id); return it ? it.status : 'none'; };
  var fail = function (d) { msg(d.error || '실패했습니다', true); };
  var lines = function (s) { return String(s || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); };
  function hist(kind, id) {
    var it = item(kind, id), h = (it && it.history || []).slice().reverse(); if (!h.length) return '';
    return '<details style="margin-top:8px"><summary>이력 ' + h.length + '건</summary><ul style="margin:6px 0 0 18px">' + h.map(function (x) { return '<li>v' + x.v + ' · ' + ST[x.status] + ' · ' + esc((x.at || '').slice(0, 16).replace('T', ' ')) + (x.by ? ' · ' + esc(x.by) : '') + ' <button class="btn" data-rs="' + x.v + '">이 버전으로 되돌리기</button></li>'; }).join('') + '</ul></details>';
  }
  function bindRestore(kind, id) { $$('#wcEd [data-rs]').forEach(function (b) { b.onclick = function () { call('PUT', '', { kind: kind, id: id, action: 'restore', v: +b.dataset.rs }).then(function (d) { d._ok ? load('되돌렸습니다(초안) — 게시하려면 [저장하고 게시]를 누르세요') : fail(d); }); }; }); }

  // ───────── 화면 골격 ─────────
  function draw() {
    var tabs = [['flag', '공개 스위치'], ['phrase', '문구'], ['job', '직업'], ['type', '수익 유형·취약점'], ['sim', '미리보기·근거']];
    root.innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">직업·돈 버는 방식 관리</h3><p class="muted" style="margin:0 0 8px">사용자 화면의 “직업·활동 적성” 4개 섹션(돈 버는 방식·업무 환경·직업·약점)에 쓰이는 사전 문구와 직업·유형을 관리합니다. 게시한 항목만 반영되고, 수정하면 게시본에서 빠집니다. AI 호출은 없습니다.</p>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' + tabs.map(function (t) { return '<button class="btn' + (S.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' style="outline:2px solid var(--gold)"' : '') + '>' + t[1] + '</button>'; }).join('') + '<span id="wcMsg" class="admin-msg" style="margin-left:8px"></span></div></div><div id="wcBody" style="margin-top:12px"></div>';
    $$('[data-tab]').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; draw(); }; });
    ({ flag: drawFlag, phrase: drawPhrase, job: drawJob, type: drawType, sim: drawSim })[S.tab]();
  }
  function drawFlag() {
    var on = S.doc.enabled === true, pub = counts();
    $('#wcBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">사용자 화면 공개 스위치</h3><p style="margin:0 0 8px">현재: <b style="color:' + (on ? '#62C2AE' : '#E0BC74') + '">' + (on ? '● 켜짐 — 모든 사용자에게 4개 섹션이 보입니다' : '○ 꺼짐 — 사용자 화면은 기존 그대로입니다') + '</b></p>' +
      '<p class="muted" style="margin:0 0 8px">게시된 항목: 문구 ' + pub.phrase + '건 · 직업 ' + pub.job + '건 · 유형/취약점 ' + pub.other + '건. 켜면 약 1분 안에 반영되고 끄면 같은 방식으로 사라집니다(코드 재배포 불필요). 기능 코드가 배포되어 있어야 하며, 배포 전에는 켜도 아무 일도 일어나지 않습니다.</p>' +
      '<div class="row" style="gap:8px"><button class="btn" id="wcOn">켜기</button><button class="btn" id="wcOff">끄기</button></div></div>';
    var set = function (v) { if (v && !confirm('직업·활동 적성 4개 섹션을 모든 사용자에게 공개합니다.\n게시한 문구만 바뀐 문구로 보이고 나머지는 기본 문구입니다.\n켜시겠습니까?')) return; call('PUT', '', { kind: 'flag', enabled: v }).then(function (d) { d._ok ? load(v ? '켰습니다(약 1분 안에 반영)' : '껐습니다(약 1분 안에 반영)') : fail(d); }); };
    $('#wcOn').onclick = function () { set(true); }; $('#wcOff').onclick = function () { set(false); };
  }
  function counts() {
    var n = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k].status === 'published'; }).length; };
    return { phrase: n(S.doc.phrases) + n(S.doc.custom), job: n(S.doc.jobs) + n(S.doc.customJobs), other: n(S.doc.types) + n(S.doc.weak) };
  }

  // ───────── 문구 ─────────
  function allPhrases() {
    var list = S.base.phrases.map(function (p) { var it = S.doc.phrases[p.id], f = it ? it.fields : {}; return { id: p.id, sec: p.sec, cx: p.cx, role: p.role, base: p, tag: f.tag || p.tag, pri: f.pri != null ? f.pri : p.pri, when: f.when || p.when, unless: f.unless || p.unless, basis: f.basis != null ? f.basis : p.basis, on: f.on != null ? f.on : p.on, text: f.text || p.text, custom: false }; });
    Object.keys(S.doc.custom).forEach(function (id) { var f = S.doc.custom[id].fields; list.push({ id: id, sec: f.sec, cx: f.cx, role: f.role, base: null, tag: f.tag, pri: f.pri, when: f.when || [], unless: f.unless || [], basis: f.basis || '', on: f.on !== false, text: f.text, custom: true }); });
    return list;
  }
  function visiblePhrases() { var f = S.f; return allPhrases().filter(function (p) { var st = stOf('phrase', p.id), pub = st === 'published'; return (!f.sec || p.sec === f.sec) && (!f.st || (f.st === 'published' ? pub : f.st === 'draft' ? (st === 'draft' || st === 'reviewed') : st === 'none')) && (!f.q || (p.id + p.text + p.cx).indexOf(f.q) >= 0); }); }
  var selIds = function () { return Object.keys(S.sel).filter(function (k) { return S.sel[k]; }); };
  function bulk(kind, ids, op) {
    if (!ids.length) return; if (!confirm(ids.length + '건을 ' + (op === 'publish' ? '게시' : '게시 취소') + '합니다.' + (op === 'publish' ? '\n수정한 내용이 없는 기본 항목은 게시할 변경이 없어 실패로 표시됩니다.' : ''))) return;
    call('PUT', '', { kind: kind, action: 'bulk', ids: ids.slice(0, 200), op: op }).then(function (d) { S.sel = {}; d._ok ? load((op === 'publish' ? '게시 ' : '게시 취소 ') + d.done + '건' + (d.skipped ? ' · 이미 처리됨 ' + d.skipped + '건' : '') + (d.failed.length ? ' · 실패 ' + d.failed.length + '건: ' + d.failed.slice(0, 2).map(function (x) { return x.id + ' ' + x.error; }).join(' / ') : '')) : fail(d); });
  }
  function drawPhrase() {
    var f = S.f, list = visiblePhrases(), shown = list.slice(0, 150), n = selIds().length;
    $('#wcBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">사전 문구</h3>' +
      '<p class="muted" style="margin:0 0 8px">문구마다 적용 섹션·대상(cx)·역할·적용 조건(when)·제외 조건(unless)·우선순위(pri)·같은 tag끼리 하나만 선택(충돌 제거)·명리학적 근거(basis)·버전·활성 상태를 관리합니다. 조건 문법과 키는 아래 “조건 키 보기”를 참고하세요.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>섹션 <select id="wcSec"><option value="">전체</option>' + Object.keys(SEC).map(function (k) { return '<option value="' + k + '"' + (f.sec === k ? ' selected' : '') + '>' + SEC[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>상태 <select id="wcSt"><option value="">전체</option><option value="published"' + (f.st === 'published' ? ' selected' : '') + '>게시됨</option><option value="draft"' + (f.st === 'draft' ? ' selected' : '') + '>초안/승인</option><option value="none"' + (f.st === 'none' ? ' selected' : '') + '>기본값</option></select></label>' +
      '<label>검색 <input id="wcQ" value="' + esc(f.q) + '" style="width:160px"></label><button class="btn" id="wcNew">새 문구 추가</button></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px"><button class="btn" id="wcBp"' + (n ? '' : ' disabled') + '>선택 게시 (' + n + ')</button><button class="btn" id="wcBu"' + (n ? '' : ' disabled') + '>선택 게시 취소</button><span class="muted">' + list.length + '건' + (list.length > 150 ? ' · 처음 150건만 표시' : '') + '</span></div>' +
      '<div style="overflow:auto;max-height:320px;margin-top:8px"><table style="width:100%;font-size:.84rem"><thead><tr><th style="width:26px"></th><th>ID</th><th>상태</th><th>본문</th></tr></thead><tbody>' + shown.map(function (p) { var st = stOf('phrase', p.id); return '<tr data-id="' + esc(p.id) + '" style="cursor:pointer' + (S.cur === p.id ? ';background:rgba(255,255,255,.07)' : '') + '"><td><input type="checkbox" data-ck="' + esc(p.id) + '"' + (S.sel[p.id] ? ' checked' : '') + '></td><td>' + esc(p.id) + (p.custom ? ' <span class="muted">(추가)</span>' : '') + (p.on ? '' : ' <span style="color:#FF8A78">비활성</span>') + '</td><td>' + ST[st] + '</td><td>' + esc(p.text.slice(0, 60)) + (p.text.length > 60 ? '…' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<details style="margin-top:8px"><summary>조건 키 보기</summary><table style="font-size:.8rem;margin-top:6px"><tbody>' + S.base.factKeys.map(function (k) { return '<tr><td><code>' + esc(k[0]) + '</code></td><td>' + esc(k[1]) + '</td><td>' + esc(k[2]) + '</td></tr>'; }).join('') + '</tbody></table><p class="muted">형식: <code>키=값</code> <code>키!=값</code> (| 로 여러 값) · <code>키~값</code> <code>키!~값</code> (목록 포함 여부) · <code>키&gt;=값</code> <code>키&lt;=값</code> (순서 비교). 적용 조건은 모두 만족해야 하고, 제외 조건은 하나라도 맞으면 빠집니다.</p></details>' +
      '<div id="wcEd" style="margin-top:10px"></div></div>';
    $('#wcSec').onchange = function () { S.f.sec = this.value; drawPhrase(); }; $('#wcSt').onchange = function () { S.f.st = this.value; drawPhrase(); }; $('#wcQ').onchange = function () { S.f.q = this.value.trim(); drawPhrase(); };
    $$('input[data-ck]').forEach(function (cb) { cb.onclick = function (e) { e.stopPropagation(); S.sel[cb.dataset.ck] = cb.checked; var m = selIds().length; $('#wcBp').disabled = $('#wcBu').disabled = !m; $('#wcBp').textContent = '선택 게시 (' + m + ')'; }; });
    $$('tr[data-id]').forEach(function (tr) { tr.onclick = function () { S.cur = tr.dataset.id; drawPhrase(); }; });
    $('#wcBp').onclick = function () { bulk('phrase', selIds(), 'publish'); }; $('#wcBu').onclick = function () { bulk('phrase', selIds(), 'unpublish'); };
    $('#wcNew').onclick = newPhrase;
    if (S.cur) phraseEditor();
  }
  function phraseEditor() {
    var p = allPhrases().filter(function (x) { return x.id === S.cur; })[0]; if (!p) return;
    var st = stOf('phrase', p.id), it = item('phrase', p.id), b = p.base || {};
    $('#wcEd').innerHTML = '<div style="border-top:1px solid var(--line,#333);padding-top:10px"><b>' + esc(p.id) + '</b> · ' + SEC[p.sec] + ' · 대상 ' + esc(p.cx) + ' · 역할 ' + esc(p.role) + ' · ' + ST[st] + (it && it.by ? ' · 마지막 ' + esc(it.by) : '') + (it ? ' · v' + it.version : ' · v1') +
      (b.text ? '<p class="muted" style="margin:4px 0">기본 문구: ' + esc(b.text) + '</p>' : '') +
      '<textarea id="wcTx" rows="3" maxlength="320" style="width:100%">' + esc(p.text) + '</textarea><p class="muted" style="margin:2px 0">{who} = “이름님은”(이름이 없으면 “이 원국은”) · {name} = 이름. 존댓말로 끝나야 하며 단정 표현(반드시·무조건·보장 등)은 저장되지 않습니다.</p>' +
      '<div class="row" style="gap:12px;flex-wrap:wrap;margin-top:6px"><label>우선순위(0~10) <input id="wcPri" type="number" min="0" max="10" step="0.5" value="' + esc(p.pri) + '" style="width:70px"></label><label>tag(같은 tag는 하나만) <input id="wcTag" value="' + esc(p.tag) + '" style="width:160px"></label><label><input type="checkbox" id="wcOnCk"' + (p.on ? ' checked' : '') + '> 활성</label></div>' +
      '<div class="row" style="gap:12px;margin-top:6px;flex-wrap:wrap"><label style="flex:1 1 240px">적용 조건(한 줄에 하나, 모두 만족)<textarea id="wcWhen" rows="3" style="width:100%">' + esc(p.when.join('\n')) + '</textarea></label><label style="flex:1 1 240px">제외 조건(하나라도 맞으면 제외)<textarea id="wcUnl" rows="3" style="width:100%">' + esc(p.unless.join('\n')) + '</textarea></label></div>' +
      '<label style="display:block;margin-top:6px">명리학적 근거 메모 <input id="wcBasis" value="' + esc(p.basis) + '" maxlength="120" style="width:100%"></label>' +
      '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn" data-a="pub">' + (st === 'published' ? '수정해서 다시 게시' : '저장하고 게시') + '</button><button class="btn" data-a="save">수정만 저장(미게시)</button>' + (st === 'published' ? '<button class="btn" data-a="unpublish">게시 취소</button>' : '') + (p.custom ? '<button class="btn" data-a="del">삭제</button>' : '') + '</div>' + hist('phrase', p.id) + '</div>';
    var fields = function () { return { text: $('#wcTx').value, pri: +$('#wcPri').value, tag: $('#wcTag').value.trim(), on: $('#wcOnCk').checked, when: lines($('#wcWhen').value), unless: lines($('#wcUnl').value), basis: $('#wcBasis').value }; };
    $$('#wcEd [data-a]').forEach(function (btn) {
      btn.onclick = function () {
        var a = btn.dataset.a; if (a === 'unpublish') return call('PUT', '', { kind: 'phrase', id: p.id, action: 'unpublish' }).then(function (d) { d._ok ? load('게시를 취소했습니다') : fail(d); });
        if (a === 'del') { if (!confirm('이 문구를 삭제합니다(직접 추가한 문구만).')) return; return call('PUT', '', { kind: 'phrase', id: p.id, action: 'delete' }).then(function (d) { if (d._ok) { S.cur = null; load('삭제했습니다'); } else fail(d); }); }
        call('PUT', '', { kind: 'phrase', id: p.id, action: 'save', fields: fields() }).then(function (d) { if (!d._ok) return fail(d); if (a === 'save') return load('저장했습니다(미게시)'); return call('PUT', '', { kind: 'phrase', id: p.id, action: 'approve_publish' }).then(function (d2) { d2._ok ? load('게시했습니다') : fail(d2); }); });
      };
    });
    bindRestore('phrase', p.id);
  }
  function newPhrase() {
    $('#wcEd').innerHTML = '<div style="border-top:1px solid var(--line,#333);padding-top:10px"><b>새 문구 추가</b><p class="muted" style="margin:4px 0">추가한 문구는 조건에 맞을 때 같은 자리(섹션·대상·역할)의 다른 문구와 함께 후보가 되고, 우선순위가 높고 같은 tag면 기본 문구를 대신합니다.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><label>ID <input id="npId" placeholder="S1.tech.risk.custom1" style="width:200px"></label><label>섹션 <select id="npSec">' + ['S1', 'S2', 'S3', 'S4'].map(function (k) { return '<option value="' + k + '">' + SEC[k] + '</option>'; }).join('') + '</select></label><label>대상(cx) <input id="npCx" placeholder="tech / org.ind / pricing / cohere" style="width:170px"></label><label>역할(role) <input id="npRole" placeholder="risk / strength / note" style="width:150px"></label></div>' +
      '<textarea id="npTx" rows="3" maxlength="320" style="width:100%;margin-top:6px" placeholder="존댓말 문구"></textarea><button class="btn" id="npGo" style="margin-top:6px">추가(초안)</button></div>';
    $('#npGo').onclick = function () { var id = $('#npId').value.trim(); call('PUT', '', { kind: 'phrase', id: id, action: 'create', fields: { sec: $('#npSec').value, cx: $('#npCx').value.trim(), role: $('#npRole').value.trim(), text: $('#npTx').value, when: [], unless: [], pri: 2 } }).then(function (d) { if (d._ok) { S.cur = id; load('추가했습니다(초안) — 조건·우선순위를 다듬고 게시하세요'); } else fail(d); }); };
  }

  // ───────── 직업 ─────────
  function allJobs() {
    var list = S.base.jobs.map(function (j) { var it = S.doc.jobs[j.id], f = it ? it.fields : {}; return Object.assign({}, j, f, { _custom: false }); });
    Object.keys(S.doc.customJobs).forEach(function (id) { list.push(Object.assign({ id: id, _custom: true }, S.doc.customJobs[id].fields)); });
    return list;
  }
  function drawJob() {
    var list = allJobs();
    $('#wcBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">직업 DB</h3><p class="muted" style="margin:0 0 8px">직업은 오행 하나로 고정하지 않고 쓰이는 오행(2개 이상)·활동 분야·수익 유형 연결·선호 업무 환경을 겹쳐서 정의합니다. 명리상 적합과 별개로 진입 조건(자격/경력/자유)을 따로 표시합니다. 자격·경로 문구는 검증된 정보만 적고, 확실하지 않으면 비워 두세요.</p>' +
      '<div class="row" style="gap:8px;margin-bottom:8px"><button class="btn" id="jbNew">새 직업 추가</button><span class="muted">' + list.length + '개</span></div>' +
      '<div style="overflow:auto;max-height:280px"><table style="width:100%;font-size:.84rem"><thead><tr><th>ID</th><th>이름</th><th>분류</th><th>진입</th><th>사용</th><th>상태</th></tr></thead><tbody>' + list.map(function (j) { return '<tr data-jid="' + esc(j.id) + '" style="cursor:pointer' + (S.jobCur === j.id ? ';background:rgba(255,255,255,.07)' : '') + '"><td>' + esc(j.id) + (j._custom ? ' <span class="muted">(추가)</span>' : '') + '</td><td>' + esc(j.name) + '</td><td>' + esc(j.grp) + '</td><td>' + esc(j.barrier) + '</td><td>' + (j.on === false ? '<span style="color:#FF8A78">비활성</span>' : '사용') + '</td><td>' + ST[stOf('job', j.id)] + '</td></tr>'; }).join('') + '</tbody></table></div><div id="wcEd" style="margin-top:10px"></div></div>';
    $$('tr[data-jid]').forEach(function (tr) { tr.onclick = function () { S.jobCur = tr.dataset.jid; S.newJob = false; drawJob(); }; });
    $('#jbNew').onclick = function () { S.newJob = true; S.jobCur = null; jobEditor({ id: '', name: '', grp: 'custom', els: {}, cats: {}, types: {}, env: {}, exposes: [], barrier: 'experience', how: '', income: '', caution: '', path: '', on: true, _custom: true }, true); };
    if (S.jobCur) { var j = list.filter(function (x) { return x.id === S.jobCur; })[0]; if (j) jobEditor(j, false); }
  }
  function numInputs(prefix, pairs, vals) { return pairs.map(function (p) { return '<label style="display:inline-block;margin:2px 8px 2px 0">' + esc(p[1]) + ' <input data-' + prefix + '="' + p[0] + '" type="number" min="0" max="1" step="0.1" value="' + (vals && vals[p[0]] != null ? vals[p[0]] : '') + '" style="width:58px"></label>'; }).join(''); }
  function jobEditor(j, isNew) {
    var st = isNew ? 'none' : stOf('job', j.id), it = isNew ? null : item('job', j.id);
    $('#wcEd').innerHTML = '<div style="border-top:1px solid var(--line,#333);padding-top:10px"><b>' + (isNew ? '새 직업' : esc(j.id)) + '</b> · ' + ST[st] + (it && it.by ? ' · 마지막 ' + esc(it.by) : '') +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">' + (isNew ? '<label>ID <input id="jbId" placeholder="my-job" style="width:130px"></label>' : '') + '<label>이름 <input id="jbName" value="' + esc(j.name) + '" maxlength="30" style="width:200px"></label><label>분류(grp) <input id="jbGrp" value="' + esc(j.grp) + '" style="width:90px"></label><label>진입 <select id="jbBar">' + [['license', '자격·면허'], ['experience', '경력·포트폴리오'], ['open', '자유 진입']].map(function (b) { return '<option value="' + b[0] + '"' + (j.barrier === b[0] ? ' selected' : '') + '>' + b[1] + '</option>'; }).join('') + '</select></label><label><input type="checkbox" id="jbOn"' + (j.on !== false ? ' checked' : '') + '> 사용</label></div>' +
      '<p style="margin:8px 0 2px"><b>수익 유형 연결</b> <span class="muted">0~1, 연결 없으면 비움(하나 이상)</span></p>' + numInputs('ty', D.TYPES.map(function (t) { return [t.id, t.name]; }), j.types) +
      '<p style="margin:8px 0 2px"><b>활동 분야 연결</b> <span class="muted">기존 12개 분야 점수와 합산(하나 이상)</span></p>' + numInputs('ct', CATS, j.cats) +
      '<p style="margin:8px 0 2px"><b>쓰이는 오행 비중</b> <span class="muted">2개 이상 — 오행 하나로 고정하지 않습니다</span></p>' + numInputs('el', [['목', '목'], ['화', '화'], ['토', '토'], ['금', '금'], ['수', '수']], j.els) +
      '<p style="margin:8px 0 2px"><b>선호 업무 환경</b></p><div>' + D.AXES.map(function (a) { return '<label style="margin-right:10px">' + esc(a.name.split(' / ')[0] + '/' + (a.name.split(' / ')[1] || '').replace(' 중심', '')) + ' <select data-ev="' + a.id + '"><option value="">상관없음</option>' + Object.keys(a.verdicts).filter(function (k) { return k !== 'mix'; }).map(function (k) { return '<option value="' + k + '"' + ((j.env || {})[a.id] === k ? ' selected' : '') + '>' + a.verdicts[k] + '</option>'; }).join('') + '</select></label>'; }).join('') + '</div>' +
      '<p style="margin:8px 0 2px"><b>이 직무에 포함될 수 있는 부담 환경</b> <span class="muted">원국상 그 환경의 부담이 크면 순위가 내려갑니다</span></p><div>' + EXP.map(function (e) { return '<label style="margin-right:10px"><input type="checkbox" data-ex="' + e[0] + '"' + ((j.exposes || []).indexOf(e[0]) >= 0 ? ' checked' : '') + '> ' + e[1] + '</label>'; }).join('') + '</div>' +
      ['how|적합한 업무 방식', 'income|수익 창출 방식', 'caution|주의할 점', 'path|관련 자격·경력 경로(검증된 정보만, 비워도 됨)'].map(function (x) { var k = x.split('|'); return '<label style="display:block;margin-top:6px">' + k[1] + '<textarea data-jt="' + k[0] + '" rows="2" maxlength="320" style="width:100%">' + esc(j[k[0]] || '') + '</textarea></label>'; }).join('') +
      '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn" data-a="pub">' + (st === 'published' ? '수정해서 다시 게시' : '저장하고 게시') + '</button><button class="btn" data-a="save">수정만 저장(미게시)</button>' + (st === 'published' ? '<button class="btn" data-a="unpublish">게시 취소</button>' : '') + (j._custom && !isNew ? '<button class="btn" data-a="del">삭제</button>' : '') + '</div>' + (isNew ? '' : hist('job', j.id)) + '</div>';
    var grab = function (attr) { var o = {}; $$('#wcEd [data-' + attr + ']').forEach(function (i) { if (i.value !== '') o[i.dataset[attr]] = +i.value; }); return o; };
    var fields = function () { var env = {}; $$('#wcEd [data-ev]').forEach(function (s) { if (s.value) env[s.dataset.ev] = s.value; }); var jt = {}; $$('#wcEd [data-jt]').forEach(function (t) { jt[t.dataset.jt] = t.value; }); return Object.assign({ name: $('#jbName').value, grp: $('#jbGrp').value.trim(), barrier: $('#jbBar').value, on: $('#jbOn').checked, types: grab('ty'), cats: grab('ct'), els: grab('el'), env: env, exposes: $$('#wcEd [data-ex]').filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.ex; }) }, jt); };
    $$('#wcEd [data-a]').forEach(function (btn) {
      btn.onclick = function () {
        var a = btn.dataset.a, id = isNew ? ($('#jbId').value.trim()) : j.id;
        if (a === 'unpublish') return call('PUT', '', { kind: 'job', id: id, action: 'unpublish' }).then(function (d) { d._ok ? load('게시를 취소했습니다') : fail(d); });
        if (a === 'del') { if (!confirm('이 직업을 삭제합니다(직접 추가한 직업만).')) return; return call('PUT', '', { kind: 'job', id: id, action: 'delete' }).then(function (d) { if (d._ok) { S.jobCur = null; load('삭제했습니다'); } else fail(d); }); }
        var go = isNew ? call('PUT', '', { kind: 'job', id: id, action: 'create', fields: fields() }) : call('PUT', '', { kind: 'job', id: id, action: 'save', fields: fields() });
        go.then(function (d) { if (!d._ok) return fail(d); S.jobCur = id; S.newJob = false; if (a === 'save') return load('저장했습니다(미게시)'); return call('PUT', '', { kind: 'job', id: id, action: 'approve_publish' }).then(function (d2) { d2._ok ? load('게시했습니다') : fail(d2); }); });
      };
    });
    if (!isNew) bindRestore('job', j.id);
  }

  // ───────── 수익 유형 · 취약점 ─────────
  function drawType() {
    var row = function (kind, id, name, plain, on, cond, extra) {
      var st = stOf(kind, id), f = (item(kind, id) || { fields: {} }).fields;
      return '<tr data-k="' + kind + '" data-i="' + id + '"><td><input type="checkbox" data-on' + (f.on != null ? (f.on ? ' checked' : '') : (on ? ' checked' : '')) + '></td><td>' + (kind === 'type' ? '<input data-nm value="' + esc(f.name || name) + '" style="width:130px">' : esc(name)) + '</td><td>' + (kind === 'type' ? '<input data-pl value="' + esc(f.plain || plain) + '" style="width:240px">' : esc(plain)) + '</td><td>' + ST[st] + '</td><td><button class="btn" data-go>저장하고 게시</button></td></tr>' + (cond ? '<tr><td></td><td colspan="4" class="muted" style="font-size:.78rem">판정 조건(읽기 전용): ' + esc(cond) + '</td></tr>' : '');
    };
    $('#wcBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">수익 유형</h3><p class="muted" style="margin:0 0 8px">유형을 끄면 판정 후보에서 빠집니다(해당 유형 문구·직업 연결은 남아 있어도 사용되지 않음). 판정 조건은 코드에 정의된 근거·관문이며 여기서는 확인만 합니다. 특정 십성이 있다는 이유만으로 유형이 확정되지 않습니다.</p><table style="width:100%;font-size:.84rem"><thead><tr><th>사용</th><th>이름</th><th>설명</th><th>상태</th><th></th></tr></thead><tbody>' + S.base.types.map(function (t) { return row('type', t.id, t.name, t.plain, true, t.cond); }).join('') + '</tbody></table></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">취약점(돈을 벌 때의 약점)</h3><p class="muted" style="margin:0 0 8px">끄면 선택 후보에서 빠집니다. 문구는 [문구] 탭의 섹션 “04 약점·해결”에서 관리합니다.</p><table style="width:100%;font-size:.84rem"><tbody>' + S.base.weak.map(function (w) { return row('weak', w.id, w.id, w.domain, true, ''); }).join('') + '</tbody></table></div>';
    $$('tr[data-k]').forEach(function (tr) {
      tr.querySelector('[data-go]').onclick = function () {
        var kind = tr.dataset.k, id = tr.dataset.i, on = tr.querySelector('[data-on]').checked, fields = { on: on };
        if (kind === 'type') { fields.name = tr.querySelector('[data-nm]').value; fields.plain = tr.querySelector('[data-pl]').value; }
        call('PUT', '', { kind: kind, id: id, action: 'save', fields: fields }).then(function (d) { if (!d._ok) return fail(d); return call('PUT', '', { kind: kind, id: id, action: 'approve_publish' }).then(function (d2) { d2._ok ? load('게시했습니다') : fail(d2); }); });
      };
    });
  }

  // ───────── 미리보기 ─────────
  function pubView(withDraft) {
    var pick = function (o) { var r = {}; Object.keys(o || {}).forEach(function (k) { if (o[k].status === 'published' || (withDraft && o[k].status !== 'published')) r[k] = o[k].fields; }); return r; };
    var arr = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k].status === 'published' || withDraft; }).map(function (k) { return Object.assign({ id: k }, o[k].fields); }); };
    return { phrases: pick(S.doc.phrases), custom: arr(S.doc.custom), jobs: pick(S.doc.jobs), customJobs: arr(S.doc.customJobs), types: pick(S.doc.types), weak: pick(S.doc.weak) };
  }
  function drawSim() {
    var o = S.sim, num = function (id, v, w) { return '<input id="' + id + '" type="number" value="' + v + '" style="width:' + (w || 70) + 'px">'; };
    $('#wcBody').innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">사주 입력 후 결과 미리보기</h3><p class="muted" style="margin:0 0 8px">사용자 화면과 같은 엔진으로 4개 섹션을 계산하고 구조 판정 근거, 적용된 문구 ID, 배제된 문구와 사유를 보여 줍니다. 서버에 저장하지 않습니다. 시주를 모르면 시를 비워 두세요.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>생년 ' + num('smY', o.year) + '</label><label>월 ' + num('smM', o.month, 50) + '</label><label>일 ' + num('smD', o.day, 50) + '</label><label>시 <input id="smH" type="number" value="' + (o.hour == null ? '' : o.hour) + '" style="width:50px"></label><label>분 ' + num('smMi', o.minute, 50) + '</label><label>성별 <select id="smG"><option value="M"' + (o.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (o.gender === 'F' ? ' selected' : '') + '>여</option></select></label><label><input type="checkbox" id="smDr"' + (o.draft ? ' checked' : '') + '> 미게시(초안) 포함</label><button class="btn" id="smGo">실행</button></div><div id="smOut" style="margin-top:10px"></div></div>';
    $('#smGo').onclick = runSim;
  }
  function runSim() {
    var g = function (id) { return $('#' + id).value; }, out = $('#smOut');
    try {
      var h = g('smH'); S.sim = { year: +g('smY'), month: +g('smM'), day: +g('smD'), hour: h === '' ? null : +h, minute: +g('smMi'), gender: g('smG'), draft: $('#smDr').checked };
      var ch = M.compute({ year: S.sim.year, month: S.sim.month, day: S.sim.day, hour: S.sim.hour, minute: S.sim.hour == null ? null : S.sim.minute, gender: S.sim.gender, calendar: 'solar', school: 'auto' });
      W.applyPublished(pubView(S.sim.draft)); var r = W.build(M, ch, {}), pubIds = {}; W.applyPublished(null);
      var stOfId = function (id) { var s = stOf('phrase', id); return s === 'none' ? '기본' : ST[s]; };
      var li = function (a) { return a.length ? '<ul style="margin:2px 0 6px 18px">' + a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="muted" style="margin:2px 0 6px">없음</p>'; };
      var p = r.s1.primary;
      var h2 = '<p><b>원국</b> ' + esc(r.zone.label) + '(돕는 힘 ' + r.zone.help + '%) · 억부 ' + esc(r.yong[0].el + '(' + r.yong[0].group + ')') + ' · 조후 ' + esc(r.yong[1].el + '(' + r.yong[1].group + ')') + (r.yongDiffer ? ' · <b>억부≠조후</b>' : '') + '</p>' +
        '<p><b>대표 유형</b> ' + (p ? esc(p.name) + ' (근거 수준 ' + r.s1.conf + (r.s1.tie ? ', 보조와 근접' : '') + ')' : '확정하지 않음(근거 부족)') + ' · <b>보조</b> ' + (r.s1.secondary.map(function (s) { return esc(s.name); }).join(', ') || '-') + '</p>' +
        '<p><b>업무 환경</b> ' + r.s2.axes.map(function (a) { return esc(a.label); }).join(' / ') + '</p><p><b>직업</b> ' + r.s3.jobs.map(function (j) { return esc(j.name) + '(' + esc(j.typeName) + ' ' + j._fit.total + ')'; }).join(', ') + '</p><p><b>약점</b> ' + r.s4.items.map(function (i) { return esc(i.id) + '(' + i.levelLabel + ')'; }).join(', ') + ' <span class="muted">후보 점수: ' + r.s4.ranking.slice(0, 6).map(function (x) { return x.id + ' ' + x.score; }).join(' · ') + '</span></p>' +
        '<details open><summary><b>구조 판정</b></summary><table style="width:100%;font-size:.82rem"><tbody>' + r.structures.map(function (s) { return '<tr><td>' + esc(s.name) + '</td><td><b>' + s.label + '</b></td><td>' + esc(s.evidence.join(' · ')) + (s.miss.length ? ' <span style="color:#FF8A78">부족: ' + esc(s.miss.join(' / ')) + '</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></details>' +
        '<details><summary><b>수익 유형 점수·관문</b></summary><table style="width:100%;font-size:.82rem"><tbody>' + r.s1.rows.map(function (t) { return '<tr><td>' + esc(t.name) + '</td><td>' + t.score + '</td><td>' + (t.qualified ? '충족' : t.gate ? '관문 통과·점수 부족' : '관문 미충족') + '</td><td>' + esc(t.via.join(' · ')) + '</td></tr>'; }).join('') + '</tbody></table></details>' +
        '<details><summary><b>적용된 문구 ID</b> (' + r.trace.phrases.length + ')</summary><p style="font-size:.8rem">' + r.trace.phrases.map(function (id) { return esc(id) + '<span class="muted">[' + stOfId(id) + ']</span>'; }).join(', ') + '</p></details>' +
        '<details><summary><b>배제된 문구와 사유</b> (' + r.trace.excluded.length + ')</summary>' + li(r.trace.excluded.slice(0, 60).map(function (x) { return x.id + ' — ' + x.why; })) + '</details>' +
        '<details><summary><b>중복·반복으로 뺀 문장</b> (' + r.trace.deduped.length + ')</summary>' + li(r.trace.deduped) + '</details>' +
        '<p><b>일관성 점검</b> ' + (r.issues.length ? '<span style="color:#FF8A78">' + esc(r.issues.join(' / ')) + '</span>' : '문제 없음') + '</p>';
      out.innerHTML = h2;
    } catch (e) { W.applyPublished(null); out.innerHTML = '<p style="color:#FF8A78">' + esc(e.message) + '</p>'; }
  }
  window.V2Wealth = { open: function (password) { pw = password; root = document.getElementById('t-wealthcareer'); if (!root || !M || !W || !D) return; load(); } };
})();
