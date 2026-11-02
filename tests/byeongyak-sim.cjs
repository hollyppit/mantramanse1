// 병약용신(byeongyak.js) 검증
//   node tests/byeongyak-sim.cjs [차트 수=3000]
// 회귀 사주·조건별 사례(재다신약·신강 비겁 과다·식상 과다·태약 구간) · 불변식(원국 불변·운 미사용·AI 호출 없음·문장 형식) · 분포
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
const M = globalThis.Manse; let netCalls = 0; globalThis.fetch = () => { netCalls++; throw new Error('network call'); };
const src = fs.readFileSync(path.join(root, 'byeongyak.js'), 'utf8'); vm.runInThisContext(src, { filename: 'byeongyak.js' });
const B = globalThis.MantraByeongyak, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const compute = (y, mo, d, h) => M.compute({ year: y, month: mo, day: d, hour: h, minute: 0, gender: 'M', calendar: 'solar', school: 'eokbu' });
const BAN = /반드시|무조건|확실히|틀림없이|100%|보장합니다|예언|절대/;
const EL = ['목', '화', '토', '금', '수'];

// ───────── 회귀 사주 1992-06-23 02시: 신약 · 火(관성) 50% ─────────
const reg = compute(1992, 6, 23, 2), snapReg = JSON.stringify(reg), R = B.analyze(M, reg);
console.log('회귀 사주:', R.headline);
ok(R.status === 'ok' && R.byeong.el === '화' && R.byeong.group === '관성' && R.byeong.kind === '태과', '병이 火(관성) 태과가 아님');
ok(R.yak[0].el === '토' && R.yak[0].method === '설' && /살인상생/.test(R.yak[0].label), '약1이 土(인성, 설·살인상생)가 아님');
ok(R.yak[1] && R.yak[1].el === '수' && R.yak[1].method === '제' && /식신제살/.test(R.yak[1].label), '약2가 水(식상, 제·식신제살)가 아님');
ok(R.text.relation.some(t => /억부 기준으로도 용신/.test(t)), '억부와 같은 방향임을 알리지 않음');
ok(R.text.relation.some(t => /조후 기준으로는 약\(토\)이 기신/.test(t)), '조후와 갈림을 알리지 않음');
ok(R.text.relation.some(t => /약\(수\)은 억부 기준으로는 구신/.test(t)), '약의 부작용(약이 병이 되는 경우)에 약 이름이 없음');
ok(R.table.yong === 2 && R.table.hee === 4 && R.table.gi === 1 && R.table.gu === 0, '학파별 표 값 ' + JSON.stringify(R.table));
ok(JSON.stringify(reg) === snapReg, '병약 분석이 원국을 바꿈');

// ───────── 조건별 사례 ─────────
const rnd = (() => { let seed = 31337; return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
const charts = []; while (charts.length < (+process.argv[2] || 3000)) { try { charts.push(compute(1900 + Math.floor(rnd() * 140), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24))); } catch (e) { } }
const snaps = charts.slice(0, 30).map(c => JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]));
const rs = charts.map(c => B.analyze(M, c));
const find = f => { const i = charts.findIndex((c, k) => f(c, rs[k])); return i < 0 ? null : { c: charts[i], r: rs[i] }; };
const caseA = find((c, r) => r.status === 'ok' && r.side === 'weak' && r.byeong.kind === '태과' && r.byeong.group === '재성');
ok(caseA && ['비겁', '인성'].includes(caseA.r.yak[0].group), '신약 + 재성 과다(재다신약)의 약1이 일간을 돕는 쪽(비겁·인성)이 아님');
const caseB = find((c, r) => r.status === 'ok' && r.side === 'strong' && r.byeong.kind === '태과' && r.byeong.group === '비겁');
ok(caseB && ['관성', '식상', '재성'].includes(caseB.r.yak[0].group), '신강 + 비겁 과다의 약1이 힘을 빼는 쪽(식상·재성·관성)이 아님');
const caseC = find((c, r) => r.status === 'ok' && r.side === 'weak' && r.byeong.kind === '태과' && r.byeong.group === '식상');
ok(caseC && ['인성', '비겁', '재성'].includes(caseC.r.yak[0].group), '신약 + 식상 과다의 약 후보 확인');
const caseD = find(c => c.strength.zone === '태약'); ok(caseD && B.analyze(M, caseD.c).side === 'weak', '태약(20~30%) 구간이 신약 쪽으로 처리되지 않음');
const caseE = find(c => c.strength.zone === '태강'); ok(caseE && B.analyze(M, caseE.c).side === 'strong', '태강(70~80%) 구간이 신강 쪽으로 처리되지 않음');
const caseF = find((c, r) => r.status === 'none'); ok(caseF && caseF.r.table === null && /뚜렷한 병이 없/.test(caseF.r.headline), '병이 없는 사주 처리');
const caseG = find((c, r) => r.caveat.length); ok(caseG && /종격/.test(caseG.r.caveat[0]), '극약·극왕 사주에 종격 안내가 없음');
[['A 신약·재다', caseA], ['B 신강·비겁과다', caseB], ['C 신약·식상과다', caseC]].forEach(([n, x]) => x && console.log(`  ${n}: ${x.r.headline}`));

