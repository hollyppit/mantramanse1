/* 나의 운명 지도 — 지역 데이터 모듈
   · 실제 환경 데이터(facts)와 전통 방위오행 해석(tradition)을 완전히 분리해 저장·반환한다.
   · 통계는 출처와 갱신 시점이 확인된 값만 넣는다. 확인되지 않은 항목은 null이며 화면에는 "자료 부족"으로 표시한다.
   · 지역의 오행은 원국 오행·용신·점수에 어떤 방식으로도 합산하지 않는다(이 모듈은 사주 계산 결과를 읽지도 않는다).
   · 현재는 위치(위도·경도·시간대·행정구역)만 채워져 있다. 확장: 같은 구조의 레코드를 추가하거나 kv 키 region:* 로 저장한다. */
(function (G) {
  'use strict';
  var VERSION = 'region-20261102-1';
  // 방위 기준점: 대전(남한 중앙부 근사). 방위는 이 기준점에서 각 도시를 바라본 8방위다.
  var REF = { name: '대전(남한 중앙부 근사)', lat: 36.3504, lon: 127.3845 };
  var FACT_KEYS = ['climate', 'terrain', 'industry', 'employment', 'livingCost', 'housing', 'transport', 'infra'];
  var FACT_LABEL = { climate: '기후·계절', terrain: '지형·자연환경', industry: '산업 구조', employment: '고용 환경', livingCost: '생활비', housing: '주거비', transport: '교통·접근성', infra: '생활 인프라' };
  var emptyFacts = function () { var o = {}; FACT_KEYS.forEach(function (k) { o[k] = null; }); return o; };
  // [id, 이름, 행정구역, 위도, 경도]  좌표는 시청 부근의 대략값(소수 4자리)
  var RAW = [
    ['seoul', '서울', '서울특별시', 37.5665, 126.9780], ['busan', '부산', '부산광역시', 35.1796, 129.0756], ['daegu', '대구', '대구광역시', 35.8714, 128.6014],
    ['incheon', '인천', '인천광역시', 37.4563, 126.7052], ['gwangju', '광주', '광주광역시', 35.1595, 126.8526], ['daejeon', '대전', '대전광역시', 36.3504, 127.3845],
    ['ulsan', '울산', '울산광역시', 35.5384, 129.3114], ['sejong', '세종', '세종특별자치시', 36.4800, 127.2890], ['suwon', '수원', '경기도', 37.2636, 127.0286],
    ['cheongju', '청주', '충청북도', 36.6424, 127.4890], ['cheonan', '천안', '충청남도', 36.8151, 127.1139], ['jeonju', '전주', '전북특별자치도', 35.8242, 127.1480],
    ['changwon', '창원', '경상남도', 35.2285, 128.6811], ['pohang', '포항', '경상북도', 36.0190, 129.3435], ['chuncheon', '춘천', '강원특별자치도', 37.8813, 127.7298],
    ['gangneung', '강릉', '강원특별자치도', 37.7519, 128.8761], ['jeju', '제주', '제주특별자치도', 33.4996, 126.5312],
  ];
  var REGIONS = RAW.map(function (r) {
    return { id: r[0], country: 'KR', countryName: '대한민국', name: r[1], admin: r[2], lat: r[3], lon: r[4], tz: 'Asia/Seoul', facts: emptyFacts(), sources: [], updated: null, version: 1 };
  });
  var BY = {}; REGIONS.forEach(function (r) { BY[r.id] = r; });
  var get = function (id) { return BY[id] || null; };

  // ───────────── 전통 방위오행 (상징 해석, 참고용) ─────────────
  // 8방위 → 전통 대응 오행. 후천팔괘 기준: 동·동남=木, 남=火, 서·서북=金, 북=水, 동북·서남·중앙=土.
  var DIR = [
    { k: '북', el: '수', min: -22.5 }, { k: '북동', el: '토', min: 22.5 }, { k: '동', el: '목', min: 67.5 }, { k: '남동', el: '목', min: 112.5 },
    { k: '남', el: '화', min: 157.5 }, { k: '남서', el: '토', min: 202.5 }, { k: '서', el: '금', min: 247.5 }, { k: '북서', el: '금', min: 292.5 },
  ];
  function bearing(r) {   // 기준점에서 본 방위각(0=북, 시계방향). 위도 보정한 평면 근사
    var dy = r.lat - REF.lat, dx = (r.lon - REF.lon) * Math.cos(REF.lat * Math.PI / 180), dist = Math.sqrt(dx * dx + dy * dy);
    var a = Math.atan2(dx, dy) * 180 / Math.PI; if (a < -22.5) a += 360;
    return { deg: a, dist: dist };
  }
  function tradition(r) {
    var b = bearing(r);
    if (b.dist < 0.35) return { direction: '중앙', element: '토', basis: '방위 기준점(' + REF.name + ')과 가까워 중앙으로 봅니다.', refPoint: REF.name, kind: 'symbolic', note: NOTE };
    var d = DIR[0]; DIR.forEach(function (x) { if (b.deg >= x.min) d = x; });
    return { direction: d.k, element: d.el, basis: REF.name + '에서 본 ' + d.k + '쪽이며, 전통 방위오행으로는 ' + d.el + '에 대응합니다.', refPoint: REF.name, kind: 'symbolic', note: NOTE };
  }
  var NOTE = '전통 방위오행은 방위의 상징적 대응일 뿐 이 지역의 실제 오행량이 아니며, 원국의 오행·용신·점수에 더해지지 않습니다. 풍수지리와 사주명리는 서로 다른 체계이고, 이 해석이 운세 개선을 보장하지 않습니다.';

  // ───────────── 지역 환경 요약 / 비교 ─────────────
  function facts(r) {   // 항목별 {label, value|null, status}
    return FACT_KEYS.map(function (k) { var v = r.facts[k]; return { key: k, label: FACT_LABEL[k], value: v == null ? null : v, status: v == null ? '자료 부족' : '확인됨' }; });
  }
  function dataCoverage(r) { var n = FACT_KEYS.filter(function (k) { return r.facts[k] != null; }).length; return { have: n, total: FACT_KEYS.length }; }
  var haversine = function (a, b) { var R = 6371, t = Math.PI / 180, dLat = (b.lat - a.lat) * t, dLon = (b.lon - a.lon) * t, h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLon / 2) * Math.sin(dLon / 2); return 2 * R * Math.asin(Math.sqrt(h)); };
  function compare(a, b) {
    var rows = FACT_KEYS.map(function (k) { return { key: k, label: FACT_LABEL[k], a: a.facts[k], b: b.facts[k], status: a.facts[k] == null || b.facts[k] == null ? '자료 부족' : '비교 가능' }; });
    return { rows: rows, distanceKm: Math.round(haversine(a, b)), tradition: { a: tradition(a), b: tradition(b) }, sameTz: a.tz === b.tz };
  }
  // 운세 주제(환경 5영역) → 연결해서 볼 지역 항목. 해석을 새로 만들지 않고 "어느 데이터를 같이 보면 되는가"만 안내한다.
  var AREA_FACTS = { work: ['industry', 'employment'], wealth: ['livingCost', 'housing', 'employment'], rel: ['infra'], move: ['housing', 'transport'], learn: ['infra'] };
  var AREA_NAME = { work: '직업·사회 환경', wealth: '재물·경제활동', rel: '인간관계·인연', move: '생활·이동 환경', learn: '학습·재정비' };
  function link(region, topAreas, periodLabel) {
    var out = [];
    (topAreas || []).forEach(function (a) {
      var keys = AREA_FACTS[a] || [], have = keys.filter(function (k) { return region.facts[k] != null; });
      out.push({ area: a, name: AREA_NAME[a], keys: keys.map(function (k) { return FACT_LABEL[k]; }),
        text: periodLabel + '에는 ' + AREA_NAME[a] + ' 주제가 부각되는 것으로 읽습니다. ' + region.name + '의 ' + keys.map(function (k) { return FACT_LABEL[k]; }).join('·') + ' 자료를 함께 살펴보면 현실적인 선택을 검토하는 데 참고가 됩니다.' + (have.length ? '' : ' 현재 이 지역의 해당 자료는 등록되어 있지 않아 자료 부족으로 표시합니다.') });
    });
    return out;
  }

  // 관리자가 등록한 값을 합친다. 형식이 맞고 출처·기준일이 있는 항목만 받는다(없으면 기존대로 자료 부족).
  function merge(doc) {
    if (!doc || typeof doc.items !== 'object' || !doc.items) return 0; var n = 0;
    Object.keys(doc.items).forEach(function (id) {
      var r = BY[id]; if (!r) return;
      Object.keys(doc.items[id]).forEach(function (k) {
        var f = doc.items[id][k]; if (FACT_KEYS.indexOf(k) < 0 || !f || typeof f.value !== 'string' || !f.source || !f.source.name || typeof f.source.url !== 'string' || f.source.url.indexOf('https://') !== 0 || !f.updated) return;
        r.facts[k] = f.value; r.sources.push({ fact: k, name: f.source.name, url: f.source.url, updated: f.updated }); r.updated = !r.updated || f.updated > r.updated ? f.updated : r.updated; n++;
      });
    });
    return n;
  }
  // 사주 연결(참고): 이 사주의 용신 체계에서 방위오행이 어떤 역할(용신·희신·한신·구신·기신)인지 그대로 읽는다.
  // 새 규칙이나 점수가 아니며, 원국에 더하거나 용신을 바꾸지 않는다. roles는 엔진의 ch.yong.roles({0..4: 역할}, 0=목 1=화 2=토 3=금 4=수)
  var EL5 = ['목', '화', '토', '금', '수'];
  var josa = function (w) { var c = w.charCodeAt(w.length - 1) - 44032; return w + (c >= 0 && c % 28 ? '은' : '는'); };
  function fit(el, roles) {
    var i = EL5.indexOf(el), role = roles && roles[i];
    if (i < 0 || !role) return { role: null, tone: 'none', text: '이 사주의 용신 정보가 없어 연결해서 읽지 않습니다.' };
    var good = role === '용신' || role === '희신', bad = role === '기신' || role === '구신';
    return { role: role, tone: good ? 'good' : bad ? 'bad' : 'neutral',
      text: '이 사주에서 ' + josa(el) + ' ' + role + ' 오행이라, ' + (good ? '전통적으로 이 방위가 상징적으로 맞는 편으로 읽습니다.' : bad ? '상징적으로는 맞지 않는 편으로 읽지만, 실제 생활 조건이 더 중요하니 참고로만 보세요.' : '특별한 도움이나 부담으로 읽지 않습니다.') };
  }
  var api = { fit: fit, merge: merge, VERSION: VERSION, REF: REF, FACT_KEYS: FACT_KEYS, FACT_LABEL: FACT_LABEL, REGIONS: REGIONS, get: get, tradition: tradition, facts: facts, dataCoverage: dataCoverage, compare: compare, link: link, NOTE: NOTE };
  G.MantraRegion = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
