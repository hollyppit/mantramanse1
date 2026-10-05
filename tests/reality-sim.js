// 현실 장면(reality.js) · 챕터별 행동 중복 검증:  node tests/reality-sim.js [--show]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'cinema', 'reality', 'translator', 'content', 'content-pro', 'content-pro2', 'verdict', 'remedy', 'media', 'scenes', 'director', 'compose'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, T = R.Translator;
const fails = []; const ok = (c, m) => { if (!c && fails.length < 40) fails.push(m); };
const now = Date.UTC(2026, 9, 6);
const HEDGE = /수 있|가능성|편이다|듯|쉽다|쉬울|기 쉬/;
const FORBID = /(반드시|무조건|확정|틀림없|이혼|사망|수명|질병|암에|수술|사고|자녀가 없|아이가 없)/;
const BASES = ['c05', 'c06', 'c08', 'c09', 'c10', 'c11', 'c13', 'c15', 'c16', 'c17'];
const lib = R.Compose.library(null), cfg = R.Chapters.forProject(null, 'full');
let n = 0, scenes = 0, empty = {};
const show = process.argv.includes('--show');
for (let y = 1960; y <= 2005; y += 3) for (const g of ['M', 'F']) {
  const m = 1 + (y * 7 + (g === 'M' ? 1 : 5)) % 12, d = 1 + (y * 3) % 27, h = (y * 5) % 24;
  const ch = M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }), sd = R.SajuData.build(ch, { now });
  n++;
  BASES.forEach(b => {
    const ss = T.chapterScenes(b, sd, R.Narrator.heroVars(sd, '지수'));
    ss.filter(s => /^rl_/.test(s.sceneId)).forEach(s => { scenes++; (s.cinema.segments || []).forEach(x => ok(x.text.length <= 22, `${y}${g} ${s.sceneId} 22자 초과: ${x.text}`)); });
    const bad = T.lint(ss); bad.forEach(x => ok(false, `${y}${g} ${b} lint ${x}`));
    ss.filter(s => /^rl_/.test(s.sceneId) && !s.basisNote).forEach(s => {
      const txt = s.cinema.segments.map(x => x.text).join(' ');
      ok(HEDGE.test(txt), `${y}${g} ${s.sceneId} 단정 완화 표현 없음: ${txt}`); ok(!FORBID.test(txt), `${y}${g} ${s.sceneId} 금지어: ${txt.match(FORBID)}`);
    });
    if (!ss.some(s => /^rl_/.test(s.sceneId))) empty[b] = (empty[b] || 0) + 1;
  });
  // 챕터별 행동 중복: 같은 행동 제목이 두 챕터에 나오면 안 된다
  const rep = R.Compose.build(sd, lib, cfg), seen = {};
  rep.chapters.filter(c => c.kind !== 'remedy' && c.kind !== 'summary').forEach(c => (c.action || []).forEach(a => { ok(!seen[a], `${y}${g} 행동 중복: "${a}" (${seen[a]} / ${c.id})`); seen[a] = c.id; }));
  const ts = {}; rep.chapters.forEach(c => (c.terms || []).forEach(x => { ok(!ts[x.term], `${y}${g} 용어 풀이 중복: ${x.term} (${ts[x.term]} / ${c.id})`); ts[x.term] = c.id; }));
  ok(rep.chapters.filter(c => c.kind === 'module' && /^c(0[1-9]|1[0-4])$/.test(c.id)).every(c => (c.action || []).length >= 1), `${y}${g} 주제 챕터에 행동이 비어 있음`);
  if (show && y === 1990 && g === 'M') {
    BASES.forEach(b => T.chapterScenes(b, sd, R.Narrator.heroVars(sd, '지수')).filter(s => /^rl_/.test(s.sceneId)).forEach(s => console.log(`[${b}] ` + s.cinema.segments.map(x => x.text.replace(/^[!~.]/, '')).join(' '))));
    rep.chapters.forEach(c => c.action && c.action.length && console.log(`ACTION ${c.id}: ${c.action.join(' | ')}`));
  }
}
console.log(`샘플 ${n}명 · 현실 장면 ${scenes}개 · 챕터별 현실 장면이 없던 횟수`, JSON.stringify(empty));
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).join('\n')); process.exit(1); }
console.log('모두 통과');
