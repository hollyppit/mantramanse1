/* 만트라 개운 5계(2026-11-28) — 사용자가 정한 개운법 다섯 원칙. 상세풀이·운명의 타임라인 공용, 표시 전용(엔진 계산을 바꾸지 않는다)
 *  · 다섯 원칙은 모두에게 적용된다. 사람마다 다른 것은 '특히 강조할 원칙'뿐이다('조심할 원칙'은 없다 — 사용자 결정).
 *  · 원칙 ↔ 십성 묶음(엔진 groupPull 순서 0 비겁 · 1 식상 · 2 재성 · 3 관성 · 4 인성):
 *      1 마음을 속이지 않기 = 관성 · 2 말의 덕 쌓기(言德) = 식상 · 3 척 지지 않기 = 비겁 · 4 받은 은혜 잊지 않기 = 인성 · 5 남 잘되게 하기 = 재성
 *    다섯이 십성 상생 순환(인→비→식→재→관→인)을 그대로 따른다.
 *  · 강조 두 층
 *      ① 나의 원칙(평생): 통합 용신(ch.unified.yong) 오행의 십성 묶음
 *      ② 지금의 원칙(대운·세운): 그 운에서 가장 크게 들어오는 십성 묶음(groupPull 최대).
 *         바람(흐름 점수, luck-grade.js 3등급)이 순풍·무난이면 그 묶음의 원칙을 붙잡으라고 하고,
 *         역풍(조심)이면 원인에 맞는 처방 원칙을 꺼낸다(명리 처방):
 *           관살 압박 → 인성(살인상생) · 비겁 과다 → 식상(설기) · 인성 과다 → 재성(재극인) · 재성 과다 → 비겁(나눠 지기) · 식상 과다 → 인성(상관패인)
 *         단, 역풍인데 들어오는 기운이 나의 용신·희신 묶음이면 '과다'로 보지 않고 나의 원칙을 다시 붙잡게 한다.
 *  · 문안: 원칙 제목·본문은 사용자 승인 문안(2026-11-28). 고객 화면에는 십성 이름을 쓰지 않는다(GROUP_K 는 상담자용 화면에서만).
 *  브라우저: window.MantraGaewoon · Node: module.exports
 */
