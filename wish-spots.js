/* 소원 성취 명당 — 관리자가 출처와 함께 등록한 장소를 내 사주·소원 분야에 맞춰 점수로 순위를 매긴다. 브라우저·Node·Cloudflare Functions 공용.
   · 장소 자체(이름·위치·유형·태그·출처)는 관리자 등록 데이터다. 이 모듈은 장소를 만들어 내지 않고, 주어진 장소를 계산·정렬만 한다.
   · 원국·용신·점수 계산에는 어떤 방식으로도 더해지지 않는다(읽기만). AI 호출 없음.
   · 점수(0~100)는 이 앱의 해석 모델에서 장소끼리 비교하기 위한 상대값이며 통계적 확률이 아니다.
       방위 적합도 40 + 소원-방위 적합도 30 + 소원 분야 태그 20 + 거리 10  (아래 W)
     방위 적합도: 기준 위치에서 장소까지의 실제 방위각 → 방위오행 → 지역 해석 엔진(MantraRegionReading)의 종합 판정을 0~100 으로 옮긴 값.
     소원-방위 적합도: 소원 분야가 대응하는 오행(Eg)과 이 방향 오행(E)의 관계(같음·생함·극함) × 이 사주에서 Eg 의 억부·조후 역할.
   사용: MantraWishSpots.rank(Manse, chart, spots, base, wishId, { mode }) — base = { lat, lon, name } */
