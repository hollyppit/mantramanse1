// 인생 지도 "스크롤 문서"(life-doc.js) 검증:  node tests/life-doc-sim.js
// 선택·탭 UI 가 없는지 · ACT 구성 · 챕터 중복 없음 · 관심 분야가 먼저 나오는지 · 이름을 부르는 문단형 풀이 · 전 사주 조립을 확인한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer', 'content-v3', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'life-doc'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report', 'v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const R = globalThis.ReportV2, M = globalThis.Manse, D = R.StoryDirector, L = R.LifeDoc;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 6), cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null);
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const BANNED = /(반드시|무조건|확정|100%|틀림없|운명이|우주의|파산|이혼|사망|죽음|질병)/;
const samples = [mk(1992, 6, 23, 1, 'M'), mk(1985, 3, 14, 9, 'F'), mk(1978, 11, 2, 18, 'M'), mk(2001, 8, 30, 12, 'F')];
let n = 0;
samples.forEach((ch, i) => ['', 'money', 'love', 'career', 'life', 'self'].forEach(interest => {
  const sd = R.SajuData.build(ch, { now }), rep = R.Compose.build(sd, lib, cfg, { name: '백진우' }), soc = D.social(M, ch, sd, now);
  const doc = L.build({ M, ch, sd, now, name: '백진우', interest, rep, soc, plan: (rep.chapters.find(c => c.plan) || {}).plan }), tag = `#${i + 1}/${interest || '기본'}`; n++;
  const cs = doc.chapters, ids = cs.map(c => c.id);
  ok(cs.length >= 20 && cs.length <= 40, tag + ' 챕터 수 ' + cs.length);
  ok(new Set(ids).size === ids.length, tag + ' 챕터 중복');
  ok(cs.every((c, k) => c.no === k + 1 && doc.acts.some(a => a.id === c.act)), tag + ' 번호·ACT');
  ok(cs.every((c, k) => !k || c.act >= cs[k - 1].act), tag + ' ACT 순서가 거꾸로 감');
  ok(doc.acts.map(a => a.roman).join() === 'PROLOGUE,ACT I,ACT II,ACT III,FINAL', tag + ' ACT 구성 ' + doc.acts.map(a => a.roman));
  ok(cs[0].id === 'life_prologue' && cs[1].id === 'life_here', tag + ' 인생 지도 → 현재 위치로 시작');
  ok(cs.slice(-2).map(c => c.base).join() === 'c19,c20' && cs[cs.length - 3].id === 'life_action', tag + ' 행동 전략 → 개운 → 사용설명서로 끝');
  ok(cs.filter(c => c.actTransition).length === doc.acts.length, tag + ' ACT 전환 화면');
  // 선택형 UI 가 없다: 새로 만든 조각에 버튼·입력·링크가 없다
  const html = cs.filter(c => c.kind === 'life').flatMap(c => c.scenes.filter(s => s.html).map(s => s.html)).join('');
  ok(!/<button|<input|<select|<a /i.test(html), tag + ' 선택형 요소(button/input/a) 남음');
  ok((html.match(/<section/g) || []).length === (html.match(/<\/section>/g) || []).length, tag + ' section 짝');
  ok(!/undefined|NaN|\[object/.test(html), tag + ' 빈 값');
  ok(!BANNED.test(html.replace(/<[^>]*>/g, ' ')), tag + ' 금지 문구');
  ok(html.includes('백진우님의') && /<p class="lead">/.test(html), tag + ' 이름을 부르는 문단형 풀이');
  // 관심 분야가 먼저
  const firstTopic = cs.find(c => c.act === 3 && c.kind === 'life');
  const want = { money: 'life_money_nature', career: 'life_career_style', love: 'life_love_style', self: 'life_self_who' }[interest];
  if (want) ok(firstTopic && firstTopic.id === want, `${tag} 관심 분야가 먼저: ${firstTopic && firstTopic.id}`);
  if (!interest || interest === 'life') ok(firstTopic && firstTopic.id === 'life_money_nature', tag + ' 기본은 돈부터');
  // 기존 챕터는 그대로: 장면이 남아 있다
  ok(cs.filter(c => c.kind !== 'life').every(c => c.scenes && c.scenes.length), tag + ' 기존 챕터 장면');
  // 관계·결혼 시기가 문서에 들어간다
  ok(cs.some(c => c.id === 'life_marriage_timing') && cs.some(c => c.id === 'life_relation_timing'), tag + ' 결혼·관계 시기');
}));
// 관리자 순서 미리보기(rep 없이)
const o = L.outline({ M, ch: samples[0], sd: R.SajuData.build(samples[0], { now }), now, name: '', interest: 'money', soc: D.social(M, samples[0], R.SajuData.build(samples[0], { now }), now) });
ok(o.length >= 20 && o[0].no === 1 && o[0].act === 'PROLOGUE', '관리자 순서 미리보기');
console.log(`문서 ${n}개 조립 (4명 × 6관심)`);
console.log(o.map(x => `  ${String(x.no).padStart(2, '0')} ${x.act.padEnd(9)} ${x.title}  [${x.kind}]`).join('\n'));
if (fails.length) { console.log('\n실패 ' + fails.length + '건'); [...new Set(fails)].slice(0, 25).forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\n모두 통과');
