/* 명식 나란히 보기(2026-11-28) — 만세력 궁합 탭 결과 맨 위 카드, 표시 전용
 *  사용자 요청: "궁합 볼 때 2인이든 여러명이든 사주 원국 명식이 같이 보여서 비교할 수 있음 좋겠는데"
 *  · 2인: 네 기둥(시·일·월·년)을 좌우에 같은 줄 높이로. 천간·지지·오행 색·각자 일간 기준 십성.
 *         두 사람 사이 작용은 글자끼리 선으로(천간은 위, 지지는 아래): 합 파랑 · 충·형·원진·천간충 빨강.
 *         아래에 오행 글자 수 두 줄 막대, '상대 일간 기준 나는 ○○' 한 줄씩.
 *  · 3~6명: 이름|시|일|월|년 한 줄 압축 표(일주 굵게). 이름을 누르면 그 사람과 다른 사람들 사이의 합·충 글자에만 표시.
 *  · 판정: 엔진 relationsAmong·tenGod·stemEl·BR_EL 그대로(새 규칙 없음). 만세력은 상담자용이라 명리 용어 그대로 쓴다.
 *  브라우저: window.MantraNatalCompare · Node: module.exports(계산 함수 relsBetween 등)
 */
(function (root) {
  'use strict';
  var VERSION = 'natal-compare-1-2026-11-28';
  var POS = ['hour', 'day', 'month', 'year'], POS_L = { hour: '시', day: '일', month: '월', year: '년' };
  var GOOD = { '천간합': 1, '육합': 1, '삼합': 1, '반합': 1, '방합': 1 }, BAD = { '충': 1, '형': 1, '원진': 1, '천간충': 1 };
  var EV = ['wood', 'fire', 'earth', 'metal', 'water'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toneOf = function (type) { return GOOD[type] ? 'good' : BAD[type] ? 'bad' : 'other'; };

  // 두 원국 사이 작용(엔진 relationsAmong 그대로). 한쪽 안에서만 생기는 작용은 뺀다. 일간·일지끼리 짝도 넣는다(궁합 점수와 별개 표시).
  function relsBetween(M, X, Y) {
    var items = [];
    POS.forEach(function (k) { if (X.pillars[k]) items.push({ id: 'a.' + k, s: X.pillars[k].s, b: X.pillars[k].b }); });
    POS.forEach(function (k) { if (Y.pillars[k]) items.push({ id: 'b.' + k, s: Y.pillars[k].s, b: Y.pillars[k].b }); });
    var out = [];
    (M.relationsAmong(items) || []).forEach(function (r) {
      var a = r.members.filter(function (m) { return m[0] === 'a'; }).map(function (m) { return m.slice(2); });
      var b = r.members.filter(function (m) { return m[0] === 'b'; }).map(function (m) { return m.slice(2); });
      if (!a.length || !b.length) return;
      out.push({ type: r.type, name: r.name, kind: r.kind, tone: toneOf(r.type), a: a, b: b });
    });
    return out;
  }
  // 한 사람의 명식 칸: 천간·지지·오행·십성(일간 기준. 지지는 본기)
  function cells(M, ch) {
    var d = ch.pillars.day.s;
    return POS.map(function (k) {
      var p = ch.pillars[k]; if (!p) return { k: k, none: true };
      var mh = M.mainHidden(p.b);
      return { k: k, s: p.s, b: p.b, sc: M.STEM[p.s], bc: M.BR[p.b], se: M.stemEl(p.s), be: M.BR_EL[p.b],
        stg: k === 'day' ? '일간' : M.tenGod(d, p.s), btg: M.tenGod(d, mh) };
    });
  }
  // 오행 글자 수(천간 + 지지 본 오행, 시주 모름이면 6자)
  function elCount(M, ch) { var n = [0, 0, 0, 0, 0]; POS.forEach(function (k) { var p = ch.pillars[k]; if (!p) return; n[M.stemEl(p.s)]++; n[M.BR_EL[p.b]]++; }); return n; }
  var elName = function (M, e) { return M.EL[e] + '(' + M.EL_K[e] + ')'; };
  var posTxt = function (k, kind) { return POS_L[k] + (kind === 'stem' ? '간' : '지'); };

  // ───────── 2인 ─────────
  function pairSvg(M, A, B, R) {
    var CW = 54, CH = 60, GP = 6, BW = 4 * CW + 3 * GP, MG = 40, LM = 6, W = LM * 2 + BW * 2 + MG;
    var cx = function (side, k) { return LM + (side === 'b' ? BW + MG : 0) + POS.indexOf(k) * (CW + GP) + CW / 2; };
    // 작용 하나 = 선 하나(삼합·방합처럼 글자가 셋이면 한 줄에서 세 글자로 내려온다). 짧은 것부터 안쪽에
    var lines = function (kind) {
      var L = []; R.forEach(function (r) { if (r.kind !== kind || r.tone === 'other') return; var xs = r.a.map(function (a) { return cx('a', a); }).concat(r.b.map(function (b) { return cx('b', b); })).sort(function (p, q) { return p - q; }); L.push({ r: r, xs: xs, x1: xs[0], x2: xs[xs.length - 1] }); });
      L.sort(function (p, q) { return (p.x2 - p.x1) - (q.x2 - q.x1) || (p.r.tone < q.r.tone ? -1 : 1); });
      L.forEach(function (l, i) { l.lv = i; }); return L;
    };
    var LS = lines('stem'), LB = lines('branch'), STEP = 13;
    var top = 34, AT = LS.length ? 18 + LS.length * STEP : 8, sy = top + AT, by = sy + CH + 4, AB = LB.length ? 18 + LB.length * STEP : 8, H = by + CH + AB + 4;
    var s = '<svg class="nc-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(A.name) + '와 ' + esc(B.name) + '의 원국 명식 비교">';
    [['a', A], ['b', B]].forEach(function (pp) {
      var side = pp[0], P = pp[1], x0 = LM + (side === 'b' ? BW + MG : 0);
      s += '<text x="' + (x0 + BW / 2) + '" y="14" text-anchor="middle" class="nc-nm">' + esc(P.name) + '</text>';
      POS.forEach(function (k) { s += '<text x="' + cx(side, k) + '" y="30" text-anchor="middle" class="nc-pl">' + POS_L[k] + '주</text>'; });
      cells(M, P.ch).forEach(function (c) {
        var x = cx(side, c.k) - CW / 2;
        if (c.none) { s += '<rect x="' + x + '" y="' + sy + '" width="' + CW + '" height="' + (CH * 2 + 4) + '" rx="10" class="nc-none"/><text x="' + (x + CW / 2) + '" y="' + (by + 2) + '" text-anchor="middle" class="nc-pl">시 모름</text>'; return; }
        var day = c.k === 'day' ? ' nc-day' : '';
        s += '<rect x="' + x + '" y="' + sy + '" width="' + CW + '" height="' + CH + '" rx="10" class="nc-c' + day + '" style="fill:var(--' + EV[c.se] + ')"/>'
          + '<text x="' + (x + CW / 2) + '" y="' + (sy + 15) + '" text-anchor="middle" class="nc-tg" style="fill:var(--' + EV[c.se] + '-on)">' + esc(c.stg) + '</text>'
          + '<text x="' + (x + CW / 2) + '" y="' + (sy + 47) + '" text-anchor="middle" class="nc-ch" style="fill:var(--' + EV[c.se] + '-on)">' + esc(c.sc) + '</text>';
        s += '<rect x="' + x + '" y="' + by + '" width="' + CW + '" height="' + CH + '" rx="10" class="nc-c' + day + '" style="fill:var(--' + EV[c.be] + ')"/>'
          + '<text x="' + (x + CW / 2) + '" y="' + (by + 34) + '" text-anchor="middle" class="nc-ch" style="fill:var(--' + EV[c.be] + '-on)">' + esc(c.bc) + '</text>'
          + '<text x="' + (x + CW / 2) + '" y="' + (by + 52) + '" text-anchor="middle" class="nc-tg" style="fill:var(--' + EV[c.be] + '-on)">' + esc(c.btg) + '</text>';
      });
    });
    var arc = function (l, up) {
      var y0 = up ? sy : by + CH, h = 16 + l.lv * STEP, ym = up ? y0 - h : y0 + h, mx = (l.x1 + l.x2) / 2;
      var cls = 'nc-l nc-' + l.r.tone + (l.r.type === '형' || l.r.type === '원진' ? ' nc-dash' : '');
      // 사각에 가까운 둥근 선: 양 끝에서 수직으로 올라가 가로로 잇는다
      var d = 'M' + l.x1 + ' ' + y0 + ' C' + l.x1 + ' ' + ym + ' ' + l.x1 + ' ' + ym + ' ' + (l.x1 + 12) + ' ' + ym + ' L' + (l.x2 - 12) + ' ' + ym + ' C' + l.x2 + ' ' + ym + ' ' + l.x2 + ' ' + ym + ' ' + l.x2 + ' ' + y0;
      l.xs.slice(1, -1).forEach(function (x) { d += ' M' + x + ' ' + ym + ' L' + x + ' ' + y0; });   // 가운데 글자로 내려오는 줄
      return '<path d="' + d + '" class="' + cls + '"><title>' + esc(A.name + ' ' + l.r.a.map(function (k) { return posTxt(k, l.r.kind); }).join('·') + ' ↔ ' + B.name + ' ' + l.r.b.map(function (k) { return posTxt(k, l.r.kind); }).join('·') + ' · ' + l.r.name) + '</title></path>'
        + '<text x="' + mx + '" y="' + (ym + 4) + '" text-anchor="middle" class="nc-lt nc-' + l.r.tone + 't">' + esc(l.r.name) + '</text>';
    };
    LS.forEach(function (l) { s += arc(l, true); }); LB.forEach(function (l) { s += arc(l, false); });
    return s + '</svg>';
  }
  function pairHTML(M, A, B) {
    if (!A || !B || !A.ch || !B.ch) return '';
    var R = relsBetween(M, A.ch, B.ch);
    var cA = elCount(M, A.ch), cB = elCount(M, B.ch), mx = Math.max.apply(null, cA.concat(cB, [1]));
    var bar = function (nm, n) {
      var tot = n.reduce(function (x, y) { return x + y; }, 0) || 1;
      return '<div class="nc-el-r"><b>' + esc(nm) + '</b><span class="nc-el-b">' + n.map(function (v, e) { return v ? '<i class="e-' + EV[e] + '" style="width:' + (v / tot * 100).toFixed(1) + '%">' + M.EL[e] + v + '</i>' : ''; }).join('') + '</span></div>';
    };
    var dA = A.ch.pillars.day.s, dB = B.ch.pillars.day.s;
    var dayTxt = function (s) { return M.STEM[s] + M.EL[M.stemEl(s)]; };
    var tgLine = function (who, whoS, other, otherS) { return '<li><b>' + esc(other) + '</b> 일간 <b>' + dayTxt(otherS) + '</b> 기준 → <b>' + esc(who) + '</b>(일간 ' + dayTxt(whoS) + ')는 <b>' + M.tenGod(otherS, whoS) + '</b></li>'; };
    var shown = R.filter(function (r) { return r.tone !== 'other'; });
    var others = R.filter(function (r) { return r.tone === 'other'; });
    var relLi = function (r) { return '<li><span class="nc-dot nc-' + r.tone + 'b"></span>' + esc(A.name) + ' ' + r.a.map(function (k) { return posTxt(k, r.kind); }).join('·') + ' ↔ ' + esc(B.name) + ' ' + r.b.map(function (k) { return posTxt(k, r.kind); }).join('·') + ' · <b>' + esc(r.name) + '</b> <span class="muted">(' + esc(r.type) + ')</span></li>'; };
    var seenO = {}, oTxt = others.filter(function (r) { var k = r.name; if (seenO[k]) return false; seenO[k] = 1; return true; }).map(function (r) { return esc(r.name); });
    return '<section class="card nc-card" id="ncPairCard">'
      + '<div class="card-h"><h2>명식 나란히 보기</h2><span class="note">각자 일간 기준 십성 · 선은 두 사람 사이 작용</span></div>'
      + '<div class="nc-scroll">' + pairSvg(M, A, B, R) + '</div>'
      + '<div class="nc-keys small muted"><span><i class="nc-k nc-goodb"></i>합(천간합·육합·삼합·반합·방합)</span><span><i class="nc-k nc-badb"></i>충·천간충</span><span><i class="nc-k nc-badb nc-kd"></i>형·원진</span><span>일주는 굵은 테두리</span></div>'
      + (shown.length ? '<ul class="nc-rels small">' + shown.map(relLi).join('') + '</ul>' : '<p class="small muted">두 원국 사이에 합·충·형·원진으로 이어지는 글자가 없습니다.</p>')
      + (oTxt.length ? '<p class="small muted">그 밖의 작용(선 없음): ' + oTxt.join(', ') + '</p>' : '')
      + '<h3 class="cp-h3">오행 글자 수</h3><div class="nc-el">' + bar(A.name, cA) + bar(B.name, cB) + '</div>'
      + '<h3 class="cp-h3">상대 일간 기준 십성</h3><ul class="pr-list nc-tgl">' + tgLine(A.name, dA, B.name, dB) + tgLine(B.name, dB, A.name, dA) + '</ul>'
      + '</section>';
  }

  // ───────── 3~6명 ─────────
  var G = { focus: -1, mem: null, M: null };
  function groupMarks(M, mem, i) {
    var mk = {}, list = [];
    var add = function (p, k, kind, tone) { var key = p + '.' + k + '.' + (kind === 'stem' ? 's' : 'b'); mk[key] = mk[key] === tone || !mk[key] ? tone : 'both'; };
    mem.forEach(function (o, j) {
      if (j === i || !o.ch) return;
      relsBetween(M, mem[i].ch, o.ch).forEach(function (r) {
        if (r.tone === 'other') return;
        r.a.forEach(function (k) { add(i, k, r.kind, r.tone); }); r.b.forEach(function (k) { add(j, k, r.kind, r.tone); });
        list.push({ j: j, r: r });
      });
    });
    return { mk: mk, list: list };
  }
  function groupHTML(M, mem) {
    if (!mem || mem.length < 2) return '';
    G.M = M; G.mem = mem; if (!(G.focus >= -1 && G.focus < mem.length)) G.focus = -1;
    var F = G.focus >= 0 ? groupMarks(M, mem, G.focus) : { mk: {}, list: [] };
    var cell = function (i, c) {
      if (c.none) return '<td class="nc-gc nc-gnone">시 모름</td>';
      var m = function (part) { var t = F.mk[i + '.' + c.k + '.' + part]; return t ? ' nc-hl-' + t : ''; };
      return '<td class="nc-gc' + (c.k === 'day' ? ' nc-gday' : '') + '"><span class="nc-gg e-' + EV[c.se] + m('s') + '" title="' + esc(c.stg) + '">' + esc(c.sc) + '</span><span class="nc-gg e-' + EV[c.be] + m('b') + '" title="' + esc(c.btg) + '">' + esc(c.bc) + '</span></td>';
    };
    var rows = mem.map(function (p, i) {
      return '<tr class="' + (G.focus === i ? 'on' : '') + '"><th scope="row"><button type="button" class="nc-nb" data-ncfocus="' + i + '" aria-pressed="' + (G.focus === i) + '">' + esc(p.name) + '</button></th>' + cells(M, p.ch).map(function (c) { return cell(i, c); }).join('') + '</tr>';
    }).join('');
    var nm = function (i) { return esc(mem[i].name); };
    var listH = '';
    if (G.focus >= 0) {
      // 사람별로 묶어 접는 상자(합 n · 충·형·원진 n)
      var by = {}; F.list.forEach(function (x) { (by[x.j] = by[x.j] || []).push(x.r); });
      var li = function (j, r) { return '<li><span class="nc-dot nc-' + r.tone + 'b"></span>' + nm(G.focus) + ' ' + r.a.map(function (k) { return posTxt(k, r.kind); }).join('·') + ' ↔ ' + nm(j) + ' ' + r.b.map(function (k) { return posTxt(k, r.kind); }).join('·') + ' · <b>' + esc(r.name) + '</b> <span class="muted">(' + esc(r.type) + ')</span></li>'; };
      listH = F.list.length ? '<div class="nc-by">' + mem.map(function (o, j) {
        var rs = by[j]; if (!rs) return '';
        var g = rs.filter(function (r) { return r.tone === 'good'; }).length, b = rs.length - g;
        return '<details class="nc-det"><summary><b>' + nm(G.focus) + ' ↔ ' + nm(j) + '</b> <span class="small"><span class="nc-dot nc-goodb"></span>합 ' + g + ' · <span class="nc-dot nc-badb"></span>충·형·원진 ' + b + '</span></summary><ul class="nc-rels small">' + rs.map(function (r) { return li(j, r); }).join('') + '</ul></details>';
      }).join('') + '</div>'
        : '<p class="small muted">' + nm(G.focus) + '와(과) 다른 사람들 사이에 합·충·형·원진으로 이어지는 글자가 없습니다.</p>';
    }
    return '<section class="card nc-card" id="ncGroupCard">'
      + '<div class="card-h"><h2>명식 나란히 보기</h2><span class="note">' + mem.length + '명 · 일주 굵게</span></div>'
      + '<p class="small muted nc-hint">이름을 누르면 그 사람과 다른 사람들 사이의 합(파랑)·충·형·원진(빨강) 글자에 표시가 켜집니다. 한 번 더 누르면 끕니다. 글자에 손을 올리면 그 사람 일간 기준 십성이 보입니다.</p>'
      + '<div class="nc-tw"><table class="nc-gt"><thead><tr><th scope="col">이름</th>' + POS.map(function (k) { return '<th scope="col">' + POS_L[k] + '주</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
      + listH + '</section>';
  }
  function refreshGroup() { if (typeof document === 'undefined' || !G.mem) return; var el = document.getElementById('ncGroupCard'); if (el) el.outerHTML = groupHTML(G.M, G.mem); }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest && ev.target.closest('[data-ncfocus]'); if (!t) return;
      var i = +t.getAttribute('data-ncfocus'); G.focus = G.focus === i ? -1 : i; refreshGroup();
    });
    var st = document.createElement('style');
    st.textContent = '.nc-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}.nc-svg{display:block;width:100%;min-width:440px;height:auto;overflow:visible}'
      + '.nc-nm{font-size:14px;font-weight:800;fill:var(--ink)}.nc-pl{font-size:11px;fill:var(--ink-3)}.nc-ch{font-family:var(--f-display);font-size:28px;font-weight:900}.nc-tg{font-size:11px;font-weight:700;opacity:.9}'
      + '.nc-c{stroke:rgba(0,0,0,.06)}.nc-c.nc-day{stroke:var(--ink);stroke-width:2.4}.nc-none{fill:var(--surface-2)}'
      + '.nc-l{fill:none;stroke-width:2.2}.nc-good{stroke:var(--accent)}.nc-bad{stroke:var(--bad)}.nc-dash{stroke-dasharray:5 4}.nc-lt{font-size:10.5px;font-weight:800;paint-order:stroke;stroke:var(--surface);stroke-width:4px}.nc-goodt{fill:var(--accent)}.nc-badt{fill:var(--bad)}'
      + '.nc-keys{display:flex;flex-wrap:wrap;gap:4px 14px;margin:6px 0}.nc-k{display:inline-block;width:20px;height:0;border-top:3px solid;vertical-align:middle;margin-right:5px}.nc-goodb{border-color:var(--accent);background:var(--accent)}.nc-badb{border-color:var(--bad);background:var(--bad)}.nc-k.nc-goodb,.nc-k.nc-badb{background:none}.nc-kd{border-top-style:dashed}'
      + '.nc-rels{margin:6px 0 0;padding:0;list-style:none;display:grid;gap:3px}.nc-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}'
      + '.nc-el{display:grid;gap:6px;margin:4px 0}.nc-el-r{display:grid;grid-template-columns:72px 1fr;gap:8px;align-items:center}.nc-el-r b{font-size:.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nc-el-b{display:flex;height:22px;border-radius:7px;overflow:hidden;background:var(--surface-2)}.nc-el-b i{font-style:normal;font-size:.74rem;font-weight:800;display:flex;align-items:center;justify-content:center;background:var(--c);color:var(--on);min-width:24px}'
      + '.nc-tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:6px 0}.nc-gt{border-collapse:separate;border-spacing:4px;min-width:340px;width:100%}.nc-gt th{font-size:.78rem;color:var(--ink-3);font-weight:600}.nc-gt tbody th{position:sticky;left:0;z-index:1;background:var(--surface);text-align:left}'
      + '.nc-nb{border:1px solid var(--line);border-radius:999px;background:var(--surface);padding:4px 10px;font-weight:700;cursor:pointer;white-space:nowrap;max-width:7.5em;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}.nc-gt tr.on .nc-nb{border-color:var(--ink-2);background:var(--surface-2)}'
      + '.nc-gc{text-align:center;white-space:nowrap;padding:2px;border-radius:10px}.nc-gc.nc-gday{box-shadow:inset 0 0 0 2px var(--ink)}.nc-gnone{color:var(--ink-3);font-size:.76rem;background:var(--surface-2)}'
      + '.nc-gg{display:inline-block;min-width:1.7em;margin:1px;padding:3px 2px;border-radius:7px;background:var(--c);color:var(--on);font-family:var(--f-display);font-size:1.15rem;font-weight:800;line-height:1.2}.nc-gday .nc-gg{font-weight:900}'
      + '.nc-hl-good{box-shadow:0 0 0 3px var(--accent)}.nc-hl-bad{box-shadow:0 0 0 3px var(--bad)}.nc-hl-both{box-shadow:0 0 0 3px var(--bad),0 0 0 6px var(--accent)}'
      + '.nc-by{display:grid;gap:6px;margin-top:6px}.nc-det{border:1px solid var(--line);border-radius:10px;padding:6px 10px;background:var(--surface)}.nc-det summary{cursor:pointer}.nc-det .nc-rels{margin-top:6px}'
      + '.nc-tgl li{line-height:1.7}.nc-hint{margin:0 0 4px}';
    (document.head || document.documentElement).appendChild(st);
  }

  var api = { VERSION: VERSION, POS: POS, relsBetween: relsBetween, cells: cells, elCount: elCount, toneOf: toneOf, groupMarks: groupMarks, pairHTML: pairHTML, groupHTML: groupHTML, state: G };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MantraNatalCompare = api;
})(typeof window !== 'undefined' ? window : globalThis);
