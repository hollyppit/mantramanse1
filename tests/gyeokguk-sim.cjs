// 격국(gyeokguk.js) 검증
//   node tests/gyeokguk-sim.cjs [차트 수=6000]
// 격 선택(월지 지장간 투출)을 테스트에서 독립적으로 다시 계산해 전부 대조 · 건록·양인 · 성패 상태 규칙 · 시주 미상 보류 · 불변식
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
const M = globalThis.Manse; let netCalls = 0; globalThis.fetch = () => { netCalls++; throw new Error('network call'); };
const src = fs.readFileSync(path.join(root, 'gyeokguk.js'), 'utf8'); vm.runInThisContext(src, { filename: 'gyeokguk.js' });
const G = globalThis.MantraGyeokguk, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const BAN = /반드시|무조건|확실히|틀림없이|100%|보장합니다|예언|절대/;
const rnd = (() => { let seed = 1357; return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
const mk = (hourKnown = true) => { for (;;) { try { return M.compute({ year: 1900 + Math.floor(rnd() * 140), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: hourKnown ? Math.floor(rnd() * 24) : null, minute: hourKnown ? 0 : null, gender: 'M', calendar: 'solar', school: 'eokbu' }); } catch (e) { } } };

// ───────── 회귀 사주: 1992-06-23 02시 (월지 午: 丙·己·丁, 시간 丁 투출) ─────────
const reg = M.compute({ year: 1992, month: 6, day: 23, hour: 2, minute: 0, gender: 'M', calendar: 'solar', school: 'eokbu' }), snapReg = JSON.stringify(reg), R = G.analyze(M, reg);
console.log('회귀 사주:', R.headline, '|', R.text.detail.join(' / '));
ok(R.kind === '정관격', '월지 午 정기 丁(정관)이 시간에 투출 → 정관격이어야 함: ' + R.kind);
ok(R.basis.some(t => /정기 丁\(정관\)이 시간에 투출/.test(t)), '투출 근거 문장');
ok(R.factors.some(f => f.type === '상신' && f.ok && /관인상생/.test(f.text)), '관인상생 상신 확인'); ok(R.factors.some(f => f.type === '파격 요인' && /관살혼잡/.test(f.text)), '관살혼잡 파격 요인 확인');
ok(R.factors.some(f => f.type === '구응' && /식신제살/.test(f.text)), '식신제살 구응 확인'); ok(R.status === 'part', '파격 요인이 구응되면 부분이어야 함: ' + R.status);
ok(!R.factors.some(f => /충·형/.test(f.text)), '午午 자형을 월지 충·형 파격으로 세면 안 됨');
ok(JSON.stringify(reg) === snapReg, '격국 분석이 원국을 바꿈');

// ───────── 독립 재구현: 월지 지장간 투출 → 격 ─────────
const GOF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
function expectKind(c) {
  const d = c.pillars.day.s, H = M.HIDDEN[c.pillars.month.b], stems = ['year', 'month', 'hour'].map(k => c.pillars[k] && c.pillars[k].s).filter(x => x != null);
  const order = H.map(x => x[0]).reverse(); let pick = order.find(s => stems.includes(s)); if (pick == null) pick = order[0];
  const tg = M.tenGod(d, pick); if (GOF[tg] !== 0) return { kind: tg + '격', wol: false };
  return { kind: tg === '비견' ? '건록격' : (d % 2 === 0 ? '양인격' : '월겁격'), wol: true };
}
const N = +process.argv[2] || 6000, charts = []; while (charts.length < N) charts.push(mk());
const snaps = charts.slice(0, 40).map(c => JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]));
const rs = charts.map(c => G.analyze(M, c));
const cnt = { seong: 0, part: 0, pa: 0, hold: 0, none: 0 }, kinds = {}, cover = {};
rs.forEach((r, i) => {
  const c = charts[i], ex = expectKind(c); cnt[r.status]++; kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  ok(r.kind === ex.kind, `격 선택 불일치: ${r.kind} vs ${ex.kind}`);
  ok(['seong', 'part', 'pa', 'hold', 'none'].includes(r.status), '알 수 없는 상태');
  const sang = r.factors.filter(f => f.type === '상신'), pas = r.factors.filter(f => f.type === '파격 요인'), saved = r.factors.filter(f => f.type === '구응');
  const unres = pas.length - saved.length;
  if (r.status === 'pa') ok(unres > 0, '파격인데 구응 없는 파격 요인이 없음');
  if (r.status === 'seong') ok(sang.some(f => f.ok) && pas.length === 0, '성격인데 상신이 없거나 파격 요인이 있음');
  if (r.status === 'part') ok(unres === 0, '부분인데 구응 없는 파격 요인이 있음');
  if (r.status === 'none') ok(ex.wol && r.wolgeopUse === null, '격 불분명은 월겁격에서 쓰임이 없을 때만');
  if (ex.wol && r.wolgeopUse === null && r.status !== 'hold') ok(r.status === 'none', '월겁격 쓰임 없음 처리');
  if (r.table) { ok(r.table.yong === null || r.table.yong >= 0, '표 용신'); } else ok(r.status === 'none', '표가 없으면 격 불분명');
  const k2 = r.kind + '/' + r.status; cover[k2] = (cover[k2] || 0) + 1;
  [r.headline, r.text.summary, ...r.text.detail, ...r.basis, ...r.factors.map(f => f.text), ...r.caveat].forEach(t => { ok(!BAN.test(t), '금지 표현'); ok(!/undefined|NaN|\{|\}/.test(t), '값 누락 ' + t.slice(0, 40)); });
  [r.text.summary].forEach(t => ok(/(니다|요)\.?$/.test(t.trim().replace(/\([^)]*\)\.?$/, '')), '문장 어미 ' + t.slice(-20)));
});
console.log(`무작위 ${N}명  상태`, JSON.stringify(cnt)); console.log('  격 분포', JSON.stringify(kinds));
ok(Object.keys(kinds).length === 11, '격 종류 11가지(8격+건록·양인·월겁)가 모두 나와야 함: ' + Object.keys(kinds).length);
for (const k of ['정관격', '편관격', '정재격', '편재격', '식신격', '상관격', '정인격', '편인격']) ok(['seong', 'part', 'pa'].every(s => cover[k + '/' + s]), `${k}: 성격·부분·파격 사례가 모두 있어야 함`);
ok(cnt.seong > 0 && cnt.part > 0 && cnt.pa > 0 && cnt.none > 0, '상태가 모두 나와야 함'); ok(cnt.pa / N < 0.6 && cnt.seong / N < 0.8 && cnt.seong / N > 0.15, '상태 분포가 극단적');
// 건록·양인 매핑(오행·음양 규칙)
{ const tab = {}; rs.forEach((r, i) => { if (['건록격', '양인격', '월겁격'].includes(r.kind)) { const c = charts[i], d = c.pillars.day.s, H = M.HIDDEN[c.pillars.month.b]; tab[r.kind + (d % 2 === 0 ? '/양간' : '/음간')] = 1; if (r.kind === '양인격') ok(d % 2 === 0, '양인격은 양간 일간만'); if (r.kind === '월겁격') ok(d % 2 === 1, '월겁격(겁재)은 음간 일간'); } }); console.log('  월겁 종류', Object.keys(tab).join(', ')); ok(tab['양인격/양간'] && tab['건록격/양간'] && tab['건록격/음간'] && tab['월겁격/음간'], '건록·양인·월겁 조합이 모두 나와야 함'); }
// 시주 미상: 성패를 확정하지 않는다
{ let hold = 0, bad = 0, tot = 0; for (let i = 0; i < 3000; i++) { const c = mk(false); if (c.hourKnown !== false) continue; tot++; const r = G.analyze(M, c); if (r.status === 'hold') { hold++; ok(r.caveat.length === 1 && r.statusRaw, '보류 사유'); } else if (r.status !== 'none') bad++; }
  console.log(`  시주 미상 ${tot}명 중 보류 ${hold}명`); ok(tot > 0 && bad === 0, '시주를 모르는데 성패를 확정 ' + bad); }
// 불변식
charts.slice(0, 40).forEach((c, i) => ok(JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]) === snaps[i], '격국 분석이 원국·용신을 바꿈'));
ok(JSON.stringify(G.analyze(M, charts[0])) === JSON.stringify(rs[0]), '같은 입력 다른 결과'); ok(netCalls === 0, 'AI·네트워크 호출 ' + netCalls);
ok(!/luck|daeun|seun|wolun|ilun|대운|세운/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'[^']*'/g, "''")), '격국이 운 데이터를 참조함'); ok(!/1992|壬申|丙午/.test(src), '회귀 사주 하드코딩');
ok(Object.keys(M.SCHOOLS).join() === 'eokbu,johu,tonggwan', '기존 학파 목록 변경');
{ const c = M.compute({ year: 1988, month: 3, day: 9, hour: 14, minute: 0, gender: 'F', calendar: 'solar', school: 'eokbu' }), before = JSON.stringify(c.yongAll); G.analyze(M, c); ok(JSON.stringify(c.yongAll) === before, '격국이 용신 계산을 바꿈'); }
console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + [...new Set(fails)].slice(0, 30).join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
