// 타임라인 챕터 감사 결과(json) → 성적표 문서(md)
//   node tools/timeline-chapter-audit.cjs 360   (측정, docs/timeline-chapter-audit.json)
//   node tools/timeline-chapter-audit-report.cjs (문서, docs/TIMELINE_CHAPTER_AUDIT_2026-11-15.md)
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const R = JSON.parse(fs.readFileSync(path.join(root, 'docs/timeline-chapter-audit.json'), 'utf8'));

// ── 사람 판단(2026-11-15, 360명 측정을 읽고 적음). 다시 측정해 수치가 크게 바뀌면 이 부분을 손본다. ──
const JUDGE = {
  // 같은 질문을 주제 장이 더 깊게 다루는 종합풀이 장: 문장은 거의 안 겹치지만(8% 미만) 읽는 사람에게 질문이 반복된다
  mergeHints: {
    self_26: { v: '통합 후보', why: 'career_01(나는 어떤 일을 해야 잘할까)과 같은 질문 — 종합풀이는 요약 + 커리어운 안내로 줄이는 안' },
    self_30: { v: '통합 후보', why: 'wealth_01과 같은 질문(재물 전체·그릇) — self_31과 한 장으로 합치는 안' },
    self_31: { v: '통합 후보', why: 'wealth_01(내 재물 그릇)과 제목까지 같은 질문' },
    self_32: { v: '통합 후보', why: 'wealth_02(어떤 방식으로 돈을 벌까)와 같은 질문 + 서사 없음·근거 부족 100%' },
    self_27: { v: '통합 후보', why: 'love_01(관계)·love_14(인연 시기)와 겹침 — 종합 요약으로 줄이는 안' },
    self_29: { v: '유지', why: 'love_07(배우자 성향)과 질문은 같지만 운명 기록 카드(dossier)가 이 장에만 있음' },
    self_34: { v: '통합 후보', why: 'love_11(자식운)과 같은 질문, deep_children 조각을 두 장이 나눠 씀' },
    self_24: { v: '유지', why: 'career_08과 겹치지만 종합 관점의 “움직일 때” 장으로 서사 규칙·달 순위가 따로 있음' },
    self_37: { v: '보완', why: 'wealth_15·career_15·love_15 개운법과 질문이 같음 — 종합 개운은 세 주제의 처방을 묶는 장으로 역할을 나눌 것' },
    wealth_10: { v: '통합 후보', why: 'wealth_06(큰돈 기회)·wealth_14(재물 타이밍)와 시기 장 셋이 이어짐 — 해(06)·달(10)·10년(14)로 역할을 제목에 드러내거나 둘로 합치는 안' },
    love_14: { v: '보완', why: 'love_08(결혼운 시기)과 시기 장이 둘 — 결혼 시기와 만남 시기로 제목·블록을 가를 것' }
  },
  hiddenPlan: [
    { name: '건강·사고수 (신설 후보 1순위 — 엔진·재료가 가장 많음)', note: '지금은 종합풀이 self_35 한 장(DB 본문 + 건강 지도 블록 + 안전 점검표)뿐이고, 서사 엔진 규칙이 없어 근거 상자 “검수 근거 부족” 100%입니다. 만세력 앱에는 건강 지도(health-body.js)와 사고수 신호(accident-hint.js)가 이미 있는데 타임라인에는 로드조차 되지 않습니다. 의료 예측이 아니라 “생활 리듬·조심할 장면” 톤을 유지합니다(rebuild health 원고의 안전 문구 그대로).', chapters: [
      ['내 몸의 오행 지도 — 타고난 약한 곳과 쏠리는 곳', 'health-body.js read(원국) · sd.fiveElements · Manse.climate(조열·한습)', 'health_01(원고 9) · self_35 건강 지도', '장부 막대 · 약한 곳 TOP 3'],
      ['나는 언제 쉽게 지칠까 — 힘의 세기와 회복 리듬', 'sd.strength · 12운성(unseong-cycle.js) · ch.unified 조후', 'health_02·04·05(원고 24)', '에너지 리듬(12운성 그림)'],
      ['스트레스가 몸으로 오는 길', '십성 묶음(관성·식상 과다) · 일지 합충', 'health_03(원고 8)', '점검표(fx:check)'],
      ['올해·이번 달 몸 챙길 때', 'evaluateDomainLuck health 지수 · health-body read(세운·월운)', 'self_35 healthmap', '12개월 그래프 · 조심할 달 TOP 3'],
      ['사고수 신호 읽기 — 조심할 장면 7가지', 'accident-hint.js(충·형·백호·양인·괴강) · evaluateDomainLuck accident', 'health_06·07(원고 15)', '장면 카드 · 장소(기둥별)'],
      ['앞으로 10년 안전 흐름 + 삼재', 'seunRange × accident 지수 · getSamjae(지금 어떤 장에도 안 씀)', '-', '10년 막대'],
      ['무리한 선택이 위험을 키우는 때', 'calculateVolatility(지금 안 씀) · 대운 교운기', 'health_08(원고 8)', '저울(fx:vs)'],
      ['최고의 관리 vs 최악의 관리', 'fate-blocks fx:scenario · fx:rx', 'health_09·10(원고 17)', '두 갈래 · 처방전']] },
    { name: '전생 (창작 주제 — 사실 단정 금지 안내 유지)', note: '지금은 self_36 한 장(DB 본문 + 운명 기록 카드 dossier_past + deep_past)이고 서사 엔진·근거 값 줄이 없습니다. 원고(creative 01~08, 80편)는 그대로 있고 지금 조립기로 돌리면 94%가 문안을 받습니다. AI 단편(past-story.js, /api/past-story)도 이미 있습니다.', chapters: [
      ['전생의 문이 열리다 — 일주로 본 전생의 얼굴', '일주(ilju-data) · 일간 오행', 'creative_01(원고 10)', '운명 기록 카드'],
      ['어떤 시대·신분이었을까', '년주(조상 자리) · 격국(ch.unified) · 가장 큰 십성', 'creative_02·03(원고 20)', '시대 카드'],
      ['전생에서 가장 중요했던 사람', '배우자성·인성 · 일지 합충', 'creative_04(원고 10)', '인물 카드(fx:profile)'],
      ['가장 빛났던 순간과 가장 큰 실수', '12운성 제왕·사·묘(unseong-cycle.js) · 기신', 'creative_05·06(원고 20)', '두 얼굴(fx:scenario)'],
      ['끝내 이루지 못한 소망 — 이번 생의 숙제', '공망(gongmangOf) · 용신', 'creative_07·08(원고 20)', '편지(fx:letter)'],
      ['전생 단편 이야기', 'past-story.js(AI, 검토 통과 단편)', '-', '네 장면']] },
    { name: '개운법', note: '지금은 종합풀이 self_37 + 주제별 개운 장 3개(wealth_15·career_15·love_15)로 흩어져 있고, 풍수·지역·명당 엔진은 topic-deep(꺼짐) 안에만 연결돼 있습니다. remedy.js(7유형 추천)와 원고 remedy 01~08(78편)이 있습니다.', chapters: [
      ['내 운을 바꾸는 첫 번째 습관', 'sd.usefulElements · ch.unified · remedy.js(action)', 'remedy_01(원고 8)', '처방전(fx:rx)'],
      ['나에게 맞는 운동과 생활 리듬', '조후(climate) · 신강·신약 · remedy.js(exercise)', 'remedy_02(원고 10)', '주간 리듬표'],
      ['나에게 맞는 공부·자기계발', '인성·식상 비중 · 세운 학업 지수(evaluateDomainLuck study)', 'remedy_03(원고 10)', '10년 공부운 막대'],
      ['나를 회복시키는 공간과 방향', 'fengshui-engine.js 팔택·현공(topic-deep td:dirs/td:house)', 'remedy_04(원고 8)', '방향 나침반'],
      ['행운의 지역과 명당', 'region-reading.js · wish-spots.js', 'remedy_05(원고 10)', '지역 순위'],
      ['언제 무엇을 — 30년 개운 지도', 'luck-cycle.js 대운 30년·세운 2년 묶음(지금 타임라인 안 씀)', '-', '30년 띠 그래프'],
      ['앞으로 30일 개운 프로젝트', 'wolun · ilun(일진) · luck-interpret.js', 'remedy_07(원고 10)', '30일 달력'],
      ['돈·사람에서 운을 지키는 법 / 최종 전략', 'remedy.js(people) · 기신 오행', 'remedy_06·08(원고 22)', '점검표·편지']] }
  ],
  priorities: [
    { title: '서사 엔진이 가린 DB 원고의 역할 정하기', why: '서사 엔진이 59장 중 대부분에서 본문의 96~100%를 대신해, DB 원고(925편)는 화면 본문에 거의 나오지 않습니다. 화면에 DB 본문이 그대로 나오는 장은 self_02·28·32·35·36 다섯 장과, 서사 규칙이 일부만 맞는 self_03·wealth_02·career_07·love_04뿐입니다.', do: 'DB 원고를 “서사 규칙이 안 맞을 때의 대체 본문”으로만 쓸지 정하고, 검수·게시 대상을 위 9장으로 줄입니다. 나머지 장은 원고를 손대지 않아도 화면이 바뀌지 않습니다.' },
    { title: '서사가 없는 5장의 근거 상자 보강 (self_02·28·32·35·36)', why: '근거 상자에 내 사주 값 줄이 0%이고, self_28·32·35·36은 “이 질문에 적용할 검수 근거가 아직 충분하지 않습니다” 안내가 100% 나옵니다. 64장 중 가장 약합니다.', do: 'life-narrative 규칙을 이 5장에 추가하거나(브라우저 층, 장 단위 스위치), 최소한 근거 상자에 서사 엔진과 같은 “이 사주에서 확인된 조건” 줄을 붙입니다.' },
    { title: '20세 미만 독자에게 어른 경험 문장', why: '“실제 생활에서는 상사가…”, “퇴근 뒤 외주…”처럼 지금 겪는 일로 말하는 문장이 20세 미만에게 그대로 나옵니다. 30% 넘는 장 20개(self_27 100%, career_03 95%, wealth_08 89%, love_09 87%, wealth_04 74%). 서사 엔진의 youngView는 일부 장만 처리합니다.', do: 'youngView(어른 경험 문장 → 미리 보기 문장) 적용을 서사 59장 전부로 넓히고, 규칙의 life 단계에 age:young 대체 문장을 둡니다.' },
    { title: '65세 이상 독자에게 승진·입사 문장', why: 'career_08 100%(일의 흐름 TOP3 블록의 승진 문구), wealth_04 40%, career_05 36%(입사 전 문화 확인), wealth_02·05·06·10, career_06 약 20%.', do: '깊이 풀이(reading-depth)·포인트(reading-insight)·시기 블록에도 서사 엔진처럼 age:senior 분기를 둡니다.' },
    { title: '같은 사실을 수십 장에서 다시 소개', why: '문장은 장 사이에 한 번도 겹치지 않지만(fact-once 효과), 소개 문형은 남습니다. 한 사람이 64장 동안 “힘이 센/여린 사주” 문형을 평균 31장, “가장 큰 기운”을 22장, “필요한 기운”을 14장에서 읽습니다.', do: '심화 블록의 “이 순위인 이유”·점검표 근거 줄에서 강약·가장 큰 기운 소개를 FactOnce.own 으로 첫 장 한 번만 두고, 이후 장은 결론만 말하게 합니다.' },
    { title: '종합풀이와 주제 장의 같은 질문 정리', why: '종합풀이 19장 중 9장이 재물·커리어·인연 장과 같은 질문입니다(self_26↔career_01, self_31↔wealth_01, self_32↔wealth_02, self_34↔love_11 등). 문장은 달라도 같은 질문을 두 번 읽습니다.', do: '6절 통합 후보 중 합칠 장을 고르고, 남길 종합풀이 장은 “요약 + 주제 장 안내”로 짧게 바꿉니다.' },
    { title: 'topic-deep 켜기 검토', why: '이미 만든 주제 심화 블록 25장이 꺼져 있습니다. 켜면 장마다 평균 150~2,300자가 붙고 직업(wealth-career)·궁합(compat-pair)·풍수·지역·명당 엔진이 처음으로 타임라인에 들어옵니다.', do: '관리자 운세 환경 탭에서 스위치만 켜면 됩니다(코드 변경 없음). 켜기 전 25장 화면 검수가 필요합니다.' },
    { title: '안 쓰는 엔진을 맞는 장에 연결', why: 'luck-cycle(30년 사이클)·unseong-cycle(12운성 생명주기)·gyeok-structure(격국 분석)·health-body·accident-hint는 타임라인에 로드조차 안 되고, engine.js의 삼재(getSamjae)·변동성(calculateVolatility)·운 점수(evaluateLuck)·자미두수도 어떤 장도 읽지 않습니다.', do: 'luck-cycle → self_20·self_33(인생·말년 흐름), unseong-cycle → self_20 에너지 리듬, gyeok-structure → self_03·self_02(기질·사양표), health-body·accident-hint → self_35(신설 건강 주제의 바탕).' },
    { title: '얇은 장 보강 (10% 이상)', why: '본문 400자 미만이거나 DB·서사 둘 다 없는 경우가 self_02 27%, wealth_05·career_15 13%, wealth_02·love_06 12%, self_37 11%.', do: '해당 장 서사 규칙의 조건 폭을 넓히거나 넓은 조건의 바탕 규칙을 하나씩 추가합니다.' },
    { title: '비공개 3주제 중 건강·사고수부터 신설', why: '엔진(건강 지도·사고수 신호·분야 지수 health/accident·삼재)과 원고(health 01~10, 81편)가 가장 많이 준비돼 있습니다.', do: '7절 후보 8장을 life-narrative 규칙 + fate-blocks 방식으로 브라우저 층에 만들고, 장 단위 스위치로 공개합니다.' }
  ]
};
Object.assign(R, JUDGE);
fs.writeFileSync(path.join(root, 'report/admin/data/timeline-chapter-audit.json'), JSON.stringify(R));
const pct = v => v == null ? '-' : (100 * v).toFixed(0) + '%', p0 = v => v ? pct(v) : '-';
const TOPIC = { self: '종합풀이', wealth: '재물운', career: '커리어운', love: '인연운' };
const out = [], W = s => out.push(s == null ? '' : s);
const rows = R.rows, byId = Object.fromEntries(rows.map(r => [r.short, r]));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const LAYER_KO = { db: 'DB 문안', narrative: '서사 엔진', luck: '운 흐름', feature: '심화 블록', depth: '깊이 풀이', insight: '이 사주 포인트', plus: '시그니처', chart: '그래프', hook: '후킹', compat: '궁합표' };

