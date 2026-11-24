/* 특기·적성 분석 — 계산 로직. 문안은 aptitude-data.js(MantraAptitudeData)에만 둔다. 2026-11-25
   · 엔진(engine.js) M.compute 결과를 읽기만 한다: 오행 세력 ch.weights(pct·groups·tgPct)·신강약 ch.strength·
     투간 ch.cells.*.stemTG·지장간 ch.cells.*.hidden·월령(월지 정기) ch.cells.month.branchTG·12신살 ch.cells.*.sinsal12·
     통근 M.analyzeNatalRoot(ch)·통합 용신 ch.unified(보완 참고 한 줄에만)·격국 MantraGyeokStructure.analyze(있으면 기본 정보 한 줄).
     엔진 계산식·점수는 바꾸지 않는다(tests/aptitude-sim.cjs 불변 검사).
   · 근거 요소(십성 묶음·십성·오행·강약·뿌리·신살)를 가중 평균해 항목 점수를 내고, 기여가 큰 요소를 근거로 보여 준다.
     한 항목의 근거는 가능한 한 서로 다른 종류(십성/오행/강약·뿌리/신살) 2가지 이상으로 채운다 — 하나로 단정하지 않기.
   · 용신은 점수에 넣지 않는다(취미를 용신에 기계적으로 잇지 않기). 같은 명식이면 같은 결과(난수·날짜 없음).
   · 데이터가 없는 요소는 빼고 계산하며, 남은 근거가 없으면 해석을 만들지 않는다(ok:false · NO_DATA).
   · 사용: MantraAptitude.build(Manse, ch) */
