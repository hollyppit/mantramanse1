// Narrative chapters, episode assembly and cross-method useful-element evidence.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), { pathToFileURL } = require('url');
const root = path.join(__dirname, '..'); globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'));
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer', 'content-v3', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'reading-answer', 'deep', 'deep-life', 'deep-time', 'deep-wealth', 'deep-love', 'life-doc', 'full-reading'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const R = ReportV2, M = Manse, now = Date.UTC(2026, 9, 9);
const ch = M.compute({ year: 1992, month: 6, day: 23, hour: 1, minute: 30, calendar: 'solar', gender: 'M', city: '전주', school: 'eokbu' });
const sd = R.SajuData.build(ch, { now }), H = { M, ch, sd, now, name: '백진우', assets: {} }, text = o => o.scenes.map(s => s.html || '').join('');
assert.equal(sd.usefulElementAdvice.verdict, '병행');
assert.equal(sd.usefulElementMethods.eokbu.yong, '토');
assert.equal(sd.usefulElementMethods.johu.yong, '수');
assert.equal(sd.usefulElementMethods.eokbu.roles['수'], '구신');
assert.equal(sd.usefulElementMethods.johu.roles['수'], '용신');
assert.equal(sd.climate.temp, ch.climate.temp);
assert(sd.currentRoots);
assert.equal(sd.roots.score, M.analyzeNatalRoot(ch).natalRootScore);
const snapshot = JSON.stringify(M.analyzeNatalRoot(ch));
const kst = new Date(now + 9 * 3600e3), rootYear = M.yearPillarAt(now).sajuYear;
const rootMonth = M.wolun(ch,rootYear).filter(x=>x.startMs<=now).pop();
const rootDay = M.ilun(ch,kst.getUTCFullYear(),kst.getUTCMonth()+1)[kst.getUTCDate()-1];
const rootState = M.evaluateCurrentRootState(ch,M.daeunAt(ch,now),M.yearPillarOf(rootYear),rootMonth,rootDay);
assert.equal(sd.currentRoots.currentSupport, rootState.currentRootSupport);
assert.equal(sd.currentRoots.stability, rootState.rootStability);
assert.equal(sd.currentRoots.fit.eokbuFit,rootState.fit.eokbuFit);
assert.equal(sd.currentRoots.fit.johuFit,rootState.fit.johuFit);
assert.equal(snapshot,JSON.stringify(M.analyzeNatalRoot(ch)));
assert(sd.roots.details.every(r=>r.reason&&r.hiddenStem&&r.depth));
const remedy = R.Deep.SECTIONS.deep_remedy(H);
assert(text(remedy).includes('수은') === false);
assert(text(remedy).includes('기준별 판단이 다릅니다'));
assert(text(remedy).includes('비중 가장 큼'));
assert(!text(remedy).includes('줄일 기운'));
assert(text(remedy).includes('여러 기준을 종합하면'));
const child = R.Deep.SECTIONS.deep_children(H);
assert.equal(child.scenes.length, 5);
assert(child.scenes[0].html.includes('어떤 아이'));
assert(child.scenes[2].html.includes('성장') || child.scenes[2].html.includes('키워'));
assert(child.scenes[4].html.includes('<details>'));
for (const tg of Object.keys(R.ChildReading.PORTRAIT)) {
  const custom = { ...H, sd: { ...sd, pillars: { ...sd.pillars, hour: { ...sd.pillars.hour, stemTG: tg, branchTG: tg } } } };
  const p = R.ChildReading.profile(custom), o = R.Deep.SECTIONS.deep_children(custom);
  assert.equal(p.type, tg);
  assert(text(o).includes(R.ChildReading.PORTRAIT[tg][0]));
  assert(!/undefined|NaN/.test(text(o)));
}
const past = R.Deep.SECTIONS.deep_past(H);
assert.equal(past.scenes.length, 5);
assert(text(past).includes('이걸 드라마로 풀어 본다면'));
assert(!text(past).includes('상징적 창작 이야기'));
assert(!text(past).includes('단계.'));
assert(past.scenes.slice(1,4).every(s => s.html.replace(/<[^>]*>/g,'').length > 100));
const lib = R.Compose.library(null), cfg = R.Chapters.forProject(null, 'full'), rep = R.Compose.build(sd, lib, cfg, { name: H.name });
R.Deep.augment(rep, H);
const doc = R.LifeDoc.build({ ...H, rep, soc: R.StoryDirector.social(M, ch, sd, now), plan: (rep.chapters.find(c => c.plan) || {}).plan });
for (const c of doc.chapters) {
  const episodes = c.scenes.filter(s => s.episode);
  if (!R.LifeDoc.keepEpisode(c)) { assert.equal(episodes.length, 0, c.id); continue; } // 전생·인연 챕터에만 '풀이 속 한 장면'
  assert.equal(episodes.length, 1, c.id);
  assert.equal(episodes[0].episodeSource.chapterId, c.id);
  assert.equal((episodes[0].html.match(/<p class="lead">/g) || []).length, 3);
  assert(!/undefined|NaN|\{[^}]+\}|창작한 이야기|상징적 창작/.test(episodes[0].html), c.id);
}
R.LifeDoc.attachEpisodes(doc.chapters, H);
assert(doc.chapters.every(c => c.scenes.filter(s => s.episode).length === (R.LifeDoc.keepEpisode(c) ? 1 : 0)));
assert(doc.chapters.some(c => c.id === 'deep_past' && c.scenes.some(s => s.episode)));
(async () => {
  const K = await import(pathToFileURL(path.join(root,'functions/_ik.js')).href), F = await import(pathToFileURL(path.join(root,'functions/_movingtoon-reading.js')).href);
  assert.deepEqual(K.deriveFacts(sd).usefulElementMethods, sd.usefulElementMethods);
  assert.deepEqual(K.deriveFacts(sd).currentRoots, sd.currentRoots);
  const payload = { sd, chapter: { id: 'c19', title: '개운법', paragraphs: [{ id: '0', kind: 'episode', text: '작은 일을 정하고 실제 생활에서 이어 가는 장면을 일상의 이야기로 살펴봅니다.' }] } };
  assert.equal(F.validate(payload).chapter.paragraphs[0].kind, 'episode');
  assert(F.SYSTEM.includes('독립적으로 판단'));
  assert(F.SYSTEM.includes('kind=episode'));
  console.log('서사 검증 통과: 자녀상 10종 · 전생 드라마 5장면 · 전생·인연 챕터만 에피소드 · 억부/조후 충돌 재현 · AI 근거/종류 전달');
  if (process.argv.includes('--preview')) {
    const http = require('http'), css = ['viewer.css','reader.css','deep.css'].map(f=>fs.readFileSync(path.join(root,'report/v2',f),'utf8')).join('\n');
    const selected = ['deep_children','deep_past','deep_remedy'].map(id=>doc.chapters.find(c=>c.id===id));
    const page = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>서사 및 개운법 확인</title><style>'+css+'body{overflow:auto!important}.scene{min-height:auto!important;padding:28px 22px!important;max-width:720px;margin:auto}.dp-fig{max-height:240px}details{padding:8px 0}h2{max-width:720px;margin:40px auto;padding:20px}.rd-episode{border-top:1px solid #665b43}</style><body>'+selected.map(c=>'<h2>'+c.title+'</h2>'+text(c)).join('')+'</body></html>';
    http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(page)}).listen(8767,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:8767'));
  }
})().catch(e=>{console.error(e);process.exit(1)});