// 스토리 페이지 편집 양식 정의 — 관리자 "스토리" 탭이 읽어서 입력 칸을 만든다. (content.js 의 블록 구조와 같은 이름을 쓴다)
//   칸 하나 = [키, 이름, 종류, 옵션]
//   종류: t 한 줄 · l 여러 줄 · b 체크 · s 선택(옵션 [[값,이름],…]) · n 숫자(옵션 [최소,최대,간격]) · i 이미지 · v 영상 · ls 한 줄에 하나씩 목록
//         o 묶음(옵션 = 칸 목록) · L 항목 목록(옵션 {fields, blank, title}) · A 버튼 동작
(function (root) {
  'use strict';
  var ANIM = [['', '기본 (아래에서 부드럽게)'], ['fade', '서서히'], ['scale', '살짝 확대'], ['reveal', '이미지가 열리듯'], ['lines', '줄마다 차례로'], ['none', '효과 없음']];
  var ALIGN = [['', '가운데'], ['left', '왼쪽']];
  var REQ = [['', '항상 보임'], ['chart', '사주 분석을 마친 뒤'], ['flowOpen', '"올해의 흐름 확인"을 누른 뒤']];
  var WIDTH = [['', '보통'], ['narrow', '좁게'], ['normal', '보통'], ['wide', '넓게']];
  var RATIO = [['', '자동'], ['1/1', '정사각 1:1'], ['4/5', '세로 4:5'], ['9/16', '세로 9:16'], ['16/9', '가로 16:9'], ['16/10', '가로 16:10'], ['3/4', '세로 3:4']];

  // 모든 블록에 붙는 고급 옵션
  var COMMON = [
    ['requires', '언제 보이나', 's', REQ], ['anim', '등장 효과', 's', ANIM], ['align', '글자 정렬', 's', ALIGN],
    ['id', '이름표(영문, 다른 블록에서 이동할 때 사용)', 't'], ['track', '보일 때 기록할 분석 이벤트 이름', 't'], ['todo', '개발 메모(방문자에게 안 보임)', 't'],
  ];
  var IMG = [['src', '이미지', 'i'], ['srcMobile', '모바일용 이미지 (선택)', 'i'], ['alt', '이미지 설명(필수)', 't'], ['caption', '캡션', 't']];

  var TYPES = {
    headline: { label: '큰 문장', fields: [['title', '문장', 'l'], ['kicker', '위 작은 글씨', 't'], ['subtitle', '아래 설명', 'l'], ['size', '크기', 's', [['xl', '아주 크게'], ['l', '크게'], ['m', '보통']]], ['fullscreen', '한 화면 가득', 'b'], ['scrollHint', '아래 스크롤 안내', 'b']], blank: { title: '새 문장', size: 'l' } },
    text: { label: '설명 글', fields: [['title', '제목', 't'], ['subtitle', '부제', 't'], ['body', '본문', 'l'], ['emphasis', '강조 스타일', 'b']], blank: { body: '새 설명 글' } },
    quote: { label: '강조 문구', fields: [['text', '문구', 'l'], ['cite', '출처', 't']], blank: { text: '새 강조 문구' } },
    image: { label: '이미지', fields: IMG.concat([['width', '너비', 's', WIDTH], ['aspectRatio', '비율', 's', RATIO], ['objectFit', '채우기', 's', [['', '꽉 채우기'], ['contain', '잘리지 않게']]]]), blank: { src: '', alt: '', aspectRatio: '4/5' } },
    imageText: { label: '이미지 + 글', fields: [['src', '이미지', 'i'], ['alt', '이미지 설명(필수)', 't'], ['title', '제목', 't'], ['body', '본문', 'l'], ['imagePosition', '이미지 위치', 's', [['left', '왼쪽'], ['right', '오른쪽']]]], blank: { src: '', alt: '', title: '', body: '', imagePosition: 'left' } },
    fullImage: { label: '화면 가득 이미지', fields: IMG.slice(0, 1).concat([['alt', '이미지 설명(필수)', 't'], ['caption', '캡션', 't'], ['height', '높이 (예: 70svh)', 't']]), blank: { src: '', alt: '', height: '70svh' } },
    gallery: { label: '이미지 묶음(2~4장)', fields: [['columns', '한 줄에 몇 장', 'n', [2, 4, 1]], ['aspectRatio', '비율', 's', RATIO], ['items', '이미지', 'L', { fields: [['src', '이미지', 'i'], ['alt', '설명(필수)', 't'], ['caption', '캡션', 't']], blank: { src: '', alt: '' }, title: 'alt', max: 4, label: '이미지' }]], blank: { columns: 2, items: [{ src: '', alt: '' }, { src: '', alt: '' }] } },
    video: { label: '영상', fields: [['src', '영상', 'v'], ['poster', '대표 이미지', 'i'], ['autoplay', '자동 재생(음소거)', 'b'], ['muted', '음소거', 'b'], ['loop', '반복', 'b'], ['aspectRatio', '비율', 's', RATIO], ['width', '너비', 's', WIDTH], ['caption', '캡션', 't']], blank: { src: '', poster: '', autoplay: true, muted: true, loop: true, aspectRatio: '9/16' } },
    chain: { label: '흐름 도식 (A × B ↓ 결과)', fields: [['title', '위 작은 글씨', 't'], ['items', '항목 (한 줄에 하나)', 'ls'], ['direction', '방향', 's', [['row', '가로 ×'], ['down', '세로 ↓']]], ['result', '결과 (선택)', 't']], blank: { items: ['항목 1', '항목 2'], direction: 'row' } },
    compare: { label: '비교', fields: [['left', '왼쪽', 'o', [['label', '이름', 't'], ['items', '항목 (한 줄에 하나)', 'ls']]], ['right', '오른쪽 (강조)', 'o', [['label', '이름', 't'], ['items', '항목 (한 줄에 하나)', 'ls'], ['highlight', '금빛 강조', 'b']]]], blank: { left: { label: '기존', items: ['A'] }, right: { label: '만트라', items: ['B'], highlight: true } } },
    stickySteps: { label: '고정 이미지 + 글 단계', fields: [['steps', '단계', 'L', { fields: [['title', '제목', 't'], ['text', '글', 'l'], ['src', '이미지', 'i'], ['alt', '이미지 설명(필수)', 't']], blank: { title: '새 단계', text: '', src: '', alt: '' }, title: 'title', label: '단계' }]], blank: { steps: [{ title: '1', text: '', src: '', alt: '' }, { title: '2', text: '', src: '', alt: '' }] } },
    interest: { label: '관심사 선택 카드', fields: [['title', '질문', 'l'], ['hint', '안내', 't']], blank: { title: '지금 가장 궁금한 것은?', hint: '' } },
    spacer: { label: '여백', fields: [['size', '크기', 's', [['small', '작게'], ['medium', '보통'], ['large', '크게'], ['viewport', '한 화면']]]], blank: { size: 'medium' } },
    divider: { label: '구분선', fields: [], blank: {} },
    cta: { label: '버튼', fields: [['headline', '위 제목', 't'], ['description', '설명', 'l'], ['buttonText', '버튼 글자', 't'], ['action', '누르면', 'A'], ['variant', '모양', 's', [['primary', '금색'], ['ghost', '테두리']]], ['hideAfterAction', '누른 뒤 버튼 숨김', 'b']], blank: { buttonText: '버튼', action: 'flow:open', variant: 'primary' } },
    component: { label: '기능 (사주 입력·결과·흐름·잠금·구매)', fields: [], blank: null },
  };
  // 기능 블록 안의 문구
  var COMPONENT_FIELDS = {
    SajuInput: [['title', '제목', 'l'], ['hint', '안내 문구', 't'], ['ctaText', '버튼 글자', 't']],
    Paywall: [['ctaText', '구매 버튼 글자', 't']],
    FreeResult: [], FlowPreview: [], LockedContent: [],
  };
  var COMPONENT_NAMES = { SajuInput: '사주 입력', FreeResult: '무료 결과', FlowPreview: '올해 운 흐름', LockedContent: '잠긴 콘텐츠 목록', Paywall: '구매' };

  // 기능 블록들이 쓰는 문구 묶음 (화면 이름, content.js 최상위 키, 칸)
  var GROUPS = [
    ['page', '페이지 기본', 'settings', [['brandName', '위쪽 가운데 이름', 't'], ['pageTitle', '브라우저 탭 제목', 't'], ['pageDesc', '검색·공유 설명', 'l'], ['priceText', '가격 표시 (비우면 표시 안 함)', 't'],
      ['skipLink', '오른쪽 위 바로가기', 'o', [['text', '글자', 't']]], ['purchase', '구매 버튼 동작', 'o', [['mode', '방식', 's', [['waitlist', '출시 알림(이메일) 받기'], ['link', '결제 페이지로 이동']]], ['href', '결제 페이지 주소(/ 또는 https://)', 't']]],
      ['hideEmptyMediaInProduction', '이미지·영상이 없는 블록은 숨기기', 'b']]],
    ['interest', '관심사 선택지', 'interests', null],
    ['result', '무료 결과 화면', 'result', [['title', '제목 ({name}=이름)', 't'], ['titleNoName', '이름이 없을 때 제목', 't'], ['subject', '주어 ({name}=이름)', 't'], ['subjectNoName', '이름이 없을 때 주어', 't'],
      ['elementTrait', '일간 오행별 한 줄', 'o', [['목', '목', 't'], ['화', '화', 't'], ['토', '토', 't'], ['금', '금', 't'], ['수', '수', 't']]],
      ['zoneTrait', '신강약별 한 줄', 'o', [['신강', '신강', 'l'], ['신약', '신약', 'l'], ['중화', '중화', 'l']]],
      ['image', '결과 아래 이미지', 'o', [['src', '이미지', 'i'], ['alt', '설명', 't']]], ['interestLine', '관심사 문장 ({interest})', 't'], ['flowHint', '마지막 문장', 't']]],
    ['flow', '운 흐름 화면', 'flow', [['title', '제목', 't'], ['lead', '설명', 'l'], ['nowLabel', '"지금" 표시', 't'], ['lockedNote', '아래 잠금 안내', 'l']]],
    ['locked', '잠금 목록', 'locked', [['title', '제목', 't'], ['pickedBadge', '관심사 표시 글자', 't'],
      ['free', '무료 항목', 'L', { fields: [['label', '이름', 't'], ['note', '설명', 't']], blank: { label: '새 항목', note: '' }, title: 'label', label: '항목' }],
      ['locked', '잠긴 항목', 'L', { fields: [['label', '이름', 't'], ['note', '설명', 't'], ['key', '관심사 연결 (money/career/love/life/self)', 't']], blank: { label: '새 항목' }, title: 'label', label: '항목' }]]],
    ['purchase', '구매 화면', 'purchase', [['title', '제목', 'l'], ['includes', '포함 내용 (한 줄에 하나)', 'ls'], ['interestLine', '관심사 문장 ({interest})', 't'],
      ['waitlistTitle', '알림 신청 제목', 't'], ['waitlistText', '알림 신청 설명', 'l'], ['consent', '동의 문구', 't'], ['done', '완료 문구', 't']]],
  ];
  var INTEREST_FIELDS = { fields: [['key', '기록 이름(영문)', 't'], ['label', '카드 글자', 't'], ['icon', '큰 글자', 't'], ['text', '문장에 쓸 말', 't']], blank: { key: 'new', label: '새 항목', icon: '', text: '' }, title: 'label', label: '카드', max: 8 };

  root.StorySchema = { TYPES: TYPES, COMMON: COMMON, COMPONENT_FIELDS: COMPONENT_FIELDS, COMPONENT_NAMES: COMPONENT_NAMES, GROUPS: GROUPS, INTEREST_FIELDS: INTEREST_FIELDS };
})(typeof window !== 'undefined' ? window : globalThis);
