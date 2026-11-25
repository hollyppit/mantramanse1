// 여러 명 궁합(무리 궁합) 검증:  node tests/compat-group-sim.cjs [무리 수=120]
//  ① 결정론: 같은 입력은 같은 결과 ② 대칭: 사람 순서를 바꿔도 쌍 점수·오행 균형·달별 평균이 같음
//  ③ 두 사람 궁합과 일치: 쌍 점수 = PairCompat.evaluate 총점(계산식을 바꾸지 않음)
//  ④ 빈 값·경계: 2명·7명·빈 배열·사주 없는 사람·이름 없음/겹침 ⑤ 금지 표현(단정·확률) ⑥ 분포(화살표·중재자·좋은 달 수가 지나치지 않음)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'compat-pair.js', 'luck-grade.js', 'luck-element-theme.js', 'compat-group.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, P = ctx.PairCompat, GC = ctx.GroupCompat;
const N = +process.argv[2] || 120;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
let seed = 20261125; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const opt = { calendar: 'solar', leap: false, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu', combinationMode: 'auto', climatePalaceMode: 'auto' };
const mk = (y, m, d, h, g) => M.compute(Object.assign({ year: y, month: m, day: d, hour: h, minute: 0, gender: g }, opt));
const charts = [];
while (charts.length < 60) { try { charts.push(mk(1945 + Math.floor(rnd() * 70), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), rnd() < 0.1 ? null : Math.floor(rnd() * 24), rnd() < 0.5 ? 'M' : 'F')); } catch (e) { } }
const NOW = Date.UTC(2026, 10, 25, 3);
const RELS = Object.keys(P.REL_TYPES);
const NAMES = ['가람', '나래', '다온', '라희', '마루', '바다'];
const BAN = /안 맞는|맞지 않는 사람|상극|최악|나쁜 사람|원수|헤어질|반드시|확률|성공률|피해야 할 사람|NaN|undefined|null/;
const textOf = r => JSON.stringify([r.summary, r.tips, r.arrows.map(a => [a.line, a.tip, a.label]), r.balance.lines, r.mediators.map(m => m.line), r.months && r.months.lines, r.pairs.map(p => p.bandName)]);
const stats = { arrows: [], kinds: {}, med: 0, medBy: 0, goodM: [], careM: [], lack: 0, over: 0, low: 0, ms: 0 };

