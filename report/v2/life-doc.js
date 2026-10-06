/* 인생 지도 흐름을 "하나의 긴 스크롤 문서"로 만든다(Reading Flow 에 그대로 실린다). 선택·탭·확대 화면은 없다.
   흐름: PROLOGUE 인생 전체 지도 → ACT I 지금 서 있는 곳 → ACT II 궁금한 이야기들(관심 분야가 먼저, 나머지가 이어짐) → ACT III 앞으로의 흐름 → FINAL 버릴 것·지킬 것·시작할 것.
   값은 전부 StoryDirector(엔진 계산을 읽기만 함)·StoryComposer(현실 언어 문장)에서 오고, 기존 챕터(c01~c20)는 그대로 이어 붙인다. 이 파일은 순서와 화면 조각만 만든다.
   build(H) → { acts, chapters }.  H: { M, ch, sd, now, name, interest, rep(기존 리포트), soc(관계·결혼 추정), plan }
   loadSocial(H) → Promise(soc)  관계·결혼 시기는 AI 추정(/api/life-ai, 실패하면 규칙 추정). */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, D = R.StoryDirector, SC = R.StoryComposer;
  var ICON = { opportunity: '◆', expansion: '▲', harvest: '●', accumulation: '■', transition: '◇', defense: '▽' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var br = function (s) { return esc(s).replace(/\n/g, '<br>'); };
  var MAX_AGE = 90, FIELD_NAME = { all: '종합', money: '돈', career: '직업', love: '사랑', relation: '관계' };

  /* ── 관계·결혼 AI 추정(기기 캐시 → 서버). 생년월일은 보내지 않는다. 늦으면 규칙 추정으로 진행한다. ── */
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function loadSocial(H, waitMs) {
    var rule; try { rule = D.social(H.M, H.ch, H.sd, H.now); } catch (e) { return Promise.resolve(null); }
    var pl; try { pl = D.aiPayload(H.M, H.ch, H.sd); } catch (e) { return Promise.resolve(rule); }
    var key = 'mt_life_ai_' + hash(JSON.stringify(pl)), got; try { got = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { }
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
      lineScene('지금 ' + who(H) + '은\n' + pos.seasonName + '에 있어요.', 'impact'),
      prose('', ['<strong>' + E(pos.headline) + '</strong>', E(pos.body.join(' ')), pos.decadeLine ? E(pos.decadeLine) : ''])];
    out.push(scene(sec('rv', '<div class="lf-dt"><div><small>지금 할 일</small>' + esc(pos.doThis) + '</div><div class="warn"><small>함정</small>' + esc(pos.trap) + '</div></div>')));
    var fl = Object.keys(pos.fields).map(function (k) { return '<div class="lf-fcard"><b>' + ({ money: '돈', career: '일', love: '사랑' }[k]) + '</b><span>' + esc(pos.fields[k].line) + '</span></div>'; }).join('');
    if (fl) out.push(scene(sec('rv', '<div class="cap">분야별로 보면</div><div class="lf-fcards">' + fl + '</div>')));
    out.push(scene(sec('rv', '<details class="lf-why"><summary>왜 이렇게 나오나요?</summary><dl>' + pos.evidence.map(function (e) { return '<dt>' + esc(e.k) + '</dt><dd>' + esc(e.v) + '</dd>'; }).join('') + '</dl><p class="faint">이 화면의 결론을 만든 실제 계산 값입니다.</p></details>')));
    return out;
  }
  /* ── 새 문체 카드 / 시간축 카드 ── */
  function cards(id, H) {
    var sc = SC.scenes(id, H.sd), by = function (k) { return sc.filter(function (x) { return x.kind === k; }).map(function (x) { return x.text; }); }, topic = SC.TOPICS[SC.MOD[id]].title, ex = by('ex'), out = [];
    out.push(prose(topic + ' 이야기', [E(who(H)) + '의 ' + E(topic) + ' 이야기를 풀어 볼게요.', '<strong>' + E(by('concl')[0]) + '</strong>', E(by('real').join(' '))]));
    if (ex.length) out.push(prose('', ['예를 들면 이런 모습이에요.<br>' + ex.map(E).join('<br>')]));
    out.push(prose('', [E(by('pro')[0]) + ' 다만, ' + E(by('trap')[0])]));
    out.push(scene(sec('rv', '<div class="lf-dt"><div><small>지금 해 볼 것</small>' + E(by('act')[0]) + '</div></div>')));
    out.push(scene(sec('rv', '<details class="lf-why"><summary>왜 이렇게 나오나요?</summary><dl>' + SC.evidence(id, H.sd).map(function (e) { return '<dt>' + esc(e.k) + '</dt><dd>' + esc(e.v) + '</dd>'; }).join('') + '</dl></details>'))); return out;
  }
  function bars(t, nm) {
    return '<div class="lf-bars" role="img" aria-label="앞으로 10년 ' + nm + ' 흐름">' + t.years.map(function (y) { var on = (t.windows || []).some(function (w) { return y.year >= w.fromYear && y.year <= w.toYear; });
      return '<div class="lf-bar' + (on ? ' on' : '') + '"><i style="height:' + Math.max(8, y.score) + '%"></i><b>' + String(y.year).slice(2) + '</b><small>' + esc(y.band) + '</small></div>'; }).join('') + '</div>';
  }
  function timing(gen, title, sub, H) {
    var out = [], f = gen.split(':')[1], nm = { money: '돈', career: '일', love: '인연', marriage: '인연', relation: '사람 사이' }[f] || '', t = D.timing(H.M, H.ch, H.sd, H.now, f, H.soc);
    out.push(lineScene(t.line, 'impact', title));
    if (t.years) out.push(scene(sec('rv', '<div class="cap">' + esc(sub) + '</div>' + bars(t, nm) + '<p class="faint">막대가 진한 해가 상대적으로 ' + nm + ' 이야기가 두드러지는 해입니다.</p>'), { layout: 'DATA' }));
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
  function action(H) {
    var a = D.action(H.sd, H.plan, H.pos.seasonKey), col = function (t, cls, arr) { return '<div class="lf-col ' + cls + '"><small>' + t + '</small><ul>' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; };
    return [lineScene('그래서 지금,\n무엇을 해야 할까요?', 'impact', 'FINAL'), lineScene(H.pos.seasonName + '의 흐름에 맞춘 세 가지입니다.', 'soft'), scene(sec('rv', col('버릴 것', 'drop', a.drop) + col('지킬 것', 'keep', a.keep) + col('시작할 것', 'start', a.start)))];
  }

  /* ── 문서 조립 ── */
  var INTEREST_ORDER = ['money', 'career', 'love', 'marriage', 'relation', 'self'], FUTURE_IDS = { future_cycle: 1, future_now: 1, future_3_5_10: 1, future_year: 1, future_months: 1 };
  var MAP_INTEREST = { money: ['money'], career: ['career'], love: ['love', 'marriage'], self: ['self'], life: [] };
  function interestOrder(want) { var first = MAP_INTEREST[want] || [], rest = INTEREST_ORDER.filter(function (k) { return first.indexOf(k) < 0; }); return first.concat(rest); }
  function pseudo(id, title, sub, scenes) { return { id: id, base: 'life', project: 'full', kind: 'life', title: title, subtitle: sub, headline: sub || '', introText: '', moduleCategories: [], scenes: scenes, enabled: true }; }

  function build(H) {
    seq = 0; H.pos = D.position(H.M, H.ch, H.sd, H.now);
    var acts = [{ id: 1, roman: 'PROLOGUE', title: '내 인생 전체', line: '90년짜리 지도를 펼칩니다.', pdfDone: '' }, { id: 2, roman: 'ACT I', title: '지금 서 있는 곳', line: '긴 인생에서 지금의 자리를 확인합니다.', pdfDone: '' },
      { id: 3, roman: 'ACT II', title: '궁금한 이야기들', line: '돈, 일, 사랑, 관계를 하나씩 확대해서 봅니다.', pdfDone: '' }, { id: 4, roman: 'ACT III', title: '앞으로의 흐름', line: '이제 시간이 움직이기 시작합니다.', pdfDone: '' }, { id: 5, roman: 'FINAL', title: '그래서 지금', line: '이 모든 이야기가 가리키는 행동입니다.', pdfDone: '' }];
    var byBase = {}; (H.rep ? H.rep.chapters : R.Chapters.BASE.map(function (c) { return { id: c.id, base: c.id, title: c.title, scenes: [] }; })).forEach(function (c) { byBase[c.base || c.id] = c; }); // rep 이 없으면(관리자 순서 미리보기) 기본 챕터 목록으로 순서만 만든다
    var out = [], used = {}, usedMod = {};
    function addReal(base, rename, act) { var c = byBase[base]; if (!c || used[base]) return; used[base] = 1; var x = Object.assign({}, c); x.act = act; x.actTransition = null; if (rename) { x.title = rename.title; x.introText = rename.sub; x.subtitle = rename.sub; } out.push(x); }
    function addPseudo(id, title, sub, scenes, act) { var c = pseudo(id, title, sub, [{ sceneId: id + '_in', sceneType: 'chapterIntro', subtitle: sub }].concat(scenes)); c.act = act; out.push(c); }
    // PROLOGUE · ACT I
    addPseudo('life_prologue', '나의 인생 지도', '대운 10개로 본 인생의 계절', prologue(H), 1);
    addPseudo('life_here', '지금 내가 서 있는 곳', '대운 + 세운 + 원국', here(H), 2);
    // ACT II: 관심 분야가 먼저, 나머지가 이어진다(모듈은 한 번씩만)
    var pos = H.pos; addReal('c00', null, 3); // 타고난 가장 큰 동력 — 궁금한 이야기들을 시작하기 전의 한 장
    var primary = (MAP_INTEREST[H.interest] && MAP_INTEREST[H.interest].length) ? MAP_INTEREST[H.interest] : ['money']; // 고른 관심 분야(없으면 돈)는 깊게, 나머지는 핵심만 — 문서가 너무 길어지지 않게
    interestOrder(H.interest).forEach(function (it) {
      var deep = primary.indexOf(it) >= 0;
      D.flow(it, { pos: pos }).steps.forEach(function (s) {
        if (s.kind === 'life' || s.kind === 'here' || s.id === 'act_remedy' || FUTURE_IDS[s.id] || usedMod[s.id]) return; usedMod[s.id] = 1;
        if (!deep && (D.byId[s.id].priority || 5) > 3) return; // 곁가지 이야기는 관심 분야에서만
        var title = s.title, sub = s.sub, ch = s.chapters.filter(function (b) { return byBase[b] && !used[b]; }); if (!deep) ch = ch.slice(0, 1);
        if (SC.has(s.id)) addPseudo('life_' + s.id, title, sub, cards(s.id, H), 3);
        else if (s.gen && !s.chapters.length) addPseudo('life_' + s.id, title, sub, timing(s.gen, title, sub, H), 3);
        ch.forEach(function (b, i) { addReal(b, i === 0 && !SC.has(s.id) ? { title: title, sub: sub } : null, 3); });
        if (SC.has(s.id)) { /* 새 카드 뒤에 기존 챕터가 이어진다(위에서 추가) */ }
      });
    });
    // ACT III: 앞으로의 흐름(미래 모듈은 기존 챕터와 시간축 카드)
    [['future_cycle'], ['future_now'], ['future_3_5_10'], ['future_year'], ['future_months']].forEach(function (x) {
      var m = D.byId[x[0]]; if (x[0] === 'future_3_5_10') addPseudo('life_future', m.title, m.sub, future(H), 4); else m.chapters.forEach(function (b) { addReal(b, { title: m.title, sub: m.sub }, 4); });
    });
    // FINAL
    addPseudo('life_action', '그래서 지금 무엇을 해야 할까?', '버릴 것 · 지킬 것 · 시작할 것', action(H), 5);
    ['c19', 'c20'].forEach(function (b, i) { addReal(b, i === 0 ? { title: '다음 길을 여는 방법', sub: '행동 · 성장 · 사람 · 공간 · 환경 · 타이밍' } : { title: '운로 사용설명서', sub: '모든 흐름을 하나의 실행 계획으로' }, 5); });
    // 번호 · ACT 첫 챕터에 ACT 전환 화면
    var last = 0; out.forEach(function (c, i) { c.no = i + 1; if (c.act !== last) { var a = acts.filter(function (x) { return x.id === c.act; })[0]; c.actTransition = { kicker: a.roman, headline: a.title, body: a.line }; last = c.act; } });
    return { acts: acts.filter(function (a) { return out.some(function (c) { return c.act === a.id; }); }), chapters: out };
  }
  // 관리자 미리보기: 문서에 실제로 들어가는 순서(번호 · ACT · 제목 · 출처)
  function outline(H) { var d = build(H); return d.chapters.map(function (c) { return { no: c.no, act: (d.acts.filter(function (a) { return a.id === c.act; })[0] || {}).roman, title: c.title, id: c.id, kind: c.kind === 'life' ? '새 구성(엔진 시간축·현실 문체)' : '기존 챕터 ' + (c.base || c.id), scenes: (c.scenes || []).length }; }); }

  R.LifeDoc = { build: build, outline: outline, loadSocial: loadSocial, interestOrder: interestOrder };
})(typeof window !== 'undefined' ? window : globalThis);
