/* 사주 물상(物象) 그림 — 원국을 '그림 지시서(명세)'로 바꾸고, 그 명세로 설명·이미지 프롬프트·검사 목록·배치 밑그림을 만든다. 2026-11-24
   · 해석은 이 파일(엔진 값)이 끝낸다. 이미지 모델은 정해진 장면을 그리기만 한다(정확성의 핵심).
   · 브라우저(만세력 원국 탭)와 서버(functions/api/mulsang-art.js)가 같은 파일을 쓴다. 서버는 받은 명세를 clean() 으로 다시 검사하고,
     프롬프트·검사 목록을 서버에서 다시 만든다(임의 프롬프트로 이미지를 만들 수 없게).
   · 명세에는 생년월일·이름이 없다(간지 번호·오행 비율·조후·용희기구신·합충 관계만).
   · 화풍: 실사 사진(2026-11-24 수묵에서 바꿈). STYLE_V 가 바뀌면 저장된 그림 키도 바뀐다.
   · 사용: MantraMulsang.fromChart(M, ch) → spec · .scene(spec) · .caption(spec) · .prompt(spec) · .checklist(spec) · .judge(checks) · .sketchSVG(spec) · .key(spec) */
(function (G) {
  'use strict';
  var VERSION = 'mulsang-20261124-3', STYLE_V = 'scene1';
  var POS = ['year', 'month', 'day', 'hour'], POS_KO = { year: '년주', month: '월주', day: '일주', hour: '시주' };
  var EL_KO = ['목', '화', '토', '금', '수'], EL_HJ = ['木', '火', '土', '金', '水'];
  var STEM_HJ = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'], STEM_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var BR_HJ = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'], BR_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var BR_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var ROLE_CODE = { '용신': 'Y', '희신': 'H', '한신': 'N', '구신': 'G', '기신': 'K' }, ROLE_KO = { Y: '용신', H: '희신', N: '한신', G: '구신', K: '기신' };
  // 천간 물상(고전 물상 기준): ko 설명 · en 그림 지시 · noun 셀 때 이름 · sky 하늘에 두는 물상 · count 셀 수 있는 물체인가
  var STEM_OBJ = [
    { ko: '곧게 솟은 큰 소나무(동량지목)', short: '큰 나무', en: 'a tall, straight, ancient pine tree', noun: 'tall pine tree', count: true },
    { ko: '바위를 타고 오르는 넝쿨과 들꽃(등라)', short: '넝쿨·들꽃', en: 'climbing vines with small wildflowers', noun: 'cluster of climbing vines', count: true },
    { ko: '하늘 높이 뜬 태양', short: '태양', en: 'a radiant sun high in the sky', noun: 'sun', count: true, sky: true },
    { ko: '어둠을 밝히는 등불', short: '등불', en: 'a small glowing paper lantern', noun: 'glowing lantern', count: true },
    { ko: '우뚝 솟은 큰 산', short: '큰 산', en: 'a massive, towering mountain peak', noun: 'large mountain peak', count: true },
    { ko: '잘 가꾸어진 논밭(전원)', short: '논밭', en: 'neatly cultivated terraced fields', noun: 'patch of terraced fields', count: true },
    { ko: '거친 원석 바위', short: '원석 바위', en: 'a rugged, raw ore boulder with metallic glints', noun: 'raw ore boulder', count: true },
    { ko: '빛나는 옥·보석(주옥)', short: '보석', en: 'a small gleaming white jade jewel resting on a rock', noun: 'gleaming jewel', count: true },
    { ko: '굽이치는 큰 강', short: '큰 강', en: 'a wide, winding great river', noun: 'great river', count: true },
    { ko: '부슬부슬 내리는 비와 안개(우로)', short: '비·안개', en: 'soft drizzling rain and drifting mist', noun: 'area of drizzle and mist', count: false, sky: true }];
  // 지지 물상: 땅·계절의 결
  var BR_OBJ = [
    { ko: '한겨울 얼음 밑을 흐르는 깊은 물', en: 'a deep winter stream flowing under thin ice', short: '얼음 밑 물', noun: 'icy stream' },
    { ko: '서리 낀 얼어붙은 진흙밭', en: 'frozen, frost-covered wet farmland', short: '언 진흙밭', noun: 'frozen field' },
    { ko: '새순이 돋는 이른 봄 숲', en: 'an early-spring forest with budding branches', short: '봄 숲', noun: 'spring forest' },
    { ko: '무성한 봄풀과 꽃나무', en: 'lush spring grass and blossoming shrubs', short: '봄풀', noun: 'spring meadow' },
    { ko: '물기 머금은 봄 흙과 작은 늪', en: 'damp spring earth with a small marshy pond', short: '봄 늪', noun: 'marshy pond' },
    { ko: '달아오르는 초여름 바위 언덕', en: 'sun-warmed rocky hills of early summer', short: '바위 언덕', noun: 'rocky hill' },
    { ko: '한여름 불볕 들판', en: 'a blazing midsummer meadow', short: '불볕 들판', noun: 'blazing meadow' },
    { ko: '메마른 늦여름 흙 언덕', en: 'dry, sun-baked late-summer earthen hills', short: '흙 언덕', noun: 'dry earthen hill' },
    { ko: '쇳빛 바위가 드러난 초가을 산기슭', en: 'an early-autumn slope of grey metallic crags', short: '쇳빛 산기슭', noun: 'metallic crag' },
    { ko: '추수를 마친 금빛 가을 들', en: 'golden, freshly harvested autumn fields', short: '금빛 들', noun: 'golden field' },
    { ko: '메마른 늦가을 흙 둔덕', en: 'a barren late-autumn earthen ridge', short: '흙 둔덕', noun: 'earthen ridge' },
    { ko: '초겨울의 넓고 찬 호수', en: 'a wide, cold early-winter lake', short: '찬 호수', noun: 'cold lake' }];
  var SEASON = [['겨울', 'deep winter'], ['겨울', 'late winter'], ['봄', 'early spring'], ['봄', 'mid spring'], ['봄', 'late spring'], ['여름', 'early summer'], ['여름', 'midsummer'], ['여름', 'late summer'], ['가을', 'early autumn'], ['가을', 'mid autumn'], ['가을', 'late autumn'], ['겨울', 'early winter']];
  var SEASON_KEY = function (b) { return [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][b]; };   // 0봄 1여름 2가을 3겨울
  var SEASON_EN = ['spring', 'summer', 'autumn', 'winter'];
  var TIME = [['한밤중', 'at midnight under a dark sky'], ['깊은 밤', 'in the deep hours of the night'], ['새벽', 'at dawn, the sky just paling'], ['해 뜰 무렵', 'at sunrise'], ['아침', 'in the clear morning'], ['늦은 오전', 'in the late morning'], ['한낮', 'at high noon'], ['오후', 'in the afternoon'], ['늦은 오후', 'in the late afternoon'], ['해 질 무렵', 'at sunset'], ['저녁 어스름', 'at dusk'], ['밤', 'at night']];
  var EL_ABSENT = ['trees, vines, grass, flowers or any plants', 'sun, lanterns, candles, flames or fire', 'mountains, hills or farm fields', 'rocks, boulders, ore, metal objects or jewels', 'rivers, lakes, sea, rain, snow or mist'];
  var EL_FAMILY = ['trees and plants', 'sunlight, lanterns and fire', 'mountains, hills and earth', 'rocks, ore and jewels', 'rivers, lakes, rain and mist'];
  var EL_FAMILY_KO = ['나무·풀', '해·불빛', '산·흙', '바위·쇠·보석', '물·비·안개'];

  var isInt = function (v, lo, hi) { return typeof v === 'number' && v === Math.floor(v) && v >= lo && v <= hi; };
  var r2 = function (v) { return Math.round(v * 20) / 20; };
  var clampN = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  var ga = function (w) { w = String(w).replace(/\([^()]*\)\s*$/, ''); var c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  var J = { 이: function (w) { return w + (ga(w) ? '이' : '가'); }, 은: function (w) { return w + (ga(w) ? '은' : '는'); }, 을: function (w) { return w + (ga(w) ? '을' : '를'); }, 과: function (w) { return w + (ga(w) ? '과' : '와'); }, 예요: function (w) { return w + (ga(w) ? '이에요' : '예요'); } };

  // ── 1. 원국 → 명세(간지 번호·비율·조후·역할·관계만) ──
  function relKind(t) { t = String(t || ''); return /충/.test(t) ? 'clash' : /형/.test(t) ? 'strain' : /합/.test(t) ? 'bond' : null; }
  function fromChart(M, ch) {
    var p = ch.pillars, pil = {};
    POS.forEach(function (k) { pil[k] = p[k] ? { s: p[k].s, b: p[k].b } : null; });
    var pct = (ch.weights && ch.weights.pct) || [20, 20, 20, 20, 20];
    var roles = (ch.unified && ch.unified.roles) || (ch.yong && ch.yong.roles) || {};
    var rels = (ch.relations || []).map(function (r) { var t = relKind(r.type); if (!t) return null; var m = (r.members || []).filter(function (x) { return POS.indexOf(x) >= 0; }); if (m.length < 2) return null; return { t: t, k: r.kind === 'stem' ? 'stem' : 'branch', m: m.slice(0, 3), el: isInt(r.el, 0, 4) ? r.el : null }; }).filter(Boolean).slice(0, 8);
    return clean({ v: 1, pillars: pil, ratio: pct.map(function (v) { return Math.round(v || 0); }), temp: r2((ch.climate && ch.climate.temp) || 0), hum: r2((ch.climate && ch.climate.hum) || 0), roles: [0, 1, 2, 3, 4].map(function (i) { return ROLE_CODE[roles[i]] || 'N'; }), rels: rels });
  }
  // 서버·브라우저 공통 검사: 형식이 하나라도 어긋나면 null
  function clean(x) {
    if (!x || typeof x !== 'object' || x.v !== 1 || !x.pillars) return null;
    var pil = {};
    for (var i = 0; i < 4; i++) { var k = POS[i], q = x.pillars[k]; if (q == null && k === 'hour') { pil[k] = null; continue; } if (!q || !isInt(q.s, 0, 9) || !isInt(q.b, 0, 11) || (q.s % 2) !== (q.b % 2)) return null; pil[k] = { s: q.s, b: q.b }; }
    if (!Array.isArray(x.ratio) || x.ratio.length !== 5 || !x.ratio.every(function (v) { return isInt(v, 0, 100); })) return null;
    if (typeof x.temp !== 'number' || typeof x.hum !== 'number' || !isFinite(x.temp) || !isFinite(x.hum)) return null;
    if (!Array.isArray(x.roles) || x.roles.length !== 5 || !x.roles.every(function (r) { return /^[YHNGK]$/.test(r); })) return null;
    var rels = Array.isArray(x.rels) ? x.rels.slice(0, 8) : [];
    for (var j = 0; j < rels.length; j++) { var r = rels[j]; if (!r || ['clash', 'bond', 'strain'].indexOf(r.t) < 0 || ['stem', 'branch'].indexOf(r.k) < 0 || !Array.isArray(r.m) || r.m.length < 2 || r.m.length > 3 || !r.m.every(function (m) { return POS.indexOf(m) >= 0 && (m !== 'hour' || pil.hour); }) || !(r.el === null || r.el === undefined || isInt(r.el, 0, 4))) return null; }
    return { v: 1, pillars: pil, ratio: x.ratio.slice(), temp: r2(clampN(x.temp, -1.5, 1.5)), hum: r2(clampN(x.hum, -1.5, 1.5)), roles: x.roles.slice(), rels: rels.map(function (r) { return { t: r.t, k: r.k, m: r.m.slice(), el: r.el == null ? null : r.el }; }) };
  }
  function key(spec) {   // 2026-11-24: 한 장면 = 일간 × 계절 × 가장 많은 오행 × 용신(있음/없음) × 없는 오행 — 같은 조합은 저장본 공유
    var sc = scene(spec); if (!sc) return null; var H = headOf(sc);
    return STYLE_V + '|' + sc.main.stem + '|' + sc.seasonKey + '|' + H.top + '|' + (H.need == null ? '-' : H.need + (H.needAbsent ? 'x' : 'w')) + '|' + sc.absent.join('');
  }


  // ── 2. 명세 → 장면(그림 요소·자리·크기·빛) ──
  function sizeBand(v) { return v >= 35 ? 4 : v >= 20 ? 3 : v >= 8 ? 2 : v > 0 ? 1 : 0; }
  var SIZE_EN = ['absent', 'small', 'modest', 'prominent', 'dominant'], SIZE_KO = ['없음', '작게', '알맞게', '크게', '화면을 압도할 만큼'];
  function tempBand(t) { return t <= -0.5 ? 'C' : t <= -0.2 ? 'c' : t >= 0.5 ? 'H' : t >= 0.2 ? 'h' : 'm'; }
  function humBand(h) { return h >= 0.5 ? 'W' : h >= 0.2 ? 'w' : h <= -0.5 ? 'D' : h <= -0.2 ? 'd' : 'm'; }
  var CLIMATE = { C: ['몹시 차가워 눈과 서리가 덮인', 'bitterly cold, with snow and frost covering the ground'], c: ['서늘하고 찬 기운이 도는', 'cool and chilly'], m: ['', ''], h: ['따뜻한 기운이 도는', 'mild and warm'], H: ['뜨겁고 메마른 열기가 오르는', 'hot, with shimmering heat'] };
  var HUMID = { W: ['물안개가 자욱한', 'heavy humid mist hanging in the air'], w: ['촉촉한', 'moist air'], m: ['', ''], d: ['건조한', 'dry air'], D: ['바싹 마른', 'parched, cracked dry ground'] };
  var LAYOUT = { year: { ko: '먼 왼쪽 뒤편', en: 'far in the left background, small and faint with distance', x: 0.2, depth: 0.55 }, month: { ko: '화면 뒤쪽 가운데', en: 'across the middle background, setting the season', x: 0.5, depth: 0.7 }, day: { ko: '화면 한가운데 앞쪽', en: 'in the center foreground as the main subject, the largest and most detailed object', x: 0.5, depth: 1 }, hour: { ko: '오른쪽 앞', en: 'in the right foreground', x: 0.8, depth: 0.85 } };
  function scene(spec) {
    var s = clean(spec); if (!s) return null;
    var dEl = Math.floor(s.pillars.day.s / 2), mB = s.pillars.month.b, hr = s.pillars.hour;
    var items = POS.filter(function (k) { return s.pillars[k]; }).map(function (k) {
      var st = s.pillars[k].s, b = s.pillars[k].b, e = Math.floor(st / 2), be = BR_EL[b];
      return { pos: k, stem: st, br: b, el: e, brEl: be, obj: STEM_OBJ[st], ground: BR_OBJ[b], size: sizeBand(s.ratio[e]), role: s.roles[e], brRole: s.roles[be], layout: LAYOUT[k] };
    });
    var counts = {}; items.forEach(function (it) { counts[it.stem] = (counts[it.stem] || 0) + 1; });
    var absent = [0, 1, 2, 3, 4].filter(function (e) { return s.ratio[e] === 0 && !items.some(function (it) { return it.el === e || it.brEl === e; }); });
    var yong = [0, 1, 2, 3, 4].filter(function (e) { return s.roles[e] === 'Y'; }), hee = [0, 1, 2, 3, 4].filter(function (e) { return s.roles[e] === 'H'; }), gi = [0, 1, 2, 3, 4].filter(function (e) { return s.roles[e] === 'K'; });
    // 생(生) 흐름: 이웃 자리끼리 앞 글자의 오행이 뒤 글자를 낳으면 흐름으로 그린다(년→월→일←시)
    var flows = [];
    [['year', 'month'], ['month', 'day'], ['hour', 'day']].forEach(function (pr) { var a = items.filter(function (x) { return x.pos === pr[0]; })[0], b = items.filter(function (x) { return x.pos === pr[1]; })[0]; if (a && b && (a.el + 1) % 5 === b.el) flows.push({ from: a, to: b }); });
    var rels = s.rels.map(function (r) { return { t: r.t, k: r.k, el: r.el, its: r.m.map(function (m) { return items.filter(function (x) { return x.pos === m; })[0]; }).filter(Boolean) }; }).filter(function (r) { return r.its.length >= 2; });
    return { spec: s, items: items, main: items.filter(function (x) { return x.pos === 'day'; })[0], counts: counts, absent: absent, yong: yong, hee: hee, gi: gi, flows: flows, rels: rels,
      season: SEASON[mB], seasonKey: SEASON_KEY(mB), time: hr ? TIME[hr.b] : null, climate: CLIMATE[tempBand(s.temp)], humid: HUMID[humBand(s.hum)], dEl: dEl, ratio: s.ratio };
  }

  // ── 2b. 한 줄 진단(2026-11-24 한 장면): 나(일간 물상) · 놓인 계절 · 가장 많은 기운 · 필요한 기운(용신) ──
  var NEED_KO = ['자라날 새싹과 나무', '따뜻한 햇살', '발 디딜 단단한 땅', '단단한 바위와 쇠', '시원한 물'];
  var NEED_EN = ['a young green sapling', 'warm sunlight breaking through', 'a patch of solid, firm earth', 'a solid grey boulder', 'a clear spring of water'];
  var SEASON_KO = ['봄', '여름', '가을', '겨울'];
  function headOf(sc) {
    var top = [0, 1, 2, 3, 4].sort(function (a, b) { return sc.ratio[b] - sc.ratio[a] || a - b; })[0];
    var need = sc.yong.length ? sc.yong[0] : null, needAbsent = need != null && sc.absent.indexOf(need) >= 0;
    var mo = sc.main.obj.short, place = SEASON_KO[sc.seasonKey] + (sc.main.obj.sky ? ' 하늘의 ' : '의 ');
    var headline = place + mo + (need == null ? '' : ' — ' + NEED_KO[need] + (ga(NEED_KO[need]) ? '이' : '가') + (needAbsent ? ' 없어 기다리는 사주' : ' 필요한 사주'));
    return { top: top, need: need, needAbsent: needAbsent, headline: headline };
  }
  function summary(spec) {
    var sc = scene(spec); if (!sc) return null; var H = headOf(sc), m = sc.main;
    var lines = [
      { k: '나', t: '일간 ' + STEM_HJ[m.stem] + '(' + EL_KO[m.el] + ')' + (ga(EL_KO[m.el]) ? '은 ' : '는 ') + J.예요(m.obj.ko) + '. 태어난 달(' + BR_HJ[sc.spec.pillars.month.b] + ')이 ' + SEASON_KO[sc.seasonKey] + '이라 ' + J.과(BR_OBJ[sc.spec.pillars.month.b].ko) + ' 함께 있어요.' },
      { k: '가득한 것', t: EL_FAMILY_KO[H.top] + '(' + EL_KO[H.top] + ' ' + sc.ratio[H.top] + '%)' + (ga(EL_FAMILY_KO[H.top]) ? '이' : '가') + ' 풍경을 가장 많이 채워요.' },
      H.need == null ? null : { k: '필요한 것', t: NEED_KO[H.need] + '(용신 ' + EL_KO[H.need] + ') — ' + (H.needAbsent ? '원국에 없어서 그림에는 먼 지평선의 금빛으로만 남겨 두었어요. 살면서 밖에서 채워 갈 기운이에요.' : '그림에서 금빛 햇살을 받는 곳이에요.') }].filter(Boolean);
    return { headline: H.headline, lines: lines, top: H.top, need: H.need, needAbsent: H.needAbsent };
  }

  // ── 2c. 물상 작용도(2026-11-24 사용자 요청: AI 그림 대신 도형) — 나(일간 물상)를 가운데 두고, 다른 오행이 나에게 하는 일(생·극)을 화살표와 짧은 말로 ──
  //  모두 원국 비율·통합 용신 역할(명세)만 읽는다. 관계: 인성(나를 낳음) · 관성(나를 누름) · 식상(내가 낳음) · 재성(내가 다룸) · 비겁(같은 오행)
  var NOUN = ['나무', '불', '흙', '쇠', '물'];
  var GEN_S = ['살림', '데움', '품음', '냄', '키움'], KE_S = ['붙잡음', '달굼', '막음', '다듬음', '끔'];   // 생: a→a+1, 극: a→a+2 (a 기준)
  var GEN_V = ['살려요', '데워요', '품어 길러요', '맑게 내요', '키워요'], KE_V = ['뚫고 붙잡아요', '달궈요', '막아요', '다듬어요', '꺼요'];
  var REL_K = ['비겁', '식상', '재성', '관성', '인성'], REL_EASY = ['같은 편', '내가 내놓는 것', '내가 다루는 것', '나를 누르는 것', '나를 채워 주는 것'];
  var PLAIN = ['내 편', '내가 쏟음', '내가 다룸', '나를 누름', '나를 도움'];   // 작용도 화살표 위 말(삶의 말)
  var LIFE = ['동료·형제·자존심', '말·재능·표현', '돈·결과·현실', '일·책임·규칙', '배움·도움·어른'];
  var LIFE_HEAD = [['내 편과 자존심이 강한 사주', '내 편이 곁에 있는 사주'], ['재능·표현을 쏟느라 지치기 쉬운 사주', '재능·표현이 앞서는 사주'], ['돈·결과를 챙기느라 바쁜 사주', '돈·결과를 다루는 감각이 앞서는 사주'], ['일과 책임의 압박이 큰 사주', '일과 규칙이 나를 다듬는 사주'], ['도움과 배움에 기대는 힘이 큰 사주', '도움과 배움을 받는 사주']];
  var amtBand = function (v) { return v >= 40 ? 4 : v >= 25 ? 3 : v >= 10 ? 2 : v > 0 ? 1 : 0; };
  var AMT_ADV = ['', '살짝 ', '', '세게 ', '너무 세게 '], AMT_KO = ['없음', '조금', '알맞게', '많이', '넘치게'];
  var ROLE_TAG = { Y: ['필요', 'good'], H: ['도움', 'good'], G: ['부담', 'bad'], K: ['부담', 'bad'], N: ['', ''] };
  var withWa = function (a, b) { return a + (ga(a) ? '과 ' : '와 ') + b; };
  function action(spec) {
    var sc = scene(spec); if (!sc) return null;
    var d = sc.dEl, mo = sc.main.obj.short, R = sc.ratio, roles = sc.spec.roles;
    var parts = [0, 1, 2, 3, 4].map(function (g) {
      var e = (d + g) % 5, v = R[e], b = amtBand(v), absent = sc.absent.indexOf(e) >= 0, role = roles[e], s = '', short = '';
      if (g === 0) { short = '곁에서 버팀'; s = '같은 ' + J.이(NOUN[e]) + ' ' + AMT_KO[b] + ' 있어 곁에서 함께 버텨요.'; }
      else if (g === 4) { short = GEN_S[e]; s = J.이(NOUN[e]) + ' ' + J.을(mo) + ' ' + AMT_ADV[b] + GEN_V[e] + '.'; }
      else if (g === 3) { short = KE_S[e]; s = J.이(NOUN[e]) + ' ' + J.을(mo) + ' ' + AMT_ADV[b] + KE_V[e] + '.'; }
      else if (g === 1) { short = GEN_S[d]; s = J.이(mo) + ' ' + J.을(NOUN[e]) + ' ' + GEN_V[d] + (b >= 3 ? ' — 그만큼 내 기운이 많이 빠져요.' : '.'); }
      else { short = KE_S[d]; s = J.이(mo) + ' ' + J.을(NOUN[e]) + ' ' + KE_V[d] + (b >= 3 ? ' — 다룰 것이 많아 바빠요.' : '.'); }
      if (absent) { s = J.이(NOUN[e]) + ' 원국에 없어요 — ' + REL_EASY[g] + '의 자리가 비어 있어요.'; short = '빈자리'; }
      return { g: g, e: e, v: v, band: b, absent: absent, role: role, tag: ROLE_TAG[role] || ['', ''], rel: REL_K[g], easy: REL_EASY[g], life: LIFE[g], plain: absent ? '빈자리' : PLAIN[g], short: short, text: s };
    });
    // 가장 센 작용(나를 뺀 가장 큰 오행 — 비겁이 가장 크면 '같은 편이 가득'), 필요한 기운(용신 → 희신)
    var top = parts.slice(1).concat([parts[0]]).filter(function (p) { return !p.absent; }).sort(function (a, b) { return b.v - a.v; })[0];
    var hot = sc.spec.temp >= 0.2, cold = sc.spec.temp <= -0.2;
    // 필요한 기운은 나와의 관계로 부른다(조후가 걸리면 온도 말을 먼저): 비겁 함께 버틸 · 식상 기운을 풀어 낼 · 재성 손에 쥘 · 관성 나를 잡아 줄 · 인성 나를 채워 줄
    var NEED_REL = ['함께 버틸 ', '기운을 풀어 낼 ', '손에 쥘 ', '나를 잡아 줄 ', '나를 채워 줄 '];
    var NEED_P = function (e) { return hot && e === 4 ? '식혀 줄 물' : cold && e === 1 ? '녹여 줄 불' : NEED_REL[(e - d + 5) % 5] + NOUN[e]; };
    var needEls = sc.yong.concat(sc.hee).slice(0, 2), needs = needEls.map(NEED_P);
    var KE_P = ['붙잡힌', '달궈지는', '막힌', '다듬어지는', '꺼질 듯한'];
    var TOP_P = [
      function (p) { return '같은 ' + J.이(NOUN[p.e]) + ' 가득해 힘이 넘치는'; },
      function (p) { return J.을(NOUN[p.e]) + ' ' + (p.band >= 3 ? '내놓느라 기운이 빠지는' : '내놓는'); },
      function (p) { return J.을(NOUN[p.e]) + ' ' + (p.band >= 3 ? '다루느라 바쁜' : '다루는'); },
      function (p) { return NOUN[p.e] + '에 ' + (p.band >= 4 ? '너무 세게 ' : p.band >= 3 ? '세게 ' : '') + KE_P[p.e]; },
      function (p) { return NOUN[p.e] + (p.band >= 4 ? '에 너무 감싸인' : '의 보살핌을 받는'); }];
    // 2026-11-24 '더 쉽게': 진단 = 물상 한 구절 + 삶의 말(일·책임 / 돈·결과 …). 그림 아래 세 줄(가장 센 기운·필요한 기운·비어 있는 기운)
    var head = top ? TOP_P[top.g](top) + ' ' + mo + ' — ' + LIFE_HEAD[top.g][top.band >= 3 ? 0 : 1] : mo + ' 사주';
    var needAbs = needEls.filter(function (e) { return sc.absent.indexOf(e) >= 0; });
    var needLine = needs.length > 1 ? withWa(needs[0], needs[1]) : needs[0] || '';
    var sub = needLine ? J.이(needLine) + ' 필요해요' + (needAbs.length ? ' — ' + J.은(needAbs.map(function (e) { return NOUN[e]; }).join('·')) + ' 원국에 없어 살면서 밖에서 채워 가요.' : '.') : '';
    var tb = tempBand(sc.spec.temp), hb = humBand(sc.spec.hum), tw = { C: ['몹시 차갑고', '몹시 차가운'], c: ['서늘하고', '서늘한'], h: ['따뜻하고', '따뜻한'], H: ['뜨겁고', '뜨거운'] }[tb], hw = { W: '몹시 습한', w: '촉촉한', d: '건조한', D: '메마른' }[hb];
    var air = tw ? (hw ? tw[0] + ' ' + hw : tw[1]) : hw || '';
    var season = SEASON_KO[sc.seasonKey] + '에 태어났어요' + (air ? ' · 원국은 ' + air + ' 편이에요' : '');
    var relOf = function (e) { return (e - d + 5) % 5; }, keys = [];
    if (top) keys.push({ k: '가장 센 기운', t: J.은(NOUN[top.e] + '(' + EL_KO[top.e] + ' ' + top.v + '%)') + ' ' + J.예요(REL_EASY[top.g].replace(/것$/, '기운')) + ' — 삶에서는 ' + LIFE[top.g] + '. ' + top.text, tone: top.tag[1] });
    if (needEls.length) { var nl = needEls.map(function (e, i) { return needs[i] + '(' + LIFE[relOf(e)] + ')'; }), nj = nl.length > 1 ? withWa(nl[0], nl[1]) : nl[0];
      keys.push({ k: '필요한 기운', t: J.이(nj) + ' 필요해요. ' + (needAbs.length ? J.은(needAbs.map(function (e) { return NOUN[e]; }).join('·')) + ' 원국에 없어 살면서 밖에서 채워 가야 해요.' : '가까이할수록 균형이 잡혀요.'), tone: 'good' }); }
    var emp = parts.filter(function (p) { return p.absent && needEls.indexOf(p.e) < 0; });
    if (emp.length) keys.push({ k: '비어 있는 기운', t: emp.map(function (p) { return NOUN[p.e] + '(' + LIFE[p.g] + ')'; }).join(' · ') + ' 쪽이 원국에 없어요. 타고나기보다 경험으로 채워 가는 부분이에요.', tone: '' });
    return { sc: sc, d: d, mo: mo, parts: parts, top: top, needEls: needEls, headline: head, sub: sub, season: season, keys: keys };
  }
  var EL_FILL = ['#5fae6e', '#e0705a', '#d9b25c', '#a9aeb8', '#5a7fbf'], EL_DARK = ['#2f6b3b', '#9b3422', '#8a6a1c', '#4d535e', '#2d4f8f'];
  function diagramSVG(spec) {
    var A = action(spec); if (!A) return '';
    var W = 640, H = 470, cx = 320, cy = 222, P = { 4: [320, 72], 3: [100, 222], 1: [540, 222], 2: [470, 392], 0: [170, 392] };
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" class="ms-dia" role="img" aria-label="' + esc(A.headline) + '"><defs>' + [0, 1, 2, 3, 4].map(function (e) { return '<marker id="msa' + e + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + EL_DARK[e] + '"/></marker>'; }).join('') + '</defs>';
    var rad = function (v) { return 34 + Math.min(26, v * 0.5); }, R0 = 74;
    // 화살표: 인성·관성은 그 오행 → 나, 식상·재성은 나 → 그 오행, 비겁은 화살표 없이 곁(점선). 굵기 = 양
    A.parts.forEach(function (p) {
      var q = P[p.g], toMe = p.g === 3 || p.g === 4, a = toMe ? q : [cx, cy], b = toMe ? [cx, cy] : q, ra = toMe ? rad(p.v) : R0, rb = toMe ? R0 : rad(p.v);
      var L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, x1 = a[0] + ux * (ra + 4), y1 = a[1] + uy * (ra + 4), x2 = b[0] - ux * (rb + 10), y2 = b[1] - uy * (rb + 10);
      var w = p.absent ? 2 : 2.5 + p.band * 2.2, col = p.absent ? '#b7b2a8' : EL_DARK[p.e], dash = p.absent ? '4 7' : p.g === 0 ? '3 9' : '';
      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : ' marker-end="url(#msa' + p.e + ')"') + ' opacity=".85"/>';
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, tw = p.plain.length * 17 + 22;
      s += '<rect x="' + (mx - tw / 2).toFixed(1) + '" y="' + (my - 15).toFixed(1) + '" width="' + tw + '" height="30" rx="15" fill="#fff" stroke="' + col + '" stroke-width="1.5"/><text x="' + mx.toFixed(1) + '" y="' + (my + 6).toFixed(1) + '" text-anchor="middle" font-size="17" font-weight="800" fill="' + col + '">' + esc(p.plain) + '</text>';
    });
    // 둘레 오행: 원 크기 = 비율, 테두리 굵게 + 위 꼬리표 = 필요(용신)·도움(희신)·부담(기신·구신), 없으면 점선 빈 원
    A.parts.forEach(function (p) {
      var q = P[p.g], r = rad(p.v), tag = p.tag[0], ink = p.absent ? '#8d877c' : '#fff';
      s += p.absent ? '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + r + '" fill="#fbfaf7" stroke="#b7b2a8" stroke-width="2.5" stroke-dasharray="6 6"/>' : '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + r + '" fill="' + EL_FILL[p.e] + '" stroke="' + EL_DARK[p.e] + '" stroke-width="' + (tag ? 4 : 2) + '"/>';
      s += '<text x="' + q[0] + '" y="' + (q[1] - 2) + '" text-anchor="middle" font-size="' + (p.g === 0 ? 18 : 22) + '" font-weight="800" fill="' + ink + '">' + esc((p.g === 0 ? '곁의 ' : '') + NOUN[p.e]) + '</text>';
      s += '<text x="' + q[0] + '" y="' + (q[1] + 20) + '" text-anchor="middle" font-size="16" font-weight="700" fill="' + ink + '">' + (p.absent ? '없음' : EL_KO[p.e] + ' ' + p.v + '%') + '</text>';
      if (tag) s += '<rect x="' + (q[0] - 29) + '" y="' + (q[1] - r - 17) + '" width="58" height="26" rx="13" fill="' + (p.tag[1] === 'good' ? '#178a4a' : '#c9412d') + '"/><text x="' + q[0] + '" y="' + (q[1] - r + 2) + '" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">' + tag + '</text>';
    });
    // 가운데 나
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R0 + '" fill="#fff" stroke="' + EL_DARK[A.d] + '" stroke-width="5"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (R0 - 9) + '" fill="' + EL_FILL[A.d] + '" fill-opacity=".22"/>';
    s += '<text x="' + cx + '" y="' + (cy - 16) + '" text-anchor="middle" font-size="17" font-weight="700" fill="' + EL_DARK[A.d] + '">나 · ' + STEM_HJ[A.sc.main.stem] + ' ' + EL_KO[A.d] + '</text>';
    s += '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" font-size="' + (A.mo.length > 5 ? 18 : 22) + '" font-weight="800" fill="#222">' + esc(A.mo) + '</text>';
    s += '<text x="' + cx + '" y="' + (cy + 36) + '" text-anchor="middle" font-size="14" fill="#666">' + esc(SEASON_KO[A.sc.seasonKey]) + '에 태어남</text>';
    return s + '</svg>';
  }

  // ── 2d. 물상 흐름도(2026-11-24 사용자 요청: 비율 말고 '어떻게 움직이고 작용하는지') ──
  //  가장 센 기운에서 출발해 상생(生) 순서로 따라가며 어디로 흘러가고 어디서 끊기는지, 그리고 넘치는 기운이 누구를 누르는지(剋)를 순서대로 ①②③…
  //  이름은 이 사주에 실제로 있는 글자의 물상(일간은 나). 비율 숫자는 쓰지 않는다(다른 카드에 이미 있음)
  function flow(spec) {
    var A = action(spec); if (!A) return null;
    var sc = A.sc, d = A.d, R = sc.ratio, absent = function (e) { return sc.absent.indexOf(e) >= 0; };
    var nameOf = function (e) {
      if (e === d) return A.mo;
      var st = sc.items.filter(function (x) { return x.el === e; })[0]; if (st) return st.obj.short;
      var br = sc.items.filter(function (x) { return x.brEl === e; })[0]; if (br) return br.ground.short;
      return NOUN[e];
    };
    var tailGen = function (a, b) { return b === d ? '나에게 힘이 들어와요(' + LIFE[4] + ')' : a === d ? '내 힘이 밖으로 나가요(' + LIFE[1] + ')' : ''; };
    var tailKe = function (a, b) { return b === d ? '나를 압박해요(' + LIFE[3] + ')' : a === d ? '내가 붙잡아 다뤄요(' + LIFE[2] + ')' : ''; };
    var order = [0, 1, 2, 3, 4].filter(function (e) { return !absent(e); }).sort(function (a, b) { return R[b] - R[a] || a - b; });
    // 출발점: 나에게서 상생을 거슬러 올라가 끊기지 않는 가장 먼 기운(최대 4칸) — 흐름이 나를 지나가게
    var top0 = order[0], s0 = d; for (var k0 = 0; k0 < 4 && !absent((s0 + 4) % 5); k0++) s0 = (s0 + 4) % 5;
    var steps = [], a = s0;
    for (var i = 0; i < 5; i++) {
      var b = (a + 1) % 5;
      if (absent(b)) { steps.push({ kind: 'cut', a: a, b: b, text: nameOf(a) + '의 기운이 ' + J.이(NOUN[b]) + ' 없어 더 흐르지 못하고 고여요.', tail: b === d ? '' : '(' + LIFE[(b - d + 5) % 5] + ' 쪽이 비어 있어요)' }); break; }
      steps.push({ kind: 'gen', a: a, b: b, w: Math.min(R[a], R[b]), text: J.이(nameOf(a)) + ' ' + J.을(nameOf(b)) + ' ' + GEN_V[a] + '.', tail: tailGen(a, b) });
      a = b; if (b === s0) { steps[steps.length - 1].loop = true; break; }   // 다섯 기운이 모두 있으면 한 바퀴 돌고 멈춘다
    }
    // 넘치는 기운의 극: 센 기운(25 이상)이 실제로 있는 상대를 누를 때, 나와 얽힌 것부터 최대 2개
    var kes = [0, 1, 2, 3, 4].filter(function (x) { var t = (x + 2) % 5; return R[x] >= 25 && !absent(t); }).map(function (x) { return { a: x, b: (x + 2) % 5 }; })
      .sort(function (p, q) { return ((q.a === d || q.b === d) - (p.a === d || p.b === d)) || R[q.a] - R[p.a]; }).slice(0, 2);
    kes.forEach(function (k) { steps.push({ kind: 'ke', a: k.a, b: k.b, w: R[k.a], text: J.이(nameOf(k.a)) + ' ' + J.을(nameOf(k.b)) + ' ' + (R[k.a] >= 40 ? '세게 ' : '') + KE_V[k.a] + '.', tail: tailKe(k.a, k.b) }); });
    steps.forEach(function (x, i) { x.n = i + 1; });
    var needLine = A.needEls.length ? (function () { var nl = A.needEls.map(function (e) { return NOUN[e]; }); return nl.length > 1 ? withWa(nl[0], nl[1]) : nl[0]; })() : '';
    var loop = steps.some(function (x) { return x.loop; }), tg = (top0 - d + 5) % 5, end = (loop ? '다섯 기운이 끊김 없이 한 바퀴 돌아요. ' : '') + '가장 크게 움직이는 건 ' + nameOf(top0) + '(' + (tg ? REL_EASY[tg].replace(/것$/, '기운') : '나와 같은 기운') + ')이에요.' + (needLine ? ' 흐름을 고르게 하려면 ' + J.이(needLine) + ' 필요해요.' : '');
    return { A: A, s0: s0, steps: steps, nameOf: nameOf, end: end, names: [0, 1, 2, 3, 4].map(nameOf) };
  }
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
  function flowSVG(spec) {
    var F = flow(spec); if (!F) return '';
    var A = F.A, sc = A.sc, d = A.d, R = sc.ratio, W = 640, H = 520, cx = 320, cy = 268, RR = 196;
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var pos = [0, 1, 2, 3, 4].map(function (e) { var an = (-90 + e * 72) * Math.PI / 180; return [cx + RR * Math.cos(an), cy + RR * Math.sin(an)]; });
    var absent = function (e) { return sc.absent.indexOf(e) >= 0; };
    var rad = function (e) { return absent(e) ? 36 : 36 + [0, 4, 10, 16, 22][amtBand(R[e])]; };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" class="ms-flow" role="img" aria-label="' + esc(F.end) + '"><style>.mf{stroke-dasharray:12 9;animation:mfd 1.1s linear infinite}.mk{stroke-dasharray:6 7;animation:mfd .8s linear infinite}@keyframes mfd{to{stroke-dashoffset:-21}}@media (prefers-reduced-motion:reduce){.mf,.mk{animation:none}}</style><defs>' +
      '<marker id="mfa" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#3d7a4f"/></marker><marker id="mka" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c9412d"/></marker></defs>';
    var seg = function (a, b, ra, rb, pad) { var p = pos[a], q = pos[b], L = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L; return [p[0] + ux * (ra + 6), p[1] + uy * (ra + 6), q[0] - ux * (rb + pad), q[1] - uy * (rb + pad)]; };
    // 바탕: 상생 고리(흐린 선)
    for (var e = 0; e < 5; e++) { var g = seg(e, (e + 1) % 5, rad(e), rad((e + 1) % 5), 6); s += '<line x1="' + g[0].toFixed(1) + '" y1="' + g[1].toFixed(1) + '" x2="' + g[2].toFixed(1) + '" y2="' + g[3].toFixed(1) + '" stroke="#d9d4c8" stroke-width="2"/>'; }
    var badge = function (x, y, txt, col) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="15" fill="#fff" stroke="' + col + '" stroke-width="2.5"/><text x="' + x.toFixed(1) + '" y="' + (y + 6).toFixed(1) + '" text-anchor="middle" font-size="17" font-weight="800" fill="' + col + '">' + txt + '</text>'; };
    F.steps.forEach(function (x) {
      var g = seg(x.a, x.b, rad(x.a), rad(x.b), 12), mx = (g[0] + g[2]) / 2, my = (g[1] + g[3]) / 2;
      if (x.kind === 'gen') s += '<line class="mf" x1="' + g[0].toFixed(1) + '" y1="' + g[1].toFixed(1) + '" x2="' + g[2].toFixed(1) + '" y2="' + g[3].toFixed(1) + '" stroke="#3d7a4f" stroke-width="' + (3 + amtBand(x.w) * 2) + '" stroke-linecap="round" marker-end="url(#mfa)"/>' + badge(mx, my, CIRC[x.n - 1], '#3d7a4f');
      else if (x.kind === 'ke') s += '<line class="mk" x1="' + g[0].toFixed(1) + '" y1="' + g[1].toFixed(1) + '" x2="' + g[2].toFixed(1) + '" y2="' + g[3].toFixed(1) + '" stroke="#c9412d" stroke-width="' + (3 + amtBand(x.w) * 2) + '" stroke-linecap="round" marker-end="url(#mka)"/>' + badge(mx, my, CIRC[x.n - 1], '#c9412d');
      else s += '<line x1="' + g[0].toFixed(1) + '" y1="' + g[1].toFixed(1) + '" x2="' + g[2].toFixed(1) + '" y2="' + g[3].toFixed(1) + '" stroke="#9a948a" stroke-width="3" stroke-dasharray="3 7"/>' + '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="15" fill="#fff" stroke="#9a948a" stroke-width="2.5"/><text x="' + mx.toFixed(1) + '" y="' + (my + 6).toFixed(1) + '" text-anchor="middle" font-size="16" font-weight="800" fill="#6b665d">✕</text>';
    });
    // 오행 자리: 물상 이름(이 사주에 있는 글자), 크기 = 양(숫자 없이), 없으면 점선 빈 원, 나는 두꺼운 테두리
    for (e = 0; e < 5; e++) {
      var p = pos[e], r = rad(e), ab = absent(e), nm = F.names[e], tag = (ROLE_TAG[sc.spec.roles[e]] || ['', ''])[0];
      s += ab ? '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r + '" fill="#fbfaf7" stroke="#b7b2a8" stroke-width="2.5" stroke-dasharray="6 6"/>' : '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r + '" fill="' + EL_FILL[e] + '" stroke="' + (e === d ? '#222' : EL_DARK[e]) + '" stroke-width="' + (e === d ? 5 : 2) + '"/>';
      s += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 2).toFixed(1) + '" text-anchor="middle" font-size="' + (nm.length > 4 ? 16 : 19) + '" font-weight="800" fill="' + (ab ? '#8d877c' : '#fff') + '">' + esc(ab ? NOUN[e] : nm) + '</text>';
      s += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 22).toFixed(1) + '" text-anchor="middle" font-size="14" font-weight="700" fill="' + (ab ? '#8d877c' : '#fff') + '" opacity=".9">' + (ab ? '없음' : EL_KO[e] + ' ' + EL_HJ[e]) + '</text>';
      if (e === d) s += '<rect x="' + (p[0] - 20).toFixed(1) + '" y="' + (p[1] - r - 16).toFixed(1) + '" width="40" height="26" rx="13" fill="#222"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] - r + 3).toFixed(1) + '" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">나</text>';
      else if (tag) s += '<rect x="' + (p[0] - 28).toFixed(1) + '" y="' + (p[1] - r - 16).toFixed(1) + '" width="56" height="26" rx="13" fill="' + (/필요|도움/.test(tag) ? '#178a4a' : '#c9412d') + '"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] - r + 3).toFixed(1) + '" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">' + tag + '</text>';
    }
    return s + '</svg>';
  }

  // ── 3. 설명(한국어): 그림이 아니라 명세에서 쓴다 ──
  function caption(spec) {
    var sc = scene(spec); if (!sc) return [];
    var m = sc.main, out = [];
    // 2026-11-24 도형(작용도)으로 바뀌며 그림 위치·크기 설명은 빼고, 여덟 글자를 물상 이름으로만 읽는다
    var air = [sc.climate[0], sc.humid[0]].filter(Boolean).join(' ');
    out.push({ k: '계절', t: (air ? air + ' ' : '') + sc.season[0] + '이에요. 태어난 달(월지 ' + BR_HJ[sc.spec.pillars.month.b] + ')이 계절을 정해요.' });
    out.push({ k: '나', t: '일간 ' + STEM_HJ[m.stem] + '(' + EL_KO[m.el] + ') = ' + m.obj.ko + '. 일지 ' + BR_HJ[m.br] + ' = ' + m.ground.ko + ' — 나와 가장 가까운 사람(배우자) 자리예요.' });
    sc.items.filter(function (x) { return x.pos !== 'day'; }).forEach(function (x) {
      out.push({ k: POS_KO[x.pos], t: STEM_HJ[x.stem] + BR_HJ[x.br] + ' = ' + x.obj.ko + ' · ' + x.ground.ko + (x.pos === 'year' ? ' — 뿌리·집안의 자리예요.' : x.pos === 'month' ? ' — 사회·환경, 계절을 만드는 자리예요.' : ' — 앞날·자녀의 자리예요.') });
    });
    if (!sc.spec.pillars.hour) out.push({ k: '시주', t: '태어난 시를 몰라 시주는 읽지 않았어요.' });
    sc.flows.slice(0, 2).forEach(function (f) { out.push({ k: '흐름', t: f.from.obj.short + '(' + EL_KO[f.from.el] + ')의 기운이 ' + f.to.obj.short + '(' + EL_KO[f.to.el] + ') 쪽으로 이어지는 흐름 — ' + EL_KO[f.from.el] + '생' + EL_KO[f.to.el] + ', 앞 기운이 뒤 기운을 키워요.' }); });
    var seen = {};
    sc.rels.slice(0, 3).forEach(function (r) {
      var names = r.its.map(function (x) { return POS_KO[x.pos] + ' ' + (r.k === 'branch' ? x.ground.short : x.obj.short); });
      var dk = r.t + r.k + r.its.map(function (x) { return r.k === 'branch' ? 'b' + x.br : x.stem; }).sort().join(''); if (seen[dk]) return; seen[dk] = 1;
      var who2 = r.t === 'clash' && names.length === 2 ? J.과(names[0]) + ' ' + J.이(names[1]) : J.이(names.join('·'));
      out.push({ k: r.t === 'clash' ? '충' : r.t === 'bond' ? '합' : '형', t: r.t === 'clash' ? who2 + ' 서로 마주 버티고 있어요(' + (r.k === 'stem' ? '천간' : '지지') + ' 충). 부딪히며 움직임이 생기는 자리예요.' : r.t === 'bond' ? who2 + ' 한데 얽혀 있어요(' + (r.k === 'stem' ? '천간' : '지지') + ' 합' + (r.el != null ? ', ' + EL_KO[r.el] + ' 기운으로 묶임' : '') + '). 서로 끌어당겨 힘을 모으는 자리예요.' : who2 + ' 서로 긴장하고 있어요(형). 다듬어지며 단단해지는 자리예요.' });
    });
    return out;
  }

  // ── 4. 이미지 프롬프트(영어, 고정 틀) ──
  // 2026-11-24 사용자 요청: 수묵 → 실사. 색은 오행 비율로(목 초록·화 빨강·토 황토·금 은백·수 남청), 빛은 용신(황금빛 햇살)·기신(차가운 그늘)
  var STYLE_EN = 'Photorealistic landscape photograph, as if shot on a full-frame camera with a 35mm lens: natural light, high dynamic range, rich true-to-life color, crisp detail and texture, cinematic depth with a clear foreground, middle ground and background. Vertical 3:4 composition, one single real place. Not an illustration, painting, 3D render or fantasy art.';
  var GI_EN = ['the trees and plants look dull and shaded', 'any fire or lantern light is dim and muted', 'the earth and hills lie in cool shadow', 'the rocks and metal lie in cool, blue-tinted shadow', 'the water looks dark, cold and still'];
  var EL_COLOR = ['fresh, vivid greens', 'warm reds, oranges and glowing amber', 'warm ochre, sand and terracotta browns', 'cool silver, white and steel grey', 'deep blues and blue-black'];
  function prompt(spec) {   // 2026-11-24 한 장면: 주인공(일간 물상) 하나 + 계절 땅 + 가장 많은 기운이 채운 분위기 + 필요한 기운에 금빛
    var sc = scene(spec); if (!sc) return null; var H = headOf(sc), m = sc.main, mb = sc.spec.pillars.month.b;
    var L = [STYLE_EN, ''];
    L.push('SUBJECT (one clear main subject, large and centered): ' + m.obj.en + '.');
    L.push('SETTING: ' + SEASON[mb][1] + (sc.time ? ', ' + sc.time[1] : '') + '; the ground is ' + BR_OBJ[mb].en + '.' + (sc.climate[1] ? ' The air is ' + sc.climate[1] + '.' : '') + (sc.humid[1] ? ' ' + sc.humid[1][0].toUpperCase() + sc.humid[1].slice(1) + '.' : ''));
    L.push('ATMOSPHERE: ' + EL_FAMILY[H.top] + ' fill most of the scene around the subject (about ' + sc.ratio[H.top] + '% of the picture), in ' + EL_COLOR[H.top] + '.');
    if (H.need != null) L.push(H.needAbsent ? 'NEED: there is none of the ' + EL_FAMILY[H.need] + ' anywhere — only a soft warm golden glow on the far horizon, as if waiting for it.' : 'NEED: a warm golden beam of sunlight falls on ' + NEED_EN[H.need] + ' near the subject — the brightest, warmest spot of the photo.');
    if (sc.absent.length) L.push('ABSENT — must not appear anywhere: ' + sc.absent.map(function (e) { return EL_ABSENT[e]; }).join('; ') + '.');
    L.push('', 'RULES: keep it one simple, uncluttered scene. No text, letters, numbers, signs or watermarks. No people, no animals, no buildings.');
    return L.join('\n');
  }
  var an = function (w) { return (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w; };
  function checklist(spec) {
    var sc = scene(spec); if (!sc) return []; var H = headOf(sc);
    var c = [{ id: 'main', q: 'Is there ' + an('clearly visible ' + sc.main.obj.noun) + ' as the main, most prominent subject?', critical: true }];
    c.push({ id: 'top', q: 'Do ' + EL_FAMILY[H.top] + ' fill a large part of the scene?', critical: false });
    c.push({ id: 'season', q: 'Does the landscape look like ' + SEASON_EN[sc.seasonKey] + '?', critical: false });
    if (H.need != null && !H.needAbsent) c.push({ id: 'need', q: 'Is there a warm golden light falling on ' + NEED_EN[H.need].replace(/^a /, 'a ').replace(/^an? /, 'some ') + '?', critical: false });
    sc.absent.forEach(function (e) { c.push({ id: 'absent-' + e, q: 'Is the image completely free of ' + EL_ABSENT[e] + '?', critical: true }); });
    c.push({ id: 'notext', q: 'Is the image free of any written text, letters, numbers, calligraphy or red seals?', critical: true });
    c.push({ id: 'nopeople', q: 'Is the image free of people and animals?', critical: false });
    c.push({ id: 'photo', q: 'Does it look like a realistic photograph rather than a painting or illustration?', critical: false });
    return c;
  }
  function judge(spec, answers) {
    var c = checklist(spec), failed = c.filter(function (x) { return answers[x.id] !== true; });
    var critical = failed.filter(function (x) { return x.critical; });
    return { pass: critical.length === 0 && failed.length - critical.length <= 1, failed: failed.map(function (x) { return x.id; }), critical: critical.map(function (x) { return x.id; }) };
  }

  // ── 6. 배치 밑그림(SVG, 글자 없음): 자리·크기만 정확하면 된다. 이미지 모델의 참고 그림이자, 검사 실패 때 보여 줄 대체 배치도 ──
  var INK = '#2b2b2b';
  function glyph(st, cx, base, sz, sky) {
    var s = '', w = 90 * sz, h = 140 * sz;
    switch (st) {
      case 0: s += '<path d="M' + cx + ' ' + base + ' L' + cx + ' ' + (base - h * 1.25) + '" stroke="' + INK + '" stroke-width="' + 9 * sz + '" stroke-linecap="round"/>'; for (var i = 0; i < 4; i++) { var yy = base - h * (0.45 + i * 0.22), ww = w * (0.9 - i * 0.18); s += '<path d="M' + (cx - ww) + ' ' + yy + ' Q' + cx + ' ' + (yy - 30 * sz) + ' ' + (cx + ww) + ' ' + yy + '" fill="none" stroke="' + INK + '" stroke-width="' + 7 * sz + '" stroke-linecap="round" opacity=".85"/>'; } break;
      case 1: for (var v = 0; v < 3; v++) s += '<path d="M' + (cx - w * 0.5 + v * w * 0.45) + ' ' + base + ' C' + (cx - w * 0.7 + v * w * 0.45) + ' ' + (base - h * 0.4) + ' ' + (cx - w * 0.1 + v * w * 0.45) + ' ' + (base - h * 0.6) + ' ' + (cx - w * 0.4 + v * w * 0.45) + ' ' + (base - h * 0.9) + '" fill="none" stroke="' + INK + '" stroke-width="' + 4 * sz + '"/><circle cx="' + (cx - w * 0.4 + v * w * 0.45) + '" cy="' + (base - h * 0.92) + '" r="' + 7 * sz + '" fill="#8a3b3b" opacity=".6"/>'; break;
      case 2: s += '<circle cx="' + cx + '" cy="' + base + '" r="' + 46 * sz + '" fill="#c9653a" opacity=".55"/><circle cx="' + cx + '" cy="' + base + '" r="' + 46 * sz + '" fill="none" stroke="' + INK + '" stroke-width="' + 3 * sz + '"/>'; break;
      case 3: s += '<ellipse cx="' + cx + '" cy="' + (base - h * 0.55) + '" rx="' + 60 * sz + '" ry="' + 60 * sz + '" fill="#e0a24a" opacity=".25"/><rect x="' + (cx - 16 * sz) + '" y="' + (base - h * 0.7) + '" width="' + 32 * sz + '" height="' + 44 * sz + '" rx="' + 10 * sz + '" fill="#e0a24a" opacity=".7" stroke="' + INK + '" stroke-width="' + 3 * sz + '"/><path d="M' + cx + ' ' + (base - h * 0.7) + ' L' + cx + ' ' + (base - h * 0.95) + '" stroke="' + INK + '" stroke-width="' + 3 * sz + '"/><path d="M' + cx + ' ' + (base - h * 0.42) + ' L' + cx + ' ' + base + '" stroke="' + INK + '" stroke-width="' + 4 * sz + '"/>'; break;
      case 4: s += '<path d="M' + (cx - w * 1.8) + ' ' + base + ' L' + (cx - w * 0.2) + ' ' + (base - h * 1.5) + ' L' + cx + ' ' + (base - h * 1.35) + ' L' + (cx + w * 1.8) + ' ' + base + ' Z" fill="#5a5a5a" opacity=".55" stroke="' + INK + '" stroke-width="' + 4 * sz + '"/>'; break;
      case 5: for (var f = 0; f < 4; f++) s += '<path d="M' + (cx - w * 1.4 + f * 10) + ' ' + (base - f * 16 * sz) + ' L' + (cx + w * 1.4 - f * 10) + ' ' + (base - f * 16 * sz) + '" stroke="#6b5a3a" stroke-width="' + 5 * sz + '" opacity="' + (0.8 - f * 0.15) + '"/>'; break;
      case 6: s += '<path d="M' + (cx - w * 0.7) + ' ' + base + ' L' + (cx - w * 0.5) + ' ' + (base - h * 0.55) + ' L' + (cx + w * 0.2) + ' ' + (base - h * 0.7) + ' L' + (cx + w * 0.75) + ' ' + base + ' Z" fill="#7d8490" opacity=".75" stroke="' + INK + '" stroke-width="' + 5 * sz + '"/>'; break;
      case 7: s += '<path d="M' + (cx - w * 0.6) + ' ' + base + ' Q' + cx + ' ' + (base - h * 0.35) + ' ' + (cx + w * 0.6) + ' ' + base + ' Z" fill="#6b6b6b" opacity=".5"/><path d="M' + cx + ' ' + (base - h * 0.62) + ' L' + (cx + 18 * sz) + ' ' + (base - h * 0.42) + ' L' + cx + ' ' + (base - h * 0.28) + ' L' + (cx - 18 * sz) + ' ' + (base - h * 0.42) + ' Z" fill="#e8efe8" stroke="' + INK + '" stroke-width="' + 3 * sz + '"/>'; break;
      case 8: s += '<path d="M' + (cx - w * 2) + ' ' + (base - 10 * sz) + ' C' + (cx - w) + ' ' + (base - 50 * sz) + ' ' + (cx + w * 0.4) + ' ' + (base + 30 * sz) + ' ' + (cx + w * 2) + ' ' + (base - 20 * sz) + '" fill="none" stroke="#3f5a6b" stroke-width="' + 26 * sz + '" opacity=".55" stroke-linecap="round"/>'; break;
      case 9: for (var r = 0; r < 14; r++) { var rx = cx - w + (r * 37 % 100) / 100 * w * 2, ry = base - h * 0.4 + (r * 53 % 100) / 100 * h * 0.8; s += '<path d="M' + rx + ' ' + ry + ' l' + (-6 * sz) + ' ' + 22 * sz + '" stroke="#4a5a66" stroke-width="' + 2.5 * sz + '" opacity=".6"/>'; } s += '<ellipse cx="' + cx + '" cy="' + (base + h * 0.4) + '" rx="' + w * 1.4 + '" ry="' + 26 * sz + '" fill="#9aa6ad" opacity=".25"/>'; break;
    }
    return s;
  }
  var GROUND_TINT = ['#c9d3c2', '#d9cfb0', '#d6c8ad', '#d5dbe0'];
  function sketchSVG() { return ''; }   // 2026-11-24 한 장면은 밑그림 없이 프롬프트만으로 그린다
  function layoutSVG(spec) {   // 여덟 글자 배치도(예전 밑그림) — 지금은 쓰지 않지만 검사·관리용으로 남김
    var sc = scene(spec); if (!sc) return '';
    var W = 768, H = 1024, hz = 470, s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">';
    s += '<rect width="' + W + '" height="' + H + '" fill="#f3efe4"/><rect y="' + hz + '" width="' + W + '" height="' + (H - hz) + '" fill="' + GROUND_TINT[sc.seasonKey] + '" opacity=".55"/>';
    if (sc.climate === CLIMATE.C) s += '<rect y="' + (hz + 20) + '" width="' + W + '" height="' + (H - hz) + '" fill="#ffffff" opacity=".45"/>';
    if (sc.humid === HUMID.W) s += '<rect y="' + (hz - 120) + '" width="' + W + '" height="200" fill="#ffffff" opacity=".35"/>';
    var light = function (e) { return sc.yong.indexOf(e) >= 0; }, shade = function (e) { return sc.gi.indexOf(e) >= 0; };
    var order = sc.items.slice().sort(function (a, b) { return a.layout.depth - b.layout.depth; });
    order.forEach(function (x) {
      var cx = x.layout.x * W, depth = x.layout.depth, base = hz + (depth - 0.5) * 900, sz = 1.7 * (0.45 + 0.18 * x.size) * depth * (x.pos === 'day' ? 1.35 : 1);
      var gy = Math.min(H - 30, base + 20);
      s += '<ellipse cx="' + cx + '" cy="' + gy + '" rx="' + 170 * depth + '" ry="' + 28 * depth + '" fill="' + ['#5d7a4f', '#a0643c', '#8a7550', '#8a8f96', '#4f6b7d'][x.brEl] + '" opacity="' + (shade(x.brEl) ? 0.2 : 0.35) + '"/>';
      var by = x.obj.sky ? (x.pos === 'day' ? 190 : x.pos === 'month' ? 150 : 120) : base, bx = x.obj.sky ? (x.pos === 'day' ? W / 2 : cx) : cx;
      if (light(x.el)) s += '<circle cx="' + bx + '" cy="' + (by - 60 * sz) + '" r="' + 150 * sz + '" fill="#f2c46b" opacity=".28"/>';
      s += '<g opacity="' + (shade(x.el) ? 0.55 : 0.95) + '">' + glyph(x.stem, bx, by, sz, x.obj.sky) + '</g>';
    });
    sc.flows.slice(0, 2).forEach(function (f) { var a = f.from.layout, b = f.to.layout; s += '<path d="M' + a.x * W + ' ' + (hz + (a.depth - 0.5) * 900 - 30) + ' Q' + (a.x + b.x) / 2 * W + ' ' + (hz + 40) + ' ' + b.x * W + ' ' + (hz + (b.depth - 0.5) * 900 - 40) + '" fill="none" stroke="#b8893c" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round" opacity=".7"/>'; });
    return s + '</svg>';
  }

  var api = { VERSION: VERSION, STYLE_V: STYLE_V, STEM_OBJ: STEM_OBJ, BR_OBJ: BR_OBJ, fromChart: fromChart, summary: summary, action: action, diagramSVG: diagramSVG, flow: flow, flowSVG: flowSVG, layoutSVG: layoutSVG, clean: clean, key: key, scene: scene, caption: caption, prompt: prompt, checklist: checklist, judge: judge, sketchSVG: sketchSVG };
  G.MantraMulsang = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
