/* 토정비결 작괘 엔진 — 사주 해석과 분리된 계산 전용 모듈. 브라우저·Node 공용, 순수 함수.
   근거: 규장각 奎古 1077 『(四十五句)松亭土亭秘訣』 「數理法」(001b)·「鑑定法」(072a)·「甲辰年 速見表」(074a).
   계산법 문서: docs/TOJEONG_METHOD_2026-11-15.md
   음력 변환·일진은 만트라 만세력 엔진(engine.js, 전역 Manse)을 그대로 쓴다(읽기만, 수정 없음).

   상괘 = (세는 나이 + 당년 태세수)      ÷ 8 의 나머지, 0 → 8
   중괘 = (당년 생월 날수 30/29 + 월건수) ÷ 6 의 나머지, 0 → 6
   하괘 = (생일수 + 당년 생일 일진수)     ÷ 3 의 나머지, 0 → 3
   수: 천간 甲己9 乙庚8 丙辛7 丁壬6 戊癸5 + 지지(태세·월건·일진마다 표가 다름) */
(function (root) {
  'use strict';
  var STEM = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥';
  var STEM_NUM = [9, 8, 7, 6, 5, 9, 8, 7, 6, 5];                       // 年月日 공통 천간수
  var TAESE_BR = [11, 13, 10, 10, 13, 9, 9, 13, 12, 12, 13, 11];      // 太歲數 지지
  var WOLGEON_BR = [9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4];              // 月建數 지지
  var ILJIN_BR = [9, 11, 8, 8, 11, 7, 7, 11, 10, 10, 11, 9];          // 日辰數 지지
  var METHOD_ID = 'tojeong-kyu1077-v1';
  // 판본에 규정이 없어 정한 기본값(바꿀 수 있음, 문서 3절)
  var DEFAULTS = {
    ageBasis: 'lunar',        // 세는 나이의 출생연도: 'lunar' = 음력 설 기준 출생 해(전통), 'solar' = 양력 연도
    leapRule: 'same-number',  // 윤달생: 같은 번호의 평달로 본다
    day30Rule: 'last-day',    // 당년 생월이 작은달인데 30일생: 생일수 30 유지, 일진은 그 달 그믐(29일)
  };

  function manse(M) {
    var m = M || root.Manse;
    if (!m || typeof m.lunarToSolar !== 'function') throw new Error('만세력 엔진(Manse)이 먼저 로드되어야 합니다');
    return m;
  }
  var mod = function (a, n) { return ((a % n) + n) % n; };
  var rest = function (sum, n) { var r = sum % n; return r === 0 ? n : r; };
  var gzOfIndex = function (i) { return { s: i % 10, b: i % 12, i: i, name: STEM[i % 10] + BR[i % 12] }; };
  // 해의 간지(태세): 서기 4년 = 甲子
  function yearGz(Y) { return gzOfIndex(mod(Y - 4, 60)); }
  // 음력 월의 월건(遁月法): 甲己年 丙寅頭, 乙庚年 戊寅頭, 丙辛年 庚寅頭, 丁壬年 壬寅頭, 戊癸年 甲寅頭 — 음력 월 번호 기준(절기 월 아님)
  function monthGz(yearStem, lunarMonth) {
    var s = mod((yearStem % 5) * 2 + 2 + (lunarMonth - 1), 10), b = mod(lunarMonth + 1, 12);
    return { s: s, b: b, name: STEM[s] + BR[b] };
  }
  function lunarMonthDays(M, Y, m) {
    try { M.lunarToSolar(Y, m, 30, false); return 30; } catch (e) { return 29; }
  }
  function dayGzOfLunar(M, Y, m, d) {
    var ymd = M.lunarToSolar(Y, m, d, false);
    var g = M.dayPillarOfJdn(M.jdnFromYMD(ymd[0], ymd[1], ymd[2]));
    return { s: g.s, b: g.b, name: STEM[g.s] + BR[g.b], solar: ymd };
  }
  var taeseNum = function (g) { return STEM_NUM[g.s] + TAESE_BR[g.b]; };
  var wolgeonNum = function (g) { return STEM_NUM[g.s] + WOLGEON_BR[g.b]; };
  var iljinNum = function (g) { return STEM_NUM[g.s] + ILJIN_BR[g.b]; };

  // 출생 입력 → 음력 생년월일. birth: { year, month, day, calendar: 'solar'|'lunar', leap }
  function birthLunar(M, birth) {
    if (!birth || ![birth.year, birth.month, birth.day].every(Number.isInteger)) throw new Error('생년월일을 정수로 입력하세요');
    if (birth.calendar === 'lunar') {
      var s = M.lunarToSolar(birth.year, birth.month, birth.day, !!birth.leap);   // 없는 날짜·윤달이면 여기서 오류
      return { y: birth.year, m: birth.month, d: birth.day, leap: !!birth.leap, solar: s };
    }
    var l = M.solarToLunar(birth.year, birth.month, birth.day);
    if (!l) throw new Error('지원 범위를 벗어난 날짜입니다');
    return { y: l.y, m: l.m, d: l.d, leap: !!l.leap, solar: [birth.year, birth.month, birth.day] };
  }

  /* 작괘. input: { birth, targetYear, options? } → 괘 번호와 계산 과정 전부(설명용).
     출생 시각은 쓰지 않는다(판본 鑑定法에 시가 없음). */
  function compute(input, M) {
    M = manse(M);
    var opt = {}; var k; for (k in DEFAULTS) opt[k] = DEFAULTS[k];
    if (input && input.options) for (k in input.options) if (input.options[k] != null) opt[k] = input.options[k];
    var Y = input && input.targetYear;
    if (!Number.isInteger(Y)) throw new Error('보는 해(targetYear)를 정수로 입력하세요');
    var lb = birthLunar(M, input.birth);
    var notes = [];

    // 1) 상괘: 세는 나이 + 태세수
    var birthYear = opt.ageBasis === 'solar' ? lb.solar[0] : lb.y;
    var age = Y - birthYear + 1;
    if (age < 1) throw new Error('보는 해가 출생 해보다 앞섭니다');
    if (opt.ageBasis !== 'solar' && lb.y !== lb.solar[0]) notes.push('양력 ' + lb.solar[0] + '년생이지만 음력 설 전에 태어나 음력 ' + lb.y + '년생으로 나이를 셉니다');
    var tg = yearGz(Y), tn = taeseNum(tg);
    var upper = rest(age + tn, 8);

    // 2) 중괘: 당년 생월 날수 + 월건수 (윤달생은 같은 번호 평달)
    var m = lb.m;
    if (lb.leap) notes.push('윤' + m + '월생은 판본에 규정이 없어 같은 번호의 평달(' + m + '월)로 계산합니다');
    var days = lunarMonthDays(M, Y, m);
    var mg = monthGz(tg.s, m), mn = wolgeonNum(mg);
    var middle = rest(days + mn, 6);

    // 3) 하괘: 생일수 + 당년 그 날의 일진수
    var d = lb.d, dayForIljin = d;
    if (d > days) {
      if (opt.day30Rule === 'error') throw new Error(Y + '년 음력 ' + m + '월은 ' + days + '일까지입니다');
      dayForIljin = days;   // 'last-day': 그믐 일진
      notes.push(Y + '년 음력 ' + m + '월은 작은달이라 30일의 일진이 없어 그믐(' + days + '일)의 일진으로 계산합니다(판본 규정 없음)');
    }
    var dg = dayGzOfLunar(M, Y, m, dayForIljin), dn = iljinNum(dg);
    var lower = rest(d + dn, 3);

    return {
      method: METHOD_ID, gua: upper * 100 + middle * 10 + lower, upper: upper, middle: middle, lower: lower,
      targetYear: Y, taese: { name: tg.name, num: tn },
      birthLunar: { y: lb.y, m: lb.m, d: lb.d, leap: lb.leap }, birthSolar: lb.solar,
      steps: {
        upper: { age: age, ageBasis: opt.ageBasis, taese: tn, sum: age + tn, mod: 8, result: upper },
        middle: { month: m, days: days, wolgeon: mg.name, wolgeonNum: mn, sum: days + mn, mod: 6, result: middle },
        lower: { day: d, iljinDay: dayForIljin, iljin: dg.name, iljinNum: dn, iljinSolar: dg.solar, sum: d + dn, mod: 3, result: lower },
      },
      options: opt, notes: notes, usesBirthTime: false,
    };
  }

  // 그해 조견표(판본 「速見表」와 같은 모양): 나이별 상괘, 월별 중괘, 월·일별 하괘
  function yearTable(Y, M) {
    M = manse(M);
    var tg = yearGz(Y), tn = taeseNum(tg), up = {}, mid = {}, low = {}, firsts = {};
    for (var age = 1; age <= 100; age++) up[age] = rest(age + tn, 8);
    for (var m = 1; m <= 12; m++) {
      var days = lunarMonthDays(M, Y, m), mg = monthGz(tg.s, m);
      mid[m] = { days: days, wolgeon: mg.name, value: rest(days + wolgeonNum(mg), 6) };
      firsts[m] = dayGzOfLunar(M, Y, m, 1).name;
      low[m] = [];
      for (var d = 1; d <= 30; d++) { var dd = Math.min(d, days); low[m].push(rest(d + iljinNum(dayGzOfLunar(M, Y, m, dd)), 3)); }
    }
    return { year: Y, taese: tg.name, taeseNum: tn, upper: up, middle: mid, lower: low, monthFirstIljin: firsts };
  }

  var API = {
    METHOD_ID: METHOD_ID, DEFAULTS: DEFAULTS, STEM_NUM: STEM_NUM, TAESE_BR: TAESE_BR, WOLGEON_BR: WOLGEON_BR, ILJIN_BR: ILJIN_BR,
    compute: compute, yearTable: yearTable, yearGz: yearGz, monthGz: monthGz,
    taeseNum: taeseNum, wolgeonNum: wolgeonNum, iljinNum: iljinNum,
  };
  root.TojeongEngine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
