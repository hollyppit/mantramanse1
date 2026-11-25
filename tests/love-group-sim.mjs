// 인연운 궁합 장 '여러 명 보기'(2026-11-25) 검증: node tests/love-group-sim.mjs
//   1) 서버 계산(evaluateGroup)이 compat-group.js(GroupCompat.evaluate)와 같고, 관계 네 가지·달별 흐름을 한 번에 돌려준다
//   2) /api/love-compat a:'group': 스위치 loveGroup 꺼짐 403(관리자는 열림) · 비로그인 401 · 미구매 402 · 인원 3~6명 · 잘못된 입력 400
//   3) 한 번 보면 하루 횟수 1회만 줄고, 실패는 차감 없음 · 11번째 429 · status.group 이 스위치를 따른다
//   4) 화면(love-group-view.js): 일곱 칸이 그려지고, 이름이 HTML 로 새지 않으며, 단정·확률 표현이 없다
// 네트워크 호출 0(가짜 Supabase·메모리 KV).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = p => import(pathToFileURL(path.join(root, p)).href);
const require = createRequire(import.meta.url);
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };

const L = await imp('functions/_love-compat.js');
const api = await imp('functions/api/love-compat.js');
const { Editorial } = await imp('functions/_editorial.js');
const M = globalThis.Manse, GC = globalThis.GroupCompat;

