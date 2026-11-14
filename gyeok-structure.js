/* 사주 격국 분석(표시 전용) — 기본 격국(정격)·특수격·특수 오행 구조·십성 작용을 서로 다른 체계로 판정한다. 브라우저·Node 공용.
   · engine.js 를 수정하지 않는 독립 층이다. 신강신약·용신(통합 판단)·오행 비율·운세 점수에 어떤 방식으로도 더해지지 않고 읽기만 한다.
   · 취격 순서는 engine.js gyeokCore 와 같다(투출 정기→중기→여기, 없으면 정기). 여기에 합거·월령 충·복수 투출·국(局)·시주 미상을 더해
     '성립(establish)'과 '안정성(stability)'을 따로 판정하고, 근거가 부족하면 판정 유보로 남긴다.
   · 종격은 engine.js jongCore 결과를 그대로 읽는다(기준값 이중 관리 방지). 화격·전왕 1행격·오행 구조·십성 작용은 이 파일의 규칙표를 쓴다.
   · 기준 문서: docs/GYEOK_ANALYSIS_DESIGN_2026-11-15.md  검사: tests/gyeok-structure-sim.cjs
   사용: MantraGyeokStructure.analyze(Manse, chart) */
(function (G) {
  'use strict';
  var VERSION = 'gyeok-structure-20261115-1';
  var EL = ['목', '화', '토', '금', '수'], GN = ['비겁', '식상', '재성', '관성', '인성'], POSK = { year: '년', month: '월', day: '일', hour: '시' };
  var GOF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 }, TGS = Object.keys(GOF);
  var PW = { year: 0.6, month: 1, day: 0.9, hour: 0.7 }, SW = { year: 0.8, month: 1, hour: 0.8 }, HW = { main: 1, mid: 0.55, res: 0.35 };
  var WANGJI = [0, 3, 6, 9];   // 子卯午酉
  var CFG = {
    hwa: { pct: 35, root: 15 }, jeon: { pct: 50, ctrlPct: 8, help: 65, branches: 3 },
    geumsu: { sum: 55, each: 15, fire: 12, earth: 15 }, hanraeng: { sum: 55, fire: 8, temp: -0.6 },
    mokhwa: { wood: 20, fire: 18, water: 15, metal: 15 }, gije: { each: 18, diff: 12 }, sangjeon: { each: 20, wood: 10 },
    yeomjo: { sum: 60, water: 8, temp: 0.6, hum: -0.6 }, mowang: { mother: 40, self: 15 },
    sip: { gwaninHelp: 70, salinHelp: 60, saengjaeHelp: 30, paeinHelp: 65, paeinSik: 15, jaegwanHelp: 35, gunGeop: 35, gunJae: 25, jaeda: 35, jaedaHelp: 35, gwanda: 35, gwandaHelp: 35, jaepain: 15 },
    pick: { max: 3, w: [0.4, 0.35, 0.25] },
  };
  var BANNED = /반드시|무조건|성공합니다|실패합니다|망합니다|부자가 됩니다|대길|대흉|운명입니다|확정됩니다/;
  var cache = new WeakMap();

  // ── 한국어 조사 ──
  var bat = function (w) { var c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  var rieul = function (w) { var c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 === 8; };
  var J = { 은: function (w) { return w + (bat(w) ? '은' : '는'); }, 이: function (w) { return w + (bat(w) ? '이' : '가'); }, 을: function (w) { return w + (bat(w) ? '을' : '를'); }, 로: function (w) { return w + (bat(w) && !rieul(w) ? '으로' : '로'); }, 과: function (w) { return w + (bat(w) ? '과' : '와'); } };

  // ───────── 문안(생활밀착형 존댓말) ─────────
  var JEONG_TXT = {
    정관: { easy: '규칙과 신뢰를 바탕으로 자리를 잡아 가는 구조입니다.', act: '월령의 정관이 중심이라 정해진 틀 안에서 책임을 맡고 인정받을 때 힘이 잘 모입니다. 약속·평판·직함 같은 공식적인 신뢰가 삶의 기준점이 되기 쉽습니다.',
      good: ['재성(현실 감각)이나 인성(배움·자격)이 함께 있으면 맡은 자리를 오래 지키는 힘이 됩니다.', '규칙이 분명한 조직·제도 안에서 차근차근 쌓을 때 장점이 잘 드러납니다.'], bad: ['상관(거침없는 말과 반발)이 정관과 부딪히면 윗사람·규칙과 마찰이 잦아질 수 있습니다.', '편관이 섞이면 기준이 둘로 갈려 책임이 겹치고 부담이 커질 수 있습니다.'] },
    편관: { easy: '압박과 긴장을 다스리며 힘을 키우는 구조입니다.', act: '월령의 편관(칠살)이 중심이라 경쟁·마감·위기 같은 강한 압력이 자주 찾아오고, 그것을 다루는 방식이 곧 실력이 됩니다.',
      good: ['식신(실행력)이 압박을 눌러 주거나 인성(배움·보호)이 압박을 받아 줄 때 추진력으로 바뀝니다.', '책임과 권한이 분명한 자리에서 위기 대응력이 돋보입니다.'], bad: ['재성이 편관을 키우는데 다스릴 힘이 없으면 과로와 스트레스가 쌓이기 쉽습니다.', '정관이 섞이면 지시가 엇갈리듯 마음이 둘로 갈릴 수 있습니다.'] },
    정재: { easy: '꾸준히 관리하고 모으는 힘이 중심인 구조입니다.', act: '월령의 정재가 중심이라 생활 감각·계산·성실한 관리가 삶의 바탕이 됩니다. 들어오고 나가는 것을 정리하는 습관이 안정감을 줍니다.',
      good: ['관성이 재를 받아 주면 관리 능력이 신용·직책으로 이어지기 쉽습니다.', '식상이 재를 낳아 주면 일한 만큼 결과가 쌓이는 흐름이 생깁니다.'], bad: ['비겁(경쟁자·동료)이 강하면 나눠 쓰거나 빼앗기는 일이 생기기 쉽습니다.', '월지가 충을 받으면 생활 기반이 자주 바뀔 수 있습니다.'] },
    편재: { easy: '기회를 넓게 보고 크게 움직이는 힘이 중심인 구조입니다.', act: '월령의 편재가 중심이라 사람·시장·흐름을 넓게 보고 움직일 때 기회가 잘 보입니다. 정해진 몫보다 판을 키우는 감각이 돋보이기 쉽습니다.',
      good: ['관성이 재를 받아 주면 벌인 일이 신용과 자리로 이어지기 쉽습니다.', '식상이 재를 낳아 주면 아이디어가 실제 거래로 이어지기 쉽습니다.'], bad: ['비겁이 강하면 벌어들인 만큼 나가는 일이 잦을 수 있습니다.', '일간이 약한데 재가 크면 일을 벌여 놓고 감당이 버거울 수 있습니다.'] },
    식신: { easy: '좋아하는 일을 꾸준히 만들어 내는 힘이 중심인 구조입니다.', act: '월령의 식신이 중심이라 손으로 만들고, 먹이고, 가르치는 식의 내놓는 힘이 자연스럽습니다. 여유와 즐거움을 지킬 때 결과물이 좋아집니다.',
      good: ['재성이 이어지면 만든 것이 수입으로 연결되기 쉽습니다(식신생재).', '편관이 있을 때 식신이 다스려 주면 압박을 실력으로 바꿉니다(식신제살).'], bad: ['편인이 식신을 가로막으면 하고 싶은 일이 자주 끊기거나 의욕이 꺾일 수 있습니다.'] },
    상관: { easy: '표현하고 바꾸는 재주가 중심인 구조입니다.', act: '월령의 상관이 중심이라 말·글·기술로 기존 방식을 고치고 새로 보여 주는 힘이 강합니다. 틀에 갇히면 답답함을 크게 느끼기 쉽습니다.',
      good: ['재성으로 이어지면 재주가 결과물·수입이 됩니다(상관생재).', '인성이 다듬어 주면 날카로운 재주가 전문성으로 정리됩니다(상관패인).'], bad: ['정관과 부딪히면 윗사람·제도와 마찰이 생기기 쉽습니다(상관견관).'] },
    정인: { easy: '배우고 보살피며 기반을 다지는 힘이 중심인 구조입니다.', act: '월령의 정인이 중심이라 공부·자격·어른의 도움처럼 나를 받쳐 주는 기반이 중요합니다. 충분히 이해하고 준비한 뒤 움직일 때 안정적입니다.',
      good: ['관성이 인성을 낳아 주면 배움이 자리·인정으로 이어집니다(관인상생).'], bad: ['재성이 강하면 공부·준비가 현실 문제에 자주 끊길 수 있습니다(재파인).', '인성이 지나치면 생각만 길어지고 실행이 늦어질 수 있습니다.'] },
    편인: { easy: '남다른 시각과 깊은 몰입이 중심인 구조입니다.', act: '월령의 편인이 중심이라 남들이 잘 보지 않는 분야를 깊게 파고드는 직관·전문성이 돋보이기 쉽습니다.',
      good: ['편관이 있을 때 편인이 받아 주면 압박을 전문성으로 바꿉니다(살인상생).', '재성이 적당히 눌러 주면 생각이 현실 감각과 균형을 이룹니다.'], bad: ['식신이 편인에게 막히면 시작한 일을 마무리하기 어려울 수 있습니다(도식).'] },
    건록: { easy: '스스로 서는 힘이 중심인 구조입니다.', act: '월령이 일간과 같은 기운이라 자립심과 버티는 힘이 바탕입니다. 이 힘을 어디에 쓰느냐(재·관·식상)가 격의 쓰임을 정합니다.',
      good: ['관성이 방향을 잡아 주거나 재성·식상으로 힘을 쓸 곳이 있으면 자립심이 성과로 이어집니다.'], bad: ['쓸 곳(재·관·식상)이 천간에 없으면 힘이 남아 고집·독주로 흐르기 쉽습니다.'] },
    양인: { easy: '강한 추진력과 승부욕이 중심인 구조입니다.', act: '월령이 일간의 가장 강한 자리(양인)라 밀어붙이는 힘이 큽니다. 이 힘을 다스려 줄 관살이 있을 때 결단력으로 쓰입니다.',
      good: ['편관·정관이 양인을 제어해 주면 위기 상황에서 결단력이 빛납니다.'], bad: ['다스릴 관살이 없으면 성급함·충돌로 이어지기 쉽습니다.'] },
    월겁: { easy: '곁의 사람과 경쟁하며 힘을 키우는 구조입니다.', act: '월령이 일간과 같은 오행의 다른 음양(겁재)이라 동료·경쟁자와의 관계 속에서 힘이 움직입니다.',
      good: ['관성이 질서를 잡거나 식상으로 기운을 풀어 주면 경쟁심이 실행력으로 바뀝니다.'], bad: ['쓸 곳이 없으면 나눠 쓰고 부딪히는 일이 늘 수 있습니다.'] },
  };
  var JEON_NAME = ['곡직격', '염상격', '가색격', '종혁격', '윤하격'];
  var JEON_EASY = ['곧게 뻗어 자라는 나무처럼 한 방향으로 성장하는 힘이 모인 구조입니다.', '타오르는 불처럼 드러내고 밝히는 힘이 모인 구조입니다.', '넓은 땅처럼 받아들이고 키우는 힘이 모인 구조입니다.', '단단한 쇠처럼 고치고 다듬는 힘이 모인 구조입니다.', '흐르는 물처럼 스며들고 모으는 힘이 모인 구조입니다.'];
  var JONG_WORD = { 종아격: '재능과 표현', 종재격: '재물과 현실', 종살격: '조직과 책임', 종왕격: '자기 세력', 종강격: '배움과 보호' };
  var ITEM_TXT = {
    geumsu: { short: '맑은 판단력과 깔끔한 정리 감각', easy: '금과 수가 맑게 어울려 생각이 깔끔하고 판단이 빠른 구조입니다.', act: '금(정리·원칙)이 수(지혜·흐름)를 낳아 머리가 맑고 말과 글이 정돈되는 쪽으로 작용합니다. 복잡한 일을 단순하게 정리하는 데 강점이 있습니다.',
      good: ['따뜻한 기운(화)이 조금 더해지면 차갑던 맑음이 사람을 끄는 매력으로 바뀝니다.'], bad: ['토가 많아지면 맑던 물이 흐려지듯 판단이 둔해질 수 있습니다.', '지나치게 냉정해 보여 관계에서 거리감이 생길 수 있습니다.'] },
    hanraeng: { short: '차가운 기운으로 몸과 마음이 움츠러드는 쪽', easy: '쇠와 물이 한겨울에 몰려 사주가 차가운 구조입니다.', act: '겨울에 금·수가 많아 기운이 아래로 가라앉기 쉽습니다. 생각은 깊지만 행동이 늦거나 몸이 차고 쉽게 지치는 쪽으로 나타날 수 있습니다.',
      good: ['화(따뜻함) 기운이 들어오는 시기·환경에서 움츠렸던 힘이 풀립니다.', '햇볕·운동·따뜻한 사람 관계처럼 생활 속 온기를 챙기면 도움이 됩니다.'], bad: ['차가운 기운이 더해지면 의욕 저하·고립감이 커질 수 있습니다.'] },
    mokhwa: { short: '배운 것을 밝게 드러내는 표현력', easy: '나무가 불을 밝혀 재능이 환하게 드러나는 구조입니다.', act: '목 일간이 화(표현·발산)로 기운을 내보내 생각과 재능이 밖으로 잘 보입니다. 가르치고 발표하고 보여 주는 일에서 빛나기 쉽습니다.',
      good: ['나무를 키우는 수가 적당하면 지치지 않고 오래 빛납니다.'], bad: ['수가 많아 불을 끄거나 금이 나무를 베면 재능이 드러나다 말 수 있습니다.', '너무 태우면 체력을 소모하니 쉬는 리듬이 필요합니다.'] },
    gije: { short: '열정과 침착함의 균형', easy: '물과 불이 균형을 이뤄 열정과 침착함이 함께 있는 구조입니다.', act: '화(열정·표현)와 수(사고·절제)가 비슷한 힘으로 있어 한쪽으로 치우치지 않고 상황에 따라 조절하는 힘이 됩니다.',
      good: ['목이 물과 불 사이를 이어 주면 두 힘이 서로 돕는 흐름이 됩니다.'], bad: ['子午·巳亥처럼 물과 불이 직접 부딪히는 글자가 운에서 들어오면 감정 기복이 커질 수 있습니다.'] },
    sangjeon: { short: '물과 불이 부딪히는 긴장', easy: '물과 불이 정면으로 부딪혀 마음속 긴장이 큰 구조입니다.', act: '수와 화가 충으로 맞서 있어 이성과 감정, 멈춤과 질주가 자주 엇갈릴 수 있습니다.',
      good: ['목 기운이 들어와 둘을 이어 주면(통관) 긴장이 추진력으로 바뀝니다.'], bad: ['충이 겹치는 시기에는 결정이 흔들리거나 갈등이 커질 수 있습니다.'] },
    yeomjo: { short: '뜨겁고 메마른 기운', easy: '불과 흙이 많고 물이 적어 사주가 뜨겁고 메마른 구조입니다.', act: '열정과 고집이 강하게 쌓이는 대신 식혀 줄 수가 적어 성급해지거나 몸이 쉽게 건조·과열될 수 있습니다.',
      good: ['수(물) 기운이 들어오는 시기·환경에서 균형이 잡힙니다.', '충분한 수면과 수분, 서두르지 않는 일정이 생활 속 보완이 됩니다.'], bad: ['불이 더해지면 과열·조급함이 커질 수 있습니다.'] },
    mowang: { short: '도움이 너무 많아 내 힘이 묻히는 쪽', easy: '', act: '나를 돕는 기운(인성)이 지나쳐 오히려 내 색깔이 가려지기 쉽습니다. 생각·준비·의존이 길어지고 스스로 결정하는 힘이 약해질 수 있습니다.',
      good: ['재성이 넘치는 인성을 덜어 주거나 비겁이 일간을 곁에서 받쳐 주면 균형이 잡힙니다.'], bad: ['인성이 더 들어오면 우유부단함이나 실행 지연이 커질 수 있습니다.'] },
    gwanin: { short: '인정받은 것을 배움으로 다지는 흐름', easy: '책임(관성)이 배움(인성)으로 이어지고, 배움이 다시 나를 받쳐 주는 흐름입니다.', act: '맡은 역할과 평판이 공부·자격·보호로 이어져 조직이나 제도 안에서 꾸준히 올라가는 힘이 됩니다.',
      good: ['윗사람·기관과의 관계를 잘 다질수록 도움이 커집니다.'], bad: ['재성이 인성을 깨면 바쁜 현실 때문에 준비가 끊길 수 있습니다.'] },
    salin: { short: '압박을 실력으로 바꾸는 힘', easy: '강한 압박(편관)을 배움·인내(인성)가 받아 내 힘으로 바꾸는 흐름입니다.', act: '어려운 과제나 경쟁이 오면 공부·기술로 버티며 실력이 커지는 쪽으로 작용합니다. 위기 때 더 단단해지는 모습입니다.',
      good: ['전문성을 쌓는 환경에서 압박이 성장 동력이 됩니다.'], bad: ['인성이 끊기면 압박이 그대로 스트레스로 남을 수 있습니다.'] },
    jesal: { short: '실행력으로 압박을 다스리는 힘', easy: '꾸준한 실행력(식신)이 거친 압박(편관)을 눌러 주는 흐름입니다.', act: '문제가 생기면 피하기보다 손을 움직여 해결하는 쪽으로 작용합니다. 경쟁·위기 상황에서 실무 능력이 돋보입니다.',
      good: ['재성으로 식신을 살려 주면 해결한 만큼 결과가 남습니다.'], bad: ['편인이 식신을 막으면 다스리던 압박이 다시 커질 수 있습니다.'] },
    saengjae: { short: '재주가 수입으로 이어지는 흐름', easy: '', act: '하는 일과 버는 일이 이어지기 쉬워, 실력을 결과물로 보여 줄수록 기회가 늘어납니다.',
      good: ['일간이 버틸 힘이 있으면 흐름이 오래 이어집니다.'], bad: ['편인이 식상을 막으면 시작한 일이 결과로 이어지기 전에 끊길 수 있습니다.', '일간이 약하면 일을 벌인 만큼 지치기 쉽습니다.'] },
    paein: { short: '날카로운 재주를 다듬는 힘', easy: '튀는 재주(상관)를 배움·원칙(인성)이 다듬어 주는 흐름입니다.', act: '표현력이 강하지만 공부·자격이 받쳐 주어 말과 행동에 근거가 생깁니다. 전문가로 인정받는 쪽으로 작용합니다.',
      good: ['자격·학위·기술 인증처럼 형식을 갖출수록 재주가 신뢰로 바뀝니다.'], bad: ['재성이 인성을 깨면 다듬는 힘이 약해져 말이 앞설 수 있습니다.'] },
    jaegwan: { short: '현실 성과가 자리·신용으로 이어지는 흐름', easy: '벌어들이고 관리한 것(재성)이 자리·신용(관성)으로 이어지는 흐름입니다.', act: '성실한 관리와 성과가 직책·평판으로 연결되기 쉬워 조직이나 사회적 지위를 쌓는 데 유리합니다.',
      good: ['일간이 버틸 힘이 있을 때 맡는 책임을 감당하기 좋습니다.'], bad: ['상관이 관을 치면 쌓은 신용이 말 한마디로 흔들릴 수 있습니다.'] },
    gyeongwan: { short: '규칙·윗사람과의 마찰', easy: '거침없는 표현(상관)이 규칙·윗사람(정관)과 부딪히는 구조입니다.', act: '옳다고 생각하면 바로 말하는 성향이 조직의 틀과 충돌하기 쉽습니다. 평가·계약·공식 관계에서 마찰이 생길 수 있습니다.',
      good: ['인성(배움·원칙)이나 재성(성과)으로 표현을 이어 주면 날카로움이 개선 제안으로 받아들여집니다.'], bad: ['감정이 앞설 때 공식 문서·평판 문제로 번지지 않게 주의가 필요합니다.'] },
    honjap: { short: '기준이 둘로 갈리는 부담', easy: '정관과 편관이 함께 드러나 따라야 할 기준이 둘로 갈리는 구조입니다.', act: '책임과 압박이 여러 방향에서 들어와 무엇을 먼저 할지 헷갈리거나 맡은 일이 겹치기 쉽습니다.',
      good: ['식신으로 한쪽을 정리하거나 인성으로 압박을 받아 주면 우선순위가 잡힙니다.'], bad: ['관성이 더 들어오는 시기에는 과부하와 결정 피로가 커질 수 있습니다.'] },
    gungeop: { short: '나눠 갖고 경쟁하는 재물 관계', easy: '비겁(동료·경쟁자)이 많아 적은 재성을 두고 다투는 구조입니다.', act: '함께하는 사람이 많은 만큼 돈·기회를 나누거나 빼앗기는 장면이 생기기 쉽습니다. 동업·보증·공동 지출에서 특히 드러납니다.',
      good: ['관성이 질서를 잡아 주거나 식상으로 경쟁심을 생산으로 돌리면 협력이 됩니다.'], bad: ['비겁이 더 들어오는 시기에는 지출·분쟁이 늘 수 있습니다.'] },
    hyosin: { short: '하고 싶은 일이 끊기는 패턴', easy: '편인이 식신을 가로막아 즐겁게 하던 일이 자주 끊기는 구조입니다.', act: '생각과 걱정이 실행을 붙잡아 시작은 하되 마무리가 어려울 수 있습니다. 먹는 것·쉬는 것 같은 생활 리듬도 흔들리기 쉽습니다.',
      good: ['재성이 편인을 눌러 주면 실행의 흐름이 살아납니다.'], bad: ['편인이 더 들어오는 시기에는 의욕 저하가 커질 수 있습니다.'] },
    jaeda: { short: '벌일 일에 비해 버틸 힘이 모자란 쪽', easy: '재성이 많은데 일간의 힘이 약해 감당이 버거운 구조입니다.', act: '기회와 할 일은 많이 보이지만 체력·자원이 따라가지 못해 무리하기 쉽습니다.',
      good: ['비겁(동료)이나 인성(지원)이 들어오면 감당할 힘이 생깁니다.'], bad: ['재성이 더 들어오는 시기에는 욕심만큼 지칠 수 있어 규모 조절이 필요합니다.'] },
    gwanda: { short: '책임과 압박이 넘치는 쪽', easy: '관성이 많은데 일간의 힘이 약해 책임과 압박이 버거운 구조입니다.', act: '해야 할 일·지켜야 할 규칙이 많아 늘 긴장 속에 있기 쉽습니다.',
      good: ['인성이 압박을 받아 주거나 식상이 눌러 주면 숨통이 트입니다.'], bad: ['관성이 더 들어오는 시기에는 휴식과 스트레스 관리가 중요합니다.'] },
  };
  var MOWANG_NAME = ['수다목표', '목다화식', '화다토초', '토다금매', '금다수탁'];   // 일간 오행별(목·화·토·금·수)
  var EST_LABEL = { firm: '성립', weak: '약하게 성립', multi: '복수 후보', hold: '판정 유보' };
  var STAB_LABEL = { seong: '안정(성격)', rescued: '구응으로 유지', plain: '보통', pa: '불안정(패격)', hold: '판정 유보' };
  var SP_LABEL = { jin: '성립', ga: '가능성(판정 유보)', hold: '판정 유보', none: '불성립' };

  // ── 십성 힘(0~3): gyeokguk.js 와 같은 식 ──
  function power(M, ch) {
    var d = ch.pillars.day.s, per = {}, monthMain = M.tenGod(d, M.mainHidden(ch.pillars.month.b));
    TGS.forEach(function (t) { per[t] = { vis: 0, hid: 0, at: [] }; });
    ['year', 'month', 'hour'].forEach(function (k) { var p = ch.pillars[k]; if (!p) return; var t = M.tenGod(d, p.s); per[t].vis += SW[k]; per[t].at.push(k); });
    ['year', 'month', 'day', 'hour'].forEach(function (k) { var p = ch.pillars[k]; if (!p) return; var h = M.HIDDEN[p.b]; h.forEach(function (x, i) { var role = i === h.length - 1 ? 'main' : (i === 0 && h.length === 3 ? 'res' : 'mid'); per[M.tenGod(d, x[0])].hid += PW[k] * HW[role]; }); });
    var lvl = {}; TGS.forEach(function (t) { var p = per[t], touched = p.vis > 0, rooted = p.hid >= 0.5, v = touched && rooted ? 3 : (!touched && monthMain === t) ? 3 : (touched || p.hid >= 0.9) ? 2 : p.hid > 0 ? 1 : 0; if (v > 1 && ch.weights.tgPct[t] < 3) v = 1; lvl[t] = v; p.touched = touched; });
    return { per: per, lvl: lvl };
  }

  function ctxOf(M, ch) {
    var d = ch.pillars.day.s, dEl = M.stemEl(d), P = power(M, ch), rel = ch.relations || [];
    var L = function (t) { return P.lvl[t]; }, gl = function (g) { return Math.max.apply(null, TGS.filter(function (t) { return GOF[t] === g; }).map(L)); };
    var touchedG = function (g) { return TGS.some(function (t) { return GOF[t] === g && P.per[t].touched; }); };
    var stemOthers = ['year', 'month', 'hour'].filter(function (k) { return ch.pillars[k]; });
    // 합거는 붙어 있는 자리(년-월, 월-일, 일-시)의 천간합만 본다. 년간-시간처럼 떨어진 합(요합)은 힘이 약해 합거로 보지 않는다.
    var ORD = ['year', 'month', 'day', 'hour'], adjPair = function (r) { return Math.abs(ORD.indexOf(r.members[0]) - ORD.indexOf(r.members[1])) === 1; };
    var hapOther = function (k) { return rel.filter(function (r) { return r.kind === 'stem' && r.type === '천간합' && r.members.indexOf(k) >= 0 && r.members.indexOf('day') < 0 && adjPair(r); }); };
    var hapDay = function (k) { return rel.some(function (r) { return r.kind === 'stem' && r.type === '천간합' && r.members.indexOf(k) >= 0 && r.members.indexOf('day') >= 0; }); };
    // 월령을 깨는 요인은 충만 본다. 두 글자 형(丑戌·寅巳 등)은 삼형이 다 갖춰지지 않은 경우가 많아 참고로만 적는다.
    var monthClash = rel.filter(function (r) { return r.kind === 'branch' && r.members.indexOf('month') >= 0 && r.type === '충'; });
    var monthHyung = rel.filter(function (r) { return r.kind === 'branch' && r.members.indexOf('month') >= 0 && r.type === '형' && !/자형/.test(r.name || ''); });
    var monthHap = rel.filter(function (r) { return r.kind === 'branch' && r.members.indexOf('month') >= 0 && ['육합', '삼합', '방합', '반합'].indexOf(r.type) >= 0; });
    var root = M.analyzeNatalRoot ? M.analyzeNatalRoot(ch) : { natalRootScore: 0 };
    return { monthHyung: monthHyung, d: d, dEl: dEl, P: P, L: L, gl: gl, touchedG: touchedG, rel: rel, stemOthers: stemOthers, hapOther: hapOther, hapDay: hapDay, monthClash: monthClash, monthHap: monthHap,
      G: ch.weights.groups, pct: ch.weights.pct, help: ch.strength.help, hasHour: ch.hourKnown !== false && !!ch.pillars.hour, rootScore: root.natalRootScore || 0,
      grpEl: function (g) { return (dEl + g) % 5; }, elGrp: function (e) { return ((e - dEl) % 5 + 5) % 5; } };
  }
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  var tgJ = function (M, s, tg, j) { return M.STEM[s] + '(' + tg + ')' + (j === '이' ? (bat(tg) ? '이' : '가') : j); };
  var shortOf = function (t) { var m = /\(([^()]+)\)$/.exec(t); return m ? m[1] : t; };
  var uniqNames = function (rs) { var seen = {}, out = []; rs.forEach(function (r) { var k = r.type + ':' + r.members.slice().sort().join(','); if (!seen[k]) { seen[k] = 1; out.push(r.name); } }); return out.join('·'); };
  var posList = function (ks) { return ks.map(function (k) { return POSK[k] + '간'; }).join('·'); };

  // ───────── A. 기본 격국(정격) ─────────
  function nameOf(tg, d) { return tg === '비견' ? '건록격' : tg === '겁재' ? (d % 2 === 0 ? '양인격' : '월겁격') : tg + '격'; }
  function txtKey(tg, d) { return tg === '비견' ? '건록' : tg === '겁재' ? (d % 2 === 0 ? '양인' : '월겁') : tg; }
  function jeongGyeok(M, ch, C) {
    var d = C.d, mb = ch.pillars.month.b, H = M.HIDDEN[mb];
    var order = H.map(function (x, i) { return { stem: x[0], role: i === H.length - 1 ? '정기' : (i === 0 && H.length === 3 ? '여기' : '중기') }; }).reverse();
    var sar = ch.saryeong || null;
    order.forEach(function (o) {
      o.tg = M.tenGod(d, o.stem); o.name = nameOf(o.tg, d); o.group = GOF[o.tg];
      o.at = C.stemOthers.filter(function (k) { return ch.pillars[k].s === o.stem; });
      o.exposed = o.at.length > 0;
      o.hapGeo = o.exposed && o.at.every(function (k) { return C.hapOther(k).length > 0; });
      o.hapDay = o.at.some(function (k) { return C.hapDay(k); });
      o.saryeong = !!(sar && sar.stem === o.stem);
    });
    var basis = [], reasons = [], cands = [], est;
    basis.push('월지 ' + M.BR[mb] + '의 지장간: ' + H.map(function (x) { return M.STEM[x[0]] + '(' + M.tenGod(d, x[0]) + ')'; }).join(' · ') + (sar ? ' — 사령 ' + M.STEM[sar.stem] + '(' + sar.label + ', 절입 ' + sar.day + '일째)' : ''));
    var exposed = order.filter(function (o) { return o.exposed; }), live = exposed.filter(function (o) { return !o.hapGeo; });
    var pick, method;
    if (live.length) { pick = live[0]; method = '투출'; }
    else if (exposed.length) { pick = exposed[0]; method = '투출(합거)'; }
    else { pick = order[0]; method = '정기'; }
    exposed.filter(function (o) { return o.hapGeo; }).forEach(function (o) {
      var hp = C.hapOther(o.at[0])[0];
      basis.push(o.role + ' ' + tgJ(M, o.stem, o.tg, '이') + ' ' + posList(o.at) + '에 투출했지만 ' + (hp ? hp.name : '천간합') + '으로 다른 글자에 묶여(합거) 격의 힘이 약합니다' + (o !== pick ? ' → 다음 후보로 넘깁니다' : ''));
    });
    if (method === '정기') basis.push('천간에 투출한 월지 지장간이 없어 월령 정기 ' + M.STEM[pick.stem] + '(' + pick.tg + ')로 격을 정합니다(월령 본기 취격).');
    else basis.push(pick.role + ' ' + tgJ(M, pick.stem, pick.tg, '이') + ' ' + posList(pick.at) + '에 투출 → ' + pick.name + '을 대표로 정합니다(투출 우선: 정기→중기→여기).');
    if (pick.hapDay) basis.push('격신이 일간과 천간합을 이룹니다(합아). 일간과의 합은 합거로 보지 않아 격을 그대로 유지합니다.');
    // 월겁(건록·양인·월겁) 격용
    var use = null;
    if (pick.group === 0) {
      use = ['정관', '편관', '정재', '편재', '식신', '상관'].filter(function (t) { return C.P.per[t].touched; }).sort(function (a, b) { return C.L(b) - C.L(a); })[0] || null;
      basis.push('월령 정기가 ' + pick.tg + (bat(pick.tg) ? '이라 ' : '라 ') + pick.name + '이며, 격의 쓰임은 천간에 드러난 재·관·식상으로 봅니다 → ' + (use ? use + ' 투출' : '천간에 드러난 재·관·식상 없음'));
    }
    // ── 성립 판정 ──
    if (method === '투출(합거)') { est = 'hold'; reasons.push('투출한 격신이 합거되고 다른 투출 후보가 없어 격을 세우기 어렵습니다.'); }
    else if (method === '정기') {
      est = 'weak';
      if (C.monthClash.some(function (r) { return r.type === '충'; })) { est = 'hold'; reasons.push('투출이 없는데 월지가 충(' + uniqNames(C.monthClash.filter(function (r) { return r.type === '충'; })) + ')을 받아 월령 본기마저 흔들립니다.'); }
      if (!C.hasHour) { est = 'hold'; reasons.push('태어난 시간을 몰라 시간(時干)에 월지 지장간이 투출했는지 알 수 없습니다.'); }
    } else {
      est = pick.at.indexOf('month') >= 0 || C.L(pick.tg) === 3 ? 'firm' : 'weak';
      if (est === 'weak') reasons.push('격신이 월간이 아닌 ' + posList(pick.at) + '에만 드러나고 지지의 뿌리가 약해 격의 힘이 약한 편입니다.');
    }
    if (pick.group === 0 && !use && est !== 'hold') { est = 'hold'; reasons.push('건록·양인·월겁격인데 격의 쓰임(재·관·식상)이 천간에 없어 격의 방향을 정하기 어렵습니다.'); }
    // ── 기준 충돌 → 복수 후보 ──
    if (est !== 'hold') {
      var jeongi = order[0];
      if (WANGJI.indexOf(mb) >= 0 && pick.role !== '정기' && method === '투출') {
        cands.push({ name: jeongi.name, tg: jeongi.tg, stem: M.STEM[jeongi.stem], role: '정기', why: M.BR[mb] + '월은 왕지(子午卯酉)라 정기 위주로 보는 견해에서는 ' + jeongi.name + '입니다.' });
        reasons.push('왕지(' + M.BR[mb] + ')에서 정기가 아닌 ' + J.이(pick.role) + ' 투출해, 투출 우선 기준(' + pick.name + ')과 왕지 정기 기준(' + jeongi.name + ')이 갈립니다.');
      }
      var nonJ = live.filter(function (o) { return o.role !== '정기'; });
      if (!jeongi.exposed && nonJ.length >= 2) {
        var sp = nonJ.filter(function (o) { return o.saryeong; })[0];
        if (sp && sp !== pick) { var prev = pick; pick = sp; basis.push('중기·여기가 함께 투출해 사령 글자 ' + M.STEM[sp.stem] + '(' + sp.role + ')을 대표로 올립니다.'); cands.push({ name: prev.name, tg: prev.tg, stem: M.STEM[prev.stem], role: prev.role, why: '투출 순서(중기 우선)로는 ' + prev.name + '입니다.' }); }
        else { var other = nonJ.filter(function (o) { return o !== pick; })[0]; cands.push({ name: other.name, tg: other.tg, stem: M.STEM[other.stem], role: other.role, why: other.role + '도 ' + posList(other.at) + '에 투출했습니다.' }); }
        reasons.push('정기가 투출하지 않고 중기·여기가 함께 투출해 격 후보가 둘입니다.');
      }
      C.monthHap.filter(function (r) { return (r.type === '삼합' || r.type === '방합') && r.el != null && r.el !== M.stemEl(pick.stem); }).forEach(function (r) {
        var st = C.stemOthers.filter(function (k) { return M.stemEl(ch.pillars[k].s) === r.el; })[0];
        if (!st) return;
        var tg = M.tenGod(d, ch.pillars[st].s); if (GOF[tg] === pick.group) return;
        cands.push({ name: nameOf(tg, d), tg: tg, stem: M.STEM[ch.pillars[st].s], role: '국(局)', why: r.name + '이 월지를 끌어들이고 그 오행이 ' + POSK[st] + '간에 드러나, 국의 기운으로 격을 보는 견해에서는 ' + nameOf(tg, d) + '입니다.' });
        reasons.push('월지가 ' + r.name + '을 이루고 그 오행(' + EL[r.el] + ')이 천간에 드러나 월령의 기운이 바뀔 수 있습니다.');
      });
      if (cands.length) est = 'multi';
    }
    if (C.monthHap.length && !C.monthHap.some(function (r) { return r.type === '삼합' || r.type === '방합'; })) basis.push('월지가 ' + C.monthHap.map(function (r) { return r.name; }).join('·') + '을 이룹니다. 육합·반합은 격을 바꾸지 않고 참고로만 봅니다.');
    var res = { name: pick.name, tg: pick.tg, group: pick.group, groupName: GN[pick.group], el: C.grpEl(pick.group), stem: M.STEM[pick.stem], role: pick.role, at: pick.at.map(function (k) { return POSK[k] + '간'; }), method: method,
      establish: est, establishLabel: EST_LABEL[est], use: use, basis: basis, reasons: reasons, candidates: cands, txt: JEONG_TXT[txtKey(pick.tg, d)],
      order: order.map(function (o) { return { stem: M.STEM[o.stem], role: o.role, tg: o.tg, exposedAt: o.at.map(function (k) { return POSK[k] + '간'; }), hapGeo: o.hapGeo, saryeong: o.saryeong }; }) };
    res.stability = stability(M, ch, C, res);
    return res;
  }

  // ── 안정성: 상신·파격 요인·구응 (engine gyeokCore 의 표 + 공통 합충 요인) ──
  function stability(M, ch, C, J0) {
    var L = C.L, gl = C.gl, key = J0.group === 0 ? 'wolgeop' : J0.tg;
    var jaeP = gl(2) >= 2, inP = gl(4) >= 2, gwanP = gl(3) >= 2, sikP = gl(1) >= 2, biP = gl(0) >= 2;
    var sang = [], pa = [];
    if (key === '정관') { sang.push(['재성이 관을 낳아 줌(재생관)', jaeP, 2], ['인성이 관을 지켜 줌(관인상생)', inP, 4]); pa.push(['상관이 정관을 해침(상관견관)', L('상관') >= 2, 1, ['인성이 상관을 눌러 줌(상관패인)', inP]], ['편관이 섞여 관살혼잡', L('편관') >= 2, 3, ['식신이 편관을 눌러 줌(식신제살)', L('식신') >= 2]]); }
    else if (key === '편관') { sang.push(['식신이 칠살을 제어함(식신제살)', L('식신') >= 2, 1], ['인성이 칠살을 받아 풀어 줌(살인상생)', inP, 4]); pa.push(['재성이 칠살을 키우는데 제어가 없음(재자약살)', gl(2) >= 3 && L('식신') < 2, 2, ['인성이 살을 받아 줌(살인상생)', inP]], ['정관이 섞여 관살혼잡', L('정관') >= 2, 3, ['식신이 칠살을 눌러 줌(식신제살)', L('식신') >= 2]], ['편인이 식신을 가로막음(효신탈식)', L('편인') >= 2 && L('식신') >= 2, 4, ['재성이 편인을 눌러 줌(재제효)', jaeP]]); }
    else if (key === '정재' || key === '편재') { sang.push(['관성이 재를 받아 줌(재생관)', gwanP, 3], ['식상이 재를 낳아 줌(식상생재)', sikP, 1]); pa.push(['비겁이 재를 빼앗음(비겁탈재)', biP, 0, ['관성이 비겁을 눌러 줌(관제비겁)', gwanP]]); }
    else if (key === '식신') { sang.push(['재성으로 식신의 기운을 이어 줌(식신생재)', jaeP, 2], ['편관을 식신이 제어함(식신제살)', L('편관') >= 2, 3]); pa.push(['편인이 식신을 가로막음(효신탈식)', L('편인') >= 2, 4, ['재성이 편인을 눌러 줌(재제효)', jaeP]]); }
    else if (key === '상관') { sang.push(['재성으로 상관의 기운을 이어 줌(상관생재)', jaeP, 2], ['인성이 상관을 다듬어 줌(상관패인)', inP, 4]); pa.push(['정관을 상관이 해침(상관견관)', L('정관') >= 2, 3, ['인성이 상관을 눌러 줌(상관패인)', inP]]); }
    else if (key === '정인') { sang.push(['관성이 인성을 낳아 줌(관인상생)', gwanP, 3]); pa.push(['재성이 인성을 깨뜨림(재파인)', gl(2) >= 3, 2, ['비겁이 재성을 막아 줌(비겁 보호)', biP]], ['인성이 지나치게 많음(인다)', gl(4) >= 3 && C.G[4] >= 35, 4, ['재성이 인성을 눌러 줌(재제인)', jaeP]]); }
    else if (key === '편인') { sang.push(['편관을 편인이 받아 풀어 줌(살인상생)', L('편관') >= 2, 3], ['재성이 편인을 눌러 줌(재제효)', jaeP, 2]); pa.push(['식신이 편인에게 막힘(도식)', L('식신') >= 2, 1, ['재성이 편인을 눌러 줌(재제효)', jaeP]]); }
    else { sang.push(['관성이 월겁을 제어함(관살 제어)', gwanP, 3], ['재성으로 월겁의 힘을 쓰게 함(재성 활용)', jaeP, 2], ['식상으로 월겁의 기운을 풀어 줌(식상 설기)', sikP, 1]); pa.push(['쓸 재·관·식상이 천간에 드러나지 않음', !J0.use, null, null]); if (J0.name === '양인격') pa.push(['양인을 제어할 관살이 없음', !gwanP, 3, null]); }
    // 공통: 월령 충·형 — 다른 지지와 합이 함께 있으면 합이 충을 풀어 준다(탐합망충)
    var clash = C.monthClash, hapRescue = C.monthHap.some(function (r) { return r.type === '육합' || r.type === '삼합' || r.type === '방합'; });
    if (clash.length) pa.push(['월지가 ' + uniqNames(clash) + '을 받아 월령이 흔들림', true, null, ['월지가 다른 지지와 합을 이뤄 충을 누그러뜨림(탐합망충)', hapRescue]]);
    var note0 = C.monthHyung.length ? ['월지가 ' + uniqNames(C.monthHyung) + '을 이룹니다. 두 글자 형은 월령을 깨는 요인으로 세지 않고 참고로만 봅니다.'] : [];
    var sangOn = sang.filter(function (s) { return s[1]; }), paOn = pa.filter(function (p) { return p[1]; });
    var broken = paOn.filter(function (p) { return !(p[3] && p[3][1]); }), rescued = paOn.filter(function (p) { return p[3] && p[3][1]; });
    var st = broken.length ? 'pa' : rescued.length ? 'rescued' : sangOn.length ? 'seong' : 'plain', raw = st, note = note0;
    if (J0.establish === 'hold') { st = 'hold'; note.push('격의 성립을 유보해 안정성도 판정하지 않습니다.'); }
    else if (!C.hasHour) { st = 'hold'; note.push('태어난 시간을 몰라 시간·시지 글자가 상신이나 파격 요인이 될 수 있어 안정성을 유보합니다(시주 없이 본 임시 판단: ' + STAB_LABEL[raw] + ').'); }
    return { status: st, statusRaw: raw, label: STAB_LABEL[st],
      sang: sang.map(function (s) { return { text: s[0], on: !!s[1], group: s[2] == null ? null : GN[s[2]], g: s[2] }; }),
      pa: pa.map(function (p) { return { text: p[0], on: !!p[1], group: p[2] == null ? null : GN[p[2]], g: p[2], rescue: p[3] ? { text: p[3][0], on: !!p[3][1] } : null }; }),
      notes: note };
  }

  // ───────── B. 특수격 ─────────
  function specialChecks(M, ch, C) {
    var out = [], d = C.d, mb = ch.pillars.month.b, pct = C.pct, stems = C.stemOthers.map(function (k) { return ch.pillars[k].s; });
    var stemEls = stems.map(function (s) { return M.stemEl(s); });
    var hourCaveat = function (c) { if (!C.hasHour && (c.status === 'jin' || c.status === 'ga')) { c.statusRaw = c.status; c.status = 'hold'; c.note = '태어난 시간을 몰라 시간·시지 글자가 조건을 바꿀 수 있어 판정을 유보합니다.'; } };
    var grade = function (conds, must, minOk) { var ok = conds.filter(function (c) { return c.ok; }).length; return conds.every(function (c) { return c.ok; }) ? 'jin' : (must.every(function (i) { return conds[i].ok; }) && ok >= minOk) ? 'ga' : 'none'; };
    // 화격
    (function () {
      var p = (d + 5) % 10, hel = [2, 3, 4, 0, 1][d % 5], ctrl = (hel + 3) % 5;
      var adj = ['month', 'hour'].filter(function (k) { return ch.pillars[k] && ch.pillars[k].s === p; });
      var cnt = stems.filter(function (s) { return s === p; }).length;
      var monthOk = M.BR_EL[mb] === hel || C.monthHap.some(function (r) { return (r.type === '삼합' || r.type === '방합') && r.el === hel; });
      var conds = [
        { label: '일간이 월간·시간과 천간합', ok: adj.length > 0, detail: M.STEM[Math.min(d, p)] + M.STEM[Math.max(d, p)] + '합' + EL[hel] + (adj.length ? ' — ' + posList(adj) : ' — 붙어 있는 자리에 짝 글자 없음') },
        { label: '월령이 화신(' + EL[hel] + ') 오행', ok: monthOk, detail: '월지 ' + M.BR[mb] + '(' + EL[M.BR_EL[mb]] + ')' },
        { label: '화신 오행 비율 ' + CFG.hwa.pct + '% 이상', ok: pct[hel] >= CFG.hwa.pct, detail: EL[hel] + ' ' + r1(pct[hel]) + '%' },
        { label: '일간 본래 오행의 뿌리가 약함', ok: C.rootScore <= CFG.hwa.root, detail: '통근 점수 ' + C.rootScore + ' (기준 ' + CFG.hwa.root + ' 이하)' },
        { label: '화신을 극하는 오행(' + EL[ctrl] + ')이 천간에 없음', ok: stemEls.indexOf(ctrl) < 0, detail: stemEls.indexOf(ctrl) < 0 ? '없음' : '있음' },
        { label: '쟁합·투합 없음', ok: cnt <= 1, detail: '짝 글자 ' + M.STEM[p] + ' ' + cnt + '개' }];
      var c = { key: 'hwa', family: '화격', name: '화' + EL[hel] + '격(' + M.STEM[Math.min(d, p)] + M.STEM[Math.max(d, p)] + '합)', el: hel, conds: conds, status: adj.length ? grade(conds, [0, 1], 5) : 'none' };
      hourCaveat(c); out.push(c);
    })();
    // 전왕 1행격
    (function () {
      var e = C.dEl, ctrl = (e + 3) % 5;
      var brCnt = ['year', 'month', 'day', 'hour'].filter(function (k) { return ch.pillars[k] && M.BR_EL[ch.pillars[k].b] === e; }).length;
      var guk = C.rel.filter(function (r) { return (r.type === '삼합' || r.type === '방합') && r.el === e; });
      var conds = [
        { label: '월령이 일간 오행(' + EL[e] + ')', ok: M.BR_EL[mb] === e, detail: '월지 ' + M.BR[mb] + '(' + EL[M.BR_EL[mb]] + ')' },
        { label: '지지가 일간 오행으로 모임', ok: guk.length > 0 || brCnt >= CFG.jeon.branches, detail: (guk.length ? guk.map(function (r) { return r.name; }).join('·') + ' · ' : '') + EL[e] + ' 지지 ' + brCnt + '곳' },
        { label: '일간 오행 비율 ' + CFG.jeon.pct + '% 이상', ok: pct[e] >= CFG.jeon.pct, detail: EL[e] + ' ' + r1(pct[e]) + '%' },
        { label: '관성(' + EL[ctrl] + ')이 천간에 없고 ' + CFG.jeon.ctrlPct + '% 미만', ok: stemEls.indexOf(ctrl) < 0 && pct[ctrl] < CFG.jeon.ctrlPct, detail: EL[ctrl] + ' ' + r1(pct[ctrl]) + '% · 천간 ' + (stemEls.indexOf(ctrl) < 0 ? '없음' : '있음') },
        { label: '돕는 힘 ' + CFG.jeon.help + '% 이상', ok: C.help >= CFG.jeon.help, detail: '돕는 힘 ' + r1(C.help) + '%' }];
      var c = { key: 'jeon', family: '전왕 1행격', name: JEON_NAME[e], el: e, conds: conds, status: C.help >= 58 ? grade(conds, [0, 2, 3], 4) : 'none' };
      hourCaveat(c); out.push(c);
    })();
    // 종격 — engine jongCore 그대로
    if (M.jongCore) {
      var z = M.jongCore(ch);
      if (z && z.side !== 'mid' && z.kind) {
        var fEl = C.grpEl(z.follow);
        out.push({ key: 'jong', family: z.side === 'weak' ? '종격(종약)' : '종격(전왕 계열)', name: z.kind, el: fEl, follow: GN[z.follow], status: z.status, statusRaw: z.statusRaw,
          conds: [{ label: '일간의 힘이 극단적', ok: true, detail: '돕는 힘 ' + r1(C.help) + '% (' + (z.side === 'weak' ? '30% 미만' : '70% 이상') + ')' },
            { label: '따를 세력', ok: true, detail: GN[z.follow] + '(' + EL[fEl] + ') ' + r1(C.G[z.follow]) + '%' },
            { label: '통근 점수', ok: z.side === 'weak' ? z.rootScore < 50 : z.rootScore >= 50, detail: String(z.rootScore) },
            { label: '종합 판정(engine jongCore)', ok: z.status === 'jin', detail: SP_LABEL[z.status] }],
          note: z.status === 'hold' ? '태어난 시간을 몰라 시주 글자가 종격을 깨거나 이룰 수 있어 판정을 유보합니다.' : '' });
      }
    }
    out.forEach(function (c) { c.statusLabel = SP_LABEL[c.status]; });
    return out;
  }
  function specialPick(checks) {
    var pri = ['hwa', 'jeon', 'jong'], by = function (st) { return pri.map(function (k) { return checks.filter(function (c) { return c.key === k && c.status === st; })[0]; }).filter(Boolean); };
    var jin = by('jin'), top = jin[0] || null, possible = top ? null : (by('ga').concat(by('hold'))[0] || null);
    if (top && top.key === 'jeon') { var jg = checks.filter(function (c) { return c.key === 'jong' && c.status === 'jin' && c.name === '종왕격'; })[0]; if (jg) top.merged = '종왕격과 함께 성립 — 같은 전왕 계열이라 더 구체적인 ' + top.name + ' 이름을 씁니다.'; }
    return { top: top, others: jin.slice(1), possible: possible };
  }
  function specialTxt(c, C) {
    var e = c.el, w = EL[e];
    if (c.key === 'hwa') return { easy: '일간이 합으로 ' + w + ' 기운을 따르는 구조입니다.', act: '일간이 옆 글자와 합해 자기 본래 성질보다 ' + w + ' 기운의 흐름을 따라 움직인다고 보는 격입니다. 환경과 흐름에 맞춰 바뀌는 힘이 큽니다.',
      good: [w + ' 기운이 들어오거나 그것을 돕는 흐름에서 힘을 받기 쉽습니다.'], bad: [w + '을 극하는 기운이나 일간 본래 오행을 강하게 살리는 흐름이 오면 합이 풀리듯 방향이 흔들릴 수 있습니다.'] };
    if (c.key === 'jeon') return { easy: JEON_EASY[e], act: '사주가 ' + w + ' 기운으로 크게 채워져 있어, 그 기운을 거스르기보다 흐름대로 쓰는 것이 자연스럽다고 보는 격입니다.',
      good: [w + ' 기운이나 그 힘을 풀어 주는 ' + EL[(e + 1) % 5] + ' 기운의 흐름에서 장점이 살아나기 쉽습니다.'], bad: [EL[(e + 3) % 5] + ' 기운이 강하게 들어오면 큰 흐름과 부딪혀 마찰이 커질 수 있습니다.'] };
    var word = JONG_WORD[c.name] || c.follow;
    return { easy: word + '의 흐름을 따르는 구조입니다.', act: '일간이 홀로 서기보다 가장 센 ' + c.follow + '(' + w + ') 흐름을 따르는 것이 자연스럽다고 보는 격입니다. 이때는 일간을 억지로 돕는 기운이 오히려 흐름을 깨는 쪽으로 읽힙니다.',
      good: [c.follow + '(' + w + ') 흐름이 이어지는 환경에서 힘을 받기 쉽습니다.'], bad: ['흐름과 반대되는 기운이 강하게 들어오면 방향이 흔들리기 쉽습니다.'] };
  }

  // ───────── C. 특수 오행 구조 · D. 십성 작용 ─────────
  function itemChecks(M, ch, C, J0) {
    var out = [], pct = C.pct, mb = ch.pillars.month.b, dEl = C.dEl, cl = ch.climate || { temp: 0, hum: 0 }, L = C.L, gl = C.gl, G = C.G, S = CFG.sip;
    var allStemEls = ['year', 'month', 'day', 'hour'].filter(function (k) { return ch.pillars[k]; }).map(function (k) { return M.stemEl(ch.pillars[k].s); });
    var inStem = function (e) { return allStemEls.indexOf(e) >= 0; };
    var winter = [11, 0, 1].indexOf(mb) >= 0, summer = [5, 6, 7].indexOf(mb) >= 0;
    var clashPair = function (a, b) { return C.rel.some(function (r) { return r.kind === 'branch' && r.type === '충' && r.members.length === 2 && [a, b].every(function (x) { return r.members.some(function (k) { return ch.pillars[k] && ch.pillars[k].b === x; }); }); }); };
    var mk = function (o) {
      if (o.kind === 'sip' && o.pol === 'flow') { var tz = o.groups.some(function (g) { return C.touchedG(g); }); o.conds.push({ label: '두 십성 중 하나 이상이 천간에 드러남', ok: tz, detail: o.groups.map(function (g) { return GN[g] + ' ' + (C.touchedG(g) ? '투출' : '지장간만'); }).join(' · ') }); }
      o.on = o.conds.every(function (c) { return c.ok; }) && !(o.blocks || []).some(function (b) { return b.hit; }); out.push(o); return o; };
    var c = function (label, ok, detail) { return { label: label, ok: !!ok, detail: detail }; }, b = function (label, hit, detail) { return { label: label, hit: !!hit, detail: detail }; };
    var p = function (e) { return EL[e] + ' ' + r1(pct[e]) + '%'; };
    // C. 오행 구조
    var gs = pct[3] + pct[4], coldEx = winter && cl.temp <= CFG.hanraeng.temp && pct[1] < CFG.hanraeng.fire && !inStem(1);   // 금한수냉 조건을 모두 갖추면 금수쌍청 대신 금한수냉(두 항목이 동시에 서지 않음)
    mk({ key: 'geumsu', kind: 'oheng', pol: 'flow', name: '금수쌍청', els: [3, 4], conds: [c('일간이 금 또는 수', dEl === 3 || dEl === 4, '일간 ' + EL[dEl]), c('금+수 ' + CFG.geumsu.sum + '% 이상', gs >= CFG.geumsu.sum, '합 ' + r1(gs) + '%'), c('금·수 각 ' + CFG.geumsu.each + '% 이상', pct[3] >= CFG.geumsu.each && pct[4] >= CFG.geumsu.each, p(3) + ' · ' + p(4)), c('금·수가 모두 천간에 드러남', inStem(3) && inStem(4), '천간 금 ' + (inStem(3) ? '있음' : '없음') + ' · 수 ' + (inStem(4) ? '있음' : '없음'))],
      blocks: [b('화·토가 많아 탁함', pct[1] >= CFG.geumsu.fire || pct[2] >= CFG.geumsu.earth, p(1) + ' · ' + p(2)), b('한겨울 냉기로 금한수냉에 해당', coldEx, '월지 ' + M.BR[mb] + ' · 한난 ' + r1(cl.temp))], clarity: Math.min(1, (gs - CFG.geumsu.sum) / 25 + 0.4) });
    mk({ key: 'hanraeng', kind: 'oheng', pol: 'care', name: '금한수냉', els: [3, 4], conds: [c('금+수 ' + CFG.hanraeng.sum + '% 이상', gs >= CFG.hanraeng.sum, '합 ' + r1(gs) + '%'), c('겨울(亥子丑)월', winter, '월지 ' + M.BR[mb]), c('화 ' + CFG.hanraeng.fire + '% 미만', pct[1] < CFG.hanraeng.fire, p(1)), c('한난 ' + CFG.hanraeng.temp + ' 이하', cl.temp <= CFG.hanraeng.temp, '한난 ' + r1(cl.temp))],
      blocks: [b('화가 천간에 있어 데워 줌', inStem(1), inStem(1) ? '천간 화 있음' : '')], clarity: Math.min(1, (gs - CFG.hanraeng.sum) / 25 + 0.5) });
    mk({ key: 'mokhwa', kind: 'oheng', pol: 'flow', name: '목화통명', els: [0, 1], conds: [c('일간이 목', dEl === 0, '일간 ' + EL[dEl]), c('목 ' + CFG.mokhwa.wood + '% 이상', pct[0] >= CFG.mokhwa.wood, p(0)), c('화 ' + CFG.mokhwa.fire + '% 이상 + 천간 투출', pct[1] >= CFG.mokhwa.fire && inStem(1), p(1) + ' · 천간 ' + (inStem(1) ? '있음' : '없음'))],
      blocks: [b('수가 많아 불을 끔', pct[4] >= CFG.mokhwa.water, p(4)), b('금이 많아 나무를 상함', pct[3] >= CFG.mokhwa.metal, p(3))], clarity: Math.min(1, (pct[0] + pct[1] - 38) / 30 + 0.4) });
    var wf = clashPair(0, 6) || clashPair(5, 11), wfDiff = Math.abs(pct[4] - pct[1]);
    mk({ key: 'gije', kind: 'oheng', pol: 'flow', name: '수화기제', els: [4, 1], conds: [c('수·화 각 ' + CFG.gije.each + '% 이상', pct[4] >= CFG.gije.each && pct[1] >= CFG.gije.each, p(4) + ' · ' + p(1)), c('수·화 차이 ' + CFG.gije.diff + '%p 이하', wfDiff <= CFG.gije.diff, '차이 ' + r1(wfDiff) + '%p')],
      blocks: [b('子午·巳亥 충으로 수화상전에 해당', wf, wf ? '수·화 지지 충 있음' : '')], clarity: Math.min(1, 1 - wfDiff / 24) });
    mk({ key: 'sangjeon', kind: 'oheng', pol: 'care', name: '수화상전', els: [4, 1], conds: [c('수·화 각 ' + CFG.sangjeon.each + '% 이상', pct[4] >= CFG.sangjeon.each && pct[1] >= CFG.sangjeon.each, p(4) + ' · ' + p(1)), c('子午 또는 巳亥 충', wf, wf ? '있음' : '없음')],
      blocks: [b('목이 통관함', pct[0] >= CFG.sangjeon.wood, p(0))], clarity: 0.7 });
    var hy = pct[1] + pct[2], dry = summer || (cl.temp >= CFG.yeomjo.temp && cl.hum <= CFG.yeomjo.hum);
    var yeom = mk({ key: 'yeomjo', kind: 'oheng', pol: 'care', name: '화염토조', els: [1, 2], conds: [c('화+토 ' + CFG.yeomjo.sum + '% 이상', hy >= CFG.yeomjo.sum, '합 ' + r1(hy) + '%'), c('수 ' + CFG.yeomjo.water + '% 미만', pct[4] < CFG.yeomjo.water, p(4)), c('여름월 또는 덥고 메마름', dry, '월지 ' + M.BR[mb] + ' · 한난 ' + r1(cl.temp) + ' · 조습 ' + r1(cl.hum))],
      blocks: [b('수가 천간에 있음', inStem(4), inStem(4) ? '천간 수 있음' : '')], clarity: Math.min(1, (hy - CFG.yeomjo.sum) / 25 + 0.5) });
    var mom = (dEl + 4) % 5;
    mk({ key: 'mowang', kind: 'oheng', pol: 'care', name: MOWANG_NAME[dEl], els: [mom, dEl], conds: [c('일간을 생하는 ' + EL[mom] + ' ' + CFG.mowang.mother + '% 이상', pct[mom] >= CFG.mowang.mother, p(mom)), c('일간 오행 ' + CFG.mowang.self + '% 이하', pct[dEl] <= CFG.mowang.self, p(dEl))],
      blocks: [b('화염토조와 겹침(화염토조만 표시)', dEl === 2 && yeom.on, '')], clarity: Math.min(1, (pct[mom] - CFG.mowang.mother) / 20 + 0.5) });
    // D. 십성 작용
    var both = function (a, bb) { return C.touchedG(a) && C.touchedG(bb); };
    var jaePain = gl(2) === 3 && G[2] >= G[4] + S.jaepain && gl(0) < 2;
    var salDom = L('편관') > L('정관') || (L('편관') === L('정관') && C.P.per['편관'].touched && !C.P.per['정관'].touched);
    var lv = function (g) { return GN[g] + ' 단계 ' + gl(g) + ' · ' + r1(G[g]) + '%'; }, lt = function (t) { return t + ' 단계 ' + L(t); };
    mk({ key: 'gwanin', kind: 'sip', pol: 'flow', name: '관인상생', groups: [3, 4], conds: [c('관성이 뚜렷함', gl(3) >= 2, lv(3)), c('인성이 뚜렷함', gl(4) >= 2, lv(4)), c('정관이 편관보다 주도', !salDom, lt('정관') + ' · ' + lt('편관')), c('일간이 이미 극단적으로 강하지 않음', C.help < S.gwaninHelp, '돕는 힘 ' + r1(C.help) + '%')],
      blocks: [b('재성이 인성을 깨뜨림(재파인)', jaePain, lv(2))], clarity: (gl(3) + gl(4)) / 6 + (both(3, 4) ? 0.2 : 0) });
    mk({ key: 'salin', kind: 'sip', pol: 'flow', name: '살인상생', groups: [3, 4], conds: [c('편관이 뚜렷함', L('편관') >= 2, lt('편관')), c('인성이 뚜렷함', gl(4) >= 2, lv(4)), c('편관이 정관보다 주도', salDom, lt('편관') + ' · ' + lt('정관')), c('일간이 강하지 않음', C.help < S.salinHelp, '돕는 힘 ' + r1(C.help) + '%')],
      blocks: [b('재성이 살을 키우며 인성을 깸', gl(2) === 3 && gl(4) < 3, lv(2))], clarity: (L('편관') + gl(4)) / 6 + (both(3, 4) ? 0.2 : 0) });
    var dosik = L('편인') >= 2 && C.P.per['편인'].touched && gl(2) < 2;
    var jesal = mk({ key: 'jesal', kind: 'sip', pol: 'flow', name: '식신제살', groups: [1, 3], conds: [c('식신이 뚜렷함', L('식신') >= 2, lt('식신')), c('편관이 뚜렷함', L('편관') >= 2, lt('편관')), c('식신이 편관을 감당할 만함', L('식신') >= L('편관') - 1, lt('식신') + ' · ' + lt('편관'))],
      blocks: [b('천간 편인이 식신을 막고 재성 구응 없음(도식)', dosik, lt('편인') + ' · ' + lv(2))], clarity: (L('식신') + L('편관')) / 6 + (C.P.per['식신'].touched && C.P.per['편관'].touched ? 0.2 : 0) });
    var sikName = L('상관') > L('식신') ? '상관생재' : '식신생재';
    mk({ key: 'saengjae', kind: 'sip', pol: 'flow', name: sikName, groups: [1, 2], conds: [c('식상이 뚜렷함', gl(1) >= 2, lv(1)), c('재성이 뚜렷함', gl(2) >= 2, lv(2)), c('일간이 기운을 낼 힘이 있음', C.help >= S.saengjaeHelp, '돕는 힘 ' + r1(C.help) + '%')],
      blocks: [b('천간 편인이 식상을 막음(효신)', L('편인') >= 2 && C.P.per['편인'].touched && gl(2) < 3, lt('편인'))], clarity: (gl(1) + gl(2)) / 6 + (both(1, 2) ? 0.2 : 0) });
    var paein = mk({ key: 'paein', kind: 'sip', pol: 'flow', name: '상관패인', groups: [1, 4], conds: [c('상관이 뚜렷함', L('상관') >= 2, lt('상관')), c('인성이 뚜렷함', gl(4) >= 2, lv(4)), c('식상이 ' + S.paeinSik + '% 이상', G[1] >= S.paeinSik, lv(1)), c('일간이 지나치게 강하지 않음', C.help <= S.paeinHelp, '돕는 힘 ' + r1(C.help) + '%')],
      blocks: [b('재성이 인성을 깨뜨림(재파인)', jaePain, lv(2))], clarity: (L('상관') + gl(4)) / 6 + (both(1, 4) ? 0.2 : 0) });
    var gwUnres = L('상관') >= 2 && L('정관') >= 2 && gl(4) < 2;
    mk({ key: 'jaegwan', kind: 'sip', pol: 'flow', name: '재생관', groups: [2, 3], conds: [c('재성이 뚜렷함', gl(2) >= 2, lv(2)), c('관성이 뚜렷함', gl(3) >= 2, lv(3)), c('일간이 감당할 힘이 있음', C.help >= S.jaegwanHelp, '돕는 힘 ' + r1(C.help) + '%')],
      blocks: [b('상관견관이 풀리지 않음', gwUnres, lt('상관') + ' · ' + lt('정관'))], clarity: (gl(2) + gl(3)) / 6 + (both(2, 3) ? 0.2 : 0) });
    mk({ key: 'gyeongwan', kind: 'sip', pol: 'care', name: '상관견관', groups: [1, 3], conds: [c('상관이 뚜렷함', L('상관') >= 2, lt('상관')), c('정관이 뚜렷함', L('정관') >= 2, lt('정관'))],
      blocks: [b('인성이 상관을 눌러 줌(상관패인)', gl(4) >= 2 || paein.on, lv(4)), b('재성이 상관을 관으로 이어 줌', gl(2) >= 2, lv(2))], clarity: (L('상관') + L('정관')) / 6 + (C.P.per['상관'].touched && C.P.per['정관'].touched ? 0.2 : 0) });
    var hapSal = ['year', 'month', 'hour'].some(function (k) { return ch.pillars[k] && M.tenGod(C.d, ch.pillars[k].s) === '편관' && C.hapOther(k).length; });
    mk({ key: 'honjap', kind: 'sip', pol: 'care', name: '관살혼잡', groups: [3], conds: [c('정관·편관이 모두 천간에 드러남', C.P.per['정관'].touched && C.P.per['편관'].touched, '정관 ' + posList(C.P.per['정관'].at) + ' · 편관 ' + posList(C.P.per['편관'].at)), c('둘 다 힘이 있음', L('정관') >= 2 && L('편관') >= 2, lt('정관') + ' · ' + lt('편관'))],
      blocks: [b('식신제살로 정리됨', jesal.on, ''), b('편관이 합거됨(합살)', hapSal, '')], clarity: 0.8 });
    mk({ key: 'gungeop', kind: 'sip', pol: 'care', name: '군겁쟁재', groups: [0, 2], conds: [c('비겁 ' + S.gunGeop + '% 이상', G[0] >= S.gunGeop, lv(0)), c('재성이 있으나 적음', gl(2) >= 1 && G[2] <= S.gunJae, lv(2))],
      blocks: [b('관성이 비겁을 제어', gl(3) >= 2, lv(3)), b('식상이 비겁과 재성을 이어 줌', gl(1) >= 2, lv(1))], clarity: Math.min(1, (G[0] - S.gunGeop) / 25 + 0.5) });
    mk({ key: 'hyosin', kind: 'sip', pol: 'care', name: '효신탈식', groups: [4, 1], conds: [c('천간 편인이 뚜렷함', L('편인') >= 2 && C.P.per['편인'].touched, lt('편인')), c('식신이 뚜렷함', L('식신') >= 2, lt('식신'))],
      blocks: [b('재성이 편인을 눌러 줌(재제효)', gl(2) >= 2, lv(2))], clarity: (L('편인') + L('식신')) / 6 + 0.2 });
    mk({ key: 'jaeda', kind: 'sip', pol: 'care', name: '재다신약', groups: [2, 0], conds: [c('재성 ' + S.jaeda + '% 이상', G[2] >= S.jaeda, lv(2)), c('돕는 힘 ' + S.jaedaHelp + '% 미만', C.help < S.jaedaHelp, '돕는 힘 ' + r1(C.help) + '%')],
      blocks: [b('비겁이 재를 나눠 감당', gl(0) >= 2, lv(0))], clarity: Math.min(1, (G[2] - S.jaeda) / 20 + 0.5) });
    mk({ key: 'gwanda', kind: 'sip', pol: 'care', name: '관살태과', groups: [3, 4], conds: [c('관성 ' + S.gwanda + '% 이상', G[3] >= S.gwanda, lv(3)), c('돕는 힘 ' + S.gwandaHelp + '% 미만', C.help < S.gwandaHelp, '돕는 힘 ' + r1(C.help) + '%')],
      blocks: [b('인성이 관살을 받아 줌', gl(4) >= 2, lv(4))], clarity: Math.min(1, (G[3] - S.gwanda) / 20 + 0.5) });
    // 문안·점수
    var mGroups = [];
    if (ch.pillars.month) { mGroups.push(GOF[M.tenGod(C.d, ch.pillars.month.s)]); mGroups.push(GOF[M.tenGod(C.d, M.mainHidden(ch.pillars.month.b))]); }
    var adjG = ['month', 'hour'].filter(function (k) { return ch.pillars[k]; }).map(function (k) { return GOF[M.tenGod(C.d, ch.pillars[k].s)]; });
    out.forEach(function (o) {
      if (!o.groups) o.groups = o.els.map(C.elGrp).filter(function (g, i, a) { return a.indexOf(g) === i; });
      var t = ITEM_TXT[o.key]; o.txt = { short: t.short, easy: t.easy, act: t.act, good: t.good.slice(), bad: t.bad.slice() };
      if (o.key === 'mowang') o.txt.easy = J.이(EL[(dEl + 4) % 5]) + ' 너무 많아 ' + EL[dEl] + ' 일간이 묻히는 구조입니다(' + o.name + ').';
      if (o.key === 'saengjae') o.txt.easy = o.name === '상관생재' ? '말·기술·아이디어(상관)가 재물·결과(재성)로 이어지는 흐름입니다.' : '꾸준히 만들어 낸 것(식신)이 재물·결과(재성)로 이어지는 흐름입니다.';
      var imp = 0;
      if (o.groups.indexOf(J0.group) >= 0) imp += 0.5;
      if (o.groups.some(function (g) { return mGroups.indexOf(g) >= 0; })) imp += 0.3;
      if (o.groups.some(function (g) { return adjG.indexOf(g) >= 0; })) imp += 0.2;
      var impact = Math.min(1, o.groups.reduce(function (a, g) { return a + G[g]; }, 0) / 50);
      o.clarity = Math.max(0, Math.min(1, o.clarity)); o.importance = Math.min(1, imp); o.impact = impact;
      o.score = Math.round((CFG.pick.w[0] * o.clarity + CFG.pick.w[1] * o.importance + CFG.pick.w[2] * impact) * 1000) / 1000;
      o.why = o.conds.map(function (x) { return (x.ok ? '충족' : '미충족') + ' · ' + x.label + (x.detail ? ' (' + x.detail + ')' : ''); }).concat((o.blocks || []).filter(function (x) { return x.hit; }).map(function (x) { return '예외 · ' + x.label + (x.detail ? ' (' + x.detail + ')' : ''); }));
    });
    return out;
  }

  // ───────── 종합 해석 ─────────
  function compose(res, C) {
    var j = res.jeong, st = j.stability, rep = res.rep, major = res.major, body = [], good = [], care = [];
    var uniq = function (a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); };
    if (rep.type === 'special') {
      body.push(J.은(rep.name) + ' ' + rep.easy.replace(/구조입니다\.$/, '구조로 읽힙니다.'));
      body.push((j.establish === 'hold' ? '월령 기준 정격은 판정을 유보했고(후보 ' + j.name + '), ' : '월령 기준으로는 ' + J.이(j.name) + '지만, ') + '기운이 한쪽으로 크게 쏠려 보통의 균형 잡기보다 그 흐름을 따르는 해석을 앞세웁니다. ' + J.의(j.name) + ' 안정성은 참고로만 봅니다.');
      good.push(rep.txt.good[0]); care.push(rep.txt.bad[0]);
    } else if (rep.type === 'hold') {
      body.push('격국을 하나로 정할 근거가 부족해 판정을 유보합니다. ' + (j.reasons[0] || ''));
      body.push('월령만 놓고 보면 ' + J.에(j.name) + ' 가깝고, ' + j.txt.easy.replace(/입니다\.$/, '일 가능성이 있습니다.'));
      good.push(j.txt.good[0]); care.push(j.txt.bad[0]);
    } else {
      body.push((j.establish === 'multi' ? '대표 후보는 ' + J.이(j.name) + '고(다른 후보: ' + j.candidates.map(function (x) { return x.name; }).join('·') + '), ' : J.을(j.name) + ' 바탕으로 한 사주로, ') + j.txt.easy);
      var sOn = st.sang.filter(function (s) { return s.on; }), bk = st.pa.filter(function (p) { return p.on && !(p.rescue && p.rescue.on); }), rs = st.pa.filter(function (p) { return p.on && p.rescue && p.rescue.on; });
      var raw = st.status === 'hold' ? st.statusRaw : st.status;
      if (raw === 'seong') body.push('격을 받쳐 주는 기운(' + sOn.map(function (s) { return shortOf(s.text); }).join(', ') + ')이 함께 있어 구조가 비교적 안정적입니다.');
      else if (raw === 'rescued') body.push('격을 흔드는 요인(' + rs.map(function (p) { return shortOf(p.text); }).join(', ') + ')이 있지만 이를 막아 주는 기운(' + rs.map(function (p) { return shortOf(p.rescue.text); }).join(', ') + ')이 있어 버티는 구조입니다.');
      else if (raw === 'pa') body.push('격을 흔드는 요인(' + bk.map(function (p) { return shortOf(p.text); }).join(', ') + ')을 막아 줄 기운이 원국에 뚜렷하지 않아 구조가 흔들리기 쉬운 편입니다. 그 빈자리를 채우는 기운이 운에서 들어올 때 보완된다고 봅니다.');
      else body.push('격을 특별히 돕거나 깨는 기운이 뚜렷하지 않아 무난한 편입니다. 격의 장점은 운에서 돕는 기운이 들어올 때 더 또렷해집니다.');
      if (st.status === 'hold' && st.notes.length) body.push(st.notes[st.notes.length - 1]);
      good.push(j.txt.good[0]); sOn.slice(0, 1).forEach(function (s) { good.push('이미 원국에 ' + shortOf(s.text) + ' 구조가 있어 격의 장점이 살아나기 쉽습니다.'); });
      care.push(j.txt.bad[0]); bk.slice(0, 1).filter(function (p) { return !res.major.some(function (o) { return shortOf(p.text).indexOf(o.name) >= 0; }); }).forEach(function (p) { care.push(shortOf(p.text) + ' — 이 부분이 격의 장점을 가리기 쉬우니 관련 상황에서 한 번 더 점검하는 편이 좋습니다.'); });
      if (res.special.possible) body.push(res.special.possible.name + ' 가능성도 보이지만 조건이 모두 갖춰지지 않아(' + res.special.possible.statusLabel + ') 특수격으로 단정하지 않습니다.');
    }
    var core = [rep.type === 'special' ? null : j.group].concat(j.stability.sang.filter(function (s) { return s.on; }).map(function (s) { return s.g; })).filter(function (g) { return g != null; });
    var said = j.stability.sang.concat(j.stability.pa).filter(function (x) { return x.on; }).map(function (x) { return shortOf(x.text); });
    major.forEach(function (o) {
      if (said.some(function (t) { return t.indexOf(o.name) >= 0; }) && rep.type !== 'special') { (o.pol === 'flow' ? good : care).push(o.pol === 'flow' ? o.txt.good[0] : o.txt.bad[0]); return; }
      var related = rep.type !== 'special' && o.groups.some(function (g) { return core.indexOf(g) >= 0; }), nm = rep.type === 'special' ? rep.name : j.name;
      if (o.pol === 'flow') body.push(related ? J.은(o.name) + ' ' + J.이(nm) + ' 쓰는 기운과 같은 줄기에 있어 격의 장점을 더 또렷하게 해 줍니다.' : J.은(o.name) + ' 격과는 다른 줄기에서 ' + J.을(o.txt.short) + ' 더해 줍니다.');
      else body.push(related ? J.은(o.name) + ' ' + J.이(nm) + ' 기대는 기운을 흔드는 쪽이라 격의 장점이 들쭉날쭉하게 나타날 수 있습니다.' : J.은(o.name) + ' 격과 별개로 살펴야 하는 구조로, ' + o.txt.short + '입니다.');
      (o.pol === 'flow' ? good : care).push(o.pol === 'flow' ? o.txt.good[0] : o.txt.bad[0]);
      if (o.pol === 'care') good.push(o.txt.good[0]);
    });
    var head = rep.type === 'special' ? rep.name + ' — 큰 흐름을 따르는 사주' : rep.type === 'hold' ? '격국 판정 유보' : j.name + (major.length ? ' + ' + major.map(function (o) { return o.name; }).join('·') : '');
    return { headline: head, body: body, good: uniq(good).slice(0, 4), care: uniq(care).slice(0, 4) };
  }
  J.의 = function (w) { return w + '의'; }; J.에 = function (w) { return w + '에'; };

  function analyze(M, ch) {
    var hit = cache.get(ch); if (hit) return hit;
    var C = ctxOf(M, ch), jeong = jeongGyeok(M, ch, C), checks = specialChecks(M, ch, C), sp = specialPick(checks), items = itemChecks(M, ch, C, jeong);
    // 예외: 특수격이 성립하면 일간 강약 균형(억부)을 전제로 한 부담 항목은 특수격의 흐름과 모순되므로 주요 구조에서 뺀다(점검표에는 이유와 함께 남긴다)
    if (sp.top) items.forEach(function (o) { if (o.on && ['jaeda', 'gwanda', 'gungeop', 'mowang'].indexOf(o.key) >= 0) { o.on = false; o.suppressed = sp.top.name + ' 성립 — 강약 균형을 전제로 한 항목이라 특수격 흐름과 맞지 않아 주요 구조에서 제외'; o.why.push('예외 · ' + o.suppressed); } });
    var on = items.filter(function (o) { return o.on; }).sort(function (a, b) { return b.score - a.score; });
    var major = on.slice(0, CFG.pick.max);
    var rep;
    if (sp.top) { var tx = specialTxt(sp.top, C); rep = { type: 'special', name: sp.top.name, family: sp.top.family, establish: 'firm', establishLabel: '특수격 성립', stability: null, stabilityLabel: '특수격 우선', easy: tx.easy, txt: tx,
      why: sp.top.conds.map(function (x) { return (x.ok ? '충족' : '미충족') + ' · ' + x.label + ' (' + x.detail + ')'; }).concat(sp.top.merged ? [sp.top.merged] : []),
      relation: '월령 기준 정격은 ' + J.이(jeong.name) + '지만, ' + J.이(sp.top.name) + ' 성립해 특수격을 우선 적용합니다. 특수격은 기운이 한쪽으로 크게 쏠린 사주라 보통의 균형 잡기(정격·억부)보다 그 흐름을 따르는 해석이 더 자연스럽다고 보기 때문입니다.' }; }
    else if (jeong.establish === 'hold') rep = { type: 'hold', name: '판정 유보', sub: '월령 기준 후보: ' + jeong.name, establish: 'hold', establishLabel: EST_LABEL.hold, stability: 'hold', stabilityLabel: STAB_LABEL.hold, easy: '격국을 하나로 정할 근거가 부족합니다.', txt: jeong.txt, why: jeong.basis.concat(jeong.reasons) };
    else rep = { type: 'jeong', name: jeong.name, sub: jeong.establish === 'multi' ? '다른 후보: ' + jeong.candidates.map(function (x) { return x.name; }).join('·') : '', establish: jeong.establish, establishLabel: jeong.establishLabel, stability: jeong.stability.status, stabilityLabel: jeong.stability.label, easy: jeong.txt.easy, txt: jeong.txt, why: jeong.basis.concat(jeong.reasons) };
    var caveats = [];
    if (!C.hasHour) caveats.push('태어난 시간을 몰라 시주(時柱) 글자 없이 판정했습니다. 시간을 알면 격·안정성·특수격 판정이 달라질 수 있습니다.');
    var res = { version: VERSION, hasHour: C.hasHour, rep: rep, jeong: jeong, special: { checks: checks, top: sp.top, others: sp.others, possible: sp.possible, priority: sp.top ? 'special' : 'jeong' },
      items: items, major: major, caveats: caveats, disclaimer: '격국은 사주의 짜임새를 읽는 한 가지 틀입니다. 격국만으로 직업·재물·성격이나 인생의 좋고 나쁨을 단정하지 않으며, 신강신약·용신·운의 흐름과 함께 보아야 합니다.',
      engineGyeok: M.gyeokCore ? (function (k) { return { kind: k.kind, status: k.status }; })(M.gyeokCore(ch)) : null };
    res.summary = compose(res, C);
    cache.set(ch, res); return res;
  }
  G.MantraGyeokStructure = { analyze: analyze, VERSION: VERSION, CFG: CFG, BANNED: BANNED, ITEM_TXT: ITEM_TXT, JEONG_TXT: JEONG_TXT, EST_LABEL: EST_LABEL, STAB_LABEL: STAB_LABEL };
})(typeof window !== 'undefined' ? window : globalThis);
