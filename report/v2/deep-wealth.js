/* 깊이 풀이 4 — 재물 그릇과 돈 버는 방식. deep.js 의 SECTIONS 에 더하고, "재물 그릇과 돈 버는 방식"(c08) 뒤에 끼운다.
   계산은 새로 하지 않는다. 엔진이 이미 주는 값(일간 · 십성 10종 % · 신강약 · 용신 역할 · 지지 · 충형)만 읽어 규칙으로 정한다. 풀이는 "상징적 비유"이고 수익을 맞히는 말이 아니다.
   재물 판단은 자평명리의 일반적인 순서를 따른다:
     ① 그릇의 힘 = 일간의 힘(신강·신약) × 재성의 강약 → 신강재왕 · 재다신약 · 신강재약 · 신약재약 · 균형  (크고 작음은 "등급"이 아니라 이 구조와 사양 그래프로 본다)
     ② 재물의 성질 = 정재형(고정·저축) / 편재형(유동·큰판) + 통로(식상생재 · 재생관 · 인성이 재를 누름 · 무재)
     ③ 보관과 누수 = 재고(재성의 창고 辰戌丑未)와 그 충(개고) · 겁재탈재
     ④ 재물 인연 = 재성의 오행이 용신·희신인지, 기신·구신인지
   일간(十干)의 물상은 "돈을 다루는 성향" 보조 설명으로만 쓴다.
   이미지 슬롯: 'wealth:<힘>:<fixed|flow>' (functions/_assetart.js 의 WEALTH 와 같아야 한다). */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, D = R.Deep; if (!D) return;
  var S = D.SECTIONS, esc = D.esc, scene = D.scene, sec = D.sec, cap = D.cap, bar = D.bar, chip = D.chip, fig = D.fig, nz = D.nz, clamp = D.clamp, EL_HJ = D.EL_HJ;
  var BR_EL = { 자: '수', 축: '토', 인: '목', 묘: '목', 진: '토', 사: '화', 오: '화', 미: '토', 신: '금', 유: '금', 술: '토', 해: '수' };
  // 재성 오행의 창고(庫) 지지 · 창고를 흔드는 충 짝
  var VAULT = { 목: ['미'], 화: ['술'], 금: ['축'], 수: ['진'], 토: ['진', '술'] }, CLASH = { 진: '술', 술: '진', 축: '미', 미: '축' };
  var HJ = { 진: '辰', 술: '戌', 축: '丑', 미: '未' };
  var rd = function (v) { return Math.round(v || 0); };
  var li = function (t) { return '<li>' + esc(t) + '</li>'; };

  // ① 그릇의 힘 5종: 일간의 힘 × 재성의 강약 (명리의 신강재왕 · 재다신약 · 신강재약 · 신약재약 + 균형)
  var POWER = {
    rich: { name: '신강재왕', short: '큰 재물을 감당하는 힘', head: '일간의 힘이 강하고 재성도 넉넉한 구조(身強財旺)예요. 명리에서 재물을 담는 그릇으로 가장 좋게 보는 모양 중 하나로, 큰 돈의 흐름을 직접 들고 갈 힘이 있습니다.',
      body: ['힘이 세다 보니 혼자 다 하려는 마음이 커지기 쉬워요. 재물이 클수록 지출·관리의 구멍도 같이 커지니, 돈을 담는 힘만큼 "빼는 규칙"이 필요합니다.'],
      pros: ['큰 규모의 일·거래를 감당할 힘이 있습니다', '돈이 모이기 시작하면 속도가 붙습니다'], cons: ['한 번에 큰 승부를 걸고 싶은 마음을 조심하세요', '규모가 커진 만큼 관리·세무의 구멍도 커집니다'], tip: '들어오는 돈의 일정 비율을 자동으로 떼어 따로 두세요. 크게 담는 그릇일수록 "빼는 규칙"이 있어야 오래 갑니다.' },
    heavy: { name: '재다신약', short: '재물은 많은데 들 힘이 모자람', head: '재성은 많은데 일간의 힘이 약한 구조(財多身弱)예요. 돈이 될 기회는 많아 보여도 내 힘이 모자라 놓치거나 지치기 쉽습니다.',
      body: ['해결은 "나를 키우는 힘"을 보태는 거예요. 배움·자격·믿을 만한 윗사람(인성)과 같은 편이 되어 줄 동료(비겁)가 들어오면 그 재물을 비로소 쓸 수 있습니다. 혼자 다 들려고 하지 말고 팀·동업·전문 인력으로 나눠 드세요.'],
      pros: ['돈이 될 만한 기회와 사람이 자주 보입니다', '계산과 현실 감각이 빠릅니다'], cons: ['욕심내서 다 잡으려다 몸과 마음이 먼저 지칩니다', '체력과 건강이 곧 재물 그릇의 손잡이입니다'], tip: '수입을 늘리기 전에 체력·자격·사람(내 편)부터 늘리세요. 손잡이가 튼튼해야 쏟지 않습니다.' },
    poorS: { name: '신강재약', short: '힘은 센데 담을 재물이 적음', head: '일간의 힘은 강한데 재성이 적은 구조(身強財弱)예요. 에너지는 남는데 쓸 곳(재물)이 부족한 모양이라, 힘을 재물로 바꾸는 길이 필요합니다.',
      body: ['재물이 저절로 오기를 기다리기보다 식상(재주·기술)이나 관성(조직·성과급)을 통해 힘이 곧 수입이 되는 구조로 옮기면 잘 풀려요. 쓸 곳을 못 찾은 힘은 비겁끼리의 경쟁으로 새기 쉽습니다.'],
      pros: ['체력과 추진력이 좋아 일을 만들면 수입이 따라옵니다', '돈 때문에 쉽게 흔들리지 않습니다'], cons: ['가만히 있으면 재물이 저절로 오지 않아요', '힘을 쏟을 방향이 없으면 경쟁과 소모로 빠집니다'], tip: '재주를 상품으로 만들거나 성과급·수수료처럼 힘이 곧 수입이 되는 구조로 옮기세요.' },
    poorW: { name: '신약재약', short: '힘도 재물도 약함', head: '일간의 힘도 재성도 약한 구조(身弱財弱)예요. 큰 그릇을 키우려 욕심내기보다 나를 키우는 힘부터 채워야 재물이 붙는 모양입니다.',
      body: ['배움·자격·든든한 윗사람(인성)과 같은 편이 되어 줄 동료(비겁)가 들어오면 빠르게 안정되기도 해요. 혼자 큰돈을 만들기보다 팀이나 월급 구조 안에서 키우는 쪽이 맞습니다.'],
      pros: ['욕심이 적어 무리한 빚·투자를 덜 합니다', '도움을 주는 사람이 들어오면 빠르게 안정됩니다'], cons: ['혼자 큰돈을 만들기는 어렵습니다', '체력·건강 관리가 곧 재물 관리입니다'], tip: '자격·전문성·든든한 편(사람) 세 가지를 먼저 쌓고, 큰돈은 팀·월급 구조 안에서 만드세요.' },
    mid: { name: '균형', short: '크게 치우치지 않은 생활형', head: '일간의 힘과 재성이 크게 치우치지 않은 균형형이에요. 큰 부자도 큰 곤란도 아닌 생활형이고, 그릇의 크기는 고정이 아니라 대운에서 재성이 들어오는 시기에 한 단계 커집니다.',
      body: ['대신 급하게 많이 채우려 하거나(과욕) 한꺼번에 쏟으면(충동 지출) 넘쳐요. 내 크기를 알고 맞춰 가는 쪽이 이득입니다.'],
      pros: ['무리하지 않고 생활이 안정적입니다', '지출 감각이 현실적입니다'], cons: ['크기를 넘는 확장·베팅은 곧바로 넘칩니다', '기회가 와도 내 크기에 맞는지 먼저 따져야 합니다'], tip: '내 그릇보다 큰 일은 "내 돈"이 아니라 "남의 돈·팀의 힘"으로 하세요. 그릇이 커지는 대운이 올 때까지 내실을 다지는 게 이득입니다.' } };

  // 이미지가 되는 그릇 10종 = 힘 5 × 성질 2(정재형 fixed · 편재형 flow)
  var BOWLS = {
    'rich:fixed': ['대형 스테인리스 금고', '크게 벌어 단단하게 쌓아 두는 그릇'], 'rich:flow': ['큰 호수', '큰돈이 크게 돌고 쌓이는 그릇'],
    'heavy:fixed': ['가득 찬 큰 옹기 독', '쌓인 재물은 많은데 내 힘으로 옮기기엔 무거운 그릇'], 'heavy:flow': ['넘칠 듯 가득 찬 대형 물탱크', '기회와 돈은 많은데 들고 가기 버거운 그릇'],
    'poorS:fixed': ['작지만 튼튼한 보온통', '담는 양은 적어도 만든 만큼 단단히 지키는 그릇'], 'poorS:flow': ['바위 틈 옹달샘', '양은 적어도 내 힘으로 파면 꾸준히 솟는 그릇'],
    'poorW:fixed': ['작은 돼지 저금통', '아직은 작지만 모으면 쌓이는 그릇 — 키우는 힘이 먼저'], 'poorW:flow': ['물이 조금 고인 작은 바가지', '흘러드는 돈이 적고 새기 쉬워 도움이 필요한 그릇'],
    'mid:fixed': ['묵직한 쌀독', '크지 않아도 꾸준히 채워 두는 생활형 그릇'], 'mid:flow': ['마을 우물', '쓰는 만큼 채워지며 돌아가는 생활형 그릇'] };

  // ② 재물의 성질(통로): 무재 · 식상생재 · 재생관 · 인성이 재를 누름 · (정재형|편재형)
  var ROUTE = {
    none: { name: '재성이 거의 없는 구조', body: '원국에 재성(돈의 기운)이 거의 없어요. 돈이 없다는 뜻이 아니라, 재물이 재성을 통해 직접 들어오기보다 식상(재주)·관성(조직)·인성(문서·자격)을 거쳐 들어오는 구조라는 뜻이에요. 대운·세운에서 재성이 들어오는 해에 재물 흐름이 크게 열립니다.' },
    sik: { name: '식상생재(食傷生財)', body: '재주와 표현(식상)이 곧 돈의 길(재성)이 되는 구조예요. 내가 가진 기술·말·콘텐츠가 수입이 됩니다. 다만 내가 일하는 동안 길이 열려 있는 구조라, 쉬면 수입도 약해져요. 재주를 상품·시스템으로 만들수록 안정됩니다.' },
    gwan: { name: '재생관(財生官)', body: '재물이 직책·신용(관성)으로 이어지는 구조예요. 조직 안에서 성과가 돈으로 돌아오고, 그 돈과 신용이 다시 지위를 받쳐 줍니다. 직장·전문직·공공 영역에서 안정적으로 크는 모양입니다.' },
    ins: { name: '인성이 재를 누르는 구조', body: '배움·안정·윗사람의 보호(인성)가 강해 돈을 쫓기보다 준비하다 때를 놓치기 쉬운 구조예요(탐재괴인·인성 과다). 준비는 충분하니 작게라도 먼저 실행해 돈이 되는 경험을 쌓는 게 숙제입니다.' },
    fixed: { name: '정재형(正財)', body: '꾸준한 일의 대가로 들어오는 안정적인 돈이 중심이에요. 월급·고정 수입·저축처럼 정해진 길로 쌓는 방식이 편하고, 한 번에 크게 버는 것보다 오래 쌓는 쪽에 강합니다.' },
    flow: { name: '편재형(偏財)', body: '기회와 사람을 타고 들어오는 유동적인 큰돈이 중심이에요. 사업·투자·영업처럼 판을 키우는 방식에 어울리지만, 들어오는 폭만큼 나가는 폭도 커서 관리 규칙이 필요합니다.' } };
  // 일간(十干)의 물상 → 돈을 다루는 성향(보조 설명)
  var STEM_HABIT = {
    갑: ['곧게 뻗은 큰 나무', '목표가 서면 길게 보고 키워 가지만, 굽히는 데 서툴러 손해를 보고도 물러서지 못하는 면이 있어요.'],
    을: ['바람에 휘어도 꺾이지 않는 풀과 덩굴', '작은 수입을 여러 갈래로 이어 가는 데 강하지만, 사람의 부탁을 거절하지 못해 빠져나가는 돈이 생겨요.'],
    병: ['모든 곳을 비추는 태양', '기회가 보이면 크게 움직이고 베푸는 데 인색하지 않지만, 열이 식으면 금방 흥미를 잃고 기분 따라 쓰기도 해요.'],
    정: ['어둠 속 한 곳을 밝히는 촛불', '꼼꼼히 모으지만 마음이 가는 사람·취미에는 아낌없이 쓰고, 속마음은 말하지 않고 혼자 끌어안는 편이에요.'],
    무: ['움직이지 않는 큰 산', '큰 판을 안정적으로 굴리는 감각이 있지만 보수적이라 기회 앞에서 움직임이 느려요.'],
    기: ['무엇이든 키워 내는 논밭의 흙', '실속 있게 모으지만 걱정이 많아 기회에도 선뜻 쓰지 못하고, 사람에게 베풀다 새는 돈이 생겨요.'],
    경: ['단단히 벼려진 강철', '돈 관리는 분명하지만 승부수를 던지다 크게 잃기도 해서 손절 기준이 필요해요.'],
    신: ['다듬어진 보석', '품질과 취향에 쓰는 돈이 크고, 전문성으로 단가를 높이는 방향이 잘 맞아요.'],
    임: ['멈추지 않고 흐르는 큰 강', '기회를 읽는 눈이 있어 큰돈이 오가지만, 들어오는 대로 흘러가기 쉬워 물길을 나눌 둑이 필요해요.'],
    계: ['조용히 스며드는 이슬과 봄비', '직관으로 흐름을 읽지만 불안할 때 충동 소비로 풀기 쉬워서 감정 소비를 기록해 두면 도움이 돼요.'] };
  // ④ 재물 인연: 재성 오행이 이 사주에서 맡는 역할(용신·희신·한신·구신·기신)
  var ROLE_TXT = { 용신: ['재물 인연이 좋은 편', '재성이 내게 가장 필요한 기운(용신)이라, 재물을 가까이할수록 사주가 균형을 찾습니다. 재운이 오는 시기에 발복하기 좋아요.', 92], 희신: ['재물 인연이 좋은 편', '재성이 용신을 돕는 기운(희신)이라 재물이 나를 도와주는 쪽이에요. 재운에서 흐름이 한결 편해집니다.', 78],
    한신: ['재물 인연은 무난', '재성이 크게 돕지도 해치지도 않는 기운(한신)이에요. 재물은 내 노력과 구조에 달려 있습니다.', 56], 구신: ['재물이 부담이 되기 쉬움', '재성이 나를 소모시키는 쪽의 기운(구신)이에요. 재물을 크게 쫓을수록 힘이 빠질 수 있어, 무리한 확장은 조심하세요.', 36],
    기신: ['재물이 부담이 되기 쉬움', '재성이 내게 맞지 않는 기운(기신)이에요. 돈 때문에 오히려 고생하기 쉬우니 큰 빚·투자·확장은 보수적으로 접근하세요. 재운이 올 때가 오히려 조심할 때입니다.', 22] };

  // 사주 값 → 지표
  function profile(sd) {
    var tg = sd.tenGods || {}, el = sd.groupEl && sd.groupEl.재성, br = ['year', 'month', 'day', 'hour'].map(function (k) { var p = sd.pillars[k]; return p && p.ko ? p.ko.charAt(1) : ''; }).filter(Boolean);
    var vs = (VAULT[el] || []).filter(function (b) { return br.indexOf(b) >= 0; }), open = vs.filter(function (b) { return br.indexOf(CLASH[b]) >= 0; });
    var n = function (k) { return tg[k] || 0; };
    var B0 = n('비견') + n('겁재'), leak = Math.max(4, Math.min(100, B0 * 1.4 + n('겁재') * 1.2)), roles = sd.usefulElements && sd.usefulElements.roles;
    return { leak: leak, C: n('정재') + n('편재'), B: B0, O: n('식신') + n('상관'), K: n('편관') + n('정관'), I: n('편인') + n('정인'), pj: n('정재'), pp: n('편재'), gj: n('겁재'), bg: n('비견'), sin: n('식신'), sang: n('상관'), jg: n('정관'), pg: n('편관'),
      band: sd.strength && sd.strength.band, el: el, role: (roles && el && roles[el]) || '', rooted: br.some(function (b) { return BR_EL[b] === el; }), vault: vs, open: open, clashN: (sd.clashes || []).length, earth: (sd.fiveElements || {}).토 || 0 };
  }
  // ① 그릇의 힘 정하기: 재성이 많음(재왕) → 신약이면 재다신약, 아니면 신강재왕 / 재성이 적음(재약) → 신강재약 · 신약재약 / 그 밖은 균형
  function powerOf(p) {
    if (p.C >= 26) return p.band === '신약' ? 'heavy' : 'rich';
    if (p.C < 14) return p.band === '신강' ? 'poorS' : p.band === '신약' ? 'poorW' : 'mid';
    return 'mid';
  }
  var flowOf = function (p) { return p.pp >= p.pj + 5 ? 'flow' : 'fixed'; };            // 편재가 정재보다 뚜렷이 크면 편재형, 아니면 정재형
  function routeOf(p) { if (p.C < 8) return 'none'; if (p.O >= 24 && p.C >= 12) return 'sik'; if (p.K >= 24 && p.C >= 12) return 'gwan'; if (p.I >= 28 && p.C < 22) return 'ins'; return flowOf(p); }
  // ③ 보관과 누수
  function storage(p) {
    var a = [];
    if (p.vault.length) a.push(p.open.length ? '재성의 창고(재고) ' + p.vault.map(function (b) { return HJ[b]; }).join('·') + '가 있지만 충으로 흔들려 뚜껑이 열리는 해가 있어요 — 모아 둔 돈이 크게 움직이는 해(큰 지출·변동)를 미리 대비하세요.' : '재성의 창고(재고) ' + p.vault.map(function (b) { return HJ[b]; }).join('·') + '가 있어요 — 쓰기보다 쌓아 두는 성향이라 뚜껑을 덮어 두듯 단단하게 보관합니다.');
    else a.push('재성의 창고(재고)가 없어요 — 돈이 저절로 쌓이는 구조는 아니라서, 자동이체 같은 장치로 쌓는 구조를 만들어야 합니다.');
    a.push(p.leak >= 68 ? '나와 같은 기운(비겁 ' + rd(p.B) + '%)이 많아 겁재탈재(劫財奪財) — 사람·경쟁·체면 때문에 돈이 새기 쉬워요. 틈 막기가 1순위입니다.' : p.leak >= 45 ? '비겁 ' + rd(p.B) + '%로 가끔 새는 곳이 있어요. 빌려주는 돈·모임 비용에 한도를 정해 두세요.' : '비겁 ' + rd(p.B) + '%로 새는 곳이 적어 모으기에 유리해요.');
    return a;
  }
  // 그릇 사양 (0~100)
  function gauges(p) {
    var size = clamp(p.C * 2.8, 4, 100), solid = clamp(30 + (p.rooted ? 25 : 0) + (p.vault.length ? 25 : 0) + (p.pj >= p.pp ? 10 : 0) - (p.open.length ? 20 : 0) - Math.max(0, p.clashN - 1) * 4, 6, 100),
      leak = p.leak, flow = clamp(p.O * 2.6 + (p.C >= 10 && p.O >= 15 ? 12 : 0), 4, 100), hold = p.band === '신강' ? 80 : p.band === '신약' ? 32 : 58, r = ROLE_TXT[p.role];
    var g = [
      { name: '크기', sub: '돈의 기운(재성)의 양', v: size, text: size >= 66 ? '큰 편' : size >= 38 ? '보통' : '작은 편', plain: size >= 66 ? '많이 담을 수 있는 크기예요.' : size >= 38 ? '생활하기 알맞은 크기예요.' : '큰 통에 쌓기보다 채워지는 구조가 맞아요.', color: '#5FBF9A' },
      { name: '단단함', sub: '재성의 뿌리 · 재고(창고) · 충', v: solid, text: solid >= 66 ? '단단함' : solid >= 40 ? '보통' : '흔들림', plain: solid >= 66 ? '한번 담으면 잘 지켜지는 그릇이에요.' : solid >= 40 ? '지키는 힘은 평범해서 관리가 도움이 돼요.' : '충·뿌리 부족으로 돈이 흔들리기 쉬워요.', color: '#8AA7D6' },
      { name: '새는 정도', sub: '비겁·겁재가 나눠 가져가는 힘', v: leak, text: leak >= 68 ? '많이 샘' : leak >= 45 ? '조금 샘' : '거의 안 샘', plain: leak >= 68 ? '사람·경쟁·체면으로 나가는 돈이 큽니다. 틈 막기가 1순위예요.' : leak >= 45 ? '가끔 새는 곳이 있으니 한도를 정해 두세요.' : '새는 곳이 적어 모으기 유리해요.', color: '#FF9A3C', bad: true },
      { name: '물길', sub: '식상생재 · 재주가 돈이 되는 통로', v: flow, text: flow >= 55 ? '잘 흐름' : flow >= 28 ? '보통' : '가는 편', plain: flow >= 55 ? '재주와 일이 곧 수입이 되는 통로가 넓어요.' : flow >= 28 ? '재능을 돈으로 바꾸는 노력이 필요해요.' : '재주가 돈으로 이어지는 연결을 만들어야 해요.', color: '#4A9BD1' },
      { name: '감당력', sub: '일간(나)의 힘 · 신강·신약', v: hold, text: p.band || '중화', plain: p.band === '신강' ? '큰 돈도 들고 갈 힘이 있어요.' : p.band === '신약' ? '큰 돈 앞에서는 쉽게 지쳐 도움이 필요해요.' : '무리 없는 크기를 감당하는 균형형이에요.', color: '#D5B97F' }];
    if (r) g.push({ name: '재물 인연', sub: '재성이 용신·희신인가, 기신·구신인가', v: r[2], text: p.role, plain: r[0] + '.', color: '#C58BD6' });
    return g;
  }
  // 돈 버는 방식 6종 — 각각 사주에서 어떤 값이 받쳐 주는지로 0~100 점수(상대적 성향이지 수익 예측이 아님). 재성이 용신·희신이면 조금 올리고 기신·구신이면 확장형(사업·투자)을 내린다.
  function modes(p, sd) {
    var f = function (v) { return Math.round(clamp(v, 8, 96)); }, st = p.band === '신강' ? 1 : p.band === '신약' ? -1 : 0.4, ra = /용신|희신/.test(p.role) ? 6 : /기신|구신/.test(p.role) ? -8 : 0;
    return [
      { key: 'job', name: '직장 월급', sub: '정해진 곳에서 정해진 때 받는 돈', v: f(20 + p.jg * 1.6 + p.pj * 1.2 + p.I * 0.5 + p.K * 0.3 - p.pp * 0.6 - p.sang * 0.6), why: '정관 ' + rd(p.jg) + '% · 정재 ' + rd(p.pj) + '% · 인성 ' + rd(p.I) + '%가 받치면 조직의 급여·직책으로 안정적으로 쌓입니다.', warn: '정해진 틀이 답답하면 월급 구조에서 오래 버티기 어려워요.' },
      { key: 'biz', name: '사업·자영업', sub: '내 이름으로 판을 벌여 버는 돈', v: f(15 + p.pp * 1.5 + p.O * 0.9 + st * 14 + p.B * 0.3 - p.jg * 0.5 + ra), why: '편재 ' + rd(p.pp) + '% · 식상 ' + rd(p.O) + '%에 일간 힘(' + (p.band || '중화') + ')이 맞물려야 판을 벌려도 버팁니다.', warn: '수입이 들쭉날쭉해도 버틸 현금 여력이 필요해요.' },
      { key: 'skill', name: '전문 기술·프리랜서', sub: '재주·지식을 직접 팔아 버는 돈', v: f(15 + p.sin * 1.4 + p.sang * 1.2 + p.I * 0.6 + (p.O >= 20 ? 10 : 0)), why: '식신 ' + rd(p.sin) + '% · 상관 ' + rd(p.sang) + '% · 인성 ' + rd(p.I) + '%가 재능과 전문성을 받쳐 줍니다.', warn: '내가 일해야 돈이 되는 구조라 몸·시간이 자본이에요.' },
      { key: 'invest', name: '투자·재테크', sub: '돈이 돈을 벌게 하는 방식', v: f(12 + p.pp * 1.3 + p.O * 0.4 + st * 11 - p.B * 0.8 - (p.open.length ? 10 : 0) - (p.clashN >= 3 ? 8 : 0) + ra), why: '편재(기회 감각) ' + rd(p.pp) + '%에 비해 비겁(새는 힘) ' + rd(p.B) + '%와 충의 영향을 함께 봅니다.', warn: '수익을 맞히는 풀이가 아니라 성향이에요. 새는 곳이 많으면 큰 판 투자는 줄이세요.' },
      { key: 'asset', name: '부동산·실물 자산', sub: '시간이 불려 주는 돈', v: f(15 + (p.vault.length ? 25 : 0) + p.pj * 1.2 + p.earth * 0.3 + p.I * 0.4 - (p.open.length ? 8 : 0)), why: (p.vault.length ? '재고(창고)가 있고 ' : '') + '정재 ' + rd(p.pj) + '% · 토(土) 기운 ' + rd(p.earth) + '%가 오래 들고 가는 자산과 어울립니다.', warn: '묶이는 돈이 커서 현금이 막히지 않게 여유 자금이 먼저예요.' },
      { key: 'sales', name: '영업·중개·유통', sub: '사람 사이에서 수수료·성과로 버는 돈', v: f(15 + p.pp * 1.2 + p.B * 0.6 + p.O * 0.8), why: '편재 ' + rd(p.pp) + '%(활동 폭) · 비겁 ' + rd(p.B) + '%(사람 네트워크) · 식상 ' + rd(p.O) + '%(말·표현)가 맞물릴 때 강합니다.', warn: '사람에게 쓰는 비용과 감정 소모가 크니 성과 기준을 분명히 하세요.' }];
  }
  var band = function (v) { return v >= 70 ? '잘 맞음' : v >= 50 ? '무난' : '조심'; };
  var stemOf = function (sd) { return String(sd.dayMaster.stem || '').charAt(0); };

  S.deep_wealth = function (H) {
    var sd = H.sd, st = stemOf(sd), p = profile(sd), pw = powerOf(p), P = POWER[pw], fl = flowOf(p), bk = pw + ':' + fl, BW = BOWLS[bk], rt = routeOf(p), RT = ROUTE[rt], out = [], g = gauges(p), ms = modes(p, sd).sort(function (a, b) { return b.v - a.v; });
    var el = sd.dayMaster.el, role = ROLE_TXT[p.role], SH = STEM_HABIT[st] || STEM_HABIT.갑;
    // 1) 그릇 이미지 + 이름
    out.push(scene(sec('dp-hero', cap('MY WEALTH BOWL · 나의 재물 그릇') + fig(H, 'wealth:' + bk, 'wealth', BW[0], '') + '<h3 class="dp-h">' + esc(nz(H) + ' ' + BW[0] + ' 같은 그릇이에요') + '</h3><p class="lead">' + esc(BW[1]) + '</p>' +
      '<div class="dp-tags">' + chip('힘 · ' + P.name) + chip('성질 · ' + RT.name) + (p.role ? chip('재물 인연 · ' + p.role) : '') + '</div>' +
      '<p class="dp-note">①그릇의 힘(신강·신약 × 재성) ②재물의 성질(정재·편재·통로) ③보관과 누수(재고·겁재탈재) ④재물 인연(재성이 용신인가 기신인가)을 차례로 읽은 <b>상징적 비유</b>예요. 그릇의 크고 작음은 등급이 아니라 아래 사양 그래프로 봅니다.</p>')));
    // 2) ① 그릇의 힘
    out.push(scene(sec('', cap('① 그릇의 힘 · ' + P.name + '(' + P.short + ')') + '<p class="lead">' + esc(P.head) + '</p>' + P.body.map(function (t) { return '<p class="lead">' + esc(t) + '</p>'; }).join('') +
      '<div class="dp-card" style="margin-top:12px"><h4>명리 근거</h4><ul class="dp-ul">' + li('일간의 힘 · ' + (p.band || '중화') + (sd.strength && sd.strength.zone ? ' (' + sd.strength.zone + ')' : '')) + li('재성(돈의 기운) ' + rd(p.C) + '% — 정재 ' + rd(p.pj) + '% · 편재 ' + rd(p.pp) + '%') + li(p.C >= 26 ? '재성이 많은 편(재왕)' : p.C < 14 ? '재성이 적은 편(재약)' : '재성이 보통') + '</ul></div>')));
    // 3) ② 재물의 성질
    out.push(scene(sec('', cap('② 재물의 성질 · ' + RT.name) + '<p class="lead">' + esc(RT.body) + '</p><div class="dp-tags">' + chip('정재 ' + rd(p.pj) + '%') + chip('편재 ' + rd(p.pp) + '%') + (rt === 'sik' ? chip('식상 ' + rd(p.O) + '%') : '') + (rt === 'gwan' ? chip('관성 ' + rd(p.K) + '%') : '') + (rt === 'ins' ? chip('인성 ' + rd(p.I) + '%') : '') + '</div>' +
      (rt !== 'fixed' && rt !== 'flow' ? '<p class="dp-note">돈이 들어오는 기본 결은 <b>' + (fl === 'flow' ? '편재형(유동·큰판)' : '정재형(고정·저축)') + '</b>이에요.</p>' : ''))));
    // 4) ③ 보관과 누수
    out.push(scene(sec('', cap('③ 보관과 누수 · 담긴 돈은 잘 남나') + '<ul class="dp-ul">' + storage(p).map(li).join('') + '</ul>')));
    // 5) ④ 재물 인연(용신 관점)
    if (role) out.push(scene(sec('', cap('④ 재물 인연 · ' + role[0]) + '<p class="lead">' + esc('재성의 오행은 ' + p.el + '(' + EL_HJ[p.el] + ')이고, 이 사주에서 ' + p.role + ' 자리예요. ' + role[1]) + '</p>')));
    // 6) 그릇 사양 그래프
    out.push(scene(sec('', cap('그릇 사양 · 한눈에 보기') + '<p class="dp-lead2">크고 작음은 그릇 종류가 아니라 아래 막대로 봐요. 막대가 길수록 그 성질이 <b>강하다</b>는 뜻이고, 주황색 "새는 정도"는 길수록 돈이 나가기 쉬운 쪽입니다.</p><div class="dp-parts">' +
      g.map(function (x) { return '<div class="dp-part"><div class="dp-ph1"><b>' + esc(x.name) + '</b><small>' + esc(x.sub) + '</small></div>' + bar(x.text, x.v, { text: Math.round(x.v) + '', color: x.color }) + '<p>' + esc(x.plain) + '</p></div>'; }).join('') + '</div>')));
    // 7) 장단점 + 일간 성향
    out.push(scene(sec('', cap('이 그릇의 장점과 조심할 점') + '<div class="dp-pc"><div class="dp-pro"><h4>장점</h4><ul>' + P.pros.map(li).join('') + '</ul></div><div class="dp-con"><h4>조심할 점</h4><ul>' + P.cons.map(li).join('') + '</ul></div></div><p class="dp-note">그릇을 잘 쓰는 법: ' + esc(P.tip) + '</p>')));
    out.push(scene(sec('', cap('돈을 다루는 나의 성향 · 일간 ' + st + '(' + el + EL_HJ[el] + ')') + '<p class="lead">' + esc('일간 ' + st + '은(는) ' + SH[0] + '이에요. ' + SH[1]) + '</p>')));
    // 8) 돈 버는 방식 그래프
    out.push(scene(sec('', cap('나에게 유리한 돈 버는 방식') + '<p class="dp-lead2">같은 돈도 버는 모양이 달라요. 사주의 십성·일간 힘·창고·충·재물 인연을 겹쳐 6가지 방식의 <b>어울림</b>을 점수로 옮겼습니다. 수익을 맞히는 점수가 아니라 "내 구조에 편한 방식"의 상대적 순위예요.</p><div class="dp-bars">' +
      ms.map(function (m, i) { return bar((i === 0 ? '★ ' : '') + m.name, m.v, { text: m.v + '점 · ' + band(m.v), color: m.v >= 70 ? '#5FBF9A' : m.v >= 50 ? '#D5B97F' : '#FF9A3C' }); }).join('') + '</div>')));
    var top = ms.slice(0, 2), low = ms[ms.length - 1];
    out.push(scene(sec('', cap('이렇게 벌면 편해요') + '<div class="dp-pc"><div class="dp-pro" style="grid-column:1/-1"><h4>추천 조합</h4><ul>' + top.map(function (m, i) { return '<li><span>' + (i === 0 ? '주력 · ' : '보조 · ') + esc(m.name) + ' <small>(' + esc(m.sub) + ')</small></span><em>' + esc(m.why) + ' ' + esc(m.warn) + '</em></li>'; }).join('') + '</ul></div></div>' +
      '<div class="dp-pc"><div class="dp-con" style="grid-column:1/-1"><h4>무리하지 말 것</h4><ul><li><span>' + esc(low.name) + ' <small>(' + esc(low.v + '점') + ')</small></span><em>' + esc('내 구조에서는 가장 힘이 덜 실리는 방식이에요. ' + low.warn) + '</em></li></ul></div></div>' +
      '<p class="dp-note">재물은 원국(그릇)만큼 대운·세운(물이 들어오는 때)에 크게 좌우돼요. 대운에서 재성이 들어오는 시기에는 그릇이 한 단계 커질 수 있고, 이어지는 "운의 흐름" 챕터에서 그 때를 함께 봅니다.</p>')));
    return { title: '재물 그릇 · 돈 버는 방식', sub: BW[0] + ' · ' + top[0].name, scenes: out, vessel: bk, power: pw, flow: fl, route: rt };
  };
  R.DeepWealth = { profile: profile, powerOf: powerOf, flowOf: flowOf, routeOf: routeOf, storage: storage, POWER: POWER, BOWLS: BOWLS, ROUTE: ROUTE, ROLE_TXT: ROLE_TXT, STEM_HABIT: STEM_HABIT, modes: modes, gauges: gauges };
  // 재물 챕터(c08) 바로 뒤에 끼운다 — 챕터 목록에 없으면 augment 가 건너뛴다.
  if (D.PLACEMENT && !D.PLACEMENT.some(function (x) { return x[1] === 'deep_wealth'; })) D.PLACEMENT.push(['c08', 'deep_wealth']);
})(typeof window !== 'undefined' ? window : globalThis);
