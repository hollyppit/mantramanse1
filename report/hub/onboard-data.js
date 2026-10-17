// 온보딩 데이터·순수 로직 (화면 없음 — node 테스트에서 그대로 불러 검증한다):  node tests/onboard-sim.js
//   ① 연구·유명인 사례(랜덤 후킹)  ② 동양 명리학 소개 3장면  ③ 무협 슬라이드 툰 6장면  ④ 호칭 '귀인' 공통 설정  ⑤ 출생정보 입력 검증
// 관리자가 /api/onboarding 으로 덮어쓴 값이 있으면 merge() 로 이 기본값 위에 얹는다. 계산·점수는 여기서 만들지 않는다 — 날짜 검증은 엔진(Manse)에 맡긴다.
(function (root) {
  'use strict';

  /* ── 호칭 ─────────────────────────────────────────────────────
     세계관 속 존칭. 성별과 관계없이 같고, 특정 길신(吉神)이나 타고난 운명을 단정하는 뜻이 아니다.
     바꾸려면 config.honorific 한 곳만 바꾼다(관리자 "온보딩" 탭). */
  var DEFAULT_HONORIFIC = '님';
  var FORBIDDEN_TITLES = ['대공', '소협', '대협']; // 이번 개편에서 쓰지 않기로 한 호칭
  function honorific(cfg) { var h = cfg && typeof cfg.honorific === 'string' ? cfg.honorific.trim() : ''; return h && h !== '귀인' && FORBIDDEN_TITLES.indexOf(h) < 0 ? h.slice(0, 8) : DEFAULT_HONORIFIC; }
  // 이름이 있으면 "[이름] 귀인", 없으면 "귀인"
  function addr(name, cfg) { var n = String(name || '').trim().slice(0, 20); return n ? n + ' ' + honorific(cfg) : '방문자'; }
  // 대사 안의 {귀인}(호칭) · {이름귀인}([이름] 귀인) 치환
  function fill(text, name, cfg) { var t = String(text == null ? '' : text); t = t.replace(/\{귀인\}을 어떤 이름으로 기록해 드리면 될까요\?/, '어떤 이름으로 기록해 드릴까요?').replace(/기록을 열기 전에 \{귀인\}의 성함부터 확인하겠습니다\./, '어떤 이름으로 기록해 드릴까요?'); var who = String(name || '').trim() ? addr(name, cfg) : '당신'; return t.replace(/\{name\}/g, String(name || '').trim() || '당신').replace(/\{이름\}/g, String(name || '').trim() || '당신').replace(/\{이름귀인\}/g, who).replace(/\{귀인\}/g, who).replace(/귀인/g, who); }

  /* ── 후킹 사례 ─────────────────────────────────────────────────
     status: draft(초안) → review(검토 중) → verified(검증 완료) → published(공개). 공개 풀에는 published 만 들어간다.
     검증 기록(verifiedNote): 2026-10-11 Crossref(DOI 메타데이터)·보도 자료 대조. 운영 노출 전 관리자가 한 번 더 확인할 것.
     연구 사례는 "연구가 보여 준 것"만 말한다. 시뮬레이션·통계 결과를 사주팔자나 자미두수의 예측력 근거로 쓰지 않는다. */
  var CASES = [
    { id: 'r-pluchino-2018', type: 'research', status: 'published', weight: 1, tags: ['재능', '우연', '성공'],
      title: "가장 성공한 사람이 가장 재능 있는 사람은 아니었습니다.", hook: '재능이 비슷한 사람들 사이에서도 결과는 왜 이렇게 다를까요?',
      body: ['연구진은 가상의 사람 1,000명이 40년 동안 일하는 컴퓨터 시뮬레이션을 돌렸습니다.', '재능은 평범한 종 모양으로 퍼져 있었지만, 부(富)는 소수에게 크게 쏠렸습니다.', '꼭대기에 선 이는 최고 재능자가 아니라 운 좋은 기회가 연달아 닿은 평범한 재능의 사람이었습니다.'],
      caveat: '컴퓨터 시뮬레이션이 보여 준 모델이며, 실제 한 사람의 인생을 예측한다는 뜻은 아닙니다.',
      who: 'A. Pluchino · A. E. Biondo · A. Rapisarda', year: 2018, source: { label: 'Advances in Complex Systems 21(3&4)', doi: '10.1142/S0219525918500145', url: 'https://doi.org/10.1142/S0219525918500145' },
      verifiedNote: '2026-10-11 Crossref 에서 제목·저자·연도·저널 확인', visual: 'bell' },
    { id: 'r-liu-2018', type: 'research', status: 'published', weight: 1, tags: ['타이밍', '전성기', '커리어'],
      title: "성과는 인생의 한 시기에 집중되어 나타납니다.", hook: '사람마다 전성기가 찾아오는 시점은 왜 다를까요?',
      body: ['연구진은 예술가·영화감독·과학자 수천 명의 경력을 시간순으로 분석했습니다.', '대부분은 경력 중 한 번, 가장 큰 성과가 짧은 기간에 연달아 나오는 "핫 스트릭(hot streak)"을 겪었습니다.', '그 시기가 경력의 처음, 중간, 끝 어디에 오는지는 사람마다 달랐습니다.'],
      caveat: '과거 경력 자료를 분석한 결과이며, 언제 전성기가 온다는 예측이 아닙니다.',
      who: 'Lu Liu · Roberta Sinatra · C. Lee Giles · Dashun Wang', year: 2018, source: { label: 'Nature 559, 396–399', doi: '10.1038/s41586-018-0315-8', url: 'https://doi.org/10.1038/s41586-018-0315-8' },
      verifiedNote: '2026-10-11 Crossref 에서 제목·저자·연도·저널 확인', visual: 'streak' },
    { id: 'r-salganik-2006', type: 'research', status: 'published', weight: 1, tags: ['우연', '예측불가', '성공'],
      title: "같은 노래라도 각 국가마다 다른 히트곡이 되었습니다.", hook: '실력이 같아도 어떤 것은 뜨고 어떤 것은 묻히는 이유는 무엇일까요?',
      body: ['1만 4천여 명이 처음 듣는 노래를 내려받는 온라인 실험이 열렸습니다.', '참가자들은 서로 영향을 주고받지 못하는 여러 개의 "세계"로 나뉘었습니다.', '같은 곡이라도 세계마다 인기 순위가 크게 달랐고, 다른 사람의 선택이 보일수록 쏠림과 예측 불가능성이 커졌습니다.'],
      caveat: '음악 시장에서의 실험이며, 모든 성공의 원인이 우연이라는 뜻은 아닙니다.',
      who: 'M. J. Salganik · P. S. Dodds · D. J. Watts', year: 2006, source: { label: 'Science 311(5762), 854–856', doi: '10.1126/science.1121066', url: 'https://doi.org/10.1126/science.1121066' },
      verifiedNote: '2026-10-11 Crossref 에서 제목·저자·연도·저널 확인', visual: 'worlds' },
    { id: 'r-chetty-2014', type: 'research', status: 'published', weight: 1, tags: ['환경', '기회', '지역'],
      title: "어디서 자랐는지가 올라갈 수 있는 계단을 바꿉니다.", hook: '같은 노력이라도 어떤 환경에서는 더 멀리 가는 이유는 무엇일까요?',
      body: ['연구진은 미국 수백 개 지역에서 부모 소득과 자녀의 성인기 소득을 연결해 분석했습니다.', '아이가 자란 지역에 따라 소득 계층을 올라갈 가능성이 크게 달랐습니다.', '개인의 재능과 노력 밖에서 주어지는 환경도 결과에 영향을 준다는 뜻입니다.'],
      caveat: '미국 자료를 분석한 연구이며, 인과의 크기는 지역과 시기에 따라 다를 수 있습니다.',
      who: 'R. Chetty · N. Hendren · P. Kline · E. Saez', year: 2014, source: { label: 'The Quarterly Journal of Economics 129(4)', doi: '10.1093/qje/qju022', url: 'https://doi.org/10.1093/qje/qju022' },
      verifiedNote: '2026-10-11 Crossref 에서 제목·저자(Chetty·Hendren·Kline 외)·연도·저널 확인', visual: 'steps' },
    { id: 'c-ford-starwars', type: 'celebrity', status: 'published', weight: 1, tags: ['우연', '기회', '타이밍'],
      title: "목수 일을 하던 배우가 오디션장에서 대사를 읽었습니다.", hook: '기회는 때로 전혀 다른 일을 하던 자리로 찾아옵니다.',
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
      title: "운이 좋다고 믿는 분들이 기회를 더 잘 알아보는 경향이 있습니다.", hook: '운이 좋은 사람은 정말 보는 것이 다를까요?',
      body: ['리처드 와이즈먼은 스스로 운이 좋다/나쁘다고 여기는 사람들을 비교하는 실험을 했습니다.', '신문 속 사진 수를 세게 했을 때 운이 좋다고 여기는 사람들이 지면 속 뜻밖의 안내문을 더 자주 알아봤다고 보고했습니다.'],
      caveat: '자기 보고와 행동 실험 중심의 연구이며 효과의 크기는 논쟁이 있을 수 있습니다.',
      who: '리처드 와이즈먼', year: 2003, source: { label: 'The Luck Factor (2003)', url: '' }, verifiedNote: '원문 확인 전 — 검토 중', visual: 'eye' },
    { id: 'c-pacino-godfather', type: 'celebrity', status: 'review', weight: 1, tags: ['기회', '믿음'],
      title: '무명 배우를 끝까지 고집한 감독', hook: '아무도 몰랐던 사람을 알아본 한 사람.',
      body: ['「대부」 제작사는 마이클 역에 더 이름난 배우를 원했다고 전해집니다.', '감독 프랜시스 포드 코폴라는 알 파치노를 밀어붙였다고 알려져 있습니다.'],
      caveat: '', who: '알 파치노', year: 1972, source: { label: '전기·인터뷰 확인 전', url: '' }, verifiedNote: '출처 확인 전 — 검토 중', visual: 'door' },
  ];


  /* ── 서사 원고 ─ 확인된 사실만 이야기로 풀었다. 없는 대사·감정·숫자를 만들지 않는다. 운영 노출 전 관리자가 출처와 함께 다시 확인할 것. ──
     story: 문단(한 줄 = 한 문단, 2문장 이내) · takeaway: 이야기가 남기는 한 줄 */
  var STORY = {
    'r-pluchino-2018': { story: [
      '가상의 사람 1,000명을 만들었습니다. 재능은 사람마다 조금씩 다르지만 대부분 평범한 수준이고, 출발선의 자본은 모두 같습니다.',
      '그리고 40년. 6개월마다 무작위로 사건이 닥칩니다. 행운이 닿으면 재능이 있는 사람은 그 기회를 살려 자본을 두 배로 불리고, 불운이 닿으면 재능과 상관없이 자본이 절반이 됩니다.',
      '40년 뒤 결과표를 열어 보니, 재능은 종 모양으로 고르게 퍼져 있었는데 부(富)는 극소수에게 크게 쏠려 있었습니다.',
      '그리고 가장 큰 부를 쌓은 사람은 가장 재능 있는 사람이 아니었습니다. 평범한 재능에, 행운이 연달아 닿았던 사람이었습니다.'],
      takeaway: '재능은 문을 여는 열쇠이지만, 어느 문 앞에 서게 되는지는 시간과 우연이 함께 정합니다.' },
    'r-liu-2018': { story: [
      '화가, 영화감독, 과학자. 서로 다른 분야 수천 명의 경력을 작품 하나, 논문 하나까지 시간순으로 따라가 보았습니다.',
      '작품마다 영향력을 재 보니 대표작들은 경력 전체에 고르게 흩어져 있지 않았습니다. 짧은 기간에 몰려 있었습니다. 연구진은 이 시기를 “핫 스트릭”이라 불렀습니다.',
      '이런 시기는 분야와 상관없이 대부분의 경력에서 나타났습니다. 다만 그 시기가 경력의 처음에 올지, 중간에 올지, 끝에 올지는 사람마다 달랐습니다.',
      '같은 시간을 일해도 전성기가 오는 때는 저마다 다릅니다. 이미 지나온 사람과 아직 기다리는 사람이 같은 자리에 서 있는 것입니다.'],
      takeaway: '전성기는 “얼마나 열심히”만이 아니라 “언제”의 문제이기도 합니다.' },
    'r-salganik-2006': { story: [
      '이름 없는 밴드의 노래 48곡을 온라인에 올리고, 1만 4천여 명에게 마음에 드는 곡을 내려받게 했습니다.',
      '참가자들은 서로 모르는 여러 개의 “세계”로 나뉘었습니다. 어떤 세계에서는 다른 사람들이 많이 내려받은 곡이 보였고, 어떤 세계에서는 아무 정보도 없었습니다.',
      '같은 노래, 같은 출발선. 그런데 세계마다 1등 곡이 달랐습니다. 남들의 선택이 보이는 세계일수록 인기는 한곳으로 쏠렸고 결과는 더 예측하기 어려웠습니다.',
      '정말 좋은 곡이 바닥에 깔리는 일은 드물었지만, 어떤 곡이 정상에 설지는 세계가 열릴 때마다 달라졌습니다.'],
      takeaway: '실력은 출발선에 가깝고, 무엇이 떠오르는지는 그때 그 자리의 흐름이 크게 좌우합니다.' },
    'r-chetty-2014': { story: [
      '같은 나라, 같은 법, 같은 언어. 연구진은 수천만 건의 세금 기록을 이어 부모의 소득과 자녀가 어른이 되어 번 소득을 지역별로 비교했습니다.',
      '결과는 지역마다 뚜렷이 달랐습니다. 비슷한 가정 형편에서 태어났어도, 어디에서 자랐는지에 따라 소득 사다리를 오를 가능성이 크게 갈렸습니다.',
      '연구진은 거주지의 분리, 학교의 질, 가족 구조 같은 “주변의 조건”과 이 차이가 함께 움직인다는 점도 보여 주었습니다.',
      '아이의 재능이나 노력이 달라서만이 아니라, 아이가 서 있던 자리가 달랐다는 이야기입니다.'],
      takeaway: '인생의 결과는 나의 노력과, 내가 서 있던 자리의 합입니다.' },
    'c-ford-starwars': { story: [
      '1970년대 초, 해리슨 포드는 배우였지만 연기만으로는 가족을 먹여 살리기 어려웠습니다. 그래서 집과 가구를 고치는 목수로 일했습니다.',
      '「스타워즈」의 주인공을 찾던 조지 루카스는 이전 작품에 나온 배우를 다시 쓰는 데 신중했다고 전해집니다. 포드는 이미 「아메리칸 그래피티」에서 그와 함께한 얼굴이었습니다.',
      '캐스팅 디렉터 프레드 루스는 그를 눈여겨보았고, 오디션을 보러 온 후보들의 상대역으로 대사를 읽어 주는 일을 맡겼습니다.',
      '후보가 바뀌는 동안 상대역 자리에 서 있던 사람은 포드였습니다. 루카스는 결국 그를 한 솔로로 택했습니다.'],
      takeaway: '기회는 “지원서”가 아니라 “그 자리에 있었던 때”에 찾아오기도 합니다.' },
    'c-cranston-breakingbad': { story: [
      '브라이언 크랜스턴은 시트콤 「말콤 인 더 미들」의 어수룩한 아버지 역으로 널리 알려져 있었습니다. 많은 사람의 머릿속에서 그는 “웃기는 아빠”였습니다.',
      '2000년대 후반, 「브레이킹 배드」를 만든 빈스 길리건은 평범한 화학 교사가 범죄자로 변해 가는 주인공에 그를 떠올렸습니다. 방송사 쪽에서는 시트콤 이미지 때문에 망설였다고 전해집니다.',
      '길리건이 근거로 든 것은 십 년 전 「X파일」의 한 에피소드였습니다. 같은 배우의 전혀 다른 얼굴이 거기 있었습니다.',
      '오십을 갓 넘긴 나이에 맡은 이 역으로, 그는 이후 에미상 주연상을 여러 차례 받았습니다.'],
      takeaway: '때로는 지금의 평판이 아니라, 누군가 알아본 “다른 얼굴”이 다음 시기를 엽니다.' },
    'r-wiseman-luck': { story: ['리처드 와이즈먼은 스스로 운이 좋다고 여기는 사람과 나쁘다고 여기는 사람을 모아 같은 과제를 주었습니다.', '신문 속 사진의 수를 세는 과제였는데, 지면에는 정답을 알려 주는 큰 글씨가 숨어 있었다고 보고했습니다.'], takeaway: '운은 사건이기 전에, 알아보는 방식일 수도 있습니다.' },
    'c-pacino-godfather': { story: ['「대부」 제작사는 마이클 역에 더 이름난 배우를 원했다고 전해집니다.', '감독 프랜시스 포드 코폴라는 알 파치노를 밀어붙였다고 알려져 있습니다.'], takeaway: '아직 아무도 몰랐던 사람을 알아본 한 사람이 있었습니다.' },
  };
  CASES.forEach(function (c) { var x = STORY[c.id]; if (x) { c.story = x.story; c.takeaway = x.takeaway; } });

  /* ── 출생 시기 연구 카드(랜딩 SECTION 02) ─ 원문(Crossref DOI 메타데이터·초록) 대조 2026-10-11 ──
     여기 적힌 수치는 "연구가 보고한 것"만이다. 사주팔자·명리학의 성격·재물·결혼·미래 예측이 맞다는 근거로 쓰지 않는다(relation 으로 표시). */
  var BIRTH_CASES = [
    { id: 'r-boland-2015', type: 'research', kind: 'study', status: 'published', weight: 1, tags: ['출생 월', '건강', '대규모 의료기록'],
      title: '태어난 달과 일부 질환의 발생 위험 사이에서 통계적 연관성이 관찰되었습니다', hook: '태어난 시기는 우리 몸에 어떤 흔적을 남길까요?',
      body: ['컬럼비아대학교 의료센터의 환자 기록 약 175만 명을 분석했습니다.', '검토한 1,688개 질환 가운데 55개에서 출생 월과의 통계적 연관성이 확인되었습니다.', '연관의 크기는 대체로 작았고, 원인은 이 연구만으로 알 수 없습니다.'],
      caveat: '한 의료기관의 진료 기록에 기반한 연관성 분석입니다. 태어난 달이 질병의 원인이라는 증거가 아니며, 한 사람의 건강이나 운명을 예측하지 않습니다.',
      who: 'Boland 외 · 컬럼비아대학교 의료센터', year: 2015, source: { label: 'Journal of the American Medical Informatics Association 22(5)', doi: '10.1093/jamia/ocv046', url: 'https://doi.org/10.1093/jamia/ocv046' },
      verifiedNote: '2026-10-11 Crossref(DOI·제목·저자·연도·저널)와 논문 초록으로 대상 수·질환 수·유의 연관 수를 대조', visual: 'bell',
      study: { name: 'Birth month affects lifetime disease risk: a phenome-wide method', org: '컬럼비아대학교 의료센터', researchers: 'M. R. Boland, Z. Shahn, D. Madigan, G. Hripcsak, N. P. Tatonetti', year: 2015, journal: 'Journal of the American Medical Informatics Association', doi: '10.1093/jamia/ocv046', url: 'https://doi.org/10.1093/jamia/ocv046',
        subject: '1985~2013년 컬럼비아대학교 의료센터에서 진료받은 환자(1900~2000년생)', sample: '약 175만 명 · 1,688개 질환', method: '전자의무기록을 이용해 출생 월과 질환 진단 사이의 연관성을 질환 전체에 걸쳐 한꺼번에 검정(다중 비교 보정 적용)',
        result: "1,688개 질환 중 55개에서 출생 월과 통계적으로 유의한 연관성이 관찰되었습니다.", stats: '검정 질환 1,688 · 유의 연관 55 (다중 비교 보정 후)',
        limits: "단일 기관의 기록이며 질환 간 독립이 아니고 의료 이용 기록이라 선택 편향 가능성이 있습니다. 간접 경로나 출생 시기 외 요인을 배제하지 못하고, 인과관계를 입증하지 않습니다.",
        relation: 'birth_correlation', scope: "출생 월과 일부 질환 발생 사이의 통계적 연관성까지만 다룹니다. 성격·재물·결혼·미래 예측이나 사주팔자의 정확성은 검증 범위 밖입니다." } },
    { id: 'r-coury-2023', type: 'research', kind: 'study', status: 'published', weight: 1, tags: ['출생 계절', '조현병', '메타분석'],
      title: '겨울에 태어난 사람에서 조현병 위험이 아주 조금 더 높게 관찰되었습니다', hook: '출생 계절과 질환 위험, 그 연관은 얼마나 클까요?',
      body: ['30개 국가·지역의 43개 연구, 조현병 환자 약 44만 명의 자료를 종합했습니다.', '겨울 출생의 오즈비는 약 1.05로 보고되었습니다. 위험이 5% 안팎 높아졌다는 뜻이며 매우 작은 차이입니다.', '반대로 여름 출생은 약간 낮게(약 0.96) 나타났습니다.'],
      caveat: '집단 수준의 아주 작은 통계적 연관성입니다. 겨울에 태어났다고 질환이 생긴다는 뜻이 아니며, 원인은 밝혀지지 않았습니다.',
      who: 'Coury 외 · Schizophrenia Research', year: 2023, source: { label: 'Schizophrenia Research 252, 244–252', doi: '10.1016/j.schres.2022.12.016', url: 'https://doi.org/10.1016/j.schres.2022.12.016' },
      verifiedNote: '2026-10-11 Crossref(DOI·제목·저자·연도·권호쪽)와 논문 초록으로 연구 수·대상 수·오즈비 대조', visual: 'bell',
      study: { name: 'Systematic review and meta-analysis: Season of birth and schizophrenia risk', org: 'Schizophrenia Research 게재 메타분석', researchers: 'S. M. Coury, A. Lombroso, V. J. Avila-Quintero 외', year: 2023, journal: 'Schizophrenia Research', doi: '10.1016/j.schres.2022.12.016', url: 'https://doi.org/10.1016/j.schres.2022.12.016',
        subject: '조현병 환자의 출생 계절을 다룬 기존 연구들', sample: '연구 43편 · 30개 국가·지역 · 환자 440,039명', method: '체계적 문헌고찰과 메타분석(여러 연구의 결과를 통계적으로 종합)',
        result: "겨울 출생에서 위험이 약간 높아지는 연관(OR 1.05, 95% CI 1.03–1.07), 여름 출생에서 약간 낮아지는 연관(OR 0.96)이 보고되었습니다.", stats: 'OR 1.05 (95% CI 1.03–1.07) · 여름 OR 0.96 (0.94–0.98)',
        limits: "효과 크기가 작고 연구마다 방법이 다릅니다. 원인 기전은 밝혀지지 않았고 환자 집단 중심의 연관성이라 개인에게 적용하기 어렵습니다.",
        relation: 'birth_correlation', scope: "출생 계절과 특정 질환 위험의 아주 작은 통계적 연관성까지만 다루며 사주팔자·명리학의 예측 정확성을 입증하지 않습니다." } },
  ];
  BIRTH_CASES.forEach(function (c) { c.group = 'birth'; c.visual = 'season'; });
  CASES = BIRTH_CASES.concat(CASES);

  /* ── 사례 필드 정규화 ─────────────────────────────────────────
     검증 상태(verification.state)와 공개 여부(visible)를 분리한다. 옛 status(draft|review|verified|published)는 호환용으로 유도해서 남긴다. */
  var KINDS = { study: '실제 학술 연구', experiment: '실제 실험', history: '역사적 사례', celebrity: '유명인 사례', classic: '명리학 전통 문헌', other: '기타' };
  var VSTATE = { draft: '초안', review: '검토 중', verified: '검증 완료', hold: '보류', rejected: '반려' };
  var RELATION = { direct: '명리학 자체를 직접 검증한 연구', birth_correlation: '출생 시기와 특정 지표의 연관성 연구', belief: '인간의 믿음과 심리 관련 연구', cultural: '역사·문화적 배경 자료', none: '직접적인 관련성 없음' };
  var DESIGNS = { plain: '기본', gold: '금빛 테두리', glass: '반투명' };
  function legacyDate(s) { var m = /\d{4}-\d{2}-\d{2}/.exec(String(s || '')); return m ? m[0] : ''; }
  function legacyStatus(o) { return o.visible && o.verification.state === 'verified' ? 'published' : o.verification.state === 'verified' ? 'verified' : o.verification.state === 'review' ? 'review' : 'draft'; }
  function normalizeCase(c) {
    var o = Object.assign({}, c), st = o.status, v = o.verification && typeof o.verification === 'object' ? Object.assign({}, o.verification) : null;
    if (!v) { var ok = st === 'published' || st === 'verified'; v = { state: ok ? 'verified' : st === 'review' ? 'review' : 'draft', reviewedAt: ok ? legacyDate(o.verifiedNote) : '', basis: o.verifiedNote || '' }; }
    v.state = VSTATE[v.state] ? v.state : 'draft'; v.reviewedAt = String(v.reviewedAt || ''); v.basis = String(v.basis || '');
    o.verification = v;
    o.visible = typeof o.visible === 'boolean' ? o.visible : st === 'published';
    o.kind = KINDS[o.kind] ? o.kind : (o.type === 'celebrity' ? 'celebrity' : 'study');
    o.type = o.kind === 'celebrity' ? 'celebrity' : 'research';
    o.group = o.group === 'birth' ? 'birth' : 'story';
    o.status = legacyStatus(o);
    var s = o.study && typeof o.study === 'object' ? o.study : {}, src = o.source || {};
    o.study = Object.assign({ name: '', org: '', researchers: '', year: o.year || 0, journal: src.label || '', doi: src.doi || '', url: src.url || '', subject: '', sample: '', method: '', result: '', stats: '', limits: '', relation: 'none', scope: '' }, s);
    if (!RELATION[o.study.relation]) o.study.relation = 'none';
    o.media = Object.assign({ image: o.image || '', mobileImage: '', bg: '', video: '', alt: '', credit: '', license: '' }, o.media || {});
    o.display = Object.assign({ order: 0, featured: false, showTitle: true, showSummary: true, showSource: true, detail: true, mobileLayout: 'stack', design: 'plain' }, o.display || {});
    return o;
  }
  // 구간 사이를 잇는 문장: 연구 → 유명인 → 명리학
  var BRIDGE = { toCelebrity: '연구는 “평균”을 말합니다. 그렇다면 한 사람의 인생에서는 이 “때”와 “우연”이 어떻게 나타났을까요?', toIntro: '재능과 노력만으로는 설명되지 않는 “때”. 그렇다면 동양에서는 사람의 인생과 운의 흐름을 어떻게 바라봤을까요?' };

  /* ── 동양 명리학 소개 (3장면) ─ 관리자가 제목·본문·이미지·영상을 바꿀 수 있다 ── */
  var INTRO = [
    { id: 'time', enabled: true, title: '사람마다 꽃이 피는 때가 다르듯, 인생의 흐름도 저마다 다릅니다.', body: '동양의 명리학은 사람이 태어난 연월일시를 바탕으로 타고난 기질과 시간에 따른 변화의 흐름을 해석해 온 전통 체계입니다.', sub: '', glyph: '時', image: '', video: '', theme: 'mountain' },
    { id: 'pillars', enabled: true, title: '태어난 순간의 네 기둥, 그리고 시간이 흐르며 바뀌는 운.', body: '사주팔자는 태어난 해·달·날·시각을 네 기둥으로 살펴봅니다. 여기에 10년 단위의 대운과 해마다 달라지는 세운 등을 함께 해석합니다.', sub: '', glyph: '柱', image: '', video: '', theme: 'pillars' },
    { id: 'two', enabled: true, title: '하나의 인생, 두 가지 해석의 시선.', body: '만트라는 사주팔자와 자미두수를 결합해 성향, 직업, 재물, 관계, 인생의 시기 등을 서로 다른 전통적 관점에서 살펴봅니다.', sub: '왜 그런 해석이 나왔는지, 현실에서 무엇을 참고할 수 있는지까지.', glyph: '命', image: '', video: '', theme: 'two' },
  ];
  var INTRO_LAST = { line: '그렇다면 지금, 당신은 어떤 운의 흐름에 있을까요?', cta: '나의 운 확인하기' };
  /* ── 랜딩 섹션 구성(관리자가 순서·표시·문구·연출을 바꾼다) ─ 첫 화면(커버)은 story 쪽이 맡고, 아래는 허브 안에서 이어진다 ──
     type: research(출생 시기 연구 카드) · myeongri(명리학 소개) · service(서비스 소개) · story(예전 연구→유명인 후킹) · final(최종 CTA)
     effect: none | fade | rise | parallax | crossfade   (글자 타이핑·스크롤 강제 이동은 제공하지 않는다) */
  var EFFECTS = { none: '기본 표시', fade: '페이드 인', rise: '아래에서 등장', parallax: '배경 패럴랙스', crossfade: '이미지 크로스페이드' };
  var SECTIONS = [
    { id: 'research', type: 'research', enabled: true, effect: 'fade', kicker: '현대 연구는 말합니다', title: '태어난 시기는 우리의 삶에 어떤 흔적을 남길까?', sub: '현대 연구에서는 출생 시기와 일부 건강 지표 사이의 통계적 연관성이 관찰되었습니다.',
      notice: '출생 월·계절과 건강 지표의 통계적 연관성은 사주팔자의 성격·재물·결혼·미래 예측이 맞다는 근거가 아닙니다. 두 가지는 서로 다른 이야기입니다.',
      bridge: '현대 연구가 출생 시기와 환경의 관계를 탐구한다면, 동양에서는 오래전부터 시간과 계절의 흐름으로 인간을 이해하려 했습니다.', cta: { show: false, text: '' } },
    { id: 'myeongri', type: 'myeongri', enabled: true, effect: 'rise', kicker: '동양은 이렇게 보았습니다', title: '수천 년 동안 이어져 온 시간의 해석.', sub: '동양 명리학은 사람이 태어난 연·월·일·시를 천간과 지지로 표현하고, 음양오행의 관계를 통해 개인의 특성과 운의 흐름을 해석하는 전통 체계입니다.',
      notice: '', bridge: '', topics: false, cta: { show: false, text: '' } },
    { id: 'service', type: 'service', enabled: true, effect: 'rise', kicker: '만트라 만세력', title: '운세를 읽는 시대에서,\n나의 운을 경험하는 시대로.', sub: '복잡한 사주팔자를 나만의 동양 판타지 무빙툰으로 만나보세요.', notice: '', bridge: '', cta: { show: false, text: '' } },
    { id: 'story', type: 'story', enabled: false, effect: 'fade', kicker: '', title: '', sub: '', notice: '', bridge: '', cta: { show: false, text: '' } },
    { id: 'final', type: 'final', enabled: true, effect: 'fade', kicker: '', title: '이제, {귀인}의 운을 펼쳐볼 차례입니다.', sub: '{귀인}이 태어난 순간을 알려주십시오. 그 시간에 담긴 사주팔자를 펼쳐 보이겠습니다.', notice: '', bridge: '', cta: { show: true, text: '나의 운 확인하기', to: 'story' } },
  ];

  /* ── 서비스 소개(SECTION 04) ─ status: live(이용 가능) · soon(준비 중). visible=false 면 노출하지 않는다 ── */
  var SERVICES = [
    { id: 'ilju', title: '일주 각성 영상', desc: '태어난 날의 일간·일주에 맞춰 만들어진 나만의 캐릭터 각성 영상.', glyph: '覺', status: 'live', visible: true, image: '', video: '', link: '' },
    { id: 'trait', title: '성향·강점·주의점 분석', desc: '타고난 기질에서 강점과 조심할 점을 쉬운 말로 풀어 줍니다.', glyph: '性', status: 'live', visible: true, image: '', video: '', link: '' },
    { id: 'wealth', title: '재물운과 자산 관리 성향', desc: '돈이 들어오고 머무는 방식, 소비와 저축의 성향을 살펴봅니다.', glyph: '財', status: 'live', visible: true, image: '', video: '', link: '' },
    { id: 'career', title: '직업·적성 분석', desc: '어떤 일에서 힘이 나는지, 어떤 환경이 맞는지 살펴봅니다.', glyph: '職', status: 'live', visible: true, image: '', video: '', link: '' },
    { id: 'love', title: '연애·결혼과 인간관계', desc: '관계를 맺는 방식과 인연의 흐름을 해석합니다.', glyph: '緣', status: 'live', visible: true, image: '', video: '', link: '' },
    { id: 'flow', title: '대운·세운·월운 흐름', desc: '10년·1년·한 달 단위의 운의 흐름을 그래프로 봅니다. 기회기·축적기·전환기·방어기 같은 국면도 함께 확인합니다.', glyph: '運', status: 'live', visible: true, image: '', video: '', link: '' },
    { id: 'toon', title: '개인별 종합 무빙툰 리포트', desc: '내 사주를 한 편의 동양 판타지 무빙툰으로 이어 보는 종합 리포트.', glyph: '卷', status: 'live', visible: true, image: '', video: '', link: '' },
    { id: 'pdf', title: '종합 풀이 PDF', desc: '리포트를 문서로 보관하는 종합 풀이 PDF.', glyph: '書', status: 'live', visible: true, image: '', video: '', link: '' },
  ];

  /* ── 명리학 주제(SECTION 03 상세) ─ nature: history(역사적 사실) · tradition(전통 해석) · science(천문·과학적 사실) · limit(한계 안내) ── */
  var NATURE = { history: '역사적 사실', tradition: '전통 해석', science: '천문·과학적 사실', limit: '한계 안내' };
  var TOPICS = [
    { id: 'history', enabled: true, nature: 'history', title: '명리학의 역사', sub: '하늘의 시간을 헤아리던 데서 시작되었습니다.', summary: '간지(干支)로 해와 날을 세는 방식은 고대 중국의 역법에서 비롯되었고, 사주 풀이의 틀은 당·송대를 거치며 정리된 것으로 전해집니다.', detail: '십간과 십이지로 날짜를 세는 방식은 3천 년 넘은 갑골문에서도 확인됩니다. 태어난 연·월·일·시로 사람의 흐름을 살피는 체계는 당나라의 이허중, 송나라의 서자평을 거치며 다듬어진 것으로 알려져 있으며, 구체적인 계보에는 이견이 있습니다.', analogy: '', term: '', termEasy: '', image: '', video: '', image2: '', anim: 'fade', refs: '' },
    { id: 'saju', enabled: true, nature: 'tradition', title: '사주팔자의 기본 구조', sub: '네 기둥, 여덟 글자.', summary: '태어난 해·달·날·시를 각각 하나의 기둥으로 보고, 기둥마다 천간과 지지 두 글자를 놓아 모두 여덟 글자가 됩니다.', detail: '연주·월주·일주·시주 네 기둥이 사주(四柱)이고, 각 기둥의 두 글자를 합쳐 팔자(八字)라 부릅니다. 이 가운데 태어난 날의 천간(일간)을 나를 나타내는 중심으로 삼아 나머지 글자와의 관계를 해석합니다.', analogy: '네 장의 사진을 겹쳐 한 사람의 시간 지도를 그리는 것과 비슷합니다.', term: '일간', termEasy: '태어난 날의 천간으로, 사주 해석에서 나 자신을 나타내는 중심 글자입니다.', image: '', video: '', image2: '', anim: 'rise', refs: '' },
    { id: 'ganji', enabled: true, nature: 'tradition', title: '천간과 지지', sub: '열 개의 하늘, 열두 개의 땅.', summary: '천간 10자와 지지 12자를 차례로 짝지어 시간을 표현하는 기호 체계입니다.', detail: '천간은 갑·을·병·정·무·기·경·신·임·계, 지지는 자·축·인·묘·진·사·오·미·신·유·술·해입니다. 둘을 순서대로 짝지으면 60가지 조합(육십갑자)이 되고, 같은 조합은 60년 만에 다시 돌아옵니다. 환갑이 이 주기에서 나온 말입니다.', analogy: '10칸 톱니와 12칸 톱니가 맞물려 돌면 60번째에 처음 자리로 돌아오는 것과 같습니다.', term: '육십갑자', termEasy: '천간 10자와 지지 12자를 짝지어 만든 60가지 시간의 이름표입니다.', image: '', video: '', image2: '', anim: 'rise', refs: '' },
    { id: 'ohaeng', enabled: true, nature: 'tradition', title: '음양오행', sub: '나무·불·흙·쇠·물의 순환.', summary: '세상의 변화를 음과 양, 그리고 목·화·토·금·수 다섯 가지 기운의 관계로 설명하는 동양의 사고 틀입니다.', detail: '오행은 서로를 살리는 상생(목→화→토→금→수→목)과 서로를 누르는 상극의 관계로 설명됩니다. 이는 자연의 변화를 분류하기 위한 전통적 은유 체계이며, 물질을 이루는 원소에 대한 현대 과학의 이론이 아닙니다.', analogy: '', term: '오행', termEasy: '사람과 자연의 성질을 다섯 가지 기운으로 나누어 보는 전통적 분류입니다.', image: '', video: '', image2: '', anim: 'fade', refs: '' },
    { id: 'jeolgi', enabled: true, nature: 'science', title: '사계절과 절기', sub: '월주는 달력이 아니라 태양의 위치로 바뀝니다.', summary: '24절기는 태양이 하늘을 도는 위치를 15도씩 나눈 것으로, 사주의 월주는 이 절기를 기준으로 바뀝니다.', detail: '절기는 천문학적으로 계산되는 사실입니다. 사주에서는 매달 1일이 아니라 입춘·경칩 같은 절기가 드는 순간에 월(月)이 바뀌고, 입춘을 한 해의 시작으로 봅니다. 그래서 같은 날 태어나도 절기 시각 전후에 따라 월주가 달라질 수 있습니다.', analogy: '', term: '절기', termEasy: '태양의 위치로 정해지는 24개의 계절 구분점입니다.', image: '', video: '', image2: '', anim: 'crossfade', refs: '' },
    { id: 'luck', enabled: true, nature: 'tradition', title: '대운과 세운', sub: '긴 흐름과 해마다의 흐름.', summary: '대운은 10년 단위의 장기적인 환경 변화, 세운은 해마다 바뀌는 흐름을 해석하는 개념입니다.', detail: '대운은 출생 월주를 기준으로 성별과 연주의 음양에 따라 순행 또는 역행하며 정해지고, 세운은 그 해의 간지입니다. 시작 시점을 계산하는 방식은 학파마다 조금씩 다를 수 있습니다.', analogy: '대운이 계절이라면 세운은 그 계절 속의 날씨와 같습니다.', term: '대운', termEasy: '명리학에서 인생의 장기적인 환경 변화를 해석할 때 사용하는 10년 단위의 시간 구간입니다.', image: '', video: '', image2: '', anim: 'rise', refs: '' },
    { id: 'sixty', enabled: false, nature: 'tradition', title: '육십갑자', sub: '', summary: '천간과 지지를 짝지어 만든 60가지 조합으로 해·달·날·시에 이름을 붙입니다.', detail: '', analogy: '', term: '', termEasy: '', image: '', video: '', image2: '', anim: 'fade', refs: '' },
    { id: 'ilju', enabled: false, nature: 'tradition', title: '일간과 일주', sub: '', summary: '일주는 태어난 날의 간지이고, 그 첫 글자인 일간이 해석의 중심이 됩니다.', detail: '', analogy: '', term: '일주', termEasy: '태어난 날을 나타내는 간지 두 글자입니다.', image: '', video: '', image2: '', anim: 'fade', refs: '' },
    { id: 'limit', enabled: true, nature: 'limit', title: '명리학의 활용과 한계', sub: '참고하는 도구이지, 정해진 답이 아닙니다.', summary: '명리학은 전통 해석 체계이며, 그 예측력이 현대 과학으로 입증된 것은 아닙니다.', detail: '풀이는 자신을 돌아보고 시기를 가늠해 보는 참고 자료로 읽는 것이 좋습니다. 건강·법률·재무 같은 중요한 결정을 대신할 수 없으며, 같은 사주도 해석하는 사람과 학파에 따라 달라질 수 있습니다.', analogy: '', term: '', termEasy: '', image: '', video: '', image2: '', anim: 'fade', refs: '' },
  ];
  // 홈 화면 용어 설명(눌러서 보는 한 줄 풀이). 해석이 아니라 용어의 뜻만 적는다.
  var TERMS = { '일간': '태어난 날의 천간. 사주 해석에서 나 자신을 나타내는 중심 글자입니다.', '일주': '태어난 날을 나타내는 간지 두 글자(천간+지지)입니다.', '대운': '명리학에서 인생의 장기적인 환경 변화를 해석할 때 쓰는 10년 단위의 시간 구간입니다.', '일진': '그날 자체의 간지입니다. 오늘의 흐름을 살필 때 쓰는 하루 단위의 기운입니다.' };
  var INTRO_NOTICE = '위 연구·사례와 명리학은 서로 다른 성격의 이야기입니다. 명리학은 전통 해석 체계이며, 현대 연구가 그 예측력을 입증한 것은 아닙니다.';

  /* ── 무협 슬라이드 툰 '귀인의 천명록' (6장면) ───────────────────
     lines: 수련생 대사(무협 사극체). hint/error/button 은 현대 한국어. field 는 입력 종류. face 는 표정 키. */
  var SCENES = [
    { id: 'arrive', enabled: true, field: 'name', face: 'greet', theme: 'gate', title: "기록의 문턱", lines: ["기록의 문이 열렸습니다.","어떤 이름으로 기록해 드릴까요?"], hint: "이름 또는 불리는 이름을 입력하세요", button: '다음', image: '', bg: '' },
    { id: 'day', enabled: true, field: 'date', face: 'ask', theme: 'scroll', title: "태어난 날의 기록", lines: ["{이름귀인}, 태어난 날을 알려 주세요.","양력과 음력 기준을 함께 확인하겠습니다."], hint: '생년월일과 양력·음력을 선택하세요', button: '다음', image: '', bg: '' },
    { id: 'time', enabled: true, field: 'time', face: 'shock', theme: 'stars', title: "시간의 흔적", lines: ["태어난 시각을 기록하겠습니다.","시간을 모르시면 모름을 선택해 주세요."], hint: '출생 시각을 모르면 일부 사주 및 자미두수 해석이 제한될 수 있습니다.', unknownLines: ["시간의 기록은 비워 두겠습니다.","확인할 수 있는 정보부터 살펴보겠습니다."], button: '다음', image: '', bg: '' },
    { id: 'place', enabled: true, field: 'place', face: 'ask', theme: 'map', title: "태어난 곳", lines: ["이제 태어난 곳을 확인하겠습니다.","태어난 지역을 선택해 주세요."], hint: '태어난 지역은 시간 보정(경도)에 사용됩니다.', button: '다음', image: '', bg: '' },
    { id: 'gender', enabled: true, field: 'gender', face: 'serious', theme: 'ledger', title: "마지막 기록", lines: ["마지막 정보를 확인하겠습니다.","대운의 흐름을 계산하는 데 사용하는 기록입니다."], hint: '성별은 대운이 흐르는 방향(순행·역행)을 계산할 때만 사용합니다. 다른 용도로 쓰지 않습니다.', button: '다음', image: '', bg: '' },
    { id: 'confirm', enabled: true, field: 'confirm', face: 'proud', theme: 'reveal', title: "기록을 펼칠 시간", lines: ["{이름귀인}, 기록이 모였습니다.","입력한 내용을 확인하고 사주를 펼쳐보세요."], hint: '입력한 정보를 확인해 주세요.', button: '나의 사주 확인하기', image: '', bg: '' },
  ];
  var REVEAL_LINES = ['{이름귀인}, 사주 기록이 완성되었습니다.', '이제 타고난 기질과 시간의 흐름을 살펴보겠습니다.', '기록을 읽고, 다음 선택을 생각해 보세요.'];
  var FACES = { greet: '반가움', ask: '궁금함', shock: '깜짝', serious: '진지함', proud: '뿌듯함', worry: '걱정' };

  var DEFAULTS = { bridge: BRIDGE, forceOnboarding: true, honorific: DEFAULT_HONORIFIC, weights: { research: 60, celebrity: 40 }, cases: CASES, intro: INTRO, introLast: INTRO_LAST, scenes: SCENES, revealLines: REVEAL_LINES, sections: SECTIONS, services: SERVICES, topics: TOPICS, progressLabel: '{n} / {total} · {title}', afterDone: 'reveal' };

  /* ── 설정 병합 ────────────────────────────────────────────────
     서버 값(관리자 저장본)을 기본값 위에 얹는다. 장면은 id 로 맞춰 문구·이미지만 덮어쓰고, 입력 종류(field)와 계산 연결은 코드가 지킨다
     (관리자가 필수 입력 필드를 지우거나 바꾸지 못하게). 사례는 서버가 정한 목록·상태를 그대로 따른다(기본 사례 중 서버에 없는 것은 비공개). */
  var REQUIRED_FIELDS = ['name', 'date', 'time', 'place', 'gender', 'confirm'];
  var SECTION_TYPES = ['research', 'myeongri', 'service', 'story', 'final'];
  function merge(base, ov) {
    base = base || DEFAULTS; var out = JSON.parse(JSON.stringify(base)); if (!ov || typeof ov !== 'object') return out;
    if (ov.bridge && typeof ov.bridge === 'object') out.bridge = Object.assign({}, out.bridge, pick(ov.bridge, ['toCelebrity', 'toIntro']));
    if (ov.cover && typeof ov.cover === 'object' && !Array.isArray(ov.cover)) out.cover = JSON.parse(JSON.stringify(ov.cover));
    if (ov.resultDestination === 'timeline' || ov.resultDestination === 'home') out.resultDestination = ov.resultDestination;
    if (typeof ov.forceOnboarding === 'boolean') out.forceOnboarding = ov.forceOnboarding;
    if (typeof ov.honorific === 'string') out.honorific = honorific(ov);
    if (ov.weights && typeof ov.weights === 'object') { var r = +ov.weights.research, c = +ov.weights.celebrity; if (r >= 0 && c >= 0 && r + c > 0) out.weights = { research: r, celebrity: c }; }
    if (Array.isArray(ov.cases)) out.cases = ov.cases.filter(function (x) { return x && x.id && x.title; });
    // 기본 제공 출생 시기 연구 카드는 서버 저장본에 없어도(이 기능 배포 전에 저장된 설정) 붙인다. 관리자가 지운 것(removedCases)은 제외.
    var gone = Array.isArray(ov.removedCases) ? ov.removedCases : [];
    BIRTH_CASES.slice().reverse().forEach(function (d) { if (!out.cases.some(function (x) { return x.id === d.id; }) && gone.indexOf(d.id) < 0) out.cases.unshift(JSON.parse(JSON.stringify(d))); });
    out.removedCases = gone.slice();
    out.cases = out.cases.map(normalizeCase);
    // 섹션: 서버가 보낸 순서를 따르되 알려진 type 만 받고, 빠진 기본 섹션은 뒤에 붙인다(새 배포로 섹션이 늘어도 사라지지 않게)
    if (Array.isArray(ov.sections)) {
      var seenS = {}, list = ov.sections.filter(function (x) { return x && SECTION_TYPES.indexOf(x.type) >= 0 && x.id && !seenS[x.id] && (seenS[x.id] = 1); }).map(function (x) {
        var d = SECTIONS.filter(function (y) { return y.type === x.type; })[0] || SECTIONS[0];
        return Object.assign({}, d, pick(x, ['id', 'type', 'enabled', 'effect', 'kicker', 'title', 'sub', 'notice', 'bridge', 'topics', 'bg', 'bgMobile', 'art', 'artVideo']), { sty: cleanStyleMap(x.sty, STY_ROLES.section) }, { cta: Object.assign({}, d.cta, x.cta && typeof x.cta === 'object' ? pick(x.cta, ['show', 'text', 'to']) : {}) });
      });
      out.sections = list;
      SECTIONS.forEach(function (d) { if (d.type !== 'story' && !list.some(function (x) { return x.type === d.type; })) out.sections.push(JSON.parse(JSON.stringify(d))); });
    }
    if (typeof ov.progressLabel === 'string' && ov.progressLabel.trim()) out.progressLabel = ov.progressLabel.trim().slice(0, 60);
    if (ov.afterDone === 'home' || ov.afterDone === 'reveal') out.afterDone = ov.afterDone;
    if (Array.isArray(ov.services)) out.services = ov.services.filter(function (x) { return x && x.id && x.title; }).map(function (x) { return Object.assign({ desc: '', glyph: '', status: 'live', visible: true, image: '', video: '', link: '' }, x); });
    if (Array.isArray(ov.topics)) out.topics = ov.topics.filter(function (x) { return x && x.id && x.title; }).map(function (x) { return Object.assign({ enabled: true, nature: 'tradition', sub: '', summary: '', detail: '', analogy: '', term: '', termEasy: '', image: '', video: '', image2: '', anim: 'fade', refs: '' }, x); });
    if (Array.isArray(ov.intro)) out.intro = out.intro.map(function (d) { var o = ov.intro.filter(function (x) { return x && x.id === d.id; })[0]; return o ? Object.assign({}, d, pick(o, ['title', 'body', 'sub', 'image', 'video', 'enabled', 'glyph']), { sty: cleanStyleMap(o.sty, STY_ROLES.intro) }) : d; });
    if (Array.isArray(ov.scenes)) out.scenes = out.scenes.map(function (d) { var o = ov.scenes.filter(function (x) { return x && x.id === d.id; })[0]; return o ? Object.assign({}, d, pick(o, ['title', 'lines', 'hint', 'unknownLines', 'button', 'face', 'image', 'bg', 'bubble', 'enabled']), { field: d.field }) : d; });
    // 이전 공개본의 무협 대사가 새 기본 문구를 다시 덮어쓰지 않도록 호환한다. 미디어·배치와 현대어 편집은 보존한다.
    var legacySpeech = /사옵|하옵|이옵|소인이|소인은|강림하|존함|무림|강호/;
    out.scenes.forEach(function (s) { var d = base.scenes.filter(function (x) { return x.id === s.id; })[0]; if (!d) return; ['lines','unknownLines'].forEach(function (k) { if (Array.isArray(s[k]) && s[k].some(function (t) { return legacySpeech.test(t); })) s[k] = JSON.parse(JSON.stringify(d[k] || [])); }); if (legacySpeech.test(s.title || '')) s.title = d.title; });
    // 필수 입력 단계는 끌 수 없다
    out.scenes.forEach(function (s) { if (REQUIRED_FIELDS.indexOf(s.field) >= 0) s.enabled = true; });
    if (ov.introLast && typeof ov.introLast === 'object') out.introLast = Object.assign({}, out.introLast, pick(ov.introLast, ['line', 'cta']));
    if (Array.isArray(ov.revealLines) && ov.revealLines.length) out.revealLines = ov.revealLines.some(function (t) { return legacySpeech.test(t); }) ? base.revealLines.slice() : ov.revealLines.map(String).slice(0, 5);
    return out;
  }
  /* ── 글자 스타일(관리자가 문구마다 정하는 글씨체·크기·굵기·색) ──
     저장 모양: { font, size, sizeM, weight, color } — 모두 선택 사항(비우면 기본 디자인). 글씨체 키는 report/story/fonts.js 의 FONTS·functions/_textstyle.js 의 FONT_KEYS 와 같다.
     size = PC 글자 크기(px) · sizeM = 모바일(720px 이하) 글자 크기(px). 서버(functions/api/onboarding.js)도 같은 규칙으로 거른다. */
  var FONT_KEYS = ['serif', 'sans', 'nanummj', 'gowunb', 'hahmlet', 'songmyung', 'gowund', 'blackhan', 'dohyeon', 'jua', 'pen', 'dokdo', 'gamja', 'cinzel', 'cormorant'], WEIGHTS = ['300', '400', '500', '600', '700', '900'];
  function cleanStyle(s) {
    s = s && typeof s === 'object' ? s : {}; var o = {}, n;
    if (FONT_KEYS.indexOf(s.font) >= 0) o.font = s.font;
    n = s.size === '' || s.size == null ? NaN : +s.size; if (isFinite(n)) o.size = Math.min(120, Math.max(8, Math.round(n * 10) / 10));
    n = s.sizeM === '' || s.sizeM == null ? NaN : +s.sizeM; if (isFinite(n)) o.sizeM = Math.min(120, Math.max(8, Math.round(n * 10) / 10));
    if (WEIGHTS.indexOf(String(s.weight)) >= 0) o.weight = String(s.weight);
    if (typeof s.color === 'string' && /^#[0-9a-f]{6}$/i.test(s.color.trim())) o.color = s.color.trim().toLowerCase();
    return o;
  }
  // { 역할: 스타일 } → 알려진 역할만, 빈 스타일은 뺀다
  function cleanStyleMap(map, roles) { var out = {}; if (!map || typeof map !== 'object') return out; (roles || []).forEach(function (r) { var c = cleanStyle(map[r]); if (Object.keys(c).length) out[r] = c; }); return out; }
  var STY_ROLES = { section: ['kicker', 'title', 'sub', 'notice', 'bridge', 'cta'], intro: ['title', 'body', 'sub'], card: ['hook', 'title', 'body', 'caveat', 'source'], step: ['head', 'desc', 'say', 'hint', 'button'] };

  function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; }); return r; }

  /* ── 사례 고르기 ──────────────────────────────────────────────
     공개(published) 사례만. 유형 가중치(연구 60 : 유명인 40)로 유형을 먼저 정하고, 그 안에서 사례 가중치로 고른다.
     직전에 본 사례는 다른 후보가 있는 한 제외한다. rnd 를 주입하면 재현된다. 해당 유형에 사례가 없으면 다른 유형으로 넘어간다. */
  // 공개 조건: 검증 완료 + 공개 켬 + 출처. 방문자 풀에는 이것만 들어간다.
  function publicCases(cases) { return (cases || []).filter(Boolean).map(normalizeCase).filter(function (c) { return c.visible && c.verification.state === 'verified' && c.title && ((c.body && c.body.length) || (c.story && c.story.length)) && c.source && (c.source.doi || c.source.url); }); }
  // 출생 시기 연구 카드(SECTION 02) — 공개 사례 중 group === 'birth', 표시 순서(display.order → 배열 순)
  function birthCards(cases) { return publicCases(cases).filter(function (c) { return c.group === 'birth'; }).map(function (c, i) { return { c: c, i: i }; }).sort(function (a, b) { return (a.c.display.order - b.c.display.order) || (a.i - b.i); }).map(function (x) { return x.c; }); }
  function pickCase(cfg, opts) {
    opts = opts || {}; var rnd = opts.rnd || Math.random, recent = opts.recent || [], pool = publicCases(cfg.cases).filter(function (c) { return c.group !== 'birth'; });
    if (opts.type) pool = pool.filter(function (c) { return c.type === opts.type; });
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

  root.Onboard = { cleanStyle: cleanStyle, cleanStyleMap: cleanStyleMap, STY_ROLES: STY_ROLES, FONT_KEYS: FONT_KEYS, WEIGHTS: WEIGHTS, TERMS: TERMS, DEFAULTS: DEFAULTS, CASES: CASES, INTRO: INTRO, INTRO_LAST: INTRO_LAST, INTRO_NOTICE: INTRO_NOTICE, SCENES: SCENES, REVEAL_LINES: REVEAL_LINES, FACES: FACES, PLACES: PLACES, REQUIRED_FIELDS: REQUIRED_FIELDS, FORBIDDEN_TITLES: FORBIDDEN_TITLES,
    honorific: honorific, addr: addr, fill: fill, merge: merge, publicCases: publicCases, birthCards: birthCards, normalizeCase: normalizeCase, KINDS: KINDS, VSTATE: VSTATE, RELATION: RELATION, DESIGNS: DESIGNS, EFFECTS: EFFECTS, NATURE: NATURE, SECTIONS: SECTIONS, SERVICES: SERVICES, TOPICS: TOPICS, SECTION_TYPES: SECTION_TYPES, pickCase: pickCase, validateDate: validateDate, validateTime: validateTime, toProfile: toProfile };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Onboard;
})(typeof window !== 'undefined' ? window : globalThis);
