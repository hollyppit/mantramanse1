/* 관리자 "온보딩" — 연구·유명인 사례(검증 상태·가중치) · 명리학 소개 3장면 · 무협 슬라이드 툰 장면 · 호칭 · 단계별 통계.
   저장은 /api/onboarding (KV 'free:onboard'). 기본 문구·사례는 report/hub/onboard-data.js — 여기서 바꾼 값이 그 위에 덮어쓰기로만 저장된다.
   입력 종류(이름·날짜·시각·지역·성별·확인)와 계산 연결은 코드가 고정한다: 장면을 끄거나 입력 종류를 바꿀 수 없다.
   index.html 의 showTab 이 V2Onboard.open('onboard', 비밀번호) 를 부른다. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, O = window.Onboard;
  var PANE = null, $ = function (s, e) { return (e || PANE).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || PANE).querySelectorAll(s)); };
  var G = { cfg: null, sub: 'cases', sel: null, stats: null, version: '' };
  var ST = { draft: '초안', review: '검토 중', verified: '검증 완료', published: '공개' }, TY = { research: '실제 연구', celebrity: '유명인 사례' };
  var REQ = O.REQUIRED_FIELDS;
  var lines = function (s) { return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };

  var css = document.createElement('style');
  css.textContent = '.ob-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}.ob-chip{border-radius:999px;padding:4px 12px;font-size:.82rem}.ob-chip.on{border-color:var(--gold);color:var(--gold)}' +
    '.ob-row{padding:8px 10px;border:1px solid var(--line);border-radius:8px;margin:4px 0;cursor:pointer;font-size:.84rem;display:grid;gap:2px}.ob-row.on{border-color:var(--gold)}.ob-row small{color:var(--ink3)}' +
    '.ob-st{font-size:.7rem;padding:0 8px;border-radius:999px;border:1px solid var(--line);margin-left:6px}.ob-st.published{border-color:#2f7a52;color:#7FE0BC}.ob-st.review,.ob-st.draft{color:#e0b36a}' +
    '.ob-f{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:9px 0}.ob-f textarea{min-height:80px}.ob-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:700px){.ob-g2{grid-template-columns:1fr}}' +
    '.ob-t{width:100%;border-collapse:collapse;font-size:.82rem}.ob-t th,.ob-t td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left}.ob-lock{font-size:.74rem;color:var(--ink3)}';
  document.head.appendChild(css);

  function load() {
    return C.api('/api/onboarding').then(function (d) {
      var base = O.merge(O.DEFAULTS, d.config || null); G.cfg = base; G.version = d.version || '';
      // 관리자 응답에는 초안·검토 중 사례까지 들어 있다. 서버 저장본이 없으면 기본 사례(검토 중 포함) 전부를 보여 준다.
      if (!G.sel && base.cases.length) G.sel = base.cases[0].id;
    });
  }
  // also === 'home' 이면 기존 랜딩 첫 화면 편집기(t-home)가 이 탭 아래에 함께 보인다. 이때는 다시 불러오지 않는다(입력 중인 값 유지).
  function open(tab, pw, also) {
    C.setPw && C.setPw(pw); PANE = document.getElementById('t-onboard');
    if (also === 'home') { G.sub = 'landing'; if (G.cfg) return draw(); }
    PANE.innerHTML = '<p class="muted">불러오는 중…</p>'; load().then(draw).catch(function (e) { PANE.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  function draw() {
    PANE.innerHTML = '<div class="card"><div class="ob-bar">' + [['cases', '후킹 사례'], ['intro', '명리학 소개'], ['scenes', '슬라이드 툰'], ['basic', '호칭·가중치'], ['stats', '통계'], ['landing', '랜딩 첫 화면']].map(function (s) { return '<button class="ob-chip' + (G.sub === s[0] ? ' on' : '') + '" data-s="' + s[0] + '">' + s[1] + '</button>'; }).join('') +
      '<span style="flex:1"></span>' + (G.sub === 'landing' ? '' : '<button id="obSave">저장</button>') + '</div><p class="muted" style="margin:0">' + (G.sub === 'landing' ? '아래는 방문자가 처음 만나는 랜딩 페이지(/report/)의 편집기입니다. 저장은 아래 편집기의 저장 버튼을 쓰세요. 사례·슬라이드 툰 같은 온보딩 흐름은 위 탭에서 편집합니다.' : '저장하면 방문자 화면에 바로 반영됩니다. 공개(published) 상태이면서 출처가 있는 사례만 방문자에게 보입니다. <span class="ob-lock">버전 ' + esc(G.version || '기본값') + '</span>') + '</p></div><div id="obBody"></div>';
    $$('[data-s]').forEach(function (b) { b.onclick = function () {
      collect(); var from = G.sub; G.sub = b.dataset.s;
      if (G.sub === 'landing') window.AdminShowTab('onboard', 'home'); // 기존 랜딩 편집기를 이 탭 아래에 함께 보인다
      else if (from === 'landing') window.AdminShowTab('onboard'); // 랜딩 편집기를 닫고 이 탭만 보인다
      else draw();
    }; });
    if ($('#obSave')) $('#obSave').onclick = save;
    var view = ({ cases: casesView, intro: introView, scenes: scenesView, basic: basicView, stats: statsView })[G.sub]; if (view) view(); else $('#obBody').innerHTML = '';
  }
  function save() {
    collect();
    var b = G.cfg, body = { forceOnboarding: b.forceOnboarding, honorific: b.honorific, weights: b.weights, cases: b.cases, intro: b.intro, introLast: b.introLast, bridge: b.bridge, scenes: b.scenes.map(function (s) { return { id: s.id, title: s.title, lines: s.lines, unknownLines: s.unknownLines || [], hint: s.hint, button: s.button, face: s.face, image: s.image || '', bg: s.bg || '', enabled: s.enabled }; }), revealLines: b.revealLines };
    C.api('/api/onboarding', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (d) { G.version = d.version; toast('저장했습니다'); return load(); }).then(draw).catch(function (e) { toast(e.message, true); });
  }
  // 현재 화면의 입력값을 G.cfg 로 옮긴다
  function collect() {
    if (!G.cfg || !$('#obBody')) return;
    var cfg = G.cfg;
    if (G.sub === 'cases' && G.sel) {
      var c = cfg.cases.filter(function (x) { return x.id === G.sel; })[0], f = $('#obCase'); if (c && f) {
        var v = function (n) { return f.elements[n] ? f.elements[n].value : ''; };
        c.title = v('title').trim(); c.hook = v('hook').trim(); c.story = lines(v('story')); c.takeaway = v('takeaway').trim(); c.type = v('type'); c.status = v('status'); c.body = lines(v('body')); c.caveat = v('caveat').trim(); c.who = v('who').trim(); c.year = +v('year') || 0;
        c.tags = v('tags').split(',').map(function (x) { return x.trim(); }).filter(Boolean); c.weight = +v('weight') || 1; c.image = v('image').trim(); c.visual = c.visual || 'bell';
        c.source = { label: v('slabel').trim(), doi: v('doi').trim(), url: v('url').trim() }; c.verifiedNote = v('vnote').trim();
      }
    }
    if (G.sub === 'intro') cfg.intro.forEach(function (s, i) { var f = $('#obI' + i); if (!f) return; var v = function (n) { return f.elements[n].value; }; s.title = v('title').trim(); s.body = v('body').trim(); s.sub = v('sub').trim(); s.image = v('image').trim(); s.video = v('video').trim(); s.enabled = f.elements.enabled.checked; });
    if (G.sub === 'intro' && $('#obLast')) { var l = $('#obLast'); cfg.introLast = { line: l.elements.line.value.trim(), cta: l.elements.cta.value.trim() }; }
    if (G.sub === 'scenes') {
      cfg.scenes.forEach(function (s, i) { var f = $('#obS' + i); if (!f) return; var v = function (n) { return f.elements[n].value; }; s.title = v('title').trim(); s.lines = lines(v('lines')); s.unknownLines = f.elements.unk ? lines(v('unk')) : s.unknownLines; s.hint = v('hint').trim(); s.button = v('button').trim() || '다음'; s.face = v('face'); s.image = v('image').trim(); s.bg = v('bg').trim(); s.enabled = REQ.indexOf(s.field) >= 0 ? true : f.elements.enabled.checked; });
      var r = $('#obReveal'); if (r) cfg.revealLines = lines(r.value);
    }
    if (G.sub === 'basic') { var b = $('#obBasic'); if (b) { var h = b.elements.honorific.value.trim(); cfg.honorific = O.honorific({ honorific: h }); cfg.forceOnboarding = !!b.elements.force.checked; cfg.bridge = { toCelebrity: b.elements.bc.value.trim(), toIntro: b.elements.bi.value.trim() }; cfg.weights = { research: +b.elements.wr.value || 0, celebrity: +b.elements.wc.value || 0 }; if (cfg.weights.research + cfg.weights.celebrity <= 0) cfg.weights = { research: 60, celebrity: 40 }; } }
  }

  /* ── 사례 ── */
  function casesView() {
    var cfg = G.cfg, c = cfg.cases.filter(function (x) { return x.id === G.sel; })[0], st = G.stats && G.stats.byCase || {};
    var list = cfg.cases.map(function (x) { var s = st[x.id] || {}; return '<div class="ob-row' + (x.id === G.sel ? ' on' : '') + '" data-id="' + esc(x.id) + '"><b>' + esc(x.title) + '<span class="ob-st ' + x.status + '">' + ST[x.status] + '</span></b><small>' + TY[x.type] + (x.who ? ' · ' + esc(x.who) : '') + (s.onboarding_card_impression ? ' · 노출 ' + s.onboarding_card_impression : '') + '</small></div>'; }).join('');
    $('#obBody').innerHTML = '<div class="v2split"><div class="card"><div class="ob-bar"><button id="obAdd">+ 사례 추가</button></div><div class="v2list">' + (list || '<p class="muted">사례가 없습니다.</p>') + '</div></div><div class="card">' + (c ? caseForm(c) : '<p class="muted">사례를 선택하세요.</p>') + '</div></div>';
    $$('.ob-row').forEach(function (r) { r.onclick = function () { collect(); G.sel = r.dataset.id; casesView(); }; });
    $('#obAdd').onclick = function () { collect(); var id = 'n-' + Date.now().toString(36); cfg.cases.push({ id: id, type: 'research', status: 'draft', weight: 1, title: '새 사례', hook: '', body: ['첫 문장'], caveat: '', who: '', year: new Date().getFullYear(), tags: [], source: { label: '', doi: '', url: '' }, verifiedNote: '', image: '', visual: 'bell' }); G.sel = id; casesView(); };
    var del = $('#obDel'); if (del) del.onclick = function () { if (!confirm('이 사례를 삭제할까요? (저장 전까지는 되돌릴 수 있습니다)')) return; cfg.cases = cfg.cases.filter(function (x) { return x.id !== G.sel; }); G.sel = cfg.cases[0] && cfg.cases[0].id; casesView(); };
    var up = $('#obUp'); if (up) up.onchange = function () { upload(this.files[0], 'onb-case-').then(function (u) { $('#obCase').elements.image.value = u; toast('올렸습니다 — 저장을 눌러 반영하세요'); }).catch(function (e) { toast(e.message, true); }); };
  }
  function caseForm(c) {
    var s = c.source || {}, sel = function (m, cur) { return Object.keys(m).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + m[k] + '</option>'; }).join(''); };
    var ok = !!(s.doi || s.url);
    return '<form id="obCase" onsubmit="return false"><div class="ob-g2"><label class="ob-f">유형<select name="type">' + sel(TY, c.type) + '</select></label><label class="ob-f">검증 상태 (초안 → 검토 중 → 검증 완료 → 공개)<select name="status">' + sel(ST, c.status) + '</select></label></div>' +
      (c.status === 'published' && !ok ? '<p class="err">출처(DOI 또는 URL)가 없어 저장 시 "검증 완료"로 내려갑니다.</p>' : '') +
      '<label class="ob-f">제목<input type="text" name="title" maxlength="120" value="' + esc(c.title) + '"></label><label class="ob-f">후킹 문구<input type="text" name="hook" maxlength="160" value="' + esc(c.hook) + '"></label>' +
      '<label class="ob-f">이야기 (한 줄 = 한 문단, 문단당 2문장 이내 · 확인된 사실만)<textarea name="story" style="min-height:190px">' + esc((c.story || []).join('\n')) + '</textarea></label>' +
      '<label class="ob-f">이야기가 남기는 한 줄<input type="text" name="takeaway" value="' + esc(c.takeaway || '') + '"></label>' +
      '<label class="ob-f">핵심 요약 (이야기가 없을 때만 대신 노출)<textarea name="body">' + esc((c.body || []).join('\n')) + '</textarea></label>' +
      '<label class="ob-f">한계·주의 문구 (연구는 필수)<textarea name="caveat" style="min-height:52px">' + esc(c.caveat || '') + '</textarea></label>' +
      '<div class="ob-g2"><label class="ob-f">연구자 또는 인물<input type="text" name="who" value="' + esc(c.who || '') + '"></label><label class="ob-f">연도<input type="text" name="year" type="number" value="' + esc(c.year || '') + '"></label></div>' +
      '<div class="ob-g2"><label class="ob-f">출처 이름<input type="text" name="slabel" value="' + esc(s.label || '') + '"></label><label class="ob-f">DOI<input type="text" name="doi" value="' + esc(s.doi || '') + '" placeholder="10.xxxx/…"></label></div>' +
      '<label class="ob-f">출처 URL (https)<input type="text" name="url" value="' + esc(s.url || '') + '"></label><label class="ob-f">검증 기록 (확인한 날짜·방법)<input type="text" name="vnote" value="' + esc(c.verifiedNote || '') + '"></label>' +
      '<div class="ob-g2"><label class="ob-f">관심사 태그 (쉼표)<input type="text" name="tags" value="' + esc((c.tags || []).join(', ')) + '"></label><label class="ob-f">노출 가중치 (0.1~10, 같은 유형 안에서)<input type="text" name="weight" type="number" step="0.1" min="0.1" max="10" value="' + esc(c.weight || 1) + '"></label></div>' +
      '<label class="ob-f">이미지 주소 (비워 두면 도형 시각 자료)<input type="text" name="image" value="' + esc(c.image || '') + '"></label><label class="ob-f">이미지 올리기 <input type="file" id="obUp" accept="image/*"></label>' +
      '<p class="ob-lock">id: ' + esc(c.id) + ' · 이미지는 사용 권한이 확인된 것만 올려 주세요. 인물 사진은 적법하게 사용 가능한 이미지 또는 상징 이미지를 쓰세요.</p><div class="ob-bar"><button id="obDel" class="ghost">이 사례 삭제</button></div></form>';
  }
  function upload(file, pre) {
    if (!file) return Promise.reject(new Error('파일을 선택하세요'));
    if (!/^image[/]/.test(file.type) && !/^video[/]/.test(file.type)) return Promise.reject(new Error('이미지 또는 영상 파일만 올릴 수 있습니다'));
    if (file.size > 25 * 1024 * 1024) return Promise.reject(new Error('25MB 이하만 올릴 수 있습니다'));
    return C.api('/api/clipfile?name=' + encodeURIComponent(pre + file.name), { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file }).then(function (d) { if (!d.key) throw new Error('업로드 실패'); return '/api/clipfile?k=' + d.key; });
  }

  /* ── 명리학 소개 ── */
  function introView() {
    var cfg = G.cfg;
    $('#obBody').innerHTML = cfg.intro.map(function (s, i) { return '<div class="card"><h3 style="font-size:1rem">장면 ' + (i + 1) + ' · ' + esc(s.id) + '</h3><form id="obI' + i + '" onsubmit="return false">' +
      '<label class="ob-f">제목<input type="text" name="title" value="' + esc(s.title) + '"></label><label class="ob-f">본문<textarea name="body">' + esc(s.body) + '</textarea></label><label class="ob-f">보조 문구<input type="text" name="sub" value="' + esc(s.sub || '') + '"></label>' +
      '<div class="ob-g2"><label class="ob-f">이미지 주소<input type="text" name="image" value="' + esc(s.image || '') + '"></label><label class="ob-f">영상 주소 (mp4)<input type="text" name="video" value="' + esc(s.video || '') + '"></label></div>' +
      '<label class="ob-f" style="grid-auto-flow:column;justify-content:start;gap:8px"><input type="checkbox" name="enabled"' + (s.enabled !== false ? ' checked' : '') + '> 노출</label></form></div>'; }).join('') +
      '<div class="card"><h3 style="font-size:1rem">마지막 문구·버튼</h3><form id="obLast" onsubmit="return false"><label class="ob-f">문구<input type="text" name="line" value="' + esc(cfg.introLast.line) + '"></label><label class="ob-f">버튼<input type="text" name="cta" value="' + esc(cfg.introLast.cta) + '"></label></form>' +
      '<p class="ob-lock">장면 순서는 사주팔자 소개 흐름(시간 → 네 기둥 → 두 해석)에 맞춰 고정되어 있습니다. 노출을 끄면 해당 장면만 건너뜁니다.</p></div>';
  }

  /* ── 슬라이드 툰 ── */
  function scenesView() {
    var cfg = G.cfg, FACES = O.FACES;
    var fo = function (cur) { return Object.keys(FACES).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + FACES[k] + '</option>'; }).join(''); };
    $('#obBody').innerHTML = cfg.scenes.map(function (s, i) {
      var req = REQ.indexOf(s.field) >= 0;
      return '<div class="card"><h3 style="font-size:1rem">' + (i + 1) + '. ' + esc(s.title) + ' <span class="ob-lock">입력: ' + esc(s.field) + (req ? ' · 필수(끌 수 없음, 계산 연결 고정)' : '') + '</span></h3><form id="obS' + i + '" onsubmit="return false">' +
        '<label class="ob-f">장면 제목<input type="text" name="title" value="' + esc(s.title) + '"></label>' +
        '<label class="ob-f">수련생 대사 (한 줄이 한 말풍선 문단 · {귀인} {이름귀인} 사용)<textarea name="lines">' + esc((s.lines || []).join('\n')) + '</textarea></label>' +
        (s.field === 'time' ? '<label class="ob-f">시각을 모를 때 대사<textarea name="unk" style="min-height:60px">' + esc((s.unknownLines || []).join('\n')) + '</textarea></label>' : '') +
        '<label class="ob-f">입력 안내 문구 (일반 한국어)<input type="text" name="hint" value="' + esc(s.hint || '') + '"></label>' +
        '<div class="ob-g2"><label class="ob-f">버튼 문구<input type="text" name="button" value="' + esc(s.button || '') + '"></label><label class="ob-f">캐릭터 표정<select name="face">' + fo(s.face) + '</select></label></div>' +
        '<div class="ob-g2"><label class="ob-f">캐릭터 이미지 주소<input type="text" name="image" value="' + esc(s.image || '') + '"></label><label class="ob-f">배경 이미지 주소<input type="text" name="bg" value="' + esc(s.bg || '') + '"></label></div>' +
        '<label class="ob-f" style="grid-auto-flow:column;justify-content:start;gap:8px"><input type="checkbox" name="enabled"' + (s.enabled !== false || req ? ' checked' : '') + (req ? ' disabled' : '') + '> 사용</label></form></div>';
    }).join('') + '<div class="card"><h3 style="font-size:1rem">계산 완료 후 수련생 대사</h3><textarea id="obReveal" style="min-height:90px">' + esc((cfg.revealLines || []).join('\n')) + '</textarea>' +
      '<p class="ob-lock">장면 이동·진행률·입력 검증은 코드가 담당합니다. 금지 호칭(대공·소협·대협)을 넣어도 호칭 설정에서 \'귀인\'으로 되돌립니다.</p></div>';
  }

  /* ── 호칭·가중치 ── */
  function basicView() {
    var cfg = G.cfg;
    $('#obBody').innerHTML = '<div class="card"><form id="obBasic" onsubmit="return false"><label class="ob-f" style="grid-auto-flow:column;justify-content:start;gap:8px"><input type="checkbox" name="force"' + (cfg.forceOnboarding !== false ? ' checked' : '') + '> 개발 단계: 재방문자도 접속할 때마다(세션당 1회) 온보딩부터 보여 주기</label><p class="ob-lock">출시 전에 꺼 주세요. 끄면 프로필이 있는 방문자는 곧바로 홈으로 갑니다.</p><label class="ob-f">사용자 호칭 (모든 대사의 {귀인})<input type="text" name="honorific" maxlength="8" value="' + esc(cfg.honorific) + '"></label>' +
      '<p class="ob-lock">기본값은 \'귀인\'입니다. 성별에 따라 호칭을 나누지 않으며, 이름을 입력한 뒤에는 "[이름] 귀인"으로 부릅니다. \'대공·소협·대협\'은 저장되지 않습니다.</p>' +
      '<div class="ob-g2"><label class="ob-f">실제 연구 노출 가중치<input type="text" name="wr" type="number" min="0" max="100" value="' + esc(cfg.weights.research) + '"></label><label class="ob-f">유명인 사례 노출 가중치<input type="text" name="wc" type="number" min="0" max="100" value="' + esc(cfg.weights.celebrity) + '"></label></div>' +
      '<p class="ob-lock">온보딩은 "실제 연구 1건 → 실제 유명인 1건 → 명리학 소개" 순서로 고정입니다. 유형 가중치는 현재 쓰지 않고, 같은 유형 안에서는 사례별 가중치로 고릅니다. 공개 사례가 없는 유형은 건너뜁니다.</p>' +
      '<label class="ob-f">연구 → 유명인 연결 문장<textarea name="bc" style="min-height:60px">' + esc((cfg.bridge && cfg.bridge.toCelebrity) || '') + '</textarea></label><label class="ob-f">유명인 → 명리학 연결 문장<textarea name="bi" style="min-height:60px">' + esc((cfg.bridge && cfg.bridge.toIntro) || '') + '</textarea></label></form></div>';
  }

  /* ── 통계 ── */
  function statsView() {
    $('#obBody').innerHTML = '<div class="card"><p class="muted">불러오는 중…</p></div>';
    C.api('/api/onboarding?stats=1').then(function (d) {
      var s = d.stats || { total: {}, byCase: {} }, t = s.total || {}, pc = function (a, b) { return b ? Math.round(a / b * 1000) / 10 + '%' : '-'; };
      var steps = [['onboarding_view', '온보딩 진입'], ['onboarding_intro_complete', '명리학 소개 완료'], ['onboarding_cta_click', 'CTA 클릭'], ['birth_input_start', '입력 시작'], ['birth_input_step_complete', '단계 완료(합계)'], ['birth_input_complete', '입력 완료'], ['calculation_success', '계산 성공'], ['calculation_failure', '계산 실패'], ['home_view', '홈 진입'], ['tarot_start', '타로 시작'], ['ilju_video_play', '일주 보기'], ['calendar_open', '캘린더 열기'], ['movingtoon_preview_start', '무빙툰 진입'], ['movingtoon_purchase_click', '구매 클릭']];
      var v = t.onboarding_view || 0;
      var caseRows = Object.keys(s.byCase || {}).map(function (id) { var c = s.byCase[id], cs = G.cfg.cases.filter(function (x) { return x.id === id; })[0]; return '<tr><td>' + esc(cs ? cs.title : id) + '</td><td>' + (c.onboarding_card_impression || 0) + '</td><td>' + (c.onboarding_next_story_click || 0) + '</td><td>' + pc(c.onboarding_next_story_click || 0, c.onboarding_card_impression || 0) + '</td><td>' + (c.onboarding_cta_click || 0) + '</td><td>' + pc(c.onboarding_cta_click || 0, c.onboarding_card_impression || 0) + '</td><td>' + (c.onboarding_source_click || 0) + '</td></tr>'; }).join('');
      $('#obBody').innerHTML = '<div class="card"><h3 style="font-size:1rem">단계별 건수</h3><table class="ob-t"><tr><th>단계</th><th>건수</th><th>온보딩 진입 대비</th></tr>' + steps.map(function (r) { return '<tr><td>' + r[1] + '</td><td>' + (t[r[0]] || 0) + '</td><td>' + (r[0] === 'onboarding_view' ? '-' : pc(t[r[0]] || 0, v)) + '</td></tr>'; }).join('') + '</table>' +
        '<p class="ob-lock">온보딩 이탈률 = 1 − CTA 클릭 ÷ 진입 · 입력 이탈률 = 1 − 입력 완료 ÷ 입력 시작 · 유료 전환율은 결제 시스템 연결 후 purchase_complete 로 집계합니다. 이름과 출생정보는 집계하지 않습니다.</p></div>' +
        '<div class="card"><h3 style="font-size:1rem">사례별 반응</h3><table class="ob-t"><tr><th>사례</th><th>노출</th><th>다음 이야기</th><th>클릭률</th><th>CTA</th><th>CTA율</th><th>출처 확인</th></tr>' + (caseRows || '<tr><td colspan="7" class="muted">아직 기록이 없습니다.</td></tr>') + '</table></div>';
    }).catch(function (e) { $('#obBody').innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p></div>'; });
  }

  window.V2Onboard = { open: open };
})();
