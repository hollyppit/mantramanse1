// 유료 장 잠금 우회 막기(2026-11-26 보안 점검): 장 id·제목을 엉뚱하게 넣고 옛 장 번호(base)만 붙인 요청도
// 본문을 고르는 같은 계약으로 잠금 판정을 받아야 한다. 메모리 KV·합성 요청만 쓴다(네트워크 호출 0). node tests/reading-gate-base-sim.cjs
const fs = require('fs'), vm = require('vm'), path = require('path'), { pathToFileURL } = require('url'), assert = require('assert/strict');
const imp = p => import(pathToFileURL(path.resolve(p)).href);
global.window = globalThis;
for (const p of ['engine.js', 'report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
(async () => {
  const ch = Manse.compute({ year: 1992, month: 6, day: 23, hour: 1, minute: 0, calendar: 'solar', gender: 'M', city: '서울' }), sd = ReportV2.SajuData.build(ch, { now: Date.UTC(2026, 9, 9) });
  const { Editorial } = await imp('functions/_editorial.js'), { serveReviewed } = await imp('functions/_reviewed-reading.js');
  const cat = Editorial.defaults(), paidTopics = new Set(['wealth', 'career', 'love', 'relationships']);
  const target = cat.chapters.find(c => c.state !== 'archived' && paidTopics.has(c.topicId) && (c.legacyIds || []).length);
  assert.ok(target, '옛 장 번호가 있는 유료 장');
  const world = { wealth: 'w2', career: 'w7', love: 'w3', relationships: 'w3' }[target.topicId];
  const memory = new Map([['worlds:config', JSON.stringify({ worlds: ['w1', 'w2', 'w3', 'w7'].map(id => ({ id, access: 'paid', enabled: true })) })]]);
  const kv = { get: async (k, t) => memory.has(k) ? (t === 'json' ? JSON.parse(memory.get(k)) : memory.get(k)) : null, put: async (k, v) => memory.set(k, v), delete: async k => memory.delete(k), list: async () => ({ keys: [], list_complete: true }) };
  const env = { GLOSSARY_KV: kv };
  const post = chapter => serveReviewed({ env, request: new Request('https://x/api/movingtoon-reading', { method: 'POST', body: JSON.stringify({ sd, chapter: { paragraphs: [{ id: '0', text: '검사용 문장입니다. 잠금 판정만 확인합니다.' }], ...chapter } }) }) });
  const statusOf = async chapter => { const r = await post(chapter); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  // 1) 정상 요청(진짜 id): 잠김
  const a = await statusOf({ id: target.id, title: target.title });
  assert.ok([401, 402].includes(a.status), '진짜 id 요청은 잠김: ' + a.status);
  // 2) 우회 시도: 엉뚱한 id·제목 + 옛 장 번호(base) → 예전에는 잠금 없이 본문, 이제 잠김
  const b = await statusOf({ id: 'x', title: 'x', base: target.legacyIds[0] });
  assert.ok([401, 402].includes(b.status), 'base 만 붙인 우회 요청도 잠김: ' + b.status + ' ' + JSON.stringify(b.body).slice(0, 120));
  assert.equal(b.body.locked && b.body.locked.world, world, '잠금 세계가 본문 계약의 세계');
  assert.ok(!b.body.result, '본문이 오지 않음');
  // 2-1) 통과 권한(관리자)이면 빠른 잠금·본문 계약 잠금 모두 통과해 본문을 받는다
  env.ADMIN_PASSWORD = 'admin-pass-0123456789';
  const adm = await serveReviewed({ env, request: new Request('https://x/api/movingtoon-reading', { method: 'POST', headers: { authorization: 'Bearer ' + env.ADMIN_PASSWORD }, body: JSON.stringify({ sd, chapter: { id: target.id, title: target.title, paragraphs: [{ id: '0', text: '검사용 문장입니다. 잠금 판정만 확인합니다.' }] } }) }) });
  assert.equal(adm.status, 200, '통과 권한이면 본문');
  delete env.ADMIN_PASSWORD;
  // 3) 무료로 바꾸면 같은 요청이 잠기지 않는다(잠금 판정이 실제로 세계 설정을 따름)
  memory.set('worlds:config', JSON.stringify({ worlds: [] }));
  const c = await statusOf({ id: 'x', title: 'x', base: target.legacyIds[0] });
  assert.ok(![401, 402].includes(c.status), '무료 세계면 잠기지 않음: ' + c.status);
  console.log(`PASS reading-gate-base-sim: ${target.id}(${target.topicId}) 정상·base 우회 모두 ${a.status}/${b.status}, 무료면 ${c.status}`);
})().catch(e => { console.error(e); process.exitCode = 1; });
