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
// 일주 캐릭터 영상 매핑 점검(awakeningAudit): 합성 저장본으로 120칸·20칸 집계, 주소 형식, 확인 대상 URL 수집
{
  const ILJU = R.Media.ILJU, vids = [
    { dayPillar: ILJU[0], gender: 'M', enabled: true, videoUrl: '/api/clipfile?k=a1.mp4', posterUrl: '/api/clipfile?k=a1.webp' },
    { dayPillar: ILJU[0], gender: 'F', enabled: true, videoUrl: '/api/clipfile?k=a2.mp4' },
    { dayPillar: ILJU[1], gender: 'M', enabled: true, posterUrl: '/api/clipfile?k=p1.webp' },
    { dayPillar: ILJU[2], gender: 'F', enabled: false, videoUrl: '/api/clipfile?k=d1.mp4' },
    { dayPillar: ILJU[3], gender: 'M', enabled: true, videoUrl: 'ftp://bad/x.mp4' },
    { dayPillar: ILJU[4], gender: 'F', enabled: true, videoUrl: 'https://cdn.example.com/ext.mp4' },
  ];
  const a = Q.awakeningAudit({ videos: vids, ilgan: [{ stem: '갑', gender: 'M', enabled: true, videoUrl: '/api/clipfile?k=ig1.mp4' }], fallback: { videoUrl: '/api/clipfile?k=fb.mp4' }, textOnly: true });
  ok(a.pillars.of === 120 && a.pillars.ok === 3 && a.pillars.posterOnly === 1 && a.pillars.disabled === 1 && a.pillars.error === 1, '일주 영상 집계: ' + JSON.stringify(a.pillars).slice(0, 160));
  ok(a.pillars.ok + a.pillars.posterOnly + a.pillars.disabled + a.pillars.missing + a.pillars.error === 120, '120칸이 빠짐없이 분류됨');
  ok(a.pillars.missingList.length === 120 - a.pillars.ok, '문제 칸 목록 = 120 - 정상');
  ok(a.ilgan.of === 20 && a.ilgan.ok === 1 && a.ilgan.missing === 19, '일간 소개 집계');
  ok(a.fallback === true && a.textOnly === true && a.publicBase === false, '기본 영상·문구만 보이기·공개 주소 플래그');
  const us = a.urls.map(u => u.url);
  ok(us.includes('/api/clipfile?k=a1.mp4') && us.includes('/api/clipfile?k=ig1.mp4') && us.includes('/api/clipfile?k=fb.mp4') && !us.some(u => /^ftp:|^https:/.test(u)) && new Set(us).size === us.length, '확인 대상은 이 사이트 업로드 주소만, 중복 없음: ' + us.length);
  const none = Q.awakeningAudit({});
  ok(none.pillars.ok === 0 && none.pillars.missing === 120 && none.ilgan.missing === 20 && none.urls.length === 0 && none.fallback === false, '비어 있는 저장본');
}

console.log('서비스 점검 검증 완료');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
