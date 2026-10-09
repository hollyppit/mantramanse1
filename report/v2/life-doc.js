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
    real('deep_daewoon', 5); made('life_future', '앞으로 10년의 구간', '세운 10개', future(H), 5); real('c17', 5); real('deep_seun', 5); real('c18', 5); real('deep_wolun', 5); ikd('TIMING', 5);
    // FINAL: 개운 가이드(행동은 여기로 몰아서)
    ikd('ACTION', 6);
    made('life_actions', '실천 뒤 확인할 변화', '분야별 한 줄 정리', actionsAll(H), 6); made('life_action', '버릴 것 · 지킬 것 · 시작할 것', H.pos.seasonName + '의 흐름에 맞춰서', action(H), 6);
    real('c19', 6, { title: '다음 길을 여는 개운 가이드', sub: '행동 · 성장 · 사람 · 공간 · 환경 · 타이밍' }); real('deep_remedy', 6); real('deep_places', 6); real('c20', 6, { title: '운로 사용설명서', sub: '모든 흐름을 하나의 실행 계획으로' });
    out.forEach(function (c, i) { c.no = i + 1; });
    return { acts: acts.filter(function (a) { return out.some(function (c) { return c.act === a.id; }); }), chapters: pruneRepeats(out) };
  }
  // 관리자 미리보기: 문서에 실제로 들어가는 순서(번호 · ACT · 제목 · 출처)
  function outline(H) { var d = build(H); return d.chapters.map(function (c, i) { return { no: i + 1, act: (d.acts.filter(function (a) { return a.id === c.act; })[0] || {}).roman, title: c.title, id: c.id, kind: c.kind === 'life' ? '새 구성(엔진 값·현실 문체)' : '기존 챕터 ' + (c.base || c.id), scenes: (c.scenes || []).length }; }); }

  R.LifeDoc = { build: build, outline: outline, loadSocial: loadSocial, interestOrder: interestOrder, uniqueText: uniqueText };
})(typeof window !== 'undefined' ? window : globalThis);
