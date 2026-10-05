// 챕터 "근거(만세력 값) → 풀이" 구조 검증:  node tests/chapter-data-sim.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'charts', 'pdf'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null), now = Date.UTC(2026, 9, 5);
let n = 0, charts = 0, empty = 0;
for (let y = 1960; y < 2006; y += 3) for (let mo = 1; mo <= 12; mo += 4) {
  const hr = (y + mo) % 5 === 0 ? null : (y * mo) % 24;
  const sd = R.SajuData.build(M.compute({ year: y, month: mo, day: 3 + (y % 24), hour: hr == null ? 12 : hr, minute: 0, calendar: 'solar', leap: false, gender: y % 2 ? 'M' : 'F', city: '서울' }), { now });
  const rep = R.Compose.build(sd, lib, cfg); n++;
  rep.chapters.forEach(c => {
    const types = c.scenes.map(s => s.sceneType), ci = types.indexOf('chart'), ii = types.indexOf('insight');
    if (ci >= 0) { ok(ii < 0 || ci < ii, c.id + ' 근거(chart)가 풀이(insight)보다 먼저'); const s = c.scenes[ci];
      ['dark', 'light'].forEach(th => { const h = R.Charts.html(s.chart, sd, { theme: th, chapter: s.chartBase }); if (!h) { empty++; ok(s.chart === 'yong' && !sd.usefulElements, c.id + ' ' + s.chart + ' 빈 결과(용신 없음일 때만 허용)'); } else { charts++; ok(!/undefined|NaN/.test(h) && /읽는 포인트/.test(h) && /role="img"/.test(h), c.id + ' ' + s.chart + ' 형식'); } }); }
  });
  const ids = rep.chapters.filter(c => c.scenes.some(s => s.sceneType === 'chart')).map(c => c.base + ':' + c.scenes.find(s => s.sceneType === 'chart').chart);
  if (n === 1) console.log('차트가 붙는 챕터:', ids.join(' '));
  R.Pdf.pages(rep, sd, {});
}
ok(n > 30 && charts > 300, '표본 수 ' + n + ' / 차트 ' + charts);
console.log('사주 ' + n + '건 · 차트 ' + charts + '개 렌더 · 빈 차트(용신 없음) ' + empty + '개');
console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n') : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
