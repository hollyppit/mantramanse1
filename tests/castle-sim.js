// 황금의 성채(report/v2/castle.js) 검증:  node tests/castle-sim.js
// 직업 12분야·점수가 엔진과 일치 · 비교 선택 · 사업 축 6개 · 10년 재물 지수 · 새 수치를 만들지 않음 · 단정/보장 표현 없음
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2/castle.js'), 'utf8'), { filename: 'castle.js' });
const M = globalThis.Manse, Cs = globalThis.ReportV2.Castle;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 6), mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const BANNED = /(반드시 성공|확실히|100%|보장합니다|무조건|파산|대박)/;
[[1992, 6, 23, 1, 'M'], [1985, 3, 14, 9, 'F'], [1978, 11, 2, 18, 'M'], [2001, 8, 30, 12, 'F']].forEach(([y, mo, d, h, g], i) => {
  const ch = mk(y, mo, d, h, g), tag = '#' + (i + 1), m = Cs.model(M, ch, now), p = M.careerProfile(ch);
  ok(m.jobs.length === 12 && m.jobs.every((j, k) => !k || j.score <= m.jobs[k - 1].score), tag + ' 직업 12분야·점수 내림차순');
  m.jobs.forEach(j => { const src = p.byKey ? p.byKey[j.key] : p.categories.find(c => c.category === j.key); ok(src && src.score === j.score && src.burden === j.burden, tag + ' 엔진 값 일치 ' + j.key); });
  ok(m.jobs.filter(j => j.isTop).length === 3, tag + ' 상위 3 표시');
  ok(m.style.length === 6 && m.style.every(a => a.value + a.other === 100), tag + ' 일하는 방식 6축 합 100');
  ok(m.wealth.length === 10 && m.wealth.every((w, k) => w.score >= 0 && w.score <= 100 && (!k || w.year === m.wealth[k - 1].year + 1)), tag + ' 10년 재물 지수 범위·연속');
  ok(m.wealth.filter(w => w.isNow).length === 1, tag + ' 올해 1개');
  const w0 = m.wealth[0], s0 = M.seunRange(ch, w0.year, w0.year)[0];
  ok(w0.score === Math.round(M.evaluateDomainLuck(ch, s0, 'seun', { ms: s0.midMs }).wealth.score), tag + ' 재물 지수 엔진 일치');
  ok(w0.parts.length === 3 && Math.abs(w0.parts.reduce((s, x) => s + x.w, 0) - 100) <= 1, tag + ' 재물 구성 반영 비중 합 100');
  ['job', 'biz', 'wealth'].forEach(tab => {
    const html = Cs.html(m, { tab, jobs: [m.jobs[0].key, m.jobs[5].key], year: m.wealth[3].year });
    ok(!/undefined|NaN|\[object/.test(html), tag + ' ' + tab + ' 깨진 값 없음');
    ok(!BANNED.test(html), tag + ' ' + tab + ' 단정/보장 표현 없음');
    ok(/아닙니다|보장하지 않/.test(html), tag + ' ' + tab + ' 면책 문구');
  });
  const job = Cs.html(m, { tab: 'job', jobs: [m.jobs[0].key, m.jobs[11].key] });
  ok((job.match(/class="cs-col"/g) || []).length === 2 && /살펴볼 점/.test(job) && /잘 맞는 이유/.test(job), tag + ' 두 분야 나란히 비교');
  ok((Cs.html(m, { tab: 'job', jobs: [m.jobs[0].key] }).match(/class="cs-col"/g) || []).length === 1, tag + ' 한 분야만 선택');
});
console.log('황금의 성채 검증 완료');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
