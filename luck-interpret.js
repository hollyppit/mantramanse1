/* 운세 환경 해석 모듈 — 엔진(engine.js)의 계산 결과만 읽어 "어떤 환경이 부각되는가"를 조건부 문장으로 만든다.
   · 점수·가중치를 새로 만들지 않는다. 원국/운 간지, 십성, 오행, 합충, 용신 역할, 원국 십성 비율만 근거로 쓴다.
   · 모든 문장은 사전 문구(PHRASES)에서 조건을 평가해 고르며, 선택한 규칙 ID·문구 ID·배제된 규칙을 trace로 남긴다.
   · 브라우저·Node 공용. 사용: MantraLuckInterpret.build(Manse, ch, item, level, ctx)
     ctx = { daeun, seun, wolun, prev }  (각각 M.luckItem 형태. 해당 기간의 상위 운과 직전 기간) */
(function (G) {
  'use strict';
  var VERSION = 'luck-env-20261102-1', PHRASE_VERSION = 1, REV = 0;   // REV: 게시 문구가 바뀔 때마다 올라 캐시를 무효화한다

  // ───────────── 사전 문구: 십성별 ─────────────
  // area: work 직업·사회 / wealth 재물·경제 / rel 인간관계·인연 / move 생활·이동 / learn 학습·재정비
  var TGD = {
    비견: { grp: 0, core: '나와 같은 기운(비견)이 들어와 내 기준과 독립성이 중요해지는', mean: '자기 주관, 독립, 같은 처지의 동료와의 관계',
      scene: { work: '내 방식대로 일하고 싶은 마음이 커지고, 독립이나 부업을 따져 보게 될 수 있습니다.', wealth: '수입과 지출을 내가 직접 정하고 관리하려는 흐름이 강해질 수 있습니다.', rel: '비슷한 입장의 동료·친구와의 관계가 가까워지거나, 서로 양보하지 않는 상황이 생길 수 있습니다.', move: '혼자 쓰는 공간이나 내 생활 리듬을 새로 정비하게 될 수 있습니다.', learn: '남의 기준보다 내 기준으로 공부 방향을 정하는 일이 중요해질 수 있습니다.' },
      good: '내 기준이 약해 휘둘리던 구조라면 주관을 세우는 데 도움이 되는 쪽으로 읽습니다.', bad: '이미 내 고집이 강한 구조라면 협업에서 양보가 부족해지기 쉽습니다.', act: '결정은 내가 하되, 같이 하는 사람에게 이유를 한 번 설명하는 습관을 두세요.' },
    겁재: { grp: 0, core: '경쟁과 나눔의 기운(겁재)이 들어와 사람 사이의 몫이 부각되는', mean: '경쟁, 분배, 협업, 주변 사람과의 자원 나눔',
      scene: { work: '동료와 성과를 나누거나 경쟁하는 상황, 팀 단위 프로젝트가 늘어날 수 있습니다.', wealth: '공동 비용, 보증, 빌려주고 빌리는 일처럼 돈이 사람과 얽히는 주제가 커질 수 있습니다.', rel: '인맥이 넓어지는 한편 내 몫을 두고 신경 쓰이는 관계가 생길 수 있습니다.', move: '여럿이 함께 쓰는 공간이나 동행·동거 같은 생활 형태가 주제가 될 수 있습니다.', learn: '혼자보다 스터디나 모임에서 배우는 쪽이 더 잘 맞을 수 있습니다.' },
      good: '혼자 버티던 구조라면 도움을 주고받는 사람이 늘어나는 쪽으로 읽습니다.', bad: '재성(돈)이 약한 구조에서는 지출과 분배 부담이 커질 수 있어 주의가 필요합니다.', act: '돈과 역할은 시작 전에 글로 정해 두세요. 친한 사이일수록 더 그렇습니다.' },
    식신: { grp: 1, core: '꾸준히 만들고 표현하는 기운(식신)이 들어와 결과물이 중요해지는', mean: '생산, 꾸준한 표현, 기술, 먹고 즐기는 여유',
      scene: { work: '맡은 일을 꾸준히 다듬어 눈에 보이는 결과물로 남기는 일이 중요해질 수 있습니다.', wealth: '내가 가진 기술·콘텐츠로 수입을 만드는 흐름이 부각될 수 있습니다.', rel: '부드럽게 말하고 챙기는 방식으로 관계가 편안해질 수 있습니다.', move: '생활 리듬과 건강 습관, 취미 공간을 정돈하는 주제가 떠오를 수 있습니다.', learn: '배운 것을 직접 만들어 보며 익히는 방식이 잘 맞을 수 있습니다.' },
      good: '원국에서 식상이 적어 표현이 막혔던 구조라면 숨통이 트이는 쪽으로 읽습니다.', bad: '식상이 이미 많은 구조라면 벌여 놓은 일이 늘어 에너지가 분산될 수 있습니다.', act: '새로 벌이기보다 이미 하고 있는 일 한두 가지의 품질을 올리는 쪽을 택하세요.' },
    상관: { grp: 1, core: '기존 방식을 고치고 드러내려는 기운(상관)이 들어와 표현과 변화가 부각되는', mean: '표현, 비판, 방식 개선, 기존 규칙과의 마찰',
      scene: { work: '불합리해 보이는 절차를 바꾸자고 말하게 되거나, 창작·기획·말로 하는 일이 늘 수 있습니다.', wealth: '아이디어를 수익 구조로 바꿔 보려는 시도가 늘 수 있고, 기분에 따른 지출도 늘 수 있습니다.', rel: '솔직한 말이 관계를 시원하게 하기도, 상대에게 날카롭게 들리기도 하는 시기일 수 있습니다.', move: '답답한 환경을 벗어나 보려는 생각이 커질 수 있습니다.', learn: '정해진 틀보다 자유로운 방식의 공부·창작이 더 끌릴 수 있습니다.' },
      good: '인성이 받쳐 주거나 표현을 쓸 곳이 분명한 구조라면 창작·기획 성과로 이어지는 쪽으로 읽습니다.', bad: '관성(직장·규칙)이 중요한 구조라면 윗사람·조직과의 마찰이 늘 수 있어 말의 수위를 조절해야 합니다.', act: '불만은 감정이 가라앉은 뒤 문서나 제안 형태로 전달하세요.' },
    편재: { grp: 2, core: '움직이는 재물의 기운(편재)이 들어와 거래와 확장이 부각되는', mean: '유동적 수입, 사업·영업, 넓은 인맥, 활동 범위 확대',
      scene: { work: '영업·제휴·프리랜스처럼 바깥으로 나가 일을 만드는 활동이 늘 수 있습니다.', wealth: '수입 경로가 다양해지는 한편 지출·투자 제안도 함께 늘 수 있습니다.', rel: '새로운 사람과 만날 기회가 늘고, 가볍고 넓은 관계가 많아질 수 있습니다.', move: '이동과 출장, 활동 지역을 넓히는 일이 늘 수 있습니다.', learn: '실전에서 부딪치며 배우는 일이 많아져 정리된 공부는 뒤로 밀리기 쉽습니다.' },
      good: '재성이 적어 기회가 부족했던 구조라면 선택지가 늘어나는 쪽으로 읽습니다.', bad: '재성이 이미 많거나 일간이 약한 구조라면 욕심내다 감당하기 어려운 규모를 맡을 수 있습니다.', act: '새 제안은 작은 규모로 먼저 시험하고, 감당 가능한 한도를 미리 정해 두세요.' },
    정재: { grp: 2, core: '안정적인 재물의 기운(정재)이 들어와 수입과 관리가 부각되는', mean: '꾸준한 수입, 저축, 계약, 성실한 관리',
      scene: { work: '정해진 급여·계약 조건과 맡은 업무의 범위를 정리하는 일이 중요해질 수 있습니다.', wealth: '고정 수입, 저축, 고정비 점검 같은 관리 중심 주제가 부각될 수 있습니다.', rel: '현실적인 조건을 따지며 관계를 정리하거나, 안정적인 인연을 생각하게 될 수 있습니다.', move: '주거비·생활비를 기준으로 거처와 생활 기반을 다시 살펴볼 수 있습니다.', learn: '실용적이고 자격·실무와 연결되는 공부가 우선순위에 오를 수 있습니다.' },
      good: '지출이 헐겁던 구조라면 관리 습관을 잡기 좋은 쪽으로 읽습니다.', bad: '지나치게 안전만 택하면 기회를 놓칠 수 있고, 일간이 약하면 책임질 돈이 부담이 될 수 있습니다.', act: '고정 수입과 고정 지출을 한 번 표로 정리해 보세요.' },
    편관: { grp: 3, core: '책임과 압박의 기운(편관)이 들어와 평가와 규율이 부각되는', mean: '책임, 압박, 경쟁, 평가, 규율',
      scene: { work: '새 업무를 맡거나 능력을 평가받는 일, 책임 범위가 넓어지는 상황이 나타날 수 있습니다.', wealth: '책임질 지출이나 급히 필요한 비용이 생길 수 있어 예비 자금 점검이 중요해질 수 있습니다.', rel: '윗사람·경쟁자와 긴장 관계가 생기거나, 내가 누군가를 책임져야 하는 관계가 부각될 수 있습니다.', move: '직무나 근무지가 바뀌는 등 환경이 갑자기 움직이는 일이 생길 수 있습니다.', learn: '시험·심사처럼 평가받는 형태의 공부가 주제가 될 수 있습니다.' },
      good: '인성이 받쳐 주거나 관성을 쓸 힘(일간의 힘)이 충분한 구조라면 책임 확대를 성장의 계기로 읽을 수 있습니다.', bad: '관성이 이미 많거나 일간이 약한 구조라면 과도한 책임과 압박에 주의하는 쪽으로 읽습니다.', act: '맡을 일과 거절할 일을 먼저 나누고, 몸 상태와 일정 여유를 같이 점검하세요.' },
    정관: { grp: 3, core: '질서와 신뢰의 기운(정관)이 들어와 직책과 약속이 부각되는', mean: '직책, 규율, 신뢰, 사회적 인정, 정해진 절차',
      scene: { work: '직책·평가·승급 같은 공식적인 절차와 역할이 중요해질 수 있습니다.', wealth: '계약·규정·세금 같은 정해진 틀 안에서 돈을 다루는 일이 부각될 수 있습니다.', rel: '약속과 예의를 중시하는 관계, 공식적인 인연(소개·상견례 등)이 주제가 될 수 있습니다.', move: '소속이 바뀌거나 정식 절차를 거쳐 환경이 정리되는 일이 생길 수 있습니다.', learn: '정해진 커리큘럼과 자격 체계를 따라가는 공부가 잘 맞을 수 있습니다.' },
      good: '체계가 없어 흔들리던 구조라면 안정된 역할을 얻는 쪽으로 읽습니다.', bad: '관성이 이미 많은 구조라면 눈치와 체면 때문에 답답함이 커질 수 있습니다.', act: '규정과 기한을 먼저 확인하고, 약속한 것은 문서로 남기세요.' },
    편인: { grp: 4, core: '비주류의 깊은 관심과 재정비의 기운(편인)이 들어와 내적 변화가 부각되는', mean: '독특한 관심사, 직관, 전문 분야, 혼자 생각하는 시간',
      scene: { work: '남들이 잘 안 하는 전문 분야나 새로운 방식을 익히려는 흐름이 생길 수 있습니다.', wealth: '당장 수입보다 준비와 정비에 시간이 쓰여 수입이 늦게 반영될 수 있습니다.', rel: '혼자 있는 시간이 늘고 소수의 사람과 깊게 이야기하는 쪽으로 관계가 정리될 수 있습니다.', move: '이동보다 생활을 단순하게 하고 내 공간을 정비하는 쪽이 주제가 될 수 있습니다.', learn: '전문 분야·연구·상담·심리처럼 깊이 있는 공부가 부각될 수 있습니다.' },
      good: '식상과 균형이 맞는 구조라면 전문성을 쌓는 시간으로 읽습니다.', bad: '식신 기운이 약한데 인성이 강해지면 생각만 길어지고 실행이 늦어질 수 있습니다.', act: '생각이 길어지면 작은 실행 하나를 날짜와 함께 정해 두세요.' },
    정인: { grp: 4, core: '배움과 보호의 기운(정인)이 들어와 준비와 도움이 부각되는', mean: '학습, 자격, 문서, 어른·스승의 도움, 심리적 안정',
      scene: { work: '자격·교육·문서 업무가 늘거나, 윗사람의 도움을 받을 수 있는 상황이 생길 수 있습니다.', wealth: '벌이를 늘리기보다 지키고 준비하는 쪽(문서·계약 검토)이 주제가 될 수 있습니다.', rel: '나를 챙겨 주는 어른이나 멘토와의 관계가 중요해질 수 있습니다.', move: '집·문서와 관련된 일(계약, 정리)이 주제가 될 수 있습니다.', learn: '시험·자격·학업처럼 배우고 인정받는 일이 가장 자연스럽게 풀릴 수 있습니다.' },
      good: '지치고 기반이 약했던 구조라면 회복하고 도움을 받는 시기로 읽습니다.', bad: '인성이 이미 많은 구조라면 준비만 하다 실행이 늦어지거나 의존이 커질 수 있습니다.', act: '배우는 것과 해 보는 것의 비율을 정해 두고, 배운 것은 작게라도 바로 써 보세요.' },
  };
  var AREA = {
    work: { name: '직업·사회 환경', topics: '직장·업무 책임·경쟁·평가·독립과 사업·역할 변화' },
    wealth: { name: '재물·경제활동', topics: '수입 활동·지출 부담·거래와 계약·자산 관리' },
    rel: { name: '인간관계·인연', topics: '협력·경쟁·대인관계·연애와 결혼·가족·관계 재편' },
    move: { name: '생활·이동 환경', topics: '이사·거주 환경·이직·활동 영역·새 생활 기반' },
    learn: { name: '학습·재정비', topics: '공부·자격·전문성·사고방식 변화·장기 계획' },
  };
  var AREA_KEYS = ['work', 'wealth', 'rel', 'move', 'learn'];
  var SCOPE = { daeun: ['10년 동안', '대운'], seun: ['이 해에', '세운'], wolun: ['이 달에', '월운'], ilun: ['이 날에', '일진'] };
  var REL_TEXT = {
    '충': '서로 부딪혀 기존 상태가 움직이기 쉬운 작용입니다',
    '천간충': '주도권이나 가치관이 부딪히기 쉬운 작용입니다',
    '형': '마찰을 거치며 조정이 필요해지기 쉬운 작용입니다',
    '파': '기존 구조에 작은 균열이나 재조정이 생기기 쉬운 작용입니다',
    '해': '관계나 진행 과정에서 어긋남이 생기기 쉬운 작용입니다',
    '육합': '서로 묶여 결속하거나 성질이 달라지기 쉬운 작용입니다',
    '삼합': '세 글자가 모여 하나의 기운을 만드는 작용입니다',
    '반합': '합의 일부만 이루어져 조짐 수준에 머무는 작용입니다',
    '방합': '같은 방향의 글자가 모여 힘을 키우는 작용입니다',
    '천간합': '두 천간이 묶여 성향이 달라지거나 얽매이기 쉬운 작용입니다',
  };
  var POSN = { year: '년주', month: '월주', day: '일주', hour: '시주' };
  var POS_AREA = { year: '조상·바깥 환경', month: '직업·사회 환경', day: '나와 배우자 자리', hour: '자녀·말년·계획' };

  // 문구 DB(관리자·추적용): 위 표를 레코드로 펼친다. 검수 상태는 모두 draft(검수 후 승인).
  var PHRASES = [];
  Object.keys(TGD).forEach(function (tg) {
    var d = TGD[tg];
    function add(kind, extra, text) { PHRASES.push(Object.assign({ id: 'tg.' + tg + '.' + kind + (extra.area ? '.' + extra.area : ''), type: kind, tenGod: tg, periods: ['daeun', 'seun', 'wolun', 'ilun'], review: 'draft', version: PHRASE_VERSION, text: text }, extra)); }
    add('core', {}, d.core); AREA_KEYS.forEach(function (a) { add('scene', { area: a }, d.scene[a]); });
    add('good', {}, d.good); add('bad', {}, d.bad); add('act', {}, d.act);
  });
  var PH = {}; PHRASES.forEach(function (p) { PH[p.id] = p; });

  // ───────────── 보조 계산 ─────────────
  var grpOf = function (tgIdx) { return (tgIdx / 2) | 0; };
  var LH = function (b) { return ((1 - b) % 12 + 12) % 12; };   // 지지 육합 짝(자축·인해·묘술·진유·사신·오미)
  function pullOf(M, ch, p) {   // 운 글자가 끌어오는 십성 묶음(천간 0.4 + 지장간 0.6)
    var d = ch.pillars.day.s, g = [0, 0, 0, 0, 0];
    g[grpOf(M.TG.indexOf(M.tenGod(d, p.s)))] += 0.4;
    M.HIDDEN[p.b].forEach(function (h) { g[grpOf(M.TG.indexOf(M.tenGod(d, h[0])))] += 0.6 * h[1] / 30; });
    return g;
  }
  var lvlOf = function (v) { return v >= 0.55 ? '강조' : v >= 0.3 ? '보통' : '약함'; };
  var josa = function (w, a, b) { var c = w.charCodeAt(w.length - 1) - 44032; return w + (c >= 0 && c % 28 ? a : b); };

  function areaScores(M, ch, x, g, rels, sinsal) {
    var ev = x.ev, volN = (ev.volatilityScore || 0) / 100, yeokma = sinsal.some(function (q) { return q.name.indexOf('역마') >= 0; }) ? 1 : 0;
    var bonds = rels.filter(function (r) { return /합/.test(r.type); }).length;
    var dayHit = rels.some(function (r) { return r.members.indexOf('day') >= 0 && /충|형|합/.test(r.type); }) ? 1 : 0;
    var spouseG = ch.gender === 'M' ? 2 : 3;
    var raw = {
      work: g[3] * 1.0 + g[1] * 0.4 + g[0] * 0.2,
      wealth: g[2] * 1.0 + g[1] * 0.3,
      rel: g[0] * 0.8 + g[spouseG] * 0.3 + Math.min(bonds, 2) * 0.2 + dayHit * 0.3,
      move: volN * 0.8 + yeokma * 0.3 + g[1] * 0.2 + rels.some(function (r) { return r.members.indexOf('month') >= 0 && /충|형/.test(r.type); }) * 0.15,
      learn: g[4] * 1.0 + g[1] * 0.2,
    };
    return raw;
  }

  // 단순 인접 관계(상위 운과의 관계): 지지 충·육합, 천간합. 원국과의 작용과 별개의 "기간 간 연결" 참고용이다.
  function pairRel(a, b) {
    var out = [];
    if ((a.b + 6) % 12 === b.b) out.push('지지 충');
    else if (LH(a.b) === b.b) out.push('지지 육합');
    else if (a.b === b.b) out.push('같은 지지');
    if ((a.s + 5) % 10 === b.s || (b.s + 5) % 10 === a.s) out.push('천간합');
    else if (a.s === b.s) out.push('같은 천간');
    return out;
  }
  var elRel = function (a, b) { var d = ((b - a) % 5 + 5) % 5; return d === 0 ? '같은 오행' : d === 1 ? '생해 주는 관계' : d === 4 ? '생을 받는 관계' : d === 2 ? '극하는 관계' : '극을 받는 관계'; };

  // ───────────── 본체 ─────────────
  function build(M, ch, x, level, ctx) {
    ctx = ctx || {};
    var ev = x.ev, d = ch.pillars.day.s, dEl = M.stemEl(d), se = M.stemEl(x.s), be = M.BR_EL[x.b];
    var sc = SCOPE[level] || SCOPE.ilun, rule = [], excl = [], used = [];
    var R = function (id, why) { rule.push({ id: id, why: why }); };
    var X = function (id, why) { excl.push({ id: id, why: why }); };
    var LR = M.luckRelations(ch, x), rels = LR.rels, sinsal = LR.sinsal;
    var g = pullOf(M, ch, x), G = ch.weights.groups, GN = M.TG_GROUP;
    var roles = (ch.yong && ch.yong.roles) || ch.yongAll.eokbu.roles;
    var stemTG = x.stemTG, branchTG = x.branchTG, hidden = M.HIDDEN[x.b].map(function (h) { return M.STEM[h[0]] + '(' + M.tenGod(d, h[0]) + ')'; });
    var gzK = M.gzNameK(x), gzN = gzK + '(' + M.gzName(x) + ')';
    var use = function (id) { used.push(id); return PH[id].text; };

    // A. 핵심 기운
    var core = {
      title: gzN + ' — ' + M.EL_K[se] + (se === be ? '' : '·' + M.EL_K[be]) + '의 기운',
      text: sc[1] + ' ' + josa(gzK, '은', '는') + ' 천간 ' + M.STEM_K[x.s] + '(' + M.STEM[x.s] + ', ' + M.EL_K[se] + ')과 지지 ' + M.BR_K[x.b] + '(' + M.BR[x.b] + ', ' + M.EL_K[be] + ')' + ((M.BR_K[x.b].charCodeAt(0) - 44032) % 28 ? '이' : '가') + ' 함께 들어오는 기간입니다. 지지 속에는 ' + hidden.join(' · ') + '이 들어 있습니다.',
    };
    R('CORE-GZ', gzN);

    // B. 원국과의 관계
    var relation = M.STEM_K[d] + '(' + M.STEM[d] + ', ' + M.EL_K[dEl] + ') 일간에게 ' + josa(M.STEM_K[x.s], '은', '는') + ' ' + stemTG + '에 해당합니다. 전통 명리학에서는 ' + josa(TGD[stemTG].mean, '과', '와') + ' 연결해 해석합니다. 지지의 정기 ' + branchTG + '도 함께 작용합니다.';
    R('TG-' + stemTG, '일간 ' + M.STEM[d] + ' 기준 천간 십성'); R('TG-' + branchTG, '일간 기준 지지(정기) 십성');
    var roleS = roles[se], roleB = roles[be];
    relation += se === be ? ' 이 사주에서 ' + josa(M.EL_K[se], '은', '는') + ' ' + roleS + ' 역할입니다.' : ' 이 사주에서 ' + josa(M.EL_K[se], '은', '는') + ' ' + roleS + ', ' + josa(M.EL_K[be], '은', '는') + ' ' + roleB + ' 역할입니다.';
    R('ROLE-' + roleS, M.EL_K[se] + ' 오행 역할(' + (ch.yong && ch.yong.school || 'eokbu') + ')');

    // C. 환경 영역
    var raw = areaScores(M, ch, x, g, rels, sinsal);
    var areasAll = AREA_KEYS.map(function (k) { return { key: k, name: AREA[k].name, value: +raw[k].toFixed(2), level: lvlOf(raw[k]) }; });
    var ranked = areasAll.slice().sort(function (a, b) { return b.value - a.value; });
    var top = ranked.filter(function (a) { return a.level !== '약함'; }).slice(0, 3);
    if (!top.length && ranked[0].value >= 0.2) top = [ranked[0]];
    ranked.forEach(function (a) { if (top.indexOf(a) < 0) X('AREA-' + a.key, AREA[a.key].name + ' 근거 ' + a.value + ' — 상위 영역 아님(기준 0.30 미만이거나 3개 초과)'); });
    top.forEach(function (a) { R('AREA-' + a.key, AREA[a.key].name + ' 근거 ' + a.value + ' (' + a.level + ')'); });

    // 영역별 대표 십성: 그 영역을 이끄는 묶음에 속한 십성을 우선
    var drive = { work: 3, wealth: 2, rel: 0, move: 1, learn: 4 };
    var pickTG = function (area) {
      var want = drive[area];
      if (TGD[stemTG].grp === want) return stemTG; if (TGD[branchTG].grp === want) return branchTG;
      return TGD[stemTG].grp === 1 && (area === 'move' || area === 'rel') ? stemTG : stemTG;
    };
    // D. 상황
    var scenes = top.map(function (a) {
      var tg = pickTG(a.key), id = 'tg.' + tg + '.scene.' + a.key, txt = use(id);
      var extra = '';
      if (a.key === 'move' && ev.volatilityScore >= 25 && ev.volatilitySignals.length) { extra = ' 원국과의 ' + ev.volatilitySignals[0].text.replace(/\s+/g, ' ') + ' 작용이 이 흐름을 뒷받침합니다.'; R('REL-MOVE', ev.volatilitySignals[0].text); }
      return { area: a.key, name: a.name, level: a.level, tenGod: tg, phraseId: id, text: txt + extra };
    });
    if (!scenes.length) scenes.push({ area: null, name: '뚜렷한 주제 없음', level: '약함', tenGod: stemTG, phraseId: null, text: '어느 한 영역이 두드러지게 부각되는 근거는 약합니다. 평소의 생활 리듬을 유지하며 지내도 무리가 없는 기간으로 읽습니다.' });

    // E/F. 유리·불리 조건: 실제로 성립한 것만
    var good = [], bad = [];
    var elems = se === be ? [[se, M.STEM[x.s] + M.BR[x.b]]] : [[se, M.STEM[x.s]], [be, M.BR[x.b]]];
    elems.forEach(function (e) {
      var r = roles[e[0]];
      if (r === '용신' || r === '희신') { good.push({ id: 'ROLE-GOOD-' + e[0], text: josa(M.EL_K[e[0]], '은', '는') + ' 이 사주의 ' + r + ' 오행(' + e[1] + ')이라 균형을 돕는 쪽으로 작용합니다.' }); }
      else if (r === '기신' || r === '구신') { bad.push({ id: 'ROLE-BAD-' + e[0], text: josa(M.EL_K[e[0]], '은', '는') + ' 이 사주의 ' + r + ' 오행(' + e[1] + ')이라 기존 불균형을 키울 수 있습니다.' }); }
      else X('ROLE-' + e[0], M.EL_K[e[0]] + '은 한신이라 유불리 근거에 쓰지 않음');
    });
    [stemTG, branchTG].filter(function (t, i, a) { return a.map(function (v) { return TGD[v].grp; }).indexOf(TGD[t].grp) === i; }).forEach(function (tg) {
      var gi = TGD[tg].grp, pct = G[gi];
      if (pct < 15) good.push({ id: 'NATAL-LOW-' + GN[gi], text: '원국의 ' + josa(GN[gi], '이', '가') + ' ' + pct.toFixed(0) + '%로 적은 편이라 ' + tg + ' 기운이 비어 있던 자리를 채우는 쪽입니다. ' + use('tg.' + tg + '.good') });
      else X('NATAL-LOW-' + GN[gi], '원국 ' + GN[gi] + ' ' + pct.toFixed(0) + '% — 부족(15% 미만) 아님');
      if (pct >= 30) bad.push({ id: 'NATAL-HIGH-' + GN[gi], text: '원국의 ' + josa(GN[gi], '이', '가') + ' 이미 ' + pct.toFixed(0) + '%로 많은 편이라 ' + tg + ' 기운이 겹치면 과해질 수 있습니다. ' + use('tg.' + tg + '.bad') });
      else X('NATAL-HIGH-' + GN[gi], '원국 ' + GN[gi] + ' ' + pct.toFixed(0) + '% — 과다(30% 이상) 아님');
    });
    (ch.patterns.list || []).forEach(function (pt) {
      if (pt.level === '참고') return;
      var hit = (pt.name === '관살혼잡' && g[3] >= 0.4) || (pt.name === '상관견관' && g[1] >= 0.4) || (pt.name === '군겁쟁재' && g[0] >= 0.4) || (pt.name === '효신탈식(도식)' && g[4] >= 0.4);
      if (hit) bad.push({ id: 'PATTERN-' + pt.name, text: '원국에 ' + pt.name + ' 구조가 있는데 같은 계열의 기운이 들어와 그 부담이 커질 수 있습니다.' });
    });
    if (ev.condition === '순풍') good.push({ id: 'FIT-순풍', text: '억부·조후·관계를 종합한 적합도가 양호해 같은 기운이라도 비교적 부드럽게 작용합니다.' });
    if (ev.condition === '부담' || ev.condition === '주의') bad.push({ id: 'FIT-' + ev.condition, text: '억부·조후·관계를 종합한 적합도가 ' + ev.condition + ' 단계라, 같은 기운이라도 무리하게 밀어붙이면 부담이 커질 수 있습니다.' });
    good.forEach(function (q) { R(q.id, 'good'); }); bad.forEach(function (q) { R(q.id, 'bad'); });

    // 원국과의 작용(성립한 것만) + 우선순위/충돌
    var relNotes = rels.map(function (r) {
      var other = r.members.filter(function (m) { return m !== 'luck'; }), where = other.map(function (o) { return POSN[o] + '(' + POS_AREA[o] + ')'; }).join('·');
      R('REL-' + r.type, r.name + ' ↔ ' + where);
      return { id: 'REL-' + r.type, name: r.name, type: r.type, members: r.members, text: r.name + ': 들어온 글자가 ' + where + '와 만나는 ' + r.type + ((r.type.charCodeAt(r.type.length - 1) - 44032) % 28 ? '으로' : '로') + ', ' + (REL_TEXT[r.type] || '두 글자 사이의 작용입니다') + '.' };
    });
    var conflict = null;
    var byMember = {};
    rels.forEach(function (r) { r.members.forEach(function (m) { if (m !== 'luck') (byMember[m] = byMember[m] || []).push(r.type); }); });
    Object.keys(byMember).forEach(function (m) { var t = byMember[m]; if (t.some(function (v) { return /합/.test(v); }) && t.some(function (v) { return /충|형/.test(v); })) { conflict = POSN[m] + '의 글자가 합과 충·형을 함께 만나, 묶임과 부딪힘이 서로 영향을 주어 단정하기 어렵습니다(합충 우선순위는 학파마다 다릅니다).'; R('CONFLICT-합충', POSN[m]); } });

    // 기간 간 연결
    var chain = [], parents = level === 'seun' ? [['daeun', ctx.daeun || x.daeun]] : level === 'wolun' ? [['seun', ctx.seun], ['daeun', ctx.daeun]] : level === 'ilun' ? [['wolun', ctx.wolun], ['seun', ctx.seun]] : [];
    parents.forEach(function (pr) {
      var p = pr[1]; if (!p || p.s == null) return;
      var nm = SCOPE[pr[0]][1], pe = M.stemEl(p.s), pr2 = pairRel(x, p), line = nm + ' ' + M.gzName(p) + '(' + p.stemTG + ')의 배경 위에서 ' + SCOPE[level][1] + ' ' + M.gzName(x) + ' 기운이 들어옵니다. 천간 오행은 ' + elRel(pe, se) + '입니다';
      if (pr2.length) line += '. 두 간지 사이에는 ' + josa(pr2.join('·'), '이', '가') + ' 있습니다';
      var pc = p.ev && p.ev.condition;
      if (pc && pc !== ev.condition) line += '. ' + nm + ' 전체는 ' + pc + ' 단계이지만 이 ' + SCOPE[level][1] + ' 자체는 ' + ev.condition + ' 단계여서, 상위 운의 흐름이 그대로 이어진다고 보지 않습니다';
      else if (pc) line += '. ' + josa(nm, '과', '와') + ' 같은 ' + pc + ' 단계로 읽힙니다';
      chain.push({ parent: pr[0], text: line + '.' }); R('CTX-' + pr[0] + '-' + level, line.slice(0, 40));
    });
    var change = null;
    if (ctx.prev && ctx.prev.s != null) {
      var pv = ctx.prev, a = TGD[pv.stemTG], b = TGD[stemTG];
      change = '직전 ' + sc[1] + ' ' + M.gzName(pv) + '(' + pv.stemTG + ')에서 ' + M.gzName(x) + '(' + stemTG + ')으로 바뀌며 ' + (a.grp === b.grp ? '같은 ' + GN[b.grp] + ' 계열이 이어집니다.' : GN[a.grp] + ' 중심에서 ' + GN[b.grp] + ' 중심으로 초점이 옮겨 갑니다.');
      R('CHANGE-PREV', change.slice(0, 30));
    }

    // 불확실성
    var unc = ['이 해석은 전통 명리학의 상징 체계에 따른 가능한 시나리오이며, 실제 사건의 발생을 뜻하지 않습니다.'];
    if (level === 'ilun') unc.push('하루 단위는 근거가 적어 사건보다 "그날 어떤 태도로 쓰면 좋은가"까지만 읽습니다.');
    if (!ch.input || !ch.hourKnown) unc.push('출생 시간이 불명확하면 시주와 관련된 작용은 반영되지 않거나 부정확할 수 있습니다.');
    if (conflict) unc.push(conflict);
    if (ch.hourKnown === false) R('UNC-HOUR', '시간 미상');

    // G. 대응 전략
    var strat = [use('tg.' + stemTG + '.act')];
    if (branchTG !== stemTG && TGD[branchTG].grp !== TGD[stemTG].grp) strat.push(use('tg.' + branchTG + '.act'));
    if (ev.condition === '주의' || ev.condition === '부담' || ev.volatilityScore >= 55) strat.push('퇴사·투자·이주·결혼 같은 큰 결정은 운의 흐름만으로 정하지 말고 현실 조건을 먼저 확인하세요.');
    else if (level === 'ilun') strat.push('오늘의 해석은 참고용입니다. 중요한 일정은 평소 기준대로 준비하세요.');

    // 환경 요약(한 문장)
    var summary = top.length ? sc[0].replace(/ 동안$/, '') + (level === 'daeun' ? ' 10년 동안은 ' : '는 ') + top.map(function (a) { return AREA[a.key].name; }).join('·') + ' 쪽 주제가 상대적으로 부각됩니다(' + stemTG + ' 중심, 적합도 ' + ev.condition + ').' : sc[1] + ' 뚜렷하게 부각되는 영역은 약합니다.';
    var headline = (level === 'daeun' ? '' : '') + TGD[stemTG].core;

    return {
      version: VERSION, phraseVersion: PHRASE_VERSION, level: level,
      core: core, relation: relation, headline: headline, summary: summary,
      areas: areasAll, topAreas: top.map(function (a) { return a.key; }), scenes: scenes,
      good: good.map(function (q) { return q.text; }), bad: bad.map(function (q) { return q.text; }),
      relations: relNotes, conflict: conflict, chain: chain, change: change,
      strategy: strat, uncertainty: unc,
      evidence: {
        natal: ['year', 'month', 'day', 'hour'].filter(function (k) { return ch.pillars[k]; }).map(function (k) { return POSN[k] + ' ' + M.gzName(ch.pillars[k]); }),
        luck: M.gzName(x), tenGods: [stemTG, branchTG], hiddenStems: hidden,
        elements: { stem: M.EL_K[se], branch: M.EL_K[be], roles: [roleS, roleB] },
        natalGroupPct: G.map(function (v, i) { return GN[i] + ' ' + v.toFixed(0) + '%'; }),
        rules: rule, phraseIds: used.filter(function (v, i, a) { return a.indexOf(v) === i; }), excluded: excl,
        phraseReview: (function () { var ids = used.filter(function (v, i, a) { return a.indexOf(v) === i; }); return { published: ids.filter(function (i) { return PH[i].review === 'published'; }).length, total: ids.length }; })(),
      },
    };
  }

  // ───────────── 기간 비교: 환경 변화 타임라인 ─────────────
  // prev/cur/next는 build() 결과(없으면 null). 새 판단을 만들지 않고 두 결과의 영역 등급·십성 차이만 말로 옮긴다.
  var RANK = { '약함': 0, '보통': 1, '강조': 2 };
  function compare(prev, cur, next, label) {
    var out = { strengthened: [], weakened: [], steady: [], lines: [] }, nm = function (k) { return AREA[k].name; };
    out.lines.push('새로 들어오는 기운은 ' + cur.evidence.luck + '이며 ' + cur.evidence.tenGods[0] + ' 중심(' + cur.core.title.split(' — ')[1] + ')입니다.');
    if (prev) {
      cur.areas.forEach(function (a, i) { var d = RANK[a.level] - RANK[prev.areas[i].level]; (d > 0 ? out.strengthened : d < 0 ? out.weakened : out.steady).push(a.key); });
      out.lines.push(out.strengthened.length ? '이전보다 강해지는 주제는 ' + out.strengthened.map(nm).join(', ') + '입니다.' : '이전보다 뚜렷하게 강해지는 주제는 없습니다.');
      out.lines.push(out.weakened.length ? '이전보다 약해지거나 달라지는 주제는 ' + out.weakened.map(nm).join(', ') + '입니다.' : '이전보다 뚜렷하게 약해지는 주제는 없습니다.');
      var pt = prev.evidence.tenGods[0], ct = cur.evidence.tenGods[0];
      out.lines.push(pt === ct ? '직전과 같은 ' + ct + ' 기운이 이어집니다.' : '중심 십성이 ' + pt + '에서 ' + ct + '으로 바뀝니다.'.replace('으로 바뀝니다', (ct.charCodeAt(ct.length - 1) - 44032) % 28 ? '으로 바뀝니다' : '로 바뀝니다'));
      if (out.strengthened.indexOf('move') >= 0) out.lines.push('생활·이동 환경이 움직일 수 있다는 신호가 이전보다 커집니다. 실제 이사나 이직을 뜻하지는 않으며, 현실 조건을 먼저 확인하세요.');
    }
    if (next) {
      var nt = next.topAreas.map(nm).join(', ') || '뚜렷한 주제 없음';
      out.lines.push('다음 ' + (label || '기간') + '에는 ' + next.evidence.luck + '(' + next.evidence.tenGods[0] + ') 기운으로 이어지며 ' + nt + ' 쪽이 부각됩니다.');
    }
    return out;
  }

  // 관리자가 승인·게시한 문구만 본문을 교체한다. 알 수 없는 ID나 문자열이 아닌 값은 무시한다(기본 문구 유지).
  function applyPublished(map) {
    var n = 0; if (!map || typeof map !== 'object') return 0;
    Object.keys(map).forEach(function (id) { if (PH[id] && typeof map[id] === 'string' && map[id].trim()) { PH[id].text = map[id].trim(); PH[id].review = 'published'; n++; } });
    if (n) REV++;
    return n;
  }
  var CACHE = new WeakMap(), STATS = { hit: 0, miss: 0 };
  var pk = function (p) { return p ? p.i + ':' + (p.startMs != null ? p.startMs : p.year != null ? p.year : p.date ? p.date.join('-') : '') : ''; };
  function buildCached(M, ch, x, level, ctx) {
    ctx = ctx || {};
    var m = CACHE.get(ch); if (!m) CACHE.set(ch, m = new Map());
    var key = [VERSION, PHRASE_VERSION, REV, level, pk(x), pk(ctx.daeun || (level === 'seun' ? x.daeun : null)), pk(ctx.seun), pk(ctx.wolun), pk(ctx.prev)].join('|');
    if (m.has(key)) { STATS.hit++; return m.get(key); }
    STATS.miss++; var r = build(M, ch, x, level, ctx); m.set(key, r); return r;
  }
  var api = { buildCached: buildCached, cacheStats: STATS, applyPublished: applyPublished, compare: compare, VERSION: VERSION, PHRASE_VERSION: PHRASE_VERSION, build: build, PHRASES: PHRASES, AREA: AREA, AREA_KEYS: AREA_KEYS };
  G.MantraLuckInterpret = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
