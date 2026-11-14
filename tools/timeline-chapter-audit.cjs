// 운명의 타임라인(/report/) 챕터 전수 감사 — 장별 성적표 + 엔진 활용 지도
//   node tools/timeline-chapter-audit.cjs [사주 수=360]
//   → docs/TIMELINE_CHAPTER_AUDIT_2026-11-15.md, docs/timeline-chapter-audit.json, report/admin/data/timeline-chapter-audit.json(관리자 읽기 전용)
//
// 무엇을 돌리나(운영과 같은 순서, 네트워크·DB·AI 호출 없음)
//   ① DB 게시본 층: editorial/rebuild-20261022 원고 → publish/convert.mjs(게시 변환) → functions/_reviewed-library.js composeReviewed(운영 서버 조립기)
//   ② 브라우저 층: report/v2/reading-text.js html() — 서사 엔진(life-narrative, 운영 스위치 켜짐)·후킹·심화 블록(reading-feature + fate-blocks + deep-*)
//      ·깊이 풀이(reading-depth)·포인트(reading-insight)·운 흐름(luck-reading)·사실 한 번(fact-once)·ReadingPlus 를 모두 실제로 그린다
//   ③ 꺼진 층: topic-deep(스위치 topicDeep 꺼짐)은 따로 켜서 "켜면 무엇이 붙나"만 잰다
//   ④ 엔진 활용: Manse 함수·ch·sd 속성·Mantra* 모듈 호출을 장 단위로 기록한다(어느 장이 무엇을 읽는가)
// 운영과 다른 점: 운영 DB 게시본은 이 원고를 변환해 올린 것(2026-11-07 재게시)이고, 서사 규칙은 관리자에서 게시한 규칙(narrative:rules)이 있으면 그것이 우선이다.
// 이 도구는 문안·DB·엔진을 고치지 않는다. 읽고 재기만 한다.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { pathToFileURL } = require('url');
const root = path.join(__dirname, '..');
const N = +process.argv[2] || 360, NOW = Date.UTC(2026, 10, 15, 3), STAMP = '2026-11-15';
const imp = f => import(pathToFileURL(path.join(root, f)).href);

// 운영 게시 목차 v15(ik:editorial:published, 2026-11-15 읽기 전용 조회) — 활성 64장, 주제 순서·장 순서 그대로
const CATALOG = {
  version: 15,
  topics: [
    { id: 'self', name: '종합풀이', chapters: ['self_03', 'self_02', 'self_20', 'self_24', 'self_18', 'self_25', 'self_26', 'self_27', 'self_28', 'self_29', 'self_30', 'self_31', 'self_32', 'self_33', 'self_34', 'self_35', 'self_36', 'self_37', 'self_22'] },
    { id: 'wealth', name: '재물운', chapters: Array.from({ length: 15 }, (_, i) => 'wealth_' + String(i + 1).padStart(2, '0')) },
    { id: 'career', name: '커리어운', chapters: Array.from({ length: 15 }, (_, i) => 'career_' + String(i + 1).padStart(2, '0')) },
    { id: 'love', name: '인연운', chapters: Array.from({ length: 15 }, (_, i) => 'love_' + String(i + 1).padStart(2, '0')) }
  ],
  hidden: [{ id: 'health', name: '건강·사고수' }, { id: 'creative', name: '전생' }, { id: 'remedy', name: '개운법' }]
};
const TITLES = { self_02: '내 사주를 자동차로 비유하면?', self_03: '나의 타고난 기질은?', self_18: '최고의 나와 최악의 나', self_20: '전체 인생 흐름', self_22: '나라는 사람의 최종 사용설명서', self_24: '움직여야 될 때와 기다려야 할 때', self_25: '나의 타고난 강점과 약점', self_26: '나와 잘 맞는 업', self_27: '전체 인연운', self_28: '대인관계 궁합', self_29: '내 미래 배우자는?', self_30: '전체 재물운', self_31: '나의 재물 그릇은?', self_32: '내 사주와 맞는 돈 버는 법', self_33: '나의 말년운', self_34: '나의 자식운', self_35: '건강 및 사고수', self_36: '전생의 나', self_37: '개운법',
  wealth_01: '내 재물 그릇은 얼마나 클까?', wealth_02: '나는 어떤 방식으로 돈을 벌까?', wealth_03: '돈이 들어와도 왜 남지 않을까?', wealth_04: '월급형 인간일까, 사업형 인간일까?', wealth_05: '나는 돈을 모으는 사람일까, 쓰는 사람일까?', wealth_06: '큰돈을 만날 기회는 언제일까?', wealth_07: '돈 때문에 가장 조심해야 할 선택', wealth_08: '나는 투자와 재테크에 어울리는 성향일까?', wealth_09: '사람 때문에 돈을 잃기 쉬울까?', wealth_10: '나에게 유리한 재물운의 시기', wealth_11: '최고의 재물 시나리오 vs 최악의 재물 시나리오', wealth_12: '내 재산을 키우기 위한 현실 전략', wealth_13: '재물운에서 나와 맞는 사람과 피해야 할 사람', wealth_14: '재물운 타이밍: 힘이 실리는 때', wealth_15: '재물운을 끌어올리는 개운법',
  career_01: '나는 어떤 일을 해야 잘할까?', career_02: '내가 가진 가장 돈 되는 재능', career_03: '직장인과 사업가, 어느 쪽이 맞을까?', career_04: '나는 리더일까, 전문가일까?', career_05: '나에게 잘 맞는 업종과 맞지 않는 업종', career_06: '나는 어떤 직장 환경에서 성공할까?', career_07: '조직생활에서 내가 부딪히는 문제', career_08: '이직과 독립, 언제 움직이는 게 좋을까?', career_09: '창업과 사업에서 내가 조심해야 할 것', career_10: '성공을 가로막는 나의 습관', career_11: '최고의 커리어 시나리오 vs 최악의 커리어 시나리오', career_12: '앞으로 10년, 나의 커리어 전략', career_13: '커리어운에서 나와 맞는 사람과 피해야 할 사람', career_14: '커리어운 타이밍: 힘이 실리는 때', career_15: '커리어운을 끌어올리는 개운법',
  love_01: '나는 사람들과 어떤 관계를 맺을까?', love_02: '사람들이 나를 좋아하거나 불편해하는 이유', love_03: '내 곁에 남는 사람과 멀어지는 사람', love_04: '나는 사랑할 때 어떤 사람이 될까?', love_05: '내가 끌리는 사람과 실제 잘 맞는 사람', love_06: '연애에서 반복하기 쉬운 실수', love_07: '나에게 잘 맞는 배우자의 성향', love_08: '결혼운은 언제 강해질까?', love_09: '결혼생활에서 가장 조심해야 할 갈등', love_10: '나의 가족운과 부모·형제 관계', love_11: '나의 자식운과 부모가 되었을 때의 모습', love_12: '최고의 인연 시나리오 vs 최악의 인연 시나리오', love_13: '인연운에서 나와 맞는 사람과 피해야 할 사람', love_14: '인연운 타이밍: 힘이 실리는 때', love_15: '인연운을 끌어올리는 개운법' };