W(`# 운명의 타임라인 챕터 전수 감사 — 장별 성적표 (${R.generated})`);
W();
W(`가상 사주 **${R.N}명** × 사용자 화면 **${rows.length}장**(운영 게시 목차 v${R.catalogVersion} 계약 ${rows.filter(r => !r.derived).length}장 + 엔진 조립 장 ${rows.filter(r => r.derived).length}장: ${rows.filter(r => r.derived).map(r => r.short).join('·')}) + 비공개 주제 재료 ${R.hiddenRows.length}장. 기준 시각 ${R.now.slice(0, 10)}.`);
W('엔진 조립 장은 계약(DB 원고) 없이 만세력 엔진 값으로 화면에서 만드는 장이에요(report/v2/derived-chapters.js). 흐름·격국·건강 장은 공개 스위치가 켜져야 사용자에게 보여요.');
W();
W('다시 만들기:');
W('```bash'); W(`node tools/timeline-chapter-audit.cjs ${R.N}`); W('```');
W('```bash'); W('node tools/timeline-chapter-audit-report.cjs'); W('```');
W();
W('측정 방식: 운영과 같은 순서로 **오프라인 조립**했습니다. ① DB 게시본 층은 원고(`editorial/rebuild-20261022`)를 게시 변환(`publish/convert.mjs`)한 뒤 운영 서버 조립기(`functions/_reviewed-library.js` composeReviewed)로, ② 브라우저 층은 `report/v2/reading-text.js` html()을 그대로 불러 서사 엔진·후킹·심화 블록·깊이 풀이·포인트·운 흐름까지 실제 화면 HTML을 만든 뒤 글만 뽑아 쟀습니다. 스위치는 운영 상태(서사 엔진 켜짐, topicDeep 꺼짐)입니다. 네트워크·DB·AI 호출은 없습니다.');
W();
W('주의: 운영 DB 게시본은 이 원고를 변환해 올린 것이라 같지만, 관리자에서 따로 게시한 서사 규칙(narrative:rules)이 있으면 운영은 그것을 씁니다. 사용자 이름은 빈 값(“당신”)으로 조립했습니다.');
W();

