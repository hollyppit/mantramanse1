// 운명 타임라인(report/v2/timeline.js) 검증:  node tests/timeline-sim.js
// 대운 10개·해 10개·월 12개 · 엔진 값과 일치 · 6분류 이름만 · 점수 범위 · 근거 존재 · 사주마다 다른 결과 · HTML 에 면책/기준 표시
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'luck6', 'timeline']
  .forEach(n => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', n + '.js'), 'utf8'), { filename: n + '.js' }));
const R = globalThis.ReportV2, M = globalThis.Manse, T = R.Timeline, L = R.Luck6;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 6), mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const names = new Set(L.NAMES), sig = [];
[[1992, 6, 23, 1, 'M'], [1985, 3, 14, 9, 'F'], [1978, 11, 2, 18, 'M'], [2001, 8, 30, 12, 'F']].forEach(([y, m, d, h, g], i) => {
  const ch = mk(y, m, d, h, g), tag = '#' + (i + 1), dl = T.daeun(M, ch, now), real = dl.filter(x => !x.pre);
  ok(real.length === ch.daeun.list.length && real.length >= 8, tag + ' 대운 수 ' + real.length);
  real.forEach(x => {
    const ev = ch.daeun.list[x.idx].ev;
    ok(names.has(x.six) && x.six === L.of(ev).label, tag + ' 대운 분류가 6분류·표시 계층과 일치');
    ok(x.scores.fit === Math.round(ev.fitScore), tag + ' 흐름 점수가 엔진 값과 일치');
    ok(x.rule && x.meaning, tag + ' 판정 근거·의미');
    ['money', 'career', 'love'].forEach(k => { const f = x.fields[k]; if (f) ok(f.score >= 0 && f.score <= 100 && f.band, tag + ' 분야 점수 범위 ' + k + f.score); });
  });
  ok(dl.filter(x => x.isCurrent).length === 1, tag + ' 현재 대운 정확히 1개');
  const cur = real.find(x => x.isCurrent) || real[1], ys = T.years(M, ch, cur.startYear, now);
  ok(ys.length === 10 && ys[0].year === cur.startYear && ys.every((y, k) => !k || y.year === ys[k - 1].year + 1), tag + ' 해 10개 연속');
  const y0 = ys[3], ms = T.months(M, ch, y0.year, now);
  ok(ms.length === 12 && ms.every(m => names.has(m.six) && m.ganzhi), tag + ' 월 12개');
  ok(M.seunRange(ch, y0.year, y0.year)[0].ev.fitScore !== undefined && y0.scores.fit === Math.round(M.seunRange(ch, y0.year, y0.year)[0].ev.fitScore), tag + ' 세운 점수 엔진 일치');
  // 근거: 원국·운 층 구분, 성분 비중 합, 월운은 대운·세운이 함께 반영
  const e1 = T.evidence(M, ch, cur), e2 = T.evidence(M, ch, y0), e3 = T.evidence(M, ch, ms[0]);
  ok(e1 && e1.chain.length === 1 && e1.chain[0].name === '대운' && e1.chain[0].weight === 100, tag + ' 대운 근거: 대운 단독');
  ok(e2.chain.map(c => c.name).join() === '대운,세운' && e2.chain.reduce((s, c) => s + c.weight, 0) === 100, tag + ' 세운 근거: 대운+세운 비중 합 100');
  ok(e3.chain.map(c => c.name).join() === '대운,세운,월운' && e3.chain.reduce((s, c) => s + c.weight, 0) === 100, tag + ' 월운 근거: 대운+세운+월운 비중 합 100');
  ok(e1.natal.day && e1.natal.zone && e1.comps.length >= 3 && e1.comps.every(c => c.weight > 0), tag + ' 근거: 원국 요약·성분');
  ok(Math.abs(e1.comps.reduce((s, c) => s + c.contrib, 0) - e1.own) <= 3, tag + ' 근거: 성분 기여 합 ≈ 자체 점수 (' + e1.comps.reduce((s, c) => s + c.contrib, 0).toFixed(1) + ' vs ' + e1.own + ')');
  const eh = T.evidenceHtml(e3);
  ok(/원국/.test(eh) && /대운/.test(eh) && /세운/.test(eh) && /월운/.test(eh) && /보장하지 않습니다/.test(eh) && !/undefined|NaN/.test(eh), tag + ' 근거 화면: 층 구분·면책·깨진 값 없음');
  const html = T.html({ daeun: dl, years: ys, months: ms, d: cur.idx, y: y0.year, m: ms[0].month });
  ok(/실제 사건이 일어날 확률이 아닙니다/.test(html) && /읽는 법/.test(html) && /이렇게 판정했어요/.test(html) && /근거 보기/.test(html), tag + ' 화면: 면책·기준·근거 표시');
  ok(!/undefined|NaN|\[object/.test(html), tag + ' 화면: 깨진 값 없음');
  sig.push(real.map(x => x.six).join());
});
ok(new Set(sig).size >= 3, '서로 다른 사주는 서로 다른 흐름: ' + new Set(sig).size);
console.log('타임라인 검증 완료');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
