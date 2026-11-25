/* 심리 솔루션 — 화면(3판, 2026-11-25). 계산은 psych.js, 문안은 psych-data.js.
   · 사용자 지시(2026-11-25): 한눈에 보기 → 잠재적 트라우마 → 시기별 스트레스와 감정 상태 → 심리 솔루션, 네 구역만.
     내담자 입력(확인·체크·기록·고르기)과 질문은 모두 뺐다. 상담하는 사람이 읽고 바로 설명할 수 있게 핵심 먼저, 근거는 접기.
   · 저장·네트워크 없음. 그래프 띠 선택만 화면 안에서 바꾼다. 시기는 대운 → 세운 → 월운 순서로 이어서 보여 준다.
   · 사용: MantraPsychView.html(Manse, ch, { esc, term, now }) */
(function (G) {
  'use strict';
  var CSS = '.psy{scroll-margin-top:110px}.psy-intro{font-size:.9rem;color:var(--ink-2);line-height:1.65;margin:0 0 10px}.psy-small{font-size:.76rem;color:var(--ink-3);line-height:1.55}' +
    '.psy-safe-top{font-size:.78rem;color:var(--ink-3);margin:10px 0 0;padding:7px 10px;border-radius:10px;background:var(--surface-2)}' +
    '.psy-ov{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}@media(max-width:900px){.psy-ov{grid-template-columns:1fr 1fr}}@media(max-width:560px){.psy-ov{grid-template-columns:1fr}}' +
    '.psy-ov>a{display:block;border:1px solid var(--line);border-radius:12px;padding:11px 12px;background:var(--surface);color:inherit;text-decoration:none}.psy-ov small{display:block;font-size:.72rem;color:var(--ink-3);font-weight:800}.psy-ov b{display:block;font-size:.95rem;margin:5px 0 3px;line-height:1.45}.psy-ov span.s{font-size:.78rem;color:var(--ink-2);line-height:1.5;display:block}' +
    '.psy-ec{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}.psy-ec span{font-size:.8rem;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--surface-2);color:var(--ink)}' +
    '.psy-card{border:1px solid var(--line);border-radius:14px;background:var(--surface);margin:12px 0;padding:14px 15px}.psy-tn{font-size:.74rem;font-weight:800;color:var(--ink-3);margin:0 0 3px}.psy-core{font-size:1.08rem;font-weight:800;line-height:1.5;margin:0 0 8px}' +
    '.psy-card ul{margin:0 0 6px;padding-left:1.15em;font-size:.88rem;line-height:1.7}.psy-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}@media(max-width:560px){.psy-two{grid-template-columns:1fr}}.psy-two>div{border-radius:10px;padding:8px 10px;background:var(--surface-2);font-size:.85rem;line-height:1.55}.psy-two b{display:block;font-size:.72rem;color:var(--ink-3);margin-bottom:2px}' +
    '.psy-fold{margin:8px 0 0;border-top:1px solid var(--line);padding-top:6px}.psy-fold>summary{cursor:pointer;font-size:.8rem;font-weight:700;color:var(--ink-3);list-style:none;padding:4px 0}.psy-fold>summary::-webkit-details-marker{display:none}.psy-fold>summary:before{content:"＋ "}.psy-fold[open]>summary:before{content:"－ "}' +
    '.psy-basis{font-size:.8rem;line-height:1.55;margin:6px 0;border-left:3px solid var(--line);padding:2px 0 2px 10px}.psy-basis p{margin:2px 0}.psy-k{display:inline-block;font-size:.66rem;padding:0 6px;border-radius:6px;background:var(--surface-2);color:var(--ink-2);margin-right:4px}.psy-basis .m{color:var(--ink-3)}' +
    '.psy-sub{font-size:.95rem;font-weight:800;margin:18px 0 8px}.psy-sub:first-of-type{margin-top:4px}.psy-sub2{font-size:.86rem;font-weight:800;color:var(--ink-2);margin:12px 0 6px}' +
    '.psy-tr{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media(max-width:600px){.psy-tr{grid-template-columns:1fr}}.psy-tr>div{border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:.86rem;line-height:1.6;background:var(--surface)}.psy-tr>div.psy-cur{border-color:var(--accent)}.psy-tr b.h{display:block;font-size:.74rem;color:var(--ink-3)}' +
    '.psy-arrow{margin:10px 0;padding:10px 12px;border-radius:12px;background:var(--surface-2);font-size:.88rem;line-height:1.65}' +
    '.psy-g{width:100%;height:auto;display:block;color:var(--ink)}.psy-g text{font-family:inherit}.psy-gleg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.76rem;color:var(--ink-2);margin:6px 0}.psy-gleg i{display:inline-block;width:18px;height:0;border-top:3px solid var(--accent);vertical-align:middle;margin-right:4px}.psy-gleg i.tr{border-top:8px solid rgba(120,120,140,.22)}' +
    '.psy-bp{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0;font-size:.86rem;line-height:1.6;background:var(--surface)}.psy-bp[hidden]{display:none}.psy-bp h4{margin:0 0 4px;font-size:.92rem}.psy-bp p{margin:3px 0}' +
    '.psy-seg{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.psy-seg button{border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:.84rem;background:var(--surface);color:var(--ink-2);cursor:pointer}.psy-seg button.on{border-color:var(--accent);color:var(--ink);font-weight:700}' +
    '.psy-pane[hidden]{display:none}.psy-row{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0;background:var(--surface)}.psy-row.psy-now{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}' +
    '.psy-row>summary{list-style:none;cursor:pointer}.psy-row>summary::-webkit-details-marker{display:none}.psy-rt{display:block;font-size:.86rem;color:var(--ink-2);margin:4px 0 0;line-height:1.5}.psy-row>summary .psy-rh:after{content:"▾";margin-left:auto;color:var(--ink-3);font-size:.8rem;transition:transform .15s}.psy-row[open]>summary .psy-rh:after{transform:rotate(180deg)}' +
    '.psy-rh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-weight:700}.psy-rh .gz{font-weight:600;color:var(--ink-3);font-size:.82rem}.psy-row p{margin:4px 0;font-size:.85rem;line-height:1.6}.psy-row .lbl{font-size:.74rem;color:var(--ink-3);font-weight:700;margin-right:4px}' +
    '.psy-lv{display:inline-block;font-size:.68rem;font-weight:800;padding:1px 8px;border-radius:999px;background:var(--surface-2);color:var(--ink-2)}.psy-lv.hi{background:#E7E3F7;color:#4B3F99}.psy-lv.lo{background:transparent;border:1px solid var(--line)}' +
    '.psy-emo{display:grid;gap:5px;margin:8px 0 6px}.psy-emo div{font-size:.84rem;line-height:1.55}.psy-emo b{display:inline-block;min-width:5.2em}.psy-emo small{display:block;color:var(--ink-3);font-size:.76rem;padding-left:5.2em}@media(max-width:560px){.psy-emo small{padding-left:0}.psy-emo b{display:block}}' +
    '.psy-mo{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}@media(max-width:700px){.psy-mo{grid-template-columns:repeat(3,1fr)}}.psy-mo>div{border:1px solid var(--line);border-radius:10px;padding:7px 8px;font-size:.78rem;line-height:1.45;background:var(--surface)}.psy-mo>div.psy-now{border-color:var(--accent)}.psy-mo b{display:block;font-size:.8rem}' +
    '.psy-sl{list-style:none;margin:0;padding:0}.psy-sl li{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0;font-size:.87rem;line-height:1.6;background:var(--surface)}.psy-sl li b{display:block;font-size:.9rem}.psy-sl li .need{display:block;color:var(--ink-2);font-size:.83rem}.psy-sl li .act{display:block;margin-top:3px;font-weight:700}.psy-slc li{border:0;border-bottom:1px solid var(--line);border-radius:0;padding:8px 2px;margin:0;background:none}.psy-slc li:last-child{border-bottom:0}.psy-slc li b{display:inline;margin-right:6px}' +
    '.psy-el{border-radius:12px;padding:11px 13px;background:var(--surface-2);font-size:.87rem;line-height:1.65}.psy-tags{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0}.psy-tags span{font-size:.78rem;padding:2px 9px;border-radius:999px;border:1px solid var(--line);background:var(--surface)}' +
    '.psy-safe{border:1px solid var(--line);border-radius:12px;padding:11px 13px;font-size:.86rem;line-height:1.6;margin-top:14px}.psy-safe ul{list-style:none;margin:6px 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px}.psy-safe a{font-weight:800;color:var(--ink)}';
  var injected = false;
  function inject() { if (injected || typeof document === 'undefined') return; injected = true; var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }

  function html(M, ch, o) {
    inject();
    var esc = o.esc, D = G.MantraPsychData, P = G.MantraPsych, r;
    try { r = P.build(M, ch, { now: o.now }); } catch (e) { r = { ok: false, reason: '계산 중 문제가 생겼어요' }; }
    if (!r || !r.ok) return '<section class="card"><div class="card-h"><h2>' + esc(D ? D.TITLE : '심리 솔루션') + '</h2></div><p class="note">' + esc((r && r.reason) || '결과를 만들 수 없어요') + '</p></section>';
    var lv = function (p) { return '<span class="psy-lv ' + p.level + '">' + esc(p.levelK) + '</span>'; };
    var chips = function (a) { return '<div class="psy-ec">' + a.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>'; };
    var O = r.overview, T = r.transition, S = r.solution;

    // ── 1. 한눈에 보기 ──
    var ov = '<section class="card psy" id="psyTop"><div class="card-h"><h2>한눈에 보기</h2></div><div class="psy-ov">' +
      '<a href="#psyPat" data-psy-go="psyPat"><small>가장 두드러진 마음의 상처 패턴</small><b>' + esc(O.pattern ? O.pattern.text : D.NO_THEME) + '</b><span class="s">' + esc(O.pattern ? O.pattern.name : '') + '</span></a>' +
      '<a href="#psyTime" data-psy-go="psyTime"><small>지금 대운 · 다음 전환</small><b>' + esc(O.daeun ? O.daeun.text : '—') + '</b><span class="s">' + esc(O.daeun ? O.daeun.theme : '') + '</span><span class="s">' + esc((O.daeun && O.daeun.next ? '다음 전환 ' + O.daeun.next : '') + (O.daeun && O.daeun.inWindow ? ' · 지금 교운기' : '')) + '</span></a>' +
      '<a href="#psyTime" data-psy-go="psyTime"><small>지금 올라오기 쉬운 감정</small>' + chips(O.emotions) + '<span class="s">지금 대운과 ' + r.year + '년 운 기준</span></a>' +
      '<a href="#psySol" data-psy-go="psySol"><small>먼저 권할 솔루션</small><b>' + esc(O.solution || '—') + '</b></a>' +
      '</div><p class="psy-safe-top">' + esc(D.SAFETY_TOP) + (r.hourKnown ? '' : ' 태어난 시간이 없어 시주 자리는 빼고 읽었어요.') + '</p></section>';

    // ── 2. 잠재적 트라우마 ──
    var cards = r.themes.cards.map(function (c) {
      return '<article class="psy-card"><p class="psy-tn">' + esc(c.name) + '</p><p class="psy-core">' + esc(c.core) + '</p>' +
        '<ul>' + c.scenes.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
        '<div class="psy-two"><div><b>이 방식이 지켜 준 점</b>' + esc(c.keep) + '</div><div><b>지금 부담이 되는 점</b>' + esc(c.cost) + '</div></div>' +
        '<details class="psy-fold"><summary>명리 근거 보기</summary><div class="psy-basis">' + c.basis.map(function (b) { return '<p><span class="psy-k">' + esc(b.k) + '</span>' + esc(b.t) + ' <span class="m">— ' + esc(b.m) + '</span></p>'; }).join('') + (c.schoolNote ? '<p class="m">※ ' + esc(c.schoolNote) + '</p>' : '') + '</div></details></article>';
    }).join('');
    var patSec = '<section class="card psy" id="psyPat"><div class="card-h"><h2>잠재적 트라우마 <small class="muted">' + esc(D.PAT_SUB) + '</small></h2></div><p class="psy-intro">' + esc(D.INTRO) + '</p>' + (cards || '<p class="note">' + esc(D.NO_THEME) + '</p>') + '</section>';

    // ── 3. 시기별 스트레스와 감정 상태 ──
    // 3-1 교운기
    var trHead = T.inWindow ? D.TRANSITION.nowIn : T.next ? D.TRANSITION.soon.replace('{n}', String(Math.max(0, Math.round(T.next.inYears)))) : '';
    var trBox = T.cur ? '<h4 class="psy-sub2">지금 대운과 교운기</h4><p class="psy-intro"><b>' + esc(trHead) + '</b> ' + esc(D.TRANSITION.lead) + '</p>' +
      '<div class="psy-tr"><div class="psy-cur"><b class="h">지금 대운</b><b>' + esc(T.cur.startAge + '세~ ' + T.cur.gz) + '</b> <span class="psy-small">' + esc(T.cur.tg) + '</span><br>' + esc(T.cur.start + ' ~ ' + (T.cur.end || '')) + '<br>' + esc(T.cur.theme) + '</div>' +
      (T.next ? '<div><b class="h">다음 대운</b><b>' + esc(T.next.startAge + '세~ ' + T.next.gz) + '</b> <span class="psy-small">' + esc(T.next.tg) + '</span><br>' + esc(T.next.start + ' 시작') + '<br>' + esc(T.next.theme) + '</div>' : '') + '</div>' +
      (T.from || T.to ? '<div class="psy-arrow"><b>' + esc(D.TRANSITION.from) + '</b> · ' + esc(T.from) + '<br><b>' + esc(D.TRANSITION.to) + '</b> · ' + esc(T.to) + '</div>' : '') +
      '<details class="psy-fold"><summary>대운 계산 기준 보기</summary><p class="psy-small">' + esc(T.basis) + '</p></details>' : '';
    // 3-2 곡선
    var g = r.graph, W = 760, H = 240, L0 = 30, R0 = 10, T0 = 26, B0 = 38, span = g.span;
    var X = function (a) { return L0 + (W - L0 - R0) * a / span; }, Yv = function (v) { return T0 + (H - T0 - B0) * (1 - Math.min(1, v / 0.8)); };
    var path = '', pts = g.points;
    if (pts.length) {
      path = 'M' + X(pts[0].age).toFixed(1) + ' ' + Yv(pts[0].v).toFixed(1);
      for (var i = 1; i < pts.length; i++) { var p0 = pts[i - 1], p1 = pts[i], mx = (X(p0.age) + X(p1.age)) / 2; path += ' C' + mx.toFixed(1) + ' ' + Yv(p0.v).toFixed(1) + ' ' + mx.toFixed(1) + ' ' + Yv(p1.v).toFixed(1) + ' ' + X(p1.age).toFixed(1) + ' ' + Yv(p1.v).toFixed(1); }
    }
    var svg = '<svg class="psy-g" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(D.GRAPH.title) + '"><defs><pattern id="psyHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="rgba(120,120,140,.10)"/><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(120,120,140,.30)" stroke-width="2"/></pattern></defs>';
    g.bands.forEach(function (b, k) {
      var x1 = X(Math.max(0, b.startAge)), x2 = X(Math.min(span, b.endAge)); if (x2 <= x1) return;
      svg += '<g data-psy-band="' + k + '" style="cursor:pointer"><rect x="' + x1.toFixed(1) + '" y="' + T0 + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (H - T0 - B0) + '" fill="' + (b.now ? 'rgba(123,107,214,.14)' : k % 2 ? 'rgba(120,120,140,.07)' : 'rgba(120,120,140,.02)') + '"/><text x="' + ((x1 + x2) / 2).toFixed(1) + '" y="' + (T0 - 8) + '" text-anchor="middle" font-size="10" fill="currentColor" opacity=".7">' + esc(b.gz) + '</text></g>';
    });
    g.transitions.forEach(function (t) { var x1 = X(Math.max(0, t.age - 1)), x2 = X(Math.min(span, t.age + 1)); if (x2 > x1) svg += '<rect x="' + x1.toFixed(1) + '" y="' + T0 + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (H - T0 - B0) + '" fill="url(#psyHatch)" pointer-events="none"/>'; });
    for (var a = 0; a <= span; a += 10) svg += '<text x="' + X(a).toFixed(1) + '" y="' + (H - B0 + 14) + '" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">' + a + '세</text>';
    svg += '<text x="11" y="' + ((T0 + H - B0) / 2) + '" font-size="9.5" fill="currentColor" opacity=".55" transform="rotate(-90 11 ' + ((T0 + H - B0) / 2) + ')" text-anchor="middle">변화 주제의 두드러짐</text>';
    svg += '<path d="' + path + '" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" pointer-events="none"/>';
    if (g.nowAge >= 0 && g.nowAge <= span) { var nx = X(g.nowAge); svg += '<line x1="' + nx.toFixed(1) + '" x2="' + nx.toFixed(1) + '" y1="' + T0 + '" y2="' + (H - B0) + '" stroke="currentColor" stroke-width="1.4" opacity=".75" pointer-events="none"/><text x="' + nx.toFixed(1) + '" y="' + (H - B0 + 30) + '" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor">지금</text>'; }
    svg += '</svg>';
    var bp = g.bands.map(function (b, k) {
      return '<div class="psy-bp" data-psy-bp="' + k + '"' + (b.now ? '' : ' hidden') + '><h4>' + esc(b.startAge + '~' + b.endAge + '세 · ' + b.gz + ' 대운') + (b.now ? ' <span class="psy-lv hi">지금</span>' : '') + '</h4>' +
        '<p><b>주제</b> · ' + esc(b.theme) + '</p><p><b>올라오기 쉬운 감정</b> · ' + esc(b.emotions.join(', ')) + '</p><p class="psy-small">명리 근거: ' + esc([b.tg].concat(b.basis.slice(1)).join(' · ')) + '</p></div>';
    }).join('');
    var graph = '<h4 class="psy-sub2">' + esc(D.GRAPH.title) + '</h4><div class="psy-gleg"><span><i></i>' + esc(D.GRAPH.yLabel) + '</span><span><i class="tr"></i>교운기(대운 전환 앞뒤 1년)</span></div>' + svg +
      '<p class="psy-small">' + esc(D.GRAPH.tap) + '</p>' + bp + '<details class="psy-fold"><summary>곡선은 어떻게 만들었나요?</summary><p class="psy-small">' + esc(g.how) + '</p></details>';
    // 3-3 시기별 감정
    var emoBox = function (p) { return '<div class="psy-emo">' + p.emotions.map(function (e) { return '<div><b>' + esc(e.name) + '</b>' + esc(e.when) + '<small>다루는 법 · ' + esc(e.care) + '</small></div>'; }).join('') + '</div>'; };
    var row = function (p, head, open) {
      return '<details class="psy-row' + (p.now ? ' psy-now' : '') + '"' + (open || p.now ? ' open' : '') + '><summary><div class="psy-rh">' + head + lv(p) + (p.now ? '<span class="psy-lv hi">지금</span>' : '') + '</div>' +
        '<span class="psy-rt">' + esc(p.theme) + '</span>' + chips(p.emotions.map(function (e) { return e.name; })) + '</summary>' + emoBox(p) +
        (p.mood ? '<p><span class="lbl">마음의 온도</span><b>' + esc(p.mood.k) + '</b> — ' + esc(p.mood.t) + '</p>' : '') +
        (p.hits.length ? '<p><span class="lbl">흔들리는 자리</span>' + esc(p.hits.map(function (h) { return h.text + '(' + h.name + ')'; }).join(' · ')) + '</p>' : '') + '</details>';
    };
    var dRow = function (p) { return row(p, esc(p.startAge + '세~') + ' <span class="gz">' + esc(p.gz + ' 대운 · ' + p.stemTG + '/' + p.branchTG) + '</span>'); };
    var ci = -1; r.daeun.forEach(function (p, k) { if (p.now) ci = k; }); if (ci < 0) ci = 0;
    var near = r.daeun.filter(function (p, k) { return k >= ci - 1 && k <= ci + 1; }), far = r.daeun.filter(function (p, k) { return k < ci - 1 || k > ci + 1; });
    var dPane = near.map(dRow).join('') + (far.length ? '<details class="psy-fold"><summary>다른 대운 ' + far.length + '개 보기</summary>' + far.map(dRow).join('') + '</details>' : '');
    var sPane = r.seun.map(function (p, k) { return row(p, esc(p.year + '년') + ' <span class="gz">' + esc(p.gz + ' · ' + p.stemTG + '/' + p.branchTG) + '</span>', k === 0); }).join('');
    var mPane = r.months.length ? '<div class="psy-mo">' + r.months.map(function (p) {
      var d = new Date(p.startMs + 9 * 3600000);
      return '<div class="' + (p.now ? 'psy-now' : '') + '"><b>' + (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '~ ' + esc(p.gz) + '</b>' + lv(p) + '<br>' + esc(p.emotions.map(function (e) { return e.name; }).join(' · ')) + '</div>';
    }).join('') + '</div>' : '';
    var nowM = r.months.filter(function (p) { return p.now; })[0];
    // 대운 → 세운 → 월운 순서(사용자 지시 2026-11-25). 대운 묶음에 교운기·곡선을 함께 둔다
    var timeSec = '<section class="card psy" id="psyTime"><div class="card-h"><h2>시기별 스트레스와 감정 상태</h2></div>' +
      '<p class="psy-intro">대운(10년) → 세운(1년) → 월운(1달) 순서로, 시기마다 스트레스의 원천과 올라오기 쉬운 감정을 정리했어요. "변화 큼"은 나쁜 시기가 아니라 다시 살펴볼 것이 많은 시기예요.</p>' +
      '<h3 class="psy-sub">① 대운 — 10년의 흐름</h3>' + trBox + graph + '<p class="psy-small" style="margin:12px 0 0">지난 대운 · 지금 대운 · 다음 대운이에요. 지금 대운만 펼쳐 두었어요.</p>' + dPane +
      '<h3 class="psy-sub">② 세운 — ' + r.year + '~' + (r.year + 2) + '년</h3>' + sPane +
      '<h3 class="psy-sub">③ 월운 — ' + r.year + '년 달별</h3>' + (nowM ? row(nowM, '이번 달 <span class="gz">' + esc(nowM.gz + ' · ' + nowM.stemTG + '/' + nowM.branchTG) + '</span>', true) : '') + mPane +
      '<p class="psy-small">월운은 절기(입춘~) 기준이에요. 날짜는 그 달이 시작되는 절입일이에요.</p></section>';

    // ── 4. 심리 솔루션 ──
    var sNow = S.now.length ? '<h3 class="psy-sub">지금 시기 — 감정별로 다루는 법</h3><ul class="psy-sl psy-slc">' + S.now.map(function (e) { return '<li><b>' + esc(e.name) + '</b>' + esc(e.care) + '</li>'; }).join('') + '</ul>' : '';
    var sTr = S.transition ? '<h3 class="psy-sub">' + esc(S.transition.inWindow ? '교운기를 지나는 법' : '다음 전환을 준비하는 법') + '</h3><div class="psy-arrow">' + esc(S.transition.from) + '에서 <b>' + esc(S.transition.to) + '</b>(으)로 무게를 옮기는 시기예요. 무조건 더 애쓰기보다, 계속 지킬 것과 내려놓을 것을 나눠 보세요.</div>' : '';
    var sPat = S.patterns.length ? '<h3 class="psy-sub">패턴별 솔루션</h3><ul class="psy-sl">' + S.patterns.map(function (c) { return '<li><b>' + esc(c.name) + '</b><span class="need">필요한 것 · ' + esc(c.need) + '</span><span class="act">' + esc(c.act) + '</span></li>'; }).join('') + '</ul>' : '';
    var sEl = S.elem ? '<h3 class="psy-sub">명리 보완 — ' + esc(S.elem.name) + ' 기운 곁들이기</h3><div class="psy-el"><p style="margin:0 0 4px">' + esc(S.elem.mind) + '</p><div class="psy-tags">' + S.elem.acts.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div><p class="psy-small" style="margin:0">' + esc(S.elem.basis + ' · ' + S.elem.note) + '</p></div>' : '';
    var sf = D.SAFETY;
    var safe = '<div class="psy-safe"><b>' + esc(sf.head) + '</b><p style="margin:4px 0">' + esc(sf.body) + '</p><ul>' + sf.lines.map(function (l) { return '<li>' + esc(l.name) + ' <a href="tel:' + esc(l.tel) + '">' + esc(l.tel) + '</a></li>'; }).join('') + '</ul><p class="psy-small" style="margin:0">' + esc(sf.tail) + '</p></div>';
    var solSec = '<section class="card psy" id="psySol"><div class="card-h"><h2>심리 솔루션</h2></div>' + sNow + sTr + sPat + sEl + safe + '</section>';

    return ov + patSec + timeSec + solSec;
  }

  if (typeof document !== 'undefined' && !G.__psyBound) {
    G.__psyBound = true;
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-psy-go],[data-psy-band]'); if (!t) return;
      if (t.hasAttribute('data-psy-go')) { e.preventDefault(); var el = document.getElementById(t.getAttribute('data-psy-go')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      var k = t.getAttribute('data-psy-band'); document.querySelectorAll('[data-psy-bp]').forEach(function (p) { p.hidden = p.getAttribute('data-psy-bp') !== k; });
    });
  }

  G.MantraPsychView = { html: html };
})(typeof window !== 'undefined' ? window : globalThis);
