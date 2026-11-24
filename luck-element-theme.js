/* 운 시기별 주요 오행·활동 테마(2026-11-25) — 만세력 운세 흐름 그래프 공용, 표시 전용
 *  · 시기의 주요 오행: 운 기둥 천간(1.0) + 지지 지장간(날수 비율, 합 1.0)을 더해 가장 큰 오행. 같으면 천간 쪽.
 *  · 색은 "그 시기에 두드러지는 기운"이며 길흉이 아니다. 길흉(흐름 점수·좋음·무난·조심)은 엔진 값 그대로 보조 정보로만.
 *  · 개인 해석: 같은 오행이라도 사람마다 다르게 —
 *      ① 통합 용신 역할(ch.unified.roles: 용신·희신·한신·구신·기신)
 *      ② 원국 오행 세력(ch.weights.pct): 이미 많은 기운이 더해지는지, 부족한 기운이 채워지는지
 *      ③ 원국과의 합·충·형·파·해(M.relationsAmong) ④ 엔진 흐름 점수(x.ev.fitScore)
 *    를 함께 보고 활용 방향·주의할 점을 만든다. 엔진 계산은 읽기만 하고 바꾸지 않는다.
 *  사용: MantraLuckTheme.read(M, ch, x, kind) → { el, elName, hanja, words, weights, second, role, state, summary, interact[], recommend[], caution[], basis[] }
 *        MantraLuckTheme.mainEl(M, x) → { el, second, weights }
 *  브라우저: window.MantraLuckTheme · Node: module.exports
 */
