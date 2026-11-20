/* 28수(二十八宿) 공통 데이터: 공간·명당(천문방위)과 택일(값일수)이 함께 쓴다. 계산은 mansions-engine.js.
   원칙(2026-11-21)
   · 360°를 28등분한 값, 근거 없는 24산↔28수 일대일 대응, 출전 없는 도수는 넣지 않는다.
   · 천문 좌표(적경·적도 도수)와 풍수 방위각(지평 방위)은 다른 값이다. 같은 숫자로 취급하지 않는다.
   · 도수 자료는 DEGREE_SYSTEMS 에, 24산 연계는 LINK_SYSTEMS 에 체계별로 따로 넣는다. 문헌마다 다르면 sourceVersion 으로 나눈다.
     지금은 검토·승인된 체계가 없어 둘 다 비어 있다(→ 정확한 방위 판정은 하지 않고 '데이터 미확정'으로 표시).
   · 행사별 길흉 규칙(EVENT_RULES)도 검증된 문헌 대조 전이라 비어 있다(→ '판단 보류').
   mansionStart·mansionEnd·angularExtent 는 체계마다 다르므로 각 수에는 null 로 두고, 승인된 체계가 생기면 엔진이 그 체계에서 채운다. */
(function (G) {
  'use strict';
  var VERSION = 'mansions-data-20261121-1';
  // 이름·사신 배속 출전: 사신(四神)과 동·북·서·남 4방 7수씩의 배속은 《史記·天官書》 이래 전통 천문 분류.
  // 순서는 각(角)에서 시작해 동→북→서→남 방(적경이 커지는 방향).
  var BASE_SOURCE = '사신 배속·순서: 《사기(史記)·천관서(天官書)》 이래 동양 전통 천문 분류';
  var GUARD = {
    east: { group: 'east', dir: '동방', guardian: '청룡(靑龍)', ko: '청룡', season: '봄', color: '#2e7d4f' },
    north: { group: 'north', dir: '북방', guardian: '현무(玄武)', ko: '현무', season: '겨울', color: '#33507a' },
    west: { group: 'west', dir: '서방', guardian: '백호(白虎)', ko: '백호', season: '가을', color: '#7a7f86' },
    south: { group: 'south', dir: '남방', guardian: '주작(朱雀)', ko: '주작', season: '여름', color: '#b3402f' },
  };
  // [id, 한자, 한글, 사신, 이름 뜻(전통 상징 — 이름 풀이 수준), 값일 칠요(七曜) 순번 0=목 1=금 2=토 3=일 4=월 5=화 6=수, 금수(禽獸)]
  var RAW = [
    ['jiao', '角', '각', 'east', '청룡의 뿔. 28수를 셀 때 첫 번째로 꼽는 수입니다.', 0, '蛟(교룡)'],
    ['kang', '亢', '항', 'east', '청룡의 목. 높이 솟은 곳이라는 뜻입니다.', 1, '龍(용)'],
    ['di', '氐', '저', 'east', '청룡의 가슴·뿌리. 근본이 되는 자리라는 뜻입니다.', 2, '貉(담비)'],
    ['fang', '房', '방', 'east', '청룡의 배·방. 머무는 방, 수레를 끄는 말에 비유했습니다.', 3, '兎(토끼)'],
    ['xin', '心', '심', 'east', '청룡의 심장. 붉은 큰 별(안타레스)이 있는 자리입니다.', 4, '狐(여우)'],
    ['wei_tail', '尾', '미', 'east', '청룡의 꼬리. 아홉 별이 굽어 이어진 모양입니다.', 5, '虎(범)'],
    ['ji', '箕', '기', 'east', '키(곡식을 까부르는 도구). 바람과 연결해 보았습니다.', 6, '豹(표범)'],
    ['dou', '斗', '두', 'north', '남두(南斗) 국자. 재는 도구, 수명과 연결해 보았습니다.', 0, '獬(해태)'],
    ['niu', '牛', '우', 'north', '견우(소). 끌고 나르는 힘을 뜻합니다.', 1, '牛(소)'],
    ['nu', '女', '녀', 'north', '직녀·여인. 길쌈과 살림을 뜻합니다.', 2, '蝠(박쥐)'],
    ['xu', '虛', '허', 'north', '빔·텅 빈 곳. 《서경》 요전에서 계절을 가늠하던 별로 나옵니다.', 3, '鼠(쥐)'],
    ['wei_roof', '危', '위', 'north', '지붕 용마루·높은 곳. 위태로움과도 연결했습니다.', 4, '燕(제비)'],
    ['shi', '室', '실', 'north', '집·궁실(營室). 집 짓는 일과 연결해 보았습니다.', 5, '猪(돼지)'],
    ['bi_wall', '壁', '벽', 'north', '담·벽(東壁). 문서와 서고를 뜻하기도 했습니다.', 6, '貐(유)'],
    ['kui', '奎', '규', 'west', '다리를 벌린 걸음·띠. 문장(文章)의 별로도 불렀습니다.', 0, '狼(이리)'],
    ['lou', '婁', '루', 'west', '묶음·모음. 가축을 기르고 모으는 일을 뜻합니다.', 1, '狗(개)'],
    ['wei_stomach', '胃', '위', 'west', '위장·곳간. 곡식을 쌓아 두는 창고를 뜻합니다.', 2, '雉(꿩)'],
    ['mao', '昴', '묘', 'west', '좀생이별(플레이아데스). 여러 별이 모인 무리입니다.', 3, '鷄(닭)'],
    ['bi_net', '畢', '필', 'west', '그물·사냥 도구. 비를 부르는 별로 여겼습니다.', 4, '烏(까마귀)'],
    ['zi', '觜', '자', 'west', '부리. 백호의 머리 쪽 작은 세 별입니다.', 5, '猴(원숭이)'],
    ['shen', '參', '삼', 'west', '셋(오리온자리 허리띠 세 별). 백호의 몸통입니다.', 6, '猿(원숭이)'],
    ['jing', '井', '정', 'south', '우물(東井). 물과 법도를 뜻합니다.', 0, '犴(들개)'],
    ['gui', '鬼', '귀', 'south', '귀신 수레(輿鬼). 제사와 조상을 뜻합니다.', 1, '羊(양)'],
    ['liu', '柳', '류', 'south', '버들. 주작의 부리로 보았습니다.', 2, '獐(노루)'],
    ['xing', '星', '성', 'south', '별(七星). 주작의 목입니다.', 3, '馬(말)'],
    ['zhang', '張', '장', 'south', '펼침·활시위. 주작의 모이주머니로 보았습니다.', 4, '鹿(사슴)'],
    ['yi', '翼', '익', 'south', '날개. 주작의 날개입니다.', 5, '蛇(뱀)'],
    ['zhen', '軫', '진', 'south', '수레 뒤턱. 주작의 꼬리, 수레와 바람을 뜻합니다.', 6, '蚓(지렁이)'],
  ];
  var SEVEN = ['목(木)', '금(金)', '토(土)', '일(日)', '월(月)', '화(火)', '수(水)'];
  var MANSIONS = RAW.map(function (r, i) {
    var g = GUARD[r[3]];
    return { id: r[0], order: i + 1, hanja: r[1], name: r[2], label: r[2] + '(' + r[1] + ')', group: r[3], groupDir: g.dir, guardian: g.guardian, guardianKo: g.ko,
      traditionalSymbolism: r[4], dayLuminary: SEVEN[r[5]], dayLuminaryIdx: r[5], animal: r[6],
      mansionStart: null, mansionEnd: null, angularExtent: null,   // 체계마다 다름 → 승인된 DEGREE_SYSTEMS 에서만 채운다
      source: BASE_SOURCE + ' · 이름 뜻풀이: 일반 전통 해설(문헌별 표현 차이 있음) · 칠요·금수: 통서(通書) 전통', sourceVersion: 'base-names-1' };
  });

  // 도수 체계 등록부. 항목 형식(모두 필수, 하나라도 없으면 엔진이 계산을 막는다):
  // { id, sourceVersion, title, tradition(시대·전통), source(출전), sourceUrl, coordinateSystem('equatorial'|'ecliptic'|'luopan-ring'),
  //   circumference(예: 365.25 古度 또는 360), referencePoint(기준점: 예 '각수 거성'), unit, extents: {id: 도수}(28개),
  //   conversionRule(지평 방위각으로 바꾸는 규칙 — 없으면 null: 원형 배치에는 쓰되 건물 방위 판정에는 쓰지 않는다), approved(검토 승인 여부), reviewedBy, reviewedAt }
  // 후보(미승인)는 docs/MANSIONS_28_2026-11-21.md 에만 적어 두었다. 사용자 확인 후 여기에 넣는다.
  var DEGREE_SYSTEMS = [];
  // 24산↔28수 연계 체계(나경 고리 등). 항목 형식: { id, sourceVersion, title, source, sourceUrl, luopanSchool, rule, table: [{ mountain:'子', mansions:['虛'] ...}], approved }
  var LINK_SYSTEMS = [];

  // 값일수(날마다 돌아가는 28수). 28일 주기이며 각 수는 요일(칠요)이 고정되어 있다(각=목요일 …).
  // anchor 는 '이 날짜가 이 수'라는 기준일이다. 확인된 기준일과 출전이 있어야만 계산한다.
  // 2026-11-21 확인: 2026년 11월 21일(토, 己亥일) = 女(녀)수. 두 출처가 같고, 女수의 칠요(토)와 요일(토요일)도 맞는다.
  //   ① 만세력 공개 라이브러리 lunar-javascript getXiu()(일지+요일 표) ② 중국 노황력 wannianli.tianqi.com 2026-11-21 '北方女土蝠 值日星宿'.
  //   교차 확인: 2000-01-01(戊午일, 토) → 胃(위)수, 2026-11-22 → 虛(허)수 — 같은 28일 주기에서 나오는 값과 일치.
  //   통서(通書) 전통의 값일수이며, 문헌 원전(예: 《협기변방서》) 대조는 아직 하지 않았다.
  var DAY_CYCLE = { anchor: { ymd: '2026-11-21', jdn: 2461366, mansionId: 'nu' }, verified: true,
    source: '통서 전통 값일수(28일 주기·칠요 고정) — 기준일은 lunar-javascript(6tail) getXiu 표와 중국 노황력(wannianli.tianqi.com)으로 교차 확인',
    sourceUrl: 'https://wannianli.tianqi.com/laohuangli/2026-11-21.html', note: '원전 문헌 대조 전 · 행사별 길흉은 판단 보류' };

  // 행사별 전통 길흉: { mansionId: { move:'길'|'흉'|null, open, wedding, contract, build, funeral, source, sourceVersion } }
  // 문헌 대조 전이라 비어 있다. 비어 있으면 화면은 '판단 보류'를 보여 준다.
  var EVENTS = [['move', '이사'], ['open', '개업'], ['wedding', '혼례'], ['contract', '계약'], ['build', '건축'], ['funeral', '장례']];
  var EVENT_RULES = {};

  G.MantraMansionsData = { VERSION: VERSION, GUARD: GUARD, MANSIONS: MANSIONS, SEVEN: SEVEN, DEGREE_SYSTEMS: DEGREE_SYSTEMS, LINK_SYSTEMS: LINK_SYSTEMS, DAY_CYCLE: DAY_CYCLE, EVENTS: EVENTS, EVENT_RULES: EVENT_RULES, BASE_SOURCE: BASE_SOURCE };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.MantraMansionsData;
})(typeof window !== 'undefined' ? window : globalThis);
