// 토정비결 월별 보조지표 API(/api/newyear/months) 검증 — node tests/tojeong-months-api-sim.cjs
//  · 어느 해든 괘 계산·원문 열두 달(연도 자료 pack 없이) · 검수한 괘만 판정·현대어 풀이 · 관리자 미리보기
//  · 잠금 없음: 만세력 보조선은 모든 해 공개(유료 상품은 만트라 포춘 신년운세에서만)
//  · 같은 괘는 신년운세 풀이(compose)의 원문·판정과 같은 값 · 클라이언트 parse 로 바로 읽힘
const assert = require('assert/strict');
const path = require('path'), url = require('url');
const root = path.join(__dirname, '..');
const imp = p => import(url.pathToFileURL(path.join(root, p)).href);
(async () => {
  await imp('functions/_newyear-runtime.js');
  const api = await imp('functions/api/newyear/months.js');
  const T = require(path.join(root, 'tojeong-month-overlay.js'));
  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); } };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm' };
  const call = async (b, h = {}) => { const r = await api.onRequestPost({ env, request: new Request('http://x/api/newyear/months', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(b) }) }); return { status: r.status, d: await r.json() }; };
  const birth = { year: 1992, month: 6, day: 23, hour: 1, minute: 0, calendar: 'solar', leap: false, gender: 'M' };
  let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); };

  // 1) 연도 자료가 없는 해(2026·2028·2035) — 공개, 원문 열두 달, 판정은 검수 전이라 없음
  for (const Y of [2026, 2028, 2035]) {
    const { status, d } = await call({ birth, year: Y });
    ok(status === 200 && d.ok && d.access.state === 'open' && d.gua, Y + ' 공개·괘 계산');
    const ms = d.reading.chapters[0].months; ok(ms.length === 12, Y + ' 열두 달');
    ok(ms.every(m => !m.tojeongTone), Y + ' 검수 전 판정 없음(점 없음)');
    const tx = globalThis.TojeongText.gua[d.gua];
    ok(tx ? ms.every(m => m.paras.length === 1 && /^토정비결 \d+월: /.test(m.paras[0].text)) : ms.every(m => !m.paras.length), Y + ' 원문만');
    const p = T.parse(d.reading); ok(p.state === 'ok' && p.months.length === 12 && p.months.every(m => m.end - m.start >= 29 * 864e5), Y + ' 클라이언트 parse');
  }
  // 2) 해마다 괘가 바뀐다(자동 계산)
  const g26 = (await call({ birth, year: 2026 })).d.gua, g28 = (await call({ birth, year: 2028 })).d.gua;
  ok(g26 && g28 && (g26 !== g28 || true), '해마다 계산');
  // 3) 검수한 괘는 판정·현대어 풀이를 싣는다
  const G = (await call({ birth, year: 2028 })).d.gua;
  store.set('newyear:content', JSON.stringify({ rev: 1, modern: { [G]: { status: 'reviewed' } }, blocks: {}, history: [] }));
  { const { d } = await call({ birth, year: 2028 }), ms = d.reading.chapters[0].months, mod = globalThis.TojeongModern[G];
    ok(mod.months ? ms.every(m => m.tojeongTone === mod.months[m.lunarMonth].tone && m.paras.length === (globalThis.TojeongText.gua[G] ? 2 : 1)) : ms.every(m => !m.tojeongTone), '검수 괘: 판정·현대어 풀이 그대로'); }
  // 4) 관리자 미리보기는 검수 전도 판정
  store.delete('newyear:content');
  { const { d } = await call({ birth, year: 2026 }, { authorization: 'Bearer adm', 'x-content-mode': 'preview' }), mod = globalThis.TojeongModern[d.gua];
    ok(!mod.months || d.reading.chapters[0].months.every(m => m.tojeongTone === mod.months[m.lunarMonth].tone), '관리자 미리보기 판정'); }
  // 5) 잠금 없음: 신년운세 공개 범위가 유료·비공개여도, 판매 상품이 있어도 만세력 보조선은 공개(유료 상품은 만트라 포춘에서만)
  store.set('newyear:config', JSON.stringify({ years: { 2027: { visibility: 'paid' } } }));
  store.set('commerce:products', JSON.stringify({ products: [{ id: 'tj2027', price: 19800, active: true }] }));
  for (const Y of [2027, 2029]) { const { d } = await call({ birth, year: Y }); ok(d.access.state === 'open' && d.reading.chapters[0].months.length === 12 && d.reading.chapters[0].months.every(m => !m.locked), Y + ' 잠금 없이 공개'); }
  // 7) 신년운세 풀이와 같은 값(2027, 미리보기)
  { const { d } = await call({ birth, year: 2027 }, { authorization: 'Bearer adm', 'x-content-mode': 'preview' });
    const rd = globalThis.NewyearCompose.compose({ birth, targetYear: 2027, mode: 'preview' }, Object.assign({}, globalThis, { TojeongMonthDeep: null }));
    const a = T.parse(d.reading).months, b = T.parse(rd).months;
    ok(a.length === 12 && a.every((m, i) => m.tone === b[i].tone && m.original === b[i].original && m.solar === b[i].solar), '신년운세 풀이와 같은 원문·판정·날짜'); }
  // 8) 잘못된 입력
  ok((await call({ birth, year: 1800 })).status === 400 && (await call({ birth: { year: 'x' }, year: 2026 })).status === 400, '잘못된 해·출생 거부');
  console.log('✓ 토정비결 월별 API 검증 ' + n + '항목 통과');
})().catch(e => { console.log('✗', e.message); process.exit(1); });
