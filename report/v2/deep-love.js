/* 깊이 풀이 5 — 연애 성향(c09) 뒤의 "연애 지도"(만날 장소 · 패션·그루밍 · 추천 행동 · 연애 시기)와 결혼과 배우자(c10) 뒤의 "결혼 지도"(결혼 적기 · 드러날 수 있는 위험 · 예방).
   계산은 새로 하지 않는다. 엔진의 연애 영역 값(evaluateDomainLuck → love.components 활동·적합도·안정·변동, love.reasons)의 가중치만 바꿔 읽는다:
     연애 기준 = 활동·끌림 중심(만남이 생기는 때) / 결혼 기준 = 안정·적합도 중심 + 배우자궁(일지)과 세운·월운 지지의 합·충(관계를 굳히는 때).
   장소·스타일·행동은 배우자성 오행 · 용신 · 일지 십성 · 도화에서 규칙으로 풀고, 사주로 정할 수 없는 구체적 취향(향·아이템 등)은 오행 상징에 맞춰 채운 "상징적 추천"이다.
   이혼·자녀·질병은 말하지 않고 단정어를 쓰지 않는다. 이미지 슬롯: place:<키> · style:<오행>:<F|M> (functions/_assetart.js 와 같아야 한다). */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, D = R.Deep; if (!D) return;
  var S = D.SECTIONS, esc = D.esc, scene = D.scene, sec = D.sec, cap = D.cap, bar = D.bar, chip = D.chip, fig = D.fig, nz = D.nz, who = D.who, clamp = D.clamp, EL_HJ = D.EL_HJ;
  var rd = function (v) { return Math.round(v || 0); };
  var li = function (t) { return '<li>' + esc(t) + '</li>'; };

  /* ── 공통: 배우자성 · 지지 관계 ── */
  var PARTNER_TG = { M: ['정재', '편재'], F: ['정관', '편관'] };
  var PAIRS = {
    충: ['자오', '축미', '인신', '묘유', '진술', '사해'], 형: ['인사', '사신', '인신', '축술', '술미', '축미', '자묘', '진진', '오오', '유유', '해해'],
    해: ['자미', '축오', '인사', '묘진', '신해', '유술'], 원진: ['자미', '축오', '인유', '묘신', '진해', '사술'], 합: ['자축', '인해', '묘술', '진유', '사신', '오미'] };
  var REL_TXT = { 충: '정면으로 부딪히는 충(沖)', 형: '마찰과 시달림의 형(刑)', 해: '은근히 서운해지는 해(害)', 원진: '미운 정이 쌓이는 원진(怨嗔)', 합: '서로 붙는 합(合)' };
  function rel(a, b) {
    if (!a || !b) return ''; var k, i, p = a + b, q = b + a;
    for (k in PAIRS) { for (i = 0; i < PAIRS[k].length; i++) if (PAIRS[k][i] === p || PAIRS[k][i] === q) return k; } return '';
  }
  var dayBr = function (sd) { return sd.pillars.day.ko.charAt(1); };
  var brOf = function (M, x) { return String(M.gzNameK(x)).charAt(1); };

  /* ── 연애 · 만날 장소 ── */
  // 배우자성 오행(남=재성 · 여=관성)별 장소 3곳. 키는 functions/_assetart.js 의 PLACE 와 같다.
  var PLACES = {
    class: ['배움의 자리', '클래스·강연·독서모임·자격증 스터디', '배우고 자라는 자리에서 말이 통하는 사람을 만나기 쉬워요.'],
    nature: ['자연·야외', '공원 산책·러닝·등산·캠핑', '몸을 같이 움직이는 자리에서 자연스럽게 가까워져요.'],
    intro: ['지인 소개·소규모 모임', '친구의 친구, 지인이 이어 주는 자리', '신뢰할 수 있는 사람을 통한 만남이 가장 오래 가요.'],
    event: ['공연·전시·축제', '콘서트·전시·팝업·페스티벌', '분위기가 달아오른 자리에서 서로 눈에 띄어요.'],
    online: ['온라인·SNS·모임 앱', '취향 커뮤니티·SNS·모임 앱', '글과 취향으로 먼저 알아 가는 방식이 편해요.'],
    work: ['직장·거래처', '업무로 이어진 사람·협업·거래처', '일하는 모습을 보며 믿음이 쌓이는 만남이에요.'],
    local: ['동네·단골 가게', '단골 식당·카페·지역 동호회', '자주 마주치며 천천히 익숙해지는 만남이에요.'],
    gym: ['운동·자기계발 모임', '헬스·러닝 크루·스터디·클럽', '자기관리하는 모습에 서로 끌려요.'],
    trip: ['여행·이동 중', '여행지·기차·공항·게스트하우스', '익숙한 곳을 벗어났을 때 인연이 열려요.'],
    bar: ['밤의 바·야경', '재즈바·와인바·야경 명소·밤 산책', '느긋한 밤 분위기에서 속마음을 꺼내기 쉬워요.'] };
  var EL_PLACES = { 목: ['class', 'nature', 'intro'], 화: ['event', 'online', 'bar'], 토: ['work', 'local', 'intro'], 금: ['gym', 'work', 'class'], 수: ['trip', 'online', 'bar'] };
  var EL_WHY = { 목: '목(木)은 배우고 자라는 기운이라, 성장하는 자리에서', 화: '화(火)는 빛나고 모이는 기운이라, 사람이 모이고 분위기가 달아오르는 자리에서', 토: '토(土)는 믿음과 일상의 기운이라, 오래 지켜본 사람·익숙한 자리에서', 금: '금(金)은 단정하고 결단하는 기운이라, 자기를 갈고닦는 자리에서', 수: '수(水)는 흐르고 이동하는 기운이라, 낯선 곳·밤·온라인처럼 흐름이 있는 자리에서' };
  function partnerOf(sd) { var male = sd.gender === 'M', grp = male ? '재성' : '관성'; return { male: male, grp: grp, el: sd.groupEl[grp], pct: (sd.groups || {})[grp] || 0, tgs: PARTNER_TG[male ? 'M' : 'F'] }; }
  function hasDohwa(sd) { var s = sd.sinsal12 || {}; return s.day === '연살' || s.hour === '연살' || (sd.specialStars || []).some(function (x) { return x.name === '홍염살' && (x.pillar === 'day' || x.pillar === 'hour'); }); }

  /* ── 연애 · 패션과 그루밍 (오행별 상징 추천) ── */
  var STYLE = {
    목: { color: '세이지 그린·카키·오트밀', mat: '코튼·린넨 혼방·가벼운 기능성 소재', fit: '여유 있는 레이어드와 와이드 하의', trend: '자연스러운 소재에 가벼운 아우터를 얹는 레이어링', item: { F: ['세이지 그린 가디건·니트', '화이트 셔츠 + 와이드 데님', '카키 계열 가벼운 아우터'], M: ['카키 계열 가벼운 아우터', '오트밀 니트·티셔츠', '와이드 치노 팬츠'] }, groom: ['자연스럽게 정돈한 레이어드 헤어', '맑고 가벼운 피부 표현', '허브·우디 계열 향'], vibe: '싱그럽고 편안한 첫인상' },
    화: { color: '버건디·브릭·코랄 포인트', mat: '니트·트위드 같은 질감 있는 소재', fit: '단정한 상의에 여유 있는 하의', trend: '무채색 코디에 깊은 레드 계열을 한 점만 얹는 방식', item: { F: ['버건디·브릭 계열 니트', '질감 있는 숏 재킷', '블랙 와이드 슬랙스 + 작은 골드 액세서리'], M: ['버건디 계열 니트 + 화이트 셔츠 레이어드', '다크 스트레이트 데님', '차콜 싱글 코트·재킷'] }, groom: ['또렷한 눈썹·눈매', '밝은 안색 관리', '시트러스·스파이시 계열 향'], vibe: '환하고 시선이 가는 첫인상' },
    토: { color: '카멜·버터 화이트·브라운', mat: '울·스웨이드·니트·코튼', fit: '편안하고 넉넉한 실루엣', trend: '따뜻한 뉴트럴 톤과 부드러운 질감으로 맞추는 톤온톤', item: { F: ['카멜·베이지 아우터', '버터 화이트 니트·상의', '브라운 스트레이트 팬츠 + 스웨이드 백'], M: ['베이지 스웨이드·코튼 재킷', '크림 니트·상의', '브라운 와이드 슬랙스 + 로퍼'] }, groom: ['단정하게 정돈된 헤어', '매끈한 손·손톱 관리', '따뜻한 머스크·바닐라 계열 향'], vibe: '믿음직하고 포근한 첫인상' },
    금: { color: '아이보리·그레이·화이트·실버', mat: '울·셔츠 원단·심플 메탈', fit: '어깨선이 선 깔끔한 상의 + 와이드 팬츠', trend: '군더더기 없는 미니멀 테일러링', item: { F: ['아이보리 재킷', '그레이 니트 + 화이트 와이드 팬츠', '심플한 실버 액세서리 + 로퍼'], M: ['라이트 그레이 재킷', '화이트 셔츠 + 와이드 슬랙스', '심플한 메탈 시계'] }, groom: ['이마·앞머리 정돈', '깨끗한 손톱과 구두 관리', '비누·크리스프 계열 향'], vibe: '단정하고 세련된 첫인상' },
    수: { color: '네이비·블랙·딥 퍼플 포인트', mat: '니트·부드러운 울·코트 소재', fit: '길게 떨어지는 실루엣에 깔끔한 이너', trend: '짙은 컬러를 스카프·니트로 한 점만 더하는 방식', item: { F: ['네이비 아우터', '네이비 니트 + 블랙 슬랙스', '딥 퍼플 계열 스카프 + 앵클부츠'], M: ['네이비 하프코트·재킷', '블랙 터틀넥·니트', '다크 스트레이트 데님 + 더비 슈즈'] }, groom: ['촉촉한 윤기 피부', '자연스러운 헤어 광택', '아쿠아·머스크 계열 향'], vibe: '차분하고 깊이 있는 첫인상' } };
  // 사주에서 연애 매력에 보태 줄 오행: 용신 → 희신 → 부족한 오행 → 일간 오행 순서
  function styleEl(sd) {
    var ue = sd.usefulElements || {}, y = ue.yong, h = ue.hee && ue.hee !== y ? ue.hee : null;
    if (y) return { el: y, sub: h, why: '내게 가장 필요한 기운인 용신이 ' + y + '(' + EL_HJ[y] + ')이라, 이 오행의 색·소재를 몸에 두면 기운이 보완돼 호감이 올라가요.' + (h ? ' 용신을 돕는 희신 ' + h + '(' + EL_HJ[h] + ')의 색은 포인트로 곁들이면 좋아요.' : '') };
    if (h) return { el: h, why: '용신을 돕는 희신이 ' + h + '(' + EL_HJ[h] + ')이라, 이 오행의 색·소재를 곁에 두면 기운이 받쳐져 호감이 올라가요.' };
    if (sd.lackEl) return { el: sd.lackEl, why: '사주에서 ' + sd.lackEl + '(' + EL_HJ[sd.lackEl] + ') 기운이 부족해, 이 오행으로 균형을 채우면 인상이 한결 편안해져요.' };
    return { el: sd.dayMaster.el, why: '내 일간의 오행(' + sd.dayMaster.el + ')을 살리는 스타일이 가장 자연스럽고 호감을 주는 방향이에요.' };
  }

  /* ── 연애 · 추천 행동 (일지 십성 중심) ── */
  var ACT_TG = {
    비견: ['대등한 친구에서 시작하세요', '친구처럼 편한 사이에서 연인으로 넘어가는 흐름이 맞아요. 상대에게 "내가 이끈다"보다 같이 한다는 느낌을 주세요.'],
    겁재: ['경쟁심을 내려놓고 먼저 다가가세요', '마음에 드는 사람이 생기면 비교·경쟁으로 돌리지 말고 바로 호감을 표현하는 편이 훨씬 잘 풀려요.'],
    식신: ['함께 먹고 즐기는 자리를 만드세요', '맛집·산책·취미처럼 편하게 즐기는 시간이 마음을 열어요. 거창한 이벤트보다 일상의 즐거움이 무기예요.'],
    상관: ['말보다 표현 한 줄을 다듬으세요', '재치와 말솜씨가 매력인데, 날카로운 농담은 상대를 멀어지게 해요. 칭찬이나 공감 한 줄을 먼저 붙이세요.'],
    편재: ['넓게 만나되 한 사람에게는 시간을 내세요', '활동 폭이 넓어 인연도 많아요. 마음에 둔 사람에게는 "바쁜 사람"이 되지 말고 일정을 먼저 비워 주세요.'],
    정재: ['성실함을 행동으로 보여 주세요', '약속을 지키고 꾸준히 연락하는 모습이 가장 큰 호감이에요. 계산하는 모습은 처음에는 덜 보이는 게 좋아요.'],
    편관: ['긴장을 풀고 솔직하게 웃어 보이세요', '진지하고 무게 있는 인상이라 상대가 어려워할 수 있어요. 첫 만남은 가볍고 짧게, 웃는 시간을 늘리세요.'],
    정관: ['예의 바르게, 단계를 밟으며 다가가세요', '신뢰와 예의가 매력이에요. 급하게 가까워지기보다 소개·모임처럼 정식 경로로 만나 천천히 쌓는 게 맞아요.'],
    편인: ['혼자 생각하지 말고 먼저 연락하세요', '마음이 있어도 속으로만 정리하다 기회가 지나가요. 짧은 메시지라도 먼저 보내는 게 이 사주의 숙제예요.'],
    정인: ['받는 만큼 먼저 챙겨 주세요', '상대가 돌봐 주길 기다리지 말고, 작은 배려를 먼저 건네세요. 안정감을 주는 사람이 될 때 인연이 붙어요.'] };

  function loveIdx(c, s) { return rd(0.4 * s + 0.6 * (0.5 * c.activity + 0.35 * c.fit + 0.15 * c.stability)); }
  function marIdx(c, r) { var b = 0.15 * c.activity + 0.3 * c.fit + 0.45 * c.stability + 0.1 * (100 - c.volatility); return rd(clamp(b + ({ 합: 8, 충: -12, 형: -8, 해: -6, 원진: -6 }[r] || 0), 4, 99)); }
  function reasonsOf(d, n) {
    var all = ((d && d.love && d.love.reasons) || []).map(function (t) { return String(t).replace(/\s*\(\s*/g, ' (').replace(/[ ]{2,}/g, ' '); }), good = all.filter(function (t) { return !/부담|낮아|낮은|긴장|불안|약해|충돌|주의/.test(t); });
    return good.length ? good.slice(0, n || 2) : all.slice(0, 1).map(function (t) { return '참고 ' + t; });
  }
  function dom(M, ch, x, lv) { try { return M.evaluateDomainLuck(ch, x, lv); } catch (e) { return null; } }
  var mOf = function (x) { return new Date(x.startMs + 9 * 3600e3).getUTCMonth() + 1; };

  /* 한 기간(세운·월운)을 공통 모양으로: 기준별 점수 · 일지와의 관계 · 근거 */
  function periodRows(H, kind, mode) {
    var M = H.M, ch = H.ch, sd = H.sd, Y = sd.nowYear, P = partnerOf(sd), db = dayBr(sd), list, lv;
    if (kind === 'seun') { list = M.seunRange(ch, Y, Y + (mode === 'mar' ? 5 : 3)); lv = 'seun'; }
    else { var all = M.wolun(ch, Y).concat(M.wolun(ch, Y + 1)), now = H.now || Date.now(), ci = 0; all.forEach(function (x, i) { if (x.startMs <= now) ci = i; }); list = all.slice(ci, ci + 12); lv = 'wolun'; }
    return list.map(function (x) {
      var d = dom(M, ch, x, lv); if (!d || !d.love) return null; var c = d.love.components || { activity: 50, fit: 50, stability: 50, volatility: 30 }, br = brOf(M, x), r = rel(br, db);
      var hasStar = P.tgs.indexOf(x.stemTG) >= 0 || P.tgs.indexOf(x.branchTG) >= 0;
      return { x: x, gz: M.gzNameK(x), year: x.year, m: kind === 'wolun' ? mOf(x) : null, term: x.termName, br: br, rel: r, star: hasStar, c: c, v: mode === 'mar' ? marIdx(c, r) : loveIdx(c, d.love.score + (r === '합' ? 6 : 0) + (hasStar ? 4 : 0)), why: reasonsOf(d, 2), warn: c.volatility >= 55 };
    }).filter(Boolean);
  }
  function tagsOf(r, P, mode) {
    var t = [r.v >= 70 ? '좋은 편' : r.v >= 55 ? '무난' : '준비가 필요']; if (r.star) t.push('배우자성(' + P.grp + ') 유입'); if (r.rel === '합') t.push('배우자궁과 합'); if (r.rel === '충') t.push('배우자궁과 충 · 변동'); if (r.rel === '형' || r.rel === '해' || r.rel === '원진') t.push('배우자궁과 ' + r.rel);
    if (mode === 'mar' && r.c.stability >= 66) t.push('안정도 높음'); if (mode === 'love' && r.c.activity >= 62) t.push('관계 활동 활발'); if (r.warn) t.push('변동 큼'); return t.slice(0, 5);
  }
  function rankCards(rows, label, P, mode, act) {
    return rows.map(function (r, i) {
      return '<div class="dp-tl' + (i === 0 ? ' up' : '') + '"><div class="dp-tl1"><b>' + esc(label(r)) + '</b><small>' + (mode === 'mar' ? '결혼 지수' : '연애 지수') + ' ' + r.v + '</small></div><div class="dp-tl2"><div class="dp-tlh">' + (i + 1) + '순위 · ' + esc(r.gz) + (r.rel ? ' · 일지와 ' + esc(r.rel) : '') + '</div>' +
        bar('', r.v, { cls: 'dp-slim', color: '#D9869A', text: '' }) + '<div class="dp-tags">' + tagsOf(r, P, mode).map(function (t) { return chip(t, /변동|충|형|해|원진/.test(t) ? 'warn' : ''); }).join('') + '</div>' +
        (r.why.length ? '<p class="dp-tlb">' + esc('근거 · ' + r.why.join(' / ')) + '</p>' : '') + '<p class="dp-tlb"><b>행동 · </b>' + esc(act(r, i)) + '</p></div></div>';
    }).join('');
  }

  /* ═════ 연애 지도 (연애 성향 뒤) ═════ */
  S.deep_love = function (H) {
    var sd = H.sd, P = partnerOf(sd), out = [], tg = sd.pillars.day.branchTG, g = sd.gender === 'M' ? 'M' : 'F', ds = hasDohwa(sd);
    // ① 만날 확률이 높은 장소 — 이미지 + 근거
    var keys = EL_PLACES[P.el] || EL_PLACES.토; keys = keys.slice(); if (ds && keys.indexOf('event') < 0) keys[2] = 'event';
    out.push(scene(sec('', cap('이런 곳에서 만날 확률이 높아요') + '<p class="lead">' + esc(who(H)) + '의 ' + (P.male ? '아내' : '남편') + '별은 <b>' + esc(P.grp + '(' + P.el + EL_HJ[P.el] + ')') + '</b>이에요. ' + esc(EL_WHY[P.el]) + ' 인연이 열리기 쉽습니다.' + (ds ? ' 여기에 도화(사람을 끄는 매력) 기운이 있어 사람이 모이는 자리도 함께 추천해요.' : '') + '</p>')));
    keys.forEach(function (k, i) {
      var p = PLACES[k]; out.push(scene(sec('dp-job', '<div class="dp-jobrow">' + fig(H, 'place:' + k, 'place', p[0], 'dp-thumb') + '<div class="dp-jobtxt"><small>추천 ' + (i + 1) + '순위</small><h4>' + esc(p[0]) + '</h4><p class="dp-tlb">' + esc(p[1]) + '</p></div></div>' +
        '<p class="dp-pl">＋ ' + esc(p[2]) + '</p><p class="dp-mi">근거 · ' + esc(k === 'event' && ds && i === 2 ? '도화·홍염 기운이 있어 눈에 띄는 자리에서 인연이 붙어요' : '배우자성 ' + P.el + '(' + EL_HJ[P.el] + ') 기운 · 배우자성 비중 ' + rd(P.pct) + '%') + '</p>')));
    });
    // ② 추천 패션과 그루밍 — 이미지 + 근거
    var se = styleEl(sd), ST = STYLE[se.el] || STYLE.토;
    out.push(scene(sec('dp-hero', cap('추천 패션 · 그루밍') + fig(H, 'style:' + se.el + ':' + g, 'style', ST.vibe, '') + '<h3 class="dp-h">' + esc(se.el + '(' + EL_HJ[se.el] + ') 기운 · ' + ST.vibe) + '</h3><p class="lead">' + esc(se.why) + '</p>')));
    out.push(scene(sec('', cap('이렇게 입고 가꿔 보세요') + '<div class="dp-grid2"><div class="dp-card"><h4>패션</h4><ul class="dp-ul">' + li('색감 · ' + ST.color) + li('소재 · ' + ST.mat) + li('실루엣 · ' + ST.fit) + li('요즘 스타일링 · ' + ST.trend) + (se.sub && STYLE[se.sub] ? li('포인트 컬러 · 희신 ' + se.sub + ' 기운의 ' + STYLE[se.sub].color + ' 중 한 점') : '') + ST.item[g].map(function (t) { return li('아이템 · ' + t); }).join('') + '</ul></div>' +
      '<div class="dp-card"><h4>그루밍</h4><ul class="dp-ul">' + ST.groom.map(li).join('') + '</ul></div></div><p class="dp-note">오행의 색과 소재를 바탕으로 요즘 스타일링 흐름을 더해 고른 <b>재미로 읽는 추천</b>이에요. 실제로는 내 체형과 취향에 편한 것이 가장 우선입니다.</p>')));
    // ③ 추천 행동 — 일지 십성 + 신강약 + 배우자성
    var A = ACT_TG[tg] || ACT_TG.식신, acts = [[A[0], A[1], '근거 · 배우자궁(일지)이 ' + tg + ' 자리']];
    acts.push(sd.strength.band === '신강' ? ['상대의 속도에 맞춰 주세요', '내 힘이 강해서 리드하기 쉬운 사람이에요. 첫 몇 번은 상대가 편한 장소·시간을 먼저 고르게 해 주면 호감이 커져요.', '근거 · 일간이 신강'] : sd.strength.band === '신약' ? ['내 의견을 한 가지씩 말하세요', '상대에게 맞추다 속마음을 숨기기 쉬워요. 만날 때마다 "나는 이게 좋아" 한 가지를 말하는 습관이 관계를 오래 가게 해요.', '근거 · 일간이 신약'] : ['적당한 거리를 유지하세요', '균형 잡힌 사람이라 급하게 다가가기보다 일정한 간격으로 만나는 흐름이 잘 맞아요.', '근거 · 일간이 중화']);
    acts.push(P.pct < 10 ? ['먼저 만날 기회를 만드세요', '배우자별(' + P.grp + ')이 약해(' + rd(P.pct) + '%) 인연이 저절로 찾아오길 기다리면 늦어져요. 소개·모임 일정을 직접 잡는 쪽이 맞아요.', '근거 · ' + P.grp + ' ' + rd(P.pct) + '%'] : P.pct >= 32 ? ['후보를 너무 넓히지 마세요', '배우자별(' + P.grp + ')이 많아(' + rd(P.pct) + '%) 만날 사람은 많지만 마음이 분산돼요. 마음이 가는 한 사람에게 시간을 몰아 쓰세요.', '근거 · ' + P.grp + ' ' + rd(P.pct) + '%'] : ['지금 흐름대로 자연스럽게 만나세요', '배우자별이 적당해(' + rd(P.pct) + '%) 억지로 만들기보다 일상에서 마주치는 사람에게 열려 있는 게 좋아요.', '근거 · ' + P.grp + ' ' + rd(P.pct) + '%']);
    out.push(scene(sec('', cap('인연이 붙는 추천 행동') + '<div class="dp-pc"><div class="dp-pro" style="grid-column:1/-1"><ul>' + acts.map(function (a) { return '<li><span>' + esc(a[0]) + '</span><em>' + esc(a[1] + ' (' + a[2] + ')') + '</em></li>'; }).join('') + '</ul></div></div>')));
    // ④ 연애 기준 시기 — 세운 · 월운
    var yrs = periodRows(H, 'seun', 'love').sort(function (a, b) { return b.v - a.v; }).slice(0, 3), mos = periodRows(H, 'wolun', 'love').sort(function (a, b) { return b.v - a.v; }).slice(0, 3);
    var actL = function (r, i) { return r.v < 55 ? '만남이 활발한 해는 아니에요. 새 인연보다 나를 가꾸고 기반을 만드는 데 쓰세요.' : r.rel === '충' ? '변화가 큰 해라 만남은 많아도 첫인상에 휩쓸리지 말고 두세 번 확인하며 만나세요.' : r.rel === '합' ? '이미 마음에 둔 사람이 있다면 이 시기에 마음을 표현하기 가장 좋아요.' : i === 0 ? '소개·모임 일정을 앞당겨 잡고, 새 사람을 만나는 자리에 적극적으로 나가세요.' : '평소 안 가던 모임에 한 번 더 나가 보세요.'; };
    if (yrs.length) out.push(scene(sec('', cap('만남이 이뤄질 것 같은 해 (세운)') + '<p class="dp-lead2">연애 기준으로 <b>끌림·관계 활동</b>이 활발한 해예요(결혼 기준이 아니라 "만나고 설레는" 해). 근처 4년 중 상위 3개를 골랐어요.</p>' + rankCards(yrs, function (r) { return r.year + '년'; }, P, 'love', actL))));
    if (mos.length) out.push(scene(sec('', cap('만남이 이뤄질 것 같은 달 (월운)') + '<p class="dp-lead2">앞으로 12개월 중 연애 지수가 높은 달이에요. 이 달에는 일정에 "사람 만나는 날"을 먼저 넣어 두세요.</p>' + rankCards(mos, function (r) { return r.m + '월'; }, P, 'love', function (r, i) { return actL(r, i); }))));
    return { title: '연애 지도', sub: '만날 장소 · 스타일 · 행동 · 만남의 때', scenes: out };
  };

  /* ═════ 결혼 지도 (결혼과 배우자 뒤) ═════ */
  var RISK_TG = {
    비견: ['고집 대 고집', '배우자 자리에 나와 닮은 기운이 앉아 있어요. 서로 양보하지 않으면 "누가 맞는가"를 따지는 싸움이 길어져요.', ['결론이 안 나면 "오늘은 여기까지" 하고 하루 뒤에 다시 이야기하세요', '집안일·돈의 역할은 결혼 전에 문서처럼 나눠 두세요']],
    겁재: ['돈과 자존심의 경쟁', '생활비·용돈·양가 지원 같은 돈 문제에서 "누가 더 내는가"가 감정 싸움으로 번지기 쉬워요.', ['공동 통장과 개인 통장의 비율을 결혼 전에 정하세요', '일정 금액(예: 30만 원) 이상의 지출은 서로 상의하는 한도를 만드세요']],
    식신: ['편안함에 안주', '관계가 편해지면 노력이 사라져요. 설렘이 식은 뒤 "이 정도면 됐지"로 서로를 방치하기 쉬워요.', ['월 1회는 둘만의 외출 날짜를 먼저 잡으세요', '고마움은 마음속이 아니라 말로 하세요']],
    상관: ['말이 칼이 되는 순간', '맞는 말인데 말투가 날카로워서, 이기고도 관계를 잃어요. 가장 가까운 사람에게 제일 쉽게 상처를 줘요.', ['지적하기 전에 칭찬 한 문장을 먼저 붙이세요', '화났을 땐 문자를 보내지 말고 10분 걷고 오세요']],
    편재: ['밖으로 도는 마음', '일·사람·기회가 바깥에 많아서, 집에 있는 사람은 늘 후순위라고 느낄 수 있어요.', ['가족 일정을 달력에 먼저 적어 두세요', '바빠도 연락하는 시간을 정해 두세요']],
    정재: ['계산과 점검의 피로', '성실하지만 돈·살림을 따지는 마음이 커서 상대는 점검받는 기분이 들 수 있어요.', ['살림 점검은 월 1회 정해진 시간에만 하세요', '상대의 방식 하나는 일부러 간섭하지 마세요']],
    편관: ['압박과 통제', '긴장을 주고받는 관계라 서로 기준이 높고, 한쪽이 지치면 말없이 마음을 닫아요.', ['"하지 마" 대신 "이렇게 해 주면 좋겠어"로 말하세요', '각자 혼자 쉬는 시간을 보장하세요']],
    정관: ['체면과 도리 사이', '도리와 체면을 지키느라 정작 속마음은 말하지 않아요. 불만이 쌓이다 어느 날 한꺼번에 나와요.', ['불만은 작을 때 한 문장으로 말하세요', '양가 행사의 역할을 미리 합의해 두세요']],
    편인: ['마음의 문 닫기', '생각이 많아 혼자 결론을 내리고 말없이 멀어지는 패턴이 있어요. 상대는 이유도 모른 채 벽을 느껴요.', ['혼자 정리할 시간이 필요하면 "하루만 생각할게"라고 먼저 말하세요', '중요한 결정은 결론 내리기 전에 공유하세요']],
    정인: ['기대고 기대받는 관계', '상대가 돌봐 주길 바라는 마음이 크면 돌보는 쪽이 지쳐요. 돌봄이 일방이 되면 서운함이 쌓여요.', ['도움은 부탁과 감사를 한 쌍으로 하세요', '내가 해 줄 수 있는 일 하나를 먼저 정하세요']] };

  function risks(H) {
    var sd = H.sd, P = partnerOf(sd), g = sd.groups || {}, tg = sd.tenGods || {}, tgn = sd.pillars.day.branchTG, a = [], onDay = (sd.clashes || []).filter(function (c) { return (c.members || []).indexOf('day') >= 0; }), dc = onDay.filter(function (c) { return c.type === '충'; }), dm = onDay.filter(function (c) { return c.type !== '충' && c.type !== '천간충' && c.type !== '파' && !/자형/.test(c.name); });
    if (!dc.length && dm.length) a.push({ sev: 60, t: '말하지 않은 서운함이 쌓이는 자리', b: '일지(배우자 자리)에 ' + dm.map(function (c) { return c.name; }).join('·') + '이 걸려 있어요. 큰 싸움보다 말하지 않은 서운함이 쌓여 어느 날 한꺼번에 나오는 모양이에요.', ev: ['원국 일지 ' + dm.map(function (c) { return c.name + '(' + c.type + ')'; }).join(', ')], pv: ['서운한 일은 그날 한 문장으로 말하세요', '월 1회 서로의 서운함을 쏟아내는 시간을 정해 두세요'] });
    if (dc.length) a.push({ sev: 88, t: '배우자 자리가 흔들리는 사주', b: '일지(배우자 자리)에 ' + dc.map(function (c) { return c.name; }).join('·') + '이 걸려 있어요. 평소엔 괜찮다가도 사소한 일이 큰 다툼으로 번지는 불씨가 있어요.', ev: ['원국 일지 ' + dc.map(function (c) { return c.name + '(' + c.type + ')'; }).join(', ')], pv: ['싸움이 커질 때 쓰는 "일시 정지" 신호(손 들기·타임아웃)를 미리 합의하세요', '큰 말다툼은 그날 결론 내지 않고 다음 날 다시 이야기하세요'] });
    var T = RISK_TG[tgn]; if (T) a.push({ sev: { 상관: 76, 겁재: 74, 편관: 72, 편인: 70 }[tgn] || 58, t: T[0], b: T[1], ev: ['배우자궁(일지)이 ' + tgn + ' 자리'], pv: T[2] });
    if (P.pct < 10) a.push({ sev: 66, t: '인연을 시작하고 표현하는 데 소극', b: '배우자별(' + P.grp + ')이 약해(' + rd(P.pct) + '%) 좋은 사람이 와도 먼저 움직이지 않으면 스쳐 가요. 기대만 높고 행동이 늦으면 시간만 가요.', ev: [P.grp + ' ' + rd(P.pct) + '%'], pv: ['월 1회는 새로운 사람을 만나는 일정을 만드세요', '마음에 들면 "다음에"가 아니라 날짜를 제안하세요'] });
    if (P.pct >= 32) a.push({ sev: 64, t: '눈이 높고 비교가 많음', b: '인연 후보는 많은데(' + P.grp + ' ' + rd(P.pct) + '%) 늘 더 나은 사람이 있을 것 같아 확신이 늦어요. 결혼 뒤에도 비교하는 습관이 남아요.', ev: [P.grp + ' ' + rd(P.pct) + '%'], pv: ['꼭 필요한 기준 3가지만 정하고 나머지는 내려놓으세요', 'SNS 속 남의 결혼 생활과 비교하는 시간을 줄이세요'] });
    var B = (tg.비견 || 0) + (tg.겁재 || 0), leak = B * 1.4 + (tg.겁재 || 0) * 1.2;
    if (leak >= 68 && tgn !== '겁재') a.push({ sev: 62, t: '돈이 새는 결혼 생활', b: '나와 같은 기운(비겁 ' + rd(B) + '%)이 많아 결혼 후 돈·체면·친구 관계로 나가는 지출 때문에 부부가 부딪히기 쉬워요.', ev: ['비겁·겁재 ' + rd(B) + '%'], pv: ['수입 통장과 생활비 통장을 나누고 자동이체로 저축부터 빼세요', '친구·가족에게 빌려주는 돈의 한도를 부부가 함께 정하세요'] });
    if (hasDohwa(sd)) a.push({ sev: 58, t: '이성 문제로 오해받기 쉬운 매력', b: '도화·홍염 기운이 있어 사람을 끄는 매력이 큰 만큼, 의도 없는 친절도 상대에게는 선을 넘는 것처럼 보일 수 있어요.', ev: ['도화살 또는 홍염살'], pv: ['이성과의 모임·연락 규칙을 먼저 공개하세요', '늦은 시간의 일대일 연락은 줄이세요'] });
    if (sd.gender === 'F' && (tg.상관 || 0) >= 15 && (g.관성 || 0) < 20) a.push({ sev: 68, t: '말이 인연을 깎는 구조', b: '상관(' + rd(tg.상관) + '%)이 강하고 배우자별인 관성(' + rd(g.관성) + '%)은 약해서, 말과 자존심이 배우자 자리를 눌러요. 이기려 들수록 상대가 멀어져요.', ev: ['상관 ' + rd(tg.상관) + '% · 관성 ' + rd(g.관성) + '%'], pv: ['논리보다 공감을 먼저 말하세요', '다툼 뒤에는 이긴 사람이 먼저 사과하는 규칙을 만드세요'] });
    if (sd.strength.band === '신강') a.push({ sev: 54, t: '내 방식대로 끌고 가는 습관', b: '판단이 빨라 상대의 의견을 듣기 전에 결론을 내려요. 상대는 존중받지 못한다고 느껴요.', ev: ['일간 신강'], pv: ['결정하기 전에 "너는 어떻게 생각해?"를 먼저 물으세요', '중요하지 않은 결정은 상대에게 맡겨 보세요'] });
    if (sd.strength.band === '신약') a.push({ sev: 54, t: '착한 사람 모드 뒤의 폭발', b: '상대에게 맞추느라 속마음을 숨기다 한 번에 터져요. 맞춰 주는 기간이 길수록 폭발이 커져요.', ev: ['일간 신약'], pv: ['싫은 건 그 자리에서 작게 말하세요', '매주 "내가 원하는 것 하나"를 말하는 날을 정하세요'] });
    return a.sort(function (x, y) { return y.sev - x.sev; }).slice(0, 4);
  }
  // 위험이 커지는 시기: 대운·세운 지지가 배우자궁(일지)과 충·형·해·원진을 이룰 때
  function riskTimes(H) {
    var M = H.M, sd = H.sd, db = dayBr(sd), Y = sd.nowYear, out = [], dw = sd.currentDaewoon;
    if (dw) { var r = rel(String(dw.ganzhi).charAt(1), db); if (r && r !== '합') out.push({ when: dw.ganzhi + ' 대운 (' + dw.startYear + '~' + dw.endYear + '년)', rel: r }); }
    M.seunRange(H.ch, Y, Y + 4).forEach(function (x) { var r = rel(brOf(M, x), db); if (r && r !== '합') out.push({ when: x.year + '년 ' + M.gzNameK(x), rel: r }); });
    return out.slice(0, 4);
  }
  var TIME_ADVICE = { 충: '이사·이직·가족 문제처럼 큰 변화가 겹치기 쉬워요. 이 시기에는 결혼·동거·큰 계약 같은 결정을 서두르지 마세요.', 형: '작은 일에 서로 예민해지고 시달리는 느낌이 커져요. 대화 시간을 일부러 늘리세요.', 해: '말하지 않은 서운함이 쌓이는 시기예요. 불만은 작을 때 말하세요.', 원진: '밉다가도 끊지 못하는 감정이 커져요. 감정이 격할 땐 하루 쉬고 이야기하세요.' };

  S.deep_marriage = function (H) {
    var sd = H.sd, P = partnerOf(sd), out = [], rk = risks(H), db = dayBr(sd);
    // ① 결혼 기준 시기: 관계를 굳히기 좋은 해·달 (안정·적합도 중심 + 일지와의 합·충)
    var yrs = periodRows(H, 'seun', 'mar').sort(function (a, b) { return b.v - a.v; }).slice(0, 3), mos = periodRows(H, 'wolun', 'mar').sort(function (a, b) { return b.v - a.v; }).slice(0, 2);
    var actM = function (r, i) { return r.v < 55 ? '이 시기에는 결혼 결정을 서두르기보다 대화와 준비(돈·집·가족 이야기)를 차곡차곡 쌓으세요.' : r.rel === '합' ? '서로 마음이 붙는 시기라 결혼 이야기·양가 인사를 꺼내기 좋아요.' : r.rel === '충' ? '변동이 큰 시기라 결혼 날짜·집 계약 같은 큰 결정은 한 번 더 확인하세요.' : i === 0 ? '진지한 이야기(결혼·집·돈 계획)를 시작하기 가장 좋은 때예요.' : '큰 결정은 아니어도 미래 계획을 구체적으로 이야기해 보세요.'; };
    out.push(scene(sec('dp-hero', cap('결혼 지도 · 관계를 굳히는 때와 조심할 점') + '<p class="lead">연애가 "만나고 설레는" 이야기라면 결혼은 <b>안정·적합도·생활 기반</b>의 이야기예요. 같은 시기도 결혼 기준으로 다시 읽었어요. 결혼 지수는 안정성과 적합도에 무게를 두고, 세운·월운 지지가 배우자궁(일지 ' + esc(db) + ')과 합이면 올리고 충·형이면 낮춰 계산합니다.</p>')));
    if (yrs.length) out.push(scene(sec('', cap('결혼 이야기를 꺼내기 좋은 해 (세운)') + rankCards(yrs, function (r) { return r.year + '년'; }, P, 'mar', actM) + '<p class="dp-note">결혼 날짜를 맞히는 풀이가 아니라, 관계를 굳히거나 큰 결정을 논의하기에 <b>상대적으로 안정적인 해</b>를 보는 거예요.</p>')));
    if (mos.length) out.push(scene(sec('', cap('이야기를 나누기 좋은 달 (월운)') + rankCards(mos, function (r) { return r.m + '월'; }, P, 'mar', actM))));
    // ② 드러날 수 있는 위험 요소 — 팩폭 + 예방
    out.push(scene(sec('', cap('솔직하게, 결혼 생활에서 드러날 수 있는 위험') + '<p class="lead">듣기 불편해도 미리 알면 막을 수 있어요. 아래는 사주에서 읽히는 <b>관계의 약한 고리</b>이고, 결혼의 성패나 이별을 말하는 풀이가 아닙니다.</p>')));
    rk.forEach(function (r, i) {
      out.push(scene(sec('', '<div class="dp-tl dn"><div class="dp-tl1"><b>' + (i + 1) + '</b><small>위험 요소</small></div><div class="dp-tl2"><div class="dp-tlt">' + esc(r.t) + '</div><p class="dp-mi">팩폭 · ' + esc(r.b) + '</p><div class="dp-tags">' + r.ev.map(function (e) { return chip('근거 · ' + e); }).join('') + '</div>' +
        '<h4 class="dp-sh">이렇게 예방하세요</h4><ul class="dp-ul">' + r.pv.map(li).join('') + '</ul></div></div>')));
    });
    // ③ 위험이 커지는 시기
    var rt = riskTimes(H);
    out.push(scene(sec('', cap('특히 조심할 시기') + (rt.length ? '<p class="dp-lead2">대운·세운의 지지가 배우자 자리(일지 ' + esc(db) + ')와 부딪히는 때예요. 위험이 "생긴다"가 아니라 <b>평소보다 예민해지는 구간</b>이라는 뜻이에요.</p><ul class="dp-ul">' + rt.map(function (t) { return '<li><b>' + esc(t.when) + '</b> — ' + esc(REL_TXT[t.rel] + '. ' + TIME_ADVICE[t.rel]) + '</li>'; }).join('') + '</ul>' : '<p class="lead">앞으로 5년 안에 배우자 자리를 크게 흔드는 충·형은 보이지 않아요. 큰 부딪힘보다 일상의 소통 부족이 더 큰 변수예요.</p>'))));
    // ④ 예방 처방 요약
    var pv = rk.slice(0, 3).map(function (r) { return r.pv[0]; });
    out.push(scene(sec('', cap('오늘부터 하는 예방 처방') + '<ul class="dp-ul">' + pv.map(li).join('') + li('월 1회, 서로에게 "요즘 서운한 것 하나, 고마운 것 하나"를 말하는 날을 정하세요') + '</ul><p class="dp-note">위 내용은 사주의 구조를 쉬운 말로 옮긴 <b>관계 점검표</b>예요. 결혼 여부·기간·이별 같은 일은 말하지 않고, 사람의 노력과 선택이 항상 더 큰 변수입니다.</p>')));
    return { title: '결혼 지도', sub: '결혼 기준 시기 · 드러날 위험 · 예방', scenes: out };
  };

  R.DeepLove = { partnerOf: partnerOf, loveIdx: loveIdx, marIdx: marIdx, rel: rel, risks: risks, PLACES: PLACES, STYLE: STYLE };
  // 연애 성향(c09) 뒤 · 결혼과 배우자(c10)의 배우자 풀이(deep_spouse) 뒤에 끼운다.
  if (D.PLACEMENT) [['c09', 'deep_love'], ['deep_spouse', 'deep_marriage']].forEach(function (pl) { if (!D.PLACEMENT.some(function (x) { return x[1] === pl[1]; })) D.PLACEMENT.push(pl); });
})(typeof window !== 'undefined' ? window : globalThis);
