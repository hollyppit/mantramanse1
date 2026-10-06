// 서비스 심화 풀이 AI 합성(/api/ik?a=deep, rules.serviceAi) 검증: 가짜 AI 로 켜짐/꺼짐 · 캐시 · 지연 폴백 · 단정 표현 거르기 · 일일 상한을 확인한다.
// 실행: node tests/deep-ai-sim.js
const fs = require('fs'), vm = require('vm'), path = require('path'), { pathToFileURL } = require('url');
globalThis.window = globalThis; for (const f of ['engine.js', 'report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), { filename: f });
const imp = f => import(pathToFileURL(path.join(__dirname, '..', f)).href);
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

// 가짜 AI(Anthropic): 입력 패키지의 Section·근거 id 를 읽어 그대로 문장을 만든다. 모드로 지연·위험 표현을 흉내 낸다.
let aiCalls = 0, mode = 'ok';
const realFetch = global.fetch;
global.fetch = async (u, o = {}) => {
  if (!String(u).includes('api.anthropic.com')) return realFetch(u, o);
  aiCalls++; const user = JSON.parse(o.body).messages[0].content, pkg = JSON.parse(user.slice(user.indexOf('{')));
  if (mode === 'slow') await new Promise(r => setTimeout(r, 400));
  const sections = {}; for (const sec of pkg.sections || []) { if (sec.status !== 'ok') continue; const ref = (sec.items && sec.items[0] && sec.items[0].id) || ''; sections[sec.id] = [{ text: mode === 'bad' ? '이 사주는 반드시 이혼한다.' : 'AI가 이 사주에 맞게 엮은 문장입니다.', refs: [ref] }]; }
  return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ sections }) }] }), { status: 200 });
};

