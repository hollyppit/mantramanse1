/* 운명의 타임라인 그래프 계산(2026-11-12) — 만세력 "운세 흐름" 탭의 그래프 지표·신호등 단계·인생 90년·올해 요약을 타임라인에 옮긴 것.
   · 표시 전용: 점수는 모두 엔진(engine.js)의 값(ev.fitScore, evaluateDomainLuck, elementFlow, luckStructures, getSamjae)을 그대로 읽는다.
   · 신호등 단계 기준(SIG_CUTS)은 만세력 index.html 의 SIG_CUTS 와 같아야 한다(tests/timeline-graph-sim.cjs 가 같은지 검사).
   · 브라우저·Node 공용: window.MantraTLGraph / module.exports */
(function (G) {
  'use strict';
  // 지표: 전체 흐름 + 4대 분야 + 직업·가족 세부(엔진 SUB_DOMAIN_KEYS 순서)
  // 2026-11-12 사용자 결정: 타임라인에는 4개만 연다(만세력의 나머지 세부 지표는 만세력에서만)
  var METRICS = [['flow', '전체 흐름'], ['love', '인연'], ['wealth', '재물'], ['career', '직업']];
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
  var api = { METRICS: METRICS, METRICS_SUB: METRICS_SUB, NAME: NAME, NOTE: NOTE, SIG: SIG, SIG_CUTS: SIG_CUTS, sigFlow: sigFlow, sigMetric: sigMetric, pct: pct, value: value, domainOf: domainOf, life: life, tenYears: tenYears, samjae: samjae, structure: structure, ctxOf: ctxOf };
  G.MantraTLGraph = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
