// 해외 출생지 계산 검증: world-places.js 목록 · 엔진 tz(IANA) 처리 · 국내 계산 불변
//   node tests/world-places-sim.cjs
const assert = require('assert/strict');
const W = require('../world-places.js');
require('../engine.js');
const M = globalThis.Manse;
const iso = ms => new Date(ms).toISOString().slice(0, 16);

// 1) 목록: 이름 중복 없음, 경도·시간대 모양, 모든 시간대를 이 런타임이 계산할 수 있음
assert.ok(W.LIST.length >= 100, '해외 도시 100곳 이상');
for (const p of W.LIST) {
  assert.ok(Number.isFinite(p.lon) && Math.abs(p.lon) <= 180, p.name + ' 경도');
  assert.ok(M.zoneOf(p.tz), p.name + ' 시간대');
}
assert.equal(W.find('뉴욕').tz, 'America/New_York');
assert.equal(W.search('미국').length > 10, true);
assert.equal(W.NOTE, '해당 지역이 없으면 가까운 지역을 선택해 주세요.');

// 2) 해외 시각 → 세계 표준시(과거 서머타임 포함)
const base = { gender: 'M', timeMode: 'lmt' };
const cases = [
  ['뉴욕 여름(EDT)', { year: 1990, month: 7, day: 4, hour: 12, minute: 0, tz: 'America/New_York', lon: -74.01 }, '1990-07-04T16:00', -240, true],
  ['뉴욕 겨울(EST)', { year: 1990, month: 1, day: 4, hour: 12, minute: 0, tz: 'America/New_York', lon: -74.01 }, '1990-01-04T17:00', -300, false],
  ['로스앤젤레스', { year: 1985, month: 8, day: 1, hour: 6, minute: 30, tz: 'America/Los_Angeles', lon: -118.24 }, '1985-08-01T13:30', -420, true],
  ['도쿄', { year: 2000, month: 3, day: 1, hour: 9, minute: 0, tz: 'Asia/Tokyo', lon: 139.69 }, '2000-03-01T00:00', 540, false],
  ['상하이 1988 서머타임', { year: 1988, month: 7, day: 1, hour: 12, minute: 0, tz: 'Asia/Shanghai', lon: 121.47 }, '1988-07-01T03:00', 540, true],
  ['상하이 1995', { year: 1995, month: 7, day: 1, hour: 12, minute: 0, tz: 'Asia/Shanghai', lon: 121.47 }, '1995-07-01T04:00', 480, false],
  ['시드니 1월(남반구 서머타임)', { year: 2000, month: 1, day: 15, hour: 12, minute: 0, tz: 'Australia/Sydney', lon: 151.21 }, '2000-01-15T01:00', 660, true],
  ['런던 여름(BST)', { year: 1995, month: 6, day: 10, hour: 8, minute: 0, tz: 'Europe/London', lon: -0.13 }, '1995-06-10T07:00', 60, true],
  ['호놀룰루', { year: 1990, month: 7, day: 4, hour: 12, minute: 0, tz: 'Pacific/Honolulu', lon: -157.86 }, '1990-07-04T22:00', -600, false],
];
for (const [label, inp, utc, off, dst] of cases) {
  const ch = M.compute(Object.assign({}, base, inp));
  assert.equal(iso(ch.utc), utc, label + ' UTC');
  assert.equal(ch.tzOffset, off, label + ' 오프셋');
  assert.equal(ch.dst, dst, label + ' 서머타임');
  assert.equal(ch.tz, inp.tz, label + ' tz 표시');
}
// 지방평균시: 뉴욕 1990-07-04 12:00 EDT → UTC 16:00 + (-74.01 × 4분) ≈ 11:04
{ const ch = M.compute(Object.assign({}, base, cases[0][1])); assert.equal(iso(ch.localSolarMs).slice(11), '11:03'); }
// 시간 기준: 시계 시각 그대로 / 표준시(서머타임 제거)
{ const w = M.compute(Object.assign({}, cases[0][1], { timeMode: 'wall' })), s = M.compute(Object.assign({}, cases[0][1], { timeMode: 'std' }));
  assert.equal(iso(w.localSolarMs).slice(11), '12:00'); assert.equal(iso(s.localSolarMs).slice(11), '11:00'); }
// 도시 이름만 넘겨도(tz 없음) 해외 도시면 그 시간대·경도로 계산
{ const a = M.compute(Object.assign({}, base, cases[0][1])), b = M.compute(Object.assign({}, base, { year: 1990, month: 7, day: 4, hour: 12, minute: 0, city: '뉴욕' }));
  assert.equal(a.utc, b.utc); assert.equal(a.lon, b.lon); }
// 같은 현지 시계 시각: 일주는 현지 날짜 기준이라 같고, 세계 표준시(절기·월주 판정용)는 13시간 다르다
{ const ny = M.compute({ year: 1990, month: 7, day: 4, hour: 21, minute: 0, tz: 'America/New_York', lon: -74.01 }), kr = M.compute({ year: 1990, month: 7, day: 4, hour: 21, minute: 0, lon: 126.98 });
  assert.equal(M.gzName(ny.pillars.day), M.gzName(kr.pillars.day), '현지 날짜 기준 같은 날');
  assert.notEqual(ny.utc, kr.utc); }
// 잘못된 시간대 거부
assert.throws(() => M.compute({ year: 1990, month: 1, day: 1, hour: 1, minute: 0, tz: 'Not/AZone' }));
assert.throws(() => M.compute({ year: 1990, month: 1, day: 1, hour: 1, minute: 0, tz: '../x' }));

// 3) 국내 불변: tz 없음 = tz 'Asia/Seoul' (한국 시간대 표 그대로), 1987·88 서머타임 포함
const strip = c => JSON.stringify(c, (k, v) => (k === 'input' ? undefined : v));
let seed = 11; const r = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
for (let i = 0; i < 300; i++) {
  const inp = { year: 1901 + r(198), month: 1 + r(12), day: 1 + r(28), hour: r(5) ? r(24) : null, minute: r(60), gender: r(2) ? 'M' : 'F', lon: [126.98, 129.08, 127.15][r(3)], timeMode: ['lmt', 'ast', 'wall', 'std'][r(4)] };
  assert.equal(strip(M.compute(Object.assign({}, inp, { tz: 'Asia/Seoul' }))), strip(M.compute(inp)), '국내 계산 동일 ' + JSON.stringify(inp));
}
{ const ch = M.compute({ year: 1988, month: 7, day: 1, hour: 12, minute: 0, lon: 126.98 }); assert.equal(ch.tzOffset, 600); assert.equal(ch.dst, true); assert.equal(ch.tz, undefined); }

console.log('PASS world-places-sim: 해외 도시 ' + W.LIST.length + '곳 · 시간대 ' + cases.length + '건(서머타임 포함) · 국내 300건 불변');