const mem = new Map(); const kv = { get: async (k, t) => { const v = mem.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { mem.set(k, String(v)); }, delete: async k => { mem.delete(k); }, list: async () => ({ keys: [], list_complete: true }) };
const env = { ADMIN_PASSWORD: 'pw', GLOSSARY_KV: kv, ANTHROPIC_API_KEY: 'x', IK_DEEP_AI_WAIT_MS: '150' };
const pending = []; const waitUntil = p => pending.push(p);
const M = globalThis.Manse, SD = globalThis.ReportV2.SajuData;
const call = async (qs, body, admin, ip) => { const mod = await imp('functions/api/ik.js'); const res = await mod.onRequest({ env, waitUntil, request: new Request('http://x/api/ik?' + qs, { method: 'POST', headers: { 'content-type': 'application/json', ...(admin ? { authorization: 'Bearer pw' } : {}), 'cf-connecting-ip': ip || '1.1.1.1' }, body: JSON.stringify(body) }) }); return { s: res.status, d: await res.json() }; };
const chart = (y, mo, d) => M.compute({ year: y, month: mo, day: d, hour: 14, minute: 30, calendar: 'solar', leap: false, gender: 'M', city: '서울' });
const sdOf = (y, mo, d) => { const ch = chart(y, mo, d), sd = SD.build(ch, { now: Date.UTC(2026, 9, 6) }); delete sd.birth; const Y = sd.nowYear; return { sd, ext: { future: M.seunRange(ch, Y, Y + 4).map((x, i) => ({ year: Y + i, season: SD.seasonOf(x.ev) })) } }; };
const text = r => JSON.stringify(r.d.domains || {});

(async () => {
  // 풀이 지식 하나(자기·성격, 조건 없음)
  await call('a=save', { isNew: true, item: { id: 'SELF-0001', domain: 'SELF', subDomain: 'personality', title: '성격', interpretation: 'DB 원문 문장입니다.', principle: 'p', stance: 'neutral', priority: 10, conditions: {}, reviewed: true, status: 'published', sourceType: 'book', confidence: 'high' } }, true);
  const A = sdOf(1990, 5, 15), body = (x, doms) => ({ sd: x.sd, ext: x.ext, domains: doms || ['SELF'] });

  console.log('1. 스위치가 꺼져 있으면(기본) AI 를 부르지 않고 DB 문장 그대로');
  let r = await call('a=deep', body(A)); ok(r.s === 200 && /DB 원문 문장/.test(text(r)) && aiCalls === 0, 'AI 호출 ' + aiCalls + '회 · DB 문장 사용');

  console.log('2. 스위치를 켜면 AI 가 엮은 문장 + 같은 사주는 저장본 재사용');
  await call('a=rules', { rules: { serviceAi: true } }, true);
  r = await call('a=deep', body(A)); ok(/AI가 이 사주에 맞게/.test(text(r)) && aiCalls === 1, 'AI 합성 사용 (호출 ' + aiCalls + '회)');
  r = await call('a=deep', body(A), false, '2.2.2.2'); ok(/AI가 이 사주에 맞게/.test(text(r)) && aiCalls === 1, '같은 사주 재방문은 저장본 재사용 — AI 추가 호출 없음 (호출 ' + aiCalls + '회)');
  ok([...mem.keys()].some(k => k.startsWith('ik:pkg:')), '합성 결과가 ik:pkg: 키로 저장됨');

  console.log('3. 지식이 바뀌면 새로 합성');
  const rec = await call('a=save', { item: { id: 'SELF-0001', domain: 'SELF', subDomain: 'personality', title: '성격', interpretation: '수정된 DB 문장.', principle: 'p', stance: 'neutral', priority: 10, conditions: {}, reviewed: true, status: 'published', sourceType: 'book', confidence: 'high' }, expectVersion: 1 }, true);
  const before = aiCalls; r = await call('a=deep', body(A), false, '3.3.3.3'); ok(aiCalls === before + 1, '지식 버전이 바뀌어 다시 합성 (호출 ' + (aiCalls - before) + '회)');

  console.log('4. 위험 표현이 나오면 버리고 DB 문장');
  mode = 'bad'; const B = sdOf(1985, 3, 3); r = await call('a=deep', body(B), false, '4.4.4.4');
  ok(/수정된 DB 문장/.test(text(r)) && !/이혼한다/.test(text(r)), '단정 표현은 사용자에게 나가지 않음(DB 문장으로 대체)');

  console.log('5. AI 가 늦으면 기다리지 않고 DB 문장 → 뒤에서 마저 저장 → 다음 방문은 AI 문장');
  mode = 'slow'; const C = sdOf(1979, 9, 9); const t0 = Date.now(); r = await call('a=deep', body(C), false, '5.5.5.5'); const ms = Date.now() - t0;
  ok(/수정된 DB 문장/.test(text(r)) && ms < 350, '대기 한도(150ms)에 맞춰 응답: ' + ms + 'ms · DB 문장');
  await Promise.all(pending); r = await call('a=deep', body(C), false, '6.6.6.6'); ok(/AI가 이 사주에 맞게/.test(text(r)), '뒤에서 끝난 합성이 저장되어 다음 방문에는 AI 문장');

  console.log('6. 일일 상한');
  mode = 'ok'; env.IK_DEEP_AI_DAILY = '1'; const D = sdOf(1970, 1, 1); const used0 = aiCalls; r = await call('a=deep', body(D), false, '7.7.7.7');
  ok(aiCalls === used0 && /수정된 DB 문장/.test(text(r)), '오늘 호출 상한을 넘으면 AI 를 부르지 않고 DB 문장');

  console.log('7. 스위치를 다시 끄면');
  env.IK_DEEP_AI_DAILY = '300'; await call('a=rules', { rules: { serviceAi: false } }, true); const E = sdOf(1962, 2, 2), b2 = aiCalls; r = await call('a=deep', body(E), false, '8.8.8.8'); ok(aiCalls === b2, 'AI 호출 없음');

  console.log('8. 본문 대체 스위치(serviceBody)가 응답에 실림');
  r = await call('a=deep', body(A), false, '9.9.9.1'); ok(r.d.body === false, '기본: body=false (더 깊이 덧붙임)');
  await call('a=rules', { rules: { serviceBody: true } }, true); r = await call('a=deep', body(A), false, '9.9.9.2'); ok(r.d.body === true, '켜면 body=true (클라이언트가 본문 대체 모드로 조립)');

  console.log('\n' + (fails ? '실패 ' + fails + '건' : '전부 통과')); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
