/* 관리자 셸 — 위쪽 5개 화면으로 단순화:
   ① 클립 라이브러리(장면 미디어 · 각성 영상 120 · 커버리지, AI가 고르는 모든 클립이 한 곳)
   ② 챕터 관리(챕터 설정 · 해석 모듈 · 개운법 · 미리보기를 한 화면에서)
   ③ 조합 테스트(테스트 사주로 프로젝트 전체를 돌려 보고, 문제 챕터로 바로 이동)
   ④ 프로젝트(종합·애정운·재물운·신년운세 … 챕터를 묶어 상품으로 만들기, 현황)
   ⑤ 설정(입장 인트로 · 온보딩 페이지 · 미디어 점수 · 기존 클립(구)).
   저장은 /api/report-content (챕터·모듈·개운법·프로젝트·점수), /api/media, /api/awakening. */
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
        if (k === 'media') A.open('media', PW, $('#cl-media')); else if (k === 'awk') A.open('awk', PW, $('#cl-awk')); else A.coverage($('#cl-cov'), PW);
      };
      subnav($('#clNav', root), [['media', '장면 미디어'], ['awk', '각성 영상 (일주×성별 120)'], ['cov', '커버리지·선택 테스트']], 'media', go);
      var imp = document.createElement('button'); imp.type = 'button'; imp.textContent = '기존 클립 가져오기'; imp.title = '구버전 "클립 라이브러리"의 클립을 새 라이브러리로 복사합니다(원본은 그대로)'; imp.style.marginLeft = 'auto';
      imp.onclick = function () {
        if (!confirm('기존(구버전) 클립을 새 라이브러리로 복사할까요?\n· 일간+성별만 정해진 클립 → 일간 소개 영상\n· 일주+성별이 정해진 클립 → 일주 각성 영상\n· 그 외 → 장면 미디어(영상)\n원본 클립은 그대로 남고, 가져온 뒤 각 탭에서 "변경사항 저장"을 눌러야 반영됩니다.')) return;
        imp.disabled = true; A.importLegacy(PW, function (r) { imp.disabled = false; if (r) { toast('가져왔습니다 — 일간 소개 ' + r.ilgan + '개 · 일주 각성 ' + r.awakening + '개 · 장면 미디어 ' + r.media + '개 (건너뜀 ' + r.skipped + '). 각 탭에서 저장하세요.'); var on = $('#clNav .on', root); if (on) on.click(); } });
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
  function chapDraw() {
    var root = $('#t-v2chap'), projs = projList();
    var row = function (c, i) { var n = coverageOf(c);
      return '<div class="chi' + (c.id === CH.sel ? ' on' : '') + (c.enabled === false ? ' off' : '') + '" data-id="' + esc(c.id) + '"><input type="checkbox" data-en aria-label="사용"' + (c.enabled !== false ? ' checked' : '') + '><div><b>' + String(i + 1).padStart(2, '0') + ' ' + esc(c.title) + '</b><small>ACT ' + (c.act || 1) + ' · ' + esc(c.kind) + ' · 모듈 ' + n + (n === 0 && c.kind !== 'remedy' && c.kind !== 'summary' ? ' <span class="pill w">비어 있음</span>' : '') + '</small></div><span><button type="button" data-mv="-1" aria-label="위로">▲</button><button type="button" data-mv="1" aria-label="아래로">▼</button></span></div>'; };
    var known = {}; projs.forEach(function (p) { known[p.id] = 1; });
    var groups = projs.map(function (p) {
      var list = ownedBy(p.id), open = !CH.collapsed[p.id];
      return '<div class="pgrp"><div class="pgh" data-pg="' + esc(p.id) + '"><b>' + (open ? '▾' : '▸') + ' ' + esc(p.name) + '</b><span class="muted">' + list.length + '개' + (p.enabled === false ? ' · 비공개' : '') + '</span><span style="flex:1"></span><button type="button" data-addch="' + esc(p.id) + '" title="이 프로젝트에 새 챕터 추가">+ 챕터</button></div>' + (open ? list.map(row).join('') : '') + '</div>';
    }).join('');
    var orphan = chaptersAll().filter(function (c) { return !known[c.project]; });
    if (orphan.length) groups += '<div class="pgrp"><div class="pgh"><b>(프로젝트 없음)</b></div>' + orphan.map(row).join('') + '</div>';
    root.innerHTML = '<div class="cols"><div class="card"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px"><b style="color:var(--gold)">챕터 총괄</b><span style="flex:1"></span><button class="pri" type="button" id="chSave"' + (CH.dirty || PJ.dirty ? '' : ' disabled') + '>저장</button></div>' +
      '<p class="muted" style="margin:0 0 8px;font-size:.76rem">챕터는 하나의 프로젝트에만 속합니다. 같은 내용을 다른 상품에서도 쓰려면 챕터를 "복제"하세요. 영상·해석 모듈·개운법은 같이 씁니다.</p><div class="chl">' + groups + '</div></div><div id="chEd"></div></div>';
    $('.chl', root).onclick = function (e) {
      var add = e.target.closest('[data-addch]'); if (add) { var nc = addChapterTo(add.dataset.addch); CH.sel = nc.id; CH.tab = 'set'; chapDraw(); return; }
      var pg = e.target.closest('.pgh'); if (pg && !e.target.closest('button')) { CH.collapsed[pg.dataset.pg] = !CH.collapsed[pg.dataset.pg]; chapDraw(); return; }
      var rw = e.target.closest('.chi'); if (!rw) return; var id = rw.dataset.id, c = chapterById(id);
      if (e.target.matches('[data-en]')) { c.enabled = e.target.checked; CH.dirty = true; chapDraw(); return; }
      var mv = e.target.closest('[data-mv]'); if (mv) { // 같은 ACT 안에서만 순서 교환 (ACT 이동은 프로젝트 탭)
        var same = ownedBy(c.project).filter(function (x) { return (x.act || 1) === (c.act || 1); }), i = same.indexOf(c), j = i + +mv.dataset.mv;
        if (j >= 0 && j < same.length) { var t = same[j].order; same[j].order = c.order; c.order = t; renumber(c.project); CH.dirty = true; chapDraw(); } return;
      }
      CH.sel = id; CH.tab = 'set'; chapDraw();
    };
    $('#chSave', root).onclick = function () { this.disabled = true; saveStructure().then(function () { chapDraw(); toast('저장했습니다'); }).catch(function (e) { toast(e.message, true); chapDraw(); }); };
    chapEditor();
  }
  function chapEditor() {
    var box = $('#chEd'), c = chapterById(CH.sel); if (!c) { box.innerHTML = ''; return; }
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
        '<p class="muted">id ' + esc(c.id) + ' · 종류 ' + esc(c.kind) + ' · 기본 챕터 ' + esc(c.base || c.id) + '<br>이 챕터는 <b>' + esc((projectById(c.project) || { name: c.project }).name) + '</b> 상품에서만 쓰입니다. 순서·ACT 묶음은 <b>프로젝트</b> 탭에서도 정할 수 있고, 챕터 내용은 여기서만 고칩니다.</p>' + '<div class="row"><button type="button" id="chDel" class="danger"' + (R.Chapters.CHAPTERS.some(function (x) { return x.id === c.id; }) ? ' disabled title="기본 챕터는 삭제할 수 없고 끌 수 있습니다"' : '') + '>삭제</button></div>';
      var upd = function (e) { var t = e.target, k = t.dataset && t.dataset.k;
        if (t.matches && t.matches('[data-proj]')) { var old = c.project; c.project = t.value; c.act = actCount(c.project); c.order = 9999; renumber(c.project); renumber(old); CH.dirty = true; chapDraw(); return; }
        if (t.matches && t.matches('[data-actsel]')) { c.act = +t.value; c.order = 9999; renumber(c.project); CH.dirty = true; chapDraw(); return; } if (t.closest('[data-cats]')) c.moduleCategories = $$('[data-cats] input:checked', b).map(function (i) { return i.value; }); else if (k) c[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? +t.value : t.value; else return; CH.dirty = true; $('#chSave').disabled = false; if (k === 'title') $('.chi.on b').textContent = $('.chi.on b').textContent.slice(0, 3) + t.value; };
      b.oninput = upd; b.onchange = upd;
      var dg = $('[data-dupgo]', b); if (dg) dg.onclick = function () { var tp = $('[data-dupproj]', b).value; if (!tp) return; var nc = addChapterTo(tp, c); toast('복제했습니다 → ' + projectById(tp).name); CH.sel = nc.id; CH.tab = 'set'; chapDraw(); };
      $('#chDel', b).onclick = function () { if (confirm('이 챕터를 삭제할까요? (프로젝트에서도 빠집니다)')) { W.chapters = W.chapters.filter(function (x) { return x !== c; }); CH.sel = W.chapters[0].id; CH.dirty = true; chapDraw(); } };
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
    PVS.forEach(function (p) { if (e.source === p.frame.contentWindow) { if (e.data.type === 'mt-v2-ready') { p.ready = true; if (p.pending) p.send(p.pending); } else if (e.data.type === 'mt-v2-chapter' && p.onChapter) p.onChapter(e.data.id); else if (e.data.type === 'mt-v2-tx' && p.onTx) p.onTx(e.data); else if (e.data.type === 'mt-v2-txlist' && p.onList) p.onList(e.data); else if (e.data.type === 'mt-v2-txmove' && p.onMove) p.onMove(e.data); } });
  });
  var awkMemo = null;
  function awakeningFor(sd) { // 이 사주의 각성 영상(없으면 fallback) — 뷰어가 받는 모양 {video, fallback}
    return (awkMemo ? Promise.resolve(awkMemo) : fetch('/api/awakening?all=1', { headers: { authorization: 'Bearer ' + PW } }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (d) { awkMemo = d; return d; })).then(function (d) {
      var pk = R.Media.pickAwakening(d.videos || [], sd.dayPillar.ko, sd.gender, d.fallback), ig = R.Media.pickIlgan(d.ilgan || [], sd.dayMaster.stem, sd.gender); return { pick: pk, ilgan: ig, awk: Object.assign(pk.fallback ? { video: null, fallback: pk.clip } : { video: pk.clip }, { ilgan: ig }) };
    });
  }
  // el 안에 [모바일|PC] 전환 + 미리보기 틀을 만든다. 반환: { show(chapterId|'awakening', projectId), refresh() }
  function PreviewPane(el, opt) {
    opt = opt || {}; var dev = 'm', P = { ready: false, pending: null, last: null };
    el.innerHTML = '<div class="pvbar"><button type="button" data-d="m" class="on">모바일</button><button type="button" data-d="d">PC</button><button type="button" data-r title="새로 그리기">⟳</button><span class="muted pvmsg"></span></div><div class="pvwrap"><div class="pvbox"><iframe title="리포트 미리보기" src="/report/v2/?preview=1"></iframe></div></div>';
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
    el.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.d) { dev = b.dataset.d; $$('.pvbar [data-d]', el).forEach(function (x) { x.classList.toggle('on', x === b); }); fit(); } else if (b.hasAttribute('data-r')) { P.ready = false; P.pending = P.last; frame.src = '/report/v2/?preview=1&_=' + Date.now(); } };
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
    function sel(k, opts, wide) { var v = effective()[k] || ''; return '<select data-k="' + k + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
    function render() {
      var list = P.roles.map(function (r) { return '<button type="button" data-role="' + r + '" class="' + (r === P.role ? 'on' : '') + '">' + esc((T.ROLES[r] || [r])[0]) + '</button>'; }).join('');
      var h = '<div class="row" style="align-items:center;margin-bottom:6px"><b style="color:var(--gold)">글자 편집</b><span class="muted" style="font-size:.76rem">미리보기에서 글자를 누르면 선택돼요 · 끌면 위치 이동</span><span style="flex:1"></span><button type="button" class="pri" data-txsave' + (TX.dirty ? '' : ' disabled') + '>글자 설정 저장</button></div>' +
        '<div class="sub2" style="margin:0 0 8px">' + (list || '<span class="muted">이 화면에 편집할 글자가 없습니다</span>') + '</div>';
      if (!P.role) { el.innerHTML = h; bind(); return; }
      var e = effective(), stage = isStage(P.role);
      h += '<div class="fld"><label>적용 범위</label>' + (stage ? '<div class="muted">영상 단계 자막은 모든 사주에 같이 적용됩니다</div>' : '<div class="sub2" style="margin:0"><button type="button" data-scope="chapter" class="' + (P.scope === 'chapter' ? 'on' : '') + '">이 챕터만</button><button type="button" data-scope="all" class="' + (P.scope === 'all' ? 'on' : '') + '">모든 챕터</button></div>') + '</div>' +
        '<div class="g2c">' + field('글씨체', sel('font', [['', '(기본)']].concat(window.StoryFonts.list))) + field('굵기', sel('weight', [['', '(기본)']].concat(T.WEIGHTS))) + '</div>' +
        '<div class="g2c">' + field('크기 · PC (px)', nf('size', 8, 120, 1, 16)) + field('크기 · 모바일 (px, 비우면 PC와 같게)', nf('sizeM', 8, 120, 1, 16)) + '</div>' +
        '<div class="g2c">' + field('색', '<div style="display:flex;gap:6px"><input type="color" data-color value="' + (e.color || '#EDE8DC') + '" style="width:38px;height:30px;padding:0"><input type="text" data-k="color" value="' + esc(e.color || '') + '" placeholder="기본 색"></div>') + field('정렬', '<div class="sub2" style="margin:0">' + [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']].map(function (a) { return '<button type="button" data-al="' + a[0] + '" class="' + (e.align === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div>') + '</div>' +
        '<div class="g2c">' + field('자간 (px)', nf('spacing', -3, 30, 0.5, 0)) + field('줄 간격 (배)', nf('line', 0.8, 3, 0.05, 1.6)) + '</div>' +
        '<div class="g2c">' + field('가로 이동 (화면 %, 음수=왼쪽)', nf('x', -80, 80, 0.5, 0)) + field('세로 이동 (화면 %, 음수=위)', nf('y', -80, 80, 0.5, 0)) + '</div>' +
        '<div class="cap2">나타나기</div><div class="g2c">' + field('등장 효과', sel('in', T.IN)) + field('등장 속도 (초)', nf('inSpeed', 0.2, 6, 0.1, 0.9)) + field('나타나는 시기 (초 · 장면에 들어온 뒤 몇 초 후)', nf('inDelay', 0, 30, 0.1, 0), true) + '</div>' +
        '<div class="cap2">사라지기</div><div class="g2c">' + field('사라지는 시기 (초 · 다 나타난 뒤 몇 초 후, 0=사라지지 않음)', nf('hold', 0, 60, 0.5, 0), true) + field('사라지는 효과', sel('out', T.OUT)) + field('사라지는 속도 (초)', nf('outSpeed', 0.2, 6, 0.1, 0.8)) + '</div>' +
        '<div class="cap2">계속 움직이는 효과</div><div class="g2c">' + field('효과', sel('loop', T.LOOP)) + field('주기 (초 · 클수록 느림)', nf('loopSpeed', 1, 30, 0.5, 6)) + '</div>' +
        '<div class="row" style="margin-top:10px"><button type="button" data-play>▶ 다시 재생</button><button type="button" data-reset>이 글자 설정 되돌리기</button></div>';
      el.innerHTML = h; bind();
    }
    function bind() {
      el.onclick = function (e) {
        var r = e.target.closest('[data-role]'); if (r) { P.role = r.dataset.role; if (!P.cid) P.cid = curCid(); pane.selectRole(P.role); render(); return; }
        var sc = e.target.closest('[data-scope]'); if (sc) { P.scope = sc.dataset.scope; render(); return; }
        var al = e.target.closest('[data-al]'); if (al) { put('align', al.dataset.al); render(); return; }
        if (e.target.closest('[data-play]')) { pane.sendTs(true); return; }
        if (e.target.closest('[data-reset]')) { var t = target(false); if (t) { Object.keys(t).forEach(function (k) { delete t[k]; }); var ts = tsWork(); [ts.all, ts.chapters[P.cid]].forEach(function (m) { if (m && m[P.role] && !Object.keys(m[P.role]).length) delete m[P.role]; }); } TX.dirty = true; pane.sendTs(true); render(); return; }
        if (e.target.closest('[data-txsave]')) { var b = e.target.closest('[data-txsave]'); b.disabled = true; C.save({ textStyles: tsWork() }).then(function () { ST.saved.textStyles = clone(tsWork()); TX.dirty = false; render(); toast('글자 설정을 저장했습니다'); }).catch(function (er) { toast(er.message, true); b.disabled = false; }); }
      };
      el.oninput = el.onchange = function (e) {
        var t = e.target, k = t.getAttribute && t.getAttribute('data-k');
        if (t.hasAttribute && t.hasAttribute('data-color')) { put('color', t.value); var ti = el.querySelector('input[type=text][data-k=color]'); if (ti) ti.value = t.value; return; }
        if (!k) return; var v = t.type === 'number' || t.type === 'range' ? (t.value === '' ? '' : +t.value) : t.value; put(k, v);
        if (t.type === 'range' || t.type === 'number') el.querySelectorAll('[data-k="' + k + '"]').forEach(function (o) { if (o !== t && (o.type === 'number' || o.type === 'range')) o.value = t.value; });
      };
    }
    P.onTx = function (m) { P.role = m.role || null; P.cid = m.cid || curCid(); if (P.role && isStage(P.role)) P.scope = 'all'; render(); };
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
  var INTENT_KO = { element: '오행', state: '상태', theme: '주제', emotion: '감정', scene: '장면', role: '역할' };
  var needsMedia = function (s) { return R.Scenes.SCENE_RULES[s.sceneType] && R.Scenes.SCENE_RULES[s.sceneType].media; };
  function intentTags(s) { // 장면 의도 → 분류별 태그(허용 목록에 있는 것만)
    var T = R.Scenes.TAX, it = s.intent || {}, f = function (arr, k) { return (arr || []).filter(function (x, i, a) { return T[k].indexOf(x) >= 0 && a.indexOf(x) === i; }); };
    return { element: f(it.desiredElements, 'element'), state: f(it.desiredStates, 'state'), emotion: f(it.desiredEmotion, 'emotion'), scene: f(it.desiredScenes, 'scene'), theme: f(it.desiredThemes, 'theme'), role: f([it.visualRole], 'role') };
  }
  function sourceRow(c, s) {
    var tg = intentTags(s), m = s.media, pre = (s.intent && s.intent.preferredMediaType) || [], by = {}; (ST.media || []).forEach(function (a) { by[a.id] = a; });
    var cands = (s.candidates || []).filter(function (x) { return x.score > 0; }), own = cands.filter(function (x) { var a = by[x.assetId]; return a && a.chapterIds && a.chapterIds.indexOf(c.id) >= 0; }).length;
    var chips = ['element', 'state', 'theme', 'emotion', 'scene', 'role'].map(function (k) { return tg[k].length ? '<span class="pill">' + INTENT_KO[k] + ' ' + esc(tg[k].join('·')) + '</span>' : ''; }).join('');
    var status = m ? '<span class="pill" style="color:#7FE0BC;border-color:#2e6e57">선택됨 · ' + esc(m.assetId) + '</span>' : '<span class="pill w">클립 필요</span>';
    return '<div class="srow2" data-cid="' + esc(c.id) + '" data-st="' + esc(s.sceneType) + '">' + (m ? thumb(m) : '<span class="thm" style="display:grid;place-items:center;color:var(--ink3);font-size:.68rem">없음</span>') + '<div style="flex:1;min-width:0"><b>' + esc(SCENE_KO[s.sceneType] || s.sceneType) + '</b> ' + status +
      '<div class="muted" style="font-size:.76rem;margin:2px 0">필요한 클립: ' + esc(pre.map(function (t) { return MTYPE_KO[t] || t; }).join(' › ')) + ' · 이 챕터에서 쓸 수 있는 후보 ' + cands.length + '개' + (own ? ' (이 챕터 전용 ' + own + '개)' : '') + '</div><div style="display:flex;flex-wrap:wrap;gap:2px">' + chips + '</div>' +
      '<div class="row" style="margin-top:6px;gap:6px"><label class="navbtn" style="cursor:pointer;padding:3px 10px;font-size:.78rem">파일 올리기 → 보관함<input type="file" data-up accept="image/*,video/mp4,video/webm,video/quicktime" hidden></label><span class="muted" data-upmsg></span></div></div></div>';
  }
  function missingCount(rep) { var n = 0; rep.chapters.forEach(function (c) { c.scenes.forEach(function (s) { if (needsMedia(s) && !s.media) n++; }); }); return n; }
  function afterSourceChange() { var p = TST.pane; if (p) p.refresh(); run(); }
  // root 안의 .srow2 들에 업로드를 연결한다(조합 테스트 오른쪽 패널·전체 보기 창 공용)
  function bindSources(root) {
    root.addEventListener('change', function (e) {
      if (!e.target.matches('[data-up]')) return; var row = e.target.closest('.srow2'); if (!row) return;
      var c = TST.rep.chapters.filter(function (x) { return x.id === row.dataset.cid; })[0], s = c && c.scenes.filter(function (x) { return x.sceneType === row.dataset.st; })[0], msg = row.querySelector('[data-upmsg]');
      var file = e.target.files[0]; if (!file || !s) return; var tg = intentTags(s), pre = (s.intent.preferredMediaType || []);
      msg.textContent = '올리는 중…';
      A.quickAdd(file, { type: pre.filter(function (t) { return /^video|transition|image|character|symbol|chapterCover/.test(t); })[0], title: c.title + ' · ' + (SCENE_KO[s.sceneType] || s.sceneType), elementTags: tg.element, stateTags: tg.state, emotionTags: tg.emotion, sceneTags: tg.scene, themeTags: tg.theme, chapterTags: tg.theme.slice(0, 1), visualRole: tg.role, chapterIds: [c.id] }, PW, function (p) { msg.textContent = '올리는 중 ' + Math.round(p * 100) + '%'; })
        .then(function (a) { ST.media = [a].concat(ST.media || []); toast('클립 보관함에 저장했습니다 · 이 챕터에서 자동으로 골라 씁니다'); afterSourceChange(); })
        .catch(function (er) { msg.textContent = er.message; toast(er.message, true); });
    });
  }
  function allSourcesDialog() { // 프로젝트 전체에서 비어 있는 클립 자리 목록
    var rep = TST.rep, d = document.createElement('dialog'); d.className = 'v2dlg'; d.style.width = 'min(900px,96vw)';
    var h = '<h3>필요한 클립 소스 — ' + esc(rep.chapters.length ? (TS.project) : '') + ' 전체</h3><p class="muted">비어 있는 장면입니다. 파일을 올리면 <b>클립 보관함</b>에 저장되고, 그 챕터 안에서 자동으로 골라 씁니다. 일간 소개·일주 각성 영상은 사주마다 달라서 <b>클립 라이브러리 → 각성 영상</b>에서 일괄 등록하세요.</p>';
    rep.chapters.forEach(function (c) { var rows = c.scenes.filter(function (s) { return needsMedia(s) && !s.media; }); if (rows.length) h += '<div class="cap2">' + String(c.no).padStart(2, '0') + ' ' + esc(c.title) + ' — ' + rows.length + '개</div>' + rows.map(function (s) { return sourceRow(c, s); }).join(''); });
    if (!missingCount(rep)) h += '<p style="color:#7FE0BC">모든 장면에 클립이 있습니다.</p>';
    d.innerHTML = h + '<div class="row" style="justify-content:flex-end;margin-top:12px"><button type="button" id="dx">닫기</button></div>'; document.body.appendChild(d); d.showModal(); d.addEventListener('close', function () { d.remove(); });
    d.querySelector('#dx').onclick = function () { d.close(); }; bindSources(d);
    d.addEventListener('change', function () { setTimeout(function () { d.close(); }, 1500); });
  }

  /* ═════ ③ 조합 테스트 ═════ */
  var PRESETS = [['1990-05-15', '14:30', 'M', '경진 · 신강'], ['1985-11-23', '07:10', 'F', '1985 여'], ['2000-02-29', '22:40', 'M', '2000 남'], ['1978-08-08', '03:00', 'F', '1978 여']];
  var TST = { sel: 'awakening', rep: null, sd: null, pane: null, busy: 0 };
  function testOpen() {
    var root = $('#t-v2test');
    if (!built.test) {
      built.test = 1;
      root.innerHTML = '<div class="card tbar"><div class="tsum" id="tSum"></div><div class="row" style="align-items:center"><select id="tProj" aria-label="프로젝트"></select><button type="button" id="tEditBtn">테스트 사주 바꾸기</button><label class="chk2"><input type="checkbox" id="tDbg"' + (TS.dbg ? ' checked' : '') + '>선택 근거 보기</label><button type="button" class="pri" id="tGo">다시 조합</button></div>' +
        '<div class="tform hide" id="tForm"></div></div>' +
        '<div class="t3"><div class="card"><div class="muted" style="margin-bottom:6px">챕터 <span id="tIssues"></span></div><div class="trail" id="tRail"></div></div><div class="card"><div id="tPv"></div></div><div><div class="card" id="tTx"></div><div class="card tinsp" id="tInsp" style="margin-top:12px"><p class="muted">챕터를 고르면 선택 근거가 보입니다.</p></div></div></div>' +
        '<details class="card" id="tCovBox" style="margin-top:12px"><summary><b>콘텐츠 커버리지 점검</b> <span class="muted">조건 있는 모듈이 사주 구조를 얼마나 덮는지 · 눌러서 열기</span></summary><div id="tCov" style="margin-top:8px"></div></details>';
      var txp = {}; TST.pane = PreviewPane($('#tPv', root), { onChapter: function (id) { if (TST.sel !== id) { TST.sel = id; markRail(); inspect(); } }, onTx: function (m) { txp.p.onTx(m); }, onList: function (m) { txp.p.onList(m); }, onMove: function (m) { txp.p.onMove(m); } });
      txp.p = TxPanel($('#tTx', root), TST.pane, function () { return TST.sel === 'ilgan' || TST.sel === 'awakening' ? '_' : TST.sel; });
      $('#tGo', root).onclick = function () { run(); }; $('#tDbg', root).onchange = function (e) { TS.dbg = e.target.checked; saveTS(); inspect(); };
      $('#tProj', root).onchange = function (e) { TS.project = e.target.value; saveTS(); run(); };
      $('#tEditBtn', root).onclick = function () { $('#tForm', root).classList.toggle('hide'); };
      $('#tCovBox', root).ontoggle = function () { if (this.open && !this.dataset.done) { this.dataset.done = 1; C.covOpen($('#tCov', root)); } };
      $('#tRail', root).onclick = function (e) { var b = e.target.closest('[data-c]'); if (!b) return; TST.sel = b.dataset.c; markRail(); inspect(); TST.pane.show(TST.sel, TS.project); };
      $('#tInsp', root).addEventListener('change', function (e) { // 일간 소개·일주 각성 영상 바로 올리기
        var inp = e.target.closest('[data-awup]'); if (!inp || !TST.sd) return; var f = inp.files[0]; if (!f) return; var msg = $('[data-awmsg]', $('#tInsp', root)), sd = TST.sd, kind = inp.dataset.awup, key = kind === 'ilgan' ? { stem: sd.dayMaster.stem, gender: sd.gender } : { pillar: sd.dayPillar.ko, gender: sd.gender };
        if (msg) msg.textContent = '올리는 중…'; A.quickAwakening(kind, key, f, PW, function (p) { if (msg) msg.textContent = '올리는 중 ' + Math.round(p * 100) + '%'; }).then(function () { awkMemo = null; toast('영상을 연결했습니다'); run(); }).catch(function (er) { if (msg) msg.textContent = er.message; toast(er.message, true); });
      });
      bindSources($('#tInsp', root)); $('#tInsp', root).addEventListener('click', function (e) { if (e.target.closest('[data-allsrc]') && TST.rep) allSourcesDialog(); });
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
      if (my !== TST.busy) return; TST.rep = r.rep; TST.sd = r.sd; var rep = r.rep, sd = r.sd;
      var sn = function (s) { return s ? SEA[s] : '-'; };
      $('#tSum').innerHTML = '<b>' + esc(TS.date) + ' ' + esc(TS.time) + ' ' + (TS.gender === 'M' ? '남' : '여') + '</b> → <b style="color:var(--gold)">' + esc(sd.dayPillar.ko) + '일주</b> · ' + esc(sd.strength.zone) + ' · 용신 ' + esc(sd.usefulElements ? sd.usefulElements.yong : '없음') + ' · 대운 ' + esc(sd.currentDaewoon ? sn(sd.currentDaewoon.season) : '-') + ' · 올해 ' + esc(sd.sewoon ? sn(sd.sewoon.season) : '-') + ' <span class="muted">(' + esc(r.pack.cfg.project.name) + ' · ' + rep.chapters.length + '챕터)</span>';
      var issues = 0, h = '<button type="button" data-c="ilgan" class="ri' + (TST.sel === 'ilgan' ? ' on' : '') + '"><span>🎬</span><b>일간 소개 영상</b></button><button type="button" data-c="awakening" class="ri' + (TST.sel === 'awakening' ? ' on' : '') + '"><span>🎬</span><b>일주 각성 영상</b></button>', act = 0;
      rep.chapters.forEach(function (c) {
        if (c.act !== act) { act = c.act; var a = rep.acts.filter(function (x) { return x.id === act; })[0] || {}; h += '<div class="ract">' + esc(a.roman || '') + ' · ' + esc(a.title || '') + '</div>'; }
        var fb = c.modules[0] && /_fallback$/.test(c.modules[0]), nm = c.scenes.filter(function (s) { return !s.media && R.Scenes.SCENE_RULES[s.sceneType].media; }).length; if (fb) issues++;
        h += '<button type="button" data-c="' + esc(c.id) + '" class="ri' + (c.id === TST.sel ? ' on' : '') + '"><span>' + String(c.no).padStart(2, '0') + '</span><b>' + esc(c.title) + '</b>' + (fb ? '<i class="pill w" title="조건 있는 모듈이 없어 기본 안내만 나옵니다">기본안내</i>' : '') + (nm ? '<i class="pill" title="미디어가 없어 자리표시 장면이 나오는 장면 수">미디어 ' + nm + '</i>' : '') + '</button>';
      });
      rail.innerHTML = h; $('#tIssues').innerHTML = issues ? '<span class="pill w">기본 안내만 ' + issues + '개</span>' : '<span class="pill">모두 정상</span>';
      if (!rep.chapters.some(function (c) { return c.id === TST.sel; }) && TST.sel !== 'awakening' && TST.sel !== 'ilgan') TST.sel = rep.chapters[0].id;
      inspect(); TST.pane.show(TST.sel, TS.project);
    }).catch(function (e) { rail.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  // 오른쪽 "선택 근거" 패널
  function inspect() {
    var box = $('#tInsp'), rep = TST.rep, sd = TST.sd; if (!rep) return;
    if (TST.sel === 'ilgan') {
      awakeningFor(sd).then(function (a) { box.innerHTML = '<b>일간 소개 영상</b><p class="muted">일주 각성 영상 <u>앞</u>에 나옵니다 ("당신은 ' + esc(sd.dayMaster.stem + sd.dayMaster.el) + '입니다").<br>' + (a.ilgan ? '<span style="color:#7FE0BC">' + esc(sd.dayMaster.stem) + ' · ' + (sd.gender === 'M' ? '남' : '여') + ' 영상이 연결되어 있습니다.</span>' : '<span style="color:#FF9C8C">' + esc(sd.dayMaster.stem) + ' · ' + (sd.gender === 'M' ? '남' : '여') + ' 영상이 아직 없어 이 단계는 건너뜁니다.</span>') + '</p><div class="row"><button type="button" id="goIlg">일간 소개 영상 등록하러 가기</button><label class="navbtn" style="cursor:pointer;margin-left:6px">이 일간·성별 영상 바로 올리기<input type="file" data-awup="ilgan" accept="video/mp4,video/webm,video/quicktime,image/*" hidden></label><span class="muted" data-awmsg></span></div>'; $('#goIlg', box).onclick = function () { gotoTab('v2clip'); var b = $('#clNav button[data-k=awk]'); if (b) b.click(); }; });
      return;
    }
    if (TST.sel === 'awakening') {
      awakeningFor(sd).then(function (a) { var pk = a.pick; box.innerHTML = '<b>일주 각성 영상</b><p class="muted">' + (pk.fallback ? '<span style="color:#FF9C8C">' + esc(pk.key) + ' 영상이 아직 없습니다 → ' + (pk.clip ? 'fallback 영상으로 진행' : 'fallback 도 없어 문구·정지 화면으로 진행') + '</span>' : '<span style="color:#7FE0BC">' + esc(pk.key) + ' 영상이 연결되어 있습니다.</span> ' + esc(pk.clip.title || '')) + '</p><div class="row"><button type="button" id="goAwk">각성 영상 등록하러 가기</button><label class="navbtn" style="cursor:pointer;margin-left:6px">이 일주·성별 영상 바로 올리기<input type="file" data-awup="iju" accept="video/mp4,video/webm,video/quicktime,image/*" hidden></label><span class="muted" data-awmsg></span></div>'; $('#goAwk', box).onclick = function () { gotoTab('v2clip'); var b = $('#clNav button[data-k=awk]'); if (b) b.click(); }; });
      return;
    }
    var c = rep.chapters.filter(function (x) { return x.id === TST.sel; })[0]; if (!c) { box.innerHTML = ''; return; }
    var fb = c.modules[0] && /_fallback$/.test(c.modules[0]);
    var h = '<b>' + String(c.no).padStart(2, '0') + ' ' + esc(c.title) + '</b><p class="muted" style="margin:4px 0 8px">FACT · ' + esc(c.fact) + '</p>' + (fb ? '<p class="pill w" style="display:inline-block;margin:0 0 8px">조건 있는 모듈이 없어 기본 안내만 표시됩니다</p>' : '');
    h += '<div class="cap2">선택된 모듈</div>' + ((c.lead && c.lead.id) ? [c.lead].concat(c.details || []).map(function (m) { return '<div class="mrow"><div><b>' + esc(m.headline || m.id) + '</b><small>' + esc(m.id) + '</small>' + (TS.dbg && m.why && m.why.length ? '<div class="why">' + m.why.map(function (w) { return '<span class="' + (/✓/.test(w) ? 'hit' : 'miss') + '">' + esc(w) + '</span>'; }).join('') + '</div>' : (TS.dbg ? '<div class="why muted">조건 없음(항상 후보)</div>' : '')) + '</div><button type="button" data-edit="' + esc(c.id) + '" data-mod="' + esc(m.id) + '">수정</button></div>'; }).join('') : '<p class="muted">없음</p>');
    var miss1 = c.scenes.filter(function (x) { return needsMedia(x) && !x.media; }).length, missAll = missingCount(rep);
    h += '<div class="cap2">필요한 클립 소스</div><p class="muted" style="margin:0 0 4px">이 챕터 <b style="color:' + (miss1 ? '#FFC080' : '#7FE0BC') + '">' + (miss1 ? miss1 + '개 비어 있음' : '모두 있음') + '</b> · 프로젝트 전체 ' + missAll + '개 비어 있음 <button type="button" data-allsrc style="padding:2px 10px;font-size:.76rem">전체 보기</button></p>' + c.scenes.filter(needsMedia).map(function (s) { return sourceRow(c, s); }).join('') + '<p class="muted" style="font-size:.76rem;margin:6px 0 0">데이터 장면(월별·대운 표 등)은 클립 없이 화면 자체로 표시됩니다.</p>' + (TS.dbg ? '<div class="cap2">점수 근거</div>' + c.scenes.filter(function (x) { return x.media; }).map(function (x) { return '<div class="muted" style="font-size:.74rem">' + esc(x.sceneType) + ': ' + x.media.why.map(function (w) { return esc(w.label) + (w.v > 0 ? '+' : '') + w.v; }).join(' ') + '</div>'; }).join('') : '');
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
      built.set = 1; root.innerHTML = '<div class="sub2" id="stNav"></div><div id="stScore" class="hide"></div>';
      subnav($('#stNav', root), [['intro', '입장 인트로'], ['home', '온보딩 페이지'], ['score', '미디어 점수·AI'], ['lib', '기존 클립 (구버전)']], also || 'intro', function (k) { gotoTab('v2set', k); });
    }
    $('#stScore', root).classList.toggle('hide', also !== 'score'); if (also === 'score') scoreOpen();
    if (!also) { $$('#stNav button', root).forEach(function (b) { b.classList.toggle('on', b.dataset.k === 'intro'); }); setTimeout(function () { window.AdminShowTab('v2set', 'intro'); }, 0); }
  }
  function scoreOpen() {
    var box = $('#stScore'); C.load().then(function () {
      var sc = ST.saved.scoring || {}, Wt = Object.assign({}, R.Scenes.CONFIG.w, sc.w || {});
      box.innerHTML = '<div class="card"><b style="color:var(--gold)">미디어 매칭 점수</b> <span class="muted">Scene Intent 와 미디어 태그가 일치할 때 더해지는 점수입니다. 값이 클수록 그 기준을 중요하게 봅니다.</span><div class="row" style="margin-top:10px">' + Object.keys(Wt).map(function (k) { return '<label>' + k + '<input type="number" data-w="' + k + '" value="' + Wt[k] + '" style="width:80px"></label>'; }).join('') + '</div><div class="row" style="margin-top:12px"><button class="pri" id="scSave" type="button">저장</button></div><p class="muted" style="margin-top:12px">AI 컴포저는 서버에 ANTHROPIC_API_KEY(없으면 OPENAI_API_KEY)가 있어야 동작합니다. 없거나 실패해도 리포트는 사람이 쓴 모듈 문장으로 정상 출력됩니다. AI를 쓰지 않을 챕터는 "챕터 관리 → 기본 설정"에서 끌 수 있습니다.</p></div>';
      $('#scSave', box).onclick = function () { var w = {}; $$('input[data-w]', box).forEach(function (i) { w[i.dataset.w] = +i.value; }); C.save({ scoring: { w: w } }).then(function () { ST.saved.scoring = { w: w }; R.Scenes.configure({ w: w }); }).catch(function (e) { toast(e.message, true); }); };
    });
  }

  window.V2Shell = { open: function (tab, pw, also) {
    PW = pw; C.setPw(pw);
    if (tab === 'v2clip') clipOpen(); else if (tab === 'v2chap') chapOpen(); else if (tab === 'v2test') testOpen(); else if (tab === 'v2proj') projOpen(); else if (tab === 'v2set') setOpen(also);
  } };
})();
