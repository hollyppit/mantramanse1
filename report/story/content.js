/* ============================================================================
   스토리 온보딩 콘텐츠 파일  —  문구·이미지·영상·순서는 "이 파일만" 고치면 됩니다.
   (사주 계산·결제 같은 기능 코드는 story.js 에 있고, 여기서는 건드릴 필요가 없습니다)

   ※ 관리자 화면(/report/admin → "스토리 페이지" 탭)에서 저장한 내용이 있으면 이 파일의 내용보다 우선합니다.
     관리자에서 "기본 내용으로 되돌리기"를 누르면 다시 이 파일의 내용이 쓰입니다. 이 파일은 "처음 기본값" 역할입니다.

   ■ 기본 개념
     화면은 위에서 아래로 BLOCKS 목록을 "순서대로" 그립니다.
     한 블록 = { type: '종류', ...내용 } 한 덩어리입니다. 블록을 복사해 붙이면 추가, 지우면 삭제,
     위아래로 옮기면 순서 변경입니다. 쉼표(,)와 따옴표(")만 깨지지 않게 주의하세요.

   ■ 자주 하는 일
     문장 하나 추가      → { type: 'headline', title: '새 문장' },  를 원하는 위치에 붙여 넣기
     글+그림 한 세트     → { type: 'imageText', title: '문장', src: '...', alt: '...', imagePosition: 'top' },  (top=그림 위·글 아래, bottom=글 위·그림 아래, left/right=옆으로)
     이미지 하나 추가    → { type: 'image', src: 'story/story-01.webp', alt: '설명' },  를 붙여 넣기
     글 + 그림 한 세트   → { type: 'imageText', src: '...', alt: '...', title: '...', body: '...', imagePosition: 'left' },
     (더 많은 예시는 맨 아래 "복사해서 쓰는 예시" 참고)

   ■ 이미지 넣는 법
     1) 파일을  report/story/img/<폴더>/  안에 넣습니다 (폴더 이름은 problem, insight, mantra, movingtoon, result, paywall 등 자유).
     2) src 에는 img/ 이후의 경로만 적습니다.   src: 'problem/problem-01.webp'
        (https:// 로 시작하는 주소나 /로 시작하는 주소도 그대로 쓸 수 있습니다)
     3) alt(이미지 설명)는 꼭 적어 주세요. 이미지가 없거나 src가 비어 있으면 깨진 아이콘 대신 자리표시(placeholder)가 나옵니다.
     4) 모바일 전용 이미지가 따로 있으면 srcMobile 을 적습니다. 용량은 WebP 로, 가로 1200px 이하를 권장합니다.
     todo: '...' 는 개발 화면(localhost 또는 주소 뒤에 ?dev=1)에서만 보이는 메모입니다. 실제 사용자에게는 보이지 않습니다.

   ■ 글자 꾸미기
     줄바꿈은 \n,  *별표로 감싼 글자* 는 금빛 강조입니다.   예) '*지금* 어떤 선택이 유리한지'

   ■ 블록 공통 옵션
     id        다른 곳에서 이 블록으로 이동하거나 "열림 조건"을 걸 때 쓰는 이름 (영문)
     anim      등장 효과: 'fade-up'(기본) | 'fade' | 'scale' | 'reveal'(이미지가 열리듯) | 'lines'(줄마다 차례로) | 'none'
     align     'center'(기본) | 'left'
     requires  'chart' = 사주 분석을 마친 뒤에만 보임,  'flowOpen' = "올해의 흐름 확인하기"를 누른 뒤에만 보임
     track     이 블록이 화면에 보일 때 한 번 기록할 분석 이벤트 이름 (예: 'problem_section_viewed')
     hide      true 로 두면 지우지 않고 잠시 숨깁니다

   ■ 블록 종류 (type)
     headline    큰 한 문장. title, kicker(위 작은 글씨), subtitle, size('xl'|'l'|'m'), fullscreen(true면 한 화면 가득), scrollHint(true면 아래 스크롤 안내),
                 startButton(버튼 글자를 적으면 버튼이 생기고, 누르면 자동으로 내려갑니다)
     text        설명 글. title, subtitle, body, emphasis(true면 강조 스타일)
     quote       강조 문구. text, cite(출처, 선택)
     image       이미지. src, srcMobile, alt, caption, width('narrow'|'normal'|'wide'), aspectRatio('4/5','16/9'…), objectFit('cover'|'contain'), todo
     imageText   그림(또는 영상)+글을 한 화면에. src, alt, title, body, aspectRatio, mediaType('video'면 src를 영상으로), poster, autoplay, loop, imagePosition('top'|'bottom'|'left'|'right')
                 top/bottom = 위아래로 쌓음(휴대폰 한 화면에 그림과 글이 함께 보이도록 그림 높이를 제한), left/right = 큰 화면에서 좌우 배치(모바일은 위아래)
     fullImage   화면을 크게 쓰는 이미지. src, alt, caption, height('70svh' 등)
     gallery     이미지 2~4장. items: [{src, alt, caption}], columns(2~4)
     video       영상. src, poster, autoplay, muted, loop, aspectRatio, caption, todo
     chain       화살표로 이어지는 흐름. title, items:['A','B'], direction('down'|'row')
     compare     비교. left:{label, items:[…]}, right:{label, items:[…], highlight:true}, (선택) src·alt·caption·aspectRatio = 아래에 함께 보일 이미지, body = 아래 글
     stickySteps 이미지가 고정된 채 글만 바뀌는 구간(모바일은 일반 세로 스크롤). steps:[{title, text, src, alt, todo}]
     interest    "지금 가장 궁금한 것은?" 선택 카드 (선택값이 뒤쪽 문구에 반영됨)
     spacer      호흡 여백. size('small'|'medium'|'large'|'viewport')
     divider     장면 전환 구분선
     cta         버튼. headline, description, buttonText, action, variant('primary'|'ghost')
                   action: 'scroll:블록id' | 'href:/주소' | 'flow:open'(운 흐름 열기) | 'purchase'(구매) | 'auto:start'(자동 스크롤 시작)
     component   기능 블록(수정 불필요). name: 'SajuInput' | 'FreeResult' | 'FlowPreview' | 'LockedContent' | 'Paywall'

   ■ A/B 문구
     문구 자리에 { A: '기본 문구', B: '시험 문구' } 형태로 쓰면 주소 뒤에 ?v=B 를 붙였을 때 B가 나옵니다.
     (아래 COPY 가 그 예시입니다. 아무 표시가 없으면 A)
   ============================================================================ */

