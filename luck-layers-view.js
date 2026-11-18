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
    var H = M.HIDDEN[b], lab = H.length === 2 ? ['여기', '정기'] : ['여기', '중기', '정기'], same = [], hap = [];
    var cells = H.map(function (h, k) {
      var hs = h[0]; if (nat.indexOf(hs) >= 0) same.push(M.STEM[hs]); if (nat.indexOf((hs + 5) % 10) >= 0) hap.push(M.STEM[hs] + M.STEM[(hs + 5) % 10]);
      return '<i class="lv-el e' + stemEl(hs) + (k === H.length - 1 ? ' m' : '') + '" title="' + E(lab[k] + ' ' + h[1] + '일') + '">' + E(M.STEM[hs]) + '<small>' + lab[k] + '</small></i>';
    }).join('');
    var note = (same.length ? '원국 천간과 같은 글자 ' + same.join('·') : '') + (hap.length ? (same.length ? ' · ' : '') + '원국 천간과 합 ' + hap.join('·') : '');
    return '<p class="lv-hid"><b>지지 ' + E(M.BR[b]) + ' 속 지장간</b> ' + cells + (note ? '<span>' + E(note) + '</span>' : '') + '</p>';
  }

  function sec(n, title, sub, body, open) {
    if (!body) return '';
    return '<details class="lv-sec lv-s' + n + '"' + (open ? ' open' : '') + '><summary><b>' + title + '</b><span>' + sub + '</span></summary><div class="lv-b">' + body + '</div></details>';
  }

  // 한 시기의 분석 칸들(① 외부 환경 ② 내 사주 반응 ③ 상위·하위 운 ④ 영역) — 칸마다 모듈·스위치가 있을 때만
  function parts(M, ch, x, kind, opt) {
    opt = opt || {}; var F = opt.flags || {}, E = opt.esc || esc0, LE = root.MantraLuckEnv, OV = root.MantraLuckOverlay, TG = root.MantraTenGodRoles;
    var L = layersOf(M, ch, x, kind), out = { env: '', tr: '', hier: '', ol: '', tgr: '', dom: '', hid: '' };
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
    if (oc && ex) {
      try {
        var yg = oc.yong;
        out.ol = '<ol class="lv-ol">' + ex.map(function (l) { return '<li class="lv-' + l.tone + '"><b>' + E(l.title) + '</b> ' + E(l.text) + '</li>'; }).join('') + '</ol>' +
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
    return '<div class="lv-erabox"><p class="lv-eras">' + strip + '</p><p class="lv-lead">지금은 ' + E(e.yuan + ' ' + e.period + '운 · ' + e.star) + ' — ' + E(e.elK) + '의 시대 ' + e.start + '~' + e.end + '년 · ' + r.era.yearsIn + '년째</p><p class="lv-sm">' + E(e.reading) + '</p><ol class="lv-ul">' + li.join('') + '</ol><p class="lv-note">' + E(r.note || '시대 흐름은 모두에게 공통인 바깥 환경이고 개인의 용신·운을 대신하지 않아요.') + '</p></div>';
  }

  var CSS = '.lv{margin:10px 0 4px;display:grid;gap:6px}.lv-sec{border:1px solid var(--lv-line,rgba(127,127,127,.28));border-radius:12px;padding:0 12px;background:var(--lv-bg,transparent)}.lv-sec>summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;gap:2px 8px;align-items:baseline;padding:9px 0}.lv-sec>summary::-webkit-details-marker{display:none}.lv-sec>summary b{font-size:.92rem}.lv-sec>summary span{font-size:.74rem;opacity:.65}'
    + '.lv-s1{border-style:dashed;background:rgba(127,127,127,.05)}.lv-b{padding:0 0 10px;font-size:.88rem;line-height:1.6}.lv-b p{margin:6px 0}.lv-lead{font-weight:600}.lv-sm{font-size:.8rem;opacity:.8}.lv-note{font-size:.76rem;opacity:.65}.lv-ul,.lv-ol{margin:6px 0;padding-left:18px}.lv-ul li,.lv-ol li{margin:3px 0}'
    + '.lv-chip{display:inline-block;font-style:normal;font-size:.74rem;padding:1px 8px;border-radius:999px;border:1px solid rgba(127,127,127,.35)}.lv-chip.good{color:#1f7a5c;border-color:#1f7a5c66;background:#1f7a5c14}.lv-chip.bad{color:#b23a2b;border-color:#b23a2b66;background:#b23a2b12}'
    + '.lv-tr{border-left:3px solid rgba(127,127,127,.35);padding-left:9px}.lv-tr.lv-high{border-left-color:#b23a2b}.lv-tr.lv-mid{border-left-color:#c58b2a}.lv-ol li.lv-good{border-left:3px solid #1f7a5c55;padding-left:6px;list-style:none;margin-left:-18px}.lv-ol li.lv-bad{border-left:3px solid #b23a2b55;padding-left:6px;list-style:none;margin-left:-18px}.lv-ol li.lv-mixed,.lv-ol li.lv-flat{border-left:3px solid rgba(127,127,127,.35);padding-left:6px;list-style:none;margin-left:-18px}'
    + '.lv-rows{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.lv-rows em{opacity:.5;font-style:normal}.lv-mxs{display:flex;flex-wrap:wrap;gap:5px}.lv-mx{position:relative;overflow:hidden;z-index:0;font-size:.74rem;padding:2px 8px;border-radius:999px;border:1px solid rgba(127,127,127,.3)}.lv-mx i{position:absolute;inset:0 auto 0 0;z-index:-1;opacity:.35}'
    + '.lv-mx.e0 i,.lv-el.e0,.lv-era.e0{background:#5fae6e}.lv-mx.e1 i,.lv-el.e1,.lv-era.e1{background:#e0705a}.lv-mx.e2 i,.lv-el.e2,.lv-era.e2{background:#d9b25c}.lv-mx.e3 i,.lv-el.e3,.lv-era.e3{background:#b9bec7}.lv-mx.e4 i,.lv-el.e4,.lv-era.e4{background:#5a7fbf}'
    + '.lv-hid{display:flex;flex-wrap:wrap;align-items:center;gap:5px;font-size:.84rem}.lv-hid span{font-size:.76rem;opacity:.7}.lv-el{display:inline-flex;flex-direction:column;align-items:center;font-style:normal;color:#fff;border-radius:8px;padding:2px 7px;line-height:1.15;opacity:.75}.lv-el.m{opacity:1;font-weight:700}.lv-el small{font-size:.6rem}'
    + '.lv-eras{display:flex;gap:5px}.lv-era{flex:1 1 0;min-width:0;text-align:center;border-radius:9px;padding:5px 2px;opacity:.55;color:#222;font-size:.76rem;display:grid}.lv-era.on{opacity:1;outline:2px solid currentColor}.lv-era small{font-size:.6rem}';

  var api = { version: VERSION, layersOf: layersOf, hidden: hidden, parts: parts, card: card, era: era, CSS: CSS, LEVEL_K: LEVEL_K };
  root.MantraLuckView = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
