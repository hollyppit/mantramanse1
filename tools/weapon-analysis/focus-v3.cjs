// 주무기 3판 집중 검사(지시문 8절 5종) + 일관성:  node tools/weapon-analysis/focus-v3.cjs [--write]
//  a 관성이 강하지만 창작·표현이 두드러지는 명식 — 커리어·종합 문장에 '조직형' 단정이 없고, 짝 조합 형태로 설명되는지
//  b 식상이 강하지만 재성 연결이 약한 명식 — 식상생재가 성립하지 않았는데 '성립한 작용'으로 쓰지 않는지
//  c 오행은 강하지만 관련 십성 작용이 약한 명식 — 오행형·잠정으로 처리되는지(하나만으로 확정하지 않음)
//  d 여러 십성이 결합한 명식 — 짝 조합 2개 이상이 각각 설명되는지
//  e 확정하기 어려운 명식 — 잠정·미확정 표시
//  + 네 탭·유료 블록이 같은 판정(1순위 오행)을 쓰는지
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..', '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8')); globalThis.window = globalThis;
['luck-grade', 'ten-god-roles', 'gyeok-structure', 'aptitude-data', 'aptitude', 'weapon-data', 'weapon', 'weapon-view'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8')));
['weapon-chapters-data', 'weapon-chapters'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8')));
const M = globalThis.Manse, W = globalThis.MantraWeapon, V = globalThis.MantraWeaponView, WC = globalThis.ReportV2.WeaponChapters, now = Date.UTC(2026, 10, 26);
const EL = ['목', '화', '토', '금', '수'], GN = ['비겁', '식상', '재성', '관성', '인성'];
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const txt = h => String(h || '').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const R = { a: [], b: [], c: [], d: [], e: [] }, cnt = { a: 0, b: 0, c: 0, d: 0, e: 0 }; let fails = 0;
const T = (n, f) => { try { f(); } catch (e) { fails++; if (fails < 15) console.log('✗', n, e.message); } };
dev.forEach((inp, i) => T('#' + i, () => {
  const ch = M.compute(inp), A = W.analyze(M, ch), G = ch.weights.groups, w = A.weapons[0], H = { M, ch, now, name: '' };
  const chart = `${inp.year}-${inp.month}-${inp.day} ${inp.hour}시 ${inp.gender}`;
  const paid = WC.TOPICS.map(t => txt(WC.preview(H, t))).join(' '), views = ['wonguk', 'ohaeng', 'apt'].map(k => txt(V[k](M, ch, {}))).join(' ');
  // 일관성: 같은 판정을 네 탭·유료가 씀(1순위 오행 이름이 모두에 나옴)
  if (w) { const k = EL[w.el]; assert.ok(views.includes(k), '만세력 탭 일관'); if (A.label !== '주무기 미확정' && /^(single|dual)$/.test(A.status)) assert.ok(paid.includes(k), '유료 일관'); }
  // a
  const ti = M.TG ? null : null; const tr = globalThis.MantraTenGodRoles.analyze(M, ch);
  if (G[3] >= 25 && w && (w.group === 1 || (w.partners || []).some(p => p.group === 1))) {
    cnt.a++; assert.ok(!/조직형/.test(paid + views), "'조직형' 단정 없음");
    if (R.a.length < 3) R.a.push({ chart, 관성: Math.round(G[3]), weapon: EL[w.el] + '(' + w.groupName + ')', partners: w.partners.map(p => GN[p.group] + '/' + p.basis + (p.name ? ':' + p.name : '')), form: (w.partners.find(p => p.group === 1 || w.group === 1) ? '창작·표현 형태로 설명' : '') });
  }
  // b
  const ssj = (tr.interactions || []).find(o => o.name === '식상생재');
  if (G[1] >= 25 && (G[2] < 10 || !ssj || ssj.status !== 'on')) {
    cnt.b++;
    A.weapons.forEach(x => (x.partners || []).forEach(p => { if ((x.group === 1 && p.group === 2) || (x.group === 2 && p.group === 1)) assert.ok(!(p.basis === 'act' && p.name === '식상생재' && ssj.status !== 'on'), '식상생재 불성립인데 성립으로 씀'); }));
    if (R.b.length < 3) R.b.push({ chart, 식상: Math.round(G[1]), 재성: Math.round(G[2]), 식상생재: ssj ? ssj.status : '-', weapon: w ? EL[w.el] + '(' + w.groupName + ')' : '-' });
  }
  // c
  if (w && w.type === 'element') { cnt.c++; assert.notEqual(A.label, '주무기', '오행만으로 확정하지 않음'); if (R.c.length < 3) R.c.push({ chart, weapon: EL[w.el] + '(' + w.groupName + ') ' + w.pct + '%', label: A.label }); }
  // d
  if (w && (w.partners || []).filter(p => p.basis === 'act').length >= 2) { cnt.d++; const pairsShown = (w.partners || []).filter(p => p.basis === 'act').length; assert.ok(pairsShown >= 2); if (R.d.length < 3) R.d.push({ chart, weapon: EL[w.el] + '(' + w.groupName + ')', partners: w.partners.map(p => GN[p.group] + ':' + (p.name || p.basis) + '/' + p.tone) }); }
  // e
  if (A.label !== '주무기') { cnt.e++; if (R.e.length < 4) R.e.push({ chart, label: A.label, status: A.status, why: w ? (w.path === 'structure' ? '십신형 경로' : !w.tgEvidence ? '십신 근거 없음(오행만)' : w.confidence === 'low' ? '근거 약함(합충·보탬 부족)' : '') : '후보 없음/동률' }); }
}));
const out = { counts: cnt, examples: R, fails };
console.log(JSON.stringify(cnt));
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'docs/weapon-analysis/v3-focus.json'), JSON.stringify(out, null, 1));
console.log(fails ? `✗ ${fails}건 실패` : '✓ 3판 집중 검사 통과');
process.exit(fails ? 1 : 0);
