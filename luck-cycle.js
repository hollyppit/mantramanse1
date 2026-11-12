/* 오행 사이클 — 운세 흐름의 대운 30년 묶음(장기 분석 구간)과 세운 2년 묶음(천간 오행 구간). 2026-11-12
   · 표시 전용: 엔진(engine.js)이 이미 계산한 값(흐름 점수 ev.fitScore, 억부·조후 성분, 십성, 합충형해, 통합 용신 역할)만 읽는다.
     점수·가중치를 새로 만들거나 고치지 않는다(tests/luck-cycle-sim.cjs 가 점수 불변을 검사).
   · 문장은 모두 아래 사전 문구(PHRASES)를 조건으로 골라 조합한다. AI 호출 없음. 고른 문구 ID는 trace 로 남긴다.
   · 해석은 세 단계: ① 오행의 일반적인 특징 → ② 나에게 미치는 영향 → ③ 추천 행동 전략 + 판단 근거(억부·조후·십성·합충형해).
   · 월운·일진은 묶지 않는다.
   · 브라우저·Node 공용. 사용: MantraLuckCycle.daeunSpans(Manse, ch) / MantraLuckCycle.seunPair(Manse, ch, 연도)
   · 화면 스위치: MANTRA_FLAGS.luckCycle(기본 꺼짐, 관리자 화면 /api/luck-flags luckCycle) */
