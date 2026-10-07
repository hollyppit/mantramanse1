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
