/* 내 사주 뮤직비디오 — 랩 가사 조합기 (표시 전용, 엔진 점수 산식은 건드리지 않는다)
   · 미리 써 둔 가사 조각을 사주 값으로 골라 3분(180초) 한 곡을 만든다. AI 즉석 생성 없음. 같은 사주 값이면 언제나 같은 곡.
   · 곡 흐름(고정 순서라 어떤 조각이 와도 이야기가 이어진다):
       인트로  4줄  "나는 이런 결의 사람"            일간(10) · 일지(12)
       벌스 1 12줄  "내 기질과 습관"                 가장 센 십성(10×2) · 일주 12운성(12) · 신강약 7단계(×2) · 가장 센 오행(5) · 훅으로 넘어가는 두 줄(용신 5)
       훅      4줄  "내 쪽으로 부는 바람"            용신(5) · 희신(5)
       벌스 2 12줄  "근데 힘들었던 것, 그래도 지금"  약한 십성(5) · 빈 오행(5)/약한 십성 해법 · 구조 패턴(15) · 지금 대운 계절(6)·천간 십성(10)·상태(4) · 다시 일어서는 두 줄(일간 오행 5)
       훅      4줄  (반복)
       브리지  6줄  "올해"                           세운 계절(6) · 세운 천간 십성(10) · 대표 신살·귀인(17)
       아웃트로 4줄 "앞으로"                         조후(3) · 합충(4) · 일주 60갑자 마무리 2줄(DAY_OUTRO)
   · 브라우저(window.ReportV2.MusicVideoLyrics)와 서버(functions/api/music-video.js 가 import)가 같은 파일을 쓴다.
   · 이름·생일은 가사에 넣지 않는다(외부 음악 API 로 개인정보를 보내지 않는다). 연도는 올해 숫자만 쓴다.
   · 검사: node tests/music-video-lyrics-sim.cjs */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'mv-lyrics-6';

  /* 영어 힙합 추임새(ad-lib, 사용자 요청 2026-11-18): 줄 끝에 괄호로 붙인다 — 일레븐랩스는 괄호 안을 뒤에서 받쳐 주는 추임새로 부른다.
     일간 오행의 비트 색깔에 맞춘 묶음(목 저지 클럽·화 레이지·토 아프로비츠·금 록 랩·수 멜로딕 랩). 욕설·약물·폭력 표현은 쓰지 않는다.
     자막 시각을 맞출 때는 stripAdlibs 로 빼고 가사만 비교한다. */
  var ADLIB = {
    목: { items: ['ayy', 'bounce', 'on my way', 'uh'], hype: "let's go" },
    화: { items: ['skrrt', 'woo', 'too hot', 'uh'], hype: "let's go!" },
    토: { items: ['oh-oh', 'steady', 'uh-huh', 'ayy'], hype: 'feel good' },
    금: { items: ['uh!', 'come on', 'cut clean', 'hey'], hype: 'turn it up' },
    수: { items: ['ooh', 'yeah, yeah', 'smooth', 'ayy'], hype: 'let it flow' }
  };
  /* 훅 마지막 줄의 영어 태그(2026-11-20 "더 트렌디하게"): 용신 오행의 한 줄 영어 구호 — 후렴이 귀에 박히게 한국어 가사 끝에 영어로 받친다 */
  var HOOK_TAG = { 목: 'new leaf, new me', 화: 'light it up', 토: 'stand my ground', 금: 'sharp and clean', 수: 'go with the flow' };
  /* 성별(사용자 요청 2026-11-19): 여자 사주는 여성 래퍼, 남자 사주는 남성 래퍼 — 보컬 지시·추임새·패널 칸(주인공 성별)·캐시가 모두 갈린다 */
  var GENDERS = ['F', 'M'], GENDER_KO = { F: '여자', M: '남자' }, GR = { F: 'f', M: 'm' };
  var VOCAL = { F: ['female rapper', 'confident female rap vocals', 'smooth laid-back flow', 'soulful female sung hook', 'korean rap with natural english phrases'], M: ['male rapper', 'confident male rap vocals', 'smooth laid-back flow', 'soulful male sung hook', 'korean rap with natural english phrases'] };
  var NEG_VOCAL = { F: ['male vocals'], M: ['female vocals'] };
  var ADLIB_G = { F: { intro: 'yeah, girl', outro: 'queen, peace out' }, M: { intro: 'yeah, boy', outro: 'king, peace out' } };
  function genderOf(sd) { var g = sd && sd.gender; return g === 'F' || g === 'female' || g === '여' ? 'F' : 'M'; }
  function addAdlibs(lines, sec, el, seed, g, yong) {
    var ag = ADLIB_G[g] || ADLIB_G.M;
    var a = ADLIB[el] || ADLIB.토, last = lines.length - 1, k = 0, pick = function () { return a.items[(seed + sec.length + k++) % a.items.length]; };   // 한 벌스 안에서 차례로 돌려 같은 말이 이어지지 않게
    return lines.map(function (line, i) {
      var tag = null;
      if (sec === 'intro') tag = i === 1 ? ag.intro : i === last ? a.hype : null;
      else if (sec === 'verse1' || sec === 'verse2') tag = (i === 1 || i % 4 === 3) ? pick() : null;
      else if (sec === 'hook') tag = i === 0 ? 'yeah, yeah' : i === last ? (HOOK_TAG[yong] || a.hype) : null;
      else if (sec === 'bridge') tag = i === 0 ? 'hold up' : null;
      else if (sec === 'outro') tag = i === last ? ag.outro : null;
      return tag ? line + ' (' + tag + ')' : line;
    });
  }
  function stripAdlibs(t) { return String(t || '').replace(/\s*\([^)]*\)/g, ''); }
  var BANNED = ['반드시', '무조건', '확정', '대박', '100%', '틀림없', '절대', '저주', '파멸', '재앙', '망한다', '망해', '죽는다', '죽어', '불행해진다', '액운', '흉하다'];
  var ELK = ['목', '화', '토', '금', '수'], ELR = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' };
  var MAKES = { 수: '목', 목: '화', 화: '토', 토: '금', 금: '수' };   // 생해 주는 쪽 → 받는 쪽
  var SECTIONS = ['intro', 'verse1', 'hook', 'verse2', 'bridge', 'outro'];
  var SECTION_KO = { intro: '인트로', verse1: '벌스 1', hook: '훅', verse2: '벌스 2', bridge: '브리지', outro: '아웃트로' };
  var TAG = { intro: 'Intro', verse1: 'Verse 1', hook: 'Hook', verse2: 'Verse 2', bridge: 'Bridge', outro: 'Outro' };
  /* 구간 길이(ms) — 합계 180초(3분). 랩 한 줄 약 3.6초, 훅은 노래라 한 줄 5초 */
  var DUR = { intro: 14000, verse1: 44000, hook: 20000, verse2: 44000, hook2: 20000, bridge: 22000, outro: 16000 };

  /* ── 인트로 앞 2줄: 일간 10개 */
  var INTRO_STEM = {
    갑: ['Yeah, 아침 알람 세 번째에 겨우 일어나도', '속에선 큰 나무 하나가 또 하늘 쪽으로 뻗어'],
    을: ['Yeah, 시끄러운 단톡방 조용히 읽고 넘겨도', '나는 틈만 보이면 결국 길을 내는 덩굴'],
    병: ['Yeah, 내가 들어서면 공기부터 바뀐다는 말 들었지', '꺼지는 법을 모르는 한낮의 햇빛 같은 기질'],
    정: ['Yeah, 다들 잠든 새벽 한 시 방 안의 스탠드처럼', '작아도 꺼지지 않는 불, 그게 내 방식이야'],
    무: ['Yeah, 단톡방 싸움 나도 나는 읽고 가만히 있어', '흔들려도 자리 지키는 산, 그게 나라는 사람'],
    기: ['Yeah, 친구 고민 들어 주다 새벽 세 시 된 적 많지', '뭐든 품고 키워 내는 밭 같은 마음이라서'],
    경: ['Yeah, 아닌 건 아니라고 말해서 분위기 싸해져도', '단단한 쇠처럼 내 기준은 쉽게 안 휘어'],
    신: ['Yeah, 옷 하나 고를 때도 디테일까지 다 보는 눈', '갈고 닦을수록 빛나는 보석 같은 결'],
    임: ['Yeah, 머릿속에 탭이 스무 개쯤 열려 있는 밤', '넓고 깊은 강물처럼 생각이 멈추질 않아'],
    계: ['Yeah, 말은 안 해도 다 느끼고 있는 그 분위기', '조용히 스며드는 빗물, 그게 내 쪽 방식이야']
  };
  /* ── 인트로 뒤 2줄: 일지 12개 */
  var INTRO_BRANCH = {
    자: ['밤이 깊을수록 머리는 더 또렷해지고', '조용한 새벽에 혼자 정리하는 게 익숙해'],
    축: ['말없이 버티는 건 누구보다 자신 있어', '천천히 모은 것들은 쉽게 내놓지 않아'],
    인: ['가만있으면 몸이 먼저 근질거리는 타입', '새벽 공기 마시며 먼저 출발하는 편이야'],
    묘: ['섬세하게 다듬는 손끝이 나의 무기', '분위기 좋은 곳에선 말수도 늘어나지'],
    진: ['속에 품은 계획이 생각보다 커', '겉은 무던해도 안에선 용이 꿈틀대'],
    사: ['머리 회전 빠르고 눈치도 빠른 편', '한번 꽂히면 밤새 파고드는 집중력'],
    오: ['감정이 얼굴에 바로 드러나는 솔직함', '달리기 시작하면 멈추기 힘든 열기'],
    미: ['겉으론 순해 보여도 속은 꽤 단단해', '정 붙인 사람한텐 끝까지 다정해'],
    신: ['일 처리 빠르고 손이 먼저 움직여', '복잡한 것도 금방 정리해 내는 감각'],
    유: ['깔끔한 게 좋아서 책상 정리부터 해', '말 한마디도 골라서 하는 섬세함'],
    술: ['내 사람은 내가 지킨다는 고집이 있어', '늦게 열려도 한번 열린 마음은 오래가'],
    해: ['생각이 바다처럼 넓게 퍼져 나가', '혼자만의 시간에 상상이 가장 커져']
  };

  /* ── 벌스 1 ①: 가장 센 십성 10개 × 2가지 (4줄) */
  var V1_TG = {
    비견: [['남이 정해 준 길보단 내가 고른 길이 편해', '비교당하는 건 싫어도 경쟁은 피하지 않아', '내 일은 내 손으로 끝내야 마음이 놓여', '혼자서도 끝까지 가는 힘, 그건 내 거야'],
      ['팀플 때도 결국 내가 마지막 정리를 했지', '누구 밑에 있기보단 내 이름 걸고 뛰는 게 맞지', '친구랑도 선은 지키는 게 나만의 방식', '자존심 하나로 버틴 날들이 나의 이력서지']],
    겁재: [['지는 게 제일 싫어서 밤새 연습했던 날', '승부욕 하나로 판을 뒤집은 적도 많아', '친구 일엔 내 일처럼 열 올리는 의리', '크게 쓰고 크게 버는 배짱도 내 거야'],
      ['한번 마음먹으면 앞뒤 안 보고 달려', '손해 볼 줄 알면서 의리 지킨 적 많지', '가진 걸 나누는 손이 생각보다 커', '같이 뛰는 사람 있을 때 더 세게 가']],
    식신: [['맛집 하나 찾으면 단골 될 때까지 가', '좋아하는 일엔 시간 가는 줄 몰라', '손재주든 말재주든 꾸준히 갈고닦아', '즐기면서 하는 게 결국 제일 오래가'],
      ['급하게 굴지 않고 내 속도로 만들어', '먹고 자는 게 편해야 일도 잘 풀려', '작은 취미 하나가 나를 먹여 살리기도 해', '여유 있는 얼굴 뒤에 쌓인 손맛이 있어']],
    상관: [['생각나면 바로 말하고 메모장엔 아이디어가 가득', '틀린 건 틀렸다고 말해서 혼난 적도 있지', '남들 다 하는 방식은 왠지 손이 안 가', '표현하는 순간 살아나는 게 나라는 장르지'],
      ['새벽에 떠오른 생각에 이불 차고 일어나', '말 한마디로 분위기 띄우는 건 내 특기', '틀에 갇히면 숨이 막혀서 판을 바꿔', '내 안의 말들이 오늘도 밖으로 흘러넘쳐']],
    편재: [['기회 냄새 맡는 코는 누구보다 빨라', '여기저기 벌인 일들이 결국 돈이 돼', '사람 만나는 게 곧 내 영업이고 무대', '크게 굴리는 판에서 오히려 신이 나'],
      ['통장 잔고 앱을 하루에 몇 번씩 열어 봐', '어디서 뭐가 남는지 감이 먼저 와', '한 군데 묶여 있기보단 넓게 움직여', '현실 위에 지은 꿈이 제일 오래 버텨']],
    정재: [['장바구니 담기 전에 가격 비교는 기본', '계산 빠르고 현실 감각은 누구보다 선명', '매달 조금씩 모으는 재미를 알아', '숫자로 증명되는 하루가 나를 웃게 해'],
      ['가계부 앱 알림이 제일 반가운 사람', '허투루 쓰는 돈 없이 차곡차곡 쌓아', '약속한 건 지키고 받을 건 정확히', '성실함이 내 통장의 비밀번호야']],
    편관: [['압박이 커질수록 오히려 정신이 번쩍', '위기 앞에서 제일 먼저 나서는 편', '몸 쓰고 버티는 일엔 자신이 있어', '버텨 온 만큼 단단해진 게 내 어깨'],
      ['남들 눈치보다 내 기준에 더 엄격해', '힘든 일 맡으면 끝을 봐야 잠이 와', '거친 말 뒤에 숨은 책임감이 있어', '무게를 견딘 날들이 나를 키웠어']],
    정관: [['약속 시간 십 분 전엔 이미 도착해 있어', '해야 할 일 목록 지울 때 제일 시원해', '책임지는 자리가 무거워도 피하진 않아', '기준 지키는 게 피곤해도 그게 나의 무게'],
      ['규칙 어기는 사람 보면 속으로 한숨 쉬어', '인정받고 싶은 마음, 숨기지 않을래', '정장 입은 날엔 걸음걸이도 달라져', '바르게 쌓은 신뢰가 내 명함이야']],
    편인: [['남들이 안 보는 걸 먼저 알아채는 눈', '혼자 파고든 분야가 몇 개는 있지', '설명하긴 어려워도 감은 잘 맞아', '특이하단 말이 나한텐 칭찬이야'],
      ['혼자 있는 시간이 있어야 다시 충전돼', '검색 기록만 봐도 관심사가 제멋대로', '한번 빠지면 바닥까지 파고드는 편', '남다른 생각이 결국 나를 데려가']],
    정인: [['결정하기 전에 후기만 한 시간 넘게 읽어', '생각이 깊어서 대답이 조금 늦을 뿐이야', '배우는 게 좋아서 책갈피가 늘 꽂혀 있어', '이해하고 나면 누구보다 오래 붙잡지'],
      ['남의 말 한마디도 밤새 곱씹어 보는 편', '어른들 말씀이 나중에 맞더라는 걸 알아', '머리로 먼저 그려 보고 그다음에 움직여', '천천히 쌓은 생각이 결국 나를 지켜 줘']]
  };
  /* ── 벌스 1 ②: 일주 12운성 (2줄) */
  var V1_STAGE = {
    장생: ['처음 해 보는 일 앞에서 눈이 반짝여', '새로 배우는 순간마다 다시 태어나'],
    목욕: ['꾸미고 바꾸는 걸 좋아하는 감성', '설레는 일 앞에선 마음이 먼저 뛰어'],
    관대: ['인정받고 싶은 마음에 더 차려입고 나가', '폼 잡는 게 아니라 준비된 거라고 말해'],
    건록: ['남한테 기대기보다 직접 하는 게 편해', '스스로 서 있는 내가 제일 나다워'],
    제왕: ['앞에 서면 자연스럽게 시선이 모여', '주도권 잡을 때 제일 나다워져'],
    쇠: ['한발 물러서서 보는 여유가 생겼어', '경험으로 말하는 게 내 무기가 됐어'],
    병: ['남 아픈 데를 먼저 알아보는 마음', '생각이 많아 잠 못 드는 밤도 있었지'],
    사: ['한번 멈춰 서서 깊게 들여다보는 편', '끝난 것 같은 자리에서 답을 찾아내'],
    묘: ['소중한 건 깊숙이 넣어 두는 습관', '모아 둔 것들이 언젠가 빛을 봐'],
    절: ['끊고 다시 시작하는 데 망설임이 적어', '바닥에서 새 판을 짜는 게 익숙해'],
    태: ['아직 다 피지 않은 가능성을 품고 있어', '계획은 머릿속에서 먼저 자라나'],
    양: ['누군가 챙겨 줄 때 더 크게 자라', '천천히 무르익는 게 내 타이밍이야']
  };
  /* ── 벌스 1 ③: 신강약 7단계 × 2가지 (2줄) */
  var V1_ZONE = {
    극왕: [['내 안의 엔진은 늘 최고 속도로 돌아', '넘치는 힘을 어디에 쓸지가 내 숙제야'], ['누가 막아도 결국 내 길로 가는 사람', '고집을 방향으로 바꾸는 법을 배우는 중']],
    태강: [['에너지가 넘쳐서 가끔 혼자 앞서 나가', '브레이크 밟는 법도 이제 조금씩 배워 가'], ['하고 싶은 건 많은데 하루가 너무 짧아', '밀어붙이는 힘은 충분, 남은 건 방향 잡기야']],
    신강: [['힘을 나눠 쓸 때 오히려 판이 커지더라', '넘치는 기운을 흘려보낼 길을 찾아가'], ['가끔은 쉬어 가도 아무도 뭐라 안 해', '내려놓을 때 더 멀리 간다는 걸 알아 가']],
    중화: [['치우치지 않는 저울처럼 균형 잡는 편', '큰소리는 없어도 흐름을 읽는 눈이 있어'], ['너무 뜨겁지도 차갑지도 않은 내 온도', '애매하단 말 대신 유연하다고 불러 줘']],
    신약: [['남 신경 쓰다 내 몫을 놓친 날도 많았지', '도움받는 것도 실력이란 걸 이제 알아'], ['남들보다 예민해서 먼저 알아채는 공기', '버티는 대신 기대는 법을 배우는 중이야']],
    태약: [['착하단 말 뒤에 숨은 피곤함도 알았지', '혼자 다 하려고 하면 금방 지치더라'], ['남보다 빨리 지쳐서 혼자 숨 고르는 날이 잦지', '작게 시작해도 끝까지 가는 게 내 페이스야']],
    극약: [['바람 따라 흔들리는 게 약해 보여도', '흐름을 타는 감각은 누구보다 예민해'], ['내 힘보다 큰 물결에 몸을 맡길 줄 알아', '기댈 곳을 잘 고르는 게 나의 생존법']]
  };
  /* ── 벌스 1 ④: 가장 센 오행의 생활 장면 (2줄) */
  var V1_DOMEL = {
    목: ['방 안에 화분이 하나둘 늘어 가는 건', '뭔가 키우고 싶은 마음이 커서일 거야'],
    화: ['조용한 자리보단 불 켜진 곳이 좋아', '사람들 웃음소리에 나도 같이 데워져'],
    토: ['단골 가게, 늘 앉는 자리, 익숙한 길', '변하지 않는 것들이 나를 붙잡아 줘'],
    금: ['서랍 속 물건까지 제자리에 있어야 해', '흐트러진 건 못 참는 깔끔한 기준'],
    수: ['샤워하다 떠오른 생각이 제일 좋아', '흐르는 물소리에 머리가 맑아져']
  };
  /* ── 벌스 1 ⑤: 훅으로 넘어가는 두 줄(용신) */
  var V1_PRE = {
    목: ['그래서 나는 새로운 쪽으로 몸을 돌려', '저 멀리서 바람 소리가 들려와'],
    화: ['그래서 나는 밝은 쪽으로 걸어 나가', '등 뒤로 따뜻한 바람이 닿아'],
    토: ['그래서 나는 내 자리를 다시 다져', '발밑에서부터 바람이 일어나'],
    금: ['그래서 나는 쓸데없는 걸 덜어 내', '창문 틈으로 맑은 바람이 스며'],
    수: ['그래서 나는 잠깐 멈추고 숨을 골라', '물결 위로 바람이 지나가']
  };

  /* ── 훅 앞 2줄: 용신 / 뒤 2줄: 희신 */
  var HOOK_YONG = {
    목: ['초록빛 바람이 내 쪽으로 불어와', '새로 시작하는 일 앞에서 나는 살아나'],
    화: ['붉은빛 바람이 내 쪽으로 불어와', '드러내고 표현할 때 내 하루가 밝아'],
    토: ['노란 흙바람이 내 쪽으로 불어와', '한자리 꾸준히 지킬 때 내 판이 쌓여'],
    금: ['하얀 쇳바람이 내 쪽으로 불어와', '정리하고 다듬을 때 길이 선명해져'],
    수: ['푸른 물바람이 내 쪽으로 불어와', '쉬어 가고 배울 때 내 머리가 맑아져']
  };
  var HOOK_HEE = {
    목: ['배우고 자라고 사람 곁에 뿌리내려', '천천히 가도 돼, 나무는 멈추지 않아'],
    화: ['움츠린 마음 펴고 햇볕 쪽으로 걸어가', '따뜻하게 켜 둔 불이 나를 데려가'],
    토: ['서두르지 않아도 기반은 단단해져', '발 딛고 선 이곳이 나의 무대가 돼'],
    금: ['필요 없는 건 덜어 내고 기준을 세워', '날을 세운 내 하루가 반짝이며 빛나'],
    수: ['흘러가듯 유연하게 길을 돌아가도', '바다로 닿는 물처럼 나는 내 길을 가']
  };

  /* ── 벌스 2 ①: 약한 십성 무리 (앞 2줄: 힘들었던 것 / 뒤 2줄: 해법 — 빈 오행이 있으면 뒤 2줄은 빈 오행 문구) */
  var V2_WEAK = {
    비겁: [['근데 가끔 내 편이 없다고 느껴질 때 있어', '남 맞춰 주다 보면 내 목소리가 작아져'], ['그럴 땐 나부터 내 편이 돼 주기로 해', '작은 고집 하나쯤은 나를 위해 남겨 둬']],
    식상: [['근데 하고 싶은 말 삼키는 날이 많았지', '속에만 쌓아 두다 보면 답답함만 남았지'], ['서툴러도 꺼내 놓을 때 숨통이 트여', '한 줄이라도 적어 두는 게 나를 살려']],
    재성: [['근데 돈 계산엔 좀 약했던 게 사실이야', '통장 보면 한숨, 결제 문자엔 놀란 적 있어'], ['작은 가계부 하나가 나를 붙잡아 줘', '손에 쥔 걸 지키는 연습, 지금부터 해']],
    관성: [['근데 정해진 틀 안에선 숨이 막히곤 해', '마감 앞에서 미루다 밤새운 적도 있어'], ['작은 약속 하나씩 지키다 보면 돼', '규칙이 날 묶는 게 아니라 받쳐 준다는 걸 배워']],
    인성: [['근데 쉴 줄 몰라서 혼자 지친 날이 많아', '배우기 전에 몸부터 나가서 고생도 했잖아'], ['잠깐 멈춰 기대는 것도 용기더라', '누군가의 조언 한 줄이 길을 열어 주더라']]
  };
  var V2_LACK = {
    목: ['내 사주엔 나무 기운이 비어 있대서', '시작이 무거운 날엔 산책부터 해 봐'],
    화: ['내 사주엔 불 기운이 비어 있대서', '표현이 서툰 날엔 햇볕부터 쬐러 나가'],
    토: ['내 사주엔 흙 기운이 비어 있대서', '붕 뜬 날엔 루틴 하나로 발을 붙여'],
    금: ['내 사주엔 쇠 기운이 비어 있대서', '맺고 끊기 어려울 땐 목록부터 정리해'],
    수: ['내 사주엔 물 기운이 비어 있대서', '머리가 뜨거운 날엔 물 한 잔부터 마셔']
  };
  /* ── 벌스 2 ②: 원국 구조 패턴 (우선순위 순, 2줄) */
  var PATTERN_ORDER = ['재다신약', '군겁쟁재', '관살혼잡', '상관견관', '효신탈식(도식)', '관살과다', '식상과다(설기)', '인성과다', '상관패인', '식신제살', '살인상생', '무재', '무관', '무식상', '무인성'];
  var V2_PATTERN = {
    재다신약: ['벌 기회는 많은데 몸이 하나라 벅차', '다 잡으려다 놓치기 전에 하나만 골라'],
    군겁쟁재: ['같이 하자는 사람 많아 지갑이 얇아져', '나눌 땐 나누고 내 몫은 먼저 챙겨'],
    관살혼잡: ['여기저기서 부르는 책임에 정신없지', '다 받지 말고 내 자리 하나만 지켜'],
    상관견관: ['윗사람 말에 토 달다 찍힌 적 있지', '할 말은 하되 타이밍을 고르는 중'],
    '효신탈식(도식)': ['생각이 많아 손이 늦게 나갈 때 있어', '고민은 짧게, 일단 한 줄 써 보기로'],
    관살과다: ['어깨 위 짐이 남들보다 무거운 편', '내려놓는 것도 책임이라는 걸 배워'],
    '식상과다(설기)': ['말하고 만들다 보면 에너지가 바닥나', '쏟아 낸 만큼 채우는 시간도 챙겨'],
    인성과다: ['배우기만 하다 시작을 미룬 적 많지', '완벽한 준비보다 오늘 한 걸음이 먼저'],
    상관패인: ['튀는 생각에 배움이 브레이크 걸어 줘', '덕분에 아이디어가 실력으로 바뀌어'],
    식신제살: ['압박이 와도 내 재주로 풀어내지', '실력으로 답하는 게 제일 깔끔해'],
    살인상생: ['힘든 일 겪을수록 더 배우고 커져', '버틴 시간이 결국 내 자격증이 돼'],
    무재: ['돈 얘기는 어쩐지 어색하고 낯설어', '작은 수입 하나부터 내 손으로 만들어'],
    무관: ['누가 정해 준 틀은 영 몸에 안 맞아', '내가 정한 규칙 하나면 충분해'],
    무식상: ['속마음 꺼내는 게 유난히 어려워', '짧은 메모부터 내 목소리를 연습해'],
    무인성: ['기댈 곳 없이 혼자 배운 게 많아', '이제는 도움 청하는 연습도 해 볼래'],
    _: ['계획대로 안 되는 날이 더 많았지만', '그 덕에 임기응변 하나는 늘었어']
  };
  /* ── 벌스 2 ③: 지금 대운 계절 (2줄) + 천간 십성 (1줄) + 상태 (1줄) */
  var V2_DW = {
    opportunity: ['지금 내 십 년은 새 문이 보이는 계절', '들어오는 기회에 한 번은 손 들어 보기로'],
    expansion: ['지금 내 십 년은 판이 넓어지는 계절', '만나는 사람도 하는 일도 늘어나는 때야'],
    harvest: ['지금 내 십 년은 뿌린 걸 거두는 계절', '그동안 버틴 시간이 하나둘 돌아오는 때야'],
    accumulation: ['지금 내 십 년은 차곡차곡 쌓는 계절', '티 안 나도 매일 하는 게 실력이 되는 때야'],
    transition: ['지금 내 십 년은 판이 바뀌는 계절', '익숙한 게 흔들려도 그게 끝은 아니야'],
    defense: ['지금 내 십 년은 지켜 내는 계절', '크게 벌이기보다 가진 걸 단단히 할 때야']
  };
  var V2_DW_TG = {
    비견: '이번 대운엔 나란히 뛰는 사람들이 늘어', 겁재: '이번 대운엔 경쟁도 의리도 같이 커져', 식신: '이번 대운엔 손에 익은 재주가 밥이 돼',
    상관: '이번 대운엔 하고 싶던 말이 무대를 만나', 편재: '이번 대운엔 큰 판의 돈 흐름이 눈에 보여', 정재: '이번 대운엔 차곡차곡 모으는 재미가 붙어',
    편관: '이번 대운엔 무거운 역할이 나를 단련해', 정관: '이번 대운엔 이름 걸린 자리가 생겨나', 편인: '이번 대운엔 남다른 공부가 길을 열어', 정인: '이번 대운엔 배움과 어른의 도움이 닿아'
  };
  var V2_DW_COND = { 순풍: '바람이 등 뒤에서 미는 느낌, 놓치지 말고 타', 보통: '오르막도 내리막도 내 걸음으로 지나가', 주의: '속도는 조금 줄이고 안전벨트는 단단히', 부담: '무리한 약속 대신 쉬는 날부터 달력에 적어' };
  /* ── 벌스 2 ④: 다시 일어서는 두 줄(일간 오행) — 두 번째 훅으로 넘어간다 */
  var V2_PRE = {
    목: ['꺾여도 다시 새순은 올라오니까', '한 번 더 고개 들어 하늘 쪽으로'],
    화: ['꺼진 줄 알았던 불씨가 아직 따뜻해', '한 번 더 불붙여 앞으로 가 볼래'],
    토: ['무너진 자리에서 다시 흙을 다져', '한 번 더 버텨 보는 게 내 대답이야'],
    금: ['부딪힌 상처마다 결이 더 단단해져', '한 번 더 날을 세워 앞으로 가'],
    수: ['막힌 길 앞에서 물은 돌아갈 뿐이야', '한 번 더 흘러가 보자, 내 방식대로']
  };

  /* ── 브리지 ①: 올해 세운 계절 (2줄, {year} 자리에 올해 연도) */
  var BR_YEAR = {
    opportunity: ['{year}년엔 새로운 얼굴들이 문을 두드려', '반가운 연락 하나가 내 하루를 바꿔'],
    expansion: ['{year}년엔 하는 일이 하나둘 늘어나', '바빠도 웃는 날이 조금 더 많아'],
    harvest: ['{year}년엔 그동안 한 게 눈에 보여', '고생한 나한테 작은 선물 하나 사 줘'],
    accumulation: ['{year}년엔 조용히 쌓는 게 남는 해', '티 안 나는 하루들이 내 편이 돼'],
    transition: ['{year}년엔 익숙한 게 조금씩 바뀌어', '흔들릴 땐 잠깐 멈추고 숨부터 쉬어'],
    defense: ['{year}년엔 서두르기보다 지키는 해', '지갑도 마음도 한 번 더 챙겨 둬']
  };
  /* ── 브리지 ②: 올해 세운 천간 십성 (2줄) */
  var BR_TG = {
    비견: ['비슷한 꿈 꾸는 친구가 곁에 와', '같이 뛰되 내 페이스는 내가 지켜'],
    겁재: ['지갑 여는 일이 자꾸만 생겨', '기분 내기 전에 한 번만 더 계산해'],
    식신: ['좋아하는 일로 하루가 채워져', '맛있는 거 먹고 푹 자는 게 실력이야'],
    상관: ['참았던 말이 밖으로 나오려 해', '솔직함에 다정함 한 숟갈 섞어 줘'],
    편재: ['생각지 못한 돈 얘기가 들려와', '들뜨기보다 숫자부터 차분히 따져'],
    정재: ['성실하게 한 만큼 통장에 남아', '고정 지출 정리하면 숨통이 트여'],
    편관: ['갑자기 맡게 되는 일이 생길 수 있어', '몸이 먼저 신호 주면 그때는 쉬어'],
    정관: ['내 이름 걸고 하는 일이 늘어', '약속 하나하나가 평판으로 쌓여'],
    편인: ['혼자 파고드는 공부가 재밌어져', '엉뚱한 관심사가 의외의 문을 열어'],
    정인: ['배울 사람, 기댈 사람이 눈에 보여', '서류 하나 계약 하나 꼼꼼히 챙겨']
  };
  /* ── 브리지 ③: 대표 신살·귀인 (드문 것부터, 2줄) */
  var STAR_ORDER = ['삼기귀인', '도화살', '고란살', '금신살', '양인살', '천의성', '문창귀인', '학당귀인', '천을귀인', '괴강살', '홍염살', '화개살', '금여록', '암록', '건록', '백호대살', '천문성'];
  var BR_STAR = {
    삼기귀인: ['남다른 재주 세 개쯤은 숨겨 둔 사람', '꺼내 쓸수록 판이 넓어지는 타입'],
    도화살: ['어딜 가도 눈길이 한 번 더 머무는 사람', '그 매력, 나한테 좋은 쪽으로 써'],
    고란살: ['혼자서도 잘 사는 법을 일찍 배웠지', '그래도 곁을 내주는 연습은 해 볼래'],
    금신살: ['날카롭게 다듬어진 결단력이 있어', '칼은 칼집에, 쓸 때만 꺼내 써'],
    양인살: ['한번 붙으면 끝을 보는 칼날 같은 힘', '그 힘을 지키는 쪽으로 쓰기로 해'],
    천의성: ['아픈 사람 곁에 있으면 손이 먼저 가', '돌보는 재주가 누군가의 하루를 살려'],
    문창귀인: ['글 쓰고 정리하는 데 감각이 남달라', '내 문장이 누군가의 길잡이가 돼'],
    학당귀인: ['배우는 자리에 가면 눈빛이 달라져', '공부한 만큼 정직하게 돌아와'],
    천을귀인: ['막힐 때마다 귀인이 나타나 길을 터', '받은 도움은 잊지 않고 또 건네'],
    괴강살: ['평범한 건 싫어서 늘 극과 극을 오가', '센 기운도 잘 쓰면 리더의 무게'],
    홍염살: ['분위기 하나로 사람을 끌어당겨', '감성이 일이 되는 순간을 알아'],
    화개살: ['혼자 있을 때 영감이 쏟아져', '예술 같은 고독이 나를 키워 줘'],
    금여록: ['좋은 사람, 좋은 자리 복이 따라와', '받은 복을 나누면 더 크게 돌아와'],
    암록: ['티 안 나게 들어오는 숨은 도움', '어려울 때 뒷문이 하나쯤은 열려 있어'],
    건록: ['내 힘으로 버는 돈이 제일 든든해', '성실한 손이 결국 나를 먹여 살려'],
    백호대살: ['한번 터지면 거센 에너지가 있어', '그 기운은 운동이랑 일에 쏟아부어'],
    천문성: ['보이지 않는 흐름을 읽는 직감', '설명 못 해도 내 감은 꽤 맞아'],
    _: ['아직 이름 붙지 않은 재능이 내 안에 있어', '하나씩 꺼내 보면서 내 색을 찾아가']
  };

  /* ── 아웃트로: 조후 1줄 + 합충 1줄 + 일간 오행 2줄 */
  var OUT_CLIMATE = { hot: '뜨거운 내 사주에 한 줄기 물 같은 쉼을 줘', cold: '차가운 내 사주에 햇볕 한 줌 같은 온기를 줘', mild: '춥지도 덥지도 않은 내 계절을 지나' };
  var OUT_REL = { clash: '부딪힌 자리마다 나를 깨우는 소리가 나', combo: '이어진 인연들이 내 노래를 같이 불러', both: '당기고 부딪히며 균형을 찾아가', none: '큰 소리 없이 잔잔하게 흘러가' };
  /* ── 아웃트로 끝 2줄: 60갑자 일주마다 그 일주의 기질을 담은 마무리(사용자 요청 2026-11-19). 표에 없으면 일간 오행(OUT_EL)으로 */
  var DAY_OUTRO = {
    갑자: ['겨울 물가에 선 큰 나무처럼 생각이 깊어', '곧게 뻗는 내 고집이 결국 길이 돼'],
    을축: ['언 땅에서도 꽃 피우는 덩굴의 끈기', '조용히 버틴 시간이 내 뿌리가 돼'],
    병인: ['숲 위로 떠오르는 아침 해 같은 나', '시작하는 자리마다 불을 켜고 가'],
    정묘: ['풀숲 사이 등불처럼 은은한 다정함', '작은 빛으로 누군가의 밤을 지켜'],
    무진: ['큰 산 속에 숨은 용이 깨어나는 중', '묵직하게 쌓은 꿈이 이제 움직여'],
    기사: ['따뜻한 밭에 햇살 드는 오후 같은 나', '부지런한 손이 결국 열매를 맺어'],
    경오: ['달리는 말 위에 빛나는 쇠의 결', '뜨거워도 내 기준은 흔들리지 않아'],
    신미: ['여름 들판에 반짝이는 보석 하나', '섬세하게 고른 길이 나를 빛내'],
    임신: ['큰 강 같은 머리로 판을 읽어', '빠른 손과 넓은 생각이 내 무기'],
    계유: ['새벽 이슬처럼 맑고 예리한 감각', '조용히 다듬은 말이 정확히 꽂혀'],
    갑술: ['메마른 언덕에 홀로 선 큰 나무', '흔들려도 끝까지 자리를 지켜 내'],
    을해: ['물 위에 떠도 꽃은 피워 내는 사람', '부드럽게 흘러가도 꺾이지 않아'],
    병자: ['겨울 바다 위로 뜨는 한낮의 해', '차가운 데서 더 환하게 빛나'],
    정축: ['언 땅 속 화롯불처럼 따뜻한 뚝심', '오래 품은 열정이 식지 않아'],
    무인: ['호랑이 품은 큰 산 같은 기세', '한번 정하면 산처럼 밀고 가'],
    기묘: ['봄 밭에 새싹 돋는 부드러운 힘', '사람을 키우는 손길이 내 재능'],
    경진: ['용의 비늘처럼 단단한 쇠의 기세', '큰 판에서 더 크게 울리는 소리'],
    신사: ['불에 달궈져 더 빛나는 보석', '뜨거운 순간에 진짜 내가 나와'],
    임오: ['뜨거운 여름 위를 흐르는 큰 물', '열정과 냉정 사이를 자유롭게 오가'],
    계미: ['여름 소나기처럼 반가운 사람', '메마른 마음에 촉촉이 스며들어'],
    갑신: ['바위 위에 뿌리내린 큰 나무', '거친 자리에서 더 단단해져'],
    을유: ['가을 바람에도 꼿꼿한 들꽃', '여린 듯 날카로운 내 감각'],
    병술: ['노을 진 언덕을 붉게 물들이는 해', '끝까지 뜨거운 의리가 내 색'],
    정해: ['밤바다 위 등대 불빛 같은 나', '멀리서도 길을 비춰 주는 사람'],
    무자: ['겨울 호수를 품은 큰 산', '겉은 무던해도 속은 깊게 출렁여'],
    기축: ['겨울 밭처럼 조용히 힘을 모아', '봄이 오면 누구보다 먼저 피워'],
    경인: ['호랑이처럼 앞장서는 쇠의 결단', '망설임 없이 길을 내고 달려'],
    신묘: ['봄꽃 사이 반짝이는 은빛 장신구', '예민한 눈썰미가 판을 바꿔'],
    임진: ['큰 물 속에 잠든 용이 몸을 틀어', '스케일 큰 꿈이 파도처럼 밀려와'],
    계사: ['뜨거운 돌 위에 내리는 단비', '차분한 머리로 불을 다룰 줄 알아'],
    갑오: ['한여름 들판을 달리는 큰 나무 바람', '말보다 빠르게 마음이 먼저 가'],
    을미: ['여름 언덕에 핀 질긴 꽃 한 송이', '메마른 날에도 웃음을 잃지 않아'],
    병신: ['쇠를 비추는 눈부신 햇살', '재치 있는 말로 분위기를 바꿔'],
    정유: ['보석을 비추는 촛불의 섬세함', '작은 디테일로 큰 감동을 만들어'],
    무술: ['든든한 산을 지키는 충직한 개', '내 사람은 끝까지 책임지는 의리'],
    기해: ['물 머금은 밭처럼 넉넉한 마음', '함께 있으면 누구든 편안해져'],
    경자: ['차가운 물에 씻긴 맑은 칼날', '똑 부러진 말이 길을 깨끗이 해'],
    신축: ['흙 속에서 빛을 기다린 보석', '참은 만큼 더 단단하게 빛나'],
    임인: ['숲을 키우는 큰 강물의 기운', '사람과 일을 함께 키워 가'],
    계묘: ['봄비에 피어나는 새싹 같은 사람', '부드러운 말로 마음을 열어'],
    갑진: ['큰 산 위로 솟은 푸른 용의 나무', '포부만큼 크게 가지를 뻗어'],
    을사: ['햇살 아래 피어난 화사한 꽃', '센스 있는 표현이 나를 빛내'],
    병오: ['한낮의 태양 위 또 하나의 태양', '숨길 수 없는 열기가 무대를 채워'],
    정미: ['여름밤 모닥불처럼 정 많은 사람', '곁에 있으면 누구든 데워져'],
    무신: ['바위산처럼 듬직한 실행력', '말보다 결과로 증명해 보여'],
    기유: ['가을 들녘에 반짝이는 수확', '꼼꼼하게 챙긴 게 다 열매가 돼'],
    경술: ['단단한 성벽 같은 쇠의 의지', '한번 지킨 약속은 끝까지 가'],
    신해: ['맑은 물에 씻긴 보석의 투명함', '솔직한 감성이 사람을 끌어'],
    임자: ['밤바다처럼 깊고 넓은 속', '흐름을 읽는 눈이 누구보다 빨라'],
    계축: ['언 땅 아래 흐르는 지하수', '티 안 나게 오래 버티는 힘'],
    갑인: ['숲의 왕 호랑이 같은 큰 나무', '앞장서서 길을 여는 게 내 역할'],
    을묘: ['봄 들판 가득 번지는 풀꽃', '어디서든 자연스럽게 어울려'],
    병진: ['구름 위로 떠오르는 용의 해', '큰 꿈을 밝게 비추며 올라가'],
    정사: ['타오르는 불꽃 속 또 하나의 불꽃', '집중하면 누구도 못 말리는 열정'],
    무오: ['불을 품은 화산 같은 큰 산', '조용하다가도 한 번에 터뜨려'],
    기미: ['여름 밭에 뿌리 깊은 고집', '내 페이스로 끝까지 일궈 내'],
    경신: ['쇠 위에 쇠, 날 선 결단력', '정확하고 빠르게 판을 정리해'],
    신유: ['다듬고 또 다듬은 보석의 완벽함', '디테일 하나도 그냥 넘기지 않아'],
    임술: ['메마른 땅을 적시는 큰 물', '거친 곳에서 더 큰 그림을 그려'],
    계해: ['바다로 이어지는 맑은 빗물', '깊은 감성이 끝없이 흘러']
  };
  var OUT_EL = {
    목: ['다 자란 나무도 처음엔 씨앗이었지', '내 이야기는 아직 자라는 중이야'],
    화: ['꺼질 듯 흔들려도 다시 타오르지', '내 불빛은 아직 켜져 있어'],
    토: ['비가 와도 땅은 그 자리에 있지', '내 이야기는 오늘도 단단해져'],
    금: ['부딪힌 만큼 더 맑은 소리가 나지', '내 이야기는 아직 다듬는 중이야'],
    수: ['막혀도 물은 결국 바다로 흐르지', '내 이야기는 오늘도 흘러가는 중']
  };

  /* ── 음악 스타일(영어 권장): 일간 오행별 */
  /* 기본은 요즘 유행하는 신나는 K-힙합 비트(사용자 요청 2026-11-18). 오행은 장르 색깔만 바꾼다 — 모두 빠르고 통통 튀는 쪽.
     2026-11-20 "더 트렌디하고 힙하게": 라디오에 바로 걸 수 있는 깔끔한 믹스, 808·트랩 하이햇, 리듬감 있는 플로우(트리플렛·카덴스 바꾸기), 귀에 박히는 구호형 훅,
     한국어 랩에 영어 구절을 자연스럽게 섞는다. 금은 록 랩 → 멜로딕 드릴(금속성 신스), 화는 레이지, 목은 저지 클럽, 토는 아프로스윙·아마피아노, 수는 멜로딕 트랩·플러그앤비.
     가수·곡 이름은 넣지 않는다(일레븐랩스 음악 약관: 실제 아티스트·곡 이름 금지) */
  /* 2026-11-20 2차 "더 그루비하고 느낌 있게": 빠르고 몰아붙이는 비트(레이지 150·저지 클럽 145)를 걷고, 몸이 저절로 까딱이는 그루브 쪽으로.
     템포는 94~108bpm 의 여유 있는 바운스, 스윙 걸린 하이햇, 따뜻한 베이스 라인, 펑크·소울·R&B 화성. 보컬은 박자 뒤에 살짝 기대는 레이드백 플로우. */
  var STYLE_BASE = ['trendy modern k-hip hop', 'upbeat', 'groovy', 'catchy', 'head-nodding bounce', 'swung hi-hats', 'deep warm bass groove', 'polished radio-ready mix'];
  /* 오행별 그루브 색깔 — 목 펑키 바운스, 화 웨스트코스트 그루브, 토 아프로스윙·아마피아노, 금 재지 슬랩 베이스, 수 R&B·네오소울. 어둡고 공격적인 폰크·트랩 메탈은 쓰지 않는다 */
  var STYLE = {
    목: STYLE_BASE.concat(['funky bounce', 'rubbery synth bass', 'talkbox-style synth lead', 'crisp handclaps', '100 bpm']),
    화: STYLE_BASE.concat(['west coast groove', 'bouncy funk bassline', 'warm analog synth stabs', 'punchy claps', '102 bpm']),
    토: STYLE_BASE.concat(['afroswing', 'amapiano log drums', 'smooth rolling bassline', 'sunny summer vibe', '108 bpm']),
    금: STYLE_BASE.concat(['jazzy hip hop groove', 'live slap bass', 'smooth rhodes chords', 'tight swung snares', '96 bpm']),
    수: STYLE_BASE.concat(['r&b-infused melodic rap', 'neo-soul chords', 'silky layered vocals', 'smooth bass groove', '94 bpm'])
  };
  var NEG_STYLE = ['explicit lyrics', 'screaming', 'harsh noise', 'phonk', 'trap metal', 'rage', 'slow ballad', 'sad mood', 'lo-fi', 'acoustic ballad', 'dark gloomy', 'comedic novelty song', 'dated 2000s sound', 'stiff robotic rhythm'];
  var COLOR = { 목: '초록빛', 화: '붉은빛', 토: '노란빛', 금: '하얀빛', 수: '푸른빛' };
  /* 사용자 선택 옵션(2026-11-20): 노래를 만들기 전에 장르·분위기·보컬을 고른다. 'auto' 는 지금까지와 똑같은 곡(같은 캐시)을 만든다.
     장르 auto = 일간 오행 추천(목 펑키·화 웨스트코스트·토 아프로스윙·금 재지·수 R&B). 옵션이 다르면 다른 곡(캐시 열쇠에 스타일이 들어간다).
     보컬을 바꿔도 패널 주인공은 사주 성별 그대로다. */
  var EL_GENRE = { 목: 'funk', 화: 'westcoast', 토: 'afro', 금: 'jazzy', 수: 'rnb' };
  var GENRE = {
    funk: { ko: '펑키 바운스', base: STYLE.목 }, westcoast: { ko: '웨스트코스트', base: STYLE.화 }, afro: { ko: '아프로스윙', base: STYLE.토 },
    jazzy: { ko: '재지 힙합', base: STYLE.금 }, rnb: { ko: 'R&B·소울', base: STYLE.수 },
    trap: { ko: '멜로딕 트랩', base: ['trendy modern k-hip hop', 'upbeat', 'catchy', 'melodic trap', 'pluggnb', 'dreamy bell synths', 'rolling hi-hats', 'hard-hitting 808 bass', 'polished radio-ready mix', '140 bpm'] },
    party: { ko: '신나는 파티', base: ['trendy modern k-hip hop', 'upbeat', 'catchy', 'jersey club bounce', 'sliding 808s', 'bright plucked synths', 'chopped vocal samples', 'festival party energy', 'polished radio-ready mix', '140 bpm'] }
  };
  var MOOD = { auto: { ko: '기본', styles: [] }, hype: { ko: '신나게', styles: ['high energy', 'hype crowd ad-libs', 'bigger punchier drums'] }, chill: { ko: '감성 있게', styles: ['mellow late-night vibe', 'warm atmospheric pads', 'emotional melodic hook'] } };
  var VOCAL_KO = { auto: '사주대로', F: '여성 보컬', M: '남성 보컬' };
  var OPTIONS = {
    genre: ['auto'].concat(Object.keys(GENRE)).map(function (k) { return { id: k, ko: k === 'auto' ? '내 사주 추천' : GENRE[k].ko }; }),
    mood: Object.keys(MOOD).map(function (k) { return { id: k, ko: MOOD[k].ko }; }),
    vocal: Object.keys(VOCAL_KO).map(function (k) { return { id: k, ko: VOCAL_KO[k] }; })
  };
  function optsOf(o) {
    o = o && typeof o === 'object' ? o : {};
    return { genre: GENRE[o.genre] ? o.genre : 'auto', mood: MOOD[o.mood] ? o.mood : 'auto', vocal: o.vocal === 'F' || o.vocal === 'M' ? o.vocal : 'auto' };
  }
  function optsKo(op, el) {
    var g = op.genre === 'auto' ? '내 사주 추천(' + GENRE[EL_GENRE[el] || 'afro'].ko + ')' : GENRE[op.genre].ko;
    return [g, MOOD[op.mood].ko, VOCAL_KO[op.vocal]].join(' · ');
  }

  function hash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; }
  function elOk(e) { return ELK.indexOf(e) >= 0 ? e : null; }
  function zoneOf(sd) { var z = (sd.strength && sd.strength.zone) || ''; if (V1_ZONE[z]) return z; return /강|왕/.test(z) ? '신강' : /약/.test(z) ? '신약' : '중화'; }
  function seasonOk(s) { return V2_DW[s] ? s : 'accumulation'; }
  function relOf(sd) { var c = (sd.clashes || []).length > 0, m = (sd.combinations || []).length > 0; return c && m ? 'both' : c ? 'clash' : m ? 'combo' : 'none'; }
  function topTG(sd) { var t = sd.tenGods || {}, best = null; Object.keys(V1_TG).forEach(function (k) { var v = +t[k] || 0; if (best === null || v > (+t[best] || 0)) best = k; }); return best && (+t[best] || 0) > 0 ? best : null; }
  var GROUP_TG = { 비겁: '비견', 식상: '식신', 재성: '정재', 관성: '정관', 인성: '정인' };
  function firstIn(order, names) { for (var i = 0; i < order.length; i++) if (names.indexOf(order[i]) >= 0) return order[i]; return '_'; }

  /* 주제: 종합풀이(self, 이 파일) · 연애운·재물운·커리어운·토정비결 신년운세(music-video-lyrics-topics.js) */
  var TOPICS = ['self', 'love', 'wealth', 'career', 'newyear'];
  var TOPIC_KO = { self: '종합풀이', love: '연애운 심화', wealth: '재물운 심화', career: '커리어운 심화', newyear: '토정비결 신년운세' };
  var TOPIC_WORLD = { self: 'w1', love: 'w3', wealth: 'w2', career: 'w7' };
  function TP(t) { return (R.MusicVideoTopics || {})[t] || null; }
  var BANDS = ['매우 높음', '높음', '무난', '다소 낮음', '낮음'], TONES = ['good', 'neutral', 'caution', 'burden'];
  function bandOk(b) { return BANDS.indexOf(b) >= 0 ? b : '무난'; }
  function toneOk(t) { return TONES.indexOf(t) >= 0 ? t : 'neutral'; }
  /* 토정 현대어 풀이 한 괘(TojeongModern[gua]) → 노래에 쓰는 값. 없으면 null */
  function nyOf(extra) {
    if (!extra || !Number.isInteger(extra.year) || !Number.isInteger(extra.gua)) return null;
    var e = extra.entry || ((root.TojeongModern || {})[extra.gua]); if (!e || typeof e.theme !== 'string') return null;
    var tone = toneOk(e.tone), hasMonths = !!(e.months && typeof e.months === 'object');   // 보충본 괘(663·711 등)는 월별 구가 없다 → 한 해 어조만 쓴다
    var months = []; for (var m = 1; m <= 12; m++) months.push(hasMonths ? toneOk(e.months[m] && e.months[m].tone) : tone);
    return { year: extra.year, gua: extra.gua, theme: e.theme.replace(/["“”]/g, '').slice(0, 120), tone: tone, months: months, hasMonths: hasMonths };
  }
  function seasonTone(ms) {   // 석 달 중 가장 많은 어조(같으면 neutral → good → caution → burden 순)
    var c = {}; ms.forEach(function (t) { c[t] = (c[t] || 0) + 1; });
    return ['neutral', 'good', 'caution', 'burden'].reduce(function (best, t) { return (c[t] || 0) > (c[best] || 0) ? t : best; }, 'neutral');
  }
  function toneScore(ms) { var v = { good: 2, neutral: 1, caution: 0, burden: -1 }; return ms.reduce(function (a, t) { return a + v[t]; }, 0); }

  /* 조합에 쓰는 사주 값만 뽑는다(서버 캐시 열쇠·검사용). 꼭 필요한 값이 없으면 null.
     topic: self(기본)·love·wealth·career·newyear, extra: 신년운세일 때 { year, gua[, entry] } */
  function inputsOf(sd, topic, extra) {
    topic = TOPICS.indexOf(topic) >= 0 ? topic : 'self';
    if (topic !== 'self' && !TP(topic)) return null;
    var x = baseInputs(sd); if (!x) return null;
    x.topic = topic;
    if (topic === 'love') x.band = bandOk(sd.sewoon && sd.sewoon.love && sd.sewoon.love.band);
    if (topic === 'wealth') x.band = bandOk(sd.sewoon && sd.sewoon.wealth && sd.sewoon.wealth.band);
    if (topic === 'career') { var top = sd.career && sd.career.top && sd.career.top[0]; x.cat = top && TP('career').bridge[top.category] ? top.category : 'planning'; }
    if (topic === 'newyear') {
      var ny = nyOf(extra); if (!ny) return null; x.ny = ny;
      var al = (sd.annualLuck || []).filter(function (a) { return a && a.year === ny.year; })[0] || {};
      x.sw = seasonOk(al.season); x.swTG = BR_TG[al.stemTG] ? al.stemTG : null; x.year = ny.year;
    }
    return x;
  }
  function baseInputs(sd) {
    if (!sd || !sd.dayMaster || !INTRO_STEM[sd.dayMaster.stem]) return null;
    var el = elOk(sd.dayMaster.el); if (!el) return null;
    var day = (sd.dayPillar && (sd.dayPillar.ko || sd.dayPillar.key)) || '', branch = day.charAt(1);
    var yong = elOk(sd.usefulElements && sd.usefulElements.yong) || el;
    var hee = elOk(sd.usefulElements && sd.usefulElements.hee); if (!hee || hee === yong) hee = Object.keys(MAKES).filter(function (k) { return MAKES[k] === yong; })[0];
    var weak = V2_WEAK[sd.weakestGroup] ? sd.weakestGroup : '인성';
    var tg = topTG(sd) || GROUP_TG[sd.dominantGroup] || '비견';
    var stage = sd.twelveStages && V1_STAGE[sd.twelveStages.day] ? sd.twelveStages.day : '태';
    var temp = sd.climate && Number.isFinite(+sd.climate.temp) ? +sd.climate.temp : 0;
    var dw = sd.currentDaewoon || {}, sw = sd.sewoon || {};
    return {
      stem: sd.dayMaster.stem, el: el, day: day, branch: INTRO_BRANCH[branch] ? branch : '자',
      tg: tg, stage: stage, zone: zoneOf(sd), domEl: elOk(sd.dominantEl) || el, yong: yong, hee: hee,
      weak: weak, lack: elOk(sd.lackEl), weakEl: elOk(sd.weakestEl) || yong,
      pattern: firstIn(PATTERN_ORDER, (sd.patterns || []).map(function (p) { return p && p.name; })),
      dw: seasonOk(dw.season), dwTG: V2_DW_TG[dw.stemTG] ? dw.stemTG : null, dwCond: V2_DW_COND[dw.condition] ? dw.condition : '보통',
      sw: seasonOk(sw.season), swTG: BR_TG[sw.stemTG] ? sw.stemTG : null, year: Number.isInteger(sw.year) ? sw.year : (Number.isInteger(sd.nowYear) ? sd.nowYear : null),
      star: firstIn(STAR_ORDER, (sd.specialStars || []).map(function (s) { return s && s.name; })),
      climate: temp >= 0.5 ? 'hot' : temp <= -0.5 ? 'cold' : 'mild', rel: relOf(sd), g: genderOf(sd)
    };
  }

  /* 입력값(inputsOf 결과)으로 곡을 만든다. 서버는 이 함수만 쓴다(브라우저가 보낸 가사는 믿지 않는다) */
  function fromInputs(x) {
    var topic = x.topic || 'self', tp = topic === 'self' ? null : TP(topic);
    var seed = hash(x.day + '|' + x.tg + '|' + x.zone + '|' + x.stage);
    var bridgeYear = BR_YEAR[x.sw].map(function (l) { return l.replace('{year}년엔', x.year ? x.year + '년엔' : '올해는'); });
    var weakPair = (tp && tp.weak) ? tp.weak[x.weak] : V2_WEAK[x.weak];
    var dwLines = V2_DW[x.dw].slice(); dwLines.push(x.dwTG ? V2_DW_TG[x.dwTG] : '이번 대운엔 내 속도를 찾는 연습을 해'); dwLines.push(V2_DW_COND[x.dwCond]);
    var hook = ((tp && tp.hook) ? tp.hook[x.yong] : HOOK_YONG[x.yong]).concat(HOOK_HEE[x.hee]);
    var intro = INTRO_STEM[x.stem].concat(INTRO_BRANCH[x.branch]), v1, v2, br;
    var tgLines = (tp && tp.tg) ? tp.tg[x.tg] : V1_TG[x.tg][seed % 2], zone = V1_ZONE[x.zone][(seed >>> 4) % 2];
    var weakTail = x.lack ? V2_LACK[x.lack] : weakPair[1];
    if (topic === 'newyear') {
      var ny = x.ny, ms = ny.months, good = ms.filter(function (t) { return t === 'good'; }).length;
      var pickM = function (tone) { var i = ms.indexOf(tone); return i >= 0 ? i + 1 : 0; };
      var best = pickM('good') ? tp.bestMonth.good.replace('{m}', pickM('good')) : pickM('neutral') ? tp.bestMonth.neutral.replace('{m}', pickM('neutral')) : tp.restMonth.none;
      var restTone = pickM('burden') ? 'burden' : pickM('caution') ? 'caution' : null, rest = restTone ? tp.restMonth[restTone].replace('{m}', pickM(restTone)) : tp.restMonth.none;
      if (rest === best) rest = tp.restMonth.rest;
      if (!ny.hasMonths) { best = tp.noMonths[2]; rest = tp.noMonths[3]; }
      var h1 = toneScore(ms.slice(0, 6)), h2 = toneScore(ms.slice(6));
      intro = INTRO_STEM[x.stem].concat([tp.intro[0].replace('{year}', ny.year), '“' + ny.theme + '”']);
      v1 = tp.tone[ny.tone].concat(!ny.hasMonths ? tp.noMonths.slice(0, 2) : tp.goodCount[good >= 7 ? 'many' : good >= 4 ? 'some' : 'few'], [tp.season.spring[seasonTone(ms.slice(0, 3))], tp.season.summer[seasonTone(ms.slice(3, 6))]], zone, V1_PRE[x.yong]);
      v2 = weakPair[0].concat([tp.season.autumn[seasonTone(ms.slice(6, 9))], tp.season.winter[seasonTone(ms.slice(9))], best, rest], tp.halves[h2 > h1 + 1 ? 'up' : h1 > h2 + 1 ? 'down' : 'flat'], V2_PATTERN[x.pattern], V2_PRE[x.el]);
      br = bridgeYear.concat(x.swTG ? BR_TG[x.swTG] : [], BR_STAR[x.star]);
    } else {
      v1 = tgLines.concat(V1_STAGE[x.stage], zone, V1_DOMEL[x.domEl], V1_PRE[x.yong]);
      v2 = weakPair[0].concat(weakTail, V2_PATTERN[x.pattern], dwLines, V2_PRE[x.el]);
      var topicBridge = topic === 'love' || topic === 'wealth' ? tp.bridge[x.band] : topic === 'career' ? tp.bridge[x.cat] : (x.swTG ? BR_TG[x.swTG] : []);
      br = bridgeYear.concat(topicBridge, BR_STAR[x.star]);
    }
    var parts = [
      { id: 'intro', lines: intro, el: x.el },
      { id: 'verse1', lines: v1, el: x.domEl },
      { id: 'hook', lines: hook, el: x.yong },
      { id: 'verse2', lines: v2, el: x.lack || x.weakEl },
      { id: 'hook2', lines: hook.slice(), el: x.yong, repeatOf: 'hook' },
      { id: 'bridge', lines: br, el: x.hee },
      { id: 'outro', lines: [OUT_CLIMATE[x.climate], OUT_REL[x.rel]].concat(DAY_OUTRO[x.day] || OUT_EL[x.el]), el: x.el }
    ];
    var op = optsOf(x.opt), vg = op.vocal === 'auto' ? x.g : op.vocal;   // 보컬 성별(추임새 girl/boy 도 따라감)
    parts.forEach(function (p) { p.lines = p.repeatOf ? parts[2].lines.slice() : addAdlibs(p.lines, p.id, x.el, seed, vg, x.yong); });   // 훅 반복은 첫 훅과 똑같이
    var sections = parts.map(function (p) {
      var base = p.repeatOf || p.id;
      return { id: p.id, name: SECTION_KO[base] + (p.repeatOf ? ' (반복)' : ''), tag: '[' + TAG[base] + ']', lines: p.lines, durationMs: DUR[p.id], panel: panelId(base, topic, x.g, x.day), panelFallback: panelId(base, 'self', x.g, x.day), el: p.el };
    });
    var t = 0; sections.forEach(function (s) { s.startMs = t; t += s.durationMs; });
    var word = tp ? tp.titleWord : '';
    return {
      version: VERSION, topic: topic, topicKo: TOPIC_KO[topic], inputs: x,
      title: (topic === 'newyear' ? x.ny.year + ' ' : '') + x.day + ' 일주, ' + (word ? word + '에 부는 ' : '') + COLOR[x.yong] + ' 바람',
      gender: x.g, hero: heroOf(x.day, x.g), opt: op, optKo: optsKo(op, x.el),
      style: (op.genre === 'auto' ? STYLE[x.el] : GENRE[op.genre].base).concat(MOOD[op.mood].styles, VOCAL[vg] || VOCAL.M), negativeStyle: NEG_STYLE.concat(NEG_VOCAL[vg] || NEG_VOCAL.M),
      sections: sections, totalMs: t,
      lyrics: sections.map(function (s) { return s.tag + '\n' + s.lines.join('\n'); }).join('\n\n')
    };
  }
  function compose(sd, topic, extra) { var x = inputsOf(sd, topic, extra); return x ? fromInputs(x) : null; }

  /* 일레븐랩스 음악 API(music_v2 / music_v2_5) composition_plan(chunks) 모양 — 구간마다 길이(duration_ms)를 지정해 패널·자막 시점이 정확히 맞는다 */
  var LOCAL = { intro: ['groovy intro with bass and keys', 'filtered groove opening up', 'ad-libs'], verse1: ['confident rap verse', 'clear korean rap vocals', 'riding the groove', 'syncopated in-the-pocket flow', 'full groove'],
    hook: ['big catchy chorus', 'groovy sing-along hook', 'soulful vocal harmonies', 'english tag line', 'full groove with bass'], verse2: ['rap verse with rising energy', 'clear korean rap vocals', 'bouncy flow', 'cadence switch-ups', 'groove building'],
    hook2: ['big catchy chorus', 'groovy sing-along hook', 'soulful vocal harmonies', 'english tag line', 'full groove with bass', 'extra energy'], bridge: ['stripped-down groove', 'bass and keys breakdown', 'soulful melodic rap', 'drums back in'], outro: ['groove ride-out', 'smooth fade of the band', 'ad-libs', 'clean ending'] };
  function toElevenPlan(song) {
    return { chunks: song.sections.map(function (s) {
      return { text: s.tag + '\n' + s.lines.join('\n'), duration_ms: s.durationMs, positive_styles: song.style.concat(LOCAL[s.id] || []), negative_styles: song.negativeStyle.slice() };
    }) };
  }

  /* 일레븐랩스 music_v1 composition_plan(MusicPrompt) 모양 — v2_5 가 막힐 때(요금제·형식 오류) 다시 시도하는 예비 형식 */
  function toElevenV1Plan(song) {
    return { positive_global_styles: song.style.slice(), negative_global_styles: song.negativeStyle.slice(),
      sections: song.sections.map(function (s) { return { section_name: s.name, positive_local_styles: (LOCAL[s.id] || []).slice(), negative_local_styles: [], duration_ms: s.durationMs, lines: s.lines.slice() }; }) };
  }

  /* 자막 시각 맞추기: 만든 노래를 음성 인식(일레븐랩스 Scribe)으로 받아 쓴 단어별 시각 [{text, start, end, type}] 으로
     가사 줄마다 실제로 부르는 시작 시각을 찾는다. 랩·노래는 받아쓰기가 조금씩 틀리므로 글자 두 개씩 묶은 조각(바이그램)이 얼마나 겹치는지로 찾고,
     못 찾은 줄은 앞뒤로 찾은 줄 사이를 고르게 나눈다. 찾은 줄이 40% 미만이면 null(화면은 구간 길이 비율로 나눈다).
     결과: [{ s: 구간 번호, l: 줄 번호, t: 시작 ms, e: 끝 ms }] — 부르는 순서대로. 계산량이 작아 서버(Workers)에서 바로 돌린다. */
  function normT(t) { return String(t || '').replace(/[^0-9A-Za-zㄱ-ㆎ가-힣]/g, ''); }
  function bigrams(s) { var o = {}; for (var i = 0; i < s.length - 1; i++) o[s.substr(i, 2)] = 1; return o; }
  function alignToTranscript(song, words) {
    if (!song || !Array.isArray(words)) return null;
    var T = '', at = [], endAt = [];
    words.forEach(function (w) {
      if (!w || (w.type && w.type !== 'word')) return;
      var n = normT(w.text), s = +w.start, e = +w.end; if (!n || !isFinite(s)) return; if (!isFinite(e) || e < s) e = s;
      for (var i = 0; i < n.length; i++) { T += n.charAt(i); at.push(Math.round((s + (e - s) * i / n.length) * 1000)); endAt.push(Math.round(e * 1000)); }
    });
    if (T.length < 20) return null;
    var lines = []; song.sections.forEach(function (s, si) { s.lines.forEach(function (line, li) { lines.push({ s: si, l: li, key: normT(stripAdlibs(line)) }); }); });   // 추임새(괄호)는 빼고 가사만 비교
    var cur = 0, found = 0;
    lines.forEach(function (x) {
      var k = x.key; if (k.length < 3) return;
      var kb = bigrams(k), kn = Object.keys(kb).length, best = -1, bestScore = 0, win = Math.min(T.length, cur + Math.max(160, k.length * 6));
      for (var p = cur; p < win; p++) {
        var seg = T.substr(p, k.length), hit = 0, seen = {};
        for (var q = 0; q < seg.length - 1; q++) { var b = seg.substr(q, 2); if (kb[b] && !seen[b]) { seen[b] = 1; hit++; } }
        // 줄의 첫 글자·첫 두 글자·셋째 글자가 맞으면 가산(조금 앞에서 시작해도 겹침이 비슷하게 나오는 것을 막는다), 가까운 쪽을 조금 더 믿는다
        var sc = hit / kn + (T.charAt(p) === k.charAt(0) ? 0.12 : 0) + (T.substr(p, 2) === k.substr(0, 2) ? 0.12 : 0) + (T.charAt(p + 2) === k.charAt(2) ? 0.06 : 0) - (p - cur) * 0.0004;
        if (sc > bestScore) { bestScore = sc; best = p; }
      }
      if (best >= 0 && bestScore >= 0.34) { x.t = at[best]; x.e = endAt[Math.min(T.length - 1, best + k.length - 1)]; cur = best + Math.max(2, Math.floor(k.length * 0.7)); found++; }
    });
    if (found < lines.length * 0.4) return null;
    // 못 찾은 줄: 앞뒤로 찾은 줄 사이를 고르게 나눈다(처음·끝은 구간 길이 비율로 추정)
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].t != null) continue;
      var a = i - 1; while (a >= 0 && lines[a].t == null) a--;
      var b = i + 1; while (b < lines.length && lines[b].t == null) b++;
      var ta = a >= 0 ? lines[a].t : 0, tb = b < lines.length ? lines[b].t : (ta + 4000 * (b - a));
      lines[i].t = Math.round(ta + (tb - ta) * (i - a) / (b - a));
    }
    for (var j = 1; j < lines.length; j++) if (lines[j].t < lines[j - 1].t) lines[j].t = lines[j - 1].t;   // 순서 뒤집힘 방지
    return lines.map(function (x, j) { var nx = lines[j + 1]; return { s: x.s, l: x.l, t: x.t, e: x.e != null ? x.e : (nx ? nx.t : x.t + 3500) }; });
  }

  /* 주인공(2026-11-20 개편): 사주에 어울리는 사람 래퍼(사주 성별) + 일지의 상징 동물(수호 동물, 일간 오행 색 빛) — 그림 지시문은 functions/api/music-video.js. (2026-11-19 1판은 일주 의인화 동물 래퍼)
     크루는 일지의 삼합 동물 둘, 연애운의 짝은 일지의 육합 동물. 예) 경오 일주 여자 → 여성 래퍼 + 흰 빛의 말, 크루 상징 호랑이·개, 짝 상징 양.
     패널 칸 = 주제 × 성별 × 일주(60) × 구간(6) → 칸 이름 mv-[주제-]<구간>-<일간>-<일지>-<f|m> (예: mv-love-hook-gyeong-o-f).
     조합이 3,600가지라 미리 다 만들지 않고, 사용자가 뮤직비디오를 열 때 빈 칸을 서버가 한 장씩 만들어 채운다(같은 칸은 모두가 같이 쓴다). */
  var STEMS = '갑을병정무기경신임계', BRANCHES = '자축인묘진사오미신유술해';
  var STEM_RO = ['gap', 'eul', 'byeong', 'jeong', 'mu', 'gi', 'gyeong', 'sin', 'im', 'gye'];
  var BRANCH_RO = ['ja', 'chuk', 'in', 'myo', 'jin', 'sa', 'o', 'mi', 'sin', 'yu', 'sul', 'hae'];
  var ANIMAL_KO = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  var ANIMAL_EN = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'sheep', 'monkey', 'rooster', 'dog', 'pig'];
  var STEM_EL = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
  var COLOR_KO = { 목: '푸른', 화: '붉은', 토: '황금빛', 금: '흰', 수: '검은' }, COLOR_EN = { 목: 'blue-green', 화: 'red', 토: 'golden', 금: 'white', 수: 'black' };
  var SAMHAP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];   // 신자진·인오술·사유축·해묘미
  var YUKHAP = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };   // 자축·인해·묘술·진유·사신·오미
  function heroOf(day, g) {
    var si = STEMS.indexOf(String(day || '').charAt(0)), bi = BRANCHES.indexOf(String(day || '').charAt(1)); if (si < 0 || bi < 0) return null;
    var el = STEM_EL[si], grp = SAMHAP.filter(function (x) { return x.indexOf(bi) >= 0; })[0] || [], crew = grp.filter(function (x) { return x !== bi; }), pt = YUKHAP[bi];
    g = g === 'F' ? 'F' : 'M';
    return { day: day, id: STEM_RO[si] + '-' + BRANCH_RO[bi], el: el, gender: g, colorKo: COLOR_KO[el], animalKo: ANIMAL_KO[bi], colorEn: COLOR_EN[el], animalEn: ANIMAL_EN[bi],
      nameKo: COLOR_KO[el] + ' ' + ANIMAL_KO[bi], motifKo: (DAY_OUTRO[day] || [])[0] || '', crewKo: crew.map(function (x) { return ANIMAL_KO[x]; }), crewEn: crew.map(function (x) { return ANIMAL_EN[x]; }), partnerKo: ANIMAL_KO[pt], partnerEn: ANIMAL_EN[pt] };
  }
  function panelId(section, topic, g, day) { var h = heroOf(day, g); return 'mv-' + (topic && topic !== 'self' ? topic + '-' : '') + section + '-' + (h ? h.id : 'gap-ja') + '-' + (GR[g] || 'm'); }
  /* 칸 이름 → { id, topic, section, gender, day, hero } (형식이 틀리면 null) — 서버가 요청을 검사할 때 쓴다 */
  function parsePanelId(id) {
    var m = /^mv-(?:(love|wealth|career|newyear)-)?(intro|verse1|hook|verse2|bridge|outro)-([a-z]+)-([a-z]+)-([fm])$/.exec(String(id || ''));
    if (!m) return null; var si = STEM_RO.indexOf(m[3]), bi = BRANCH_RO.indexOf(m[4]); if (si < 0 || bi < 0 || si % 2 !== bi % 2) return null;   // 60갑자가 아닌 조합(예: 갑축)은 거른다(양간은 양지, 음간은 음지)
    var g = m[5] === 'f' ? 'F' : 'M', day = STEMS.charAt(si) + BRANCHES.charAt(bi), topic = m[1] || 'self';
    return { id: id, topic: topic, topicKo: TOPIC_KO[topic], section: m[2], sectionKo: SECTION_KO[m[2]], gender: g, genderKo: GENDER_KO[g], day: day, hero: heroOf(day, g) };
  }
  /* 60갑자 일주 목록(관리자 화면 선택용) */
  var DAYS = []; for (var di = 0; di < 60; di++) DAYS.push(STEMS.charAt(di % 10) + BRANCHES.charAt(di % 12));
  function panelSlots(topic, g, day) { return SECTIONS.map(function (s) { return parsePanelId(panelId(s, topic, g, day)); }); }

  function bannedIn(text) { return BANNED.filter(function (w) { return String(text).indexOf(w) >= 0; }); }
  function allFragments() {
    var out = [];
    function add(v) { if (Array.isArray(v)) v.forEach(add); else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { add(v[k]); }); else if (typeof v === 'string') out.push(v); }
    [INTRO_STEM, INTRO_BRANCH, V1_TG, V1_STAGE, V1_ZONE, V1_DOMEL, V1_PRE, HOOK_YONG, HOOK_HEE, V2_WEAK, V2_LACK, V2_PATTERN, V2_DW, V2_DW_TG, V2_DW_COND, V2_PRE, BR_YEAR, BR_TG, BR_STAR, OUT_CLIMATE, OUT_REL, OUT_EL, DAY_OUTRO].forEach(add);
    ['love', 'wealth', 'career', 'newyear'].forEach(function (t) { var tp = TP(t); if (tp) Object.keys(tp).forEach(function (k) { if (k !== 'label' && k !== 'world' && k !== 'titleWord') add(tp[k]); }); });
    return out;
  }

  /* 재생 시각(ms) → 지금 구간·줄. song.timing(음성 인식으로 맞춘 줄 시각)이 있으면 그것을 쓰고, 없으면 구간 안에서 줄 수로 고르게 나눈다.
     timing 이 있을 때: 첫 줄 전(전주)·줄 사이 긴 쉼에서는 line 을 빈 문자열로 돌려 자막을 숨긴다(sung=false) */
  function cueAt(song, ms) {
    var secs = song.sections, s = secs[secs.length - 1];
    if (song.timing && song.timing.length) {
      var tm = song.timing, hit = null;
      for (var j = 0; j < tm.length; j++) { if (tm[j].t <= ms) hit = tm[j]; else break; }
      if (!hit) { var f = secs[tm[0].s] || secs[0]; return { section: f, line: '', lineIndex: -1, next: f.lines[tm[0].l] || '', sung: false }; }
      var sec = secs[hit.s] || s, idx = tm.indexOf(hit), nx = tm[idx + 1], nsec = nx && (secs[nx.s] || s);
      var sung = ms <= hit.e + 1200 || (nx && nx.t - hit.e < 2500);
      return { section: sec, line: sung ? sec.lines[hit.l] : '', lineIndex: hit.l, next: nx ? nsec.lines[nx.l] : '', sung: sung };
    }
    for (var i = 0; i < secs.length; i++) if (ms < secs[i].startMs + secs[i].durationMs) { s = secs[i]; break; }
    var n = s.lines.length, k = Math.max(0, Math.min(n - 1, Math.floor((ms - s.startMs) / (s.durationMs / n))));
    return { section: s, line: s.lines[k], lineIndex: k };
  }

  R.MusicVideoLyrics = { OPTIONS: OPTIONS, optsOf: optsOf, optsKo: optsKo, EL_GENRE: EL_GENRE, VERSION: VERSION, BANNED: BANNED, SECTIONS: SECTIONS, SECTION_KO: SECTION_KO, ELK: ELK, ELR: ELR, DAYS: DAYS, GENDERS: GENDERS, GENDER_KO: GENDER_KO, DUR: DUR, TOPICS: TOPICS, TOPIC_KO: TOPIC_KO, TOPIC_WORLD: TOPIC_WORLD,
    inputsOf: inputsOf, fromInputs: fromInputs, compose: compose, toElevenPlan: toElevenPlan, toElevenV1Plan: toElevenV1Plan, alignToTranscript: alignToTranscript, stripAdlibs: stripAdlibs, ADLIB: ADLIB, HOOK_TAG: HOOK_TAG, panelId: panelId, parsePanelId: parsePanelId, panelSlots: panelSlots, heroOf: heroOf, bannedIn: bannedIn, allFragments: allFragments, DAY_OUTRO: DAY_OUTRO, cueAt: cueAt, hash: hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.MusicVideoLyrics;
})(typeof window !== 'undefined' ? window : globalThis);
