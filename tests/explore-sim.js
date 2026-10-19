// 운명 세계 지도(report/v2/explore.js) 검증:  node tests/explore-sim.js
// 모든 챕터가 정확히 한 세계에 들어가는지 · 세계 정의 병합 · 진행/이어보기 · 서버 정리(cleanWorlds) · 실제 life-doc 챕터 매핑을 확인한다.
const fs = require('fs'), path = require('path'), vm = require('vm'), url = require('url');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); } };
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer', 'content-v3', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'reading-answer', 'life-doc', 'explore']
  .forEach(n => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', n + '.js'), 'utf8'), { filename: n + '.js' }));
const R = globalThis.ReportV2, X = R.Explore, M = globalThis.Manse;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };

// 1. 기본 세계
const W = X.mergeWorlds(null);
const legacyMoney = X.mergeWorlds([{ id: 'w2', line: '직업 · 재물 · 성공', chapters: ['c06', 'c08', 'life_career_style'] }]);
for (const id of ['c06', 'c07', 'deep_jobs', 'life_career_style', 'life_career_timing', 'life_ik_CAREER']) ok(X.worldFor({ id }, legacyMoney) === 'w7', '커리어 분리: ' + id);
for (const id of ['c08', 'deep_wealth', 'life_money_nature', 'life_money_timing']) ok(X.worldFor({ id }, W) === 'w2', '재물 분리: ' + id);
ok(W.length === 7 && W.map(w => w.name).join() === '종합풀이,재물운,커리어운,인연운,건강 및 사고수,전생 체험,개운법', '기본 7개 세계 이름·순서');
ok(W.every(w => w.enabled && w.access === 'free'), '기본은 모두 활성·무료(가격 정책 미확정)');
ok(/창작 판타지/.test(W.find(w => w.id === 'w5').notice), '윤회의 문에 창작 판타지 표시');

// 2. 병합: 이름 변경·비활성·유료·챕터 직접 연결
const W2 = X.mergeWorlds([{ id: 'w2', name: '새 이름', enabled: false }, { id: 'w3', access: 'paid' }, { id: 'w6', chapters: ['c19'] }]);
ok(W2.find(w => w.id === 'w2').name === '새 이름' && !W2.find(w => w.id === 'w2').enabled, '이름 변경·비활성');
ok(W2.find(w => w.id === 'w3').access === 'paid' && W2.find(w => w.id === 'w1').access === 'free', '유료 지정은 해당 세계만');
ok(X.worldFor({ id: 'c19', base: 'c19' }, W2) === 'w6', '직접 연결 챕터 우선');

// 3. 실제 문서의 모든 챕터가 한 세계에 들어가고 사라지지 않는다
const now = Date.UTC(2026, 9, 6), cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null);
let total = 0; const viaFallback = new Set();
[[1992, 6, 23, 1, 'M'], [1985, 3, 14, 9, 'F'], [1978, 11, 2, 18, 'M']].forEach(([y, m, d, h, g]) => {
  const ch = M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
  const sd = R.SajuData.build(ch, { now }), rep = R.Compose.build(sd, lib, cfg, { name: '백진우' }), soc = R.StoryDirector.social(M, ch, sd, now);
  const doc = R.LifeDoc.build({ M, ch, sd, now, name: '백진우', interest: '', rep, soc, plan: (rep.chapters.find(c => c.plan) || {}).plan });
  const model = X.worldsModel(doc.chapters, W, {}, -1), n = model.reduce((s, g) => s + g.total, 0);
  total += n; ok(n === doc.chapters.length, `챕터 누락: ${n}/${doc.chapters.length}`);
  ok(model.length === 6 && !model.some(g=>g.world.id==='w4'), '건강 챕터가 없는 기존 문서는 6개 주제 표시: ' + model.map(g => g.world.id + ':' + g.total).join());
  doc.chapters.forEach(c => { const hit = W.some(w => (w.match || []).some(r => new RegExp(r).test(c.id) || new RegExp(r).test(c.base || c.id))); if (!hit) viaFallback.add(c.id); });
});
if (viaFallback.size) console.log('규칙에 안 걸려 막 기준 대체 세계로 간 챕터:', [...viaFallback].join(', '));

