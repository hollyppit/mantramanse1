// AI Composer 서버 로직 검증:  node tests/compose-api-sim.js   (functions/_compose.js 는 import 없는 순수 모듈)
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const root = path.join(__dirname, '..'), tmp = path.join(os.tmpdir(), 'compose-test.mjs');
fs.writeFileSync(tmp, fs.readFileSync(path.join(root, 'functions/_compose.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8')); globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'content', 'remedy', 'media', 'scenes', 'compose'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8')));
(async () => {
  const C = await import(require('url').pathToFileURL(tmp).href), R = globalThis.ReportV2, M = globalThis.Manse;
  const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
  const cfg = R.Chapters.merge({ chapters: [{ id: 'c20', aiEnabled: false }] }), lib = R.Compose.library({ media: [{ id: 'mA', type: 'image', url: 'https://t/a.webp', tags: ['metal', 'growth', 'expansion'], priority: 50 }, { id: 'mB', type: 'image', url: 'https://t/b.webp', tags: ['metal', 'growth', 'expansion'], priority: 40 }] });
  const sd = R.SajuData.build(M.compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, calendar: 'solar', leap: false, gender: 'M', city: '서울' }), { now: Date.UTC(2026, 9, 5) });
  const rep = R.Compose.build(sd, lib, cfg), body = { payload: R.Compose.aiPayload(rep), media: R.Compose.mediaPayload(rep, lib) };
  ok(body.payload.chapters.length === 19 && !body.payload.chapters.some(c => c.id === 'c20'), 'aiEnabled:false 챕터는 AI 로 보내지 않음');
  ok(!/1990|0515|14:30/.test(JSON.stringify(body)), '요청 본문에 생년월일 없음');
  const sc = body.media.scenes.find(s => s.candidates.length > 1) || body.media.scenes[0]; ok(!!sc, '미디어 후보 payload 존재');
  const c1 = body.payload.chapters[0];
  let calls = 0, store = {};
  const good = JSON.stringify({ chapters: [{ id: 'c01', headline: '단단하게 결을 세우는 사람입니다', lead: '기준이 분명하고 완성도를 중시하는 경향이 있습니다.' }, { id: 'c02', headline: '반드시 성공하는 사람', lead: '문제 없는 문장입니다. 3000개의 비밀' }, { id: 'zz', headline: '없는 챕터입니다 정말로' }], media: { [sc.sceneId]: sc.candidates[sc.candidates.length - 1][0], other: 'FAKE' } });
  const deps = { kvGet: async k => store[k], kvPut: async (k, v) => { store[k] = v; }, llm: async () => { calls++; return '설명 ' + good + ' 끝'; } };
  const r1 = await C.runCompose(body, deps);
  if (!r1.ok) console.log('r1', JSON.stringify(r1)); ok(r1.ok && !r1.cached, '1차 호출 성공');
  ok(r1.result.chapters.some(c => c.id === 'c01' && c.headline && c.lead), '정상 항목 반영');
  const c2 = r1.result.chapters.find(c => c.id === 'c02'); ok(!c2 || (!c2.headline && !(c2.lead || '').includes('3000')), '단정 표현·원문에 없는 숫자 거부');
  ok(!r1.result.chapters.some(c => c.id === 'zz'), '없는 챕터 id 무시');
  ok(r1.result.media[sc.sceneId] && !('other' in r1.result.media), '후보 안의 assetId 만 허용, 가짜 id 무시');
  const r2 = await C.runCompose(body, deps); ok(r2.cached && calls === 1, '같은 입력은 캐시(LLM 1회만 호출)');
  const body2 = JSON.parse(JSON.stringify(body)); body2.payload.chapters[0].interpretation += ' 추가';
  await C.runCompose(body2, deps); ok(calls === 2, '내용이 다르면 다른 캐시 키');
  ok((await C.runCompose(body, { ...deps, kvGet: null, kvPut: null, llm: async () => { throw new Error('boom'); } })).error === 'llm-failed', 'LLM 실패 → ok:false (클라이언트는 원본 유지)');
  ok((await C.runCompose(body, { ...deps, kvGet: null, kvPut: null, llm: async () => 'JSON 아님' })).error === 'bad-answer', '형식 불량 응답 거부');
  ok((await C.runCompose({ payload: { chapters: 'x' } }, deps)).error === 'bad-payload' && (await C.runCompose(null, deps)).error === 'bad-payload', '잘못된 요청 거부');
  const huge = JSON.parse(JSON.stringify(body)); for (let i = 0; i < 30; i++) huge.payload.chapters.push({ id: 'x' + i, fact: 'ㄱ'.repeat(800), headline: 'ㄱ'.repeat(800), interpretation: 'ㄱ'.repeat(800), meaning: 'ㄱ'.repeat(800) }); ok((await C.runCompose(huge, deps)).error === 'bad-payload', '과대 payload 거부');
  // 클라이언트 적용
  const before = rep.chapters[0].headline; R.Compose.applyResult(rep, r1.result, lib);
  ok(rep.chapters[0].headline === '단단하게 결을 세우는 사람입니다' && rep.chapters[0].scenes[0].body === rep.chapters[0].headline, '적용 후 장면 문구도 갱신');
  ok(rep.meta.aiApplied, 'aiApplied 표시'); R.Compose.applyResult(rep, null, lib);
  const ids = rep.chapters.flatMap(c => c.scenes).filter(s => s.media).map(s => s.media.assetId); ok(new Set(ids).size === ids.length, 'AI 미디어 교체 후에도 중복 없음');
  if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
  console.log('AI 컴포저 검증 모두 통과 (LLM 호출 ' + calls + '회)');
})();
