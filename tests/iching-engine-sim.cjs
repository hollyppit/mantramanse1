// 주역 계산 엔진 검증: 64괘 구조 데이터와 세 동전 점법. 기준 데이터(아래 KNOWN)는 엔진 로직과 분리해 두었다.
const assert = require('assert/strict');
const H = require('../report/iching/hexagrams.js');
const E = require('../report/iching/engine.js');

// ── 64괘 구조 ──
assert.equal(H.TRIGRAMS.length, 8);
assert.equal(H.HEXAGRAMS.length, 64);
assert.equal(new Set(H.TRIGRAMS.map(t => t.lines.join(''))).size, 8, '8괘 음양 패턴이 서로 달라야 한다');
assert.equal(new Set(H.HEXAGRAMS.map(h => h.pattern)).size, 64, '64개 음양 패턴은 유일해야 한다');
assert.equal(new Set(H.HEXAGRAMS.map(h => h.hanja)).size, 64, '한자 괘명은 모두 달라야 한다');
H.HEXAGRAMS.forEach((h, i) => {
  assert.equal(h.num, i + 1);
  assert.equal(h.lines.length, 6);
  assert.deepEqual(h.lines, H.trigram(h.lower).lines.concat(H.trigram(h.upper).lines), h.ko + ': 하괘가 아래 3효, 상괘가 위 3효');
  assert.equal(H.byLines(h.lines).num, h.num);
});
// 8괘가 상괘·하괘로 각각 정확히 8번씩 쓰인다(8×8 조합이 빠짐없이 한 번씩)
const combo = new Set(H.HEXAGRAMS.map(h => h.upper + '/' + h.lower));
assert.equal(combo.size, 64);

// 기준 데이터: 알려진 괘의 효 패턴(초효→상효)
const KNOWN = { 1: '111111', 2: '000000', 3: '100010', 4: '010001', 11: '111000', 12: '000111', 29: '010010', 30: '101101', 51: '100100', 52: '001001', 57: '011011', 58: '110110', 63: '101010', 64: '010101' };
Object.entries(KNOWN).forEach(([n, p]) => assert.equal(H.byNum(+n).pattern, p, n + '번 괘 패턴'));

// 문왕괘서의 짝 규칙(엔진·표와 독립인 구조 검증): 홀수 번호 괘와 그 다음 짝수 번호 괘는
// 위아래를 뒤집은 괘(綜)이거나, 뒤집어도 같은 8괘(1·27·29·61 쌍)는 모든 효를 반전한 괘(錯)다.
let pairs = 0, comp = 0;
for (let k = 1; k <= 63; k += 2) {
  const a = H.byNum(k).lines, b = H.byNum(k + 1).lines, rev = a.slice().reverse();
  if (rev.join('') === a.join('')) { assert.deepEqual(b, a.map(x => 1 - x), k + '번 쌍은 반전 관계'); comp++; }
  else assert.deepEqual(b, rev, k + '번 쌍은 뒤집은 관계');
  pairs++;
}
assert.equal(pairs, 32); assert.equal(comp, 4, '뒤집어도 같은 괘는 4쌍(건곤·이대과·감리·중부소과)');

// 384효: 64괘 × 6효가 정확히 한 번씩 참조 가능해야 한다
const lineIds = new Set();
H.HEXAGRAMS.forEach(h => { for (let p = 1; p <= 6; p++) lineIds.add(h.num + ':' + p); });
assert.equal(lineIds.size, 384);

// ── 세 동전 점법 ──
const tally = {};
for (const a of [2, 3]) for (const b of [2, 3]) for (const c of [2, 3]) { const v = E.lineFromCoins([a, b, c]); tally[v] = (tally[v] || 0) + 1; }
assert.deepEqual(tally, { 6: 1, 7: 3, 8: 3, 9: 1 }, '6·9는 1/8, 7·8은 3/8');
assert.equal(E.lineFromCoins([2, 2, 2]), 6); assert.equal(E.lineFromCoins([3, 3, 3]), 9);
assert.throws(() => E.lineFromCoins([1, 2, 3]), /invalid-coins/);
assert.throws(() => E.lineFromCoins([2, 3]), /invalid-coins/);
assert.throws(() => E.resolve([7, 7, 7, 7, 7]), /invalid-line-values/);
assert.throws(() => E.resolve([7, 7, 7, 7, 7, 5]), /invalid-line-values/);

