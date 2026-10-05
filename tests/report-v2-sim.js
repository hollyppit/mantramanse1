// 리포트 v2(20챕터) 검증:  node tests/report-v2-sim.js
// 엔진 계산 → Structured Saju Data → 규칙/모듈 선택 → 20챕터·개운법·Action Plan. 엔진은 읽기만 한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
vm.runInThisContext(eng, { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'content', 'remedy', 'media', 'scenes', 'compose', 'pdf', 'sharecard'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };

const cfg = R.Chapters.merge(null), lib = R.Compose.library(null);
const now = Date.UTC(2026, 9, 5);
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });

console.log('1. 챕터 구조');
ok(cfg.chapters.length === 20 && cfg.acts.length === 4, '20챕터·4ACT');
ok(cfg.chapters.every(c => c.act >= 1 && c.act <= 4), 'ACT 지정');
const cc = R.Chapters.merge({ chapters: [{ id: 'c05', enabled: false }, { id: 'c99', order: 99, act: 4, title: '추가', kind: 'module', moduleCategories: ['identity'], maxModules: 1 }] });
ok(cc.chapters.length === 20 && !cc.chapters.some(c => c.id === 'c05') && cc.chapters.some(c => c.id === 'c99'), '관리자 저장본으로 챕터 비활성/추가');

console.log('1b. 프로젝트');
const PJ = R.Chapters.projects(null); ok(PJ.length === 4 && PJ.map(p => p.id).join() === 'full,love,wealth,newyear', '기본 프로젝트 4종');
const fl = R.Chapters.forProject(null, 'full'); ok(fl.chapters.length === 20 && fl.acts.length === 4, 'full = 20챕터');
for (const p of ['love', 'wealth', 'newyear']) { const x = R.Chapters.forProject(null, p); ok(x.chapters.every((c, i) => c.no === i + 1) && x.acts.every((a, i) => a.id === i + 1 && a.roman) && x.chapters.every(c => c.act >= 1 && c.act <= x.acts.length), p + ' 번호·ACT 재부여'); console.log('   ' + p + ': ' + x.chapters.length + '챕터 ' + x.acts.length + 'ACT'); }
ok(R.Chapters.forProject(null, 'nope').project.id === 'full', '없는 프로젝트는 full');
ok(R.Chapters.forProject({ projects: [{ id: 'love', enabled: false }] }, 'love').project.id === 'full', '비활성 프로젝트는 full');
ok(R.Chapters.projects({ projects: [{ id: 'mine', name: '내 프로젝트', chapters: [{ id: 'c01', act: 1 }] }] }).length === 5, '새 프로젝트 추가');
console.log('2. 샘플 사주 리포트');
const ch = mk(1990, 5, 15, 14, 'M'), sd = R.SajuData.build(ch, { now });
console.log('   일주', sd.dayPillar.ko, '· 신강약', sd.strength.zone, '· 용신', sd.usefulElements && sd.usefulElements.yong, '· 현재 대운', sd.currentDaewoon && sd.currentDaewoon.ganzhi, R.SajuData.SEASONS[sd.currentDaewoon.season], '· 올해', R.SajuData.SEASONS[sd.sewoon.season], '· unavailable', sd.unavailable.join(',') || '-');
const rep = R.Compose.build(sd, lib, cfg), rep2 = R.Compose.build(sd, lib, cfg);
ok(rep.chapters.length === 20, '리포트 20챕터');
ok(JSON.stringify(rep) === JSON.stringify(rep2), '같은 입력 → 같은 결과');
ok(rep.chapters.every(c => c.headline && c.fact), '모든 챕터에 headline·fact');
ok(rep.chapters.find(c => c.id === 'c15').items.length === 10, '대운 10개');
ok(rep.chapters.find(c => c.id === 'c18').items.length === 12, '12개월');
ok(rep.chapters.find(c => c.id === 'c14').disclaimer, '전생 안내 문구');
ok(rep.plan.strategy.length === 4 && rep.plan.checklist.length > 0, 'Action Plan');
ok(Object.values(rep.chapters.find(c => c.id === 'c19').remedy).every(a => a.length >= 1), '개운법 7영역 모두 추천 존재');
ok(rep.meta.warnings.length === 0, '단정 표현 없음: ' + rep.meta.warnings.join(','));
ok(/^[0-9a-f]{8}$/.test(rep.meta.key), '캐시 키');
ok(R.Compose.build(sd, Object.assign({}, lib, { version: 'x' }), cfg).meta.key !== rep.meta.key, '콘텐츠 버전이 바뀌면 캐시 키 변경');
// AI 실패/불량 응답 → 원본 유지
const before = rep.chapters[0].headline;
R.Compose.applyAi(rep, { chapters: [{ id: 'c01', headline: '반드시 성공하는 사람', lead: 'x' }] });
ok(rep.chapters[0].headline === before && !rep.meta.aiApplied, '단정 표현 AI 응답 거부');
ok(R.Compose.aiPayload(rep).chapters.length === 20, 'AI payload');
console.log('   샘플:', rep.chapters[0].headline, '|', rep.plan.strategy.map(s => s.label).join('→'));
console.log('   개운:', Object.entries(rep.remedies).map(([t, a]) => t + ':' + a.map(x => x.item.title).join('/')).join('  '));

