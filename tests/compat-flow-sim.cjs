// 두 사람 운 흐름 겹쳐 보기(compat-flow.js) 검증:  node tests/compat-flow-sim.cjs [쌍 수=200]
//  ① 엔진 값 그대로: 곡선 점수 = seunRange(...).combined, 등급 = luck-grade flow()
//  ② 분류가 두 값의 관계와 일치(둘 다 좋음·둘 다 조심·한쪽 좋음 한쪽 조심), 교차 = 차이 부호가 바뀌는 해
//  ③ 대칭: 두 사람 순서를 바꾸면 분류·교차 수가 같음 ④ 결정론 ⑤ 태어나기 전 해는 비움 ⑥ 금지 표현(단정·궁합 길흉)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'luck-grade.js', 'compat-flow.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, LG = ctx.MantraLuckGrade, PF = ctx.MantraPairFlow;
const N = +process.argv[2] || 200;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
let seed = 20261126; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const opt = { calendar: 'solar', leap: false, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu', combinationMode: 'auto', climatePalaceMode: 'auto' };
const mk = (y, m, d, h, g) => M.compute(Object.assign({ year: y, month: m, day: d, hour: h, minute: 0, gender: g }, opt));
const charts = [];
while (charts.length < 80) { try { charts.push(mk(1945 + Math.floor(rnd() * 80), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), rnd() < 0.1 ? null : Math.floor(rnd() * 24), rnd() < 0.5 ? 'M' : 'F')); } catch (e) { } }
const BAN = /안 맞는|맞지 않는|상극|최악|나쁜 사람|원수|헤어|이별|반드시|확률|성공률|피해야|궁합이 좋|궁합이 나쁘|NaN|undefined|null/;
const stats = { both: 0, split: 0, care: 0, diverge: 0, cross: 0, yrs: 0 };
const curY = 2026;
for (let k = 0; k < N; k++) {
  const A = charts[Math.floor(rnd() * charts.length)], B = charts[Math.floor(rnd() * charts.length)];
  const span = k % 2 ? 25 : 10, o = { from: curY - 5, to: curY + span, names: { a: '나', b: '가람' }, LG };
  const D = PF.build(M, A, B, o), D2 = PF.build(M, A, B, o), R = PF.build(M, B, A, { from: o.from, to: o.to, names: { a: '가람', b: '나' }, LG });
  ok(JSON.stringify(D) === JSON.stringify(D2), `결정론 #${k}`);
  ok(D.rows.length === span + 6, `연도 수 #${k}`);
  D.rows.forEach((r, i) => {
    const Y = r.year;
    [['a', A], ['b', B]].forEach(([w, ch]) => {
      const p = r[w];
      if (Y < ch.solar.y) { ok(p === null, `태어나기 전 비움 #${k} ${Y}`); return; }
      const x = M.seunRange(ch, Y, Y)[0];
      ok(p && p.v === x.combined, `엔진 값 그대로 #${k} ${Y}`);
      ok(p && p.g === LG.flow(x.combined, M).k, `등급 그대로 #${k} ${Y}`);
      ok(p && p.age === Y - ch.solar.y, `나이 #${k}`);
    });
    if (r.a && r.b) {
      const exp = r.a.g === 'good' && r.b.g === 'good' ? 'both' : r.a.g === 'care' && r.b.g === 'care' ? 'care' : [r.a.g, r.b.g].sort().join() === 'care,good' ? 'split' : 'mixed';
      ok(r.kind === exp, `분류 #${k} ${Y}`);
      ok(R.rows[i].kind === r.kind && R.rows[i].move === r.move, `대칭 분류 #${k} ${Y}`);
      stats.yrs++; if (r.kind === 'both') stats.both++; if (r.kind === 'split') stats.split++; if (r.kind === 'care') stats.care++; if (r.move) stats.diverge++;
      ok(!BAN.test(PF.yearLine(r, D.names)), `금지 표현(연도) #${k}: ${PF.yearLine(r, D.names)}`);
    } else ok(r.kind === null, `한쪽 없음 분류 #${k}`);
  });
  ok(R.crosses.length === D.crosses.length, `대칭 교차 #${k}`);
  let cx = 0; for (let i = 1; i < D.rows.length; i++) { const p = D.rows[i - 1], q = D.rows[i]; if (p.a && p.b && q.a && q.b) { const d0 = p.a.v - p.b.v, d1 = q.a.v - q.b.v; if (d0 && d1 && (d0 > 0) !== (d1 > 0)) cx++; } }
  ok(cx === D.crosses.length, `교차 수 #${k}`);
  D.crosses.forEach(c => ok(c.x >= D.from && c.x <= D.to && Number.isFinite(c.x), `교차 위치 #${k}`));
  stats.cross += D.crosses.length;
  const txt = JSON.stringify(D.lines);
  ok(D.lines.length >= 1 && !BAN.test(txt), `금지 표현(요약) #${k}: ${txt}`);
}
// 경계: 태어나기 전 기간만 → 비교 없음
{ const late = mk(2030, 3, 3, 12, 'F'), D = PF.build(M, charts[0], late, { from: 2021, to: 2029, names: { a: '나', b: '아이' }, LG });
  ok(D.rows.every(r => r.b === null && r.kind === null), '태어나기 전 기간'); ok(!BAN.test(JSON.stringify(D.lines)), '빈 기간 문구'); }
