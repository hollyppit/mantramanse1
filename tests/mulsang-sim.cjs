// 사주 물상 그림(mulsang.js · /api/mulsang-art) 검증 — 2026-11-24
//   node tests/mulsang-sim.cjs
// 1) 사주 300명: 명세·설명·프롬프트·검사 목록·밑그림이 엔진 값과 맞고 빈 값이 없음 2) 명세 검사(clean)가 잘못된 입력을 거름
// 3) 판정 규칙 4) API: 스위치·관리자·명세 거르기·생성→검사→저장·저장본 재사용·검사 실패 때 저장 안 함 5) 화면 연결
const fs = require('fs'), path = require('path'), vm = require('vm'), url = require('url');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
const MS = require(path.join(root, 'mulsang.js'));
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 40) console.log('  ✗ ' + m); } };
const ELK = ['목', '화', '토', '금', '수'];

(async () => {
  console.log('1. 사주 300명 — 명세·설명·프롬프트·검사 목록·밑그림');
  let seed = 9091; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const keys = new Set();
  for (let i = 0; i < 300; i++) {
    const ch = M.compute({ year: 1940 + Math.floor(rnd() * 80), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 9 ? Math.floor(rnd() * 24) : '', minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' });
    const sp = MS.fromChart(M, ch); ok(sp, '명세 없음 ' + i); if (!sp) continue;
    ok(JSON.stringify(MS.clean(JSON.parse(JSON.stringify(sp)))) === JSON.stringify(sp), '명세 왕복 불일치 ' + i);
    ok(!/year":\d{4}|month":\d{1,2},|name|birth/.test(JSON.stringify(sp)), '명세에 생년월일·이름 흔적 ' + i);
    ['year', 'month', 'day', 'hour'].forEach(k => { const p = ch.pillars[k]; ok(p ? sp.pillars[k].s === p.s && sp.pillars[k].b === p.b : sp.pillars[k] === null, '간지 불일치 ' + k + ' ' + i); });
    ok(sp.ratio.every((v, e) => v === Math.round(ch.weights.pct[e] || 0)), '오행 비율 불일치 ' + i);
    keys.add(MS.key(sp));
    const A = MS.action(sp), sc = MS.scene(sp), cap = MS.caption(sp), pr = MS.prompt(sp), cl = MS.checklist(sp), svg = MS.layoutSVG(sp), S = MS.summary(sp);
    const capT = cap.map(c => c.t).join('\n');
    ok(cap.length >= 5 && !/undefined|NaN|null|\[object/.test(capT), '설명 빈 값 ' + i);
    ok(capT.includes('일간 ' + '甲乙丙丁戊己庚辛壬癸'[ch.pillars.day.s]), '설명에 일간 없음 ' + i);
    ok(!/[가-힣]/.test(pr) && !/undefined|NaN|null/.test(pr), '프롬프트에 한글·빈 값 ' + i);
    ok(pr.includes('SUBJECT (one clear main subject, large and centered): ' + sc.main.obj.en) && pr.includes(MS.BR_OBJ[sp.pillars.month.b].en), '한 장면: 일간 물상·월지 땅 ' + i);
    ok(MS.sketchSVG(sp) === '', '한 장면은 밑그림 없음 ' + i);
    ok(S && S.headline.length > 6 && S.lines.length >= 2 && !/undefined|NaN|null/.test(S.headline + S.lines.map(l => l.t).join('')), '한 줄 진단·세 줄 ' + i);
    ok(S.need == null || S.headline.includes(S.needAbsent ? '없어 기다리는 사주' : '필요한 사주'), '진단에 필요한 기운 ' + i);
    ok(S.need == null || !S.needAbsent || (/NEED: there is none of the/.test(pr) && !/golden beam of sunlight falls on/.test(pr)), '없는 용신은 지평선 금빛만 ' + i);
    { const T = S.lines.map(l => l.t).join(' '); ok(!/(이이|가가|은은|는는)[ .]|undefined/.test(T), '세 줄 조사 ' + i + ': ' + T); }
    sc.absent.forEach(e => { ok(sp.ratio[e] === 0, '없는 오행 판단 오류 ' + i); ok(/ABSENT/.test(pr) && cl.some(c => c.id === 'absent-' + e && c.critical), '없는 오행 금지·검사 빠짐 ' + ELK[e] + ' ' + i); ok(A.parts.some(p => p.e === e && p.absent && p.short === '빈자리' && /원국에 없어요/.test(p.text)), '작용도에 없는 오행 안내 빠짐 ' + i); });
    const yIn = sc.yong.filter(e => sc.absent.indexOf(e) < 0);
    ok(!/golden glow falls on/.test(pr) || yIn.length > 0, '없는 용신에 빛을 비춤 ' + i);
    sc.yong.filter(e => sc.absent.indexOf(e) >= 0).forEach(() => ok(/원국에 없어 살면서 밖에서 채워/.test(A.sub), '없는 용신 안내 빠짐 ' + i));
    // 2026-11-24 도형(작용도): 다섯 관계 · 한 줄 진단 · 필요한 기운 · 그림 형식 · 조사
    { const T = A.headline + ' ' + A.sub + ' ' + A.season + ' ' + A.parts.map(p => p.text).join(' '), dia = MS.diagramSVG(sp);
      ok(A.parts.length === 5 && A.parts.map(p => p.rel).join() === '비겁,식상,재성,관성,인성' && A.headline.includes(sc.main.obj.short) && / 사주$/.test(A.headline), '작용도 다섯 관계·진단 ' + i + ': ' + A.headline);
      // 2026-11-24 흐름도: 비율 없이 '어떻게 움직이는지' — 상생 사슬(나를 지나감)·끊긴 곳·센 기운의 극, 번호 순서
      { const F = MS.flow(sp), fs2 = MS.flowSVG(sp), FT = F.steps.map(x => x.text + ' ' + x.tail).join(' ') + ' ' + F.end, d = sc.dEl;
        ok(F.steps.length >= 2 && F.steps.every((x, j) => x.n === j + 1 && x.text && /요\.$/.test(x.text)), '흐름 단계·번호 ' + i);
        ok(F.steps.some(x => x.a === d || x.b === d), '흐름이 나를 지나감 ' + i);
        ok(F.steps.filter(x => x.kind === 'cut').every(x => sc.absent.indexOf(x.b) >= 0) && F.steps.filter(x => x.kind === 'gen').every(x => x.b === (x.a + 1) % 5 && sc.absent.indexOf(x.b) < 0), '상생 사슬·끊김 규칙 ' + i);
        ok(F.steps.filter(x => x.kind === 'ke').every(x => x.b === (x.a + 2) % 5 && sp.ratio[x.a] >= 25), '극은 센 기운만 ' + i);
        ok(!/%/.test(FT) && !/(이이|가가|은은|는는|을을|를를|와와|과과)[ .]|undefined|NaN|null/.test(FT), '흐름 문장에 비율·조사 오류 없음 ' + i + ': ' + FT.slice(0, 90));
        ok(/^<svg[\s\S]*<\/svg>$/.test(fs2) && !/NaN|undefined|null|%/.test(fs2.replace(/<style>[\s\S]*?<\/style>/, '')) && (fs2.match(/class="m[fk]"/g) || []).length === F.steps.filter(x => x.kind !== 'cut').length, '흐름도 형식·움직이는 화살표 수 ' + i); }
      ok(!sc.yong.length || / 필요해요/.test(A.sub), '필요한 기운 문장 ' + i);
      ok(/^<svg[\s\S]*<\/svg>$/.test(dia) && !/NaN|undefined|null/.test(dia) && (dia.match(/<circle/g) || []).length >= 7, '작용도 그림 형식 ' + i);
      ok(!/(이이|가가|은은|는는|을을|를를|와와|과과)[ .]|[가-힣]이가 |undefined|NaN|null/.test(T), '작용도 조사·빈 값 ' + i + ': ' + T.slice(0, 80));
      ok(!/그림|그렸|화면|왼쪽|오른쪽/.test(capT), '설명에 그림 위치 말 없음 ' + i); }
    ok(cl.filter(c => c.critical).map(c => c.id).includes('main') && cl.some(c => c.id === 'notext' && c.critical), '중요 검사 항목 빠짐 ' + i);
    ok(/^<svg[\s\S]*<\/svg>$/.test(svg) && !/<text/.test(svg) && !/NaN|undefined/.test(svg), '밑그림 형식 ' + i);
    if (!ch.pillars.hour) ok(cap.some(c => /시를 몰라/.test(c.t)) && !/right foreground/.test(pr), '시 모름 처리 ' + i);
    ok(!/(이이|가가|은은|는는|을을|를를|와와|과과)[ .]|[가-힣]이가 |[가-힣]가이 |undefined/.test(capT), '조사 오류 ' + i + ': ' + (capT.match(/.{6}(이이|가가|은은|는는)[ .].{4}/) || [''])[0]);
  }
  ok(keys.size >= 60, '장면 키 다양성(같은 조합은 그림 공유) ' + keys.size);

  console.log('2. clean: 잘못된 명세 거르기');
  const ch0 = M.compute({ year: 1987, month: 3, day: 15, hour: 14, minute: 30, gender: 'F', calendar: 'solar', school: 'eokbu' }), base = MS.fromChart(M, ch0);
  const bad = f => { const x = JSON.parse(JSON.stringify(base)); f(x); return MS.clean(x); };
  ok(!bad(x => { x.pillars.day.s = 10; }), '천간 범위');
  ok(!bad(x => { x.pillars.day.b = 0; x.pillars.day.s = 9; }), '음양 짝 안 맞는 간지');
  ok(!bad(x => { x.ratio[0] = 101; }), '비율 범위');
  ok(!bad(x => { x.roles[0] = 'X'; }), '역할 코드');
  ok(!bad(x => { x.rels.push({ t: 'magic', k: 'stem', m: ['year', 'day'] }); }), '관계 종류');
  ok(!bad(x => { x.pillars.hour = null; x.rels = [{ t: 'clash', k: 'stem', m: ['hour', 'day'], el: null }]; }), '시 모를 때 시주 관계');
  ok(!bad(x => { x.v = 2; }), '버전');
  ok(!MS.clean({ v: 1, pillars: {}, prompt: 'draw anything' }), '임의 입력');
  ok(bad(x => { x.extra = 'draw a cat'; x.prompt = 'x'; }) && !/cat/.test(MS.prompt(bad(x => { x.extra = 'draw a cat'; }))), '모르는 칸은 버림');

  console.log('3. 판정 규칙');
  const cl0 = MS.checklist(base), allYes = Object.fromEntries(cl0.map(c => [c.id, true]));
  ok(MS.judge(base, allYes).pass, '모두 예 → 통과');
  ok(!MS.judge(base, { ...allYes, main: false }).pass, '주인공 없음 → 실패');
  ok(!MS.judge(base, { ...allYes, notext: false }).pass, '글자 있음 → 실패');
  const minor = cl0.filter(c => !c.critical).map(c => c.id);
  ok(MS.judge(base, { ...allYes, [minor[0]]: false }).pass, '사소한 1개 아니오 → 통과');
  ok(!MS.judge(base, { ...allYes, [minor[0]]: false, [minor[1]]: false }).pass, '사소한 2개 아니오 → 실패');

  console.log('4. API /api/mulsang-art');
  const mod = await import(url.pathToFileURL(path.join(root, 'functions/api/mulsang-art.js')).href);
  const kv = new Map(), r2 = new Map();
  const env = { ADMIN_PASSWORD: 'pw', OPENAI_API_KEY: 'k', AI_COST_LOG_ON: '0', GLOSSARY_KV: { get: async (k, t) => { const v = kv.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { kv.set(k, v); } },
    CLIPS_R2: { put: async (k, v) => { r2.set(k, v); }, head: async k => r2.has(k) ? { size: 1 } : null, delete: async k => { r2.delete(k); } } };
  let gens = 0, answerAll = true, lastPrompt = '';
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  global.fetch = async (u, o) => {
    if (/images\/(generations|edits)/.test(u)) { gens++; lastPrompt = typeof o.body === 'string' ? JSON.parse(o.body).prompt : o.body.get('prompt'); return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), { status: 200 }); }
    if (/chat\/completions/.test(u)) { const ids = [...JSON.parse(o.body).messages[0].content[0].text.matchAll(/^([a-z0-9-]+): /gm)].map(m => m[1]); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answers: Object.fromEntries(ids.map(i => [i, answerAll || i !== 'main'])) }) } }] }), { status: 200 }); }
    throw new Error('unexpected ' + u);
  };
  const call = async (body, auth) => { const r = await mod.onRequestPost({ env, request: new Request('http://x/api/mulsang-art', { method: 'POST', headers: { 'content-type': 'application/json', authorization: auth ? 'Bearer ' + auth : '' }, body: JSON.stringify(body) }) }); return { s: r.status, j: await r.json() }; };
  let r = await call({ spec: base }); ok(r.s === 403, '스위치 꺼짐·비관리자 → 403');
  kv.set('luckenv:flags', JSON.stringify({ mulsangArt: true }));
  r = await call({ spec: { ...base, pillars: { day: { s: 99 } } } }); ok(r.s === 400, '잘못된 명세 → 400');
  const sketch = 'data:image/png;base64,' + png.toString('base64');
  r = await call({ spec: base, sketch, attempt: 1 }); ok(r.s === 200 && r.j.pass && /^\/api\/clipfile\?k=mulsang-[0-9a-f]{32}-[0-9a-f]{8}\.webp$/.test(r.j.url) && gens === 1, '생성→검사 통과→저장');
  ok(lastPrompt === MS.prompt(base), '서버가 명세로 만든 프롬프트 그대로 사용');
  ok(!r.j.debug, '비관리자에게 프롬프트·명세 키 숨김');
  r = await call({ spec: base }); ok(r.j.cached && r.j.pass && gens === 1, '같은 명세는 저장본 재사용(생성 안 함)');
  r = await call({ spec: base, force: true }, 'pw'); ok(r.j.pass && gens === 2 && r.j.debug && r.j.debug.prompt, '다시 그리기(force)·관리자 디버그');
  ok([...r2.keys()].filter(k => k.startsWith('mulsang-')).length === 1, '다시 그리면 이전 파일 지움');
  answerAll = false; const other = MS.fromChart(M, M.compute({ year: 1990, month: 8, day: 2, hour: 6, minute: 0, gender: 'M', calendar: 'solar', school: 'eokbu' }));
  const before = r2.size; r = await call({ spec: other, attempt: 2 }); ok(r.j.pass === false && r.j.critical.includes('main') && r2.size === before, '검사 실패면 저장하지 않음');
  ok(/Previous attempt missed/.test(lastPrompt), '다시 시도 때 보강 문장');
  r = await call({ spec: base, sketch: 'data:image/png;base64,AAAA' }); ok(r.s === 200, '잘못된 밑그림은 무시하고 진행');

  console.log('4b. 실사 화풍(2026-11-24 수묵에서 바꿈)');
  { const p = MS.prompt(base); ok(/^Photorealistic/.test(p) && /Not an illustration, painting/.test(p) && !/ink|sumi|hanji|brush/i.test(p), '실사 프롬프트');
    ok(/^ATMOSPHERE: /m.test(p) && /fresh, vivid greens/.test(p), '가장 많은 오행이 분위기·색');
    ok(MS.key(base).startsWith('scene1|') && MS.checklist(base).some(c => c.id === 'photo'), '저장본 키·검사 항목이 실사 기준');
    ok(!/수묵/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/function mulsangCard[\s\S]*?function renderOverview/)[0]), '카드 문구에 수묵 없음'); }

  console.log('5. 화면·스위치 연결');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), lf = fs.readFileSync(path.join(root, 'functions/api/luck-flags.js'), 'utf8'), adm = fs.readFileSync(path.join(root, 'report/admin/v2-luckenv.js'), 'utf8');
  ok(!html.includes('<script src="mulsang.js"></script>') && !html.includes('${mulsangCard(ch)}'), '2026-11-24 사용자 요청: 만세력에서 물상 카드 뺌(모듈은 남김)');
  ok(/'luckAlerts', 'mulsangArt'[,\]]/.test(html), '공개 스위치 받기');
  ok(html.includes('MM.flowSVG(spec)') && html.includes('ms-steps') && !html.includes('data-act="ms-gen"') && !html.includes("a === 'ms-gen'") && html.includes("const XP_ART = { 'wonguk-mulsang': () => true };"), '원국 물상은 도형(AI 그림 버튼 없음·PDF 늘 넣기)');
  ok(/'mulsangArt'[,\]]/.test(lf), 'luck-flags 스위치 이름');
  ok(!adm.includes("id=\"leMS\"") && !adm.includes('mulsangArt'), '관리자 스위치 단추 뺌(2026-11-24 카드 제거)');
  ok(!/하루 \d회|daily|quota/i.test(fs.readFileSync(path.join(root, 'functions/api/mulsang-art.js'), 'utf8').replace(/횟수 제한 없음/g, '')), '횟수 제한 없음');

  console.log(fail ? `\n✗ ${fail}/${n} 실패` : `\n✓ 물상 그림 검증 ${n}항목 통과`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