for (const pid of ['love', 'wealth', 'newyear']) { const pk = R.Compose.fromSaved({}, [], pid), r3 = R.Compose.build(sd, pk.lib, pk.cfg); ok(r3.chapters.length === pk.cfg.chapters.length && r3.chapters.every(c => c.headline && c.scenes.length >= 3) && r3.plan.strategy.length === 4, pid + ' 리포트 생성'); }
console.log('3. 커버리지 (무작위 사주 600개)');
let seed = 7; const rnd = n => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
const empties = {}, seasons = {}, unav = {}; let thin = 0, groupsSeen = {};
for (let i = 0; i < 600; i++) {
  const c = mk(1940 + rnd(80), 1 + rnd(12), 1 + rnd(28), rnd(24), rnd(2) ? 'M' : 'F');
  const s = R.SajuData.build(c, { now: now + rnd(3000) * 86400e3 }), r = R.Compose.build(s, lib, cfg);
  r.chapters.forEach(x => { if (!x.interpretation) empties[x.id] = (empties[x.id] || 0) + 1; if (x.lead && /fallback/.test(x.modules[0] || '')) thin++; });
  const k = s.currentDaewoon && s.currentDaewoon.season; seasons[k] = (seasons[k] || 0) + 1; s.unavailable.forEach(u => unav[u] = (unav[u] || 0) + 1);
  const se = s.sewoon && s.sewoon.season; seasons['seun:' + se] = (seasons['seun:' + se] || 0) + 1;
}
console.log('   빈 챕터:', JSON.stringify(empties), '· 폴백 모듈만 쓴 챕터 수:', thin, '· unavailable:', JSON.stringify(unav));
console.log('   계절 분포:', JSON.stringify(seasons));
ok(Object.keys(empties).length === 0, '어떤 사주에서도 챕터가 비지 않음');

console.log('4. 각성 영상 매핑');
const V = R.Media, vids = [{ dayPillar: '甲子', gender: 'M', videoUrl: 'https://e.com/a.mp4', enabled: true }, { dayPillar: '갑자', gender: 'F', videoUrl: '/api/clipfile?k=x', enabled: true }, { dayPillar: '乙丑', gender: 'M', posterUrl: 'https://e.com/p.webp' }];
ok(V.pickAwakening(vids, '갑자', 'M').clip.videoUrl === 'https://e.com/a.mp4', '甲子/갑자 정규화');
ok(V.pickAwakening(vids, '甲子', '여').fallback === false, '성별 한글 정규화');
ok(V.pickAwakening(vids, '병인', 'M', { videoUrl: 'https://e.com/fb.mp4' }).fallback === true, '없으면 fallback');
const cov = V.awakeningCoverage(vids); ok(cov.of === 120 && cov.male === 1 && cov.female === 1 && cov.missing.length === 117, '커버리지 계산');
console.log('   커버리지 남', cov.male + '/60 여', cov.female + '/60 전체', cov.total + '/120');
ok(V.pickImage([{ id: 'a', url: '/a.webp', tags: ['wood', 'growth'] }], ['wood', 'forest']).image.id === 'a' && V.pickImage([], ['wood']) === null, '이미지 태그 선택·없을 때 null');

