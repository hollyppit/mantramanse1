// 운 분석 층을 운명의 타임라인·주제별 상세풀이에 붙인 것 검증 — node tests/luck-layer-blocks-sim.cjs [사주 수=150]
//  · luck-layers-view.js: 시기 카드(대운·세운·월운) ①~④ 칸 · 스위치 꺼지면 지장간 줄만 · 시대 흐름 상자
//  · report/v2/luck-layer-blocks.js: 장마다 블록 · 스위치 꺼지면 빈 값 · 다른 장에는 안 붙음 · 빈 값·금지 표현 없음 · 엔진 점수 불변
//  · 화면 연결: 타임라인(hub-timeline.js)·상세풀이(index.html·viewer·reading-text)
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 150, J = JSON.stringify;
const ctx = { console, Promise, Date, Math, JSON, Object, Array, String, Number, RegExp }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'fengshui-data.js', 'fengshui-engine.js', 'luck-overlay.js', 'ten-god-roles.js', 'luck-env.js', 'macro-era.js', 'macro-era-bridge.js', 'luck-layers-view.js', 'report/v2/luck-layer-blocks.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, V = ctx.MantraLuckView, B = ctx.ReportV2.LuckLayerBlocks;
const ALL = { luckEnv: true, luckOverlay: true, tenGodRoles: true, macroEra: true };
const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const BAN = /반드시|무조건|100% (확실|보장)|틀림없이|망한다|대박|대길|대흉|undefined|NaN|\[object|null/;
const IDS = Object.keys(B.MAP);
const has = {}; IDS.forEach(id => has[id] = 0);
let n = 0, cards = 0;
for (let i = 0; i < N; i++) {
  const inp = { year: 1955 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' };
  let ch; try { ch = M.compute(inp); } catch (e) { continue; } n++;
  const snap = J(ch.daeun.list.map(x => x.ev.fitScore));
  // 타임라인 시기 카드
  const T = Date.now(), du = M.daeunAt(ch, T), y = new Date(T + 9 * 3600e3).getUTCFullYear(), se = M.seunRange(ch, y, y)[0], wo = M.wolun(ch, y)[3];
  for (const [x, k] of [[du, 'daeun'], [se, 'seun'], [wo, 'wolun']]) {
    if (!x) continue;
    const h = V.card(M, ch, x, k, { flags: ALL }); cards++;
    assert.ok(/① 외부 환경/.test(h) && /② 내 사주/.test(h) && /lv-hid/.test(h), k + ' 카드 칸');
    if (k !== 'daeun') assert.ok(/③ 상위 운과 하위 운/.test(h), k + ' 상하위 칸');
    assert.ok(!BAN.test(strip(h)), k + ' 카드 금지·빈 값: ' + (strip(h).match(BAN) || [])[0]);
    const off = V.card(M, ch, x, k, { flags: {} });
    assert.ok(/lv-hid/.test(off) && !/lv-sec/.test(off), '스위치 꺼지면 지장간 줄만');
  }
  const eh = V.era(M, ch, T, { flags: ALL }); assert.ok(/9운|1운/.test(strip(eh)) && !BAN.test(strip(eh)), '시대 흐름 상자');
  assert.equal(V.era(M, ch, T, { flags: {} }), '', '시대 흐름 스위치 꺼짐');
  // 상세풀이 블록
  B._force({}); B.set(M, ch);
  IDS.forEach(id => assert.equal(B.html({ id }), '', '스위치 꺼지면 빈 블록 ' + id));
  B._force(ALL);
  IDS.forEach(id => { const h = B.html({ id }); if (h) { has[id]++; assert.ok(!BAN.test(strip(h)), id + ' 금지·빈 값: ' + strip(h).slice(0, 200)); } });
  assert.equal(B.html({ id: 'timeline_self_18' }), '', '다른 장에 블록이 붙음');
  assert.equal(J(ch.daeun.list.map(x => x.ev.fitScore)), snap, '엔진 점수 불변');
}
IDS.forEach(id => assert.ok(has[id] >= n * (id === 'timeline_self_24' ? 0.8 : 0.9), `블록이 너무 적음 ${id} ${has[id]}/${n}`));

// 화면 연결
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const hub = rd('report/hub/hub-timeline.js');
assert.ok(/'\/luck-layers-view\.js'/.test(hub) && /lvHtml\(it, lvl\)/.test(hub) && /eraHtml\(\) \+ lifeHtml\(\)/.test(hub) && /graph \+ spanHtml\(\) \+ body/.test(hub), '타임라인 연결');
assert.ok(/luck-layer-blocks\.js/.test(rd('report/v2/index.html')), '상세풀이 스크립트');
assert.ok(/R\.LuckLayerBlocks\.set\(window\.Manse, ch\)/.test(rd('report/v2/viewer.js')), 'viewer 가 사주를 넘김');
assert.ok(/R\.LuckLayerBlocks\.html\(c,esc\)/.test(rd('report/v2/reading-text.js')), '본문 연결');
for (const f of ['luck-layers-view.js', 'report/v2/luck-layer-blocks.js']) assert.ok(!/fitScore\s*=|LUCK_CFG|evaluateLuck\(/.test(rd(f).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), f + ' 가 점수를 바꿈');
console.log(`luck-layer-blocks-sim ok · 사주 ${n}명 · 시기 카드 ${cards}장 · 장별 블록 ${J(has)} · 스위치 꺼짐 빈 값 · 엔진 불변 · 연결`);
