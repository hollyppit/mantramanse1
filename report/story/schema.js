// 온보딩 페이지 편집 양식 정의 — 관리자 "스토리" 탭이 읽어서 입력 칸을 만든다. (content.js 의 블록 구조와 같은 이름을 쓴다)
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

  var FONTSEL = [['serif', '명조 (Noto Serif KR)'], ['sans', '고딕 (Noto Sans KR)']];
  var TEXTANIM = [['', '없음'], ['float', '둥실 떠다니기'], ['glow', '은은하게 빛나기'], ['both', '둥실 + 빛나기']];
  var ALIGN3 = [['center', '가운데'], ['left', '왼쪽'], ['right', '오른쪽']];
  var ALIGN3M = [['', 'PC와 같게']].concat(ALIGN3);
  var WEIGHTSEL = [['300', '가늘게'], ['400', '보통'], ['600', '굵게'], ['700', '아주 굵게']];

  // 모든 블록에 붙는 고급 옵션
  var COMMON = [
    ['requires', '언제 보이나', 's', REQ], ['anim', '등장 효과', 's', ANIM], ['align', '글자 정렬', 's', ALIGN],
    ['id', '이름표(영문, 다른 블록에서 이동할 때 사용)', 't'], ['track', '보일 때 기록할 분석 이벤트 이름', 't'], ['todo', '개발 메모(방문자에게 안 보임)', 't'],
  ];
  var IMG = [['src', '이미지', 'i'], ['srcMobile', '모바일용 이미지 (선택)', 'i'], ['alt', '이미지 설명(필수)', 't'], ['caption', '캡션', 't']];

  var TYPES = {
    headline: { label: '큰 문장', fields: [['title', '문장', 'l'], ['kicker', '위 작은 글씨', 't'], ['subtitle', '아래 설명', 'l'], ['size', '크기', 's', [['xl', '아주 크게'], ['l', '크게'], ['m', '보통']]], ['fullscreen', '한 화면 가득', 'b'], ['scrollHint', '아래 스크롤 안내', 'b'], ['startButton', '시작 버튼 글자 (누르면 자동 스크롤 시작 · 비우면 버튼 없음)', 't']], blank: { title: '새 문장', size: 'l' } },
    text: { label: '설명 글', fields: [['title', '제목', 't'], ['subtitle', '부제', 't'], ['body', '본문', 'l'], ['emphasis', '강조 스타일', 'b']], blank: { body: '새 설명 글' } },
    quote: { label: '강조 문구', fields: [['text', '문구', 'l'], ['cite', '출처', 't']], blank: { text: '새 강조 문구' } },
    image: { label: '이미지', fields: IMG.concat([['width', '너비', 's', WIDTH], ['aspectRatio', '비율', 's', RATIO], ['objectFit', '채우기', 's', [['', '꽉 채우기'], ['contain', '잘리지 않게']]]]), blank: { src: '', alt: '', aspectRatio: '4/5' } },
    imageText: { label: '이미지 + 글 (한 화면)', fields: [['title', '문장', 'l'], ['body', '본문(선택)', 'l'], ['mediaType', '그림 자리에 넣을 것', 's', [['', '이미지'], ['video', '영상']]], ['src', '이미지 또는 영상', 'm'], ['poster', '영상 대표 이미지', 'i'], ['alt', '이미지 설명(이미지일 때 필수)', 't'], ['autoplay', '영상 자동 재생(음소거)', 'b'], ['loop', '영상 반복', 'b'], ['aspectRatio', '비율', 's', RATIO], ['imagePosition', '이미지 위치', 's', [['top', '위 (글은 아래)'], ['bottom', '아래 (글은 위)'], ['left', '왼쪽 (큰 화면)'], ['right', '오른쪽 (큰 화면)']]]], blank: { title: '새 문장', src: '', alt: '', aspectRatio: '4/5', imagePosition: 'top' } },
    fullImage: { label: '화면 가득 이미지', fields: IMG.slice(0, 1).concat([['alt', '이미지 설명(필수)', 't'], ['caption', '캡션', 't'], ['height', '높이 (예: 70svh)', 't']]), blank: { src: '', alt: '', height: '70svh' } },
    gallery: { label: '이미지 묶음(2~4장)', fields: [['columns', '한 줄에 몇 장', 'n', [2, 4, 1]], ['aspectRatio', '비율', 's', RATIO], ['items', '이미지', 'L', { fields: [['src', '이미지', 'i'], ['alt', '설명(필수)', 't'], ['caption', '캡션', 't']], blank: { src: '', alt: '' }, title: 'alt', max: 4, label: '이미지' }]], blank: { columns: 2, items: [{ src: '', alt: '' }, { src: '', alt: '' }] } },
    video: { label: '영상', fields: [['src', '영상', 'v'], ['poster', '대표 이미지', 'i'], ['autoplay', '자동 재생(음소거)', 'b'], ['muted', '음소거', 'b'], ['loop', '반복', 'b'], ['aspectRatio', '비율', 's', RATIO], ['width', '너비', 's', WIDTH], ['caption', '캡션', 't']], blank: { src: '', poster: '', autoplay: true, muted: true, loop: true, aspectRatio: '9/16' } },
    chain: { label: '흐름 도식 (A × B ↓ 결과)', fields: [['title', '위 작은 글씨', 't'], ['items', '항목 (한 줄에 하나)', 'ls'], ['direction', '방향', 's', [['row', '가로 ×'], ['down', '세로 ↓']]], ['result', '결과 (선택)', 't']], blank: { items: ['항목 1', '항목 2'], direction: 'row' } },
    compare: { label: '비교', fields: [['left', '왼쪽', 'o', [['label', '이름', 't'], ['items', '항목 (한 줄에 하나)', 'ls']]], ['right', '오른쪽 (강조)', 'o', [['label', '이름', 't'], ['items', '항목 (한 줄에 하나)', 'ls'], ['highlight', '금빛 강조', 'b']]], ['src', '아래에 함께 보일 이미지 (선택)', 'i'], ['alt', '이미지 설명', 't'], ['caption', '이미지 캡션', 't'], ['aspectRatio', '이미지 비율', 's', RATIO], ['body', '아래 글 (선택)', 'l']], blank: { left: { label: '기존', items: ['A'] }, right: { label: '만트라', items: ['B'], highlight: true } } },
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
    ['cover', '인트로 커버 (맨 처음 화면: 등불 이미지·문구)', 'settings', [['cover', '인트로 커버', 'o', [['show', '인트로 표시', 'b'], ['bgSrc', '배경 이미지 (맨 처음에 고정, 스크롤하면 사라짐)', 'i'], ['bgOpacity', '배경 진하기 (0~1)', 'n', [0, 1, 0.05]], ['chars', '캐릭터 이미지 (여러 장 · 미리보기에서 끌어 위치, 오른쪽 위 네모를 끌어 크기 조절 · ↑↓로 앞뒤 순서: 아래 항목이 앞)', 'L', { fields: [['src', '이미지', 'i'], ['front', '등불·글자보다 앞에 놓기 (끄면 뒤)', 'b'], ['x', 'PC 가로 위치 (% · 가운데 기준)', 'n', [-20, 120, 0.5]], ['y', 'PC 아래 여백 (%)', 'n', [-50, 100, 0.5]], ['size', 'PC 크기 (화면 높이의 %)', 'n', [3, 200, 0.5]], ['mobile', '모바일은 따로 설정 (모바일 미리보기에서 끌면 자동으로 켜짐 · 끄면 PC 값 사용)', 'b'], ['mx', '모바일 가로 위치 (%)', 'n', [-20, 120, 0.5]], ['my', '모바일 아래 여백 (%)', 'n', [-50, 100, 0.5]], ['msize', '모바일 크기 (화면 높이의 %)', 'n', [3, 200, 0.5]], ['mhide', '모바일에서는 숨기기', 'b'], ['opacity', '투명도 (0=안 보임 · 1=선명)', 'n', [0, 1, 0.05]], ['flip', '좌우 반전', 'b'], ['float', '둥실 떠 있는 효과', 'b'], ['floatRange', '둥실 폭 (px)', 'n', [0, 80, 1]], ['floatSpeed', '둥실 주기 (초 · 클수록 느림)', 'n', [1, 20, 0.5]], ['tilt', '살짝 기우는 각도 (°)', 'n', [0, 10, 0.5]]], blank: { src: '', front: false, x: 75, y: 0, size: 60, mobile: false, mx: 75, my: 0, msize: 50, mhide: false, opacity: 1, flip: false, float: true, floatRange: 12, floatSpeed: 7, tilt: 0.8 }, title: 'src', max: 8, label: '캐릭터' }], ['src', '중앙 이미지 (신비한 등불)', 'i'], ['alt', '이미지 설명', 't'], ['title', '브랜드명', 't'], ['titleFont', '브랜드명 글꼴', 's', FONTSEL], ['titleWeight', '브랜드명 굵기', 's', WEIGHTSEL], ['titleSize', '브랜드명 글자 크기 (px · PC)', 'n', [8, 80, 1]], ['titleSpacing', '브랜드명 글자 간격 (px)', 'n', [0, 20, 0.5]], ['titleColor', '브랜드명 글자색', 'c'], ['titleAnim', '브랜드명 효과', 's', TEXTANIM], ['sub', '서브 카피', 't'], ['subFont', '서브 카피 글꼴', 's', FONTSEL], ['subSize', '서브 카피 글자 크기 (px · PC)', 'n', [8, 60, 1]], ['subColor', '서브 카피 글자색', 'c'], ['subAnim', '서브 카피 효과', 's', TEXTANIM], ['textAnimSpeed', '글자 효과 주기 (초 · 클수록 느림)', 'n', [1, 20, 0.5]], ['button', '버튼 문구', 't'], ['buttonFont', '버튼 글꼴', 's', FONTSEL], ['buttonSize', '버튼 글자 크기 (px · PC)', 'n', [8, 40, 1]], ['titleAlign', '브랜드명 정렬 (PC)', 's', ALIGN3], ['titleX', '브랜드명 가로 이동 (PC · 화면 너비의 %, 음수=왼쪽 · 미리보기에서 끌기)', 'n', [-60, 60, 0.5]], ['titleY', '브랜드명 세로 이동 (PC · 화면 높이의 %, 음수=위)', 'n', [-60, 60, 0.5]], ['subAlign', '서브 카피 정렬 (PC)', 's', ALIGN3], ['subX', '서브 카피 가로 이동 (PC · 화면 너비의 %, 음수=왼쪽 · 미리보기에서 끌기)', 'n', [-60, 60, 0.5]], ['subY', '서브 카피 세로 이동 (PC · 화면 높이의 %, 음수=위)', 'n', [-60, 60, 0.5]], ['buttonAlign', '버튼 정렬 (PC)', 's', ALIGN3], ['buttonX', '버튼 가로 이동 (PC · 화면 너비의 %, 음수=왼쪽 · 미리보기에서 끌기)', 'n', [-60, 60, 0.5]], ['buttonY', '버튼 세로 이동 (PC · 화면 높이의 %, 음수=위)', 'n', [-60, 60, 0.5]], ['coverTop', '위쪽 여백 (PC · 화면 높이의 %)', 'n', [0, 100, 1]], ['coverBottom', '아래쪽 여백 (PC · 스크롤하기 전 캐릭터가 들어갈 공간, 화면 높이의 %)', 'n', [0, 150, 1]], ['titleSizeM', '[모바일] 브랜드명 글자 크기 (px · 비우면 PC와 같게)', 'n', [8, 80, 1]], ['subSizeM', '[모바일] 서브 카피 글자 크기 (px)', 'n', [8, 60, 1]], ['buttonSizeM', '[모바일] 버튼 글자 크기 (px)', 'n', [8, 40, 1]], ['titleAlignM', '[모바일] 브랜드명 정렬', 's', ALIGN3M], ['titleXM', '[모바일] 브랜드명 가로 이동 (%, 미리보기를 모바일로 놓고 끌기)', 'n', [-60, 60, 0.5]], ['titleYM', '[모바일] 브랜드명 세로 이동 (%)', 'n', [-60, 60, 0.5]], ['subAlignM', '[모바일] 서브 카피 정렬', 's', ALIGN3M], ['subXM', '[모바일] 서브 카피 가로 이동 (%, 미리보기를 모바일로 놓고 끌기)', 'n', [-60, 60, 0.5]], ['subYM', '[모바일] 서브 카피 세로 이동 (%)', 'n', [-60, 60, 0.5]], ['buttonAlignM', '[모바일] 버튼 정렬', 's', ALIGN3M], ['buttonXM', '[모바일] 버튼 가로 이동 (%, 미리보기를 모바일로 놓고 끌기)', 'n', [-60, 60, 0.5]], ['buttonYM', '[모바일] 버튼 세로 이동 (%)', 'n', [-60, 60, 0.5]], ['coverTopM', '[모바일] 위쪽 여백 (%)', 'n', [0, 100, 1]], ['coverBottomM', '[모바일] 아래쪽 여백 (%)', 'n', [0, 150, 1]]]]]],
    ['page', '페이지 기본', 'settings', [['brandName', '위쪽 가운데 이름', 't'], ['pageTitle', '브라우저 탭 제목', 't'], ['pageDesc', '검색·공유 설명', 'l'], ['ambient', '배경 효과 (은은하게 움직이는 불씨·빛·연기)', 'o', [['embers', '불씨 (위로 날아오르는 불빛)', 'b'], ['light', '빛 (천천히 번지는 빛무리)', 'b'], ['smoke', '연기 (은은하게 피어오르는 안개)', 'b'], ['amount', '양 (0=없음 · 1=기본 · 2=많이)', 'n', [0, 3, 0.1]], ['speed', '속도 (1=기본)', 'n', [0.2, 3, 0.1]], ['opacity', '진하기 (0~1)', 'n', [0, 1, 0.05]], ['color', '불씨·빛 색', 'c']]],
      ['autoSpeed','자동 스크롤 속도 (1=기본 · 2=두 배 빠르게 · 0.5=절반 속도)', 'n', [0.25, 4, 0.25]], ['priceText', '가격 표시 (비우면 표시 안 함)', 't'],
      ['skipLink', '오른쪽 위 바로가기', 'o', [['text', '글자', 't']]], ['v2', '새 20챕터 리포트로 이어가기', 'o', [['handoff', '사주 입력 후 새 리포트(/report/v2/)로 이동', 'b'], ['url', '리포트 주소 (/로 시작)', 't']]], ['purchase', '구매 버튼 동작', 'o', [['mode', '방식', 's', [['waitlist', '출시 알림(이메일) 받기'], ['link', '결제 페이지로 이동']]], ['href', '결제 페이지 주소(/ 또는 https://)', 't']]],
      ['resultClipChapter', '결과 화면 영상: 쓸 장 id (예: ch0 · 비우면 영상이 있는 첫 장)', 't'], ['hideEmptyMediaInProduction', '이미지·영상이 없는 블록은 숨기기', 'b']]],
    ['interest', '관심사 선택지', 'interests', null],
    ['result', '무료 결과 화면', 'result', [['title', '제목 ({name}=이름)', 't'], ['titleNoName', '이름이 없을 때 제목', 't'], ['subject', '주어 ({name}=이름)', 't'], ['subjectNoName', '이름이 없을 때 주어', 't'],
      ['elementTrait', '일간 오행별 한 줄', 'o', [['목', '목', 't'], ['화', '화', 't'], ['토', '토', 't'], ['금', '금', 't'], ['수', '수', 't']]],
      ['zoneTrait', '신강약별 한 줄', 'o', [['신강', '신강', 'l'], ['신약', '신약', 'l'], ['중화', '중화', 'l']]],
      ['image', '결과 아래 이미지', 'o', [['src', '이미지', 'i'], ['alt', '설명', 't']]], ['interestLine', '관심사 문장 ({interest})', 't'], ['flowHint', '마지막 문장', 't']]],
    ['flow', '운 흐름 화면', 'flow', [['title', '제목', 't'], ['lead', '설명', 'l'], ['nowLabel', '"지금" 표시', 't'], ['axisUp', '그래프 위쪽 글자', 't'], ['axisDown', '그래프 아래쪽 글자', 't'],
      ['flowDesc', '색 범례 설명', 'o', [['opportunity', '기회', 't'], ['expansion', '확장', 't'], ['harvest', '수확', 't'], ['accumulation', '축적', 't']]], ['lockedNote', '아래 잠금 안내', 'l']]],
    ['locked', '잠금 목록', 'locked', [['title', '제목', 't'], ['pickedBadge', '관심사 표시 글자', 't'],
      ['free', '무료 항목', 'L', { fields: [['label', '이름', 't'], ['note', '설명', 't']], blank: { label: '새 항목', note: '' }, title: 'label', label: '항목' }],
      ['locked', '잠긴 항목', 'L', { fields: [['label', '이름', 't'], ['note', '설명', 't'], ['key', '관심사 연결 (money/career/love/life/self)', 't']], blank: { label: '새 항목' }, title: 'label', label: '항목' }]]],
    ['purchase', '구매 화면', 'purchase', [['title', '제목', 'l'], ['includes', '포함 내용 (한 줄에 하나)', 'ls'], ['interestLine', '관심사 문장 ({interest})', 't'],
      ['waitlistTitle', '알림 신청 제목', 't'], ['waitlistText', '알림 신청 설명', 'l'], ['consent', '동의 문구', 't'], ['done', '완료 문구', 't']]],
  ];
  var INTEREST_FIELDS = { fields: [['key', '기록 이름(영문)', 't'], ['label', '카드 글자', 't'], ['icon', '큰 글자', 't'], ['text', '문장에 쓸 말', 't']], blank: { key: 'new', label: '새 항목', icon: '', text: '' }, title: 'label', label: '카드', max: 8 };

  root.StorySchema = { TYPES: TYPES, COMMON: COMMON, COMPONENT_FIELDS: COMPONENT_FIELDS, COMPONENT_NAMES: COMPONENT_NAMES, GROUPS: GROUPS, INTEREST_FIELDS: INTEREST_FIELDS };
})(typeof window !== 'undefined' ? window : globalThis);
