/* 깊이 풀이 2 — 직업 후보 · 배우자 추정 · 일주 궁합 · 전생. deep.js 의 SECTIONS 에 더한다.
   직업·일주 궁합은 엔진 값(careerProfile · compatDayPillars · compatAttraction)을 읽어 쓰고, 배우자 인상·전생은 일지·오행·십성·12운성·12신살에서 규칙으로 풀어 쓴 "해석 콘텐츠"다(근거가 약한 부분은 상징적으로 채운다). */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, D = R.Deep; if (!D) return;
  var S = D.SECTIONS, esc = D.esc, scene = D.scene, sec = D.sec, cap = D.cap, bar = D.bar, fig = D.fig, chip = D.chip, nz = D.nz, who = D.who, clamp = D.clamp;
  var BR_K = '자축인묘진사오미신유술해', EL_HJ = D.EL_HJ;

  // ───────── 직업 후보 ─────────
  var CAT_HJ = { creative: '創', planning: '策', research: '究', education: '敎', business: '商', sales: '販', management: '營', organization: '統', technical: '技', communication: '話', asset: '財', public: '公' };
  S.deep_jobs = function (H) {
    var M = H.M, cp = M.careerProfile(H.ch), cats = cp.categories, top = cats.slice(0, 5), out = [];
    out.push(scene(sec('', cap('직업 후보 · 나에게 맞는 일의 방향') + '<p class="lead">' + esc(who(H)) + '의 사주에서 <b>잘 쓰이는 기운</b>과 <b>일하는 방식(성향)</b>을 겹쳐 12가지 직군의 적합도를 계산했습니다. 점수가 높다고 그 일을 해야 하는 건 아니고, "힘이 덜 드는 방향"을 보여 주는 지도입니다.</p>' +
      '<div class="dp-bars">' + cats.slice(0, 8).map(function (c, i) { return bar(c.name, c.score, { text: c.score + '점', color: i < 3 ? '#D5B97F' : '' }); }).join('') + '</div>')));
    top.slice(0, 3).forEach(function (c, i) {
      var ex = (c.examples || []).slice(0, 6), st = (c.strengths || [])[0] || '', ca = (c.cautions || [])[0] || '';
      out.push(scene(sec('dp-job', '<div class="dp-jobrow">' + fig(H, 'career:' + c.category, 'career', c.name, 'dp-thumb') + '<div class="dp-jobtxt"><small>추천 ' + (i + 1) + '순위</small><h4>' + esc(c.name) + '</h4><div class="dp-meter"><span>적합도 <b>' + c.score + '</b></span>' + bar('', c.score, { cls: 'dp-slim', text: '' }) + '<span>부담도 <b>' + c.burden + '</b></span>' + bar('', c.burden, { cls: 'dp-slim dp-warnbar', text: '' }) + '</div></div></div>' +
        '<div class="dp-tags">' + ex.map(function (x) { return chip(x); }).join('') + '</div>' + (st ? '<p class="dp-pl">＋ ' + esc(st) + '</p>' : '') + (ca ? '<p class="dp-mi">－ ' + esc(ca) + '</p>' : ''))));
    });
    var ws = cp.workStyle, ax = ['independence', 'stability', 'creation', 'interaction', 'execution', 'horizon'].filter(function (k) { return ws[k]; }).map(function (k) { var a = ws[k]; return '<div class="dp-axis"><span>' + esc(a.left) + '</span><div class="dp-track"><i style="left:' + clamp(a.value, 4, 96) + '%"></i></div><span>' + esc(a.right) + '</span></div>'; }).join('');
    out.push(scene(sec('', cap('일하는 방식의 성향') + '<p class="dp-lead2">점이 어느 쪽에 가까운지로 "어떤 환경에서 힘이 나는지"를 봅니다.</p>' + ax + (cp.envSummary && cp.envSummary.text ? '<p class="dp-note">' + esc(cp.envSummary.text) + '</p>' : ''))));
    var avoid = cp.byBurden.slice(0, 3); out.push(scene(sec('', cap('솔직하게, 힘들 수 있는 일') + '<div class="dp-pc"><div class="dp-con" style="grid-column:1/-1"><h4>부담이 큰 직군·환경</h4><ul>' + avoid.map(function (c) { return '<li><span>' + esc(c.name) + ' (부담 ' + c.burden + ')</span><em>' + esc((c.cautions || [])[0] || '기운의 소모가 큰 편입니다') + '</em></li>'; }).join('') + (cp.burdenEnvs || []).slice(0, 2).map(function (e) { return '<li><span>' + esc(e.name) + '</span><em>' + esc((e.why || [])[0] || e.desc) + '</em></li>'; }).join('') + '</ul></div></div>')));
    return { title: '직업 후보 지도', sub: '나에게 맞는 일의 방향 · 부담이 큰 일', scenes: out };
  };

  // ───────── 배우자 추정 ─────────
  var FACE = { 자: ['다람쥐상', '눈이 반짝이고 재치 있는 인상, 작은 몸짓에도 생기가 도는 사람'], 축: ['곰상', '듬직하고 푸근한 인상, 말수는 적지만 곁에 있으면 안심되는 사람'], 인: ['호랑이상', '선이 또렷하고 눈빛이 강한 인상, 카리스마와 의협심이 있는 사람'], 묘: ['토끼상', '맑고 순한 인상, 말씨가 부드럽고 눈치가 빠른 사람'],
    진: ['공룡상', '이목구비가 크고 시원한 인상, 존재감이 크고 배포가 있는 사람'], 사: ['여우상', '갸름하고 세련된 인상, 영리하고 속을 쉽게 보이지 않는 사람'], 오: ['사슴상', '맑은 눈에 긴 선, 감정 표현이 솔직하고 활동적인 사람'], 미: ['강아지상', '둥글고 따뜻한 인상, 다정하고 사람을 잘 따르는 사람'],
    신: ['수달상', '장난기 있고 재기발랄한 인상, 손재주와 센스가 좋은 사람'], 유: ['고양이상', '단정하고 도도한 인상, 깔끔하고 자기 기준이 분명한 사람'], 술: ['늑대상', '날렵하고 경계심 있는 인상, 마음을 열면 끝까지 의리를 지키는 사람'], 해: ['판다상', '둥글고 편안한 인상, 낙천적이고 사람을 품는 사람'] };
  var VIBE = { 목: ['청량하고 성장하는 분위기', '새로운 것을 배우고 앞으로 나아가려는 기운이 느껴지는 사람'], 화: ['화사하고 열정적인 분위기', '표정과 말에 온기가 있고 분위기를 환하게 만드는 사람'], 토: ['듬직하고 편안한 분위기', '말보다 행동으로 신뢰를 주는 안정적인 사람'], 금: ['단정하고 세련된 분위기', '정리되어 있고 판단이 분명하며 선이 깔끔한 사람'], 수: ['차분하고 깊은 분위기', '속이 깊고 생각이 많으며 조용히 곁을 지키는 사람'] };
  var JOBS_BY_EL = { 목: ['교육·강사', '기획·출판·콘텐츠', '의료·복지', '디자인·패션'], 화: ['방송·미디어·연예', '요식·뷰티', 'IT·마케팅', '영업·서비스'], 토: ['부동산·건설', '공무원·공공기관', '금융·보험', '농식품·유통'], 금: ['법률·수사·군경', '기계·제조·엔지니어', '금융·회계', '의료기기·정밀'], 수: ['무역·물류·유통', '연구·학술', '여행·항공·관광', '상담·심리'] };
  var MEET = { 목: ['배움의 자리(학원·강의·독서모임)', '소개·지인 모임', '자연·야외 활동'], 화: ['사람 많은 모임·행사·SNS', '일 관련 네트워크', '공연·전시·축제'], 토: ['직장·거래처·오래 알던 사이', '가족·친척의 소개', '지역 모임·동호회'], 금: ['직장·전문직 네트워크', '운동·자기계발 모임', '지인의 정식 소개'], 수: ['여행·이동 중 인연', '온라인·커뮤니티', '친구의 친구'] };
  var BR_TRAIT = { 자: ['영리하고 눈치가 빠르다', '생각이 많고 속마음을 숨긴다'], 축: ['성실하고 책임감이 강하다', '고집이 세고 표현이 서툴다'], 인: ['추진력과 정의감이 있다', '자존심이 세고 지배하려 든다'], 묘: ['다정하고 예민하게 배려한다', '상처를 오래 간직한다'], 진: ['포부가 크고 능력이 있다', '자기 방식을 고집하고 간섭한다'],
    사: ['세련되고 머리가 좋다', '의심이 많고 속을 안 보인다'], 오: ['솔직하고 열정적이다', '성급하고 감정 기복이 있다'], 미: ['온화하고 정이 많다', '우유부단하고 서운함을 쌓는다'], 신: ['재치 있고 실행이 빠르다', '변덕스럽고 약속에 가볍다'], 유: ['깔끔하고 원칙적이다', '날카롭게 지적하고 완벽을 요구한다'], 술: ['의리 있고 정직하다', '고집이 세고 의심이 많다'], 해: ['낙천적이고 포용력이 있다', '게으르고 경계가 느슨하다'] };
  function partnerOf(H) {
    var sd = H.sd, male = sd.gender === 'M', grp = male ? '재성' : '관성', el = sd.groupEl[grp], day = sd.pillars.day, br = day.ko.charAt(1), tg = day.branchTG, face = FACE[br] || FACE.자, g = sd.groups[grp] || 0;
    return { male: male, grp: grp, el: el, br: br, tg: tg, face: face, share: g, slot: 'spouse:' + br + ':' + (male ? 'F' : 'M') };
  }
  S.deep_spouse = function (H) {
    var P = partnerOf(H), sd = H.sd, M = H.M, out = [], t = BR_TRAIT[P.br] || BR_TRAIT.자, vibe = VIBE[P.el] || VIBE.토, partner = P.male ? '아내(여자친구)' : '남편(남자친구)';
    out.push(scene(sec('dp-hero', cap('미래 연인 · 배우자 추정') + '<p class="lead">배우자 자리인 <b>일지(' + esc(P.br) + ')</b>와 배우자별인 <b>' + esc(P.grp + '(' + P.el + ')') + '</b>을 겹쳐 읽은 <b>상징적 추정</b>입니다. 사주만으로 사람의 얼굴이나 직업을 알 수는 없어서, 닮은 인상의 "경향"으로 재미있게 읽어 주세요.</p>' +
      fig(H, P.slot, 'spouse', P.face[0], '') + '<h3 class="dp-h">' + esc(P.face[0]) + ' · ' + esc(vibe[0]) + '</h3><p class="lead">' + esc(P.face[1]) + '</p>')));
    var jobs = (JOBS_BY_EL[P.el] || JOBS_BY_EL.토).map(function (j, i) { return [j, clamp(46 - i * 9 + (P.share > 20 ? 6 : 0), 8, 60)]; });
    var meets = (MEET[P.el] || MEET.토).map(function (m, i) { return [m, clamp(52 - i * 14, 10, 60)]; });
    var age = P.el === '수' || P.el === '금' ? [['연상', 40], ['동갑', 35], ['연하', 25]] : P.el === '화' || P.el === '목' ? [['연하', 42], ['동갑', 33], ['연상', 25]] : [['동갑', 40], ['연상', 32], ['연하', 28]];
    out.push(scene(sec('', cap('이런 사람일 가능성이 높습니다') + '<div class="dp-grid2"><div class="dp-card"><h4>풍기는 분위기</h4><p>' + esc(vibe[1]) + '</p></div><div class="dp-card"><h4>성격(장·단점)</h4><p class="dp-pl">＋ ' + esc(t[0]) + '</p><p class="dp-mi">－ ' + esc(t[1]) + '</p></div></div>' +
      '<h4 class="dp-sh">추정 직업군</h4><div class="dp-bars">' + jobs.map(function (j) { return bar(j[0], j[1] * 1.6, { text: j[1] + '%' }); }).join('') + '</div><h4 class="dp-sh">나이 차이</h4><div class="dp-bars">' + age.map(function (a) { return bar(a[0], a[1] * 2, { text: a[1] + '%' }); }).join('') + '</div><h4 class="dp-sh">만날 가능성이 높은 곳</h4><div class="dp-bars">' + meets.map(function (m) { return bar(m[0], m[1] * 1.6, { text: m[1] + '%' }); }).join('') + '</div>')));
    // 만날 시기 후보: 앞으로 10년 세운 중 연애 지수가 높은 해(엔진 evaluateDomainLuck)
    var yrs = []; try { M.seunRange(H.ch, H.sd.nowYear, H.sd.nowYear + 9).forEach(function (x) { var d; try { d = M.evaluateDomainLuck(H.ch, x, 'seun'); } catch (e) { } if (d && d.love) yrs.push({ y: x.year, gz: M.gzNameK(x), s: d.love.score, band: d.love.band, sum: d.love.summary }); }); } catch (e) { }
    yrs.sort(function (a, b) { return b.s - a.s; });
    if (yrs.length) out.push(scene(sec('', cap('인연이 움직이는 시기 후보') + '<p class="dp-lead2">앞으로 10년 중 연애 지수(관계 활동·궁합 적합도·안정성을 합친 값)가 높은 해입니다. 만나는 해이기도 하고, 이미 있는 관계가 깊어지는 해이기도 합니다.</p><div class="dp-bars">' + yrs.slice(0, 3).map(function (y, i) { return bar((i + 1) + '순위 · ' + y.y + '년 ' + y.gz, y.s, { text: y.s + '점', color: '#D9869A' }); }).join('') + '</div><ul class="dp-ul">' + yrs.slice(0, 3).map(function (y) { return '<li><b>' + y.y + '년</b> — ' + esc(y.sum || y.band) + '</li>'; }).join('') + '</ul>')));
    out.push(scene(sec('', cap('솔직하게, 부딪힐 수 있는 부분') + '<div class="dp-pc"><div class="dp-con" style="grid-column:1/-1"><h4>이 사람과 갈등이 생기기 쉬운 점</h4><ul><li><span>' + esc(t[1] + '는 면이 있어, ' + (P.male ? '당신이 ' : '당신이 ') + '섭섭함을 쌓아 두면 한 번에 터지기 쉽습니다') + '</span><em>근거 · 일지 ' + esc(P.br) + ' (' + esc(P.tg) + ')</em></li><li><span>배우자 자리(일지)와 다른 글자 사이에 ' + ((sd.clashes || []).some(function (c) { return c.members.indexOf('day') >= 0; }) ? '충·형이 있어 관계에 변화·긴장이 반복될 수 있습니다' : '큰 충돌은 없지만 서로 다른 속도 때문에 서운함이 생길 수 있습니다') + '</span><em>근거 · 원국의 합충</em></li></ul></div></div><p class="dp-note">내가 먼저 할 일: 서운함을 "그때그때 한 문장"으로 말하는 습관이 이 관계를 오래 가게 합니다.</p>')));
    return { title: '미래 연인 · 배우자 추정', sub: P.face[0] + ' · ' + vibe[0], scenes: out };
  };

  // ───────── 자식운: 부모의 시주를 관계 방식으로 읽는다 ─────────
  // 전통 자녀성 참고: 淵海子平 論子息 (남명 관살·여명 식상). 수·성별·건강·출산 시기는 추정하지 않는다.
  // https://zh.wikisource.org/zh-hant/淵海子平大全#論子息
  var CHILD_TG = {
    비견: ['자율을 존중하는 동반형', '아이의 선택을 한 사람의 의견으로 듣고 함께 경험하는 힘이 있습니다.', '내가 해 본 방식이 기준이 되면 아이의 다른 속도를 경쟁이나 고집으로 받아들이기 쉽습니다.', '함께 정할 규칙과 아이가 혼자 선택할 일을 구분합니다.'],
    겁재: ['경험을 함께 넓히는 활동형', '아이와 함께 시도하고 밖에서 경험을 넓히는 데 적극적으로 참여할 수 있습니다.', '함께 하는 활동이 많아져도 아이에게는 혼자 쉬거나 거절할 공간이 필요합니다.', '활동을 정하기 전에 참여 의사를 묻고, 거절할 수 있는 선택지도 남깁니다.'],
    식신: ['일상의 안정으로 돌보는 양육형', '식사·놀이·생활 리듬처럼 매일 반복되는 돌봄을 차분하게 이어 가는 힘을 살릴 수 있습니다.', '편안하게 해 주려는 마음이 앞서면 스스로 해 볼 일을 대신 처리할 수 있습니다.', '생활의 바탕은 챙기되 아이가 직접 마무리할 작은 일 하나를 남깁니다.'],
    상관: ['질문과 표현을 키우는 대화형', '왜 그런지 묻고 감정을 말하게 해 주는 방식으로 아이의 표현을 넓힐 수 있습니다.', '설명이 길어지거나 틀린 점을 즉시 고치려 들면 아이가 이야기하기 전에 답부터 듣는 관계가 됩니다.', '아이의 말을 끝까지 듣고, 조언은 필요한지 먼저 물은 뒤 한 가지씩 전합니다.'],
    편재: ['경험과 가능성을 열어 주는 지원형', '여러 경험을 접하게 하고 새로운 기회를 찾아 주는 지원을 살릴 수 있습니다.', '좋은 기회를 놓치지 않으려는 마음 때문에 일정·비용·기대가 한꺼번에 커질 수 있습니다.', '새 활동을 더하기 전에 아이의 흥미와 가족의 시간·비용 한도를 함께 확인합니다.'],
    정재: ['생활의 기반을 지키는 계획형', '돌봄의 비용과 일정을 꾸준히 챙기고 예측 가능한 생활 기반을 만드는 힘을 살릴 수 있습니다.', '잘 준비한 계획이 있어도 아이의 관심과 발달 속도는 계획대로 움직이지 않습니다.', '지킬 생활 기준은 단순하게 두고, 바뀔 수 있는 일정에는 여유를 남깁니다.'],
    편관: ['보호와 책임을 먼저 세우는 보호형', '위험을 살피고 필요한 경계를 분명히 세우는 보호 역할을 맡을 수 있습니다.', '걱정이 커지면 지시와 확인이 잦아지고, 아이에게는 신뢰보다 감시로 전달될 수 있습니다.', '안전과 관련된 기준은 명확히 설명하고, 안전한 범위 안에서는 결정권을 돌려줍니다.'],
    정관: ['공정한 기준으로 이끄는 원칙형', '약속과 책임의 기준을 일관되게 보여 주어 안정적인 관계를 만드는 힘을 살릴 수 있습니다.', '옳은 행동만 강조하면 실수한 마음을 듣기보다 평가부터 하는 관계가 되기 쉽습니다.', '행동의 기준과 감정에 대한 공감을 나눠 말하고, 규칙의 이유를 함께 설명합니다.'],
    편인: ['개별 관심을 깊이 살피는 관찰형', '아이마다 다른 관심과 반응을 세밀하게 관찰하고 혼자 몰입하는 시간을 지켜 줄 수 있습니다.', '관찰이 지나치면 작은 반응에도 의미를 붙이거나 앞으로 생길 일을 미리 걱정할 수 있습니다.', '추측한 마음을 사실로 말하지 않고, 지금 필요한 도움을 직접 묻습니다.'],
    정인: ['배움과 정서를 받쳐 주는 지지형', '안심하고 배우며 질문할 수 있도록 정서적·학습적 바탕을 받쳐 주는 힘을 살릴 수 있습니다.', '도와주려는 마음이 앞서면 실패를 경험할 기회까지 막거나 답을 대신 정할 수 있습니다.', '답을 주기 전에 아이가 시도한 방법을 묻고, 다시 해 볼 시간을 남깁니다.']
  };
  var CHILD_GROUP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 정재: '재성', 편재: '재성', 정관: '관성', 편관: '관성', 정인: '인성', 편인: '인성' };
  function childProfile(H) {
    var sd = H.sd, hp = sd.pillars && sd.pillars.hour, known = !!(sd.birth && sd.birth.hourKnown && hp), star = sd.gender === 'F' ? '식상' : '관성';
    if (!known) return { known: false, star: star, basis: '태어난 시간 미상 · 시주 해석 보류' };
    var cell = H.ch.cells && H.ch.cells.hour || {}, hidden = (cell.hidden || []).map(function (h) { return { stem: H.M.STEM_K[h.s], tg: h.tg, label: h.label }; }), type = CHILD_TG[hp.branchTG] ? hp.branchTG : hp.stemTG, group = CHILD_GROUP[type] || '인성';
    var rels = (H.ch.relations || []).filter(function (x) { return (x.members || []).indexOf('hour') >= 0; });
    var tags = [hp.stemTG, hp.branchTG].concat(hidden.map(function (h) { return h.tg; })), visible = tags.some(function (t) { return CHILD_GROUP[t] === star; });
    return { known: true, hour: hp.ko, stemTG: hp.stemTG, branchTG: hp.branchTG, hidden: hidden, type: type, group: group, style: CHILD_TG[type] || CHILD_TG.정인, star: star, visible: visible, stage: hp.unseong, relations: rels.map(function (x) { return { type: x.type, name: x.name, members: x.members }; }), slot: 'children:' + group + ':' + (sd.gender === 'F' ? 'F' : 'M') };
  }
  // 자녀궁의 십성은 실제 아이의 사주 대신, 자녀와 관계를 맺는 장면의 모티프로 쓴다.
  var CHILD_PORTRAIT = {
    비견: ['자기 생각이 분명한 아이', '좋아하는 것과 싫어하는 것을 또렷하게 말하고, 직접 해 보아야 납득하는 아이의 모습이 그려집니다.', '선택할 여지를 받으면 스스로 목표를 정하고 끝까지 책임지는 방향으로 성장할 가능성을 이야기할 수 있습니다.', '부모가 답을 먼저 정하면 작은 선택도 주도권 다툼으로 번질 수 있습니다.'],
    겁재: ['사람 속에서 도전하는 아이', '친구와 어울리고 새로운 놀이에 뛰어들며, 지기 싫어하는 마음도 드러내는 아이의 모습입니다.', '함께 도전하는 경험 속에서 추진력과 협동을 배우고, 사람들을 움직이는 강점을 펼칠 수 있습니다.', '다른 아이와 비교하거나 승패만 강조하면 경쟁심이 앞서 자기 속도를 놓칠 수 있습니다.'],
    식신: ['좋아하는 일을 꾸준히 즐기는 아이', '만들고 놀고 익히는 과정을 즐기며, 익숙한 일상 안에서 자기 재주를 차곡차곡 쌓는 모습입니다.', '충분히 반복할 기회를 받으면 손으로 만드는 일이나 표현 활동에서 자신만의 솜씨를 키워 갈 수 있습니다.', '부모가 서두르며 결과를 재촉하면 즐기던 일도 평가받는 숙제처럼 느낄 수 있습니다.'],
    상관: ['질문이 많고 표현이 선명한 아이', '왜 그래야 하는지 묻고, 남들과 다른 답이나 새로운 방법을 내놓는 아이의 모습이 그려집니다.', '질문을 받아 주고 표현할 통로를 열어 주면 자기 생각을 말과 창작으로 펼치는 방향으로 성장할 수 있습니다.', '말대꾸로만 받아들이면 서로 설명하기보다 반박하는 관계가 될 수 있습니다.'],
    편재: ['세상 경험에 호기심이 많은 아이', '낯선 장소와 사람에게 관심을 보이고, 재미있는 기회를 발견하면 먼저 움직여 보는 모습입니다.', '여러 경험을 스스로 고르고 돌아볼 수 있다면 넓은 시야와 현실 감각을 함께 키워 갈 수 있습니다.', '흥미가 옮겨 갈 때마다 부모가 계획을 더하면 경험이 지나치게 많아져 한 가지를 깊이 해 볼 여유가 줄어들 수 있습니다.'],
    정재: ['차분하게 자기 몫을 챙기는 아이', '정해진 약속을 기억하고, 작은 일도 순서대로 마무리하면서 안정감을 얻는 아이의 모습입니다.', '과정의 성실함을 인정받으면 생활을 스스로 관리하고 맡은 일을 꾸준히 이어 가는 강점을 펼칠 수 있습니다.', '실수까지 모두 점검하면 잘해야 한다는 부담 때문에 새 시도를 망설일 수 있습니다.'],
    편관: ['도전 앞에서 힘을 내는 아이', '어려운 과제에도 승부욕을 보이고, 자기 힘으로 넘어서려는 모습이 자식 자리의 모티프로 그려집니다.', '도전의 크기를 함께 조절하면 용기와 책임감을 살리며 어려운 상황에 대응하는 힘을 키워 갈 수 있습니다.', '강하게 밀어붙이는 양육과 만나면 서로 버티며 힘겨루기를 할 수 있습니다.'],
    정관: ['약속과 인정을 소중히 여기는 아이', '규칙과 역할을 이해하려 하고, 믿고 맡겨 주는 말에 힘을 얻는 아이의 모습입니다.', '성과뿐 아니라 노력과 마음도 인정받으면 신뢰를 쌓고 공동체에서 자기 역할을 해내는 방향으로 성장할 수 있습니다.', '착한 아이여야 한다는 기대가 커지면 속상한 마음을 숨기고 부모가 바라는 답만 말할 수 있습니다.'],
    편인: ['자기만의 관심을 깊이 파는 아이', '혼자 생각하거나 독특한 관심사에 오래 몰입하며, 낯선 상황에서는 먼저 지켜보는 모습입니다.', '자기 방식으로 탐색할 시간을 받으면 남들이 지나치는 것을 발견하고 관심 분야를 깊이 익히는 강점을 펼칠 수 있습니다.', '조용함을 무관심으로 보거나 남들과 같은 방식을 요구하면 자기 세계를 설명하기 어려워질 수 있습니다.'],
    정인: ['배우고 마음을 나누는 아이', '익숙한 사람에게 질문하고 이야기를 나누며, 안심할 수 있는 관계 안에서 배움을 넓히는 모습입니다.', '정서적 지지와 직접 해 볼 기회가 함께 주어지면 배운 것을 자기 것으로 만들고 다른 사람도 돌보는 힘을 키울 수 있습니다.', '부모가 대신 결정하고 해결해 주는 일이 많아지면 혼자 시도할 때 주저할 수 있습니다.']
  };
  S.deep_children = function (H) {
    var p = childProfile(H), out = [], sd = H.sd;
    var note = '부모의 사주에 나타난 자녀궁을 바탕으로 그려 본 자녀상과 관계의 가능성입니다. 실제 아이의 성격과 미래를 확인한 결과는 아니며, 자녀 수·성별·건강·출산 시기를 뜻하지 않습니다.';
    if (!p.known) return { title: '자식운 · 내 자식 자리의 모습', sub: '시간 미상 · 구체적인 자녀상 해석 보류', scenes: [scene(sec('', cap('어떤 아이의 모습이 그려질까') + '<p class="lead">태어난 시간이 없어 자식 자리의 구체적인 모습을 고르기 어렵습니다. 출생 시간을 확인하면 어떤 성향의 자녀상이 그려지고, 부모와 어떤 장면에서 가까워지거나 부딪힐 수 있는지 더 구체적으로 풀어볼 수 있습니다.</p><p class="dp-note">' + esc(note) + '</p>')), scene(sec('', cap('이미 자녀가 있다면 먼저 볼 것') + '<p class="lead">아이가 스스로 고르는 일, 오래 즐기는 활동, 속상할 때 보이는 반응부터 살펴보세요. 그 모습이 실제 아이를 이해하는 출발점입니다.</p>'))] };
    var st = p.style, child = CHILD_PORTRAIT[p.type] || CHILD_PORTRAIT.정인, surface = CHILD_PORTRAIT[p.stemTG] || child;
    var tension = p.relations.some(function (r) { return /충|형|해|파|원진/.test(r.type); });
    var bond = p.relations.some(function (r) { return /합/.test(r.type); });
    out.push(scene(sec('dp-hero', cap('내 자식 자리에는 어떤 아이가 그려질까') + fig(H, p.slot, 'children', child[0], '') + '<h3 class="dp-h">' + esc(child[0]) + '</h3><p class="lead">' + esc(child[1]) + '</p><p class="dp-note">' + esc(note) + '</p>')));
    out.push(scene(sec('', cap('겉으로 보이는 모습과 가까이서 보는 모습') + '<p class="lead">' + esc(p.stemTG === p.type ? '자녀궁의 겉과 속에 같은 모티프가 반복됩니다. ' + child[0] + '의 모습을 중심으로 이야기를 풀어볼 수 있습니다.' : '겉으로는 ' + surface[0] + '의 모습이 먼저 보이지만, 가까이 지내는 일상에서는 ' + child[0] + '의 모습도 함께 그려집니다. 한 가지 성격으로만 정리하기보다 두 모습을 함께 이해하는 관계가 될 수 있습니다.') + '</p><p class="lead">' + esc('부모인 ' + who(H) + '에게는 ' + st[0] + '의 양육 방식이 관계의 한 축으로 그려집니다. 아이의 성향과 나의 돌봄 방식이 만나는 지점을 함께 살펴봅니다.') + '</p>')));
    out.push(scene(sec('', cap('어떤 방향으로 자랄 가능성이 있을까') + '<p class="lead">' + esc(child[2]) + '</p><p class="lead">' + esc(sd.strength.band === '신약' ? '부모가 모든 지원을 혼자 떠안기보다 주변의 도움을 함께 쓰는 조건에서 아이가 자기 시도를 이어 갈 여유를 만들 수 있습니다.' : sd.strength.band === '신강' ? '부모가 이끄는 힘이 큰 만큼, 아이가 정한 목표도 함께 존중하면 부모의 추진력과 아이의 자율성이 서로 힘을 보탤 수 있습니다.' : '꾸준한 생활 기준과 바꿔 볼 여지를 함께 두면 아이가 안정감 속에서 자기 관심을 넓히는 장면을 기대해 볼 수 있습니다.') + '</p><p class="dp-note">학업 성적이나 직업·성공 여부를 미리 정하는 풀이가 아닙니다.</p>')));
    out.push(scene(sec('', cap('부모와 아이 사이에 생길 수 있는 장면') + '<div class="dp-pc"><div class="dp-pro"><h4>가까워지는 방향</h4><p class="lead">' + esc(st[1]) + '</p></div><div class="dp-con"><h4>부딪힐 수 있는 지점</h4><p class="lead">' + esc(child[3] + ' ' + st[2]) + '</p></div></div><p class="lead">' + esc(tension && bond ? '서로 많이 관여하고 힘이 되어 주면서도, 선택과 생활 기준에서는 의견이 엇갈리는 관계로 그려볼 수 있습니다. 가까운 사이일수록 아이의 몫과 부모의 몫을 구분하는 일이 도움이 됩니다.' : tension ? '생활 방식이나 선택을 조정하는 과정에서 의견 차이가 두드러지는 장면을 그려볼 수 있습니다. 그것을 아이의 잘못으로 정하기보다 서로 다른 속도를 확인하는 대화가 필요합니다.' : bond ? '부모와 아이가 서로의 일에 관심을 갖고 함께 움직이는 장면이 그려집니다. 가까운 만큼 아이가 혼자 선택하고 경험할 공간도 남겨 두는 편이 좋습니다.' : '자녀궁의 관계 신호만으로 가까움이나 갈등의 정도를 정하기는 어렵습니다. 아이의 실제 반응을 보며 도움과 자율의 균형을 맞춰 갑니다.') + '</p>')));
    out.push(scene(sec('', cap('이 가능성을 좋은 관계로 키우려면') + '<p class="lead">' + esc(st[3]) + '</p><p class="lead">이번 주에는 아이가 고를 일 하나를 남겨 두고, 선택한 이유를 끝까지 들어 보세요. 잘했는지부터 평가하기보다 무엇이 재미있었고 어려웠는지 묻는 대화로 이어갑니다.</p><details><summary>이 풀이의 명리 근거</summary><p class="dp-note">' + esc('원국 전체의 일간 ' + sd.dayMaster.stem + sd.dayMaster.el + ' · 월주 ' + sd.pillars.month.ko + ' · ' + sd.strength.band + '을 함께 참고했습니다. 자녀궁은 ' + p.hour + ' 시주이며 시간 ' + p.stemTG + ', 시지 본기 ' + p.branchTG + '을 이야기의 모티프로 읽었습니다. 자녀성 ' + p.star + '은 시주에 ' + (p.visible ? '확인됩니다.' : '뚜렷하지 않지만 자녀가 없다는 뜻은 아닙니다.')) + '</p><p class="dp-note">' + esc('지장간: ' + (p.hidden.map(function (h) { return h.stem + '(' + h.tg + ')'; }).join(' · ') || '자료 없음') + ' · 관계: ' + (p.relations.map(function (r) { return r.name; }).join(' · ') || '직접 참여 관계 없음')) + '</p></details>')));
    return { title: '자식운 · 내 자식 자리의 모습', sub: child[0] + ' · 성장 가능성 · 부모와의 관계', scenes: out };
  };
  R.ChildReading = { profile: childProfile, TG: CHILD_TG, GROUP: CHILD_GROUP, PORTRAIT: CHILD_PORTRAIT };

  // ───────── 일주 궁합 후보 ─────────
  S.deep_ilju = function (H) {
    var M = H.M, cd = M.compatDayPillars(H.ch), ca = M.compatAttraction(H.ch, 'opposite'), out = [];
    var good = cd.slice(0, 5), bad = cd.slice().sort(function (a, b) { return a.score - b.score || b.risk - a.risk; }).slice(0, 5);
    var mutual = ca.slice().sort(function (a, b) { return (b.attract.mutual || 0) - (a.attract.mutual || 0); }).slice(0, 5);
    var cut = function (s) { return String(s || '').replace(/[()]/g, '').replace(/^.{0,2}$/, ''); };
    // 일주 한 줄 설명 + 같은 일주 유명인(ilju-data.js)
    var info = function (x) { var I = R.IljuInfo && R.IljuInfo.get(x.ganzhiK); return I ? '<p class="dp-idesc">' + esc(I.d) + '</p><div class="dp-ifam" role="note"><span class="dp-ifam-label">같은 일주의 유명인</span><span class="dp-ifam-names">' + I.f.map(function (name) { return '<span class="dp-ifam-person">' + esc(name) + '</span>'; }).join('<span class="dp-ifam-sep" aria-hidden="true"> · </span>') + '</span></div>' : ''; };
    var row = function (x, score, sub, color, why) { return '<div class="dp-ilju"><div class="dp-iname"><b>' + esc(x.ganzhiK) + '일주</b><small>' + esc(x.ganzhi) + '</small></div><div class="dp-iscore">' + bar('', score, { cls: 'dp-slim', color: color, text: score + '점' }) + '<small>' + esc(sub) + '</small></div>' + info(x) + '<p>' + esc(why) + '</p></div>'; };
    out.push(scene(sec('', cap('잘 맞는 일주 · 서로 끌리는 일주 · 부딪히는 일주') + '<p class="lead">상대의 생년월일시는 모르니, <b>60가지 일주</b>를 전부 ' + esc(who(H)) + ' 사주와 맞대어 점수를 냈어요(오행 보완 · 조후 · 일간·일지 관계 · 합충 · 과잉 위험). 일주는 사람의 "본바탕"이라 큰 경향을 보기에 좋습니다. 100점 만점이고, 점수는 상대적 순위의 참고입니다.</p>')));
    out.push(scene(sec('', cap('내게 잘 맞는 일주 TOP 5') + good.map(function (x) { return row(x, x.score, x.type + ' · ' + x.condition, '#5FBF9A', (x.reasons || []).slice(0, 2).map(cut).join(' · ')); }).join(''))));
    out.push(scene(sec('', cap('서로 끌리는 일주 TOP 5') + '<p class="dp-lead2">궁합(보완)과는 다른 축입니다. 배우자성·합·매력 신호처럼 <b>마음이 움직이는 정도</b>입니다. 내가 끌리는 점수와 상대가 나를 좋아할 점수를 같이 보입니다.</p>' + mutual.map(function (x) { var a = x.attract; return '<div class="dp-ilju"><div class="dp-iname"><b>' + esc(x.ganzhiK) + '일주</b><small>' + esc(x.ganzhi) + '</small></div><div class="dp-iscore">' + bar('내가 끌림', a.toThem.score, { cls: 'dp-slim', color: '#D9869A', text: a.toThem.score + '점' }) + bar('나를 좋아함', a.toMe.score, { cls: 'dp-slim', color: '#E6B866', text: a.toMe.score + '점' }) + '</div>' + info(x) + '<p>' + esc((a.reasons || []).slice(0, 2).map(cut).join(' · ')) + '</p></div>'; }).join(''))));
    out.push(scene(sec('', cap('부딪히기 쉬운 일주 TOP 5') + '<p class="dp-lead2">나쁜 사람이라는 뜻이 아니라, 이 일주와는 <b>서로 다른 속도·기운 때문에 마찰이 생기기 쉬운</b> 조합이라는 뜻입니다. 알고 만나면 조율할 수 있습니다.</p>' + bad.map(function (x) { return row(x, x.score, x.type + ' · ' + x.condition, '#FF9A3C', (x.cautions || []).slice(0, 2).map(cut).join(' · ') || (x.reasons || []).slice(0, 1).map(cut).join('')); }).join(''))));
    return { title: '맞는 일주 · 끌리는 일주 · 부딪히는 일주', sub: '60일주 전체 점수로 고른 후보', scenes: out };
  };

  // ───────── 전생 ─────────
  var ROLE = { 비겁: { 목: '두레패를 이끌던 마을의 접장', 화: '불같은 성미로 의병을 모으던 장정', 토: '마을 장정들의 우두머리', 금: '의리로 사람을 지키던 호위무사', 수: '포구의 뱃사공 무리를 이끌던 사람' },
    식상: { 목: '글방에서 글을 가르치던 학자', 화: '장터에서 사람을 웃기던 연희패', 토: '손맛이 이름난 요리사·도공', 금: '쇠를 다루던 이름난 대장장이', 수: '밤마다 이야기를 풀던 이야기꾼' },
    재성: { 목: '약초·목재를 다루던 상인', 화: '비단과 등불을 팔던 장사꾼', 토: '곡물과 땅을 거래하던 객주', 금: '금은방·환전을 하던 상인', 수: '포구에서 무역을 하던 선상(船商)' },
    관성: { 목: '향교에서 일하던 서리', 화: '밤길을 지키던 포도청 관리', 토: '고을을 다스리던 향리·이장', 금: '성을 지키던 무관', 수: '말과 문서를 다루던 역관·밀사' },
    인성: { 목: '서당을 열던 훈장', 화: '사찰의 승려이자 제사를 맡던 사람', 토: '명당을 보던 지관(풍수가)', 금: '법과 율을 가르치던 율사', 수: '병을 보고 길흉을 짚던 의원·점술가' } };
  var HOMEWORK = { 비겁: '혼자 버티는 것과 함께 가는 것의 균형', 식상: '재능을 제대로 표현하고 말을 다듬는 일', 재성: '돈과 현실을 다루면서 욕심을 다스리는 일', 관성: '책임과 규칙 속에서도 나를 잃지 않는 일', 인성: '배운 것을 행동으로 옮기는 일' };
  var PAST_SCENE = {
    목: ['숲 끝의 작은 마을', '비에 젖은 나무 냄새가 골목에 머물던 아침'], 화: ['등불이 늦게까지 켜지던 성문 안 거리', '장터의 마지막 등불이 꺼지기 직전'],
    토: ['논과 오래된 돌담 사이의 마을', '추수가 끝난 들판에 찬 바람이 불던 저녁'], 금: ['돌로 쌓은 성벽 아래 거리', '첫눈이 성벽의 틈을 하얗게 메우던 날'], 수: ['물길과 나루터를 끼고 선 마을', '안개가 나루터의 배들을 가리던 새벽']
  };
  var PAST_PLOT = {
    비겁: ['어릴 때부터 혼자 잘되는 일보다 함께 버티는 일이 더 눈에 들어왔다. 먹을 것이 넉넉하지 않은 날에도 자기 몫을 조금 떼어 친구에게 건네곤 했다. 어른들은 손해 보는 버릇이라 했지만, 그에게는 누군가 곁에 남아 있다는 사실이 더 중요했다.', '일이 생기면 사람들은 자연스럽게 그를 찾았다. 처음에는 힘을 보태는 것으로 충분했다. 그러나 맡는 일이 늘수록 모두의 기대를 등에 지고 혼자 결정하는 날도 많아졌다. 어느 겨울, 함께 일하던 벗이 조용히 말했다. “네가 다 정하면, 우리는 네 곁에 서 있을 뿐이야.”', '그 말을 듣고도 한동안 화가 났다. 자신이 얼마나 애썼는지 아무도 모른다고 생각했다. 하지만 빈 작업터에 혼자 남은 밤, 가장 아팠던 것은 일이 틀어진 사실보다 벗의 자리가 비었다는 사실이었다. 다음 날 그는 사람들을 불러 자기 계획 대신 각자의 생각부터 물었다.'],
    식상: ['어릴 적 그는 버려진 물건에서도 쓸모를 찾아냈다. 깨진 그릇의 조각으로 무늬를 만들고, 어른들이 흘려 말한 이야기를 자기 말로 바꾸어 동생들에게 들려주었다. 잘했다는 칭찬보다 사람들이 잠시 웃는 얼굴이 오래 기억에 남았다.', '솜씨가 알려지자 찾아오는 사람이 늘었다. 그는 누구보다 오래 일했고, 자기 방식이 옳다는 자신감도 커졌다. 그러던 날 오래된 손님이 완성된 물건을 한참 바라보다 말했다. “훌륭하네. 그런데 내가 부탁한 건 조금 다른 것이었어.”', '처음에는 그 말이 자기 재주를 무시하는 것처럼 들렸다. 며칠 뒤 다시 찾아온 손님은 서툰 그림 한 장을 내밀었다. 그제야 그는 자신이 보여 주고 싶은 것과 상대가 필요로 한 것이 달랐음을 알아차렸다. 그날부터 일을 시작하기 전에는 상대의 이야기를 조금 더 오래 들었다.'],
    재성: ['그는 어릴 때부터 장터에서 손이 오가는 모습을 유심히 보았다. 같은 물건도 누구에게 언제 건네느냐에 따라 값과 쓰임이 달라졌다. 처음 자기 손으로 번 작은 동전을 집에 가져왔을 때, 식탁 위에 놓인 따뜻한 한 끼가 세상을 배울 이유가 되었다.', '세월이 지나 맡은 일과 거래가 늘었다. 장부의 숫자는 또렷했지만 집에서 나눈 말은 짧아졌다. 어느 날 멀리 떠날 채비를 하다가 문턱에 앉은 가족에게 물었다. “돌아올 때 무엇을 가져다줄까?” 상대는 물건 이름 대신 “저녁 한 번 같이 먹자”라고 답했다.', '그는 짐을 다 싸고도 한참 움직이지 못했다. 다음 거래를 놓치는 일은 계산할 수 있었지만, 함께하지 못한 시간의 값은 장부 어디에도 적혀 있지 않았다. 그날의 출발을 하루 미루고 식탁에 앉았다. 그 뒤로 그의 장부에는 돈으로 적을 수 없는 약속도 남기 시작했다.'],
    관성: ['어린 시절의 그는 어른이 한 약속을 오래 기억했다. 약속이 지켜지는 집에서는 마음을 놓을 수 있었고, 말이 바뀌는 날에는 작은 일에도 긴장했다. 자라서는 자신만큼은 믿고 맡길 수 있는 사람이 되겠다고 다짐했다.', '책임 있는 자리에 오른 뒤 그는 규칙을 분명히 세웠다. 덕분에 혼란은 줄었지만, 사람들의 표정도 점점 굳어 갔다. 늦게 도착한 젊은이가 사정을 설명하려던 날, 그는 말을 끝까지 듣기 전에 정해진 벌부터 이야기했다. 젊은이는 고개를 숙였고 그날 이후 질문을 하지 않았다.', '며칠 뒤 그는 그 젊은이가 매일 먼 곳에서 가족을 돌보고 돌아온다는 사실을 알게 됐다. 규칙을 없애지는 않았다. 대신 사정을 먼저 듣고 함께 지킬 방법을 찾았다. 사람들은 다시 그에게 말을 걸기 시작했고, 그는 빈틈없는 사람보다 믿고 이야기할 수 있는 사람이 되는 법을 배웠다.'],
    인성: ['어릴 때 그는 시끄러운 자리보다 누군가의 이야기를 듣는 시간을 좋아했다. 남들이 놓친 말 한마디를 오래 기억했고, 이해되지 않는 것은 혼자 되짚었다. 누군가 빌려준 낡은 기록 한 권은 익숙한 마을 밖에도 다른 세상이 있다는 것을 알려 주었다.', '배움이 쌓이자 도움을 청하는 사람이 늘었다. 그는 답을 찾는 데 익숙했지만 막상 자기 선택 앞에서는 오래 망설였다. 어느 저녁, 늘 조언을 구하던 사람이 되물었다. “당신은 정말 무엇을 하고 싶은가요?” 그는 준비해 둔 말이 하나도 나오지 않았다.', '그날 밤 그는 모아 둔 기록을 펼쳤다가 다시 덮었다. 충분히 알게 된 뒤 움직이겠다는 생각 때문에 시작하지 못한 일이 너무 많았다. 다음 날 작은 모임을 열어 자신이 배운 것을 사람들과 나누었다. 완벽한 답은 없었지만, 질문이 오가자 오래 혼자 품었던 생각들이 비로소 살아 움직였다.']
  };
  S.deep_past = function (H) {
    var sd = H.sd, g = sd.groups, top = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; })[0], el = sd.dayMaster.el;
    var role = (ROLE[top] || ROLE.비겁)[el] || '이름 없는 사람', ts = sd.twelveStages || {}, setting = PAST_SCENE[el] || PAST_SCENE.토, plot = PAST_PLOT[top] || PAST_PLOT.비겁;
    var turn = /절|목욕/.test(ts.day || '') ? '익숙했던 자리에서 한 걸음 떠난 뒤에야, 그는 자신이 놓치고 있던 것을 돌아볼 수 있었다.' : /건록|제왕|관대/.test(ts.day || '') ? '가장 많은 일을 해내던 때에, 그는 오래 가는 삶에는 힘만큼 여유도 필요하다는 것을 배웠다.' : '분주한 날들이 조금씩 잦아들자, 그는 큰 성과보다 매일 반복할 수 있는 작은 선택을 남기기로 했다.';
    var ending = /장생|태|양/.test(ts.hour || '') ? '이야기의 마지막에 그는 새로 찾아온 이에게 자리를 내어 주었다. 처음 자신이 배우던 날처럼, 서툰 손을 재촉하지 않고 기다렸다.' : /건록|제왕|관대/.test(ts.hour || '') ? '마지막 장면에서 그는 여전히 자기 일을 하고 있었다. 다만 혼자 앞서 걷는 대신, 곁에 선 사람들의 걸음에 맞추어 속도를 늦추었다.' : '마지막 장면에서 그는 오래 쓰던 물건을 정리하다 잠시 손을 멈추었다. 끝내 해내지 못한 일도 있었지만, 돌아보면 혼자 남지 않으려 애쓴 날들이 더 선명했다.';
    var out = [scene(sec('dp-hero', cap('전생 · 이걸 드라마로 풀어 본다면') + '<p class="lead">' + esc(setting[0] + '에 살던 ' + role + '. 그 사람의 삶을 한 편의 드라마로 따라가 봅니다.') + '</p>' + fig(H, 'past:' + top + ':' + el + ':' + (sd.gender === 'M' ? 'M' : 'F'), 'past', role, '') + '<h3 class="dp-h">' + esc(role + '의 이야기') + '</h3><p class="dp-note">사주 요소를 모티프로 각색한 이야기입니다.</p>')),
      scene(sec('', cap('살아온 인생 · 처음 세상을 배우던 때') + '<p class="lead">' + esc(setting[1] + ', 한 아이가 집 밖으로 나섰다. ' + plot[0]) + '</p>')),
      scene(sec('', cap('살아온 인생 · 익숙한 삶에 생긴 균열') + '<p class="lead">' + esc(role + '으로 살아가던 시절의 이야기다. ' + plot[1]) + '</p>')),
      scene(sec('', cap('살아온 인생 · 다른 선택을 하던 날') + '<p class="lead">' + esc(plot[2]) + '</p><p class="lead">' + esc(turn) + '</p>')),
      scene(sec('', cap('결말과 이번 생에 남길 질문') + '<p class="lead">' + esc(ending) + '</p><p class="lead">' + esc('이 장면을 지금의 삶에 겹쳐 보면, ' + (HOMEWORK[top] || '균형을 찾는 일') + '이라는 질문이 남습니다. 닮은 장면이 있다면 이번에는 어떤 선택을 해 보고 싶은가요?') + '</p>'))];
    return { title: '전생의 모습', sub: role + '의 드라마', scenes: out };
  };
})(typeof window !== 'undefined' ? window : globalThis);
