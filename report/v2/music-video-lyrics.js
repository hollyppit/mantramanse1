/* 내 사주 뮤직비디오 — 랩 가사 조합기 (표시 전용, 엔진 점수 산식은 건드리지 않는다)
   · 미리 써 둔 가사 조각을 사주 값으로 골라 3분(180초) 한 곡을 만든다. AI 즉석 생성 없음. 같은 사주 값이면 언제나 같은 곡.
   · 곡 흐름(고정 순서라 어떤 조각이 와도 이야기가 이어진다):
       인트로  4줄  "나는 이런 결의 사람"            일간(10) · 일지(12)
       벌스 1 12줄  "내 기질과 습관"                 가장 센 십성(10×2) · 일주 12운성(12) · 신강약 7단계(×2) · 가장 센 오행(5) · 훅으로 넘어가는 두 줄(용신 5)
       훅      4줄  "내 쪽으로 부는 바람"            용신(5) · 희신(5)
       벌스 2 12줄  "근데 힘들었던 것, 그래도 지금"  약한 십성(5) · 빈 오행(5)/약한 십성 해법 · 구조 패턴(15) · 지금 대운 계절(6)·천간 십성(10)·상태(4) · 다시 일어서는 두 줄(일간 오행 5)
       훅      4줄  (반복)
       브리지  6줄  "올해"                           세운 계절(6) · 세운 천간 십성(10) · 대표 신살·귀인(17)
       아웃트로 4줄 "앞으로"                         조후(3) · 합충(4) · 일간 오행(5)
   · 브라우저(window.ReportV2.MusicVideoLyrics)와 서버(functions/api/music-video.js 가 import)가 같은 파일을 쓴다.
   · 이름·생일은 가사에 넣지 않는다(외부 음악 API 로 개인정보를 보내지 않는다). 연도는 올해 숫자만 쓴다.
   · 검사: node tests/music-video-lyrics-sim.cjs */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'mv-lyrics-2';
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
  var OUT_EL = {
    목: ['다 자란 나무도 처음엔 씨앗이었지', '내 이야기는 아직 자라는 중이야'],
    화: ['꺼질 듯 흔들려도 다시 타오르지', '내 불빛은 아직 켜져 있어'],
    토: ['비가 와도 땅은 그 자리에 있지', '내 이야기는 오늘도 단단해져'],
    금: ['부딪힌 만큼 더 맑은 소리가 나지', '내 이야기는 아직 다듬는 중이야'],
    수: ['막혀도 물은 결국 바다로 흐르지', '내 이야기는 오늘도 흘러가는 중']
  };

  /* ── 음악 스타일(영어 권장): 일간 오행별 */
  var STYLE = {
    목: ['korean hip hop', 'warm boom bap', 'acoustic guitar loop', 'hopeful', '90 bpm'],
    화: ['korean hip hop', 'energetic trap', 'bright synth leads', 'confident', '140 bpm half-time'],
    토: ['korean hip hop', 'lo-fi boom bap', 'steady groove', 'warm bass', '86 bpm'],
    금: ['korean hip hop', 'crisp modern rap', 'clean piano', 'sharp hi-hats', '95 bpm'],
    수: ['korean hip hop', 'moody r&b rap', 'rain ambience', 'deep sub bass', '80 bpm']
  };
  var NEG_STYLE = ['explicit lyrics', 'screaming', 'heavy distortion'];
  var COLOR = { 목: '초록빛', 화: '붉은빛', 토: '노란빛', 금: '하얀빛', 수: '푸른빛' };

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
      climate: temp >= 0.5 ? 'hot' : temp <= -0.5 ? 'cold' : 'mild', rel: relOf(sd)
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
      { id: 'outro', lines: [OUT_CLIMATE[x.climate], OUT_REL[x.rel]].concat(OUT_EL[x.el]), el: x.el }
    ];
    var sections = parts.map(function (p) {
      var base = p.repeatOf || p.id;
      return { id: p.id, name: SECTION_KO[base] + (p.repeatOf ? ' (반복)' : ''), tag: '[' + TAG[base] + ']', lines: p.lines, durationMs: DUR[p.id], panel: panelId(base, p.el, topic), panelFallback: panelId(base, p.el, 'self'), el: p.el };
    });
    var t = 0; sections.forEach(function (s) { s.startMs = t; t += s.durationMs; });
    var word = tp ? tp.titleWord : '';
    return {
      version: VERSION, topic: topic, topicKo: TOPIC_KO[topic], inputs: x,
      title: (topic === 'newyear' ? x.ny.year + ' ' : '') + x.day + ' 일주, ' + (word ? word + '에 부는 ' : '') + COLOR[x.yong] + ' 바람',
      style: STYLE[x.el].slice(), negativeStyle: NEG_STYLE.slice(),
      sections: sections, totalMs: t,
      lyrics: sections.map(function (s) { return s.tag + '\n' + s.lines.join('\n'); }).join('\n\n')
    };
  }
  function compose(sd, topic, extra) { var x = inputsOf(sd, topic, extra); return x ? fromInputs(x) : null; }

  /* 일레븐랩스 음악 API(music_v2 / music_v2_5) composition_plan(chunks) 모양 — 구간마다 길이(duration_ms)를 지정해 패널·자막 시점이 정확히 맞는다 */
  var LOCAL = { intro: ['soft spoken rap intro', 'sparse beat'], verse1: ['rap verse', 'clear korean rap vocals', 'tight flow'], hook: ['catchy melodic hook', 'sung chorus', 'full beat'],
    verse2: ['rap verse', 'clear korean rap vocals', 'emotional build'], hook2: ['catchy melodic hook', 'sung chorus', 'full beat'], bridge: ['half-time bridge', 'stripped down beat', 'melodic rap'], outro: ['soft outro', 'fading beat'] };
  function toElevenPlan(song) {
    return { chunks: song.sections.map(function (s) {
      return { text: s.tag + '\n' + s.lines.join('\n'), duration_ms: s.durationMs, positive_styles: song.style.concat(LOCAL[s.id] || []), negative_styles: song.negativeStyle.slice() };
    }) };
  }

  /* 패널 이미지 칸: 주제 5개 × 구간 6개 × 오행 5개 = 150칸. 관리자 '뮤직비디오 패널'이 이 칸을 채운다.
     종합풀이 칸은 mv-<구간>-<오행>, 다른 주제는 mv-<주제>-<구간>-<오행>. 주제 칸이 비면 화면은 종합풀이 칸(panelFallback)을 쓴다 */
  function panelId(section, el, topic) { return 'mv-' + (topic && topic !== 'self' ? topic + '-' : '') + section + '-' + (ELR[el] || 'earth'); }
  var PANEL_SLOTS = []; TOPICS.forEach(function (t) { SECTIONS.forEach(function (s) { ELK.forEach(function (e) { PANEL_SLOTS.push({ id: panelId(s, e, t), topic: t, topicKo: TOPIC_KO[t], section: s, sectionKo: SECTION_KO[s], el: e }); }); }); });

  function bannedIn(text) { return BANNED.filter(function (w) { return String(text).indexOf(w) >= 0; }); }
  function allFragments() {
    var out = [];
    function add(v) { if (Array.isArray(v)) v.forEach(add); else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { add(v[k]); }); else if (typeof v === 'string') out.push(v); }
    [INTRO_STEM, INTRO_BRANCH, V1_TG, V1_STAGE, V1_ZONE, V1_DOMEL, V1_PRE, HOOK_YONG, HOOK_HEE, V2_WEAK, V2_LACK, V2_PATTERN, V2_DW, V2_DW_TG, V2_DW_COND, V2_PRE, BR_YEAR, BR_TG, BR_STAR, OUT_CLIMATE, OUT_REL, OUT_EL].forEach(add);
    ['love', 'wealth', 'career', 'newyear'].forEach(function (t) { var tp = TP(t); if (tp) Object.keys(tp).forEach(function (k) { if (k !== 'label' && k !== 'world' && k !== 'titleWord') add(tp[k]); }); });
    return out;
  }

  /* 재생 시각(ms) → 지금 구간·줄. 구간 안에서는 줄 수로 고르게 나눈다(일레븐랩스 v2 는 구간 길이를 지킨다) */
  function cueAt(song, ms) {
    var secs = song.sections, s = secs[secs.length - 1];
    for (var i = 0; i < secs.length; i++) if (ms < secs[i].startMs + secs[i].durationMs) { s = secs[i]; break; }
    var n = s.lines.length, k = Math.max(0, Math.min(n - 1, Math.floor((ms - s.startMs) / (s.durationMs / n))));
    return { section: s, line: s.lines[k], lineIndex: k };
  }

  R.MusicVideoLyrics = { VERSION: VERSION, BANNED: BANNED, SECTIONS: SECTIONS, SECTION_KO: SECTION_KO, ELK: ELK, ELR: ELR, PANEL_SLOTS: PANEL_SLOTS, DUR: DUR, TOPICS: TOPICS, TOPIC_KO: TOPIC_KO, TOPIC_WORLD: TOPIC_WORLD,
    inputsOf: inputsOf, fromInputs: fromInputs, compose: compose, toElevenPlan: toElevenPlan, panelId: panelId, bannedIn: bannedIn, allFragments: allFragments, cueAt: cueAt, hash: hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.MusicVideoLyrics;
})(typeof window !== 'undefined' ? window : globalThis);
