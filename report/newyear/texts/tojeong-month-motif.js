/* 토정비결 월별 심화 해설 — 핵심어 조합 방식(2026-11-17, status draft · 사람 검수 전)
   tojeong-month-deep.js 에 손으로 쓴 괘(시범 3괘)가 없는 괘를, 그 달 원문(규장각 奎古 1077) 3구에 실제로 든 핵심어로 조합해 같은 모양(DEEP[괘])으로 채운다.
   · 뜻(symbol): 이미 승인된 현대어 풀이(tojeong-modern-*.js months[n].gist)를 그대로 쓴다 — 원문 해석을 새로 만들지 않는다
   · 핵심어(재물·관록·귀인·구설·질병·출행·집안·자녀·이성·성씨·방위·안정 등)와 그 구의 좋고 나쁨 표시(不·損·莫·勿·愼·憂·凶·厄 …)로 분야·장면·해 볼 것·조심할 것을 고른다
   · 원문에 없는 분야는 쓰지 않는다. 같은 괘 안에서 같은 문장은 변형을 돌려 쓰고, 주제가 앞 달과 같으면 다음 후보를 쓴다
   · 성씨·방위는 '원문의 옛 표현'으로 밝히고 현대식 읽기를 붙인다. 몸·사고는 진료·안전을 먼저 말한다
   · 원문에 달별 구절이 없는 괘(국중도 보충 4괘)는 만들지 않는다 → compose 는 기존 월 카드를 쓴다 */
