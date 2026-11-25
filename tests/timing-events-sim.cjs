// 사건별 타이밍 표(report/v2/timing-events.js) 검증:  node tests/timing-events-sim.cjs [사주 수=200]
//  · 커리어(취업·이직·승진·독립)·인연(새 인연·연애 시작·결혼)·재물(큰돈·수입) 사건마다 해가 엔진 값과 맞는지
//  · '움직이기 좋은 해'는 같은 장 그래프 순위(ReadingFeature.rank) 상위 4 + 흐름이 무겁지 않을 때만
//  · 이직 해 = 이직 장(career_08) 서사, 결혼 해 = 결혼운 장(love_08) 서사와 같은 해(장 사이 엇갈림 없음)
//  · 20세 미만: 커리어만(이직·독립 없음, 진로 말), 인연·재물 블록 없음 · 65세 이상: 취업 없음
//  · 실제 블록 조립 경로(ReadingFeature.build)로 커리어·인연·재물 타이밍 장(_14) 끝에 붙는지 · 결정론 · 금지 표현 · 명식마다 다른 결과
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 200;
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' }); globalThis.window = globalThis; globalThis.MANTRA_FLAGS = { lifeNarrative: true };
['gyeok-structure', 'wealth-career-data', 'wealth-career-data-2', 'wealth-career-data-3', 'wealth-career-jobs', 'wealth-career', 'element-strategy', 'aptitude-data', 'aptitude'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8'), { filename: f }));
const dir = path.join(root, 'report/v2'), load = f => vm.runInThisContext(fs.readFileSync(path.join(dir, f + '.js'), 'utf8'), { filename: f });
['fact-once', 'ilju-data', 'saju-data', 'deep', 'deep-life', 'deep-time', 'deep-wealth', 'deep-love', 'reading-feature-data-1', 'reading-feature-data-2', 'reading-feature', 'reading-text', 'age-fit', 'life-narrative-data', 'life-narrative-data-self', 'life-narrative-data-self2', 'life-narrative-data-wealth', 'life-narrative-data-wealth2', 'life-narrative-data-love', 'life-narrative-data-love2', 'life-narrative-data-career', 'life-narrative-data-career2', 'life-narrative-data-self3', 'life-narrative-data-wealth3', 'life-narrative-data-extra', 'life-narrative', 'aptitude-chapters-data', 'aptitude-chapters', 'timing-events'].forEach(load);
const M = Manse, R = ReportV2, TE = R.TimingEvents, FEAT = R.ReadingFeature, L = R.LifeNarrative, J = x => JSON.stringify(x);
const BAN = /반드시|무조건|확실히|틀림없|보장|대박|성공합니다|undefined|NaN|null|\{[a-z]+\}/;
const yearsIn = (t, lead) => { const i = t.indexOf(lead); if (i < 0) return null; const seg = t.slice(i + lead.length).split(/이에요|예요/)[0]; return [...seg.matchAll(/(20\d\d)/g)].map(m => +m[1]).filter((v, k, a) => a.indexOf(v) === k).sort(); };
const cnt = { has: {}, go: {}, yrs: {}, n: 0, kid: 0, senior: 0, fit: {} };
for (let i = 0; i < N; i++) {
  const kid = i % 12 === 0, sen = i % 12 === 6;
  const inp = { year: kid ? 2009 + (i % 8) : sen ? 1945 + (i % 12) : 1960 + (i * 7) % 45, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: i % 13 === 0 ? null : (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  const ch = M.compute(inp), now = Date.UTC(2026, 10, 26), before = J({ w: ch.weights, s: ch.strength, u: ch.unified }), age = 2026 - inp.year;
  for (const topic of ['career', 'love', 'wealth']) {
    const o = TE.build(M, ch, now, topic), o2 = TE.build(M, ch, now, topic);
    assert.equal(J(o), J(o2), '결정론');
    if (age < 20 && topic !== 'career') { assert.equal(o, null, '20세 미만 ' + topic + ' 없음'); continue; }
    assert.ok(o && o.events.length, topic + ' 결과');
    const ids = o.events.map(e => e.id);
    if (age < 20) assert.ok(!ids.includes('move') && !ids.includes('indep'), '20세 미만 이직·독립 없음');
    if (age >= 65) assert.ok(!ids.includes('job'), '65세 이상 취업 없음');
    const rk = FEAT.rank(M, ch, now, topic, 'year'), fr = {}; rk.forEach((r, k) => { fr[r.y] = k; });
    const rows = TE.rows(M, ch, now), byY = {}; rows.forEach(r => { byY[r.y] = r; });
    o.events.forEach(e => {
      e.years.forEach(x => {
        assert.ok(x.y >= 2026 && x.y <= 2035 && x.why, '해 범위·이유');
        const r = byY[x.y], def = TE.EV[topic].find(d => d.id === e.id); assert.equal(def.sig(r), x.why, '계기 = 엔진 값');
        if (x.cls === 'go') assert.ok(fr[x.y] < 4 && r.fit > -12, '움직이기 좋은 해 = 그래프 상위 4·흐름 무겁지 않음');
        else if (x.cls === 'slow') assert.ok(r.fit <= -12); else assert.ok(!(fr[x.y] < 4 && r.fit > -12));
      });
      const k = topic + ':' + e.id; cnt.has[k] = (cnt.has[k] || 0) + (e.years.length ? 1 : 0); cnt.go[k] = (cnt.go[k] || 0) + (e.years.some(x => x.cls === 'go') ? 1 : 0);
      cnt.yrs[k] = cnt.yrs[k] || {}; cnt.yrs[k][e.years.map(x => x.y).join(',')] = 1; if (o.fit[e.id]) cnt.fit[k] = (cnt.fit[k] || 0) + 1;
    });
    // 장 사이 일치: 이직 = career_08 서사, 결혼 = love_08 서사
    if (topic === 'career' && age >= 20 && age < 65 && L.CHAPTERS.timeline_career_08) {
      const n = L.compose(M, ch, now, 'timeline_career_08'), t = n ? n.rows.map(r => r.text).join(' ') : '', ny = yearsIn(t, '이직·자리 이동이 움직이기 쉬운 해는 ');
      if (ny) assert.equal(J(o.events.find(e => e.id === 'move').years.map(x => x.y).sort()), J(ny), '이직 해 = 이직 장 서사');
    }
    if (topic === 'love' && L.CHAPTERS.timeline_love_08) {
      const n = L.compose(M, ch, now, 'timeline_love_08'), t = n ? n.rows.map(r => r.text).join(' ') : '', ny = yearsIn(t, '결혼 이야기가 움직이기 쉬운 해는 ');
      if (ny) assert.equal(J(o.events.find(e => e.id === 'wed').years.map(x => x.y).sort()), J(ny), '결혼 해 = 결혼운 장 서사');
    }
    const h = TE.html(o), txt = h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ');
    assert.ok(!BAN.test(txt), '금지 표현: ' + (txt.match(BAN) || [''])[0]);
    assert.ok(!/를을|을를|은는 |는은 |이이 /.test(txt), '조사');
  }
  assert.equal(J({ w: ch.weights, s: ch.strength, u: ch.unified }), before, '엔진 결과 불변');
  // 실제 블록 조립 경로: 타이밍 장 끝에 붙는지
  if (i % 10 === 1) {
    const sd = R.SajuData.build(ch, { now });
    for (const [id, topic] of [['timeline_career_14', 'career'], ['timeline_love_14', 'love'], ['timeline_wealth_14', 'wealth']]) {
      const c = { id, editorialContractId: id }; Object.defineProperty(c, 'readingFeature', { value: { M, ch, sd, now, name: '', assets: {}, videos: {} }, enumerable: false });
      const b = FEAT.build(c), all = b ? (b.lead || '') + (b.rest || '') : '';
      assert.equal(/dp-tev/.test(all), !(age < 20 && topic !== 'career'), id + ' 블록 연결');
    }
  }
  cnt.n++; if (age < 20) cnt.kid++; if (age >= 65) cnt.senior++;
}
// 명식마다 달라야 함: 사건마다 해 조합이 여러 가지
Object.keys(cnt.yrs).forEach(k => assert.ok(Object.keys(cnt.yrs[k]).length >= 8, '해 조합이 너무 적음 ' + k));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
assert.ok(/timing-events\.js\?v=/.test(read('report/v2/index.html')), '사용자 화면이 모듈을 불러옴');
console.log('사건별 타이밍 통과 — 사주 ' + cnt.n + '개(20세 미만 ' + cnt.kid + ' · 65세 이상 ' + cnt.senior + ')');
console.log('해가 하나 이상 나온 비율', Object.entries(cnt.has).map(([k, v]) => k + ' ' + Math.round(v / cnt.n * 100) + '%').join(' · '));
console.log('움직이기 좋은 해가 있는 비율', Object.entries(cnt.go).map(([k, v]) => k + ' ' + Math.round(v / cnt.n * 100) + '%').join(' · '));
console.log('해 조합 종류', Object.entries(cnt.yrs).map(([k, v]) => k + ' ' + Object.keys(v).length).join(' · '));
console.log('적성 연결 문장', Object.entries(cnt.fit).map(([k, v]) => k + ' ' + v).join(' · '));
