/* 2026-11-09 풀이 장 구성 다양화 — 이미 순위·순서 블록만 있던 장에 모양이 다른 블록을 하나씩 더한다.
   ① 최고 vs 최악 두 갈래(시나리오 장) ② 맞는 사람 · 거리 둘 사람 카드(사람 장) ③ 개운 처방전 오늘·이번 주·이번 달(개운 장) ④ 사주가 보내는 편지(최종 사용설명서).
   값은 모두 사주(용신·기신 오행, 가장 큰·작은 십성, 신강약, 지금 대운)에서 규칙으로 고른다. 계산은 바꾸지 않는다.
   연결: reading-feature.js SPEC 의 custom:'fx:*' 조각 → R.FateBlocks.render(part, H, id). */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var EL = ['목', '화', '토', '금', '수'], EL_HJ = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
  var STEM_EL = { 갑: '목', 을: '목', 병: '화', 정: '화', 무: '토', 기: '토', 경: '금', 신: '금', 임: '수', 계: '수' };
  var STEMS_OF = { 목: '갑·을', 화: '병·정', 토: '무·기', 금: '경·신', 수: '임·계' };
  var GRP_MEAN = { 비겁: '내 힘·고집', 식상: '표현·솜씨', 재성: '돈·현실 감각', 관성: '규칙·책임감', 인성: '배움·보살핌' };
  function jo(w, a, b) { w = String(w || ''); var ch = w.replace(/[^가-힣]+$/, '').slice(-1); if (!ch) return w + a; return w + (((ch.charCodeAt(0) - 0xAC00) % 28) ? a : b); }
  var who = function (H) { return H.name ? H.name + '님' : '당신'; };

  /* ── 사주에서 읽는 공통 값 ── */
  function base(H) {
    var sd = H.sd || {}, u = sd.usefulElements || {}, roles = u.roles || {}, groupEl = sd.groupEl || {}, elGroup = {};
    Object.keys(groupEl).forEach(function (g) { elGroup[groupEl[g]] = g; });
    var pick = function (names) { for (var i = 0; i < names.length; i++) for (var j = 0; j < EL.length; j++) if (roles[EL[j]] === names[i]) return EL[j]; return null; };
    var yong = u.yong || pick(['용신']) || (sd.dayMaster && sd.dayMaster.el) || '토', hee = u.hee || pick(['희신']), gi = pick(['기신', '구신']);
    if (!gi || gi === yong) gi = EL.filter(function (e) { return e !== yong && e !== hee; }).sort(function (a, b) { return ((sd.fiveElements || {})[b] || 0) - ((sd.fiveElements || {})[a] || 0); })[0];
    var cur = sd.currentDaewoon || null, curEl = cur && STEM_EL[String(cur.ganzhi || '').charAt(0)];
    return { sd: sd, yong: yong, hee: hee, gi: gi, yongG: elGroup[yong] || '', giG: elGroup[gi] || '', top: sd.dominantGroup || '', low: sd.weakestGroup || '', band: sd.strength && sd.strength.band || '', cur: cur, curEl: curEl };
  }
  function grpTxt(g) { return g ? g + '(' + (GRP_MEAN[g] || '') + ')' : ''; }

  /* ── 오행별 생활 재료 ── */
  var ACT = { 목: '배우고 새로 시작하는 일', 화: '드러내고 알리는 일', 토: '쌓고 지키는 일', 금: '정리하고 결단하는 일', 수: '흐름을 읽고 옮겨 가는 일' };
  var SIGN = { 목: '새로 배울 거리와 사람이 생길 때', 화: '나를 알릴 자리가 열릴 때', 토: '오래 쌓아 온 것이 인정받을 때', 금: '군더더기를 정리하고 기준을 세웠을 때', 수: '자리를 옮기거나 새 정보가 들어올 때' };
  var TRAP = { 목: '벌여 놓은 일이 너무 많아 하나도 끝나지 않는', 화: '보여 주는 데 힘을 다 써 속이 비는', 토: '익숙한 것만 붙들다 기회를 놓치는', 금: '너무 날카롭게 잘라 내 사람과 기회를 함께 잃는', 수: '이리저리 흘러 다니며 한곳에 쌓이지 않는' };
  var WARN = { 목: '할 일을 자꾸 새로 벌일 때', 화: '남의 시선과 반응에 마음이 쏠릴 때', 토: '변화가 귀찮아 하던 대로만 할 때', 금: '옳고 그름만 따지며 선을 그을 때', 수: '마음이 붕 떠 이곳저곳 옮겨 다닐 때' };
  var REM = {
    목: { color: '초록·청록', dir: '동쪽', time: '아침', place: '숲길·서점·식물이 있는 카페', small: '아침 10분 새 글 한 편 읽기', week: '배우고 싶던 것 하나 등록하기', month: '한 달 동안 매일 조금씩 쌓는 기록 하나 끝내기' },
    화: { color: '빨강·주황', dir: '남쪽', time: '한낮', place: '햇볕 드는 창가·공연장·사람 많은 거리', small: '오늘 한 사람에게 먼저 말 걸기', week: '내가 한 일을 한 번 밖에 보여 주기', month: '한 달에 한 번 사람 앞에 서는 자리 만들기' },
    토: { color: '노랑·베이지', dir: '집 가운데', time: '오후', place: '집·텃밭·오래 다닌 단골집', small: '책상 위 한 칸 정리하기', week: '고정 지출 하나 줄이고 그만큼 따로 모으기', month: '한 달 생활 리듬(잠·식사·지출)을 같은 시간에 맞추기' },
    금: { color: '흰색·은색', dir: '서쪽', time: '저녁', place: '정돈된 공간·운동장·금속 소리가 나는 작업실', small: '안 쓰는 물건 하나 버리기', week: '미뤄 둔 결정 하나를 기한 정해 끝내기', month: '몸을 쓰는 운동 하나를 한 달 동안 기록하기' },
    수: { color: '검정·남색', dir: '북쪽', time: '밤', place: '물가·도서관·조용한 밤 산책길', small: '잠들기 전 10분 오늘을 적어 보기', week: '가 보지 않은 동네 한 곳 걸어 보기', month: '한 달 동안 정보 하나를 깊이 파서 정리하기' }
  };

  /* ① 최고 vs 최악 */
  var SCN = {
    wealth: { best: '돈이 모이는 그림', worst: '돈이 새는 그림', bestDo: function (b) { return ACT[b.yong] + '에서 수입이 붙어요. ' + (b.yongG ? grpTxt(b.yongG) + ' 쪽 기운을 쓸 때 돈이 남아요.' : ''); }, worstDo: function (b) { return TRAP[b.gi] + ' 쪽으로 돈이 흘러가요. ' + (b.giG ? grpTxt(b.giG) + ' 쪽 결정을 서두를 때 손해가 커져요.' : ''); } },
    career: { best: '일이 풀리는 그림', worst: '일이 막히는 그림', bestDo: function (b) { return jo(ACT[b.yong], '을', '를') + ' 맡을 때 실력이 드러나요. ' + (b.yongG ? grpTxt(b.yongG) + ' 쪽 역할에서 평가가 올라가요.' : ''); }, worstDo: function (b) { return TRAP[b.gi] + ' 방식으로 일하면 성과가 흩어져요. ' + (b.giG ? grpTxt(b.giG) + ' 쪽 압박이 겹칠 때 지치기 쉬워요.' : ''); } },
    self: { best: '내가 가장 빛나는 그림', worst: '내가 가장 무너지는 그림', bestDo: function (b) { return jo(ACT[b.yong], '을', '를') + ' 할 때 표정부터 달라져요. ' + (b.yongG ? grpTxt(b.yongG) + ' 쪽 힘을 쓸 때 내 장점이 가장 잘 보여요.' : ''); }, worstDo: function (b) { return TRAP[b.gi] + ' 모습이 반복될 때 스스로 지쳐 가요. ' + (b.giG ? grpTxt(b.giG) + ' 쪽 압박이 겹치면 날카로워져요.' : ''); } },
    love: { best: '관계가 깊어지는 그림', worst: '관계가 식는 그림', bestDo: function (b) { return jo(ACT[b.yong], '을', '를') + ' 함께할 때 마음이 가까워져요. ' + (b.yongG ? grpTxt(b.yongG) + ' 쪽 기운을 나눌 때 관계가 단단해져요.' : ''); }, worstDo: function (b) { return TRAP[b.gi] + ' 모습이 관계에서도 드러나요. ' + (b.giG ? grpTxt(b.giG) + ' 쪽 다툼이 반복되면 거리가 생겨요.' : ''); } }
  };
  function scenario(H, part) {
    var b = base(H), t = SCN[part.topic] || SCN.wealth, cur = b.cur, curTxt = cur ? cur.ganzhi + ' 대운(' + cur.startYear + '~' + cur.endYear + '년)' : '지금 대운';
    var curSide = b.curEl === b.yong || b.curEl === b.hee ? 'best' : b.curEl === b.gi ? 'worst' : '';
    var col = function (kind) {
      var good = kind === 'best', el = good ? b.yong : b.gi;
      return '<div class="fx-side fx-' + kind + (curSide === kind ? ' is-now' : '') + '"><p class="fx-sk">' + (good ? '最上 · 최고' : '最下 · 최악') + '</p><h4>' + esc(good ? t.best : t.worst) + '</h4>' +
        '<dl><div><dt>갈림길</dt><dd>' + esc(good ? SIGN[el] : WARN[el]) + '</dd></div><div><dt>장면</dt><dd>' + esc(good ? t.bestDo(b) : t.worstDo(b)) + '</dd></div><div><dt>명리 근거</dt><dd>' + esc((good ? '나를 채워 주는 기운(용신)' : '부딪히기 쉬운 기운(기신)') + ' · ' + el + '(' + EL_HJ[el] + ')') + '</dd></div></dl>' +
        (curSide === kind ? '<p class="fx-now">지금 ' + esc(curTxt) + '은 이쪽 기운이 들어와 있어요.</p>' : '') + '</div>';
    };
    return '<section class="dp-embed dp fx"><p class="fx-kick">命簿 · 두 갈래 길</p><h3 class="fx-title">같은 사주, 두 갈래 결말</h3><p class="fx-lead">' + esc(who(H) + '의 사주에서 결말을 가르는 건 ' + b.yong + '(' + EL_HJ[b.yong] + ') 기운을 쓰느냐, ' + b.gi + '(' + EL_HJ[b.gi] + ') 기운에 끌려가느냐예요.') + '</p><div class="fx-two">' + col('best') + col('worst') + '</div></section>';
  }

  /* ② 맞는 사람 · 거리 둘 사람 */
  var PPL_EL = { 목: '새 일을 벌이고 가르쳐 주기 좋아하는', 화: '밝고 말이 빠르며 분위기를 띄우는', 토: '말수가 적고 약속을 지키는 듬직한', 금: '기준이 분명하고 맺고 끊는 게 확실한', 수: '눈치가 빠르고 정보에 밝은' };
  var WITH = {
    wealth: { good: '돈 이야기를 숫자로 차분하게 나눌 수 있어요.', bad: '큰돈이 걸린 결정을 함께 하면 계산이 엇갈리기 쉬워요.', tip: '동업·보증·투자 권유는 서류와 기한을 먼저 정하세요.' },
    career: { good: '같이 일하면 내가 약한 부분을 자연스럽게 채워 줘요.', bad: '한 팀이 되면 일하는 속도와 방식이 자주 부딪혀요.', tip: '역할과 책임을 처음부터 글로 나눠 두세요.' },
    love: { good: '곁에 있으면 마음이 편해지고 내 모습이 덜 날카로워져요.', bad: '처음엔 끌려도 오래 갈수록 서로 지치기 쉬워요.', tip: '서운한 일은 쌓아 두지 말고 그날 짧게 말하세요.' }
  };
  function people(H, part) {
    var b = base(H), w = WITH[part.topic] || WITH.wealth;
    var card = function (good) {
      var el = good ? b.yong : b.gi;
      return '<div class="fx-person fx-' + (good ? 'best' : 'worst') + '"><p class="fx-sk">' + (good ? '貴人 · 곁에 둘 사람' : '警 · 거리 둘 사람') + '</p><h4>' + esc(PPL_EL[el] + ' 사람') + '</h4>' +
        '<dl><div><dt>사주로 보면</dt><dd>' + esc(el + '(' + EL_HJ[el] + ') 기운이 강한 사람 · 일간이 ' + STEMS_OF[el] + '인 사람') + '</dd></div><div><dt>함께하면</dt><dd>' + esc(good ? w.good : w.bad) + '</dd></div><div><dt>왜 그런가</dt><dd>' + esc(good ? '내 사주가 가장 필요로 하는 기운(용신)이라, 그 사람이 곁에 있으면 균형이 맞아요.' : '내 사주에 이미 많거나 부딪히는 기운(기신)이라, 함께 있으면 한쪽으로 더 기울어요.') + '</dd></div>' + (good ? '' : '<div><dt>거리 두는 법</dt><dd>' + esc(w.tip) + '</dd></div>') + '</dl></div>';
    };
    return '<section class="dp-embed dp fx"><p class="fx-kick">命簿 · 인연 대장</p><h3 class="fx-title">곁에 둘 사람과 거리 둘 사람</h3><p class="fx-lead">' + esc('사람의 좋고 나쁨이 아니라, ' + who(H) + '의 사주와 기운이 맞물리는 방식이에요.') + '</p><div class="fx-two">' + card(true) + card(false) + '</div></section>';
  }

  /* ③ 개운 처방전 */
  var RX_TOPIC = { wealth: '재물운 처방전', career: '커리어운 처방전', love: '인연운 처방전', self: '개운 처방전' };
  function prescription(H, part) {
    var b = base(H), r = REM[b.yong] || REM.토, h = b.hee && REM[b.hee], topic = RX_TOPIC[part.topic] || '개운 처방전';
    var cells = [['今日 · 오늘', r.small], ['今週 · 이번 주', r.week], ['今月 · 이번 달', r.month]];
    return '<section class="dp-embed dp fx"><p class="fx-kick">命簿 · 처방전</p><h3 class="fx-title">' + esc(topic) + '</h3><div class="fx-rx"><div class="fx-rx-h"><span>처방 받는 사람</span><b>' + esc(who(H)) + '</b><span>처방 근거</span><b>' + esc('나를 채워 주는 기운 ' + b.yong + '(' + EL_HJ[b.yong] + ')' + (b.hee ? ' · 돕는 기운 ' + b.hee + '(' + EL_HJ[b.hee] + ')' : '')) + '</b></div>' +
      '<ol class="fx-steps">' + cells.map(function (c) { return '<li><small>' + esc(c[0]) + '</small><p>' + esc(c[1]) + '</p></li>'; }).join('') + '</ol>' +
      '<dl class="fx-rx-m"><div><dt>곁에 둘 색</dt><dd>' + esc(r.color) + '</dd></div><div><dt>좋은 방향</dt><dd>' + esc(r.dir) + '</dd></div><div><dt>좋은 때</dt><dd>' + esc(r.time) + '</dd></div><div><dt>기운이 차는 곳</dt><dd>' + esc(r.place) + '</dd></div></dl>' +
      '<p class="fx-rx-f">' + esc(b.gi + '(' + EL_HJ[b.gi] + ') 기운이 강해지는 ' + (REM[b.gi] ? REM[b.gi].time : '') + '에는 큰 결정을 미루세요.') + '</p><span class="fx-stamp" aria-hidden="true">處方</span></div></section>';
  }

  /* ④ 미래의 내가 보내는 편지 — 사주 값(가장 큰 십성군·약한 십성군·용신·지금 대운)을 미래의 내가 돌아보며 말해 주는 형식 */
  var ENGINE = { 비겁: '버티는 힘', 식상: '표현하는 힘', 재성: '현실을 다루는 힘', 관성: '책임을 지는 힘', 인성: '배우고 품는 힘' };
  var BRAKE = { 비겁: '네 편을 믿고 기대는 일', 식상: '하고 싶은 말을 밖으로 꺼내는 일', 재성: '내 몫을 챙기고 계산하는 일', 관성: '스스로 정한 규칙을 지키는 일', 인성: '쉬면서 채우는 일' };
  function letter(H) {
    var b = base(H), r = REM[b.yong] || REM.토, cur = b.cur, sh = H.sd && H.sd.daewoonShift, name = H.name ? H.name : '나';
    var paras = [
      '너는 ' + jo(ENGINE[b.top] || '너만의 힘', '을', '를') + ' 가장 크게 가지고 태어났어. 힘들 때 결국 너를 일으켜 세운 것도 그 힘이었지.',
      b.low ? '그런데 ' + jo(BRAKE[b.low] || '쉬는 일', '은', '는') + ' 늘 서툴렀어. 그건 약점이 아니라 아직 덜 써 본 근육이야. 조금씩 쓰면 돼.' : '',
      '너를 돕는 기운은 ' + b.yong + '(' + EL_HJ[b.yong] + ')' + (jo(b.yong, '이', '') === b.yong + '이' ? '이야. ' : '야. ') + r.time + '에, ' + r.place.split('·')[0] + ' 같은 곳에서, ' + jo(ACT[b.yong], '을', '를') + ' 해 봐. 생각보다 빨리 숨이 트일 거야.',
      sh && sh.phase === 'ending' && sh.to ? '지금 너는 ' + cur.ganzhi + ' 대운(' + cur.startYear + '~' + cur.endYear + '년)의 끝자락에 있어. ' + Number(sh.date.slice(0, 4)) + '년 ' + Number(sh.date.slice(5, 7)) + '월부터는 ' + sh.to.ganzhi + ' 대운이 시작돼. 끝내는 10년에서 남길 것 하나, 새 10년에 시작할 것 하나만 정하자.'
        : sh && sh.phase === 'starting' && sh.from ? '지금 너는 ' + sh.from.ganzhi + ' 대운을 막 지나 ' + cur.ganzhi + ' 대운(' + cur.startYear + '~' + cur.endYear + '년)에 들어섰어. 바뀐 흐름이 몸에 붙는 데 1년쯤 걸리니 서두르지 않아도 돼. 이 10년에 남길 것 하나만 정하자.'
        : cur ? '지금 너는 ' + cur.ganzhi + ' 대운(' + cur.startYear + '~' + cur.endYear + '년)을 지나고 있어. 서두르지 않아도 돼. 이 10년이 끝날 때 남길 것 하나만 정하자.' : '',
      '나는 그 길을 먼저 지나왔어. 돌아보면 그때 정한 그 하나가 제일 고마웠어.'
    ].filter(Boolean);
    return '<section class="dp-embed dp fx"><p class="fx-kick">命簿 · 미래의 내가 보낸 편지</p><div class="fx-letter"><p class="fx-to">' + esc(name + '에게') + '</p>' + paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '<p class="fx-from">— 미래의 네가<span class="fx-stamp" aria-hidden="true">命</span></p></div></section>';
  }

  var RENDER = { 'fx:scenario': scenario, 'fx:people': people, 'fx:rx': prescription, 'fx:letter': letter };
  R.FateBlocks = {
    has: function (k) { return !!RENDER[k]; },
    render: function (part, H) { try { return H && H.sd ? RENDER[part.custom](H, part) : null; } catch (e) { return null; } },
    base: base, esc: esc, jo: jo, who: who, EL_HJ: EL_HJ, STEMS_OF: STEMS_OF, GRP_MEAN: GRP_MEAN, ACT: ACT, REM: REM, WARN: WARN, TRAP: TRAP,
    add: function (k, fn) { RENDER[k] = fn; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.FateBlocks;
})(typeof window !== 'undefined' ? window : globalThis);
