// 신년운세 사주 연결(report/newyear/saju-link.js) 검증: 만세력 계산을 바꾸지 않고 읽기만 하는지, 사주마다 결과가 달라지는지.
const assert = require('assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb)));
const M = globalThis.Manse;
const L = require('../report/newyear/saju-link.js');
const TJ = require('../report/newyear/engine.js');

const base = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'M', calendar: 'solar' };
const r = L.sajuYear(base, 2027);

// 1) 원국은 만세력 compute 결과 그대로(가공 없음)
const ch = M.compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'M', calendar: 'solar', leap: false });
assert.equal(r.natal.pillars.day, M.gzName(ch.pillars.day));
assert.equal(r.natal.pillars.hour, M.gzName(ch.pillars.hour));
assert.equal(r.natal.strength.zone, ch.strength.zone);
assert.equal(r.natal.yongsin.summary, ch.unified.summary);

// 2) 세운·전년 대비
assert.equal(r.year.gz, '丁未'); assert.equal(r.prevYear.gz, '丙午');
assert.ok(['순풍', '보통', '주의', '부담'].includes(r.year.band));
assert.ok(r.change && typeof r.change.fitDelta === 'number');
assert.ok(r.year.daeun && r.year.daeun.gz);
assert.ok(r.year.samjae && 'active' in r.year.samjae);
assert.ok(Array.isArray(r.year.relations));

// 3) 월운: 입춘(2027-02-04)부터 다음 입춘 전날까지 빈틈없이 12개
assert.equal(r.months.length, 12);
assert.equal(r.months[0].gz, '壬寅'); assert.equal(r.months[0].solarStart, '2027-02-04');
assert.equal(r.months[11].gz, '癸丑'); assert.equal(r.months[11].solarEnd, '2028-02-03');
for (let i = 1; i < 12; i++) {
  const prevEnd = new Date(r.months[i - 1].solarEnd + 'T00:00:00Z').getTime(), start = new Date(r.months[i].solarStart + 'T00:00:00Z').getTime();
  assert.equal(start - prevEnd, 86400000, `${r.months[i].gz} 월운이 앞 달 바로 다음 날 시작`);
}
// 양력 1월~입춘 전은 전년도(2026) 子·丑월
assert.ok(r.preMonths.length >= 1 && r.preMonths.every(x => x.belongsTo === 2026));
assert.equal(r.preMonths[r.preMonths.length - 1].solarEnd, '2027-02-03');

// 4) 음력 월(토정 기준) ↔ 월운 대응: 2027 음력 1월 = 2027-02-07 시작, 寅월
assert.equal(r.lunarMonths.length, 12);
assert.equal(r.lunarMonths[0].solarStart, '2027-02-07'); assert.equal(r.lunarMonths[0].sajuMonth, '壬寅');
assert.deepEqual(r.lunarMonths.map(x => x.days), Object.values(TJ.yearTable(2027).middle).map(x => x.days), '음력 월 날수 = 토정 엔진과 같음');

// 5) 결정적 시기
assert.equal(r.peaks.high.length, 2); assert.equal(r.peaks.low.length, 2);
assert.ok(r.peaks.high[0].fit >= r.peaks.low[0].fit);

// 6) 분야 지수(건강·사고는 신호로만)
for (const k of ['love', 'wealth', 'career', 'health', 'accident']) assert.ok(r.domains[k] && Number.isFinite(r.domains[k].score), k);

// 7) 출생 시각 모름·음력 윤달 입력
const noHour = L.sajuYear({ year: 1990, month: 5, day: 15, gender: 'F', calendar: 'solar' }, 2027);
assert.equal(noHour.natal.hourKnown, false); assert.equal(noHour.natal.pillars.hour, null);
const leap = L.sajuYear({ year: 2023, month: 2, day: 10, calendar: 'lunar', leap: true, gender: 'M' }, 2027);
assert.equal(leap.natal.lunarBirth.leap, true);

// 8) 읽기 전용: 같은 입력을 두 번 계산해도 같고, 만세력 compute 결과가 바뀌지 않는다
const again = L.sajuYear(base, 2027);
assert.deepEqual(JSON.parse(JSON.stringify(again)), JSON.parse(JSON.stringify(r)));
const ch2 = M.compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'M', calendar: 'solar', leap: false });
assert.equal(M.gzName(ch2.pillars.day), M.gzName(ch.pillars.day)); assert.equal(ch2.unified.summary, ch.unified.summary);

// 9) 서로 다른 사주에서 결과가 실제로 달라지는가: 120명(1950~2009, 두 날짜씩)
const sigs = new Set(), tg = new Set(), bands = {}, monthPatterns = new Set();
let n = 0;
for (let y = 1950; y < 2010; y++) for (const [m, d, h] of [[3, 11, 6], [9, 23, 20]]) {
  const x = L.sajuYear({ year: y, month: m, day: d, hour: h, gender: y % 2 ? 'M' : 'F', calendar: 'solar' }, 2027); n++;
  tg.add(x.year.stemTG + '/' + x.year.branchTG);
  bands[x.year.band] = (bands[x.year.band] || 0) + 1;
  sigs.add([x.year.stemTG, x.year.branchTG, x.year.band, x.year.relations.map(q => q.name).join('+'), x.natal.yongsin.yong].join('|'));
  monthPatterns.add(x.months.map(q => q.direction[0]).join(''));
}
assert.ok(tg.size >= 10, '세운 십성 조합 다양: ' + tg.size);
assert.ok(Object.keys(bands).length >= 3, '세운 등급 분포: ' + JSON.stringify(bands));
assert.ok(sigs.size >= n * 0.6, `세운 신호 조합 ${sigs.size}/${n}`);
assert.ok(monthPatterns.size >= n * 0.6, `월운 흐름 패턴 ${monthPatterns.size}/${n}`);

// 10) 방향 비교: 같으면 함께, 다르면 나눠서
assert.equal(L.compare('good', 'good').kind, 'same');
assert.equal(L.compare('good', 'neutral').kind, 'near');
assert.equal(L.compare('good', 'burden').kind, 'different');
assert.match(L.compare('burden', 'good').rule, /따로/);
assert.equal(L.compare(null, 'good').kind, 'unknown', '괘 길흉 표 검수 전에는 비교하지 않음');

console.log(`newyear-saju-link-sim ok: ${n}명 — 세운 십성 ${tg.size}종, 등급 ${JSON.stringify(bands)}, 신호 조합 ${sigs.size}, 월 흐름 ${monthPatterns.size}`);
