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
assert.ok(/'\/luck-layers-view\.js'/.test(hub) && /lvHtml\(it, lvl, /.test(hub) && /graph \+ spanHtml\(\) \+ body \+ eraHtml\(\)/.test(hub), '타임라인 연결');
// 2026-11-18 읽기 쉽게: 시기 카드의 구조·①~④는 '더 깊이 보기' 하나로, 자미두수 막대·2년 전략은 접는 상자로, 시대 흐름은 짧게(compact)
assert.ok(/tq-fold tq-lvf/.test(hub) && /10년·해마다 자미두수 흐름 보기/.test(hub) && hub.includes('qkHtml(it, lvl, cp)') && /'2년 흐름'/.test(hub) && /compact: true/.test(hub), '타임라인 접는 상자');
{ const ch0 = M.compute({ year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'F' }), eh = V.era(M, ch0, Date.now(), { flags: ALL, compact: true }); assert.ok(/lv-more/.test(eh) && /나의 위치|용신|기운/.test(strip(eh)), '시대 흐름 짧게 보기'); }
assert.ok(/luck-layer-blocks\.js/.test(rd('report/v2/index.html')), '상세풀이 스크립트');
assert.ok(/R\.LuckLayerBlocks\.set\(window\.Manse, ch\)/.test(rd('report/v2/viewer.js')), 'viewer 가 사주를 넘김');
assert.ok(/R\.LuckLayerBlocks\.html\(c,esc\)/.test(rd('report/v2/reading-text.js')), '본문 연결');
for (const f of ['luck-layers-view.js', 'report/v2/luck-layer-blocks.js']) assert.ok(!/fitScore\s*=|LUCK_CFG|evaluateLuck\(/.test(rd(f).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), f + ' 가 점수를 바꿈');
// 상하위 방향 칩은 겹쳐 보기 층 판정과 엇갈리지 않아야 함(2026-11-18 운영 확인에서 발견: 대운 庚辰 "조금 부담 쪽" vs 겹쳐 보기 "도움")
{ let mis = 0, rows = 0; for (let i = 0; i < 120; i++) { let ch; try { ch = M.compute({ year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' }); } catch (e) { continue; }
  const wo = M.wolun(ch, 2026)[9], L = V.layersOf(M, ch, wo, 'wolun'), ex = ctx.MantraLuckOverlay.explain(ctx.MantraLuckOverlay.compute(M, ch, L), L.length), tones = {}; ex.forEach(l => tones[l.level] = l.tone);
  ctx.MantraLuckEnv.hierarchy(M, ch, L, { tones }).rows.forEach(r => { rows++; const t = tones[r.level]; if (!(t === 'good' ? /good/.test(r.side) : t === 'bad' ? /bad/.test(r.side) : t === 'mixed' ? r.side === 'mixed' : r.side === 'mid')) mis++; }); }
  assert.equal(mis, 0, '상하위 방향과 겹쳐 보기 판정이 엇갈림 ' + mis + '/' + rows);
  assert.ok(/tones: tones/.test(rd('luck-layers-view.js')) && rd('index.html').includes('hierarchy(M, S.ch, L, { tones })'), '두 화면이 겹쳐 보기 판정을 넘김'); }
console.log(`luck-layer-blocks-sim ok · 사주 ${n}명 · 시기 카드 ${cards}장 · 장별 블록 ${J(has)} · 스위치 꺼짐 빈 값 · 엔진 불변 · 연결`);
// 2026-11-18 그림: 타임라인 시기 카드의 오행 겹쳐 보기 그림(접지 않고 바로) · 원국 아래 오행 흐름 그림
{ let nf = 0, fig = 0, n2 = 0; for (let i = 0; i < 80; i++) { let ch; try { ch = M.compute({ year: 1955 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' }); } catch (e) { continue; } n2++;
  const h = V.natalFlowFigure(M, ch, {}); if (/lv-npent/.test(h) && /생\(도와줌\)/.test(h) && !/undefined|NaN/.test(h)) nf++;
  const se = M.seunRange(ch, 2026, 2026)[0], f = V.overlayFigure(M, ch, se, 'seun', { flags: { luckOverlay: true } }); if (/lv-pent/.test(f) && /lv-brow/.test(f) && !/undefined|NaN|화\(火\)이 |토\(土\)이 |수\(水\)이 /.test(strip(f))) fig++;
  assert.equal(V.overlayFigure(M, ch, se, 'seun', { flags: {} }), '', '겹쳐 보기 스위치 꺼지면 그림 없음'); }
  assert.equal(nf, n2, '원국 오행 흐름 그림'); assert.equal(fig, n2, '겹쳐 보기 그림');
  const hub2 = rd('report/hub/hub-timeline.js'); assert.ok(/ovFig\(it, lvl\) \+ lvHtml/.test(hub2) && /natalFlowFigure/.test(hub2) && /noFigure: true/.test(hub2), '타임라인 그림 연결');
  console.log('그림 ok · 원국 오행 흐름 ' + nf + ' · 겹쳐 보기 ' + fig); }
// 2026-11-18 한눈에 보기(세운·대운·월운 카드 맨 위, 만세력 상세와 같은 줄)
{ const ch0 = M.compute({ year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'F' }), se = M.seunRange(ch0, 2026, 2026)[0];
  const q = strip(V.quick(M, ch0, se, 'seun', { flags: ALL, todo: '할 일', after: [['조심할 것', '주의']] }));
  assert.ok(/한눈에 보기/.test(q) && /핵심/.test(q) && /큰 운과/.test(q) && /바뀌는 점/.test(q) && q.indexOf('해 볼 것') < q.indexOf('조심할 것') && !/undefined|NaN/.test(q), '한눈에 보기 줄: ' + q);
  console.log('한눈에 보기 ok'); }
// 2026-11-18 일진 캘린더(hub-saju.js): 선택한 달(월운 막대를 누르면 그 월운)·선택한 날에 한눈에 보기 + 겹쳐 보기
{ const sj = rd('report/hub/hub-saju.js');
  assert.ok(/function lvBlock\(ch, x, kind, title, todo, id\)/.test(sj) && /LV\.quick\(/.test(sj) && /LV\.overlayFigure\(/.test(sj), '캘린더 블록');
  assert.ok(/picked=b\.dataset\.month/.test(sj) && /mc-lv-month/.test(sj) && /cal\.dayBlock\(/.test(sj), '월운 막대 선택·선택한 날 블록');
  assert.ok(/'\/luck-layers-view\.js'/.test(sj) && /if \(!V\) LVP = null/.test(sj), '캘린더 모듈 불러오기');
  // 월운 막대(그 달 절기 시작일의 해-달)로 찾은 월운이 1일이 든 월운과 다를 수 있음 → 막대 기준으로 찾는다
  const ch0 = M.compute({ year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'F' }), wl = M.wolun(ch0, 2026), sep = wl.filter(x => { const dt = new Date(x.startMs + 9 * 3600e3); return dt.getUTCFullYear() + '-' + (dt.getUTCMonth() + 1) === '2026-9'; })[0];
  assert.ok(sep && M.gzName(sep) === '丁酉', '9월 막대 = 丁酉 월운(백로)');
  console.log('캘린더 ok'); }
