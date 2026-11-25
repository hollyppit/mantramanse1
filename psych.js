/* 심리 솔루션 — 계산 로직. 문안은 psych-data.js(MantraPsychData)에만 둔다. 2026-11-25
   · 엔진(engine.js) M.compute 결과를 읽기만 한다(엔진 값 불변 — tests/psych-sim.cjs 검사):
       십성 비율 ch.weights.tgPct · 십성 묶음 ch.weights.groups(비겁·식상·재성·관성·인성) · 신강약 ch.strength.help
       조후 ch.climate(temp·hum) · 원국 관계 ch.relations · 신살 ch.sinsal · 공망 ch.cells.*.gongmangY · 통합 용신 ch.unified.yong
       대운 ch.daeun.list · 세운 M.seunRange · 월운 M.monthsOfYear + M.luckItem · 운↔원국 관계 M.luckRelations
   · 세 부분
       ① 마음의 상처 결(잠재적 트라우마): 규칙 12개(PATTERNS)로 0~1 점수, 문턱 이상 상위 3개. 근거는 엔진 값 그대로 보여 준다.
       ② 시기별 스트레스·심리 상태: 대운 10개·세운 3년·올해 월운 12개. 엔진 흐름 등급(순풍·보통·주의·부담) + 운이 원국 자리를 건드리는 관계
          + ①의 결이 다시 건드려지는지(trigger)로 긴장도 3단계. 상태는 운의 십성 묶음과 12운성 상징으로 쓴다.
       ③ 솔루션: 지금 시기·상처 결에 맞는 현대 심리학 자기 돌봄 기법 + 용신 오행 생활 보완(명리)
   · 같은 명식·같은 기준 시각이면 같은 결과(난수 없음). 기준 시각은 opt.now(없으면 지금).
   · 사용: MantraPsych.build(Manse, ch, { now }) */