console.log('4a. 서버 저장 검증과 기본 id');
const srvSrc = fs.readFileSync(path.join(root, 'functions/api/report-content.js'), 'utf8'), idm = /const ID_RE = (\/.*\/);/.exec(srvSrc), idRe = idm && eval(idm[1]);
ok(!!idRe, 'report-content ID_RE 추출');
if (idRe) { const bad = R.Content.modules.concat(R.Remedy.LIBRARY).map(x => x.id).filter(id => !idRe.test(id)); ok(bad.length === 0, '기본 모듈·개운법 id 가 서버 검증을 통과(실패: ' + bad.slice(0, 3) + ')'); ok(R.Chapters.CHAPTERS.concat(R.Chapters.PROJECTS).every(x => idRe.test(x.id)), '챕터·프로젝트 id'); }
console.log('4b. Media Scene Library (테스트용 가상 미디어)');
const S = R.Scenes, TX = S.TAX, fx = [];
let n = 0; // 원소 5 × 상태 12 × 형태를 섞은 가상 asset. URL 은 테스트용이며 배포 데이터가 아니다.
TX.element.forEach(e => TX.state.forEach((st, i) => { n++; fx.push({ id: 'm' + n, type: ['image', 'video', 'videoLoop', 'image'][i % 4], url: 'https://t/m' + n + '.webp', posterUrl: 'https://t/p' + n + '.webp', tags: [e, st, TX.scene[(n * 3) % 22], TX.theme[(n * 5) % 17], TX.emotion[n % 11]], chapterTags: [], priority: 40 + (n % 5) * 10, enabled: true }); }));
for (let i = 0; i < 6; i++) fx.push({ id: 't' + i, type: 'transition', url: 'https://t/t' + i + '.mp4', tags: ['transition', 'mist', 'mysterious'], priority: 50, visualRole: 'transition' });
fx.push({ id: 'unapproved', type: 'image', url: 'https://t/x.webp', tags: ['wood', 'growth'], tagsApproved: false, priority: 99 });
fx.push({ id: 'off', type: 'image', url: 'https://t/y.webp', tags: ['wood', 'growth'], enabled: false, priority: 99 });
const lib2 = R.Compose.library({ media: fx }), rp = R.Compose.build(sd, lib2, cfg);
const allScenes = rp.chapters.flatMap(c => c.scenes), ids = allScenes.filter(s => s.media).map(s => s.media.assetId);
ok(rp.chapters.every(c => c.scenes.length >= 3 && c.scenes[0].sceneType === 'chapterIntro' && c.scenes[c.scenes.length - 1].sceneType === 'chapterEnding'), '챕터마다 Intro~Ending Scene');
ok(new Set(ids).size === ids.length, '리포트 안 동일 미디어 반복 없음 (' + ids.length + '개 사용)');
ok(!ids.includes('unapproved') && !ids.includes('off'), '미승인 태그·비활성 미디어 제외');
ok(allScenes.filter(s => s.sceneType === 'dataVisualization' || s.sceneType === 'timeline').every(s => !s.media), '데이터 장면은 미디어 없이 HTML/CSS');
ok(allScenes.filter(s => s.media).every(s => s.media.why.length && s.media.muted), '선택 이유(DEBUG)·muted');
ok(rp.chapters.filter(c => c.actTransition).length === 4, 'ACT 전환 4개');
let run = 0, maxRun = 0, prev = null; allScenes.forEach(s => { const t = s.media && s.media.type; run = t && t === prev ? run + 1 : 1; prev = t; maxRun = Math.max(maxRun, run); });
ok(maxRun <= 2, '같은 미디어 타입 3연속 금지(최대 ' + maxRun + ')');
const noMedia = R.Compose.build(sd, lib, cfg); ok(noMedia.chapters.every(c => c.scenes.length >= 3 && c.scenes.every(s => !s.media)), '미디어 0개여도 Scene 정상(텍스트 only)');
const s1 = allScenes.find(s => s.media && s.candidates.length > 1), alt = s1.candidates.find(x => x.assetId !== s1.media.assetId && x.score > 0);
const rs = R.Compose.applyAiMedia(rp, { [s1.sceneId]: 'FAKE_URL_ID' }, lib2); ok(rs === 0, 'AI 가 후보 밖 id 를 주면 무시');
console.log('   예시 DEBUG:', s1.sceneId, s1.media.assetId, 'score', s1.media.score, s1.media.why.map(w => w.label + (w.v > 0 ? '+' : '') + w.v).join(' '));
const cov2 = S.coverage(fx); ok(cov2.total === 67 && cov2.warnings.length > 0, '미디어 커버리지/부족 경고'); console.log('   Element', JSON.stringify(cov2.element), '경고', cov2.warnings.length, '건');
ok(R.Compose.mediaPayload(rp, lib2).scenes.length > 5, 'AI 미디어 payload');