const t0 = Date.now();
for (let k = 0; k < N; k++) {
  const size = 3 + (k % 4);
  const idx = []; while (idx.length < size) { const i = Math.floor(rnd() * charts.length); if (!idx.includes(i)) idx.push(i); }
  const rel = RELS[k % RELS.length];
  const mem = idx.map((i, j) => ({ id: 'p' + i, name: NAMES[j], ch: charts[i], me: j === 0 }));
  const t = Date.now();
  const r = GC.evaluate(M, mem, rel, { now: NOW });
  stats.ms = Math.max(stats.ms, Date.now() - t);
  ok(r.ok, `계산 실패 ${r.error}`); if (!r.ok) continue;
  ok(r.pairs.length === size * (size - 1) / 2, '쌍 수');
  // ① 결정론
  const r2 = GC.evaluate(M, mem, rel, { now: NOW });
  ok(JSON.stringify(r2, (k2, v) => typeof v === 'function' ? undefined : v) === JSON.stringify(r, (k2, v) => typeof v === 'function' ? undefined : v), '결정론');
  // ③ 두 사람 궁합과 같음
  r.pairs.forEach(p => { const q = P.evaluate(M, mem[p.a].ch, mem[p.b].ch, rel, { a: mem[p.a].name, b: mem[p.b].name }); ok(q.score === p.score, `쌍 점수 불일치 ${p.score}/${q.score}`); });
  // ② 순서 바꾸기(이름은 사람에 붙여 둔다)
  const perm = mem.slice().reverse();
  const rp = GC.evaluate(M, perm, rel, { now: NOW });
  const pairMap = rr => { const m = {}; rr.pairs.forEach(p => { const a = rr.people[p.a].name, b = rr.people[p.b].name; m[[a, b].sort().join('|')] = p.score; }); return m; };
  ok(JSON.stringify(Object.entries(pairMap(r)).sort()) === JSON.stringify(Object.entries(pairMap(rp)).sort()), '대칭: 쌍 점수');
  ok(JSON.stringify(r.balance.group) === JSON.stringify(rp.balance.group), '대칭: 오행 균형');
  ok(r.avg === rp.avg, '대칭: 평균');
  ok(JSON.stringify(r.months.rows.map(x => [x.mean, x.good, x.care])) === JSON.stringify(rp.months.rows.map(x => [x.mean, x.good, x.care])), '대칭: 달별');
  const arrSet = rr => rr.arrows.map(a => rr.people[a.from].name + '>' + rr.people[a.to].name + ':' + a.kind).sort().join(',');
  ok(arrSet(r) === arrSet(rp), '대칭: 화살표');
  const medSet = rr => rr.mediators.map(m => [rr.people[m.pair[0]].name, rr.people[m.pair[1]].name].sort().join('|') + '>' + (m.by >= 0 ? rr.people[m.by].name : '-')).sort().join(',');
  ok(medSet(r) === medSet(rp), '대칭: 중재자');
  // 값 범위
  ok(Math.abs(r.balance.group.reduce((s, v) => s + v, 0) - 100) < 1.5, `오행 합 ${r.balance.group.reduce((s, v) => s + v, 0)}`);
  ok(r.months && r.months.rows.length === 12, '12달');
  ok(r.months.rows.every(x => Number.isFinite(x.mean) && x.vals.length === size && x.el >= 0 && x.el <= 4), '달 값');
  r.mediators.forEach(m => { if (m.by >= 0) ok(m.by !== m.pair[0] && m.by !== m.pair[1], '중재자가 당사자'); });
  // ⑤ 금지 표현
  const txt = textOf(r); const bad = txt.match(BAN); ok(!bad, `금지 표현 '${bad && bad[0]}'`);
  // 통계
  stats.arrows.push(r.arrows.length / (size * (size - 1)));
  r.arrows.forEach(a => stats.kinds[a.kind] = (stats.kinds[a.kind] || 0) + 1);
  stats.med += r.mediators.length; stats.medBy += r.mediators.filter(m => m.by >= 0).length;
  stats.goodM.push(r.months.good.length); stats.careM.push(r.months.care.length);
  stats.lack += r.balance.lack.length ? 1 : 0; stats.over += r.balance.over.length ? 1 : 0; stats.low += r.low.length ? 1 : 0;
}
// ④ 빈 값·경계
const c3 = charts.slice(0, 3).map((ch, i) => ({ name: '', ch }));
ok(!GC.evaluate(M, [], 'lover').ok, '빈 배열');
ok(!GC.evaluate(M, c3.slice(0, 2), 'lover').ok, '2명');
ok(!GC.evaluate(M, charts.slice(0, 7).map(ch => ({ ch })), 'lover').ok, '7명');
ok(!GC.evaluate(M, [...c3.slice(0, 2), { name: 'x', ch: null }], 'lover').ok, '사주 없는 사람은 빼고 센다');
ok(!GC.evaluate(M, null, 'lover').ok && !GC.evaluate(null, c3, 'lover').ok, 'null 입력');
const rn = GC.evaluate(M, c3, 'nope', { now: NOW });
ok(rn.ok && rn.rel === 'lover', '모르는 관계 → 연인');
ok(new Set(rn.people.map(p => p.name)).size === 3 && rn.people.every(p => p.name), '빈 이름 채움');
const rd = GC.evaluate(M, charts.slice(0, 3).map(ch => ({ name: '민수', ch })), 'friend', { now: NOW });
ok(new Set(rd.people.map(p => p.name)).size === 3, '겹치는 이름 구분');
const same = GC.evaluate(M, [0, 0, 0].map((x, i) => ({ name: NAMES[i], ch: charts[5] })), 'family', { now: NOW });
ok(same.ok && same.pairs.every(p => p.score === same.pairs[0].score), '같은 사주 셋');
const fam = GC.evaluate(M, charts.slice(0, 4).map((ch, i) => ({ name: NAMES[i], ch, role: ['parent', 'child', 'xx', ''][i] })), 'family', { now: NOW });
ok(fam.people[0].roleLabel === '부모' && fam.people[2].role === '' && fam.people[3].roleLabel === '', '가족 역할');
ok(GC.evaluate(M, c3, 'lover', { now: Date.UTC(2099, 11, 1) }).ok, '범위 끝 달(데이터 없으면 null/짧게)');
// 이름이 '나'(내 사주)일 때 조사: '나가'가 아니라 '내가'
for (let k = 0; k < 30; k++) {
  const mem = [0, 1, 2, 3].map(j => ({ name: j === 0 ? '나' : NAMES[j], me: j === 0, ch: charts[(k * 4 + j) % charts.length] }));
  const r = GC.evaluate(M, mem, RELS[k % 4], { now: NOW });
  const bad = textOf(r).match(/(^|[\s·("])나가 |나이에요|나은 /); ok(!bad, `'나' 조사 '${bad && bad[0]}'`);
}

const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
console.log(`무리 ${N}개 · 화살표 비율(가능한 방향 중) 평균 ${(mean(stats.arrows) * 100).toFixed(0)}% · 종류 ${JSON.stringify(stats.kinds)}`);
console.log(`맞춰 갈 쌍이 있는 무리 ${stats.low}/${N} · 중재자 ${stats.medBy}/${stats.med} · 오행 적은 기운 있는 무리 ${stats.lack} · 많은 기운 ${stats.over}`);
console.log(`좋은 달 평균 ${mean(stats.goodM).toFixed(1)}개 · 예민한 달 평균 ${mean(stats.careM).toFixed(1)}개 · 6명 계산 최대 ${stats.ms}ms · 전체 ${Date.now() - t0}ms`);
const ar = mean(stats.arrows);
ok(ar > 0.1 && ar < 0.7, `화살표 비율 ${ar.toFixed(2)} (10~70%)`);
ok(stats.ms < 1500, `계산 시간 ${stats.ms}ms`);
if (fails.length) { const u = [...new Set(fails)]; console.log(`실패 ${fails.length}건\n` + u.slice(0, 20).join('\n')); process.exit(1); }
console.log('통과');
