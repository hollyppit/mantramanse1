// 2026-11-12 회귀 검사: 운명의 타임라인 본문이 새로 고칠 때마다 옛 버전·새 버전으로 바뀌던 문제.
// 원인: viewer.js 가 /api/reading-editorial(운영 1~30초)을 3.5초만 기다리고, 늦으면 기본 목차(옛 107장 구성)로 그렸다.
// 확인: ① 마지막 게시본 보관(report/last-good.js) ② 지연이 들쭉날쭉해도 매번 같은 게시 버전 ③ 서버 엣지 보관·게시 시 비우기
//      ④ 화면 파일 연결(스크립트 순서·?v= 갱신·3.5초 제한 제거·스위치 읽기). 실제 네트워크는 쓰지 않는다.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0; const ok = (name) => { pass++; console.log('  ok ' + name); };

function memStore() { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m }; }
const later = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
const resp = (d) => ({ ok: true, json: async () => d });

(async () => {
  global.localStorage = memStore();
  const LG = require(path.join(ROOT, 'report/last-good.js'));
  const valid = d => !!(d && Number.isInteger(d.version) && d.version > 0 && Array.isArray(d.chapters) && Array.isArray(d.topics));
  const URL_ = '/api/reading-editorial';

  // ① 보관 규칙
  let r = await LG.load(URL_, { timeout: 30, coldTimeout: 60, valid, fetch: () => later(5, resp({ version: 14, topics: [], chapters: [] })) });
  assert.deepEqual([r.source, r.data.version], ['network', 14]); ok('제때 온 응답은 그대로 쓰고 저장한다');
  r = await LG.load(URL_, { timeout: 30, coldTimeout: 60, valid, fetch: () => later(200, resp({ version: 15, topics: [], chapters: [] })) });
  assert.deepEqual([r.source, r.data.version], ['saved', 14]); ok('늦으면 저장된 마지막 게시본(14)을 쓴다(기본 목차로 떨어지지 않음)');
  await later(220);
  assert.equal(LG.saved(URL_, valid).version, 15); ok('늦게 온 응답(15)도 저장해 다음 방문부터 쓴다');
  r = await LG.load(URL_, { timeout: 30, valid, fetch: () => Promise.reject(new Error('net')) });
  assert.deepEqual([r.source, r.data.version], ['saved', 15]); ok('네트워크 실패 시 저장값');
  r = await LG.load(URL_, { timeout: 30, valid, fetch: async () => resp({ error: 'storage-unavailable' }) });
  assert.equal(r.source, 'saved'); assert.equal(LG.saved(URL_, valid).version, 15); ok('잘못된 응답은 저장하지 않고 저장값 유지');
  global.localStorage = memStore();
  r = await LG.load(URL_, { timeout: 10, coldTimeout: 40, valid, fetch: () => later(25, resp({ version: 3, topics: [], chapters: [] })) });
  assert.deepEqual([r.source, r.data.version], ['network', 3]); ok('저장값이 없으면 더 오래(coldTimeout) 기다린다');
  global.localStorage = memStore();
  r = await LG.load(URL_, { timeout: 10, coldTimeout: 20, valid, fetch: () => later(60, resp({ version: 3, topics: [], chapters: [] })) });
  assert.deepEqual([r.source, r.data], ['none', null]); ok('저장값도 없고 늦으면 null(호출한 쪽 기본값)');
  delete global.localStorage;
  r = await LG.load(URL_, { timeout: 10, valid, fetch: async () => resp({ version: 2, topics: [], chapters: [] }) });
  assert.equal(r.data.version, 2); ok('localStorage 가 없어도(사생활 보호 모드) 동작');

  // ② 지연이 들쭉날쭉한 새로 고침 20번 → 첫 성공 뒤로는 항상 게시 버전 구성
  global.window = global; global.self = global;
  const vm = require('vm');
  for (const f of ['engine.js', 'report/v2/saju-data.js', 'report/v2/reading-flow.js', 'report/v2/reading-catalog.js']) vm.runInThisContext(read(f), { filename: f });
  const E = global.ReportV2.Editorial;
  const sd = global.ReportV2.SajuData.build(global.Manse.compute({ year: 1990, month: 11, day: 5, hour: 12, minute: 0, calendar: 'solar', gender: 'M', city: '서울' }));
  const published = { version: 14, topics: [{ id: 'self', title: '종합풀이', order: 0, enabled: true }], chapters: [] };
  const seed = E.defaults();
  seed.chapters.filter(c => /^timeline_self_/.test(c.id)).slice(0, 5).forEach((c, i) => published.chapters.push(Object.assign({}, c, { topicId: 'self', state: 'active', order: i })));
  const shape = rep => rep.chapters.map(c => c.editorialContractId).join(',');
  const rep0 = () => ({ chapters: [], acts: [] });
  const want = shape(E.prepare(rep0(), published, sd)), legacy = shape(E.prepare(rep0(), undefined, sd));
  assert.notEqual(want, legacy, '게시본과 기본 목차는 구성이 달라야 이 검사가 의미가 있다');
  ok('기본 목차와 게시본(' + published.chapters.length + '장)은 구성이 다르다 — 예전 3.5초 실패 시 보이던 차이');
  global.localStorage = memStore();
  const lat = [5, 80, 3, 120, 90, 2, 150, 4, 100, 6, 70, 1, 130, 8, 95, 3, 110, 2, 140, 5];
  const seen = [];
  for (const ms of lat) {
    const got = await LG.load(URL_, { timeout: 40, coldTimeout: 200, valid, fetch: () => later(ms, resp(published)) });
    seen.push(shape(E.prepare(rep0(), got.data || undefined, sd)));
  }
  assert.ok(seen.every(s => s === want), '모든 새로 고침이 같은 게시 버전이어야 한다');
  ok('응답 지연 1~150ms(제한 40ms) 새로 고침 20번 모두 같은 게시 버전');
  // 예전 방식(제한 넘으면 undefined) 대조
  const oldSeen = lat.map(ms => shape(E.prepare(rep0(), ms <= 40 ? published : undefined, sd)));
  assert.ok(new Set(oldSeen).size === 2); ok('예전 방식은 같은 조건에서 두 버전이 섞인다(재현)');

  // ③ 서버: 공개 GET 엣지 보관, 게시 시 비우기
  const store = new Map(); let matches = 0, deletes = 0;
  global.caches = { default: { match: async req => { matches++; const v = store.get(req.url); return v ? new Response(v.body, { headers: v.headers }) : undefined; }, put: async (req, res) => { store.set(req.url, { body: await res.text(), headers: Object.fromEntries(res.headers) }); }, delete: async req => { deletes++; return store.delete(req.url); } } };
  const mod = await import(path.join(ROOT, 'functions/api/reading-editorial.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  let kvReads = 0; const cat = { version: 14, updatedAt: 'x', topics: [{ id: 'self', title: 't', order: 0, enabled: true }], chapters: [{ id: 'timeline_self_01', topicId: 'self', state: 'active', sourceRuleIds: ['secret'], legacyIds: [] }], cases: [] };
  const env = { GLOSSARY_KV: { get: async () => { kvReads++; return cat; }, put: async () => { } } };
  const get = () => mod.onRequest({ request: new Request('https://mantrafortune.com/api/reading-editorial'), env });
  let res = await get(); let body = await res.json();
  assert.equal(res.headers.get('x-editorial-cache'), 'miss'); assert.equal(body.version, 14); assert.equal(body.chapters[0].sourceRuleIds, undefined);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  res = await get(); body = await res.json();
  assert.equal(res.headers.get('x-editorial-cache'), 'hit'); assert.equal(body.version, 14); assert.equal(kvReads, 1);
  assert.equal(res.headers.get('cache-control'), 'no-store', '브라우저에는 저장하지 않는다');
  ok('공개 GET: 첫 요청은 저장소, 다음은 엣지 보관본(관리자 필드 제외 유지)');
  assert.match(store.values().next().value.headers['cache-control'], /max-age=60\b/); ok('엣지 보관은 60초');
  const seed0 = { GLOSSARY_KV: { get: async () => null } }; store.clear();
  await mod.onRequest({ request: new Request('https://mantrafortune.com/api/reading-editorial'), env: seed0 });
  assert.equal(store.size, 0); ok('게시본이 없을 때(기본 목차 version 0)는 보관하지 않는다');
  const src = read('functions/api/reading-editorial.js');
  assert.match(src, /if\(b\.action==='publish'\)\{const c=edgeCache\(\);if\(c\)try\{await c\.delete\(edgeKey\(url\)\)/); ok('게시하면 엣지 보관본을 비운다');
  delete global.caches;
  store.clear(); kvReads = 0; res = await get(); assert.equal((await res.json()).version, 14); ok('Cache API 가 없는 곳(pages.dev 미리보기 등)도 그대로 응답');

  // ④ 화면 파일 연결
  const viewer = read('report/v2/viewer.js'), idx = read('report/v2/index.html'), hub = read('report/hub/index.html');
  assert.doesNotMatch(viewer, /reading-editorial',\{signal:AbortSignal\.timeout\(3500\)/); ok('viewer.js 3.5초 제한 제거');
  assert.match(viewer, /MantraLastGood\.load\('\/api\/reading-editorial'/); assert.match(viewer, /if\(!PREVIEW && R\.Editorial\)editorialCatalogP\(\);/); ok('viewer.js 는 계산 시작 때 미리 받고 마지막 게시본을 쓴다');
  const pos = s => idx.indexOf(s);
  assert.ok(pos('/report/last-good.js?v=') > 0 && pos('/report/last-good.js?v=') < pos('topic-deep.js?v=') && pos('/report/last-good.js?v=') < pos('life-narrative.js?v=') && pos('/report/last-good.js?v=') < pos('viewer.js?v=')); ok('v2/index.html: last-good.js 가 사용하는 파일보다 먼저');
  assert.ok(hub.indexOf('/report/last-good.js?v=') > 0 && hub.indexOf('/report/last-good.js?v=') < hub.indexOf('hub-timeline.js?v=')); ok('hub/index.html: last-good.js 가 hub-timeline.js 보다 먼저, hub-timeline 에 ?v=');
  ['viewer.js?v=20261112-lg', 'topic-deep.js?v=20261112-lg', 'life-narrative.js?v=20261112-lg'].forEach(s => assert.ok(idx.includes(s), s)); ok('바뀐 파일의 ?v= 갱신(운영 도메인 JS 4시간 브라우저 캐시 대비)');
  ['report/hub/hub-timeline.js', 'report/v2/topic-deep.js', 'report/v2/life-narrative.js'].forEach(p => assert.match(read(p), /(MantraLastGood|LG)\.(json|load)\('\/api\/luck-flags'/, p)); ok('스위치(/api/luck-flags) 세 곳 모두 마지막 값 보관');
  console.log('PASS editorial-stable-version-sim ' + pass + '항목');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
