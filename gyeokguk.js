/* 격국(格局) 판정 — 자평진전식 논격: 월지 지장간 중 천간에 투출한 십성으로 격을 정하고, 격을 돕는 상신(相神)과 격을 깨는 파격 요인·구응(救應)을 본다.
   브라우저·Node 공용. engine.js 를 수정하지 않는 별도 층이며 원국·억부·조후·통관·병약·종격과 흐름 점수에 더해지지 않는다(읽기만 한다).
   · 격 정하기: 월지 지장간 중 천간(년·월·시간)에 같은 글자로 드러난 것을 정기→중기→여기 순으로 취한다. 투출이 없으면 정기를 취한다.
     정기가 비견·겁재(월겁)이면 건록격·양인격이며, 이때는 천간에 드러난 재·관·식상 중 하나로 격의 쓰임을 정한다(없으면 ‘격 불분명’).
   · 성패: 8격마다 상신·파격 요인·구응을 규칙표로 두고, 파격 요인이 구응 없이 남으면 파격, 구응되면 부분, 상신이 있고 파격 요인이 없으면 성격(成格)이다.
   · 시주를 모르면 투출 글자가 빠져 격이 달라질 수 있어 성패를 보류로 바꾼다.
   · 8격과 대표적인 파격 조건만 구현했다. 합·충·형의 세부 작용과 학파별 가감은 단순화했다.
   사용: MantraGyeokguk.analyze(Manse, chart) */