// 4. 진행·이어보기·저장
const cs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
ok(X.resumeIndex(cs, { ended: {}, last: -1 }) === 0, '처음엔 0');
ok(X.resumeIndex(cs, { ended: { a: 1 }, last: 1 }) === 1, '읽던 챕터 이어서');
ok(X.resumeIndex(cs, { ended: { a: 1, b: 1 }, last: 1 }) === 2, '끝낸 챕터 다음');
ok(X.resumeIndex(cs, { ended: { a: 1, b: 1, c: 1 }, last: 2 }) === -1, '모두 읽으면 -1');
X.save('k', { ended: { a: 1 }, seen: { w1: 1 }, last: 1, auto: false }); const L = X.load('k');
ok(L.ended.a === 1 && L.seen.w1 === 1 && L.last === 1 && L.auto === false, '진행 저장·복원');
ok(X.load('none').auto === false && X.load('none').last === -1, '저장본 없음 기본값');

// 5. 상태 구분(탐험 완료 ≠ 유료)
const mm = X.worldsModel([{ id: 'c01', base: 'c01', act: 2 }, { id: 'c02', base: 'c02', act: 2 }], X.mergeWorlds([{ id: 'w1', access: 'paid' }]), { c01: 1, c02: 1 }, -1);
ok(mm[0].state === 'done' && mm[0].world.access === 'paid', '완료·유료는 별개 속성');
const hh = X.html({ mode: 'map', name: '백진우', progress: { done: 2, total: 2, pct: 100 }, resume: -1, auto: true, rate: 1, worlds: mm, ended: {}, last: -1 });
ok(/탐험 완료/.test(hh) && /xp-paid/.test(hh), '지도 HTML: 완료 칩과 유료 배지가 따로 표시');

// 6. 서버 정리 함수
import(url.pathToFileURL(path.join(root, 'functions/api/worlds.js')).href).then(mod => {
  const c = mod.cleanWorlds([{ id: 'w1', name: 'x'.repeat(99), color: 'red', bgImage: 'javascript:alert(1)', access: 'weird', chapters: ['c01', '../x', 5] }, { id: 'w1' }, null]);
  ok(c.length === 1 && c[0].name.length === 40 && c[0].color === '' && c[0].bgImage === '' && c[0].access === 'free' && c[0].chapters.join() === 'c01', '서버 정리: 길이·색·주소·권한·챕터 ID 검증');
  // 세계 무빙툰 컷 이미지(cutImages): 챕터 id·주소 형식 검증, 챕터당 3장 상한, 비어 있으면 키 자체를 두지 않음
  const ci = mod.cleanWorlds([{ id: 'w2', cutImages: { c06: ['/api/clipfile?k=a.webp', 'https://cdn.example.com/b.webp', 'javascript:alert(1)', '/api/clipfile?k=c.webp', '/api/clipfile?k=d.webp'], '../x': ['/api/clipfile?k=z.webp'], c07: 'not-array', c08: ['ftp://bad'], deep_jobs: ['/api/clipfile?k=e.webp'] } }, { id: 'w3', cutImages: {} }, { id: 'w4' }]);
  ok(ci[0].cutImages && ci[0].cutImages.c06.length === 3 && ci[0].cutImages.c06[0] === '/api/clipfile?k=a.webp' && !ci[0].cutImages.c06.some(u => /javascript/.test(u)), 'cutImages: 잘못된 주소 제거·챕터당 3장 상한');
  ok(!('../x' in ci[0].cutImages) && !('c07' in ci[0].cutImages) && !('c08' in ci[0].cutImages) && ci[0].cutImages.deep_jobs.length === 1, 'cutImages: 잘못된 챕터 id·배열 아님·주소 전부 무효는 버림');
  ok(!('cutImages' in ci[1]) && !('cutImages' in ci[2]), 'cutImages: 비어 있으면 키를 두지 않음');
}).catch(e => ok(false, 'worlds.js 로드 실패: ' + e.message)).then(() => {
  console.log(`세계 지도 검증: 챕터 ${total}건 매핑`);
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log('모두 통과');
});
