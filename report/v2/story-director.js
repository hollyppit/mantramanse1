// Story Director — "인생 지도" 흐름의 감독 계층. 계산 엔진(Manse)과 해석 모듈(content)은 건드리지 않고,
// 이미 계산된 값을 "어떤 순서·어떤 현실 언어로 보여 줄지"만 정한다.
//   [Manse 계산] → [SajuData(sd)] → StoryDirector(무엇이 중요한가) → Story Composer(쉬운 말) → 뷰어(life.js)/관리자 미리보기
// 원칙: ① 점수는 엔진이 낸 값만 쓴다(없으면 available:false 로 두고 지어내지 않는다). ② 관심 분야는 순서·강조·표현만 바꾸고 계산 결과는 바꾸지 않는다.
//       ③ 사건을 확정하지 않는다(결혼·파산·질병 등 금지) — "움직임이 커질 수 있는 구간"으로만 말한다.
// 순수 함수: 브라우저·node(vm) 어디서나 같은 결과. 시각(now)은 인자로 받는다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var SEA = { opportunity: '기회운', expansion: '확장운', harvest: '수확운', accumulation: '축적운', transition: '전환운', defense: '방어운' };

  /* ── 1. 분야(필터 탭) ─ 점수의 출처를 분명히 적는다 ─────────────────────────── */
  var FIELDS = [
    { id: 'all', name: '종합', source: '대운·세운 flow 계절(엔진 evaluateLuck)', available: true },
    { id: 'money', name: '돈', source: '엔진 evaluateDomainLuck.wealth (재정 활동성·적합도·안정성)', available: true },
    { id: 'career', name: '직업', source: '엔진 careerLuckActivation × 원국 상위 직업 분야 3개의 평균 활성도', available: true, note: '운이 일을 "활성화"하는 정도만 반영(분야 적합도는 원국 고정값이라 시간축에서 제외)' },
    { id: 'love', name: '사랑', source: '엔진 evaluateDomainLuck.love (관계 활성도·적합도·안정성)', available: true },
    { id: 'relation', name: '관계', source: 'AI 추정(엔진 십성·합충 근거) · 실패 시 규칙 추정', available: true, ai: true, note: '엔진에 인간관계 전용 모델이 없어 AI 가 대운·세운의 십성·합충으로 추정합니다. 월 단위는 제공하지 않습니다.' },
  ];
  var levelWord = function (v) { return v >= 85 ? '매우 높음' : v >= 70 ? '높음' : v >= 55 ? '무난' : v >= 40 ? '다소 낮음' : '낮음'; };

  /* ── 2. 인생의 계절 · 현실 언어 ─────────────────────────────────────────────── */
  var SEASON = {
    opportunity: { tag: '새 기회가 열리는 구간', hj: '機', now: { headline: '지금은 새로운 문이 열리기 쉬운 시기입니다.', body: ['새로운 제안이나 사람, 배울 거리가 평소보다 자주 눈에 들어올 수 있습니다.', '직장에서는 새 역할, 프리랜서라면 새 의뢰, 사업이라면 새 거래처처럼 나타나기도 합니다.'], doThis: '들어오는 기회 중 하나를 골라 작게 시험해 보세요.', trap: '기회가 많다고 전부 잡으면 어느 것도 끝내지 못하기 쉽습니다.' } },
    expansion: { tag: '확장 가능성이 커지는 구간', hj: '擴', now: { headline: '지금은 해 온 일을 넓히기 좋은 시기입니다.', body: ['이미 해 온 일의 범위나 규모를 키워도 버틸 힘이 붙는 때입니다.', '일의 영역, 만나는 사람, 활동 지역이 넓어지는 모습으로 나타날 수 있습니다.'], doThis: '잘 되던 것 하나를 골라 규모를 한 단계만 키워 보세요.', trap: '넓히는 속도가 관리하는 속도를 넘으면 힘이 분산됩니다.' } },
    harvest: { tag: '성과를 굳히는 구간', hj: '穫', now: { headline: '지금은 새로 벌이기보다 쌓아 온 것을 거두는 시기입니다.', body: ['그동안 해 온 일이 평가나 보상으로 돌아오기 쉬운 때입니다.', '결과를 숫자나 기록으로 남겨 두면 다음 단계에서 힘이 됩니다.'], doThis: '성과를 정리하고, 그에 맞는 보상이나 자리를 요청해 보세요.', trap: '성과가 보인다고 곧바로 크게 확장하면 지키기 어려워질 수 있습니다.' } },
    accumulation: { tag: '실력과 자산을 쌓는 구간', hj: '蓄', now: { headline: '지금은 겉으로 드러나는 일보다 안으로 쌓는 일이 중요한 시기입니다.', body: ['눈에 띄는 변화는 적어도 실력, 관계, 저축처럼 나중에 쓰일 것이 쌓이는 때입니다.', '조급해하면 오히려 쌓이는 속도가 느려집니다.'], doThis: '배우기, 자격, 저축 같은 "쌓이는 일"에 시간을 정해 두세요.', trap: '당장 결과가 안 보인다고 방향을 자주 바꾸면 쌓은 것이 흩어집니다.' } },
    transition: { tag: '방향이 바뀌기 쉬운 구간', hj: '轉', now: { headline: '지금은 새로운 것을 무작정 늘리기보다 가져갈 것과 버릴 것을 구분하는 시기입니다.', body: ['일, 사람, 사는 곳 같은 기존 자리에서 조정이 생기기 쉬운 때입니다.', '직장에서는 역할 변화, 사업에서는 상품·거래처 정리, 프리랜서라면 일 방식의 변화로 나타날 수 있습니다.'], doThis: '유지할 것 · 줄일 것 · 끝낼 것을 종이에 한 번 나눠 적어 보세요.', trap: '큰 결정을 한꺼번에 내리면 후회가 남기 쉽습니다. 하나씩 순서대로 정하세요.' } },
    defense: { tag: '지키고 정리하는 구간', hj: '守', now: { headline: '지금은 얻는 것보다 지키는 것이 더 큰 힘이 되는 시기입니다.', body: ['예상 밖의 지출, 일정 충돌, 부담스러운 요청이 평소보다 늘 수 있습니다.', '무리한 확장이나 큰 약속보다 현금과 체력, 기본 관계를 지키는 편이 안전합니다.'], doThis: '고정 지출과 일정을 먼저 점검하고, 여유 자금과 시간을 확보해 두세요.', trap: '만회하려고 서두르거나 한 번에 크게 거는 선택은 피하는 편이 좋습니다.' } },
  };
  // 분야별 현재 상태 한 줄 (엔진 점수 구간 → 현실 언어). 사건을 확정하지 않는다.
  var FIELD_NOW = {
    money: { '매우 높음': '돈과 관련된 선택과 움직임이 크게 늘 수 있는 구간입니다. 규모보다 "남는 돈"을 기준으로 고르세요.', '높음': '돈이 움직이기 쉬운 구간입니다. 새 수입원이나 거래를 시험하기 좋지만, 한 번에 여러 곳에 넣지는 마세요.', '무난': '돈의 흐름이 평소 수준인 구간입니다. 새로 벌이기보다 지금의 수입 구조를 다듬는 편이 유리합니다.', '다소 낮음': '돈이 쉽게 불어나는 구간은 아닙니다. 지출 구조를 가볍게 만들고 현금 여유를 확보하세요.', '낮음': '돈을 키우기보다 지키는 것이 중요한 구간입니다. 큰 지출·투자·보증은 미루고 고정비를 점검하세요.' },
    career: { '매우 높음': '일의 기회와 역할 변화가 눈에 띄게 늘 수 있는 구간입니다.', '높음': '일이 활발하게 움직이는 구간입니다. 맡을 일과 거절할 일을 미리 정해 두세요.', '무난': '일의 흐름이 안정적인 구간입니다. 전문성을 한 줄 더 쌓기 좋습니다.', '다소 낮음': '일에서 새 기회가 많지는 않은 구간입니다. 준비와 정비에 쓰면 좋습니다.', '낮음': '일을 크게 벌이기보다 기본기와 기존 자리를 지키는 구간입니다.' },
    love: { '매우 높음': '사람과의 인연·관계 변화가 크게 움직일 수 있는 구간입니다. 설렘과 판단을 따로 확인하세요.', '높음': '새로운 만남이나 관계의 진전을 살펴볼 만한 구간입니다. 서두르기보다 상대를 관찰하세요.', '무난': '관계가 평소 수준으로 이어지는 구간입니다. 지금 있는 관계를 돌보기 좋습니다.', '다소 낮음': '새 인연보다 지금 관계의 안정이 중요한 구간입니다.', '낮음': '관계에서 에너지 소모가 커지기 쉬운 구간입니다. 무리한 만남보다 나를 돌보는 시간을 늘리세요.' },
  };

  /* ── 3. 질문 모듈 — 기존 21개 챕터(c00~c20)를 사용자 질문으로 재분류 ─────────────────
     chapters = 기존 챕터 base id(내용·계산은 그대로 재사용). gen = 이 모듈이 만드는 시간축 카드(엔진 실데이터). */
  var INTERESTS = [
    { id: 'money', name: '돈', hook: '언제 돈이 풀리고\n어떻게 벌어야 할까?', icon: '財' },
    { id: 'career', name: '일과 성공', hook: '나는 어떤 일로\n성공하기 쉬울까?', icon: '業' },
    { id: 'love', name: '연애', hook: '언제 좋은 인연을\n만날 가능성이 커질까?', icon: '緣' },
    { id: 'marriage', name: '결혼', hook: '어떤 사람과\n오래 갈 가능성이 높을까?', icon: '合' },
    { id: 'future', name: '미래', hook: '앞으로 내 인생은\n어떻게 흘러갈까?', icon: '運' },
    { id: 'relation', name: '인간관계', hook: '왜 어떤 사람은 편하고\n어떤 사람은 힘들까?', icon: '人' },
    { id: 'self', name: '나 자신', hook: '나는 어떤 사람이고\n무엇을 타고났을까?', icon: '命' },
  ];
  function M(id, cat, q, title, sub, chapters, extra) { var o = { id: id, category: cat, question: q, title: title, sub: sub, chapters: chapters || [], gen: null, when: false, requiredData: [], premium: true, priority: 5, relatedModules: [] }; for (var k in (extra || {})) o[k] = extra[k]; return o; }
  var MODULES = [
    // 돈
    M('money_nature', 'money', '나는 돈복이 있는 사람일까? 어떻게 돈을 버는 사람일까?', '나는 어떻게 돈을 버는 사람일까?', '재성 · 식상 · 운 흐름 분석', ['c08'], { premium: false, priority: 1, requiredData: ['groups', 'strength'], relatedModules: ['career_style', 'money_timing'] }),
    M('money_style', 'money', '직장 / 프리랜서 / 사업 중 어떤 방식과 잘 맞을까?', '직장·프리랜서·사업, 어디서 힘이 날까?', '신강약 · 관성 · 식상', ['c06'], { priority: 3, relatedModules: ['career_style'] }),
    M('money_timing', 'money', '내 인생에서 돈의 움직임이 커지는 시기는?', '돈의 움직임이 커지는 때', '재정 활동성(대운·세운)', [], { gen: 'timing:money', when: true, requiredData: ['daeun', 'seun', 'domain.wealth'], priority: 2 }),
    M('money_leak', 'money', '돈이 들어와도 왜 안 모일까? 반복하기 쉬운 실수는?', '돈이 새는 자리', '약한 십성 · 그림자', ['c05'], { priority: 4, status: 'merged', note: '독립 챕터 없음 — c05(약점)와 c08 안의 topics(새는 돈)를 재사용. 전용 모듈은 관리자 "해석 모듈"에서 추가' }),
    // 일·성공
    M('career_style', 'career', '나는 어떤 방식으로 일하는 사람인가? 어떤 직업군과 궁합이 좋은가?', '나는 어떤 방식으로 일하는 사람일까?', '직업 적성 · 십성군', ['c06'], { premium: false, priority: 1, requiredData: ['career', 'groups'] }),
    M('career_success', 'career', '나에게 맞는 성공 방식은?', '나에게 맞는 성공 방식', '억부 · 용신', ['c07'], { priority: 2 }),
    M('career_talent', 'career', '남들보다 쉽게 잘하는 것은?', '남들보다 쉽게 잘하는 것', '십성 · 통근', ['c04'], { priority: 3 }),
    M('career_timing', 'career', '직업 변화가 커질 수 있는 시기는?', '일의 움직임이 커지는 때', '직업 활성도(대운·세운)', [], { gen: 'timing:career', when: true, requiredData: ['daeun', 'seun', 'career'], priority: 4 }),
    // 연애
    M('love_style', 'love', '나는 사랑할 때 어떤 사람인가? 어떤 사람에게 끌리는가?', '나는 사랑할 때 어떤 사람일까?', '연애 성향 · 일지 12운성', ['c09'], { premium: false, priority: 1 }),
    M('love_match', 'love', '끌리는 사람과 잘 맞는 사람은 같은가?', '끌리는 사람, 맞는 사람', '궁합 · 일주 상성', ['c12'], { priority: 3 }),
    M('love_timing', 'love', '인연의 움직임이 커질 수 있는 시기는?', '인연의 움직임이 커지는 때', '관계 활성도(대운·세운)', [], { gen: 'timing:love', when: true, requiredData: ['daeun', 'seun', 'domain.love'], priority: 2 }),
    // 결혼
    M('marriage_who', 'marriage', '어떤 배우자와 비교적 잘 맞는가? 갈등이 생기기 쉬운 부분은?', '오래 가는 관계에서 바라는 것', '배우자궁 · 합충', ['c10'], { premium: false, priority: 1 }),
    M('marriage_timing', 'marriage', '인연/결혼 관련 움직임이 커질 수 있는 시기는?', '인연과 결혼 이야기가 커지는 때', '배우자성·배우자궁 활성(AI·규칙 추정)', [], { gen: 'social:marriage', when: true, requiredData: ['daeun', 'seun', 'luckRelations'], priority: 2, ai: true, note: '엔진에 결혼 전용 모델이 없어 AI 가 추정(실패 시 배우자성·일지 합충 규칙 추정). 사건은 확정하지 않음.' }),
    M('relation_timing', 'relation', '인간관계의 변화가 커지는 시기는?', '사람 사이의 변화가 커지는 때', '비겁·관성·인성 + 합충(AI·규칙 추정)', [], { gen: 'social:relation', when: true, requiredData: ['daeun', 'seun', 'luckRelations'], priority: 3, ai: true }),
    // 미래
    M('future_cycle', 'future', '인생 전체의 계절은?', '인생 전체의 계절', '대운 10개', ['c15'], { priority: 1 }),
    M('future_now', 'future', '지금 나는 어느 계절인가?', '지금 서 있는 계절', '현재 대운', ['c16'], { premium: false, priority: 1 }),
    M('future_3_5_10', 'future', '앞으로 3년 · 5년 · 10년은?', '앞으로 10년의 구간', '세운 10개', [], { gen: 'future', when: true, requiredData: ['seun'], priority: 2 }),
    M('future_year', 'future', '올해 흐름은?', '올해의 흐름', '세운', ['c17'], { priority: 3 }),
    M('future_months', 'future', '앞으로 12개월 중 움직임이 커지는 달은?', '앞으로 12개월', '월운', ['c18'], { priority: 4 }),
    // 인간관계
    M('relation_style', 'relation', '왜 어떤 사람은 편하고 어떤 사람은 힘들까?', '사람을 대하는 나의 방식', '비겁 · 관성 · 인성', ['c11'], { premium: false, priority: 1 }),
    M('relation_match', 'relation', '나와 잘 맞는 사람은?', '나와 잘 맞는 사람', '일주 궁합', ['c12'], { priority: 2 }),
    M('relation_family', 'relation', '가족과 내 뿌리는?', '내가 자라온 자리', '년주 · 월주', ['c13'], { priority: 3 }),
    // 나 자신
    M('self_who', 'self', '나는 어떤 사람인가? 왜 이렇게 판단하는가?', '나는 왜 이렇게 행동할까?', '경오일주 형식의 일주 · 일간', ['c01', 'c03'], { premium: false, priority: 1 }),
    M('self_force', 'self', '내 안에서 가장 강한 힘은?', '내 안에서 가장 강한 힘', '오행 분석', ['c02'], { priority: 2 }),
    M('self_shadow', 'self', '스트레스를 받으면 어떻게 변하는가? 나도 모르게 반복하는 실수는?', '스트레스 받으면 나오는 모습', '약점 · 그림자', ['c05'], { priority: 3 }),
    M('self_talent', 'self', '남들보다 쉽게 잘하는 것은?', '남들보다 쉽게 잘하는 것', '십성 · 통근', ['c04'], { priority: 4 }),
    M('self_root', 'self', '오래된 뿌리(상징 콘텐츠)', '오래된 뿌리', '상징 스토리', ['c14'], { priority: 9 }),
    // 공통 마무리
    M('act_remedy', 'final', '지금 흐름에 맞는 행동 전략은?', '그래서 지금 무엇을 해야 할까?', '개운 · 행동 전략', ['c19', 'c20'], { premium: false, priority: 1, gen: 'action' }),
    M('prologue_verdict', 'final', '타고난 가장 큰 동력과 아직 쓰이지 않은 부분', '타고난 가장 큰 동력', '총평', ['c00'], { priority: 9, status: 'optional' }),
  ];
  var BY_ID = {}; MODULES.forEach(function (m) { BY_ID[m.id] = m; });

  // 기존 챕터(c00~c20) → 새 모듈 매핑표 (문서·관리자 표시용)
  function chapterMap() {
    var out = {}; MODULES.forEach(function (m) { m.chapters.forEach(function (b) { (out[b] = out[b] || []).push(m.id); }); });
    return out;
  }

  // 관심 분야별 이야기 순서 (명세 §19). 'life'·'here' 는 공통 도입 화면.
  var FLOWS = {
    money: ['life', 'here', 'money_nature', 'money_style', 'money_timing', 'money_leak', 'career_success', 'future_3_5_10', 'future_year', 'future_months', 'act_remedy'],
    career: ['life', 'here', 'career_style', 'career_talent', 'career_success', 'career_timing', 'money_nature', 'future_3_5_10', 'act_remedy'],
    love: ['life', 'here', 'love_style', 'love_match', 'love_timing', 'marriage_who', 'relation_style', 'future_year', 'future_months', 'act_remedy'],
    marriage: ['life', 'here', 'marriage_who', 'marriage_timing', 'love_style', 'relation_family', 'future_3_5_10', 'act_remedy'],
    future: ['life', 'here', 'future_cycle', 'future_now', 'future_3_5_10', 'future_year', 'future_months', 'act_remedy'],
    relation: ['life', 'here', 'relation_style', 'relation_timing', 'relation_match', 'relation_family', 'self_shadow', 'future_year', 'act_remedy'],
    self: ['life', 'here', 'self_who', 'self_force', 'self_talent', 'self_shadow', 'self_root', 'future_year', 'act_remedy'],
  };
  var INTRO_STEPS = { life: { id: 'life', title: '내 인생 전체의 지도', sub: '대운 10개 · 인생의 계절', premium: false }, here: { id: 'here', title: '지금 내가 서 있는 곳', sub: '대운 + 세운 + 원국', premium: false } };

  /* ── 4. 계산 어댑터(엔진 값 → 시간축 항목). 점수를 새로 만들지 않는다. ──────────────── */
  function seasonOf(ev) { var S = R.SajuData; return S ? S.seasonOf(ev) : null; }
  function careerTop(M, ch) { try { return (M.careerProfile(ch).top || []).slice(0, 3).map(function (c) { return c.category; }); } catch (e) { return []; } }
  function fieldScores(M, ch, p, level, ctx, top) {
    var out = { money: null, love: null, career: null };
    try { var dm = M.evaluateDomainLuck(ch, p, level, ctx || {}); out.money = { score: dm.wealth.score, band: dm.wealth.band }; out.love = { score: dm.love.score, band: dm.love.band }; } catch (e) { }
    try { if (top && top.length) { var a = M.careerLuckActivation(ch, p), s = Math.round(top.reduce(function (x, k) { return x + (a[k] || 0); }, 0) / top.length); out.career = { score: s, band: levelWord(s) }; } } catch (e) { }
    return out;
  }
  var ageOf = function (ch, Y) { return Y - ch.solar.y; }; // 연 나이(엔진 seunRange 와 같은 기준)

  /* ── 인간관계 · 결혼(인연) 시기: 엔진에 전용 모델이 없어 AI 가 추정한다(사용자 결정). ─────────────────────────
     ① social() = 즉시 쓰는 규칙 추정(rule-estimate: 엔진이 계산한 십성·합충만 사용) ② aiPayload() → /api/life-ai (생년월일 없이 간지·십성·합충만) → mergeSocial() 로 AI 값 우선.
     화면에는 항상 "AI 추정"/"규칙 추정" 출처를 표시한다. 사건을 확정하지 않는다. */
  var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  var REL_STARS = ['비견', '겁재', '정관', '편관', '정인', '편인'];
  function socialScore(Mn, ch, p, kind) {
    var rels = Mn.luckRelations(ch, p).rels, s = p.stemTG, b = p.branchTG, v = 40, SS = ch.gender === 'F' ? ['정관', '편관'] : ['정재', '편재'];
    if (kind === 'marriage') { // 배우자성이 들어오는 해 + 일지(배우자궁)와의 합·충
      if (SS.indexOf(s) >= 0) v += s.charAt(0) === '정' ? 16 : 12; if (SS.indexOf(b) >= 0) v += 12;
      rels.forEach(function (r) { if (r.members.indexOf('day') < 0) return; v += /합/.test(r.type) ? 14 : 8; });
    } else { // 비겁·관성·인성(동료·조직·조력자) + 월지·년지·일지와의 합충
      if (REL_STARS.indexOf(s) >= 0) v += 10; if (REL_STARS.indexOf(b) >= 0) v += 8; var a = 0; rels.forEach(function (r) { a += /합/.test(r.type) ? 5 : 6; }); v += Math.min(18, a);
    }
    return clamp(v);
  }
  function windowsOf(years, th, fromY, toY) { // years: [{y, v}] → 연속한 해를 구간으로
    var w = []; years.filter(function (x) { return x.y >= fromY && x.y <= toY && x.v >= th; }).forEach(function (x) { var l = w[w.length - 1]; if (l && x.y === l.to + 1) l.to = x.y; else w.push({ from: x.y, to: x.y, note: '' }); }); return w;
  }
  function social(Mn, ch, sd, now) {
    var by = ch.solar.y, Y = sd.nowYear, out = { source: 'rule-estimate', relation: { decades: {}, years: {}, note: '' }, marriage: { decades: {}, years: {}, windows: [], note: '' } };
    ch.daeun.list.forEach(function (x, i) { out.relation.decades[i] = socialScore(Mn, ch, x, 'relation'); out.marriage.decades[i] = socialScore(Mn, ch, x, 'marriage'); });
    Mn.seunRange(ch, by + 1, by + 90).forEach(function (it) { out.relation.years[it.year] = socialScore(Mn, ch, it, 'relation'); if (it.year - by >= 18) out.marriage.years[it.year] = socialScore(Mn, ch, it, 'marriage'); });
    var ys = Object.keys(out.marriage.years).map(function (y) { return { y: +y, v: out.marriage.years[y] }; }), nx = ys.filter(function (x) { return x.y >= Y && x.y <= Y + 14; }).map(function (x) { return x.v; }).sort(function (a, b) { return a - b; });
    var th = Math.max(58, nx.length ? nx[Math.floor(nx.length * 0.75)] : 58); out.marriage.windows = windowsOf(ys, th, Y, Y + 14).slice(0, 3).map(function (w) { w.note = '인연과 관계의 변화가 커질 수 있는 시기'; return w; });
    return out;
  }
  function aiPayload(Mn, ch, sd) { // 서버로 보내는 값: 간지·십성·합충 요약만(생년월일·이름 없음)
    var by = ch.solar.y, rl = function (p) { return Mn.luckRelations(ch, p).rels.slice(0, 6).map(function (r) { return r.type + r.name.replace(/[^가-힣一-鿿]/g, '') + '(' + r.members.filter(function (m) { return m !== 'luck'; }).join('+') + ')'; }); };
    var P = sd.pillars, pil = ['year', 'month', 'day', 'hour'].map(function (k) { return P[k] ? P[k].ko : ''; }).filter(Boolean);
    return { gender: sd.gender, natal: { pillars: pil, strength: sd.strength.band, dayBranchTG: P.day && P.day.branchTG || '' },
      decades: ch.daeun.list.map(function (x) { return { a: x.startYear - by, g: Mn.gzNameK(x), s: x.stemTG, b: x.branchTG, r: rl(x) }; }),
      years: Mn.seunRange(ch, by + 1, by + 90).map(function (it) { return { y: it.year, a: it.year - by, g: Mn.gzNameK(it), s: it.stemTG, b: it.branchTG, r: rl(it) }; }) };
  }
  function mergeSocial(rule, ai) { // AI 값이 있는 칸은 AI, 없는 칸은 규칙 추정
    if (!ai) return rule; var o = JSON.parse(JSON.stringify(rule)); o.source = 'ai';
    ['relation', 'marriage'].forEach(function (k) { var a = ai[k] || {}; ['decades', 'years'].forEach(function (m) { Object.keys(a[m] || {}).forEach(function (key) { o[k][m][key] = a[m][key]; }); }); if (a.note) o[k].note = a.note; });
    if (ai.marriage && ai.marriage.windows && ai.marriage.windows.length) o.marriage.windows = ai.marriage.windows;
    return o;
  }
  /** 지도 항목(대운 lifeMap·연도 yearsOf)에 관계 값을 붙인다. soc 가 없으면 그대로 둔다. */
  function attachSocial(items, soc, level) {
    if (!soc) return items;
    items.forEach(function (it) { var s = level === 'decade' ? soc.relation.decades[it.idx] : soc.relation.years[it.year]; if (s != null && !it.pre) { it.fields = it.fields || {}; it.fields.relation = { score: s, band: levelWord(s), source: soc.source }; } });
    return items;
  }

  /** 인생 전체 지도: 대운 10개를 "계절"로. 출생~첫 대운 전은 데이터 없음(pre)으로 둔다. */
  function lifeMap(Mn, ch, now) {
    var Y = Mn.yearPillarAt(now).sajuYear, top = careerTop(Mn, ch), by = ch.solar.y, list = ch.daeun.list, out = [];
    var first = list[0].startYear;
    if (first > by) out.push({ pre: true, startYear: by, endYear: first - 1, startAge: 0, endAge: first - by - 1, season: null, tag: '대운이 시작되기 전의 시기', fields: {}, isCurrent: Y < first });
    list.forEach(function (x, i) {
      var sea = seasonOf(x.ev), end = x.startYear + 9, f = fieldScores(Mn, ch, x, 'daeun', {}, top);
      out.push({ pre: false, idx: i, ganzhi: Mn.gzNameK(x), startYear: x.startYear, endYear: end, startAge: x.startYear - by, endAge: end - by, season: sea, tag: sea ? SEASON[sea].tag : '', seasonName: sea ? SEA[sea] : '', condition: x.ev.flow.condition.name, fit: x.ev.fitScore,
        fields: { all: { season: sea, fit: x.ev.fitScore }, money: f.money, career: f.career, love: f.love }, isCurrent: Y >= x.startYear && Y <= end, stemTG: x.stemTG, branchTG: x.branchTG });
    });
    return out;
  }
  /** 10년 → 연도별(세운). from~to 연도(양끝 포함). */
  function yearsOf(Mn, ch, from, to, now) {
    var Y = Mn.yearPillarAt(now).sajuYear, top = careerTop(Mn, ch);
    return Mn.seunRange(ch, from, to).map(function (it) {
      var sea = seasonOf(it.ev), f = fieldScores(Mn, ch, it, 'seun', { ms: it.midMs }, top);
      return { year: it.year, age: ageOf(ch, it.year), ganzhi: Mn.gzNameK(it), season: sea, seasonName: sea ? SEA[sea] : '', tag: sea ? SEASON[sea].tag : '', label: Mn.flowLabel(it.ev), isNow: it.year === Y, fields: { all: { season: sea, fit: it.ev.fitScore }, money: f.money, career: f.career, love: f.love } };
    });
  }
  /** 연도 → 12개월(월운). */
  function monthsOf(Mn, ch, Y, now) {
    var top = careerTop(Mn, ch);
    return Mn.wolun(ch, Y).map(function (it) {
      var sea = seasonOf(it.ev), f = fieldScores(Mn, ch, it, 'wolun', { ms: it.startMs }, top), d = new Date(it.startMs + 9 * 3600e3);
      return { month: d.getUTCMonth() + 1, term: it.termName, ganzhi: Mn.gzNameK(it), season: sea, seasonName: sea ? SEA[sea] : '', fields: { all: { season: sea, fit: it.ev.fitScore }, money: f.money, career: f.career, love: f.love }, isNow: now >= it.startMs && now < it.startMs + 33 * 86400000 };
    });
  }

  /* ── 5. YOU ARE HERE ───────────────────────────────────────────────────────── */
  function position(Mn, ch, sd, now) {
    var Y = sd.nowYear, dw = sd.currentDaewoon, sw = sd.sewoon, seaKey = (sw && sw.season) || (dw && dw.season) || 'accumulation', P = SEASON[seaKey] || SEASON.accumulation;
    var age = ageOf(ch, Y), dline = dw ? '10년 단위로 보면 ' + (dw.startYear - ch.solar.y) + '~' + (dw.endYear - ch.solar.y) + '세는 "' + (SEASON[dw.season] ? SEASON[dw.season].tag : '흐름을 만드는 구간') + '"입니다.' : '';
    var fields = {}; try { var top = careerTop(Mn, ch), se = Mn.seunRange(ch, Y, Y)[0], f = fieldScores(Mn, ch, se, 'seun', { ms: se.midMs }, top); ['money', 'career', 'love'].forEach(function (k) { if (f[k]) fields[k] = { band: f[k].band, line: FIELD_NOW[k][f[k].band] || '' }; }); } catch (e) { }
    return { year: Y, age: age, seasonKey: seaKey, seasonName: SEA[seaKey], hj: P.hj, headline: P.now.headline, body: P.now.body.slice(), doThis: P.now.doThis, trap: P.now.trap, decadeLine: dline, fields: fields,
      evidence: evidence(Mn, ch, sd) };
  }
  /** [왜 이렇게 나오나요?] — 현실 언어 아래에 명리 근거를 그대로 펼친다(전부 sd/엔진 값). */
  function evidence(Mn, ch, sd) {
    var E = [], dw = sd.currentDaewoon, sw = sd.sewoon, g = sd.groups, el = sd.fiveElements;
    var P = sd.pillars; E.push({ k: '원국(사주팔자)', v: ['year', 'month', 'day', 'hour'].map(function (k) { return P[k] ? P[k].ko : '(시 모름)'; }).join(' · ') + ' — 일주 ' + sd.dayPillar.ko + '(' + sd.dayPillar.hanja + ')' });
    E.push({ k: '오행', v: Object.keys(el).map(function (e) { return e + ' ' + Math.round(el[e]) + '%'; }).join(' · ') });
    E.push({ k: '십성군', v: Object.keys(g).map(function (x) { return x + ' ' + Math.round(g[x]) + '%'; }).join(' · ') + ' (가장 큰 것: ' + sd.dominantGroup + ')' });
    E.push({ k: '신강/신약', v: sd.strength.zone + ' (득령 ' + (sd.strength.deukryeong ? '○' : '×') + ' · 득지 ' + (sd.strength.deukji ? '○' : '×') + ' · 득세 ' + (sd.strength.deukse ? '○' : '×') + ')' });
    if (sd.roots) E.push({ k: '통근', v: '원국 통근 ' + sd.roots.level + ' (' + Math.round(sd.roots.score) + '점)' });
    if (sd.usefulElements) E.push({ k: '용신', v: '용신 ' + sd.usefulElements.yong + (sd.usefulElements.hee ? ' · 희신 ' + sd.usefulElements.hee : '') + ' (' + (sd.usefulElements.school || '') + ')' });
    try { var jo = ch.yongAll && ch.yongAll.johu; if (jo && jo.applicable) E.push({ k: '조후', v: '조후 용신 ' + ['목', '화', '토', '금', '수'][jo.yong] + ' (계절의 한난·조습 균형 기준)' }); } catch (e) { }
    if (dw) E.push({ k: '현재 대운', v: dw.ganzhi + ' (' + dw.startYear + '–' + dw.endYear + ') · 천간 ' + dw.stemTG + ' · 지지 ' + dw.branchTG + ' · ' + (SEA[dw.season] || '') + ' · 상태 ' + dw.condition });
    if (sw) E.push({ k: '올해 세운', v: sw.year + '년 ' + sw.ganzhi + ' · 천간 ' + sw.stemTG + ' · 지지 ' + sw.branchTG + ' · ' + sw.label });
    return E;
  }

  /* ── 6. 시간축 카드(엔진 실데이터 → 현실 언어) ───────────────────────────────────── */
  var ROLE = { opportunity: 'expand', expansion: 'expand', harvest: 'harvest', accumulation: 'prepare', transition: 'change', defense: 'protect' };
  var ROLE_TXT = { expand: '확장하기 좋은 구간', harvest: '성과를 굳히는 구간', prepare: '준비하고 쌓는 구간', change: '가장 큰 전환이 올 수 있는 구간', protect: '지키는 것이 중요한 구간' };
  function groupYears(years) { // 이웃한 같은 역할의 해를 한 구간으로 묶는다
    var out = [];
    years.forEach(function (y) { var r = ROLE[y.season]; if (!r) return; var l = out[out.length - 1]; if (l && l.role === r && y.year === l.toYear + 1) { l.toYear = y.year; l.toAge = y.age; } else out.push({ role: r, fromYear: y.year, toYear: y.year, fromAge: y.age, toAge: y.age }); });
    return out.map(function (g) { g.text = ROLE_TXT[g.role]; g.range = g.fromYear === g.toYear ? g.fromYear + '년' : g.fromYear + '~' + g.toYear + '년'; return g; });
  }
  /** 앞으로 N년(기본 10): 확장·전환·방어·준비 구간. */
  function future(Mn, ch, sd, now, n) {
    n = n || 10; var Y = sd.nowYear, ys = yearsOf(Mn, ch, Y, Y + n - 1, now), groups = groupYears(ys), pick = function (r) { return groups.filter(function (g) { return g.role === r; }); };
    var cut = function (k) { return ys.slice(0, k).map(function (y) { return y.year + '년 · ' + (y.seasonName || '-'); }); };
    return { years: ys, groups: groups, expand: pick('expand'), change: pick('change'), protect: pick('protect'), prepare: pick('prepare'), harvest: pick('harvest'), next3: cut(3), next5: cut(5), next10: cut(10),
      caution: '구간은 시기의 성격을 말할 뿐, 특정한 사건이 일어난다는 뜻이 아닙니다.' };
  }
  /** "언제 움직임이 커지나": 분야 점수가 높은 해를 구간으로. 두드러진 해가 없으면 없다고 말한다. */
  function timing(Mn, ch, sd, now, field, soc) {
    if (field === 'marriage' || field === 'relation') return socialTiming(sd, soc, field);
    var Y = sd.nowYear, ys = yearsOf(Mn, ch, Y, Y + 9, now).filter(function (y) { return y.fields[field]; }), sc = ys.map(function (y) { return y.fields[field].score; }).sort(function (a, b) { return a - b; });
    if (!ys.length) return { field: field, available: false, windows: [], line: '이 분야의 시기 계산 값을 불러오지 못했습니다.' };
    var q75 = sc[Math.floor(sc.length * 0.75)], th = Math.max(55, q75), hit = ys.filter(function (y) { return y.fields[field].score >= th; });
    var words = { money: ['돈의 움직임이 커질 수 있는', '돈 이야기가 크게 두드러지는 해가 뚜렷하지 않습니다. 지금 수입 구조를 다듬는 꾸준한 구간으로 보세요.'], career: ['일의 움직임이 커질 수 있는', '일에서 두드러지는 해가 뚜렷하지 않습니다. 전문성을 꾸준히 쌓는 구간으로 보세요.'], love: ['인연과 관계의 변화가 커질 수 있는', '인연의 움직임이 두드러지는 해가 뚜렷하지 않습니다. 지금 관계를 돌보는 구간으로 보세요.'] }[field] || ['움직임이 커질 수 있는', ''];
    var wins = []; hit.forEach(function (y) { var l = wins[wins.length - 1]; if (l && y.year === l.toYear + 1) { l.toYear = y.year; l.toAge = y.age; } else wins.push({ fromYear: y.year, toYear: y.year, fromAge: y.age, toAge: y.age }); });
    wins.forEach(function (w) { w.range = w.fromYear === w.toYear ? w.fromYear + '년' : w.fromYear + '~' + w.toYear + '년'; });
    return { field: field, available: true, windows: wins, years: ys.map(function (y) { return { year: y.year, age: y.age, score: y.fields[field].score, band: y.fields[field].band }; }), threshold: th,
      line: wins.length ? '앞으로 10년 중 ' + words[0] + ' 해는 ' + wins.map(function (w) { return w.range; }).join(', ') + '입니다.' : words[1], caution: '사건을 예언하는 것이 아니라 "살펴볼 만한 시기"를 가리킵니다.' };
  }

  function socialTiming(sd, soc, field) { // 관계·결혼: AI(또는 규칙) 추정. 출처를 함께 돌려준다
    if (!soc) return { field: field, available: false, windows: [], line: '이 분야의 시기 추정값을 불러오지 못했습니다.' };
    var Y = sd.nowYear, d = soc[field], src = soc.source, ys = Object.keys(d.years).map(Number).filter(function (y) { return y >= Y && y <= Y + 9; }).sort(function (a, b) { return a - b; }).map(function (y) { return { year: y, score: d.years[y], band: levelWord(d.years[y]) }; });
    var q = ys.map(function (x) { return x.score; }).sort(function (a, b) { return a - b; }), th = Math.max(58, q[Math.floor(q.length * 0.75)] || 58);
    var wins = field === 'marriage' ? d.windows : windowsOf(ys.map(function (x) { return { y: x.year, v: x.score }; }), th, Y, Y + 9);
    wins.forEach(function (w) { w.range = w.from === w.to ? w.from + '년' : w.from + '~' + w.to + '년'; w.fromYear = w.from; w.toYear = w.to; });
    var nm = field === 'marriage' ? '인연과 관계의 변화가 커질 수 있는' : '사람 사이의 변화가 커질 수 있는';
    return { field: field, available: ys.length > 0, source: src, windows: wins, years: ys, threshold: th, note: d.note || '',
      line: wins.length ? (field === 'marriage' ? '앞으로 15년 안에서 ' : '앞으로 10년 중 ') + nm + ' 구간은 ' + wins.map(function (w) { return w.range; }).join(', ') + '입니다.' : nm + ' 구간이 두드러지게 나타나지 않습니다. 지금 관계를 돌보는 시기로 보세요.',
      caution: (src === 'ai' ? 'AI 가 엔진이 계산한 대운·세운의 십성과 합충을 근거로 추정한 값입니다. ' : '엔진이 계산한 십성·합충을 단순 규칙으로 센 추정값입니다. ') + '사건을 예언하는 것이 아니라 살펴볼 만한 시기를 가리킵니다.' };
  }

  /* ── 7. FINAL — 버릴 것 · 지킬 것 · 시작할 것 ─────────────────────────────────── */
  var KEEP = { '비겁': '내 기준과 내 페이스', '식상': '표현하고 만들어 내는 습관', '재성': '실속과 현실 감각', '관성': '맡은 일을 끝까지 하는 책임감', '인성': '배우고 정리하는 습관' };
  var SEASON_ACT = {
    opportunity: { drop: ['들어온 기회를 전부 붙잡으려는 욕심'], start: ['작게 시험해 볼 새 시도 하나'] },
    expansion: { drop: ['관리 안 되는 곳까지 넓히려는 속도'], start: ['잘 되는 것 하나의 규모를 한 단계 키우기'] },
    harvest: { drop: ['성과가 나왔다고 곧장 크게 벌이는 습관'], start: ['성과를 기록하고 보상·자리를 요청하기'] },
    accumulation: { drop: ['결과가 안 보인다고 방향을 자주 바꾸는 것'], start: ['매주 정해진 시간의 배움·저축'] },
    transition: { drop: ['반응이 없는데 관성으로 계속하는 일'], start: ['유지·축소·종료를 나눠 적는 정리 한 장'] },
    defense: { drop: ['만회하려고 한 번에 크게 거는 선택'], start: ['고정비와 일정을 줄여 여유 확보하기'] },
  };
  /** plan: Remedy.actionPlan 결과({checklist, avoid}) — 있으면 개인화에 쓴다. 항목마다 최대 3개. */
  function action(sd, plan, seasonKey) {
    var s = SEASON_ACT[seasonKey] || SEASON_ACT.accumulation, uniq = function (a) { var o = []; a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o.slice(0, 3); };
    var drop = uniq(s.drop.concat((plan && plan.avoid) || [])), keep = uniq([KEEP[sd.dominantGroup] ? KEEP[sd.dominantGroup] + '을(를) 지키세요' : '', sd.usefulElements ? '내게 힘이 되는 ' + sd.usefulElements.yong + ' 기운의 습관(전통 오행 기준, 참고용)' : '']);
    var start = uniq(s.start.concat((plan && plan.checklist) || []));
    return { drop: drop, keep: keep, start: start, seasonKey: seasonKey };
  }

  /* ── 8. 스토리 구성: 관심 분야 → 이야기 순서 ─────────────────────────────────── */
  /** profile 없이도 순서만 만들 수 있다. 무료/잠금은 모듈 premium 과 (선택 분야의 첫 모듈 체험) 규칙으로 정한다. */
  /** 현재 시기(pos.seasonKey)에 따라 이야기 순서를 사람마다 다르게 조정한다. 계산 결과는 바꾸지 않고 '앞으로 가져오기'만 한다. */
  function personalize(ids, pos) {
    var notes = {}, at = -1, k = pos && pos.seasonKey; ids.forEach(function (id, i) { if (at < 0 && !INTRO_STEPS[id]) at = i; }); if (at < 0 || !k) return { ids: ids, notes: notes };
    var movers = /^(defense|transition)$/.test(k) ? ['future_year', 'future_months', 'future_3_5_10'] : /^(opportunity|expansion|harvest)$/.test(k) ? ids.filter(function (id) { return BY_ID[id] && BY_ID[id].when; }) : [];
    var why = /^(defense|transition)$/.test(k) ? '지금 지키고 정리하는 시기라서 올해·앞날 이야기를 앞에 두었습니다' : '지금 움직임이 커지기 쉬운 시기라서 "언제" 이야기를 앞에 두었습니다';
    var pick = ids.filter(function (id) { return movers.indexOf(id) >= 0; }).slice(0, 2), rest = ids.filter(function (id) { return pick.indexOf(id) < 0; });
    if (!pick.length) return { ids: ids, notes: notes };
    var head = rest.slice(0, at + 1), tail = rest.slice(at + 1); pick.forEach(function (id) { notes[id] = why; });
    return { ids: head.concat(pick, tail), notes: notes };
  }
  function flow(interestId, o) {
    o = o || {}; var ids = FLOWS[interestId] || FLOWS.future, seen = {}, firstDeep = null, steps = [], pz = personalize(ids, o.pos); ids = pz.ids;
    ids.forEach(function (id) {
      if (seen[id]) return; seen[id] = 1;
      var m = INTRO_STEPS[id] || BY_ID[id]; if (!m) return;
      var isIntro = !!INTRO_STEPS[id], free = isIntro || m.premium === false;
      if (!isIntro && free && firstDeep == null) firstDeep = id;
      // 선택 분야 일부 체험: 첫 심화 모듈만 무료. 그 외 premium:false(공통 필수)인 행동 전략은 마지막에 요약만 열린다
      steps.push({ note: pz.notes[id] || '', id: id, kind: isIntro ? id : (m.gen && !m.chapters.length ? 'gen' : 'chapters'), title: m.title, sub: m.sub || '', question: m.question || '', chapters: (m.chapters || []).slice(), gen: m.gen || null, when: !!m.when, free: free, premium: !free, proxy: !!m.proxy });
    });
    // 무료 체험은 "도입 2 + 분야 첫 모듈 1 + 행동 전략 요약"으로 제한한다
    var firstFound = false; steps.forEach(function (s) { if (s.kind === 'life' || s.kind === 'here') return; if (s.id === 'act_remedy') { s.free = true; s.premium = false; return; } if (!firstFound && s.free) { firstFound = true; } else { s.free = false; s.premium = true; } });
    return { interest: interestId, steps: steps, order: steps.map(function (s) { return s.id; }) };
  }
  /** 관리자 "생성된 이야기 순서" — 번호·제목·열림 여부. */
  function preview(interestId, pos) { return flow(interestId, { pos: pos }).steps.map(function (s, i) { return { no: i + 1, note: s.note, id: s.id, title: s.title, sub: s.sub, free: s.free, source: s.chapters.length ? '챕터 ' + s.chapters.join('+') : s.gen ? '엔진 시간축(' + s.gen + ')' : '내장 화면' }; }); }

  /** StoryProfile — 명세 §32 형태. 계산은 이미 끝난 값(sd)·엔진(Mn, ch)에서 읽는다. */
  function profile(Mn, ch, sd, o) {
    o = o || {}; var now = o.now || Date.now(), interest = o.interest || 'future', pos = position(Mn, ch, sd, now), fl = flow(interest, { pos: pos });
    return { birthData: sd.birth, gender: sd.gender, currentYear: sd.nowYear, currentAge: pos.age, primaryInterest: interest, lifePhase: { key: pos.seasonKey, name: pos.seasonName, headline: pos.headline },
      storyModules: fl.steps, insights: { decadeCount: ch.daeun.list.length, topCareer: sd.career && sd.career.top }, actions: action(sd, o.plan, pos.seasonKey), position: pos };
  }

  R.StoryDirector = { personalize: personalize, social: social, aiPayload: aiPayload, mergeSocial: mergeSocial, attachSocial: attachSocial, FIELDS: FIELDS, SEASON: SEASON, INTERESTS: INTERESTS, MODULES: MODULES, FLOWS: FLOWS, byId: BY_ID, chapterMap: chapterMap, lifeMap: lifeMap, yearsOf: yearsOf, monthsOf: monthsOf, position: position, evidence: evidence,
    future: future, timing: timing, yearsOf: yearsOf, monthsOf: monthsOf, action: action, flow: flow, preview: preview, profile: profile, levelWord: levelWord, FIELD_NOW: FIELD_NOW };
})(typeof window !== 'undefined' ? window : globalThis);
