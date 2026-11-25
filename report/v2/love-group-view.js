/* 인연운 심화 '그 사람과 나의 궁합' 장의 여러 명 보기 화면(2026-11-25) — 그리기 전용
   · 계산은 서버(/api/love-compat a:'group' → functions/_love-compat.js evaluateGroup → compat-group.js)가 하고, 이 파일은 결과를 타임라인 어두운 화면에 맞춰 그린다.
   · 구성은 만세력 궁합 탭 '여러 명'(index.html grResult)과 같다: 요약 → 관계 지도 → 기운 방향 → 무리의 오행 균형 → 이어 주는 사람 → 함께 좋은 시기 → 요령.
   · 오행 색은 타임라인(어두운 화면) 팔레트, 등급 색은 luck-grade.js COLORS.dark 와 같은 값.
   사용: ReportV2.LoveGroupView.html(result, rel, { quota, moreArrows }) · ReportV2.LoveGroupView.css() */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'love-group-view-20261125-1';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var EL_K = ['목', '화', '토', '금', '수'], EL_H = ['木', '火', '土', '金', '水'];
  var EL_C = ['#46C27E', '#F2604F', '#EDBB3A', '#C9CED9', '#6A8FEA'];
  var GC = { good: '#5FDC8F', ok: '#B3BDCF', care: '#FF8A4C' }, GN = { good: '좋음', ok: '무난', care: '조심' };
  var REL = { lover: '연인·부부', work: '직장·동업', friend: '친구', family: '가족' };
  var elN = function (e) { return EL_K[e] + '(' + EL_H[e] + ')'; };

  function pos(n, W, H, rad) { var o = []; for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; o.push([W / 2 + rad * Math.cos(a), H / 2 + rad * Math.sin(a)]); } return o; }
  function nodes(V, P) {
    return V.people.map(function (p, i) {
      var x = P[i][0], y = P[i][1], nm = p.name.length > 5 ? p.name.slice(0, 4) + '…' : p.name, c = EL_C[p.dayEl] || '#999';
      return '<g><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="27" fill="#0D1120"></circle><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="27" fill="' + c + '" fill-opacity=".18" stroke="' + c + '" stroke-width="2"></circle><text x="' + x.toFixed(1) + '" y="' + (y - 2).toFixed(1) + '" class="lg-nn">' + esc(nm) + '</text><text x="' + x.toFixed(1) + '" y="' + (y + 12).toFixed(1) + '" class="lg-ng">' + esc(p.dayGz) + '</text></g>';
    }).join('');
  }
  function mapSvg(V) {
    var W = 340, H = 300, P = pos(V.n, W, H, 108), mark = {};
    V.top.concat(V.low, V.softLow).forEach(function (p) { mark[p.a + '-' + p.b] = 1; });
    var col = { good: GC.good, mid: GC.ok, care: GC.care };
    var edges = V.pairs.slice().sort(function (a, b) { return a.score - b.score; }).map(function (p) {
      var a = P[p.a], b = P[p.b], w = Math.max(1.2, Math.min(7, 1 + (p.score - 45) / 8));
      return '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="' + col[p.band] + '" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round" opacity=".85"' + (p.band === 'care' ? ' stroke-dasharray="6 5"' : '') + '><title>' + esc(V.people[p.a].name + ' · ' + V.people[p.b].name + ' ' + p.score + '점 — ' + p.bandName) + '</title></line>';
    }).join('');
    var labels = V.pairs.filter(function (p) { return mark[p.a + '-' + p.b]; }).map(function (p) {
      var a = P[p.a], b = P[p.b], mx = a[0] + (b[0] - a[0]) * 0.36, my = a[1] + (b[1] - a[1]) * 0.36;   // 가운데(맞은편 쌍끼리 겹침) 대신 36% 지점
      return '<g class="lg-lab"><rect x="' + (mx - 15).toFixed(1) + '" y="' + (my - 9).toFixed(1) + '" width="30" height="18" rx="9" stroke="' + col[p.band] + '"></rect><text x="' + mx.toFixed(1) + '" y="' + (my + 4).toFixed(1) + '">' + p.score + '</text></g>';
    }).join('');
    return '<svg class="lg-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="관계 지도: 선이 굵을수록 잘 맞물리는 사이">' + edges + labels + nodes(V, P) + '</svg>';
  }
  function arrowSvg(V, list) {
    var W = 340, H = 300, P = pos(V.n, W, H, 108), K = { support: 'help', spark: 'help', anchor: 'anchor', pressure: 'press' }, C = { help: GC.good, anchor: '#D5B97F', press: GC.care };
    var paths = list.map(function (a) {
      var p1 = P[a.from], p2 = P[a.to], dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      var sx = p1[0] + ux * 31, sy = p1[1] + uy * 31, ex = p2[0] - ux * 34, ey = p2[1] - uy * 34, cx = (sx + ex) / 2 - uy * 22, cy = (sy + ey) / 2 + ux * 22, k = K[a.kind];
      return '<path d="M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '" fill="none" stroke="' + C[k] + '" stroke-width="2.4"' + (k === 'press' ? ' stroke-dasharray="5 4"' : '') + ' marker-end="url(#lg-m-' + k + ')"><title>' + esc(V.people[a.from].name + ' → ' + V.people[a.to].name + ': ' + a.label) + '</title></path>';
    }).join('');
    var mk = function (k) { return '<marker id="lg-m-' + k + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + C[k] + '"></path></marker>'; };
    return '<svg class="lg-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="기운 방향: 화살표는 누가 누구에게 힘이 되는지"><defs>' + mk('help') + mk('anchor') + mk('press') + '</defs>' + paths + nodes(V, P) + '</svg>';
  }
  var lg = function (color, dash) { return '<i class="lg-lg" style="border-top-color:' + color + (dash ? ';border-top-style:dashed' : '') + '"></i>'; };
  var ul = function (a) { return '<ul>' + a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'; };

  function html(res, rel, opt) {
    opt = opt || {};
    var V = res.views[rel] || res.views.lover, P = V.people, nm = function (i) { return esc(P[i].name); }, band = res.band || { good: 72, care: 58 };
    var chips = P.map(function (p) { return '<span class="lg-chip" style="border-left-color:' + EL_C[p.dayEl] + '"><b>' + esc(p.name) + '</b>' + (p.roleLabel ? '<em>' + esc(p.roleLabel) + '</em>' : '') + '<span>' + esc(p.dayGz) + '</span></span>'; }).join('');
    var relSeg = '<div class="lc-seg" role="group" aria-label="관계">' + Object.keys(REL).map(function (k) { return '<button type="button" data-lc-grel="' + k + '" aria-pressed="' + (rel === k) + '">' + REL[k] + '</button>'; }).join('') + '</div>';
    var hero = '<div class="lc-hero lg-hero"><div class="lg-chips">' + chips + '</div><div class="lc-ring" style="--p:' + V.avg + '"><div><b>' + V.avg + '</b><span>평균</span></div></div>' + ul(V.summary).replace('<ul>', '<ul class="lg-sum">') +
      '<div class="lc-acts"><button type="button" class="btn lc-btn" data-lc="gedit">사람 바꾸기</button>' + relSeg + '</div>' + (opt.quota || '') + '</div>';
    var pc = function (p, side) {
      var line = side === 'good' ? p.help[0] : p.burden[0];
      return '<div class="lc-box lg-pc ' + (p.band === 'good' ? 'good' : p.band === 'care' ? 'bad' : '') + '"><b>' + nm(p.a) + ' · ' + nm(p.b) + ' <span class="lg-sc">' + p.score + '</span></b> <span class="lc-muted">' + esc(p.bandName) + '</span>' + (line ? '<p>' + esc(line) + '</p>' : '') + (p.advice[0] ? '<p class="lc-tip"><b>이렇게 해 보세요</b> ' + esc(p.advice[0]) + '</p>' : '') + '</div>';
    };
    var lows = V.low.length ? V.low : V.softLow;
    var mapCard = '<div class="lc-card"><h3>관계 지도</h3><p class="lc-sub">선이 굵을수록 잘 맞물려요 · ' + esc(V.relLabel) + ' 기준</p><div class="lg-wrap">' + mapSvg(V) +
      '<div class="lg-legend">' + '<span>' + lg(GC.good) + '잘 맞물림(' + band.good + '점 이상)</span><span>' + lg(GC.ok) + '무난</span><span>' + lg(GC.care, 1) + '맞춰 갈 곳이 많음(' + band.care + '점 미만)</span></div></div>' +
      '<h4>잘 맞물리는 두 사람</h4><div class="lc-2">' + V.top.map(function (p) { return pc(p, 'good'); }).join('') + '</div>' +
      (lows.length ? '<h4>' + (V.low.length ? '서로 맞춰 갈 곳이 많은 두 사람' : '조금 더 신경 쓰면 좋은 두 사람') + '</h4><div class="lc-2">' + lows.map(function (p) { return pc(p, 'care'); }).join('') + '</div>' : '') +
      '<details class="lc-fold"><summary>모든 조합 ' + V.pairs.length + '개 점수 보기</summary><ul>' + V.pairs.slice().sort(function (a, b) { return b.score - a.score; }).map(function (p) { return '<li>' + nm(p.a) + ' · ' + nm(p.b) + ' <b>' + p.score + '점</b> <span class="lc-muted">' + esc(p.bandName) + '</span></li>'; }).join('') + '</ul></details></div>';
    var cap = V.n + (res.arrowCap || 2), shown = opt.moreArrows ? V.arrows : V.arrows.slice(0, cap);
    var arrowCard = '<div class="lc-card"><h3>기운 방향</h3><p class="lc-sub">누가 누구를 받쳐 주고, 누구의 기준이 누구에게 무겁게 느껴지는지</p>' +
      (V.arrows.length ? '<div class="lg-wrap">' + arrowSvg(V, shown) + '<div class="lg-legend"><span>' + lg(GC.good) + '받쳐 줌 · 표현을 끌어냄</span><span>' + lg('#D5B97F') + '중심을 잡아 줌</span><span>' + lg(GC.care, 1) + '압박으로 느껴지기 쉬움</span></div></div>' +
        '<ul>' + shown.map(function (a) { return '<li><b>' + nm(a.from) + ' → ' + nm(a.to) + '</b> <span class="lc-muted">' + esc(a.label) + '</span><br>' + esc(a.line) + ' <span class="lc-muted">' + esc(a.tip) + '</span></li>'; }).join('') + '</ul>' +
        (V.arrows.length > cap ? '<button type="button" class="btn lc-btn" data-lc="garrows">' + (opt.moreArrows ? '센 것만 보기' : '나머지 ' + (V.arrows.length - cap) + '개 더 보기') + '</button>' : '')
        : '<p>한쪽이 다른 쪽을 뚜렷하게 받쳐 주거나 누르는 방향은 없어요. 서로 비슷한 무게로 주고받는 무리예요.</p>') +
      '<p class="lc-note">십성(상대 사주가 내게 어떤 역할로 들어오는지)과 그 기운이 내게 필요한지로 판단해요. 화살표는 좋고 나쁨이 아니라 힘이 흐르는 방향이에요.</p></div>';
    var B = V.balance, topEl = function (v) { return v.indexOf(Math.max.apply(null, v)); };
    var balCard = '<div class="lc-card"><h3>무리의 오행 균형</h3><p class="lc-sub">모두의 오행 세력을 평균했어요 · 가운데 점선이 고른 상태(20%)</p><div class="lg-bal">' +
      B.group.map(function (v, e) { return '<div class="lg-bal-r"><span>' + elN(e) + '</span><span class="lg-bar"><i style="width:' + Math.min(100, v / 40 * 100).toFixed(1) + '%;background:' + EL_C[e] + '"></i><em></em></span><b>' + v + '%</b></div>'; }).join('') + '</div>' + ul(B.lines) +
      '<p class="lc-muted">사람마다 가장 많은 기운: ' + P.map(function (p, i) { return esc(p.name) + ' ' + elN(topEl(B.each[i])); }).join(' · ') + '</p></div>';
    var medCard = V.mediators.length ? '<div class="lc-card"><h3>이어 주는 사람</h3><p class="lc-sub">맞춰 갈 곳이 많은 두 사람 모두와 잘 맞는 사람</p><ul>' + V.mediators.map(function (m) { return '<li>' + esc(m.line) + (m.by >= 0 ? ' <span class="lc-muted">(' + nm(m.by) + '–' + nm(m.pair[0]) + ' ' + m.scores[0] + '점 · ' + nm(m.by) + '–' + nm(m.pair[1]) + ' ' + m.scores[1] + '점)</span>' : '') + '</li>'; }).join('') + '</ul></div>' : '';
    var MO = res.months, monCard = '';
    if (MO && MO.rows && MO.rows.length) {
      // 달별 점은 사람 순서(서버 계산 순서)대로 — 관계와 무관해 한 번만 받는다
      monCard = '<div class="lc-card"><h3>함께 좋은 시기</h3><p class="lc-sub">앞으로 12달 · 각자의 월운 흐름을 겹쳐 봤어요</p><div class="lg-months">' + MO.rows.map(function (r, i) {
        var g = MO.good.indexOf(i) >= 0, c = MO.care.indexOf(i) >= 0;
        return '<div class="lg-m' + (g ? ' is-good' : '') + (c ? ' is-care' : '') + '" style="border-top-color:' + EL_C[r.el] + '" title="' + esc(r.year + '년 ' + r.label + ' ' + r.gz + ' · 두드러지는 기운 ' + EL_K[r.el]) + '"><span class="lg-ml">' + esc(r.label) + '</span><b>' + esc(r.gz) + '</b><span class="lg-dots">' +
          r.vals.map(function (v) { return '<i style="background:' + (v.g ? GC[v.g] : 'rgba(255,255,255,.2)') + '" title="' + esc(P[v.i] ? P[v.i].name : '') + ': ' + (v.g ? GN[v.g] : '계산 범위 밖') + '"></i>'; }).join('') + '</span>' + (g ? '<em class="lg-mt" style="color:' + GC.good + '">함께 좋음</em>' : c ? '<em class="lg-mt" style="color:' + GC.care + '">예민</em>' : '') + '</div>';
      }).join('') + '</div><p class="lc-muted">점 순서: ' + P.map(function (p) { return esc(p.name); }).join(' · ') + ' — <i class="lg-dot" style="background:' + GC.good + '"></i>좋음 <i class="lg-dot" style="background:' + GC.ok + '"></i>무난 <i class="lg-dot" style="background:' + GC.care + '"></i>조심 · 칸 위 색은 그 달에 두드러지는 오행</p>' +
        '<h4>함께 움직이기 좋은 달</h4>' + ul(MO.lines.good) + '<h4>서로 예민해지기 쉬운 달</h4>' + ul(MO.lines.care) + '</div>';
    }
    var tips = '<div class="lc-card"><h3>무리를 편하게 하는 요령</h3>' + ul(V.tips) + '</div>';
    return hero + mapCard + arrowCard + balCard + medCard + monCard + tips +
      '<p class="lc-note">여러 명 궁합은 두 사람씩 견준 궁합 점수와 각자의 월운 흐름을 모아 본 참고 지표예요. 누가 좋고 나쁜 사람인지를 정하지 않으며, 같은 무리라도 역할과 대화 방식에 따라 관계는 달라집니다.</p>';
  }

  function css() {
    return '.lg-hero{display:grid;justify-items:center;gap:6px}.lg-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.lg-chip{display:inline-flex;align-items:baseline;gap:5px;border:1px solid rgba(255,255,255,.16);border-left:4px solid;border-radius:99px;padding:4px 10px;font-size:.9rem}.lg-chip em{font-style:normal;font-size:.75rem;color:var(--gold,#D5B97F)}.lg-chip span{font-size:.8rem;color:var(--ink3,#8A8678)}.lg-sum{text-align:left;justify-self:stretch;margin:4px 0;padding-left:1.1em}' +
      '.lg-wrap{display:grid;justify-items:center;gap:6px;margin:8px 0}.lg-svg{width:100%;max-width:400px;height:auto;overflow:visible}.lg-nn{font-size:12px;font-weight:700;text-anchor:middle;fill:var(--ink,#EDE8DC)}.lg-ng{font-size:10px;text-anchor:middle;fill:var(--ink3,#8A8678)}.lg-lab rect{fill:var(--bg2,#0D1120)}.lg-lab text{font-size:11px;font-weight:700;text-anchor:middle;fill:var(--ink,#EDE8DC)}' +
      '.lg-legend{display:flex;flex-wrap:wrap;gap:4px 14px;justify-content:center;font-size:.8rem;color:var(--ink3,#8A8678)}.lg-lg{display:inline-block;width:22px;height:0;border-top:3px solid;vertical-align:middle;margin-right:5px}.lg-pc p{margin:4px 0 0}.lg-sc{color:var(--gold,#D5B97F)}' +
      '.lg-bal{display:grid;gap:6px;margin:8px 0}.lg-bal-r{display:grid;grid-template-columns:62px 1fr 50px;align-items:center;gap:8px;font-size:.88rem}.lg-bar{position:relative;height:12px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden}.lg-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px}.lg-bar em{position:absolute;left:50%;top:-2px;bottom:-2px;border-left:2px dotted rgba(255,255,255,.45)}.lg-bal-r b{text-align:right}' +
      '.lg-months{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:8px 0}.lg-m{border:1px solid rgba(255,255,255,.12);border-top:5px solid;border-radius:10px;padding:6px 3px 8px;display:grid;justify-items:center;gap:2px;background:rgba(255,255,255,.03);min-width:0}.lg-m.is-good{border-color:#5FDC8F;background:rgba(95,220,143,.08)}.lg-m.is-care{border-color:#FF8A4C;background:rgba(255,138,76,.08)}.lg-ml{font-size:.76rem;color:var(--ink3,#8A8678)}.lg-m b{font-size:.95rem;font-family:var(--f-serif,serif)}.lg-dots{display:flex;flex-wrap:wrap;gap:3px;justify-content:center}.lg-dots i,.lg-dot{display:inline-block;width:8px;height:8px;border-radius:50%;vertical-align:middle}.lg-mt{font-style:normal;font-size:.68rem;font-weight:700}' +
      '.lg-pick{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:8px 12px;margin:6px 0}.lg-pick.on{border-color:var(--gold,#D5B97F);background:rgba(213,185,127,.08)}.lg-pick label{display:flex;align-items:center;gap:8px;flex:1 1 200px;min-height:40px;cursor:pointer}.lg-pick label span{font-size:.82rem;color:var(--ink3,#8A8678)}.lg-pick input{width:18px;height:18px;accent-color:var(--gold,#D5B97F)}' +
      '.lg-mode{margin:0 0 12px}' +
      '@media(max-width:560px){.lg-months{grid-template-columns:repeat(4,minmax(0,1fr))}.lg-bal-r{grid-template-columns:54px 1fr 46px}}';
  }

  R.LoveGroupView = { VERSION: VERSION, html: html, css: css };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.LoveGroupView;
})(typeof window !== 'undefined' ? window : globalThis);