// ───────── 불변식 ─────────
const cnt = { none: 0, ok: 0, noyak: 0, 태과: 0, 불급: 0, 설: 0, 제: 0, 보: 0, absent: 0, same: 0, side: { weak: 0, mid: 0, strong: 0 }, bad: 0 };
rs.forEach((r, i) => {
  const c = charts[i]; cnt[r.status]++; cnt.side[r.side]++;
  ok(['ok', 'none', 'noyak'].includes(r.status), '알 수 없는 상태 ' + r.status);
  if (r.status === 'none') { ok(r.table === null, '병 없음인데 표 값이 있음'); return; }
  cnt[r.byeong.kind]++;
  if (r.byeong.kind === '태과') { ok(r.byeong.pct >= 30, '태과인데 30% 미만 ' + r.byeong.pct); ok(r.table.gi === r.byeong.elIdx, '표의 기신이 병과 다름'); ok(r.table.gu === (r.byeong.elIdx + 4) % 5, '표의 구신이 병을 낳는 오행이 아님'); r.yak.forEach(y => ok(y.elIdx !== r.byeong.elIdx, '약이 병 오행과 같음')); }
  else { ok(r.byeong.pct < 25, '불급인데 25% 이상'); ok(r.table.gi === null && r.table.gu === null, '불급인데 기신·구신 표시'); }
  ok(new Set(r.yak.map(y => y.el)).size === r.yak.length, '약 중복');
  r.yak.forEach(y => { cnt[y.method]++; ok(y.present === (y.pct >= 10) || Math.abs(y.pct - 10) < 0.06, '약 존재 여부 불일치' /* pct 는 소수 첫째 자리 반올림값 */); if (!y.present) cnt.absent++; });
  if (r.yak[0] && (r.yak[0].eokRole === '용신' || r.yak[0].eokRole === '희신')) cnt.same++;
  const texts = [r.headline, r.text.byeong, ...r.text.yak, ...r.text.relation, ...r.caveat];
  texts.forEach(t => { if (BAN.test(t)) cnt.bad++; if (/undefined|NaN|\{|\}/.test(t)) cnt.bad++; if (!/(니다|요)\.?$/.test(t.trim().replace(/\([^)]*\)\.?$/, '')) && t !== r.headline) cnt.bad++; /* 괄호로 끝나는 문장은 괄호를 뺀 뒤 어미를 본다 */ });
});
const N = charts.length, pc = v => (v / N * 100).toFixed(1) + '%';
console.log(`\n무작위 ${N}명: 병 없음 ${pc(cnt.none)} · 병 있음 ${pc(cnt.ok + cnt.noyak)}(태과 ${cnt.태과} · 불급 ${cnt.불급}) · 마땅한 약 없음 ${cnt.noyak}명`);
console.log(`  약 방법 설 ${cnt.설} · 제 ${cnt.제} · 보 ${cnt.보} · 원국에 거의 없는 약 ${cnt.absent}개 · 약1이 억부 용신·희신과 같음 ${(cnt.same / Math.max(1, cnt.ok) * 100).toFixed(0)}%`);
ok(cnt.bad === 0, '문장 형식·금지 표현 위반 ' + cnt.bad); ok(cnt.none / N > 0.15 && cnt.none / N < 0.85, '병 없음 비율이 극단적 ' + pc(cnt.none)); ok(cnt.태과 > 0 && cnt.불급 >= 0 && cnt.설 > 0 && cnt.제 > 0, '설·제 방법이 모두 나와야 함');
ok(cnt.same / Math.max(1, cnt.ok) > 0.3 && cnt.same / Math.max(1, cnt.ok) < 0.95, '병약과 억부의 일치율이 극단적(독립적인 관점이어야 함)');
charts.slice(0, 30).forEach((c, i) => ok(JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]) === snaps[i], '병약 분석이 원국·용신을 바꿈'));
ok(JSON.stringify(B.analyze(M, reg)) === JSON.stringify(R), '같은 입력 다른 결과'); ok(netCalls === 0, 'AI·네트워크 호출 ' + netCalls);
ok(!/luck|daeun|seun|wolun|ilun|대운|세운/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'[^']*'/g, "''")), '병약이 운 데이터를 참조함');
ok(!/1992|壬申|丙午/.test(src), '회귀 사주 하드코딩');
// 기존 계산은 그대로: 억부·조후·통관 역할표가 병약 호출 전후 같다
{ const c = compute(1988, 3, 9, 14), before = JSON.stringify(c.yongAll); B.analyze(M, c); ok(JSON.stringify(c.yongAll) === before, '병약이 용신 계산을 바꿈'); ok(Object.keys(M.SCHOOLS).join() === 'eokbu,johu,tonggwan', '기존 학파 목록 변경'); }
console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + [...new Set(fails)].join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
