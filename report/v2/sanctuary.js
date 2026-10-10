/* 개운의 성역 — 앞으로의 선택과 행동을 한곳에 모은다.
   ① 개운법: 행동·성장·사람·공간·환경·타이밍 6유형(운동 포함)을 유형별로 보고, "왜 지금 이 시기에 맞는지" 근거 태그를 확인
   ② 명소: 용신·희신 오행에 맞춘 명산대천·풍수 명당 순위(R.Deep.placeList — 챕터 본문과 같은 점수)
   ③ 실천 계획: 4단계 전략·이번 주 체크리스트(체크는 기기에만 저장)·피할 행동
   ④ 종합 리포트: 핵심 요약 카드와 PDF·공유 카드 생성(기존 해금 규칙을 그대로 따른다)
   추천·계획의 값은 추천 엔진(R.Remedy)이 정한 것이며 AI 가 만들지 않는다. 운동·장소는 건강 처방이나 보장이 아니라 현재 흐름에 맞는 활동·유형 추천이다.
   R.Sanctuary.model(rep, sd) → {...}   R.Sanctuary.html(model, sel, state, esc) → HTML                  검증: node tests/sanctuary-sim.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var TYPE_KO = { action: '행동', growth: '성장', people: '사람', place: '공간', environment: '환경', timing: '타이밍' };
  var TYPE_NOTE = { action: '지금 흐름에 맞는 행동과 운동·활동', growth: '기반을 쌓는 배움과 자기계발의 방식', people: '곁에 두면 도움이 되는 사람의 유형', place: '머물면 좋은 공간의 유형(실제 장소 지정 아님)', environment: '생활 환경을 정돈하는 방법', timing: '움직일 때와 쉴 때' };
  var TAG_KO = { output: '결과물', opportunity: '기회', expansion: '확장', connection: '연결', learning: '배움', accumulate: '축적', foundation: '기반', organize: '정리', transition: '전환', choice: '선택', execution: '실행',
    reinvest: '재투자', harvest: '수확', protect: '지킴', reduce: '줄이기', recovery: '회복', rest: '휴식', reflection: '성찰', listening: '경청', restraint: '절제', support: '도움', focus: '집중', creation: '창작', romantic: '인연' };
  var SEASON_KO = { opportunity: '기회', expansion: '확장', harvest: '수확', accumulation: '축적', transition: '전환', defense: '방어' };
  var SUM_ROWS = [['core', '나를 한 줄로'], ['strengths', '강점'], ['weaknesses', '조심할 점'], ['work', '일'], ['money', '돈'], ['people', '사람'], ['love', '사랑'], ['growth', '성장'], ['body', '몸 쓰기'], ['place', '머물 곳'], ['daewoon', '지금의 계절'], ['thisYear', '올해']];

  function model(rep, sd) {
    var rec = rep.remedies || {}, types = Object.keys(TYPE_KO).filter(function (t) { return (rec[t] || []).length; });
    var items = {};
    types.forEach(function (t) {
      items[t] = rec[t].map(function (c) {
        var it = c.item, ex = it.extra || {};
        return { id: it.id, title: it.title, summary: it.summary, detail: it.detail || '', exercise: ex.kind === 'exercise', check: ex.check || '', avoid: ex.avoid || [], examples: ex.examples || [], mode: ex.mode || '',
          why: (c.matchedTags || []).map(function (g) { return TAG_KO[g]; }).filter(Boolean).slice(0, 4) };
      });
    });
    var places = []; try { places = R.Deep && R.Deep.placeList ? R.Deep.placeList(sd) : []; } catch (e) { places = []; }
    var plan = rep.plan || { strategy: [], checklist: [], avoid: [] };
    return { types: types, items: items, places: places.map(function (x) { return { name: x.p[0], sub: x.p[1], note: x.p[2], el: x.el, role: x.role, score: x.score }; }),
      plan: { season: plan.season, seasonKo: SEASON_KO[plan.season] || '', strategy: plan.strategy || [], checklist: plan.checklist || [], avoid: plan.avoid || [] }, summary: rep.summary || {},
      useful: sd && sd.usefulElements ? { yong: sd.usefulElements.yong, hee: sd.usefulElements.hee } : null };
  }

  /** sel: { tab:'remedy'|'places'|'plan'|'report', type, openId }  st: { checks:{text:1}, readDone, readTotal, unlocked } */
  function html(m, sel, st, esc) {
    sel = sel || {}; st = st || {}; var tab = sel.tab || 'remedy';
    var h = '<section class="cs sn" aria-label="개운의 성역 · 개운법과 종합 행동 가이드"><div class="cs-tabs sn-tabs" role="tablist">' +
      [['remedy', '개운법'], ['places', '명소'], ['plan', '실천 계획'], ['report', '종합 리포트']].map(function (t) { return '<button type="button" role="tab" data-snt="' + t[0] + '" aria-selected="' + (tab === t[0]) + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'remedy') {
      var ty = m.types.indexOf(sel.type) >= 0 ? sel.type : m.types[0];
      h += '<p class="cs-in">지금의 흐름(' + E(m.plan.seasonKo || '현재') + ')에 필요한 쪽으로 고른 추천입니다. 의학적 처방이 아니라 생활 속 선택지입니다.</p><div class="cs-chips">' +
        m.types.map(function (t) { return '<button type="button" class="cs-c' + (t === ty ? ' sel' : '') + '" data-snk="' + t + '">' + TYPE_KO[t] + '</button>'; }).join('') + '</div><p class="cs-in">' + E(TYPE_NOTE[ty] || '') + '</p>';
      h += '<div class="sn-list">' + (m.items[ty] || []).map(function (x) {
        return '<div class="cs-card sn-it"><h4>' + E(x.title) + (x.exercise ? ' <i class="sn-ex">운동·활동</i>' : '') + '</h4><p class="cs-sum">' + E(x.summary) + '</p>' +
          (x.examples.length ? '<p class="cs-ex">예: ' + x.examples.map(E).join(' · ') + '</p>' : '') +
          (x.check ? '<p class="sn-ck">✓ 해 볼 것 · ' + E(x.check) + '</p>' : '') +
          (x.avoid.length ? '<p class="sn-av">피할 것 · ' + x.avoid.map(E).join(', ') + '</p>' : '') +
          (x.why.length ? '<p class="cs-vol">이 시기에 맞는 이유 · ' + x.why.map(E).join(' · ') + '</p>' : '') + '</div>'; }).join('') + '</div>';
    } else if (tab === 'places') {
      h += '<p class="cs-in">용신' + (m.useful && m.useful.yong ? '(' + E(m.useful.yong) + ')' : '') + '·희신' + (m.useful && m.useful.hee ? '(' + E(m.useful.hee) + ')' : '') + ' 오행에 맞춘 순위입니다. 방문을 권유하거나 효과를 보장하는 것이 아니라, 기운의 상징으로 고른 후보입니다.</p>';
      h += '<div class="sn-pl">' + m.places.map(function (p, i) {
        return '<div class="cs-card sn-p"><span class="sn-r">' + (i + 1) + '</span><div><b>' + E(p.name) + '</b><small>' + E(p.sub) + (p.note ? ' · ' + E(p.note) : '') + '</small><div class="cs-b"><span>' + E(p.el) + ' · ' + E(p.role) + '</span><div role="img" aria-label="' + E(p.name + ' ' + p.score + '점') + '"><i style="width:' + p.score + '%"></i></div><b>' + p.score + '</b></div></div></div>'; }).join('') + '</div>';
      if (!m.places.length) h += '<p class="cs-in">명소 목록을 계산하지 못했습니다.</p>';
    } else if (tab === 'plan') {
      h += '<p class="cs-in">' + E(m.plan.seasonKo || '') + (m.plan.seasonKo ? '의 흐름에서 ' : '') + '네 걸음으로 정리한 계획입니다. 한꺼번에 바꾸기보다 하나씩 체크해 보세요.</p>';
      h += '<ol class="sn-steps">' + m.plan.strategy.map(function (s) { return '<li><b>' + s.no + '</b><span>' + E(s.label) + '</span></li>'; }).join('') + '</ol>';
      var done = m.plan.checklist.filter(function (c) { return st.checks && st.checks[c]; }).length;
      h += '<p class="cs-t">이번 주 체크리스트 · ' + done + '/' + m.plan.checklist.length + '</p><ul class="sn-cl">' + m.plan.checklist.map(function (c, i) {
        return '<li><label><input type="checkbox" data-snc="' + i + '"' + (st.checks && st.checks[c] ? ' checked' : '') + '><span>' + E(c) + '</span></label></li>'; }).join('') + '</ul>';
      if (m.plan.avoid.length) h += '<p class="cs-t w">피하면 좋은 것</p><ul class="gd-l">' + m.plan.avoid.map(function (a) { return '<li>' + E(a) + '</li>'; }).join('') + '</ul>';
    } else {
      h += '<p class="cs-in">앞의 풀이를 한 장으로 모은 요약입니다.</p><div class="sn-sum">' + SUM_ROWS.filter(function (r) { return m.summary[r[0]]; }).map(function (r) {
        return '<div><span>' + r[1] + '</span><p>' + E(m.summary[r[0]]) + '</p></div>'; }).join('') + '</div>';
      var pct = st.readTotal ? Math.round(st.readDone / st.readTotal * 100) : 0;
      h += '<div class="cs-card"><p class="cs-ct">종합 리포트</p><h4>읽은 챕터 ' + (st.readDone || 0) + ' / ' + (st.readTotal || 0) + ' <small>' + pct + '%</small></h4>' +
        '<p class="cs-sum">' + (st.unlocked ? 'PDF 리포트와 공유 카드를 만들 수 있습니다.' : 'PDF 리포트는 챕터를 더 읽으면 열립니다(기존 해금 규칙과 같습니다).') + '</p>' +
        '<div class="sn-btns"><button type="button" class="btn gold big" data-snpdf' + (st.unlocked ? '' : ' disabled') + '>종합 리포트 PDF 받기</button><button type="button" class="btn big" data-snshare>공유 카드 만들기</button></div></div>';
    }
    return h + '<p class="lb-f">운세 해석과 실제 의사결정은 구분해서 보세요. 이 내용은 참고용 콘텐츠이며 의학·법률·투자 조언이 아닙니다.</p></section>';
  }

  R.Sanctuary = { model: model, html: html, TYPE_KO: TYPE_KO };
})(typeof window !== 'undefined' ? window : globalThis);
