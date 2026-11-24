// 운명의 타임라인·캘린더 계산 근거 숨김(2026-11-24, 상세풀이는 그대로) — node tests/timeline-secret-sim.cjs
//  · 타임라인(secret)에서는 세력 계산 공식·층 무게·충형 배수(×)·소수점 변화량·점수 성분표·영향 비중이 안 보인다
//  · 충형합해 이름·월령은 남는다 · secret 이 없으면(만세력 등) 예전 그대로
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console, Promise, Date, Math, JSON, Object, Array, String, Number, RegExp }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'luck-overlay.js', 'ten-god-roles.js', 'luck-env.js', 'luck-layers-view.js', 'report/v2/luck6.js', 'report/v2/timeline.js']) {
  try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); } catch (e) { if (!/luck6/.test(f)) throw e; }
}
const M = ctx.Manse, V = ctx.MantraLuckView, TL = ctx.ReportV2 && ctx.ReportV2.Timeline;
const ALL = { luckEnv: true, luckOverlay: true, tenGodRoles: true };
const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const LEAK = /세력 계산|층 무게|몫 ×|×\d|영향 비중|반영 비중|기여|성분 점수|변동성 \d|돕는 힘 \d|<small class="lv-d/;
let n = 0, wol = 0, rel = 0, plain = 0, ev = 0;
for (let i = 0; i < 120; i++) {
  const inp = { year: 1955 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' };
  let ch; try { ch = M.compute(inp); } catch (e) { continue; } n++;
  const T = Date.now(), du = M.daeunAt(ch, T), y = new Date(T + 9 * 3600e3).getUTCFullYear(), se = M.seunRange(ch, y, y)[0], wo = M.wolun(ch, y)[3];
  for (const [x, k] of [[du, 'daeun'], [se, 'seun'], [wo, 'wolun']]) {
    if (!x) continue;
    const o = { flags: ALL, secret: true };
    const h = V.card(M, ch, x, k, o) + V.overlayFigure(M, ch, x, k, o) + V.quick(M, ch, x, k, o);
    const m = (h.match(LEAK) || [])[0]; assert.ok(!m, k + ' 타임라인에 계산 근거: ' + m);
    if (/월령/.test(strip(h))) wol++;
    if (/[충형합파해]/.test(strip(h))) rel++;
    const open = V.overlayFigure(M, ch, x, k, { flags: ALL });
    if (/세력 계산/.test(open)) plain++;
  }
}
// 근거 상자(report/v2/timeline.js evidenceHtml secret)
if (TL && TL.evidenceHtml) {
  const e = { title: '2026년 丙午', tg: { label: '편재', meaning: '큰돈', line: '천간 편재 · 지지 정재' }, overlays: { volatility: true }, scores: { volatility: 63 }, natal: { day: '甲子', zone: '신약', help: 38, yong: '수', hee: '금', log: ['억부 37'] }, chain: [{ name: '대운', ganzhi: '己酉', weight: 40 }, { name: '세운', ganzhi: '丙午', weight: 60 }], own: 10, fit: -20, comps: [{ name: '용신', score: -30, weight: 50, contrib: -15 }], parts: [{ label: '午午 자형 — x', v: -4 }], relInfo: [{ text: '세운 午 — 일지 子 충', use: 'score' }, { text: '午午 자형', use: 'volat' }], relations: ['세운 午 — 일지 子 충', '午午 자형'], triggers: ['午午 자형'] };
  const s = TL.evidenceHtml(e, { secret: true }), full = TL.evidenceHtml(e);
  assert.ok(!LEAK.test(s) && !/40%|60%|-15|38%/.test(s), '근거 상자 secret: 비중·성분 없음');
  assert.ok(/충/.test(s) && /자형/.test(s) && /편재/.test(s) && /용신 수/.test(s), '근거 상자 secret: 십신·충형·용신은 남음');
  assert.ok(/영향 비중/.test(full) && /성분/.test(full), 'secret 없으면 예전 근거 그대로');
  ev++;
}
// 화면 연결
const hub = fs.readFileSync(path.join(root, 'report/hub/hub-timeline.js'), 'utf8');
assert.ok(/evidenceHtml\(TL\.evidence\(M, ch, it\), \{ secret: true \}\)/.test(hub), '타임라인 근거 상자 secret');
assert.equal((hub.match(/secret: true, weights/g) || []).length, 3, '타임라인 LV 호출 3곳 secret');
assert.ok(!/운의 세기 ' \+ it\.scores/.test(hub), '타임라인 카드 점수 줄(흐름 점수·운의 세기·변화 신호) 숨김');
const cal = fs.readFileSync(path.join(root, 'report/hub/hub-saju.js'), 'utf8');
assert.equal((cal.match(/secret: true, weights/g) || []).length, 2, '캘린더 월운·일진 LV 호출 2곳 secret');
assert.ok(/luck-layers-view|'?v=20261124-sec'/.test(cal) && cal.includes("V = '?v=20261124-sec'"), '캘린더가 새 luck-layers-view 를 받음');
const v2 = ['report/v2/luck-layer-blocks.js', 'report/v2/viewer.js', 'report/v2/pdf.js'].map(p => fs.readFileSync(path.join(root, p), 'utf8')).join('');
assert.ok(!/secret/.test(v2), '상세풀이는 계산 근거 그대로(secret 없음)');
assert.ok(/SAFE_BASIS/.test(hub), '2년·30년 판단 근거는 십성·용신 이름만');
assert.ok(wol > 0 && rel > 0 && plain > 0 && ev === 1, '월령·충형 남음, secret 없으면 공식 그대로');
console.log('timeline-secret-sim ok · 사주 ' + n + '명 · 월령 보임 ' + wol + ' · 합충형 보임 ' + rel + ' · 만세력 쪽 공식 그대로 ' + plain);
