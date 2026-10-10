/* 관리자 셸 — 위쪽 5개 화면으로 단순화:
   ① 클립 라이브러리(장면 미디어 · 일주 캐릭터 영상 120 · 커버리지, AI가 고르는 모든 클립이 한 곳)
   ② 챕터 관리(챕터 설정 · 해석 모듈 · 개운법 · 미리보기를 한 화면에서)
   ③ 조합 테스트(테스트 사주로 프로젝트 전체를 돌려 보고, 문제 챕터로 바로 이동)
   ④ 프로젝트(종합·애정운·재물운·신년운세 … 챕터를 묶어 상품으로 만들기, 현황)
   ⑤ 설정(입장 인트로 · 온보딩 페이지 · 미디어 점수 · 기존 클립(구)).
   저장은 /api/report-content (챕터·모듈·개운법·프로젝트·점수), /api/media, /api/awakening(일주 캐릭터 120 · 일간 소개 20). */
(function () {
  'use strict';
  var R = window.ReportV2, C = window.V2Content, A = window.V2Admin, ST = C.ST, PW = '';
  var $ = function (s, e) { return (e || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || document).querySelectorAll(s)); };
  var esc = C.esc, clone = C.clone, toast = C.toast;
  var SEA = R.SajuData.SEASONS;
  var built = {}, W = { modules: null, remedies: null, chapters: null, ts: null }; // W = 저장 전 작업본(미리보기에 바로 반영)

  var css = document.createElement('style');
  css.textContent = '.sub2{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px;align-items:center}.sub2 button{border-radius:999px;padding:6px 14px;font-size:.84rem;color:var(--ink2)}.sub2 button.on{border-color:var(--gold);color:var(--gold);background:#1c1a12}' +
    '.cols{display:grid;grid-template-columns:minmax(250px,320px) minmax(0,1fr);gap:14px;align-items:start}@media(max-width:900px){.cols{grid-template-columns:1fr}}' +
    '.chl{display:grid;gap:4px;max-height:76vh;overflow:auto}.chi{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);cursor:pointer;font-size:.84rem}.chi.on{border-color:var(--gold)}.chi.off{opacity:.5}.chi small{color:var(--ink3);display:block}' +
    '.chi input{width:auto}.pill{font-size:.7rem;padding:0 7px;border-radius:999px;border:1px solid var(--line);color:var(--ink3);margin-left:3px;white-space:nowrap}.pill.w{border-color:#B8742A;color:#FFC080}' +
    '.pjc{border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--bg);cursor:pointer;margin-bottom:8px}.pjc.on{border-color:var(--gold)}.pjc.off{opacity:.55}.pjc b{font-family:"Noto Serif KR",serif}.pjc small{display:block;color:var(--ink3)}' +
    '.stat{display:flex;gap:14px;flex-wrap:wrap;font-size:.84rem;color:var(--ink2);margin:6px 0}.stat b{color:var(--gold)}.fld{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:8px 0}.g2c{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.pick{display:grid;grid-template-columns:24px 40px 1fr 70px 62px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line);font-size:.84rem}.pick input[type=checkbox]{width:auto}.pick select{padding:3px 6px}' +
    '.pvh{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:10px}.pvh label{display:grid;gap:3px;font-size:.78rem;color:var(--ink2)}.thm{width:38px;height:48px;border-radius:5px;background:#000 center/cover;border:1px solid var(--line);flex:none}';
  css.textContent += '.srow2{display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line);font-size:.82rem}.srow2 select{width:100%}.board{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:12px;margin-top:12px;align-items:start}@media(max-width:900px){.board{grid-template-columns:1fr}}.acts{display:grid;gap:10px}.actc{padding:10px 12px}.acth{display:flex;gap:8px;align-items:center;margin-bottom:6px}.acth b{color:var(--gold);white-space:nowrap}.acth input{flex:1}.brow{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);font-size:.86rem}.brow .bn{color:var(--ink3);min-width:22px}.brow .bt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.brow select{width:auto;padding:3px 6px}.brow button{padding:2px 8px;font-size:.78rem}.pool .brow{flex-wrap:wrap}.tbar select{width:auto;min-width:170px}.tbar{display:grid;gap:8px}.tsum{font-size:.95rem}.chk2{display:flex;gap:6px;align-items:center;font-size:.84rem;color:var(--ink2)}.tform{border-top:1px solid var(--line);padding-top:10px}' +
    '.t3{display:grid;grid-template-columns:230px minmax(0,1fr) 320px;gap:12px;margin-top:12px;align-items:start}@media(max-width:1200px){.t3{grid-template-columns:200px minmax(0,1fr)}.tinsp{grid-column:1/-1}}@media(max-width:760px){.t3{grid-template-columns:1fr}}' +
    '.trail{display:grid;gap:3px;max-height:78vh;overflow:auto}.ract{margin:8px 0 2px;font-size:.7rem;letter-spacing:.14em;color:var(--gold)}.ri{display:flex;align-items:center;gap:8px;text-align:left;width:100%;padding:7px 9px;border-radius:8px;font-size:.84rem}.ri.on{border-color:var(--gold);background:#1c1a12}.ri span{color:var(--ink3);min-width:20px}.ri b{font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ri i{font-style:normal}' +
    '.pvbar{display:flex;gap:6px;align-items:center;margin-bottom:8px}.pvbar button{padding:4px 12px;border-radius:999px;font-size:.8rem}.pvbar button.on{border-color:var(--gold);color:var(--gold)}.pvwrap{display:flex;justify-content:center;background:#05060b;border:1px solid var(--line);border-radius:12px;padding:12px;overflow:hidden}.pvbox{position:relative}.pvbox iframe{border:0;transform-origin:0 0;background:#070913;border-radius:18px;position:absolute;left:0;top:0}' +
    '.tinsp{max-height:80vh;overflow:auto;font-size:.86rem}.cap2{margin:12px 0 4px;font-size:.72rem;letter-spacing:.14em;color:var(--gold)}.mrow{display:flex;gap:8px;justify-content:space-between;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--line)}.mrow small{display:block;color:var(--ink3)}.mrow button{padding:2px 10px;font-size:.78rem;flex:none}' +
    '.why{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px;font-size:.72rem}.why span{padding:0 6px;border-radius:4px;background:#0c0f1a;border:1px solid var(--line)}.hit{color:#7FE0BC}.miss{color:#FF9C8C}.srow{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--line)}';
  document.head.appendChild(css);

  function subnav(el, items, active, cb) {
    el.innerHTML = items.map(function (i) { return '<button type="button" data-k="' + i[0] + '"' + (i[0] === active ? ' class="on"' : '') + '>' + i[1] + '</button>'; }).join('');
    el.onclick = function (e) { var b = e.target.closest('button[data-k]'); if (!b) return; $$('button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); cb(b.dataset.k); };
  }
  var gotoTab = function (t, also) { window.AdminShowTab(t, also); };

  /* ═════ 공용: 챕터·테스트 사주 상태 ═════ */
  var TS = (function () { var d = { date: '1990-05-15', time: '14:30', gender: 'M', now: new Date().toISOString().slice(0, 10), project: 'full', dbg: true }; try { Object.assign(d, JSON.parse(localStorage.getItem('mt_v2_ts') || '{}'), { now: new Date().toISOString().slice(0, 10) }); } catch (e) { } return d; })();
  var saveTS = function () { try { localStorage.setItem('mt_v2_ts', JSON.stringify(TS)); } catch (e) { } };
  function chaptersAll() { // 작업본(저장 전 포함) 챕터 라이브러리 — 소속 프로젝트·ACT·순서 포함(예전 저장본은 여기서 소유 구조로 이전)
    if (!W.chapters) W.chapters = R.Chapters.libraryOf(ST.saved);
    return W.chapters;
  }
  var chapterById = function (id) { return chaptersAll().filter(function (c) { return c.id === id; })[0]; };
  function content() { // 저장본 위에 작업본을 얹은 콘텐츠(미리보기·테스트용)
    var c = Object.assign({}, ST.saved); if (W.modules) c.modules = W.modules; if (W.remedies) c.remedies = W.remedies;
    c.chapters = { chapters: chaptersAll(), acts: [] };
    c.projects = (PJ.list || R.Chapters.projects(ST.saved)).map(function (p) { return Object.assign({}, p, { chapters: null }); }); // 챕터 소속은 chapters 쪽에 있으므로 예전 목록은 쓰지 않는다
    c.textStyles = tsWork(); return c;
  }

  var memo = {};
  function computeSd() {
    return C.engine().then(function (M) {
      var k = [TS.date, TS.time, TS.gender, TS.now].join('|'); if (memo.k === k) return memo.sd;
      var d = TS.date.split('-').map(Number), t = (TS.time || '12:00').split(':').map(Number), now = new Date(TS.now + 'T12:00:00+09:00').getTime();
      var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TS.gender, city: '서울' });
      memo = { k: k, sd: R.SajuData.build(ch, { now: now }) }; return memo.sd;
    });
  }
  // 현재(작업본 포함) 콘텐츠로 프로젝트 리포트 생성
  function report(projectId, forceChapter) {
    return Promise.all([C.load(), computeSd()]).then(function (a) {
      var sd = a[1], ct = content(), pack = R.Compose.fromSaved(ct, ST.media, projectId || 'full');
      if (forceChapter && !pack.cfg.chapters.some(function (c) { return c.id === forceChapter; })) { var c = chapterById(forceChapter); if (c) { var cc = clone(c); cc.no = pack.cfg.chapters.length + 1; pack.cfg.chapters.push(cc); } }
      return { sd: sd, rep: R.Compose.build(sd, pack.lib, pack.cfg), pack: pack };
    });
  }
  function thumb(m) { var u = m && (m.posterUrl || (/video|transition/i.test(m.type) ? '' : m.url)); return u ? '<span class="thm" style="background-image:url(\'' + esc(u) + '\')"></span>' : ''; }
  var coverageOf = function (c) { // 이 챕터를 채우는 "조건 있는" 모듈 수 (정적 점검)
    var mods = R.Compose.library({ modules: content().modules, remedies: content().remedies }).modules;
    return mods.filter(function (m) { return m.enabled !== false && (c.moduleCategories || []).indexOf(m.category) >= 0 && !/_fallback$/.test(m.id); }).length;
  };

  /* ═════ ① 클립 라이브러리 ═════ */
  function clipOpen() {
    var root = $('#t-v2clip');
    if (!built.clip) {
      built.clip = 1;
      root.innerHTML = '<div class="sub2" id="clNav"></div><div id="cl-media"></div><div id="cl-awk" class="hide"></div><div id="cl-cov" class="hide"></div>';
      var go = function (k) {
        ['media', 'awk', 'cov'].forEach(function (x) { $('#cl-' + x).classList.toggle('hide', x !== k); });
        if (k === 'media') A.open('media', PW, $('#cl-media')); else if (k === 'awk') V2Intro.mount($('#cl-awk'), PW, {}); else A.coverage($('#cl-cov'), PW);
      };
      subnav($('#clNav', root), [['media', '장면 미디어'], ['awk', '일간·일주 영상'], ['cov', '커버리지·선택 테스트']], 'media', go);
      var imp = document.createElement('button'); imp.type = 'button'; imp.textContent = '기존 클립 가져오기'; imp.title = '구버전 "클립 라이브러리"의 클립을 새 라이브러리로 복사합니다(원본은 그대로)'; imp.style.marginLeft = 'auto';
      imp.onclick = function () {
        if (!confirm('기존(구버전) 클립을 새 라이브러리로 복사할까요?\n· 일간+성별만 정해진 클립 → 일간 소개 영상\n· 일주+성별이 정해진 클립 → 일주 캐릭터 영상\n· 그 외 → 장면 미디어(영상)\n원본 클립은 그대로 남고, 가져온 뒤 각 탭에서 "변경사항 저장"을 눌러야 반영됩니다.')) return;
        imp.disabled = true; A.importLegacy(PW, function (r) { imp.disabled = false; if (r && (r.awakening || r.ilgan)) { A.saveAwakening(PW).then(function () { V2Intro.reload(); }).catch(function (er) { toast(er.message, true); }); } if (r) { toast('가져왔습니다 — 일간 소개 ' + r.ilgan + '개 · 일주 캐릭터 ' + r.awakening + '개 · 장면 미디어 ' + r.media + '개 (건너뜀 ' + r.skipped + '). 일간·일주 소개는 자동 저장했습니다.'); var on = $('#clNav .on', root); if (on) on.click(); } });
      };
      $('#clNav', root).appendChild(imp);
      go('media');
    }
  }

  /* ═════ ② 챕터 관리 (총괄) ═════
     모든 챕터를 한 곳에서 본다. 챕터는 각자 하나의 프로젝트(상품)에 속하고, 프로젝트끼리 챕터를 공유하지 않는다(필요하면 "복제"). 영상·해석 모듈·개운법은 공유 자료다. */
  var CH = { sel: null, tab: 'set', dirty: false, dbg: true, collapsed: {} };
  function chapOpen() {
    C.load().then(function () {
      if (!built.chap) { built.chap = 1; CH.sel = (ownedBy('full')[0] || chaptersAll()[0]).id; chapDraw(); } else if (CH.pending) { CH.sel = CH.pending; CH.pending = null; CH.tab = 'set'; chapDraw(); }
    });
  }
  function projList() {
    if (!PJ.list) PJ.list = R.Chapters.projects(ST.saved).map(function (p) { var q = clone(p); q.chapters = null; return q; });
    C.COND.project[1] = PJ.list.map(function (p) { return p.id; }); PJ.list.forEach(function (p) { C.LABELS[p.id] = p.name; }); // 조건 편집기의 "프로젝트" 선택지
    return PJ.list;
  }
  function projectById(id) { return projList().filter(function (p) { return p.id === id; })[0]; }
  function actCount(pid) { var p = projectById(pid); return Math.max(1, (p && p.acts && p.acts.length) || 1); }
  function ownedBy(pid) { return chaptersAll().filter(function (c) { return c.project === pid; }).sort(function (a, b) { return ((a.act || 1) - (b.act || 1)) || ((a.order || 0) - (b.order || 0)); }); }
  function renumber(pid) { ownedBy(pid).forEach(function (c, i) { c.order = i + 1; }); }
  var isDefaultId = function (id) { return R.Chapters.CHAPTERS.some(function (x) { return x.id === id; }); };
  function uniqueId(base) { var id = base, n = 2; while (chapterById(id)) id = base + '_' + n++; return id; }
  function addChapterTo(pid, src) { // 새 챕터(src 가 있으면 복제)를 pid 프로젝트 마지막 ACT 끝에 만든다
    var base = src ? (src.base || src.id) : 'cx', c = src ? clone(src) : { enabled: true, title: '새 챕터', subtitle: '', kind: 'module', moduleCategories: ['identity'], maxModules: 1, aiEnabled: true, accessLevel: 'free', coverImage: '', introText: '' };
    c.id = uniqueId(src ? pid + '_' + base : 'cx' + Date.now().toString(36).slice(-5)); c.project = pid; c.base = src ? base : c.id; c.act = actCount(pid); c.order = ownedBy(pid).length + 1; chaptersAll().push(c); CH.dirty = true; return c;
  }
  // 챕터·프로젝트를 함께 저장(챕터 소속·ACT·순서와 프로젝트 ACT 문구는 한 묶음)
  function saveStructure() {
    var part = { chapters: { chapters: chaptersAll().map(clone), acts: [] }, projects: projList().map(function (p) { var q = clone(p); q.chapters = null; return q; }) };
    return C.save(part).then(function () { ST.saved.chapters = part.chapters; ST.saved.projects = part.projects; CH.dirty = false; PJ.dirty = false; });
  }
  // 챕터 관리 맨 위 "도입" 그룹: 일간 소개(20)·일주 소개(120)의 영상·문구를 일괄 편집한다(상단 "일간·일주 소개" 탭과 같은 화면)
  function introGroup() {
    var it = function (id, name, sub) { return '<div class="chi' + (CH.sel === id ? ' on' : '') + '" data-id="' + id + '"><span aria-hidden="true">🎬</span><div><b>' + name + '</b><br><small class="muted">' + sub + '</small></div></div>'; };
    return '<div class="pgrp"><div class="pgh"><b>도입 · 챕터 전에 나오는 소개</b></div>' + it('intro:prologue', '프롤로그 영상', '남·여 각 1개 · 무빙툰 시작 전') + it('intro:ilgan', '일간 소개', '10일간 × 남·여 = 20') + it('intro:iju', '일주 소개', '60일주 × 남·여 = 120') + '</div>';
  }
  function chapDraw() {
    var root = $('#t-v2chap'), projs = projList();
    var row = function (c, i) { var n = coverageOf(c);
      return '<div class="chi' + (c.id === CH.sel ? ' on' : '') + (c.enabled === false ? ' off' : '') + '" data-id="' + esc(c.id) + '"><input type="checkbox" data-en aria-label="사용"' + (c.enabled !== false ? ' checked' : '') + '><div><b>' + String(i + 1).padStart(2, '0') + ' ' + esc(c.title) + '</b><small>ACT ' + (c.act || 1) + ' · ' + esc(c.kind) + ' · 모듈 ' + n + (n === 0 && c.kind !== 'remedy' && c.kind !== 'summary' ? ' <span class="pill w">비어 있음</span>' : '') + '</small></div><span><button type="button" data-mv="-1" aria-label="위로">▲</button><button type="button" data-mv="1" aria-label="아래로">▼</button></span></div>'; };
    var known = {}; projs.forEach(function (p) { known[p.id] = 1; });
    var groups = projs.map(function (p) {
      var list = ownedBy(p.id), open = !CH.collapsed[p.id];
      return '<div class="pgrp"><div class="pgh" data-pg="' + esc(p.id) + '"><b>' + (open ? '▾' : '▸') + ' ' + esc(p.name) + '</b><span class="muted">' + list.length + '개' + (p.enabled === false ? ' · 비공개' : '') + '</span><span style="flex:1"></span><button type="button" data-addch="' + esc(p.id) + '" title="이 프로젝트에 새 챕터 추가">+ 챕터</button></div>' + (open ? list.map(row).join('') : '') + '</div>';
    }).join('');
    groups = introGroup() + groups;
    var orphan = chaptersAll().filter(function (c) { return !known[c.project]; });
    if (orphan.length) groups += '<div class="pgrp"><div class="pgh"><b>(프로젝트 없음)</b></div>' + orphan.map(row).join('') + '</div>';
    root.innerHTML = '<div class="cols"><div class="card"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px"><b style="color:var(--gold)">챕터 총괄</b><span style="flex:1"></span><button type="button" id="chAddProj" title="새 프로젝트(상품) 만들기">+ 프로젝트</button><button class="pri" type="button" id="chSave"' + (CH.dirty || PJ.dirty ? '' : ' disabled') + '>저장</button></div>' +
      '<p class="muted" style="margin:0 0 8px;font-size:.76rem">챕터는 하나의 프로젝트에만 속합니다. 같은 내용을 다른 상품에서도 쓰려면 챕터를 "복제"하세요. 영상·해석 모듈·개운법은 같이 씁니다.</p><div class="chl">' + groups + '</div></div><div id="chEd"></div></div>';
    $('.chl', root).onclick = function (e) {
      var add = e.target.closest('[data-addch]'); if (add) { var nc = addChapterTo(add.dataset.addch); CH.sel = nc.id; CH.tab = 'set'; chapDraw(); return; }
      var pg = e.target.closest('.pgh'); if (pg && !e.target.closest('button')) { CH.collapsed[pg.dataset.pg] = !CH.collapsed[pg.dataset.pg]; chapDraw(); return; }
      var rw = e.target.closest('.chi'); if (!rw) return; var id = rw.dataset.id, c = chapterById(id);
      if (/^intro:/.test(id)) { CH.sel = id; chapDraw(); return; }
      if (e.target.matches('[data-en]')) { c.enabled = e.target.checked; CH.dirty = true; chapDraw(); return; }
      var mv = e.target.closest('[data-mv]'); if (mv) { // 같은 ACT 안에서만 순서 교환 (ACT 이동은 프로젝트 탭)
        var same = ownedBy(c.project).filter(function (x) { return (x.act || 1) === (c.act || 1); }), i = same.indexOf(c), j = i + +mv.dataset.mv;
        if (j >= 0 && j < same.length) { var t = same[j].order; same[j].order = c.order; c.order = t; renumber(c.project); CH.dirty = true; chapDraw(); } return;
      }
      CH.sel = id; CH.tab = 'set'; chapDraw();
    };
    $('#chAddProj', root).onclick = function () {
      var name = prompt('새 프로젝트(상품) 이름', '새 프로젝트'); if (!name || !name.trim()) return;
      var id = 'p' + Date.now().toString(36).slice(-6);
      projs.push({ id: id, name: name.trim(), desc: '', enabled: true, accessLevel: 'free', requiredCompletionRate: null, chapters: null, needTags: [], acts: [{ title: '시작', line: '', pdfDone: '' }] });
      PJ.sel = id; PJ.dirty = true; CH.collapsed[id] = false;
      var nc = addChapterTo(id); CH.sel = nc.id; CH.tab = 'set'; chapDraw(); toast('프로젝트를 만들었습니다 — 저장을 눌러 반영하세요');
    };
    $('#chSave', root).onclick = function () { this.disabled = true; saveStructure().then(function () { chapDraw(); toast('저장했습니다'); }).catch(function (e) { toast(e.message, true); chapDraw(); }); };
    chapEditor();
  }
  function chapEditor() {
    var box = $('#chEd'); if (CH.sel === 'intro:prologue') { V2Prologue.mount(box); return; } if (/^intro:/.test(CH.sel || '')) { V2Intro.mount(box, PW, { mode: CH.sel.slice(6) }); return; }
    var c = chapterById(CH.sel); if (!c) { box.innerHTML = ''; return; }
    var tabs = [['set', '기본 설정'], ['mod', '해석 모듈'], ['pv', '미리보기']]; if (c.kind === 'remedy' || c.kind === 'summary') tabs.splice(2, 0, ['rem', '개운법 라이브러리']);
    box.innerHTML = '<div class="card"><div class="sub2" id="chTabs"></div><div id="chBody"></div></div>';
    subnav($('#chTabs', box), tabs, CH.tab, function (k) { CH.tab = k; chapBody(c); }); chapBody(c);
  }
  function chapBody(c) {
    var b = $('#chBody');
    if (CH.tab === 'set') {
      b.innerHTML = '<div class="g2c"><div class="fld"><label>제목</label><input type="text" data-k="title" value="' + esc(c.title) + '"></div><div class="fld"><label>부제</label><input type="text" data-k="subtitle" value="' + esc(c.subtitle) + '"></div></div>' +
        '<div class="fld"><label>소개 문장 (챕터 첫 화면)</label><input type="text" data-k="introText" value="' + esc(c.introText || '') + '"></div><div class="fld"><label>대표 이미지 주소 (비우면 미디어 라이브러리에서 자동 선택)</label><input type="text" data-k="coverImage" value="' + esc(c.coverImage || '') + '"></div>' +
        '<div class="fld"><label>이 챕터가 쓰는 해석 모듈 카테고리</label><div class="cg" data-cats>' + C.CATS.map(function (k) { return '<label><input type="checkbox" value="' + k + '"' + ((c.moduleCategories || []).indexOf(k) >= 0 ? ' checked' : '') + '><span>' + C.CAT_KO[k] + '</span></label>'; }).join('') + '</div></div>' +
        '<div class="g2c"><div class="fld"><label>최대 모듈 수</label><input type="number" data-k="maxModules" min="1" max="8" value="' + (c.maxModules || 1) + '"></div><div class="fld"><label>접근</label><select data-k="accessLevel"><option value="free"' + (c.accessLevel !== 'premium' ? ' selected' : '') + '>free</option><option value="premium"' + (c.accessLevel === 'premium' ? ' selected' : '') + '>premium</option></select></div></div>' +
        '<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-k="aiEnabled"' + (c.aiEnabled !== false ? ' checked' : '') + '>AI 연결 사용 (끄면 사람이 쓴 모듈 문장 그대로)</label>' + (c.disclaimer != null && c.disclaimer !== '' ? '<div class="fld"><label>하단 안내 문구</label><input type="text" data-k="disclaimer" value="' + esc(c.disclaimer) + '"></div>' : '') +
        '<div class="g2c"><div class="fld"><label>소속 프로젝트 (챕터는 한 프로젝트에만 속합니다)</label><select data-proj>' + projList().map(function (p) { return '<option value="' + esc(p.id) + '"' + (c.project === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></div><div class="fld"><label>ACT</label><select data-actsel>' + Array.apply(null, Array(actCount(c.project))).map(function (_, k) { return '<option value="' + (k + 1) + '"' + ((c.act || 1) === k + 1 ? ' selected' : '') + '>ACT ' + (k + 1) + ((projectById(c.project) && projectById(c.project).acts && projectById(c.project).acts[k] && projectById(c.project).acts[k].title) ? ' · ' + esc(projectById(c.project).acts[k].title) : '') + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="row" style="align-items:end"><label style="display:grid;gap:3px;font-size:.8rem;color:var(--ink2)">다른 프로젝트로 복제 (독립된 사본)<select data-dupproj>' + projList().filter(function (p) { return p.id !== c.project; }).map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('') + '</select></label><button type="button" data-dupgo>복제</button></div>' +
        '<p class="muted">id ' + esc(c.id) + ' · 종류 ' + esc(c.kind) + ' · 기본 챕터 ' + esc(c.base || c.id) + '<br>이 챕터는 <b>' + esc((projectById(c.project) || { name: c.project }).name) + '</b> 상품에서만 쓰입니다. 순서·ACT 묶음은 <b>프로젝트</b> 탭에서도 정할 수 있고, 챕터 내용은 여기서만 고칩니다.</p>' + '<div class="row"><button type="button" id="chDel" class="danger">삭제</button></div>';
      var upd = function (e) { var t = e.target, k = t.dataset && t.dataset.k;
        if (t.matches && t.matches('[data-proj]')) { var old = c.project; c.project = t.value; c.act = actCount(c.project); c.order = 9999; renumber(c.project); renumber(old); CH.dirty = true; chapDraw(); return; }
        if (t.matches && t.matches('[data-actsel]')) { c.act = +t.value; c.order = 9999; renumber(c.project); CH.dirty = true; chapDraw(); return; } if (t.closest('[data-cats]')) c.moduleCategories = $$('[data-cats] input:checked', b).map(function (i) { return i.value; }); else if (k) c[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? +t.value : t.value; else return; CH.dirty = true; $('#chSave').disabled = false; if (k === 'title') $('.chi.on b').textContent = $('.chi.on b').textContent.slice(0, 3) + t.value; };
      b.oninput = upd; b.onchange = upd;
      var dg = $('[data-dupgo]', b); if (dg) dg.onclick = function () { var tp = $('[data-dupproj]', b).value; if (!tp) return; var nc = addChapterTo(tp, c); toast('복제했습니다 → ' + projectById(tp).name); CH.sel = nc.id; CH.tab = 'set'; chapDraw(); };
      $('#chDel', b).onclick = function () { // 기본 챕터는 코드에 들어 있어 목록에서 빼는 대신 "꺼서" 리포트에서 사라지게 한다. 만든 챕터는 완전히 지운다. 저장해야 반영된다.
        if (!confirm('이 챕터를 삭제할까요? (프로젝트에서도 빠집니다)')) return; var i = W.chapters.indexOf(c);
        if (isDefaultId(c.id)) { c.enabled = false; toast('삭제했습니다. 저장하면 리포트에서 빠집니다 (목록에서 체크하면 되살릴 수 있습니다)'); } else W.chapters = W.chapters.filter(function (x) { return x !== c; });
        var next = W.chapters.filter(function (x) { return x.enabled !== false && x.project === c.project; })[0] || W.chapters.filter(function (x) { return x.enabled !== false; })[0] || W.chapters[0]; CH.sel = next.id; CH.dirty = true; chapDraw(); };
    } else if (CH.tab === 'mod' || CH.tab === 'rem') {
      var cfg = CH.tab === 'mod' ? C.modCfg() : C.remCfg(), key = CH.tab === 'mod' ? 'modules' : 'remedies';
      b.innerHTML = '<p class="muted">' + (CH.tab === 'mod' ? '이 챕터에서 선택되는 해석 모듈(' + (c.moduleCategories || []).map(function (k) { return C.CAT_KO[k]; }).join('·') + ')입니다. 수정하면 "미리보기" 탭에 바로 반영됩니다.' : '개운법·행동 추천 라이브러리입니다(필요 행동 태그와 겹칠수록 추천).') + '</p><div id="chItems"></div>';
      cfg.onChange = function (list, saved) { W[key] = list; W['d_' + key] = !saved; if (TST.pane) TST.pane.refresh(); if (CH.pane) CH.pane.refresh(); }; cfg.initial = W[key] || null; cfg.initialDirty = !!W['d_' + key]; if (CH.tab === 'mod') cfg.lockCats = c.moduleCategories && c.moduleCategories.length ? c.moduleCategories : null;
      C.itemAdmin($('#chItems', b), cfg);
      if (CH.pendingModule) { var li = $('#chItems .v2li[data-id="' + CH.pendingModule + '"]'); if (li) li.click(); CH.pendingModule = null; }
    } else {
      b.innerHTML = '<div class="row" style="align-items:center;margin-bottom:8px"><span class="muted" id="pvSum"></span><span style="flex:1"></span><button type="button" id="pvEdit">테스트 사주 바꾸기 (조합 테스트)</button></div><div id="pvHost"></div><div class="card" id="pvTx" style="margin-top:10px"></div>';
      var ptx = {}, pane = PreviewPane($('#pvHost', b), { onChapter: function () { }, onTx: function (m) { ptx.p.onTx(m); }, onList: function (m) { ptx.p.onList(m); }, onMove: function (m) { ptx.p.onMove(m); } }); CH.pane = pane; ptx.p = TxPanel($('#pvTx', b), pane, function () { return c.id; });
      computeSd().then(function (sd) { $('#pvSum', b).textContent = TS.date + ' ' + TS.time + ' ' + (TS.gender === 'M' ? '남' : '여') + ' · ' + sd.dayPillar.ko + '일주'; });
      pane.show(c.id, 'full'); $('#pvEdit', b).onclick = function () { gotoTab('v2test'); };
    }
  }

  /* ═════ 미리보기 부품: 실제 뷰어(/report/v2/?preview=1)를 iframe 으로 띄워 저장 전 내용을 그대로 보여 준다 ═════ */
  var PVS = []; // 살아 있는 미리보기들
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    PVS = PVS.filter(function (p) { return document.body.contains(p.frame); });
    PVS.forEach(function (p) { if (e.source === p.frame.contentWindow) { if (e.data.type === 'mt-v2-ready') { p.ready = true; if (p.pending) p.send(p.pending); if (p.paused) p.send({ type: 'mt-v2-pause', on: true }); } else if (e.data.type === 'mt-v2-chapter' && p.onChapter) p.onChapter(e.data.id); else if (e.data.type === 'mt-v2-tx' && p.onTx) p.onTx(e.data); else if (e.data.type === 'mt-v2-txlist' && p.onList) p.onList(e.data); else if (e.data.type === 'mt-v2-txmove' && p.onMove) p.onMove(e.data); } });
  });
  var awkMemo = null;
  function awakeningFor(sd) { // 이 사주의 일주 캐릭터 영상(없으면 기본 영상) + 일간 소개 — 뷰어가 받는 모양 {video, ilgan, fallback}
    return (awkMemo ? Promise.resolve(awkMemo) : fetch('/api/awakening?all=1', { headers: { authorization: 'Bearer ' + PW } }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (d) { awkMemo = d; return d; })).then(function (d) {
      var pk = R.Media.pickAwakening(d.videos || [], sd.dayPillar.ko, sd.gender, d.fallback), ig = R.Media.pickIlgan(d.ilgan || [], sd.dayMaster.stem, sd.gender); var to = !!d.textOnly, tx = function (L, f) { return (L || []).filter(function (x) { return x.enabled !== false && (x.title || x.subtitle) && f(x); })[0] || null; };
      if (to && !ig) ig = tx(d.ilgan, function (x) { return x.stem === sd.dayMaster.stem && x.gender === sd.gender; }); // 영상 없이 문구만
      if (to && (!pk.clip || pk.fallback)) { var tv = tx(d.videos, function (x) { return x.dayPillar === sd.dayPillar.ko && x.gender === sd.gender; }); if (tv) pk = Object.assign({}, pk, { clip: tv, fallback: false }); }
      return { pick: pk, ilgan: ig, awk: Object.assign(pk.fallback ? { video: null, fallback: pk.clip } : { video: pk.clip }, { ilgan: ig, textOnly: to }) };
    });
  }
  // el 안에 [모바일|PC] 전환 + 미리보기 틀을 만든다. 반환: { show(chapterId|'ilgan', projectId), refresh() }
  function PreviewPane(el, opt) {
    opt = opt || {}; var dev = 'm', P = { ready: false, pending: null, last: null };
    el.innerHTML = '<div class="pvbar"><button type="button" data-d="m" class="on">모바일</button><button type="button" data-d="d">PC</button><button type="button" data-r title="새로 그리기">⟳</button><button type="button" data-pause title="미리보기 영상·애니메이션 멈춤/재생">⏸ 멈춤</button><span class="muted pvmsg"></span></div><div class="pvwrap"><div class="pvbox"><iframe title="리포트 미리보기" src="/report/v2/?preview=1"></iframe></div></div>';
    var frame = $('iframe', el), box = $('.pvbox', el), wrap = $('.pvwrap', el), msg = $('.pvmsg', el);
    P.frame = frame; P.onChapter = opt.onChapter; P.onTx = opt.onTx; P.onList = opt.onList; P.onMove = opt.onMove;
    P.sendTs = function (replay) { if (P.ready) P.send({ type: 'mt-v2-textstyle', ts: tsWork(), replay: !!replay }); };
    P.selectRole = function (role) { if (P.ready) P.send({ type: 'mt-v2-txselect', role: role }); };
    function fit() { var w = dev === 'm' ? 390 : 1100, h = dev === 'm' ? 760 : 700, avail = Math.max(240, wrap.clientWidth || 380), s = Math.min(1, avail / w); frame.style.width = w + 'px'; frame.style.height = h + 'px'; frame.style.transform = 'scale(' + s + ')'; box.style.width = Math.round(w * s) + 'px'; box.style.height = Math.round(h * s) + 'px'; }
    P.send = function (m) { frame.contentWindow.postMessage(m, location.origin); };
    P.show = function (chapterId, projectId) {
      msg.textContent = '계산 중…';
      return Promise.all([C.load(), computeSd()]).then(function (a) {
        var sd = a[1]; return awakeningFor(sd).then(function (aw) {
          var d = TS.date.split('-').map(Number), t = (TS.time || '12:00').split(':').map(Number);
          var m = { type: 'mt-v2-preview', chapter: chapterId, project: projectId || 'full', content: content(), media: ST.media, awk: aw.awk, now: new Date(TS.now + 'T12:00:00+09:00').getTime(),
            input: { year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TS.gender, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' } };
          P.last = m; if (P.ready) P.send(m); else P.pending = m; msg.textContent = '';
        });
      }).catch(function (e) { msg.textContent = e.message; });
    };
    P.refresh = function () { if (P.last) { P.last.content = content(); P.last.media = ST.media; if (P.ready) P.send(P.last); } };
    el.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.d) { dev = b.dataset.d; $$('.pvbar [data-d]', el).forEach(function (x) { x.classList.toggle('on', x === b); }); fit(); } else if (b.hasAttribute('data-pause')) { P.paused = !P.paused; b.textContent = P.paused ? '▶ 재생' : '⏸ 멈춤'; b.classList.toggle('on', P.paused); if (P.ready) P.send({ type: 'mt-v2-pause', on: P.paused }); } else if (b.hasAttribute('data-r')) { P.ready = false; P.pending = P.last; frame.src = '/report/v2/?preview=1&_=' + Date.now(); } };
    PVS.push(P); fit(); window.addEventListener('resize', fit); return P;
  }

  /* ═════ 글자(자막) 편집 패널: 미리보기에서 글자를 누르거나 목록에서 골라 글씨체·크기·색·정렬·위치·등장/사라짐 효과·나타나는/사라지는 시기를 고친다 ═════ */
  var TX = { dirty: false };
  function tsWork() { if (!W.ts) { var s = clone(ST.saved.textStyles || {}); s.all = s.all || {}; s.chapters = s.chapters || {}; W.ts = s; } return W.ts; }
  var TXR = function () { return R.TextStyle; };
  function TxPanel(el, pane, curCid) { // curCid(): 지금 보고 있는 챕터 id (영상 단계면 '_')
    var T = TXR(), P = { role: null, cid: null, roles: [], scope: 'chapter' };
    var isStage = function (r) { return !!(T.ROLES[r] && T.ROLES[r][1]); };
    var target = function (create) { var ts = tsWork(), st = isStage(P.role) || P.scope === 'all' ? ts.all : ((ts.chapters[P.cid] = ts.chapters[P.cid] || {})); if (create && !st[P.role]) st[P.role] = {}; return st[P.role]; };
    var effective = function () { return T.resolve(tsWork(), P.cid, P.role); };
    function put(k, v) {
      var t = target(true); if (v === '' || v == null || (typeof v === 'number' && !isFinite(v))) delete t[k]; else t[k] = v;
      var ts = tsWork(); [ts.all, ts.chapters[P.cid]].forEach(function (m) { if (m && m[P.role] && !Object.keys(m[P.role]).length) delete m[P.role]; });
      TX.dirty = true; $('[data-txsave]', el) && ($('[data-txsave]', el).disabled = false); pane.sendTs(false);
    }
    function field(label, inner, wide) { return '<div class="fld' + (wide ? '' : '') + '" style="' + (wide ? 'grid-column:1/-1' : '') + '"><label>' + label + '</label>' + inner + '</div>'; }
    function nf(k, min, max, step, ph) { var v = effective()[k]; return '<div style="display:flex;gap:6px;align-items:center"><input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + (v != null ? v : (ph != null ? ph : min)) + '" style="flex:1;padding:0"><input type="number" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + (v != null ? v : '') + '" placeholder="' + (ph != null ? ph : '') + '" style="width:72px"></div>'; }
    function cf(k, def) { var v = effective()[k]; return '<div style="display:flex;gap:6px"><input type="color" data-ck="' + k + '" value="' + (v || def) + '" style="width:38px;height:30px;padding:0"><input type="text" data-k="' + k + '" value="' + esc(v || '') + '" placeholder="' + def + '"></div>'; }
    function decoBlock() { // 테두리·그림자·빛번짐·배경 상자
      var BD = [['', '실선'], ['dashed', '점선(긴)'], ['dotted', '점선(짧은)'], ['double', '이중선']];
      return '<div class="cap2">글자 테두리 (외곽선)</div><div class="g2c">' + field('굵기 (px, 0=없음)', nf('strokeW', 0, 12, 0.5, 0)) + field('색', cf('strokeC', '#000000')) + '</div>' +
        '<div class="cap2">그림자</div><div class="g2c">' + field('가로 (px)', nf('shX', -40, 40, 1, 0)) + field('세로 (px)', nf('shY', -40, 40, 1, 0)) + field('번짐 (px)', nf('shB', 0, 80, 1, 0)) + field('색', cf('shC', '#000000')) + '</div>' +
        '<div class="cap2">빛번짐 (글로우)</div><div class="g2c">' + field('세기 (px, 0=없음)', nf('glowB', 0, 100, 1, 0)) + field('색', cf('glowC', '#FFD27A')) + '</div>' +
        '<div class="cap2">배경 상자</div><div class="g2c">' + field('배경색', cf('bgC', '#000000')) + field('배경 진하기 (0~1)', nf('bgA', 0, 1, 0.05, 0.6)) + field('좌우 여백 (px)', nf('padX', 0, 80, 1, 16)) + field('위아래 여백 (px)', nf('padY', 0, 80, 1, 8)) + field('모서리 둥글기 (px)', nf('radius', 0, 80, 1, 0)) + '</div>' +
        '<div class="cap2">상자 테두리</div><div class="g2c">' + field('굵기 (px, 0=없음)', nf('bdW', 0, 12, 0.5, 0)) + field('색', cf('bdC', '#CDB27A')) + field('모양', sel('bdS', BD)) + '</div>' +
        '<div class="g2c">' + field('전체 투명도 (0.1~1)', nf('opacity', 0.1, 1, 0.05, 1)) + '</div>';
    }
    function sel(k, opts, wide) { var v = effective()[k] || ''; return '<select data-k="' + k + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
    // 사주마다 달라지는 문장은 통째로 바꾸면 모두 같은 문장이 되므로 직접 입력을 막는다(해석 모듈 탭에서 고친다)
    var FIXED_ROLES = ['insight.fact', 'insight.lead', 'choice.line', 'scene.caption', 'explain.lead', 'ilgan.kw', 'awk.kw'], DYN_ROLES = ['intro.headline', 'end.quote', 'ilgan.title', 'ilgan.sub', 'awk.title', 'awk.sub'];
    function textBlock(e) {
      var seq = '<label class="chk2" style="display:flex;gap:6px;align-items:center;margin:8px 0 2px"><input type="checkbox" data-k="seq"' + (e.seq ? ' checked' : '') + ' style="width:auto"> 줄마다 차례로 나타나기 (줄바꿈 기준)</label>' +
        '<div class="g2c">' + field('줄 사이 간격 (초)', nf('seqGap', 0.2, 10, 0.1, 1)) + '</div>';
      if (FIXED_ROLES.indexOf(P.role) >= 0) return '<div class="cap2">문장</div><p class="muted" style="font-size:.76rem;margin:0">이 문장은 사주마다 달라서 여기서 직접 쓸 수 없어요. 문장 내용은 <b>해석 모듈</b>에서 고치고, 줄바꿈 단위로 차례 등장만 여기서 정합니다.</p>' + seq;
      var warn = DYN_ROLES.indexOf(P.role) >= 0 ? '<p class="muted" style="font-size:.76rem;margin:0 0 4px;color:#FFC080">주의: 직접 쓰면 모든 사주에 이 문장이 똑같이 나옵니다. 비워 두면 원래 문장입니다.</p>' : '';
      return '<div class="cap2">문장 (Enter 로 줄바꿈 · 비우면 원래 문장)</div>' + warn +
        '<textarea data-k="text" rows="4" style="width:100%;resize:vertical" placeholder="' + esc(P.orig || '') + '">' + esc(e.text || '') + '</textarea>' +
        '<div class="row" style="margin-top:6px"><button type="button" data-fetch title="미리보기에 지금 나오는 문장을 불러옵니다">현재 문장 가져오기</button></div>' +
        '<div class="cap2">AI로 다듬기</div><div class="row" style="align-items:center;gap:6px;flex-wrap:wrap"><input type="text" data-aitone placeholder="말투·방향 (예: 더 부드럽게, 짧게)" style="flex:1;min-width:140px"><button type="button" data-ai="draft" title="쓴 초안의 뜻은 살리고 매끄럽게">다듬기</button><button type="button" data-ai="expand" title="초안에 살을 붙여 풍성하게">보충하기</button><button type="button" data-ai="split" title="뜻은 그대로 한 호흡씩 줄바꿈">줄 나누기</button></div>' +
        '<div class="muted" data-aimsg style="font-size:.76rem;margin-top:4px"></div>' + seq;
    }
    /* 일괄 적용: 지금 글자의 설정 중 고른 묶음(글씨체·크기·위치·효과)을 선택한 다른 글자들에 복사한다. 문장 내용은 복사하지 않는다.
       영상 단계 자막은 전체 적용, 그 외는 위에서 고른 적용 범위(이 챕터만/모든 챕터)를 따른다. */
    var BULK = [['font', '글씨체·굵기·색·정렬·자간·줄간격', ['font', 'weight', 'color', 'align', 'spacing', 'line']], ['size', '크기', ['size', 'sizeM']], ['pos', '위치', ['x', 'y']], ['in', '나타나기(차례 등장 포함)', ['in', 'inSpeed', 'inDelay', 'seq', 'seqGap']], ['out', '사라지기', ['hold', 'out', 'outSpeed']], ['loop', '계속 움직이는 효과', ['loop', 'loopSpeed']], ['deco', '테두리·그림자·글로우·배경 상자·투명도', ['strokeW', 'strokeC', 'shX', 'shY', 'shB', 'shC', 'glowB', 'glowC', 'bgC', 'bgA', 'padX', 'padY', 'radius', 'bdW', 'bdC', 'bdS', 'opacity']]];
    function bulkBlock() {
      var roles = Object.keys(T.ROLES).filter(function (r) { return r !== P.role; });
      return '<div class="cap2">여러 글자에 한꺼번에 적용</div><p class="muted" style="font-size:.76rem;margin:0 0 4px">지금 글자의 설정을 복사합니다. 복사할 항목과 받을 글자를 고르세요.</p>' +
        '<div class="sub2" style="margin:0 0 6px">' + BULK.map(function (b) { return '<label class="chk2" style="display:flex;gap:4px;align-items:center;font-size:.8rem"><input type="checkbox" data-bk="' + b[0] + '" style="width:auto"' + (b[0] === 'font' ? ' checked' : '') + '>' + b[1] + '</label>'; }).join('') + '</div>' +
        '<div class="sub2" style="margin:0 0 6px"><button type="button" data-bkall>전체 선택</button>' + roles.map(function (r) { return '<label class="chk2" style="display:flex;gap:4px;align-items:center;font-size:.8rem"><input type="checkbox" data-br="' + r + '" style="width:auto">' + esc(T.ROLES[r][0]) + '</label>'; }).join('') + '</div>' +
        '<div class="row"><button type="button" class="pri" data-bulk>선택한 글자에 적용</button></div>';
    }
    function bulkApply() {
      var keys = []; BULK.forEach(function (b) { if (el.querySelector('[data-bk="' + b[0] + '"]').checked) keys = keys.concat(b[2]); });
      var targets = [].slice.call(el.querySelectorAll('[data-br]')).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.br; });
      if (!keys.length || !targets.length) return toast('복사할 항목과 받을 글자를 고르세요', true);
      var src = effective(), ts = tsWork();
      targets.forEach(function (r) {
        var map = isStage(r) || P.scope === 'all' ? ts.all : (ts.chapters[P.cid] = ts.chapters[P.cid] || {}), t = map[r] = map[r] || {};
        keys.forEach(function (k) { if (src[k] == null || src[k] === '') delete t[k]; else t[k] = src[k]; });
        if (!Object.keys(t).length) delete map[r];
      });
      TX.dirty = true; pane.sendTs(true); render(); toast(targets.length + '개 글자에 적용했습니다 — 글자 설정 저장을 눌러 반영하세요');
    }
    function aiRun(task, btn) {
      var ta = el.querySelector('textarea[data-k="text"]'), msg = el.querySelector('[data-aimsg]'), text = (ta.value || P.orig || '').trim();
      if (!text) { msg.textContent = '먼저 초안을 쓰거나 "현재 문장 가져오기"를 누르세요'; return; }
      var btns = [].slice.call(el.querySelectorAll('[data-ai]')); btns.forEach(function (b) { b.disabled = true; }); msg.textContent = 'AI가 쓰는 중… (최대 40초)';
      fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + PW }, body: JSON.stringify({ task: task, text: text, tone: (el.querySelector('[data-aitone]') || {}).value || '', chapter: (T.ROLES[P.role] || [P.role])[0] }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || ('오류 ' + r.status)); return d; }); })
        .then(function (d) { ta.value = d.lines.join('\n'); put('text', ta.value); msg.textContent = (d.provider === 'anthropic' ? 'Claude' : 'GPT') + '가 ' + d.lines.length + '줄로 썼습니다. 마음에 안 들면 다시 누르거나 직접 고치세요.'; })
        .catch(function (er) { msg.textContent = er.message; })
        .then(function () { btns.forEach(function (b) { b.disabled = false; }); });
    }
    function render() {
      var list = P.roles.map(function (r) { return '<button type="button" data-role="' + r + '" class="' + (r === P.role ? 'on' : '') + '">' + esc((T.ROLES[r] || [r])[0]) + '</button>'; }).join('');
      var h = '<div class="row" style="align-items:center;margin-bottom:6px"><b style="color:var(--gold)">글자 편집</b><span class="muted" style="font-size:.76rem">미리보기에서 글자를 누르면 선택돼요 · 끌면 위치 이동</span><span style="flex:1"></span><button type="button" class="pri" data-txsave' + (TX.dirty ? '' : ' disabled') + '>글자 설정 저장</button></div>' +
        '<div class="sub2" style="margin:0 0 8px">' + (list || '<span class="muted">이 화면에 편집할 글자가 없습니다</span>') + '</div>';
      if (!P.role) { el.innerHTML = h; bind(); return; }
      var e = effective(), stage = isStage(P.role);
      h += '<div class="fld"><label>적용 범위</label>' + (stage ? '<div class="muted">영상 단계 자막은 모든 사주에 같이 적용됩니다</div>' : '<div class="sub2" style="margin:0"><button type="button" data-scope="chapter" class="' + (P.scope === 'chapter' ? 'on' : '') + '">이 챕터만</button><button type="button" data-scope="all" class="' + (P.scope === 'all' ? 'on' : '') + '">모든 챕터</button></div>') + '</div>' +
        textBlock(e) +
        '<div class="g2c">' + field('글씨체', sel('font', [['', '(기본)']].concat(window.StoryFonts.list))) + field('굵기', sel('weight', [['', '(기본)']].concat(T.WEIGHTS))) + '</div>' +
        '<div class="g2c">' + field('크기 · PC (px)', nf('size', 8, 120, 1, 16)) + field('크기 · 모바일 (px, 비우면 PC와 같게)', nf('sizeM', 8, 120, 1, 16)) + '</div>' +
        '<div class="g2c">' + field('색', '<div style="display:flex;gap:6px"><input type="color" data-color value="' + (e.color || '#EDE8DC') + '" style="width:38px;height:30px;padding:0"><input type="text" data-k="color" value="' + esc(e.color || '') + '" placeholder="기본 색"></div>') + field('정렬', '<div class="sub2" style="margin:0">' + [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']].map(function (a) { return '<button type="button" data-al="' + a[0] + '" class="' + (e.align === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div>') + '</div>' +
        '<div class="g2c">' + field('자간 (px)', nf('spacing', -3, 30, 0.5, 0)) + field('줄 간격 (배)', nf('line', 0.8, 3, 0.05, 1.6)) + '</div>' +
        '<div class="g2c">' + field('가로 이동 (화면 %, 음수=왼쪽)', nf('x', -80, 80, 0.5, 0)) + field('세로 이동 (화면 %, 음수=위)', nf('y', -80, 80, 0.5, 0)) + '</div>' +
        decoBlock(e) +
        '<p class="muted" style="font-size:.78rem;margin:12px 0 0">글자는 움직이지 않습니다 — 나타나기·사라지기·계속 움직이는 효과는 읽기 모드에서 쓰지 않아 숨겼습니다(저장된 값은 그대로 보존). 강조는 글씨체·크기·굵기·색·여백으로 합니다.</p>' +
        '<div class="row" style="margin-top:10px"><button type="button" data-reset>이 글자 설정 되돌리기</button></div>' + bulkBlock();
      el.innerHTML = h; bind();
    }
    function bind() {
      el.onclick = function (e) {
        var r = e.target.closest('[data-role]'); if (r) { P.role = r.dataset.role; if (!P.cid) P.cid = curCid(); pane.selectRole(P.role); render(); return; }
        var sc = e.target.closest('[data-scope]'); if (sc) { P.scope = sc.dataset.scope; render(); return; }
        var al = e.target.closest('[data-al]'); if (al) { put('align', al.dataset.al); render(); return; }
        if (e.target.closest('[data-play]')) { pane.sendTs(true); return; }
        if (e.target.closest('[data-bulk]')) { bulkApply(); return; }
        if (e.target.closest('[data-bkall]')) { var rs = [].slice.call(el.querySelectorAll('[data-br]')), on = rs.some(function (c) { return !c.checked; }); rs.forEach(function (c) { c.checked = on; }); return; }
        var ai = e.target.closest('[data-ai]'); if (ai) { aiRun(ai.dataset.ai, ai); return; }
        if (e.target.closest('[data-fetch]')) { var ta = el.querySelector('textarea[data-k="text"]'); if (ta && P.orig) { ta.value = P.orig; put('text', P.orig); } return; }
        if (e.target.closest('[data-reset]')) { var t = target(false); if (t) { Object.keys(t).forEach(function (k) { delete t[k]; }); var ts = tsWork(); [ts.all, ts.chapters[P.cid]].forEach(function (m) { if (m && m[P.role] && !Object.keys(m[P.role]).length) delete m[P.role]; }); } TX.dirty = true; pane.sendTs(true); render(); return; }
        if (e.target.closest('[data-txsave]')) { var b = e.target.closest('[data-txsave]'); b.disabled = true; C.save({ textStyles: tsWork() }).then(function () { ST.saved.textStyles = clone(tsWork()); TX.dirty = false; render(); toast('글자 설정을 저장했습니다'); }).catch(function (er) { toast(er.message, true); b.disabled = false; }); }
      };
      el.oninput = el.onchange = function (e) {
        var t = e.target, k = t.getAttribute && t.getAttribute('data-k');
        if (t.hasAttribute && t.hasAttribute('data-ck')) { var ck = t.getAttribute('data-ck'); put(ck, t.value); var tt = el.querySelector('input[type=text][data-k="' + ck + '"]'); if (tt) tt.value = t.value; return; }
        if (t.hasAttribute && t.hasAttribute('data-color')) { put('color', t.value); var ti = el.querySelector('input[type=text][data-k=color]'); if (ti) ti.value = t.value; return; }
        if (!k) return; if (k === 'seq') { put('seq', t.checked ? true : ''); return; }
        if (k === 'text') { clearTimeout(P.tt); var tv = t.value; P.tt = setTimeout(function () { put('text', tv); }, 350); return; }
        var v = t.type === 'number' || t.type === 'range' ? (t.value === '' ? '' : +t.value) : t.value; put(k, v);
        if (t.type === 'range' || t.type === 'number') el.querySelectorAll('[data-k="' + k + '"]').forEach(function (o) { if (o !== t && (o.type === 'number' || o.type === 'range')) o.value = t.value; });
      };
    }
    P.onTx = function (m) { P.role = m.role || null; P.orig = m.orig || ''; P.cid = m.cid || curCid(); if (P.role && isStage(P.role)) P.scope = 'all'; render(); };
    P.onList = function (m) { P.roles = m.roles || []; P.cid = m.cid || P.cid; if (P.role && P.roles.indexOf(P.role) < 0) P.role = null; render(); };
    P.onMove = function (m) { P.role = m.role; P.cid = m.cid || P.cid; if (isStage(P.role)) P.scope = 'all'; var t = target(true); t.x = m.x; t.y = m.y; TX.dirty = true; pane.sendTs(false); render(); };
    render(); return P;
  }

  /* ═════ 필요한 클립 소스 + 바로 올리기 (조합 테스트) ═════
     장면마다 "어떤 클립이 필요한지"(장면 의도에서 나온 태그·타입)와 지금 후보가 몇 개인지 보여 주고, 그 자리에 파일을 바로 올린다.
     올린 파일은 "클립 보관함(미디어 라이브러리)"에 저장된다: 장면 의도에서 뽑은 태그가 붙고, 이 챕터 전용으로 지정되어 이 챕터 안에서만 후보가 된다.
     어느 장면에 어떤 클립을 쓸지는 고정하지 않고 선택 로직(태그 점수 + AI)이 챕터 안에서 고른다. */
  var SCENE_KO = { chapterIntro: '챕터 첫 화면 (대표 이미지·영상)', insight: '핵심 해석', explanation: '의미 설명', visualMetaphor: '상징 장면', recommendation: '추천 카드', warning: '조심할 점', action: '행동', chapterEnding: '챕터 끝', transition: '전환' };
  var MTYPE_KO = { video: '영상', image: '이미지', videoLoop: '짧은 반복 영상', backgroundVideo: '배경 영상', character: '캐릭터 컷', symbol: '상징 이미지', chapterCover: '챕터 커버', transition: '전환 영상' };
  var INTENT_KO = { element: '오행', state: '상태', theme: '주제', emotion: '감정', scene: '장면', role: '역할', action: '행동' };
  var needsMedia = function (s) { if (s.sceneType === 'cinema') return s.kind === 'script' && s.bg !== 'black'; return R.Scenes.SCENE_RULES[s.sceneType] && R.Scenes.SCENE_RULES[s.sceneType].media; }; // 영화 장면(현실·은유 장면)도 클립이 필요하다. 검은 화면·타이틀·데이터 카드는 제외
  function intentTags(s) { // 장면 의도 → 분류별 태그(허용 목록에 있는 것만)
    var T = R.Scenes.TAX, it = s.intent || {}, f = function (arr, k) { return (arr || []).filter(function (x, i, a) { return T[k].indexOf(x) >= 0 && a.indexOf(x) === i; }); };
    if (s.sceneType === 'cinema') { var mi = s.mediaIntent || {}, cl = R.Scenes.classify((s.cinema && s.cinema.mediaTags) || []); return { element: f(mi.elements, 'element'), state: f(mi.states, 'state'), emotion: f(mi.emotions, 'emotion'), scene: f((mi.scenes || []).concat(cl.scene || []), 'scene'), theme: f(mi.themes, 'theme'), role: [], action: f(mi.actions, 'action') }; }
    return { element: f(it.desiredElements, 'element'), state: f(it.desiredStates, 'state'), emotion: f(it.desiredEmotion, 'emotion'), scene: f(it.desiredScenes, 'scene'), theme: f(it.desiredThemes, 'theme'), role: f([it.visualRole], 'role') };
  }
  function sourceRow(c, s) {
    var cin = s.sceneType === 'cinema', tg = intentTags(s), m = s.media, pre = cin ? ['image', 'videoLoop', 'video', 'backgroundVideo'] : ((s.intent && s.intent.preferredMediaType) || []), by = {}; (ST.media || []).forEach(function (a) { by[a.id] = a; });
    var cands = (s.candidates || []).filter(function (x) { return x.score > 0; }), own = cands.filter(function (x) { var a = by[x.assetId]; return a && a.chapterIds && a.chapterIds.indexOf(c.id) >= 0; }).length;
    var chips = ['element', 'state', 'theme', 'emotion', 'scene', 'role', 'action'].map(function (k) { return (tg[k] || []).length ? '<span class="pill">' + INTENT_KO[k] + ' ' + esc(tg[k].join('·')) + '</span>' : ''; }).join('');
    var status = m ? '<span class="pill" style="color:#7FE0BC;border-color:#2e6e57">선택됨 · ' + esc(m.assetId) + '</span>' : '<span class="pill w">클립 필요</span>';
    var label = cin ? '영화 장면 · ' + esc(((((s.cinema || {}).segments || [])[0]) || {}).text || s.sceneId).slice(0, 18) + ' <small class="muted">' + esc(s.sceneId) + '</small>' : esc(SCENE_KO[s.sceneType] || s.sceneType);
    return '<div class="srow2" data-cid="' + esc(c.id) + '" data-sid="' + esc(s.sceneId) + '" data-st="' + esc(s.sceneType) + '">' + (m ? thumb(m) : '<span class="thm" style="display:grid;place-items:center;color:var(--ink3);font-size:.68rem">없음</span>') + '<div style="flex:1;min-width:0"><b>' + label + '</b> ' + status +
      '<div class="muted" style="font-size:.76rem;margin:2px 0">필요한 클립: ' + esc(pre.map(function (t) { return MTYPE_KO[t] || t; }).join(' › ')) + (cin ? ' · 태그 점수로 자동 선택(이 챕터 전용 우선)' : ' · 이 챕터에서 쓸 수 있는 후보 ' + cands.length + '개' + (own ? ' (이 챕터 전용 ' + own + '개)' : '')) + '</div><div style="display:flex;flex-wrap:wrap;gap:2px">' + chips + '</div>' +
      '<div class="row" style="margin-top:6px;gap:6px"><label class="navbtn" style="cursor:pointer;padding:3px 10px;font-size:.78rem">파일 올리기 → 보관함<input type="file" data-up accept="image/*,video/mp4,video/webm,video/quicktime" hidden></label><button type="button" class="navbtn" data-ai style="padding:3px 10px;font-size:.78rem">AI로 만들기</button><span class="muted" data-upmsg></span></div></div></div>';
  }
  /* ═════ 문장 · 이름 편집 (content.sceneCopy) ═════
     프롤로그·엔딩·챕터 오프닝·현실 장면의 문장 조각, 이름 조각(name), 이름 강조(nameEmphasis), 부제를 고친다. 원본은 {hero} 자리표시자 상태로 보여 주고, 이름은 사용자 기기에서만 채워진다. */
  function copyScenes(sel) {
    var sd = TST.sd, N = R.Narrator, T = R.Translator, list;
    if (sel === 'prologue') list = T.prologue(sd, 'x', N.heroVars(sd, 'x', true)); else if (sel === 'ending') list = T.ending(sd, 'x', N.heroVars(sd, 'x', true));
    else { var c = ((TST.mask && TST.mask.chapters) || []).filter(function (x) { return x.id === sel; })[0]; list = c ? c.scenes.filter(function (s) { return s.sceneType === 'cinema'; }) : []; }
    return list.filter(function (s) { return s.cinema && s.kind !== 'profile'; });
  }
  function copyPanel(sel) {
    var list = copyScenes(sel); if (!list.length) return ''; var saved = ST.saved.sceneCopy || {};
    return '<div class="cap2">문장 · 이름 편집</div><p class="muted" style="margin:0 0 4px;font-size:.78rem">한 줄이 한 호흡입니다. <code>{hero}</code>·<code>{hero은는}</code>·<code>{hero이가}</code>·<code>{hero을를}</code>·<code>{hero의}</code> 는 사용자 이름 자리(조사 자동). 이름 칸을 켜면 천천히 나타나 길게 머뭅니다 — 이름은 시작·공개·전환·엔딩에서만 쓰세요.</p>' + list.map(function (s) { return V2Cinema.copyCard(s, saved[s.sceneId]); }).join('');
  }
  function bindCopy(root) {
    root.addEventListener('click', function (e) {
      var card = e.target.closest('[data-cp]'); if (!card) return;
      if (e.target.closest('[data-sgdel]')) { e.target.closest('.sgrow').remove(); return; }
      if (e.target.closest('[data-sgadd]')) { V2Cinema.copyAdd(card, false); return; }
      if (e.target.closest('[data-sgaddname]')) { V2Cinema.copyAdd(card, true); return; }
      var id = card.dataset.cp, nx = clone(ST.saved.sceneCopy || {});
      if (e.target.closest('[data-cpsave]')) {
        var v = V2Cinema.copyRead(card); if (!v.segments.length) { toast('문장 조각이 비어 있습니다', true); return; } nx[id] = v;
      } else if (e.target.closest('[data-cpreset]')) { if (!nx[id]) { toast('수정한 내용이 없습니다'); return; } delete nx[id]; } else return;
      C.save({ sceneCopy: nx }).then(function () { ST.saved.sceneCopy = nx; toast('저장했습니다'); afterSourceChange(); }).catch(function (er) { toast(er.message, true); });
    });
  }
  function missingCount(rep) { var n = 0; rep.chapters.forEach(function (c) { c.scenes.forEach(function (s) { if (needsMedia(s) && !s.media) n++; }); }); return n; }
  function afterSourceChange() { var p = TST.pane; if (p) p.refresh(); run(); }
  // root 안의 .srow2 들에 업로드를 연결한다(조합 테스트 오른쪽 패널·전체 보기 창 공용)
  function aiMake(row) { // 이 칸의 태그로 이미지 한 장 → 보관함(이 챕터 전용). 반환 Promise<boolean>
    var c = TST.rep.chapters.filter(function (x) { return x.id === row.dataset.cid; })[0] || (TST.extra || {})[row.dataset.cid], s = c && c.scenes.filter(function (x) { return x.sceneId === row.dataset.sid; })[0], msg = row.querySelector('[data-upmsg]'); if (!s) return Promise.resolve(false);
    var tg = intentTags(s); msg.textContent = 'AI가 그리는 중… (20~60초)';
    return C.api('/api/panel-art', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot: { chapterId: (TST.extra || {})[c.id] ? '' : c.id, title: c.title + ' · ' + (SCENE_KO[s.sceneType] || s.sceneId), tags: tg } }) })
      .then(function (r) { ST.media = [r.media].concat(ST.media || []); msg.textContent = '✓ ' + r.provider; return true; }).catch(function (er) { msg.textContent = er.message; return false; });
  }
  function bindSources(root) {
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-ai]'); if (!b) return; var row = b.closest('.srow2'); b.disabled = true; aiMake(row).then(function (ok) { b.disabled = false; if (ok) { toast('AI 이미지를 보관함에 저장했습니다'); afterSourceChange(); } else toast('AI 이미지 생성에 실패했습니다', true); }); });
    root.addEventListener('change', function (e) {
      if (!e.target.matches('[data-up]')) return; var row = e.target.closest('.srow2'); if (!row) return;
      var c = TST.rep.chapters.filter(function (x) { return x.id === row.dataset.cid; })[0] || (TST.extra || {})[row.dataset.cid], s = c && c.scenes.filter(function (x) { return x.sceneId === row.dataset.sid; })[0], msg = row.querySelector('[data-upmsg]');
      var file = e.target.files[0]; if (!file || !s) return; var tg = intentTags(s), pre = s.sceneType === 'cinema' ? ['image', 'videoLoop'] : (s.intent.preferredMediaType || []), glob = !!(TST.extra || {})[c.id];
      msg.textContent = '올리는 중…';
      A.quickAdd(file, { type: pre.filter(function (t) { return /^video|transition|image|character|symbol|chapterCover/.test(t); })[0], title: c.title + ' · ' + (SCENE_KO[s.sceneType] || s.sceneId), elementTags: tg.element, stateTags: tg.state, emotionTags: tg.emotion, sceneTags: tg.scene, themeTags: tg.theme, actionTags: tg.action || [], chapterTags: tg.theme.slice(0, 1), visualRole: tg.role, chapterIds: glob ? [] : [c.id] }, PW, function (p) { msg.textContent = '올리는 중 ' + Math.round(p * 100) + '%'; })
        .then(function (a) { ST.media = [a].concat(ST.media || []); toast('클립 보관함에 저장했습니다 · 이 챕터에서 자동으로 골라 씁니다'); afterSourceChange(); })
        .catch(function (er) { msg.textContent = er.message; toast(er.message, true); });
    });
  }
  function allSourcesDialog() { // 프로젝트 전체에서 비어 있는 클립 자리 목록
    var rep = TST.rep, d = document.createElement('dialog'); d.className = 'v2dlg'; d.style.width = 'min(900px,96vw)';
    var h = '<h3>필요한 클립 소스 — ' + esc(rep.chapters.length ? (TS.project) : '') + ' 전체</h3><p class="muted">비어 있는 장면입니다. 파일을 올리면 <b>클립 보관함</b>에 저장되고, 그 챕터 안에서 자동으로 골라 씁니다. 일간 소개·일주 캐릭터 영상은 사주마다 달라서 <b>클립 라이브러리 → 일주 캐릭터 영상</b>에서 일괄 등록하세요.</p>';
    rep.chapters.forEach(function (c) { var rows = c.scenes.filter(function (s) { return needsMedia(s) && !s.media; }); if (rows.length) h += '<div class="cap2">' + String(c.no).padStart(2, '0') + ' ' + esc(c.title) + ' — ' + rows.length + '개</div>' + rows.map(function (s) { return sourceRow(c, s); }).join(''); });
    if (!missingCount(rep)) h += '<p style="color:#7FE0BC">모든 장면에 클립이 있습니다.</p>';
    d.innerHTML = h + '<div class="row" style="justify-content:flex-end;margin-top:12px;gap:8px"><span class="muted" id="aiAllMsg"></span>' + (missingCount(rep) ? '<button type="button" class="btn" id="aiAll">빈 칸 모두 AI로 만들기</button>' : '') + '<button type="button" id="dx">닫기</button></div>'; document.body.appendChild(d); d.showModal(); d.addEventListener('close', function () { d.remove(); });
    d.querySelector('#dx').onclick = function () { d.close(); }; bindSources(d);
    d.addEventListener('change', function () { setTimeout(function () { d.close(); }, 1500); });
    var all = d.querySelector('#aiAll'); if (all) all.onclick = function () { // 빈 칸을 차례로(한 장씩). 연속 3번 실패하면 멈춘다
      var rows = [].slice.call(d.querySelectorAll('.srow2')), msg = d.querySelector('#aiAllMsg'); if (!confirm('빈 칸 ' + rows.length + '개를 AI 이미지로 차례로 채웁니다. 이미지 비용이 장당 발생하고 시간이 오래 걸립니다. 계속할까요?')) return; all.disabled = true; var fails = 0, done = 0, stop = false; d.addEventListener('close', function () { stop = true; });
      (function next(i) { if (stop || i >= rows.length || fails >= 3) { msg.textContent = (fails >= 3 ? '연속 실패로 멈춤 · ' : '') + done + '장 완료'; all.disabled = false; if (done) afterSourceChange(); return; } msg.textContent = (i + 1) + ' / ' + rows.length + ' 만드는 중…'; aiMake(rows[i]).then(function (ok) { if (ok) { done++; fails = 0; } else fails++; next(i + 1); }); })(0); }; 
  }

  /* ═════ ③ 조합 테스트 ═════ */
  var PRESETS = [['1990-05-15', '14:30', 'M', '경진 · 신강'], ['1985-11-23', '07:10', 'F', '1985 여'], ['2000-02-29', '22:40', 'M', '2000 남'], ['1978-08-08', '03:00', 'F', '1978 여']];
  var TST = { sel: 'ilgan', rep: null, sd: null, pane: null, busy: 0 };
  function testOpen() {
    var root = $('#t-v2test');
    if (!built.test) {
      built.test = 1;
      root.innerHTML = '<div class="card tbar"><div class="tsum" id="tSum"></div><div class="row" style="align-items:center"><select id="tProj" aria-label="프로젝트"></select><button type="button" id="tEditBtn">테스트 사주 바꾸기</button><label class="chk2"><input type="checkbox" id="tDbg"' + (TS.dbg ? ' checked' : '') + '>선택 근거 보기</label><button type="button" class="pri" id="tGo">다시 조합</button></div>' +
        '<div class="tform hide" id="tForm"></div></div>' +
        '<div class="t3"><div class="card"><div class="muted" style="margin-bottom:6px">챕터 <span id="tIssues"></span></div><div class="trail" id="tRail"></div></div><div class="card"><div id="tPv"></div></div><div><div class="card" id="tTx"></div><div class="card tinsp" id="tInsp" style="margin-top:12px"><p class="muted">챕터를 고르면 선택 근거가 보입니다.</p></div></div></div>' +
        '<details class="card" id="tCovBox" style="margin-top:12px"><summary><b>콘텐츠 커버리지 점검</b> <span class="muted">조건 있는 모듈이 사주 구조를 얼마나 덮는지 · 눌러서 열기</span></summary><div id="tCov" style="margin-top:8px"></div></details>';
      var txp = {}; TST.pane = PreviewPane($('#tPv', root), { onChapter: function (id) { if (TST.sel !== id) { TST.sel = id; markRail(); inspect(); } }, onTx: function (m) { txp.p.onTx(m); }, onList: function (m) { txp.p.onList(m); }, onMove: function (m) { txp.p.onMove(m); } });
      txp.p = TxPanel($('#tTx', root), TST.pane, function () { return TST.sel === 'ilgan' || TST.sel === 'awakening' || TST.sel === 'prologue' || TST.sel === 'ending' ? '_' : TST.sel; });
      $('#tGo', root).onclick = function () { run(); }; $('#tDbg', root).onchange = function (e) { TS.dbg = e.target.checked; saveTS(); inspect(); };
      $('#tProj', root).onchange = function (e) { TS.project = e.target.value; saveTS(); run(); };
      $('#tEditBtn', root).onclick = function () { $('#tForm', root).classList.toggle('hide'); };
      $('#tCovBox', root).ontoggle = function () { if (this.open && !this.dataset.done) { this.dataset.done = 1; C.covOpen($('#tCov', root)); } };
      $('#tRail', root).onclick = function (e) { var b = e.target.closest('[data-c]'); if (!b) return; TST.sel = b.dataset.c; markRail(); inspect(); TST.pane.show(TST.sel, TS.project); };
      $('#tInsp', root).addEventListener('change', function (e) { // 일간 소개·일주 캐릭터 영상 바로 올리기
        var inp = e.target.closest('[data-awup]'); if (!inp || !TST.sd) return; var f = inp.files[0]; if (!f) return; var msg = $('[data-awmsg]', $('#tInsp', root)), sd = TST.sd, kind = inp.dataset.awup, key = kind === 'ilgan' ? { stem: sd.dayMaster.stem, gender: sd.gender } : { pillar: sd.dayPillar.ko, gender: sd.gender };
        if (msg) msg.textContent = '올리는 중…'; A.quickAwakening(kind, key, f, PW, function (p) { if (msg) msg.textContent = '올리는 중 ' + Math.round(p * 100) + '%'; }).then(function () { awkMemo = null; toast('영상을 연결했습니다'); run(); }).catch(function (er) { if (msg) msg.textContent = er.message; toast(er.message, true); });
      });
      bindSources($('#tInsp', root)); bindCopy($('#tInsp', root)); $('#tInsp', root).addEventListener('click', function (e) { if (e.target.closest('[data-allsrc]') && TST.rep) allSourcesDialog(); });
      $('#tInsp', root).onclick = function (e) { var b = e.target.closest('[data-edit]'); if (!b) return; CH.pending = b.dataset.edit; CH.pendingModule = b.dataset.mod || null; if (built.chap) { CH.sel = CH.pending; CH.tab = b.dataset.mod ? 'mod' : 'set'; CH.pending = null; } else CH.sel = null; gotoTab('v2chap'); if (built.chap) chapDraw(); };
    }
    C.load().then(function () { drawForm(); drawProj(); run(); });
  }
  function drawProj() { var projs = R.Chapters.projects(content()).filter(function (p) { return p.enabled !== false; }); $('#tProj').innerHTML = projs.map(function (p) { return '<option value="' + esc(p.id) + '"' + (TS.project === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join(''); if (!projs.some(function (p) { return p.id === TS.project; })) TS.project = projs[0].id; }
  function drawForm() {
    var f = $('#tForm'); f.innerHTML = '<div class="pvh"><label>양력 생년월일<input type="date" id="fD" value="' + TS.date + '"></label><label>시각<input type="time" id="fT" value="' + TS.time + '"></label><label>성별<select id="fG"><option value="M"' + (TS.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (TS.gender === 'F' ? ' selected' : '') + '>여</option></select></label><label>기준일(올해·이달 계산)<input type="date" id="fN" value="' + TS.now + '"></label><button type="button" class="pri" id="fOk">적용</button></div>' +
      '<div class="row" style="align-items:center"><span class="muted">자주 쓰는 사주</span>' + PRESETS.map(function (p, i) { return '<button type="button" data-pre="' + i + '">' + esc(p[3]) + '</button>'; }).join('') + '</div>';
    f.onclick = function (e) {
      var pre = e.target.closest('[data-pre]'); if (pre) { var p = PRESETS[+pre.dataset.pre]; $('#fD', f).value = p[0]; $('#fT', f).value = p[1]; $('#fG', f).value = p[2]; }
      if (pre || e.target.id === 'fOk') { TS.date = $('#fD', f).value || TS.date; TS.time = $('#fT', f).value || TS.time; TS.gender = $('#fG', f).value; TS.now = $('#fN', f).value || TS.now; saveTS(); f.classList.add('hide'); run(); }
    };
  }
  function markRail() { $$('#tRail [data-c]').forEach(function (b) { b.classList.toggle('on', b.dataset.c === TST.sel); }); }
  function run() {
    var rail = $('#tRail'); rail.innerHTML = '<p class="muted">계산 중…</p>'; var my = ++TST.busy;
    report(TS.project).then(function (r) {
      if (my !== TST.busy) return; TST.rep = r.rep; TST.sd = r.sd; TST.pack = r.pack; TST.extra = null; try { TST.mask = R.Compose.build(r.sd, r.pack.lib, r.pack.cfg, { maskHero: true }); } catch (er) { TST.mask = null; } var rep = r.rep, sd = r.sd;
      var sn = function (s) { return s ? SEA[s] : '-'; };
      $('#tSum').innerHTML = '<b>' + esc(TS.date) + ' ' + esc(TS.time) + ' ' + (TS.gender === 'M' ? '남' : '여') + '</b> → <b style="color:var(--gold)">' + esc(sd.dayPillar.ko) + '일주</b> · ' + esc(sd.strength.zone) + ' · 용신 ' + esc(sd.usefulElements ? sd.usefulElements.yong : '없음') + ' · 대운 ' + esc(sd.currentDaewoon ? sn(sd.currentDaewoon.season) : '-') + ' · 올해 ' + esc(sd.sewoon ? sn(sd.sewoon.season) : '-') + ' <span class="muted">(' + esc(r.pack.cfg.project.name) + ' · ' + rep.chapters.length + '챕터)</span>';
      var issues = 0, h = '<button type="button" data-c="prologue" class="ri' + (TST.sel === 'prologue' ? ' on' : '') + '"><span>🎞</span><b>프롤로그 (運路)</b></button><button type="button" data-c="ilgan" class="ri' + (TST.sel === 'ilgan' ? ' on' : '') + '"><span>🎬</span><b>일간 소개 영상</b></button><button type="button" data-c="awakening" class="ri' + (TST.sel === 'awakening' ? ' on' : '') + '"><span>🎬</span><b>일주 캐릭터 영상</b></button>', act = 0;
      rep.chapters.forEach(function (c) {
        if (c.act !== act) { act = c.act; var a = rep.acts.filter(function (x) { return x.id === act; })[0] || {}; h += '<div class="ract">' + esc(a.roman || '') + ' · ' + esc(a.title || '') + '</div>'; }
        var fb = c.modules[0] && /_fallback$/.test(c.modules[0]), nm = c.scenes.filter(function (s) { return !s.media && needsMedia(s); }).length; if (fb) issues++;
        h += '<button type="button" data-c="' + esc(c.id) + '" class="ri' + (c.id === TST.sel ? ' on' : '') + '"><span>' + String(c.no).padStart(2, '0') + '</span><b>' + esc(c.title) + '</b>' + (fb ? '<i class="pill w" title="조건 있는 모듈이 없어 기본 안내만 나옵니다">기본안내</i>' : '') + (nm ? '<i class="pill" title="미디어가 없어 자리표시 장면이 나오는 장면 수">미디어 ' + nm + '</i>' : '') + '</button>';
      });
      h += '<button type="button" data-c="ending" class="ri' + (TST.sel === 'ending' ? ' on' : '') + '"><span>🎞</span><b>엔딩</b></button>';
      rail.innerHTML = h; $('#tIssues').innerHTML = issues ? '<span class="pill w">기본 안내만 ' + issues + '개</span>' : '<span class="pill">모두 정상</span>';
      if (!rep.chapters.some(function (c) { return c.id === TST.sel; }) && TST.sel !== 'ilgan' && TST.sel !== 'awakening' && TST.sel !== 'prologue' && TST.sel !== 'ending') TST.sel = rep.chapters[0].id;
      inspect(); TST.pane.show(TST.sel, TS.project);
    }).catch(function (e) { rail.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  // 오른쪽 "선택 근거" 패널
  function inspect() {
    var box = $('#tInsp'), rep = TST.rep, sd = TST.sd; if (!rep) return;
    if (TST.sel === 'ilgan') {
      awakeningFor(sd).then(function (a) { box.innerHTML = '<b>일간 소개 영상</b><p class="muted">일주 캐릭터 영상 <u>앞</u>에 나옵니다.<br>' + (a.ilgan ? '<span style="color:#7FE0BC">' + esc(sd.dayMaster.stem) + ' · ' + (sd.gender === 'M' ? '남' : '여') + ' 영상이 연결되어 있습니다.</span>' : '<span style="color:#FF9C8C">' + esc(sd.dayMaster.stem) + ' · ' + (sd.gender === 'M' ? '남' : '여') + ' 영상이 아직 없어 이 단계는 건너뜁니다.</span>') + '</p><div class="row"><button type="button" id="goIlg">일간 소개 영상 등록하러 가기</button><label class="navbtn" style="cursor:pointer;margin-left:6px">이 일간·성별 영상 바로 올리기<input type="file" data-awup="ilgan" accept="video/mp4,video/webm,video/quicktime,image/*" hidden></label><span class="muted" data-awmsg></span></div>'; $('#goIlg', box).onclick = function () { gotoTab('v2clip'); var b = $('#clNav button[data-k=awk]'); if (b) b.click(); }; });
      return;
    }
    if (TST.sel === 'awakening') {
      awakeningFor(sd).then(function (a) { var pk = a.pick; box.innerHTML = '<b>일주 캐릭터 영상</b><p class="muted">' + (pk.fallback ? '<span style="color:#FF9C8C">' + esc(pk.key) + ' 영상이 아직 없습니다 → ' + (pk.clip ? 'fallback 영상으로 진행' : 'fallback 도 없어 문구·정지 화면으로 진행') + '</span>' : '<span style="color:#7FE0BC">' + esc(pk.key) + ' 영상이 연결되어 있습니다.</span> ' + esc(pk.clip.title || '')) + '</p><div class="row"><button type="button" id="goAwk">일주 캐릭터 영상 등록하러 가기</button><label class="navbtn" style="cursor:pointer;margin-left:6px">이 일주·성별 영상 바로 올리기<input type="file" data-awup="iju" accept="video/mp4,video/webm,video/quicktime,image/*" hidden></label><span class="muted" data-awmsg></span></div>'; $('#goAwk', box).onclick = function () { gotoTab('v2clip'); var b = $('#clNav button[data-k=awk]'); if (b) b.click(); }; });
      return;
    }
    if (TST.sel === 'prologue' || TST.sel === 'ending') {
      var N0 = R.Narrator, T0 = R.Translator, sel0 = TST.sel, sc0 = sel0 === 'prologue' ? T0.prologue(sd, '홍길동', N0.heroVars(sd, '홍길동')) : T0.ending(sd, '홍길동', N0.heroVars(sd, '홍길동')), used = [];
      sc0.forEach(function (x) { if (needsMedia(x)) x.media = R.Director.pickMedia(x, TST.pack.lib.media, { usedIds: used }, x.chapterId || 'c00'); });
      TST.extra = {}; TST.extra[sel0] = { id: sel0, title: sel0 === 'prologue' ? '프롤로그' : '엔딩', scenes: sc0 };
      var miss0 = sc0.filter(function (x) { return needsMedia(x) && !x.media; }).length;
      box.innerHTML = '<b>' + (sel0 === 'prologue' ? '프롤로그 · 運路' : '엔딩') + '</b><p class="muted">' + (sel0 === 'prologue' ? '갈대밭 → 산맥 → 산사 → 암전 → 해 → 이름 → 運路 타이틀 → 命. 이름이 없으면 이름 장면은 건너뜁니다.' : '해가 뜨는 산맥 → 이름 → 運路. 운명을 확정하지 않습니다.') + ' 문장은 사주 사실(factualBasis)을 번역해 만들어집니다.</p>' +
        '<div class="cap2">필요한 클립 소스</div><p class="muted" style="margin:0 0 4px">이 영상 <b style="color:' + (miss0 ? '#FFC080' : '#7FE0BC') + '">' + (miss0 ? miss0 + '개 비어 있음' : '모두 있음') + '</b> · 올린 클립은 보관함에 저장되어 어느 챕터에서나 후보가 됩니다.</p>' +
        sc0.filter(needsMedia).map(function (x) { return sourceRow(TST.extra[sel0], x); }).join('') + copyPanel(sel0) + '<p class="muted">탭하면 멈추고, 건너뛰기로 넘어갑니다.</p>';
      return;
    }
    var c = rep.chapters.filter(function (x) { return x.id === TST.sel; })[0]; if (!c) { box.innerHTML = ''; return; }
    var fb = c.modules[0] && /_fallback$/.test(c.modules[0]);
    var h = '<b>' + String(c.no).padStart(2, '0') + ' ' + esc(c.title) + '</b><p class="muted" style="margin:4px 0 8px">FACT · ' + esc(c.fact) + '</p>' + (fb ? '<p class="pill w" style="display:inline-block;margin:0 0 8px">조건 있는 모듈이 없어 기본 안내만 표시됩니다</p>' : '');
    h += '<div class="cap2">선택된 모듈</div>' + ((c.lead && c.lead.id) ? [c.lead].concat(c.details || []).map(function (m) { return '<div class="mrow"><div><b>' + esc(m.headline || m.id) + '</b><small>' + esc(m.id) + '</small>' + (TS.dbg && m.why && m.why.length ? '<div class="why">' + m.why.map(function (w) { return '<span class="' + (/✓/.test(w) ? 'hit' : 'miss') + '">' + esc(w) + '</span>'; }).join('') + '</div>' : (TS.dbg ? '<div class="why muted">조건 없음(항상 후보)</div>' : '')) + '</div><button type="button" data-edit="' + esc(c.id) + '" data-mod="' + esc(m.id) + '">수정</button></div>'; }).join('') : '<p class="muted">없음</p>');
    var miss1 = c.scenes.filter(function (x) { return needsMedia(x) && !x.media; }).length, missAll = missingCount(rep);
    h += '<div class="cap2">필요한 클립 소스</div><p class="muted" style="margin:0 0 4px">이 챕터 <b style="color:' + (miss1 ? '#FFC080' : '#7FE0BC') + '">' + (miss1 ? miss1 + '개 비어 있음' : '모두 있음') + '</b> · 프로젝트 전체 ' + missAll + '개 비어 있음 <button type="button" data-allsrc style="padding:2px 10px;font-size:.76rem">전체 보기</button></p>' + c.scenes.filter(needsMedia).map(function (s) { return sourceRow(c, s); }).join('') + '<p class="muted" style="font-size:.76rem;margin:6px 0 0">데이터 장면(월별·대운 표 등)은 클립 없이 화면 자체로 표시됩니다.</p>' + (TS.dbg ? '<div class="cap2">점수 근거</div>' + c.scenes.filter(function (x) { return x.media; }).map(function (x) { return '<div class="muted" style="font-size:.74rem">' + esc(x.sceneType) + ': ' + x.media.why.map(function (w) { return esc(w.label) + (w.v > 0 ? '+' : '') + w.v; }).join(' ') + '</div>'; }).join('') : '');
    h += copyPanel(c.id);
    h += '<div class="row" style="margin-top:10px"><button type="button" data-edit="' + esc(c.id) + '">이 챕터 편집 →</button></div>';
    box.innerHTML = h;
  }

  /* ═════ ④ 프로젝트(상품) ═════
     프로젝트는 자기 챕터만 가진다(챕터는 하나의 프로젝트에만 속함). 여기서는 ACT 구성·순서·문구와 상품 설정을 정한다. 챕터 내용 편집은 "챕터 관리"에서만. */
  var PJ = { list: null, sel: 'full', dirty: false };
  function projOpen() { C.load().then(function () { projList(); projDraw(); }); }
  function projStatus(p) {
    var chs = ownedBy(p.id).filter(function (c) { return c.enabled !== false; });
    return { n: chs.length, empty: chs.filter(function (c) { return c.kind !== 'remedy' && c.kind !== 'summary' && coverageOf(c) === 0; }) };
  }
  function projDraw() {
    var root = $('#t-v2proj'), L = projList(), p = L.filter(function (x) { return x.id === PJ.sel; })[0] || L[0]; PJ.sel = p.id;
    root.innerHTML = '<div class="cols"><div class="card"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><b style="color:var(--gold)">프로젝트</b><span style="flex:1"></span><button type="button" id="pjAdd">+ 새 프로젝트</button><button class="pri" type="button" id="pjSave"' + (PJ.dirty || CH.dirty ? '' : ' disabled') + '>저장</button></div>' +
      L.map(function (x) { var s = projStatus(x); return '<div class="pjc' + (x.id === p.id ? ' on' : '') + (x.enabled === false ? ' off' : '') + '" data-id="' + esc(x.id) + '"><b>' + esc(x.name) + '</b>' + (x.enabled === false ? ' <span class="pill">비공개</span>' : '') + '<small>' + esc(x.desc || '') + '</small><div class="stat"><span>챕터 <b>' + s.n + '</b></span><span>ACT <b>' + actCount(x.id) + '</b></span>' + (s.empty.length ? '<span class="pill w">비어 있을 수 있음 ' + s.empty.length + '</span>' : '<span class="pill">이상 없음</span>') + '</div></div>'; }).join('') + '<p class="muted" style="margin:8px 0 0;font-size:.76rem">챕터는 프로젝트마다 따로 가집니다(공유하지 않음).</p></div><div id="pjEd"></div></div>';
    $('.cols > .card', root).onclick = function (e) { var c = e.target.closest('.pjc'); if (c) { PJ.sel = c.dataset.id; projDraw(); } };
    $('#pjAdd', root).onclick = function () {
      var id = prompt('새 프로젝트 id (영문 소문자·숫자, 예: career)'); if (!id) return; id = id.trim().toLowerCase(); if (!/^[a-z0-9_-]{1,30}$/.test(id) || L.some(function (x) { return x.id === id; })) return toast('쓸 수 없거나 이미 있는 id 입니다', true);
      L.push({ id: id, name: '새 프로젝트', desc: '', enabled: true, accessLevel: 'free', requiredCompletionRate: null, chapters: null, needTags: [], acts: [{ title: '시작', line: '', pdfDone: '' }] }); PJ.sel = id; PJ.dirty = true; projDraw();
    };
    $('#pjSave', root).onclick = function () { this.disabled = true; saveStructure().then(function () { projDraw(); toast('저장했습니다'); }).catch(function (e) { toast(e.message, true); projDraw(); }); };
    projEditor(p);
  }
  function projEditor(p) {
    var box = $('#pjEd'), url = '/report/v2/?project=' + encodeURIComponent(p.id), st = projStatus(p); p.acts = p.acts && p.acts.length ? p.acts : [{ title: '시작', line: '', pdfDone: '' }];
    var mine = ownedBy(p.id), n = 0, optsAct = function (sel) { return p.acts.map(function (a, k) { return '<option value="' + (k + 1) + '"' + (sel === k + 1 ? ' selected' : '') + '>ACT ' + (k + 1) + '</option>'; }).join(''); };
    var others = R.Chapters.libraryOf(content()).filter(function (c) { return c.project !== p.id; }), grp = {}; others.forEach(function (c) { (grp[c.project] = grp[c.project] || []).push(c); });
    var h = '<div class="card"><div class="stat"><span>챕터 <b>' + st.n + '</b></span><span>ACT <b>' + p.acts.length + '</b></span><span>주소 <b>' + esc(url) + '</b></span>' + (st.empty.length ? '<span class="pill w">비어 있을 수 있음: ' + esc(st.empty.map(function (c) { return c.title; }).join(', ')) + '</span>' : '') + '</div>' +
      '<div class="row"><button type="button" id="pjTest">조합 테스트로 보기</button><button type="button" id="pjOpen">뷰어 열기 ↗</button><button type="button" id="pjCopy">주소 복사</button></div>' +
      '<div class="g2c"><div class="fld"><label>이름</label><input type="text" data-p="name" value="' + esc(p.name) + '"></div><div class="fld"><label>접근 (accessLevel)</label><select data-p="accessLevel"><option value="free"' + (p.accessLevel !== 'premium' ? ' selected' : '') + '>free</option><option value="premium"' + (p.accessLevel === 'premium' ? ' selected' : '') + '>premium</option></select></div></div>' +
      '<div class="fld"><label>설명</label><input type="text" data-p="desc" value="' + esc(p.desc || '') + '"></div><div class="fld"><label>개운법 우선 방향 태그 (쉼표) — 이 상품에서 먼저 추천할 행동 성향. 예: connection, listening, organize, reinvest, protect, learning, output</label><input type="text" data-p="needTags" value="' + esc((p.needTags || []).join(', ')) + '"></div><p class="muted" style="margin:0 0 8px;font-size:.76rem">이 상품 전용 개운법·해석 문구는 "챕터 관리 → 개운법/해석 모듈"에서 선택 조건 <b>프로젝트</b>를 이 상품으로 지정해 만듭니다. 조건이 없는 항목은 모든 상품이 같이 씁니다.</p><div class="g2c"><div class="fld"><label>PDF 해금 완독률 (0~1 · 비우면 마지막 챕터 도달)</label><input type="number" min="0" max="1" step="0.05" data-p="requiredCompletionRate" value="' + (p.requiredCompletionRate == null ? '' : p.requiredCompletionRate) + '"></div><label style="display:flex;gap:8px;align-items:center;margin-top:18px"><input type="checkbox" data-p="enabled"' + (p.enabled !== false ? ' checked' : '') + '>공개</label></div></div>' +
      '<div class="acts" style="margin-top:12px">' + p.acts.map(function (a, k) {
        var rows = mine.filter(function (c) { return (c.act || 1) === k + 1; });
        return '<div class="card actc" data-act="' + k + '"><div class="acth"><b>ACT ' + (k + 1) + '</b><input type="text" data-a="title" value="' + esc(a.title) + '" placeholder="ACT 제목"><button type="button" data-adel title="이 ACT 삭제"' + (p.acts.length <= 1 || rows.length ? ' disabled' : '') + '>삭제</button></div>' +
          '<details><summary class="muted">전환 화면 문구 · PDF 안내</summary><div class="fld"><label>전환 문구 (줄바꿈 가능)</label><textarea data-a="line" style="min-height:42px">' + esc(a.line) + '</textarea></div><div class="fld"><label>완료 시 PDF 진행 안내</label><input type="text" data-a="pdfDone" value="' + esc(a.pdfDone) + '"></div></details>' +
          (rows.length ? rows.map(function (c, ri) { n++; return '<div class="brow' + (c.enabled === false ? ' off' : '') + '" data-c="' + esc(c.id) + '"><span class="bn">' + String(n).padStart(2, '0') + '</span><span class="bt">' + esc(c.title) + (c.enabled === false ? ' <i class="pill">숨김</i>' : '') + '</span><select data-move aria-label="ACT 이동">' + optsAct(c.act || 1) + '</select><span><button type="button" data-mv="-1" aria-label="위로"' + (ri === 0 ? ' disabled' : '') + '>▲</button><button type="button" data-mv="1" aria-label="아래로"' + (ri === rows.length - 1 ? ' disabled' : '') + '>▼</button><button type="button" data-edit="' + esc(c.id) + '">편집</button><button type="button" data-hide>' + (c.enabled === false ? '켜기' : isDefaultId(c.id) ? '숨김' : '삭제') + '</button></span></div>'; }).join('') : '<p class="muted" style="margin:8px 0">비어 있는 ACT는 리포트에서 건너뜁니다.</p>') + '</div>'; }).join('') +
      '<div class="card"><div class="row"><button type="button" id="aAdd">+ ACT 추가</button><button type="button" id="cNew">+ 새 챕터</button></div><div class="row" style="margin-top:8px;align-items:end"><label style="flex:1;min-width:200px;display:grid;gap:3px;font-size:.8rem;color:var(--ink2)">다른 프로젝트의 챕터를 <b>복제</b>해서 가져오기 (원본은 그대로, 이 프로젝트만의 독립된 챕터가 됩니다)<select id="cDupSel"><option value="">챕터 선택…</option>' + Object.keys(grp).map(function (pid) { var pj = projectById(pid); return '<optgroup label="' + esc(pj ? pj.name : pid) + '">' + grp[pid].map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.title) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select></label><select id="cDupAct" style="width:auto">' + optsAct(p.acts.length) + '</select><button type="button" id="cDup">복제해서 추가</button></div></div></div>' +
      (['full', 'love', 'wealth', 'newyear'].indexOf(p.id) < 0 ? '<div class="row" style="margin-top:12px"><button type="button" class="danger" id="pjDel">프로젝트 삭제 (이 프로젝트의 챕터도 함께)</button></div>' : '');
    box.innerHTML = h;
    var dirty = function () { PJ.dirty = true; var b = $('#pjSave'); if (b) b.disabled = false; };
    box.oninput = box.onchange = function (e) {
      var t = e.target, k = t.dataset && t.dataset.p, ar = t.closest('[data-act]');
      if (k) { p[k] = t.type === 'checkbox' ? t.checked : k === 'requiredCompletionRate' ? (t.value === '' ? null : +t.value) : k === 'needTags' ? C.csv(t.value) : t.value; dirty(); return; }
      if (ar && t.dataset.a) { p.acts[+ar.dataset.act][t.dataset.a] = t.value; dirty(); return; }
      var row = t.closest('[data-c]'); if (row && t.matches('[data-move]')) { var c = chapterById(row.dataset.c); c.act = +t.value; c.order = 9999; renumber(p.id); dirty(); projDraw(); }
    };
    box.onclick = function (e) {
      var ed = e.target.closest('[data-edit]'); if (ed) { CH.pending = ed.dataset.edit; if (built.chap) { CH.sel = CH.pending; CH.tab = 'set'; CH.pending = null; } else CH.sel = null; gotoTab('v2chap'); if (built.chap) chapDraw(); return; }
      var mv = e.target.closest('[data-mv]'); if (mv) { var c = chapterById(mv.closest('[data-c]').dataset.c), same = ownedBy(p.id).filter(function (x) { return (x.act || 1) === (c.act || 1); }), i = same.indexOf(c), j = i + +mv.dataset.mv; if (j >= 0 && j < same.length) { var t = same[j].order; same[j].order = c.order; c.order = t; renumber(p.id); dirty(); projDraw(); } return; }
      var hd = e.target.closest('[data-hide]'); if (hd) { var c2 = chapterById(hd.closest('[data-c]').dataset.c); if (c2.enabled === false) c2.enabled = true; else if (isDefaultId(c2.id)) c2.enabled = false; else if (confirm('이 챕터를 삭제할까요?')) W.chapters = chaptersAll().filter(function (x) { return x !== c2; }); else return; renumber(p.id); dirty(); projDraw(); return; }
      if (e.target.id === 'aAdd') { p.acts.push({ title: '새 ACT', line: '', pdfDone: '' }); dirty(); projDraw(); return; }
      if (e.target.id === 'cNew') { var nc = addChapterTo(p.id); dirty(); CH.sel = nc.id; CH.tab = 'set'; projDraw(); return; }
      if (e.target.id === 'cDup') { var sid = $('#cDupSel', box).value; if (!sid) return toast('복제할 챕터를 고르세요', true); var src = chapterById(sid), nc2 = addChapterTo(p.id, src); nc2.act = +$('#cDupAct', box).value; nc2.order = 9999; renumber(p.id); dirty(); toast('복제했습니다: ' + nc2.title); projDraw(); return; }
      var ad = e.target.closest('[data-adel]'); if (ad) { var k = +ad.closest('[data-act]').dataset.act + 1; if (ownedBy(p.id).some(function (x) { return (x.act || 1) === k; })) return; ownedBy(p.id).forEach(function (x) { if ((x.act || 1) > k) x.act--; }); p.acts.splice(k - 1, 1); dirty(); projDraw(); return; }
      if (e.target.id === 'pjDel' && confirm('프로젝트와 그 챕터를 모두 삭제할까요?')) { W.chapters = chaptersAll().filter(function (x) { return x.project !== p.id; }); PJ.list = PJ.list.filter(function (x) { return x !== p; }); PJ.sel = 'full'; PJ.dirty = true; CH.dirty = true; projDraw(); }
    };
    $('#pjTest', box).onclick = function () { TS.project = p.id; saveTS(); gotoTab('v2test'); setTimeout(function () { var s = $('#tProj'); if (s) { s.value = p.id; s.dispatchEvent(new Event('change')); } }, 80); };
    $('#pjOpen', box).onclick = function () { window.open(url, '_blank'); };
    $('#pjCopy', box).onclick = function () { var full = location.origin + url; (navigator.clipboard ? navigator.clipboard.writeText(full) : Promise.reject()).then(function () { toast('주소를 복사했습니다'); }).catch(function () { prompt('주소', full); }); };
  }

  /* ═════ ⑤ 설정 ═════ */
  function setOpen(also) {
    var root = $('#t-v2set'); if (root.parentNode && $('#t-lib') && root.nextSibling !== $('#t-lib') && !built.setMoved) { built.setMoved = 1; $('#t-lib').parentNode.insertBefore(root, $('#t-lib')); }
    if (!built.set) {
      built.set = 1; root.innerHTML = '<div class="sub2" id="stNav"></div><div id="stScore" class="hide"></div><div id="stMove" class="hide"></div><div id="stCine" class="hide"></div>';
      subnav($('#stNav', root), [['intro', '입장 인트로'], ['home', '온보딩 페이지'], ['move', '무빙 연출'], ['cine', '시네마 기본 연출'], ['score', '미디어 점수·AI'], ['lib', '기존 클립 (구버전)']], also || 'intro', function (k) { gotoTab('v2set', k); });
    }
    $('#stScore', root).classList.toggle('hide', also !== 'score'); if (also === 'score') scoreOpen();
    $('#stMove', root).classList.toggle('hide', also !== 'move'); if (also === 'move') moveOpen();
    $('#stCine', root).classList.toggle('hide', also !== 'cine'); if (also === 'cine') cineOpen();
    if (!also) { $$('#stNav button', root).forEach(function (b) { b.classList.toggle('on', b.dataset.k === 'intro'); }); setTimeout(function () { window.AdminShowTab('v2set', 'intro'); }, 0); }
  }
  // 무빙 연출: 장면 안 요소가 차례로 나타나는 효과 + 자동 스크롤(누르면 멈춤). 저장하면 /api/report-content 의 flow 로 올라가고 viewer 가 같은 값을 쓴다.
  function moveOpen() {
    var box = $('#stMove'), M = R.Moving; C.load().then(function () {
      var f = M.clean(ST.saved.flow); f.bgMotion = String(f.bgMotion); var esc2 = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
      var num = function (k, label, min, max, step, hint) { return '<label style="display:block;margin:8px 0">' + label + ' <input type="number" data-f="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + f[k] + '" style="width:90px"> <span class="muted" style="font-size:.76rem">' + hint + '</span></label>'; };
      var chk = function (k, label) { return '<label style="display:block;margin:8px 0"><input type="checkbox" data-f="' + k + '"' + (f[k] ? ' checked' : '') + ' style="width:auto"> ' + label + '</label>'; };
      var sel = function (k, label, list) { return '<label style="display:block;margin:8px 0">' + label + ' <select data-f="' + k + '">' + list.map(function (x) { return '<option value="' + x[0] + '"' + (f[k] === x[0] ? ' selected' : '') + '>' + esc2(x[1]) + '</option>'; }).join('') + '</select></label>'; };
      box.innerHTML = '<div class="card"><b style="color:var(--gold)">읽기 모드 · 자동 스크롤</b> <span class="muted">글자는 움직이지 않고, 읽는 속도에 맞춰 화면이 한 덩어리씩 넘어갑니다(이동 → 머묾 → 이동). 화면을 직접 건드리면 바로 멈춥니다.</span>' +
        chk('auto', '리포트를 열면 자동으로 읽어 주기') + num('startDelay', '시작까지', 0, 10, 0.5, '초') + num('readSpeed', '읽는 속도(섹션 길이)', 3, 12, 0.5, '초당 글자 수 (기본 6.5 · 천천히 5 · 빠르게 8) — 글이 길수록 한 화면에 오래 머뭅니다') + chk('stopAtChoice', '질문·선택이 있는 곳에서 멈추기') +
        sel('bgMotion', '배경 움직임', [['0', '없음'], ['1', '아주 느리게 (기본)'], ['2', '느리게']]) +
        '</div><div class="card" style="margin-top:12px"><b style="color:var(--gold)">재생 속도</b> <span class="muted">INTRO 진행·본문 머묾·자동 스크롤 이동에 모두 곱해집니다. 3x 는 긴 리포트를 빠르게 검수할 때 쓰세요(글자 애니메이션은 최소 길이를 지켜 3x 에서도 보입니다).</span>' +
        '<input type="hidden" data-f="playbackRate" value="' + f.playbackRate + '"><div class="row" id="mvRates" style="margin:10px 0;gap:6px;flex-wrap:wrap">' + M.RATES.map(function (r) { return '<button type="button" data-rate="' + r + '" class="' + (+f.playbackRate === r ? 'on' : '') + '" style="min-width:56px' + (+f.playbackRate === r ? ';border-color:var(--gold);color:var(--gold)' : '') + '">' + r + 'x</button>'; }).join('') + '</div><div class="muted">현재: <b id="mvRateNow" style="color:var(--gold)">' + f.playbackRate + 'x</b> · 확인용 주소 끝에 <code>?rate=5</code> 을 붙여도 됩니다</div>' +
        '</div><div class="row" style="margin-top:12px"><button class="pri" id="mvSave" type="button">저장</button> <button type="button" id="mvDef">기본값으로</button> <button type="button" id="mvTest">조합 테스트에서 확인</button></div><p class="muted" style="margin-top:10px">손님 화면 하단의 컨트롤러에서 자동 스크롤·TTS·BGM을 켜고 끌 수 있습니다. "동작 줄이기"를 켠 기기에서는 배경 움직임이 꺼지고 화면 이동이 즉시 이루어집니다. 예전 "차례로 나타나기" 효과 설정은 쓰지 않으며 저장된 값은 그대로 보존됩니다.</p>';
      var read = function () { var o = {}; $$('[data-f]', box).forEach(function (i) { o[i.dataset.f] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; }); return M.clean(Object.assign({}, ST.saved.flow, o)); }; // 예전 연출 값은 지우지 않고 그대로 둔다
      $('#mvRates', box).onclick = function (e) { var b = e.target.closest('[data-rate]'); if (!b) return; $('[data-f="playbackRate"]', box).value = b.dataset.rate; $$('#mvRates button', box).forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.style.borderColor = on ? 'var(--gold)' : ''; x.style.color = on ? 'var(--gold)' : ''; }); $('#mvRateNow', box).textContent = b.dataset.rate + 'x'; };
      $('#mvSave', box).onclick = function () { var v = read(); C.save({ flow: v }).then(function () { ST.saved.flow = v; toast('저장했습니다'); moveOpen(); }).catch(function (e) { toast(e.message, true); }); };
      $('#mvDef', box).onclick = function () { ST.saved.flow = M.clean({}); moveOpen(); toast('기본값을 불러왔습니다. 저장을 눌러야 적용됩니다'); };
      $('#mvTest', box).onclick = function () { gotoTab('v2test'); };
    });
  }
  // 시네마 기본 연출: 장면 종류(16)마다 기본 연출을 정한다. 비워 둔 칸은 프리셋·내장 기본값을 따른다. 저장하면 /api/report-content 의 cinemaDefaults.
  var CINE_SEL = 'EXPLANATION';
  // 인트로 연출: 무협 패러디(기본) · 시네마틱 · 최소. 본편(해석·AI 문장)에는 영향을 주지 않는다.
  function introEpicCard(box) {
    var K = R.EpicIntro; if (!K) return; var cur = Object.assign({}, K.DEFAULTS, ST.saved.introEpic || {}), sel = function (id, list, v) { return '<select id="' + id + '">' + list.map(function (x) { return '<option value="' + x[0] + '"' + (String(v) === String(x[0]) ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>'; };
    var d = document.createElement('div'); d.className = 'card'; d.style.marginTop = '12px';
    d.innerHTML = '<b style="color:var(--gold)">인트로 연출</b> <span class="muted">사주를 입력한 직후 나오는 인트로입니다. <b>무협 출정</b>은 정통 무협 영화의 오프닝처럼, 命 → 運 → 길 → 四柱八字(지도) → 運路 → "이제, 출발한다"로 이어지는 약 1~2분 여정입니다(전투 없음 · 음성·효과음 없음 · 글자 애니메이션은 이 인트로에서만, 네 가지로 고정). 옛 <b>무협 패러디</b>는 한 사람이 태어난 일을 천하의 대사건처럼, 끝까지 진지하게 읽습니다(간지·출생일시·이름은 실제 만세력 값 그대로). 운로 타이틀이 끝나면 패러디도 끝나고 본편은 평소 문체로 진행됩니다.</span>' +
      '<div class="row" style="margin:10px 0;gap:12px;flex-wrap:wrap"><label>스타일 ' + sel('ieStyle', [['EPIC_WUXIA_JOURNEY_SHORT', '무협 출정 20초판 (기본)'], ['EPIC_WUXIA_JOURNEY', '무협 출정 — 모험·길 (긴 버전, 약 1.5분)'], ['EPIC_WUXIA_PARODY', '무협 패러디 (예전)'], ['CINEMATIC', '시네마틱 (기존)'], ['MINIMAL', '최소 (이름·타이틀만)']], cur.style) + '</label>' +
      '<label>유머 ' + sel('ieHumor', [['PARODY', 'PARODY — 펀치라인 1~2개'], ['SUBTLE', 'SUBTLE — 거창한 문장만'], ['OFF', 'OFF — 진지하게만']], cur.humor) + '</label>' +
      '<label>에픽 레벨 ' + sel('ieLevel', [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5 (최대)']], cur.epicLevel) + '</label></div>' +
      '<div class="muted">유머·에픽 레벨은 옛 무협 패러디에만 쓰입니다. 음성 해설과 효과음은 없고 배경음악만 흐릅니다.</div>' +
      '<div class="row" style="margin-top:10px"><button class="pri" id="ieSave" type="button">인트로 설정 저장</button></div>';
    box.appendChild(d);
    d.querySelector('#ieSave').onclick = function () { var v = { style: d.querySelector('#ieStyle').value, humor: d.querySelector('#ieHumor').value, epicLevel: +d.querySelector('#ieLevel').value }; C.save({ introEpic: v }).then(function () { ST.saved.introEpic = v; toast('인트로 설정을 저장했습니다'); }).catch(function (e) { toast(e.message, true); }); };
  }
  function cineOpen() {
    var box = $('#stCine'), K = R.Cinema; C.load().then(function () {
      var defs = ST.saved.cinemaDefaults || {}, KO = V2Cinema.KO;
      var opts = K.SCENE_TYPES.map(function (t) { return '<option value="' + t + '"' + (CINE_SEL === t ? ' selected' : '') + '>' + t + ' · ' + KO.sceneType[t] + (defs[t] ? ' ●' : '') + '</option>'; }).join('');
      box.innerHTML = '<div class="card"><b style="color:var(--gold)">시네마 기본 연출</b> <span class="muted">MY LIFE AS A MOVIE — 장면 종류별로 연출의 기본값을 정합니다. 개별 클립의 연출이 있으면 그 값이 먼저 쓰입니다. (● = 저장된 값이 있는 종류)</span>' +
        '<div class="row" style="margin:10px 0"><label>장면 종류 <select id="cnType">' + opts + '</select></label><button type="button" id="cnClear">이 종류 기본값 지우기</button></div><div id="cnForm">' + V2Cinema.fields(defs[CINE_SEL]) + '</div>' +
        '<div class="row" style="margin-top:12px"><button class="pri" id="cnSave" type="button">저장</button><button type="button" id="cnTest">조합 테스트에서 확인</button></div></div>' +
        '<div class="card" style="margin-top:12px"><b style="color:var(--gold)">배경 음악 (BGM)</b> <span class="muted"><b>기본</b> 칸은 분위기별 음원을 안 정한 장면에서 계속 흐르는 배경음악이에요(분위기별 칸을 비워 두면 이 곡이 나옵니다). 그다음 분위기별로 음원 한 곡씩. 시네마틱·미니멀·앰비언트·감성·긴장·희망·성찰 중심으로 고르고, 동양 판타지·무협·신선 세계 같은 분위기가 중심이 되지 않게 합니다(동양적 질감은 아주 약하게만). 기본 칸까지 비워 두면 소리가 나지 않습니다.</span>' + R.Bgm.KEYS.map(function (m) { return '<div class="v2f"><label>' + (m === 'default' ? '<b style="color:var(--gold)">default · 기본 (설정 안 한 곳에서 흐름)</b>' : m + ' · ' + esc(V2Cinema.KO.bgmMood[m])) + '</label><div class="row" style="flex-wrap:nowrap"><input type="text" data-bgm="' + m + '" value="' + esc((ST.saved.bgm || {})[m] || '') + '" placeholder="/api/clipfile?k=… 또는 https://…"><label class="navbtn" style="cursor:pointer;white-space:nowrap">올리기<input type="file" accept="audio/*" data-bgmup="' + m + '" hidden></label></div></div>'; }).join('') + '<div class="row" style="margin-top:10px"><button class="pri" id="bgmSave" type="button">BGM 저장</button><span class="muted" id="bgmMsg"></span></div></div>';
      $('#cnType', box).onchange = function (e) { CINE_SEL = e.target.value; cineOpen(); };
      $('#cnSave', box).onclick = function () { var v = V2Cinema.read($('#cnForm', box)), nx = Object.assign({}, defs); if (Object.keys(v).length) nx[CINE_SEL] = v; else delete nx[CINE_SEL]; C.save({ cinemaDefaults: nx }).then(function () { ST.saved.cinemaDefaults = nx; toast('저장했습니다'); cineOpen(); }).catch(function (e) { toast(e.message, true); }); };
      $('#cnClear', box).onclick = function () { var nx = Object.assign({}, defs); delete nx[CINE_SEL]; C.save({ cinemaDefaults: nx }).then(function () { ST.saved.cinemaDefaults = nx; toast('지웠습니다'); cineOpen(); }).catch(function (e) { toast(e.message, true); }); };
      $('#cnTest', box).onclick = function () { gotoTab('v2test'); };
      introEpicCard(box);
      $$('[data-bgmup]', box).forEach(function (i) { i.onchange = function () { var file = i.files[0]; if (!file) return; $('#bgmMsg', box).textContent = '올리는 중…'; V2Admin.upload(file, file.name, PW).then(function (u) { box.querySelector('[data-bgm="' + i.dataset.bgmup + '"]').value = u; $('#bgmMsg', box).textContent = '올렸습니다. BGM 저장을 눌러 적용하세요'; }).catch(function (e) { $('#bgmMsg', box).textContent = e.message; }); }; });
      $('#bgmSave', box).onclick = function () { var o = {}; $$('[data-bgm]', box).forEach(function (i) { if (i.value.trim()) o[i.dataset.bgm] = i.value.trim(); }); C.save({ bgm: o }).then(function () { ST.saved.bgm = o; toast('BGM을 저장했습니다'); }).catch(function (e) { toast(e.message, true); }); };
    });
  }
  function scoreOpen() {
    var box = $('#stScore'); C.load().then(function () {
      var sc = ST.saved.scoring || {}, Wt = Object.assign({}, R.Scenes.CONFIG.w, sc.w || {});
      box.innerHTML = '<div class="card"><b style="color:var(--gold)">미디어 매칭 점수</b> <span class="muted">Scene Intent 와 미디어 태그가 일치할 때 더해지는 점수입니다. 값이 클수록 그 기준을 중요하게 봅니다.</span><div class="row" style="margin-top:10px">' + Object.keys(Wt).map(function (k) { return '<label>' + k + '<input type="number" data-w="' + k + '" value="' + Wt[k] + '" style="width:80px"></label>'; }).join('') + '</div><div class="row" style="margin-top:12px"><button class="pri" id="scSave" type="button">저장</button></div><p class="muted" style="margin-top:12px">AI 컴포저는 서버에 ANTHROPIC_API_KEY(없으면 OPENAI_API_KEY)가 있어야 동작합니다. 없거나 실패해도 리포트는 사람이 쓴 모듈 문장으로 정상 출력됩니다. AI를 쓰지 않을 챕터는 "챕터 관리 → 기본 설정"에서 끌 수 있습니다.</p></div>';
      $('#scSave', box).onclick = function () { var w = {}; $$('input[data-w]', box).forEach(function (i) { w[i.dataset.w] = +i.value; }); C.save({ scoring: { w: w } }).then(function () { ST.saved.scoring = { w: w }; R.Scenes.configure({ w: w }); }).catch(function (e) { toast(e.message, true); }); };
    });
  }

(window.AdminDirty = window.AdminDirty || {})['챕터·프로젝트'] = function () { return CH.dirty || PJ.dirty; }; (window.AdminDirty = window.AdminDirty || {})['글자 설정'] = function () { return TX.dirty; }; window.V2Shell = { open: function (tab, pw, also) {
    PW = pw; C.setPw(pw);
    if (tab === 'v2clip') clipOpen(); else if (tab === 'v2chap') chapOpen(); else if (tab === 'v2test') testOpen(); else if (tab === 'v2proj') projOpen(); else if (tab === 'v2set') setOpen(also); else if (tab === 'v2story') window.V2Story && window.V2Story.open(); else if (tab === 'v2world') window.V2World && window.V2World.open(); else if (tab === 'v2intro') V2Intro.mount(document.getElementById('t-v2intro'), pw, {});
  } };
})();
