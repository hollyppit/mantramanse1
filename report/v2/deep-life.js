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
  S.deep_children = function (H) {
    var p = childProfile(H), out = [], note = '자식운은 일간과 월령, 신강약, 원국 전체의 자녀성과 합충을 함께 검토하고, 시주를 자녀궁으로 참고해 관계의 과제를 살피는 풀이입니다. 아이의 수·성별·건강이나 출산 시기를 뜻하지 않습니다.';
    if (!p.known) return { title: '자식운 · 자녀와 맺는 관계', sub: '시간 미상 · 시주 해석 보류', scenes: [scene(sec('', cap('시주를 알 때 더 구체적으로 읽을 수 있습니다') + '<p class="lead">태어난 시간을 몰라 자녀궁인 시주와 시지의 지장간을 확인할 수 없습니다. 다른 기둥으로 시주를 대신 만들지 않습니다.</p><p class="dp-note">' + note + '</p>')), scene(sec('', cap('지금 관계에서 확인할 것') + '<p class="lead">자녀를 돌보는 관계를 맡고 있다면, 내가 정할 생활 기준과 아이에게 맡길 선택을 먼저 구분합니다. 출생 시간을 확인하면 돌봄의 강점과 반복되는 부담을 시주에 맞춰 다시 살펴볼 수 있습니다.</p>'))] };
    var st = p.style, sd = H.sd;
    out.push(scene(sec('', cap('원국 전체와 자녀궁을 함께 봅니다') + '<p class="lead">일간 ' + esc(sd.dayMaster.stem) + esc(sd.dayMaster.el) + '과 월주 ' + esc(sd.pillars.month.ko) + ', ' + esc(sd.strength.band) + '의 구조에서 자녀성인 ' + esc(p.star) + '의 비중(' + esc(String(Math.round(sd.groups[p.star] || 0))) + '%)과 배치를 함께 살핍니다. 이 비중은 자녀 수나 관계의 좋고 나쁨을 뜻하지 않습니다. 시주에서 드러나는 돌봄 방식이 원국 전체에서 얼마나 뒷받침되거나 조정되는지 대조하는 근거입니다.</p>' + (sd.usefulElements ? '<p class="lead">용신으로 읽힌 기운은 ' + esc(sd.usefulElements.yong) + (sd.usefulElements.hee ? '이며, 희신은 ' + esc(sd.usefulElements.hee) : '') + '입니다. 원국 전체의 균형을 보완하는 방향으로 참고합니다. 부족한 오행과 같게 취급하지 않으며, 시주의 한 십성만으로 보완책을 정하지 않습니다.</p>' : ''))));
    out.push(scene(sec('dp-hero', cap('자식운 · 자녀와 맺는 관계') + '<p class="lead">결혼이 두 사람이 함께 생활을 만드는 이야기라면, 자식운은 다음 세대와 어떤 관계를 맺을지에 관한 이야기입니다. ' + note + '</p>' + fig(H, p.slot, 'children', st[0], '') + '<h3 class="dp-h">' + esc(st[0]) + '</h3><div class="dp-tags">' + [p.hour + ' 시주', '시간 ' + p.stemTG, '시지 본기 ' + p.branchTG].map(chip).join('') + '</div>')));
    out.push(out.shift()); // 도입 뒤에 원국의 전체 맥락을 배치한다.
    out.push(scene(sec('', cap('시주의 겉과 속을 함께 읽으면') + '<p class="lead">시간의 ' + esc(p.stemTG) + '은 돌봄에서 겉으로 세우는 태도를, 시지 본기의 ' + esc(p.branchTG) + '은 일상에서 반복해서 쓰는 방식을 살피는 근거로 읽습니다.' + (p.stemTG === p.branchTG ? ' 같은 십성이 겹쳐 이 방식이 일관되게 이어지는 장면에 주목합니다.' : ' 두 십성이 다르므로 겉으로 정한 기준과 일상에서 반응하는 방식이 어떻게 달라지는지 함께 살핍니다.') + '</p><p class="lead">' + esc('시간 ' + p.stemTG + '의 보완: ' + (CHILD_TG[p.stemTG] || st)[3]) + '</p><p class="dp-note">시지 지장간: ' + esc(p.hidden.map(function (h) { return h.stem + '(' + h.tg + '·' + h.label + ')'; }).join(' · ') || '확인되지 않음') + '. 지장간은 시지 안에 함께 들어 있는 관계 역할을 보여 줍니다.</p>')));
    out.push(scene(sec('', cap('살릴 장점과 반복될 수 있는 부담') + '<div class="dp-pc"><div class="dp-pro"><h4>살릴 장점</h4><p class="lead">' + esc(st[1]) + '</p></div><div class="dp-con"><h4>경계할 습관</h4><p class="lead">' + esc(st[2]) + '</p></div></div>')));
    out.push(scene(sec('', cap('자녀성과 자녀궁을 구분해서 읽습니다') + '<p class="lead">전통 육친론에서는 ' + (H.sd.gender === 'F' ? '여성의 식상(식신·상관)' : '남성의 관성(정관·편관)') + '을 자녀성으로 참고합니다. 시주에 이 기운이 ' + (p.visible ? '드러나거나 지장간에 들어 있어, 자녀성과 일상의 돌봄 방식이 만나는 장면을 살필 수 있습니다.' : '뚜렷하게 확인되지 않아도 자녀가 없다는 뜻이 아닙니다. 시주의 실제 십성으로 관계 방식을 먼저 읽습니다.') + '</p><p class="lead">' + (p.relations.length ? '시주가 다른 기둥과 맺는 관계는 ' + esc(p.relations.map(function (x) { return x.name + ' (' + (x.members || []).map(function (k) { return { year: '년주', month: '월주', day: '일주', hour: '시주' }[k] || k; }).join('·') + ')'; }).join(' · ')) + '입니다. 합은 역할이 묶이는 조건을, 충·형 등은 기준과 생활을 조정해야 하는 조건을 살피는 근거로 씁니다. 관계의 길흉을 하나의 글자로 정하지 않습니다.' : '계산된 원국에서 시주가 직접 참여하는 합충 관계는 확인되지 않습니다. 이것만으로 자녀와의 관계가 좋다고 단정하지 않고, 실제 대화와 역할 분담을 함께 확인합니다.') + '</p>' + (p.stage ? '<p class="dp-note">시지의 12운성은 ' + esc(p.stage) + '입니다. 일간과 시지의 기운 관계를 나타내는 보조 값이며 아이의 성장 수준이나 건강 등급으로 읽지 않습니다.</p>' : ''))));
    out.push(scene(sec('', cap('명리적 보완을 생활로 옮기면') + '<p class="lead">' + esc(st[3]) + ' ' + (H.sd.strength.band === '신약' ? '돌봄의 책임을 혼자 늘리기보다 함께 맡을 사람과 지원 시간을 확보하는 쪽으로 보완합니다.' : H.sd.strength.band === '신강' ? '내 기준을 지키는 힘을 살리되, 아이가 스스로 결정할 수 있는 영역까지 내 방식으로 채우지 않는 쪽으로 보완합니다.' : '생활 기준을 유지하면서도 아이의 상황이 바뀔 때 조정할 여지를 남기는 쪽으로 보완합니다.') + '</p><p class="lead">이번 주에는 함께 지킬 약속 하나와 아이가 선택할 일 하나를 정해 봅니다. 대화 뒤 아이가 자기 생각을 더 말하는지, 돌봄의 부담이 한쪽으로 쏠리지 않는지 확인합니다.</p>')));
    return { title: '자식운 · 자녀와 맺는 관계', sub: '시주 · 자녀성 · 명리적 보완', scenes: out };
  };
  R.ChildReading = { profile: childProfile, TG: CHILD_TG, GROUP: CHILD_GROUP };

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
  var END = { 장생: '제자와 자식들이 뒤를 이어 열린 결말로 마무리했습니다.', 목욕: '화려하게 살다 소문과 감정에 휩쓸린 채 조용히 물러났습니다.', 관대: '이름을 얻고 인정받으며 당당하게 생을 마감했습니다.', 건록: '스스로 일군 터전에서 자립한 채 평온하게 마쳤습니다.', 제왕: '정점에서 크게 이름을 남겼으나 곁에 사람이 줄어든 말년이었습니다.',
    쇠: '욕심을 내려놓고 고요히 물러난 말년이었습니다.', 병: '병약해진 몸으로 지난 일을 오래 되새기며 보냈습니다.', 사: '모든 것을 정리하고 한곳에 머무는 쓸쓸하지만 정돈된 마무리였습니다.', 묘: '모은 것을 숨겨 두고 홀로 조용히 세상을 떠났습니다.', 절: '중간에 모든 것이 끊겨 미련을 남긴 채 마쳤습니다.', 태: '못다 한 뜻을 다음 생으로 넘기며 생을 닫았습니다.', 양: '돌봄 속에 자라나는 후학들 곁에서 편안히 마쳤습니다.' };
  var HOMEWORK = { 비겁: '혼자 버티는 것과 함께 가는 것의 균형', 식상: '재능을 제대로 표현하고 말을 다듬는 일', 재성: '돈과 현실을 다루면서 욕심을 다스리는 일', 관성: '책임과 규칙 속에서도 나를 잃지 않는 일', 인성: '배운 것을 행동으로 옮기는 일' };
  S.deep_past = function (H) {
    var sd = H.sd, g = sd.groups, top = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; })[0], el = sd.dayMaster.el, role = (ROLE[top] || ROLE.비겁)[el] || '이름 없는 사람', ts = sd.twelveStages || {}, s12 = sd.sinsal12 || {}, st = sd.dayMaster.stem, male = sd.gender === 'M';
    var phase = function (k, label) { var n = ts[k]; if (!n) return ''; var U = { 장생: '배우며 뻗어 나가던', 목욕: '감정이 풍부하고 이리저리 흔들리던', 관대: '당당히 세상에 나서던', 건록: '제 손으로 먹고살기 시작한', 제왕: '가장 왕성하게 활약한', 쇠: '차분히 물러서던', 병: '몸과 마음이 약해져 가던', 사: '정리하고 멈추던', 묘: '모은 것을 갈무리하던', 절: '모든 것이 끊기고 새로 시작하던', 태: '다음을 품고 있던', 양: '보살핌을 받으며 준비하던' }[n]; return '<li><b>' + label + '</b> — ' + esc(n) + ' 단계. ' + esc(U) + ' 시기였습니다' + (s12[k] ? ' (' + esc(s12[k]) + ')' : '') + '.</li>'; };
    var out = [scene(sec('dp-hero', cap('전생의 모습 · 상징적 이야기') + '<p class="lead">사주의 네 자리와 12운성을 <b>한 사람의 일생</b>으로 풀어 쓴 상징적 이야기입니다. 사주만으로 전생을 알 수는 없으니, "나는 이런 결의 사람이었을 수도 있겠다" 정도로 재미있게 읽어 주세요.</p>' +
      fig(H, 'past:' + top + ':' + el + ':' + (male ? 'M' : 'F'), 'past', role, '') + '<h3 class="dp-h">' + esc(nz(H) + ' 전생에 ' + role + '이었을지도 모릅니다') + '</h3>')),
      scene(sec('', cap('살아온 인생') + '<p class="lead">가장 강하게 쓰인 기운이 <b>' + esc(top) + '</b>이고 일간이 <b>' + esc(st + '(' + el + ')') + '</b>이라, ' + esc(role) + '의 삶이 이야기로 그려집니다.</p><ul class="dp-ul">' + phase('year', '어린 시절(년주)') + phase('month', '청장년기(월주)') + phase('day', '중년(일주)') + phase('hour', '말년(시주)') + '</ul>')),
      scene(sec('', cap('결말과 이번 생의 숙제') + '<p class="lead">' + esc(END[ts.hour] || END.묘) + '</p><div class="dp-pc"><div class="dp-pro"><h4>그때 이어진 장점</h4><ul><li><span>' + esc((ROLE[top] ? role : '') + '의 감각과 책임감이 지금도 몸에 남아 있습니다') + '</span></li></ul></div><div class="dp-con"><h4>그때 남은 숙제</h4><ul><li><span>' + esc('이번 생에서는 ' + (HOMEWORK[top] || '균형을 찾는 일') + '이 같은 모양으로 다시 찾아옵니다') + '</span></li></ul></div></div><p class="dp-note">사주 요소를 바탕으로 구성한 상징적 스토리 콘텐츠입니다. 사실을 단정하지 않습니다.</p>'))];
    return { title: '전생의 모습', sub: role, scenes: out };
  };
})(typeof window !== 'undefined' ? window : globalThis);
