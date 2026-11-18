// 챕터 고도화 3묶음 검증: 안 쓰던 엔진 블록(report/v2/engine-blocks.js)
//   node tests/engine-blocks-sim.cjs
// 전체 인생 흐름 ← 30년 대운 구간, 나의 타고난 기질·자동차 비유 ← 격국. 엔진 값과 일치·빈 값·금지 표현·점수 불변·연결을 본다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
require(path.join(root, 'luck-cycle.js')); require(path.join(root, 'gyeok-structure.js'));
const E = require(path.join(root, 'report/v2/engine-blocks.js')), L = globalThis.MantraLuckCycle, GS = globalThis.MantraGyeokStructure;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const BAN = /반드시|무조건|대박|대길|대흉|망합니다|성공합니다|실패합니다|확정|틀림없/;

ok(E.html({ id: 'timeline_self_20' }) === '', '사주를 정하기 전에는 블록이 비어야 함');
let seed = 2611; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; let n = 0, has20 = 0;
for (let i = 0; i < 150; i++) {
  let ch; try { ch = M.compute({ year: 1945 + Math.floor(rnd() * 75), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 9 ? Math.floor(rnd() * 24) : '', minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { continue; }
  n++; const snap = JSON.stringify(ch.daeun.list.map(x => [x.ev.fitScore, x.score.total]));
  E.set(M, ch);
  const h20 = E.html({ id: 'timeline_self_20' }), h03 = E.html({ editorialContractId: 'timeline_self_03' }), h02 = E.html({ id: 'timeline_self_02' });
  [h20, h03, h02].forEach((h, k) => { ok(!/undefined|NaN|null|\[object/.test(h), `블록 ${k} 빈 값(사주 ${i})`); ok(!BAN.test(strip(h)), `블록 ${k} 금지 표현`); });
  if (h20) {
    // 2026-11-18: 30년 구간 판정(한 오행·한 길흉)을 걷고 장기 운세 요약(대운 3개를 순서대로 + 사이 변화)으로 바꿨다
    has20++; const ls = L.longSummary(M, ch);
    ok((h20.match(/<li>/g) || []).length === ls.rows.length + ls.shifts.length, '장기 요약 줄 수가 엔진과 다름');
    ls.rows.forEach(x => ok(h20.includes(x.startAge + '세 ' + x.gz + ' 대운') && h20.includes(x.condition), `대운 ${x.startAge}세 ${x.gz} 표시 누락`));
    ok(!/중심 · |30년의 계절|흐름 (순풍|맞바람|도움과 부담이 섞임)<\/small>/.test(h20), '30년을 한 오행·한 길흉으로 묶은 표현이 남음');
  }
  const g = GS.analyze(M, ch);
  ok(h03.includes(g.rep.type === 'hold' ? '격국 판정 유보' : g.rep.name), '기질 장 격국 이름이 판정과 다름');
  g.major.slice(0, 2).forEach(o => ok(h03.includes(o.name), `기질 장에 주요 구조 ${o.name} 없음`));
  ok(h02.includes('설계도') && h02.includes('차체 상태'), '자동차 장 설계도 블록 구조 오류');
  ok(E.html({ id: 'timeline_self_18' }) === '', '다른 장에 블록이 붙음');
  ok(JSON.stringify(ch.daeun.list.map(x => [x.ev.fitScore, x.score.total])) === snap, '블록을 만든 뒤 점수가 바뀜');
}
ok(n >= 140 && has20 >= n * 0.9, `검증 사주 부족 또는 장기 요약 블록이 너무 적음(${has20}/${n})`);
// 엔진 모듈이 없으면 블록 없음
const keep = globalThis.MantraGyeokStructure; globalThis.MantraGyeokStructure = undefined; ok(E.html({ id: 'timeline_self_03' }) === '', '격국 모듈이 없을 때 블록이 붙음'); globalThis.MantraGyeokStructure = keep;

const read = p => fs.readFileSync(path.join(root, p), 'utf8');
for (const [file, pat, msg] of [
  ['report/v2/index.html', /age-fit\.js[^"]*"><\/script><script src="\/luck-cycle\.js[^"]*"><\/script><script src="engine-blocks\.js/, '타임라인 화면에 30년 사이클·엔진 블록 스크립트가 없음'],
  ['report/v2/index.html', /<script src="\/gyeok-structure\.js/, '타임라인 화면에 격국 모듈이 없음'],
  ['report/v2/viewer.js', /if \(R\.EngineBlocks\) R\.EngineBlocks\.set\(window\.Manse, ch\);/, 'viewer 가 사주를 넘기지 않음'],
  ['report/v2/reading-text.js', /R\.EngineBlocks\.html\(c,esc\)/, '본문에 엔진 블록 연결이 없음'],
  ['tools/timeline-chapter-audit.cjs', /'engine-blocks'/, '감사 도구가 엔진 블록을 불러오지 않음']]) ok(pat.test(read(file)), msg);
ok(!/fitScore|LUCK_CFG|evaluateLuck|integrateYongsin/.test(read('report/v2/engine-blocks.js').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), '엔진 블록이 점수를 읽음');

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + [...new Set(fails)].slice(0, 20).join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 사주 ${n}명(장기 요약 블록 ${has20}) · 구간·격국·주요 구조 일치 · 빈 값·금지 표현 없음 · 점수 불변 · 연결`);
