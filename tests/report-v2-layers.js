// 레이어 조합·차트 검증:  node tests/report-v2-layers.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
const files = ['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'charts', 'pdf'];
files.forEach(f => { const p = path.join(root, 'report/v2', f + '.js'); if (fs.existsSync(p)) vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: f + '.js' }); else console.log('(없음: ' + f + '.js)'); });
const M = globalThis.Manse, R = globalThis.ReportV2, now = Date.UTC(2026, 9, 5);
const cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null);
const mk = (y, m, d, h, mi, g) => M.compute({ year: y, month: m, day: d, hour: h == null ? 12 : h, minute: mi || 0, calendar: 'solar', leap: false, gender: g, city: '서울', hourUnknown: h == null });
const cases = [['1990-05-17 14:30 남', 1990, 5, 17, 14, 30, 'M'], ['1984-02-10 06:00 여', 1984, 2, 10, 6, 0, 'F'], ['1974-09-03 23:40 남', 1974, 9, 3, 23, 40, 'M'], ['2000-12-25 시간모름 여', 2000, 12, 25, null, 0, 'F'], ['1964-01-15 11:00 남', 1964, 1, 15, 11, 0, 'M']];
// 갑목 일간이 없으면 갑목 날을 찾아 추가
const sdOf = c => R.SajuData.build(mk(c[1], c[2], c[3], c[4], c[5], c[6]), { now });
if (!cases.some(c => sdOf(c).dayMaster.stem === '갑')) {
  for (let d = 1; d < 400; d++) { const dt = new Date(Date.UTC(1992, 0, d)), c = ['갑목 탐색 ' + dt.toISOString().slice(0, 10) + ' 12:00 남', dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), 12, 0, 'M']; if (sdOf(c).dayMaster.stem === '갑') { cases.push(c); break; } }
}
let warn = 0, unresolved = [], chartErr = 0, kinds = ['elements', 'groups', 'strength'];
cases.forEach(c => {
  const sd = sdOf(c), rep = R.Compose.build(sd, lib, cfg), f = rep.facts;
  console.log('\n■ ' + c[0] + ' | 일주 ' + sd.dayPillar.ko + ' | 월지 ' + f.monthBranch + ' | groupHigh [' + f.groupHigh + '] | groupZero [' + f.groupZero + '] | ' + sd.strength.zone);
  ['c01', 'c03', 'c05', 'c08'].forEach(id => { const ch = rep.chapters.find(x => x.id === id); console.log('  ' + id + ' ' + ch.modules.join(', ')); console.log('     lead why: ' + (ch.lead.why || []).join(' / ')); });
  warn += rep.meta.warnings.length; rep.meta.warnings.forEach(w => console.log('  WARN ' + w));
  rep.chapters.forEach(ch => { const txt = [ch.headline, ch.interpretation, ch.meaning].concat((ch.details || []).map(d => d.headline + d.summary + d.detail)); txt.forEach(t => { const m = String(t || '').match(/\{[\w.가-힣]+\}/g); if (m) unresolved.push(ch.id + ' ' + m.join(',')); }); });
  const sceneOf = id => rep.chapters.find(x => x.id === id).scenes.map(s => s.sceneType + (s.chart ? ':' + s.chart : '')).join('>');
  console.log('  scenes c02 ' + sceneOf('c02')); console.log('  scenes c03 ' + sceneOf('c03'));
  kinds.forEach(k => { ['dark', 'light'].forEach(th => { try { const h = R.Charts.html(k, sd, { theme: th }); if (typeof h !== 'string' || h.length < 200 || /undefined|NaN/.test(h)) { chartErr++; console.log('  CHART BAD', k, th); } } catch (e) { chartErr++; console.log('  CHART ERR', k, e.message); } }); });
  R.Pdf.pages(rep, sd, {});
});
const gap = cases.filter(c => sdOf(c).dayMaster.stem === '갑').map(c => { const rep = R.Compose.build(sdOf(c), lib, cfg); const ch = rep.chapters.find(x => x.id === 'c03'); return c[0] + ' → c03 lead=' + ch.lead.id + ' (기대 pro_gap_m_' + rep.facts.monthBranch + ' : ' + (ch.lead.id === 'pro_gap_m_' + rep.facts.monthBranch ? 'OK' : 'NO') + ')'; });
console.log('\n① ' + (gap.length ? gap.join('\n   ') : '갑목 케이스 없음'));
console.log('② 미치환 템플릿: ' + (unresolved.length ? unresolved.join(' | ') : '0건'));
console.log('③ BANNED 경고: ' + warn + '개');
console.log('④ Charts 오류: ' + chartErr + '건');
