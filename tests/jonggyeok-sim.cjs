// 종격·전왕격(jonggyeok.js) 검증
//   node tests/jonggyeok-sim.cjs [차트 수=6000]
// 종류별 사례 · 차단 조건(인성·비겁·뿌리가 있으면 종하지 않음) · 시주 미상 보류 · 용신 배치 · 불변식(원국 불변·운 미사용·AI 호출 없음·문장 형식)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
const M = globalThis.Manse; let netCalls = 0; globalThis.fetch = () => { netCalls++; throw new Error('network call'); };
const src = fs.readFileSync(path.join(root, 'jonggyeok.js'), 'utf8'); vm.runInThisContext(src, { filename: 'jonggyeok.js' });
const J = globalThis.MantraJonggyeok, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const EL = ['목', '화', '토', '금', '수'], BAN = /반드시|무조건|확실히|틀림없이|100%|보장합니다|예언|절대/;
const rnd = (() => { let seed = 2468; return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
const mk = (hourKnown = true) => { for (;;) { try { return M.compute({ year: 1900 + Math.floor(rnd() * 140), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: hourKnown ? Math.floor(rnd() * 24) : null, minute: hourKnown ? 0 : null, gender: 'M', calendar: 'solar', school: 'eokbu' }); } catch (e) { } } };
const N = +process.argv[2] || 6000, charts = []; while (charts.length < N) charts.push(mk());
const snaps = charts.slice(0, 40).map(c => JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]));
const rs = charts.map(c => J.analyze(M, c));
const st = {}, kinds = {}; let ext = 0;
rs.forEach((r, i) => {
  const c = charts[i], g = c.weights.groups; st[r.side + ':' + r.status] = (st[r.side + ':' + r.status] || 0) + 1;
  ok(['jin', 'ga', 'none', 'hold'].includes(r.status), '알 수 없는 상태 ' + r.status);
  // 일간의 힘이 극단이 아니면 검토하지 않는다
  ok((r.side === 'mid') === (c.strength.help >= 30 && c.strength.help < 70), '검토 구간 판정 오류');
  if (r.side === 'mid') { ok(r.status === 'none' && r.table === null && r.criteria.length === 0, '중간 구간인데 종격 판정'); return; }
  ext++;
  if (r.status === 'jin' || r.status === 'ga') {
    kinds[r.follow.kind + '/' + r.status] = (kinds[r.follow.kind + '/' + r.status] || 0) + 1;
    ok(r.criteria.length === (r.side === 'weak' ? 6 : 5), '조건 개수');
    ok(r.criteria[0].level >= 0.5, '일간의 힘 조건이 미충족인데 종격 판정');
    if (r.status === 'jin') ok(r.criteria.every(x => x.level >= 0.5), '충족인데 미충족 조건이 있음');
    // 차단 조건: 뿌리·인성·비겁이 뚜렷하면 종하지 않는다
    if (r.side === 'weak') { ok(g[4] < 20 && g[0] < 15 && M.analyzeNatalRoot(c).natalRootScore < 50, '종약인데 인성·비겁·뿌리가 뚜렷함'); ok(['종재격', '종살격', '종아격'].includes(r.follow.kind), '종약 종류'); }
    else { ok(g[1] + g[2] + g[3] < 26, '전왕인데 식상·재성·관성이 뚜렷함'); ok(['종왕격', '종강격'].includes(r.follow.kind), '전왕 종류'); }
    // 용신 배치: 용신 오행 = 따르는 세력의 오행, 5개 역할이 서로 다른 오행
    ok(r.roles[r.follow.el] === '용신', '용신이 따르는 세력이 아님'); ok(Object.keys(r.roles).length === 5 && new Set(Object.values(r.roles)).size === 5, '역할 배치가 5개 오행에 하나씩이 아님');
    ok(r.table.yong === EL.indexOf(r.follow.el), '표의 용신');
    const dEl = M.stemEl(c.pillars.day.s), grpEl = k => EL[(dEl + k) % 5];
    ok(r.roles[grpEl(4)] !== '용신' || r.follow.kind === '종강격', '종강 외에는 인성이 용신이 될 수 없음');
    if (r.side === 'weak') ok(['기신', '구신'].includes(r.roles[grpEl(4)]) || r.roles[grpEl(4)] === '기신', '종약에서 일간을 돕는 인성이 기신이 아님');
  } else if (r.status === 'none') ok(r.table === null, '해당 없음인데 표 값이 있음');
  [r.headline, r.text.summary, ...r.text.relation, ...r.caveat].forEach(t => { ok(!BAN.test(t), '금지 표현'); ok(!/undefined|NaN|\{|\}/.test(t), '값 누락 ' + t.slice(0, 30)); ok(!/[토화수]은 (용신|희신|한신|구신|기신)|[목금]는 (용신|희신|한신|구신|기신)|[토화수]을 |[목금]를 /.test(t), '조사 오류: ' + t.slice(0, 60)); });
  r.text.relation.concat([r.text.summary]).forEach(t => ok(/(니다|요)\.?$/.test(t.trim().replace(/\([^)]*\)\.?$/, '')), '문장 어미: ' + t.slice(-20)));
});
console.log(`무작위 ${N}명 — 극단 구간(검토 대상) ${ext}명(${(ext / N * 100).toFixed(1)}%)`);
console.log('  상태', JSON.stringify(st)); console.log('  종류', JSON.stringify(kinds));
const jin = Object.entries(st).filter(([k]) => k.endsWith(':jin')).reduce((a, [, v]) => a + v, 0), ga = Object.entries(st).filter(([k]) => k.endsWith(':ga')).reduce((a, [, v]) => a + v, 0);
console.log(`  충족 ${(jin / N * 100).toFixed(2)}% · 가능성 ${(ga / N * 100).toFixed(2)}% (전체 대비)`);
ok(jin > 0 && ga > 0, '충족·가능성 사례가 모두 있어야 함'); ok(jin / N < 0.05 && (jin + ga) / N < 0.08, '종격 판정이 너무 흔함(드문 격이어야 함)'); ok(ext / N > 0.1 && ext / N < 0.35, '검토 구간 비율');
ok(['종재격', '종살격', '종아격', '종왕격', '종강격'].every(k => kinds[k + '/jin'] || kinds[k + '/ga']), '모든 종류가 나와야 함: ' + JSON.stringify(Object.keys(kinds)));
ok(Object.keys(st).some(k => k.startsWith('weak:none')) && Object.keys(st).some(k => k.startsWith('strong:none')), '극단 구간에서 해당 없음도 나와야 함');
// 시주 미상: 충족·가능성을 확정하지 않는다
{ let hold = 0, bad = 0, tot = 0; for (let i = 0; i < 4000; i++) { const c = mk(false); if (c.hourKnown !== false) continue; tot++; const r = J.analyze(M, c); if (r.status === 'jin' || r.status === 'ga') bad++; if (r.status === 'hold') { hold++; ok(r.caveat.length === 1 && /시주/.test(r.caveat[0]) && r.statusRaw, '보류 사유'); } }
  console.log(`  시주 미상 ${tot}명 중 보류 ${hold}명`); ok(tot > 0 && bad === 0, '시주를 모르는데 충족·가능성으로 확정 ' + bad + '건'); ok(hold > 0, '시주 미상 보류 사례가 없음'); }
