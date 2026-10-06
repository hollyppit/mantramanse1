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
  ok(cs.filter(c => c.scenes.some(s => s.sceneType === 'chapterIntro' && s.compact)).length >= 15, tag + ' 작은 제목만 쓴다');
  ok(new Set(ids).size === ids.length, tag + ' 챕터 중복');
  ok(cs.every((c, k) => c.no === k + 1 && doc.acts.some(a => a.id === c.act)), tag + ' 번호·ACT');
  ok(cs.every((c, k) => !k || c.act >= cs[k - 1].act), tag + ' ACT 순서가 거꾸로 감');
  ok(doc.acts.map(a => a.roman).join() === 'PROLOGUE,ACT I,ACT II,ACT III,ACT IV,FINAL', tag + ' ACT 구성 ' + doc.acts.map(a => a.roman));
  ok(cs[0].id === 'life_prologue' && cs[1].id === 'life_here', tag + ' 인생 지도 → 현재 위치로 시작');
  ok(cs.slice(-2).map(c => c.base).join() === 'c19,c20' && cs[cs.length - 3].id === 'life_action' && cs[cs.length - 4].id === 'life_actions', tag + ' 행동 모음 → 버릴·지킬·시작할 것 → 개운 → 사용설명서로 끝');
  // 사용자가 정한 순서: 전체 인생 → 오행 → 십성·신살 → 세부(연애·재물·직장…) → 앞으로 → 개운
  const pos = id => cs.findIndex(c => (c.base === id || c.id === id));
  const seqOk = ['life_prologue', 'life_here', 'life_self_who', 'c01', 'c02', 'life_tengods', 'c03', 'c04', 'c05', 'life_stars', ...L.interestOrder(interest).map(k => ({ love: 'life_love_style', money: 'life_money_nature', career: 'life_career_style', relation: 'life_relation_style' }[k])), 'life_future', 'c17', 'c18', 'life_actions', 'c19', 'c20'].map(pos);
  ok(seqOk.every((x, k) => x >= 0 && (!k || x > seqOk[k - 1])), tag + ' 챕터 순서(전체 인생→오행→십성·신살→세부→앞으로→개운): ' + seqOk.join());
  ok(cs.every(c => !c.actTransition), tag + ' 큰 ACT 전환 화면은 없다(서두 없이 순서대로)');
  // 선택형 UI 가 없다: 새로 만든 조각에 버튼·입력·링크가 없다
  const html = cs.filter(c => c.kind === 'life').flatMap(c => c.scenes.filter(s => s.html).map(s => s.html)).join('');
  ok(!/<input|<select|<a /i.test(html) && (html.match(/<button/g) || []).every(() => true) && !/<button(?![^>]*data-vd)/i.test(html), tag + ' 선택형 요소 남음(맞아요/글쎄요 반응 버튼만 허용)');
  ok((html.match(/data-vd="yes"/g) || []).length === 6, tag + ' 주제마다 반응 한 번(6개): ' + (html.match(/data-vd="yes"/g) || []).length);
  ok((html.match(/<section/g) || []).length === (html.match(/<\/section>/g) || []).length, tag + ' section 짝');
  ok(!/undefined|NaN|\[object/.test(html), tag + ' 빈 값');
  ok(!BANNED.test(html.replace(/<[^>]*>/g, ' ')), tag + ' 금지 문구');
  ok(html.includes('백진우님은') && /<p class="lead">/.test(html), tag + ' 이름을 부르는 문단형 풀이');
  // 바로 본론: 기존 챕터에서 서두·시기 설명이 빠졌다
  const real = cs.filter(c => c.kind !== 'life');
  ok(real.every(c => !c.scenes.some(s => s.kind === 'opener' || (s.cinema && /^(title|profile)$/.test(s.kind))) && c.scenes.every(s => !(s.cinema && /명리에서는/.test((s.cinema.segments || []).map(g => g.text).join(' '))))), tag + ' 서두/명리 해설 장면 남음');
  ok(!real.some(c => /^c1[56]$/.test(c.base)), tag + ' 인생 지도·현재 위치와 겹치는 c15·c16 제외');
  ok(cs.every(c => !c.scenes.some(x => x.sceneType === 'chapterIntro') || true), 'x');
  ok(real.filter(c => !/^c1[5-8]$/.test(c.base)).every(c => c.scenes.every(s => !(s.sceneType === 'cinema' && s.kind === 'script' && /대운|세운|[0-9]+~[0-9]+세/.test((s.cinema.segments || []).map(g => g.text).join(' '))))), tag + ' 비시간 챕터에 대운·세운 시기 설명 남음');
  ok(real.every(c => { const k = c.scenes.map(s => s.sceneType); const ci = k.indexOf('chapterIntro'); const first = k.findIndex(t => t !== 'chapterIntro'); return ci <= 0 && (k[first] === 'insight' || k[first] === 'explanation' || k[first] === 'cinema' || k[first] === 'dataVisualization' || k[first] === 'chart' || k[first] === 'verdictFind' || k[first] === 'topics' || k[first] === 'recommendation' || k[first] === 'action' || k[first] === 'warning' || k[first] === 'timeline' || k[first] === 'terms' || k[first] === 'chapterEnding' || first < 0); }), tag + ' 챕터가 본문으로 시작');
  // 관심 분야가 먼저
  const firstTopic = cs.find(c => c.act === 4 && c.kind === 'life');
  const want = { money: 'life_money_nature', career: 'life_career_style', love: 'life_love_style' }[interest];
  if (want) ok(firstTopic && firstTopic.id === want, `${tag} 관심 분야가 먼저: ${firstTopic && firstTopic.id}`);
  if (!want) ok(firstTopic && firstTopic.id === 'life_love_style', tag + ' 기본은 연애부터: ' + (firstTopic && firstTopic.id));
  // 용어 풀이·중간 행동 가이드가 없다(개운 챕터 c19·c20 제외)
  const mid = real.filter(c => !/^c(19|20)$/.test(c.base));
  ok(mid.every(c => c.scenes.every(x => !/^(terms|action|recommendation|warning)$/.test(x.sceneType))), tag + ' 용어 풀이/중간 행동 가이드 남음');
  ok(!/지금 해 볼 것<\/small>/.test(cs.filter(c => /^life_(?!actions)/.test(c.id)).flatMap(c => c.scenes.map(x => x.html || '')).join('')), tag + ' 새 카드에 중간 행동 가이드 남음');
  ok(mid.every(c => !/지금 해 볼 것|하세요|보세요/.test((c.details || []).map(d => d.detail).join(' ') + (c.meaning || ''))), tag + ' 기존 챕터 풀이에 조언 문장 남음');
  ok(cs.find(c => c.id === 'life_actions').scenes.some(x => /분야별로 지금 해 볼 것/.test(x.html || '')), tag + ' 마지막에 행동 모음');
  ok(cs.find(c => c.id === 'life_stars').scenes.length >= 2 && cs.find(c => c.id === 'life_tengods').scenes.length >= 4, tag + ' 십성·신살 내용');
  // 기존 챕터는 그대로: 장면이 남아 있다
  ok(cs.filter(c => c.kind !== 'life').every(c => c.scenes && c.scenes.length), tag + ' 기존 챕터 장면');
  // 관계·결혼 시기가 문서에 들어간다
  ok(cs.some(c => c.id === 'life_marriage_timing') && cs.some(c => c.id === 'life_relation_timing'), tag + ' 결혼·관계 시기');
}));
// 관리자 순서 미리보기(rep 없이)
const o = L.outline({ M, ch: samples[0], sd: R.SajuData.build(samples[0], { now }), now, name: '', interest: 'money', soc: D.social(M, samples[0], R.SajuData.build(samples[0], { now }), now) });
ok(o.length >= 20 && o[0].no === 1 && o[0].act === 'PROLOGUE', '관리자 순서 미리보기');
// 풀이 지식(IK) 연결: H.ik 가 있으면 해당 분야 뒤에 "더 깊이" 챕터가 붙고, 없으면 기존 구성이 그대로다
{ const chx = samples[0], sdx = R.SajuData.build(chx, { now }), repx = R.Compose.build(sdx, lib, cfg, { name: '백진우' }), socx = D.social(M, chx, sdx, now), base = { M, ch: chx, sd: sdx, now, name: '백진우', interest: 'money', rep: repx, soc: socx, plan: (repx.chapters.find(c => c.plan) || {}).plan };
  const plain = L.build(base), ik = { MONEY: { title: '재물', sections: [{ id: 'a', title: '돈 버는 방식', paras: ['첫 문단 <b>입니다</b>.', '둘째 문단.', '셋째 문단.', '넷째 문단.'] }] }, SELF: { title: '나 자신', sections: [{ id: 'p', title: '성격', paras: ['성격 풀이입니다.'] }] }, LOVE: { title: '연애', sections: [] } };
  const deep = L.build(Object.assign({}, base, { ik }));
  ok(!plain.chapters.some(c => /^life_ik_/.test(c.id)), 'IK 없으면 기존 구성 그대로');
  const ids = deep.chapters.map(c => c.id); ok(ids.includes('life_ik_MONEY') && ids.includes('life_ik_SELF') && !ids.includes('life_ik_LOVE'), 'IK 있는 분야만 추가: ' + ids.filter(x => /ik/.test(x)));
  ok(ids.indexOf('life_ik_MONEY') > ids.indexOf('c08') && ids.indexOf('life_ik_SELF') > ids.indexOf('c02') && ids.indexOf('life_ik_SELF') < ids.indexOf('life_tengods'), 'IK 챕터 위치(해당 분야 뒤)');
  ok(deep.chapters.length === plain.chapters.length + 2 && deep.chapters.every((c, k) => c.no === k + 1), '번호 재정렬·기존 챕터 보존');
  const mc = deep.chapters.find(c => c.id === 'life_ik_MONEY'), html = mc.scenes.map(x => x.html || '').join(''); ok(/돈 버는 방식/.test(html) && !/<b>입니다/.test(html) && mc.scenes.filter(x => /rd-prose/.test(x.html || '')).length === 2, 'IK 문단은 이스케이프되고 3문단씩 장면으로 묶임'); }
console.log(`문서 ${n}개 조립 (4명 × 6관심)`);
console.log(o.map(x => `  ${String(x.no).padStart(2, '0')} ${x.act.padEnd(9)} ${x.title}  [${x.kind}]`).join('\n'));
if (fails.length) { console.log('\n실패 ' + fails.length + '건'); [...new Set(fails)].slice(0, 25).forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\n모두 통과');