// ── 0. 요약 ──
const all = k => avg(rows.map(r => r[k]));
W('## 0. 한눈에 보기'); W();
W('| 지표 | 전체 평균 | 종합풀이 | 재물운 | 커리어운 | 인연운 |'); W('|---|---:|---:|---:|---:|---:|');
const line = (label, k, f = pct) => W(`| ${label} | ${f(all(k))} | ${['self', 'wealth', 'career', 'love'].map(t => f(avg(rows.filter(r => r.topic === t).map(r => r[k])))).join(' | ')} |`);
line('DB 문안이 하나도 안 걸림', 'dbFallback');
line('서사 엔진이 본문을 대신함', 'narrative');
line('얇은 장(본문 400자 미만 또는 문안 없음)', 'thin');
line('평균 글자 수(그래프 포함 읽는 글)', 'avgChars', v => Math.round(v).toLocaleString() + '자');
line('두 사람이 똑같은 글을 받을 확률', 'sameText');
line('두 사람 사이 문장 겹침(자카드)', 'jaccard');
line('절반 넘는 사람에게 똑같이 나오는 문장 비중', 'fixedShare');
line('앞 장 문장이 다시 나옴(사람 비율)', 'repeat');
line('근거 상자에 “내 사주 값” 줄 있음', 'evidHas');
line('근거 문장 중 실제 값이 든 문장', 'evidMine');
line("근거 상자에 '검수 근거 부족' 안내", 'evidThin');
line('단정 표현(사람 비율)', 'ban');
line('20세 미만에게 어른 장면', 'youngBad');
line('65세 이상에게 어색한 장면', 'seniorBad');
line('그래프 순위와 본문 연도 어긋남(연도 언급 대비)', 'graphBad');
W();
const verdicts = {}; rows.forEach(r => { const v = (JUDGE.mergeHints[r.short] || r).v; verdicts[v] = (verdicts[v] || 0) + 1; });
W('**핵심 발견**'); W();
['서사 엔진이 공개 64장 중 59장의 본문을 대부분(재물·커리어·인연 96%) 대신 씁니다. DB 원고가 화면 본문으로 보이는 곳은 서사 없는 5장(전부)과 서사 규칙이 일부만 맞는 4장(self_03·wealth_02·career_07·love_04, 17~31%)이고, 나머지 장에서는 3~4% 사람에게만 보입니다(근거 상자도 서사 것으로 바뀜).',
 '사람마다 글은 충분히 다릅니다(같은 글 0%, 문장 겹침 19%). 장 사이 같은 문장 반복도 0%로 fact-once 가 제 몫을 합니다. 대신 “힘이 센/여린 사주”, “가장 큰 기운” 같은 소개 문형이 한 사람에게 22~31장씩 나옵니다.',
 '가장 약한 곳은 서사가 없는 종합풀이 5장(self_02·28·32·35·36): 근거 상자에 내 사주 값 줄 0%, 그중 4장은 “검수 근거 부족” 안내가 100%입니다.',
 '20세 미만 독자에게 “실제 생활에서는 상사가…”처럼 어른 경험을 지금 일로 말하는 문장이 20장에서 30% 넘게 나옵니다. 65세 이상에게는 커리어 장에 승진·입사 문장이 남습니다(career_08 100%).',
 '만세력 앱 쪽 별도 엔진 14개(운세 사이클·12운성 생명주기·격국 분석·직업·건강·사고·지역·궁합·풍수 등)는 타임라인 화면에 로드조차 되지 않습니다. 그중 5개는 이미 만든 topic-deep(꺼짐)에만 연결돼 있습니다.',
 '단정 표현·지난 나이를 앞날로 말하는 문장·조립 오류는 0건, 그래프 순위와 본문 연도 어긋남은 3장 소수입니다.'].forEach(s => W('- ' + s));
