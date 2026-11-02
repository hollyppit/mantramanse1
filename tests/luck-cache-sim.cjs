// 해석 캐시·기능 스위치·관리자 헤더 방어 검증
const fs = require('fs'), path = require('path'), vm = require('vm'), url = require('url');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a = eng.indexOf('var MANSE_DATA'), b = eng.indexOf('})(typeof window', a);
vm.runInThisContext(eng.slice(a, eng.indexOf('\n', b)));
const M = globalThis.Manse, LI = require(path.join(root, 'luck-interpret.js'));
(async () => {
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const inp = { year: 1990, month: 3, day: 15, hour: 14, minute: 30, calendar: 'solar', leap: false, gender: 'F', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };
  const ch = M.compute(inp), s26 = M.seunRange(ch, 2026, 2026)[0], s25 = M.seunRange(ch, 2025, 2025)[0], s27 = M.seunRange(ch, 2027, 2027)[0];
  const st0 = { ...LI.cacheStats };
  const r1 = LI.buildCached(M, ch, s26, 'seun', { daeun: s26.daeun, prev: s25 }), r2 = LI.buildCached(M, ch, s26, 'seun', { daeun: s26.daeun, prev: s25 });
  ok(r1 === r2 && LI.cacheStats.hit - st0.hit === 1 && LI.cacheStats.miss - st0.miss === 1, '같은 입력 캐시 적중');
  ok(JSON.stringify(r1) === JSON.stringify(LI.build(M, ch, s26, 'seun', { daeun: s26.daeun, prev: s25 })), '캐시 결과 = 직접 계산 결과');
  const r3 = LI.buildCached(M, ch, s26, 'seun', { daeun: s26.daeun, prev: s27 }); ok(r3 !== r1 && r3.change !== r1.change, '직전 기간이 다르면 다른 결과');
  const ch2 = M.compute({ ...inp, day: 16 }), x2 = M.seunRange(ch2, 2026, 2026)[0]; const m0 = LI.cacheStats.miss; LI.buildCached(M, ch2, x2, 'seun', { daeun: x2.daeun, prev: M.seunRange(ch2, 2025, 2025)[0] }); ok(LI.cacheStats.miss === m0 + 1, '출생 정보가 다르면 별도 캐시');
  const ch3 = M.compute(inp); const m1 = LI.cacheStats.miss; LI.buildCached(M, ch3, M.seunRange(ch3, 2026, 2026)[0], 'seun', {}); ok(LI.cacheStats.miss === m1 + 1, '같은 값이라도 새로 계산한 원국은 새 캐시(원국 재계산 시 무효화)');
  // 게시 문구 변경 → 무효화
  const id = r1.scenes[0].phraseId, newText = '새로 검수한 문장입니다.'; ok(id && r1.scenes[0].text !== newText, '대상 문구');
  const before = r1.scenes[0].text;
  ok(LI.applyPublished({ [id]: newText }) === 1, '게시 문구 적용');
  const r4 = LI.buildCached(M, ch, s26, 'seun', { daeun: s26.daeun, prev: s25 }); ok(r4 !== r1 && r4.scenes[0].text.startsWith(newText) && r4.scenes[0].text !== before, '문구 게시 후 캐시 무효화');
  ok(LI.applyPublished({ 'tg.없음.core': 'x' }) === 0, '적용 없음'); const r5 = LI.buildCached(M, ch, s26, 'seun', { daeun: s26.daeun, prev: s25 }); ok(r5 === r4, '적용 건수가 0이면 캐시 유지');
  // 기능 스위치
  const win = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8'), { window: win });
  ok(win.MANTRA_FLAGS.interpret === true && win.MANTRA_FLAGS.timeline === true && win.MANTRA_FLAGS.region === true, '스위치 기본값');
  const win2 = { MANTRA_FLAGS: { region: false } }; vm.runInNewContext(fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8'), { window: win2 }); ok(win2.MANTRA_FLAGS.region === false && win2.MANTRA_FLAGS.interpret === true, '스위치 덮어쓰기');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'); ok(/MANTRA_FLAGS\.interpret === false/.test(html) && /MANTRA_FLAGS\.timeline === false/.test(html) && /MANTRA_FLAGS\.region === false/.test(html) && html.indexOf('feature-flags.js') < html.indexOf('engine.js'), '화면의 스위치 연결');
  // 관리자 헤더 방어: 잘못된 퍼센트 인코딩이어도 500이 아니라 정상 처리
  for (const f of ['region', 'luck-phrases']) {
    const mod = await import(url.pathToFileURL(path.join(root, 'functions/api', f + '.js')).href);
    const kv = { m: new Map(), async get(k, t) { const v = this.m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { this.m.set(k, v); } };
    const body = f === 'region' ? { id: 'seoul', fact: 'infra', value: '값', source: { name: '출처', url: 'https://a.kr' }, updated: '2026-01-01' } : { id: 'tg.편관.scene.work', action: 'approve' };
    const res = await mod.onRequestPut({ request: new Request('https://x/api/' + f, { method: 'PUT', headers: { authorization: 'Bearer pw', 'x-reviewer': '%E0%A4%A', 'content-type': 'application/json' }, body: JSON.stringify(body) }), env: { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw' } });
    ok(res.status === 200, f + ' 잘못된 x-reviewer 헤더 → ' + res.status);
  }
  if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
  console.log('모든 검증 통과 · 캐시 적중/무효화(원국·문구·직전 기간) · 기능 스위치 · 헤더 방어');
})();
