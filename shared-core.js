// 만트라 공용 데이터: 타로(78장 + 해석 틀) · 일진 주 흐름별 "그날 할 일".
// 만세력 앱(index.html)과 /report/hub/ 무료 타로가 같은 데이터를 쓴다. 생성형 AI 호출 없음 — 전부 이 파일의 표와 규칙으로 조합한다.
// 아래 TR_* · DAYMODE 블록은 index.html 에 있던 원문 그대로이며, 카드 문구·점수를 고칠 때는 이 파일 한 곳만 고친다.
(function (root) {
  'use strict';
  const TR_MAJ = [
    '바보|새 출발·자유·순수한 모험|무모함·준비 부족·방향 상실|1|-1', '마법사|의지·재능 발휘·실행력|재능 낭비·말뿐인 계획·속임수|2|-1',
    '여사제|직관·내면의 지혜·기다림|숨은 사정·직감 무시|1|-1', '여황제|풍요·돌봄·결실|과잉 보호·정체·낭비|2|-1',
    '황제|질서·권위·안정된 기반|경직·고집·통제 과잉|1|-1', '교황|전통·좋은 조언자·신뢰|틀에서 벗어남·잘못된 조언|1|0',
    '연인|조화로운 관계·끌림·중요한 선택|불화·망설임·가치관 충돌|2|-1', '전차|전진·승리·강한 추진력|폭주·방향 상실·좌절|2|-1',
    '힘|인내·부드러운 통제·용기|자신감 저하·감정 폭발|2|-1', '은둔자|성찰·혼자만의 시간·탐구|고립·외로움|0|-1',
    '운명의 수레바퀴|전환점·행운의 흐름·기회|흐름이 어긋남·지연|2|-1', '정의|공정한 결과·균형·책임|불공정·편향·책임 회피|1|-1',
    '매달린 사람|멈춤·관점 전환·희생|헛된 희생·미루기·정체|0|-1', '죽음|끝과 새 시작·정리·변화|변화 거부·미련|0|-1',
    '절제|균형·조율·회복|불균형·과함·조급함|1|-1', '악마|집착·유혹·얽매임|속박에서 벗어남·자각|-2|1',
    '탑|갑작스러운 붕괴·충격·폭로|피하던 변화·작은 충격으로 끝남|-2|-1', '별|희망·치유·영감|실망·자신감 상실|2|0',
    '달|불안·혼란·보이지 않는 것|오해가 풀림·안개가 걷힘|-1|1', '태양|성공·기쁨·활력|일시적인 먹구름·과신|2|1',
    '심판|부활·재평가·중요한 결단|자기 의심·결정 미룸|1|-1', '세계|완성·성취·한 주기의 마무리|미완성·마지막 한 걸음 부족|2|0',
  ];
  const TR_SUIT = [['W', '완드', '불', '행동·열정·일'], ['C', '컵', '물', '감정·관계'], ['S', '소드', '바람', '생각·갈등·결단'], ['P', '펜타클', '흙', '돈·현실·몸']];
  const TR_RANK = ['에이스', '2', '3', '4', '5', '6', '7', '8', '9', '10', '페이지', '나이트', '퀸', '킹'];
  const TR_MIN = {
    W: ['새 의욕·시작의 불꽃|추진력 부족·출발 지연|2|-1', '계획·더 넓은 곳을 봄|두려움에 머무름|1|-1', '확장·기다린 결과가 옴|지연·기대에 못 미침|1|-1', '축하·안정된 기반·화합|축하가 미뤄짐·일시적 불안|2|0', '경쟁·의견 충돌|갈등 회피·내부 다툼|-1|0', '승리·인정받음|인정 부족·자만|2|-1', '방어·입장 고수|지침·압도당함|0|-1', '빠른 진행·반가운 소식|지연·성급함|1|-1', '버팀·마지막 고비|지쳐 포기 직전|0|-1', '과중한 책임·무거운 짐|짐을 내려놓음·위임|-1|0', '새 아이디어·호기심|산만함·나쁜 소식|1|-1', '열정적 행동·모험|충동·성급함|1|-1', '자신감·매력·활력|질투·기분 기복|2|-1', '비전·리더십·결단|독단·조급함|2|-1'],
    C: ['새 감정·사랑의 시작|감정 막힘·공허함|2|-1', '서로 통함·파트너십|어긋남·관계 불균형|2|-1', '축하·우정·모임|지나친 유흥·삼각관계|2|-1', '권태·무관심·놓친 기회|새로운 관심이 생김|-1|0', '상실·후회|회복·남은 것을 봄|-2|0', '추억·순수함·재회|과거에 매임|1|-1', '많은 선택지·환상|현실 직시·결정|-1|0', '떠남·더 깊은 것을 찾음|떠나지 못함·방황|0|-1', '소원 성취·만족|욕심·겉만 만족|2|0', '가정의 행복·정서적 충만|가족 불화·기대 차이|2|-1', '감성적인 소식·고백|감정 미숙·실망|1|-1', '로맨틱한 제안·다가옴|변덕·말뿐인 약속|1|-1', '공감·배려·직관|감정 과잉·의존|1|-1', '감정 조절·너그러움|감정 억압·조종|1|-1'],
    S: ['명확한 판단·돌파|혼란·잘못된 판단|1|-1', '결정 보류·교착|정보 과부하·결정 강요|-1|0', '상처·이별의 아픔|회복 중·아픔을 흘려보냄|-2|0', '휴식·재충전|불안한 휴식·번아웃|0|-1', '이기적인 승리·갈등의 후유증|화해 시도·후회|-1|0', '어려움에서 벗어남·이동|떠나지 못함·미해결|1|-1', '편법·숨김·전략|들통·양심의 가책|-1|0', '스스로 묶임·제약감|속박에서 풀려남|-1|1', '불안·걱정·불면|걱정이 옅어짐|-2|0', '끝·바닥을 침|바닥을 딛고 회복|-2|1', '호기심·정보 수집|험담·경솔한 말|0|-1', '빠른 돌진·직설|무모함·말실수|0|-1', '냉철함·독립·분명한 경계|차가움·비판적|1|-1', '논리·공정한 판단|냉혹함·권위 남용|1|-1'],
    P: ['새 수입·기회의 씨앗|놓친 기회·부실한 계획|2|-1', '균형 잡기·유연한 운영|과부하·지출 관리 실패|0|-1', '협업·실력 인정|팀워크 부족·대충함|1|-1', '지킴·절약·안정 추구|인색함·지나친 집착|0|-1', '궁핍·소외감|회복의 시작·도움을 받음|-2|0', '나눔·도움을 주고받음|불균형한 거래·빚|1|-1', '인내·중간 점검|조바심·성과 부진|0|-1', '숙련·꾸준한 노력|완벽주의·지루함|1|-1', '자립·여유·풍요|과소비·겉치레|2|-1', '재산·가문·오래가는 안정|재산 분쟁·가족 문제|2|-1', '배움·새로운 기회|게으름·계획만 세움|1|-1', '성실·꾸준함|정체·지나친 신중|1|-1', '실속·풍요로운 돌봄|일과 가정의 불균형|2|-1', '재력·안정된 성공|물질 집착·완고함|2|-1'],
  };
  const TR = {};
  TR_MAJ.forEach((s, i) => { const [n, up, rev, su, sr] = s.split('|'); TR['M' + i] = { id: 'M' + i, name: `${i}. ${n}`, suit: 'M', rank: i, up, rev, su: +su, sr: +sr }; });
  for (const [k, sn] of TR_SUIT) TR_MIN[k].forEach((s, i) => { const [up, rev, su, sr] = s.split('|'); TR[k + (i + 1)] = { id: k + (i + 1), name: `${sn} ${TR_RANK[i]}`, suit: k, rank: i + 1, up, rev, su: +su, sr: +sr }; });
  // 주제별 [이름, 주제와 직접 맞닿은 수트]
  const TR_TOPIC = { all: ['전반', []], love: ['연애', ['C']], money: ['재물', ['P']], work: ['일·학업', ['W', 'P']], health: ['건강', ['W', 'P']], people: ['인간관계', ['C', 'S']] };
  // 배열: [이름, [[자리, 이름, 가중치, 읽는 틀]]]
  const TR_SPREAD = {
    one: ['원 카드', [['msg', '지금의 메시지', 1, '지금 필요한 메시지']]],
    three: ['과거·현재·미래', [['past', '과거', 0.6, '지나온 흐름'], ['now', '현재', 1, '지금의 모습'], ['fut', '미래', 1.3, '다가올 흐름']]],
    four: ['상황·장애·조언·결과', [['sit', '상황', 1, '현재 상황'], ['obs', '장애물', 0.7, '넘어야 할 것'], ['adv', '조언', 0.6, '해 볼 것'], ['res', '결과', 1.3, '이대로 가면']]],
  };
  const TR_BAND = [[1.2, '매우 밝음', 'good'], [0.4, '밝음', 'good'], [-0.4, '변화·조율', ''], [-1.2, '신중', 'bad'], [-Infinity, '어려움', 'bad']];
  const TR_ADV = {
    all: ['흐름이 크게 열려 있습니다. 미뤄 둔 일을 시작하기 좋은 때입니다.', '전반적으로 순조롭습니다. 지금 방향을 믿고 꾸준히 가세요.', '좋고 나쁨이 섞인 변화의 시기입니다. 무엇을 남기고 무엇을 정리할지 가려내세요.', '넓히기보다 지키는 쪽이 유리합니다. 결정은 한 박자 늦춰도 괜찮습니다.', '지금은 버티며 정리하는 시기입니다. 큰 결정은 미루고 몸과 마음을 먼저 돌보세요.'],
    love: ['마음이 잘 통하는 흐름입니다. 솔직하게 다가가면 관계가 한 단계 깊어집니다.', '호감이 자라는 시기입니다. 작은 표현을 자주 하세요.', '서로의 기대가 조금 어긋나 있습니다. 원하는 것을 말로 확인하는 대화가 필요합니다.', '감정이 앞서면 오해가 생기기 쉽습니다. 서두르지 말고 상대의 속도를 존중하세요.', '지금 관계에는 상처나 거리감이 있습니다. 붙잡기보다 나를 먼저 회복하는 것이 답입니다.'],
    money: ['돈이 들어오는 길이 열립니다. 준비된 계획이 있다면 실행하기 좋습니다.', '수입과 지출이 안정적입니다. 꾸준한 저축이 복을 키웁니다.', '들어오는 만큼 나가는 흐름입니다. 지출 구조를 점검하세요.', '투자나 큰 지출은 신중하게. 확인되지 않은 정보에 흔들리지 마세요.', '재정 압박이 느껴지는 시기입니다. 빚·보증·충동구매를 피하고 기반을 지키세요.'],
    work: ['실력을 인정받고 기회가 옵니다. 적극적으로 나서세요.', '노력한 만큼 성과가 보입니다. 지금 페이스를 유지하세요.', '방향을 다시 잡는 시기입니다. 우선순위를 정리하면 길이 보입니다.', '경쟁이나 갈등이 있을 수 있습니다. 말보다 결과로 보여 주세요.', '막힘이 큰 시기입니다. 무리한 도전보다 실력을 쌓으며 때를 기다리세요.'],
    health: ['활력이 넘치는 흐름입니다. 새로운 운동을 시작하기 좋습니다.', '컨디션이 무난합니다. 지금의 생활 리듬을 지키세요.', '몸과 마음의 균형이 흔들릴 수 있습니다. 쉬는 시간을 일정에 넣으세요.', '피로와 스트레스가 쌓여 있습니다. 잠과 식사를 먼저 챙기세요.', '몸이 보내는 신호에 귀 기울일 때입니다. 불편한 곳이 있다면 미루지 말고 진료를 받으세요.'],
    people: ['좋은 사람이 모이는 흐름입니다. 새 모임이나 협업에 적극적으로 참여하세요.', '주변의 도움을 받기 쉽습니다. 고마움을 표현하면 인연이 단단해집니다.', '관계를 다시 정리하는 시기입니다. 나에게 맞는 거리를 찾아보세요.', '말 한마디로 오해가 생기기 쉽습니다. 뒷말과 감정적인 대응을 피하세요.', '갈등이나 서운함이 큰 시기입니다. 억지로 풀기보다 잠시 거리를 두는 것도 방법입니다.'],
  };
  const DAYMODE = {
    '기회기': ['d-atk', '새로운 제안·시도가 활성화됨', '제안·연락·투고·발표·새로운 시도에 활용할 수 있음'],
    '확장기': ['d-ext', '이미 있는 활동을 키움', '증액·재계약·파트너십·홍보 확대'],
    '수확기': ['d-hrv', '결과를 회수', '계약 확정·수금·판매·성과 회수'],
    '축적기': ['d-acc', '내부 역량 강화', '제작·기획·공부·문서·재무·저축'],
  };
  /* ───────────── 확장 레이어: 카드 목록(이미지 경로 포함) · 뽑기 · 읽기 ───────────── */
  // 카드 이미지 파일명 규칙(/report/hub/tarot/):  메이저 00-fool.webp … 21-world.webp  ·  마이너 wands-01.webp … pentacles-14.webp (01=에이스, 11=페이지, 12=나이트, 13=퀸, 14=킹)
  const MAJ_EN = ['The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance', 'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'];
  const SUIT_EN = { W: ['Wands', 'wands'], C: ['Cups', 'cups'], S: ['Swords', 'swords'], P: ['Pentacles', 'pentacles'] };
  const RANK_EN = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
  const slug = s => s.toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const IMAGE_BASE = '/report/hub/tarot/';
  const pad2 = n => (n < 10 ? '0' : '') + n;
  const CARDS = Object.keys(TR).map(id => {
    const c = TR[id], major = c.suit === 'M';
    const nameEn = major ? MAJ_EN[c.rank] : `${RANK_EN[c.rank - 1]} of ${SUIT_EN[c.suit][0]}`;
    const file = major ? `${pad2(c.rank)}-${slug(MAJ_EN[c.rank])}.webp` : `${SUIT_EN[c.suit][1]}-${pad2(c.rank)}.webp`;
    const nameKo = major ? c.name.replace(/^\d+\.\s*/, '') : c.name;
    return { id, number: major ? c.rank : null, suit: c.suit, rank: c.rank, nameKo, nameEn, file, imageUrl: IMAGE_BASE + file, upright: c.up, reversed: c.rev, scoreUp: c.su, scoreRev: c.sr };
  });
  const BYID = Object.fromEntries(CARDS.map(c => [c.id, c]));
  const SUIT_KO = { M: '메이저', W: '완드', C: '컵', S: '소드', P: '펜타클' };
  const SUIT_DOMAIN = { M: '인생의 큰 흐름', W: '행동·열정·일', C: '감정·관계', S: '생각·갈등·결단', P: '돈·현실·몸' };

  // 무료 타로 5종 → 기존 질문 주제(TR_TOPIC)로 매핑
  const MODES = {
    today: { name: '오늘의 카드', topic: 'all', ask: '오늘 나에게 필요한 메시지는?' },
    love: { name: '연애운', topic: 'love', ask: '마음에 두고 있는 관계를 떠올려보세요.' },
    money: { name: '재물운', topic: 'money', ask: '돈과 관련해 궁금한 한 가지를 떠올려보세요.' },
    work: { name: '일·사업운', topic: 'work', ask: '지금 하는 일, 혹은 하고 싶은 일을 떠올려보세요.' },
    yesno: { name: 'YES / NO', topic: 'all', ask: '예 · 아니오로 답할 수 있는 질문 하나를 떠올려보세요.' },
  };
  // 점수 구간별 한 줄 조언(TR_BAND 순서: 매우 밝음 · 밝음 · 변화·조율 · 신중 · 어려움)
  const ONE_LINE = ['지금은 망설이지 말고 움직여도 좋은 흐름입니다.', '아직 포기하기엔 흐름이 좋습니다. 지금 방향을 믿어보세요.', '좋고 나쁨이 섞인 때입니다. 하나만 정리하면 길이 보입니다.', '서두르지 마세요. 한 박자 늦추는 쪽이 이깁니다.', '무리하지 말고 기반을 지키세요. 지금은 버티는 것도 전략입니다.'];

  // n장을 겹치지 않게 뽑는다. 역방향 확률은 기존 만세력 앱(trDraw)과 같은 0.3. rnd 를 주입하면 테스트에서 재현할 수 있다.
  function draw(n, rnd) {
    rnd = rnd || Math.random; const ids = Object.keys(TR), out = [], used = {};
    while (out.length < Math.min(n, ids.length)) { const id = ids[Math.floor(rnd() * ids.length)]; if (used[id]) continue; used[id] = 1; out.push({ id, rev: rnd() < 0.3 }); }
    return out;
  }
  // 카드 한 장 + 방향 + 모드 → 읽기 구조. 기존 키워드·점수·TR_BAND·TR_ADV 를 조합할 뿐 새 판단을 만들지 않는다.
  function read(id, rev, modeKey) {
    const card = BYID[id], mode = MODES[modeKey] || MODES.today; if (!card) return null;
    const topic = mode.topic, [topicName, topicSuits] = TR_TOPIC[topic] || TR_TOPIC.all;
    const sc = rev ? card.scoreRev : card.scoreUp, bi = TR_BAND.findIndex(([t]) => sc >= t), band = TR_BAND[bi][1];
    const kw = rev ? card.reversed : card.upright, opp = rev ? card.upright : card.reversed;
    const direct = topicSuits.indexOf(card.suit) >= 0;
    const flow = `'${kw}'의 기운이 중심에 있습니다. ` + (card.suit === 'M' ? '개인의 노력만으로 바꾸기 어려운 큰 흐름이 걸려 있다는 뜻입니다.' : `${SUIT_KO[card.suit]}(${SUIT_DOMAIN[card.suit]})의 카드로, ` + (direct ? `${topicName} 질문과 직접 맞닿아 있습니다.` : `${topicName}을(를) ${SUIT_DOMAIN[card.suit]}의 눈으로 보라는 신호입니다.`));
    const caution = rev ? `역방향이라 '${kw}'의 신호가 안쪽에 쌓여 있습니다. 밖으로 밀어붙이기보다 안을 먼저 정리하세요.` : `너무 한쪽으로 기울면 '${opp}' 쪽으로 흐를 수 있습니다.`;
    const out = { card, rev: !!rev, mode: modeKey, topic, topicName, score: sc, bandIndex: bi, band, keyword: kw, headline: ONE_LINE[bi], sections: [['현재의 흐름', flow], ['조심해야 할 것', caution], ['오늘의 행동', TR_ADV[topic][bi]]], oneLine: ONE_LINE[bi] };
    if (modeKey === 'yesno') { // 한 장의 점수로만 가른다: 밝음 이상 YES · 신중 이하 NO · 그 사이는 조건부
      out.verdict = bi <= 1 ? 'YES' : bi === 2 ? 'MAYBE' : 'NO';
      out.verdictLabel = { YES: 'YES · 그렇습니다', MAYBE: '조건부 · 조율이 필요합니다', NO: 'NO · 지금은 아닙니다' }[out.verdict];
    }
    return out;
  }

  const api = {
    Tarot: { cards: CARDS, byId: BYID, modes: MODES, draw, read, imageBase: IMAGE_BASE, suitKo: SUIT_KO, legacy: { TR_MAJ, TR_SUIT, TR_RANK, TR_MIN, TR, TR_TOPIC, TR_SPREAD, TR_BAND, TR_ADV } },
    DAYMODE,
  };
  root.MantraCore = Object.assign(root.MantraCore || {}, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MantraCore;
})(typeof window !== 'undefined' ? window : globalThis);
