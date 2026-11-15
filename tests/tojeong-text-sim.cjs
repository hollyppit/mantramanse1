// 토정비결 원문(규장각 奎古 1077 판독본) 구조 검사. 네트워크·AI 호출 없음.
const assert = require('assert/strict');
const T = require('../report/newyear/texts/tojeong-kyu1077.js');

const want = []; for (let a = 1; a <= 8; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 3; c++) want.push(a * 100 + b * 10 + c);
const have = Object.keys(T.gua).map(Number).sort((x, y) => x - y);

// 1) 괘 번호: 144괘 중 스캔본에 없는 괘만 빠지고, 빠진 목록이 meta 에 정확히 적혀 있다
assert.deepEqual([...have, ...T.meta.missing].sort((x, y) => x - y), want, '있는 괘 + 빠진 괘 = 144괘');
assert.ok(have.every(g => want.includes(g)), '없는 번호가 끼어 있지 않음');
assert.deepEqual(T.meta.missing, [663, 711, 862, 863], '빠진 괘(스캔본 누락) 목록');

// 2) 면 순서: 괘 번호 순서와 면 순서가 같다(판독 번호 오류를 잡는다)
const sides = have.map(g => T.gua[g].side);
assert.deepEqual([...sides].sort(), sides, '괘 번호 순서 = 면 순서');

// 3) 구조: 괘상 2구, 괘사 9구, 월마다 3구, 모든 구 4자
for (const g of have) {
  const v = T.gua[g];
  assert.equal(v.guaxiang.length, 2, g + ' 괘상');
  assert.equal(v.guaci.length, 9, g + ' 괘사 9구');
  for (let m = 1; m <= 12; m++) assert.equal(v.months[m].length, 3, `${g} ${m}월 3구`);
  for (const p of [v.guaxiang, ...v.guaci, ...Object.values(v.months).flat()].flat()) assert.equal([...p].length, 4, `${g} '${p}' 4자`);
  assert.ok(!/[가-힣]/.test([v.guaxiang, ...v.guaci, ...Object.values(v.months).flat()].flat().join('')), g + ' 본문에 한글 풀이가 섞이지 않음');
}

// 4) 주역 괘 이름: 앞 두 자리가 같은 괘끼리 본괘 이름이 같다(번호·이름 대조)
const head = z => String(z).split('之')[0];
const byHead = {};
for (const g of have) { const k = Math.floor(g / 10), h = head(T.gua[g].zhouyi); if (/□/.test(h)) continue; (byHead[k] = byHead[k] || new Set()).add(h); }
for (const [k, s] of Object.entries(byHead)) assert.equal(s.size, 1, `${k}x 본괘 이름이 하나: ${[...s]}`);

// 5) 괘상 = 위 단 괘사 첫 구(판본의 규칙). 인쇄가 다른 곳은 알려진 예외만 허용
const KNOWN = { 152: '棟樑/棟梁(인쇄 차이, 두 판독 모두 확인)', 533: '雙手提弓/隻手提弓(인쇄 차이, 두 판독 모두 확인)' };
for (const g of have) {
  const v = T.gua[g];
  if (/□/.test(v.guaxiang.join('') + v.guaci[0].join(''))) continue;
  if (KNOWN[g]) continue;
  assert.deepEqual(v.guaxiang, v.guaci[0], g + ' 괘상 = 괘사 첫 구');
}

// 6) 111괘 기준 판독(사람이 직접 확인한 값)
assert.deepEqual(T.gua[111].guaxiang, ['東風解凍', '枯木逢春']);
assert.equal(T.gua[111].zhouyi, '乾之姤');
assert.deepEqual(T.gua[111].guaci.slice(0, 3), [['東風解凍', '枯木逢春'], ['月明中天', '天地明朗'], ['君謀大事', '何必疑慮']]);
assert.deepEqual(T.gua[111].months[1][0], ['春化日暖', '鳳雛麟閣']);
assert.deepEqual(T.gua[162].guaxiang, ['夏雲起處', '魚龍浴水']);

// 7) 출처·상태 기록
assert.equal(T.meta.status, 'transcribed-unreviewed');
assert.ok(/奎古 1077/.test(T.meta.source));

// 8) 보충본(국중도 필사본): 규장각본에 없는 4괘를 정확히 채우고, 4자 구 형식이며 한글이 섞이지 않는다
const S = require('../report/newyear/texts/tojeong-nl-supplement.js');
assert.deepEqual(Object.keys(S.gua).map(Number).sort((a, b) => a - b), T.meta.missing, '보충 괘 = 빠진 괘');
for (const [g, v] of Object.entries(S.gua)) {
  assert.ok(v.front.length >= 8 && v.back.length >= 8, g + ' 보충 구 수');
  for (const p of [...v.front, ...v.back]) { assert.equal([...p].length, 4, `${g} '${p}' 4자`); assert.ok(!/[가-힣]/.test(p)); }
  assert.ok(v.frontPage && v.backPage, g + ' 출처 면');
}
assert.ok(/CNTS-00076808100/.test(S.meta.source));

const illegible = have.reduce((n, g) => n + T.gua[g].review.illegible.length, 0);
console.log(`tojeong-text-sim ok: ${have.length}괘, 빠진 괘 ${T.meta.missing.join('·')}, 판독 불가 칸 ${illegible}`);
