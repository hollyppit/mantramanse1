/* 깊이 풀이(Deep) — 무빙툰 본문에 끼워 넣는 "새 챕터" 묶음. 만세력 엔진이 이미 주는 값(sd · careerProfile · compatDayPillars · seunRange …)을 읽어 화면 조각(HTML)만 만든다.
   계산은 바꾸지 않는다. 엔진이 주지 않는 부분(전생·배우자 인상·명소 등)은 일간·오행·십성·12운성·12신살에서 규칙으로 풀어 쓴 "해석 콘텐츠"다(상징적 이야기).
   사용: Deep.augment(rep, H) — rep(compose 결과) 의 챕터 사이에 새 챕터를 끼운다. H = { M, ch, sd, now, name, assets }.  assets = { 슬롯: 이미지주소 } (관리자에서 만든 이미지, 없으면 자리표시)
   섹션 정의는 이 파일(+deep-time.js)의 SECTIONS. 새 챕터 id 는 base 'deep_*' — 인생 지도 흐름(life-doc.js)이 real('deep_*') 로 순서를 정한다. */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var br = function (s) { return esc(s).replace(/\n/g, '<br>'); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var seq = 0, sid = function (p) { return 'dp_' + p + '_' + (++seq); };
  var EL_HJ = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }, EL_COLOR = { 목: '#5E9E78', 화: '#D0634A', 토: '#BC9C62', 금: '#AEB9C6', 수: '#4A7AB5' };
  var STEMS = '갑을병정무기경신임계', STEM_EL = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];

  /* ── 화면 조각 도우미 ── */
  function scene(html, extra) { return Object.assign({ sceneId: sid('s'), sceneType: 'life', bg: 'black', html: html, layout: 'DATA' }, extra || {}); }
  function sec(cls, inner) { return '<section class="scene rv dp ' + (cls || '') + '" data-sc="' + sid('x') + '">' + inner + '</section>'; }
  function cap(t) { return '<div class="cap">' + esc(t) + '</div>'; }
  function chip(t, cls) { return '<span class="dp-chip' + (cls ? ' ' + cls : '') + '">' + esc(t) + '</span>'; }
  function bar(label, val, o) { // 가로 막대. val 0~100
    o = o || {}; var v = Math.round(clamp(val, 0, 100)); return '<div class="dp-bar' + (o.cls ? ' ' + o.cls : '') + '"><span class="dp-bl">' + esc(label) + '</span><span class="dp-bt"><i style="width:' + v + '%' + (o.color ? ';background:' + o.color : '') + '"></i></span><b>' + esc(o.text != null ? o.text : v) + '</b></div>';
  }
  var HJ_PH = { car: '車', spouse: '緣', past: '前', career: '業', place: '地' };
  // 이미지 슬롯: 관리자가 만든 이미지가 있으면 보여 주고, 없으면 같은 자리에 한자 자리표시
  function fig(H, slot, kind, alt, cls) {
    var u = H.assets && (H.assets[slot] || H.assets[slot.replace(/^(past:[^:]+:[^:]+):[FM]$/, '$1')]); // 전생은 성별 슬롯이 없으면 예전(성별 없는) 이미지를 대신 쓴다
    return '<figure class="rd-fig dp-fig' + (cls ? ' ' + cls : '') + (u ? '' : ' dp-ph') + '" data-slot="' + esc(slot) + '">' + (u ? '<img src="' + esc(u) + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async">' : '<span aria-hidden="true">' + (HJ_PH[kind] || '像') + '</span>') + '</figure>';
  }
  var who = function (H) { return H.name ? H.name + '님' : '당신'; };
  var nz = function (H) { return H.name ? H.name + '님은' : '당신은'; };
  function pct10(x) { return clamp(Math.round(50 + x * 1.1), 4, 98); } // 엔진 운 점수(−45~+45 안팎) → 0~100 막대
  function scoreOf(x) { var s = x && x.score; return s && typeof s === 'object' ? s.total : (typeof s === 'number' ? s : (x && x.ev && x.ev.fitScore) || 0); }
  var SEA = { opportunity: '기회기', expansion: '확장기', harvest: '수확기', accumulation: '축적기', transition: '전환기', defense: '방어기' };

  /* ── 나이 표현: 대운 10년 구간 → "20대 후반 ~ 30대 초반" ── */
  function ageWord(a) { if (a < 10) return '유년기'; var d = Math.floor(a / 10) * 10, r = a % 10; return d + '대 ' + (r <= 2 ? '초반' : r <= 6 ? '중반' : '후반'); }
  function ageSpan(a1, a2) { var x = ageWord(a1), y = ageWord(a2); return x === y ? x : x + ' ~ ' + y; }

  /* ── 운의 한 줄 제목: "OO를 하게 될 ○○의 시기" ── */
  var TG_DO = { 비견: '동료와 나란히 서며 독립을 시험하는', 겁재: '경쟁과 지출 속에서 승부욕을 쓰게 되는', 식신: '먹고사는 재주를 꽃피우고 표현하는', 상관: '기존 틀을 깨고 말과 재능을 터뜨리는', 편재: '큰돈과 기회, 사람을 크게 움직이는', 정재: '수입과 생활 기반을 차곡차곡 다지는',
    편관: '강한 압박과 책임을 정면으로 맞는', 정관: '직책과 평판을 얻어 가며 인정받는', 편인: '낯선 공부와 남다른 길을 파고드는', 정인: '배움·자격·윗사람의 도움으로 내실을 쌓는' };
  var SEA_MOOD = { opportunity: '기회가 열리는', expansion: '뻗어 나가는', harvest: '결실을 거두는', accumulation: '조용히 쌓아 두는', transition: '방향이 바뀌는', defense: '지키고 버텨야 하는' };
  function eventTitle(tg, season, volatile, who) { // who: '운' | '시기'
    var a = TG_DO[tg] || '새 흐름을 맞는', m = volatile ? '격동의' : (SEA_MOOD[season] || ''); return a + ' ' + (m ? m + ' ' : '') + (who || '시기');
  }

  /* ═════ 섹션 정의 ═════ */
  var SECTIONS = {}; // id → function(H) → { title, sub, scenes[] }

  // ───────── 사주 자동차 ─────────
  var CAR = {
    갑: ['곧게 뻗은 대형 SUV·픽업트럭', '목표가 정해지면 곧장 달리는 직진형. 차체가 크고 힘이 좋아 험한 길도 올라가지만, 좁은 골목에서 방향을 꺾는 건 서툽니다.', '大'],
    을: ['경쾌한 소형 해치백', '좁은 골목과 막힌 길도 요령 있게 빠져나가는 유연한 차. 연비가 좋고 어디든 주차하지만, 정면 충돌에는 약해 큰 힘 앞에서는 돌아갑니다.', '小'],
    병: ['눈에 띄는 컨버터블 스포츠카', '가속이 빠르고 어디서나 시선을 끄는 차. 달릴 때 가장 빛나지만 연료를 빨리 태우고, 과속하기 쉽습니다.', '陽'],
    정: ['감성 있는 클래식 쿠페', '밤길에 더 따뜻하게 빛나는 헤드라이트를 가진 차. 가까운 사람을 편안하게 태우지만, 큰 바람(외부 압박)에는 불빛이 흔들립니다.', '燈'],
    무: ['묵직한 대형 SUV·화물 트럭', '무엇이든 싣고 안정적으로 가는 힘 좋은 차. 한번 방향을 잡으면 흔들리지 않지만, 출발과 방향 전환이 느립니다.', '重'],
    기: ['실용적인 승합 밴·왜건', '사람과 짐을 두루 싣고 오래 가는 살림꾼 같은 차. 믿음직하지만 화려한 성능은 아니라 스스로를 낮춰 보기 쉽습니다.', '容'],
    경: ['강철 프레임의 오프로더·군용 지프', '험로를 돌파하는 단단한 차. 한번 결정하면 밀어붙이는 힘이 있지만, 승차감이 거칠어 함께 타는 사람이 피곤할 수 있습니다.', '剛'],
    신: ['정교한 럭셔리 세단', '승차감과 마감이 섬세한 고급 차. 어디서나 품위가 있지만, 작은 흠집에도 예민하고 거친 도로를 싫어합니다.', '精'],
    임: ['항속거리가 긴 장거리 전기 GT', '흐름만 타면 어디까지든 멀리 가는 차. 큰 길에서 가장 강하지만, 방향이 정해지지 않으면 이리저리 흘러가 연료만 씁니다.', '流'],
    계: ['조용한 하이브리드 소형차', '소리 없이 스며들듯 달리고 연비가 좋은 차. 눈에 띄지 않게 오래 가지만, 존재감이 약해 놓치는 기회가 생깁니다.', '靜'],
  };
  var PARTS = [['비겁', '엔진 출력', '내가 가진 힘·주관·버티는 힘', '내 고집과 경쟁심이 과열되기 쉽습니다', '힘이 약해 큰 오르막에서 쉽게 지치고 남의 속도에 끌려갑니다'],
    ['식상', '액셀·핸들', '표현·재주·움직임, 차를 몰고 나가는 감각', '말과 행동이 앞서 과속·급핸들이 잦습니다', '표현이 서툴러 속도를 못 내고 마음만 답답합니다'],
    ['재성', '트렁크·연료통', '돈·성과·현실 감각, 실어 나르는 것', '욕심이 많아 짐을 너무 싣고 연료를 쏟기 쉽습니다', '싣는 짐(수입·성과)이 적어 늘 빠듯하게 느낍니다'],
    ['관성', '브레이크·안전장치', '책임·규칙·통제, 나를 멈추게 하는 힘', '브레이크가 너무 세서 늘 눌려 있고 스트레스가 쌓입니다', '브레이크가 약해 제동이 늦고 규칙·조직이 답답합니다'],
    ['인성', '내비게이션·정비소', '배움·보호·방향, 길을 알려 주고 고쳐 주는 것', '생각과 점검이 길어 출발이 늦어집니다', '길 안내와 정비가 약해 혼자 헤매다 지칩니다']];
  SECTIONS.deep_car = function (H) {
    var sd = H.sd, st = sd.dayMaster.stem, car = CAR[st] || CAR.갑, g = sd.groups, strong = sd.strength.band, el = sd.dayMaster.el, yong = sd.usefulElements && sd.usefulElements.yong;
    var out = [], lv = function (v) { return v >= 25 ? '높음' : v >= 12 ? '보통' : '낮음'; };
    out.push(scene(sec('dp-hero', cap('MY CAR · 내 사주를 자동차에 비유하면') + fig(H, 'car:' + st, 'car', car[0], '') + '<h3 class="dp-h">' + esc(nz(H) + ' ' + car[0] + '예요') + '</h3><p class="lead">' + esc(car[1]) + '</p>' +
      '<p class="dp-note">타고난 일간 <b>' + esc(st + '(' + (sd.dayMaster.hanja || '') + EL_HJ[el] + ')') + '</b>의 성질을 자동차로 옮긴 비유예요. 좋고 나쁨이 아니라 "어떤 차인지"를 알면 운전이 쉬워집니다.</p>')));
    var pb = PARTS.map(function (p) { var v = g[p[0]] || 0; return '<div class="dp-part"><div class="dp-ph1"><b>' + esc(p[1]) + '</b><small>' + esc(p[0] + ' · ' + p[2]) + '</small></div>' + bar(lv(v), v * 2, { text: Math.round(v) + '%', color: v >= 25 ? '#D9694F' : v < 12 ? '#6B7A99' : '' }) + '<p>' + esc(v >= 25 ? p[3] : v < 12 ? p[4] : '무난하게 균형이 맞아 큰 문제는 없습니다.') + '</p></div>'; }).join('');
    out.push(scene(sec('', cap('차량 사양 · 부품별 점검') + '<p class="dp-lead2">같은 차종이라도 부품 상태는 사람마다 달라요. 아래 막대가 길수록 그 부품이 <b>강하게</b> 달려 있다는 뜻입니다.</p><div class="dp-parts">' + pb + '</div>')));
    var eng = strong === '신강' ? '배기량이 큰 차예요. 힘은 넘치지만 연료(에너지)를 쓸 곳이 없으면 과열됩니다.' : strong === '신약' ? '배기량이 작고 효율형인 차예요. 가볍게 잘 달리지만 큰 짐과 긴 오르막에서는 쉽게 지칩니다.' : '배기량이 적당한 균형형 차예요. 어떤 도로에서도 무난하게 달립니다.';
    out.push(scene(sec('', cap('엔진 · 연료 · 정비') + '<div class="dp-grid2"><div class="dp-card"><h4>엔진 (일간의 힘)</h4><p>' + esc(eng) + '</p></div><div class="dp-card"><h4>잘 맞는 연료</h4><p>' + (yong ? '이 차는 <b>' + esc(yong + '(' + EL_HJ[yong] + ')') + '</b> 기운을 넣을 때 가장 잘 달립니다. 고급 연료를 넣어도 맞지 않는 연료(기신)를 많이 넣으면 노킹이 생겨요.' : '용신을 정할 수 없어 균형 잡힌 일반 연료가 무난합니다.') + '</p></div></div>' +
      '<div class="dp-pc"><div class="dp-pro"><h4>장점</h4><ul>' + carPros(H, car).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div><div class="dp-con"><h4>단점 · 정비 포인트</h4><ul>' + carCons(H, car).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>')));
    var road = sd.currentDaewoon, se = sd.sewoon, mo = sd.monthlyLuck && sd.monthlyLuck[0];
    out.push(scene(sec('', cap('지금 달리는 도로 · 날씨') + '<div class="dp-road">' +
      (road ? '<div><small>도로(대운)</small><b>' + esc(road.ganzhi) + ' 대운</b><span>' + esc(SEA[road.season] || '') + ' · ' + esc(road.condition || '') + '</span></div>' : '') +
      (se ? '<div><small>날씨(세운)</small><b>' + esc(se.year + ' ' + se.ganzhi) + '</b><span>' + esc(SEA[se.season] || '') + ' · ' + esc(se.condition || '') + '</span></div>' : '') +
      (mo ? '<div><small>교통 상황(월운)</small><b>이번 달 ' + esc(mo.ganzhi) + '</b><span>' + esc(SEA[mo.season] || '') + ' · ' + esc(mo.condition || '') + '</span></div>' : '') + '</div><p class="dp-note">같은 차도 도로(대운 10년), 날씨(세운 1년), 교통 상황(월운 1달)에 따라 달리는 느낌이 달라집니다. 이어지는 "운의 흐름" 챕터에서 시기별로 자세히 봅니다.</p>')));
    return { title: '내 사주를 자동차에 비유하면', sub: car[0], scenes: out };
  };
  function carPros(H, car) {
    var sd = H.sd, a = [], g = sd.groups; a.push(car[1].split('. ')[0].replace(/[.]$/, '') + '.');
    if (sd.strength.band === '신강') a.push('엔진 힘이 좋아 밀어붙이는 추진력이 있습니다.'); if (sd.strength.band === '신약') a.push('가볍고 눈치가 빨라 변화하는 도로에 잘 적응합니다.');
    if (g.식상 >= 20) a.push('핸들링이 좋아 아이디어와 표현으로 길을 만듭니다.'); if (g.관성 >= 20) a.push('브레이크와 안전장치가 잘 갖춰져 책임감 있게 운전합니다.'); if (g.인성 >= 20) a.push('내비게이션이 좋아 길을 잃어도 방향을 잘 찾습니다.'); if (g.재성 >= 20) a.push('트렁크가 커서 성과와 현실적인 이득을 챙기는 데 능합니다.'); if (g.비겁 >= 20) a.push('동승자(동료)와 함께 갈 때 힘이 배가됩니다.');
    return a.slice(0, 4);
  }
  function carCons(H, car) {
    var sd = H.sd, a = [], g = sd.groups, rest = car[1].split('. ').slice(1).join('. ');
    if (rest) a.push(rest.replace(/[.]$/, '') + '.');
    if (g.관성 >= 30) a.push('브레이크가 지나치게 세서 늘 눌려 있는 느낌, 스트레스가 쌓이기 쉽습니다.'); if (g.비겁 >= 30) a.push('엔진 과열(고집·경쟁심) 때문에 주변과 부딪히기 쉽습니다.'); if (g.식상 >= 30) a.push('말과 행동이 앞서 실수를 만들 수 있어요.');
    if (g.재성 < 10) a.push('트렁크가 작아 돈과 성과를 쌓아 두기 어렵습니다. 관리 습관이 필요해요.'); if (g.인성 < 10) a.push('내비게이션이 약해 혼자 결정하다 길을 헤맬 수 있습니다.');
    if ((sd.clashes || []).length >= 3) a.push('원국 안의 충·형(' + sd.clashes.length + '개)이 차체를 덜컹이게 해, 변화와 마음 흔들림이 잦습니다.');
    if (sd.strength.band === '신약') a.push('엔진 힘이 작아 오래 달리면 쉽게 지치므로 중간 휴식이 필수입니다.');
    return a.slice(0, 4);
  }

  // ───────── 솔직한 장단점 ─────────
  var STEM_PC = {
    갑: [['추진력과 정직함이 있고 한번 마음먹으면 끝까지 갑니다', '고지식하고 유연성이 부족해 부러지기 쉽습니다'], ['사람을 이끄는 책임감이 있습니다', '자존심 때문에 도움 요청이 늦습니다']],
    을: [['적응력이 좋고 섬세하게 사람을 챙깁니다', '남의 눈치를 많이 봐 속마음을 감춥니다'], ['부드럽게 목표에 다가가는 끈기가 있습니다', '의존적으로 보이거나 우유부단해질 때가 있습니다']],
    병: [['밝고 솔직해 사람을 끌어당깁니다', '감정 기복과 성급함이 있어 마무리가 약합니다'], ['열정이 커서 분위기를 바꿉니다', '관심받지 못하면 쉽게 시들고 과시하는 면이 있습니다']],
    정: [['따뜻하고 섬세하며 집중력이 뛰어납니다', '속으로 오래 끌어안고 예민하게 반응합니다'], ['한 사람·한 일에 깊이 몰입합니다', '꺼질 듯 흔들리는 불안과 질투가 있을 수 있습니다']],
    무: [['듬직하고 믿음이 가며 중심을 잡아 줍니다', '고집이 세고 변화에 느립니다'], ['포용력이 있어 큰일을 맡깁니다', '속을 잘 드러내지 않아 답답하다는 말을 듣습니다']],
    기: [['현실적이고 꼼꼼해 사람과 일을 잘 돌봅니다', '걱정이 많고 스스로를 낮춥니다'], ['실속 있게 쌓아 가는 힘이 있습니다', '남에게 맞추다 정작 자신을 놓칩니다']],
    경: [['결단력과 의리가 있어 불의 앞에서 물러서지 않습니다', '말이 직설적이고 거칠어 상처를 줍니다'], ['한번 정하면 밀고 나가는 실행력이 있습니다', '융통성이 없고 타협을 약함이라 여깁니다']],
    신: [['감각이 섬세하고 완성도를 중시합니다', '예민하고 비판적이며 흠을 잘 찾습니다'], ['품위와 자기 기준이 분명합니다', '인정받지 못하면 쉽게 상처받고 날을 세웁니다']],
    임: [['생각이 깊고 포용력이 넓으며 지혜롭습니다', '속을 알 수 없고 계획 없이 흘러가기 쉽습니다'], ['큰 흐름을 읽고 자유롭게 움직입니다', '감정이 한꺼번에 넘치거나 책임을 피하려 할 때가 있습니다']],
    계: [['영리하고 감수성이 풍부하며 눈치가 빠릅니다', '걱정과 생각이 많아 행동이 늦습니다'], ['조용히 스며들어 관계를 지킵니다', '드러나기 싫어하다 기회를 놓치고 체력도 약해지기 쉽습니다']],
  };
  var GRP_PC = {
    비겁: [['자기 주관이 분명하고 독립심이 강합니다', '고집과 경쟁심, 돈이 새는 습관(나누어 쓰는 구조)이 있습니다'], ['남과 잘 어울려 협력합니다', '힘이 약해 남에게 휘둘리고 자기 몫을 못 챙깁니다']],
    식상: [['표현력과 재주가 좋아 아이디어가 샘솟습니다', '말실수·산만함·잔소리, 윗사람과 마찰이 생기기 쉽습니다'], ['신중하고 말을 아낍니다', '표현이 서툴러 재능이 있어도 잘 드러나지 않습니다']],
    재성: [['현실 감각과 돈·성과를 다루는 눈이 있습니다', '돈과 이성(異性)에 마음이 쉽게 쏠리고 욕심이 과해집니다'], ['욕심이 적고 담백합니다', '돈 관리와 현실적 기회 포착이 약합니다']],
    관성: [['책임감이 강하고 질서·평판을 중시합니다', '압박과 눈치, 스트레스를 안고 살기 쉽습니다'], ['규칙에 얽매이지 않고 자유롭습니다', '조직과 권위에 적응하는 데 에너지가 많이 듭니다']],
    인성: [['배움과 사색, 윗사람·가족의 보호가 따릅니다', '생각만 길고 실행이 느리며 의존적일 수 있습니다'], ['행동이 빠르고 실전형입니다', '준비와 지지 기반이 약해 시행착오를 많이 겪습니다']],
  };
  SECTIONS.deep_proscons = function (H) {
    var sd = H.sd, st = sd.dayMaster.stem, pros = [], cons = [], g = sd.groups, order = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; });
    (STEM_PC[st] || STEM_PC.갑).forEach(function (x) { pros.push([x[0], '일간 ' + st + '(' + sd.dayMaster.el + ')']); cons.push([x[1], '일간 ' + st + '(' + sd.dayMaster.el + ')']); });
    var hi = order[0], lo = order[4], hip = GRP_PC[hi], lop = GRP_PC[lo];
    if (hip) { pros.push([hip[0][0], hi + ' ' + Math.round(g[hi]) + '%로 가장 강함']); cons.push([hip[0][1], hi + ' ' + Math.round(g[hi]) + '%로 과하면']); }
    if (lop) { pros.push([lop[1][0], lo + ' ' + Math.round(g[lo]) + '%로 가장 약함']); cons.push([lop[1][1], lo + ' ' + Math.round(g[lo]) + '%로 가장 약함']); }
    if (sd.strength.band === '신강') { pros.push(['자기 힘이 있어 쉽게 무너지지 않습니다', '신강(내 편 기운이 많음)']); cons.push(['내 방식이 옳다고 믿어 조언을 흘려듣습니다', '신강(내 편 기운이 많음)']); }
    if (sd.strength.band === '신약') { pros.push(['환경과 사람을 읽는 눈이 좋습니다', '신약(내 편 기운이 적음)']); cons.push(['에너지가 쉽게 소진되고 큰 책임 앞에서 위축됩니다', '신약(내 편 기운이 적음)']); }
    var cl = sd.clashes || []; if (cl.length >= 2) cons.push(['원국 안에서 서로 부딪히는 글자가 ' + cl.length + '개라 마음이 자주 흔들리고 변화가 많습니다', cl.slice(0, 2).map(function (c) { return c.name; }).join('·') + ' 등']);
    var cm = sd.combinations || []; if (cm.length) pros.push(['서로 끌어당기는 합(' + cm.slice(0, 2).map(function (c) { return c.name; }).join('·') + ')이 있어 인연과 협력의 실마리가 있습니다', '원국의 합']);
    var bad = (sd.specialStars || []).filter(function (x) { return !x.good; }).slice(0, 2), good = (sd.specialStars || []).filter(function (x) { return x.good; }).slice(0, 2);
    good.forEach(function (x) { pros.push([x.name + '의 도움이 따르는 사주입니다', '신살']); }); bad.forEach(function (x) { cons.push([x.name + '의 기운이 있어 그 영역에서 조심이 필요합니다', '신살']); });
    var li = function (a) { return '<li><span>' + esc(a[0]) + '</span><em>근거 · ' + esc(a[1]) + '</em></li>'; };
    var out = [scene(sec('', cap('솔직한 장단점') + '<p class="lead">좋은 말만 들려 드리면 도움이 안 되니까, ' + esc(who(H)) + '의 사주에서 읽히는 <b>장점과 단점을 같은 무게로</b> 적어 봅니다. 단점은 "고쳐야 할 결함"이 아니라 "알고 쓰면 덜 아픈 부분"이에요.</p>')),
      scene(sec('', '<div class="dp-pc"><div class="dp-pro"><h4>장점</h4><ul>' + pros.slice(0, 7).map(li).join('') + '</ul></div><div class="dp-con"><h4>단점</h4><ul>' + cons.slice(0, 7).map(li).join('') + '</ul></div></div>'))];
    var line = (sd.strength.band === '신강' ? '힘은 충분하니 "쓰는 방향"이 숙제' : sd.strength.band === '신약' ? '재능은 있으니 "지치지 않는 구조"가 숙제' : '균형은 좋으니 "한 가지에 집중하는 용기"가 숙제') + '인 사주입니다.';
    out.push(scene(sec('', cap('한 줄 총평') + '<p class="lead rd-hl">' + esc(line) + '</p>')));
    return { title: '솔직한 장단점', sub: '좋은 점과 아픈 점을 같은 무게로', scenes: out };
  };

  // ───────── 12운성 · 12신살 ─────────
  var UNSEONG = { 장생: ['태어나 자라나는 시작의 기운', '새 일을 시작하는 힘과 성장 가능성이 큽니다', '시작만 하고 끌고 가는 힘이 모자랄 수 있습니다'], 목욕: ['씻고 단장하는, 감성과 매력이 열리는 기운', '매력적이고 변화·새 경험에 열려 있습니다', '들뜨기 쉽고 이성·유혹·감정 기복에 흔들립니다'],
    관대: ['관을 쓰고 사회로 나서는 자신감의 기운', '당당하고 사회성이 좋아 인정받으려는 힘이 큽니다', '과시하고 앞서가다 체면에 집착할 수 있습니다'], 건록: ['스스로 서서 벌어먹는 자립의 기운', '독립심이 강하고 실력으로 자리를 잡습니다', '혼자 해결하려다 고독해지고 융통성이 줄어듭니다'],
    제왕: ['정점에 오른 가장 왕성한 기운', '주도력과 카리스마가 강해 한 분야의 중심이 됩니다', '기울기 시작하는 지점이라 독선과 고집이 커질 수 있습니다'], 쇠: ['정점을 지나 서서히 내려놓는 기운', '경험이 깊고 차분하며 욕심을 덜 부립니다', '의욕이 식거나 한발 물러서는 습관이 생길 수 있습니다'],
    병: ['기운이 약해져 예민해진 상태', '섬세하고 남의 아픔을 잘 느낍니다', '체력·의욕이 쉽게 꺾이고 걱정이 많습니다'], 사: ['움직임이 멈추고 정리되는 기운', '집중과 정리, 한 가지에 깊이 파고드는 힘이 있습니다', '정체감과 변화 거부, 우울해지기 쉽습니다'],
    묘: ['거두어 저장하고 숨는 기운', '모으고 지키는 힘, 비밀과 내공을 쌓습니다', '속을 드러내지 않고 갇힌 듯 답답해합니다'], 절: ['끊어졌다가 새로 시작되는 기운', '미련 없이 끊고 새로 시작하는 용기가 있습니다', '관계·일이 끊기는 경험이 반복되고 불안정합니다'],
    태: ['새 생명이 깃드는 가능성의 기운', '아직 드러나지 않은 가능성과 상상력이 큽니다', '구체화가 더디고 의존적일 수 있습니다'], 양: ['보살핌 속에 자라나는 준비의 기운', '배우고 준비하며 도움을 받는 복이 있습니다', '아직 때가 안 된 일에 조급해하고 보호받으려는 마음이 큽니다'] };
  var PILLAR = { year: ['년주', '조상·어린 시절·바깥에서 보이는 첫인상', '초년'], month: ['월주', '부모·청년기·직업과 사회 환경', '청장년'], day: ['일주', '나 자신과 배우자 자리', '중년'], hour: ['시주', '자녀·말년·꿈과 결과', '말년'] };
  var SINSAL = { 겁살: ['빼앗기고 급변하는 기운', '위기에 강하고 승부사 기질이 있습니다', '갑작스러운 손실·빼앗김에 대비가 필요합니다'], 재살: ['다툼과 수난의 기운', '맞서 싸우는 기개가 있습니다', '송사·다툼·사고성 갈등을 조심하세요'], 천살: ['하늘이 정한 불가항력의 기운', '운명적인 도움과 영적 감수성이 있습니다', '내 뜻대로 안 되는 일을 만나기 쉽습니다'],
    지살: ['이동하고 시작하는 기운', '활동 범위가 넓고 새 시작에 용감합니다', '자리를 잡지 못하고 옮겨 다닐 수 있습니다'], 연살: ['도화 — 매력과 이성 인연의 기운', '매력이 있어 사람과 이성에게 호감을 얻습니다', '이성 문제·구설·유혹에 휘말리기 쉽습니다'], 월살: ['막히고 메말라지는 기운', '묵묵히 버티는 인내가 있습니다', '일이 막히고 의욕이 고갈되는 시기가 있습니다'],
    망신살: ['체면이 구겨지는 기운', '솔직하고 꾸밈이 없으며 허물이 없습니다', '말실수·구설·창피한 일을 조심하세요'], 장성살: ['장수와 같은 리더십의 기운', '권위와 책임을 맡는 리더형입니다', '지배적이 되어 사람과 부딪힐 수 있습니다'], 반안살: ['안장에 올라앉는 안정과 승진의 기운', '안정된 자리와 명예를 얻기 좋습니다', '안주하며 도전을 미루기 쉽습니다'],
    역마살: ['끊임없이 움직이는 이동의 기운', '이동·출장·해외·변화 속에서 기회를 만납니다', '정착이 어렵고 마음이 늘 바쁩니다'], 육해살: ['소모되고 피로해지는 기운', '남을 돌보는 헌신적인 면이 있습니다', '잔병·관계 피로·에너지 누수를 조심하세요'], 화개살: ['예술·종교·고독의 기운', '예술성과 정신세계, 깊은 사색이 있습니다', '혼자 있고 싶어 하고 외로움을 탈 수 있습니다'] };
  SECTIONS.deep_stages = function (H) {
    var sd = H.sd, out = [], ts = sd.twelveStages || {}, s12 = sd.sinsal12 || {};
    out.push(scene(sec('', cap('12운성 · 내 에너지의 단계') + '<p class="lead">12운성은 우리가 태어나서 자라고 시들고 다시 태어나는 <b>12단계의 에너지 리듬</b>이에요. 사주의 네 자리(년·월·일·시)마다 어느 단계에 있는지로 그 자리의 성질을 읽습니다.</p>')));
    var cards = ['year', 'month', 'day', 'hour'].filter(function (k) { return ts[k] && UNSEONG[ts[k]]; }).map(function (k) { var n = ts[k], u = UNSEONG[n], P = PILLAR[k], pil = sd.pillars[k];
      return '<div class="dp-card dp-us"><div class="dp-us1"><b>' + esc(P[0]) + '</b><span>' + esc(pil.ko + ' (' + pil.hanja + ')') + '</span></div><div class="dp-us2">' + esc(n) + '</div><small>' + esc(P[1]) + '</small><p><em>' + esc(u[0]) + '</em></p><p class="dp-pl">＋ ' + esc(u[1]) + '</p><p class="dp-mi">－ ' + esc(u[2]) + '</p></div>'; });
    out.push(scene(sec('', '<div class="dp-grid2">' + cards.join('') + '</div>')));
    var dn = ts.day && UNSEONG[ts.day]; if (dn) out.push(scene(sec('', cap('나의 일주 운성 ' + ts.day) + '<p class="lead">' + esc(nz(H) + ' 태어난 날의 자리(일지)가 "' + ts.day + '" 단계예요. ' + dn[0] + '입니다. ' + dn[1] + '. 다만 ' + dn[2] + '.') + '</p>')));
    out.push(scene(sec('', cap('12신살 · 사주에 붙은 성격표') + '<p class="lead">12신살은 년지(태어난 해의 띠)를 기준으로 각 자리에 붙는 <b>열두 가지 성질표</b>예요. 이름이 무서워도 "나쁜 운명"이 아니라 그 자리의 에너지가 이런 모양으로 쓰이기 쉽다는 뜻입니다.</p>')));
    var seen = {}, rows = ['year', 'month', 'day', 'hour'].filter(function (k) { return s12[k] && SINSAL[s12[k]]; }).map(function (k) { var n = s12[k], x = SINSAL[n], P = PILLAR[k], nm = n === '연살' ? '연살(도화살)' : n; seen[n] = 1;
      return '<div class="dp-sin"><div class="dp-sin1"><b>' + esc(nm) + '</b><small>' + esc(P[0] + ' · ' + P[1]) + '</small></div><p>' + esc(nz(H) + ' ' + P[0] + '에 ' + nm + '을 타고났으니, ' + x[1] + '. 다만 ' + x[2] + '.') + '</p></div>'; });
    out.push(scene(sec('', rows.join(''))));
    var sp = (sd.specialStars || []).filter(function (x) { return x.name !== '건록'; }).slice(0, 6);
    if (sp.length) out.push(scene(sec('', cap('그 밖에 붙은 별들') + '<div class="dp-stars">' + sp.map(function (x) { return '<div class="dp-star ' + (x.good ? 'g' : 'n') + '"><b>' + esc(x.name) + '</b><small>' + esc(PILLAR[x.pillar][0]) + '</small><span>' + esc(STAR_TXT[x.name] || (x.good ? '도움이 되는 별로 읽습니다.' : '조심해서 다루면 되는 별로 읽습니다.')) + '</span></div>'; }).join('') + '</div>')));
    return { title: '12운성과 12신살', sub: '내 에너지의 리듬과 별의 성격', scenes: out };
  };
  var STAR_TXT = { 천을귀인: '위기에 도움을 주는 귀인이 나타나기 쉽습니다.', 천복귀인: '하늘의 복, 의식주의 안정이 따르는 별입니다.', 복성귀인: '복이 따르는 별로 평탄한 길을 돕습니다.', 월덕귀인: '해로운 일을 풀어 주는 덕의 별입니다.', 현침살: '날카로운 말·손재주의 별. 말이 칼이 되지 않게 조심하세요.', 탕화살: '화(火)와 급한 성질을 조심하라는 별입니다.', 조객살: '슬픔과 이별, 우울감을 조심하라는 별입니다.', 낙정관살: '구설과 함정을 조심하라는 별입니다.', 홍염살: '이성에게 끌리는 강한 매력의 별입니다.', 도화살: '이성 인연과 매력의 별입니다.', 백호살: '급한 사고·다툼을 조심하라는 별입니다.', 괴강살: '강한 기질과 극단적인 면의 별입니다.', 원진살: '서로 묘하게 어긋나고 미워하기 쉬운 관계의 별입니다.' };

  R.Deep = R.Deep || {};
  Object.assign(R.Deep, { SECTIONS: SECTIONS, esc: esc, br: br, clamp: clamp, scene: scene, sec: sec, cap: cap, chip: chip, bar: bar, fig: fig, who: who, nz: nz, pct10: pct10, scoreOf: scoreOf, ageSpan: ageSpan, ageWord: ageWord, eventTitle: eventTitle, SEA: SEA, EL_HJ: EL_HJ, EL_COLOR: EL_COLOR, STEMS: STEMS, STEM_EL: STEM_EL, sid: sid, TG_DO: TG_DO, SEA_MOOD: SEA_MOOD });
})(typeof window !== 'undefined' ? window : globalThis);
