/* 12운성 생명주기 — 원국 탭 '내 사주의 12운성'과 운세 흐름 탭 '대운의 12운성 변화'가 함께 쓰는 공통 모듈. 2026-11-15
   · 표시 전용: 12운성 값은 engine.js(M.unseong, ch.cells[k].unseong·unseongJwa, 대운 x.unseong)가 계산한 것을 그대로 읽는다.
     운세 점수·가중치를 만들거나 바꾸지 않으며, 12운성을 점수·길흉 판정에 쓰지 않는다(tests/unseong-cycle-sim.cjs 가 검사).
   · 12단계를 한 식물의 생명주기(새싹 → 큰 나무 → 낙엽 → 땅속 씨앗 → 다시 새싹)로 그린다. 식물 그림은 이해를 돕는 비유이며 전통 명리학의 공식 상징이 아니다.
   · 색은 좋고 나쁨이 아니라 기운의 상태(생장·왕성·쇠퇴·저장·재생)를 구분한다.
   · 모든 설명은 ① 단계의 의미 ② 전통적 해석 ③ 원국·대운에서의 의미 ④ 주의사항 네 칸으로 만든다.
   · 계산 기준(engine.js 와 같음): 화토동법(戊는 丙, 己는 丁과 같은 자리에서 장생), 양간은 지지 순서대로(순행), 음간은 거꾸로(역행) 센다.
     원국은 봉법(일간 기준)과 좌법(각 기둥 천간 기준) 두 가지, 대운은 일간 기준 하나만 쓴다.
   · 브라우저·Node 공용. 사용: MantraUnseong.natalHTML(Manse, ch, opt) / MantraUnseong.daeunHTML(Manse, ch, du, opt) / MantraUnseong.stageSheetHTML(...) */