(function (G) {
  'use strict';
  var VERSION = 'wish-spots-20261103-1';
  var EL = ['목', '화', '토', '금', '수'], GN = ['비겁', '식상', '재성', '관성', '인성'];
  var WISH = [
    { id: 'wealth', name: '재물·사업', grp: 2 }, { id: 'study', name: '합격·학업', grp: 4 }, { id: 'career', name: '직업·승진', grp: 3 },
    { id: 'create', name: '창작·표현', grp: 1 }, { id: 'love', name: '인연·결혼', grp: 'love' }, { id: 'health', name: '건강·회복', grp: 'yong' }, { id: 'general', name: '종합', grp: 'general' },
  ];
  var TYPES = { mountain: '산', temple: '사찰', church: '성당·교회', sea: '바다·해안', spring: '계곡·약수', shrine: '사당·유적', other: '기타' };
  var W = { dir: 40, wish: 30, tag: 20, dist: 10 };
  var ROLE_V = { 용신: 2, 희신: 1, 한신: 0, 구신: -1, 기신: -2 };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var wishOf = function (id) { return WISH.filter(function (w) { return w.id === id; })[0] || null; };

  // 등록 장소 검증(관리자 API·테스트 공용). 금지 표현 검사는 하지 않는다.
  var ID_RE = /^[a-z0-9][a-z0-9-]{2,39}$/, DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function validateSpot(f, creating) {
    var out = {}, E = function (m) { return { error: m }; };
    if (f.name !== undefined) { if (typeof f.name !== 'string' || !f.name.trim() || f.name.length > 40) return E('이름은 1~40자입니다'); out.name = f.name.trim(); }
    if (f.lat !== undefined) { if (!Number.isFinite(f.lat) || f.lat < 33 || f.lat > 39.5) return E('위도는 국내 범위(33~39.5)여야 합니다'); out.lat = Math.round(f.lat * 10000) / 10000; }
    if (f.lon !== undefined) { if (!Number.isFinite(f.lon) || f.lon < 124.5 || f.lon > 131.5) return E('경도는 국내 범위(124.5~131.5)여야 합니다'); out.lon = Math.round(f.lon * 10000) / 10000; }
    if (f.type !== undefined) { if (!TYPES[f.type]) return E('유형은 ' + Object.keys(TYPES).join('·') + ' 중 하나입니다'); out.type = f.type; }
    if (f.tags !== undefined) { if (!Array.isArray(f.tags) || !f.tags.length || f.tags.length > 7 || f.tags.some(function (t) { return !wishOf(t) || t === undefined; })) return E('소원 분야 태그는 1~7개이며 알려진 분야만 쓸 수 있습니다'); out.tags = f.tags.filter(function (t, i, a) { return a.indexOf(t) === i; }); }
    if (f.source !== undefined) {
      var s = f.source; if (!s || typeof s !== 'object') return E('출처가 필요합니다');
      if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 60) return E('출처 이름은 1~60자입니다');
      if (typeof s.url !== 'string' || s.url.indexOf('https://') !== 0 || s.url.length > 300) return E('출처 주소는 https:// 로 시작해야 합니다');
      if (typeof s.checked !== 'string' || !DATE_RE.test(s.checked) || isNaN(Date.parse(s.checked))) return E('확인한 날짜(YYYY-MM-DD)가 필요합니다');
      out.source = { name: s.name.trim(), url: s.url.trim(), checked: s.checked };
    }
    if (f.note !== undefined) { if (typeof f.note !== 'string' || f.note.length > 200) return E('비고는 200자 이하입니다'); out.note = f.note.trim(); }
    if (f.on !== undefined) { if (typeof f.on !== 'boolean') return E('on 은 true/false 여야 합니다'); out.on = f.on; }
    if (creating) for (var k of ['name', 'lat', 'lon', 'type', 'tags', 'source']) if (out[k] === undefined) return E('새 장소에는 ' + k + ' 가 필요합니다');
    return { fields: out };
  }

  // 방위 → 소원 → 점수
  function relationOf(E, Eg) {   // 방향 오행 E 가 소원 오행 Eg 에 어떻게 작용하는가
    if (E === Eg) return { score: 100, text: '같은 기운이라 힘을 보탭니다' };
    if ((E + 1) % 5 === Eg) return { score: 85, text: '이를 생해 도와줍니다' };
    if ((Eg + 1) % 5 === E) return { score: 55, text: '이 기운이 흘러 들어가 기운이 빠질 수 있습니다' };
    if ((Eg + 2) % 5 === E) return { score: 40, text: '이 기운에 눌리는 쪽입니다' };
    return { score: 20, text: '이를 누르는 쪽입니다' };
  }
  function wishElement(ch, M, w) {
    var dEl = M.stemEl(ch.pillars.day.s), g = w.grp;
    if (g === 'love') g = ch.gender === 'F' ? 3 : 2;   // 전통 해석: 여성은 관성(남편성), 남성은 재성(아내성)
    if (g === 'yong') return { el: ch.yongAll.eokbu.yong, label: '억부 용신' };
    if (g === 'general') return null;
    return { el: (dEl + g) % 5, label: GN[g] };
  }
  var roleOf = function (ch, sch, e) { var t = ch.yongAll[sch]; if (!t || t.applicable === false || !t.roles) return null; return t.roles[e] || null; };
  var distScore = function (km) { return km <= 30 ? 100 : km >= 300 ? 20 : Math.round(100 - (km - 30) * 80 / 270); };
  var tagScore = function (tags, wishId) { return wishId === 'general' ? 70 : tags.indexOf(wishId) >= 0 ? 100 : tags.indexOf('general') >= 0 ? 65 : 25; };

  function rank(M, ch, spots, base, wishId, opts) {
    opts = opts || {}; var RR = G.MantraRegionReading, RG = G.MantraRegion, w = wishOf(wishId) || wishOf('general');
    if (!RR || !RG || !RG.directionFrom) throw new Error('region-reading.js 와 region-data.js 가 필요합니다');
    var wEl = wishElement(ch, M, w), items = [];
    (spots || []).forEach(function (sp) {
      if (sp.on === false) return;
      var dr = RG.directionFrom(base, sp), E = EL.indexOf(dr.element), a = RR.analyze(M, ch, E, opts.mode);
      var dir = Math.round(clamp(50 + a.net * 22, 0, 100)), wish, wishText, roleTxt = '';
      if (wEl) {
        var rel = relationOf(E, wEl.el), re = roleOf(ch, 'eokbu', wEl.el), rj = roleOf(ch, 'johu', wEl.el), vals = [re ? ROLE_V[re] : 0]; if (rj) vals.push(ROLE_V[rj]);
        var avg = vals.reduce(function (x, y) { return x + y; }, 0) / vals.length, factor = clamp(0.7 + 0.15 * avg, 0.4, 1);
        wish = Math.round(rel.score * factor);
        wishText = '소원 분야 ‘' + w.name + '’은 ' + wEl.label + '(' + EL[wEl.el] + ') 기운과 연결되며, 이 방향의 ' + dr.element + ' 기운은 ' + rel.text + '.';
        roleTxt = ' 이 사주에서 ' + EL[wEl.el] + ' 기운은 억부 ' + (re || '해당 없음') + (rj ? '·조후 ' + rj : '') + '입니다.';
      } else { wish = dir; wishText = '종합 소원은 특정 분야 없이 방위 적합도를 그대로 따릅니다.'; }
      var tg = tagScore(sp.tags || [], w.id), ds = distScore(dr.distKm);
      var total = Math.round((W.dir * dir + W.wish * wish + W.tag * tg + W.dist * ds) / 100);
      var tr = { direction: dr.direction, element: dr.element, deg: dr.deg, near: dr.near, refPoint: dr.refPoint }, rd = RR.read(M, ch, tr, { region: sp.name, mode: opts.mode });
      items.push({ id: sp.id, name: sp.name, type: sp.type, typeName: TYPES[sp.type] || '', tags: sp.tags || [], lat: sp.lat, lon: sp.lon, note: sp.note || '', source: sp.source || null,
        score: total, parts: { dir: dir, wish: wish, tag: tg, dist: ds }, direction: dr.direction, deg: dr.deg, element: dr.element, near: dr.near, distKm: dr.distKm, tone: a.tone, toneLabel: rd.toneLabel,
        reasons: ['방위: ' + dr.refPoint + '에서 ' + dr.direction + (dr.center ? '' : '쪽 ' + dr.deg + '°') + ' · ' + dr.element + ' 기운 · ' + rd.toneLabel + (rd.headline ? ' — ' + rd.headline.text : ''), wishText + roleTxt,
          '소원 분야 태그: ' + ((sp.tags || []).map(function (t) { return (wishOf(t) || {}).name; }).filter(Boolean).join('·') || '없음') + (tg === 100 ? ' (선택한 분야와 일치)' : tg === 65 ? ' (종합 태그)' : tg === 70 ? '' : ' (선택한 분야 태그 없음)'), '거리 ' + dr.distKm + 'km'],
        reading: { headline: rd.headline && rd.headline.text, pros: rd.pros.slice(0, 2).map(function (x) { return x.text; }), cons: rd.cons.slice(0, 2).map(function (x) { return x.text; }) } });
    });
    items.sort(function (x, y) { return y.score - x.score || x.distKm - y.distKm || (x.name < y.name ? -1 : 1); });
    items.forEach(function (it, i) { it.rank = i + 1; });
    return { version: VERSION, wish: { id: w.id, name: w.name, element: wEl ? EL[wEl.el] : null, label: wEl ? wEl.label : null }, base: { name: base.name || '기준 위치', lat: base.lat, lon: base.lon }, weights: W, items: items,
      note: '점수는 이 앱의 해석 모델에서 장소끼리 비교하기 위한 상대값(0~100)이며 확률이나 효과를 뜻하지 않습니다. 방위오행은 전통적인 상징 해석입니다.' };
  }
  G.MantraWishSpots = { VERSION: VERSION, rank: rank, validateSpot: validateSpot, WISH: WISH, TYPES: TYPES, WEIGHTS: W, ID_RE: ID_RE };
})(typeof window !== 'undefined' ? window : globalThis);
