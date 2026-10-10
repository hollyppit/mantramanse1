/* 운명 세계 지도 — 기존 챕터를 6개 테마 세계에 매핑하고, 세계별 탐험 상태·읽기 진행을 기기에 저장한다.
   챕터 내용·순서·ID 는 바꾸지 않는다. 세계 정의는 코드 기본값(DEFAULT_WORLDS) 위에 서버 저장본(/api/worlds, 관리자 편집)을 덮어 쓴다.
   ACT(각성·해독·운명 지도·선택·여정)는 전체 이용 흐름의 상위 개념으로 유지하고, 세계는 탐험 콘텐츠의 내비게이션이다.
   R.Explore.worldsModel(chapters, worlds, ended, last) → [{ world, items, done, total, state }]
   R.Explore.html(model, esc)  → 세계 지도 / 세계 상세 HTML          검증: node tests/explore-sim.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var ACTS = [
    { id: 1, roman: 'ACT 01', title: '각성', line: '나의 기운이 깨어나다' },
    { id: 2, roman: 'ACT 02', title: '해독', line: '나는 어떤 사람인가' },
    { id: 3, roman: 'ACT 03', title: '운명 지도', line: '내 인생의 흐름' },
    { id: 4, roman: 'ACT 04', title: '선택', line: '내 인생의 주요 질문' },
    { id: 5, roman: 'ACT 05', title: '여정', line: '앞으로의 나침반' },
  ];
  // 기존 문서의 막(life-doc act id) → ACT. 일주 캐릭터 영상(c-char)은 ACT 01.
  var LIFE_ACT = { 1: 3, 2: 2, 3: 2, 4: 4, 5: 3, 6: 5 }, CLASSIC_ACT = { 1: 2, 2: 4, 3: 4, 4: 3, 5: 5 };
  function actOf(c, flow) {
    if (c && c.id === 'c-char') return 1;
    return (flow === 'classic' ? CLASSIC_ACT : LIFE_ACT)[c && c.act] || (flow === 'classic' ? 4 : 2);
  }

  /* ── 세계 기본 정의. match: 챕터 base/id 를 검사하는 정규식 문자열(첫 번째로 맞는 세계). chapters: 관리자가 직접 연결한 챕터 ID(우선). ── */
  var DEFAULT_WORLDS = [
    { id: 'w1', order: 1, name: '천명의 서고', line: '나의 본질과 타고난 기질', desc: '사주 원국, 일간·일주, 오행과 십성, 강약과 뿌리, 강점과 그림자를 읽습니다.', color: '#1B2347', accent: '#8FA6E8', icon: '📜',
      match: ['^c-char', '^c0[1-5]$', '^life_(self_who|tengods|stars)$', '^deep_(car|proscons|stages)$', '^life_ik_SELF'] },
    { id: 'w2', order: 2, name: '황금의 성채', line: '직업 · 재물 · 성공', desc: '직업 적성, 유리한 업종과 불리한 업종, 사업과 독립, 재물 흐름을 읽습니다.', color: '#3A2C0E', accent: '#E3B341', icon: '🏯',
      match: ['^c0[678]$', '^life_(career_style|money_nature|career_timing|money_timing)$', '^deep_(jobs|wealth)$', '^life_ik_(MONEY|CAREER)'] },
    { id: 'w3', order: 3, name: '인연의 정원', line: '사랑과 인간관계', desc: '연애 성향, 결혼과 배우자, 대인관계, 가족과 자녀, 궁합을 읽습니다.', color: '#3A1B2A', accent: '#E58AA8', icon: '🌸',
      match: ['^c(09|1[0-3])$', '^life_(love_style|marriage_who|relation_style|love_timing|marriage_timing|relation_timing)$', '^deep_(love|spouse|marriage|children|ilju)$', '^life_ik_(LOVE|MARRIAGE|RELATIONSHIP)'] },
    { id: 'w4', order: 4, name: '시간의 회랑', line: '인생의 흐름과 변화', desc: '대운·세운·월운과 인생의 전환점, 시기별 운의 흐름을 읽습니다.', color: '#102B33', accent: '#6FD0D8', icon: '⏳',
      match: ['^c(00|1[5-8])$', '^life_(prologue|here|future)$', '^deep_(daewoon|seun|wolun)$', '^life_ik_TIMING'] },
    { id: 'w5', order: 5, name: '윤회의 문', line: '전생과 상징적 서사', desc: '전생의 정체와 업보를 현재의 기질과 이어서 읽는 상징적 이야기입니다. 역사적 사실이나 검증된 개인 정보가 아닙니다.', color: '#241636', accent: '#B58CF0', icon: '🌀',
      notice: '사주 상징을 모티브로 한 창작 판타지 콘텐츠입니다.', match: ['^c14$', '^deep_past$'] },
    { id: 'w6', order: 6, name: '개운의 성역', line: '앞으로의 선택과 행동', desc: '개운법, 운동·자기계발, 행운 명소, 생활 습관과 종합 행동 가이드를 정리합니다.', color: '#12301F', accent: '#7ED69A', icon: '⛩',
      match: ['^c(19|20)$', '^life_(action|actions)$', '^deep_(remedy|places|health)$', '^life_ik_ACTION'] },
  ];
  // 어느 세계에도 안 맞는 챕터가 사라지지 않도록, 막 기준 대체 세계
  var FALLBACK_WORLD = { 1: 'w4', 2: 'w1', 3: 'w1', 4: 'w2', 5: 'w4', 6: 'w6' };

  function mergeWorlds(saved) {
    var by = {}; DEFAULT_WORLDS.forEach(function (w) { by[w.id] = Object.assign({ enabled: true, access: 'free', chapters: [] }, w); });
    (saved || []).forEach(function (s) {
      if (!s || !s.id) return;
      var b = by[s.id] || { id: s.id, enabled: true, access: 'free', chapters: [], match: [], order: 99 };
      Object.keys(s).forEach(function (k) { if (s[k] !== '' && s[k] != null && !(Array.isArray(s[k]) && !s[k].length && k === 'chapters')) b[k] = s[k]; });
      if (s.enabled === false) b.enabled = false; if (s.access === 'paid') b.access = 'paid';
      if (Array.isArray(s.chapters) && s.chapters.length) b.match = []; // 관리자가 챕터를 직접 연결하면 기본 규칙 대신 그것만 쓴다
      by[s.id] = b;
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  function worldFor(c, worlds, flow) {
    var id = c.id, base = c.base || c.id, i, w, j;
    for (i = 0; i < worlds.length; i++) if (worlds[i].chapters && worlds[i].chapters.indexOf(id) >= 0) return worlds[i].id;
    for (i = 0; i < worlds.length; i++) {
      w = worlds[i]; if (w.chapters && w.chapters.length) continue;
      for (j = 0; j < (w.match || []).length; j++) { var re = new RegExp(w.match[j]); if (re.test(id) || re.test(base)) return w.id; }
    }
    return FALLBACK_WORLD[c.act] || 'w1';
  }

  /* 세계별 챕터·진행. 비활성 세계의 챕터는 가장 가까운 활성 세계로 옮기지 않고 숨긴다(관리자가 끈 것). */
  function worldsModel(chapters, worlds, ended, last) {
    var by = {}; worlds.forEach(function (w) { by[w.id] = []; });
    (chapters || []).forEach(function (c, i) {
      var wid = worldFor(c, worlds, 'life'); if (!by[wid]) wid = worlds.length ? worlds[0].id : null; if (!wid) return;
      by[wid].push({ index: i, id: c.id, no: c.no || i + 1, title: c.title || '', sub: c.subtitle || c.headline || '' });
    });
    return worlds.filter(function (w) { return w.enabled !== false && by[w.id].length; }).map(function (w) {
      var items = by[w.id], done = items.filter(function (x) { return ended && ended[x.id]; }).length, touched = done > 0 || items.some(function (x) { return x.index === last; });
      return { world: w, items: items, done: done, total: items.length, state: done === items.length ? 'done' : touched ? 'doing' : 'new' };
    });
  }

  /* ── 진행 저장: 기기 안에서만(서버로 보내지 않는다) ── */
  var PREFIX = 'mt_v2_xp_';
  function load(key) {
    var o = null; try { o = JSON.parse(localStorage.getItem(PREFIX + key) || 'null'); } catch (e) { o = null; }
    return { ended: (o && o.ended && typeof o.ended === 'object') ? o.ended : {}, seen: (o && o.seen && typeof o.seen === 'object') ? o.seen : {}, checks: (o && o.checks && typeof o.checks === 'object') ? o.checks : {}, last: o && typeof o.last === 'number' ? o.last : -1, auto: !o || o.auto !== false };
  }
  function save(key, st) { try { localStorage.setItem(PREFIX + key, JSON.stringify({ ended: st.ended || {}, seen: st.seen || {}, checks: st.checks || {}, last: st.last, auto: st.auto !== false, t: Date.now() })); } catch (e) { /* 저장이 막혀도 읽기는 계속된다 */ } }

  function progress(chapters, ended) {
    var total = (chapters || []).length, done = (chapters || []).filter(function (c) { return ended && ended[c.id]; }).length;
    return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0 };
  }
  // 이어 읽을 위치: 마지막 챕터(안 끝났으면) → 그 뒤 첫 미완료 → 처음부터 첫 미완료 → 모두 읽었으면 -1
  function resumeIndex(chapters, st) {
    var ended = (st && st.ended) || {}, last = st && typeof st.last === 'number' ? st.last : -1, n = chapters.length, i;
    if (last >= 0 && last < n && !ended[chapters[last].id]) return last;
    for (i = Math.max(last + 1, 0); i < n; i++) if (!ended[chapters[i].id]) return i;
    for (i = 0; i < n; i++) if (!ended[chapters[i].id]) return i;
    return -1;
  }

  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var STATE = { new: '탐험 가능', doing: '탐험 중', done: '탐험 완료' };
  var wstyle = function (w) { return ' style="--wc:' + E(w.color || '#1B2347') + ';--wa:' + E(w.accent || '#D5B97F') + (w.bgImage ? ';--wbg:url(' + E(w.bgImage) + ')' : '') + '"'; };

  function html(m, esc) {
    esc = esc || E; var p = m.progress, nm = m.name ? esc(m.name) + '님의 운명 세계' : '나의 운명 세계', h = '<div class="xp' + (m.mode === 'world' ? ' xp-wv' : '') + '">';
    if (m.mode === 'world') {
      var g = m.current, w = g.world;
      h += '<section class="xp-wd"' + wstyle(w) + '><p class="kicker">WORLD ' + esc(String(w.order || '')) + '</p><h2 class="xp-h">' + esc(w.icon || '') + ' ' + esc(w.name) + '</h2><p class="xp-sum">' + esc(w.line) + '</p>' +
        (w.desc ? '<p class="xp-desc">' + esc(w.desc) + '</p>' : '') + (w.notice ? '<p class="xp-note" role="note">' + esc(w.notice) + '</p>' : '') + (m.widget || '') +
        '<p class="xp-pn">' + g.done + ' / ' + g.total + '개 챕터 읽음 · 위쪽 탭에서 챕터를 바로 고를 수 있습니다</p>';
      var nx = g.items.filter(function (x) { return !m.ended[x.id]; })[0] || g.items[0];
      if (nx) h += '<div class="xp-cta"><button type="button" class="btn big gold" data-xgo="' + nx.index + '">' + (g.done ? '이어서 읽기' : '읽기 시작하기') + '</button></div>';
      return h + '</section></div>';
    }
    h += '<p class="kicker">運路 · WORLD MAP</p><h2 class="xp-h">' + nm + '</h2><p class="xp-sum">가고 싶은 세계를 골라 탐험하세요. 순서는 정해져 있지 않습니다.</p>' +
      '<div class="xp-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.pct + '" aria-label="전체 탐험 진행률"><i style="width:' + p.pct + '%"></i></div><p class="xp-pn">' + p.done + ' / ' + p.total + '개 챕터 읽음</p>';
    h += '<div class="xp-cta">' + (m.resume >= 0 ? '<button type="button" class="btn big gold" data-xgo="' + m.resume + '">' + (p.done ? '이어서 읽기' : '처음부터 읽기') + '</button>' : '<button type="button" class="btn big gold" data-xgo="0">처음부터 다시 읽기</button>') + '</div>';
    h += '<label class="xp-auto"><input type="checkbox" id="xAuto"' + (m.auto ? ' checked' : '') + '><span>자동으로 넘겨 읽기' + (m.rate && m.rate > 1 ? ' (' + m.rate + '배속)' : '') + '</span></label><ol class="xp-map">';
    m.worlds.forEach(function (g) {
      var w = g.world;
      h += '<li><button type="button" class="xp-w st-' + g.state + '" data-xw="' + esc(w.id) + '"' + wstyle(w) + '><span class="xp-wi" aria-hidden="true">' + esc(w.icon || '') + '</span>' +
        '<span class="xp-wt"><b>' + esc(w.name) + '</b><small>' + esc(w.line) + '</small></span>' +
        '<span class="xp-wb"><i class="xp-st">' + STATE[g.state] + '</i>' + (w.access === 'paid' ? '<i class="xp-paid">유료</i>' : '') + '<em>' + g.done + '/' + g.total + '</em></span></button></li>';
    });
    return h + '</ol><p class="fine">사주는 참고용 콘텐츠이며 미래를 단정하지 않습니다.</p></div>';
  }

  R.Explore = { ACTS: ACTS, DEFAULT_WORLDS: DEFAULT_WORLDS, actOf: actOf, mergeWorlds: mergeWorlds, worldFor: worldFor, worldsModel: worldsModel, load: load, save: save, progress: progress, resumeIndex: resumeIndex, html: html };
})(typeof window !== 'undefined' ? window : globalThis);