// ── 효 순서: 첫 값이 초효(맨 아래) ──
{
  const r = E.resolve([7, 8, 8, 8, 8, 8]); // 초효만 양 → 아래 3효 100 = 진(우레), 위 000 = 곤 → 24 복
  assert.equal(r.hexagram.num, 24); assert.equal(r.hexagram.ko, '복');
  const s = E.resolve([8, 8, 8, 8, 8, 7]); // 상효만 양 → 23 박
  assert.equal(s.hexagram.num, 23);
}

// ── 변효 0~6개 전수(4^6 = 4096가지 효 값 조합) ──
const VALS = [6, 7, 8, 9], counts = {};
let total = 0;
for (let n = 0; n < 4096; n++) {
  const values = []; for (let i = 0, x = n; i < 6; i++, x = Math.floor(x / 4)) values.push(VALS[x % 4]);
  const r = E.resolve(values);
  total++;
  const pos = values.map((v, i) => (v === 6 || v === 9) ? i + 1 : 0).filter(Boolean);
  counts[pos.length] = (counts[pos.length] || 0) + 1;
  assert.equal(r.changingCount, pos.length);
  assert.deepEqual(r.changingLines.map(l => l.position), pos, '변효 위치(아래=1)');
  assert.deepEqual(r.hexagram.lines, values.map(v => (v === 7 || v === 9) ? 1 : 0), '본괘는 7·9가 양');
  if (!pos.length) { assert.equal(r.transformedHexagram, null); }
  else {
    const expect = r.hexagram.lines.map((x, i) => pos.includes(i + 1) ? 1 - x : x);
    assert.deepEqual(r.transformedHexagram.lines, expect, '변괘는 변효만 반전');
    assert.equal(r.transformedHexagram.num, H.byLines(expect).num);
    // 변괘에서 다시 변효를 되돌리면 본괘가 된다
    assert.deepEqual(r.transformedHexagram.lines.map((x, i) => pos.includes(i + 1) ? 1 - x : x), r.hexagram.lines);
  }
  r.changingLines.forEach(l => { assert.equal(l.from, l.value === 9 ? 'yang' : 'yin'); assert.equal(l.to, l.value === 9 ? 'yin' : 'yang'); });
  // 해석 규칙(주희 본의): 참조가 항상 존재하는 효·괘를 가리키고, 중심(primary)은 정확히 하나
  assert.equal(r.rule.id, 'zhuxi-bengui-v1');
  const prim = r.reading.filter(x => x.role === 'primary');
  assert.equal(prim.length, 1, '중심 참조는 하나');
  r.reading.forEach(x => {
    assert.ok(x.hexagram >= 1 && x.hexagram <= 64);
    if (x.kind === 'yaoci') assert.ok(x.line >= 1 && x.line <= 6);
  });
  const baseN = r.hexagram.num, movedN = r.transformedHexagram && r.transformedHexagram.num;
  const stillPos = [1, 2, 3, 4, 5, 6].filter(p => !pos.includes(p));
  switch (pos.length) {
    case 0: assert.deepEqual(r.reading, [{ kind: 'guaci', hexagram: baseN, role: 'primary' }]); break;
    case 1: assert.deepEqual(r.reading, [{ kind: 'yaoci', hexagram: baseN, line: pos[0], role: 'primary' }]); break;
    case 2: assert.deepEqual(r.reading.map(x => [x.hexagram, x.line, x.role]), [[baseN, pos[1], 'primary'], [baseN, pos[0], 'secondary']]); break;
    case 3: assert.deepEqual(r.reading, [{ kind: 'guaci', hexagram: baseN, role: 'primary' }, { kind: 'guaci', hexagram: movedN, role: 'secondary' }]); break;
    case 4: assert.deepEqual(r.reading.map(x => [x.hexagram, x.line, x.role]), [[movedN, stillPos[0], 'primary'], [movedN, stillPos[1], 'secondary']]); break;
    case 5: assert.deepEqual(r.reading, [{ kind: 'yaoci', hexagram: movedN, line: stillPos[0], role: 'primary' }]); break;
    case 6:
      if (baseN === 1) assert.deepEqual(r.reading, [{ kind: 'yong', hexagram: 1, role: 'primary', name: '용구' }]);
      else if (baseN === 2) assert.deepEqual(r.reading, [{ kind: 'yong', hexagram: 2, role: 'primary', name: '용육' }]);
      else assert.deepEqual(r.reading, [{ kind: 'guaci', hexagram: movedN, role: 'primary' }]);
  }
}
assert.equal(total, 4096);
// 변효 개수별 조합 수: C(6,n) × 2^n(변효 음양) × 2^(6-n)(불변효 음양) = C(6,n) × 64
[0, 1, 2, 3, 4, 5, 6].forEach(n => assert.equal(counts[n], [1, 6, 15, 20, 15, 6, 1][n] * 64, '변효 ' + n + '개 조합 수'));

