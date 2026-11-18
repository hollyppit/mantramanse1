// 엔진 패턴 목록 ↔ 십성 작용 판정 맞추기(ten-god-roles.js agreePatterns, 2026-11-18) — node tests/pattern-agree-sim.cjs
//  · 십성 판정이 '성립 안 함'으로 본 구조만 뺀다(약하게 성립·판정이 다루지 않는 패턴은 그대로) · 엔진 ch.patterns 는 바뀌지 않음
//  · 사전 풀이·화면이 모두 이 함수를 거친다(서사 엔진·흐름 장·사주 데이터(서버 문안 선택)·만세력 운세 해석·'이 사주에서 보이는 패턴')
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'ten-god-roles.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, T = ctx.MantraTenGodRoles; let n = 0, dropped = 0, kept = 0;
for (let i = 0; i < 300; i++) {
  let ch; try { ch = M.compute({ year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' }); } catch (e) { continue; } n++;
  const before = JSON.stringify(ch.patterns.list), r = T.agreePatterns(M, ch), st = {}; T.analyze(M, ch).interactions.forEach(it => { st[it.name] = it.status; });
  assert.equal(JSON.stringify(ch.patterns.list), before, '엔진 패턴 불변');
  ch.patterns.list.forEach(p => { const k = T.PAT_MAP[p.name], gone = r.dropped.includes(p.name);
    if (k && st[k] === 'off') { assert.ok(gone, '성립 안 함인데 남음 ' + p.name); dropped++; } else { assert.ok(!gone && r.includes(p), '빼면 안 되는 패턴이 빠짐 ' + p.name); kept++; } });
}
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
for (const [f, g] of [['report/v2/life-narrative.js', 'root'], ['report/v2/flow-chapters.js', 'root'], ['report/v2/saju-data.js', 'root'], ['luck-interpret.js', 'G']]) assert.ok(rd(f).includes(g + '.MantraTenGodRoles.agreePatterns(' + g + '.Manse, ch)'), f + ' 연결');
assert.ok(rd('index.html').includes('T.agreePatterns(M, ch).dropped') && rd('luck-layers-view.js').includes('TGr.agreePatterns(M, ch).dropped'), '패턴 표시 연결');
assert.ok(/<script src="\/ten-god-roles\.js[^"]*"><\/script>/.test(rd('report/v2/index.html')), '풀이 화면이 판정 모듈을 먼저 읽음');
assert.ok(rd('report/v2/viewer.js').includes('MantraSignalColors.paint(el)') && /signal-colors\.js/.test(rd('report/v2/index.html')), '풀이 화면 신호 색');
console.log(`pattern-agree-sim ok · 사주 ${n}명 · 뺀 패턴 ${dropped} · 남긴 패턴 ${kept} · 엔진 불변 · 연결`);
