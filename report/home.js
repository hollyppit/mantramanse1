// 판매 페이지(/report/) 홈 화면 내용: 기본 문구(DEFAULTS), 관리자 편집 양식(TYPES), 화면 그리기(render).
// 판매 페이지와 관리자 미리보기가 같은 코드를 쓴다. 저장된 설정은 /api/home (GLOSSARY_KV 'home:config').
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // 줄바꿈은 <br>, *별표*로 감싼 글자는 금빛 강조
  function fmt(s) { return esc(s).replace(/\n/g, '<br>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>'); }
  function lines(s) { return String(s || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function href(h) { h = String(h || '').trim(); return /^(#[\w-]*|\/[^\s]*|https:\/\/[^\s]+|mailto:[^\s]+)$/.test(h) ? h : '#'; }

  // ── 편집 양식. t: t=한 줄, l=여러 줄, b=체크, s=선택(o: [[값,이름]...])
  var ART = [['awaken', '각성 (돌아가는 기운의 고리)'], ['five', '오행 (다섯 빛깔의 구슬)'], ['road', '길 (산과 이어지는 길)'], ['gate', '문 (붉은 문)']];
  var TYPES = {
    intro: { label: '소개 문단', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l'], ['lead', '본문', 'l']] },
    preview: { label: '장면 미리보기', fields: [['eyebrow', '작은 제목', 't'], ['title', '제목', 'l'], ['badge', '배지', 't'], ['note', '안내 문구', 'l']],
      list: { k: 'items', label: '장면', title: 'text', fields: [['art', '그림', 's', ART], ['glyph', '큰 글자 (선택)', 't'], ['sfx', '세로 효과음 글자', 't'], ['text', '대사·문장', 'l'], ['small', '작은 설명', 't']], blank: { art: 'awaken', glyph: '', sfx: '', text: '새 장면', small: '' } } },
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
  };
  var BRAND = [['name', '브랜드 이름', 't'], ['sub', '부제', 't'], ['seal', '붉은 낙관 글자 (1~2자)', 't'], ['siteTitle', '브라우저 탭 제목', 't'], ['desc', '검색·공유 설명', 'l'], ['backLabel', '상단 오른쪽 링크 글자 (비우면 숨김)', 't'], ['backHref', '그 링크 주소', 't']];
  var HERO = [['kicker', '위쪽 한자 문구', 't'], ['title', '큰 제목', 'l'], ['lead', '설명', 'l'], ['cta1Label', '첫 번째 버튼 글자', 't'], ['cta1Href', '첫 번째 버튼 이동 (#notify 등)', 't'], ['cta2Label', '두 번째 버튼 글자 (비우면 숨김)', 't'], ['cta2Href', '두 번째 버튼 이동', 't'], ['vertical', '왼쪽 세로 한자', 't'], ['hint', '아래 스크롤 안내 글자', 't']];
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
      d += '<defs><radialGradient id="ag' + n + '" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#383064"/><stop offset="1" stop-color="#0B0D18"/></radialGradient></defs><rect width="400" height="360" fill="url(#ag' + n + ')"/>' +
        '<g class="orbit" style="transform-origin:200px 150px"><circle cx="200" cy="150" r="110" fill="none" stroke="#CDB27A" stroke-opacity=".22" stroke-dasharray="3 8"/><circle cx="310" cy="150" r="4" fill="#CDB27A"/></g>' +
        '<g class="orbit rev" style="transform-origin:200px 150px"><circle cx="200" cy="150" r="80" fill="none" stroke="#7FB5A5" stroke-opacity=".22" stroke-dasharray="2 7"/><circle cx="120" cy="150" r="3.5" fill="#7FB5A5"/></g>';
    }
    return d + '</svg>';
  }

  function head(s) {
    return '<div class="head rv">' + (s.eyebrow ? '<div class="eyebrow">' + esc(s.eyebrow) + '</div>' : '') + (s.title ? '<h2>' + fmt(s.title) + '</h2>' : '') + (s.lead ? '<p class="lead">' + fmt(s.lead) + '</p>' : '') + '</div>';
  }
  var R = {
    intro: function (s) { return '<div class="wrap">' + head(s) + '</div>'; },
    preview: function (s) {
      var h = '<div class="head rv">' + (s.eyebrow ? '<div class="eyebrow">' + esc(s.eyebrow) + '</div>' : '') + (s.title ? '<h2>' + fmt(s.title) + '</h2>' : '') +
        (s.badge ? '<span class="badge">' + esc(s.badge) + '</span>' : '') + (s.note ? '<p class="note">' + fmt(s.note) + '</p>' : '') + '</div>';
      var panels = (s.items || []).map(function (p, i) {
        return '<div class="panel rv"><div class="art">' + art(p.art, s.id + i) + '</div>' + (p.sfx ? '<span class="sfx" aria-hidden="true">' + esc(p.sfx) + '</span>' : '') +
          (p.glyph ? '<div class="glyphwrap"><div class="glyph" aria-hidden="true">' + esc(p.glyph) + '</div></div>' : '') +
          '<p class="cap">' + fmt(p.text) + (p.small ? '<small>' + esc(p.small) + '</small>' : '') + '</p></div>';
      }).join('');
      return '<div class="wrap">' + h + '<div class="toon">' + panels + '</div></div>';
    },
    episodes: function (s) {
      return '<div class="wrap">' + head(s) + '<ol class="eps rv">' + (s.items || []).map(function (e) {
        return '<li' + (e.hi ? ' class="hi"' : '') + '><span class="no">' + esc(e.no) + '</span><div><b>' + esc(e.title) + '</b><span>' + fmt(e.desc) + '</span></div></li>';
      }).join('') + '</ol>' + (s.note ? '<p class="note ctr rv">' + fmt(s.note) + '</p>' : '') + '</div>';
    },
    paths: function (s) {
      return '<div class="wrap">' + head(s) + '<div class="paths rv">' + (s.items || []).map(function (p) {
        return '<div class="path' + (p.core ? ' core' : '') + '"><h3>' + esc(p.title) + '</h3><p>' + fmt(p.text) + '</p></div>';
      }).join('') + '</div></div>';
    },
    pillars: function (s) {
      return '<div class="wrap">' + head(s) + '<div class="pillars rv">' + (s.items || []).map(function (p) {
        return '<div><b>' + esc(p.title) + '</b><p>' + fmt(p.text) + '</p></div>';
      }).join('') + '</div></div>';
    },
    prices: function (s) {
      return '<div class="wrap">' + head(s) + '<div class="prices rv">' + (s.items || []).map(function (p) {
        return '<div class="price' + (p.main ? ' main' : '') + '">' + (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '') + '<h3>' + esc(p.title) + '</h3>' +
          '<ul>' + lines(p.bullets).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' + (p.amt ? '<div class="amt">' + esc(p.amt) + '</div>' : '') + '</div>';
      }).join('') + '</div>' + (s.note ? '<p class="note ctr rv">' + fmt(s.note) + '</p>' : '') + '</div>';
    },
    faq: function (s) {
      return '<div class="wrap">' + head(s) + '<div class="faq rv">' + (s.items || []).map(function (q) {
        return '<details><summary>' + esc(q.q) + '</summary><p>' + fmt(q.a) + '</p></details>';
      }).join('') + '</div></div>';
    },
    notify: function (s) {
      return '<div class="wrap">' + head(s) + '<div class="gate rv"><form class="signup" id="signup" novalidate data-done="' + esc(s.done) + '">' +
        '<div class="field"><input type="email" name="email" id="email" placeholder="이메일 주소" autocomplete="email" required aria-label="이메일 주소" maxlength="254">' +
        '<button class="btn" type="submit" id="submitBtn">' + esc(s.button || '알림 신청') + '</button></div>' +
        '<div class="hp" aria-hidden="true"><label>웹사이트<input type="text" name="website" id="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<label class="consent"><input type="checkbox" id="consent"><span>' + fmt(s.consent) + '</span></label>' +
        '<p class="msg" id="msg" role="status" aria-live="polite"></p></form></div></div>';
    },
  };

  // els: { top, hero, secs, foot } (각각 내용을 채울 요소). cfg는 DEFAULTS와 같은 모양.
  function render(cfg, els) {
    var b = cfg.brand || {}, h = cfg.hero || {};
    els.top.innerHTML = '<div class="wrap"><a class="brand" href="/report/"><span class="seal">' + esc(b.seal) + '</span><span class="bn">' + esc(b.name) + (b.sub ? '<small>' + esc(b.sub) + '</small>' : '') + '</span></a>' +
      (b.backLabel ? '<a class="back" href="' + esc(href(b.backHref)) + '">' + esc(b.backLabel) + '</a>' : '') + '</div>';
    els.hero.innerHTML = '<div class="hero-in">' + (h.kicker ? '<div class="kicker">' + esc(h.kicker) + '</div>' : '') + '<h1>' + fmt(h.title) + '</h1>' + (h.lead ? '<p class="lead">' + fmt(h.lead) + '</p>' : '') +
      '<div class="cta-row">' + (h.cta1Label ? '<a class="btn" href="' + esc(href(h.cta1Href)) + '">' + esc(h.cta1Label) + '</a>' : '') +
      (h.cta2Label ? '<a class="btn ghost" href="' + esc(href(h.cta2Href)) + '">' + esc(h.cta2Label) + '</a>' : '') + '</div>' +
      (h.hint ? '<div class="scroll-hint"><i></i>' + esc(h.hint) + '</div>' : '') + '</div>' + (h.vertical ? '<div class="hanja-v" aria-hidden="true">' + esc(h.vertical) + '</div>' : '');
    els.secs.innerHTML = (cfg.sections || []).filter(function (s) { return s && s.show !== false && R[s.type]; }).map(function (s) {
      return '<section class="sec t-' + esc(s.type) + '" id="' + esc(s.id) + '">' + R[s.type](s) + '</section>';
    }).join('');
    els.foot.innerHTML = '<div class="wrap"><i class="orn" aria-hidden="true"></i>' + lines((cfg.footer || {}).lines).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>';
  }

  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  var API = { DEFAULTS: DEFAULTS, TYPES: TYPES, BRAND: BRAND, HERO: HERO, FOOT: FOOT, render: render, copy: copy, esc: esc, fmt: fmt };
  if (typeof window !== 'undefined') window.MantraHome = API;
})();
