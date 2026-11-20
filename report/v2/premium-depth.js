/* 프리미엄 심화 시범 층(2026-11-17) — 서사 엔진(life-narrative.js)이 고른 주 규칙 1개 위에 세 겹을 더한다.
   ① 내면의 구조: 이 사주의 실제 값(기운 묶음 비율·나를 돕는 힘·필요한 기운)으로 쓴 근거 문단 — 장마다 읽는 값이 다르다
   ② 양면성과 반전 / 함께 보는 조건: 공통 프로필의 '긴장 구조'(tensions)마다 붙는 수식 문단, 장당 최대 2개(약점 1 + 강점 1 우선)
   ③ 내게 맞는 한 가지: 필요한 기운(용신이 일간과 맺는 관계)별 개인화 결론 + 다음 장으로 잇는 한 줄
   주 규칙이 하나도 맞지 않는 사주(지금은 DB 원고로 떨어짐)는 BASE(가장 큰 기운 묶음별) 서사로 채운다.
   · 계산식은 바꾸지 않는다: 값은 모두 life-narrative profile() 태그와 ch(만세력 결과)에서 읽기만 한다.
   · 대상 장: premium-depth-data.js 의 MODS 키(시범 4장). 그 밖의 장은 손대지 않는다.
   · 스위치: 운영 공개 스위치 없음(시범). 로컬·미리보기 주소의 ?mantraFlags=premiumDepth 또는 MANTRA_FLAGS.premiumDepth 로만 켠다.
   · 기록: 결과에 premium{version, profile, tensions, mods, base, key} 를 남겨 관리자·감사 도구가 근거를 추적한다.
   검사: tests/premium-depth-sim.cjs */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'premium-depth-20261117-1', PROFILE_V = 'profile-1';
  var GN = ['bi', 'sik', 'jae', 'gwan', 'in'];
  var EL_PLAIN = ['나무', '불', '흙', '쇠', '물'];
  var X = function () { return root.MantraPremiumDepthData; };
  var mod5 = function (x) { return ((x % 5) + 5) % 5; };
  var pc = function (v) { return Math.round(v || 0) + '%'; };
  function josa(w, pair) { var s = String(w), c = s.charCodeAt(s.length - 1), has = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 > 0 : /[0-9]$/.test(s) ? /[013678]$/.test(s) : false; var p = pair.split('/'); return s + (has ? p[0] : p[1]); }

  // ── 공통 분석 프로필: 서사 프로필 태그 + 긴장 구조. 같은 사주면 모든 장이 같은 판정을 읽는다 ──
  var T = {
    sanggwan: function (P) { return P.has('pat:상관견관') ? ['pat:상관견관'] : null; },
    inOver: function (P) { var t = ['pat:인성과다', 'pat:효신탈식(도식)', 'g:in:heavy'].filter(P.has); return t.length ? t : null; },
    jaeWeak: function (P) { return P.has('pat:재다신약') ? ['pat:재다신약'] : null; },
    bisplit: function (P) { return P.has('pat:군겁쟁재') ? ['pat:군겁쟁재'] : null; },
    gwanOver: function (P) { return P.has('pat:관살과다') ? ['pat:관살과다'] : P.has('g:gwan:heavy') && P.has('str:weak') ? ['g:gwan:heavy', 'str:weak'] : null; },
    gwanMix: function (P) { return P.has('pat:관살혼잡') ? ['pat:관살혼잡'] : null; },
    sikOver: function (P) { return P.has('pat:식상과다(설기)') ? ['pat:식상과다(설기)'] : null; },
    sikHeavy: function (P) { return P.has('g:sik:heavy') ? ['g:sik:heavy'] : null; },
    sikJae: function (P) { return P.has('g:sik:some') && P.has('g:jae:some') && !P.has('str:veryweak') && !P.has('pat:식상과다(설기)') ? ['g:sik:some', 'g:jae:some'] : null; },
    gwanIn: function (P) { return P.has('g:gwan:some') && P.has('g:in:some') && (P.has('gk:seong') || P.has('gk:part')) ? ['g:gwan:some', 'g:in:some', P.has('gk:seong') ? 'gk:seong' : 'gk:part'] : null; },
    hot: function (P) { return P.has('cl:hot') ? ['cl:hot'] : null; },
    cold: function (P) { return P.has('cl:cold') ? ['cl:cold'] : null; },
    dayClash: function (P) { return P.has('rel:day-clash') ? ['rel:day-clash'] : null; },
    dayHap: function (P) { return P.has('rel:day-hap') && !P.has('rel:day-clash') ? ['rel:day-hap'] : null; },
    wonjin: function (P) { return P.has('rel:wonjin') ? ['rel:wonjin'] : null; },
    strongIdle: function (P) { return P.has('str:strong') && P.has('g:sik:light') && P.has('g:jae:light') ? ['str:strong', 'g:sik:light', 'g:jae:light'] : null; },
    yongAbsent: function (P) { return P.has('yong:absent') ? ['yong:absent'] : null; },
    spouseNone: function (P) { return P.has('spouse:none') ? ['spouse:none'] : null; },
    spouseHeavy: function (P) { return P.has('spouse:heavy') && !P.has('spouse:mix') ? ['spouse:heavy'] : null; },
    spouseMix: function (P) { return P.has('spouse:mix') ? ['spouse:mix'] : null; },
    pyeonjae: function (P) { return P.has('tg:pyeonjae:high') ? ['tg:pyeonjae:high'] : null; },
    jeongjae: function (P) { return P.has('tg:jeongjae:high') && !P.has('tg:pyeonjae:high') ? ['tg:jeongjae:high'] : null; },
    sikNone: function (P) { return P.has('g:sik:none') ? ['g:sik:none'] : null; },
    jaeNone: function (P) { return P.has('g:jae:none') ? ['g:jae:none'] : null; },
    gwanNone: function (P) { return P.has('g:gwan:none') ? ['g:gwan:none'] : null; },
    inNone: function (P) { return P.has('g:in:none') ? ['g:in:none'] : null; },
    gkPa: function (P) { return P.has('gk:pa') ? ['gk:pa'] : null; },
    rootNone: function (P) { return P.has('root:none') ? ['root:none'] : null; },
    hyeong: function (P) { return P.has('rel:hyeong') ? ['rel:hyeong'] : null; },
    stemHap: function (P) { return P.has('rel:stem-hap') ? ['rel:stem-hap'] : null; },
    veryWeak: function (P) { return P.has('str:veryweak') ? ['str:veryweak'] : null; },
    veryStrong: function (P) { return P.has('str:verystrong') ? ['str:verystrong'] : null; },
    biHeavy: function (P) { return P.has('g:bi:heavy') && !P.has('pat:군겁쟁재') ? ['g:bi:heavy'] : null; },
    jaeHeavy: function (P) { return P.has('g:jae:heavy') && !P.has('pat:재다신약') ? ['g:jae:heavy'] : null; },
    gwanHeavy: function (P) { return P.has('g:gwan:heavy') && !P.has('str:weak') ? ['g:gwan:heavy'] : null; },
    inHeavy: function (P) { return P.has('g:in:heavy') ? ['g:in:heavy'] : null; }
  };
  function profile(M, ch, P) {
    var G = ch.weights.groups, dEl = M.stemEl(ch.pillars.day.s), u = ch.unified || {}, dom = 0, min = 0;
    G.forEach(function (v, i) { if (v > G[dom]) dom = i; if (v < G[min]) min = i; });
    var tensions = {}; Object.keys(T).forEach(function (k) { var hit = T[k](P); if (hit) tensions[k] = hit; });
    var yongG = u.yong != null ? GN[mod5(u.yong - dEl)] : null;
    return {
      v: PROFILE_V, G: G, help: ch.strength.help, zone: ch.strength.zone, dayEl: dEl, dom: GN[dom], min: GN[min],
      yong: u.yong, yongG: yongG, yongPct: u.yong != null ? (ch.weights.pct[u.yong] || 0) : null, mode: u.mode || '',
      djg: GN[mod5(M.stemEl(M.mainHidden(ch.pillars.day.b)) - dEl)],
      tensions: tensions, young: P.has('age:young'), senior: P.has('age:senior')
    };
  }
  var STR_W = { 극약: -1, 태약: -1, 신약: -1, 중화: 0, 신강: 1, 태강: 1, 극왕: 1 };   // 2026-11-20: 엔진 강약 구간(STRENGTH_ZONES)을 그대로 — 경곗값을 따로 두지 않음
  var strWord = function (h, zone) { var w = zone in STR_W ? STR_W[zone] : (h < 42 ? -1 : h > 58 ? 1 : 0); return w < 0 ? '힘이 여린 편' : w > 0 ? '힘이 센 편' : '어느 한쪽으로 크게 기울지 않은 편'; };
  var gName = function (D, g) { return D.G[g] + '(' + D.GT[g] + ')'; };

  // ── ① 내면의 구조: 장마다 읽는 값이 다르다 ──
  var INNER = {
    timeline_self_03: function (pf, D) {
      var G = pf.G, i = GN.indexOf(pf.dom), j = GN.indexOf(pf.min);
      return '이 기질 풀이는 세 가지 값에서 나왔어요. 태어난 날의 기운은 ' + EL_PLAIN[pf.dayEl] + '의 성질이고, 나를 돕는 힘은 ' + pc(pf.help) + '로 ' + strWord(pf.help, pf.zone) + '이에요. 다섯 가지 기운 묶음 가운데 가장 큰 것은 ' + gName(D, pf.dom) + ' ' + pc(G[i]) + ', 가장 작은 것은 ' + gName(D, pf.min) + ' ' + pc(G[j]) + '예요. 가장 큰 묶음은 당신이 자꾸 꺼내 쓰는 힘이고, 가장 작은 묶음은 남에게 빌리거나 연습으로 채워야 하는 힘이라고 보면 쉬워요.';
    },
    timeline_wealth_03: function (pf, D) {
      var G = pf.G, bi = G[0], sik = G[1], jae = G[2];
      var head = '돈이 새는 길은 세 값을 함께 봐요. ' + gName(D, 'jae') + '이 ' + pc(jae) + ', ' + gName(D, 'bi') + '이 ' + pc(bi) + ', ' + gName(D, 'sik') + '이 ' + pc(sik) + '예요. ';
      var read = bi >= jae * 2 && bi >= 25 ? '같은 편 기운이 돈 기운의 두 배가 넘어, 돈이 사람 사이에서 나뉘는 구조가 뚜렷해요.'
        : jae >= 30 && pf.help < 42 ? '돈 기운이 나를 돕는 힘(' + pc(pf.help) + ')보다 무거워, 버는 과정의 피로가 지출로 새기 쉬운 구조예요.'
          : jae < 10 ? '돈 기운이 적은 편이라, 돈이 저절로 모이기보다 의식해서 붙잡아야 남는 구조예요.'
            : sik >= 10 && jae >= 10 ? '표현 기운에서 돈 기운으로 이어지는 길이 있어, 버는 길은 열려 있고 새는 곳은 주로 관리 쪽에 있어요.'
              : '돈 기운과 나를 돕는 힘이 비교적 고르게 맞서 있어, 새는 곳은 구조보다 습관 쪽에 있어요.';
      return head + read;
    },
    timeline_career_07: function (pf, D) {
      var G = pf.G, gw = G[3], me = G[0] + G[1], org = pf.senior || pf.young ? '모임' : '조직';
      var head = org + ' 안의 갈등은 두 힘의 균형으로 읽어요. ' + gName(D, 'gwan') + '이 ' + pc(gw) + ', 나를 드러내는 힘인 같은 편 기운과 표현하는 기운이 합쳐 ' + pc(me) + '예요. ';
      var read = gw < 10 ? '규칙의 기운이 적어, ' + org + '의 틀 자체가 낯설고 답답하게 느껴지기 쉬운 구조예요.'
        : gw > me ? org + '이 주는 무게가 내 목소리보다 커서, 갈등은 바깥으로 터지기보다 안으로 쌓이는 쪽이에요.'
          : me >= gw * 2 ? '내 목소리가 ' + org + '의 틀보다 훨씬 커서, 갈등은 주로 ' + (pf.young ? '규칙이나 앞장서는 사람' : '윗사람·규칙') + '과 정면으로 부딪히는 모양이에요.'
            : '두 힘이 비슷하게 맞서 있어, 상황에 따라 맞추기도 하고 부딪히기도 하는 편이에요.';
      return head + read + ' 여기에 나를 돕는 힘이 ' + pc(pf.help) + '라, ' + (pf.help < 42 ? '버티는 힘을 아껴 쓰는 것이 갈등 관리의 절반이에요.' : pf.help > 58 ? '버티는 힘은 충분한 대신 물러서는 연습이 필요해요.' : '버티는 힘과 물러서는 힘이 비교적 고르게 있어요.');
    },
    // 끌림·맞음: 주 규칙이 이미 '어떤 사람에게 끌리고 누구와 맞는지'를 말하므로, 여기서는 그 판단이 나온 값만 보여 준다(다른 사람형을 새로 말하면 모순)
    timeline_love_05: function (pf, D, pick, P) {
      var G = pf.G, i = GN.indexOf(pf.dom), id = pick && pick.id || '';
      if (id === 'l05-mix') return '이 풀이가 끌림과 맞음을 둘로 나눈 데는 이유가 있어요. 인연을 뜻하는 기운 안에 반듯한 쪽과 자유로운 쪽이 함께 들어 있거든요(' + P.tags['spouse:mix'] + '). 두 성질이 한 사주 안에 같이 있으면, 마음이 움직이는 상대와 생활이 편한 상대가 서로 다른 얼굴로 나타나기 쉬워요.';
      var s = '끌림과 맞음은 서로 다른 값에서 나와요. 끌림은 내가 이미 많이 가진 기운에서 생기기 쉬운데, 당신은 ' + gName(D, pf.dom) + '이 ' + pc(G[i]) + '로 가장 커요. 그래서 이 기운을 닮은 사람에게 먼저 마음이 움직여요.';
      if (pf.yongG && pf.yongG !== pf.dom) s += ' 반대로 맞음은 내게 모자란 기운을 채워 주는 쪽에서 생겨요. 이 사주에 필요한 기운은 ' + EL_PLAIN[pf.yong] + '의 성질이라, 처음 끌린 사람과 오래 편한 사람이 다른 얼굴일 수 있어요.';
      return s;
    }
  };

  // 데이터 파일의 내면의 구조 함수가 쓰는 도구: 비율·이름·강약 낱말을 한곳에서 만든다(데이터 파일은 계산하지 않고 값만 읽는다)
  function helper(pf, D, c) {
    var i = function (g) { return GN.indexOf(g); }, tg = c.ch.weights.tgPct || {};
    return {
      pf: pf, P: c.P, pick: c.pick, young: pf.young, senior: pf.senior, female: c.ch.gender === 'F',
      pc: pc, josa: josa, v: function (g) { return pf.G[i(g)] || 0; }, p: function (g) { return pc(pf.G[i(g)]); },
      name: function (g) { return gName(D, g); }, plain: function (g) { return D.G[g]; },
      np: function (g) { return D.G[g] + '(' + D.GT[g] + ' ' + pc(pf.G[i(g)]) + ')'; },   // '나와 같은 편 기운(비겁 34%)' — 뒤 조사는 '기운' 받침 기준(은·이·과·을)
      domNP: D.G[pf.dom] + '(' + D.GT[pf.dom] + ' ' + pc(pf.G[i(pf.dom)]) + ')', minNP: D.G[pf.min] + '(' + D.GT[pf.min] + ' ' + pc(pf.G[i(pf.min)]) + ')',
      tg: function (n) { return tg[n] || 0; }, tgp: function (n) { return pc(tg[n] || 0); },
      help: pf.help, helpP: pc(pf.help), str: strWord(pf.help, pf.zone), weak: pf.help < 42, strong: pf.help > 58,
      dom: pf.dom, min: pf.min, domName: gName(D, pf.dom), minName: gName(D, pf.min), domP: pc(pf.G[i(pf.dom)]), minP: pc(pf.G[i(pf.min)]),
      yong: pf.yongG, yongEl: pf.yong != null ? EL_PLAIN[pf.yong] : '', yongP: pc(pf.yongPct), yongName: pf.yongG ? gName(D, pf.yongG) : '',
      dayEl: EL_PLAIN[pf.dayEl], dj: pf.djg, djName: gName(D, pf.djg), has: function (t) { return c.P.has(t); }, t: pf.tensions
    };
  }

  // ── ② 수식 문단 고르기: 주 규칙이 이미 쓴 조건(same)은 건너뛰고, 약점 1 + 강점 1 을 우선 ──
  function pickMods(chapterId, pf, pick) {
    var D = X(), list = (D.MODS[chapterId] || []);
    var used = pick ? pick.all.concat([].concat.apply([], pick.any || [])) : [];
    if (workOff(chapterId, pf)) return [];
    // 주 규칙이 이미 쓴 조건(그 긴장을 만든 태그 + 문단의 same)은 건너뛴다 — 같은 얘기 두 번 금지
    var ok = list.filter(function (m) { var tg = pf.tensions[m.t]; return tg && !(pf.young && (m.adult || ADULT_RE.test(m.text))) && !(m.same || []).concat(tg).some(function (t) { return used.indexOf(t) >= 0; }); });
    var risk = ok.filter(function (m) { return !m.good; }), good = ok.filter(function (m) { return m.good; });
    var out = []; if (risk[0]) out.push(risk[0]); if (good[0]) out.push(good[0]); else if (risk[1]) out.push(risk[1]);
    return out;
  }

  // 운영 공개 스위치(/api/luck-flags premiumDepth) — life-narrative.js 가 스위치를 받을 때 setRemote 로 넘겨 준다
  var remoteOn = false;
  function setRemote(v) { var b = v === true, changed = b !== remoteOn; remoteOn = b; return changed; }
  function on() {
    if (remoteOn) return true;
    try {
      var f = root.MANTRA_FLAGS; if (f && f.premiumDepth === true) return true;
      var h = root.location && root.location.hostname || '';
      if (/^(localhost|127\.0\.0\.1)$/.test(h) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(h)) return /[?&]mantraFlags=[A-Za-z,]*\bpremiumDepth\b/.test(root.location.search || '');
    } catch (e) { }
    return false;
  }
  function covers(chapterId) { var D = X(); return !!(D && D.MODS[chapterId]); }
  // 일 장면이 중심인 장(커리어 전 장 + 데이터의 WORK 목록)은 만 20세 미만·65세 이상에게 수식 문단·결론을 붙이지 않는다(그 나이대 주 규칙이 따로 있음)
  function workOff(id, pf) { var D = X(); return (pf.young || pf.senior) && (/^timeline_career_/.test(id) || (D.WORK || []).indexOf(id) >= 0); }
  // 만 20세 미만에게 쓰지 않을 어른 생활 낱말(문단·결론에 하나라도 있으면 그 문단을 뺀다)
  var ADULT_RE = /회사|직장|출근|퇴근|연봉|이직|퇴사|승진|상사|동료|부서|창업|대출|월급|결혼|배우자|남편|아내|부부|시댁|처가|육아|전세|월세|투자|거래처|팀장|은퇴|노후|동업|계모임|보험|계약/;

  // ctx: { M, ch, now, chapterId, res, pick, P, st, dedupe, luck(), evidence(P, rule, extra), label, version }
  function apply(c) {
    var D = X(); if (!D || !covers(c.chapterId)) return c.res;
    var pf = profile(c.M, c.ch, c.P), id = c.chapterId, dd = function (t) { return c.dedupe(c.st, t); };
    var res = c.res, base = null;
    if (!res) {
      if (workOff(id, pf)) return null;
      base = D.BASE[id] && D.BASE[id][pf.dom]; if (!base) return null;
      if (pf.young && ADULT_RE.test([base.core, base.life, base.conflict, base.advice].join(' '))) return null;
      var rows0 = [{ stage: 'core', text: dd(base.core) }, { stage: 'life', text: dd(base.life) }, { stage: 'conflict', text: dd(base.conflict) }, { stage: 'luck', text: c.luck() }, { stage: 'advice', text: dd(base.advice) }].filter(function (r) { return r.text; });
      res = { chapterId: id, lens: c.lens, rule: 'premium-base:' + pf.dom, hook: base.hook, rows: rows0.map(function (r) { return { stage: r.stage, label: c.label[r.stage], text: r.text }; }), evidence: c.evidence(c.P, null, ['근거 강도: 보통 — 맞는 세부 규칙이 없어, 가장 큰 기운 묶음으로 읽은 바탕 풀이예요.']), trace: [], version: c.version };
    }
    var rows = res.rows.slice(), at = function (stage) { for (var i = 0; i < rows.length; i++) if (rows[i].stage === stage) return i; return -1; };
    // ① 내면의 구조 — 핵심 진단 바로 뒤
    var innerFn = INNER[id] || (D.INNER && D.INNER[id]), inner = '';
    if (innerFn) { try { inner = INNER[id] ? innerFn(pf, D, c.pick, c.P) : innerFn(helper(pf, D, c)); } catch (e) { inner = ''; } inner = inner ? dd(inner) : ''; }
    if (inner && pf.young && ADULT_RE.test(inner)) inner = '';
    if (inner) rows.splice(at('core') + 1, 0, { stage: 'inner', label: '내면의 구조', text: inner });
    // ② 양면성과 반전 — 갈등과 약점 뒤, 운이 바꾸는 것 앞
    // 수식 문단 앞에 '알아보는 장면' 한 줄(premium-depth-scenes.js) — 이 사람에게 이미 나온 장면은 건너뛰고 다음 후보를 쓴 뒤, 없으면 장면 없이 문단만
    var SC = root.MantraPremiumDepthScenes, scenesUsed = [];
    var sceneFor = function (m) {
      var list = SC ? SC.candidates(id, m.t) : [];
      for (var i = 0; i < list.length; i++) { if (pf.young && ADULT_RE.test(list[i])) continue; var s = dd(list[i]); if (s) { scenesUsed.push(m.t); return s; } }
      return '';
    };
    var mods = pickMods(id, pf, c.pick), modRows = mods.map(function (m, k) { var body = dd(m.text), sc = body ? sceneFor(m) : ''; return { stage: k ? 'combo' : 'twist', label: k ? '함께 보는 조건' : '양면성과 반전', text: body ? (sc ? sc + ' ' + body : body) : '' }; }).filter(function (r) { return r.text; });
    var ci = at('conflict'); if (ci < 0) ci = at('life');
    Array.prototype.splice.apply(rows, [ci + 1, 0].concat(modRows));
    // ③ 내게 맞는 한 가지 + 다음 장 — 맨 끝
    var key = !workOff(id, pf) && !(id === 'timeline_love_05' && pf.yongG === pf.dom) && pf.yongG && D.KEY[id] ? D.KEY[id][pf.yongG] || '' : '';
    if (key && pf.young && ADULT_RE.test(key)) key = '';
    var bridge = !workOff(id, pf) && D.BRIDGE[id] || '';
    if (bridge && pf.young && ADULT_RE.test(bridge)) bridge = '';
    var tail = [key, bridge].filter(Boolean).map(dd).filter(Boolean).join(' ');
    if (tail) rows.push({ stage: 'key', label: '내게 맞는 한 가지', text: tail });
    var evd = res.evidence || { lines: [], terms: [], conds: [] }, extra = [];
    if (mods.length) extra.push('함께 본 조건: ' + mods.map(function (m) { return pf.tensions[m.t].map(function (t) { return c.P.tags[t]; }).join(' · '); }).join(' / ') + '.');
    if (pf.yongG) extra.push('필요한 기운: ' + EL_PLAIN[pf.yong] + '(' + ['목', '화', '토', '금', '수'][pf.yong] + ') — 원국 안에 ' + pc(pf.yongPct) + '.');
    var out = {}; Object.keys(res).forEach(function (k) { out[k] = res[k]; });
    out.rows = rows; out.evidence = { lines: (evd.lines || []).concat(extra), terms: evd.terms || [], conds: evd.conds || [] };
    out.premium = { version: VERSION, dataVersion: D.version, profile: PROFILE_V, tensions: Object.keys(pf.tensions), mods: mods.map(function (m) { return m.id; }), scenes: scenesUsed, base: !!base, key: key ? pf.yongG : null };
    return out;
  }

  var api = { version: VERSION, on: on, setRemote: setRemote, covers: covers, apply: apply, profile: profile, pickMods: pickMods, TENSIONS: Object.keys(T) };
  R.PremiumDepth = api; root.MantraPremiumDepth = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
