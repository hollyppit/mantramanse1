// 패널 이미지(무빙툰 컷) 검증:  node tests/panel-sim.js   — 프리셋·태그·모델 호출(모의 fetch)·공통 등장 연출 소스 검사
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), fails = [], ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  const P = await import(require('url').pathToFileURL(path.join(root, 'functions/_panelart.js')).href);
  const M = await import(require('url').pathToFileURL(path.join(root, 'functions/_media.js')).href);
  console.log('1. 프리셋·태그');
  const ps = P.presets(); ok(ps.length === 50 && new Set(ps.map(p => p.id)).size === 50, '프리셋 50개(오행 5 × 주제 10), id 중복 없음');
  for (const p of ps) {
    const it = P.mediaItem(p.element, p.theme, '/api/clipfile?k=x.webp', 10, 't');
    ok(it && it.url && it.enabled && it.tagsApproved, p.id + ' 라이브러리 항목이 유효');
    ok(it.elementTags[0] === p.element && it.themeTags[0] === p.theme && it.sceneTags.length >= 2 && it.visualRole.includes('hero'), p.id + ' 태그가 TAX 안에서 모두 살아 있음(걸러지지 않음)');
    ok(!/글자·숫자/.test('') && P.promptFor(p.element, p.theme).includes('글자·숫자'), p.id + ' 프롬프트에 글자 금지');
  }
  console.log('1b. 용도 구분(본문 컷 panel- / 배경 panelbg-)');
  const bgs = P.presets('bg'); ok(bgs.length === 50 && new Set(bgs.map(p => p.id)).size === 50 && bgs.every(p => /^panelbg-/.test(p.id) && p.kind === 'bg'), '배경 프리셋 50개, id 는 panelbg- 접두사');
  ok(!ps.some(p => bgs.some(b => b.id === p.id)) && ps.every(p => /^panel-/.test(p.id)), '본문 컷과 배경 id 가 겹치지 않는다');
  for (const p of bgs) {
    const it = P.mediaItem(p.element, p.theme, '/api/clipfile?k=x.webp', 10, 't', '/api/clipfile?k=v.mp4', 'bg');
    ok(it && it.id === p.id && it.visualRole.includes('background') && it.panelVideo && it.loopable, p.id + ' 배경 항목: 역할 background · 영상 반복');
    ok(P.promptFor(p.element, p.theme, null, 'bg').includes('배경') && P.promptFor(p.element, p.theme, null, 'bg') !== P.promptFor(p.element, p.theme, null, 'panel'), p.id + ' 배경 프롬프트는 본문 컷과 다르다');
  }
  console.log('1c. 외부 도구용 프롬프트(Leonardo · Kling)');
  const PP = await import(require('url').pathToFileURL(path.join(root, 'functions/_panelprompts.js')).href), hangul = /[가-힣]/;
  const allT = ps.map(p => PP.toolsFor(p.element, p.theme, null, 'panel')); ok(allT.every(Boolean) && new Set(allT.map(t => t.leo)).size === 50 && new Set(allT.map(t => t.kling)).size === 50, '50칸 모두 서로 다른 이미지·영상 프롬프트');
  ok(allT.every(t => !hangul.test(t.leo) && !hangul.test(t.kling) && /No text/.test(t.leo) && /Vertical 2:3/.test(t.leo)), '프롬프트는 영어, 글자 금지·세로 2:3 포함(추가 방향을 안 쓴 기본값)');
  ok(allT.every(t => /webtoon-style/.test(t.leo) && /cinematic mood/.test(t.leo) && /present-day Korea/.test(t.leo) && /face and expression are clearly visible/.test(t.leo) && /Main character design/.test(t.leo) && !/ink-wash|hanbok-inspired/.test(t.leo)), '기본 방향 = 웹툰풍 + 영화 감성 + 현대 한국 + 얼굴이 보이는 인물');
  ok(allT.every(t => /face, identity/.test(t.kling) && /natural blink/.test(t.kling)) && /face morphing/.test(allT[0].klingNeg), '영상 프롬프트는 얼굴·정체성 유지와 자연스러운 깜빡임');
  ok(/dark, calm and low-contrast/.test(PP.toolsFor('wood', 'love', null, 'bg').leo) && !/Vertical 2:3/.test(PP.toolsFor('wood', 'love', null, 'bg').leo), '배경 용도는 어둡고 초점 없는 프롬프트');
  ok(/Fire/.test(PP.toolsFor('fire', 'love', null, 'panel').leo) && /push-in/.test(PP.toolsFor('fire', 'love', null, 'panel').kling) && PP.toolsFor('zzz', 'love') === null, '오행 영어 이름·카메라 지시 포함, 잘못된 칸은 null');
  console.log('1d. 본문 컷 성별 칸(panelF · panelM)');
  const pf = P.presets('panelF'), pm = P.presets('panelM');
  ok(pf.length === 50 && pm.length === 50 && pf.every(p => /^panel-[a-z]+-[a-z]+-F$/.test(p.id) && p.gender === 'F') && pm.every(p => /-M$/.test(p.id) && p.gender === 'M'), '여성·남성 프리셋 각 50개, id 는 panel-오행-주제-F / -M');
  ok(new Set(ps.concat(pf, pm, bgs).map(p => p.id)).size === 200, '공용 50 + 여성 50 + 남성 50 + 배경 50 = 200칸, id 중복 없음');
  ok(pf.every((p, i) => { const f = P.promptFor(p.element, p.theme, null, 'panelF'), m = P.promptFor(p.element, p.theme, null, 'panelM'); return /한국인 여성/.test(f) && !/한국인 남성/.test(f) && /한국인 남성/.test(m) && !/한국인 여성/.test(m) && /얼굴과 표정이 또렷/.test(f) && /현대 한국/.test(f) && !/뒷모습/.test(f); }), '자체 생성 프롬프트: 성별 주인공 · 표정이 보이는 현대 한국 장면(뒷모습·한옥 문구 없음)');
  ok(P.promptFor('wood', 'love', null, 'panel').includes('한국인 청년') && !/한국인 여성|한국인 남성/.test(P.promptFor('wood', 'love', null, 'panel')), '공용 칸은 성별을 정하지 않는다');
  ok(/연인\(이성\)/.test(P.promptFor('fire', 'love', null, 'panelM')) && !/주인공이/.test(P.promptFor('fire', 'love', null, 'panelM')), '사랑 컷은 이성 연인과 함께, 자리표시({P}) 남지 않음');
  const itF = P.mediaItem('wood', 'career', '/api/clipfile?k=x.webp', 10, 't', '', 'panelF'); ok(itF.id === 'panel-wood-career-F' && itF.visualRole.includes('hero') && itF.priority > P.mediaItem('wood', 'career', '/api/clipfile?k=x.webp', 10, 't', '', 'panel').priority, '성별 칸 라이브러리 항목: id · 공용보다 우선순위 높음');
  ok(!/PLOT|\{P\}/.test(P.promptFor('earth', 'identity', null, 'panelF')) && /색과 빛: .*황토/.test(P.promptFor('earth', 'identity', null, 'panelF')) && !/안개 낀 숲|등불/.test(P.promptFor('wood', 'talent', null, 'panelM') + P.promptFor('fire', 'wealth', null, 'panelF')), '본문 컷 빛·색은 장소와 어긋나는 문구(숲·등불) 없이 조명 분위기만');
  console.log('1e. 성별 외부 프롬프트');
  const tf = PP.toolsFor('metal', 'career', null, 'panelF'), tm = PP.toolsFor('metal', 'career', null, 'panelM'), t0 = PP.toolsFor('metal', 'career', null, 'panel');
  ok(/young Korean woman/.test(tf.leo) && /in her late 20s/.test(tf.leo) && /young Korean man/.test(tm.leo) && /in his late 20s/.test(tm.leo) && /young Korean adult/.test(t0.leo) && !/\{c\}/.test(tf.leo + tm.leo + t0.leo), 'Leonardo 프롬프트가 성별(woman·man·adult)을 따른다');
  ok(PP.toolsFor('fire', 'love', null, 'panel').leo.indexOf('main character is the') < 0 && /main character is the woman/.test(PP.toolsFor('fire', 'love', null, 'panelF').leo), '공용 사랑 컷은 주인공 성별 문구 없이, 여성 칸은 woman 명시');
  console.log('1f. 뷰어: 사용자 성별에 맞는 칸 선택');
  { const vm = require('vm'); const sandbox = { window: null }; sandbox.window = sandbox; vm.createContext(sandbox);
    ['scenes.js', 'director.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, 'report/v2', f), 'utf8'), sandbox, { filename: f }));
    const D = sandbox.ReportV2.Director, mk = (id, o) => Object.assign({ id, type: 'image', url: '/u/' + id, posterUrl: '/u/' + id, elementTags: ['water'], themeTags: ['wealth'], stateTags: [], emotionTags: [], sceneTags: [], actionTags: [], chapterTags: [], visualRole: ['hero'], enabled: true, tagsApproved: true, priority: 60 }, o || {});
    const intent = { mediaIntent: { elements: ['water'], themes: ['wealth'] } }, pick = (lib, g) => { const m = D.pickMedia(intent, lib, { usedIds: [], pool: 'panel', gender: g }); return m && m.assetId; };
    const lib = [mk('panel-water-wealth'), mk('panel-water-wealth-F'), mk('panel-water-wealth-M'), mk('panelbg-water-wealth', { visualRole: ['background', 'hero'] }), mk('clip-1')];
    ok(pick(lib, 'F') === 'panel-water-wealth-F' && pick(lib, 'M') === 'panel-water-wealth-M', '여성 사용자는 여성 칸, 남성 사용자는 남성 칸');
    ok(pick(lib, undefined) === 'panel-water-wealth', '성별을 모르면 공용 칸');
    ok(pick([lib[0], lib[1]], 'M') === 'panel-water-wealth', '남성 칸이 없으면 공용 칸(반대 성별 칸은 쓰지 않음)');
    ok(D.pickMedia(intent, lib, { usedIds: [] }).assetId !== 'panel-water-wealth-F' && !/^panel-/.test(D.pickMedia(intent, lib, { usedIds: [] }).assetId), '배경 풀은 본문 컷(성별 칸 포함)을 쓰지 않는다'); }
  console.log('2. 모델 선택(모의 fetch)');
  const calls = []; const png = Buffer.from('abc').toString('base64');
  globalThis.fetch = async (u, o) => { calls.push(u); if (/openai/.test(u)) return env.openaiFail ? new Response('no', { status: 400 }) : new Response(JSON.stringify({ data: [{ b64_json: png }] })); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: png } }] } }] })); };
  const env = { OPENAI_API_KEY: 'k', GEMINI_API_KEY: 'g' };
  let g = await P.generate(env, 'p'); ok(g.provider === 'openai' && g.model === 'gpt-image-2' && g.ext === 'webp', '기본은 OpenAI gpt-image-2');
  env.openaiFail = true; g = await P.generate(env, 'p'); ok(g.provider === 'gemini' && g.model === 'gemini-2.5-flash-image' && g.ext === 'png', 'OpenAI 실패 시 Gemini 로 넘어간다');
  g = await P.generate({ GEMINI_API_KEY: 'g' }, 'p'); ok(g.provider === 'gemini', 'Gemini 키만 있어도 동작');
  let err = ''; try { await P.generate({}, 'p'); } catch (e) { err = e.message; } ok(/키가 없습니다/.test(err), '키가 없으면 분명한 오류');
  console.log('3. 공통 등장 연출(소스 검사)');
  const css = fs.readFileSync(path.join(root, 'report/v2/reader.css'), 'utf8'), rj = fs.readFileSync(path.join(root, 'report/v2/reader.js'), 'utf8'), vj = fs.readFileSync(path.join(root, 'report/v2/viewer.js'), 'utf8');
  ok((css.match(/\.pn-rv\s*\{[^}]*transition/g) || []).length === 1 && !/@keyframes (?!rd-drift)/.test(css), '등장 연출은 .pn-rv 하나뿐(종류별 효과·키프레임 없음)');
  ok(/reduce \|\| !win\.IntersectionObserver/.test(rj), '동작 줄이기에서는 숨기지 않는다');
  ok(/rd-fig/.test(vj) && /planPanels\(rep\)/.test(vj), '뷰어가 패널(figure)을 만들고 챕터별로 배치한다');
  if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
  console.log('\n패널 이미지 검증 모두 통과');
})();