W();
W(`판정: ${Object.entries(verdicts).map(([k, v]) => `**${k} ${v}장**`).join(' · ')} (판정 규칙은 5절)`);
W();

// ── 1. 조립 구조 ──
W('## 1. 지금 챕터가 조립되는 방식'); W();
W('한 장의 화면은 위에서 아래로 이렇게 쌓입니다(`reading-text.js` html()).'); W();
W('| 순서 | 층 | 파일 | 붙는 조건 | 운영 스위치 |'); W('|---|---|---|---|---|');
[['1', '제목·후킹', 'chapter-hooks.js(장 고정 문장) + chapter-hooks-personal(일간 10 × 장) + reading-feature teaser', '65장 전부', '항상'],
 ['2', '본문 5단계', 'life-narrative.js + life-narrative-data-*.js (규칙 433개)', '서사 엔진 59장, 맞는 규칙이 있을 때', 'lifeNarrative 켜짐(2026-11-09)'],
 ['2′', '본문(대체)', 'DB 게시본 `library.timeline_*` ← editorial/rebuild-20261022 (서버 composeReviewed)', '서사가 없거나 규칙이 안 맞을 때', '항상'],
 ['3', '운 흐름 한 줄', 'luck-reading.js', 'DB 본문일 때 12장 안팎', '항상'],
 ['4', '그래프', 'reading-text overview / 원국표 / 대운 그래프', '대부분 장(십성 구성 막대) · 시기 장(대운 그래프)', '항상'],
 ['5', '근거 펼쳐보기', '서사 evidence 또는 DB why·evidence + `이 사주:` 실제 값 줄(_reading-personal.js)', '모든 장', '항상'],
 ['6', '심화 블록', 'reading-feature.js SPEC → deep-*.js SECTIONS · fate-blocks*.js(fx:*) · 순위·시기 그래프', '64장 중 SPEC 있는 장', '항상'],
 ['6′', '주제 심화', 'topic-deep.js(td:*) — wealth-career·compat-pair·region-reading·fengshui·wish-spots', '25장', '**topicDeep 꺼짐**'],
 ['7', '깊이 풀이', 'reading-depth.js(+data 1~5)', '대부분 장', '항상'],
 ['8', '이 사주 포인트', 'reading-insight.js(+data 1~4)', '대부분 장', '항상'],
 ['–', '사실 한 번', 'fact-once.js — 사실 소개·문장을 처음 장에서만', '깊이·포인트·운 흐름·심화 안내 문장', '항상']].forEach(x => W('| ' + x.join(' | ') + ' |'));
