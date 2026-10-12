const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8'), ctx);
const M = ctx.Manse;
const base = { year: 2024, month: 2, day: 29, hour: 12, minute: 0, timeMode: 'wall' };
let checks = 0;
for (const patch of [
  { year: NaN }, { year: Infinity }, { year: 2024.5 }, { month: 0 }, { month: 13 },
  { day: 0 }, { day: -1 }, { day: 1.5 }, { year: 2023 },
  { hour: -1 }, { hour: 24 }, { hour: 'bad' }, { hour: 12.5 },
  { minute: NaN }, { minute: -1 }, { minute: 60 }, { minute: 'bad' },
  { lon: NaN }, { lon: Infinity }, { lon: 181 }, { lon: '127' },
  { calendar: 'bad' }, { timeMode: 'bad' }, { timeMode: 'toString' }, { jasi: 'bad' },
  { calendar: 'lunar', day: 0 }, { calendar: 'lunar', day: -1 },
  { calendar: 'lunar', year: M.MAX_Y, month: 12, day: 29 }
]) { assert.throws(() => M.compute({ ...base, ...patch })); checks++; }
assert.throws(() => M.compute(null));
for (const args of [[2024, 1, 0], [2024, 1, -1], [2024, 1, 1.5], [2024, 13, 1]]) assert.throws(() => M.lunarToSolar(...args));
for (const args of [[2023, 2, 29], [2024, 1, 0], [2024, 13, 1]]) assert.throws(() => M.solarToLunar(...args));
assert.strictEqual(M.compute(base).solar.d, 29);
assert.strictEqual(M.compute({ ...base, hour: '0', minute: '0' }).solar.h, 0);
assert.strictEqual(M.compute({ ...base, hour: '' }).pillars.hour, null);
const lunar = M.solarToLunar(2024, 2, 29);
assert.strictEqual(M.compute({ ...base, year: lunar.y, month: lunar.m, day: lunar.d, calendar: 'lunar', leap: lunar.leap }).utc, M.compute(base).utc);
console.log(`입력 검증 통과: 잘못된 입력 ${checks + 8}건 및 정상·음력 왕복 확인`);
