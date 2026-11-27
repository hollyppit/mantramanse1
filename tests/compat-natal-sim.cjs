// 명식 나란히 보기(compat-natal.js) 검증:  node tests/compat-natal-sim.cjs [쌍 수=300]
//  ① 판정은 엔진 그대로: relsBetween = relationsAmong 중 두 사람에 걸친 것 전부(빠짐·새 규칙 없음)
//  ② 대칭(참고 건수): 두 글자 작용은 순서를 바꿔도 같음, 삼합·반합 묶음은 엔진이 입력 순서로 고름 ③ 십성·오행 = 엔진 tenGod·stemEl·BR_EL
//  ④ 시 모름·여러 명(2~6명) 그림에 NaN·undefined 없음 ⑤ 이름 눌러 표시: 표시된 글자 = 그 사람과 다른 사람 사이 합·충 글자
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'compat-pair.js', 'compat-natal.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, NC = ctx.MantraNatalCompare;
const N = +process.argv[2] || 300;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
let seed = 20261128; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const opt = { calendar: 'solar', leap: false, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu', combinationMode: 'auto', climatePalaceMode: 'auto' };
const mk = (y, m, d, h, g) => M.compute(Object.assign({ year: y, month: m, day: d, hour: h, minute: 0, gender: g }, opt));
const charts = [];
while (charts.length < 90) { try { charts.push(mk(1945 + Math.floor(rnd() * 80), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), rnd() < 0.15 ? null : Math.floor(rnd() * 24), rnd() < 0.5 ? 'M' : 'F')); } catch (e) { } }
const BADTXT = /NaN|undefined|null|\[object/;
const POS = ['hour', 'day', 'month', 'year'];
const st = { asym: 0, rel: 0, good: 0, bad: 0, other: 0, dayDay: 0 };
for (let k = 0; k < N; k++) {
  const A = charts[Math.floor(rnd() * charts.length)], B = charts[Math.floor(rnd() * charts.length)];
  const R = NC.relsBetween(M, A, B), Rr = NC.relsBetween(M, B, A);
  // ① 엔진 그대로
  const items = []; POS.forEach(p => { if (A.pillars[p]) items.push({ id: 'a.' + p, s: A.pillars[p].s, b: A.pillars[p].b }); }); POS.forEach(p => { if (B.pillars[p]) items.push({ id: 'b.' + p, s: B.pillars[p].s, b: B.pillars[p].b }); });
  const eng = M.relationsAmong(items).filter(r => r.members.some(m => m[0] === 'a') && r.members.some(m => m[0] === 'b'));
  ok(eng.length === R.length, `엔진 작용 수 #${k}: ${eng.length} vs ${R.length}`);
  eng.forEach((r, i) => ok(R[i] && R[i].name === r.name && R[i].type === r.type, `엔진 작용 같음 #${k}`));
  // ② 대칭
  //   세 글자 작용(삼합·방합)은 엔진이 같은 글자가 여럿일 때 입력 순서대로 한 묶음을 고르므로(엔진 그대로 둠) 종류·이름만 견준다
  const key = (r, flip) => (r.a.length + r.b.length > 2) ? [r.type, r.name.split('').sort().join('')].join('|') : [r.type, r.name.split('').sort().join(''), (flip ? r.b : r.a).slice().sort().join(','), (flip ? r.a : r.b).slice().sort().join(',')].join('|');
  //   반합도 엔진이 삼합 묶음 순서에 따라 남기거나 빼므로, 대칭은 실패로 보지 않고 건수만 센다(화면은 늘 나를 a 자리에 둔다 — 궁합 점수 crossRels 와 같은 순서)
  if (JSON.stringify(R.map(r => key(r, false)).sort()) !== JSON.stringify(Rr.map(r => key(r, true)).sort())) st.asym++;
  R.forEach(r => { st.rel++; st[r.tone]++; if (r.a.includes('day') && r.b.includes('day')) st.dayDay++; ok(['good', 'bad', 'other'].includes(r.tone), '톤'); });
  // ③ 십성·오행
  NC.cells(M, A).forEach(c => { if (c.none) { ok(!A.pillars[c.k], '시 모름 칸'); return; } const p = A.pillars[c.k];
    ok(c.se === M.stemEl(p.s) && c.be === M.BR_EL[p.b], `오행 #${k}`);
    ok(c.btg === M.tenGod(A.pillars.day.s, M.mainHidden(p.b)) && (c.k === 'day' ? c.stg === '일간' : c.stg === M.tenGod(A.pillars.day.s, p.s)), `십성 #${k}`); });
  ok(NC.elCount(M, A).reduce((x, y) => x + y, 0) === (A.pillars.hour ? 8 : 6), `오행 글자 수 #${k}`);
  // ④ 그림
  const html = NC.pairHTML(M, { name: '나', ch: A }, { name: '가람', ch: B });
  ok(html.includes('id="ncPairCard"') && !BADTXT.test(html), `2인 그림 #${k}`);
  ok((html.match(/class="nc-l /g) || []).length === R.filter(r => r.tone !== 'other').length, `선 수 #${k}`);
}
// 여러 명
for (let k = 0; k < 80; k++) {
  const size = 2 + (k % 5), idx = []; while (idx.length < size) { const i = Math.floor(rnd() * charts.length); if (!idx.includes(i)) idx.push(i); }
  const mem = idx.map((i, j) => ({ name: ['나', '가람', '나래', '다온', '라희', '마루'][j], ch: charts[i] }));
  NC.state.focus = -1; let h = NC.groupHTML(M, mem);
  ok(h.includes('id="ncGroupCard"') && !BADTXT.test(h) && !/nc-hl-/.test(h), `여러 명 표 #${k}`);
  const f = k % size; NC.state.focus = f; h = NC.groupHTML(M, mem);
  const G = NC.groupMarks(M, mem, f);
  const exp = new Set(); mem.forEach((o, j) => { if (j === f) return; NC.relsBetween(M, mem[f].ch, o.ch).filter(r => r.tone !== 'other').forEach(r => { r.a.forEach(p => exp.add(f + '.' + p + '.' + (r.kind === 'stem' ? 's' : 'b'))); r.b.forEach(p => exp.add(j + '.' + p + '.' + (r.kind === 'stem' ? 's' : 'b'))); }); });
  ok(JSON.stringify(Object.keys(G.mk).sort()) === JSON.stringify([...exp].sort()), `표시 글자 #${k}`);
  ok((h.match(/nc-hl-/g) || []).length === exp.size && !BADTXT.test(h), `표시 수 #${k}`);
}
// ⑥ 작용 설명 문구 = 만세력 궁합 결과(compat-pair.js REL_TXT) 문구와 같음, 모든 종류에 설명
{ const T = ctx.PairCompat.REL_TXT; Object.keys(T).forEach(k => ok(NC.NOTE[k] && NC.NOTE[k][0] === T[k][1] && NC.NOTE[k][1] === T[k][2], `설명 문구 다름: ${k}`)); ok(Object.keys(NC.NOTE).length === Object.keys(T).length, '설명 종류 수');
  const h = NC.pairHTML(M, { name: '나', ch: charts[0] }, { name: '가람', ch: charts[1] }), R = NC.relsBetween(M, charts[0], charts[1]); ok((h.match(/class="nc-note"/g) || []).length === R.length, '작용마다 설명 한 줄'); }
NC.state.focus = -1;
console.log(`쌍 ${N}개 · 쌍당 작용 ${(st.rel / N).toFixed(1)}개 (합 ${st.good} · 충형원진 ${st.bad} · 그 밖 ${st.other}) · 일주끼리 작용 ${st.dayDay} · 순서 바꾸면 삼합·반합 묶음이 달라지는 쌍 ${st.asym}(엔진 그대로)`);
if (fails.length) { console.log('실패 ' + fails.length + '건'); console.log(fails.slice(0, 15).join('\n')); process.exit(1); }
console.log('compat-natal-sim: 모두 통과');
