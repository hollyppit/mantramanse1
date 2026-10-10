// 개운의 성역(report/v2/sanctuary.js) 검증:  node tests/sanctuary-sim.js
// 추천 6유형이 추천 엔진 값과 같은지 · 명소 점수가 챕터 본문과 같은 함수에서 나오는지 · 계획 체크 · 해금 상태 · 의학/보장 표현 없음
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer', 'content-v3', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'deep', 'deep-time', 'sanctuary']
  .forEach(n => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', n + '.js'), 'utf8'), { filename: n + '.js' }));
const R = globalThis.ReportV2, M = globalThis.Manse, S = R.Sanctuary;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 6), cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null);
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const BANNED = /(치료|완치|진단|처방합니다|반드시 낫|보장합니다|무조건|복권|대박)/;
ok(typeof R.Deep.placeList === 'function', 'R.Deep.placeList 내보내기');
[[1992, 6, 23, 1, 'M'], [1985, 3, 14, 9, 'F'], [1978, 11, 2, 18, 'M'], [2001, 8, 30, 12, 'F']].forEach(([y, mo, d, h, g], i) => {
  const ch = mk(y, mo, d, h, g), tag = '#' + (i + 1), sd = R.SajuData.build(ch, { now }), rep = R.Compose.build(sd, lib, cfg, { name: '백진우' }), m = S.model(rep, sd);
  ok(m.types.length === 6 && m.types.every(t => m.items[t].length >= 1), tag + ' 6유형 모두 추천 있음: ' + m.types.join());
  m.types.forEach(t => ok(m.items[t].map(x => x.id).join() === rep.remedies[t].map(c => c.item.id).join(), tag + ' 추천 엔진 값과 같은 목록 ' + t));
  ok(m.items.action.some(x => x.exercise), tag + ' 운동·활동 1개 이상');
  ok(m.places.length === 7 && m.places.every((p, k) => !k || p.score <= m.places[k - 1].score) && m.places.every(p => p.score >= 20 && p.score <= 98), tag + ' 명소 7곳 점수 내림차순·범위');
  ok(m.places.map(p => p.name).join() === R.Deep.placeList(sd).map(x => x.p[0]).join(), tag + ' 명소 목록 단일 출처');
  ok(m.plan.strategy.length >= 3 && m.plan.checklist.length >= 3, tag + ' 계획 단계·체크리스트');
  ok(m.summary.core && m.summary.growth, tag + ' 요약 카드 값');
  const base = { tab: 'remedy' }, st = { checks: { [m.plan.checklist[0]]: 1 }, readDone: 3, readTotal: 40, unlocked: false };
  const pages = { remedy: S.html(m, base, st), places: S.html(m, { tab: 'places' }, st), plan: S.html(m, { tab: 'plan' }, st), report: S.html(m, { tab: 'report' }, st) };
  ok(/1\/\d+/.test(pages.plan) && (pages.plan.match(/data-snc=/g) || []).length === m.plan.checklist.length && /checked/.test(pages.plan), tag + ' 체크리스트 상태 표시');
  ok(/disabled/.test(pages.report) && /열립니다/.test(pages.report), tag + ' 해금 전 PDF 비활성');
  ok(!/disabled/.test(S.html(m, { tab: 'report' }, Object.assign({}, st, { unlocked: true }))), tag + ' 해금 후 PDF 활성');
  Object.keys(pages).forEach(k => { ok(!/undefined|NaN|\[object/.test(pages[k]), tag + ' ' + k + ' 깨진 값 없음'); ok(!BANNED.test(pages[k]), tag + ' ' + k + ' 의학/보장 표현 없음'); ok(/참고용|조언이 아닙니다/.test(pages[k]), tag + ' ' + k + ' 면책'); });
});
console.log('개운의 성역 검증 완료');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
