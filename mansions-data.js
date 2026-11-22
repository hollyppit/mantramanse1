/* 28수(二十八宿) 공통 데이터: 공간·명당(천문방위 엔진 mansions-engine.js)과 택일(날짜 모듈 mansions-day.js)이 함께 쓰는 기본 자료.
   원칙(2026-11-21 사용자 기준)
   · 360°를 28등분한 값, 근거 없는 24산↔28수 일대일 대응, 출전 없는 도수는 넣지 않는다.
   · 천문 도수(적도·황도, 古度)와 풍수 나침반 방위각(지평 360°)은 같은 값으로 보지 않는다.
   · 도수는 DEGREE_PROFILES(문헌·시대별), 나경 28수환↔24산은 LUOPAN_PROFILES(유파·문헌별)에 따로 둔다. 기본 기준은 적도 365¼도 체계.
   · 날짜별 28수 배속과 행사별 길흉은 별도 파일(mansions-day-data.js)에 둔다.
   mansionStart·mansionEnd·angularExtent 는 프로필마다 다르므로 각 수에는 null 로 두고, 엔진이 고른 프로필에서 계산한다. */
(function (G) {
  'use strict';
  var VERSION = 'mansions-data-20261122-1';
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

  // ───────────── 도수 프로필 (2026-11-21 사용자 기준) ─────────────
  // 기준: 고전 적도 28수 도수, 주천 365¼도, 균등 분할 금지, ¼도 위치는 선택 판본 원문으로 확인, 시대·문헌별로 프로필을 따로 둔다.
  // status: 'verified'(계산에 사용 가능) · 'unconfirmed'(원문은 있으나 기준 미충족) · 'incomplete'(원문에 필요한 값이 없음)
  // 엔진은 status 'verified' 이고 검증 규칙을 통과한 프로필만 쓴다. 나머지는 출전 보존용이다.
  // 도수 순서는 MANSIONS(角→軫) 순. 원문 나열 순서(대개 斗부터)와 다를 수 있다.
  var ORDER = ['jiao', 'kang', 'di', 'fang', 'xin', 'wei_tail', 'ji', 'dou', 'niu', 'nu', 'xu', 'wei_roof', 'shi', 'bi_wall', 'kui', 'lou', 'wei_stomach', 'mao', 'bi_net', 'zi', 'shen', 'jing', 'gui', 'liu', 'xing', 'zhang', 'yi', 'zhen'];
  function ext(arr) { var o = {}; ORDER.forEach(function (id, i) { o[id] = arr[i]; }); return o; }
  var HHS_URL = 'https://zh.wikisource.org/wiki/%E5%BE%8C%E6%BC%A2%E6%9B%B8/%E5%8D%B793';
  var DEGREE_PROFILES = [
    { id: 'hhs-sifen-equatorial', isDefault: true, status: 'verified',
      title: '《후한서·율력지 하》(續漢志) 적도도, 중화서국본 교감 반영 — 동한 사분력(四分曆)', work: '後漢書 志第三 律曆下', era: '동한(東漢)', tradition: '사분력 적도 거도(距度)',
      edition: '중화서국 점교본 전사(위키문헌) + 교감기 3074쪽(《후한서집해》 인용 이예(李銳)설). 사고전서 영인본 원본 면(卷13 葉23a–24a)과 대조함(2026-11-22)', sourceUrl: HHS_URL, retrievedAt: '2026-11-21',
      quote: '斗二十六四分[一]…北方九十八度四分一…西方八十度…南方百一十二度…東方七十五度 右赤道度周天三百六十五度四分一',
      coordinateSystem: 'equatorial', circumference: 365.25, unit: '고도(古度)', referencePoint: '각 수의 거성(距星)에서 다음 수 거성까지의 적도 거도. 원문 나열은 두(斗)수부터',
      fractionAt: 'dou', fractionValue: 0.25,
      extents: ext([12, 9, 15, 5, 5, 18, 11, 26.25, 8, 12, 10, 17, 16, 9, 16, 12, 14, 11, 16, 2, 9, 33, 4, 15, 7, 18, 18, 17]),
      notes: ['이 프로필의 危17·壁9는 《후한서》 원문 그대로가 아니라 중화서국본 교감기 값입니다. 위키문헌 본문과 사고전서 원본 면(2026-11-22 대조)은 모두 危十六·壁十입니다. 교감기는 이예설에 따라 危十(六)[七]·壁(十)[九]로 바로잡습니다(본문 黃道度와 섞인 오기). 危17·壁9는 《한서·율력지》(사고전서 원본 卷21下 葉59a)와 《진서》 경초력(사고전서 원본 卷18 葉19a)의 정수 도수와 같아, 두 원본 면으로 교차 확인했습니다(2026-11-22). 두 값 모두 북방 합계는 98¼입니다.',
        '斗의 ¼(四分一)은 교감기 "斗二十六四分[一]退二 據集解引李銳說補"로 보충된 것이며, 북방 합계 "九十八度四分一"과 맞습니다.'],
      attestations: ['《한서·율력지》(삼통력): 같은 정수 도수(井33·危17·壁9), 분수 표기 없음', '《진서·율력지 하》·《송서·율력지 중》(경초력): 같은 정수 도수, 斗에 455/1843'] },
    { id: 'hhs-sifen-ecliptic', isDefault: false, status: 'verified',
      title: '《후한서·율력지 하》 황도도 — 동한 사분력', work: '後漢書 志第三 律曆下', era: '동한(東漢)', tradition: '사분력 황도도',
      edition: '중화서국 점교본 전사(위키문헌) — 斗二十四(進一)[四分一] 교감 반영', sourceUrl: HHS_URL, retrievedAt: '2026-11-21',
      quote: '斗二十四[四分一]牛七女十一虛十危十六室十八壁十 北方九十六度四分一 … 右黃道度三百六十五四分一',
      coordinateSystem: 'ecliptic', circumference: 365.25, unit: '고도(古度)', referencePoint: '황도상 거도. 참고용(기본 기준은 적도도)',
      fractionAt: 'dou', fractionValue: 0.25,
      extents: ext([13, 10, 16, 5, 5, 18, 10, 24.25, 7, 11, 10, 16, 18, 10, 17, 12, 15, 12, 16, 3, 8, 30, 4, 14, 7, 17, 19, 18]),
      notes: ['기본 기준은 적도도라서 화면 기본값으로 쓰지 않습니다. 황도도가 적도도와 다름을 보여 주는 비교용입니다.'], attestations: [] },
    { id: 'jinshu-jingchu', isDefault: false, status: 'unconfirmed',
      title: '《진서·율력지 하》 경초력(景初曆) 수도', work: '晉書 卷18 律曆下', era: '위(魏)~진(晉)', tradition: '경초력',
      edition: '위키문헌 전사', sourceUrl: 'https://zh.wikisource.org/wiki/%E6%99%89%E6%9B%B8/%E5%8D%B7018', retrievedAt: '2026-11-21',
      quote: '斗二十六分四百五十五…北方九十八度分四百五十五…南方百十二度…東方七十五度',
      coordinateSystem: null, circumference: 365 + 455 / 1843, unit: '고도(古度)', referencePoint: null,
      fractionAt: 'dou', fractionValue: 455 / 1843,
      extents: ext([12, 9, 15, 5, 5, 18, 11, 26 + 455 / 1843, 8, 12, 10, 17, 16, 9, 16, 12, 14, 11, 16, 2, 9, 33, 4, 15, 7, 18, 18, 17]),
      statusReason: '해당 문단에 적도·황도 표기가 없고, 끝수가 ¼이 아니라 斗分 455/1843이라 365¼ 기준에 맞지 않습니다. 《송서·율력지 중》에도 같은 표가 있습니다.', notes: [], attestations: ['《송서·율력지 중》 권12 같은 표'] },
    { id: 'hanshu-santong', isDefault: false, status: 'incomplete',
      title: '《한서·율력지》 삼통력(三統曆) 수도', work: '漢書 卷21 律曆志', era: '서한(西漢)', tradition: '삼통력(태초력 성거)',
      edition: '위키문헌 전사', sourceUrl: 'https://zh.wikisource.org/wiki/%E6%BC%A2%E6%9B%B8/%E5%8D%B7021', retrievedAt: '2026-11-21',
      quote: '角十二…箕十一。東七十五度。斗二十六…壁九。北九十八度。…井三十三…軫十七。南百一十二度。',
      coordinateSystem: null, circumference: 365, unit: '고도(古度)', referencePoint: null, fractionAt: null, fractionValue: null,
      extents: ext([12, 9, 15, 5, 5, 18, 11, 26, 8, 12, 10, 17, 16, 9, 16, 12, 14, 11, 16, 2, 9, 33, 4, 15, 7, 18, 18, 17]),
      statusReason: '28수 정수 도수만 있고(합 365) ¼도의 위치가 표에 없습니다.', notes: [], attestations: [] },
    { id: 'huainanzi-tianwen', isDefault: false, status: 'unconfirmed',
      title: '《회남자·천문훈》 수도', work: '淮南子 天文訓', era: '서한(西漢)', tradition: '회남자',
      edition: '위키문헌 전사(판본 미대조)', sourceUrl: 'https://zh.wikisource.org/wiki/%E6%B7%AE%E5%8D%97%E5%AD%90/%E5%A4%A9%E6%96%87%E8%A8%93', retrievedAt: '2026-11-21',
      quote: '角十二，亢九，氐十五，房五，心五，尾十八，箕十一四分一…東井三十…凡二十八宿也',
      coordinateSystem: null, circumference: 365.25, unit: '고도(古度)', referencePoint: null, fractionAt: 'ji', fractionValue: 0.25,
      extents: ext([12, 9, 15, 5, 5, 18, 11.25, 26, 8, 12, 10, 17, 16, 9, 16, 12, 14, 11, 16, 2, 9, 30, 4, 15, 7, 18, 18, 17]),
      statusReason: '전사본의 井 30으로는 합이 362¼이라 365¼과 맞지 않습니다(다른 문헌은 井 33). 판본 대조 전에는 쓰지 않습니다.', notes: [], attestations: [] },
  ];

  // ───────────── 나경 28수환 ↔ 24산 대응 프로필 ─────────────
  // 출전이 확인된 대응표만 넣는다. 유파·문헌별로 따로 두고 하나를 정답으로 보지 않는다.
  // 형식: { id, school, title, edition, sourceUrl, quote, status:'verified', table: { 子:['虛',…], … }(24산 한자 → 걸치는 수 한자들) }
  // 2026-11-21 조사: 열람 가능한 원문에서 24산 단위 대응표를 찾지 못했다(《나경투해》·《나경정문침》 원문 미확보).
  //   참고로 《유문숭리절충감여완효록》 '星辰定位之圖'에 12지 경계(예: 卯는 氐 3도에서 시작)를 노래한 구절이 있으나 24산 표가 아니고 전사가 불완전해 넣지 않았다.
  var LUOPAN_PROFILES = [];
  G.MantraMansionsData = { VERSION: VERSION, GUARD: GUARD, MANSIONS: MANSIONS, SEVEN: SEVEN, BASE_SOURCE: BASE_SOURCE, DEGREE_PROFILES: DEGREE_PROFILES, LUOPAN_PROFILES: LUOPAN_PROFILES };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.MantraMansionsData;
})(typeof window !== 'undefined' ? window : globalThis);