(function () {
  'use strict';

  /* ── 자주 바꾸는 핵심 문구 (A/B 시험 대상) ─────────────────────────────── */
  var COPY = {
    heroHeadline: { A: '요즘, 이런 생각\n해본 적 있나요?', B: '열심히 사는데,\n왜 제자리일까요?' },
    problemQuestion: { A: '왜 나는 노력하는 만큼\n결과가 안 나올까?', B: '왜 나만 이렇게\n오래 걸릴까?' },
    insightHeadline: { A: '사람마다 잘되는 *방식*도,\n잘되는 *시기*도 다릅니다.', B: '문제는 노력이 아니라\n*타이밍*일 수 있습니다.' },
    movingToonHeadline: { A: '당신의 인생에는\n이야기가 있으니까.', B: '당신의 사주는\n한 편의 이야기입니다.' },
    freeResultCta: { A: '내 사주 분석하기', B: '나의 기질 확인하기' },
    paywallHeadline: { A: '그래서,\n나는 언제 움직여야 할까?', B: '내가 움직일 때는\n언제일까?' },
    purchaseCta: { A: '내 전체 이야기 열기', B: '전체 리포트 열어보기' },
  };

  /* ── 페이지 설정 ──────────────────────────────────────────────────────── */
  var SETTINGS = {
    // 이미지 파일 기본 위치 (src 가 상대경로일 때 앞에 붙습니다)
    imageBase: '/report/story/img/',
    // true 면 실제 사용자 화면에서 "이미지가 없는 이미지 블록"을 아예 숨깁니다. false 면 디자인된 자리표시가 보입니다.
    hideEmptyMediaInProduction: false,
    // 구매 버튼 동작. mode: 'waitlist' = 출시 알림(이메일) 받기 / 'link' = href 로 이동 (결제 페이지가 생기면 이쪽으로)
    purchase: { mode: 'waitlist', href: '' },
    // 구매 영역에 보여줄 가격 (비워 두면 가격은 표시하지 않습니다)
    priceText: '',
    // 배경 분위기 효과(글 뒤에서 은은하게 움직임). 관리자에서 켜고 끄고 세기를 조절합니다.
    //   embers 불씨 · light 빛무리 · smoke 연기 / amount 양(0=없음, 1=기본, 2=많이) / speed 속도 / opacity 진하기(0~1) / color 불씨·빛 색
    ambient: { embers: true, light: true, smoke: true, amount: 1, speed: 1, opacity: 0.8, color: '#E8B26A' },
    // 인트로 커버: 스토리 맨 앞 한 화면. src 는 이미지(비우면 은은한 빛무리), show:false 면 숨김
    cover: { show: true, bgSrc: '', bgOpacity: 0.6, chars: [], src: '', alt: '신비한 등불', title: '만트라 사주팔자 무빙툰', sub: '당신의 기질과 흐름을 이야기로 만나다.', button: '둘러보기',
      titleFont: 'serif', titleWeight: '400', titleSize: 17, titleSpacing: 4, subFont: 'sans', subSize: 14, buttonFont: 'sans', buttonSize: 15 },
    autoSpeed: 1,                                  // 자동 스크롤 속도 (1=기본, 2=두 배 빠르게, 0.5=절반 속도)
    brandName: '만트라 포춘',                       // 위쪽 가운데 이름
    pageTitle: '내 이야기의 시작 · 만트라 사주 무빙툰',  // 브라우저 탭 제목
    pageDesc: '요즘 이런 생각 해본 적 있나요? 스크롤하며 내 사주의 이야기를 따라가 보세요.',
    skipLink: { text: '바로 분석하기', target: 'sajuInput' },
  };

  /* ── "지금 가장 궁금한 것" 선택지 ─────────────────────────────────────── */
  // key: 분석 이벤트에 기록되는 값 / text: 뒤쪽 화면에서 "~가 궁금하다고 하셨죠" 문장에 쓰이는 말
  var INTERESTS = [
    { key: 'money', label: '돈 · 재물', icon: '財', text: '돈과 재물의 흐름' },
    { key: 'career', label: '직업 · 사업', icon: '業', text: '직업과 사업의 흐름' },
    { key: 'love', label: '연애 · 결혼', icon: '緣', text: '연애와 인연의 흐름' },
    { key: 'life', label: '인생 흐름', icon: '運', text: '인생 전체의 흐름' },
    { key: 'self', label: '나의 성향', icon: '我', text: '타고난 나의 성향' },
  ];

  /* ── 사주 결과 화면에 쓰이는 문구 (숫자·점수는 만들지 않고 실제 분석 결과만 연결합니다) ── */
  var RESULT = {
    // 일간(나를 뜻하는 글자)의 오행별 한 줄 이미지. 마케팅 문구이며 계산값이 아닙니다.
    elementTrait: {
      '목': '곧게 뻗어 나가며 자라는 나무 같은 기질',
      '화': '주변을 밝히고 달구는 불꽃 같은 기질',
      '토': '모든 것을 품고 받쳐 주는 대지 같은 기질',
      '금': '단단하고 분명하게 결을 세우는 쇠 같은 기질',
      '수': '어디로든 스며들고 깊이 흐르는 물 같은 기질',
    },
    zoneTrait: {
      '신강': '내 안의 힘이 단단한 편이라, 스스로 밀고 가는 힘이 큽니다.',
      '신약': '주변과 환경의 영향을 많이 받는 만큼, 어떤 곁을 두느냐가 중요합니다.',
      '중화': '힘의 균형이 비교적 고른 편입니다.',
    },
    title: '{name}님의 기본 기질',
    titleNoName: '당신의 기본 기질',   // 이름을 입력하지 않았을 때
    subject: '{name}님은',
    subjectNoName: '당신은',
    // 무료 결과 아래 이미지 (결과에 대응하는 캐릭터/무빙툰 컷)
    image: { src: '', alt: '나의 기질을 닮은 무빙툰 캐릭터', todo: '결과(일간 오행)에 대응하는 캐릭터/무빙툰 이미지 삽입' },
    // 선택한 관심사가 있을 때 결과 아래에 붙는 문장. {interest} 가 선택지의 text 로 바뀝니다.
    interestLine: '"{interest}", 궁금하다고 하셨죠. 그 이야기는 다음 장면에서 이어집니다.',
    flowHint: '같은 사람도 시기마다 다른 얼굴로 살아갑니다.',
  };

  var FLOW = {
    title: '올해, 달마다 들어오는 흐름',
    lead: '막대가 위로 길수록 나에게 유리한 달, 아래로 내려가면 조심할 달이에요. 색은 그 달의 주된 흐름입니다. 막대를 눌러 보세요.',
    nowLabel: '지금',
    lockedNote: '달마다의 자세한 이유와 행동 가이드, 앞으로 10년의 대운·세운은 전체 이야기에서 열립니다.',
    axisUp: '유리',        // 그래프 위쪽 글자
    axisDown: '조심',      // 그래프 아래쪽 글자
    // 색깔 범례의 한 줄 설명 (주 흐름 4가지)
    flowDesc: { opportunity: '새로 시작하기 좋은 때', expansion: '하던 일을 키우는 때', harvest: '거두고 마무리하는 때', accumulation: '쌓고 다지는 때' },
  };

  var LOCKED = {
    title: '앞으로 열리는 이야기',
    free: [{ label: '나의 기본 기질', note: '방금 확인했어요' }],
    // 항목 사이에 설명/이미지를 끼우고 싶으면 note 에 한 줄 설명을, image 에 { src, alt } 를 적으세요.
    locked: [
      { label: '돈과 재물의 흐름', key: 'money' },
      { label: '직업과 사업', key: 'career' },
      { label: '연애와 인연', key: 'love' },
      { label: '기회가 강해지는 시기' },
      { label: '조심해야 할 시기' },
      { label: '장기적인 대운 흐름', key: 'life' },
      { label: '나의 사주 무빙툰' },
    ],
    // 선택한 관심사와 key가 같은 항목에 붙는 말
    pickedBadge: '궁금하다고 한 이야기',
  };

  var PURCHASE = {
    title: '타고난 기질부터\n앞으로 들어올 운의 흐름까지.\n당신의 이야기를 확인해보세요.',
    includes: ['타고난 기질', '재물 · 직업 · 연애', '대운 · 세운 흐름', '기회와 주의 시기', '행동 가이드', '나만의 사주 무빙툰'],
    interestLine: '"{interest}"까지, 이 모든 이야기를 한 번에 엽니다.',
    // 구매 버튼을 눌렀을 때 (mode: 'waitlist')
    waitlistTitle: '아직 문을 여는 중이에요',
    waitlistText: '결제는 곧 열립니다. 이메일을 남겨 주시면 열리는 날 가장 먼저 알려 드려요.',
    consent: '출시 알림을 위한 이메일 수집·이용에 동의합니다.',
    done: '신청되었습니다. 곧 소식 드릴게요.',
  };

  /* ── 본문 블록 (이 순서대로 화면에 나옵니다) ──────────────────────────── */
  var BLOCKS = [

    /* ===== 01 PROBLEM : "이거 내 얘기인데?" ===== */
    { type: 'headline', id: 'hero', track: 'problem_section_viewed', kicker: '만트라 사주 무빙툰', title: COPY.heroHeadline, size: 'xl', fullscreen: true, anim: 'lines' },
    { type: 'imageText', title: COPY.problemQuestion, imagePosition: 'top', src: 'problem/problem-01.webp', alt: '노력하지만 결과가 나오지 않아 고민하는 사람', aspectRatio: '4/5', anim: 'lines',
      todo: '노력하지만 결과가 나오지 않아 고민하는 인물 이미지 또는 웹툰 컷 삽입' },
    { type: 'imageText', title: '지금 밀어붙여야 할까,\n기다려야 할까?', imagePosition: 'top', src: 'problem/problem-02.webp', alt: '두 갈래 길 앞에 선 사람', aspectRatio: '4/5', anim: 'lines',
      todo: '두 갈래 길 또는 선택을 표현하는 이미지 삽입' },
    { type: 'headline', title: '돈은 언제쯤 풀릴까?\n이 사람과 계속 가도 될까?', size: 'm', anim: 'lines' },
    { type: 'headline', title: '내 인생에도\n잘 풀리는 때가 있을까?', size: 'l', anim: 'lines' },
    { type: 'spacer', size: 'large' },

    /* ===== 02 INSIGHT : "사람마다 타이밍이 다르구나" ===== */
    { type: 'imageText', id: 'insight', track: 'insight_section_viewed', fullscreen: true, title: COPY.insightHeadline, imagePosition: 'bottom', src: 'insight/insight-01.webp', alt: '계절이 바뀌듯 흘러가는 시간', aspectRatio: '16/10', anim: 'lines',
      todo: '계절 또는 시간의 흐름을 표현하는 일러스트 삽입' },
    { type: 'chain', title: '지금의 나는 이렇게 만들어집니다', items: ['타고난 기질', '현재의 흐름', '나의 선택'], direction: 'row', result: '현재의 나' },
    { type: 'text', body: '어떤 사람은 *움직일 때* 기회를 잡고,\n어떤 사람은 *기다릴 때* 손실을 피합니다.', align: 'center' },
    { type: 'quote', text: '중요한 건 미래를 맞히는 것이 아니라\n지금 어떤 선택이 나에게 유리한지 아는 것.' },
    { type: 'spacer', size: 'medium' },

    /* ===== 03 인생의 계절 : 이미지·웹툰을 많이 넣을 구간 =====
       ※ 마케팅용 비유입니다. 실제 명리 계산(운 흐름)과는 무관합니다. */
    { type: 'headline', title: '인생에도\n계절이 있습니다', size: 'l', anim: 'lines' },
    { type: 'stickySteps', id: 'seasons', steps: [
      { title: '봄', text: '준비하고 시작하는 시기', src: 'insight/season-spring.webp', alt: '봄: 싹이 트는 풍경', todo: '봄 일러스트/웹툰 컷 삽입' },
      { title: '여름', text: '확장하고 움직이는 시기', src: 'insight/season-summer.webp', alt: '여름: 무성하게 자라는 풍경', todo: '여름 일러스트/웹툰 컷 삽입' },
      { title: '가을', text: '성과를 거두는 시기', src: 'insight/season-autumn.webp', alt: '가을: 열매를 거두는 풍경', todo: '가을 일러스트/웹툰 컷 삽입' },
      { title: '겨울', text: '정리하고 다음을 준비하는 시기', src: 'insight/season-winter.webp', alt: '겨울: 고요히 쉬어 가는 풍경', todo: '겨울 일러스트/웹툰 컷 삽입' },
    ] },
    { type: 'divider' },

    /* ===== 04 MANTRA : 새로운 해결 방법 ===== */
    { type: 'headline', id: 'mantra', track: 'mantra_section_viewed', title: '그래서 만트라는\n사주를 조금 다르게 보여줍니다.', size: 'xl', fullscreen: true, anim: 'lines' },
    { type: 'compare',
      left: { label: '기존 방식', items: ['생년월일', '어려운 명리학 용어', '긴 텍스트 풀이'] },
      right: { label: '만트라', items: ['나의 기질', '인생의 흐름', '지금의 위치', '행동 가이드'], highlight: true },
      src: 'mantra/report-ui.webp', alt: '만트라 리포트 화면', aspectRatio: '9/16', caption: '실제 만트라 리포트 화면',
      body: '복잡한 명리학을 공부하지 않아도\n내 인생의 흐름을 *한눈에* 이해할 수 있도록.',
      todo: '실제 만트라 리포트 UI 이미지 삽입' },
    { type: 'spacer', size: 'medium' },

    /* ===== 05 MOVING TOON : 몰입 구간 ===== */
    { type: 'imageText', id: 'movingtoon', track: 'movingtoon_preview_viewed', mediaType: 'video', imagePosition: 'top', title: COPY.movingToonHeadline, anim: 'lines',
      src: '', poster: '', autoplay: true, loop: true, aspectRatio: '9/16',
      body: '만트라는 당신의 사주를 분석해\n타고난 성향과 삶의 흐름을\n*당신만의 이야기*로 만들어 드립니다.',
      todo: '실제 사주 무빙툰 teaser 영상 삽입 (src: movingtoon/teaser.mp4, poster: movingtoon/teaser.webp)' },
    { type: 'cta', buttonText: '내 이야기는 어떻게 만들어질까?', action: 'scroll:interest', variant: 'ghost' },
    { type: 'spacer', size: 'medium' },

    /* ===== 06 USER INTENT ===== */
    { type: 'interest', id: 'interest', title: '지금 가장 궁금한 것은\n무엇인가요?', hint: '하나만 골라 주세요. 이야기의 중심이 됩니다.' },
    { type: 'spacer', size: 'small' },

    /* ===== 07 SAJU INPUT ===== */
    { type: 'component', name: 'SajuInput', id: 'sajuInput', track: 'saju_input_viewed', ctaText: COPY.freeResultCta,
      title: '그럼, 당신은\n어떤 사람일까요?', hint: '입력한 정보는 이 기기 안에서만 계산되며 저장되지 않습니다.' },

    /* ===== 08 FREE RESULT (분석 후에만 보임) ===== */
    { type: 'component', name: 'FreeResult', id: 'freeResult', requires: 'chart', track: 'free_result_viewed' },

    /* ===== 09 STORY CONTENT : 무료 결과와 운 흐름 사이 ===== */
    { type: 'spacer', size: 'medium', requires: 'chart' },
    { type: 'imageText', requires: 'chart', title: '그런데 같은 사람도\n언제나 같은 모습으로\n살아가지는 않습니다.', imagePosition: 'top', src: 'story/story-01.webp', alt: '일이 술술 풀리는 시기의 사람', aspectRatio: '4/5', anim: 'lines',
      todo: '일이 빠르게 풀리는 시기를 표현하는 컷 삽입' },
    { type: 'imageText', requires: 'chart', title: '어떤 시기에는\n일이 빠르게 풀리고', imagePosition: 'top', src: 'story/story-02.webp', alt: '아무리 노력해도 제자리 같은 시기의 사람', aspectRatio: '4/5', anim: 'lines',
      todo: '노력해도 제자리처럼 느껴지는 시기를 표현하는 컷 삽입' },
    { type: 'headline', requires: 'chart', title: '어떤 시기에는\n아무리 노력해도\n제자리처럼 느껴집니다.', size: 'm', anim: 'lines' },
    { type: 'quote', requires: 'chart', text: '그 차이를 만드는 것이\n*운의 흐름*입니다.' },

    /* ===== 10 CURIOSITY GAP ===== */
    { type: 'spacer', requires: 'chart', size: 'large' },
    { type: 'headline', requires: 'chart', id: 'curiosity', title: '그렇다면 지금,\n당신은 어떤 시기를\n지나고 있을까요?', size: 'xl', anim: 'lines' },
    { type: 'spacer', requires: 'chart', size: 'large' },
    { type: 'headline', requires: 'chart', title: '지금 당신에게\n들어온 흐름은?', size: 'l', anim: 'lines' },
    { type: 'cta', requires: 'chart', id: 'flowCta', buttonText: '올해의 흐름 확인하기', action: 'flow:open', variant: 'primary', hideAfterAction: true },

    /* ===== 11 FLOW PREVIEW (실제 월별 운 흐름) ===== */
    { type: 'component', name: 'FlowPreview', id: 'flowPreview', requires: 'flowOpen', track: 'flow_preview_viewed' },

    /* ===== 12 LOCKED CONTENT ===== */
    { type: 'spacer', requires: 'flowOpen', size: 'medium' },
    { type: 'component', name: 'LockedContent', id: 'locked', requires: 'flowOpen' },

    /* ===== 13 PAYWALL STORY : 결제 버튼 전의 마지막 이야기 ===== */
    { type: 'spacer', requires: 'flowOpen', size: 'large' },
    { type: 'imageText', requires: 'flowOpen', title: '인생에는\n움직여야 할 때가 있고', imagePosition: 'top', src: 'paywall/paywall-01.webp', alt: '앞으로 나아가는 사람', aspectRatio: '4/5', anim: 'lines',
      todo: '움직여야 할 때를 표현하는 컷 삽입' },
    { type: 'imageText', requires: 'flowOpen', title: '기다려야 할 때가 있습니다.', imagePosition: 'top', src: 'paywall/paywall-02.webp', alt: '조용히 기다리는 사람', aspectRatio: '4/5', anim: 'lines',
      todo: '기다려야 할 때를 표현하는 컷 삽입' },
    { type: 'imageText', requires: 'flowOpen', title: '중요한 건\n그 *타이밍*을 알아보는 것입니다.', imagePosition: 'top', src: 'paywall/paywall-03.webp', alt: '시계와 달의 흐름', aspectRatio: '16/10', anim: 'lines',
      todo: '타이밍을 알아보는 장면(시계·달·계절 등) 컷 삽입' },
    { type: 'spacer', requires: 'flowOpen', size: 'medium' },
    { type: 'headline', requires: 'flowOpen', id: 'paywallStory', track: 'paywall_viewed', title: COPY.paywallHeadline, size: 'xl', fullscreen: true, anim: 'lines' },

    /* ===== 14 PURCHASE ===== */
    { type: 'component', name: 'Paywall', id: 'purchase', requires: 'flowOpen', ctaText: COPY.purchaseCta },
  ];

  /* ──────────────────────────────────────────────────────────────────────────
     복사해서 쓰는 예시 (아래는 화면에 나오지 않습니다. 위 BLOCKS 안에 붙여 넣으세요)

     1) 문장 하나 추가
        { type: 'headline', title: '새로 넣을 한 문장', size: 'l' },

     2) 이미지 하나 추가 (파일: report/story/img/story/story-03.webp)
        { type: 'image', src: 'story/story-03.webp', alt: '장면 설명', caption: '', aspectRatio: '4/5', anim: 'reveal' },

     3) 텍스트 + 이미지 한 세트
        { type: 'imageText', src: 'story/story-04.webp', alt: '장면 설명', title: '작은 제목', body: '설명 글입니다.', imagePosition: 'left' },

     4) 영상
        { type: 'video', src: 'movingtoon/teaser.mp4', poster: 'movingtoon/teaser.webp', autoplay: true, muted: true, loop: true, aspectRatio: '9/16' },

     5) 이미지 2~4장 묶음
        { type: 'gallery', columns: 2, items: [{ src: 'story/a.webp', alt: 'A 컷' }, { src: 'story/b.webp', alt: 'B 컷' }] },

     6) 사주 분석을 끝낸 사람에게만 보이는 문장
        { type: 'headline', requires: 'chart', title: '분석이 끝난 사람에게만 보이는 문장' },
     ────────────────────────────────────────────────────────────────────────── */

  window.OnboardingContent = {
    settings: SETTINGS, copy: COPY, interests: INTERESTS, result: RESULT, flow: FLOW, locked: LOCKED, purchase: PURCHASE, blocks: BLOCKS,
  };
})();
