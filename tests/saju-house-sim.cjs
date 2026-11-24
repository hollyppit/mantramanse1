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
      if (p.absent) { seenAbsent.add(p.i); ok(/비어 있어요/.test(line.t) && !/햇살을 받아요/.test(line.t), '없는 부분에 햇살 ' + i); ok(/ABSENT/.test(pr) || p.i === 0, '없는 부분 금지 빠짐 ' + i); }
      ok(H.partInfo(sp, p.i) && H.partInfo(sp, p.i).line === line.t, '부분 정보 ' + i);
    });
    sp.ix.forEach(o => ok(cap.some(c => c.k === H.IX_KO[o.k]), '구조 설명 빠짐 ' + o.k + ' ' + i));
    ok(!/[가-힣]/.test(pr) && !/undefined|NaN|null/.test(pr) && /^Photorealistic photograph of a detailed handcrafted architectural miniature/.test(pr), '프롬프트 ' + i);
    ok(cl.some(c => c.id === 'notext' && c.critical) && cl.some(c => c.id === 'tank' && c.critical) && cl.some(c => /^roof/.test(c.id) && c.critical), '중요 검사 항목 ' + i);
    ok(sc.parts[4].absent ? cl.some(c => c.id === 'roof-no') : cl.some(c => c.id === 'roof'), '지붕 검사 방향 ' + i);
    ok(/^<svg[\s\S]*<\/svg>$/.test(sv) && /<text/.test(sv) && !/NaN|undefined/.test(sv) && (sv.match(/data-part="\d"/g) || []).length >= 10, '단면도 ' + i);
    ok(!/<text/.test(sk), '참고 그림에 글자 ' + i);
    ok(!/(이이|가가|은은|는는)[ .]|이에요이에요|예요예요/.test(capT), '조사 ' + i);
  }
  ok(seenIx.size >= 8, '구조 종류가 너무 적게 나옴 ' + seenIx.size);
  ok(seenAbsent.size >= 2, '없는 부분 사례 부족');
  ok(keys.size > 150, '명세 키 다양성 ' + keys.size);

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
  ok(lastPrompt === H.prompt(base) && /miniature house/.test(lastAsk), '서버가 집 프롬프트·집 검사 문장 사용');
  kv.set('luckenv:flags', JSON.stringify({ mulsangArt: true, sajuHouse: true }));
  r = await call({ kind: 'house', spec: base }); ok(r.j.cached && !r.j.debug, '스위치 켜짐·저장본 재사용·비관리자 디버그 숨김');
  r = await call({ kind: 'house', spec: { v: 1, pillars: {} } }); ok(r.s === 400, '풍경 명세를 집으로 보내면 거부');

  console.log('4. 화면·스위치');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), lf = fs.readFileSync(path.join(root, 'functions/api/luck-flags.js'), 'utf8'), adm = fs.readFileSync(path.join(root, 'report/admin/v2-luckenv.js'), 'utf8');
  ok(html.includes('<script src="saju-house.js"></script>') && html.indexOf('${houseCard(ch)}') > html.indexOf('function renderOhaeng()') && html.indexOf('${houseCard(ch)}') < html.indexOf('${renderGyeokAnalysis(ch)}'), '오행·강약 탭 십성 분포 아래 카드');
  ok(/'sajuHouse'\]\);/.test(lf) && adm.includes('id="leSH"') && adm.includes('sajuHouse: v') && /'mulsangArt', 'sajuHouse'\]\.forEach/.test(html), '스위치 연결');
  ok(html.includes("#saju-house [data-part]") && html.includes("data-act=\"hs-gen\""), '부분 누르기·실사 버튼');

  console.log(fail ? `\n✗ ${fail}/${n} 실패` : `\n✓ 사주의 집 검증 ${n}항목 통과`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
