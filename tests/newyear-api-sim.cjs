// 신년운세 서버 API·권한 검증: node tests/newyear-api-sim.cjs
// 메모리 KV·가짜 Supabase(Auth·entitlements)로 functions/_newyear.js·/api/newyear/reading·연도 상품을 실행한다. 네트워크 호출 0.
const assert = require('assert/strict');
const fs = require('fs'), path = require('path'), url = require('url');
const root = path.join(__dirname, '..');
const imp = p => import(url.pathToFileURL(path.join(root, p)).href);

(async () => {
  // 1) 서버 런타임: 만세력 엔진(engine.js)을 ES 모듈로 불러와도 동작해야 한다
  const RT = await imp('functions/_newyear-runtime.js');
  assert.ok(globalThis.Manse && globalThis.Manse.compute, '서버에서 만세력 엔진 로드');
  assert.equal(globalThis.Manse.gzName(globalThis.Manse.compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, calendar: 'solar' }).pillars.day), '庚辰');
  // 런타임 import 목록 = 폴더의 문구 파일·연도 자료
  const dir = path.join(root, 'report', 'newyear');
  const onDisk = fs.readdirSync(path.join(dir, 'texts')).filter(f => /^(tojeong-modern-\d+|saju-blocks-[\w-]+)\.js$/.test(f)).map(f => 'texts/' + f)
    .concat(fs.readdirSync(path.join(dir, 'years')).filter(y => /^\d{4}$/.test(y)).map(y => `years/${y}/pack.js`)).sort();
  assert.deepEqual([...RT.RUNTIME_FILES].sort(), onDisk, '_newyear-runtime.js import 목록이 폴더와 같음');
  assert.deepEqual(RT.YEARS(), [2027]);

  const C = await imp('functions/_commerce.js');
  const NYG = await imp('functions/_newyear.js');
  const api = await imp('functions/api/newyear/reading.js');
  const adm = await imp('functions/api/newyear/admin.js');
  const accessApi = await imp('functions/api/commerce/access.js');

  // 2) 메모리 KV · 가짜 Supabase
  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); } };
  const USERS = { 'tok-a': { id: '00000000-0000-0000-0000-00000000000a', email: 'a@x.test' } };
  const ents = []; const patches = [];
  const q = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(u); return m ? decodeURIComponent(m[1]) : null; };
  const eqv = v => v && v.startsWith('eq.') ? v.slice(3) : null;
  global.fetch = async (u, init = {}) => {
    u = String(u); const method = (init.method || 'GET').toUpperCase();
    const res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
    if (u.includes('/auth/v1/user')) { const t = (init.headers.authorization || '').slice(7); return USERS[t] ? res(USERS[t]) : res({ msg: 'bad' }, 401); }
    if (u.includes('/rest/v1/commerce_entitlements')) {
      const rows = ents.filter(e => (!q(u, 'user_id') || e.user_id === eqv(q(u, 'user_id'))) && (!q(u, 'saju_key') || e.saju_key === eqv(q(u, 'saju_key'))) && (!q(u, 'world') || e.world === eqv(q(u, 'world'))) && !e.revoked_at);
      if (method === 'PATCH') { patches.push(u); rows.forEach(r => { if (!r.first_viewed_at) r.first_viewed_at = new Date().toISOString(); }); return res(null, 204); }
      return res(rows.map(r => ({ world: r.world })));
    }
    if (u.includes('/rest/v1/')) return res([]);
    throw new Error('unexpected fetch ' + u);
  };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm', SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', PORTONE_STORE_ID: 's', PORTONE_CHANNEL_KEY: 'c', PORTONE_API_SECRET: 'p' };
  const birth = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'M', calendar: 'solar' };
  const call = async (headers = {}, body = { birth, year: 2027 }, e = env) => {
    const r = await api.onRequestPost({ request: new Request('https://x.test/api/newyear/reading', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }), env: e });
    return { status: r.status, body: await r.json() };
  };
  const setCfg = v => store.set(NYG.NEWYEAR_KEY, JSON.stringify({ years: { 2027: { visibility: v } } }));
  const setPrice = p => store.set(C.PRODUCTS_KEY, JSON.stringify({ products: [{ id: 'tj2027', price: p, active: true }] }));
  // 응답 안의 모든 문장(문자열)을 모아 비교한다(JSON 이스케이프 영향 없이)
  const bodyText = r => texts(r.body.reading || {}).join(' || ');

  const texts = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (o && typeof o === 'object') Object.values(o).forEach(v => texts(v, out)); return out; };
  // 3) 입력 오류
  assert.equal((await call({}, { birth: { year: 1990 }, year: 2027 })).status, 400);
  assert.equal((await call({}, { birth, year: 2030 })).status, 404);

  // 4) 기본값 closed: 공개 안 함(관리자만)
  let r = await call();
  assert.equal(r.body.access.state, 'closed'); assert.equal(r.body.reading, null);
  r = await call({ authorization: 'Bearer adm' });
  assert.equal(r.body.access.state, 'open'); assert.equal(r.body.reading.chapters.length, 9);
  assert.equal(r.body.admin.mode, 'public');
  const adminPreview = await call({ authorization: 'Bearer adm', 'x-content-mode': 'preview' });
  assert.equal(adminPreview.body.admin.mode, 'preview'); assert.equal(adminPreview.body.reading.tojeong.modernShown, true, '관리자 미리보기는 검수 전 현대어도 보임');
  assert.equal(r.body.reading.tojeong.modernShown, false, '공개 모드는 검수 전(draft) 현대어 숨김');

  // 4-1) 관리자 검수: 승인 전 공개 모드에는 사주 블록이 없고, 미리보기에는 있다
  const admCall = async (method, q = '', body, h = { authorization: 'Bearer adm' }) => {
    const req = new Request('https://x.test/api/newyear/admin' + q, { method, headers: { 'content-type': 'application/json', 'x-reviewer': encodeURIComponent('검수자'), ...h }, body: body ? JSON.stringify(body) : undefined });
    const res = await (method === 'GET' ? adm.onRequestGet : adm.onRequestPost)({ request: req, env }); return { status: res.status, body: await res.json() };
  };
  assert.equal((await admCall('GET', '', null, {})).status, 401, '관리자 아니면 401');
  let A = await admCall('GET', '?year=2027');
  assert.equal(A.status, 200); assert.equal(A.body.summary.modern.total, 144); assert.equal(A.body.summary.modern.inYear, 120, '2027 가능 괘 120');
  assert.equal(A.body.summary.blocks.reviewed, 0); assert.equal(A.body.config.visibility, 'closed');
  const wealthOf = rd => rd.chapters.find(c => c.id === 'wealth').paras;
  assert.ok(!wealthOf(r.body.reading).some(p => p.role === 'advice'), '승인 전 공개 모드: 재물 장에 사주 블록 문장 없음');
  assert.ok(wealthOf(adminPreview.body.reading).some(p => p.role === 'advice'), '미리보기: 블록 있음');
  // 괘 상세 + 금지 표현 수정 거절 + 수정·승인
  const g0 = r.body.reading.tojeong.gua;
  const G = await admCall('GET', '?gua=' + g0); assert.ok(G.body.original || G.body.supplement); assert.equal(G.body.status, 'draft');
  let P = await admCall('POST', '', { action: 'modern', gua: g0, edits: { theme: '올해는 반드시 부자가 돼요' }, rev: A.body.rev });
  assert.equal(P.status, 400); assert.equal(P.body.error, 'banned-text', '확정 표현은 저장 거절');
  P = await admCall('POST', '', { action: 'modern', gua: g0, edits: { theme: '검수자가 고친 핵심 한 줄' }, status: 'reviewed', rev: A.body.rev });
  assert.equal(P.status, 200);
  // 오래된 rev 로 저장하면 409(덮어쓰기 방지)
  assert.equal((await admCall('POST', '', { action: 'modern', gua: g0, status: 'draft', rev: A.body.rev })).status, 409);
  // 블록 전부 승인 → 공개 모드에 블록 문장, 승인한 괘는 현대어 보임(수정 반영)
  A = await admCall('GET', '?year=2027');
  P = await admCall('POST', '', { action: 'bulk', kind: 'blocks', ids: A.body.blocks.map(b => b.id), status: 'reviewed', rev: A.body.rev });
  assert.equal(P.status, 200);
  r = await call({ authorization: 'Bearer adm' });
  assert.ok(wealthOf(r.body.reading).some(p => p.role === 'advice'), '승인 뒤 공개 모드에 블록 문장');
  assert.equal(r.body.reading.tojeong.modernShown, true, '승인한 괘는 공개 모드에서 현대어 보임');
  assert.ok(texts(r.body.reading).some(t => t.includes('검수자가 고친 핵심 한 줄')), '관리자 수정이 풀이에 반영');
  // 승인 뒤 다시 고치면 초안으로 돌아감
  A = await admCall('GET', '?year=2027');
  await admCall('POST', '', { action: 'modern', gua: g0, edits: { theme: '다시 고친 핵심' }, rev: A.body.rev });
  assert.equal((await admCall('GET', '?gua=' + g0)).body.status, 'draft', '승인 뒤 수정 → 다시 검수');
  A = await admCall('GET', '?year=2027');
  await admCall('POST', '', { action: 'modern', gua: g0, status: 'reviewed', rev: A.body.rev });
  assert.ok((await admCall('GET', '?year=2027')).body.history.length >= 4, '변경 이력');
  // 공개 설정 저장(관리자 API)
  P = await admCall('POST', '', { action: 'config', year: 2027, visibility: 'closed', teaser: ['open', 'total.core'], intro: '관리자 소개 문구' });
  assert.equal(P.body.config.intro, '관리자 소개 문구');
  r = await call({ authorization: 'Bearer adm' }); assert.equal(r.body.intro, '관리자 소개 문구');

  // 5) free: 누구나 전체
  setCfg('free');
  r = await call(); assert.equal(r.body.access.state, 'open'); assert.equal(r.body.access.reason, 'free');

  // 6) paid: 비회원 → 맛보기(잠긴 장은 본문 없음), 서버가 유료 문구를 보내지 않는다
  setCfg('paid'); setPrice(19800);
  r = await call();
  assert.equal(r.body.access.state, 'teaser'); assert.equal(r.body.access.reason, 'login');
  const full = (await call({ authorization: 'Bearer adm' })).body.reading;
  const tz = r.body.reading;
  assert.ok(tz.teaser);
  assert.ok(tz.chapters.find(c => c.id === 'open').paras.length > 0, '여는 장은 보임');
  const tTotal = tz.chapters.find(c => c.id === 'total');
  assert.deepEqual(tTotal.sections.map(s => s.id), ['core'], '총운은 핵심 흐름만');
  for (const id of ['wealth', 'career', 'love', 'health', 'peak', 'action']) { const c = tz.chapters.find(x => x.id === id); assert.ok(c.locked && !c.paras, id + ' 잠김'); }
  assert.ok(tz.chapters.find(c => c.id === 'months').months.every(m => m.locked && !m.paras), '12개월 잠김(제목·기간만)');
  const paidSentence = full.chapters.find(c => c.id === 'wealth').paras.find(p => p.role === 'advice').text;
  assert.ok(!bodyText(r).includes(paidSentence), '맛보기 응답에 유료 문장 없음');
  assert.equal(r.body.product.id, 'tj2027'); assert.equal(r.body.product.price, 19800); assert.equal(r.body.product.onSale, true);

  // 7) 회원이지만 구매 전 → purchase
  r = await call({ 'x-member-token': 'tok-a' });
  assert.equal(r.body.access.state, 'teaser'); assert.equal(r.body.access.reason, 'purchase');

  // 8) 사주 식별값: 서버 계산 = 화면 sd 규칙(_commerce.sajuKey)
  const M = globalThis.Manse, ch = M.compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, calendar: 'solar' });
  const sd = { pillars: { year: { hanja: M.gzName(ch.pillars.year) }, month: { hanja: M.gzName(ch.pillars.month) }, day: { hanja: M.gzName(ch.pillars.day) }, hour: { hanja: M.gzName(ch.pillars.hour) } }, gender: 'M' };
  const key = await C.sajuKey(sd);
  assert.equal(await NYG.sajuKeyOfBirth(M, birth), key);

  // 9) 구매 권한(tj2027) 있으면 전체 + 첫 열람 기록(환불 판단)
  ents.push({ user_id: USERS['tok-a'].id, saju_key: key, world: 'tj2027', order_id: 'mtx1' });
  r = await call({ 'x-member-token': 'tok-a' });
  assert.equal(r.body.access.state, 'open'); assert.equal(r.body.access.reason, 'owned');
  assert.ok(bodyText(r).includes(paidSentence));
  assert.ok(patches.some(u => /world=eq\.tj2027/.test(u) && /first_viewed_at=is\.null/.test(u)), '첫 열람 시각 기록');
  // 반복 열람: 같은 해 다시 열어도 열림
  r = await call({ 'x-member-token': 'tok-a' }); assert.equal(r.body.access.state, 'open');
  // 다른 사주로는 열리지 않음(권한은 회원 × 사주)
  r = await call({ 'x-member-token': 'tok-a' }, { birth: { ...birth, day: 16 }, year: 2027 });
  assert.equal(r.body.access.reason, 'purchase');
  // 무빙툰 세계 권한(w1)만 있는 사주는 신년운세가 열리지 않음
  ents.push({ user_id: USERS['tok-a'].id, saju_key: 'sj_other', world: 'w1', order_id: 'mtx2' });
  // 관리자 '무료 사용자로 보기'
  r = await call({ authorization: 'Bearer adm', 'x-view-as': 'free' }); assert.equal(r.body.access.state, 'teaser');

  // 10) 상품: 연도 상품은 묶음에 들지 않고, 주문 시 tj2027 하나만 연다
  const prods = await C.loadProducts(env), tj = prods.find(p => p.id === 'tj2027'), bundle = prods.find(p => p.id === 'bundle');
  assert.equal(tj.kind, 'annual'); assert.deepEqual(await C.productWorlds(env, tj), ['tj2027']);
  assert.ok(!(await C.productWorlds(env, bundle)).includes('tj2027'), '전체 열기 묶음에 신년운세 없음');
  // 상품 정보 API: 무빙툰 구매 목록(products)에는 없고 annual 로 따로
  const ar = await accessApi.onRequestPost({ request: new Request('https://x.test/api/commerce/access', { method: 'POST', body: JSON.stringify({ sd: null }) }), env });
  const ad = await ar.json();
  assert.ok(!ad.products.some(p => p.id === 'tj2027')); assert.ok(ad.annual.some(p => p.id === 'tj2027' && p.price === 19800));
  // 가격 0 = 판매 안 함
  setPrice(0);
  r = await call(); assert.equal(r.body.product.onSale, false);

  // 11) 설정 정리(cleanNewyearConfig): 이상한 값은 버린다
  const cl = NYG.cleanNewyearConfig({ years: { 2027: { visibility: 'open-all', teaser: ['open', 'x;drop'], intro: 'a'.repeat(900) }, abc: { visibility: 'free' } } });
  assert.equal(cl.years[2027].visibility, 'closed'); assert.deepEqual(cl.years[2027].teaser, ['open']); assert.equal(cl.years[2027].intro.length, 600); assert.ok(!cl.years.abc);

  console.log('newyear-api-sim ok: 서버 엔진 로드·관리자 검수(수정·승인·금지 표현·rev 충돌·이력)·closed/free/paid·맛보기 비노출·회원×사주 권한·첫 열람 기록·연도 상품 분리');
})().catch(e => { console.error(e); process.exit(1); });
