/* 심리 솔루션 — 계산 로직(2판, 2026-11-25). 문안은 psych-data.js(MantraPsychData)에만 둔다.
   · 엔진(engine.js) M.compute 결과를 읽기만 한다(엔진 값 불변 — tests/psych-sim.cjs 검사).
   · 세 가지 출처를 섞지 않는다: 명리 해석(이 파일) · 내가 확인한 경험(opt.state.answers/notes) · 내가 기록한 현재 상태(opt.state.history)
   · ① 마음에 남은 경험과 반복되는 패턴: 주제 12개(THEMES). 주제마다 방식(mode)이 여럿이고, 명식 전체 조합(십성 묶음·십성 위치·일간 힘·
       월령·합충형·신살·조후·오행·지금 대운)으로 방식을 가른다. 한 글자·한 십성만으로 카드를 만들지 않는다(근거 2개 이상).
       '제 얘기는 아니에요' 응답 주제는 빼고 다음 후보로 채운다. 같은 주제는 한 번만.
   · ② 시기: 대운·세운 3년·올해 월운마다 주제·감정 2~3개·마음의 온도(12운성)·돌아볼 질문. 좋고 나쁨이 아니라 변화의 두드러짐(중립).
   · ③ 교운기: 지금 대운·다음 대운, 시작·끝, 대운수 계산 기준, 앞뒤 1년 전환 구간
   · ④ 곡선: 해마다 운↔원국 자리 부딪힘·대운 전환 근접·기운 흔들림 정도(설명은 D.GRAPH.how). 사용자 기록이 있을 때만 기록선.
   · 같은 명식·같은 기준 시각·같은 응답이면 같은 결과. 사용: MantraPsych.build(Manse, ch, { now, state }) */
