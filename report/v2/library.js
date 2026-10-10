/* 천명의 서고 — 사주 네 기둥과 십성을 직접 눌러 해석을 확인하는 인터랙션.
   값(글자·십성·지장간·12운성·신살·십성군 비중)은 모두 엔진/SajuData 에서 읽고, 설명 문장은 기존 풀이 텍스트(LifeDoc GRP·WEAK·PILLAR, StoryComposer.TOPICS.self)를 그대로 쓴다.
   새 해석 문장을 만들지 않는다. 비중이 0인 십성군은 "원국에 드러나지 않음"으로만 표시하고 능력의 부재로 단정하지 않는다.
   R.Library.model(M, ch, sd) → { pillars, groups }   R.Library.html(model, sel, esc) → HTML      검증: node tests/library-sim.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var ORDER = ['hour', 'day', 'month', 'year'], LABEL = { year: '년주', month: '월주', day: '일주', hour: '시주' };
  var GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var LD = function () { return R.LifeDoc || {}; }, SC = function () { return R.StoryComposer || {}; };

  function groupOfTG(M, tg) { var i = M.TG.indexOf(tg); return i < 0 ? null : M.TG_GROUP[Math.floor(i / 2)]; }
  function glyph(M, s, b) {
    return s != null ? { han: M.STEM.charAt(s), kor: M.STEM_K.charAt(s), el: M.EL_K[(s / 2) | 0], elKey: (s / 2) | 0 }
      : { han: M.BR.charAt(b), kor: M.BR_K.charAt(b), el: M.EL_K[M.BR_EL[b]], elKey: M.BR_EL[b] };
  }

  function model(M, ch, sd) {
    var role = LD().PILLAR || {}, pillars = [];
    ORDER.forEach(function (k) {
      var p = ch.pillars[k], c = ch.cells && ch.cells[k];
      if (!p || !c) { pillars.push({ key: k, label: LABEL[k], unknown: true, role: role[k] || '' }); return; }
      var stem = glyph(M, p.s, null), br = glyph(M, null, p.b);
      pillars.push({
        key: k, label: LABEL[k], role: role[k] || '', unknown: false, isDay: k === 'day',
        stem: Object.assign(stem, { tg: c.stemTG, group: k === 'day' ? null : groupOfTG(M, c.stemTG) }),
        branch: Object.assign(br, { tg: c.branchTG, group: groupOfTG(M, c.branchTG) }),
        hidden: (c.hidden || []).map(function (h) { return { kor: M.STEM_K.charAt(h.s), han: M.STEM.charAt(h.s), tg: h.tg, group: groupOfTG(M, h.tg), label: h.label }; }),
        unseong: c.unseong || '', sinsal12: c.sinsal12 || '', gongmang: !!c.gongmang,
        stars: ((ch.sinsal && ch.sinsal[k]) || []).slice(0, 6).map(function (s) { return { name: s.name, good: !!s.good }; }),
      });
    });
    var g = sd && sd.groups ? sd.groups : {}, rank = GROUPS.slice().sort(function (a, b) { return (g[b] || 0) - (g[a] || 0); }), GRP = LD().GRP || {}, WEAK = LD().WEAK || {}, TOP = (SC().TOPICS && SC().TOPICS.self) || {};
    var groups = GROUPS.map(function (k) {
      var where = [];
      pillars.forEach(function (p) {
        if (p.unknown) return;
        if (p.stem.group === k) where.push({ pillar: p.label, part: '천간', han: p.stem.han, tg: p.stem.tg });
        if (p.branch.group === k) where.push({ pillar: p.label, part: '지지', han: p.branch.han, tg: p.branch.tg });
        p.hidden.forEach(function (h) { if (h.group === k) where.push({ pillar: p.label, part: '지장간(' + h.label + ')', han: h.han, tg: h.tg }); });
      });
      var t = TOP[k] || [];
      return { key: k, pct: Math.round(g[k] || 0), rank: rank.indexOf(k) + 1, isTop: rank[0] === k, isLow: rank[rank.length - 1] === k,
        name: (GRP[k] || [])[0] || '', tags: (GRP[k] || [])[1] || '', weak: WEAK[k] || '', where: where,
        head: t[0] || '', real: t[1] || [], examples: Array.isArray(t[2]) ? t[2] : [], pro: typeof t[3] === 'string' ? t[3] : '', trap: typeof t[4] === 'string' ? t[4] : '', action: t[5] || '' };
    });
    return { pillars: pillars, groups: groups, hourKnown: !!ch.hourKnown };
  }

  /** sel: { p: 'day'|… | null, g: '비겁'|… | null } */
  function html(m, sel, esc) {
    sel = sel || {}; var h = '<section class="lb" aria-label="천명의 서고 · 사주 네 기둥과 십성"><h3 class="lb-h">사주 네 기둥</h3><p class="lb-in">기둥이나 십성을 눌러 보세요. 같은 십성이 어느 자리에 있는지 함께 표시됩니다.</p>';
    var hi = sel.g;
    h += '<div class="lb-pl" role="group" aria-label="사주 네 기둥">' + m.pillars.map(function (p) {
      if (p.unknown) return '<div class="lb-p unk"><b>' + E(p.label) + '</b><span class="lb-u">태어난 시간을<br>몰라 비워 둠</span></div>';
      var on = sel.p === p.key, cell = function (x, part) { return '<span class="lb-c el' + x.elKey + (hi && x.group === hi ? ' hit' : '') + '"><i>' + E(x.han) + '</i><small>' + E(x.kor) + '·' + E(x.el) + '</small><em>' + E(p.isDay && part === 'stem' ? '일간(나)' : x.tg) + '</em></span>'; };
      return '<button type="button" class="lb-p' + (on ? ' sel' : '') + '" data-lbp="' + p.key + '" aria-pressed="' + (on ? 'true' : 'false') + '"><b>' + E(p.label) + '</b>' + cell(p.stem, 'stem') + cell(p.branch, 'branch') + '</button>';
    }).join('') + '</div>';
    h += '<h3 class="lb-h">십성 다섯 갈래</h3><div class="lb-gr" role="group" aria-label="십성군">' + m.groups.map(function (g) {
      return '<button type="button" class="lb-g' + (sel.g === g.key ? ' sel' : '') + (g.isTop ? ' top' : '') + '" data-lbg="' + g.key + '" aria-pressed="' + (sel.g === g.key ? 'true' : 'false') + '"><b>' + E(g.key) + '</b><span>' + g.pct + '%</span><u style="height:' + Math.max(4, Math.min(100, g.pct)) + '%"></u></button>';
    }).join('') + '</div><p class="lb-n">막대는 원국에서 해당 십성군이 차지하는 비중(%)입니다. 비중이 낮다는 것이 그 능력의 부재를 뜻하지는 않습니다.</p>';
    if (sel.p) {
      var p = m.pillars.filter(function (x) { return x.key === sel.p; })[0];
      if (p && !p.unknown) {
        h += '<div class="lb-card"><p class="lb-ct">' + E(p.label) + ' · ' + E(p.role) + '</p><h4>' + E(p.stem.han + p.branch.han) + ' <small>' + E(p.stem.kor + p.branch.kor) + '</small></h4><ul>' +
          '<li><b>천간</b> ' + E(p.stem.han + ' ' + p.stem.kor) + ' · ' + E(p.stem.el) + ' · ' + E(p.isDay ? '일간(나 자신)' : p.stem.tg) + '</li>' +
          '<li><b>지지</b> ' + E(p.branch.han + ' ' + p.branch.kor) + ' · ' + E(p.branch.el) + ' · ' + E(p.branch.tg) + '</li>' +
          (p.hidden.length || p.unseong || p.stars.length ? '<li class="lb-more"><details class="lb-d"><summary>지장간 · 12운성 · 신살</summary><ul>' : '') + (p.hidden.length ? '<li><b>지장간</b> ' + p.hidden.map(function (x) { return E(x.han + x.kor + ' ' + x.tg + '(' + x.label + ')'); }).join(' · ') + '</li>' : '') +
          (p.unseong ? '<li><b>12운성</b> ' + E(p.unseong) + (p.sinsal12 ? ' · <b>12신살</b> ' + E(p.sinsal12) : '') + (p.gongmang ? ' · 공망' : '') + '</li>' : '') +
          (p.stars.length ? '<li><b>신살</b> ' + p.stars.map(function (s) { return '<span class="lb-s ' + (s.good ? 'g' : 'n') + '">' + E(s.name) + '</span>'; }).join('') + '</li>' : '') +
          (p.hidden.length || p.unseong || p.stars.length ? '</ul></details></li>' : '') + '</ul><p class="lb-f">신살은 사건을 예언하는 것이 아니라 성향의 결을 보여 줍니다. 자리의 의미는 전통 해석의 일반 기준입니다.</p></div>';
      }
    }
    if (sel.g) {
      var g = m.groups.filter(function (x) { return x.key === sel.g; })[0];
      if (g) {
        h += '<div class="lb-card"><p class="lb-ct">' + E(g.key) + ' · ' + E(g.name) + ' <i>' + E(g.tags) + '</i></p><h4>내 사주의 ' + E(g.key) + ': ' + g.pct + '% <small>' + (g.isTop ? '가장 큰 힘' : g.isLow ? '가장 낮은 비중' : '다섯 중 ' + g.rank + '위') + '</small></h4>';
        h += g.where.length ? '<details class="lb-d"><summary>원국에 드러난 자리 · ' + g.where.length + '곳</summary><ul>' + g.where.map(function (w) { return '<li>' + E(w.pillar + ' ' + w.part) + ' · ' + E(w.han) + ' ' + E(w.tg) + '</li>'; }).join('') + '</ul></details>'
          : '<p class="lb-w">원국의 글자에는 직접 드러나지 않습니다. 운에서 들어올 때 비로소 쓰이는 힘일 수 있습니다.</p>';
        if (g.head) h += '<p class="lb-hd">' + E(g.head) + '</p>';
        if (g.real.length) h += '<details class="lb-d" open><summary>현실에서는</summary><ul>' + g.real.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></details>';
        if (g.examples.length) h += '<details class="lb-d"><summary>이런 장면에서</summary><ul>' + g.examples.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></details>';
        if (g.pro || g.trap) h += '<div class="lb-2"><div><b>잘 쓰이면</b><p>' + E(g.pro) + '</p></div><div><b>조심할 면</b><p>' + E(g.trap) + '</p></div></div>';
        if (g.isLow && g.weak) h += '<p class="lb-f">비중이 가장 낮은 쪽이라 ' + E(g.weak) + '을(를) 의식적으로 살펴볼 수 있습니다.</p>';
        if (g.action) h += '<p class="lb-a"><b>해 볼 것</b> ' + E(g.action) + '</p>';
        h += '</div>';
      }
    }
    return h + '</section>';
  }

  R.Library = { model: model, html: html, GROUPS: GROUPS };
})(typeof window !== 'undefined' ? window : globalThis);
