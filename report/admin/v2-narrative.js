/* 관리자 "타임라인 서사 규칙" 탭 — 운명의 타임라인 서사 엔진(report/v2/life-narrative.js)의 복합 규칙을 코드 수정 없이 관리한다(2026-11-08, 2단계).
   ① 규칙 목록(장·상태·검색) ② 편집: 조건(all·any·none)·우선순위·근거 강도·명리 근거·용어·후킹·핵심 성향·생활 사례·갈등과 약점·조언·사용 여부
      — 저장 전 엔진과 같은 검사(validateRule)를 바로 보여 준다. 초안 저장 → 게시 → 게시 취소 → 이력 되돌리기
   ③ 사주별 미리보기: 초안 포함 규칙으로 시범 5장을 조합해 후킹·5단계·근거·대운 이야기·규칙 선택 기록·장 사이 중복 문장을 보여 준다
   ④ 적용률 점검: 무작위 300명으로 장별 적용률·많이 쓰인 규칙·한 번도 안 쓰인 규칙·인생 모양 분포·중복 문장 수
   API: /api/narrative-rules (KV narrative:rules). 게시 전에는 사용자 화면에 영향이 없고, 스위치는 '운세 환경 문구' 탭의 [서사 엔진 켜기]. */
(function () {
  'use strict';
  var pw = '', root, M = window.Manse, L = window.MantraLifeNarrative, D = window.MantraLifeNarrativeData;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); };
  var S = { doc: null, base: [], cur: null, f: { ch: '', st: '', q: '' }, sim: { year: 1992, month: 6, day: 23, hour: 1, minute: 45, gender: 'M', draft: true }, simOut: '', cov: '' };
  var ST = { none: '기본값', draft: '초안', published: '게시됨' };
  var CHN = Object.assign({ timeline_self_03: '종합 · 타고난 기질', timeline_wealth_02: '재물 · 돈 버는 방식', timeline_love_04: '인연 · 사랑할 때', timeline_career_07: '커리어 · 조직생활' }, (D && D.CH_TITLE) || {});
  var TXT = [['hook', '후킹(질문)'], ['core', '핵심 성향'], ['life', '생활 사례'], ['conflict', '갈등과 약점'], ['advice', '현실적인 조언'], ['basis', '명리 근거(펼쳐보기)']];
  var TAG_HELP = 'str:weak|mid|strong|veryweak|verystrong 강약 · root:none|weak|firm 통근 · g:<bi|sik|jae|gwan|in>:heavy(30%↑)|some(10%↑)|light(10%↓)|none(3%↓) 십성 묶음 · dom:<묶음> 가장 큰 묶음 · pat:<관살혼잡·상관견관·재다신약·관살과다·식상과다(설기)·군겁쟁재·효신탈식(도식)·인성과다> · gk:<격 묶음> + gk:seong|part|pa 격국 성패 · u:single|agree|conflict|bridge|jong 통합 판단 방식 · u:prim:eokbu|johu|… 주 기준 · yong:<묶음>|absent 용신 · cl:hot|cold|wet|dry|even 조습 · rel:dm-clash|day-clash|hyeong|wonjin|day-hap|stem-hap 원국 합충 · dj:<묶음> 일지 십성 · spouse:heavy|none|mix 배우자 기운 · tg:pyeonjae:high|jeongjae:high · sex:M|F 성별 · age:senior(만 65세↑)|young(만 20세↓) 나이';

  function call(method, qs, body) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/narrative-rules' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(t, bad) { var m = $('#nrMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function load(note) { return call('GET', '?all=1').then(function (d) { if (!d._ok) { root.innerHTML = '<div class="card"><p class="muted">' + esc(d.error || '불러오지 못했습니다') + '</p></div>'; return; } S.doc = d.doc; S.base = d.base || D.RULES; draw(); if (note) msg(note); }); }
  var itemOf = function (id) { return S.doc && S.doc.rules[id]; };
  var baseOf = function (id) { return S.base.find(function (r) { return r.id === id; }); };
  var stOf = function (id) { var it = itemOf(id); return it ? it.status : 'none'; };
  function effective(id) { var b = baseOf(id), it = itemOf(id); return Object.assign({ id: id, all: [], any: [], none: [], opposes: [], terms: [] }, b || {}, it ? it.fields : {}); }
  function allIds() { var ids = S.base.map(function (r) { return r.id; }); Object.keys(S.doc ? S.doc.rules : {}).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); return ids; }
  // 미리보기·점검용 규칙: 초안 포함이면 저장된 모든 수정본, 아니면 게시본만
  function ruleSet(withDraft) { var items = Object.keys(S.doc.rules).filter(function (id) { var s = S.doc.rules[id].status; return withDraft ? true : s === 'published'; }).map(function (id) { return Object.assign({ id: id }, S.doc.rules[id].fields); }); return L.mergeRules(D.RULES, items); }
  // 조건 입력 ↔ 배열
  var condTxt = function (r) { return { all: (r.all || []).join(', '), any: (r.any || []).map(function (g) { return g.join(', '); }).join(' | '), none: (r.none || []).join(', ') }; };
  var parseList = function (s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
  var parseAny = function (s) { return String(s || '').split('|').map(parseList).filter(function (g) { return g.length; }); };

  function draw() {
    var ids = allIds().filter(function (id) { var r = effective(id); if (S.f.ch && r.chapter !== S.f.ch) return false; if (S.f.st && stOf(id) !== S.f.st) return false; if (S.f.q && (id + ' ' + r.hook + ' ' + r.core).indexOf(S.f.q) < 0) return false; return true; });
    var nPub = Object.keys(S.doc.rules).filter(function (id) { return S.doc.rules[id].status === 'published'; }).length, nDraft = Object.keys(S.doc.rules).filter(function (id) { return S.doc.rules[id].status === 'draft'; }).length;
    root.innerHTML = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">타임라인 서사 규칙</h3>' +
      '<p class="muted" style="margin:0 0 8px">기본 규칙 ' + S.base.length + '개 · 게시된 수정 ' + nPub + '개 · 초안 ' + nDraft + '개. 고친 규칙은 <b>초안 저장 → 미리보기로 확인 → 게시</b> 순서로 반영돼요. 게시해도 \'운세 환경 문구\' 탭의 서사 엔진 스위치가 꺼져 있으면 사용자 화면은 그대로입니다. 전체 인생 흐름 장은 규칙이 아니라 대운 서사로 자동 생성돼요.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>장 <select id="nrCh"><option value="">전체</option>' + Object.keys(CHN).map(function (k) { return '<option value="' + k + '"' + (S.f.ch === k ? ' selected' : '') + '>' + CHN[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>상태 <select id="nrSt"><option value="">전체</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (S.f.st === k ? ' selected' : '') + '>' + ST[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>검색 <input id="nrQ" value="' + esc(S.f.q) + '" style="width:160px"></label><button class="btn" id="nrNew">새 규칙</button><span id="nrMsg" class="muted"></span></div>' +
      '<div style="overflow:auto;max-height:300px;margin-top:8px"><table style="width:100%;font-size:.85rem"><thead><tr><th>ID</th><th>장</th><th>우선</th><th>조건</th><th>상태</th><th>후킹</th></tr></thead><tbody>' +
      ids.map(function (id) { var r = effective(id), c = condTxt(r); return '<tr data-id="' + esc(id) + '" style="cursor:pointer' + (S.cur === id ? ';background:rgba(255,255,255,.08)' : '') + (r.on === false ? ';opacity:.5' : '') + '"><td>' + esc(id) + '</td><td>' + esc(CHN[r.chapter] || r.chapter) + '</td><td>' + r.priority + '</td><td style="font-size:.78rem">' + esc(c.all + (c.any ? ' ＋ [' + c.any + ']' : '')) + '</td><td>' + ST[stOf(id)] + (r.on === false ? ' · 끔' : '') + '</td><td>' + esc(r.hook) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="card" style="margin-top:12px" id="nrEd"></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">사주별 미리보기</h3><div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">' +
      ['year', 'month', 'day', 'hour', 'minute'].map(function (k) { return '<label>' + { year: '년', month: '월', day: '일', hour: '시', minute: '분' }[k] + ' <input data-sim="' + k + '" value="' + (S.sim[k] == null ? '' : S.sim[k]) + '" style="width:' + (k === 'year' ? 64 : 44) + 'px"></label>'; }).join('') +
      '<label>성별 <select data-sim="gender"><option value="M"' + (S.sim.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (S.sim.gender === 'F' ? ' selected' : '') + '>여</option></select></label><label><input type="checkbox" id="nrDraft"' + (S.sim.draft ? ' checked' : '') + '> 초안 포함</label><button class="btn" id="nrRun">미리보기</button><button class="btn" id="nrCov">300명 적용률 점검</button></div>' +
      '<p class="muted" style="margin:6px 0 0">시간을 모르면 시 칸을 비워 두세요. 미리보기는 브라우저에서만 계산하고 아무것도 저장하지 않아요.</p><div id="nrCovOut">' + S.cov + '</div><div id="nrOut" style="margin-top:8px">' + S.simOut + '</div></div>';
    $('#nrCh').onchange = function () { S.f.ch = this.value; draw(); }; $('#nrSt').onchange = function () { S.f.st = this.value; draw(); };
    $('#nrQ').onchange = function () { S.f.q = this.value.trim(); draw(); };
    $('#nrNew').onclick = function () { S.cur = '__new__'; drawEditor(); };
    [].forEach.call(root.querySelectorAll('tr[data-id]'), function (tr) { tr.onclick = function () { S.cur = tr.getAttribute('data-id'); draw(); }; });
    [].forEach.call(root.querySelectorAll('[data-sim]'), function (el) { el.onchange = function () { var k = el.getAttribute('data-sim'), v = el.value.trim(); S.sim[k] = k === 'gender' ? v : v === '' ? null : +v; }; });
    $('#nrDraft').onchange = function () { S.sim.draft = this.checked; };
    $('#nrRun').onclick = runSim; $('#nrCov').onclick = runCoverage;
    drawEditor();
  }

  function drawEditor() {
    var ed = $('#nrEd'); if (!S.cur) { ed.innerHTML = '<p class="muted" style="margin:0">목록에서 규칙을 고르면 여기서 고칠 수 있어요.</p>'; return; }
    var isNew = S.cur === '__new__', r = isNew ? { id: '', chapter: 'timeline_self_03', all: [], any: [], none: [], priority: 80, conf: 'moderate', basis: '', terms: [], hook: '', core: '', life: '', conflict: '', advice: '', on: true } : effective(S.cur), it = isNew ? null : itemOf(S.cur), c = condTxt(r), custom = isNew || (it && it.custom);
    ed.innerHTML = '<h3 style="margin:0 0 6px;color:var(--gold)">' + (isNew ? '새 규칙' : esc(S.cur) + ' <span class="muted" style="font-size:.8rem">' + ST[stOf(S.cur)] + (it ? ' · v' + it.version + (it.by ? ' · ' + esc(it.by) : '') : '') + '</span>') + '</h3>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap">' + (isNew ? '<label>ID <input id="nrId" placeholder="s03-my-rule" style="width:160px"></label>' : '') +
      '<label>장 <select id="nrFch"' + (custom ? '' : ' disabled') + '>' + Object.keys(CHN).map(function (k) { return '<option value="' + k + '"' + (r.chapter === k ? ' selected' : '') + '>' + CHN[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>우선순위 <input id="nrPri" value="' + r.priority + '" style="width:56px"></label><label>근거 강도 <select id="nrConf"><option value="strong"' + (r.conf === 'strong' ? ' selected' : '') + '>높음(구조)</option><option value="moderate"' + (r.conf === 'moderate' ? ' selected' : '') + '>보통(비율)</option></select></label>' +
      '<label><input type="checkbox" id="nrOn"' + (r.on === false ? '' : ' checked') + '> 사용</label></div>' +
      '<p style="margin:8px 0 2px"><b>조건</b> <span class="muted" style="font-size:.8rem">모두 만족(all) + 묶음마다 하나 이상(any, 묶음은 | 로 구분) − 제외(none). 합쳐서 2개 이상.</span></p>' +
      '<label style="display:block">모두 <input id="nrAll" value="' + esc(c.all) + '" style="width:100%"></label><label style="display:block">하나 이상 <input id="nrAny" value="' + esc(c.any) + '" style="width:100%"></label><label style="display:block">제외 <input id="nrNone" value="' + esc(c.none) + '" style="width:100%"></label>' +
      '<details style="margin:4px 0"><summary class="muted">쓸 수 있는 조건 태그</summary><p class="muted" style="font-size:.8rem">' + esc(TAG_HELP) + '</p></details>' +
      TXT.map(function (x) { return '<label style="display:block;margin-top:6px"><b>' + x[1] + '</b><textarea data-tx="' + x[0] + '" rows="' + (x[0] === 'hook' ? 2 : 3) + '" style="width:100%">' + esc(r[x[0]] || '') + '</textarea></label>'; }).join('') +
      '<label style="display:block;margin-top:6px">용어(펼쳐보기 설명, 쉼표) <input id="nrTerms" value="' + esc((r.terms || []).join(', ')) + '" style="width:100%"></label>' +
      '<div id="nrIssues" style="margin-top:8px"></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn" id="nrSave">' + (isNew ? '초안으로 만들기' : '초안 저장') + '</button>' + (isNew ? '' : '<button class="btn" id="nrPub"' + (stOf(S.cur) === 'draft' ? '' : ' disabled') + '>게시</button><button class="btn" id="nrUnpub"' + (stOf(S.cur) === 'published' ? '' : ' disabled') + '>게시 취소</button><button class="btn" id="nrDup">복제해서 새 규칙</button>' + (it && it.custom ? '<button class="btn" id="nrDel">삭제</button>' : '')) + '</div>' +
      (it && it.history.length ? '<details style="margin-top:8px"><summary>이력 ' + it.history.length + '개</summary>' + it.history.slice().reverse().map(function (h) { return '<div class="row" style="gap:8px;align-items:center;margin:3px 0"><span class="muted" style="font-size:.8rem">v' + h.v + ' · ' + ST[h.status] + ' · ' + esc(h.at.slice(0, 16).replace('T', ' ')) + ' · ' + esc(h.by || '') + '</span><button class="btn" data-rv="' + h.v + '">이 판으로 되돌리기(초안)</button></div>'; }).join('') + '</details>' : '');
    var form = function () {
      var f = { all: parseList($('#nrAll').value), any: parseAny($('#nrAny').value), none: parseList($('#nrNone').value), priority: parseInt($('#nrPri').value, 10), conf: $('#nrConf').value, on: $('#nrOn').checked, terms: parseList($('#nrTerms').value) };
      [].forEach.call(ed.querySelectorAll('[data-tx]'), function (t) { f[t.getAttribute('data-tx')] = t.value.trim(); });
      if (custom) f.chapter = $('#nrFch').value;
      return f;
    };
    var check = function () { var f = form(), id = isNew ? ($('#nrId').value.trim() || 'new-rule') : S.cur, issues = L.validateRule(Object.assign({ opposes: [] }, isNew ? {} : effective(S.cur), f, { id: id })); $('#nrIssues').innerHTML = issues.length ? '<div style="color:#FF8A78;font-size:.85rem">' + issues.map(esc).join('<br>') + '</div>' : '<div style="color:#62C2AE;font-size:.85rem">검사 통과 — 복합 조건·근거·5단계 문안·금지어·용어 기준을 만족해요.</div>'; return issues; };
    [].forEach.call(ed.querySelectorAll('input,textarea,select'), function (el) { el.oninput = check; el.onchange = check; }); check();
    var done = function (d, note) { if (!d._ok) return msg(d.error || '실패했습니다', true); load(note); };
    $('#nrSave').onclick = function () {
      if (check().length) return msg('검사를 통과하지 못해 저장하지 않았어요', true);
      if (isNew) { var id = $('#nrId').value.trim(); call('PUT', '', { id: id, action: 'create', fields: form() }).then(function (d) { if (d._ok) S.cur = id; done(d, '새 규칙을 초안으로 만들었어요'); }); }
      else call('PUT', '', { id: S.cur, action: 'save', fields: form() }).then(function (d) { done(d, '초안으로 저장했어요. 미리보기로 확인한 뒤 게시하세요'); });
    };
    if (isNew) return;
    $('#nrPub').onclick = function () { if (confirm(S.cur + ' 규칙을 게시합니다. 서사 엔진 스위치가 켜져 있으면 약 1분 안에 사용자 화면에 반영돼요.')) call('PUT', '', { id: S.cur, action: 'publish' }).then(function (d) { done(d, '게시했어요'); }); };
    $('#nrUnpub').onclick = function () { call('PUT', '', { id: S.cur, action: 'unpublish' }).then(function (d) { done(d, '게시를 취소했어요(기본 규칙으로 돌아가요)'); }); };
    $('#nrDup').onclick = function () { var src = form(), chp = src.chapter || effective(S.cur).chapter; S.cur = '__new__'; drawEditor(); $('#nrPri').value = src.priority; $('#nrConf').value = src.conf; $('#nrAll').value = src.all.join(', '); $('#nrAny').value = src.any.map(function (g) { return g.join(', '); }).join(' | '); $('#nrNone').value = src.none.join(', '); $('#nrTerms').value = src.terms.join(', '); [].forEach.call(ed.querySelectorAll('[data-tx]'), function (t) { t.value = src[t.getAttribute('data-tx')] || ''; }); $('#nrFch').value = chp; check(); };
    if ($('#nrDel')) $('#nrDel').onclick = function () { if (confirm(S.cur + ' 규칙을 삭제합니다. 되돌릴 수 없어요.')) call('PUT', '', { id: S.cur, action: 'delete' }).then(function (d) { if (d._ok) S.cur = null; done(d, '삭제했어요'); }); };
    [].forEach.call(ed.querySelectorAll('[data-rv]'), function (b) { b.onclick = function () { call('PUT', '', { id: S.cur, action: 'restore', v: +b.getAttribute('data-rv') }).then(function (d) { done(d, '그 판으로 되돌려 초안으로 저장했어요'); }); }; });
  }

  // ───── 미리보기: 시범 5장 + 장 사이 중복 표시 ─────
  function runSim() {
    var inp = { year: S.sim.year, month: S.sim.month, day: S.sim.day, hour: S.sim.hour, minute: S.sim.minute || 0, gender: S.sim.gender };
    var ch; try { ch = M.compute(inp); } catch (e) { S.simOut = '<p style="color:#FF8A78">' + esc(e.message) + '</p>'; draw(); return; }
    var rules = ruleSet(S.sim.draft), st = L.newState(), P = L.profile(M, ch), seen = {}, now = Date.now();
    var h = '<p class="muted" style="font-size:.8rem">' + esc(M.gzName(ch.pillars.year) + ' ' + M.gzName(ch.pillars.month) + ' ' + M.gzName(ch.pillars.day) + ' ' + (ch.pillars.hour ? M.gzName(ch.pillars.hour) : '--')) + ' · 통합 판단 ' + esc(ch.unified.headline) + '</p><p style="font-size:.78rem">' + Object.keys(P.tags).map(function (t) { return '<span title="' + esc(P.tags[t]) + '" style="display:inline-block;background:rgba(255,255,255,.08);border-radius:6px;padding:0 6px;margin:2px">' + esc(t) + '</span>'; }).join('') + '</p>';
    Object.keys(L.CHAPTERS).forEach(function (id) {
      var r = L.compose(M, ch, now, id, { rules: rules, state: st });
      h += '<h4 style="margin:14px 0 4px;color:var(--gold)">' + esc(id) + '</h4>';
      if (!r) { h += '<p class="muted">맞는 복합 규칙이 없어요 → 사용자에게는 기존 DB 문안이 나와요.</p>'; return; }
      h += '<p><b>' + esc(r.hook) + '</b> <span class="muted" style="font-size:.8rem">규칙 ' + esc(r.rule) + '</span></p>';
      r.rows.forEach(function (row) {
        var body = row.text.split(/(?<=[.!?])\s+/).map(function (s) { var k = s.replace(/[\s.,!?·—'"‘’“”()]/g, ''); if (k.length >= 12 && seen[k]) return '<mark title="' + esc(seen[k]) + '와 중복">' + esc(s) + '</mark>'; if (k.length >= 12) seen[k] = id; return esc(s); }).join(' ');
        h += '<p style="margin:4px 0"><span class="muted" style="font-size:.8rem">' + esc(row.label) + '</span><br>' + body.replace(/\n\n/g, '<br><br>') + '</p>';
      });
      h += '<details><summary class="muted">명리 근거 · 규칙 선택 기록</summary><div style="font-size:.82rem">' + r.evidence.lines.map(function (x) { return '<p style="margin:3px 0">' + esc(x) + '</p>'; }).join('') + (r.trace || []).map(function (x) { return esc(x.id) + ' — ' + esc(x.result); }).join('<br>') + '</div></details>';
    });
    S.simOut = h; draw();
  }
  // ───── 적용률 점검: 무작위 300명 ─────
  function runCoverage() {
    var rules = ruleSet(S.sim.draft), cover = {}, used = {}, arcs = {}, dups = 0, n = 0, seed = 1108, now = Date.now();
    var rnd = function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    Object.keys(L.CHAPTERS).forEach(function (id) { cover[id] = 0; });
    for (var i = 0; i < 300; i++) {
      var ch; try { ch = M.compute({ year: 1945 + Math.floor(rnd() * 65), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F' }); } catch (e) { continue; }
      n++; var st = L.newState(), seen = {};
      Object.keys(L.CHAPTERS).forEach(function (id) {
        var r = L.compose(M, ch, now, id, { rules: rules, state: st }); if (!r) return; cover[id]++; used[r.rule] = (used[r.rule] || 0) + 1; if (r.arc) arcs[r.arc] = (arcs[r.arc] || 0) + 1;
        r.rows.forEach(function (row) { row.text.split(/(?<=[.!?])\s+/).forEach(function (s) { var k = s.replace(/[\s.,!?·—'"‘’“”()]/g, ''); if (k.length < 12) return; if (seen[k]) dups++; seen[k] = 1; }); });
      });
    }
    var never = rules.filter(function (r) { return r.on !== false && !used[r.id]; }).map(function (r) { return r.id; });
    var top = Object.keys(used).filter(function (k) { return k.indexOf('arc:') !== 0; }).sort(function (a, b) { return used[b] - used[a]; }).slice(0, 5);
    S.cov = '<div style="margin-top:8px;font-size:.85rem"><b>' + n + '명 점검' + (S.sim.draft ? '(초안 포함)' : '(게시본)') + '</b><br>장별 적용률: ' + Object.keys(cover).map(function (id) { return esc(id.replace('timeline_', '')) + ' ' + Math.round(100 * cover[id] / n) + '%'; }).join(' · ') +
      '<br>많이 쓰인 규칙: ' + top.map(function (k) { return esc(k) + ' ' + Math.round(100 * used[k] / n) + '%'; }).join(' · ') + ' <span class="muted">(한 규칙이 한 장에서 40%를 넘으면 너무 흔한 문안이에요)</span>' +
      '<br>한 번도 안 쓰인 규칙: ' + (never.length ? never.map(esc).join(', ') : '없음') +
      '<br>인생 모양: ' + Object.keys(arcs).map(function (k) { return esc(D.ARC[k].name) + ' ' + Math.round(100 * arcs[k] / n) + '%'; }).join(' · ') +
      '<br>장 사이 중복 문장: <b style="color:' + (dups ? '#FF8A78' : '#62C2AE') + '">' + dups + '</b></div>';
    draw();
  }
  window.V2Narrative = { open: function (password) { pw = password || pw; root = document.getElementById('t-narrative'); if (!root) return; if (!L || !D || !M) { root.innerHTML = '<div class="card"><p class="muted">서사 엔진 스크립트를 불러오지 못했어요.</p></div>'; return; } root.innerHTML = '<div class="card"><p class="muted">불러오는 중…</p></div>'; load(); } };
})();
