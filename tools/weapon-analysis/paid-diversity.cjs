// 유료 상세풀이 주무기 블록 다양성 측정:  node tools/weapon-analysis/paid-diversity.cjs [--json]
//  · 주제별로 300명식(dev 생성식) 블록을 만들고, 숫자·간지·연도를 지운 '틀'이 몇 가지인지(고유 틀 수)
//  · 문장별로 몇 %의 명식에 똑같이 나오는지(공통 문장) — 30% 넘게 겹치는 문장은 개인화가 약한 문장
//  · 시기 줄: 같은 명식 안에서 같은 문장이 반복되는지(블록 안 반복)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8')); globalThis.window = globalThis;
['luck-grade', 'ten-god-roles', 'weapon-data', 'weapon'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8')));
['weapon-chapters-data', 'weapon-chapters'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8')));
const M = globalThis.Manse, WC = globalThis.ReportV2.WeaponChapters, now = Date.UTC(2026, 10, 26);
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const txt = h => String(h || '').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = s => s.replace(/[一-鿿]+/g, '◇').replace(/\d+(\.\d+)?/g, '#').replace(/(목|화|토|금|수)(?=[\s(·,]|$)/g, '○');
const sentences = h => txt(h).split(/(?<=[.!?요])\s+|(?<=이에요|예요)\s+/).map(s => s.trim()).filter(s => s.length >= 14);
const rows = WC.DEFAULT_ROWS, ids = Object.keys(rows);
const out = {};
ids.forEach(id => { out[id] = { topic: rows[id].topic, view: rows[id].view || 'block', n: 0, frames: new Set(), sent: new Map(), inBlockRepeat: 0, sentPerBlock: 0 }; });
dev.forEach(inp => {
  const ch = M.compute(inp), H = { M, ch, now, name: '' };
  ids.forEach(id => {
    const h = WC.previewRow(H, rows[id]); if (!h) return; const o = out[id]; o.n++;
    o.frames.add(norm(txt(h)));
    const ss = sentences(h), seen = new Set(); o.sentPerBlock += ss.length;
    ss.forEach(s => { const k = norm(s); if (seen.has(k)) o.inBlockRepeat++; seen.add(k); });
    seen.forEach(k => o.sent.set(k, (o.sent.get(k) || 0) + 1));
  });
});
const report = ids.map(id => {
  const o = out[id], common = [...o.sent.entries()].filter(([, c]) => c / o.n >= 0.3).sort((a, b) => b[1] - a[1]);
  return { id, topic: o.topic, view: o.view, blocks: o.n, uniqueFrames: o.frames.size, sentencesPerBlock: Math.round(o.sentPerBlock / Math.max(1, o.n) * 10) / 10, inBlockRepeat: o.inBlockRepeat, distinctSentences: o.sent.size,
    commonOver30: common.length, commonTop: common.slice(0, 6).map(([s, c]) => Math.round(c / o.n * 100) + '% ' + s.slice(0, 70)) };
});
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 1));
else report.forEach(r => { console.log(`\n■ ${r.id} (${r.topic}/${r.view}) 블록 ${r.blocks} · 고유 틀 ${r.uniqueFrames} · 블록당 문장 ${r.sentencesPerBlock} · 블록 안 반복 ${r.inBlockRepeat} · 서로 다른 문장 ${r.distinctSentences} · 30%↑ 공통 ${r.commonOver30}`); r.commonTop.forEach(s => console.log('   ' + s)); });
