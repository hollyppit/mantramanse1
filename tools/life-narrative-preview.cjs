// 서사 엔진 사주별 미리보기(관리자 검수용):
//   node tools/life-narrative-preview.cjs                         → 표본 사주 8명
//   node tools/life-narrative-preview.cjs 1992-06-23 01:45 M      → 한 사람(시간 모르면 - )
// 결과: output/life-narrative-preview/index.html — 장별 후킹·5단계·근거·적용 조건·규칙 선택 이유(trace)·장 사이 중복 문장 표시
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), outDir = path.join(root, 'output', 'life-narrative-preview');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'report/v2/life-narrative-data.js', 'report/v2/life-narrative-data-self.js', 'report/v2/life-narrative-data-self2.js', 'report/v2/life-narrative-data-wealth.js', 'report/v2/life-narrative-data-wealth2.js', 'report/v2/life-narrative-data-love.js', 'report/v2/life-narrative-data-love2.js', 'report/v2/life-narrative.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, L = ctx.MantraLifeNarrative, NOW = Date.now();
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const [d, t, g] = process.argv.slice(2);
const people = d ? [{ year: +d.slice(0, 4), month: +d.slice(5, 7), day: +d.slice(8, 10), hour: t && t !== '-' ? +t.slice(0, 2) : null, minute: t && t !== '-' ? +t.slice(3, 5) : 0, gender: g === 'F' ? 'F' : 'M' }]
  : [[1992, 6, 23, 1, 'M'], [1990, 3, 15, 14, 'F'], [1975, 1, 9, 7, 'F'], [1968, 8, 30, 22, 'M'], [2001, 11, 2, 9, 'F'], [1985, 12, 24, null, 'M'], [1958, 4, 5, 5, 'F'], [1979, 7, 17, 16, 'M']].map(([y, m, dd, h, gg]) => ({ year: y, month: m, day: dd, hour: h, minute: 0, gender: gg }));
let html = '<!doctype html><meta charset="utf-8"><title>서사 엔진 미리보기</title><style>body{font:15px/1.65 system-ui,sans-serif;max-width:920px;margin:24px auto;padding:0 16px;color:#222}h1{font-size:22px}h2{margin-top:40px;border-top:3px solid #333;padding-top:12px}h3{margin:22px 0 4px;color:#7a5200}.hook{font-size:18px;font-weight:700}.stage{margin:8px 0}.stage b{display:block;color:#555;font-size:13px}.ev{background:#f6f3ea;padding:8px 12px;border-radius:8px;font-size:13px}.tr{font-size:12px;color:#666}.dup{background:#ffe2e2}.tag{display:inline-block;background:#eef;border-radius:6px;padding:0 6px;margin:2px;font-size:12px}p{white-space:pre-wrap;margin:4px 0}</style><h1>운명의 타임라인 서사 엔진 미리보기</h1><p>' + esc(L.version) + ' · 기준 시각 ' + new Date(NOW).toISOString().slice(0, 10) + '. 노란 칸 = 명리 근거(사용자 화면에서는 펼쳐보기). 붉은 칸 = 장 사이 중복 문장(있으면 안 됨).</p>';
for (const inp of people) {
  const ch = M.compute(inp), P = L.profile(M, ch), seen = new Map();
  html += `<h2>${inp.year}-${inp.month}-${inp.day} ${inp.hour == null ? '시간 모름' : inp.hour + '시'} ${inp.gender === 'F' ? '여' : '남'} · ${M.gzName(ch.pillars.year)} ${M.gzName(ch.pillars.month)} ${M.gzName(ch.pillars.day)} ${ch.pillars.hour ? M.gzName(ch.pillars.hour) : '--'}</h2>`;
  html += '<div>' + Object.keys(P.tags).map(k => `<span class="tag" title="${esc(P.tags[k])}">${esc(k)}</span>`).join('') + '</div><p class="tr">통합 판단: ' + esc(ch.unified.headline) + '</p>';
  for (const id of Object.keys(L.CHAPTERS)) {
    const r = L.compose(M, ch, NOW, id);
    html += `<h3>${esc(id)}</h3>`;
    if (!r) { html += '<p class="tr">맞는 복합 규칙 없음 → 기존 DB 문안이 그대로 나옵니다.</p>'; continue; }
    html += `<p class="hook">${esc(r.hook)}</p><p class="tr">규칙: ${esc(r.rule)}</p>`;
    for (const row of r.rows) {
      const body = row.text.split(/(?<=[.!?])\s+/).map(s => { const k = s.replace(/[\s.,!?·—'"‘’“”()]/g, ''); if (k.length >= 12 && seen.has(k)) return `<span class="dup" title="${esc(seen.get(k))}와 중복">${esc(s)}</span>`; if (k.length >= 12) seen.set(k, id); return esc(s); }).join(' ');
      html += `<div class="stage"><b>${esc(row.label)}</b><p>${body}</p></div>`;
    }
    html += '<div class="ev">' + r.evidence.lines.map(x => '<p>' + esc(x) + '</p>').join('') + '<p>용어: ' + r.evidence.terms.map(x => esc(x.term)).join(' · ') + '</p></div>';
    if (r.trace.length) html += '<details class="tr"><summary>규칙 선택 기록 ' + r.trace.length + '개</summary>' + r.trace.map(x => esc(x.id) + ' — ' + esc(x.result)).join('<br>') + '</details>';
  }
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('미리보기:', path.join(outDir, 'index.html'), '· 사주', people.length + '명');
