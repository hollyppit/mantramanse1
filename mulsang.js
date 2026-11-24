/* 사주 물상(物象) 그림 — 원국을 '그림 지시서(명세)'로 바꾸고, 그 명세로 설명·이미지 프롬프트·검사 목록·배치 밑그림을 만든다. 2026-11-24
   · 해석은 이 파일(엔진 값)이 끝낸다. 이미지 모델은 정해진 장면을 그리기만 한다(정확성의 핵심).
   · 브라우저(만세력 원국 탭)와 서버(functions/api/mulsang-art.js)가 같은 파일을 쓴다. 서버는 받은 명세를 clean() 으로 다시 검사하고,
     프롬프트·검사 목록을 서버에서 다시 만든다(임의 프롬프트로 이미지를 만들 수 없게).
   · 명세에는 생년월일·이름이 없다(간지 번호·오행 비율·조후·용희기구신·합충 관계만).
   · 화풍: 실사 사진(2026-11-24 수묵에서 바꿈). STYLE_V 가 바뀌면 저장된 그림 키도 바뀐다.
   · 사용: MantraMulsang.fromChart(M, ch) → spec · .scene(spec) · .caption(spec) · .prompt(spec) · .checklist(spec) · .judge(checks) · .sketchSVG(spec) · .key(spec) */
