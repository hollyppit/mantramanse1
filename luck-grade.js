/* 운 신호 등급(2026-11-20) — 좋음 · 무난 · 조심 3단계. 만세력·운명의 타임라인·상세풀이 공용 기준, 표시 전용
 *  사용자 결정(2026-11-20): 5단계(최고·좋음·무난·주의·부담)는 중간 단계가 많아 헷갈린다 → 3단계로 줄인다.
 *    최고 → 좋음에 합침, 주의·부담 → '조심'으로 합침. 대운·세운·월운·일진 모두 같은 기준.
 *  · 전체 흐름(엔진 흐름 점수 −100~+100): 엔진 상태 기준(engine.js LUCK_CFG.condition)을 그대로 쓴다.
 *      +18 이상 좋음 · −12 이하 조심 · 그 사이 무난. 점수 계산식은 건드리지 않는다.
 *  · 분야 지표(0~100): 이 사주의 평소 수준 대비(SIG_CUTS = [하위10%, 하위30%, 상위30%, 상위10%] 지점).
 *      상위 30% 이상 좋음 · 하위 30% 이하 조심. 사고수·재물손실은 낮을수록 좋아 거꾸로 읽는다.
 *  · extreme(): 등급과 따로, 분포 끝(상위·하위 10%)인지 알려 준다 — 자동 알림(luck-alerts.js)·굵은 글씨 강조용. 등급 이름은 없다.
 *  · 색: 화면 팔레트마다 다르게 칠할 수 있도록 k(good·ok·care)를 기준으로 쓴다. 기본 색은 COLORS.
 *  브라우저: window.MantraLuckGrade · Node: module.exports
 */
(function (root) {
  'use strict';
  var VERSION = 'luck-grade-3-2026-11-20';
  // 등급 3개(순서 = 좋은 쪽부터). i 는 순서 번호, k 는 색·CSS 키, n 은 화면 이름
  var GRADES = [
    { i: 0, k: 'good', n: '좋음' },
    { i: 1, k: 'ok', n: '무난' },
    { i: 2, k: 'care', n: '조심' }];
  var GOOD = GRADES[0], OK = GRADES[1], CARE = GRADES[2];
  // 기본 색: light = 밝은 화면(만세력·상세풀이), dark = 어두운 화면(타임라인). t/td = 그 위 글자색
  var COLORS = {
    good: { light: '#2DB36B', t: '#fff', dark: '#5FDC8F', td: '#06210f' },
    ok: { light: '#B5BDCB', t: '#1E2330', dark: '#B3BDCF', td: '#10131a' },
    care: { light: '#E8622C', t: '#fff', dark: '#FF8A4C', td: '#2b1205' }
  };
  // 엔진 기준(engine.js LUCK_CFG.condition 과 같은 값 — M 이 있으면 엔진 값을 읽는다)
  var FLOW = { tailwind: 18, caution: -12, burden: -35 };
  // 지표별 [하위10%, 하위30%, 상위30%, 상위10%] 점수. 2026-11-24: 점수 엔진 변경(통합 용신·십성 역할)으로 분포가 밀린 직업(job)·사업(business)만 지금 분포로 다시 맞춤(직업 조심 38%→약 30%)
  var SIG_CUTS = {"love":[45,49,58,66],"wealth":[39,44,51,56],"health":[56,63,73,78],"accident":[16,23,37,50],"job":[43,49,57,64],"move":[47,51,59,67],"career":[41,49,60,66],"business":[41,48,57,63],"child":[42,46,58,67],"marriage":[39,47,62,72],"noble":[40,49,60,68],"study":[43,49,58,65],"windfall":[35,41,52,64],"windfallLoss":[17,24,39,54],"estate":[45,51,60,66],"social":[45,51,58,63],"family":[44,49,59,66]};   // 지표별 [하위10%, 하위30%, 상위30%, 상위10%] 점수
  var INVERSE = { accident: 1, windfallLoss: 1 };

  function cond(M) { var c = M && M.LUCK_CFG && M.LUCK_CFG.condition; return c && Number.isFinite(c.tailwind) && Number.isFinite(c.caution) ? c : FLOW; }
  // 전체 흐름 점수 → 등급
  function flow(v, M) { var C = cond(M); return v >= C.tailwind ? GOOD : v > C.caution ? OK : CARE; }
  // 지표 값을 "높을수록 좋음" 방향으로 맞춘 값과 구간
  function norm(key, v) {
    var c = SIG_CUTS[key]; if (!c) return null;
    return INVERSE[key] ? { x: -v, q: c.slice().reverse().map(function (z) { return -z; }) } : { x: v, q: c };
  }
  // 분야 지표(0~100) → 등급
  function metric(key, v) { var o = norm(key, v); if (!o) return OK; return o.x >= o.q[2] ? GOOD : o.x <= o.q[1] ? CARE : OK; }
  // 분포 끝(상위 10%·하위 10%)인지: 'top' | 'bottom' | null (등급 이름과 별개)
  function extreme(key, v) { var o = norm(key, v); if (!o) return null; return o.x >= o.q[3] ? 'top' : o.x <= o.q[0] ? 'bottom' : null; }
  function flowExtreme(v, M) { var C = cond(M); return v >= 30 ? 'top' : v <= C.burden ? 'bottom' : null; }
  function byKey(k) { for (var i = 0; i < GRADES.length; i++) if (GRADES[i].k === k) return GRADES[i]; return null; }
  function color(g, theme) { var c = COLORS[(g && g.k) || g]; return c ? (theme === 'dark' ? c.dark : c.light) : ''; }
  // 범례 문구(흐름 점수 기준)
  function flowRule(M) { var C = cond(M); return '흐름 점수 +' + C.tailwind + ' 이상 좋음 · ' + C.caution + ' 이하 조심 · 그 사이 무난'; }

  var api = { VERSION: VERSION, GRADES: GRADES, GOOD: GOOD, OK: OK, CARE: CARE, COLORS: COLORS, FLOW: FLOW, SIG_CUTS: SIG_CUTS, INVERSE: INVERSE,
    flow: flow, metric: metric, extreme: extreme, flowExtreme: flowExtreme, byKey: byKey, color: color, flowRule: flowRule };
  root.MantraLuckGrade = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
