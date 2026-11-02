// /api/region 검증: 출처 없는 값 거부·이력·되돌리기·원국 불변·공개 GET
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
(async () => {
  const mod = await import(require('url').pathToFileURL(path.join(root, 'functions/api/region.js')).href);
  const R = globalThis.MantraRegion;
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const kv = { m: new Map(), async get(k, t) { const v = this.m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { this.m.set(k, v); } };
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw-test' };
  const req = (method, body, auth = 'pw-test', url = 'https://x/api/region') => new Request(url, { method, headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const put = async (b, auth) => { const r = await mod.onRequestPut({ request: req('PUT', b, auth), env }); return { s: r.status, j: await r.json() }; };
  const good = { id: 'seoul', fact: 'housing', value: '예시 값', source: { name: '통계청', url: 'https://kosis.kr/example' }, updated: '2026-10-01' };
  // 검증
  ok((await put(good, 'wrong')).s === 401, '인증 없이 저장됨');
  for (const [m, b] of [['지역', { ...good, id: 'paris' }], ['항목', { ...good, fact: 'luck' }], ['출처없음', { ...good, source: undefined }], ['http', { ...good, source: { name: 'a', url: 'http://x.kr' } }], ['기준일없음', { ...good, updated: '' }], ['미래', { ...good, updated: '2999-01-01' }], ['빈값', { ...good, value: ' ' }], ['긴값', { ...good, value: 'a'.repeat(301) }]]) ok((await put(b)).s === 400, m + ' 거부 안 됨');
  ok(kv.m.size === 0, '거부했는데 저장됨');
  // 저장·이력·되돌리기
  let r = await put(good); ok(r.s === 200 && r.j.version === 1 && r.j.items.seoul.housing.value === '예시 값', '저장');
  r = await put({ ...good, value: '두번째' }); ok(r.j.version === 2, '버전');
  r = await put({ id: 'seoul', fact: 'housing', value: null }); ok(r.s === 200 && !r.j.items.seoul, '삭제');
  r = await put({ restore: 3 }); ok(r.s === 200 && r.j.items.seoul.housing.value === '두번째', '삭제 되돌리기');
  r = await put({ restore: 2 }); ok(r.j.items.seoul.housing.value === '예시 값', '수정 되돌리기');
  ok((await put({ restore: 999 })).s === 404, '없는 이력');
  const g = await (await mod.onRequestGet({ request: req('GET', null, ''), env })).json(); ok(g.items.seoul.housing.source.url.startsWith('https://') && !g.history, '공개 GET');
  ok((await mod.onRequestGet({ request: req('GET', null, 'bad', 'https://x/api/region?history=1'), env })).status === 401, '이력은 관리자만');
  const h = await (await mod.onRequestGet({ request: req('GET', null, 'pw-test', 'https://x/api/region?history=1'), env })).json(); ok(h.history.length === 5 && h.history[0].v === 5, '이력 순서');
  // 병합: 출처 없는 항목은 무시, 있는 항목만 반영
  const before = R.get('seoul').facts.housing; const n = R.merge({ items: { seoul: { housing: { value: 'x' }, infra: { value: '값', source: { name: 'n', url: 'https://a.kr' }, updated: '2026-01-01' } }, paris: { infra: { value: 'z', source: { name: 'n', url: 'https://a.kr' }, updated: '2026-01-01' } } } });
  ok(before === null && n === 1 && R.get('seoul').facts.housing === null && R.get('seoul').facts.infra === '값', '병합 규칙');
  ok(R.dataCoverage(R.get('seoul')).have === 1 && R.get('busan').facts.infra === null, '다른 지역 오염');
  if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
  console.log('모든 검증 통과 · 출처 없는 값 거부 · 이력/되돌리기 · 병합');
})();
