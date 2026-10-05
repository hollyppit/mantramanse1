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
  function row(t, name, value, color, scale, label, sub) {
    var w = Math.max(value > 0 ? 2 : 0, Math.min(100, value / scale * 100)), avg = 20 / scale * 100;
    return '<div style="display:flex;align-items:center;gap:8px;margin:7px 0">' +
      '<div style="flex:0 0 3.1em;font-weight:600">' + esc(name) + (sub ? '<div style="font-weight:400;font-size:10.5px;color:' + t.sub + '">' + esc(sub) + '</div>' : '') + '</div>' +
      '<div style="flex:1 1 0;min-width:0;position:relative;height:14px;border-radius:7px;background:' + t.track + '"><i style="position:absolute;left:0;top:0;bottom:0;width:' + w + '%;border-radius:7px;background:' + color + '"></i>' +
      '<i style="position:absolute;left:' + avg + '%;top:-3px;bottom:-3px;border-left:2px dashed ' + t.line + '"></i></div>' +
      '<div style="flex:0 0 4.6em;text-align:right"><b>' + Math.round(value) + '%</b>' + (label ? '<br>' + badge(t, label) : '') + '</div></div>';
  }
  var legend = function (t) { return '<div style="font-size:11px;color:' + t.sub + ';margin-top:6px"><span style="display:inline-block;width:14px;border-top:2px dashed ' + t.line + ';vertical-align:middle;margin-right:6px"></span>점선 = 균등 분포(20%)</div>'; };

  function elements(sd, t) {
    var v = sd.fiveElements, mx = Math.max(40, Math.max.apply(null, ELK.map(function (e) { return v[e]; }))), sum = [];
    var body = ELK.map(function (e) {
      var lb = v[e] >= HIGH_E ? '과다' : v[e] < LOW_E ? '부족' : '';
      sum.push(e + ' ' + Math.round(v[e]) + '%' + (lb ? '(' + lb + ')' : ''));
      return row(t, e, v[e], t.el[e], mx, lb);
    }).join('');
    return wrap(t, 'FIVE ELEMENTS · 오행 분포', body + legend(t), '오행 분포: ' + sum.join(', '));
  }
  function groups(sd, t) {
    var v = sd.groups, mx = Math.max(40, Math.max.apply(null, GROUPS.map(function (g) { return v[g]; }))), sum = [];
    var body = GROUPS.map(function (g) {
      var lb = v[g] >= HIGH_G ? '과다' : v[g] < ZERO_G ? '거의 없음' : '';
      sum.push(g + ' ' + Math.round(v[g]) + '%' + (lb ? '(' + lb + ')' : ''));
      return row(t, g, v[g], t.el[sd.groupEl[g]] || t.line, mx, lb, sd.groupEl[g]);
    }).join('');
    return wrap(t, 'TEN GODS · 십성군 분포', body + legend(t), '십성군 분포: ' + sum.join(', '));
  }
  function strength(sd, t) {
    var s = sd.strength, bands = ['신약', '중화', '신강'], at = Math.max(0, bands.indexOf(s.band)), pos = at * 33.333 + 16.667;
    var seg = bands.map(function (b, i) { var on = i === at; return '<div style="flex:1;text-align:center;padding:6px 0;font-size:13px;' + (i ? 'border-left:1px solid ' + t.badgeBd + '66;' : '') + 'background:' + (on ? t.badgeBg : 'transparent') + ';color:' + (on ? t.ink : t.sub) + ';font-weight:' + (on ? 700 : 400) + '">' + b + '</div>'; }).join('');
    var gauge = '<div style="position:relative;padding-top:22px"><div style="position:absolute;top:0;left:' + pos + '%;transform:translateX(-50%);text-align:center;font-size:11px;color:' + t.ink + ';white-space:nowrap">' + esc(s.zone) + '<br><span aria-hidden="true" style="color:' + t.line + '">▼</span></div>' +
      '<div style="display:flex;border:1px solid ' + t.badgeBd + ';border-radius:8px;overflow:hidden">' + seg + '</div></div>';
    var chk = [['득령', s.deukryeong, '월지의 도움'], ['득지', s.deukji, '일지의 도움'], ['득세', s.deukse, '주변 기운의 도움']].map(function (x) {
      return '<div style="flex:1 1 0;min-width:0;text-align:center;padding:8px 4px;border:1px solid ' + (x[1] ? t.badgeBd : t.track) + ';border-radius:8px"><div style="font-size:18px;line-height:1.2;color:' + (x[1] ? t.on : t.off) + '" aria-hidden="true">' + (x[1] ? '✓' : '✗') + '</div><b style="font-size:13px">' + x[0] + '</b><div style="font-size:10.5px;color:' + t.sub + '">' + (x[1] ? '있음' : '없음') + ' · ' + x[2] + '</div></div>';
    }).join('');
    return wrap(t, 'STRENGTH · 신강약', gauge + '<div style="display:flex;gap:6px;margin-top:12px">' + chk + '</div>',
      '신강약: ' + (s.zone === s.band ? s.zone : s.zone + '(' + s.band + ')') + '. 득령 ' + (s.deukryeong ? '있음' : '없음') + ', 득지 ' + (s.deukji ? '있음' : '없음') + ', 득세 ' + (s.deukse ? '있음' : '없음'));
  }

  function html(kind, sd, opts) {
    var t = THEME[(opts && opts.theme) === 'light' ? 'light' : 'dark'];
    if (!sd) return '';
    if (kind === 'elements') return elements(sd, t);
    if (kind === 'groups') return groups(sd, t);
    if (kind === 'strength') return strength(sd, t);
    return '';
  }

  R.Charts = { html: html, KINDS: ['elements', 'groups', 'strength'] };
})(typeof window !== 'undefined' ? window : globalThis);
