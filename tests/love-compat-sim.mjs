// 인연운 심화 마지막 장 '그 사람과 나의 궁합'(timeline_love_compat) 검증: node tests/love-compat-sim.mjs
//   1) 서버 계산이 만세력 궁합과 같은 엔진(PairCompat.evaluate · MantraAmhap.compat · compatDayPillars) 결과를 그대로 낸다
//   2) /api/love-compat: 인연운(w3) 유료일 때 비로그인 401 · 미구매 402 · 구매 12개월 안 열림 · 12개월 지난 권한 잠김
//   3) 하루 10회: 서버가 세고(성공 때만 차감) 11번째는 429, 남은 횟수를 돌려준다. 다음 날(한국 시간) 다시 10회. 관리자는 제한 없음
//   4) 화면 모듈: 인연운 주제의 마지막 장으로 끼워지고(관리자 순서와 무관), 결과 화면에 만세력 prResult 구성이 나온다
//   5) 사용자 화면(viewer.js)·관리자 타임라인 구성(v2-timeline.js)이 이 장을 쓴다
// 네트워크 호출 0(가짜 Supabase·메모리 KV).
import fs from 'node:fs';
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
const M = globalThis.Manse, Pair = globalThis.PairCompat, Amhap = globalThis.MantraAmhap;

