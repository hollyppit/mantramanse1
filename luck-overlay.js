/* 운 겹쳐 보기(오행 중첩) — 대운 위에 세운, 그 위에 월운을 쌓았을 때 원국 오행이 어떻게 바뀌는지 계산한다. 2026-11-18
   · 설명용(표시 전용): 엔진(engine.js)의 흐름 점수·그래프·용신 판정을 바꾸지 않는다. 엔진 값을 읽기만 한다(tests/luck-overlay-sim.cjs 가 불변을 검사).
   · 셈법(학파마다 다른 부분이라 '보기 위한 규칙'으로 고정하고 화면에 밝힌다)
       원국   = 엔진 비중 그대로(ch.weights.pct × ch.weights.total, 월지 2배·조후 보정 포함)
       운 한 기둥 = 천간 1점 + 지지 1점(지장간 일수 비율로 나눔) = 2점 — 엔진의 '지장간 비율' 방식과 같은 원리
       층 무게 = 대운 1 · 세운 0.7 · 월운 0.4 (opts.weights 로 바꿀 수 있음, 관리자 조정은 5단계)
       대운의 '천간 앞 5년·지지 뒤 5년'은 여기서 나누지 않는다(10년 전체의 바탕으로 본다)
   · 함께 계산하는 것: 층마다 더해진 오행 점수, 쌓일 때마다 바뀌는 오행 비율, 용신·희신·기신 비율 변화,
       층과 아래층(원국 포함)의 오행 관계(같음·생·극), 운 기둥끼리와 운↔원국의 합·충·형·파·해·원진(엔진 relationsAmong)
   · 일진(2026-11-18 추가): 대운 → 세운 → 월운 → 일진 네 층. 일진 무게 0.2, 풀이는 하루 단위로 가볍게.
   · 브라우저·Node 공용. 사용: MantraLuckOverlay.compute(Manse, ch, [{ level:'daeun', s, b }, { level:'seun', s, b }, { level:'wolun', s, b }, { level:'ilun', s, b }]) */
