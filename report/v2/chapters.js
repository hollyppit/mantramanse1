// 20챕터·4 ACT 기본 정의 (data-driven). 관리자 저장본(/api/v2/chapters)이 있으면 이 기본값 위에 덮어쓴다.
// 챕터를 추가·삭제·순서변경해도 코드가 아니라 이 배열(또는 관리자 저장본)만 바꾸면 된다.
//   kind: 챕터를 그리는 방식 (module = 해석 모듈 선택, daewoon/current/sewoon/monthly = 운 흐름 전용, remedy = 개운법, summary = 종합)
(function (root) {
  var ACTS = [
    { id: 1, title: '타고난 나', roman: 'ACT I', line: '당신이 가지고 태어난 힘을 들여다봅니다.', pdfDone: '나의 본질 분석이 리포트에 기록되었습니다.' },
    { id: 2, title: '세상 속의 나', roman: 'ACT II', line: '그 힘은 세상 속에서 어떻게 사용될까요?', pdfDone: '직업·재물·관계 분석이 추가되었습니다.' },
    { id: 3, title: '운명의 흐름', roman: 'ACT III', line: '이제 당신이 지나온 시간과 앞으로의 흐름을 봅니다.', pdfDone: '인생 흐름 분석이 추가되었습니다.' },
    { id: 4, title: '운을 사용하는 법', roman: 'ACT IV', line: '운을 아는 것보다 중요한 것은\n그 운을 어떻게 사용하는가입니다.', pdfDone: '당신의 인생 사용설명서가 완성되었습니다.' },
  ];

  function C(no, act, title, subtitle, kind, cats, extra) {
    var id = 'c' + (no < 10 ? '0' : '') + no, o = { id: id, base: id, project: 'full', no: no, order: no, act: act, enabled: true, title: title, subtitle: subtitle, kind: kind,
      moduleCategories: cats, maxModules: 3, aiEnabled: true, accessLevel: 'free', coverImage: '', introText: '' };
    for (var k in (extra || {})) o[k] = extra[k];
    return o;
  }

  var CHAPTERS = [
    C(0, 1, '수호신이 발견한 당신의 힘', '아직 다 쓰지 않은 잠재력', 'verdict', [], { maxModules: 0 }),
    C(1, 1, '나의 일주', '내가 타고난 한 글자의 이야기', 'module', ['identity'], { maxModules: 2 }),
    C(2, 1, '내 안의 다섯 기운', '목·화·토·금·수의 균형', 'module', ['elements']),
    C(3, 1, '타고난 성격과 기질', '나를 움직이는 기본 성향', 'module', ['personality'], { maxModules: 4 }),
    C(4, 1, '숨겨진 재능', '아직 다 쓰지 않은 힘', 'module', ['talent']),
    C(5, 1, '나의 약점과 그림자', '알아두면 덜 흔들리는 부분', 'module', ['shadow'], { maxModules: 4 }),
    C(6, 2, '직업 적성 진단', '어떤 환경과 역할에서 힘이 나는가', 'module', ['career'], { maxModules: 3 }),
    C(7, 2, '나의 성공 방식', '나에게 맞는 성과 내는 길', 'module', ['success']),
    C(8, 2, '재물 그릇과 돈 버는 방식', '돈을 대하는 행동 성향', 'module', ['wealth'], { maxModules: 3 }),
    C(9, 2, '연애 성향', '끌림과 사랑 표현의 방식', 'module', ['love']),
    C(10, 2, '결혼과 배우자', '오래 가는 관계에서 바라는 것', 'module', ['marriage']),
    C(11, 2, '대인관계 설명서', '사람을 대하는 나의 방식', 'module', ['relationship']),
    C(12, 2, '나와 잘 맞는 사람', '관계 유형으로 보는 궁합', 'module', ['compatibility'], { maxModules: 5, cta: { label: '궁합 볼 사람 추가하기', action: 'compat:add' } }),
    C(13, 2, '가족과 뿌리', '내가 자라온 자리의 영향', 'module', ['family']),
    C(14, 3, '나의 전생 이야기', '당신의 사주가 한 편의 전생 이야기라면?', 'module', ['pastLife'], { maxModules: 1,
      disclaimer: '사주 요소를 바탕으로 구성한 상징적 스토리 콘텐츠입니다.' }),
    C(15, 3, '인생 전체의 계절', '10년 단위 대운의 흐름', 'daewoon', ['daewoon']),
    C(16, 3, '지금 나는 어느 계절인가', '현재 대운 집중 해설', 'current', ['currentCycle'], { maxModules: 1 }),
    C(17, 3, '올해의 흐름', '세운으로 보는 올해', 'sewoon', ['sewoon'], { maxModules: 1 }),
    C(18, 3, '앞으로 12개월', '달마다 달라지는 흐름', 'monthly', ['monthly']),
    C(19, 4, '나에게 맞는 개운법', '행동(운동 포함)·성장·사람·공간·환경·타이밍', 'remedy', ['remedy'], { maxModules: 1 }),
    C(20, 4, '나의 인생 사용설명서', '모든 분석을 하나의 실행 계획으로', 'summary', ['actionPlan'], { maxModules: 1 }),
  ];

  /* ── 챕터 소유 구조 ─────────────────────────────────────────────────────────
     상품(프로젝트)끼리는 챕터를 공유하지 않는다: 챕터마다 소속 프로젝트(project)가 하나뿐이고, 그 안에서 act(ACT 번호)·order(순서)를 가진다.
     영상 클립·해석 모듈·개운법 같은 "자료"는 여러 프로젝트가 같이 쓴다. base 는 이 챕터가 쓰는 기본 챕터 종류(c01~c20: FACT 문장·장면 구성 등)이다.
     다른 프로젝트의 챕터가 필요하면 "복제"해서 그 프로젝트의 독립된 챕터로 만든다. */
  var ROMAN = ['ACT I', 'ACT II', 'ACT III', 'ACT IV', 'ACT V', 'ACT VI', 'ACT VII', 'ACT VIII', 'ACT IX'];
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var PROJECTS = [
    { id: 'full', name: '종합 운세', desc: '타고난 나부터 운의 흐름, 개운법까지 20챕터 전체', enabled: true, accessLevel: 'free', requiredCompletionRate: null, chapters: null, needTags: [],
      acts: ACTS.map(function (a) { return { title: a.title, line: a.line, pdfDone: a.pdfDone }; }) },
    { id: 'love', name: '애정운 특화', desc: '연애 성향·결혼·관계 유형과 올해의 인연 흐름', enabled: true, accessLevel: 'free', requiredCompletionRate: null, chapters: null, needTags: ['connection', 'listening', 'support', 'reflection'],
      acts: [{ title: '타고난 연애 기질', line: '당신이 사랑하는 방식부터 들여다봅니다.', pdfDone: '나의 연애 기질 분석이 리포트에 기록되었습니다.' }, { title: '관계 속의 나', line: '그 기질은 사람들 사이에서 어떻게 드러날까요?', pdfDone: '결혼·관계 분석이 추가되었습니다.' },
        { title: '올해의 인연 흐름', line: '지금의 시간과 앞으로의 흐름을 봅니다.', pdfDone: '인연 흐름 분석이 추가되었습니다.' }, { title: '사랑을 쓰는 법', line: '알게 된 것을 어떻게 쓸지 정리합니다.', pdfDone: '당신의 연애 사용설명서가 완성되었습니다.' }] },
    { id: 'wealth', name: '재물운 특화', desc: '돈을 대하는 행동 성향과 올해의 재물 전략', enabled: true, accessLevel: 'free', requiredCompletionRate: null, chapters: null, needTags: ['organize', 'reinvest', 'protect', 'accumulate'],
      acts: [{ title: '타고난 그릇', line: '돈과 일을 대하는 타고난 힘을 봅니다.', pdfDone: '나의 기질 분석이 리포트에 기록되었습니다.' }, { title: '돈을 쓰는 방식', line: '그 힘은 일과 재물에서 어떻게 쓰일까요?', pdfDone: '직업·재물 분석이 추가되었습니다.' },
        { title: '재물의 계절', line: '지금 어느 계절에 서 있는지 봅니다.', pdfDone: '재물 흐름 분석이 추가되었습니다.' }, { title: '재물 전략', line: '행동으로 옮길 전략을 정리합니다.', pdfDone: '당신의 재물 사용설명서가 완성되었습니다.' }] },
    { id: 'newyear', name: '신년 운세', desc: '올해의 흐름과 앞으로 12개월, 이번 해의 행동 전략', enabled: true, accessLevel: 'free', requiredCompletionRate: null, chapters: null, needTags: ['organize', 'reflection', 'opportunity'],
      acts: [{ title: '나의 바탕', line: '올해를 보기 전에 나의 바탕부터 봅니다.', pdfDone: '나의 바탕 분석이 리포트에 기록되었습니다.' }, { title: '올해의 흐름', line: '지금 서 있는 계절과 올해, 달마다의 흐름을 봅니다.', pdfDone: '올해 흐름 분석이 추가되었습니다.' }, { title: '올해를 쓰는 법', line: '올해 어떻게 움직일지 정리합니다.', pdfDone: '당신의 올해 사용설명서가 완성되었습니다.' }] },
  ];
  // 기본 시드: 종합은 c01~c20, 나머지 상품은 필요한 챕터를 "자기 몫으로 복제"한 독립 챕터(id = 프로젝트_원본, 예: love_c09)를 가진다.
  var SEED = { love: [['c01', 1], ['c03', 1], ['c09', 1], ['c10', 2], ['c11', 2], ['c12', 2], ['c13', 2], ['c16', 3], ['c17', 3], ['c18', 3], ['c19', 4], ['c20', 4]],
    wealth: [['c01', 1], ['c02', 1], ['c04', 1], ['c06', 2], ['c07', 2], ['c08', 2], ['c16', 3], ['c17', 3], ['c18', 3], ['c19', 4], ['c20', 4]],
    newyear: [['c01', 1], ['c16', 2], ['c17', 2], ['c18', 2], ['c19', 3], ['c20', 3]] };
  var ALL = CHAPTERS.slice();
  Object.keys(SEED).forEach(function (pid) {
    SEED[pid].forEach(function (x, i) { var b = CHAPTERS.filter(function (c) { return c.id === x[0]; })[0], c = clone(b); c.id = pid + '_' + x[0]; c.project = pid; c.base = x[0]; c.act = x[1]; c.order = i + 1; c.no = i + 1; ALL.push(c); });
  });

  // 챕터 라이브러리(전체): 기본 + 관리자 저장본(id 기준 덮어쓰기/추가). 예전 저장 방식(프로젝트가 챕터 id 목록을 가짐)은 여기서 한 번 "소유 구조"로 옮긴다.
  function libraryOf(saved) {
    var by = {}; ALL.forEach(function (c) { by[c.id] = clone(c); });
    ((saved && saved.chapters && saved.chapters.chapters) || []).forEach(function (s) { if (!s || !s.id) return; by[s.id] = Object.assign(by[s.id] || {}, s); });
    Object.keys(by).forEach(function (k) { var c = by[k]; if (!c.project) c.project = 'full'; if (!c.base) c.base = c.id; });
    ((saved && saved.projects) || []).forEach(function (p) { // 예전 방식: p.chapters = [{id, act}] (공유 목록)
      if (!p || !Array.isArray(p.chapters)) return;
      p.chapters.forEach(function (x, i) {
        var src = by[x.id]; if (!src) return; var tid = src.project === p.id ? x.id : p.id + '_' + (src.base || x.id), t = by[tid];
        if (!t) { t = clone(src); t.id = tid; t.project = p.id; t.base = src.base || src.id; by[tid] = t; }
        t.act = Math.max(1, x.act || 1); t.order = i + 1;
      });
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  // 호환: 저장된 chapters 객체({chapters, acts})만 받는 예전 호출. 켜진 챕터 전체를 돌려준다(프로젝트 구분 없음).
  function merge(savedChapters) {
    var acts = ACTS.map(function (a) { var sv = ((savedChapters && savedChapters.acts) || []).filter(function (x) { return x.id === a.id; })[0]; return sv ? Object.assign({}, a, sv) : Object.assign({}, a); });
    return { acts: acts, chapters: libraryOf({ chapters: savedChapters }).filter(function (c) { return c.enabled !== false; }) };
  }
  // 프로젝트 목록(기본 + 저장본, id 기준)
  function projects(saved) {
    var m = {}, out = []; PROJECTS.forEach(function (p) { m[p.id] = clone(p); });
    ((saved && saved.projects) || []).forEach(function (p) { if (p && p.id) m[p.id] = Object.assign(m[p.id] || {}, p); });
    Object.keys(m).forEach(function (k) { out.push(m[k]); }); return out;
  }
  // 프로젝트 하나의 {acts, chapters, project}: 소속 챕터만(켜진 것), 순서·ACT 는 프로젝트 안에서 연속 번호로 다시 매긴다.
  function forProject(saved, projectId) {
    var list = projects(saved), p = list.filter(function (x) { return x.id === projectId && x.enabled !== false; })[0] || list.filter(function (x) { return x.enabled !== false; })[0] || list[0];
    var chs = libraryOf(saved).filter(function (c) { return c.project === p.id && c.enabled !== false; });
    var used = {}; chs.forEach(function (c) { used[c.act || 1] = 1; });
    var order = Object.keys(used).map(Number).sort(function (a, b) { return a - b; }), remap = {}; order.forEach(function (a, i) { remap[a] = i + 1; });
    chs.sort(function (a, b) { return ((a.act || 1) - (b.act || 1)) || ((a.order || 0) - (b.order || 0)); });
    chs = chs.map(function (c, i) { var o = clone(c); o.act = remap[c.act || 1]; o.no = i + 1; return o; });
    var acts = order.map(function (a, i) { var d = (p.acts || [])[a - 1] || {}; return { id: i + 1, roman: ROMAN[i] || 'ACT', title: d.title || '', line: d.line || '', pdfDone: d.pdfDone || '' }; });
    return { acts: acts, chapters: chs, project: p };
  }

  root.ReportV2 = root.ReportV2 || {};
  root.ReportV2.Chapters = { ACTS: ACTS, CHAPTERS: ALL, BASE: CHAPTERS, PROJECTS: PROJECTS, ROMAN: ROMAN, merge: merge, libraryOf: libraryOf, projects: projects, forProject: forProject };
})(typeof window !== 'undefined' ? window : globalThis);