(function (G) {
  'use strict';
  var VERSION = 'psych-20261125-1';
  var D = function () { return G.MantraPsychData; };
  var GOF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
  var GN = ['비겁', '식상', '재성', '관성', '인성'];
  var POSK = { year: '년', month: '월', day: '일', hour: '시' };
  var BAND_V = { '부담': 2, '주의': 1.2, '보통': 0.6, '순풍': 0 };

  var CFG = {
    show: 0.35,       // 상처 결을 보여 줄 최소 점수
    maxPatterns: 3,
    level: { hi: 2.3, mid: 1.2 },   // 시기 긴장도 문턱(대운·세운·월운 공통)
    hitW: { '충': 0.6, '형': 0.45, '원진': 0.35, '귀문관': 0.35, '천간충': 0.35, '해': 0.25, '파': 0.2 },
    hitPos: { month: 1, day: 1, year: 0.6, hour: 0.5 },
    reactW: 0.5
  };

  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var r1 = function (x) { return Math.round(x * 10) / 10; };
  var r3 = function (x) { return Math.round(x * 1000) / 1000; };
  var pct = function (x) { return Math.round(x) + '%'; };

  // ── 원국 특징 ──
  function features(ch) {
    var tg = ch.weights.tgPct || {}, g = ch.weights.groups || [0, 0, 0, 0, 0];
    var help = ch.strength && typeof ch.strength.help === 'number' ? ch.strength.help : 50;
    var rel = (ch.relations || []).filter(function (r) { return r.members && r.members.every(function (m) { return POSK[m]; }); });
    var sin = {}; Object.keys(ch.sinsal || {}).forEach(function (pos) { (ch.sinsal[pos] || []).forEach(function (x) { (sin[x.name] = sin[x.name] || []).push(pos); }); });
    return { tg: tg, g: g, help: help, rel: rel, sin: sin, cl: ch.climate || { temp: 0, hum: 0 }, cells: ch.cells };
  }
  var relAt = function (F, pos, types) { return F.rel.filter(function (r) { return r.members.indexOf(pos) >= 0 && types.indexOf(r.type) >= 0; }); };
  var relName = function (r) { return r.name + '(' + r.members.map(function (m) { return POSK[m]; }).join('·') + ')'; };

  /* 규칙: 각 규칙은 { v, basis:[{kind,label}] } 를 돌려준다. v 는 0~1 */
  var PATTERNS = {
    unseen: function (F) {
      var b = [], v = 0, g4 = F.g[4], g2 = F.g[2];
      if (g4 < 10) { v = Math.max(v, clamp((10 - g4) / 10) * 0.9 + 0.1); b.push({ kind: '십성', label: '인성 ' + pct(g4) + '로 약함' }); }
      if (g2 >= 25 && g4 > 0 && g4 < 22) { v = Math.max(v, clamp((g2 - 20) / 25) * 0.8 + 0.2); b.push({ kind: '구조', label: '재성 ' + pct(g2) + '이 인성 ' + pct(g4) + '을 누름(재극인)' }); }
      return { v: v, basis: b };
    },
    pressed: function (F) {
      var b = [], v = 0, g3 = F.g[3], pk = F.tg['편관'] || 0, sik = F.tg['식신'] || 0;
      if (g3 >= 28 && F.help < 45) { v = Math.max(v, clamp((g3 - 22) / 25) * 0.7 + clamp((45 - F.help) / 30) * 0.3); b.push({ kind: '십성', label: '관성 ' + pct(g3) + ' · 일간 힘 ' + Math.round(F.help) + '(약한 편)' }); }
      if (pk >= 18 && sik < 5) { v = Math.max(v, clamp((pk - 12) / 20) * 0.8 + 0.2); b.push({ kind: '구조', label: '편관 ' + pct(pk) + '을 다스릴 식신 ' + pct(sik) }); }
      return { v: v, basis: b };
    },
    silenced: function (F) {
      var b = [], v = 0, pi = F.tg['편인'] || 0, sik = F.tg['식신'] || 0, g1 = F.g[1], g4 = F.g[4];
      if (pi >= 15 && sik > 0 && sik < 15) { v = Math.max(v, clamp((pi - 10) / 20) * 0.8 + 0.2); b.push({ kind: '구조', label: '편인 ' + pct(pi) + '이 식신 ' + pct(sik) + '을 막음(도식)' }); }
      if (g1 < 5 && g4 >= 25) { v = Math.max(v, clamp((5 - g1) / 5) * 0.4 + clamp((g4 - 20) / 25) * 0.5); b.push({ kind: '십성', label: '식상 ' + pct(g1) + ' · 인성 ' + pct(g4) }); }
      return { v: v, basis: b };
    },
    taken: function (F) {
      var b = [], v = 0, g0 = F.g[0], g2 = F.g[2], gj = F.tg['겁재'] || 0;
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
      var pi = F.tg['편인'] || 0; if (v > 0 && pi >= 12) { v = Math.min(1, v + 0.15); b.push({ kind: '십성', label: '편인 ' + pct(pi) + '(예민한 직관)' }); }
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
    Object.keys(PATTERNS).forEach(function (id) {
      var r = PATTERNS[id](F), t = DD.PATTERNS[id];
      if (!t || !r.basis.length) return;
      var kinds = {}; r.basis.forEach(function (x) { kinds[x.kind] = 1; });
      var v = r.v * (Object.keys(kinds).length >= 2 ? 1 : 0.92);   // 근거 종류가 하나뿐이면 조금 낮춘다(하나로 단정하지 않기)
      out.push({ id: id, score: r3(clamp(v)), basis: r.basis, name: t.name, hook: t.hook, scenes: t.scenes, myeongri: t.myeongri, guard: t.guard, heal: t.heal, tools: t.tools, trigger: t.trigger });
    });
    out.sort(function (a, b) { return (b.score - a.score) || (a.id < b.id ? -1 : 1); });
    return out.filter(function (p) { return p.score >= CFG.show; }).slice(0, CFG.maxPatterns);
  }

  // ── 시기 하나 읽기(대운·세운·월운 공통) ──
  function period(M, ch, x, pats, F) {
    var DD = D();
    var gS = GOF[x.stemTG], gB = GOF[x.branchTG];
    var band = x.score && x.score.band;
    var base = BAND_V[band] != null ? BAND_V[band] : 0.6;
    var hits = [], hitV = 0;
    try {
      M.luckRelations(ch, { s: x.s, b: x.b }).rels.forEach(function (r) {
        var w = CFG.hitW[r.type]; if (!w) return;
        r.members.forEach(function (m) {
          if (!POSK[m]) return;
          hitV += w * CFG.hitPos[m];
          if (!hits.some(function (h) { return h.pos === m; })) hits.push({ pos: m, type: r.type, name: r.name, text: DD.HIT[m] });
        });
      });
    } catch (e) { }
    hitV = Math.min(1.2, hitV);
    var el = [M.stemEl(x.s), M.BR_EL[x.b]];
    var keys = {}; if (gS != null) keys['g' + gS] = 1; if (gB != null) keys['g' + gB] = 1;
    if (hits.length) keys.clash = 1; if (hits.some(function (h) { return h.pos === 'day'; })) keys.dayHit = 1;
    if (el[0] === 1 || el[1] === 1) keys.hot = 1; if (el[0] === 4 || el[1] === 4) keys.cold = 1;
    var react = pats.filter(function (p) { return p.trigger.some(function (k) { return keys[k]; }); }).map(function (p) { return { id: p.id, name: p.name }; });
    var rs = 0; react.forEach(function (r) { pats.forEach(function (p) { if (p.id === r.id && p.score > rs) rs = p.score; }); });
    var sv = base + hitV + CFG.reactW * rs;
    var level = sv >= CFG.level.hi ? 'hi' : sv >= CFG.level.mid ? 'mid' : 'lo';
    var mainG = gB != null ? gB : gS, outG = gS != null ? gS : gB;
    var un = DD.UNSEONG[x.unseong] || null;
    var stress = [];
    if (outG != null) stress.push(DD.GROUP['g' + outG].stress);
    if (mainG != null && mainG !== outG) stress.push(DD.GROUP['g' + mainG].stress);
    hits.filter(function (h) { return CFG.hitW[h.type] >= 0.3; }).slice(0, 2).forEach(function (h) { stress.push(h.text + '(' + h.name + ')'); });
    var tools = [];
    var addT = function (id) { if (id && DD.TOOLS[id] && tools.indexOf(id) < 0) tools.push(id); };
    if (react.length) addT(pats.filter(function (p) { return p.id === react[0].id; })[0].tools[0]);
    if (mainG != null) DD.GROUP['g' + mainG].tools.forEach(addT);
    if (level === 'hi') addT('rhythm');
    return {
      gz: M.gzNameK ? M.gzNameK({ s: x.s, b: x.b }) : '', stemTG: x.stemTG, branchTG: x.branchTG, groups: [outG, mainG], band: band,
      level: level, levelK: DD.LEVEL[level], levelNote: DD.LEVEL_NOTE[level], v: r3(sv),
      stress: stress, hits: hits, react: react,
      state: (mainG != null ? DD.GROUP['g' + mainG].state : ''), mood: un ? { k: un.k, t: un.t, unseong: x.unseong } : null,
      tools: tools.slice(0, 2)
    };
  }

  function build(M, ch, opt) {
    var DD = D(); opt = opt || {};
    if (!DD) return { ok: false, version: VERSION, reason: '문안 파일(psych-data.js)이 없어요' };
    if (!ch || !ch.weights || !ch.cells || !ch.pillars || !ch.daeun) return { ok: false, version: VERSION, reason: '명식 계산 결과가 없어요' };
    var now = typeof opt.now === 'number' ? opt.now : Date.now();
    var F = features(ch), pats = patternsOf(F);
    // 대운
    var cur = null; ch.daeun.list.forEach(function (x) { if (x.startMs <= now) cur = x; });
    var daeun = ch.daeun.list.map(function (x) {
      var p = period(M, ch, x, pats, F); p.startAge = x.startAge; p.startYear = x.startYear; p.now = x === cur; return p;
    });
    // 세운 3년
    var Y = new Date(now).getUTCFullYear(), seun = [];
    try { M.seunRange(ch, Y, Y + 2).forEach(function (x) { var p = period(M, ch, x, pats, F); p.year = x.year; p.age = x.age; seun.push(p); }); } catch (e) { }
    // 올해 월운 (입춘 기준 해) — 세운 평가를 부모로
    var months = [];
    try {
      var sy = M.seunRange(ch, Y, Y)[0], list = M.monthsOfYear(Y);
      list.forEach(function (m, i) {
        var it = M.luckItem(ch, { s: m.s, b: m.b }, 'wolun', sy && sy.ev);
        var p = period(M, ch, it, pats, F); p.startMs = m.startMs; p.termName = m.termName; p.idx = i;
        p.now = m.startMs <= now && (i === 11 || list[i + 1].startMs > now);
        months.push(p);
      });
    } catch (e) { }
    // 솔루션
    var curP = daeun.filter(function (p) { return p.now; })[0] || null, thisY = seun[0] || null;
    var toolIds = [], reasons = {};
    var addT = function (id, why) { if (!DD.TOOLS[id]) return; if (toolIds.indexOf(id) < 0) toolIds.push(id); (reasons[id] = reasons[id] || []).indexOf(why) < 0 && reasons[id].push(why); };
    pats.forEach(function (p) { p.tools.slice(0, 2).forEach(function (id) { addT(id, '"' + p.name + '" 결'); }); });
    [[curP, '지금 대운'], [thisY, Y + '년']].forEach(function (a) { if (a[0]) a[0].tools.forEach(function (id) { addT(id, a[1]); }); });
    var tools = toolIds.slice(0, 5).map(function (id) { var t = DD.TOOLS[id]; return { id: id, name: t.name, from: t.from, how: t.how.slice(), why: reasons[id] }; });
    var yong = ch.unified && typeof ch.unified.yong === 'number' ? ch.unified.yong : (ch.yong && typeof ch.yong.yong === 'number' ? ch.yong.yong : null);
    var elem = yong != null && DD.ELEMENT[yong] ? { el: yong, name: DD.ELEMENT[yong].name, mind: DD.ELEMENT[yong].mind, acts: DD.ELEMENT[yong].acts.slice(), space: DD.ELEMENT[yong].space, note: DD.ELEMENT_NOTE, basis: (ch.unified && ch.unified.primaryName ? ch.unified.primaryName + ' 기준 ' : '') + '용신 ' + DD.ELEMENT[yong].name } : null;
    // 한눈에 보기
    var heavy = daeun.filter(function (p) { return p.level === 'hi'; }).map(function (p) { return p.startAge + '세'; });
    var nextHi = seun.filter(function (p) { return p.level === 'hi'; })[0] || null;
    var summary = {
      pattern: pats[0] ? pats[0].name : null,
      now: curP ? { age: curP.startAge, gz: curP.gz, levelK: curP.levelK, level: curP.level, mood: curP.mood ? curP.mood.k : '' } : null,
      year: thisY ? { year: thisY.year, levelK: thisY.levelK, level: thisY.level } : null,
      heavyDaeun: heavy, nextHiYear: nextHi ? nextHi.year : null,
      tool: tools[0] ? tools[0].name : null, elem: elem ? elem.name : null
    };
    return {
      ok: true, version: VERSION, hourKnown: !!(ch.pillars.hour), intro: DD.INTRO, disclaimer: DD.DISCLAIMER, safety: DD.SAFETY,
      summary: summary, patterns: pats, noPattern: pats.length ? '' : DD.NO_PATTERN,
      daeun: daeun, seun: seun, months: months, tools: tools, elem: elem, year: Y
    };
  }

  var API = { VERSION: VERSION, CFG: CFG, build: build, features: features, PATTERN_IDS: Object.keys(PATTERNS) };
  G.MantraPsych = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
