/* 시대 흐름(거시 시간) — 모든 사람에게 공통인 외부 환경의 기운. 2026-11-18
   · 기본 모델: 삼원구운(三元九運) — 1864년(甲子) 기준 20년 × 9운 = 180년, 입춘 경계. 계산은 공간·명당 엔진(fengshui-engine.js)의
     periodOfYear·yuanOfYear·periodRange·lichunYear 와 구성 표(fengshui-data.js STAR)를 그대로 불러 쓴다(중복 구현 없음).
   · 개인 정보(출생·원국·용신)를 받지 않는다. 같은 해면 모든 사람에게 같은 결과다. 개인과의 관계는 macro-era-bridge.js 가 따로 계산한다.
   · 오자원(五子元)·구성 공간대운은 원전 계산 규칙을 확인하지 못해 '연구 대기'(status: research)로 자리만 두고 결과를 내지 않는다.
     근거: docs/MACRO_ERA_RESEARCH_2026-11-18.md
   · 해석 문구는 층을 나눈다: tradition(전통 상징) · reading(시대 환경 해석 — 해석임을 밝힘). 현대 사회 현상 연결은 통계 근거가 없어 넣지 않는다.
   · 브라우저·Node 공용. 사용: MantraMacroEra.eraAt(연도 또는 {y,m,d}) / MantraMacroEra.timeline(시작연도, 끝연도) */
