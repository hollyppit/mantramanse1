// Charts — 이미 계산된 분포(sd)를 그림으로만 옮긴다. 순수 함수(문자열 반환), SVG/CSS만 사용, 계산·추정 없음.
//   ReportV2.Charts.html(kind, sd, opts) → kind: 'elements' | 'groups' | 'strength'    opts.theme: 'dark'(기본, 화면) | 'light'(PDF)
// 색만으로 구분하지 않는다: 모든 막대에 이름·숫자·라벨(과다/부족/거의 없음)을 함께 쓴다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var ELK = ['목', '화', '토', '금', '수'], GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var THEME = {
    dark: { el: { '목': 'var(--wood,#5E9E78)', '화': 'var(--fire,#D0634A)', '토': 'var(--earth,#BC9C62)', '금': 'var(--metal,#AEB9C6)', '수': 'var(--water,#4A7AB5)' },
      ink: 'var(--ink,#EDE8DC)', sub: 'var(--ink2,#BDB8AB)', track: 'rgba(236,231,219,.1)', line: 'var(--gold,#D5B97F)', badgeBg: 'rgba(213,185,127,.14)', badgeInk: 'var(--gold-l,#F0DFB2)', badgeBd: 'var(--gold-d,#9A8250)', on: 'var(--gold-l,#F0DFB2)', off: 'var(--ink3,#8A8678)' },
    light: { el: { '목': '#4F8F6A', '화': '#C0573F', '토': '#B0925A', '금': '#8E9AAA', '수': '#3F6FA8' },
      ink: '#1E2233', sub: '#6B6A63', track: '#E9E2D0', line: '#9A8250', badgeBg: '#F3EEE1', badgeInk: '#6F5B2E', badgeBd: '#B9975B', on: '#1E2233', off: '#9A978A' },
  };
  var HIGH_G = 35, ZERO_G = 5, HIGH_E = 30, LOW_E = 8; // 표시 기준(%) — 그림의 라벨용, 계산 아님

  function badge(t, x) { return '<span style="display:inline-block;margin-top:2px;padding:0 8px;border:1px solid ' + t.badgeBd + ';border-radius:999px;background:' + t.badgeBg + ';color:' + t.badgeInk + ';font-size:11px;line-height:18px;white-space:nowrap">' + esc(x) + '</span>'; }
  function wrap(t, title, body, aria) {
    return '<figure role="img" aria-label="' + esc(aria) + '" style="margin:0;padding:14px 14px 12px;border:1px solid ' + t.badgeBd + '33;border-radius:12px;color:' + t.ink + ';font-size:14px;line-height:1.5;max-width:100%;box-sizing:border-box">' +
      '<figcaption style="font-size:11px;letter-spacing:.2em;color:' + t.sub + ';margin-bottom:10px">' + esc(title) + '</figcaption>' + body + '</figure>';
  }
  // 가로 막대 한 줄: [이름][막대 + 20% 평균 점선][숫자·라벨]. scale = 막대 100% 폭에 해당하는 값
  function row(t, name, value, color, scale, label, sub, fo) {
    var w = Math.max(value > 0 ? 2 : 0, Math.min(100, value / scale * 100)), avg = 20 / scale * 100;
    return '<div style="display:flex;align-items:center;gap:8px;margin:7px 0;' + (fo ? 'background:' + t.badgeBg + ';border-radius:8px;padding:3px 6px;margin-left:-6px;margin-right:-6px' : '') + '">' +
      '<div style="flex:0 0 3.1em;font-weight:600">' + (fo ? '<span aria-hidden="true" style="color:' + t.line + '">★</span>' : '') + esc(name) + (sub ? '<div style="font-weight:400;font-size:10.5px;color:' + t.sub + '">' + esc(sub) + '</div>' : '') + '</div>' +
      '<div style="flex:1 1 0;min-width:0;position:relative;height:14px;border-radius:7px;background:' + t.track + '"><i style="position:absolute;left:0;top:0;bottom:0;width:' + w + '%;border-radius:7px;background:' + color + '"></i>' +
      '<i style="position:absolute;left:' + avg + '%;top:-3px;bottom:-3px;border-left:2px dashed ' + t.line + '"></i></div>' +
      '<div style="flex:0 0 4.6em;text-align:right"><b>' + Math.round(value) + '%</b>' + (label ? '<br>' + badge(t, label) : '') + '</div></div>';
  }
  var foot = function (t, text) { return text ? '<p style="margin:10px 0 0;font-size:12.5px;line-height:1.6;color:' + t.sub + '"><b style="color:' + t.ink + ';font-weight:600">읽는 포인트</b> · ' + esc(text) + '</p>' : ''; };
  var legend = function (t, fo) { return '<div style="font-size:11px;color:' + t.sub + ';margin-top:6px">' + (fo ? '<span aria-hidden="true" style="color:' + t.line + '">★</span> = 이 장과 관련된 값 &nbsp;·&nbsp; ' : '') + '<span style="display:inline-block;width:14px;border-top:2px dashed ' + t.line + ';vertical-align:middle;margin-right:6px"></span>점선 = 균등 분포(20%)</div>'; };
  var legendOld = function (t) { return '<div style="font-size:11px;color:' + t.sub + ';margin-top:6px"><span style="display:inline-block;width:14px;border-top:2px dashed ' + t.line + ';vertical-align:middle;margin-right:6px"></span>점선 = 균등 분포(20%)</div>'; };

  var has = function (a, x) { return (a || []).indexOf(x) >= 0; };
  // 장(챕터)별로 "이 장과 관련된 값"에 별표를 붙인다(해석 규칙이 아니라 보여 줄 위치만 정한다)
  function focusOf(kind, sd, base) {
    if (kind === 'elements') return base === 'c02' ? [sd.dominantEl, sd.weakestEl] : [];
    if (kind === 'groups') return base === 'c04' ? [sd.dominantGroup] : base === 'c05' ? [sd.weakestGroup] : base === 'c08' ? ['재성', '식상'] : base === 'c11' ? ['비겁', '관성'] : [];
    if (kind === 'pillars') return base === 'c13' ? ['year', 'month'] : ['day'];
    return [];
  }
  function elements(sd, t, o) {
    var fo = focusOf('elements', sd, o.chapter), v = sd.fiveElements, mx = Math.max(40, Math.max.apply(null, ELK.map(function (e) { return v[e]; }))), sum = [];
    var body = ELK.map(function (e) {
      var lb = v[e] >= HIGH_E ? '과다' : v[e] < LOW_E ? '부족' : '';
      sum.push(e + ' ' + Math.round(v[e]) + '%' + (lb ? '(' + lb + ')' : ''));
      return row(t, e, v[e], t.el[e], mx, lb, '', has(fo, e));
    }).join('');
    var big = ELK.slice().sort(function (a, b) { return v[b] - v[a]; });
    return wrap(t, 'FIVE ELEMENTS · 오행 분포', body + legend(t, fo.length) + foot(t, '가장 큰 기운은 ' + big[0] + '(' + Math.round(v[big[0]]) + '%), 가장 작은 기운은 ' + big[4] + '(' + Math.round(v[big[4]]) + '%)입니다.'), '오행 분포: ' + sum.join(', '));
  }
  function groups(sd, t, o) {
    var fo = focusOf('groups', sd, o.chapter), v = sd.groups, mx = Math.max(40, Math.max.apply(null, GROUPS.map(function (g) { return v[g]; }))), sum = [];
    var body = GROUPS.map(function (g) {
      var lb = v[g] >= HIGH_G ? '과다' : v[g] < ZERO_G ? '거의 없음' : '';
      sum.push(g + ' ' + Math.round(v[g]) + '%' + (lb ? '(' + lb + ')' : ''));
      return row(t, g, v[g], t.el[sd.groupEl[g]] || t.line, mx, lb, sd.groupEl[g], has(fo, g));
    }).join('');
    return wrap(t, 'TEN GODS · 십성군 분포', body + legend(t, fo.length) + foot(t, '가장 큰 십성군은 ' + sd.dominantGroup + '(' + Math.round(v[sd.dominantGroup]) + '%), 가장 약한 십성군은 ' + sd.weakestGroup + '(' + Math.round(v[sd.weakestGroup]) + '%)입니다.'), '십성군 분포: ' + sum.join(', '));
  }
  function strength(sd, t) {
    var s = sd.strength, bands = ['신약', '중화', '신강'], at = Math.max(0, bands.indexOf(s.band)), pos = at * 33.333 + 16.667;
    var seg = bands.map(function (b, i) { var on = i === at; return '<div style="flex:1;text-align:center;padding:6px 0;font-size:13px;' + (i ? 'border-left:1px solid ' + t.badgeBd + '66;' : '') + 'background:' + (on ? t.badgeBg : 'transparent') + ';color:' + (on ? t.ink : t.sub) + ';font-weight:' + (on ? 700 : 400) + '">' + b + '</div>'; }).join('');
    var gauge = '<div style="position:relative;padding-top:22px"><div style="position:absolute;top:0;left:' + pos + '%;transform:translateX(-50%);text-align:center;font-size:11px;color:' + t.ink + ';white-space:nowrap">' + esc(s.zone) + '<br><span aria-hidden="true" style="color:' + t.line + '">▼</span></div>' +
      '<div style="display:flex;border:1px solid ' + t.badgeBd + ';border-radius:8px;overflow:hidden">' + seg + '</div></div>';
    var chk = [['득령', s.deukryeong, '월지의 도움'], ['득지', s.deukji, '일지의 도움'], ['득세', s.deukse, '주변 기운의 도움']].map(function (x) {
      return '<div style="flex:1 1 0;min-width:0;text-align:center;padding:8px 4px;border:1px solid ' + (x[1] ? t.badgeBd : t.track) + ';border-radius:8px"><div style="font-size:18px;line-height:1.2;color:' + (x[1] ? t.on : t.off) + '" aria-hidden="true">' + (x[1] ? '✓' : '✗') + '</div><b style="font-size:13px">' + x[0] + '</b><div style="font-size:10.5px;color:' + t.sub + '">' + (x[1] ? '있음' : '없음') + ' · ' + x[2] + '</div></div>';
    }).join('');
    var n3 = [s.deukryeong, s.deukji, s.deukse].filter(Boolean).length;
    return wrap(t, 'STRENGTH · 신강약', gauge + '<div style="display:flex;gap:6px;margin-top:12px">' + chk + '</div>' + foot(t, '득령·득지·득세 3가지 중 ' + n3 + '가지를 얻어 \'' + s.zone + '\'으로 읽힙니다.'),
      '신강약: ' + (s.zone === s.band ? s.zone : s.zone + '(' + s.band + ')') + '. 득령 ' + (s.deukryeong ? '있음' : '없음') + ', 득지 ' + (s.deukji ? '있음' : '없음') + ', 득세 ' + (s.deukse ? '있음' : '없음'));
  }

  // 원국 표(네 기둥·십성·12운성). focus 기둥은 별표·배경으로 강조
  function pillars(sd, t, o, spouse) {
    var P = sd.pillars, fo = focusOf('pillars', sd, o.chapter), cols = [['hour', '시주'], ['day', '일주(나)'], ['month', '월주'], ['year', '연주']];
    var td = function (s) { return 'padding:6px 3px;border-bottom:1px solid ' + t.track + ';text-align:center;' + s; };
    var cell = function (k) { var p = P[k], f = has(fo, k); return '<td style="' + td(f ? 'background:' + t.badgeBg : '') + '">' + (p ? '<div style="font-size:22px;line-height:1.2;font-family:serif">' + esc(p.hanja) + '</div><div style="font-size:11px;color:' + t.sub + '">' + esc(p.ko) + '</div>' : '<span style="font-size:11px;color:' + t.sub + '">시간 모름</span>') + '</td>'; };
    var line = function (label, f) { return '<tr><th style="' + td('font-weight:400;font-size:11px;color:' + t.sub + ';text-align:left;white-space:nowrap') + '">' + label + '</th>' + cols.map(function (c) { var p = P[c[0]]; return '<td style="' + td('font-size:12px;' + (has(fo, c[0]) ? 'background:' + t.badgeBg : '')) + '">' + esc(p ? f(p) : '-') + '</td>'; }).join('') + '</tr>'; };
    var head = '<tr><th></th>' + cols.map(function (c) { return '<th style="' + td('font-weight:600;font-size:12px;') + '">' + (has(fo, c[0]) ? '<span aria-hidden="true" style="color:' + t.line + '">★</span>' : '') + c[1] + '</th>'; }).join('') + '</tr>';
    var table = '<table style="width:100%;border-collapse:collapse;table-layout:fixed">' + head + '<tr><th style="' + td('font-weight:400;font-size:11px;color:' + t.sub + ';text-align:left') + '">간지</th>' + cols.map(function (c) { return cell(c[0]); }).join('') + '</tr>' + line('십성', function (p) { return (p.stemTG || '-') + '/' + (p.branchTG || '-'); }) + line('12운성', function (p) { return p.unseong || '-'; }) + '</table>';
    var d = P.day, card = spouse && d ? '<div style="display:flex;gap:8px;margin-bottom:12px"><div style="flex:1;border:1px solid ' + t.badgeBd + ';border-radius:10px;padding:8px 10px;text-align:center"><small style="color:' + t.sub + '">일지(가까운 관계의 자리)</small><div style="font-size:22px;font-family:serif">' + esc(d.hanja[1]) + '<span style="font-size:13px;margin-left:6px">' + esc(d.ko[1]) + '</span></div></div><div style="flex:1;border:1px solid ' + t.badgeBd + ';border-radius:10px;padding:8px 10px;text-align:center"><small style="color:' + t.sub + '">일지 십성 · 12운성</small><div style="font-size:15px;font-weight:600;margin-top:6px">' + esc((d.branchTG || '-') + ' · ' + (d.unseong || '-')) + '</div></div></div>' : '';
    var f1 = fo.map(function (k) { return (cols.filter(function (c) { return c[0] === k; })[0] || [0, ''])[1]; }).join('·');
    return wrap(t, spouse ? 'DAY BRANCH · 배우자 자리' : 'FOUR PILLARS · 사주 원국', card + table + '<div style="font-size:11px;color:' + t.sub + ';margin-top:6px"><span aria-hidden="true" style="color:' + t.line + '">★</span> = 이 장과 관련된 기둥</div>' + foot(t, '나를 뜻하는 일간은 ' + sd.dayMaster.stem + '(' + sd.dayMaster.hanja + ', ' + sd.dayMaster.el + '), 태어난 달의 지지는 ' + (P.month ? P.month.ko[1] : '-') + '입니다' + (f1 ? ' · 이 장은 ' + f1 + '를 중심으로 읽습니다' : '') + '.'), '사주 원국: ' + cols.map(function (c) { var p = P[c[0]]; return c[1] + ' ' + (p ? p.ko : '시간 모름'); }).join(', '));
  }
  // 직업: 엔진이 계산한 상위 분야(점수는 엔진 값 그대로, 막대는 1위 대비 상대 길이)
  function career(sd, t) {
    var top = (sd.career && sd.career.top || []).slice(0, 5); if (!top.length) return '';
    var mx = Math.max.apply(null, top.map(function (c) { return c.score; })) || 1, body = top.map(function (c, i) {
      return '<div style="display:flex;align-items:center;gap:8px;margin:7px 0"><div style="flex:0 0 1.4em;font-weight:600">' + (i + 1) + '</div><div style="flex:0 0 6.2em;font-size:13px;overflow-wrap:anywhere">' + esc(c.name || c.category) + '</div><div style="flex:1 1 0;min-width:0;height:14px;border-radius:7px;background:' + t.track + '"><i style="display:block;height:100%;width:' + Math.max(4, Math.round(c.score / mx * 100)) + '%;border-radius:7px;background:' + t.line + '"></i></div><b style="flex:0 0 2.6em;text-align:right;font-size:12px">' + Math.round(c.score) + '</b></div>';
    }).join('');
    return wrap(t, 'CAREER · 엔진이 계산한 상위 분야', body + '<div style="font-size:11px;color:' + t.sub + '">막대 = 1위 대비 상대 길이 · 숫자 = 엔진 점수</div>' + foot(t, '엔진 상위 분야 1위는 ' + (top[0].name || top[0].category) + '입니다.'), '직업 적성 상위 분야: ' + top.map(function (c, i) { return (i + 1) + '위 ' + (c.name || c.category); }).join(', '));
  }
  // 용신·희신: 다섯 기운이 맡는 역할(엔진 값). 용신이 없으면 그리지 않는다
  function yong(sd, t) {
    var u = sd.usefulElements; if (!u) return '';
    var body = '<div style="display:flex;gap:6px">' + ELK.map(function (e) { var r = u.roles && u.roles[e], main = e === u.yong; return '<div style="flex:1 1 0;min-width:0;text-align:center;padding:8px 2px;border:' + (main ? '2px' : '1px') + ' solid ' + (main ? t.line : t.track) + ';border-radius:10px"><div style="font-weight:700;font-size:16px;color:' + t.el[e] + '">' + e + '</div><div style="font-size:11.5px;color:' + t.ink + ';margin-top:2px">' + esc(main ? '용신 ★' : (e === u.hee ? '희신' : (r || '-'))) + '</div></div>'; }).join('') + '</div>';
    return wrap(t, 'USEFUL ELEMENT · 용신', body + foot(t, '균형을 돕는 용신은 ' + u.yong + (u.hee ? ', 희신은 ' + u.hee : '') + '입니다.'), '용신 ' + u.yong + (u.hee ? ', 희신 ' + u.hee : ''));
  }


  // ── 運路 흐름 차트: 먹이 번지는 능선(대운 10개 · 월운 12개). 계산이 아니라 엔진의 계절 값(season)을 그림으로 옮긴다. ──
  //  높이는 계절 라벨의 "표시 순서"일 뿐 점수가 아니다(수치 축 없음). 숫자 대신 한자·이름·연도 라벨을 함께 쓴다(색·모양만으로 구분하지 않는다).
  var LEVEL = { defense: 1, accumulation: 2, transition: 3, harvest: 4, opportunity: 5, expansion: 6 };
  var SEA_H = { opportunity: ['機', '기회'], expansion: ['展', '확장'], harvest: ['收', '수확'], accumulation: ['蓄', '축적'], transition: ['轉', '전환'], defense: ['防', '방어'] };
  var inkN = 0;
  // 점들을 부드럽게 잇는 Catmull-Rom → 베지어
  function smooth(p) {
    var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += ' C' + (b[0] + (c[0] - a[0]) / 6).toFixed(1) + ' ' + (b[1] + (c[1] - a[1]) / 6).toFixed(1) + ' ' + (c[0] - (e[0] - b[0]) / 6).toFixed(1) + ' ' + (c[1] - (e[1] - b[1]) / 6).toFixed(1) + ' ' + c[0].toFixed(1) + ' ' + c[1].toFixed(1);
    }
    return d;
  }
  // items: [{ label, season, now }], opts: { title, aria, note }
  function ridge(items, t, o) {
    items = (items || []).filter(function (x) { return x && LEVEL[x.season]; }); if (items.length < 3) return '';
    var W = 360, H = 190, L = 22, Rr = 22, base = 118, step = 16, n = items.length, id = 'ink' + (++inkN), anim = t === THEME.dark;
    var xs = function (i) { return L + (W - L - Rr) * i / (n - 1); }, ys = function (s) { return base - LEVEL[s] * step; };
    var pts = items.map(function (x, i) { return [xs(i), ys(x.season)]; });
    var far = items.map(function (x, i) { return [xs(i) + (W - L - Rr) / (n - 1) / 2, base - LEVEL[x.season] * step * 0.55 + 6]; });
    var line = smooth(pts), farLine = smooth(far), area = line + ' L' + pts[n - 1][0].toFixed(1) + ' ' + base + ' L' + pts[0][0].toFixed(1) + ' ' + base + ' Z';
    var nowI = -1; items.forEach(function (x, i) { if (x.now) nowI = i; });
    var defs = '<defs><filter id="' + id + 'b" x="-5%" y="-30%" width="110%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/><feGaussianBlur stdDeviation="1.6"/></filter>' +
      '<filter id="' + id + 'e"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + t.ink + '" stop-opacity=".26"/><stop offset="1" stop-color="' + t.ink + '" stop-opacity="0"/></linearGradient></defs>';
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="presentation" aria-hidden="true" style="display:block;overflow:visible">' + defs +
      '<path d="' + farLine + ' L' + far[n - 1][0].toFixed(1) + ' ' + base + ' L' + far[0][0].toFixed(1) + ' ' + base + ' Z" fill="' + t.ink + '" opacity=".1" filter="url(#' + id + 'b)"/>' +
      '<path class="ink-area" d="' + area + '" fill="url(#' + id + 'g)"/>' +
      '<path class="ink-bleed' + (anim ? ' ink-anim' : '') + '" d="' + line + '" pathLength="1" fill="none" stroke="' + t.ink + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".2" filter="url(#' + id + 'b)"/>' +
      '<path class="ink-line' + (anim ? ' ink-anim' : '') + '" d="' + line + '" pathLength="1" fill="none" stroke="' + t.ink + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" filter="url(#' + id + 'e)"/>';
    if (nowI >= 0) svg += '<line x1="' + pts[nowI][0].toFixed(1) + '" x2="' + pts[nowI][0].toFixed(1) + '" y1="' + (pts[nowI][1] + 4).toFixed(1) + '" y2="' + base + '" stroke="' + t.line + '" stroke-width="1" stroke-dasharray="2 3"/><circle cx="' + pts[nowI][0].toFixed(1) + '" cy="' + pts[nowI][1].toFixed(1) + '" r="4.5" fill="' + t.line + '" stroke="' + t.ink + '" stroke-width="1"/>' +
      '<text x="' + pts[nowI][0].toFixed(1) + '" y="' + (pts[nowI][1] - 10).toFixed(1) + '" text-anchor="middle" font-size="10" fill="' + t.line + '" font-weight="600">지금</text>';
    items.forEach(function (x, i) {
      var h = SEA_H[x.season], cx = xs(i).toFixed(1), cur = i === nowI;
      svg += '<text x="' + cx + '" y="' + (base + 24) + '" text-anchor="middle" font-size="17" font-family="serif" fill="' + (cur ? t.line : t.ink) + '">' + h[0] + '</text>' +
        '<text x="' + cx + '" y="' + (base + 38) + '" text-anchor="middle" font-size="8.5" fill="' + t.sub + '">' + esc(h[1]) + '</text>' +
        '<text x="' + cx + '" y="' + (base + 51) + '" text-anchor="middle" font-size="8" fill="' + t.sub + '" opacity=".8">' + esc(x.label) + '</text>';
    });
    svg += '</svg>';
    var aria = (o.aria || o.title) + ': ' + items.map(function (x) { return x.label + ' ' + SEA_H[x.season][1] + (x.now ? '(지금)' : ''); }).join(', ');
    return wrap(t, o.title, svg + '<div style="font-size:11px;color:' + t.sub + ';margin-top:2px">능선이 높을수록 앞으로 나아가기 좋은 때, 낮을수록 점검하고 쌓아 두는 때에 가깝다(점수가 아니라 계절의 순서).</div>' + foot(t, o.note), aria);
  }
  function flow(sd, t) {
    var cd = sd.currentDaewoon;
    return ridge((sd.daewoon || []).map(function (x) { return { label: String(x.startYear), season: x.season, now: !!(cd && cd.startYear === x.startYear) }; }), t,
      { title: 'DAEWOON · 大運 — 10년마다 달라지는 길', aria: '대운 흐름', note: cd && SEA_H[cd.season] ? '지금은 ' + cd.startYear + '년에 시작된 ' + SEA_H[cd.season][0] + '(' + SEA_H[cd.season][1] + ') 구간에 서 있다.' : '' });
  }
  function months(sd, t) {
    return ridge((sd.monthlyLuck || []).map(function (m, i) { return { label: m.month + '월', season: m.season, now: !!m.isNow || i === 0 }; }), t, { title: 'MONTHLY · 月運 — 앞으로 열두 달', aria: '월운 흐름', note: (sd.monthlyLuck && sd.monthlyLuck[0] && SEA_H[sd.monthlyLuck[0].season]) ? '이번 달은 ' + SEA_H[sd.monthlyLuck[0].season][0] + '(' + SEA_H[sd.monthlyLuck[0].season][1] + ') 쪽에 서 있다.' : '달마다 계절의 결이 조금씩 달라진다.' });
  }

  function html(kind, sd, opts) {
    opts = opts || {}; var t = THEME[opts.theme === 'light' ? 'light' : 'dark'];
    if (!sd) return '';
    if (kind === 'elements') return elements(sd, t, opts);
    if (kind === 'groups') return groups(sd, t, opts);
    if (kind === 'strength') return strength(sd, t);
    if (kind === 'pillars') return pillars(sd, t, opts, false);
    if (kind === 'spouse') return pillars(sd, t, Object.assign({}, opts, { chapter: 'c09' }), true);
    if (kind === 'career') return career(sd, t);
    if (kind === 'yong') return yong(sd, t);
    if (kind === 'flow') return flow(sd, t);
    if (kind === 'months') return months(sd, t);
    return '';
  }

  R.Charts = { html: html, KINDS: ['elements', 'groups', 'strength', 'pillars', 'spouse', 'career', 'yong', 'flow', 'months'] };
})(typeof window !== 'undefined' ? window : globalThis);
