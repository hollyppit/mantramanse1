// 총평(c00) 검증:  node tests/report-v2-verdict.js
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'charts', 'pdf'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null), now = Date.UTC(2026, 9, 5);
const sdOf = (y, m, d, h, g) => R.SajuData.build(M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }), { now });
const FIRST = '타고난 명(命)에서 두드러지는 동력을 먼저 살펴봅니다.', BAN = /(반드시|무조건|확정|100%|틀림없)/;
const cases = [[1990, 5, 17, 14, 'M'], [1984, 2, 10, 6, 'F'], [1974, 9, 3, 23, 'M'], [2000, 12, 25, 12, 'F'], [1964, 1, 15, 11, 'M'], [1992, 6, 23, 1, 'M']];
const srcs = {};
cases.forEach(c => {
  const sd = sdOf.apply(null, c), rep = R.Compose.build(sd, lib, cfg), ch = rep.chapters[0], v = ch.verdict;
  ok(ch.id === 'c00' && ch.title === '運路 · 序章' && ch.subtitle === '타고난 가장 큰 동력과 아직 쓰이지 않은 부분', 'c00 제목·부제 ' + c);
  ok(ch.headline === FIRST, '첫 문장 고정');
  ok(ch.scenes.map(s => s.sceneType).join('>') === 'chapterIntro>verdictFind>verdictBlock>verdictEvidence>verdictAdvice>chapterEnding', '장면 순서 ' + ch.scenes.map(s => s.sceneType));
  ok(v.potential.name === R.Verdict.POTENTIAL[sd.dominantGroup] && v.potential.pct === Math.round(sd.groups[sd.dominantGroup]), '잠재력 이름·%');
  ok(v.discover.includes(v.potential.pct + '%') && /(?:균등 기준|다섯 군을 고르게 나눈 기준)\(20%\)/.test(v.discover), '평균 대비 문장');
  ok(v.blocked.text.length > 20 && v.blocked.id, '막힘 문장 1개 필수');
  ok(v.evidence && v.evidence.startYear === sd.currentDaewoon.startYear && v.evidence.text.includes(String(sd.currentDaewoon.startYear)), '증거: 대운 시작 연도');
  ok(JSON.stringify(v.advice.items) === JSON.stringify(rep.plan.checklist.slice(0, 2)) && v.advice.items.length === 2, '조언 = checklist 상위 2개 그대로');
  ok(!/\{[\w.가-힣]+\}/.test(v.discover + v.blocked.text + v.evidence.text), '미치환 템플릿 없음');
  ok(![v.discover, v.blocked.text, v.evidence.text, v.advice.lead].some(t => BAN.test(t)), '단정어 없음');
  ok(!/(해요|이에요|예요)/.test(v.discover + v.evidence.text + v.advice.lead) && !/수호/.test(v.discover + v.evidence.text + v.evidence.yes + v.evidence.no + v.advice.lead), '상담체·수호신 없음');
  ok(rep.meta.warnings.length === 0, '경고 0');
  console.log('■ ' + sd.dayPillar.ko + ' | ' + v.potential.name + ' ' + v.potential.pct + '% (' + v.potential.times + '배) | 막힘 ← ' + v.blocked.source + ':' + v.blocked.id + ' | 증거 ' + v.evidence.startYear + ' | 조언 ' + v.advice.items.length);
  srcs[v.blocked.source] = (srcs[v.blocked.source] || 0) + 1;
});
console.log('막힘 출처 분포', JSON.stringify(srcs));

// 대운 정보 없으면 증거 장면 생략
const sd0 = sdOf(1990, 5, 17, 14, 'M'); sd0.currentDaewoon = null;
const r0 = R.Compose.build(sd0, lib, cfg), c0 = r0.chapters[0];
ok(!c0.verdict.evidence && c0.scenes.map(s => s.sceneType).join('>') === 'chapterIntro>verdictFind>verdictBlock>verdictAdvice>chapterEnding', '대운 없으면 증거 장면 생략');

// 막힘 폴백: 과다·결핍 모듈이 하나도 없으면 c05 lead
const sdF = sdOf(1990, 5, 17, 14, 'M'), libNo = Object.assign({}, lib, { modules: lib.modules.filter(m => !/^pro_(high|zero)_/.test(m.id)) }), rF = R.Compose.build(sdF, libNo, cfg);
ok(rF.chapters[0].verdict.blocked.source === 'c05' && rF.chapters[0].verdict.blocked.text.length > 10, '막힘 폴백 = c05 lead');

