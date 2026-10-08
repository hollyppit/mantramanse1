/* 깊이 풀이 4 — 재물 그릇과 돈 버는 방식. deep.js 의 SECTIONS 에 더하고, "재물 그릇과 돈 버는 방식"(c08) 뒤에 끼운다.
   계산은 새로 하지 않는다. 엔진이 이미 주는 값(십성 10종 %·십성군 %·신강약·지지·충형)만 읽어 규칙으로 그릇 모양을 정한다. 풀이는 "상징적 비유"이고 수익을 맞히는 말이 아니다.
   그릇 판정에 쓰는 명리 근거: 재성의 양(재왕·재약) · 일간의 힘(신강·신약, 재다신약) · 재성의 창고(재고 辰戌丑未)와 그 충 · 비겁·겁재의 탈재(겁재탈재) · 식상생재(재주 → 수입).
   이미지 슬롯: 'wealth:<그릇키>' (functions/_assetart.js 의 WEALTH 와 같아야 한다). */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, D = R.Deep; if (!D) return;
  var S = D.SECTIONS, esc = D.esc, scene = D.scene, sec = D.sec, cap = D.cap, bar = D.bar, fig = D.fig, nz = D.nz, who = D.who, clamp = D.clamp, EL_HJ = D.EL_HJ;
  var BR_EL = { 자: '수', 축: '토', 인: '목', 묘: '목', 진: '토', 사: '화', 오: '화', 미: '토', 신: '금', 유: '금', 술: '토', 해: '수' };
  // 재성 오행의 창고(庫) 지지 · 창고를 흔드는 충 짝
  var VAULT = { 목: ['미'], 화: ['술'], 금: ['축'], 수: ['진'], 토: ['진', '술'] }, CLASH = { 진: '술', 술: '진', 축: '미', 미: '축' };
  var HJ = { 진: '辰', 술: '戌', 축: '丑', 미: '未' };
  var rd = function (v) { return Math.round(v || 0); };

  // 그릇 9종: 이름 · 한 줄 · 쉬운 비유 풀이 · 장점 · 조심할 점 · 쓰는 법
  var VESSELS = {
    pool: { name: '수영장', line: '크게 담을 수 있고, 힘도 받쳐 주는 그릇',
      body: ['수영장은 물을 아주 많이 담을 수 있는 큰 그릇이에요. 사주에 돈의 기운(재성)이 넉넉하고, 그 물을 받치는 나(일간)의 힘도 든든해서 큰 돈의 흐름을 감당할 수 있는 모양입니다.', '다만 수영장은 물이 많은 만큼 관리가 필요해요. 물을 채우는 펌프(재주·일)와 배수·청소(지출 점검)를 챙기지 않으면 금방 탁해지거나 한꺼번에 빠집니다.', '큰 판을 키워 가며 벌 때 힘이 나고, 아주 작은 돈 관리에는 흥미가 떨어지기 쉬운 그릇입니다.'],
      pros: ['큰 규모의 일·거래를 감당할 힘이 있습니다', '돈이 모이기 시작하면 속도가 붙습니다'], cons: ['규모가 커진 만큼 지출·관리의 구멍도 커집니다', '한 번에 큰 승부를 걸고 싶은 마음을 조심하세요'], tip: '들어오는 돈의 일정 비율을 자동으로 떼어 따로 두세요. 큰 수영장일수록 "배수 규칙"이 있어야 오래 갑니다.' },
    heavyTank: { name: '물이 가득 찬 대형 물탱크', line: '물은 많은데, 들어 올릴 힘이 모자란 그릇',
      body: ['물탱크에 물(돈의 기회)은 가득한데 옮기는 사람(나, 일간)의 힘이 약하면 들지도 못하고 오히려 허리를 다칩니다. 명리에서는 이런 모양을 재다신약(財多身弱)이라고 불러요. 돈이 될 기회는 많아 보여도 내 힘이 모자라 놓치거나 지치기 쉬운 구조입니다.', '해결은 "나를 키우는 힘"을 보태는 거예요. 배움·자격·믿을 만한 윗사람(인성)과 같은 편이 되어 줄 동료(비겁)가 들어오면 그 물을 비로소 쓸 수 있습니다. 혼자 다 들려고 하지 말고 팀·동업·전문 인력으로 나눠 드세요.'],
      pros: ['돈이 될 만한 기회와 사람이 자주 보입니다', '계산과 현실 감각이 빠릅니다'], cons: ['욕심내서 다 잡으려다 몸과 마음이 먼저 지칩니다', '체력과 건강이 곧 재물 그릇의 손잡이입니다'], tip: '수입을 늘리기 전에 체력·자격·사람(내 편)부터 늘리세요. 손잡이가 튼튼해야 물이 쏟아지지 않습니다.' },
    dam: { name: '수문이 열린 댐', line: '크게 들어오고, 크게 빠져나가는 그릇',
      body: ['댐은 물이 크게 모이지만 수문이 열리면 한꺼번에 흘러나가요. 사주에 돈의 기운이 크고, 나눠 갖는 힘(비겁·겁재)이나 창고를 흔드는 충이 함께 있어 들어오는 만큼 나가는 돈도 큰 모양입니다.', '수문을 내가 정해 두면(자동이체 저축, 고정 비율 적립) 댐은 큰 저수지가 됩니다. 반대로 열어 두면 번 돈이 기분과 인정에 따라 흘러갑니다.'],
      pros: ['큰돈을 만지는 그릇이라 기회의 크기가 큽니다', '사람과 네트워크를 타고 돈이 돕니다'], cons: ['보증·동업·의리로 나가는 돈이 큽니다', '번 직후 크게 쓰는 습관을 막는 장치가 필요합니다'], tip: '수문 규칙을 먼저 만드세요: 번 돈의 몇 %는 무조건 보관 통장으로, 사람에게 쓰는 돈은 한도를 정하고 보증은 서지 않기.' },
    sieve: { name: '구멍 난 체(바가지)', line: '들어와도 스며 나가는 그릇',
      body: ['나와 같은 기운(비겁: 동료·경쟁자·나 자신)이 많고 돈의 기운(재성)이 상대적으로 적으면, 명리에서는 겁재탈재(劫財奪財)의 모양으로 읽어요. 돈이 들어오자마자 사람·경쟁·체면 때문에 나눠 쓰게 되어 구멍 난 바가지처럼 느껴질 수 있습니다.', '구멍을 막는 법은 단순해요. 수입 통장과 쓰는 통장을 나누고, 사람에게 쓰는 돈의 한도를 먼저 정하세요. 구멍이 막히면 의외로 단단하게 모입니다.'],
      pros: ['사람·동료·팀의 힘이 강합니다', '내 몫을 지키려는 승부욕이 있습니다'], cons: ['빌려준 돈·보증·모임 비용으로 새기 쉽습니다', '동업은 지분과 역할을 서류로 분명히 해야 합니다'], tip: '"빌려주는 돈은 못 받는 돈"으로 치고 한도를 정해 두세요. 새는 곳 하나만 막아도 모이는 속도가 달라집니다.' },
    spring: { name: '마르지 않는 샘', line: '재주와 일이 물길이 되어 계속 흘러드는 그릇',
      body: ['재능·표현·기술(식상)이 활발하고 그것이 돈의 기운(재성)으로 이어지면 식상생재(食傷生財)라고 해요. 내가 가진 재주가 곧 수입의 물길이 되는 모양입니다.', '샘은 한 번 파면 꾸준히 솟지만, 내가 일하는 동안 물이 나온다는 점이 특징이에요. 쉬면 물줄기도 약해지니, 재주를 상품·콘텐츠·시스템으로 만들어 "내가 없어도 나오는 물"을 조금씩 늘리는 게 좋습니다.'],
      pros: ['재능과 기술이 곧 돈이 됩니다', '물길을 넓힐수록 수입이 늘어납니다'], cons: ['쉬면 수입도 멈추기 쉽습니다(몸과 시간이 곧 자본)', '말이 앞서 계약·약속에서 손해를 볼 수 있습니다'], tip: '일한 만큼 버는 구조라 몸이 자본이에요. 계약서·단가·휴식 규칙을 먼저 만들어 샘이 마르지 않게 지키세요.' },
    safe: { name: '뚜껑 달린 스테인리스 통', line: '한번 담으면 잘 새지 않고 오래 지키는 그릇',
      body: ['사주 지지에 돈의 창고(재고, 財庫)가 있어요. 창고가 있으면 쓰기보다 쌓아 두는 성향이 되고, 뚜껑 달린 스테인리스 통처럼 단단하게 보관합니다.', '다만 창고는 열어야 쓸 수 있어요. 창고가 충(沖)으로 흔들리는 사주라면 어느 해에 뚜껑이 열리면서 모아 둔 돈이 크게 움직이기도 합니다.'],
      pros: ['모으는 힘, 지키는 힘이 좋습니다', '급할 때 버틸 비축이 생깁니다'], cons: ['너무 닫아 두면 기회에 투자하지 못합니다', '창고가 열리는 해(충)에는 큰 지출·변동을 미리 대비하세요'], tip: '지키는 돈과 굴리는 돈의 비율을 정해 두세요. 뚜껑을 닫는 힘이 강한 만큼 일부는 일부러 열어 써야 그릇이 커집니다.' },
    granary: { name: '묵직한 쌀독(곳간)', line: '천천히, 꾸준히 채워 두는 그릇',
      body: ['배움·보호·윗사람의 도움(인성)이 받쳐 주고 돈이 안정적인 길(정재)로 이어질 때 그려지는 모양이에요. 한 번에 채우는 큰 그릇은 아니어도 차곡차곡 쌓아 어려운 해에도 버티는 곳간이 됩니다.', '쌀독은 쌓이는 속도보다 "비지 않는 것"이 장점이에요. 단, 지키는 마음이 커서 새 기회 앞에서 망설이다 때를 놓치기도 합니다.'],
      pros: ['꾸준함과 신뢰로 쌓는 돈입니다', '주변의 도움과 지원이 따릅니다'], cons: ['안전만 찾다 기회를 놓칠 수 있습니다', '준비가 길어 시작이 늦어집니다'], tip: '"충분히 준비했다"의 기준 날짜를 정하세요. 곳간은 채우는 만큼 한 번은 열어야 곡식이 씨앗이 됩니다.' },
    basin: { name: '세숫대야', line: '크지 않지만 생활에 딱 맞는, 일상형 그릇',
      body: ['돈의 기운이 보통이어서 평범하게 쓰기 좋은 크기예요. 세숫대야는 담기도 비우기도 쉬워서, 매일 쓰는 만큼 채우고 쓰는 생활형 그릇입니다. 큰 부자도 큰 곤란도 아닌 안정적인 모양이에요.', '대신 물을 너무 급하게 많이 붓거나(과욕) 한꺼번에 쏟으면(충동 지출) 넘칩니다. 그릇의 크기는 고정이 아니라, 10년 단위 대운에서 돈의 기운이 들어오는 시기에 커져요. 그때 키우는 것이 좋습니다.'],
      pros: ['무리하지 않고 생활이 안정적입니다', '지출 감각이 현실적입니다'], cons: ['크기를 넘는 확장·베팅은 곧바로 넘칩니다', '기회가 와도 내 크기에 맞는지 먼저 따져야 합니다'], tip: '내 그릇 크기보다 큰 일은 "내 돈"이 아니라 "남의 돈·팀의 힘"으로 하세요. 그릇이 커지는 대운이 올 때까지는 내실을 다지는 게 이득입니다.' },
    lunchbox: { name: '도시락통', line: '크게 쌓는 그릇보다, 때가 되면 채워지는 구조',
      body: ['사주에서 돈의 기운(재성)의 비중이 작아요. 돈이 없다는 뜻이 아니라 "큰 통에 쌓아 두는 방식"보다 "정해진 때에 정해진 양이 채워지는 방식"(월급·고정 수입·프로젝트 단위)이 맞는 모양이라는 뜻입니다.', '그래서 돈을 불리는 힘은 약해도, 규칙적으로 채워지는 구조 안에서는 안정적이에요. 큰돈이 들어오는 때는 대운·세운에서 돈의 기운이 들어오는 해를 노리면 됩니다.'],
      pros: ['고정 수입 구조에서 안정적입니다', '욕심이 적어 돈 때문에 크게 흔들리지 않습니다'], cons: ['저축·자산 키우기는 의식적으로 해야 합니다', '큰 돈을 모으려면 돈이 들어오는 시기를 맞춰야 합니다'], tip: '자동이체 저축 하나만 만들어도 충분해요. 도시락통은 채워지는 때가 정해져 있으니, 채워질 때 바로 한 칸을 따로 빼 두세요.' }
  };

  // 사주 값 → 그릇에 쓰는 지표
  function profile(sd) {
    var tg = sd.tenGods || {}, el = sd.groupEl && sd.groupEl.재성, br = ['year', 'month', 'day', 'hour'].map(function (k) { var p = sd.pillars[k]; return p && p.ko ? p.ko.charAt(1) : ''; }).filter(Boolean);
    var vs = (VAULT[el] || []).filter(function (b) { return br.indexOf(b) >= 0; }), open = vs.filter(function (b) { return br.indexOf(CLASH[b]) >= 0; });
    var n = function (k) { return tg[k] || 0; };
    var B0 = n('비견') + n('겁재'), leak = Math.max(4, Math.min(100, B0 * 1.4 + n('겁재') * 1.2));
    return { leak: leak, C: n('정재') + n('편재'), B: n('비견') + n('겁재'), O: n('식신') + n('상관'), K: n('편관') + n('정관'), I: n('편인') + n('정인'), pj: n('정재'), pp: n('편재'), gj: n('겁재'), bg: n('비견'), sin: n('식신'), sang: n('상관'), jg: n('정관'), pg: n('편관'),
      band: sd.strength && sd.strength.band, el: el, rooted: br.some(function (b) { return BR_EL[b] === el; }), vault: vs, open: open, clashN: (sd.clashes || []).length, earth: (sd.fiveElements || {}).토 || 0 };
  }
  // 그릇 정하기 — 위에서부터 먼저 맞는 것. (재성 많음 → 신약이면 재다신약 / 나눠 갖는 힘이 크면 댐 / 아니면 수영장)
  function vesselOf(p) {
    if (p.C >= 30) return p.band === '신약' ? 'heavyTank' : (p.leak >= 68 || p.open.length) ? 'dam' : 'pool';
    if (p.leak >= 68) return 'sieve'; // 재성이 아주 크지 않은데 나눠 가져가는 힘이 크면 체
    if (p.O >= 28 && p.C >= 12) return 'spring';
    if (p.vault.length && p.C >= 8) return 'safe';
    if (p.I >= 28 && p.C >= 8) return 'granary';
    return p.C >= 12 ? 'basin' : 'lunchbox';
  }
  // 그릇을 고른 이유(명리 근거)를 쉬운 말로
  function reasons(k, p) {
    var a = ['돈의 기운(재성)이 ' + rd(p.C) + '% (정재 ' + rd(p.pj) + '% · 편재 ' + rd(p.pp) + '%)'];
    if (k === 'pool') a.push('재성이 넉넉하고 일간이 ' + (p.band || '') + '이라 그 돈을 받치는 힘이 있음 (재성을 감당하는 구조)');
    if (k === 'heavyTank') a.push('재성은 많은데 일간이 신약 — 재다신약(財多身弱): 돈 기운에 비해 나의 힘이 부족');
    if (k === 'dam') a.push('재성이 큰 가운데 ' + (p.leak >= 68 ? '비겁·겁재(나눠 갖는 힘) ' + rd(p.B) + '%' : '') + (p.open.length ? ' · 창고(' + p.open.map(function (b) { return HJ[b]; }).join('·') + ')를 흔드는 충' : '') + '이 있어 들고 나는 폭이 큼');
    if (k === 'sieve') a.push('비겁이 ' + rd(p.B) + '%로 높고 재성은 상대적으로 적음 — 겁재탈재(劫財奪財)');
    if (k === 'spring') a.push('식상(재능·표현) ' + rd(p.O) + '%가 재성으로 이어짐 — 식상생재(食傷生財)');
    if (k === 'safe') a.push('재성의 창고(재고) ' + p.vault.map(function (b) { return HJ[b]; }).join('·') + '(' + p.vault.join('·') + ')가 지지에 있음' + (p.open.length ? ' — 다만 충으로 흔들림' : ''));
    if (k === 'granary') a.push('인성(배움·도움) ' + rd(p.I) + '%가 받치고 재성이 안정적으로 이어짐');
    if (k === 'basin') a.push('재성이 보통 크기라 생활형 그릇');
    if (k === 'lunchbox') a.push('재성 비중이 작음' + (p.K >= 25 ? ' · 대신 관성(조직·책임) ' + rd(p.K) + '%가 강해 직장·급여 구조와 어울림' : p.O >= 20 ? ' · 식상(재능) ' + rd(p.O) + '%는 큰데 돈으로 이어지는 연결이 약함' : ''));
    return a.filter(Boolean);
  }
  // 그릇 사양 5가지 (0~100)
  function gauges(p) {
    var size = clamp(p.C * 2.8, 4, 100), solid = clamp(30 + (p.rooted ? 25 : 0) + (p.vault.length ? 25 : 0) + (p.pj >= p.pp ? 10 : 0) - (p.open.length ? 20 : 0) - Math.max(0, p.clashN - 1) * 4, 6, 100),
      leak = p.leak, flow = clamp(p.O * 2.6 + (p.C >= 10 && p.O >= 15 ? 12 : 0), 4, 100), hold = p.band === '신강' ? 80 : p.band === '신약' ? 32 : 58;
    return [
      { name: '크기', sub: '돈의 기운(재성)의 양', v: size, text: size >= 66 ? '큰 편' : size >= 38 ? '보통' : '작은 편', plain: size >= 66 ? '많이 담을 수 있는 크기예요.' : size >= 38 ? '생활하기 알맞은 크기예요.' : '큰 통에 쌓기보다 채워지는 구조가 맞아요.', color: '#5FBF9A' },
      { name: '단단함', sub: '재성의 뿌리 · 재고(창고) · 충', v: solid, text: solid >= 66 ? '단단함' : solid >= 40 ? '보통' : '흔들림', plain: solid >= 66 ? '한번 담으면 잘 지켜지는 그릇이에요.' : solid >= 40 ? '지키는 힘은 평범해서 관리가 도움이 돼요.' : '충·뿌리 부족으로 돈이 흔들리기 쉬워요.', color: '#8AA7D6' },
      { name: '새는 정도', sub: '비겁·겁재가 나눠 가져가는 힘', v: leak, text: leak >= 68 ? '많이 샘' : leak >= 45 ? '조금 샘' : '거의 안 샘', plain: leak >= 68 ? '사람·경쟁·체면으로 나가는 돈이 큽니다. 구멍 막기가 1순위예요.' : leak >= 45 ? '가끔 새는 구멍이 있으니 한도를 정해 두세요.' : '새는 구멍이 적어 모으기 유리해요.', color: '#FF9A3C', bad: true },
      { name: '물길', sub: '식상생재 · 재주가 돈이 되는 통로', v: flow, text: flow >= 55 ? '잘 흐름' : flow >= 28 ? '보통' : '가는 편', plain: flow >= 55 ? '재주와 일이 곧 수입이 되는 통로가 넓어요.' : flow >= 28 ? '재능을 돈으로 바꾸는 노력이 필요해요.' : '재주가 돈으로 이어지는 연결을 만들어야 해요.', color: '#4A9BD1' },
      { name: '감당력', sub: '일간(나)의 힘 · 신강·신약', v: hold, text: p.band || '중화', plain: p.band === '신강' ? '큰 돈도 들고 갈 힘이 있어요.' : p.band === '신약' ? '큰 돈 앞에서는 쉽게 지쳐 도움이 필요해요.' : '무리 없는 크기를 감당하는 균형형이에요.', color: '#D5B97F' }];
  }
  // 돈 버는 방식 6종 — 각각 사주에서 어떤 값이 받쳐 주는지로 0~100 점수(상대적 성향이지 수익 예측이 아님)
  function modes(p, sd) {
    var f = function (v) { return Math.round(clamp(v, 8, 96)); }, st = p.band === '신강' ? 1 : p.band === '신약' ? -1 : 0.4;
    return [
      { key: 'job', name: '직장 월급', sub: '정해진 곳에서 정해진 때 받는 돈', v: f(20 + p.jg * 1.6 + p.pj * 1.2 + p.I * 0.5 + p.K * 0.3 - p.pp * 0.6 - p.sang * 0.6), why: '정관 ' + rd(p.jg) + '% · 정재 ' + rd(p.pj) + '% · 인성 ' + rd(p.I) + '%가 받치면 조직의 급여·직책으로 안정적으로 쌓입니다.', warn: '정해진 틀이 답답하면 월급 구조에서 오래 버티기 어려워요.' },
      { key: 'biz', name: '사업·자영업', sub: '내 이름으로 판을 벌여 버는 돈', v: f(15 + p.pp * 1.5 + p.O * 0.9 + st * 14 + p.B * 0.3 - p.jg * 0.5), why: '편재 ' + rd(p.pp) + '% · 식상 ' + rd(p.O) + '%에 일간 힘(' + (p.band || '중화') + ')이 맞물려야 판을 벌려도 버팁니다.', warn: '수입이 들쭉날쭉해도 버틸 현금 여력이 필요해요.' },
      { key: 'skill', name: '전문 기술·프리랜서', sub: '재주·지식을 직접 팔아 버는 돈', v: f(15 + p.sin * 1.4 + p.sang * 1.2 + p.I * 0.6 + (p.O >= 20 ? 10 : 0)), why: '식신 ' + rd(p.sin) + '% · 상관 ' + rd(p.sang) + '% · 인성 ' + rd(p.I) + '%가 재능과 전문성을 받쳐 줍니다.', warn: '내가 일해야 돈이 되는 구조라 몸·시간이 자본이에요.' },
      { key: 'invest', name: '투자·재테크', sub: '돈이 돈을 벌게 하는 방식', v: f(12 + p.pp * 1.3 + p.O * 0.4 + st * 11 - p.B * 0.8 - (p.open.length ? 10 : 0) - (p.clashN >= 3 ? 8 : 0)), why: '편재(기회 감각) ' + rd(p.pp) + '%에 비해 비겁(새는 힘) ' + rd(p.B) + '%와 충의 영향을 함께 봅니다.', warn: '수익을 맞히는 풀이가 아니라 성향이에요. 새는 구멍이 많으면 큰 판 투자는 줄이세요.' },
      { key: 'asset', name: '부동산·실물 자산', sub: '시간이 불려 주는 돈', v: f(15 + (p.vault.length ? 25 : 0) + p.pj * 1.2 + p.earth * 0.3 + p.I * 0.4 - (p.open.length ? 8 : 0)), why: (p.vault.length ? '재고(창고)가 있고 ' : '') + '정재 ' + rd(p.pj) + '% · 토(土) 기운 ' + rd(p.earth) + '%가 오래 들고 가는 자산과 어울립니다.', warn: '묶이는 돈이 커서 현금이 막히지 않게 여유 자금이 먼저예요.' },
      { key: 'sales', name: '영업·중개·유통', sub: '사람 사이에서 수수료·성과로 버는 돈', v: f(15 + p.pp * 1.2 + p.B * 0.6 + p.O * 0.8), why: '편재 ' + rd(p.pp) + '%(활동 폭) · 비겁 ' + rd(p.B) + '%(사람 네트워크) · 식상 ' + rd(p.O) + '%(말·표현)가 맞물릴 때 강합니다.', warn: '사람에게 쓰는 비용과 감정 소모가 크니 성과 기준을 분명히 하세요.' }];
  }
  var band = function (v) { return v >= 70 ? '잘 맞음' : v >= 50 ? '무난' : '조심'; };

  S.deep_wealth = function (H) {
      var sd = H.sd, p = profile(sd), k = vesselOf(p), V = VESSELS[k], out = [], g = gauges(p), ms = modes(p, sd).sort(function (a, b) { return b.v - a.v; });
      // 1) 그릇 이미지 + 이름
      out.push(scene(sec('dp-hero', cap('MY WEALTH BOWL · 나의 재물 그릇') + fig(H, 'wealth:' + k, 'wealth', V.name, '') + '<h3 class="dp-h">' + esc(nz(H) + ' ' + V.name + ' 같은 그릇이에요') + '</h3><p class="lead">' + esc(V.line) + '</p>' +
        '<p class="dp-note">재성(돈의 기운)의 양, 일간의 힘, 재고(창고), 비겁의 나눠 가짐, 식상생재(재주 → 수입)를 겹쳐 읽은 <b>상징적 비유</b>예요. 좋고 나쁨이 아니라 "내 돈이 어떤 모양으로 모이고 나가는지"를 알면 관리가 쉬워집니다.</p>')));
      // 2) 비유 풀이 + 명리 근거
      out.push(scene(sec('', cap('이 그릇은 이런 모양이에요') + V.body.map(function (t) { return '<p class="lead">' + esc(t) + '</p>'; }).join('') +
        '<div class="dp-card" style="margin-top:12px"><h4>왜 이 그릇일까요 (명리 근거)</h4><ul class="dp-ul">' + reasons(k, p).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>')));
      // 3) 그릇 사양 그래프
      out.push(scene(sec('', cap('그릇 사양 · 한눈에 보기') + '<p class="dp-lead2">막대가 길수록 그 성질이 <b>강하다</b>는 뜻이에요. 주황색 "새는 정도"는 길수록 돈이 나가기 쉬운 쪽입니다.</p><div class="dp-parts">' +
        g.map(function (x) { return '<div class="dp-part"><div class="dp-ph1"><b>' + esc(x.name) + '</b><small>' + esc(x.sub) + '</small></div>' + bar(x.text, x.v, { text: Math.round(x.v) + '', color: x.color }) + '<p>' + esc(x.plain) + '</p></div>'; }).join('') + '</div>')));
      // 4) 장단점
      out.push(scene(sec('', cap('이 그릇의 장점과 조심할 점') + '<div class="dp-pc"><div class="dp-pro"><h4>장점</h4><ul>' + V.pros.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div><div class="dp-con"><h4>조심할 점</h4><ul>' + V.cons.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></div><p class="dp-note">그릇을 잘 쓰는 법: ' + esc(V.tip) + '</p>')));
      // 5) 돈 버는 방식 그래프
      out.push(scene(sec('', cap('나에게 유리한 돈 버는 방식') + '<p class="dp-lead2">같은 돈도 버는 모양이 달라요. 사주의 십성·일간 힘·창고·충을 겹쳐 6가지 방식의 <b>어울림</b>을 점수로 옮겼습니다. 수익을 맞히는 점수가 아니라 "내 구조에 편한 방식"의 상대적 순위예요.</p><div class="dp-bars">' +
        ms.map(function (m, i) { return bar((i === 0 ? '★ ' : '') + m.name, m.v, { text: m.v + '점 · ' + band(m.v), color: m.v >= 70 ? '#5FBF9A' : m.v >= 50 ? '#D5B97F' : '#FF9A3C' }); }).join('') + '</div>')));
      var top = ms.slice(0, 2), low = ms[ms.length - 1];
      out.push(scene(sec('', cap('이렇게 벌면 편해요') + '<div class="dp-pc"><div class="dp-pro" style="grid-column:1/-1"><h4>추천 조합</h4><ul>' + top.map(function (m, i) { return '<li><span>' + (i === 0 ? '주력 · ' : '보조 · ') + esc(m.name) + ' <small>(' + esc(m.sub) + ')</small></span><em>' + esc(m.why) + ' ' + esc(m.warn) + '</em></li>'; }).join('') + '</ul></div></div>' +
        '<div class="dp-pc"><div class="dp-con" style="grid-column:1/-1"><h4>무리하지 말 것</h4><ul><li><span>' + esc(low.name) + ' <small>(' + esc(low.v + '점') + ')</small></span><em>' + esc('내 구조에서는 가장 힘이 덜 실리는 방식이에요. ' + low.warn) + '</em></li></ul></div></div>' +
        '<p class="dp-note">대운(10년)에서 돈의 기운이 들어오는 시기에는 그릇이 한 단계 커질 수 있어요. 이어지는 "운의 흐름" 챕터에서 그 때를 함께 봅니다.</p>')));
      return { title: '재물 그릇 · 돈 버는 방식', sub: V.name + ' · ' + top[0].name, scenes: out, vessel: k };
    };
  R.DeepWealth = { profile: profile, vesselOf: vesselOf, VESSELS: VESSELS, modes: modes, gauges: gauges };
  // 재물 챕터(c08) 바로 뒤에 끼운다 — 챕터 목록에 없으면 augment 가 건너뛴다.
  if (D.PLACEMENT && !D.PLACEMENT.some(function (x) { return x[1] === 'deep_wealth'; })) D.PLACEMENT.push(['c08', 'deep_wealth']);
})(typeof window !== 'undefined' ? window : globalThis);
