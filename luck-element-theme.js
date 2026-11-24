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
 *        MantraLuckTheme.readDomain(M, ch, x, kind, key, {score, name}) → read() + 그 분야 말(area·words·use·acts·summary·recommend·caution)
 *        MantraLuckTheme.legendFor(key) → 분야 지표 그래프 범례(같은 오행 색, 분야 말)
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

  // ── 분야 지표 그래프(2026-11-25): 같은 주요 오행·같은 색, 말만 그 지표에 맞게 바꾼다
  //  한 칸 = '핵심어1·핵심어2|활용 방향(…하는 일)|추천1 / 추천2' · 목·화·토·금·수 순서 · 오행 테마(성장/표현/안정/실행/탐구)를 그 분야 말로 옮긴 것
  //  점수·등급은 엔진(evaluateDomainLuck·luck-grade.js) 값 그대로 — 여기서는 문장만 만든다
  var DOMAIN_RAW = {
    love: ['관계', [
      '새 만남·관계 넓히기|새로운 사람을 만나고 관계의 폭을 넓히는 일|모임·소개 자리 나가기 / 함께 배울 거리 만들기',
      '마음 표현·고백|마음을 드러내고 표현하는 일|먼저 연락해 마음 전하기 / 데이트 계획 세우기',
      '관계 안정·신뢰|지금 관계를 다지고 신뢰를 쌓는 일|정기적인 만남 약속 / 생활 리듬 맞추기',
      '관계 정리·결정|관계를 분명히 하고 결정하는 일|관계·약속 분명히 하기 / 애매한 관계 정리',
      '속마음 이해·깊은 대화|상대의 마음을 깊이 알아가는 일|깊은 대화 나누기 / 상대의 생각·취향 알아보기']],
    wealth: ['돈·수입', [
      '수입원 늘리기·돈 공부|새 수입원을 기획하고 돈 공부로 판을 넓히는 일|부업·새 수입원 기획 / 재테크 공부',
      '판매·홍보 수입|알리고 팔아서 돈을 만드는 일|상품·서비스 알리기 / 가격 제시·영업',
      '지출 관리·자산 정리|돈을 정리하고 지키며 기반을 다지는 일|고정비·가계부 정리 / 저축·비상금 구조 만들기',
      '계약·정산·수익 챙기기|조건을 정하고 계약·정산으로 수익을 손에 쥐는 일|계약·견적 조건 정리 / 받을 돈 정산',
      '시장 조사·돈 흐름 파악|정보를 모으고 돈의 흐름을 읽어 전략을 세우는 일|시장·가격 조사 / 현금 흐름 점검']],
    health: ['몸·생활 리듬', [
      '운동 시작·활동량|몸을 움직이고 새 건강 습관을 시작하는 일|걷기·스트레칭 시작 / 새 운동 배우기',
      '활력·과열 식히기|활력을 살리되 과열을 식히는 일|땀 나는 운동 / 수면 시간 지키기',
      '식사·생활 리듬|식사와 생활 리듬을 규칙적으로 관리하는 일|규칙적인 식사 / 검진 일정 잡기',
      '절제·습관 정리|나쁜 습관을 끊고 몸 관리를 결단하는 일|술·야식 줄이기 / 호흡·자세 관리',
      '휴식·회복|충분히 쉬고 회복하며 몸 상태를 살피는 일|숙면·쉬는 시간 확보 / 몸 상태 기록']],
    accident: ['안전', [
      '활동 범위·이동|활동이 늘어나는 만큼 이동·야외 안전을 챙기는 일|무리한 일정 줄이기 / 야외 활동 전 준비',
      '서두름·열기|급한 마음과 열기를 식히는 일|운전·작업 때 속도 줄이기 / 불·전기 점검',
      '생활 환경 점검|집·작업 환경을 정비해 위험을 줄이는 일|집·작업장 정리 / 무거운 물건 조심',
      '도구·기계·차량|날카로운 도구·기계·차량을 조심히 다루는 일|차량·장비 점검 / 칼·공구 쓸 때 집중',
      '피로·주의 분산|피로와 딴생각에서 오는 실수를 줄이는 일|피곤할 때 운전 피하기 / 빗길·물가 조심']],
    job: ['취업·합격', [
      '지원 분야 넓히기·자격 준비|지원 분야를 넓히고 필요한 자격을 준비하는 일|자격·공부 준비 / 새 분야 공고 찾기',
      '자기소개·면접 어필|나를 드러내 보여 주는 일|자기소개서·포트폴리오 다듬기 / 면접 연습',
      '서류·일정 관리|지원 일정과 서류를 차근차근 관리하는 일|지원 일정표 만들기 / 서류 정리',
      '지원·결정|원서를 내고 조건을 따져 결정하는 일|마감 맞춰 지원하기 / 조건 비교 뒤 결정',
      '기업 조사·지원 전략|회사와 직무를 알아보고 전략을 세우는 일|기업·직무 조사 / 지원 전략 다듬기']],
    move: ['이직', [
      '새 자리 탐색|새 분야·새 자리를 넓게 알아보는 일|이직 시장 둘러보기 / 필요한 기술 배우기',
      '경력 알리기|경력과 성과를 드러내 알리는 일|이력서·경력 정리 / 업계 사람에게 알리기',
      '지금 자리 정비|옮기기 전에 지금 자리를 정리하고 기반을 다지는 일|인수인계 준비 / 생활비·조건 점검',
      '조건 협상·결정|조건을 협상하고 옮길지 결정하는 일|연봉·조건 협상 / 옮길지 결정',
      '정보 수집·비교|회사 정보를 모으고 비교해 판단하는 일|회사 평판 조사 / 선택지 비교표 만들기']],
    career: ['일·직업', [
      '역량 키우기·업무 확장|일의 범위를 넓히고 역량을 키우는 일|새 업무 맡기 / 실무 공부',
      '성과 알리기·발표|한 일을 드러내고 인정받는 일|보고·발표 / 성과 정리해 알리기',
      '업무 체계·관리|업무를 정리하고 체계를 다지는 일|업무 절차 정리 / 일정·팀 관리',
      '마무리·결과물 완성|결정하고 마감해 결과물을 내는 일|미뤄 둔 결정 / 프로젝트 마감',
      '기획·전략|다음 일을 궁리하고 전략을 세우는 일|업무·시장 분석 / 중장기 계획']],
    business: ['사업·거래', [
      '사업 확장·새 아이템|새 아이템을 기획하고 사업 범위를 넓히는 일|신규 아이템 기획 / 판로 넓히기',
      '홍보·브랜딩|사업을 알리고 고객을 모으는 일|홍보·마케팅 / 브랜드 다듬기',
      '운영·자금 관리|운영을 정비하고 자금·재고를 관리하는 일|자금·재고 정리 / 운영 시스템 만들기',
      '계약·거래 성사|조건을 정하고 계약·거래를 성사시키는 일|거래 조건 매듭짓기 / 손익 정산',
      '시장 조사·사업 전략|시장을 조사하고 다음 수를 준비하는 일|고객·경쟁 조사 / 사업 전략 세우기']],
    child: ['자녀', [
      '배움·성장 돕기|아이의 배움과 성장을 돕는 일|함께 배울 거리 찾기 / 새 활동 해 보기',
      '칭찬·마음 표현|아이와 마음을 표현하고 칭찬하는 일|칭찬·응원 표현 / 함께 놀며 이야기하기',
      '생활 습관·돌봄|아이의 생활 리듬과 돌봄을 챙기는 일|생활 습관 잡기 / 함께하는 시간 정해 두기',
      '규칙·약속 정하기|규칙과 약속을 분명히 정하는 일|집 규칙 정하기 / 학교·진로 결정',
      '속마음 듣기|아이의 속마음을 듣고 이해하는 일|차분한 대화 / 아이 관심사 알아보기']],
    marriage: ['결혼·배우자', [
      '함께 그리는 계획|둘의 앞날 계획을 함께 그리는 일|함께할 계획 세우기 / 서로의 가족과 가까워지기',
      '마음 표현·관계 알리기|마음을 드러내고 관계를 주변에 알리는 일|고마움 표현 / 가족·지인에게 소개',
      '생활 기반·살림|함께 살 기반과 살림을 다지는 일|주거·생활비 계획 / 생활 규칙 맞추기',
      '약속·결정|중요한 약속을 분명히 결정하는 일|일정·조건 정하기 / 중요한 약속 매듭짓기',
      '깊은 대화·서로 이해|서로의 생각을 깊이 맞춰 보는 일|가치관 대화 / 서로의 걱정 들어 보기']],
    noble: ['도움·인맥', [
      '인맥 넓히기|새 사람을 만나 도움의 폭을 넓히는 일|모임·커뮤니티 참여 / 배울 사람 찾아가기',
      '나를 알리기|나를 알려 도와줄 사람이 찾아오게 하는 일|내 일 알리기 / 먼저 인사·연락',
      '신뢰 관계 다지기|이미 있는 인연을 꾸준히 챙기는 일|안부·감사 인사 / 오래된 인연 챙기기',
      '도움 요청·약속|필요한 도움을 분명히 청하고 약속을 지키는 일|구체적으로 부탁하기 / 받은 도움 갚기',
      '조언 구하기|경험 많은 사람에게 묻고 배우는 일|선배·멘토에게 조언 구하기 / 정보 나누기']],
    study: ['공부·시험', [
      '새 공부 시작|새 공부를 시작하고 배움을 넓히는 일|새 과목·강의 시작 / 공부 계획 세우기',
      '발표·써 보기|배운 것을 말하고 써 보는 일|발표·토론 / 정리 노트 쓰기',
      '반복·복습|꾸준히 반복하며 기초를 다지는 일|복습 일정 짜기 / 기초 다지기',
      '시험·마무리|시험을 치르고 공부를 마무리하는 일|실전 문제 풀기 / 시험 일정 정하기',
      '깊이 파고들기|원리를 깊이 이해하고 자료를 모으는 일|원리 이해 / 자료 조사']],
    estate: ['문서·거처', [
      '새 거처·계획|이사·거처 계획을 세우고 넓게 알아보는 일|지역·매물 둘러보기 / 이사 계획 세우기',
      '조건 제시·알리기|내놓을 것을 알리고 조건을 제시하는 일|매물 내놓기 / 조건 제시',
      '집·서류 정리|집과 서류를 정리하고 기반을 다지는 일|서류·등기 정리 / 집 수리·정비',
      '계약·서명|조건을 따져 계약하고 서명하는 일|계약 조건 확인 뒤 서명 / 잔금·날짜 정하기',
      '시세·정보 조사|시세와 정보를 모아 판단하는 일|시세·권리 관계 조사 / 대출·조건 비교']],
    social: ['사람·말', [
      '교류 넓히기|새 사람과 교류를 넓히는 일|새 모임 참여 / 협업 제안',
      '말·표현|말과 표현이 늘어나는 만큼 다듬는 일|생각 나누기 / 말하기 전 한 번 고르기',
      '관계 조율|사람 사이를 조율하고 중재하는 일|갈등 중재 / 오래된 관계 챙기기',
      '선 긋기·정리|관계의 선을 분명히 하는 일|거절할 것 거절하기 / 역할·약속 분명히',
      '듣기·살피기|말보다 듣고 분위기를 살피는 일|먼저 듣기 / 소문은 확인 뒤 판단']],
    family: ['가족', [
      '함께하는 시간 늘리기|가족과 함께할 일을 새로 만드는 일|가족 나들이 계획 / 함께 배울 거리',
      '마음 표현·연락|가족에게 마음을 표현하는 일|고마움 말하기 / 연락 자주 하기',
      '살림·돌봄|집안 살림과 돌봄을 챙기는 일|부모님 생활 챙기기 / 집안 일 나누기',
      '집안 결정|미뤄 둔 집안 일을 결정하는 일|집안 대소사 결정 / 역할 정리',
      '속 이야기 듣기|가족의 속 이야기를 듣는 일|차분한 대화 / 가족 사정 알아보기']],
    windfall: ['뜻밖의 수입', [
      '새 기회 찾기|뜻밖의 기회가 될 새 길을 넓게 찾는 일|새 제안 살펴보기 / 부수입 길 찾기',
      '재주가 돈 되기|재주와 끼를 드러내 돈으로 잇는 일|재능 판매·외주 / 내 작업 알리기',
      '들어온 돈 지키기|들어온 것을 지키고 쌓는 일|뜻밖의 돈은 바로 저축 / 지출 한도 정하기',
      '기회 매듭짓기·정산|기회를 조건으로 매듭짓고 정산하는 일|조건 확인 뒤 매듭짓기 / 받을 돈 정산',
      '정보·기회 알아보기|정보를 모아 기회를 알아보는 일|정보 모으기 / 확인 안 된 제안 거르기']]
  };
  var DOMAIN = {};
  Object.keys(DOMAIN_RAW).forEach(function (k) {
    DOMAIN[k] = { area: DOMAIN_RAW[k][0], e: DOMAIN_RAW[k][1].map(function (row) { var p = row.split('|'); return { words: p[0].split('·'), use: p[1], acts: p[2].split(' / ') }; }) };
  });
  // 분야별 끝맺음 주의(그 지표가 예측이 아니라는 점) — 건강·사고수·횡재만
  var DOMAIN_NOTE = { health: '몸 상태는 진단이 아니라 생활 관리 방향으로만 봐 주세요.', accident: '사고를 예측하는 값이 아니라 조심할 쪽을 알려 주는 참고예요.', windfall: '투자·도박의 수익을 뜻하지 않아요. 뜻밖의 돈일수록 확인하고 지키는 쪽이 먼저예요.' };
  // 원국과 부딪히는 글자가 있을 때 분야별 주의(없으면 기본 문장)
  var DOMAIN_CLASH = { accident: '부딪히는 글자가 있어 이동·작업·운전은 서두르지 말고 한 번 더 확인하세요.', health: '부딪히는 글자가 있어 몸 관리는 무리하게 바꾸기보다 조금씩 늘려 가세요.', love: '부딪히는 글자가 있어 관계의 중요한 말·약속은 감정이 가라앉은 뒤 한 번 더 확인하세요.', child: '부딪히는 글자가 있어 아이와 부딪칠 때는 바로 정하기보다 한 번 쉬고 이야기하세요.', family: '부딪히는 글자가 있어 집안 일은 한 번에 정하기보다 가족과 단계를 나눠 이야기하세요.', social: '부딪히는 글자가 있어 말이 오해로 번지기 쉬워요. 중요한 말은 글로 한 번 더 확인하세요.' };
  // 지표 점수 등급별 한 줄(좋음|무난|조심) — 그 지표 말로, 사건 예측 없이. 사고수·대인·구설은 높을수록/낮을수록 뜻이 달라 등급 기준(luck-grade.js)을 그대로 따른다
  var GRADE_RAW = {
    love: '사람을 만나고 마음을 나누는 흐름이 평소보다 살아나는 시기예요.|관계 흐름은 평소 수준이에요. 지금 관계를 꾸준히 챙기기 좋아요.|관계에 부담 신호가 겹쳐요. 중요한 말·약속은 서두르지 마세요.',
    wealth: '돈이 들어오고 도는 흐름이 평소보다 살아나는 시기예요.|돈 흐름은 평소 수준이에요. 새로 벌이기보다 지금 구조를 다듬기 좋아요.|돈 흐름에 부담 신호가 겹쳐요. 큰 지출·투자는 한 번 더 따져 보세요.',
    health: '몸과 생활의 균형이 평소보다 잘 잡히는 시기예요.|균형은 평소 수준이에요. 지금 생활 리듬을 지키면 충분해요.|균형에 부담 신호가 겹쳐요. 무리한 일정은 줄이고 쉬는 시간을 먼저 챙기세요.',
    accident: '조심할 신호가 적은 편이에요. 평소 안전 습관만 지키면 돼요.|조심할 신호는 평소 수준이에요. 이동·작업 때 기본만 챙기세요.|변화·충돌 신호가 겹쳐요. 이동·작업·운전 때 서두르지 마세요.',
    job: '조직과 닿는 신호가 살아나 지원·면접에 힘을 싣기 좋은 시기예요.|취업 흐름은 평소 수준이에요. 준비를 꾸준히 쌓기 좋아요.|취업 쪽 부담 신호가 겹쳐요. 지원 범위를 좁혀 준비를 더 다지세요.',
    move: '옮길 때의 유리함과 안착 신호가 함께 살아나는 시기예요.|이동 신호는 평소 수준이에요. 옮길지 말지 정보만 모아 두기 좋아요.|옮긴 뒤 안착에 부담 신호가 있어요. 조건을 충분히 비교한 뒤 정하세요.',
    career: '타고난 적성이 일에서 잘 쓰이는 시기예요. 성과를 드러내기 좋아요.|일의 흐름은 평소 수준이에요. 맡은 일을 다듬기 좋아요.|일에 부담 신호가 겹쳐요. 새 일을 늘리기보다 지금 일을 정리하세요.',
    business: '거래·사업 활동이 평소보다 살아나는 시기예요.|사업 흐름은 평소 수준이에요. 운영을 다지기 좋아요.|사업 쪽 부담 신호가 겹쳐요. 확장보다 자금·운영 점검을 먼저 하세요.',
    child: '자녀와 관련된 흐름이 평소보다 살아나는 시기예요.|자녀 쪽 흐름은 평소 수준이에요. 함께하는 시간을 꾸준히 챙기세요.|자녀 쪽 부담 신호가 겹쳐요. 다그치기보다 이야기를 먼저 들어 주세요.',
    marriage: '관계가 이어지고 묶이는 신호가 살아나는 시기예요.|결혼·배우자 흐름은 평소 수준이에요. 생활을 맞춰 가기 좋아요.|배우자 쪽 부담 신호가 겹쳐요. 중요한 결정은 충분히 대화한 뒤 하세요.',
    noble: '도와주는 사람과 닿기 쉬운 시기예요. 먼저 도움을 청해 보세요.|도움의 흐름은 평소 수준이에요. 있는 인연을 꾸준히 챙기세요.|도움보다 경쟁·긴장 신호가 커요. 혼자 감당할 일과 부탁할 일을 나누세요.',
    study: '공부·시험에 집중이 잘 붙는 시기예요.|공부 흐름은 평소 수준이에요. 계획대로 꾸준히 하기 좋아요.|집중에 부담 신호가 겹쳐요. 목표를 작게 나눠 하나씩 끝내세요.',
    estate: '문서·계약·거처 쪽 흐름이 평소보다 살아나는 시기예요.|문서·거처 흐름은 평소 수준이에요. 서류를 정리해 두기 좋아요.|문서·거처 쪽 부담 신호가 겹쳐요. 계약 조건과 날짜를 한 번 더 확인하세요.',
    social: '사람 사이 마찰 신호가 적어 교류하기 편한 시기예요.|대인 흐름은 평소 수준이에요. 평소처럼 말과 약속을 지키면 돼요.|마찰·구설 신호가 겹쳐요. 말은 줄이고 오해는 바로 푸세요.',
    family: '가족과 집안 흐름이 평소보다 안정되는 시기예요.|가족 흐름은 평소 수준이에요. 안부와 집안 일을 꾸준히 챙기세요.|가족·집안 쪽 부담 신호가 겹쳐요. 큰 결정은 가족과 나눠 이야기하세요.',
    windfall: '뜻밖의 수입·기회 신호가 평소보다 살아나는 시기예요. 들어온 것은 먼저 지키세요.|뜻밖의 수입 흐름은 평소 수준이에요. 꾸준한 수입에 집중하세요.|뜻밖의 수입 신호가 약해요. 쉽게 버는 제안일수록 거르세요.'
  };
  var GRADE_LINE = {}; Object.keys(GRADE_RAW).forEach(function (k) { var p = GRADE_RAW[k].split('|'); GRADE_LINE[k] = { good: p[0], ok: p[1], care: p[2] }; });
  function gradeLine(key, gk) { return GRADE_LINE[key] && GRADE_LINE[key][gk] || ''; }
  // 분야 지표 해석: read()의 주요 오행·역할·원국 작용은 그대로 쓰고, 핵심어·활용 방향·추천만 그 분야 말로 바꾼다
  //  opt.score: 그 분야 점수(막대 높이, 엔진 값) · opt.name: 지표 이름(예: 재물운) · opt.grade: 그 점수의 등급 키(good·ok·care)
  function readDomain(M, ch, x, kind, key, opt) {
    var D = DOMAIN[key], base = read(M, ch, x, kind); if (!D || !base) return base;
    opt = opt || {};
    var e = base.el, E = D.e[e], state = base.state, roles = (ch.unified && ch.unified.roles) || {};
    var w2 = E.words.join('·'), acts = E.acts, recommend = [], caution = [];
    if (state === 'use') { recommend.push(D.area + '에서는 ' + E.use + '에 힘을 실어 보세요.'); recommend.push('추천: ' + acts.join(' · ')); if (base.interact.some(function (t) { return /합 —/.test(t); })) recommend.push('합이 드는 시기라 ' + D.area + ' 쪽 제안·약속을 먼저 꺼내 보기 좋아요.'); }
    else if (state === 'mixed') { recommend.push(D.area + '에서는 ' + J(E.use, '이', '가') + ' 도움이 되는 방향이지만, 서두르지 말고 작게 나눠 해 보세요.'); recommend.push('추천: ' + acts[0] + ' (작은 단위로)'); }
    else if (state === 'careful') {
      var ny = [0, 1, 2, 3, 4].filter(function (k) { return roles[k] === '용신'; })[0];
      recommend.push(D.area + '에서는 ' + J(E.use, '이', '가') + ' 이 시기에 늘어나요. 크게 벌이기보다 꼭 필요한 만큼만 하세요.');
      if (ny != null && ny !== e) recommend.push('나에게 필요한 ' + elN(ny) + ' 쪽(' + D.e[ny].words.join('·') + ')으로 균형을 잡아 주면 좋아요.');
      caution.push(D.area + ' 쪽에서 ' + E.words[0] + '에 너무 쏠리지 않게, 한 번에 하나씩 조절하세요.');
    } else if (state === 'steady') { recommend.push(D.area + '에서는 ' + J(E.use, '이', '가') + ' 늘어나는 시기예요. 범위를 좁혀 하나씩 마무리하세요.'); recommend.push('추천: ' + acts[0] + ' (한 번에 하나씩)'); }
    else { recommend.push(D.area + '에서는 ' + E.use + '을 무리 없이 해 볼 만한 시기예요.'); recommend.push('추천: ' + acts.join(' · ')); }
    // 원국에 이미 많은 기운·충돌 주의는 read() 근거를 따르되 분야 말로
    if (base.natal != null && base.natal >= 30 && state !== 'careful') caution.push('원국에 ' + EL_K[e] + ' 기운이 이미 많아 ' + D.area + '에서도 ' + E.words[0] + ' 쪽으로 쏠리기 쉬워요. 속도를 조절하세요.');
    if (base.interact.some(function (t) { return /흔들리기 쉬워요/.test(t); })) caution.push(DOMAIN_CLASH[key] || ('부딪히는 글자가 있어 ' + D.area + ' 쪽 결정·약속은 조건을 한 번 더 확인하고 단계를 나눠 진행하세요.'));
    if (DOMAIN_NOTE[key]) caution.push(DOMAIN_NOTE[key]);
    caution = caution.filter(function (t, i, a) { return a.indexOf(t) === i; });
    var basis = base.basis.filter(function (t) { return !/^흐름 점수/.test(t); }).map(function (t) { return /^함께 들어오는 기운/.test(t) && base.second != null ? '함께 들어오는 기운: ' + elN(base.second) + ' (' + D.e[base.second].words.join('·') + ')' : t; });
    if (typeof opt.score === 'number') basis.push((opt.name || D.area) + ' ' + opt.score + '점(막대 높이, 엔진 값 그대로)');
    if (base.fit != null) basis.push('전체 흐름 점수 ' + (base.fit > 0 ? '+' : '') + Math.round(base.fit));
    var tail = state === 'use' ? ' 쪽을 적극 활용해 보세요.' : state === 'mixed' ? ' 쪽을 단계적으로 활용하세요.' : state === 'careful' ? ' 쪽 일이 늘지만 과하지 않게 조절하세요.' : state === 'steady' ? ' 쪽 일이 늘어나니 속도를 조절하세요.' : ' 쪽을 무리 없이 해 보세요.';
    // 그 지표 점수의 등급(opt.grade: good·ok·care, luck-grade.js 엔진 값)과 어긋나지 않게 — 오행 상태가 좋아도 지표가 조심이면 작게, 반대면 기회를 살리되 조절
    var g = opt.grade, nm = opt.name || D.area;
    if (key !== 'accident' && g === 'care' && (state === 'use' || state === 'neutral')) { tail = ' 쪽을 살리되, ' + nm + ' 점수가 조심 구간이라 작게 시험해 보고 넓히세요.'; caution.unshift(J(nm, '은', '는') + ' 이 시기 조심 구간이에요. ' + D.area + ' 쪽 큰 결정은 조건을 한 번 더 확인하세요.'); }
    else if (key !== 'accident' && g === 'care' && state === 'mixed') caution.unshift(J(nm, '은', '는') + ' 이 시기 조심 구간이에요. ' + D.area + ' 쪽은 단계를 나눠 진행하세요.');
    else if (key !== 'accident' && g === 'good' && (state === 'careful' || state === 'steady')) { tail = ' 쪽 기회가 보이니, 필요한 만큼만 살려 보세요.'; recommend.unshift(J(nm, '은', '는') + ' 이 시기 좋음 구간이에요. ' + D.area + ' 쪽 기회는 살리되 범위를 정해 두세요.'); }
    // 사고수(안전)는 활용할 기운이 아니라 챙길 쪽 — 활용·추천 대신 조심할 쪽으로 말한다(등급 good = 조심 신호가 적음)
    if (key === 'accident') {
      var hard = g === 'care' || (g !== 'good' && (state === 'careful' || state === 'steady' || state === 'mixed'));
      tail = hard ? ' 쪽을 평소보다 더 챙겨 주세요.' : ' 쪽만 가볍게 챙기면 돼요.';
      recommend = [D.area + '에서는 ' + E.use + '을 ' + (hard ? '평소보다 더 ' : '') + '챙겨 주세요.', '챙길 것: ' + acts.join(' · ')];
      caution = caution.filter(function (t) { return !/쏠리지 않게/.test(t); });
    }
    var summary = elN(e) + ' 기운이 두드러지는 시기 — ' + D.area + '에서는 ' + w2 + tail;
    var out = {}; Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    out.domain = key; out.area = D.area; out.words = E.words; out.use = E.use; out.acts = acts; out.summary = summary; out.recommend = recommend; out.caution = caution; out.basis = basis;
    return out;
  }
  function legendFor(key) {
    var D = DOMAIN[key]; if (!D) return LEGEND;
    return EL_K.map(function (k, e) { return { el: e, name: k, hanja: EL_H[e], words: D.e[e].words, area: D.area }; });
  }
  var api = { VERSION: VERSION, EL_K: EL_K, EL_H: EL_H, THEME: THEME, LEGEND: LEGEND, DOMAIN: DOMAIN, mainEl: mainEl, read: read, readDomain: readDomain, legendFor: legendFor, GRADE_LINE: GRADE_LINE, gradeLine: gradeLine };
  root.MantraLuckTheme = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