const ORDER = CATALOG.topics.flatMap(t => t.chapters.map(c => 'timeline_' + c));
const topicOf = id => id.replace(/^timeline_/, '').replace(/_\d+$/, '');
// 장의 시기 그래프 종류(reading-feature rank 와 같은 점수) — 본문에 나온 해가 그래프와 맞는지 볼 때 쓴다
// 종합풀이 중 시기 그래프와 같은 점수로 비교할 수 있는 장만(건강·전생·개운·성향 장은 비교 대상 그래프가 없어 뺀다)
const KIND_OF = id => { const t = topicOf(id), n = id.slice(-2); if (t !== 'self') return t; return { 30: 'wealth', 31: 'wealth', 32: 'wealth', 26: 'career', 24: 'career', 27: 'love', 29: 'love', 34: 'love' }[n] || null; };
const PROSE_LAYERS = new Set(['narrative', 'db', 'luck', 'depth', 'insight', 'plus']);   // 그래프·표가 아닌 글

// ── 검사 표현 ──
const BAN_LUCK = /반드시|무조건|100% ?(?:확실|맞|된|보장|성공)|틀림없이|확실히 (?:성공|부자|망)|대박|성공할 거예요|다 잘될|걱정하지 마세요|운명이 정해|정해진 운명|흉하다|대흉|망한다|망하게|파산한다|이혼한다(?!면)|이혼하게 돼|결혼한다(?!면)|합격한다(?!면)|죽는|죽음|사망|암에 걸|질병에 걸|불행해진다|팔자가 사납|큰일 난다|돈이 무조건|평생 가난/;
const ADULT = /회사|직장|출근|퇴근|연봉|이직|퇴사|승진|상사|동료|부서|창업|대출|월급|결혼 생활|결혼생활|배우자|남편|아내|부부|시댁|처가|육아|전세|투자|거래처|팀장|월세|집값|카드값|은퇴|노후/;
const SENIOR_ODD = /취업 준비|입사|(?<![가-힣])신입|첫 직장|구직|승진|커리어를 쌓|출산|임신을|임신이|육아|첫 연애|연애를 시작|결혼 상대를 찾|이직 준비|스펙/;
const NEGATED = /뜻하지 않|않고|아니며|아닙니다|아니에요|않습니다|보지 않|확인한 결과는|예측하지|아니라/;
const NOW_EXP = /실제 생활에서는|요즘|평소|지금도|이미|매번|자주|늘 |적 있지 않나요|있지 않나요|하고 있을|하고 있지/;   // 지금 겪는 일처럼 말하는 문형
const POS_CUE = /힘이 실리|좋은 해|기회|유리|움직이기 좋|승부|밀어붙|열리는|살아나|잡으세요|좋아지/;
const NEG_CUE = /조심|기다리|무리하지|피하|쉬어 가|부담|주의|버티|지키는 해|아끼/;
const FACTS = {
  '가장 큰 기운 소개': /가장 (?:큰|센|강한|많은|두드러진|힘센) (?:기운|힘)/,
  '필요한 기운(용신) 소개': /(?:필요한|도와주는|살려 주는|채워 줄) 기운(?:은|이|으로)|용신/,
  '힘의 세기(신강·신약) 소개': /힘이 (?:센|여린|강한|약한) (?:사주|편)|타고난 힘이|신강|신약/,
  '지금 대운 소개': /지금(?:의)? (?:대운|10년)|지금 지나는 10년/,
  '일간 소개': /(?:갑|을|병|정|무|기|경|신|임|계)(?:목|화|토|금|수)\s?(?:\([^)]*\)\s?)?(?:일간|기운으로 태어|으로 태어|로 태어)/
};
const strip = h => String(h || '').replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const sents = t => String(t || '').split(/(?<=[.!?。])\s+/).map(s => s.trim()).filter(Boolean);
const norm = s => s.replace(/[\s.,!?·—'"‘’“”()\[\]:~…-]/g, '');
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pct = v => (100 * v).toFixed(0) + '%';
let seed = 20261115; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

(async () => {
  // ── 운영 서버 조립기와 게시 변환(원고 → passage) ──
  globalThis.window = globalThis;
  const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  globalThis.fetch = () => Promise.reject(Error('network-forbidden'));
  globalThis.MANTRA_FLAGS = { lifeNarrative: true, healthBody: true, accidentHint: true };   // 운영 스위치 상태(2026-11-09 lifeNarrative 켬). topicDeep·timelineCopy·gyeokAnalysis 등은 꺼짐
  const Conv = await imp('editorial/rebuild-20261022/publish/convert.mjs'), IK = await imp('functions/_ik.js'), ST = await imp('functions/_style.js');
  const { L, S, chapters: contracts } = await Conv.loadService();
  const entries = Conv.allEntries(), contractOf = Object.fromEntries(contracts.map(c => [c.id, c]));
  const allIds = [...new Set([...ORDER, ...contracts.map(c => c.id).filter(id => /timeline_(health|creative|remedy)_/.test(id))])];
  const pass = {}, entryWhen = {};
  for (const id of allIds) {
    const c = contractOf[id], es = entries.filter(e => e.chapters[0] === id);
    entryWhen[id] = { entries: es.length, keys: {} };
    es.forEach(e => Object.keys(e.when || {}).forEach(k => { const base = k.split('.')[0]; entryWhen[id].keys[base] = (entryWhen[id].keys[base] || 0) + 1; }));
    if (!c) { pass[id] = null; continue; }
    const conv = await Conv.chapterPassages(c, S.seedPassages(c), es, { L }); pass[id] = conv.passages;
  }

  // ── 브라우저 층(운영 /report/v2/index.html 과 같은 순서로 필요한 것만) ──
  const V2 = ['ilju-data', 'deep', 'deep-life', 'deep-time', 'deep-wealth', 'deep-love', 'polite-text', 'plain-copy', 'reading-media', 'everyday-reading', 'fact-once', 'luck-reading', 'signature-data', 'reading-plus', 'chapter-hooks', 'chapter-hooks-personal-data-1', 'chapter-hooks-personal-data-2', 'chapter-hooks-personal', 'reading-depth', 'reading-depth-data-1', 'reading-depth-data-2', 'reading-depth-data-3', 'reading-depth-data-4', 'reading-depth-data-5', 'reading-insight-data-1', 'reading-insight-data-2', 'reading-insight-data-3', 'reading-insight-data-4', 'reading-insight', 'reading-feature-data-1', 'reading-feature-data-2', 'reading-feature', 'topic-deep', 'fate-blocks', 'fate-blocks-2', 'fate-blocks-3', 'fate-blocks-4', 'life-narrative-data', 'life-narrative-data-self', 'life-narrative-data-self2', 'life-narrative-data-wealth', 'life-narrative-data-wealth2', 'life-narrative-data-love', 'life-narrative-data-love2', 'life-narrative-data-career', 'life-narrative-data-career2', 'life-narrative', '../natal-table', 'reading-text', 'reading-peak'];
  const loadFail = [];
  for (const f of V2) { const p = path.join(root, 'report/v2', f + '.js'); try { vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p }); } catch (e) { loadFail.push(f + ': ' + e.message.slice(0, 80)); } }
  const M = globalThis.Manse, R = globalThis.ReportV2, RT = R.ReadingText, LN = R.LifeNarrative, RF = R.ReadingFeature, TD = R.TopicDeep;
  // 타임라인 화면(/report/v2/index.html)에 실제로 로드되는 루트 모듈
  const v2html = fs.readFileSync(path.join(root, 'report/v2/index.html'), 'utf8'), v2Scripts = [...v2html.matchAll(/src="([^"]+\.js)/g)].map(m => m[1].replace(/^.*\//, ''));
  const mainHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), adminHtml = fs.readFileSync(path.join(root, 'report/admin/index.html'), 'utf8');

  // ── 엔진 활용 기록(장 × 엔진 항목) ──
  let CUR = null; const use = {};   // use[item][chapter] = 사람 수(호출 횟수가 아니라 그 장에서 한 번이라도 읽은 사람)
  const seenPerson = new Set();
  const rec = item => { if (!CUR) return; const k = item + '|' + CUR; if (seenPerson.has(k)) return; seenPerson.add(k); (use[item] = use[item] || {})[CUR] = (use[item][CUR] || 0) + 1; };
  Object.keys(M).forEach(k => { const f = M[k]; if (typeof f === 'function' && k !== 'compute') M[k] = function () { rec('Manse.' + k); return f.apply(this, arguments); }; });
  const ROOT_MODS = [['luck-cycle', 'MantraLuckCycle'], ['unseong-cycle', 'MantraUnseong'], ['gyeok-structure', 'MantraGyeokStructure'], ['wealth-career', 'MantraWealthCareer'], ['health-body', 'MantraHealthBody'], ['accident-hint', 'MantraAccidentHint'], ['region-reading', 'MantraRegionReading'], ['compat-pair', 'PairCompat'], ['luck-interpret', 'MantraLuckInterpret'], ['byeongyak', 'MantraByeongyak'], ['jonggyeok', 'MantraJonggyeok'], ['gyeokguk', 'MantraGyeokguk'], ['fengshui-engine', 'MantraFengshui'], ['wish-spots', 'MantraWishSpots']];
  const wrapMod = (name, g) => { const o = globalThis[g]; if (!o || o.__aud) return; Object.keys(o).forEach(k => { const f = o[k]; if (typeof f === 'function') o[k] = function () { rec(name + '.' + k); return f.apply(this, arguments); }; }); o.__aud = 1; };
  const spy = (obj, label) => new Proxy(obj, { get(t, p, r) { if (typeof p === 'string' && Object.prototype.hasOwnProperty.call(t, p)) rec(label + '.' + p); return Reflect.get(t, p, r); } });
  // 심화 블록 출처: Deep.SECTIONS 이름, FateBlocks 종류
  const D = R.Deep; if (D && D.SECTIONS) Object.keys(D.SECTIONS).forEach(k => { const f = D.SECTIONS[k]; if (typeof f === 'function') D.SECTIONS[k] = function () { rec('Deep.' + k); return f.apply(this, arguments); }; });
  if (R.FateBlocks && R.FateBlocks.render) { const f = R.FateBlocks.render; R.FateBlocks.render = function (part) { rec('FateBlocks.' + (part && part.custom)); return f.apply(this, arguments); }; }

  // ── 사람 표본 ──
  const people = [];
  for (let i = 0; i < N; i++) {
    const birth = { year: 1940 + Math.floor(rnd() * 77), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60), calendar: 'solar', leap: false, gender: rnd() < .5 ? 'M' : 'F', city: '서울' };
    people.push(birth);
  }
  const nowYear = M.yearPillarAt(NOW).sajuYear;
  // 장별 누적
  const A = {}; allIds.forEach(id => A[id] = { n: 0, dbFallback: 0, dbPending: 0, dbEntries: {}, narr: 0, narrRules: {}, chars: [], bodyChars: [], thin: 0, layers: {}, layerChars: {}, hash: {}, sentPeople: [], repeat: 0, repeatSame: 0, repeatN: [], repeatEx: {}, factHits: {}, evid: 0, evidMine: 0, evidNone: 0, evidHas: 0, evidThin: 0, chartCaption: 0, ban: 0, banEx: {}, svcBan: 0, young: 0, youngAny: 0, youngBad: 0, youngEx: {}, senior: 0, seniorBad: 0, seniorEx: {}, graphChecked: 0, graphBad: 0, graphEx: [], dwBad: 0, ageBad: 0, ageEx: [], err: 0, errEx: '' });
  const ROLES = L.ROLES;
  const t0 = Date.now();
  for (let pi = 0; pi < N; pi++) {
    const b = people[pi]; seenPerson.clear(); CUR = null;
    const chRaw = M.compute(b), sdRaw = R.SajuData.build(chRaw, { now: NOW }), age = nowYear - b.year;
    const vdRaw = Object.assign({}, sdRaw, { name: '' }), chP = spy(chRaw, 'ch'), sdP = spy(sdRaw, 'sd'), vdP = spy(vdRaw, 'sd');
    const H = { M, ch: chP, sd: sdP, now: NOW, name: '', interest: '', assets: {}, videos: {} };
    R.FactOnce && R.FactOnce.reset();
    // 이 사람의 값(근거 문장에 실제 값이 들어갔는지 볼 때)
    const P = sdRaw.pillars || {}, mineTok = [P.day && P.day.ko, P.day && P.day.hanja, sdRaw.dayMaster && (sdRaw.dayMaster.stem + sdRaw.dayMaster.el), sdRaw.currentDaewoon && sdRaw.currentDaewoon.ganzhi].filter(Boolean);
    const mineRe = new RegExp('\\d+(?:\\.\\d+)?%|(?:19|20)\\d\\d년|\\d+세|' + mineTok.map(t => t.replace(/[()]/g, '')).join('|'));
    const curDw = sdRaw.currentDaewoon && sdRaw.currentDaewoon.ganzhi, dwNames = (sdRaw.daewoon || []).map(d => d.ganzhi).filter(Boolean);
    const rankCache = {}; const rankOf = kind => rankCache[kind] || (rankCache[kind] = (RF.rank(M, chRaw, NOW, kind, 'year') || []).map(r => r.y));
    const seen = new Map(), factSeen = {};
    for (const id of allIds) {
      const a = A[id], visible = ORDER.includes(id);
      let out = null; CUR = 'db:' + id;
      if (pass[id]) { try { out = L.composeReviewed({ clean: { sd: sdRaw, chapter: { paragraphs: ROLES.map(role => ({ id: role, role })) } }, contract: contractOf[id], analysis: { claims: [] }, library: { version: 1, published: pass[id] } }); } catch (e) { a.err++; a.errEx = String(e.message).slice(0, 120); } }
      a.n++;
      const used = out ? [...new Set(out.blocks.map(x => (/^rb-(.+)-(?:title|why|reality|strength|risk|reinforce|practice)$/.exec(x.id) || [])[1]).filter(Boolean))] : [];
      if (!used.length) a.dbFallback++; if (out && out.pending.length) a.dbPending++;
      used.forEach(u => a.dbEntries[u] = (a.dbEntries[u] || 0) + 1);
      if (!visible) continue;   // 비공개 주제 장은 DB 재료 준비도만 본다
      const c = { id, editorialContractId: id, title: TITLES[id.replace('timeline_', '')], editorialTopicId: topicOf(id), readingParagraphs: out ? out.result.paragraphs : [], readingVisualData: vdP };
      Object.defineProperty(c, 'readingFeature', { value: H, enumerable: false });
      CUR = id; let html = '';
      const ln = LN && LN.CHAPTERS[id] ? LN.forChapter(c) : null; if (ln) { a.narr++; a.narrRules[ln.rule || 'life'] = (a.narrRules[ln.rule || 'life'] || 0) + 1; }
      try { html = RT.html(c, ORDER.indexOf(id)); } catch (e) { a.err++; a.errEx = String(e.stack || e.message).slice(0, 160); continue; }
      // 층별로 나눈다(바깥 section 경계)
      const parts = html.split(/(?=<section class="scene rd-sec)/).map(chunk => { const m = /data-sc="[^"]*_text_([a-z]+(?:_lead)?)(?:_\d+)*"/.exec(chunk); return { suf: m ? m[1] : '?', html: chunk, text: strip(chunk) }; });
      const layerName = p => p.suf === 'body' ? (/지금 내 운 흐름, 쉽게 말하면/.test(p.html) ? 'luck' : ln ? 'narrative' : 'db') : p.suf === 'feature_lead' ? 'feature' : p.suf;
      const L1 = {}; parts.forEach(p => { const k = layerName(p); if (p.text) L1[k] = (L1[k] || 0) + p.text.length; });
      Object.keys(L1).forEach(k => { a.layers[k] = (a.layers[k] || 0) + 1; (a.layerChars[k] = a.layerChars[k] || []).push(L1[k]); });
      const readText = parts.filter(p => !/^(head|end|why|basis)$/.test(p.suf)).map(p => p.text).join(' ');
      const proseText = parts.filter(p => !/^(head|end|why|basis|chart|panel)$/.test(p.suf)).map(p => p.text).join(' ');   // 그래프 라벨·캡션 제외한 글
      const chartText = parts.filter(p => p.suf === 'chart').map(p => p.text).join(' ');
      if (/능력이나 재산의 점수는 아닙니다/.test(chartText)) a.chartCaption++;
      const bodyText = parts.filter(p => p.suf === 'body').map(p => p.text).join(' ');
      const evText = parts.filter(p => /^(why|basis)$/.test(p.suf)).map(p => p.text).join(' ');
      a.chars.push(readText.length); a.bodyChars.push(bodyText.length);
      if (!used.length && !ln || bodyText.length < 400) a.thin++;
      // 개인화: 이름 없는 본문 전체의 같음 + 문장 집합
      const ss = sents(proseText).filter(s => s.length >= 14), keySet = new Set(ss.map(norm));
      const h = [...keySet].sort().join('|'); a.hash[h] = (a.hash[h] || 0) + 1; a.sentPeople.push(keySet);
      // 장 사이 반복(같은 사람, 앞 장에 이미 나온 문장)
      let rep = 0, repSame = 0;
      for (const s of ss) { const k = norm(s); const prev = seen.get(k); if (prev && prev !== id) { rep++; if (topicOf(prev) === topicOf(id)) repSame++; const ex = s.slice(0, 70) + ' ← ' + prev.replace('timeline_', ''); a.repeatEx[ex] = (a.repeatEx[ex] || 0) + 1; } else if (!prev) seen.set(k, id); }
      if (rep) a.repeat++; if (repSame) a.repeatSame++; a.repeatN.push(rep);
      Object.entries(FACTS).forEach(([f, re]) => { if (re.test(readText)) { (factSeen[f] = factSeen[f] || []).push(id); } });
      // 근거 문장에 실제 값
      const ev = sents(evText).filter(s => s.length >= 10 && !/^(명리 근거 펼쳐보기|왜 이렇게 풀이했는지|풀이 디테일)/.test(s));
      if (!ev.length) a.evidNone++; let hasMine = false; ev.forEach(s => { a.evid++; if (mineRe.test(s)) { a.evidMine++; hasMine = true; } }); if (hasMine) a.evidHas++;
      if (/검수 근거가 아직 충분하지 않습니다/.test(evText)) a.evidThin++;
      // 금지 표현(본문만 — 근거·안내 문장 제외)
      // 층별 첫 걸림(층 이름: 예문) — 어느 층을 고쳐야 하는지 보이게
      // 부정·면책 문장("~을 뜻하지 않습니다", "무조건 나쁘게 보지 않습니다")은 뺀다. only: 이 조건도 맞는 문장만
      const firstHit = (re, only) => { for (const p of parts) { if (/^(head|end|why|basis|chart|panel)$/.test(p.suf)) continue; const s = sents(p.text).find(x => re.test(x) && !NEGATED.test(x) && (!only || only.test(x))); if (s) return { layer: layerName(p), word: s.match(re)[0], s: s.slice(0, 90) }; } return null; };
      const tally = (box, h) => { const k = h.layer + ' · ' + h.word; const e = box[k] = box[k] || { n: 0, ex: h.s }; e.n++; };
      const bh = firstHit(BAN_LUCK); if (bh) { a.ban++; tally(a.banEx, bh); }
      if (IK.BANNED_RE.test(proseText) || ST.PROHIBITED_RE.test(proseText)) a.svcBan++;
      // 나이대: 넓은 낱말 검사(참고)와, 지금 겪는 일처럼 말하는 문장(문제)
      if (age < 20) { a.young++; if (firstHit(ADULT)) a.youngAny++; const h = firstHit(ADULT, NOW_EXP); if (h) { a.youngBad++; tally(a.youngEx, h); } }
      if (age >= 65) { a.senior++; const h = firstHit(SENIOR_ODD); if (h) { a.seniorBad++; tally(a.seniorEx, h); } }
      // 그래프·점수와 본문(해 단위) — 글 층만, 달 단위 문장 제외
      const kind = KIND_OF(id), rk = kind ? rankOf(kind) : [];
      const narrText = parts.filter(p => PROSE_LAYERS.has(layerName(p))).map(p => p.text).join(' ');
      for (const s of sents(narrText).flatMap(x => x.split(/(?:이고|이며|지만|는데|고,|,)\s+/))) {
        if (/\d+월/.test(s)) continue;
        const ys = [...s.matchAll(/(20\d\d)년/g)].map(m => +m[1]).filter(y => y >= nowYear && y <= nowYear + 9); if (!ys.length || !rk.length) continue;
        const pos = POS_CUE.test(s), neg = NEG_CUE.test(s); if (pos === neg) continue;
        for (const y of ys) { const r = rk.indexOf(y); if (r < 0) continue; a.graphChecked++; if ((pos && r >= 7) || (neg && r <= 1)) { a.graphBad++; if (a.graphEx.length < 4) a.graphEx.push(`${y}년(${KIND_OF(id)} 그래프 ${r + 1}위/10) ${pos ? '좋다' : '조심'}: ${s.slice(0, 80)}`); } }
      }
      // 지금 대운 이름이 실제와 다른가
      const dm = readText.match(/지금[^.]{0,20}?([가-힣]{2}) 대운/); if (dm && curDw && dwNames.includes(dm[1]) && dm[1] !== curDw) a.dwBad++;
      // 앞으로 ~세 가 이미 지난 나이인가
      for (const s of sents(readText)) { if (!/앞으로|다가올|오는/.test(s)) continue; const m = [...s.matchAll(/(\d{2})(?:세|살)(?![가-힣]*(?:까지|이전|전|무렵에 지나))/g)].map(x => +x[1]).filter(x => x < age - 1 && !/대부터|세부터.*까지/.test(s)); if (m.length) { a.ageBad++; if (a.ageEx.length < 3) a.ageEx.push(`${age}세에게 '${s.slice(0, 70)}'`); break; } }
    }
    Object.entries(factSeen).forEach(([f, ids]) => ids.forEach(id => { A[id].factHits[f] = (A[id].factHits[f] || 0) + 1; }));
    (A.__fact = A.__fact || {}); Object.entries(factSeen).forEach(([f, ids]) => { (A.__fact[f] = A.__fact[f] || []).push(ids.length); });
    if ((pi + 1) % 60 === 0) console.log(`  ${pi + 1}/${N}명 · ${((Date.now() - t0) / 1000).toFixed(0)}초`);
  }
  const factSpread = A.__fact; delete A.__fact;

  // ── 꺼진 층: topic-deep 를 켰을 때 붙는 블록(표본 60명) ──
  const tdRes = {}; let tdOk = false;
  try {
    for (const f of ['compat-pair.js', 'fengshui-data.js', 'fengshui-engine.js', 'wealth-career-data.js', 'wealth-career-data-2.js', 'wealth-career-data-3.js', 'wealth-career-jobs.js', 'wealth-career.js', 'region-data.js', 'region-reading-data.js', 'region-reading.js', 'wish-spots.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
    ROOT_MODS.forEach(([n, g]) => wrapMod(n, g));
    TD._force(true, []); tdOk = true;
    for (let pi = 0; pi < Math.min(60, N); pi++) {
      seenPerson.clear(); const ch = M.compute(people[pi]), sd = R.SajuData.build(ch, { now: NOW }), H = { M, ch: spy(ch, 'ch'), sd: spy(sd, 'sd'), now: NOW, name: '', assets: {} };
      Object.entries(TD.PLAN).forEach(([id, pl]) => { CUR = 'td:' + id; const r = tdRes[id] = tdRes[id] || { n: 0, ok: 0, chars: [] }; r.n++; const htmls = pl[1].map(p => { try { return TD.render(p, H, id); } catch (e) { return null; } }).filter(Boolean); if (htmls.length) { r.ok++; r.chars.push(strip(htmls.join(' ')).length); } });
    }
    TD._force(false);
  } catch (e) { tdOk = 'topic-deep 측정 실패: ' + e.message; }
  CUR = null;
  // 만세력 본 앱의 고급 모듈도 한 번씩 돌려 "타임라인에서 안 쓰는 계산"이 무엇을 내는지 확인(로드 가능 여부)
  const rootLoad = {};
  for (const [n, g] of ROOT_MODS) {
    const f = path.join(root, n + '.js'); if (!fs.existsSync(f)) { rootLoad[n] = '파일 없음'; continue; }
    try { if (!globalThis[g]) { const pre = { 'wealth-career': [], 'region-reading': [] }; vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f }); } rootLoad[n] = globalThis[g] ? Object.keys(globalThis[g]).filter(k => typeof globalThis[g][k] === 'function').length + '개 함수' : '전역 없음'; } catch (e) { rootLoad[n] = '로드 실패: ' + e.message.slice(0, 60); }
  }

  // ── 장별 지표 ──
  const pairSame = a => { const tot = Object.values(a.hash).reduce((x, y) => x + y, 0); return tot ? Object.values(a.hash).reduce((s, v) => s + (v / tot) ** 2, 0) : 0; };
  const jacc = sp => { if (sp.length < 2) return 0; let s = 0, k = 0; for (let i = 0; i < 300; i++) { const x = sp[Math.floor(rnd() * sp.length)], y = sp[Math.floor(rnd() * sp.length)]; if (x === y) continue; let inter = 0; x.forEach(v => { if (y.has(v)) inter++; }); const uni = x.size + y.size - inter; s += uni ? inter / uni : 1; k++; } return k ? s / k : 0; };
  const fixedShare = sp => { const cnt = {}; let tot = 0; sp.forEach(set => set.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; tot++; })); const half = sp.length / 2; let fixed = 0; Object.values(cnt).forEach(v => { if (v >= half) fixed += v; }); return tot ? fixed / tot : 0; };
  const layersOf = id => {
    const out = [];
    if (pass[id]) out.push('DB 게시본(rebuild ' + entryWhen[id].entries + '편)');
    if (LN && LN.CHAPTERS[id]) out.push('서사 엔진(' + LN.CHAPTERS[id] + ')');
    const sp = RF.SPEC[id]; if (sp) sp.parts.forEach(p => out.push(p.sec ? 'Deep.' + p.sec : p.custom && /^fx:/.test(p.custom) ? 'fate-blocks ' + p.custom : p.custom && /^td:/.test(p.custom) ? 'topic-deep ' + p.custom + '(꺼짐)' : 'feature ' + p.custom));
    return [...new Set(out)];
  };
  const rows = ORDER.map(id => {
    const a = A[id], n = a.n || 1, sp = a.sentPeople;
    const topEntry = Object.entries(a.dbEntries).sort((x, y) => y[1] - x[1])[0];
    const layerShare = Object.fromEntries(Object.entries(a.layers).map(([k, v]) => [k, +(v / n).toFixed(3)]));
    const layerAvg = Object.fromEntries(Object.entries(a.layerChars).map(([k, v]) => [k, Math.round(avg(v))]));
    return {
      id, short: id.replace('timeline_', ''), title: TITLES[id.replace('timeline_', '')], topic: topicOf(id), layers: layersOf(id),
      dbFallback: a.dbFallback / n, dbPending: a.dbPending / n, dbEntryKinds: Object.keys(a.dbEntries).length, dbTopEntry: topEntry ? topEntry[0] : null, dbTopShare: topEntry ? topEntry[1] / n : 0,
      narrative: a.narr / n, narrRuleKinds: Object.keys(a.narrRules).length, thin: a.thin / n, avgChars: Math.round(avg(a.chars)), avgBody: Math.round(avg(a.bodyChars)), layerShare, layerAvg,
      sameText: pairSame(a), uniqueTexts: Object.keys(a.hash).length, jaccard: jacc(sp), fixedShare: fixedShare(sp),
      repeat: a.repeat / n, repeatSame: a.repeatSame / n, repeatAvg: avg(a.repeatN), repeatEx: Object.entries(a.repeatEx).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([s, v]) => `${s} (${v}명)`),
      facts: Object.fromEntries(Object.entries(a.factHits).map(([k, v]) => [k, +(v / n).toFixed(2)])),
      evidMine: a.evid ? a.evidMine / a.evid : 0, evidHas: a.evidHas / n, evidThin: a.evidThin / n, chartCaption: a.chartCaption / n, evidNone: a.evidNone / n, evidPerPerson: a.evid / n,
      ban: a.ban / n, banEx: a.banEx, svcBan: a.svcBan / n,
      youngN: a.young, youngAny: a.young ? a.youngAny / a.young : 0, youngBad: a.young ? a.youngBad / a.young : 0, youngEx: a.youngEx, seniorN: a.senior, seniorBad: a.senior ? a.seniorBad / a.senior : 0, seniorEx: a.seniorEx,
      graphChecked: a.graphChecked, graphBad: a.graphChecked ? a.graphBad / a.graphChecked : 0, graphEx: a.graphEx, dwBad: a.dwBad / n, ageBad: a.ageBad / n, ageEx: a.ageEx,
      errors: a.err, errEx: a.errEx, dbWhenKeys: entryWhen[id].keys
    };
  });
  // 비공개 3주제 재료 준비도
  const hiddenRows = allIds.filter(id => !ORDER.includes(id)).map(id => { const a = A[id], n = a.n || 1; return { id, short: id.replace('timeline_', ''), topic: topicOf(id), entries: entryWhen[id].entries, dbFallback: a.dbFallback / n, kinds: Object.keys(a.dbEntries).length, title: (contractOf[id] || {}).title || '' }; });

  // ── 판정(유지/보완/통합/신설 후보) ──
  const verdict = r => {
    const why = [];
    if (r.errors) why.push(`조립 오류 ${r.errors}건`);
    if (r.thin >= 0.3) why.push(`얇은 장 ${pct(r.thin)}`);
    if (r.dbFallback >= 0.3 && r.narrative < 0.5) why.push(`DB 문안 없음 ${pct(r.dbFallback)}(서사 대체 ${pct(r.narrative)})`);
    if (r.sameText >= 0.2) why.push(`두 사람이 같은 글 ${pct(r.sameText)}`);
    if (r.jaccard >= 0.45) why.push(`문장 겹침 ${pct(r.jaccard)}`);
    if (r.repeat >= 0.3) why.push(`앞 장 문장 반복 ${pct(r.repeat)}`);
    if (r.graphBad >= 0.15 && r.graphChecked >= 20) why.push(`그래프와 어긋남 ${pct(r.graphBad)}`);
    if (r.evidHas < 0.7) why.push(`근거에 내 사주 값 줄 ${pct(r.evidHas)}`);
    if (r.evidThin >= 0.3) why.push(`'검수 근거 부족' 안내 ${pct(r.evidThin)}`);
    if (r.ban >= 0.02) why.push(`단정 표현 ${pct(r.ban)}`);
    if (r.youngBad >= 0.3 && r.youngN >= 10) why.push(`20세 미만 어른 장면 ${pct(r.youngBad)}`);
    if (r.seniorBad >= 0.1 && r.seniorN >= 10) why.push(`65세+ 어색한 장면 ${pct(r.seniorBad)}`);
    let v = '유지';
    const heavy = why.filter(w => /얇은|DB 문안 없음|같은 글|조립 오류/.test(w)).length;
    if (why.length) v = '보완';
    if (heavy >= 2) v = '보완(우선)';
    return { v, why };
  };
  rows.forEach(r => Object.assign(r, verdict(r)));
  // 통합 후보: 같은 주제·다른 주제에서 문장 집합이 크게 겹치는 장 쌍(사람별 평균 자카드)
  const overlapPairs = [];
  {
    const idx = ORDER.map(id => A[id].sentPeople);
    for (let i = 0; i < ORDER.length; i++) for (let j = i + 1; j < ORDER.length; j++) {
      let s = 0, k = 0; for (let p = 0; p < Math.min(N, 120); p++) { const x = idx[i][p], y = idx[j][p]; if (!x || !y || !x.size || !y.size) continue; let inter = 0; x.forEach(v => { if (y.has(v)) inter++; }); s += inter / Math.min(x.size, y.size); k++; }
      const v = k ? s / k : 0; if (v >= 0.08) overlapPairs.push({ a: ORDER[i].replace('timeline_', ''), b: ORDER[j].replace('timeline_', ''), share: v });
    }
    overlapPairs.sort((x, y) => y.share - x.share);
  }
  // 주제가 겹치는 장(질문이 같은 장) — 제목 기준 수동 대응표
  const SAME_Q = [['self_26', 'career_01', '맞는 일'], ['self_30', 'wealth_01', '재물 전체·그릇'], ['self_31', 'wealth_01', '재물 그릇'], ['self_32', 'wealth_02', '돈 버는 방식'], ['self_27', 'love_01', '인연 전체'], ['self_29', 'love_07', '배우자'], ['self_34', 'love_11', '자식운'], ['self_24', 'career_08', '움직일 때'], ['self_37', 'wealth_15', '개운법'], ['self_37', 'career_15', '개운법'], ['self_37', 'love_15', '개운법'], ['self_18', 'wealth_11', '최고·최악'], ['wealth_06', 'wealth_10', '재물 시기'], ['wealth_10', 'wealth_14', '재물 시기'], ['career_08', 'career_14', '커리어 시기'], ['love_08', 'love_14', '인연 시기']];

  // ── 엔진 활용 지도 ──
  const ENGINE = [
    ['ch.unified (통합 용신: 억부·조후·격국·통관·제화·종격)', ['ch.unified']],
    ['ch.daeun / 대운 목록', ['ch.daeun', 'sd.daewoon', 'sd.currentDaewoon', 'Manse.daeunAt']],
    ['세운·월운(seunRange·wolun·monthsOfYear)', ['Manse.seunRange', 'Manse.wolun', 'Manse.monthsOfYear', 'Manse.yearPillarOf', 'sd.sewoon']],
    ['운 점수(evaluateLuck·luckItem)', ['Manse.evaluateLuck', 'Manse.luckItem']],
    ['분야 지수(evaluateDomainLuck: 재물·인연·건강·사고·확장 12종)', ['Manse.evaluateDomainLuck']],
    ['합충·관계(luckRelations·relationsAmong)', ['Manse.luckRelations', 'Manse.relationsAmong', 'sd.relations']],
    ['12운성(Manse.unseong 함수 호출 — 기둥 값 sd.pillars.*.unseong 은 deep-time·deep-life·reading-insight 가 직접 읽음)', ['Manse.unseong', 'sd.unseong']],
    ['12신살·특수 신살·공망', ['Manse.sinsal12', 'Manse.gongmangOf', 'sd.sinsal12', 'sd.specialStars', 'sd.gongmang']],
    ['직업 엔진(engine.js careerProfile·careerWorkStyle·evaluateCareerCategory)', ['Manse.careerProfile', 'Manse.careerWorkStyle', 'Manse.evaluateCareerCategory', 'Manse.evaluateCareerEnvironment', 'Manse.careerLuckActivation']],
    ['궁합(compatDayPillars·compatAttraction·evaluateDayPillarCompatibility)', ['Manse.compatDayPillars', 'Manse.compatAttraction', 'Manse.evaluateDayPillarCompatibility', 'Manse.evaluateAttraction', 'Manse.evaluateCompatibleElement']],
    ['삼재(getSamjae)', ['Manse.getSamjae']],
    ['변동성(calculateVolatility)', ['Manse.calculateVolatility', 'Manse.volatilityNote']],
    ['뿌리·통근(analyzeNatalRoot·analyzeLuckRootSupport)', ['Manse.analyzeNatalRoot', 'Manse.analyzeLuckRootSupport', 'Manse.evaluateCurrentRootState', 'Manse.rootSummary']],
    ['조후(ch.climate 한난조습·Manse.climate·conditionOf)', ['ch.climate', 'Manse.climate', 'Manse.conditionOf']],
    ['자미두수(ziweiPeriod·zwBright)', ['Manse.ziweiPeriod', 'Manse.zwBright']],
    ['오행 분포·십성 묶음(sd.fiveElements·groupEl·dominantGroup)', ['sd.fiveElements', 'sd.groupEl', 'sd.dominantGroup', 'sd.weakestGroup', 'sd.tenGods']],
    ['신강·신약(sd.strength)', ['sd.strength']],
    ['용신 오행(sd.usefulElements)', ['sd.usefulElements']]
  ];
  const usedBy = keys => { const set = {}; keys.forEach(k => Object.entries(use[k] || {}).forEach(([c, v]) => { const cc = c.replace(/^(db:|td:)/, ''); if (/^db:/.test(c)) return; set[(c.startsWith('td:') ? '(꺼짐)' : '') + cc.replace('timeline_', '')] = Math.max(set[cc] || 0, v); })); return Object.keys(set); };
  const engineMap = ENGINE.map(([label, keys]) => { const chs = usedBy(keys); return { label, keys, chapters: chs.filter(c => !c.startsWith('(꺼짐)')), offOnly: chs.filter(c => c.startsWith('(꺼짐)')).map(c => c.replace('(꺼짐)', '')).filter(c => !chs.includes(c)) }; });
  const MODS = [['luck-cycle.js', '대운 30년·세운 2년 오행 사이클', 'MantraLuckCycle'], ['unseong-cycle.js', '12운성 생명주기 해석', 'MantraUnseong'], ['gyeok-structure.js', '격국 분석 카드(정격·특수격·십성 작용)', 'MantraGyeokStructure'], ['wealth-career.js', '돈 버는 방식·업무 환경·직업·약점 4섹션', 'MantraWealthCareer'], ['health-body.js', '오행 건강 지도(장부·체질)', 'MantraHealthBody'], ['accident-hint.js', '사고수 신호(충·형·백호·양인 등)', 'MantraAccidentHint'], ['region-reading.js', '지역 방위 해석(월령·조후·충돌 이유)', 'MantraRegionReading'], ['compat-pair.js', '두 사람 궁합', 'PairCompat'], ['luck-interpret.js', '운세 환경 해석', 'MantraLuckInterpret'], ['byeongyak.js', '병약(病藥) 판정', 'MantraByeongyak'], ['jonggyeok.js', '종격 판정', 'MantraJonggyeok'], ['gyeokguk.js', '격국 판정', 'MantraGyeokguk'], ['fengshui-engine.js', '현공·팔택 풍수', 'MantraFengshui'], ['wish-spots.js', '소원성취 명당', 'MantraWishSpots']];
  const modMap = MODS.map(([file, what, g]) => {
    const name = file.replace('.js', ''), inV2 = v2Scripts.includes(file), inMain = new RegExp('src="/?' + file.replace('.', '\\.')).test(mainHtml), inAdmin = new RegExp(file.replace('.', '\\.')).test(adminHtml);
    const td = Object.keys(use).filter(k => k.startsWith(name + '.')).flatMap(k => Object.keys(use[k])).filter(c => c.startsWith('td:')).map(c => c.replace('td:timeline_', ''));
    return { file, what, timelineLoaded: inV2, mainApp: inMain, admin: inAdmin, topicDeepOff: [...new Set(td)], load: rootLoad[name] || '' };
  });
  // 장 → 엔진 항목(엔진 지도 역방향)
  const chapterEngine = Object.fromEntries(ORDER.map(id => [id.replace('timeline_', ''), engineMap.filter(e => e.chapters.includes(id.replace('timeline_', ''))).map(e => e.label.split('(')[0].trim())]));
  const deepBy = Object.fromEntries(Object.keys(use).filter(k => /^(Deep|FateBlocks)\./.test(k)).map(k => [k, Object.keys(use[k]).filter(c => !/^(db|td):/.test(c)).map(c => c.replace('timeline_', ''))]));

  // ── 우선순위 제안(최대 10) ──
  const T = t => rows.filter(r => r.topic === t), byTopic = Object.fromEntries(CATALOG.topics.map(t => [t.id, T(t.id)]));
  const sumTopic = t => { const rs = byTopic[t]; return { n: rs.length, thin: avg(rs.map(r => r.thin)), same: avg(rs.map(r => r.sameText)), jac: avg(rs.map(r => r.jaccard)), rep: avg(rs.map(r => r.repeat)), evid: avg(rs.map(r => r.evidMine)), narr: avg(rs.map(r => r.narrative)), fb: avg(rs.map(r => r.dbFallback)), chars: Math.round(avg(rs.map(r => r.avgChars))) }; };
  const topicSum = Object.fromEntries(CATALOG.topics.map(t => [t.id, sumTopic(t.id)]));

  const result = { generated: STAMP, N, now: new Date(NOW).toISOString(), catalogVersion: CATALOG.version, loadFail, rows, hiddenRows, overlapPairs: overlapPairs.slice(0, 30), sameQuestion: SAME_Q, engineMap, modMap, chapterEngine, deepBy, topicDeep: { measured: tdOk, perChapter: Object.fromEntries(Object.entries(tdRes).map(([id, r]) => [id.replace('timeline_', ''), { rendered: r.ok / r.n, avgChars: Math.round(avg(r.chars)) }])) }, factSpread: Object.fromEntries(Object.entries(factSpread || {}).map(([f, a]) => [f, { avgChapters: +avg(a).toFixed(1), max: Math.max(...a) }])), topicSum };
  fs.mkdirSync(path.join(root, 'report/admin/data'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/timeline-chapter-audit.json'), JSON.stringify(result, null, 1));
  fs.writeFileSync(path.join(root, 'report/admin/data/timeline-chapter-audit.json'), JSON.stringify(result));
  console.log(`완료: ${N}명 × ${ORDER.length}장 (+비공개 ${hiddenRows.length}장 재료) · ${((Date.now() - t0) / 1000).toFixed(0)}초 · 로드 실패 ${loadFail.length}`);
  if (loadFail.length) console.log(loadFail.join('\n'));
  console.log('문서는 node tools/timeline-chapter-audit-report.cjs 로 만듭니다(같은 json 을 읽음).');
})().catch(e => { console.error(e); process.exit(1); });