// 클라이언트 AI 적용: 첫 문장 고정, 막힘 50% 규칙
const rep = R.Compose.build(sdOf(1990, 5, 17, 14, 'M'), lib, cfg), v = rep.chapters[0].verdict, base = v.blocked.text, baseLen = base.length;
const short = '막힘이 조금 있습니다 정도로 줄인 문장입니다.', soft = base.slice(0, Math.floor(baseLen * 0.4));
const strong = base.replace(/\s+$/, '') + ' 이 지점을 그냥 두면 같은 자리에서 반복됩니다.';
R.Compose.applyAi(rep, { chapters: [{ id: 'c00', headline: '아무 말이나 바꾼 첫 문장입니다', lead: '바꾼 리드 문장입니다', verdict: { blocked: soft, discover: '칭찬만 가득한 새 발견 문장입니다 정말 훌륭합니다.' } }] });
ok(rep.chapters[0].headline === FIRST, 'AI 가 첫 문장을 못 바꿈');
ok(rep.chapters[0].verdict.blocked.text === base, '막힘이 50% 미만으로 줄면 AI 결과 버림');
ok(soft.length < baseLen * 0.5 && short.length < baseLen * 0.5, '(테스트 전제) 짧은 문장');
R.Compose.applyAi(rep, { chapters: [{ id: 'c00', verdict: { blocked: strong } }] });
ok(rep.chapters[0].verdict.blocked.text === strong && rep.chapters[0].scenes.find(s => s.sceneType === 'verdictBlock').body === strong, '충분한 길이면 채택 + 장면 갱신');
ok(JSON.stringify(rep.chapters[0].verdict.advice.items) === JSON.stringify(R.Compose.build(sdOf(1990, 5, 17, 14, 'M'), lib, cfg).plan.checklist.slice(0, 2)), 'AI 가 조언을 못 바꿈');
const pl = R.Compose.aiPayload(R.Compose.build(sdOf(1990, 5, 17, 14, 'M'), lib, cfg)).chapters[0];
ok(pl.id === 'c00' && pl.verdict.blocked && pl.verdict.discover, 'AI payload 에 총평 재료 포함');

// PDF
const pg = R.Pdf.pages(R.Compose.build(sdOf(1990, 5, 17, 14, 'M'), lib, cfg), sdOf(1990, 5, 17, 14, 'M'), {});
ok(pg.some(p => p.includes('이 힘이 아직 다 쓰이지 않는 이유')), 'PDF 에 막힘 문장');

// 서버 sanitize (functions/_compose.js)
const tmp = path.join(os.tmpdir(), 'compose-verdict-test.mjs'); fs.writeFileSync(tmp, fs.readFileSync(path.join(root, 'functions/_compose.js'), 'utf8'));
import(require('url').pathToFileURL(tmp).href).then(S => {
  const clean = S.validatePayload({ payload: R.Compose.aiPayload(R.Compose.build(sdOf(1990, 5, 17, 14, 'M'), lib, cfg)) });
  const c00 = clean.chapters.find(c => c.id === 'c00'); ok(c00 && c00.verdict && c00.verdict.blocked === base.slice(0, 400), '서버 payload 에 verdict 통과');
  const mk = o => S.sanitize(JSON.stringify({ chapters: [Object.assign({ id: 'c00' }, o)] }), clean);
  const r1 = mk({ headline: '바꾼 첫 문장입니다 확인', verdict: { blocked: strong } });
  ok(r1 && r1.chapters[0].verdict.blocked === strong.trim() && !r1.chapters[0].headline, '서버: 막힘 채택, 첫 문장은 무시');
  ok(mk({ verdict: { blocked: soft } }) === null, '서버: 50% 미만 막힘은 버림');
  ok(mk({ verdict: { blocked: strong + ' 반드시 고치십시오.' } }) === null, '서버: 단정어 버림');
  ok(S.SYSTEM.includes('칭찬만 하지 마라') && S.SYSTEM.includes('약하게'), '서버 프롬프트에 칭찬만·약하게 금지 규칙');
  console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '\n총평 검증 모두 통과');
  process.exit(fails.length ? 1 : 0);
});
