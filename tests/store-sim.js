// Supabase 저장소 어댑터(functions/_store.js) 검증: 가짜 PostgREST 로 읽기·쓰기·폴백·묘비·만료·기억·접두어 목록·라우팅을 확인한다.
// 실행: node tests/store-sim.js
const path = require('path'), { pathToFileURL } = require('url');
const imp = f => import(pathToFileURL(path.join(__dirname, '..', f)).href);
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

// ── 가짜 Supabase(PostgREST): public.kv 한 테이블 ──
const rows = new Map(); let calls = { get: 0, put: 0, del: 0, list: 0 }, fail = false;
const realFetch = global.fetch;
global.fetch = async (u, o = {}) => {
  u = String(u); if (!u.includes('supabase.test/rest/v1/kv')) return realFetch(u, o);
  const h = new Headers(o.headers || {}); if (h.get('apikey') !== 'svc' || h.get('authorization') !== 'Bearer svc') return new Response('{}', { status: 401 });
  if (fail) return new Response('boom', { status: 500 });
  const url = new URL(u), q = url.searchParams, m = o.method || 'GET', J = (x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { 'content-type': 'application/json' } });
  if (m === 'GET') {
    const kv = q.get('key');
    if (kv && kv.startsWith('eq.')) { calls.get++; const r = rows.get(kv.slice(3)); return J(r ? [{ value: r.value, expires_at: r.expires_at }] : []); }
    if (kv && kv.startsWith('like.')) { calls.list++; const pre = kv.slice(5).replace(/\*$/, ''); return J([...rows.entries()].filter(([k]) => k.startsWith(pre)).map(([key, r]) => ({ key, value: r.value }))); }
  }
  if (m === 'POST') { calls.put++; const b = JSON.parse(o.body); rows.set(b.key, { value: b.value, expires_at: b.expires_at }); return new Response(null, { status: 201 }); }
  if (m === 'DELETE') { calls.del++; rows.delete(q.get('key').slice(3)); return new Response(null, { status: 204 }); }
  return J({}, 400);
};

