// 천명의 서고(report/v2/library.js) 검증:  node tests/library-sim.js
// 기둥 4개·글자/십성이 엔진 값과 일치 · 십성군 비중 합 · 같은 십성의 자리 표시 · 시간 모름 처리 · 새 문장을 만들지 않고 기존 텍스트만 사용
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer', 'content-v3', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'reading-answer', 'life-doc', 'library']
  .forEach(n => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', n + '.js'), 'utf8'), { filename: n + '.js' }));
const R = globalThis.ReportV2, M = globalThis.Manse, Lb = R.Library;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 6), mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const cases = [mk(1992, 6, 23, 1, 'M'), mk(1985, 3, 14, 9, 'F'), mk(1978, 11, 2, 18, 'M'), mk(2001, 8, 30, 12, 'F'), mk(1990, 1, 5, '', 'F')];
cases.forEach((ch, i) => {
  const tag = '#' + (i + 1), sd = R.SajuData.build(ch, { now }), m = Lb.model(M, ch, sd);
  ok(m.pillars.map(p => p.key).join() === 'hour,day,month,year', tag + ' 시일월년 순서');
  m.pillars.forEach(p => {
    const src = ch.pillars[p.key];
    if (!src) { ok(p.unknown, tag + ' 시간 모름은 비움'); return; }
    ok(p.stem.han === M.STEM[src.s] && p.branch.han === M.BR[src.b], tag + ' 글자 일치 ' + p.key);
    ok(p.stem.tg === ch.cells[p.key].stemTG && p.branch.tg === ch.cells[p.key].branchTG, tag + ' 십성 일치 ' + p.key);
    ok(p.hidden.length === (ch.cells[p.key].hidden || []).length, tag + ' 지장간 수 ' + p.key);
    ok(p.role && p.stem.el && p.branch.el, tag + ' 자리 의미·오행 ' + p.key);
  });
  ok(m.groups.length === 5 && Math.abs(m.groups.reduce((s, g) => s + g.pct, 0) - 100) <= 3, tag + ' 십성군 비중 합 ' + m.groups.reduce((s, g) => s + g.pct, 0));
  ok(m.groups.filter(g => g.isTop).length === 1 && m.groups.filter(g => g.isLow).length === 1, tag + ' 최고·최저 각 1개');
  m.groups.forEach(g => { ok(g.head && g.real.length && g.pro && g.trap && g.action, tag + ' 기존 풀이 텍스트 연결 ' + g.key); if (g.pct === 0) ok(g.where.every(w => /지장간/.test(w.part)) || g.where.length === 0, tag + ' 0%인 군의 자리 표시 일관성 ' + g.key); });
  // 십성군 선택 시 해당 군 글자만 강조, 기둥 선택 시 상세
  const top = m.groups.find(g => g.isTop), html = Lb.html(m, { g: top.key, p: 'day' });
  const hits = (html.match(/lb-c el\d hit/g) || []).length, expect = m.pillars.reduce((s, p) => s + (p.unknown ? 0 : (p.stem.group === top.key ? 1 : 0) + (p.branch.group === top.key ? 1 : 0)), 0);
  ok(hits === expect, tag + ' 같은 십성 강조 ' + hits + '/' + expect);
  ok(/원국에 드러난 자리|직접 드러나지 않습니다/.test(html) && /지장간/.test(html) && /성향의 결/.test(html) && /부재를 뜻하지는 않습니다/.test(html), tag + ' 상세·단정 방지 문구');
  ok(!/undefined|NaN|\[object/.test(html), tag + ' 깨진 값 없음');
});
console.log('천명의 서고 검증 완료');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