console.log('4c. PDF·공유 카드');
const pg = R.Pdf.pages(rep, sd, { name: '테스트' });
ok(pg.length === 23, 'PDF 페이지 수 ' + pg.length);
ok(pg.every(p => p.startsWith('<div class="pg"') && p.endsWith('</div>')), '페이지 HTML 형식');
ok(/테스트님의/.test(pg[0]) && /경진일주/.test(pg[0]), '표지에 이름·일주');
ok(!pg.join('').includes('<script') && R.Pdf.pages(rep, sd, { name: '<img src=x onerror=1>' })[0].indexOf('<img') < 0, 'PDF HTML 이스케이프');
const sc = R.ShareCard.content(rep, sd, null), scJson = JSON.stringify(sc);
ok(sc.keywords.length === 3 && sc.pillar === '경진일주' && !/1990|0515|1430|M/.test(scJson), '공유 카드 내용에 생년월일·성별 없음: ' + scJson.slice(0, 120));
let bad = 0; for (let i = 0; i < 60; i++) { const c = mk(1950 + rnd(60), 1 + rnd(12), 1 + rnd(28), rnd(2) ? rnd(24) : null, rnd(2) ? 'M' : 'F'), s2 = R.SajuData.build(c, { now }), r2 = R.Compose.build(s2, lib, cfg); try { R.Pdf.pages(r2, s2, {}); R.ShareCard.content(r2, s2, null); } catch (e) { bad++; } }
ok(bad === 0, '무작위 사주 60개 PDF/카드 생성 오류 ' + bad);

console.log('4d. 일간 소개 영상');
const il = [{ stem: '경', gender: 'M', videoUrl: 'https://e.com/g.mp4', enabled: true }, { stem: '庚', gender: 'F', videoWebm: 'https://e.com/g.webm' }, { stem: '갑', gender: 'M', videoUrl: '/api/clipfile?k=a.mp4', enabled: false }];
ok(R.Media.pickIlgan(il, '경', 'M').videoUrl === 'https://e.com/g.mp4' && R.Media.pickIlgan(il, '경금', '여') && R.Media.pickIlgan(il, '경', 'F').videoWebm, '일간·성별로 선택(한자·두 글자 허용)');
ok(R.Media.pickIlgan(il, '갑', 'M') === null && R.Media.pickIlgan(il, '임', 'M') === null, '비활성·미등록은 null → 단계 건너뜀');
const ic = R.Media.ilganCoverage(il); ok(ic.of === 20 && ic.male === 1 && ic.female === 1, '일간 소개 커버리지 x/20');
console.log('5. 기존 엔진 회귀');
const snap = fs.existsSync(path.join(root, 'tests/regression-snapshot.js'));
ok(snap, '기존 회귀 스냅샷 테스트 존재(별도 실행)');
if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\n모두 통과');
