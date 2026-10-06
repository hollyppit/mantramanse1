// 실제 API(ik·src·free-content·deep 공개 호출)를 가짜 Supabase 에 물려, 쓰기가 KV 로 새지 않는지 확인한다. 실행: node tests/store-integration-sim.js
const fs = require('fs'), vm = require('vm'), path = require('path'), { pathToFileURL } = require('url');
globalThis.window = globalThis; for (const f of ['engine.js', 'report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), { filename: f });
const imp = f => import(pathToFileURL(path.join(__dirname, '..', f)).href);
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

const rows = new Map(); const realFetch = global.fetch;
global.fetch = async (u, o = {}) => {
  u = String(u); if (!u.includes('supabase.test/rest/v1/kv')) return realFetch(u, o);
  const url = new URL(u), q = url.searchParams, m = o.method || 'GET', J = x => new Response(JSON.stringify(x), { status: 200, headers: { 'content-type': 'application/json' } });
  if (m === 'GET') { const k = q.get('key'); if (k.startsWith('eq.')) { const r = rows.get(k.slice(3)); return J(r ? [{ value: r.value, expires_at: r.expires_at }] : []); } return J([...rows.entries()].filter(([x]) => x.startsWith(k.slice(5).replace(/\*$/, ''))).map(([key, r]) => ({ key, value: r.value }))); }
  if (m === 'POST') { const b = JSON.parse(o.body); rows.set(b.key, { value: b.value, expires_at: b.expires_at }); return new Response(null, { status: 201 }); }
  if (m === 'DELETE') { rows.delete(q.get('key').slice(3)); return new Response(null, { status: 204 }); }
  return J({});
};
const kvPuts = []; const mem = new Map();
const kv = { get: async (k, t) => { const v = mem.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { kvPuts.push(k); mem.set(k, String(v)); }, delete: async k => { mem.delete(k); }, list: async () => ({ keys: [], list_complete: true }) };
const env = { ADMIN_PASSWORD: 'pw', GLOSSARY_KV: kv, SUPABASE_URL: 'https://supabase.test', SUPABASE_SERVICE_KEY: 'svc' };
const call = async (file, qs, body, admin = true, method) => { const mod = await imp(file); const res = await (mod.onRequest || mod.onRequestPost)({ env, request: new Request('http://x/api?' + qs, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(admin ? { authorization: 'Bearer pw' } : {}), 'cf-connecting-ip': '9.9.9.9' }, body: body ? JSON.stringify(body) : undefined }) }); return { s: res.status, d: await res.json() }; };

(async () => {
  console.log('1. 관리자: 풀이 지식 저장 · 자료 등록 · 점검');
  const item = { id: 'SELF-0001', domain: 'SELF', subDomain: 'personality', title: '테스트', interpretation: '해석', principle: 'p', stance: 'neutral', priority: 10, conditions: {}, reviewed: true, status: 'published', sourceType: 'book', confidence: 'high' };
  let r = await call('functions/api/ik.js', 'a=save', { item, isNew: true }); ok(r.s === 200, '풀이 지식 저장 200');
  r = await call('functions/api/ik.js', 'a=list'); ok(r.d.items.length === 1 && r.d.items[0].id === 'SELF-0001', 'Supabase 에서 다시 읽어 목록에 나옴');
  r = await call('functions/api/src.js', 'a=add', { title: '자료', text: '경금 일간이 신약하고 관성이 강하면 압박을 받는 경향이 있다. 이런 경우 인성이 도와주면 안정된다. ' + 'x'.repeat(80) }); ok(r.s === 200 && r.d.doc, '풀이 자료 등록 200');
  r = await call('functions/api/ik.js', 'a=store'); ok(r.d.backend === 'supabase' && r.d.ok === true, '저장소 점검: backend=' + r.d.backend + ' ok=' + r.d.ok);
  const fc = await imp('functions/api/free-content.js'), put = await fc.onRequestPut({ env, request: new Request('http://x/api/free-content', { method: 'PUT', headers: { authorization: 'Bearer pw', 'content-type': 'application/json' }, body: JSON.stringify({ tarot: { cards: {}, images: { M0: '/api/clipfile?k=a.png' } } }) }) }); r = { s: put.status };
  ok(r.s === 200, '무료 콘텐츠(타로 이미지 매핑) 저장 200');
  const pub = await (await fc.onRequestGet({ env })).json(); ok(pub.content && pub.content.tarot.images.M0 === '/api/clipfile?k=a.png', '공개 GET 이 Supabase 값을 돌려줌');

  console.log('2. 방문자: 공개 심화 풀이(deep) · 호출 횟수 제한');
  const M = globalThis.Manse, SD = globalThis.ReportV2.SajuData, ch = M.compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, calendar: 'solar', leap: false, gender: 'M', city: '서울' }), sd = SD.build(ch, { now: Date.UTC(2026, 9, 6) }); delete sd.birth;
  r = await call('functions/api/ik.js', 'a=deep', { sd, ext: { future: [] }, domains: ['SELF'] }, false); ok(r.s === 200 && r.d.ok === true && r.d.enabled && r.d.domains.SELF && r.d.domains.SELF.sections.length > 0, '공개 deep 200 + 방금 저장한 풀이 지식이 Supabase 에서 읽혀 나옴 (인증 없음) ' + JSON.stringify(r.d).slice(0, 80));
  ok([...rows.keys()].some(k => k.startsWith('rl:ikdeep:')), '호출 횟수 제한 카운터가 Supabase 에 기록됨');

  console.log('3. KV 쓰기');
  ok(kvPuts.length === 0, '위 모든 작업에서 KV 쓰기 0회 (실제: ' + kvPuts.length + (kvPuts.length ? ' — ' + kvPuts.join(', ') : '') + ')');
  const routed = [...rows.keys()].map(k => k.split(':')[0]); ok(['ik', 'src', 'free', 'rl'].every(p => routed.includes(p)), 'Supabase 에 쌓인 키 접두어: ' + [...new Set(routed)].join(', '));

  console.log('\n' + (fails ? '실패 ' + fails + '건' : '전부 통과')); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
