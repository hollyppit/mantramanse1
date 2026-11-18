// 시대 흐름(macro-era.js) · 시대↔개인(macro-era-bridge.js) · 장기 운세 요약(luck-cycle.js longSummary) 검증
//   node tests/macro-era-sim.cjs [사주 수=200]
//  · 삼원구운 9운 연도·구성·오행, 입춘 경계, 다음 정원(2044~), 지원 범위
//  · 시대 흐름은 출생 정보와 무관(모두 같음), 공간·명당 엔진 값과 일치, 오자원 등 연구 대기 이론은 결과를 내지 않음
//  · 같은 시대가 원국마다 다르게 해석(역할 기반), 상생·상극 관계만으로 결론을 정하지 않음, 시대 오행이 용신 판정을 바꾸지 않음
//  · 장기 운세 요약: 대운 3개를 시간 순서대로, 하나의 오행·하나의 길흉으로 묶지 않음, 엔진 값과 일치
//  · 엔진 결과(통합 용신·대운 점수)와 기존 30년 장기 분석 구간(daeunSpans) 불변
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'fengshui-data.js', 'fengshui-engine.js', 'luck-cycle.js', 'macro-era.js', 'macro-era-bridge.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, E = ctx.MantraMacroEra, B = ctx.MantraMacroBridge, LC = ctx.MantraLuckCycle, FE = ctx.MantraFengshui, N = +process.argv[2] || 200;
const J = x => JSON.stringify(x);

// 1) 삼원구운 표
const TABLE = [[1, 1864, '일백', 4], [2, 1884, '이흑', 2], [3, 1904, '삼벽', 0], [4, 1924, '사록', 0], [5, 1944, '오황', 2], [6, 1964, '육백', 3], [7, 1984, '칠적', 3], [8, 2004, '팔백', 2], [9, 2024, '구자', 1]];
for (const [p, start, star, el] of TABLE) {
  for (const y of [start, start + 10, start + 19]) { const r = E.eraAt(y); assert.equal(r.era.period, p, y + '년 운'); assert.equal(r.era.start, start); assert.equal(r.era.end, start + 19); assert.ok(r.era.star.startsWith(star), y + ' 구성'); assert.equal(r.era.el, el, y + ' 오행'); assert.equal(r.era.yuan, ['상원', '중원', '하원'][Math.floor((p - 1) / 3)]); }
}
assert.equal(E.eraAt(2044).era.period, 1); assert.equal(E.eraAt(2044).era.start, 2044); assert.equal(E.eraAt(2083).era.period, 2);
assert.equal(E.eraAt({ y: 2024, m: 2, d: 3 }).era.period, 8, '입춘 전은 8운'); assert.equal(E.eraAt({ y: 2024, m: 2, d: 4 }).era.period, 9, '입춘부터 9운');
assert.ok(E.eraAt({ y: 2024, m: 2, d: 4 }).boundaryWarn, '입춘 무렵 경계 안내');
assert.equal(E.eraAt(1850).supported, false); assert.equal(E.eraAt(2104).supported, false);
for (let y = 1864; y <= 2103; y++) assert.equal(E.eraAt(y).era.period, FE.periodOfYear(y), '공간·명당 엔진과 같은 운 ' + y);
assert.equal(J(E.timeline(1984, 2063).map(e => e.period)), J([7, 8, 9, 1]), '시간축');
// 연구 대기 이론은 결과 없이 목록에만
const r26 = E.eraAt(2026); assert.ok(r26.research.some(x => x.id === 'ojawon')); assert.equal(r26.theory, 'sanyuan'); assert.equal(E.THEORIES.ojawon.status, 'research');

// 2) 개인 다리 + 장기 요약
const T = Date.UTC(2026, 10, 18, 3), sides = {}, natalTexts = new Set(), eraKeys = new Set();
let n = 0, relOnlyChecked = 0;
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' };
  let ch; try { ch = M.compute(inp); } catch (e) { continue; } n++;
  const before = J({ u: ch.unified && ch.unified.roles, uy: ch.unified && ch.unified.yong, d: ch.daeun.list.map(x => x.ev && x.ev.fitScore) }), spansBefore = J(LC.daeunSpans(M, ch, { year: 2026 }));
  const r = B.analyze(M, ch, T);
  assert.ok(r.supported);
  eraKeys.add(J(r.era.era));   // 모두에게 같은 시대
  assert.equal(r.natal.el, r.era.era.el);
  assert.equal(r.natal.role, (ch.unified.roles[r.natal.el] || '중립'), '역할은 통합 용신 엔진 그대로');
  sides[r.natal.side] = (sides[r.natal.side] || 0) + 1; natalTexts.add(r.natal.text);
  // 판정은 역할에서: 같은 관계라도 대운 오행 역할이 좋으면 good, 나쁘면 bad
  if (r.daeun) { const role = ch.unified.roles[r.daeun.stemEl]; const exp = role === '용신' || role === '희신' ? 'good' : role === '기신' || role === '구신' ? 'bad' : 'mid'; assert.equal(r.daeun.side, exp, '대운 판정은 대운 오행의 역할 기준'); relOnlyChecked++; }
  [r.natal.text, r.daeun && r.daeun.text, r.seun && r.seun.text, r.action, ...r.domains].filter(Boolean).forEach(t => assert.ok(!/반드시|무조건|100%|틀림없이|망한다|대박|undefined|NaN/.test(t), '금지 표현 ' + t));
  // 엔진·기존 30년 분석 불변
  assert.equal(J({ u: ch.unified && ch.unified.roles, uy: ch.unified && ch.unified.yong, d: ch.daeun.list.map(x => x.ev && x.ev.fitScore) }), before, '엔진 결과 불변');
  assert.equal(J(LC.daeunSpans(M, ch, { year: 2026 })), spansBefore, 'daeunSpans 불변');
  // 장기 운세 요약
  const ls = LC.longSummary(M, ch, { ms: T });
  assert.ok(ls && ls.rows.length === Math.min(3, ch.daeun.list.length));
  assert.equal(ls.shifts.length, ls.rows.length - 1);
  ls.rows.forEach((row, k) => { const x = ch.daeun.list[row.i]; assert.equal(row.gz, M.STEM[x.s] + M.BR[x.b]); assert.equal(row.fit, Math.round(x.ev.fitScore)); if (k) assert.equal(row.i, ls.rows[k - 1].i + 1, '시간 순서'); });
  assert.ok(!('tone' in ls) && !('mainEl' in ls) && !('score' in ls), '세 대운을 하나의 오행·점수로 묶지 않음');
  assert.ok(ls.rows.some(row => row.tense === 'now') || ls.rows[0].i > 0 || ch.daeun.list[0].startMs > T, '지금 대운 포함');
}
assert.equal(eraKeys.size, 1, '시대 흐름은 모두에게 같음');
assert.ok(Object.keys(sides).length >= 3, '같은 시대가 원국에 따라 다르게 판정 ' + J(sides));
assert.ok(natalTexts.size >= 4, '해석 문장이 사람마다 다름');
console.log(`macro-era-sim ok · 사주 ${n}명 · 2026년 시대 ${E.eraAt(2026).era.period}운 ${E.eraAt(2026).era.elK} · 원국 판정 ${J(sides)} · 대운 판정 역할 기준 ${relOnlyChecked}건 · 엔진·daeunSpans 불변`);
