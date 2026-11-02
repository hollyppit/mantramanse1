/* 지역 방위오행 × 개인 사주 해석 — 데이터 계층: 규칙 기본값(RULES)·조건 키·사전 문구(PH).
   · 계산은 region-reading.js 가 한다. 여기에는 수치 규칙과 문구만 있고, 둘 다 관리자 화면에서 코드 수정 없이 바꿀 수 있다(functions/api/region-reading.js).
   · 문구 형식: id · sec('R') · cx · role · tag(같은 tag는 하나만 선택) · when(모두 만족) · unless(하나라도 맞으면 제외) · basis(명리학적 근거) · pri · text · v · on
   · 문구 안에서는 {자리표시자}를 쓴다(허용 목록: PLACEHOLDERS). 조사 문제를 피하려고 오행 뒤에는 늘 “기운”을 붙여 쓴다. */
(function (G) {
  'use strict';
  var D = G.MantraRegionReadingData = G.MantraRegionReadingData || {};
  D.VERSION = 'region-reading-20261102-1';
  D.PH = [];

  // 해석 규칙(수치). min·max 는 관리자 입력 범위. 의미를 바꾸는 값이라 바꾸면 해석이 달라진다.
  D.RULES = [
    { id: 'lackPct', v: 10, min: 3, max: 20, label: '부족 오행 기준(%)', desc: '원국에서 이 비율 미만이면 “부족”으로 봅니다. 부족하다고 해서 채우는 것이 좋다는 뜻은 아닙니다.' },
    { id: 'overPct', v: 30, min: 22, max: 45, label: '과다 오행 기준(%)', desc: '이 비율 이상이면 “이미 많음”으로 봅니다.' },
    { id: 'minSev', v: 0.35, min: 0, max: 0.8, label: '억부 최소 반영도', desc: '강약이 중화에 가까워도 억부 판단을 이 비율만큼은 반영합니다(0~1).' },
    { id: 'wRel', v: 0.4, min: 0, max: 1, label: '상생상극 연쇄 가중', desc: '방위 오행이 키우는 기운·누르는 기운이 이 사주에 좋은지 나쁜지의 반영 비중.' },
    { id: 'wClimate', v: 0.8, min: 0, max: 2, label: '한난조습 개선 가중', desc: '방위 오행이 원국의 더위·추위·건조·습함을 얼마나 바로잡는지의 반영 비중.' },
    { id: 'climateStep', v: 0.6, min: 0.2, max: 1.2, label: '한난조습 이동 폭', desc: '방위 오행 하나가 원국의 한난·조습 지표를 움직이는 정도(엔진의 −2~+2 지표 기준).' },
    { id: 'seasonBoost', v: 1.15, min: 1, max: 1.5, label: '월령 왕·상 배율', desc: '태어난 달에 힘이 센 오행(旺·相)의 작용을 키우는 배율.' },
    { id: 'seasonDamp', v: 0.8, min: 0.4, max: 1, label: '월령 수·사 배율', desc: '태어난 달에 힘이 약한 오행(囚·死)의 작용을 줄이는 배율.' },
    { id: 'conflictMin', v: 0.3, min: 0.1, max: 1.5, label: '억부·조후 충돌 최소 강도', desc: '억부와 조후의 역할이 반대(도움 vs 부담)이고 두 판단 강도가 모두 이 값 이상일 때 “충돌”로 봅니다. 강도는 신강·신약 정도와 기후 치우침 정도를 반영한 값입니다.' },
    { id: 'prioMargin', v: 0.15, min: 0, max: 0.5, label: '우선순위 판정 여유', desc: '충돌할 때 조후·억부의 급한 정도 차이가 이보다 작으면 어느 쪽도 앞세우지 않고 “갈림”으로 봅니다.' },
    { id: 'toneGood', v: 1.2, min: 0.6, max: 2.5, label: '“맞는 편” 기준', desc: '종합 점수가 이 값 이상이면 맞는 편, 이 값의 음수 이하면 맞지 않는 편으로 읽습니다.' },
    { id: 'toneMild', v: 0.5, min: 0.2, max: 1.2, label: '“약하게” 기준', desc: '종합 점수가 이 값 이상이면 약하게 맞는 편(음수면 약하게 맞지 않는 편).' },
  ];

  D.PLACEHOLDERS = ['region', 'dir', 'dirWord', 'deg', 'ref', 'el', 'grpName', 'genEl', 'ctlEl', 'season', 'seasonEl', 'roleE', 'roleJ', 'climWord', 'zoneWord', 'altDir', 'altEl', 'verdictWord'];

  D.FACT_KEYS = [
    ['el', '목·화·토·금·수', '지역의 방위오행(기준점에서 본 실제 방위각 → 8방위 → 후천팔괘 오행)'],
    ['grp', 'bi·sik·jae·gwan·in', '일간 기준으로 그 오행이 어느 십성 묶음인가(비겁·식상·재성·관성·인성)'],
    ['zone', 'xweak·weak·mid·strong·xstrong', '신강·신약 구간(>= <= 비교 가능)'],
    ['eok · johu', 'yong·hee·han·gu·gi·none', '그 오행의 억부 역할 / 조후 역할(조후 해당 없으면 none)'],
    ['johu.app', 'yes·no', '이 사주에 조후 용신이 세워지는가'],
    ['differ', 'yes·no', '억부 용신과 조후 용신의 오행이 다른가'],
    ['verdict', 'eokbu·johu·both', '엔진 판정(methodAdvice): 억부 우선·조후 우선·병행'],
    ['prio', 'eokbu·johu·both', '충돌 시 앞세운 기준(both = 어느 쪽도 앞세우지 않음)'],
    ['conflict', 'yes·no', '억부와 조후가 반대로 판단하고 둘 다 강한가'],
    ['ctemp · chum', 'hot·cold·none / dry·wet·none', '원국이 더운지·추운지, 건조한지·습한지'],
    ['improve · worsen', 'temp·hum·both·none', '이 방위 오행이 원국의 한난·조습을 바로잡는지 / 더 키우는지'],
    ['mstate', 'wang·sang·hyu·su·sa', '태어난 달(월령)에서 그 오행의 상태: 旺·相·休·囚·死'],
    ['season', 'spring·summer·autumn·winter·trans', '태어난 달의 계절(환절=辰未戌丑)'],
    ['lack', 'absent·low·ok·over', '원국에서 그 오행의 양(없음·부족·적정·과다)'],
    ['feeds', 'good·bad·none', '그 오행이 키우는(생하는) 다음 오행이 이 사주에 좋은지/나쁜지'],
    ['ctl', 'helps·harms·none', '그 오행이 누르는(극하는) 오행이 부담이면 helps, 용신·희신이면 harms'],
    ['src', 'rooted·none', '그 오행을 낳아 주는 오행(모)이 원국에 있는지'],
    ['sup', 'suppressed·none', '그 오행을 누르는 오행이 원국에 과다한지'],
    ['lackbad', 'yes·no', '원국에 부족한 오행이지만 채우면 오히려 부담인 경우'],
    ['already', 'yes·no', '이미 많은 오행인데 용신·희신 역할인 경우(더 채울 필요가 적음)'],
    ['tone', 'good·mildgood·neutral·mixed·mildcaution·caution', '종합 판정'],
    ['near · center', 'yes·no', '방위 경계에 가까움 / 기준점에 가까워 중앙으로 봄'],
  ];
  D.TONE_LABEL = { good: '맞는 편', mildgood: '약하게 맞는 편', neutral: '특별한 영향 없음', mixed: '기준이 갈림', mildcaution: '약하게 맞지 않는 편', caution: '맞지 않는 편' };

  D.add = function (role, text, o) {
    o = o || {};
    D.PH.push({ id: 'R.' + role + (o.n ? '.' + o.n : ''), sec: 'R', cx: 'all', role: role, tag: o.tag || role, when: o.when || [], unless: o.unless || [], basis: o.basis || '', pri: o.pri || 1, text: text, v: 1, on: o.on !== false });
  };
  var add = D.add;

  // ───────────── 방위 설명 ─────────────
  add('dir', '{ref}에서 {region}까지의 방위각은 약 {deg}°로 {dirWord}입니다. 후천팔괘 기준으로 {dirWord}은 {el} 기운에 대응합니다.', { basis: '실제 방위각 → 8방위 → 후천팔괘 오행', unless: ['center=yes'] });
  add('dir', '{region}은 {ref}과 가까워 방향을 가르기 어려운 중앙으로 보며, 중앙은 토(土) 기운에 대응합니다.', { n: 'center', pri: 3, when: ['center=yes'], basis: '중앙=土' });
  add('caveat', '방위각이 {dir}과 {altDir}의 경계에 가깝습니다. 좌표를 잡는 방식에 따라 {altDir}쪽({altEl} 기운)으로도 읽힐 수 있어, 이 결과는 가볍게 참고하세요.', { n: 'near', when: ['near=yes'] });
  add('caveat', '방위오행은 전통적인 상징 해석이며 그 지역의 실제 오행량이 아닙니다. 원국에 더해지거나 용신을 바꾸지 않고, 이사·이직 같은 결정은 직장·가족·비용 같은 실제 조건이 훨씬 중요합니다.', { n: 'general' });

  // ───────────── 십성 의미 (그 방위 기운이 나에게 어떤 기운인가) ─────────────
  var G = function (grp, base, weak, strong) {
    add('grp', base, { n: grp, tag: 'grp', when: ['grp=' + grp], basis: '일간 기준 십성 묶음' });
    add('grp', weak, { n: grp + '.weak', tag: 'grp', pri: 2, when: ['grp=' + grp, 'zone<=weak'], basis: '신약' });
    add('grp', strong, { n: grp + '.strong', tag: 'grp', pri: 2, when: ['grp=' + grp, 'zone>=strong'], basis: '신강' });
  };
  G('bi', '{el} 기운은 이 사주의 일간과 같은 기운(비겁)이라 자립심·동료·경쟁과 연결되는 방향입니다.', '{el} 기운은 일간과 같은 기운(비겁)이고, 일간이 약한 사주라 힘을 보태는 동료·자기 기반의 의미가 큽니다.', '{el} 기운은 일간과 같은 기운(비겁)인데, 일간이 이미 강한 사주라 고집·경쟁·분산이 커지는 쪽으로 읽힙니다.');
  G('sik', '{el} 기운은 일간이 낳는 기운(식상)이라 표현·활동·결과물을 만드는 일과 연결되는 방향입니다.', '{el} 기운은 일간이 낳는 기운(식상)인데, 일간이 약한 사주라 기운을 내보내는 만큼 지칠 수 있는 방향입니다.', '{el} 기운은 일간이 낳는 기운(식상)이고, 일간이 강한 사주라 남는 힘을 표현·활동으로 풀어 주는 방향입니다.');
  G('jae', '{el} 기운은 일간이 극하는 기운(재성)이라 재물·현실·실무와 연결되는 방향입니다.', '{el} 기운은 일간이 극하는 기운(재성)인데, 일간이 약한 사주라 현실의 몫이 부담으로 느껴질 수 있는 방향입니다.', '{el} 기운은 일간이 극하는 기운(재성)이고, 일간이 강한 사주라 재물·현실을 감당할 힘이 있는 방향입니다.');
  G('gwan', '{el} 기운은 일간을 극하는 기운(관성)이라 규율·책임·직장과 연결되는 방향입니다.', '{el} 기운은 일간을 극하는 기운(관성)인데, 일간이 약한 사주라 압박과 책임이 무겁게 느껴질 수 있는 방향입니다.', '{el} 기운은 일간을 극하는 기운(관성)이고, 일간이 강한 사주라 규율과 책임이 오히려 균형을 잡아 주는 방향입니다.');
  G('in', '{el} 기운은 일간을 생해 주는 기운(인성)이라 배움·보호·안정과 연결되는 방향입니다.', '{el} 기운은 일간을 생해 주는 기운(인성)이고, 일간이 약한 사주라 도움과 안정을 받는 의미가 큰 방향입니다.', '{el} 기운은 일간을 생해 주는 기운(인성)인데, 일간이 이미 강한 사주라 도움이 더 얹혀 답답함·의존으로 흐를 수 있는 방향입니다.');

  // ───────────── 억부 ─────────────
  var E = function (role, text, o) { add('eok', text, Object.assign({ n: role, tag: 'eok', when: ['eok=' + role], basis: '억부 용희신' }, o || {})); };
  E('yong', '억부 기준으로 {el} 기운은 용신입니다. {zoneWord} 사주의 균형을 맞추는 데 가장 도움이 되는 기운입니다.');
  E('hee', '억부 기준으로 {el} 기운은 희신입니다. 용신을 거들어 균형을 돕는 기운입니다.');
  E('han', '억부 기준으로 {el} 기운은 한신입니다. 균형에 뚜렷한 도움도 부담도 주지 않는 기운입니다.');
  E('gu', '억부 기준으로 {el} 기운은 구신입니다. 기신을 거들어 균형을 흐트러뜨릴 수 있는 기운입니다.');
  E('gi', '억부 기준으로 {el} 기운은 기신입니다. {zoneWord} 사주의 균형을 가장 흐트러뜨리기 쉬운 기운입니다.');

  // ───────────── 조후 ─────────────
  var J = function (role, text, o) { add('johu', text, Object.assign({ n: role, tag: 'johu', when: ['johu.app=yes', 'johu=' + role], basis: '조후 용희신' }, o || {})); };
  J('yong', '조후 기준으로 {el} 기운은 용신입니다. {season}에 태어나 {climWord} 쪽으로 치우친 원국의 기후를 맞춰 주는 기운입니다.');
  J('hee', '조후 기준으로 {el} 기운은 희신입니다. 조후 용신을 거들어 치우친 기후를 누그러뜨리는 기운입니다.');
  J('han', '조후 기준으로 {el} 기운은 한신입니다. 치우친 기후를 맞추는 데 뚜렷한 도움도 부담도 주지 않습니다.');
  J('gu', '조후 기준으로 {el} 기운은 구신입니다. 치우친 기후를 더 키우는 쪽으로 작용하기 쉽습니다.');
  J('gi', '조후 기준으로 {el} 기운은 기신입니다. {season}에 {climWord} 쪽으로 치우친 원국의 기후를 더 키울 수 있는 기운입니다.');
  add('johu', '이 사주는 한난조습이 크게 치우치지 않아 조후 용신을 따로 세우지 않습니다. 이 방향은 강약 균형(억부)을 중심으로 읽습니다.', { n: 'na', when: ['johu.app=no'], basis: '조후 해당 없음' });
  add('climate', '이 방향의 기운은 원국의 {climWord} 치우침을 실제로 누그러뜨리는 쪽(한난조습 개선)입니다.', { n: 'improve', when: ['improve!=none'], basis: '한난조습 이동' });
  add('climate', '이 방향의 기운은 원국의 {climWord} 치우침을 오히려 키우는 쪽(한난조습 악화)입니다.', { n: 'worsen', when: ['worsen!=none'], basis: '한난조습 이동' });

  // ───────────── 월령(태어난 달에서의 힘) ─────────────
  var Mo = function (st, text) { add('month', text, { n: st, tag: 'month', when: ['mstate=' + st], basis: '월령 旺相休囚死' }); };
  Mo('wang', '{season}(월령 {seasonEl})에 태어나 {el} 기운은 가장 힘이 센 상태(旺)입니다. 이 기운의 작용은 좋든 나쁘든 분명하게 나타납니다.');
  Mo('sang', '{season}(월령 {seasonEl})에 태어나 {el} 기운은 힘이 오르는 상태(相)입니다. 작용이 비교적 뚜렷합니다.');
  Mo('hyu', '{season}(월령 {seasonEl})에 태어나 {el} 기운은 힘을 쉬는 상태(休)입니다. 작용은 보통 수준입니다.');
  Mo('su', '{season}(월령 {seasonEl})에 태어나 {el} 기운은 힘이 눌린 상태(囚)입니다. 작용이 약해 체감이 크지 않을 수 있습니다.');
  Mo('sa', '{season}(월령 {seasonEl})에 태어나 {el} 기운은 힘이 가장 약한 상태(死)입니다. 작용이 약해 체감이 크지 않을 수 있습니다.');

  // ───────────── 원국에서 그 오행의 양 ─────────────
  add('lack', '원국에는 {el} 기운이 거의 없거나 부족합니다. 다만 부족하다고 해서 채우는 것이 곧 좋은 것은 아니며, 이 사주에서 그 기운이 용신·희신인지가 먼저입니다.', { n: 'low', tag: 'lack', when: ['lack=absent|low'], basis: '부족≠필요' });
  add('lack', '원국에는 {el} 기운이 이미 많은 편입니다. 많은 기운에 같은 기운이 더해지면 쏠림이 커질 수 있습니다.', { n: 'over', tag: 'lack', when: ['lack=over'], basis: '과다' });
  add('lack', '원국의 {el} 기운은 적당한 편이라 방향의 영향이 크게 쏠리지 않습니다.', { n: 'ok', tag: 'lack', pri: 0.5, when: ['lack=ok'], basis: '적정' });
  add('lack', '원국에 부족한 {el} 기운이지만, 이 사주에서는 채울수록 균형을 흐트러뜨릴 수 있는 기운입니다. 부족하다는 이유만으로 이 방향을 좋게 보지 않습니다.', { n: 'lackbad', tag: 'lack', pri: 3, when: ['lackbad=yes'], basis: '부족≠필요' });
  add('lack', '원국에 이미 {el} 기운이 많아, 용신·희신이어도 더 채울 필요는 적습니다. 이 방향은 도움이 되더라도 효과가 크지 않을 수 있습니다.', { n: 'already', tag: 'lack', pri: 3, when: ['already=yes'], basis: '과다한 용희신' });

  // ───────────── 상생상극 연쇄 ─────────────
  add('flow', '{el} 기운은 {genEl} 기운을 키웁니다(상생). 이 사주에서 {genEl} 기운은 도움이 되는 쪽이라 좋은 흐름으로 이어집니다.', { n: 'feeds.good', tag: 'flow.feeds', when: ['feeds=good'], basis: '상생' });
  add('flow', '{el} 기운은 {genEl} 기운을 키웁니다(상생). 이 사주에서 {genEl} 기운은 부담이 되는 쪽이라 부담이 함께 커질 수 있습니다.', { n: 'feeds.bad', tag: 'flow.feeds', when: ['feeds=bad'], basis: '상생' });
  add('flow', '{el} 기운은 {ctlEl} 기운을 누릅니다(상극). 이 사주에서 {ctlEl} 기운은 부담이 되는 쪽이라 부담을 덜어 주는 작용이 있습니다.', { n: 'ctl.helps', tag: 'flow.ctl', when: ['ctl=helps'], basis: '상극(제화)' });
  add('flow', '{el} 기운은 {ctlEl} 기운을 누릅니다(상극). 이 사주에서 {ctlEl} 기운은 용신·희신 쪽이라 도움이 되는 힘을 깎을 수 있습니다.', { n: 'ctl.harms', tag: 'flow.ctl', when: ['ctl=harms'], basis: '상극(손상)' });
  add('flow', '이 사주에는 {el} 기운을 낳아 주는 기운이 있어 {el} 기운이 힘을 얻기 쉬운 구조입니다. 그만큼 이 방향의 작용은 좋은 쪽이든 부담이 되는 쪽이든 이어지기 쉽습니다.', { n: 'src.rooted', tag: 'flow.src', pri: 0.8, when: ['src=rooted'], basis: '인수(모)' });
  add('flow', '이 사주에는 {el} 기운을 누르는 기운이 많아 {el} 기운의 작용이 눌릴 수 있습니다.', { n: 'sup', tag: 'flow.sup', pri: 0.8, when: ['sup=suppressed'], basis: '극제' });

  // ───────────── 유리한 점 / 불리한 점 ─────────────
  var Pro = function (n, t, when, o) { add('pro', t, Object.assign({ n: n, tag: 'pro.' + n, when: when, basis: '유리' }, o || {})); };
  var Con = function (n, t, when, o) { add('con', t, Object.assign({ n: n, tag: 'con.' + n, when: when, basis: '불리' }, o || {})); };
  Pro('eok', '강약의 균형을 맞추는 데 도움이 되는 방향입니다(억부 {roleE}).', ['eok=yong|hee']);
  Pro('johu', '치우친 기후(한난조습)를 맞추는 데 도움이 되는 방향입니다(조후 {roleJ}).', ['johu.app=yes', 'johu=yong|hee']);
  Pro('climate', '원국의 더위·추위·건조·습함을 실제로 누그러뜨리는 방향이라 심리적·체감상 편안함을 기대해 볼 수 있습니다.', ['improve!=none', 'worsen=none']);
  Pro('ctl', '이 사주의 부담이 되는 기운을 눌러 주는 흐름이 있습니다.', ['ctl=helps']);
  Pro('feeds', '용신·희신 쪽 기운을 키워 주는 흐름이 있습니다.', ['feeds=good']);
  Pro('season', '태어난 달에 힘이 센 기운이라 좋은 작용이 비교적 분명하게 나타납니다.', ['mstate=wang|sang', 'tone=good|mildgood']);
  Pro('lack', '원국에 부족한 기운이면서 용신·희신이라 채울 가치가 있는 방향입니다.', ['lack=absent|low', 'eok=yong|hee', 'lackbad=no']);
  Pro('grp.gwan', '규율·책임을 감당할 힘이 있는 사주라 이 방향의 긴장감이 성장의 자극이 될 수 있습니다.', ['grp=gwan', 'zone>=strong']);
  Pro('grp.in', '배움·안정·도움을 받기 좋은 환경으로 이어질 수 있습니다.', ['grp=in', 'zone<=weak']);
  Pro('grp.sik', '남는 힘을 표현·활동으로 풀어 줄 수 있는 환경입니다.', ['grp=sik', 'zone>=strong']);
  Pro('grp.jae', '현실적인 일과 재물을 다루는 힘이 받쳐 주는 환경입니다.', ['grp=jae', 'zone>=strong']);
  Pro('grp.bi', '기댈 수 있는 동료·기반을 만들기 좋은 환경입니다.', ['grp=bi', 'zone<=weak']);
  Con('eok', '강약의 균형을 흐트러뜨릴 수 있는 방향입니다(억부 {roleE}).', ['eok=gu|gi']);
  Con('johu', '치우친 기후(한난조습)를 더 키울 수 있는 방향입니다(조후 {roleJ}).', ['johu.app=yes', 'johu=gu|gi']);
  Con('climate', '원국의 더위·추위·건조·습함을 더 키우는 방향이라 체감상 불편함이 커질 수 있습니다.', ['worsen!=none']);
  Con('ctl', '용신·희신 쪽 기운을 눌러 도움이 되는 힘이 줄어들 수 있습니다.', ['ctl=harms']);
  Con('feeds', '부담이 되는 기운을 키워 주는 흐름이 있습니다.', ['feeds=bad']);
  Con('season', '태어난 달에 힘이 약한 기운이라 좋은 작용이 있어도 체감은 크지 않을 수 있습니다.', ['mstate=su|sa', 'tone=good|mildgood']);
  Con('over', '이미 많은 기운이 더해져 쏠림이 커질 수 있습니다.', ['lack=over', 'eok!=yong|hee']);
  Con('already', '이미 많은 기운이라 도움이 되는 방향이어도 추가 효과는 크지 않을 수 있습니다.', ['already=yes']);
  Con('lackbad', '원국에 부족해 보여도 채울수록 부담이 되는 기운이라, 부족하다는 이유로 이 방향을 택하면 오히려 불리할 수 있습니다.', ['lackbad=yes']);
  Con('grp.gwan', '압박·책임이 무겁게 느껴질 수 있는 환경입니다.', ['grp=gwan', 'zone<=weak']);
  Con('grp.in', '도움이 이미 충분한 사주라 의존·정체로 흐를 수 있는 환경입니다.', ['grp=in', 'zone>=strong']);
  Con('grp.sik', '기운을 쏟는 만큼 쉽게 지칠 수 있는 환경입니다.', ['grp=sik', 'zone<=weak']);
  Con('grp.jae', '현실의 부담이 힘에 부칠 수 있는 환경입니다.', ['grp=jae', 'zone<=weak']);
  Con('grp.bi', '고집·경쟁이 커지기 쉬운 환경입니다.', ['grp=bi', 'zone>=strong']);
  add('pro', '뚜렷하게 유리한 요소는 확인되지 않습니다.', { n: 'none', tag: 'pro.none', pri: 0.1, basis: '유리 없음' });
  add('con', '뚜렷하게 불리한 요소는 확인되지 않습니다.', { n: 'none', tag: 'con.none', pri: 0.1, basis: '불리 없음' });

  // ───────────── 억부·조후 충돌 ─────────────
  var C = function (n, when, text) { add('conflict', text, { n: n, tag: 'conflict', when: ['conflict=yes'].concat(when), basis: '억부·조후 충돌' }); };
  C('e_good_j_bad.johu', ['eok=yong|hee', 'johu=gu|gi', 'prio=johu'], '억부로는 {el} 기운이 균형을 돕지만 조후로는 {season}에 치우친 {climWord} 기후를 더 키웁니다. 이 사주는 기후의 치우침이 더 급해 조후를 앞세워 읽으므로, 억부상의 도움은 있어도 불편함이 먼저 느껴질 수 있습니다.');
  C('e_good_j_bad.eokbu', ['eok=yong|hee', 'johu=gu|gi', 'prio=eokbu'], '억부로는 {el} 기운이 균형을 돕지만 조후로는 치우친 기후를 더 키웁니다. 이 사주는 강약 치우침이 더 커 억부를 앞세워 읽으므로, 기후상의 불편함은 있어도 균형 면의 도움이 더 크게 작용합니다.');
  C('e_bad_j_good.johu', ['eok=gu|gi', 'johu=yong|hee', 'prio=johu'], '조후로는 {el} 기운이 {season}에 치우친 {climWord} 기후를 맞춰 주지만 억부로는 균형을 흐트러뜨립니다. 이 사주는 기후의 치우침이 더 급해 조후를 앞세워 읽으므로, 억부상의 부담은 있어도 기후를 맞추는 이점이 더 크게 작용합니다.');
  C('e_bad_j_good.eokbu', ['eok=gu|gi', 'johu=yong|hee', 'prio=eokbu'], '조후로는 {el} 기운이 치우친 기후를 맞춰 주지만 억부로는 균형을 흐트러뜨립니다. 이 사주는 강약 치우침이 더 커 억부를 앞세워 읽으므로, 기후 면의 이점이 있어도 균형의 부담이 더 크게 작용합니다.');
  C('both.good_bad', ['eok=yong|hee', 'johu=gu|gi', 'prio=both'], '억부로는 도움이 되고 조후로는 부담이 되는 방향인데, 두 기준의 급한 정도가 비슷해 어느 쪽도 앞세우지 않았습니다. 한쪽에서는 맞고 다른 쪽에서는 맞지 않는 편이니 참고로만 보세요.');
  C('both.bad_good', ['eok=gu|gi', 'johu=yong|hee', 'prio=both'], '조후로는 도움이 되고 억부로는 부담이 되는 방향인데, 두 기준의 급한 정도가 비슷해 어느 쪽도 앞세우지 않았습니다. 한쪽에서는 맞고 다른 쪽에서는 맞지 않는 편이니 참고로만 보세요.');
  add('conflict', '억부와 조후가 같은 방향을 가리켜 두 기준이 부딪히지 않습니다.', { n: 'agree', tag: 'conflict', when: ['conflict=no', 'differ=no', 'johu.app=yes', 'eok=yong|hee|gu|gi'], basis: '억부·조후 일치', pri: 0.5 });

  // ───────────── 종합 ─────────────
  var H = function (tone, head, text) { add('headline', head, { n: tone, tag: 'headline', when: ['tone=' + tone] }); add('overall', text, { n: tone, tag: 'overall', when: ['tone=' + tone] }); };
  H('good', '이 사주에는 맞는 편인 방향입니다', '{region}({dirWord}, {el} 기운)은 이 사주에서 균형과 기후를 함께 돕는 쪽으로 읽힙니다. 전통 해석상 유리한 방향이지만 직장·가족·비용 같은 실제 조건을 먼저 따져 보세요.');
  H('mildgood', '약하게 맞는 편인 방향입니다', '{region}({dirWord}, {el} 기운)은 이 사주에 도움이 되는 요소가 있지만 크게 두드러지지는 않습니다. 참고 정도로 보시고, 실제 생활 조건을 우선하세요.');
  H('neutral', '특별한 영향이 크지 않은 방향입니다', '{region}({dirWord}, {el} 기운)은 이 사주에서 뚜렷한 도움도 부담도 읽히지 않습니다. 방위보다 실제 생활 조건이 선택의 기준이 됩니다.');
  H('mixed', '기준이 갈리는 방향입니다', '{region}({dirWord}, {el} 기운)은 억부와 조후가 서로 다르게 읽혀 한쪽에서는 맞고 다른 쪽에서는 맞지 않습니다. 어느 쪽도 압도하지 않아 참고로만 보세요.');
  H('mildcaution', '약하게 맞지 않는 편인 방향입니다', '{region}({dirWord}, {el} 기운)은 이 사주에서 부담이 되는 요소가 있지만 크지는 않습니다. 방위보다 실제 생활 조건을 우선하고, 걱정이 된다면 위의 불리한 점을 참고하세요.');
  H('caution', '이 사주에는 맞지 않는 편인 방향입니다', '{region}({dirWord}, {el} 기운)은 이 사주에서 균형이나 기후를 흐트러뜨리는 쪽으로 읽힙니다. 전통 해석일 뿐 정해진 결과는 아니니, 불리한 점을 알고 생활 조건으로 보완하는 정도로 참고하세요.');
  add('overall', '억부와 조후가 부딪히는 사주라 방향의 해석이 한쪽으로 단순하지 않습니다. 위의 충돌 이유를 함께 보고, 실제 생활 조건을 우선하세요.', { n: 'conflictnote', tag: 'overall.conflict', pri: 0.9, when: ['conflict=yes', 'prio!=both'], basis: '충돌 안내' });
})(typeof window !== 'undefined' ? window : globalThis);
