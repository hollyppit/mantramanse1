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
  var VERSION = 'mv-lyrics-8';

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
    갑: ['Yeah, 알람 세 번째에 겨우 이불을 걷어 내도', '내 안의 큰 나무는 벌써 하늘을 두드려'],
    을: ['Yeah, 시끄러운 단톡방은 읽고 조용히 넘겨도', '나는 담장 틈마다 길을 내는 덩굴이야'],
    병: ['Yeah, 내가 문 열고 들어서면 방 온도가 바뀌지', '구름 뒤에서도 시계를 맞추는 한낮의 해'],
    정: ['Yeah, 다들 잠든 새벽 한 시 책상 위 스탠드처럼', '작아도 끝까지 남는 불, 어둠이 날 비켜 가'],
    무: ['Yeah, 단톡방에 불이 나도 나는 읽고 숨 고르지', '폭우가 지나가도 제자리인 큰 산이 나야'],
    기: ['Yeah, 친구 고민 들어 주다 새벽 세 시를 넘겼지', '뭐든 받아 품으면 싹 틔우는 밭이 내 마음'],
    경: ['Yeah, 아닌 건 아니라 해서 공기가 싸해져도', '나는 불에 달궈질수록 단단해지는 쇠'],
    신: ['Yeah, 옷 하나 고를 때도 실밥까지 읽는 눈', '깎일수록 빛이 나는 보석, 그게 내 결이야'],
    임: ['Yeah, 머릿속엔 탭이 스무 개쯤 열린 밤', '어느 둑도 못 가두는 큰 강이 내 안에 흘러'],
    계: ['Yeah, 말 안 해도 방 안 공기는 다 읽혀', '소리 없이 스며드는 빗물, 젖은 줄도 모르게']
  };
  /* ── 인트로 뒤 2줄: 일지 12개 */
  var INTRO_BRANCH = {
    자: ['자정이 넘으면 내 머리는 불을 켜는 창문', '모두 잠든 새벽에 나만 아는 지도를 그려'],
    축: ['언 땅 위에서도 묵묵히 밭을 가는 걸음', '천천히 모은 건 겨울 곳간처럼 꽉 닫아'],
    인: ['가만히 있으면 발바닥이 먼저 근질거려', '새벽 숲을 제일 먼저 가르는 발자국이 나'],
    묘: ['손끝은 봄 아침 이슬 털듯 섬세하게 다듬어', '마음 맞는 자리에선 말이 봄볕처럼 길어져'],
    진: ['조용한 연못 밑에 생각보다 큰 계획을 숨겨', '겉은 잔잔해도 안에선 용이 몸을 뒤척여'],
    사: ['눈치는 한낮 아스팔트 위 열기보다 빨라', '한번 꽂히면 똬리 틀고 밤새 파고들어'],
    오: ['감정은 얼굴이 먼저 생중계를 해 버려', '한번 달리면 정오의 말처럼 고삐가 안 잡혀'],
    미: ['겉은 순한 오후 햇살, 속은 마른 흙처럼 단단해', '정 붙인 사람에겐 끝까지 그늘이 되어 줘'],
    신: ['생각보다 손이 먼저 일을 접고 펴', '엉킨 이어폰 줄도 금방 푸는 감각이야'],
    유: ['책상 정리부터 해야 하루의 막이 올라', '말 한마디도 체에 걸러 고운 것만 꺼내'],
    술: ['내 사람 앞에선 해 질 녘 대문을 지키는 눈', '늦게 열린 문일수록 한겨울까지 안 닫혀'],
    해: ['밤바다처럼 생각이 수평선까지 번져', '혼자인 밤에 상상은 제일 큰 배를 띄워']
  };

  /* ── 벌스 1 ①: 가장 센 십성 10개 × 2가지 (4줄) */
  var V1_TG = {
    비견: [['남이 깔아 준 레일보다 내가 낸 오솔길', '비교는 질색이어도 출발선은 안 피해', '내 일은 내 손으로 매듭지어야 잠이 와', '혼자 걷는 밤길도 내 발소리면 충분해'], ['팀플 마지막 장은 늘 내 손이 덮었지', '남의 간판 밑보다 내 이름 건 노점이 좋아', '친구 사이에도 내 마당엔 낮은 담 하나', '자존심 하나로 버틴 날이 내 이력서야']],
    겁재: [['지는 게 싫어서 새벽까지 혼자 연습했지', '끝난 판도 승부욕으로 뒤집어 본 적 있어', '친구 일엔 내 피가 먼저 끓어오르고', '크게 걸고 크게 받는 배짱이 내 주머니'], ['마음먹은 순간 브레이크는 트렁크에 넣어', '손해 볼 줄 알면서 의리 쪽에 줄 섰지', '밥값 계산대 앞에선 내 손이 먼저 나가', '같이 뛰는 발소리 들리면 두 배로 세져']],
    식신: [['맛집 하나 찾으면 사장님이 내 얼굴 외워', '좋아하는 일 앞에선 시계가 녹아내려', '손재주든 말재주든 매일 한 겹씩 덧칠해', '즐기며 끓인 국물이 제일 오래 우러나'], ['급한 불보다 약불로 내 속도대로 졸여', '배부르고 푹 자야 하루가 술술 풀려', '작은 취미 하나가 밥상을 차려 주기도 해', '느긋한 얼굴 뒤엔 숙성된 손맛이 있어']],
    상관: [['메모장은 새벽마다 아이디어로 넘쳐', '틀린 건 틀렸다 해서 찍힌 적도 있지', '다들 걷는 길엔 왠지 발이 안 떨어져', '말하는 순간 숨 쉬는 나, 그게 내 장르야'], ['새벽에 떠오른 생각이 이불을 걷어차', '말 한마디로 식은 자리에 불을 켜', '네모난 틀에 담기면 모서리부터 깨 버려', '내 안의 말들이 컵을 넘쳐 오늘도 흘러']],
    편재: [['기회 냄새는 골목 끝에서도 먼저 맡아', '여기저기 던진 그물이 결국 돈을 건져', '사람 만나는 자리가 곧 내 가게고 무대', '판이 클수록 심장이 오히려 춤을 춰'], ['잔고 앱은 하루에도 몇 번씩 문을 두드려', '어디서 뭐가 남는지 감이 먼저 계산해', '한 우물보다 지도 위에 핀을 여럿 꽂아', '현실 땅 위에 지은 꿈이 제일 오래 서']],
    정재: [['장바구니는 가격 비교 세 번을 통과해야 해', '머릿속 계산기는 영수증보다 정확해', '매달 한 칸씩 채우는 저금통의 재미', '통장 숫자가 한 줄 늘면 하루가 웃어'], ['가계부 알림이 제일 반가운 손님이야', '동전 하나도 제자리 찾아 차곡차곡 쌓여', '약속은 저울에 달듯 주고받는 것도 정확히', '성실함이 내 통장 금고의 열쇠야']],
    편관: [['압박이 조여 올수록 정신은 칼날처럼 서', '불난 자리에 제일 먼저 뛰어드는 발', '버티는 일이라면 근육이 먼저 대답해', '짓눌린 만큼 단단해진 게 내 어깨야'], ['남들 눈보다 내 안의 심판이 더 엄해', '힘든 일 맡으면 끝을 봐야 눈이 감겨', '거친 말 뒤에 무거운 책임을 숨겨 둬', '망치질 견딘 날들이 나를 벼려 냈어']],
    정관: [['약속 십 분 전엔 이미 그 자리에 서 있어', '할 일 목록에 줄 긋는 소리가 제일 시원해', '책임이라는 넥타이, 무거워도 안 풀어', '기준 지키는 피곤함도 내 어깨의 무게'], ['새치기 보면 속으로 한숨이 줄을 서', '인정받고 싶은 마음, 굳이 숨기진 않아', '정장 입은 날엔 걸음이 먼저 허리를 펴', '바르게 쌓은 신뢰가 내 이름 앞 명함이 돼']],
    편인: [['남들이 놓친 그림자를 먼저 알아채는 눈', '혼자 판 굴이 몇 개는 깊게 나 있지', '설명은 못 해도 촉은 과녁을 꿰뚫어', '특이하단 말은 나한테 훈장이야'], ['혼자 있는 방이 있어야 배터리가 차', '검색 기록만 봐도 관심사가 뒤죽박죽', '한번 빠지면 바닥 밑 지하실까지 파 내려가', '남다른 나침반이 결국 나를 새 길로 데려가']],
    정인: [['결정 전엔 후기만 한 시간 넘게 정독해', '대답이 늦는 건 생각이 깊이 잠수해서야', '책마다 책갈피가 깃발처럼 꽂혀 있어', '이해한 건 뿌리째 오래 붙잡고 살아'], ['남의 말 한마디를 밤새 껌처럼 곱씹어', '어른들 말씀이 맞더라는 걸 나중에 알았지', '머릿속 설계도부터 그리고 나서 움직여', '천천히 쌓은 생각이 나를 지키는 성벽']]
  };
  /* ── 벌스 1 ②: 일주 12운성 (2줄) */
  var V1_STAGE = {
    장생: ['처음 여는 문고리 앞에서 눈이 반짝 켜져', '새 단원 첫 장마다 나는 다시 태어나'],
    목욕: ['거울 앞 두 시간, 나를 새로 칠하는 중', '설렘은 늘 내 발보다 한 칸 먼저 뛰어'],
    관대: ['박수 들릴 쪽으로 옷깃을 고쳐 세워', '폼이 아냐, 밤새 다린 셔츠의 각이야'],
    건록: ['빌린 의자보다 내가 짠 의자가 편해', '내 두 발이 곧 내 집 주소야'],
    제왕: ['내가 들어서면 방 안 조명이 날 따라와', '운전대 잡은 손이 제일 나다워'],
    쇠: ['한 발 뒤 벤치에서 경기 전체가 보여', '흉터마다 새긴 길눈이 이젠 내 무기야'],
    병: ['남의 아픈 데를 내 손끝이 먼저 짚어', '새벽 세 시 천장에 생각을 다 걸어 뒀지'],
    사: ['멈춰 선 정류장에서 바닥까지 들여다봐', '끝난 줄 안 자리에서 답장을 찾아내'],
    묘: ['소중한 건 마음 서랍 맨 아래 칸에 넣어', '묵혀 둔 장독이 언젠가 제맛을 내'],
    절: ['다 쓴 공책은 미련 없이 덮고 새로 펴', '텅 빈 바닥은 내겐 새 도화지야'],
    태: ['아직 펴지 않은 날개 한 쌍을 품고 걸어', '계획은 머릿속 온실에서 먼저 자라'],
    양: ['누가 물 주는 날엔 키가 한 뼘 자라', '천천히 익는 과일이 끝맛은 더 달아']
  };
  /* ── 벌스 1 ③: 신강약 7단계 × 2가지 (2줄) */
  var V1_ZONE = {
    극왕: [['내 엔진은 시동 끈 적 없는 경주용 차', '넘치는 마력, 어느 트랙에 쏟을지가 숙제'], ['막아선 벽도 결국 내 쪽으로 문을 내', '고집을 나침반 바늘로 바꾸는 중이야']],
    태강: [['넘치는 힘에 혼자 다음 역까지 가 있어', '브레이크 페달 자리도 이제 발이 알아'], ['하고 싶은 건 지하철 노선도만큼 많아', '가속은 충분해, 남은 건 핸들 꺾기야']],
    신강: [['큰 냄비 밥은 나눠 퍼야 맛이 살아', '넘치는 물길에 수로 하나를 내 줘'], ['가끔 시동 꺼도 세상은 안 멈추더라', '짐 내려놓은 어깨가 더 멀리 가더라']],
    중화: [['양쪽 접시 똑같이 맞춘 저울 같은 나', '큰소리 없어도 물때를 읽는 눈이 있어'], ['뜨겁지도 차갑지도 않은 손 닿는 찻잔', '애매함이 아냐, 어디든 맞는 열쇠야']],
    신약: [['남의 잔 채우다 내 잔은 늘 비어 있었지', '내민 손 잡는 것도 배워야 하는 기술'], ['방 안 공기 바뀌는 걸 피부가 먼저 알아', '버티던 기둥 대신 기댈 벽을 찾는 중']],
    태약: [['착하단 말 뒤에 접어 둔 피곤함이 있지', '혼자 다 들면 장바구니 끈이 손을 파'], ['남보다 일찍 닳는 배터리, 그래서 충전해', '작은 걸음이라도 끝까지가 내 박자야']],
    극약: [['물살에 휘는 갈대가 약해 보여도', '물결 방향은 누구보다 먼저 읽어'], ['큰 물살엔 맞서지 않고 등을 맡겨', '기댈 나무를 잘 고르는 게 내 생존법']]
  };
  /* ── 벌스 1 ④: 가장 센 오행의 생활 장면 (2줄) */
  var V1_DOMEL = {
    목: ['창가 화분이 하나둘 늘어 가는 건', '뭘 키우고 싶은 마음이 뿌리를 내려서야'],
    화: ['꺼진 방보다 불 켜진 골목이 좋아', '웃음소리 난로 곁에서 나도 같이 데워져'],
    토: ['단골집 그 자리, 늘 걷는 그 골목길', '안 변하는 것들이 내 닻이 돼 줘'],
    금: ['서랍 속 볼펜까지 줄 맞춰 서 있어야 해', '흐트러진 틈은 내 눈에 먼저 걸려'],
    수: ['샤워기 물줄기 아래서 답이 떠올라', '물소리가 머릿속 먼지를 씻어 가']
  };
  /* ── 벌스 1 ⑤: 훅으로 넘어가는 두 줄(용신) */
  var V1_PRE = {
    목: ['그래서 나는 새잎 돋는 쪽으로 몸을 틀어', '저 멀리서 바람 냄새가 먼저 와'],
    화: ['그래서 나는 해 뜨는 창 쪽으로 걸어가', '등 뒤로 따뜻한 바람이 곧 닿을 거야'],
    토: ['그래서 나는 내 마당 흙을 다시 다져', '발밑부터 바람이 천천히 일어나'],
    금: ['그래서 나는 가지치기 가위를 들어', '창틈으로 맑은 바람이 곧 스며들어'],
    수: ['그래서 나는 강가에 앉아 숨을 골라', '물결 위로 바람이 건너오고 있어']
  };

  /* ── 훅 앞 2줄: 용신 / 뒤 2줄: 희신 */
  var HOOK_YONG = {
    목: ['초록빛 바람이 내 쪽으로 불어와', '피어나, 피어나, 닫힌 문도 피어나'],
    화: ['붉은빛 바람이 내 쪽으로 불어와', '타올라, 타올라, 숨긴 나도 타올라'],
    토: ['노란빛 바람이 내 쪽으로 불어와', '쌓여 가, 쌓여 가, 내 하루가 쌓여 가'],
    금: ['하얀빛 바람이 내 쪽으로 불어와', '빛나, 빛나, 다듬은 만큼 빛나'],
    수: ['푸른빛 바람이 내 쪽으로 불어와', '흘러가, 흘러가, 막혀도 흘러가']
  };
  var HOOK_HEE = {
    목: ['뿌리는 깊게, 가지는 높게', '천천히 자라도 나는 안 멈춰'],
    화: ['어깨는 펴고, 고개는 들고', '햇볕 쪽으로 한 걸음 더'],
    토: ['서두르지 마, 땅은 안 무너져', '발 딛은 여기가 내 무대야'],
    금: ['덜어 낼수록 선명해져', '날 세운 하루가 은빛으로 반짝'],
    수: ['돌아가도 돼, 물은 길을 알아', '끝내 바다로, 나는 흘러가']
  };

  /* ── 벌스 2 ①: 약한 십성 무리 (앞 2줄: 힘들었던 것 / 뒤 2줄: 해법 — 빈 오행이 있으면 뒤 2줄은 빈 오행 문구) */
  var V2_WEAK = {
    비겁: [['근데 단톡방 속 내 편은 늘 읽음뿐이었지', '남 박자 맞추다 내 목소리는 음소거'], ['그럴 땐 내가 내 첫 번째 응원석이 돼', '작은 고집 하나는 주머니에 넣어 둬']],
    식상: [['근데 하고 싶은 말을 목구멍에 삼켰지', '꾹 눌러 둔 말들이 속에서 체기가 됐지'], ['서툴러도 뚜껑을 열면 김이 빠져 숨 쉬어', '메모장 한 줄이 내 숨구멍이 돼']],
    재성: [['근데 내 지갑은 늘 구멍 난 주머니였어', '월급날 통장은 하루짜리 불꽃놀이였지'], ['작은 가계부 한 권이 새는 틈을 막아', '쥔 동전을 지키는 손, 지금부터 길러']],
    관성: [['근데 정해진 틀은 꽉 끼는 교복 같았지', '마감 전날 밤 모니터랑 해 뜨는 걸 봤지'], ['작은 약속 하나씩, 계단처럼 밟아 가', '규칙은 족쇄 아닌 난간이란 걸 배워']],
    인성: [['근데 쉬는 법을 몰라 혼자 방전됐었지', '안내판 하나 없이 맨몸으로 벽에 부딪혔잖아'], ['잠깐 기대는 어깨도 용기란 걸 알아', '누군가의 한 줄 조언이 등대가 돼']]
  };
  var V2_LACK = {
    목: ['내 숲엔 나무 한 그루가 비어 있대서', '시작이 무거운 날엔 공원 길부터 걸어'],
    화: ['내 아궁이엔 불 한 점이 비어 있대서', '말문 막힌 날엔 햇볕 한 줌 쬐러 나가'],
    토: ['내 땅엔 흙 한 줌이 비어 있대서', '붕 뜬 날엔 아침 루틴으로 발을 묻어'],
    금: ['내 서랍엔 쇠붙이 하나가 비어 있대서', '맺고 끊기 힘든 날엔 목록에 줄을 그어'],
    수: ['내 우물엔 물 한 바가지가 비어 있대서', '머리가 끓는 날엔 찬물 한 잔 먼저 마셔']
  };
  /* ── 벌스 2 ②: 원국 구조 패턴 (우선순위 순, 2줄) */
  var PATTERN_ORDER = ['재다신약', '군겁쟁재', '관살혼잡', '상관견관', '효신탈식(도식)', '관살과다', '식상과다(설기)', '인성과다', '상관패인', '식신제살', '살인상생', '무재', '무관', '무식상', '무인성'];
  var V2_PATTERN = {
    재다신약: ['차려진 밥상은 많은데 숟가락은 하나뿐이야', '다 집으려다 체하기 전에 한 접시만 골라'],
    군겁쟁재: ['피자 한 판에 포크가 열 개, 내 조각이 얇아져', '나눠 먹되 내 접시엔 먼저 한 쪽 덜어 둬'],
    관살혼잡: ['울리는 알림마다 다른 상사 이름이 떠', '다 받지 말고 내 의자 하나만 붙들어'],
    상관견관: ['윗사람 말에 브레이크 대신 경적을 울렸지', '할 말은 주머니에 두고 신호 바뀔 때 꺼내'],
    '효신탈식(도식)': ['머릿속 회의는 긴데 손은 아직 대기실', '고민은 컵라면 삼 분, 일단 첫 줄부터 써'],
    관살과다: ['어깨엔 남의 가방까지 매달린 퇴근길', '내려놓는 것도 짐을 지는 한 방법이래'],
    '식상과다(설기)': ['말하고 만들다 보면 배터리가 빨간 줄', '쏟아 낸 만큼 충전기 꽂는 밤도 챙겨'],
    인성과다: ['준비물만 챙기다 소풍날이 지나갔지', '완벽한 지도보다 오늘 신은 운동화가 먼저'],
    상관패인: ['튀는 생각이 폭죽이면 배움은 그 발사대', '덕분에 반짝임이 손에 쥔 실력이 돼'],
    식신제살: ['조여 오는 압박도 내 손에선 매듭 풀기', '말 대신 결과물 하나로 조용히 답해'],
    살인상생: ['모진 숙제 앞에서 오히려 키가 한 뼘 커', '버틴 밤들이 결국 내 졸업장이 돼'],
    무재: ['돈 얘기만 나오면 외국어 듣는 기분이야', '작은 동전 하나부터 내 손으로 굴려 봐'],
    무관: ['남이 재단한 정장은 어깨가 늘 끼어', '내 치수로 그은 선 하나면 충분해'],
    무식상: ['속마음은 임시저장함에만 쌓여 있어', '짧은 메모 한 줄로 내 목소리를 꺼내'],
    무인성: ['기댈 벽 없이 혼자 넘긴 교과서들', '이제는 손 내미는 법도 배워 볼래'],
    _: ['계획표는 늘 첫 장부터 비가 샜지만', '그 덕에 즉석 우산 펴는 솜씨가 늘었어']
  };
  /* ── 벌스 2 ③: 지금 대운 계절 (2줄) + 천간 십성 (1줄) + 상태 (1줄) */
  var V2_DW = {
    opportunity: ['지금 내 십 년은 처음 보는 문고리 앞', '삐걱대도 한 번은 손잡이를 돌려 볼래'],
    expansion: ['내 십 년은 지금 단칸방에서 넓은 집으로', '연락처도 할 일도 서랍이 모자라'],
    harvest: ['지금 내 십 년은 묵혀 둔 적금 만기일', '버틴 계절들이 하나둘 이자로 돌아와'],
    accumulation: ['지금 내 십 년은 벽돌 한 장씩 올리는 공사', '티 안 나는 매일이 기둥이 되어 가'],
    transition: ['지금 내 십 년은 이삿짐 상자 쌓인 거실', '익숙한 게 흔들려도 끝 아닌 새 주소야'],
    defense: ['지금 내 십 년은 성벽을 다시 쌓는 때', '판 벌이기보다 가진 걸 단단히 묶어 둬']
  };
  var V2_DW_TG = {
    비견: '이번 십 년엔 나란히 뛰는 발소리가 늘어',
    겁재: '이번 십 년엔 경쟁도 의리도 한 잔에 섞여',
    식신: '이번 십 년엔 손맛 하나가 밥상을 차려',
    상관: '이번 십 년엔 삼킨 말들이 마이크를 만나',
    편재: '이번 십 년엔 큰 판의 돈길이 훤히 비쳐',
    정재: '이번 십 년엔 저금통 무게에 재미가 붙어',
    편관: '이번 십 년엔 무거운 갑옷이 나를 단련해',
    정관: '이번 십 년엔 내 이름표 붙은 자리가 생겨',
    편인: '이번 십 년엔 남다른 공부가 뒷길을 열어',
    정인: '이번 십 년엔 어른의 손길이 등에 닿아'
  };
  var V2_DW_COND = {
    순풍: '내리막 자전거처럼 페달이 가벼워, 올라타',
    보통: '오르막도 내리막도 내 보폭으로 넘어가',
    주의: '속도는 한 칸 낮추고 안전벨트는 꽉 매',
    부담: '무리한 약속 대신 쉬는 날에 동그라미부터'
  };
  /* ── 벌스 2 ④: 다시 일어서는 두 줄(일간 오행) — 두 번째 훅으로 넘어간다 */
  var V2_PRE = {
    목: ['베인 그루터기에서도 연둣빛이 돋아', '한 번 더 고개 들어 햇빛 쪽으로 뻗어'],
    화: ['다 꺼진 줄 안 아궁이에 아직 온기가 남아', '한 번 더 장작 넣고 앞으로 타오를래'],
    토: ['무너진 담장 자리에 다시 흙을 다져', '다시 쌓은 그 자리가 내 대답이 돼'],
    금: ['망치 맞은 쇠일수록 날이 더 맑아져', '한 번 더 숫돌에 갈아 앞으로 가'],
    수: ['막힌 바위 앞에서 물은 길을 바꿀 뿐', '한 번 더 굽이쳐 가, 내 물길대로']
  };

  /* ── 브리지 ①: 올해 세운 계절 (2줄, {year} 자리에 올해 연도) */
  var BR_YEAR = {
    opportunity: ['{year}년엔 낯선 초인종이 자꾸 울려', '반가운 알림 하나가 내 하루를 갈아입혀'],
    expansion: ['{year}년엔 내 달력 칸이 점점 빽빽해져', '바빠도 웃는 날이 한 줄 더 늘어'],
    harvest: ['{year}년엔 묻어 둔 씨감자가 고개를 내밀어', '고생한 나한테 리본 단 저녁 한 끼 사 줘'],
    accumulation: ['{year}년엔 소리 없이 저금통이 무거워져', '티 안 나는 하루들이 내 뒤를 받쳐'],
    transition: ['{year}년엔 익숙한 골목 간판이 바뀌어', '길 잃은 듯할 땐 잠깐 멈춰 숨부터 쉬어'],
    defense: ['{year}년엔 문단속이 곧 나를 지키는 해', '지갑도 마음도 자물쇠 한 번 더 확인해']
  };
  /* ── 브리지 ②: 올해 세운 천간 십성 (2줄) */
  var BR_TG = {
    비견: ['같은 꿈 꾸는 러닝메이트가 옆 트랙에 서', '나란히 뛰되 내 호흡은 내가 세'],
    겁재: ['지갑이 자꾸 혼자 입을 벌려', '기분이 계산대 먼저 가기 전에 한 번 더 셈해'],
    식신: ['좋아하는 일로 하루 접시가 가득 차', '맛있는 한 끼와 깊은 잠이 제일 큰 충전'],
    상관: ['참았던 말이 목구멍 문을 두드려', '솔직함에 다정함 한 숟갈 타서 건네'],
    편재: ['뜻밖의 돈 얘기가 창문 틈으로 들어와', '들뜬 가슴보다 계산기를 먼저 켜'],
    정재: ['성실한 발자국만큼 통장에 잔고가 찍혀', '새는 고정 지출 막으면 숨통이 트여'],
    편관: ['예고 없는 숙제가 책상 위에 툭 떨어져', '몸이 경고등 켜면 그날은 시동을 꺼'],
    정관: ['내 이름 새긴 명함이 쓰일 일이 늘어', '지킨 약속 하나하나가 평판의 계단이 돼'],
    편인: ['혼자 파는 굴 속 공부가 재밌어져', '엉뚱한 호기심이 숨은 문을 찾아내'],
    정인: ['배울 어른, 기댈 어깨가 눈에 들어와', '서명 전엔 도장보다 눈을 먼저 찍어']
  };
  /* ── 브리지 ③: 대표 신살·귀인 (드문 것부터, 2줄) */
  var STAR_ORDER = ['삼기귀인', '도화살', '고란살', '금신살', '양인살', '천의성', '문창귀인', '학당귀인', '천을귀인', '괴강살', '홍염살', '화개살', '금여록', '암록', '건록', '백호대살', '천문성'];
  var BR_STAR = {
    삼기귀인: ['주머니마다 숨겨 둔 비밀 열쇠가 셋', '하나씩 꺼낼수록 열리는 문이 늘어'],
    도화살: ['어딜 가도 시선이 내 쪽에서 한 번 더 쉬어', '그 조명은 내 무대를 밝히는 데 써'],
    고란살: ['혼자 끓인 라면 맛을 일찍 알아 버렸지', '그래도 한 그릇 덜어 줄 자리는 남겨'],
    금신살: ['벼려 둔 결단이 은빛으로 반짝여', '칼은 칼집에, 꼭 필요한 순간만 꺼내'],
    양인살: ['한번 쥐면 끝까지 가는 강철 손아귀', '그 힘은 누군가를 지키는 방패로 써'],
    천의성: ['아픈 사람 앞에선 손이 약상자처럼 열려', '내 돌봄 한 줌이 누군가의 하루를 살려'],
    문창귀인: ['흩어진 말도 내 손에선 문장으로 줄 서', '내 글 한 줄이 누군가의 이정표가 돼'],
    학당귀인: ['강의실 불이 켜지면 내 눈도 같이 켜져', '공부한 만큼 정직하게 메아리가 와'],
    천을귀인: ['막다른 골목마다 누가 쪽문을 열어 줘', '받은 손길은 잊지 않고 또 건네'],
    괴강살: ['미지근한 물은 못 참는 끓는점의 기질', '센 불도 잘 다루면 큰 솥을 끓여'],
    홍염살: ['말없이 앉아만 있어도 공기가 물들어', '그 감성이 밥벌이가 되는 순간을 알아'],
    화개살: ['불 끈 방 혼자일 때 영감이 쏟아져', '고독이 내 작업실의 조명이 돼'],
    금여록: ['좋은 인연이 좋은 의자를 데려와', '받은 복은 나눌수록 눈덩이처럼 굴러와'],
    암록: ['티 안 나게 주머니에 들어온 숨은 쪽지', '어려울 땐 뒷문 하나가 살짝 열려 있어'],
    건록: ['내 땀으로 번 돈이 제일 든든한 밥', '성실한 두 손이 결국 나를 먹여 살려'],
    백호대살: ['한번 터지면 둑을 넘는 물살 같은 힘', '그 힘은 땀과 일에 다 쏟아부어'],
    천문성: ['보이지 않는 흐름에 안테나가 먼저 서', '설명은 못 해도 내 촉은 꽤 맞아'],
    _: ['아직 이름표 없는 재능이 서랍 속에 있어', '하나씩 꺼내 보며 내 색을 칠해 가']
  };

  /* ── 아웃트로: 조후 1줄 + 합충 1줄 + 일간 오행 2줄 */
  var OUT_CLIMATE = {
    hot: '달아오른 내 여름에 찬물 한 컵 같은 쉼을',
    cold: '언 손 같은 내 겨울에 햇볕 한 줌 온기를',
    mild: '춥지도 덥지도 않은 내 봄가을을 걸어'
  };
  var OUT_REL = {
    clash: '부딪힌 자리마다 잠든 나를 흔들어 깨워',
    combo: '이어진 인연들이 내 후렴을 같이 불러',
    both: '당기고 밀치며 시소 위 균형을 찾아',
    none: '큰 파문 없이 잔잔한 호수처럼 흘러'
  };
  /* ── 아웃트로 끝 2줄: 60갑자 일주마다 그 일주의 기질을 담은 마무리(사용자 요청 2026-11-19). 표에 없으면 일간 오행(OUT_EL)으로 */
  var DAY_OUTRO = {
    갑자: ['자정의 겨울 강가, 얼음 위에 선 큰 나무', '뿌리는 찬물을 마시고 키를 한 뼘 더 키워'],
    을축: ['언 밭고랑 틈으로 덩굴이 손을 내밀어', '더디게 감은 매듭마다 내 봄이 묶여 있어'],
    병인: ['새벽 숲 꼭대기를 처음 물들이는 해', '내가 깬 아침이 남의 창문까지 번져'],
    정묘: ['봄밤 토끼풀 사이 흔들리는 작은 등불', '남의 어두운 골목에 내 불을 덜어 줘'],
    무진: ['봄비 젖은 큰 산, 안개 속에 용이 뒤척여', '오래 접어 둔 날개를 이제 펼 차례야'],
    기사: ['늦봄 한낮, 햇볕이 고루 스미는 텃밭', '내 손 닿은 이랑마다 내일이 여물어'],
    경오: ['한낮 땡볕 아래 달리는 말의 쇠 등자', '열기에 달궈져도 내 날은 휘지 않지'],
    신미: ['여름 오후 마른 흙 속에 반짝이는 은반지', '흙먼지 털어 낸 자리에서 내 빛이 드러나'],
    임신: ['초가을 바위 협곡을 휘감는 큰 강', '막힌 데를 만나면 물길부터 새로 그려'],
    계유: ['가을 새벽 거미줄에 맺힌 이슬 한 방울', '가장 작은 렌즈로 세상을 또렷이 비춰'],
    갑술: ['노을 진 마른 언덕에 홀로 선 늙은 소나무', '쓰러질 듯 버틴 가지가 이정표가 됐지'],
    을해: ['초겨울 밤 호수 위를 떠도는 연잎 하나', '물결에 몸을 맡겨도 줄기는 놓지 않아'],
    병자: ['한겨울 자정 바다 위로 떠오른 해', '얼음 같은 밤일수록 내 온도가 증명돼'],
    정축: ['눈 덮인 외양간 구석 꺼지지 않는 화로', '식은 손들이 결국 내 곁으로 모여들어'],
    무인: ['새벽 안개 속 호랑이가 사는 큰 산', '한번 디딘 발자국은 되돌아가지 않아'],
    기묘: ['봄 아침 토끼가 뛰노는 갓 갈아엎은 밭', '내 흙에선 남의 꿈도 뿌리를 내려'],
    경진: ['봄 늪에서 용의 비늘처럼 번뜩이는 쇠', '판이 클수록 내 울림은 더 멀리 가'],
    신사: ['초여름 화덕 속에서 빛을 벼리는 보석', '뜨거운 순간마다 진짜 내 결이 떠올라'],
    임오: ['한여름 정오, 햇빛을 싣고 흐르는 큰 강', '끓는 날에도 나는 식은 머리로 흘러가'],
    계미: ['여름 오후 마른 들판에 쏟아지는 소나기', '갈라진 마음마다 스며들어 금을 메워'],
    갑신: ['초가을 바위 절벽에 뿌리박은 큰 나무', '돌을 쪼개며 자란 뿌리라 쉽게 안 뽑혀'],
    을유: ['가을 저녁 서리 내린 담장 위 담쟁이', '여린 잎끝에 칼날 같은 감이 서 있어'],
    병술: ['늦가을 해 질 녘, 언덕을 붉게 태우는 노을', '마지막 빛까지 내 사람 쪽으로 기울여'],
    정해: ['초겨울 밤바다를 비추는 등대 불빛', '헤매던 배들이 나를 보고 항구로 와'],
    무자: ['자정의 겨울 산, 품속에 언 호수 하나', '겉은 고요한 능선, 속은 깊게 출렁여'],
    기축: ['눈 아래 잠든 겨울 밭, 소가 쉬는 새벽', '숨죽인 흙이 봄을 제일 먼저 기억해'],
    경인: ['새벽 숲길을 가르는 호랑이 발톱 같은 도끼', '망설임 대신 길을 쪼개며 앞서가'],
    신묘: ['봄 아침 이슬 맺힌 풀잎 끝의 은바늘', '가는 눈썰미 하나로 판의 실밥을 풀어'],
    임진: ['늦봄 안개 낀 호수에서 몸을 트는 용', '잠잠한 수면 밑에 큰 물굽이를 감췄지'],
    계사: ['초여름 달궈진 돌담 위로 떨어지는 단비', '뜨거운 걸 식힐 줄 아는 손이 나야'],
    갑오: ['한여름 정오 들판을 그늘로 덮은 큰 나무', '말보다 마음이 먼저 달려 나가 있어'],
    을미: ['늦여름 메마른 언덕에 질기게 감긴 칡넝쿨', '가문 날에도 웃음 한 줄은 꼭 남겨 둬'],
    병신: ['초가을 오후 쇠 지붕마다 튕기는 햇살', '재치 한 마디에 굳은 공기가 반짝 깨져'],
    정유: ['가을 저녁 보석함 위에 켜 둔 촛불', '작은 모서리 하나로 큰 마음을 움직여'],
    무술: ['늦가을 노을 아래 산문을 지키는 개 한 마리', '내 사람 앞에선 나는 닫히지 않는 문'],
    기해: ['초겨울 밤 빗물 머금고 쉬는 넓은 밭', '누구든 내 곁에선 신발을 벗고 앉아'],
    경자: ['한겨울 자정 얼음물에 씻긴 칼날', '똑 떨어진 한마디가 엉킨 길을 끊어 내'],
    신축: ['언 흙 속에서 새벽을 기다린 원석', '참아 낸 시간만큼 단면이 맑아져'],
    임인: ['새벽 숲을 적시며 내려가는 큰 강', '내가 지나간 자리마다 숲이 한 뼘 자라'],
    계묘: ['봄 아침 토끼풀 위에 보슬보슬 내리는 비', '부드러운 말 한 방울에 닫힌 문이 열려'],
    갑진: ['봄 안개 낀 큰 산 위로 솟은 푸른 나무', '포부만큼 가지를 하늘 끝까지 뻗어'],
    을사: ['초여름 햇살 아래 담장을 타는 장미 넝쿨', '센스 한 줄기로 회색 벽을 물들여'],
    병오: ['한여름 정오 하늘에 뜬 또 하나의 태양', '내가 들어서면 무대 조명이 필요 없어'],
    정미: ['여름밤 마당 한가운데 타닥이는 모닥불', '곁에 앉은 사람마다 손끝이 데워져'],
    무신: ['초가을 오후 바위산을 깎아 낸 큰 길', '말 대신 결과로 정상을 찍어 보여'],
    기유: ['가을 저녁 황금빛으로 익은 들녘', '챙겨 둔 작은 것들이 곳간을 가득 채워'],
    경술: ['늦가을 노을 속 우뚝 선 돌 성벽', '한번 건 약속은 성문보다 무겁게 지켜'],
    신해: ['초겨울 밤 맑은 샘물에 잠긴 진주', '투명한 속을 보여 줘서 사람이 머물러'],
    임자: ['자정의 겨울 밤바다, 끝이 안 보이는 수평선', '물밑 흐름을 읽는 눈이 누구보다 빨라'],
    계축: ['언 들판 밑으로 소리 없이 흐르는 지하수', '티 안 나게 버틴 물이 우물을 채워'],
    갑인: ['새벽 숲 한가운데 호랑이가 기대 선 거목', '내가 앞서 걸으면 수풀이 길이 돼'],
    을묘: ['봄 아침 들판 가득 번지는 연둣빛 풀', '어느 틈에 섞여도 금세 풍경이 돼'],
    병진: ['봄 안개 구름을 뚫고 오르는 아침 해', '큰 꿈일수록 내 빛이 먼저 가 닿아'],
    정사: ['초여름 한낮, 불꽃 속에서 또 피는 불꽃', '한번 몰입하면 시계도 나를 못 말려'],
    무오: ['한여름 정오, 속불을 품은 화산', '고요하던 능선이 한순간 하늘을 밝혀'],
    기미: ['늦여름 오후 뿌리 깊은 고구마 밭', '남의 속도 말고 내 걸음으로 이랑을 끝내'],
    경신: ['초가을 대장간 모루 위에 겹친 두 칼날', '망설임 없는 한 획으로 판을 정리해'],
    신유: ['가을 저녁 별빛을 깎아 넣은 보석', '실밥 하나 그냥 넘기지 않는 손끝이야'],
    임술: ['늦가을 마른 언덕을 적시며 도는 큰 강', '거친 땅일수록 내 물길은 더 멀리 뻗어'],
    계해: ['초겨울 밤 바다로 이어지는 빗물 한 줄기', '작은 물방울로 시작해 끝내 바다가 돼']
  };
  var OUT_EL = {
    목: ['다 자란 숲도 처음엔 한 뼘 그늘이었지', '내 이야기는 아직 나이테를 늘리는 중'],
    화: ['꺼질 듯 흔들려도 심지는 아직 곧아', '내 불빛은 오늘 밤도 창가에 켜져 있어'],
    토: ['장대비가 쏟아져도 땅은 그 자리에 있지', '내 이야기는 오늘도 한 겹 더 단단해져'],
    금: ['두드린 만큼 더 맑은 종소리가 나지', '내 이야기는 아직 빛을 내는 중이야'],
    수: ['막혀도 물은 끝내 바다를 찾아가지', '내 이야기는 오늘도 굽이굽이 흘러가']
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
    hook: ['big catchy chorus', 'groovy sing-along hook', 'repeated chant phrase', 'call-and-response backing vocals', 'soulful vocal harmonies', 'english tag line', 'full groove with bass'], verse2: ['rap verse with rising energy', 'clear korean rap vocals', 'bouncy flow', 'cadence switch-ups', 'groove building'],
    hook2: ['big catchy chorus', 'groovy sing-along hook', 'repeated chant phrase', 'call-and-response backing vocals', 'soulful vocal harmonies', 'english tag line', 'full groove with bass', 'extra energy'], bridge: ['stripped-down groove', 'bass and keys breakdown', 'soulful melodic rap', 'drums back in'], outro: ['groove ride-out', 'smooth fade of the band', 'ad-libs', 'clean ending'] };
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
