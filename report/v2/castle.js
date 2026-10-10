/* 황금의 성채 — 직업·사업·재물을 주제별로 비교하는 인터랙션.
   ① 직업: 12개 분야 중 최대 2개를 골라 강점·주의·적합도·부담을 나란히 비교 ② 사업·독립: 일하는 방식 축(독립↔조직 등)과 부담이 큰 환경 ③ 재물: 앞으로 10년의 재물 지수와 구성 요소.
   값과 문장은 모두 엔진(careerProfile·evaluateDomainLuck)이 만든 것이다. 새 해석·수치를 만들지 않으며, 성공이나 수입을 보장하는 표현을 쓰지 않는다.
   R.Castle.model(M, ch, now) → { jobs, style, envs, wealth }   R.Castle.html(model, sel, esc)        검증: node tests/castle-sim.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var AXIS_ORDER = ['independence', 'stability', 'creation', 'interaction', 'execution', 'horizon'];
  var PARTS = { activity: '재정 활동성', fit: '재정 적합도', stability: '재정 안정성' };

  function model(M, ch, now) {
    var p = M.careerProfile(ch), top = (p.top || []).slice(0, 3).map(function (c) { return c.category; });
    var jobs = p.categories.slice().sort(function (a, b) { return b.score - a.score; }).map(function (c, i) {
      return { key: c.category, name: c.name, score: c.score, band: c.band, activity: c.activity, fit: c.fit, sustainability: c.sustainability, overload: c.overload, burden: c.burden,
        strengths: (c.strengths || []).slice(0, 4), cautions: (c.cautions || []).slice(0, 4), examples: (c.examples || []).slice(0, 6), rank: i + 1, isTop: top.indexOf(c.category) >= 0 };
    });
    var style = AXIS_ORDER.filter(function (k) { return p.workStyle && p.workStyle[k]; }).map(function (k) { var a = p.workStyle[k]; return { key: k, left: a.left, right: a.right, value: a.value, other: a.other, drivers: (a.drivers || []).slice(0, 3).map(function (d) { return d.label; }) }; });
    var envs = (p.burdenEnvs || p.envs || []).slice(0, 3).map(function (e) { return { name: e.name, desc: e.desc, burden: e.burden, why: (e.why || []).slice(0, 3) }; });
    var Y = M.yearPillarAt(now).sajuYear, wealth = [];
    try {
      M.seunRange(ch, Y, Y + 9).forEach(function (it) {
        var d = M.evaluateDomainLuck(ch, it, 'seun', { ms: it.midMs }).wealth;
        wealth.push({ year: it.year, age: it.year - ch.solar.y, ganzhi: M.gzNameK(it), score: Math.round(d.score), band: d.band, summary: d.summary, reasons: (d.reasons || []).slice(0, 5),
          parts: (d.parts || []).filter(function (x) { return PARTS[x.key]; }).map(function (x) { return { key: x.key, label: x.label, v: Math.round(x.v), w: Math.round(x.w * 100) }; }),
          vol: Math.round((d.components && d.components.volatility) || 0), isNow: it.year === Y });
      });
    } catch (e) { wealth = []; }
    return { jobs: jobs, style: style, envs: envs, wealth: wealth, summary: p.envSummary && p.envSummary.text || '' };
  }

  function bar(label, v, note) { return '<div class="cs-b"><span>' + E(label) + '</span><div role="img" aria-label="' + E(label + ' ' + v) + '"><i style="width:' + Math.max(2, Math.min(100, v)) + '%"></i></div><b>' + v + '</b>' + (note ? '<small>' + E(note) + '</small>' : '') + '</div>'; }
  function jobCol(j) {
    return '<div class="cs-col"><h5>' + E(j.name) + (j.isTop ? ' <i>상위 3</i>' : '') + '</h5>' + bar('적합 조화도', j.score, j.band) + bar('활동성', j.activity) + bar('지속성', j.sustainability) + bar('부담도(낮을수록 편함)', j.burden) +
      (j.strengths.length ? '<p class="cs-t g">잘 맞는 이유</p><ul>' + j.strengths.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>' : '') +
      (j.cautions.length ? '<p class="cs-t w">살펴볼 점</p><ul>' + j.cautions.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>' : '<p class="cs-t w">살펴볼 점</p><ul><li>뚜렷한 주의 신호는 계산되지 않았습니다.</li></ul>') +
      (j.examples.length ? '<p class="cs-t">예시 직무</p><p class="cs-ex">' + j.examples.map(E).join(' · ') + '</p>' : '') + '</div>';
  }

  /** sel: { tab: 'job'|'biz'|'wealth', jobs: [key, key?], year: n } */
  function html(m, sel, esc) {
    sel = sel || {}; var tab = sel.tab || 'job', h = '<section class="cs" aria-label="황금의 성채 · 직업·사업·재물"><div class="cs-tabs" role="tablist">' +
      [['job', '직업 비교'], ['biz', '사업·독립'], ['wealth', '재물 흐름']].map(function (t) { return '<button type="button" role="tab" data-cst="' + t[0] + '" aria-selected="' + (tab === t[0]) + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'job') {
      var pick = (sel.jobs && sel.jobs.length ? sel.jobs : [m.jobs[0].key, m.jobs[1].key]).filter(function (k) { return m.jobs.some(function (j) { return j.key === k; }); });
      h += '<p class="cs-in">분야를 눌러 최대 2개까지 나란히 비교해 보세요. 점수는 원국과의 조화도이며 성공이나 수입을 보장하지 않습니다.</p><div class="cs-chips">' + m.jobs.map(function (j) {
        return '<button type="button" class="cs-c' + (pick.indexOf(j.key) >= 0 ? ' sel' : '') + '" data-csj="' + j.key + '" aria-pressed="' + (pick.indexOf(j.key) >= 0) + '"><b>' + E(j.name) + '</b><span>' + j.score + '</span></button>'; }).join('') + '</div>';
      h += '<div class="cs-cmp c' + pick.length + '">' + pick.map(function (k) { return jobCol(m.jobs.filter(function (j) { return j.key === k; })[0]); }).join('') + '</div>';
    } else if (tab === 'biz') {
      h += '<p class="cs-in">일하는 방식의 성향입니다. 한쪽이 높다고 좋고 나쁜 것이 아니라, 맞는 환경이 달라집니다.</p>';
      h += '<div class="cs-ax">' + m.style.map(function (a) {
        return '<div class="cs-a"><div class="cs-al"><span>' + E(a.left) + ' <b>' + a.value + '</b></span><span><b>' + a.other + '</b> ' + E(a.right) + '</span></div><div class="cs-ab" role="img" aria-label="' + E(a.left + ' ' + a.value + ' 대 ' + a.right + ' ' + a.other) + '"><i style="width:' + a.value + '%"></i></div>' +
          (a.drivers.length ? '<small>영향: ' + a.drivers.map(E).join(' · ') + '</small>' : '') + '</div>'; }).join('') + '</div>';
      if (m.summary) h += '<p class="cs-sum">' + E(m.summary) + '</p>';
      var biz = m.jobs.filter(function (j) { return /^(business|sales|management|asset)$/.test(j.key); });
      h += '<p class="cs-t">사업·독립과 가까운 분야</p><div class="cs-mini">' + biz.map(function (j) { return '<button type="button" class="cs-c" data-csj="' + j.key + '" data-csgo="job"><b>' + E(j.name) + '</b><span>' + j.score + '</span></button>'; }).join('') + '</div>';
      if (m.envs.length) h += '<p class="cs-t w">부담이 커지기 쉬운 환경</p><ul class="cs-env">' + m.envs.map(function (e) { return '<li><b>' + E(e.name) + '</b> <i>부담 ' + e.burden + '</i><small>' + E(e.desc) + '</small><ul>' + e.why.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></li>'; }).join('') + '</ul>';
    } else {
      var cur = m.wealth.filter(function (w) { return w.year === sel.year; })[0] || m.wealth.filter(function (w) { return w.isNow; })[0] || m.wealth[0];
      h += '<p class="cs-in">앞으로 10년의 재물 지수입니다(0~100, 55 이상이면 무난, 70 이상이면 높음). 돈의 액수가 아니라 재정 활동·적합·안정 신호를 합친 상대 지표입니다.</p>';
      if (cur) {
        h += '<div class="cs-yr" role="list">' + m.wealth.map(function (w) { return '<button type="button" class="cs-y' + (w.year === cur.year ? ' sel' : '') + (w.isNow ? ' now' : '') + '" data-csy="' + w.year + '" aria-pressed="' + (w.year === cur.year) + '"><u style="height:' + Math.max(6, w.score) + '%"></u><b>' + w.score + '</b><span>' + String(w.year).slice(2) + '</span></button>'; }).join('') + '</div>';
        h += '<div class="cs-card"><p class="cs-ct">' + cur.year + '년 · ' + E(cur.ganzhi) + ' · ' + cur.age + '세</p><h4>재물 지수 ' + cur.score + ' <small>' + E(cur.band) + '</small></h4><p class="cs-sum">' + E(cur.summary) + '</p>' +
          cur.parts.map(function (x) { return bar(PARTS[x.key], x.v, '반영 ' + x.w + '%'); }).join('') + '<p class="cs-vol">변동성 ' + cur.vol + ' (점수에는 반영되지 않는 참고 값)</p>' +
          (cur.reasons.length ? '<details class="lb-d"><summary>근거 보기</summary><ul>' + cur.reasons.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></details>' : '') + '</div>';
      } else h += '<p class="cs-in">재물 흐름을 계산하지 못했습니다.</p>';
    }
    return h + '<p class="lb-f">명리 모델 안의 상대 지표이며 투자·직업 선택을 대신하는 조언이 아닙니다.</p></section>';
  }

  R.Castle = { model: model, html: html };
})(typeof window !== 'undefined' ? window : globalThis);
