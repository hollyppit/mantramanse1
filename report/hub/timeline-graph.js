/* 운명의 타임라인 그래프 계산(2026-11-12) — 만세력 "운세 흐름" 탭의 그래프 지표·신호등 단계·인생 90년·올해 요약을 타임라인에 옮긴 것.
   · 표시 전용: 점수는 모두 엔진(engine.js)의 값(ev.fitScore, evaluateDomainLuck, elementFlow, luckStructures, getSamjae)을 그대로 읽는다.
   · 신호등 단계 기준(SIG_CUTS)은 만세력 index.html 의 SIG_CUTS 와 같아야 한다(tests/timeline-graph-sim.cjs 가 같은지 검사).
   · 브라우저·Node 공용: window.MantraTLGraph / module.exports */
(function (G) {
  'use strict';
  // 지표: 전체 흐름 + 4대 분야 + 직업·가족 세부(엔진 SUB_DOMAIN_KEYS 순서)
  // 2026-11-12 사용자 결정: 타임라인에는 5개만 연다(2026-11-13 건강 추가)(만세력의 나머지 세부 지표는 만세력에서만)
  var METRICS = [['flow', '전체 흐름'], ['love', '인연'], ['wealth', '재물'], ['career', '직업'], ['health', '건강']];
  var METRICS_SUB = [];
  var NAME = {}; METRICS.concat(METRICS_SUB).forEach(function (m) { NAME[m[0]] = m[1]; });
  var NOTE = {
    flow: '전체 흐름: 원국의 불균형을 들어오는 운이 보완하는지(높음) 심화하는지(낮음)를 0~100으로 옮긴 상대 지표예요(50이 보통).',
    career: '직업운은 원국의 직업 적성이 운에서 얼마나 살아나는지와 업무 구조를 계산한 참고 지표이며, 승진·성과·수입을 예측하지 않아요.',
    business: '사업운은 거래·독립·동업 신호를 계산한 참고 지표이며, 창업의 성공이나 수익을 예측하지 않아요.',
    love: '인연운은 관계 영역의 활성·적합·안정을 계산한 참고 지표이며, 만남이나 이별 같은 사건을 예측하지 않아요.',
    wealth: '재물운은 재정 활동·적합·안정을 계산한 참고 지표이며, 수입이나 손실의 금액·결과를 예측하지 않아요.',
    health: '건강 지수는 명리 해석상의 균형·부담 지표이며 질병의 진단이나 발생 가능성을 뜻하지 않아요.',
    accident: '사고수는 변화·충돌·부담 신호를 수치화한 참고 지표예요. 실제 사고 확률이 아니며, 낮을수록 좋아요.',
    sub: '세부 지수는 명리 모델로 계산한 참고 지표이며 합격·결혼·수익 같은 결과를 예측하지 않아요.'
  };
  // 신호등 단계(어두운 화면용 색). 색만으로 뜻을 전하지 않도록 단계 글자를 항상 같이 쓴다.
  var SIG = [
    { k: 'best', n: '최고', c: '#2FBF71', t: '#06210f' },
    { k: 'good', n: '좋음', c: '#7FD3A0', t: '#06210f' },
    { k: 'ok', n: '무난', c: '#8C93A3', t: '#10131a' },
    { k: 'warn', n: '주의', c: '#F2A541', t: '#2b1a00' },
    { k: 'bad', n: '부담', c: '#EB6B5B', t: '#2a0905' }];
  var SIG_CUTS = {"love":[45,49,58,66],"wealth":[39,44,51,56],"health":[56,63,73,78],"accident":[16,23,37,50],"job":[45,50,57,63],"move":[47,51,59,67],"career":[41,49,60,66],"business":[44,50,58,64],"child":[42,46,58,67],"marriage":[39,47,62,72],"noble":[40,49,60,68],"study":[43,49,58,65],"windfall":[35,41,52,64],"windfallLoss":[17,24,39,54],"estate":[45,51,60,66],"social":[45,51,58,63],"family":[44,49,59,66]};
  var COND = { tailwind: 18, caution: -12, burden: -35 };
  function cond(M) { return (M && M.LUCK_CFG && M.LUCK_CFG.condition) || COND; }
  // 전체 흐름(엔진 흐름 점수 −100~100): 엔진 상태 기준 그대로, +30 이상만 "최고"
  function sigFlow(M, fit) { var C = cond(M); return fit >= 30 ? SIG[0] : fit >= C.tailwind ? SIG[1] : fit > C.caution ? SIG[2] : fit > C.burden ? SIG[3] : SIG[4]; }
  // 분야 지표(0~100): 이 사주의 평소 수준 대비(하위 10·30%, 상위 70·90% 지점). 사고수·손실은 낮을수록 좋아 거꾸로 읽는다.
  function sigMetric(key, v) {
    var c = SIG_CUTS[key]; if (!c) return SIG[2];
    var inv = key === 'accident' || key === 'windfallLoss', x = inv ? -v : v, q = inv ? c.slice().reverse().map(function (z) { return -z; }) : c;
    return x >= q[3] ? SIG[0] : x >= q[2] ? SIG[1] : x > q[1] ? SIG[2] : x > q[0] ? SIG[3] : SIG[4];
  }
  var pct = function (fit) { return Math.max(0, Math.min(100, Math.round((fit + 100) / 2))); };
  // 엔진 컨텍스트(만세력과 같은 기준 시각): 세운 = 그 해 가운데, 월운 = 그 달 시작 + 12일
  function ctxOf(x, level) { return level === 'seun' ? { ms: x.midMs } : level === 'wolun' ? { ms: x.startMs + 12 * 864e5 } : {}; }
  var CACHE = typeof WeakMap === 'function' ? new WeakMap() : null;
  function domainOf(M, ch, x, level) {
    var hit = CACHE && CACHE.get(x); if (hit) return hit;
    var r = M.evaluateDomainLuck(ch, x, level, ctxOf(x, level)); if (CACHE) CACHE.set(x, r); return r;
  }
  // 막대 하나의 값: { v(0~100), sig, tags, summary }. x = 엔진 운 객체(대운·세운·월운), level = 'daeun'|'seun'|'wolun'
  function value(M, ch, x, level, metric) {
    if (!x || !x.ev) return null;
    if (!metric || metric === 'flow') { var f = x.ev.fitScore; return { v: pct(f), raw: f, sig: sigFlow(M, f), tags: [], summary: '' }; }
    var r; try { r = domainOf(M, ch, x, level)[metric]; } catch (e) { return null; }
    if (!r) return null;
    return { v: Math.round(r.score), raw: r.score, sig: sigMetric(metric, r.score), tags: r.tags || [], summary: r.summary || '', reasons: r.reasons || [], loss: r.loss || null };
  }
  // 인생 90년(태어난 해부터) 연도별 값
  function life(M, ch, metric, years) {
    var y0 = ch.solar.y, y1 = Math.min(y0 + (years || 90), (M.MAX_Y || 2100) - 1);
    return M.seunRange(ch, y0, y1).map(function (x) { var val = value(M, ch, x, 'seun', metric); return { year: x.year, age: x.age, gz: M.gzName(x), v: val ? val.v : 50, sig: val ? val.sig : SIG[2] }; });
  }
  // 앞으로 10년: 고른 지표에서 좋은 해·조심할 해(각 최대 3개)
  function tenYears(M, ch, Y, metric) {
    var ys = M.seunRange(ch, Y, Y + 9).map(function (x) { var val = value(M, ch, x, 'seun', metric); return { year: x.year, gz: M.gzName(x), v: val ? val.v : 50, sig: val ? val.sig : SIG[2] }; });
    var good = ys.filter(function (q) { return q.sig.k === 'best' || q.sig.k === 'good'; }).sort(function (a, b) { return metric === 'accident' ? a.v - b.v : b.v - a.v; }).slice(0, 3);
    var bad = ys.filter(function (q) { return q.sig.k === 'warn' || q.sig.k === 'bad'; }).sort(function (a, b) { return metric === 'accident' ? b.v - a.v : a.v - b.v; }).slice(0, 3);
    return { years: ys, good: good, bad: bad };
  }
  // 삼재(입춘 기준 연지). 흐름 점수에는 넣지 않는 민속 참고 신호
  function samjae(M, ch, Y) { try { var s = M.getSamjae(ch.pillars.year.b, Y); return s && s.active ? s : null; } catch (e) { return null; } }
  // 오행 흐름·운+원국 구조(표시 전용)
  var EF_WORD = { 순생: '생이 이어짐', 통관: '막힌 곳을 이어 줌', 제압: '넘치는 기운을 눌러 줌', 보통: '큰 연결 없음', 설기: '힘이 빠져나감', 막힘: '흐름이 고임', 극: '필요한 기운을 누름', 엇갈림: '도움과 부담이 함께' };
  function structure(M, ch, x, level) {
    var out = { flow: null, patterns: [] };
    try { if (M.elementFlow) { var f = M.elementFlow(ch, x, level); out.flow = { verdict: f.verdict, word: EF_WORD[f.verdict] || '', tone: f.tone, text: f.text }; } } catch (e) { }
    out.patterns = ((x && x.ev && x.ev.luckStructures) || []).map(function (p) { return { name: p.name, label: p.label, good: p.v > 0 }; });
    return out;
  }
  // "운은 어떻게 작동하나요?" — 만세력 운세 흐름 탭의 자동차 비유와 같은 틀에 지금의 대운·세운·월운·일진을 넣는다(새 명리 판단 없음).
  function nowChain(M, ch, now) {
    var kst = new Date(now + 9 * 3600e3), Y = kst.getUTCFullYear(), Mo = kst.getUTCMonth() + 1, D = kst.getUTCDate();
    var du = null, se = null, wm = null, il = null;
    try { du = M.daeunAt(ch, now); } catch (e) { }
    try { var sy = M.yearPillarAt(now).sajuYear; se = M.seunRange(ch, sy, sy)[0]; var ws = M.wolun(ch, sy); wm = ws[0]; ws.forEach(function (m) { if (m.startMs <= now) wm = m; }); } catch (e) { }
    try { il = M.ilun(ch, Y, Mo)[D - 1]; } catch (e) { }
    var lab = function (x, o) { try { return x ? M.flowLabel(x.ev, o) : ''; } catch (e) { return ''; } };
    var vol = function (x) { return !!(x && x.ev && x.ev.overlays && x.ev.overlays.volatility && x.ev.overlays.volatility.active); };
    var def = function (x) { return !!(x && x.ev && x.ev.overlays && x.ev.overlays.defense && x.ev.overlays.defense.active); };
    var line;
    if (du) {
      line = '당신이라는 자동차가 지금 ' + M.gzName(du) + ' 대운이라는 도로(' + lab(du) + ')를 달리고 있어요.';
      if (se) line += ' 올해는 ' + M.gzName(se) + ' 세운의 날씨(' + lab(se) + ')가 겹쳐 있' + (vol(se) || def(se) ? '고' + (vol(se) ? ', 날씨 변화가 큰 편이며' : '') + (def(se) ? ' 보수적으로 운전할 필요가 있어요.' : '요.') : '어요.');
      if (wm && il) line += ' 이번 달은 ' + M.gzName(wm) + ' 월운, 오늘은 ' + M.gzName(il) + ' 일진(' + lab(il, { overlay: 'all' }) + ')의 조건이에요.';
    } else line = '아직 대운이 시작되기 전이라, 원국이라는 자동차만 놓여 있는 시기예요.';
    var st = ch.strength || {}, dm = ch.pillars.day;
    return {
      line: line,
      items: [
        { k: 'car', name: '원국', role: '자동차', desc: '내가 기본적으로 가지고 태어난 구조와 특성', now: '일간 ' + M.STEM_K[dm.s] + '(' + M.EL_K[M.stemEl(dm.s)] + ')' + (st.zone ? ' · ' + st.zone : '') },
        { k: 'road', name: '대운', role: '오래 달리는 도로', desc: '약 10년 동안 이어지는 큰 환경과 방향', now: du ? M.gzName(du) + ' — ' + lab(du) : '대운 시작 전' },
        { k: 'weather', name: '세운', role: '그해의 날씨', desc: '같은 도로에서도 해마다 달라지는 1년의 환경', now: se ? M.gzName(se) + ' — ' + lab(se) : '' },
        { k: 'signal', name: '월운', role: '이번 구간의 노면', desc: '이번 달 체감되는 구체적인 환경 변화', now: wm ? M.gzName(wm) + ' — ' + lab(wm) : '' },
        { k: 'pin', name: '일진', role: '오늘의 주행 조건', desc: '오늘 직접 마주치는 짧은 흐름', now: il ? M.gzName(il) + ' — ' + lab(il, { overlay: 'all' }) : '' }]
    };
  }
  // ───────── 자미두수 쉽게 보기 · 대한 · 유년(2026-11-13) — 만세력 자미두수 탭(index.html zwRaw·zwScores·쉽게 보기)과 같은 계산 ─────────
  var ZW_DOM = { '명궁': '나 자신·성격', '형제궁': '형제·친구', '부처궁': '연애·결혼', '자녀궁': '자녀·후배', '재백궁': '돈·재물', '질액궁': '건강', '천이궁': '밖에서의 활동', '노복궁': '사람 인연', '관록궁': '직업·성취', '전택궁': '집·부동산', '복덕궁': '마음의 여유', '부모궁': '부모·윗사람·문서' };
  var ZW_BR_W = { '묘': 4, '왕': 3, '득': 2, '리': 1, '평': 0, '불': -1, '함': -2 };
  var ZW_STAR = { '자미': '리더·황제의 별', '천기': '머리 좋은 기획자의 별', '태양': '베푸는 열정가의 별', '무곡': '돈과 결단의 별', '천동': '편안하고 복 많은 낙천가의 별', '염정': '열정과 원칙이 함께 있는 별', '천부': '재물을 지키는 곳간지기의 별', '태음': '섬세하고 알뜰한 달의 별', '탐랑': '욕망과 재주, 매력의 별', '거문': '말솜씨와 분석의 별', '천상': '믿음직한 2인자·조율가의 별', '천량': '돌봐 주는 어른의 별', '칠살': '도전하는 장군의 별', '파군': '부수고 새로 시작하는 개척자의 별' };
  var ZW_HW = { '록': '이 영역에서는 노력한 만큼 얻고 도와주는 사람이 생겨요.', '기': '이 영역은 서두르지 말고 한 번 더 점검하세요. 걱정이 앞서기 쉬워요.' };
  var zwGrade = function (v) { return v >= 70 ? [4, '매우 강함'] : v >= 58 ? [3, '강함'] : v >= 43 ? [2, '보통'] : v >= 32 ? [1, '약함'] : [0, '매우 약함']; };
  var ZW_COL = ['#EB6B5B', '#E0915A', '#8C93A3', '#8E7CF0', '#2FBF71'];
  function zwRaw(M, zw, p) {
    var mains = p.main.length ? p.main : zw.palaces[(p.b + 6) % 12].main, v = 0;
    mains.forEach(function (n) { var w = ZW_BR_W[M.zwBright(n, p.b)]; v += 2 * (w == null ? 0 : w) + 1; });
    if (!p.main.length) v *= 0.6;
    p.good.forEach(function (n) { v += n === '녹존' ? 1.5 : 1; });
    v -= 1.5 * p.bad.length;
    p.main.concat(p.good, p.bad).forEach(function (n) { var h = zw.sihwa[n]; if (h) v += { '록': 3, '권': 2, '과': 2, '기': -3 }[h]; });
    return v;
  }
  function zwScores(M, zw) {
    var raw = zw.palaces.map(function (p) { return zwRaw(M, zw, p); });
    var tot = zw.palaces.map(function (p) { return raw[p.b] * 0.5 + raw[(p.b + 6) % 12] * 0.25 + raw[(p.b + 4) % 12] * 0.125 + raw[(p.b + 8) % 12] * 0.125; });
    var mean = tot.reduce(function (a, b) { return a + b; }, 0) / 12, sd = Math.sqrt(tot.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / 12) || 1, sc = {};
    zw.palaces.forEach(function (p) { sc[p.b] = Math.round(Math.max(8, Math.min(95, 50 + (tot[p.b] - mean) / sd * 20))); });
    return sc;
  }
  // 결과: { Y, rows:[{t, b(쉬운 말 HTML), s(작은 설명)}], daehan:[...], liu:[...] } — 명반이 없으면(시각 모름) null
  function ziwei(M, ch, now) {
    var zw = ch && ch.ziwei; if (!zw || !M.ziweiPeriod || !M.zwBright) return null;
    var kst = new Date(now + 9 * 3600e3), Y; try { Y = M.solarToLunar(kst.getUTCFullYear(), kst.getUTCMonth() + 1, kst.getUTCDate()).y; } catch (e) { Y = kst.getUTCFullYear(); }
    var per = M.ziweiPeriod(zw, Y), sc = zwScores(M, zw), dom = function (p) { return ZW_DOM[p.name] || p.name; };
    var order = zw.palaces.slice().sort(function (a, b) { return sc[b.b] - sc[a.b]; }), best = order.slice(0, 3), worst = order.slice(-3).reverse();
    var mp = zw.palaces[zw.ming], mMain = mp.main.length ? mp.main : zw.palaces[(zw.ming + 6) % 12].main;
    var hwOf = function (k) { var n = Object.keys(zw.sihwa).filter(function (x) { return zw.sihwa[x] === k; })[0]; return n != null && zw.pos && zw.pos[n] != null ? zw.palaces[zw.pos[n]] : null; };
    var rows = [];
    rows.push({ t: '나는 이런 사람이에요', b: mMain.length ? mMain.map(function (n) { return '<b>' + n + '</b> — ' + (ZW_STAR[n] || '') + '.'; }).join('<br>') : '명궁이 비어 있어 마주 보는 천이궁의 별을 빌려 봐요.', s: mMain.length ? '' : '환경과 사람에 따라 모습이 달라지는 유연한 타입이에요.' });
    rows.push({ t: '타고나길 잘 풀리는 영역', b: best.map(function (p) { return '<b>' + dom(p) + '</b>'; }).join(' · '), s: '별이 밝고 도와주는 별이 많아서, 이 영역에서 힘을 얻고 자신감이 붙어요.' });
    rows.push({ t: '의식해서 챙기면 좋은 영역', b: worst.map(function (p) { return '<b>' + dom(p) + '</b>'; }).join(' · '), s: '별이 약하거나 부딪치는 별이 겹쳐 있어요. 약점이 아니라 "신경 써서 가꿀 곳"으로 보세요.' });
    var lu = hwOf('록'), gi = hwOf('기'), luck = [];
    if (lu) luck.push('<b>평생 이득이 따라오는 곳 — ' + dom(lu) + '</b><br><small>' + ZW_HW['록'] + '</small>');
    if (gi) luck.push('<b>평생 마음이 걸리기 쉬운 곳 — ' + dom(gi) + '</b><br><small>' + ZW_HW['기'] + '</small>');
    if (luck.length) rows.push({ t: '타고난 행운과 걸림돌', b: luck.join('<br>'), s: '' });
    var dh = per.dh;
    if (dh) { var v = sc[dh.b]; rows.push({ t: '지금 걷는 10년 (' + dh.daehan[0] + '~' + dh.daehan[1] + '세)', b: '인생의 무대가 <b>' + dom(dh) + '</b> 쪽으로 옮겨 와 있어요. 이 영역의 힘은 <b>' + zwGrade(v)[1] + '</b>(' + v + '점). ' + (v >= 60 ? '이 10년은 이 영역에 적극적으로 힘을 써 볼 만해요.' : v >= 45 ? '무난하게 흘러가니 꾸준함이 중요해요.' : '이 10년은 무리하지 말고 기반을 다지는 시기로 쓰세요.'), s: '' }); }
    var lp = zw.palaces[per.liuB], lv = sc[lp.b];
    rows.push({ t: Y + '년, 올해의 초점', b: '올해는 <b>' + dom(lp) + '</b>에 이슈가 몰려요. 이 영역의 힘은 <b>' + zwGrade(lv)[1] + '</b>(' + lv + '점). ' + (lv >= 60 ? '올해 이 분야는 기회로 보고 움직여도 좋아요.' : lv >= 45 ? '큰 변화보다 꾸준히 이어 가는 해예요.' : '올해 이 분야는 확장보다 점검과 정리가 어울려요.'), s: '' });
    var daehan = zw.palaces.slice().sort(function (a, b) { return a.daehan[0] - b.daehan[0]; }).map(function (p) { return { name: p.name.replace('궁', ''), from: p.daehan[0], to: p.daehan[1], v: sc[p.b], col: ZW_COL[zwGrade(sc[p.b])[0]], cur: !!(dh && dh.b === p.b) }; });
    var start = Math.max(zw.lunar.y, Y - 2), liu = [];
    for (var i = 0; i < 10; i++) {
      var y = start + i, pr = M.ziweiPeriod(zw, y), p = zw.palaces[pr.liuB];
      var nameOf = function (k) { var n = Object.keys(pr.liuSihwa || {}).filter(function (x) { return pr.liuSihwa[x] === k; })[0]; return n != null && zw.pos && zw.pos[n] != null ? zw.palaces[zw.pos[n]].name.replace('궁', '') : ''; };
      liu.push({ Y: y, name: p.name.replace('궁', ''), age: pr.age, v: sc[p.b], col: ZW_COL[zwGrade(sc[p.b])[0]], cur: y === Y, lu: nameOf('록'), gi: nameOf('기') });
    }
    return { Y: Y, rows: rows, daehan: daehan, liu: liu };
  }
  var api = { ziwei: ziwei, nowChain: nowChain, METRICS: METRICS, METRICS_SUB: METRICS_SUB, NAME: NAME, NOTE: NOTE, SIG: SIG, SIG_CUTS: SIG_CUTS, sigFlow: sigFlow, sigMetric: sigMetric, pct: pct, value: value, domainOf: domainOf, life: life, tenYears: tenYears, samjae: samjae, structure: structure, ctxOf: ctxOf };
  G.MantraTLGraph = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
