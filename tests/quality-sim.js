// 서비스 점검(report/v2/quality.js) 검증:  node tests/quality-sim.js
// 합성 데이터로 탐지 동작 확인 + 실제 문서(여러 사주)에서 점검이 오류 없이 돌고 결과가 일관적인지 확인
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer', 'content-v3', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'reading-answer', 'life-doc', 'explore', 'quality']
  .forEach(n => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', n + '.js'), 'utf8'), { filename: n + '.js' }));
const R = globalThis.ReportV2, M = globalThis.Manse, Q = R.Quality;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };

// 1. 합성 데이터
const fake = { chapters: [
  { id: 'a', title: '정상', scenes: [{ sceneType: 'text', html: '<p>' + '충분히 긴 풀이 문장입니다. '.repeat(10) + '</p>' }] },
  { id: 'b', title: '비었음', scenes: [{ sceneType: 'chapterIntro', subtitle: '소제목' }] },
  { id: 'c', title: '단정', scenes: [{ sceneType: 'text', html: '<p>' + '이 시기에는 반드시 크게 성공합니다. '.repeat(1) + '그리고 설명이 이어집니다. '.repeat(6) + '</p>' }] },
] };
const cts = Q.chapterTexts(fake);
ok(cts.length === 3 && cts[0].len > 100 && cts[1].len < 60, '글자 수 계산');
ok(Q.missing(cts).map(x => x.id).join() === 'b', '풀이 누락 의심 탐지: ' + Q.missing(cts).map(x => x.id));
const ab = Q.absolute(cts);
ok(ab.length === 1 && ab[0].id === 'c' && ab[0].word === '반드시' && /반드시/.test(ab[0].snippet), '단정 표현 탐지·맥락');
ok(Q.textOf({ scenes: [{ sceneId: 'x', sceneType: 'life', html: '<b>태그</b> 본문' }] }) === '태그 본문', '태그·내부 키 제외');
const as = Q.assets([{ id: 'car:a', group: 'car', title: 'A', url: '/x', video: '' }, { id: 'car:b', group: 'car', title: 'B', url: '', video: '' }, { id: 'past:1', group: 'past', title: 'P', url: '/p', video: '/v' }]);
ok(as.total === 3 && as.image === 2 && as.video === 1 && as.missing.length === 1 && as.missing[0].id === 'car:b' && as.groups.car.image === 1, '에셋 현황 집계');
const wd = Q.worlds([{ id: 'c01', base: 'c01', act: 2 }, { id: 'zzz_new', title: '새 챕터', act: 4 }, { id: 'c19', base: 'c19', act: 6 }], null);
ok(wd.fallback.length === 1 && wd.fallback[0].id === 'zzz_new' && wd.fallback[0].world === 'w2', '규칙 밖 챕터는 대체 세계로 보고');
ok(wd.empty.length >= 3, '챕터가 없는 세계 보고');
const off = Q.worlds([{ id: 'c01', base: 'c01', act: 2 }], R.Explore.mergeWorlds([{ id: 'w1', enabled: false }]));
ok(off.hidden === 1 && off.list.find(w => w.id === 'w1').enabled === false, '비활성 세계에 숨겨진 챕터 수');

// 2. 실제 문서
const now = Date.UTC(2026, 9, 6), cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null);
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
[[1992, 6, 23, 1, 'M'], [1985, 3, 14, 9, 'F'], [1978, 11, 2, 18, 'M']].forEach(([y, mo, d, h, g], i) => {
  const ch = mk(y, mo, d, h, g), sd = R.SajuData.build(ch, { now }), rep = R.Compose.build(sd, lib, cfg, { name: '백진우' });
  const doc = R.LifeDoc.build({ M, ch, sd, now, name: '백진우', interest: '', rep, soc: R.StoryDirector.social(M, ch, sd, now), plan: (rep.chapters.find(c => c.plan) || {}).plan });
  const a = Q.audit({ doc, slots: [] }), tag = '#' + (i + 1);
  ok(a.chapters === doc.chapters.length && a.chapters >= 20, tag + ' 챕터 수');
  ok(a.worlds.fallback.length === 0 && a.worlds.empty.length === 0, tag + ' 세계 매핑 누락 없음: ' + JSON.stringify(a.worlds.fallback.map(x => x.id)) + JSON.stringify(a.worlds.empty));
  ok(a.summary.missing === a.missing.length && a.summary.absolute === a.absolute.length, tag + ' 요약 일치');
  ok(a.missing.every(x => x.len < Q.MIN_LEN), tag + ' 누락 기준');
  console.log(tag, '풀이 누락 의심', a.missing.map(x => x.id + '(' + x.len + ')').join(' ') || '없음', '· 단정 검토', a.absolute.length);
});
console.log('서비스 점검 검증 완료');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