(function (G) {
  'use strict';
  var VERSION = 'psych-20261125-2';
  var D = function () { return G.MantraPsychData; };
  var GOF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
  var GN = ['비겁', '식상', '재성', '관성', '인성'];
  var POS = ['year', 'month', 'day', 'hour'], POSK = { year: '년', month: '월', day: '일', hour: '시' };
  var EL = ['목', '화', '토', '금', '수'];
  var YEAR_MS = 365.2425 * 86400000;
  var TG_MEAN = { 비견: '나와 같은 힘 · 독립', 겁재: '경쟁 · 내 몫 지키기', 식신: '꾸준한 표현과 실행', 상관: '날카로운 표현 · 기준에 대한 반발', 편재: '기회 · 넓은 활동 반경', 정재: '현실 · 관리 · 챙김', 편관: '압박 · 긴장 · 강한 기준', 정관: '규칙 · 평가 · 책임', 편인: '직관 · 생각이 깊어짐', 정인: '돌봄 · 배움 · 받아들임' };

  var CFG = {
    show: 0.3, maxCards: 5,
    level: { hi: 1.1, mid: 0.6 },
    hitW: { '충': 0.6, '형': 0.45, '원진': 0.35, '귀문관': 0.35, '천간충': 0.35, '해': 0.25, '파': 0.2 },
    hitPos: { month: 1, day: 1, year: 0.6, hour: 0.5 },
    border: [42, 58],
    transYears: 1,
    graph: { hit: 0.45, trans: 0.3, nov: 0.25 }
  };

  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  var r3 = function (x) { return Math.round(x * 1000) / 1000; };
  var pct = function (x) { return Math.round(x) + '%'; };

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
  // 십성이 놓인 자리: [{pos, part, tg, label}]
  function where(F, names) {
    var out = [];
    POS.forEach(function (pos) {
      var c = F.cells[pos], p = F.P[pos]; if (!c || !p) return;
      if (pos !== 'day' && names.indexOf(c.stemTG) >= 0) out.push({ pos: pos, part: 's', tg: c.stemTG, label: POSK[pos] + '간 ' + c.stemTG + '(' + F.M.STEM[p.s] + ')' });
      if (names.indexOf(c.branchTG) >= 0) out.push({ pos: pos, part: 'b', tg: c.branchTG, label: POSK[pos] + '지 ' + c.branchTG + '(' + F.M.BR[p.b] + ')' });
    });
    return out;
  }
  var GROUP_TG = [['비견', '겁재'], ['식신', '상관'], ['편재', '정재'], ['편관', '정관'], ['편인', '정인']];
  function strengthItem(F) {
    var h = Math.round(F.help);
    return { k: '강약', t: '일간 힘 ' + h + (F.zone ? '(' + F.zone + ')' : '') + (F.dr ? ' · 월령을 얻음' : ' · 월령을 얻지 못함'),
      m: F.help < 45 ? '스스로 버티는 힘보다 밖에서 오는 힘이 큰 구조' : F.help > 60 ? '내 힘이 강해 스스로 밀고 나가는 구조' : '힘이 균형 근처인 구조' };
  }
  var grpItem = function (F, gi, m) { var w = where(F, GROUP_TG[gi]); return { k: '십성', t: GN[gi] + ' ' + pct(F.g[gi]) + (w.length ? ' — ' + w.map(function (x) { return x.label; }).slice(0, 3).join(', ') : ' — 원국 겉에는 드러나지 않음'), m: m }; };
  var tgItem = function (F, n, m) { var w = where(F, [n]); return { k: '십성', t: n + ' ' + pct(F.tg(n)) + (w.length ? ' — ' + w.map(function (x) { return x.label; }).slice(0, 2).join(', ') : ''), m: m || TG_MEAN[n] }; };
  var relItem = function (r, m) { return { k: '간지 관계', t: relName(r), m: m }; };
  var elItem = function (F, list, m) { return { k: '오행', t: list.map(function (e) { return EL[e] + ' ' + pct(F.el[e]); }).join(' · '), m: m }; };

  /* ── 주제 규칙: 각 규칙은 { mode, v, basis[], strength? } 또는 null ── */
  var THEMES = {
    pressure: function (F) {
      var g3 = F.g[3], pk = F.tg('편관'), mk = where(F, ['편관', '정관']).some(function (x) { return x.pos === 'month'; });
      if (g3 < 12 && !mk) return null;
      var v = clamp((g3 - 8) / 32) * 0.7 + (mk ? 0.2 : 0) + (F.help < 45 ? 0.1 : 0), mode, b = [grpItem(F, 3, mk ? '월주의 관성 — 규칙·책임·긴장감이 큰 성장 환경의 상징' : '나를 다스리고 누르는 기운')];
      if (F.tg('식신') >= 12 && pk >= 8) { mode = 'skill'; b.push(tgItem(F, '식신', '편관을 실력으로 받아치는 힘(식신제살)')); }
      else if (F.g[4] >= 15) { mode = 'endure'; b.push(grpItem(F, 4, '압박을 받아 안에서 소화하는 힘(관인상생)')); }
      else if (F.g[0] >= 25 || F.tg('겁재') >= 15 || F.sin['양인살']) { mode = 'fight'; b.push(grpItem(F, 0, '압박에 맞서는 나의 힘')); }
      else if (F.help < 45) { mode = 'shrink'; b.push({ k: '십성', t: '인성 ' + pct(F.g[4]) + ' · 식상 ' + pct(F.g[1]), m: '압박을 소화하거나 받아칠 완충이 적음' }); }
      else { mode = 'endure'; b.push(grpItem(F, 4, '압박을 받아들이는 쪽')); }
      b.push(strengthItem(F));
      return { mode: mode, v: v, basis: b, strength: true };
    },
    closeExpect: function (F) {
      var c = F.cells.day, p = F.P.day; if (!c || !p) return null;
      var dt = c.branchTG, dayB = { k: '자리', t: '일지 ' + dt + '(' + F.M.BR[p.b] + ')', m: '가까운 관계·배우자 자리에 놓인 기운 — ' + (TG_MEAN[dt] || '') };
      var hits = relAt(F, 'day', ['충', '형', '원진'], 'branch').filter(function (r) { return r.name.indexOf('자형') < 0; });
      if (hits.length) return { mode: 'test', v: 0.42 + 0.15 * Math.min(2, hits.length), basis: [dayB].concat(hits.slice(0, 2).map(function (r) { return relItem(r, '가까운 관계 자리가 흔들리는 작용'); })) };
      var dg = GOF[dt];
      if (F.g[1] < 10 || (F.tg('편인') >= 12 && F.tg('식신') > 0) || dg === 4 || dg === 0) {
        var v = 0.35 + clamp((12 - F.g[1]) / 25) + (dg === 4 || dg === 0 ? 0.1 : 0);
        return { mode: 'hide', v: Math.min(0.85, v), basis: [dayB, grpItem(F, 1, '마음을 밖으로 꺼내는 통로')] };
      }
      if ((dg === 1 || dg === 2) && F.g[1] >= 12) return { mode: 'give', v: 0.4 + clamp((F.g[1] + F.g[2] - 30) / 60), basis: [dayB, grpItem(F, dg, '먼저 챙기고 행동으로 보여 주는 기운')] };
      return null;
    },
    recognition: function (F) {
      var ks = where(F, ['편관', '정관']).filter(function (x) { return x.part === 's'; }), c = [];
      if (ks.length && F.g[4] >= 12 && F.help < 58) c.push({ mode: 'perfect', v: 0.4 + clamp((F.g[3] + F.g[4] - 30) / 50), basis: [{ k: '자리', t: ks.map(function (x) { return x.label; }).join(', '), m: '관성이 천간에 드러남 — 기준과 평가가 눈에 보이는 구조' }, grpItem(F, 4, '기준을 받아들여 스스로를 다듬는 힘')], strength: true });
      if (F.tg('상관') >= 12 && F.g[3] >= 6) c.push({ mode: 'prove', v: 0.38 + clamp((F.tg('상관') - 12) / 30), basis: [tgItem(F, '상관'), grpItem(F, 3, '부딪히는 상대가 되는 기준(상관견관)')] });
      if (F.g[3] < 6 && F.g[0] + F.g[1] >= 45) c.push({ mode: 'own', v: 0.36 + clamp((F.g[0] + F.g[1] - 45) / 60), basis: [grpItem(F, 3, '밖에서 오는 기준의 힘이 약함'), { k: '십성', t: '비겁+식상 ' + pct(F.g[0] + F.g[1]), m: '내 뜻과 내 표현이 중심인 구조' }] });
      return best(c);
    },
    duty: function (F) {
      var c = [];
      if ((F.g[2] >= 28 && F.help < 45) || (F.g[3] >= 30 && F.help < 40)) { var gi = F.g[2] >= F.g[3] ? 2 : 3; c.push({ mode: 'carry', v: 0.38 + clamp((F.g[gi] - 25) / 45) * 0.4 + clamp((45 - F.help) / 60) * 0.25, basis: [grpItem(F, gi, gi === 2 ? '감당할 결과·챙길 일(재다신약)' : '져야 할 책임과 기준'), strengthItem(F)], strength: true }); }
      var fam = where(F, ['편재', '정재', '편인', '정인']).filter(function (x) { return x.pos === 'year' || x.pos === 'month'; });
      if (F.g[2] >= 18 && F.g[4] >= 8 && F.g[4] < 25 && fam.length >= 2) c.push({ mode: 'family', v: 0.36 + clamp((F.g[2] - 18) / 40), basis: [{ k: '자리', t: fam.map(function (x) { return x.label; }).slice(0, 3).join(', '), m: '년·월(집안·성장 환경 자리)에 재성·인성이 함께 놓임' }, { k: '생극', t: '재성 ' + pct(F.g[2]) + ' → 인성 ' + pct(F.g[4]), m: '현실의 요구가 나를 돌보는 기운을 누름(재극인)' }] });
      return best(c);
    },
    conflict: function (F) {
      var hs = F.rel.filter(function (r) { return r.kind === 'branch' && (r.type === '충' || r.type === '형' || r.type === '원진') && r.name.indexOf('자형') < 0; });
      if (!hs.length && F.g[0] < 30) return null;
      var c = [], strong = ['양인살', '백호대살', '괴강살'].filter(function (n) { return F.sin[n]; }), lone = ['고신살', '과숙살'].filter(function (n) { return F.sin[n]; });
      if (strong.length && hs.length) c.push({ mode: 'burst', v: 0.45 + 0.1 * strong.length, basis: [{ k: '신살', t: strong.join(' · '), m: '기운이 세고 날카로운 글자' }, relItem(hs[0], '원국 안에서 부딪히는 자리')] });
      if (F.help >= 60 && (F.tg('비견') >= 15 || lone.length)) c.push({ mode: 'cut', v: 0.4 + clamp((F.help - 60) / 40), basis: [strengthItem(F), F.tg('비견') >= 15 ? tgItem(F, '비견', '혼자서도 서는 힘') : { k: '신살', t: lone.join(' · '), m: '혼자 정리하는 기운' }], strength: true });
      if (F.g[4] >= 18 || (F.el[2] >= 30 && F.tg('정재') >= 8)) c.push({ mode: 'mend', v: 0.36 + clamp((F.g[4] - 15) / 40), basis: [F.g[4] >= 18 ? grpItem(F, 4, '받아들이고 감싸는 기운') : elItem(F, [2], '중재하고 받쳐 주는 기운'), hs.length ? relItem(hs[0], '원국 안의 긴장 자리') : grpItem(F, 0, '부딪히는 나의 힘')] });
      return best(c);
    },
    feel: function (F) {
      var c = [], fire = F.el[1], t = F.cl.temp || 0;
      if (F.g[1] < 10 && (fire >= 25 || F.sin['양인살'])) c.push({ mode: 'late', v: 0.42 + clamp((fire - 20) / 50), basis: [grpItem(F, 1, '감정을 밖으로 꺼내는 통로가 좁음'), fire >= 25 ? elItem(F, [1], '안에 쌓이는 열기') : { k: '신살', t: '양인살', m: '한 번에 세게 나가는 기운' }] });
      if (t <= -0.35 && F.g[4] >= 12) c.push({ mode: 'sink', v: 0.42 + clamp((-t - 0.35) / 0.8), basis: [{ k: '조후', t: '원국 온도 ' + r2(t) + '(찬 편)', m: '마음이 쉽게 데워지지 않고 가라앉는 바탕' }, grpItem(F, 4, '안으로 파고드는 생각')] });
      if (F.g[1] >= 25 && fire >= 22) c.push({ mode: 'flare', v: 0.4 + clamp((F.g[1] - 25) / 40), basis: [grpItem(F, 1, '바로 드러나는 표현'), elItem(F, [1], '빠르게 퍼지는 기운')] });
      if (F.tg('편인') >= 15 && F.g[1] < 15) c.push({ mode: 'think', v: 0.38 + clamp((F.tg('편인') - 15) / 40), basis: [tgItem(F, '편인', '느끼기 전에 해석하는 직관'), grpItem(F, 1, '감정을 표현으로 옮기는 기운')] });
      return best(c);
    },
    change: function (F) {
      var c = [], wf = F.el[0] + F.el[1], em = F.el[2] + F.el[3];
      if (wf >= 50 && F.el[3] < 12) c.push({ mode: 'starter', v: 0.38 + clamp((wf - 50) / 40), basis: [elItem(F, [0, 1], '뻗고 퍼지는 시작의 기운'), elItem(F, [3], '정리하고 매듭짓는 기운이 적음')] });
      if (em >= 50 && F.el[0] < 12) c.push({ mode: 'finisher', v: 0.38 + clamp((em - 50) / 40), basis: [elItem(F, [2, 3], '다지고 굳히는 기운'), elItem(F, [0], '새로 뻗어 가는 기운이 적음')] });
      var mh = relAt(F, 'month', ['충', '형'], 'branch').filter(function (r) { return r.name.indexOf('자형') < 0; }).concat(relAt(F, 'year', ['충'], 'branch'));
      if (mh.length) c.push({ mode: 'base', v: 0.36 + 0.12 * Math.min(2, mh.length), basis: mh.slice(0, 2).map(function (r) { return relItem(r, r.members.indexOf('month') >= 0 ? '생활 기반(월지)이 흔들리는 작용' : '뿌리 자리(년지)가 흔들리는 작용'); }).concat([{ k: '자리', t: '월지 ' + F.cells.month.branchTG + '(' + F.M.BR[F.P.month.b] + ')', m: '태어난 계절·바탕 환경' }]) });
      return best(c);
    },
    freedom: function (F) {
      var S = F.tg('정재') + F.tg('정관'), yk = F.sin['역마살'] ? F.sin['역마살'].length : 0, Fr = F.tg('편재') + F.tg('상관') + yk * 8, c = [];
      var bS = { k: '십성', t: '정재+정관 ' + pct(S), m: '예측할 수 있는 안정과 정해진 틀' }, bF = { k: '십성', t: '편재+상관 ' + pct(F.tg('편재') + F.tg('상관')) + (yk ? ' · 역마살 ' + yk : ''), m: '넓은 반경과 틀을 넘는 움직임' };
      if (S >= 15 && Fr >= 15) c.push({ mode: 'swing', v: 0.38 + clamp((Math.min(S, Fr) - 15) / 30), basis: [bS, bF] });
      else if (S >= 25 && Fr < 15) c.push({ mode: 'stable', v: 0.35 + clamp((S - 25) / 40), basis: [bS, bF] });
      else if (Fr >= 25 && S < 15) c.push({ mode: 'free', v: 0.35 + clamp((Fr - 25) / 40), basis: [bF, bS] });
      return best(c);
    },
    recharge: function (F) {
      var a = F.tg('비견') + F.tg('편인'), t = F.g[1] + F.g[2], c = [];
      var sa = ['화개살', '고신살', '과숙살'].filter(function (n) { return F.sin[n]; }), st = ['도화살', '홍염살'].filter(function (n) { return F.sin[n]; });
      if (a >= 25 || (sa.length && F.el[4] >= 20)) c.push({ mode: 'alone', v: 0.32 + clamp((a - 20) / 50) + 0.05 * sa.length, basis: [{ k: '십성', t: '비견+편인 ' + pct(a), m: '혼자 서고 안으로 파고드는 기운' }].concat(sa.length ? [{ k: '신살', t: sa.join(' · '), m: '홀로 정리하는 시간의 상징' }] : [elItem(F, [4], '고요히 모이는 기운')]) });
      if (t >= 40 || (st.length && F.el[1] >= 25)) c.push({ mode: 'together', v: 0.3 + clamp((t - 35) / 50) + 0.05 * st.length, basis: [{ k: '십성', t: '식상+재성 ' + pct(t), m: '밖으로 나가 사람과 섞이는 기운' }].concat(st.length ? [{ k: '신살', t: st.join(' · '), m: '사람을 끌어당기는 기운' }] : [elItem(F, [1], '퍼지고 어울리는 기운')]) });
      return best(c);
    },
    overdone: function (F) {
      var gi = 0; for (var i = 1; i < 5; i++) if (F.g[i] > F.g[gi]) gi = i;
      if (F.g[gi] < 38) return null;
      var low = 0; for (var j = 1; j < 5; j++) if (F.g[j] < F.g[low]) low = j;
      return { mode: 'g' + gi, v: 0.3 + clamp((F.g[gi] - 35) / 35), basis: [grpItem(F, gi, '이 명식에서 가장 큰 기운'), { k: '균형', t: GN[low] + ' ' + pct(F.g[low]), m: '가장 적은 기운 — 과해진 쪽을 덜어 줄 통로' }] };
    },
    belong: function (F) {
      var c = [], ym = F.rel.filter(function (r) { return r.kind === 'branch' && (r.type === '충' || r.type === '형') && r.name.indexOf('자형') < 0 && (r.members.indexOf('year') >= 0 && r.members.indexOf('month') >= 0); });
      var gm = ['year', 'month'].filter(function (pos) { return F.cells[pos] && F.cells[pos].gongmang; });
      if ((ym.length || gm.length) && F.g[4] < 15) c.push({ mode: 'drift', v: 0.38 + 0.12 * (ym.length + gm.length), basis: ym.slice(0, 1).map(function (r) { return relItem(r, '집안·성장 환경 자리끼리 부딪힘'); }).concat(gm.map(function (pos) { return { k: '신살', t: POSK[pos] + '지 공망(일주 기준)', m: '그 자리가 비어 있는 느낌의 상징' }; })).concat([grpItem(F, 4, '기댈 곳·돌봄의 기운')]) });
      if (F.g[4] >= 25 && F.el[2] >= 25) c.push({ mode: 'hold', v: 0.33 + clamp((F.g[4] + F.el[2] - 50) / 60), basis: [grpItem(F, 4, '익숙한 보호와 머무름'), elItem(F, [2], '자리를 지키는 기운')] });
      return best(c);
    },
    now: function (F, ctx) {
      var cur = ctx.curDaeun; if (!cur) return null;
      var gB = GOF[cur.branchTG], gS = GOF[cur.stemTG], gi = gB != null ? gB : gS; if (gi == null) return null;
      var sh = F.g[gi], mode = sh < 10 ? 'fresh' : sh >= 35 ? 'heavy' : 'shift';
      return { mode: mode, v: mode === 'shift' ? 0.32 : 0.46, fill: { life: D().GROUP['g' + gi].life }, basis: [{ k: '대운', t: cur.startAge + '세~ ' + F.M.gzNameK({ s: cur.s, b: cur.b }) + ' 대운 · ' + cur.stemTG + '/' + cur.branchTG, m: '지금 10년에 들어오는 기운' }, { k: '원국', t: GN[gi] + ' ' + pct(sh), m: mode === 'fresh' ? '원국에 적은 기운 — 덜 쓰던 방식' : mode === 'heavy' ? '원국에 이미 많은 기운 — 더 커지는 방식' : '원국에 적당히 있는 기운' }] };
    }
  };
  function best(c) { if (!c.length) return null; c.sort(function (a, b) { return b.v - a.v; }); return c[0]; }

  function fillT(s, fill) { return !fill ? s : String(s).replace(/\{(\w+)\}/g, function (m, k) { return fill[k] != null ? fill[k] : m; }); }
  // 근거가 같은 카드가 여러 장 나오지 않게: 근거 항목을 키로 바꿔 겹치면 감점(같은 이야기 되풀이 방지)
  var GKEY = { 비겁: 0, 비견: 0, 겁재: 0, 식상: 1, 식신: 1, 상관: 1, 재성: 2, 편재: 2, 정재: 2, 관성: 3, 편관: 3, 정관: 3, 인성: 4, 편인: 4, 정인: 4 };
  function keysOf(basis) {
    var ks = {};
    basis.forEach(function (b) {
      var t = String(b.t);
      if (b.k === '강약') { ks.strength = 1; return; }
      if (b.k === '간지 관계') { ks['rel:' + t] = 1; return; }
      if (b.k === '오행') { ks['el:' + t.split(' ')[0]] = 1; return; }
      if (b.k === '균형') return;   // 가장 적은 기운 표시는 이야기의 중심이 아님
      // 근거 문장에 나오는 십성(묶음)마다 키 — 자리 표시(월간 편관 등) 안의 십성까지
      Object.keys(GKEY).forEach(function (w) { if (t.indexOf(w) >= 0) ks['g' + GKEY[w]] = 1; });
      if (b.k === '신살' || b.k === '조후' || b.k === '대운') ks[b.k + ':' + t] = 1;
    });
    return Object.keys(ks);
  }
  CFG.overlap = { main: 0.3, minCards: 4 };
  // 카드의 중심 근거 하나(첫 근거). 가까운 관계는 일지 자리, 지금 대운은 대운 자체가 중심
  function primaryKey(c) { if (c.id === 'closeExpect') return 'day'; if (c.id === 'now') return 'daeun'; var k = keysOf([c.basis[0]]); return k[0] || c.id; }
  function themeCards(F, ctx, answers, notes) {
    var DD = D(), all = [];
    Object.keys(THEMES).forEach(function (id) {
      var r = THEMES[id](F, ctx); if (!r || !r.basis || r.basis.length < 2) return;
      var T = DD.THEMES[id], m = T && T.modes[r.mode]; if (!m) return;
      var v = r3(clamp(r.v)); if (v < CFG.show) return;
      var note = '';
      if (r.strength && F.mode === 'jong') note = DD.SCHOOL_NOTE.jong;
      else if (r.strength && F.help >= CFG.border[0] && F.help <= CFG.border[1]) note = DD.SCHOOL_NOTE.border;
      var f = function (s) { return fillT(s, r.fill); };
      all.push({ id: id, mode: r.mode, v: v, name: T.name, core: f(m.core), scenes: m.scenes.map(f), keep: f(m.keep), cost: f(m.cost), need: f(m.need), act: f(m.act),
        basis: r.basis, schoolNote: note, answer: answers[id] || null, mine: notes[id] || '' });
    });
    all.sort(function (a, b) { return (b.v - a.v) || (a.id < b.id ? -1 : 1); });
    var skipped = all.filter(function (c) { return c.answer === 'no'; });
    var live = all.filter(function (c) { return c.answer !== 'no'; });
    var rank = { yes: 0, some: 1 };   // 확인한 주제를 앞으로(많이 맞아요 > 조금 맞아요 > 아직)
    var used = {}, picked = [], pool = live.slice();
    while (pool.length) {
      var bi = 0, bs = -9;
      pool.forEach(function (c, i) {
        var r = rank[c.answer] != null ? 2 - rank[c.answer] : 0, ov = 0;
        var pk = primaryKey(c); if (used[pk]) ov += CFG.overlap.main * used[pk];
        c._adj = c.v - ov;
        var sc = r * 10 + c.v - ov; if (sc > bs + 1e-9 || (Math.abs(sc - bs) < 1e-9 && c.id < pool[bi].id)) { bs = sc; bi = i; }
      });
      var c = pool.splice(bi, 1)[0];
      // 겹침을 빼고 나면 근거가 약한 카드는 3장 이상 고른 뒤에는 넣지 않는다(같은 이야기 되풀이 대신 제외). 확인한 카드는 남긴다
      if (c._adj < CFG.show && picked.length >= CFG.overlap.minCards && !(c.answer === 'yes' || c.answer === 'some')) { delete c._adj; continue; }
      delete c._adj; picked.push(c); var pk2 = primaryKey(c); used[pk2] = (used[pk2] || 0) + 1;
    }
    live = picked;
    return { cards: live.slice(0, CFG.maxCards), more: Math.max(0, live.length - CFG.maxCards), skipped: skipped.map(function (c) { return { id: c.id, name: c.name, core: c.core }; }), total: all.length };
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
    var sv = h.v + nov, level = sv >= CFG.level.hi ? 'hi' : sv >= CFG.level.mid ? 'mid' : 'lo';
    var un = DD.UNSEONG[x.unseong] || null, G0 = mainG != null ? DD.GROUP['g' + mainG] : null;
    return {
      gz: F.M.gzNameK({ s: x.s, b: x.b }), stemTG: x.stemTG, branchTG: x.branchTG, group: mainG, level: level, levelK: DD.LEVEL[level], v: r3(sv),
      theme: G0 ? G0.theme : '', question: G0 ? G0.q[0] : '', question2: G0 ? G0.q[1] : '',
      emotions: emotions(F, x, h.list, gS, gB, mainG != null && F.g[mainG] < 10),
      mood: un ? { k: un.k, t: un.t, unseong: x.unseong } : null,
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
  function curve(F, now, history) {
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
      return { i: i, startAge: x.startAge, endAge: nx ? nx.startAge : x.startAge + 10, startYear: x.startYear, gz: p.gz, tg: x.stemTG + '/' + x.branchTG, theme: p.theme, question: p.question, question2: p.question2, basis: p.basis, emotions: p.emotions.map(function (e) { return e.name; }), now: x.startMs <= now && (!nx || nx.startMs > now) };
    });
    var mine = (history || []).filter(function (h) { return typeof h.level === 'number' && typeof h.t === 'number'; }).map(function (h) { return { age: r2((h.t - F.ch.utc) / YEAR_MS), level: h.level, t: h.t }; }).sort(function (a, b) { return a.t - b.t; });
    return { points: pts, bands: bands, transitions: L.slice(1).map(function (x) { return { age: x.startAge, year: x.startYear }; }), nowAge: r2((now - F.ch.utc) / YEAR_MS), span: span, mine: mine, how: D().GRAPH.how };
  }

  // ── 사용자 기록 요약(명리 추정 없음) ──
  function stateSummary(history) {
    var h = (history || []).slice().sort(function (a, b) { return b.t - a.t; })[0]; if (!h) return null;
    var DD = D(), parts = [];
    if (h.emo && h.emo.length) parts.push('요즘 자주 느끼는 감정: ' + h.emo.join('·'));
    if (h.load && h.load.length) parts.push('부담이 큰 쪽: ' + h.load.join('·'));
    if (h.body && h.body.length) parts.push('달라진 점: ' + h.body.join(', '));
    if (h.need) parts.push('지금 필요한 것: ' + h.need);
    if (typeof h.level === 'number') parts.push('마음의 부담 ' + h.level + '/4');
    var heavy = (typeof h.level === 'number' && h.level >= 4) || (h.body || []).some(function (b) { return /잠이 줄|바닥/.test(b); });
    return { t: h.t, parts: parts, level: h.level, need: h.need || '', actions: h.need && DD.ACTIONS[h.need] ? DD.ACTIONS[h.need].slice() : [], care: heavy ? DD.CHECK.care : '' };
  }

  function build(M, ch, opt) {
    var DD = D(); opt = opt || {};
    if (!DD) return { ok: false, version: VERSION, reason: '문안 파일(psych-data.js)이 없어요' };
    if (!ch || !ch.weights || !ch.cells || !ch.pillars || !ch.daeun) return { ok: false, version: VERSION, reason: '명식 계산 결과가 없어요' };
    var now = typeof opt.now === 'number' ? opt.now : Date.now(), st = opt.state || {};
    var answers = st.answers || {}, notes = st.notes || {}, history = st.history || [];
    var F = features(M, ch);
    var cur = null; ch.daeun.list.forEach(function (x) { if (x.startMs <= now) cur = x; });
    var th = themeCards(F, { curDaeun: cur }, answers, notes);
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
    var tr = transition(F, now), gr = curve(F, now, history), ss = stateSummary(history);
    // 실천: 확인한 주제의 작은 실천 + 기록한 '필요한 것'의 실천(응답이 다음 제안에 반영)
    var acts = [], seen = {};
    var pushA = function (t, from, src) { if (!t || seen[t]) return; seen[t] = 1; acts.push({ text: t, from: from, src: src }); };
    th.cards.filter(function (c) { return c.answer === 'yes' || c.answer === 'some'; }).forEach(function (c) { pushA(c.act, '"' + c.name + '"에 맞아요라고 답함', 'mine'); });
    if (ss) ss.actions.forEach(function (t) { pushA(t, '기록한 필요: ' + ss.need, 'now'); });
    if (!acts.length) th.cards.slice(0, 3).forEach(function (c) { pushA(c.act, c.name, 'myeongri'); });
    var yong = ch.unified && typeof ch.unified.yong === 'number' ? ch.unified.yong : null;
    var elem = yong != null && DD.ELEMENT && DD.ELEMENT[yong] ? { name: DD.ELEMENT[yong].name, mind: DD.ELEMENT[yong].mind, acts: DD.ELEMENT[yong].acts.slice(), note: DD.ELEMENT_NOTE, basis: (ch.unified.primaryName ? ch.unified.primaryName + ' 기준 ' : '') + '용신 ' + DD.ELEMENT[yong].name } : null;
    var top = th.cards[0] || null;
    return {
      ok: true, version: VERSION, hourKnown: !!ch.pillars.hour, year: Y,
      overview: {
        pattern: top ? { text: top.core, name: top.name, src: top.answer === 'yes' || top.answer === 'some' ? 'mine' : 'myeongri' } : null,
        daeun: tr.cur ? { text: tr.cur.startAge + '세~ ' + tr.cur.gz + ' 대운', next: tr.next ? tr.next.startAge + '세 · ' + tr.next.start : '', inWindow: tr.inWindow, src: 'myeongri' } : null,
        state: ss ? { text: ss.parts.slice(0, 2).join(' · '), src: 'now' } : null,
        action: st.pick ? { text: st.pick, src: 'mine' } : acts[0] ? { text: acts[0].text, src: acts[0].src } : null
      },
      themes: th, daeun: daeun, seun: seun, months: months, transition: tr, graph: gr, state: ss, actions: acts.slice(0, 6), pick: st.pick || '', elem: elem
    };
  }

  var API = { VERSION: VERSION, CFG: CFG, build: build, features: features, THEME_IDS: Object.keys(THEMES) };
  G.MantraPsych = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