(function (G) {
  'use strict';
  var VERSION = 'macro-era-20261118-1';
  var F = function () { return G.MantraFengshui; }, FD = function () { return G.MantraFengshuiData; };
  var EL_K = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
  var GUA = { 1: '坎(감)', 2: '坤(곤)', 3: '震(진)', 4: '巽(손)', 5: '중궁(괘 없음)', 6: '乾(건)', 7: '兌(태)', 8: '艮(간)', 9: '離(리)' };
  var RANGE = [1864, 2103];   // 화면 지원 범위(공간·명당 엔진과 같음)

  // 이론 목록 — 다른 거시 이론을 같은 틀로 더할 수 있게. status: active(계산·표시) / research(근거 확인 전, 결과 없음)
  var THEORIES = {
    sanyuan: { id: 'sanyuan', name: '삼원구운(三元九運)', unit: '20년', status: 'active',
      basis: '현공풍수의 삼원구운: 1864년(甲子) 상원 1운 시작, 운마다 20년, 원마다 60년, 정원 180년. 운의 경계는 입춘. 구성·괘·오행 배속은 공간·명당 엔진과 같은 표.',
      caveats: ['교체 직후 몇 해는 이전 운의 기운이 남는다고 보는 견해(예: 9운 화 기운은 2026년 무렵부터 뚜렷하다는 주장)가 있으나 통설이 아니어서 계산에 쓰지 않는다.', '5운(오황)은 중궁이라 괘가 없어 앞 10년은 坤, 뒤 10년은 艮에 붙이는 유파가 있다. 오행은 어느 쪽이든 토(土)다.', '입춘 날짜 기준으로 계산한다. 입춘 시각 직전·직후는 경계 안내를 붙인다.'] },
    ojawon: { id: 'ojawon', name: '오자원(五子元)', unit: '12년(저자 설명)', status: 'research',
      basis: '문승현 『시간과 공간 융합연구서 구성 환경명리학』 등에서 소개(지지 중심 60갑자, 공통 심리 주기 12년). 원문 계산 규칙(토막 시작 기준·오행 배속·경계)을 확인하지 못해 결과를 내지 않는다.' },
    gongganDaeun: { id: 'gongganDaeun', name: '구성 공간대운', unit: '대삼원·소삼원(저자 설명)', status: 'research',
      basis: '문승현의 구성·간지 융합 공간대운 연구(목차 기준). 계산 규칙 미확인 — 결과를 내지 않는다.' }
  };

  // 오행별 시대 상징(전통 상징 / 시대 환경 해석) — 해석은 명리학적 상징 읽기이며, 오행이 사회 현상을 일으킨다는 뜻이 아니다
  var EL_TEXT = [
    { tradition: '목(木)은 뻗어 나가고 자라는 기운, 시작과 성장을 뜻해요.', reading: '새로 시작하고 넓혀 가는 일, 배우고 키우는 일에 관심이 모이기 쉬운 시대로 읽어요.', keys: ['성장', '시작', '교육', '확장'] },
    { tradition: '화(火)는 밝게 드러나고 퍼지는 기운, 빛·문명·표현을 뜻해요(9운 離卦는 밝음·의존·문채).', reading: '보이고 알려지는 것, 표현과 주목, 빠르게 퍼지는 흐름이 힘을 얻는 시대로 읽어요. 대신 쉽게 달아오르고 쉽게 식는 것도 화의 성질이에요.', keys: ['가시화', '표현', '확산', '속도'] },
    { tradition: '토(土)는 모으고 버티고 중재하는 기운, 터전과 신뢰를 뜻해요(8운 艮卦는 그침·산·축적).', reading: '쌓고 지키는 것, 땅·집·기반, 신뢰와 중재가 중요하게 여겨지는 시대로 읽어요.', keys: ['축적', '기반', '안정', '중재'] },
    { tradition: '금(金)은 자르고 정리하고 결단하는 기운, 규칙과 결실을 뜻해요(6운 乾·7운 兌).', reading: '기준과 구조, 효율과 정리, 결과를 매듭짓는 일이 앞에 서는 시대로 읽어요.', keys: ['정리', '기준', '결단', '결실'] },
    { tradition: '수(水)는 스며들고 모으고 흐르는 기운, 지혜와 소통·저장을 뜻해요(1운 坎卦는 물·험난·지혜).', reading: '정보와 흐름, 연결과 저장, 겉으로 드러나지 않게 깊어지는 일이 힘을 얻는 시대로 읽어요.', keys: ['흐름', '정보', '연결', '깊이'] }
  ];
  // 시대 사이 오행 관계(상생·상극은 관계일 뿐 좋고 나쁨이 아니다)
  var REL_K = { same: '같은 오행이 이어지는 전환', gen: '앞 시대의 오행이 다음 시대의 오행을 생하는 전환', genBy: '다음 시대의 오행이 앞 시대의 오행을 생하는 전환', ctl: '앞 시대의 오행이 다음 시대의 오행을 극하는 전환', ctlBy: '다음 시대의 오행이 앞 시대의 오행을 극하는 전환' };
  var mod5 = function (x) { return ((x % 5) + 5) % 5; };
  function relEl(a, b) { if (a === b) return 'same'; if (mod5(a + 1) === b) return 'gen'; if (mod5(b + 1) === a) return 'genBy'; if (mod5(a + 2) === b) return 'ctl'; return 'ctlBy'; }

  // 연도(입춘 기준) 또는 날짜 → 그해의 삼원구운
  function periodInfo(p, y0) {
    var Fe = F(), Fd = FD(); if (!Fe || !Fd) throw new Error('fengshui-engine.js·fengshui-data.js 를 먼저 불러오세요');
    var st = Fd.STAR[p], r = Fe.periodRange(p);
    // 지금 정원 밖(2044~)은 같은 운 번호의 다음 정원 연도로 옮긴다
    var shift = y0 != null ? Math.floor((y0 - 1864) / 180) * 180 : 0;
    var start = r[0] + shift, end = r[1] + shift;
    return { period: p, yuan: ['상원', '중원', '하원'][Math.floor((p - 1) / 3)], start: start, end: end, star: st.name, alias: st.alias, gua: GUA[p], el: st.el, elK: EL_K[st.el],
      tradition: EL_TEXT[st.el].tradition, reading: EL_TEXT[st.el].reading, keys: EL_TEXT[st.el].keys.slice() };
  }
  function eraAt(when) {
    var Fe = F(); if (!Fe) throw new Error('fengshui-engine.js 를 먼저 불러오세요');
    var y = typeof when === 'object' && when ? when.y : when, Y = typeof when === 'object' && when ? Fe.lichunYear(when.y, when.m, when.d) : y;
    if (!(Y >= RANGE[0] && Y <= RANGE[1])) return { supported: false, year: Y, range: RANGE.slice(), note: RANGE[0] + '~' + RANGE[1] + '년만 보여 줍니다.' };
    var p = Fe.periodOfYear(Y), cur = periodInfo(p, Y);
    var prevY = cur.start - 1, nextY = cur.end + 1;
    var prev = prevY >= RANGE[0] ? periodInfo(Fe.periodOfYear(prevY), prevY) : null, next = nextY <= RANGE[1] ? periodInfo(Fe.periodOfYear(nextY), nextY) : null;
    var warn = typeof when === 'object' && when && when.m === 2 && when.d >= 3 && when.d <= 5 ? '입춘(2월 4일 무렵) 전후라 운이 바뀌는 경계일 수 있어요. 입춘 시각을 확인해 주세요.' : null;
    return {
      supported: true, version: VERSION, theory: 'sanyuan', year: Y, era: cur, prev: prev, next: next,
      fromPrev: prev ? { rel: relEl(prev.el, cur.el), text: REL_K[relEl(prev.el, cur.el)] } : null,
      toNext: next ? { rel: relEl(cur.el, next.el), text: REL_K[relEl(cur.el, next.el)] } : null,
      yearsIn: Y - cur.start + 1, yearsLeft: cur.end - Y, boundaryWarn: warn,
      basis: THEORIES.sanyuan.basis, caveats: THEORIES.sanyuan.caveats.slice(), research: Object.keys(THEORIES).filter(function (k) { return THEORIES[k].status === 'research'; }).map(function (k) { return { id: k, name: THEORIES[k].name, note: THEORIES[k].basis }; })
    };
  }
  // 시간축: [from, to] 연도 사이의 운 목록(겹치는 운 전부)
  function timeline(from, to) {
    var Fe = F(); from = Math.max(RANGE[0], from || RANGE[0]); to = Math.min(RANGE[1], to || RANGE[1]);
    var out = [], y = from;
    while (y <= to) { var p = Fe.periodOfYear(y), e = periodInfo(p, y); out.push(e); y = e.end + 1; }
    return out;
  }

  var api = { version: VERSION, THEORIES: THEORIES, EL_TEXT: EL_TEXT, RANGE: RANGE, relEl: relEl, eraAt: eraAt, timeline: timeline };
  G.MantraMacroEra = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
