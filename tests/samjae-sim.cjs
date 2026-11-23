// 삼재 보조 지표 검증(2026-11-24): engine samjaeCycle 이 getSamjae 와 맞는지, 만세력 운세 흐름 탭 표시가 점수와 분리됐는지
//   node tests/samjae-sim.cjs
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a = eng.indexOf('var MANSE_DATA'), b = eng.indexOf('})(typeof window', a);
const ctx = vm.createContext({ console }); vm.runInContext(eng.slice(a, eng.indexOf('\n', b)), ctx);
const M = ctx.Manse; let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('  ✗ ' + m); } };

console.log('1. samjaeCycle ↔ getSamjae (띠 12개 × 1900~2100)');
for (let br = 0; br < 12; br++) for (let Y = 1900; Y <= 2100; Y++) {
  const sj = M.getSamjae(br, Y), c = M.samjaeCycle(br, Y);
  ok(c && c.years.length === 3, `${br} ${Y} 3년`);
  ok((c.pos >= 0) === sj.active, `${br} ${Y} active 일치`);
  if (sj.active) { ok(c.years[c.pos].year === Y && c.years[c.pos].stage === sj.stage, `${br} ${Y} 단계 ${sj.stage}`); ok(c.gap === 0, `${br} ${Y} gap 0`); }
  else { ok(c.start > Y && c.start - Y <= 9 && c.gap === c.start - Y, `${br} ${Y} 다음 시작 ${c.start}`); for (let k = Y + 1; k < c.start; k++) ok(!M.getSamjae(br, k).active, `${br} ${Y}~${c.start} 사이 비삼재`); }
  c.years.forEach(q => ok(M.getSamjae(br, q.year).stage === q.stage, `${br} ${q.year} 바퀴 단계`));
  ok(c.next === c.start + 12, `${br} ${Y} 12년 주기`);
}
console.log('2. 알려진 값: 子띠(申子辰) 2022 들·2023 눌·2024 날, 酉띠(巳酉丑) 2031~2033');
{ const c = M.samjaeCycle(0, 2023); ok(c.start === 2022 && c.pos === 1 && c.years[1].stage === '눌삼재', '子띠 2023 눌삼재'); }
{ const c = M.samjaeCycle(9, 2026); ok(c.pos === -1 && c.start === 2031 && c.gap === 5, '酉띠 2026 → 2031 시작 5년 뒤'); }
{ const c = M.samjaeCycle(6, 2026); ok(c.pos === -1 && c.start === 2028, '午띠 2026 → 2028(申년) 시작'); }

console.log('3. 만세력 화면 표시: 점수와 분리 · 3색 신호와 다른 색');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
ok(/--samjae:\s*#4A47C9/.test(html), '--samjae 색 정의');
ok(!/--sg-(good|ok|care):\s*#4A47C9/i.test(html), '3색 신호와 같은 색 아님');
ok(html.includes('function samjaeLayer(') && (html.match(/samjaeLayer\(\{/g) || []).length === 2, '연도 그래프 2종(흐름·지표)에 삼재 층');
ok(html.includes('function samjaeBox(') && html.includes('${samjaeBox('), '연도별 흐름 카드에 삼재 상자');
ok(html.includes('sw sj-sw') && html.includes('삼재 3년</b>'), '범례에 삼재 빗금');
ok(!/data-term="\$\{sj\.stage\}">[^`]*var\(--d-chg\)/.test(html), '삼재 배지에 변화 신호 색(--d-chg) 안 씀');
['들삼재', '눌삼재', '날삼재'].forEach(k => ok(new RegExp(`'${k}': \\['[^']+', '[^']{30,}'\\]`).test(html), `${k} 생활 조심 문안`));
const sjFn = html.slice(html.indexOf('function samjaeLayer('), html.indexOf('function drawLife('));
ok(!/combined|score|luckV/.test(sjFn), '그래프 삼재 층이 점수를 읽거나 바꾸지 않음');
ok(!/겁나|무서|큰일|재앙|화를 당|불행/.test(html.slice(html.indexOf('const SJ_STAGE'), html.indexOf('function samjaeBox('))), '겁주는 표현 없음');

console.log(fail ? `\n✗ ${fail}/${n} 실패` : `\n✓ 삼재 검증 ${n}항목 통과`);
process.exit(fail ? 1 : 0);
