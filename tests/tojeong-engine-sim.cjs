// 토정비결 작괘 엔진 검증: 판본(규장각 奎古 1077) 數理法·甲辰年 速見表 대조 + 경계 사례. 네트워크·AI 없음.
const assert = require('assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb)));
const T = require('../report/newyear/engine.js');
const run = (birth, targetYear, options) => T.compute({ birth, targetYear, options });

// ── 1) 數理法 표(판본 001b)
assert.deepEqual(T.STEM_NUM, [9, 8, 7, 6, 5, 9, 8, 7, 6, 5]);
assert.deepEqual(T.TAESE_BR, [11, 13, 10, 10, 13, 9, 9, 13, 12, 12, 13, 11]);
assert.deepEqual(T.WOLGEON_BR, [9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4]);
assert.deepEqual(T.ILJIN_BR, [9, 11, 8, 8, 11, 7, 7, 11, 10, 10, 11, 9]);
assert.equal(T.taeseNum(T.yearGz(2027)), 19, '2027 丁未 태세수 = 6 + 13');
assert.equal(T.yearGz(2027).name, '丁未'); assert.equal(T.yearGz(1964).name, '甲辰'); assert.equal(T.yearGz(2026).name, '丙午');
assert.equal(T.monthGz(T.yearGz(2026).s, 1).name, '庚寅', '丙辛之年 庚寅頭(遁月法)');
assert.equal(T.monthGz(T.yearGz(1964).s, 1).name, '丙寅', '甲己之年 丙寅頭');
assert.equal(T.monthGz(T.yearGz(2027).s, 1).name, '壬寅', '丁壬之年 壬寅頭');

// ── 2) 甲辰年(1964) 速見表(판본 074a) 대조
const t = T.yearTable(1964);
assert.equal(t.taeseNum, 22);
const UP = { 1: 7, 2: 8, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 1, 21: 3, 41: 7, 61: 3 };
for (const [a, v] of Object.entries(UP)) assert.equal(t.upper[a], v, `1964 ${a}세 상괘`);
const FIRST = ['壬辰', '壬戌', '辛卯', '辛酉', '庚寅', '己未', '己丑', '戊午', '戊子', '丁巳', '丁亥', '丁巳'];
FIRST.forEach((g, i) => assert.equal(t.monthFirstIljin[i + 1], g, `1964 ${i + 1}월 초하루 일진`));
const MID = [2, 5, 4, 6, 4, 3, 6];   // 正大2 二小5 三大4 四小6 五小4 六大3 七小6
MID.forEach((v, i) => assert.equal(t.middle[i + 1].value, v, `1964 ${i + 1}월 중괘`));
assert.equal(t.middle[1].days, 30); assert.equal(t.middle[2].days, 29);
const LOW = { 1: [3, 2, 1, 2], 2: [3, 1, 3, 2], 3: [1, 1, 3, 2], 4: [3, 1, 2, 1] };   // 월별 1~4일 하괘
for (const [m, row] of Object.entries(LOW)) assert.deepEqual(t.lower[m].slice(0, 4), row, `1964 ${m}월 1~4일 하괘`);

// ── 3) 공개 계산기 예시(2026 병오년)
const b = run({ year: 1990, month: 11, day: 15, calendar: 'solar' }, 2026);
assert.equal(b.gua, 531); assert.deepEqual(b.birthLunar, { y: 1990, m: 9, d: 28, leap: false });
assert.equal(b.steps.lower.iljin, '乙酉'); assert.equal(b.steps.lower.iljinNum, 18);
const a = run({ year: 1990, month: 5, day: 15, calendar: 'solar' }, 2026);
assert.equal(a.upper, 5); assert.equal(a.lower, 1); assert.equal(a.steps.lower.iljin, '辛亥'); assert.equal(a.steps.lower.iljinNum, 16);
assert.equal(a.steps.middle.wolgeon, '癸巳', '음력 4월 월건은 遁月法으로 癸巳(공개 계산기는 18로 계산해 551 — 판본 규칙과 다름)');
assert.equal(a.gua, 521);

// ── 4) 같은 생일을 양력·음력으로 넣으면 같은 괘
const sol = run({ year: 1985, month: 3, day: 7, calendar: 'solar' }, 2027);
const lun = run({ year: sol.birthLunar.y, month: sol.birthLunar.m, day: sol.birthLunar.d, calendar: 'lunar', leap: sol.birthLunar.leap }, 2027);
assert.equal(sol.gua, lun.gua);

// ── 5) 입춘·설 경계: 양력 1월생(설 전) → 음력 전년도생으로 나이를 센다
const preSeol = run({ year: 1990, month: 1, day: 20, calendar: 'solar' }, 2027);
assert.equal(preSeol.birthLunar.y, 1989); assert.equal(preSeol.steps.upper.age, 39);
assert.ok(preSeol.notes.some(n => /설 전/.test(n)));
const preSeolSolar = run({ year: 1990, month: 1, day: 20, calendar: 'solar' }, 2027, { ageBasis: 'solar' });
assert.equal(preSeolSolar.steps.upper.age, 38);
// 입춘(2/4) 직전·직후 출생도 토정 나이는 음력 설 기준으로만 바뀐다(입춘은 쓰지 않음)
const beforeIpchun = run({ year: 1995, month: 2, day: 3, calendar: 'solar' }, 2027), afterIpchun = run({ year: 1995, month: 2, day: 5, calendar: 'solar' }, 2027);
assert.equal(beforeIpchun.steps.upper.age, afterIpchun.steps.upper.age, '1995 설(1/31) 뒤라 입춘 전후 나이 같음');

// ── 6) 윤달생: 같은 번호 평달로 계산
const leapB = run({ year: 2023, month: 2, day: 10, calendar: 'lunar', leap: true }, 2027);
const plainB = run({ year: 2023, month: 2, day: 10, calendar: 'lunar', leap: false }, 2027);
assert.equal(leapB.steps.middle.month, 2); assert.equal(leapB.gua, plainB.gua);
assert.ok(leapB.notes.some(n => /윤2월/.test(n)));
assert.throws(() => run({ year: 2024, month: 2, day: 10, calendar: 'lunar', leap: true }, 2027), /윤2월이 없습니다/);
const leap1984 = run({ year: 1984, month: 10, day: 5, calendar: 'lunar', leap: true }, 2027);   // 1984 윤10월
assert.equal(leap1984.birthLunar.leap, true); assert.equal(leap1984.steps.middle.month, 10);

// ── 7) 30일생인데 당년(2027) 생월이 작은달: 2027 음력 1월은 29일까지
assert.equal(T.yearTable(2027).middle[1].days, 29);
const d30 = run({ year: 1964, month: 1, day: 30, calendar: 'lunar' }, 2027);   // 1964 정월은 큰달
assert.equal(d30.steps.lower.day, 30); assert.equal(d30.steps.lower.iljinDay, 29);
assert.ok(d30.notes.some(n => /그믐/.test(n)));
assert.throws(() => run({ year: 1964, month: 1, day: 30, calendar: 'lunar' }, 2027, { day30Rule: 'error' }), /29일까지/);

// ── 8) 입력 오류·범위
assert.throws(() => run({ year: 1990, month: 2, day: 30, calendar: 'solar' }, 2027), /존재하지 않는/);
assert.throws(() => run({ year: 1990, month: 5, day: 15 }, 1980), /출생 해보다/);
assert.throws(() => run({ year: 1898, month: 5, day: 15, calendar: 'solar' }, 2027));
assert.throws(() => run({ year: 1990, month: 5 }, 2027), /정수/);

// ── 9) 출생 시각은 쓰지 않음 · 결과 형식
const withHour = T.compute({ birth: { year: 1990, month: 5, day: 15, calendar: 'solar', hour: 23 }, targetYear: 2027 });
const noHour = T.compute({ birth: { year: 1990, month: 5, day: 15, calendar: 'solar' }, targetYear: 2027 });
assert.equal(withHour.gua, noHour.gua); assert.equal(noHour.usesBirthTime, false);

// ── 10) 폭넓은 무작위 출생일: 괘 번호 범위·144괘 고르게 나옴
const seen = new Set(); let n = 0;
for (let y = 1900; y <= 2026; y += 1) for (const [m, d] of [[1, 1], [2, 14], [3, 31], [6, 15], [8, 31], [10, 9], [12, 31]]) {
  const r = run({ year: y, month: m, day: d, calendar: 'solar' }, 2027); n++;
  assert.ok(r.upper >= 1 && r.upper <= 8 && r.middle >= 1 && r.middle <= 6 && r.lower >= 1 && r.lower <= 3);
  assert.equal(r.gua, r.upper * 100 + r.middle * 10 + r.lower);
  seen.add(r.gua);
}
// 2027년은 열두 달 중괘가 6·5·1·6·3·1·6·2·6·5·3·1 이라 중괘 4가 없다 → 나올 수 있는 괘 120개(x4x 24괘 불가)
const t27 = T.yearTable(2027);
assert.deepEqual(Object.values(t27.middle).map(v => v.value), [6, 5, 1, 6, 3, 1, 6, 2, 6, 5, 3, 1]);
assert.ok([...seen].every(g => Math.floor(g / 10) % 10 !== 4), '2027년에 중괘 4는 나오지 않음');
assert.ok(seen.size >= 110, '2027년 다양한 생일에서 괘가 고르게 나옴: ' + seen.size);

console.log(`tojeong-engine-sim ok: 판본 조견표 대조·경계 사례 통과, 무작위 ${n}건에서 괘 ${seen.size}종`);