// 건·곤 여섯 효 변: 용구·용육
assert.equal(E.resolve([9, 9, 9, 9, 9, 9]).reading[0].name, '용구');
assert.equal(E.resolve([6, 6, 6, 6, 6, 6]).reading[0].name, '용육');
assert.equal(E.resolve([9, 9, 9, 9, 9, 9]).transformedHexagram.num, 2);
assert.equal(E.resolve([6, 6, 6, 6, 6, 6]).transformedHexagram.num, 1);
// 구체 사례: 건(1) 초효·오효 변 → 본괘 1 / 변괘 = 초효·오효 반전
{
  const r = E.resolve([9, 7, 7, 7, 9, 7]);
  assert.equal(r.hexagram.num, 1); assert.deepEqual(r.changingLines.map(l => l.position), [1, 5]);
  assert.equal(r.transformedHexagram.pattern === undefined, true); assert.deepEqual(r.transformedHexagram.lines, [0, 1, 1, 1, 0, 1]);
  assert.deepEqual(r.reading.map(x => x.line), [5, 1], '두 변효 중 위(5)가 중심');
}

// ── 재현성 / 난수 ──
function seeded(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
assert.deepEqual(E.cast(seeded(7)), E.cast(seeded(7)), '같은 난수열이면 같은 결과');
assert.notDeepEqual(E.cast(seeded(7)).values, E.cast(seeded(8)).values);
const real = E.cast(); // crypto 난수
assert.equal(real.values.length, 6); assert.equal(real.coins.length, 6);
real.coins.forEach((c, i) => assert.equal(E.lineFromCoins(c), real.values[i]));
assert.deepEqual(E.resolve(real.values), Object.assign({}, real, { coins: null }), '효 값만으로 같은 결과를 다시 만들 수 있다');
// 동전 던지기 분포(공정성 대략 점검): 6000회 효 값이 이론 비율에서 크게 벗어나지 않는다
{
  const rng = seeded(12345), c = { 6: 0, 7: 0, 8: 0, 9: 0 }; const N = 8000;
  for (let i = 0; i < N; i++) c[E.lineFromCoins(E.throwCoins(rng))]++;
  [[6, 1 / 8], [7, 3 / 8], [8, 3 / 8], [9, 1 / 8]].forEach(([v, p]) => assert.ok(Math.abs(c[v] / N - p) < 0.03, v + ' 비율 ' + c[v] / N));
}
// 난수원이 없으면 조용히 Math.random 으로 대체하지 않고 실패한다
{
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  assert.throws(() => E.cast(), /secure-random-unavailable/);
  if (saved) Object.defineProperty(globalThis, 'crypto', saved); else delete globalThis.crypto;
}
console.log('PASS: 8괘·64괘 구조(유일성·짝 규칙·384효), 세 동전 점법 6·7·8·9, 효 순서, 변효 0~6개 4096 조합 전수, 주희 본의 규칙, 재현성');
