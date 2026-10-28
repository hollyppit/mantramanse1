// 허브 무료 타로의 카드 배열(원 카드·과거/현재/미래·상황/장애물/조언/결과) 검증: 공용 종합 읽기, 허브 화면 연결(정적 확인).
const assert = require('assert/strict');
const fs = require('fs'), path = require('path');
globalThis.window = globalThis;
const core = require('../shared-core.js');
const Tarot = (globalThis.MantraCore || core).Tarot;

const list = Tarot.spreads();
assert.deepEqual(list.map(s => s.key), ['one', 'three', 'four']);
assert.deepEqual(list.map(s => s.positions.length), [1, 3, 4]);

const deck = Tarot.draw(78);
for (const [key, n] of [['one', 1], ['three', 3], ['four', 4]]) {
  for (const m of ['today', 'love', 'money', 'work']) {
    const picks = deck.slice(0, n);
    const r = Tarot.readSpread(key, picks, m);
    assert.equal(r.rows.length, n); assert.equal(r.spreadKey, key);
    assert.ok(r.band && r.oneLine && r.advice && r.keyRow, key + '/' + m);
    assert.ok(r.score >= -3 && r.score <= 3);
  }
}
// 자리 이름과 조언 자리
const r4 = Tarot.readSpread('four', deck.slice(0, 4), 'love');
assert.deepEqual(r4.rows.map(x => x.label), list[2].positions.map(p => p.label));
assert.ok(r4.advRow && r4.keyRow.k === 'res');
assert.ok(Tarot.readSpread('three', deck.slice(0, 3), 'work').trend.length > 0, '3장은 흐름 문장이 있다');
assert.equal(Tarot.readSpread('nope', deck.slice(0, 1), 'today'), null);
assert.equal(Tarot.readSpread('three', [], 'today'), null);
// 같은 입력이면 같은 결과
assert.deepEqual(Tarot.readSpread('three', deck.slice(0, 3), 'money').band, Tarot.readSpread('three', deck.slice(0, 3), 'money').band);

// ── 허브 화면 연결(정적) ──
const src = fs.readFileSync(path.join(__dirname, '../report/hub/hub-tarot.js'), 'utf8');
for (const k of ['data-sp=', 'spreadMulti', 'resultSpread', 'Tarot.readSpread', 'tarot_spread_select']) assert.ok(src.includes(k), k);
assert.ok(/m === 'yesno'/.test(src), 'YES/NO 는 한 장으로 고정');
new Function(src); // 문법 확인
const css = fs.readFileSync(path.join(__dirname, '../report/hub/hub.css'), 'utf8');
assert.ok(css.includes('.sprow') && css.includes('.tsp'));
console.log('PASS: 배열 3종 × 분야 4종 종합 읽기, 자리 이름·조언 자리·흐름, 잘못된 입력, 허브 연결');
