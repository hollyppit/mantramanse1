// 주역 점괘 사용자 API 검증: 개방 전 차단, 게시된 문구만 사용, 사주 입력 정리, 잘못된 입력 거부, 저장·로그 없음, 게시 후 수정 시 반쪽 해석 차단.
const assert = require('assert/strict'), path = require('path'), { pathToFileURL } = require('url');
(async () => {
  const imp = f => import(pathToFileURL(path.join(__dirname, '..', f)).href);
  const PUB = await imp('functions/api/iching.js'), REV = await imp('functions/api/iching-review.js'), { Ic } = await imp('functions/_iching-runtime.js'), PS = await imp('functions/_iching-public.js');
  let puts = 0; const mem = new Map();
  const kv = { get: async (k, t) => (mem.has(k) ? (t === 'json' ? JSON.parse(mem.get(k)) : mem.get(k)) : null), put: async (k, v) => { puts++; mem.set(k, v); }, delete: async k => { mem.delete(k); }, list: async ({ prefix }) => ({ keys: [...mem.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }) };
  const env = { ADMIN_PASSWORD: 'pw', GLOSSARY_KV: kv };
  const status = async () => { const { ai, ...rest } = await (await PUB.onRequestGet({ request: new Request('http://x/api/iching?a=status'), env })).json(); assert.deepEqual(ai, { enabled: false }, 'AI 상세 풀이는 기본 꺼짐'); return rest; };
  const ask = async body => { const r = await PUB.onRequestPost({ request: new Request('http://x/api/iching?a=interpret', { method: 'POST', body: JSON.stringify(body) }), env }); return { s: r.status, b: await r.json(), cc: r.headers.get('cache-control') }; };
  const adm = async (qs, body) => { const r = await REV.onRequestPost({ request: new Request('http://x/api/iching-review?' + qs, { method: 'POST', headers: { authorization: 'Bearer pw' }, body: JSON.stringify(body) }), env }); return { s: r.status, b: await r.json() }; };
  const Q = { question: '지금 투자를 시작해도 될까요?', category: 'wealth', values: [7, 7, 9, 8, 7, 8] };

  // 개방 전: 모두 차단
  assert.deepEqual(await status(), { open: false, categories: [] });
  let r = await ask(Q); assert.equal(r.s, 403); assert.equal(r.b.error, 'not-open'); assert.equal(r.cc, 'no-store');
  assert.equal((await PUB.onRequestPost({ request: new Request('http://x/api/iching', { method: 'POST', body: 'not json' }), env })).status, 400);
  assert.equal((await PUB.onRequestPost({ request: new Request('http://x/api/iching', { method: 'POST', body: 'x'.repeat(30000) }), env })).status, 413);
  // 승인했지만 게시 전이어도 개방 불가(관리자 API가 막는다)
  const all = Ic().Content.allKeys();
  assert.equal((await adm('a=review', { action: 'approve', keys: all, note: '테스트' })).s, 200);
  assert.equal((await adm('a=flags', { enabled: true, categories: ['wealth'] })).s, 409);
  assert.equal((await ask(Q)).s, 403);
  // 게시 → 개방(재물·인연만)
  assert.equal((await adm('a=publish', { expectReleaseVersion: 0 })).s, 200);
  assert.equal((await adm('a=flags', { enabled: true, categories: ['wealth', 'love'] })).s, 200);
  assert.deepEqual(await status(), { open: true, categories: ['wealth', 'love'] });

  // 정상 해석
  const before = puts; r = await ask(Q); assert.equal(r.s, 200, JSON.stringify(r.b)); assert.equal(puts, before, '해석 요청은 아무것도 저장하지 않는다');
  assert.equal(r.b.result.publishable, true); assert.equal(r.b.result.question, Q.question); assert.equal(r.b.result.hexagram.num, 5); assert.equal(r.b.result.transformed_hexagram.num, 60);
  assert.equal(r.b.result.saju_cross_analysis.status, 'no-saju'); assert.equal(r.b.result.preview, false); assert.match(r.b.result.content_version, /^release-/);
  // 닫힌 분야·잘못된 값
  assert.equal((await ask({ ...Q, category: 'career' })).b.error, 'category-closed');
  assert.equal((await ask({ ...Q, category: 'zzz' })).s, 403);
  for (const bad of [[7, 7, 7], [7, 7, 7, 8, 7, 5], 'x', null, [1, 2, 3, 4, 5, 6]]) assert.equal((await ask({ ...Q, values: bad })).b.error, 'invalid-values');
  // 질문 길이 제한, 누락 질문
  assert.equal((await ask({ ...Q, question: 'ㅋ'.repeat(500) })).b.result.question.length, 200); assert.equal((await ask({ category: 'love', values: [7, 8, 7, 8, 7, 8] })).b.result.question, '');
  // 사주 입력: 정상 → 교차 해석, 이상한 필드는 버림, 엉터리 → 사주 없음
  const saju = { dayMaster: { stem: '경', el: '금' }, strength: { band: '신약' }, nowYear: 2026, daewoon: [{ startYear: 2017, endYear: 2026, ganzhi: '기유', season: 'accumulation', evil: '<script>' }, { startYear: 'x' }], annual: { year: 2026, ganzhi: '병오' }, extra: 'ignored' };
  r = await ask({ ...Q, saju }); assert.equal(r.b.result.saju_cross_analysis.status, 'ok'); assert.equal(r.b.result.saju_cross_analysis.facts.daewoon.ganzhi, '기유'); assert.ok(!JSON.stringify(r.b.result).includes('<script>'));
  assert.deepEqual(PS.cleanSaju(saju).daewoon.length, 1);
  for (const bad of [null, 'x', { dayMaster: { stem: '경' } }, { ...saju, strength: { band: '극왕' } }, { ...saju, nowYear: 1800 }, { ...saju, dayMaster: { stem: '경금' } }]) assert.equal(PS.cleanSaju(bad), null);
  assert.equal((await ask({ ...Q, saju: { dayMaster: { stem: '경' } } })).b.result.saju_cross_analysis.status, 'no-saju');
  // 변효 0~6개 전부, 두 분야
  for (const vals of [[7, 8, 7, 8, 7, 8], [9, 7, 7, 8, 9, 8], [6, 6, 6, 6, 6, 6], [9, 9, 9, 9, 9, 9], [7, 7, 9, 9, 9, 8]]) for (const category of ['wealth', 'love']) { const x = await ask({ question: 'q', category, values: vals, saju }); assert.equal(x.s, 200, vals + category + JSON.stringify(x.b)); assert.equal(x.b.result.publishable, true); }
  // 게시 뒤 문구를 고치면(승인 해제) 그 항목이 필요한 해석은 반쪽으로 내주지 않고 막는다
  const cur = (await (await REV.onRequestGet({ request: new Request('http://x/api/iching-review?a=item&key=pack:5:wealth', { headers: { authorization: 'Bearer pw' } }), env })).json()).content, edited = JSON.parse(JSON.stringify(cur)); edited.final = '돈은 오를 때를 기다리지 말고 잃어도 되는 금액을 먼저 정하십시오.';
  assert.equal((await adm('a=edit', { key: 'pack:5:wealth', content: edited })).s, 200);
  r = await ask(Q); assert.equal(r.s, 503); assert.equal(r.b.error, 'not-ready'); assert.equal(JSON.stringify(r.b).includes('돈은 오를 때'), false, '미승인 문구가 응답에 섞이지 않는다');
  assert.equal((await ask({ ...Q, values: [7, 7, 7, 8, 7, 8], category: 'love' })).s, 200, '다른 항목은 영향 없음');
  // 개방을 끄면 다시 차단
  assert.equal((await adm('a=flags', { enabled: false, categories: [] })).s, 200); assert.equal((await ask(Q)).s, 403); assert.equal((await status()).open, false);
  console.log('PASS: 개방 전 차단, 승인≠게시≠개방, 게시된 문구만 사용, 사주 입력 정리, 잘못된 입력 거부, 저장 없음, 수정 시 반쪽 해석 차단, 개방 끄기');
})().catch(e => { console.error(e); process.exit(1); });