(function (root) {
  'use strict';
  var NEG = /不|損|莫|勿|愼|慎|憂|凶|厄|失|害|難|畏|敗|災|紛|散|亂|虛|禍|驚|無|奈|恐|防|免|妄|離|別|退|窮|困/;
  // 핵심어 사전: re 는 그 달 원문의 구(8자)에 대해 검사, kind 는 화면 칸(money·work·people·home·body·move·dir), pos/neg 는 문장 묶음(각 칸 2~3개 변형)
  var K = [
    { id: 'body', re: /疾病|病|身厄|身數不利|身運不吉|橫厄|身上有厄|有厄|厄/, kind: 'body', always: 'neg',
      neg: { theme: ['몸과 안전을 먼저 챙길 달', '무리하지 말고 몸을 아낄 달'], line: ['원문은 몸의 액이나 뜻밖의 사고를 경계해요. 운세보다 생활 리듬과 안전을 먼저 챙기고, 이상이 느껴지면 진료를 먼저 받으세요.', '원문이 몸을 조심하라고 짚는 달이에요. 잠과 식사를 일정하게 지키고, 작은 이상 신호도 넘기지 말고 살펴 주세요.'], scene: ['평소보다 피로가 쉽게 쌓이고, 작은 부주의가 다칠 일로 이어지기 쉬운 달이에요.', '무리한 일정 뒤에 몸이 먼저 신호를 보내기 쉬운 때예요.', '바쁜 와중에 "괜찮겠지" 하고 넘긴 작은 증상이 마음에 걸리기 쉬운 달이에요.'], do: ['잠과 식사 시간을 일정하게 지키세요.', '미뤄 둔 검진이나 치과 예약을 이달에 잡아 보세요.'], avoid: ['무리한 일정과 위험한 활동은 줄이세요.', '피곤한 날의 운전과 늦은 귀가는 피하세요.'] } },
    { id: 'gusul', re: /口舌|是非|訟|爭|官災/, kind: 'people', always: 'neg',
      neg: { theme: ['말을 아껴야 하는 달', '시비에서 한 발 물러설 달'], line: ['원문은 구설과 시비를 경계해요. 뒷말이 오가는 자리에서는 한 발 물러서 있는 편이 좋아요.', '원문이 말로 생기는 다툼을 짚어요. 같은 말도 글보다 직접, 짧게 전하는 편이 오해를 줄여요.', '원문은 다툼과 송사를 경계해요. 감정이 오른 날의 메시지는 보내기 전에 한 번 더 읽어 보세요.'], scene: ['별 뜻 없이 한 말이 돌고 돌아 엉뚱한 모양으로 돌아오기 쉬운 달이에요.', '누가 옳은지 따지는 대화에 끼어들었다가 괜히 피곤해지기 쉬운 때예요.', '단체 대화방에서 한마디 거들었다가 분위기가 싸해지기 쉬운 달이에요.'], do: ['중요한 이야기는 글보다 직접 짧게 전하세요.', '오해가 생기면 그날 안에 짧게 풀어 두세요.'], avoid: ['남의 이야기를 옮기거나 시비에 끼어들지 마세요.', '이기려는 말싸움은 시작하지 마세요.'] } },
    { id: 'jae', re: /財|金玉|千金|金谷|錢|利在|有利|得利|求利/, kind: 'money',
      pos: { theme: ['재물이 들어오는 달', '돈의 흐름이 살아나는 달'], line: ['원문은 재물의 흐름이 좋다고 해요. 들어온 돈은 쓰임을 정하기 전에 일부를 먼저 떼어 두세요.', '원문이 재물이 따른다고 짚는 달이에요. 좋은 흐름일수록 지킬 몫을 먼저 정해 두면 남는 게 달라져요.', '원문은 이익이 그 가운데 있다고 해요. 들어오는 돈의 길을 하나로 정리해 두면 흐름이 오래가요.'], scene: ['미뤄 두었던 돈이 들어오거나, 생각지 못한 수입 이야기가 생기기 쉬운 달이에요.', '일한 만큼 숫자로 돌아오는 게 눈에 보이는 때예요.', '"이건 돈이 되겠다" 싶은 제안이 한두 건 들어오기 쉬운 달이에요.'], do: ['들어온 돈의 일부를 바로 따로 떼어 두세요.', '수입이 생기면 고정비부터 한 번 정리해 보세요.'], avoid: ['좋은 흐름을 근거로 씀씀이를 한꺼번에 늘리지 마세요.', '들어온 돈으로 바로 큰 결제를 하지 마세요.'] },
      neg: { theme: ['돈이 새기 쉬운 달', '지갑을 단단히 닫을 달'], line: ['원문은 재물의 손해를 경계해요. 빌려주거나 보증을 서는 일, 급한 큰 결제는 이달만큼은 미루세요.', '원문이 돈이 모이기 어렵다고 짚는 달이에요. 새 지출보다 새는 곳을 막는 데 힘을 쓰세요.', '원문은 재물에서 손해가 있다고 해요. 주고받는 돈은 금액과 날짜를 글로 남겨 두세요.'], scene: ['계획에 없던 지출이 한두 건 겹쳐 통장이 생각보다 빨리 얇아지기 쉬운 달이에요.', '"이번만"이라는 부탁이 돈과 함께 오기 쉬운 때예요.', '들어온 돈보다 나갈 곳이 먼저 보이기 쉬운 달이에요.'], do: ['이달 쓸 돈의 상한을 첫 주에 정해 두세요.', '구독·자동이체처럼 새는 돈을 한 번 점검하세요.'], avoid: ['빌려주기·보증·충동 결제는 피하세요.', '손해를 만회하려는 급한 결정은 하지 마세요.'] } },
    { id: 'hoeng', re: /橫財/, kind: 'money', always: 'pos',
      pos: { theme: ['뜻밖의 재물이 비치는 달'], line: ['원문은 뜻밖의 재물(횡재)을 말해요. 옛 글의 표현이니 기대하기보다, 들어오면 지키는 계획부터 세우세요.', '원문에 횡재라는 말이 보여요. 생각지 못한 돈이 생기면 쓰기 전에 하루를 두고 쓰임을 정하세요.'], scene: ['잊고 있던 돈이나 생각지 못한 환급·보너스 소식이 들리기 쉬운 달이에요.', '작은 행운이 한 번쯤 찾아오기 쉬운 때예요.'], do: ['뜻밖의 돈은 절반을 먼저 떼어 두세요.'], avoid: ['횡재를 바라는 투기성 결정은 피하세요.'] } },
    { id: 'gwan', re: /官祿|功名|科甲|名振|名利|得意|成功|經營|榮貴|昇|權/, kind: 'work',
      pos: { theme: ['일에서 이름이 나는 달', '애쓴 일이 인정받는 달'], line: ['원문은 벼슬과 공명, 곧 일에서 인정받는 흐름을 말해요. 해낸 일을 정리해 보여 줄 자리를 만들어 보세요.', '원문이 이름과 이익이 함께 오른다고 짚어요. 맡고 싶은 역할이 있다면 이달에 말해 보세요.', '원문은 일이 뜻대로 이뤄진다고 해요. 미뤄 둔 결정 하나를 이달에 매듭지어 보세요.'], scene: ['맡은 일이 윗사람이나 주변 눈에 띄어 이름이 오르내리기 쉬운 달이에요.', '시험·평가·발표처럼 결과가 나오는 자리에서 좋은 소식을 기대해 볼 만한 때예요.', '오래 붙잡고 있던 일이 드디어 모양을 갖추기 쉬운 달이에요.'], do: ['해낸 일을 숫자와 기록으로 정리해 두세요.', '원하는 역할이나 조건을 이달에 분명히 말해 보세요.'], avoid: ['칭찬받는 때일수록 감당 못 할 약속은 늘리지 마세요.', '인정받을 때 혼자 결정하는 일이 늘지 않게 하세요.'] },
      neg: { theme: ['일이 뜻대로 안 풀리는 달', '일의 순서를 다시 세울 달'], line: ['원문은 일이 마음과 어긋난다고 경계해요. 새 일을 벌이기보다 하던 일의 빈틈을 메우세요.', '원문이 일의 성사를 어렵게 봐요. 서류·계약·절차를 한 번 더 확인하는 달로 쓰세요.'], scene: ['열심히 준비한 일이 엉뚱한 데서 막히거나 순서가 꼬이기 쉬운 달이에요.', '서류·계약·규정처럼 작은 절차에서 일이 틀어지기 쉬운 때예요.'], do: ['계약서와 서류를 한 번 더 확인하세요.', '할 일을 줄이고 하나씩 끝내세요.'], avoid: ['결과를 서두르며 절차를 건너뛰지 마세요.', '답답하다고 일을 한꺼번에 몰아치지 마세요.'] } },
    { id: 'gwiin', re: /貴人/, kind: 'people', always: 'pos',
      pos: { theme: ['귀인이 손을 내미는 달', '도와주는 사람이 나타나는 달'], line: ['원문은 귀인의 도움을 말해요. 이달 먼저 연락 온 사람의 제안은 가볍게 넘기지 말고 들어 보세요.', '원문이 귀인이 돕는다고 짚어요. 도움이 필요한 일은 혼자 끌어안지 말고 먼저 청해 보세요.', '원문에 귀인이 보여요. 도움을 받으면 고마움을 미루지 말고 바로 전하세요.'], scene: ['막혀 있던 일에 생각지 못한 사람이 "이렇게 해 보면 어때요?" 하고 길을 터 주기 쉬운 달이에요.', '오랜만에 연락 온 사람의 한마디가 이달의 실마리가 되기 쉬운 때예요.', '혼자 끙끙대던 일이 누군가의 소개 한 번으로 풀리기 쉬운 달이에요.'], do: ['도움을 청할 사람 한 명에게 먼저 연락해 보세요.', '소개받은 자리는 가볍게라도 나가 보세요.'], avoid: ['도움을 받았으면 고마움을 미루지 마세요.'] } },
    { id: 'move', re: /出行|遠行|他鄕|移徙|出門|四方|到處/, kind: 'move',
      pos: { theme: ['움직이면 길이 열리는 달', '바깥에서 기회를 찾을 달'], line: ['원문은 나가서 움직일 때 이익이 있다고 해요. 평소 가던 곳 밖으로 한 걸음 넓혀 보세요.', '원문이 가는 곳마다 길하다고 짚어요. 미뤄 둔 만남이나 방문을 이달에 해 보세요.'], scene: ['새로운 장소나 사람을 만나는 자리에서 뜻밖의 기회가 생기기 쉬운 달이에요.', '이사·자리 이동 같은 변화를 알아보기 좋은 때예요.'], do: ['만날 사람과 가 볼 곳의 목록을 넓혀 보세요.'], avoid: ['움직이는 만큼 지출도 늘 수 있으니 예산을 정해 두세요.'] },
      neg: { theme: ['먼 길을 줄일 달', '나서기보다 머물 달'], line: ['원문은 나들이와 먼 길을 경계해요. 꼭 필요한 이동이 아니라면 일정을 줄이고, 떠나야 한다면 여유 있게 움직이세요.', '원문이 문을 나서면 해롭다고 짚어요. 이달은 바깥 일정을 줄이고 하던 일을 지키는 편이 좋아요.'], scene: ['갑작스러운 출장이나 이동 일정이 생기고, 그 길에서 일이 꼬이기 쉬운 달이에요.', '밖으로 나갈 일이 많아질수록 피로와 변수가 함께 늘어나는 때예요.'], do: ['이동 일정은 하루 여유를 두고 잡으세요.'], avoid: ['충동적인 여행이나 먼 길은 미루세요.'] } },
    { id: 'home', re: /家|一室|堂上|宅/, kind: 'home',
      pos: { theme: ['집안이 화평한 달', '웃음이 느는 집'], line: ['원문은 집안의 화평과 경사를 말해요. 가족과 함께할 일정 하나를 잡기 좋은 때예요.', '원문이 집안 운이 좋다고 짚어요. 미뤄 둔 가족 이야기를 꺼내기 좋은 달이에요.'], scene: ['집안 분위기가 풀리고 웃을 일이 늘어나기 쉬운 달이에요.', '가족이 모이는 자리가 평소보다 편안하게 느껴지기 쉬운 때예요.'], do: ['가족과 함께하는 저녁 한 번을 일정에 넣으세요.'], avoid: ['편할 때 가족에게 소홀해지지 않게 하세요.'] },
      neg: { theme: ['집안을 먼저 살필 달', '가족의 안부를 챙길 달'], line: ['원문은 집안의 근심을 경계해요. 집안 어른이나 가까운 가족의 안부를 먼저 챙기세요.', '원문이 집안에 풍파가 있을 수 있다고 짚어요. 가족 사이의 작은 서운함은 미루지 말고 풀어 두세요.'], scene: ['가족 사이에 작은 일로 말이 엇갈리거나, 집안 어른 걱정이 생기기 쉬운 달이에요.', '집안 일이 내 일정보다 앞서야 하는 때가 생기기 쉬워요.'], do: ['집안 어른께 먼저 연락드리세요.'], avoid: ['가족에게 쌓인 서운함을 말없이 넘기지 마세요.'] } },
    { id: 'child', re: /膝下|弄璋|生男|貴子|生子/, kind: 'people',
      pos: { theme: ['아랫사람에게 기쁜 일이 있는 달'], line: ['원문은 집안 아랫사람(자녀·후배)의 경사를 말해요. 가까운 아랫사람에게 기쁜 소식이 오면 함께 축하해 주세요.', '원문에 아랫사람의 경사가 보여요. 자녀나 후배의 작은 성취도 크게 기뻐해 주세요.'], scene: ['가까운 아랫사람에게서 좋은 소식이 들려오기 쉬운 달이에요.'], do: ['아랫사람의 작은 성취를 말로 축하해 주세요.'] },
      neg: { theme: ['아랫사람을 살필 달'], line: ['원문은 집안 아랫사람의 걱정을 말해요. 자녀나 가까운 후배의 이야기를 한 번 더 들어 주세요.'], scene: ['가까운 아랫사람 일로 마음 쓸 일이 생기기 쉬운 달이에요.'], do: ['아랫사람의 이야기를 끝까지 들어 주세요.'] } },
    { id: 'romance', re: /女色|女子|妻宮|妻憂|色/, kind: 'people', always: 'neg',
      neg: { theme: ['관계의 속도를 늦출 달'], line: ['원문은 이성 문제나 배우자 쪽 근심을 경계해요. 감정이 흔들리는 관계는 속도를 늦추고, 가까운 사람의 안부를 먼저 챙기세요.', '원문이 이성과 얽힌 오해를 짚어요. 새로 시작하는 관계는 사람을 충분히 알아본 뒤 마음을 여세요.'], scene: ['마음이 흔들리는 만남이나 관계의 오해가 생기기 쉬운 달이에요.', '가까운 사람과의 사이에서 말 못 할 서운함이 생기기 쉬운 때예요.'], do: ['가까운 사람과 솔직한 대화를 한 번 나눠 보세요.'], avoid: ['감정에 휩쓸린 약속은 하지 마세요.'] } },
    { id: 'together', re: /與人同事|莫信人言|勿信|他人|親人|人言|交遊|相交/, kind: 'people', always: 'neg',
      neg: { theme: ['남의 말보다 내 판단을 믿을 달'], line: ['원문은 남과 함께하는 일이나 남의 말을 경계해요. 동업·공동 투자·남의 말만 듣고 하는 결정은 이달만큼은 피하세요.', '원문이 가까운 사람과의 거래를 조심하라고 짚어요. 가까울수록 금액과 약속을 글로 남기세요.'], scene: ['솔깃한 이야기를 전해 듣고 마음이 흔들리기 쉬운 달이에요.', '가까운 사람의 부탁이 부담으로 바뀌기 쉬운 때예요.'], do: ['남에게 들은 이야기는 한 번 더 확인하세요.'], avoid: ['남의 말만 믿고 돈이나 시간을 걸지 마세요.'] } },
    { id: 'quiet', re: /守分|安靜|妄動|在家則吉|居家有吉|在家有吉|守舊|安居/, kind: null, always: 'neg',
      neg: { theme: ['움직이기보다 지키는 달', '조용히 다듬는 달'], scene: ['괜히 뭔가를 바꾸고 싶어지는데, 막상 움직이면 일이 커지기 쉬운 달이에요.', '새로 벌이기보다 하던 일을 다듬을 때 마음이 편한 때예요.'], do: ['새로 벌이기보다 하던 일을 다듬으세요.'], avoid: ['함부로 큰 결정을 내리지 마세요.'] } },
    { id: 'joy', re: /喜事|慶事|吉慶|喜色|福祿|餘慶|喜滿|重重|和平|和氣/, kind: null, always: 'pos',
      pos: { theme: ['기쁜 소식이 오는 달', '경사가 겹치는 달'], scene: ['미뤄 두었던 좋은 소식이 한꺼번에 들어오기 쉬운 달이에요.', '축하할 일, 축하받을 일이 함께 생기기 쉬운 때예요.'], do: ['좋은 소식이 오면 도와준 사람에게 먼저 알리세요.'], avoid: ['기쁜 일이 겹칠수록 약속을 너무 많이 잡지 마세요.'] } },
    { id: 'worry', re: /心神|憂|愁|心中/, kind: null,
      pos: { theme: ['마음이 놓이는 달'], scene: ['한동안 마음을 누르던 일이 조금씩 풀리기 쉬운 달이에요.'], do: ['편해진 마음으로 미뤄 둔 일 하나를 정리하세요.'] },
      neg: { theme: ['마음이 흔들리기 쉬운 달'], scene: ['이유 없이 마음이 뒤숭숭하고 잠이 얕아지기 쉬운 달이에요.', '해결되지 않은 일이 머릿속을 맴돌기 쉬운 때예요.'], do: ['하루 한 번은 생각을 비우는 산책이나 쉼을 넣으세요.'], avoid: ['마음이 흔들릴 때 큰 결정을 내리지 마세요.'] } },
    { id: 'waterfire', re: /水邊|水厄|火厄|火災|水火/, kind: 'body', always: 'neg',
      neg: { theme: ['물과 불을 조심할 달'], line: ['원문은 물가나 불을 조심하라고 해요. 물놀이·불 쓰는 일에서는 평소보다 안전을 더 챙기세요.'], scene: ['물가 나들이나 불을 쓰는 일이 평소보다 많아지기 쉬운 달이에요.'], do: ['물가·불 쓰는 자리에서는 안전을 한 번 더 확인하세요.'], avoid: ['물가에서 무리한 활동은 피하세요.'] } }
  ];
  // 결 기본 문장(핵심어 문장을 다 썼을 때)
  var FB = {
    goodTheme: ['흐름이 밝게 이어지는 달', '하던 일에 힘이 붙는 달', '작은 기쁨이 쌓이는 달', '마음먹은 일을 밀어 볼 달'],
    badTheme: ['한 박자 쉬어 갈 달', '속도를 늦출 달', '무리하지 않을 달', '조용히 버티는 달'],
    midTheme: ['평소 리듬을 지킬 달', '차분히 다듬는 달', '흐름을 고르는 달', '숨을 고르며 살필 달'],
    goodDo: ['이달의 좋은 흐름을 짧게 기록해 두세요.', '미뤄 둔 일 하나를 이달에 시작해 보세요.', '고마운 사람에게 안부를 전해 보세요.', '다음 달 계획을 이달 말에 미리 적어 두세요.', '잘된 일 하나를 스스로 축하해 주세요.'],
    badDo: ['이달은 하던 일을 차분히 이어 가세요.', '일정에 쉬는 칸을 먼저 넣어 두세요.', '할 일 목록을 줄이고 하나씩 끝내세요.', '마음이 복잡하면 생각을 종이에 적어 보세요.', '가까운 사람과 짧게라도 이야기를 나누세요.'],
    midDo: ['평소 리듬을 지키는 데 힘을 쓰세요.', '작은 정리 하나를 끝내 보세요.', '이달 목표를 하나만 정해 보세요.', '건강 습관 하나를 이달에 다시 시작해 보세요.'],
    goodAv: ['좋을 때 약속을 너무 늘리지 마세요.', '흐름이 좋다고 준비 없이 판을 키우지 마세요.', '기분 좋은 날의 큰 결제는 하루 미루세요.', '잘될 때 주변 사람을 소홀히 하지 마세요.'],
    badAv: ['서두르는 결정은 미루세요.', '무리한 약속은 잡지 마세요.', '감정이 오른 날의 말은 아끼세요.', '손해를 만회하려는 급한 선택은 피하세요.', '혼자 끙끙 앓지 마세요.'],
    midAv: ['큰 결정을 몰아서 하지 마세요.', '남의 속도에 휩쓸리지 마세요.', '작은 약속을 가볍게 여기지 마세요.']
  };
  var DIRS = { 東: '동', 西: '서', 南: '남', 北: '북' }, ELS = { 金: '금(金)', 木: '목(木)', 水: '수(水)', 火: '화(火)', 土: '토(土)' };
  // 원문 구(8자) 하나에서 핵심어와 좋고 나쁨을 읽는다
  // 좋고 나쁨은 핵심어가 든 네 글자에서 먼저 읽고(그 네 글자에 표시가 없거나 '비록(雖)'으로 시작하면 짝이 되는 네 글자로) 정한다
  //   예: 財數平吉 口舌愼之 → 재물은 '吉'(좋음), 구설은 '愼'(조심) / 雖有財物 聚財不能 → 재물은 뒤 '不能'(나쁨)
  var POS = /吉|得|旺|來|助|成|慶|喜|興|滿|豊|榮|福|順|和|通|如意|千金|大通|陳陳|自來|隨身|臨身/;
  function polOf(own, other) {
    if (!/雖/.test(own)) { if (NEG.test(own)) return 'neg'; if (POS.test(own)) return 'pos'; }
    if (NEG.test(other)) return 'neg'; if (POS.test(other)) return 'pos';
    return NEG.test(own) ? 'neg' : 'pos';
  }
  function readPhrase(ph) {
    var t = ph.join(''), out = [];
    K.forEach(function (k) {
      if (k.id === 'body' && /妻|家|堂上|膝下|子/.test(t)) return;
      if (!k.re.test(t)) return;
      var own = k.re.test(ph[0]) ? ph[0] : k.re.test(ph[1] || '') ? ph[1] : t, other = own === ph[0] ? (ph[1] || '') : own === ph[1] ? ph[0] : '';
      out.push({ k: k, pol: k.always || polOf(own, other) });
    });
    return out;
  }
  // 성씨·방위(옛 표현)
  function oldWords(phrases) {
    var t = phrases.map(function (p) { return p.join(''); }), note = { dir: '', sur: '' };
    t.forEach(function (s) {
      var m = /([金木水火土])姓/.exec(s); if (m && !note.sur) note.sur = { el: ELS[m[1]], bad: NEG.test(s) };
      var d = s.match(/[東西南北]/g); if (d && /方|行/.test(s) && !note.dir) note.dir = { d: d.map(function (x) { return DIRS[x]; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join('·'), bad: NEG.test(s) };
    });
    return note;
  }
  // 한 괘 전체(12달) — 같은 문장은 변형을 돌려 쓰고, 주제는 앞 달과 겹치지 않게
  function build(g, src, mod) {
    if (!src || !src.months || !mod || !mod.months) return null;
    var use = {}, pick = function (k, pol, field) { var arr = (k[pol] || {})[field] || []; if (!arr.length) return ''; var key = k.id + pol + field, n = use[key] || 0; use[key] = n + 1; return arr[n % arr.length]; };
    var months = {}, prevTheme = '', usedDo = {}, usedAv = {}, usedTheme = {};
    for (var m = 1; m <= 12; m++) {
      var ph = src.months[m] || [], mm = mod.months[m] || {}, tone = mm.tone || 'neutral';
      var hits = []; ph.forEach(function (p) { readPhrase(p).forEach(function (h) { if (!hits.some(function (x) { return x.k.id === h.k.id; })) hits.push(h); }); });
      // 주제 순서: 밝은 달은 좋은 핵심어부터, 조심하는 달은 나쁜 핵심어부터
      var good = tone === 'good', bad = tone === 'caution' || tone === 'burden';
      var order = hits.slice().sort(function (a, b) { var s = function (h) { return (good && h.pol === 'pos') || (bad && h.pol === 'neg') ? 0 : 1; }; return s(a) - s(b); });
      // 주제: 이 괘에서 아직 안 쓴 주제 → 앞 달과만 다른 주제 → 결 기본 주제(역시 안 쓴 것부터)
      var themeHit = null, theme = '';
      [function (t) { return !usedTheme[t]; }, function (t) { return t !== prevTheme; }].forEach(function (ok) {
        for (var i = 0; i < order.length && !theme; i++) { var arr = (order[i].k[order[i].pol] || {}).theme || []; for (var j = 0; j < arr.length; j++) if (ok(arr[j])) { theme = arr[j]; themeHit = order[i]; break; } }
      });
      if (!theme || usedTheme[theme]) { var pool = good ? FB.goodTheme : bad ? FB.badTheme : FB.midTheme, free = pool.filter(function (t) { return !usedTheme[t]; }); if (free.length) { theme = free[0]; } else if (!theme) theme = pool[m % pool.length]; }
      usedTheme[theme] = 1;
      prevTheme = theme;
      var LEAD = ['이달 글귀를 풀면 이래요.', '원문은 이달을 이렇게 그려요.', '옛 글이 말하는 이달은 이래요.', '이달 원문의 뜻은 이래요.'];
      var e = { theme: theme, symbolLead: LEAD[(m - 1) % LEAD.length], symbol: mm.gist ? LEAD[(m - 1) % LEAD.length] + ' ' + mm.gist : '' };
      var lead = themeHit || order[0];
      e.life = lead ? pick(lead.k, lead.pol, 'scene') : (good ? '큰 걸림돌 없이 하던 일이 이어지기 쉬운 달이에요.' : bad ? '작은 일에도 마음이 쓰이기 쉬운 달이에요.' : '눈에 띄는 큰일보다 평소의 일상이 이어지기 쉬운 달이에요.');
      if (ph.some(function (p) { return /先吉後凶/.test(p.join('')); })) e.life += ' 원문은 처음엔 좋고 뒤가 어렵다고 해요. 달 초에 잘 풀린 일은 달 말 전에 매듭지어 두세요.';
      if (ph.some(function (p) { return /先凶後吉|苦盡甘來|初困後泰|初困後吉/.test(p.join('')); })) e.life += ' 원문은 처음엔 막혀도 뒤에 풀린다고 해요. 달 초의 막힘에 너무 낙담하지 마세요.';
      // 분야: 원문이 말한 칸만, 칸마다 첫 핵심어
      var seenKind = {}, peopleLines = [];
      hits.forEach(function (h) {
        if (!h.k.kind || !(h.k[h.pol] || {}).line) return;
        if (h.k.kind === 'people') { if (peopleLines.length < 2) peopleLines.push(pick(h.k, h.pol, 'line')); return; }
        if (seenKind[h.k.kind]) return; seenKind[h.k.kind] = 1; e[h.k.kind] = pick(h.k, h.pol, 'line');
      });
      var ow = oldWords(ph);
      if (ow.sur) peopleLines.push('원문에는 ' + ow.sur.el + ' 성씨에 대한 옛 표현이 있어요. 성씨로 사람을 가리기보다, ' + (ow.sur.bad ? '이달 새로 가까워진 사람과의 약속은 서두르지 않는 정도로 읽으세요.' : '이달 먼저 손 내미는 사람을 반갑게 맞으라는 정도로 읽으세요.'));
      if (peopleLines.length) e.people = peopleLines.slice(0, 2).join(' ');
      if (ow.dir) e.dir = '원문에는 ' + ow.dir.d + '쪽에 대한 옛 표현이 있어요(' + (ow.dir.bad ? '나서지 말라는 뜻' : '이익이 있다는 뜻') + '). 실제 방위보다, ' + (ow.dir.bad ? '평소와 다른 먼 곳으로 움직일 때 한 번 더 살피라는 정도로 읽으세요.' : '평소 가던 곳 밖으로 한 걸음 넓혀 보라는 정도로 읽으세요.');
      // 해 볼 것·조심할 것: 주제 핵심어 → 다른 핵심어 → 결 기본값
      // 해 볼 것·조심할 것: 이 괘에서 아직 쓰지 않은 문장 가운데 주제 핵심어 → 다른 핵심어 → 결 기본값 순(같은 문장이 두 달에 나오면 화면에서 지워지므로)
      var firstFree = function (lists, used) { for (var i = 0; i < lists.length; i++) for (var j = 0; j < lists[i].length; j++) if (!used[lists[i][j]]) { used[lists[i][j]] = 1; return lists[i][j]; } return ''; };
      var rot = function (arr, n) { return arr.slice(n % (arr.length || 1)).concat(arr.slice(0, n % (arr.length || 1))); };
      var doLists = order.map(function (h) { return rot(((h.k[h.pol] || {}).do) || [], m); }), avLists = order.slice().reverse().map(function (h) { return rot(((h.k[h.pol] || {}).avoid) || [], m); });
      e.do = firstFree(doLists.concat([rot(good ? FB.goodDo : bad ? FB.badDo : FB.midDo, m)]), usedDo);
      e.avoid = firstFree(avLists.concat([rot(good ? FB.goodAv : bad ? FB.badAv : FB.midAv, m)]), usedAv);
      e.keywords = hits.map(function (h) { return h.k.id + ':' + h.pol; });
      months[m] = e;
    }
    // 한 해: 승인된 현대어 개요 + 원문 월별 결로 만든 상·하반기
    var tones = []; for (var q = 1; q <= 12; q++) tones.push((mod.months[q] || {}).tone || 'neutral');
    var cnt = function (a) { return { up: a.filter(function (t) { return t === 'good'; }).length, down: a.filter(function (t) { return t === 'caution' || t === 'burden'; }).length }; };
    var half = function (from, label) {
      var a = tones.slice(from, from + 6), c = cnt(a), ms = [];
      a.forEach(function (t, i) { if (t === 'caution' || t === 'burden') ms.push(from + i + 1); });
      var best = []; a.forEach(function (t, i) { if (t === 'good') best.push(from + i + 1); });
      var s = label + '는 ' + (c.up ? '밝은 달 ' + c.up + '개' : '밝은 달 없이') + ', ' + (c.down ? '조심하는 달 ' + c.down + '개예요. ' : '조심하는 달은 없어요. ');
      var th = function (mo) { return '(「' + months[mo].theme + '」)'; };
      if (c.up > c.down + 2) s += '원문의 결이 대체로 밝아요. ' + best[0] + '월' + th(best[0]) + '부터 흐름이 열리고' + (ms.length ? ', ' + ms.join('·') + '월에는 조심하라는 글이 끼어요' + th(ms[0]) + '.' : ' 끝까지 이어져요.');
      else if (c.down > c.up + 2) s += '조심하라는 글이 많은 구간이에요. ' + ms[0] + '월' + th(ms[0]) + '부터 숨을 고르고' + (best.length ? ', ' + best.join('·') + '월에는 숨통이 트여요' + th(best[0]) + '.' : ' 무리하지 않는 쪽이 좋아요.');
      else s += '밝은 달과 조심하는 달이 번갈아 와요' + (best.length ? '. 힘을 쓸 달은 ' + best.join('·') + '월' : '') + (ms.length ? ', 숨을 고를 달은 ' + ms.join('·') + '월이에요.' : (best.length ? '이에요.' : '.'));
      return s;
    };
    var all = cnt(tones);
    var core = (mod.overview && mod.overview[0] ? mod.overview[0] + ' ' : '') + '열두 달 원문 가운데 밝은 달은 ' + all.up + '개, 조심하라는 달은 ' + all.down + '개예요.';
    return { status: 'draft', source: 'motif', year: { core: core, h1: half(0, '상반기(음력 1~6월)'), h2: half(6, '하반기(음력 7~12월)') }, months: months };
  }
  // 손 해설이 없는 괘를 채운다(이미 있으면 그대로 둔다)
  function fill(DEEPSET, TXT, MOD) {
    if (!DEEPSET || !TXT || !MOD) return 0; var n = 0;
    Object.keys(TXT.gua || {}).forEach(function (g) { if (DEEPSET.DEEP[g]) return; var d = build(g, TXT.gua[g], MOD[g]); if (d) { DEEPSET.DEEP[g] = d; n++; } });
    return n;
  }
  var api = { version: 'tojeong-month-motif-20261117-1', K: K, build: build, fill: fill, readPhrase: readPhrase };
  root.TojeongMonthMotif = api;
  if (root.TojeongMonthDeep && root.TojeongText && root.TojeongModern) api.filled = fill(root.TojeongMonthDeep, root.TojeongText, root.TojeongModern);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