(function (G) {
  'use strict';
  var VERSION = 'gyeokguk-20261103-1';
  var EL = ['목', '화', '토', '금', '수'], GN = ['비겁', '식상', '재성', '관성', '인성'], BR = '子丑寅卯辰巳午未申酉戌亥', POSK = { year: '년', month: '월', day: '일', hour: '시' };
  var GOF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
  var PW = { year: 0.6, month: 1, day: 0.9, hour: 0.7 }, SW = { year: 0.8, month: 1, hour: 0.8 }, HW = { main: 1, mid: 0.55, res: 0.35 };
  var ST = { seong: '성격', part: '부분 성격', pa: '파격', hold: '보류', none: '격 불분명' };
  var cache = new WeakMap();

  // 십성별 힘(0~3): 천간 투출과 지지 통근을 함께 본다
  function power(M, ch) {
    var d = ch.pillars.day.s, per = {}, names = Object.keys(GOF), monthMain = M.tenGod(d, M.mainHidden(ch.pillars.month.b));
    names.forEach(function (t) { per[t] = { vis: 0, hid: 0, at: [] }; });
    ['year', 'month', 'hour'].forEach(function (k) { var p = ch.pillars[k]; if (!p) return; var t = M.tenGod(d, p.s); per[t].vis += SW[k]; per[t].at.push(POSK[k] + '간'); });
    ['year', 'month', 'day', 'hour'].forEach(function (k) { var p = ch.pillars[k]; if (!p) return; var h = M.HIDDEN[p.b]; h.forEach(function (x, i) { var role = i === h.length - 1 ? 'main' : (i === 0 && h.length === 3 ? 'res' : 'mid'); per[M.tenGod(d, x[0])].hid += PW[k] * HW[role]; }); });
    var lvl = {}; names.forEach(function (t) { var p = per[t], touched = p.vis > 0, rooted = p.hid >= 0.5, v = touched && rooted ? 3 : (!touched && monthMain === t) ? 3 : (touched || p.hid >= 0.9) ? 2 : p.hid > 0 ? 1 : 0; if (v > 1 && ch.weights.tgPct[t] < 3) v = 1; lvl[t] = v; p.touched = touched; });
    return { per: per, lvl: lvl };
  }

  function analyze(M, ch) {
    var hit = cache.get(ch); if (hit) return hit;
    var d = ch.pillars.day.s, dEl = M.stemEl(d), mb = ch.pillars.month.b, H = M.HIDDEN[mb], hasHour = ch.hourKnown !== false && !!ch.pillars.hour;
    var P = power(M, ch), L = function (t) { return P.lvl[t]; }, el = function (g) { return (dEl + g) % 5; };
    var gl = function (g) { return Math.max.apply(null, Object.keys(GOF).filter(function (t) { return GOF[t] === g; }).map(L)); };
    var stemAt = {}; ['year', 'month', 'hour'].forEach(function (k) { var p = ch.pillars[k]; if (p) stemAt[k] = p.s; });
    var res = { version: VERSION, hasHour: hasHour, basis: [], factors: [], caveat: [] };
    // ── 격 정하기 ──
    var order = H.map(function (x, i) { return { stem: x[0], idx: i, role: i === H.length - 1 ? '정기' : (i === 0 && H.length === 3 ? '여기' : '중기') }; }).reverse();   // 정기 → 중기 → 여기
    var shown = function (s) { var at = Object.keys(stemAt).filter(function (k) { return stemAt[k] === s; }); return at.map(function (k) { return POSK[k] + '간'; }); };
    var pick = null; order.forEach(function (o) { if (!pick && shown(o.stem).length) pick = Object.assign({ at: shown(o.stem), exposed: true }, o); });
    if (!pick) pick = Object.assign({ at: [], exposed: false }, order[0]);
    var tg = M.tenGod(d, pick.stem), g = GOF[tg];
    res.basis.push('월지 ' + BR[mb] + '의 지장간: ' + H.map(function (x) { return M.STEM[x[0]] + '(' + M.tenGod(d, x[0]) + ')'; }).join(' · '));
    res.basis.push(pick.exposed ? pick.role + ' ' + M.STEM[pick.stem] + '(' + tg + ')이 ' + pick.at.join('·') + '에 투출 → ' + tg + '을 격의 바탕으로 삼음' : '천간에 투출한 지장간이 없어 정기 ' + M.STEM[pick.stem] + '(' + tg + ')을 격의 바탕으로 삼음');
    var kind, key;
    if (g === 0) {   // 월겁: 건록격(비견) · 양인격(겁재)
      var yang = d % 2 === 0, loc = tg === '비견' ? '건록격' : (yang ? '양인격' : '월겁격');
      var cand = ['정관', '편관', '정재', '편재', '식신', '상관'].filter(function (t) { return P.per[t].touched; }).sort(function (a, b) { return L(b) - L(a); })[0];
      kind = loc; key = 'wolgeop'; res.wolgeopUse = cand || null;
      res.basis.push('월지 정기가 ' + tg + '이라 ' + loc + ' 구조이며, 격의 쓰임은 천간에 드러난 재·관·식상으로 봅니다' + (cand ? ' → ' + cand + ' 투출' : ' → 천간에 드러난 재·관·식상 없음'));
    } else { kind = tg + '격'; key = tg; }
    var kindFull = kind;
    // ── 규칙표: 상신 · 파격 요인 · 구응 ──
    var F = []; var add = function (type, text, ok, grp) { F.push({ type: type, text: text, ok: !!ok, grp: grp }); };
    var jaeP = gl(2) >= 2, inP = gl(4) >= 2, gwanP = gl(3) >= 2, sikP = gl(1) >= 2, biP = gl(0) >= 2;
    var chung = (ch.relations || []).some(function (r) { return r.kind === 'branch' && (r.type === '충' || (r.type === '형' && !/자형/.test(r.name || ''))) && r.members && r.members.indexOf('month') >= 0; });
    var sang = [], pa = [];
    if (key === '정관') {
      sang.push(['재성이 관을 낳아 줌(재생관)', jaeP, 2], ['인성이 관을 지켜 줌(관인상생)', inP, 4]);
      pa.push(['상관이 정관을 해침(상관견관)', L('상관') >= 2, 1, ['인성이 상관을 눌러 줌(상관패인)', inP]], ['편관이 섞여 관살혼잡', L('편관') >= 2, 3, ['식신이 편관을 눌러 줌(식신제살)', L('식신') >= 2]], ['월지가 충·형을 받음', chung, 3, null]);
    } else if (key === '편관') {
      sang.push(['식신이 칠살을 제어함(식신제살)', L('식신') >= 2, 1], ['인성이 칠살을 받아 풀어 줌(살인상생)', inP, 4]);
      pa.push(['재성이 칠살을 키우는데 제어가 없음(재자약살)', gl(2) >= 3 && L('식신') < 2, 2, ['인성이 살을 받아 줌', inP]], ['정관이 섞여 관살혼잡', L('정관') >= 2, 3, ['식신이 칠살을 눌러 줌(식신제살)', L('식신') >= 2]], ['편인이 식신을 가로막음(효신탈식)', L('편인') >= 2 && L('식신') >= 2, 4, ['재성이 편인을 눌러 줌(재제효)', jaeP]]);
    } else if (key === '정재' || key === '편재') {
      sang.push(['관성이 재를 받아 줌(재생관)', gwanP, 3], ['식상이 재를 낳아 줌(식상생재)', sikP, 1]);
      pa.push(['비겁이 재를 빼앗음(비겁탈재)', biP, 0, ['관성이 비겁을 눌러 줌', gwanP]], ['월지가 충·형을 받음', chung, 3, null]);
    } else if (key === '식신') {
      sang.push(['재성으로 식신의 기운을 이어 줌(식신생재)', jaeP, 2], ['편관을 식신이 제어함(식신제살)', L('편관') >= 2, 3]);
      pa.push(['편인이 식신을 가로막음(효신탈식)', L('편인') >= 2, 4, ['재성이 편인을 눌러 줌(재제효)', jaeP]]);
    } else if (key === '상관') {
      sang.push(['재성으로 상관의 기운을 이어 줌(상관생재)', jaeP, 2], ['인성이 상관을 다듬어 줌(상관패인)', inP, 4]);
      pa.push(['정관을 상관이 해침(상관견관)', L('정관') >= 2, 3, ['인성이 상관을 눌러 줌(상관패인)', inP]]);
    } else if (key === '정인') {
      sang.push(['관성이 인성을 낳아 줌(관인상생)', gwanP, 3]);
      pa.push(['재성이 인성을 깨뜨림(재파인)', gl(2) >= 3, 2, ['비겁이 재성을 막아 줌', biP]], ['인성이 지나치게 많음(인다)', gl(4) >= 3 && ch.weights.groups[4] >= 35, 4, ['재성이 인성을 눌러 줌', jaeP]]);
    } else if (key === '편인') {
      sang.push(['편관을 편인이 받아 풀어 줌(살인상생)', L('편관') >= 2, 3], ['재성이 편인을 눌러 줌(재제효)', jaeP, 2]);
      pa.push(['식신이 편인에게 막힘(도식)', L('식신') >= 2, 1, ['재성이 편인을 눌러 줌(재제효)', jaeP]]);
    } else {   // 월겁격(건록·양인)
      sang.push(['관성이 월겁을 제어함', gwanP, 3], ['재성으로 월겁의 힘을 쓰게 함', jaeP, 2], ['식상으로 월겁의 기운을 풀어 줌', sikP, 1]);
      pa.push(['쓸 재·관·식상이 천간에 드러나지 않음', !res.wolgeopUse, 3, null]);
      if (kind === '양인격') pa.push(['양인을 제어할 관살이 없음', !gwanP, 3, null]);
    }
    var sangOn = sang.filter(function (s) { return s[1]; }), paOn = pa.filter(function (p) { return p[1]; });
    sang.forEach(function (s) { add('상신', s[0], s[1], s[2]); });
    var rescued = 0, unrescued = 0;
    pa.forEach(function (p) { if (!p[1]) return; var saved = p[3] && p[3][1]; add('파격 요인', p[0], false, p[2]); if (saved) { rescued++; add('구응', p[3][0], true, null); } else unrescued++; });
    res.factors = F.map(function (f) { return { type: f.type, text: f.text, ok: f.ok, group: f.grp == null ? null : GN[f.grp] }; });
    res.kind = kindFull; res.group = GN[g]; res.element = EL[el(g)];
    // ── 상태 ──
    var status = key === 'wolgeop' && !res.wolgeopUse ? 'none' : unrescued ? 'pa' : rescued ? 'part' : sangOn.length ? 'seong' : 'part';
    if (!hasHour) { res.caveat.push('태어난 시간을 몰라 시주의 글자가 빠져 있습니다. 시간에 드러나는 글자가 격을 바꾸거나 성패를 좌우할 수 있어 성패를 확정하지 않고 보류로 표시합니다.'); res.statusRaw = status; status = 'hold'; }
    res.status = status; res.statusLabel = ST[status];
    var sangTxt = sangOn.length ? sangOn.map(function (s) { return s[0]; }).join(', ') : '뚜렷한 상신 없음';
    var paTxt = paOn.length ? paOn.map(function (p) { return p[0] + (p[3] && p[3][1] ? ' → 구응: ' + p[3][0] : ' → 구응 없음'); }).join('; ') : '파격 요인 없음';
    res.headline = kindFull + ' — ' + ST[status];
    res.text = { summary: kindFull + ': ' + (status === 'seong' ? '격을 돕는 상신이 있고 격을 깨는 요인이 없어 성격(成格)으로 읽습니다.' : status === 'part' ? (rescued ? '격을 깨는 요인이 있으나 구응이 있어 크게 깨지지는 않는 부분 성격으로 읽습니다.' : '격을 깨는 요인은 없으나 돕는 상신이 뚜렷하지 않아 부분 성격으로 읽습니다.') : status === 'pa' ? '격을 깨는 요인이 구응 없이 남아 있어 파격으로 읽습니다.' : status === 'hold' ? '시주 확인 전까지 성패를 보류합니다(시주 없이 본 임시 판단: ' + ST[res.statusRaw] + ').' : '격의 쓰임이 되는 글자가 천간에 드러나지 않아 격을 분명히 정하기 어렵습니다.'),
      detail: ['상신: ' + sangTxt, '파격 요인: ' + paTxt] };
    // 학파별 표: 용신=상신(먼저 있는 것), 희신=다음 상신, 기신=파격 요인, 구신=없음
    var onG = sang.filter(function (s) { return s[1]; }).map(function (s) { return s[2]; }), allG = sang.map(function (s) { return s[2]; }), uniq = function (a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); };
    var sg = uniq(onG.concat(allG)), pg = pa.length ? uniq(pa.map(function (p) { return p[2]; })) : [];
    res.table = status === 'none' ? null : { yong: sg[0] != null ? el(sg[0]) : null, hee: sg[1] != null ? el(sg[1]) : null, gi: (paOn.length ? paOn[0][2] : pg[0]) != null ? el(paOn.length ? paOn[0][2] : pg[0]) : null, gu: null };
    cache.set(ch, res); return res;
  }
  G.MantraGyeokguk = { analyze: analyze, VERSION: VERSION };
})(typeof window !== 'undefined' ? window : globalThis);
