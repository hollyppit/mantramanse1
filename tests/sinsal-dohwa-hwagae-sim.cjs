// 신살 줄에 도화살·화개살이 12신살(연살·화개살)과 같은 기준으로 나오는지 검증
//   node tests/sinsal-dohwa-hwagae-sim.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
const a = src.indexOf('var MANSE_DATA'), b = src.indexOf('})(typeof window', a);
vm.runInThisContext(src.slice(a, src.indexOf('\n', b)));
const M = globalThis.Manse;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
let n = 0, d = 0, h = 0;
for (let i = 0; i < 600; i++) {
  const base = i % 2 ? 'day' : 'year';
  const c = M.compute({ year: 1940 + i % 70, month: 1 + i % 12, day: 1 + (i * 7) % 28, hour: i % 24, minute: 0, gender: 'M', sinsalBase: base });
  for (const k of ['year', 'month', 'day', 'hour']) {
    if (!c.pillars[k]) continue; n++;
    const e12 = c.cells[k].sinsal12, list = c.sinsal[k], names = list.map(x => x.name);
    ok((e12 === '연살') === names.includes('도화살'), `${i}/${k}(${base}): 연살↔도화살 불일치`);
    ok((e12 === '화개살') === names.includes('화개살'), `${i}/${k}(${base}): 화개살 불일치`);
    ok(names.filter(x => x === '도화살').length <= 1 && names.filter(x => x === '화개살').length <= 1, `${i}/${k}: 중복`);
    if (e12 === '연살') { d++; const x = list.find(y => y.name === '도화살'); ok(x.basis.startsWith(base === 'day' ? '일지' : '년지'), `도화살 기준 표기 ${x.basis}`); ok(x.good === false, '도화살은 주의색(홍염살과 동일)'); }
    if (e12 === '화개살') { h++; ok(list.find(y => y.name === '화개살').good === true, '화개살은 길색'); }
  }
}
ok(d > 20 && h > 20, `표본 부족 도화 ${d} 화개 ${h}`);
if (fails.length) { console.error('FAIL ' + fails.length + '\n' + fails.slice(0, 20).join('\n')); process.exit(1); }
console.log(`OK 신살 줄 도화살 ${d}건·화개살 ${h}건 (기둥 ${n}개, 12신살과 전부 일치)`);
