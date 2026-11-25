// 상세풀이 '이 사주에서만 읽히는 포인트'의 장별 문단 배정률(reading-insight-sim 과 같은 표본 240개)을 한 폴더 기준으로 잰다.
//   사용: node tools/myeongri-fix-20261125/insight-rate.mjs <저장소 폴더>
import path from 'node:path'; import { pathToFileURL } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(process.argv[2]); const require = createRequire(path.join(ROOT, 'x.cjs'));
for (const f of ['reading-insight-data-1', 'reading-insight-data-2', 'reading-insight-data-3', 'reading-insight-data-4', 'reading-insight']) require(path.join(ROOT, 'report/v2/' + f + '.js'));
const RI = globalThis.ReportV2.ReadingInsight;
const V = await import(pathToFileURL(path.join(ROOT, 'editorial/rebuild-20261022/publish/verify.mjs')).href); const sds = V.sampleCharts(240, ROOT);
const ids = RI.PLAN.map(p => p[0]), per = {}, keys = {};
for (const sd of sds) for (const id of ids) { const ps = RI.paragraphs({ id }, sd); per[id] = (per[id] || 0) + (ps.length ? 1 : 0); ps.forEach(p => { const k = String(p.key).split(':')[0]; keys[k] = (keys[k] || 0) + 1; }); }
const low = ids.map(id => [id, +(per[id] / sds.length).toFixed(3)]).filter(x => x[1] < 0.99);
console.log(JSON.stringify({ charts: sds.length, patternsPerChart: +(sds.reduce((a, s) => a + ((s.patterns || []).length), 0) / sds.length).toFixed(2), below99: low, paragraphKeyCounts: keys }));
