// 사주의 집(saju-house.js · /api/mulsang-art kind=house) 검증 — 2026-11-24
//   node tests/saju-house-sim.cjs
// 1) 사주 300명: 명세가 십성 엔진(ten-god-roles)·강약과 맞고, 설명·단면도·프롬프트·검사 목록이 비거나 모순되지 않음
// 2) clean 이 잘못된 명세를 거름 3) API kind=house: 스위치·저장 이름·풍경과 분리 4) 화면·스위치 연결
const fs = require('fs'), path = require('path'), vm = require('vm'), url = require('url');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
require(path.join(root, 'ten-god-roles.js')); const T = globalThis.MantraTenGodRoles;
const H = require(path.join(root, 'saju-house.js'));
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 40) console.log('  ✗ ' + m); } };

(async () => {
  console.log('1. 사주 300명');
  let seed = 5150; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const seenIx = new Set(), seenAbsent = new Set(), keys = new Set();
  for (let i = 0; i < 300; i++) {
    const ch = M.compute({ year: 1940 + Math.floor(rnd() * 80), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 9 ? Math.floor(rnd() * 24) : '', minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' });
    const sp = H.fromChart(M, ch); ok(sp, '명세 없음 ' + i); if (!sp) continue;
    keys.add(H.key(sp));
    ok(JSON.stringify(H.clean(JSON.parse(JSON.stringify(sp)))) === JSON.stringify(sp), '명세 왕복 ' + i);
    ok(!/year|month|day|hour|name|birth/.test(JSON.stringify(sp)), '명세에 생년월일 흔적 ' + i);
    ok(sp.help === Math.round(ch.strength.help), '강약 불일치 ' + i);
    const r = T.analyze(M, ch);
    sp.g.forEach((q, gi) => ok(q.p === Math.round(ch.weights.groups[gi]), '십성 비율 불일치 ' + gi + ' ' + i));
    const on = r.interactions.filter(o => o.status !== 'off').map(o => o.key).sort();
    ok(JSON.stringify(sp.ix.map(o => o.k).sort()) === JSON.stringify(on), '구조 성립 목록 불일치 ' + i);
    sp.ix.forEach(o => seenIx.add(o.k));
    const sc = H.scene(sp), cap = H.caption(sp), capT = cap.map(c => c.t).join('\n'), pr = H.prompt(sp), cl = H.checklist(sp), sv = H.svg(sp), sk = H.sketchSVG(sp);
    ok(cap.length >= 6 && !/undefined|NaN|null|\[object/.test(capT), '설명 빈 값 ' + i);
    sc.parts.forEach(p => {
      const line = cap.filter(c => c.i === p.i)[0]; ok(line && line.t.includes(p.gn + ' ' + p.p + '%'), '부분 설명에 비율 없음 ' + p.i + ' ' + i);
      if (p.absent) { seenAbsent.add(p.i); ok(/비어 있어요/.test(line.t) && !/햇살을 받아요/.test(line.t), '없는 부분에 햇살 ' + i); }
      ok(H.partInfo(sp, p.i) && H.partInfo(sp, p.i).line === line.t, '부분 정보 ' + i);
    });
    sp.ix.forEach(o => ok(cap.some(c => c.k === H.IX_KO[o.k]), '구조 설명 빠짐 ' + o.k + ' ' + i));
    ok(!/[가-힣]/.test(pr) && !/undefined|NaN|null/.test(pr) && /^Cinematic, photorealistic photograph of one ordinary Korean adult/.test(pr), '한 장면 프롬프트 ' + i);
    { const S = H.summary(sp); ok(cl.some(c => c.id === 'notext' && c.critical) && cl.some(c => c.id === 'person' && c.critical) && (S.over == null || cl.some(c => c.id === 'over' && c.critical)) && cl.some(c => c.id === 'need'), '중요 검사 항목 ' + i);
      ok(H.key(sp) === 'scene1|' + (S.over == null ? 'b' : S.over) + '|' + S.need + '|' + (sc.parts[S.need].absent ? 'x' : 'w'), '저장 키 = 유형 ' + i);
      ok(sc.parts[S.need].absent ? /no one|no roof|completely empty|no fences|shut/.test(pr) : /faint|slightly|a little|low, broken|thin, small/.test(pr), '필요한 칸 없음/약함 표현 ' + i); }
    ok(/^<svg[\s\S]*<\/svg>$/.test(sv) && /<text/.test(sv) && !/NaN|undefined/.test(sv) && (sv.match(/data-part="\d"/g) || []).length >= 10, '단면도 ' + i);
    ok(!/<text/.test(sk), '참고 그림에 글자 ' + i);
    ok(!/(이이|가가|은은|는는)[ .]|이에요이에요|예요예요/.test(capT), '조사 ' + i);
  }
  ok(seenIx.size >= 8, '구조 종류가 너무 적게 나옴 ' + seenIx.size);
  ok(seenAbsent.size >= 2, '없는 부분 사례 부족');
  ok(keys.size >= 10 && keys.size <= 30, '장면 유형 수(같은 유형은 그림 공유) ' + keys.size);

  console.log('1b. 한눈 요약(A 한 줄 진단 · B 물길 · C 장면)');
  { let seed2 = 777; const rnd2 = () => (seed2 = (seed2 * 1664525 + 1013904223) % 4294967296) / 4294967296; const heads = new Set();
    for (let i = 0; i < 300; i++) {
      const ch = M.compute({ year: 1940 + Math.floor(rnd2() * 80), month: 1 + Math.floor(rnd2() * 12), day: 1 + Math.floor(rnd2() * 28), hour: Math.floor(rnd2() * 24), minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' });
      const sp = H.fromChart(M, ch), S = H.summary(sp); ok(S, '요약 없음 ' + i); if (!S) continue; heads.add(S.headline);
      const all = [S.headline, S.sub].concat(S.notes.map(n => n.s), S.scenes.map(c => c.s)).join('\n');
      ok(!/undefined|NaN|null|\(으\)/.test(all), '요약 빈 값 ' + i);
      ok(S.over === null || S.over !== S.need, '넘침과 필요가 같은 칸 ' + i);
      const sc = H.scene(sp), top = sc.parts.slice().sort((a, b) => b.p - a.p || a.i - b.i)[0];
      ok(S.over === null ? top.f < 3 : S.over === top.i, '가장 큰 힘 판정 ' + i);
      const y = sc.parts.find(p => p.role === 'Y'); if (y && y.i !== S.over) ok(S.need === y.i, '필요한 힘 = 용신 칸 ' + i);
      ok(S.bars.length === 5 && S.bars.filter(b => b.mark === 'over').length === (S.over === null ? 0 : 1) && S.bars.filter(b => b.mark === 'need').length === 1, '막대 강조 ' + i);
      sc.parts.filter(p => p.absent).forEach(p => ok(S.notes.some(n => n.t === 'cut' && n.s.startsWith(H.EASY[p.i])), '끊긴 곳 안내 ' + i));
      ok(S.scenes.length === 3 && S.scenes.map(c => c.t).join() === 'over,need,got', '장면 3컷 ' + i);
      const fs2 = H.flowSVG(sp); ok(/^<svg[\s\S]*<\/svg>$/.test(fs2) && (fs2.match(/<circle/g) || []).length === 5 && !/NaN|undefined/.test(fs2), '물길 그림 ' + i);
    }
    ok(heads.size >= 12, '한 줄 진단 종류가 너무 적음 ' + heads.size);
    const html0 = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    ok(!html0.includes('sipSummaryCard'), '요약 카드는 사주의 집 한 카드로 합침');
    const c0 = html0.slice(html0.indexOf('function houseCard('), html0.indexOf('function renderOverview('));
    const at = k => c0.indexOf(k);
    ok(at('ss-head') > 0 && at('ss-head') < at('sh-wrap') && at('sh-wrap') < at('sh-scene') && at('sh-scene') < at('sh-more'), '진단 → 단면도 → 장면 한 줄 → 자세히 보기 순서');
    ok(c0.indexOf('focus: [S.over, S.need]') > 0 && at('ss-flow') > at('sh-more') && at('ss-scenes') > at('sh-more') && !c0.includes('data-act="hs-gen"'), '물길·장면 3컷은 자세히 보기 안, 실사 버튼 없음(2026-11-24 도형만)');
    { const sp0 = H.fromChart(M, M.compute({ year: 1987, month: 3, day: 15, hour: 14, minute: 30, gender: 'F', calendar: 'solar', school: 'eokbu' })), S0 = H.summary(sp0), sv = H.svg(sp0, { focus: [S0.over, S0.need] });
      ok((sv.match(/opacity:\.28/g) || []).length === 5 - [S0.over, S0.need].filter(x => x != null).length && /drop-shadow\(0 0 5px #D85A30\)/.test(sv) && /drop-shadow\(0 0 5px #639922\)/.test(sv), '단면도: 넘침·필요 두 부분만 강조'); } }

  console.log('2. clean');
  const ch0 = M.compute({ year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'F', calendar: 'solar', school: 'eokbu' }), base = H.fromChart(M, ch0);
  const bad = f => { const x = JSON.parse(JSON.stringify(base)); f(x); return H.clean(x); };
  ok(!bad(x => { x.dEl = 5; }), '일간 오행 범위'); ok(!bad(x => { x.g[0].p = 120; }), '비율 범위'); ok(!bad(x => { x.g.pop(); }), '다섯 묶음');
  ok(!bad(x => { x.ix.push({ k: 'hack', s: 'on', t: 'good' }); }), '모르는 구조'); ok(!bad(x => { x.ix = [{ k: 'salin', s: 'on', t: 'good' }, { k: 'salin', s: 'on', t: 'good' }]; }), '중복 구조');
  ok(!H.clean({ v: 1, prompt: 'anything' }), '임의 입력');

  console.log('3. API kind=house');
  const mod = await import(url.pathToFileURL(path.join(root, 'functions/api/mulsang-art.js')).href);
  const kv = new Map(), r2 = new Map();
  const env = { ADMIN_PASSWORD: 'pw', OPENAI_API_KEY: 'k', AI_COST_LOG_ON: '0', GLOSSARY_KV: { get: async (k, t) => { const v = kv.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { kv.set(k, v); } }, CLIPS_R2: { put: async (k, v) => { r2.set(k, v); }, head: async k => r2.has(k) ? { size: 1 } : null, delete: async k => { r2.delete(k); } } };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  let lastPrompt = '', lastAsk = '';
  global.fetch = async (u, o) => {
    if (/images\/(generations|edits)/.test(u)) { lastPrompt = typeof o.body === 'string' ? JSON.parse(o.body).prompt : o.body.get('prompt'); return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), { status: 200 }); }
    if (/chat\/completions/.test(u)) { lastAsk = JSON.parse(o.body).messages[0].content[0].text; const ids = [...lastAsk.matchAll(/^([a-z0-9-]+): /gm)].map(m => m[1]); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answers: Object.fromEntries(ids.map(i => [i, true])) }) } }] }), { status: 200 }); }
    throw new Error('unexpected ' + u);
  };
  const call = async (body, auth) => { const r = await mod.onRequestPost({ env, request: new Request('http://x/api/mulsang-art', { method: 'POST', headers: { 'content-type': 'application/json', authorization: auth ? 'Bearer ' + auth : '' }, body: JSON.stringify(body) }) }); return { s: r.status, j: await r.json() }; };
  kv.set('luckenv:flags', JSON.stringify({ mulsangArt: true }));
  let r = await call({ kind: 'house', spec: base }); ok(r.s === 403, '사주의 집 스위치 꺼짐 → 403(풍경 스위치와 별개)');
  r = await call({ kind: 'tower', spec: base }); ok(r.s === 400, '모르는 종류 → 400');
  r = await call({ kind: 'house', spec: base }, 'pw'); ok(r.s === 200 && r.j.pass && /k=house-[0-9a-f]{32}-/.test(r.j.url) && kv.has([...kv.keys()].find(k => k.startsWith('house:'))), '관리자 → 생성·house 저장');
  ok(lastPrompt === H.prompt(base) && /one person in a scene/.test(lastAsk), '서버가 집 프롬프트·집 검사 문장 사용');
  kv.set('luckenv:flags', JSON.stringify({ mulsangArt: true, sajuHouse: true }));
  r = await call({ kind: 'house', spec: base }); ok(r.j.cached && !r.j.debug, '스위치 켜짐·저장본 재사용·비관리자 디버그 숨김');
  r = await call({ kind: 'house', spec: { v: 1, pillars: {} } }); ok(r.s === 400, '풍경 명세를 집으로 보내면 거부');

  console.log('4. 화면·스위치');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), lf = fs.readFileSync(path.join(root, 'functions/api/luck-flags.js'), 'utf8'), adm = fs.readFileSync(path.join(root, 'report/admin/v2-luckenv.js'), 'utf8');
  ok(!html.includes('<script src="saju-house.js"></script>') && !html.includes('${houseCard(ch)}'), '2026-11-24 사용자 요청: 만세력에서 사주의 집 카드 뺌(모듈은 남김)');
  ok(/'sajuHouse'\]\);/.test(lf) && !adm.includes('id="leSH"') && !adm.includes('sajuHouse') &&/'mulsangArt', 'sajuHouse'\]\.forEach/.test(html), '스위치 연결');
  ok(html.includes("#saju-house [data-part]") && !html.includes("data-act=\"hs-gen\"") && !html.includes("a === 'hs-gen'"), '부분 누르기, 실사 버튼 없음');

  ok(html.includes("const XP_ART = { 'wonguk-mulsang': () => true };") && html.includes("d.open = true; d.setAttribute('open', '');"), 'PDF: 물상 도형은 늘 넣고 설명 펼침');
  ok(html.includes("if (el.id === 'saju-house') { const done = false;") && html.includes("c.querySelectorAll('details.sh-more').forEach(d => { if (done) { d.open = true; d.setAttribute('open', ''); } else d.remove(); });"), 'PDF: 사주의 집은 진단·단면도만(자세히 보기 뺌)');
  console.log(fail ? `\n✗ ${fail}/${n} 실패` : `\n✓ 사주의 집 검증 ${n}항목 통과`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