const meIn = { year: 1992, month: 6, day: 23, hour: 1, minute: 45, calendar: 'solar', gender: 'M', lon: 127.15, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto' };
const P = [
  { name: '지은', year: 1990, month: 7, day: 2, hour: 15, minute: 0, calendar: 'solar', gender: 'F', lon: 126.98 },
  { name: '아빠', role: 'parent', year: 1958, month: 11, day: 20, hour: 6, minute: 0, calendar: 'solar', gender: 'M', lon: 126.98 },
  { name: '엄마', role: 'parent', year: 1961, month: 2, day: 9, hourUnknown: true, calendar: 'lunar', gender: 'F', lon: 129.04 },
  { name: '<b>민준</b>', role: 'hacker', year: 1993, month: 12, day: 30, hour: 22, minute: 10, calendar: 'solar', gender: 'M', lon: 126.98 },
  { name: '수아', year: 1995, month: 5, day: 17, hour: 9, minute: 0, calendar: 'solar', gender: 'F', lon: 126.98 },
];
const BAN = /안 맞는|맞지 않는 사람|상극|최악|나쁜 사람|헤어질|반드시|확률|성공률|NaN|undefined/;

// ── 1. 같은 계산
{
  const set = L.settingsOf(meIn), chA = L.chartOf(L.cleanBirth(meIn), set);
  const people = [{ ch: chA, name: '나', me: true }, ...P.slice(0, 3).map(p => ({ ch: L.chartOf(L.cleanBirth(p), set), name: p.name, role: L.cleanGroupMeta(p).role }))];
  const now = Date.UTC(2026, 10, 25, 3), r = L.evaluateGroup(people, { now });
  ok(L.RELS.every(k => r.views[k] && r.views[k].rel === k && !r.views[k].months), '관계 네 가지를 한 번에 계산하지 않음');
  const direct = GC.evaluate(M, people, 'family', { now });
  ok(JSON.stringify(r.views.family.pairs) === JSON.stringify(direct.pairs) && r.views.family.avg === direct.avg, '서버 결과가 GroupCompat 과 다름');
  ok(r.months && r.months.rows.length === 12 && JSON.stringify(r.months.rows) === JSON.stringify(direct.months.rows), '달별 흐름이 한 번만 오지 않음');
  ok(r.views.family.people[2].roleLabel === '부모' && L.cleanGroupMeta({ role: 'hacker' }).role === '', '가족 역할 정리 오류');
  ok(JSON.stringify(r).length < 120000, '결과가 너무 큼 ' + JSON.stringify(r).length);
  // ── 4. 화면
  globalThis.window = globalThis;
  const V = require(path.join(root, 'report/v2/love-group-view.js'));
  for (const rel of L.RELS) {
    const html = V.html(JSON.parse(JSON.stringify(r)), rel, { quota: '<p>q</p>' });
    for (const t of ['관계 지도', '기운 방향', '무리의 오행 균형', '함께 좋은 시기', '무리를 편하게 하는 요령', '사람 바꾸기', 'data-lc-grel="work"', '<svg'])
      ok(html.includes(t), `${rel} 화면에 없음: ${t}`);
    const bad = html.replace(/<[^>]+>/g, ' ').replace('누가 좋고 나쁜 사람인지를 정하지 않으며', '').match(BAN);   // 바닥 안내문의 부정 문장은 뺀다 ok(!bad, `${rel} 금지 표현 '${bad && bad[0]}'`);
  }
  const evil = JSON.parse(JSON.stringify(r)); evil.views.lover.people[1].name = '<img src=x onerror=1>';
  ok(!/<img/.test(V.html(evil, 'lover')), '이름이 HTML 로 새어 나감');
  ok(V.html(r, 'nope').includes('연인·부부 기준'), '모르는 관계는 연인으로');
  ok(typeof V.css() === 'string' && V.css().includes('.lg-months'), 'CSS 없음');
  delete globalThis.window;
}

// ── 2·3. API
const store = new Map(), kvRows = new Map();
const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, String(v)); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
const cat = Editorial.defaults(); cat.chapters.forEach(c => { if (['self', 'wealth', 'career', 'love'].includes(c.topicId)) c.state = 'active'; });
store.set('ik:editorial:published', JSON.stringify(cat));
store.set('worlds:config', JSON.stringify({ worlds: [{ id: 'w1', access: 'free' }, { id: 'w3', access: 'paid' }] }));
const USERS = { 'tok-a': { id: '00000000-0000-0000-0000-00000000000a', email: 'a@x.test' }, 'tok-b': { id: '00000000-0000-0000-0000-00000000000b', email: 'b@x.test' } };
const ent = [];
const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
let now = Date.UTC(2026, 10, 25, 3);
const realNow = Date.now; Date.now = () => now;
global.fetch = async (u, init = {}) => {
  u = String(u); const method = (init.method || 'GET').toUpperCase(), res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
  if (u.includes('/auth/v1/user')) { const t = (init.headers.authorization || '').slice(7); return USERS[t] ? res(USERS[t]) : res({}, 401); }
  if (u.includes('/rest/v1/kv')) {
    if (method === 'POST') { const b = JSON.parse(init.body); kvRows.set(b.key, b); return res(null, 201); }
    const k = (q(u, 'key') || '').replace(/^eq\./, ''); return res(kvRows.has(k) ? [kvRows.get(k)] : []);
  }
  if (u.includes('/rest/v1/commerce_entitlements')) {
    if (method !== 'GET') return res(null, 204);
    const uid = q(u, 'user_id').slice(3), key = q(u, 'saju_key').slice(3), since = (q(u, 'granted_at') || 'gt.').slice(3);
    return res(ent.filter(e => e.user_id === uid && e.saju_key === key && !e.revoked_at && e.granted_at > since).map(e => ({ world: e.world })));
  }
  if (u.includes('/rest/v1/')) return res([]);
  throw new Error('unexpected fetch ' + u);
};
const env = { GLOSSARY_KV: KV, SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', ADMIN_PASSWORD: 'pw' };
const call = async (body, h = {}) => { const r = await api.onRequestPost({ env, request: new Request('http://x/api/love-compat', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.1.1.1', ...h }, body: JSON.stringify(body) }) }); return { s: r.status, d: await r.json() }; };
const grp = (h, extra = {}) => call({ a: 'group', me: meIn, name: '백진우', includeMe: true, people: P.slice(0, 3), device: 'dev0000000000000001', ...extra }, h);
const A = { 'x-member-token': 'tok-a' }, B = { 'x-member-token': 'tok-b' }, ADMIN = { authorization: 'Bearer pw' };
const setFlag = v => store.set('luckenv:flags', JSON.stringify({ version: 1, loveGroup: v }));
{
  const key = await (await imp('functions/_commerce.js')).sajuKey(L.sdOf(L.chartOf(L.cleanBirth(meIn), L.settingsOf(meIn))));
  ent.push({ user_id: USERS['tok-a'].id, saju_key: key, world: 'w3', granted_at: new Date(Date.UTC(2026, 0, 5)).toISOString() });
  ent.push({ user_id: USERS['tok-b'].id, saju_key: key, world: 'w2', granted_at: new Date(Date.UTC(2026, 9, 1)).toISOString() });

  let r = await call({ a: 'status', me: meIn }, A); ok(r.d.group === false, 'status.group 이 꺼짐을 따르지 않음');
  r = await grp(A); ok(r.s === 403 && r.d.error === 'group-off', '스위치 꺼짐인데 열림 ' + r.s);
  r = await grp(ADMIN); ok(r.s === 200 && r.d.ok && r.d.quota.unlimited && r.d.result.views.family, '관리자는 스위치가 꺼져도 미리 볼 수 있어야 함 ' + r.s);
  r = await call({ a: 'status', me: meIn }, ADMIN); ok(r.d.group === true, '관리자 status.group');
  setFlag(true);
  r = await call({ a: 'status', me: meIn }, A); ok(r.d.group === true && r.d.quota.left === 10, 'status.group 이 켜짐을 따르지 않음');
  r = await grp({}); ok(r.s === 401, '비로그인 여러 명 보기가 잠기지 않음 ' + r.s);
  r = await grp(B); ok(r.s === 402, '미구매 여러 명 보기가 잠기지 않음 ' + r.s);
  r = await grp(A, { people: P.slice(0, 1) }); ok(r.s === 400 && r.d.error === 'group-size', '2명이 막히지 않음');
  r = await grp(A, { people: P.slice(0, 2), includeMe: false }); ok(r.s === 400 && r.d.error === 'group-size', '나를 빼고 2명이 막히지 않음');
  r = await grp(A, { people: P.concat(P[0]) }); ok(r.s === 400 && r.d.error === 'group-size', '7명이 막히지 않음');
  r = await grp(A, { people: [P[0], { ...P[1], month: 13 }] }); ok(r.s === 400 && r.d.error === 'bad-date' && /3번째/.test(r.d.message), '잘못된 입력 처리 오류 ' + JSON.stringify(r.d));
  r = await grp(A, { people: 'x' }); ok(r.s === 400, '목록이 아닌 people');
  r = await call({ a: 'status', me: meIn }, A); ok(r.d.quota.left === 10, '실패한 요청이 횟수를 차감함');
  r = await grp(A);
  ok(r.s === 200 && r.d.ok && r.d.quota.left === 9, '여러 명 보기 1회 차감 오류 ' + JSON.stringify(r.d.quota));
  ok(r.d.result.views.lover.n === 4 && r.d.result.views.lover.people[0].me && r.d.result.views.lover.people[0].name === '백진우', '나 포함 4명 결과 오류');
  r = await grp(A, { includeMe: false, people: P }); ok(r.s === 200 && r.d.result.views.friend.n === 5 && r.d.quota.left === 8, '나를 빼고 5명 오류');
  ok(r.d.result.views.friend.people.every(p => !/</.test(p.name) || p.name === '<b>민준</b>') && r.d.result.views.friend.people[3].role === '', '이름·역할 정리 오류');
  r = await grp(A, { people: P.slice(0, 5) }); ok(r.s === 200 && r.d.result.views.work.n === 6, '6명 오류');
  for (let i = 0; i < 7; i++) r = await grp(A);
  ok(r.s === 200 && r.d.quota.left === 0, '남은 횟수 0 오류 ' + JSON.stringify(r.d.quota));
  r = await grp(A); ok(r.s === 429 && r.d.error === 'daily-limit', '11번째가 막히지 않음');
  r = await call({ a: 'run', me: meIn, partner: P[0] }, A); ok(r.s === 429, '두 사람 보기와 횟수를 함께 쓰지 않음');
  ok([...kvRows.keys()].every(k => k.startsWith('rl:love-compat:') && !/지은|아빠|1958/.test(k)), '횟수 키에 개인정보가 들어감');
  const raw = JSON.stringify({ a: 'group', me: meIn, people: P, pad: 'x'.repeat(9000) });
  const big = await api.onRequestPost({ env, request: new Request('http://x/api/love-compat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw }) });
  ok(big.status === 413, '너무 큰 요청');
}
Date.now = realNow;

if (fails.length) { console.log('✗ love-group-sim 실패 ' + fails.length + '건\n' + [...new Set(fails)].join('\n')); process.exit(1); }
console.log('✓ love-group-sim 통과 — 같은 계산·관계 네 가지 한 번·스위치·잠금·인원 3~6명·1회 차감·화면·금지 표현');
