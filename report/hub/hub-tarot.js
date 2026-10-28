// 무료 타로 화면. 카드 데이터·정/역방향·점수·해석 틀은 전부 /shared-core.js(MantraCore.Tarot)에서 온다 — 만세력 앱의 타로와 같은 데이터이며, 생성형 AI 는 쓰지 않는다.
// 흐름: 종류 선택 → (1) 질문 떠올리기 → (2) 카드 뒷면 78장 → (3) 한 장 선택 → (4) 뒤집기 → (5) 카드·정/역방향 → (6) 순차 공개되는 풀이 → 사주로 이어지는 다리.
// 진행 상태는 sessionStorage('tarot')에 둬서 새로고침·뒤로가기를 해도 같은 결과가 그대로 보인다.
(function (root) {
  'use strict';
  var H = root.Hub, Tarot = root.MantraCore.Tarot, esc = H.esc;
  var KEY = 'tarot';
  var ICON = { today: '日', love: '緣', money: '財', work: '業', yesno: '?' };
  var SUB = { today: '오늘 나에게 필요한 메시지', love: '마음에 둔 관계의 흐름', money: '돈의 들고 남', work: '일과 사업의 방향', yesno: '예 · 아니오로 답하기' };
  var ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
  var RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'P', 'Kn', 'Q', 'K'];

  var IMGS = {}; // 관리자가 올린 카드 이미지(/api/free-content 의 tarot.images). 불러오기 전·실패 시에는 기본 파일명을 쓴다
  var FRAME = null; // 공통 카드 프레임(관리자가 켠 경우만): { url, win:[x,y,w,h] } — win 은 카드 전체 대비 그림 창 비율. 카드 그림은 창 위치에 깔고 프레임 이미지를 그 위에 덮는다
  function applyImgs(ov) { var t = ov && ov.tarot, f = t && t.frame; IMGS = (t && t.images) || {}; FRAME = f && f.url && f.win && f.win.length === 4 ? f : null; }
  if (H.freeContent) H.freeContent().then(applyImgs);

  var SPREAD_KEY = 'tarot_spread', SP = Tarot.legacy.TR_SPREAD; // 카드 배열: one(원 카드) · three(과거·현재·미래) · four(상황·장애물·조언·결과). YES/NO 는 한 장으로만 본다.
  function curSpread() { var v = H.ss(SPREAD_KEY); return typeof v === 'string' && SP[v] ? v : 'one'; }
  function spreadFor(m, sp) { return m === 'yesno' || !SP[sp] ? 'one' : sp; }
  function fresh(m, sp) { return { m: m, spread: spreadFor(m, sp || curSpread()), cards: Tarot.draw(Tarot.cards.length), pick: null, picks: [], step: 'ask', seed: Math.random().toString(36).slice(2, 10) }; } // seed: 같은 결과를 다시 열어도 문장이 바뀌지 않게 한다(FreeCore.composeTarot)

  // 카드 앞면: 자리표시를 바닥에 깔고 그 위에 이미지를 얹는다. 이미지가 없거나 실패하면 이미지 요소를 지워 자리표시가 그대로 보인다(깨진 아이콘 없음).
  function framed(card) { // 프레임 + 그림 창 + 카드 이름(창 아래 띠에 얹는다). 프레임이 있어도 그림이 올라가 있지 않은 카드는 기존 자리표시를 쓴다
    var w = FRAME.win, pc = function (v) { return (v * 100).toFixed(2) + '%'; }, by = w[1] + w[3];
    return '<div class="fx"><div class="tf"></div><div class="fa" style="left:' + pc(w[0]) + ';top:' + pc(w[1]) + ';width:' + pc(w[2]) + ';height:' + pc(w[3]) + '"><img class="tcimg" src="' + esc(IMGS[card.id]) + '" alt="' + esc(card.nameKo) + '" loading="lazy" decoding="async"></div>' +
      '<img class="ffr" src="' + esc(FRAME.url) + '" alt="" decoding="async"><div class="fnm" style="left:' + pc(w[0]) + ';top:' + pc(by) + ';width:' + pc(w[2]) + ';height:' + pc(Math.max(0.04, 1 - by - 0.02)) + '"><span>' + esc(card.nameKo) + '</span></div></div>';
  }
  function face(card, rev) {
    if (FRAME && IMGS[card.id]) return framed(card);
    var no = card.suit === 'M' ? ROMAN[card.number] : RANKS[card.rank];
    return '<div class="tf"><span class="no">' + no + '</span><span class="nm">' + esc(card.nameKo) + '</span><span class="en">' + esc(card.nameEn) + '</span>' + (card.suit === 'M' ? '' : '<span class="su">' + Tarot.suitKo[card.suit] + '</span>') + '</div>' +
      '<img class="tcimg" src="' + esc(IMGS[card.id] || card.imageUrl) + '" alt="' + esc(card.nameKo) + '" loading="lazy" decoding="async">';
  }

  /* ── 종류 선택 ───────────────────────────────────────────── */
  H.route('tarot', function () {
    var h = '<section class="hero" style="text-align:left;padding-bottom:6px"><p class="kick">FREE TAROT</p><h1 class="h1">마음속 질문 하나를<br>떠올려보세요.</h1><p class="sub">AI가 아닌, 준비된 카드 해석으로 바로 읽어드려요. 생년월일은 필요 없습니다.</p></section><div class="tsp" role="group" aria-label="카드 배열"><p class="sub" style="margin:0 0 6px">카드 배열</p><div class="chips">' + Object.keys(SP).map(function (k) { return '<button type="button" class="chipbtn" data-sp="' + k + '" aria-pressed="' + (curSpread() === k) + '">' + esc(SP[k][0]) + ' <small>' + SP[k][1].length + '장</small></button>'; }).join('') + '</div><p class="note" id="spnote">' + spNote(curSpread()) + '</p></div><div class="tmodes">';
    Object.keys(Tarot.modes).forEach(function (k) { h += '<button type="button" class="tm" data-m="' + k + '"><span class="ic" aria-hidden="true">' + ICON[k] + '</span><span><b>' + esc(Tarot.modes[k].name) + '</b><small>' + SUB[k] + '</small></span><span class="ar" aria-hidden="true">›</span></button>'; });
    var el = H.view(h + '</div>');
    el.onclick = function (e) {
      var sb = e.target.closest('[data-sp]');
      if (sb) { H.ss(SPREAD_KEY, sb.dataset.sp); H.track('tarot_spread_select', { spread: sb.dataset.sp }); [].forEach.call(el.querySelectorAll('[data-sp]'), function (x) { x.setAttribute('aria-pressed', String(x === sb)); }); var nt = el.querySelector('#spnote'); if (nt) nt.innerHTML = spNote(sb.dataset.sp); return; }
      var b = e.target.closest('[data-m]'); if (!b) return; var m = b.dataset.m, sp = spreadFor(m, curSpread()); H.track('tarot_category_select', { mode: m, spread: sp }); H.ss(KEY, fresh(m, sp)); H.go('#/tarot/play?m=' + m + '&sp=' + sp);
    };
    H.track('tarot_view'); H.track('tarot_open', null, true);
  });

  function spNote(sp) { var pos = SP[sp][1]; return sp === 'one' ? '카드 한 장으로 지금의 메시지를 봅니다. YES/NO 는 항상 한 장으로 봅니다.' : pos.map(function (p) { return esc(p[1]); }).join(' · ') + ' — ' + pos.length + '장을 차례로 골라 자리별 풀이와 종합 풀이를 봅니다. YES/NO 는 한 장으로만 봅니다.'; }

  /* ── 진행 ───────────────────────────────────────────────── */
  H.route('tarot/play', function (q, ctx) {
    var m = Tarot.modes[q.m] ? q.m : 'today', st = H.ss(KEY), want = spreadFor(m, q.sp || (st && st.spread) || curSpread());
    if (!st || st.m !== m || !st.cards || st.cards.length !== Tarot.cards.length || (st.spread || 'one') !== want) { st = fresh(m, want); H.ss(KEY, st); } // 주소로 바로 들어온 경우
    if (!st.picks) st.picks = [];
    if (st.spread !== 'one' && st.picks.length === SP[st.spread][1].length) return resultSpread(st, ctx, false);
    if (st.spread === 'one' && st.pick != null) return result(st, ctx, false);
    if (st.step === 'spread') return st.spread === 'one' ? spread(st, ctx) : spreadMulti(st, ctx);
    ask(st, ctx);
  });

  function ask(st, ctx) { // STEP 1
    var mode = Tarot.modes[st.m];
    var el = H.view('<div class="tstage"><p class="kick">' + esc(mode.name).toUpperCase() + '</p><div class="pulse" aria-hidden="true"></div><h1 class="ask">마음속으로<br>질문 하나를 떠올려보세요.</h1><p class="sub">' + esc(mode.ask) + '<br>떠올렸다면 준비가 된 거예요.</p><button type="button" class="btn" id="go">카드 고르러 가기</button>' + (st.spread !== 'one' ? '<p class="note">' + esc(SP[st.spread][0]) + ' · ' + SP[st.spread][1].length + '장을 차례로 고릅니다.</p>' : '') + '<p class="note">질문은 입력하지 않아도 됩니다. 마음속으로만 정해 주세요.</p></div>');
    H.$('#go', el).onclick = function () { st.step = 'spread'; H.ss(KEY, st); if (st.spread === 'one') spread(st, ctx); else spreadMulti(st, ctx); };
  }

  function spreadMulti(st, ctx) { // 여러 장 배열: 같은 78장 중에서 자리마다 한 장씩 차례로 고른다(고른 카드는 흐리게 남고 다시 고를 수 없다)
    var mode = Tarot.modes[st.m], pos = SP[st.spread][1], n = st.cards.length;
    var h = '<div class="tstage"><p class="kick">' + esc(mode.name).toUpperCase() + ' · ' + esc(SP[st.spread][0]).toUpperCase() + '</p><h1 class="ask" id="mhead"></h1><p class="sub" id="msub"></p><div class="chips" id="mslots" aria-live="polite"></div></div><div class="deck" id="fan" role="group" aria-label="카드 ' + n + '장">';
    for (var i = 0; i < n; i++) h += '<button type="button" class="tc mini" style="--i:' + Math.min(i, 24) + '" data-i="' + i + '" aria-label="카드 ' + (i + 1) + '번 뽑기"><div class="back"></div></button>';
    var el = H.view(h + '</div>'), fan = H.$('#fan', el), busy = false;
    function paint() {
      var k = st.picks.length, p = pos[Math.min(k, pos.length - 1)];
      H.$('#mhead', el).innerHTML = k >= pos.length ? '카드를 모두 골랐어요.' : esc(p[1]) + ' 카드를<br>선택하세요.';
      H.$('#msub', el).textContent = k >= pos.length ? '자리별 풀이를 불러오는 중입니다…' : (k + 1) + ' / ' + pos.length + ' · ' + p[3] + '을 비추는 카드예요. 직감이 가리키는 카드를 눌러 주세요.';
      H.$('#mslots', el).innerHTML = pos.map(function (q, j) { return '<i' + (j < k ? ' style="border-color:var(--gold);color:var(--gold)"' : '') + '>' + esc(q[1]) + (j < k ? ' ✓' : '') + '</i>'; }).join('');
      [].forEach.call(fan.querySelectorAll('.tc'), function (b) { var taken = st.picks.indexOf(+b.dataset.i) >= 0; b.disabled = taken || k >= pos.length; b.classList.toggle('dim', taken); b.classList.toggle('pick', taken); });
    }
    paint();
    fan.onclick = function (e) {
      var b = e.target.closest('.tc'); if (!b || busy || b.disabled) return; var i = +b.dataset.i; if (st.picks.indexOf(i) >= 0) return;
      st.picks.push(i); H.ss(KEY, st); H.track('tarot_card_select', { mode: st.m, spread: st.spread, n: st.picks.length }); paint();
      if (st.picks.length === pos.length) { busy = true; H.track('tarot_card_draw', { mode: st.m, spread: st.spread }); setTimeout(function () { if (!H.alive(ctx)) return; resultSpread(st, ctx, true); }, H.reduce ? 150 : 700); }
    };
  }

  function spread(st, ctx) { // STEP 2~3: 78장 전부를 뒷면으로 펼쳐 놓고 한 장을 고른다(섞인 순서·정/역방향은 fresh() 에서 이미 정해져 있다)
    var mode = Tarot.modes[st.m], n = st.cards.length, h = '<div class="tstage"><p class="kick">' + esc(mode.name).toUpperCase() + '</p><h1 class="ask">가장 먼저 눈이 가는<br>카드 한 장을 선택하세요.</h1><p class="sub">타로 ' + n + '장이 모두 섞여 있어요.<br>직감이 가리키는 카드를 눌러 주세요.</p></div><div class="deck" id="fan" role="group" aria-label="카드 ' + n + '장">';
    for (var i = 0; i < n; i++) h += '<button type="button" class="tc mini" style="--i:' + Math.min(i, 24) + '" data-i="' + i + '" aria-label="카드 ' + (i + 1) + '번 뽑기"><div class="back"></div></button>';
    var el = H.view(h + '</div>');
    var fan = H.$('#fan', el), busy = false;
    fan.onclick = function (e) {
      var b = e.target.closest('.tc'); if (!b || busy) return; busy = true;
      var i = +b.dataset.i;
      H.$$('.tc', fan).forEach(function (x) { x.disabled = true; x.classList.add(x === b ? 'pick' : 'dim'); });
      H.track('tarot_card_select', { mode: st.m }); H.track('tarot_card_draw', { mode: st.m });
      setTimeout(function () { if (!H.alive(ctx)) return; st.pick = i; H.ss(KEY, st); result(st, ctx, true); }, H.reduce ? 150 : 650);
    };
  }

  function result(st, ctx, animate) { // STEP 4~6
    if (!root.FreeCore) return resultLegacy(st, ctx, animate);
    H.freeContent().then(function (ov) { if (H.alive(ctx)) reading(st, ctx, animate, ov); });
  }
  var LABEL = { today: '오늘의 카드', love: '연애운', money: '재물운', work: '일·사업운', yesno: 'YES / NO' };
  function reading(st, ctx, animate, ov) { // MINI TAROT READING: 카드 공개 → 핵심 메시지 → 상세 → 흐름 → 좋은 방향 → 조심 → 행동 → 한마디. AI 호출 없음.
    var c = st.cards[st.pick], r = root.FreeCore.composeTarot(Tarot, c.id, c.rev, st.m, st.seed || c.id, ov), card = r.card, mode = Tarot.modes[st.m];
    var t = animate && !H.reduce ? 0 : -1, d = function (n) { return t < 0 ? '' : ' style="--d:' + n.toFixed(1) + 's"'; }, rv = t < 0 ? '' : ' rv', next = P2(), n = 0;
    var sec = function (title, body, cls) { n++; return '<div class="rsec' + (cls ? ' ' + cls : '') + rv + '"' + d(1.8 + n * 0.7) + '><h4>' + title + '</h4>' + body + '</div>'; };
    var h = '<div class="rcap"><p class="kick">MINI TAROT READING · ' + esc(mode.name).toUpperCase() + '</p></div>' +
      '<div class="result-card"><div class="tc' + (animate ? '' : ' flip') + (c.rev ? ' rev' : '') + '" id="rc"><div class="back"></div><div class="face' + (c.rev ? ' rev' : '') + '">' + face(card, c.rev) + '</div></div></div>' +
      '<div class="rcap' + rv + '"' + d(0.9) + '><div class="en">' + esc(card.nameEn).toUpperCase() + '</div><div class="ko">' + esc(card.nameKo) + ' · ' + (c.rev ? '역방향' : '정방향') + '</div></div>' +
      (r.verdict ? '<div class="verdict ' + r.verdict + rv + '"' + d(1.2) + '>' + r.verdict + '</div><p class="vlabel' + rv + '"' + d(1.4) + '>' + esc(r.verdictLabel.split(' · ')[1]) + '</p>' : '') +
      '<p class="rhead' + rv + '"' + d(1.4) + '>“' + esc(r.headline) + '”</p><p class="rsum' + rv + '"' + d(1.6) + '>' + esc(r.summary) + '</p>';
    h += sec('상세 해석', r.detail.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''));
    h += sec('지금의 흐름', '<p>' + esc(r.currentFlow) + '</p>');
    h += sec('좋은 방향', '<p>' + esc(r.opportunity) + '</p>', 'good');
    h += sec('조심할 것', '<p>' + esc(r.caution) + '</p>', 'warn');
    h += sec('오늘 해볼 것', '<ul class="dl">' + r.actions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>');
    h += sec('오늘의 한마디', '<p>“' + esc(r.closing) + '”</p>', 'one');
    h += '<div class="bridge' + rv + '"' + d(1.8 + (n + 1) * 0.7) + ' id="rend"><p class="q">카드는 지금의 질문에 답했습니다.<br>그렇다면 당신이 타고난<br>운의 흐름은 어떨까요?</p><p class="sub">생년월일을 통해 당신의 사주팔자와<br>현재 운의 흐름을 확인해보세요.</p>' +
      '<div class="stack"><button type="button" class="btn" id="toSaju">내 운명 이야기 시작하기</button><button type="button" class="btn ghost sm" id="toToday">오늘의 사주 보기</button></div></div>' +
      '<div class="others"><p class="sub">다른 분야도 뽑아 볼까요?</p><div class="chips">' + Object.keys(Tarot.modes).filter(function (k) { return k !== st.m; }).map(function (k) { return '<button type="button" class="chipbtn" data-m="' + k + '">' + esc(LABEL[k]) + '</button>'; }).join('') + '</div></div>' +
      '<p class="dis' + rv + '"' + d(1.8 + (n + 2) * 0.7) + '><button type="button" class="linkbtn" id="again">같은 종류로 다시 뽑기</button> · <button type="button" class="linkbtn" id="menu">다른 타로 보기</button></p>' +
      '<p class="dis">타로는 지금의 마음과 흐름을 비추는 거울입니다. 결과는 정해진 미래가 아니라 선택에 따라 달라질 수 있는 가능성으로 읽어 주세요.</p>';
    var el = H.view(h);
    if (animate && !H.reduce) { var rc = H.$('#rc', el); setTimeout(function () { rc.classList.add('flip'); }, 250); }
    H.$('#toSaju', el).onclick = function () { H.track('tarot_to_saju_click', { mode: st.m, to: 'story' }); H.track('tarot_cta_click', { mode: st.m, to: 'story' }); H.go(next.story); };
    H.$('#toToday', el).onclick = function () { H.track('tarot_to_saju_click', { mode: st.m, to: 'today' }); H.track('tarot_cta_click', { mode: st.m, to: 'today' }); H.go(next.today); };
    H.$('#again', el).onclick = function () { H.track('tarot_redraw', { mode: st.m }); H.ss(KEY, fresh(st.m, st.spread)); H.go('#/tarot/play?m=' + st.m + '&sp=' + spreadFor(st.m, st.spread)); };
    H.$('#menu', el).onclick = function () { H.ss(KEY, null); H.go('#/tarot'); };
    H.$$('.chipbtn', el).forEach(function (b) { b.onclick = function () { H.track('tarot_category_select', { mode: b.dataset.m, from: 'result' }); var sp2 = spreadFor(b.dataset.m, st.spread); H.ss(KEY, fresh(b.dataset.m, sp2)); H.go('#/tarot/play?m=' + b.dataset.m + '&sp=' + sp2); }; });
    var end = H.$('#rend', el); if (end && root.IntersectionObserver) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { H.track('tarot_result_complete', { mode: st.m, card: card.id }, true); io.disconnect(); } }); io.observe(end); }
    H.track('tarot_result_view', { mode: st.m, rev: c.rev ? 1 : 0, card: card.id });
  }
  function resultSpread(st, ctx, animate) { // 여러 장: 카드 공개 → 종합 → 자리별 풀이 → 조언 → 사주로 이어지는 다리. AI 호출 없음.
    var pos = SP[st.spread][1], picks = st.picks.map(function (i) { return st.cards[i]; }), mode = Tarot.modes[st.m];
    var rs = Tarot.readSpread(st.spread, picks, st.m);
    H.freeContent().then(function (ov) { if (!H.alive(ctx)) return; paintSpread(st, ctx, animate, ov, rs, pos, mode); }, function () { if (H.alive(ctx)) paintSpread(st, ctx, animate, null, rs, pos, mode); });
  }
  function paintSpread(st, ctx, animate, ov, rs, pos, mode) {
    var t = animate && !H.reduce ? 0 : -1, d = function (n) { return t < 0 ? '' : ' style="--d:' + n.toFixed(1) + 's"'; }, rv = t < 0 ? '' : ' rv', next = P2(), n = 0;
    var sec = function (title, body, cls) { n++; return '<div class="rsec' + (cls ? ' ' + cls : '') + rv + '"' + d(1.4 + n * 0.6) + '><h4>' + title + '</h4>' + body + '</div>'; };
    var h = '<div class="rcap"><p class="kick">TAROT SPREAD · ' + esc(rs.spreadName).toUpperCase() + '</p></div><div class="sprow" role="group" aria-label="뽑은 카드">' + rs.rows.map(function (r, i) {
      return '<figure class="spc"><div class="tc' + (animate ? '' : ' flip') + (r.rev ? ' rev' : '') + '" id="rc' + i + '"><div class="back"></div><div class="face' + (r.rev ? ' rev' : '') + '">' + face(r.card, r.rev) + '</div></div><figcaption><b>' + esc(r.label) + '</b><span>' + esc(r.card.nameKo) + ' · ' + (r.rev ? '역방향' : '정방향') + '</span></figcaption></figure>';
    }).join('') + '</div>';
    h += '<div class="verdict ' + (rs.bandClass === 'good' ? 'YES' : rs.bandClass === 'bad' ? 'NO' : 'MAYBE') + rv + '"' + d(1.0) + '>' + esc(rs.band) + '</div>' +
      '<p class="rhead' + rv + '"' + d(1.2) + '>“' + esc(rs.oneLine) + '”</p><p class="rsum' + rv + '"' + d(1.4) + '>' + esc(mode.name) + ' · ' + esc(rs.spreadName) + ' — 전체 기운은 ' + esc(rs.band) + '입니다. ' + esc(rs.trend) + (rs.nowRow ? ' 지금은 ' + esc(rs.nowRow.card.nameKo) + (rs.nowRow.rev ? '(역)' : '') + '(“' + esc(rs.nowRow.kw) + '”)의 한가운데에 있고,' : '') + ' 핵심 카드는 ' + esc(rs.keyRow.card.nameKo) + (rs.keyRow.rev ? '(역)' : '') + ', 키워드는 “' + esc(rs.keyRow.kw) + '”입니다.' + (rs.advRow ? ' 조언 자리의 ' + esc(rs.advRow.card.nameKo) + '는 “' + esc(rs.advRow.rev ? rs.advRow.card.reversed + '을(를) 경계하라' : rs.advRow.card.upright) + '”고 말합니다.' : '') + '</p>';
    if (rs.notes.length) h += sec('카드들이 함께 말하는 것', '<ul class="dl">' + rs.notes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>');
    rs.rows.forEach(function (r) {
      var c = root.FreeCore ? root.FreeCore.composeTarot(Tarot, r.card.id, r.rev, st.m, (st.seed || r.card.id) + r.k, ov) : null;
      var body = c ? '<p><b>' + esc(c.headline) + '</b></p><p>' + esc(c.summary) + '</p><p>' + esc(r.rev ? c.caution : c.opportunity) + '</p>' : '<p>“' + esc(r.kw) + '”의 기운이 이 자리에 놓여 있습니다.</p>';
      h += sec(esc(r.label) + ' · ' + esc(r.card.nameKo) + (r.rev ? ' (역방향)' : ''), '<p class="note">' + esc(r.frame) + '을 비추는 카드</p>' + body);
    });
    h += sec('종합 한마디', '<p>“' + esc(rs.advice) + '”</p>', 'one');
    h += '<div class="bridge' + rv + '"' + d(1.6 + (n + 1) * 0.6) + ' id="rend"><p class="q">카드는 지금의 질문에 답했습니다.<br>그렇다면 당신이 타고난<br>운의 흐름은 어떨까요?</p><p class="sub">생년월일을 통해 당신의 사주팔자와<br>현재 운의 흐름을 확인해보세요.</p>' +
      '<div class="stack"><button type="button" class="btn" id="toSaju">내 운명 이야기 시작하기</button><button type="button" class="btn ghost sm" id="toToday">오늘의 사주 보기</button></div></div>' +
      '<div class="others"><p class="sub">다른 배열로도 뽑아 볼까요?</p><div class="chips">' + Object.keys(SP).filter(function (k) { return k !== st.spread; }).map(function (k) { return '<button type="button" class="chipbtn" data-sp2="' + k + '">' + esc(SP[k][0]) + '</button>'; }).join('') + '</div></div>' +
      '<p class="dis' + rv + '"' + d(1.8 + (n + 2) * 0.6) + '><button type="button" class="linkbtn" id="again">같은 배열로 다시 뽑기</button> · <button type="button" class="linkbtn" id="menu">다른 타로 보기</button></p>' +
      '<p class="dis">타로는 지금의 마음과 흐름을 비추는 거울입니다. 결과는 정해진 미래가 아니라 선택에 따라 달라질 수 있는 가능성으로 읽어 주세요.</p>';
    var el = H.view(h);
    if (animate && !H.reduce) rs.rows.forEach(function (r, i) { var rc = H.$('#rc' + i, el); setTimeout(function () { rc.classList.add('flip'); }, 250 + i * 450); });
    H.$('#toSaju', el).onclick = function () { H.track('tarot_to_saju_click', { mode: st.m, to: 'story', spread: st.spread }); H.go(next.story); };
    H.$('#toToday', el).onclick = function () { H.track('tarot_to_saju_click', { mode: st.m, to: 'today', spread: st.spread }); H.go(next.today); };
    H.$('#again', el).onclick = function () { H.track('tarot_redraw', { mode: st.m, spread: st.spread }); H.ss(KEY, fresh(st.m, st.spread)); H.go('#/tarot/play?m=' + st.m + '&sp=' + st.spread); };
    H.$('#menu', el).onclick = function () { H.ss(KEY, null); H.go('#/tarot'); };
    [].forEach.call(el.querySelectorAll('[data-sp2]'), function (b) { b.onclick = function () { H.ss(SPREAD_KEY, b.dataset.sp2); H.track('tarot_spread_select', { spread: b.dataset.sp2, from: 'result' }); H.ss(KEY, fresh(st.m, b.dataset.sp2)); H.go('#/tarot/play?m=' + st.m + '&sp=' + spreadFor(st.m, b.dataset.sp2)); }; });
    var end = H.$('#rend', el); if (end && root.IntersectionObserver) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { H.track('tarot_result_complete', { mode: st.m, spread: st.spread, cards: rs.rows.map(function (r) { return r.card.id; }).join(',') }, true); io.disconnect(); } }); io.observe(end); }
    H.track('tarot_result_view', { mode: st.m, spread: st.spread, rev: rs.rows.filter(function (r) { return r.rev; }).length });
  }
  function resultLegacy(st, ctx, animate) {
    var c = st.cards[st.pick], r = Tarot.read(c.id, c.rev, st.m), card = r.card, mode = Tarot.modes[st.m];
    var t = animate && !H.reduce ? 0 : -1; // 새로 뽑았을 때만 순차 공개(새로고침·뒤로가기는 바로 전부 보여 준다)
    var d = function (n) { return t < 0 ? '' : ' style="--d:' + (n).toFixed(1) + 's"'; }, rv = t < 0 ? '' : ' rv';
    var next = P2();
    var h = '<div class="rcap"><p class="kick">' + esc(mode.name).toUpperCase() + '</p></div>' +
      '<div class="result-card"><div class="tc' + (animate ? '' : ' flip') + (c.rev ? ' rev' : '') + '" id="rc"><div class="back"></div><div class="face' + (c.rev ? ' rev' : '') + '">' + face(card, c.rev) + '</div></div></div>' +
      '<div class="rcap' + rv + '"' + d(0.9) + '><div class="en">' + esc(card.nameEn).toUpperCase() + '</div><div class="ko">' + esc(card.nameKo) + ' · ' + (c.rev ? '역방향' : '정방향') + '</div></div>' +
      (r.verdict ? '<div class="verdict ' + r.verdict + rv + '"' + d(1.2) + '>' + r.verdict + '</div><p class="vlabel' + rv + '"' + d(1.4) + '>' + esc(r.verdictLabel.split(' · ')[1]) + '</p>' : '') +
      '<p class="rhead' + rv + '"' + d(1.4) + '>' + esc(r.headline) + '</p>';
    r.sections.forEach(function (s, i) { h += '<div class="rsec' + rv + '"' + d(2.2 + i * 0.9) + '><h4>' + esc(s[0]) + '</h4><p>' + esc(s[1]) + '</p></div>'; });
    h += '<div class="rsec one' + rv + '"' + d(5.0) + '><h4>한 줄 조언</h4><p>' + esc(r.oneLine) + '</p></div>' +
      '<div class="bridge' + rv + '"' + d(5.9) + '><p class="q">카드는 지금의 질문에 답했습니다.<br>그렇다면 당신이 타고난<br>운의 흐름은 어떨까요?</p><p class="sub">생년월일을 통해 당신의 사주팔자와<br>현재 운의 흐름을 확인해보세요.</p>' +
      '<div class="stack"><button type="button" class="btn" id="toSaju">내 운명 이야기 시작하기</button><button type="button" class="btn ghost sm" id="toToday">오늘의 사주 보기</button></div></div>' +
      '<p class="dis' + rv + '"' + d(6.2) + '><button type="button" class="linkbtn" id="again">같은 종류로 다시 뽑기</button> · <button type="button" class="linkbtn" id="menu">다른 타로 보기</button></p>' +
      '<p class="dis">타로는 지금의 마음과 흐름을 비추는 거울입니다. 결과는 정해진 미래가 아니라 선택에 따라 달라질 수 있는 가능성으로 읽어 주세요.</p>';
    var el = H.view(h);
    if (animate && !H.reduce) { var rc = H.$('#rc', el); setTimeout(function () { rc.classList.add('flip'); }, 250); }
    H.$('#toSaju', el).onclick = function () { H.track('tarot_to_saju_click', { mode: st.m, to: 'story' }); H.go(next.story); };
    H.$('#toToday', el).onclick = function () { H.track('tarot_to_saju_click', { mode: st.m, to: 'today' }); H.go(next.today); };
    H.$('#again', el).onclick = function () { H.track('tarot_redraw', { mode: st.m }); H.ss(KEY, fresh(st.m, st.spread)); H.go('#/tarot/play?m=' + st.m + '&sp=' + spreadFor(st.m, st.spread)); };
    H.$('#menu', el).onclick = function () { H.ss(KEY, null); H.go('#/tarot'); };
    H.track('tarot_result_view', { mode: st.m, rev: c.rev ? 1 : 0, card: card.id });
  }
  // 타로 결과에서 사주로 가는 길: 정보가 없으면 입력 → (첫 방문이면 일주 각성) → MY 운명. 이미 있으면 바로 개인화 콘텐츠.
  function P2() {
    var has = H.profile.has();
    return { story: has ? (H.profile.awakened() ? '#/my' : '#/awaken') : '#/input?next=awaken', today: has ? '#/today' : '#/input?next=today' };
  }
})(window);
