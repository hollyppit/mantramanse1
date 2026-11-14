/* 나이대에 맞지 않는 문장 걸러내기(2026-11-15, 챕터 고도화 1묶음) — 운명의 타임라인 본문·깊이 풀이·포인트 블록이 함께 쓴다.
   · 만 20세 미만: 어른 생활 낱말(직장·상사·연봉·배우자·투자…)이 '지금 겪는 일'처럼 말하는 문장(실제 생활에서는·요즘·평소·이미·자주·~있지 않나요·~했을 거예요)을 뺀다.
     어른 낱말이 있어도 '앞으로·나중에·어른이 되면'처럼 미래로 말하거나 부정·면책 문장이면 남긴다.
   · 만 65세 이상: 취업 준비·입사·신입·승진·이직 준비·출산·육아·첫 연애처럼 지금 나이에 어색한 장면 문장을 뺀다.
   · 기준 낱말은 감사 도구(tools/timeline-chapter-audit.cjs)의 ADULT·NOW_EXP·SENIOR_ODD 와 같다. 문단이 통째로 비면 호출한 쪽이 대체 문장을 넣는다.
   · 표시 전용: 계산·점수·DB 문안은 바꾸지 않고 화면에 보이는 문장만 고른다. 검사: tests/age-fit-sim.cjs */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var ADULT = /회사|직장|출근|퇴근|연봉|이직|퇴사|승진|상사|동료|부서|창업|대출|월급|결혼 생활|결혼생활|배우자|남편|아내|부부|시댁|처가|육아|전세|투자|거래처|팀장|월세|집값|카드값|은퇴|노후/;
  var NOW_EXP = /실제 생활에서는|요즘|평소|지금도|이미|매번|자주|늘 |적 있지 않나요|있지 않나요|하고 있을|하고 있지|있을 거예요|했을 거예요|었을 거예요|았을 거예요|봤을 거예요|왔을 거예요|적이 있|해 왔|해 봤/;
  var SENIOR_ODD = /취업 준비|입사|(?<![가-힣])신입|첫 직장|구직|승진|커리어를 쌓|출산|임신을|임신이|육아|첫 연애|연애를 시작|결혼 상대를 찾|이직 준비|스펙/;
  var NEGATED = /뜻하지 않|않고|아니며|아닙니다|아니에요|않습니다|보지 않|확인한 결과는|예측하지|아니라/;
  var FUTURE = /앞으로|나중에|어른이 되면|사회에 나가|일을 시작하면|일을 하게 되면|커서|훗날/;
  var cur = null;   // viewer 가 정해 둔 지금 독자의 생년(sd.birth)
  function set(sd) { cur = sd && sd.birth ? { birth: sd.birth, nowYear: sd.nowYear } : null; }
  function ageOf(sd, now) {
    var b = sd && sd.birth || cur && cur.birth; if (!b || !b.solarY) return null;
    var d = new Date(now || Date.now()), y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
    var a = y - b.solarY; if (b.solarM && (m < b.solarM || m === b.solarM && b.solarD && dd < b.solarD)) a--;
    return a;
  }
  function band(sd, now) { var a = ageOf(sd, now); return a == null ? '' : a < 20 ? 'young' : a >= 65 ? 'senior' : ''; }
  function odd(s, b) {
    if (!b || NEGATED.test(s)) return false;
    if (b === 'young') return ADULT.test(s) && NOW_EXP.test(s) && !FUTURE.test(s);
    if (b === 'senior') return SENIOR_ODD.test(s);
    return false;
  }
  var split = function (t) { return String(t || '').split(/(?<=[.!?。])\s+/); };
  // 문단 하나: 어색한 문장만 빼고 나머지를 이어 붙인다(문단 사이 빈 줄은 지킨다)
  function text(t, b) {
    if (!b || !t) return t || '';
    return String(t).split(/\n{2,}/).map(function (p) { return split(p).filter(function (s) { return !odd(s, b); }).join(' ').trim(); }).filter(Boolean).join('\n\n');
  }
  function hits(t, b) { return split(t).filter(function (s) { return odd(s, b); }); }
  // 나이대별 대체 문장: 문단이 통째로 빠졌을 때 쓰는, 지금 나이에서 확인할 수 있는 장면(주제별)
  var FILL = {
    young: {
      self: '지금 나이에서는 학교나 친구 사이, 가족과 지내는 모습에서 이 성향이 먼저 보여요. 비슷한 버릇이 있는지 떠올려 보세요.',
      wealth: '지금 나이에서는 용돈이나 아르바이트 돈을 모으고 쓰는 방식에서 이 결이 먼저 보여요. 이번 달 쓴 돈을 한 번 적어 보세요.',
      career: '지금 나이에서는 공부하는 방식이나 동아리·모둠 활동에서 맡는 역할에 이 결이 먼저 보여요. 내가 자주 맡는 역할을 떠올려 보세요.',
      love: '지금 나이에서는 친구 사이나 좋아하는 사람 앞에서의 모습에 이 결이 먼저 보여요. 마음을 표현하는 내 방식을 떠올려 보세요.',
    },
    senior: {
      self: '지금 나이에서는 가족·이웃과 지내는 방식과 하루를 쓰는 습관에서 이 성향이 드러나요.',
      wealth: '지금 나이에서는 모아 둔 것을 지키고 나누는 방식, 생활비를 꾸리는 습관에서 이 결이 드러나요.',
      career: '지금 나이에서는 맡고 있는 역할(가족·모임·봉사·소일거리)을 어떻게 해내는지에서 이 결이 드러나요.',
      love: '지금 나이에서는 오래 함께한 사람과의 대화와 새로 맺는 인연 모두에서 이 결이 드러나요.',
    },
  };
  function fill(b, topic) { return FILL[b] && (FILL[b][topic] || FILL[b].self) || ''; }
  R.AgeFit = { set: set, ageOf: ageOf, band: band, odd: odd, text: text, hits: hits, fill: fill, ADULT: ADULT, NOW_EXP: NOW_EXP, SENIOR_ODD: SENIOR_ODD, NEGATED: NEGATED };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.AgeFit;
})(typeof window !== 'undefined' ? window : globalThis);
