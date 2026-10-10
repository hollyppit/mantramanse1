/* 운명 타임라인(시간의 회랑) — 대운 10개 → 10년(세운) → 12개월(월운)을 직접 골라 탐색한다.
   모든 값은 엔진 계산 결과(StoryDirector 의 lifeMap/yearsOf/monthsOf + Luck6 표시 계층)에서 오며, AI 는 점수를 만들지 않는다.
   R.Timeline.daeun(M,ch,now) / years(M,ch,startYear,now) / months(M,ch,Y,now) → 항목 배열(순수 데이터)
   R.Timeline.html(state, esc) → 화면 HTML                        검증: node tests/timeline-sim.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var D = function () { return R.StoryDirector; }, L = function () { return R.Luck6; };
  var BASIS = '대운·세운·월운은 서로 다른 시간 단위의 영향이며, 원국(타고난 구조)은 세 단위 모두의 바탕입니다.';
  var FIELD_NAME = { money: '재물', career: '직업', love: '애정·인연' };

  function detail(ev, extra) {
    var s = L().of(ev), reasons = (ev.reasons || []).slice(0, 5), triggers = (ev.triggers || []).slice(0, 4);
    return Object.assign({ six: s.label, key: s.key, meaning: s.meaning, rule: s.rule, scores: s.scores, condition: s.condition, reasons: reasons, signals: triggers,
      overlays: ev.flow && ev.flow.overlays ? { volatility: ev.flow.overlays.volatility.active, defense: ev.flow.overlays.defense.active } : null }, extra);
  }
  var ref = function (o, p, level, ctx) { Object.defineProperty(o, '_ref', { value: { p: p, level: level, ctx: ctx || {} }, enumerable: false }); return o; };
  function daeun(M, ch, now) {
    var map = D().lifeMap(M, ch, now);
    return map.map(function (m) {
      if (m.pre) return { pre: true, startYear: m.startYear, endYear: m.endYear, startAge: m.startAge, endAge: m.endAge, label: m.tag, isCurrent: m.isCurrent };
      var ev = ch.daeun.list[m.idx].ev;
      return ref(detail(ev, { pre: false, idx: m.idx, ganzhi: m.ganzhi, startYear: m.startYear, endYear: m.endYear, startAge: m.startAge, endAge: m.endAge, fields: m.fields, isCurrent: m.isCurrent }), ch.daeun.list[m.idx], 'daeun', {});
    });
  }
  function years(M, ch, startYear, now) {
    var to = startYear + 9, evs = M.seunRange(ch, startYear, to), ys = D().yearsOf(M, ch, startYear, to, now);
    return ys.map(function (y, i) { return ref(detail(evs[i].ev, { year: y.year, age: y.age, ganzhi: y.ganzhi, fields: y.fields, isNow: y.isNow }), evs[i], 'seun', { ms: evs[i].midMs }); });
  }
  function months(M, ch, Y, now) {
    var evs = M.wolun(ch, Y), ms = D().monthsOf(M, ch, Y, now);
    return ms.map(function (m, i) { return ref(detail(evs[i].ev, { month: m.month, term: m.term, ganzhi: m.ganzhi, fields: m.fields, isNow: m.isNow }), evs[i], 'wolun', { ms: evs[i].startMs }); });
  }

  /* ── 근거: 원국(바탕) · 대운 · 세운 · 월운의 영향을 나눠서 보여 준다. 값은 모두 엔진(evaluateLuck·evaluateDomainLuck)에서 읽는다. ── */
  var COMP = { eokbu: '억부(강약 균형)', johu: '조후(차고 더움)', relation: '합충·관계', structure: '십성 구조', tonggwan: '통관' };
  var EL = ['목', '화', '토', '금', '수'], LEVEL_KO = { daeun: '대운', seun: '세운', wolun: '월운' };
  function evidence(M, ch, item) {
    var r = item && item._ref; if (!r) return null; var ev = r.p.ev, chain = [], note = '';
    try { var d = M.evaluateDomainLuck(ch, r.p, r.level, r.ctx); chain = d.chain.map(function (c) { return { level: c.level, name: LEVEL_KO[c.level] || c.level, ganzhi: c.ganzhi, weight: Math.round(c.weight * 100) }; }); note = d.chainNote || ''; } catch (e) { chain = [{ level: r.level, name: LEVEL_KO[r.level], ganzhi: item.ganzhi, weight: 100 }]; }
    var W = ev.weights || {}, comps = [['eokbu', ev.eokbuScore], ['johu', ev.johuScore], ['relation', ev.relationScore], ['structure', ev.structureScore], ['tonggwan', ev.tonggwanScore]]
      .filter(function (c) { return c[1] != null && (W[c[0]] || 0) > 0; }).map(function (c) { return { key: c[0], name: COMP[c[0]], score: Math.round(c[1]), weight: Math.round(W[c[0]] * 100), contrib: Math.round(W[c[0]] * c[1] * 10) / 10 }; });
    var y = ch.yong || {}, natal = {
      day: M.gzNameK ? M.gzNameK(ch.pillars.day) : '', zone: ch.strength && ch.strength.zone, help: ch.strength ? Math.round(ch.strength.help) : null,
      yong: y.applicable && y.yong != null ? EL[y.yong] : '', hee: y.applicable && y.hee != null ? EL[y.hee] : '', school: y.school, log: (y.log || []).slice(0, 2),
    };
    return { title: item.ganzhi + ' ' + (LEVEL_KO[r.level] || ''), natal: natal, chain: chain, note: note, own: Math.round(ev.ownFit), fit: Math.round(ev.fitScore), comps: comps, parts: (ev.parts || []).slice(0, 6).map(function (p) { return { label: p.label, v: Math.round(p.v * 10) / 10 }; }),
      relations: (ev.relations || []).slice(0, 8), triggers: (ev.triggers || []).slice(0, 5), six: item.six, rule: item.rule, meaning: item.meaning, scores: item.scores };
  }
  function evidenceHtml(e) {
    if (!e) return '';
    var C = L().CONFIG, h = '<div class="ev"><h3>' + E(e.title) + ' · 근거</h3>';
    h += '<section><h4>① 분류는 이렇게 나왔어요</h4><p><b>' + E(e.six) + '</b> — ' + E(e.meaning) + '</p><p class="ev-s">' + E(e.rule) + '. 기준: 방어기 = 흐름 점수 ' + C.defenseHard.fit + ' 이하이고 작용 강도 ' + C.defenseHard.intensity + ' 이상(또는 ' + C.defenseSoft.fit + ' 이하·' + C.defenseSoft.intensity + ' 이상), 변동기 = 변동성 ' + C.volatility + ' 이상.</p></section>';
    h += '<section><h4>② 어느 운이 얼마나 영향을 줬나</h4><ul class="ev-l"><li><b>원국</b> 모든 운의 바탕 · 일주 ' + E(e.natal.day) + (e.natal.zone ? ' · ' + E(e.natal.zone) + '(돕는 힘 ' + e.natal.help + '%)' : '') + (e.natal.yong ? ' · 용신 ' + E(e.natal.yong) + (e.natal.hee ? '·희신 ' + E(e.natal.hee) : '') : '') + '</li>';
    e.chain.forEach(function (c) { h += '<li><b>' + E(c.name) + '</b> ' + E(c.ganzhi) + ' · 영향 비중 ' + c.weight + '%</li>'; });
    h += '</ul><p class="ev-s">' + (e.chain.length > 1 ? '이 시기 자체 점수 ' + e.own + '가 상위 운과 합쳐져 최종 흐름 점수 ' + e.fit + '이 됩니다.' : '이 시기 자체 점수가 곧 흐름 점수 ' + e.fit + '입니다.') + (e.note ? ' ' + E(e.note) : '') + '</p></section>';
    h += '<section><h4>③ 흐름 점수를 이루는 성분</h4><table class="ev-t"><thead><tr><th>성분</th><th>점수(-100~100)</th><th>반영 비중</th><th>기여</th></tr></thead><tbody>' +
      e.comps.map(function (c) { return '<tr><td>' + E(c.name) + '</td><td>' + c.score + '</td><td>' + c.weight + '%</td><td>' + (c.contrib > 0 ? '+' : '') + c.contrib + '</td></tr>'; }).join('') + '</tbody></table>' +
      (e.parts.length ? '<ul class="ev-l">' + e.parts.map(function (p) { return '<li>' + E(p.label) + ' <i>' + (p.v > 0 ? '+' : '') + p.v + '</i></li>'; }).join('') + '</ul>' : '') + '</section>';
    if (e.relations.length || e.triggers.length) h += '<section><h4>④ 합·충 등 관계</h4><ul class="ev-l">' + e.relations.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + e.triggers.map(function (x) { return '<li>변화 신호 · ' + E(x) + '</li>'; }).join('') + '</ul></section>';
    if (e.natal.log.length) h += '<section><h4>⑤ 원국 기준(용신 판단)</h4><ul class="ev-l">' + e.natal.log.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></section>';
    return h + '<p class="ev-n">이 근거는 명리 규칙에 따른 계산 과정이며, 실제 사건을 예측하거나 보장하지 않습니다.</p></div>';
  }

  /* ── 화면 ── */
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function bar(name, f) {
    if (!f) return '';
    return '<div class="tl-f"><span>' + E(name) + '</span><div class="tl-b" role="img" aria-label="' + E(name + ' ' + f.score + '점, ' + f.band) + '"><i style="width:' + Math.max(2, Math.min(100, f.score)) + '%"></i><u></u></div><b>' + f.score + '<small>' + E(f.band) + '</small></b></div>';
  }
  function card(it, title) {
    var h = '<div class="tl-card k-' + E(it.key) + '"><p class="tl-ct">' + E(title) + '</p><h3>' + E(it.six) + '<small>' + E(it.meaning) + '</small></h3>';
    h += '<p class="tl-rule"><b>이렇게 판정했어요</b> ' + E(it.rule) + '</p>';
    if (it.overlays && (it.overlays.volatility || it.overlays.defense)) h += '<p class="tl-ov">' + (it.overlays.volatility ? '<i>변동 신호</i>' : '') + (it.overlays.defense ? '<i>방어 신호</i>' : '') + '</p>';
    h += '<div class="tl-fs">' + bar(FIELD_NAME.money, it.fields && it.fields.money) + bar(FIELD_NAME.career, it.fields && it.fields.career) + bar(FIELD_NAME.love, it.fields && it.fields.love) + '</div>';
    h += '<p class="tl-sc">흐름 점수 ' + it.scores.fit + ' · 작용 강도 ' + it.scores.intensity + ' · 변동성 ' + it.scores.volatility + (it.condition ? ' · 상태 ' + E(it.condition) : '') + '</p>';
    if (it._ref) h += '<button type="button" class="tl-ev" data-tle="' + it._ref.level + '">자세한 근거 · 원국/대운/세운 구분</button>';
    if (it.reasons && it.reasons.length) h += '<details class="tl-why"><summary>근거 보기</summary><ul>' + it.reasons.map(function (r) { return '<li>' + E(r) + '</li>'; }).join('') + '</ul></details>';
    return h + '</div>';
  }
  function chip(it, attr, top, sub, sel) {
    return '<button type="button" class="tl-c k-' + E(it.key || 'pre') + (sel ? ' sel' : '') + (it.isCurrent || it.isNow ? ' now' : '') + '" ' + attr + ' aria-pressed="' + (sel ? 'true' : 'false') + '"><b>' + E(top) + '</b><span>' + E(sub) + '</span><i>' + E(it.six || '') + '</i></button>';
  }
  /** state: { daeun:[...], years:[...]|null, months:[...]|null, d: idx|null, y: year|null } */
  function html(st, esc) {
    var h = '<section class="tl" aria-label="운명 타임라인"><h3 class="tl-h">운명 타임라인</h3><p class="tl-intro">10년 단위 대운에서 시작해 연도, 월로 들어가며 봅니다. 분류는 계산 결과로 나온 시기의 성격이며, 실제 사건이 일어날 확률이 아닙니다.</p>';
    h += '<div class="tl-row" role="list" aria-label="대운">' + st.daeun.map(function (d, i) {
      if (d.pre) return '<span class="tl-pre">' + E(d.startAge + '~' + d.endAge + '세 · 대운 전') + '</span>';
      return chip(d, 'data-tld="' + d.idx + '"', d.startAge + '~' + d.endAge + '세', d.ganzhi, st.d === d.idx);
    }).join('') + '</div>';
    var cd = st.d != null ? st.daeun.filter(function (d) { return d.idx === st.d; })[0] : null;
    if (cd) {
      h += card(cd, '대운 ' + cd.ganzhi + ' · ' + cd.startYear + '~' + cd.endYear + '년');
      if (st.years) {
        h += '<p class="tl-sub">이 10년 안의 해를 골라 보세요</p><div class="tl-row">' + st.years.map(function (y) { return chip(y, 'data-tly="' + y.year + '"', y.year + '년', y.age + '세 · ' + y.ganzhi, st.y === y.year); }).join('') + '</div>';
      }
    }
    var cy = st.y != null && st.years ? st.years.filter(function (y) { return y.year === st.y; })[0] : null;
    if (cy) {
      h += card(cy, '세운 ' + cy.ganzhi + ' · ' + cy.year + '년');
      if (st.months) h += '<p class="tl-sub">월별로 들어가 보기</p><div class="tl-row tl-m">' + st.months.map(function (m) { return chip(m, 'data-tlm="' + m.month + '"', m.month + '월', m.ganzhi, st.m === m.month); }).join('') + '</div>';
    }
    var cm = st.m != null && st.months ? st.months.filter(function (m) { return m.month === st.m; })[0] : null;
    if (cm) h += card(cm, '월운 ' + cm.ganzhi + ' · ' + st.y + '년 ' + cm.month + '월(' + cm.term + ' 이후)');
    h += '<div class="tl-legend"><b>읽는 법</b><ul>' + L().NAMES.map(function (n) { return '<li><i class="k-' + L().KEY[n] + '"></i><b>' + n + '</b> ' + E(L().MEANING[n]) + '</li>'; }).join('') + '</ul>' +
      '<p>분야 막대는 0~100점이며 55 이상이면 무난, 70 이상이면 해당 분야의 활동·적합 신호가 강한 시기입니다. 점수는 명리 모델 안의 상대적 지표입니다. ' + E(BASIS) + '</p></div></section>';
    return h;
  }

  R.Timeline = { daeun: daeun, years: years, months: months, html: html, evidence: evidence, evidenceHtml: evidenceHtml, BASIS: BASIS };
})(typeof window !== 'undefined' ? window : globalThis);
