/* 종격·전왕격(從格·專旺格) 판정 — 일간이 극단적으로 약하거나 강해 억제·보충(억부)이 맞지 않고 가장 센 세력을 따르는 사주인지 본다. 브라우저·Node 공용.
   · engine.js 를 수정하지 않는 별도 층이다. 원국·억부·조후·통관·병약과 흐름 점수에 어떤 방식으로도 더해지지 않고 읽기만 한다(원국 불변).
   · 판정은 ‘충족(jin) / 가능성(ga) / 해당 없음(none) / 보류(hold)’ 4단계이며, 조건별 충족 여부와 수치를 모두 근거로 돌려준다.
   · 일간의 힘(돕는 힘 %)이 극단(30% 미만 또는 70% 이상)일 때만 검토한다. 인성·비겁(또는 재관식)이 뚜렷하거나 뿌리가 있으면 종격으로 보지 않는다.
   · 종격이 성립하면 억부의 용신·기신이 정반대가 될 수 있다. 이 모듈은 억부를 바꾸지 않고, 정반대가 되는 지점을 알려 준다.
   · 시주를 모르면 빠진 글자가 종격을 깨거나 이룰 수 있어 충족·가능성을 보류로 바꾼다.
   · 종격의 용신 배치는 이 앱의 단순화 모델이다(학파마다 조금씩 다르다).
   사용: MantraJonggyeok.analyze(Manse, chart) */