// ── 가짜 KV(Cloudflare) ──
function fakeKV() { const m = new Map(), s = { get: 0, put: 0 }; return { s, m, get: async (k, t) => { s.get++; const v = m.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { s.put++; m.set(k, String(v)); }, delete: async k => { m.delete(k); }, list: async o => ({ keys: [...m.keys()].filter(k => k.startsWith(o.prefix || '')).map(name => ({ name })), list_complete: true }) }; }

(async () => {
  const { kvOf, supabaseOn, storeCheck } = await imp('functions/_store.js');
  const kv = fakeKV(), envOff = { GLOSSARY_KV: kv }, envOn = { GLOSSARY_KV: kv, SUPABASE_URL: 'https://supabase.test', SUPABASE_SERVICE_KEY: 'svc' };

  console.log('1. 설정이 없으면 지금처럼 KV');
  ok(kvOf(envOff) === kv && !supabaseOn(envOff), '환경변수 없음 → 원래 KV 객체를 그대로 돌려줌(원복 가능)');
  ok(kvOf({}) === undefined, 'KV 바인딩도 없으면 undefined(기존 `if (!kv)` 분기가 그대로 동작)');

  console.log('2. Supabase 켜짐: 라우팅');
  const a = kvOf(envOn);
  await a.put('ik:d:SELF', JSON.stringify([{ id: 'SELF-0001' }])); await a.put('src:idx', '[]'); await a.put('free:content', '{"v":1}'); await a.put('rl:compose:1.1.1.1:h', '3', { expirationTtl: 7200 });
  ok(kv.s.put === 0 && rows.size === 4, '라우팅 대상(ik:/src:/free:/rl:)은 KV 에 한 번도 쓰지 않고 Supabase 에만 기록 (KV 쓰기 ' + kv.s.put + '회)');
  ok(JSON.stringify(await a.get('ik:d:SELF', 'json')) === '[{"id":"SELF-0001"}]', "get(…, 'json') 왕복");
  ok(await a.get('rl:compose:1.1.1.1:h') === '3', '문자열 왕복(호출 횟수 카운터)');
  await a.put('media:index', '[1]'); await a.put('intro:config', '{}');
  ok(kv.s.put === 2 && !rows.has('media:index'), '드물게 쓰는 키(media:/intro: …)는 그대로 KV');

  console.log('3. 기존 KV 값 폴백 · 묘비 · 만료');
  kv.m.set('ik:d:MONEY', '[{"id":"MONEY-0001"}]'); kv.m.set('waitlist:a@b.co', '{"at":"x"}');
  ok((await a.get('ik:d:MONEY', 'json'))[0].id === 'MONEY-0001', 'Supabase 에 없으면 KV 의 기존 값을 읽음(별도 이전 불필요)');
  await a.delete('ik:d:MONEY');
  ok(await a.get('ik:d:MONEY', 'json') === null && kv.m.has('ik:d:MONEY'), '삭제하면 묘비를 남겨 기존 KV 값이 되살아나지 않음');
  ok(await a.get('src:없는키', 'json') === null, '어디에도 없으면 null');
  rows.set('rl:old', { value: '9', expires_at: new Date(Date.now() - 1000).toISOString() });
  ok(await a.get('rl:old') === null, '만료된 값은 null');
  const rl = rows.get('rl:compose:1.1.1.1:h'); ok(rl.expires_at && Date.parse(rl.expires_at) > Date.now() + 7000 * 1000 - 5000, 'expirationTtl → expires_at 로 변환');

  console.log('4. 대기자 목록(list)');
  await a.put('waitlist:c@d.co', '{"at":"y"}');
  const ls = await a.list({ prefix: 'waitlist:' }); const names = ls.keys.map(k => k.name).sort();
  ok(names.join() === 'waitlist:a@b.co,waitlist:c@d.co', 'Supabase 의 새 신청 + KV 에 남은 기존 신청을 합침: ' + names.join());

  console.log('5. 공개 읽기 기억(cache:true)');
  const p = kvOf(envOn, { cache: true }); calls.get = 0;
  await p.get('ik:d:SELF', 'json'); await p.get('ik:d:SELF', 'json'); await p.get('ik:d:SELF', 'json');
  ok(calls.get === 1, '같은 isolate 에서 20초 안에는 Supabase 를 한 번만 읽음(읽기 ' + calls.get + '회)');
  await p.put('ik:d:SELF', '[{"id":"NEW"}]'); ok((await p.get('ik:d:SELF', 'json'))[0].id === 'NEW', '쓰기 후에는 기억을 버리고 최신 값을 읽음');
  calls.get = 0; await p.get('rl:x'); await p.get('rl:x'); ok(calls.get === 2, '호출 횟수 카운터는 기억하지 않음(항상 최신)');
  calls.get = 0; await a.get('ik:d:SELF', 'json'); await a.get('ik:d:SELF', 'json'); ok(calls.get === 2, '관리자 경로(cache 없음)는 항상 최신');

  console.log('6. 오류 · 점검');
  fail = true; let err = ''; try { await a.get('ik:d:SELF', 'json'); } catch (e) { err = e.message; } ok(/supabase 500/.test(err), 'Supabase 오류는 숨기지 않고 던짐: ' + err);
  const bad = await storeCheck(envOn); ok(bad.ok === false && bad.backend === 'supabase' && /500/.test(bad.error), '점검: 실패를 이유와 함께 보고');
  fail = false; const good = await storeCheck(envOn); ok(good.ok === true && good.backend === 'supabase' && good.ms >= 0, '점검: Supabase 쓰기→읽기 성공 (' + good.ms + 'ms)');
  const kvOnly = await storeCheck(envOff); ok(kvOnly.ok === true && kvOnly.backend === 'kv', '점검: 설정 없으면 backend=kv');
  const wrongKey = await (async () => { global.fetch = async () => new Response('{"message":"Invalid API key"}', { status: 401 }); try { return await storeCheck({ ...envOn, SUPABASE_SERVICE_KEY: 'nope' }); } finally { global.fetch = realFetch; } })();
  ok(wrongKey.ok === false && /401/.test(wrongKey.error), '점검: 키가 틀리면 401 을 알려 줌');

  console.log('\n' + (fails ? '실패 ' + fails + '건' : '전부 통과')); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
