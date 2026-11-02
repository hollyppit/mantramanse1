// /api/wish-spots 검증: 인증 · 출처 필수 입력 검증 · 초안→게시→취소→되돌리기→삭제 · 공개 스위치 · 일괄 게시 · 다른 KV 키 불간섭 (장소는 전부 가짜 fixture)
const path = require('path'), url = require('url');
const root = path.join(__dirname, '..');
(async () => {
  const mod = await import(url.pathToFileURL(path.join(root, 'functions/api/wish-spots.js')).href);
  const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
  const kv = { m: new Map(), async get(k, t) { const v = this.m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { this.m.set(k, v); } };
  kv.m.set('overrides', '{"keep":1}');
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw-test' };
  const rq = (method, body, auth = 'pw-test', u = 'https://x/api/wish-spots') => new Request(u, { method, headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const put = async (b, auth) => { const r = await mod.onRequestPut({ request: rq('PUT', b, auth), env }); return { s: r.status, j: await r.json() }; };
  const pub = async () => await (await mod.onRequestGet({ request: rq('GET', null, ''), env })).json();
  const SRC = { name: '테스트 출처', url: 'https://example.com/a', checked: '2026-11-03' };
  const F = { name: '테스트 장소 A', lat: 35.8, lon: 127.1, type: 'mountain', tags: ['wealth', 'study'], source: SRC, note: '비고' };

  ok((await put({ kind: 'spot', id: 'test-a', action: 'create', fields: F }, 'bad')).s === 401, '인증 없이 등록됨');
  ok((await mod.onRequestGet({ request: rq('GET', null, 'bad', 'https://x/api/wish-spots?all=1'), env })).status === 401, '전체 조회 인증');
  let p0 = await pub(); ok(p0.enabled === false && Array.isArray(p0.spots) && p0.spots.length === 0, '처음에는 꺼져 있고 장소가 노출되지 않아야 함');
  ok((await put({ kind: 'spot', id: 'X', action: 'create', fields: F })).s === 400, 'ID 형식');
  for (const [m, f] of [['출처 없음', { ...F, source: undefined }], ['출처 http', { ...F, source: { ...SRC, url: 'http://a.com' } }], ['확인일 없음', { ...F, source: { name: 'a', url: 'https://a.com' } }], ['위도', { ...F, lat: 10 }], ['경도', { ...F, lon: 200 }], ['유형', { ...F, type: 'zzz' }], ['태그 비어 있음', { ...F, tags: [] }], ['태그 알 수 없음', { ...F, tags: ['x'] }], ['이름 없음', { ...F, name: '' }]]) { const r = await put({ kind: 'spot', id: 'test-bad', action: 'create', fields: f }); ok(r.s === 400, `${m} 등록이 거부되지 않음(${r.s})`); }
  ok(Object.keys((await (await mod.onRequestGet({ request: rq('GET', null, 'pw-test', 'https://x/api/wish-spots?all=1'), env })).json()).doc.spots).length === 0, '거부된 장소가 저장됨');
  // 금지 표현은 검사하지 않는다
  let r = await put({ kind: 'spot', id: 'test-a', action: 'create', fields: { ...F, note: '반드시 이루어지는 곳으로 알려짐' } }); ok(r.s === 200 && r.j.item.status === 'draft', '장소 등록(초안)');
  ok((await put({ kind: 'spot', id: 'test-a', action: 'create', fields: F })).s === 400, '중복 ID');
  ok((await pub()).spots.length === 0, '초안이 공개됨');
  r = await put({ kind: 'spot', id: 'test-a', action: 'approve_publish' }); ok(r.s === 200 && r.j.item.status === 'published', '게시'); ok((await pub()).spots.length === 0, '스위치 꺼진 상태에서 노출됨');
  ok((await put({ kind: 'flag', enabled: 'yes' })).s === 400, '스위치 값 검증'); ok((await put({ kind: 'flag', enabled: true })).j.enabled === true, '스위치 켜기');
  p0 = await pub(); ok(p0.enabled && p0.spots.length === 1 && p0.spots[0].id === 'test-a' && p0.spots[0].source.url === SRC.url && p0.spots[0].lat === 35.8, '게시 장소가 공개 응답에 없음');
  ok((await put({ kind: 'spot', id: 'test-a', action: 'publish' })).s === 400, '이미 게시된 항목 재게시');
  r = await put({ kind: 'spot', id: 'test-a', action: 'save', fields: { name: '테스트 장소 A2', lat: 99 } }); ok(r.s === 400, '저장 시 값 검증');
  r = await put({ kind: 'spot', id: 'test-a', action: 'save', fields: { name: '테스트 장소 A2' } }); ok(r.s === 200 && r.j.item.status === 'draft' && r.j.item.version === 2, '수정 저장'); ok((await pub()).spots.length === 0, '수정 후에도 이전 게시본이 남음');
  ok((await put({ kind: 'spot', id: 'test-a', action: 'save', fields: {} })).s === 400, '빈 수정'); ok((await put({ kind: 'spot', id: 'nope-id', action: 'save', fields: { name: 'a' } })).s === 404, '없는 장소');
  await put({ kind: 'spot', id: 'test-a', action: 'approve_publish' }); ok((await pub()).spots[0].name === '테스트 장소 A2', '재게시');
  r = await put({ kind: 'spot', id: 'test-a', action: 'unpublish' }); ok(r.s === 200 && (await pub()).spots.length === 0, '게시 취소');
  const first = r.j.item.history.find(h => h.fields.name === '테스트 장소 A'); r = await put({ kind: 'spot', id: 'test-a', action: 'restore', v: first.v }); ok(r.s === 200 && r.j.item.fields.name === '테스트 장소 A' && r.j.item.status === 'draft', '이력 되돌리기'); ok((await put({ kind: 'spot', id: 'test-a', action: 'restore', v: 999 })).s === 404, '없는 이력');
  // 비활성(on:false)은 공개 응답에 on:false 로 실려 엔진이 제외한다
  await put({ kind: 'spot', id: 'test-a', action: 'save', fields: { on: false } }); await put({ kind: 'spot', id: 'test-a', action: 'approve_publish' }); ok((await pub()).spots[0].on === false, '비활성 표시');
  // 일괄 게시
  await put({ kind: 'spot', id: 'test-b', action: 'create', fields: { ...F, name: '테스트 장소 B' } }); await put({ kind: 'spot', id: 'test-c', action: 'create', fields: { ...F, name: '테스트 장소 C' } });
  r = await put({ kind: 'spot', action: 'bulk', ids: ['test-b', 'test-c', 'test-zzz', 'test-a'], op: 'publish' }); ok(r.s === 200 && r.j.done === 2 && r.j.skipped === 1 && r.j.failed.length === 1, '일괄 게시 ' + JSON.stringify(r.j));
  r = await put({ kind: 'spot', action: 'bulk', ids: ['test-b'], op: 'unpublish' }); ok(r.j.done === 1, '일괄 게시 취소'); ok((await put({ kind: 'spot', action: 'bulk', ids: [], op: 'publish' })).s === 400, '빈 일괄 요청');
  ok((await pub()).spots.length === 2, '일괄 처리 후 게시 수');
  ok((await put({ kind: 'spot', id: 'test-c', action: 'delete' })).s === 200 && (await pub()).spots.length === 1, '삭제'); ok((await put({ kind: 'spot', id: 'test-c', action: 'delete' })).s === 404, '이미 삭제됨');
  await put({ kind: 'flag', enabled: false }); ok((await pub()).spots.length === 0, '스위치를 끄면 비공개');
  const adm = await (await mod.onRequestGet({ request: rq('GET', null, 'pw-test', 'https://x/api/wish-spots?all=1'), env })).json(); ok(adm.base.wish.length === 7 && adm.base.weights.dir === 40 && adm.doc.spots['test-a'].history.length >= 4, '관리자 전체 조회·이력');
  ok(JSON.stringify([...kv.m.keys()].sort()) === JSON.stringify(['overrides', 'wishspots:doc']), '이 API가 다른 KV 키를 썼음: ' + [...kv.m.keys()]); ok(kv.m.get('overrides') === '{"keep":1}', '기존 키 값이 바뀜');
  console.log(fails.length ? `실패 ${fails.length}건\n - ` + fails.join('\n - ') : '모든 검증 통과'); process.exit(fails.length ? 1 : 0);
})();
