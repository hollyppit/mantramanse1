/* 원회운세(元會運世) — 소옹(邵雍) 『황극경세서(皇極經世書)』의 장기 시간 순환. 2026-11-20
   · 단위: 1세(世)=30년 · 1운(運)=12세=360년 · 1회(會)=30운=10,800년 · 1원(元)=12회=129,600년. 회는 지지(子~亥)와 12벽괘로 부른다.
   · 기준(문헌): 사고전서본 관물편 — 경회지사(經會之巳) 6, 경운지계(經運之癸) 180, 경세지자(經世之子) 2149, 그리고 제2156세 甲辰에 '唐帝堯肇位'.
     甲辰 = 기원전 2357년. 제2156세는 甲午(기원전 2367년)에 시작하므로 제2149세(제180운의 첫 세, 甲子) = 기원전 2577년,
     제181운(午會의 첫 운) = 기원전 2217년 甲子 → 午會는 기원전 2217년 ~ 서기 8583년(i-ching.asia 등의 인용과 같음).
     천문 연도(기원전 n년 = 1-n)로 원의 첫해 = -67016. 서기 Y년의 0부터 센 순번 i = Y + 67016 (예: 2024년 = 69041번째 해, 知乎 인용과 같음).
   · 오행을 배속하지 않는다(원전에 30년·360년 단위의 오행 배속 규칙이 없음). 삼원구운의 오행 주기와 섞지 않는다.
   · 해석은 소옹이 회마다 붙인 상징(天開於子·地闢於丑·人生於寅 / 開物於寅·閉物於戌, 12벽괘의 음양 소장)만 쉬운 말로 옮긴다. 사회·경제 예측이 아니다.
   · 브라우저·Node 공용. 사용: MantraWonhoe.at(서기 연도) */
(function (G) {
  'use strict';
  var VERSION = 'wonhoe-20261120-1';
  var OFFSET = 67016, SE = 30, UN = 360, HOE = 10800, WON = 129600;
  var BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'], BR_K = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  // 12벽괘(소식괘): 양이 자라고(子~巳) 음이 자라는(午~亥) 한 원의 큰 숨
  var GUA = [['復', '복'], ['臨', '림'], ['泰', '태'], ['大壯', '대장'], ['夬', '쾌'], ['乾', '건'], ['姤', '구'], ['遯', '둔'], ['否', '비'], ['觀', '관'], ['剝', '박'], ['坤', '곤']];
  var YANG = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0];   // 괘 안 양효 수
  // 소옹의 회 상징(전통) — 쉬운 말
  var HOE_TXT = [
    '하늘이 열리는 때(天開於子). 양 하나가 다시 살아나는 시작이에요.',
    '땅이 열리는 때(地闢於丑). 양이 둘로 자라요.',
    '사람과 만물이 생겨나는 때(人生於寅·開物). 하늘과 땅이 통하는 태괘의 시기예요.',
    '양이 크게 자라 힘이 붙는 때. 문물이 일어나기 시작해요.',
    '양이 거의 가득 차 마지막 음을 밀어내는 때.',
    '양이 가득 찬 때(乾). 밝음과 활동이 정점에 이르러요.',
    '양이 정점을 지나 음 하나가 처음 생기는 때(姤). 밖은 여전히 밝지만 안에서 거두는 기운이 싹터요.',
    '음이 둘로 자라며 물러나 지키는 때(遯).',
    '하늘과 땅이 통하지 않는 때(否). 음과 양이 반반으로 엇갈려요.',
    '음이 커져 위에서 내려다보는 때(觀). 돌아보고 살피는 시기예요.',
    '만물이 거둬지는 때(剝·閉物於戌). 양이 하나만 남아요.',
    '음이 가득 찬 때(坤). 고요히 다음 원을 준비해요.'
  ];
  var nth = function (n) { return n; };
  // 서기 연도 → 위치. 연도 경계는 호출하는 쪽의 기준(만세력은 입춘 기준 사주 연도)을 따른다.
  function at(Y) {
    var i = Y + OFFSET;                       // 원 안에서 0부터 센 순번
    if (i < 0 || i >= WON) return { supported: false };
    var h = Math.floor(i / HOE), uAll = Math.floor(i / UN), sAll = Math.floor(i / SE);
    var u = uAll - h * 30, s = sAll - uAll * 12;
    var yr = function (k) { return k - OFFSET; };   // 순번 → 서기 연도(천문 연도: 0 = 기원전 1년)
    var span = function (a, len) { return { from: yr(a), to: yr(a + len - 1) }; };
    var hoeSpan = span(h * HOE, HOE), unSpan = span(uAll * UN, UN), seSpan = span(sAll * SE, SE);
    return {
      supported: true, version: VERSION, year: Y, index: i + 1,
      won: { n: 1, of: 1, pct: Math.round((i + 1) / WON * 1000) / 10, from: yr(0), to: yr(WON - 1) },
      hoe: { n: h + 1, of: 12, br: BR[h], brK: BR_K[h], gua: GUA[h][0], guaK: GUA[h][1], yang: YANG[h], text: HOE_TXT[h], from: hoeSpan.from, to: hoeSpan.to, pct: Math.round((i - h * HOE + 1) / HOE * 1000) / 10 },
      un: { n: u + 1, of: 30, all: uAll + 1, from: unSpan.from, to: unSpan.to, pct: Math.round((i - uAll * UN + 1) / UN * 1000) / 10 },
      se: { n: s + 1, of: 12, all: sAll + 1, from: seSpan.from, to: seSpan.to, left: seSpan.to - Y },
      hoes: BR.map(function (b, k) { return { n: k + 1, br: b, brK: BR_K[k], gua: GUA[k][0], guaK: GUA[k][1], yang: YANG[k], now: k === h }; }),
      basis: '소옹 『황극경세서』(사고전서본 관물편): 1원=12회, 1회=30운, 1운=12세, 1세=30년. 제2156세 甲辰(기원전 2357년)에 唐堯 즉위로 적은 연표를 기준으로 거슬러 계산했어요 — 午會는 기원전 2217년 甲子에 시작해 서기 8583년에 끝나요.',
      caveats: ['원회운세에는 30년·360년마다 오행을 붙이는 원전 규칙이 없어 오행을 배속하지 않아요. 삼원구운(20년 오행 주기)과는 다른 체계예요.', '회의 상징은 소옹이 12벽괘의 음양 소장으로 설명한 것이고, 운·세 단위의 괘 배속은 해석이 갈려 화면에 내지 않아요.', '기원전 연도를 서기로 옮길 때 0년이 없어 자료에 따라 1년 차이가 날 수 있어요.']
    };
  }
  // 연도 표기(천문 연도 → '기원전 n년'/'n년')
  function fmtYear(y) { return y <= 0 ? '기원전 ' + (1 - y) + '년' : y + '년'; }

  var api = { version: VERSION, at: at, fmtYear: fmtYear, UNIT: { se: SE, un: UN, hoe: HOE, won: WON }, OFFSET: OFFSET };
  G.MantraWonhoe = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