// ── 1. 같은 엔진
const meIn = { year: 1992, month: 6, day: 23, hour: 1, minute: 45, calendar: 'solar', gender: 'M', lon: 127.15, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto' };
const pIn = { name: '최예원', year: 1999, month: 12, day: 6, hour: 8, minute: 15, hourUnknown: true, calendar: 'solar', gender: 'F', lon: 127.15 };
{
  const me = L.cleanBirth(meIn), p = L.cleanBirth(pIn);
  ok(!me.error && !p.error && p.hour === null && p.hourUnknown, '입력 정리 실패');
  ok(L.cleanBirth({ ...pIn, month: 13 }).error === 'bad-date' && L.cleanBirth({ ...pIn, gender: 'X' }).error === 'bad-gender' && L.cleanBirth({ ...pIn, hourUnknown: false, hour: 25 }).error === 'bad-time', '잘못된 입력을 거르지 않음');
  const set = L.settingsOf({ ...meIn, timeMode: '<script>' });
  ok(set.jasi === 'jeong' && !('timeMode' in set), '계산 기준 설정 정리 오류');
  const chA = L.chartOf(me, L.settingsOf(meIn)), chB = L.chartOf(p, L.settingsOf(meIn));
  const res = L.evaluateAll(chA, chB, { a: '백진우', b: '최예원' });
  const direct = Pair.evaluate(M, M.compute({ ...meIn }), M.compute({ year: 1999, month: 12, day: 6, hour: null, minute: 0, calendar: 'solar', gender: 'F', lon: 127.15, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto' }), 'lover', { a: '백진우', b: '최예원' });
  ok(res.views.lover.score === direct.score && res.views.lover.grade.name === direct.grade.name, `궁합 점수가 만세력 엔진과 다름 ${res.views.lover.score}/${direct.score}`);
  ok(L.RELS.every(r => res.views[r] && res.views[r].rel === r), '관계 네 가지를 한 번에 계산하지 않음');
  ok(res.gz.a === '庚午' && res.gz.b === '壬辰' && res.hourKnown.b === false, `일주 표시 오류 ${res.gz.a}/${res.gz.b}`);
  const am = Amhap.compat(M, chA, chB, { nameA: '백진우', nameB: '최예원' }).filter(r => r.isValid);
  ok(res.amhap.length === am.length && res.amhap.length > 0 && res.amhapNote === Amhap.NOTE, '암합 결과가 MantraAmhap.compat 와 다름');
  ok(res.partPlain && res.partPlain.yong === Pair.PART_PLAIN.yong, '쉬운 항목 이름(PART_PLAIN) 없음');
  const dp = M.compatDayPillars(chA), at = dp.findIndex(x => x.s === chB.pillars.day.s && x.b === chB.pillars.day.b);
  ok(res.day && res.day.rank === at + 1 && res.day.of === 60 && res.day.version === 1, '일주 적합도(1판) 순위 오류');
  const res2 = L.evaluateAll(chA, chB, {}, { dayCompat: true });
  ok(res2.day && res2.day.version === 2 && !(globalThis.MANTRA_FLAGS && globalThis.MANTRA_FLAGS.dayCompat), '일주 적합도 2판 스위치가 요청 밖으로 새거나 적용되지 않음');
  ok(JSON.stringify(res).length < 80000, '결과가 너무 큼');
  const sd = L.sdOf(chA);
  ok(sd.pillars.day.hanja === '庚午' && sd.gender === 'M', '결제 확인용 사주 정보 오류');

  // ── 4. 화면 모듈(결과 그리기)
  globalThis.window = globalThis;
  const LC = require(path.join(root, 'report/v2/love-compat.js'));
  const html = LC.resultHtml(JSON.parse(JSON.stringify(res)), 'lover');
  for (const t of ['한눈에 정리', '서로에게 주는 것', '두 사람의 간지 관계', '숨은 인연 — 암합 분석', '상대 일주 적합도', '명리학적 근거 모두 보기', '상대 바꾸기', String(res.views.lover.score)])
    ok(html.includes(t), '결과 화면에 없음: ' + t);
  ok(/data-lc-rel="work"/.test(html) && LC.resultHtml(res, 'work').includes('직장·동업 기준'), '관계 단추·전환 오류');
  ok(!/<script/i.test(LC.resultHtml({ ...res, names: { a: '<script>', b: 'x' }, views: { lover: { ...res.views.lover, names: { a: '<script>', b: 'x' } } } }, 'lover')), '이름이 HTML 로 새어 나감');
  delete globalThis.window;
}

// ── 2·3. API
const store = new Map(), kvRows = new Map();
const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, String(v)); }, async delete(k) { store.delete(k); }, async list() { return { keys: [] }; } };
const cat = Editorial.defaults(); cat.chapters.forEach(c => { if (['self', 'wealth', 'career', 'love'].includes(c.topicId)) c.state = 'active'; });
store.set('ik:editorial:published', JSON.stringify(cat));
store.set('worlds:config', JSON.stringify({ worlds: [{ id: 'w1', access: 'free' }, { id: 'w3', access: 'paid' }] }));
const USERS = { 'tok-a': { id: '00000000-0000-0000-0000-00000000000a', email: 'a@x.test' }, 'tok-b': { id: '00000000-0000-0000-0000-00000000000b', email: 'b@x.test' }, 'tok-c': { id: '00000000-0000-0000-0000-00000000000c', email: 'c@x.test' } };
const ent = [];
const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
let now = Date.UTC(2026, 10, 20, 3);   // 2026-11-20 12:00 KST
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
const run = (h, extra = {}) => call({ a: 'run', me: meIn, name: '백진우', partner: pIn, partnerName: '최예원', device: 'dev0000000000000001', ...extra }, h);
const A = { 'x-member-token': 'tok-a' }, B = { 'x-member-token': 'tok-b' }, C = { 'x-member-token': 'tok-c' };
{
  const key = await (await imp('functions/_commerce.js')).sajuKey(L.sdOf(L.chartOf(L.cleanBirth(meIn), L.settingsOf(meIn))));
  ent.push({ user_id: USERS['tok-a'].id, saju_key: key, world: 'w3', granted_at: new Date(Date.UTC(2026, 0, 5)).toISOString() });   // 올해 1월 구매(유효)
  ent.push({ user_id: USERS['tok-c'].id, saju_key: key, world: 'w3', granted_at: new Date(Date.UTC(2025, 9, 1)).toISOString() });   // 13개월 전(만료)
  ent.push({ user_id: USERS['tok-b'].id, saju_key: key, world: 'w2', granted_at: new Date(Date.UTC(2026, 9, 1)).toISOString() });   // 재물운만 보유

  let r = await call({ a: 'status', me: meIn });
  ok(r.s === 200 && r.d.access.ok === false && r.d.access.reason === 'login', '비로그인 상태 확인 오류');
  r = await run({}); ok(r.s === 401 && r.d.locked && r.d.locked.world === 'w3', '비로그인 실행이 잠기지 않음 ' + r.s);
  r = await run(B); ok(r.s === 402, '미구매(다른 주제만 보유) 실행이 잠기지 않음 ' + r.s);
  r = await run(C); ok(r.s === 402, '12개월 지난 구매 권한이 잠기지 않음 ' + r.s);
  r = await call({ a: 'run', me: { ...meIn, gender: 'F' }, partner: pIn }, A); ok(r.s === 402, '다른 사주(성별이 다른 원국)로 우회됨');

  r = await call({ a: 'status', me: meIn }, A);
  ok(r.d.access.ok && r.d.quota.left === 10 && r.d.quota.limit === 10, '보유 회원 남은 횟수 오류 ' + JSON.stringify(r.d));
  r = await call({ a: 'run', me: meIn, partner: { ...pIn, month: 13 } }, A);
  ok(r.s === 400 && r.d.error === 'bad-date', '잘못된 상대 입력 처리 오류');
  r = await call({ a: 'status', me: meIn }, A); ok(r.d.quota.left === 10, '실패한 요청이 횟수를 차감함');
  let lefts = [];
  for (let i = 0; i < 10; i++) { r = await run(A); lefts.push(r.d.quota && r.d.quota.left); if (i === 0) ok(r.s === 200 && r.d.ok && r.d.result.views.lover.score > 0, '보유 회원 궁합 실행 실패'); }
  ok(lefts.join() === '9,8,7,6,5,4,3,2,1,0', '남은 횟수 줄어듦 오류 ' + lefts.join());
  r = await run(A); ok(r.s === 429 && r.d.error === 'daily-limit' && r.d.quota.left === 0, '11번째가 막히지 않음 ' + r.s);
  r = await run(A, { device: 'devffffffffffffffff' }); ok(r.s === 429, '기기 ID 를 바꿔 회원 횟수를 우회함');
  r = await call({ a: 'status', me: meIn }, A); ok(r.d.quota.left === 0, '상태에 남은 0회가 보이지 않음');
  r = await run({ authorization: 'Bearer pw' }); ok(r.s === 200 && r.d.quota.unlimited, '관리자는 횟수 제한 없이 보여야 함');
  now += 13 * 3600e3;   // 다음 날 01:00 KST
  r = await run(A); ok(r.s === 200 && r.d.quota.left === 9, '한국 시간 자정 뒤 다시 10회가 열리지 않음 ' + JSON.stringify(r.d.quota));
  ok([...kvRows.keys()].every(k => k.startsWith('rl:love-compat:') && !/1999|최예원|백진우/.test(k)) && [...kvRows.values()].every(v => v.expires_at), '횟수 키에 개인정보가 들어가거나 만료가 없음');

  // 인연운이 무료 세계면 누구나 보되, 기기(없으면 IP) 기준 하루 10회
  store.set('worlds:config', JSON.stringify({ worlds: [{ id: 'w3', access: 'free' }] }));
  for (let i = 0; i < 10; i++) r = await run({}, { device: 'freedev000000000001' });
  ok(r.s === 200 && r.d.quota.left === 0, '무료 세계 비회원 횟수 오류');
  r = await run({}, { device: 'freedev000000000001' }); ok(r.s === 429, '무료 세계 비회원 11번째가 막히지 않음');
  r = await call({ a: 'bad' }); ok(r.s === 400, '잘못된 동작 처리 오류');
}
Date.now = realNow;

// ── 4. 장 끼우기·자리
{
  globalThis.window = globalThis;
  delete require.cache[require.resolve(path.join(root, 'report/v2/love-compat.js'))];
  const LC = require(path.join(root, 'report/v2/love-compat.js'));
  require(path.join(root, 'report/v2/explore.js')); const X = globalThis.ReportV2.Explore;
  const ch = M.compute(meIn), mk = (id, t) => ({ id, editorialTopicId: t, editorialContractId: id, act: 'a' + t, scenes: [] });
  const rep = { chapters: [mk('timeline_self_01', 'self'), mk('timeline_love_01', 'love'), mk('timeline_love_02', 'love'), mk('timeline_wealth_01', 'wealth')] };
  const out = LC.add(rep, {}, '백진우', M, ch), ids = out.chapters.map(c => c.id);
  ok(ids.join() === 'timeline_self_01,timeline_love_01,timeline_love_02,timeline_love_compat,timeline_wealth_01', '인연운 끝에 끼워지지 않음 ' + ids.join());
  const c = out.chapters[3];
  ok(c.title === '그 사람과 나의 궁합' && c.placeLast && c.aiEnabled === false && !c.readingSupplementary && c.editorialTopicId === 'love' && c.no === 4, '장 속성 오류');
  ok(c.scenes.some(s => /data-lc-root/.test(s.html)) && c.scenes.every(s => s.sceneType === 'life'), '입력 장면 없음');
  const form = c.scenes.map(s => s.html).join('');
  ok(/어떤 사이인가요?/.test(form) && ['lover', 'work', 'friend', 'family'].every(k => form.includes('data-lc-set="rel:' + k + '"')) && /data-lc-set="rel:lover" aria-pressed="true"/.test(form), '입력 폼에서 관계(연인·직장·친구·가족)를 먼저 고를 수 없음');
  ok(LC.add(out, {}, '', M, ch).chapters.length === out.chapters.length, '두 번 넣으면 중복됨');
  ok(LC.add({ chapters: [mk('timeline_self_01', 'self')] }, {}, '', M, ch).chapters.length === 1, '인연운 장이 없는 문서에 끼워짐');
  ok(LC.meOf(ch).hour === 1 && LC.meOf(ch).gender === 'M', '내 입력 꺼내기 오류');
  // 관리자 순서 설정이 있어도 마지막
  const worlds = X.mergeWorlds(null).map(w => w.id === 'w3' ? { ...w, chapterSettings: { timeline_love_compat: { order: 0 }, timeline_love_01: { order: 5 }, timeline_love_02: { order: 1 } } } : w);
  const applied = X.applyTopics(out.chapters, worlds).filter(x => x.editorialTopicId === 'love').map(x => x.id);
  ok(applied[applied.length - 1] === 'timeline_love_compat' && applied[0] === 'timeline_love_02', '관리자 순서를 저장해도 마지막에 고정되지 않음 ' + applied.join());
  const hidden = X.applyTopics(out.chapters, X.mergeWorlds(null).map(w => w.id === 'w3' ? { ...w, chapterSettings: { timeline_love_compat: { enabled: false } } } : w));
  ok(!hidden.some(x => x.id === 'timeline_love_compat'), '관리자 노출 끄기가 적용되지 않음');
  delete globalThis.window;
}

// ── 5. 연결
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
for (const [file, pat, msg] of [
  ['report/v2/viewer.js', /love-compat\.js\?v=[^']+'[\s\S]*R\.LoveCompat\.add\(S\.rep,S\.sd,S\.name,window\.Manse,S\.ch\)/, '사용자 화면이 궁합 장을 끼우지 않음'],
  ['report/admin/v2-timeline.js', /\.\.\/v2\/love-compat\.js[\s\S]*R\.LoveCompat\.add\(doc,sd,'',M,ch\)/, '관리자 타임라인 구성에 궁합 장이 없음'],
  ['report/admin/v2-timeline.js', /c\.loveCompat\?'궁합 장\(만세력 궁합 엔진\)/, '관리자 목록에 궁합 장 설명이 없음'],
  ['report/admin/v2-timeline.js', /var last = arr\.filter\(function \(c\) \{ return c\.placeLast; \}\)/, '관리자 목록이 마지막 고정을 따르지 않음'],
  ['functions/api/love-compat.js', /chapterGate\(request, env, \{ topicId: TOPIC_ID, chapterId: CHAPTER_ID, sd: sdOf\(chA\) \}\)/, '서버가 결제 잠금을 재사용하지 않음'],
]) ok(pat.test(read(file)), msg);

if (fails.length) { console.log('✗ love-compat-sim 실패 ' + fails.length + '건\n  - ' + fails.join('\n  - ')); process.exit(1); }
console.log('✓ love-compat-sim 통과 — 같은 엔진·보유 잠금(12개월)·하루 10회·남은 횟수·인연운 마지막 장·관리자 목록');