(function (G) {
  'use strict';
  var VERSION = 'luck-cycle-20261112-1', PHRASE_VERSION = 1;

  // ───────────── 사전 문구 ─────────────
  // ① 오행의 일반적인 특징 (scope: span = 30년, pair = 2년)
  var EL_TRAIT = [
    { name: '목(木)', word: '자라는 기운', span: '목(木)은 자라고 뻗어 나가는 기운이에요. 새로 시작하고, 배우고, 판을 넓히는 일에 힘이 실려요. 30년 단위로 오면 "무언가를 키워 온 시기"로 기억되기 쉬워요.',
      pair: '목(木)은 자라고 뻗어 나가는 기운이에요. 2년 동안 새로 시작하거나 배우거나, 계획을 세우는 일에 손이 자주 가요.' },
    { name: '화(火)', word: '드러나는 기운', span: '화(火)는 밝게 드러나고 퍼지는 기운이에요. 사람을 만나고, 알리고, 보여 주는 일에 속도가 붙어요. 30년 단위로 오면 이름이 알려지거나 활동 무대가 커진 시기로 남기 쉬워요.',
      pair: '화(火)는 밝게 드러나고 퍼지는 기운이에요. 2년 동안 사람 만날 일, 알릴 일, 보여 줄 일이 늘기 쉬워요.' },
    { name: '토(土)', word: '다지는 기운', span: '토(土)는 모으고 버티고 다지는 기운이에요. 자리를 지키고, 사이에서 조율하고, 기반(집·자산·신용)을 쌓는 일이 중심이 돼요. 30년 단위로 오면 "뿌리를 내린 시기"가 되기 쉬워요.',
      pair: '토(土)는 모으고 버티고 다지는 기운이에요. 2년 동안 새로 벌이기보다 지키고 정리하고 기반을 다지는 일이 많아져요.' },
    { name: '금(金)', word: '정리하는 기운', span: '금(金)은 자르고 정리하고 결정하는 기운이에요. 기준을 세우고, 군더더기를 덜어 내고, 결과를 매듭짓는 일이 많아져요. 30년 단위로 오면 "선택과 정리의 시기"로 남기 쉬워요.',
      pair: '금(金)은 자르고 정리하고 결정하는 기운이에요. 2년 동안 미뤄 둔 결정을 내리거나, 관계·일을 정리하는 장면이 늘기 쉬워요.' },
    { name: '수(水)', word: '모으는 기운', span: '수(水)는 스며들고 모으고 저장하는 기운이에요. 생각하고, 정보를 모으고, 조용히 준비하는 시간이 길어져요. 30년 단위로 오면 겉보다 속이 깊어진 시기로 남기 쉬워요.',
      pair: '수(水)는 스며들고 모으고 저장하는 기운이에요. 2년 동안 겉으로 크게 움직이기보다 공부·정보·준비 쪽에 시간이 쓰이기 쉬워요.' },
  ];
  // ② 나에게 미치는 영향 — 통합 용신 역할(용신·희신·한신·기신·구신)
  var ROLE_IMPACT = {
    용신: '이 사주에 가장 필요한 기운이에요. 그동안 혼자 힘으로 밀던 일이 비교적 수월하게 굴러가고, 같은 노력에도 결과가 잘 남는 편이에요.',
    희신: '필요한 기운을 옆에서 받쳐 주는 쪽이에요. 큰 한 방보다는 도와주는 사람·조건이 조금씩 쌓이는 느낌에 가까워요.',
    한신: '이 사주에는 좋지도 나쁘지도 않은 기운이에요. 결과는 운보다 내가 무엇을 고르고 얼마나 꾸준한지에 더 크게 달려요.',
    기신: '이 사주가 이미 넘치거나 버거워하는 기운이에요. 같은 일을 해도 피로가 더 쌓이고, 무리한 선택이 뒤늦게 청구서로 돌아오기 쉬워요.',
    구신: '부담스러운 기운을 거드는 쪽이에요. 사소한 일이 생각보다 커지거나, 정리가 한 박자씩 늦어지기 쉬워요.',
  };
  // 십성 묶음(일간 기준: 0 비겁 1 식상 2 재성 3 관성 4 인성) — 생활 주제
  var GRP = [
    { plain: '내 힘·사람', name: '비겁', scene: '내 주관과 독립심, 그리고 비슷한 처지의 사람들(동료·형제·경쟁자)이 이야기의 중심이 돼요.' },
    { plain: '표현·재능', name: '식상', scene: '말하고 만들고 보여 주는 일, 내 재능을 밖으로 꺼내는 일이 늘어나요.' },
    { plain: '돈·성과', name: '재성', scene: '돈을 벌고 쓰고 관리하는 일, 결과를 손에 쥐는 일이 큰 주제가 돼요.' },
    { plain: '일·책임', name: '관성', scene: '직장·직책·평가처럼 책임지고 버텨야 하는 자리가 커져요.' },
    { plain: '배움·도움', name: '인성', scene: '공부·자격·문서, 그리고 나를 챙겨 주는 사람과 쉼이 중요해져요.' },
  ];
  // ③ 추천 행동 전략 — 역할 성격(good 용·희 / mid 한신 / bad 기·구) × 십성 묶음
  var STRATEGY = {
    good: [
      '혼자 끌어안던 일을 내 이름으로 걸고 밀어붙여도 되는 때예요. 다만 같이 가는 사람에게 몫과 역할은 처음에 분명히 말해 두세요.',
      '머릿속에만 있던 것을 결과물(글·작품·서비스)로 꺼내세요. 이 시기에 꺼낸 것이 나중의 밥줄이 되기 쉬워요.',
      '돈이 들어올 길을 넓혀도 되는 때예요. 수입이 늘 때 저축 비율과 고정 지출 상한을 같이 정해 두면 늘어난 만큼 남아요.',
      '책임 있는 자리를 피하지 마세요. 직함·자격·평가처럼 공식적으로 남는 것을 챙기면 오래 쓰여요.',
      '배우고 자격을 따고, 나를 끌어 줄 사람 곁에 있으세요. 이 시기에 받은 도움은 갚는 방식까지 정해 두면 관계가 오래가요.',
    ],
    mid: [
      '운이 밀어 주지도 막지도 않으니, 내 페이스를 지키는 게 제일 남는 장사예요. 남 따라 판을 키우지 마세요.',
      '하던 일을 꾸준히 다듬는 쪽이 이득이에요. 새로 벌이는 건 한두 개만, 작게 시험해 보세요.',
      '수입은 크게 늘리기보다 새는 곳을 막는 데 집중하세요. 고정비 한 번 정리하는 것만으로도 체감이 달라요.',
      '맡은 일의 범위를 글로 정리해 두세요. 애매한 책임이 쌓이면 나중에 내 몫이 돼요.',
      '배움은 "써먹을 날짜"를 정해 두고 하세요. 준비만 길어지면 기회가 지나가요.',
    ],
    bad: [
      '내 고집이나 경쟁심이 판을 키우기 쉬워요. 돈·역할이 걸린 일은 혼자 결정하지 말고, 동업·보증은 이 시기에 피하세요.',
      '말과 행동이 앞서기 쉬워요. 하고 싶은 말은 하루 묵혀서 하고, 벌여 둔 일은 늘리기보다 줄이세요.',
      '큰돈이 걸린 결정은 한 번 더 미루세요. 투자·대출·공동 지출은 규모를 절반으로 줄여 생각하는 게 안전해요.',
      '압박과 책임이 몸으로 먼저 와요. 일을 더 맡기 전에 쉬는 시간부터 일정표에 넣고, 버거우면 일찍 말하세요.',
      '생각과 걱정이 길어지기 쉬워요. 결정은 기한을 정해 두고, 남의 말에 기대기보다 작게 직접 해 보세요.',
    ],
  };
  // 30년 흐름 모양
  var TREND = {
    rise: '처음보다 끝이 좋아지는 오르막이에요. 앞쪽 10년에 버티며 쌓은 것이 뒤로 갈수록 결과로 바뀌기 쉬워요.',
    fall: '처음이 가장 수월하고 뒤로 갈수록 무거워지는 내리막이에요. 좋은 앞쪽 10년에 기반을 만들어 두는 게 핵심이에요.',
    peak: '가운데 10년이 봉우리예요. 앞 10년은 준비, 가운데 10년은 승부, 뒤 10년은 지키기로 나눠 보세요.',
    valley: '가운데 10년이 골짜기예요. 앞 10년에 쌓은 것으로 가운데를 버티고, 뒤 10년에 다시 올라서는 흐름이에요.',
    flat: '30년 내내 큰 높낮이 없이 고르게 가는 흐름이에요. 운이 판을 흔들지 않는 만큼, 꾸준함이 그대로 결과가 돼요.',
    short: '남은 기간이 30년보다 짧은 마지막 구간이에요. 흐름의 높낮이보다 그 안의 한 대운 한 대운을 따로 보세요.',
  };
  // 합충형해 묶음
  var REL_KIND = {
    clash: { re: /(천간충|충|형|파|해|원진|귀문관)$/, name: '충·형·파·해', text: '부딪히고 흔들리는 작용이 겹쳐 이사·이직·관계 정리 같은 변화가 생기기 쉬워요.' },
    harmony: { re: /(합|반합|방합|삼합|천간합)[木火土金水]?$/, name: '합', text: '묶이고 모이는 작용이 있어 사람·조직과 엮이는 일이 늘기 쉬워요. 좋은 인연이 되기도, 발이 묶이기도 해요.' },
  };
  var POS_AREA = { 년: '바깥 환경·윗세대', 월: '일·사회생활', 일: '나와 배우자 자리', 시: '자녀·앞으로의 계획' };
  // 2년 묶음: 양 천간 해(앞해)와 음 천간 해(뒤해)
  var YINYANG = '앞해(양 천간)는 일이 바깥으로 크게 벌어지기 쉽고, 뒤해(음 천간)는 그걸 안에서 다듬고 매듭짓는 쪽이에요.';
  // 방합(같은 계절 지지 셋)
  var BANGHAP = [{ br: [2, 3, 4], el: 0, name: '寅卯辰 봄(동방 목)' }, { br: [5, 6, 7], el: 1, name: '巳午未 여름(남방 화)' }, { br: [8, 9, 10], el: 3, name: '申酉戌 가을(서방 금)' }, { br: [11, 0, 1], el: 4, name: '亥子丑 겨울(북방 수)' }];

  // 문구 DB(관리자·추적용): 위 표를 레코드로 펼친다. 검수 상태는 모두 draft.
  var PHRASES = [], PH = {};
  function reg(id, type, text) { var r = { id: id, type: type, review: 'draft', version: PHRASE_VERSION, text: text }; PHRASES.push(r); PH[id] = r; }
  EL_TRAIT.forEach(function (t, e) { reg('lc.el.' + e + '.span', 'trait', t.span); reg('lc.el.' + e + '.pair', 'trait', t.pair); });
  Object.keys(ROLE_IMPACT).forEach(function (k) { reg('lc.role.' + k, 'impact', ROLE_IMPACT[k]); });
  GRP.forEach(function (g, i) { reg('lc.grp.' + i, 'scene', g.scene); });
  Object.keys(STRATEGY).forEach(function (k) { STRATEGY[k].forEach(function (t, i) { reg('lc.act.' + k + '.' + i, 'strategy', t); }); });
  Object.keys(TREND).forEach(function (k) { reg('lc.trend.' + k, 'trend', TREND[k]); });
  Object.keys(REL_KIND).forEach(function (k) { reg('lc.rel.' + k, 'relation', REL_KIND[k].text); });
  reg('lc.yinyang', 'pair', YINYANG);
  // 억부·조후가 역할 판단과 다른 쪽을 가리킬 때 영향 문단 끝에 한 줄 붙인다(가장 큰 쪽 하나만)
  var BAL = {
    'johu.bad': '다만 온도·습도로 보면 이 기운이 사주의 치우침을 더 키워요. 잠·체력·감정 기복처럼 몸으로 먼저 느껴질 수 있어요.',
    'johu.good': '그래도 온도·습도로 보면 이 기운이 사주의 치우침을 맞춰 줘서, 마음과 컨디션은 생각보다 편할 수 있어요.',
    'eokbu.bad': '힘의 균형으로 보면 이 기운이 이미 기운 쪽을 더 기울여요. 무리한 확장과 과로를 특히 조심하세요.',
    'eokbu.good': '힘의 균형으로 보면 이 기운이 모자란 쪽을 채워 줘서, 버티는 힘은 생겨요.',
  };
  Object.keys(BAL).forEach(function (k) { reg('lc.bal.' + k, 'balance', BAL[k]); });
  var J = function (w, pair) { w = String(w); var c = null; for (var i = w.length - 1; i >= 0; i--) { var k = w.charCodeAt(i); if (k >= 0xAC00 && k <= 0xD7A3) { c = k; break; } if (w[i] === ')') { var o = w.lastIndexOf('(', i); if (o > 0) { i = o; continue; } } } var ab = pair.split('/'), jong = c == null ? 0 : (c - 0xAC00) % 28; return w + (jong ? ab[0] : ab[1]); };
  var T = function (id, trace) { if (trace) trace.push(id); return PH[id].text; };

  // ───────────── 공통 도우미 ─────────────
  var r1 = function (v) { return Math.round(v); };
  var sg = function (v) { v = Math.round(v); return v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0'; };
  function fit(x) { return x && x.ev ? x.ev.fitScore : 0; }
  function avg(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function roleOf(ch, e) { return (ch.unified && ch.unified.roles && ch.unified.roles[e]) || '한신'; }
  // 해석 성격: 중심 오행의 통합 용신 역할값(−1~+1)과 그 구간의 기존 흐름 점수 평균(억부·조후·관계·구조가 이미 합쳐진 값)을 함께 본다
  function toneOf(ch, e, avgFit) {
    var rv = (ch.unified && ch.unified.roleV && ch.unified.roleV[e]) || 0, v = rv + avgFit / 20;
    return v >= 0.5 ? 'good' : v <= -0.5 ? 'bad' : 'mid';
  }
  function balNote(eok, jo, tone, trace) {
    var c = [];
    if (jo <= -40 && tone !== 'bad') c.push(['johu.bad', -jo]); if (jo >= 40 && tone !== 'good') c.push(['johu.good', jo]);
    if (eok <= -40 && tone !== 'bad') c.push(['eokbu.bad', -eok]); if (eok >= 40 && tone !== 'good') c.push(['eokbu.good', eok]);
    if (!c.length) return '';
    c.sort(function (x, y) { return y[1] - x[1]; });
    return ' ' + T('lc.bal.' + c[0][0], trace);
  }
  function grpOf(M, ch, e) { return (e - M.stemEl(ch.pillars.day.s) + 5) % 5; }
  // 합충형해 문자열('일지 卯酉충', '년지 辰酉합金') 묶기
  function relSplit(list) {
    var out = { clash: [], harmony: [] };
    (list || []).forEach(function (t) { var s = String(t).replace(/\s+$/, ''); if (REL_KIND.clash.re.test(s)) out.clash.push(s); else if (REL_KIND.harmony.re.test(s)) out.harmony.push(s); });
    return out;
  }
  function posArea(t) { var m = /^([년월일시])[간지]/.exec(t); return m ? POS_AREA[m[1]] : ''; }
  // 억부·조후 근거 문장(엔진 성분 점수의 평균만 옮긴다)
  function eokbuLine(ch, v) {
    var st = ch.strength || {}, strong = (st.help == null ? 50 : st.help) >= 50;
    var who = (st.zone ? st.zone + ', ' : '') + (strong ? '내 힘이 센 편' : '내 힘이 약한 편');
    var how = v >= 8 ? (strong ? '넘치는 힘을 덜어 주는 쪽' : '부족한 힘을 채워 주는 쪽') : v <= -8 ? (strong ? '이미 센 힘을 더 키우는 쪽' : '약한 힘을 더 빼는 쪽') : '강약 균형에는 큰 영향이 없는 쪽';
    return '억부(힘의 균형): 이 사주는 ' + who + '이고, 이 기운은 ' + how + '이에요 (억부 성분 ' + sg(v) + ').';
  }
  function johuLine(ch, v) {
    var c = ch.climate || { temp: 0, hum: 0 };
    var t = Math.abs(c.temp) < 0.3 && Math.abs(c.hum) < 0.3 ? '사주 온도·습도가 고른 편' : (c.temp >= 0.3 ? '더운' : c.temp <= -0.3 ? '차가운' : '') + (Math.abs(c.temp) >= 0.3 && Math.abs(c.hum) >= 0.3 ? '·' : '') + (c.hum >= 0.3 ? '습한' : c.hum <= -0.3 ? '건조한' : '') + ' 사주';
    var how = v >= 8 ? '온도·습도를 맞춰 줘요' : v <= -8 ? '치우친 온도·습도를 더 키워요' : '온도·습도에는 큰 영향이 없어요';
    return '조후(온도·습도): ' + t.replace(/^ /, '') + '에서 이 기운은 ' + how + ' (조후 성분 ' + sg(v) + ').';
  }
  function relLine(rels, label) {
    var r = relSplit(rels), out = [];
    if (r.clash.length) out.push('합충형해: ' + label + ' ' + r.clash.slice(0, 3).join(', ') + (posArea(r.clash[0]) ? ' — ' + J(posArea(r.clash[0]), '이/가') + ' 흔들리기 쉬워요.' : '.'));
    if (r.harmony.length) out.push((r.clash.length ? '' : '합충형해: ') + label + ' ' + r.harmony.slice(0, 3).join(', ') + ' — 묶이고 모이는 작용이에요.');
    if (!out.length) out.push('합충형해: ' + label + ' 원국과 크게 부딪치거나 묶이는 글자가 없어요.');
    return out;
  }

  // ───────────── 대운 30년: 장기 분석 구간 ─────────────
  // 대운 목록을 앞에서부터 3개씩 묶는다(0~2, 3~5, 6~8, 남는 것). 경계가 사람마다 바뀌지 않도록 고정 분할을 쓴다.
  function daeunSpans(M, ch) {
    var L = (ch && ch.daeun && ch.daeun.list) || [], out = [];
    for (var i = 0; i < L.length; i += 3) out.push(buildSpan(M, ch, L, i, Math.min(L.length, i + 3), out.length));
    return out;
  }
  function spanIndexOf(spans, daeunIdx) { for (var k = 0; k < spans.length; k++) if (spans[k].idx.indexOf(daeunIdx) >= 0) return k; return -1; }
  function buildSpan(M, ch, L, a, b, k) {
    var trace = [], items = L.slice(a, b), idx = items.map(function (_, j) { return a + j; });
    var last = items[items.length - 1], first = items[0];
    var scores = items.map(fit);
    // 오행 구성: 천간 오행·지지 오행을 하나씩 센다. 같으면 지지(계절) 쪽을 앞세운다
    var cnt = [0, 0, 0, 0, 0], brCnt = [0, 0, 0, 0, 0];
    items.forEach(function (x) { cnt[M.stemEl(x.s)]++; cnt[M.BR_EL[x.b]]++; brCnt[M.BR_EL[x.b]]++; });
    var bh = null;
    if (items.length === 3) BANGHAP.forEach(function (h) { var bs = items.map(function (x) { return x.b; }); if (h.br.every(function (q) { return bs.indexOf(q) >= 0; })) bh = h; });
    var main = bh ? bh.el : [0, 1, 2, 3, 4].reduce(function (m, e) { return cnt[e] > cnt[m] || (cnt[e] === cnt[m] && brCnt[e] > brCnt[m]) ? e : m; }, 0);
    var sub = [0, 1, 2, 3, 4].filter(function (e) { return e !== main && cnt[e] >= 2; }).sort(function (x, y) { return cnt[y] - cnt[x]; })[0];
    var role = roleOf(ch, main), tone = toneOf(ch, main, avg(scores)), gi = grpOf(M, ch, main), span3 = items.length === 3;
    var eokA = avg(items.map(function (x) { return x.ev.eokbuScore; })), joA = avg(items.map(function (x) { return x.ev.johuScore; }));
    // 흐름 모양
    var d = scores.length >= 3 ? scores[2] - scores[0] : 0, mid = scores.length >= 3 ? scores[1] - (scores[0] + scores[2]) / 2 : 0;
    var trend = scores.length < 3 ? 'short' : mid >= 10 && scores[1] - Math.max(scores[0], scores[2]) >= 4 ? 'peak' : mid <= -10 && Math.min(scores[0], scores[2]) - scores[1] >= 4 ? 'valley' : d >= 10 ? 'rise' : d <= -10 ? 'fall' : 'flat';
    var trendWord = { rise: '상승', fall: '하락', peak: '가운데 정점', valley: '가운데 저점', flat: '평탄', short: '짧은 구간' }[trend];
    // 전환점: 구간 안팎의 대운 경계 중 점수 변화가 크거나 상태(순풍·보통·주의·부담)가 바뀌는 곳
    var turns = [];
    for (var j = Math.max(1, a); j < b + (b < L.length ? 1 : 0); j++) {
      var p = L[j - 1], q = L[j], dv = fit(q) - fit(p), cond = p.ev.condition !== q.ev.condition;
      if (Math.abs(dv) >= 10 || cond) turns.push({ i: j, year: q.startYear, age: q.startAge, from: fit(p), to: fit(q), delta: dv, cond: cond, fromCond: p.ev.condition, toCond: q.ev.condition, outside: j >= b, gz: M.gzName(q), elChange: M.stemEl(p.s) !== M.stemEl(q.s) });
    }
    turns.sort(function (x, y) { return Math.abs(y.delta) - Math.abs(x.delta); });
    turns = turns.slice(0, 3).sort(function (x, y) { return x.i - y.i; });
    turns.forEach(function (t) {
      var dir = t.delta >= 10 ? '흐름이 크게 올라가요' : t.delta <= -10 ? '흐름이 크게 내려가요' : t.delta > 0 ? '흐름이 조금 나아져요' : '흐름이 조금 무거워져요';
      t.text = t.year + '년(' + t.age + '세) ' + t.gz + ' 대운' + (t.outside ? '(다음 구간 첫 대운)' : '') + '으로 넘어가며 ' + dir + ' (' + sg(t.from) + ' → ' + sg(t.to) + (t.cond ? ', ' + t.fromCond + ' → ' + t.toCond : '') + ').';
    });
    // 기회·위험
    var CC = M.LUCK_CFG.condition, bestI = scores.indexOf(Math.max.apply(null, scores)), worstI = scores.indexOf(Math.min.apply(null, scores));
    var best = items[bestI], worst = items[worstI];
    var rel = relSplit([].concat.apply([], items.map(function (x) { return x.ev.relations || []; })));
    var opp = scores[bestI] >= CC.tailwind
      ? best.startYear + '~' + (best.startYear + 9) + '년(' + best.startAge + '세~) ' + M.gzName(best) + ' 대운이 이 구간의 기회예요 (' + sg(scores[bestI]) + '). ' + GRP[grpOf(M, ch, M.stemEl(best.s))].plain + ' 쪽에서 결과를 만들기 쉬워요.'
      : scores[bestI] >= 0 ? '뚜렷하게 치고 올라가는 대운은 없지만, ' + best.startYear + '년(' + best.startAge + '세~) ' + M.gzName(best) + ' 대운이 상대적으로 가장 수월해요 (' + sg(scores[bestI]) + '). 큰 결정은 이 10년에 두세요.'
        : (span3 ? '30년' : '이 구간') + ' 내내 운이 크게 밀어 주지는 않아요. 그중 ' + best.startYear + '년(' + best.startAge + '세~) ' + M.gzName(best) + ' 대운이 가장 덜 무거워요 (' + sg(scores[bestI]) + ').';
    var risk = scores[worstI] <= CC.caution
      ? worst.startYear + '~' + (worst.startYear + 9) + '년(' + worst.startAge + '세~) ' + M.gzName(worst) + ' 대운이 가장 조심할 10년이에요 (' + sg(scores[worstI]) + ', ' + worst.ev.condition + '). ' + GRP[grpOf(M, ch, M.stemEl(worst.s))].plain + ' 쪽 무리를 줄이세요.'
      : '크게 꺾이는 대운은 없어요. 가장 낮은 때는 ' + worst.startYear + '년(' + worst.startAge + '세~) ' + M.gzName(worst) + ' 대운 (' + sg(scores[worstI]) + ')이에요.';
    if (rel.clash.length >= 2) risk += ' ' + T('lc.rel.clash', trace);
    // 세 단계 해석
    var seq = items.map(function (x) { return M.EL_K[M.stemEl(x.s)] + '·' + M.EL_K[M.BR_EL[x.b]]; }).join(' → ');
    var trait = T('lc.el.' + main + '.span', trace) + (bh ? ' 이 구간은 대운 지지가 ' + bh.name + '의 세 글자를 모두 지나서, 그 기운이 30년 내내 크게 모여요.' : '');
    var impact = '이 사주에서 ' + J(EL_TRAIT[main].name, '은/는') + ' ' + role + '이에요. ' + T('lc.role.' + role, trace) + ' 생활에서는 ' + GRP[gi].plain + '(' + GRP[gi].name + ') 주제로 나타나요 — ' + T('lc.grp.' + gi, trace) + balNote(eokA, joA, tone, trace);
    var strategy = T('lc.act.' + tone + '.' + gi, trace) + ' ' + T('lc.trend.' + trend, trace);
    // 판단 근거
    var basis = [eokbuLine(ch, eokA), johuLine(ch, joA)];
    basis.push('십성: ' + items.map(function (x) { return M.gzName(x) + ' ' + x.stemTG + '/' + x.branchTG; }).join(' · ') + ' — 중심은 ' + GRP[gi].name + '(' + GRP[gi].plain + ')이에요.');
    basis = basis.concat(relLine(rel.clash.concat(rel.harmony), span3 ? '이 30년 동안' : '이 구간 동안'));
    basis.push('통합 용신: ' + (ch.unified && ch.unified.primaryName ? ch.unified.primaryName + ' 기준, ' : '') + '중심 오행 ' + EL_TRAIT[main].name + ' = ' + role + (sub != null ? ', 함께 많은 ' + EL_TRAIT[sub].name + ' = ' + roleOf(ch, sub) : '') + '.');
    basis.push('흐름 점수(기존 계산 그대로): ' + items.map(function (x) { return x.startAge + '세 ' + sg(fit(x)); }).join(' · ') + ' · 평균 ' + sg(avg(scores)) + '.');
    var endAge = last.startAge + 9, endYear = last.startYear + 9;
    var head = { rise: '갈수록 풀리는 30년', fall: '앞에서 벌어 두는 30년', peak: '가운데 10년이 승부인 30년', valley: '버티고 다시 올라서는 30년', flat: '꾸준함이 결과가 되는 30년', short: '마지막 구간' }[trend];
    var hook = head + ' — ' + J(EL_TRAIT[main].name, '이/가') + ' ' + (tone === 'good' ? '이 사주를 밀어 줘요' : tone === 'bad' ? '이 사주에는 버거운 기운이에요' : '무난하게 흘러요');
    return {
      kind: 'span', type: '장기 분석 구간', k: k, label: '장기 분석 구간 ' + (k + 1), idx: idx, items: items,
      startAge: first.startAge, endAge: endAge, startYear: first.startYear, endYear: endYear, years: items.length * 10,
      mainEl: main, subEl: sub == null ? null : sub, elCount: cnt, banghap: bh ? bh.name : null, role: role, tone: tone, grp: gi, seq: seq,
      scores: scores, avg: avg(scores), trend: trend, trendWord: trendWord, turns: turns, opp: opp, risk: risk,
      hook: hook, steps: { trait: trait, impact: impact, strategy: strategy }, basis: basis, trace: trace,
    };
  }

  // ───────────── 세운 2년: 천간 오행 구간 ─────────────
  // 甲乙·丙丁·戊己·庚辛·壬癸 — 천간 오행이 같은 연속 2년. 앞해는 양 천간(연도 끝자리 4·6·8·0·2)이다.
  function pairStart(Y) { return ((Y - 4) % 10 + 10) % 10 % 2 === 0 ? Y : Y - 1; }
  function seunPair(M, ch, Y) {
    var y0 = pairStart(Y), lo = Math.max(M.MIN_Y, y0), hi = Math.min(M.MAX_Y - 1, y0 + 1);
    var ys = M.seunRange(ch, lo, hi).filter(function (x) { return x.year === y0 || x.year === y0 + 1; });
    if (!ys.length) return null;
    var trace = [], e = M.stemEl(ys[0].s), role = roleOf(ch, e), tone = toneOf(ch, e, avg(ys.map(function (x) { return x.combined; }))), gi = grpOf(M, ch, e);
    var eokA = avg(ys.map(function (x) { return x.ev.eokbuScore; })), joA = avg(ys.map(function (x) { return x.ev.johuScore; }));
    var years = ys.map(function (x) {
      var be = M.BR_EL[x.b], r = relSplit(x.ev.relations);
      return { year: x.year, age: x.age, gz: M.gzName(x), stemTG: x.stemTG, branchTG: x.branchTG, branchEl: be, branchRole: roleOf(ch, be), score: x.combined, cond: x.ev.condition, clash: r.clash, harmony: r.harmony, yang: x.s % 2 === 0 };
    });
    var diff = '';
    if (years.length === 2) {
      var A = years[0], B = years[1], dv = B.score - A.score, better = dv >= 0 ? B : A;
      diff = Math.abs(dv) < 5 ? '두 해의 흐름 점수가 비슷해요 (' + A.year + ' ' + sg(A.score) + ' · ' + B.year + ' ' + sg(B.score) + ').' : '두 해 중 ' + better.year + '년이 더 수월해요 (' + A.year + ' ' + sg(A.score) + ' → ' + B.year + ' ' + sg(B.score) + ').';
      diff += ' 천간은 같은 오행이라, 차이는 주로 지지에서 와요: ' + A.year + '년 ' + A.gz.slice(1) + '(' + EL_TRAIT[A.branchEl].name + '·' + A.branchRole + ') / ' + B.year + '년 ' + B.gz.slice(1) + '(' + EL_TRAIT[B.branchEl].name + '·' + B.branchRole + ').';
    }
    var trait = T('lc.el.' + e + '.pair', trace) + ' ' + T('lc.yinyang', trace);
    var impact = '이 사주에서 ' + J(EL_TRAIT[e].name, '은/는') + ' ' + role + '이에요. ' + T('lc.role.' + role, trace) + ' 2년 동안 ' + GRP[gi].plain + '(' + years.map(function (y) { return y.stemTG; }).join('·') + ') 주제가 이어져요 — ' + T('lc.grp.' + gi, trace) + balNote(eokA, joA, tone, trace);
    var strategy = T('lc.act.' + tone + '.' + gi, trace);
    var basis = [eokbuLine(ch, eokA), johuLine(ch, joA)];
    basis.push('십성: ' + years.map(function (y) { return y.year + ' ' + y.gz + ' ' + y.stemTG + '/' + y.branchTG; }).join(' · ') + '.');
    years.forEach(function (y) { basis = basis.concat(relLine(y.clash.concat(y.harmony), y.year + '년')); });
    basis.push('흐름 점수(기존 계산 그대로, 대운 40% + 세운 60%): ' + years.map(function (y) { return y.year + ' ' + sg(y.score) + ' ' + y.cond; }).join(' · ') + '.');
    return {
      kind: 'pair', type: '천간 오행 구간', label: '천간 오행 구간 · ' + EL_TRAIT[e].name, start: y0, end: y0 + 1, el: e, role: role, tone: tone, grp: gi, years: years,
      hook: EL_TRAIT[e].name + ' 2년 — ' + (tone === 'good' ? '밀어 줄 때 크게 움직이는 2년' : tone === 'bad' ? '속도를 줄이고 지키는 2년' : '내 페이스대로 가는 2년'),
      steps: { trait: trait, impact: impact, strategy: strategy }, diff: diff, basis: basis, trace: trace,
    };
  }
  // 연도 목록을 2년 묶음으로 나눈다(화면 타일 연결용). 가장자리는 1년짜리 묶음이 될 수 있다
  function pairGroups(years) {
    var out = [];
    years.forEach(function (Y) { var s = pairStart(Y), g = out[out.length - 1]; if (g && g.start === s) g.years.push(Y); else out.push({ start: s, years: [Y] }); });
    return out;
  }
  function applyPublished(map) {
    var n = 0; if (!map || typeof map !== 'object') return 0;
    Object.keys(map).forEach(function (id) { if (PH[id] && typeof map[id] === 'string' && map[id].trim()) { PH[id].text = map[id].trim(); PH[id].review = 'published'; n++; } });
    return n;
  }
  var api = { VERSION: VERSION, PHRASE_VERSION: PHRASE_VERSION, PHRASES: PHRASES, EL_TRAIT: EL_TRAIT, daeunSpans: daeunSpans, spanIndexOf: spanIndexOf, seunPair: seunPair, pairStart: pairStart, pairGroups: pairGroups, relSplit: relSplit, applyPublished: applyPublished };
  G.MantraLuckCycle = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
