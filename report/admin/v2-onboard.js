/* 관리자 "온보딩" — 랜딩 아래로 이어지는 흐름(연구 카드 · 명리학 소개 · 서비스 소개 · 최종 CTA)과 출생정보 슬라이드 툰을 관리한다.
   · 방문자에게 보이는 것은 "공개본", 여기서 고치는 것은 "초안". [게시]를 눌러야 반영된다(/api/onboarding?action=publish). 이력 복원·공개 중지 지원.
   · 사례는 "검증 상태"와 "공개 여부"를 따로 관리한다. 검증 완료 + 검토 근거 + 출처가 있어야 공개를 켤 수 있다(서버도 같은 규칙으로 거른다).
   · 입력 종류(이름·날짜·시각·지역·성별·확인)와 계산 연결은 코드가 고정한다: 슬라이드 툰 장면을 끄거나 입력 종류를 바꿀 수 없다.
   · 기본 문구·사례는 report/hub/onboard-data.js — 여기서 바꾼 값이 그 위에 덮어쓰기로만 저장된다.
   index.html 의 showTab 이 V2Onboard.open('onboard', 비밀번호, also) 를 부른다. also === 'home' 이면 기존 랜딩 첫 화면(커버) 편집기가 함께 보인다. */
(function () {
  'use strict';
  var C = window.V2Content, esc = C.esc, toast = C.toast, O = window.Onboard;
  var PANE = null, $ = function (s, e) { return (e || PANE).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || PANE).querySelectorAll(s)); };
  var G = { cfg: null, sub: 'landing', sel: null, selTopic: null, selSvc: null, selSec: null, stats: null, version: '', liveVersion: '', hasDraft: false, dirty: false, draftAt: '', liveAt: '', hist: null, flt: { q: '', kind: '', vs: '', vis: '' }, prev: { on: false, dev: 'pc' }, period: 'all', dev: 'all' };
  var KINDS = O.KINDS, VST = O.VSTATE, REL = O.RELATION, DESIGNS = O.DESIGNS, EFFECTS = O.EFFECTS, NATURE = O.NATURE;
  var SECT = { research: '연구 카드', myeongri: '명리학 소개', service: '서비스 소개', story: '연구→유명인 후킹(예전)', final: '최종 CTA' };
  var REQ = O.REQUIRED_FIELDS;
  var lines = function (s) { return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
  var uid = function (p) { return p + '-' + Date.now().toString(36) + Math.floor(Math.random() * 36).toString(36); };
  var fmtT = function (iso) { if (!iso) return '-'; var d = new Date(iso); return isNaN(d) ? '-' : d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }); };
  var sel = function (map, cur, blank) { return (blank ? '<option value="">' + blank + '</option>' : '') + Object.keys(map).map(function (k) { return '<option value="' + esc(k) + '"' + (k === cur ? ' selected' : '') + '>' + esc(map[k]) + '</option>'; }).join(''); };
  var chk = function (n, v, label) { return '<label class="ob-f ob-ck"><input type="checkbox" name="' + n + '"' + (v ? ' checked' : '') + '> ' + label + '</label>'; };

  var css = document.createElement('style');
  css.textContent = '.ob-sty{margin:6px 0;border:1px dashed var(--line);border-radius:8px;padding:4px 10px}.ob-sty summary{cursor:pointer;font-size:.8rem;color:var(--ink2);padding:4px 0}.ob-sty-on{color:var(--gold);font-weight:500;margin-left:6px}.ob-sty-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:6px 0 8px;align-items:end}.ob-sty-g label{display:grid;gap:3px;font-size:.74rem;color:var(--ink3)}.ob-sty-c span{display:flex;gap:4px}.ob-sty-c input[type=color]{width:42px;padding:0;min-height:34px}' +
    '.ob-grp{min-width:150px;color:var(--gold);font-size:.84rem}.ob-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}.ob-chip{border-radius:999px;padding:4px 12px;font-size:.82rem}.ob-chip.on{border-color:var(--gold);color:var(--gold)}' +
    '.ob-row{padding:8px 10px;border:1px solid var(--line);border-radius:8px;margin:4px 0;cursor:pointer;font-size:.84rem;display:grid;gap:2px}.ob-row.on{border-color:var(--gold)}.ob-row small{color:var(--ink3)}' +
    '.ob-st{font-size:.7rem;padding:0 8px;border-radius:999px;border:1px solid var(--line);margin-left:6px;white-space:nowrap}.ob-st.ok{border-color:#2f7a52;color:#7FE0BC}.ob-st.warn{color:#e0b36a;border-color:#7a5f2f}.ob-st.bad{color:#FF9C8C;border-color:#7a3a2f}.ob-st.off{color:var(--ink3)}' +
    '.ob-f{display:grid;gap:3px;font-size:.8rem;color:var(--ink2);margin:9px 0}.ob-f textarea{min-height:80px}.ob-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:700px){.ob-g2{grid-template-columns:1fr}}' +
    '.ob-ck{grid-auto-flow:column;justify-content:start;gap:8px;align-items:center}.ob-req::after{content:" *";color:#FF9C8C}' +
    '.ob-t{width:100%;border-collapse:collapse;font-size:.82rem}.ob-t th,.ob-t td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left}.ob-lock{font-size:.74rem;color:var(--ink3)}' +
    '.ob-flow{display:flex;gap:6px;align-items:stretch;overflow-x:auto;padding:6px 0}.ob-node{min-width:132px;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:.78rem;background:var(--bg);display:grid;gap:4px;cursor:grab}' +
    '.ob-node.fixed{cursor:default;opacity:.85}.ob-node.on{border-color:var(--gold)}.ob-node.dis{opacity:.5}.ob-node.over{outline:2px dashed var(--gold)}.ob-node b{font-size:.84rem}.ob-arrow{align-self:center;color:var(--ink3)}' +
    '.ob-box{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:10px 0}.ob-box h4{margin:0 0 4px;font-size:.88rem;color:var(--gold)}.ob-warnbox{border-color:#7a5f2f;background:rgba(224,179,106,.06)}.ob-okbox{border-color:#2f7a52}' +
    '.ob-dirty{color:#e0b36a;font-size:.8rem}.ob-sstage{position:relative;height:230px;border-radius:10px;overflow:hidden;background:#0b0e18;border:1px solid var(--line);margin:6px 0 10px}.ob-sbg{position:absolute;inset:0;background:center/cover no-repeat;opacity:.92}.ob-sch{position:absolute;left:6%;bottom:0;height:90%;max-width:42%;object-fit:contain;display:none}.ob-sbub{position:absolute;right:5%;top:14%;width:48%;padding:10px 12px;border-radius:12px;background:rgba(10,12,20,.8);border:1px solid rgba(255,255,255,.16);color:#f4eede;font-size:.85rem;line-height:1.55}.ob-sph{position:absolute;left:8px;bottom:6px;background:rgba(0,0,0,.45);padding:1px 6px;border-radius:6px}.ob-prevbox{border:1px solid var(--line);border-radius:10px;padding:8px;margin:10px 0;text-align:center}.ob-prevbox iframe{border:0;background:#080A11;border-radius:8px;width:100%;height:640px}.ob-prevbox.mob iframe{width:390px;max-width:100%}' +
    '.ob-bars{display:grid;gap:4px}.ob-bar2{display:grid;grid-template-columns:150px 1fr 90px;gap:8px;align-items:center;font-size:.8rem}.ob-bar2 i{display:block;height:10px;background:var(--gold);border-radius:5px;min-width:1px}.ob-img{max-width:120px;max-height:70px;border-radius:6px;border:1px solid var(--line);margin-top:4px}';
  css.textContent += '.ob-workspace{display:grid;grid-template-columns:190px minmax(0,1fr);gap:16px;align-items:start}.ob-sidebar{position:sticky;top:12px;padding:12px!important}.ob-sidebar .ob-bar{display:grid;gap:5px;margin:0 0 16px}.ob-sidebar .ob-grp{min-width:0;padding:4px 8px}.ob-sidebar .ob-lock{display:none}.ob-sidebar .ob-chip{border-radius:7px;text-align:left;padding:9px 10px;width:100%}.ob-sidebar .ob-chip.on{background:rgba(205,178,122,.09)}.ob-main{min-width:0}.ob-toolbar{position:sticky;top:0;z-index:5;background:var(--panel);padding:10px 14px!important}.ob-toolbar .ob-bar{margin:0}.ob-toolbar p{font-size:.76rem;margin:6px 0 0}.ob-meta{margin-top:8px;font-size:.75rem}.ob-meta summary,.ob-flow-panel summary,.ob-advanced summary{cursor:pointer;color:var(--ink2);padding:8px 0}.ob-flow-panel{padding:10px 14px!important}.ob-flow-panel .ob-flow{flex-wrap:wrap;overflow:visible}.ob-flow-panel .ob-node{min-width:120px;flex:1 0 120px}.ob-flow-panel .ob-node>span:not(.ob-st),.ob-flow-panel .ob-node small{display:none}.ob-advanced{border-top:1px solid var(--line);margin-top:12px}.ob-editor-title{margin:14px 0;font-size:1.05rem;color:var(--gold)}@media(max-width:800px){.ob-workspace{grid-template-columns:1fr}.ob-sidebar{position:static}.ob-sidebar .ob-bar{display:flex;margin:0 0 8px}.ob-sidebar .ob-grp{width:100%}.ob-sidebar .ob-chip{width:auto}.ob-toolbar{position:static}}';
  document.head.appendChild(css);
  (window.AdminDirty = window.AdminDirty || {})['온보딩 초안'] = function () { return G.dirty; };
  window.addEventListener('beforeunload', function (e) { if (G.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ── 글자 스타일(문구마다 글씨체·크기·굵기·색) — 공통 도구는 report/hub/onboard-style.js ── */
  var STY_LABEL = { kicker: '위 작은 글씨', title: '제목', sub: '설명', notice: '안내 문구', bridge: '연결 문구', cta: '버튼 글자', body: '본문', hook: '후킹 문구', caveat: '한계 문구', source: '출처 줄', head: '큰 제목', desc: '설명', say: '안내자 대사', hint: '안내 문구(작은 글씨)', button: '버튼 글자' };
  function styBox(roles, map) {
    if (!window.ObStyle) return '';
    return '<div class="ob-box"><h4>글자 스타일 <span class="ob-lock">· 문구마다 글씨체·크기·굵기·색을 정합니다. 비워 두면 기본 디자인입니다. 크기는 PC와 모바일(720px 이하)을 따로 정할 수 있고, 글씨체는 고른 것만 불러옵니다.</span></h4>' + roles.map(function (r) { return window.ObStyle.row(r, STY_LABEL[r] || r, (map || {})[r]); }).join('') + '</div>';
  }
  function secRoles(s) { return s.type === 'research' ? ['kicker', 'title', 'sub', 'notice', 'bridge', 'cta'] : s.type === 'myeongri' ? ['kicker', 'title', 'sub', 'notice', 'cta'] : ['kicker', 'title', 'sub', 'cta']; }
  var CARD_ROLES = ['hook', 'title', 'body', 'caveat', 'source'];
  var readSty = function (f, roles) { return window.ObStyle && f ? window.ObStyle.readMap(f, roles) : {}; };

  /* ── 불러오기·저장·게시 ── */
  function load() {
    return Promise.all([C.api('/api/onboarding?draft=1'), C.api('/api/story')]).then(function (data) {
      var d = data[0]; G.coverStory = data[1].story || {};
      G.cfg = O.merge(O.DEFAULTS, d.config || null); G.version = d.version || ''; G.liveVersion = d.liveVersion || ''; G.hasDraft = !!d.hasDraft; G.srvDirty = !!d.dirty; G.draftAt = d.draftAt || ''; G.liveAt = d.liveAt || ''; G.dirty = false;
      if (!G.cfg.cover) G.cfg.cover = JSON.parse(JSON.stringify(Object.assign({}, window.OnboardingContent.settings.cover, G.coverStory.settings && G.coverStory.settings.cover || {})));
      if (!G.sel && G.cfg.cases.length) G.sel = G.cfg.cases[0].id;
      if (!G.selTopic && G.cfg.topics.length) G.selTopic = G.cfg.topics[0].id;
      if (!G.selSvc && G.cfg.services.length) G.selSvc = G.cfg.services[0].id;
      if (!G.selSec && G.cfg.sections.length) G.selSec = G.cfg.sections[0].id;
    });
  }
  function open(tab, pw, also) {
    C.setPw && C.setPw(pw); PANE = document.getElementById('t-onboard');
    if (also === 'home') G.sub = 'landing';
    if (G.cfg) return draw();
    PANE.innerHTML = '<p class="muted">불러오는 중…</p>'; load().then(draw).catch(function (e) { PANE.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  function body() {
    var b = G.cfg;
    return { renewal: b.renewal, cover: b.cover, resultDestination: b.resultDestination, forceOnboarding: b.forceOnboarding, honorific: b.honorific, weights: b.weights, cases: b.cases, removedCases: b.removedCases || [], intro: b.intro, introLast: b.introLast, bridge: b.bridge,
      sections: b.sections, services: b.services, topics: b.topics, progressLabel: b.progressLabel, afterDone: b.afterDone, quest: b.quest, timeline: b.timeline,
      scenes: b.scenes.map(function (s) { return { id: s.id, title: s.title, lines: s.lines, unknownLines: s.unknownLines || [], hint: s.hint, button: s.button, face: s.face, image: s.image || '', bg: s.bg || '', bubble: s.bubble || '', enabled: s.enabled }; }), revealLines: b.revealLines };
  }
  function putDraft(quiet) {
    collect();
    return C.api('/api/onboarding', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body()) }).then(function (d) {
      if (!quiet) toast('초안을 저장했습니다 (방문자 화면은 아직 그대로입니다)');
      (d.notes || []).forEach(function (n) { toast(n, true); });
      return load();
    });
  }
  function save() { putDraft().then(draw).catch(function (e) { toast(e.message, true); }); }
  function act(action, id) { return C.api('/api/onboarding?action=' + action + (id ? '&id=' + encodeURIComponent(id) : ''), { method: 'POST' }); }
  function publish() {
    collect();
    var pub = O.publicCases(G.cfg.cases).length, bc = O.birthCards(G.cfg.cases).length;
    if (!confirm('초안을 방문자 화면에 게시할까요?\n\n공개되는 사례 ' + pub + '건 (출생 시기 연구 카드 ' + bc + '건)\n게시 직전의 공개본은 이력에 남아 언제든 복원할 수 있습니다.')) return;
    putDraft(true).then(function () { return act('publish'); }).then(function () { toast('게시했습니다 — 방문자 화면에 반영됩니다'); G.hist = null; return load(); }).then(draw).catch(function (e) { toast(e.message, true); });
  }
  function unpublish() {
    if (!confirm('공개를 중지할까요?\n관리자가 저장한 공개본을 걷어 내고, 방문자 화면은 코드 기본 문구로 돌아갑니다. (이력에 남아 복원할 수 있습니다)')) return;
    act('unpublish').then(function () { toast('공개를 중지했습니다'); G.hist = null; return load(); }).then(draw).catch(function (e) { toast(e.message, true); });
  }
  function discard() {
    if (!confirm('저장한 초안을 버리고 현재 공개본으로 되돌릴까요?')) return;
    act('discard').then(function () { G.sel = G.selTopic = G.selSvc = G.selSec = null; toast('초안을 버렸습니다'); return load(); }).then(draw).catch(function (e) { toast(e.message, true); });
  }

  /* ── 화면 틀: 상태 줄 + 전체 흐름 + 하위 메뉴 ── */
  var SUBS0 = [['landing', '온보딩 5개 장면'], ['cases', '연구 사례·출처'], ['intro', '명리학 소개'], ['service', '서비스 소개'], ['@ext'], ['scenes', '기본 입력 (호환)'], ['basic', '호칭·가중치'], ['stats', '통계'], ['publish', '미리보기·게시 관리']];
  var EXT = []; // 확장 하위 메뉴(report/admin/v2-quest.js: 인터랙티브 스토리·에셋·타임라인·운영). {id, label, view(), collect(), flow()}
  function subs() { var o = []; SUBS0.forEach(function (s) { if (s[0] === '@ext') EXT.forEach(function (x) { o.push([x.id, x.label]); }); else o.push(s); }); return o; }
  // 관리 영역을 둘로 나눈다: A 기존 온보딩(연구·명리학·서비스 소개 → 나의 운 확인하기) / B 인터랙티브 스토리(그 버튼 이후). 두 영역은 설정 키가 서로 독립이다(A: cases·sections·intro·services·topics…, B: quest·timeline·scenes).
  var GA = ['landing', 'cases', 'intro', 'service', 'basic', 'stats'], GB = ['quest', 'qassets', 'tl', 'qops', 'scenes'];
  function inA(id) { return GA.indexOf(id) >= 0; }
  function groupsBar() {
    var all = subs(), pick = function (ids) { return all.filter(function (s) { return ids.indexOf(s[0]) >= 0; }).sort(function (a, b) { return ids.indexOf(a[0]) - ids.indexOf(b[0]); }); };
    var row = function (title, hint, list) { return '<div class="ob-bar"><b class="ob-grp">' + title + '</b><span class="ob-lock">' + hint + '</span>' + list.map(function (s) { return '<button class="ob-chip' + (G.sub === s[0] ? ' on' : '') + '" data-s="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>'; };
    return row('화면 편집', '첫 화면 → 소개 → 입력 → 각성 → 결과', pick(['landing','cases','quest','tl'])) + row('운영·게시', '모든 단계는 하나의 초안으로 저장하고 함께 게시합니다', pick(['qops','qassets','basic','stats','publish'])) + '<details' + (G.sub === 'scenes' ? ' open' : '') + '><summary>이전 입력 설정</summary>' + row('호환 모드', G.cfg.quest.enabled === false ? '현재 기본 입력 사용 중' : '이전 입력 설정 보존 · 현재 스토리 입력 사용 중', pick(['scenes'])) + '</details>';
  }
  function draw() {
    var changed = G.dirty ? '<span class="ob-dirty">● 저장하지 않은 변경이 있습니다</span>' : (G.srvDirty ? '<span class="ob-st warn">초안 ≠ 공개본 — 게시 필요</span>' : '<span class="ob-st ok">공개본과 같음</span>');
    PANE.innerHTML = '<div class="ob-workspace"><nav class="card ob-sidebar" aria-label="온보딩 편집 메뉴">' + groupsBar() + '</nav><div class="ob-main"><div class="card ob-toolbar">' +
      '<div class="ob-bar"><span id="obState">' + changed + '</span><span style="flex:1"></span>' +
      '<button id="obSave">초안 저장</button><button id="obPrev" class="ghost">미리보기</button><button id="obPub">게시</button>' + '</div>' +
      '<p class="muted">저장은 초안에 반영 · 게시는 방문자에게 공개</p><details class="ob-meta"><summary>게시 정보</summary><span>공개본 ' + esc(G.liveVersion || '(기본 문구)') + ' · 마지막 게시 ' + fmtT(G.liveAt) + ' · 초안 수정 ' + fmtT(G.draftAt) + '</span></details></div>' + flowHtml() + '<h3 class="ob-editor-title">' + esc((subs().filter(function (x) { return x[0] === G.sub; })[0] || ['', '편집'])[1]) + '</h3><div id="obPrevBox"></div><div id="obBody"></div></div></div>';
    $$('[data-s]').forEach(function (b) { b.onclick = function () {
      collect(); G.selSec = null; G.sub = b.dataset.s; draw();
    }; });
    if ($('#obSave')) $('#obSave').onclick = save;
    if ($('#obPub')) $('#obPub').onclick = publish;
    if ($('#obPrev')) $('#obPrev').onclick = function () { collect(); G.prev.on = !G.prev.on; if (G.prev.on) G.prev.hash = inA(G.sub) ? '#/welcome' : (G.sub === 'tl' ? '#/timeline' : '#/begin'); drawPrev(); };
    bindFlow(); drawPrev();
    var view = ({ landing: window.RenewalAdmin ? window.RenewalAdmin.view : landingView, cases: casesView, intro: introView, service: serviceView, scenes: scenesView, basic: basicView, stats: statsView, publish: publishView })[G.sub], ex = EXT.filter(function (x) { return x.id === G.sub; })[0]; if (view) view(); else if (ex) ex.view(); else $('#obBody').innerHTML = '';
    if (!PANE._obDirty) { PANE._obDirty = true; PANE.addEventListener('input', onEdit); PANE.addEventListener('change', onEdit); } // 편집기·흐름 카드·목록 어디서든 입력이 바뀌면 "저장 안 됨" 표시
  }
  function landingView() {
    var c = G.cfg.cover;
    $('#obBody').innerHTML = '<div class="card"><h3>첫 화면 · 커버</h3><form id="obCover" onsubmit="return false">' + chk('show', c.show !== false, '첫 화면 표시') + ['title','sub','button','hint','src','bgSrc','alt'].map(function (k) { var labels = {title:'제목',sub:'설명',button:'버튼 문구',hint:'안내 문구',src:'대표 이미지',bgSrc:'배경 이미지',alt:'이미지 설명'}; return '<label class="ob-f">' + labels[k] + '<textarea name="' + k + '">' + esc(c[k] || '') + '</textarea>' + (k === 'src' || k === 'bgSrc' ? '<input type="file" data-up="' + k + '" accept="image/*">' : '') + '</label>'; }).join('') + '<p class="ob-lock">기존 캐릭터 배치·글자 스타일·연출 설정은 보존됩니다. 첫 화면도 상단의 초안 저장·미리보기·게시를 사용합니다.</p></form></div>';
    bindUploads($('#obCover'), 'onb-cover-');
  }
  function onEdit(e) { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.closest('form, #obReveal')) markDirty(); else if (e.target && e.target.id === 'obReveal') markDirty(); }
  function markDirty() { G.dirty = true; var s = $('#obState'); if (s) s.innerHTML = '<span class="ob-dirty">● 저장하지 않은 변경이 있습니다</span>'; }

  /* 전체 흐름: 첫 화면 → (끌어서 정렬하는 섹션들) → 슬라이드 툰 → 홈 */
  function secStatus(s) {
    var c = G.cfg, cases = c.cases.map(O.normalizeCase);
    if (s.type === 'research') { var b = cases.filter(function (x) { return x.group === 'birth'; }), pub = O.birthCards(c.cases).length, rv = b.filter(function (x) { return x.verification.state === 'verified'; }).length; return '카드 ' + pub + '건 공개 · 검증 ' + rv + '/' + b.length; }
    if (s.type === 'myeongri') return '주제 ' + c.topics.filter(function (t) { return t.enabled !== false; }).length + '/' + c.topics.length + ' 노출';
    if (s.type === 'service') { var v = c.services.filter(function (x) { return x.visible !== false; }); return '노출 ' + v.length + ' · 준비 중 ' + v.filter(function (x) { return x.status === 'soon'; }).length; }
    if (s.type === 'story') return '공개 사례 ' + cases.filter(function (x) { return x.group !== 'birth' && O.publicCases([x]).length; }).length + '건';
    return '필수 · 끌 수 없음';
  }
  function flowHtml() {
    if (G.cfg.renewal && G.cfg.renewal.enabled !== false) return '<div class="card ob-flow-panel">' + G.cfg.renewal.scenes.map(function(s,i){return '<button type="button" data-renewal-stage="'+s.id+'">'+(i+1)+'. '+esc(s.title.slice(0,16))+(s.enabled?'':' (비활성)')+'</button>';}).join(' → ') + ' → 출생정보 입력 → 기존 결과 화면</div>';
    var c = G.cfg, nodes = c.sections.map(function (s, i) {
      var off = s.enabled === false && s.type !== 'final';
      return '<div class="ob-node' + (off ? ' dis' : '') + (G.selSec === s.id ? ' on' : '') + '" draggable="true" data-sec="' + esc(s.id) + '" data-i="' + i + '"><b>' + (i + 1) + '. ' + esc(SECT[s.type] || s.type) + '</b><span>' + esc(s.title ? s.title.split('\n')[0].slice(0, 18) : '') + '</span>' +
        '<span class="ob-st ' + (off ? 'off' : 'ok') + '">' + (off ? '비공개' : '공개') + '</span><small class="ob-lock">' + esc(secStatus(s)) + '</small>' +
        (s.type !== 'final' ? '<label class="ob-ck ob-f" style="margin:0"><input type="checkbox" data-en="' + esc(s.id) + '"' + (s.enabled !== false ? ' checked' : '') + '> 표시</label>' : '') + '</div>';
    }).join('<span class="ob-arrow">→</span>');
    return '<div class="card ob-flow-panel"><details id="obFlowDetails"><summary>단계 순서·표시 관리 <span class="ob-lock">· 필요할 때 펼쳐서 정렬하세요</span></summary>' +
      '<div class="ob-flow"><div class="ob-node fixed" data-stage="landing"><b>0. 첫 화면</b><span>등불·캐릭터·메인 카피</span><span class="ob-st ok">고정</span><small class="ob-lock">"랜딩 첫 화면" 메뉴</small></div><span class="ob-arrow">→</span>' + nodes +
      window.Quest.flow(c).filter(function (n) { return ['input','awakening','result'].indexOf(n.id) >= 0; }).map(function (n) { return '<span class="ob-arrow">→</span><div class="ob-node fixed" data-stage="' + n.editor + '"><b>' + esc(n.label) + '</b><span class="ob-lock">클릭하여 편집</span></div>'; }).join('') + '</div>' +
      '<div class="ob-bar"><button class="ghost" id="obSecAdd">+ 섹션 추가</button><span class="ob-lock">섹션 상세 편집은 ' + (G.sub === 'cases' || G.sub === 'intro' || G.sub === 'service' ? '카드를 누르면 아래에 열립니다' : '카드를 눌러 엽니다') + '</span></div></details><div id="obSecEd"></div></div>';
  }
  function bindFlow() {
    var c = G.cfg, drag = null;
    $$('[data-renewal-stage]').forEach(function(n){n.onclick=function(){collect();G.sub='landing';window.RenewalAdmin.select(n.dataset.renewalStage);draw();};});
    $$('[data-stage]').forEach(function (n) { n.onclick = function () { collect(); G.selSec = null; G.sub = n.dataset.stage; draw(); }; });
    $$('.ob-node[data-sec]').forEach(function (n) {
      n.addEventListener('click', function (e) { if (e.target.closest('input')) return; collect(); G.selSec = n.dataset.sec; secEditor(); $$('.ob-node[data-sec]').forEach(function (x) { x.classList.toggle('on', x === n); }); });
      n.addEventListener('dragstart', function (e) { drag = n.dataset.sec; try { e.dataTransfer.setData('text/plain', drag); e.dataTransfer.effectAllowed = 'move'; } catch (x) { } });
      n.addEventListener('dragover', function (e) { e.preventDefault(); n.classList.add('over'); });
      n.addEventListener('dragleave', function () { n.classList.remove('over'); });
      n.addEventListener('drop', function (e) {
        e.preventDefault(); n.classList.remove('over'); if (!drag || drag === n.dataset.sec) return; collect();
        var a = c.sections.filter(function (s) { return s.id === drag; })[0], i = c.sections.indexOf(a); c.sections.splice(i, 1);
        var j = c.sections.map(function (s) { return s.id; }).indexOf(n.dataset.sec); c.sections.splice(j + (i <= j ? 1 : 0), 0, a); G.dirty = true; draw();
      });
    });
    $$('[data-en]').forEach(function (b) { b.onchange = function () { var s = c.sections.filter(function (x) { return x.id === b.dataset.en; })[0]; if (s) { collect(); s.enabled = b.checked; G.dirty = true; draw(); } }; });
    var add = $('#obSecAdd'); if (add) add.onclick = function () {
      var t = prompt('추가할 섹션 종류를 입력하세요: research(연구 카드) · myeongri(명리학) · service(서비스 소개) · story(연구→유명인 후킹)', 'service'); if (!t || O.SECTION_TYPES.indexOf(t) < 0 || t === 'final') return;
      var base = JSON.parse(JSON.stringify(O.SECTIONS.filter(function (s) { return s.type === t; })[0])); base.id = uid(t).slice(0, 30).toLowerCase(); base.enabled = true; collect();
      c.sections.splice(c.sections.length - 1, 0, base); G.selSec = base.id; G.dirty = true; draw();
    };
    secEditor();
  }
  function secEditor() {
    var box = $('#obSecEd'); if (!box) return; var c = G.cfg, s = c.sections.filter(function (x) { return x.id === G.selSec; })[0];
    if (!s) { box.innerHTML = ''; return; }
    var cta = s.cta || {}, i = c.sections.indexOf(s);
    box.innerHTML = '<form id="obSec" class="ob-box" onsubmit="return false"><h4>' + esc(SECT[s.type] || s.type) + ' 섹션 설정 <span class="ob-lock">id ' + esc(s.id) + '</span></h4>' +
      '<div class="ob-g2"><label class="ob-f">위 작은 글씨<input type="text" name="kicker" value="' + esc(s.kicker || '') + '"></label><label class="ob-f">등장 연출<select name="effect">' + sel(EFFECTS, s.effect || 'fade') + '</select></label></div>' +
      '<label class="ob-f">제목 (줄바꿈 가능 · {귀인} 사용)<textarea name="title" style="min-height:56px">' + esc(s.title || '') + '</textarea></label><label class="ob-f">설명<textarea name="sub" style="min-height:70px">' + esc(s.sub || '') + '</textarea></label>' +
      (s.type === 'research' ? '<label class="ob-f">연구와 명리학을 구분하는 안내 문구 (항상 표시)<textarea name="notice" style="min-height:60px">' + esc(s.notice || '') + '</textarea></label>' : '<input type="hidden" name="notice" value="' + esc(s.notice || '') + '">') +
      (s.type === 'research' ? '<label class="ob-f">섹션 마지막 연결 문구<textarea name="bridge" style="min-height:56px">' + esc(s.bridge || '') + '</textarea></label>' : '<input type="hidden" name="bridge" value="' + esc(s.bridge || '') + '">') +
      (s.type === 'myeongri' ? chk('topics', s.topics === true, '원리 주제 목록(접이식)도 함께 표시 — 기본은 꺼짐: 장면 몇 컷만 읽히게') : '') + '<div class="ob-g2"><label class="ob-f">섹션 하단 버튼 문구<input type="text" name="cta" maxlength="30" value="' + esc(cta.text || '') + '"></label>' + chk('ctaShow', cta.show, '이 섹션 아래에 "나의 운 확인하기" 버튼 표시') + '</div><label class="ob-f">버튼 연결 경로<select name="ctaTo">' + sel({ story: '인터랙티브 스토리 (부적 오프닝부터)', quick: '일반 입력 화면 (스토리 없이 바로 분석)' }, cta.to === 'quick' ? 'quick' : 'story') + '</select></label>' +
      (s.type === 'final' ? '<div class="ob-g2"><label class="ob-f">대표 이미지 (기본 "運" 도형 대신 표시)<input type="text" name="art" value="' + esc(s.art || '') + '"><input type="file" data-up="art" accept="image/*"></label><label class="ob-f">대표 영상 (mp4 · 있으면 이미지보다 우선)<input type="text" name="artVideo" value="' + esc(s.artVideo || '') + '"><input type="file" data-up="artVideo" accept="video/*"></label></div>' : '<input type="hidden" name="art" value="' + esc(s.art || '') + '"><input type="hidden" name="artVideo" value="' + esc(s.artVideo || '') + '">') +
      '<div class="ob-g2"><label class="ob-f">배경 이미지 (PC)<input type="text" name="bg" value="' + esc(s.bg || '') + '"><input type="file" data-up="bg" accept="image/*"></label><label class="ob-f">배경 이미지 (모바일, 비우면 PC와 같음)<input type="text" name="bgMobile" value="' + esc(s.bgMobile || '') + '"><input type="file" data-up="bgMobile" accept="image/*"></label></div>' +
      '<details class="ob-advanced"><summary>글자 스타일·섹션 복제 및 삭제</summary>' + styBox(secRoles(s), s.sty) + '<div class="ob-bar"><button type="button" class="ghost" id="obSecUp"' + (i === 0 ? ' disabled' : '') + '>↑ 위로</button><button type="button" class="ghost" id="obSecDn"' + (i === c.sections.length - 1 ? ' disabled' : '') + '>↓ 아래로</button><button type="button" class="ghost" id="obSecDup">섹션 복제</button>' +
      (s.type !== 'final' ? '<button type="button" class="ghost" id="obSecDel">섹션 삭제</button>' : '') + '</div>' +
      '</details><p class="ob-lock">연출은 화면에 들어올 때 한 번 나타나는 효과뿐입니다. 글자 타이핑·자동 스크롤은 제공하지 않으며, 시스템의 "동작 줄이기" 설정을 따릅니다. 문구에 {귀인}을 쓰면 호칭 설정이 적용됩니다.</p></form>';
    var f = $('#obSec'); if (window.ObStyle) window.ObStyle.bind(f);
    $$('[data-up]', f).forEach(function (u) { u.onchange = function () { upload(u.files[0], 'onb-sec-').then(function (url) { f.elements[u.dataset.up].value = url; markDirty(); toast('올렸습니다 — 초안 저장을 눌러 반영하세요'); }).catch(function (e) { toast(e.message, true); }); }; });
    var mv = function (d) { collect(); var j = i + d; if (j < 0 || j >= c.sections.length) return; c.sections.splice(i, 1); c.sections.splice(j, 0, s); G.dirty = true; draw(); };
    $('#obSecUp').onclick = function () { mv(-1); }; $('#obSecDn').onclick = function () { mv(1); };
    $('#obSecDup').onclick = function () { collect(); var n = JSON.parse(JSON.stringify(s)); n.id = uid(s.type).slice(0, 30).toLowerCase(); n.title = (s.title || '') + ' (복제)'; c.sections.splice(i + 1, 0, n); G.selSec = n.id; G.dirty = true; draw(); };
    var del = $('#obSecDel'); if (del) del.onclick = function () { if (!confirm('이 섹션을 삭제할까요? (초안 저장 전에는 되돌릴 수 있습니다)')) return; c.sections.splice(i, 1); G.selSec = c.sections[0] && c.sections[0].id; G.dirty = true; draw(); };
  }

  /* ── 미리보기: 같은 출처 iframe 에 초안(저장 전 편집 내용 포함)을 postMessage 로 보낸다. 서버를 거치지 않으므로 방문자에게 노출되지 않는다 ── */
  var prevListener = null;
  function drawPrev() {
    var box = $('#obPrevBox'); if (!box) return;
    if (!G.prev.on) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="ob-prevbox' + (G.prev.dev === 'mob' ? ' mob' : '') + '"><div class="ob-bar" style="justify-content:center"><button class="ob-chip' + (G.prev.dev === 'pc' ? ' on' : '') + '" data-pd="pc">PC</button><button class="ob-chip' + (G.prev.dev === 'mob' ? ' on' : '') + '" data-pd="mob">모바일</button>' + (G.sub === 'landing' ? '<button class="ghost" id="obCenter">선택 항목 가운데 정렬</button>' : '') + '<button class="ghost" id="obPrevRe">현재 편집 내용으로 새로고침</button><button class="ghost" id="obPrevX">닫기</button></div>' +
      '<iframe id="obPrevFrame" title="랜딩 흐름 미리보기" src="' + ('/report/hub/?preview=1' + (G.prev.hash || '#/welcome')) + '"></iframe><p class="ob-lock">저장하지 않은 편집 내용까지 반영한 모습입니다. <b>섹션을 누르면 위쪽에 그 섹션의 편집 입력란이 열립니다</b>(점선 테두리가 누를 수 있는 영역). 검증 완료 + 공개로 설정한 사례만 보입니다. 통계에는 집계되지 않습니다.</p></div>';
    var push = function () { collect(); var f = $('#obPrevFrame'); if (f && f.contentWindow) f.contentWindow.postMessage({ t: 'mt-onb-preview', config: body() }, location.origin); };
    if (prevListener) window.removeEventListener('message', prevListener);
    var flash = function (el) { if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.transition = 'box-shadow .3s'; el.style.boxShadow = '0 0 0 2px #e0b36a'; setTimeout(function () { el.style.boxShadow = ''; }, 1600); var f = el.querySelector('input[type=text],textarea'); if (f) { try { f.focus({ preventScroll: true }); } catch (x) { } } };
    var pick = function (d) { // 미리보기에서 누른 섹션·소개 장면의 편집 입력란을 연다
      collect(); var cfg = G.cfg;
      if (d.intro && G.sub === 'intro') { var ix = (cfg.intro || []).map(function (x) { return x.id; }).indexOf(d.intro); var fm = ix >= 0 ? $('#obI' + ix) : null; if (fm) { flash(fm.closest('.card') || fm); return; } }
      if (d.sec && cfg.sections.some(function (x) { return x.id === d.sec; })) {
        G.selSec = d.sec; secEditor(); $$('.ob-node[data-sec]').forEach(function (x) { x.classList.toggle('on', x.dataset.sec === d.sec); }); flash($('#obSecEd'));
      }
    };
    prevListener = function (e) {
      if (e.origin !== location.origin || !e.data) return;
      var frame = $('#obPrevFrame'); if (!frame || e.source !== frame.contentWindow) return;
      if (e.data.t === 'mt-onb-ready' || e.data.t === 'st-ready') push();
      else if (G.sub === 'landing' && e.data.t === 'st-char') {
        var ch = (G.cfg.cover.chars || [])[+e.data.i], suffix = e.data.m ? 'M' : '';
        if (ch) { if (e.data.m) ch.mobile = true; ['x','y','size'].forEach(function (k) { if (Number.isFinite(e.data[k])) ch[e.data.m ? {x:'mx',y:'my',size:'msize'}[k] : k] = e.data[k]; }); markDirty(); }
      } else if (G.sub === 'landing' && e.data.t === 'st-text') {
        var names = {title:'title',sub:'sub',button:'button',image:'image'}, name = names[e.data.n], suffix = e.data.m ? 'M' : '';
        if (name) { if (Number.isFinite(e.data.x)) G.cfg.cover[name + 'X' + suffix] = e.data.x; if (Number.isFinite(e.data.y)) G.cfg.cover[name + 'Y' + suffix] = e.data.y; if (e.data.align === 'center') G.cfg.cover[name + 'Align' + suffix] = 'center'; markDirty(); }
      } else if (e.data.t === 'st-center-empty') { toast('미리보기에서 글자·버튼 또는 배치 이미지를 먼저 선택하세요'); } else if (e.data.t === 'mt-onb-select') { var fr = $('#obPrevFrame'); if (fr && e.source === fr.contentWindow) pick({ intro: String(e.data.intro || ''), sec: String(e.data.sec || '') }); }
    };
    window.addEventListener('message', prevListener);
    $$('[data-pd]', box).forEach(function (b) { b.onclick = function () { G.prev.dev = b.dataset.pd; drawPrev(); }; });
    var center = $('#obCenter'); if (center) center.onclick = function () { var f = $('#obPrevFrame'); if (f && f.contentWindow) f.contentWindow.postMessage({t:'st-center'},location.origin); };
    $('#obPrevRe').onclick = push; $('#obPrevX').onclick = function () { G.prev.on = false; drawPrev(); };
  }

  /* ── 현재 화면의 입력값을 G.cfg 로 옮긴다 ── */
  function collect() {
    if (!G.cfg || !$('#obBody')) return;
    EXT.forEach(function (x) { if (x.id === G.sub && x.collect) x.collect(); });
    var cfg = G.cfg, v;
    if (G.sub === 'landing' && window.RenewalAdmin) window.RenewalAdmin.collect();
    var coverForm = $('#obCover'); if (coverForm) { ['title','sub','button','hint','src','bgSrc','alt'].forEach(function (k) { cfg.cover[k] = coverForm.elements[k].value; }); cfg.cover.show = coverForm.elements.show.checked; }
    var sf = $('#obSec'); if (sf) { var s = cfg.sections.filter(function (x) { return x.id === G.selSec; })[0]; if (s) { v = function (n) { return sf.elements[n] ? sf.elements[n].value : ''; };
      s.kicker = v('kicker').trim(); s.effect = v('effect'); s.title = v('title').trim(); s.sub = v('sub').trim(); s.notice = v('notice').trim(); s.bridge = v('bridge').trim(); s.bg = v('bg').trim(); s.bgMobile = v('bgMobile').trim(); s.art = v('art').trim(); s.artVideo = v('artVideo').trim(); s.cta = { show: sf.elements.ctaShow.checked, text: v('cta').trim(), to: v('ctaTo') === 'quick' ? 'quick' : 'story' }; if (sf.elements.topics) s.topics = sf.elements.topics.checked; s.sty = readSty(sf, secRoles(s)); } }
    if (G.sub === 'cases' && G.sel) {
      var c = cfg.cases.filter(function (x) { return x.id === G.sel; })[0], f = $('#obCase'); if (c && f) {
        v = function (n) { return f.elements[n] ? f.elements[n].value : ''; }; var cb = function (n) { return f.elements[n] ? !!f.elements[n].checked : false; };
        c.kind = v('kind') || c.kind; c.type = c.kind === 'celebrity' ? 'celebrity' : 'research'; c.group = v('group') === 'birth' ? 'birth' : 'story';
        c.title = v('title').trim(); c.hook = v('hook').trim(); c.story = lines(v('story')); c.takeaway = v('takeaway').trim(); c.body = lines(v('body')); c.caveat = v('caveat').trim(); c.who = v('who').trim(); c.year = +v('year') || 0;
        c.tags = v('tags').split(',').map(function (x) { return x.trim(); }).filter(Boolean); c.weight = +v('weight') || 1; c.visual = c.visual || 'bell';
        c.source = { label: v('slabel').trim(), doi: v('doi').trim(), url: v('url').trim() }; c.verifiedNote = v('basis').trim();
        c.verification = { state: v('vstate'), reviewedAt: v('reviewedAt').trim(), basis: v('basis').trim() }; c.visible = cb('visible');
        if (f.elements.sname) { var st = c.study || {}; ['name:sname', 'org:sorg', 'researchers:sres', 'journal:sjournal', 'subject:ssubject', 'sample:ssample', 'method:smethod', 'result:sresult', 'stats:sstats', 'limits:slimits', 'scope:sscope'].forEach(function (p) { var a = p.split(':'); st[a[0]] = v(a[1]).trim(); }); st.year = +v('syear') || c.year || 0; st.doi = c.source.doi; st.url = c.source.url; st.relation = v('srel'); c.study = st; }
        c.media = { image: v('mimage').trim(), mobileImage: v('mmobile').trim(), bg: v('mbg').trim(), video: v('mvideo').trim(), alt: v('malt').trim(), credit: v('mcredit').trim(), license: v('mlicense').trim() }; c.image = c.media.image;
        c.sty = readSty(f, CARD_ROLES);
        c.display = { order: +v('dorder') || 0, featured: cb('dfeat'), showTitle: cb('dtitle'), showSummary: cb('dsum'), showSource: cb('dsrc'), detail: cb('ddet'), mobileLayout: v('dmob'), design: v('ddesign') };
      }
    }
    if (G.sub === 'intro') {
      cfg.intro.forEach(function (s, i) { var f = $('#obI' + i); if (!f) return; var g = function (n) { return f.elements[n].value; }; s.title = g('title').trim(); s.body = g('body').trim(); s.sub = g('sub').trim(); s.image = g('image').trim(); s.video = g('video').trim(); s.enabled = f.elements.enabled.checked; s.sty = readSty(f, ['title', 'body', 'sub']); });
      var l = $('#obLast'); if (l) cfg.introLast = { line: l.elements.line.value.trim(), cta: l.elements.cta.value.trim() };
      var tp = cfg.topics.filter(function (x) { return x.id === G.selTopic; })[0], tf = $('#obTopic'); if (tp && tf) { var g2 = function (n) { return tf.elements[n].value; };
        tp.title = g2('title').trim(); tp.sub = g2('sub').trim(); tp.nature = g2('nature'); tp.summary = g2('summary').trim(); tp.detail = g2('detail').trim(); tp.analogy = g2('analogy').trim(); tp.term = g2('term').trim(); tp.termEasy = g2('termEasy').trim();
        tp.image = g2('image').trim(); tp.image2 = g2('image2').trim(); tp.video = g2('video').trim(); tp.anim = g2('anim'); tp.refs = g2('refs').trim(); tp.enabled = tf.elements.enabled.checked; }
    }
    if (G.sub === 'service') { var sv = cfg.services.filter(function (x) { return x.id === G.selSvc; })[0], sfm = $('#obSvc'); if (sv && sfm) { var g3 = function (n) { return sfm.elements[n].value; };
      sv.title = g3('title').trim(); sv.desc = g3('desc').trim(); sv.glyph = g3('glyph').trim().slice(0, 2); sv.status = g3('status'); sv.visible = sfm.elements.visible.checked; sv.image = g3('image').trim(); sv.video = g3('video').trim(); sv.link = g3('link').trim(); } }
    if (G.sub === 'scenes') {
      cfg.scenes.forEach(function (s, i) { var f = $('#obS' + i); if (!f) return; var g = function (n) { return f.elements[n].value; }; s.title = g('title').trim(); s.lines = lines(g('lines')); s.unknownLines = f.elements.unk ? lines(g('unk')) : s.unknownLines; s.hint = g('hint').trim(); s.button = g('button').trim() || '다음'; s.face = g('face'); s.image = g('image').trim(); s.bg = g('bg').trim(); s.bubble = g('bubble'); s.enabled = REQ.indexOf(s.field) >= 0 ? true : f.elements.enabled.checked; });
      var r = $('#obReveal'); if (r) cfg.revealLines = lines(r.value);
      var sm = $('#obSceneMeta'); if (sm) { cfg.progressLabel = sm.elements.progress.value.trim() || '{n} / {total} · {title}';  }
    }
    if (G.sub === 'basic') { var b = $('#obBasic'); if (b) { var h = b.elements.honorific.value.trim(); cfg.honorific = O.honorific({ honorific: h }); cfg.forceOnboarding = !!b.elements.force.checked; cfg.bridge = { toCelebrity: b.elements.bc.value.trim(), toIntro: b.elements.bi.value.trim() }; cfg.weights = { research: +b.elements.wr.value || 0, celebrity: +b.elements.wc.value || 0 }; if (cfg.weights.research + cfg.weights.celebrity <= 0) cfg.weights = { research: 60, celebrity: 40 }; } }
  }

  /* ── 공통: 업로드·목록 정렬 ── */
  function upload(file, pre) {
    if (!file) return Promise.reject(new Error('파일을 선택하세요'));
    if (!/^image[/]/.test(file.type) && !/^video[/]/.test(file.type)) return Promise.reject(new Error('이미지 또는 영상 파일만 올릴 수 있습니다'));
    if (file.size > 25 * 1024 * 1024) return Promise.reject(new Error('25MB 이하만 올릴 수 있습니다'));
    return C.api('/api/clipfile?name=' + encodeURIComponent(pre + file.name), { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file }).then(function (d) { if (!d.key) throw new Error('업로드 실패'); return '/api/clipfile?k=' + d.key; });
  }
  function bindUploads(form, pre) {
    $$('[data-up]', form).forEach(function (u) { u.onchange = function () { upload(u.files[0], pre).then(function (url) { form.elements[u.dataset.up].value = url; try { form.elements[u.dataset.up].dispatchEvent(new Event('input', { bubbles: true })); } catch (x) { } markDirty(); toast('올렸습니다 — 초안 저장을 눌러 반영하세요'); }).catch(function (e) { toast(e.message, true); }); }; });
  }
  function move(list, id, d) { var i = list.map(function (x) { return x.id; }).indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= list.length) return; var x = list.splice(i, 1)[0]; list.splice(j, 0, x); }

  /* ── 후킹 사례 ── */
  var VBADGE = { draft: 'off', review: 'warn', verified: 'ok', hold: 'warn', rejected: 'bad' };
  function gateReasons(c) {
    var s = c.source || {}, r = [];
    if (c.verification.state !== 'verified') r.push('검증 상태가 "검증 완료"가 아닙니다');
    if (!(s.doi || s.url)) r.push('출처(DOI 또는 URL)가 없습니다');
    if (!String(c.verification.basis || '').trim()) r.push('검토 근거가 비어 있습니다');
    return r;
  }
  function casesView() {
    var cfg = G.cfg, all = cfg.cases.map(function (x, i) { var n = O.normalizeCase(x); cfg.cases[i] = Object.assign(x, { verification: n.verification, visible: n.visible, kind: n.kind, group: n.group, study: n.study, media: n.media, display: n.display, type: n.type }); return cfg.cases[i]; });
    var F = G.flt, st = G.stats && G.stats.byCase || {};
    var list = all.filter(function (x) {
      if (F.q && (x.title + ' ' + (x.who || '') + ' ' + (x.tags || []).join(' ')).toLowerCase().indexOf(F.q.toLowerCase()) < 0) return false;
      if (F.kind && x.kind !== F.kind) return false; if (F.vs && x.verification.state !== F.vs) return false;
      if (F.vis === 'on' && !x.visible) return false; if (F.vis === 'off' && x.visible) return false; return true;
    });
    var c = all.filter(function (x) { return x.id === G.sel; })[0];
    var rows = list.map(function (x) { var s = st[x.id] || {}; return '<div class="ob-row' + (x.id === G.sel ? ' on' : '') + '" data-id="' + esc(x.id) + '"><b>' + esc(x.title) + '</b><small><span class="ob-st ' + VBADGE[x.verification.state] + '">' + VST[x.verification.state] + '</span><span class="ob-st ' + (x.visible && x.verification.state === 'verified' ? 'ok' : 'off') + '">' + (x.visible && x.verification.state === 'verified' ? '공개' : '비공개') + '</span> ' + esc(KINDS[x.kind]) + (x.group === 'birth' ? ' · 출생 시기 연구 섹션' : '') + (s.onboarding_card_impression ? ' · 노출 ' + s.onboarding_card_impression : '') + '</small></div>'; }).join('');
    $('#obBody').innerHTML = '<div class="v2split"><div class="card"><div class="ob-bar"><button id="obAdd">+ 사례 추가</button></div>' +
      '<input type="text" id="obQ" placeholder="제목·인물·태그 검색" value="' + esc(F.q) + '"><div class="ob-bar"><select id="obFk">' + sel(KINDS, F.kind, '유형 전체') + '</select><select id="obFv">' + sel(VST, F.vs, '검증 전체') + '</select><select id="obFp">' + sel({ on: '공개', off: '비공개' }, F.vis, '공개 전체') + '</select></div>' +
      '<div class="v2list">' + (rows || '<p class="muted">조건에 맞는 사례가 없습니다.</p>') + '</div></div><div class="card">' + (c ? caseForm(c) : '<p class="muted">사례를 선택하세요.</p>') + '</div></div>';
    $$('.ob-row').forEach(function (r) { r.onclick = function () { collect(); G.sel = r.dataset.id; casesView(); }; });
    var rerender = function () { collect(); G.flt = { q: $('#obQ').value, kind: $('#obFk').value, vs: $('#obFv').value, vis: $('#obFp').value }; casesView(); };
    $('#obQ').onchange = rerender; $('#obFk').onchange = rerender; $('#obFv').onchange = rerender; $('#obFp').onchange = rerender;
    $('#obAdd').onclick = function () { collect(); var id = 'n-' + Date.now().toString(36); cfg.cases.push(O.normalizeCase({ id: id, kind: 'study', group: 'birth', title: '새 사례', hook: '', body: ['핵심 요약 첫 문장'], caveat: '', who: '', year: new Date().getFullYear(), tags: [], source: { label: '', doi: '', url: '' }, visual: 'bell', verification: { state: 'draft', reviewedAt: '', basis: '' }, visible: false })); G.sel = id; G.dirty = true; casesView(); };
    var f = $('#obCase'); if (!f) return;
    var del = $('#obDel'); if (del) del.onclick = function () { if (!confirm('이 사례를 삭제할까요? (초안 저장 전에는 되돌릴 수 있습니다)')) return; cfg.removedCases = (cfg.removedCases || []).concat([G.sel]); cfg.cases = cfg.cases.filter(function (x) { return x.id !== G.sel; }); G.sel = cfg.cases[0] && cfg.cases[0].id; G.dirty = true; casesView(); };
    f.elements.kind.onchange = function () { collect(); casesView(); };
    f.elements.vstate.onchange = function () { collect(); var cc = G.cfg.cases.filter(function (x) { return x.id === G.sel; })[0]; if (cc.verification.state === 'verified' && !cc.verification.reviewedAt) cc.verification.reviewedAt = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); if (cc.verification.state !== 'verified') cc.visible = false; casesView(); };
    f.elements.visible.onchange = function () { collect(); var cc = G.cfg.cases.filter(function (x) { return x.id === G.sel; })[0], why = gateReasons(cc); if (cc.visible && why.length) { cc.visible = false; toast('공개할 수 없습니다: ' + why.join(' / '), true); } casesView(); };
    bindUploads(f, 'onb-case-'); if (window.ObStyle) window.ObStyle.bind(f);
    var chkBtn = $('#obDoi'); if (chkBtn) chkBtn.onclick = function () { collect(); crossref(); };
  }
  function precheck(c) {
    var out = [], st = c.study || {}, txt = [c.title, c.hook, (c.body || []).join(' '), (c.story || []).join(' '), c.takeaway, st.result, st.stats, st.scope].join(' ');
    var BAN = /(반드시|100\s*%|무조건|확실히|보장|예언|적중|과학적으로\s*(입증|증명)|입증(되|됐|했)|증명(되|됐|했)|틀림없)/g, m = txt.match(BAN);
    if (m) out.push('과장·단정 가능 표현: ' + m.filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', '));
    if (c.kind === 'study' || c.kind === 'experiment') {
      if (!(c.source.doi || c.source.url)) out.push('원문 출처(DOI·URL)가 없습니다');
      if (c.source.doi && !/^10\.\d{4,9}\/\S+$/.test(c.source.doi)) out.push('DOI 형식이 올바르지 않습니다');
      if (!st.limits && !c.caveat) out.push('연구의 한계가 비어 있습니다');
      if (!st.sample) out.push('표본 규모가 비어 있습니다');
      if (!st.scope) out.push('"과학적 검증 범위"가 비어 있습니다 — 이 연구가 다루지 않는 것을 적어 주세요');
      if (st.relation === 'direct') out.push('"명리학 자체를 직접 검증한 연구"는 강한 주장입니다. 원문에서 명리학(사주)을 직접 검증했는지 반드시 확인하세요');
      if (st.relation === 'none' && c.group === 'birth') out.push('관련성이 "직접적인 관련성 없음"인데 출생 시기 연구 섹션에 배치되어 있습니다');
    }
    if (!out.length) out.push('규칙 점검에서 걸린 항목이 없습니다 (이것이 검증 완료를 뜻하지는 않습니다)');
    return out;
  }
  function crossref() {
    var out = $('#obDoiOut'), doi = ($('#obCase').elements.doi.value || '').trim();
    if (!/^10\.\d{4,9}\/\S+$/.test(doi)) { out.innerHTML = '<span class="err">DOI 형식을 확인하세요 (예: 10.1093/jamia/ocv046)</span>'; return; }
    out.textContent = 'Crossref 에서 확인하는 중…';
    fetch('https://api.crossref.org/works/' + encodeURIComponent(doi)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
      var m = j.message || {}, title = (m.title || [])[0] || '', yr = m.issued && m.issued['date-parts'] && m.issued['date-parts'][0] && m.issued['date-parts'][0][0], jn = (m['container-title'] || [])[0] || '', au = (m.author || []).slice(0, 4).map(function (a) { return a.family || a.name || ''; }).join(', ');
      var f = $('#obCase').elements, yIn = +f.syear.value || +f.year.value;
      out.innerHTML = '<b>Crossref 등록 정보</b><br>제목: ' + esc(title) + '<br>저자: ' + esc(au) + (m.author && m.author.length > 4 ? ' 외' : '') + '<br>학술지: ' + esc(jn) + '<br>연도: ' + esc(yr || '-') + (yIn && yr && yIn !== yr ? ' <span class="err">(입력한 연도 ' + yIn + ' 와 다릅니다)</span>' : '') +
        '<br><span class="ob-lock">메타데이터 대조일 ' + new Date().toISOString().slice(0, 10) + ' · 대상 수·통계 등 본문 수치는 원문에서 직접 확인해야 합니다.</span>';
    }).catch(function () { out.innerHTML = '<span class="err">확인 불가 — Crossref 에서 이 DOI 를 찾지 못했거나 연결할 수 없습니다. 원문 링크로 직접 확인하세요.</span>'; });
  }
  function caseForm(c) {
    var s = c.source || {}, st = c.study || {}, m = c.media || {}, d = c.display || {}, v = c.verification, research = c.kind === 'study' || c.kind === 'experiment', why = gateReasons(c), canPub = !why.length;
    var img = function (n, label, val, up) { return '<label class="ob-f">' + label + '<input type="text" name="' + n + '" value="' + esc(val || '') + '"><input type="file" data-up="' + n + '" accept="' + (up || 'image/*') + '">' + (val && /^\/api\/clipfile|^https:/.test(val) && up !== 'video/*' ? '<img class="ob-img" src="' + esc(val) + '" alt="">' : '') + '</label>'; };
    var pre = precheck(c);
    return '<form id="obCase" onsubmit="return false">' +
      '<div class="ob-box ' + (c.visible && canPub ? 'ob-okbox' : '') + '"><h4>검증 · 공개 <span class="ob-lock">두 상태는 따로 관리합니다</span></h4><div class="ob-g2"><label class="ob-f ob-req">검증 상태<select name="vstate">' + sel(VST, v.state) + '</select></label>' +
      '<label class="ob-f">검토일 (검증 완료 시 자동 기록)<input type="text" name="reviewedAt" placeholder="YYYY-MM-DD" value="' + esc(v.reviewedAt || '') + '"></label></div>' +
      '<label class="ob-f ob-req">검토 근거 (무엇을 어디서 확인했는지)<textarea name="basis" style="min-height:60px" placeholder="예: 2026-10-11 Crossref DOI·저자·연도 대조, 초록에서 표본 수 확인">' + esc(v.basis || '') + '</textarea></label>' +
      chk('visible', c.visible && canPub, '방문자에게 공개') + (canPub ? '' : '<p class="err" style="margin:0">공개하려면: ' + esc(why.join(' · ')) + '</p>') + '</div>' +
      '<div class="ob-g2"><label class="ob-f ob-req">사례 유형<select name="kind">' + sel(KINDS, c.kind) + '</select></label><label class="ob-f">노출 위치<select name="group">' + sel({ birth: '랜딩 "출생 시기 연구" 카드', story: '예전 후킹 풀(후킹 섹션이 켜졌을 때)' }, c.group) + '</select></label></div>' +
      '<label class="ob-f ob-req">제목<input type="text" name="title" maxlength="160" value="' + esc(c.title) + '"></label><label class="ob-f">후킹 문구<input type="text" name="hook" maxlength="160" value="' + esc(c.hook) + '"></label>' +
      '<label class="ob-f">핵심 요약 (한 줄 = 한 항목, 카드 요약에 표시)<textarea name="body">' + esc((c.body || []).join('\n')) + '</textarea></label>' +
      '<label class="ob-f">이야기 (한 줄 = 한 문단 · 예전 후킹 풀에서 사용 · 확인된 사실만)<textarea name="story" style="min-height:130px">' + esc((c.story || []).join('\n')) + '</textarea></label>' +
      '<label class="ob-f">이야기가 남기는 한 줄<input type="text" name="takeaway" value="' + esc(c.takeaway || '') + '"></label>' +
      '<label class="ob-f">한계·주의 문구' + (research ? ' (연구는 필수)' : '') + '<textarea name="caveat" style="min-height:52px">' + esc(c.caveat || '') + '</textarea></label>' +
      '<div class="ob-g2"><label class="ob-f">연구자·기관 또는 인물<input type="text" name="who" value="' + esc(c.who || '') + '"></label><label class="ob-f">연도<input type="text" name="year" inputmode="numeric" value="' + esc(c.year || '') + '"></label></div>' +
      '<div class="ob-box"><h4>출처</h4><div class="ob-g2"><label class="ob-f">출처 이름 (학술지·자료명)<input type="text" name="slabel" value="' + esc(s.label || '') + '"></label><label class="ob-f">DOI<input type="text" name="doi" value="' + esc(s.doi || '') + '" placeholder="10.xxxx/…"></label></div>' +
      '<label class="ob-f">원문 URL (https)<input type="text" name="url" value="' + esc(s.url || '') + '"></label>' + (research ? '<div class="ob-bar"><button type="button" class="ghost" id="obDoi">DOI 로 Crossref 대조</button></div><div id="obDoiOut" class="ob-lock"></div>' : '') + '</div>' +
      (research ? '<div class="ob-box"><h4>연구·실험 정보</h4><label class="ob-f">연구명(원제)<input type="text" name="sname" value="' + esc(st.name || '') + '"></label>' +
        '<div class="ob-g2"><label class="ob-f">연구기관<input type="text" name="sorg" value="' + esc(st.org || '') + '"></label><label class="ob-f">연구자<input type="text" name="sres" value="' + esc(st.researchers || '') + '"></label></div>' +
        '<div class="ob-g2"><label class="ob-f">발표 연도<input type="text" name="syear" inputmode="numeric" value="' + esc(st.year || '') + '"></label><label class="ob-f">학술지<input type="text" name="sjournal" value="' + esc(st.journal || '') + '"></label></div>' +
        '<label class="ob-f">연구 대상<input type="text" name="ssubject" value="' + esc(st.subject || '') + '"></label><label class="ob-f ob-req">표본 규모<input type="text" name="ssample" value="' + esc(st.sample || '') + '"></label>' +
        '<label class="ob-f">연구 방법<textarea name="smethod" style="min-height:56px">' + esc(st.method || '') + '</textarea></label><label class="ob-f">핵심 결과<textarea name="sresult" style="min-height:56px">' + esc(st.result || '') + '</textarea></label>' +
        '<label class="ob-f">통계적 수치<input type="text" name="sstats" value="' + esc(st.stats || '') + '"></label><label class="ob-f ob-req">연구의 한계<textarea name="slimits" style="min-height:56px">' + esc(st.limits || '') + '</textarea></label>' +
        '<label class="ob-f ob-req">명리학과의 관련성 (관리자가 직접 선택 · AI 가 정하지 않음)<select name="srel">' + sel(REL, st.relation) + '</select></label>' +
        '<label class="ob-f ob-req">과학적 검증 범위 (이 연구가 다루는 것 / 다루지 않는 것)<textarea name="sscope" style="min-height:56px">' + esc(st.scope || '') + '</textarea></label></div>' : '<input type="hidden" name="sname"><input type="hidden" name="syear">') +
      '<div class="ob-box ' + (pre.length && !/걸린 항목이 없습니다/.test(pre[0]) ? 'ob-warnbox' : '') + '"><h4>자동 점검 (규칙 기반 · AI 아님)</h4><ul style="margin:0;padding-left:18px;font-size:.8rem">' + pre.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<p class="ob-lock">AI 검토 보조는 아직 연결하지 않았습니다. 이 점검과 DOI 대조는 참고용이며, "검증 완료"는 관리자가 원문을 직접 확인한 뒤에만 선택하세요.</p></div>' +
      '<div class="ob-box"><h4>이미지·영상</h4><div class="ob-g2">' + img('mimage', '대표 이미지', m.image) + img('mmobile', '모바일 이미지', m.mobileImage) + '</div><div class="ob-g2">' + img('mbg', '배경 이미지', m.bg) + img('mvideo', '짧은 영상(mp4)', m.video, 'video/*') + '</div>' +
      '<label class="ob-f">대체 텍스트<input type="text" name="malt" value="' + esc(m.alt || '') + '"></label><div class="ob-g2"><label class="ob-f">이미지 출처<input type="text" name="mcredit" value="' + esc(m.credit || '') + '"></label><label class="ob-f">라이선스<input type="text" name="mlicense" value="' + esc(m.license || '') + '"></label></div>' +
      '<p class="ob-lock">사용 권한이 확인된 이미지만 올려 주세요. 비워 두면 도형 일러스트가 나옵니다.</p></div>' +
      '<div class="ob-box"><h4>카드 노출 설정</h4><div class="ob-g2"><label class="ob-f">노출 순서 (작을수록 먼저, -50~50)<input type="text" name="dorder" inputmode="numeric" value="' + esc(d.order || 0) + '"></label><label class="ob-f">카드 디자인<select name="ddesign">' + sel(DESIGNS, d.design) + '</select></label></div>' +
      '<div class="ob-g2"><label class="ob-f">모바일 레이아웃<select name="dmob">' + sel({ stack: '기본(그림·요약 모두)', compact: '간략(그림·표 숨김)' }, d.mobileLayout) + '</select></label><label class="ob-f">예전 후킹 풀 가중치 (0.1~10)<input type="text" name="weight" inputmode="decimal" value="' + esc(c.weight || 1) + '"></label></div>' +
      chk('dfeat', d.featured, '강조 카드 (PC에서 한 줄 전체)') + chk('dtitle', d.showTitle !== false, '제목 표시') + chk('dsum', d.showSummary !== false, '요약 표시') + chk('dsrc', d.showSource !== false, '출처 링크 표시') + chk('ddet', d.detail !== false, '"연구 자세히 보기" 사용') + '</div>' +
      styBox(CARD_ROLES, c.sty) + '<label class="ob-f">관심사 태그 (쉼표)<input type="text" name="tags" value="' + esc((c.tags || []).join(', ')) + '"></label>' +
      '<p class="ob-lock">id: ' + esc(c.id) + '</p><div class="ob-bar"><button id="obDel" class="ghost">이 사례 삭제</button></div></form>';
  }

  /* ── 명리학 소개: 소개 장면(기존) + 원리 주제 ── */
  function introView() {
    var cfg = G.cfg, tp = cfg.topics.filter(function (x) { return x.id === G.selTopic; })[0];
    var rows = cfg.topics.map(function (x, i) { return '<div class="ob-row' + (x.id === G.selTopic ? ' on' : '') + '" data-tp="' + esc(x.id) + '"><b>' + (i + 1) + '. ' + esc(x.title) + '</b><small><span class="ob-st ' + (x.enabled !== false ? 'ok' : 'off') + '">' + (x.enabled !== false ? '공개' : '비공개') + '</span> ' + esc(NATURE[x.nature] || '') + '</small></div>'; }).join('');
    $('#obBody').innerHTML = '<div class="card"><h3 style="font-size:1rem;margin:0">원리 주제 <span class="ob-lock">· 역사적 사실 / 전통 해석 / 천문·과학적 사실을 구분해 표시합니다</span></h3><div class="v2split"><div><div class="ob-bar"><button id="obTpAdd">+ 주제 추가</button></div><div class="v2list">' + rows + '</div></div><div>' + (tp ? topicForm(tp) : '<p class="muted">주제를 선택하세요.</p>') + '</div></div></div>' +
      cfg.intro.map(function (s, i) { return '<div class="card"><h3 style="font-size:1rem">소개 장면 ' + (i + 1) + ' · ' + esc(s.id) + '</h3><form id="obI' + i + '" onsubmit="return false">' +
        '<label class="ob-f">제목<input type="text" name="title" value="' + esc(s.title) + '"></label><label class="ob-f">본문<textarea name="body">' + esc(s.body) + '</textarea></label><label class="ob-f">보조 문구<input type="text" name="sub" value="' + esc(s.sub || '') + '"></label>' +
        '<div class="ob-g2"><label class="ob-f">이미지 (주소 입력 또는 파일 올리기)<input type="text" name="image" value="' + esc(s.image || '') + '"><input type="file" data-up="image" accept="image/*"></label><label class="ob-f">영상 (mp4 · 주소 입력 또는 파일 올리기)<input type="text" name="video" value="' + esc(s.video || '') + '"><input type="file" data-up="video" accept="video/*"></label></div>' +
        styBox(['title', 'body', 'sub'], s.sty) + chk('enabled', s.enabled !== false, '노출') + '</form></div>'; }).join('') +
      '<div class="card"><h3 style="font-size:1rem">예전 마지막 문구·버튼 <span class="ob-lock">(최종 CTA 섹션 문구가 비어 있을 때 사용)</span></h3><form id="obLast" onsubmit="return false"><label class="ob-f">문구<input type="text" name="line" value="' + esc(cfg.introLast.line) + '"></label><label class="ob-f">버튼<input type="text" name="cta" value="' + esc(cfg.introLast.cta) + '"></label></form></div>';
    cfg.intro.forEach(function (s, i) { var fi = $('#obI' + i); if (fi) { bindUploads(fi, 'onb-intro-'); if (window.ObStyle) window.ObStyle.bind(fi); } });
    $$('[data-tp]').forEach(function (r) { r.onclick = function () { collect(); G.selTopic = r.dataset.tp; introView(); }; });
    $('#obTpAdd').onclick = function () { collect(); var id = uid('tp').slice(0, 30).toLowerCase(); cfg.topics.push({ id: id, enabled: false, nature: 'tradition', title: '새 주제', sub: '', summary: '', detail: '', analogy: '', term: '', termEasy: '', image: '', video: '', image2: '', anim: 'fade', refs: '' }); G.selTopic = id; G.dirty = true; introView(); };
    var f = $('#obTopic'); if (f) {
      bindUploads(f, 'onb-topic-');
      $('#obTpUp').onclick = function () { collect(); move(cfg.topics, G.selTopic, -1); G.dirty = true; introView(); }; $('#obTpDn').onclick = function () { collect(); move(cfg.topics, G.selTopic, 1); G.dirty = true; introView(); };
      $('#obTpDel').onclick = function () { if (!confirm('이 주제를 삭제할까요?')) return; cfg.topics = cfg.topics.filter(function (x) { return x.id !== G.selTopic; }); G.selTopic = cfg.topics[0] && cfg.topics[0].id; G.dirty = true; introView(); };
    }
  }
  function topicForm(t) {
    var up = function (n, label, val, acc) { return '<label class="ob-f">' + label + '<input type="text" name="' + n + '" value="' + esc(val || '') + '"><input type="file" data-up="' + n + '" accept="' + (acc || 'image/*') + '"></label>'; };
    return '<form id="obTopic" onsubmit="return false"><div class="ob-g2"><label class="ob-f ob-req">제목<input type="text" name="title" value="' + esc(t.title) + '"></label><label class="ob-f">부제<input type="text" name="sub" value="' + esc(t.sub || '') + '"></label></div>' +
      '<label class="ob-f">성격 표시 (역사적 사실·전통 해석·천문·과학적 사실을 섞어 쓰지 않도록 구분)<select name="nature">' + sel(NATURE, t.nature) + '</select></label>' +
      '<label class="ob-f">간단 설명<textarea name="summary" style="min-height:64px">' + esc(t.summary || '') + '</textarea></label><label class="ob-f">상세 설명<textarea name="detail" style="min-height:110px">' + esc(t.detail || '') + '</textarea></label>' +
      '<label class="ob-f">쉬운 비유<textarea name="analogy" style="min-height:52px">' + esc(t.analogy || '') + '</textarea></label>' +
      '<div class="ob-g2"><label class="ob-f">전문 용어<input type="text" name="term" value="' + esc(t.term || '') + '" placeholder="예: 대운"></label><label class="ob-f">쉬운 설명<input type="text" name="termEasy" value="' + esc(t.termEasy || '') + '"></label></div>' +
      '<div class="ob-g2">' + up('image', '대표 이미지', t.image) + up('image2', '보조 이미지', t.image2) + '</div>' + up('video', '영상(mp4)', t.video, 'video/*') +
      '<div class="ob-g2"><label class="ob-f">애니메이션 유형<select name="anim">' + sel(EFFECTS, t.anim || 'fade') + '</select></label><label class="ob-f">참고 문헌<input type="text" name="refs" value="' + esc(t.refs || '') + '"></label></div>' +
      chk('enabled', t.enabled !== false, '공개') + '<div class="ob-bar"><button type="button" class="ghost" id="obTpUp">↑ 위로</button><button type="button" class="ghost" id="obTpDn">↓ 아래로</button><button type="button" class="ghost" id="obTpDel">삭제</button></div><p class="ob-lock">id: ' + esc(t.id) + ' · 노출 순서는 목록 순서입니다.</p></form>';
  }

  /* ── 서비스 소개 ── */
  function serviceView() {
    var cfg = G.cfg, sv = cfg.services.filter(function (x) { return x.id === G.selSvc; })[0];
    var rows = cfg.services.map(function (x, i) { return '<div class="ob-row' + (x.id === G.selSvc ? ' on' : '') + '" data-sv="' + esc(x.id) + '"><b>' + (i + 1) + '. ' + esc(x.title) + '</b><small><span class="ob-st ' + (x.visible !== false ? 'ok' : 'off') + '">' + (x.visible !== false ? '공개' : '비공개') + '</span><span class="ob-st ' + (x.status === 'soon' ? 'warn' : 'ok') + '">' + (x.status === 'soon' ? '준비 중' : '이용 가능') + '</span></small></div>'; }).join('');
    var up = function (n, label, val, acc) { return '<label class="ob-f">' + label + '<input type="text" name="' + n + '" value="' + esc(val || '') + '"><input type="file" data-up="' + n + '" accept="' + (acc || 'image/*') + '"></label>'; };
    $('#obBody').innerHTML = '<div class="v2split"><div class="card"><div class="ob-bar"><button id="obSvAdd">+ 서비스 추가</button></div><div class="v2list">' + rows + '</div><p class="ob-lock">실제로 구현되지 않은 기능은 "준비 중"으로 두거나 비공개하세요.</p></div><div class="card">' + (sv ?
      '<form id="obSvc" onsubmit="return false"><label class="ob-f ob-req">제목<input type="text" name="title" value="' + esc(sv.title) + '"></label><label class="ob-f">설명<textarea name="desc" style="min-height:70px">' + esc(sv.desc || '') + '</textarea></label>' +
      '<div class="ob-g2"><label class="ob-f">대표 글자 (이미지가 없을 때 표시, 1~2자)<input type="text" name="glyph" maxlength="2" value="' + esc(sv.glyph || '') + '"></label><label class="ob-f">이용 상태<select name="status">' + sel({ live: '이용 가능', soon: '준비 중' }, sv.status) + '</select></label></div>' +
      '<div class="ob-g2">' + up('image', '이미지 (결과 화면 캡처 등)', sv.image) + up('video', '영상 샘플(mp4)', sv.video, 'video/*') + '</div>' +
      '<label class="ob-f">연결 경로 (예: #/awaken · /report/… · https://…)<input type="text" name="link" value="' + esc(sv.link || '') + '"></label>' + chk('visible', sv.visible !== false, '랜딩에 공개') +
      '<div class="ob-bar"><button type="button" class="ghost" id="obSvUp">↑ 위로</button><button type="button" class="ghost" id="obSvDn">↓ 아래로</button><button type="button" class="ghost" id="obSvDel">삭제</button></div><p class="ob-lock">id: ' + esc(sv.id) + '</p></form>' : '<p class="muted">항목을 선택하세요.</p>') + '</div></div>';
    $$('[data-sv]').forEach(function (r) { r.onclick = function () { collect(); G.selSvc = r.dataset.sv; serviceView(); }; });
    $('#obSvAdd').onclick = function () { collect(); var id = uid('sv').slice(0, 30).toLowerCase(); cfg.services.push({ id: id, title: '새 서비스', desc: '', glyph: '新', status: 'soon', visible: false, image: '', video: '', link: '' }); G.selSvc = id; G.dirty = true; serviceView(); };
    var f = $('#obSvc'); if (f) { bindUploads(f, 'onb-svc-');
      $('#obSvUp').onclick = function () { collect(); move(cfg.services, G.selSvc, -1); G.dirty = true; serviceView(); }; $('#obSvDn').onclick = function () { collect(); move(cfg.services, G.selSvc, 1); G.dirty = true; serviceView(); };
      $('#obSvDel').onclick = function () { if (!confirm('이 서비스를 삭제할까요?')) return; cfg.services = cfg.services.filter(function (x) { return x.id !== G.selSvc; }); G.selSvc = cfg.services[0] && cfg.services[0].id; G.dirty = true; serviceView(); }; }
  }

  /* ── 슬라이드 툰 ── */
  function scenesView() { scenesView0(); bindScenes(); }
  function bindScenes() {
    var cfg = G.cfg, hon = (cfg.honorific || '귀인');
    (cfg.scenes || []).forEach(function (sc, i) {
      var f = $('#obS' + i); if (!f) return;
      bindUploads(f, 'onb-scene-');
      var st = $('.ob-sstage[data-stage="' + i + '"]'); if (!st) return;
      var upd = function () {
        var bg = f.elements.bg ? f.elements.bg.value.trim() : '', im = f.elements.image ? f.elements.image.value.trim() : '', ln = ((f.elements.lines && f.elements.lines.value) || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean)[0] || '';
        st.querySelector('.ob-sbg').style.backgroundImage = bg ? 'url("' + bg.replace(/["\\]/g, '') + '")' : '';
        var ch = st.querySelector('.ob-sch'); if (im) { ch.src = im; ch.style.display = 'block'; } else { ch.removeAttribute('src'); ch.style.display = 'none'; }
        st.querySelector('.ob-sbub').textContent = ln.replace(/\{이름귀인\}/g, '홍길동 ' + hon).replace(/\{귀인\}/g, hon) || '(수련생 대사가 여기에 표시됩니다)';
      };
      f.addEventListener('input', upd); upd();
    });
  }
  function scenesView0() {
    var cfg = G.cfg, FACES = O.FACES, fo = function (cur) { return Object.keys(FACES).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + FACES[k] + '</option>'; }).join(''); };
    var BUB = { '': '기본', glass: '반투명', ink: '먹빛(진하게)' };
    $('#obBody').innerHTML = '<div class="card"><form id="obSceneMeta" onsubmit="return false"><div class="ob-g2"><label class="ob-f">진행률 문구 ({n} 현재 단계 · {total} 전체 · {title} 장면 제목)<input type="text" name="progress" value="' + esc(cfg.progressLabel || '{n} / {total} · {title}') + '"></label>' +
      '<p class="ob-lock">완료 후 이동은 흐름·운영 설정에서 공통으로 관리합니다. 현재: ' + esc(window.Quest.destination(cfg) === 'home' ? '개인화 홈' : '운명의 타임라인') + '</p></div></form></div>' +
      cfg.scenes.map(function (s, i) {
        var req = REQ.indexOf(s.field) >= 0;
        return '<div class="card"><h3 style="font-size:1rem">' + (i + 1) + '. ' + esc(s.title) + ' <span class="ob-lock">입력: ' + esc(s.field) + (req ? ' · 필수(끌 수 없음, 계산 연결 고정)' : '') + '</span></h3><form id="obS' + i + '" onsubmit="return false">' +
          '<label class="ob-f">장면 제목 (진행률 줄에 표시)<input type="text" name="title" value="' + esc(s.title) + '"></label>' +
          '<label class="ob-f">수련생 대사 (한 줄이 한 말풍선 문단 · {귀인} {이름귀인} 사용)<textarea name="lines">' + esc((s.lines || []).join('\n')) + '</textarea></label>' +
          (s.field === 'time' ? '<label class="ob-f">시각을 모를 때 대사<textarea name="unk" style="min-height:60px">' + esc((s.unknownLines || []).join('\n')) + '</textarea></label>' : '') +
          '<label class="ob-f">입력 안내 문구 (일반 한국어)<input type="text" name="hint" value="' + esc(s.hint || '') + '"></label>' +
          '<div class="ob-g2"><label class="ob-f">버튼 문구<input type="text" name="button" value="' + esc(s.button || '') + '"></label><label class="ob-f">캐릭터 표정(연출)<select name="face">' + fo(s.face) + '</select></label></div>' +
          '<div class="ob-g2"><label class="ob-f">캐릭터 이미지 (주소 입력 또는 파일 올리기)<input type="text" name="image" value="' + esc(s.image || '') + '"><input type="file" data-up="image" accept="image/*"></label>' +
          '<label class="ob-f">배경 이미지 (주소 입력 또는 파일 올리기)<input type="text" name="bg" value="' + esc(s.bg || '') + '"><input type="file" data-up="bg" accept="image/*"></label></div>' +
          '<div class="ob-sstage" data-stage="' + i + '"><div class="ob-sbg"></div><img class="ob-sch" alt=""><div class="ob-sbub"></div><span class="ob-lock ob-sph">장면 미리보기 · 배경 위에 캐릭터와 첫 대사가 이렇게 놓입니다</span></div>' +
          '<label class="ob-f">대화창 스타일<select name="bubble">' + sel(BUB, s.bubble || '') + '</select></label>' +
          chk('enabled', s.enabled !== false || req, '사용' + (req ? ' (필수 단계 — 끌 수 없음)' : '')).replace('<input type="checkbox"', '<input type="checkbox"' + (req ? ' disabled' : '')) + '</form></div>';
      }).join('') + '<div class="card"><h3 style="font-size:1rem">계산 완료 후 수련생 대사</h3><textarea id="obReveal" style="min-height:90px">' + esc((cfg.revealLines || []).join('\n')) + '</textarea>' +
      '<p class="ob-lock">장면 이동·진행률 계산·입력 검증·저장은 코드가 담당합니다. 문구를 고쳐도 필수 입력값 검증과 데이터 저장 로직은 바뀌지 않습니다. 금지 호칭(대공·소협·대협)을 넣어도 호칭 설정에서 \'님\'으로 되돌립니다.</p></div>';
  }

  /* ── 호칭·가중치 ── */
  function basicView() {
    var cfg = G.cfg;
    $('#obBody').innerHTML = '<div class="card"><form id="obBasic" onsubmit="return false"><label class="ob-f ob-ck"><input type="checkbox" name="force"' + (cfg.forceOnboarding !== false ? ' checked' : '') + '> 개발 단계: 재방문자도 접속할 때마다(세션당 1회) 온보딩부터 보여 주기</label><p class="ob-lock">출시 전에 꺼 주세요. 끄면 프로필이 있는 방문자는 곧바로 홈으로 갑니다.</p><label class="ob-f">사용자 호칭 (모든 대사의 {귀인})<input type="text" name="honorific" maxlength="8" value="' + esc(cfg.honorific) + '"></label>' +
      '<p class="ob-lock">기본값은 \'님\'입니다. 이름을 묻는 첫 질문은 호칭 없이, 입력한 뒤에는 "[이름] 님"으로 부릅니다. \'대공·소협·대협\'은 저장되지 않습니다.</p>' +
      '<div class="ob-g2"><label class="ob-f">실제 연구 노출 가중치(예전 후킹 풀)<input type="text" name="wr" inputmode="numeric" value="' + esc(cfg.weights.research) + '"></label><label class="ob-f">유명인 사례 노출 가중치(예전 후킹 풀)<input type="text" name="wc" inputmode="numeric" value="' + esc(cfg.weights.celebrity) + '"></label></div>' +
      '<p class="ob-lock">가중치는 "연구→유명인 후킹" 섹션이 켜졌을 때만 쓰입니다. 같은 유형 안에서는 사례별 가중치로 고릅니다.</p>' +
      '<label class="ob-f">후킹: 연구 → 유명인 연결 문장<textarea name="bc" style="min-height:60px">' + esc((cfg.bridge && cfg.bridge.toCelebrity) || '') + '</textarea></label><label class="ob-f">후킹: 유명인 → 명리학 연결 문장<textarea name="bi" style="min-height:60px">' + esc((cfg.bridge && cfg.bridge.toIntro) || '') + '</textarea></label></form></div>';
  }

  /* ── 통계: 기간·기기 필터. 이벤트 건수와 "세션 수"를 구분한다 ── */
  function kstDay(offset) { return new Date(Date.now() + 9 * 3600e3 - (offset || 0) * 86400e3).toISOString().slice(0, 10); }
  function sumStats(s) {
    var dev = G.dev, per = G.period, add = function (a, b) { Object.keys(b || {}).forEach(function (k) { a[k] = (a[k] || 0) + b[k]; }); return a; };
    if (per === 'all') return dev === 'all' ? Object.assign({}, s.total || {}) : Object.assign({}, (s.byDev || {})[dev] || {});
    var n = +per, from = kstDay(n - 1), out = {};
    Object.keys(dev === 'all' ? (s.days || {}) : (s.daysDev || {})).forEach(function (day) { if (day >= from) add(out, dev === 'all' ? s.days[day] : (s.daysDev[day] || {})[dev]); });
    return out;
  }
  function statsView() {
    $('#obBody').innerHTML = '<div class="card"><p class="muted">불러오는 중…</p></div>';
    C.api('/api/onboarding?stats=1').then(function (d) {
      var s = G.stats = d.stats || { total: {}, byCase: {}, days: {} }; var t = sumStats(s);
      var pc = function (a, b) { return b ? Math.round(a / b * 1000) / 10 + '%' : '-'; }, n = function (k) { return t[k] || 0; };
      var funnel = [['landing_view', '랜딩 진입(세션)'], ['research_section_view', '연구 섹션 도달'], ['myeongri_section_view', '명리학 섹션 도달'], ['service_section_view', '서비스 소개 도달'], ['landing_cta_click', 'CTA 클릭(모든 위치)'], ['birth_input_start', '출생정보 입력 시작'], ['birth_input_complete', '입력 완료'], ['calculation_success', '계산 성공'], ['home_view', '홈 도달'], ['free_content_click', '무료 콘텐츠 이용'], ['paid_report_view', '유료 리포트 조회'], ['purchase_complete', '구매 완료']];
      var base = n('landing_view') || n('onboarding_view');
      var rows = funnel.map(function (r) { var v = n(r[0]); return '<div class="ob-bar2"><span>' + r[1] + '</span><i style="width:' + (base ? Math.min(100, v / base * 100) : 0) + '%"></i><span>' + v + (base ? ' · ' + pc(v, base) : '') + '</span></div>'; }).join('');
      var steps = [['onboarding_view', '온보딩 진입'], ['research_detail_open', '연구 자세히 보기'], ['research_source_click', '연구 원문 클릭'], ['onboarding_source_click', '출처 클릭(예전)'], ['onboarding_intro_complete', '흐름 끝까지 도달'], ['onboarding_skip', '건너뛰기'], ['birth_input_step_complete', '단계 완료(합계)'], ['calculation_failure', '계산 실패'], ['tarot_start', '타로 시작'], ['ilju_video_play', '일주 보기'], ['calendar_open', '캘린더 열기'], ['movingtoon_preview_start', '무빙툰 진입'], ['movingtoon_preview_view', '무빙툰 미리보기 조회'], ['movingtoon_purchase_click', '구매 클릭']];
      var all = s.byCase || {}, secRows = Object.keys(all).filter(function (k) { return /^s-/.test(k); }).map(function (k) { var c = all[k], nm = k.replace(/^s-/, ''); return '<tr><td>' + esc(nm) + '</td><td>' + (c.research_section_view || c.myeongri_section_view || c.service_section_view || 0) + '</td><td>' + (c.landing_cta_click || 0) + '</td><td>' + (c.movingtoon_preview_view || 0) + '</td><td>' + (c.free_content_click || 0) + '</td></tr>'; }).join('');
      var caseRows = Object.keys(all).filter(function (k) { return !/^s-/.test(k); }).map(function (id) { var c = all[id], cs = G.cfg.cases.filter(function (x) { return x.id === id; })[0]; return '<tr><td>' + esc(cs ? cs.title : id) + '</td><td>' + (c.onboarding_card_impression || 0) + '</td><td>' + (c.research_detail_open || 0) + '</td><td>' + ((c.research_source_click || 0) + (c.onboarding_source_click || 0)) + '</td><td>' + (c.onboarding_next_story_click || 0) + '</td></tr>'; }).join('');
      var sp = function (name, map, cur) { return '<select id="' + name + '">' + sel(map, cur) + '</select>'; };
      $('#obBody').innerHTML = '<div class="card"><div class="ob-bar">기간 ' + sp('obPer', { all: '전체(누적)', 7: '최근 7일', 14: '최근 14일', 30: '최근 30일' }, String(G.period)) + ' 기기 ' + sp('obDev', { all: '전체', m: '모바일', d: 'PC' }, G.dev) + '</div>' +
        '<h3 style="font-size:1rem">전환 흐름</h3><div class="ob-bars">' + rows + '</div>' +
        '<p class="ob-lock">· 퍼센트는 "랜딩 진입" 대비입니다.<br>· <b>세션 수 ≠ 방문자 수</b>: 랜딩 진입(landing_view)은 브라우저 탭 세션당 한 번 기록하며, 사람 수(고유 방문자)는 집계하지 않습니다. 나머지는 이벤트 건수라 같은 사람이 여러 번 누르면 여러 건입니다.<br>· 기기·기간 구분은 이 기능을 배포한 시점부터 쌓입니다. 이전 기간은 전체 합계만 있고, 비어 있는 값은 "-"가 아니라 0건으로 보입니다(과거 데이터를 만들어 내지 않습니다).<br>· 구매 완료는 결제 시스템이 연결되기 전까지 0입니다. 이름·출생정보는 집계하지 않습니다.</p></div>' +
        '<div class="card"><h3 style="font-size:1rem">단계별 이벤트 건수</h3><table class="ob-t"><tr><th>이벤트</th><th>건수</th></tr>' + steps.map(function (r) { return '<tr><td>' + r[1] + '</td><td>' + n(r[0]) + '</td></tr>'; }).join('') + '</table>' +
        '<p class="ob-lock">입력 이탈률 = 1 − 입력 완료 ÷ 입력 시작 = ' + (n('birth_input_start') ? pc(n('birth_input_start') - n('birth_input_complete'), n('birth_input_start')) : '-') + ' · 온보딩 이탈률 = 1 − 입력 시작 ÷ 랜딩 진입 = ' + (base ? pc(base - n('birth_input_start'), base) : '-') + '</p></div>' +
        '<div class="card"><h3 style="font-size:1rem">섹션별 <span class="ob-lock">(누적 · 기간·기기 필터 미적용)</span></h3><table class="ob-t"><tr><th>섹션 id</th><th>도달</th><th>CTA 클릭</th><th>미리보기 조회</th><th>무료 콘텐츠</th></tr>' + (secRows || '<tr><td colspan="5" class="muted">아직 기록이 없습니다.</td></tr>') + '</table></div>' +
        '<div class="card"><h3 style="font-size:1rem">사례별 반응 <span class="ob-lock">(누적)</span></h3><table class="ob-t"><tr><th>사례</th><th>노출</th><th>자세히 보기</th><th>원문 클릭</th><th>다음 이야기</th></tr>' + (caseRows || '<tr><td colspan="5" class="muted">아직 기록이 없습니다.</td></tr>') + '</table></div>';
      $('#obPer').onchange = function () { G.period = this.value; statsView(); }; $('#obDev').onchange = function () { G.dev = this.value; statsView(); };
    }).catch(function (e) { $('#obBody').innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p></div>'; });
  }

  /* ── 미리보기·게시 관리: 상태, 게시·공개 중지, 이력 복원 ── */
  function publishView() {
    var pubCases = O.publicCases(G.cfg.cases), all = G.cfg.cases.map(O.normalizeCase);
    var pending = all.filter(function (c) { return c.verification.state !== 'verified'; });
    $('#obBody').innerHTML = '<div class="card"><h3 style="font-size:1rem">게시 상태</h3><table class="ob-t"><tr><th>공개본 버전</th><td>' + esc(G.liveVersion || '(저장된 공개본 없음 — 코드 기본 문구)') + '</td></tr><tr><th>마지막 게시</th><td>' + fmtT(G.liveAt) + '</td></tr><tr><th>초안 버전</th><td>' + esc(G.version || '-') + '</td></tr><tr><th>초안 마지막 수정</th><td>' + fmtT(G.draftAt) + '</td></tr>' +
      '<tr><th>상태</th><td>' + (G.dirty ? '저장하지 않은 변경 있음' : G.srvDirty ? '초안이 공개본과 다릅니다 — 게시하면 반영' : '공개본과 같음') + '</td></tr>' +
      '<tr><th>공개될 사례</th><td>' + pubCases.length + '건 (출생 시기 연구 카드 ' + O.birthCards(G.cfg.cases).length + '건) · 검증 전·보류·반려 ' + pending.length + '건은 공개되지 않습니다</td></tr></table>' +
      '<div class="ob-bar"><button id="obPub2">초안 저장 후 게시</button><button id="obPrev2" class="ghost">미리보기 열기</button><button id="obDisc" class="ghost">초안 버리기</button><button id="obUnpub" class="ghost">공개 중지</button></div>' +
      '<p class="ob-lock">공개 중지: 관리자가 저장한 공개본을 걷어 내고 방문자에게는 코드 기본 문구를 보여 줍니다. 이전 공개본은 이력에 남습니다. 특정 섹션만 숨기려면 위 흐름에서 "표시"를 끄세요.</p></div>' +
      '<div class="card"><h3 style="font-size:1rem">변경 이력 <span class="ob-lock">· 게시·공개 중지 직전의 공개본 최근 20개</span></h3><div id="obHist"><p class="muted">불러오는 중…</p></div></div>';
    $('#obPub2').onclick = publish; $('#obDisc').onclick = discard; $('#obUnpub').onclick = unpublish; $('#obPrev2').onclick = function () { G.prev.on = true; drawPrev(); window.scrollTo(0, 0); };
    C.api('/api/onboarding?hist=1').then(function (d) {
      G.hist = d.hist || [];
      $('#obHist').innerHTML = G.hist.length ? '<table class="ob-t"><tr><th>시각</th><th>버전</th><th>내용</th><th></th></tr>' + G.hist.map(function (h) { return '<tr><td>' + fmtT(h.at) + '</td><td>' + esc(h.version) + '</td><td>' + esc(h.note || '') + '</td><td><button class="ghost" data-rs="' + esc(h.id) + '">초안으로 복원</button></td></tr>'; }).join('') + '</table><p class="ob-lock">복원하면 그 시점의 설정이 "초안"으로 올라옵니다. 확인 후 게시해야 방문자에게 반영됩니다.</p>' : '<p class="muted">아직 이력이 없습니다. 게시하면 직전 공개본이 여기에 남습니다.</p>';
      $$('[data-rs]').forEach(function (b) { b.onclick = function () { if (!confirm('이 시점의 설정을 초안으로 복원할까요? 현재 초안은 덮어써집니다.')) return; act('restore', b.dataset.rs).then(function () { toast('초안으로 복원했습니다 — 확인 후 게시하세요'); return load(); }).then(draw).catch(function (e) { toast(e.message, true); }); }; });
    }).catch(function (e) { $('#obHist').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  // 확장 모듈이 같은 초안·게시·이력 체계를 그대로 쓰도록 내부 도구를 건네 준다
  window.V2Onboard = { open: open, register: function (x) { EXT.push(x); }, tools: function () { return { styBox: styBox, readSty: readSty, G: G, C: C, esc: esc, toast: toast, $: $, $$: $$, sel: sel, chk: chk, lines: lines, markDirty: markDirty, draw: draw, upload: upload, bindUploads: bindUploads, uid: uid, fmtT: fmtT, putDraft: putDraft }; } };
})();
