/* 병약용신(病藥用神) — 사주의 병(가장 해로운 치우침)을 찾고 그것을 고치는 약(오행)을 정한다. 브라우저·Node 공용.
   · engine.js 를 수정하지 않는 별도 층이다. 원국·억부·조후·통관 계산과 흐름 점수에 어떤 방식으로도 더해지지 않고, 읽기만 한다(원국 불변).
   · 억부와 따로 보여 주는 이유: 억부는 강약 전체의 균형, 병약은 가장 큰 한 가지 치우침(태과·불급)을 고치는 관점이라 같은 방향일 수도, 다를 수도 있다.
   · 병: 태과(어떤 오행이 30% 이상) 또는 불급(일간에게 꼭 필요한 기운이 모자람). 일간의 강약에 따라 해로운 정도가 다르다
       (신약이면 관성·재성·식상 과다가 심하고, 신강이면 비겁·인성 과다가 심하다).
   · 약: 병 오행을 설(洩: 병이 생하는 오행)하거나 제(制: 병을 극하는 오행)하는 오행 중, 일간의 균형에 맞고 원국에 실제로 있으며 그 자신이 병이 아닌 것.
   · 종격(극약·극왕) 가능성이 있는 사주는 병약의 의미가 달라질 수 있어 안내를 붙인다(종격 판정은 jonggyeok.js 가 따로 한다).
   사용: MantraByeongyak.analyze(Manse, chart) */
