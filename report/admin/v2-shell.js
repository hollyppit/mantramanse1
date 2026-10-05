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
  var built = {}, W = { modules: null, remedies: null, chapters: null }; // W = 저장 전 작업본(미리보기에 바로 반영)

  var css = document.createElement('style');
  css.textContent = '.sub2{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px;align-items:center}.sub2 button{border-radius:999px;padding:6px 14px;font-size:.84rem;color:var(--ink2)}.sub2 button.on{border-color:var(--gold);color:var(--gold);background:#1c1a12}' +
    '.cols{display:grid;grid-template-columns:minmax(250px,320px) minmax(0,1fr);gap:14px;align-items:start}@media(max-width:900px){.cols{grid-template-columns:1fr}}' +
    '.chl{display:grid;gap:4px;max-height:76vh;overflow:auto}.chi{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);cursor:pointer;font-size:.84rem}.chi.on{border-color:var(--gold)}.chi.off{opacity:.5}.chi small{color:var(--ink3);display:block}' +
    '.chi input{width:auto}.pill{font-size:.7rem;padding:0 7px;border-radius:999px;border:1px solid var(--line);color:var(--ink3);margin-left:3px;white-space:nowrap}.pill.w{border-color:#B8742A;color:#FFC080}' +
    '.pjc{border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--bg);cursor:pointer;margin-bottom:8px}.pjc.on{border-color:var(--gold)}.pjc.off{opacity:.55}.pjc b{font-family:"Noto Serif KR",serif}.pjc small{display:block;color:var(--ink3)}' +
    '.stat{display:flex;gap:14px;flex-wrap:wrap;font-size:.84rem;color:var(--ink2);margin:6px 0}.stat b{color:var(--gold)}.fld{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:8px 0}.g2c{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.pick{display:grid;grid-template-columns:24px 40px 1fr 70px 62px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line);font-size:.84rem}.pick input[type=checkbox]{width:auto}.pick select{padding:3px 6px}' +
    '.pvh{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:10px}.pvh label{display:grid;gap:3px;font-size:.78rem;color:var(--ink2)}.thm{width:38px;height:48px;border-radius:5px;background:#000 center/cover;border:1px solid var(--line);flex:none}';
  css.textContent += '.tbar select{width:auto;min-width:170px}.tbar{display:grid;gap:8px}.tsum{font-size:.95rem}.chk2{display:flex;gap:6px;align-items:center;font-size:.84rem;color:var(--ink2)}.tform{border-top:1px solid var(--line);padding-top:10px}' +
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
  function chaptersAll() { // 작업본(저장 전 포함) 챕터 목록
    if (!W.chapters) { var sv = ST.saved.chapters; W.chapters = C.mix(R.Chapters.CHAPTERS, sv && sv.chapters).sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
    return W.chapters;
  }
  var chapterById = function (id) { return chaptersAll().filter(function (c) { return c.id === id; })[0]; };
  function content() { // 저장본 위에 작업본을 얹은 콘텐츠(미리보기·테스트용)
    var c = Object.assign({}, ST.saved); if (W.modules) c.modules = W.modules; if (W.remedies) c.remedies = W.remedies;
    c.chapters = { chapters: chaptersAll(), acts: (ST.saved.chapters && ST.saved.chapters.acts) || [] };
    if (W.projects) c.projects = W.projects; return c;
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
        if (!confirm('기존(구버전) 클립을 새 라이브러리로 복사할까요?\n· 일주+성별이 정해진 클립 → 각성 영상\n· 그 외 → 장면 미디어(영상)\n원본 클립은 그대로 남고, 가져온 뒤 각 탭에서 "변경사항 저장"을 눌러야 반영됩니다.')) return;
        imp.disabled = true; A.importLegacy(PW, function (r) { imp.disabled = false; if (r) { toast('가져왔습니다 — 각성 영상 ' + r.awakening + '개 · 장면 미디어 ' + r.media + '개 (건너뜀 ' + r.skipped + '). 각 탭에서 저장하세요.'); var on = $('#clNav .on', root); if (on) on.click(); } });
      };
      $('#clNav', root).appendChild(imp);
      go('media');
    }
  }

  /* ═════ ② 챕터 관리 ═════ */
  var CH = { sel: null, tab: 'set', dirty: false, dbg: true };
  function chapOpen() {
    var root = $('#t-v2chap'); C.load().then(function () {
      if (!built.chap) { built.chap = 1; CH.sel = chaptersAll()[0].id; chapDraw(); } else if (CH.pending) { CH.sel = CH.pending; CH.pending = null; CH.tab = 'set'; chapDraw(); }
    });
  }
  function projectsOf(id) { return R.Chapters.projects(content()).filter(function (p) { return !p.chapters || p.chapters.some(function (x) { return x.id === id; }); }); }
  function chapDraw() {
    var root = $('#t-v2chap'), all = chaptersAll();
    root.innerHTML = '<div class="cols"><div class="card"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><b style="color:var(--gold)">챕터</b><span style="flex:1"></span><button type="button" id="chAdd">+ 추가</button><button class="pri" type="button" id="chSave"' + (CH.dirty ? '' : ' disabled') + '>저장</button></div><div class="chl">' +
      all.map(function (c, i) { var n = coverageOf(c), pj = projectsOf(c.id).filter(function (p) { return p.id !== 'full'; });
        return '<div class="chi' + (c.id === CH.sel ? ' on' : '') + (c.enabled === false ? ' off' : '') + '" data-id="' + esc(c.id) + '"><input type="checkbox" data-en aria-label="사용"' + (c.enabled !== false ? ' checked' : '') + '><div><b>' + String(i + 1).padStart(2, '0') + ' ' + esc(c.title) + '</b><small>' + esc(c.kind) + ' · 모듈 ' + n + (n === 0 && c.kind !== 'remedy' && c.kind !== 'summary' ? ' <span class="pill w">비어 있음</span>' : '') + pj.map(function (p) { return '<span class="pill">' + esc(p.name.slice(0, 4)) + '</span>'; }).join('') + '</small></div><span><button type="button" data-mv="-1" aria-label="위로">▲</button><button type="button" data-mv="1" aria-label="아래로">▼</button></span></div>'; }).join('') + '</div><p class="muted" style="margin:8px 0 0;font-size:.76rem">순서는 "종합 운세"의 기본 순서입니다. 프로젝트별 순서는 프로젝트에서 따로 정합니다.</p></div><div id="chEd"></div></div>';
    $('.chl', root).onclick = function (e) {
      var row = e.target.closest('.chi'); if (!row) return; var id = row.dataset.id, c = chapterById(id);
      if (e.target.matches('[data-en]')) { c.enabled = e.target.checked; CH.dirty = true; chapDraw(); return; }
      var mv = e.target.closest('[data-mv]'); if (mv) { var i = all.indexOf(c), j = i + +mv.dataset.mv; if (j >= 0 && j < all.length) { all[i] = all[j]; all[j] = c; all.forEach(function (x, k) { x.order = k + 1; }); CH.dirty = true; chapDraw(); } return; }
      CH.sel = id; CH.tab = 'set'; chapDraw();
    };
    $('#chAdd', root).onclick = function () { var n = all.length + 1, id = 'cx' + Date.now().toString(36).slice(-5); all.push({ id: id, no: n, order: n, act: 4, enabled: true, title: '새 챕터', subtitle: '', kind: 'module', moduleCategories: ['identity'], maxModules: 1, aiEnabled: true, accessLevel: 'free', coverImage: '', introText: '' }); CH.sel = id; CH.dirty = true; chapDraw(); };
    $('#chSave', root).onclick = function () {
      this.disabled = true; var acts = (ST.saved.chapters && ST.saved.chapters.acts) || [], part = { chapters: { chapters: all.map(function (c, i) { c.order = i + 1; return c; }), acts: acts } };
      C.save(part).then(function () { ST.saved.chapters = part.chapters; CH.dirty = false; chapDraw(); }).catch(function (e) { toast(e.message, true); chapDraw(); });
    };
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
        '<p class="muted">id ' + esc(c.id) + ' · 종류 ' + esc(c.kind) + ' · 포함된 프로젝트: ' + (projectsOf(c.id).map(function (p) { return esc(p.name); }).join(', ') || '없음') + '</p><div class="row"><button type="button" id="chDel" class="danger"' + (R.Chapters.CHAPTERS.some(function (x) { return x.id === c.id; }) ? ' disabled title="기본 챕터는 삭제할 수 없고 끌 수 있습니다"' : '') + '>삭제</button></div>';
      var upd = function (e) { var t = e.target, k = t.dataset && t.dataset.k; if (t.closest('[data-cats]')) c.moduleCategories = $$('[data-cats] input:checked', b).map(function (i) { return i.value; }); else if (k) c[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? +t.value : t.value; else return; CH.dirty = true; $('#chSave').disabled = false; if (k === 'title') $('.chi.on b').textContent = $('.chi.on b').textContent.slice(0, 3) + t.value; };
      b.oninput = upd; b.onchange = upd;
      $('#chDel', b).onclick = function () { if (confirm('이 챕터를 삭제할까요? (프로젝트에서도 빠집니다)')) { W.chapters = W.chapters.filter(function (x) { return x !== c; }); CH.sel = W.chapters[0].id; CH.dirty = true; chapDraw(); } };
    } else if (CH.tab === 'mod' || CH.tab === 'rem') {
      var cfg = CH.tab === 'mod' ? C.modCfg() : C.remCfg(), key = CH.tab === 'mod' ? 'modules' : 'remedies';
      b.innerHTML = '<p class="muted">' + (CH.tab === 'mod' ? '이 챕터에서 선택되는 해석 모듈(' + (c.moduleCategories || []).map(function (k) { return C.CAT_KO[k]; }).join('·') + ')입니다. 수정하면 "미리보기" 탭에 바로 반영됩니다.' : '개운법·행동 추천 라이브러리입니다(필요 행동 태그와 겹칠수록 추천).') + '</p><div id="chItems"></div>';
      cfg.onChange = function (list, saved) { W[key] = list; W['d_' + key] = !saved; if (TST.pane) TST.pane.refresh(); if (CH.pane) CH.pane.refresh(); }; cfg.initial = W[key] || null; cfg.initialDirty = !!W['d_' + key]; if (CH.tab === 'mod') cfg.lockCats = c.moduleCategories && c.moduleCategories.length ? c.moduleCategories : null;
      C.itemAdmin($('#chItems', b), cfg);
      if (CH.pendingModule) { var li = $('#chItems .v2li[data-id="' + CH.pendingModule + '"]'); if (li) li.click(); CH.pendingModule = null; }
    } else {
      b.innerHTML = '<div class="row" style="align-items:center;margin-bottom:8px"><span class="muted" id="pvSum"></span><span style="flex:1"></span><button type="button" id="pvEdit">테스트 사주 바꾸기 (조합 테스트)</button></div><div id="pvHost"></div>';
      var pane = PreviewPane($('#pvHost', b), { onChapter: function () { } }); CH.pane = pane;
      computeSd().then(function (sd) { $('#pvSum', b).textContent = TS.date + ' ' + TS.time + ' ' + (TS.gender === 'M' ? '남' : '여') + ' · ' + sd.dayPillar.ko + '일주'; });
      pane.show(c.id, 'full'); $('#pvEdit', b).onclick = function () { gotoTab('v2test'); };
    }
  }

  /* ═════ 미리보기 부품: 실제 뷰어(/report/v2/?preview=1)를 iframe 으로 띄워 저장 전 내용을 그대로 보여 준다 ═════ */
  var PVS = []; // 살아 있는 미리보기들
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    PVS = PVS.filter(function (p) { return document.body.contains(p.frame); });
    PVS.forEach(function (p) { if (e.source === p.frame.contentWindow) { if (e.data.type === 'mt-v2-ready') { p.ready = true; if (p.pending) p.send(p.pending); } else if (e.data.type === 'mt-v2-chapter' && p.onChapter) p.onChapter(e.data.id); } });
  });
  var awkMemo = null;
  function awakeningFor(sd) { // 이 사주의 각성 영상(없으면 fallback) — 뷰어가 받는 모양 {video, fallback}
    return (awkMemo ? Promise.resolve(awkMemo) : fetch('/api/awakening?all=1', { headers: { authorization: 'Bearer ' + PW } }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (d) { awkMemo = d; return d; })).then(function (d) {
      var pk = R.Media.pickAwakening(d.videos || [], sd.dayPillar.ko, sd.gender, d.fallback); return { pick: pk, awk: pk.fallback ? { video: null, fallback: pk.clip } : { video: pk.clip } };
    });
  }
  // el 안에 [모바일|PC] 전환 + 미리보기 틀을 만든다. 반환: { show(chapterId|'awakening', projectId), refresh() }
  function PreviewPane(el, opt) {
    opt = opt || {}; var dev = 'm', P = { ready: false, pending: null, last: null };
    el.innerHTML = '<div class="pvbar"><button type="button" data-d="m" class="on">모바일</button><button type="button" data-d="d">PC</button><button type="button" data-r title="새로 그리기">⟳</button><span class="muted pvmsg"></span></div><div class="pvwrap"><div class="pvbox"><iframe title="리포트 미리보기" src="/report/v2/?preview=1"></iframe></div></div>';
    var frame = $('iframe', el), box = $('.pvbox', el), wrap = $('.pvwrap', el), msg = $('.pvmsg', el);
    P.frame = frame; P.onChapter = opt.onChapter;
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

  /* ═════ ③ 조합 테스트 ═════ */
  var PRESETS = [['1990-05-15', '14:30', 'M', '경진 · 신강'], ['1985-11-23', '07:10', 'F', '1985 여'], ['2000-02-29', '22:40', 'M', '2000 남'], ['1978-08-08', '03:00', 'F', '1978 여']];
  var TST = { sel: 'awakening', rep: null, sd: null, pane: null, busy: 0 };
  function testOpen() {
    var root = $('#t-v2test');
    if (!built.test) {
      built.test = 1;
      root.innerHTML = '<div class="card tbar"><div class="tsum" id="tSum"></div><div class="row" style="align-items:center"><select id="tProj" aria-label="프로젝트"></select><button type="button" id="tEditBtn">테스트 사주 바꾸기</button><label class="chk2"><input type="checkbox" id="tDbg"' + (TS.dbg ? ' checked' : '') + '>선택 근거 보기</label><button type="button" class="pri" id="tGo">다시 조합</button></div>' +
        '<div class="tform hide" id="tForm"></div></div>' +
        '<div class="t3"><div class="card"><div class="muted" style="margin-bottom:6px">챕터 <span id="tIssues"></span></div><div class="trail" id="tRail"></div></div><div class="card"><div id="tPv"></div></div><div class="card tinsp" id="tInsp"><p class="muted">챕터를 고르면 선택 근거가 보입니다.</p></div></div>' +
        '<details class="card" id="tCovBox" style="margin-top:12px"><summary><b>콘텐츠 커버리지 점검</b> <span class="muted">조건 있는 모듈이 사주 구조를 얼마나 덮는지 · 눌러서 열기</span></summary><div id="tCov" style="margin-top:8px"></div></details>';
      TST.pane = PreviewPane($('#tPv', root), { onChapter: function (id) { if (TST.sel !== id) { TST.sel = id; markRail(); inspect(); } } });
      $('#tGo', root).onclick = function () { run(); }; $('#tDbg', root).onchange = function (e) { TS.dbg = e.target.checked; saveTS(); inspect(); };
      $('#tProj', root).onchange = function (e) { TS.project = e.target.value; saveTS(); run(); };
      $('#tEditBtn', root).onclick = function () { $('#tForm', root).classList.toggle('hide'); };
      $('#tCovBox', root).ontoggle = function () { if (this.open && !this.dataset.done) { this.dataset.done = 1; C.covOpen($('#tCov', root)); } };
      $('#tRail', root).onclick = function (e) { var b = e.target.closest('[data-c]'); if (!b) return; TST.sel = b.dataset.c; markRail(); inspect(); TST.pane.show(TST.sel, TS.project); };
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
      var issues = 0, h = '<button type="button" data-c="awakening" class="ri' + (TST.sel === 'awakening' ? ' on' : '') + '"><span>🎬</span><b>일주 각성 영상</b></button>', act = 0;
      rep.chapters.forEach(function (c) {
        if (c.act !== act) { act = c.act; var a = rep.acts.filter(function (x) { return x.id === act; })[0] || {}; h += '<div class="ract">' + esc(a.roman || '') + ' · ' + esc(a.title || '') + '</div>'; }
        var fb = c.modules[0] && /_fallback$/.test(c.modules[0]), nm = c.scenes.filter(function (s) { return !s.media && R.Scenes.SCENE_RULES[s.sceneType].media; }).length; if (fb) issues++;
        h += '<button type="button" data-c="' + esc(c.id) + '" class="ri' + (c.id === TST.sel ? ' on' : '') + '"><span>' + String(c.no).padStart(2, '0') + '</span><b>' + esc(c.title) + '</b>' + (fb ? '<i class="pill w" title="조건 있는 모듈이 없어 기본 안내만 나옵니다">기본안내</i>' : '') + (nm ? '<i class="pill" title="미디어가 없어 자리표시 장면이 나오는 장면 수">미디어 ' + nm + '</i>' : '') + '</button>';
      });
      rail.innerHTML = h; $('#tIssues').innerHTML = issues ? '<span class="pill w">기본 안내만 ' + issues + '개</span>' : '<span class="pill">모두 정상</span>';
      if (!rep.chapters.some(function (c) { return c.id === TST.sel; }) && TST.sel !== 'awakening') TST.sel = rep.chapters[0].id;
      inspect(); TST.pane.show(TST.sel, TS.project);
    }).catch(function (e) { rail.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  // 오른쪽 "선택 근거" 패널
  function inspect() {
    var box = $('#tInsp'), rep = TST.rep, sd = TST.sd; if (!rep) return;
    if (TST.sel === 'awakening') {
      awakeningFor(sd).then(function (a) { var pk = a.pick; box.innerHTML = '<b>일주 각성 영상</b><p class="muted">' + (pk.fallback ? '<span style="color:#FF9C8C">' + esc(pk.key) + ' 영상이 아직 없습니다 → ' + (pk.clip ? 'fallback 영상으로 진행' : 'fallback 도 없어 문구·정지 화면으로 진행') + '</span>' : '<span style="color:#7FE0BC">' + esc(pk.key) + ' 영상이 연결되어 있습니다.</span> ' + esc(pk.clip.title || '')) + '</p><div class="row"><button type="button" id="goAwk">각성 영상 등록하러 가기</button></div>'; $('#goAwk', box).onclick = function () { gotoTab('v2clip'); var b = $('#clNav button[data-k=awk]'); if (b) b.click(); }; });
      return;
    }
    var c = rep.chapters.filter(function (x) { return x.id === TST.sel; })[0]; if (!c) { box.innerHTML = ''; return; }
    var fb = c.modules[0] && /_fallback$/.test(c.modules[0]);
    var h = '<b>' + String(c.no).padStart(2, '0') + ' ' + esc(c.title) + '</b><p class="muted" style="margin:4px 0 8px">FACT · ' + esc(c.fact) + '</p>' + (fb ? '<p class="pill w" style="display:inline-block;margin:0 0 8px">조건 있는 모듈이 없어 기본 안내만 표시됩니다</p>' : '');
    h += '<div class="cap2">선택된 모듈</div>' + ((c.lead && c.lead.id) ? [c.lead].concat(c.details || []).map(function (m) { return '<div class="mrow"><div><b>' + esc(m.headline || m.id) + '</b><small>' + esc(m.id) + '</small>' + (TS.dbg && m.why && m.why.length ? '<div class="why">' + m.why.map(function (w) { return '<span class="' + (/✓/.test(w) ? 'hit' : 'miss') + '">' + esc(w) + '</span>'; }).join('') + '</div>' : (TS.dbg ? '<div class="why muted">조건 없음(항상 후보)</div>' : '')) + '</div><button type="button" data-edit="' + esc(c.id) + '" data-mod="' + esc(m.id) + '">수정</button></div>'; }).join('') : '<p class="muted">없음</p>');
    h += '<div class="cap2">장면 · 미디어</div>' + c.scenes.map(function (s) {
      var need = R.Scenes.SCENE_RULES[s.sceneType].media;
      return '<div class="srow">' + (s.media ? thumb(s.media) : '<span class="thm" style="display:grid;place-items:center;color:var(--ink3);font-size:.7rem">' + (need ? '없음' : 'CSS') + '</span>') + '<div><b>' + esc(s.sceneType) + '</b> <span class="muted">' + esc(s.effect.type) + '</span>' + (s.media ? '<div class="muted">' + esc(s.media.assetId) + ' · ' + esc(s.media.type) + ' · 점수 ' + s.media.score + '</div>' + (TS.dbg ? '<div class="why">' + s.media.why.map(function (w) { return '<span class="hit">' + esc(w.label) + (w.v > 0 ? '+' : '') + w.v + '</span>'; }).join('') + '</div>' : '') : need ? '<div style="color:#FFC080;font-size:.78rem">후보 없음 → 자리표시 장면</div>' : '<div class="muted" style="font-size:.78rem">데이터 장면(미디어 없이 표시)</div>') + '</div></div>';
    }).join('');
    h += '<div class="row" style="margin-top:10px"><button type="button" data-edit="' + esc(c.id) + '">이 챕터 편집 →</button></div>';
    box.innerHTML = h;
  }

  /* ═════ ④ 프로젝트 ═════ */
  var PJ = { list: null, sel: 'full', dirty: false };
  function projOpen() {
    var root = $('#t-v2proj'); C.load().then(function () { if (!PJ.list) PJ.list = R.Chapters.projects(ST.saved); projDraw(); });
  }
  function projStatus(p) {
    var chs = p.chapters ? p.chapters.map(function (x) { return chapterById(x.id); }).filter(Boolean) : chaptersAll().filter(function (c) { return c.enabled !== false; });
    var empty = chs.filter(function (c) { return c.kind !== 'remedy' && c.kind !== 'summary' && coverageOf(c) === 0; });
    return { n: chs.length, empty: empty };
  }
  function projDraw() {
    var root = $('#t-v2proj'), L = PJ.list, p = L.filter(function (x) { return x.id === PJ.sel; })[0] || L[0]; PJ.sel = p.id;
    root.innerHTML = '<div class="cols"><div class="card"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><b style="color:var(--gold)">프로젝트</b><span style="flex:1"></span><button type="button" id="pjAdd">+ 새 프로젝트</button><button class="pri" type="button" id="pjSave"' + (PJ.dirty ? '' : ' disabled') + '>저장</button></div>' +
      L.map(function (x) { var s = projStatus(x); return '<div class="pjc' + (x.id === p.id ? ' on' : '') + (x.enabled === false ? ' off' : '') + '" data-id="' + esc(x.id) + '"><b>' + esc(x.name) + '</b>' + (x.enabled === false ? ' <span class="pill">비활성</span>' : '') + '<small>' + esc(x.desc || '') + '</small><div class="stat"><span>챕터 <b>' + s.n + '</b></span><span>ACT <b>' + (x.acts ? x.acts.length : 4) + '</b></span>' + (s.empty.length ? '<span class="pill w">비어 있을 수 있음 ' + s.empty.length + '</span>' : '<span class="pill">이상 없음</span>') + '</div></div>'; }).join('') + '</div><div id="pjEd"></div></div>';
    $('.cols > .card', root).onclick = function (e) { var c = e.target.closest('.pjc'); if (c) { PJ.sel = c.dataset.id; projDraw(); } };
    $('#pjAdd', root).onclick = function () { var id = prompt('새 프로젝트 id (영문 소문자·숫자, 예: career)'); if (!id) return; id = id.trim().toLowerCase(); if (!/^[a-z0-9_-]{1,30}$/.test(id) || L.some(function (x) { return x.id === id; })) return toast('쓸 수 없거나 이미 있는 id 입니다', true);
      L.push({ id: id, name: '새 프로젝트', desc: '', enabled: true, accessLevel: 'free', requiredCompletionRate: null, acts: clone(R.Chapters.ACTS).map(function (a) { return { title: a.title, line: a.line, pdfDone: a.pdfDone }; }), chapters: chaptersAll().filter(function (c) { return c.enabled !== false; }).map(function (c) { return { id: c.id, act: c.act }; }) }); PJ.sel = id; PJ.dirty = true; projDraw(); };
    $('#pjSave', root).onclick = function () { this.disabled = true; var part = { projects: L }; C.save(part).then(function () { ST.saved.projects = clone(L); W.projects = null; PJ.dirty = false; projDraw(); }).catch(function (e) { toast(e.message, true); projDraw(); }); };
    projEditor(p);
  }
  function projEditor(p) {
    var box = $('#pjEd'), isFull = p.id === 'full', custom = !!p.chapters, acts = p.acts || (isFull ? clone(R.Chapters.ACTS).map(function (a) { return { title: a.title, line: a.line, pdfDone: a.pdfDone }; }) : []), url = '/report/v2/?project=' + encodeURIComponent(p.id), st = projStatus(p);
    if (!p.acts && isFull) p.acts = acts;
    var sel = {}; (p.chapters || []).forEach(function (x, i) { sel[x.id] = { act: x.act, i: i }; });
    var order = custom ? p.chapters.map(function (x) { return chapterById(x.id); }).filter(Boolean).concat(chaptersAll().filter(function (c) { return !sel[c.id]; })) : chaptersAll();
    box.innerHTML = '<div class="card"><div class="stat"><span>챕터 <b>' + st.n + '</b></span><span>주소 <b>' + esc(url) + '</b></span>' + (st.empty.length ? '<span class="pill w">비어 있을 수 있음: ' + esc(st.empty.map(function (c) { return c.title; }).join(', ')) + '</span>' : '') + '</div>' +
      '<div class="row"><button type="button" id="pjTest">조합 테스트로 보기</button><button type="button" id="pjOpen">뷰어 열기 ↗</button><button type="button" id="pjCopy">주소 복사</button></div>' +
      '<div class="g2c"><div class="fld"><label>이름</label><input type="text" data-p="name" value="' + esc(p.name) + '"></div><div class="fld"><label>접근 (accessLevel)</label><select data-p="accessLevel"><option value="free"' + (p.accessLevel !== 'premium' ? ' selected' : '') + '>free</option><option value="premium"' + (p.accessLevel === 'premium' ? ' selected' : '') + '>premium</option></select></div></div>' +
      '<div class="fld"><label>설명</label><input type="text" data-p="desc" value="' + esc(p.desc || '') + '"></div><div class="g2c"><div class="fld"><label>PDF 해금 완독률 (0~1, 챕터 방문 기준 · 비우면 마지막 챕터 도달)</label><input type="number" min="0" max="1" step="0.05" data-p="requiredCompletionRate" value="' + (p.requiredCompletionRate == null ? '' : p.requiredCompletionRate) + '"></div><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-p="enabled"' + (p.enabled !== false ? ' checked' : '') + '>사용(공개)</label></div>' +
      '<h4 style="margin:14px 0 4px;color:var(--gold)">ACT 구성</h4>' + (isFull && !custom ? '<p class="muted">종합 운세는 챕터 관리의 ACT 번호를 따릅니다. 아래는 ACT 전환 화면 문구입니다.</p>' : '') + acts.map(function (a, i) { return '<div class="g2c" data-act="' + i + '" style="margin-bottom:6px"><div class="fld"><label>ACT ' + (i + 1) + ' 제목</label><input type="text" data-a="title" value="' + esc(a.title) + '"></div><div class="fld"><label>전환 문구</label><textarea data-a="line" style="min-height:42px">' + esc(a.line) + '</textarea></div><div class="fld" style="grid-column:1/-1"><label>완료 시 PDF 진행 안내</label><input type="text" data-a="pdfDone" value="' + esc(a.pdfDone) + '"></div></div>'; }).join('') + (isFull && !custom ? '' : '<div class="row"><button type="button" id="aAdd">+ ACT 추가</button><button type="button" id="aDel"' + (acts.length <= 1 ? ' disabled' : '') + '>마지막 ACT 삭제</button></div>') +
      '<h4 style="margin:14px 0 4px;color:var(--gold)">챕터 구성</h4>' + (isFull ? '<label style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><input type="checkbox" id="pjAll"' + (custom ? '' : ' checked') + '>켜져 있는 챕터를 모두 사용 (기본)</label>' : '') +
      (custom || !isFull ? '<div>' + order.map(function (c, i) { var on = !!sel[c.id]; return '<div class="pick" data-c="' + esc(c.id) + '"><input type="checkbox" data-sel' + (on ? ' checked' : '') + ' aria-label="포함"><span>' + (on ? sel[c.id].i + 1 : '·') + '</span><span>' + esc(c.title) + (c.enabled === false ? ' <span class="pill">꺼짐</span>' : '') + '</span><select data-act' + (on ? '' : ' disabled') + '>' + acts.map(function (a, k) { return '<option value="' + (k + 1) + '"' + ((on ? sel[c.id].act : 1) === k + 1 ? ' selected' : '') + '>ACT ' + (k + 1) + '</option>'; }).join('') + '</select><span><button type="button" data-mv="-1" aria-label="위로">▲</button><button type="button" data-mv="1" aria-label="아래로">▼</button></span></div>'; }).join('') + '</div>' : '') +
      (!isFull ? '<div class="row" style="margin-top:12px"><button type="button" class="danger" id="pjDel"' + (R.Chapters.PROJECTS.some(function (x) { return x.id === p.id; }) ? ' disabled title="기본 프로젝트는 삭제할 수 없고 끌 수 있습니다"' : '') + '>프로젝트 삭제</button></div>' : '') + '</div>';
    var dirty = function () { PJ.dirty = true; W.projects = PJ.list; $('#pjSave').disabled = false; };
    box.oninput = box.onchange = function (e) {
      var t = e.target, k = t.dataset && t.dataset.p, ar = t.closest('[data-act]');
      if (k) { p[k] = t.type === 'checkbox' ? t.checked : k === 'requiredCompletionRate' ? (t.value === '' ? null : +t.value) : t.value; dirty(); return; }
      if (ar && t.dataset.a) { p.acts[+ar.dataset.act][t.dataset.a] = t.value; dirty(); return; }
      if (t.id === 'pjAll') { if (t.checked) p.chapters = null; else p.chapters = chaptersAll().filter(function (c) { return c.enabled !== false; }).map(function (c) { return { id: c.id, act: c.act }; }); dirty(); projDraw(); return; }
      var row = t.closest('.pick'); if (!row) return; var id = row.dataset.c;
      if (t.matches('[data-sel]')) { if (t.checked) p.chapters.push({ id: id, act: 1 }); else p.chapters = p.chapters.filter(function (x) { return x.id !== id; }); dirty(); projDraw(); }
      else if (t.matches('select[data-act]')) { p.chapters.filter(function (x) { return x.id === id; })[0].act = +t.value; dirty(); }
    };
    box.onclick = function (e) {
      var mv = e.target.closest('[data-mv]'); if (mv) { var id = mv.closest('.pick').dataset.c, i = p.chapters.findIndex(function (x) { return x.id === id; }), j = i + +mv.dataset.mv; if (i >= 0 && j >= 0 && j < p.chapters.length) { var t = p.chapters[i]; p.chapters[i] = p.chapters[j]; p.chapters[j] = t; dirty(); projDraw(); } return; }
      if (e.target.id === 'aAdd') { p.acts = p.acts || acts; p.acts.push({ title: '새 ACT', line: '', pdfDone: '' }); dirty(); projDraw(); }
      if (e.target.id === 'aDel') { p.acts.pop(); (p.chapters || []).forEach(function (x) { if (x.act > p.acts.length) x.act = p.acts.length; }); dirty(); projDraw(); }
      if (e.target.id === 'pjDel' && confirm('프로젝트를 삭제할까요?')) { PJ.list = PJ.list.filter(function (x) { return x !== p; }); PJ.sel = 'full'; dirty(); projDraw(); }
    };
    $('#pjTest', box).onclick = function () { TS.project = p.id; saveTS(); built.test = built.test; gotoTab('v2test'); setTimeout(function () { var s = $('#tP'); if (s) s.value = p.id; }, 50); };
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
