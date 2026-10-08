// 무료 콘텐츠 코어(타로 합성기 · 오늘의 운세 결과 객체). 생성형 AI 를 쓰지 않는다. 브라우저·Node 겸용, 외부 의존 없음.
//  · 타로: 카드 DB(MantraCore.Tarot, 정/역방향·점수 구간) + 질문 분야 + 문장 조각(fragment) → 8개 구간(핵심 메시지·요약·상세·현재 흐름·좋은 방향·조심할 것·행동·한마디)
//          조각은 기본 문구(이 파일) 위에 관리자가 카드별로 덮어쓴다(/api/free-content). seed 를 저장하면 같은 결과를 다시 열어도 문장이 바뀌지 않는다.
//  · 오늘의 운세: 엔진 값(Manse.ilun / evaluateDomainLuck / careerLuckActivation)을 todayData 로 읽고 → DailyFortuneResult(점수·단계·분야별 상세·행동·근거·다음 콘텐츠)로 만든다.
//          점수는 엔진 값 그대로이며 이 파일은 점수를 새로 만들지 않는다. 문장은 엔진이 낸 단계·등급(높음/무난/낮음)에 맞는 조각을 고를 뿐이다.
(function (root) {
  'use strict';
  var FC = {};

  /* ───────── 결정적 난수 (seed → 같은 선택) ───────── */
  function hash(s) { s = String(s); var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = hash(seed); return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(arr, seed) { return arr && arr.length ? arr[Math.floor(rng(seed)() * arr.length)] : ''; }
  function pickN(arr, n, seed) { var a = (arr || []).slice(), r = rng(seed), out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; }
  FC.hash = hash; FC.pick = pick;
  var fill = function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  var arr = function (x) { return Array.isArray(x) ? x.filter(function (s) { return typeof s === 'string' && s.trim(); }) : []; };

  /* ═══════════════════════ 타로 ═══════════════════════ */
  var CATS = { today: 'TODAY', love: 'LOVE', money: 'MONEY', work: 'WORK', yesno: 'YES_NO' };
  var SLOTS = ['headline', 'summary', 'detail', 'currentFlow', 'opportunity', 'caution', 'action', 'closingMessage'];
  var SLOT_KO = { headline: '핵심 메시지', summary: '요약', detail: '상세 해석', currentFlow: '지금의 흐름', opportunity: '좋은 방향', caution: '조심할 것', action: '오늘 해볼 것', closingMessage: '오늘의 한마디' };
  var DOM = { today: '오늘 하루', love: '관계의 흐름', money: '돈의 흐름', work: '일의 흐름', yesno: '지금의 질문' };
  var toneOf = function (bi) { return bi <= 1 ? 'up' : bi === 2 ? 'mix' : 'care'; };

  // 분야와 상관없이 톤(밝음·조율·신중)마다 공유하는 조각. {kw}=카드 키워드 {dom}=분야 표현 {nm}=카드 이름
  var T_SHARED = {
    summary: {
      up: ["{nm} 카드는 {dom}에 '{kw}'의 기운이 열려 있다고 말합니다.", "지금 {dom}은 '{kw}' 쪽으로 바람이 불고 있습니다.", "{dom}에서 '{kw}'이(가) 힘을 받는 흐름의 카드입니다."],
      mix: ["{nm} 카드는 {dom}에 '{kw}'의 기운이 있지만 한쪽으로 기울지 않았다고 말합니다.", "지금 {dom}은 '{kw}'이(가) 중심이면서 조율이 필요한 상태입니다.", "{dom}에서 '{kw}'을(를) 어떻게 다루느냐에 따라 결이 달라지는 카드입니다."],
      care: ["{nm} 카드는 {dom}에서 '{kw}' 쪽을 먼저 돌아보라고 말합니다.", "지금 {dom}은 속도를 내기보다 '{kw}'을(를) 점검해야 하는 흐름입니다.", "{dom}에서 '{kw}'이(가) 신호로 올라온 카드입니다. 서두르지 않는 편이 낫습니다."]
    },
    detailA: {
      up: ["이 카드는 흐름이 막혀 있기보다 열려 있다는 신호로 읽습니다. 다만 열려 있다는 것과 저절로 된다는 것은 다릅니다. 방향을 정하고 움직일 때 비로소 힘이 실립니다.", "좋은 기운이 들어와 있는 카드입니다. 이럴 때는 완벽한 준비를 기다리기보다 지금 할 수 있는 한 걸음을 떼는 쪽이 흐름을 살립니다.", "분위기가 나에게 우호적인 편입니다. 이 흐름을 알아차리고 한 가지에 힘을 모으면 체감하는 변화가 커질 수 있습니다."],
      mix: ["이 카드는 좋고 나쁨을 가르기보다 조율을 요구합니다. 한쪽으로 쏠리지 않게 속도와 방향을 맞춰 가면 무난하게 풀립니다.", "기회와 부담이 함께 있는 카드입니다. 무엇을 남기고 무엇을 내려놓을지 정하는 순간 흐름이 정리되기 시작합니다.", "지금은 결과를 서두르기보다 균형을 보는 때입니다. 작은 조정 하나가 전체 분위기를 바꿀 수 있습니다."],
      care: ["이 카드는 지금 밀어붙이기보다 점검하고 정리하라는 쪽에 가깝습니다. 어려움을 예고한다기보다 속도를 낮추면 얻는 것이 많다는 뜻으로 읽어 주세요.", "서두를수록 놓치는 것이 생기기 쉬운 카드입니다. 이미 가진 것을 확인하고 불필요한 것을 덜어내면 흐름이 가벼워집니다.", "신호가 안쪽에 쌓여 있는 상태입니다. 바깥으로 무언가를 더 벌이기 전에 안을 먼저 정돈하면 다음 선택이 쉬워집니다."]
    },
    flow: {
      up: ["지금은 '{kw}'의 에너지를 마음껏 써도 괜찮은 때입니다.", "흐름이 앞에서 끌어 주는 때라, 망설임이 가장 큰 걸림돌입니다.", "주변 여건이 나를 돕는 쪽으로 기울어 있습니다."],
      mix: ["지금은 '{kw}'과(와) 그 반대편 사이에서 균형을 잡는 시기입니다.", "큰 결정보다 작은 조정이 어울리는 때입니다.", "흐름이 완전히 열리지도 닫히지도 않은, 지켜보며 맞춰 가는 구간입니다."],
      care: ["지금은 '{kw}'이(가) 과해지거나 막혀 있지 않은지 살펴볼 때입니다.", "속도보다 정확도가 중요한 구간입니다.", "에너지를 아끼며 안을 채우는 쪽이 이 흐름과 잘 맞습니다."]
    },
    closing: {
      up: ["좋은 흐름은 알아본 사람의 것입니다. 오늘 한 걸음 내디뎌 보세요.", "지금의 기세를 믿되, 한 번에 하나씩 해 나가세요.", "문이 열려 있을 때 가볍게 걸어 들어가면 됩니다."],
      mix: ["균형을 잡는 일은 느려 보여도 가장 멀리 갑니다.", "정하지 못한 것은 오늘 하나만 정해 보세요.", "조율은 약함이 아니라 감각입니다."],
      care: ["멈추는 것도 하나의 선택입니다. 오늘은 안을 먼저 채우세요.", "서두르지 않은 만큼 선택은 더 선명해집니다.", "내려놓은 자리에 다음 기회가 들어옵니다."]
    }
  };
  // 분야 × 톤마다 다른 조각. 같은 카드라도 질문 분야에 따라 읽는 장면이 달라진다.
  var T_CAT = {
    today: {
      up: { headline: ["오늘은 기운을 믿고 움직여도 좋은 날.", "하루의 중심이 나에게 있는 날.", "미뤄 둔 한 가지를 오늘 꺼내 보세요."], detailB: ["일정 중 가장 마음이 가는 것부터 시작해 보세요. 오늘은 의욕이 곧 방향이 되기 쉽습니다.", "사람을 만나거나 연락을 하는 일에서도 흐름이 부드럽습니다. 먼저 손을 내밀어 보세요."], opportunity: ["하고 싶었던 일의 첫 단계를 오늘 시작하면 이후가 쉬워집니다.", "작게라도 결과를 눈에 보이게 만들면 자신감이 붙는 날입니다."], caution: ["기세에 취해 일정을 과하게 채우지 마세요.", "들뜬 상태에서 한 약속은 나중에 부담이 될 수 있습니다.", "남과 비교하며 속도를 높이면 흐름이 흐트러집니다."], action: ["가장 하고 싶은 일 하나를 30분만 먼저 해 보기", "미뤄 둔 연락 한 통 보내기", "오늘 할 일을 세 가지로 줄여 적기", "잠깐 걸으며 기분 좋은 생각 하나 떠올리기"] },
      mix: { headline: ["오늘은 속도보다 균형을 맞추는 날.", "정하기 전에 한 번 더 살피면 좋은 날.", "가볍게 조율하면 풀리는 날."], detailB: ["할 일과 쉬는 시간의 비율을 의식해서 나눠 보세요. 한쪽으로 몰리면 저녁에 지치기 쉽습니다.", "오전에는 정리, 오후에는 실행처럼 구분해 보면 하루가 한결 매끄럽습니다."], opportunity: ["우선순위를 하나 정하는 것만으로 하루가 정돈됩니다.", "도움을 요청하면 생각보다 쉽게 풀리는 일이 있습니다."], caution: ["이것저것 손대다 아무것도 끝내지 못하는 상황을 조심하세요.", "결정을 미루기만 하면 같은 고민이 반복됩니다."], action: ["해야 할 일 중 하나만 오늘 끝내기", "일정 사이에 10분 쉬는 틈 넣기", "고민 중인 것을 한 줄로 적어 보기", "저녁에 하루를 두 줄로 돌아보기"] },
      care: { headline: ["오늘은 더 하기보다 덜어내기 좋은 날.", "안을 정돈하면 밖이 편해지는 날.", "속도를 낮추면 보이는 것이 있는 날."], detailB: ["새로운 약속이나 결정을 늘리기보다 이미 있는 일을 정리하는 쪽이 어울립니다.", "몸과 마음의 리듬을 먼저 살피세요. 쉬는 것도 오늘의 중요한 일정입니다."], opportunity: ["밀린 정리를 하나 끝내면 마음이 가벼워집니다.", "혼자 있는 시간을 확보하면 생각이 선명해집니다."], caution: ["급한 마음에 결론을 내리지 마세요.", "피곤할 때 하는 말과 약속은 후회로 남기 쉽습니다.", "해야 한다는 압박으로 일정을 억지로 채우지 마세요."], action: ["오늘 하지 않아도 되는 일 하나 지우기", "휴대폰 없이 10분 쉬기", "책상이나 가방 한 곳 정리하기", "일찍 잠자리에 들 준비하기"] }
    },
    love: {
      up: { headline: ["마음을 표현하면 닿는 날.", "관계에 온기가 도는 흐름.", "먼저 다가가도 괜찮은 때."], detailB: ["상대를 향한 마음이 분명할수록 말과 행동도 자연스러워집니다. 솔직함이 가장 좋은 매력이 되는 시기입니다.", "기존 관계에서는 고마움을, 새로운 만남에서는 관심을 가볍게 표현해 보세요."], opportunity: ["짧은 안부나 작은 선물처럼 부담 없는 표현이 관계를 한 단계 가깝게 합니다.", "상대의 이야기를 끝까지 들어 주면 신뢰가 쌓입니다."], caution: ["기대가 앞서 상대의 속도를 놓치지 마세요.", "분위기에 들떠 마음에 없는 약속을 하지 마세요.", "감정이 커질수록 상대의 입장을 한 번 더 헤아리세요."], action: ["고마웠던 점 한 가지를 말로 전하기", "상대의 근황을 묻는 메시지 보내기", "대화할 때 휴대폰 내려놓기", "내가 원하는 관계의 모습 한 줄 적어 보기"] },
      mix: { headline: ["가까워지는 중에도 거리 조절이 필요한 때.", "마음과 속도를 맞춰 가는 흐름.", "대화의 온도를 맞추면 풀리는 관계."], detailB: ["서로 원하는 속도가 조금 다를 수 있습니다. 확인하는 질문 하나가 오해를 줄여 줍니다.", "감정이 오르내리는 시기라 같은 말도 다르게 들릴 수 있습니다. 표현을 부드럽게 다듬어 보세요."], opportunity: ["서로의 기대를 말로 꺼내 놓으면 관계가 편안해집니다.", "상대의 사정을 묻는 질문이 거리를 좁혀 줍니다."], caution: ["속마음을 돌려 말해 오해를 키우지 마세요.", "상대의 반응을 혼자 해석해 결론 내리지 마세요."], action: ["궁금한 점 한 가지를 솔직하게 물어보기", "서운했던 것을 비난 없이 한 문장으로 말해 보기", "혼자 곱씹는 대신 직접 확인하기", "상대와의 공통 관심사 떠올려 보기"] },
      care: { headline: ["관계는 지금 거리부터 살필 때.", "서두르지 않을수록 마음이 선명해지는 때.", "나의 마음을 먼저 돌보는 흐름."], detailB: ["상대를 향한 기대와 현실의 거리를 차분히 살펴볼 시기입니다. 답을 재촉하기보다 여유를 두는 편이 좋습니다.", "마음이 복잡할 때는 관계보다 나의 감정부터 정리해 보세요. 그러면 하고 싶은 말이 분명해집니다."], opportunity: ["잠시 거리를 두면 서로의 소중함을 다시 보게 되기도 합니다.", "내 감정을 글로 정리하면 대화가 한결 쉬워집니다."], caution: ["감정이 격한 상태에서 중요한 이야기를 꺼내지 마세요.", "상대의 연락 빈도로 마음을 단정하지 마세요.", "외로움 때문에 관계를 서둘러 정하지 마세요."], action: ["연락을 기다리는 시간에 나를 위한 일 하나 하기", "지금 느끼는 감정을 세 단어로 적어 보기", "중요한 대화는 내일로 미뤄 보기", "친구나 가까운 사람과 편하게 이야기하기"] }
    },
    money: {
      up: { headline: ["돈의 길이 열려 있으니 계획을 세울 때.", "들어오는 흐름을 잘 받아 둘 때.", "준비한 것을 실행에 옮겨도 좋은 때."], detailB: ["수입이 늘어날 여지가 있는 흐름입니다. 들어오는 돈의 쓰임을 미리 정해 두면 남는 돈이 달라집니다.", "기회가 보인다면 규모를 작게 시작해 확인하며 키우는 방식이 안전합니다."], opportunity: ["준비해 온 제안이나 거래는 지금 꺼내 보기 좋습니다.", "들어온 수입의 일부를 먼저 저축으로 옮겨 두면 흐름이 단단해집니다."], caution: ["기분이 좋을 때의 지출이 가장 크게 새어 나갑니다.", "한 번에 크게 거는 결정은 피하고 나눠서 진행하세요.", "남의 말만 듣고 움직이지 말고 직접 확인하세요."], action: ["이번 달 들어올 돈과 쓸 돈을 한 장에 적기", "수입의 일부를 먼저 저축 계좌로 옮기기", "제안서나 견적 하나 정리해 보내기", "구독·자동결제 목록 한 번 훑어보기"] },
      mix: { headline: ["벌이기와 지키기의 균형을 볼 때.", "큰 결정보다 숫자 확인이 먼저인 때.", "들어오는 만큼 나가는 흐름을 점검할 때."], detailB: ["수입과 지출이 함께 움직이는 시기입니다. 어디에 얼마가 나가는지 눈으로 확인하면 판단이 쉬워집니다.", "새 지출을 늘리기 전에 이미 쓰고 있는 항목의 효율부터 따져 보세요."], opportunity: ["고정비 하나를 줄이면 체감 여유가 생깁니다.", "대금이나 정산이 밀린 것이 있다면 오늘 확인해 보세요."], caution: ["필요와 욕구를 구분하지 않은 지출을 조심하세요.", "조급하게 수익을 기대하며 움직이지 마세요."], action: ["최근 지출 내역에서 반복되는 항목 찾기", "미수금이나 정산 대기 건 확인하기", "사고 싶은 것은 하루 뒤에 다시 판단하기", "예산을 항목별로 나눠 보기"] },
      care: { headline: ["지금은 더 벌기보다 새는 곳을 먼저 볼 때.", "돈을 움직이기 전에 흐름을 살필 때.", "확장보다 점검이 어울리는 때."], detailB: ["새로운 소비나 투자를 결정하기보다 이미 나가고 있는 돈과 반복 지출을 살펴보는 쪽이 좋습니다.", "수입을 늘리는 일보다 지출 구조를 정돈하는 일이 체감 효과가 큰 시기입니다."], opportunity: ["이미 진행 중인 일에서 결과를 회수하는 데 집중해 보세요.", "작은 고정지출 하나만 정리해도 마음의 부담이 줄어듭니다."], caution: ["충동구매와 조급한 투자 판단을 조심하세요.", "주변 사람의 말만 듣고 움직이지 마세요.", "손실을 만회하려고 한 번에 크게 거는 일은 피하세요."], action: ["자동결제나 고정지출 하나 확인하기", "이번 주 꼭 필요한 지출만 적어 보기", "큰 금액의 결정은 사흘 뒤로 미루기", "남은 현금과 곧 나갈 돈 비교하기"] }
    },
    work: {
      up: { headline: ["추진하면 성과가 보이는 때.", "맡은 일에 힘이 실리는 흐름.", "제안과 시도가 받아들여지기 쉬운 때."], detailB: ["일의 방향이 분명해지고 협업도 매끄럽습니다. 미뤄 둔 핵심 업무를 앞쪽으로 당겨 보세요.", "사업이나 프로젝트에서는 한 가지에 집중해 눈에 보이는 결과를 만드는 쪽이 유리합니다."], opportunity: ["중요한 제안이나 발표는 지금 꺼내 볼 만합니다.", "맡은 일의 결과를 정리해 공유하면 인정받기 쉽습니다."], caution: ["욕심으로 일을 한꺼번에 벌이지 마세요.", "속도를 내다 확인 단계를 건너뛰지 마세요.", "혼자 끌고 가기보다 필요한 사람에게 공유하세요."], action: ["가장 중요한 업무 하나를 오전에 끝내기", "미뤄 둔 제안이나 보고 정리해 보내기", "협업 상대에게 진행 상황 공유하기", "이번 주 목표를 세 줄로 적기"] },
      mix: { headline: ["속도보다 우선순위를 정할 때.", "집중과 협업의 균형이 필요한 때.", "일의 방향을 한 번 더 확인할 때."], detailB: ["할 일은 많은데 기준이 흐릿하면 에너지가 흩어집니다. 오늘 꼭 끝낼 일과 미룰 일을 나눠 보세요.", "회의나 소통에서 서로 다르게 이해한 부분이 없는지 확인하면 재작업을 줄일 수 있습니다."], opportunity: ["일의 순서를 다시 정리하면 막혀 있던 부분이 풀립니다.", "동료나 파트너의 의견을 듣는 것이 방향을 잡는 데 도움이 됩니다."], caution: ["확인 없이 진행해 다시 해야 하는 일을 만들지 마세요.", "결정을 계속 미루면 일정이 밀립니다."], action: ["오늘 할 일에 우선순위 번호 붙이기", "애매한 요청은 짧게 되물어 확인하기", "끝낼 일 하나와 미룰 일 하나 정하기", "진행 상황을 한 줄로 기록해 두기"] },
      care: { headline: ["확장보다 정리와 마무리가 어울리는 때.", "한 번 더 확인하면 빈틈이 줄어드는 때.", "새로 벌이기 전에 하던 일을 다질 때."], detailB: ["새 프로젝트를 늘리기보다 진행 중인 일의 문서와 기록, 점검을 챙기는 쪽이 성과로 이어집니다.", "무리한 일정은 오히려 품질을 떨어뜨리기 쉽습니다. 범위를 줄이고 완성도를 높이는 것이 좋습니다."], opportunity: ["미뤄 둔 문서·정산·점검을 정리하면 다음 단계가 편해집니다.", "일의 범위를 줄여 기한 안에 끝내는 경험이 신뢰를 쌓습니다."], caution: ["중요한 계약이나 결정은 서두르지 말고 한 번 더 검토하세요.", "과로로 실수가 늘어나지 않게 쉬는 시간을 지키세요.", "감정이 섞인 소통은 잠시 미루세요."], action: ["진행 중인 일의 체크리스트 점검하기", "중요 문서 한 번 더 읽어 보기", "새 요청은 내일 답하겠다고 말해 두기", "마감이 가까운 일부터 마무리하기"] }
    },
    yesno: {
      up: { headline: ["답은 YES에 가깝습니다.", "흐름은 그 방향을 지지합니다.", "움직여도 좋다는 신호입니다."], detailB: ["지금의 흐름은 질문에 긍정적으로 열려 있습니다. 다만 YES는 준비 없이 해도 된다는 뜻이 아니라 방향이 맞다는 뜻입니다.", "결정할 수 있는 상태라면 작은 단위로 먼저 시도해 보는 방식이 안전합니다."], opportunity: ["첫 걸음을 작게 시작하면 확신이 따라옵니다.", "미루던 결정을 오늘 정리해 볼 만합니다."], caution: ["긍정적인 신호에 기대 확인할 것을 건너뛰지 마세요.", "한 번에 모든 것을 거는 방식은 피하세요."], action: ["결정 후 첫 행동 하나를 정해 오늘 시작하기", "필요한 조건 두세 가지를 확인하기", "주변에 의견을 구할 사람 한 명 정하기", "시작 날짜를 달력에 적어 두기"] },
      mix: { headline: ["답은 조건부입니다.", "지금은 YES도 NO도 아닌 확인이 먼저.", "한 가지가 정리되면 YES에 가까워집니다."], detailB: ["흐름이 한쪽으로 기울지 않았습니다. 질문에 숨은 조건이 무엇인지 찾으면 답이 선명해집니다.", "무엇이 해결되면 괜찮을지 스스로에게 물어보세요. 그 조건이 곧 답의 열쇠입니다."], opportunity: ["부족한 정보 하나를 채우면 판단이 쉬워집니다.", "시기를 조금 조정하면 결과가 달라질 수 있습니다."], caution: ["조건을 확인하지 않고 결론부터 내리지 마세요.", "마음이 흔들린다고 급히 정하지 마세요."], action: ["이 결정의 조건을 세 가지로 적어 보기", "부족한 정보 하나를 오늘 알아보기", "결정 기한을 정해 두기", "최악과 최선의 경우를 한 줄씩 적어 보기"] },
      care: { headline: ["답은 NO에 가깝습니다. 지금은 아닌 때.", "서두르지 않는 쪽이 낫다는 신호.", "지금 말고 정비한 뒤에."], detailB: ["흐름은 지금 그 선택을 지지하지 않습니다. 영원한 NO가 아니라 준비와 시기를 다시 보라는 신호로 읽어 주세요.", "마음이 급할수록 한 박자 쉬는 것이 결과를 지킵니다. 보완할 부분이 무엇인지 확인해 보세요."], opportunity: ["부족한 부분을 보완한 뒤 다시 물어보면 답이 달라질 수 있습니다.", "지금 쉬어 가는 시간이 다음 선택을 단단하게 합니다."], caution: ["안 된다는 신호를 무시하고 밀어붙이지 마세요.", "결과에 집착해 다른 가능성을 닫지 마세요."], action: ["지금 결정하지 않고 일주일 뒤로 미루기", "보완해야 할 점 한 가지 적기", "대안이 될 방법 하나 생각해 보기", "마음을 가라앉히는 산책하기"] }
    }
  };
  var T_YN = { up: ['YES', 'YES · 그렇습니다'], mix: ['MAYBE', '조건부 · 조율이 필요합니다'], care: ['NO', 'NO · 지금은 아닙니다'] };

  FC.TAROT_SLOTS = SLOTS; FC.TAROT_SLOT_KO = SLOT_KO; FC.TAROT_CATS = CATS;
  FC.tarotDefaults = function (mode, tone) {
    var c = T_CAT[mode][tone], s = T_SHARED;
    return { headline: c.headline, summary: s.summary[tone], detail: s.detailA[tone].concat(c.detailB), currentFlow: s.flow[tone], opportunity: c.opportunity, caution: c.caution, action: c.action, closingMessage: s.closing[tone] };
  };
  // 관리자 override: ov.cards[카드id][up|rev][분야] = { 슬롯: [문장…] }  — 슬롯에 문장이 1개 이상 있으면 그 카드의 그 슬롯은 기본 문구 대신 이 문장들에서 고른다.
  FC.tarotAuthored = function (ov, id, rev, mode) { var o = ov && ov.tarot && ov.tarot.cards && ov.tarot.cards[id]; o = o && o[rev ? 'rev' : 'up']; return (o && o[mode]) || null; };
  // 카드 + 방향 + 분야 + seed → 결과. read() 는 기존 점수 구간·키워드를 그대로 쓴다(MantraCore.Tarot).
  FC.composeTarot = function (Tarot, id, rev, mode, seed, ov) {
    var base = Tarot.read(id, rev, mode); if (!base) return null;
    var card = base.card, tone = toneOf(base.bandIndex), def = FC.tarotDefaults(Tarot.modes[mode] ? mode : 'today', tone), au = FC.tarotAuthored(ov, id, rev, mode) || {}, src = {};
    var kw = String(base.keyword || ''), vars = { kw: kw, k1: kw.split('·')[0], nm: card.nameKo, dom: DOM[mode] || DOM.today };
    var sd = [seed, id, rev ? 'r' : 'u', mode].join('|'), P = function (slot) { var a = arr(au[slot]); src[slot] = a.length ? 'card' : 'default'; return a.length ? a : def[slot]; };
    var one = function (slot) { return fill(pick(P(slot), sd + slot), vars); };
    var dp = P('detail'), det = pickN(dp, 2, sd + 'detail').sort(function (a, b) { return dp.indexOf(a) - dp.indexOf(b); }).map(function (t) { return fill(t, vars); }); // 원래 순서(일반 해석 → 분야별 해석)를 유지
    var out = { card: card, rev: !!rev, mode: mode, category: CATS[mode] || 'TODAY', tone: tone, score: base.score, band: base.band, keyword: kw, seed: seed,
      headline: one('headline'), summary: one('summary'), detail: det, currentFlow: one('currentFlow'), opportunity: one('opportunity'), caution: one('caution'),
      actions: pickN(P('action'), 3, sd + 'action').map(function (t) { return fill(t, vars); }), closing: one('closingMessage'), source: src };
    if (mode === 'yesno') { var yn = arr([au.yesNoResult]); out.verdict = base.verdict; out.verdictLabel = base.verdictLabel; out.yes = T_YN[tone]; void yn; }
    return out;
  };
  // 카드 하나의 분야별 작성 완성도(0~100): 8개 슬롯 중 채운 비율. 방향별·분야별.
  FC.tarotCompleteness = function (ov, id) {
    var res = { up: {}, rev: {}, total: 0 }, sum = 0, n = 0;
    ['up', 'rev'].forEach(function (o) { Object.keys(CATS).forEach(function (m) { var a = FC.tarotAuthored(ov, id, o === 'rev', m) || {}, k = SLOTS.filter(function (s) { return arr(a[s]).length; }).length; res[o][m] = Math.round(k / SLOTS.length * 100); sum += res[o][m]; n++; }); });
    res.total = Math.round(sum / n); return res;
  };

  /* ═══════════════════════ 오늘의 운세 ═══════════════════════ */
  var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var FLOW_LINE = { opportunity: '오늘은 기회를 발견하고 움직일 수 있는 날입니다.', expansion: '이미 하고 있는 일을 키우기 좋은 날입니다.', harvest: '쌓아 온 결과를 거두기 좋은 날입니다.', accumulation: '밖으로 나서기보다 안을 채우기 좋은 날입니다.' };

  // 엔진 값 읽기(기존 hub-saju.js todayData 와 같은 계산을 옮겨 왔다 — 점수·단계 산식은 그대로, ev 는 근거 표시용 추가 값). M: Manse
  FC.todayData = function (M, ch, nowMs, DAYMODE) {
    var now = nowMs || Date.now(), k = new Date(now + 9 * 3600e3), y = k.getUTCFullYear(), mo = k.getUTCMonth() + 1, d = k.getUTCDate();
    var il = M.ilun(ch, y, mo)[d - 1], ev = il.ev, f = ev.flow, key = f.primaryFlow, cond = f.condition.name;
    var dm = M.evaluateDomainLuck(ch, il, 'ilun', { ms: Date.UTC(y, mo - 1, d, 3) }), career = null;
    try { var top = (M.careerProfile(ch).top || []).slice(0, 3).map(function (c) { return c.category; }), a = M.careerLuckActivation(ch, il); if (top.length) career = clamp(top.reduce(function (s, c) { return s + (a[c] || 0); }, 0) / top.length); } catch (e) { }
    var note = [];
    if (cond === '주의' || cond === '부담') note.push('다만 무리한 확장은 피하세요.');
    if (f.overlays.volatility.active) note.push('변동 신호가 있어 일정에 여유를 두세요.');
    if (f.overlays.defense.active) note.push('부담이 커질 수 있어 컨디션을 먼저 챙기세요.');
    var mode = (DAYMODE || {})[ev.phase] || [];
    return {
      y: y, mo: mo, d: d, dow: DOW[k.getUTCDay()], gz: M.gzName(il), score: clamp((ev.fitScore + 100) / 2), flowKey: key, phase: ev.phase, flowLabel: M.flowLabel(ev, { overlay: 'top' }), cond: cond,
      line: FLOW_LINE[key] || '', notes: note, todo: mode[2] || '', meaning: mode[1] || '',
      fields: { money: { s: dm.wealth.score, b: dm.wealth.band }, work: career == null ? null : { s: career, b: career >= 70 ? '높음' : career >= 55 ? '무난' : career >= 40 ? '다소 낮음' : '낮음' }, love: { s: dm.love.score, b: dm.love.band }, health: { s: dm.health.score, b: dm.health.band } },
      // 근거 표시용(엔진이 이미 계산한 값을 옮겨 담기만 함)
      ev: { gz: M.gzNameK ? M.gzNameK(il) : '', stemTG: il.stemTG, branchTG: il.branchTG, flows: f.flows || {}, secondary: f.secondaryFlow, reasons: (f.reasons || []).slice(0, 6), relations: (ev.relations || []).slice(0, 8),
        volatile: !!f.overlays.volatility.active, defense: !!f.overlays.defense.active, domain: { money: { summary: dm.wealth.summary, reasons: (dm.wealth.reasons || []).slice(0, 4) }, love: { summary: dm.love.summary, reasons: (dm.love.reasons || []).slice(0, 4) }, health: { summary: dm.health.summary, reasons: (dm.health.reasons || []).slice(0, 4) } } },
    };
  };

  var PH = ['기회기', '확장기', '수확기', '축적기'];
  var dTone = function (cond) { return cond === '순풍' ? 'go' : cond === '보통' ? 'steady' : 'care'; };
  var lvOf = function (band) { return /높음$/.test(band) && !/부담/.test(band) ? 'high' : band === '무난' ? 'mid' : 'low'; };
  var LV_KO = { high: '높음', mid: '무난', low: '낮음' };

  // 문장 조각 기본값. 관리자가 같은 경로(예: fields.money.low.detail)를 덮어쓸 수 있다.
  var D = {
    head: {
      기회기: { go: ['문이 열리는 날, 먼저 두드려 보세요.', '기회가 눈에 띄는 날입니다.'], steady: ['작은 기회를 알아보면 좋은 날.', '가볍게 시도해 보기 좋은 날.'], care: ['기회는 보이지만 서두르지 않는 날.', '살피며 움직이면 좋은 날.'] },
      확장기: { go: ['이미 하던 일에 힘이 붙는 날.', '넓혀 가기 좋은 순풍의 날.'], steady: ['하던 일을 한 단계 키우기 좋은 날.', '이어 가는 힘이 필요한 날.'], care: ['넓히기 전에 기반을 보는 날.', '키우되 무리하지 않는 날.'] },
      수확기: { go: ['쌓은 것이 결과로 돌아오는 날.', '거두기 좋은 순풍의 날.'], steady: ['성과를 정리하고 챙기는 날.', '마무리가 힘이 되는 날.'], care: ['거두기 전에 한 번 더 확인하는 날.', '마무리를 서두르지 않는 날.'] },
      축적기: { go: ['안을 채울수록 힘이 붙는 날.', '준비가 순풍을 만나는 날.'], steady: ['벌이기보다 완성하는 날.', '밖으로 나서기보다 안을 채우는 날.'], care: ['쉬어 가며 정돈하는 날.', '덜어내면 가벼워지는 날.'] }
    },
    core: {
      기회기: { go: ['새로운 제안이나 연락이 들어오기 쉬운 흐름입니다. 마음이 가는 쪽으로 가볍게 먼저 움직여 보세요.', '평소 지나치던 기회가 눈에 들어오는 날입니다. 작게라도 시도하면 이후가 쉬워집니다.'], steady: ['기회가 조금씩 보이는 날입니다. 무리한 도약보다 작은 시도 하나가 어울립니다.', '새로운 것에 마음이 움직이기 쉬운 날입니다. 하나만 골라 시작해 보세요.'], care: ['기회처럼 보이는 것이 있어도 확인이 먼저인 날입니다. 서두르지 말고 조건을 살펴보세요.', '움직이고 싶은 마음이 커지기 쉬운 날입니다. 일정에 여유를 두고 결정은 한 박자 늦추세요.'] },
      확장기: { go: ['이미 손에 쥔 일을 키우기 좋은 흐름입니다. 협업이나 확대 논의를 꺼내 보세요.', '하던 일이 탄력을 받기 쉬운 날입니다. 지금의 방향을 이어 가면 됩니다.'], steady: ['하던 일을 조금 더 넓혀 볼 수 있는 날입니다. 무리하지 않는 선에서 한 걸음 더 나가 보세요.', '관계와 일의 폭이 자연스럽게 넓어지는 날입니다. 기존 인연을 챙기면 좋습니다.'], care: ['넓히고 싶은 마음이 들어도 기반부터 확인하세요. 감당할 수 있는 만큼만 늘리는 것이 좋습니다.', '확장보다 유지가 중요한 날입니다. 이미 있는 것을 단단하게 하세요.'] },
      수확기: { go: ['그동안 쌓은 것이 결과로 돌아오기 쉬운 날입니다. 정산, 제출, 마무리를 챙겨 보세요.', '성과가 눈에 보이기 쉬운 날입니다. 잘한 것은 분명히 기록해 두세요.'], steady: ['마무리하고 회수하기 좋은 날입니다. 미뤄 둔 정리를 끝내 보세요.', '결과를 챙기는 데 힘을 쓰면 좋은 날입니다. 새로 벌이기보다 완결하세요.'], care: ['거둘 것이 있어도 서류와 약속을 한 번 더 확인하세요. 서두르면 놓치는 것이 생깁니다.', '마무리하는 과정에서 작은 실수가 나오기 쉬운 날입니다. 점검을 넉넉히 하세요.'] },
      축적기: { go: ['안을 채우는 일이 가장 큰 힘이 되는 날입니다. 공부, 기획, 제작처럼 쌓이는 일에 집중해 보세요.', '차분히 준비한 것이 빛을 받기 쉬운 날입니다. 꾸준함이 보상받는 흐름입니다.'], steady: ['오늘은 벌이기보다 완성하는 날입니다. 이미 손에 쥔 일을 정리하고 끝내는 데 힘을 쓰세요.', '미뤄 둔 문서, 계획, 공부처럼 결과물이 쌓이는 일과 잘 맞는 흐름입니다.'], care: ['밖으로 나서기보다 안을 정돈하는 쪽이 좋습니다. 쉬어 가며 필요 없는 것을 덜어내 보세요.', '에너지를 아끼며 기반을 채우는 날입니다. 큰 결정은 다음으로 미뤄도 괜찮습니다.'] }
    },
    summary2: { go: ['컨디션과 흐름이 모두 도와주는 편이니 하고 싶은 일을 미루지 마세요.', '흐름이 받쳐 주는 날이니 과하지 않은 선에서 적극적으로 움직여도 좋습니다.'], steady: ['특별히 앞서가지도 처지지도 않는 무난한 흐름입니다. 하루의 우선순위만 분명히 하면 충분합니다.', '큰 변동 없이 흘러가는 날입니다. 작은 일을 차곡차곡 끝내는 것이 이득입니다.'], care: ['오늘은 흐름이 조심스러운 편입니다. 일정에 여유를 두고, 중요한 결정은 한 번 더 확인하세요.', '무리하면 피로가 쌓이기 쉬운 날입니다. 속도를 낮추고 필요한 일만 챙기세요.'] },
    fields: {
      money: {
        high: { detail: ['재물 흐름이 비교적 좋은 날입니다. 들어올 돈과 받을 돈을 확인하기 좋습니다.', '수입과 관련된 소식이나 기회가 눈에 띌 수 있습니다. 규모는 작게 시작해 확인하며 키우세요.', '돈과 관련한 판단이 평소보다 선명한 날입니다.'], good: ['정산이나 청구 확인', '수입 계획 정리', '저축 계좌로 일부 옮기기', '견적·제안 정리'], caution: ['기분 좋을 때의 충동 지출', '한 번에 크게 거는 결정', '남의 말만 듣고 움직이기'] },
        mid: { detail: ['재물 흐름은 무난합니다. 크게 늘거나 줄기보다 지금 구조를 유지하기 좋은 날입니다.', '돈의 움직임이 평범한 날입니다. 계획한 지출만 하고 불필요한 지출은 한 번 더 생각해 보세요.', '큰 기회보다 꾸준한 관리가 이득이 되는 흐름입니다.'], good: ['가계부나 지출 내역 확인', '고정비 점검', '필요한 지출 우선순위 정하기', '작은 저축 이어 가기'], caution: ['필요 없는 구독·결제 방치', '충동구매', '무계획한 지출'] },
        low: { detail: ['재정 활동은 잠잠하지만 안정적으로 지키기 좋은 시기입니다. 벌이기보다 새는 곳을 살피는 쪽이 이득입니다.', '새로운 지출이나 투자를 늘리기보다 이미 나가고 있는 돈을 점검하기 좋은 날입니다.', '수입을 키우려 애쓰기보다 정산·예산·저축 같은 정리가 잘 맞는 흐름입니다.'], good: ['정산', '예산 정리', '저축', '고정비 확인'], caution: ['충동구매', '무계획한 지출', '조급한 투자 판단'] }
      },
      work: {
        high: { detail: ['일의 흐름이 좋은 날입니다. 중요한 업무를 앞쪽에 두면 성과가 눈에 보이기 쉽습니다.', '제안, 발표, 협의처럼 사람 앞에 서는 일이 비교적 잘 풀리는 날입니다.', '맡은 일에 힘이 실려 집중하기 좋은 날입니다.'], good: ['핵심 업무 먼저 처리', '제안·발표 진행', '협업 상대와 일정 맞추기', '성과 정리해 공유'], caution: ['한꺼번에 일을 벌이기', '확인 없이 진행하기'] },
        mid: { detail: ['일의 흐름은 무난합니다. 새로 벌이기보다 하던 일을 차분히 이어 가면 좋습니다.', '큰 변화 없이 업무가 흘러가는 날입니다. 우선순위를 정하면 하루가 정돈됩니다.', '꾸준히 처리한 일이 쌓이는 날입니다.'], good: ['진행 중인 일 이어 가기', '회의·소통 정리', '기록·문서 정리', '내일 일정 미리 보기'], caution: ['우선순위 없는 멀티태스킹', '결정을 계속 미루기'] },
        low: { detail: ['일에서는 확장보다 정리와 점검이 어울리는 날입니다. 새로 벌이면 부담이 커질 수 있습니다.', '무리한 일정은 품질을 떨어뜨리기 쉽습니다. 범위를 줄이고 완성도를 높여 보세요.', '중요한 결정은 서두르지 말고 한 번 더 검토하는 것이 좋습니다.'], good: ['문서·체크리스트 점검', '마감 가까운 일 마무리', '범위 줄이기', '혼자 집중하는 시간 확보'], caution: ['무리한 일정 확장', '감정이 섞인 소통', '중요한 계약을 서두르기'] }
      },
      love: {
        high: { detail: ['관계에 온기가 도는 날입니다. 마음을 표현하면 상대에게 잘 닿을 수 있습니다.', '새로운 만남이든 기존 관계든 자연스러운 대화가 이어지기 쉽습니다.', '호감을 표현하기 좋은 흐름입니다. 부담 없는 안부로 시작해 보세요.'], good: ['고마운 마음 표현', '가벼운 안부 연락', '상대 이야기 끝까지 듣기'], caution: ['기대가 앞서 속도 놓치기', '분위기에 들떠 약속하기'] },
        mid: { detail: ['연애·관계 흐름은 무난합니다. 큰 변화보다 일상의 대화가 관계를 지켜 줍니다.', '관계에 뚜렷한 쏠림이 없는 날입니다. 작은 관심과 배려가 쌓이면 좋습니다.', '새로운 인연보다는 기존 관계를 살피기 좋은 날입니다.'], good: ['일상 안부 나누기', '함께할 시간 정하기', '서운한 점 부드럽게 말하기'], caution: ['혼자 해석해 결론 내기', '대화를 미루기'] },
        low: { detail: ['관계에서는 감정 표현의 온도를 한 번 낮춰 보는 날입니다. 말하기 전에 한 번 더 생각하면 오해가 줄어듭니다.', '관계 환경이 움직이기 쉬운 날이라 서로의 말이 다르게 들릴 수 있습니다. 확인하며 대화하세요.', '중요한 이야기는 서두르지 않는 편이 좋습니다. 나의 마음을 먼저 정리해 보세요.'], good: ['나의 감정 먼저 정리', '짧고 부드러운 표현', '중요한 대화는 다른 날로 미루기'], caution: ['감정이 격할 때 결론 내기', '연락 빈도로 마음 단정하기'] }
      },
      health: {
        high: { detail: ['활동 리듬이 안정적인 날입니다. 평소 미뤄 둔 운동이나 산책을 해 보기 좋습니다.', '몸과 마음의 균형이 비교적 좋은 날입니다. 컨디션이 좋다고 무리하지는 마세요.', '집중하기 좋은 상태입니다. 중요한 일을 오전에 배치해 보세요.'], good: ['가벼운 운동·산책', '집중이 필요한 일 오전에 하기', '규칙적인 식사'], caution: ['컨디션을 믿고 과하게 일정 잡기', '늦은 밤까지 이어지는 활동'] },
        mid: { detail: ['컨디션은 무난한 날입니다. 평소 생활 리듬을 지키면 충분합니다.', '큰 무리가 없는 날이지만 쌓이는 피로는 의식해서 풀어 주세요.', '일과 휴식의 균형만 맞추면 안정적으로 보낼 수 있습니다.'], good: ['물 자주 마시기', '쉬는 시간 확보', '일정한 시간에 잠자리 들기'], caution: ['카페인·야식 과다', '휴식 없이 몰아서 일하기'] },
        low: { detail: ['오늘은 활동 리듬을 낮추고 쉬는 시간을 일정에 넣어 주세요. 몸이 보내는 신호를 가볍게 넘기지 않는 것이 좋습니다.', '피로가 쌓이기 쉬운 날입니다. 일정을 줄이고 회복 시간을 먼저 챙겨 보세요.', '무리한 일정보다 생활 리듬을 안정시키는 쪽이 어울리는 날입니다.'], good: ['충분히 쉬기', '스트레칭·가벼운 걷기', '일정 줄이기', '일찍 자기'], caution: ['과로', '수면 부족', '식사 거르기'] }
      }
    },
    workMode: { 기회기: ['제안·영업·발표·새로운 시도', '새로운 제안과 연락을 시도해 보기 좋은 업무 흐름입니다.'], 확장기: ['협업·증액·재계약·홍보', '이미 진행하는 일을 키우고 협업을 넓히기 좋은 업무 흐름입니다.'], 수확기: ['계약 마무리·수금·마감·성과 정리', '결과를 회수하고 마무리하기 좋은 업무 흐름입니다.'], 축적기: ['제작·기획·문서·공부·정리', '혼자 집중해 결과물을 쌓기 좋은 업무 흐름입니다.'] },
    act: { 기회기: ['미뤄 둔 제안이나 연락 한 건 보내기', '새로운 정보를 하나 찾아보기', '관심 가는 것을 작게 시도해 보기', '궁금한 사람에게 안부 묻기', '아이디어를 메모해 두기'], 확장기: ['하던 일의 다음 단계 계획하기', '협력할 사람에게 연락하기', '잘 되는 것을 한 가지 더 키워 보기', '홍보나 공유 하나 하기', '기존 인연 챙기기'], 수확기: ['정산·수금 확인하기', '완성된 결과물 제출하기', '성과를 기록으로 남기기', '마무리 못 한 일 하나 끝내기', '고마운 사람에게 인사하기'], 축적기: ['마무리하기', '정리하기', '쌓아두기', '문서나 계획 다듬기', '공부·독서 30분'] },
    avoid: { go: ['과한 일정 채우기', '들뜬 상태에서의 약속'], steady: ['충동적인 결정', '이것저것 손대기'], care: ['충동적인 결정', '무리한 확장', '감정적인 대화', '중요한 계약 서두르기'] },
    close: { 기회기: ['오늘 던진 작은 씨앗이 내일의 기회가 됩니다.', '문은 두드린 사람에게 열립니다.', '가볍게 시작하면 길이 보입니다.'], 확장기: ['이미 가진 것을 키우는 것이 가장 확실한 성장입니다.', '넓히되 중심은 놓지 마세요.', '이어 가는 힘이 흐름을 만듭니다.'], 수확기: ['쌓은 만큼 거두는 날, 마무리가 다음을 엽니다.', '끝맺음이 다음 시작의 자리를 만듭니다.', '챙기는 것도 실력입니다.'], 축적기: ['오늘 쌓은 것이 다음 기회의 재료가 됩니다.', '채우는 날이 곧 준비하는 날입니다.', '보이지 않는 곳의 정돈이 내일의 속도를 만듭니다.'] },
    cta: { work: { q: '나는 언제 일로 크게 움직일까?', btn: '심층 무빙툰 보기', to: '#/go?to=deep', track: 'from_today_deep' }, money: { q: '내 돈의 흐름은 앞으로 어떻게 될까?', btn: '10년 재물 흐름 보기', to: '#/go?to=money', track: 'from_today_money' }, love: { q: '내 인연은 언제 움직일까?', btn: '연애·인연 흐름 보기', to: '#/go?to=love', track: 'from_today_love' }, life: { q: '지금 나는 인생의 어디쯤일까?', btn: '내 인생 흐름 보기', to: '#/go?to=life', track: 'from_today_life' } }
  };
  FC.DAILY_DEFAULTS = D;
  // 관리자 덮어쓰기: 같은 경로의 비어 있지 않은 문자열 배열이 있으면 기본값 대신 쓴다. cta 는 객체(q·btn·to)를 필드 단위로 덮어쓴다.
  function getPath(o, p) { for (var i = 0; i < p.length && o != null; i++) o = o[p[i]]; return o; }
  function frag(ov, path) { var a = arr(getPath(ov && ov.daily, path)); return a.length ? a : getPath(D, path); }
  FC.dailyFrag = frag;
  var BAND_FIELDS = [['money', '재물운'], ['work', '일·사업운'], ['love', '연애운'], ['health', '컨디션']];

  var TG_PLAIN = { 비견: '나를 지키고 버티는 힘', 겁재: '경쟁하고 나누는 힘', 식신: '표현하고 만들어내는 힘', 상관: '말과 아이디어로 드러내는 힘', 편재: '기회와 돈을 움직이는 힘', 정재: '꾸준히 모으고 관리하는 힘', 편관: '압박과 책임을 감당하는 힘', 정관: '규칙과 신뢰를 지키는 힘', 편인: '새로운 것을 받아들이는 힘', 정인: '배우고 보호받는 힘' };
  var REL_TYPE = [['원진', '미묘하게 거슬리는 작용'], ['귀문', '생각이 많아지기 쉬운 작용'], ['충', '정면으로 부딪히는 작용(변동 신호)'], ['형', '긴장과 마찰이 생기는 작용'], ['파', '기존 흐름이 어긋나는 작용'], ['해', '사이가 틀어지기 쉬운 작용'], ['합', '서로 끌어당기는 작용']];
  var REL_POS = { 년지: '태어난 해', 월지: '태어난 달', 일지: '태어난 날(나 자신·배우자 자리)', 시지: '태어난 시(자녀·말년 자리)' };
  // 같은 자리(년·월·일·시)와 맺는 작용을 한 문장으로 묶는다
  function relGroups(list) {
    var by = {}, order = [];
    (list || []).forEach(function (s) { var m = /^(년지|월지|일지|시지)s*(.+)$/.exec(s); if (!m) return; var t = null; for (var i = 0; i < REL_TYPE.length; i++) if (m[2].indexOf(REL_TYPE[i][0]) >= 0) { t = REL_TYPE[i][1]; break; } if (!t) return; if (!by[m[1]]) { by[m[1]] = []; order.push(m[1]); } if (by[m[1]].indexOf(t) < 0) by[m[1]].push(t); });
    return order.map(function (p) { return '오늘의 기운이 ' + REL_POS[p] + '와(과) 만나 ' + by[p].join(' · ') + '을(를) 만듭니다.'; });
  }
  var PHASE_KO = { opportunity: '기회', expansion: '확장', harvest: '수확', accumulation: '축적' };

  // td(todayData) → DailyFortuneResult. seed 는 날짜+프로필이므로 같은 사람·같은 날이면 문장이 같다.
  FC.buildDaily = function (td, o) {
    o = o || {}; var ov = o.overrides || null, seed = (o.seed || '') + '|' + td.y + '-' + td.mo + '-' + td.d, tone = dTone(td.cond), ph = PH.indexOf(td.phase) >= 0 ? td.phase : '축적기';
    var S = function (path, n) { return n ? pickN(frag(ov, path), n, seed + path.join('.')) : pick(frag(ov, path), seed + path.join('.')); };
    var res = { date: td.y + '-' + ('0' + td.mo).slice(-2) + '-' + ('0' + td.d).slice(-2), dow: td.dow, gz: td.gz, overallScore: td.score, phase: td.phase, cond: td.cond, flow: td.flowLabel, flowKey: td.flowKey, tone: tone,
      headline: S(['head', ph, tone]), summary: S(['core', ph, tone]), summary2: S(['summary2', tone]), notes: td.notes, name: o.name || '', fields: {} };
    var order = [];
    BAND_FIELDS.forEach(function (f) {
      var k = f[0], v = td.fields[k]; if (!v) return; var lv = lvOf(v.b), engineSummary = td.ev && td.ev.domain && td.ev.domain[k] ? td.ev.domain[k].summary : '';
      var det = S(['fields', k, lv, 'detail'], 2); if (k === 'work') det = [frag(ov, ['workMode', ph])[1] || D.workMode[ph][1]].concat(det.slice(0, 1));
      res.fields[k] = { label: f[1], score: clamp(v.s), band: v.b, level: lv, levelKo: LV_KO[lv], summary: engineSummary || det[0], detail: det, goodActions: S(['fields', k, lv, 'good'], 3), cautions: S(['fields', k, lv, 'caution'], 2), examples: k === 'work' ? String(frag(ov, ['workMode', ph])[0] || D.workMode[ph][0]).split('·') : null };
      order.push(k);
    });
    res.todayActions = S(['act', ph], 3); res.avoidActions = S(['avoid', tone], 2); res.closingMessage = S(['close', ph]);
    res.evidence = FC.dailyEvidence(td);
    res.next = FC.dailyCTA(td, res, ov); res.order = order;
    return res;
  };

  FC.dailyEvidence = function (td) {
    var e = td.ev || {}, f = e.flows || {}, parts = [], plain = [], pro = [];
    var flowTxt = Object.keys(PHASE_KO).filter(function (k) { return f[k] != null; }).sort(function (a, b) { return f[b] - f[a]; }).map(function (k) { return PHASE_KO[k] + ' ' + Math.round(f[k]); }).join(' · ');
    var main = { title: '오늘의 주요 작용', body: td.gz + '日의 기운이 ' + (TG_PLAIN[e.stemTG] ? '내 사주의 "' + TG_PLAIN[e.stemTG] + '"' : '내 사주') + (TG_PLAIN[e.branchTG] ? '과(와) "' + TG_PLAIN[e.branchTG] + '"' : '') + '을(를) 건드리는 날입니다.' };
    var flow = { title: '현재 흐름', body: '오늘은 ' + String(td.phase).replace(/기$/, '운') + ' 쪽의 신호가 가장 강하고 (' + flowTxt + '), 나에게 필요한 기운과의 조화는 "' + td.cond + '" 상태입니다.' + (e.volatile ? ' 변동 신호가 켜져 있습니다.' : '') + (e.defense ? ' 부담을 살피라는 신호가 있습니다.' : '') };
    var rels = relGroups(e.relations), relat = { title: '원국과의 관계', body: rels.length ? rels.slice(0, 3).join(' ') : '오늘의 일진과 내 원국 사이에 두드러진 충돌·합 신호는 확인되지 않았습니다.' };
    plain.push(main, flow, relat);
    pro.push('일진 ' + td.gz + ' · 천간 십성 ' + (e.stemTG || '-') + ' · 지지 십성 ' + (e.branchTG || '-')); (e.reasons || []).forEach(function (r) { pro.push(r); }); (e.relations || []).forEach(function (r) { pro.push(r); });
    return { plain: plain, pro: pro, intro: '오늘의 일진과 나의 사주 원국, 현재 흐름을 함께 분석한 결과입니다.' };
  };

  // 오늘 가장 두드러진 분야 → 다음 콘텐츠. 무료 콘텐츠(#/go)로만 이어진다(결제창 직행 없음). 두드러진 분야가 없으면 인생 흐름.
  FC.dailyCTA = function (td, res, ov) {
    var cands = ['work', 'money', 'love'].filter(function (k) { return res.fields[k]; }).map(function (k) { return [k, res.fields[k].score - 50]; });
    cands.sort(function (a, b) { return Math.abs(b[1]) - Math.abs(a[1]); });
    var key = cands.length && Math.abs(cands[0][1]) >= 12 ? cands[0][0] : 'life', base = D.cta[key], over = ov && ov.daily && ov.daily.cta && ov.daily.cta[key] || {};
    return { key: key, q: over.q || base.q, btn: over.btn || base.btn, to: over.to || base.to, track: base.track };
  };

  root.FreeCore = FC;
  if (typeof module !== 'undefined' && module.exports) module.exports = FC;
})(typeof window !== 'undefined' ? window : globalThis);
