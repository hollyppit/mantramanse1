// 무빙툰 클립 연출 엔진 (관리자 미리보기와 이후 공개 뷰어가 함께 쓴다)
// clip.fx = { trans:{}, sub:{}, voice:{}, video:{}, cues:[{t,s,e}] } 중 지정한 값만 저장되고,
// 지정하지 않은 값은 "기본 연출(defaults)" → 내장 기본값 순으로 채워진다.
// 시간 단위는 모두 초. 자막 시각(s,e)은 앞부분 자르기(trimStart)를 반영한 "재생 시작 기준"이다.
(function (root) {
  var TR_IN = [['cut', '컷 (바로 시작)'], ['fade', '페이드 인'], ['dissolve', '블러 디졸브'], ['slide-left', '오른쪽에서 밀며 등장'], ['slide-right', '왼쪽에서 밀며 등장'], ['slide-up', '아래에서 올라옴'], ['zoom-in', '줌 인'], ['zoom-out', '줌 아웃'], ['wipe', '와이프'], ['flash', '섬광']];
  var TR_OUT = [['cut', '컷 (바로 끝)'], ['fade', '페이드 아웃'], ['dissolve', '블러 디졸브'], ['slide-left', '왼쪽으로 밀며 퇴장'], ['slide-up', '위로 밀며 퇴장'], ['zoom-in', '줌 인하며 사라짐'], ['wipe', '와이프'], ['flash', '섬광']];
  var SUB_POS = [['bottom', '아래'], ['middle', '가운데'], ['top', '위']];
  var SUB_SIZE = [['S', '작게'], ['M', '보통'], ['L', '크게']];
  // 눈누(noonnu) 무료 폰트: [키, 표시 이름, 글꼴 이름, 파일 경로(jsDelivr), 대체 계열]. 글자를 쓸 때만 내려받는다.
  var CUSTOM_FONTS = [
    ['eulji', '배민 을지로체 (굵은 간판체)', 'BMEULJIRO', 'noonfonts_twelve@1.2/BMEULJIRO.woff', 'sans-serif'],
    ['eulji10', '배민 을지로10년후체 (레트로 간판)', 'BMEuljiro10yearslater', 'noonfonts_20-10-21@1.1/BMEuljiro10yearslater.woff', 'sans-serif'],
    ['euljioldae', '배민 을지로오래오래체 (붓 느낌 간판)', 'BMEuljirooraeorae', 'noonfonts_2110@1.0/BMEuljirooraeorae.woff2', 'sans-serif'],
    ['hannapro', '배민 한나체 Pro (둥근 제목체)', 'BMHANNAPro', 'noonfonts_seven@1.2/BMHANNAPro.woff', 'sans-serif'],
    ['melona', '빙그레 메로나체 (말랑한 제목체)', 'BinggraeMelona', 'noonfonts_twelve@1.2/BinggraeMelona-Bold.woff', 'sans-serif'],
    ['taom', '빙그레 따옴체 (손맛 나는 고딕)', 'BinggraeTaom', 'noonfonts_2302@1.1/BinggraeTaom-Bold.woff2', 'sans-serif'],
    ['binggrae', '빙그레체 (귀여운 둥근체)', 'Binggrae', 'noonfonts_one@1.0/Binggrae-Bold.woff', 'sans-serif'],
    ['lv1', '넥슨 Lv1 고딕', 'NEXON Lv1 Gothic', 'noonfonts_20-04@2.3/NEXON Lv1 Gothic OTF Bold.woff', 'sans-serif'],
    ['lv2', '넥슨 Lv2 고딕', 'NEXON Lv2 Gothic', 'noonfonts_20-04@2.3/NEXON Lv2 Gothic Bold.woff', 'sans-serif'],
    ['football', '넥슨 풋볼고딕 (스포츠 느낌)', 'NEXONFootballGothic', 'noonfonts_20-04@2.3/NEXONFootballGothicBA1.woff', 'sans-serif'],
    ['bazzi', '넥슨 배찌체 (캐릭터풍)', 'Bazzi', 'noonfonts_20-04@2.3/Bazzi.woff', 'sans-serif'],
    ['maple', '메이플스토리체 (게임 자막풍)', 'MaplestoryOTF', 'noonfonts_20-04@2.3/MaplestoryOTFBold.woff', 'sans-serif'],
    ['cookie', '쿠키런체 (통통한 게임체)', 'CookieRunOTF', 'noonfonts_twelve@1.2/CookieRunOTF-Black00.woff', 'sans-serif'],
    ['infinity', '인피니티산스 (선명한 고딕)', 'InfinitySans', 'noonfonts_20-04@2.3/InfinitySans-BoldA1.woff', 'sans-serif'],
    ['yes', '예스체 (예스24 고딕)', 'YESGothic', 'noonfonts_13@1.0/YESGothic-Bold.woff', 'sans-serif'],
    ['ridi', '리디바탕 (소설책 명조)', 'RIDIBatang', 'noonfonts_twelve@1.2/RIDIBatang.woff', 'serif'],
    ['gmarket', '지마켓 산스 (굵은 고딕)', 'GmarketSans', 'noonfonts_2001@1.4/GmarketSansBold.woff', 'sans-serif'],
    ['suit', 'SUIT (모던 고딕)', 'SUIT', 'noonfonts_suit@1.0/SUIT-ExtraBold.woff2', 'sans-serif'],
    ['paperlogy', '페이퍼로지 (트렌디 고딕)', 'Paperlogy', '2408-3@1.0/Paperlogy-9Black.woff2', 'sans-serif'],
    ['spoqa', '스포카 한 산스 Neo', 'SpoqaHanSansNeo', 'noonfonts_2108@1.2/SpoqaHanSansNeo-Bold.woff', 'sans-serif'],
    ['nsround', '나눔스퀘어 라운드', 'NanumSquareRound', 'noonfonts_two@1.0/NanumSquareRound.woff', 'sans-serif'],
    ['ssurround', '카페24 써라운드 (둥근 강조체)', 'Cafe24Ssurround', 'noonfonts_2105_2@1.1/Cafe24Ssurround.woff', 'sans-serif'],
    ['dangdang', '카페24 당당해체 (또렷한 고딕)', 'Cafe24Dangdanghae', 'noonfonts_2001@1.4/Cafe24Dangdanghae.woff', 'sans-serif'],
    ['supermagic', '카페24 슈퍼매직 (마술 간판풍)', 'Cafe24Supermagic', 'noonfonts_2307-2@1.0/Cafe24Supermagic-Bold-v1.0.woff2', 'sans-serif'],
    ['meongi', '카페24 멍이 (말랑 손글씨)', 'Cafe24Meongi', '2405-3@1.1/Cafe24Meongi-B-v1.0.woff2', 'sans-serif'],
    ['lotte', '롯데리아 찹땡겨체 (쫀득한 제목체)', 'LOTTERIACHAB', 'noonfonts_2302@1.1/LOTTERIACHAB.woff2', 'sans-serif'],
    ['mango', '망고보드 또박체 (또박한 손글씨)', 'MangoDdobak', '2405-3@1.1/MangoDdobak-B.woff2', 'sans-serif'],
    ['moneyround', '머니그라피 라운드', 'MoneygraphyRounded', '2411-2@1.0/Moneygraphy-Rounded.woff2', 'sans-serif'],
    ['samlip', '삼립호빵체 (두툼한 제목체)', 'SDSamliphopangche', 'noonfonts-20-12@1.0/SDSamliphopangche_Basic.woff', 'sans-serif'],
    ['eyes', '안경잡이체 (또렷한 얇은 글씨)', 'FOUREYES', 'noonfonts_2307-2@1.0/FOUREYES.woff2', 'sans-serif'],
    ['bokeh', 'BOKEH (감성 얇은 영문 포함)', 'BOKEH', 'noonfonts_2307-2@1.0/BOKEH.woff2', 'sans-serif'],
    ['crooked', 'CROOKED (삐뚤한 개성체)', 'CROOKED', 'noonfonts_2307-2@1.0/CROOKED.woff2', 'sans-serif'],
    ['delta', '델타 유니버스 (SF 느낌)', 'DeltaUniverse', 'noonfonts_2307-2@1.0/DeltaUniverse-Regular.woff2', 'sans-serif'],
    ['player', 'I AM A PLAYER (스포츠 로고풍)', 'IAMAPLAYER', 'noonfonts_2307-2@1.0/IAMAPLAYER.woff2', 'sans-serif'],
    ['yacheR', '야놀자 야체 (굵은 광고체)', 'YanoljaYache', 'noonfonts_two@1.0/YanoljaYacheR.woff', 'sans-serif'],
    ['kimhoon', 'KCC 김훈체 (필기체)', 'KCCKimhoon', 'noonfonts_one@1.0/KCC-Kimhoon-Regular.woff', 'cursive'],
    ['eunyoung', 'KCC 은영체 (가는 손글씨)', 'KCCeunyoung', 'noonfonts_one@1.0/KCC-eunyoung-Regular.woff', 'cursive'],
    ['dodam', 'KCC 도담도담체 (귀여운 고딕)', 'KCCDodamdodam', 'noonfonts_2302@1.1/KCC-DodamdodamR.woff2', 'sans-serif'],
    ['muruk', 'KCC 무럭무럭체 (굵은 고딕)', 'KCCMurukmuruk', 'noonfonts_2302@1.1/KCCMurukmuruk.woff2', 'sans-serif'],
    ['ahnjg', 'KCC 안중근체 (붓 느낌)', 'KCCAhnjunggeun', 'noonfonts_2302@1.1/KCCAhnjunggeun.woff2', 'serif'],
    ['butpen', '학교안심 붓펜 (굵은 붓펜)', 'HakgyoansimButpen', 'noonfonts_2307-2@1.0/HakgyoansimButpenB.woff2', 'cursive'],
    ['doldam', '학교안심 돌담 (투박한 손글씨)', 'HakgyoansimDoldam', 'noonfonts_2307-2@1.0/HakgyoansimDoldamB.woff2', 'cursive'],
    ['sketchbook', '학교안심 스케치북 (연필 스케치)', 'HakgyoansimSketchbook', '2510-1@1.1/HakgyoansimSketchbookR.woff2', 'cursive'],
    ['poster', '학교안심 포스터 (굵은 포스터체)', 'HakgyoansimPoster', '2511-1@1.0/HakgyoansimPosterB.woff2', 'sans-serif'],
    ['parkdh', '온글잎 박다현체 (또박 손글씨)', 'OwnglyphParkDaHyun', '2411-3@1.0/Ownglyph_ParkDaHyun.woff2', 'cursive'],
    ['meetme', '온글잎 만나자체 (캐주얼 손글씨)', 'OwnglyphMeetme', 'noonfonts_2402_1@1.0/Ownglyph_meetme-Rg.woff2', 'cursive'],
    ['okticon', '온글잎 옥티콘 (깔끔 손글씨)', 'OwnglyphOkticon', '2408@1.0/Ownglyph_okticon-Bd.woff2', 'cursive'],
  ];
  var NOONNU = 'https://cdn.jsdelivr.net/gh/projectnoonnu/';
  var SUB_FONT_BASE = [['gothic', '고딕 (Noto Sans KR)'], ['pretty', '프리텐다드 (깔끔한 요즘 고딕)'], ['myeongjo', '명조 (Noto Serif KR)'], ['gowun', '고운바탕 (부드러운 명조)'], ['gowundodum', '고운돋움 (따뜻한 고딕)'], ['hanna', '블랙한산스 (굵은 제목체)'], ['dohyeon', '도현체 (굵은 고딕)'], ['bagel', '베이글팻원 (통통한 팝 제목체)'], ['jua', '주아체 (둥근 귀여움)'], ['dongle', '동글 (둥글고 작은 손글씨)'], ['gamja', '감자꽃 (말랑한 손글씨)'], ['hi', '하이멜로디 (귀여운 손글씨)'], ['single', '싱글데이 (일기장 손글씨)'], ['poor', '푸어스토리 (또박한 손글씨)'], ['pen', '나눔펜 (손글씨)'], ['gaegu', '개구체 (손글씨)'], ['dokdo', '동해독도 (거친 붓)'], ['brush', '나눔붓 (붓글씨)'], ['songmyung', '송명 (고전 서체)'], ['yeonsung', '연성 (붓펜 느낌)'], ['gugi', '구기 (레트로 게임풍)'], ['stylish', '스타일리시 (세련된 얇은 글씨)'], ['cute', '귀여운 폰트 (캐릭터풍)'], ['kirang', '기랑해랑 (장난스러운)'], ['sunflower', '해바라기 (선명한 고딕)']];
  var SUB_FONT = SUB_FONT_BASE.concat(CUSTOM_FONTS.map(function (c) { return [c[0], c[1]]; }));
  var SUB_WEIGHT = [['400', '보통'], ['500', '중간'], ['700', '굵게'], ['900', '아주 굵게']];
  var SUB_ALIGN = [['center', '가운데'], ['left', '왼쪽'], ['right', '오른쪽']];
  var SUB_COLOR = [['ivory', '아이보리'], ['white', '흰색'], ['gold', '금색'], ['yellow', '노랑']];
  var SUB_BG = [['none', '없음'], ['shade', '반투명 띠'], ['box', '진한 박스']];
  var SUB_ITALIC = [['normal', '기본'], ['italic', '기울임']];
  var SUB_ANIM = [['none', '없음'], ['fade', '페이드'], ['rise', '아래에서 떠오름'], ['drop', '위에서 내려옴'], ['pop', '팝 (커지며 등장)'], ['zoom', '줌 (크게→원래)'], ['blur', '블러 풀림'], ['slide-l', '왼쪽에서 슬라이드'], ['slide-r', '오른쪽에서 슬라이드'], ['bounce', '튕기며 등장'], ['flip', '뒤집히며 등장'], ['type', '타자기 (글자씩)'], ['word', '단어 순차 등장'], ['char', '글자 순차 등장']];
  var SUB_ANIM_OUT = [['none', '없음 (바로 사라짐)'], ['fade', '페이드'], ['fall', '아래로 내려가며'], ['lift', '위로 올라가며'], ['shrink', '작아지며'], ['blur', '블러'], ['slide-l', '왼쪽으로 슬라이드'], ['slide-r', '오른쪽으로 슬라이드']];
  var SUB_EMPH = [['none', '없음'], ['pulse', '두근두근 (커졌다 작아짐)'], ['float', '둥실둥실'], ['shake', '떨림'], ['blink', '깜빡임'], ['wobble', '흔들흔들'], ['glow', '반짝 빛남']];
  var ON_OFF = [['off', '끄기'], ['on', '켜기']];
  var VOICE_ENGINE = [['browser', '브라우저 음성 (무료, 기기마다 음색 다름)'], ['eleven', '일레븐랩스 (미리 만든 음성 파일, 모든 기기 동일)']];
  var EL_MODELS = [['eleven_multilingual_v2', 'Multilingual v2 (안정적, 기본 추천)'], ['eleven_v3', 'v3 (표현력 최고, 안정성은 0 / 0.5 / 1 권장)'], ['eleven_flash_v2_5', 'Flash v2.5 (빠르고 저렴)'], ['eleven_turbo_v2_5', 'Turbo v2.5']];
  var VOICE_MODE = [['cue', '자막 줄마다 (자막과 동기)'], ['whole', '전체를 한 번에']];
  var FIT = [['contain', '전체 보이게 (여백)'], ['cover', '화면 가득 (잘림)']];

  // 폼 구성용 명세: [키, 이름, 형식, 선택지 또는 {min,max,step}]
  // 서버(functions/api/clips.js)의 검증표와 같은 범위를 쓴다. 한쪽을 바꾸면 다른 쪽도 바꿀 것.
  var FIELDS = [
    { g: 'trans', title: '장면 전환', items: [['in', '들어올 때', 'sel', TR_IN], ['out', '나갈 때', 'sel', TR_OUT], ['dur', '전환 시간(초)', 'num', { min: 0.1, max: 3, step: 0.1 }]] },
    { g: 'sub', title: '자막 글자', items: [['font', '글씨체', 'sel', SUB_FONT], ['weight', '굵기', 'sel', SUB_WEIGHT], ['italic', '기울임', 'sel', SUB_ITALIC], ['size', '크기(간단)', 'sel', SUB_SIZE], ['fs', '크기(세부, 화면폭의 %)', 'num', { min: 2, max: 14, step: 0.1 }], ['color', '글자색(간단)', 'sel', SUB_COLOR], ['colorHex', '글자색 직접', 'color'], ['align', '정렬', 'sel', SUB_ALIGN], ['lh', '줄 간격(배)', 'num', { min: 1, max: 2.5, step: 0.05 }], ['ls', '자간(글자 크기의 %)', 'num', { min: -5, max: 30, step: 1 }]] },
    { g: 'sub', title: '자막 위치·크기', items: [['pos', '위치(간단)', 'sel', SUB_POS], ['x', '가로 위치 (왼쪽 끝 0 ~ 오른쪽 끝 100%)', 'num', { min: 0, max: 100, step: 1 }], ['y', '세로 위치 (위 0 ~ 아래 100%), 지정하면 간단 위치 무시', 'num', { min: 0, max: 100, step: 1 }], ['w', '자막 폭(화면폭의 %)', 'num', { min: 20, max: 100, step: 1 }], ['rot', '기울기(도)', 'num', { min: -30, max: 30, step: 1 }]] },
    { g: 'sub', title: '테두리·그림자·글로우', items: [['strokeW', '테두리 두께 (0=없음, 글자 크기의 %)', 'num', { min: 0, max: 15, step: 0.5 }], ['strokeColor', '테두리 색', 'color'], ['shOn', '그림자', 'sel', ON_OFF], ['shX', '그림자 가로 이동(%)', 'num', { min: -30, max: 30, step: 1 }], ['shY', '그림자 세로 이동(%)', 'num', { min: -30, max: 30, step: 1 }], ['shBlur', '그림자 번짐(%)', 'num', { min: 0, max: 60, step: 1 }], ['shColor', '그림자 색', 'color'], ['glowBlur', '글로우 세기 (0=없음)', 'num', { min: 0, max: 80, step: 1 }], ['glowColor', '글로우 색 (비우면 글자색)', 'color']] },
    { g: 'sub', title: '자막 배경 박스', items: [['bg', '배경', 'sel', SUB_BG], ['bgColor', '배경 색', 'color'], ['bgOpacity', '배경 투명도 (0 투명~100 불투명, 비우면 프리셋)', 'num', { min: 0, max: 100, step: 1 }], ['bgRadius', '모서리 둥글기(%)', 'num', { min: 0, max: 100, step: 1 }], ['padX', '좌우 여백(글자 크기의 %)', 'num', { min: 0, max: 200, step: 5 }], ['padY', '상하 여백(글자 크기의 %)', 'num', { min: 0, max: 100, step: 5 }]] },
    { g: 'sub', title: '자막 등장·퇴장·강조 효과', items: [['anim', '나타나는 효과', 'sel', SUB_ANIM], ['animDur', '나타나는 시간(초)', 'num', { min: 0.1, max: 3, step: 0.1 }], ['wordDelay', '단어/글자 순차 간격(초)', 'num', { min: 0.02, max: 1, step: 0.01 }], ['typeSpeed', '타자기 속도(초당 글자 수)', 'num', { min: 3, max: 60, step: 1 }], ['animOut', '사라지는 효과', 'sel', SUB_ANIM_OUT], ['animOutDur', '사라지는 시간(초)', 'num', { min: 0.1, max: 3, step: 0.1 }], ['emph', '떠 있는 동안 효과', 'sel', SUB_EMPH], ['emphSpeed', '효과 주기(초, 작을수록 빠름)', 'num', { min: 0.3, max: 6, step: 0.1 }]] },
    { g: 'voice', title: '목소리 설정', items: [
      ['on', '목소리 읽기', 'sel', ON_OFF], ['engine', '목소리 엔진', 'sel', VOICE_ENGINE],
      ['vol', '볼륨(0~1)', 'num', { min: 0, max: 1, step: 0.1 }], ['delay', '읽기 시작 지연(초)', 'num', { min: 0, max: 10, step: 0.1 }],
      ['name', '브라우저 목소리', 'voice', null, { only: 'browser', wide: true }], ['mode', '읽는 방식', 'sel', VOICE_MODE, { only: 'browser' }],
      ['rate', '속도', 'num', { min: 0.5, max: 2, step: 0.1 }, { only: 'browser' }], ['pitch', '음높이', 'num', { min: 0.5, max: 2, step: 0.1 }, { only: 'browser' }],
      ['elVoice', '일레븐랩스 목소리 (자막 줄마다 음성 파일을 만들어 씁니다)', 'elvoice', null, { only: 'eleven', wide: true }], ['elModel', '모델', 'sel', EL_MODELS, { only: 'eleven', wide: true }],
      ['elStability', '안정성 (낮을수록 감정 풍부)', 'num', { min: 0, max: 1, step: 0.05 }, { only: 'eleven' }], ['elSimilarity', '목소리 유사도', 'num', { min: 0, max: 1, step: 0.05 }, { only: 'eleven' }],
      ['elStyle', '스타일 과장', 'num', { min: 0, max: 1, step: 0.05 }, { only: 'eleven' }], ['elSpeed', '말 속도', 'num', { min: 0.7, max: 1.2, step: 0.05 }, { only: 'eleven' }]] },
    { g: 'video', title: '영상 재생', items: [['speed', '재생 속도', 'num', { min: 0.25, max: 2, step: 0.05 }], ['vol', '영상 원음 볼륨(0~1)', 'num', { min: 0, max: 1, step: 0.1 }], ['fit', '화면 맞춤', 'sel', FIT], ['trimStart', '앞부분 자르기(초)', 'num', { min: 0, max: 600, step: 0.1 }], ['trimEnd', '끝 지점(초, 0=끝까지)', 'num', { min: 0, max: 600, step: 0.1 }], ['hold', '마지막 화면 유지(초)', 'num', { min: 0, max: 10, step: 0.1 }]] },
  ];

  var BUILTIN = {
    trans: { 'in': 'fade', out: 'fade', dur: 0.5 },
    sub: { font: 'gothic', weight: '700', italic: 'normal', size: 'M', fs: 0, color: 'ivory', colorHex: '', align: 'center', lh: 1.45, ls: 0, pos: 'bottom', x: 50, y: -1, w: 90, rot: 0, strokeW: 0, strokeColor: '#000000', shOn: 'on', shX: 0, shY: 6, shBlur: 20, shColor: '#000000', glowBlur: 0, glowColor: '', bg: 'shade', bgColor: '', bgOpacity: -1, bgRadius: 30, padX: 60, padY: 20, anim: 'fade', animDur: 0.4, wordDelay: 0.08, typeSpeed: 14, animOut: 'fade', animOutDur: 0.3, emph: 'none', emphSpeed: 1.5 },
    voice: { on: 'off', engine: 'browser', name: '', mode: 'cue', rate: 1, pitch: 1, vol: 1, delay: 0.2, elVoice: '', elModel: 'eleven_multilingual_v2', elStability: 0.5, elSimilarity: 0.75, elStyle: 0, elSpeed: 1 },
    video: { speed: 1, vol: 1, fit: 'contain', trimStart: 0, trimEnd: 0, hold: 0.5 },
  };
  function resolve(fx, defaults) {
    var out = {};
    Object.keys(BUILTIN).forEach(function (g) {
      out[g] = Object.assign({}, BUILTIN[g], (defaults && defaults[g]) || {}, (fx && fx[g]) || {});
    });
    return out;
  }
  // 폴더 체인의 공통 연출을 기본 연출(defaults) 위에 겹친다. 반환값은 resolve()·play()의 defaults로 쓴다.
  function folderDefaults(folders, folderId, defaults) {
    var map = {}, list = [], seen = {}, id = folderId; (folders || []).forEach(function (f) { map[f.id] = f; });
    while (id && map[id] && !seen[id]) { seen[id] = 1; list.unshift(map[id]); id = map[id].parent; }
    var out = {};
    Object.keys(BUILTIN).forEach(function (g) {
      out[g] = Object.assign({}, (defaults && defaults[g]) || {});
      list.forEach(function (f) { Object.assign(out[g], (f.fx && f.fx[g]) || {}); });
    });
    return out;
  }
  function cuesOf(clip) {
    var c = clip.fx && clip.fx.cues;
    if (c && c.length) return c.map(function (x) { return { t: String(x.t || ''), s: +x.s || 0, e: +x.e || 0, a: String(x.a || ''), d: +x.d || 0 }; }).filter(function (x) { return x.t && x.e > x.s; }).sort(function (a, b) { return a.s - b.s; });
    return clip.caption ? [{ t: clip.caption, s: 0, e: 1e9 }] : []; // 타임라인이 없으면 자막 전체를 내내 표시
  }

  var COLORS = { ivory: '#ECE7DB', white: '#FFFFFF', gold: '#F0D08A', yellow: '#FFE66B' };
  var SIZES = { S: 4, M: 5, L: 6.5 };
  var FONTS = {
    gothic: '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif',
    pretty: '"Pretendard","Noto Sans KR",sans-serif',
    myeongjo: '"Noto Serif KR","Nanum Myeongjo","Batang","Noto Sans KR",serif',
    gowun: '"Gowun Batang","Noto Sans KR",serif',
    gowundodum: '"Gowun Dodum","Noto Sans KR",sans-serif',
    hanna: '"Black Han Sans","Noto Sans KR",sans-serif',
    dohyeon: '"Do Hyeon","Noto Sans KR",sans-serif',
    bagel: '"Bagel Fat One","Noto Sans KR",sans-serif',
    jua: '"Jua","Noto Sans KR",sans-serif',
    dongle: '"Dongle","Noto Sans KR",sans-serif',
    gamja: '"Gamja Flower","Noto Sans KR",cursive',
    hi: '"Hi Melody","Noto Sans KR",cursive',
    single: '"Single Day","Noto Sans KR",cursive',
    poor: '"Poor Story","Noto Sans KR",cursive',
    pen: '"Nanum Pen Script","Noto Sans KR",cursive',
    gaegu: '"Gaegu","Noto Sans KR",cursive',
    dokdo: '"East Sea Dokdo","Noto Sans KR",cursive',
    brush: '"Nanum Brush Script","Noto Sans KR",cursive',
    songmyung: '"Song Myung","Noto Sans KR",serif',
    yeonsung: '"Yeon Sung","Noto Sans KR",cursive',
    gugi: '"Gugi","Noto Sans KR",sans-serif',
    stylish: '"Stylish","Noto Sans KR",sans-serif',
    cute: '"Cute Font","Noto Sans KR",cursive',
    kirang: '"Kirang Haerang","Noto Sans KR",cursive',
    sunflower: '"Sunflower","Noto Sans KR",sans-serif',
  };
  // 글자 자체가 작게 설계된 글씨체는 같은 크기로 보이도록 키운다
  var FONT_SCALE = { dongle: 1.6, pen: 1.4, brush: 1.4, cute: 1.25, dokdo: 1.3, gamja: 1.1, gaegu: 1.1 };
  CUSTOM_FONTS.forEach(function (c) { FONTS[c[0]] = '"' + c[2] + '","Noto Sans KR",' + c[4]; });
  var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@400;500;700;900&family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Nanum+Pen+Script&family=Gaegu:wght@400;700&family=Dongle:wght@400;700&family=Bagel+Fat+One&family=East+Sea+Dokdo&family=Gamja+Flower&family=Hi+Melody&family=Yeon+Sung&family=Single+Day&family=Gugi&family=Song+Myung&family=Sunflower:wght@500;700&family=Poor+Story&family=Stylish&family=Cute+Font&family=Kirang+Haerang&family=Nanum+Brush+Script&display=swap';
  var FONT_CSS2 = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css';
  var css = '.fx-wrap{position:absolute;inset:0;overflow:hidden;background:#000;container-type:inline-size}' +
    '.fx-stage{position:absolute;inset:0;animation-duration:var(--fxd,.5s);animation-fill-mode:both;animation-timing-function:ease}' +
    '.fx-stage video{width:100%;height:100%;background:#000;display:block}' +
    '.fx-pos{position:absolute;pointer-events:none}' +
    '.fx-pos[data-pos=top]{top:8%}.fx-pos[data-pos=bottom]{bottom:9%}.fx-pos[data-pos=middle]{top:50%}' +
    '.fx-sub{display:inline-block;max-width:100%;white-space:pre-wrap;word-break:keep-all}.fx-inner{display:inline-block;max-width:100%}.fx-w{display:inline-block;white-space:nowrap}' +
    '@keyframes fx-i-fade{from{opacity:0}}@keyframes fx-i-dissolve{from{opacity:0;filter:blur(14px)}}' +
    '@keyframes fx-i-slide-left{from{transform:translateX(100%)}}@keyframes fx-i-slide-right{from{transform:translateX(-100%)}}@keyframes fx-i-slide-up{from{transform:translateY(100%)}}' +
    '@keyframes fx-i-zoom-in{from{opacity:0;transform:scale(.7)}}@keyframes fx-i-zoom-out{from{opacity:0;transform:scale(1.4)}}' +
    '@keyframes fx-i-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}@keyframes fx-i-flash{from{opacity:0;filter:brightness(5)}60%{filter:brightness(2.2)}}' +
    '@keyframes fx-o-fade{to{opacity:0}}@keyframes fx-o-dissolve{to{opacity:0;filter:blur(14px)}}' +
    '@keyframes fx-o-slide-left{to{transform:translateX(-100%)}}@keyframes fx-o-slide-up{to{transform:translateY(-100%)}}' +
    '@keyframes fx-o-zoom-in{to{opacity:0;transform:scale(1.4)}}@keyframes fx-o-wipe{from{clip-path:inset(0 0 0 0)}to{clip-path:inset(0 0 0 100%)}}' +
    '@keyframes fx-o-flash{40%{opacity:1;filter:brightness(4)}to{opacity:0;filter:brightness(4)}}' +
    '@keyframes fx-si-fade{from{opacity:0}}@keyframes fx-si-rise{from{opacity:0;transform:translateY(.7em)}}@keyframes fx-si-drop{from{opacity:0;transform:translateY(-.7em)}}@keyframes fx-si-pop{from{opacity:0;transform:scale(.8)}}' +
    '@keyframes fx-si-zoom{from{opacity:0;transform:scale(1.7)}}@keyframes fx-si-blur{from{opacity:0;filter:blur(.4em)}}@keyframes fx-si-slide-l{from{opacity:0;transform:translateX(-1.5em)}}@keyframes fx-si-slide-r{from{opacity:0;transform:translateX(1.5em)}}' +
    '@keyframes fx-si-bounce{from{opacity:0;transform:translateY(1.2em) scale(.9)}}@keyframes fx-si-flip{from{opacity:0;transform:perspective(20em) rotateX(90deg)}}' +
    '@keyframes fx-so-fade{to{opacity:0}}@keyframes fx-so-fall{to{opacity:0;transform:translateY(.7em)}}@keyframes fx-so-lift{to{opacity:0;transform:translateY(-.7em)}}@keyframes fx-so-shrink{to{opacity:0;transform:scale(.8)}}' +
    '@keyframes fx-so-blur{to{opacity:0;filter:blur(.4em)}}@keyframes fx-so-slide-l{to{opacity:0;transform:translateX(-1.5em)}}@keyframes fx-so-slide-r{to{opacity:0;transform:translateX(1.5em)}}' +
    '@keyframes fx-se-pulse{50%{transform:scale(1.07)}}@keyframes fx-se-float{50%{transform:translateY(-.18em)}}@keyframes fx-se-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-.06em)}40%{transform:translateX(.06em)}60%{transform:translateX(-.04em)}80%{transform:translateX(.04em)}}' +
    '@keyframes fx-se-blink{50%{opacity:.35}}@keyframes fx-se-wobble{25%{transform:rotate(-2.5deg)}75%{transform:rotate(2.5deg)}}@keyframes fx-se-glow{50%{filter:brightness(1.6) drop-shadow(0 0 .25em currentColor)}}';
  function injectCss() {
    if (typeof document === 'undefined' || document.getElementById('fx-css')) return;
    var s = document.createElement('style'); s.id = 'fx-css'; s.textContent = css + CUSTOM_FONTS.map(function (c) { return '@font-face{font-family:"' + c[2] + '";src:url("' + NOONNU + encodeURI(c[3]) + '");font-weight:100 900;font-display:swap}'; }).join(''); document.head.appendChild(s);
    [FONT_CSS, FONT_CSS2].forEach(function (u) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = u; document.head.appendChild(l); });
  }

  function voices() { try { return (root.speechSynthesis && root.speechSynthesis.getVoices()) || []; } catch (e) { return []; } }
  function pickVoice(name) {
    var all = voices(); if (!all.length) return null;
    var v = name && all.filter(function (x) { return x.name === name || x.voiceURI === name; })[0];
    return v || all.filter(function (x) { return /^ko/i.test(x.lang); })[0] || null;
  }

  // box 안에서 클립 하나를 재생한다. o = { clip, url, defaults, onend, onerror, audioUrl(음성 파일 키→주소), silent(소리 끔), freeze(첫 자막을 정지 화면으로) }. { stop } 반환.
  function play(box, o) {
    injectCss();
    var clip = o.clip, fx = resolve(clip.fx, o.defaults), cues = cuesOf(clip);
    var done = false, ended = false, raf = 0, timers = [], idx = -2, curCue = null, typed = -1;
    var wrap = document.createElement('div'); wrap.className = 'fx-wrap';
    var stage = document.createElement('div'); stage.className = 'fx-stage';
    var pos = document.createElement('div'); pos.className = 'fx-pos'; pos.style.left = fx.sub.x + '%'; pos.style.width = fx.sub.w + '%'; pos.style.textAlign = fx.sub.align;
    var vert = fx.sub.y >= 0; // 세로 위치를 직접 지정하면 간단 위치(위/가운데/아래)는 무시
    pos.dataset.pos = vert ? 'custom' : fx.sub.pos; if (vert) pos.style.top = fx.sub.y + '%';
    pos.style.transform = 'translate(-50%,' + ((vert || fx.sub.pos === 'middle') ? '-50%' : '0') + ')' + (fx.sub.rot ? ' rotate(' + fx.sub.rot + 'deg)' : '');
    var v = null;
    if (o.url) { v = document.createElement('video'); v.playsInline = true; v.style.objectFit = fx.video.fit; stage.appendChild(v); }
    if (!o.url) stage.style.background = 'linear-gradient(160deg,#1c2340,#0a0c14 70%)';
    stage.appendChild(pos); wrap.appendChild(stage); box.innerHTML = ''; box.appendChild(wrap);
    wrap.style.setProperty('--fxd', fx.trans.dur + 's'); stage.style.setProperty('--fxd', fx.trans.dur + 's');
    if (fx.trans['in'] !== 'cut') stage.style.animationName = 'fx-i-' + fx.trans['in'];

    var wantVoice = fx.voice.on === 'on' && !o.silent && !o.freeze, eleven = fx.voice.engine === 'eleven';
    var speaking = wantVoice && !!root.speechSynthesis, audios = [];
    var audioUrl = o.audioUrl || function (k) { return '/api/clipfile?k=' + encodeURIComponent(k); };
    // 일레븐랩스로 미리 만든 음성 파일이 있으면 그것을, 없거나 실패하면 브라우저 음성으로 대신 읽는다
    function sayCue(cue) {
      audios.forEach(function (a) { a.pause(); }); audios = [];
      if (eleven && cue.a) {
        var au = new Audio(audioUrl(cue.a)); au.volume = fx.voice.vol; audios.push(au);
        var pr = au.play(); if (pr && pr.catch) pr.catch(function () { speak(cue.t); });
        au.onerror = function () { speak(cue.t); };
      } else speak(cue.t);
    }
    function speak(text) {
      if (!speaking || !text) return;
      try {
        var u = new SpeechSynthesisUtterance(text), vv = pickVoice(fx.voice.name);
        u.lang = vv ? vv.lang : 'ko-KR'; if (vv) u.voice = vv;
        u.rate = fx.voice.rate; u.pitch = fx.voice.pitch; u.volume = fx.voice.vol;
        root.speechSynthesis.speak(u);
      } catch (e) {}
    }
    function later(fn, sec) { timers.push(setTimeout(function () { if (!done) fn(); }, Math.max(0, sec) * 1000)); }

    function hex(c, d) { return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : d; }
    function rgba(c, al) { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join(''); var n = parseInt(c.slice(0, 6), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + al + ')'; }
    var outed = false, subEl = null;
    // 자막 한 줄의 요소를 만든다 (글자·테두리·그림자·배경·등장/강조 효과 반영)
    function buildSub(text) {
      var S = fx.sub, el = document.createElement('div'), inner = document.createElement('span'), st = el.style, fr = !!o.freeze;
      el.className = 'fx-sub'; inner.className = 'fx-inner';
      var col = hex(S.colorHex, COLORS[S.color] || COLORS.ivory);
      st.color = col; st.fontSize = (S.fs > 0 ? S.fs : (SIZES[S.size] || 5)) * (FONT_SCALE[S.font] || 1) + 'cqw';
      st.fontFamily = FONTS[S.font] || FONTS.gothic; st.fontWeight = S.weight; st.fontStyle = S.italic; st.lineHeight = S.lh; st.letterSpacing = (S.ls / 100) + 'em';
      st.padding = (S.padY / 100) + 'em ' + (S.padX / 100) + 'em'; st.borderRadius = (S.bgRadius / 100) + 'em';
      if (S.bg !== 'none') st.background = rgba(hex(S.bgColor, '#000000'), S.bgOpacity >= 0 ? S.bgOpacity / 100 : (S.bg === 'box' ? 0.82 : 0.45));
      if (S.strokeW > 0) { st.webkitTextStroke = (S.strokeW / 100) + 'em ' + hex(S.strokeColor, '#000000'); st.paintOrder = 'stroke fill'; }
      var sh = [];
      if (S.shOn === 'on') sh.push((S.shX / 100) + 'em ' + (S.shY / 100) + 'em ' + (S.shBlur / 100) + 'em ' + hex(S.shColor, '#000000'));
      if (S.glowBlur > 0) { var gc = hex(S.glowColor, col), g = S.glowBlur / 100; sh.push('0 0 ' + g + 'em ' + gc, '0 0 ' + (g * 2) + 'em ' + gc); }
      if (sh.length) st.textShadow = sh.join(',');
      var seq = S.anim === 'word' || S.anim === 'char';
      if (!fr && S.anim !== 'none' && S.anim !== 'type' && !seq) st.animation = 'fx-si-' + S.anim + ' ' + S.animDur + 's ' + (S.anim === 'bounce' ? 'cubic-bezier(.34,1.56,.64,1)' : 'ease') + ' both';
      if (!fr && S.emph !== 'none') inner.style.animation = 'fx-se-' + S.emph + ' ' + S.emphSpeed + 's ease-in-out infinite';
      if (!fr && S.anim === 'type') inner.textContent = '';
      else if (!fr && seq) {
        var k = 0;
        text.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { inner.appendChild(document.createTextNode(tok)); return; }
          var wrapW = document.createElement('span'); wrapW.className = 'fx-w';
          (S.anim === 'char' ? Array.from(tok) : [tok]).forEach(function (part) {
            var sp = document.createElement('span'); sp.className = 'fx-w'; sp.textContent = part;
            sp.style.animation = 'fx-si-rise ' + Math.max(S.animDur, 0.25) + 's ease both'; sp.style.animationDelay = (k++ * S.wordDelay) + 's'; wrapW.appendChild(sp);
          });
          inner.appendChild(wrapW);
        });
      } else inner.textContent = text;
      el.appendChild(inner); return el;
    }
    function showCue(t) {
      var i = -1;
      for (var k = 0; k < cues.length; k++) if (cues[k].s <= t && t < cues[k].e) { i = k; break; }
      if (i !== idx) {
        idx = i; curCue = i >= 0 ? cues[i] : null; typed = -1; outed = false; pos.innerHTML = ''; subEl = null;
        if (!curCue) return;
        subEl = buildSub(curCue.t); pos.appendChild(subEl);
        if (wantVoice && (fx.voice.mode === 'cue' || eleven)) { var cue = curCue; later(function () { try { root.speechSynthesis.cancel(); } catch (e) {} sayCue(cue); }, fx.voice.delay); }
      }
      if (!curCue || o.freeze) return;
      if (!outed && fx.sub.animOut !== 'none' && curCue.e < 1e8 && t >= curCue.e - fx.sub.animOutDur) {
        outed = true; subEl.style.animation = 'fx-so-' + fx.sub.animOut + ' ' + fx.sub.animOutDur + 's ease both';
      }
      if (fx.sub.anim === 'type') {
        var n = Math.min(curCue.t.length, Math.floor((t - curCue.s) * fx.sub.typeSpeed) + 1);
        if (n !== typed) { typed = n; subEl.firstChild.textContent = curCue.t.slice(0, n); }
      }
    }
    function finish() { if (done) return; done = true; clearInterval(raf); if (o.onend) o.onend(); }
    function endMedia() {
      if (ended) return; ended = true;
      if (v) v.pause();
      var d = fx.trans.dur, outCut = fx.trans.out === 'cut';
      if (!outCut) { stage.style.animationName = 'fx-o-' + fx.trans.out; }
      later(finish, Math.max(fx.video.hold, outCut ? 0 : d));
    }
    var t0 = 0, total = 0;
    function tick() {
      if (done) return;
      var t;
      if (v) { t = v.currentTime - fx.video.trimStart; if (!ended && (v.ended || (fx.video.trimEnd > 0 && v.currentTime >= fx.video.trimEnd))) endMedia(); }
      else { t = (performance.now() - t0) / 1000; if (!ended && t >= total) endMedia(); }
      if (!ended) showCue(t); else if (v) showCue(t);
      
    }
    function start() {
      if (fx.voice.mode === 'whole' && !eleven && speaking) { var all = cues.map(function (c) { return c.t; }).join(' '); later(function () { speak(all); }, fx.voice.delay); }
      t0 = performance.now(); raf = setInterval(tick, 50);
    }
    if (o.freeze) {
      stage.style.animationName = 'none';
      if (v) { v.src = o.url; v.muted = true; v.preload = 'metadata'; v.onloadedmetadata = function () { try { v.currentTime = fx.video.trimStart || 0.1; } catch (e) {} }; }
      showCue(cues[0] ? cues[0].s : 0);
      return { stop: function () { if (v) v.pause(); } };
    }
    if (v) {
      v.src = o.url; v.playbackRate = fx.video.speed; v.volume = fx.video.vol; if (o.silent) v.muted = true;
      v.onerror = function () { if (!done) { done = true; clearInterval(raf); box.innerHTML = '<div class="ph err" style="padding:24px;text-align:center;color:#FF8A78">영상을 불러오지 못했습니다</div>'; if (o.onerror) o.onerror(); } };
      v.onloadedmetadata = function () { if (fx.video.trimStart > 0) try { v.currentTime = fx.video.trimStart; } catch (e) {} };
      var go = v.play(); if (go && go.catch) go.catch(function () { v.muted = true; v.play().catch(function () {}); });
      start();
    } else {
      var last = cues.filter(function (c) { return c.e < 1e8; }).reduce(function (m, c) { return Math.max(m, c.e); }, 0);
      total = Math.max(last, 4); start();
    }
    return { stop: function () { done = true; clearInterval(raf); timers.forEach(clearTimeout); try { root.speechSynthesis.cancel(); } catch (e) {} audios.forEach(function (a) { a.pause(); }); if (v) v.pause(); } };
  }

  root.MovingFx = { folderDefaults: folderDefaults, FIELDS: FIELDS, BUILTIN: BUILTIN, resolve: resolve, cuesOf: cuesOf, play: play, voices: voices };
})(typeof window !== 'undefined' ? window : globalThis);