(function (G) {
  'use strict';
  var VERSION = 'jonggyeok-20261103-1';
  var EL = ['목', '화', '토', '금', '수'], GN = ['비겁', '식상', '재성', '관성', '인성'], GOF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
  // 판정 기준(%·점수). 이 앱의 모델이며 학파마다 다를 수 있다.
  var CFG = { weakMax: 30, strongMin: 70, helpFull: 20, helpPart: 25, rootFull: 15, rootPart: 30, rootBlock: 50, biFull: 8, biPart: 12, biBlock: 15, inFull: 12, inPart: 16, inBlock: 20, followFull: 45, followPart: 38, lead: 12,
    helpStrongFull: 80, helpStrongPart: 72, rootStrongFull: 70, rootStrongPart: 50, leakFull: 12, leakPart: 18, domFull: 40, domPart: 32 };
  // 따르는 세력(십성 묶음 번호) → 용신 배치 [용신, 희신, 한신, 구신, 기신] (모두 십성 묶음 번호)
  var PLAN = { 1: ['종아격', [1, 2, 0, 3, 4]], 2: ['종재격', [2, 1, 3, 0, 4]], 3: ['종살격', [3, 2, 0, 1, 4]], 0: ['종왕격', [0, 4, 1, 2, 3]], 4: ['종강격', [4, 0, 3, 1, 2]] };
  var cache = new WeakMap();
  var lv = function (v, full, part, rev) { return rev ? (v <= full ? 1 : v <= part ? 0.5 : 0) : (v >= full ? 1 : v >= part ? 0.5 : 0); };
  var MARK = { 1: '충족', 0.5: '부분', 0: '미충족' };
  var BATCHIM = { 목: 1, 금: 1 }, eun = function (e) { return e + (BATCHIM[e] ? '은' : '는'); }, eul = function (e) { return e + (BATCHIM[e] ? '을' : '를'); };   // 오행 이름 뒤 조사

  function analyze(M, ch) {
    var hit = cache.get(ch); if (hit) return hit;
    var st = ch.strength, g = ch.weights.groups, help = st.help, dEl = M.stemEl(ch.pillars.day.s), d = ch.pillars.day.s;
    var root = M.analyzeNatalRoot(ch), rs = root ? root.natalRootScore : 0, hasHour = ch.hourKnown !== false && !!ch.pillars.hour;
    var touched = function (grp) { var n = 0; ['year', 'month', 'hour'].forEach(function (k) { var p = ch.pillars[k]; if (p && GOF[M.tenGod(d, p.s)] === grp) n++; }); return n; };   // 천간에 드러난 개수
    var res = { version: VERSION, help: Math.round(help * 10) / 10, zone: st.zone, hasHour: hasHour, caveat: [], criteria: [], follow: null };
    var el = function (grp) { return (dEl + grp) % 5; };
    var side = help < CFG.weakMax ? 'weak' : help >= CFG.strongMin ? 'strong' : 'mid';
    res.side = side;
    if (side === 'mid') {
      res.status = 'none'; res.headline = '종격 조건에 해당하지 않습니다';
      res.text = { summary: '일간의 힘(나를 돕는 힘 ' + res.help + '%)이 극단적으로 약하거나 강하지 않아 종격·전왕격은 검토하지 않습니다. 이 사주는 억부·조후 같은 보통의 기준으로 읽는 것이 맞습니다.', relation: [], why: '' };
      res.table = null; cache.set(ch, res); return res;
    }
    var C = [], follow, kind;
    if (side === 'weak') {
      var lead = [1, 2, 3].map(function (k) { return { k: k, v: g[k] }; }).sort(function (a, b) { return b.v - a.v; }), top = lead[0], sec = lead[1];
      var tb = touched(0), ti = touched(4);
      C.push(['일간의 힘이 아주 약함', lv(help, CFG.helpFull, CFG.helpPart, true), '돕는 힘 ' + res.help + '% (기준 ' + CFG.helpFull + '% 이하 충족 · ' + CFG.helpPart + '% 이하 부분)']);
      C.push(['일간의 뿌리(통근)가 없거나 약함', lv(rs, CFG.rootFull, CFG.rootPart, true), '통근 점수 ' + rs + ' (기준 ' + CFG.rootFull + ' 이하 충족 · ' + CFG.rootPart + ' 이하 부분)']);
      C.push(['월령을 얻지 못함(득령 못함)', st.deukryeong ? 0 : 1, st.deukryeong ? '월지가 일간을 돕는 득령 상태' : '월지의 도움 없음']);
      C.push(['비겁이 약하고 천간에 드러나지 않음', tb ? Math.min(0.5, lv(g[0], CFG.biFull, CFG.biPart, true)) : lv(g[0], CFG.biFull, CFG.biPart, true), '비겁 ' + Math.round(g[0]) + '% · 천간 ' + tb + '곳']);
      C.push(['인성이 약하고 천간에 드러나지 않음', ti ? Math.min(0.5, lv(g[4], CFG.inFull, CFG.inPart, true)) : lv(g[4], CFG.inFull, CFG.inPart, true), '인성 ' + Math.round(g[4]) + '% · 천간 ' + ti + '곳']);
      var fv = Math.min(lv(top.v, CFG.followFull, CFG.followPart), (top.v - sec.v) >= CFG.lead ? 1 : 0.5);
      C.push(['따를 세력(' + GN[top.k] + ')이 뚜렷함', fv, GN[top.k] + ' ' + Math.round(top.v) + '% (기준 ' + CFG.followFull + '% 이상 충족) · 다음 세력과 차이 ' + Math.round(top.v - sec.v) + '%p']);
      follow = top.k;
      var block = g[4] >= CFG.inBlock || g[0] >= CFG.biBlock || rs >= CFG.rootBlock;
      var S = C.reduce(function (a, c) { return a + c[1]; }, 0);
      res.blockWhy = block ? (g[4] >= CFG.inBlock ? '인성이 ' + Math.round(g[4]) + '%로 뚜렷해 일간을 생해 주므로 종하기 어렵습니다' : g[0] >= CFG.biBlock ? '비겁이 ' + Math.round(g[0]) + '%로 뚜렷해 일간이 홀로 서 있으므로 종하기 어렵습니다' : '일간의 통근 점수가 ' + rs + '로 뿌리가 있어 종하기 어렵습니다') : '';
      var allFull = C.every(function (c) { return c[1] >= 0.5; }) && S >= 5.5;   // 미충족 없이 대부분 충족
      res.status = block ? 'none' : allFull ? 'jin' : (S >= 4.5 && C[0][1] >= 0.5 && C[5][1] >= 0.5 ? 'ga' : 'none');
    } else {
      var dom = g[0] >= g[4] ? 0 : 4, domV = g[dom], leak = g[1] + g[2] + g[3];
      C.push(['일간의 힘이 아주 강함', lv(help, CFG.helpStrongFull, CFG.helpStrongPart), '돕는 힘 ' + res.help + '% (기준 ' + CFG.helpStrongFull + '% 이상 충족 · ' + CFG.helpStrongPart + '% 이상 부분)']);
      C.push(['일간의 뿌리(통근)가 강함', lv(rs, CFG.rootStrongFull, CFG.rootStrongPart), '통근 점수 ' + rs + ' (기준 ' + CFG.rootStrongFull + ' 이상 충족 · ' + CFG.rootStrongPart + ' 이상 부분)']);
      C.push(['월령을 얻음(득령)', st.deukryeong ? 1 : 0, st.deukryeong ? '월지가 일간을 도움' : '월지의 도움 없음']);
      C.push(['식상·재성·관성이 거의 없음', lv(leak, CFG.leakFull, CFG.leakPart, true), '식상·재성·관성 합 ' + Math.round(leak) + '% (기준 ' + CFG.leakFull + '% 이하 충족 · ' + CFG.leakPart + '% 이하 부분)']);
      C.push(['한 세력(' + GN[dom] + ')으로 크게 쏠림', lv(domV, CFG.domFull, CFG.domPart), GN[dom] + ' ' + Math.round(domV) + '% (기준 ' + CFG.domFull + '% 이상 충족)']);
      follow = dom;
      var S2 = C.reduce(function (a, c) { return a + c[1]; }, 0), block2 = leak >= 26;
      res.blockWhy = block2 ? '식상·재성·관성이 합 ' + Math.round(leak) + '%로 뚜렷해 일간의 힘을 빼 줄 수 있으므로 전왕으로 보기 어렵습니다' : '';
      res.status = block2 ? 'none' : C.every(function (c) { return c[1] >= 0.5; }) && S2 >= 4.5 ? 'jin' : (S2 >= 4 && C[0][1] >= 0.5 && C[3][1] >= 0.5 ? 'ga' : 'none');
    }
    kind = PLAN[follow][0];
    res.criteria = C.map(function (c) { return { label: c[0], level: c[1], mark: MARK[c[1]], detail: c[2] }; });
    res.follow = { group: GN[follow], el: EL[el(follow)], kind: kind };
    if (!hasHour && (res.status === 'jin' || res.status === 'ga')) { res.caveat.push('태어난 시간을 몰라 시주의 글자가 빠져 있습니다. 시간·시지의 글자가 종격을 깨거나 이룰 수 있어 충족·가능성을 확정하지 않고 보류로 표시합니다.'); res.statusRaw = res.status; res.status = 'hold'; }
    // ── 문장 ──
    var met = res.criteria.filter(function (c) { return c.level === 1; }).length, n = res.criteria.length;
    var plan = PLAN[follow][1], role = ['용신', '희신', '한신', '구신', '기신'], grpEl = function (k) { return el(k); };
    res.roles = {}; plan.forEach(function (k, i) { res.roles[EL[grpEl(k)]] = role[i]; });
    if (res.status === 'jin' || res.status === 'ga' || res.status === 'hold') {
      res.table = { yong: grpEl(plan[0]), hee: grpEl(plan[1]), gi: grpEl(plan[4]), gu: grpEl(plan[3]) };
      var eo = ch.yongAll.eokbu, eokYong = eo.yong, rel = [], eokRoleInJong = res.roles[EL[eokYong]];
      rel.push('억부 기준 용신은 ' + EL[eokYong] + '입니다.' + (eokRoleInJong === '기신' || eokRoleInJong === '구신' ? ' 종격으로 읽으면 ' + eun(EL[eokYong]) + ' ' + eokRoleInJong + '이라 해석이 정반대가 됩니다. 종격이 성립하는지에 따라 억부 해석이 맞지 않을 수 있습니다.' : eokRoleInJong === '용신' || eokRoleInJong === '희신' ? ' 종격으로 읽어도 ' + EL[eokYong] + (BATCHIM[EL[eokYong]] ? '이' : '가') + ' ' + eokRoleInJong + '이라 방향이 같습니다.' : ' 종격에서는 ' + eul(EL[eokYong]) + ' ' + (eokRoleInJong || '해당 없음') + '으로 봅니다.'));
      if (ch.yongAll.johu && ch.yongAll.johu.applicable !== false && ch.yongAll.johu.roles) rel.push('조후 용신은 ' + EL[ch.yongAll.johu.yong] + '이며 종격 판단과 별개로 봅니다(종격이 성립하면 조후보다 세력을 따르는 것이 우선이라고 보는 견해가 많습니다).');
      res.headline = (res.status === 'jin' ? '종격 조건이 충족됩니다 — ' : res.status === 'ga' ? '종격 가능성이 있습니다 — ' : '종격 후보이나 시주를 몰라 보류합니다 — ') + kind;
      res.text = { summary: kind + ': ' + res.follow.group + '(' + res.follow.el + ') 세력을 따릅니다. 조건 ' + n + '개 중 ' + met + '개 충족. ' + (res.status === 'jin' ? (met === n ? '모든 조건이 충족되어' : '미충족 조건 없이 대부분 충족되어') + ' 억제·보충(억부) 대신 세력을 따르는 해석이 맞을 수 있습니다.' : res.status === 'ga' ? '대부분 충족하지만 일부가 약해(가종 가능성) 종격으로 단정하지 않습니다. 억부 해석과 함께 보세요.' : '시주 확인 전까지 판단을 미룹니다.'),
        relation: rel, why: '종격은 일간이 홀로 서기 어려워 가장 센 세력을 따라가는 것이 순리라고 보는 관점입니다. 이때는 일간을 돕는 인성·비겁이 오히려 흐름을 깨는 기신이 됩니다.' };
    } else {
      res.table = null; res.headline = '종격 조건에 해당하지 않습니다';
      res.text = { summary: '일간의 힘은 극단적이지만(' + res.help + '%) 종격·전왕격 조건을 충족하지 않습니다. ' + (res.blockWhy ? res.blockWhy + '.' : '조건 ' + n + '개 중 ' + met + '개만 충족해 종격으로 보기 어렵습니다.') + ' 이런 사주는 보통의 억부 기준으로 읽되, 힘이 극단적이므로 억부 결과는 참고로 보세요.', relation: [], why: '' };
    }
    cache.set(ch, res); return res;
  }
  G.MantraJonggyeok = { analyze: analyze, VERSION: VERSION, CFG: CFG, PLAN: PLAN };
})(typeof window !== 'undefined' ? window : globalThis);
