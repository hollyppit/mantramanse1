/* 인생 지도 흐름을 "하나의 긴 스크롤 문서"로 만든다(Reading Flow 에 그대로 실린다). 선택·탭·확대 화면은 없다.
   흐름: PROLOGUE 인생 전체 지도 → ACT I 지금 서 있는 곳 → ACT II 궁금한 이야기들(관심 분야가 먼저, 나머지가 이어짐) → ACT III 앞으로의 흐름 → FINAL 버릴 것·지킬 것·시작할 것.
   값은 전부 StoryDirector(엔진 계산을 읽기만 함)·StoryComposer(현실 언어 문장)에서 오고, 기존 챕터(c01~c20)는 그대로 이어 붙인다. 이 파일은 순서와 화면 조각만 만든다.
   build(H) → { acts, chapters }.  H: { M, ch, sd, now, name, interest, rep(기존 리포트), soc(관계·결혼 추정), plan }
   loadSocial(H) → Promise(soc)  관계·결혼 시기는 AI 추정(/api/life-ai, 실패하면 규칙 추정). */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, D = R.StoryDirector, SC = R.StoryComposer;
  var ICON = { opportunity: '◆', expansion: '▲', harvest: '●', accumulation: '■', transition: '◇', defense: '▽' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var br = function (s) { return esc(s).replace(/조심할 점:\s*([^.!?\n<]*[.!?]?)/g, '<mark class="wn"><i aria-hidden="true">⚠</i><b>조심할 점</b>$1</mark>').replace(/\n/g, '<br>'); };
  var MAX_AGE = 90, FIELD_NAME = { all: '종합', money: '돈', career: '직업', love: '사랑', relation: '관계' };

  /* ── 관계·결혼 AI 추정(기기 캐시 → 서버). 생년월일은 보내지 않는다. 늦으면 규칙 추정으로 진행한다. ── */
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function loadSocial(H, waitMs) {
    var rule; try { rule = D.social(H.M, H.ch, H.sd, H.now); } catch (e) { return Promise.resolve(null); }
    var pl; try { pl = D.aiPayload(H.M, H.ch, H.sd); } catch (e) { return Promise.resolve(rule); }
    var key = 'mt_life_ai_l2_' + hash(JSON.stringify(pl)), got; try { got = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { }
    if (got) return Promise.resolve(D.mergeSocial(rule, got));
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, waitMs || 12000);
    return fetch('/api/life-ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(pl), signal: ctl && ctl.signal }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok && d.result) { try { localStorage.setItem(key, JSON.stringify(d.result)); } catch (e) { } return D.mergeSocial(rule, d.result); } return rule; }).catch(function () { return rule; }).then(function (x) { clearTimeout(tm); return x; });
  }

  /* ── 화면 조각 ── */
  var seq = 0, sid = function (p) { return 'ld_' + p + '_' + (++seq); };
  function scene(html, extra) { return Object.assign({ sceneId: sid('s'), sceneType: 'life', bg: 'black', html: html }, extra || {}); }
  function sec(cls, inner, id) { return '<section class="scene ' + cls + '" data-sc="' + (id || sid('x')) + '">' + inner + '</section>'; }
  function lineScene(text, emph, kick) { // 한 장면 = 한 주장(글자는 움직이지 않는다)
    return scene(sec('rd-cin', (kick ? '<div class="rd-kick">' + esc(kick) + '</div>' : '') + '<p class="rd-line"><span data-e="' + (emph || 'normal') + '">' + br(text) + '</span></p>'));
  }
  var who = function (H) { return H.name ? H.name + '님' : '당신'; };
  function prose(cap, paras, extra) { // 읽기 편한 문단 풀이: 이름을 부르며, 문단마다 2~3문장
    return scene(sec('rv rd-prose', (cap ? '<div class="cap">' + esc(cap) + '</div>' : '') + paras.filter(Boolean).map(function (p) { return '<p class="lead">' + p + '</p>'; }).join('')), extra);
  }
  var E = esc;
  function curve(items, field, aria) { // 인생의 지형: 부드러운 면 + 지금 위치. 숫자 점수는 보이지 않는다
    var val = function (it) { var f = it.fields && it.fields[field]; if (!f) return null; return field === 'all' ? Math.max(0, Math.min(100, (f.fit + 100) / 2)) : f.score; };
    var vs = items.map(val).filter(function (v) { return v != null; }), lo = Math.min.apply(null, vs.concat([100])) - 8, hi = Math.max.apply(null, vs.concat([0])) + 8; if (hi - lo < 40) { var mid = (hi + lo) / 2; lo = mid - 20; hi = mid + 20; }
    var W = 320, Hh = 120, n = items.length, pad = 18, xs = items.map(function (_, i) { return pad + (W - pad * 2) * (n === 1 ? .5 : i / (n - 1)); }), pts = items.map(function (it, i) { var v = val(it); return v == null ? null : [xs[i], Hh - 14 - (Hh - 40) * (v - lo) / (hi - lo)]; });
    var ok = pts.filter(Boolean), d = '';
    if (ok.length > 1) { d = 'M' + ok[0][0] + ',' + ok[0][1]; for (var k = 1; k < ok.length; k++) { var a = ok[k - 1], b = ok[k], cx = (a[0] + b[0]) / 2; d += ' C' + cx + ',' + a[1] + ' ' + cx + ',' + b[1] + ' ' + b[0] + ',' + b[1]; } }
    var area = d ? d + ' L' + ok[ok.length - 1][0] + ',' + (Hh - 14) + ' L' + ok[0][0] + ',' + (Hh - 14) + ' Z' : '';
    var dots = items.map(function (it, i) { var p = pts[i]; if (!p) return '<circle cx="' + xs[i] + '" cy="' + (Hh - 14) + '" r="2" class="lf-nodata"/>'; return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (it.isCurrent ? 5 : 3) + '" class="lf-dot' + (it.isCurrent ? ' cur' : '') + '"/>'; }).join('');
    var ci = items.map(function (it) { return it.isCurrent; }).indexOf(true), here = ci >= 0 ? '<line x1="' + xs[ci] + '" x2="' + xs[ci] + '" y1="6" y2="' + (Hh - 14) + '" class="lf-hereline"/>' : '';
    return '<div class="lf-chart"><svg viewBox="0 0 ' + W + ' ' + Hh + '" class="lf-svg" role="img" aria-label="' + esc(aria) + '"><path d="' + area + '" class="lf-area"/><path d="' + d + '" class="lf-line"/>' + here + dots + '</svg></div>';
  }
  function rows(items, field) { // 지형 아래 목록(누르는 목록이 아니라 읽는 목록)
    return '<ol class="lf-rows">' + items.map(function (it) { var sea = it.season, f = it.fields && it.fields[field];
      return '<li><div class="lf-row' + (it.isCurrent ? ' cur' : '') + '"><span class="lf-age">' + esc(it.label) + '</span><span class="lf-sea' + (sea ? ' s-' + sea : '') + '">' + (sea ? '<b aria-hidden="true">' + ICON[sea] + '</b> ' + esc(it.seasonName) : '—') + '</span><span class="lf-desc">' + esc(it.pre ? it.tag : (field === 'all' ? it.tag : (f ? '이 분야 · ' + f.band : ''))) + '</span>' + (it.isCurrent ? '<span class="lf-now">지금</span>' : '') + '</div></li>'; }).join('') + '</ol>';
  }
  function mapItems(H) {
    var items = D.lifeMap(H.M, H.ch, H.now).filter(function (x) { return x.startAge <= MAX_AGE; }).map(function (x) { return Object.assign({}, x, { label: x.pre ? '0~' + x.endAge + '세' : x.startAge + '~' + x.endAge + '세' }); });
    return D.attachSocial(items, H.soc, 'decade');
  }
  function peakLine(items, field) { // 그 분야에서 상대적으로 가장 두드러지는 10년
    var c = items.filter(function (x) { return !x.pre && x.fields && x.fields[field]; }); if (!c.length) return '';
    var key = function (x) { return field === 'all' ? x.fields.all.fit : x.fields[field].score; }, best = c.reduce(function (a, b) { return key(b) > key(a) ? b : a; });
    return '상대적으로 가장 두드러지는 구간은 ' + best.startAge + '~' + best.endAge + '세입니다. 시기의 성격일 뿐, 특정한 사건을 뜻하지 않습니다.';
  }

  /* ── PROLOGUE: 인생 전체 지도 ── */
  function prologue(H) {
    var items = mapItems(H), out = [
      lineScene('당신의 인생을\n90년짜리 지도처럼 펼쳐보면\n어떤 모습일까요?', 'impact', 'PROLOGUE'), lineScene('사람마다 인생이 움직이는 시기는 다릅니다.'),
      lineScene('일찍 기회를 만나는 사람이 있고,\n조금 늦게 힘을 받는 사람도 있습니다.'), lineScene('그렇다면 당신은 언제일까요?', 'impact'),
      scene(sec('rv', '<div class="cap">LIFE MAP · 나의 인생 지도</div>' + curve(items, 'all', '인생 전체의 지형') + rows(items, 'all') + '<p class="faint">시기의 성격을 보여 줄 뿐, 특정한 사건을 예언하지 않습니다.</p>'), { layout: 'DATA' }),
      lineScene('같은 인생도 분야에 따라 높낮이가 다릅니다.\n돈 · 일 · 사랑 · 관계를 하나씩 겹쳐 봅니다.'),
    ];
    ['money', 'career', 'love', 'relation'].forEach(function (f) {
      var ai = f === 'relation' ? '<span class="lf-ai">' + (H.soc && H.soc.source === 'ai' ? 'AI 추정' : '규칙 추정') + '</span>' : '';
      out.push(scene(sec('rv', '<div class="cap">' + FIELD_NAME[f] + ' ' + ai + '</div>' + curve(items, f, FIELD_NAME[f] + '의 시기별 흐름') + '<p class="lead" style="font-size:.98rem">' + esc(peakLine(items, f)) + '</p>'), { layout: 'DATA' }));
    });
    return out;
  }
  /* ── ACT I: YOU ARE HERE ── */
  function here(H) {
    var pos = H.pos, items = mapItems(H), out = [
      lineScene('긴 인생에서\n지금 당신이 서 있는 곳은…', 'normal', 'YOU ARE HERE'),
      scene(sec('rv', curve(items, 'all', '인생 지도에서 지금 위치') + '<div class="lf-hereb"><b>' + pos.year + '</b><span>YOU ARE HERE</span><i>' + pos.age + '세</i></div>'), { layout: 'DATA' }),
      lineScene('지금 ' + who(H) + '은\n' + pos.seasonName + '에 있습니다.', 'impact'),
      prose('', ['<strong>' + E(pos.headline) + '</strong>', E(pos.body.join(' ')), pos.decadeLine ? E(pos.decadeLine) : ''])];
    out.push(scene(sec('rv', '<div class="lf-dt"><div><small>지금 할 일</small>' + esc(pos.doThis) + '</div><div class="warn"><small>함정</small>' + esc(pos.trap) + '</div></div>')));
    var fl = Object.keys(pos.fields).map(function (k) { return '<div class="lf-fcard"><b>' + ({ money: '돈', career: '일', love: '사랑' }[k]) + '</b><span>' + esc(pos.fields[k].line) + '</span></div>'; }).join('');
    if (fl) out.push(scene(sec('rv', '<div class="cap">분야별로 보면</div><div class="lf-fcards">' + fl + '</div>')));
    out.push(scene(sec('rv', '<details class="lf-why"><summary>왜 이렇게 나오나요?</summary><dl>' + pos.evidence.map(function (e) { return '<dt>' + esc(e.k) + '</dt><dd>' + esc(e.v) + '</dd>'; }).join('') + '</dl><p class="faint">이 화면의 결론을 만든 실제 계산 값입니다.</p></details>')));
    return out;
  }
  /* ── 새 문체 카드(문단형 풀이) / 시간축 카드 ── */
  var HOOK = { money: '은 돈을 어떻게 버는 사람일까요?', career: '은 어떤 일에서 힘이 나는 사람일까요?', love: '은 사랑에 빠지면 어떤 사람이 될까요?', marriage: '은 오래 갈 관계에서 무엇을 바랄까요?', relation: '은 사람들 사이에서 어떤 모습일까요?', self: '은 왜 이렇게 행동하는 사람일까요?' };
  function cards(id, H) {
    var sc = SC.scenes(id, H.sd), by = function (k) { return sc.filter(function (x) { return x.kind === k; }).map(function (x) { return x.text; }); }, key = SC.MOD[id], topic = SC.TOPICS[key].title, ex = by('ex'), out = [], sol = SC.solution(id, H.sd);
    out.push(prose(topic + ' 이야기', [E(who(H)) + E(HOOK[key] || '의 이야기입니다.'), '<strong>' + E(by('concl')[0]) + '</strong>']));
    if (R.ReadingAnswer) out.push(scene(sec('rv rd-react', R.ReadingAnswer.card(key))));
    if (ex.length) out.push(prose('현실에서는', [ex.map(E).join('<br>')]));
    out.push(prose('살릴 힘과 경계할 습관', [E(by('pro')[0]), E(by('trap')[0])]));
    if (sol) out.push(prose('명리적 보완 방향', [E(sol.principle), sol.context ? E(sol.context) : '', '<strong>실천</strong> · ' + E(sol.action)]));
    out.push(scene(sec('rv', '<details class="lf-why"><summary>왜 이렇게 나오나요?</summary><dl>' + SC.evidence(id, H.sd).map(function (e) { return '<dt>' + esc(e.k) + '</dt><dd>' + esc(e.v) + '</dd>'; }).join('') + '</dl></details>'))); return out;
  }
  function bars(t, nm) {
    return '<div class="lf-bars" role="img" aria-label="앞으로 10년 ' + nm + ' 흐름">' + t.years.map(function (y) { var on = (t.windows || []).some(function (w) { return y.year >= w.fromYear && y.year <= w.toYear; });
      return '<div class="lf-bar' + (on ? ' on' : '') + '"><i style="height:' + Math.max(8, y.score) + '%"></i><b>' + String(y.year).slice(2) + '</b><small>' + esc(y.band) + '</small></div>'; }).join('') + '</div>';
  }
  /* 분야별 시기 후보: 좋은 시기 · 안 좋은 시기를 연도(앞으로 10년)와 달(앞으로 12개월)로 각각 3개씩, 점수·이유·할 일과 함께 보여 준다. 값은 엔진의 분야 점수(fieldScores)이고, 관계·결혼은 AI/규칙 추정 연도 점수를 쓴다. */
  var TM = {
    money: { n: '돈', good: '돈이 움직이고 들어오는 흐름이 활발한', bad: '돈이 새거나 막히기 쉬운', doGood: '수입원을 넓히거나 협상·투자 검토를 시작해 보세요', doBad: '큰 지출·보증·충동적 투자를 피하고 고정비부터 줄이세요' },
    career: { n: '일', good: '일의 활동성이 커지는', bad: '일이 막히거나 흔들리기 쉬운', doGood: '이직·승진 요청·독립·새 프로젝트를 시도해 보세요', doBad: '큰 이직·퇴사 결정을 서두르지 말고 지금 자리를 방어하세요' },
    love: { n: '연애', good: '인연의 활동이 활발한', bad: '관계가 어긋나거나 마음고생이 생기기 쉬운', doGood: '새로운 만남·마음 표현·관계 진전을 먼저 시도하세요', doBad: '감정적인 고백·이별 통보·무리한 결정은 미루세요' },
    marriage: { n: '결혼', good: '인연이 깊어지고 약속이 오가기 쉬운', bad: '관계의 속도 차이로 흔들리기 쉬운', doGood: '결혼·동거 같은 큰 약속은 이 시기에 논의해 보세요', doBad: '결혼과 관련된 큰 결정은 보류하고 대화를 늘리세요' },
    relation: { n: '사람 사이', good: '사람과의 교류가 늘고 도움이 오가기 쉬운', bad: '오해와 마찰이 커지기 쉬운', doGood: '새 모임·협업·부탁을 먼저 시도해 보세요', doBad: '중요한 말은 글로 정리해 전하고 감정적인 대화는 미루세요' } };
  var mScore = function (m, f) { var x = m.fields && m.fields[f === 'marriage' ? 'love' : f]; return x ? x.score : (m.fields && m.fields.all ? Math.max(5, Math.min(95, Math.round(50 + m.fields.all.fit * 1.1))) : 50); };
  function candidates(f, t, H) {
    var T = TM[f]; if (!T) return null; var yrs = (t.years || []).slice(); if (!yrs.length) return null;
    var best = yrs.slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 3), worst = yrs.slice().sort(function (a, b) { return a.score - b.score; }).slice(0, 3), mo = [];
    try { var Y = H.sd.nowYear, all = D.monthsOf(H.M, H.ch, Y, H.now).concat(D.monthsOf(H.M, H.ch, Y + 1, H.now)), ci = 0; all.forEach(function (m, i) { if (m.isNow) ci = i; }); mo = all.slice(ci, ci + 12).map(function (m) { return { label: m.month + '월 ' + m.ganzhi, s: mScore(m, f), season: m.seasonName }; }); } catch (e) { mo = []; }
    var mbest = mo.slice().sort(function (a, b) { return b.s - a.s; }).slice(0, 3), mworst = mo.slice().sort(function (a, b) { return a.s - b.s; }).slice(0, 3);
    var row = function (label, sc, sub, good) { return '<li><span><b>' + esc(label) + '</b> <small>' + esc(sub || '') + '</small></span>' + '<i class="dp-bar dp-slim' + (good ? '' : ' dp-warnbar') + '"><span class="dp-bt"><i style="width:' + Math.round(Math.max(4, Math.min(100, sc))) + '%"></i></span><b>' + Math.round(sc) + '</b></i></li>'; };
    var yrow = function (y, good) { var ag = y.age != null ? y.age : (H.ch.solar ? y.year - H.ch.solar.y : null); return row(y.year + '년' + (ag != null ? ' (' + ag + '세)' : ''), y.score, y.band, good); };
    var mrow = function (m, good) { return row(m.label, m.s, m.season, good); };
    return sec('rv dp', '<div class="cap">' + esc(T.n) + ' · 좋은 시기와 안 좋은 시기 후보</div><p class="dp-lead2">앞으로 10년(해)과 12개월(달)에서 ' + esc(T.n) + ' 흐름이 두드러지게 좋은 때와 조심할 때를 각각 골랐습니다. 점수는 엔진이 계산한 ' + esc(T.n) + ' 지수(0~100)입니다.</p>' +
      '<div class="dp-pc"><div class="dp-pro"><h4>좋은 시기 후보</h4><p class="dp-pl" style="margin:0 0 6px">' + esc(T.good) + ' 때 — ' + esc(T.doGood) + '.</p><ul class="dp-tl-list"><li class="dp-sub">해 기준</li>' + best.map(function (y) { return yrow(y, true); }).join('') + (mbest.length ? '<li class="dp-sub">달 기준 (앞으로 12개월)</li>' + mbest.map(function (m) { return mrow(m, true); }).join('') : '') + '</ul></div>' +
      '<div class="dp-con"><h4>안 좋은 시기 후보</h4><p class="dp-mi" style="margin:0 0 6px">' + esc(T.bad) + ' 때 — ' + esc(T.doBad) + '.</p><ul class="dp-tl-list"><li class="dp-sub">해 기준</li>' + worst.map(function (y) { return yrow(y, false); }).join('') + (mworst.length ? '<li class="dp-sub">달 기준 (앞으로 12개월)</li>' + mworst.map(function (m) { return mrow(m, false); }).join('') : '') + '</ul></div></div><p class="faint">시기의 성격을 보여 줄 뿐 특정한 사건을 예언하지 않습니다. 좋은 시기에도 준비가 없으면 지나가고, 안 좋은 시기에도 방어하면 피해를 줄일 수 있습니다.</p>');
  }
  function timing(gen, title, sub, H) {
    var out = [], f = gen.split(':')[1], nm = { money: '돈', career: '일', love: '인연', marriage: '인연', relation: '사람 사이' }[f] || '', t = D.timing(H.M, H.ch, H.sd, H.now, f, H.soc);
    out.push(lineScene(t.line, 'impact', title));
    if (t.years) out.push(scene(sec('rv', '<div class="cap">' + esc(sub) + '</div>' + bars(t, nm) + '<p class="faint">막대가 진한 해가 상대적으로 ' + nm + ' 이야기가 두드러지는 해입니다.</p>'), { layout: 'DATA' }));
    try { var cd = candidates(f, t, H); if (cd) out.push(scene(cd, { layout: 'DATA' })); } catch (e) { }
    var src = t.source ? '<b>' + (t.source === 'ai' ? 'AI 추정' : '규칙 추정') + '</b> · ' : '';
    out.push(scene(sec('rv', '<p class="faint">' + src + esc(t.caution || '') + '</p>')));
    return out;
  }
  function future(H) {
    var fu = D.future(H.M, H.ch, H.sd, H.now, 10), blk = function (t, g, cls) { return g.length ? '<div class="lf-fu ' + cls + '"><small>' + t + '</small>' + g.map(function (x) { return '<b>' + x.range + '</b> ' + (x.fromAge === x.toAge ? x.fromAge + '세' : x.fromAge + '~' + x.toAge + '세'); }).join(' · ') + '</div>' : ''; };
    return [lineScene('앞으로 3년은\n' + fu.years.slice(0, 3).map(function (y) { return y.seasonName; }).join(' → ') + ' 순으로 흘러갑니다.', 'impact', '앞으로의 10년'),
      scene(sec('rv', blk('가장 큰 전환 구간', fu.change, 'chg') + blk('확장하기 좋은 구간', fu.expand, 'exp') + blk('성과를 굳히는 구간', fu.harvest, 'hv') + blk('지키는 것이 중요한 구간', fu.protect, 'pr') + blk('준비해야 하는 구간', fu.prepare, 'pp') +
        '<div class="lf-yrs">' + fu.years.map(function (y) { return '<div class="lf-yr' + (y.isNow ? ' now' : '') + '"><b>' + y.year + '</b><span class="lf-sea s-' + y.season + '"><b aria-hidden="true">' + (ICON[y.season] || '') + '</b> ' + esc(y.seasonName) + '</span></div>'; }).join('') + '</div><p class="faint">' + esc(fu.caution) + '</p>'), { layout: 'DATA' })];
  }

  /* ── 십성과 신살: 용어 풀이 카드가 아니라 "내 사주에서 실제로 보이는 값"을 쉬운 말로 이야기한다 ── */
  var GRP = { 비겁: ['나와 같은 힘', '자존심·독립심·동료'], 식상: ['내보내는 힘', '표현·재능·아이디어'], 재성: ['현실을 다루는 힘', '돈·성과·실속'], 관성: ['나를 단련하는 힘', '책임·규칙·직장'], 인성: ['나를 채우는 힘', '배움·보호·이해'] };
  var WEAK = { 비겁: '버티는 힘과 내 몫을 주장하는 힘', 식상: '마음을 밖으로 꺼내는 출구', 재성: '돈과 현실을 챙기는 감각', 관성: '규칙과 책임의 압박을 견디는 힘', 인성: '쉬어 가고 기대는 힘' };
  var PILLAR = { year: '어린 시절과 집안', month: '사회생활과 직업', day: '나 자신과 가까운 관계', hour: '말년과 자녀, 내면' };
  // 신살: [좋은 별 여부, 쉬운 설명]. 좋고 나쁨의 도장이 아니라 성향의 양념으로 읽는다. 사건을 단정하지 않는다.
  var STAR = {
    천을귀인: [1, '위기 때 도와주는 사람이 나타나기 쉬운 별입니다.'], 문창귀인: [1, '글, 공부, 아이디어에 재능이 붙는 별입니다.'], 학당귀인: [1, '배우고 익히는 일이 오래 힘이 되는 별입니다.'], 태극귀인: [1, '큰 흐름에서 방향을 잃지 않게 붙잡아 주는 별입니다.'],
    천덕귀인: [1, '어려운 일을 덜 힘들게 넘기는 힘이 있는 별입니다.'], 월덕귀인: [1, '사람 사이에서 덕을 쌓기 쉬운 별입니다.'], 금여록: [1, '품위와 대접받는 자리가 따르기 쉬운 별입니다.'], 건록: [1, '스스로 서는 힘이 든든한 별입니다.'],
    암록: [1, '드러나지 않는 곳에서 도움이 오는 별입니다.'], 천주귀인: [1, '먹고사는 일이 비교적 안정되기 쉬운 별입니다.'], 천관귀인: [1, '조직에서 인정받는 자리와 연결되기 쉬운 별입니다.'], 천복귀인: [1, '복이 쌓이는 방향으로 흐르기 쉬운 별입니다.'],
    복성귀인: [1, '큰 굴곡 없이 평탄하게 풀리는 복이 있는 별입니다.'], 천문성: [1, '직관과 통찰, 정신세계에 감각이 열리는 별입니다.'], 천의성: [1, '사람을 돌보고 치유하는 데 재능이 붙는 별입니다.'], 삼기귀인: [1, '드물게 비범한 재능이 있다고 보는 별입니다.'],
    공망: [0, '그 자리의 기운이 비어 있어서, 기대와 현실이 어긋나기 쉬운 곳입니다.'], 백호대살: [0, '강한 기운이 급하게 터질 수 있어서 속도 조절이 필요한 별입니다.'], 괴강살: [0, '카리스마와 고집이 함께 강한 별입니다.'], 양인살: [0, '밀어붙이는 힘이 세서 날이 서기 쉬운 별입니다.'],
    홍염살: [0, '이성에게 매력이 두드러지는 별입니다.'], 현침살: [0, '말과 시선이 날카로워지기 쉬운 별입니다.'], 천라지망: [0, '답답하게 막힌 느낌이 들 때가 있는 별입니다.'], 과숙살: [0, '혼자 있는 시간이 필요한 마음이 큰 별입니다.'],
    고란살: [0, '관계에서 외로움을 타기 쉬운 별입니다.'], 고신살: [0, '혼자 감당하려는 마음이 커지기 쉬운 별입니다.'], 탕화살: [0, '감정이 확 달아올랐다 식기 쉬운 별입니다.'], 낙정관살: [0, '예상 밖의 걸림돌을 만나기 쉬운 별입니다.'],
    조객살: [0, '마음이 가라앉는 시기가 올 수 있는 별입니다.'], 급각살: [0, '서두르다 삐끗하기 쉬운 별입니다.'], 상문살: [0, '감정이 깊어지고 무거워지기 쉬운 별입니다.'], 효신살: [0, '자기 생각 속에 오래 머물기 쉬운 별입니다.'],
    음양차착살: [0, '관계에서 속도와 온도가 엇갈리기 쉬운 별입니다.'], 금신살: [0, '말과 행동이 단호하고 강해지기 쉬운 별입니다.'], 십악대패일: [0, '재물과 체면을 지키는 일에 신경이 쓰이는 별입니다.'],
  };
  var S12 = { 역마살: '움직이고 옮겨 다니는 기운이 있습니다. 이동·변화·출장이 잦을 수 있습니다.', 연살: '사람을 끄는 매력(흔히 도화)이 있습니다. 인기와 설렘이 따라붙기 쉽습니다.', 화개살: '혼자 몰입하는 시간과 예술·정신세계에 끌리는 기운이 있습니다.', 장성살: '중심에서 이끄는 리더십 기운이 있습니다.',
    반안살: '자리를 잡고 안정을 만드는 기운이 있습니다.', 지살: '새로운 곳에서 시작하는 기운이 있습니다.', 망신살: '드러나고 노출되는 일이 잦은 기운이 있습니다. 말과 행동을 한 번 더 살피면 좋습니다.', 겁살: '빼앗기거나 부딪히는 일이 생길 수 있어 방어가 필요한 기운이 있습니다.',
    재살: '예기치 않은 변수가 끼어들기 쉬운 기운이 있습니다.', 천살: '내 뜻대로 되지 않는 일이 있어 겸손이 필요한 기운이 있습니다.', 월살: '의욕이 막히고 지치기 쉬운 기운이 있습니다.', 육해살: '가까운 사람 사이에서 오해가 생기기 쉬운 기운이 있습니다.' };
  function tenGods(H) {
    var sd = H.sd, g = sd.groups, order = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; }), top = order[0], low = order[order.length - 1], T = SC.TOPICS.self[top], nm = who(H), charts = R.Charts && R.Charts.html ? R.Charts.html('groups', sd, { chapter: 'c04' }) : '';
    var out = [lineScene(nm + '의 힘은 다섯 갈래로 나뉩니다.\n내가 세상과 맺는 방식입니다.', 'normal'),
      scene(sec('rv', '<div class="lf-grp">' + Object.keys(GRP).map(function (k) { return '<div class="lf-g' + (k === top ? ' top' : '') + '"><b>' + k + '</b><span>' + esc(GRP[k][0]) + '</span><small>' + esc(GRP[k][1]) + '</small><i>' + Math.round(g[k]) + '%</i></div>'; }).join('') + '</div>' + charts), { layout: 'DATA' }),
      prose('', ['가장 큰 힘은 <strong>' + E(top) + '(' + E(GRP[top][0]) + ')</strong>입니다. ' + E(T[0]), E(T[1][0] + ' ' + T[1][1])]),
      prose('', ['비중이 가장 낮은 쪽은 <strong>' + E(low) + '</strong> 쪽은 상대적으로 낮습니다. ' + E(WEAK[low]) + '을 의식적으로 살필 수 있습니다. 비중이 낮다는 것이 해당 능력의 부재를 뜻하지는 않습니다.'])]; return out;
  }
  function stars(H) {
    var sd = H.sd, nm = who(H), have = (sd.specialStars || []).filter(function (s) { return STAR[s.name]; }), good = have.filter(function (s) { return STAR[s.name][0]; }).slice(0, 4), bad = have.filter(function (s) { return !STAR[s.name][0]; }).slice(0, 3);
    var card = function (s) { return '<div class="lf-star ' + (STAR[s.name][0] ? 'g' : 'n') + '"><b>' + esc(s.name) + '</b><small>' + esc(PILLAR[s.pillar] || '') + '</small><span>' + esc(STAR[s.name][1]) + '</span></div>'; };
    var out = [lineScene('사주에는 별처럼 붙는 기운도 있습니다.\n좋고 나쁨을 가르는 도장이 아니라,\n성향의 양념 정도로 읽어 주세요.', 'normal')];
    if (good.length) out.push(scene(sec('rv', '<div class="cap">' + esc(nm) + '에게 붙은 든든한 별</div><div class="lf-stars">' + good.map(card).join('') + '</div>')));
    if (bad.length) out.push(scene(sec('rv', '<div class="cap">알아 두면 좋은 결</div><div class="lf-stars">' + bad.map(card).join('') + '</div><p class="faint">이 별들은 사건을 예언하는 것이 아니라 성향의 결을 보여 줍니다.</p>')));
    var d12 = sd.sinsal12 && sd.sinsal12.day, m12 = sd.sinsal12 && sd.sinsal12.month, l = [d12 && S12[d12] && ['나 자신과 가까운 자리', d12, S12[d12]], m12 && S12[m12] && ['사회생활의 자리', m12, S12[m12]]].filter(Boolean);
    if (l.length) out.push(prose('', l.map(function (x) { return '<strong>' + E(x[0]) + '</strong>에는 <strong>' + E(x[1]) + '</strong>이 있습니다. ' + E(x[2]); })));
    if (!good.length && !bad.length && !l.length) out.push(prose('', ['특별히 두드러지는 별은 없습니다. 신살의 유무만으로 전체 사주의 균형이나 복을 판단하지는 않습니다.']));
    return out;
  }
  /* ── FINAL: 행동 가이드는 여기로 몰아서 ── */
  function actionsAll(H) { // 분야별 조언을 반복하지 않고 실천 이후 점검할 항목으로 마무리한다.
    var rows = [['money_nature', '돈'], ['career_style', '일'], ['love_style', '사랑'], ['marriage_who', '결혼'], ['relation_style', '사람 사이'], ['self_who', '나 자신']].map(function (x) { var a = SC.solution(x[0], H.sd); return a ? '<div class="lf-fcard"><b>' + x[1] + '</b><span>' + esc(a.review) + '</span></div>' : ''; }).join('');
    return [lineScene('모든 조언을 한꺼번에 바꾸기보다,\n지금 가장 부담이 큰 분야부터 실천해 보세요.', 'impact', 'FINAL'), scene(sec('rv', '<div class="cap">실천 뒤 확인할 변화</div><div class="lf-fcards">' + rows + '</div>'))];
  }
  function action(H) {
    var a = D.action(H.sd, H.plan, H.pos.seasonKey), col = function (t, cls, arr) { return '<div class="lf-col ' + cls + '"><small>' + t + '</small><ul>' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; };
    return [lineScene(H.pos.seasonName + '의 흐름에 맞춘 세 가지입니다.', 'soft'), scene(sec('rv', col('버릴 것', 'drop', a.drop) + col('지킬 것', 'keep', a.keep) + col('시작할 것', 'start', a.start)))];
  }

  /* ── 기존 챕터를 "바로 본론"으로: 서두·시기 설명·명리 해설·용어 풀이·중간 행동 가이드를 걷어낸다 ── */
  var TIME_BASE = /^c1[5-8]$/, TIMING_TALK = /대운|세운|세\s*무렵|[0-9]+~[0-9]+세|[0-9]{4}년/, KEEP_ACTIONS = /^c(19|20)$/;
  var ADVICE = /(하세요|보세요|두세요|마세요|주세요|세요|개운|추천|권합니다|해 볼 것)/;
  function noAdvice(t) { // 문장 단위로 조언·행동 문장을 뺀다("조심할 점"처럼 성향을 말하는 문장은 남긴다)
    var parts = String(t || '').replace(/\s*지금 해 볼 것:.*$/, '').split(/(?<=[.!?])\s+/); return parts.filter(function (p) { return p && !ADVICE.test(p) && !/좋(습니다|아요)[.!]?$/.test(p); }).join(' ').trim();
  }
  function trim(c, o) {
    o = o || {}; var base = c.base || c.id, tm = TIME_BASE.test(base), keepAct = KEEP_ACTIONS.test(base), x = Object.assign({}, c), keep = [], tail = [], intro = null, ending = null;
    (c.scenes || []).forEach(function (s) {
      var txt = s.cinema ? (s.cinema.segments || []).map(function (g) { return g.text; }).join(' ') : '';
      if (s.kind === 'opener') return;
      if (s.sceneType === 'chapterIntro') { intro = Object.assign({}, s, { compact: true }); return; }
      if (s.sceneType === 'chapterEnding') { ending = s; return; }
      if (s.sceneType === 'terms') return; // 용어 풀이는 쓰지 않는다
      if (!keepAct && /^(action|recommendation|warning)$/.test(s.sceneType)) return; // 중간 행동 가이드는 마지막 개운 가이드로 몰아서
      if (s.sceneType === 'cinema' && (s.kind === 'title' || s.kind === 'profile')) return;
      if (s.sceneType === 'cinema' && s.kind === 'script') { if (/명리에서는/.test(txt)) return; if (tm ? !/현실로 옮겨/.test(txt) : TIMING_TALK.test(txt)) return; }
      if (s.sceneType === 'chart' || s.sceneType === 'timeline') { tail.push(s); return; }
      keep.push(s);
    });
    if (!keepAct) {
      x.meaning = noAdvice(c.meaning); x.details = (c.details || []).map(function (d) { return Object.assign({}, d, { detail: noAdvice(d.detail) }); });
      if (!x.meaning && !x.details.length) keep = keep.filter(function (s) { return s.sceneType !== 'explanation'; });
    }
    x.scenes = (o.header !== false && intro ? [intro] : []).concat(keep, tail, o.last && ending ? [ending] : []); x.scenes = x.scenes.map(function (s) { return Object.assign({}, s); }); x.compact = true; x.actTransition = null; return x;
  }
  function uniqueText(text, seen) {
    return (/<[^>]*>/.test(String(text || '')) ? [String(text || '')] : String(text || '').split(/(?<=[.!?])\s+/)).filter(function (part) {
      var key = part.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (key.length < 24) return true; if (seen[key]) return false; seen[key] = true; return true;
    }).join(' ');
  }
  function pruneRepeats(chapters) {
    var seen = Object.create(null);
    chapters.forEach(function (c) {
      c.scenes = (c.scenes || []).filter(function (s) {
        if (s.html && /rd-prose/.test(s.html)) {
          s.html = s.html.replace(/<p class="lead">([\s\S]*?)<\/p>/g, function (_, text) { var kept = uniqueText(text, seen); return kept ? '<p class="lead">' + kept + '</p>' : ''; });
          return /<p class="lead">/.test(s.html);
        }
        if (s.sceneType === 'insight' && typeof s.body === 'string') { s.body = uniqueText(s.body, seen); return !!s.body; }
        if (s.sceneType === 'explanation') {
          c.meaning = uniqueText(c.meaning, seen);
          c.details = (c.details || []).map(function (d) { return Object.assign({}, d, { detail: uniqueText(d.detail, seen) }); });
          return !!c.meaning || c.details.some(function (d) { return !!d.detail; });
        }
        return true;
      });
    }); return chapters;
  }
  function pseudo(id, title, sub, scenes) { return { id: id, base: 'life', project: 'full', kind: 'life', title: title, subtitle: sub, headline: sub || '', introText: '', moduleCategories: [], scenes: scenes, enabled: true }; }

  /* ── 문서 조립: 전체 인생 → 오행 → 십성·신살 → 세부 이야기(연애·재물·직장…) → 앞으로의 흐름 → 개운 가이드 ── */
  var BLOCK_ORDER = ['love', 'money', 'career', 'relation'], MAP_BLOCK = { love: 'love', money: 'money', career: 'career', self: '', life: '' };
  var BRIDGE = { love: '이제 구체적인 이야기로 들어가 볼까요?\n마음이 가장 쓰이는 곳, 사랑부터 살펴보겠습니다.', money: '이번에는 현실 이야기입니다.\n돈은 어떻게 들어오고 나갈까요?', career: '이번에는 일하는 방식을 살펴보겠습니다.\n성과를 만드는 힘과 오래 일하기 위한 조건입니다.', relation: '마지막으로,\n나를 둘러싼 사람들 이야기입니다.' };
  function blockOrder(want) { var f = MAP_BLOCK[want]; return f ? [f].concat(BLOCK_ORDER.filter(function (k) { return k !== f; })) : BLOCK_ORDER.slice(); }
  function interestOrder(want) { return blockOrder(want); }

  // 풀이를 실제 일상의 예시 장면으로 옮긴다. 날짜·사건 예측이나 새로운 명리 계산은 하지 않는다.
  var EPISODES = {
    map: ['늦은 밤, {주인공}은 오래된 수첩을 펼쳤다. 서둘러 시작한 일과 오래 준비한 일이 같은 페이지에 나란히 적혀 있었다. 그때는 멈춘 줄 알았던 시간에도 무언가가 쌓이고 있었다.', '빈칸 하나에 다음 계획을 적으려다 손을 멈췄다. 예전 같으면 끝낼 날짜부터 정했을 것이다. 이번에는 지금 손에 있는 것과 아직 배워야 할 것을 따로 적었다.', '수첩을 덮자 해야 할 일이 갑자기 쉬워진 것은 아니었다. 다만 어디에서 다시 걸어야 할지 조금 또렷해졌다. 내일 할 수 있는 작은 일 하나가 남았다.'],
    here: ['아침부터 메시지가 쌓였다. {주인공}은 답장을 쓰다가 오늘 일정표를 다시 보았다. 모두에게 괜찮다고 말하면 정작 자기 몫의 시간은 사라질 것 같았다.', '한 약속에는 시간을 다시 정하자고 답했고, 다른 일에는 오늘 할 수 있는 범위를 적었다. 상대의 반응을 기다리는 몇 분이 생각보다 길었다.', '돌아온 답은 짧았다. “그럼 그때 보죠.” 세상이 무너지지 않는 것을 보고서야 어깨가 조금 풀렸다. 자기 속도를 알리는 일도 하루를 만드는 선택이었다.'],
    self: ['모임에서 다음 계획을 정하던 날, {주인공}은 익숙한 방식으로 일을 맡으려 했다. {습관} 누군가 “이번에는 다른 방법도 들어 보면 어때요?”라고 물었다.', '잠시 말이 끊겼다. 잘하는 방식으로 돕고 싶었는데, 그 방식만이 필요했던 것은 아니었다. 다른 사람의 설명을 듣자 미처 보지 못한 작은 빈틈이 눈에 들어왔다.', '모임이 끝날 때 계획은 처음 생각과 달라져 있었다. 자기 장점을 버린 것은 아니었다. 같은 힘을 조금 다른 자리에 써 본 하루였다.'],
    elements: ['책상 위에는 끝내지 못한 메모가 여러 장 놓여 있었다. {주인공}은 가장 많은 일을 한 날이 꼭 가장 편안했던 날은 아니라는 생각을 했다.', '새 계획을 하나 더 적으려다가 앞서 적은 일을 살폈다. 많이 가진 힘과 지금 필요한 힘을 같은 것으로 생각해 온 것은 아닌지 돌아보았다.', '메모 한 장을 치우고 남은 일의 순서를 바꿨다. 부족해 보이는 것을 무작정 채우는 대신, 이미 하고 있는 일을 어떻게 이어 갈지 정하자 책상 위가 조금 넓어졌다.'],
    car: ['출발을 앞두고 {주인공}은 내비게이션의 빠른 길을 눌렀다. 몇 분을 아끼는 대신 좁은 길을 여러 번 돌아야 했다. 평소의 선택과 닮아 있어 잠깐 웃음이 났다.', '이번에는 익숙한 큰길을 골랐다. 앞차가 느리게 움직여도 서두르지 않았다. 목적지가 같아도 자신에게 맞는 방식은 다를 수 있었다.', '도착해서 시동을 끄자, 잘 달리는 것만큼 잘 멈추는 것도 자기 몫이라는 생각이 들었다. 급히 도착한 날보다 오늘의 길이 더 선명하게 남았다.'],
    talent: ['부탁받은 작은 일을 하던 중, {주인공}은 다른 사람이 지나친 부분을 다시 살폈다. {재주} 본인에게는 익숙한 일이어서 대단하다고 생각하지 않았다.', '결과를 본 동료가 물었다. “그건 어떻게 생각했어요?” 설명하다 보니 자신이 자연스럽게 반복해 온 방식에 이름을 붙일 수 있었다.', '그날 이후 잘하는 일을 묻는 질문에 답이 조금 달라졌다. 멋진 직함 대신 실제로 해 본 장면을 말했다. 작게 쓰던 재주가 다른 일에서도 쓰일 수 있다는 것을 처음 확인했다.'],
    shadow: ['피곤한 저녁, {주인공}은 평소라면 넘겼을 한마디에 오래 마음이 걸렸다. {그늘} 답장을 몇 번 고쳐 쓸수록 하고 싶은 말은 더 길어졌다.', '보내기 직전 화면을 내려놓았다. 상대에게 확인한 사실과 혼자 덧붙인 생각을 나누어 보니, 당장 전부 말할 필요는 없었다.', '다음 날 짧게 물었을 때 돌아온 설명은 예상과 달랐다. 마음이 완전히 풀린 것은 아니었지만, 같은 장면에서 예전과 다른 반응을 할 수 있다는 작은 여지가 생겼다.'],
    balance: ['함께 맡은 일을 끝낸 날, {주인공}은 칭찬을 들으면서도 지쳐 있었다. 잘해 낸 방식이 그대로 다음 일의 부담이 되어 돌아온 탓이었다.', '동료가 다시 같은 일을 부탁하자 바로 대답하지 않았다. 할 수 있는 부분과 다른 사람에게 맡길 부분을 나누어 이야기했다. 잘한다는 이유로 전부 해야 하는 것은 아니었다.', '이번에는 일이 조금 느리게 시작됐지만 마지막까지 혼자 남지 않았다. 장점을 오래 쓰려면 그 장점이 과해지는 순간도 알아야 한다는 것을 몸으로 배운 날이었다.'],
    stages: ['오래전에 시작한 일을 다시 꺼낸 날, {주인공}은 첫날의 서툰 흔적을 보았다. 지금 같으면 고칠 부분이 많았지만 당시에는 그 한 줄을 쓰는 데도 용기가 필요했다.', '바로 지우려다가 그대로 두었다. 시작하는 사람과 익숙해진 사람에게 필요한 속도가 같을 수는 없었다. 옆에는 지금의 생각을 새로 적었다.', '두 기록 사이에 지난 시간이 놓여 있었다. 아직 끝난 일이 아니라는 사실이 이번에는 조급함보다 여유를 주었다. 다른 단계에서 다시 이어 갈 수 있었다.'],
    stars: ['모임에서 자리를 정하던 날, {주인공}은 사람들이 자신에게 기대하는 역할을 알아차렸다. 늘 조용히 살피던 사람은 이번에도 듣는 자리에, 먼저 움직이던 사람은 앞자리에 앉았다.', '그 익숙한 자리를 잠시 바꿔 보았다. 평소보다 한마디 더 하거나, 먼저 답하는 대신 질문을 기다렸다. 사람들의 반응도 조금 달라졌다.', '돌아오는 길에는 자신에게 붙은 이름보다 실제로 선택한 행동이 더 오래 떠올랐다. 같은 성향도 어떤 장면에 놓이느냐에 따라 다른 얼굴을 보일 수 있었다.'],
    career: ['새 일을 제안받은 날, {주인공}은 직함보다 실제 하루가 궁금했다. 누가 무엇을 결정하고, 혼자 생각할 시간은 있는지 물었다.', '그럴듯한 소개 뒤에 자신이 힘들어했던 방식이 숨어 있었다. 대신 규모는 작아도 익숙한 강점을 쓸 수 있는 다른 역할이 눈에 들어왔다.', '쉽게 정답을 고른 것은 아니었다. 다만 남들이 좋다고 하는 자리와 자신이 오래 일할 수 있는 자리의 차이를 설명할 수 있게 되었다.'],
    jobs: ['지원할 일을 고르던 {주인공}은 이름이 다른 두 공고를 나란히 놓았다. 한쪽은 눈에 익은 업종이었고 다른 쪽은 처음 보는 분야였다.', '업무를 한 줄씩 읽어 보니 낯선 분야에서도 이미 해 본 방식이 보였다. {재주} 분야의 이름보다 실제 역할이 더 가까웠다.', '이력서에는 추상적인 장점 대신 그 일을 해 본 사례를 적었다. 새로운 길은 전혀 다른 사람이 되는 일이 아니라 익숙한 힘을 다른 곳에 써 보는 일이 될 수도 있었다.'],
    success: ['발표를 앞두고 {주인공}은 자료를 한 번 더 고치고 싶었다. 준비를 잘하는 마음과 끝없이 미루는 마음이 같은 표정으로 앉아 있었다.', '함께 일하는 사람이 “지금 보여 주고 의견을 받죠”라고 말했다. 완벽하지 않은 부분을 먼저 밝혀 둔 채 자료를 보냈다.', '돌아온 의견 덕분에 혼자 보지 못한 부분을 고칠 수 있었다. 그날의 성과는 흠 없는 결과보다, 자기 방식과 다른 도움을 연결한 데서 시작되었다.'],
    money: ['주말에 {주인공}은 통장보다 지난달의 선택을 먼저 살폈다. 꼭 필요했던 지출 옆에는 피곤한 날 스스로에게 보상하듯 고른 것들도 있었다.', '모두 줄이겠다고 마음먹는 대신, 오래 쓰는 것과 잠깐 마음을 달래는 것을 나누어 적었다. 자신이 무엇에 쉽게 마음이 움직이는지 비로소 보였다.', '다음 구매를 앞둔 날에는 그 메모를 한 번 읽었다. 돈이 갑자기 늘어난 것은 아니었지만, 선택이 자기 생각을 조금 더 닮아 갔다.'],
    love: ['메시지가 오기를 기다리던 저녁, {주인공}은 짧은 답 하나를 여러 뜻으로 읽고 있었다. 상대는 어떤 마음일지 짐작할수록 자기 마음을 말하기는 더 어려워졌다.', '한참 뒤 질문을 바꿨다. “나는 오늘 같이 이야기하고 싶었어. 너는 어땠어?” 상대를 알아맞히는 대신 자신의 마음을 먼저 작은 문장으로 꺼냈다.', '그날 모든 차이를 해결하지는 못했다. 하지만 두 사람이 같은 대화를 다르게 기억한다는 것을 알게 됐다. 가까워지는 일은 정답을 맞히는 것과 조금 달랐다.'],
    spouse: ['둘이 함께 보낼 날을 정하던 중, {주인공}은 빈틈없는 일정을 보여 주었다. 상대는 조용히 듣다가 “그날은 그냥 천천히 걷고 싶었어”라고 말했다.', '준비한 것을 거절당한 듯해 잠시 서운했다. 하지만 상대가 원한 것은 관심이 적은 하루가 아니라 자기 속도로 함께 있는 하루였다.', '목적지 하나를 지우고 시간을 비웠다. 걸으며 나눈 이야기는 계획표에 적을 수 없었지만, 서로 어떤 시간을 편안해하는지 처음 알게 해 주었다.'],
    marriage: ['함께 살아갈 방을 보던 날, {주인공}은 공간보다 매일의 모습을 물었다. 늦게 들어오는 날, 쉬고 싶은 날, 의견이 달라지는 날을 하나씩 이야기했다.', '둘은 좋아하는 것만큼 불편한 것도 달랐다. 같은 마음이면 저절로 맞을 줄 알았던 부분에서 구체적인 약속이 필요했다.', '집을 정하기 전에 작은 기준부터 적었다. 오래 함께하는 모습은 큰 결심 한 번보다 서로의 하루를 이해하는 대화에서 조금씩 만들어지고 있었다.'],
    compatibility: ['함께 일을 맡은 사람이 자신과 전혀 다른 순서로 움직이자 {주인공}은 답답했다. 본인은 먼저 정리하고 싶었고 상대는 일단 해 보자고 했다.', '서로 상대의 방식을 고치려다가 역할을 나누어 보았다. 처음 시도는 상대가 맡고, 놓친 부분을 확인하는 일은 자신이 맡았다.', '편한 조합이라고만 할 수는 없었다. 다만 서로 다른 힘이 어느 지점에서 보탬이 되는지 알게 되자, 다름을 설명하는 말도 조금 부드러워졌다.'],
    family: ['가족의 부탁을 들은 {주인공}은 익숙한 대로 괜찮다고 답했다. 전화를 끊은 뒤에야 이번 주에는 그 일을 맡기 어렵다는 생각이 들었다.', '다시 전화를 걸어 가능한 시간을 말했다. 상대는 잠시 조용했지만 함께 다른 방법을 찾아보기로 했다. 예전에는 끝까지 혼자 해결하던 일이었다.', '늦은 저녁, 마음에는 작은 미안함과 여유가 함께 남았다. 가까운 사람을 아끼는 방식에도 자신의 생활을 설명할 자리가 있다는 것을 배우는 중이었다.'],
    timing: ['새 일을 시작하려던 날, {주인공}은 달력의 빈칸을 살폈다. 좋은 기회라는 말만으로 오늘의 체력과 준비가 함께 채워지는 것은 아니었다.', '{시기선택} 날짜를 정한 뒤에는 무엇을 준비하고 무엇을 확인할지도 적었다.', '달력은 미래를 약속해 주지 않았다. 대신 서두를 일과 기다릴 일을 나누는 작은 기준이 되었다. 시작할 날보다 시작할 수 있는 상태가 더 중요해졌다.'],
    health: ['출발 전날, {주인공}은 이동 일정이 빽빽하다는 것을 알아차렸다. 쉬는 시간을 줄이면 모두 해낼 수 있을 것 같았지만 이번에는 그 빈칸부터 다시 봤다.', '한 약속을 조정하고 이동 사이에 여유를 남겼다. 출발하기 전에는 휴대전화를 내려놓고 안전벨트를 확인했다. 별다른 사건이 생겨야만 할 수 있는 준비는 아니었다.', '그날 저녁에는 무사히 돌아왔다는 사실을 운의 증거로 해석하지 않았다. 다만 자신이 챙긴 여유와 확인이 하루를 조금 덜 바쁘게 만들었다는 것은 알 수 있었다.'],
    remedy: ['{주인공}은 여러 실천 목록을 한꺼번에 적다가 손을 멈췄다. 좋은 방법이 많을수록 오늘 시작할 일은 오히려 흐려졌다.', '이번에는 {실천} 나머지는 다음으로 미뤘다. 작은 선택을 잊지 않도록 책상 한쪽에 메모를 놓았다.', '며칠 뒤 메모를 다시 보았을 때 세상이 달라진 것은 아니었다. 하지만 그 일을 한 날과 하지 않은 날의 차이는 말할 수 있었다. 실천은 그렇게 자기 생활 속에 자리를 얻기 시작했다.'],
    places: ['주말 아침, {주인공}은 가 보고 싶던 장소의 사진을 다시 열었다. 길한 이름보다 실제로 오갈 수 있는 거리와 쉬어 갈 자리가 먼저 눈에 들어왔다.', '걷는 동안에는 멀리 보이는 풍경과 자기 발걸음에 집중했다. 특별한 기운을 얻으려 애쓰기보다 잠시 익숙한 일정에서 벗어났다.', '집으로 돌아오는 길에는 다음 주의 일을 하나 덜어 내기로 했다. 그 장소가 삶을 바꾸어 준 것이 아니라, 그곳에서 자신이 고른 작은 여유가 남았다.'],
    action: ['메모에는 버릴 것과 지킬 것과 시작할 것이 길게 적혀 있었다. {주인공}은 한 줄씩 읽다가 가장 작은 것 하나에 표시했다.', '다음 날 그 일을 하기 위해 기존 약속을 조금 바꿨다. 마음먹는 데서 끝나지 않으려면 오늘의 시간도 달라져야 했다.', '밤에는 잘했는지보다 실제로 했는지를 적었다. 작은 기록 하나가 남자 다음 날 다시 이어 갈 자리가 생겼다. 아직 완성된 변화는 아니었지만 시작한 일은 분명했다.'],
    ending: ['{주인공}은 마지막 페이지에서 한참 머물렀다. 읽는 동안 떠올랐던 사람과 일들이 모두 한 번에 정리되지는 않았다.', '휴대전화를 내려놓기 전, 가장 마음에 남은 문장 하나를 적었다. 앞으로 어떤 일이 생길지 맞히는 대신 다음에 닮은 장면이 왔을 때 다르게 해 볼 일을 골랐다.', '창밖은 읽기 전과 같은 풍경이었다. 달라진 것이 있다면 그 풍경 속에서 자신의 다음 걸음을 조금 더 구체적으로 생각하고 있다는 점이었다.'],
    knowledge: ['같은 말을 여러 번 읽어도 {주인공}은 선뜻 자기 이야기로 느끼지 못했다. 그러다 얼마 전 겪은 작은 장면 하나가 떠올랐다.', '그날 자신이 한 말과 상대의 반응을 다시 생각했다. 설명 속의 장점과 부담이 서로 다른 두 사람이 아니라 같은 자신의 모습일 수도 있었다.', '답을 다 찾은 것은 아니었다. 다음에 비슷한 일이 생기면 잠깐 멈추고 다른 반응을 골라볼 수 있겠다는 생각만 남겼다. 그 정도면 오늘 읽은 말을 생활로 옮길 첫 자리는 생긴 셈이었다.']
  };
  var EPISODE_KEYS = { c00: 'map', c01: 'self', c02: 'elements', c03: 'self', c04: 'talent', c05: 'shadow', c06: 'career', c07: 'success', c08: 'money', c09: 'love', c10: 'marriage', c11: 'compatibility', c12: 'compatibility', c13: 'family', c14: 'past', c15: 'timing', c16: 'here', c17: 'timing', c18: 'timing', c19: 'remedy', c20: 'ending', deep_car: 'car', deep_proscons: 'balance', deep_stages: 'stages', deep_jobs: 'jobs', deep_spouse: 'spouse', deep_children: 'children', deep_ilju: 'compatibility', deep_past: 'past', deep_wealth: 'money', deep_love: 'love', deep_marriage: 'marriage', deep_daewoon: 'timing', deep_seun: 'timing', deep_wolun: 'timing', deep_health: 'health', deep_remedy: 'remedy', deep_places: 'places', life_prologue: 'map', life_here: 'here', life_tengods: 'self', life_stars: 'stars', life_future: 'timing', life_actions: 'action', life_action: 'action' };
  var EPISODE_GROUP = {
    비겁: ['누구보다 먼저 손을 들고, 자신이 맡으면 잘해 낼 수 있다고 생각했다.', '사람마다 잘하는 일을 나누어 함께 시작하는 데 힘을 보탰다.', '상대가 다르게 하자는 말을 자신의 노력을 몰라주는 말처럼 받아들이고 있었다.'],
    식상: ['떠오른 생각을 곧바로 설명하며, 새로운 방법을 보여 주고 싶었다.', '익숙한 일을 새 방식으로 표현해 이해하기 쉽게 만들었다.', '하고 싶은 설명이 많아질수록 상대가 말할 빈틈은 줄어들고 있었다.'],
    재성: ['필요한 시간과 비용을 먼저 따져 보고, 실제로 가능한 계획을 고르려 했다.', '필요한 준비와 자원을 정리해 흩어진 일을 실제 계획으로 만들었다.', '잘 해내고 싶은 마음 때문에 쉬는 시간마저 쓸모없는 시간처럼 느끼고 있었다.'],
    관성: ['정해진 기준과 책임부터 확인하고, 누가 어떤 역할을 맡을지 물었다.', '놓치기 쉬운 기준을 확인해 맡은 일이 끝까지 이어지도록 도왔다.', '작은 어긋남도 바로잡아야 할 일처럼 보여 말이 단단해지고 있었다.'],
    인성: ['앞서 했던 일을 떠올리고, 아직 확인하지 못한 부분을 더 살피려 했다.', '흩어진 정보를 모아 다른 사람이 이해할 수 있게 차근차근 설명했다.', '아직 모르는 것이 있다는 이유로 이미 할 수 있는 선택까지 뒤로 미루고 있었다.']
  };
  function episodeKeyOf(c) {
    var id = c.id || c.base, key = EPISODE_KEYS[id] || EPISODE_KEYS[c.base];
    if (!key) key = /timing|future|TIMING/.test(id) ? 'timing' : /money|MONEY/.test(id) ? 'money' : /marriage|MARRIAGE/.test(id) ? 'marriage' : /love|LOVE/.test(id) ? 'love' : /career|CAREER/.test(id) ? 'career' : /relation|RELATIONSHIP/.test(id) ? 'compatibility' : /ACTION/.test(id) ? 'action' : 'knowledge';
    return key;
  }
  // "풀이 속 한 장면"은 전생(past)과 인연(궁합·관계: compatibility) 챕터에만 둔다.
  var EPISODE_KEEP = { past: 1, compatibility: 1 };
  function episode(c, H) {
    var id = c.id || c.base, key = episodeKeyOf(c);
    var sd = H.sd, actor = H.name || '그 사람', chars = actor.charCodeAt(actor.length - 1), topic = actor + (chars >= 0xAC00 && chars <= 0xD7A3 && (chars - 0xAC00) % 28 ? '은' : '는');
    var motif = EPISODE_GROUP[sd.dominantGroup] || EPISODE_GROUP.인성, paras = (EPISODES[key] || EPISODES.knowledge).slice(), source = c.subtitle || c.headline || c.title;
    if (key === 'children') {
      var p = R.ChildReading && R.ChildReading.profile(H), children = R.ChildReading && R.ChildReading.PORTRAIT;
      if (p && p.known && children) {
        var portrait = children[p.type], activity = { 비견: '자기 방식으로 만들고 싶다며 설명서와 다른 순서로 손을 움직이고 있었다', 겁재: '친구들과 할 놀이를 정하다 자기 편이 지는 것이 싫다며 입을 내밀었다', 식신: '만들던 것을 다시 고치며 조금만 더 해 보고 싶다고 했다', 상관: '“왜 꼭 그렇게 해야 해?”라고 물으며 새로운 방법을 설명했다', 편재: '새로 본 활동을 이야기하며 직접 가 보고 싶다고 했다', 정재: '약속한 순서가 달라졌다며 계획을 다시 확인했다', 편관: '어려운 일을 끝내 해 보겠다며 도움을 잠시 기다려 달라고 했다', 정관: '실수한 일을 말하기 전에 부모의 표정부터 살폈다', 편인: '혼자 모아 둔 작은 물건들을 한참 들여다보고 있었다', 정인: '궁금한 것을 연달아 물은 뒤 부모 곁에 앉아 답을 기다렸다' }[p.type];
        paras = ['저녁 무렵, {주인공}은 아이 곁에 앉았다. 아이는 ' + activity + '. 평소 같으면 부모의 기준부터 말했을 장면이었다.', '이번에는 말을 조금 늦추고 아이가 하려던 이야기를 끝까지 들었다. “네가 생각한 방법을 먼저 보여 줄래?” 아이는 자기 마음을 말할 작은 틈을 얻었다.', '당장 모든 일이 잘 풀리지는 않았다. 둘은 함께 지킬 약속 하나를 정하고 나머지는 아이가 해 보도록 남겨 두었다. ' + portrait[0] + '의 모습을 이해하는 대화는 그렇게 일상 안에서 시작될 수 있었다.']; source = portrait[0];
      } else paras = ['아이와 이야기를 나누던 {주인공}은 자신이 아이의 답을 먼저 정하고 있다는 것을 알아차렸다.', '이번에는 “너는 어떤 게 재미있었어?”라고 물었다. 처음 듣는 관심사가 나왔고, 함께 보냈던 하루가 아이에게는 다른 모습으로 남아 있었다.', '아이의 성향을 미리 맞히기보다 오늘 들은 말을 기억하기로 했다. 실제 모습을 알아가는 대화가 관계를 살필 첫 단서가 되었다.'];
    }
    if (key === 'past') paras = ['드라마의 마지막 장면 뒤, 그 사람은 평소처럼 문을 열고 밖으로 나섰다. 지나가던 이웃이 멈추어 도움을 청했다. 큰 선택이 끝난 뒤에도 삶은 이렇게 작은 질문으로 이어졌다.', '예전의 습관대로 답하려다 잠시 멈췄다. 혼자 맡아도 되는 일인지, 상대가 정말 필요로 하는 것이 무엇인지 먼저 물었다. 익숙한 말 대신 새로 배운 태도가 작은 대화 속에 남았다.', '특별한 박수는 없었다. 둘은 할 일을 나누고 각자의 길로 걸어갔다. 이야기가 남긴 변화는 대단한 운명보다 그 평범한 다음 장면에서 더 잘 보였다.'];
    var rows = c.items || [], notable = rows.filter(function (r) { return r.title; })[0];
    if (key === 'timing' && notable) source = notable.title;
    var season = sd.sewoon && sd.sewoon.season, defensive = /defense|transition/.test(season || '');
    var practice = sd.usefulElements && sd.usefulElements.yong === '목' ? '새로 배우고 싶던 것을 짧게 익힐 시간을 남겼다.' : sd.usefulElements && sd.usefulElements.yong === '화' ? '미뤄 두었던 대화 하나를 먼저 시작했다.' : sd.usefulElements && sd.usefulElements.yong === '금' ? '흩어진 일을 정리하고 오늘 마무리할 범위를 정했다.' : sd.usefulElements && sd.usefulElements.yong === '수' ? '잠깐 조용히 돌아보고 쉬는 시간을 일정에 남겼다.' : '매일 반복할 수 있는 작은 일을 같은 시간에 해 보기로 했다.';
    paras = paras.map(function (t) { return t.replace(/\{주인공\}은/g, topic).replace(/\{습관\}/g, motif[0]).replace(/\{재주\}/g, motif[1]).replace(/\{그늘\}/g, motif[2]).replace(/\{시기선택\}/g, defensive ? '새 약속을 더하기 전에 이미 맡은 일을 정리하고 확인할 시간을 먼저 남겼다.' : '움직여 볼 일 하나를 골랐지만 모든 약속을 한꺼번에 늘리지는 않았다.').replace(/\{실천\}/g, practice); });
    // 동일 분야 챕터도 앞선 풀이의 핵심 문맥을 다른 질문으로 이어 간다.
    var frame = { self: '잘하는 방식이 늘 필요한 방식일까.', elements: '많이 쓰는 힘과 지금 필요한 힘은 같을까.', talent: '자연스럽게 하는 일에도 이름을 붙일 수 있을까.', shadow: '그 순간 다른 반응을 골랐다면 어땠을까.', career: '그 일을 맡으면 실제 하루는 어떤 모습일까.', jobs: '낯선 분야에서도 내 방식을 쓸 자리가 있을까.', money: '무엇을 고르는지가 돈을 쓰는 마음을 보여 줄까.', love: '상대를 짐작하기 전에 내 마음을 말할 수 있을까.', marriage: '함께 사는 마음은 어떤 약속으로 이어질까.', compatibility: '서로 다른 방식이 함께 쓸 힘이 될 수 있을까.', remedy: '이번에는 무엇 하나를 실제로 해 볼까.' }[key];
    if (frame) paras[0] = frame + ' ' + paras[0];
    var s = scene(sec('rv rd-prose rd-episode', '<div class="cap">풀이 속 한 장면</div>' + paras.map(function (p) { return '<p class="lead">' + esc(p) + '</p>'; }).join('')), { episode: true, episodeSource: { chapterId: id, topic: key, motif: source, dominantGroup: sd.dominantGroup } });
    s.sceneId = id + '_episode'; return s;
  }
  function attachEpisodes(chapters, H) {
    chapters.forEach(function (c) {
      if (!EPISODE_KEEP[episodeKeyOf(c)] || (c.scenes || []).some(function (s) { return s.episode; })) return;
      var ep = episode(c, H), at = c.scenes.length;
      if (at && (c.scenes[at - 1].sceneType === 'chapterEnding' || /rd-cin/.test(c.scenes[at - 1].html || ''))) at--;
      c.scenes.splice(at, 0, ep);
    }); return chapters;
  }
  function build(H) {
    seq = 0; H.pos = D.position(H.M, H.ch, H.sd, H.now); var nm = who(H);
    var acts = [{ id: 1, roman: 'PROLOGUE', title: '전체 인생 풀이', line: '' }, { id: 2, roman: 'ACT I', title: '타고난 오행', line: '' }, { id: 3, roman: 'ACT II', title: '십성과 신살', line: '' },
      { id: 4, roman: 'ACT III', title: '세부 이야기', line: '' }, { id: 5, roman: 'ACT IV', title: '앞으로의 흐름', line: '' }, { id: 6, roman: 'FINAL', title: '개운 가이드', line: '' }].map(function (a) { a.pdfDone = ''; return a; });
    var byBase = {}; (H.rep ? H.rep.chapters : R.Chapters.BASE.map(function (c) { return { id: c.id, base: c.id, title: c.title, scenes: [] }; })).forEach(function (c) { byBase[c.base || c.id] = c; }); // rep 이 없으면(관리자 순서 미리보기) 기본 챕터 목록으로 순서만 만든다
    var out = [], used = {};
    // 본문 대체(관리자 rules.serviceBody): DB 풀이가 충분한 분야는 기존 "모듈 문장" 챕터를 빼고 그 자리에 DB 풀이를 본문으로 둔다. 카드(계산) 챕터와 DB 가 부족한 분야는 그대로.
    var LEG = { SELF: ['c01', 'c02'], LOVE: ['c09', 'c12'], MARRIAGE: ['c10'], MONEY: ['c08'], CAREER: ['c06', 'c07'], RELATIONSHIP: ['c11', 'c13'], TIMING: ['c17', 'c18'] }, MIN_SEC = 2, replaced = {};
    var bodyMode = !!(H.ik && H.ik.__mode === 'replace');
    var covered = function (dom) { var d = H.ik && H.ik[dom]; return !!(bodyMode && d && d.sections && d.sections.length >= MIN_SEC); };
    var skip = {}; Object.keys(LEG).forEach(function (dom) { if (covered(dom)) { replaced[dom] = 1; LEG[dom].forEach(function (b) { skip[b] = 1; }); } });
    function real(base, act, o) { var c = byBase[base]; if (!c || used[base] || skip[base]) return; used[base] = 1; o = o || {}; var x = trim(c, { header: !o.noHeader, last: base === 'c20' }); x.act = act; if (o.title) { x.title = o.title; x.introText = o.sub || ''; x.subtitle = o.sub || ''; var ci = x.scenes.filter(function (s) { return s.sceneType === 'chapterIntro'; })[0]; if (ci) ci.subtitle = o.sub || ''; } out.push(x); }
    function made(id, title, sub, scenes, act) { var c = pseudo(id, title, sub, [{ sceneId: id + '_in', sceneType: 'chapterIntro', subtitle: sub, compact: true }].concat(scenes)); c.act = act; out.push(c); }
    function bridge(id, text, act) { var prev = out[out.length - 1]; if (prev) prev.scenes = prev.scenes.concat([lineScene(text, 'normal')]); } // 이야기를 잇는 한두 줄: 이전 챕터 끝에 붙인다
    function topic(cardId, bases, act, after) { // 새 카드 → 기존 챕터(제목 없이 이어서) → 시간축 카드
      var m = D.byId[cardId]; made('life_' + cardId, m.title, m.sub, cards(cardId, H), act); bases.forEach(function (b, i) { real(b, act, { noHeader: i === 0 }); }); (after || []).forEach(function (f) { f(); }); }
    // 관리자가 게시·검수한 풀이 지식으로 만든 "더 깊이 보기"(R.IKDeep). 없으면 아무것도 추가하지 않는다.
    var ikd = function (dom, act) {
      var d = H.ik && H.ik[dom]; if (!d || !d.sections || !d.sections.length) return;
      var sc = []; d.sections.forEach(function (s) { for (var i = 0; i < s.paras.length; i += 3) sc.push(prose(i ? '' : s.title, s.paras.slice(i, i + 3).map(esc))); });
      if (replaced[dom]) made('life_ik_' + dom, d.title + ' · 풀이', '검수된 풀이로 읽는 ' + d.title, sc, act); else made('life_ik_' + dom, d.title + ' · 더 깊이', '검수된 풀이로 더 자세히', sc, act);
    };
    var gen = function (gid, act) { return function () { var m = D.byId[gid]; made('life_' + gid, m.title, m.sub, timing(m.gen, m.title, m.sub, H), act); }; };
    // PROLOGUE: 전체 인생 풀이
    made('life_prologue', '나의 인생 지도', '대운 10개로 본 인생의 계절', prologue(H), 1);
    made('life_here', '지금 내가 서 있는 곳', '대운 + 세운 + 원국', here(H), 1);
    real('c00', 1);
    // ACT I: 타고난 오행
    bridge('life_b1', '이제 이 지도를 만든 재료를 하나씩 열어 살펴보겠습니다.\n먼저, ' + nm + '이 타고난 다섯 기운입니다.', 2);
    topic('self_who', ['c01'], 2); real('c02', 2); ikd('SELF', 2);
    // ACT II: 십성과 신살
    bridge('life_b2', '다섯 기운이 사람 안에서 움직이는 방식,\n십성이라는 눈으로 살펴보겠습니다.', 3);
    made('life_tengods', '십성 · 내 안의 다섯 힘', '비겁 · 식상 · 재성 · 관성 · 인성', tenGods(H), 3); real('c03', 3, { noHeader: true }); real('deep_car', 3); real('c04', 3); real('c05', 3); real('deep_proscons', 3);
    made('life_stars', '신살 · 사주에 붙은 별', '귀인 · 12신살', stars(H), 3); real('deep_stages', 3);
    // ACT III: 세부 이야기(관심 분야가 먼저)
    blockOrder(H.interest).forEach(function (k, i) {
      bridge('life_bb_' + k, i === 0 ? BRIDGE[k] : '다음은 ' + ({ love: '사랑', money: '돈', career: '일', relation: '사람' }[k]) + ' 이야기입니다.', 4);
      if (k === 'love') { topic('love_style', ['c09'], 4, [gen('love_timing', 4)]); real('deep_love', 4); topic('marriage_who', ['c10'], 4, [gen('marriage_timing', 4)]); real('deep_spouse', 4); real('deep_marriage', 4); real('deep_children', 4); real('c12', 4, { title: '끌리는 사람, 맞는 사람', sub: '궁합 · 일주 상성' }); real('deep_ilju', 4); ikd('LOVE', 4); ikd('MARRIAGE', 4); }
      if (k === 'money') { topic('money_nature', ['c08'], 4, [gen('money_timing', 4)]); real('deep_wealth', 4); ikd('MONEY', 4); }
      if (k === 'career') { topic('career_style', ['c06'], 4, [gen('career_timing', 4)]); real('deep_jobs', 4); real('c07', 4, { title: '나에게 맞는 성공 방식', sub: '억부 · 용신' }); ikd('CAREER', 4); }
      if (k === 'relation') { topic('relation_style', ['c11'], 4, [gen('relation_timing', 4)]); real('c13', 4, { title: '내가 자라온 자리', sub: '년주 · 월주' }); ikd('RELATIONSHIP', 4); }
    });
    real(byBase.deep_past ? 'deep_past' : 'c14', 4); // 상세 전생 하나만 표시; 생성 실패 시 기존 이야기 사용
    // ACT IV: 앞으로의 흐름
    bridge('life_b4', '이야기가 많이 쌓였습니다.\n이제 시간을 앞으로 돌려 살펴보겠습니다.', 5);
    real('deep_daewoon', 5); made('life_future', '앞으로 10년의 구간', '세운 10개', future(H), 5); real('c17', 5); real('deep_seun', 5); real('c18', 5); real('deep_wolun', 5); real('deep_health', 5); ikd('TIMING', 5);
    // FINAL: 개운 가이드(행동은 여기로 몰아서)
    ikd('ACTION', 6);
    made('life_actions', '실천 뒤 확인할 변화', '분야별 한 줄 정리', actionsAll(H), 6); made('life_action', '버릴 것 · 지킬 것 · 시작할 것', H.pos.seasonName + '의 흐름에 맞춰서', action(H), 6);
    real('c19', 6, { title: '다음 길을 여는 개운 가이드', sub: '행동 · 성장 · 사람 · 공간 · 환경 · 타이밍' }); real('deep_remedy', 6); real('deep_places', 6); real('c20', 6, { title: '운로 사용설명서', sub: '모든 흐름을 하나의 실행 계획으로' });
    out.forEach(function (c, i) { c.no = i + 1; });
    return { acts: acts.filter(function (a) { return out.some(function (c) { return c.act === a.id; }); }), chapters: attachEpisodes(pruneRepeats(out), H) };
  }
  // 관리자 미리보기: 문서에 실제로 들어가는 순서(번호 · ACT · 제목 · 출처)
  function outline(H) { var d = build(H); return d.chapters.map(function (c, i) { return { no: i + 1, act: (d.acts.filter(function (a) { return a.id === c.act; })[0] || {}).roman, title: c.title, id: c.id, kind: c.kind === 'life' ? '새 구성(엔진 값·현실 문체)' : '기존 챕터 ' + (c.base || c.id), scenes: (c.scenes || []).length }; }); }

  R.LifeDoc = { build: build, outline: outline, loadSocial: loadSocial, interestOrder: interestOrder, uniqueText: uniqueText, episode: episode, episodeKeyOf: episodeKeyOf, keepEpisode: function (c) { return !!EPISODE_KEEP[episodeKeyOf(c)]; }, attachEpisodes: attachEpisodes };
})(typeof window !== 'undefined' ? window : globalThis);