(function (G) {
  'use strict';
  var VERSION = 'byeongyak-20261103-1';
  var EL = ['목', '화', '토', '금', '수'], GN = ['비겁', '식상', '재성', '관성', '인성'];
  var CFG = { over: 30, supportMin: 25, minHarm: 0.35, minYak: 0.3, present: 10, absent: 3, overloaded: 30 };
  var ZONE = { 극약: 'weak', 태약: 'weak', 신약: 'weak', 중화: 'mid', 신강: 'strong', 태강: 'strong', 극왕: 'strong' };   // engine.js STRENGTH_ZONES 와 같은 이름
  // 일간 강약별로 그 십성 묶음이 과다할 때 얼마나 해로운가(0~1)
  var HARM = { weak: [0.25, 0.8, 0.9, 1, 0.45], strong: [1, 0.3, 0.3, 0.3, 0.9], mid: [0.6, 0.6, 0.6, 0.6, 0.6] };
  // 병 십성 묶음 × 방법(설·제) 의 이름. 설=병이 생하는 오행, 제=병을 극하는 오행
  var LABEL = { 0: { 설: '식상으로 비겁의 기운을 풀어 줌(설기)', 제: '관성으로 비겁을 눌러 줌(관제비겁)' }, 1: { 설: '재성으로 식상의 기운을 이어 줌(식상생재)', 제: '인성으로 식상을 눌러 줌(상관패인)' },
    2: { 설: '관성으로 재성의 기운을 이어 줌(재생관)', 제: '비겁으로 재성을 나눠 감당함(비겁분재)' }, 3: { 설: '인성으로 관살의 기운을 받아 풀어 줌(살인상생)', 제: '식상으로 관살을 눌러 줌(식신제살)' }, 4: { 설: '비겁으로 인성의 기운을 이어 줌', 제: '재성으로 인성을 눌러 줌(재제인)' } };
  var ROLE = { 용신: 1, 희신: 1, 한신: 0, 구신: -1, 기신: -1 };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var cache = new WeakMap();

  function analyze(M, ch) {
    var hit = cache.get(ch); if (hit) return hit;
    var pct = ch.weights.pct, st = ch.strength, side = ZONE[st.zone] || 'mid', dEl = M.stemEl(ch.pillars.day.s);
    var g = function (e) { return ((e - dEl) % 5 + 5) % 5; }, el = function (grp) { return (dEl + grp) % 5; };   // 십성 묶음 ↔ 오행(비겁=일간 오행, 식상=내가 생함, …)
    var eo = ch.yongAll.eokbu, jo = ch.yongAll.johu, jApp = !!(jo && jo.applicable !== false && jo.roles);
    var role = function (sch, e) { var t = sch === 'e' ? eo : jo; return sch === 'j' && !jApp ? null : (t && t.roles && t.roles[e]) || null; };
    // ── 병 후보 ──
    var cands = [];
    for (var e = 0; e < 5; e++) if (pct[e] >= CFG.over) { var sev = 0.4 + 0.6 * clamp((pct[e] - CFG.over) / 20, 0, 1); cands.push({ el: e, kind: '태과', sev: sev, score: sev * HARM[side][g(e)], pct: pct[e] }); }
    var supp = pct[el(0)] + pct[el(4)], leak = pct[el(1)] + pct[el(2)] + pct[el(3)];
    if (side === 'weak' && supp < CFG.supportMin) { var s1 = 0.4 + 0.5 * clamp((CFG.supportMin - supp) / CFG.supportMin, 0, 1); cands.push({ el: el(4), kind: '불급', need: '도움(인성·비겁)', sev: s1, score: s1 * 0.9, pct: supp }); }
    if (side === 'strong' && leak < CFG.supportMin) { var s2 = 0.4 + 0.5 * clamp((CFG.supportMin - leak) / CFG.supportMin, 0, 1); cands.push({ el: el(1), kind: '불급', need: '설기(식상·재성·관성)', sev: s2, score: s2 * 0.9, pct: leak }); }
    cands.sort(function (a, b) { return b.score - a.score; });
    var res = { version: VERSION, side: side, zone: st.zone, help: Math.round(st.help * 10) / 10, caveat: [], candidates: cands.map(function (c) { return { el: EL[c.el], kind: c.kind, score: Math.round(c.score * 100) / 100 }; }) };
    if (side !== 'mid' && (st.zone === '극약' || st.zone === '극왕')) res.caveat.push(st.zone + ' 사주는 억제하지 않고 강한 세력을 따르는 종격·전왕격일 가능성이 있어, 병약 해석이 보통의 경우와 달라질 수 있습니다. 아래 ‘종격·전왕격 판단’을 함께 확인하세요.');
    var top = cands[0];
    if (!top || top.score < CFG.minHarm) {
      res.status = 'none'; res.headline = '뚜렷한 병이 없습니다';
      res.text = { byeong: '특정 오행이 크게 넘치거나 꼭 필요한 기운이 모자라 일간을 해치는 모습이 뚜렷하지 않아, 병약용신을 따로 세우지 않습니다. 이런 사주는 억부·조후 기준으로 균형을 보는 편이 맞습니다.', yak: '', relation: [] };
      res.table = null; cache.set(ch, res); return res;
    }
    var x = top.el, gx = g(x), pname = EL[x] + '(' + GN[gx] + ')';
    // ── 약 후보: 병이 태과면 설·제, 불급이면 보(補) ──
    var yaks = [];
    if (top.kind === '태과') {
      [['설', (x + 1) % 5], ['제', (x + 3) % 5]].forEach(function (m) {
        var c = m[1], gc = g(c), fit = side === 'weak' ? (gc === 0 || gc === 4 ? 0.3 : -0.25) : side === 'strong' ? (gc === 0 || gc === 4 ? -0.25 : 0.3) : 0;
        var base = m[0] === '설' ? (top.pct >= 40 ? 0.5 : 0.4) : (top.pct >= 40 ? 0.35 : 0.5);   // 아주 강한 기운은 극하기보다 풀어 주는(설) 편이 순하다
        var present = pct[c] >= CFG.present ? 0.2 : pct[c] < CFG.absent ? -0.1 : 0, over = pct[c] >= CFG.overloaded ? -0.3 : 0;
        yaks.push({ el: c, method: m[0], label: LABEL[gx][m[0]], score: base + fit + present + over, fit: fit });
      });
    } else {
      [el(4), el(0)].forEach(function (c, i) { if (top.need.indexOf('설기') >= 0) c = [el(1), el(2)][i]; var present = pct[c] >= CFG.present ? 0.2 : pct[c] < CFG.absent ? -0.1 : 0; yaks.push({ el: c, method: '보', label: top.need.indexOf('설기') >= 0 ? (i === 0 ? '식상으로 넘치는 힘을 풀어 줌' : '재성으로 힘을 현실에 쓰게 함') : (i === 0 ? '인성으로 일간을 생해 줌' : '비겁으로 일간을 곁에서 도움'), score: (i === 0 ? 0.55 : 0.4) + present, fit: 0.3 }); });
    }
    yaks.sort(function (a, b) { return b.score - a.score; });
    var good = yaks.filter(function (y) { return y.score >= CFG.minYak; }).slice(0, 2);
    res.status = good.length ? 'ok' : 'noyak';
    res.byeong = { el: EL[x], elIdx: x, group: GN[gx], kind: top.kind, pct: Math.round(top.pct * 10) / 10, severity: Math.round(top.sev * 100) / 100, need: top.need || null };
    res.yak = good.map(function (y) {
      var re = role('e', y.el), rj = role('j', y.el), pc = Math.round(pct[y.el] * 10) / 10;
      var side_ = re && ROLE[re] < 0 ? '약(' + EL[y.el] + ')은 억부 기준으로는 ' + re + '이라, 병을 고치는 대신 일간의 균형에는 부담이 될 수 있습니다(약이 병이 되는 경우)' : (y.fit < 0 ? '약(' + EL[y.el] + ')은 병을 고치지만 ' + (side === 'weak' ? '약한' : '강한') + ' 일간의 균형에는 오히려 힘을 빼거나 보태는 쪽이라 쓰임에 주의가 필요합니다' : null);
      return { el: EL[y.el], elIdx: y.el, group: GN[g(y.el)], method: y.method, label: y.label, pct: pc, present: pct[y.el] >= CFG.present, absent: pct[y.el] < CFG.absent, eokRole: re, johuRole: rj, sideEffect: side_, score: Math.round(y.score * 100) / 100 };
    });
    // ── 문장(사전 제작) ──
    var kindTxt = top.kind === '태과' ? EL[x] + ' 기운(' + GN[gx] + ')이 원국의 ' + res.byeong.pct + '%로 넘칩니다' : '일간을 받쳐 줄 ' + top.need + ' 기운이 원국의 ' + res.byeong.pct + '%뿐이라 모자랍니다';
    var whyHarm = top.kind === '태과' ? (side === 'weak' ? '일간이 약한 사주에서 ' + GN[gx] + '이 넘치면 일간의 힘을 더 빼앗는 쪽이라 가장 큰 병으로 봅니다.' : side === 'strong' ? '일간이 이미 강한 사주에서 ' + GN[gx] + '이 넘치면 쏠림이 더 커지는 쪽이라 가장 큰 병으로 봅니다.' : '일간의 강약은 비슷하지만 한 오행이 크게 넘쳐 균형을 흔드는 가장 큰 병으로 봅니다.') : '이 모자람이 이 사주에서 가장 큰 병으로 읽힙니다.';
    var relation = [];
    if (res.status === 'ok') {
      var y1 = res.yak[0], eokYong = EL[eo.yong];
      var okEok = y1.eokRole === '용신' || y1.eokRole === '희신';
      relation.push(okEok ? '병약의 약(' + y1.el + ')은 억부 기준으로도 ' + y1.eokRole + '이라, 두 관점이 같은 방향을 가리킵니다.' : (y1.eokRole && ROLE[y1.eokRole] < 0 ? '병약의 약(' + y1.el + ')은 억부 기준으로는 ' + y1.eokRole + '입니다. 억부는 강약 전체의 균형, 병약은 가장 큰 한 가지 치우침을 고치는 관점이라 서로 다를 수 있으며, 이 경우 어느 쪽을 앞세울지는 해석자의 판단이 필요합니다.' : '병약의 약(' + y1.el + ')은 억부 기준으로는 ' + (y1.eokRole || '해당 없음') + '이고 억부 용신은 ' + eokYong + '입니다. 두 관점이 완전히 같지는 않습니다.'));
      if (jApp) { var jy = EL[jo.yong]; relation.push(y1.johuRole === '용신' || y1.johuRole === '희신' ? '조후 기준으로도 약(' + y1.el + ')이 ' + y1.johuRole + '이라 계절의 온도·습도에도 맞습니다.' : (y1.johuRole && ROLE[y1.johuRole] < 0 ? '조후 기준으로는 약(' + y1.el + ')이 ' + y1.johuRole + '입니다(조후 용신은 ' + jy + '). 병은 고치지만 계절의 치우침은 키울 수 있습니다.' : '조후 용신은 ' + jy + '이며 약(' + y1.el + ')과는 따로 봅니다.')); }
      if (y1.absent || !y1.present) relation.push('약(' + y1.el + ')이 원국에 거의 없어(' + y1.pct + '%) 평소에는 병을 고치는 힘이 약하고, 운에서 이 오행이 들어올 때 약으로 작용한다고 봅니다.');
      res.yak.forEach(function (y) { if (y.sideEffect) relation.push(y.sideEffect + '.'); });
    }
    res.headline = '병은 ' + pname + ' ' + (top.kind === '태과' ? '과다' : '부족') + (res.yak && res.yak.length ? ', 약은 ' + res.yak.map(function (y) { return y.el + '(' + y.group + ')'; }).join('·') : ', 마땅한 약을 정하기 어렵습니다');
    res.text = { byeong: kindTxt + '. ' + whyHarm, yak: res.status === 'ok' ? res.yak.map(function (y, i) { return (i === 0 ? '약1' : '약2') + ' ' + y.el + '(' + y.group + ') — ' + y.label + '. ' + (y.present ? '원국에 ' + y.pct + '% 있어 바로 쓸 수 있습니다.' : '원국에는 적어 운에서 도움을 받는 쪽입니다.'); }) : ['병을 다스릴 만한 오행이 원국에서 뚜렷하게 보이지 않아 약을 정하지 않습니다.'], relation: relation };
    // 학파별 비교 표용: 용신=약1, 희신=약2, 기신=병(태과일 때), 구신=병을 낳는 오행
    res.table = { yong: res.yak && res.yak[0] ? res.yak[0].elIdx : null, hee: res.yak && res.yak[1] ? res.yak[1].elIdx : null, gi: top.kind === '태과' ? x : null, gu: top.kind === '태과' ? (x + 4) % 5 : null };
    cache.set(ch, res); return res;
  }
  G.MantraByeongyak = { analyze: analyze, VERSION: VERSION, CFG: CFG };
})(typeof window !== 'undefined' ? window : globalThis);
