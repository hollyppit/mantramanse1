/* 오행 흐름·격국 상세 풀이 챕터(2026-11-15) — 운명의 타임라인에 엔진 계산값만으로 만든 장 5개를 끼워 넣는다.
   · 종합풀이: '내 사주의 기운은 어떻게 흐를까?'(timeline_self_flow) · '내 사주의 뼈대, 격국과 주요 구조'(timeline_self_gyeok) — '나의 타고난 기질' 바로 뒤
   · 재물운·커리어운·인연운 심화: 그 주제에 맞춘 오행 흐름 장(timeline_wealth_flow · timeline_career_flow · timeline_love_flow) — 각 주제 첫 장 바로 뒤
   · 표시 전용: engine.js(M.natalFlow · M.elementFlow · ch.weights · ch.unified · ch.strength · ch.patterns)와 /gyeok-structure.js 결과만 읽는다.
     AI 호출·DB 문안·새 점수 없음. 운세 점수·용신·강약 산식은 건드리지 않는다(tests/flow-chapters-sim.cjs 가 검사).
   · 격국·구조만으로 직업·재물·성격·길흉을 단정하지 않는다(금지 표현 검사).
   · 공개 스위치: /api/luck-flags flowChapters(기본 꺼짐). 로컬·미리보기 주소에서는 ?mantraFlags=flowChapters 로 켠다.
   · 같은 방식의 앞선 장: reading-peak.js(내 인생의 전성기는 언제?) */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'flow-chapters-20261115-1';
  var EK = ['목', '화', '토', '금', '수'], EH = ['木', '火', '土', '金', '水'];
  var GW = ['내 힘', '표현·재능', '돈·성과', '일·책임', '배움·도움'], GT = ['비겁', '식상', '재성', '관성', '인성'];
  var IDS = { selfFlow: 'timeline_self_flow', selfGyeok: 'timeline_self_gyeok', wealth: 'timeline_wealth_flow', career: 'timeline_career_flow', love: 'timeline_love_flow' };
  var TITLES = { timeline_self_flow: '내 사주의 기운은 어떻게 흐를까?', timeline_self_gyeok: '내 사주의 뼈대, 격국과 주요 구조', timeline_wealth_flow: '돈의 기운은 어떻게 흐를까?', timeline_career_flow: '일의 기운은 어떻게 흐를까?', timeline_love_flow: '인연의 기운은 어떻게 흐를까?' };
  var TOPIC = { timeline_self_flow: 'self', timeline_self_gyeok: 'self', timeline_wealth_flow: 'wealth', timeline_career_flow: 'career', timeline_love_flow: 'love' };
  var BANNED = /반드시|무조건|성공합니다|실패합니다|망합니다|부자가 됩니다|대박|대길|대흉|운명입니다|확정|틀림없|이혼합니다|파산|사망|죽음/;

  // ───────── 공통 도구 ─────────
  // 조사는 괄호 앞 낱말을 기준으로 고른다: '돈·성과(목·木)' → '과' → '가'
  var bare = function (w) { var t = String(w).replace(/['"]+$/, ''); while (/\)\s*$/.test(t)) { var k = t.lastIndexOf('('); if (k < 0) break; t = t.slice(0, k); } return t; };
  var bat = function (w) { var t = bare(w).replace(/[^가-힣]+$/, ''), c = t.charCodeAt(t.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  var rieul = function (w) { var t = bare(w).replace(/[^가-힣]+$/, ''), c = t.charCodeAt(t.length - 1) - 0xAC00; return c >= 0 && c % 28 === 8; };
  var J = {
    은: function (w) { return w + (bat(w) ? '은' : '는'); }, 이: function (w) { return w + (bat(w) ? '이' : '가'); }, 을: function (w) { return w + (bat(w) ? '을' : '를'); },
    과: function (w) { return w + (bat(w) ? '과' : '와'); }, 로: function (w) { return w + (bat(w) && !rieul(w) ? '으로' : '로'); }, 이라: function (w) { return w + (bat(w) ? '이라' : '라'); }, 예요: function (w) { return w + (bat(w) ? '이에요' : '예요'); },
  };
  function ctx(M, ch, name) {
    var dEl = M.stemEl(ch.pillars.day.s), pct = ch.weights.pct, G = ch.weights.groups, U = ch.unified || {}, roles = U.roles || {}, roleV = U.roleV || {};
    var elOf = function (g) { return (dEl + g) % 5; };
    var help = ch.strength && typeof ch.strength.help === 'number' ? ch.strength.help : G[0] + G[4];
    var now = Date.now(), cur = M.daeunAt(ch, now), nowY = new Date(now).getFullYear();
    var flows = ch.daeun.list.map(function (x) { var f = null; try { f = M.elementFlow(ch, x, 'daeun'); } catch (e) { } return { x: x, f: f, cur: x === cur, past: x.startYear + 9 < nowY }; });
    return {
      M: M, ch: ch, dEl: dEl, pct: pct, G: G, roles: roles, roleV: roleV, help: help, cur: cur, flows: flows, nowY: nowY, female: ch.gender === 'F',
      nm: String(name || '').trim().replace(/님$/, ''), elOf: elOf,
      gl: function (g) { var e = elOf(g); return GW[g] + '(' + EK[e] + '·' + EH[e] + ')'; },          // '돈·성과(목·木)'
      gp: function (g) { return Math.round(G[g]) + '%'; },
      ep: function (g) { var e = elOf(g); return EK[e] + '·' + EH[e] + ', ' + Math.round(G[g]) + '%'; },
      glp: function (g) { var e = elOf(g); return GW[g] + '(' + EK[e] + '·' + EH[e] + ', ' + Math.round(G[g]) + '%)'; },
      role: function (g) { return roles[elOf(g)] || ''; },
      need: function (g) { return (roleV[elOf(g)] || 0) > 0; }, heavy: function (g) { return (roleV[elOf(g)] || 0) < 0; },
    };
  }
  function who(C) { return C.nm ? C.nm + '님' : '당신'; }
  function age(x) { var a = Math.floor(x.startAge); return a + '~' + (a + 10) + '세'; }   // 전성기 장(reading-peak.js)과 같은 나이 표기
  function span(x) { return x.startYear + '~' + (x.endYear || x.startYear + 9) + '년'; }
  // 대운 가운데 어떤 오행 묶음이 들어오는지(천간·지지 오행)
  function luckEls(M, x) { return [M.stemEl(x.s), M.BR_EL[x.b]]; }
  function brings(C, x, g) { return luckEls(C.M, x).indexOf(C.elOf(g)) >= 0; }
  // 아직 오지 않았거나 지금 지나는 대운(80세 미만)
  function ahead(C) { return C.flows.filter(function (r) { return !r.past && r.x.startAge < 80; }); }
  var VERDICT_PLAIN = { 순생: '기운이 잘 이어지는 시기', 통관: '막혔던 곳이 풀리는 시기', 제압: '넘치던 기운이 눌려 균형이 잡히는 시기', 보통: '큰 변화 없이 무난한 시기', 설기: '힘이 빠져나가기 쉬운 시기', 막힘: '흐름이 고이기 쉬운 시기', 극: '필요한 기운이 눌리는 시기', 엇갈림: '도움과 부담이 함께 오는 시기' };
  var ROLE_PLAIN = { 용신: '가장 필요한 기운', 희신: '필요한 기운을 돕는 기운', 한신: '크게 돕지도 막지도 않는 기운', 기신: '넘치면 부담이 되는 기운', 구신: '부담을 거드는 기운' };
  function roleName(r) { return '\'' + r + '\'(' + (ROLE_PLAIN[r] || '') + ')'; }
  var GOOD_V = { 순생: 1, 통관: 1, 제압: 1 }, BAD_V = { 설기: 1, 막힘: 1, 극: 1 };
  function curLine(C) {
    var r = C.flows.filter(function (r) { return r.cur; })[0];
    if (!r || !r.f) return '';
    return '지금 지나는 ' + C.M.gzName(r.x) + ' 대운(' + span(r.x) + ')은 오행 흐름으로 보면 ' + (VERDICT_PLAIN[r.f.verdict] || r.f.verdict) + '예요.';
  }
  // 다음에 그 묶음(g)이 들어오는 대운 하나
  function nextWith(C, g) { return ahead(C).filter(function (r) { return !r.cur && brings(C, r.x, g); })[0] || null; }
  function curWith(C, g) { return C.flows.filter(function (r) { return r.cur && brings(C, r.x, g); })[0] || null; }
  function whenLine(C, g, what, label) {
    // 같은 기운의 시기가 여러 장에 나와도 문장이 같아지지 않게, 문장마다 이 장의 주제(what)를 넣는다
    var c = curWith(C, g), n = nextWith(C, g), L = label || C.gl(g), w = String(what).replace(/[이가]$/, '').replace(/ 쪽 [^ ]+$/, '');   // '돈·성과 쪽 결과' → '돈·성과' (뒤에 ' 쪽을'을 또 붙이므로 '쪽 … 쪽' 겹침 방지)
    if (c) return '지금 대운(' + span(c.x) + ')이 바로 ' + J.을(L) + ' 실어 오는 때라, ' + what + ' 몸으로 느끼기 쉬운 시기예요.' + (n ? ' ' + w + ' 쪽에 이 기운이 다시 들어오는 때는 ' + J.예요(span(n.x) + '(' + age(n.x) + ')') + '.' : '');
    if (n) return w + ' 쪽이 한결 수월해지는 다음 시기는 ' + J.이(L) + ' 운에서 들어오는 ' + J.예요(span(n.x) + '(' + age(n.x) + ', ' + C.M.gzName(n.x) + ' 대운)') + '.';
    return J.은(w + ' 쪽을 받쳐 줄 ' + L) + ' 앞으로 이어질 대운에서 크게 들어오는 때가 드물어서, ' + w + ' 쪽은 운을 기다리기보다 생활 습관과 곁의 사람으로 채우는 편이 현실적이에요.';
  }
  // 화면의 존댓말 변환(polite-text.js)이 '모입니다'를 '모예요'로 바꾸는 일이 있어, 동사 '-이다'형은 미리 해요체로 넘긴다
  var VERB_YO = { 모입니다: '모여요', 트입니다: '트여요', 움직입니다: '움직여요', 쓰입니다: '쓰여요', 보입니다: '보여요' };
  function yo(t) { return String(t).replace(/(모|트|움직|쓰|보)입니다/g, function (m) { return VERB_YO[m] || m; }); }
  function rows(core) { return Object.keys(core).filter(function (k) { return core[k]; }).map(function (k) { return { role: k, text: core[k] }; }); }
  function chapter(id, core, vd, M, ch) {
    if (core.why) { var wp = String(core.why).split('\n\n'); wp[0] = '이 사주: ' + wp[0]; core.why = wp.join('\n\n'); }   // reading-text basisGroup 이 '이 사주: ' 줄은 숫자가 있어도 남긴다
    Object.keys(core).forEach(function (k) { if (core[k]) core[k] = yo(core[k]); });
    return {
      id: id, base: id, title: TITLES[id], kind: 'life', editorialTopicId: TOPIC[id], editorialContractId: id, aiEnabled: false, readingSupplementary: true, readingDeferred: false,
      readingProvider: 'local-engine-luck', flowChapter: true, readingCore: core, readingParagraphs: rows(core), readingVisualData: vd,
      scenes: R.ReadingFlow ? R.ReadingFlow.scenes(core, id) : [],
    };
  }
  function clean(t) { return String(t || '').replace(/\s+/g, ' ').replace(/ ([.,])/g, '$1').trim(); }
  function join(a) { return a.filter(Boolean).map(clean).join('\n\n'); }

  // ───────── 1. 종합풀이 · 오행 흐름 ─────────
  var BREAK_ADV = [
    '내 힘(비겁)이 비어 있으면 남의 기대에 맞추다 정작 내 기준을 놓치기 쉬워요. 하루에 하나는 내가 정한 일부터 끝내 보세요.',
    '표현·재능(식상)이 비어 있으면 생각은 많은데 밖으로 꺼내는 단계가 늦어요. 머릿속 계획을 짧은 글이나 작은 결과물로 먼저 꺼내 보세요.',
    '돈·성과(재성)가 비어 있으면 애쓴 만큼 결과가 손에 남지 않는 느낌이 들기 쉬워요. 끝낸 일마다 값을 매기고 정산하는 단계를 챙겨 보세요.',
    '일·책임(관성)이 비어 있으면 스스로 정한 규칙이 없을 때 시간과 돈이 흩어지기 쉬워요. 마감과 고정 일정을 먼저 정해 두세요.',
    '배움·도움(인성)이 비어 있으면 쉬고 배우며 채울 틈 없이 달리기 쉬워요. 일정표에 쉬는 칸과 배우는 칸을 먼저 넣어 두세요.',
  ];
  var GAP_DO = [
    '이번 주에 남의 부탁 하나를 정중히 미루고, 그 시간에 내가 정한 일 하나를 끝까지 해 보세요.',
    '머릿속에만 있던 생각 하나를 오늘 세 줄로 적어 누군가에게 보여 주세요.',
    '이번 달에 끝낸 일 세 가지를 적고, 각각 받은 대가(돈·평가·기회)를 옆에 적어 보세요. 빈칸이 정산할 곳이에요.',
    '다음 주 일정표에 고정 마감 두 개를 먼저 적어 넣고, 나머지 일을 그 사이에 배치해 보세요.',
    '일정표에 쉬는 칸 하나와 배우는 칸 하나를 먼저 넣고, 이번 주에 실제로 지켜 보세요.',
  ];
  // 크게 막힌 곳이 없는 사주: 가장 많이 쓰는 기운을 지나치게 쓸 때의 그늘
  var TOP_RISK = [
    '크게 막힌 곳은 없지만, 가장 많이 쓰는 기운이 내 힘(비겁)이라 내 기준만 앞세우면 도움받을 길을 스스로 닫기 쉬워요.',
    '크게 막힌 곳은 없지만, 가장 많이 쓰는 기운이 표현·재능(식상)이라 벌여 놓은 일이 많아지고 마무리가 늦어지기 쉬워요.',
    '크게 막힌 곳은 없지만, 가장 많이 쓰는 기운이 돈·성과(재성)라 결과를 쫓다 체력과 쉼을 뒤로 미루기 쉬워요.',
    '크게 막힌 곳은 없지만, 가장 많이 쓰는 기운이 일·책임(관성)이라 해야 할 일을 거절하지 못해 지치기 쉬워요.',
    '크게 막힌 곳은 없지만, 가장 많이 쓰는 기운이 배움·도움(인성)이라 준비만 길어지고 실행이 늦어지기 쉬워요.',
  ];
  var STRONG_USE = [
    '자기 기준과 버티는 힘이 강점이에요. 혼자 끌어안기보다 그 힘을 표현이나 결과물로 흘려보낼 때 가장 잘 풀려요.',
    '말하고 만들고 보여 주는 힘이 강점이에요. 꺼낸 것이 결과(돈·평가)로 이어지도록 마무리 단계를 함께 챙기면 더 커져요.',
    '현실 감각과 결과를 챙기는 힘이 강점이에요. 거둔 것을 지켜 줄 규칙과 체력을 같이 챙기면 오래 갑니다.',
    '책임을 맡고 버티는 힘이 강점이에요. 그 압박을 배움과 도움으로 받아 내면 실력과 자리로 바뀌어요.',
    '배우고 받아들이는 힘이 강점이에요. 배운 것을 미루지 말고 작게라도 써 보는 단계가 있어야 힘이 됩니다.',
  ];
  function selfFlow(M, ch, name) {
    var C = ctx(M, ch, name), nf = M.natalFlow(ch), me = who(C);
    var order = [0, 1, 2, 3, 4].slice().sort(function (a, b) { return C.G[b] - C.G[a]; }), top = order[0], low = order[4];
    var dist = '다섯 기운을 나에게 미치는 역할로 나눠 보면 ' + order.map(function (g) { return C.gl(g) + ' ' + C.gp(g); }).join(', ') + ' 순이에요.';
    var title = me + '의 다섯 기운을 한마디로 하면, ' + nf.headline + '.';
    var items = nf.items.map(function (x) { return x.plain; }).slice(0, 3);
    var luckRows = ahead(C).filter(function (r) { return r.f; });
    var goodN = luckRows.filter(function (r) { return GOOD_V[r.f.verdict]; }), badN = luckRows.filter(function (r) { return BAD_V[r.f.verdict]; });
    var lifeLine = luckRows.length ? '지금부터 앞으로 이어질 ' + luckRows.length + '개의 대운을 오행 흐름으로 보면, 기운이 잘 이어지거나 막힌 곳이 풀리는 시기가 ' + goodN.length + '번, 힘이 빠지거나 고이기 쉬운 시기가 ' + badN.length + '번이에요.' + (goodN.length ? ' 흐름이 잘 이어지는 시기는 ' + goodN.map(function (r) { return span(r.x) + '(' + age(r.x) + ')'; }).join(', ') + '이에요.' : '') : '';
    var goodChips = nf.chips.filter(function (c) { return c.good && c.plain; }), badChips = nf.chips.filter(function (c) { return !c.good && c.plain; });
    var brk = nf.items.filter(function (x) { return x.kind === 'break'; })[0], lowG = brk ? null : low;
    var missingG = [0, 1, 2, 3, 4].filter(function (g) { return C.G[g] < 5 && g !== 0; })[0];
    var fixG = missingG != null ? missingG : (brk ? null : null);
    var core = {
      title: title,
      reality: join([dist, items[0], items[1], items[2]]),
      strength: join([STRONG_USE[top], goodChips.length ? '이 사주에는 부담을 다른 힘으로 바꾸는 흐름도 함께 있어요. ' + goodChips.map(function (c) { return c.plain + '.'; }).join(' ') + ' 부담이 와도 그 힘을 돌려 쓸 길이 있다는 뜻이에요.' : (nf.verdict === '한 바퀴 순환' ? '다섯 기운이 다 있어서 한 곳이 막혀도 다른 길로 돌아갈 수 있어요.' : '')]),
      risk: join([badChips.length ? '주의할 패턴도 있어요. ' + badChips.map(function (c) { return c.plain + '.'; }).join(' ') + ' 이 패턴은 그 자체로 나쁘다는 뜻이 아니라, 그 기운이 들어오는 시기에 피로가 쌓이기 쉽다는 신호예요.' : '', missingG != null ? BREAK_ADV[missingG] : C.G[low] < 12 ? BREAK_ADV[low] : '']) || TOP_RISK[top],
      reinforce: join([lifeLine, curLine(C), fixG != null ? whenLine(C, fixG, '비어 있던 ' + GW[fixG] + ' 쪽 일이') : '']),
      practice: missingG != null ? GAP_DO[missingG] : C.G[low] < 12 ? GAP_DO[low] : '이번 주에 가장 많이 쓴 기운(' + GW[top] + ')을 하나 적고, 그 힘을 결과로 넘겨 줄 다음 단계 하나를 정해 보세요.',
      why: join(['오행 비율(월령 가중): ' + C.pct.map(function (v, e) { return EK[e] + ' ' + Math.round(v) + '%'; }).join(' · ') + '. 일간 ' + EK[C.dEl] + '(' + EH[C.dEl] + ') 기준으로 다섯 기운을 비겁·식상·재성·관성·인성으로 바꿔 읽었어요.',
        '원국 흐름 판정: ' + nf.verdict + ' — ' + nf.items.map(function (x) { return x.text; }).join(' / '),
        nf.chips.length ? '사주 패턴: ' + nf.chips.map(function (c) { return c.name + '(' + c.basis + ')'; }).join(' / ') : '',
        '대운별 오행 흐름은 만세력 운세 흐름 탭의 \'오행 흐름\' 판정과 같은 계산(elementFlow)이에요. 운세 점수와는 따로 보는 참고값이에요.']),
    };
    return chapter(IDS.selfFlow, core, { name: C.nm, flowVerdict: nf.verdict, flowTop: top }, M, ch);
  }

  // ───────── 2. 종합풀이 · 격국과 주요 구조 ─────────
  var EST_PLAIN = { firm: '조건이 뚜렷하게 갖춰져 성립해요', weak: '성립은 하지만 근거가 조금 약한 편이에요', multi: '후보가 둘 이상이라 대표 하나를 골라 읽어요', hold: '근거가 부족해 판정을 미뤄 둬요' };
  var STAB_PLAIN = { seong: '격을 받쳐 주는 기운이 함께 있어 비교적 안정적이에요', rescued: '흔드는 요인이 있지만 막아 주는 기운도 있어 버티는 구조예요', plain: '격을 특별히 돕거나 흔드는 기운이 뚜렷하지 않은 무난한 구조예요', pa: '흔드는 요인을 막아 줄 기운이 원국에 약해 흔들리기 쉬운 편이에요', hold: '안정성은 판단을 미뤄 둬요' };
  var PRACTICE_STAB = {
    seong: '격의 장점이 이미 받쳐지고 있으니, 그 장점이 잘 쓰이는 환경(사람·조직·일의 방식)을 하나 골라 오래 머물러 보세요.',
    rescued: '흔드는 요인이 올라오는 장면(말다툼·과로·지출 등)을 하나 정해 두고, 그때 나를 받쳐 주는 습관(배움·휴식·도움 요청)을 바로 꺼내 쓰세요.',
    plain: '격의 장점이 운에서 도움을 받을 때 더 또렷해져요. 지금 할 수 있는 작은 일로 그 장점을 먼저 써 보세요.',
    pa: '격을 흔드는 상황이 반복되는지 한 달만 기록해 보세요. 패턴이 보이면 그 상황 앞에 쉬는 시간이나 확인 단계를 하나 넣으면 충분해요.',
    hold: '격국 이름보다 위의 오행 흐름과 강약을 먼저 기준으로 삼으세요. 반복되는 내 행동 패턴 하나를 적어 보는 것이 더 정확한 단서가 돼요.',
  };
  function selfGyeok(M, ch, name) {
    var GS = root.MantraGyeokStructure; if (!GS) return null;
    var C = ctx(M, ch, name), g = GS.analyze(M, ch), rep = g.rep, j = g.jeong, sum = g.summary, me = who(C), nf = M.natalFlow(ch);
    var title = rep.type === 'special' ? me + ' 사주의 뼈대는 \'' + rep.name + '\'' + (bat(rep.name) ? '이에요' : '예요') + '. 기운이 한쪽으로 크게 모여 그 흐름을 따르는 구조로 읽어요.'
      : rep.type === 'hold' ? me + ' 사주는 격국을 하나로 정하기 어려운 구조예요. 억지로 이름을 붙이기보다 판정을 미뤄 두고 흐름으로 읽어요.'
        : me + ' 사주의 뼈대는 \'' + rep.name + '\'' + (bat(rep.name) ? '이에요' : '예요') + '. ' + rep.easy.replace(/구조입니다\.$/, '구조예요.');
    var est = rep.type === 'jeong' ? '태어난 달의 기운(월령)에서 ' + J.이(j.name) + ' 잡히고, ' + (EST_PLAIN[rep.establish] || '') + '. 그 위에서 ' + (STAB_PLAIN[rep.stability] || '') + '.' : rep.type === 'special' ? rep.relation : (j.reasons[0] || '');
    var majors = g.major.map(function (o) { return o.name + ' — ' + o.txt.easy + ' ' + o.txt.act; });
    var said = g.major.map(function (o) { return o.name; }).concat([rep.name]);
    var pat = nf.chips.filter(function (c) { return c.plain && said.indexOf(c.name) < 0 && !sum.body.some(function (t) { return t.indexOf(c.name) >= 0; }); });
    var core = {
      title: title,
      reality: join([est, rep.txt && rep.txt.act ? rep.txt.act : '', sum.body.slice(1).join(' ')]),
      strength: join(sum.good.map(function (t) { return t; })),
      risk: join(sum.care.concat(['격국은 사주의 짜임새를 읽는 한 가지 틀이에요. 이것만으로 직업·재물·성격이나 인생의 좋고 나쁨을 정하지 않아요.'])),
      reinforce: join([majors.length ? '이 사주에서 실제로 성립한 주요 구조는 ' + g.major.length + '가지예요.' : '격국 말고 따로 성립한 큰 구조는 뚜렷하지 않아요. 그래서 위의 격국 하나를 기준으로 읽으면 충분해요.']
        .concat(majors).concat(pat.length ? ['그 밖에 원국에서 보이는 패턴: ' + pat.map(function (c) { return c.name + '(' + c.plain + ')'; }).join(', ') + '.'] : [])),
      practice: PRACTICE_STAB[rep.type === 'special' ? 'seong' : rep.type === 'hold' ? 'hold' : (rep.stability || 'plain')] || PRACTICE_STAB.plain,
      why: join(['대표 격국 ' + rep.name + (rep.establishLabel ? '(' + rep.establishLabel + (rep.stabilityLabel ? ' · ' + rep.stabilityLabel : '') + ')' : '') + ' · 나를 돕는 힘 ' + Math.round(C.help) + '% — ' + (rep.why || []).join(' / '), rep.type === 'special' ? '특수격 우선: ' + rep.relation : '', g.special.possible ? g.special.possible.name + '은 조건이 다 갖춰지지 않아(' + g.special.possible.statusLabel + ') 특수격으로 정하지 않았어요.' : '',
        g.major.length ? '주요 구조 성립 근거: ' + g.major.map(function (o) { return o.name + ' [' + o.why.filter(function (w) { return /^충족/.test(w); }).join(', ') + ']'; }).join(' / ') : '', (g.caveats || []).join(' '), g.disclaimer]),
    };
    return chapter(IDS.selfGyeok, core, { name: C.nm, gyeok: rep.name, gyeokType: rep.type, gyeokMajor: g.major.map(function (o) { return o.name; }) }, M, ch);
  }

  // ───────── 3. 재물운 심화 · 돈의 기운 흐름 ─────────
  function wealthFlow(M, ch, name) {
    var C = ctx(M, ch, name), me = who(C), s = C.G[1], w = C.G[2], o = C.G[3], b = C.G[0], weak = C.help < 40, on = function (v) { return v >= 8; };
    var chain, title;
    if (on(s) && on(w)) { chain = '재능과 손으로 만든 것(' + C.ep(1) + ')이 돈·성과(' + C.ep(2) + ')로 이어지는 길이 원국에 있어요. 명리에서는 이것을 식상생재(食傷生財)라고 불러요. 만든 것이 결과로 바뀌는 길이 이미 나 있다는 뜻이에요.'; title = me + '은 만든 것이 돈으로 이어지는 길을 타고났어요.'; }
    else if (on(s) && !on(w)) { chain = '재능·표현(' + C.ep(1) + ')은 있는데, 그것을 돈·성과로 받아 줄 기운(' + C.ep(2) + ')이 약해요. 일은 잘하는데 값을 받는 단계에서 손해를 보기 쉬운 구조예요.'; title = me + '은 재주는 있는데, 그 재주에 값을 매기는 단계가 숙제예요.'; }
    else if (!on(s) && on(w)) { chain = '돈·성과(' + C.ep(2) + ')는 원국에 보이는데, 그것을 만들어 내는 재능·표현(' + C.ep(1) + ')이 약해요. 기회는 눈에 보이지만 내 손으로 꾸준히 만들어 내는 통로가 얇은 편이에요.'; title = me + '은 돈이 보이는 눈은 있는데, 그 돈을 만드는 통로를 넓히는 게 숙제예요.'; }
    else { chain = '재능·표현(' + C.ep(1) + ')과 돈·성과(' + C.ep(2) + ')가 모두 옅어요. 돈을 버는 방식이 재능을 파는 쪽보다 자리·자격·사람(다른 기운)을 거쳐 들어오는 구조로 읽어요.'; title = me + '의 돈은 재능보다 자리와 사람을 거쳐 들어오는 구조예요.'; }
    var keep = on(w) ? (on(o) ? '들어온 돈은 일·책임(' + C.ep(3) + ')이 울타리처럼 지켜 줘요. 돈이 신용·직함·자리로 이어지는 재생관(財生官) 흐름이 있어, 규칙을 정해 둘수록 돈이 덜 새요.' : '들어온 돈을 지켜 줄 울타리(' + C.ep(3) + ')가 약해서, 체계 없이 두면 돈과 시간이 새기 쉬워요.') : '';
    var compete = on(w) && b >= 30 ? '나와 같은 힘(' + C.ep(0) + ')이 세서 돈을 두고 나누거나 겨룰 일이 생기기 쉬워요(군겁쟁재·群劫爭財). 동업·공동 투자·돈 빌려주기는 문서와 몫을 먼저 정해 두세요.' : '';
    var heavy = w >= 35 && weak ? '돈·성과 기운은 큰데 그것을 감당할 내 힘(돕는 힘 ' + Math.round(C.help) + '%)이 약한 편이에요(재다신약·財多身弱). 큰돈을 쫓기보다 감당할 수 있는 크기부터 잡는 쪽이 오래 가요.' : '';
    var role = C.role(2), roleLine = role ? '이 사주에서 돈·성과 기운은 ' + roleName(role) + '이에요. ' + (C.need(2) ? '그래서 돈 쪽 일이 들어올 때 오히려 사주 전체의 균형이 맞춰져요.' : C.heavy(2) ? '그래서 돈을 더 벌 때일수록 체력과 일정 관리가 먼저예요.' : '그래서 많고 적음보다 쓰는 방식이 결과를 가르기 쉬워요.') : '';
    var core = {
      title: title,
      reality: join([chain, keep]),
      strength: join([on(s) && on(w) ? '만든 것을 바로 돈으로 바꾸는 감각이 장점이에요. 작업물·상품·서비스처럼 손에 잡히는 결과를 낼수록 흐름이 살아나요.' : on(s) ? '남들이 돈 주고 배울 만한 재주가 있다는 것 자체가 장점이에요. 값을 매기는 연습만 더하면 흐름이 이어져요.' : on(w) ? '돈이 어디에 있는지 보는 현실 감각이 장점이에요. 그 감각에 꾸준히 만드는 습관을 붙이면 돈의 통로가 넓어져요.' : '돈이 자리·자격·사람을 거쳐 들어오니, 신뢰를 쌓는 일이 곧 재물의 기반이 돼요.', roleLine]),
      risk: join([compete, heavy, !on(o) && on(w) ? '고정 지출과 저축 규칙이 없으면 번 만큼 새기 쉬워요.' : '', !on(w) && on(s) ? '\'좋은 일 했다\'로 끝나고 정산·청구를 미루는 습관이 가장 큰 손실이에요.' : '']) || '돈 흐름을 크게 막는 구조는 뚜렷하지 않아요. 다만 운에서 부담이 오는 시기에는 지출 규칙을 먼저 점검하세요.',
      reinforce: join([whenLine(C, 2, '돈·성과 쪽 결과가'), !on(1) ? whenLine(C, 1, '내 재주를 꺼내 돈으로 바꾸는 일이') : '']),
      practice: on(s) && !on(w) ? '최근에 공짜로 해 준 일 하나를 떠올리고, 다음에 같은 부탁을 받으면 제시할 값을 미리 적어 두세요.' : !on(s) && on(w) ? '돈이 되는 일 하나를 골라, 매주 같은 요일에 조금씩 만들어 내는 작은 루틴을 정해 보세요.' : on(w) && !on(o) ? '이번 달 고정 지출을 적고, 월급날 바로 빠져나가는 저축 칸 하나를 만들어 두세요.' : '지난달 들어온 돈이 어디서 왔는지(재능·자리·사람) 세 칸으로 나눠 적어 보세요. 가장 큰 칸이 내 돈의 통로예요.',
      why: join(['십성 묶음 비율: ' + [0, 1, 2, 3, 4].map(function (g) { return GT[g] + ' ' + C.gp(g); }).join(' · ') + ', 나를 돕는 힘 ' + Math.round(C.help) + '%.', '돈의 흐름은 식상(재능) → 재성(돈) → 관성(지키는 울타리)의 생(生) 사슬과, 비겁이 재성을 누르는 극(剋) 관계로 읽었어요. 8% 이상을 \'있음\'으로 봤어요.', '대운 시기는 그 대운의 천간·지지 오행에 재성 오행(' + EK[C.elOf(2)] + ')이 들어오는지로 골랐어요. 운세 점수와는 따로 보는 참고값이에요.']),
    };
    return chapter(IDS.wealth, core, { name: C.nm }, M, ch);
  }

  // ───────── 4. 커리어운 심화 · 일의 기운 흐름 ─────────
  function careerFlow(M, ch, name) {
    var C = ctx(M, ch, name), me = who(C), s = C.G[1], w = C.G[2], o = C.G[3], i = C.G[4], b = C.G[0], on = function (v) { return v >= 8; }, pats = (root.MantraTenGodRoles && root.MantraTenGodRoles.agreePatterns ? root.MantraTenGodRoles.agreePatterns(root.Manse, ch) : (ch.patterns && ch.patterns.list || [])).map(function (x) { return x.name; });   /* 십성 작용 판정과 맞춤 */
    var type, title, scene;
    if (on(o) && on(i)) { type = 'org'; title = me + '은 맡은 책임이 배움을 거쳐 실력이 되는 흐름이에요.'; scene = '일·책임(' + C.ep(3) + ')이 배움·도움(' + C.ep(4) + ')을 거쳐 나에게 들어오는 관인상생(官印相生) 흐름이 있어요. 조직·제도·자격처럼 틀이 있는 곳에서 책임을 맡을수록 그 경험이 실력과 경력으로 쌓이기 쉬워요.'; }
    else if (on(s) && on(w) && s + w >= o + i) { type = 'make'; title = me + '은 내 손으로 만든 것이 일의 결과가 되는 흐름이에요.'; scene = '재능·표현(' + C.ep(1) + ')이 돈·성과(' + C.ep(2) + ')로 이어지는 흐름이 일의 중심이에요. 정해진 자리보다 내가 만든 결과물로 평가받는 방식(전문직·프리랜서·사업·성과제)에서 힘이 잘 붙어요.'; }
    else if (on(o) && !on(i)) { type = 'press'; title = me + '은 책임을 맡는 힘은 큰데, 그 압박을 받아 줄 쿠션이 숙제예요.'; scene = '일·책임(' + C.ep(3) + ')은 큰데 그 압박을 실력으로 바꿔 줄 배움·도움(' + C.ep(4) + ')이 옅어요. 맡은 일을 해내는 힘은 있지만 혼자 버티다 지치기 쉬운 구조예요.'; }
    else if (on(s) && !on(o)) { type = 'free'; title = me + '은 틀 안보다 내 방식으로 일할 때 살아나는 흐름이에요.'; scene = '재능·표현(' + C.ep(1) + ')은 뚜렷한데 일·책임(' + C.ep(3) + ')이 옅어요. 남이 정한 틀보다 내가 방식을 정할 수 있는 일에서 집중력이 잘 나와요.'; }
    else if (b >= 30) { type = 'self'; title = me + '은 남의 지시보다 내 판단으로 움직일 때 힘이 나는 흐름이에요.'; scene = '나와 같은 힘(' + C.ep(0) + ')이 커서 독립심과 자기 기준이 뚜렷해요. 혼자 맡거나 팀을 이끄는 자리에서 힘이 잘 모이고, 이 힘을 표현·재능 쪽으로 흘려보낼 때 결과가 나와요.'; }
    else { type = 'learn'; title = me + '은 배우고 쌓은 것이 일의 밑천이 되는 흐름이에요.'; scene = '배움·도움(' + C.ep(4) + ')과 다른 기운이 고르게 섞여 있어, 한 방향으로 치우치기보다 배우고 익힌 것을 바탕으로 일을 넓혀 가는 구조예요.'; }
    var sub = [];
    if (pats.indexOf('식신제살') >= 0) sub.push('재능과 손재주(식신)로 압박(편관)을 다스리는 식신제살(食神制殺) 흐름도 있어요. 어려운 일일수록 기술과 해결책으로 풀어내는 힘이에요.');
    if (pats.indexOf('상관견관') >= 0) sub.push('하고 싶은 말(상관)이 규칙·윗사람(정관)과 부딪치기 쉬운 상관견관(傷官見官) 구조가 있어요. 생각은 옳아도 전달 방식 때문에 평가가 갈릴 수 있어요.');
    if (pats.indexOf('관살혼잡') >= 0) sub.push('책임과 압박이 여러 갈래로 섞여 들어오는 관살혼잡(官殺混雜) 구조라, 맡은 일이 겹치거나 상사가 둘인 듯한 상황에서 지치기 쉬워요.');
    var role = C.role(3), roleLine = role ? '이 사주에서 일·책임 기운은 ' + roleName(role) + '이에요. ' + (C.need(3) ? '그래서 책임을 맡을 때 오히려 중심이 잡혀요.' : C.heavy(3) ? '그래서 맡는 일의 양을 스스로 정하는 게 중요해요.' : '그래서 양보다 맡는 방식이 결과를 가르기 쉬워요.') : '';
    var STR = { org: '규칙과 신뢰를 쌓아 자리를 지키는 힘이 장점이에요. 시험·자격·승진처럼 단계가 분명한 길에서 꾸준함이 빛나요.', make: '결과물로 나를 증명하는 힘이 장점이에요. 포트폴리오와 실적이 곧 이력서가 돼요.', press: '부담이 큰 자리에서도 끝까지 맡는 책임감이 장점이에요.', free: '내 방식으로 문제를 푸는 창의성과 표현력이 장점이에요.', self: '스스로 판단하고 밀고 가는 추진력이 장점이에요.', learn: '배운 것을 차곡차곡 쌓아 전문성으로 만드는 힘이 장점이에요.' };
    var RISK = { org: '틀이 없는 곳에서는 방향을 잃기 쉬워요. 이직·독립을 할 때도 새 기준을 먼저 세우세요.', make: '결과가 안 보이는 준비 기간을 견디기 힘들어해요. 중간 결과를 자주 꺼내 보이세요.', press: '배움과 휴식 없이 버티면 같은 일을 해도 피로가 두 배로 쌓여요.', free: '규칙이 촘촘한 조직에서는 답답함이 반발로 번지기 쉬워요.', self: '혼자 다 하려다 동료와 경쟁 구도가 되기 쉬워요.', learn: '배우기만 하고 써 보지 않으면 준비 기간이 길어져요.' };
    var PR = { org: '지금 하는 일에서 다음 단계(자격·직급·평가 기준)를 하나 적고, 거기까지 필요한 것 세 가지를 정리해 보세요.', make: '최근 3개월 동안 만든 결과물 하나를 골라, 남에게 보여 줄 수 있는 한 장짜리로 정리해 보세요.', press: '이번 주 맡은 일 가운데 배우거나 도움을 청하면 빨라질 일 하나를 골라 실제로 물어보세요.', free: '내가 방식을 정할 수 있는 일 하나를 골라, 이번 주에 처음부터 끝까지 내 방식대로 해 보세요.', self: '혼자 하던 일 하나를 골라 함께할 사람에게 역할을 나눠 보세요.', learn: '최근 배운 것 하나를 이번 주 업무에 직접 써 보고, 무엇이 빨라졌는지 적어 두세요.' };
    var core = {
      title: title, reality: join([scene].concat(sub)),
      strength: join([STR[type], roleLine]), risk: join([RISK[type]]),
      reinforce: join([whenLine(C, 3, '책임·자리·평가 쪽 변화가'), type !== 'org' ? whenLine(C, 4, '배움과 자격, 도와주는 사람이') : whenLine(C, 1, '내 기술과 표현을 밖으로 꺼내는 일이')]),
      practice: PR[type],
      why: join(['십성 묶음 비율: ' + [0, 1, 2, 3, 4].map(function (g) { return GT[g] + ' ' + C.gp(g); }).join(' · ') + '.', '일의 흐름은 관성(책임) → 인성(배움) → 나(관인상생), 식상(재능) → 재성(성과), 비겁(독립)의 크기로 나눠 읽었어요. 8% 이상을 \'있음\'으로 봤어요.', pats.length ? '원국 패턴: ' + pats.join(' · ') : '', '대운 시기는 그 대운의 천간·지지 오행에 관성(' + EK[C.elOf(3)] + ')·인성(' + EK[C.elOf(4)] + ')·식상(' + EK[C.elOf(1)] + ') 오행이 들어오는지로 골랐어요. 직업을 정해 주는 판정이 아니에요.']),
    };
    return chapter(IDS.career, core, { name: C.nm, careerType: type }, M, ch);
  }

  // ───────── 5. 인연운 심화 · 인연의 기운 흐름 ─────────
  function loveFlow(M, ch, name) {
    var C = ctx(M, ch, name), me = who(C), F = C.female, sg = F ? 3 : 2, on = function (v) { return v >= 8; }, sp = C.G[sg], b = C.G[0], s = C.G[1], i = C.G[4];
    var star = F ? '일·책임(관성)' : '돈·성과(재성)', starEl = C.elOf(sg), starName = '배우자 기운(' + EK[starEl] + '·' + EH[starEl] + ', ' + C.gp(sg) + ')';
    var dayB = ch.pillars.day.b, dayBEl = M.BR_EL[dayB], rel = (dayBEl - C.dEl + 5) % 5;
    var seat = '배우자 자리(일지 ' + M.BR[dayB] + ')에는 ' + GW[rel] + '(' + EK[dayBEl] + ') 기운이 앉아 있어요. ' + ['나와 같은 기운이라 친구 같은 편안함이 있지만, 서로 고집이 부딪치기도 쉬운 자리예요.', '내가 마음을 주고 챙겨 주는 쪽으로 기울기 쉬운 자리예요.', '관계에서 현실적인 생활(돈·살림)을 함께 꾸리는 감각이 중요해지는 자리예요.', '상대에게서 기준과 책임감을 느끼거나, 관계 안에서 긴장이 생기기 쉬운 자리예요.', '상대에게서 보살핌과 안정감을 받기 쉬운 자리예요.'][rel];
    var flow, title;
    if (!F) {
      if (on(s) && on(sp)) { flow = '내 마음과 표현(' + C.ep(1) + ')이 ' + J.로(starName) + ' 이어지는 흐름이 있어요. 마음을 표현할수록 관계가 자라는 구조예요.'; title = me + '의 인연은 내가 표현한 만큼 자라는 흐름이에요.'; }
      else if (on(sp)) { flow = starName + '은 원국에 보이지만, 거기까지 마음을 실어 나를 표현(' + C.ep(1) + ')이 옅어요. 좋아하는 마음이 있어도 말로 꺼내는 단계가 늦은 편이에요.'; title = me + '의 인연은 마음은 있는데, 꺼내는 단계가 숙제예요.'; }
      else { flow = starName + '이 원국에 옅어요. 인연이 없다는 뜻이 아니라, 관계가 운에서 그 기운이 들어올 때 또렷해지는 구조라는 뜻이에요.'; title = me + '의 인연은 운이 기운을 실어 올 때 또렷해지는 흐름이에요.'; }
    } else {
      if (on(sp) && on(i)) { flow = starName + '이 배움·도움(' + C.ep(4) + ')을 거쳐 나에게 들어오는 흐름이 있어요. 상대의 기대와 책임이 나를 돕는 힘으로 바뀌기 쉬운 구조예요.'; title = me + '의 인연은 상대가 나를 받쳐 주는 쪽으로 흐르기 쉬워요.'; }
      else if (on(sp)) { flow = starName + '은 뚜렷한데, 그 기운이 나를 바로 누르는 길로 들어와요. 관계에서 상대의 기준·기대를 맞추느라 내가 지치기 쉬운 구조예요.'; title = me + '의 인연은 상대에게 맞추다 지치지 않는 것이 숙제예요.'; }
      else { flow = starName + '이 원국에 옅어요. 인연이 없다는 뜻이 아니라, 관계가 운에서 그 기운이 들어올 때 또렷해지는 구조라는 뜻이에요.'; title = me + '의 인연은 운이 기운을 실어 올 때 또렷해지는 흐름이에요.'; }
    }
    var compete = on(sp) && b >= 30 ? '나와 같은 힘(' + C.ep(0) + ')이 세서 관계 안에서도 내 기준을 앞세우거나, 같은 사람을 두고 경쟁하는 듯한 상황이 생기기 쉬워요.' : '';
    var many = sp >= 35 ? star + ' 기운이 ' + C.gp(sg) + '로 많아요. 인연이 여러 갈래로 들어오거나 관계에 신경 쓸 일이 많은 편이라, 내가 감당할 수 있는 관계의 크기를 정해 두는 게 좋아요.' : '';
    var role = C.role(sg), roleLine = role ? '이 사주에서 배우자 기운은 ' + roleName(role) + '이에요. ' + (C.need(sg) ? '그래서 좋은 관계가 사주 전체의 균형을 잡아 주는 쪽으로 작용하기 쉬워요.' : C.heavy(sg) ? (on(sp) ? '그래서 관계에 내 시간과 힘을 다 쓰지 않도록 거리를 조절하는 게 중요해요.' : '원국에는 옅지만, 운에서 이 기운이 크게 들어오는 시기에는 관계에 내 시간과 힘을 다 쓰지 않도록 속도를 조절하는 게 좋아요.') : '그래서 많고 적음보다 관계를 맺는 방식이 결과를 가르기 쉬워요.') : '';
    var core = {
      title: title, reality: join([flow, seat]),
      strength: join([F ? (on(i) ? '관계에서 받는 도움을 배움과 성장으로 바꾸는 힘이 장점이에요.' : '상대의 기준을 이해하고 맞춰 주는 배려가 장점이에요.') : (on(s) ? '마음을 말과 행동으로 보여 주는 표현력이 장점이에요.' : '쉽게 마음을 주지 않는 신중함이 장점이에요. 한번 정한 관계는 오래 지켜요.'), roleLine]),
      risk: join([compete, many, F && on(sp) && !on(i) ? '맞추는 게 익숙해지면 내 생각을 말할 타이밍을 놓치기 쉬워요.' : '', !F && on(sp) && !on(s) ? '표현하지 않은 마음은 상대가 알기 어려워요. 오해가 쌓이기 전에 짧게라도 말로 꺼내 주세요.' : '']) || '관계 흐름을 크게 막는 구조는 뚜렷하지 않아요. 다만 운에서 부담이 오는 시기에는 대화의 속도를 한 번 늦춰 보세요.',
      reinforce: join([whenLine(C, sg, '새 인연이나 관계의 변화가', '배우자 기운(' + EK[starEl] + '·' + EH[starEl] + ')')]),
      practice: F ? (on(sp) && !on(i) ? '이번 주에 상대에게 맞춰 준 일 하나와 내가 원했던 것 하나를 나란히 적어 보고, 원했던 것을 한 번 말로 전해 보세요.' : '고마웠던 일 하나를 골라 상대에게 구체적으로 말해 보세요.') : (on(sp) && !on(s) ? '좋아하는 마음이나 고마움을 이번 주에 한 문장으로 직접 전해 보세요.' : '관계에서 내가 자주 하는 표현 하나를 떠올리고, 상대가 그것을 어떻게 받아들이는지 한 번 물어보세요.'),
      why: join(['배우자 기운은 전통 명리 기준으로 ' + (F ? '여성은 관성(나를 다스리는 기운)' : '남성은 재성(내가 다스리는 기운)') + '을 봤어요. 이 사주에서는 ' + EK[starEl] + '(' + EH[starEl] + ') 오행이고, 원국에서 차지하는 비율은 ' + C.gp(sg) + '예요.', '십성 묶음 비율: ' + [0, 1, 2, 3, 4].map(function (g) { return GT[g] + ' ' + C.gp(g); }).join(' · ') + '. 배우자 자리는 일지(' + M.BR[dayB] + ', 본기 오행 ' + EK[dayBEl] + ')로 봤어요.', '대운 시기는 그 대운의 천간·지지 오행에 배우자 기운 오행이 들어오는지로 골랐어요. 만남이나 결혼 시기를 정해 주는 판정이 아니에요.']),
    };
    return chapter(IDS.love, core, { name: C.nm, spouseStar: GT[sg] }, M, ch);
  }

  // ───────── 문서에 끼워 넣기 ─────────
  function buildAll(M, ch, name) {
    var out = {};
    [['selfFlow', selfFlow], ['selfGyeok', selfGyeok], ['wealth', wealthFlow], ['career', careerFlow], ['love', loveFlow]].forEach(function (p) { try { var c = p[1](M, ch, name); if (c) out[IDS[p[0]]] = c; } catch (e) { if (root.console) root.console.warn('flow-chapters', p[0], e && e.message); } });
    return out;
  }
  function idxOf(list, f) { for (var i = 0; i < list.length; i++) if (f(list[i])) return i; return -1; }
  function contract(c) { return c && (c.editorialContractId || c.id) || ''; }
  // 종합풀이: '나의 타고난 기질'(timeline_self_03 · c-char) 바로 뒤에 흐름 → 격국. 주제 장: 그 주제의 첫 장 바로 뒤
  function add(rep, sd, name, M, ch) {
    if (!rep || !rep.chapters || !M || !ch) return rep;
    if (rep.chapters.some(function (c) { return c.flowChapter; })) return rep;
    var made = buildAll(M, ch, name), list = rep.chapters.slice();
    function put(after, ids) {
      var i = idxOf(list, after); if (i < 0) return;
      var prev = list[i].id;   // 관리자 세계 순서로 다시 정렬돼도 이 장 바로 뒤에 붙도록(explore.js placeAfter)
      ids.forEach(function (id, k) { var c = made[id]; if (!c) return; c.act = list[i].act; c.placeAfter = prev; prev = c.id; list.splice(i + 1 + k, 0, c); });
    }
    put(function (c) { return contract(c) === 'timeline_self_03' || c.id === 'c-char'; }, [IDS.selfFlow, IDS.selfGyeok].filter(function (id) { return made[id]; }));
    put(function (c) { return c.editorialTopicId === 'wealth' && !c.flowChapter; }, [IDS.wealth]);
    put(function (c) { return c.editorialTopicId === 'career' && !c.flowChapter; }, [IDS.career]);
    put(function (c) { return c.editorialTopicId === 'love' && !c.flowChapter; }, [IDS.love]);
    list.forEach(function (c, j) { c.no = j + 1; });
    if (made[IDS.selfGyeok] && list.indexOf(made[IDS.selfGyeok]) >= 0) R.FlowChapters.on = true;
    return Object.assign({}, rep, { chapters: list });
  }

  // ───────── 공개 스위치 ─────────
  function localFlag() {
    try {
      var f = root.MANTRA_FLAGS; if (f && f.flowChapters === true) return true;
      var h = root.location && root.location.hostname || '';
      if (/^(localhost|127\.0\.0\.1)$/.test(h) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(h)) return /[?&]mantraFlags=[A-Za-z,]*\bflowChapters\b/.test(root.location.search || '');
    } catch (e) { }
    return false;
  }
  var readyP = null;
  function ready() {
    if (readyP) return readyP;
    if (localFlag()) return (readyP = Promise.resolve(true));
    if (!root.fetch) return (readyP = Promise.resolve(false));
    var valid = function (d) { return !!(d && typeof d === 'object' && Number.isInteger(d.version)); };
    var p = root.MantraLastGood ? root.MantraLastGood.json('/api/luck-flags', 5000, valid) : root.fetch('/api/luck-flags', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; });
    return (readyP = Promise.resolve(p).then(function (d) { return !!(d && d.flowChapters === true); }).catch(function () { return false; }));
  }

  // 화면 시작을 오래 붙잡지 않는다: ms 안에 스위치 응답이 없으면 이 기기에 저장된 마지막 값(MantraLastGood)으로 정한다
  function readyWithin(ms) {
    var saved = function () { try { var d = root.MantraLastGood && root.MantraLastGood.saved('/api/luck-flags'); return !!(d && d.flowChapters === true); } catch (e) { return false; } };
    return Promise.race([ready(), new Promise(function (ok) { setTimeout(function () { ok(saved()); }, ms || 2500); })]);
  }
  if (root.document && root.fetch) { try { ready(); } catch (e) { } }   // 스크립트를 읽자마자 스위치를 받아 둔다

  R.FlowChapters = { VERSION: VERSION, IDS: IDS, TITLES: TITLES, BANNED: BANNED, buildAll: buildAll, add: add, ready: ready, readyWithin: readyWithin, localFlag: localFlag,
    selfFlow: selfFlow, selfGyeok: selfGyeok, wealthFlow: wealthFlow, careerFlow: careerFlow, loveFlow: loveFlow };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.FlowChapters;
})(typeof window !== 'undefined' ? window : globalThis);
