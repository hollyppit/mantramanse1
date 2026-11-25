/* 심리 솔루션 — 계산 로직(2판, 2026-11-25). 문안은 psych-data.js(MantraPsychData)에만 둔다.
   · 엔진(engine.js) M.compute 결과를 읽기만 한다(엔진 값 불변 — tests/psych-sim.cjs 검사).
   · 2026-11-25 3판(사용자 지시): 사용자 입력(확인 응답·메모·마음 기록·실천 고르기)과 질문을 모두 뺐다. 상담하는 사람이 읽고 설명하는 화면.
   · ① 잠재적 트라우마: 상처 결 규칙 12개(WOUNDS, 1판 방식). 문턱 이상 상위 3개, 근거는 엔진 값. (2판의 주제 12개 THEMES 는 2026-11-25 사용자 요청으로 뺐다 — git c956aa1)
   · (아래 두 줄은 2판 설명) 주제마다 방식(mode)이 여럿이고, 명식 전체 조합(십성 묶음·십성 위치·일간 힘·
       월령·합충형·신살·조후·오행·지금 대운)으로 방식을 가른다. 한 글자·한 십성만으로 카드를 만들지 않는다(근거 2개 이상).
       '제 얘기는 아니에요' 응답 주제는 빼고 다음 후보로 채운다. 같은 주제는 한 번만.
   · ② 시기: 대운·세운 3년·올해 월운마다 주제·감정 2~3개·마음의 온도(12운성)·돌아볼 질문. 좋고 나쁨이 아니라 변화의 두드러짐(중립).
   · ③ 교운기: 지금 대운·다음 대운, 시작·끝, 대운수 계산 기준, 앞뒤 1년 전환 구간
   · ④ 곡선: 해마다 운↔원국 자리 부딪힘·대운 전환 근접·기운 흔들림 정도(설명은 D.GRAPH.how).
   · ⑤ 솔루션: 지금 시기(감정별 다루는 법·교운기) + 패턴별(필요한 것·작은 실천) + 명리 보완(용신 오행)
   · 같은 명식·같은 기준 시각이면 같은 결과. 사용: MantraPsych.build(Manse, ch, { now }) */