W();
W('### 1-1. 장 단위 층 지도'); W();
W('“층별 평균 글자”는 실제로 그려진 사람 기준 평균입니다. 서사 비율이 100%면 DB 문안은 화면에 나오지 않습니다(근거 상자만 서사 것으로 바뀜).'); W();
W('| 장 | 제목 | DB 원고 수 | 서사 | 심화 블록 출처 | 층별 평균 글자 |'); W('|---|---|---:|---:|---|---|');
rows.forEach(r => {
  const feat = r.layers.filter(l => !/^DB|^서사/.test(l)).join(', ') || '-';
  const la = ['narrative', 'db', 'luck', 'feature', 'depth', 'insight', 'plus', 'chart'].filter(k => r.layerAvg[k] && r.layerShare[k] >= 0.05).map(k => `${LAYER_KO[k]} ${r.layerAvg[k]}${r.layerShare[k] < 0.95 ? `(${pct(r.layerShare[k])})` : ''}`).join(' · ');
  W(`| ${r.short} | ${r.title} | ${(r.layers.find(l => /^DB/.test(l)) || '').replace(/\D+/g, '') || 0} | ${p0(r.narrative)} | ${feat} | ${la} |`);
});
W();

// ── 2. 엔진 활용 지도 ──
W('## 2. 엔진 활용 지도'); W();
W('각 계산 결과를 **어느 장이 실제로 읽었는지** 조립 중에 호출을 기록해 만들었습니다(사람 한 명이라도 그 장에서 읽으면 표시). DB 층(서버 조건 계산 deriveFacts)은 모든 장이 같은 사실 묶음을 쓰므로 따로 2-3에 적었습니다.'); W();
W('### 2-1. engine.js 계산 결과'); W();
W('| 계산 결과 | 쓰는 장 수 | 쓰는 장 | 꺼진 층(topicDeep)에서만 |'); W('|---|---:|---|---|');
R.engineMap.forEach(e => W(`| ${e.label} | ${e.chapters.length} | ${e.chapters.length >= 55 ? e.chapters.length + '장(거의 전부)' : e.chapters.join(', ') || '**안 씀**'} | ${e.offOnly.join(', ') || '-'} |`));
W();
W('### 2-2. 별도 엔진 모듈(만세력 앱 쪽)'); W();
W('타임라인 화면(`report/v2/index.html`)에 실제로 로드되는지와, 꺼진 topic-deep 이 켜졌을 때 읽는 장입니다.'); W();
W('| 모듈 | 무엇을 계산 | 타임라인에 로드 | 만세력 앱 | 관리자 | topicDeep 켜면 쓰는 장 |'); W('|---|---|:-:|:-:|:-:|---|');
R.modMap.forEach(m => W(`| ${m.file} | ${m.what} | ${m.timelineLoaded ? '예' : '**아니오**'} | ${m.mainApp ? '예' : '-'} | ${m.admin ? '예' : '-'} | ${m.topicDeepOff.join(', ') || '-'} |`));
W();
W('→ **타임라인 64장은 위 14개 모듈을 하나도 쓰지 않습니다.** topic-deep 이 켜지면 wealth-career·compat-pair·region-reading·fengshui·wish-spots 5개만 붙고, luck-cycle·unseong-cycle·gyeok-structure·health-body·accident-hint·luck-interpret·byeongyak·jonggyeok·gyeokguk 9개는 어떤 장에도 연결돼 있지 않습니다. (ch.unified 안에 격국·종격·병약 판정 결과가 들어 있어 서사 엔진이 간접으로는 씁니다.)');
W();
W('### 2-3. DB 문안이 거는 조건(원고 when 키)'); W();
const keyTot = {}; rows.forEach(r => Object.entries(r.dbWhenKeys).forEach(([k, v]) => keyTot[k] = (keyTot[k] || 0) + v));
W('| 조건 키 | 원고 수(64장 합) |'); W('|---|---:|');
Object.entries(keyTot).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => W(`| ${k} | ${v} |`));
W();
W('### 2-4. 심화 블록 출처 → 장'); W();
W('| 블록 | 장 |'); W('|---|---|');
Object.entries(R.deepBy).sort().forEach(([k, v]) => W(`| ${k} | ${v.join(', ')} |`));
W();

