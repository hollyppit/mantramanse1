// 주무기 6판(선정 보완) 사례 검사:  node tools/weapon-analysis/case-v6.cjs [--write]
//  사례: 庚戌년 癸未월 丁未일(1970-07-26, 시간 모름 + 12시진) — 토·식신의 반복 구조 / 금·재성의 투출 / 식신생재 관계
//  검사: ① 12시진·시간 모름 모두 1순위 = 토(식상) ② 금(재성)은 1순위가 아님 — 2순위면 '보조 역량'(식신생재로 이어 받음)이거나 짝 십성
//        ③ 토의 근거에 월령 장악·사령·지지 병존·같은 오행 지지의 지장간 십성이 나옴 ④ 금의 근거에 투간(庚 정재)·상신(식신생재)이 나옴
//        ⑤ 투출만으로 우선하지 않음: 금은 투출했지만 구조적 중요도가 토보다 낮다
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..', '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8')); globalThis.window = globalThis;
['luck-grade', 'ten-god-roles', 'weapon-data', 'weapon'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8')));
const M = globalThis.Manse, W = globalThis.MantraWeapon, EL = ['목', '화', '토', '금', '수'];
const hours = [null, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const rows = []; let fails = 0;
hours.forEach(h => {
  const inp = { year: 1970, month: 7, day: 26, hour: h, minute: h === 0 ? 40 : 0, gender: 'M', calendar: 'solar' };
  const ch = M.compute(inp), A = W.analyze(M, ch), P = ch.pillars, g = p => p ? M.STEM[p.s] + M.BR[p.b] : '--';
  const to = A.facts[2], gm = A.facts[3], w0 = A.weapons[0], w1 = A.weapons[1];
  const row = {
    hour: h == null ? '시간 모름' : h + '시', pillars: [P.year, P.month, P.day, P.hour].map(g).join(' '), label: A.label,
    weapons: A.weapons.map(w => ({ el: EL[w.el], group: w.groupName, path: w.path, type: w.typeK, sig: w.sig, link: w.link ? '보조 역량(' + w.link.name + ')' : '' })),
    to: { pct: to.pct, sig: to.sig, plus: to.plus, sameBranches: to.sameBranches.map(b => b.ch + '(' + b.hidden.map(x => x.s + ' ' + x.tg + '/' + x.depth).join(', ') + ')'), saryeong: to.saryeong, branchPath: to.cond.branchPath },
    geum: { pct: gm.pct, sig: gm.sig, plus: gm.plus, stems: gm.stems.map(s => s.ch + '(' + s.tg + ')'), structure: gm.structure.map(x => x.text), acts: gm.acts.map(x => x.name) },
    log: A.log,
  };
  try {
    assert.ok(w0 && w0.el === 2, '1순위가 토(식상)가 아님: ' + (w0 ? EL[w0.el] : '없음'));
    assert.ok(!(w0 && w0.el === 3), '금이 1순위');
    if (w1 && w1.el === 3 && w1.link) assert.equal(w1.link.from, 2, '보조 역량은 토에서 이어 받음');
    assert.ok(to.cond.monthCmd && to.cond.branchRep, '토 월령 장악·지지 병존');
    assert.ok(to.sameBranches.length >= 3 && to.sameBranches.filter(b => b.mainTg === '식신').length >= 2, '토 지지 3개·정기 식신 2개');
    assert.ok(gm.cond.exposed && gm.stems.some(s => s.tg === '정재'), '금 투간(庚 정재)');
    assert.ok(gm.sig < to.sig, '투출한 금의 구조적 중요도가 토보다 낮아야');
    row.ok = true;
  } catch (e) { fails++; row.ok = false; row.err = e.message; console.log('✗', row.hour, e.message); }
  rows.push(row);
});
const sum = {};
rows.forEach(r => { const k = r.label + ' ' + r.weapons.map(w => w.el + '(' + w.group + ')' + (w.link ? '·' + w.link : '')).join(' · '); (sum[k] = sum[k] || []).push(r.hour); });
console.log(JSON.stringify(sum, null, 1));
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'docs/weapon-analysis/v6-case.json'), JSON.stringify({ summary: sum, rows }, null, 1));
console.log(fails ? `✗ ${fails}건 실패` : '✓ 丁未일주 사례 검사 통과 (시간 모름 + 12시진)');
process.exit(fails ? 1 : 0);