// 여러 명(3~6명): 엔진 값 그대로 · 분류·맨 위 사람 · 순서를 바꿔도 해마다 인원 수 같음 · 금지 표현
const gs = { many: 0, split: 0, care: 0, yrs: 0, tops: 0 };
for (let k = 0; k < 120; k++) {
  const size = 3 + (k % 4), idx = []; while (idx.length < size) { const i = Math.floor(rnd() * charts.length); if (!idx.includes(i)) idx.push(i); }
  const mem = idx.map((i, j) => ({ name: ['가람', '나래', '다온', '라희', '마루', '바다'][j], ch: charts[i] }));
  const o = { from: curY - 5, to: curY + 10, LG }, D = PF.buildGroup(M, mem, o), Rv = PF.buildGroup(M, mem.slice().reverse(), o);
  ok(JSON.stringify(D) === JSON.stringify(PF.buildGroup(M, mem, o)), `무리 결정론 #${k}`);
  D.rows.forEach((r, i) => {
    r.vals.forEach((p, j) => { const ch = mem[j].ch; if (r.year < ch.solar.y) ok(p === null, `무리 태어나기 전 #${k}`); else { const x = M.seunRange(ch, r.year, r.year)[0]; ok(p && p.v === x.combined && p.g === LG.flow(x.combined, M).k, `무리 엔진 값 #${k} ${r.year}`); } });
    const ps = r.vals.filter(Boolean), c = { good: 0, ok: 0, care: 0 }; ps.forEach(p => c[p.g]++);
    ok(r.n === ps.length && r.good === c.good && r.care === c.care && r.ok === c.ok, `무리 인원 #${k}`);
    const half = Math.ceil(ps.length / 2), exp = ps.length < 2 ? null : c.good >= half && !c.care ? 'many' : c.care >= half && !c.good ? 'care' : c.good && c.care ? 'split' : 'mixed';
    ok(r.kind === exp, `무리 분류 #${k} ${r.year}`);
    ok(Rv.rows[i].kind === r.kind && Rv.rows[i].good === r.good, `무리 순서 바꿈 #${k}`);
    if (r.top >= 0) ok(ps.every(p => p.v <= r.vals[r.top].v), `맨 위 사람 #${k}`);
    if (r.n >= 2) { gs.yrs++; if (r.kind === 'many') gs.many++; if (r.kind === 'split') gs.split++; if (r.kind === 'care') gs.care++; }
    ok(!BAN.test(PF.groupYearLine(r, D.names)), `무리 금지 표현(연도) #${k}`);
  });
  gs.tops += D.topChanges.length;
  ok(D.lines.length >= 1 && !BAN.test(JSON.stringify(D.lines)), `무리 금지 표현 #${k}: ${JSON.stringify(D.lines)}`);
}
console.log(`무리 120개 · 비교 연도 ${gs.yrs} · 절반 넘게 좋음 ${(gs.many / gs.yrs * 100).toFixed(1)}% · 섞임 ${(gs.split / gs.yrs * 100).toFixed(1)}% · 절반 넘게 조심 ${(gs.care / gs.yrs * 100).toFixed(1)}% · 무리당 맨 위 바뀜 ${(gs.tops / 120).toFixed(2)}번`);
console.log(`쌍 ${N}개 · 비교 연도 ${stats.yrs} · 함께 좋음 ${(stats.both / stats.yrs * 100).toFixed(1)}% · 한쪽 좋음·한쪽 조심 ${(stats.split / stats.yrs * 100).toFixed(1)}% · 함께 조심 ${(stats.care / stats.yrs * 100).toFixed(1)}% · 방향 엇갈림 ${(stats.diverge / stats.yrs * 100).toFixed(1)}% · 쌍당 교차 ${(stats.cross / N).toFixed(2)}번`);
if (fails.length) { console.log('실패 ' + fails.length + '건'); console.log(fails.slice(0, 15).join('\n')); process.exit(1); }
console.log('compat-flow-sim: 모두 통과');
