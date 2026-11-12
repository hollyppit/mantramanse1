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
  var VERSION = 'luck-cycle-20261113-2', PHRASE_VERSION = 3;

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
  // ── 30년 구간 개선(2026-11-13): 우세 오행·도움 오행 분리, 복합 오행, 역할과 점수가 다른 이유, 연령별 전략
  // {이름} 자리는 계산값으로 채운다(fill). 문구 자체는 관리자 화면에서 고칠 수 있다.
  var SPAN2 = {
    'mix': '이 30년은 {Awa} {Bga} 비슷하게 섞여 있어서, 한 가지 오행의 성격보다 두 기운이 번갈아 나타난다고 보는 게 맞아요.',
    'mix3': '이 30년은 여러 기운이 고르게 섞여 있어서 한 가지 오행의 시기라고 보기 어려워요. 그중 조금 더 많은 건 {Aieyo}.',
    'cond': '다만 {th} 기준에서는 쓰임이 있는 기운이라 조건부로 봐요. 어떤 글자로, 언제 들어오느냐에 따라 부담이 줄어들 수 있어요.',
    'why.lift': '기운이 많다고 결과가 정해지는 건 아니에요. 이 30년에는 {Aga} 가장 많지만, 실제로 흐름을 끌어올린 쪽은 이 사주에 필요한 {B} 기운이에요. 그래서 {Aeun} 부담이 되는 기운이어도 운은 나아질 수 있어요.',
    'why.drag': '기운이 많다고 결과가 정해지는 건 아니에요. 이 30년에는 이 사주에 필요한 {Aga} 가장 많지만, 실제로 흐름을 끌어내린 쪽은 부담이 되는 {B} 기운이에요. 그래서 좋은 기운이 많아도 중간중간 발목을 잡히는 때가 있어요.',
    'why.part': '글자만 보면 {d1}이 되는 기운인데, {what} 실제 흐름은 {d2} 쪽으로 기울었어요. 오행의 좋고 나쁨과 실제 운의 평가가 다르게 나오는 이유예요.',
    'hook.risk': '{a}~{b}세는 조심',
    'hook.opp': '{a}~{b}세가 기회',
    'hook.even': '큰 굴곡 없이 고른 편',
  };
  Object.keys(SPAN2).forEach(function (k) { reg('lc.span.' + k, 'span', SPAN2[k]); });
  reg('lc.trend.lateDrop', 'trend', '마지막 10년이 크게 꺾이는 흐름이에요. 평균이 괜찮아 보여도, 끝 10년이 오기 전에 지출·건강·책임의 크기를 미리 줄여 두는 게 핵심이에요.');
  // 연령대 × 그 10년의 상태(good 순풍 / mid 보통 / bad 주의·부담). 나이는 그 대운의 가운데 나이로 고른다
  var STAGE = {
    teen: { name: '성장기', good: '배움에 속도가 붙는 때예요. 잘하는 것 하나를 골라 깊게 파 두면 나중의 무기가 돼요.', mid: '기초를 꾸준히 다지는 때예요. 남과 비교하기보다 잠·공부 시간 같은 생활 리듬을 지키는 게 남아요.', bad: '마음이 흔들리기 쉬운 때예요. 성적보다 건강과, 믿고 기댈 어른 한 명을 곁에 두는 게 먼저예요.' },
    young: { name: '사회 초년', good: '진로와 자리를 넓혀도 되는 때예요. 이직·창업·자격처럼 이름이 남는 선택을 이 10년에 두세요.', mid: '방향을 좁혀 가는 때예요. 여러 개를 벌이기보다 한 분야에서 경력을 쌓는 쪽이 이득이에요.', bad: '시행착오가 많은 때예요. 큰 대출·보증·충동 이직은 피하고, 실패해도 다시 설 수 있는 크기로만 움직이세요.' },
    mid: { name: '중년', good: '일과 자산을 키울 때예요. 책임 있는 자리와 수입 확대를 피하지 말고, 늘어난 만큼 저축 비율을 정해 두세요.', mid: '지키면서 다듬는 때예요. 일·가정의 고정 비용과 역할을 한 번 정리해 두면 체감이 달라져요.', bad: '책임이 무거워지는 때예요. 일을 늘리기보다 건강검진·보험·비상금부터 챙기고, 큰 결정은 나눠서 하세요.' },
    mature: { name: '장년', good: '쌓아 온 것을 거두는 때예요. 경험을 자산·자격·사람으로 바꿔 두면 오래 쓰여요.', mid: '정리와 준비의 때예요. 노후 자금과 건강 습관을 숫자로 점검해 두세요.', bad: '무리하면 몸과 돈이 같이 새는 때예요. 새 사업·투자보다 건강과 지출 관리를 앞에 두세요.' },
    senior: { name: '노년', good: '여유가 생기는 때예요. 배움·취미·사람을 넓히고, 가진 것을 나누는 일에 힘이 실려요.', mid: '편안한 리듬을 지키는 때예요. 규칙적인 운동과 가까운 관계를 꾸준히 챙기세요.', bad: '건강과 안전이 먼저인 때예요. 큰돈 결정은 가족과 함께하고, 몸이 보내는 신호를 미루지 마세요.' },
  };
  var PAST = { good: '지나온 10년이에요. 일이나 관계에서 노력한 만큼 결과가 남았던 때예요. 그때의 방식이 지금의 밑천이에요.', mid: '지나온 10년이에요. 큰 굴곡보다 자리를 지키며 보낸 때예요. 그때 생긴 습관이 지금까지 이어지고 있을 수 있어요.', bad: '지나온 10년이에요. 책임이나 환경의 압박이 컸던 때예요. 그때 생긴 부담이 남아 있다면 지금 정리해 두세요.' };
  Object.keys(STAGE).forEach(function (s) { ['good', 'mid', 'bad'].forEach(function (t) { reg('lc.stage.' + s + '.' + t, 'stage', STAGE[s][t]); }); });
  Object.keys(PAST).forEach(function (t) { reg('lc.past.' + t, 'stage', PAST[t]); });
  // 2026-11-13 사용자용 해석 보완: 쉬운 역할 이름, 시점(지나온·지금·앞으로)과 나이(어린 시절)에 맞는 문구, 핵심 결론
  var ROLE_PLAIN = { 용신: '이 사주에 가장 필요한 기운', 희신: '필요한 기운을 돕는 기운', 한신: '좋지도 나쁘지도 않은 기운', 구신: '부담을 거드는 기운', 기신: '이 사주에 부담이 되는 기운' };
  var ROLE_FX = { 용신: '그동안 혼자 힘으로 밀던 일이 비교적 수월하게 굴러가고, 같은 노력에도 결과가 잘 남는 편이에요.', 희신: '큰 한 방보다는 도와주는 사람·조건이 조금씩 쌓이는 느낌에 가까워요.', 한신: '결과는 운보다 내가 무엇을 고르고 얼마나 꾸준한지에 더 크게 달려요.', 기신: '같은 일을 해도 피로가 더 쌓이고, 무리한 선택이 뒤늦게 청구서로 돌아오기 쉬워요.', 구신: '사소한 일이 생각보다 커지거나, 정리가 한 박자씩 늦어지기 쉬워요.' };
  var ROLE_PAST = { 용신: '돌아보면 같은 노력에도 결과가 잘 남고, 도와주는 사람이나 환경을 만나기 쉬웠던 시기예요.', 희신: '돌아보면 큰 한 방보다 주변의 도움과 조건이 조금씩 쌓였던 시기예요.', 한신: '돌아보면 운보다는 내가 고른 길과 꾸준함이 결과를 정했던 시기예요.', 기신: '돌아보면 같은 일을 해도 더 지치고, 환경이 버겁게 느껴졌을 수 있는 시기예요.', 구신: '돌아보면 작은 일이 생각보다 커지거나, 정리가 한 박자씩 늦어졌을 수 있는 시기예요.' };
  var ROLE_YOUTH = { 용신: '배움과 성장에 힘이 붙고, 도와주는 어른을 만나기 쉬운 편이에요.', 희신: '주변의 도움이 조금씩 쌓이며 자라는 편이에요.', 한신: '타고난 운보다 생활 습관과 집안 환경이 더 크게 작용해요.', 기신: '마음이나 몸이 쉽게 지치거나, 환경이 버겁게 느껴질 수 있어요.', 구신: '작은 어려움이 생각보다 크게 느껴질 수 있어요.' };
  var GRP_YOUTH = ['친구·형제 사이에서 내 자리를 찾고, 고집과 독립심이 자라는 일이 중심이 돼요.', '말하고 그리고 만드는 재능, 하고 싶은 것을 표현하는 일이 눈에 띄어요.', '물건·용돈을 다루는 현실 감각, 눈에 보이는 결과를 좋아하는 성향이 드러나요.', '규칙·학교생활·평가처럼 지켜야 할 틀이 크게 느껴져요.', '공부·책, 그리고 나를 돌봐 주는 어른과 집안 환경이 중요해져요.'];
  var PAST_TEEN = { good: '지나온 어린 시절이에요. 집과 학교 환경이 비교적 순탄했을 가능성이 커요.', mid: '지나온 어린 시절이에요. 큰 사건보다 평범한 일상이 이어진 때예요.', bad: '지나온 어린 시절이에요. 집안 사정이나 환경 변화로 마음고생이 있었을 수 있어요.' };
  var SUM = {
    'shape': '{a}~{b}세({y1}~{y2}년)는 {headIeyo}.', 'shape.past': '지나온 {a}~{b}세({y1}~{y2}년)는 {headIeotta}.',
    'el': '이 시기에 가장 많은 기운은 {Xieyo}.', 'el.mix3': '이 시기에는 여러 기운이 고르게 섞여 있어요.',
    'both': '{Hga} 힘이 되고, {Dga} 부담이 되는 시기예요.', 'help': '{Hga} 힘이 되는 시기예요.', 'drag': '{Dga} 부담이 되는 시기예요.', 'none': '크게 돕거나 누르는 기운 없이 고르게 흘러가는 시기예요.',
    'both.past': '{Hga} 힘이 되고, {Dga} 부담이 됐던 시기예요.', 'help.past': '{Hga} 힘이 됐던 시기예요.', 'drag.past': '{Dga} 부담이 됐던 시기예요.', 'none.past': '크게 돕거나 누르는 기운 없이 고르게 흘러간 시기였어요.',
    'risk': '특히 {a}~{b}세는 조심할 10년이에요.', 'opp': '{a}~{b}세가 가장 좋은 기회예요.', 'risk.past': '{a}~{b}세가 가장 무거웠던 때예요.',
  };
  Object.keys(ROLE_FX).forEach(function (r) { reg('lc.roleFx.' + r, 'impact', ROLE_FX[r]); reg('lc.rolePast.' + r, 'impact', ROLE_PAST[r]); reg('lc.roleYouth.' + r, 'impact', ROLE_YOUTH[r]); });
  GRP_YOUTH.forEach(function (t, i) { reg('lc.grpYouth.' + i, 'scene', t); });
  Object.keys(PAST_TEEN).forEach(function (t) { reg('lc.pastTeen.' + t, 'stage', PAST_TEEN[t]); });
  Object.keys(SUM).forEach(function (k) { reg('lc.sum.' + k, 'summary', SUM[k]); });
  reg('lc.span.pastLead', 'strategy', '지나간 30년은 바꿀 수 없지만, 이때 생긴 습관·관계·자산이 지금의 바탕이에요. 좋았던 때의 방식은 이어 가고, 힘들었던 때의 원인은 정리해 두세요.');
  reg('lc.rel.clashYouth', 'relation', '부딪히고 흔들리는 작용이 겹쳐 이사·전학처럼 주변 환경이 바뀌는 일이 생기기 쉬워요.');
  reg('lc.trendYouth', 'trend', '어린 시절의 운은 가족과 환경의 영향이 커요. 흐름이 무거운 때일수록 성적보다 생활 리듬과 마음을 먼저 챙겨 주세요.');
  var J =function (w, pair) { w = String(w); var c = null; for (var i = w.length - 1; i >= 0; i--) { var k = w.charCodeAt(i); if (k >= 0xAC00 && k <= 0xD7A3) { c = k; break; } if (w[i] === ')') { var o = w.lastIndexOf('(', i); if (o > 0) { i = o; continue; } } } var ab = pair.split('/'), jong = c == null ? 0 : (c - 0xAC00) % 28; return w + (jong ? ab[0] : ab[1]); };
  var T = function (id, trace) { if (trace) trace.push(id); return PH[id].text; };
  // {키} 자리를 값으로 채운다. 값이 없으면 빈칸이 아니라 키를 그대로 남겨 테스트가 잡게 한다
  var fill = function (id, vars, trace) { return T(id, trace).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; }); };

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
  // 이 사주에 적용되는 이론인가: 조후는 통합 판단에서 '해당 없음'이면 점수에 0으로 들어가므로 문구도 내지 않는다. 억부는 종격이면 쓰지 않는다
  function useJohu(ch) { var t = ch.unified && ch.unified.theories && ch.unified.theories.johu; return !ch.unified ? true : !!(t && t.applicable); }
  function useEokbu(ch) { var u = ch.unified; if (!u) return true; var t = u.theories && u.theories.eokbu; return !!(t && t.applicable) && u.mode !== 'jong'; }
  function balNote(eok, jo, tone, trace, ch) {
    var c = [], uj = !ch || useJohu(ch), ue = !ch || useEokbu(ch);
    if (uj && jo <= -40 && tone !== 'bad') c.push(['johu.bad', -jo]); if (uj && jo >= 40 && tone !== 'good') c.push(['johu.good', jo]);
    if (ue && eok <= -40 && tone !== 'bad') c.push(['eokbu.bad', -eok]); if (ue && eok >= 40 && tone !== 'good') c.push(['eokbu.good', eok]);
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
    return '억부(힘의 균형): 이 사주는 ' + who + '이고, 이 기운은 ' + how + '이에요 (억부만 따로 본 성분 ' + sg(v) + ').';
  }
  function johuLine(ch, v) {
    var c = ch.climate || { temp: 0, hum: 0 };
    var t = Math.abs(c.temp) < 0.3 && Math.abs(c.hum) < 0.3 ? '사주 온도·습도가 고른 편' : (c.temp >= 0.3 ? '더운' : c.temp <= -0.3 ? '차가운' : '') + (Math.abs(c.temp) >= 0.3 && Math.abs(c.hum) >= 0.3 ? '·' : '') + (c.hum >= 0.3 ? '습한' : c.hum <= -0.3 ? '건조한' : '') + ' 사주';
    var how = v >= 8 ? '온도·습도를 맞춰 줘요' : v <= -8 ? '치우친 온도·습도를 더 키워요' : '온도·습도에는 큰 영향이 없어요';
    return '조후(온도·습도): ' + t.replace(/^ /, '') + '에서 이 기운은 ' + how + ' (조후만 따로 본 성분 ' + sg(v) + ').';
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
  // opts.year(선택): 이 해를 기준으로 '지나온 10년 · 지금 10년 · 앞으로의 10년'을 나눠 전략 문장을 고른다.
  function daeunSpans(M, ch, opts) {
    var L = (ch && ch.daeun && ch.daeun.list) || [], out = [], Y = opts && opts.year != null ? +opts.year : null;
    for (var i = 0; i < L.length; i += 3) out.push(buildSpan(M, ch, L, i, Math.min(L.length, i + 3), out.length, Y));
    return out;
  }
  function spanIndexOf(spans, daeunIdx) { for (var k = 0; k < spans.length; k++) if (spans[k].idx.indexOf(daeunIdx) >= 0) return k; return -1; }
  var E5 = [0, 1, 2, 3, 4];
  var ROLE_BASE = { 용신: 1, 희신: 0.5, 한신: 0, 구신: -0.5, 기신: -1 };
  var IMPACT_MIN = 5;   // 엔진 impactWord 의 '약간 도움/약간 부담' 경계(±5점)와 같은 값
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  // 대운 하나의 오행 분석 — 엔진이 흐름 점수를 낼 때 쓰는 비율만 그대로 쓴다(새 가중치 없음).
  //  · 비중(share, 합 1): 천간 stemW(대운 0.4) × 통근 배율(같은 기둥 뿌리 1+rootUp · 원국 뿌리 1 · 뿌리 없음 1−floatDown)
  //                       + 지지 (1−stemW) × 지장간 일수/30
  //  · 기여(contrib, 점): 위 비중 × 통합 용신 역할값을 엔진 unifiedLuckFit 과 같은 식으로 흐름 점수 단위로 옮긴 오행별 몫.
  //    오행별 몫의 합 + 조후·격국·기준선 몫(rest) = 용신 성분(parts.yong). 여기에 관계·구조 성분을 더하면 흐름 점수다.
  function daeunElements(M, ch, x) {
    var U = M.UNIFIED_CFG.luck, stemW = M.LUCK_CFG.levels.daeun.stemW, u = ch.unified, ev = x.ev, H = M.HIDDEN, se = M.stemEl(x.s);
    var rootIn = function (b) { return H[b].some(function (h) { return M.stemEl(h[0]) === se; }); };
    var rootedOwn = rootIn(x.b), rootedNatal = M.POS.some(function (k) { return ch.pillars[k] && rootIn(ch.pillars[k].b); });
    var sMul = rootedOwn ? 1 + U.rootUp : rootedNatal ? 1 : 1 - U.floatDown;
    var rv = function (e) { return u && u.roleV ? u.roleV[e] : 0; };
    var pres = [0, 0, 0, 0, 0], raw = [0, 0, 0, 0, 0];
    pres[se] += stemW * sMul; raw[se] += stemW * sMul * rv(se) * 100;
    H[x.b].forEach(function (h) { var e = M.stemEl(h[0]), w = (1 - stemW) * h[1] / 30; pres[e] += w; raw[e] += w * rv(e) * 100; });
    var tot = sum(pres), share = pres.map(function (v) { return v / tot; });
    var r = u && M.unifiedLuckFit ? M.unifiedLuckFit(ch, x, stemW, ev.johuScore) : null;
    var rs = sum(raw), scale = r && Math.abs(rs) > 1e-9 ? r.roleFit / rs : 1;   // roleFit 이 ±100에서 잘렸을 때만 1과 다르다
    var w = ev.weights || { unified: 0, relation: 0, structure: 0 }, kRole = r ? 1 - r.kJ - r.kG : 1;
    var contrib = raw.map(function (v) { return w.unified * kRole * v * scale; });
    var parts = { yong: w.unified * ev.unifiedScore, relation: w.relation * ev.relationScore, structure: w.structure * ev.structureScore };
    parts.johu = r ? w.unified * r.kJ * ev.johuScore : 0;
    parts.rest = parts.yong - sum(contrib);
    return { share: share, contrib: contrib, parts: parts, uniCheck: r ? r.v : null, kJ: r ? r.kJ : 0, kG: r ? r.kG : 0 };
  }
  var dTone = function (c) { return c === '순풍' ? 'good' : c === '보통' ? 'mid' : 'bad'; };
  var stageOf = function (startAge) { var m = startAge + 5; return m < 22 ? 'teen' : m < 35 ? 'young' : m < 50 ? 'mid' : m < 65 ? 'mature' : 'senior'; };
  // 30년 전체 성격: 세 대운의 상태(순풍·보통·주의·부담)로 정한다. 순풍과 주의·부담이 함께 있으면 'mixed'(한 가지 길흉으로 단정하지 않음)
  function spanToneOf(items, avgFit) {
    var nG = 0, nB = 0; items.forEach(function (x) { var t = dTone(x.ev.condition); if (t === 'good') nG++; else if (t === 'bad') nB++; });
    if (nG && nB) return 'mixed';
    if (nG >= 2 || (nG === 1 && avgFit >= 0)) return 'good';
    if (nB >= 2 || (nB === 1 && avgFit < 0)) return 'bad';
    return 'mid';
  }
  function condRoleNote(ch, e, trace) {
    var u = ch.unified; if (!u || !u.conditions || !u.conditions[e]) return '';
    var r = u.roles[e]; if (r !== '기신' && r !== '구신') return '';
    if (u.roleV[e] === ROLE_BASE[r]) return '';   // 필요도가 낮아 완화되지 않은 경우는 그대로 둔다
    var th = Object.keys(u.theories || {}).filter(function (k) { var t = u.theories[k]; return t.applicable && k !== u.primary && (t.favor || []).indexOf(e) >= 0; }).map(function (k) { return u.theories[k].name; });
    return ' ' + fill('lc.span.cond', { th: th.length ? th.join('·') : '다른' }, trace);
  }
  function roleLabel(ch, e) { var u = ch.unified, r = roleOf(ch, e); return u && u.conditions && u.conditions[e] && (r === '기신' || r === '구신') && u.roleV[e] !== ROLE_BASE[r] ? '조건부 ' + r : r; }
  function buildSpan(M, ch, L, a, b, k, Y) {
    var trace = [], items = L.slice(a, b), idx = items.map(function (_, j) { return a + j; }), u = ch.unified;
    var last = items[items.length - 1], first = items[0], n = items.length, span3 = n === 3;
    var scores = items.map(fit), fitAvg = avg(scores), CC = M.LUCK_CFG.condition, EK = M.EL_K;
    // (참고용) 예전 방식의 글자 수: 천간·지지 본기 1:1
    var cnt = [0, 0, 0, 0, 0]; items.forEach(function (x) { cnt[M.stemEl(x.s)]++; cnt[M.BR_EL[x.b]]++; });
    var bh = null;
    if (span3) BANGHAP.forEach(function (h) { var bs = items.map(function (x) { return x.b; }); if (h.br.every(function (q) { return bs.indexOf(q) >= 0; })) bh = h; });
    // ── 우세 오행(얼마나 많은가)과 도움·부담 오행(점수를 얼마나 움직였나)을 따로 계산
    var EA = items.map(function (x) { return daeunElements(M, ch, x); });
    var share = E5.map(function (e) { return avg(EA.map(function (z) { return z.share[e]; })) * 100; });
    var contrib = E5.map(function (e) { return avg(EA.map(function (z) { return z.contrib[e]; })); });
    var order = E5.slice().sort(function (x, y) { return share[y] - share[x] || x - y; });
    var gapMin = (M.ELEMENT_FLOW_CFG && M.ELEMENT_FLOW_CFG.present) || 8;   // 엔진이 '그 오행이 있다'고 보는 최소 비중(%)을 '앞선다'의 최소 차이로 쓴다
    var main = order[0], second = order[1], gap12 = share[main] - share[second];
    var mix = gap12 >= gapMin ? 1 : share[main] - share[order[2]] >= gapMin ? 2 : 3;
    var sub = second;
    var elLabel = mix === 1 ? EK[main] + '(' + M.EL[main] + ')' : mix === 2 ? EK[main] + '·' + EK[second] + ' 복합' : EK[main] + '·' + EK[second] + '·' + EK[order[2]] + ' 혼재';
    var hi = E5.reduce(function (m, e) { return contrib[e] > contrib[m] ? e : m; }, 0), lo = E5.reduce(function (m, e) { return contrib[e] < contrib[m] ? e : m; }, 0);
    var help = contrib[hi] >= IMPACT_MIN ? hi : null, drag = contrib[lo] <= -IMPACT_MIN ? lo : null;
    var P = { yong: avg(EA.map(function (z) { return z.parts.yong; })), relation: avg(EA.map(function (z) { return z.parts.relation; })), structure: avg(EA.map(function (z) { return z.parts.structure; })), johu: avg(EA.map(function (z) { return z.parts.johu; })) };
    var role = roleOf(ch, main), rvm = u && u.roleV ? u.roleV[main] : 0, gi = grpOf(M, ch, main);
    var tone = spanToneOf(items, fitAvg);
    var eokA = avg(items.map(function (x) { return x.ev.eokbuScore; })), joA = avg(items.map(function (x) { return x.ev.johuScore; }));
    // ── 흐름 모양: 마지막 10년이 크게 꺾이면(주의 이하로 10점 넘게, 또는 30점 넘게) 다른 모양보다 먼저 잡는다
    var s0 = scores[0], s1 = scores[1], s2 = scores[2];
    var d = n >= 3 ? s2 - s0 : 0, mid = n >= 3 ? s1 - (s0 + s2) / 2 : 0, endDrop = n >= 3 ? s2 - Math.max(s0, s1) : 0;
    var trend = n < 3 ? 'short' : (s2 <= CC.caution && endDrop <= -10) || endDrop <= -30 ? 'lateDrop' : mid >= 10 && s1 - Math.max(s0, s2) >= 4 ? 'peak' : mid <= -10 && Math.min(s0, s2) - s1 >= 4 ? 'valley' : d >= 10 ? 'rise' : d <= -10 ? 'fall' : 'flat';
    var trendWord = { rise: '상승', fall: '하락', peak: '가운데 정점', valley: '가운데 저점', flat: '평탄', short: '짧은 구간', lateDrop: '끝 10년 하락' }[trend];
    // ── 전환점: 구간 안 경계는 기준(점수 차 10 이상 또는 상태 변화)을 넘으면 모두, 구간 밖 경계(들어오는·나가는)는 그다음 큰 순서로 채워 최대 4개
    var turns = [];
    for (var j = Math.max(1, a); j < b + (b < L.length ? 1 : 0); j++) {
      var p = L[j - 1], q = L[j], dv = fit(q) - fit(p), cond = p.ev.condition !== q.ev.condition;
      if (Math.abs(dv) >= 10 || cond) turns.push({ i: j, year: q.startYear, age: q.startAge, from: fit(p), to: fit(q), delta: dv, cond: cond, fromCond: p.ev.condition, toCond: q.ev.condition, outside: j >= b, entering: j === a, gz: M.gzName(q), elChange: M.stemEl(p.s) !== M.stemEl(q.s) });
    }
    var inner = turns.filter(function (t) { return !t.outside && !t.entering; }), outer = turns.filter(function (t) { return t.outside || t.entering; }).sort(function (x, y) { return Math.abs(y.delta) - Math.abs(x.delta); });
    turns = inner.concat(outer.slice(0, Math.max(0, 4 - inner.length))).sort(function (x, y) { return x.i - y.i; });
    turns.forEach(function (t) {
      var dir = t.delta >= 10 ? '흐름이 크게 올라가요' : t.delta <= -10 ? '흐름이 크게 내려가요' : t.delta > 0 ? '흐름이 조금 나아져요' : '흐름이 조금 무거워져요';
      t.text = t.year + '년(' + t.age + '세) ' + t.gz + ' 대운' + (t.outside ? '(다음 구간 첫 대운)' : t.entering ? '(이 구간 첫 대운)' : '') + '으로 넘어가며 ' + dir + ' (' + sg(t.from) + ' → ' + sg(t.to) + (t.cond ? ', ' + t.fromCond + ' → ' + t.toCond : '') + ').';
    });
    // ── 시점: 이 구간이 지나온 30년인지, 지금 지나는 중인지, 앞으로 올 30년인지(opts.year 기준). 나이대: 대운 가운데 나이
    var bestI = scores.indexOf(Math.max.apply(null, scores)), worstI = scores.indexOf(Math.min.apply(null, scores));   // 첫 문구·근거용(30년 전체)
    var decades = items.map(function (x, j) {
      var t = dTone(x.ev.condition), st = stageOf(x.startAge), when = Y == null ? 'future' : x.startYear + 9 < Y ? 'past' : x.startYear <= Y ? 'now' : 'future';
      var text = when === 'past' ? T((st === 'teen' ? 'lc.pastTeen.' : 'lc.past.') + t, trace) : T('lc.stage.' + st + '.' + t, trace);
      return { i: a + j, j: j, startAge: x.startAge, endAge: x.startAge + 9, startYear: x.startYear, gz: M.gzName(x), cond: x.ev.condition, score: fit(x), tone: t, stage: st, when: when, text: text,
        head: x.startAge + '~' + (x.startAge + 9) + '세 ' + M.gzName(x) + ' 대운', meta: x.ev.condition + (when === 'now' ? ' · 지금' : '') + ', ' + STAGE[st].name,
        line: x.startAge + '~' + (x.startAge + 9) + '세 ' + M.gzName(x) + ' 대운(' + x.ev.condition + (when === 'now' ? ' · 지금' : '') + ', ' + STAGE[st].name + '): ' + text };
    });
    var spanWhen = decades.every(function (d) { return d.when === 'past'; }) ? 'past' : decades.some(function (d) { return d.when === 'now'; }) ? 'now' : decades.some(function (d) { return d.when === 'past'; }) ? 'now' : 'future';
    var past = spanWhen === 'past';
    // 해석에 쓰는 10년: 지나온 30년이면 전부, 아니면 아직 지나지 않은 10년만(이미 지난 10년의 기회·위험은 전략으로 말하지 않는다)
    var relD = past ? decades : decades.filter(function (d) { return d.when !== 'past'; });
    var youth = relD.filter(function (d) { return d.stage === 'teen'; }).length * 2 > relD.length;   // 해석할 10년의 절반 넘게 성장기면 어린 시절 문구
    // ── 기회·위험(점수 숫자는 판단 근거에만 둔다)
    var pickBy = function (cmp) { return relD.reduce(function (m, d) { return m == null || cmp(d.score, m.score) ? d : m; }, null); };
    var bD = pickBy(function (x, y) { return x > y; }), wD = pickBy(function (x, y) { return x < y; });
    var best = items[bD.j], worst = items[wD.j];
    var rel = relSplit([].concat.apply([], items.map(function (x) { return x.ev.relations || []; })));
    var when10 = function (d) { return d.startYear + '~' + (d.startYear + 9) + '년(' + d.startAge + '~' + d.endAge + '세) ' + d.gz + ' 대운'; };
    var grpPlain = function (x) { return GRP[grpOf(M, ch, M.stemEl(x.s))].plain; };
    var opp, risk;
    if (past) {
      opp = '돌아보면 ' + J(when10(bD), '이/가') + ' 가장 수월했던 10년이에요.';
      risk = wD.score <= CC.caution ? '돌아보면 ' + J(when10(wD), '이/가') + ' 가장 무거웠던 10년이에요(' + wD.cond + '). 그때 생긴 부담이 남아 있다면 지금 정리해 두세요.' : '돌아보면 크게 꺾였던 10년은 없었어요.';
    } else {
      var bTeen = bD.stage === 'teen', wTeen = wD.stage === 'teen';
      opp = bD.score >= CC.tailwind ? J(when10(bD), '이/가') + ' 이 구간의 기회예요. ' + (bTeen ? '이때 익힌 것이 오래 남아요.' : grpPlain(best) + ' 쪽에서 결과를 만들기 쉬워요.')
        : bD.score >= 0 ? '뚜렷하게 치고 올라가는 대운은 없지만, ' + J(when10(bD), '이/가') + ' 상대적으로 가장 수월해요.' + (bTeen ? '' : ' 큰 결정은 이 10년에 두세요.')
          : '운이 크게 밀어 주지는 않아요. 그중 ' + J(when10(bD), '이/가') + ' 가장 덜 무거워요.';
      risk = wD.score <= CC.caution ? J(when10(wD), '이/가') + ' 가장 조심할 10년이에요(' + wD.cond + '). ' + (wTeen ? '건강과 생활 리듬, 마음 상태를 먼저 챙겨 주세요.' : grpPlain(worst) + ' 쪽 무리를 줄이세요.')
        : '크게 꺾이는 대운은 없어요. 가장 낮은 때는 ' + when10(wD) + '이에요.';
      if (rel.clash.length >= 2) risk += ' ' + T(wTeen ? 'lc.rel.clashYouth' : 'lc.rel.clash', trace);
    }
    // ── ① 오행의 특징(우세 오행, 섞여 있으면 복합으로) — 비중(%)은 판단 근거에만
    var seq = items.map(function (x) { return EK[M.stemEl(x.s)] + '·' + EK[M.BR_EL[x.b]]; }).join(' → ');
    var nm = function (e) { return EL_TRAIT[e].name; };
    var mixTxt = mix === 2 ? fill('lc.span.mix', { Awa: J(nm(main), '과/와'), Bga: J(nm(second), '이/가') }, trace) + ' '
      : mix === 3 ? fill('lc.span.mix3', { Aieyo: J(nm(main), '이에요/예요') }, trace) + ' ' : '';
    var trait = mixTxt + T('lc.el.' + main + '.span', trace) + (bh ? ' 이 구간은 대운 지지가 ' + bh.name + '의 세 글자를 모두 지나서, 그 계절 기운이 30년 내내 이어져요.' : '');
    // ── ② 나에게 미치는 영향: 우세 오행의 역할(쉬운 말 + 괄호 용어) + 역할과 실제 흐름이 다를 때 그 이유(숫자 없이)
    var why = [];
    var nG = items.filter(function (x) { return dTone(x.ev.condition) === 'good'; }).length, nB = items.filter(function (x) { return dTone(x.ev.condition) === 'bad'; }).length;
    if (rvm < 0 && (fitAvg > 0 || nG) && help != null && help !== main) why.push(fill('lc.span.why.lift', { Aga: J(nm(main), '이/가'), Aeun: J(nm(main), '은/는'), B: nm(help) }, trace));
    else if (rvm > 0 && (fitAvg < 0 || nB) && drag != null && drag !== main) why.push(fill('lc.span.why.drag', { Aga: J(nm(main), '이/가'), B: nm(drag) }, trace));
    var roleVsScore = (rvm < 0 && fitAvg >= IMPACT_MIN) || (rvm > 0 && fitAvg <= -IMPACT_MIN);   // 역할 방향과 최종 평균이 반대
    if ((Math.abs(P.yong) >= IMPACT_MIN && Math.abs(fitAvg) >= IMPACT_MIN && (P.yong > 0) !== (fitAvg > 0)) || (roleVsScore && !why.length))
      why.push(fill('lc.span.why.part', { d1: P.yong > 0 || (P.yong === 0 && rvm > 0) ? '도움' : '부담', what: Math.abs(P.structure) >= Math.abs(P.relation) ? '원국에 모자란 부분을 채우거나 넘치는 부분을 키우는 작용 때문에' : '원국과 부딪치거나 묶이는 작용(합·충) 때문에', d2: fitAvg > 0 ? '좋은' : '무거운' }, trace));
    var r2 = roleOf(ch, second);
    var scene = youth ? '어린 시절에는 ' + T('lc.grpYouth.' + gi, trace)
      : past ? '그 시기에는 ' + GRP[gi].plain + ' 주제가 컸을 거예요 — ' + T('lc.grp.' + gi, trace)
        : '생활에서는 ' + GRP[gi].plain + ' 주제로 나타나요 — ' + T('lc.grp.' + gi, trace);
    var impact = '이 사주에서 ' + J(nm(main), '은/는') + ' ' + ROLE_PLAIN[role] + '(' + role + ')이에요. ' + T((past ? 'lc.rolePast.' : youth ? 'lc.roleYouth.' : 'lc.roleFx.') + role, trace) + condRoleNote(ch, main, trace)
      + (mix >= 2 ? ' 함께 많은 ' + J(nm(second), '은/는') + ' ' + ROLE_PLAIN[r2] + '(' + r2 + ')이에요.' : '')
      + ' ' + scene + (why.length ? ' ' + why.join(' ') : '') + (past ? '' : balNote(eokA, joA, tone === 'mixed' ? 'mid' : tone, trace, ch));
    // ── ③ 대응 전략: 지나온 30년은 돌아보기, 아니면 (어른 나이·한 가지 성격일 때만) 구간 전략 + 흐름 모양 + 10년별 나이에 맞는 전략
    var firstTeen = relD.length && relD[0].stage === 'teen';
    var strategyLead = past ? T('lc.span.pastLead', trace)
      : (tone !== 'mixed' && !firstTeen ? T('lc.act.' + tone + '.' + gi, trace) + ' ' : '') + T(youth ? 'lc.trendYouth' : 'lc.trend.' + trend, trace);   // 화면은 이 문단 + 10년별 목록(decades)으로 나눠 그린다
    var strategy = strategyLead + ' ' + decades.map(function (x) { return x.line; }).join(' ');
    // ── 판단 근거
    var ER = function (e) { return nm(e) + '(' + roleLabel(ch, e) + ')'; };
    var basis = [];
    basis.push('오행 비중: ' + order.filter(function (e) { return share[e] >= 0.5; }).map(function (e) { return EK[e] + ' ' + r1(share[e]) + '%'; }).join(' · ')
      + ' — 천간 40%·지지 60%, 지장간 일수와 천간의 뿌리를 흐름 점수와 같은 비율로 반영. ' + (mix === 1 ? '우세 ' + nm(main) + ' (2위와 ' + r1(gap12) + '%p 차이).' : mix === 2 ? '1·2위 차이가 ' + r1(gap12) + '%p로 ' + gapMin + '%p보다 작아 복합으로 봐요.' : '1~3위가 ' + gapMin + '%p 안이라 혼재로 봐요.'));
    basis.push('도움·부담 오행: ' + (help != null ? '가장 크게 도운 오행 ' + ER(help) + ' 평균 ' + sg(contrib[help]) + '점' : '뚜렷하게 도운 오행 없음') + ' · ' + (drag != null ? '가장 크게 누른 오행 ' + ER(drag) + ' 평균 ' + sg(contrib[drag]) + '점' : '뚜렷하게 누른 오행 없음') + ' (통합 용신 역할값 × 오행 비중을 흐름 점수로 옮긴 몫).');
    var ue = useEokbu(ch), uj = useJohu(ch);
    if (ue) basis.push(eokbuLine(ch, eokA));
    if (uj) basis.push(johuLine(ch, joA));
    if (ue && uj && ((eokA >= 8 && joA <= -8) || (eokA <= -8 && joA >= 8)))
      basis.push('억부·조후 충돌: 억부만 보면 ' + (eokA > 0 ? '유리' : '불리') + '(' + sg(eokA) + '), 조후만 보면 ' + (joA > 0 ? '유리' : '불리') + '(' + sg(joA) + ')해요. 최종 판단은 ' + ((u && u.primaryName) || '억부') + ' 우선 — ' + ((u && u.steps && u.steps[0]) || '') );
    basis.push('십성: ' + items.map(function (x) { return M.gzName(x) + ' ' + x.stemTG + '/' + x.branchTG; }).join(' · ') + ' — 중심은 ' + GRP[gi].name + '(' + GRP[gi].plain + ')이에요.');
    basis = basis.concat(relLine(rel.clash.concat(rel.harmony), span3 ? '이 30년 동안' : '이 구간 동안'));
    basis.push('통합 용신: ' + (u && u.primaryName ? u.primaryName + ' 기준, ' : '') + '우세 오행 ' + nm(main) + ' = ' + roleLabel(ch, main) + (mix >= 2 ? ', 함께 많은 ' + nm(second) + ' = ' + roleLabel(ch, second) : '') + '.');
    basis.push('점수 구성(평균): 용신 판단 ' + sg(P.yong) + (uj ? '(그중 조후 몫 ' + sg(P.johu) + ')' : '') + ' · 합충 관계 ' + sg(P.relation) + ' · 십성 균형 ' + sg(P.structure) + ' → 흐름 점수 ' + sg(fitAvg) + '.');
    basis.push('흐름 점수(기존 계산 그대로): ' + items.map(function (x) { return x.startAge + '세 ' + sg(fit(x)) + ' ' + x.ev.condition; }).join(' · ') + ' · 평균 ' + sg(fitAvg) + ' · 최저 ' + sg(scores[worstI]) + '.');
    // ── 첫 문구: 흐름 모양 + 기회·조심 10년(평균이 높아도 주의 이하 대운이 있으면 반드시 넣는다)
    var endAge = last.startAge + 9, endYear = last.startYear + 9;
    var head = { rise: '갈수록 풀리는 30년', fall: '앞에서 벌어 두는 30년', peak: '가운데 10년이 승부인 30년', valley: '버티고 다시 올라서는 30년', flat: '꾸준함이 결과가 되는 30년', short: '마지막 구간', lateDrop: '끝 10년이 꺾이는 30년' }[trend];
    var tail = [];
    items.forEach(function (x, j) {
      if (scores[j] >= CC.tailwind && j === bestI) tail.push(fill('lc.span.hook.opp', { a: x.startAge, b: x.startAge + 9 }, trace));
      if (scores[j] <= CC.caution && (j === worstI || (trend === 'lateDrop' && j === n - 1))) tail.push(fill('lc.span.hook.risk', { a: x.startAge, b: x.startAge + 9 }, trace));
    });
    if (!tail.length) tail.push(T('lc.span.hook.even', trace));
    var hook = head + ' — ' + tail.join(', ');
    // ── 핵심 결론(숫자 없이): 흐름 모양 → 가장 많은 기운 → 힘이 되는·부담이 되는 기운 → (앞으로의) 기회·조심 10년
    var sum = [fill(past ? 'lc.sum.shape.past' : 'lc.sum.shape', { a: first.startAge, b: endAge, y1: first.startYear, y2: endYear, headIeyo: J(head, '이에요/예요'), headIeotta: J(head, '이었어요/였어요') }, trace)];
    sum.push(mix === 3 ? T('lc.sum.el.mix3', trace) : fill('lc.sum.el', { Xieyo: J(mix === 2 ? nm(main) + '·' + nm(second) : nm(main), '이에요/예요') }, trace));
    var hd = help != null && drag != null ? 'both' : help != null ? 'help' : drag != null ? 'drag' : 'none';
    sum.push(fill('lc.sum.' + hd + (past ? '.past' : ''), { Hga: help != null ? J(nm(help), '이/가') : '', Dga: drag != null ? J(nm(drag), '이/가') : '' }, trace));
    if (past) { if (wD.score <= CC.caution) sum.push(fill('lc.sum.risk.past', { a: wD.startAge, b: wD.endAge }, trace)); }
    else { if (bD.score >= CC.tailwind) sum.push(fill('lc.sum.opp', { a: bD.startAge, b: bD.endAge }, trace)); if (wD.score <= CC.caution) sum.push(fill('lc.sum.risk', { a: wD.startAge, b: wD.endAge }, trace)); }
    var summary = sum.join(' ');
    return {
      kind: 'span', type: '장기 분석 구간', k: k, label: '장기 분석 구간 ' + (k + 1), idx: idx, items: items,
      startAge: first.startAge, endAge: endAge, startYear: first.startYear, endYear: endYear, years: items.length * 10,
      mainEl: main, subEl: sub, elLabel: elLabel, mix: mix, share: share, contrib: contrib, helpEl: help, dragEl: drag, parts: P,
      elCount: cnt, banghap: bh ? bh.name : null, role: role, roleLabel: roleLabel(ch, main), tone: tone, grp: gi, seq: seq,
      scores: scores, avg: fitAvg, min: scores[worstI], max: scores[bestI], trend: trend, trendWord: trendWord, turns: turns, opp: opp, risk: risk, decades: decades,
      hook: hook, when: spanWhen, youth: youth, steps: { summary: summary, trait: trait, impact: impact, strategy: strategy, strategyLead: strategyLead }, basis: basis, trace: trace, _el: EA,
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
    var impact = '이 사주에서 ' + J(EL_TRAIT[e].name, '은/는') + ' ' + role + '이에요. ' + T('lc.role.' + role, trace) + ' 2년 동안 ' + GRP[gi].plain + '(' + years.map(function (y) { return y.stemTG; }).join('·') + ') 주제가 이어져요 — ' + T('lc.grp.' + gi, trace) + balNote(eokA, joA, tone, trace, ch);
    var strategy = T('lc.act.' + tone + '.' + gi, trace);
    var basis = [].concat(useEokbu(ch) ? [eokbuLine(ch, eokA)] : [], useJohu(ch) ? [johuLine(ch, joA)] : []);   // 적용되지 않는 이론은 줄을 내지 않는다
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