// 불변식
charts.slice(0, 40).forEach((c, i) => ok(JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]) === snaps[i], '종격 분석이 원국·용신을 바꿈'));
ok(JSON.stringify(J.analyze(M, charts[0])) === JSON.stringify(rs[0]), '같은 입력 다른 결과'); ok(netCalls === 0, 'AI·네트워크 호출 ' + netCalls);
ok(!/luck|daeun|seun|wolun|ilun|대운|세운/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'[^']*'/g, "''")), '종격이 운 데이터를 참조함');
ok(Object.keys(M.SCHOOLS).join() === 'eokbu,johu,tonggwan', '기존 학파 목록 변경');
{ const c = M.compute({ year: 1988, month: 3, day: 9, hour: 14, minute: 0, gender: 'F', calendar: 'solar', school: 'eokbu' }), before = JSON.stringify(c.yongAll); J.analyze(M, c); ok(JSON.stringify(c.yongAll) === before, '종격이 용신 계산을 바꿈'); }
// 병약의 극약·극왕 안내가 종격 판단을 가리킨다
{ const B = fs.readFileSync(path.join(root, 'byeongyak.js'), 'utf8'); ok(/종격·전왕격 판단/.test(B) && !/종격을 아직 판정하지 않/.test(B), '병약 안내가 종격 판단을 가리키지 않음'); }
console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + [...new Set(fails)].slice(0, 40).join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
