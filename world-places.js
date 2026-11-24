/* 해외 출생지 목록 — 만세력(index.html)·만트라 포춘 허브 입력·엔진(engine.js)이 함께 쓴다.
   각 도시: 이름 · 경도(동경 +, 서경 −) · IANA 시간대 이름. 시간대 이름으로 그 지역의 과거 표준시·서머타임을
   브라우저/서버의 Intl 시간대 자료(tzdb)에서 읽어 출생 시각을 세계 표준시로 바꾼다(엔진 compute 의 tz).
   국내 출생은 이 목록을 쓰지 않는다(엔진의 한국 시간대 표 그대로). 목록에 없는 곳은 가까운 도시를 고르도록 안내한다. */
(function (root) {
  'use strict';
  var DATA = [
    ['US', '미국', [['뉴욕', -74.01, 'America/New_York'], ['뉴저지(뉴어크)', -74.17, 'America/New_York'], ['필라델피아', -75.17, 'America/New_York'], ['워싱턴 D.C.', -77.04, 'America/New_York'], ['보스턴', -71.06, 'America/New_York'], ['애틀랜타', -84.39, 'America/New_York'], ['마이애미', -80.19, 'America/New_York'], ['디트로이트', -83.05, 'America/Detroit'], ['시카고', -87.63, 'America/Chicago'], ['댈러스', -96.80, 'America/Chicago'], ['휴스턴', -95.37, 'America/Chicago'], ['덴버', -104.99, 'America/Denver'], ['피닉스', -112.07, 'America/Phoenix'], ['라스베이거스', -115.14, 'America/Los_Angeles'], ['로스앤젤레스', -118.24, 'America/Los_Angeles'], ['샌디에이고', -117.16, 'America/Los_Angeles'], ['샌프란시스코', -122.42, 'America/Los_Angeles'], ['시애틀', -122.33, 'America/Los_Angeles'], ['앵커리지', -149.90, 'America/Anchorage'], ['호놀룰루(하와이)', -157.86, 'Pacific/Honolulu'], ['괌', 144.79, 'Pacific/Guam'], ['사이판', 145.75, 'Pacific/Saipan']]],
    ['CA', '캐나다', [['토론토', -79.38, 'America/Toronto'], ['오타와', -75.70, 'America/Toronto'], ['몬트리올', -73.57, 'America/Toronto'], ['위니펙', -97.14, 'America/Winnipeg'], ['캘거리', -114.07, 'America/Edmonton'], ['에드먼턴', -113.49, 'America/Edmonton'], ['밴쿠버', -123.12, 'America/Vancouver']]],
    ['JP', '일본', [['도쿄', 139.69, 'Asia/Tokyo'], ['요코하마', 139.64, 'Asia/Tokyo'], ['오사카', 135.50, 'Asia/Tokyo'], ['교토', 135.77, 'Asia/Tokyo'], ['나고야', 136.91, 'Asia/Tokyo'], ['고베', 135.20, 'Asia/Tokyo'], ['후쿠오카', 130.40, 'Asia/Tokyo'], ['히로시마', 132.46, 'Asia/Tokyo'], ['센다이', 140.87, 'Asia/Tokyo'], ['삿포로', 141.35, 'Asia/Tokyo'], ['오키나와(나하)', 127.68, 'Asia/Tokyo']]],
    ['CN', '중국', [['베이징', 116.40, 'Asia/Shanghai'], ['톈진', 117.20, 'Asia/Shanghai'], ['상하이', 121.47, 'Asia/Shanghai'], ['칭다오', 120.38, 'Asia/Shanghai'], ['웨이하이', 122.12, 'Asia/Shanghai'], ['다롄', 121.61, 'Asia/Shanghai'], ['선양', 123.43, 'Asia/Shanghai'], ['창춘', 125.32, 'Asia/Shanghai'], ['옌지(연길)', 129.51, 'Asia/Shanghai'], ['하얼빈', 126.53, 'Asia/Shanghai'], ['난징', 118.80, 'Asia/Shanghai'], ['항저우', 120.16, 'Asia/Shanghai'], ['광저우', 113.26, 'Asia/Shanghai'], ['선전', 114.06, 'Asia/Shanghai'], ['청두', 104.07, 'Asia/Shanghai'], ['충칭', 106.55, 'Asia/Shanghai'], ['우한', 114.31, 'Asia/Shanghai'], ['시안', 108.94, 'Asia/Shanghai'], ['우루무치', 87.62, 'Asia/Urumqi']]],
    ['TW', '대만', [['타이베이', 121.56, 'Asia/Taipei'], ['타이중', 120.68, 'Asia/Taipei'], ['가오슝', 120.31, 'Asia/Taipei']]],
    ['HK', '홍콩·마카오', [['홍콩', 114.17, 'Asia/Hong_Kong'], ['마카오', 113.54, 'Asia/Macau']]],
    ['MN', '몽골', [['울란바토르', 106.92, 'Asia/Ulaanbaatar']]],
    ['VN', '베트남', [['하노이', 105.85, 'Asia/Ho_Chi_Minh'], ['다낭', 108.22, 'Asia/Ho_Chi_Minh'], ['호찌민', 106.70, 'Asia/Ho_Chi_Minh']]],
    ['TH', '태국', [['방콕', 100.50, 'Asia/Bangkok'], ['치앙마이', 98.99, 'Asia/Bangkok'], ['푸껫', 98.39, 'Asia/Bangkok']]],
    ['PH', '필리핀', [['마닐라', 120.98, 'Asia/Manila'], ['세부', 123.89, 'Asia/Manila'], ['다바오', 125.61, 'Asia/Manila']]],
    ['ID', '인도네시아', [['자카르타', 106.85, 'Asia/Jakarta'], ['수라바야', 112.75, 'Asia/Jakarta'], ['발리(덴파사르)', 115.22, 'Asia/Makassar']]],
    ['MY', '말레이시아', [['쿠알라룸푸르', 101.69, 'Asia/Kuala_Lumpur'], ['코타키나발루', 116.07, 'Asia/Kuching']]],
    ['SG', '싱가포르', [['싱가포르', 103.82, 'Asia/Singapore']]],
    ['KH', '캄보디아', [['프놈펜', 104.92, 'Asia/Phnom_Penh']]],
    ['MM', '미얀마', [['양곤', 96.16, 'Asia/Yangon']]],
    ['IN', '인도', [['뉴델리', 77.21, 'Asia/Kolkata'], ['뭄바이', 72.88, 'Asia/Kolkata'], ['벵갈루루', 77.59, 'Asia/Kolkata'], ['첸나이', 80.27, 'Asia/Kolkata']]],
    ['KZ', '카자흐스탄', [['알마티', 76.95, 'Asia/Almaty']]],
    ['UZ', '우즈베키스탄', [['타슈켄트', 69.24, 'Asia/Tashkent']]],
    ['AE', '아랍에미리트', [['두바이', 55.27, 'Asia/Dubai'], ['아부다비', 54.37, 'Asia/Dubai']]],
    ['SA', '사우디아라비아', [['리야드', 46.72, 'Asia/Riyadh'], ['제다', 39.17, 'Asia/Riyadh']]],
    ['TR', '튀르키예', [['이스탄불', 28.98, 'Europe/Istanbul'], ['앙카라', 32.85, 'Europe/Istanbul']]],
    ['RU', '러시아', [['모스크바', 37.62, 'Europe/Moscow'], ['상트페테르부르크', 30.32, 'Europe/Moscow'], ['노보시비르스크', 82.92, 'Asia/Novosibirsk'], ['이르쿠츠크', 104.30, 'Asia/Irkutsk'], ['하바롭스크', 135.07, 'Asia/Vladivostok'], ['블라디보스토크', 131.89, 'Asia/Vladivostok'], ['유즈노사할린스크(사할린)', 142.73, 'Asia/Sakhalin']]],
    ['AU', '호주', [['시드니', 151.21, 'Australia/Sydney'], ['캔버라', 149.13, 'Australia/Sydney'], ['멜버른', 144.96, 'Australia/Melbourne'], ['브리즈번', 153.03, 'Australia/Brisbane'], ['골드코스트', 153.40, 'Australia/Brisbane'], ['애들레이드', 138.60, 'Australia/Adelaide'], ['퍼스', 115.86, 'Australia/Perth']]],
    ['NZ', '뉴질랜드', [['오클랜드', 174.76, 'Pacific/Auckland'], ['웰링턴', 174.78, 'Pacific/Auckland'], ['크라이스트처치', 172.64, 'Pacific/Auckland']]],
    ['GB', '영국', [['런던', -0.13, 'Europe/London'], ['맨체스터', -2.24, 'Europe/London'], ['에든버러', -3.19, 'Europe/London']]],
    ['IE', '아일랜드', [['더블린', -6.26, 'Europe/Dublin']]],
    ['FR', '프랑스', [['파리', 2.35, 'Europe/Paris'], ['리옹', 4.84, 'Europe/Paris'], ['마르세유', 5.37, 'Europe/Paris']]],
    ['DE', '독일', [['베를린', 13.40, 'Europe/Berlin'], ['함부르크', 9.99, 'Europe/Berlin'], ['프랑크푸르트', 8.68, 'Europe/Berlin'], ['뒤셀도르프', 6.77, 'Europe/Berlin'], ['뮌헨', 11.58, 'Europe/Berlin']]],
    ['NL', '네덜란드', [['암스테르담', 4.90, 'Europe/Amsterdam']]],
    ['BE', '벨기에', [['브뤼셀', 4.35, 'Europe/Brussels']]],
    ['CH', '스위스', [['취리히', 8.54, 'Europe/Zurich'], ['제네바', 6.14, 'Europe/Zurich']]],
    ['AT', '오스트리아', [['빈', 16.37, 'Europe/Vienna']]],
    ['IT', '이탈리아', [['로마', 12.50, 'Europe/Rome'], ['밀라노', 9.19, 'Europe/Rome']]],
    ['ES', '스페인', [['마드리드', -3.70, 'Europe/Madrid'], ['바르셀로나', 2.17, 'Europe/Madrid']]],
    ['SE', '스웨덴', [['스톡홀름', 18.07, 'Europe/Stockholm']]],
    ['PL', '폴란드', [['바르샤바', 21.01, 'Europe/Warsaw']]],
    ['CZ', '체코', [['프라하', 14.42, 'Europe/Prague']]],
    ['EG', '이집트', [['카이로', 31.24, 'Africa/Cairo']]],
    ['KE', '케냐', [['나이로비', 36.82, 'Africa/Nairobi']]],
    ['ZA', '남아프리카공화국', [['요하네스버그', 28.05, 'Africa/Johannesburg']]],
    ['MX', '멕시코', [['멕시코시티', -99.13, 'America/Mexico_City'], ['칸쿤', -86.85, 'America/Cancun']]],
    ['GT', '과테말라', [['과테말라시티', -90.51, 'America/Guatemala']]],
    ['BR', '브라질', [['상파울루', -46.63, 'America/Sao_Paulo'], ['리우데자네이루', -43.17, 'America/Sao_Paulo']]],
    ['AR', '아르헨티나', [['부에노스아이레스', -58.38, 'America/Argentina/Buenos_Aires']]],
    ['PY', '파라과이', [['아순시온', -57.58, 'America/Asuncion']]],
    ['CL', '칠레', [['산티아고', -70.67, 'America/Santiago']]],
    ['PE', '페루', [['리마', -77.04, 'America/Lima']]],
  ];
  var LIST = [], BY = {};
  DATA.forEach(function (c) {
    c[2].forEach(function (p) {
      var o = { name: p[0], lon: p[1], tz: p[2], country: c[0], countryName: c[1] };
      if (BY[o.name]) throw new Error('world-places: duplicate ' + o.name);
      BY[o.name] = o; LIST.push(o);
    });
  });
  var COUNTRIES = DATA.map(function (c) { return { code: c[0], name: c[1], places: c[2].map(function (p) { return BY[p[0]]; }) }; });
  function find(name) { return Object.prototype.hasOwnProperty.call(BY, name) ? BY[name] : null; }
  // 도시·나라 이름 일부로 찾기(띄어쓰기 무시)
  function search(q) {
    q = String(q || '').replace(/\s+/g, '').toLowerCase(); if (!q) return LIST.slice();
    return LIST.filter(function (p) { return (p.name + p.countryName + p.tz).replace(/\s+/g, '').toLowerCase().indexOf(q) >= 0; });
  }
  var NOTE = '해당 지역이 없으면 가까운 지역을 선택해 주세요.';
  var api = { COUNTRIES: COUNTRIES, LIST: LIST, find: find, search: search, NOTE: NOTE };
  root.MantraWorldPlaces = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