(function (root) {
  'use strict';
  var VERSION = 'luck-element-theme-2026-11-25';
  var EL_K = ['목', '화', '토', '금', '수'], EL_H = ['木', '火', '土', '金', '水'];
  // 오행별 활동 테마(사용자 지정 2026-11-25)와 그 테마로 할 수 있는 일
  var THEME = [
    { words: ['성장', '기획', '학습', '확장'], use: '새 계획을 세우고 배우며 활동 범위를 넓히는 일', acts: ['새 프로젝트 기획', '공부·자격 준비', '새 분야 탐색', '관계·활동 범위 넓히기'], over: '계획과 일만 늘리고 마무리를 미루기 쉬워요. 벌인 일의 끝을 먼저 정하세요.' },
    { words: ['표현', '창작', '홍보', '발표'], use: '나를 드러내고 만든 것을 알리는 일', acts: ['발표·강의', '창작물 공개', '홍보·브랜딩', 'SNS·콘텐츠 만들기'], over: '말과 노출이 앞서가기 쉬워요. 실제 결과가 따라오는지 확인하며 알리세요.' },
    { words: ['안정', '관리', '정리', '기반 구축'], use: '가진 것을 정리하고 기반을 다지는 일', acts: ['일정·재정 정리', '시스템·습관 만들기', '관계·자원 관리', '거처·업무 환경 정비'], over: '지키려는 마음이 커져 기회를 흘려보내기 쉬워요. 꼭 지킬 것과 바꿀 것을 나누세요.' },
    { words: ['실행', '계약', '의사결정', '결과물 완성'], use: '결정하고 마무리해 결과를 내는 일', acts: ['미뤄 둔 결정 내리기', '계약·조건 정리', '기술 다듬기', '결과물 마감'], over: '단호함이 지나쳐 관계가 날카로워지기 쉬워요. 결정 전에 한 번 더 들어 보세요.' },
    { words: ['탐구', '연구', '정보 수집', '전략 수립'], use: '알아보고 궁리해 다음 수를 준비하는 일', acts: ['조사·연구', '정보·자료 모으기', '전략·계획 다듬기', '혼자 깊이 생각하는 시간'], over: '생각만 깊어지고 행동이 늦어지기 쉬워요. 알아본 것 중 하나는 바로 해 보세요.' }
  ];
  var J = function (w, a, b) { var c = String(w || '').charCodeAt(String(w || '').length - 1) - 0xAC00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };
  var elN = function (e) { return EL_K[e] + '(' + EL_H[e] + ')'; };
  var elJ = function (e, a, b) { var c = EL_K[e].charCodeAt(0) - 0xAC00; return elN(e) + (c % 28 ? a : b); };

  // 운 기둥의 오행 무게: 천간 1.0 + 지지 지장간 날수 비율(합 1.0)
  function mainEl(M, x) {
    if (!M || !x || x.s == null || x.b == null) return null;
    var w = [0, 0, 0, 0, 0], se = M.stemEl(x.s); w[se] += 1;
    var H = M.HIDDEN && M.HIDDEN[x.b], tot = 0;
    if (H && H.length) { H.forEach(function (h) { tot += h[1]; }); H.forEach(function (h) { w[M.stemEl(h[0])] += h[1] / (tot || 1); }); }
    else w[M.stemEl(M.mainHidden(x.b))] += 1;
    var order = [0, 1, 2, 3, 4].sort(function (a, b) { return (w[b] - w[a]) || (a === se ? -1 : b === se ? 1 : a - b); });
    return { el: order[0], second: w[order[1]] > 0.3 ? order[1] : null, weights: w.map(function (v) { return Math.round(v * 100) / 100; }) };
  }

  var GOOD = { 용신: 1, 희신: 1 }, BAD = { 기신: 1, 구신: 1 };
  var POSK = { year: '연', month: '월', day: '일', hour: '시' };
  function read(M, ch, x, kind) {
    var m = mainEl(M, x); if (!m || !ch) return null;
    var e = m.el, T = THEME[e], roles = (ch.unified && ch.unified.roles) || {}, role = roles[e] || '한신';
    var pct = ch.weights && ch.weights.pct ? ch.weights.pct : null, natal = pct ? Math.round(pct[e]) : null;
    var fit = x.ev && typeof x.ev.fitScore === 'number' ? x.ev.fitScore : null;
    // 원국과의 합·충 등(운 기둥이 낀 관계만)
    var P = ch.pillars || {}, rels = [];
    try { rels = M.relationsAmong(['year', 'month', 'day', 'hour'].filter(function (k) { return P[k]; }).map(function (k) { return { id: k, s: P[k].s, b: P[k].b }; }).concat([{ id: 'luck', s: x.s, b: x.b }])).filter(function (r) { return r.members.indexOf('luck') >= 0; }); } catch (err) { rels = []; }
    var where = function (r) { return r.members.filter(function (k) { return k !== 'luck'; }).map(function (k) { return POSK[k] + (r.kind === 'stem' ? '간' : '지'); }).join('·'); };
    var hap = rels.filter(function (r) { return /합/.test(r.type || r.name || ''); }), clash = rels.filter(function (r) { return /^(충|형|파|해)$/.test(r.type || ''); });
    // 상태: 엔진 흐름 점수와 충돌을 함께 본다 — 역할만으로 길흉을 정하지 않는다
    var low = fit != null && fit <= -12, heavy = natal != null && natal >= 30;
    var state = GOOD[role] ? (clash.length || low ? 'mixed' : 'use') : BAD[role] ? 'careful' : (low || heavy || clash.length ? 'steady' : 'neutral');   // steady = 한신이지만 점수가 낮거나 이미 많은 기운·충이 겹침
    var interact = [], recommend = [], caution = [], basis = [];
    // ① 역할
    interact.push(GOOD[role] ? elJ(e, '은', '는') + ' 이 사주에 ' + (role === '용신' ? '가장 필요한 기운(용신)' : '도움이 되는 기운(희신)') + '이에요.'
      : BAD[role] ? elJ(e, '은', '는') + ' 이 사주에서 ' + (role === '기신' ? '부담이 되기 쉬운 기운(기신)' : '부담을 거드는 기운(구신)') + '이에요.'
        : elJ(e, '은', '는') + ' 이 사주에서 크게 돕지도 누르지도 않는 기운(한신)이에요.');
    // ② 세력 변화
    if (natal != null) {
      if (natal >= 30) { interact.push('원국에 이미 ' + EL_K[e] + ' 기운이 ' + natal + '%로 많아, 이 시기에 더 쏠리기 쉬워요.'); caution.push(T.over); }
      else if (natal <= 8) interact.push('원국에 ' + EL_K[e] + ' 기운이 ' + natal + '%로 적어, 평소 덜 쓰던 쪽이 새로 채워지는 시기예요.');
      else interact.push('원국의 ' + EL_K[e] + ' 기운은 ' + natal + '%로 보통이라, 이 시기에 그 쪽이 조금 더 살아나요.');
    }
    // ③ 합·충
    var group = function (list) { var g = {}; list.forEach(function (r) { var n = r.name || r.type; (g[n] = g[n] || []).push(where(r)); }); return Object.keys(g).map(function (n) { var w = g[n].filter(function (v, i, a) { return a.indexOf(v) === i; }).join('·'); return J(w, '과', '와') + ' ' + n; }); };
    if (hap.length) interact.push('원국 ' + group(hap).join(', ') + ' — 사람·조건이 맞물리기 쉬워요.');
    if (clash.length) { interact.push('원국 ' + group(clash).join(', ') + ' — 자리·환경이 흔들리기 쉬워요.'); caution.push('부딪히는 글자가 있어 결정·계약·이동은 조건을 한 번 더 확인하고 단계를 나눠 진행하세요.'); }
    // 추천 활동: 상태별로 다르게
    var topActs = T.acts.slice(0, 3);
    if (state === 'use') { recommend.push(T.use + '에 힘을 실어 보세요.'); recommend.push('추천: ' + topActs.join(' · ')); if (hap.length) recommend.push('합이 드는 시기라 협업·제안·계약을 먼저 꺼내 보기 좋아요.'); }
    else if (state === 'mixed') { recommend.push(T.use + '은 도움이 되는 방향이지만, 이 시기에는 서두르지 말고 작게 나눠 해 보세요.'); recommend.push('추천: ' + topActs.slice(0, 2).join(' · ') + ' (작은 단위로)'); }
    else if (state === 'careful') {
      var ny = [0, 1, 2, 3, 4].filter(function (k) { return roles[k] === '용신'; })[0];
      recommend.push(T.use + '은 이 시기에 피할 수 없이 늘어나요. 크게 벌이기보다 꼭 필요한 만큼만 하세요.');
      if (ny != null) recommend.push('나에게 필요한 ' + elN(ny) + ' 쪽 일(' + THEME[ny].words.slice(0, 2).join('·') + ')로 균형을 잡아 주면 좋아요.');
      caution.push(T.over);
    } else if (state === 'steady') { recommend.push(T.use + '이 늘어나는 시기예요. 범위를 좁혀 하나씩 마무리하며 속도를 조절하세요.'); recommend.push('추천: ' + topActs.slice(0, 2).join(' · ') + ' (한 번에 하나씩)'); }
    else { recommend.push(T.use + '을 무리 없이 해 볼 만한 시기예요.'); recommend.push('추천: ' + topActs.slice(0, 2).join(' · ')); }
    if (m.second != null && m.second !== e) basis.push('함께 들어오는 기운: ' + elN(m.second) + ' (' + THEME[m.second].words.slice(0, 2).join('·') + ')');
    basis.push('오행 무게(천간 1 + 지지 지장간 1): ' + m.weights.map(function (v, k) { return v ? EL_K[k] + ' ' + v : ''; }).filter(Boolean).join(' · '));
    if (fit != null) basis.push('흐름 점수 ' + (fit > 0 ? '+' : '') + Math.round(fit) + '(막대 높이, 엔진 값 그대로)');
    // 중복 주의 문장 정리
    caution = caution.filter(function (t, i, a) { return a.indexOf(t) === i; });
    var summary = elN(e) + ' 기운이 두드러지는 시기 — ' + T.words.join('·') + (state === 'use' ? ' 쪽을 적극 활용해 보세요.' : state === 'mixed' ? ' 쪽을 단계적으로 활용하세요.' : state === 'careful' ? ' 쪽 일이 늘지만 과하지 않게 조절하세요.' : state === 'steady' ? ' 쪽 일이 늘어나니 속도를 조절하세요.' : ' 쪽을 무리 없이 해 보세요.');
    return { version: VERSION, kind: kind || '', el: e, elName: EL_K[e], hanja: EL_H[e], words: T.words, weights: m.weights, second: m.second, role: role, natal: natal, fit: fit, state: state, summary: summary, interact: interact, recommend: recommend, caution: caution, basis: basis };
  }
  var LEGEND = EL_K.map(function (k, e) { return { el: e, name: k, hanja: EL_H[e], words: THEME[e].words }; });
  var api = { VERSION: VERSION, EL_K: EL_K, EL_H: EL_H, THEME: THEME, LEGEND: LEGEND, mainEl: mainEl, read: read };
  root.MantraLuckTheme = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
