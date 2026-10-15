// 인터랙티브 스토리 온보딩 + 운명의 타임라인: 데이터·순수 로직 (화면 없음 — node 테스트에서 그대로 불러 검증한다):  node tests/quest-sim.js
//   ① 에셋 목록(장면 배경 12종·안내자 2종, PC/모바일 초점)  ② 안내자별 대사  ③ 단계 순서·조건부 단계  ④ 달·계절·윤달·일수 계산 도우미
//   ⑤ 관리자 설정(quest · timeline) 병합 — 입력 종류와 계산 연결은 코드가 고정한다.
// 대사는 "스토리 연출"이다. 명리 풀이 문구(일간·일주 소개, 운 흐름)는 여기 두지 않는다 — 그것은 /report/v2/intro-text.js · 엔진 값에서 온다.
// onboard-data.js 가 먼저 불러져 있어야 한다. O.DEFAULTS.quest / .timeline 이 붙고 O.merge 가 두 키도 함께 병합한다.
(function (root) {
  'use strict';
  var O = root.Onboard || (typeof require !== 'undefined' ? require('./onboard-data.js') : null);
  var Q = {};

  /* ── 에셋: 저장소 안의 기본 파일(report/hub/quest/*.webp). 관리자가 같은 키로 다른 이미지를 올리면 그것이 우선한다. ──
     focus: 세로로 긴 그림(1116×2000)을 가로 화면에 맞춰 자를 때 남길 중심. 값은 CSS background-position 이다. */
  var BASE = '/report/hub/quest/';
  var ASSETS = {
    gate:      { label: '봉인의 문 (수면 위 문·붉은 달)', pc: '50% 52%', mobile: '50% 58%' },
    courtyard: { label: '안내자의 뜰 (달밤의 마당)', pc: '50% 45%', mobile: '50% 50%' },
    archive:   { label: '기록의 서고', pc: '50% 62%', mobile: '50% 66%' },
    papers:    { label: '부적이 떠 있는 마당', pc: '50% 40%', mobile: '50% 45%' },
    reeds:     { label: '갈대밭의 문', pc: '50% 40%', mobile: '50% 45%' },
    mirror:    { label: '시간의 거울 (비 오는 마당의 인물)', pc: '50% 28%', mobile: '50% 24%' },
    paths:     { label: '물 위의 돌길', pc: '50% 60%', mobile: '50% 62%' },
    letter:    { label: '불타는 부적', pc: '50% 50%', mobile: '50% 50%' },
    portal:    { label: '거울 연못의 마당', pc: '50% 38%', mobile: '50% 42%' },
    office:    { label: '비 오는 밤의 상담실', pc: '50% 55%', mobile: '50% 58%' },
    male:      { label: '남성 안내자 장면 (붉은 하늘의 누각)', pc: '50% 58%', mobile: '50% 60%' },
    female:    { label: '여성 안내자 장면 (문이 늘어선 회랑)', pc: '50% 45%', mobile: '50% 40%' },
  };
  var ASSET_KEYS = Object.keys(ASSETS);
  Object.keys(ASSETS).forEach(function (k) { ASSETS[k].file = BASE + k + '.webp'; ASSETS[k].key = k; });
  ASSETS.courtyard.pc = '50% 50%'; // 가로 원본(1350×753)이라 중심만 맞춘다

  /* ── 안내자: 말투와 진행 방식만 다르다(계산 결과는 같다) ── */
  var GUIDES = {
    male:   { id: 'male',   name: '운명 감찰관', tag: '강점과 취약점, 주의할 선택을 짚어줄게', asset: 'male',   tone: '냉철하고 직설적이지만 무례하지 않은 반말' },
    female: { id: 'female', name: '명운 해독관', tag: '사주의 구조와 시간의 흐름을 해석합니다',   asset: 'female', tone: '차분하고 지적인 단정한 존댓말' },
  };

  /* ── 단계(장면) ──
     kind: seal(오프닝) · guide(안내자 선택) · input(입력) · confirm(확인).  group: 확인 화면에서 "수정"을 누르면 그 묶음의 첫 단계로 가고, 묶음의 마지막 단계를 마치면 확인으로 돌아온다.
     required: 끌 수 없는 단계(계산에 필요한 입력). 연출용 단계(seal·guide)만 관리자가 끌 수 있다.
     lines: 안내자별 대사 — 템플릿 {귀인} {이름귀인} {이름} {year} {month}. */
  var STEPS = [
    { id: 'seal', kind: 'seal', asset: 'gate', title: '서막 · 불타는 봉인', required: false, button: '봉인을 태워 문을 열기 →',
      head: '불에 사라지는 것은\n봉인뿐입니다.', desc: '태어난 순간은 지나갔어도,\n그날의 기록은 아직 이곳에 남아 있습니다.', hint: '부적의 봉인이 타들어 가면, 경계가 열립니다.', lines: { male: [], female: [] } },
    { id: 'guide', kind: 'guide', asset: 'courtyard', title: '제2막 · 두 명의 안내자', required: false, button: '',
      head: '경계의 기록을 누가 펼쳐 드릴까요?', hint: '안내자의 말투와 진행 방식만 달라집니다. 운명의 계산 결과는 같습니다.', lines: { male: [], female: [] } },
    { id: 'name', kind: 'input', field: 'name', group: 'name', asset: 'archive', title: '첫 번째 기록 · 이름', required: true, button: '이 이름으로 기록하기 →',
      hint: '이름은 화면에서 부르는 데에만 쓰이며 사주 계산에는 영향을 주지 않습니다.',
      lines: { male: ['어떤 이름으로 기록해 드릴까요?', '본명이든 불리는 이름이든 괜찮습니다.'], female: ['어떤 이름으로 기록해 드릴까요?', '본명이어도, 불리는 이름이어도 괜찮습니다.'] } },
    { id: 'gender', kind: 'input', field: 'gender', group: 'gender', asset: 'papers', title: '두 번째 기록 · 성별', required: true, button: '',
      hint: '대운이 흐르는 방향을 계산하는 데 쓰이는 항목입니다.',
      lines: { male: ['{이름귀인}, 한 가지만 더 여쭙겠습니다.', '운이 흐르는 방향을 읽을 때 필요한 기록입니다.'], female: ['{이름귀인}, 성별을 확인하겠습니다.', '대운이 흐르는 방향을 계산하는 데 사용됩니다.'] } },
    { id: 'calendar', kind: 'input', field: 'calendar', group: 'date', asset: 'papers', title: '세 번째 기록 · 달력', required: true, button: '',
      hint: '음력을 고르면, 그 해에 윤달이 있는 달일 때만 윤달 여부를 한 번 더 여쭙니다.',
      lines: { male: ['{이름귀인}, 태어난 날은 양력과 음력 중 어느 쪽으로 기억하고 계십니까?'], female: ['{이름귀인}, 생일을 어느 달력 기준으로 알고 계십니까?'] } },
    { id: 'year', kind: 'input', field: 'year', group: 'date', asset: 'archive', title: '네 번째 기록 · 태어난 해', required: true, button: '이 해가 맞습니다 →',
      hint: '직접 입력하거나 버튼으로 움직일 수 있습니다.',
      lines: { male: ['이제 연대기의 봉인을 풀어 볼까요.', '태어나신 해는 언제입니까?'], female: ['태어난 연도를 확인하겠습니다.', '정확한 해를 입력해 주십시오.'] } },
    { id: 'month', kind: 'input', field: 'month', group: 'date', asset: 'archive', title: '다섯 번째 기록 · 태어난 달', required: true, button: '',
      hint: '달을 고르면 배경의 계절이 따라 바뀝니다. 실제 계산은 정확한 날짜와 절기를 기준으로 합니다.',
      lines: { male: ['몇 월이었는지 기억하십니까?', '달을 고르시면 그 계절의 풍경이 따라 바뀝니다.'], female: ['태어난 달을 선택해 주십시오.', '선택한 달에 맞춰 배경의 계절이 바뀝니다.'] } },
    { id: 'day', kind: 'input', field: 'day', group: 'date', asset: 'papers', title: '여섯 번째 기록 · 태어난 날', required: true, button: '',
      hint: '',
      lines: { male: ['{year}년 {month}월이군요.', '그달의 며칠이었습니까?'], female: ['{year}년 {month}월입니다.', '태어난 날짜를 선택해 주십시오.'] } },
    { id: 'time', kind: 'input', field: 'time', group: 'time', asset: 'mirror', title: '일곱 번째 기록 · 태어난 시각', required: true, button: '이 시각으로 기록하기 →',
      hint: '시각을 모르면 시주(時柱) 없이 연·월·일 기준으로 계산합니다.',
      lines: { male: ['시간의 원판을 돌려 보겠습니다.', '태어난 시각을 기억하십니까?'], female: ['같은 날이라도 태어난 시각에 따라 시주(時柱)가 달라집니다.', '시와 분을 정확히 알려 주십시오.'] },
      unknownLines: { male: ['시각을 모르셔도 괜찮습니다.', '시주는 비워 두고 연·월·일 기준으로 읽겠습니다.'], female: ['시각 미상으로 기록하겠습니다.', '시주는 제외하고 연·월·일 기준으로 계산합니다.'] } },
    { id: 'place', kind: 'input', field: 'place', group: 'place', asset: 'paths', title: '여덟 번째 기록 · 태어난 곳', required: true, button: '출생지를 기록하기 →',
      hint: '출생지의 경도는 태어난 시각을 보정하는 데 쓰입니다.',
      lines: { male: ['마지막으로, 태어난 곳을 알려 주십시오.'], female: ['마지막 기록입니다.', '태어난 지역을 선택해 주십시오.'] } },
    { id: 'confirm', kind: 'confirm', field: 'confirm', group: 'confirm', asset: 'letter', title: '기록의 봉인 · 확인', required: true, button: '운명의 기록을 열겠습니다 →',
      hint: '출생정보는 이 기기 안에서만 계산되며 서버로 보내지 않습니다.',
      lines: { male: ['{이름귀인}, 기록이 완성되었습니다.', '틀린 곳이 없는지 한 번만 봐 주십시오.'], female: ['기록을 대조했습니다.', '입력한 내용이 맞는지 확인해 주십시오.'] } },
  ];
  STEPS.forEach(function (x) { x.enabled = true; });
  var CALC_LINES = { male: ['기록을 펼치는 중입니다. 잠시만요.'], female: ['명식을 계산하고 있습니다.'] };
  var ERR_LINES = { male: ['이런, 기록이 맞물리지 않습니다.', '아래 안내를 보시고 한 번만 고쳐 주십시오.'], female: ['계산 중 문제가 확인되었습니다.', '아래 안내에 따라 입력을 수정해 주십시오.'] };
  var RESUME = { head: '멈춘 자리가 남아 있습니다.', desc: '지난번에 입력하던 기록을 이어서 펼치시겠습니까?', yes: '이어서 하기', no: '처음부터 다시' };
  var LEAP = { head: '윤달 확인', body: '{year}년에는 윤{month}월이 있습니다.\n윤{month}월에 태어나셨습니까?', yes: '윤{month}월입니다', no: '윤달이 아닌 {month}월입니다' };

  var QUEST = {
    enabled: true,        // 끄면 예전 슬라이드 툰(#/begin 의 6장면)으로 돌아간다
    resume: true,         // 입력 중 이탈 → 이어하기 제안
    skipReturning: true,  // 출생정보 수정(재방문)에서는 부적 오프닝·안내자 선택을 건너뛴다
    fx: 'fade',           // 장면 전환: fade | rise | none
    steps: STEPS, guides: GUIDES, calcLines: CALC_LINES, errLines: ERR_LINES, resumeText: RESUME, leapText: LEAP, assets: {},
  };

  /* ── 운명의 타임라인 설정 ── */
  var TL_SECTIONS = [
    { id: 'birth', enabled: true, title: '태어난 순간', sub: '사주 원국 · 일간과 일주 · 오행과 십성' },
    { id: 'flow',  enabled: true, title: '인생 전체의 흐름', sub: '10년 단위 대운과 그 안의 해' },
    { id: 'now',   enabled: true, title: '지금과 앞으로', sub: '세운 · 월운 · 오늘의 일진' },
    { id: 'themes', enabled: true, title: '인생의 주요 주제', sub: '궁금한 분야를 눌러 자세한 풀이로' },
  ];
  var TIMELINE = {
    enabled: true,
    sections: TL_SECTIONS,
    graph: { elements: true, ziwei: true, daeun: true, seun: true, wolun: true, today: true },
    texts: { intro: '태어난 순간에서 시작된 운의 흐름을 따라가 봅니다.', notice: '사주는 전통 해석에 바탕한 참고용 콘텐츠이며 미래를 단정하지 않습니다. 그래프의 점수는 명리 모델 안의 상대적 지표입니다.' },
  };
  var ACCESS = { free: '무료', paid: '유료' };

  O.DEFAULTS.quest = QUEST; O.DEFAULTS.timeline = TIMELINE;

  /* ── 문자열·이미지 정리(서버 functions/api/onboarding.js 의 cleanQuest 와 같은 규칙) ── */
  var s = function (v, n) { return typeof v === 'string' ? v.trim().slice(0, n) : ''; };
  var IMG = /^(\/api\/clipfile\?k=[\w.-]{1,120}|\/report\/hub\/quest\/[\w.-]{1,60}\.(webp|png|jpe?g)|https:\/\/[^\s"'<>]{1,500})$/;
  var img = function (v) { v = s(v, 600); return IMG.test(v) ? v : ''; };
  var focus = function (v) { v = s(v, 12); return /^\d{1,3}% \d{1,3}%$/.test(v) ? v : ''; };
  var arr = function (a, n, len) { return Array.isArray(a) ? a.slice(0, n).map(function (x) { return s(String(x == null ? '' : x), len); }).filter(Boolean) : []; };
  var FX = ['fade', 'rise', 'none'];
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };

  function mergeQuest(base, ov) {
    var out = clone(base || QUEST); if (!ov || typeof ov !== 'object') return out;
    if (typeof ov.enabled === 'boolean') out.enabled = ov.enabled;
    if (typeof ov.resume === 'boolean') out.resume = ov.resume;
    if (typeof ov.skipReturning === 'boolean') out.skipReturning = ov.skipReturning;
    if (FX.indexOf(ov.fx) >= 0) out.fx = ov.fx;
    if (Array.isArray(ov.steps)) out.steps = out.steps.map(function (d) {
      var o = ov.steps.filter(function (x) { return x && x.id === d.id; })[0]; if (!o) return d;
      var r = Object.assign({}, d); // 입력 종류(field)·단계 종류(kind)·묶음(group)·필수 여부는 코드가 고정
      if (typeof o.title === 'string' && o.title.trim()) r.title = s(o.title, 60);
      ['button', 'hint', 'head', 'desc'].forEach(function (k) { if (typeof o[k] === 'string') r[k] = s(o[k], 400); });
      if (ASSET_KEYS.indexOf(o.asset) >= 0) r.asset = o.asset;
      r.sty = O.cleanStyleMap(o.sty, O.STY_ROLES.step); // 글자 스타일(글씨체·크기·굵기·색)
      r.bg = img(o.bg); r.bgMobile = img(o.bgMobile); r.fx = FX.indexOf(o.fx) >= 0 ? o.fx : '';
      ['lines', 'unknownLines'].forEach(function (k) { if (o[k] && typeof o[k] === 'object' && d[k]) { r[k] = { male: d[k].male, female: d[k].female }; ['male', 'female'].forEach(function (g) { var a = arr(o[k][g], 6, 160); if (a.length || Array.isArray(o[k][g])) r[k][g] = a.length ? a : d[k][g]; }); } });
      r.enabled = d.required ? true : o.enabled !== false;
      return r;
    });
    if (ov.guides && typeof ov.guides === 'object') ['male', 'female'].forEach(function (g) { var o = ov.guides[g]; if (o && typeof o === 'object') out.guides[g] = Object.assign({}, out.guides[g], { name: s(o.name, 20) || out.guides[g].name, tag: s(o.tag, 40) || out.guides[g].tag, image: img(o.image), imageMobile: img(o.imageMobile) }); });
    ['calcLines', 'errLines'].forEach(function (k) { if (ov[k] && typeof ov[k] === 'object') ['male', 'female'].forEach(function (g) { var a = arr(ov[k][g], 4, 160); if (a.length) out[k][g] = a; }); });
    if (ov.resumeText && typeof ov.resumeText === 'object') ['head', 'desc', 'yes', 'no'].forEach(function (k) { var v = s(ov.resumeText[k], 120); if (v) out.resumeText[k] = v; });
    if (ov.leapText && typeof ov.leapText === 'object') ['head', 'body', 'yes', 'no'].forEach(function (k) { var v = s(ov.leapText[k], 200); if (v) out.leapText[k] = v; });
    if (ov.assets && typeof ov.assets === 'object') ASSET_KEYS.forEach(function (k) { var o = ov.assets[k]; if (o && typeof o === 'object') out.assets[k] = { pc: img(o.pc), mobile: img(o.mobile), focusPc: focus(o.focusPc), focusMobile: focus(o.focusMobile) }; });
    return out;
  }
  function mergeTimeline(base, ov) {
    var out = clone(base || TIMELINE); if (!ov || typeof ov !== 'object') return out;
    if (typeof ov.enabled === 'boolean') out.enabled = ov.enabled;
    if (Array.isArray(ov.sections)) { // 순서·표시·문구. 알려진 영역만, 빠진 영역은 뒤에 붙인다
      var seen = {}, list = ov.sections.filter(function (x) { return x && TL_SECTIONS.some(function (d) { return d.id === x.id; }) && !seen[x.id] && (seen[x.id] = 1); }).map(function (x) {
        var d = TL_SECTIONS.filter(function (y) { return y.id === x.id; })[0]; return { id: d.id, enabled: x.enabled !== false, title: s(x.title, 40) || d.title, sub: s(x.sub, 120) };
      });
      TL_SECTIONS.forEach(function (d) { if (!list.some(function (x) { return x.id === d.id; })) list.push(clone(d)); });
      out.sections = list;
    }
    if (ov.graph && typeof ov.graph === 'object') Object.keys(out.graph).forEach(function (k) { if (typeof ov.graph[k] === 'boolean') out.graph[k] = ov.graph[k]; });
    if (ov.texts && typeof ov.texts === 'object') ['intro', 'notice'].forEach(function (k) { var v = s(ov.texts[k], 300); if (v) out.texts[k] = v; });
    return out;
  }

  // O.merge 가 quest·timeline 도 함께 병합한다(관리자 화면·방문자 화면 모두 같은 함수를 쓴다)
  var merge0 = O.merge;
  O.merge = function (base, ov) {
    var out = merge0(base, ov);
    out.quest = mergeQuest((base && base.quest) || QUEST, ov && ov.quest);
    out.timeline = mergeTimeline((base && base.timeline) || TIMELINE, ov && ov.timeline);
    return out;
  };

  /* ── 대사 치환: 기존 {귀인}·{이름귀인} + {이름} {year} {month} ── */
  Q.fill = function (text, d, cfg) {
    d = d || {}; var name = String(d.name || '').trim().slice(0, 20);
    return O.fill(String(text == null ? '' : text), name, cfg).replace(/\{이름\}/g, name || O.honorific(cfg)).replace(/\{year\}/g, d.year || '').replace(/\{month\}/g, d.month || '');
  };
  var MALE_LINES = {"어떤 이름으로 기록해 드릴까요?":"어떤 이름으로 기록해 줄까?","본명이든 불리는 이름이든 괜찮습니다.":"본명이든 불리는 이름이든 괜찮아.","{이름귀인}, 한 가지만 더 여쭙겠습니다.":"{이름}, 한 가지만 더 물을게.","운이 흐르는 방향을 읽을 때 필요한 기록입니다.":"운이 흐르는 방향을 읽는 데 필요한 기록이야.","{이름귀인}, 태어난 날은 양력과 음력 중 어느 쪽으로 기억하고 계십니까?":"{이름}, 태어난 날은 양력이야, 음력이야?","이제 연대기의 봉인을 풀어 볼까요.":"이제 연대기의 봉인을 풀어보자.","태어나신 해는 언제입니까?":"태어난 해는 언제야?","몇 월이었는지 기억하십니까?":"몇 월이었는지 기억해?","달을 고르시면 그 계절의 풍경이 따라 바뀝니다.":"달을 고르면 그 계절의 풍경이 따라 바뀔 거야.","{year}년 {month}월이군요.":"{year}년 {month}월이구나.","그달의 며칠이었습니까?":"그달 며칠이었어?","시간의 원판을 돌려 보겠습니다.":"시간의 원판을 돌려볼게.","태어난 시각을 기억하십니까?":"태어난 시각은 기억해?","시각을 모르셔도 괜찮습니다.":"시각을 몰라도 괜찮아.","시주는 비워 두고 연·월·일 기준으로 읽겠습니다.":"시주는 비워두고 연·월·일을 기준으로 읽을게.","마지막으로, 태어난 곳을 알려 주십시오.":"마지막으로, 태어난 곳을 알려줘.","{이름귀인}, 기록이 완성되었습니다.":"{이름}, 기록이 완성됐어.","틀린 곳이 없는지 한 번만 봐 주십시오.":"틀린 곳이 없는지 한 번만 봐줘.","기록을 펼치는 중입니다. 잠시만요.":"기록을 펼치고 있어. 잠깐만 기다려줘.","이런, 기록이 맞물리지 않습니다.":"이런, 기록이 맞물리지 않아.","아래 안내를 보시고 한 번만 고쳐 주십시오.":"아래 안내를 보고 한 번만 고쳐줘."};
  Q.speech = function (text, guide) { return guide === 'male' ? (MALE_LINES[text] || text) : text; };
  Q.linesOf = function (step, guide, unknown) { var src = unknown && step.unknownLines && step.unknownLines[guide] && step.unknownLines[guide].length ? step.unknownLines : step.lines; return ((src && (src[guide] || src.male)) || []).map(function (line) { return guide === 'male' ? (MALE_LINES[line] || line) : line; }); };

  /* ── 에셋 주소·초점 ── */
  Q.assetUrl = function (cfg, key, mobile) { var a = cfg && cfg.quest && cfg.quest.assets && cfg.quest.assets[key] || {}, d = ASSETS[key]; if (!d) return ''; return (mobile && a.mobile) || a.pc || d.file; };
  Q.assetFocus = function (cfg, key, mobile) { var a = cfg && cfg.quest && cfg.quest.assets && cfg.quest.assets[key] || {}, d = ASSETS[key]; if (!d) return '50% 50%'; return (mobile ? a.focusMobile || d.mobile : a.focusPc || d.pc) || '50% 50%'; };
  // 장면 배경: 단계에 직접 지정한 bg(PC/모바일)가 에셋보다 우선한다
  Q.stepBg = function (cfg, step, mobile) { return (mobile && step.bgMobile) || step.bg || Q.assetUrl(cfg, step.asset, mobile); };
  Q.stepFocus = function (cfg, step, mobile) { return (step.bg || step.bgMobile) ? '50% 50%' : Q.assetFocus(cfg, step.asset, mobile); };
  Q.guideImage = function (cfg, g, mobile) { var o = cfg.quest.guides[g] || {}; return (mobile && o.imageMobile) || o.image || Q.assetUrl(cfg, GUIDES[g].asset, mobile); };

  /* ── 단계 순서: 켜진 단계만. skip: 건너뛸 단계 id 목록(재방문 수정 시 seal·guide) ── */
  Q.order = function (cfg, skip) { skip = skip || []; return cfg.quest.steps.filter(function (x) { return x.enabled !== false && skip.indexOf(x.id) < 0; }); };

  /* ── 달·계절 ──
     양력 12·1·2 겨울 / 3~5 봄 / 6~8 여름 / 9~11 가을. 음력은 전통대로 1~3 봄 / 4~6 여름 / 7~9 가을 / 10~12 겨울(월건과 같은 구분).
     배경 색조만 바꾸는 연출이다 — 사주 계산은 정확한 날짜·절기를 쓴다. */
  var SEASON_KO = { spring: '봄 · 春', summer: '여름 · 夏', autumn: '가을 · 秋', winter: '겨울 · 冬' };
  Q.seasonOf = function (calendar, month) {
    var m = +month; if (!(m >= 1 && m <= 12)) return '';
    if (calendar === 'lunar') return m <= 3 ? 'spring' : m <= 6 ? 'summer' : m <= 9 ? 'autumn' : 'winter';
    return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  };
  Q.SEASON_KO = SEASON_KO;

  /* ── 윤달·일수: 엔진(Manse.lunarToSolar)이 존재 여부를 판단한다. M 이 없으면 알 수 없으므로 null ── */
  Q.leapExists = function (M, y, m) { if (!M || !(y > 0) || !(m > 0)) return null; try { M.lunarToSolar(+y, +m, 1, true); return true; } catch (e) { return false; } };
  // 해당 달의 날 수. 음력은 엔진으로 29/30 을 판별, 양력은 달력.
  Q.daysIn = function (M, d) {
    var y = +d.year, m = +d.month; if (!(y > 0) || !(m > 0)) return 31;
    if (d.calendar === 'lunar') { if (!M) return 30; var leap = !!d.leap; try { M.lunarToSolar(y, m, 30, leap); return 30; } catch (e) { return 29; } }
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  };
  Q.futureDay = function (d, day) { // 양력만: 오늘 이후 날짜는 고를 수 없다
    if (d.calendar === 'lunar') return false; var t = new Date(Date.UTC(+d.year, +d.month - 1, day)).getTime(); return t > Date.now() + 86400000;
  };

  /* ── 입력 초안(이탈 복원) ── */
  Q.DRAFT_KEY = 'mt_quest_draft';
  Q.blank = function () { return { name: '', gender: '', calendar: '', leap: false, leapAsked: false, year: '', month: '', day: '', hour: '', minute: '', hourUnknown: false, country: 'KR', place: '서울' }; };
  // 저장 형태 검사: 모양이 이상하면 버린다(옛 값·변조 방어)
  Q.cleanDraft = function (x, ids) {
    if (!x || x.v !== 2 || !x.d || typeof x.d !== 'object') return null;
    var b = Q.blank(), d = x.d, o = {};
    Object.keys(b).forEach(function (k) { o[k] = typeof b[k] === 'boolean' ? !!d[k] : (d[k] == null ? b[k] : (typeof b[k] === 'string' ? String(d[k]).slice(0, 40) : d[k])); });
    if (o.gender !== 'M' && o.gender !== 'F') o.gender = '';
    if (o.calendar !== 'solar' && o.calendar !== 'lunar') o.calendar = '';
    if (o.country !== 'KR') o.country = 'OT';
    var step = ids && ids.indexOf(x.step) >= 0 ? x.step : ids ? ids[0] : String(x.step || '');
    return { step: step, d: o, guide: x.guide === 'female' ? 'female' : x.guide === 'male' ? 'male' : '' };
  };

  Q.STEPS = STEPS; Q.ASSETS = ASSETS; Q.ASSET_KEYS = ASSET_KEYS; Q.GUIDES = GUIDES; Q.DEFAULT = QUEST; Q.TIMELINE = TIMELINE; Q.TL_SECTIONS = TL_SECTIONS; Q.ACCESS = ACCESS; Q.FX = FX;
  Q.mergeQuest = mergeQuest; Q.mergeTimeline = mergeTimeline; Q.img = img; Q.focus = focus;
  // Shared flow model: the admin and both input renderers use the same destination.
  Q.inputMode = function (cfg) { return cfg.quest && cfg.quest.enabled === false ? 'classic' : 'story'; };
  Q.destination = function (cfg) { return cfg.resultDestination === 'home' || (cfg.timeline && cfg.timeline.enabled === false) ? 'home' : 'timeline'; };
  Q.completionRoute = function (cfg, editing) {
    var target = Q.destination(cfg);
    return editing ? (target === 'home' ? '#/?nogate=1' : '#/timeline') : '#/awaken?to=' + (target === 'home' ? 'home' : 'timeline');
  };
  Q.flow = function (cfg) {
    var story = Q.inputMode(cfg) === 'story', target = Q.destination(cfg);
    return [{ id: 'landing', label: '첫 화면', editor: 'landing', enabled: !cfg.cover || cfg.cover.show !== false }]
      .concat(cfg.sections.map(function (s) { return { id: s.id, label: s.title || s.type, editor: 'section', enabled: s.type === 'final' || s.enabled !== false }; }))
      .concat([{ id: 'input', label: story ? '스토리 입력' : '기본 입력 (호환)', editor: story ? 'quest' : 'scenes', enabled: true },
        { id: 'awakening', label: '일주 각성', editor: 'qassets', enabled: true },
        { id: 'result', label: target === 'timeline' ? '운명의 타임라인' : '개인화 홈', editor: target === 'timeline' ? 'tl' : 'qops', enabled: true }]);
  };
  root.Quest = Q;
  if (typeof module !== 'undefined' && module.exports) module.exports = Q;
})(typeof window !== 'undefined' ? window : globalThis);