(function (G) {
  'use strict';
  var VERSION = 'aptitude-20261125-1';
  var D = function () { return G.MantraAptitudeData; };
  var TGS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  var GOF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
  var EL_K = ['목', '화', '토', '금', '수'], EL_H = ['木', '火', '土', '金', '水'];
  var POS = ['year', 'month', 'day', 'hour'], POSK = { year: '년', month: '월', day: '일', hour: '시' };
  var HID_W = { '정기': 1, '중기': 0.55, '여기': 0.35 };

  // ── 가중치(로직 설정). 키: g0~g4 십성 묶음 · 십성 이름 · e0~e4 오행 · strong · root · yeokma · t:특성 ──
  var CFG = {
    talent: {
      expr: { g1: 1, '상관': 0.6, '식신': 0.3, e1: 0.5, e0: 0.4, '편인': 0.3 },
      craft: { '식신': 0.9, g4: 0.5, '정인': 0.3, e3: 0.6, e2: 0.4, '정관': 0.3, root: 0.3 },
      body: { g0: 0.6, g1: 0.5, e1: 0.5, e0: 0.4, strong: 0.6, '겁재': 0.3, yeokma: 0.3 },
      study: { g4: 0.9, '편인': 0.5, e4: 0.7, e3: 0.3, '정관': 0.2 },
      strat: { g0: 0.5, '겁재': 0.5, '편관': 0.6, '편재': 0.5, e3: 0.3, e4: 0.3, strong: 0.3 },
    },
    field: {
      sport: { g0: 0.6, g1: 0.4, g3: 0.4, e1: 0.4, e0: 0.3, e3: 0.3, strong: 0.5, '겁재': 0.3, '편관': 0.3 },
      art: { g1: 0.9, '상관': 0.5, '편인': 0.5, e1: 0.5, e0: 0.5, e4: 0.2 },
      intel: { g4: 0.9, '편인': 0.4, '정인': 0.3, e4: 0.6, e3: 0.3, '정관': 0.2 },
      outdoor: { e0: 0.6, e1: 0.4, '편재': 0.5, '식신': 0.4, g0: 0.3, yeokma: 0.6, strong: 0.3 },
      life: { '정재': 0.6, '식신': 0.6, e2: 0.6, e3: 0.5, '정관': 0.3, root: 0.3 },
      social: { g2: 0.6, g1: 0.5, '정관': 0.4, '편재': 0.3, e1: 0.4, e0: 0.2 },
    },
    trait: {
      compete: { g0: 0.6, '겁재': 0.6, '편관': 0.5, e1: 0.3, e3: 0.3, strong: 0.4 },
      energy: { g1: 0.7, e1: 0.6, e0: 0.4, strong: 0.5, g0: 0.3, yeokma: 0.2 },
      discipline: { g3: 0.8, '정관': 0.4, e2: 0.4, e3: 0.4, g4: 0.3, root: 0.2 },
      tactic: { g4: 0.5, '편인': 0.3, g2: 0.5, '편재': 0.3, e4: 0.6, '편관': 0.3 },
      ind: { '비견': 0.7, '편인': 0.4, g4: 0.3, root: 0.3 },
      coop: { g2: 0.5, '정관': 0.5, '식신': 0.3, '정재': 0.3 },
      skill: { '식신': 0.7, g4: 0.5, '정인': 0.2, e3: 0.6, e2: 0.3, g3: 0.3 },
    },
    sport: {
      combat: { 't:compete': 0.9, 't:discipline': 0.6, 't:energy': 0.4, '편관': 0.4, '겁재': 0.3, e3: 0.4, e1: 0.2 },
      ball: { 't:tactic': 0.7, 't:coop': 0.7, 't:compete': 0.5, 't:energy': 0.4, g2: 0.3, g1: 0.3 },
      endur: { 't:discipline': 0.6, 't:ind': 0.5, 't:energy': 0.5, e2: 0.4, e0: 0.4, root: 0.3, strong: 0.3 },
      water: { 't:skill': 0.5, 't:ind': 0.4, 't:discipline': 0.3, e4: 0.7, g4: 0.4, '정인': 0.2 },
      tech: { 't:skill': 0.8, 't:discipline': 0.5, 't:ind': 0.4, e3: 0.5, '식신': 0.3, 't:tactic': 0.2 },
      racket: { 't:tactic': 0.7, 't:compete': 0.6, 't:energy': 0.4, 't:skill': 0.3, e4: 0.3, e1: 0.3, '상관': 0.2 },
    },
    axis: {
      solo_team: { L: { '비견': 0.6, g4: 0.4, '편인': 0.3 }, R: { g2: 0.5, '정관': 0.4, g1: 0.3, '겁재': 0.2 } },
      compete_record: { L: { '겁재': 0.6, '편관': 0.5, e1: 0.3, '상관': 0.3 }, R: { '정관': 0.4, g4: 0.4, e2: 0.4, '비견': 0.3 } },
      skill_stamina: { L: { '식신': 0.5, g4: 0.4, e3: 0.5 }, R: { g0: 0.4, e1: 0.4, e0: 0.4, strong: 0.5 } },
      duel_self: { L: { '겁재': 0.5, '편관': 0.5, '상관': 0.3 }, R: { '비견': 0.5, '정인': 0.4, '식신': 0.3 } },
      rule_adapt: { L: { '정관': 0.6, '정인': 0.4, e2: 0.4 }, R: { '편인': 0.4, '편재': 0.4, '상관': 0.3, e4: 0.4 } },
    },
    // 수준 문턱(여러 사주 분포로 맞춘 값 — tests/aptitude-sim.cjs 가 분포를 보고한다)
    lv: { hi: 0.53, mid: 0.37 },
    rec: { strong: 0.5, interest: 0.4 },
    axisDeg: { slight: 0.08, clear: 0.22 },
    bipolarBal: 0.06, bipolarHi: 0.2,
    minV: 0.18,   // 근거로 보여 줄 최소 요소 값
    phraseV: 0.45, // '넉넉해·드러나 있어' 같은 해석 문장을 붙일 최소 요소 값
  };

  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var r1 = function (x) { return Math.round(x * 10) / 10; };
  var r3 = function (x) { return Math.round(x * 1000) / 1000; };
  var jong = function (w) { var c = String(w).slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  var J = function (w, a, b) { return w + (jong(w) ? a : b); };
  var num = function (x) { return typeof x === 'number' && isFinite(x); };

  // ── 1. 근거 요소 추출: { id: { v(0~1)|null, kind, label } } ──
  function features(M, ch) {
    var F = {}, W = ch.weights || {}, cells = ch.cells || {}, hourKnown = ch.hourKnown !== false && !!ch.pillars && !!ch.pillars.hour;
    var pos = POS.filter(function (p) { return cells[p] && (p !== 'hour' || hourKnown); });
    var exposed = {}; TGS.forEach(function (t) { exposed[t] = []; });
    pos.forEach(function (p) { var t = cells[p].stemTG; if (p !== 'day' && exposed[t]) exposed[t].push(POSK[p] + '간'); });
    var hid = [0, 0, 0, 0, 0];
    pos.forEach(function (p) { (cells[p].hidden || []).forEach(function (h) { var g = GOF[h.tg]; if (g != null) hid[g] += HID_W[h.label] || 0.35; }); });
    var mc = cells.month && GOF[cells.month.branchTG];
    var groups = W.groups, tgPct = W.tgPct, pct = W.pct;
    for (var k = 0; k < 5; k++) {
      if (!groups || !num(groups[k])) { F['g' + k] = { v: null, kind: '십성' }; continue; }
      var xs = []; TGS.forEach(function (t) { if (GOF[t] === k) xs = xs.concat(exposed[t]); });
      var v = 0.45 * clamp(groups[k] / 35) + 0.2 * Math.min(xs.length, 2) / 2 + 0.2 * Math.min(hid[k], 1) + 0.15 * (mc === k ? 1 : 0);
      var det = [];
      if (xs.length) det.push('천간 ' + xs.join('·'));
      if (mc === k) det.push('월지 정기');
      F['g' + k] = { v: clamp(v), kind: '십성', label: D().GN[k] + ' ' + r1(groups[k]) + '%' + (det.length ? ' (' + det.join(', ') + ')' : '') };
    }
    TGS.forEach(function (t) {
      if (!tgPct || !num(tgPct[t])) { F[t] = { v: null, kind: '십성' }; return; }
      var x = exposed[t];
      F[t] = { v: clamp(tgPct[t] / 22 + 0.2 * x.length), kind: '십성', label: t + ' ' + r1(tgPct[t]) + '%' + (x.length ? ' (천간 ' + x.join('·') + ')' : '') };
    });
    for (var e = 0; e < 5; e++) {
      if (!pct || !num(pct[e])) { F['e' + e] = { v: null, kind: '오행' }; continue; }
      F['e' + e] = { v: clamp(pct[e] / 35), kind: '오행', label: '오행 ' + EL_K[e] + '(' + EL_H[e] + ') ' + r1(pct[e]) + '%' };
    }
    var st = ch.strength;
    F.strong = st && num(st.help) ? { v: clamp((st.help - 35) / 45), kind: '강약·뿌리', label: '나를 돕는 힘 ' + Math.round(st.help) + '% (' + (st.zone || '') + ')' } : { v: null, kind: '강약·뿌리' };
    var rt = null; try { rt = M && M.analyzeNatalRoot ? M.analyzeNatalRoot(ch) : null; } catch (er) { rt = null; }
    F.root = rt && num(rt.natalRootScore) ? { v: clamp(rt.natalRootScore / 100), kind: '강약·뿌리', label: '일간 뿌리 ' + (rt.natalRootLevel || '') + '(' + rt.natalRootScore + ')' } : { v: null, kind: '강약·뿌리' };
    var ym = pos.filter(function (p) { return cells[p].sinsal12 === '역마살'; });
    F.yeokma = pos.length ? { v: ym.length ? 1 : 0, kind: '신살', label: '역마살(' + ym.map(function (p) { return POSK[p] + '지'; }).join('·') + ')' } : { v: null, kind: '신살' };
    return { F: F, hourKnown: hourKnown, root: rt };
  }

  // ── 2. 항목 점수: 가중 평균 + 기여 큰 근거(서로 다른 종류 2가지 이상 우선) ──
  function scoreOf(F, spec, T) {
    var sw = 0, sum = 0, parts = [];
    Object.keys(spec).forEach(function (id) {
      var w = spec[id], f;
      if (id.indexOf('t:') === 0) { var t = T && T[id.slice(2)]; f = t ? { v: t.score, kind: '성향', label: t.label, lo: !!t.lo } : { v: null }; }
      else f = F[id] || { v: null };
      if (f.v == null) return;
      sw += w; sum += w * f.v; parts.push({ id: id, w: w, v: f.v, kind: f.kind, label: f.label, lo: f.lo });
    });
    if (!sw) return { ok: false, score: 0, basis: [], kinds: 0 };
    parts.forEach(function (p) { p.c = p.w * p.v / sw; });
    var byC = function (a, b) { return (b.c - a.c) || (b.v - a.v) || (a.id < b.id ? -1 : 1); };
    var cand = parts.filter(function (p) { return p.v >= CFG.minV; }).sort(byC);
    // 모든 요소가 약하면(값은 있음) 그중 큰 것을 근거로 보여 준다 — 낮은 수준(은은함)의 근거도 실제 값이다
    if (cand.length < 2) cand = cand.concat(parts.filter(function (p) { return p.v < CFG.minV && (p.v > 0 || p.id !== 'yeokma'); }).sort(byC)).slice(0, Math.max(2, cand.length));
    var basis = cand.slice(0, 3);
    var kinds = function (a) { var s = {}; a.forEach(function (p) { s[p.kind] = 1; }); return Object.keys(s).length; };
    if (basis.length === 3 && kinds(basis) < 2) {
      var other = cand.slice(3).filter(function (p) { return p.kind !== basis[0].kind; })[0];
      if (other) basis[2] = other;
    }
    return { ok: true, score: sum / sw, basis: basis.map(function (p) { return { id: p.id, kind: p.kind, label: p.label, v: r3(p.v), c: r3(p.c), lo: !!p.lo }; }), kinds: kinds(basis), used: parts.length, total: Object.keys(spec).length };
  }
  function levelOf(s) { return s >= CFG.lv.hi ? 'hi' : s >= CFG.lv.mid ? 'mid' : 'lo'; }
  function confOf(sc, hourKnown) {
    if (!sc.ok || !sc.basis.length) return 'low';
    if (sc.kinds < 2 || sc.used < sc.total || !hourKnown) return 'partial';
    return 'full';
  }
  // 근거 → '이 명식에서는 …' 연결 문장(성향 근거는 이름, 원국 근거는 FACTOR 문안)
  // 원국 근거는 값이 충분할 때만(v ≥ CFG.phraseV) FACTOR 문안을 쓰고, 성향 근거는 '은은함'이 아닌 것만 이름으로 잇는다
  function linkOf(basis, T) {
    var raw = basis.filter(function (b) { return b.kind !== '성향' && D().FACTOR[b.id] && b.v >= CFG.phraseV; }).slice(0, 2).map(function (b) { return D().FACTOR[b.id]; });
    var tr = basis.filter(function (b) { return b.kind === '성향' && !b.lo; }).map(function (b) { return b.label; });
    var out = [];
    if (tr.length) out.push('이 명식에서는 ' + tr.join(', ') + ' 성향이 이 분야와 이어져요.');
    raw.forEach(function (t, i) { out.push((i === 0 && !tr.length ? '이 명식에서는 ' : '또 ') + t + '.'); });
    var lbl = basis.map(function (b) { return b.label; }).join(', ');
    if (!out.length && basis.length) out.push(basis.every(function (b) { return b.v < CFG.minV; }) ? '이 분야와 이어지는 기운(' + lbl + ')이 이 명식에서는 적은 편이에요. 그래서 주된 방향보다는 곁들이는 쪽으로 보면 돼요.' : '이 명식에서는 ' + lbl + ' 근거가 함께 보이지만, 어느 하나가 크게 앞서지는 않아요.');
    return out.join(' ');
  }
  function item(F, hourKnown, area, txt, spec, T) {
    var sc = scoreOf(F, spec, T), lv = sc.ok && sc.basis.length ? levelOf(sc.score) : null;
    var o = { id: txt.id, area: area, name: txt.name, easy: txt.easy, ok: !!lv, score: r3(sc.score), level: lv, levelK: lv ? D().LEVEL[lv] : '', basis: sc.basis,
      confidence: confOf(sc, hourKnown) };
    o.confK = D().CONF[o.confidence];
    o.interp = lv ? txt[lv] : D().NO_DATA;
    o.link = lv ? linkOf(sc.basis) : '';
    o.acts = lv ? (txt.acts || []).slice() : [];
    o.care = lv ? (txt.care || '') : '';
    if (txt.long) o.long = txt.long;
    return o;
  }

  // ── 3. 운동·스포츠 상세 ──
  function sportBlock(F, hourKnown) {
    var C = CFG.trait, TX = D().TRAIT, T = {}, traits = [];
    TX.forEach(function (tx) {
      if (tx.bipolar) {
        var a = scoreOf(F, C.ind), b = scoreOf(F, C.coop);
        if (!a.ok || !b.ok) { traits.push({ id: tx.id, area: 'trait', name: tx.name, easy: tx.easy, ok: false, interp: D().NO_DATA, basis: [], confidence: 'low', confK: D().CONF.low }); return; }
        var d = a.score - b.score, side = d > CFG.bipolarBal ? 'ind' : d < -CFG.bipolarBal ? 'coop' : 'bal';
        var basis = side === 'coop' ? b.basis : side === 'ind' ? a.basis : a.basis.slice(0, 2).concat(b.basis.slice(0, 1));
        var la = levelOf(a.score), lb = levelOf(b.score);
        T.ind = { score: a.score, label: '혼자 하는 쪽(' + D().LEVEL[la] + ')', lo: la === 'lo' || side === 'coop' }; T.coop = { score: b.score, label: '함께 맞추는 쪽(' + D().LEVEL[lb] + ')', lo: lb === 'lo' || side === 'ind' };
        traits.push({ id: tx.id, area: 'trait', name: tx.name, easy: tx.easy, ok: true, bipolar: true, side: side, sideK: side === 'ind' ? '독립 쪽' : side === 'coop' ? '협력 쪽' : '균형',
          score: r3(Math.max(a.score, b.score)), ind: r3(a.score), coop: r3(b.score), level: side === 'bal' ? 'mid' : Math.abs(d) >= CFG.bipolarHi ? 'hi' : 'mid', basis: basis,
          interp: tx[side], link: linkOf(basis), confidence: confOf(side === 'coop' ? b : a, hourKnown) });
        traits[traits.length - 1].levelK = traits[traits.length - 1].sideK; traits[traits.length - 1].confK = D().CONF[traits[traits.length - 1].confidence];
        return;
      }
      var it = item(F, hourKnown, 'trait', tx, C[tx.id]);
      traits.push(it);
      if (it.ok) T[tx.id] = { score: it.score, label: tx.name + '(' + it.levelK + ')', lo: it.level === 'lo' };
    });
    // 활동 방식 5축
    var axes = D().AXIS.map(function (ax) {
      var sp = CFG.axis[ax.id], L = scoreOf(F, sp.L), R = scoreOf(F, sp.R);
      if (!L.ok || !R.ok) return { id: ax.id, name: ax.name, ok: false, side: 'bal', text: D().NO_DATA, basis: [] };
      var d = L.score - R.score, ad = Math.abs(d), deg = ad < CFG.axisDeg.slight ? 'bal' : ad < CFG.axisDeg.clear ? 'slight' : 'clear';
      var side = deg === 'bal' ? 'bal' : d > 0 ? 'L' : 'R';
      var text = side === 'bal' ? J(ax.L, '과', '와') + ' ' + ax.R + ' 사이에서 크게 기울지 않아요. 둘 다 편하게 즐길 수 있는 쪽이에요.' : (deg === 'clear' ? ax[side + 'txt'].replace('조금 더 ', '더 ') : ax[side + 'txt']);
      return { id: ax.id, name: ax.name, ok: true, L: ax.L, R: ax.R, d: r3(d), pos: r3(Math.max(-1, Math.min(1, d / 0.5))), side: side, deg: deg, degK: D().AXIS_DEG[deg],
        sideK: side === 'bal' ? '균형' : ax[side], text: text, basis: (side === 'R' ? R.basis : L.basis).slice(0, 2) };
    });
    var axMap = {}; axes.forEach(function (a) { axMap[a.id] = a; });
    // 종목 6분야
    var cats = D().SPORT.map(function (sx) {
      var sc = scoreOf(F, CFG.sport[sx.id], T);
      return { sx: sx, sc: sc };
    });
    var order = cats.map(function (c, i) { return i; }).sort(function (a, b) { return (cats[b].sc.score - cats[a].sc.score) || (a - b); });
    var categories = cats.map(function (c, i) {
      var sx = c.sx, sc = c.sc, rank = order.indexOf(i);
      if (!sc.ok || !sc.basis.length) return { id: sx.id, name: sx.name, ok: false, rec: null, recK: '', interp: D().NO_DATA, basis: [], confidence: 'low', confK: D().CONF.low, rank: rank };
      var rec = rank < 2 && sc.score >= CFG.rec.strong ? 'strong' : rank < 4 && sc.score >= CFG.rec.interest ? 'interest' : 'pref';
      var fitLines = [], misLine = '';
      Object.keys(sx.fit || {}).forEach(function (aid) {
        var a = axMap[aid]; if (!a || !a.ok || a.side === 'bal') return;
        if (a.side === sx.fit[aid]) fitLines.push(a.sideK);
        else if (!misLine && sx.mis && sx.mis[aid]) misLine = sx.mis[aid];
      });
      var consider = [sx.consider];
      if (fitLines.length) consider.push('이 분야의 ' + fitLines.join('·') + ' 성격이 명식에서 보이는 활동 방식과 겹쳐요.');
      if (misLine) consider.push(misLine);
      return { id: sx.id, name: sx.name, ok: true, ex: sx.ex.slice(), score: r3(sc.score), rank: rank, rec: rec, recK: D().REC[rec],
        feature: sx.feature, myeongri: sx.myeongri, basis: sc.basis, link: linkOf(sc.basis), why: sx.why[rec], consider: consider, long: sx.long,
        confidence: confOf(sc, hourKnown), confK: D().CONF[confOf(sc, hourKnown)] };
    });
    return { traits: traits, axes: axes, categories: categories, T: T };
  }

  // ── 4. 최종 추천 ──
  function finalBlock(ch, talents, fields, sport) {
    var acts = [], seen = {};
    var push = function (name, rec, from, why) { if (!name || seen[name] || acts.length >= 5) return; seen[name] = 1; acts.push({ name: name, rec: rec, recK: D().REC[rec], from: from, why: why }); };
    var sf = fields.filter(function (f) { return f.id === 'sport'; })[0];
    var cats = sport.categories.filter(function (c) { return c.ok; }).sort(function (a, b) { return a.rank - b.rank; });
    var nSport = sf && sf.ok && sf.level !== 'lo' ? 2 : 1;
    cats.slice(0, nSport).forEach(function (c) { push(c.ex[0], c.rec, '운동 · ' + c.name, c.why); });
    var LV2REC = { hi: 'strong', mid: 'interest', lo: 'pref' };
    var fo = fields.filter(function (f) { return f.ok && f.id !== 'sport'; }).sort(function (a, b) { return (b.score - a.score) || (a.id < b.id ? -1 : 1); });
    fo.slice(0, 2).forEach(function (f) { push(f.acts[0], LV2REC[f.level], '적성 · ' + f.name, f.interp); });
    var to = talents.filter(function (t) { return t.ok; }).sort(function (a, b) { return (b.score - a.score) || (a.id < b.id ? -1 : 1); });
    to.forEach(function (t) { if (acts.length < 4) push(t.acts[0], LV2REC[t.level], '특기 · ' + t.name, t.interp); });
    fo.slice(2).forEach(function (f) { if (acts.length < 3) push(f.acts[0], LV2REC[f.level], '적성 · ' + f.name, f.interp); });
    // 장기 숙련 활동: 점수 0.6 + 숙련·규율 성향 0.4
    var T = sport.T, sd = T.skill && T.discipline ? (T.skill.score + T.discipline.score) / 2 : 0;
    var longCand = cats.map(function (c) { return { name: c.long, from: '운동 · ' + c.name, s: c.score * 0.6 + sd * 0.4 }; })
      .concat(fo.map(function (f) { return { name: f.long, from: '적성 · ' + f.name, s: f.score * 0.6 + sd * 0.4 }; }))
      .filter(function (x) { return x.name; }).sort(function (a, b) { return b.s - a.s; });
    var lt = longCand[0] || null;
    var trs = sport.traits.filter(function (t) { return t.ok && !t.bipolar; });
    var sk = trs.filter(function (t) { return t.id === 'skill' || t.id === 'discipline'; });
    var longTerm = lt ? { name: lt.name, from: lt.from, why: '숙련·규율 쪽 성향(' + sk.map(function (t) { return t.name + ' ' + t.levelK; }).join(', ') + ')과 이 분야의 흐름을 함께 보고 골랐어요. 오래 붙잡을수록 단계가 쌓이는 활동이에요.' } : null;
    // 보완할 성향: 가장 은은한 성향 하나
    var low = trs.slice().sort(function (a, b) { return (a.score - b.score) || (a.id < b.id ? -1 : 1); })[0];
    var complement = low ? { id: low.id, name: low.name, levelK: low.levelK, text: D().COMP[low.id] || '' } : null;
    var yongNote = '';
    var u = ch.unified; if (u && num(u.yong)) yongNote = D().YONG_NOTE.replace('{yongIs}', EL_K[u.yong] + '(' + EL_H[u.yong] + ')' + (jong(EL_K[u.yong]) ? '이에요' : '예요'));
    return { activities: acts, longTerm: longTerm, complement: complement, yongNote: yongNote };
  }

  function build(M, ch) {
    var DD = D();
    if (!DD) return { ok: false, version: VERSION, reason: '문안 파일(aptitude-data.js)이 없어요' };
    if (!ch || !ch.weights || !ch.cells || !ch.pillars) return { ok: false, version: VERSION, reason: '명식 계산 결과가 없어요' };
    var fx = features(M, ch), F = fx.F, hk = fx.hourKnown;
    var talents = DD.TALENT.map(function (t) { return item(F, hk, 'talent', t, CFG.talent[t.id]); });
    var fields = DD.FIELD.map(function (f) { return item(F, hk, 'field', f, CFG.field[f.id]); });
    var sport = sportBlock(F, hk);
    var fin = finalBlock(ch, talents, fields, sport);
    var top = function (a) { return a.filter(function (x) { return x.ok; }).sort(function (x, y) { return (y.score - x.score) || (x.id < y.id ? -1 : 1); })[0]; };
    var tt = top(talents), tf = top(fields);
    var axLean = sport.axes.filter(function (a) { return a.ok && a.side !== 'bal'; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); }).slice(0, 2);
    var lines = [];
    if (tt) lines.push(tt.name + ' — ' + tt.interp);
    if (tf) lines.push(tf.name + ' — ' + tf.interp);
    lines.push(axLean.length ? '활동 방식은 ' + axLean.map(function (a) { return a.sideK; }).join('·') + ' 쪽이 조금 더 드러나요. 종목을 고를 때 이 방식을 먼저 맞춰 보면 오래 가기 쉬워요.' : '활동 방식은 어느 한쪽으로 크게 기울지 않아요. 여러 방식을 번갈아 즐기기 좋은 편이에요.');
    // 기본 정보(엔진 값 그대로)
    var dS = ch.pillars.day.s, dEl = M.stemEl(dS), mb = ch.pillars.month.b, sea = ch.weights.seasonal && ch.weights.seasonal.command;
    var gname = ''; try { var gs = G.MantraGyeokStructure && G.MantraGyeokStructure.analyze(M, ch); if (gs && gs.rep) gname = gs.rep.name + (gs.rep.type === 'hold' && gs.rep.sub ? '(' + gs.rep.sub + ')' : ''); } catch (er) { gname = ''; }
    var base = [
      '일간 ' + (M.STEM ? M.STEM[dS] : '') + (M.STEM_K ? M.STEM_K[dS] : '') + '(' + EL_K[dEl] + ')',
      '월령 ' + (M.BR ? M.BR[mb] : '') + (sea ? '(' + sea.elK + ' 계절)' : ''),
      ch.strength ? ch.strength.zone + ' · 돕는 힘 ' + Math.round(ch.strength.help) + '%' : '',
      fx.root ? '뿌리 ' + fx.root.natalRootLevel : '',
      gname ? '격국 ' + gname : '',
    ].filter(Boolean);
    var notes = DD.METHOD.slice(); if (!hk) notes.unshift(DD.NO_HOUR);
    return {
      ok: true, version: VERSION, dataVersion: DD.VERSION, hourKnown: hk,
      summary: { head: tt && tf ? DD.SUMMARY_HEAD.replace('{talent}', tt.name).replace('{field}', tf.name) : '', lines: lines, base: base, topTalent: tt ? tt.id : null, topField: tf ? tf.id : null },
      talents: talents, fields: fields,
      sport: { traits: sport.traits, axes: sport.axes, categories: sport.categories },
      final: fin, notes: notes, disclaimer: DD.DISCLAIMER,
    };
  }

  var API = { VERSION: VERSION, CFG: CFG, build: build, features: features };
  G.MantraAptitude = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