(function (G) {
  'use strict';
  var VERSION = 'mulsang-20261124-1', STYLE_V = 'photo1';
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
  function key(spec) {   // 같은 명세 = 같은 그림. 해시는 서버에서(sha-256) 이 문자열로 만든다
    var s = clean(spec); if (!s) return null;
    return STYLE_V + '|' + POS.map(function (k) { return s.pillars[k] ? s.pillars[k].s + '.' + s.pillars[k].b : '-'; }).join(',') + '|' + s.ratio.map(sizeBand).join('') + '|' + tempBand(s.temp) + humBand(s.hum) + '|' + s.roles.join('') + '|' + s.rels.map(function (r) { return r.t[0] + r.k[0] + r.m.map(function (m) { return m[0]; }).join('') + (r.el == null ? '' : r.el); }).join(',');
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

  // ── 3. 설명(한국어): 그림이 아니라 명세에서 쓴다 ──
  function caption(spec) {
    var sc = scene(spec); if (!sc) return [];
    var m = sc.main, out = [];
    var when = sc.season[0] + (sc.time ? ' ' + sc.time[0] : '');
    var air = [sc.climate[0], sc.humid[0]].filter(Boolean).join(' ');
    out.push({ k: '풍경', t: (air ? air + ' ' : '') + when + '의 풍경이에요. 태어난 달(월지 ' + BR_HJ[sc.spec.pillars.month.b] + ')이 계절을, ' + (sc.time ? '태어난 시(시지 ' + BR_HJ[sc.spec.pillars.hour.b] + ')가 하루 중 때를 정했어요.' : '태어난 시를 몰라 하루 중 때는 정하지 않았어요.') });
    out.push({ k: '나', t: '한가운데 ' + J.이(m.obj.ko) + ' 바로 나(일간 ' + STEM_HJ[m.stem] + ', ' + EL_KO[m.el] + ')예요. 발밑의 ' + J.은(m.ground.ko) + ' 일지 ' + BR_HJ[m.br] + ' — 나와 가장 가까운 사람(배우자) 자리예요.' });
    sc.items.filter(function (x) { return x.pos !== 'day'; }).forEach(function (x) {
      out.push({ k: POS_KO[x.pos], t: x.layout.ko + '의 ' + x.obj.ko + ' 아래 ' + x.ground.ko + ' — ' + POS_KO[x.pos] + ' ' + STEM_HJ[x.stem] + BR_HJ[x.br] + (x.pos === 'year' ? '(뿌리·집안, 멀리 보이는 배경)' : x.pos === 'month' ? '(사회·환경, 계절을 만드는 자리)' : '(앞날·자녀, 가까운 앞쪽)') + '예요.' });
    });
    if (!sc.spec.pillars.hour) out.push({ k: '시주', t: '태어난 시를 몰라 시주 자리(오른쪽 앞)는 비워 두었어요.' });
    var big = [0, 1, 2, 3, 4].filter(function (e) { return sizeBand(sc.ratio[e]) >= 3; }).sort(function (a, b) { return sc.ratio[b] - sc.ratio[a]; });
    out.push({ k: '오행 크기', t: (big.length ? big.map(function (e) { return EL_KO[e] + '(' + sc.ratio[e] + '%)'; }).join('·') + '의 물상을 크게 그렸어요. ' : '') + (sc.absent.length ? J.은(sc.absent.map(function (e) { return EL_KO[e] + '(' + EL_FAMILY_KO[e] + ')'; }).join('·')) + ' 원국에 없어 그림에도 넣지 않았어요.' : '다섯 기운이 모두 있어, 비율대로 크기만 달리했어요.') });
    var yIn = sc.yong.filter(function (e) { return sc.absent.indexOf(e) < 0; }), yOut = sc.yong.filter(function (e) { return sc.absent.indexOf(e) >= 0; });
    if (yOut.length) out.push({ k: '빈 자리', t: '이 사주에 필요한 기운(용신 ' + yOut.map(function (e) { return EL_KO[e] + EL_HJ[e]; }).join('·') + ')은 원국에 없어서 그림에도 ' + EL_FAMILY_KO[yOut[0]] + '이 보이지 않아요. 비어 있는 그 자리가 바로 살면서 밖에서 채워 가야 할 기운이에요.' + (sc.gi.length ? ' 그늘에 든 ' + J.은(sc.gi.map(function (e) { return EL_FAMILY_KO[e]; }).join('·')) + ' 넘치면 부담이 되는 기운(기신 ' + sc.gi.map(function (e) { return EL_KO[e]; }).join('·') + ')이에요.' : '') });
    if (yIn.length) out.push({ k: '빛', t: '따뜻한 빛이 비치는 ' + yIn.map(function (e) { return EL_FAMILY_KO[e]; }).join('·') + ' 쪽이 이 사주에 필요한 기운(용신 ' + yIn.map(function (e) { return EL_KO[e] + EL_HJ[e]; }).join('·') + ')이에요.' + (sc.gi.length ? ' 그늘에 든 ' + J.은(sc.gi.map(function (e) { return EL_FAMILY_KO[e]; }).join('·')) + ' 넘치면 부담이 되는 기운(기신 ' + sc.gi.map(function (e) { return EL_KO[e]; }).join('·') + ')이에요.' : '') });
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
  function prompt(spec) {
    var sc = scene(spec); if (!sc) return null;
    var L = [STYLE_EN, ''];
    L.push('SCENE: ' + sc.season[1] + (sc.time ? ', ' + sc.time[1] : '') + '.' + (sc.climate[1] ? ' The air is ' + sc.climate[1] + '.' : '') + (sc.humid[1] ? ' ' + sc.humid[1][0].toUpperCase() + sc.humid[1].slice(1) + '.' : ''));
    L.push('', 'LAYOUT (follow exactly; the attached rough sketch shows the placement and relative sizes — keep them, but turn everything into a real photograph):');
    sc.items.forEach(function (x) {
      L.push('- ' + (x.obj.sky ? x.obj.en + ' in the sky ' + (x.pos === 'day' ? 'at the top center, as the main subject, the most striking element of the photo' : x.pos === 'year' ? 'toward the upper left, small and distant' : x.pos === 'hour' ? 'toward the upper right' : 'spanning the upper middle') : x.obj.en + ' ' + x.layout.en) + '; below it, the ground is ' + x.ground.en + '.');
    });
    var cnt = Object.keys(sc.counts).map(Number).filter(function (st) { return STEM_OBJ[st].count; }).map(function (st) { var n = sc.counts[st]; return 'exactly ' + ['zero', 'one', 'two', 'three', 'four'][n] + ' ' + STEM_OBJ[st].noun + (n > 1 ? 's' : ''); });
    if (cnt.length) L.push('', 'COUNT: ' + cnt.join(', ') + '. Do not add more of these.');
    L.push('', 'PROPORTION (by five-element share): ' + [0, 1, 2, 3, 4].filter(function (e) { return sc.ratio[e] > 0; }).map(function (e) { return EL_FAMILY[e] + ' ' + SIZE_EN[sizeBand(sc.ratio[e])] + ' (~' + sc.ratio[e] + '% of the picture)'; }).join('; ') + '.');
    L.push('COLOR: the overall palette follows the same shares — ' + [0, 1, 2, 3, 4].filter(function (e) { return sc.ratio[e] > 0; }).sort(function (a, b) { return sc.ratio[b] - sc.ratio[a]; }).map(function (e) { return EL_COLOR[e] + ' (' + SIZE_EN[sizeBand(sc.ratio[e])] + ')'; }).join(', ') + '.');
    if (sc.absent.length) L.push('ABSENT — must not appear anywhere: ' + sc.absent.map(function (e) { return EL_ABSENT[e]; }).join('; ') + '.');
    var yIn = sc.yong.filter(function (e) { return sc.absent.indexOf(e) < 0; });
    if (yIn.length || sc.gi.length) L.push('', 'LIGHT: ' + (yIn.length ? 'a warm golden beam of sunlight breaks through and spotlights the ' + yIn.map(function (e) { return EL_FAMILY[e]; }).join(' and ') + ', making them glow — the brightest, warmest area of the photo.' : 'soft, natural light.') + (sc.gi.length ? ' Meanwhile ' + sc.gi.map(function (e) { return GI_EN[e]; }).join(', and ') + '.' : ''));
    if (0) L.push('', 'LIGHT: a soft warm golden glow falls on the ' + sc.yong.map(function (e) { return EL_FAMILY[e]; }).join(' and ') + '.' + (sc.gi.length ? ' The ' + sc.gi.map(function (e) { return EL_FAMILY[e]; }).join(' and ') + ' sit partly in cool shadow.' : ''));
    var rl = [];
    sc.flows.slice(0, 2).forEach(function (f) { rl.push('a visible natural flow from the ' + f.from.obj.noun + ' toward the ' + f.to.obj.noun + ' (' + ['wood feeds fire', 'fire enriches the earth', 'earth bears metal', 'metal condenses water', 'water nourishes wood'][f.from.el] + ')'); });
    sc.rels.slice(0, 3).forEach(function (r) { var n = r.its.map(function (x) { return 'the ' + (r.k === 'branch' ? x.ground.noun : x.obj.noun); }).join(' and '); rl.push(r.t === 'clash' ? n + ' face each other in tense opposition' : r.t === 'bond' ? n + ' are gently intertwined and connected' : n + ' press against each other with strain'); });
    rl = rl.filter(function (t, i) { return rl.indexOf(t) === i; });
    if (rl.length) L.push('RELATIONSHIPS: ' + rl.join('; ') + '.');
    L.push('', 'RULES: no text, letters, numbers, calligraphy, seals, signatures or watermarks. No people, no animals, no buildings. Do not add major objects beyond those listed. Keep the day-pillar object clearly the focal point.');
    return L.join('\n');
  }

  // ── 5. 검사 목록(비전 모델에 예/아니오로 묻는다) · 판정 ──
  var an = function (w) { return (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w; };
  function checklist(spec) {
    var sc = scene(spec); if (!sc) return [];
    var c = [{ id: 'main', q: 'Is there ' + an('clearly visible ' + sc.main.obj.noun) + ' as the main, most prominent subject?', critical: true }];
    sc.items.filter(function (x) { return x.pos !== 'day'; }).forEach(function (x) { c.push({ id: 'obj-' + x.pos, q: 'Is there ' + an(x.obj.noun) + ' somewhere in the image?', critical: false }); });
    sc.absent.forEach(function (e) { c.push({ id: 'absent-' + e, q: 'Is the image completely free of ' + EL_ABSENT[e] + '?', critical: true }); });
    c.push({ id: 'season', q: 'Does the landscape look like ' + SEASON_EN[sc.seasonKey] + '?', critical: false });
    c.push({ id: 'notext', q: 'Is the image free of any written text, letters, numbers, calligraphy or red seals?', critical: true });
    c.push({ id: 'nopeople', q: 'Is the image free of people and animals?', critical: false });
    c.push({ id: 'photo', q: 'Does it look like a realistic photograph rather than a painting or illustration?', critical: false });
    Object.keys(sc.counts).map(Number).filter(function (st) { return STEM_OBJ[st].count && sc.counts[st] >= 1; }).forEach(function (st) { c.push({ id: 'count-' + st, q: sc.counts[st] > 1 ? 'Are there exactly ' + ['zero', 'one', 'two', 'three', 'four'][sc.counts[st]] + ' separate ' + STEM_OBJ[st].noun + 's (not more)?' : 'Is there exactly one ' + STEM_OBJ[st].noun + ' (not more than one)?', critical: false }); });
    return c;
  }
  // answers: { id: true|false } → 통과: 중요 항목 모두 예 + 그 밖의 아니오는 1개까지
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
  function sketchSVG(spec) {
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

  var api = { VERSION: VERSION, STYLE_V: STYLE_V, STEM_OBJ: STEM_OBJ, BR_OBJ: BR_OBJ, fromChart: fromChart, clean: clean, key: key, scene: scene, caption: caption, prompt: prompt, checklist: checklist, judge: judge, sketchSVG: sketchSVG };
  G.MantraMulsang = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