// ── 3. 성적표 ──
W('## 3. 장별 성적표'); W();
W('| 장 | DB 없음 | 서사 | 얇음 | 글자 | 같은 글 | 문장 겹침 | 고정 문장 | 앞 장 반복 | 근거 값 줄 | 근거 부족 | 단정 | 20세↓ | 65세↑ | 그래프 어긋남 | 판정 |'); W('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|');
rows.forEach(r => W(`| ${r.short} | ${p0(r.dbFallback)} | ${p0(r.narrative)} | ${p0(r.thin)} | ${r.avgChars.toLocaleString()} | ${p0(r.sameText)} | ${pct(r.jaccard)} | ${pct(r.fixedShare)} | ${p0(r.repeat)} | ${pct(r.evidHas)} | ${p0(r.evidThin)} | ${p0(r.ban)} | ${r.youngN ? p0(r.youngBad) : '-'} | ${r.seniorN ? p0(r.seniorBad) : '-'} | ${r.graphChecked ? p0(r.graphBad) + ` (${r.graphChecked})` : '-'} | ${r.v} |`));
W();
W('열 설명: **DB 없음** 맞는 DB 문안이 없어 기본 문구로 떨어진 비율 · **서사** 서사 엔진이 본문을 쓴 비율 · **얇음** 본문 400자 미만 또는 DB·서사 모두 없음 · **같은 글** 무작위 두 사람이 문장 집합까지 똑같은 글을 받을 확률 · **문장 겹침** 두 사람 문장 집합의 자카드 평균(높을수록 비슷) · **고정 문장** 절반 넘는 사람에게 똑같이 나오는 문장의 비중 · **앞 장 반복** 같은 사람의 앞 장에 이미 나온 14자 이상 문장이 다시 나온 사람 비율(그래프 라벨 제외) · **근거 값 줄** 근거 상자에 그 사람의 실제 값(%·연도·나이·일주·일간·대운 간지)이 든 문장이 있는 비율 · **근거 부족** “이 질문에 적용할 검수 근거가 아직 충분하지 않습니다” 안내가 나온 비율 · **20세↓/65세↑** 그 나이대 사람 중 어른 장면(직장·결혼·대출 등)/어색한 장면(취업·입사·출산 등)이 나온 비율 · **그래프 어긋남** 본문이 “좋은 해”라 한 해가 그 장 그래프 10년 중 하위 3위, “조심할 해”라 한 해가 상위 2위인 경우(괄호는 검사한 연도 언급 수).');
W();
W('### 3-1. 주제별 요약'); W();
W('| 주제 | 장 | 얇음 | 같은 글 | 문장 겹침 | 앞 장 반복 | 근거 값 줄 | 서사 | 평균 글자 |'); W('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
Object.entries(R.topicSum).forEach(([t, s]) => W(`| ${TOPIC[t]} | ${s.n} | ${pct(s.thin)} | ${pct(s.same)} | ${pct(s.jac)} | ${pct(s.rep)} | ${pct(s.evid)} | ${pct(s.narr)} | ${s.chars.toLocaleString()} |`));
W();
W('### 3-2. 같은 사실을 여러 장에서 소개하는 정도'); W();
W('한 사람의 64장 가운데 그 사실을 소개하는 문형이 나온 장 수입니다(fact-once.js 가 막는 층 밖 — 서사·DB 본문 — 에서 주로 생김).'); W();
W('| 사실 소개 문형 | 한 사람당 평균 장 수 | 최대 |'); W('|---|---:|---:|');
Object.entries(R.factSpread).forEach(([k, v]) => W(`| ${k} | ${v.avgChapters} | ${v.max} |`));
W();

// ── 4. 문제 예시 ──
W('## 4. 문제 예시'); W();
const ex = (title, pick, fmt) => { const list = rows.filter(pick); W(`### ${title} (${list.length}장)`); W(); if (!list.length) { W('해당 없음.'); W(); return; } list.forEach(r => W(`- **${r.short}** ${fmt(r)}`)); W(); };
ex('장 사이 반복 문장 상위', r => r.repeat >= 0.1, r => `${pct(r.repeat)} — ${r.repeatEx.slice(0, 2).map(s => '“' + s + '”').join(' / ')}`);
ex('그래프와 본문 연도 어긋남', r => r.graphBad > 0, r => `${pct(r.graphBad)} — ${r.graphEx.slice(0, 2).join(' / ')}`);
ex('단정 표현', r => r.ban > 0, r => `${pct(r.ban)} — ${Object.entries(r.banEx).map(([k, v]) => `“${k}” ${v}명`).join(', ')}`);
ex('20세 미만 어른 장면', r => r.youngBad >= 0.2, r => `${pct(r.youngBad)} (${r.youngN}명 중) — ${Object.entries(r.youngEx).sort((a, b) => (b[1].n || b[1]) - (a[1].n || a[1])).slice(0, 4).map(([k, v]) => `${k} ${v && v.n != null ? v.n + '명 · “' + v.ex + '”' : v}`).join(', ')}`);
ex('65세 이상 어색한 장면', r => r.seniorBad >= 0.05, r => `${pct(r.seniorBad)} (${r.seniorN}명 중) — ${Object.entries(r.seniorEx).sort((a, b) => (b[1].n || b[1]) - (a[1].n || a[1])).slice(0, 4).map(([k, v]) => `${k} ${v && v.n != null ? v.n + '명 · “' + v.ex + '”' : v}`).join(', ')}`);
ex('이미 지난 나이를 앞날로 말함', r => r.ageBad > 0, r => `${pct(r.ageBad)} — ${r.ageEx.slice(0, 1).join('')}`);
ex('조립 오류', r => r.errors > 0, r => `${r.errors}건 — ${r.errEx}`);

// ── 5. 장별 제안 ──
W('## 5. 장별 제안 (유지 / 보완 / 통합 / 신설 후보)'); W();
W('자동 판정 규칙: 얇음 30%↑, DB 없음 30%↑(서사 대체 50% 미만), 같은 글 20%↑, 문장 겹침 45%↑, 앞 장 반복 30%↑, 그래프 어긋남 15%↑(연도 언급 20회↑), 근거 값 줄 70% 미만, 근거 부족 안내 30%↑, 단정 2%↑, 20세 미만 어른 장면 30%↑, 65세↑ 어색 10%↑ 중 하나라도 걸리면 **보완**, 얇음·DB 없음·같은 글·오류 중 두 개 이상이면 **보완(우선)**. **통합**은 아래 6절의 같은 질문 장에서 사람이 판단한 것입니다.'); W();
const MERGE = R.mergeHints || {};
W('| 장 | 제목 | 제안 | 근거 |'); W('|---|---|---|---|');
rows.forEach(r => W(`| ${r.short} | ${r.title} | ${MERGE[r.short] ? MERGE[r.short].v : r.v} | ${[...r.why, ...(MERGE[r.short] ? [MERGE[r.short].why] : [])].join(' · ') || '기준 통과'} |`));
W();

// ── 6. 통합 후보 ──
W('## 6. 통합 후보 — 같은 질문을 두 번 묻는 장'); W();
W('종합풀이 19장 중 상당수가 주제 장과 같은 질문입니다. 아래 “실측 겹침”은 같은 사람의 두 장 문장 중 겹치는 비율(작은 쪽 기준)이고, 낮으면 글은 달라도 질문이 같아 읽는 사람에게는 중복으로 느껴질 수 있습니다.'); W();
const ov = {}; R.overlapPairs.forEach(p => { ov[p.a + '|' + p.b] = p.share; ov[p.b + '|' + p.a] = p.share; });
W('| 장 A | 장 B | 같은 질문 | 실측 문장 겹침 |'); W('|---|---|---|---:|');
R.sameQuestion.forEach(([a, b, q]) => W(`| ${a} ${byId[a] ? byId[a].title : ''} | ${b} ${byId[b] ? byId[b].title : ''} | ${q} | ${ov[a + '|' + b] != null ? pct(ov[a + '|' + b]) : '8% 미만'} |`));
W();
if (R.overlapPairs.length) { W('실측으로 문장이 8% 넘게 겹친 장 쌍:'); W(); R.overlapPairs.slice(0, 15).forEach(p => W(`- ${p.a} ↔ ${p.b}: ${pct(p.share)}`)); W(); }

// ── 7. 비공개 3주제 ──
W('## 7. 비공개 3주제를 채울 후보 장'); W();
W('지금 공개 목차에서는 종합풀이 안의 한 장(self_35 건강 및 사고수 · self_36 전생의 나 · self_37 개운법)으로만 나옵니다. 아래는 이미 있는 재료와 엔진으로 만들 수 있는 후보입니다. “DB 재료”는 rebuild 원고가 이미 있는 옛 장(비공개)이고, “맞는 문안 없음”은 그 원고를 지금 조립기로 돌렸을 때 기본 문구로 떨어지는 비율입니다.'); W();
const H = R.hiddenRows;
W('| 옛 장(비공개) | 제목 | 원고 수 | 맞는 문안 없음 |'); W('|---|---|---:|---:|');
H.forEach(h => W(`| ${h.short} | ${h.title} | ${h.entries} | ${pct(h.dbFallback)} |`));
W();
(R.hiddenPlan || []).forEach(t => { W(`### ${t.name}`); W(); W(t.note); W(); W('| 후보 장 | 쓰는 엔진 | 있는 재료 | 그래프·블록 |'); W('|---|---|---|---|'); t.chapters.forEach(c => W(`| ${c[0]} | ${c[1]} | ${c[2]} | ${c[3]} |`)); W(); });

// ── 8. 우선순위 ──
W('## 8. 우선순위 제안 (10개 이내)'); W();
(R.priorities || []).forEach((p, i) => { W(`${i + 1}. **${p.title}** — ${p.why}`); W(`   - 할 일: ${p.do}`); });
W();
W('## 9. 이 감사가 못 보는 것'); W();
['운영 DB 에 관리자가 직접 고친 문안·규칙(narrative:rules 게시본)은 반영하지 않았습니다. 원고·로컬 규칙 기준입니다.', '사용자 이름이 들어간 문장은 이름을 비운 채로 쟀습니다(이름 때문에 생기는 차이는 개인화로 세지 않음).', '그림·영상·카드 디자인은 보지 않고 글만 쟀습니다.', '“그래프 어긋남”은 연도가 직접 나오는 문장만 검사합니다. “올해는 좋아요”처럼 연도 없이 말한 문장은 세지 않습니다.', '금지 표현·나이대 검사는 낱말 검사라 문맥상 괜찮은 경우(예: “반드시 그렇진 않아요”)도 걸릴 수 있습니다. 4절 예시로 확인해 주세요.'].forEach(s => W('- ' + s));
fs.writeFileSync(path.join(root, 'docs/TIMELINE_CHAPTER_AUDIT_2026-11-15.md'), out.join('\n') + '\n');
console.log('docs/TIMELINE_CHAPTER_AUDIT_2026-11-15.md ' + out.length + '줄');
