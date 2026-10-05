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
    var o = { id: 'c' + (no < 10 ? '0' : '') + no, no: no, order: no, act: act, enabled: true, title: title, subtitle: subtitle, kind: kind,
      moduleCategories: cats, maxModules: 3, aiEnabled: true, accessLevel: 'free', coverImage: '', introText: '' };
    for (var k in (extra || {})) o[k] = extra[k];
    return o;
  }

  var CHAPTERS = [
    C(1, 1, '나의 일주', '내가 타고난 한 글자의 이야기', 'module', ['identity']),
    C(2, 1, '내 안의 다섯 기운', '목·화·토·금·수의 균형', 'module', ['elements']),
    C(3, 1, '타고난 성격과 기질', '나를 움직이는 기본 성향', 'module', ['personality']),
    C(4, 1, '숨겨진 재능', '아직 다 쓰지 않은 힘', 'module', ['talent']),
    C(5, 1, '나의 약점과 그림자', '알아두면 덜 흔들리는 부분', 'module', ['shadow']),
    C(6, 2, '직업 적성 진단', '어떤 환경과 역할에서 힘이 나는가', 'module', ['career'], { maxModules: 2 }),
    C(7, 2, '나의 성공 방식', '나에게 맞는 성과 내는 길', 'module', ['success']),
    C(8, 2, '재물 그릇과 돈 버는 방식', '돈을 대하는 행동 성향', 'module', ['wealth'], { maxModules: 2 }),
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
    C(19, 4, '나에게 맞는 개운법', '행동·운동·성장·사람·공간·환경·타이밍', 'remedy', ['remedy'], { maxModules: 1 }),
    C(20, 4, '나의 인생 사용설명서', '모든 분석을 하나의 실행 계획으로', 'summary', ['actionPlan'], { maxModules: 1 }),
  ];

  // 관리자 저장본 병합: id가 같으면 필드를 덮어쓰고, 새 id는 추가한다. order 순으로 정렬해 enabled만 돌려준다.
  function merge(saved) {
    var byId = {}, out = [];
    CHAPTERS.forEach(function (c) { byId[c.id] = JSON.parse(JSON.stringify(c)); });
    ((saved && saved.chapters) || []).forEach(function (s) { if (!s || !s.id) return; byId[s.id] = Object.assign(byId[s.id] || {}, s); });
    Object.keys(byId).forEach(function (k) { out.push(byId[k]); });
    out.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var acts = ACTS.map(function (a) { var o = Object.assign({}, a), sv = ((saved && saved.acts) || []).filter(function (x) { return x.id === a.id; })[0]; return sv ? Object.assign(o, sv) : o; });
    return { acts: acts, chapters: out.filter(function (c) { return c.enabled !== false; }) };
  }

  root.ReportV2 = root.ReportV2 || {};
  root.ReportV2.Chapters = { ACTS: ACTS, CHAPTERS: CHAPTERS, merge: merge };
})(typeof window !== 'undefined' ? window : globalThis);
