// 기본 해석 모듈 라이브러리(시드). 관리자 저장본(/api/v2/modules)이 있으면 id 기준으로 덮어쓰거나 추가한다.
// 모듈 모양: { id, category, conditions, priority, headline, summary, detail, keywords, imageTags, actionTags, extra, enabled }
// 문장 속 {dayMasterEl} {yongEl} {el.인성} 같은 자리는 개인 사실로 치환된다(rules.tpl).
// 표현 원칙: "~하는 경향이 있습니다", "~할 수 있습니다". 건강·투자수익·사망·질병 등은 단정하지 않는다.
(function (root) {
  var MODS = [];
  function add(category, id, cond, pri, headline, summary, detail, o) {
    o = o || {};
    MODS.push({ id: id, category: category, conditions: cond || {}, priority: pri || 50, headline: headline, summary: summary, detail: detail || '',
      keywords: o.keywords || [], imageTags: o.imageTags || [], actionTags: o.actionTags || [], extra: o.extra || null, enabled: true });
  }
  var EL = ['목', '화', '토', '금', '수'], G = ['비겁', '식상', '재성', '관성', '인성'], ST = ['신강', '중화', '신약'];
  var SEASON = ['opportunity', 'expansion', 'harvest', 'accumulation', 'transition', 'defense'];

  /* ── 공통 폴백(조건 없음): 어떤 사주에서도 챕터가 비지 않게 한다 ───────────────── */
  add('identity', 'identity_fallback', {}, 1, '나만의 결을 가진 사람', '일간은 나를 뜻하는 글자로, 타고난 기질의 출발점입니다.', '같은 일간이라도 다른 글자들과 어울리며 저마다 다른 모습이 됩니다.', { imageTags: ['sunrise', 'road'] });
  add('elements', 'elements_fallback', {}, 1, '다섯 기운의 균형', '오행은 어느 하나가 좋고 나쁜 것이 아니라, 내 안에서 어떻게 어울리는지가 중요합니다.', '많은 기운은 장점이 되기도, 쏠림이 되기도 합니다.', { imageTags: ['balance'] });
  [['personality', '타고난 성향', '내 성향의 중심'], ['talent', '숨겨진 재능', '아직 쓰지 않은 힘'], ['shadow', '그림자', '알아두면 좋은 습관']].forEach(function (r) {
    add(r[0], r[0] + '_fallback', {}, 1, r[2], '사주의 구조에서 읽히는 경향을 바탕으로 한 설명입니다.', '정해진 운명이 아니라 활용할 수 있는 성향의 지도로 읽어 주세요.', {});
  });
  ['career', 'success', 'wealth', 'love', 'marriage', 'relationship', 'compatibility', 'family', 'daewoon', 'currentCycle', 'sewoon', 'monthly', 'remedy', 'actionPlan', 'pastLife'].forEach(function (c) {
    add(c, c + '_fallback', {}, 1, '이 장의 기본 안내', '이 부분은 계산된 사주 구조를 바탕으로 한 경향 설명입니다.', '', {});
  });

  /* ── ACT I ──────────────────────────────────────────────────────────────── */
  var T = {
    '목': { id: ['곧게 뻗어 자라는 나무의 기질', '시작하고 성장하려는 힘이 중심에 있는 일간입니다. 새로운 것을 향해 뻗어 나가려는 경향이 있습니다.'],
      pe: ['성장과 시작에서 힘을 얻는 사람', '정체되어 있으면 답답함을 느끼고, 배우고 시도할 때 생기가 도는 경향이 있습니다.'],
      ta: ['싹을 틔우고 키우는 재능', '사람이든 프로젝트든 가능성을 알아보고 키우는 데 재능이 있을 수 있습니다.'],
      sh: ['꺾이는 것에 예민할 수 있어요', '뜻대로 자라지 못한다고 느낄 때 조급해지거나 무리하는 경향이 있습니다.'], tags: ['wood', 'growth', 'forest'] },
    '화': { id: ['주변을 밝히는 불꽃의 기질', '표현하고 드러내며 분위기를 달구는 힘이 중심에 있는 일간입니다.'],
      pe: ['표현하면서 살아나는 사람', '감정과 열정이 비교적 분명하게 드러나며, 반응이 있는 곳에서 힘이 나는 경향이 있습니다.'],
      ta: ['사람의 마음을 움직이는 재능', '전달하고 표현하고 분위기를 만드는 데 재능이 있을 수 있습니다.'],
      sh: ['열기가 지나치면 금방 지칠 수 있어요', '열정이 앞서면 쉬는 타이밍을 놓치고 소진되는 경향이 있습니다.'], tags: ['fire', 'expansion', 'sunrise'] },
    '토': { id: ['모든 것을 품는 대지의 기질', '중심을 잡고 받쳐 주며 신뢰를 쌓는 힘이 중심에 있는 일간입니다.'],
      pe: ['중심을 잡아 주는 믿음직한 사람', '쉽게 휩쓸리지 않고 한 번 맡은 일은 끝까지 책임지려는 경향이 있습니다.'],
      ta: ['안정적으로 쌓고 조율하는 재능', '여러 사람과 일을 안정적으로 묶고 오래 가게 만드는 데 재능이 있을 수 있습니다.'],
      sh: ['변화 앞에서 느리게 움직일 수 있어요', '안정을 지키려다 새로운 시도를 미루는 경향이 있습니다.'], tags: ['earth', 'accumulation', 'mountain'] },
    '금': { id: ['단단하게 결을 세우는 쇠의 기질', '분명하게 판단하고 맺고 끊는 힘이 중심에 있는 일간입니다.'],
      pe: ['기준이 분명한 사람', '옳고 그름, 맺고 끊음이 비교적 분명하고 완성도를 중시하는 경향이 있습니다.'],
      ta: ['다듬고 완성하는 재능', '구조를 세우고 불필요한 것을 덜어 내 완성도를 높이는 데 재능이 있을 수 있습니다.'],
      sh: ['날이 서면 주변이 긴장할 수 있어요', '기준이 높은 만큼 스스로와 타인에게 엄격해지는 경향이 있습니다.'], tags: ['metal', 'defense', 'city'] },
    '수': { id: ['깊이 스며 흐르는 물의 기질', '생각이 깊고 유연하게 방향을 찾아가는 힘이 중심에 있는 일간입니다.'],
      pe: ['생각이 깊고 적응력이 있는 사람', '겉으로는 조용해도 속으로 많은 것을 헤아리며, 상황에 맞게 흐름을 바꾸는 경향이 있습니다.'],
      ta: ['본질을 읽고 연결하는 재능', '정보를 모으고 흐름을 읽어 길을 찾는 데 재능이 있을 수 있습니다.'],
      sh: ['생각이 많아 행동이 늦어질 수 있어요', '준비와 고민이 길어져 시작을 미루는 경향이 있습니다.'], tags: ['water', 'transition', 'ocean'] },
  };
  EL.forEach(function (e) {
    var t = T[e];
    add('identity', 'identity_el_' + e, { dayMasterEl: [e] }, 40, t.id[0], t.id[1], '나를 뜻하는 글자 {dayMasterStem}({dayMasterEl})의 기질을 바탕으로 한 설명입니다. 일주 전용 해석은 별도 콘텐츠로 보강할 수 있습니다.', { keywords: [e], imageTags: t.tags, actionTags: ['reflection'] });
    add('personality', 'personality_el_' + e, { dayMasterEl: [e] }, 40, t.pe[0], t.pe[1], '', { imageTags: t.tags });
    add('talent', 'talent_el_' + e, { dayMasterEl: [e] }, 40, t.ta[0], t.ta[1], '', { imageTags: t.tags, actionTags: ['output'] });
    add('shadow', 'shadow_el_' + e, { dayMasterEl: [e] }, 40, t.sh[0], t.sh[1], '알아두면 같은 상황에서도 덜 흔들릴 수 있습니다.', { imageTags: ['mist', 'night'], actionTags: ['recovery'] });
  });
  ST.forEach(function (s) {
    var txt = { '신강': ['내 힘이 단단한 편', '스스로 밀고 가는 힘이 큰 구조로, 주도하고 결정하는 데 강점이 있는 경향이 있습니다.'],
      '중화': ['힘의 균형이 고른 편', '내 힘과 환경의 영향이 비교적 고르게 나타나, 상황에 따라 유연하게 방향을 바꾸는 경향이 있습니다.'],
      '신약': ['환경과 곁의 영향을 많이 받는 편', '누구와 어떤 환경에 있느냐에 따라 힘이 크게 달라지는 구조로, 곁을 잘 고르는 것이 중요합니다.'] }[s];
    add('personality', 'personality_str_' + s, { strength: [s] }, 30, txt[0], txt[1], '', {});
  });
  // 오행 분포: 가장 강한 오행 / 부족한 오행
  EL.forEach(function (e) {
    add('elements', 'elements_dom_' + e, { dominantEl: [e] }, 30, e + ' 기운이 가장 두드러져요', '내 안에서 {dominantEl} 기운이 가장 큰 비중을 차지합니다. 장점이 되기도, 쏠림이 되기도 하는 기운입니다.', '가장 강한 기운은 평소의 습관과 말투에 자주 드러나는 경향이 있습니다.', { imageTags: T[e].tags });
    add('elements', 'elements_lack_' + e, { lackEl: [e] }, 60, e + ' 기운은 상대적으로 적어요', '{lackEl} 기운은 비중이 낮은 편입니다. 부족하다고 나쁜 것은 아니며, 의식적으로 채우면 균형에 도움이 될 수 있습니다.', '부족한 기운은 환경·활동·사람을 통해 보완하는 방법을 개운법 장에서 정리합니다.', { imageTags: T[e].tags, actionTags: ['balance'] });
  });
  // 십성군 기반 재능·그림자
  var GT = {
    '비겁': { ta: ['스스로 해내는 추진력', '자기 힘으로 밀어붙이고 경쟁 속에서 성장하는 재능이 있을 수 있습니다.'], sh: ['고집이 커질 수 있어요', '내 방식을 고수하다 협력의 기회를 놓치는 경향이 있습니다.'], tags: ['leadership', 'road'] },
    '식상': { ta: ['표현하고 만들어 내는 재능', '아이디어를 말·글·결과물로 꺼내는 데 재능이 있을 수 있습니다.'], sh: ['말과 표현이 앞설 수 있어요', '생각을 바로 드러내 오해가 생기거나 마무리가 흐려지는 경향이 있습니다.'], tags: ['creation', 'library'] },
    '재성': { ta: ['현실을 읽고 실속을 챙기는 재능', '기회와 자원을 현실적으로 보고 쓰임새를 만드는 재능이 있을 수 있습니다.'], sh: ['눈앞의 이익에 쏠릴 수 있어요', '현실적 계산이 앞서 장기적 관계나 가치를 놓치는 경향이 있습니다.'], tags: ['wealth', 'city'] },
    '관성': { ta: ['규율과 책임을 다루는 재능', '규칙과 역할 안에서 체계를 세우고 책임을 지는 데 재능이 있을 수 있습니다.'], sh: ['스스로를 몰아붙일 수 있어요', '책임감이 커 부담을 혼자 안고 가는 경향이 있습니다.'], tags: ['career', 'mountain'] },
    '인성': { ta: ['배우고 깊이 이해하는 재능', '자료를 소화하고 원리를 파악하며 도움을 받아 성장하는 재능이 있을 수 있습니다.'], sh: ['생각과 준비가 길어질 수 있어요', '배우는 데 머물러 실행이 늦어지거나 의존하는 경향이 있습니다.'], tags: ['study', 'library'] },
  };
  G.forEach(function (g) {
    add('talent', 'talent_grp_' + g, { dominantGroup: [g] }, 50, GT[g].ta[0], GT[g].ta[1], '십성 중 {dominantGroup} 비중이 가장 높게 나타납니다.', { imageTags: GT[g].tags, actionTags: ['output'] });
    add('shadow', 'shadow_grp_' + g, { dominantGroup: [g] }, 50, GT[g].sh[0], GT[g].sh[1], '', { imageTags: ['mist'], actionTags: ['recovery'] });
  });

  /* ── ACT II ─────────────────────────────────────────────────────────────── */
  // 직업: 십성군별 환경·역할·분야·주의. 실제 직업명은 이 콘텐츠 DB에서만 나온다(AI가 만들지 않음).
  var CR = {
    '비겁': { h: '스스로 주도하는 일에서 힘이 나요', s: '남의 지시보다 내 판단으로 움직일 수 있는 환경에서 성과가 나기 쉬운 구조입니다.',
      env: ['독립적인 업무', '내 이름이 걸린 프로젝트', '성과가 분명한 환경'], roles: ['주도자', '개척자', '1인 전문가'], fields: ['개인 사업', '프리랜서', '영업·세일즈', '스포츠·코칭'], caution: ['지나친 통제 환경', '역할이 모호한 협업'], style: '직접 부딪히며 성과를 만드는 방식' },
    '식상': { h: '만들고 표현하는 일에서 힘이 나요', s: '아이디어를 결과물로 꺼내는 일에서 성과가 나기 쉬운 구조입니다.',
      env: ['결과물이 남는 일', '프로젝트 기반 업무', '자율성이 있는 환경'], roles: ['기획', '창작', '강연·전달'], fields: ['콘텐츠·미디어', '디자인', '교육', 'IT·개발'], caution: ['반복적인 단순 업무', '표현이 막힌 경직된 조직'], style: '만들고 보여주며 인정받는 방식' },
    '재성': { h: '현실의 기회를 다루는 일에서 힘이 나요', s: '사람·자원·돈이 오가는 현장에서 감각이 살아나는 구조입니다.',
      env: ['성과가 수치로 보이는 일', '사람과 거래가 많은 현장', '변화가 빠른 시장'], roles: ['운영', '영업·제안', '자원 조율'], fields: ['유통·무역', '금융·자산 관련 업무', '서비스업', '마케팅'], caution: ['실속 없는 장기 준비만 하는 일', '평가 기준이 불분명한 환경'], style: '현실의 기회를 읽고 움직이는 방식' },
    '관성': { h: '체계와 책임이 있는 일에서 힘이 나요', s: '역할과 규칙이 분명한 조직에서 신뢰를 쌓으며 성장하기 쉬운 구조입니다.',
      env: ['역할과 책임이 분명한 조직', '단계적으로 성장하는 구조', '신뢰가 쌓이는 환경'], roles: ['관리', '전문직', '조직 운영'], fields: ['공공·행정', '법무·세무 관련 업무', '대기업·전문 조직', '품질·안전 관리'], caution: ['기준이 계속 바뀌는 환경', '책임만 크고 권한이 없는 자리'], style: '체계 안에서 신뢰를 쌓는 방식' },
    '인성': { h: '배우고 깊이 파고드는 일에서 힘이 나요', s: '지식과 전문성을 쌓아 인정받는 일에서 성과가 나기 쉬운 구조입니다.',
      env: ['배울 수 있는 환경', '깊이 몰입할 수 있는 시간', '전문성이 축적되는 일'], roles: ['연구·분석', '교육·멘토', '기록·정리'], fields: ['연구·학문', '교육', '출판·기록', '상담·돌봄'], caution: ['빠른 결정만 요구되는 환경', '배움 없는 단순 반복'], style: '전문성을 쌓아 신뢰를 얻는 방식' },
  };
  G.forEach(function (g) {
    var c = CR[g];
    add('career', 'career_grp_' + g, { dominantGroup: [g] }, 50, c.h, c.s, '십성 중 {dominantGroup} 비중이 가장 높은 구조를 바탕으로 한 경향입니다.',
      { imageTags: GT[g].tags.concat(['career']), actionTags: ['output'], extra: { env: c.env, roles: c.roles, fields: c.fields, caution: c.caution, style: c.style } });
  });
  var SU = {
    '신강': ['스스로 방향을 정할 때 성과가 나요', '내 힘이 단단한 구조라, 주도권이 있는 자리에서 성과가 나기 쉽습니다. 다만 혼자 끌고 가기보다 조력자를 두면 더 멀리 갑니다.', ['방향 정하기', '주도하기', '조력자 두기']],
    '중화': ['상황에 맞춰 방식을 바꿀 때 성과가 나요', '힘의 균형이 고른 구조라 환경에 맞게 유연하게 역할을 바꾸는 방식이 잘 맞는 경향이 있습니다.', ['상황 읽기', '역할 전환', '균형 유지']],
    '신약': ['좋은 곁과 환경을 만났을 때 성과가 나요', '환경과 사람의 영향을 많이 받는 구조라, 도움을 주는 사람·배움의 환경을 먼저 갖추는 방식이 잘 맞는 경향이 있습니다.', ['좋은 환경 고르기', '도움 요청하기', '꾸준히 쌓기']],
  };
  ST.forEach(function (s) {
    add('success', 'success_str_' + s, { strength: [s] }, 50, SU[s][0], SU[s][1], '', { imageTags: ['road', 'sunrise'], actionTags: ['execution'], extra: { steps: SU[s][2] } });
  });
  // 재물: 행동 성향 중심. 수익·재산 규모는 말하지 않는다.
  var WE = {
    '비겁': { earn: '직접 뛰고 부딪혀 얻는 방식', keep: '혼자 판단해 지키되 지출이 커지기 쉬움', spend: '경쟁·체면·사람에 쓰는 경향', invest: '직접 통제하는 일을 선호', reinvest: '내 일에 다시 넣는 경향', risk: '혼자 결정해 위험을 키우는 것' },
    '식상': { earn: '재능과 결과물을 팔아 얻는 방식', keep: '들어오는 만큼 쓰기 쉬워 구조가 필요함', spend: '경험·취미·표현에 쓰는 경향', invest: '아이디어와 새 시도에 관심', reinvest: '새 프로젝트에 다시 넣는 경향', risk: '수입이 들쭉날쭉할 때 지출 관리가 흐트러지는 것' },
    '재성': { earn: '기회를 읽고 거래하며 얻는 방식', keep: '현실 감각이 있어 관리에 강점', spend: '실속과 효율을 따지는 경향', invest: '눈에 보이는 수익 구조를 선호', reinvest: '자산을 굴리는 데 관심', risk: '눈앞의 이익에 쏠려 관계나 장기 계획을 놓치는 것' },
    '관성': { earn: '직책·신뢰·전문성으로 얻는 방식', keep: '안정적으로 모으는 경향', spend: '책임과 의무에 쓰는 경향', invest: '안전한 구조를 선호', reinvest: '자격·신뢰에 다시 넣는 경향', risk: '안정만 추구해 기회를 놓치는 것' },
    '인성': { earn: '지식·자격·도움으로 얻는 방식', keep: '무리하지 않고 지키는 경향', spend: '배움과 마음의 안정에 쓰는 경향', invest: '충분히 공부한 뒤 움직임', reinvest: '실력에 다시 넣는 경향', risk: '준비만 길어져 시기를 놓치는 것' },
  };
  G.forEach(function (g) {
    var w = WE[g];
    add('wealth', 'wealth_grp_' + g, { dominantGroup: [g] }, 50, w.earn, '재물을 대하는 행동 성향으로, 수익이나 재산 규모를 말하는 것이 아닙니다. 돈을 대하는 나의 방식은 "' + w.earn + '"에 가깝습니다.', '',
      { imageTags: ['wealth', 'city'], actionTags: ['organize'], extra: { earn: w.earn, keep: w.keep, spend: w.spend, invest: w.invest, reinvest: w.reinvest, risk: w.risk } });
  });
  // 연애 / 결혼 / 대인관계
  var LV = {
    '비겁': { h: '대등하고 자유로운 관계를 원해요', s: '서로 존중하는 대등한 관계에서 편안함을 느끼는 경향이 있습니다.', attract: '나와 비슷한 에너지·자기 길이 있는 사람', express: '직접적이고 솔직한 표현', conflict: '주도권과 자존심', need: '서로의 영역을 인정하는 여유' },
    '식상': { h: '마음을 표현하고 나누는 연애', s: '말·행동·선물 등으로 마음을 표현하며 반응을 주고받을 때 관계가 깊어지는 경향이 있습니다.', attract: '재미있고 표현이 통하는 사람', express: '다정한 말과 이벤트', conflict: '말이 앞서 생기는 오해', need: '표현을 받아 주는 상대' },
    '재성': { h: '현실적이고 적극적인 연애', s: '마음이 가면 구체적으로 챙기고 움직이는 경향이 있습니다.', attract: '현실적으로 든든하고 매력이 분명한 사람', express: '챙기고 행동으로 보여 주기', conflict: '조건과 현실 문제', need: '마음의 여유와 신뢰' },
    '관성': { h: '진지하고 책임감 있는 연애', s: '쉽게 마음을 열지는 않지만, 한 번 시작하면 진지하게 책임지려는 경향이 있습니다.', attract: '믿음직하고 예의 있는 사람', express: '꾸준함과 약속', conflict: '신중함이 거리감으로 보이는 것', need: '천천히 쌓는 신뢰' },
    '인성': { h: '마음의 안정과 이해를 구하는 연애', s: '말이 통하고 정서적으로 안정되는 관계에서 편안함을 느끼는 경향이 있습니다.', attract: '이해심 있고 배울 점이 있는 사람', express: '대화와 정서적 지지', conflict: '기대를 말하지 않아 쌓이는 서운함', need: '충분한 대화 시간' },
  };
  G.forEach(function (g) {
    var l = LV[g];
    add('love', 'love_grp_' + g, { dominantGroup: [g] }, 50, l.h, l.s, '', { imageTags: ['love', 'sunset'], actionTags: ['connection'], extra: { attract: l.attract, express: l.express, conflict: l.conflict, need: l.need } });
  });
  var MR = {
    '신강': ['서로의 주도권을 존중하는 결혼', '내 힘이 단단한 만큼 배우자와 역할을 나누고 의견을 조율하는 연습이 관계를 오래 가게 합니다.', '존중과 대화', '의견 충돌 때 양보 타이밍', '각자의 영역을 인정하는 방식'],
    '중화': ['균형 속에서 오래 가는 결혼', '상황에 맞춰 역할을 바꾸는 유연함이 장기 관계의 강점이 될 수 있습니다.', '균형과 협력', '애매한 역할 분담', '서로 맞춰 가는 방식'],
    '신약': ['서로 의지하며 쌓아 가는 결혼', '정서적 지지와 안정감을 주는 배우자와 함께할 때 힘이 커지는 경향이 있습니다. 의존이 한쪽으로 쏠리지 않게 균형을 잡아 보세요.', '정서적 안정과 지지', '기대를 말하지 않는 것', '함께 계획하고 쌓는 방식'],
  };
  ST.forEach(function (s) {
    var m = MR[s];
    add('marriage', 'marriage_str_' + s, { strength: [s] }, 50, m[0], m[1], '', { imageTags: ['marriage', 'sunset'], actionTags: ['connection'], extra: { expect: m[2], conflict: m[3], fit: m[4], longterm: '장기 관계는 속도보다 신뢰가 쌓이는 방식이 중요합니다.' } });
  });
  var RL = {
    '신강': ['앞장서는 사람, 듣는 연습이 힘이 돼요', '주도적으로 관계를 이끄는 경향이 있어, 의견을 먼저 묻는 습관이 협업 만족도를 높일 수 있습니다.', '주도하고 이끄는 방식', '역할을 나누고 맡기기', '신뢰하는 소수와 깊게', '필요할 때 선을 긋기', '결론부터 말하지 않고 질문하기'],
    '중화': ['상황에 맞춰 거리를 조절하는 사람', '사람과 장면에 따라 유연하게 거리를 조절하는 경향이 있습니다.', '상황에 맞춰 조율하는 방식', '조율자 역할', '필요에 따라 가깝게', '넓은 인맥을 가볍게 유지', '감정이 쌓이기 전에 가볍게 말하기'],
    '신약': ['좋은 사람 곁에서 힘이 나는 사람', '곁에 있는 사람의 영향을 크게 받는 경향이 있어, 관계를 고르는 것이 곧 나를 지키는 일이 됩니다.', '상대에게 맞춰 주는 방식', '든든한 파트너와 함께', '믿을 수 있는 사람과 천천히', '에너지를 빼앗는 관계와 거리 두기', '불편함을 혼자 삼키지 않고 말하기'],
  };
  ST.forEach(function (s) {
    var r = RL[s];
    add('relationship', 'relationship_str_' + s, { strength: [s] }, 50, r[0], r[1], '', { imageTags: ['connection', 'city'], actionTags: ['connection'], extra: { style: r[2], collab: r[3], close: r[4], social: r[5], conflict: r[6] } });
  });
  // 궁합(관계 유형): 십성군 기운의 오행으로 "어떤 기운의 사람"인지 안내. 실제 특정 인물 궁합은 별도 기능.
  [['comfort', '나를 편안하게 만드는 사람', '인성', '{el.인성} 기운이 느껴지는, 이해심 있고 안정감을 주는 사람과 함께 있을 때 힘이 풀리는 경향이 있습니다.'],
   ['grow', '나를 성장시키는 사람', '관성', '{el.관성} 기운이 느껴지는, 기준이 분명하고 자극을 주는 사람이 나를 한 단계 끌어올릴 수 있습니다.'],
   ['attract', '강하게 끌리는 사람', '재성', '{el.재성} 기운이 느껴지는, 현실감 있고 매력이 분명한 사람에게 마음이 움직이기 쉽습니다.'],
   ['clash', '충돌하기 쉬운 사람', '비겁', '{el.비겁} 기운이 강하게 느껴지는, 나와 주도권이 겹치는 사람과는 부딪히기 쉽습니다. 나쁜 관계가 아니라 조율이 필요한 관계입니다.'],
   ['work', '함께 일하기 좋은 사람', '식상', '{el.식상} 기운이 느껴지는, 아이디어와 실행력을 나눌 수 있는 사람과 협업이 잘 맞는 경향이 있습니다.']].forEach(function (r) {
    add('compatibility', 'compat_' + r[0], {}, 50, r[1], r[3], '이 챕터는 사람 한 명의 사주가 아니라 "관계 유형"으로 보는 안내입니다.', { imageTags: ['connection'], actionTags: ['connection'], extra: { type: r[0], group: r[2] } });
  });
  var FM = {
    '비겁': '형제·동료처럼 대등한 관계가 삶의 큰 자리를 차지하는 경향이 있어요.', '식상': '가족 안에서도 표현하고 돌보는 역할을 맡기 쉬운 경향이 있어요.',
    '재성': '가족을 현실적으로 챙기고 살림·생계를 신경 쓰는 경향이 있어요.', '관성': '책임과 기대가 뿌리가 된 가정에서 자랐을 수 있고, 가족에게도 책임을 다하려는 경향이 있어요.',
    '인성': '보살핌과 배움을 중요하게 여기는 가정의 영향을 받은 경향이 있어요.',
  };
  G.forEach(function (g) {
    add('family', 'family_grp_' + g, { dominantGroup: [g] }, 40, '가족과 뿌리에서 받은 영향', FM[g], '가족 이야기는 정해진 사실이 아니라 사주 구조에서 읽히는 경향입니다.', { imageTags: ['family', 'mountain'] });
  });

  /* ── ACT III: 전생(상징 스토리) ─────────────────────────────────────────── */
  // 사주 구조 → archetype 후보 → 우선순위 → 스토리 템플릿. 사실 판정이 아니라 상징적 콘텐츠이다.
  var AR = [
    ['warrior', '무사', { dominantGroup: ['관성'] }, 50, '규율을 지키며 길을 지켜 낸 사람', '당신은 지켜야 할 것이 분명했던 시대의 무사였을지도 모릅니다. 책임과 원칙으로 길을 열고, 말보다 행동으로 신뢰를 쌓은 이야기입니다.'],
    ['scholar', '학자', { dominantGroup: ['인성'] }, 50, '조용한 서재에서 이치를 파던 사람', '등불 아래서 오래 읽고 오래 생각하던 학자의 이야기입니다. 아는 것을 나누며 누군가의 길잡이가 되었을지도 모릅니다.'],
    ['merchant', '상인', { dominantGroup: ['재성'] }, 50, '길목에서 기회를 알아보던 사람', '장터와 길목을 오가며 사람과 물건의 흐름을 읽던 상인의 이야기입니다. 때를 알아보는 눈으로 이어 준 사람이었을지도 모릅니다.'],
    ['artist', '예술가', { dominantGroup: ['식상'] }, 50, '마음을 형태로 빚어내던 사람', '말로 다 못한 마음을 그림·노래·글로 남기던 예술가의 이야기입니다. 누군가는 그 작품에서 위로를 얻었을지도 모릅니다.'],
    ['leader', '지도자', { dominantGroup: ['비겁'], strength: ['신강'] }, 60, '앞장서서 사람들을 이끌던 사람', '사람들의 앞에 서서 방향을 정하던 지도자의 이야기입니다. 무거운 결정을 내리면서도 곁의 사람을 챙겼을지도 모릅니다.'],
    ['traveler', '여행자', { star: ['역마살'] }, 55, '머물지 않고 길을 건너던 사람', '한곳에 오래 머물기보다 길 위에서 배우던 여행자의 이야기입니다. 먼 곳의 소식과 지혜를 이어 주었을지도 모릅니다.'],
    ['healer', '치유자', { dayMasterEl: ['목', '수'], dominantGroup: ['인성'] }, 65, '약초와 말로 사람을 돌보던 사람', '지친 사람을 돌보고 마음을 어루만지던 치유자의 이야기입니다. 곁에 있는 것만으로 힘이 되던 사람이었을지도 모릅니다.'],
    ['craftsman', '장인', { dayMasterEl: ['금', '토'], dominantGroup: ['식상'] }, 65, '손끝으로 오래 가는 것을 만들던 사람', '한 가지를 오래 갈고닦아 쓰임이 오래 가는 것을 만들던 장인의 이야기입니다.'],
    ['recorder', '기록관', { dayMasterEl: ['수'], dominantGroup: ['인성'] }, 70, '시대의 이야기를 남기던 사람', '일어난 일을 놓치지 않고 적어 두던 기록관의 이야기입니다. 당신이 남긴 한 줄이 후대의 길잡이가 되었을지도 모릅니다.'],
    ['explorer', '탐험가', { dayMasterEl: ['화'], dominantGroup: ['비겁'] }, 65, '미지의 땅으로 먼저 걸어가던 사람', '지도에 없는 땅으로 먼저 걸어가던 탐험가의 이야기입니다. 두려움보다 궁금함이 앞섰던 사람이었을지도 모릅니다.'],
  ];
  AR.forEach(function (a) {
    add('pastLife', 'pastlife_' + a[0], a[2], a[3], a[4], a[5], '사주 요소({dayMasterEl} 일간, {dominantGroup} 중심)를 바탕으로 구성한 상징적 스토리입니다. 실제 전생을 판정하는 것이 아닙니다.',
      { keywords: [a[1]], imageTags: ['night', 'road', 'mist'], extra: { archetype: a[0], archetypeName: a[1] } });
  });

  // 십성군 조건에 안 맞는 사주도 전생 챕터가 비지 않게 일간 오행별 기본 이야기(낮은 우선순위)
  [['목', '정원사', '약초를 가꾸던 정원사', '봄마다 씨를 뿌리고 작은 숲을 키워 내던 정원사의 이야기입니다. 기다림이 열매가 된다는 것을 알던 사람이었을지도 모릅니다.'],
   ['화', '이야기꾼', '등불 아래 이야기를 들려주던 사람', '사람들이 모이는 저녁마다 등불을 밝히고 이야기를 들려주던 이야기꾼의 이야기입니다. 그 온기가 누군가의 하루를 버티게 했을지도 모릅니다.'],
   ['토', '촌장', '마을의 중심을 지키던 사람', '사람과 땅을 묵묵히 돌보며 마을의 중심을 지키던 촌장의 이야기입니다. 말보다 믿음으로 사람들을 모은 사람이었을지도 모릅니다.'],
   ['금', '대장장이', '칼날을 벼리던 대장장이', '불과 쇠 앞에서 오래 한 가지를 다듬던 대장장이의 이야기입니다. 군더더기 없이 쓸모 있는 것을 만들던 사람이었을지도 모릅니다.'],
   ['수', '나루지기', '강을 따라 사람을 건네주던 사람', '강가에서 오가는 사람들을 건네주며 소식을 모으던 나루지기의 이야기입니다. 흐름을 읽는 눈으로 길을 알려 주던 사람이었을지도 모릅니다.']].forEach(function (a) {
    add('pastLife', 'pastlife_el_' + a[0], { dayMasterEl: [a[0]] }, 20, a[2], a[3], '사주 요소({dayMasterEl} 일간)를 바탕으로 구성한 상징적 스토리입니다. 실제 전생을 판정하는 것이 아닙니다.', { keywords: [a[1]], imageTags: ['night', 'road', 'mist'], extra: { archetype: 'el_' + a[0], archetypeName: a[1] } });
  });

  /* ── 운의 흐름: 계절별(6) ────────────────────────────────────────────────── */
  var SE = {
    opportunity: { n: '기회기', h: '새로운 연결과 제안이 열리는 시기', s: '외부의 제안·만남·노출이 늘어날 수 있는 흐름입니다.', theme: ['공개', '제안', '연결'], opp: '새로운 사람과 제안, 드러낼 수 있는 기회', cau: '과도한 약속과 속도', rec: '결과물을 밖으로 보여 주기', dos: ['미팅', '제안', '공개'], cs: ['과도한 약속'], tags: ['sunrise', 'road', 'opportunity'] },
    expansion: { n: '확장기', h: '하던 일을 넓히기 좋은 시기', s: '이미 해 오던 활동과 역할을 넓히는 흐름입니다.', theme: ['확대', '실행', '네트워크'], opp: '기존 일의 규모·범위를 키울 수 있는 여지', cau: '범위를 넓히다 기본기를 놓치는 것', rec: '검증된 것을 한 단계 키우기', dos: ['기존 성과 키우기', '협업 확대'], cs: ['동시에 너무 많이 벌이기'], tags: ['forest', 'expansion', 'city'] },
    harvest: { n: '수확기', h: '쌓아 온 것을 거두고 정리하는 시기', s: '결과를 회수하고 마무리하기 좋은 흐름입니다.', theme: ['결실', '정리', '회수'], opp: '그동안의 노력이 결과로 보이는 시점', cau: '거둔 뒤 바로 다 쓰는 것', rec: '성과 정리와 일부 재투자', dos: ['마무리', '성과 정리', '감사 인사'], cs: ['성급한 새 판 벌이기'], tags: ['sunset', 'harvest', 'river'] },
    accumulation: { n: '축적기', h: '실력과 기반을 쌓는 시기', s: '눈에 띄는 결과보다 기반과 실력이 쌓이는 흐름입니다.', theme: ['배움', '기반', '깊이'], opp: '전문성과 기반을 쌓을 시간', cau: '조급함과 비교', rec: '배우고 꾸준히 반복하기', dos: ['공부', '기초 다지기', '루틴 만들기'], cs: ['결과를 서두르기'], tags: ['library', 'accumulation', 'mountain'] },
    transition: { n: '전환기', h: '방향을 바꾸고 다시 짜는 시기', s: '변화와 선택이 함께 오는 흐름입니다.', theme: ['정리', '선택', '재구성'], opp: '방향을 새로 정할 수 있는 계기', cau: '충동적인 큰 결정', rec: '정리 후 작은 실험부터', dos: ['정리', '선택', '작은 실험'], cs: ['무리한 확장'], tags: ['mist', 'transition', 'road'] },
    defense: { n: '방어기', h: '지키고 정비하는 시기', s: '무리한 확장보다 지키고 다듬는 쪽이 유리한 흐름입니다.', theme: ['점검', '지킴', '회복'], opp: '기반을 점검하고 회복할 여유', cau: '무리한 지출·확장·약속', rec: '리듬을 지키고 쉬어 가기', dos: ['점검', '휴식', '루틴 지키기'], cs: ['큰 지출', '과로'], tags: ['rain', 'recovery', 'night'] },
  };
  SEASON.forEach(function (k) {
    var s = SE[k];
    add('daewoon', 'daewoon_' + k, { daewoonSeason: [k] }, 50, s.n, s.h + ' — ' + s.s, '', { imageTags: s.tags, actionTags: [k], extra: { season: k, name: s.n, theme: s.theme, opportunity: s.opp, caution: s.cau, recommend: s.rec } });
    add('currentCycle', 'current_' + k, { daewoonSeason: [k] }, 50, s.h, s.s, '지금 대운의 계절은 "' + s.n + '"입니다. 계산된 흐름이 {dayMasterEl} 일간인 나에게 이렇게 작용하는 경향이 있습니다.', { imageTags: s.tags, actionTags: [k], extra: { season: k, name: s.n, theme: s.theme, opportunity: s.opp, caution: s.cau, recommend: s.rec } });
    add('sewoon', 'sewoon_' + k, { seunSeason: [k] }, 50, '올해는 ' + s.n, s.h + '. ' + s.s, '', { imageTags: s.tags, actionTags: [k], extra: { season: k, name: s.n, keywords: s.theme, opportunity: s.opp, caution: s.cau, recommend: s.rec,
      areas: { work: '업무에서는 ' + s.rec + '에 무게를 두면 좋습니다.', money: '재물은 행동 성향 면에서 "' + s.cau + '"을(를) 조심하세요.', relationship: '관계에서는 ' + s.theme[s.theme.length - 1] + '에 신경 쓰면 좋습니다.', life: '생활 리듬은 무리하지 않고 일정한 루틴을 지키는 정도의 일반적인 웰니스 수준에서 살피세요.' } } });
    add('monthly', 'monthly_' + k, { monthSeason: [k] }, 50, s.n, s.h, '', { imageTags: s.tags, actionTags: [k], extra: { season: k, name: s.n, state: s.s, keywords: s.theme, dos: s.dos, cautions: s.cs } });
  });

  /* ── 최종 요약(Action Plan 챕터의 틀) ───────────────────────────────────── */
  SEASON.forEach(function (k) {
    add('actionPlan', 'plan_' + k, { daewoonSeason: [k], seunSeason: [k] }, 70, '지금의 전략: ' + SE[k].rec, SE[k].s, '', { actionTags: [k] });
    add('actionPlan', 'plan_now_' + k, { seunSeason: [k] }, 40, '지금의 전략: ' + SE[k].rec, SE[k].s, '', { actionTags: [k] });
  });
  SEASON.forEach(function (k) {
    add('remedy', 'remedy_intro_' + k, { seunSeason: [k] }, 40, '지금의 개운 방향: ' + SE[k].rec, '개운법은 원국·신강약·통근·오행·십성·용신 계산에 현재 대운·세운·월운 흐름을 겹쳐서 지금 필요한 행동 방향을 고릅니다.', '', { actionTags: [k] });
  });

  // 상품(프로젝트)별 개운 소개: 같은 사주라도 상품 주제에 맞춰 개운법 장의 첫 문장이 달라진다
  [['love', '사랑을 쓰는 개운법', '관계에서 지금 필요한 행동을 계산 결과와 현재의 흐름에 맞춰 골랐습니다. 마음을 표현하고, 듣고, 거리를 조절하는 일에 초점을 둡니다.'],
   ['wealth', '재물을 다루는 개운법', '돈을 대하는 나의 행동 성향과 지금의 흐름에 맞춰 습관과 환경을 골랐습니다. 수익을 예측하는 것이 아니라 기록·점검·재투자 같은 행동에 초점을 둡니다.'],
   ['newyear', '올해를 쓰는 개운법', '올해의 흐름과 달마다의 계절에 맞춰 이번 해에 어떻게 움직일지 골랐습니다. 목표를 줄이고 매달 점검하는 설계에 초점을 둡니다.']].forEach(function (p) {
    add('remedy', 'remedy_intro_proj_' + p[0], { project: [p[0]] }, 95, p[1], p[2], '', { actionTags: ['organize'] });
  });

  root.ReportV2 = root.ReportV2 || {};
  root.ReportV2.Content = { version: '2026.10.1', modules: MODS, SEASONS: SE };
})(typeof window !== 'undefined' ? window : globalThis);
