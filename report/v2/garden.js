/* 인연의 정원 — 관계 유형과 궁합 조건을 직접 탐색한다.
   ① 궁합 일주 탐색: 60개 일주를 유형·조화·끌림으로 걸러 보고, 상대의 일주(일간+일지)를 직접 골라 상성을 본다.
      상대의 전체 사주를 모르는 상태에서 일주 두 글자만 본 상성이다(엔진 compatDayPillars·compatAttraction). 입력값은 기기 밖으로 나가지 않는다.
   ② 사랑의 흐름: 배우자 자리, 앞으로 10년 애정 지수, 연애·결혼·인간관계 이야기(기존 StoryComposer 텍스트).
   값과 문장은 엔진·기존 풀이 텍스트에서만 온다. 새 수치를 만들지 않고, 특정 상대나 결혼 여부를 단정하지 않는다.
   R.Garden.model(M, ch, sd, now, partner) → {...}   R.Garden.html(model, sel, esc)             검증: node tests/garden-sim.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var TYPES = ['보완형', '안정형', '혼합형', '활성형', '상호자극형'];
  var TYPE_NOTE = { '보완형': '내 사주에 부족한 기운을 채워 주는 쪽', '안정형': '서로의 기운이 편안하게 이어지는 쪽', '혼합형': '장점과 마찰이 함께 있는 쪽', '활성형': '서로를 활발하게 움직이게 하는 쪽', '상호자극형': '자극이 크고 부딪힘도 큰 쪽' };
  var SORTS = { score: '조화 점수', toThem: '내가 끌림', toMe: '나를 좋아함', mutual: '서로 끌림' };
  var PARTS = { activity: '관계 활성도', fit: '원국 적합도', stability: '관계 안정성' };
  var TOPIC = { love: '연애', marriage: '결혼', relation: '인간관계' };

  function model(M, ch, sd, now, partner) {
    partner = partner === 'any' ? 'any' : 'opposite';
    var list = M.compatAttraction(ch, partner).map(function (x) {
      return { i: x.i, s: x.s, b: x.b, han: M.STEM.charAt(x.s) + M.BR.charAt(x.b), kor: x.ganzhiK, el: (x.s / 2) | 0, score: x.score, type: x.type, condition: x.condition,
        stemTG: x.stemTG, branchTG: x.branchTG, parts: (x.parts || []).map(function (p) { return { label: p.label, w: p.w, pts: Math.round(p.pts * 10) / 10 }; }),
        reasons: (x.reasons || []).slice(0, 4), cautions: (x.cautions || []).slice(0, 4), tags: (x.tags || []).slice(0, 5).map(function (t) { return { kind: t.kind, where: t.where, name: t.name }; }),
        toThem: x.attract ? { score: x.attract.toThem.score, reasons: (x.attract.toThem.reasons || []).slice(0, 3) } : null, toMe: x.attract ? { score: x.attract.toMe.score, reasons: (x.attract.toMe.reasons || []).slice(0, 3) } : null,
        mutual: x.attract ? x.attract.mutual : null };
    });
    var g = sd && sd.groups ? sd.groups : {}, groups = ['비겁', '식상', '재성', '관성', '인성'], top = groups.slice().sort(function (a, b) { return (g[b] || 0) - (g[a] || 0); })[0];
    var day = ch.pillars.day, cd = ch.cells.day, spouseGroup = ch.gender === 'F' ? '관성' : '재성';
    var spouse = { branchHan: M.BR.charAt(day.b), branchKor: M.BR_K.charAt(day.b), branchTG: cd.branchTG, unseong: cd.unseong || '', group: spouseGroup, pct: Math.round(g[spouseGroup] || 0),
      note: '전통 해석에서 일지는 배우자 자리, ' + (ch.gender === 'F' ? '여성은 관성' : '남성은 재성') + '을 배우자성으로 봅니다. 성별과 관계 형태에 따라 해석은 달라질 수 있습니다.' };
    var Y = M.yearPillarAt(now).sajuYear, love = [];
    try {
      M.seunRange(ch, Y, Y + 9).forEach(function (it) {
        var d = M.evaluateDomainLuck(ch, it, 'seun', { ms: it.midMs }).love;
        love.push({ year: it.year, age: it.year - ch.solar.y, ganzhi: M.gzNameK(it), score: Math.round(d.score), band: d.band, summary: d.summary, reasons: (d.reasons || []).slice(0, 5),
          parts: (d.parts || []).filter(function (x) { return PARTS[x.key]; }).map(function (x) { return { key: x.key, v: Math.round(x.v), w: Math.round(x.w * 100) }; }),
          vol: Math.round((d.components && d.components.volatility) || 0), isNow: it.year === Y });
      });
    } catch (e) { love = []; }
    var SC = R.StoryComposer && R.StoryComposer.TOPICS || {}, stories = {};
    Object.keys(TOPIC).forEach(function (k) { var t = SC[k] && SC[k][top]; if (t) stories[k] = { title: TOPIC[k], head: t[0], real: t[1] || [], examples: Array.isArray(t[2]) ? t[2] : [], pro: typeof t[3] === 'string' ? t[3] : '', trap: typeof t[4] === 'string' ? t[4] : '', action: t[5] || '' }; });
    return { partner: partner, pairs: list, spouse: spouse, love: love, stories: stories, topGroup: top, myDay: M.STEM.charAt(day.s) + M.BR.charAt(day.b) };
  }

  var pickList = function (m, sel) {
    var l = m.pairs.slice(), t = sel.type || '';
    if (t) l = l.filter(function (x) { return x.type === t; });
    var k = SORTS[sel.sort] ? sel.sort : 'score';
    l.sort(function (a, b) { var va = k === 'score' ? a.score : (a[k] == null ? -1 : (k === 'mutual' ? a.mutual : a[k].score)), vb = k === 'score' ? b.score : (b[k] == null ? -1 : (k === 'mutual' ? b.mutual : b[k].score)); return vb - va || b.score - a.score; });
    return l;
  };
  var valOf = function (x, k) { return k === 'score' ? x.score : k === 'mutual' ? x.mutual : (x[k] ? x[k].score : 0); };
  function bar(label, v, note) { return '<div class="cs-b"><span>' + E(label) + '</span><div role="img" aria-label="' + E(label + ' ' + v) + '"><i style="width:' + Math.max(2, Math.min(100, v)) + '%"></i></div><b>' + v + '</b>' + (note ? '<small>' + E(note) + '</small>' : '') + '</div>'; }

  function detail(x, m) {
    var h = '<div class="cs-card gd-d"><p class="cs-ct">상대 일주 가정 · ' + E(x.han) + ' ' + E(x.kor) + ' (일간 ' + E(x.stemTG) + ' · 일지 ' + E(x.branchTG) + ')</p><h4>조화 ' + x.score + ' <small>' + E(x.type) + ' · ' + E(x.condition) + '</small></h4><p class="cs-sum">' + E(TYPE_NOTE[x.type] || '') + '</p>';
    h += '<div class="gd-at"><div><span>내가 끌림</span><b>' + (x.toThem ? x.toThem.score : '-') + '</b></div><div><span>나를 좋아함</span><b>' + (x.toMe ? x.toMe.score : '-') + '</b></div><div><span>서로 끌림</span><b>' + (x.mutual != null ? x.mutual : '-') + '</b></div></div>';
    h += '<details class="lb-d" open><summary>조화 구성</summary><ul class="gd-parts">' + x.parts.map(function (p) { return '<li><span>' + E(p.label) + '</span><i>비중 ' + p.w + '%</i><b>' + (p.pts > 0 ? '+' : '') + p.pts + '</b></li>'; }).join('') + '</ul></details>';
    if (x.reasons.length) h += '<details class="lb-d"><summary>잘 맞는 점</summary><ul class="gd-l">' + x.reasons.map(function (r) { return '<li>' + E(r) + '</li>'; }).join('') + '</ul></details>';
    var cau = x.cautions.concat(x.tags.filter(function (t) { return t.kind === 'friction'; }).map(function (t) { return t.where + ' ' + t.name + ' — 마찰·변화 신호'; }));
    h += '<details class="lb-d"><summary>살펴볼 점</summary><ul class="gd-l">' + (cau.length ? cau.map(function (r) { return '<li>' + E(r) + '</li>'; }).join('') : '<li>뚜렷한 마찰 신호는 계산되지 않았습니다.</li>') + '</ul></details>';
    var at = (x.toThem ? x.toThem.reasons : []).concat(x.toMe ? x.toMe.reasons : []);
    if (at.length) h += '<details class="lb-d"><summary>끌림의 근거</summary><ul class="gd-l">' + at.map(function (r) { return '<li>' + E(r) + '</li>'; }).join('') + '</ul></details>';
    return h + '</div>';
  }

  /** sel: { tab:'pair'|'love', type, sort, pick:'i'(0~59, 일주 index) , ps, pb, year, topic } */
  function html(m, sel, esc) {
    sel = sel || {}; var tab = sel.tab || 'pair';
    var h = '<section class="cs gd" aria-label="인연의 정원 · 궁합과 사랑의 흐름"><div class="cs-tabs gd-tabs" role="tablist">' + [['pair', '궁합 일주 탐색'], ['love', '사랑의 흐름']].map(function (t) { return '<button type="button" role="tab" data-gdt="' + t[0] + '" aria-selected="' + (tab === t[0]) + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'pair') {
      var l = pickList(m, sel), k = SORTS[sel.sort] ? sel.sort : 'score', cur = null;
      if (sel.ps != null && sel.pb != null && (sel.ps % 2) === (sel.pb % 2)) cur = m.pairs.filter(function (x) { return x.s === sel.ps && x.b === sel.pb; })[0] || null;
      else if (sel.pick != null) cur = m.pairs.filter(function (x) { return x.i === sel.pick; })[0] || null;
      h += '<p class="cs-in">상대의 <b>일주(일간+일지) 두 글자</b>만 가정한 상성입니다. 실제 인연은 서로의 전체 사주와 만남의 방식에 따라 달라지며, 좋고 나쁨을 가르는 판정이 아닙니다.</p>';
      h += '<div class="cs-chips gd-opt"><span class="gd-lb">상대 가정</span><button type="button" class="cs-c' + (m.partner === 'opposite' ? ' sel' : '') + '" data-gdp="opposite">이성(전통 기준)</button><button type="button" class="cs-c' + (m.partner === 'any' ? ' sel' : '') + '" data-gdp="any">성별 무관</button></div>';
      h += '<div class="cs-chips gd-opt"><span class="gd-lb">유형</span><button type="button" class="cs-c' + (!sel.type ? ' sel' : '') + '" data-gdy="">전체 ' + m.pairs.length + '</button>' + TYPES.map(function (t) { var n = m.pairs.filter(function (x) { return x.type === t; }).length; return n ? '<button type="button" class="cs-c' + (sel.type === t ? ' sel' : '') + '" data-gdy="' + t + '">' + t + ' ' + n + '</button>' : ''; }).join('') + '</div>';
      h += '<div class="cs-chips gd-opt"><span class="gd-lb">정렬</span>' + Object.keys(SORTS).map(function (s) { return '<button type="button" class="cs-c' + (k === s ? ' sel' : '') + '" data-gds="' + s + '">' + SORTS[s] + '</button>'; }).join('') + '</div>';
      h += '<div class="gd-grid" role="list">' + l.slice(0, 12).map(function (x) {
        return '<button type="button" class="gd-p el' + x.el + (cur && cur.i === x.i ? ' sel' : '') + '" data-gdk="' + x.i + '" aria-pressed="' + (cur && cur.i === x.i ? 'true' : 'false') + '"><i>' + E(x.han) + '</i><span>' + E(x.kor) + '</span><b>' + valOf(x, k) + '</b><small>' + E(x.type) + '</small></button>'; }).join('') + '</div>';
      if (l.length > 12) h += '<p class="cs-in">조건에 맞는 일주 ' + l.length + '개 중 상위 12개입니다.</p>';
      // 직접 고르기
      var stems = '甲乙丙丁戊己庚辛壬癸', brs = '子丑寅卯辰巳午未申酉戌亥', ps = sel.ps, pb = sel.pb;
      h += '<details class="lb-d"' + (ps != null || pb != null ? ' open' : '') + '><summary>상대의 일주를 직접 고르기</summary><p class="cs-in">상대의 일간과 일지를 알고 있을 때 고르세요. 서로 맞지 않는 조합(음양이 다름)은 존재하지 않는 일주입니다.</p><div class="gd-sel">' +
        stems.split('').map(function (c, i) { return '<button type="button" class="cs-c' + (ps === i ? ' sel' : '') + '" data-gdps="' + i + '">' + c + '</button>'; }).join('') + '</div><div class="gd-sel">' +
        brs.split('').map(function (c, i) { return '<button type="button" class="cs-c' + (pb === i ? ' sel' : '') + '" data-gdpb="' + i + '">' + c + '</button>'; }).join('') + '</div>';
      if (ps != null && pb != null && (ps % 2) !== (pb % 2)) h += '<p class="cs-in" role="alert">' + stems.charAt(ps) + brs.charAt(pb) + '은(는) 존재하지 않는 일주입니다. 일간과 일지의 음양이 같아야 합니다.</p>';
      h += '</details>';
      if (cur) h += detail(cur, m); else h += '<p class="cs-in">일주를 누르면 조화 구성·끌림·살펴볼 점이 나옵니다. 내 일주는 <b>' + E(m.myDay) + '</b>입니다.</p>';
    } else {
      var sp = m.spouse;
      h += '<p class="cs-in">전통 해석의 배우자 자리와 앞으로의 애정 지수입니다. 결혼이나 만남의 시기를 확정하지 않습니다.</p><div class="cs-card"><p class="cs-ct">배우자 자리(일지)와 배우자성</p><h4>' + E(sp.branchHan) + ' ' + E(sp.branchKor) + ' <small>일지 · ' + E(sp.branchTG) + (sp.unseong ? ' · 12운성 ' + E(sp.unseong) : '') + '</small></h4>' +
        bar('배우자성(' + sp.group + ') 비중', sp.pct, sp.pct === 0 ? '원국에는 직접 드러나지 않음 — 부재를 뜻하지는 않습니다' : '') + '<p class="cs-vol">' + E(sp.note) + '</p></div>';
      var cur2 = m.love.filter(function (w) { return w.year === sel.year; })[0] || m.love.filter(function (w) { return w.isNow; })[0] || m.love[0];
      if (cur2) {
        h += '<p class="cs-t">앞으로 10년 애정 지수 (0~100, 55 이상 무난 · 70 이상 높음)</p><div class="cs-yr" role="list">' + m.love.map(function (w) { return '<button type="button" class="cs-y' + (w.year === cur2.year ? ' sel' : '') + (w.isNow ? ' now' : '') + '" data-gdy2="' + w.year + '" aria-pressed="' + (w.year === cur2.year) + '"><u style="height:' + Math.max(6, w.score) + '%"></u><b>' + w.score + '</b><span>' + String(w.year).slice(2) + '</span></button>'; }).join('') + '</div>';
        h += '<div class="cs-card"><p class="cs-ct">' + cur2.year + '년 · ' + E(cur2.ganzhi) + ' · ' + cur2.age + '세</p><h4>애정 지수 ' + cur2.score + ' <small>' + E(cur2.band) + '</small></h4><p class="cs-sum">' + E(cur2.summary) + '</p>' +
          cur2.parts.map(function (x) { return bar(PARTS[x.key], x.v, '반영 ' + x.w + '%'); }).join('') + '<p class="cs-vol">변동성 ' + cur2.vol + ' (점수에는 반영되지 않는 참고 값)</p>' +
          (cur2.reasons.length ? '<details class="lb-d"><summary>근거 보기</summary><ul class="gd-l">' + cur2.reasons.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></details>' : '') + '</div>';
      }
      var ks = Object.keys(m.stories), tp = sel.topic && m.stories[sel.topic] ? sel.topic : ks[0];
      if (tp) {
        var s = m.stories[tp];
        h += '<p class="cs-t">내 사주의 가장 큰 힘(' + E(m.topGroup) + ')으로 읽는 관계 이야기</p><div class="cs-chips">' + ks.map(function (k2) { return '<button type="button" class="cs-c' + (k2 === tp ? ' sel' : '') + '" data-gdo="' + k2 + '">' + E(m.stories[k2].title) + '</button>'; }).join('') + '</div>' +
          '<div class="cs-card"><h4>' + E(s.title) + '</h4><p class="cs-sum">' + E(s.head) + '</p>' +
          (s.real.length ? '<ul class="gd-l">' + s.real.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>' : '') +
          (s.examples.length ? '<details class="lb-d"><summary>이런 장면에서</summary><ul class="gd-l">' + s.examples.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></details>' : '') +
          (s.pro || s.trap ? '<div class="lb-2"><div><b>잘 쓰이면</b><p>' + E(s.pro) + '</p></div><div><b>조심할 면</b><p>' + E(s.trap) + '</p></div></div>' : '') +
          (s.action ? '<p class="lb-a"><b>해 볼 것</b> ' + E(s.action) + '</p>' : '') + '</div>';
      }
    }
    return h + '<p class="lb-f">명리 모델 안의 상대 지표이며 특정 상대나 관계의 결과를 예측·보장하지 않습니다.</p></section>';
  }

  R.Garden = { model: model, html: html, TYPES: TYPES };
})(typeof window !== 'undefined' ? window : globalThis);
