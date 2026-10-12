/* 관리자 "풀이 문체" 화면 — 풀이 문체 및 단정성(신중형·직설형·단정형) 설정을 한 화면에서 관리한다. 저장은 /api/style (KV 'style:cfg' · 'style:hist').
   구성: 기본 문체 · 챕터(분야)별 문체 · 유형별 프롬프트 · 권장/지양 표현 · 캐릭터 대사 · 테스트 사주 미리보기(세 문체 비교) · 버전 이력·롤백.
   문체는 표현 강도만 바꾼다 — 계산·근거는 같다는 것을 미리보기의 "근거 서명"으로 확인한다. 이미 저장된 리포트는 건드리지 않고, 새로 생성·재생성할 때부터 이 버전이 적용된다.
   탭: stylecfg. index.html 의 showTab 이 V2Style.open(탭, 비밀번호) 를 부른다. */
(function () {
  'use strict';
  var C = window.V2Content, R = window.ReportV2, esc = C.esc, toast = C.toast;
  var G = { data: null, cfg: null, saved: null, dirty: false, prev: null, TS: { date: '1990-05-15', time: '14:30', gender: 'M', domain: 'MONEY', ai: true } };
  var box = null;
  var KIND_KO = { conclusion: '핵심 결론', basis: '명리학적 근거', reality: '현실의 특징', strengthWeak: '강점과 약점', luck: '운의 흐름', action: '현실적 대응', ai: '' };
  var DOMS = ['SELF', 'MONEY', 'CAREER', 'LOVE', 'MARRIAGE', 'RELATIONSHIP', 'TIMING', 'ACTION'];
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var $ = function (s) { return box.querySelector(s); }, $$ = function (s) { return [].slice.call(box.querySelectorAll(s)); };
  var lines = function (s) { return String(s || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); };
  var api = function (p, o) { return C.api(p, o); };
  var post = function (a, body) { return api('/api/style?a=' + a, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); };
  var sname = function (id) { var s = (G.data.styles || []).filter(function (x) { return x.id === id; })[0]; return s ? s.name : id; };

  var css = document.createElement('style');
  css.textContent = '.st-g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.st-opt{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--bg);cursor:pointer;display:block}.st-opt.on{border-color:var(--gold);background:#1c1a12}.st-opt b{color:var(--ink)}.st-opt small{display:block;color:var(--ink3);margin-top:4px;line-height:1.5}' +
    '.st-sec{margin:22px 0 6px;color:var(--gold);font-family:"Noto Serif KR",serif;font-size:1rem}.st-sec small{display:block;color:var(--ink3);font-family:inherit;font-size:.78rem;margin-top:2px;font-weight:400}' +
    '.st-row{display:grid;grid-template-columns:130px 1fr;gap:8px;align-items:center;margin:4px 0}.st-ta{width:100%;min-height:96px;font-size:.86rem;line-height:1.6}.st-cmp{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-top:10px}' +
    '.st-col{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--bg)}.st-col h4{margin:0 0 6px;color:var(--gold);font-size:.95rem}.st-p{margin:6px 0;line-height:1.75;font-size:.88rem}.st-k{display:inline-block;font-size:.68rem;padding:0 7px;border-radius:999px;border:1px solid var(--line);color:var(--ink3);margin-right:6px}' +
    '.st-badge{display:inline-block;font-size:.74rem;padding:1px 9px;border-radius:999px;border:1px solid var(--line)}.st-badge.PASS{border-color:#62C2AE;color:#7FE0BC}.st-badge.WARNING{border-color:#B8742A;color:#E8B86A}.st-badge.FAIL{border-color:#FF8A78;color:#FF9C8C}' +
    '.st-tb{width:100%;border-collapse:collapse;font-size:.82rem}.st-tb th,.st-tb td{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top}.st-tb th{color:var(--ink3);font-weight:500}' +
    '.st-foot{position:sticky;bottom:0;background:var(--bg2);border-top:1px solid var(--line);padding:10px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:18px;z-index:5}';
  document.head.appendChild(css);

  function load() {
    return api('/api/style?a=cfg').then(function (d) { G.data = d; G.cfg = clone(d.active.config); G.saved = clone(d.active.config); G.dirty = false; });
  }
  function readForm() { // 화면 → G.cfg
    var c = G.cfg;
    var r = $('input[name=stDef]:checked'); if (r) c.defaultStyle = r.value;
    c.chapters = {}; $$('select[data-ch]').forEach(function (s) { if (s.value) c.chapters[s.dataset.ch] = s.value; });
    $$('input[data-extra-ch]').forEach(function (i) { var k = i.value.trim(), sel = i.parentNode.querySelector('select'); if (k && sel && sel.value) c.chapters[k] = sel.value; });
    $$('textarea[data-prompt]').forEach(function (t) { c.prompts[t.dataset.prompt] = t.value; });
    c.preferred = lines($('#stPref').value); c.discouraged = lines($('#stDisc').value);
    c.story = { address: $('#stAddr').value, voice: $('#stVoice').value };
    c.characters = {}; $$('.st-char').forEach(function (r) { var k = r.querySelector('input').value.trim(), v = r.querySelector('textarea').value.trim(); if (k && v) c.characters[k] = v; });
  }
  var dirtyNow = function () { try { readForm(); } catch (e) { } G.dirty = JSON.stringify(G.cfg) !== JSON.stringify(G.saved); var b = $('#stDirty'); if (b) b.textContent = G.dirty ? '저장하지 않은 변경이 있습니다' : '저장된 설정과 같습니다'; };

  function draw() {
    var d = G.data, c = G.cfg, A = d.active;
    var styleOpts = function (cur, withDefault) { return (withDefault ? '<option value="">기본 문체 따름</option>' : '') + d.styles.map(function (s) { return '<option value="' + s.id + '"' + (cur === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join(''); };
    var extra = Object.keys(c.chapters).filter(function (k) { return DOMS.indexOf(k) < 0; });
    box.innerHTML = '<div class="card"><h3 style="margin:0 0 4px">풀이 문체 및 단정성</h3><p class="muted" style="margin:0">문체는 <b>표현의 강도</b>만 바꿉니다. 만세력 계산 결과와 풀이 DB 근거는 어떤 문체를 골라도 같습니다. 이미 만들어 저장된 리포트는 그대로 두고, 새로 만들거나 다시 만들 때부터 적용됩니다.</p>' +
      '<p style="margin:8px 0 0">현재 적용 중: <b style="color:var(--gold)">' + (A.ver ? 'v' + A.ver : '기본값(저장 전)') + '</b> · 기본 문체 ' + esc(sname(A.config.defaultStyle)) + (A.at ? ' <span class="muted">(' + esc(String(A.at).slice(0, 16).replace('T', ' ')) + ')</span>' : '') + ' <span id="stDirty" class="muted" style="margin-left:8px"></span></p></div>' +

      '<div class="st-sec">기본 문체<small>챕터별로 따로 정하지 않은 모든 풀이에 쓰입니다. 처음 값은 단정형입니다.</small></div><div class="st-g3">' +
      d.styles.map(function (s) { return '<label class="st-opt' + (c.defaultStyle === s.id ? ' on' : '') + '"><input type="radio" name="stDef" value="' + s.id + '"' + (c.defaultStyle === s.id ? ' checked' : '') + ' style="width:auto"> <b>' + esc(s.name) + '</b><small>' + esc(s.desc) + '</small></label>'; }).join('') + '</div>' +

      '<div class="st-sec">챕터(분야)별 문체<small>분야마다 다른 문체를 쓸 수 있습니다. 비워 두면 기본 문체를 따릅니다.</small></div><div class="card">' +
      DOMS.map(function (k) { return '<div class="st-row"><span>' + esc(d.domains[k] || k) + '</span><select data-ch="' + k + '">' + styleOpts(c.chapters[k], true) + '</select></div>'; }).join('') +
      '<div class="st-row"><span class="muted">무빙툰 챕터 id</span><span class="muted" style="font-size:.78rem">예: 자식운 챕터의 id 를 넣고 문체를 고르면 그 챕터만 따로 적용됩니다.</span></div>' +
      extra.map(function (k) { return '<div class="st-row"><span><input type="text" data-extra-ch value="' + esc(k) + '" style="width:100%"></span><select>' + styleOpts(c.chapters[k], true) + '</select></div>'; }).join('') +
      '<div class="st-row"><span><input type="text" data-extra-ch placeholder="챕터 id" style="width:100%"></span><select>' + styleOpts('', true) + '</select></div></div>' +

      '<div class="st-sec">유형별 풀이 프롬프트<small>AI 가 풀이를 쓸 때 문체 지시로 붙습니다. 비우면 기본 프롬프트로 돌아갑니다. 아래 “지키는 한계”는 지울 수 없습니다.</small></div>' +
      d.styles.map(function (s) { return '<div class="card" style="margin:8px 0"><b>' + esc(s.name) + '</b> <button type="button" data-reset="' + s.id + '" style="padding:1px 10px;font-size:.76rem;margin-left:6px">기본값으로</button><textarea class="st-ta" data-prompt="' + s.id + '">' + esc(c.prompts[s.id]) + '</textarea></div>'; }).join('') +
      '<details class="card" style="margin:8px 0"><summary class="muted">어떤 문체에서도 지키는 한계(수정 불가) · 풀이 항목 구성</summary><pre style="white-space:pre-wrap;font-size:.8rem;color:var(--ink2)">' + esc(d.hardLimits) + '</pre>' +
      '<table class="st-tb"><tr><th>단계</th><th>구성</th><th>설명</th></tr>' + d.structure.map(function (s, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(s.name) + '</td><td>' + esc(s.guide) + '</td></tr>'; }).join('') + '</table></details>' +

      '<div class="st-sec">권장 표현 · 지양 표현<small>한 줄에 하나씩. 권장 표현은 문체 예시이며, 계산된 사주와 근거에 맞을 때만 쓰입니다. 지양 표현은 반복 사용을 줄이고, 결과 검사에서 비율을 셉니다.</small></div><div class="st-g3">' +
      '<label class="muted" style="font-size:.82rem">권장 표현<textarea id="stPref" class="st-ta">' + esc((c.preferred || []).join('\n')) + '</textarea></label>' +
      '<label class="muted" style="font-size:.82rem">지양 표현(완곡·가능성)<textarea id="stDisc" class="st-ta">' + esc((c.discouraged || []).join('\n')) + '</textarea></label></div>' +

      '<div class="st-sec">캐릭터 대사(연출) 스타일<small>풀이 문체와 분리됩니다. 캐릭터 대사는 세계관 연출이고, 실제 풀이 문장은 위 문체를 따릅니다.</small></div><div class="card">' +
      '<div class="st-row"><span>사용자 호칭</span><input type="text" id="stAddr" value="' + esc(c.story.address) + '" maxlength="12" style="width:160px"></div>' +
      '<label class="muted" style="font-size:.82rem">세계관·말투 지침<textarea id="stVoice" class="st-ta" style="min-height:70px">' + esc(c.story.voice) + '</textarea></label>' +
      '<div class="muted" style="font-size:.82rem;margin-top:8px">캐릭터별 말투(캐릭터 이름 → 말투·성격)</div><div id="stChars">' +
      Object.keys(c.characters).concat(['']).map(function (k) { return '<div class="st-char st-row" style="grid-template-columns:130px 1fr"><input type="text" value="' + esc(k) + '" placeholder="캐릭터 이름"><textarea rows="2" placeholder="말투·성격" style="width:100%">' + esc(c.characters[k] || '') + '</textarea></div>'; }).join('') + '</div></div>' +

      '<div class="st-sec">테스트 사주 · 문체별 결과 비교<small>같은 사주·같은 근거로 세 문체의 결과를 나란히 봅니다. 저장하지 않은 변경도 미리보기에 반영됩니다.</small></div><div class="card">' +
      '<div class="ik-bar" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><label class="fx">생년월일<input type="date" id="stD" value="' + esc(G.TS.date) + '"></label><label class="fx">출생 시간<input type="time" id="stT" value="' + esc(G.TS.time) + '"></label>' +
      '<label class="fx">성별<select id="stG"><option value="M"' + (G.TS.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (G.TS.gender === 'F' ? ' selected' : '') + '>여</option></select></label>' +
      '<label class="fx">풀이 분야<select id="stDom">' + DOMS.map(function (k) { return '<option value="' + k + '"' + (G.TS.domain === k ? ' selected' : '') + '>' + esc(d.domains[k] || k) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fx" style="flex-direction:row;display:flex;gap:6px;align-items:center"><input type="checkbox" id="stAi" style="width:auto"' + (G.TS.ai ? ' checked' : '') + (d.aiAvailable ? '' : ' disabled') + '> AI 로 작성(' + (d.aiAvailable ? '키 있음' : 'AI 키 없음') + ')</label>' +
      '<button type="button" class="pri" id="stRun">세 문체 비교</button></div><div id="stOut" style="margin-top:12px"></div></div>' +

      '<div class="st-sec">버전 이력 · 롤백<small>저장할 때마다 새 버전이 생깁니다. 롤백은 과거 설정을 새 버전으로 다시 저장합니다(이력은 지워지지 않습니다).</small></div><div class="card"><table class="st-tb"><tr><th>버전</th><th>시각</th><th>기본 문체</th><th>메모</th><th></th></tr>' +
      d.hist.map(function (h) { return '<tr><td>' + (h.ver ? 'v' + h.ver : '기본값') + (h.ver === A.ver ? ' <span class="st-badge PASS">적용 중</span>' : '') + '</td><td>' + esc(String(h.at || '').slice(0, 16).replace('T', ' ')) + '</td><td>' + esc(sname(h.defaultStyle)) + '</td><td>' + esc(h.note || '') + (h.rolledBackFrom != null ? ' <span class="muted">(v' + h.rolledBackFrom + ' 에서 롤백)</span>' : '') + '</td><td>' + (h.ver !== A.ver ? '<button type="button" data-rb="' + h.ver + '" style="padding:1px 10px;font-size:.78rem">이 버전으로 되돌리기</button>' : '') + '</td></tr>'; }).join('') + '</table>' +
      (d.hist.length ? '' : '<p class="muted" style="margin:6px 0 0">아직 저장한 이력이 없습니다.</p>') + '</div>' +

      '<div class="st-foot"><input type="text" id="stNote" placeholder="변경 메모(예: 재물 챕터를 직설형으로)" maxlength="120" style="flex:1;min-width:220px"><button type="button" class="pri" id="stSave">저장하고 적용</button><button type="button" id="stRevert">변경 취소</button></div>';
    bind(); dirtyNow();
  }

  function bind() {
    box.oninput = dirtyNow; box.onchange = function (e) { if (e.target.name === 'stDef') $$('.st-opt').forEach(function (l) { l.classList.toggle('on', l.querySelector('input').checked); }); dirtyNow(); };
    $$('button[data-reset]').forEach(function (b) { b.onclick = function () { var t = $('textarea[data-prompt=' + b.dataset.reset + ']'); t.value = G.data.defaults.prompts[b.dataset.reset]; dirtyNow(); }; });
    var ch = $('#stChars'); if (ch) ch.addEventListener('input', function (e) { var rows = $$('.st-char'), last = rows[rows.length - 1]; if (last && (last.querySelector('input').value || last.querySelector('textarea').value)) { var n = last.cloneNode(true); n.querySelector('input').value = ''; n.querySelector('textarea').value = ''; ch.appendChild(n); } });
    $('#stSave').onclick = function () {
      readForm(); var b = this; b.disabled = true;
      C.withBusy(box, function () { return post('save', { config: G.cfg, note: $('#stNote').value }); }).then(function (r) { toast('저장했습니다 · v' + r.active.ver + ' 적용'); return load(); }).then(draw).catch(function (e) { b.disabled = false; toast(e.message, true); });
    };
    $('#stRevert').onclick = function () { G.cfg = clone(G.saved); G.dirty = false; draw(); };
    $$('button[data-rb]').forEach(function (b) { b.onclick = function () {
      if (!confirm('v' + b.dataset.rb + ' 설정으로 되돌립니다. 새 버전으로 저장되며 이후 생성되는 풀이부터 적용됩니다. 계속할까요?')) return;
      post('rollback', { ver: +b.dataset.rb }).then(function (r) { toast('v' + b.dataset.rb + ' 설정을 v' + r.active.ver + ' 로 다시 적용했습니다'); return load(); }).then(draw).catch(function (e) { toast(e.message, true); });
    }; });
    $('#stRun').onclick = run;
  }

  function run() {
    readForm(); var out = $('#stOut'), b = $('#stRun');
    G.TS = { date: $('#stD').value, time: $('#stT').value, gender: $('#stG').value, domain: $('#stDom').value, ai: $('#stAi').checked };
    out.innerHTML = '<p class="muted">계산·작성 중… (세 문체를 차례로 만들어 20~60초 걸릴 수 있습니다)</p>'; b.disabled = true;
    C.engine().then(function (M) {
      var d = G.TS.date.split('-').map(Number), t = (G.TS.time || '12:00').split(':').map(Number);
      var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: G.TS.gender, city: '서울' }), sd = R.SajuData.build(ch, { now: Date.now() }), Y = sd.nowYear, ext = { future: [] };
      try { ext.future = M.seunRange(ch, Y, Y + 4).map(function (x, i) { return { year: Y + i, season: R.SajuData.seasonOf(x.ev) }; }); } catch (e) { }
      return post('preview', { sd: sd, ext: ext, domain: G.TS.domain, config: G.cfg, compose: G.TS.ai ? 'ai' : 'plain' });
    }).then(function (r) { G.prev = r; drawPrev(r); }).catch(function (e) { out.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }).then(function () { b.disabled = false; });
  }
  function paras(r, id) {
    var s = r.styles[id], comp = s.composed;
    if (!comp) return '<p class="muted">' + (r.aiError ? 'AI 결과 없음: ' + esc(r.aiError) : 'AI 합성을 끄고 실행했거나 결과가 없습니다. 아래 “DB 원문”을 보세요.') + '</p>';
    return r.sectionTitles && Object.keys(comp).map(function (sec) { return '<div class="st-p" style="margin-top:12px"><b style="color:var(--ink)">' + esc(r.sectionTitles[sec] || sec) + '</b></div>' + comp[sec].map(function (p) { return '<p class="st-p">' + (KIND_KO[p.kind] ? '<span class="st-k">' + KIND_KO[p.kind] + '</span>' : '') + esc(p.text) + '</p>'; }).join(''); }).join('');
  }
  function drawPrev(r) {
    var out = $('#stOut'), ids = Object.keys(r.styles), same = true;
    var h = '<p style="margin:0 0 8px">근거 서명 <span class="mono" style="font-family:ui-monospace,Consolas,monospace">' + esc(r.factsHash) + '</span> <span class="st-badge PASS">세 문체 모두 같은 계산·같은 근거</span> · 풀이 DB ' + esc(r.versions.knowledge) + ' · 신뢰도 ' + esc(r.confidence) + '</p>';
    if (r.soft && r.soft.length) h += '<p class="muted" style="margin:0 0 8px">근거가 얇아 표현 강도를 한 단계 낮춘 항목: ' + r.soft.map(function (x) { return esc(r.sectionTitles[x] || x); }).join(', ') + '</p>';
    if (r.insufficient && r.insufficient.length) h += '<p class="muted" style="margin:0 0 8px">근거가 없어 쓰지 않은 항목: ' + r.insufficient.map(function (x) { return esc(r.sectionTitles[x] || x); }).join(', ') + '</p>';
    h += '<div class="st-cmp">' + ids.map(function (id) {
      var s = r.styles[id], c = s.check, bad = c ? c.issues.map(function (i) { return '<div class="st-p muted">• ' + esc(i.msg) + '</div>'; }).join('') : '';
      return '<div class="st-col"><h4>' + esc(s.name) + ' ' + (c ? '<span class="st-badge ' + c.status + '">' + c.status + '</span> <span class="muted" style="font-size:.74rem">완곡 문장 ' + Math.round(c.ratio * 100) + '%</span>' : '') + '</h4>' + bad + paras(r, id) + '<details style="margin-top:8px"><summary class="muted" style="font-size:.78rem">이 문체로 AI 에 전달된 지시문</summary><pre style="white-space:pre-wrap;font-size:.74rem;color:var(--ink3)">' + esc(s.directive) + '</pre></details></div>';
    }).join('') + '</div>';
    h += '<details style="margin-top:12px"><summary class="muted">DB 원문(문체 적용 전 · 규칙 기반 합성)</summary>' + Object.keys(r.plain).map(function (sec) { return '<p class="st-p"><b>' + esc(r.sectionTitles[sec] || sec) + '</b></p>' + r.plain[sec].map(function (p) { return '<p class="st-p">' + esc(p.text) + '</p>'; }).join(''); }).join('') + '</details>';
    h += '<div class="st-sec" style="margin-top:16px">근거 연결 상태<small>이 풀이에 실제로 쓰인 풀이 DB 자료와 출처·버전입니다.</small></div>' +
      (r.knowledge.length ? '<table class="st-tb"><tr><th>항목</th><th>풀이</th><th>버전</th><th>신뢰도</th><th>출처 자료</th></tr>' + r.knowledge.map(function (k) { return '<tr><td>' + esc(r.sectionTitles[k.section] || k.section) + '</td><td>' + esc(k.title) + ' <span class="muted mono">' + esc(k.id) + '</span></td><td>' + (k.version ? 'v' + k.version : '-') + '</td><td>' + esc(k.confidence || '') + '</td><td>' + (k.sources.length ? k.sources.map(function (s) { return esc(s.title) + (s.pages ? ' p.' + esc(s.pages) : ''); }).join('<br>') : '<span class="muted">출처 미연결</span>') + '</td></tr>'; }).join('') + '</table>' : '<p class="muted">이 사주에 맞는 검수된 풀이 DB 자료가 없습니다. 이 경우 AI 는 근거를 새로 만들지 않고 해당 항목을 쓰지 않습니다.</p>');
    out.innerHTML = h;
  }

  (window.AdminDirty = window.AdminDirty || {})['풀이 문체'] = function () { return G.dirty; };
  window.V2Style = { open: function (tab, pw) {
    C.setPw(pw); box = document.getElementById('t-' + tab); if (!box) return;
    if (G.dirty && box.querySelector('#stSave')) return;
    box.innerHTML = '<p class="muted">불러오는 중…</p>';
    load().then(draw).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }, _state: G };
})();