(function (G) {
  'use strict';
  var VERSION = 'unseong-cycle-20261115';
  var ORDER = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];

  // ───────────── 계산 기준(검증용 사본) ─────────────
  // 천간별 장생 지지(子=0 … 亥=11). 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯 — 화토동법·음간 역행.
  var BASIS = {
    longLife: [11, 6, 2, 9, 2, 9, 5, 0, 8, 3],
    rule: '화토동법(戊·己는 丙·丁과 같은 자리) · 양간 순행 · 음간 역행(음생양사)',
    note: '음간도 양간과 같은 방향으로 세는 견해, 戊·己를 壬·癸에 붙이는 수토동법 견해도 있습니다. 이 앱은 자평명리 주류인 화토동법·음간 역행을 씁니다.',
  };
  var BR = '子丑寅卯辰巳午未申酉戌亥';
  function stageOf(s, b) { var L = BASIS.longLife[s], yang = s % 2 === 0, i = yang ? (b - L) : (L - b); return ORDER[((i % 12) + 12) % 12]; }

  // ───────────── 단계 구간(기운의 상태) ─────────────
  var PHASES = [
    { key: 'grow', name: '생장', desc: '기운이 자라는 때', stages: ['장생', '목욕', '관대'] },
    { key: 'peak', name: '왕성', desc: '기운이 차오른 때', stages: ['건록', '제왕'] },
    { key: 'fade', name: '쇠퇴', desc: '기운이 가라앉는 때', stages: ['쇠', '병', '사'] },
    { key: 'store', name: '저장', desc: '기운을 거두는 때', stages: ['묘', '절'] },
    { key: 'renew', name: '재생', desc: '기운이 다시 싹트는 때', stages: ['태', '양'] },
  ];
  var PHASE_OF = {}; PHASES.forEach(function (p) { p.stages.forEach(function (n) { PHASE_OF[n] = p; }); });

  // ───────────── 단계 데이터 ─────────────
  // kw: 핵심 키워드 · motif: 그림 · state: ① 지금 어떤 상태인가 · short: 요약 한 마디 · trad: ② 전통적으로 상징하는 성질
  // at: ③ 원국 봉법(일간 기준) 자리별 해석 · jwa: ③ 좌법(그 기둥 천간이 자기 지지에서) · dae: ③ 대운 10년 · care: ④ 이 단계에서 특히 주의할 점
  var STAGES = {
    장생: { h: '長生', kw: '탄생·시작', motif: '새싹', short: '기운이 막 자라기 시작하는 상태',
      state: '땅을 뚫고 막 올라온 새싹처럼, 기운이 처음 모습을 드러내고 자라기 시작하는 상태입니다.',
      trad: '전통적으로는 새로 시작하는 힘, 배우고 받아들이는 힘, 주변의 보살핌을 받으며 크는 모습을 상징합니다.',
      at: { year: '집안의 바탕이나 어린 시절에 보살핌과 배움의 기운이 깃든 자리로 읽습니다.', month: '일하는 환경에서 배우며 자라는 힘이 붙는 구조로 읽습니다. 윗사람이나 조직의 도움과 연결해 해석하기도 합니다.', day: '나 자신이 머무는 자리에 자라는 기운이 있어, 가까운 관계 안에서 함께 성장하는 모습으로 읽습니다.', hour: '자녀·후배와의 인연, 그리고 인생 후반부에도 새로 배우고 시작하는 기운이 이어지는 자리로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 막 자라기 시작한 모습이라, 그 기운이 이제 뿌리를 내려 가는 중이라고 봅니다.',
      dae: '10년 동안 일간의 기운이 새로 싹트는 자리를 지납니다. 새로 배우거나 처음 해 보는 일과 결이 맞는 흐름으로 읽습니다.',
      care: '시작하는 기운이라는 뜻이지, 일이 저절로 잘 풀린다는 뜻은 아닙니다.' },
    목욕: { h: '沐浴', kw: '성장 초기·불안정', motif: '물방울을 맞는 새싹', short: '자라고는 있지만 흔들림이 많은 상태',
      state: '새싹이 처음 비와 바람을 맞는 때처럼, 자라고는 있지만 아직 흔들림이 많은 상태입니다.',
      trad: '전통적으로는 갓 태어난 아기를 씻긴다는 뜻으로, 꾸미고 드러내는 매력, 호기심, 감정의 변화, 새것에 대한 관심을 상징합니다.',
      at: { year: '어린 시절에 환경 변화가 잦았거나, 바깥에 감각적이고 자유로운 인상으로 비치는 모습과 연결해 읽습니다.', month: '일하는 환경에서 유행과 변화에 민감하고, 이것저것 시도해 보는 결로 읽습니다.', day: '가까운 관계에서 감정 표현이 풍부하고 매력이 드러나는 자리로 읽으며, 마음의 오르내림을 함께 살핍니다.', hour: '자녀·후배와의 관계나 인생 후반부에도 새로운 관심사를 찾아 나서는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 아직 자리를 잡는 중이라, 그 기운이 드러났다 숨었다 하며 흔들리기 쉽다고 봅니다.',
      dae: '10년 동안 일간의 기운이 자라면서도 흔들림이 많은 자리를 지납니다. 새로운 경험과 변화가 잦은 흐름으로 읽습니다.',
      care: '목욕을 곧바로 이성 문제나 구설로 잇는 해석도 있지만, 신살·합·십성을 함께 보지 않고 단정하지 않습니다.' },
    관대: { h: '冠帶', kw: '성장·성숙', motif: '성장하는 어린나무', short: '기운이 성숙해 가며 자신감이 붙는 상태',
      state: '줄기를 세우며 쑥쑥 크는 어린나무처럼, 기운이 성숙해 가며 자신감이 붙는 상태입니다.',
      trad: '전통적으로는 성인이 되어 관(冠)과 띠(帶)를 갖춘다는 뜻으로, 자존감, 도전 정신, 앞에 나서려는 힘을 상징합니다.',
      at: { year: '집안이나 어린 시절에 자기 주장을 키워 가는 분위기가 있었던 자리로 읽습니다.', month: '사회생활에서 패기 있게 나서고 겨루며 성장하는 결로 읽습니다.', day: '나 자신과 가까운 관계에서 자존심과 주관이 뚜렷하게 드러나는 자리로 읽습니다.', hour: '자녀·후배가 자기 길을 개척하는 모습, 또는 인생 후반부에도 새 목표에 도전하는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 형태를 갖춰 가는 모습이라, 그 기운이 점점 또렷해지는 중이라고 봅니다.',
      dae: '10년 동안 일간의 기운이 자라 형태를 갖춰 가는 자리를 지납니다. 실력을 키우고 드러내 보려는 흐름과 결이 맞는 것으로 읽습니다.',
      care: '자신감이 커지는 단계라는 상징일 뿐, 무리하거나 과시한다고 단정하지 않습니다.' },
    건록: { h: '建祿', kw: '자립·활동', motif: '굳게 뿌리내린 나무', short: '스스로 서서 꾸준히 움직이는 상태',
      state: '뿌리를 깊이 내린 나무처럼, 스스로 서서 꾸준히 활동할 수 있는 상태입니다.',
      trad: '전통적으로는 녹(祿), 곧 제 힘으로 받는 봉급을 뜻해 자립심, 실무 능력, 꾸준함을 상징합니다.',
      at: { year: '집안의 바탕에서 일찍부터 제 몫을 하려는 기운과 연결해 읽습니다.', month: '일하는 환경에서 실무 능력과 자립심이 뚜렷한 구조로 읽습니다. 전통적으로 월지 건록은 건록격(建祿格)을 따지는 근거가 되기도 합니다.', day: '나 자신이 머무는 자리에 스스로 서는 힘이 있어, 관계 안에서도 자기 몫을 지키려는 결로 읽습니다.', hour: '자녀·후배가 자립하는 모습, 또는 인생 후반부까지 자기 일을 이어 가는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에 단단히 뿌리를 내린 모습이라, 그 기운이 안정적으로 힘을 쓴다고 봅니다.',
      dae: '10년 동안 일간의 기운이 스스로 서는 자리를 지납니다. 자기 힘으로 일하고 자리를 다지는 흐름으로 읽습니다.',
      care: '자립의 상징이지 재물이 많다는 뜻은 아닙니다.' },
    제왕: { h: '帝旺', kw: '왕성·절정', motif: '무성한 큰 나무', short: '기운이 가장 크게 차오른 상태',
      state: '잎이 가장 무성한 큰 나무처럼, 기운이 가장 크게 차오른 절정의 상태입니다.',
      trad: '전통적으로는 왕성함, 주도하려는 힘, 강한 자기 기준을 상징합니다. 가득 찬 기운은 다음 단계로 넘어갈 때를 함께 품는다고 봅니다.',
      at: { year: '집안의 바탕이나 어린 시절에 강한 기운이 자리한 것으로 읽습니다.', month: '일하는 환경에서 주도권을 쥐려는 힘이 크게 드러나는 구조로 읽습니다.', day: '나 자신이 머무는 자리에 기운이 가득해, 관계에서도 자기 생각이 분명하게 드러나는 자리로 읽습니다.', hour: '자녀·후배의 기운이 뚜렷하거나, 인생 후반부에 힘이 모이는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 가장 크게 차오른 모습이라, 그 기운이 뚜렷하게 드러난다고 봅니다.',
      dae: '10년 동안 일간의 기운이 가장 크게 차오르는 자리를 지납니다. 스스로 판단하고 이끌려는 힘이 커지는 흐름으로 읽습니다.',
      care: '가장 왕성하다는 뜻이지 성공이나 행운을 보장하는 표시가 아닙니다. 기운이 넘치는지 알맞은지는 원국 전체의 균형으로 봅니다.' },
    쇠: { h: '衰', kw: '쇠퇴 시작', motif: '단풍이 드는 나무', short: '절정을 지나 차분히 가라앉기 시작한 상태',
      state: '단풍이 들기 시작한 나무처럼, 절정을 지나 기운이 차분히 가라앉기 시작한 상태입니다.',
      trad: '전통적으로는 힘이 조금씩 줄어드는 대신, 경험에서 나오는 노련함과 신중함을 상징합니다.',
      at: { year: '집안의 바탕이나 어린 시절의 차분하고 신중한 분위기와 연결해 읽습니다.', month: '일하는 환경에서 앞장서기보다 경험을 살려 안정적으로 꾸려 가는 결로 읽습니다.', day: '나 자신과 가까운 관계에서 서두르지 않고 한 번 더 살피는 성향과 연결해 읽습니다.', hour: '자녀·후배와의 관계나 인생 후반부를 차분하게 다듬어 가는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 절정을 지나 숨을 고르는 모습이라, 그 기운이 노련하고 차분하게 쓰인다고 봅니다.',
      dae: '10년 동안 일간의 기운이 절정을 지나 숨을 고르는 자리를 지납니다. 벌이기보다 다듬고 지키는 흐름으로 읽습니다.',
      care: '쇠퇴는 실패가 아니라 기운을 쓰는 속도가 바뀌는 단계입니다.' },
    병: { h: '病', kw: '쇠약·위축', motif: '잎이 줄어든 나무', short: '밖으로 뻗는 힘은 줄고 안을 돌보는 상태',
      state: '잎이 줄어든 나무처럼, 밖으로 뻗는 힘은 줄고 안쪽으로 기운을 아끼는 상태입니다.',
      trad: '전통적으로는 추진력이 약해지는 대신 섬세함, 감수성, 남의 처지를 헤아리는 마음을 상징합니다.',
      at: { year: '어린 시절에 주변을 섬세하게 살피며 자란 결과 연결해 읽습니다.', month: '일하는 환경에서 세심함과 공감하는 힘이 쓰이는 결로 읽습니다.', day: '가까운 관계에서 상대를 돌보고 배려하는 성향과 연결해 읽습니다.', hour: '자녀·후배를 세심하게 챙기거나, 인생 후반부에 마음을 돌보는 일에 관심이 가는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 힘을 아끼는 모습이라, 그 기운이 크게 드러나기보다 섬세하게 쓰인다고 봅니다.',
      dae: '10년 동안 일간의 기운이 안으로 힘을 아끼는 자리를 지납니다. 무리하게 넓히기보다 세심하게 돌보는 흐름으로 읽습니다.',
      care: '이름이 병(病)이지만 질병을 뜻하지 않습니다. 건강은 12운성으로 판단하지 않습니다.' },
    사: { h: '死', kw: '활동 종료', motif: '잎이 떨어진 나무', short: '바깥 활동을 멈추고 한곳에 모이는 상태',
      state: '잎을 모두 떨군 나무처럼, 바깥 활동을 멈추고 기운이 한곳에 고요히 모이는 상태입니다.',
      trad: '전통적으로는 움직임이 멎는 대신 한 가지에 깊이 몰두하는 힘, 생각과 연구, 정신적인 활동을 상징합니다.',
      at: { year: '어린 시절이나 집안의 조용하고 생각이 깊은 분위기와 연결해 읽습니다.', month: '일하는 환경에서 넓게 벌이기보다 한 분야를 깊게 파는 결로 읽습니다.', day: '나 자신이 머무는 자리에서 겉보다 속이 깊고, 생각을 오래 품는 성향과 연결해 읽습니다.', hour: '인생 후반부에 공부·정리·정신적인 일에 마음이 가는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 움직임을 멈춘 모습이라, 그 기운이 밖보다 안에서 깊게 쓰인다고 봅니다.',
      dae: '10년 동안 일간의 기운이 활동을 멈추고 모이는 자리를 지납니다. 바깥으로 넓히기보다 한 가지를 깊게 하는 흐름으로 읽습니다.',
      care: '사(死)는 활동이 멈추는 단계를 비유한 이름일 뿐, 죽음이나 사고를 뜻하지 않습니다.' },
    묘: { h: '墓', kw: '저장·잠복', motif: '땅속에 저장된 씨앗', short: '드러나지 않고 안으로 저장되는 상태',
      state: '땅속에 갈무리된 씨앗처럼, 기운이 드러나지 않고 안으로 저장되는 상태입니다.',
      trad: '전통적으로는 묘(墓)를 창고(庫)로도 보아, 모으고 간직하고 아끼는 힘을 상징합니다.',
      at: { year: '집안에서 물려받거나 간직해 온 것이 있는 자리로 읽기도 합니다.', month: '일하는 환경에서 모으고 관리하고 지키는 역할과 연결해 읽습니다.', day: '나 자신이 머무는 자리에 저장의 기운이 있어, 속마음을 쉽게 드러내지 않는 결로 읽습니다.', hour: '인생 후반부에 쌓아 둔 것을 지키고 갈무리하는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 창고에 들어간 모습이라, 그 기운이 겉으로 드러나기보다 안에 보관된다고 봅니다.',
      dae: '10년 동안 일간의 기운이 땅속에 저장되는 자리를 지납니다. 드러내기보다 모으고 갈무리하는 흐름으로 읽습니다.',
      care: '창고가 실제로 열려 쓰이는지는 충·형 같은 다른 글자와의 관계에 따라 달리 봅니다. 12운성만으로 재물을 단정하지 않습니다.' },
    절: { h: '絶', kw: '단절·전환', motif: '비어 있는 땅', short: '이전 기운이 끝나고 다음으로 넘어가는 상태',
      state: '아무것도 자라지 않는 빈 땅처럼, 이전 기운이 끝나고 다음 기운으로 넘어가는 경계의 상태입니다.',
      trad: '전통적으로는 끊어짐과 전환, 그래서 오히려 새 출발의 계기를 상징합니다.',
      at: { year: '어린 시절에 환경이 바뀌었거나, 집안의 바탕과는 다른 길을 걷는 결과 연결해 읽기도 합니다.', month: '일하는 환경에서 방향을 바꾸거나 새로 시작하는 경험과 연결해 읽습니다.', day: '가까운 관계에서 맺고 끊음이 분명하거나, 관계의 전환점이 또렷한 결로 읽습니다.', hour: '인생 후반부에 이전과 다른 새 국면을 여는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 뿌리가 끊긴 모습이라, 그 기운이 홀로 떠 있어 쓰임이 자주 바뀐다고 봅니다.',
      dae: '10년 동안 일간의 기운이 한 흐름을 끝내고 다음으로 넘어가는 자리를 지납니다. 정리하고 방향을 바꾸는 흐름으로 읽습니다.',
      care: '끊어짐은 끝이 아니라 전환입니다. 이별이나 실패로 단정하지 않습니다.' },
    태: { h: '胎', kw: '잉태·형성', motif: '땅속에서 싹트는 씨앗', short: '새 기운이 보이지 않게 형태를 잡는 상태',
      state: '땅속 씨앗이 막 싹을 품기 시작한 것처럼, 새 기운이 보이지 않게 형태를 잡아 가는 상태입니다.',
      trad: '전통적으로는 잉태를 뜻해 아직 드러나지 않은 가능성, 구상과 계획을 상징합니다.',
      at: { year: '어린 시절이나 집안의 바탕에 앞으로 자랄 가능성이 담긴 자리로 읽습니다.', month: '일하는 환경에서 새로운 구상과 기획이 자주 떠오르는 결로 읽습니다.', day: '가까운 관계에서 아직 다 드러나지 않은 가능성을 품고 천천히 자리를 잡아 가는 결로 읽습니다.', hour: '자녀·후배와의 인연, 또는 인생 후반부에 새 계획을 품는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 막 싹을 품은 모습이라, 그 기운이 아직 드러나지 않은 채 자라고 있다고 봅니다.',
      dae: '10년 동안 일간의 기운이 새로 잉태되는 자리를 지납니다. 다음을 구상하고 씨앗을 심는 흐름으로 읽습니다.',
      care: '가능성의 상징이며, 무엇이 실제로 이루어질지는 운의 흐름과 선택에 따라 달라집니다.' },
    양: { h: '養', kw: '양육·준비', motif: '땅속에서 자라는 어린싹', short: '땅속에서 자라며 나올 준비를 하는 상태',
      state: '땅속에서 어린싹이 자라며 바깥으로 나올 준비를 하는 상태입니다.',
      trad: '전통적으로는 엄마 품에서 길러지는 단계로, 보호받으며 준비하는 힘, 길러 주고 길러지는 관계를 상징합니다.',
      at: { year: '어린 시절에 보살핌을 받으며 자란 결과 연결해 읽습니다.', month: '일하는 환경에서 배우고 준비하며 차근차근 힘을 기르는 결로 읽습니다.', day: '가까운 관계에서 서로 돌보고 기르는 결로 읽습니다.', hour: '자녀·후배를 길러 내는 일, 또는 인생 후반부에 다음을 준비하는 결로 읽습니다.' },
      jwa: '그 글자가 자기 자리에서 길러지는 모습이라, 그 기운이 차근차근 힘을 모으는 중이라고 봅니다.',
      dae: '10년 동안 일간의 기운이 땅속에서 길러지는 자리를 지납니다. 준비하고 힘을 모아 다음 시작을 기다리는 흐름으로 읽습니다.',
      care: '준비의 상징일 뿐, 남에게 기대는 성향이라고 단정하지 않습니다.' },
  };

  // 자리(기둥)
  var PILLAR = {
    hour: { lab: '시지', col: '시주', what: '시지는 자녀·후배, 인생 후반부, 마음속 지향을 보는 자리입니다.' },
    day: { lab: '일지', col: '일주', what: '일지는 나 자신이 머무는 자리이자 배우자 자리로 봅니다.' },
    month: { lab: '월지', col: '월주', what: '월지는 사회생활과 일하는 환경, 부모·형제를 보는 자리이며 사주 전체의 바탕(월령)이기도 합니다.' },
    year: { lab: '년지', col: '년주', what: '년지는 집안의 바탕과 어린 시절, 바깥에 비치는 첫 모습을 보는 자리입니다.' },
  };
  var CARD_ORDER = ['hour', 'day', 'month', 'year'];
  var CARE_NATAL = '12운성은 기운이 생명주기의 어디쯤 있는지를 보여 주는 지표입니다. 신강·신약이나 성격은 월령·통근·지장간·십성을 함께 봐야 판단할 수 있어, 12운성만으로 정하지 않습니다.';
  var CARE_DAEUN = '12운성은 운세 점수나 길흉 판단에 쓰이지 않습니다. 이 대운이 나에게 유리한지는 위 대운 흐름(용신·십성·합충을 보는 운세 분석)에서 따로 판단합니다.';

  // ───────────── 아이콘 ─────────────
  // 64×64, 같은 틀(빛 원판 + 땅 단면 + 지평선) 위에 단계별 식물을 그린다. 색은 CSS 변수 --usc(채움)·--usk(선)로 바꾼다.
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  function leaf(x1, y1, x2, y2, w) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L * w, ny = dx / L * w, mx = x1 + dx / 2, my = y1 + dy / 2;
    return '<path class="us-f" d="M' + r1(x1) + ',' + r1(y1) + ' Q' + r1(mx + nx) + ',' + r1(my + ny) + ' ' + r1(x2) + ',' + r1(y2) + ' Q' + r1(mx - nx) + ',' + r1(my - ny) + ' ' + r1(x1) + ',' + r1(y1) + 'Z"/>';
  }
  function drop(x, y) { return '<path class="us-w" d="M' + x + ',' + (y - 4.5) + ' C' + (x + 3.4) + ',' + (y - .4) + ' ' + (x + 3.4) + ',' + (y + 3) + ' ' + x + ',' + (y + 3) + ' C' + (x - 3.4) + ',' + (y + 3) + ' ' + (x - 3.4) + ',' + (y - .4) + ' ' + x + ',' + (y - 4.5) + 'Z"/>'; }
  function spark(x, y, s) { return '<path class="us-d" d="M' + x + ',' + (y - s) + ' L' + r1(x + s * .28) + ',' + r1(y - s * .28) + ' L' + (x + s) + ',' + y + ' L' + r1(x + s * .28) + ',' + r1(y + s * .28) + ' L' + x + ',' + (y + s) + ' L' + r1(x - s * .28) + ',' + r1(y + s * .28) + ' L' + (x - s) + ',' + y + ' L' + r1(x - s * .28) + ',' + r1(y - s * .28) + 'Z"/>'; }
  var S_ = function (d, cls) { return '<path class="' + (cls || 'us-s') + '" d="' + d + '"/>'; };
  var C_ = function (x, y, r, cls) { return '<circle class="' + (cls || 'us-f') + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; };
  var E_ = function (x, y, rx, ry, cls) { return '<ellipse class="' + (cls || 'us-f') + '" cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '"/>'; };
  var TRUNK = function (w, top) { return '<path class="us-t" d="M' + (32 - w) + ',42 L' + (32 - w * .45) + ',' + top + ' L' + (32 + w * .45) + ',' + top + ' L' + (32 + w) + ',42Z"/>'; };
  var ROOTS = S_('M32,42 Q28,47 22,50 M32,42 Q32.5,48 32,55 M32,42 Q36,47 42,50', 'us-s us-thin');
  var ART = {
    장생: S_('M32,42 Q32,37 32,31') + leaf(32, 35, 21.5, 28, 4.6) + leaf(32, 32, 42.5, 24.5, 4.6) + spark(46, 14, 3.6),
    목욕: S_('M32,42 Q30.5,37 33,31') + leaf(31.6, 36, 22.5, 31, 4.2) + leaf(33, 32, 41.5, 27, 4.2) + drop(21, 17) + drop(32, 11.5) + drop(43, 18),
    관대: TRUNK(1.8, 22) + S_('M32,31 L25.5,26 M32,27 L38.5,22.5', 'us-s us-thin') + E_(32, 17, 8.5, 7.5) + leaf(25.5, 26, 19.5, 22.5, 3.4) + leaf(38.5, 22.5, 44.5, 19.5, 3.4),
    건록: TRUNK(2.6, 24) + ROOTS + E_(32, 18.5, 13, 10) + S_('M26,19 Q29,16 32,18 M33,22 Q36,19 38,20', 'us-s us-thin us-tex'),
    제왕: '<circle class="us-halo" cx="32" cy="32" r="26.5"/>' + TRUNK(3.2, 25) + ROOTS + C_(21, 23, 8.5, 'us-f us-cn') + C_(43, 23, 8.5, 'us-f us-cn') + C_(25.5, 14.5, 8.5, 'us-f us-cn') + C_(38.5, 14.5, 8.5, 'us-f us-cn') + C_(32, 18, 10, 'us-f us-cn') + S_('M22,22 Q25,19 28,21 M36,13 Q39,11 41,13 M35,22 Q38,20 41,22', 'us-s us-thin us-tex'),
    쇠: TRUNK(2.6, 24) + ROOTS + E_(32, 19, 12, 9.5) + S_('M26,20 Q29,17 32,19 M33,23 Q36,20 38,21', 'us-s us-thin us-tex') + leaf(46, 30, 49.5, 35, 2),
    병: S_('M32,42 L32,23 M32,33 L24,25 M32,29 L40.5,21') + leaf(24, 25, 19.5, 20.5, 2.8) + leaf(40.5, 21, 45, 16.5, 2.8) + leaf(32, 23.5, 32, 17, 2.6),
    사: S_('M32,42 L32,21 M32,34 L23,26 M32,30 L41,22 M32,25 L27.5,18.5 M32,25 L36.5,17.5 M23,26 L20,22.5 M41,22 L44.5,19') + leaf(17.5, 41.2, 23.5, 40, 1.7) + leaf(41, 40.6, 47, 41.6, 1.7),
    묘: S_('M19,42 Q32,37 45,42', 'us-s us-thin') + S_('M23.5,52 A8.5,6.5 0 0 1 40.5,52', 'us-s us-thin us-dash') + E_(32, 51.5, 5, 3.6) + S_('M30.5,50.5 Q32,49.5 33.5,50.5', 'us-s us-thin us-tex') + C_(24, 56.5, 1.1, 'us-d') + C_(40, 56.5, 1.1, 'us-d'),
    절: '<path class="us-f" d="M37,13 A9.5,9.5 0 1 0 37,31 A7.5,7.5 0 1 1 37,13Z"/>' + C_(25, 41, 1.6, 'us-d') + C_(39.5, 41.2, 1.2, 'us-d') + S_('M13,51 H51', 'us-s us-thin us-dash'),
    태: C_(32, 24, 2.2, 'us-d us-glow') + E_(32, 50.5, 5.8, 4.3) + S_('M32,53 Q30.8,49.5 33,47.5', 'us-s us-thin') + S_('M32,54.8 Q31.2,57 32.2,59', 'us-s us-thin') + spark(41.5, 21, 2.4),
    양: E_(32, 54, 4.8, 3.4) + S_('M32,51.5 Q29.8,47.5 32,44.6', 'us-s us-thin') + leaf(32, 44.8, 36.6, 43.4, 1.7) + S_('M32,57.2 Q29.5,59 27,59.3 M32,57.2 Q34.5,59 37,59.3', 'us-s us-thin'),
  };
  var FRAME = '<circle class="us-orb" cx="32" cy="32" r="30"/><path class="us-soil" d="M3.7,42 A30,30 0 0 0 60.3,42 Z"/><path class="us-gl" d="M4.5,42 H59.5"/>';
  function icon(n, cls) {
    if (!STAGES[n]) return '';
    return '<svg class="us-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + FRAME + ART[n] + '</svg>';
  }
  // 단계 색: 채움(--usc)·선과 글자(--usk). 실제 색 값은 index.html 의 --us-c0…11 / --us-k0…11 토큰(밝은·어두운 테마)
  function vars(n) { var i = ORDER.indexOf(n); return i < 0 ? '' : '--usc:var(--us-c' + i + ');--usk:var(--us-k' + i + ')'; }

  // ───────────── 해석 조립 ─────────────
  // 조사: 앞말 마지막 한글의 받침으로 고른다(a = 받침 있을 때, b = 없을 때). '으로/로'는 ㄹ 받침도 '로'
  function jo(w, a, b) { var t = String(w).replace(/[^가-힣]+$/, ''), c = t.charCodeAt(t.length - 1) - 0xAC00; if (!(c >= 0 && c <= 11171)) return a + '(' + b + ')'; var j = c % 28; return j && !(a === '으로' && j === 8) ? a : b; }
  function esc0(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // 원국 한 자리: { mean, trad, place, care } — 봉법은 자리별 해석, 좌법은 그 기둥 천간(십성)이 자기 지지에서 어떤 상태인지
  function natalExplain(M, ch, k, mode) {
    var c = ch.cells[k], p = ch.pillars[k]; if (!c || !p) return null;
    var jwa = mode === 'jwa', n = jwa ? c.unseongJwa : c.unseong, st = STAGES[n], P = PILLAR[k], d = ch.pillars.day.s;
    var place, extra = [];
    if (jwa) {
      var who = k === 'day' ? '일간(나) ' + M.STEM[p.s] + '(' + M.STEM_K[p.s] + ')' : P.col + '의 천간 ' + M.STEM[p.s] + '(' + c.stemTG + ')';
      place = who + jo(who, '이', '가') + ' 바로 아래 ' + M.BR[p.b] + '(' + M.BR_K[p.b] + ') 위에서 ' + n + ' 단계에 있습니다. ' + st.jwa + (k === 'day' ? ' 일주는 일간이 곧 그 기둥의 천간이라 봉법과 값이 같습니다.' : '');
    } else {
      place = P.what + ' 이 자리에서 일간 ' + M.STEM[d] + '(' + M.STEM_K[d] + ')' + jo(M.STEM_K[d], '이', '가') + ' ' + M.BR[p.b] + '(' + M.BR_K[p.b] + ')' + jo(M.BR_K[p.b], '을', '를') + ' 만나 ' + n + ' 단계가 됩니다. ' + st.at[k];
      if (n === '제왕' && d % 2 === 0) extra.push('양간 일간의 제왕 자리는 양인(羊刃)과 같은 지지라, 양인의 해석도 함께 살핍니다.');
      if (n === '건록' && k === 'day') extra.push('일지에 건록이 있는 일주를 전록(專祿)이라 부르기도 합니다.');
    }
    return { stage: n, mean: st.state, trad: st.trad, place: place + (extra.length ? ' ' + extra.join(' ') : ''), care: st.care + ' ' + CARE_NATAL };
  }
  function phaseCount(list) { var o = {}; list.forEach(function (n) { var p = PHASE_OF[n]; if (p) o[p.name] = (o[p.name] || 0) + 1; }); return o; }
  // 네 지지의 12운성을 묶어 2~3문장. 강약·성격을 단정하지 않는다.
  function natalSummary(M, ch, mode) {
    var jwa = mode === 'jwa', ks = CARD_ORDER.filter(function (k) { return ch.cells[k]; });
    var list = ks.map(function (k) { return jwa ? ch.cells[k].unseongJwa : ch.cells[k].unseong; });
    var cnt = phaseCount(list), parts = PHASES.filter(function (p) { return cnt[p.name]; }).map(function (p) { return p.name + ' ' + cnt[p.name] + '곳'; });
    var s1 = (jwa ? '각 기둥의 천간을 자기 지지에서 보면' : '일간(나)을 기준으로 보면') + ' 네 자리' + (ks.length < 4 ? '(시주 미상이라 세 자리)' : '') + '가 ' + parts.join(', ') + '에 놓여 있습니다.';
    var dn = jwa ? ch.cells.day.unseongJwa : ch.cells.day.unseong;
    var s2 = '나 자신이 머무는 일지는 ' + dn + '(' + STAGES[dn].kw + ')' + jo(STAGES[dn].kw, '으로', '로') + ', ' + STAGES[dn].short + '로 읽습니다.';
    var up = (cnt['생장'] || 0) + (cnt['왕성'] || 0), down = (cnt['쇠퇴'] || 0) + (cnt['저장'] || 0), re = cnt['재생'] || 0, s3;
    if (Object.keys(cnt).length === 1) s3 = '모든 자리가 같은 ' + Object.keys(cnt)[0] + ' 구간에 있어, 기운을 쓰는 방식이 한 방향으로 모여 있는 모습입니다.';
    else if (up >= 3) s3 = '기운이 자라고 차오르는 단계에 많이 놓여 있어, 밖으로 뻗어 가는 결이 두드러지게 읽힙니다.';
    else if (down >= 3) s3 = '기운을 거두고 갈무리하는 단계에 많이 놓여 있습니다. 힘이 없다는 뜻이 아니라 기운을 안쪽으로 모아 쓰는 결로 읽습니다.';
    else if (re >= 2) s3 = '새 기운이 싹트고 길러지는 단계가 여럿이라, 준비하고 품는 결이 두드러지게 읽힙니다.';
    else s3 = '자라는 단계와 거두는 단계가 섞여 있어, 자리마다 기운을 쓰는 방식이 다르게 읽힙니다.';
    return [s1, s2, s3];
  }
  // 대운 하나: { mean, trad, state, relation[], care, flow } — 기운의 상태와 원국과의 관계를 나눠 쓰고, 운세 판정은 따로 둔다
  function daeunExplain(M, ch, x, opt) {
    var n = x.unseong, st = STAGES[n], rel = [];
    var same = CARD_ORDER.filter(function (k) { return ch.cells[k] && ch.cells[k].unseong === n; }).map(function (k) { return PILLAR[k].lab; });
    rel.push(same.length ? '원국의 ' + same.join('·') + '도 같은 ' + n + ' 단계라, 원국에 있던 기운의 상태가 이 10년 동안 한 번 더 겹쳐 읽힙니다.' : '원국의 네 지지에는 없는 ' + n + ' 단계라, 원국과는 다른 기운의 상태를 10년 동안 경험하는 것으로 읽습니다.');
    var sameB = CARD_ORDER.filter(function (k) { return ch.pillars[k] && ch.pillars[k].b === x.b; }).map(function (k) { return PILLAR[k].lab; });
    if (sameB.length) rel.push('대운 지지 ' + M.BR[x.b] + '(' + M.BR_K[x.b] + ')' + jo(M.BR_K[x.b], '은', '는') + ' 원국 ' + sameB.join('·') + '와 같은 글자입니다.');
    var dn = ch.cells.day.unseong, dp = PHASE_OF[dn], xp = PHASE_OF[n];
    rel.push('원국 일지는 ' + dn + '(' + dp.name + ' 구간)이고, 이 대운은 ' + n + '(' + xp.name + ' 구간)입니다.' + (dp === xp ? ' 같은 구간이라 익숙한 방식으로 기운을 쓰기 쉽습니다.' : ' 구간이 달라, 원국에서 익숙한 방식과 다른 결로 기운이 움직이는 시기로 읽습니다.'));
    var flow = opt && opt.flowLabel ? opt.flowLabel(x) : '';
    return { stage: n, mean: st.state, trad: st.trad + ' ' + st.dae, relation: rel, care: st.care + ' ' + CARE_DAEUN, flow: flow };
  }

  // ───────────── 화면 조각 ─────────────
  function block(no, title, body) { return '<div class="us-ex"><span class="us-exn" aria-hidden="true">' + no + '</span><div><b>' + title + '</b>' + body + '</div></div>'; }
  function para(t, E) { return '<p>' + E(t) + '</p>'; }
  // 12단계 생명주기 띠: 단계 구간별로 묶고, 표시할 단계(on)를 밝힌다
  function cycleStrip(on, E) {
    var set = {}; (on || []).forEach(function (n) { set[n] = 1; });
    return '<div class="us-cyc" role="list" aria-label="12운성 생명주기: 장생에서 양까지 돈 뒤 다시 장생으로">' + PHASES.map(function (p) {
      return '<div class="us-ph" role="listitem"><span class="us-phn">' + p.name + '</span><div class="us-phi">' + p.stages.map(function (n) {
        return '<span class="us-cy' + (set[n] ? ' on' : '') + '" style="' + vars(n) + '" title="' + E(n + ' · ' + STAGES[n].kw) + '">' + icon(n) + '<i>' + n + '</i></span>';
      }).join('') + '</div></div>';
    }).join('') + '<span class="us-loop" aria-hidden="true">양 다음은 다시 장생 ↻</span></div>';
  }
  function detailNatal(M, ch, k, mode, E) {
    var x = natalExplain(M, ch, k, mode); if (!x) return '';
    var st = STAGES[x.stage], P = PILLAR[k], p = ch.pillars[k];
    return '<div class="us-det" style="' + vars(x.stage) + '"><div class="us-deth">' + icon(x.stage, 'us-ic-lg') + '<div><span class="us-dett">' + P.lab + ' ' + M.BR[p.b] + ' · ' + (mode === 'jwa' ? '좌법' : '봉법') + '</span><h4>' + x.stage + ' <small>' + st.h + '</small></h4><span class="us-kw">' + st.kw + ' · ' + PHASE_OF[x.stage].name + '</span></div></div>' +
      block('①', '단계의 의미', para(x.mean, E)) + block('②', '전통적 해석', para(x.trad, E)) + block('③', '이 자리에서의 의미', para(x.place, E)) + block('④', '주의사항', para(x.care, E)) + '</div>';
  }
  // 원국 탭: 봉법·좌법 스위치 + 네 자리 카드 + 핵심 해석 + 선택한 자리 설명 + 생명주기 띠
  function natalHTML(M, ch, opt) {
    opt = opt || {}; var E = opt.esc || esc0, T = opt.term || function (t, l) { return l == null ? t : l; };
    var mode = opt.mode === 'jwa' ? 'jwa' : 'bong', jwa = mode === 'jwa', pick = ch.cells[opt.pick] ? opt.pick : 'day';
    var toggle = '<div class="seg us-seg" role="group" aria-label="12운성 보는 기준"><button type="button" data-act="un:bong" aria-pressed="' + !jwa + '">봉법 · 일간 기준</button><button type="button" data-act="un:jwa" aria-pressed="' + jwa + '">좌법 · 각 기둥 천간 기준</button></div>';
    var d = ch.pillars.day.s;
    var intro = jwa ? '각 기둥의 천간이 바로 아래 자기 지지에서 어떤 상태인지(' + T('좌법') + ') 보여 줍니다. 원국 표에 작게 적힌 값입니다.' : M.STEM[d] + M.EL_K[M.stemEl(d)] + ' 일간(나)의 기운이 네 지지에서 생명주기의 어디쯤 있는지(' + T('봉법') + ') 보여 줍니다. 원국 표에 크게 적힌 값입니다.';
    var cards = CARD_ORDER.map(function (k) {
      var c = ch.cells[k], p = ch.pillars[k], P = PILLAR[k];
      if (!c || !p) return '<div class="us-card us-none" role="listitem"><span class="us-pos">' + P.lab + '</span><span class="us-br">—</span><span class="us-nm">시주 미상</span></div>';
      var n = jwa ? c.unseongJwa : c.unseong, st = STAGES[n], on = k === pick;
      return '<div role="listitem"><button type="button" class="us-card' + (on ? ' sel' : '') + '" data-act="us-p:' + k + '" aria-pressed="' + on + '" style="' + vars(n) + '" aria-label="' + E(P.lab + ' ' + M.BR[p.b] + ' ' + n + ', ' + st.kw) + '">' +
        '<span class="us-pos">' + P.lab + (jwa ? ' <em>' + M.gzName(p) + '</em>' : '') + '</span><span class="us-br">' + M.BR[p.b] + '<i>' + M.BR_K[p.b] + '</i></span>' + icon(n) + '<span class="us-nm">' + n + '</span><span class="us-kw">' + st.kw + '</span></button></div>';
    }).join('');
    var sum = natalSummary(M, ch, mode);
    var on = CARD_ORDER.filter(function (k) { return ch.cells[k]; }).map(function (k) { return jwa ? ch.cells[k].unseongJwa : ch.cells[k].unseong; });
    return '<div class="us-box" data-us="natal">' + toggle + '<p class="small us-intro">' + intro + ' 카드를 누르면 그 자리의 설명이 열립니다.</p>' +
      '<div class="us-sum"><b>핵심 해석</b><p>' + sum.map(E).join(' ') + '</p></div>' +
      '<div class="us-cards" role="list">' + cards + '</div>' +
      '<div class="us-live" aria-live="polite">' + detailNatal(M, ch, pick, mode, E) + '</div>' +
      cycleStrip(on, E) + (opt.diff || '') +
      '<p class="note">' + E('12운성은 좋고 나쁨이 아니라 기운이 자라고, 차오르고, 가라앉고, 저장되고, 다시 싹트는 상태를 나타냅니다. 식물 그림은 이해를 돕는 비유이며 전통 명리학의 공식 상징은 아닙니다. 계산 기준: ' + BASIS.rule + '.') + '</p></div>';
  }
  function detailDaeun(M, ch, x, cur, opt, E) {
    var r = daeunExplain(M, ch, x, opt), st = STAGES[r.stage];
    return '<div class="us-det" style="' + vars(r.stage) + '"><div class="us-deth">' + icon(r.stage, 'us-ic-lg') + '<div><span class="us-dett">' + x.startAge + '~' + (x.startAge + 9) + '세 · ' + M.gzName(x) + ' 대운' + (cur ? ' · 현재' : '') + '</span><h4>' + r.stage + ' <small>' + st.h + '</small></h4><span class="us-kw">' + st.kw + ' · ' + PHASE_OF[r.stage].name + '</span></div></div>' +
      block('①', '기운의 상태', para(r.mean, E)) + block('②', '전통적 의미', para(r.trad, E)) + block('③', '원국과의 관계', '<ul>' + r.relation.map(function (t) { return '<li>' + E(t) + '</li>'; }).join('') + '</ul>') + block('④', '주의사항', para(r.care, E)) +
      (r.flow ? '<div class="us-flow"><span>운세 분석 엔진의 판정(12운성과 별개)</span><b>' + E(r.flow) + '</b></div>' : '') + '</div>';
  }
  // 운세 흐름 탭: 10개 대운 아이콘 타임라인 + 선택한 대운 설명
  function daeunHTML(M, ch, du, opt) {
    opt = opt || {}; var E = opt.esc || esc0, list = ch.daeun.list;
    var curI = list.indexOf(du), pick = opt.pick != null && list[opt.pick] ? opt.pick : (curI >= 0 ? curI : 0);
    var items = list.map(function (x, i) {
      var n = x.unseong, st = STAGES[n], cur = i === curI, on = i === pick;
      return '<li><button type="button" class="us-dc' + (on ? ' sel' : '') + (cur ? ' cur' : '') + '" data-act="us-du:' + i + '" aria-pressed="' + on + '"' + (cur ? ' aria-current="true"' : '') + ' style="' + vars(n) + '" aria-label="' + E(x.startAge + '세부터 ' + M.gzName(x) + ' 대운, ' + n + ', ' + st.kw + (cur ? ', 현재 대운' : '')) + '">' +
        (cur ? '<span class="us-now">현재</span>' : '') + '<span class="us-age">' + x.startAge + '~' + (x.startAge + 9) + '세</span>' + icon(n) + '<span class="us-nm">' + n + '</span><span class="us-gz">' + M.gzName(x) + '</span></button></li>';
    }).join('');
    var head = curI >= 0 ? '지금 대운 ' + M.gzName(du) + '(' + M.gzNameK(du) + ')' + jo(M.gzNameK(du), '은', '는') + ' ' + du.unseong + '(' + STAGES[du.unseong].kw + ') 단계입니다.' : '아직 첫 대운이 시작되기 전입니다.';
    return '<div class="us-box" data-us="daeun"><div class="card-h" style="margin:14px 0 4px"><h3>대운의 12운성 변화 <span class="lvl">12운성</span></h3></div>' +
      '<p class="small us-intro">10개의 대운에서 일간(나)의 기운이 생명주기의 어디를 지나는지 시간 순서로 보여 줍니다. ' + E(head) + ' 대운을 누르면 설명이 바뀝니다.</p>' +
      '<ol class="us-tl">' + items + '</ol>' +
      '<div class="us-live" aria-live="polite">' + detailDaeun(M, ch, list[pick], pick === curI, opt, E) + '</div>' +
      '<p class="note">' + E('12운성은 기운의 상태를 보여 줄 뿐 운세 점수나 길흉에 쓰이지 않습니다. 대운의 유불리는 위 막대(운세 분석 엔진)에서 따로 판단합니다. 대운은 일간 기준으로만 셉니다.') + '</p></div>';
  }
  // 용어 팝업: 단계 하나의 설명 + 내 사주에서 그 단계가 있는 자리
  function stageSheetHTML(M, ch, n, opt) {
    opt = opt || {}; var E = opt.esc || esc0, st = STAGES[n]; if (!st) return '';
    var where = function (mode) { return ch ? CARD_ORDER.filter(function (k) { return ch.cells[k] && (mode === 'jwa' ? ch.cells[k].unseongJwa : ch.cells[k].unseong) === n; }).map(function (k) { return PILLAR[k].lab; }) : []; };
    var b = where('bong'), j = where('jwa');
    var mine = ch ? '<p>봉법(일간 기준)으로 <b>' + (b.length ? b.join('·') : '없음') + '</b>, 좌법(각 기둥 천간 기준)으로 <b>' + (j.length ? j.join('·') : '없음') + '</b>입니다. 자리별 해석은 원국 탭의 \'내 사주의 12운성\' 카드에서 볼 수 있습니다.</p>' : '<p>사주를 입력하면 이 단계가 내 원국의 어느 자리에 있는지 함께 보여 드립니다.</p>';
    return '<div class="facts us-sheet" style="' + vars(n) + '"><div class="us-deth">' + icon(n, 'us-ic-lg') + '<div><span class="us-dett">12운성 · ' + PHASE_OF[n].name + ' 구간 · 그림: ' + st.motif + '</span><h4>' + n + ' <small>' + st.h + '</small></h4><span class="us-kw">' + st.kw + '</span></div></div>' +
      block('①', '단계의 의미', para(st.state, E)) + block('②', '전통적 해석', para(st.trad, E)) + block('③', '내 사주에서는', mine) + block('④', '주의사항', para(st.care + ' ' + CARE_NATAL, E)) + cycleStrip([n], E) + '</div>';
  }
  // 봉법·좌법 용어 팝업: 내 사주 네 자리를 작은 카드로
  function modeSheetHTML(M, ch, mode, opt) {
    opt = opt || {}; var E = opt.esc || esc0, jwa = mode === 'jwa';
    var head = jwa ? '각 기둥의 천간이 바로 아래 자기 지지에서 어떤 상태인지 봅니다.' : '일간(나) 하나를 기준으로 네 지지에서 기운이 어떤 상태인지 봅니다.';
    if (!ch) return '<div class="facts"><p class="small">' + head + '</p></div>';
    var mini = CARD_ORDER.filter(function (k) { return ch.cells[k]; }).map(function (k) { var c = ch.cells[k], n = jwa ? c.unseongJwa : c.unseong; return '<span class="us-mini" style="' + vars(n) + '">' + icon(n) + '<span>' + PILLAR[k].lab + (jwa ? ' ' + M.gzName(ch.pillars[k]) : '') + ' <b>' + n + '</b></span></span>'; }).join('');
    return '<div class="facts"><p class="small">' + head + ' 내 사주에서는 아래와 같습니다.</p><div class="us-minis">' + mini + '</div>' + (opt.diff || '') + '</div>';
  }

  G.MantraUnseong = { VERSION: VERSION, ORDER: ORDER, STAGES: STAGES, PHASES: PHASES, PHASE_OF: PHASE_OF, PILLAR: PILLAR, BASIS: BASIS, BR: BR, stageOf: stageOf, jo: jo,
    icon: icon, vars: vars, natalExplain: natalExplain, natalSummary: natalSummary, daeunExplain: daeunExplain, cycleStrip: cycleStrip,
    natalHTML: natalHTML, daeunHTML: daeunHTML, stageSheetHTML: stageSheetHTML, modeSheetHTML: modeSheetHTML };
})(typeof window !== 'undefined' ? window : globalThis);