(function (G) {
  'use strict';
  var VERSION = 'luck-overlay-20261118-2';
  var LEVELS = ['daeun', 'seun', 'wolun', 'ilun'], LEVEL_K = { daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
  var DEFAULT_W = { daeun: 1, seun: 0.7, wolun: 0.4, ilun: 0.2 };   // 일진(하루)은 가장 가볍게(2026-11-18 추가)
  var mod5 = function (x) { return ((x % 5) + 5) % 5; };
  var zero = function () { return [0, 0, 0, 0, 0]; };
  var round1 = function (v) { return Math.round(v * 10) / 10; };

  // 운 기둥 하나의 오행 점수(가중 전): 천간 1 + 지지 지장간 일수 비율 1
  function pillarVec(M, s, b) {
    var v = zero(); v[M.stemEl(s)] += 1;
    var H = M.HIDDEN[b], days = H.reduce(function (a, h) { return a + h[1]; }, 0);
    H.forEach(function (h) { v[M.stemEl(h[0])] += h[1] / days; });
    return v;
  }
  // 두 오행 사이 관계: a(위층)가 b(아래층)에게
  function elRel(a, b) {
    if (a === b) return 'same';
    if (mod5(a + 1) === b) return 'gives';     // a 가 b 를 생함
    if (mod5(b + 1) === a) return 'gets';      // b 가 a 를 생함(아래층이 위층을 받쳐 줌)
    if (mod5(a + 2) === b) return 'hits';      // a 가 b 를 극함
    return 'hit';                              // b 가 a 를 극함
  }
  var REL_K = { same: '같은 오행', gives: '생해 줌', gets: '생을 받음', hits: '누름', hit: '눌림' };

  // ── 운의 합화(2026-11-18): 엔진 원국 합화 규칙(combinationEffects)을 운에 맞춰 옮겼다 ──
  //   후보: 이번 층이 끼는 천간합·육합·삼합·방합(반합은 엔진처럼 합화로 치지 않음)
  //   조건: 월령 지원(결과 오행 = 원국 월지 본기이거나 월지가 생함, 월운이 쌓였으면 그 월운 지지도 인정) · 육합은 결과 오행이 천간(원국·운)에 드러남
  //         · 참여 글자에 충 없음 · 같은 글자를 두고 다른 오행 합과 겹치지 않음 · 더 큰 같은 오행 합에 포함되지 않음
  //   옮기는 양: 두 글자 합 25% · 세 글자 합 50% × 그 운의 층 무게(운 쪽 글자) / 원국 쪽 글자는 같은 몫 × 이번 층 무게. 일간(원국 일주 천간)은 옮기지 않는다(엔진과 같음)
  //   운이 운을 만나 생긴 합도 같은 규칙. 같은 글자는 한 번만 옮긴다. 엔진 점수·원국 비중은 바꾸지 않고 겹친 뒤 비율에만 쓴다.
  var HWA_TYPES = { '천간합': 1, '육합': 1, '삼합': 1, '방합': 1 };
  function hwaOf(M, ch, natalItems, luckItems, me, wMap, done) {
    var all = natalItems.concat(luckItems), rels = M.relationsAmong ? M.relationsAmong(all) : [];
    var cands = rels.filter(function (r) { return HWA_TYPES[r.type] && r.el != null && r.members.indexOf(me.id) >= 0; });
    if (!cands.length) return [];
    var byId = {}; all.forEach(function (it) { byId[it.id] = it; });
    var monthEl = M.stemEl(M.mainHidden(ch.pillars.month.b)), wol = luckItems.filter(function (x) { return x.id === 'wolun'; })[0], wolEl = wol ? M.stemEl(M.mainHidden(wol.b)) : null;
    var stemsEl = all.map(function (it) { return M.stemEl(it.s); });
    var allC = rels.filter(function (r) { return HWA_TYPES[r.type] && r.el != null; });
    return cands.map(function (r) {
      var why = [];
      var sup = function (e) { return e != null && (e === r.el || mod5(e + 1) === r.el); };
      if (!sup(monthEl) && !sup(wolEl)) why.push('월령의 같은 오행·상생 지원 없음');
      if (r.type === '육합' && stemsEl.indexOf(r.el) < 0) why.push('결과 오행이 천간에 드러나지 않음');
      if (rels.some(function (x) { return x.kind === r.kind && /충/.test(x.type) && x.members.some(function (k) { return r.members.indexOf(k) >= 0; }); })) why.push('참여 글자에 충이 함께 있음');
      if (allC.some(function (x) { return x !== r && x.kind === r.kind && x.el !== r.el && x.members.some(function (k) { return r.members.indexOf(k) >= 0; }); })) why.push('다른 오행의 합과 겹침');
      if (allC.some(function (x) { return x !== r && x.kind === r.kind && x.el === r.el && x.members.length > r.members.length && r.members.every(function (k) { return x.members.indexOf(k) >= 0; }); })) why.push('더 큰 같은 오행 합에 포함');
      var share = r.members.length >= 3 ? 0.5 : 0.25, moved = zero(), parts = [];
      if (!why.length) r.members.forEach(function (id) {
        var it = byId[id]; if (!it) return;
        var natal = !wMap[id], key = r.kind + ':' + id; if (done[key]) return;
        if (natal && r.kind === 'stem' && id === 'day') return;   // 일간은 옮기지 않는다
        var w = natal ? wMap[me.id] : wMap[id], amt = share * w * (natal && r.kind === 'branch' && id === 'month' ? 2 : 1);
        if (r.kind === 'stem') { var e = M.stemEl(it.s); if (e !== r.el) { moved[e] -= amt; moved[r.el] += amt; } }
        else { var H = M.HIDDEN[it.b], days = H.reduce(function (a, h) { return a + h[1]; }, 0); H.forEach(function (h) { var e2 = M.stemEl(h[0]), a2 = amt * h[1] / days; if (e2 !== r.el) { moved[e2] -= a2; moved[r.el] += a2; } }); }
        done[key] = 1; parts.push(id);
      });
      return { type: r.type, name: r.name, kind: r.kind, el: r.el, members: r.members.slice(), ok: !why.length, why: why.length ? why : ['월령 지원·충 없음·겹침 없음 조건 성립'], share: share, moved: moved.map(function (x) { return Math.round(x * 1000) / 1000; }), parts: parts };
    });
  }

  function pctOf(pts) { var t = pts.reduce(function (a, x) { return a + x; }, 0) || 1; return pts.map(function (x) { return x / t * 100; }); }

  function compute(M, ch, layers, opts) {
    opts = opts || {};
    var W = Object.assign({}, DEFAULT_W, opts.weights || {});
    var natalPct = ch.weights.pct.slice(), total = ch.weights.total || 9;
    var natalPts = natalPct.map(function (p) { return p / 100 * total; });
    var u = ch.unified || {}, roles = [0, 1, 2, 3, 4].map(function (e) { return (u.roles && u.roles[e]) || ''; });
    var yong = roles.indexOf('용신'), dEl = M.stemEl(ch.pillars.day.s);
    var P = ch.pillars, natalItems = ['year', 'month', 'day', 'hour'].filter(function (k) { return P[k]; }).map(function (k) { return { id: k, s: P[k].s, b: P[k].b }; });
    var list = (layers || []).filter(function (L) { return L && LEVELS.indexOf(L.level) >= 0 && L.s != null && L.b != null; })
      .sort(function (a, b) { return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level); });
    var acc = natalPts.slice(), steps = [], out = [], hwaDone = {}, wMap = {};
    list.forEach(function (L, i) {
      var w = W[L.level], vec = pillarVec(M, L.s, L.b), add = vec.map(function (x) { return x * w; });
      add.forEach(function (x, e) { acc[e] += x; });
      wMap[L.level] = w;
      var hwa = opts.noHwa ? [] : hwaOf(M, ch, natalItems, out.map(function (o) { return { id: o.level, s: o.s, b: o.b }; }).concat([{ id: L.level, s: L.s, b: L.b }]), { id: L.level }, wMap, hwaDone);
      var hwaNet = zero(); hwa.forEach(function (h) { if (h.ok) h.moved.forEach(function (x, e) { hwaNet[e] += x; }); });
      hwaNet.forEach(function (x, e) { acc[e] = Math.max(0, acc[e] + x); });
      var pct = pctOf(acc), prev = steps.length ? steps[steps.length - 1].pct : natalPct;
      var se = M.stemEl(L.s), be = M.stemEl(M.mainHidden(L.b));
      // 아래층과의 오행 관계(바로 아래 운 층, 없으면 원국 일간)
      var below = out.length ? out[out.length - 1] : null;
      var relBelow = below ? { to: below.level, stem: elRel(se, below.stemEl), branch: elRel(be, below.branchEl) } : { to: 'natal', stem: elRel(se, dEl), branch: elRel(be, dEl) };
      // 운 기둥끼리(아래층들과) · 원국과의 합충형해
      var me = { id: L.level, s: L.s, b: L.b };
      var withLuck = M.relationsAmong ? M.relationsAmong(out.map(function (o) { return { id: o.level, s: o.s, b: o.b }; }).concat([me])).filter(function (r) { return r.members.indexOf(L.level) >= 0; }) : [];
      var withNatal = M.relationsAmong ? M.relationsAmong(natalItems.concat([me])).filter(function (r) { return r.members.indexOf(L.level) >= 0; }) : [];
      var L2 = {
        level: L.level, levelK: LEVEL_K[L.level], label: L.label || '', gz: (M.STEM ? M.STEM[L.s] : '') + (M.BR ? M.BR[L.b] : ''), s: L.s, b: L.b, w: w, stemEl: se, branchEl: be,
        vec: vec.map(round1), add: add.map(function (x) { return Math.round(x * 100) / 100; }),
        pct: pct.map(round1), delta: pct.map(function (p, e) { return round1(p - prev[e]); }),
        relBelow: relBelow, relBelowK: { stem: REL_K[relBelow.stem], branch: REL_K[relBelow.branch] },
        withLuck: withLuck, withNatal: withNatal,
        hwa: hwa, hwaNet: hwaNet.map(function (x) { return Math.round(x * 100) / 100; })
      };
      out.push(L2); steps.push({ upTo: L.level, pct: pct });
    });
    var finalPct = steps.length ? steps[steps.length - 1].pct : natalPct;
    var byRole = function (name) { var e = roles.indexOf(name); return e < 0 ? null : { el: e, natal: round1(natalPct[e]), now: round1(finalPct[e]), delta: round1(finalPct[e] - natalPct[e]) }; };
    return {
      version: VERSION, weights: W, rule: '원국=엔진 비중, 운 한 기둥=천간 1+지지 1(지장간 일수 비율), 층 무게 대운 ' + W.daeun + '·세운 ' + W.seun + '·월운 ' + W.wolun + (opts.noHwa ? '' : ', 합화(월령 지원·충 없음일 때 두 글자 합 25%·세 글자 합 50% × 층 무게만큼 결과 오행으로 옮김)'),
      natal: { pct: natalPct.map(round1), pts: natalPts.map(function (x) { return Math.round(x * 100) / 100; }) },
      layers: out, final: { pct: finalPct.map(round1), delta: finalPct.map(function (p, e) { return round1(p - natalPct[e]); }) },
      roles: roles, dayEl: dEl, yong: byRole('용신'), hee: byRole('희신'), gi: byRole('기신'), gu: byRole('구신')
    };
  }

  // 지금(또는 고른 시각) 시점의 대운·세운·월운 기둥을 찾아 준다 — 화면이 바로 compute 에 넘길 수 있게
  function layersAt(M, ch, ms) {
    var t = ms || Date.now(), out = [];
    var du = (ch.daeun && ch.daeun.list || []).filter(function (x) { return x.startMs == null || x.startMs <= t; }).pop();
    if (du) out.push({ level: 'daeun', s: du.s, b: du.b, label: du.startAge + '세~' });
    var Y = new Date(t + 9 * 3600e3).getUTCFullYear();
    try {
      var yp = M.yearPillarAt ? M.yearPillarAt(t) : null, sy = yp ? yp.sajuYear : Y;
      var se = M.seunRange(ch, sy, sy)[0]; if (se) out.push({ level: 'seun', s: se.s, b: se.b, label: sy + '년' });
      var ms = M.wolun(ch, sy).concat(M.wolun(ch, sy + 1)), mo = null; ms.forEach(function (m) { if (m.startMs <= t) mo = m; });
      if (mo) out.push({ level: 'wolun', s: mo.s, b: mo.b, label: mo.termName || '' });
      var kd = new Date(t + 9 * 3600e3), dy = M.ilun ? M.ilun(ch, kd.getUTCFullYear(), kd.getUTCMonth() + 1)[kd.getUTCDate() - 1] : null;
      if (dy) out.push({ level: 'ilun', s: dy.s, b: dy.b, label: dy.date ? dy.date.join('.') : '' });
    } catch (e) { }
    return out;
  }

  // ───────────── 층별 세 줄 풀이(4단계, 사전 문구 조합 · AI 없음) ─────────────
  //   ① 대운이 깔아 둔 바탕 ② 세운이 더하는 것 ③ 월운이 건드리는 것.
  //   한 줄 = [이 층이 더한 오행] + [아래층과의 관계(천간 기준, 지지가 다르면 덧붙임)] + [운끼리 합·충] + [필요한 기운이 채워지는지] → 결.
  var EL_NM = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'], EL_JOSA = ['이', '가', '가', '이', '가'];
  var SCOPE = { daeun: { who: '대운', when: '10년 동안', unit: '10년' }, seun: { who: '세운', when: '올해는', unit: '한 해' }, wolun: { who: '월운', when: '이번 달은', unit: '한 달' }, ilun: { who: '일진', when: '오늘은', unit: '하루' } };
  var TITLE = { daeun: '대운이 깔아 둔 바탕', seun: '세운이 더하는 것', wolun: '월운이 건드리는 것', ilun: '일진이 스치는 것' };
  // 위층(이 층)이 아래층(바로 아래 운)에게 하는 일 — 천간 기준 문구
  var REL_LINE = {
    same: '{below}과 같은 오행이라, {below}의 성향이 {unit} 동안 더 세게 드러나요.',
    gives: '{below}을 생해 주는 기운이라, {below}이 깔아 둔 흐름에 힘을 보태요.',
    gets: '{below}에게서 생을 받는 기운이라, {unit} 동안 {who}의 힘이 생각보다 크게 커져요.',
    hits: '{below}을 누르는 기운이라, {below}이 만든 흐름을 {unit} 동안 꺾어 놓아요.',
    hit: '{below}에 눌리는 기운이라, 들어오는 힘이 생각보다 약하게 느껴질 수 있어요.'
  };
  // 대운(맨 아래 운)은 일간(나)과의 관계로
  var DAY_LINE = {
    same: '나와 같은 오행이라, 10년 동안 내 힘과 고집이 같이 커지는 바탕이에요.',
    gives: '나를 생해 주는 기운이라, 10년 동안 뒤에서 받쳐 주는 힘이 깔려요.',
    gets: '내가 생해 주는 기운이라, 10년 동안 내 힘을 밖으로 쓰고 펼치는 일이 많아져요.',
    hits: '내가 누르는 기운이라, 10년 동안 내가 다루고 거둬야 할 일·재물이 늘어요.',
    hit: '나를 누르는 기운이라, 10년 동안 책임과 압박이 바탕에 깔려요.'
  };
  var BRANCH_TAIL = { same: '지지는 {below}과 같은 오행으로 이어져요.', gives: '지지는 {below}을 받쳐 줘요.', gets: '지지는 {below}에게서 힘을 받아요.', hits: '지지는 {below}을 눌러요.', hit: '지지는 {below}에 눌려요.' };
  function fill(t, o) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : ''; }); }
  function josaEl(e) { return EL_NM[e] + EL_JOSA[e]; }
  function explain(r, upTo) {
    var shown = r.layers.slice(0, upTo == null ? r.layers.length : upTo), roles = r.roles, out = [];
    var good = function (e) { return roles[e] === '용신' || roles[e] === '희신'; }, bad = function (e) { return roles[e] === '기신' || roles[e] === '구신'; };
    shown.forEach(function (l, i) {
      var sc = SCOPE[l.level], parts = [], ids = [];
      // ⓐ 이 층이 더한 오행(층 무게 × 0.3점 이상, 큰 순서로 최대 2개)
      var adds = [0, 1, 2, 3, 4].filter(function (e) { return l.add[e] >= 0.3 * l.w; }).sort(function (a, b) { return l.add[b] - l.add[a]; }).slice(0, 2);
      var addTxt = adds.map(function (e) { return EL_NM[e] + (roles[e] ? '·' + roles[e] : e === r.dayEl ? '·나' : ''); }).join('과 ');
      parts.push(sc.who + (l.gz ? ' ' + l.gz : '') + ' — ' + (addTxt ? addTxt + ' 기운을 더해요.' : '여러 오행을 조금씩 더해요.')); ids.push('add');
      // ⓑ 아래층과의 관계
      if (l.relBelow.to === 'natal') { parts.push(DAY_LINE[l.relBelow.stem]); ids.push('day:' + l.relBelow.stem); }
      else {
        var below = SCOPE[l.relBelow.to].who;
        parts.push(fill(REL_LINE[l.relBelow.stem], { below: below, unit: sc.unit, who: sc.who })); ids.push('rel:' + l.relBelow.stem);
        if (l.relBelow.branch !== l.relBelow.stem) { parts.push(fill(BRANCH_TAIL[l.relBelow.branch], { below: below })); ids.push('br:' + l.relBelow.branch); }
      }
      // ⓒ 운끼리 합·충(가장 눈에 띄는 것 하나)
      var lk = l.withLuck, chung = lk.filter(function (q) { return q.type === '충' || q.type === '천간충'; })[0], hap = lk.filter(function (q) { return /합/.test(q.type); })[0];
      if (chung) { parts.push('운끼리 충(' + chung.name + ')이 걸려, ' + (l.level === 'ilun' ? '오늘은 일정이 바뀌거나 약속이 어긋나기 쉬워요. 여유를 두세요.' : sc.when + ' 계획이 흔들리거나 방향이 바뀌는 일이 생기기 쉬워요.')); ids.push('chung'); }
      else if (hap) { parts.push('운끼리 합(' + hap.name + ')으로 묶여, ' + (hap.el != null ? EL_NM[hap.el] + ' 쪽 힘이 덤으로 붙어요.' : '두 운이 한 방향으로 움직여요.')); ids.push('hap'); }
      // ⓒ-2 합화(2026-11-18): 조건이 맞아 오행이 실제로 옮겨 간 합만 말한다(옮긴 몫은 막대·비율에 반영)
      var hw = (l.hwa || []).filter(function (h) { return h.ok; });
      if (hw.length) { parts.push(hw.map(function (h) { return h.name; }).join('·') + ((hw[hw.length - 1].el === 0 || hw[hw.length - 1].el === 3) ? '이' : '가') + ' 합화 조건(월령 지원·충 없음)을 갖춰, 묶인 글자 기운 일부가 ' + hw.map(function (h) { return EL_NM[h.el]; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join('·') + ' 쪽으로 옮겨 가요.'); ids.push('hwa'); }
      // ⓓ 필요한 기운이 채워지는지(이 층이 만든 변화)
      var gd = 0, bd = 0; [0, 1, 2, 3, 4].forEach(function (e) { if (good(e)) gd += l.delta[e]; if (bad(e)) bd += l.delta[e]; });
      var T1 = l.level === 'ilun' ? 0.3 : 0.8, T2 = l.level === 'ilun' ? 0.15 : 0.4;   // 일진은 무게가 작아 변화 폭도 작다
      var tone = gd > T1 && bd <= T2 ? 'good' : bd > T1 && gd <= T2 ? 'bad' : gd > T1 && bd > T1 ? 'mixed' : gd < -T1 && bd < -T1 ? 'mixed' : gd < -T1 ? 'bad' : bd < -T1 ? 'good' : 'flat';
      var y = r.yong ? r.yong.el : -1;
      var END = {
        good: sc.when + ' ' + (y >= 0 && l.delta[y] > 0.4 ? '필요한 기운인 ' + josaEl(y) + ' 채워지는 쪽이라' : '도와주는 기운이 늘고 부담 기운이 줄어드는 쪽이라') + ' 움직이기 좋은 흐름이에요.',
        bad: sc.when + ' 필요한 기운이 줄고 부담 쪽 기운이 커져요. 크게 벌이기보다 지키는 쪽이 안전해요.',
        mixed: sc.when + ' 도움과 부담이 함께 커져요. 좋은 쪽은 살리고 무리한 약속은 줄이세요.',
        flat: sc.when + ' 원국의 균형을 크게 흔들지 않아요. 평소 리듬대로 가도 괜찮아요.'
      };
      if (l.level === 'ilun') { END.good = '오늘은 필요한 쪽 기운이 살짝 더해지는 날이에요. 미뤄 둔 일을 하나 처리해 보세요.'; END.bad = '오늘은 부담 쪽 기운이 살짝 더해지는 날이에요. 큰 결정은 하루 미뤄도 괜찮아요.'; END.mixed = '오늘은 좋은 기운과 부담이 함께 스쳐요. 무리한 약속만 피하세요.'; END.flat = '오늘은 큰 흔들림 없이 지나가기 쉬운 날이에요.'; }
      parts.push(END[tone]); ids.push('end:' + tone);
      out.push({ level: l.level, title: TITLE[l.level], text: parts.join(' '), tone: tone, ids: ids, good: Math.round(gd * 10) / 10, bad: Math.round(bd * 10) / 10 });
    });
    return out;
  }

  var api = { version: VERSION, LEVELS: LEVELS, DEFAULT_WEIGHTS: DEFAULT_W, REL_K: REL_K, pillarVec: pillarVec, elRel: elRel, compute: compute, layersAt: layersAt, explain: explain };
  G.MantraLuckOverlay = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
