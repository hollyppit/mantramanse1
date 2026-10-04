// 판매 페이지(/report/) 홈 화면 내용: 기본 문구(DEFAULTS), 관리자 편집 양식(TYPES), 화면 그리기(render).
// 판매 페이지와 관리자 미리보기가 같은 코드를 쓴다. 저장된 설정은 /api/home (GLOSSARY_KV 'home:config').
//
// 글자 서식은 글자가 속한 객체의 st[필드]에 저장한다(예: section.st.title). 항목이 옮겨져도 서식이 따라간다.
//   st = { font, sz(% 기본 100), wt, color, align, ls(0.01em), lh(%), op(%), it, dx, dy(px) }
// 화면의 글자·이미지에는 data-k 경로를 붙여 미리보기에서 클릭·끌기로 고를 수 있다.
//   hero/title · brand/name · footer/lines · <섹션id>/title · <섹션id>/items/2/text · <섹션id>/decor/0 · hero/decor/1
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // 줄바꿈은 <br>, *별표*로 감싼 글자는 금빛 강조
  function fmt(s) { return esc(s).replace(/\n/g, '<br>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>'); }
  function lines(s) { return String(s || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function href(h) { h = String(h || '').trim(); return /^(#[\w-]*|\/[^\s]*|https:\/\/[^\s]+|mailto:[^\s]+)$/.test(h) ? h : '#'; }
  function img(u) { u = String(u || '').trim(); return /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]+)$/.test(u) ? u : ''; }
  function hex(c) { return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : ''; }
  function num(v, d) { if (v === undefined || v === null || v === '') return d; v = +v; return isFinite(v) ? v : d; }
  function fonts() { return (window.MovingFx && window.MovingFx.FONTS) || {}; }

  // ── 편집 양식. t: t=한 줄, l=여러 줄, b=체크, s=선택(o), n=숫자(o: [최소,최대,간격,기본값]), c=색, i=이미지, f=글씨체
  var ART = [['awaken', '각성 (돌아가는 기운의 고리)'], ['five', '오행 (다섯 빛깔의 구슬)'], ['road', '길 (산과 이어지는 길)'], ['gate', '문 (붉은 문)']];
  // 배경·여백: 첫 화면과 모든 섹션이 함께 쓴다
  var BG = [['bgSrc', '배경 이미지', 'i'], ['bgMobileSrc', '모바일용 배경 이미지 (없으면 위 이미지)', 'i'], ['bgColor', '배경 색 (선택)', 'c'],
    ['bgOpacity', '배경 이미지 진하기 %', 'n', [0, 100, 5, 100]], ['bgDark', '어둡게 덮기 %', 'n', [0, 100, 5, 0]], ['bgBlur', '흐리게 px', 'n', [0, 30, 1, 0]],
    ['bgX', '이미지 가로 위치 %', 'n', [0, 100, 1, 50]], ['bgY', '이미지 세로 위치 %', 'n', [0, 100, 1, 50]], ['bgFade', '위·아래 가장자리 흐려짐 %', 'n', [0, 40, 1, 12]],
    ['bgFixed', '스크롤해도 배경 고정 (은은한 시차 효과)', 'b']];
  var PAD = [['padTop', '위 여백 px', 'n', [0, 500, 5, null]], ['padBot', '아래 여백 px', 'n', [0, 500, 5, null]]];
  var DECOR = { k: 'decor', label: '장식 이미지', title: 'src', fields: [['src', '이미지', 'i'], ['x', '가로 위치 % (구역 기준)', 'n', [-30, 130, 0.1, 50]], ['y', '세로 위치 %', 'n', [-30, 130, 0.1, 50]],
    ['w', '너비 %', 'n', [2, 200, 0.5, 30]], ['rot', '회전 °', 'n', [-180, 180, 0.5, 0]], ['op', '투명도 %', 'n', [0, 100, 1, 100]], ['blur', '흐리게 px', 'n', [0, 30, 1, 0]],
    ['layer', '겹침', 's', [['back', '글자 뒤'], ['front', '글자 앞']]], ['blend', '합성 방식', 's', [['normal', '보통'], ['screen', '밝게 (빛·안개)'], ['multiply', '어둡게'], ['soft-light', '부드럽게']]]],
    blank: { src: '', x: 50, y: 50, w: 30, rot: 0, op: 100, layer: 'back', blend: 'normal' } };

  var TYPES = {
    intro: { label: '소개 문단', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l'], ['lead', '본문', 'l']] },
    preview: { label: '장면 미리보기', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l'], ['badge', '배지', 't'], ['note', '안내 문구', 'l']],
      list: { k: 'items', label: '장면', title: 'text', fields: [['art', '그림', 's', ART], ['glyph', '큰 글자 (선택)', 't'], ['sfx', '세로 효과음 글자', 't'], ['text', '대사·문장', 'l'], ['small', '작은 설명', 't'], ['bgSrc', '이 장면의 배경 그림 (없으면 기본 그림)', 'i']], blank: { art: 'awaken', glyph: '', sfx: '', text: '새 장면', small: '' } } },
    episodes: { label: '장(章) 목록', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l'], ['lead', '본문', 'l'], ['note', '아래 안내', 'l']],
      list: { k: 'items', label: '장', title: 'title', fields: [['no', '번호 글자', 't'], ['title', '이름', 't'], ['desc', '설명', 'l'], ['hi', '강조 (붉은 번호)', 'b']], blank: { no: '', title: '새 장', desc: '', hi: false } } },
    paths: { label: '카드 3열 (개운의 길)', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l'], ['lead', '본문', 'l']],
      list: { k: 'items', label: '카드', title: 'title', fields: [['title', '제목', 't'], ['text', '내용', 'l'], ['core', '핵심 카드 (금빛 테두리)', 'b']], blank: { title: '새 카드', text: '', core: false } } },
    pillars: { label: '근거 (3열 기둥)', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l'], ['lead', '본문', 'l']],
      list: { k: 'items', label: '항목', title: 'title', fields: [['title', '제목', 't'], ['text', '내용', 'l']], blank: { title: '새 항목', text: '' } } },
    prices: { label: '상품 구성', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l'], ['note', '아래 안내', 'l']],
      list: { k: 'items', label: '상품', title: 'title', fields: [['badge', '배지', 't'], ['title', '상품 이름', 't'], ['bullets', '구성 (한 줄에 하나)', 'l'], ['amt', '가격 표시', 't'], ['main', '핵심 상품 (금빛 테두리)', 'b']], blank: { badge: '', title: '새 상품', bullets: '', amt: '가격 미정', main: false } } },
    faq: { label: '자주 묻는 질문', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l']],
      list: { k: 'items', label: '질문', title: 'q', fields: [['q', '질문', 't'], ['a', '답', 'l']], blank: { q: '새 질문', a: '' } } },
    notify: { label: '출시 알림 신청', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l'], ['button', '버튼 글자', 't'], ['consent', '동의 문구', 'l'], ['done', '신청 완료 메시지', 'l']] },
    image: { label: '이미지 · 배너', fields: [['src', '이미지', 'i'], ['mobileSrc', '모바일용 이미지 (없으면 위 이미지)', 'i'], ['alt', '이미지 설명 (읽어 주기용)', 't'],
      ['width', '너비 %', 'n', [10, 100, 1, 100]], ['ratio', '가로세로 비율', 's', [['auto', '원본 그대로'], ['16/9', '가로 16:9'], ['21/9', '와이드 21:9'], ['4/3', '가로 4:3'], ['1/1', '정사각'], ['3/4', '세로 3:4'], ['9/16', '세로 9:16']]],
      ['fit', '채우기', 's', [['cover', '꽉 채움 (잘릴 수 있음)'], ['contain', '전체 보이게']]], ['radius', '모서리 둥글기 px', 'n', [0, 80, 1, 3]], ['frame', '금빛 테두리 장식', 'b'], ['full', '화면 폭 가득 (양옆 여백 없음)', 'b'],
      ['href', '클릭하면 이동할 주소 (선택)', 't'], ['caption', '이미지 아래 글', 'l']] },
    spacer: { label: '여백', fields: [['h', '높이 px', 'n', [0, 800, 10, 80]]], noBg: true },
    divider: { label: '구분 장식', fields: [['style', '모양', 's', [['diamond', '마름모를 낀 선'], ['line', '가는 선'], ['dots', '점 세 개']]]], noBg: true },
  };
  var BRAND = [['name', '브랜드 이름', 't'], ['sub', '부제', 't'], ['seal', '붉은 낙관 글자 (1~2자)', 't'], ['siteTitle', '브라우저 탭 제목', 't'], ['desc', '검색·공유 설명', 'l'], ['backLabel', '상단 오른쪽 링크 글자 (비우면 숨김)', 't'], ['backHref', '그 링크 주소', 't']];
  var HERO = [['kicker', '위쪽 한자 문구', 't'], ['title', '큰 제목', 'l'], ['lead', '설명', 'l'], ['cta1Label', '첫 번째 버튼 글자', 't'], ['cta1Href', '첫 번째 버튼 이동 (#notify 등)', 't'], ['cta2Label', '두 번째 버튼 글자 (비우면 숨김)', 't'], ['cta2Href', '두 번째 버튼 이동', 't'], ['vertical', '왼쪽 세로 한자', 't'], ['hint', '아래 스크롤 안내 글자', 't']];
  var HERO_BG = [['art', '기본 달·산·별 장식', 's', [['all', '모두 보이기'], ['stars', '별만'], ['none', '모두 숨기기']]], ['h', '첫 화면 높이 (화면 높이의 %)', 'n', [40, 100, 5, 100]]].concat(BG);
  var FOOT = [['lines', '하단 문구 (한 줄에 하나)', 'l']];

  var DEFAULTS = {
    brand: { name: '만트라 포춘', sub: '사주 무빙툰', seal: '命', siteTitle: '만트라 포춘: 사주 무빙툰',
      desc: '내 사주가 동양 판타지 무빙툰의 주인공이 됩니다. 원국에 근거한 이야기와, 읽고 바로 할 수 있는 개운 가이드. 출시 알림을 신청하세요.', backLabel: '만세력 앱 →', backHref: '/' },
    hero: { kicker: '命 · 運 · 開', title: '내 사주가\n*무빙툰의 주인공*이 된다',
      lead: '타고난 기운이 하나의 이야기로 움직입니다.\n원국에 근거해 쓴 동양 판타지 무빙툰, 그리고 읽고 나서 바로 해 볼 수 있는 개운 가이드.',
      cta1Label: '출시 알림 받기', cta1Href: '#notify', cta2Label: '첫 장면 보기', cta2Href: '#toon', vertical: '四柱', hint: 'SCROLL' },
    sections: [
      { id: 'concept', type: 'intro', show: true, eyebrow: '무빙툰이란', title: '세로로 흐르는 이야기,\n살아 움직이는 장면', lead: '웹툰처럼 스크롤을 내리면 장면이 열리고, 그림이 움직이고, 내 사주의 이야기가 이어집니다. 일주는 주인공이 되고, 오행은 주인공을 둘러싼 기운이 되고, 대운은 걸어가는 길이 됩니다.' },
      { id: 'toon', type: 'preview', show: true, eyebrow: '첫 장면 미리보기', title: '이런 장면으로 펼쳐집니다', badge: '연출 목업 · 예시 캐릭터',
        note: '아래는 제작 방향을 보여 주는 예시입니다. 실제 그림과 이야기는 입력한 사주에 맞춰 만들어집니다.',
        items: [
          { art: 'awaken', glyph: '甲子', sfx: '覺醒', text: '고요한 밤, 오래 잠들어 있던 이름이 깨어난다. 사람들은 그를 ‘푸른 숲을 품은 물의 아이’라 불렀다.', small: '예시 · 일주의 기질을 이야기의 첫 장면으로 옮깁니다' },
          { art: 'five', glyph: '', sfx: '五行', text: '다섯 갈래의 기운이 그를 감싸고 돈다. 어떤 기운은 곁을 지키고, 어떤 기운은 시험처럼 다가온다.', small: '예시 · 원국의 오행 분포를 장면의 기운으로 표현합니다' },
          { art: 'road', glyph: '', sfx: '大運', text: '길은 십 년마다 모습을 바꾼다. 어느 구간에서는 달리고, 어느 구간에서는 쉬어 가야 한다.', small: '예시 · 대운의 흐름과 전환점을 길 위의 장면으로 풀어 냅니다' },
          { art: 'gate', glyph: '', sfx: '올해의 문', text: '올해, 그의 앞에 문이 하나 서 있다. 문을 열 것인가, 문 앞에서 숨을 고를 것인가.', small: '예시 · 연도별 가이드가 ‘움직일 때’와 ‘점검할 때’를 장면으로 알려 줍니다' },
        ] },
      { id: 'episodes', type: 'episodes', show: true, eyebrow: '전체 구성', title: '아홉 장으로 이어지는 이야기', lead: '애정·재물·성공의 세 장 끝에는 같은 틀의 개운 솔루션이 붙습니다.',
        note: '건강은 별도의 장 없이, 생활 습관 수준의 조언으로만 간단히 다룹니다.',
        items: [
          { no: '序', title: '일주의 각성', desc: '일주 캐릭터가 깨어나는 인트로, 한 줄 요약', hi: false },
          { no: '一', title: '타고난 성정', desc: '기질, 강점과 약점, 사람을 대하는 방식', hi: false },
          { no: '二', title: '인생의 길', desc: '10년 단위 키워드, 흐름 그래프, 전환점 3개', hi: false },
          { no: '三', title: '인연의 장', desc: '배우자상, 관계 패턴, 인연이 닿는 시기 후보 · 개운', hi: true },
          { no: '四', title: '재물의 장', desc: '재물 그릇, 버는 방식, 점검이 필요한 시기 · 개운', hi: true },
          { no: '五', title: '도약의 장', desc: '적성 직군, 직장형/독립형, 도약 시기 · 개운', hi: true },
          { no: '六', title: '가족의 장', desc: '부모궁, 자녀궁, 가족 안에서의 내 자리', hi: false },
          { no: '七', title: '앞으로 십 년의 문', desc: '해마다 움직일 때와 멈출 때, 해야 할 일', hi: false },
          { no: '終', title: '개운 종합 카드', desc: '한 장으로 정리한 요약', hi: false },
        ] },
      { id: 'paths', type: 'paths', show: true, eyebrow: '개운 가이드', title: '이야기를 덮고 나서,\n해 볼 일이 남습니다', lead: '',
        items: [
          { title: '전통의 길', text: '용신 오행을 기준으로 색, 방위, 숫자, 소품을 가볍게 곁들입니다.', core: false },
          { title: '행동의 길', text: '용신을 애정·재물·성공 각 영역의 실제 행동으로 옮깁니다. 해석이 맞든 아니든 손해 보지 않는 습관과 선택만 제안합니다.', core: true },
          { title: '시기의 길', text: '좋은 해에는 시작하고 전환하며, 점검이 필요한 해에는 멈추고 정리합니다. 연도별 가이드와 이어집니다.', core: false },
        ] },
      { id: 'roots', type: 'pillars', show: true, eyebrow: '이야기의 뿌리', title: '화려한 연출 아래, 단단한 근거', lead: '장면은 판타지지만, 이야기의 재료는 만트라 만세력 엔진이 계산한 내 원국입니다.',
        items: [
          { title: '원국에 근거한 문장', text: '일간·일주·십성·대운 같은 변수 조건에 맞는 내용만 이야기에 들어갑니다.' },
          { title: '모순 없는 해석', text: '장마다 기준 학파를 하나로 고정해, 한 편 안에서 반대되는 말이 나오지 않게 검수합니다.' },
          { title: '같은 입력, 같은 이야기', text: '같은 생년월일시·성별·출생지·학파라면 같은 이야기를 다시 만날 수 있습니다.' },
        ] },
      { id: 'products', type: 'prices', show: true, eyebrow: '상품 구성', title: '두 가지로 준비하고 있습니다', note: '구성과 가격은 출시 전에 확정하며, 알림을 신청하신 분께 먼저 안내합니다.',
        items: [
          { badge: '핵심 상품', title: '사주 무빙툰', bullets: '내 일주가 주인공이 되는 동양 판타지 무빙툰\n인연·재물·도약의 장과 앞으로 십 년의 문\n이야기 끝의 개운 가이드', amt: '가격 미정', main: true },
          { badge: '글로 읽는 풀이', title: '종합 사주 리포트', bullets: '9개 장 전체를 글로 정리\n연도별 가이드, 개운 종합 카드', amt: '가격 미정', main: false },
        ] },
      { id: 'faq', type: 'faq', show: true, eyebrow: '자주 묻는 질문', title: '미리 알려 드립니다',
        items: [
          { q: '무빙툰은 영상인가요, 웹툰인가요?', a: '세로 스크롤 웹툰 위에 움직임을 얹은 형식입니다. 스크롤에 맞춰 장면이 열리고 그림이 움직입니다. 구체적인 제공 방식은 출시 전에 안내합니다.' },
          { q: '내 사주가 정말 이야기에 반영되나요?', a: '이야기의 재료는 만세력 엔진이 계산한 원국(일주, 오행, 십성, 대운)입니다. 장면과 문장은 그 변수에 맞춰 구성됩니다.' },
          { q: '같은 정보를 넣으면 늘 같은 이야기인가요?', a: '같은 입력에는 같은 이야기를 다시 보여 드리는 것을 원칙으로 합니다.' },
          { q: '무엇을 입력해야 하나요?', a: '생년월일시, 성별, 출생지와 해석 기준이 필요합니다. 출생 시각을 정확히 알수록 시주 관련 장면이 정확해집니다.' },
          { q: '이 이야기로 중요한 결정을 해도 되나요?', a: '참고와 오락을 위한 콘텐츠입니다. 수명·질병·이혼·사고 같은 단정적 예측이나 투자·의료·법률 판단은 담지 않습니다. 중요한 결정은 전문가와 상의해 주세요.' },
        ] },
      { id: 'notify', type: 'notify', show: true, eyebrow: '문이 열리는 날', title: '출시되면 가장 먼저\n알려 드릴게요', button: '알림 신청',
        consent: '출시 안내 발송을 위해 이메일 주소를 수집·이용하는 데 동의합니다. 수집 항목은 이메일 주소뿐이며, 안내 발송 목적으로만 쓰고 요청하시면 삭제합니다.',
        done: '신청되었습니다. 문이 열리면 안내 메일을 보내 드릴게요.' },
    ],
    footer: { lines: '본 콘텐츠는 참고·오락 목적의 해석이며, 결과에 대한 의사결정과 책임은 이용자 본인에게 있습니다.\n© 만트라 스튜디오' },
  };

  // ── 글자 서식 → 인라인 스타일
  function styleOf(st, force) {
    var c = [], k = 1;
    if (!st) return { css: '', k: 1, dx: 0, dy: 0 };
    if (+st.sz > 0) k = Math.max(0.2, Math.min(5, +st.sz / 100));
    var F = fonts();
    if (st.font && F[st.font]) c.push('font-family:' + F[st.font]);
    if (k !== 1 || force) c.push('zoom:' + k);
    if (+st.wt) c.push('font-weight:' + (+st.wt));
    if (hex(st.color)) c.push('color:' + st.color);
    if (/^(left|center|right)$/.test(st.align || '')) c.push('text-align:' + st.align);
    if (st.ls !== undefined && st.ls !== null && st.ls !== '' && isFinite(+st.ls)) c.push('letter-spacing:' + (+st.ls / 100) + 'em');
    if (+st.lh) c.push('line-height:' + (+st.lh / 100));
    if (st.op !== undefined && st.op !== null && st.op !== '' && isFinite(+st.op)) c.push('opacity:' + (+st.op / 100));
    if (st.it) c.push('font-style:italic');
    var dx = num(st.dx, 0), dy = num(st.dy, 0);
    if (dx || dy || force) c.push('position:relative;left:' + (dx / k) + 'px;top:' + (dy / k) + 'px'); // zoom이 길이도 키우므로 나눠서 실제 px로 맞춘다
    return { css: c.join(';'), k: k, dx: dx, dy: dy };
  }
  // 기기별 값: st(또는 장식 이미지 객체)의 ow(웹, 화면 폭 769px 이상)·om(모바일, 768px 이하)이 공통 값 위에 덮어쓴다.
  // 공통 값은 인라인 스타일로, 기기별 값은 @media 규칙(!important)으로 낸다.
  var RULES = [], DEVMEDIA = { ow: '@media (min-width:769px)', om: '@media (max-width:768px)' };
  function merged(o, dev) {
    var r = {}; Object.keys(o).forEach(function (k) { if (k !== 'ow' && k !== 'om') r[k] = o[k]; });
    var ov = o[dev]; if (ov) Object.keys(ov).forEach(function (k) { if (ov[k] !== undefined && ov[k] !== '' && ov[k] !== null) r[k] = ov[k]; });
    return r;
  }
  function important(css) { return css.split(';').filter(Boolean).map(function (x) { return x + ' !important'; }).join(';'); }
  function devRule(path, dev, css) { if (/^[\w\/-]+$/.test(path)) RULES.push(DEVMEDIA[dev] + '{[data-k="' + path + '"]{' + important(css) + '}}'); }
  function attr(path, st) {
    var s = styleOf(st && merged(st, '')), extra = '';
    if (st) {
      extra = ' data-dx="' + s.dx + '" data-dy="' + s.dy + '" data-zk="' + s.k + '"';
      ['ow', 'om'].forEach(function (dev) {
        if (!st[dev] || !Object.keys(st[dev]).length) return;
        var e = styleOf(merged(st, dev), true);
        extra += ' data-' + dev + '-dx="' + e.dx + '" data-' + dev + '-dy="' + e.dy + '" data-' + dev + '-zk="' + e.k + '"';
        devRule(path, dev, e.css);
      });
    }
    return ' data-k="' + esc(path) + '"' + extra + (s.css ? ' style="' + esc(s.css) + '"' : '');
  }
  // obj[field] 글자를 태그로 감싼다. 서식은 obj.st[field]
  function T(tag, cls, P, obj, field, html, extra) {
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + attr(P + '/' + field, obj && obj.st && obj.st[field]) + (extra || '') + '>' + html + '</' + tag + '>';
  }

  // ── 이미지·배경·장식
  function pic(src, mob, cls, style, eager) {
    src = img(src); mob = img(mob); var main = src || mob; if (!main) return '';
    return '<picture>' + (mob && src ? '<source media="(max-width:768px)" srcset="' + esc(mob) + '">' : '') + '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + esc(main) + '" alt=""' + (style ? ' style="' + esc(style) + '"' : '') + (eager ? '' : ' loading="lazy"') + ' decoding="async"></picture>';
  }
  function bgBox(o, base) {
    if (!img(o.bgSrc) && !img(o.bgMobileSrc) && !hex(o.bgColor)) return '';
    var op = num(o.bgOpacity, 100) / 100, dark = num(o.bgDark, 0) / 100, blur = num(o.bgBlur, 0), x = num(o.bgX, 50), y = num(o.bgY, 50), fade = num(o.bgFade, base ? 0 : 12);
    var is = 'object-position:' + x + '% ' + y + '%;opacity:' + op + (blur ? ';filter:blur(' + blur + 'px);transform:scale(1.08)' : '');
    var bs = (hex(o.bgColor) ? 'background:' + o.bgColor + ';' : '') + (fade ? 'mask-image:linear-gradient(transparent,#000 ' + fade + '%,#000 ' + (100 - fade) + '%,transparent);-webkit-mask-image:linear-gradient(transparent,#000 ' + fade + '%,#000 ' + (100 - fade) + '%,transparent)' : '');
    return '<div class="secbg' + (o.bgFixed ? ' fixed' : '') + '" aria-hidden="true"' + (bs ? ' style="' + esc(bs) + '"' : '') + '>' + pic(o.bgSrc, o.bgMobileSrc, '', is, base) + (dark ? '<i style="background:rgba(0,0,0,' + dark + ')"></i>' : '') + '</div>';
  }
  function dcCss(d) {
    return 'left:' + num(d.x, 50) + '%;top:' + num(d.y, 50) + '%;width:' + num(d.w, 30) + '%;transform:translate(-50%,-50%) rotate(' + num(d.rot, 0) + 'deg);opacity:' + num(d.op, 100) / 100;
  }
  function decor(list, P) {
    var h = (list || []).map(function (d, i) {
      var u = img(d.src); if (!u) return '';
      var path = P + '/decor/' + i, st = dcCss(d) + (num(d.blur, 0) ? ';filter:blur(' + num(d.blur, 0) + 'px)' : '') + (/^(screen|multiply|soft-light)$/.test(d.blend || '') ? ';mix-blend-mode:' + d.blend : ''), extra = '';
      ['ow', 'om'].forEach(function (dev) {
        if (!d[dev] || !Object.keys(d[dev]).length) return;
        var e = merged(d, dev); extra += ' data-' + dev + '-x="' + num(e.x, 50) + '" data-' + dev + '-y="' + num(e.y, 50) + '"'; devRule(path, dev, dcCss(e));
      });
      return '<img class="dc ' + (d.layer === 'front' ? 'f' : 'b') + '" data-k="' + esc(path) + '"' + extra + ' src="' + esc(u) + '" alt="" style="' + esc(st) + '"' + (P === 'hero' ? '' : ' loading="lazy"') + ' draggable="false">';
    }).join('');
    return h ? '<div class="decor" aria-hidden="true">' + h + '</div>' : '';
  }

  // ── 장면 그림 (SVG). 색은 은은하게 낮춘 동양 판타지 팔레트
  function art(kind, n) {
    var d = '<svg viewBox="0 0 400 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
    if (kind === 'five') {
      d += '<rect width="400" height="360" fill="#0C1020"/><g class="orbit" style="transform-origin:200px 140px">' +
        '<circle cx="200" cy="40" r="13" fill="#5E9E78" opacity=".85"/><circle cx="295" cy="108" r="13" fill="#C0594A" opacity=".85"/><circle cx="259" cy="220" r="13" fill="#CFAE62" opacity=".85"/>' +
        '<circle cx="141" cy="220" r="13" fill="#CFCFC8" opacity=".85"/><circle cx="105" cy="108" r="13" fill="#5A7CC0" opacity=".85"/><circle cx="200" cy="140" r="100" fill="none" stroke="#CDB27A" stroke-opacity=".18"/></g>' +
        '<circle cx="200" cy="140" r="24" fill="#CDB27A" opacity=".28" class="float"/>';
    } else if (kind === 'road') {
      d += '<rect width="400" height="360" fill="#0A0E1C"/><path d="M0 300 C60 250 100 270 150 250 C210 225 250 200 320 245 C360 268 380 240 400 232 L400 360 L0 360Z" fill="#131830"/>' +
        '<path d="M0 330 C80 305 140 320 220 290 C300 262 360 285 400 270 L400 360 L0 360Z" fill="#0C1022"/>' +
        '<path class="pathline" d="M30 335 C120 305 90 245 180 225 S300 205 340 125 S360 75 370 55" fill="none" stroke="#CDB27A" stroke-width="2" stroke-linecap="round" stroke-dasharray="600"/>' +
        '<g class="float"><circle cx="180" cy="225" r="5" fill="#CDB27A"/><circle cx="340" cy="125" r="5" fill="#7FB5A5"/><circle cx="370" cy="55" r="6" fill="#B5432F"/></g>';
    } else if (kind === 'gate') {
      d += '<rect width="400" height="360" fill="#0B0D1B"/><g class="gate-open"><path d="M135 285 V145 H265 V285" fill="none" stroke="#B5432F" stroke-width="9"/>' +
        '<path d="M112 145 H288" stroke="#B5432F" stroke-width="11" stroke-linecap="round"/><path d="M122 124 H278" stroke="#B5432F" stroke-width="6" stroke-linecap="round"/>' +
        '<rect x="152" y="155" width="96" height="130" fill="#CDB27A" opacity=".12"/></g><rect x="0" y="285" width="400" height="75" fill="#06070D"/>';
    } else {
      d += '<defs><radialGradient id="ag' + esc(n) + '" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#383064"/><stop offset="1" stop-color="#0B0D18"/></radialGradient></defs><rect width="400" height="360" fill="url(#ag' + esc(n) + ')"/>' +
        '<g class="orbit" style="transform-origin:200px 150px"><circle cx="200" cy="150" r="110" fill="none" stroke="#CDB27A" stroke-opacity=".22" stroke-dasharray="3 8"/><circle cx="310" cy="150" r="4" fill="#CDB27A"/></g>' +
        '<g class="orbit rev" style="transform-origin:200px 150px"><circle cx="200" cy="150" r="80" fill="none" stroke="#7FB5A5" stroke-opacity=".22" stroke-dasharray="2 7"/><circle cx="120" cy="150" r="3.5" fill="#7FB5A5"/></g>';
    }
    return d + '</svg>';
  }

  function head(s, P) {
    return '<div class="head rv">' + (s.eyebrow ? T('div', 'eyebrow', P, s, 'eyebrow', fmt(s.eyebrow)) : '') + (s.title ? T('h2', '', P, s, 'title', fmt(s.title)) : '') + (s.lead ? T('p', 'lead', P, s, 'lead', fmt(s.lead)) : '') + '</div>';
  }
  var R = {
    intro: function (s, P) { return '<div class="wrap">' + head(s, P) + '</div>'; },
    preview: function (s, P) {
      var h = '<div class="head rv">' + (s.eyebrow ? T('div', 'eyebrow', P, s, 'eyebrow', fmt(s.eyebrow)) : '') + (s.title ? T('h2', '', P, s, 'title', fmt(s.title)) : '') +
        (s.badge ? T('span', 'badge', P, s, 'badge', fmt(s.badge)) : '') + (s.note ? T('p', 'note', P, s, 'note', fmt(s.note)) : '') + '</div>';
      var panels = (s.items || []).map(function (p, i) {
        var Q = P + '/items/' + i, bg = img(p.bgSrc);
        return '<div class="panel rv"><div class="art">' + (bg ? pic(bg, '', 'cover') : art(p.art, s.id + i)) + '</div>' + (p.sfx ? T('span', 'sfx', Q, p, 'sfx', fmt(p.sfx), ' aria-hidden="true"') : '') +
          (p.glyph ? '<div class="glyphwrap">' + T('div', 'glyph', Q, p, 'glyph', fmt(p.glyph), ' aria-hidden="true"') + '</div>' : '') +
          T('p', 'cap', Q, p, 'text', fmt(p.text) + (p.small ? T('small', '', Q, p, 'small', fmt(p.small)) : '')) + '</div>';
      }).join('');
      return '<div class="wrap">' + h + '<div class="toon">' + panels + '</div></div>';
    },
    episodes: function (s, P) {
      return '<div class="wrap">' + head(s, P) + '<ol class="eps rv">' + (s.items || []).map(function (e, i) {
        var Q = P + '/items/' + i;
        return '<li' + (e.hi ? ' class="hi"' : '') + '>' + T('span', 'no', Q, e, 'no', fmt(e.no)) + '<div>' + T('b', '', Q, e, 'title', fmt(e.title)) + T('span', '', Q, e, 'desc', fmt(e.desc)) + '</div></li>';
      }).join('') + '</ol>' + (s.note ? T('p', 'note ctr rv', P, s, 'note', fmt(s.note)) : '') + '</div>';
    },
    paths: function (s, P) {
      return '<div class="wrap">' + head(s, P) + '<div class="paths rv">' + (s.items || []).map(function (p, i) {
        var Q = P + '/items/' + i;
        return '<div class="path' + (p.core ? ' core' : '') + '">' + T('h3', '', Q, p, 'title', fmt(p.title)) + T('p', '', Q, p, 'text', fmt(p.text)) + '</div>';
      }).join('') + '</div></div>';
    },
    pillars: function (s, P) {
      return '<div class="wrap">' + head(s, P) + '<div class="pillars rv">' + (s.items || []).map(function (p, i) {
        var Q = P + '/items/' + i;
        return '<div>' + T('b', '', Q, p, 'title', fmt(p.title)) + T('p', '', Q, p, 'text', fmt(p.text)) + '</div>';
      }).join('') + '</div></div>';
    },
    prices: function (s, P) {
      return '<div class="wrap">' + head(s, P) + '<div class="prices rv">' + (s.items || []).map(function (p, i) {
        var Q = P + '/items/' + i;
        return '<div class="price' + (p.main ? ' main' : '') + '">' + (p.badge ? T('span', 'badge', Q, p, 'badge', fmt(p.badge)) : '') + T('h3', '', Q, p, 'title', fmt(p.title)) +
          T('ul', '', Q, p, 'bullets', lines(p.bullets).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('')) + (p.amt ? T('div', 'amt', Q, p, 'amt', fmt(p.amt)) : '') + '</div>';
      }).join('') + '</div>' + (s.note ? T('p', 'note ctr rv', P, s, 'note', fmt(s.note)) : '') + '</div>';
    },
    faq: function (s, P) {
      return '<div class="wrap">' + head(s, P) + '<div class="faq rv">' + (s.items || []).map(function (q, i) {
        var Q = P + '/items/' + i;
        return '<details>' + T('summary', '', Q, q, 'q', fmt(q.q)) + T('p', '', Q, q, 'a', fmt(q.a)) + '</details>';
      }).join('') + '</div></div>';
    },
    notify: function (s, P) {
      return '<div class="wrap">' + head(s, P) + '<div class="gate rv"><form class="signup" id="signup" novalidate data-done="' + esc(s.done) + '">' +
        '<div class="field"><input type="email" name="email" id="email" placeholder="이메일 주소" autocomplete="email" required aria-label="이메일 주소" maxlength="254">' +
        T('button', 'btn', P, s, 'button', fmt(s.button || '알림 신청'), ' type="submit" id="submitBtn"') + '</div>' +
        '<div class="hp" aria-hidden="true"><label>웹사이트<input type="text" name="website" id="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<label class="consent"><input type="checkbox" id="consent">' + T('span', '', P, s, 'consent', fmt(s.consent)) + '</label>' +
        '<p class="msg" id="msg" role="status" aria-live="polite"></p></form></div></div>';
    },
    image: function (s, P) {
      var w = Math.max(10, Math.min(100, num(s.width, 100))), ratio = /^\d+\/\d+$/.test(s.ratio || '') ? s.ratio : '', r = num(s.radius, 3);
      var inner = '<figure class="imgblk rv' + (s.frame ? ' frm' : '') + '" style="width:' + w + '%;border-radius:' + r + 'px"><div class="imgbox" style="' + (ratio ? 'aspect-ratio:' + ratio + ';' : '') + 'border-radius:' + r + 'px">' +
        pic(s.src, s.mobileSrc, 'ib', 'object-fit:' + (s.fit === 'contain' ? 'contain' : 'cover')) + '</div>' + (s.caption ? T('figcaption', '', P, s, 'caption', fmt(s.caption)) : '') + '</figure>';
      if (String(s.href || '').trim()) inner = '<a class="imglink" href="' + esc(href(s.href)) + '">' + inner + '</a>';
      return s.full ? '<div class="imgfull">' + inner + '</div>' : '<div class="wrap">' + inner + '</div>';
    },
    spacer: function (s) { return '<div style="height:' + Math.max(0, Math.min(800, num(s.h, 80))) + 'px"></div>'; },
    divider: function (s) { return '<div class="wrap rv"><i class="dv ' + (/^(line|dots)$/.test(s.style || '') ? s.style : 'diamond') + '"></i></div>'; },
  };

  // els: { top, hero, heroBox, heroBg, secs, foot } (각각 내용을 채울 요소). cfg는 DEFAULTS와 같은 모양.
  function render(cfg, els) {
    RULES = [];
    var b = cfg.brand || {}, h = cfg.hero || {};
    els.top.innerHTML = '<div class="wrap"><a class="brand" href="/report/"><span class="seal"' + attr('brand/seal', b.st && b.st.seal) + '>' + fmt(b.seal) + '</span><span class="bn">' +
      T('span', '', 'brand', b, 'name', fmt(b.name)) + (b.sub ? T('small', '', 'brand', b, 'sub', fmt(b.sub)) : '') + '</span></a>' +
      (b.backLabel ? T('a', 'back', 'brand', b, 'backLabel', fmt(b.backLabel), ' href="' + esc(href(b.backHref)) + '"') : '') + '</div>';
    els.hero.innerHTML = '<div class="hero-in">' + (h.kicker ? T('div', 'kicker', 'hero', h, 'kicker', fmt(h.kicker)) : '') + T('h1', '', 'hero', h, 'title', fmt(h.title)) + (h.lead ? T('p', 'lead', 'hero', h, 'lead', fmt(h.lead)) : '') +
      '<div class="cta-row">' + (h.cta1Label ? T('a', 'btn', 'hero', h, 'cta1Label', fmt(h.cta1Label), ' href="' + esc(href(h.cta1Href)) + '"') : '') +
      (h.cta2Label ? T('a', 'btn ghost', 'hero', h, 'cta2Label', fmt(h.cta2Label), ' href="' + esc(href(h.cta2Href)) + '"') : '') + '</div>' +
      (h.hint ? '<div class="scroll-hint"><i></i>' + T('span', '', 'hero', h, 'hint', fmt(h.hint)) + '</div>' : '') + '</div>' +
      (h.vertical ? T('div', 'hanja-v', 'hero', h, 'vertical', fmt(h.vertical), ' aria-hidden="true"') : '') + decor(h.decor, 'hero');
    if (els.heroBox) {
      els.heroBox.style.minHeight = Math.max(40, Math.min(100, num(h.h, 100))) + 'svh';
      els.heroBox.dataset.art = /^(stars|none)$/.test(h.art || '') ? h.art : 'all';
    }
    if (els.heroBg) els.heroBg.innerHTML = bgBox(h, true);
    els.secs.innerHTML = (cfg.sections || []).filter(function (s) { return s && s.show !== false && R[s.type]; }).map(function (s) {
      var pad = (num(s.padTop, null) !== null ? 'padding-top:' + num(s.padTop, 0) + 'px;' : '') + (num(s.padBot, null) !== null ? 'padding-bottom:' + num(s.padBot, 0) + 'px' : '');
      return '<section class="sec t-' + esc(s.type) + '" id="' + esc(s.id) + '"' + (pad ? ' style="' + pad + '"' : '') + '>' + bgBox(s, false) + decor(s.decor, s.id) + R[s.type](s, s.id) + '</section>';
    }).join('');
    var f = cfg.footer || {};
    if (els.dev) els.dev.textContent = '';
    els.foot.innerHTML = '<div class="wrap"><i class="orn" aria-hidden="true"></i>' + lines(f.lines).map(function (l) { return T('p', '', 'footer', f, 'lines', fmt(l)); }).join('') + '</div>';
    if (els.dev) els.dev.textContent = RULES.join(' ');
  }

  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  var API = { DEFAULTS: DEFAULTS, TYPES: TYPES, BRAND: BRAND, HERO: HERO, HERO_BG: HERO_BG, BG: BG, PAD: PAD, DECOR: DECOR, FOOT: FOOT, render: render, copy: copy, esc: esc, fmt: fmt };
  if (typeof window !== 'undefined') window.MantraHome = API;
})();
