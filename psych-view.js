/* 심리 솔루션 — 화면(2판, 2026-11-25). 계산은 psych.js, 문안은 psych-data.js.
   · 순서: 한눈에 보기 → 마음에 남은 경험과 반복되는 패턴 → 내 삶의 시기별 흐름(곡선) → 교운기 → 시기별 감정·마음 상태 → 지금 마음 체크 → 오늘 해 볼 실천
   · 출처 표시: 명리 해석 / 내가 확인한 경험 / 내가 기록한 상태 — 칩으로 구분
   · 사용자 응답(확인·경험 메모·마음 기록·고른 실천)은 이 기기 localStorage 에만(명식별 키). 응답하면 #psyRoot 안만 다시 그린다.
   · 사용: MantraPsychView.html(Manse, ch, { esc, term, now }) */
(function (G) {
  'use strict';
  var CSS = '.psy{scroll-margin-top:110px}.psy-intro{font-size:.9rem;color:var(--ink-2);line-height:1.65;margin:0 0 10px}' +
    '.psy-src{display:inline-block;font-size:.66rem;font-weight:800;padding:1px 7px;border-radius:999px;margin-left:4px;vertical-align:middle;border:1px solid var(--line);color:var(--ink-3);background:var(--surface)}.psy-src.mine{border-color:#7B6BD6;color:#5B4BB8}.psy-src.now{border-color:#2F8F86;color:#23706A}' +
    '.psy-safe-top{font-size:.78rem;color:var(--ink-3);margin:0 0 10px;padding:7px 10px;border-radius:10px;background:var(--surface-2)}' +
    '.psy-ov{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}@media(max-width:900px){.psy-ov{grid-template-columns:1fr 1fr}}@media(max-width:560px){.psy-ov{grid-template-columns:1fr}}' +
    '.psy-ov>a{display:block;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);color:inherit;text-decoration:none}.psy-ov small{display:block;font-size:.72rem;color:var(--ink-3);font-weight:700}.psy-ov b{display:block;font-size:.95rem;margin:4px 0;line-height:1.45}.psy-ov span.s{font-size:.78rem;color:var(--ink-2)}' +
    '.psy-card{border:1px solid var(--line);border-radius:14px;background:var(--surface);margin:12px 0;padding:14px 15px}.psy-tn{font-size:.74rem;font-weight:800;color:var(--ink-3);margin:0 0 3px}.psy-core{font-size:1.05rem;font-weight:800;line-height:1.5;margin:0 0 8px}' +
    '.psy-card ul{margin:0 0 8px;padding-left:1.15em;font-size:.88rem;line-height:1.65}.psy-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}@media(max-width:560px){.psy-two{grid-template-columns:1fr}}.psy-two>div{border-radius:10px;padding:8px 10px;background:var(--surface-2);font-size:.85rem;line-height:1.55}.psy-two b{display:block;font-size:.72rem;color:var(--ink-3);margin-bottom:2px}' +
    '.psy-basis{font-size:.8rem;line-height:1.55;margin:8px 0;border-left:3px solid var(--line);padding:2px 0 2px 10px}.psy-basis p{margin:2px 0}.psy-k{display:inline-block;font-size:.66rem;padding:0 6px;border-radius:6px;background:var(--surface-2);color:var(--ink-2);margin-right:4px}.psy-basis .m{color:var(--ink-3)}' +
    '.psy-need{font-size:.86rem;margin:6px 0}.psy-act{font-size:.88rem;font-weight:700;margin:6px 0;padding:8px 10px;border-radius:10px;border:1px dashed var(--accent)}' +
    '.psy-ask{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}.psy-ask button,.psy-chip{border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:.82rem;background:var(--surface);color:var(--ink-2);cursor:pointer}.psy-ask button.on,.psy-chip.on{border-color:var(--accent);color:var(--ink);font-weight:800;background:var(--surface-2)}' +
    '.psy-mine{margin:10px 0 0;font-size:.84rem}.psy-mine textarea{width:100%;min-height:64px;border:1px solid var(--line);border-radius:10px;padding:8px;font:inherit;background:var(--surface);color:var(--ink);box-sizing:border-box}.psy-mine .btn{margin-top:6px}.psy-minebox{margin-bottom:8px;padding:8px 10px;border-radius:10px;background:#F3F0FF;font-size:.85rem;line-height:1.6;color:#2E2A44}' +
    '.psy-skip{font-size:.8rem;color:var(--ink-3);margin:8px 0 0}.psy-skip button{border:0;background:none;color:var(--accent);cursor:pointer;font-size:.8rem;padding:0 4px}' +
    '.psy-g{width:100%;height:auto;display:block;color:var(--ink)}.psy-g text{font-family:inherit}.psy-gleg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.76rem;color:var(--ink-2);margin:6px 0}.psy-gleg i{display:inline-block;width:18px;height:0;border-top:3px solid var(--accent);vertical-align:middle;margin-right:4px}.psy-gleg i.mine{border-top:2px dashed #7B6BD6}.psy-gleg i.tr{border-top:8px solid rgba(120,120,140,.22)}' +
    '.psy-bp{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0;font-size:.86rem;line-height:1.6;background:var(--surface)}.psy-bp[hidden]{display:none}.psy-bp h4{margin:0 0 4px;font-size:.92rem}.psy-bp p{margin:3px 0}' +
    '.psy-tr{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media(max-width:600px){.psy-tr{grid-template-columns:1fr}}.psy-tr>div{border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:.86rem;line-height:1.6;background:var(--surface)}.psy-tr b.h{display:block;font-size:.74rem;color:var(--ink-3)}' +
    '.psy-arrow{margin:10px 0;padding:10px 12px;border-radius:12px;background:var(--surface-2);font-size:.88rem;line-height:1.65}.psy-small{font-size:.76rem;color:var(--ink-3);line-height:1.55}' +
    '.psy-seg{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.psy-seg button{border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:.84rem;background:var(--surface);color:var(--ink-2);cursor:pointer}.psy-seg button.on{border-color:var(--accent);color:var(--ink);font-weight:700}' +
    '.psy-pane[hidden]{display:none}.psy-row{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0;background:var(--surface)}.psy-row.psy-now{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}' +
    '.psy-rh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-weight:700}.psy-rh .gz{font-weight:600;color:var(--ink-3);font-size:.82rem}.psy-row p{margin:4px 0;font-size:.85rem;line-height:1.6}.psy-row .lbl{font-size:.74rem;color:var(--ink-3);font-weight:700;margin-right:4px}' +
    '.psy-lv{display:inline-block;font-size:.68rem;font-weight:800;padding:1px 8px;border-radius:999px;background:var(--surface-2);color:var(--ink-2)}.psy-lv.hi{background:#E7E3F7;color:#4B3F99}.psy-lv.lo{background:transparent;border:1px solid var(--line)}' +
    '.psy-emo{display:grid;gap:5px;margin:4px 0 6px}.psy-emo div{font-size:.84rem;line-height:1.55}.psy-emo b{display:inline-block;min-width:5.2em}.psy-emo small{display:block;color:var(--ink-3);font-size:.76rem;padding-left:5.2em}@media(max-width:560px){.psy-emo small{padding-left:0}.psy-emo b{display:block}}' +
    '.psy-mo{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}@media(max-width:700px){.psy-mo{grid-template-columns:repeat(3,1fr)}}.psy-mo>div{border:1px solid var(--line);border-radius:10px;padding:7px 8px;font-size:.78rem;line-height:1.45;background:var(--surface)}.psy-mo>div.psy-now{border-color:var(--accent)}.psy-mo b{display:block;font-size:.8rem}' +
    '.psy-ckq{margin:12px 0 5px;font-size:.84rem;font-weight:700}.psy-cks{display:flex;flex-wrap:wrap;gap:6px}.psy-sum{margin:12px 0;padding:10px 12px;border-radius:12px;border:1px solid #2F8F86;font-size:.87rem;line-height:1.65}.psy-sum ul{margin:4px 0;padding-left:1.1em}' +
    '.psy-acts{list-style:none;margin:0;padding:0}.psy-acts li{margin:6px 0}.psy-acts button{width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);color:var(--ink);font-size:.88rem;cursor:pointer;line-height:1.5}.psy-acts button.on{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset;font-weight:700}.psy-acts small{display:block;color:var(--ink-3);font-size:.74rem;font-weight:400}' +
    '.psy-el{border-radius:12px;padding:11px 13px;background:var(--surface-2);font-size:.87rem;line-height:1.65;margin-top:10px}.psy-tags{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0}.psy-tags span{font-size:.78rem;padding:2px 9px;border-radius:999px;border:1px solid var(--line);background:var(--surface)}' +
    '.psy-safe{border:1px solid var(--line);border-radius:12px;padding:11px 13px;font-size:.86rem;line-height:1.6;margin-top:12px}.psy-safe ul{list-style:none;margin:6px 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px}.psy-safe a{font-weight:800;color:var(--ink)}.psy-reset{border:0;background:none;color:var(--ink-3);font-size:.74rem;text-decoration:underline;cursor:pointer;padding:0}';
  var injected = false;
  function inject() { if (injected || typeof document === 'undefined') return; injected = true; var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
  var LS = function () { try { return G.localStorage || null; } catch (e) { return null; } };
  var keyOf = function (ch) { return 'mt_psy2:' + (ch && ch.utc) + ':' + (ch && ch.gender || ''); };
  function loadState(ch) { try { var s = LS() && LS().getItem(keyOf(ch)); var o = s ? JSON.parse(s) : {}; return { answers: o.answers || {}, notes: o.notes || {}, history: Array.isArray(o.history) ? o.history : [], pick: o.pick || '' }; } catch (e) { return { answers: {}, notes: {}, history: [], pick: '' }; } }
  function saveState(ch, st) { try { LS() && LS().setItem(keyOf(ch), JSON.stringify({ answers: st.answers, notes: st.notes, history: st.history.slice(-60), pick: st.pick })); } catch (e) { } }
  var SPAN_KEY = 'mt_psy_span';
  var getSpan = function () { try { var v = LS() && LS().getItem(SPAN_KEY); return v === 'seun' || v === 'month' ? v : 'daeun'; } catch (e) { return 'daeun'; } };
  var draft = {};   // 마음 체크 작성 중인 값(기록하기 전에는 저장하지 않음)
  var ctx = null;

  function inner(M, ch, o) {
    var esc = o.esc, D = G.MantraPsychData, P = G.MantraPsych, st = loadState(ch), r;
    try { r = P.build(M, ch, { now: o.now, state: st }); } catch (e) { r = { ok: false, reason: '계산 중 문제가 생겼어요' }; }
    if (!r || !r.ok) return '<section class="card"><div class="card-h"><h2>' + esc(D ? D.TITLE : '심리 솔루션') + '</h2></div><p class="note">' + esc((r && r.reason) || '결과를 만들 수 없어요') + '</p></section>';
    var src = function (k) { return '<span class="psy-src ' + (k || '') + '">' + esc(D.SRC[k] || '') + '</span>'; };
    var lv = function (p) { return '<span class="psy-lv ' + p.level + '">' + esc(p.levelK) + '</span>'; };
    var O = r.overview, T = r.transition;

    // ── 한눈에 보기 ──
    var ov = '<section class="card psy" id="psyTop"><div class="card-h"><h2>한눈에 보기</h2></div>' +
      '<p class="psy-safe-top">' + esc(D.SAFETY_TOP) + '</p><div class="psy-ov">' +
      '<a href="#psyPat" data-psy-go="psyPat"><small>가장 두드러진 마음의 패턴' + (O.pattern ? src(O.pattern.src) : '') + '</small><b>' + esc(O.pattern ? O.pattern.text : D.NO_THEME) + '</b></a>' +
      '<a href="#psyTrans" data-psy-go="psyTrans"><small>지금 대운 · 다음 전환' + src('myeongri') + '</small><b>' + esc(O.daeun ? O.daeun.text : '—') + '</b><span class="s">' + esc((O.daeun && O.daeun.next ? '다음 전환 ' + O.daeun.next : '') + (O.daeun && O.daeun.inWindow ? ' · 지금 교운기' : '')) + '</span></a>' +
      '<a href="#psyCheck" data-psy-go="psyCheck"><small>지금 내 마음 상태' + (O.state ? src('now') : '') + '</small><b>' + esc(O.state ? O.state.text : D.CHECK.empty) + '</b><span class="s">' + esc(O.state ? '' : D.CHECK.go + ' ›') + '</span></a>' +
      '<a href="#psySol" data-psy-go="psySol"><small>지금 먼저 해 볼 실천' + (O.action ? src(O.action.src) : '') + '</small><b>' + esc(O.action ? O.action.text : '—') + '</b></a>' +
      '</div><p class="psy-small" style="margin:8px 0 0">' + esc(D.LOCAL_NOTE) + (r.hourKnown ? '' : ' 태어난 시간이 없어 시주 자리는 빼고 읽었어요.') + '</p></section>';

    // ── 마음에 남은 경험과 반복되는 패턴 ──
    var cards = r.themes.cards.map(function (c) {
      var ans = c.answer, okd = ans === 'yes' || ans === 'some';
      var ask = '<div class="psy-ask" role="group" aria-label="이 해석이 맞나요">' + ['yes', 'some', 'no'].map(function (k) { return '<button type="button" data-psy-ans="' + c.id + ':' + k + '" class="' + (ans === k ? 'on' : '') + '" aria-pressed="' + (ans === k) + '">' + esc(D.ASK[k]) + '</button>'; }).join('') + '</div>';
      var mine = okd ? '<div class="psy-mine">' + (c.mine ? '<div class="psy-minebox">' + src('mine') + ' ' + esc(c.mine) + '<br>' + esc(D.MINE_LEAD + '지금은 "' + c.need + '"이(가) 가장 도움이 돼요.') + '</div>' : '') +
        '<label class="psy-small" for="psyN-' + c.id + '">' + esc(D.MINE_PROMPT) + '</label><textarea id="psyN-' + c.id + '" data-psy-note="' + c.id + '" maxlength="500">' + esc(c.mine) + '</textarea><button type="button" class="btn" data-psy-note-save="' + c.id + '">경험 저장</button></div>' : '';
      return '<article class="psy-card">' +
        '<p class="psy-tn">' + esc(c.name) + (okd ? src('mine') : src('myeongri')) + '</p>' +
        '<p class="psy-core">' + esc(c.core) + '</p>' +
        '<ul>' + c.scenes.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
        '<div class="psy-two"><div><b>이 방식이 나를 지켜 준 점</b>' + esc(c.keep) + '</div><div><b>지금 부담이 되는 점</b>' + esc(c.cost) + '</div></div>' +
        '<div class="psy-basis"><p><b>명리 근거</b></p>' + c.basis.map(function (b) { return '<p><span class="psy-k">' + esc(b.k) + '</span>' + esc(b.t) + ' <span class="m">— ' + esc(b.m) + '</span></p>'; }).join('') + (c.schoolNote ? '<p class="m">※ ' + esc(c.schoolNote) + '</p>' : '') + '</div>' +
        '<p class="psy-need"><b>지금 필요한 것</b> · ' + esc(c.need) + '</p>' +
        '<p class="psy-act">이번 주에 해 볼 일 — ' + esc(c.act) + '</p>' + ask + mine + '</article>';
    }).join('');
    var sk = r.themes.skipped;
    var patSec = '<section class="card psy" id="psyPat"><div class="card-h"><h2>마음에 남은 경험과 반복되는 패턴</h2></div><p class="psy-intro">' + esc(D.INTRO) + '</p>' +
      (cards || '<p class="note">' + esc(D.NO_THEME) + '</p>') +
      (r.themes.more ? '<p class="psy-skip">"제 얘기는 아니에요"로 넘기면 다른 해석 ' + r.themes.more + '개가 이어서 나와요.</p>' : '') +
      (sk.length ? '<p class="psy-skip">' + esc(D.SKIPPED) + ': ' + sk.map(function (x) { return esc(x.name) + '<button type="button" data-psy-undo="' + x.id + '">다시 보기</button>'; }).join(' · ') + '</p>' : '') + '</section>';

    // ── 곡선 그래프 ──
    var g = r.graph, W = 760, H = 250, L0 = 30, R0 = 10, T0 = 26, B0 = 38, span = g.span;
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
    if (g.mine.length) {
      var my = function (l) { return T0 + (H - T0 - B0) * (1 - l / 4); }, mp = g.mine.filter(function (m) { return m.age >= 0 && m.age <= span; });
      if (mp.length > 1) svg += '<polyline points="' + mp.map(function (m) { return X(m.age).toFixed(1) + ',' + my(m.level).toFixed(1); }).join(' ') + '" fill="none" stroke="#7B6BD6" stroke-width="2" stroke-dasharray="5 4" pointer-events="none"/>';
      mp.forEach(function (m) { svg += '<circle cx="' + X(m.age).toFixed(1) + '" cy="' + my(m.level).toFixed(1) + '" r="3.6" fill="#7B6BD6" pointer-events="none"/>'; });
    }
    if (g.nowAge >= 0 && g.nowAge <= span) { var nx = X(g.nowAge); svg += '<line x1="' + nx.toFixed(1) + '" x2="' + nx.toFixed(1) + '" y1="' + T0 + '" y2="' + (H - B0) + '" stroke="currentColor" stroke-width="1.4" opacity=".75" pointer-events="none"/><text x="' + nx.toFixed(1) + '" y="' + (H - B0 + 30) + '" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor">지금</text>'; }
    svg += '</svg>';
    var bp = g.bands.map(function (b, k) {
      return '<div class="psy-bp" data-psy-bp="' + k + '"' + (b.now ? '' : ' hidden') + '><h4>' + esc(b.startAge + '~' + b.endAge + '세 · ' + b.gz + ' 대운') + (b.now ? ' <span class="psy-lv hi">지금</span>' : '') + '</h4>' +
        '<p><b>핵심 주제</b> · ' + esc(b.theme) + '</p><p><b>올라오기 쉬운 감정</b> · ' + esc(b.emotions.join(', ')) + '</p>' +
        '<p class="psy-small">명리 근거: ' + esc([b.tg].concat(b.basis.slice(1)).join(' · ')) + '</p><p><b>돌아볼 질문</b> · ' + esc(b.question) + '</p></div>';
    }).join('');
    var graphSec = '<section class="card psy" id="psyGraph"><div class="card-h"><h2>' + esc(D.GRAPH.title) + '</h2></div>' +
      '<div class="psy-gleg"><span><i></i>' + esc(D.GRAPH.yLabel) + '</span><span><i class="tr"></i>교운기(대운 전환 앞뒤 1년)</span>' + (g.mine.length ? '<span><i class="mine"></i>' + esc(D.GRAPH.mine) + '</span>' : '') + '</div>' + svg +
      '<p class="psy-small">' + esc(D.GRAPH.tap + (g.mine.length ? '' : ' ' + D.GRAPH.noMine)) + '</p>' + bp +
      '<details><summary class="psy-small">곡선은 어떻게 만들었나요?</summary><p class="psy-small">' + esc(g.how) + '</p></details></section>';

    // ── 교운기 ──
    var trHead = T.inWindow ? D.TRANSITION.nowIn : T.next ? D.TRANSITION.soon.replace('{n}', String(Math.max(0, Math.round(T.next.inYears)))) : '';
    var trSec = T.cur ? '<section class="card psy" id="psyTrans"><div class="card-h"><h2>' + esc(D.TRANSITION.title) + '</h2></div>' +
      '<p class="psy-intro"><b>' + esc(trHead) + '</b> ' + esc(D.TRANSITION.lead) + '</p>' +
      '<div class="psy-tr"><div><b class="h">지금 대운' + src('myeongri') + '</b><b>' + esc(T.cur.startAge + '세~ ' + T.cur.gz) + '</b> <span class="psy-small">' + esc(T.cur.tg) + '</span><br>' + esc(T.cur.start + ' ~ ' + (T.cur.end || '')) + '<br>' + esc(T.cur.theme) + '</div>' +
      (T.next ? '<div><b class="h">다음 대운</b><b>' + esc(T.next.startAge + '세~ ' + T.next.gz) + '</b> <span class="psy-small">' + esc(T.next.tg) + '</span><br>' + esc(T.next.start + ' 시작') + '<br>' + esc(T.next.theme) + '</div>' : '') + '</div>' +
      (T.from || T.to ? '<div class="psy-arrow"><b>' + esc(D.TRANSITION.from) + '</b> · ' + esc(T.from) + '<br><b>' + esc(D.TRANSITION.to) + '</b> · ' + esc(T.to) + '<br>무조건 더 애쓰는 것이 답은 아니에요. 계속 지킬 것과 내려놓을 것을 나눠 보세요.</div>' : '') +
      '<p><b>지금 내 마음 상태</b>' + (r.state ? src('now') + ' ' + esc(r.state.parts.join(' · ')) : ' · <a href="#psyCheck" data-psy-go="psyCheck">' + esc(D.CHECK.go) + '</a>') + '</p>' +
      '<p class="psy-small">계산 기준: ' + esc(T.basis) + '</p></section>' : '';

    // ── 시기별 감정·마음 상태 ──
    var emoBox = function (p) { return '<div class="psy-emo">' + p.emotions.map(function (e) { return '<div><b>' + esc(e.name) + '</b>' + esc(e.when) + '<small>다루는 법 · ' + esc(e.care) + '</small></div>'; }).join('') + '</div>'; };
    var row = function (p, head) {
      return '<div class="psy-row' + (p.now ? ' psy-now' : '') + '"><div class="psy-rh">' + head + lv(p) + (p.now ? '<span class="psy-lv hi">지금</span>' : '') + '</div>' +
        '<p><span class="lbl">주제</span>' + esc(p.theme) + '</p><p class="lbl" style="margin:8px 0 0">이 시기에 올라오기 쉬운 감정</p>' + emoBox(p) +
        (p.mood ? '<p><span class="lbl">마음의 온도</span><b>' + esc(p.mood.k) + '</b> — ' + esc(p.mood.t) + '</p>' : '') +
        (p.hits.length ? '<p><span class="lbl">흔들리는 자리</span>' + esc(p.hits.map(function (h) { return h.text + '(' + h.name + ')'; }).join(' · ')) + '</p>' : '') +
        '<p><span class="lbl">돌아볼 질문</span>' + esc(p.question) + '</p></div>';
    };
    var span0 = getSpan();
    var dPane = r.daeun.map(function (p) { return row(p, esc(p.startAge + '세~') + ' <span class="gz">' + esc(p.gz + ' 대운 · ' + p.stemTG + '/' + p.branchTG) + '</span>'); }).join('');
    var sPane = r.seun.map(function (p) { return row(p, esc(p.year + '년') + ' <span class="gz">' + esc(p.gz + ' · ' + p.stemTG + '/' + p.branchTG) + '</span>'); }).join('');
    var mPane = r.months.length ? '<div class="psy-mo">' + r.months.map(function (p) {
      var d = new Date(p.startMs + 9 * 3600000);
      return '<div class="' + (p.now ? 'psy-now' : '') + '" title="' + esc(p.emotions.map(function (e) { return e.name + ': ' + e.when; }).join('\n')) + '"><b>' + (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '~ ' + esc(p.gz) + '</b>' + lv(p) + '<br>' + esc(p.emotions.map(function (e) { return e.name; }).join(' · ')) + '</div>';
    }).join('') + '</div><p class="psy-small">월운은 절기(입춘~) 기준이에요. 날짜는 그 달이 시작되는 절입일이에요.</p>' : '';
    var timeSec = '<section class="card psy" id="psyTime"><div class="card-h"><h2>시기별 감정 · 마음 상태</h2></div>' +
      '<p class="psy-intro">운의 십성, 일간의 힘, 12운성, 운이 원국 자리를 건드리는지를 함께 보고, 그 시기에 올라오기 쉬운 감정을 골랐어요. "변화가 두드러짐"은 나쁜 시기가 아니라 다시 살펴볼 것이 많은 시기라는 뜻이에요.</p>' +
      '<div class="psy-seg" role="tablist">' + [['daeun', '대운 10년'], ['seun', r.year + '~' + (r.year + 2) + '년'], ['month', r.year + '년 월별']].map(function (q) { return '<button type="button" role="tab" data-psy-span="' + q[0] + '" class="' + (span0 === q[0] ? 'on' : '') + '">' + esc(q[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="psy-pane" data-psy-pane="daeun"' + (span0 === 'daeun' ? '' : ' hidden') + '>' + dPane + '</div>' +
      '<div class="psy-pane" data-psy-pane="seun"' + (span0 === 'seun' ? '' : ' hidden') + '>' + sPane + '</div>' +
      '<div class="psy-pane" data-psy-pane="month"' + (span0 === 'month' ? '' : ' hidden') + '>' + mPane + '</div></section>';

    // ── 지금 마음 체크 ──
    var C = D.CHECK, dv = draft;
    var ck = C.fields.map(function (f) {
      return '<p class="psy-ckq">' + esc(f.q) + (f.multi ? ' <span class="psy-small">(여러 개)</span>' : '') + '</p><div class="psy-cks">' + f.opts.map(function (op) {
        var on = f.multi ? (dv[f.id] || []).indexOf(op) >= 0 : dv[f.id] === op;
        return '<button type="button" class="psy-chip' + (on ? ' on' : '') + '" data-psy-ck="' + f.id + '|' + esc(op) + '" data-multi="' + (f.multi ? 1 : 0) + '" aria-pressed="' + on + '">' + esc(op) + '</button>';
      }).join('') + '</div>';
    }).join('');
    var sf = D.SAFETY, ss = r.state;
    var checkSec = '<section class="card psy" id="psyCheck"><div class="card-h"><h2>' + esc(C.title) + '</h2></div><p class="psy-intro">' + esc(C.lead) + '</p>' + ck +
      '<p style="margin:12px 0 0"><button type="button" class="btn" data-psy-ck-save="1">' + esc(C.save) + '</button></p>' +
      (ss ? '<div class="psy-sum"><b>' + esc(C.summary) + '</b>' + src('now') + '<ul>' + ss.parts.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><span class="psy-small">기록 ' + st.history.length + '회 · 마지막 ' + esc(new Date(ss.t).toLocaleDateString('ko-KR')) + '</span>' + (ss.care ? '<p style="margin:6px 0 0"><b>' + esc(ss.care) + '</b></p>' : '') + '</div>' : '') +
      '<div class="psy-safe"><b>' + esc(sf.head) + '</b><p style="margin:4px 0">' + esc(sf.body) + '</p><ul>' + sf.lines.map(function (l) { return '<li>' + esc(l.name) + ' <a href="tel:' + esc(l.tel) + '">' + esc(l.tel) + '</a></li>'; }).join('') + '</ul><p class="psy-small" style="margin:0">' + esc(sf.tail) + '</p></div>' +
      '<p class="psy-small" style="margin:10px 0 0">' + esc(D.LOCAL_NOTE) + ' <button type="button" class="psy-reset" data-psy-reset="1">이 명식의 응답·기록 모두 지우기</button></p></section>';

    // ── 오늘 해 볼 실천 ──
    var picks = r.actions.map(function (a) { var on = r.pick === a.text; return '<li><button type="button" data-psy-pick="' + esc(a.text) + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + esc(a.text) + '<small>' + esc(a.from) + '</small></button></li>'; }).join('');
    var el = r.elem ? '<div class="psy-el"><b>명리 보완 — ' + esc(r.elem.name) + ' 기운 곁들이기</b>' + src('myeongri') + '<p style="margin:4px 0">' + esc(r.elem.mind) + '</p><div class="psy-tags">' + r.elem.acts.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div><p class="psy-small" style="margin:0">' + esc(r.elem.basis + ' · ' + r.elem.note) + '</p></div>' : '';
    var solSec = '<section class="card psy" id="psySol"><div class="card-h"><h2>' + esc(D.ACTION_PICK) + '</h2></div>' +
      '<p class="psy-intro">"맞아요"라고 답한 해석과 마음 체크에서 고른 "지금 필요한 것"에 맞춰 바뀌어요. 하나를 골라 두면 한눈에 보기에 표시돼요.</p><ul class="psy-acts">' + picks + '</ul>' + el +
      '<p class="psy-small" style="margin:10px 0 0">' + esc(sf.tail) + '</p></section>';

    return ov + patSec + graphSec + trSec + timeSec + checkSec + solSec;
  }

  function html(M, ch, o) {
    inject();
    ctx = { M: M, ch: ch, o: o };
    return '<div id="psyRoot">' + inner(M, ch, o) + '</div>';
  }
  function rerender() { var el = typeof document !== 'undefined' && document.getElementById('psyRoot'); if (!el || !ctx) return; el.innerHTML = inner(ctx.M, ctx.ch, ctx.o); }

  if (typeof document !== 'undefined' && !G.__psyBound) {
    G.__psyBound = true;
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-psy-span],[data-psy-go],[data-psy-ans],[data-psy-undo],[data-psy-note-save],[data-psy-ck],[data-psy-ck-save],[data-psy-pick],[data-psy-band],[data-psy-reset]');
      if (!t || !ctx) return;
      var ch = ctx.ch, st;
      if (t.hasAttribute('data-psy-span')) {
        var sp = t.getAttribute('data-psy-span'); try { LS() && LS().setItem(SPAN_KEY, sp); } catch (x) { }
        document.querySelectorAll('[data-psy-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-psy-pane') !== sp; });
        document.querySelectorAll('.psy-seg [data-psy-span]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-psy-span') === sp); });
        return;
      }
      if (t.hasAttribute('data-psy-go')) { e.preventDefault(); var el = document.getElementById(t.getAttribute('data-psy-go')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (t.hasAttribute('data-psy-band')) { var k = t.getAttribute('data-psy-band'); document.querySelectorAll('[data-psy-bp]').forEach(function (p) { p.hidden = p.getAttribute('data-psy-bp') !== k; }); return; }
      if (t.hasAttribute('data-psy-ck')) {
        var kv = t.getAttribute('data-psy-ck').split('|'), f = kv[0], v = kv.slice(1).join('|'), multi = t.getAttribute('data-multi') === '1';
        if (multi) { var a = draft[f] || []; var i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); draft[f] = a; }
        else draft[f] = draft[f] === v ? '' : v;
        t.parentNode.querySelectorAll('[data-psy-ck]').forEach(function (b) { var bv = b.getAttribute('data-psy-ck').split('|').slice(1).join('|'), on = multi ? (draft[f] || []).indexOf(bv) >= 0 : draft[f] === bv; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
        return;
      }
      st = loadState(ch);
      if (t.hasAttribute('data-psy-ans')) { var av = t.getAttribute('data-psy-ans').split(':'); if (st.answers[av[0]] === av[1]) delete st.answers[av[0]]; else st.answers[av[0]] = av[1]; }
      else if (t.hasAttribute('data-psy-undo')) delete st.answers[t.getAttribute('data-psy-undo')];
      else if (t.hasAttribute('data-psy-note-save')) { var id = t.getAttribute('data-psy-note-save'), ta = document.querySelector('[data-psy-note="' + id + '"]'); var txt = ta ? String(ta.value || '').trim().slice(0, 500) : ''; if (txt) st.notes[id] = txt; else delete st.notes[id]; }
      else if (t.hasAttribute('data-psy-ck-save')) {
        var lvS = draft.level ? parseInt(draft.level, 10) : NaN;
        var rec = { t: Date.now(), emo: (draft.emo || []).slice(), load: (draft.load || []).slice(), body: (draft.body || []).slice(), need: draft.need || '' };
        if (isFinite(lvS)) rec.level = lvS;
        if (!rec.emo.length && !rec.load.length && !rec.body.length && !rec.need && rec.level == null) return;
        st.history.push(rec); draft = {};
      }
      else if (t.hasAttribute('data-psy-pick')) { var pv = t.getAttribute('data-psy-pick'); st.pick = st.pick === pv ? '' : pv; }
      else if (t.hasAttribute('data-psy-reset')) { if (!confirm('이 명식에 대한 확인 응답·경험 메모·마음 기록·고른 실천을 이 기기에서 모두 지울까요?')) return; st = { answers: {}, notes: {}, history: [], pick: '' }; draft = {}; }
      saveState(ch, st); rerender();
    });
  }

  G.MantraPsychView = { html: html, rerender: rerender, _loadState: loadState, _keyOf: keyOf };
})(typeof window !== 'undefined' ? window : globalThis);