(function (G) {
  'use strict';
  var VERSION = 'psych-20261125-2';
  var D = function () { return G.MantraPsychData; };
  var GOF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
  var GN = ['비겁', '식상', '재성', '관성', '인성'];
  var POS = ['year', 'month', 'day', 'hour'], POSK = { year: '년', month: '월', day: '일', hour: '시' };
  var YEAR_MS = 365.2425 * 86400000;

  var CFG = {
    wound: { show: 0.35, max: 3, reactW: 0.5 },
    level: { hi: 1.1, mid: 0.6 },
    hitW: { '충': 0.6, '형': 0.45, '원진': 0.35, '귀문관': 0.35, '천간충': 0.35, '해': 0.25, '파': 0.2 },
    hitPos: { month: 1, day: 1, year: 0.6, hour: 0.5 },
    border: [42, 58],
    transYears: 1,
    graph: { hit: 0.45, trans: 0.3, nov: 0.25 }
  };

  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var r1 = function (x) { return Math.round(x * 10) / 10; };
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  var r3 = function (x) { return Math.round(x * 1000) / 1000; };
  var pct = function (x) { return Math.round(x) + '%'; };
  function fillT(t, fill) { return !fill ? t : String(t).replace(/\{(\w+)\}/g, function (m, k) { return fill[k] != null ? fill[k] : m; }); }

  // ── 원국 특징 ──
  function features(M, ch) {
    var tg = ch.weights.tgPct || {}, g = ch.weights.groups || [0, 0, 0, 0, 0], el = ch.weights.pct || [0, 0, 0, 0, 0];
    var st = ch.strength || {};
    var rel = (ch.relations || []).filter(function (r) { return r.members && r.members.every(function (m) { return POSK[m]; }); });
    var sin = {}; Object.keys(ch.sinsal || {}).forEach(function (pos) { (ch.sinsal[pos] || []).forEach(function (x) { (sin[x.name] = sin[x.name] || []).push(pos); }); });
    var tgv = function (n) { return tg[n] || 0; };
    return { M: M, ch: ch, tg: tgv, g: g, el: el, help: typeof st.help === 'number' ? st.help : 50, zone: st.zone || '', dr: !!st.deukryeong, dj: !!st.deukji,
      rel: rel, sin: sin, cl: ch.climate || { temp: 0, hum: 0 }, cells: ch.cells, P: ch.pillars, mode: ch.unified && ch.unified.mode };
  }
  var relAt = function (F, pos, types, kind) { return F.rel.filter(function (r) { return r.members.indexOf(pos) >= 0 && types.indexOf(r.type) >= 0 && (!kind || r.kind === kind); }); };
  var relName = function (r) { return r.name + '(' + r.members.map(function (m) { return POSK[m]; }).join('·') + ')'; };
  // ── 잠재적 트라우마: 상처 결 규칙 12개(1판 방식으로 되돌림, 사용자 요청 2026-11-25) ──
  /* 규칙: 각 규칙은 { v, basis:[{kind,label}] } 를 돌려준다. v 는 0~1 */
  var WOUNDS = {
    unseen: function (F) {
      var b = [], v = 0, g4 = F.g[4], g2 = F.g[2];
      if (g4 < 10) { v = Math.max(v, clamp((10 - g4) / 10) * 0.9 + 0.1); b.push({ kind: '십성', label: '인성 ' + pct(g4) + '로 약함' }); }
      if (g2 >= 25 && g4 > 0 && g4 < 22) { v = Math.max(v, clamp((g2 - 20) / 25) * 0.8 + 0.2); b.push({ kind: '구조', label: '재성 ' + pct(g2) + '이 인성 ' + pct(g4) + '을 누름(재극인)' }); }
      return { v: v, basis: b };
    },
    pressed: function (F) {
      var b = [], v = 0, g3 = F.g[3], pk = F.tg('편관') || 0, sik = F.tg('식신') || 0;
      if (g3 >= 28 && F.help < 45) { v = Math.max(v, clamp((g3 - 22) / 25) * 0.7 + clamp((45 - F.help) / 30) * 0.3); b.push({ kind: '십성', label: '관성 ' + pct(g3) + ' · 일간 힘 ' + Math.round(F.help) + '(약한 편)' }); }
      if (pk >= 18 && sik < 5) { v = Math.max(v, clamp((pk - 12) / 20) * 0.8 + 0.2); b.push({ kind: '구조', label: '편관 ' + pct(pk) + '을 다스릴 식신 ' + pct(sik) }); }
      return { v: v, basis: b };
    },
    silenced: function (F) {
      var b = [], v = 0, pi = F.tg('편인') || 0, sik = F.tg('식신') || 0, g1 = F.g[1], g4 = F.g[4];
      if (pi >= 15 && sik > 0 && sik < 15) { v = Math.max(v, clamp((pi - 10) / 20) * 0.8 + 0.2); b.push({ kind: '구조', label: '편인 ' + pct(pi) + '이 식신 ' + pct(sik) + '을 막음(도식)' }); }
      if (g1 < 5 && g4 >= 25) { v = Math.max(v, clamp((5 - g1) / 5) * 0.4 + clamp((g4 - 20) / 25) * 0.5); b.push({ kind: '십성', label: '식상 ' + pct(g1) + ' · 인성 ' + pct(g4) }); }
      return { v: v, basis: b };
    },
    taken: function (F) {
      var b = [], v = 0, g0 = F.g[0], g2 = F.g[2], gj = F.tg('겁재') || 0;
      if (g0 >= 35 && g2 < 12) { v = Math.max(v, clamp((g0 - 30) / 25) * 0.7 + clamp((12 - g2) / 12) * 0.3); b.push({ kind: '구조', label: '비겁 ' + pct(g0) + '이 적은 재성 ' + pct(g2) + '을 나눔(군겁쟁재)' }); }
      if (gj >= 20) { v = Math.max(v, clamp((gj - 15) / 25) * 0.6 + 0.15); b.push({ kind: '십성', label: '겁재 ' + pct(gj) }); }
      return { v: v, basis: b };
    },
    burden: function (F) {
      var b = [], v = 0, g2 = F.g[2];
      if (g2 >= 30 && F.help < 45) { v = clamp((g2 - 25) / 25) * 0.6 + clamp((45 - F.help) / 30) * 0.4; b.push({ kind: '구조', label: '재성 ' + pct(g2) + ' · 일간 힘 ' + Math.round(F.help) + '(재다신약)' }); }
      return { v: v, basis: b };
    },
    roots: function (F) {
      var b = [], v = 0;
      ['month', 'year'].forEach(function (pos) {
        relAt(F, pos, ['충', '형']).forEach(function (r) {
          var w = (r.type === '충' ? 0.6 : 0.4) * (pos === 'month' ? 1 : 0.7) * (r.name.indexOf('자형') >= 0 ? 0.6 : 1);
          v = Math.min(1, v + w); b.push({ kind: '글자 관계', label: relName(r) + ' — ' + POSK[pos] + '지(' + (pos === 'month' ? '성장 환경' : '어린 시절') + ') 흔들림' });
        });
      });
      return { v: v, basis: dedupe(b) };
    },
    close: function (F) {
      var b = [], v = 0;
      relAt(F, 'day', ['충', '형', '원진']).forEach(function (r) {
        if (r.kind !== 'branch') return;
        v = Math.min(1, v + (r.type === '충' ? 0.6 : r.type === '형' ? 0.4 : 0.25)); b.push({ kind: '글자 관계', label: relName(r) + ' — 일지(가까운 관계 자리)' });
      });
      if (F.cells.day && F.cells.day.gongmangY) { v = Math.min(1, v + 0.25); b.push({ kind: '신살', label: '일지가 년주 기준 공망' }); }
      return { v: v, basis: b };
    },
    antenna: function (F) {
      var b = [], v = 0;
      F.rel.filter(function (r) { return r.type === '귀문관' || r.type === '원진'; }).forEach(function (r) {
        v = Math.min(1, v + (r.type === '귀문관' ? 0.42 : 0.22)); b.push({ kind: '글자 관계', label: relName(r) });
      });
      var pi = F.tg('편인') || 0; if (v > 0 && pi >= 12) { v = Math.min(1, v + 0.15); b.push({ kind: '십성', label: '편인 ' + pct(pi) + '(예민한 직관)' }); }
      return { v: v, basis: b };
    },
    alone: function (F) {
      var b = [], v = 0;
      ['고신살', '과숙살', '고란살'].forEach(function (n) { if (F.sin[n]) { v = Math.min(1, v + 0.3); b.push({ kind: '신살', label: n + '(' + F.sin[n].map(function (p) { return POSK[p]; }).join('·') + ')' }); } });
      if (F.help >= 72) { v = Math.min(1, v + clamp((F.help - 65) / 25) * 0.5); b.push({ kind: '강약', label: '일간 힘 ' + Math.round(F.help) + '(아주 강함)' }); }
      return { v: b.length >= 2 ? v : v * 0.7, basis: b };
    },
    burnout: function (F) {
      var t = F.cl.temp || 0, h = F.cl.hum || 0;
      if (t < 0.55) return { v: 0, basis: [] };
      return { v: clamp((t - 0.45) / 0.6) * 0.8 + (h < 0 ? 0.15 : 0), basis: [{ kind: '조후', label: '원국 온도 ' + r1(t) + (h < 0 ? ' · 건조 ' + r1(h) : '') + '(뜨거운 편)' }] };
    },
    frozen: function (F) {
      var t = F.cl.temp || 0, h = F.cl.hum || 0;
      if (t > -0.55) return { v: 0, basis: [] };
      return { v: clamp((-t - 0.45) / 0.6) * 0.8 + (h > 0 ? 0.15 : 0), basis: [{ kind: '조후', label: '원국 온도 ' + r1(t) + (h > 0 ? ' · 습도 ' + r1(h) : '') + '(찬 편)' }] };
    },
    storm: function (F) {
      var b = [], v = 0;
      ['양인살', '백호대살', '괴강살'].forEach(function (n) { if (F.sin[n]) { v = Math.min(1, v + 0.3 + 0.05 * (F.sin[n].length - 1)); b.push({ kind: '신살', label: n + '(' + F.sin[n].map(function (p) { return POSK[p]; }).join('·') + ')' }); } });
      return { v: v, basis: b };
    }
  };
  function dedupe(b) { var s = {}; return b.filter(function (x) { if (s[x.label]) return false; s[x.label] = 1; return true; }); }

  function patternsOf(F) {
    var DD = D(), out = [];
    Object.keys(WOUNDS).forEach(function (id) {
      var r = WOUNDS[id](F), t = DD.PATTERNS[id];
      if (!t || !r.basis.length) return;
      var kinds = {}; r.basis.forEach(function (x) { kinds[x.kind] = 1; });
      var v = r.v * (Object.keys(kinds).length >= 2 ? 1 : 0.92);   // 근거 종류가 하나뿐이면 조금 낮춘다(하나로 단정하지 않기)
      out.push({ id: id, score: r3(clamp(v)), basis: r.basis, name: t.name, hook: t.hook, scenes: t.scenes, myeongri: t.myeongri, guard: t.guard, heal: t.heal, tools: t.tools, trigger: t.trigger });
    });
    out.sort(function (a, b) { return (b.score - a.score) || (a.id < b.id ? -1 : 1); });
    return out.filter(function (p) { return p.score >= CFG.wound.show; }).slice(0, CFG.wound.max);
  }


  // ── 시기별 감정(사용자 요청: 조급함·지침·과욕처럼 구체적으로) ──
  function emotions(F, x, hits, gS, gB, novel) {
    var has = function (g) { return gS === g || gB === g; }, un = x.unseong, weak = F.help < 45, strong = F.help >= 55;
    var el = [F.M.stemEl(x.s), F.M.BR_EL[x.b]], fire = el[0] === 1 || el[1] === 1, water = el[0] === 4 || el[1] === 4, t = F.cl.temp || 0;
    var tgs = [x.stemTG, x.branchTG], sc = {};
    var add = function (k, v) { sc[k] = (sc[k] || 0) + v; };
    var unIn = function (a) { return a.indexOf(un) >= 0; };
    if (has(3) && weak) add('rush', 0.7); if (has(2) && F.g[0] >= 25) add('rush', 0.6); if (fire && t > 0.3) add('rush', 0.35); if (unIn(['관대', '목욕'])) add('rush', 0.2);
    if (has(1) && weak) add('tired', 0.75); if (has(2) && weak) add('tired', 0.6); if (unIn(['병', '사', '쇠'])) add('tired', 0.45);
    if (has(2) && strong) add('greed', 0.75); if (has(0) && unIn(['제왕', '건록'])) add('greed', 0.55); if (tgs.indexOf('겁재') >= 0) add('greed', 0.3);
    if (has(1) && strong) add('excite', 0.7); if (unIn(['장생', '관대', '목욕'])) add('excite', 0.25);
    if (tgs.indexOf('편인') >= 0) add('anxious', 0.65); else if (has(4)) add('anxious', 0.4); if (water && t < 0) add('anxious', 0.25); if (unIn(['목욕', '태'])) add('anxious', 0.2);
    if (has(3) && strong) add('stuffy', 0.75); if (unIn(['묘'])) add('stuffy', 0.2);
    if (unIn(['절', '묘', '사'])) add('lonely', 0.5); if (has(0) && F.g[2] < 10) add('lonely', 0.25);
    var core = hits.filter(function (h) { return (h.pos === 'day' || h.pos === 'month') && CFG.hitW[h.type] >= 0.35; }).length; if (core) add('sharp', 0.3 + 0.18 * core);
    if (t < -0.3 && (has(4) || water)) add('heavy', 0.6); if (unIn(['사', '묘'])) add('heavy', 0.25);
    if (tgs.indexOf('겁재') >= 0) add('rival', 0.6); else if (has(0)) add('rival', 0.35);
    if (has(3) && weak) add('duty', 0.55); if (has(2) && weak) add('duty', 0.4);
    if (unIn(['장생', '태', '양'])) add('hope', 0.45); if (novel) add('hope', 0.35);
    if (unIn(['쇠', '묘', '양']) && !hits.length) add('calm', 0.45);
    // 바탕값(약하게): 십성 묶음·12운성마다 기본 감정 — 신호가 적은 시기도 2개는 나오게
    var GDEF = { 0: 'rival', 1: weak ? 'tired' : 'excite', 2: weak ? 'duty' : 'greed', 3: weak ? 'duty' : 'stuffy', 4: 'anxious' };
    var UDEF = { '장생': 'hope', '목욕': 'sharp', '관대': 'excite', '건록': 'greed', '제왕': 'greed', '쇠': 'calm', '병': 'tired', '사': 'heavy', '묘': 'calm', '절': 'lonely', '태': 'hope', '양': 'calm' };
    if (gB != null) add(GDEF[gB], 0.2); if (gS != null && gS !== gB) add(GDEF[gS], 0.12); if (UDEF[un]) add(UDEF[un], 0.15); var GDEF2 = { 0: 'greed', 1: 'rush', 2: 'rush', 3: 'rush', 4: 'heavy' }; if (gB != null) add(GDEF2[gB], 0.1); else if (gS != null) add(GDEF2[gS], 0.1);
    var DD = D(), ks = Object.keys(sc).sort(function (a, b) { return (sc[b] - sc[a]) || (a < b ? -1 : 1); });
    var pick = ks.filter(function (k) { return sc[k] >= 0.4; }).slice(0, 3); if (pick.length < 2) pick = ks.slice(0, 2);
    return pick.map(function (k) { var e = DD.EMOTION[k]; return { id: k, name: e.name, when: e.when, care: e.care, v: r2(sc[k]) }; });
  }

  // ── 시기 하나(대운·세운·월운 공통) ──
  function hitsOf(F, x) {
    var out = [], v = 0;
    try {
      F.M.luckRelations(F.ch, { s: x.s, b: x.b }).rels.forEach(function (r) {
        var w = CFG.hitW[r.type]; if (!w) return;
        r.members.forEach(function (m) { if (!POSK[m]) return; v += w * CFG.hitPos[m]; if (!out.some(function (h) { return h.pos === m; })) out.push({ pos: m, type: r.type, name: r.name, text: D().HIT[m] }); });
      });
    } catch (e) { }
    return { list: out, v: Math.min(1.2, v) };
  }
  var novOf = function (F, g) { if (g == null) return 0; var s = F.g[g]; return s < 10 ? 0.6 : s >= 35 ? 0.5 : 0.15; };
  function period(F, x) {
    var DD = D(), gS = GOF[x.stemTG], gB = GOF[x.branchTG], mainG = gB != null ? gB : gS;
    var h = hitsOf(F, x), nov = Math.max(novOf(F, gB), novOf(F, gS) * 0.6);
    var el2 = [F.M.stemEl(x.s), F.M.BR_EL[x.b]], keys = {};
    if (gS != null) keys['g' + gS] = 1; if (gB != null) keys['g' + gB] = 1; if (h.list.length) keys.clash = 1; if (h.list.some(function (q) { return q.pos === 'day'; })) keys.dayHit = 1;
    if (el2[0] === 1 || el2[1] === 1) keys.hot = 1; if (el2[0] === 4 || el2[1] === 4) keys.cold = 1;
    var react = (F.wounds || []).filter(function (w) { return w.trigger.some(function (k) { return keys[k]; }); }).map(function (w) { return { id: w.id, name: w.name }; });
    var sv = h.v + nov, level = sv >= CFG.level.hi ? 'hi' : sv >= CFG.level.mid ? 'mid' : 'lo';
    var un = DD.UNSEONG[x.unseong] || null, G0 = mainG != null ? DD.GROUP['g' + mainG] : null;
    return {
      gz: F.M.gzNameK({ s: x.s, b: x.b }), stemTG: x.stemTG, branchTG: x.branchTG, group: mainG, level: level, levelK: DD.LEVEL[level], v: r3(sv),
      theme: G0 ? G0.theme : '',
      emotions: emotions(F, x, h.list, gS, gB, mainG != null && F.g[mainG] < 10),
      mood: un ? { k: un.k, t: un.t, unseong: x.unseong } : null, react: react,
      hits: h.list.filter(function (q) { return CFG.hitW[q.type] >= 0.3; }).slice(0, 2),
      basis: [x.stemTG + '(천간) · ' + x.branchTG + '(지지)'].concat(x.unseong ? ['12운성 ' + x.unseong] : []).concat(h.list.slice(0, 2).map(function (q) { return q.name + ' → ' + DD.HIT[q.pos]; }))
    };
  }

  // ── 교운기 ──
  function transition(F, now) {
    var DD = D(), L = F.ch.daeun.list, dn = F.ch.daeun, i = -1;
    L.forEach(function (x, k) { if (x.startMs <= now) i = k; });
    var cur = i >= 0 ? L[i] : null, next = L[i + 1] || null, prev = i > 0 ? L[i - 1] : null;
    var win = CFG.transYears * YEAR_MS;
    var inWin = (cur && Math.abs(now - cur.startMs) <= win) || (next && Math.abs(next.startMs - now) <= win);
    var grp = function (x) { if (!x) return null; var g = GOF[x.branchTG]; return g != null ? g : GOF[x.stemTG]; };
    var gC = grp(cur), gN = grp(next), gP = grp(prev);
    var after = !!(cur && now - cur.startMs <= win && prev);   // 새 대운 시작 1년 안이면 이전→지금, 아니면 지금→다음
    var A = after ? gP : gC, B = after ? gC : gN;
    var fmtD = function (ms) { var d = new Date(ms + 9 * 3600000); return d.getUTCFullYear() + '.' + (d.getUTCMonth() + 1) + '.' + d.getUTCDate(); };
    var basis = fillT(DD.TRANSITION.basis, { dir: dn.forward ? DD.TRANSITION.dirF : DD.TRANSITION.dirB, jie: dn.jie && dn.jie.name || '절입', days: r2(dn.days), num: dn.num, exact: r2(dn.exact) });
    return {
      cur: cur ? { gz: F.M.gzNameK({ s: cur.s, b: cur.b }), startAge: cur.startAge, start: fmtD(cur.startMs), end: next ? fmtD(next.startMs) : '', tg: cur.stemTG + '/' + cur.branchTG, theme: gC != null ? DD.GROUP['g' + gC].theme : '' } : null,
      next: next ? { gz: F.M.gzNameK({ s: next.s, b: next.b }), startAge: next.startAge, start: fmtD(next.startMs), tg: next.stemTG + '/' + next.branchTG, theme: gN != null ? DD.GROUP['g' + gN].theme : '', inYears: r2((next.startMs - now) / YEAR_MS) } : null,
      inWindow: !!inWin, after: after, basis: basis,
      from: A != null ? DD.GROUP['g' + A].learned : '', to: B != null ? DD.GROUP['g' + B].adjust : '',
      forward: !!dn.forward, nowAge: r2((now - F.ch.utc) / YEAR_MS)
    };
  }

  // ── 곡선 그래프 ──
  function curve(F, now) {
    var M = F.M, L = F.ch.daeun.list, by = F.ch.solar && F.ch.solar.y ? F.ch.solar.y : new Date(F.ch.utc).getUTCFullYear();
    var last = L.length ? L[L.length - 1].startAge + 10 : 80, span = Math.min(100, Math.max(60, last));
    var dHit = {}, raw = [], bounds = L.map(function (x) { return x.startYear; });
    for (var a = 0; a <= span; a++) {
      var Y = by + a, yp; try { yp = M.yearPillarOf(Y); } catch (e) { yp = null; } if (!yp) continue;
      var du = null; L.forEach(function (x) { if (x.startYear <= Y) du = x; });
      var hs = hitsOf(F, yp).v, hd = 0;
      if (du) { var key = du.s + '-' + du.b; if (dHit[key] == null) dHit[key] = hitsOf(F, du).v; hd = dHit[key]; }
      var tr = 0; bounds.forEach(function (b) { tr = Math.max(tr, clamp(1 - Math.abs(Y - b) / 2)); });
      var gS = GOF[M.tenGod(F.P.day.s, yp.s)], gB = GOF[M.tenGod(F.P.day.s, M.mainHidden(yp.b))], gD = du ? (GOF[du.branchTG] != null ? GOF[du.branchTG] : GOF[du.stemTG]) : null;
      var nov = clamp((novOf(F, gS) * 0.3 + novOf(F, gB) * 0.3 + novOf(F, gD) * 0.6) / 0.9);
      raw.push({ age: a, year: Y, v: CFG.graph.hit * clamp(hs * 0.7 + hd * 0.4) + CFG.graph.trans * tr + CFG.graph.nov * nov });
    }
    var SW = [1, 2, 3, 2, 1];   // 5년 가중 평균으로 부드럽게(한 해짜리 튐보다 시기의 흐름을 보이게)
    var pts = raw.map(function (p, i) { var s = 0, n = 0; for (var k = -2; k <= 2; k++) if (raw[i + k]) { s += raw[i + k].v * SW[k + 2]; n += SW[k + 2]; } return { age: p.age, year: p.year, v: r3(s / n) }; });
    var bands = L.map(function (x, i) {
      var p = period(F, x), nx = L[i + 1];
      return { i: i, startAge: x.startAge, endAge: nx ? nx.startAge : x.startAge + 10, startYear: x.startYear, gz: p.gz, tg: x.stemTG + '/' + x.branchTG, theme: p.theme, basis: p.basis, emotions: p.emotions.map(function (e) { return e.name; }), now: x.startMs <= now && (!nx || nx.startMs > now) };
    });
    return { points: pts, bands: bands, transitions: L.slice(1).map(function (x) { return { age: x.startAge, year: x.startYear }; }), nowAge: r2((now - F.ch.utc) / YEAR_MS), span: span, how: D().GRAPH.how };
  }

  function build(M, ch, opt) {
    var DD = D(); opt = opt || {};
    if (!DD) return { ok: false, version: VERSION, reason: '문안 파일(psych-data.js)이 없어요' };
    if (!ch || !ch.weights || !ch.cells || !ch.pillars || !ch.daeun) return { ok: false, version: VERSION, reason: '명식 계산 결과가 없어요' };
    var now = typeof opt.now === 'number' ? opt.now : Date.now();
    var F = features(M, ch);
    var cur = null; ch.daeun.list.forEach(function (x) { if (x.startMs <= now) cur = x; });
    var wounds = patternsOf(F); F.wounds = wounds;
    var daeun = ch.daeun.list.map(function (x) { var p = period(F, x); p.startAge = x.startAge; p.startYear = x.startYear; p.now = x === cur; return p; });
    var Y = new Date(now).getUTCFullYear(), seun = [];
    try { M.seunRange(ch, Y, Y + 2).forEach(function (x) { var p = period(F, x); p.year = x.year; p.age = x.age; seun.push(p); }); } catch (e) { }
    var months = [];
    try {
      var list = M.monthsOfYear(Y), d0 = ch.pillars.day.s;
      list.forEach(function (m, i) {
        var x = { s: m.s, b: m.b, stemTG: M.tenGod(d0, m.s), branchTG: M.tenGod(d0, M.mainHidden(m.b)), unseong: M.unseong(d0, m.b) };
        var p = period(F, x); p.startMs = m.startMs; p.termName = m.termName; p.idx = i; p.now = m.startMs <= now && (i === 11 || list[i + 1].startMs > now); months.push(p);
      });
    } catch (e) { }
    var tr = transition(F, now), gr = curve(F, now);
    var curP = daeun.filter(function (p) { return p.now; })[0] || null, yearP = seun[0] || null;
    // 지금 시기에 올라오기 쉬운 감정: 지금 대운 + 올해(겹치면 한 번)
    var nowEmo = [], seenE = {};
    [curP, yearP].forEach(function (p) { if (p) p.emotions.forEach(function (e) { if (!seenE[e.id]) { seenE[e.id] = 1; nowEmo.push(e); } }); });
    nowEmo = nowEmo.slice(0, 4);
    // 솔루션
    var yong = ch.unified && typeof ch.unified.yong === 'number' ? ch.unified.yong : null;
    var elem = yong != null && DD.ELEMENT && DD.ELEMENT[yong] ? { name: DD.ELEMENT[yong].name, mind: DD.ELEMENT[yong].mind, acts: DD.ELEMENT[yong].acts.slice(), note: DD.ELEMENT_NOTE, basis: (ch.unified.primaryName ? ch.unified.primaryName + ' 기준 ' : '') + '용신 ' + DD.ELEMENT[yong].name } : null;
    // 심리 솔루션 종합 카드(사용자 지시 2026-11-25: 결마다가 아니라 한 카드에 현대 심리학 + 명리를 함께)
    var techs = [], seenT = {};
    wounds.forEach(function (w) { w.tools.forEach(function (id) { var t = DD.TOOLS[id]; if (!t) return; if (!seenT[id]) { seenT[id] = { id: id, name: t.name, from: t.from, how: t.how.slice(), why: [] }; techs.push(seenT[id]); } if (seenT[id].why.indexOf(w.name) < 0) seenT[id].why.push(w.name); }); });
    techs.sort(function (x, y) { return y.why.length - x.why.length; });
    var rem = wounds.slice(0, 2).map(function (w) { var m = DD.MSOL && DD.MSOL[w.id]; return m ? { name: m.name, why: m.why, from: w.name } : null; }).filter(Boolean);
    var macts = [], seenA = {};
    wounds.forEach(function (w) { var m = DD.MSOL && DD.MSOL[w.id]; if (m) m.acts.forEach(function (t) { if (!seenA[t] && macts.length < 5) { seenA[t] = 1; macts.push(t); } }); });
    var solution = {
      psych: { techs: techs.slice(0, 4), now: nowEmo.map(function (e) { return { name: e.name, care: e.care }; }) },
      myeongri: { remedies: rem, acts: macts, elem: elem, transition: tr.from || tr.to ? { from: tr.from, to: tr.to, inWindow: tr.inWindow } : null }
    };
    var top = wounds[0] || null;
    return {
      ok: true, version: VERSION, hourKnown: !!ch.pillars.hour, year: Y,
      overview: {
        pattern: top ? { text: top.hook, name: top.name } : null,
        daeun: tr.cur ? { text: tr.cur.startAge + '세~ ' + tr.cur.gz + ' 대운', theme: tr.cur.theme, next: tr.next ? tr.next.startAge + '세 · ' + tr.next.start : '', inWindow: tr.inWindow } : null,
        emotions: nowEmo.map(function (e) { return e.name; }),
        solution: techs[0] || rem[0] ? [techs[0] ? techs[0].name : '', rem[0] ? rem[0].name : ''].filter(Boolean).join(' + ') : nowEmo[0] ? nowEmo[0].care : ''
      },
      wounds: wounds, noWound: wounds.length ? '' : DD.NO_THEME, daeun: daeun, seun: seun, months: months, transition: tr, graph: gr, solution: solution
    };
  }

  var API = { VERSION: VERSION, CFG: CFG, build: build, features: features, WOUND_IDS: Object.keys(WOUNDS) };
  G.MantraPsych = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
