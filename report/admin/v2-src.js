/* 관리자 "풀이 자료" — 명리학 자료(PDF·MD·TXT·직접 입력)를 올리면 AI 가 풀이 지식 후보로 정리하고, 관리자가 검수·승인해 풀이 지식에 쌓는다.
   저장은 /api/src. PDF 글자는 이 브라우저에서 쪽 단위로 뽑아 올리고(원본 파일은 따로 보관), MD/TXT 는 제목·줄 번호를 보존한다.
   AI 가 올리는 것은 "후보"뿐이고, 승인 전에는 풀이 지식 DB 에 아무것도 쓰이지 않는다. 승인 후 풀이 지식 화면(V2IK)·풀이 테스트와 근거 자료로 이어진다. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, PW = '', PANE = null;
  var $ = function (s, e) { return (e || PANE || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || PANE || document).querySelectorAll(s)); };
  var G = { docs: [], stats: null, view: 'docs', filter: 'all', q: '', doc: null, cands: [], cf: 'all', docSel: '', sel: {}, open: null, gapFilter: null, run: false };
  var THEORY = ['억부', '조후', '격국', '십성', '일주론', '신살', '궁성론', '대운', '세운', '기타'], KIND = { book: '서적', expert: '전문가 자료', internal: '내부 정리', research: '연구·논문' };
  var STATUS = { need: '분석 필요', analyzed: '분석 완료', review: '검수 중', done: '완료' }, DOMAIN = { SELF: '나 자신', MONEY: '재물', CAREER: '직업·사업', LOVE: '연애', MARRIAGE: '결혼', RELATIONSHIP: '인간관계', TIMING: '운의 흐름', ACTION: '행동/개운' };
  var CMP = { new: '새로운 풀이', similar: '유사 풀이 있음', identical: '거의 동일', reinforce: '기존 풀이 보강 가능' }, CONF = { high: '높음', mid: '보통', low: '낮음' };
  var EFFECT = { strengthen: '더 강해짐', soften: '완화됨', replace: '다른 해석으로 대체', exception: '예외' };

  var css = document.createElement('style');
  css.textContent = '.sr-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}.sr-bar select,.sr-bar input{width:auto;min-width:110px}.sr-bar input.q{flex:1;min-width:200px}.sr-chip{border-radius:999px;padding:4px 12px;font-size:.82rem}.sr-chip.on{border-color:var(--gold);color:var(--gold);background:#1c1a12}' +
    '.sr-dash{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin:10px 0}.sr-dash .n{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 12px}.sr-dash b{display:block;font-size:1.25rem;color:var(--gold)}.sr-dash span{font-size:.74rem;color:var(--ink3)}' +
    '.sr-row{display:grid;grid-template-columns:minmax(0,2fr) 70px 90px 90px 90px 80px;gap:8px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--line);cursor:pointer;font-size:.84rem}.sr-row:hover{background:#12162a}.sr-row.h{color:var(--ink3);font-size:.75rem;cursor:default}.sr-row.h:hover{background:none}.sr-row small{display:block;color:var(--ink3)}@media(max-width:900px){.sr-row{grid-template-columns:1fr 90px}.sr-row>:nth-child(2),.sr-row>:nth-child(3),.sr-row>:nth-child(4),.sr-row>:nth-child(6){display:none}}' +
    '.sr-st{display:inline-block;font-size:.72rem;padding:0 8px;border-radius:999px;border:1px solid var(--line);color:var(--ink2);white-space:nowrap}.sr-st.good{border-color:#62C2AE;color:#7FE0BC}.sr-st.warn{border-color:#B8742A;color:#FFC080}.sr-st.bad{border-color:#FF8A78;color:#FF9C8C}.sr-st.ai{border-color:#9B7BFF;color:#C9B8FF}' +
    '.sr-drop{border:2px dashed var(--line);border-radius:12px;padding:26px;text-align:center;color:var(--ink2);cursor:pointer;background:var(--bg)}.sr-drop.over{border-color:var(--gold);color:var(--gold)}.sr-drop b{display:block;font-size:1.05rem;color:var(--ink)}' +
    '.sr-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:800px){.sr-g2{grid-template-columns:1fr}}.sr-f{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:8px 0}.sr-opts{display:flex;flex-wrap:wrap;gap:4px 12px}.sr-opts label{display:flex;gap:4px;align-items:center;font-size:.84rem}.sr-opts input{width:auto}' +
    '.sr-prog{height:8px;border-radius:4px;background:#1b1f30;overflow:hidden;margin:6px 0}.sr-prog i{display:block;height:100%;background:var(--gold);transition:width .3s}.sr-k{border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:6px 0;font-size:.84rem;background:var(--bg)}.sr-k .why{color:var(--ink3);font-size:.78rem;margin-top:2px}' +
    '.sr-cand{display:grid;grid-template-columns:24px minmax(0,1.6fr) 90px minmax(0,1fr) 84px 84px;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--line);cursor:pointer;font-size:.84rem}.sr-cand:hover{background:#12162a}.sr-cand.on{background:#1c1a12}.sr-cand input{width:auto}.sr-cand small{display:block;color:var(--ink3)}@media(max-width:900px){.sr-cand{grid-template-columns:24px 1fr 84px}.sr-cand>:nth-child(3),.sr-cand>:nth-child(4),.sr-cand>:nth-child(5){display:none}}' +
    '.sr-rev{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start}@media(max-width:1000px){.sr-rev{grid-template-columns:1fr}}.sr-rev .card{padding:12px;max-height:68vh;overflow:auto}.sr-src{white-space:pre-wrap;line-height:1.8;font-size:.88rem}.sr-src mark{background:#5a4a14;color:#fff;border-radius:3px;padding:0 2px}' +
    '.sr-label{font-size:.72rem;letter-spacing:.14em;color:var(--gold);margin:12px 0 4px}.sr-ck{display:flex;gap:8px;font-size:.84rem;padding:3px 0}.sr-ck i{font-style:normal;min-width:64px}.sr-ck .PASS{color:#7FE0BC}.sr-ck .WARNING{color:#FFC080}.sr-ck .FAIL{color:#FF9C8C}' +
    '.sr-foot{position:sticky;bottom:0;background:var(--bg2);border-top:1px solid var(--line);padding:10px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;z-index:5}dialog.sr-dlg{width:min(960px,96vw);max-height:94vh;overflow:auto;padding:16px}';
  document.head.appendChild(css);

  /* ───────── 통신(상태 코드·본문을 그대로 돌려준다 — 충돌·중복 안내에 쓴다) ───────── */
  function req(a, o) { o = o || {}; return fetch('/api/src?a=' + a + (o.q ? '&' + o.q : ''), { method: o.body !== undefined ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + PW, 'content-type': 'application/json' }, body: o.body !== undefined ? (o.raw ? o.body : JSON.stringify(o.body)) : undefined }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { s: r.status, ok: r.ok, d: d }; }); }); }
  function must(a, o) { return req(a, o).then(function (r) { if (!r.ok) { var e = new Error(r.d.error || ('오류 ' + r.s)); e.res = r; throw e; } return r.d; }); }
  function shut(d) { try { d.close(); } catch (e) { } d.remove(); } // close 이벤트에 기대지 않고 바로 치운다
  var date = function (s) { return s ? String(s).slice(0, 10) : ''; }, clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var chip = function (cls, t) { return '<span class="sr-st ' + cls + '">' + esc(t) + '</span>'; };
  var sentence = function (c) { return window.V2IK && window.V2IK._sentence ? window.V2IK._sentence(c || {}) : ''; };
  var loc = function (l) { l = l || {}; return (l.pageStart ? (l.pageEnd && l.pageEnd !== l.pageStart ? l.pageStart + '~' + l.pageEnd + '쪽' : l.pageStart + '쪽') : (l.lineStart ? l.lineStart + '~' + l.lineEnd + '줄' : '')) + (l.heading ? ((l.pageStart || l.lineStart) ? ' · ' : '') + l.heading : ''); };

  function open(tab, pw) { PW = pw; C.setPw(pw); PANE = document.getElementById('t-ikdoc'); G.view = G.view === 'doc' && !G.doc ? 'docs' : G.view; refresh().then(draw); }
  function refresh() { return must('list').then(function (d) { G.docs = d.docs; G.stats = d.stats; }).catch(function (e) { PANE.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; throw e; }); }
  function nav() {
    var q = G.stats.queue;
    return '<div class="sr-bar"><button class="sr-chip' + (G.view === 'docs' || G.view === 'doc' ? ' on' : '') + '" data-v="docs">자료</button><button class="sr-chip' + (G.view === 'inbox' ? ' on' : '') + '" data-v="inbox">검수함' + (q ? ' ' + q : '') + '</button><button class="sr-chip' + (G.view === 'gaps' ? ' on' : '') + '" data-v="gaps">부족한 지식</button></div>';
  }
  function draw() { PANE = document.getElementById('t-ikdoc'); if (G.view === 'doc' && G.doc) return docView(); if (G.view === 'inbox') return inbox(); if (G.view === 'gaps') return gaps(); docs(); }
  function bindNav() { $$('[data-v]').forEach(function (b) { b.onclick = function () { G.view = b.dataset.v; G.doc = null; refresh().then(draw); }; }); }

  /* ═════ 자료 목록 ═════ */
  function docs() {
    var st = G.stats, by = st.by, list = G.docs.filter(function (d) { return (G.filter === 'all' || d.status === G.filter) && (!G.q || (d.title + ' ' + (d.author || '')).toLowerCase().indexOf(G.q.toLowerCase()) >= 0); });
    PANE.innerHTML = nav() + '<div class="card"><h3 style="margin:0 0 4px;font-size:1.05rem;color:var(--gold)">풀이 자료</h3><p class="muted" style="margin:0 0 6px">명리학 자료를 추가하면 AI가 풀이 지식 후보로 정리합니다. 후보는 검수함에서 승인한 것만 풀이 지식이 됩니다.</p><div class="sr-bar"><button class="pri" id="srAdd">+ 자료 추가</button><input type="text" class="q" id="srQ" placeholder="자료·원문 검색 — 예: 경금 관성 · 재물 비겁 · 조후 여름생" value="' + esc(G.q) + '"></div>' +
      '<div class="sr-dash"><div class="n"><b>' + st.docs + '</b><span>전체 자료</span></div><div class="n"><b>' + (by.analyzed + by.done) + '</b><span>분석 완료</span></div><div class="n"><b>' + by.review + '</b><span>검수 중</span></div><div class="n"><b>' + by.need + '</b><span>분석 필요</span></div><div class="n"><b>' + st.queue + '</b><span>검수 대기 후보</span></div><div class="n"><b>' + st.conflict + '</b><span>충돌 확인</span></div><div class="n"><b>' + st.unsure + '</b><span>추출 불확실</span></div><div class="n"><b>' + st.knowledge + '</b><span>승인된 풀이 지식</span></div><div class="n"><b>' + st.twoEvidence + '</b><span>근거 2개 이상</span></div><div class="n"><b>' + st.noEvidence + '</b><span>근거 자료 없음</span></div></div>' +
      '<div class="sr-bar">' + [['all', '전체'], ['need', '분석 필요'], ['analyzed', '분석 완료'], ['review', '검수 중'], ['done', '완료']].map(function (f) { return '<button class="sr-chip' + (G.filter === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div><div id="srFind"></div>' +
      '<div class="sr-row h"><span>자료명</span><span>형식</span><span>분량</span><span>추출된 풀이</span><span>검수 상태</span><span>등록일</span></div>' + (list.length ? list.map(function (d) { var n = d.counts ? Object.keys(d.counts.cands).reduce(function (a, k) { return a + d.counts.cands[k]; }, 0) : 0; return '<div class="sr-row" data-id="' + d.id + '"><span><b>' + esc(d.title) + '</b>' + (d.active === false ? ' ' + chip('warn', '비활성') : '') + '<small>' + esc([d.author, d.grade !== '미평가' ? '출처 등급 ' + d.grade : ''].filter(Boolean).join(' · ')) + '</small></span><span>' + ({ pdf: 'PDF', md: 'MD', txt: 'TXT', text: '직접 입력' })[d.fileType] + '</span><span>' + (d.pageCount ? d.pageCount + '쪽' : d.counts.chunks + '구간') + '</span><span>' + n + '개</span><span>' + chip(d.status === 'done' ? 'good' : d.status === 'need' ? 'warn' : '', STATUS[d.status]) + '</span><span class="muted">' + date(d.createdAt) + '</span></div>'; }).join('') : '<p class="muted" style="padding:18px">등록된 자료가 없습니다. “+ 자료 추가”로 시작하세요.</p>') + '</div>';
    bindNav(); $('#srAdd').onclick = addDialog;
    $$('[data-f]').forEach(function (b) { b.onclick = function () { G.filter = b.dataset.f; docs(); }; });
    $$('.sr-row[data-id]').forEach(function (r) { r.onclick = function () { openDoc(r.dataset.id); }; });
    var qi = $('#srQ'), tm; qi.oninput = function () { G.q = qi.value; clearTimeout(tm); tm = setTimeout(function () { if (G.q.trim().length >= 2) find(); else { $('#srFind').innerHTML = ''; } }, 350); }; if (G.q.trim().length >= 2) find();
  }
  function find() {
    must('search', { q: 'q=' + encodeURIComponent(G.q) }).then(function (d) {
      var box = $('#srFind'); if (!box) return;
      box.innerHTML = '<div class="sr-k"><b>검색 결과</b> <span class="muted">원문 ' + d.hits.length + ' · 후보 ' + d.cands.length + ' · 승인된 풀이 지식 ' + d.knowledge.length + '</span>' + d.hits.slice(0, 6).map(function (h) { return '<div class="why"><a href="#" data-ch="' + h.docId + '|' + h.chunkId + '">' + esc(h.docTitle) + ' ' + esc(h.label) + '</a> — ' + esc(h.snippet) + '</div>'; }).join('') + d.cands.slice(0, 5).map(function (c) { return '<div class="why">후보 · ' + esc(c.title) + ' <span class="muted">(' + esc(c.docTitle) + ', ' + c.status + ')</span></div>'; }).join('') + d.knowledge.slice(0, 5).map(function (k) { return '<div class="why">풀이 지식 · <a href="#" data-kn="' + k.id + '">' + esc(k.title) + '</a> <span class="muted">(' + esc(DOMAIN[k.domain]) + ', 근거 자료 ' + k.evidence + '개)</span></div>'; }).join('') + '</div>';
      $$('[data-ch]', box).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var p = a.dataset.ch.split('|'); viewChunk(p[0], p[1], G.q.split(/\s+/)[0]); }; });
      $$('[data-kn]', box).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); window.V2IK.openDetail(a.dataset.kn); }; });
    }).catch(function (e) { toast(e.message, true); });
  }

  /* ═════ 자료 추가 ═════ */
  function addDialog() {
    var dlg = document.createElement('dialog'), file = null; dlg.className = 'sr-dlg';
    dlg.innerHTML = '<h3>자료 추가</h3><div class="sr-drop" id="srDrop"><b>PDF / MD / TXT</b>파일을 여기에 놓으세요 (또는 눌러서 선택)<div id="srFile" class="muted" style="margin-top:6px"></div><input type="file" id="srFi" accept=".pdf,.md,.markdown,.txt,text/plain,application/pdf" hidden></div><p class="muted" style="text-align:center;margin:8px 0">또는</p><label class="sr-f">직접 텍스트 붙여넣기<textarea id="srTxt" rows="5" placeholder="자료 내용을 붙여 넣으세요"></textarea></label>' +
      '<div class="sr-g2"><label class="sr-f">자료명 <small class="muted">(비우면 파일 이름)</small><input type="text" id="srTitle"></label><label class="sr-f">저자<input type="text" id="srAuthor"></label><label class="sr-f">출처<input type="text" id="srMemo" placeholder="어디서 구한 자료인지"></label><label class="sr-f">출판사 · 출판연도<span style="display:flex;gap:6px"><input type="text" id="srPub" placeholder="출판사"><input type="number" id="srYear" placeholder="연도" style="max-width:100px"></span></label>' +
      '<label class="sr-f">자료 종류<select id="srKind">' + Object.keys(KIND).map(function (k) { return '<option value="' + k + '">' + KIND[k] + '</option>'; }).join('') + '</select></label><label class="sr-f">출처 등급 <small class="muted">(관리자가 정합니다 · AI 가 정하지 않음)</small><select id="srGrade"><option>미평가</option><option>A</option><option>B</option><option>C</option></select></label></div>' +
      '<div class="sr-f">해석 체계 <small class="muted">(모르면 비워 두세요 — 분류하지 않음)</small><div class="sr-opts">' + THEORY.map(function (t) { return '<label><input type="checkbox" value="' + t + '">' + t + '</label>'; }).join('') + '</div></div>' +
      '<div class="sr-opts" style="margin:6px 0"><label><input type="checkbox" id="srP1" checked>Production 풀이에 사용</label><label><input type="checkbox" id="srP2" checked>AI 후보 추출 허용</label></div>' +
      '<div class="sr-bar"><button class="pri" id="srGo">자료 등록</button><button id="srX">닫기</button><span class="muted" id="srMsg"></span></div>';
    document.body.appendChild(dlg); dlg.showModal(); dlg.onclose = function () { dlg.remove(); }; var $d = function (s) { return dlg.querySelector(s); };
    $d('#srX').onclick = function () { shut(dlg); };
    var drop = $d('#srDrop'), fi = $d('#srFi'), setFile = function (f) { file = f; $d('#srFile').textContent = f ? f.name + ' (' + Math.round(f.size / 1024) + 'KB)' : ''; if (f && !$d('#srTitle').value) $d('#srTitle').value = f.name.replace(/\.[^.]+$/, ''); };
    drop.onclick = function () { fi.click(); }; fi.onchange = function () { setFile(fi.files[0]); };
    ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); }); ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });
    $d('#srGo').onclick = function () {
      var txt = $d('#srTxt').value, msg = $d('#srMsg'); if (!file && txt.trim().length < 20) return toast('파일을 올리거나 텍스트를 붙여 넣어 주세요', true);
      var meta = { title: $d('#srTitle').value.trim() || (file ? file.name.replace(/\.[^.]+$/, '') : '직접 입력 자료 ' + new Date().toISOString().slice(0, 10)), author: $d('#srAuthor').value, sourceMemo: $d('#srMemo').value, publisher: $d('#srPub').value, publishedYear: $d('#srYear').value, sourceKind: $d('#srKind').value, grade: $d('#srGrade').value, theoryTags: $$('.sr-opts input[value]', dlg).filter(function (c) { return c.checked && THEORY.indexOf(c.value) >= 0; }).map(function (c) { return c.value; }), policy: { production: $d('#srP1').checked, extract: $d('#srP2').checked } };
      $d('#srGo').disabled = true; msg.textContent = '텍스트를 추출하는 중…';
      extract(file, txt, function (t) { msg.textContent = t; }).then(function (x) {
        meta.fileName = file ? file.name : ''; meta.fileType = x.fileType; if (x.pages) meta.pages = x.pages; else meta.text = x.text; msg.textContent = '등록하는 중…';
        return req('add', { body: meta }).then(function (r) {
          if (r.s === 409) { shut(dlg); toast('이미 등록된 자료입니다 — 기존 자료를 엽니다'); return refresh().then(function () { openDoc(r.d.duplicate); }); }
          if (!r.ok) throw new Error(r.d.error || '등록 실패');
          var id = r.d.doc.id, up = file && x.fileType !== 'text' ? fetch('/api/src?a=file&id=' + id, { method: 'POST', headers: { authorization: 'Bearer ' + PW }, body: file }).then(function (u) { return u.ok ? null : u.json().then(function (j) { toast('원본 파일은 보관하지 못했습니다: ' + (j.error || u.status), true); }); }).catch(function () { }) : Promise.resolve();
          return up.then(function () { shut(dlg); toast('자료를 등록했습니다 — “AI 분석 시작”을 눌러 후보를 뽑으세요'); return refresh().then(function () { openDoc(id); }); });
        });
      }).catch(function (e) { $d('#srGo').disabled = false; msg.textContent = ''; toast(e.message, true); });
    };
  }
  // 글자 추출: PDF 는 pdf.js 로 쪽 단위, MD/TXT 는 그대로(제목·줄 번호는 서버가 보존)
  function extract(file, pasted, say) {
    if (!file) return Promise.resolve({ fileType: 'text', text: pasted });
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf' || file.type === 'application/pdf') return pdfPages(file, say).then(function (pages) { return { fileType: 'pdf', pages: pages }; });
    return file.arrayBuffer().then(function (b) { return { fileType: /^(md|markdown)$/.test(ext) ? 'md' : 'txt', text: new TextDecoder('utf-8').decode(b) }; });
  }
  var pdfLoad = null;
  function pdfLib() { // 브라우저에서만 쓰는 PDF 글자 추출기(cdnjs). 서버에는 PDF 해석기가 없다.
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return pdfLoad || (pdfLoad = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; ok(window.pdfjsLib); }; s.onerror = function () { pdfLoad = null; no(new Error('PDF 읽기 도구를 불러오지 못했습니다(인터넷 연결 확인). MD/TXT 로 바꿔 올리거나 텍스트를 붙여 넣을 수도 있습니다')); }; document.head.appendChild(s); }));
  }
  function pdfPages(file, say) {
    return Promise.all([pdfLib(), file.arrayBuffer()]).then(function (a) {
      return a[0].getDocument({ data: new Uint8Array(a[1]) }).promise.then(function (pdf) {
        var out = [], n = pdf.numPages, chain = Promise.resolve();
        for (var p = 1; p <= n; p++) (function (p) { chain = chain.then(function () { say('쪽 추출 ' + p + ' / ' + n); return pdf.getPage(p).then(function (pg) { return pg.getTextContent(); }).then(function (tc) { var line = '', lastY = null, lines = []; tc.items.forEach(function (it) { var y = it.transform ? Math.round(it.transform[5]) : 0; if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line); line = ''; } line += it.str + (it.hasEOL ? '\n' : ''); lastY = y; }); lines.push(line); out.push({ page: p, text: lines.join('\n') }); }); }); })(p);
        return chain.then(function () { if (!out.some(function (x) { return x.text.trim().length > 20; })) throw new Error('이 PDF 에서 글자를 뽑지 못했습니다(스캔 이미지 PDF 는 지원하지 않습니다). 글자가 들어 있는 PDF 나 MD/TXT 를 올려 주세요'); return out; });
      });
    });
  }

  /* ═════ 자료 상세 · AI 분석 ═════ */
  function openDoc(id) { must('doc', { q: 'id=' + id }).then(function (d) { G.doc = d; G.view = 'doc'; PANE = document.getElementById('t-ikdoc'); draw(); }).catch(function (e) { toast(e.message, true); }); }
  function docView() {
    var d = G.doc.doc, ch = G.doc.chunks, c = d.counts, im = G.doc.impact, pct = c.chunks ? Math.round(c.done / c.chunks * 100) : 0, total = Object.keys(c.cands).reduce(function (a, k) { return a + c.cands[k]; }, 0);
    PANE.innerHTML = nav() + '<div class="sr-bar"><button id="dBack">← 자료 목록</button><span style="flex:1"></span>' + chip(d.status === 'done' ? 'good' : d.status === 'need' ? 'warn' : '', STATUS[d.status]) + (d.active === false ? chip('warn', '비활성') : '') + '</div>' +
      '<div class="card"><h3 style="margin:0;font-size:1.1rem">' + esc(d.title) + '</h3><p class="muted" style="margin:2px 0 8px">' + esc([({ pdf: 'PDF', md: 'MD', txt: 'TXT', text: '직접 입력' })[d.fileType], d.pageCount ? d.pageCount + '쪽' : '', d.author, d.publisher, d.publishedYear, KIND[d.sourceKind], d.hasFile ? '원본 보관됨' : '원본 파일 없음(텍스트만 보존)'].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="sr-label">진행 상태</div><div class="sr-k"><div>텍스트 추출 <b style="color:#7FE0BC">완료</b> · ' + c.chunks + '개 구간</div><div>AI 분석 <b>' + c.done + ' / ' + c.chunks + '</b> 구간' + (c.failed ? ' · <span style="color:#FF9C8C">실패 ' + c.failed + '</span>' : '') + '</div><div class="sr-prog"><i style="width:' + pct + '%" id="srBar"></i></div><div>풀이 후보 <b>' + total + '</b>개 · 검수 대기 ' + (c.cands.new + c.cands.held) + ' · 승인 ' + (c.cands.approved + c.cands.merged) + ' · 폐기 ' + c.cands.discarded + '</div><div class="muted" id="srRun"></div></div>' +
      '<div class="sr-bar"><button class="pri" id="srAnalyze"' + (c.done === c.chunks || d.policy.extract === false ? ' disabled' : '') + '>' + (c.done ? 'AI 분석 이어서' : 'AI 분석 시작') + '</button>' + (c.failed ? '<button id="srRetry">실패한 부분 다시 분석</button>' : '') + '<button id="srInbox">검수함 열기 (' + (c.cands.new + c.cands.held) + ')</button><button id="srDel" style="margin-left:auto">자료 삭제·비활성화</button></div>' + (d.policy.extract === false ? '<p class="muted">이 자료는 “AI 후보 추출 허용”이 꺼져 있습니다(아래 정책에서 켤 수 있습니다).</p>' : '') + '<div id="srImpact"></div>' +
      '<div class="sr-label">출처 정책 · 분류</div><div class="sr-g2"><label class="sr-f">출처 등급 <small class="muted">(관리자가 정합니다)</small><select id="srG">' + ['미평가', 'A', 'B', 'C'].map(function (g) { return '<option' + (d.grade === g ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></label><label class="sr-f">자료 종류<select id="srK">' + Object.keys(KIND).map(function (k) { return '<option value="' + k + '"' + (d.sourceKind === k ? ' selected' : '') + '>' + KIND[k] + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="sr-opts" style="margin:6px 0"><label><input type="checkbox" id="srP1"' + (d.policy.production ? ' checked' : '') + '>Production 풀이에 사용</label><label><input type="checkbox" id="srP2"' + (d.policy.extract ? ' checked' : '') + '>AI 후보 추출 허용</label><label><input type="checkbox" id="srP3"' + (d.policy.reference ? ' checked' : '') + '>참고용 검색에 사용</label></div>' +
      '<div class="sr-f">해석 체계<div class="sr-opts">' + THEORY.map(function (t) { return '<label><input type="checkbox" data-th value="' + t + '"' + ((d.theoryTags || []).indexOf(t) >= 0 ? ' checked' : '') + '>' + t + '</label>'; }).join('') + '</div></div><div class="sr-bar"><button id="srSave">정책·분류 저장</button></div>' +
      '<div class="sr-label">원문 구간 (' + ch.length + ')</div><div style="max-height:320px;overflow:auto">' + ch.map(function (x) { return '<div class="sr-k" style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span>' + x.idx + '. ' + esc(loc(x) || '구간 ' + x.idx) + ' <span class="muted">(' + x.len + '자)</span> ' + (x.status === 'done' ? chip('good', '분석됨 · 후보 ' + x.cands) : x.status === 'failed' ? chip('bad', '실패') : chip('', '대기')) + (x.error ? '<div class="why" style="color:#FF9C8C">' + esc(x.error) + '</div>' : '') + '</span><button type="button" data-ch="' + x.id + '">원문 보기</button></div>'; }).join('') + '</div></div>';
    bindNav(); $('#dBack').onclick = function () { G.view = 'docs'; G.doc = null; refresh().then(draw); }; $('#srInbox').onclick = function () { G.view = 'inbox'; G.docSel = d.id; G.cf = 'all'; G.open = null; refresh().then(draw); };
    $$('[data-ch]').forEach(function (b) { b.onclick = function () { viewChunk(d.id, b.dataset.ch, ''); }; });
    $('#srAnalyze').onclick = function () { analyze(false); }; var rt = $('#srRetry'); if (rt) rt.onclick = function () { analyze(true); };
    $('#srDel').onclick = function () { deleteDialog(d); };
    $('#srSave').onclick = function () { must('update', { q: 'id=' + d.id, body: { patch: { grade: $('#srG').value, sourceKind: $('#srK').value, policy: { production: $('#srP1').checked, extract: $('#srP2').checked, reference: $('#srP3').checked }, theoryTags: $$('[data-th]').filter(function (x) { return x.checked; }).map(function (x) { return x.value; }) } } }).then(function () { toast('저장했습니다'); openDoc(d.id); }).catch(function (e) { toast(e.message, true); }); };
    if (im && im.knowledge) $('#srImpact').innerHTML = '<div class="sr-k">이 자료를 근거로 쓰는 풀이 지식 <b>' + im.knowledge + '</b>개 (공개 ' + im.published + ')</div>';
  }
  function analyze(retry) {
    if (G.run) return; G.run = true; var d = G.doc.doc, btn = $('#srAnalyze'), say = function (t) { var e = $('#srRun'); if (e) e.textContent = t; }, added = 0, first = true; if (btn) btn.disabled = true;
    (function step() {
      say('AI가 원문을 읽는 중…');
      req('analyze', { q: 'id=' + d.id, body: { limit: 2, retryFailed: retry && first } }).then(function (r) {
        first = false;
        if (!r.ok) { G.run = false; toast(r.d.error || 'AI 분석 실패', true); return openDoc(d.id); }
        added += r.d.added; var c = r.d.counts, bar = $('#srBar'); if (bar) bar.style.width = Math.round(c.done / c.chunks * 100) + '%'; say('분석 ' + c.done + ' / ' + c.chunks + ' 구간 · 새 후보 ' + added + '개' + (c.failed ? ' · 실패 ' + c.failed : ''));
        if (r.d.finished || r.d.processed === 0) { G.run = false; toast(added + '개의 풀이 후보를 찾았습니다' + (c.failed ? ' (실패한 구간 ' + c.failed + '개는 “실패한 부분 다시 분석”으로 이어서)' : ''), c.failed > 0 && added === 0); return refresh().then(function () { openDoc(d.id); }); }
        setTimeout(step, 30);
      }).catch(function (e) { G.run = false; toast(e.message, true); });
    })();
  }
  function deleteDialog(d) {
    must('impact', { q: 'id=' + d.id }).then(function (im) {
      var dlg = document.createElement('dialog'); dlg.className = 'sr-dlg';
      dlg.innerHTML = '<h3>“' + esc(d.title) + '” 삭제·비활성화</h3>' + (im.knowledge ? '<div class="sr-k" style="border-color:#B8742A"><b>이 자료를 근거로 사용하는 풀이 지식이 ' + im.knowledge + '개 있습니다.</b> (공개 ' + im.published + '개)' + im.items.slice(0, 8).map(function (k) { return '<div class="why">' + esc(k.title) + (k.onlyThis ? ' — 근거가 이 자료뿐' : '') + '</div>'; }).join('') + '</div>' : '<p class="muted">연결된 풀이 지식이 없습니다.</p>') +
        '<div class="sr-k"><b>자료만 비활성화</b><div class="why">자료는 남기고, 이 자료만 근거로 쓰는 풀이는 서비스에서 제외합니다. 언제든 다시 켤 수 있습니다.</div><button data-m="deactivate">비활성화</button></div><div class="sr-k"><b>Production 근거에서 제외</b><div class="why">자료와 검색은 그대로 두고, 서비스 풀이의 근거로만 쓰지 않습니다.</div><button data-m="unlink">제외</button></div>' + (im.knowledge ? '<div class="sr-k"><b>연결된 풀이 지식 검토</b><div class="why">풀이 지식 화면에서 근거 자료를 확인하세요(삭제 전에 권장).</div><button data-m="review">목록 보기</button></div>' : '') +
        '<div class="sr-k"><b>완전 삭제</b><div class="why">원문·후보·원본 파일이 사라집니다. 연결된 풀이 지식은 삭제되지 않고 근거 기록만 남습니다. 확인을 위해 자료명을 입력하세요.</div><input type="text" id="srConf" placeholder="' + esc(d.title) + '"><button data-m="delete" style="margin-top:6px">완전 삭제</button></div><div class="sr-bar"><button data-m="x">닫기</button></div>';
      document.body.appendChild(dlg); dlg.showModal(); dlg.onclose = function () { dlg.remove(); };
      [].slice.call(dlg.querySelectorAll('[data-m]')).forEach(function (b) { b.onclick = function () {
        var m = b.dataset.m; if (m === 'x') return shut(dlg); if (m === 'review') { shut(dlg); toast('풀이 지식 화면에서 “근거 자료”를 확인하세요'); window.AdminShowTab('ikknow'); return; }
        must('delete', { q: 'id=' + d.id, body: { mode: m, confirm: (dlg.querySelector('#srConf') || {}).value } }).then(function (r) { shut(dlg); toast(r.deleted ? '삭제했습니다. ' + (r.note || '') : '처리했습니다'); G.doc = null; G.view = 'docs'; refresh().then(draw); }).catch(function (e) { toast(e.message, true); }); }; });
    }).catch(function (e) { toast(e.message, true); });
  }

  /* ═════ 검수함 ═════ */
  function loadCands() { return must('cands', { q: G.docSel ? 'id=' + G.docSel : '' }).then(function (d) { G.cands = d.cands; }); }
  function inbox() {
    loadCands().then(function () {
      var all = G.cands.filter(function (c) { return c.status === 'new' || c.status === 'held'; }), cnt = { all: all.length, new: all.filter(function (c) { return c.compare === 'new'; }).length, similar: all.filter(function (c) { return c.compare !== 'new'; }).length, conflict: all.filter(function (c) { return c.conflict; }).length, unsure: all.filter(function (c) { return c.unsure; }).length };
      var gf = G.gapFilter, list = all.filter(function (c) { if (gf && !(c.domains[0] === gf.domain && c.subDomain === gf.section)) return false; return G.cf === 'all' || (G.cf === 'new' && c.compare === 'new') || (G.cf === 'similar' && c.compare !== 'new') || (G.cf === 'conflict' && c.conflict) || (G.cf === 'unsure' && c.unsure) || (G.cf === 'held' && c.status === 'held'); });
      PANE.innerHTML = nav() + '<div class="sr-dash"><div class="n"><b>' + cnt.all + '</b><span>전체 후보</span></div><div class="n"><b>' + cnt.new + '</b><span>새로운 풀이</span></div><div class="n"><b>' + cnt.similar + '</b><span>유사</span></div><div class="n"><b>' + cnt.conflict + '</b><span>충돌</span></div><div class="n"><b>' + cnt.unsure + '</b><span>확인 필요</span></div></div>' +
        '<div class="card"><div class="sr-bar" style="margin-top:0"><select id="ibDoc"><option value="">모든 자료</option>' + G.docs.filter(function (d) { return d.counts && d.counts.cands.new + d.counts.cands.held > 0 || d.id === G.docSel; }).map(function (d) { return '<option value="' + d.id + '"' + (G.docSel === d.id ? ' selected' : '') + '>' + esc(d.title) + '</option>'; }).join('') + '</select>' + [['all', '전체'], ['new', '새로운 풀이'], ['similar', '유사'], ['conflict', '충돌'], ['unsure', '확인 필요'], ['held', '보류']].map(function (f) { return '<button class="sr-chip' + (G.cf === f[0] ? ' on' : '') + '" data-cf="' + f[0] + '">' + f[1] + '</button>'; }).join('') + (gf ? '<span class="sr-st ai">' + esc(DOMAIN[gf.domain]) + ' · ' + esc(gf.title) + ' <a href="#" id="ibClr">해제</a></span>' : '') + '</div>' +
        '<div class="sr-bar"><label style="font-size:.84rem"><input type="checkbox" id="ibAll" style="width:auto"> 전체 선택</label><button id="ibOk">일괄 승인</button><button id="ibHold">보류</button><button id="ibDis">폐기</button><span class="muted" style="font-size:.78rem">충돌·중복·추출 불확실·조건 누락 후보는 일괄 승인되지 않고 이유가 표시됩니다</span></div>' +
        '<div id="ibList">' + (list.length ? list.map(function (c) { var k = c.docId + '|' + c.id; return '<div class="sr-cand' + (G.open === k ? ' on' : '') + '" data-k="' + k + '"><input type="checkbox" data-s="' + k + '"' + (G.sel[k] ? ' checked' : '') + '><span><b>' + esc(c.title || '(제목 없음)') + '</b> ' + (c.status === 'held' ? chip('', '보류') : '') + '<small>' + esc(c.docTitle) + ' · ' + esc(loc(c.loc)) + '</small></span><span>' + c.domains.map(function (d) { return esc(DOMAIN[d]); }).join('·') + '</span><span class="muted">' + esc(sentence(c.conds).replace(/ 경우$/, '').slice(0, 40)) + '</span><span>' + chip(c.compare === 'new' ? 'good' : 'warn', CMP[c.compare]) + (c.conflict ? '<br>' + chip('bad', '충돌') : '') + '</span><span>' + (c.unsure ? chip('warn', '확인 필요') : chip('', '확실도 ' + CONF[c.confidence])) + '</span></div>'; }).join('') : '<p class="muted" style="padding:16px">검수할 후보가 없습니다. 자료에서 “AI 분석 시작”을 눌러 후보를 만드세요.</p>') + '</div></div><div id="ibRev"></div>';
      bindNav(); $('#ibDoc').onchange = function () { G.docSel = this.value; G.open = null; inbox(); }; $$('[data-cf]').forEach(function (b) { b.onclick = function () { G.cf = b.dataset.cf; inbox(); }; });
      var cl = $('#ibClr'); if (cl) cl.onclick = function (e) { e.preventDefault(); G.gapFilter = null; inbox(); };
      $$('[data-s]').forEach(function (cb) { cb.onclick = function (e) { e.stopPropagation(); G.sel[cb.dataset.s] = cb.checked; }; });
      $$('.sr-cand').forEach(function (r) { r.onclick = function () { review(r.dataset.k); }; }); $('#ibAll').onchange = function () { var v = this.checked; $$('[data-s]').forEach(function (cb) { cb.checked = v; G.sel[cb.dataset.s] = v; }); };
      var picked = function () { return Object.keys(G.sel).filter(function (k) { return G.sel[k]; }).map(function (k) { var p = k.split('|'); return { id: p[0], c: p[1] }; }); };
      var batch = function (act, publish) { var ids = picked(); if (!ids.length) return toast('후보를 선택하세요', true); must('batch', { body: { ids: ids, action: act, publish: publish } }).then(function (r) { G.sel = {}; toast(r.done + '개 처리' + (r.skipped.length ? ' · ' + r.skipped.length + '개는 건너뜀: ' + r.skipped.slice(0, 3).map(function (x) { return x.why; }).join(' / ') : ''), r.skipped.length > 0 && r.done === 0); refresh().then(function () { G.open = null; inbox(); }); }).catch(function (e) { toast(e.message, true); }); };
      $('#ibOk').onclick = function () { var pub = confirm('승인과 함께 서비스에 공개할까요?\n확인 = 승인하고 공개 · 취소 = 승인만(비공개로 등록)'); batch('approve', pub); }; $('#ibHold').onclick = function () { batch('hold'); }; $('#ibDis').onclick = function () { if (confirm('선택한 후보를 폐기할까요? (풀이 지식에는 영향 없음)')) batch('discard'); };
      if (G.open && list.some(function (c) { return c.docId + '|' + c.id === G.open; })) review(G.open, true);
    }).catch(function (e) { PANE.innerHTML = nav() + '<p class="err">' + esc(e.message) + '</p>'; bindNav(); });
  }
  function review(key, keep) {
    var p = key.split('|'), box = $('#ibRev'); G.open = key; $$('.sr-cand').forEach(function (r) { r.classList.toggle('on', r.dataset.k === key); });
    must('cand', { q: 'id=' + p[0] + '&c=' + p[1] }).then(function (d) {
      var c = d.cand, s = c.suggested, v = c.validation || { status: 'PASS', checks: [] }, cm = c.compare || { status: 'new', matches: [], conflicts: [] }, ch = d.chunk, held = c.status === 'held';
      var src = ch ? markQuote(ch.text, c.sourceClaim) : '<span class="muted">원문을 찾을 수 없습니다</span>';
      box.innerHTML = '<div class="sr-rev" style="margin-top:12px"><div class="card"><div class="sr-label" style="margin-top:0">원문 <span class="muted" style="letter-spacing:0">— ' + esc(d.doc.title) + ' ' + esc(ch ? ch.label : '') + '</span></div><div class="sr-src">' + src + '</div><div class="sr-bar"><button id="rvChunk">원문 전체 보기</button>' + (d.doc.hasFile && d.doc.fileType === 'pdf' ? '<button id="rvPdf">원본 PDF ' + (ch && ch.pageStart ? ch.pageStart + '쪽' : '') + ' 열기</button>' : '') + '</div></div>' +
        '<div class="card"><div class="sr-label" style="margin-top:0">AI 정리 <span class="muted" style="letter-spacing:0">— 원문을 구조화한 것이며 이론의 진위를 판정한 것이 아닙니다</span></div><h3 style="margin:2px 0;font-size:1.05rem">' + esc(s.title || '(제목 없음)') + '</h3><div>' + s.domains.map(function (x) { return chip('', DOMAIN[x]); }).join(' ') + ' ' + (s.theoryTags || []).map(function (x) { return chip('ai', x); }).join(' ') + ' ' + chip(c.extractionConfidence === 'low' ? 'warn' : 'good', '추출 확실도 ' + CONF[c.extractionConfidence]) + '</div>' +
        '<div class="sr-label">적용 조건</div><div>' + esc(sentence(s.conditions)) + (c.unclearConditions ? ' <span class="sr-st warn">조건 불명확</span>' : '') + '</div>' + (s.principle ? '<div class="sr-label">핵심 원리</div><div>' + esc(s.principle) + '</div>' : '') + '<div class="sr-label">현실적 해석 (AI 설명)</div><div>' + esc(s.interpretation) + '</div>' +
        (s.behaviorPatterns.length ? '<div class="sr-label">현실에서는</div><ul style="margin:0 0 0 18px;padding:0">' + s.behaviorPatterns.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + (s.strengths.length || s.risks.length ? '<div class="sr-g2"><div><div class="sr-label">장점</div>' + s.strengths.map(function (x) { return '<div>• ' + esc(x) + '</div>'; }).join('') + '</div><div><div class="sr-label">주의점</div>' + s.risks.map(function (x) { return '<div>• ' + esc(x) + '</div>'; }).join('') + '</div></div>' : '') +
        (s.modifiers.length ? '<div class="sr-label">해석이 달라지는 조건</div>' + s.modifiers.map(function (m) { return '<div>• <b>' + esc(sentence(m.when)) + '</b> → ' + EFFECT[m.effect] + (m.text ? ': ' + esc(m.text) : '') + '</div>'; }).join('') : '') + (Object.keys(s.exclusions).length ? '<div class="sr-label">적용하지 않는 경우</div><div>' + esc(sentence(s.exclusions)) + '</div>' : '') + (c.ambiguity.length ? '<div class="sr-label">확인이 필요한 점</div>' + c.ambiguity.map(function (x) { return '<div>⚠ ' + esc(x) + '</div>'; }).join('') : '') +
        '<div class="sr-label">승인 전 검사 — ' + ({ PASS: '통과', WARNING: '확인 필요', FAIL: '승인 불가' })[v.status] + '</div>' + v.checks.map(function (x) { return '<div class="sr-ck"><i class="' + x.level + '">' + ({ PASS: '✓ 통과', WARNING: '⚠ 확인', FAIL: '✗ 실패' })[x.level] + '</i><span><b>' + esc(x.label) + '</b> ' + esc(x.msg) + '</span></div>'; }).join('') +
        '<div class="sr-label">기존 풀이 지식과 비교 — ' + CMP[cm.status] + (cm.conflict ? ' · 해석 차이 ' + cm.conflicts.length + '건' : '') + '</div>' + (cm.matches.length ? cm.matches.map(function (m) { return '<div class="sr-k"><b>' + esc(m.title) + '</b> ' + (m.conflict ? chip('bad', '반대 해석') : chip('warn', CMP[m.kind] || '')) + ' <span class="muted">유사도 ' + Math.round(m.score * 100) + '%</span><div class="why">' + (m.published ? '공개 중' : '비공개') + ' · 조건 일치 ' + Math.round(m.jac * 100) + '% · 문장 유사 ' + Math.round(m.dice * 100) + '%</div><div class="sr-bar" style="margin:4px 0 0"><button type="button" data-kn="' + m.id + '">기존 풀이 보기</button>' + (m.kind ? '<button type="button" data-ev="' + m.id + '">이 풀이에 근거 추가</button><button type="button" data-mg="' + m.id + '">병합(빈 칸만 채움)</button>' : '') + '</div></div>'; }).join('') : '<div class="muted">비슷한 기존 풀이가 없습니다.</div>') + '</div></div>' +
        '<div class="sr-foot"><button class="pri" id="rvOk" ' + (v.status === 'FAIL' ? 'disabled' : '') + '>승인(비공개 등록)</button><button id="rvPub" ' + (v.status === 'FAIL' ? 'disabled' : '') + '>승인하고 공개</button><button id="rvEdit">수정 후 승인</button><button id="rvHold">' + (held ? '보류 중' : '보류') + '</button><button id="rvDis">폐기</button><span class="muted" style="font-size:.76rem">단축키: A 승인 · E 수정 · H 보류 · D 폐기 · J/K 다음/이전</span></div>';
      if (!keep) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var done = function (msg) { toast(msg); G.sel = {}; refresh().then(function () { G.open = null; inbox(); }); };
      var decide = function (body, okMsg) { body.c = p[1]; return req('decide', { q: 'id=' + p[0], body: body }).then(function (r) {
        if (r.ok) return done(okMsg + (r.d.note ? ' — ' + r.d.note : '')); var e = r.d;
        if (r.s === 409 && (e.duplicate || e.conflict)) { if (confirm(e.error + '\n\n그래도 새 풀이로 등록할까요? (기존 풀이는 바뀌지 않습니다)')) return decide(Object.assign({ force: true }, body), okMsg); return; } toast(e.error || '실패', true); }); };
      $('#rvOk').onclick = function () { decide({ action: 'approve' }, '승인했습니다(비공개) — 풀이 지식에서 확인 후 공개하세요'); }; $('#rvPub').onclick = function () { decide({ action: 'approve', publish: true }, '승인하고 공개했습니다'); };
      $('#rvHold').onclick = function () { decide({ action: 'hold' }, '보류했습니다'); }; $('#rvDis').onclick = function () { if (confirm('이 후보를 폐기할까요?')) decide({ action: 'discard' }, '폐기했습니다'); };
      $('#rvEdit').onclick = function () { must('itemdraft', { q: 'id=' + p[0] + '&c=' + p[1] }).then(function (x) { window.V2IK.wizardModal(x.item, true, function (saved) { req('decide', { q: 'id=' + p[0], body: { c: p[1], action: 'approveEdited', knowledgeId: saved.id } }).then(function (r) { if (r.ok) { toast('수정한 내용으로 승인했습니다'); done('수정한 내용으로 승인했습니다 · 풀이 테스트에서 확인하세요'); } else toast(r.d.error || '실패', true); }); }); }).catch(function (e) { toast(e.message, true); }); };
      $$('[data-kn]', box).forEach(function (b) { b.onclick = function () { window.V2IK.openDetail(b.dataset.kn); }; });
      $$('[data-ev]', box).forEach(function (b) { b.onclick = function () { if (confirm('이 후보를 새 풀이로 만들지 않고, 기존 풀이에 “근거 자료”로만 추가할까요?')) decide({ action: 'addEvidence', knowledgeId: b.dataset.ev }, '근거 자료를 추가했습니다'); }; });
      $$('[data-mg]', box).forEach(function (b) { b.onclick = function () { if (confirm('기존 풀이의 비어 있는 칸만 이 후보로 채우고 근거를 추가합니다. 기존 문장은 바뀌지 않습니다. 진행할까요?')) decide({ action: 'merge', knowledgeId: b.dataset.mg }, '병합했습니다'); }; });
      $('#rvChunk').onclick = function () { viewChunk(p[0], c.chunkId, c.sourceClaim.slice(0, 60), c); }; var pb = $('#rvPdf'); if (pb) pb.onclick = function () { openPdf(p[0], ch.pageStart); };
      PANE.onkeydown = function (e) { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey) return; var k = e.key.toLowerCase(); if (k === 'a') $('#rvOk').click(); else if (k === 'e') $('#rvEdit').click(); else if (k === 'h') $('#rvHold').click(); else if (k === 'd') $('#rvDis').click(); else if (k === 'j' || k === 'k') { var rows = $$('.sr-cand'), i = rows.findIndex(function (r) { return r.dataset.k === key; }), n = rows[i + (k === 'j' ? 1 : -1)]; if (n) review(n.dataset.k); } };
    }).catch(function (e) { toast(e.message, true); });
  }
  function markQuote(text, quote) { // 원문에서 인용 부분을 강조(글자가 조금 달라도 앞부분으로 찾는다)
    var t = text, i = t.indexOf(quote), len = quote.length; if (i < 0) { var head = quote.slice(0, 24); i = t.indexOf(head); len = i < 0 ? 0 : Math.min(quote.length, t.length - i); }
    return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + len)) + '</mark>' + esc(t.slice(i + len));
  }
  function openPdf(docId, page) { fetch('/api/src?a=file&id=' + docId, { headers: { authorization: 'Bearer ' + PW } }).then(function (r) { if (!r.ok) throw new Error('원본 파일을 열 수 없습니다'); return r.blob(); }).then(function (b) { window.open(URL.createObjectURL(b) + (page ? '#page=' + page : ''), '_blank'); }).catch(function (e) { toast(e.message, true); }); }

  /* ═════ 원문 보기(풀이 지식·후보 어디서든) ═════ */
  function viewChunk(docId, chunkId, quote, cand) {
    must('chunk', { q: 'id=' + docId + '&c=' + chunkId }).then(function (d) {
      var dlg = document.createElement('dialog'), ch = d.chunk; dlg.className = 'sr-dlg';
      dlg.innerHTML = '<div class="sr-bar" style="margin-top:0"><b style="color:var(--gold)">원문 보기</b> <span class="muted">' + esc(d.doc.title) + ' · ' + esc(ch.label) + (d.doc.active === false ? ' · 비활성 자료' : '') + '</span><span style="flex:1"></span>' + (d.doc.hasFile && d.doc.fileType === 'pdf' ? '<button id="vPdf">원본 PDF ' + (ch.pageStart ? ch.pageStart + '쪽 ' : '') + '열기</button>' : '') + '<button id="vX">닫기</button></div><div class="' + (cand ? 'sr-rev' : '') + '"><div class="card"><div class="sr-src">' + markQuote(ch.text, quote || '') + '</div></div>' + (cand ? '<div class="card"><div class="sr-label" style="margin-top:0">AI 정리</div><b>' + esc(cand.suggested.title) + '</b><p>' + esc(sentence(cand.suggested.conditions)) + '</p><p>' + esc(cand.suggested.interpretation) + '</p></div>' : '') + '</div>';
      document.body.appendChild(dlg); dlg.showModal(); dlg.onclose = function () { dlg.remove(); }; dlg.querySelector('#vX').onclick = function () { shut(dlg); }; var pb = dlg.querySelector('#vPdf'); if (pb) pb.onclick = function () { openPdf(docId, ch.pageStart); };
      var mk = dlg.querySelector('mark'); if (mk) mk.scrollIntoView({ block: 'center' });
    }).catch(function (e) { toast(e.message.indexOf('없는') >= 0 ? '원본 구간이 삭제되었거나 찾을 수 없습니다' : e.message, true); });
  }

  /* ═════ 부족한 지식 ═════ */
  function gaps() {
    must('gaps').then(function (d) {
      var rows = d.gaps.sort(function (a, b) { return (b.required - a.required) || (b.candidates - a.candidates); });
      PANE.innerHTML = nav() + '<div class="card"><h3 style="margin:0 0 4px;font-size:1.05rem;color:var(--gold)">부족한 지식</h3><p class="muted" style="margin:0 0 8px">풀이 구성에서 켜 둔 항목 중 “공개 + 검수 완료”된 풀이 지식이 없는 항목입니다. 관련 후보가 이미 자료에서 나와 있으면 바로 검수하세요(실제 데이터 기준).</p>' +
        '<div class="sr-bar">' + Object.keys(d.coverage).map(function (k) { return chip(d.coverage[k].pct >= 80 ? 'good' : d.coverage[k].pct >= 50 ? 'warn' : 'bad', d.coverage[k].name + ' ' + d.coverage[k].pct + '% ' + d.coverage[k].label); }).join(' ') + '</div>' +
        bannerHtml() +
        (rows.length ? '<table><thead><tr><th>분야</th><th>항목</th><th>관련 후보</th><th></th></tr></thead><tbody>' + rows.slice(0, 120).map(function (g, i) { return '<tr><td>' + esc(g.name) + '</td><td>' + esc(g.title) + (g.required ? '' : ' <span class="muted">(선택)</span>') + '</td><td>' + (g.candidates ? '<b style="color:var(--gold)">' + g.candidates + '개</b> <span class="muted">(자료 ' + g.docs + '건)</span>' : '<span class="muted">없음 — 새 자료가 필요합니다</span>') + '</td><td>' + (g.candidates ? '<button data-c="' + i + '">후보에서 검수</button> ' : '') + '<button data-n="' + i + '">직접 작성</button></td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">모든 항목에 풀이 지식이 있습니다.</p>') + '</div>';
      bindBanner(function () { return refresh().then(draw); });
      bindNav(); $$('[data-c]').forEach(function (b) { b.onclick = function () { var g = rows[+b.dataset.c]; G.gapFilter = g; G.view = 'inbox'; G.cf = 'all'; G.docSel = ''; refresh().then(draw); }; });
      $$('[data-n]').forEach(function (b) { b.onclick = function () { var g = rows[+b.dataset.n]; window.V2IK.newFor(g.domain, g.section); }; });
    }).catch(function (e) { PANE.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  // ───── 풀이 지식 → 구성 항목(subDomain) 자동 배정 배너 (부족한 지식 · 풀이 구성 · 풀이 지식 탭 공용) ─────
  // 커버리지는 풀이 지식의 subDomain 이 구성 항목 id 와 같을 때만 센다. 비었거나 맞지 않는 것을 AI 가 40개씩 배정한다.
  var BANNER_CSS = false;
  function bannerHtml() {
    if (!BANNER_CSS) { BANNER_CSS = true; var st = document.createElement('style'); st.textContent = '.sr-assign{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin:14px 0;padding:16px 18px;border:1px solid var(--gold);border-radius:14px;background:linear-gradient(135deg,rgba(212,175,95,.16),rgba(212,175,95,.04))}.sr-assign .sr-go{flex:0 0 auto;padding:13px 22px;border:0;border-radius:11px;background:var(--gold);color:#1a1405;font-size:1.02rem;font-weight:800;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35)}.sr-assign .sr-go:hover{filter:brightness(1.08)}.sr-assign .sr-go:disabled{opacity:.55;cursor:wait}.sr-assign .sr-tx{flex:1 1 280px;min-width:0}.sr-assign .sr-tx b{display:block;margin-bottom:3px;font-size:.98rem}.sr-assign .sr-bar{height:6px;margin-top:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;display:none}.sr-assign .sr-bar i{display:block;height:100%;width:0;background:var(--gold);transition:width .3s}'; document.head.appendChild(st); }
    return '<div class="sr-assign" id="srAssign"><button type="button" class="sr-go" id="srClassify">✨ 풀이 지식 자동 배정 (AI)</button><div class="sr-tx"><b>커버리지가 0%로 나온다면 여기부터 누르세요</b><span id="srClsMsg" class="muted">승인된 풀이 지식을 AI가 구성 항목(성격·기질·대운 …)에 맞게 배정합니다. 이미 맞게 배정된 것은 그대로 두고, 중간에 멈춰도 다시 누르면 이어서 합니다.</span><div class="sr-bar" id="srClsBar"><i></i></div></div></div>';
  }
  function bindBanner(onDone) {
    var btn = document.getElementById('srClassify'); if (btn) btn.onclick = function () { classifyAll(btn, onDone); };
  }
  function mountBanner(box, tab) { // 풀이 지식·풀이 구성 탭의 맨 위에 붙인다(이미 있으면 다시 붙이지 않는다)
    if (!box || box.querySelector('#srAssign')) return; box.insertAdjacentHTML('afterbegin', bannerHtml());
    bindBanner(function () { return window.AdminShowTab ? window.AdminShowTab(tab) : null; });
  }
  function classifyAll(btn, onDone) {
    var DOMS = ['SELF', 'MONEY', 'CAREER', 'LOVE', 'MARRIAGE', 'RELATIONSHIP', 'TIMING', 'ACTION'], msg = document.getElementById('srClsMsg'), bar = document.getElementById('srClsBar'), fill = bar && bar.firstChild, total = 0, left = 0, i = 0;
    btn.disabled = true; if (bar) bar.style.display = 'block';
    function one(d, off) { return C.api('/api/ik?a=classify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domain: d, offset: off }) }); }
    function next(off) {
      if (i >= DOMS.length) { btn.disabled = false; if (fill) fill.style.width = '100%'; msg.textContent = '완료 — ' + total + '개를 구성 항목에 배정했습니다' + (left ? ' (AI가 맞는 항목을 못 정한 ' + left + '개는 비워 둠)' : '') + '.'; toast('자동 배정 완료: ' + total + '개'); return onDone && onDone(); }
      msg.textContent = '배정 중… ' + (i + 1) + '/' + DOMS.length + ' · ' + DOMS[i] + ' (지금까지 ' + total + '개)'; if (fill) fill.style.width = Math.round(i / DOMS.length * 100) + '%';
      return one(DOMS[i], off).then(function (j) { total += j.assigned || 0; if (j.remaining > 0) return next(off + (j.tried - j.assigned)); left += (j.tried - j.assigned) + off; i++; return next(0); });
    }
    next(0).catch(function (e) {
      btn.disabled = false; var m = String(e.message || e);
      msg.textContent = /limit exceeded|too many requests/i.test(m)
        ? '⏸ 오늘 Cloudflare KV 저장 한도를 다 써서 멈췄습니다(지금까지 ' + total + '개 배정). 한국 시간 오전 9시 이후에 다시 누르면 이어서 합니다. 유료(Workers Paid) 플랜이면 바로 가능합니다.'
        : '중단됨: ' + m + ' — 다시 누르면 이어서 진행합니다';
    });
  }

  window.V2Src = { open: open, viewChunk: viewChunk, mountBanner: mountBanner };
})();
