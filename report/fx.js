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
  var VOICE_ENGINE = [['browser', '브라우저 음성 (무료, 기기마다 음색 다름)'], ['eleven', '일레븐랩스 (미리 만든 음성 파일, 모든 기기 동일)'], ['openai', 'OpenAI 음성 (미리 만든 음성 파일, 모든 기기 동일)']];
  var OA_VOICES = [['alloy', 'alloy (중성적)'], ['ash', 'ash (차분한 남성)'], ['ballad', 'ballad (부드러운 감성)'], ['coral', 'coral (따뜻한 여성)'], ['echo', 'echo (남성)'], ['fable', 'fable (이야기꾼)'], ['nova', 'nova (밝은 여성)'], ['onyx', 'onyx (낮은 남성)'], ['sage', 'sage (침착한)'], ['shimmer', 'shimmer (맑은 여성)'], ['verse', 'verse (표현력 있는)'], ['marin', 'marin (자연스러운 여성)'], ['cedar', 'cedar (깊은 남성)']];
  var OA_MODELS = [['gpt-4o-mini-tts', 'gpt-4o-mini-tts (최신·말투 지시 가능, 권장)'], ['tts-1', 'tts-1 (빠름)'], ['tts-1-hd', 'tts-1-hd (고음질)']];
  var EL_MODELS = [['eleven_multilingual_v2', 'Multilingual v2 (안정적, 기본 추천)'], ['eleven_v3', 'v3 (표현력 최고, 안정성은 0 / 0.5 / 1 권장)'], ['eleven_flash_v2_5', 'Flash v2.5 (빠르고 저렴)'], ['eleven_turbo_v2_5', 'Turbo v2.5']];
  var VOICE_FIT = [['stretch', '자막·영상을 늘려서 목소리를 끝까지 읽기 (권장)'], ['off', '정해 둔 시간 그대로 (목소리가 길면 다음 줄에서 끊김)']];
  var VOICE_MODE = [['cue', '자막 줄마다 (자막과 동기)'], ['whole', '전체를 한 번에']];
  var LOOP = [['auto', '영상을 처음부터 다시 반복'], ['reverse', '거꾸로 재생해서 왕복 반복 (앞→뒤→앞…)'], ['black', '검은 배경 유지 (영상이 끝나면 검은 화면에서 자막·음성 계속)'], ['freeze', '마지막 화면 정지 유지'], ['off', '반복 안 함 (영상이 끝나면 클립 종료)']];
  var FIT = [['contain', '전체 보이게 (여백)'], ['cover', '화면 가득 (잘림)']];

  // 폼 구성용 명세: [키, 이름, 형식, 선택지 또는 {min,max,step}]
  // 서버(functions/api/clips.js)의 검증표와 같은 범위를 쓴다. 한쪽을 바꾸면 다른 쪽도 바꿀 것.
  var FIELDS = [
    { g: 'trans', title: '장면 전환', items: [['in', '들어올 때', 'sel', TR_IN], ['out', '나갈 때', 'sel', TR_OUT], ['dur', '전환 시간(초)', 'num', { min: 0.1, max: 3, step: 0.1 }]] },
    { g: 'sub', title: '자막 글자', items: [['font', '글씨체', 'sel', SUB_FONT], ['weight', '굵기', 'sel', SUB_WEIGHT], ['italic', '기울임', 'sel', SUB_ITALIC], ['size', '크기(간단)', 'sel', SUB_SIZE], ['fs', '크기(세부, 화면폭의 %)', 'num', { min: 2, max: 14, step: 0.1 }], ['color', '글자색(간단)', 'sel', SUB_COLOR], ['colorHex', '글자색 직접', 'color'], ['align', '정렬', 'sel', SUB_ALIGN], ['lh', '줄 간격(배)', 'num', { min: 1, max: 2.5, step: 0.05 }], ['ls', '자간(글자 크기의 %)', 'num', { min: -5, max: 30, step: 1 }]] },
    { g: 'sub', title: '자막 위치·크기', items: [['pos', '위치(간단)', 'sel', SUB_POS], ['x', '가로 위치 (왼쪽 끝 0 ~ 오른쪽 끝 100%)', 'num', { min: 0, max: 100, step: 1 }], ['y', '세로 위치 (위 0 ~ 아래 100%), 지정하면 간단 위치 무시', 'num', { min: 0, max: 100, step: 1 }], ['w', '자막 폭(화면폭의 %)', 'num', { min: 20, max: 100, step: 1 }], ['rot', '기울기(도)', 'num', { min: -30, max: 30, step: 1 }]] },
    { g: 'sub', title: '테두리·그림자·글로우', items: [['strokeW', '테두리 두께 (0=없음, 글자 크기의 %)', 'num', { min: 0, max: 15, step: 0.5 }], ['strokeColor', '테두리 색', 'color'], ['shOn', '그림자', 'sel', ON_OFF], ['shX', '그림자 가로 이동(%)', 'num', { min: -30, max: 30, step: 1 }], ['shY', '그림자 세로 이동(%)', 'num', { min: -30, max: 30, step: 1 }], ['shBlur', '그림자 번짐(%)', 'num', { min: 0, max: 60, step: 1 }], ['shColor', '그림자 색', 'color'], ['glowBlur', '글로우 세기 (0=없음)', 'num', { min: 0, max: 80, step: 1 }], ['glowColor', '글로우 색 (비우면 글자색)', 'color']] },
    { g: 'sub', title: '자막 배경 박스', items: [['bg', '배경', 'sel', SUB_BG], ['bgColor', '배경 색', 'color'], ['bgOpacity', '배경 투명도 (0 투명~100 불투명, 비우면 프리셋)', 'num', { min: 0, max: 100, step: 1 }], ['bgRadius', '모서리 둥글기(%)', 'num', { min: 0, max: 100, step: 1 }], ['padX', '좌우 여백(글자 크기의 %)', 'num', { min: 0, max: 200, step: 5 }], ['padY', '상하 여백(글자 크기의 %)', 'num', { min: 0, max: 100, step: 5 }]] },
    { g: 'sub', title: '자막 등장·퇴장·강조 효과', items: [['readCps', '자막 읽는 속도 (초당 글자 수). 글자가 많은데 시간이 짧으면 표시 시간을 늘림, 0 = 사용 안 함', 'num', { min: 0, max: 30, step: 0.5 }, { wide: true }], ['anim', '나타나는 효과', 'sel', SUB_ANIM], ['animDur', '나타나는 시간(초)', 'num', { min: 0.1, max: 3, step: 0.1 }], ['wordDelay', '단어/글자 순차 간격(초)', 'num', { min: 0.02, max: 1, step: 0.01 }], ['typeSpeed', '타자기 속도(초당 글자 수)', 'num', { min: 3, max: 60, step: 1 }], ['animOut', '사라지는 효과', 'sel', SUB_ANIM_OUT], ['animOutDur', '사라지는 시간(초)', 'num', { min: 0.1, max: 3, step: 0.1 }], ['emph', '떠 있는 동안 효과', 'sel', SUB_EMPH], ['emphSpeed', '효과 주기(초, 작을수록 빠름)', 'num', { min: 0.3, max: 6, step: 0.1 }]] },
    { g: 'voice', title: '목소리 설정', items: [
      ['on', '목소리 읽기', 'sel', ON_OFF], ['engine', '목소리 엔진', 'sel', VOICE_ENGINE],
      ['vol', '볼륨(0~1)', 'num', { min: 0, max: 1, step: 0.1 }], ['delay', '읽기 시작 지연(초)', 'num', { min: 0, max: 10, step: 0.1 }],
      ['fit', '목소리가 자막 시간보다 길 때', 'sel', VOICE_FIT, { wide: true }], ['pad', '목소리가 끝난 뒤 여유(초)', 'num', { min: 0, max: 3, step: 0.1 }],
      ['name', '브라우저 목소리', 'voice', null, { only: 'browser', wide: true }], ['mode', '읽는 방식', 'sel', VOICE_MODE, { only: 'browser' }],
      ['rate', '속도', 'num', { min: 0.5, max: 2, step: 0.1 }, { only: 'browser' }], ['pitch', '음높이', 'num', { min: 0.5, max: 2, step: 0.1 }, { only: 'browser' }],
      ['elVoice', '일레븐랩스 목소리 (자막 줄마다 음성 파일을 만들어 씁니다)', 'elvoice', null, { only: 'eleven', wide: true }], ['elModel', '모델', 'sel', EL_MODELS, { only: 'eleven', wide: true }],
      ['oaVoice', 'OpenAI 목소리 (자막 줄마다 음성 파일을 만들어 씁니다)', 'oavoice', OA_VOICES, { only: 'openai', wide: true }], ['oaModel', '모델', 'sel', OA_MODELS, { only: 'openai', wide: true }],
      ['oaInstr', '말투 지시 (gpt-4o-mini-tts 전용. 예: 차분하고 신비로운 낭독체로, 천천히)', 'text', { max: 400 }, { only: 'openai', wide: true }], ['oaSpeed', '말 속도', 'num', { min: 0.5, max: 2, step: 0.05 }, { only: 'openai' }],
      ['elStability', '안정성 (낮을수록 감정 풍부)', 'num', { min: 0, max: 1, step: 0.05 }, { only: 'eleven' }], ['elSimilarity', '목소리 유사도', 'num', { min: 0, max: 1, step: 0.05 }, { only: 'eleven' }],
      ['elStyle', '스타일 과장', 'num', { min: 0, max: 1, step: 0.05 }, { only: 'eleven' }], ['elSpeed', '말 속도', 'num', { min: 0.7, max: 1.2, step: 0.05 }, { only: 'eleven' }]] },
    { g: 'video', title: '영상 재생', items: [['speed', '재생 속도', 'num', { min: 0.25, max: 2, step: 0.05 }], ['vol', '영상 소리 볼륨 (0~1, 0 = 소리 끔)', 'num', { min: 0, max: 1, step: 0.05 }], ['duck', '목소리가 나올 때 영상 소리 줄이기', 'sel', ON_OFF], ['duckVol', '줄였을 때 영상 소리 볼륨(0~1)', 'num', { min: 0, max: 1, step: 0.05 }], ['fadeIn', '영상 소리 페이드 인(초)', 'num', { min: 0, max: 5, step: 0.1 }], ['fadeOut', '영상 소리 페이드 아웃(초)', 'num', { min: 0, max: 5, step: 0.1 }], ['fit', '화면 맞춤', 'sel', FIT], ['loop', '자막·음성이 영상보다 길 때', 'sel', LOOP, { wide: true }], ['trimStart', '앞부분 자르기(초)', 'num', { min: 0, max: 600, step: 0.1 }], ['trimEnd', '끝 지점(초, 0=끝까지)', 'num', { min: 0, max: 600, step: 0.1 }], ['hold', '마지막 화면 유지(초)', 'num', { min: 0, max: 10, step: 0.1 }]] },
  ];

  var BUILTIN = {
    trans: { 'in': 'fade', out: 'fade', dur: 0.5 },
    sub: { font: 'gothic', weight: '700', italic: 'normal', size: 'M', fs: 0, color: 'ivory', colorHex: '', align: 'center', lh: 1.45, ls: 0, pos: 'bottom', x: 50, y: -1, w: 90, rot: 0, strokeW: 0, strokeColor: '#000000', shOn: 'on', shX: 0, shY: 6, shBlur: 20, shColor: '#000000', glowBlur: 0, glowColor: '', bg: 'shade', bgColor: '', bgOpacity: -1, bgRadius: 30, padX: 60, padY: 20, anim: 'fade', animDur: 0.4, wordDelay: 0.08, typeSpeed: 14, animOut: 'fade', animOutDur: 0.3, emph: 'none', emphSpeed: 1.5, readCps: 8 },
    voice: { on: 'off', engine: 'browser', name: '', mode: 'cue', rate: 1, pitch: 1, vol: 1, delay: 0.2, fit: 'stretch', pad: 0.3, elVoice: '', elModel: 'eleven_multilingual_v2', elStability: 0.5, elSimilarity: 0.75, elStyle: 0, elSpeed: 1, oaVoice: 'coral', oaModel: 'gpt-4o-mini-tts', oaInstr: '', oaSpeed: 1 },
    video: { speed: 1, vol: 1, duck: 'off', duckVol: 0.3, fadeIn: 0, fadeOut: 0, fit: 'contain', loop: 'auto', trimStart: 0, trimEnd: 0, hold: 0.5 },
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
  // 자막·목소리가 길면 그만큼 자막 시각을 늘리고, 뒤의 모든 줄을 같은 만큼 뒤로 민다(줄 사이 간격은 그대로).
  // 한 줄에 필요한 시간 = max(목소리 길이 + 시작 지연 + 여유, 글자 수 ÷ 자막 읽는 속도). 늘어난 전체 길이는 영상 반복 설정(fx.video.loop)이 이어 받아 영상도 그만큼 길어진다.
  // 목소리 길이: 일레븐랩스/OpenAI 음성은 만든 파일의 실제 길이(d), 그 밖에는 글자 수로 추정한다(브라우저 음성 약 0.18초/글자, 속도로 나눔).
  function stretchCues(cues, fx) {
    var V = fx.voice, cps = fx.sub.readCps > 0 ? fx.sub.readCps : 0;
    var voiceOn = V.on === 'on' && V.fit !== 'off' && !(V.engine === 'browser' && V.mode === 'whole');
    if (!voiceOn && !cps) return { cues: cues, added: 0 };
    var file = V.engine === 'eleven' || V.engine === 'openai', rate = (V.engine === 'openai' ? V.oaSpeed : V.engine === 'eleven' ? V.elSpeed : V.rate) || 1, shift = 0;
    var out = cues.map(function (c) {
      var a = { t: c.t, s: c.s + shift, e: c.e + shift, a: c.a, d: c.d };
      if (c.e >= 1e8) return a; // 영상 내내 표시하는 자막은 그대로
      var chars = c.t.replace(/\s+/g, '').length, need = 0, cur = c.e - c.s;
      if (voiceOn) need = (V.delay || 0) + ((file && c.a && c.d > 0) ? c.d : chars * 0.18 / rate) + (V.pad || 0);
      if (cps) need = Math.max(need, chars / cps);
      if (need > cur) { shift += need - cur; a.e = a.s + need; }
      return a;
    });
    return { cues: out, added: shift };
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

  // box 안에서 클립 하나를 재생한다. o = { clip, url, defaults, onend, onerror, audioUrl(음성 파일 키→주소), silent(영상·목소리 모두 끔), muteVideo/muteVoice(각각 끔), minContent(자막·음성 길이를 이만큼으로 늘려 반복 동작 확인), onStatus(진행 상태 콜백), freeze(자막 한 줄을 정지 화면으로, freezeIndex = 몇 번째 줄), edit(정지 화면에서 직접 편집 콜백) }. { stop } 반환.
  function play(box, o) {
    injectCss();
    var clip = o.clip, fx = resolve(clip.fx, o.defaults), stretched = stretchCues(cuesOf(clip), fx), cues = stretched.cues, stretchAdded = stretched.added;
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

    var wantVoice = fx.voice.on === 'on' && !o.silent && !o.muteVoice && !o.freeze, eleven = fx.voice.engine === 'eleven' || fx.voice.engine === 'openai'; // 미리 만든 음성 파일을 쓰는 엔진
    var speaking = wantVoice && !!root.speechSynthesis, audios = [];
    var audioUrl = o.audioUrl || function (k) { return '/api/clipfile?k=' + encodeURIComponent(k); };
    // 일레븐랩스로 미리 만든 음성 파일이 있으면 그것을, 없거나 실패하면 브라우저 음성으로 대신 읽는다
    function sayCue(cue) {
      if (fx.voice.fit === 'off') { audios.forEach(function (a) { a.pause(); }); audios = []; }
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
    // 직접 편집: 끌어서 위치, 오른쪽 손잡이로 줄바꿈 폭, 모서리 손잡이로 글자 크기, 더블클릭으로 문장(Enter = 줄바꿈).
    // o.edit = { onMove(x%, y%), onResize({ w%, fs }), onText(줄 번호, 문장) }. 값은 호출한 쪽이 입력칸에 반영한다.
    function attachEdit(el, index) {
      var ed = o.edit, S = fx.sub, inner = el.firstChild;
      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
      function r1(v) { return Math.round(v * 10) / 10; }
      function handle(css, cursor) {
        var h = document.createElement('div');
        h.style.cssText = 'position:absolute;width:13px;height:13px;background:#E0BC74;border:2px solid #0A0C14;border-radius:3px;pointer-events:auto;touch-action:none;z-index:3;cursor:' + cursor + ';' + css;
        return h;
      }
      pos.style.pointerEvents = 'none'; pos.style.outline = '1px dashed rgba(224,188,116,.8)';
      el.style.pointerEvents = 'auto'; el.style.cursor = 'move'; el.style.outline = '1px solid rgba(224,188,116,.95)'; el.style.position = 'relative'; el.style.touchAction = 'none'; el.style.userSelect = 'none';
      var guide = document.createElement('div'); guide.style.cssText = 'position:absolute;left:50%;top:0;bottom:0;width:0;border-left:1px dashed rgba(98,194,174,.9);display:none;pointer-events:none;z-index:2'; wrap.appendChild(guide);
      function drag(target, onStart) { // 포인터를 잡고 끄는 공통 처리. onStart가 { move(dx,dy), end() }를 돌려준다
        target.addEventListener('pointerdown', function (e) {
          if (!(e.target === target || e.target === inner) || inner.isContentEditable) return; // 글자를 눌러도 끌 수 있다(손잡이는 각자 따로 처리)
          e.preventDefault(); e.stopPropagation();
          var sx = e.clientX, sy = e.clientY, st = onStart(), moved = false; target.setPointerCapture(e.pointerId);
          function mv(ev) { moved = true; st.move(ev.clientX - sx, ev.clientY - sy); }
          function up() { target.removeEventListener('pointermove', mv); target.removeEventListener('pointerup', up); guide.style.display = 'none'; if (moved) st.end(); }
          target.addEventListener('pointermove', mv); target.addEventListener('pointerup', up);
        });
      }
      // 이동 (가로 가운데 근처에서 자석처럼 붙는다)
      function place(xp, yp) {
        pos.dataset.pos = 'custom'; pos.style.left = xp + '%'; pos.style.top = yp + '%'; pos.style.bottom = 'auto';
        pos.style.transform = 'translate(-50%,-50%)' + (S.rot ? ' rotate(' + S.rot + 'deg)' : '');
      }
      drag(el, function () {
        var wr = wrap.getBoundingClientRect(), r = el.getBoundingClientRect(), cx0 = r.left + r.width / 2 - wr.left, cy0 = r.top + r.height / 2 - wr.top, last = null;
        return {
          move: function (dx, dy) {
            var xp = clamp(cx0 + dx, 0, wr.width) / wr.width * 100, yp = clamp(cy0 + dy, 0, wr.height) / wr.height * 100, snap = Math.abs(xp - 50) < 1.5;
            if (snap) xp = 50; guide.style.display = snap ? 'block' : 'none'; place(xp, yp); last = [xp, yp];
          },
          end: function () { if (last) ed.onMove(r1(last[0]), r1(last[1])); },
        };
      });
      // 폭 (줄바꿈 기준): 오른쪽 가장자리 손잡이
      var hw = handle('right:-8px;top:50%;margin-top:-7px', 'ew-resize'); pos.appendChild(hw);
      drag(hw, function () {
        var wr = wrap.getBoundingClientRect(), w0 = pos.getBoundingClientRect().width, pct = null;
        return {
          move: function (dx) { pct = clamp(w0 + 2 * dx, wr.width * 0.2, wr.width) / wr.width * 100; pos.style.width = pct + '%'; },
          end: function () { ed.onResize({ w: r1(pct) }); },
        };
      });
      // 글자 크기: 자막 오른쪽 아래 모서리 손잡이
      var hs = handle('right:-8px;bottom:-8px', 'nwse-resize'); el.appendChild(hs);
      drag(hs, function () {
        var w0 = el.getBoundingClientRect().width, b0 = S.fs > 0 ? S.fs : (SIZES[S.size] || 5), nb = b0;
        return {
          move: function (dx) { nb = clamp(b0 * clamp((w0 + dx) / w0, 0.4, 3), 2, 14); el.style.fontSize = nb * (FONT_SCALE[S.font] || 1) + 'cqw'; },
          end: function () { ed.onResize({ fs: r1(nb) }); },
        };
      });
      // 문장 편집: 더블클릭 → 입력, Enter = 줄바꿈, 바깥을 누르거나 Esc = 완료
      if (ed.onText) {
        el.addEventListener('dblclick', function () {
          if (inner.isContentEditable) return;
          try { inner.contentEditable = 'plaintext-only'; } catch (e) { inner.contentEditable = 'true'; }
          if (!inner.isContentEditable) inner.contentEditable = 'true';
          el.style.cursor = 'text'; inner.focus();
          var range = document.createRange(); range.selectNodeContents(inner); range.collapse(false); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        });
        inner.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); inner.blur(); } e.stopPropagation(); });
        inner.addEventListener('blur', function () { if (!inner.isContentEditable) return; inner.contentEditable = 'false'; ed.onText(index, inner.textContent.replace(/\n+$/, '')); });
      }
    }
    function showCue(t) {
      var i = -1;
      for (var k = 0; k < cues.length; k++) if (cues[k].s <= t && t < cues[k].e) { i = k; break; }
      if (i !== idx) {
        idx = i; curCue = i >= 0 ? cues[i] : null; typed = -1; outed = false; pos.innerHTML = ''; subEl = null;
        if (!curCue) return;
        subEl = buildSub(curCue.t); pos.appendChild(subEl);
        if (wantVoice && (fx.voice.mode === 'cue' || eleven)) { var cue = curCue; later(function () { if (fx.voice.fit === 'off') { try { root.speechSynthesis.cancel(); } catch (e) {} } sayCue(cue); }, fx.voice.delay); }
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
    // 자막·음성이 끝나는 시각(재생 시작 기준 초). 일레븐랩스 음성은 길이를 알 때 시작 지연까지 더해 계산한다.
    var contentEnd = 0;
    cues.forEach(function (c) {
      if (c.e < 1e8) contentEnd = Math.max(contentEnd, c.e);
      if (fx.voice.on === 'on' && eleven && c.a && c.d > 0) contentEnd = Math.max(contentEnd, c.s + (fx.voice.delay || 0) + c.d);
    });
    if (o.minContent > 0) contentEnd = Math.max(contentEnd, o.minContent); // 미리보기에서 반복 동작을 확인하려고 자막·음성 길이를 늘려 본다
    // 자막·음성이 영상보다 길 때(contentEnd) 영상 처리 방식 fx.video.loop:
    //   auto = 처음부터 다시 반복 / reverse = 거꾸로 재생해 왕복 / black = 영상이 끝나면 검은 화면 유지 / freeze = 마지막 화면 정지 / off = 영상이 끝나면 종료
    // 자막 시각 t는 구간(영상 한 번 재생 또는 되감기)을 이어 붙인 누적 시간이다. base = 지금 구간이 시작된 누적 시각.
    var mode = fx.video.loop, base = 0, segLen = 0, dir = 1, phase = 'play', tailAt = 0, loopAt = 0, revAt = 0, revFrom = 0, seg = 1, lastStatus = 0;
    function more(nextBase) { return segLen > 0.3 && nextBase < contentEnd - 0.05; } // 이 구간 뒤에도 자막·음성이 남아 있나
    function seekStart() { try { v.currentTime = fx.video.trimStart; } catch (e) {} }
    function playV() { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
    function videoEnded() { // 영상이 끝에 닿았을 때(앞으로 재생 중)
      if (ended || !v || phase !== 'play' || dir < 0 || performance.now() - loopAt < 400) return;
      var next = base + segLen; loopAt = performance.now();
      if (mode === 'off' || !more(next)) return endMedia();
      base = next;
      if (mode === 'auto') { seg++; seekStart(); playV(); }
      else if (mode === 'reverse') { dir = -1; seg++; v.pause(); revAt = performance.now(); revFrom = v.currentTime; }
      else { phase = 'tail'; tailAt = performance.now(); v.pause(); if (mode === 'black') v.style.visibility = 'hidden'; }
    }
    function reverseStep(now) { // 거꾸로 재생: 영상은 일시정지한 채 시계에 맞는 위치로 되감아 간다.
      // 위치를 시계로 계산하므로 프레임이 느리게 디코딩돼도 속도는 유지되고(프레임만 건너뜀), 이전 탐색이 끝나기 전에는 새 탐색을 걸지 않는다.
      var target = revFrom - (now - revAt) / 1000 * fx.video.speed;
      if (target <= fx.video.trimStart + 0.02) { // 처음에 닿음 → 구간 끝
        var nb = base + segLen; if (!more(nb)) { base = nb; return endMedia(); }
        base = nb; dir = 1; seg++; loopAt = now; seekStart(); playV(); return;
      }
      if (!v.seeking) { try { v.currentTime = target; } catch (e) {} }
    }
    // 영상 소리 믹싱: 볼륨 × 페이드 인/아웃 × 더킹(목소리가 나오는 동안 영상 소리를 줄임). 더킹은 자막·음성 일정표로 계산하므로 목소리를 꺼 둔 미리보기에서도 확인된다.
    var duckCur = 1, lastAud = 0;
    function voiceActive(t) {
      if (fx.voice.on !== 'on') return false;
      for (var i = 0; i < cues.length; i++) {
        var c = cues[i], st = c.s + (fx.voice.delay || 0), len = (eleven && c.a && c.d > 0) ? c.d : Math.min(c.e - c.s, c.t.length * 0.2 / (fx.voice.rate || 1));
        if (t >= st && t < st + len) return true;
      }
      return false;
    }
    function updateAudio(t, now) {
      if (!v || phase === 'tail' || dir < 0) return;
      var dt = Math.min(0.2, (now - lastAud) / 1000), f = 1, V = fx.video; lastAud = now;
      if (V.fadeIn > 0) f = Math.min(f, Math.max(0, t) / V.fadeIn);
      var clipEnd = mode === 'off' ? segLen : Math.max(contentEnd, segLen);
      if (V.fadeOut > 0 && clipEnd > 0) f = Math.min(f, Math.max(0, clipEnd - t) / V.fadeOut);
      if (V.duck === 'on') duckCur += ((voiceActive(t) ? V.duckVol : 1) - duckCur) * Math.min(1, dt / 0.25);
      try { v.volume = Math.max(0, Math.min(1, V.vol * f * duckCur)); } catch (e) {}
    }
    // 미리보기 상태 표시용 (구간 번호·방향·진행)
    function status(t, now) {
      if (!o.onStatus || now - lastStatus < 100) return; lastStatus = now;
      o.onStatus({ t: t, end: Math.max(contentEnd, v ? 0 : total), seg: seg, dir: dir, phase: phase, mode: mode, hasVideo: !!v, segLen: segLen, vol: v ? v.volume : null, muted: v ? v.muted : false, stretch: stretchAdded });
    }
    var t0 = 0, total = 0;
    function tick() {
      if (done) return;
      var t, now = performance.now();
      if (v) {
        if (phase === 'tail') { // 영상이 끝난 뒤 검은 화면/마지막 화면으로 자막·음성만 이어 간다
          t = base + (now - tailAt) / 1000 * fx.video.speed; if (!ended && t >= contentEnd) endMedia();
        } else {
          var rel = v.currentTime - fx.video.trimStart;
          if (dir > 0 && base > 0 && now - loopAt < 400 && rel > segLen * 0.5) rel = 0; // 되감는 짧은 순간에 시각이 앞서 튀지 않게
          t = dir > 0 ? base + rel : base + Math.min(segLen, (now - revAt) / 1000 * fx.video.speed); // 거꾸로일 때는 시계로 계산해 탐색이 늦어도 자막이 멈추지 않는다
          if (!ended) {
            if (dir > 0) { if (v.ended || (fx.video.trimEnd > 0 && v.currentTime >= fx.video.trimEnd)) videoEnded(); }
            else reverseStep(now);
          }
        }
      }
      else { t = (now - t0) / 1000; if (!ended && t >= total) endMedia(); }
      if (v) updateAudio(t, now);
      status(t, now);
      if (!ended) showCue(t); else if (v) showCue(t);
    }
    function start() {
      if (fx.voice.mode === 'whole' && !eleven && speaking) { var all = cues.map(function (c) { return c.t; }).join(' '); later(function () { speak(all); }, fx.voice.delay); }
      t0 = performance.now(); raf = setInterval(tick, 50);
    }
    if (o.freeze) {
      stage.style.animationName = 'none';
      if (v) { v.src = o.url; v.muted = true; v.preload = 'metadata'; v.onloadedmetadata = function () { try { v.currentTime = fx.video.trimStart || 0.1; } catch (e) {} }; }
      var fi = cues.length ? Math.max(0, Math.min(o.freezeIndex || 0, cues.length - 1)) : -1;
      if (fi >= 0) { idx = fi; curCue = cues[fi]; subEl = buildSub(curCue.t); pos.appendChild(subEl); if (o.edit) attachEdit(subEl, fi); }
      return { stop: function () { if (v) v.pause(); } };
    }
    if (v) {
      v.src = o.url; v.playbackRate = fx.video.speed; v.volume = fx.video.vol; if (o.silent || o.muteVideo) v.muted = true;
      v.onerror = function () { if (!done) { done = true; clearInterval(raf); box.innerHTML = '<div class="ph err" style="padding:24px;text-align:center;color:#FF8A78">영상을 불러오지 못했습니다</div>'; if (o.onerror) o.onerror(); } };
      v.onloadedmetadata = function () {
        if (fx.video.trimStart > 0) try { v.currentTime = fx.video.trimStart; } catch (e) {}
        if (isFinite(v.duration)) segLen = Math.max(0, (fx.video.trimEnd > 0 && fx.video.trimEnd < v.duration ? fx.video.trimEnd : v.duration) - fx.video.trimStart);
      };
      v.addEventListener('ended', videoEnded);
      var go = v.play(); if (go && go.catch) go.catch(function () { v.muted = true; v.play().catch(function () {}); });
      start();
    } else {
      total = Math.max(contentEnd, 4); start();
    }
    return { stop: function () { done = true; clearInterval(raf); timers.forEach(clearTimeout); try { root.speechSynthesis.cancel(); } catch (e) {} audios.forEach(function (a) { a.pause(); }); if (v) v.pause(); } };
  }

  root.MovingFx = { stretchCues: stretchCues, folderDefaults: folderDefaults, FIELDS: FIELDS, BUILTIN: BUILTIN, resolve: resolve, cuesOf: cuesOf, play: play, voices: voices };
})(typeof window !== 'undefined' ? window : globalThis);
