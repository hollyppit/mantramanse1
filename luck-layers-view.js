/* 운 분석 층 공용 표시(2026-11-18) — 만세력 운세 흐름에서 만든 분석을 운명의 타임라인·주제별 상세풀이에서도 같은 계산으로 보여 준다
 *  쓰는 계산(읽기만): luck-env.js(외부 환경·전환·상하위) · luck-overlay.js(오행 겹쳐 보기) · ten-god-roles.js(십성 작용) · macro-era*.js(시대 흐름)
 *  · 점수·용신·그래프 막대는 바꾸지 않는다. 모듈이 없거나 스위치가 꺼졌으면 그 칸은 비운다.
 *  · 스위치(opt.flags): luckEnv · luckOverlay · tenGodRoles · macroEra (만세력과 같은 /api/luck-flags). 지장간 줄은 스위치 없이 늘 보인다(만세력과 같음)
 *  브라우저: window.MantraLuckView · Node: module.exports
 */
(function (root) {
  'use strict';
  var VERSION = 'luck-view-2026-11-18';
  var LEVEL_K = { daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
  var EL_HJ = '木火土金水', EL_S = ['목', '화', '토', '금', '수'];
  var esc0 = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); };
  var stemEl = function (s) { return Math.floor(s / 2); };

  // 고른 시기까지의 운 기둥(대운 → 세운 → 월운 → 일진) — 만세력 olLayers 와 같은 규칙
  function layersOf(M, ch, x, kind) {
    var out = [], gz = function (p) { return M.STEM[p.s] + M.BR[p.b]; };
    if (kind === 'daeun') return [{ level: 'daeun', s: x.s, b: x.b, label: gz(x) }];
    var ms = kind === 'seun' ? Date.UTC(x.year, 6, 1) : kind === 'ilun' ? Date.UTC(x.date[0], x.date[1] - 1, x.date[2], 3) : x.startMs;
    var du = M.daeunAt(ch, ms); if (du) out.push({ level: 'daeun', s: du.s, b: du.b, label: gz(du) });
    if (kind === 'seun') { out.push({ level: 'seun', s: x.s, b: x.b, label: gz(x) }); return out; }
    var sy = null; try { sy = M.yearPillarAt(ms).sajuYear; var se = M.seunRange(ch, sy, sy)[0]; if (se) out.push({ level: 'seun', s: se.s, b: se.b, label: gz(se) }); } catch (e) { }
    if (kind === 'wolun') { out.push({ level: 'wolun', s: x.s, b: x.b, label: gz(x) }); return out; }
    try { var mo = null; M.wolun(ch, sy).concat(M.wolun(ch, sy + 1)).forEach(function (m) { if (m.startMs <= ms) mo = m; }); if (mo) out.push({ level: 'wolun', s: mo.s, b: mo.b, label: gz(mo) }); } catch (e) { }
    out.push({ level: 'ilun', s: x.s, b: x.b, label: gz(x) });
    return out;
  }

  // 지장간 줄: 여기·중기·정기 + 원국 천간과 같은 글자·합
  function hidden(M, ch, b, E) {
    E = E || esc0;
    var P = ch.pillars || {}, nat = ['year', 'month', 'day', 'hour'].map(function (k) { return P[k] && P[k].s; }).filter(function (s) { return s != null; });
    var H = M.HIDDEN[b], lab = M.hiddenLabels ? M.hiddenLabels(b) : (H.length === 2 ? ['여기', '정기'] : ['여기', '중기', '정기']), same = [], hap = [];   // 子·卯·酉는 정기 하나
    var cells = H.map(function (h, k) {
      var hs = h[0]; if (nat.indexOf(hs) >= 0) same.push(M.STEM[hs]); if (nat.indexOf((hs + 5) % 10) >= 0) hap.push(M.STEM[hs] + M.STEM[(hs + 5) % 10]);
      return '<i class="lv-el e' + stemEl(hs) + (k === H.length - 1 ? ' m' : '') + '" title="' + E(lab[k] + ' ' + Math.round(h[1] / 30 * 100) + '%') + '">' + E(M.STEM[hs]) + '<small>' + lab[k] + '</small></i>';
    }).join('');
    var note = (same.length ? '원국 천간과 같은 글자 ' + same.join('·') : '') + (hap.length ? (same.length ? ' · ' : '') + '원국 천간과 합 ' + hap.join('·') : '');
    return '<p class="lv-hid"><b>지지 ' + E(M.BR[b]) + ' 속 지장간</b> ' + cells + (note ? '<span>' + E(note) + '</span>' : '') + '</p>';
  }

  function sec(n, title, sub, body, open) {
    if (!body) return '';
    return '<details class="lv-sec lv-s' + n + '"' + (open ? ' open' : '') + '><summary><b>' + title + '</b><span>' + sub + '</span></summary><div class="lv-b">' + body + '</div></details>';
  }


  // ── 오행 겹쳐 보기 그림(만세력 운세 흐름과 같은 그림): 오각형 고리 + 층 색 막대 ──
  var EL_COL = ['#5fae6e', '#e0705a', '#d9b25c', '#b9bec7', '#5a7fbf'], EL_INK = ['#2f6b3b', '#9b3422', '#8a6a1c', '#5d636e', '#2d4f8f'];
  var LV_COL = { daeun: '#3D7BD9', seun: '#E0832F', wolun: '#8E5BD6', ilun: '#2E9E8F' };
  var GOOD = function (r) { return r === '용신' || r === '희신'; }, BAD = function (r) { return r === '기신' || r === '구신'; };
  function olVisual(oc, E) {
    E = E || esc0;
    var L = oc.layers || [], fin = L.length ? L[L.length - 1].pct : oc.natal.pct, roles = oc.roles || {};
    // 계절 재분석 방식(2026-11-20): 운 때문에 원국 글자의 뿌리·충형파해·월령이 바뀐 몫을 원국 막대에 반영
    var lastP = oc.mode === 'seasonal' && L.length ? L[L.length - 1].parts : null;
    var NP = [0, 1, 2, 3, 4].map(function (e) { return Math.max(0, oc.natal.pts[e] + (lastP ? lastP.natalShift[e] + lastP.seasonShift[e] : 0)); });
    // 오각형: 바깥 실선 = 생, 안쪽 점선 = 극. 원 크기 = 겹친 뒤 비율, 층 색 고리 = 그 층이 그 오행을 눈에 띄게 더함
    var cx = 120, cy = 104, R = 72, pos = [0, 1, 2, 3, 4].map(function (e) { var a = (-90 + e * 72) * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
    var ring = [0, 1, 2, 3, 4].map(function (e) { var a = pos[e], b = pos[(e + 1) % 5], c = pos[(e + 2) % 5]; return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="rgba(127,127,127,.35)" stroke-width="1.5"/><line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + c[0] + '" y2="' + c[1] + '" stroke="rgba(127,127,127,.25)" stroke-dasharray="3 4"/>'; }).join('');
    var nodes = [0, 1, 2, 3, 4].map(function (e) {
      var x = pos[e][0], y = pos[e][1], rr = 12 + Math.min(11, fin[e] / 5), k = 0;
      var rings = L.map(function (l) { return l.add[e] >= 0.15 * Math.max(l.w, 0.4) ? '<circle cx="' + x + '" cy="' + y + '" r="' + (rr + 3 + (k++) * 4) + '" fill="none" stroke="' + LV_COL[l.level] + '" stroke-width="2.6"><title>' + E(l.levelK + ' ' + (l.label || '')) + '이(가) ' + EL_S[e] + '을(를) 더함</title></circle>' : ''; }).join('');
      var d = Math.round(fin[e] - oc.natal.pct[e]), tag = e === oc.dayEl ? ' · 나' : roles[e] ? ' · ' + roles[e] : '';
      return '<g>' + rings + '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="' + EL_COL[e] + '" stroke="' + EL_INK[e] + '"/><text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">' + EL_HJ[e] + '</text>' +
        '<text x="' + x + '" y="' + (y + rr + 12 + k * 4) + '" text-anchor="middle" font-size="10" fill="currentColor" opacity=".8">' + Math.round(fin[e]) + '%' + (L.length && d ? (d > 0 ? ' ▲' : ' ▼') + Math.abs(d) : '') + E(tag) + '</text></g>';
    }).join('');
    var svg = '<svg class="lv-pent" viewBox="0 0 240 218" width="220" height="200" role="img" aria-label="원국 위에 운을 겹친 오행 그림">' + ring + nodes + '</svg>';
    // 막대: 원국 몫(흐린 오행 색) + 층마다 더한 몫(층 색). 용신을 맨 위로
    var tot = NP.reduce(function (a, b) { return a + b; }, 0) + L.reduce(function (a, l) { return a + l.add.reduce(function (x, y) { return x + Math.max(0, y); }, 0); }, 0) || 1;
    var order = [0, 1, 2, 3, 4].sort(function (a, b) { return (roles[a] === '용신' ? -1 : 0) - (roles[b] === '용신' ? -1 : 0); });
    var bars = order.map(function (e) {
      var hwE = L.reduce(function (a2, l) { return a2 + ((l.hwaNet || [])[e] || 0); }, 0), hwP = Math.max(0, hwE), P0 = NP[e] + L.reduce(function (a2, l) { return a2 + Math.max(0, l.add[e]); }, 0) + hwP, hwF = P0 > 0 ? Math.max(0, P0 + Math.min(0, hwE)) / P0 : 1;   // 합화: 옮겨 온 몫은 빗금, 옮겨 간 몫만큼 줄임
      var segs = '<i style="width:' + (NP[e] * hwF / tot * 100).toFixed(2) + '%;background:' + EL_COL[e] + ';opacity:.55"></i>' + (hwP > 0.005 ? '<i title="합화로 옮겨 온 몫" style="width:' + (hwP * hwF / tot * 100).toFixed(2) + '%;background:repeating-linear-gradient(135deg,' + EL_COL[e] + ' 0 3px,transparent 3px 6px);outline:1px solid ' + EL_COL[e] + '"></i>' : '') + L.map(function (l) { return l.add[e] > 0.005 ? '<i style="width:' + (l.add[e] * hwF / tot * 100).toFixed(2) + '%;background:' + LV_COL[l.level] + '"></i>' : ''; }).join('');
      var d = Math.round((fin[e] - oc.natal.pct[e]) * 10) / 10, role = roles[e] || (e === oc.dayEl ? '나' : ''), rc = GOOD(roles[e]) ? 'good' : BAD(roles[e]) ? 'bad' : '';
      var dc = d > 0.4 ? (GOOD(roles[e]) ? 'good' : BAD(roles[e]) ? 'bad' : '') : d < -0.4 ? (BAD(roles[e]) ? 'good' : GOOD(roles[e]) ? 'bad' : '') : '';
      return '<p class="lv-brow"><span class="lv-bk"><b class="lv-el e' + e + ' m">' + EL_S[e] + '</b>' + (role ? '<small class="lv-r ' + rc + '">' + E(role) + '</small>' : '') + '</span><span class="lv-bar">' + segs + '</span><span class="lv-bv">' + Math.round(oc.natal.pct[e]) + '→<b>' + Math.round(fin[e]) + '</b>%' + (L.length && Math.abs(d) >= 0.5 ? ' <small class="lv-d ' + dc + '">' + (d > 0 ? '+' : '') + d + '</small>' : '') + '</span></p>';
    }).join('');
    var hwList = []; L.forEach(function (l) { (l.hwa || []).forEach(function (h) { if (h.ok) hwList.push(l.levelK + ' ' + h.name); }); });
    var legend = '<p class="lv-leg">' + L.map(function (l) { return '<span><i style="background:' + LV_COL[l.level] + '"></i>' + E(l.levelK + ' ' + (l.label || '')) + '</span>'; }).join('') + '<span><i style="background:#999;opacity:.55"></i>원국</span>' + (hwList.length ? '<span><i style="background:repeating-linear-gradient(135deg,#999 0 3px,transparent 3px 6px);outline:1px solid #999"></i>합화로 옮겨 온 몫(' + E(hwList.join(' · ')) + ')</span>' : '') + '</p>';
    // 계절 재분석 근거: 층마다 월령(왕 오행)·새로 생긴 뿌리·충형파해에 걸린 자리
    var PK = { year: '년주', month: '월주', day: '일주', hour: '시주', daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
    var why = oc.mode === 'seasonal' ? '<ul class="lv-why">' + L.map(function (l) {
      var s = l.season || {}, bits = ['월령 ' + (s.elK || '') + (s.why ? '(' + s.why + ')' : '')];
      if (l.rootGain && l.rootGain.length) bits.push('원국 ' + l.rootGain.join('·') + '에 뿌리가 생김');
      var hits = (l.relHits || []).filter(function (h) { return h.id === l.level; }); if (hits.length) bits.push(hits[0].why.join('·') + ' → ' + PK[l.level] + ' 몫 ×' + hits[0].f);
      return '<li><b>' + E(l.levelK) + '</b> ' + E(bits.join(' · ')) + '</li>';
    }).join('') + '</ul><p class="lv-sm">' + E('세력 계산: ' + (oc.rule || '')) + '</p>' : '';
    return '<div class="lv-olv">' + svg + '<div class="lv-bars">' + bars + legend + why + '</div></div>';
  }


  // ── 원국 오행 흐름(만세력 오행·강약 탭과 같은 그림·판정): 바깥 실선 화살표 = 생, 안쪽 점선 = 극, 원 크기 = 비율 + M.natalFlow 쉬운 말 ──
  var TG_GROUP = ['비겁', '식상', '재성', '관성', '인성'];
  function natalPentagon(M, ch) {
    var pct = ch.weights.pct, dEl = stemEl(ch.pillars.day.s), W = 440, H = 356, cx = 220, cy = 180, R = 112;
    var pt = function (i) { var a = (-90 + i * 72) * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; };
    var rad = function (i) { return 22 + Math.min(20, pct[i] * 0.4); };
    var line = function (i, j, geuk) { var a0 = pt(i), b0 = pt(j), L = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]), ux = (b0[0] - a0[0]) / L, uy = (b0[1] - a0[1]) / L, a = rad(i) + 4, b = rad(j) + 9;
      return '<line x1="' + (a0[0] + ux * a).toFixed(1) + '" y1="' + (a0[1] + uy * a).toFixed(1) + '" x2="' + (b0[0] - ux * b).toFixed(1) + '" y2="' + (b0[1] - uy * b).toFixed(1) + '" stroke="' + (geuk ? '#d9694f' : '#8a90a0') + '" stroke-width="' + (geuk ? 1.4 : 2) + '"' + (geuk ? ' stroke-dasharray="5 4"' : '') + ' marker-end="url(#lvah-' + (geuk ? 'g' : 's') + ')"/>'; };
    var s = '<svg class="lv-npent" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="원국 오행 생극 관계도"><defs><marker id="lvah-s" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8a90a0"/></marker><marker id="lvah-g" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#d9694f"/></marker></defs>';
    for (var i = 0; i < 5; i++) s += line(i, (i + 1) % 5, false);
    for (i = 0; i < 5; i++) s += line(i, (i + 2) % 5, true);
    for (i = 0; i < 5; i++) {
      var q = pt(i), r = rad(i), g = (i - dEl + 5) % 5, ly = q[1] + r + (i === dEl ? 20 : 15);
      s += (i === dEl ? '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (r + 5) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 3" opacity=".7"/>' : '') +
        '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + r + '" fill="' + EL_COL[i] + '" fill-opacity=".22" stroke="' + EL_COL[i] + '" stroke-width="2"/>' +
        '<text class="lv-et' + i + '" x="' + q[0] + '" y="' + (q[1] + 1) + '" text-anchor="middle" font-size="20" font-weight="800" fill="' + EL_INK[i] + '">' + EL_HJ[i] + '</text>' +
        '<text class="lv-et' + i + '" x="' + q[0] + '" y="' + (q[1] + 17) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + EL_INK[i] + '">' + pct[i].toFixed(0) + '%</text>' +
        '<text x="' + q[0].toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" class="lv-npl" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">' + (i === dEl ? '나 · ' : '') + EL_S[i] + ' · ' + TG_GROUP[g] + '</text>';
    }
    return s + '</svg>';
  }
  function natalFlowFigure(M, ch, opt) {
    opt = opt || {}; var E = opt.esc || esc0, f = null;
    try { f = M.natalFlow && M.natalFlow(ch); } catch (e) { f = null; }
    try { var TGr = root.MantraTenGodRoles, dropP = TGr && TGr.agreePatterns ? (TGr.agreePatterns(M, ch).dropped || []) : []; if (f && dropP.length) f = Object.assign({}, f, { chips: (f.chips || []).filter(function (c) { return dropP.indexOf(c.name) < 0; }) }); } catch (e) { }   // 십성 작용 판정과 어긋나는 패턴은 뺀다
    var svg = ''; try { svg = natalPentagon(M, ch); } catch (e) { svg = ''; }
    if (!svg) return '';
    var tc = function (t) { return t === 'good' ? 'lv-up' : t === 'bad' ? 'lv-down' : ''; };
    var txt = f ? '<p class="lv-nf-h"><b class="' + tc(f.tone) + '">' + E(f.headline || f.verdict) + '</b></p><ul class="lv-ul">' + f.items.map(function (i) { return '<li>' + E(i.plain || i.text) + '</li>'; }).join('') + '</ul>' +
      ((f.chips || []).filter(function (c) { return c.plain; }).length ? '<p class="lv-sm"><b>이 사주에서 보이는 패턴</b></p><ul class="lv-ul">' + f.chips.filter(function (c) { return c.plain; }).map(function (c) { return '<li><b class="' + (c.good ? 'lv-up' : 'lv-down') + '">' + E(c.name) + '</b> — ' + E(c.plain) + '</li>'; }).join('') + '</ul>' : '') +
      '<details class="lv-more"><summary>명리 용어로 보기</summary><p class="lv-sm"><b>' + E(f.verdict) + '</b></p><ul class="lv-ul lv-sm">' + f.items.map(function (i) { return '<li>' + E(i.text) + '</li>'; }).join('') + '</ul></details>' : '';
    return '<div class="lv-nf"><div class="lv-nf-fig">' + svg + '<p class="lv-leg"><span><i style="background:#8a90a0"></i>실선 화살표: 생(도와줌)</span><span><i style="background:#d9694f"></i>점선 화살표: 극(누름)</span><span>원 크기 = 비율</span></p></div><div class="lv-nf-txt">' + txt + '</div></div>';
  }


  // ── 한눈에 보기(만세력 운세 흐름 상세 맨 위와 같은 네 줄): 핵심(쉬운 말) · 큰 운과 · 바뀌는 점 · 해 볼 것 ──
  var TGP = { 비견: '나와 같은 힘·동료', 겁재: '경쟁·나눠 갖는 힘', 식신: '재능·꾸준한 표현', 상관: '말·재주·틀을 깨는 힘', 편재: '큰돈·활동 무대', 정재: '꾸준한 돈·살림', 편관: '압박·도전·책임', 정관: '직장·규칙·평판', 편인: '직감·특별한 공부', 정인: '배움·문서·도움' };
  var RP = { 용신: '이 사주에 가장 필요한 기운', 희신: '필요한 기운을 돕는 기운', 한신: '크게 돕지도 막지도 않는 기운', 기신: '넘치면 부담이 되는 기운', 구신: '부담을 거드는 기운' };
  var STEM_K = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  // opt: { flags, esc, weights, todo: '해 볼 것' 문장, extra: [[이름, html], …] }
  // 줄마다 좋은 신호(초록)·주의 신호(빨강)를 구분한다: rows = [이름, html, tone('good'|'bad'|'')]
  function quick(M, ch, x, kind, opt) {
    opt = opt || {}; var E = opt.esc || esc0, F = opt.flags || {}, LE = root.MantraLuckEnv, OV = root.MantraLuckOverlay, rows = [];
    if (!x || x.s == null) return '';
    var el = stemEl(x.s), role = String((ch.unified && ch.unified.roles && ch.unified.roles[el]) || '').replace(/^조건부 /, ''), tg = x.stemTG || '';
    var rt = role === '용신' || role === '희신' ? 'good' : role === '기신' || role === '구신' ? 'bad' : '';
    rows.push(['핵심', '<b>' + E(STEM_K[x.s] + EL_S[el]) + '(' + E(M.STEM[x.s]) + ')' + (tg ? ' · ' + E(tg) : '') + '</b>' + (TGP[tg] ? ' — ' + E(TGP[tg]) + '의 기운이 들어와요.' : '') + (RP[role] ? ' <span class="lv-qm">' + E(RP[role]) + '(' + E(role) + ')이에요.</span>' : ''), rt]);
    var L = layersOf(M, ch, x, kind);
    if (LE && F.luckEnv && kind !== 'daeun') {
      try { var tones = null; if (OV && F.luckOverlay) { tones = {}; OV.explain(OV.compute(M, ch, L, { weights: opt.weights }), L.length).forEach(function (l) { tones[l.level] = l.tone; }); }
        var h = LE.hierarchy(M, ch, L, { tones: tones }); if (h) { var me = h.rows[h.rows.length - 1]; rows.push(['큰 운과', E(h.text), /good/.test(me.side) ? 'good' : /bad/.test(me.side) ? 'bad' : '']); } } catch (e) { }
    }
    if (LE && F.luckEnv) {
      try { var nb = LE.neighbors(M, ch, x, kind); if (nb.prev) { var t = LE.transition(M, ch, nb.prev, x, kind, { prevLayers: layersOf(M, ch, nb.prev, kind), curLayers: L });
        if (t) { var dv = (x.ev && nb.prev.ev) ? x.ev.fitScore - nb.prev.ev.fitScore : 0, tt = t.level === 'low' ? '' : dv >= 8 ? 'good' : dv <= -8 ? 'bad' : '';
          rows.push(['바뀌는 점', '<span class="lv-chip ' + (tt || (t.level === 'high' ? 'bad' : '')) + '">' + E(t.levelK) + '</span> ' + E(t.level === 'low' ? { daeun: '직전 대운과', seun: '작년과', wolun: '지난달과', ilun: '어제와' }[kind] + ' 비교해 구조가 크게 바뀌지는 않아요.' : (t.signals[0] ? t.signals[0].text : t.text)), tt]); } } } catch (e) { }
    }
    (opt.extra || []).forEach(function (r) { if (r && r[1]) rows.push(r); });
    if (opt.todo) rows.push(['해 볼 것', E(opt.todo), 'good']);
    (opt.after || []).forEach(function (r) { if (r && r[1]) rows.push([r[0], r[1], r[2] || (r[0] === '조심할 것' ? 'bad' : '')]); });
    return '<div class="lv-q"><p class="lv-qk">한눈에 보기 <span class="lv-qleg"><i class="good"></i>좋은 신호 <i class="bad"></i>주의할 신호</span></p>' + rows.map(function (r) { return '<p class="lv-qr' + (r[2] ? ' ' + r[2] : '') + '"><span class="lv-qt">' + r[0] + '</span><span>' + r[1] + '</span></p>'; }).join('') + '</div>';
  }

  // 한 시기의 분석 칸들(① 외부 환경 ② 내 사주 반응 ③ 상위·하위 운 ④ 영역) — 칸마다 모듈·스위치가 있을 때만
  function parts(M, ch, x, kind, opt) {
    opt = opt || {}; var F = opt.flags || {}, E = opt.esc || esc0, LE = root.MantraLuckEnv, OV = root.MantraLuckOverlay, TG = root.MantraTenGodRoles;
    var L = layersOf(M, ch, x, kind), out = { env: '', tr: '', hier: '', ol: '', olv: '', tgr: '', dom: '', hid: '', oc: null, tones: null };
    try { out.hid = hidden(M, ch, x.b, E); } catch (e) { }
    var nb = null, tones = null, oc = null, ex = null;
    if (F.luckOverlay && OV) { try { oc = OV.compute(M, ch, L, { weights: opt.weights }); ex = OV.explain(oc, L.length); tones = {}; ex.forEach(function (l) { tones[l.level] = l.tone; }); } catch (e) { oc = null; ex = null; tones = null; } }
    if (F.luckEnv && LE) {
      try {
        nb = LE.neighbors(M, ch, x, kind);
        var wo = L.filter(function (l) { return l.level === 'wolun'; })[0], r = LE.env(M, L, { prev: nb.prev, next: nb.next, seasonB: wo ? wo.b : null });
        var mix = r.mix.map(function (v, e) { return v ? '<span class="lv-mx e' + e + '"><i style="width:' + v + '%"></i>' + EL_HJ[e] + ' ' + v + '%</span>' : ''; }).join('');
        var ups = r.upper.map(function (u) { return '<li><b>' + E(u.levelK + ' ' + u.gz) + '</b> — ' + E(u.stemFlow) + (u.rels.length ? ' · ' + u.rels.map(function (q) { return E(q.name + ' ' + q.text); }).join(' · ') : '') + '</li>'; }).join('');
        out.env = '<p class="lv-lead">' + E(r.summary) + '</p><p class="lv-mxs">' + mix + '</p>' +
          '<p>간지 안의 관계: <b>' + E(r.pillar.name) + '</b> — ' + E(r.pillar.text) + '</p>' +
          (r.season ? '<p><b>월령·계절</b> · ' + E(r.season.text) + '</p>' : '') +
          (ups ? '<ul class="lv-ul">' + ups + '</ul>' : '') +
          (r.prev ? '<p class="lv-sm">' + E(r.prev.text) + '</p>' : '') +
          '<p class="lv-note">' + E(r.note) + '</p>';
      } catch (e) { out.env = ''; }
      try {
        if (nb && nb.prev) {
          var t = LE.transition(M, ch, nb.prev, x, kind, { prevLayers: layersOf(M, ch, nb.prev, kind), curLayers: L });
          if (t) out.tr = '<div class="lv-tr lv-' + t.level + '"><p><b>전환 점검</b> <span class="lv-chip ' + (t.level === 'high' ? 'bad' : '') + '">' + E(t.levelK) + '</span> ' + E(t.text) + '</p>' + (t.level !== 'low' && t.signals.length ? '<ul class="lv-ul lv-sm">' + t.signals.map(function (q) { return '<li>' + E(q.text) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
        }
      } catch (e) { }
      try {
        var h = kind === 'daeun' ? null : LE.hierarchy(M, ch, L, { tones: tones });
        if (h) out.hier = '<p class="lv-rows">' + h.rows.map(function (q) { return '<span class="lv-lvl ' + q.level + '"><b>' + E(q.levelK + ' ' + q.gz) + '</b> <i class="lv-chip ' + (/good/.test(q.side) ? 'good' : /bad/.test(q.side) ? 'bad' : '') + '">' + E(q.sideK) + '</i></span>'; }).join('<em>→</em>') + '</p><p>' + E(h.text) + '</p>';
      } catch (e) { }
    }
    out.oc = oc; out.tones = tones;
    if (oc && ex) {
      try {
        var yg = oc.yong;
        try { out.olv = olVisual(oc, E); } catch (e2) { out.olv = ''; }
        out.ol = (opt.noFigure ? '' : out.olv || '') + '<ol class="lv-ol">' + ex.map(function (l) { return '<li class="lv-' + l.tone + '"><b>' + E(l.title) + '</b> ' + E(l.text) + '</li>'; }).join('') + '</ol>' +
          (yg && yg.el != null ? '<p class="lv-sm">필요한 기운(용신) ' + E(EL_S[yg.el] + '(' + EL_HJ[yg.el] + ')') + ': 원국 ' + Math.round(yg.natal) + '% → 운을 겹친 뒤 ' + Math.round(yg.now) + '%</p>' : '');
      } catch (e) { out.ol = ''; }
    }
    if (F.tenGodRoles && TG) {
      try {
        var tr = TG.luck(M, ch, L, { weights: opt.weights }), me = tr.layers[tr.layers.length - 1];
        var chg = (me.B.changes || []).map(function (c) { return '<span class="lv-chip ' + (c.kind === 'gone' ? '' : c.tone === 'good' ? 'good' : c.tone === 'bad' ? 'bad' : '') + '">' + E(c.name + ' ' + c.kindK) + '</span>'; }).join(' ');
        out.tgr = '<p>' + me.lines.map(E).join(' ') + '</p>' + (chg ? '<p>' + chg + '</p>' : '');
        out.dom = (me.B.domains || []).map(function (d) { return '<li><b>' + E(d.name) + '</b> <span class="lv-chip ' + (d.tone === 'good' ? 'good' : d.tone === 'bad' ? 'bad' : '') + '">' + E(d.toneK) + '</span> <span class="lv-sm">' + E(d.basis) + '</span>' + (d.note ? '<br><span class="lv-sm">' + E(d.note) + '</span>' : '') + '</li>'; }).join('');
        if (out.dom) out.dom = '<ul class="lv-ul">' + out.dom + '</ul><p class="lv-note">영역 판정은 이 시기에 들어온 십성이 원국에서 맡는 역할로 본 거예요.</p>';
      } catch (e) { }
    }
    return out;
  }

  // 겹쳐 보기 그림 한 덩어리(제목·용신 한 줄·그림) — 타임라인 시기 카드에 접지 않고 바로 보이게
  function overlayFigure(M, ch, x, kind, opt) {
    opt = opt || {}; var E = opt.esc || esc0, OV = root.MantraLuckOverlay; if (!OV || !(opt.flags || {}).luckOverlay) return '';
    var L = layersOf(M, ch, x, kind), oc; try { oc = OV.compute(M, ch, L, { weights: opt.weights }); } catch (e) { return ''; }
    var y = oc.yong, ex = []; try { ex = OV.explain(oc, L.length); } catch (e) { }
    var me = ex[ex.length - 1], yl = y && y.el != null ? '필요한 기운(용신) <b>' + E(EL_S[y.el] + '(' + EL_HJ[y.el] + ')') + '</b>' + (y.el === 0 || y.el === 3 ? '이' : '가') + ' 원국 ' + Math.round(y.natal) + '% → 겹친 뒤 <b class="' + (y.now - y.natal > 0.4 ? 'lv-up' : y.now - y.natal < -0.4 ? 'lv-down' : '') + '">' + Math.round(y.now) + '%</b>' + (y.now - y.natal > 0.4 ? ' — 이 시기에 채워져요' : y.now - y.natal < -0.4 ? ' — 이 시기에 오히려 줄어요' : ' — 거의 그대로예요') : '';
    return '<div class="lv-fig"><p class="lv-fig-h"><b>오행 겹쳐 보기</b> <span>원국 위에 ' + L.map(function (l) { return LEVEL_K[l.level]; }).join(' → ') + '</span></p>' + (yl ? '<p class="lv-fig-y">' + yl + '</p>' : '') + olVisual(oc, E) + (me ? '<p class="lv-sm">' + E(me.text) + '</p>' : '') + '</div>';
  }
  // 상세 카드 한 장 분량(타임라인 시기 카드 아래에 붙인다)
  function card(M, ch, x, kind, opt) {
    var p = parts(M, ch, x, kind, opt), lv = LEVEL_K[kind] || '';
    var s2 = p.tr + p.tgr, s3 = p.hier + p.ol, s1 = p.env;
    var h = (s1 ? '' : p.hid) + sec(1, '① 외부 환경의 오행 흐름', '모두에게 같은 ' + lv + (kind === 'wolun' || kind === 'ilun' ? '의 간지·계절' : '의 간지') + ' · 좋고 나쁨 판단 없음', s1 ? s1 + p.hid : '', false) +
      sec(2, '② 내 사주에 미치는 영향', '원국과 이 ' + lv + '이 만나 생기는 작용', s2, true) +
      sec(3, '③ 상위 운과 하위 운', kind === 'daeun' ? '대운이 원국 위에 쌓이는 모습' : '큰 운은 배경, 작은 운은 구체화 · 위가 아래를 정하지 않아요', s3, false) +
      sec(4, '④ 영역별 영향', '재물·커리어·인연', p.dom, false);
    return h ? '<div class="lv">' + h + '</div>' : '';
  }

  // 시대 흐름(삼원구운) 한 상자 — 모두에게 같은 20년 + 이 사주가 받아들이는 방식
  function era(M, ch, ms, opt) {
    opt = opt || {}; var E = opt.esc || esc0, B = root.MantraMacroBridge, ME = root.MantraMacroEra;
    if (!B || !ME || !(opt.flags || {}).macroEra) return '';
    var r; try { r = B.analyze(M, ch, ms || Date.now()); } catch (e) { return ''; }
    if (!r || !r.supported) return '';
    var e = r.era.era, strip = '';
    try { strip = ME.timeline(e.start - 20, e.end + 20).map(function (q) { return '<span class="lv-era e' + q.el + (q.period === e.period ? ' on' : '') + '"><b>' + q.period + '운 ' + E(EL_S[q.el]) + '</b><small>' + q.start + '~' + q.end + '</small></span>'; }).join(''); } catch (x) { }
    var li = ['<li><b>나의 위치</b> ' + E(r.natal.text) + '</li>'];
    if (r.daeun) li.push('<li><b>지금 대운(' + E(r.daeun.gz) + ')과 시대</b> ' + E(r.daeun.text) + '</li>');
    if (r.seun) li.push('<li><b>올해 세운(' + E(r.seun.gz) + ')과 시대</b> ' + E(r.seun.text) + '</li>');
    if (r.action) li.push('<li><b>대응 방향</b> ' + E(r.action) + '</li>');
    var lead = '<p class="lv-eras">' + strip + '</p><p class="lv-lead">지금은 ' + E(e.yuan + ' ' + e.period + '운 · ' + e.star) + ' — ' + E(e.elK) + '의 시대 ' + e.start + '~' + e.end + '년 · ' + r.era.yearsIn + '년째</p>', note = '<p class="lv-note">' + E(r.note || '시대 흐름은 모두에게 공통인 바깥 환경이고 개인의 용신·운을 대신하지 않아요.') + '</p>';
    if (opt.compact) return '<div class="lv-erabox">' + lead + '<p>' + E(r.natal.text) + '</p><details class="lv-more"><summary>지금 대운·올해와 시대, 대응 방향 보기</summary><p class="lv-sm">' + E(e.reading) + '</p><ol class="lv-ul">' + li.slice(1).join('') + '</ol>' + note + '</details></div>';
    return '<div class="lv-erabox">' + lead + '<p class="lv-sm">' + E(e.reading) + '</p><ol class="lv-ul">' + li.join('') + '</ol>' + note + '</div>';
  }

  var CSS = '.lv{margin:10px 0 4px;display:grid;gap:6px}.lv-sec{border:1px solid var(--lv-line,rgba(127,127,127,.28));border-radius:12px;padding:0 12px;background:var(--lv-bg,transparent)}.lv-sec>summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;gap:2px 8px;align-items:baseline;padding:9px 0}.lv-sec>summary::-webkit-details-marker{display:none}.lv-sec>summary b{font-size:.92rem}.lv-sec>summary span{font-size:.74rem;opacity:.65}'
    + '.lv-s1{border-style:dashed;background:rgba(127,127,127,.05)}.lv-b{padding:0 0 10px;font-size:.88rem;line-height:1.6}.lv-b p{margin:6px 0}.lv-lead{font-weight:600}.lv-sm{font-size:.8rem;opacity:.8}.lv-note{font-size:.76rem;opacity:.65}.lv-ul,.lv-ol{margin:6px 0;padding-left:18px}.lv-ul li,.lv-ol li{margin:3px 0}'
    + '.lv-chip{display:inline-block;font-style:normal;font-size:.74rem;padding:1px 8px;border-radius:999px;border:1px solid rgba(127,127,127,.35)}.lv-chip.good{color:#1f7a5c;border-color:#1f7a5c66;background:#1f7a5c14}.lv-chip.bad{color:#b23a2b;border-color:#b23a2b66;background:#b23a2b12}'
    + '.lv-tr{border-left:3px solid rgba(127,127,127,.35);padding-left:9px}.lv-tr.lv-high{border-left-color:#b23a2b}.lv-tr.lv-mid{border-left-color:#c58b2a}.lv-ol li.lv-good{border-left:3px solid #1f7a5c55;padding-left:6px;list-style:none;margin-left:-18px}.lv-ol li.lv-bad{border-left:3px solid #b23a2b55;padding-left:6px;list-style:none;margin-left:-18px}.lv-ol li.lv-mixed,.lv-ol li.lv-flat{border-left:3px solid rgba(127,127,127,.35);padding-left:6px;list-style:none;margin-left:-18px}'
    + '.lv-rows{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.lv-rows em{opacity:.5;font-style:normal}.lv-mxs{display:flex;flex-wrap:wrap;gap:5px}.lv-mx{position:relative;overflow:hidden;z-index:0;font-size:.74rem;padding:2px 8px;border-radius:999px;border:1px solid rgba(127,127,127,.3)}.lv-mx i{position:absolute;inset:0 auto 0 0;z-index:-1;opacity:.35}'
    + '.lv-mx.e0 i,.lv-el.e0,.lv-era.e0{background:#5fae6e}.lv-mx.e1 i,.lv-el.e1,.lv-era.e1{background:#e0705a}.lv-mx.e2 i,.lv-el.e2,.lv-era.e2{background:#d9b25c}.lv-mx.e3 i,.lv-el.e3,.lv-era.e3{background:#b9bec7}.lv-mx.e4 i,.lv-el.e4,.lv-era.e4{background:#5a7fbf}'
    + '.lv-hid{display:flex;flex-wrap:wrap;align-items:center;gap:5px;font-size:.84rem}.lv-hid span{font-size:.76rem;opacity:.7}.lv-el{display:inline-flex;flex-direction:column;align-items:center;font-style:normal;color:#fff;border-radius:8px;padding:2px 7px;line-height:1.15;opacity:.75}.lv-el.m{opacity:1;font-weight:700}.lv-el small{font-size:.6rem}'
    + '.lv-eras{display:flex;gap:5px}.lv-era{flex:1 1 0;min-width:0;text-align:center;border-radius:9px;padding:5px 2px;opacity:.55;color:#222;font-size:.76rem;display:grid}.lv-era.on{opacity:1;outline:2px solid currentColor}.lv-era small{font-size:.6rem}.lv-more>summary{cursor:pointer;font-size:.84rem;opacity:.85;padding:4px 0}'
    + '.lv-olv{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;margin:8px 0}.lv-pent{flex:none;max-width:100%;height:auto}.lv-bars{flex:1 1 220px;min-width:0;display:grid;gap:6px}.lv-brow{display:grid;grid-template-columns:62px 1fr auto;gap:6px;align-items:center;margin:0;font-size:.8rem}.lv-bk{display:flex;gap:4px;align-items:center}.lv-r{font-size:.68rem;opacity:.8}.lv-r.good,.lv-d.good,.lv-up{color:#1f7a5c}.lv-r.bad,.lv-d.bad,.lv-down{color:#b23a2b}.lv-bar{display:flex;height:11px;border-radius:6px;overflow:hidden;background:rgba(127,127,127,.18)}.lv-bar i{display:block;height:100%}.lv-bv{white-space:nowrap;font-size:.76rem;opacity:.9}.lv-leg{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:.72rem;opacity:.8;margin:2px 0 0}.lv-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}'
    + '.lv-fig{margin:10px 0;padding:10px 12px;border-radius:12px;border:1px solid rgba(127,127,127,.28)}.lv-fig-h{margin:0 0 4px;font-size:.9rem}.lv-fig-h span{font-size:.74rem;opacity:.7}.lv-fig-y{margin:2px 0 4px;font-size:.86rem}'
    + '.lv-nf{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px 18px;align-items:start;margin:12px 0}.lv-nf-fig svg{width:100%;height:auto;max-width:400px;display:block;margin:0 auto}.lv-nf-h{font-size:1.02rem;margin:4px 0}.lv-nf-txt{font-size:.9rem;line-height:1.65}.lv-npl{paint-order:stroke;stroke:var(--lv-halo,#fff);stroke-width:5px;stroke-linejoin:round;opacity:.9}.lv-q{border-radius:14px;padding:12px 14px;margin:10px 0;border:1px solid rgba(127,127,200,.35);background:rgba(110,120,230,.07)}.lv-qk{font-size:.74rem;font-weight:700;margin:0 0 6px;letter-spacing:.04em;opacity:.85}.lv-qr{display:flex;gap:10px;margin:6px 0;line-height:1.6;font-size:.9rem}.lv-qt{flex:0 0 4.6em;font-size:.78rem;font-weight:700;opacity:.8;padding-top:2px}.lv-qr{padding-left:8px;border-left:3px solid transparent;border-radius:2px}.lv-qr.good{border-left-color:#1FA85A}.lv-qr.bad{border-left-color:#E2553F}.lv-qr.good .lv-qt,.lv-qr.good b,.lv-qr.good .lv-qm{color:#178a4a}.lv-qr.bad .lv-qt,.lv-qr.bad b,.lv-qr.bad .lv-qm{color:#c9412d}.lv-qr.good .lv-qt,.lv-qr.bad .lv-qt{opacity:1}.lv-qleg{font-weight:400;font-size:.7rem;opacity:.75;margin-left:8px;letter-spacing:0}.lv-qleg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin:0 3px 0 6px}.lv-qleg i.good{background:#1FA85A}.lv-qleg i.bad{background:#E2553F}@media (max-width:720px){.lv-nf{grid-template-columns:1fr}}';

  var api = { version: VERSION, layersOf: layersOf, hidden: hidden, parts: parts, card: card, era: era, olVisual: olVisual, overlayFigure: overlayFigure, natalFlowFigure: natalFlowFigure, quick: quick, CSS: CSS, LEVEL_K: LEVEL_K };
  root.MantraLuckView = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