(function (root) {
  'use strict';
  var VERSION = 'gaewoon-20261128-1';
  var GROUP_K = ['비겁', '식상', '재성', '관성', '인성'];
  // 원칙 번호 순서대로. g = 십성 묶음
  var P = [
    { no: 1, g: 3, title: '마음을 속이지 않기', tag: '책임과 신뢰',
      body: ['아무도 안 볼 때 지킨 약속이 결국 나를 지켜 줘요. 맡은 일을 끝까지 하고, 손해 보더라도 거짓말 대신 솔직함을 고르세요. 그렇게 쌓인 신뢰가 다음 기회를 데려와요.'] },
    { no: 2, g: 1, title: '말의 덕 쌓기', hanja: '言德', tag: '내보내는 것',
      body: ['내가 내보낸 말과 행동은 언젠가 그대로 돌아와요. 기분 상한 날일수록 한 박자 쉬고 말하고, 재주는 남을 돕는 데 써 보세요.'],
      hard: '일이 자꾸 꼬일 땐 비워 내는 게 먼저예요. 안 쓰는 물건을 정리하고, 알면서도 못 끊던 습관 하나를 내려놓으면 새 기운이 들어올 자리가 생겨요.' },
    { no: 3, g: 0, title: '척 지지 않기', tag: '사람',
      body: ['운은 혼자 오지 않고 사람을 타고 와요. 나를 미워하는 사람이 많은지, 도와주는 사람이 많은지는 결국 내가 어떻게 대했느냐에 달려 있어요. 요즘 자꾸 부딪히는 사람이 있다면 먼저 밥 한 번 사 보세요. 내가 먼저 좋은 동료가 되면, 좋은 사람이 곁에 남아요.'] },
    { no: 4, g: 4, title: '받은 은혜 잊지 않기', tag: '받은 것',
      body: ['부모님, 스승, 나를 이끌어 준 선배, 일할 수 있게 해 준 회사와 사회까지 모두 내가 받은 도움이에요. 고마움을 아는 사람에게 도움은 또 찾아와요.'],
      hard: '일이 잘 안 풀릴수록 윗사람부터 챙겨 보세요. 오랜만에 안부 전화 한 통도 좋아요. 복은 위에서부터 내려와요.' },
    { no: 5, g: 2, title: '남 잘되게 하기', tag: '돈을 대하는 태도',
      body: ['돈은 꽉 쥐면 다툼이 되고, 흐르게 하면 신뢰로 돌아와요. 계산 때문에 인색해지지 마세요. 남을 잘되게 돕는 게 결국 내가 잘되는 가장 빠른 길이에요.'],
      hard: '운이 막힌다 싶을 땐 안 하던 기부나 봉사를 한 번 해 보세요. 막힌 흐름이 풀리는 계기가 되기도 해요.' },
  ];
  var BY_G = {}; P.forEach(function (p) { BY_G[p.g] = p; });
  // 나의 원칙: 왜 이 원칙이 복의 문인지(용신 묶음별)
  var LIFE_WHY = [
    '곁에 좋은 동료가 있을 때 힘이 나는 사주거든요.',
    '말과 재주를 밖으로 펼칠 때 일이 풀리는 사주거든요.',
    '현실 감각을 살려 남과 이익을 나눌 때 길이 열리는 사주거든요.',
    '맡은 자리에서 책임을 다할 때 인정이 따라오는 사주거든요.',
    '이끌어 주는 사람을 만나고 배움을 이어 갈 때 일이 풀리는 사주거든요.',
  ];
  // 순풍·무난: 들어오는 기운
  var KIND = ['사람·동료', '표현·재주', '돈·현실', '자리·책임', '도움·배움'];
  // 역풍: 들어오는 묶음(원인) → 처방 묶음과 문장
  var REMEDY = {
    3: { to: 4, line: '지금은 위에서 누르는 힘이 센 때예요. 맞서기보다 윗사람과 스승을 먼저 챙기세요. 압박이 오히려 나를 키우는 힘으로 바뀌어요.' },
    0: { to: 1, line: '지금은 사람 사이 부딪힘과 경쟁이 많은 때예요. 묵은 것을 내보내고 말을 아끼세요. 넘치는 기운이 빠져야 새 기운이 들어와요.' },
    4: { to: 2, line: '지금은 생각과 걱정이 많아 몸이 무거워지기 쉬운 때예요. 작게라도 움직이고, 남을 도와 보세요. 막힌 흐름이 풀리는 계기가 돼요.' },
    2: { to: 0, line: '지금은 돈과 일이 버겁게 몰리는 때예요. 혼자 다 쥐려 하지 말고 사람과 나눠 지세요. 먼저 좋은 동료가 되면 짐을 함께 질 사람이 생겨요.' },
    1: { to: 4, line: '지금은 말과 행동이 앞서 실수가 나기 쉬운 때예요. 한 박자 쉬고, 받은 도움을 먼저 떠올리세요. 윗사람의 조언이 브레이크가 돼요.' },
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var q = function (p) { return '‘' + p.title + '’'; };

  function dayEl(M, ch) { try { return M.stemEl(ch.pillars.day.s); } catch (e) { return null; } }
  function groupOfEl(dEl, el) { return ((el - dEl) % 5 + 5) % 5; }
  // ① 나의 원칙
  function life(M, ch) {
    var u = ch && ch.unified, dEl = dayEl(M, ch);
    if (!u || !Number.isFinite(u.yong) || dEl == null) return null;
    var g = groupOfEl(dEl, u.yong), hee = Number.isFinite(u.hee) ? groupOfEl(dEl, u.hee) : null;
    return { g: g, hee: hee, p: BY_G[g], line: '당신에게 복이 들어오는 문은 ' + q(BY_G[g]) + '예요. ' + LIFE_WHY[g] };
  }
  // ② 지금의 원칙(x = 대운·세운 항목). label 예: '2026년', '이번 대운(기유)'
  function period(M, ch, x, label) {
    var dEl = dayEl(M, ch); if (!x || dEl == null || !M.groupPull) return null;
    var gp = M.groupPull(dEl, x) || [], top = -1;
    gp.forEach(function (v, i) { if (v > 0 && (top < 0 || v > gp[top])) top = i; });
    if (top < 0) return null;
    var fit = x.ev && Number.isFinite(x.ev.fitScore) ? x.ev.fitScore : null, LG = root.MantraLuckGrade;
    var wind = fit == null ? 'ok' : LG && LG.flow ? LG.flow(fit, M).k : fit >= 18 ? 'good' : fit > -12 ? 'ok' : 'care';
    var L = life(M, ch), mine = L && (top === L.g || top === L.hee);
    var g, line;
    if (wind === 'care' && !mine) { g = REMEDY[top].to; line = label ? REMEDY[top].line.replace(/^지금은 /, label + '은 ') : REMEDY[top].line; }   // '2027년은'·'이번 대운은'(둘 다 받침)
    else if (wind === 'care') { g = L.g; line = '흐름이 거친 때일수록 나의 원칙으로 돌아가세요. ' + q(BY_G[g]) + '를 붙잡으면 버티는 힘이 생겨요.'; }
    else { g = top; line = (label ? label + '엔 ' : '') + KIND[top] + ' 기운이 들어와요. ' + q(BY_G[g]) + '를 붙잡으면 이 흐름을 제대로 탈 수 있어요.'; }
    return { g: g, src: top, wind: wind, fit: fit, p: BY_G[g], line: line };
  }
  function nowItems(M, ch, now) {
    var Y = new Date((now || Date.now()) + 9 * 3600e3).getUTCFullYear(), out = {};
    try { var L = ch.daeun && ch.daeun.list || []; out.daeun = L.filter(function (d) { return d.startYear <= Y && Y < d.startYear + 10; })[0] || null; } catch (e) { out.daeun = null; }
    try { out.seun = M.seunRange(ch, Y, Y)[0] || null; } catch (e) { out.seun = null; }
    out.year = Y; return out;
  }
  // 전체 판단(상세풀이 블록용)
  function build(M, ch, now) {
    if (!M || !ch) return null;
    var L = life(M, ch), N = nowItems(M, ch, now), gzOf = function (x) { try { return x.ganzhi || M.gzNameK(x); } catch (e) { return ''; } };
    var D = N.daeun ? period(M, ch, N.daeun, '이번 대운') : null, S = N.seun ? period(M, ch, N.seun, N.year + '년') : null;
    if (D) D.gz = gzOf(N.daeun); if (S) S.gz = gzOf(N.seun);
    return { version: VERSION, life: L, daeun: D, seun: S, year: N.year };
  }

  // ── 화면 ──
  var CSS = '.gw5 .gw-hi{border-radius:12px;padding:10px 12px;margin:8px 0;background:rgba(213,185,127,.14)}.gw5 .gw-hi p{margin:4px 0;line-height:1.65}' +
    '.gw5 .gw-hi b.k{display:inline-block;font-size:.78rem;padding:1px 8px;border-radius:999px;margin-right:6px;background:rgba(155,59,42,.12)}' +
    '.gw5 .gw-p{border:1px solid var(--line,rgba(0,0,0,.12));border-radius:12px;padding:10px 12px;margin:8px 0}.gw5 .gw-p h4{margin:0 0 4px;font-size:.98rem}' +
    '.gw5 .gw-p h4 small{font-weight:400;opacity:.7;margin-left:6px}.gw5 .gw-p p{margin:4px 0;line-height:1.7}.gw5 .gw-p.is-on{border-color:rgba(155,59,42,.55)}' +
    '.gw5 .gw-badge{display:inline-block;font-size:.74rem;padding:1px 7px;border-radius:999px;margin-left:6px;vertical-align:1px;background:rgba(155,59,42,.12)}' +
    '.gw5 .gw-p.is-hard p.hard{font-weight:600}';
  function html(o, opt) {
    if (!o || !o.life) return '';
    opt = opt || {};
    var on = {}; var mark = function (g, t) { (on[g] = on[g] || []).push(t); };
    mark(o.life.g, '나의 원칙'); if (o.daeun) mark(o.daeun.g, '이번 대운'); if (o.seun) mark(o.seun.g, o.year + '년');
    var hardG = {}; [o.daeun, o.seun].forEach(function (x) { if (x && x.wind === 'care') hardG[x.g] = 1; });
    var hi = '<div class="gw-hi"><p><b class="k">나의 원칙</b>' + esc(o.life.line) + '</p>' +
      (o.daeun ? '<p><b class="k">이번 대운' + (o.daeun.gz ? ' ' + esc(o.daeun.gz) : '') + '</b>' + esc(o.daeun.line) + '</p>' : '') +
      (o.seun ? '<p><b class="k">' + o.year + '년' + (o.seun.gz ? ' ' + esc(o.seun.gz) : '') + '</b>' + esc(o.seun.line) + '</p>' : '') + '</div>';
    var list = P.map(function (p) {
      var badges = (on[p.g] || []).map(function (t) { return '<span class="gw-badge">' + esc(t) + '</span>'; }).join(''), hard = p.hard && hardG[p.g];
      return '<div class="gw-p' + (on[p.g] ? ' is-on' : '') + (hard ? ' is-hard' : '') + '"><h4>' + p.no + '. ' + esc(p.title) + (p.hanja ? ' <small>' + esc(p.hanja) + '</small>' : '') + badges + '</h4>' +
        p.body.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + (p.hard ? '<p class="hard">' + esc(p.hard) + '</p>' : '') + '</div>';
    }).join('');
    return '<style>' + CSS + '</style><section class="dp-embed dp gw5"><div class="cap">만트라 개운 5계</div>' +
      '<p class="lead">운을 바꾸는 다섯 가지 습관이에요. 다섯 모두 누구에게나 통하는 원칙이고, 그중 지금 당신이 특히 붙잡을 원칙에 표시를 해 뒀어요.</p>' + hi + list +
      '<p class="dp-mi">이 원칙은 사주의 기운을 생활 습관으로 옮긴 만트라의 개운법이에요. 운을 대신 바꿔 주는 비법이 아니라, 꾸준히 지킬 때 흐름이 바뀌는 방향이에요.</p></section>';
  }
  // 상세풀이(reading-feature custom:'gw') — H = readingFeature(M·ch·now)
  function block(H) {
    if (!H || !H.M || !H.ch) return null;
    var o = null; try { o = build(H.M, H.ch, H.now || Date.now()); } catch (e) { o = null; }
    return o && o.life ? html(o) : null;
  }
  // 타임라인 '지금 나의 운' 한 줄(선택한 해의 세운) — { title, line }
  function yearLine(M, ch, y) {
    try { var x = M.seunRange(ch, y, y)[0], r = period(M, ch, x, y + '년'); return r ? { no: r.p.no, title: r.p.title, line: r.line, wind: r.wind } : null; } catch (e) { return null; }
  }
  var API = { VERSION: VERSION, P: P, BY_G: BY_G, GROUP_K: GROUP_K, REMEDY: REMEDY, KIND: KIND, LIFE_WHY: LIFE_WHY, groupOfEl: groupOfEl, life: life, period: period, build: build, html: html, block: block, yearLine: yearLine };
  root.MantraGaewoon = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
