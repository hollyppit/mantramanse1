// 온보딩 데이터·순수 로직 (화면 없음 — node 테스트에서 그대로 불러 검증한다):  node tests/onboard-sim.js
//   ① 연구·유명인 사례(랜덤 후킹)  ② 동양 명리학 소개 3장면  ③ 무협 슬라이드 툰 6장면  ④ 호칭 '귀인' 공통 설정  ⑤ 출생정보 입력 검증
// 관리자가 /api/onboarding 으로 덮어쓴 값이 있으면 merge() 로 이 기본값 위에 얹는다. 계산·점수는 여기서 만들지 않는다 — 날짜 검증은 엔진(Manse)에 맡긴다.
(function (root) {
  'use strict';

  /* ── 호칭 ─────────────────────────────────────────────────────
     세계관 속 존칭. 성별과 관계없이 같고, 특정 길신(吉神)이나 타고난 운명을 단정하는 뜻이 아니다.
     바꾸려면 config.honorific 한 곳만 바꾼다(관리자 "온보딩" 탭). */
  var DEFAULT_HONORIFIC = '귀인';
  var FORBIDDEN_TITLES = ['대공', '소협', '대협']; // 이번 개편에서 쓰지 않기로 한 호칭
  function honorific(cfg) { var h = cfg && typeof cfg.honorific === 'string' ? cfg.honorific.trim() : ''; return h && FORBIDDEN_TITLES.indexOf(h) < 0 ? h.slice(0, 8) : DEFAULT_HONORIFIC; }
  // 이름이 있으면 "[이름] 귀인", 없으면 "귀인"
  function addr(name, cfg) { var n = String(name || '').trim().slice(0, 20); return n ? n + ' ' + honorific(cfg) : honorific(cfg); }
  // 대사 안의 {귀인}(호칭) · {이름귀인}([이름] 귀인) 치환
  function fill(text, name, cfg) { return String(text == null ? '' : text).replace(/\{이름귀인\}/g, addr(name, cfg)).replace(/\{귀인\}/g, honorific(cfg)); }

  /* ── 후킹 사례 ─────────────────────────────────────────────────
     status: draft(초안) → review(검토 중) → verified(검증 완료) → published(공개). 공개 풀에는 published 만 들어간다.
     검증 기록(verifiedNote): 2026-10-11 Crossref(DOI 메타데이터)·보도 자료 대조. 운영 노출 전 관리자가 한 번 더 확인할 것.
     연구 사례는 "연구가 보여 준 것"만 말한다. 시뮬레이션·통계 결과를 사주팔자나 자미두수의 예측력 근거로 쓰지 않는다. */
  var CASES = [
    { id: 'r-pluchino-2018', type: 'research', status: 'published', weight: 1, tags: ['재능', '우연', '성공'],
      title: '가장 성공한 사람이 가장 재능 있는 사람은 아니었다', hook: '재능이 비슷한 사람들 사이에서도 결과는 왜 이렇게 다를까요?',
      body: ['연구진은 가상의 사람 1,000명이 40년 동안 일하는 컴퓨터 시뮬레이션을 돌렸습니다.', '재능은 평범한 종 모양으로 퍼져 있었지만, 부(富)는 소수에게 크게 쏠렸습니다.', '꼭대기에 선 이는 최고 재능자가 아니라 운 좋은 기회가 연달아 닿은 평범한 재능의 사람이었습니다.'],
      caveat: '컴퓨터 시뮬레이션이 보여 준 모델이며, 실제 한 사람의 인생을 예측한다는 뜻은 아닙니다.',
      who: 'A. Pluchino · A. E. Biondo · A. Rapisarda', year: 2018, source: { label: 'Advances in Complex Systems 21(3&4)', doi: '10.1142/S0219525918500145', url: 'https://doi.org/10.1142/S0219525918500145' },
      verifiedNote: '2026-10-11 Crossref 에서 제목·저자·연도·저널 확인', visual: 'bell' },
    { id: 'r-liu-2018', type: 'research', status: 'published', weight: 1, tags: ['타이밍', '전성기', '커리어'],
      title: '성과는 인생의 한 시기에 몰려서 터진다', hook: '사람마다 전성기가 찾아오는 시점은 왜 다를까요?',
      body: ['연구진은 예술가·영화감독·과학자 수천 명의 경력을 시간순으로 분석했습니다.', '대부분은 경력 중 한 번, 가장 큰 성과가 짧은 기간에 연달아 나오는 "핫 스트릭(hot streak)"을 겪었습니다.', '그 시기가 경력의 처음, 중간, 끝 어디에 오는지는 사람마다 달랐습니다.'],
      caveat: '과거 경력 자료를 분석한 결과이며, 언제 전성기가 온다는 예측이 아닙니다.',
      who: 'L. Liu · Y. Wang · R. Sinatra · A.-L. Barabási 외', year: 2018, source: { label: 'Nature 559, 396–399', doi: '10.1038/s41586-018-0315-8', url: 'https://doi.org/10.1038/s41586-018-0315-8' },
      verifiedNote: '2026-10-11 Crossref 에서 제목·저자·연도·저널 확인', visual: 'streak' },
    { id: 'r-salganik-2006', type: 'research', status: 'published', weight: 1, tags: ['우연', '예측불가', '성공'],
      title: '똑같은 노래도 세계마다 다른 히트곡이 되었다', hook: '실력이 같아도 어떤 것은 뜨고 어떤 것은 묻히는 이유는 무엇일까요?',
      body: ['1만 4천여 명이 처음 듣는 노래를 내려받는 온라인 실험이 열렸습니다.', '참가자들은 서로 영향을 주고받지 못하는 여러 개의 "세계"로 나뉘었습니다.', '같은 곡이라도 세계마다 인기 순위가 크게 달랐고, 다른 사람의 선택이 보일수록 쏠림과 예측 불가능성이 커졌습니다.'],
      caveat: '음악 시장에서의 실험이며, 모든 성공의 원인이 우연이라는 뜻은 아닙니다.',
      who: 'M. J. Salganik · P. S. Dodds · D. J. Watts', year: 2006, source: { label: 'Science 311(5762), 854–856', doi: '10.1126/science.1121066', url: 'https://doi.org/10.1126/science.1121066' },
      verifiedNote: '2026-10-11 Crossref 에서 제목·저자·연도·저널 확인', visual: 'worlds' },
    { id: 'r-chetty-2014', type: 'research', status: 'published', weight: 1, tags: ['환경', '기회', '지역'],
      title: '어디서 자랐는지가 오를 수 있는 계단을 바꾼다', hook: '같은 노력이라도 어떤 환경에서는 더 멀리 가는 이유는 무엇일까요?',
      body: ['연구진은 미국 수백 개 지역에서 부모 소득과 자녀의 성인기 소득을 연결해 분석했습니다.', '아이가 자란 지역에 따라 소득 계층을 올라갈 가능성이 크게 달랐습니다.', '개인의 재능과 노력 밖에서 주어지는 환경도 결과에 영향을 준다는 뜻입니다.'],
      caveat: '미국 자료를 분석한 연구이며, 인과의 크기는 지역과 시기에 따라 다를 수 있습니다.',
      who: 'R. Chetty · N. Hendren · P. Kline · E. Saez', year: 2014, source: { label: 'The Quarterly Journal of Economics 129(4)', doi: '10.1093/qje/qju022', url: 'https://doi.org/10.1093/qje/qju022' },
      verifiedNote: '2026-10-11 Crossref 에서 제목·저자(Chetty·Hendren·Kline 외)·연도·저널 확인', visual: 'steps' },
    { id: 'c-ford-starwars', type: 'celebrity', status: 'published', weight: 1, tags: ['우연', '기회', '타이밍'],
      title: '목수 일을 하던 배우, 오디션장에서 대사를 읽다', hook: '기회는 때로 전혀 다른 일을 하던 자리로 찾아옵니다.',
      body: ['1970년대 중반, 해리슨 포드는 배우 일이 뜸해 목수로 생계를 이어 가고 있었습니다.', '「스타워즈」 캐스팅 때 그는 오디션 후보들의 상대역으로 대사를 읽어 주는 일을 맡았습니다.', '그 모습을 지켜본 감독 조지 루카스는 결국 그를 한 솔로 역으로 택했습니다.'],
      caveat: '세부 경위(문 작업 등)는 보도마다 조금씩 다르게 전해집니다. 목수 생활, 상대역 대사 읽기, 캐스팅 결과는 공통된 내용입니다.',
      who: '해리슨 포드', year: 1976, source: { label: 'Harrison Ford — Wikipedia / 스타워즈 캐스팅 관련 보도', url: 'https://en.wikipedia.org/wiki/Harrison_Ford' },
      verifiedNote: '2026-10-11 여러 보도 대조(목수 생활·상대역 대사 읽기·캐스팅 결과). 문 작업 일화는 출처마다 달라 본문에서 뺌', visual: 'door' },
    { id: 'c-cranston-breakingbad', type: 'celebrity', status: 'published', weight: 1, tags: ['편견', '기회', '끈기'],
      title: '시트콤 아빠 이미지가 걸림돌이었던 배우', hook: '오래 쌓은 이미지가 기회를 막을 때, 누군가는 다른 모습을 알아봅니다.',
      body: ['브라이언 크랜스턴은 시트콤 「말콤 인 더 미들」의 아빠 역으로 널리 알려져 있었습니다.', '「브레이킹 배드」 제작진 일부는 그 이미지 때문에 주인공 월터 화이트 역을 망설였습니다.', '제작자 빈스 길리건은 과거 「X파일」 출연 장면을 근거로 그를 설득했고, 이 역은 그의 대표작이 되었습니다.'],
      caveat: '다른 배우가 먼저 거절했다는 소문은 당사자가 부인하는 등 확인되지 않아 싣지 않았습니다.',
      who: '브라이언 크랜스턴', year: 2008, source: { label: 'Walter White (Breaking Bad) — Wikipedia', url: 'https://en.wikipedia.org/wiki/Walter_White_(Breaking_Bad)' },
      verifiedNote: '2026-10-11 보도 대조(시트콤 이미지 우려·길리건의 설득). 다른 배우 거절설은 확인 안 돼 제외', visual: 'mask' },
    // 아래는 공개하지 않는다: 확인 전 자료는 검토 중으로 둔다.
    { id: 'r-wiseman-luck', type: 'research', status: 'review', weight: 1, tags: ['행운', '주의력', '태도'],
      title: '운이 좋다고 믿는 사람은 기회를 더 잘 알아본다', hook: '운이 좋은 사람은 정말 보는 것이 다를까요?',
      body: ['리처드 와이즈먼은 스스로 운이 좋다/나쁘다고 여기는 사람들을 비교하는 실험을 했습니다.', '신문 속 사진 수를 세게 했을 때 운이 좋다고 여기는 사람들이 지면 속 뜻밖의 안내문을 더 자주 알아봤다고 보고했습니다.'],
      caveat: '자기 보고와 행동 실험 중심의 연구이며 효과의 크기는 논쟁이 있을 수 있습니다.',
      who: '리처드 와이즈먼', year: 2003, source: { label: 'The Luck Factor (2003)', url: '' }, verifiedNote: '원문 확인 전 — 검토 중', visual: 'eye' },
    { id: 'c-pacino-godfather', type: 'celebrity', status: 'review', weight: 1, tags: ['기회', '믿음'],
      title: '무명 배우를 끝까지 고집한 감독', hook: '아무도 몰랐던 사람을 알아본 한 사람.',
      body: ['「대부」 제작사는 마이클 역에 더 이름난 배우를 원했다고 전해집니다.', '감독 프랜시스 포드 코폴라는 알 파치노를 밀어붙였다고 알려져 있습니다.'],
      caveat: '', who: '알 파치노', year: 1972, source: { label: '전기·인터뷰 확인 전', url: '' }, verifiedNote: '출처 확인 전 — 검토 중', visual: 'door' },
  ];

  /* ── 동양 명리학 소개 (3장면) ─ 관리자가 제목·본문·이미지·영상을 바꿀 수 있다 ── */
  var INTRO = [
    { id: 'time', enabled: true, title: '사람마다 꽃이 피는 때가 다르듯, 인생의 흐름도 저마다 다릅니다.', body: '동양의 명리학은 사람이 태어난 연월일시를 바탕으로 타고난 기질과 시간에 따른 변화의 흐름을 해석해 온 전통 체계입니다.', sub: '', glyph: '時', image: '', video: '', theme: 'mountain' },
    { id: 'pillars', enabled: true, title: '태어난 순간의 네 기둥, 그리고 시간이 흐르며 바뀌는 운.', body: '사주팔자는 태어난 해·달·날·시각을 네 기둥으로 살펴봅니다. 여기에 10년 단위의 대운과 해마다 달라지는 세운 등을 함께 해석합니다.', sub: '', glyph: '柱', image: '', video: '', theme: 'pillars' },
    { id: 'two', enabled: true, title: '하나의 인생, 두 가지 해석의 시선.', body: '만트라는 사주팔자와 자미두수를 결합해 성향, 직업, 재물, 관계, 인생의 시기 등을 서로 다른 전통적 관점에서 살펴봅니다.', sub: '왜 그런 해석이 나왔는지, 현실에서 무엇을 참고할 수 있는지까지.', glyph: '命', image: '', video: '', theme: 'two' },
  ];
  var INTRO_LAST = { line: '그렇다면 지금, 당신은 어떤 운의 흐름에 있을까요?', cta: '나의 운 확인하기' };
  var INTRO_NOTICE = '위 연구·사례와 명리학은 서로 다른 성격의 이야기입니다. 명리학은 전통 해석 체계이며, 현대 연구가 그 예측력을 입증한 것은 아닙니다.';

  /* ── 무협 슬라이드 툰 '귀인의 천명록' (6장면) ───────────────────
     lines: 수련생 대사(무협 사극체). hint/error/button 은 현대 한국어. field 는 입력 종류. face 는 표정 키. */
  var SCENES = [
    { id: 'arrive', enabled: true, field: 'name', face: 'greet', theme: 'gate', title: '귀인의 등장', lines: ['오오… 마침내 오셨군요, {귀인}!', '소인이 {귀인}의 천명을 살피라는 명을 받았사옵니다!', '우선 {귀인}의 존함부터 여쭙겠사옵니다!'], hint: '이름 또는 별호를 입력하세요', button: '다음', image: '', bg: '' },
    { id: 'day', enabled: true, field: 'date', face: 'ask', theme: 'scroll', title: '강호에 강림한 날', lines: ['{이름귀인}께서 이 강호에 강림하신 날은 언제이옵니까?', '그날의 하늘을 알아야 천기를 펼칠 수 있사옵니다!'], hint: '생년월일과 양력·음력을 선택하세요', button: '다음', image: '', bg: '' },
    { id: 'time', enabled: true, field: 'time', face: 'shock', theme: 'stars', title: '천시를 밝히다', lines: ['{귀인}! 탄생하신 시각도 중요하옵니다!', '혹시 몇 시 몇 분에 첫 울음을 터뜨리셨는지 기억하시옵니까?'], hint: '출생 시각을 모르면 일부 사주 및 자미두수 해석이 제한될 수 있습니다.', unknownLines: ['허억… 천기가 안개에 가려졌군요!', '허나 염려 마시옵소서! 알 수 있는 것부터 살펴보겠사옵니다!'], button: '다음', image: '', bg: '' },
    { id: 'place', enabled: true, field: 'place', face: 'ask', theme: 'map', title: '탄생의 땅', lines: ['하늘의 때는 알았으니, 이제 땅의 기록을 살필 차례이옵니다!', '{귀인}께서 처음 강림하신 고장은 어디이옵니까?'], hint: '태어난 지역은 시간 보정(경도)에 사용됩니다.', button: '다음', image: '', bg: '' },
    { id: 'gender', enabled: true, field: 'gender', face: 'serious', theme: 'ledger', title: '마지막 명부', lines: ['{귀인}! 이제 마지막 한 가지만 더 여쭙겠사옵니다.', '명식을 바르게 세우기 위한 마지막 기록이옵니다!'], hint: '성별은 대운이 흐르는 방향(순행·역행)을 계산할 때만 사용합니다. 다른 용도로 쓰지 않습니다.', button: '다음', image: '', bg: '' },
    { id: 'confirm', enabled: true, field: 'confirm', face: 'proud', theme: 'reveal', title: '천기의 문이 열리다', lines: ['{귀인}! 모든 기록이 모였사옵니다!', '이제 소인이 천기를 펼쳐 보이겠사옵니다!'], hint: '입력한 정보를 확인해 주세요.', button: '나의 사주 확인하기', image: '', bg: '' },
  ];
  var REVEAL_LINES = ['대, 대단하옵니다, {귀인}!!', '마침내 {귀인}의 명식이 완성되었사옵니다!', '이제 {귀인}께서 타고난 기질과 운의 흐름을 살펴보시지요!'];
  var FACES = { greet: '반가움', ask: '궁금함', shock: '깜짝', serious: '진지함', proud: '뿌듯함', worry: '걱정' };

  var DEFAULTS = { honorific: DEFAULT_HONORIFIC, weights: { research: 60, celebrity: 40 }, cases: CASES, intro: INTRO, introLast: INTRO_LAST, scenes: SCENES, revealLines: REVEAL_LINES };

  /* ── 설정 병합 ────────────────────────────────────────────────
     서버 값(관리자 저장본)을 기본값 위에 얹는다. 장면은 id 로 맞춰 문구·이미지만 덮어쓰고, 입력 종류(field)와 계산 연결은 코드가 지킨다
     (관리자가 필수 입력 필드를 지우거나 바꾸지 못하게). 사례는 서버가 정한 목록·상태를 그대로 따른다(기본 사례 중 서버에 없는 것은 비공개). */
  var REQUIRED_FIELDS = ['name', 'date', 'time', 'place', 'gender', 'confirm'];
  function merge(base, ov) {
    base = base || DEFAULTS; var out = JSON.parse(JSON.stringify(base)); if (!ov || typeof ov !== 'object') return out;
    if (typeof ov.honorific === 'string') out.honorific = honorific(ov);
    if (ov.weights && typeof ov.weights === 'object') { var r = +ov.weights.research, c = +ov.weights.celebrity; if (r >= 0 && c >= 0 && r + c > 0) out.weights = { research: r, celebrity: c }; }
    if (Array.isArray(ov.cases)) out.cases = ov.cases.filter(function (x) { return x && x.id && x.title; });
    if (Array.isArray(ov.intro)) out.intro = out.intro.map(function (d) { var o = ov.intro.filter(function (x) { return x && x.id === d.id; })[0]; return o ? Object.assign({}, d, pick(o, ['title', 'body', 'sub', 'image', 'video', 'enabled', 'glyph'])) : d; });
    if (Array.isArray(ov.scenes)) out.scenes = out.scenes.map(function (d) { var o = ov.scenes.filter(function (x) { return x && x.id === d.id; })[0]; return o ? Object.assign({}, d, pick(o, ['title', 'lines', 'hint', 'unknownLines', 'button', 'face', 'image', 'bg', 'enabled']), { field: d.field }) : d; });
    // 필수 입력 단계는 끌 수 없다
    out.scenes.forEach(function (s) { if (REQUIRED_FIELDS.indexOf(s.field) >= 0) s.enabled = true; });
    if (ov.introLast && typeof ov.introLast === 'object') out.introLast = Object.assign({}, out.introLast, pick(ov.introLast, ['line', 'cta']));
    if (Array.isArray(ov.revealLines) && ov.revealLines.length) out.revealLines = ov.revealLines.map(String).slice(0, 5);
    return out;
  }
  function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; }); return r; }

  /* ── 사례 고르기 ──────────────────────────────────────────────
     공개(published) 사례만. 유형 가중치(연구 60 : 유명인 40)로 유형을 먼저 정하고, 그 안에서 사례 가중치로 고른다.
     직전에 본 사례는 다른 후보가 있는 한 제외한다. rnd 를 주입하면 재현된다. 해당 유형에 사례가 없으면 다른 유형으로 넘어간다. */
  function publicCases(cases) { return (cases || []).filter(function (c) { return c && c.status === 'published' && c.title && c.body && c.body.length && c.source && (c.source.doi || c.source.url); }); }
  function pickCase(cfg, opts) {
    opts = opts || {}; var rnd = opts.rnd || Math.random, recent = opts.recent || [], pool = publicCases(cfg.cases);
    if (!pool.length) return null;
    var fresh = pool.filter(function (c) { return recent.indexOf(c.id) < 0; });
    if (!fresh.length) fresh = pool.filter(function (c) { return c.id !== recent[0]; }); if (!fresh.length) fresh = pool;
    var w = cfg.weights || { research: 60, celebrity: 40 }, types = ['research', 'celebrity'].filter(function (t) { return fresh.some(function (c) { return c.type === t; }); });
    var tw = types.map(function (t) { return Math.max(0, +w[t] || 0); }), sum = tw.reduce(function (a, b) { return a + b; }, 0);
    var type; if (sum <= 0) type = types[0]; else { var x = rnd() * sum; type = types[types.length - 1]; for (var i = 0; i < types.length; i++) { if (x < tw[i]) { type = types[i]; break; } x -= tw[i]; } }
    var cand = fresh.filter(function (c) { return c.type === type; }), cw = cand.map(function (c) { return Math.max(0.01, +c.weight || 1); }), cs = cw.reduce(function (a, b) { return a + b; }, 0), y = rnd() * cs;
    for (var j = 0; j < cand.length; j++) { if (y < cw[j]) return cand[j]; y -= cw[j]; }
    return cand[cand.length - 1];
  }

  /* ── 출생정보 입력 검증 ───────────────────────────────────────
     양력은 달력으로, 음력(윤달 포함)은 엔진의 lunarToSolar 로 검증한다. M = Manse. → { ok, msg, solar:{y,m,d} } */
  function validateDate(M, d) {
    var y = +d.year, m = +d.month, dd = +d.day;
    if (!(y > 0) || !(m > 0) || !(dd > 0)) return { ok: false, msg: '생년월일을 모두 선택해 주세요.' };
    if (M && (y < M.MIN_Y || y > M.MAX_Y)) return { ok: false, msg: M.MIN_Y + '년부터 ' + M.MAX_Y + '년 사이의 날짜만 계산할 수 있습니다.' };
    if (d.calendar === 'lunar') {
      if (!M) return { ok: false, msg: '계산 엔진을 불러오는 중입니다.' };
      try { var s = M.lunarToSolar(y, m, dd, !!d.leap); return { ok: true, solar: { y: s[0] != null ? s[0] : s.y, m: s[1] != null ? s[1] : s.m, d: s[2] != null ? s[2] : s.d } }; } catch (e) { return { ok: false, msg: (e && e.message) || '존재하지 않는 음력 날짜입니다.' }; }
    }
    var dt = new Date(Date.UTC(y, m - 1, dd));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== dd) return { ok: false, msg: y + '년 ' + m + '월에는 ' + dd + '일이 없습니다.' };
    if (dt.getTime() > Date.now() + 86400000) return { ok: false, msg: '태어난 날이 오늘보다 뒤입니다. 날짜를 확인해 주세요.' };
    return { ok: true, solar: { y: y, m: m, d: dd } };
  }
  function validateTime(d) {
    if (d.hourUnknown) return { ok: true };
    var h = d.hour, mi = d.minute; if (h === '' || h == null || isNaN(+h)) return { ok: false, msg: '시를 선택하거나 "시각을 몰라요"를 눌러 주세요.' };
    if (+h < 0 || +h > 23) return { ok: false, msg: '시는 0~23 사이로 입력해 주세요.' };
    if (mi !== '' && mi != null && (+mi < 0 || +mi > 59)) return { ok: false, msg: '분은 0~59 사이로 입력해 주세요.' };
    return { ok: true };
  }
  // 입력 초안 → 허브 저장 형태(Hub.profile.save 가 받는 모양). 시각을 모르면 임의 시각을 만들지 않고 hourUnknown 으로 표시한다.
  function toProfile(d, place) {
    var unknown = !!d.hourUnknown || d.hour === '' || d.hour == null;
    return { name: String(d.name || '').trim().slice(0, 20), gender: d.gender, calendar: d.calendar === 'lunar' ? 'lunar' : 'solar', leap: d.calendar === 'lunar' && !!d.leap, year: +d.year, month: +d.month, day: +d.day,
      hour: unknown ? 12 : +d.hour, minute: unknown ? 0 : (+d.minute || 0), hourUnknown: unknown, city: place ? place.name : '서울', lon: place ? +place.lon : 126.98, country: d.country || 'KR', timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };
  }

  // 한국 지역(시·도 대표 도시) — 기존 입력 화면과 같은 경도 값. 엔진은 한국 표준시 기준이라 국내 출생을 기본으로 한다.
  var PLACES = [['서울', 126.98], ['부산', 129.08], ['대구', 128.60], ['인천', 126.70], ['광주', 126.85], ['대전', 127.38], ['울산', 129.31], ['세종', 127.29], ['수원', 127.03], ['고양', 126.83], ['성남', 127.14], ['용인', 127.18], ['청주', 127.49], ['천안', 127.15], ['전주', 127.15], ['목포', 126.39], ['여수', 127.66], ['포항', 129.36], ['경주', 129.22], ['안동', 128.73], ['창원', 128.68], ['진주', 128.11], ['춘천', 127.73], ['강릉', 128.90], ['제주', 126.53]].map(function (p) { return { name: p[0], lon: p[1] }; });

  root.Onboard = { DEFAULTS: DEFAULTS, CASES: CASES, INTRO: INTRO, INTRO_LAST: INTRO_LAST, INTRO_NOTICE: INTRO_NOTICE, SCENES: SCENES, REVEAL_LINES: REVEAL_LINES, FACES: FACES, PLACES: PLACES, REQUIRED_FIELDS: REQUIRED_FIELDS, FORBIDDEN_TITLES: FORBIDDEN_TITLES,
    honorific: honorific, addr: addr, fill: fill, merge: merge, publicCases: publicCases, pickCase: pickCase, validateDate: validateDate, validateTime: validateTime, toProfile: toProfile };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Onboard;
})(typeof window !== 'undefined' ? window : globalThis);
