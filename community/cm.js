/* 인연의 광장(3단계 MVP, 디자인 v3 "월하연(月下緣)" 2026-11-16: 달빛·벚꽃·붉은 실·한지·인장) — 한 페이지 화면. 서버: /api/community/{posts,post,comments,react,report,block,me}, /api/account/profile
   주소(#):  #/ 오늘의 인연(5단계, 홈) · #/match/inbox 인연함 · #/match/edit 인연 프로필 · #/verify 성인 본인확인 · #/chat 대화 목록 · #/chat/<방> 대화 · #/plaza 광장 피드 · #/today 오늘의 운테크·기록(4단계) · #/records 회고 · #/search 검색 · #/groups 모임 · #/g/ilju/<갑자>·#/g/ilgan/<갑> 모임 피드 · #/p/<id> 글 · #/write · #/edit/<id> · #/me 나
   로그인은 심층 분석과 같은 Supabase 세션(localStorage sb-*-auth-token)을 읽어 x-member-token 으로 보낸다. 출생 정보는 저장하지 않는다(일주 확인 때 서버로 보내 계산만). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var CATS = { wealth: '재물', love: '연애', work: '직장', people: '인간관계', daily: '일상' };
  var CAT_HJ = { wealth: '財', love: '戀', work: '業', people: '人', daily: '日' };   // 게시판 인장
  var HJ = { '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊', '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸' };
  var REASONS = { spam: '광고·도배', abuse: '욕설·비방', sexual: '음란·불쾌', privacy: '개인정보 노출', scam: '사기·금전 요구', etc: '기타' };
  var STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var EL = { '갑': 'wood', '을': 'wood', '병': 'fire', '정': 'fire', '무': 'earth', '기': 'earth', '경': 'metal', '신': 'metal', '임': 'water', '계': 'water' };
  var EL_KO = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
  var view = $('#view'), ME = null, mePromise = null;
  var track = function (n, p) { try { if (window.gtag) window.gtag('event', n, p || {}); } catch (e) { } };
  try { localStorage.setItem('mt_last_service', 'community'); } catch (e) { }

  var ICON = {
    heart: '<svg class="i" viewBox="0 0 24 24"><path d="M12 11.5C9.6 8 5 8.4 5 11.2s4.4 3.3 7 .3c2.6 3 7 2.5 7-.3S14.4 8 12 11.5z"/><path d="M12 11.5c-.6 2.6-2.2 5.6-4.6 8M12 11.5c.6 2.6 2.2 5.6 4.6 8"/></svg>',   // 매듭(공감)
    chat: '<svg class="i" viewBox="0 0 24 24"><path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12z"/></svg>',
    save: '<svg class="i" viewBox="0 0 24 24"><path d="M6 4h12v16l-6-4-6 4z"/></svg>',
    flag: '<svg class="i" viewBox="0 0 24 24"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>',
    block: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m6.5 6.5 11 11"/></svg>',
    edit: '<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    trash: '<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    back: '<svg class="i" viewBox="0 0 24 24"><path d="m14 6-6 6 6 6"/></svg>',
    send: '<svg class="i" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    search: '<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  };

  function token() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (!/^sb-[\w-]+-auth-token$/.test(k)) continue;
        var s = JSON.parse(localStorage.getItem(k) || 'null'), t = s && (s.access_token || (s.currentSession && s.currentSession.access_token));
        var exp = s && (s.expires_at || (s.currentSession && s.currentSession.expires_at));
        if (t && (!exp || exp * 1000 > Date.now() + 30000)) return t;
      }
    } catch (e) { }
    return '';
  }
  function api(path, opt) {
    opt = opt || {}; var h = { 'content-type': 'application/json' }, t = token(); if (t) h['x-member-token'] = t;
    return fetch(path, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined, credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._s = r.status; d._ok = r.ok; if (d.error === 'community-closed') location.href = '/gate/?community=closed'; return d; }); })
      .catch(function () { return { _s: 0, _ok: false, error: '인터넷 연결을 확인해 주세요' }; });
  }
  function toast(t) { var e = document.createElement('div'); e.className = 'toast'; e.setAttribute('role', 'status'); e.textContent = t; document.body.appendChild(e); setTimeout(function () { e.remove(); }, 2600); }
  function when(t) {
    var d = Date.parse(t); if (!d) return ''; var s = (Date.now() - d) / 1000;
    if (s < 60) return '방금'; if (s < 3600) return Math.floor(s / 60) + '분'; if (s < 86400) return Math.floor(s / 3600) + '시간'; if (s < 86400 * 7) return Math.floor(s / 86400) + '일';
    return new Date(d).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });
  }
  // 아바타: 닉네임 첫 글자 + 공개한 일주·일간의 오행 색(없으면 기본 분홍)
  function elOf(a) { var k = a && (a.ilju || a.ilgan); return k ? EL[k.charAt(0)] : ''; }
  function ava(a, sm) { if (!a || a.gone) return '<span class="ava gone' + (sm ? ' sm' : '') + '" aria-hidden="true"><span>·</span></span>'; var e = elOf(a), img = a.avatar && /^(\/api\/|https:\/\/)/.test(a.avatar) ? '<img src="' + esc(a.avatar) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : ''; return '<span class="ava' + (sm ? ' sm' : '') + (e ? ' el-' + e : '') + '" aria-hidden="true"><span>' + esc(String(a.name || '?').charAt(0)) + img + '</span></span>'; }
  function who(a) { if (!a) return ''; if (a.gone) return '<span class="who" style="color:var(--sumi-3)">탈퇴한 회원</span>'; return '<span class="who"><b>' + esc(a.name) + '</b>' + (a.ilju ? '<span class="pill">' + esc(a.ilju) + '</span>' : '') + (a.ilgan ? '<span class="pill">' + esc(a.ilgan) + '</span>' : '') + '</span>'; }
  function me() { if (!mePromise) mePromise = api('/api/community/me').then(function (d) { ME = d; return d; }); return mePromise; }
  function refreshMe() { mePromise = null; return me(); }
  function paint(html, tab) { view.innerHTML = html; window.scrollTo(0, 0); $$('.tabbar a').forEach(function (a) { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); var h = $('h1', view); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  function parseHash() { var h = location.hash.replace(/^#/, '') || '/', i = h.indexOf('?'), path = i >= 0 ? h.slice(0, i) : h, q = {}; if (i >= 0) h.slice(i + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), q: q }; }
  function qs(o) { var s = Object.keys(o).filter(function (k) { return o[k]; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&'); return s ? '?' + s : ''; }
  var empty = function (title, sub) { return '<div class="empty"><div class="art"></div><b>' + esc(title) + '</b>' + esc(sub || '') + '</div>'; };

  function needSetup(why) {
    if (!ME || !ME.member) { paint('<div class="panel"><h1>로그인이 필요해요</h1><p class="lead">인연의 광장은 심층 분석과 같은 계정으로 이용합니다. 로그인한 뒤 다시 들어와 주세요.</p><p style="margin-top:16px"><a class="btn" href="/report/#/me">로그인하러 가기</a></p></div>', 'me'); return true; }
    if (!ME.profile || !ME.profile.nickname) { setupView(why); return true; }
    return false;
  }

  /* ── 처음 설정: 닉네임 ── */
  function setupView(next) {
    var p = (ME && ME.profile) || {};
    paint('<div class="hero"><span class="kick">月下緣</span><h1>광장에서 쓸<br><em>이름</em>을 정해 주세요</h1><p>글과 댓글에는 닉네임만 보여요. 생년월일·이메일은 다른 회원에게 보이지 않습니다.</p></div>' +
      '<form class="form panel" id="setupForm"><label>닉네임 <span class="muted" style="font-weight:500">2~12자 · 한글·영문·숫자·밑줄</span><input name="nickname" maxlength="12" required autocomplete="nickname" value="' + esc(p.nickname || '') + '"></label>' +
      '<label class="check"><input type="checkbox" name="showIlju"' + (p.showIlju ? ' checked' : '') + '> 내 글에 일주 보이기 (예: 갑자)</label>' +
      '<label class="check"><input type="checkbox" name="showIlgan"' + (p.showIlgan ? ' checked' : '') + '> 내 글에 일간 보이기 (예: 갑목)</label>' +
      '<button class="btn pink block" type="submit">시작하기</button><p class="msg" id="setupMsg" role="status"></p></form>', 'me');
    $('#setupForm').onsubmit = function (e) {
      e.preventDefault(); var f = e.target.elements, m = $('#setupMsg'); m.className = 'msg'; m.textContent = '저장하는 중입니다…';
      api('/api/account/profile', { method: 'POST', body: { action: 'save', nickname: f.nickname.value.trim(), bio: '', visibility: 'members', showIlju: f.showIlju.checked, showIlgan: f.showIlgan.checked } }).then(function (d) {
        if (!d._ok) { m.className = 'msg err'; m.textContent = d.error || '저장하지 못했습니다.'; return; }
        track('plaza_setup'); refreshMe().then(function () { if (ME.profile && !ME.profile.ilju) location.hash = '#/me?ilju=1'; else location.hash = next || '#/'; route(); });
      });
    };
  }

  /* ── 홈 피드 ── */
  function stories() {
    var g = (ME && ME.groups) || {}, out = '';
    if (g.ilju) out += '<a class="story mine el-' + EL[g.ilju.key.charAt(0)] + '" href="#/g/ilju/' + encodeURIComponent(g.ilju.key) + '"><div class="ring"><span class="ko">' + esc(g.ilju.key) + '</span></div><small>내 일주</small></a>';
    else if (ME && ME.member) out += '<a class="story" href="#/me?ilju=1"><div class="ring"><span class="ko">＋</span></div><small>일주 찾기</small></a>';
    STEMS.forEach(function (s) { var mine = g.ilgan && g.ilgan.key === s; out += '<a class="story el-' + EL[s] + (mine ? ' mine' : '') + '" href="#/g/ilgan/' + encodeURIComponent(s) + '"><div class="ring"><span>' + HJ[s] + '</span></div><small>' + s + EL_KO[EL[s]] + (mine ? ' · 나' : '') + '</small></a>'; });
    return '<div class="stories" aria-label="일간 모임">' + out + '</div>';
  }
  function feedView(q, group) {
    var tab = q.tab === 'popular' ? 'popular' : 'latest', base = group ? '#/g/' + group.kind + '/' + encodeURIComponent(group.key) : '#/plaza';
    var link = function (o) { return base + qs(Object.assign({ tab: tab === 'popular' ? 'popular' : '', cat: q.cat || '', tag: q.tag || '' }, o)); };
    var head;
    if (group) {
      var g = ME && ME.groups && ME.groups[group.kind], mine = g && g.key === group.key, el = EL[group.key.charAt(0)];
      var label = group.kind === 'ilju' ? group.key + ' 일주' : group.key + EL_KO[el] + ' 일간';
      head = '<a class="back" href="#/groups">' + ICON.back + '모임</a><div class="gh el-' + el + '"><div class="gem">' + esc(group.key) + '</div><h1>' + esc(label) + ' 모임</h1><p class="lead">' + (mine ? '나와 같은 ' + (group.kind === 'ilju' ? '일주' : '일간') + '를 타고난 사람들의 이야기' : '읽기는 누구나, 글은 ' + esc(label) + '인 분들이 올려요') + '</p>' +
        (g && mine && g.gathering ? '<p class="note pink" style="margin-top:12px">아직 모이는 중이에요 · ' + (ME.minGroup || 5) + '명이 모이면 모임이 열려요. 그동안 모임 글은 홈에서도 함께 보여요.</p>' : '') + '</div>';
    } else {
      head = '<section class="hero"><canvas id="petals" aria-hidden="true"></canvas><svg class="thread" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 44 C 70 14, 130 58, 205 34 S 330 6, 410 26"/><circle cx="205" cy="34" r="3.5"/></svg><span class="kick">月下緣</span><h1>보이지 않는 실로<br><em>이어진 인연</em>들</h1><p>같은 일주·일간을 타고난 사람들이 달빛 아래 모여 오늘의 이야기를 나누는 곳이에요.</p><div class="cta"><a class="btn ghost sm" href="#/today">오늘의 운테크</a><a class="btn ghost sm" href="#/groups">모임 둘러보기</a></div></section>' + stories();
    }
    paint(head +
      '<div class="bar"><nav class="seg" aria-label="정렬"><a href="' + link({ tab: '' }) + '"' + (tab === 'latest' ? ' aria-current="page"' : '') + '>최신</a><a href="' + link({ tab: 'popular' }) + '"' + (tab === 'popular' ? ' aria-current="page"' : '') + '>인기</a></nav></div>' +
      '<div class="chips" role="group" aria-label="게시판"><a class="chip' + (!q.cat ? ' on' : '') + '" href="' + link({ cat: '' }) + '">전체</a>' + Object.keys(CATS).map(function (k) { return '<a class="chip' + (q.cat === k ? ' on' : '') + '" href="' + link({ cat: k }) + '"><span class="hj" aria-hidden="true">' + CAT_HJ[k] + '</span>' + CATS[k] + '</a>'; }).join('') + '</div>' +
      (q.tag ? '<p class="muted" style="margin:0 0 10px">#' + esc(q.tag) + ' 글만 보는 중 · <a href="' + link({ tag: '' }) + '">해제</a></p>' : '') +
      '<div id="list" aria-live="polite"><div class="skel"></div><div class="skel"></div></div><div id="more"></div>', 'plaza');
    var wl = $('.tabbar [data-tab="write"]'); if (wl) wl.href = '#/write' + (group ? qs({ group: group.kind }) : q.cat ? qs({ cat: q.cat }) : '');
    loadList({ tab: tab === 'popular' ? 'popular' : '', cat: q.cat || '', tag: q.tag || '', group: group ? group.kind + ':' + group.key : '' }, true);
    if (!group) petals();
  }
  function searchView(q) {
    paint('<h1 style="margin:6px 2px 14px">검색</h1><form class="search" id="srch" role="search" style="margin-bottom:14px">' + ICON.search + '<input name="q" type="search" placeholder="제목·내용 검색 (2자 이상)" value="' + esc(q.q || '') + '" aria-label="글 검색" autofocus></form><div id="list">' + (q.q ? '<div class="skel"></div>' : empty('무엇이 궁금하세요?', '예: 이직, 대운, 도화살')) + '</div><div id="more"></div>', '');
    $('#srch').onsubmit = function (e) { e.preventDefault(); var v = e.target.elements.q.value.trim(); if (v.length >= 2) location.hash = '#/search' + qs({ q: v }); };
    if (q.q) loadList({ q: q.q }, true);
  }
  function groupsView() {
    var g = (ME && ME.groups) || {};
    paint('<h1 style="margin:6px 2px 4px">모임</h1><p class="lead" style="margin:0 2px 16px">같은 기운을 타고난 사람들끼리 모여요</p>' +
      (g.ilju ? '<div class="grid2" style="margin-bottom:18px"><a class="group-card el-' + EL[g.ilju.key.charAt(0)] + '" href="#/g/ilju/' + encodeURIComponent(g.ilju.key) + '"><span class="gem">' + esc(g.ilju.key) + '</span><span><b>내 일주</b><small>' + (g.ilju.gathering ? '모이는 중' : g.ilju.size + '명') + '</small></span></a><a class="group-card el-' + EL[g.ilgan.key] + '" href="#/g/ilgan/' + encodeURIComponent(g.ilgan.key) + '"><span class="gem">' + esc(g.ilgan.key) + '</span><span><b>내 일간</b><small>' + (g.ilgan.gathering ? '모이는 중' : g.ilgan.size + '명') + '</small></span></a></div>'
        : '<a class="panel" href="#/me?ilju=1" style="display:block;text-decoration:none"><b>내 일주 모임 찾기 →</b><p class="muted" style="margin:4px 0 0">생년월일로 일주를 확인하면 내 모임이 열려요</p></a>') +
      '<div class="sec-h"><h2>일간 모임 10</h2></div><div class="grid2">' + STEMS.map(function (s) { return '<a class="group-card el-' + EL[s] + '" href="#/g/ilgan/' + encodeURIComponent(s) + '"><span class="gem">' + HJ[s] + '</span><span><b>' + s + EL_KO[EL[s]] + '</b><small>' + ({ wood: '나무의 기운', fire: '불의 기운', earth: '흙의 기운', metal: '쇠의 기운', water: '물의 기운' })[EL[s]] + '</small></span></a>'; }).join('') + '</div>', 'groups');
  }
  function card(p) {
    return '<a class="card" href="#/p/' + p.id + '"><div class="head">' + ava(p.author) + '<div class="meta">' + who(p.author) + '<div class="sub"><span>' + when(p.at) + '</span>·<span class="badge cat-' + esc(p.category) + '"><span class="hj" aria-hidden="true">' + (CAT_HJ[p.category] || '') + '</span>' + esc(p.catLabel) + '</span>' + (p.group ? '<span class="badge pink">' + esc(p.group.key) + (p.group.kind === 'ilju' ? ' 일주' : ' 일간') + '</span>' : '') + '</div></div></div>' +
      '<h3>' + esc(p.title) + '</h3><p class="ex">' + esc(p.excerpt) + '</p>' + (p.tags && p.tags.length ? '<div class="tags">' + p.tags.slice(0, 3).map(function (t) { return '<span class="tag">#' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="foot"><span class="' + (p.liked ? 'on' : '') + '">' + ICON.heart + p.likes + '</span><span>' + ICON.chat + p.comments + '</span><span class="save ' + (p.saved ? 'on' : '') + '" aria-label="' + (p.saved ? '저장함' : '') + '">' + ICON.save + '</span></div></a>';
  }
  function loadList(params, first, extra) {
    var box = $('#list'), more = $('#more'); if (!box) return;
    api('/api/community/posts' + qs(Object.assign({}, params, extra || {}))).then(function (d) {
      if (!d._ok) { box.innerHTML = '<p class="msg err">' + esc(d.error || '불러오지 못했습니다.') + '</p>'; return; }
      var html = d.items.map(card).join('');
      if (first) box.innerHTML = html || (params.q ? empty('검색 결과가 없어요', '다른 낱말로 찾아보세요') : params.saved ? empty('저장한 글이 없어요', '마음에 드는 글을 저장해 보세요') : empty('아직 조용해요', '첫 이야기를 남겨 주세요')); else box.insertAdjacentHTML('beforeend', html);
      more.innerHTML = d.more ? '<button class="btn ghost block" type="button">더 보기</button>' : '';
      if (d.more) more.firstChild.onclick = function () { more.innerHTML = '<div class="skel"></div>'; loadList(params, false, d.next); };
    });
  }

  /* ── 글 ── */
  function postView(id) {
    paint('<div class="skel" style="height:260px"></div>', '');
    api('/api/community/post?id=' + encodeURIComponent(id)).then(function (d) {
      if (!d._ok) { paint(empty(d.error || '글을 찾을 수 없어요', '') + '<p style="text-align:center"><a class="btn ghost sm" href="#/plaza">광장으로</a></p>', ''); return; }
      var p = d.post, mine = p.author && p.author.mine;
      paint('<a class="back" href="javascript:history.back()">' + ICON.back + '뒤로</a><article class="post"><div class="head">' + ava(p.author) + '<div style="min-width:0;flex:1">' + who(p.author) + '<div class="sub"><span>' + when(p.at) + (p.edited ? ' · 수정됨' : '') + '</span>·<a class="badge cat-' + esc(p.category) + '" href="#/plaza' + qs({ cat: p.category }) + '">' + esc(p.catLabel) + '</a>' + (p.group ? '<a class="badge pink" href="#/g/' + p.group.kind + '/' + encodeURIComponent(p.group.key) + '">' + esc(p.group.key) + (p.group.kind === 'ilju' ? ' 일주' : ' 일간') + ' 모임</a>' : '') + '</div></div></div>' +
        '<h1>' + esc(p.title) + '</h1><div class="body">' + esc(p.body) + '</div>' + (p.tags.length ? '<p class="tags" style="display:flex;gap:8px;flex-wrap:wrap">' + p.tags.map(function (t) { return '<a class="tag" href="#/plaza' + qs({ tag: t }) + '">#' + esc(t) + '</a>'; }).join('') + '</p>' : '') +
        '<div class="acts">' + (mine ? '<span class="act" style="cursor:default">' + ICON.heart + '<b>' + p.likes + '</b></span>' : '<button class="act" data-like aria-pressed="' + p.liked + '" aria-label="공감">' + ICON.heart + '<b>' + p.likes + '</b></button>') + '<span class="act" style="cursor:default">' + ICON.chat + '<b id="cmtN">' + p.comments + '</b></span><button class="act icon" data-save aria-pressed="' + p.saved + '" aria-label="저장">' + ICON.save + '</button>' +
        (mine ? '<a class="act right icon" href="#/edit/' + p.id + '" aria-label="고치기">' + ICON.edit + '</a><button class="act icon" data-del aria-label="지우기">' + ICON.trash + '</button>' : '<button class="act right icon" data-report="post" aria-label="신고">' + ICON.flag + '</button>' + (p.author && !p.author.gone ? '<button class="act icon" data-block aria-label="차단">' + ICON.block + '</button>' : '')) + '</div></article>' +
        '<section class="cmts" aria-label="댓글"><div class="sec-h" style="margin-top:0"><h2>댓글</h2></div><div id="cmtList"></div>' +
        '<form class="composer" id="cmtForm"><span class="reply" id="replyTo" hidden></span><div class="in"><textarea name="body" rows="1" maxlength="1000" placeholder="따뜻한 한마디를 남겨 주세요" aria-label="댓글"></textarea><input type="hidden" name="parent"><button class="send" type="submit" aria-label="댓글 보내기" disabled>' + ICON.send + '</button></div><p class="msg" id="cmtMsg" role="status" hidden></p></form></section>', '');
      var like = $('[data-like]'), save = $('[data-save]');
      if (like) like.onclick = function () { react(p, 'like', like); };
      save.onclick = function () { react(p, 'bookmark', save); };
      var del = $('[data-del]'); if (del) del.onclick = function () { confirmSheet('이 글을 지울까요?', '지우면 되돌릴 수 없어요.', '지우기', function () { api('/api/community/post?id=' + p.id, { method: 'DELETE' }).then(function (r) { if (r._ok) { toast('지웠어요'); location.hash = '#/plaza'; } else toast(r.error || '지우지 못했습니다.'); }); }); };
      var rep = $('[data-report]'); if (rep) rep.onclick = function () { reportSheet('post', p.id); };
      var blk = $('[data-block]'); if (blk) blk.onclick = function () { blockSheet({ post: p.id }, p.author.name); };
      var f = $('#cmtForm'), ta = f.elements.body, sb = f.querySelector('.send');
      ta.oninput = function () { sb.disabled = !ta.value.trim(); ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
      f.onsubmit = function (e) { e.preventDefault(); sendComment(p, f); };
      loadComments(p);
    });
  }
  function react(p, kind, btn) {
    var on = btn.getAttribute('aria-pressed') !== 'true';
    if (needWriteGate(kind === 'like')) return;
    btn.disabled = true;
    api('/api/community/react', { method: 'POST', body: { post: p.id, kind: kind, on: on } }).then(function (d) {
      btn.disabled = false; if (!d._ok) { toast(d.error || '잠시 후 다시 시도해 주세요.'); return; }
      btn.setAttribute('aria-pressed', String(on));
      if (kind === 'like') btn.querySelector('b').textContent = d.likes; else toast(on ? '저장했어요' : '저장을 취소했어요');
      track('plaza_react', { kind: kind, on: on ? 1 : 0 });
    });
  }
  function needWriteGate(write) {
    if (!ME || !ME.member) { toast('로그인한 회원만 할 수 있어요'); return true; }
    if (write && (!ME.profile || !ME.profile.nickname)) { location.hash = '#/me?setup=1'; return true; }
    if (write && ME.sanction) { toast(ME.sanction.kind === 'ban' ? '이용이 정지된 계정이에요' : '지금은 글·댓글·공감을 남길 수 없어요'); return true; }
    return false;
  }
  function loadComments(p) {
    var box = $('#cmtList'); if (!box) return;
    api('/api/community/comments?post=' + p.id).then(function (d) {
      if (!d._ok) { box.innerHTML = '<p class="msg err">' + esc(d.error || '댓글을 불러오지 못했습니다.') + '</p>'; return; }
      $('#cmtN').textContent = d.items.filter(function (c) { return !c.deleted && !c.blocked; }).length;
      box.innerHTML = d.items.map(function (c) {
        var gone = c.deleted || c.blocked, mine = c.author && c.author.mine;
        return '<div class="cmt' + (c.parent ? ' re' : '') + (gone ? ' gone' : '') + (mine ? ' mine' : '') + '" id="c' + c.id + '">' + (gone ? ava(null, 1) : ava(c.author, 1)) + '<div class="bub"><div class="bub-in">' + (gone ? '' : '<b>' + esc(c.author.name) + (c.author.ilju ? '<small>' + esc(c.author.ilju) + '</small>' : '') + '</b>') + '<p>' + esc(c.body) + '</p></div>' +
          (gone ? '' : '<div class="row"><span>' + when(c.at) + '</span><button type="button" data-reply="' + c.id + '" data-name="' + esc(c.author.name) + '">답글</button>' + (mine ? '<button type="button" data-cdel="' + c.id + '">지우기</button>' : '<button type="button" data-crep="' + c.id + '">신고</button><button type="button" data-cblk="' + c.id + '" data-name="' + esc(c.author.name) + '">차단</button>') + '</div>') + '</div></div>';
      }).join('') || '<p class="muted" style="text-align:center;padding:14px 0">첫 댓글을 남겨 주세요 ✿</p>';
      $$('[data-reply]', box).forEach(function (b) { b.onclick = function () { var f = $('#cmtForm'); f.elements.parent.value = b.dataset.reply; var r = $('#replyTo'); r.hidden = false; r.innerHTML = '<b>' + esc(b.dataset.name) + '</b>님에게 답글 · <a href="#" id="noReply">취소</a>'; $('#noReply').onclick = function (e) { e.preventDefault(); f.elements.parent.value = ''; r.hidden = true; }; f.elements.body.focus(); }; });
      $$('[data-cdel]', box).forEach(function (b) { b.onclick = function () { confirmSheet('이 댓글을 지울까요?', '', '지우기', function () { api('/api/community/comments?id=' + b.dataset.cdel, { method: 'DELETE' }).then(function () { loadComments(p); }); }); }; });
      $$('[data-crep]', box).forEach(function (b) { b.onclick = function () { reportSheet('comment', +b.dataset.crep); }; });
      $$('[data-cblk]', box).forEach(function (b) { b.onclick = function () { blockSheet({ comment: +b.dataset.cblk }, b.dataset.name); }; });
    });
  }
  function sendComment(p, f) {
    var m = $('#cmtMsg'), body = f.elements.body.value.trim(); if (!body) return;
    if (needWriteGate(true)) return;
    var btn = f.querySelector('.send'); btn.disabled = true; m.hidden = true;
    api('/api/community/comments', { method: 'POST', body: { post: p.id, parent: f.elements.parent.value ? +f.elements.parent.value : null, body: body } }).then(function (d) {
      if (!d._ok) { btn.disabled = false; m.hidden = false; m.className = 'msg err'; m.textContent = d.error || '쓰지 못했습니다.'; return; }
      f.reset(); f.elements.body.style.height = ''; $('#replyTo').hidden = true; track('plaza_comment'); loadComments(p);
    });
  }

  /* ── 시트: 신고·차단·확인 ── */
  function sheet(html) {
    var s = document.createElement('div'); s.className = 'sheet'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-modal', 'true');
    s.innerHTML = '<div class="sheet-bg" data-x></div><section class="sheet-box">' + html + '</section>'; document.body.appendChild(s);
    var last = document.activeElement, close = function () { s.remove(); document.removeEventListener('keydown', key); if (last && last.focus) last.focus(); };
    var key = function (e) { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', key);
    s.addEventListener('click', function (e) { if (e.target.hasAttribute('data-x')) close(); });
    var f = s.querySelector('input,button,textarea'); if (f) f.focus();
    return { el: s, close: close };
  }
  function confirmSheet(title, sub, yes, fn) {
    var s = sheet('<h2>' + esc(title) + '</h2>' + (sub ? '<p class="muted" style="margin:6px 0 0">' + esc(sub) + '</p>' : '') + '<div class="grid2" style="margin-top:18px"><button class="btn ghost" data-x>취소</button><button class="btn" id="yes">' + esc(yes) + '</button></div>');
    $('#yes', s.el).onclick = function () { s.close(); fn(); };
  }
  function reportSheet(type, id) {
    if (!ME || !ME.member) { toast('로그인한 회원만 신고할 수 있어요'); return; }
    var s = sheet('<h2>신고하기</h2><p class="muted" style="margin:6px 0 8px">운영진만 확인하고, 누가 신고했는지는 알리지 않아요. 여러 분이 신고한 글은 확인 전까지 가려져요.</p><form class="form" id="repF">' +
      '<div>' + Object.keys(REASONS).map(function (k) { return '<label class="radio"><input type="radio" name="reason" value="' + k + '"> ' + REASONS[k] + '</label>'; }).join('') + '</div>' +
      '<label>자세한 내용 (선택)<textarea name="detail" rows="2" maxlength="300"></textarea></label><div class="grid2"><button class="btn ghost" type="button" data-x>취소</button><button class="btn pink" type="submit" disabled>신고하기</button></div><p class="msg" role="status"></p></form>');
    var f = $('#repF', s.el), b = f.querySelector('[type=submit]');
    f.onchange = function () { b.disabled = !f.elements.reason.value; };
    f.onsubmit = function (e) { e.preventDefault(); b.disabled = true; api('/api/community/report', { method: 'POST', body: { type: type, id: id, reason: f.elements.reason.value, detail: f.elements.detail.value } }).then(function (d) { if (d._ok) { s.close(); toast('신고를 접수했어요. 확인 후 조치할게요'); track('plaza_report', { type: type }); } else { b.disabled = false; f.querySelector('.msg').className = 'msg err'; f.querySelector('.msg').textContent = d.error || '접수하지 못했습니다.'; } }); };
  }
  function blockSheet(target, name) {
    if (!ME || !ME.member) { toast('로그인한 회원만 차단할 수 있어요'); return; }
    confirmSheet(name + '님을 차단할까요?', '서로의 글·댓글이 보이지 않게 돼요. 나 화면에서 언제든 풀 수 있어요.', '차단하기', function () {
      api('/api/community/block', { method: 'POST', body: target }).then(function (d) { if (d._ok) { toast('차단했어요'); track('plaza_block'); location.hash = '#/plaza'; } else toast(d.error || '차단하지 못했습니다.'); });
    });
  }

  /* ── 글쓰기·고치기 ── */
  function writeView(q, editId) {
    if (needSetup(location.hash)) return;
    if (ME.sanction) { paint('<div class="panel"><h1>지금은 글을 쓸 수 없어요</h1><p class="lead">' + (ME.sanction.kind === 'ban' ? '운영 정책 위반으로 이용이 정지된 계정입니다.' : '운영 정책 위반으로 ' + (ME.sanction.until ? new Date(ME.sanction.until).toLocaleDateString('ko-KR') + '까지 ' : '') + '글·댓글을 쓸 수 없습니다.') + ' 문의는 마이페이지 1:1 문의로 남겨 주세요.</p></div>', 'write'); return; }
    var g = ME.groups || {};
    var draw = function (p) {
      p = p || { category: q.cat || '', title: '', body: '', tags: [] };
      var pick = function (name, opts, cur) { return '<div class="picker" role="radiogroup">' + opts.map(function (o) { return '<label><input type="radio" name="' + name + '" value="' + esc(o[0]) + '"' + (cur === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div>'; };
      var groupOpts = [['', '전체 광장']].concat(g.ilju ? [['ilju', esc(g.ilju.key) + ' 일주 모임']] : []).concat(g.ilgan ? [['ilgan', esc(g.ilgan.label) + ' 일간 모임']] : []);
      paint('<a class="back" href="' + (editId ? '#/p/' + editId : '#/plaza') + '">' + ICON.back + '돌아가기</a><h1 style="margin:4px 2px 16px">' + (editId ? '글 고치기' : '어떤 이야기를 나눌까요?') + '</h1>' +
        '<form class="form" id="wf"><div><p class="muted" style="margin:0 0 8px;font-weight:600">게시판</p>' + pick('category', Object.keys(CATS).map(function (k) { return [k, '<span class="hj" aria-hidden="true">' + CAT_HJ[k] + '</span>' + CATS[k]]; }), p.category) + '</div>' +
        (editId ? '' : '<div><p class="muted" style="margin:0 0 8px;font-weight:600">올릴 곳 <span style="font-weight:400">(모임 글은 홈에도 보여요)</span></p>' + pick('group', groupOpts, q.group || '') + '</div>') +
        '<label>제목<input name="title" maxlength="60" required value="' + esc(p.title) + '" placeholder="한 줄로 요약해 주세요"></label>' +
        '<label>내용<textarea name="body" rows="9" maxlength="5000" required placeholder="경험·고민·소소한 이야기 모두 좋아요">' + esc(p.body) + '</textarea><span class="count" id="cnt">' + p.body.length + ' / 5000</span></label>' +
        '<label>해시태그 <span class="muted" style="font-weight:400">최대 5개</span><input name="tags" placeholder="예: 이직고민 대운" value="' + esc((p.tags || []).join(' ')) + '"></label>' +
        '<p class="note">전화번호·이메일·오픈채팅·링크는 올릴 수 없어요. 서로의 사주를 존중하는 이야기를 부탁드려요. 운세는 참고용이며 중요한 결정은 스스로 내려 주세요.</p>' +
        '<button class="btn pink block" type="submit">' + (editId ? '고친 내용 저장' : '올리기') + '</button><p class="msg" id="wMsg" role="status"></p></form>', 'write');
      if (!editId && !q.group) { var r0 = $('#wf input[name=group][value=""]'); if (r0) r0.checked = true; }
      var f = $('#wf'); f.elements.body.oninput = function () { $('#cnt').textContent = f.elements.body.value.length + ' / 5000'; };
      f.onsubmit = function (e) {
        e.preventDefault(); var el = f.elements, m = $('#wMsg'), b = f.querySelector('[type=submit]');
        if (!el.category.value) { m.className = 'msg err'; m.textContent = '게시판을 골라 주세요'; return; }
        b.disabled = true; m.className = 'msg'; m.textContent = '올리는 중입니다…';
        var body = { category: el.category.value, title: el.title.value, body: el.body.value, tags: el.tags.value.split(/[\s,]+/).filter(Boolean) };
        if (editId) body.id = +editId; else body.group = (el.group && el.group.value) || null;
        api('/api/community/' + (editId ? 'post' : 'posts'), { method: editId ? 'PATCH' : 'POST', body: body }).then(function (d) {
          b.disabled = false; if (!d._ok) { m.className = 'msg err'; m.textContent = d.error || '올리지 못했습니다.'; if (d.need === 'profile') location.hash = '#/me?setup=1'; return; }
          track(editId ? 'plaza_edit' : 'plaza_post', { cat: body.category }); location.hash = '#/p/' + d.id;
        });
      };
    };
    if (editId) api('/api/community/post?id=' + encodeURIComponent(editId)).then(function (d) { if (!d._ok || !d.post.author.mine) { paint(empty('고칠 수 없는 글이에요', ''), 'write'); return; } draw(d.post); });
    else draw();
  }

  /* ── 나 ── */
  function meView(q) {
    if (needSetup('#/me')) return;
    if (q.setup) { setupView('#/me'); return; }
    var p = ME.profile, tab = q.tab || '';
    paint('<div class="prof"><button type="button" class="ava-btn" id="avaBtn" aria-label="프로필 사진 바꾸기">' + ava({ name: p.nickname, ilju: p.ilju, avatar: p.avatar }) + '<span class="ava-cam" aria-hidden="true">✎</span></button><input type="file" id="avaFile" accept="image/jpeg,image/png,image/webp" hidden><div><h1>' + esc(p.nickname) + '</h1><div class="stats">' + (p.ilju ? '<span><b>' + esc(p.ilju) + '</b> 일주</span><span><b>' + esc(p.ilganLabel) + '</b> 일간</span>' : '<span>아직 일주를 확인하지 않았어요</span>') + '</div></div></div>' +
      '<p class="muted" style="margin:-6px 2px 12px">' + (p.avatarKind === 'photo' ? '직접 올린 사진을 쓰는 중 · <a href="#" id="avaReset">일간 포스터로 되돌리기</a>' : p.avatarKind === 'poster' ? '내 일간 포스터를 쓰는 중이에요. 사진을 누르면 바꿀 수 있어요.' + (p.showIlgan || p.showIlju ? '' : ' (일간·일주를 공개해야 다른 사람에게도 포스터가 보여요)') : '사진을 눌러 프로필 사진을 올려 보세요.') + (p.ilgan && p.avatarKind !== 'photo' ? ' · 포스터 <a href="#" data-pg="M"' + (p.posterGender !== 'F' ? ' aria-current="true" style="font-weight:700"' : '') + '>남</a> / <a href="#" data-pg="F"' + (p.posterGender === 'F' ? ' aria-current="true" style="font-weight:700"' : '') + '>여</a>' : '') + '</p>' +
      '<div class="grid2" style="margin-bottom:6px"><a class="btn ghost sm" href="#/me?setup=1">프로필 편집</a><a class="btn ghost sm" href="#/me?ilju=1">' + (p.ilju ? '일주 다시 확인' : '내 일주 확인') + '</a></div>' +
      (q.ilju ? '<div class="panel" style="margin-top:14px" id="iljuBox"><h2>내 일주 확인</h2>' + iljuForm(!!p.ilju) + '</div>' : '') +
      '<nav class="tabs" aria-label="내 기록"><a href="#/me" ' + (!tab ? 'aria-current="page"' : '') + '>내 글</a><a href="#/me?tab=saved" ' + (tab === 'saved' ? 'aria-current="page"' : '') + '>저장</a><a href="#/me?tab=blocks" ' + (tab === 'blocks' ? 'aria-current="page"' : '') + '>차단</a></nav><div id="list"><div class="skel"></div></div><div id="more"></div>', tab === 'saved' ? 'saved' : 'me');
    if (q.ilju) bindIlju();
    bindAvatar();
    if (tab === 'blocks') loadBlocks(); else loadList(tab === 'saved' ? { saved: '1' } : { mine: '1' }, true);
  }
  // 프로필 사진: 256×256 으로 가운데를 잘라 WebP(안 되면 JPEG)로 다시 그려 보낸다 → 용량이 작아지고 사진 속 위치 정보 같은 메타데이터가 사라진다
  function bindAvatar() {
    var btn = $('#avaBtn'), file = $('#avaFile'); if (!btn || !file) return;
    btn.onclick = function () { file.click(); };
    file.onchange = function () {
      var f0 = file.files && file.files[0]; file.value = ''; if (!f0) return;
      if (!/^image\/(jpeg|png|webp)$/.test(f0.type)) { toast('JPG·PNG·WebP 사진만 올릴 수 있어요'); return; }
      if (f0.size > 15 * 1024 * 1024) { toast('15MB 이하 사진을 골라 주세요'); return; }
      var img = new Image(), u = URL.createObjectURL(f0);
      img.onload = function () {
        var S = 256, c = document.createElement('canvas'); c.width = c.height = S; var x = c.getContext('2d'), m = Math.min(img.naturalWidth, img.naturalHeight);
        x.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, S, S); URL.revokeObjectURL(u);
        var send = function (blob) {
          if (!blob) { toast('사진을 읽지 못했어요'); return; }
          toast('사진을 올리는 중…');
          var h = { 'content-type': blob.type }, t = token(); if (t) h['x-member-token'] = t;
          fetch('/api/community/avatar', { method: 'POST', headers: h, body: blob, credentials: 'same-origin' }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
            .then(function (d) { if (!d._ok) { toast(d.error || '올리지 못했어요'); return; } toast('프로필 사진을 바꿨어요'); track('plaza_avatar'); refreshMe().then(route); })
            .catch(function () { toast('연결이 끊겼어요'); });
        };
        c.toBlob(function (b) { if (b && b.type === 'image/webp') send(b); else c.toBlob(send, 'image/jpeg', .86); }, 'image/webp', .85);
      };
      img.onerror = function () { URL.revokeObjectURL(u); toast('사진을 열 수 없어요'); };
      img.src = u;
    };
    var rs = $('#avaReset'); if (rs) rs.onclick = function (e) { e.preventDefault(); api('/api/community/avatar', { method: 'DELETE' }).then(function (d) { if (d._ok) { toast('일간 포스터로 되돌렸어요'); refreshMe().then(route); } else toast(d.error || '되돌리지 못했어요'); }); };
    $$('[data-pg]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); api('/api/community/me', { method: 'POST', body: { action: 'gender', gender: a.dataset.pg } }).then(function (d) { if (d._ok) refreshMe().then(route); else toast(d.error || '바꾸지 못했어요'); }); }; });
  }
  function deviceBirth() { try { var s = JSON.parse(localStorage.getItem('mantra-manse-v1') || 'null'); if (!s || !s.year || !s.month || !s.day) return null; var b = { year: +s.year, month: +s.month, day: +s.day, calendar: s.calendar || 'solar', leap: !!s.leap }; if (!s.hourUnknown && s.hour !== '' && s.hour != null) { b.hour = +s.hour; b.minute = +s.minute || 0; } if (s.jasi) b.jasi = s.jasi; if (s.timeMode) b.timeMode = s.timeMode; b._g = s.gender === 'F' ? 'F' : s.gender === 'M' ? 'M' : null; return b; } catch (e) { return null; } }
  function iljuForm(has) {
    var dev = deviceBirth();
    return '<p class="muted" style="margin:6px 0 12px">생년월일로 일주를 계산해 <b>일주·일간 이름만</b> 저장해요. 생년월일은 서버에 남기지 않습니다.' + (has ? ' 다시 확인하면 모임이 바뀔 수 있어요.' : '') + '</p>' +
      (dev ? '<button class="btn pink block" type="button" id="useDev">이 기기에 저장된 사주로 확인</button><p class="muted" style="margin:12px 0 8px;text-align:center">또는 직접 입력</p>' : '') +
      '<form class="form" id="iljuF"><div class="grid2"><label>생년월일<input name="date" type="date" min="1900-01-01" max="2100-12-31" required></label><label>달력<select name="cal"><option value="solar">양력</option><option value="lunar">음력</option><option value="leap">음력(윤달)</option></select></label></div>' +
      '<label>태어난 시각 <span class="muted" style="font-weight:400">모르면 비워 두세요 · 밤 11시 이후 출생은 일주가 달라질 수 있어요</span><input name="time" type="time"></label><label>일간 포스터 그림 <span class="muted" style="font-weight:400">기본 프로필 사진으로 쓰여요</span><select name="g"><option value="M">남</option><option value="F">여</option></select></label><button class="btn ghost block" type="submit">일주 확인</button><p class="msg" id="iljuMsg" role="status"></p></form>';
  }
  function bindIlju() {
    var send = function (birth, g) {
      var m = $('#iljuMsg'); m.className = 'msg'; m.textContent = '계산하는 중입니다…';
      api('/api/community/me', { method: 'POST', body: { action: 'ilju', birth: birth, gender: g || null } }).then(function (d) {
        if (!d._ok) { m.className = 'msg err'; m.textContent = d.error || '확인하지 못했습니다.'; return; }
        toast(d.ilju + ' 일주 · ' + d.ilganLabel + ' 일간이에요'); track('plaza_ilju'); refreshMe().then(function () { location.hash = '#/g/ilju/' + encodeURIComponent(d.ilju); });
      });
    };
    var u = $('#useDev'); if (u) u.onclick = function () { var b = deviceBirth(); if (b) { var g = b._g; delete b._g; send(b, g); } };
    $('#iljuF').onsubmit = function (e) {
      e.preventDefault(); var el = e.target.elements, d = (el.date.value || '').split('-'), t = (el.time.value || '').split(':');
      if (d.length !== 3) return;
      var b = { year: +d[0], month: +d[1], day: +d[2], calendar: el.cal.value === 'solar' ? 'solar' : 'lunar', leap: el.cal.value === 'leap' };
      if (t.length === 2 && t[0] !== '') { b.hour = +t[0]; b.minute = +t[1]; }
      send(b, el.g.value);
    };
    setTimeout(function () { var bx = $('#iljuBox'); if (bx) bx.scrollIntoView({ block: 'start' }); }, 50);
  }
  function loadBlocks() {
    var box = $('#list');
    api('/api/community/block').then(function (d) {
      if (!d._ok) { box.innerHTML = '<p class="msg err">' + esc(d.error || '불러오지 못했습니다.') + '</p>'; return; }
      box.innerHTML = d.items.length ? d.items.map(function (x) { return '<div class="card" style="display:flex;align-items:center;gap:10px">' + ava({ name: x.name }, 1) + '<b style="flex:1">' + esc(x.name) + '</b><button class="btn ghost sm" data-unb="' + esc(x.handle) + '">차단 풀기</button></div>'; }).join('') : empty('차단한 회원이 없어요', '');
      $$('[data-unb]', box).forEach(function (b) { b.onclick = function () { api('/api/community/block?handle=' + encodeURIComponent(b.dataset.unb), { method: 'DELETE' }).then(function () { toast('차단을 풀었어요'); loadBlocks(); }); }; });
    });
  }

  /* ── 오늘(운테크 + 운명의 기록 + 같은 일주 익명 통계, 4단계) ── */
  var MOOD = { 5: ['🤩', '아주 좋음'], 4: ['🙂', '좋음'], 3: ['😐', '보통'], 2: ['😕', '별로'], 1: ['😣', '힘듦'] };
  function needIlju(tab) {
    paint('<div class="hero"><span class="kick">今日</span><h1>내 일주를 알면<br><em>오늘이 보여요</em></h1><p>일주를 확인하면 오늘 일진과 내 일주가 만나는 하루 카드와 운명의 기록을 쓸 수 있어요.</p><div class="cta"><a class="btn pink" href="#/me?ilju=1">내 일주 확인하기</a></div></div>', tab);
  }
  function todayView() {
    if (!ME || !ME.member) { needSetup('#/today'); return; }
    paint('<div class="skel" style="height:300px"></div><div class="skel"></div>', 'today');
    api('/api/community/today').then(function (d) {
      if (!d._ok) { if (d.need === 'ilju') return needIlju('today'); if (d.need === 'login' || d.need === 'consent') return needSetup('#/today'); paint('<p class="msg err">' + esc(d.error || '불러오지 못했습니다.') + '</p>', 'today'); return; }
      var c = d.card, lg = d.log, dt = new Date(d.day + 'T00:00:00+09:00');
      var date = dt.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'long' });
      var statBox = function (s, label) {
        if (!s.open) return '<div class="stat"><b>' + esc(label) + '</b><p class="muted">오늘 기록한 사람이 ' + s.need + '명 이상 모이면 보여 드려요. (누구인지 알 수 없도록 적은 인원은 숨겨요)</p></div>';
        return '<div class="stat"><b>' + esc(label) + ' · ' + esc(s.size) + '</b><p class="big"><em>' + s.goodPct + '%</em>가 오늘 기분 좋음</p>' +
          '<div class="bars">' + s.moods.map(function (m) { return '<div class="barrow"><span>' + MOOD[m.mood][0] + '</span><i style="--w:' + (m.pct == null ? 0 : m.pct) + '%"></i><small>' + (m.pct == null ? '—' : m.pct + '%') + '</small></div>'; }).join('') + '</div>' +
          (s.tags.length ? '<p class="muted" style="margin:8px 0 0">많이 고른 키워드 · ' + s.tags.map(function (t) { return esc(t.label) + ' ' + t.pct + '%'; }).join(' · ') + '</p>' : '') + '</div>';
      };
      paint('<p class="muted" style="margin:4px 2px 8px;font-weight:600">' + esc(date) + '</p>' +
        '<section class="today el-' + EL[c.dayPillar.charAt(0)] + '"><div class="t-top"><span class="gz">' + esc(c.dayPillar) + '<small>일진</small></span><span class="kick">' + esc(c.tenGod) + ' · ' + esc(c.key) + '</span></div>' +
        '<h1>' + esc(c.head) + '</h1><p class="t-body">' + esc(c.body) + '</p>' +
        '<div class="t-grid"><div class="t-cell"><b><span class="hj" aria-hidden="true">財</span>오늘의 운테크</b><p>' + esc(c.money) + '</p></div><div class="t-cell"><b><span class="hj" aria-hidden="true">人</span>사람</b><p>' + esc(c.people) + '</p></div></div>' +
        '<div class="t-do"><span class="ok">해 보면 좋은 것<b>' + esc(c.do) + '</b></span><span class="no">피하면 좋은 것<b>' + esc(c.avoid) + '</b></span></div>' +
        (c.relKey ? '<p class="t-rel"><b>' + esc(c.relKey) + '</b> ' + esc(c.relLine) + '</p>' : '') +
        '<p class="t-basis">' + esc(c.basis) + '</p></section>' +
        '<section class="panel" id="logBox"><h2>운명의 기록</h2><p class="muted" style="margin:4px 0 12px">오늘 하루 어땠나요? 기록은 나만 볼 수 있어요.' + (lg ? ' (오늘 기록함 · 다시 고를 수 있어요)' : '') + '</p>' +
        '<form class="form" id="logF"><div class="moods" role="radiogroup" aria-label="오늘 기분">' + [5, 4, 3, 2, 1].map(function (m) { return '<label><input type="radio" name="mood" value="' + m + '"' + (lg && lg.mood === m ? ' checked' : '') + '><span><em aria-hidden="true">' + MOOD[m][0] + '</em>' + MOOD[m][1] + '</span></label>'; }).join('') + '</div>' +
        '<div class="picker" aria-label="오늘의 키워드">' + Object.keys(d.tags).map(function (t) { return '<label><input type="checkbox" name="tags" value="' + t + '"' + (lg && lg.tags.indexOf(t) >= 0 ? ' checked' : '') + '><span>' + esc(d.tags[t]) + '</span></label>'; }).join('') + '</div>' +
        '<label>한 줄 메모 <span class="muted" style="font-weight:400">선택 · 나만 봐요</span><textarea name="note" rows="2" maxlength="500" placeholder="오늘 있었던 일, 느낀 점">' + esc(lg ? lg.note : '') + '</textarea></label>' +
        '<button class="btn pink block" type="submit"' + (lg ? '' : ' disabled') + '>' + (lg ? '기록 고치기' : '기록하기') + '</button><p class="msg" id="logMsg" role="status"></p></form>' +
        '<a class="btn ghost block sm" href="#/records" style="margin-top:10px">지난 기록·회고 보기</a></section>' +
        '<div class="sec-h"><h2>오늘, 같은 기운의 사람들은</h2></div><div class="stats2">' + statBox(d.stats.ilju, d.stats.ilju.key + ' 일주') + statBox(d.stats.ilgan, d.stats.ilgan.key + ' 일간') + '</div>' +
        '<p class="muted" style="margin:10px 2px 0">통계는 오늘 기록한 회원만 모아 비율로만 보여 주며, 누가 어떻게 답했는지는 알 수 없어요.</p>', 'today');
      var f = $('#logF'), btn = f.querySelector('[type=submit]');
      f.onchange = function () { btn.disabled = !f.querySelector('input[name=mood]:checked'); };
      f.onsubmit = function (e) {
        e.preventDefault(); var m = $('#logMsg'), mood = f.querySelector('input[name=mood]:checked'); if (!mood) return;
        var tags = $$('input[name=tags]:checked', f).map(function (x) { return x.value; });
        if (tags.length > 4) { m.className = 'msg err'; m.textContent = '키워드는 4개까지 고를 수 있어요'; return; }
        btn.disabled = true; m.className = 'msg'; m.textContent = '저장하는 중입니다…';
        api('/api/community/today', { method: 'POST', body: { mood: +mood.value, tags: tags, note: f.elements.note.value } }).then(function (r) {
          btn.disabled = false; if (!r._ok) { m.className = 'msg err'; m.textContent = r.error || '저장하지 못했습니다.'; return; }
          toast('오늘을 기록했어요'); track('plaza_log', { mood: +mood.value }); todayView();
        });
      };
    });
  }
  function recordsView(q) {
    if (!ME || !ME.member) { needSetup('#/records'); return; }
    var range = q.range === 'month' ? 'month' : 'week';
    paint('<a class="back" href="#/today">' + ICON.back + '오늘</a><h1 style="margin:4px 2px 12px">운명의 기록</h1><div class="bar"><nav class="seg"><a href="#/records"' + (range === 'week' ? ' aria-current="page"' : '') + '>최근 7일</a><a href="#/records?range=month"' + (range === 'month' ? ' aria-current="page"' : '') + '>최근 30일</a></nav></div><div id="rec"><div class="skel"></div></div>', 'today');
    api('/api/community/records?range=' + range).then(function (d) {
      var box = $('#rec'); if (!box) return;
      if (!d._ok) { box.innerHTML = '<p class="msg err">' + esc(d.error || '불러오지 못했습니다.') + '</p>'; return; }
      var s = d.summary;
      if (!s.count) { box.innerHTML = empty('아직 기록이 없어요', '오늘 탭에서 하루를 기록해 보세요'); return; }
      box.innerHTML = '<section class="panel"><div class="kpis"><div><b>' + s.count + '<small>일</small></b><span>기록한 날</span></div><div><b>' + s.avg + '<small>/5</small></b><span>평균 기분</span></div><div><b>' + s.good + '<small>일</small></b><span>좋았던 날</span></div></div>' +
        (s.topTags.length ? '<p class="muted" style="margin:12px 0 0">자주 고른 키워드 · ' + s.topTags.map(function (t) { return esc(t.label) + ' ' + t.n + '번'; }).join(' · ') + '</p>' : '') +
        '<p class="note pink" style="margin-top:12px">' + esc(s.insight) + '</p>' +
        (s.byTenGod.length ? '<div class="bars" style="margin-top:14px">' + s.byTenGod.map(function (t) { return '<div class="barrow"><span style="width:44px">' + esc(t.tenGod) + '</span><i style="--w:' + Math.round(t.avg / 5 * 100) + '%"></i><small>' + t.avg + '</small></div>'; }).join('') + '</div><p class="muted" style="margin:6px 0 0">십성별 평균 기분(두 번 이상 기록된 날만)</p>' : '') + '</section>' +
        d.logs.map(function (l) { return '<div class="card logrow"><span class="lm" aria-hidden="true">' + MOOD[l.mood][0] + '</span><div style="flex:1;min-width:0"><b>' + esc(new Date(l.day + 'T00:00:00+09:00').toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short' })) + ' · ' + esc(MOOD[l.mood][1]) + '</b><div class="sub">' + (l.tenGod ? esc(l.tenGod) + ' 날' : '') + (l.tags.length ? ' · ' + l.tags.map(function (t) { return esc(({ work: '일', money: '돈', love: '연애', people: '사람', health: '몸', rest: '쉼', study: '배움', family: '가족' })[t] || t); }).join(', ') : '') + '</div>' + (l.note ? '<p class="ex" style="margin-top:4px">' + esc(l.note) + '</p>' : '') + '</div><button class="act icon" data-ldel="' + esc(l.day) + '" aria-label="기록 지우기">' + ICON.trash + '</button></div>'; }).join('');
      $$('[data-ldel]', box).forEach(function (b) { b.onclick = function () { confirmSheet('이 날의 기록을 지울까요?', '지우면 되돌릴 수 없어요.', '지우기', function () { api('/api/community/records?day=' + encodeURIComponent(b.dataset.ldel), { method: 'DELETE' }).then(function () { recordsView(q); }); }); }; });
    });
  }

  /* ── 인연(5단계): 본인확인 → 인연 프로필 → 오늘의 인연 → 인연 잇기 → 대화 ── */
  var MP = null, CR = null;   // 인연 프로필·크레딧 응답 캐시
  var reqId = function () { try { return crypto.randomUUID().replace(/-/g, ''); } catch (e) { return (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 32); } };
  var PORTONE_SDK = 'https://cdn.portone.io/v2/browser-sdk.js';
  var loadScript = function (src) { return new Promise(function (ok, no) { if (document.querySelector('script[src="' + src + '"]')) return ok(); var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); };
  function matchProfile() { return api('/api/community/match?view=profile').then(function (d) { MP = d; return d; }); }
  function matchGate(d) {
    if (!d._ok) { if (d.need === 'login' || d.need === 'consent') { needSetup('#/'); return true; } paint('<p class="msg err">' + esc(d.error || '불러오지 못했어요') + '</p>', 'match'); return true; }
    if (!d.ready.nickname) { setupView('#/'); return true; }
    if (!d.ready.ilju) { needIlju('match'); return true; }
    if (!d.verified) { verifyView(); return true; }
    if (!d.profile.active) {
      paint('<div class="hero"><canvas id="petals" aria-hidden="true"></canvas><svg class="thread" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 44 C 70 14, 130 58, 205 34 S 330 6, 410 26"/><circle cx="205" cy="34" r="3.5"/></svg><span class="kick">緣</span><h1>오늘, 붉은 실 끝에<br><em>닿을 사람</em></h1><p>하루 ' + 5 + '명, 서로 원하는 조건이 맞는 사람만 조용히 이어 드려요. 두 사람이 모두 인연을 이어야 대화가 열려요.</p><div class="cta"><a class="btn pink" href="#/match/edit">인연 프로필 만들기</a></div></section>', 'match');
      petals(); return true;
    }
    return false;
  }
  function matchView() {
    paint('<div class="skel" style="height:220px"></div><div class="skel" style="height:320px"></div>', 'match');
    matchProfile().then(function (d) {
      if (matchGate(d)) return;
      Promise.all([api('/api/community/match?view=today'), api('/api/community/match?view=inbox'), api('/api/community/credits')]).then(function (rs) {
        var t = rs[0], ib = rs[1]; CR = rs[2] && rs[2]._ok && rs[2].enabled ? rs[2] : null;
        if (!t._ok) { paint('<p class="msg err">' + esc(t.error || '불러오지 못했어요') + '</p>', 'match'); return; }
        var nRecv = ib._ok ? ib.received.length : 0, nMatch = ib._ok ? ib.matches.length : 0;
        paint('<div class="mh"><div><p class="kick-s">今日之緣</p><h1>오늘의 인연</h1><p class="muted" style="margin:2px 0 0">' + (t.cards.length ? '서로 원하는 조건이 맞는 ' + t.cards.length + '명이에요. 내일 새로운 인연이 찾아와요.' : '') + '</p></div><div style="display:flex;gap:6px;align-items:center">' + (CR ? '<button type="button" class="credit" id="crChip" title="크레딧 충전·내역"><span class="hj">緣</span>' + CR.balance + '</button>' : '') + '<a class="btn ghost sm" href="#/match/edit">조건</a></div></div>' +
          '<div class="grid2" style="margin:12px 0 16px"><a class="group-card" href="#/match/inbox"><span class="gem">' + nRecv + '</span><span><b>나에게 온 인연</b><small>받은 인연 잇기</small></span></a><a class="group-card" href="#/chat"><span class="gem">' + nMatch + '</span><span><b>이어진 인연</b><small>대화하기</small></span></a></div>' +
          (t.cards.length ? '<div id="fates">' + t.cards.map(fateCard).join('') + '</div>' : empty('오늘은 아직 닿은 인연이 없어요', '조건을 조금 넓히거나 내일 다시 찾아와 주세요. 광장에 인연 프로필을 켠 사람이 늘수록 더 많이 이어져요.')) +
          (CR ? '<button class="btn ghost block" id="morePicks" style="margin-top:4px">오늘의 인연 ' + CR.morePicksCount + '명 더 보기 · 크레딧 ' + CR.prices.morePicks + '</button>' : '') +
          '<p class="muted" style="margin:14px 2px 0">명리 지표는 두 사람의 일주만 본 참고용이에요. 관계의 성패를 예측하지 않아요.</p>', 'match');
        bindFates(t.cards);
        var chip = $('#crChip'); if (chip) chip.onclick = creditSheet;
        var mp = $('#morePicks'); if (mp) mp.onclick = function () { confirmSheet('오늘의 인연 ' + CR.morePicksCount + '명을 더 볼까요?', '크레딧 ' + CR.prices.morePicks + '개를 써요(지금 ' + CR.balance + '개). 조건이 맞는 새 인연이 없으면 쓰지 않아요.', '더 보기', function () { mp.disabled = true; api('/api/community/credits', { method: 'POST', body: { action: 'more-picks', req: reqId() } }).then(function (d) { mp.disabled = false; if (!d._ok) { toast(d.error || '더 보지 못했어요'); return; } toast(d.added + '명의 인연이 더 찾아왔어요'); track('credit_more_picks'); matchView(); }); }); };
        // 크레딧이 모자라면 바로 충전 창
        if (mp && CR.balance < CR.prices.morePicks && CR.packs && CR.packs.length) { mp.onclick = function () { toast('크레딧이 부족해요. 충전하고 이어서 볼 수 있어요'); creditSheet(); }; }
      });
    });
  }
  function fateCard(c, i) {
    var img = c.avatar ? '<img src="' + esc(c.avatar) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '<span class="fz-letter">' + esc(String(c.name).charAt(0)) + '</span>';
    var el = c.ilju ? EL[c.ilju.charAt(0)] : '';
    return '<article class="fate' + (el ? ' el-' + el : '') + '" data-i="' + i + '"><div class="fz">' + img + '<div class="fz-cap"><b>' + esc(c.name) + '</b><span>' + [c.age, c.region].filter(Boolean).map(esc).join(' · ') + '</span></div>' + (c.ilju ? '<span class="fz-ilju">' + esc(c.ilju) + '<small>일주</small></span>' : '') + '</div>' +
      '<div class="fb">' + (c.note ? '<p class="note pink" style="margin:0 0 10px">“' + esc(c.note) + '”</p>' : '') + (c.purposes.length ? '<div class="chips" style="padding:0 0 8px">' + c.purposes.map(function (p) { return '<span class="chip">' + esc(p) + '</span>'; }).join('') + '</div>' : '') +
      (c.intro ? '<p class="fz-intro">' + esc(c.intro) + '</p>' : '') +
      '<div class="cp"><p class="cp-h"><span class="hj">命</span>명리로 본 두 사람</p><ul class="cp-good">' + c.compat.good.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' + (c.compat.care.length ? '<ul class="cp-care">' + c.compat.care.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + '</div>' +
      '<div class="cp"><p class="cp-h"><span class="hj">生</span>생활로 본 두 사람</p><p class="muted" style="margin:0">' + [c.life.purposes.length ? '함께 원하는 것 · ' + c.life.purposes.map(esc).join(', ') : '', c.life.interests.length ? '겹치는 관심사 · ' + c.life.interests.map(esc).join(', ') : '겹치는 관심사는 아직 없어요', c.life.sameRegion ? '같은 지역(' + esc(c.life.region) + ')' : ''].filter(Boolean).join('<br>') + '</p></div>' +
      '<div class="fa">' + (c.sent ? '<span class="sent">인연을 이었어요 · 상대의 답을 기다리는 중</span>' : c.passed ? '<span class="sent">넘긴 인연이에요</span>' : '<button class="btn ghost" data-pass>넘기기</button><button class="btn pink" data-like>인연 잇기</button>') + '</div></div></article>';
  }
  function bindFates(cards, after) {
    $$('.fate').forEach(function (el) {
      var c = cards[+el.dataset.i], like = $('[data-like]', el), pass = $('[data-pass]', el);
      if (pass) pass.onclick = function () { api('/api/community/match', { method: 'POST', body: { action: 'pass', handle: c.handle } }).then(function (d) { if (d._ok) { el.style.opacity = '.45'; el.querySelector('.fa').innerHTML = '<span class="sent">넘긴 인연이에요</span>'; track('match_pass'); if (after) after(); } else toast(d.error || '잠시 후 다시 시도해 주세요'); }); };
      if (like) like.onclick = function () {
        var s = sheet('<h2>' + esc(c.name) + '님과 인연 잇기</h2><p class="muted" style="margin:6px 0 10px">상대도 인연을 이으면 대화가 열려요. 짧은 첫 인사를 남길 수 있어요(선택).</p><form class="form" id="lkF"><textarea name="note" rows="2" maxlength="100" placeholder="예: 같은 일주라 반가워요! 이직 이야기 나눠 보고 싶어요"></textarea><div class="grid2"><button class="btn ghost" type="button" data-x>취소</button><button class="btn pink" type="submit">인연 잇기</button></div><p class="msg" role="status"></p></form>');
        $('#lkF', s.el).onsubmit = function (e) {
          e.preventDefault(); var f = e.target, m = f.querySelector('.msg');
          var send = function (useCredit) { return api('/api/community/match', { method: 'POST', body: { action: 'like', handle: c.handle, note: f.elements.note.value, useCredit: !!useCredit, req: useCredit ? reqId() : undefined } }); };
          send(false).then(function (d) { if (d.need === 'credit') { m.className = 'msg'; m.innerHTML = esc(d.error) + ' <button type="button" class="btn pink sm" id="useCr">크레딧 ' + d.price + '개로 잇기</button>'; return new Promise(function (ok) { $('#useCr', s.el).onclick = function () { send(true).then(function (r) { if (r.need === 'credit-buy' && CR && CR.packs && CR.packs.length) { s.close(); toast('크레딧이 부족해요'); creditSheet(); return; } ok(r); }); }; }); } return d; }).then(function (d) { if (!d) return;
            if (!d._ok) { m.className = 'msg err'; m.textContent = d.error || '잇지 못했어요'; return; }
            s.close(); track('match_like', { matched: d.matched ? 1 : 0 });
            if (d.matched) { matchedSheet(c, d.room); } else { toast('인연을 이었어요. 상대의 답을 기다려 볼게요'); el.querySelector('.fa').innerHTML = '<span class="sent">인연을 이었어요 · 상대의 답을 기다리는 중</span>'; }
            if (after) after();
          });
        };
      };
    });
  }
  function matchedSheet(c, room) {
    var s = sheet('<div style="text-align:center;padding:8px 0 4px"><div class="matched-ill" aria-hidden="true"><span></span><i></i><span></span></div><h2 style="margin-top:12px">붉은 실이 이어졌어요</h2><p class="muted" style="margin:6px 0 16px">' + esc(c.name) + '님도 인연을 이었어요. 이제 대화를 나눌 수 있어요.</p><div class="grid2"><button class="btn ghost" data-x>나중에</button><a class="btn pink" href="#/chat/' + room + '" id="goRoom">대화 시작</a></div></div>');
    $('#goRoom', s.el).onclick = function () { s.close(); };
  }
  function inboxView(q) {
    var tab = q.tab || 'recv';
    paint('<a class="back" href="#/">' + ICON.back + '오늘의 인연</a><h1 style="margin:4px 2px 4px">인연함</h1><nav class="tabs"><a href="#/match/inbox"' + (tab === 'recv' ? ' aria-current="page"' : '') + '>나에게 온</a><a href="#/match/inbox?tab=sent"' + (tab === 'sent' ? ' aria-current="page"' : '') + '>내가 보낸</a></nav><div id="ib"><div class="skel"></div></div>', 'match');
    api('/api/community/match?view=inbox').then(function (d) {
      var box = $('#ib'); if (!box) return;
      if (!d._ok) { if (d.need) { matchProfile().then(matchGate); return; } box.innerHTML = '<p class="msg err">' + esc(d.error || '불러오지 못했어요') + '</p>'; return; }
      if (tab === 'sent') {
        box.innerHTML = d.sent.length ? d.sent.map(function (x) { return '<div class="card" style="display:flex;align-items:center;gap:12px">' + ava({ name: x.name, avatar: x.avatar }) + '<div style="flex:1"><b>' + esc(x.name) + '</b><div class="sub">' + when(x.at) + ' 전에 이었어요 · 답을 기다리는 중</div></div><button class="btn ghost sm" data-wd="' + esc(x.handle) + '">거두기</button></div>'; }).join('') : empty('보낸 인연이 없어요', '오늘의 인연에서 마음에 닿는 분께 인연을 이어 보세요');
        $$('[data-wd]', box).forEach(function (b) { b.onclick = function () { api('/api/community/match', { method: 'POST', body: { action: 'withdraw', handle: b.dataset.wd } }).then(function () { toast('거뒀어요'); inboxView(q); }); }; });
        return;
      }
      box.innerHTML = d.received.length ? '<p class="muted" style="margin:0 2px 10px">인연을 이으면 바로 대화가 열려요. 넘겨도 상대에게 알리지 않아요.</p><div>' + d.received.map(fateCard).join('') + '</div>' : empty('아직 나에게 온 인연이 없어요', '인연 프로필의 한 줄 소개를 채우면 더 잘 닿아요');
      bindFates(d.received);
    });
  }
  function matchEdit() {
    paint('<div class="skel" style="height:420px"></div>', 'match');
    matchProfile().then(function (d) {
      if (!d._ok || !d.ready.nickname || !d.ready.ilju || !d.verified) { if (!matchGate(d)) paint('', 'match'); return; }
      var p = d.profile, o = d.options;
      var chk = function (name, map, cur, max) { return '<div class="picker">' + Object.keys(map).map(function (k) { return '<label><input type="checkbox" name="' + name + '" value="' + esc(k) + '"' + (cur.indexOf(k) >= 0 ? ' checked' : '') + '><span>' + esc(map[k]) + '</span></label>'; }).join('') + '</div>'; };
      var ages = function (name, v) { var h = '<select name="' + name + '">'; for (var a = 19; a <= 70; a++) h += '<option value="' + a + '"' + (+v === a ? ' selected' : '') + '>' + a + '세</option>'; return h + '<option value="99"' + (+v === 99 ? ' selected' : '') + '>제한 없음</option></select>'; };
      paint('<a class="back" href="#/">' + ICON.back + '오늘의 인연</a><h1 style="margin:4px 2px 4px">인연 프로필</h1><p class="lead" style="margin:0 2px 14px">본인확인 완료 · ' + esc(d.verification.age) + ' · ' + (d.verification.gender === 'F' ? '여성' : d.verification.gender === 'M' ? '남성' : '') + '</p>' +
        '<form class="form" id="mpF"><div><p class="muted" style="margin:0 0 8px;font-weight:600">어떤 인연을 찾나요? (여러 개)</p>' + chk('purposes', o.purposes, p.purposes) + '</div>' +
        '<label>활동 지역<select name="region"><option value="">골라 주세요</option>' + o.regions.map(function (r) { return '<option' + (p.region === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></label>' +
        '<label>한 줄 소개 <span class="muted" style="font-weight:400">200자까지 · 연락처·링크는 쓸 수 없어요</span><textarea name="intro" rows="3" maxlength="200" placeholder="요즘 관심 있는 것, 함께 하고 싶은 것">' + esc(p.intro) + '</textarea></label>' +
        '<div><p class="muted" style="margin:0 0 8px;font-weight:600">관심사 (6개까지)</p>' + chk('interests', o.interests, p.interests) + '</div>' +
        '<div class="panel" style="margin:4px 0 0;padding:16px"><h2 style="font-size:.98rem">만나고 싶은 사람</h2><div class="grid2" style="margin-top:10px"><label>최소 나이' + ages('min', p.wantAgeMin) + '</label><label>최대 나이' + ages('max', p.wantAgeMax) + '</label></div>' +
        '<div id="wg" style="margin-top:12px"><p class="muted" style="margin:0 0 8px;font-weight:600">연애 상대로 만나고 싶은 성별</p>' + chk('wantGender', { M: '남성', F: '여성' }, p.wantGender) + '</div>' +
        '<label class="check" style="margin-top:6px"><input type="checkbox" name="sameRegion"' + (p.wantRegion === 'same' ? ' checked' : '') + '> 같은 지역 사람만</label></div>' +
        '<label class="check"><input type="checkbox" name="active"' + (p.active ? ' checked' : '') + '> 인연 찾기 켜기 (다른 사람의 오늘의 인연에 나타나요)</label>' +
        '<p class="note">인연 카드에는 닉네임·프로필 사진(없으면 일간 포스터)·일주·나이대(예: 20대 후반)·지역(시·도)·소개·관심사가 보여요. 이름·생년월일·연락처는 보이지 않아요. 언제든 끌 수 있어요.</p>' +
        '<button class="btn pink block" type="submit">저장</button><p class="msg" id="mpMsg" role="status"></p></form>', 'match');
      var f = $('#mpF'), wg = $('#wg');
      var sync = function () { wg.hidden = !$('input[name=purposes]:checked', f).some(function (x) { return x.value === 'love'; }); }; sync();
      f.onchange = function (e) { sync(); if (e.target.name === 'interests' && $$('input[name=interests]:checked', f).length > 6) { e.target.checked = false; toast('관심사는 6개까지 고를 수 있어요'); } };
      f.onsubmit = function (e) {
        e.preventDefault(); var el = f.elements, m = $('#mpMsg'), vals = function (n) { return $('input[name=' + n + ']:checked', f).map(function (x) { return x.value; }); };
        m.className = 'msg'; m.textContent = '저장하는 중…';
        api('/api/community/match', { method: 'POST', body: { action: 'profile', active: el.active.checked, purposes: vals('purposes'), region: el.region.value, intro: el.intro.value, interests: vals('interests'), wantGender: vals('wantGender'), wantAgeMin: +el.min.value, wantAgeMax: +el.max.value, wantRegion: el.sameRegion.checked ? 'same' : 'any' } }).then(function (r) {
          if (!r._ok) { m.className = 'msg err'; m.textContent = r.error || '저장하지 못했어요'; return; }
          toast(r.profile.active ? '인연 찾기를 켰어요' : '저장했어요'); track('match_profile', { active: r.profile.active ? 1 : 0 }); location.hash = '#/';
        });
      };
    });
  }
  function verifyView() {
    paint('<div class="hero"><svg class="thread" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 44 C 70 14, 130 58, 205 34 S 330 6, 410 26"/><circle cx="205" cy="34" r="3.5"/></svg><span class="kick">本人確認</span><h1>인연 찾기는<br><em>성인 본인확인</em> 후에</h1><p>안전한 만남을 위해 만 19세 이상 본인확인을 한 번 받아요. 이름·전화번호는 저장하지 않고, 출생 연도·성별과 중복 가입 확인값만 남겨요.</p></div>' +
      '<div class="panel"><button class="btn pink block" id="idvBtn">휴대폰 본인인증 하기</button><p class="msg" id="idvMsg" role="status" style="margin-top:10px"></p><p class="muted" style="margin:8px 0 0">본인인증은 포트원(PortOne)을 통해 진행돼요. 한 사람은 한 계정으로만 인연 찾기를 할 수 있어요.</p></div>', 'match');
    $('#idvBtn').onclick = function () {
      var b = this, m = $('#idvMsg'); b.disabled = true; m.className = 'msg'; m.textContent = '본인인증 창을 여는 중…';
      api('/api/community/verify', { method: 'POST', body: { action: 'start' } }).then(function (d) {
        if (d.verified) { route(); return; }
        if (!d._ok) { b.disabled = false; m.className = 'msg err'; m.textContent = d.configured === false ? '본인인증을 준비하고 있어요. 조금만 기다려 주세요.' : (d.error || '시작하지 못했어요'); return; }
        loadScript(PORTONE_SDK).then(function () {
          return window.PortOne.requestIdentityVerification({ storeId: d.storeId, identityVerificationId: d.identityVerificationId, channelKey: d.channelKey, redirectUrl: location.origin + '/community/?idv=' + encodeURIComponent(d.identityVerificationId) });
        }).then(function (res) {
          if (res && res.code) { b.disabled = false; m.className = 'msg err'; m.textContent = res.message || '본인인증을 마치지 못했어요'; return; }
          return confirmIdv(d.identityVerificationId);
        }).catch(function () { b.disabled = false; m.className = 'msg err'; m.textContent = '본인인증 창을 열지 못했어요. 잠시 후 다시 시도해 주세요.'; });
      });
    };
  }
  /* ── 크레딧: 충전(포트원 결제, 심층 분석과 같은 결제 모듈)·내역 ── */
  function won(n) { return Number(n).toLocaleString('ko-KR') + '원'; }
  function creditSheet() {
    if (!CR) return;
    var packs = CR.packs || [];
    var s = sheet('<h2><span class="hj" style="font-family:var(--f-serif)">緣</span> 인연 크레딧 <b>' + CR.balance + '</b>개</h2>' +
      '<p class="muted" style="margin:6px 0 12px">오늘의 인연 더 보기(' + CR.prices.morePicks + '개), 하루 한도를 넘긴 인연 잇기(' + CR.prices.extraLike + '개)에 써요.</p>' +
      (packs.length ? '<div class="packs">' + packs.map(function (p) { return '<button type="button" class="pack" data-pack="' + esc(p.id) + '"><b>' + p.credits + '개</b><span>' + won(p.price) + '</span></button>'; }).join('') + '</div>' +
        '<p class="muted" style="margin:10px 0 0;font-size:.8rem">결제 후 7일 이내이고 받은 크레딧을 하나도 쓰지 않았다면 <a href="/report/my/">내 구매 내역</a>에서 바로 전액 환불돼요. 쓰기 시작한 뒤에는 환불이 제한돼요. <a href="/report/legal/refund.html">환불정책</a> · <a href="/report/legal/terms.html">이용약관</a></p>'
        : '<p class="muted">지금은 크레딧 충전을 준비하고 있어요.</p>') +
      '<p class="msg" id="crBuyMsg" role="status" style="margin-top:8px"></p>' +
      (CR.history && CR.history.length ? '<h3 style="margin:16px 0 6px;font-size:.95rem">최근 내역</h3><ul class="cr-hist">' + CR.history.slice(0, 10).map(function (h) { return '<li><span>' + esc(h.label) + '</span><span class="muted">' + when(h.at) + '</span><b class="' + (h.delta > 0 ? 'up' : 'down') + '">' + (h.delta > 0 ? '+' : '') + h.delta + '</b></li>'; }).join('') + '</ul>' : '') +
      '<button class="btn ghost block" data-x style="margin-top:14px">닫기</button>');
    s.el.querySelectorAll('[data-pack]').forEach(function (b) { b.onclick = function () { buyCredits(b.dataset.pack, s); }; });
  }
  function buyCredits(id, s) {
    var m = $('#crBuyMsg', s.el), bs = s.el.querySelectorAll('[data-pack]'), done = function (t, err) { bs.forEach(function (b) { b.disabled = false; }); m.className = 'msg' + (err ? ' err' : ''); m.textContent = t || ''; };
    if (!CR.pay || CR.pay.provider !== 'portone') { done('지금은 결제를 준비하고 있어요', true); return; }
    bs.forEach(function (b) { b.disabled = true; }); m.className = 'msg'; m.textContent = '결제창을 여는 중…';
    api('/api/commerce/order', { method: 'POST', body: { productId: id } }).then(function (o) {
      if (!o._ok) { done(o.error === 'verify-required' ? '성인 본인확인을 먼저 해 주세요' : o.error === 'consent-required' ? '이용 동의가 먼저 필요해요' : o.error === 'premium-off' ? '지금은 충전할 수 없어요' : '주문을 만들지 못했어요. 잠시 후 다시 시도해 주세요', true); return; }
      track('credit_buy_start', { pack: id });
      return loadScript(PORTONE_SDK).then(function () {
        var cust = { customerId: o.customerKey }; if (ME && ME.member && ME.member.email) cust.email = ME.member.email;
        return window.PortOne.requestPayment({ storeId: CR.pay.storeId, channelKey: CR.pay.channelKey, paymentId: o.orderId, orderName: o.orderName, totalAmount: o.amount, currency: 'KRW', payMethod: 'CARD', redirectUrl: location.origin + '/community/?pay=portone', customer: cust });
      }).then(function (res) {
        if (!res) return;   // 모바일: 결제 페이지로 이동 중(돌아오면 아래 복귀 처리)
        if (res.code != null) { done(/취소/.test(res.message || '') ? '' : '결제가 완료되지 않았어요: ' + (res.message || res.code), true); return; }
        m.textContent = '결제를 확인하는 중…';
        return confirmPay(o.orderId).then(function (ok) { if (ok) { s.close(); matchView(); } else done('', true); });
      });
    }).catch(function () { done('결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요', true); });
  }
  // 서버가 포트원에 결제를 다시 조회해 금액이 맞을 때만 크레딧을 준다. '처리 중'이면 잠깐 기다렸다 두 번 더 묻는다
  function confirmPay(pid, tries) {
    tries = tries || 0;
    return api('/api/commerce/confirm', { method: 'POST', body: { paymentId: pid } }).then(function (d) {
      if ((d._s === 202 || d._s === 502) && tries < 2) return new Promise(function (ok) { setTimeout(ok, 2000); }).then(function () { return confirmPay(pid, tries + 1); });
      if (d._ok && d.ok) { toast('크레딧을 충전했어요'); track('credit_buy_done'); return true; }
      toast(d.error === 'grant-failed' ? '결제는 되었지만 크레딧 지급에 실패했어요. 문의해 주시면 바로 넣어 드려요(주문번호 ' + pid + ')' : d._s === 202 ? '결제를 확인하고 있어요. 잠시 후 다시 열어 주세요' : '결제를 확인하지 못했어요');
      return false;
    });
  }
  function confirmIdv(id) {
    return api('/api/community/verify', { method: 'POST', body: { action: 'confirm', id: id } }).then(function (d) {
      if (d._ok) { toast('본인확인을 마쳤어요'); track('match_verified'); location.hash = '#/match/edit'; route(); return; }
      toast(d.error || '본인확인을 마치지 못했어요'); if (location.hash.indexOf('#/') !== 0) location.hash = '#/';
    });
  }

  /* ── 대화(서버 경유, 화면이 열려 있을 때만 4초마다 새 메시지 확인) ── */
  var POLL = null;
  function stopPoll() { if (POLL) { clearTimeout(POLL); POLL = null; } }
  function chatList() {
    paint('<h1 style="margin:6px 2px 12px">대화</h1><div id="rooms"><div class="skel"></div></div>', 'chat');
    api('/api/community/chat?view=rooms').then(function (d) {
      var box = $('#rooms'); if (!box) return;
      if (!d._ok) { if (d.need === 'verify') { verifyView(); return; } box.innerHTML = '<p class="msg err">' + esc(d.error || '불러오지 못했어요') + '</p>'; return; }
      setChatBadge(d.rooms.some(function (r) { return r.unread; }));
      box.innerHTML = d.rooms.length ? d.rooms.map(function (r) { return '<a class="card room' + (r.open ? '' : ' closed') + '" href="#/chat/' + r.id + '">' + ava({ name: r.name, avatar: r.avatar }) + '<div class="rm"><b>' + esc(r.name) + (r.open ? '' : ' <small class="muted">· 끝난 대화</small>') + '</b><p>' + esc(r.last) + '</p></div><span class="rt">' + when(r.lastAt) + (r.unread ? '<i class="dot" aria-label="새 메시지"></i>' : '') + '</span></a>'; }).join('') : empty('아직 이어진 인연이 없어요', '두 사람이 모두 인연을 이으면 여기에서 대화할 수 있어요');
    });
  }
  function chatRoom(id) {
    var last = 0, me0 = null, alive = true;
    paint('<div class="chat-h"><a class="back" href="#/chat">' + ICON.back + '</a><span id="chWho" class="who"></span><button class="act icon" id="chMenu" aria-label="대화 메뉴">⋯</button></div><div id="msgs" class="msgs" aria-live="polite"></div><form class="composer chat-in" id="chF"><p class="reply" id="chTip" hidden></p><div class="in"><textarea name="body" rows="1" maxlength="1000" placeholder="메시지 보내기" aria-label="메시지"></textarea><button class="send" type="submit" aria-label="보내기" disabled>' + ICON.send + '</button></div></form>', 'chat');
    var box = $('#msgs'), f = $('#chF'), ta = f.elements.body, sb = f.querySelector('.send');
    var draw = function (ms, tips) {
      ms.forEach(function (m) {
        if ($('#m' + m.id)) return; last = Math.max(last, m.id);
        box.insertAdjacentHTML('beforeend', '<div class="msg-row' + (m.mine ? ' mine' : '') + '" id="m' + m.id + '"><div class="bubble">' + esc(m.body) + '</div><span class="mt">' + new Date(m.at).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit' }) + '</span></div>' + (m.flagged && tips && tips[m.flagged] ? '<p class="sys">⚠ ' + esc(tips[m.flagged]) + '</p>' : ''));
      });
      if (ms.length) window.scrollTo(0, document.body.scrollHeight);
    };
    var tick = function () {
      if (!alive) return;
      api('/api/community/chat?room=' + id + '&after=' + last).then(function (d) {
        if (!alive) return;
        if (!d._ok) { if (d.need === 'verify') { verifyView(); return; } box.innerHTML = '<p class="msg err">' + esc(d.error || '대화를 불러오지 못했어요') + '</p>'; return; }
        if (!me0) { me0 = d.room; $('#chWho').innerHTML = ava({ name: d.room.name, avatar: d.room.avatar }, 1) + '<b>' + esc(d.room.name) + '</b>' + (d.room.ilju ? '<span class="pill">' + esc(d.room.ilju) + '</span>' : ''); if (!d.messages.length && !last) box.innerHTML = '<p class="sys">붉은 실이 이어졌어요. 먼저 가볍게 인사해 보세요. 처음 만난 사이에서 돈·투자·외부 연락처 이야기는 조심해 주세요.</p>'; }
        if (!d.room.open) { f.hidden = true; if (!$('#closed')) box.insertAdjacentHTML('beforeend', '<p class="sys" id="closed">대화가 끝났어요.</p>'); }
        draw(d.messages, d.tips);
        if (!document.hidden) POLL = setTimeout(tick, 4000); else POLL = setTimeout(tick, 15000);
      });
    };
    ta.oninput = function () { sb.disabled = !ta.value.trim(); ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
    ta.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(min-width: 640px)').matches) { e.preventDefault(); f.requestSubmit(); } };
    f.onsubmit = function (e) {
      e.preventDefault(); var body = ta.value.trim(); if (!body) return; sb.disabled = true;
      api('/api/community/chat', { method: 'POST', body: { action: 'send', room: +id, body: body } }).then(function (d) {
        if (!d._ok) { toast(d.error || '보내지 못했어요'); sb.disabled = false; return; }
        ta.value = ''; ta.style.height = ''; draw([d.message], d.tip ? (function () { var o = {}; o[d.message.flagged] = d.tip; return o; })() : null); track('chat_send');
      });
    };
    $('#chMenu').onclick = function () {
      var s = sheet('<h2>대화 메뉴</h2><div style="display:grid;gap:8px;margin-top:14px"><button class="btn ghost block" data-a="report">신고하기</button><button class="btn ghost block" data-a="block">차단하고 대화 끝내기</button><button class="btn ghost block" data-a="leave">대화 끝내기</button><button class="btn block" data-x>닫기</button></div>');
      $$('[data-a]', s.el).forEach(function (b) { b.onclick = function () {
        var a = b.dataset.a; s.close();
        if (a === 'report') {
          var r = sheet('<h2>신고하기</h2><p class="muted" style="margin:6px 0 8px">운영진이 최근 대화 일부를 확인해요. 상대에게 알리지 않아요.</p><form class="form" id="crF"><div>' + Object.keys(REASONS).map(function (k) { return '<label class="radio"><input type="radio" name="reason" value="' + k + '"> ' + REASONS[k] + '</label>'; }).join('') + '</div><label>자세한 내용 (선택)<textarea name="detail" rows="2" maxlength="300"></textarea></label><div class="grid2"><button class="btn ghost" type="button" data-x>취소</button><button class="btn pink" type="submit">신고하기</button></div></form>');
          $('#crF', r.el).onsubmit = function (e) { e.preventDefault(); var fe = e.target.elements; if (!fe.reason.value) return; api('/api/community/chat', { method: 'POST', body: { action: 'report', room: +id, reason: fe.reason.value, detail: fe.detail.value } }).then(function (d) { r.close(); toast(d._ok ? '신고를 접수했어요' : (d.error || '접수하지 못했어요')); }); };
          return;
        }
        confirmSheet(a === 'block' ? '차단하고 대화를 끝낼까요?' : '대화를 끝낼까요?', '끝낸 대화는 다시 열 수 없어요.', a === 'block' ? '차단하기' : '끝내기', function () { api('/api/community/chat', { method: 'POST', body: { action: a, room: +id } }).then(function () { toast(a === 'block' ? '차단했어요' : '대화를 끝냈어요'); location.hash = '#/chat'; }); });
      }; });
    };
    STOP_ROOM = function () { alive = false; stopPoll(); };
    tick();
  }
  var STOP_ROOM = null, BADGE_AT = 0;
  function setChatBadge(on) { var t = $('.tabbar [data-tab="chat"]'); if (t) t.classList.toggle('has-new', !!on); }
  function checkBadge() { if (!ME || !ME.member || Date.now() - BADGE_AT < 30000) return; BADGE_AT = Date.now(); api('/api/community/chat?view=rooms').then(function (d) { if (d._ok) setChatBadge(d.rooms.some(function (r) { return r.unread; })); }); }

  /* ── 라우터 ── */
  var FEAT_NAME = { plaza: '광장은', records: '운테크·기록은', match: '인연 찾기는', chat: '대화는' };
  function featOn(k) { return !(ME && ME.features && ME.features[k] === false); }
  function paused(k, tab) { paint(empty(FEAT_NAME[k] + ' 지금 잠시 쉬고 있어요', '조금 뒤에 다시 찾아 주세요. 내 글·기록·대화는 그대로 남아 있어요.') + '<p style="text-align:center"><a class="btn ghost sm" href="#/me">나의 화면으로</a></p>', tab); }
  function applyFeatures() {
    var hide = { match: !featOn('match'), chat: !featOn('chat'), write: !featOn('plaza'), plaza: !featOn('plaza') };
    $$('.tabbar a').forEach(function (a) { a.hidden = !!hide[a.dataset.tab]; });
  }
  function routeFeature(p) {
    var r = p[0] || '';
    if (r === 'p' || r === 'write' || r === 'edit' || r === 'search' || r === 'groups' || r === 'g' || r === 'plaza') return 'plaza';
    if (r === 'today' || r === 'records') return 'records';
    if (r === 'chat') return 'chat';
    if (r === 'match' || r === 'verify' || r === '') return 'match';
    return '';
  }
  function route() {
    var h = parseHash(), p = h.parts;
    stopPetals(); stopPoll(); if (STOP_ROOM) { STOP_ROOM(); STOP_ROOM = null; }
    me().then(function () {
      var wl = $('.tabbar [data-tab="write"]'); if (wl) wl.href = '#/write';
      applyFeatures();
      var fk = routeFeature(p);
      if (fk === 'match' && !p[0] && !featOn('match')) { if (featOn('plaza')) return feedView(h.q); return meView(h.q); }   // 첫 화면: 인연 찾기가 꺼져 있으면 광장(그것도 꺼지면 나)
      if (fk && !featOn(fk)) return paused(fk, fk === 'plaza' ? 'plaza' : fk === 'chat' ? 'chat' : fk === 'match' ? 'match' : '');
      if (p[0] === 'p' && /^\d+$/.test(p[1] || '')) return postView(p[1]);
      if (p[0] === 'write') return writeView(h.q);
      if (p[0] === 'edit' && /^\d+$/.test(p[1] || '')) return writeView(h.q, p[1]);
      if (p[0] === 'search') return searchView(h.q);
      if (p[0] === 'groups') return groupsView();
      if (p[0] === 'today') return todayView();
      if (p[0] === 'records') return recordsView(h.q);
      if (p[0] === 'g' && (p[1] === 'ilju' || p[1] === 'ilgan') && p[2]) return feedView(h.q, { kind: p[1], key: p[2] });
      if (p[0] === 'me') return meView(h.q);
      checkBadge();
      if (p[0] === 'plaza') return feedView(h.q);
      if (p[0] === 'match' && p[1] === 'inbox') return inboxView(h.q);
      if (p[0] === 'match' && p[1] === 'edit') return matchEdit();
      if (p[0] === 'verify') return verifyView();
      if (p[0] === 'chat' && /^\d+$/.test(p[1] || '')) return chatRoom(p[1]);
      if (p[0] === 'chat') return chatList();
      return matchView();
    });
  }
  window.addEventListener('hashchange', route);
  $('#leave').onclick = function () { fetch('/api/community/enter', { method: 'DELETE', credentials: 'same-origin' }).finally(function () { location.href = '/gate/'; }); };

  /* ── 히어로 벚꽃잎(캔버스 1개, 홈에서만). 움직임 줄이기면 그리지 않고, 화면 밖·탭 숨김이면 멈춘다 ── */
  var PET = null;
  function stopPetals() { if (PET) { PET.stop(); PET = null; } }
  function petals() {
    var cv = $('#petals'); if (!cv || !cv.getContext) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, ps = [], raf = 0, prev = 0, vis = true, dead = false;
    var size = function () { var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    var mk = function (top) { return { x: Math.random() * W, y: top ? -12 : Math.random() * H, s: 4 + Math.random() * 5, vx: 10 + Math.random() * 14, vy: 8 + Math.random() * 12, r: Math.random() * 6.28, vr: (Math.random() - .5) * 1.6, a: .35 + Math.random() * .4 }; };
    size(); for (var i = 0; i < Math.round(Math.max(8, Math.min(16, W / 40))); i++) ps.push(mk(false));
    var tick = function (t) {
      raf = 0; if (!vis || dead) return; var dt = prev ? Math.min(.05, (t - prev) / 1000) : 0; prev = t; ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p, i) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; if (p.y > H + 12 || p.x > W + 12) { ps[i] = mk(true); ps[i].x = Math.random() * W * .8; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = p.a; ctx.fillStyle = '#F3CDD3'; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.quadraticCurveTo(p.s, -p.s * .2, 0, p.s); ctx.quadraticCurveTo(-p.s, -p.s * .2, 0, -p.s); ctx.fill(); ctx.restore(); });
      raf = requestAnimationFrame(tick);
    };
    var go = function () { if (!raf && vis && !dead) { prev = 0; raf = requestAnimationFrame(tick); } };
    var io = window.IntersectionObserver ? new IntersectionObserver(function (es) { vis = es[0].isIntersecting && !document.hidden; go(); }) : null; if (io) io.observe(cv);
    var onVis = function () { vis = !document.hidden; go(); };
    document.addEventListener('visibilitychange', onVis); window.addEventListener('resize', size);
    PET = { stop: function () { dead = true; if (raf) cancelAnimationFrame(raf); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', size); } };
    go();
  }
  (function () { var u = new URL(location.href), id = u.searchParams.get('identityVerificationId') || u.searchParams.get('idv');
    if (u.searchParams.get('pay') === 'portone') { var pid = u.searchParams.get('paymentId'), code = u.searchParams.get('code'), pm = u.searchParams.get('message'); history.replaceState(null, '', '/community/#/'); if (pid && !code) me().then(function () { confirmPay(pid).then(function () { route(); }); }); else { if (code && !/취소/.test(pm || '')) toast('결제가 완료되지 않았어요: ' + (pm || code)); route(); } return; }
    if (id) { history.replaceState(null, '', '/community/#/'); me().then(function () { confirmIdv(id); }); return; } route(); })();
})();
