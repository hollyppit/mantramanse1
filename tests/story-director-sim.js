// Story Director(인생 지도 흐름) 검증:  node tests/story-director-sim.js
// 엔진 값만 읽는지 · 모든 모듈의 챕터가 실제로 있는지 · 시간축 필터가 서로 다른 값인지 · 확정 예언 금지어가 없는지 확인한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'story-director'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report', 'v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, D = R.StoryDirector;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 6);
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const BANNED = /(반드시|무조건|확정|100%|틀림없|결혼합니다|파산|사망|이혼합니다|합격합니다|대박)/;
const text = o => JSON.stringify(o);

console.log('1. 모듈·흐름 구조');
const bases = new Set(R.Chapters.BASE.map(c => c.id));
D.MODULES.forEach(m => m.chapters.forEach(b => ok(bases.has(b), `모듈 ${m.id} → 없는 챕터 ${b}`)));
const cm = D.chapterMap(); R.Chapters.BASE.forEach(c => ok(cm[c.id] && cm[c.id].length, `기존 챕터 ${c.id}(${c.title}) 가 어느 모듈에도 없음`));
D.INTERESTS.forEach(it => {
  const f = D.flow(it.id); ok(f.steps[0].id === 'life' && f.steps[1].id === 'here', it.id + ': 도입 2화면');
  ok(f.steps[f.steps.length - 1].id === 'act_remedy', it.id + ': 행동 전략으로 끝');
  ok(new Set(f.order).size === f.order.length, it.id + ': 중복 단계');
  ok(f.steps.filter(s => s.free && s.kind !== 'life' && s.kind !== 'here' && s.id !== 'act_remedy').length === 1, it.id + ': 무료 체험 모듈은 1개');
  ok(f.steps.every(s => s.chapters.length || s.gen || s.kind === 'life' || s.kind === 'here'), it.id + ': 내용 없는 단계');
});
console.log('   모듈', D.MODULES.length, '개 · 분야', D.INTERESTS.length, '개');

console.log('2. 실제 사주로 인생 지도·현재 위치·시간축');
const samples = [mk(1992, 6, 23, 1, 'M'), mk(1985, 3, 14, 9, 'F'), mk(1978, 11, 2, 18, 'M'), mk(2001, 8, 30, 12, 'F')];
samples.forEach((ch, i) => {
  const sd = R.SajuData.build(ch, { now }), tag = `#${i + 1}`;
  const lm = D.lifeMap(M, ch, now);
  ok(lm.length >= 10 && lm.filter(x => x.isCurrent).length === 1, tag + ' 대운 10개 + 현재 1개: ' + lm.length + '/' + lm.filter(x => x.isCurrent).length);
  lm.filter(x => !x.pre).forEach(x => { ok(x.season && x.fields.money && x.fields.love && x.fields.career, tag + ' 분야값 누락 ' + x.ganzhi); ['money', 'love', 'career'].forEach(k => ok(Number.isFinite(x.fields[k].score) && x.fields[k].score >= 0 && x.fields[k].score <= 100, tag + ' ' + k + ' 범위')); });
  ok(lm.filter(x => x.pre).every(x => !x.season && !Object.keys(x.fields).length), tag + ' 출생~첫 대운은 데이터 없음(지어내지 않음)');
  // 분야가 같은 점수의 재포장이 아닌지: 대운 10개에서 money/love/career 점수열이 서로 다르다
  const s = k => lm.filter(x => !x.pre).map(x => x.fields[k].score).join(); ok(s('money') !== s('love') && s('money') !== s('career') && s('love') !== s('career'), tag + ' 분야별 점수열이 같음');
  const pos = D.position(M, ch, sd, now);
  ok(pos.headline && pos.body.length && pos.evidence.length >= 6 && pos.age === 2026 - ch.solar.y, tag + ' 현재 위치');
  const fu = D.future(M, ch, sd, now, 10); ok(fu.years.length === 10 && fu.groups.length >= 1, tag + ' 앞으로 10년');
  ['money', 'career', 'love'].forEach(k => { const t = D.timing(M, ch, sd, now, k); ok(t.available && t.line && t.years.length === 10, tag + ' timing ' + k); });
  const ys = D.yearsOf(M, ch, 2026, 2035, now); ok(ys.length === 10 && ys.filter(y => y.isNow).length === 1, tag + ' yearsOf');
  const ms = D.monthsOf(M, ch, 2026, now); ok(ms.length === 12 && ms.filter(m => m.isNow).length === 1, tag + ' monthsOf 12개월·현재 1');
  const ac = D.action(sd, { avoid: ['a', 'b', 'c', 'd'], checklist: ['x'] }, pos.seasonKey); ok(ac.drop.length >= 1 && ac.drop.length <= 3 && ac.keep.length >= 1 && ac.start.length >= 1 && ac.start.length <= 3, tag + ' 행동 전략 1~3개');
  const pr = D.profile(M, ch, sd, { now, interest: 'money' }); ok(pr.primaryInterest === 'money' && pr.storyModules.length >= 8, tag + ' profile');
  // 관심 분야는 계산 결과를 바꾸지 않는다
  const a = text(D.lifeMap(M, ch, now)), b = (D.profile(M, ch, sd, { now, interest: 'love' }), text(D.lifeMap(M, ch, now))); ok(a === b, tag + ' 관심 분야가 계산에 영향');
  const all = text([lm, pos, fu, D.timing(M, ch, sd, now, 'money'), ac, D.SEASON]); const hit = BANNED.exec(all); ok(!hit, tag + ' 금지어: ' + (hit && hit[0]));
});
ok(D.FIELDS.find(f => f.id === 'relation').available === false, '관계 탭은 점수 모델이 없어 비활성');
console.log('3. 시연(1992-06-23 01:30 남, 관심: 돈)');
console.log(D.preview('money').map(s => `   ${String(s.no).padStart(2, '0')} ${s.free ? '무료' : '잠김'} ${s.title}  [${s.source}]`).join('\n'));
const ch0 = samples[0], lm0 = D.lifeMap(M, ch0, now);
console.log(lm0.map(x => x.pre ? `   ${x.startAge}~${x.endAge}세 (대운 전)` : `   ${x.startAge}~${x.endAge}세 ${x.ganzhi} ${x.tag}${x.isCurrent ? '  ◀ 지금' : ''} | 돈 ${x.fields.money.score} 일 ${x.fields.career.score} 사랑 ${x.fields.love.score}`).join('\n'));
console.log(D.timing(M, ch0, R.SajuData.build(ch0, { now }), now, 'money').line);
if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.slice(0, 30).forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\n모두 통과');
