/* 원국 한눈에 보기 — 신강신약·통근·용신/기신·격국을 한 장에. 2026-11-20
   · 만세력 원국 탭(원국표 바로 아래)과 운명의 타임라인(태어난 순간, 원국표 아래)이 같이 쓴다.
   · 표시 전용: 엔진 값(ch.strength · Manse.analyzeNatalRoot · ch.unified.roles · ch.weights.pct)과 격국 카드(MantraGyeokStructure.analyze)를 그대로 읽는다.
   · 사용: MantraNatalOverview.html(Manse, ch, { esc, term(key,label), link(tab,label) }) · MantraNatalOverview.injectCss() */
(function (G) {
  'use strict';
  var VERSION = 'natal-overview-20261120-1';
  var ZONES = [[0, 20, '극약'], [20, 30, '태약'], [30, 42, '신약'], [42, 58, '중화'], [58, 70, '신강'], [70, 80, '태강'], [80, 100, '극왕']];
  var ORDER = ['용신', '희신', '한신', '구신', '기신'];
  var EL_HJ = ['木', '火', '土', '金', '水'], EL_KO = ['목', '화', '토', '금', '수'];
  var EST = { firm: 'good', weak: 'mid', multi: 'hold', hold: 'hold' }, STAB = { seong: 'good', rescued: 'mid', plain: '', pa: 'bad', hold: 'hold' };
  var esc0 = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var clamp = function (x) { return Math.max(0, Math.min(100, x)); };
  var lvName = function (r) { return r.hasNatalRoot ? (r.natalRootLevel === '통근' ? '보통 통근' : r.natalRootLevel) : '무근'; };

  function data(M, ch) {
    var st = ch.strength, u = ch.unified, dEl = M.stemEl(ch.pillars.day.s), r = null, g = null;
    try { r = M.analyzeNatalRoot(ch); } catch (e) { }
    try { g = G.MantraGyeokStructure ? G.MantraGyeokStructure.analyze(M, ch) : null; } catch (e) { }
    var raw = u ? u.roles : (ch.yong && ch.yong.roles) || {};
    var cells = [0, 1, 2, 3, 4].map(function (e) { var s = String(raw[e] || ''); return { e: e, role: s.replace(/^조건부 /, ''), cond: /^조건부/.test(s) || !!(u && u.conditions && u.conditions[e]) }; })
      .filter(function (c) { return ORDER.indexOf(c.role) >= 0; }).sort(function (a, b) { return ORDER.indexOf(a.role) - ORDER.indexOf(b.role); });
    return { st: st, u: u, dEl: dEl, root: r, gyeok: g, cells: cells, yong: cells.filter(function (c) { return c.role === '용신'; })[0], gi: cells.filter(function (c) { return c.role === '기신'; })[0] };
  }

  function html(M, ch, opt) {
    opt = opt || {}; var E = opt.esc || esc0, T = opt.term || function (k, l) { return E(l || k); }, L = opt.link || function () { return ''; };
    var d; try { d = data(M, ch); } catch (e) { return ''; }
    var st = d.st, r = d.root, u = d.u, pct = ch.weights.pct, help = clamp(st.help), zone = st.zone, day = ch.pillars.day.s;
    var tx = function (e, s) { return '<b class="ov-tx ov-e' + e + '">' + s + '</b>'; };
    var chip = function (cls, s) { return '<span class="ov-chip ' + (cls || '') + '">' + s + '</span>'; };
    var head = function (t, link) { return '<div class="ov-h"><div class="ov-ht">' + t + '</div>' + (link || '') + '</div>'; };
    // 1. 신강신약
    var zoneEasy = /극약|태약/.test(zone) ? '나를 돕는 힘이 많이 부족해요' : zone === '신약' ? '나를 돕는 힘이 조금 부족해요' : zone === '중화' ? '돕는 힘과 쓰는 힘이 균형을 이뤄요' : zone === '신강' ? '나를 돕는 힘이 넉넉해요' : '나를 돕는 힘이 아주 강해요';
    var lamp = function (n, on) { return chip(on ? 'good' : '', T(n) + ' ' + (on ? 'O' : 'X')); };
    var bStr = '<div class="ov-b">' + head(T('신강신약'), L('ohaeng', '오행·강약 ›')) +
      '<div class="ov-big">' + T(zone) + '<small>돕는 힘 ' + st.help.toFixed(1) + '%</small></div>' +
      '<div class="ov-gauge">' + ZONES.map(function (z) { return '<span class="' + (z[2] === zone ? 'on' : z[2] === '중화' ? 'mid' : '') + '" style="flex:' + (z[1] - z[0]) + ' 0 0">' + (z[1] - z[0] >= 10 ? z[2] : '') + '</span>'; }).join('') + '<i style="left:' + help + '%"></i></div>' +
      '<div class="ov-scale"><span>← 약함</span><span>균형</span><span>강함 →</span></div>' +
      '<div class="ov-chips">' + lamp('득령', st.deukryeong) + lamp('득지', st.deukji) + lamp('득세', st.deukse) + '</div><p class="ov-easy">' + zoneEasy + '.</p></div>';
    // 2. 통근
    var bRoot = '';
    if (r) {
      var rc = r.roots.slice().sort(function (a, b) { return b.strength - a.strength; }).slice(0, 4).map(function (x) { return chip(x.strength >= 50 ? 'good' : '', E(M.POS_K[x.pillar]) + '지 ' + E(x.branch) + ' · ' + E(x.hiddenStem) + ' ' + E(x.depthK)); }).join('');
      bRoot = '<div class="ov-b">' + head('일간의 뿌리 · ' + T('통근')) + '<div class="ov-big">' + r.natalRootScore + '<small>/ 100 · ' + E(lvName(r)) + '</small></div>' +
        '<div class="ov-bar"><i style="width:' + clamp(r.natalRootScore) + '%"></i></div>' + (rc ? '<div class="ov-chips">' + rc + '</div>' : '') +
        '<p class="ov-easy">' + (r.hasNatalRoot ? E(M.STEM[day] + EL_KO[d.dEl]) + ' 일간이 지지에 뿌리를 ' + r.roots.length + '곳 내리고 있어요.' : '지지에 같은 기운의 뿌리가 없어 사람·제도 같은 간접 지원이 뿌리 역할을 해요.') + ' 통근은 강약과 별개 지표예요.</p></div>';
    }
    // 3. 용신·기신
    var bYong = '';
    if (d.cells.length) {
      bYong = '<div class="ov-b">' + head(T('용신') + ' · ' + T('기신'), L('yong', '용신 ›')) +
        '<div class="ov-roles">' + d.cells.map(function (c) { var cls = c.role === '용신' || c.role === '희신' ? 'good' : c.role === '기신' || c.role === '구신' ? 'bad' : ''; return '<div class="ov-role ' + cls + '"><span class="r">' + c.role + '</span><span class="el ov-e' + c.e + '">' + EL_HJ[c.e] + '</span><span class="p">' + EL_KO[c.e] + ' ' + pct[c.e].toFixed(0) + '%</span>' + (c.cond && cls === 'bad' ? '<span class="cond">조건부</span>' : '') + '</div>'; }).join('') + '</div>' +
        '<p class="ov-easy">' + [d.yong ? '가장 필요한 기운 ' + tx(d.yong.e, EL_HJ[d.yong.e] + ' ' + EL_KO[d.yong.e]) : '', d.gi ? '가장 부담되는 기운 ' + tx(d.gi.e, EL_HJ[d.gi.e] + ' ' + EL_KO[d.gi.e]) : ''].filter(Boolean).join(' · ') +
        (u ? ' <span class="ov-mu">(' + E(u.primaryName) + (u.secondaryName ? '·' + E(u.secondaryName) : '') + ' 기준 통합 판단)</span>' : '') + '</p></div>';
    }
    // 4. 격국
    var bGy = '', gName = '', g = d.gyeok;
    if (g) {
      var rep = g.rep; gName = rep.name;
      var chips = chip(rep.type === 'special' ? 'good' : EST[rep.establish] || '', E(rep.establishLabel)) +
        (rep.type === 'jeong' ? chip(STAB[rep.stability] || '', '안정성 · ' + E(rep.stabilityLabel)) : rep.type === 'special' ? chip('', '정격 참고 · ' + E(g.jeong.name)) : '') +
        g.major.map(function (o) { return chip(o.pol === 'flow' ? 'good' : 'bad', E(o.name)); }).join('');
      bGy = '<div class="ov-b">' + head(T('격국'), opt.gyeokLink ? L('ohaeng', '격국 분석 ›') : '') + '<div class="ov-big">' + E(rep.name) + (rep.sub ? '<small>' + E(rep.sub) + '</small>' : '') + '</div>' +
        '<div class="ov-chips">' + chips + '</div><p class="ov-easy">' + E(rep.easy) + (g.major.length ? ' 함께 선 구조: ' + g.major.map(function (o) { return E(o.name) + '(' + E(o.txt.short) + ')'; }).join(', ') + '.' : '') + '</p></div>';
    } else if (u && u.gyeok && u.gyeok.kind) { gName = u.gyeok.kind; bGy = '<div class="ov-b">' + head(T('격국')) + '<div class="ov-big">' + E(u.gyeok.kind) + '</div></div>'; }
    var top = [tx(d.dEl, M.STEM[day] + EL_HJ[d.dEl]) + ' 일간', E(zone) + ' ' + st.help.toFixed(0) + '%', r ? E(lvName(r)) + ' ' + r.natalRootScore + '점' : '', d.yong ? '용신 ' + EL_KO[d.yong.e] : '', d.gi ? '기신 ' + EL_KO[d.gi.e] : '', E(gName)].filter(Boolean).join('<span class="sep">·</span>');
    // 5. 계절·월령 세력(2026-11-20, engine season 모델): 월령·왕상휴수사, 출현량 → 최종 세력
    var bSea = '', sea = ch.weights && ch.weights.seasonal;
    if (sea) {
      var WSC = { 왕: 'good', 상: 'good', 수: 'bad', 사: 'bad' };
      var diffs = [0, 1, 2, 3, 4].map(function (e) { return { e: e, d: sea.finalPct[e] - sea.appearance[e] }; }).filter(function (x) { return Math.abs(x.d) >= 3; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); }).slice(0, 3);
      bSea = '<div class="ov-b">' + head('계절·월령으로 본 세력', L('ohaeng', '오행·강약 ›')) + '<div class="ov-big">' + E(sea.command.elK) + '<small>월령 · ' + E(M.BR[ch.pillars.month.b]) + '월</small></div>' +
        '<div class="ov-chips">' + sea.states.map(function (s) { return chip(WSC[s.state] || '', EL_HJ[s.el] + ' ' + T(s.state)); }).join('') + '</div>' +
        '<p class="ov-easy">' + E(sea.command.why) + '. ' + (diffs.length ? '글자 수만 셀 때보다 ' + diffs.map(function (x) { return E(EL_KO[x.e]) + (x.d > 0 ? ' +' : ' ') + Math.round(x.d); }).join(' · ') + '%p로, 계절과 뿌리를 따지면 실제 세력이 달라져요.' : '글자 수로 본 분포와 계절을 따진 세력이 크게 다르지 않아요.') + '</p></div>';
    }
    // 6. 숨은 합(암합, amhap.js) — 있을 때만
    var bAm = '', AM = G.MantraAmhap;
    if (AM && AM.natal) { try { var am = AM.natal(M, ch).filter(function (x) { return x.isValid && x.type === 'branch-hidden-stem'; });
      if (am.length) bAm = '<div class="ov-b">' + head('숨은 합 · 암합') + '<div class="ov-chips">' + am.slice(0, 3).map(function (x) { return chip('', E(x.branchA + x.branchB + ' ' + x.combination)); }).join('') + '</div><p class="ov-easy">' + E(am[0].text.general) + ' <span class="ov-mu">길흉 판정이 아닌 보조 해석이에요.</span></p></div>';
    } catch (e) { } }
    // 7. 돈 버는 방향(element-strategy.js) — 통합 용신 역할을 전략 문장으로
    var bEs = '', ES = G.MantraElementStrategy;
    if (ES && ES.natal) { try { var es = ES.natal(M, ch);
      if (es && es.core) bEs = '<div class="ov-b">' + head('돈 버는 방향 · 오행 전략', L('ohaeng', '돈 버는 방식 ›')) + '<div class="ov-big">' + tx(es.core.el, EL_HJ[es.core.el] + ' ' + EL_KO[es.core.el]) + '<small>' + E(es.core.type) + '</small></div>' +
        (es.expand.length ? '<div class="ov-chips">' + es.expand.map(function (x) { return chip('good', '확장 ' + EL_HJ[x.el] + ' ' + E(x.type)); }).join('') + es.caution.slice(0, 1).map(function (x) { return chip('bad', '주의 ' + EL_HJ[x.el]); }).join('') + '</div>' : '') +
        '<p class="ov-easy">' + E(es.core.text) + '</p></div>';
    } catch (e) { } }
    return '<div class="ov"><p class="ov-top">' + top + '</p><div class="ov-grid">' + bStr + bRoot + bYong + bGy + bSea + bAm + bEs + '</div>' +
      '<p class="ov-note">수치와 판정은 강약·용신·격국 계산을 그대로 옮긴 요약이에요. 통근 점수는 일간 힘의 퍼센트가 아닌 앱 내부의 상대 지표예요.</p></div>';
  }

  // 색은 쓰는 화면의 토큰(--ink·--accent·--good 등)을 따르고, 없으면 기본값
  var CSS = '.ov{display:grid;gap:10px}.ov p{margin:0}.ov-top{font-size:1rem;font-weight:800;line-height:1.6}.ov-top .sep{opacity:.45;font-weight:400;margin:0 6px}'
    + '.ov-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ov-b{border:1px solid var(--line,rgba(127,127,127,.28));border-radius:14px;padding:12px 14px;display:grid;gap:8px;align-content:start;min-width:0}'
    + '.ov-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.ov-ht{font-size:.8rem;font-weight:800;opacity:.75;letter-spacing:.03em}.ov-h .btn-link{border:0;background:none;padding:0;font-size:.74rem;font-weight:700;color:var(--accent,#c39b4a);cursor:pointer}'
    + '.ov-big{font-size:1.45rem;font-weight:800;line-height:1.2}.ov-big small{font-size:.82rem;font-weight:600;opacity:.7;margin-left:6px}'
    + '.ov-gauge{position:relative;display:flex;height:22px;margin-top:8px}.ov-gauge>span{display:grid;place-items:center;font-size:.66rem;opacity:.85;background:rgba(127,127,127,.14);border-right:1px solid rgba(127,127,127,.12)}.ov-gauge>span:first-child{border-radius:6px 0 0 6px}.ov-gauge>span:nth-last-child(2){border-radius:0 6px 6px 0;border-right:0}.ov-gauge>span.mid{background:rgba(127,127,127,.24)}.ov-gauge>span.on{background:var(--accent,#c39b4a);color:#fff;font-weight:800;opacity:1}'
    + '.ov-gauge>i{position:absolute;top:-9px;width:0;height:0;margin-left:-6px;border:6px solid transparent;border-top:8px solid currentColor;border-bottom:0}.ov-scale{display:flex;justify-content:space-between;font-size:.68rem;opacity:.6}'
    + '.ov-chips{display:flex;flex-wrap:wrap;gap:5px}.ov-chip{display:inline-block;font-size:.72rem;font-weight:800;padding:2px 8px;border-radius:999px;background:rgba(127,127,127,.14);white-space:nowrap}.ov-chip.good{background:rgba(31,168,90,.14);color:var(--good,#1f8a52)}.ov-chip.bad{background:rgba(226,85,63,.13);color:var(--bad,#c9412d)}.ov-chip.mid{background:rgba(127,127,200,.16)}.ov-chip.hold{background:rgba(232,170,30,.18);color:#a86a00}'
    + '.ov-bar{height:10px;border-radius:999px;background:rgba(127,127,127,.16);overflow:hidden}.ov-bar>i{display:block;height:100%;border-radius:999px;background:var(--accent,#c39b4a)}'
    + '.ov-roles{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.ov-role{display:grid;gap:3px;justify-items:center;text-align:center;padding:6px 2px;border-radius:10px;background:rgba(127,127,127,.1)}.ov-role .r{font-size:.68rem;font-weight:800;opacity:.8}.ov-role .p{font-size:.66rem;opacity:.65}.ov-role .cond{font-size:.6rem;color:#a86a00;font-weight:700}'
    + '.ov-role .el{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:var(--oc);color:var(--oo);font-weight:800;font-size:1.05rem}.ov-role.good{background:rgba(31,168,90,.12)}.ov-role.good .r{color:var(--good,#1f8a52);opacity:1}.ov-role.bad{background:rgba(226,85,63,.11)}.ov-role.bad .r{color:var(--bad,#c9412d);opacity:1}'
    + '.ov-e0{--oc:var(--wood,#2FA866);--oo:var(--wood-on,#fff)}.ov-e1{--oc:var(--fire,#E8402F);--oo:var(--fire-on,#fff)}.ov-e2{--oc:var(--earth,#F5B921);--oo:var(--earth-on,#2b2b2b)}.ov-e3{--oc:var(--metal,#D9DDE5);--oo:var(--metal-on,#2b2b2b)}.ov-e4{--oc:var(--water,#2B303C);--oo:var(--water-on,#fff)}'
    + '.ov-tx{background:var(--oc);color:var(--oo);font-weight:800;padding:0 .32em;border-radius:6px}.ov-easy{font-size:.84rem;line-height:1.55;opacity:.85}.ov-mu{opacity:.7}.ov-note{font-size:.74rem;opacity:.6;line-height:1.55}'
    + '@media (max-width:640px){.ov-grid{grid-template-columns:1fr}.ov-role .el{width:30px;height:30px;font-size:.95rem}}';
  function injectCss(doc) { try { doc = doc || G.document; if (!doc || doc.getElementById('ov-css')) return; var s = doc.createElement('style'); s.id = 'ov-css'; s.textContent = CSS; doc.head.appendChild(s); } catch (e) { } }

  var api = { version: VERSION, html: html, data: data, CSS: CSS, injectCss: injectCss };
  G.MantraNatalOverview = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
