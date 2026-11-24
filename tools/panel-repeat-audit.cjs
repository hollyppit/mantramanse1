// 상세풀이 패널 이미지 중복 검사(2026-11-24)
// 사용: node tools/panel-repeat-audit.cjs <media:index JSON> [assets:map JSON] [--out 파일]
//   운영 패널 목록(Cloudflare KV media:index)과 자산 지도(assets:map)를 읽기 전용으로 받아 둔 파일을 넣는다.
//   사주 여러 명 × 리포트 전 장에 실제 화면과 같은 방식으로 패널을 배정하고, 한 리포트 안에서 같은 그림이 두 번 이상 나오는지 센다.
//   viewer.js 의 배정(ReadingMedia.planReport, 읽는 순서대로·이미 쓴 그림 제외)과 예전 방식(장마다 따로 pick)을 함께 잰다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : ''; };
const [mediaFile, assetsFile] = process.argv.slice(2).filter(a => !a.startsWith('--') && a !== arg('out'));
global.window = globalThis;
for (const f of ['engine.js', 'report/v2/saju-data.js', 'report/v2/reading-catalog.js', 'report/v2/reading-media.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const R = globalThis.ReportV2, M = globalThis.Manse, RM = R.ReadingMedia;
const PUBLIC = ['approved', 'published', 'active', 'released'];
const isPublic = m => !!m && m.enabled === true && m.tagsApproved === true && m.approved !== false && m.published !== false && ['state', 'status'].every(k => m[k] == null || m[k] === '' || PUBLIC.includes(m[k])) && !!(m.url || m.posterUrl);
const media = JSON.parse(fs.readFileSync(mediaFile, 'utf8')).filter(isPublic).map(({ pending, bytes, uploadedAt, ...pub }) => pub);
const assets = assetsFile ? JSON.parse(fs.readFileSync(assetsFile, 'utf8')) : {};
const chapters = (globalThis.MantraEditorial.defaults().chapters || []).filter(c => c.state !== 'archived' && /^timeline_/.test(c.id)).sort((a, b) => (a.order || 0) - (b.order || 0)).map(c => ({ id: c.id, editorialContractId: c.id, editorialTopicId: c.topicId }));
const BIRTHS = [[1992, 6, 23, 7, 'M'], [1985, 11, 2, 14, 'F'], [1970, 3, 9, 7, 'M'], [2001, 8, 30, 22, 'F'], [1960, 1, 15, 3, 'F'], [1997, 4, 4, 9, 'M'], [1978, 12, 12, 18, 'F'], [1988, 7, 7, 11, 'M'], [1995, 2, 19, 0, 'F'], [1965, 9, 28, 16, 'M'], [2008, 5, 5, 5, 'F'], [1982, 10, 10, 20, 'M']];
const ident = m => m && (m.poster || m.video);
const out = { media: media.length, chapters: chapters.length, charts: [], before: { repeats: 0, panels: 0 }, after: { repeats: 0, panels: 0, emptied: 0 } };
for (const [y, mo, d, h, g] of BIRTHS) {
  const ch = M.compute({ year: y, month: mo, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }), sd = R.SajuData.build(ch, { now: Date.UTC(2026, 10, 24) });
  const pool = media.concat(RM.fromAssets(assets, {}, sd));
  const count = list => { const seen = {}; let rep = 0, n = 0; Object.entries(list).forEach(([cid, arr]) => (arr || []).forEach(m => { n++; const k = ident(m); if (seen[k]) rep++; (seen[k] = seen[k] || []).push(cid); })); return { rep, n, top: Object.entries(seen).filter(x => x[1].length > 1).sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(x => x[1].length + '장: ' + x[0].split('/').pop()) }; };
  const before = {}; chapters.forEach(c => { before[c.id] = RM.pick(pool, c, sd, 3); });
  const b = count(before); out.before.repeats += b.rep; out.before.panels += b.n;
  const row = { birth: [y, mo, d, h, g].join('-'), before: { panels: b.n, repeats: b.rep, top: b.top } };
  if (RM.planReport) { const after = RM.planReport(pool, chapters, sd, 3), a = count(after); out.after.repeats += a.rep; out.after.panels += a.n; const emptied = chapters.filter(c => (before[c.id] || []).length && !(after[c.id] || []).length).length; out.after.emptied += emptied; row.after = { panels: a.n, repeats: a.rep, emptiedChapters: emptied }; }
  out.charts.push(row);
}
console.log('패널 목록 ' + out.media + '개 · 장 ' + out.chapters + '개 · 사주 ' + BIRTHS.length + '명');
console.log('예전(장마다 따로): 패널 ' + out.before.panels + '개 중 같은 리포트 안 반복 ' + out.before.repeats + '개');
if (RM.planReport) console.log('지금(리포트 전체 배정): 패널 ' + out.after.panels + '개 중 반복 ' + out.after.repeats + '개 · 패널이 없어진 장 ' + out.after.emptied + '개(사주 12명 합)');
out.charts.slice(0, 3).forEach(r => console.log(' ', r.birth, '예전 반복', r.before.repeats, r.before.top.join(' / ')));
if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(out, null, 1));
