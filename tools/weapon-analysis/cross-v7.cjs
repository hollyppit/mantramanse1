// 주무기 7판 탭 사이 일관성 검사:  node tools/weapon-analysis/cross-v7.cjs [--write]
//  · 선정 불변: 7판은 연결·검증만 — HEAD 와 비교하지 않고, crossCheck 가 analyze 결과를 바꾸지 않는지(호출 전후 같음) 본다
//  · 오행·강약 판정(가장 강한 오행·과다 패턴·무/결핍·강약)마다 주무기와의 관계 줄이 하나씩 있다
//  · 기반 역량은 주무기를 낳는 쪽, 보조 역량은 주무기가 낳는 쪽 — 셋이 서로 다른 오행
//  · 모순(재검토)·확인 항목 분포와 사례, 지시문 4번 사례(과다 판정 오행이 주무기를 낳는 경우: 예 식상과다 → 재성 주무기)
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..', '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8')); globalThis.window = globalThis;
['luck-grade', 'ten-god-roles', 'aptitude-data', 'aptitude', 'weapon-data', 'weapon', 'weapon-view'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8')));
const M = globalThis.Manse, W = globalThis.MantraWeapon, V = globalThis.MantraWeaponView, EL = ['목', '화', '토', '금', '수'], GN = ['비겁', '식상', '재성', '관성', '인성'];
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const txt = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const out = { level: {}, flags: {}, rel: {}, tri: { base: 0, support: 0, both: 0 }, examples: { excessGen: [], review: [], check: [], note: [] }, n: 0 };
const inc = (o, k) => o[k] = (o[k] || 0) + 1;
let fails = 0; const F = (n, e) => { fails++; if (fails < 15) console.log('✗', n, e.message); };
const PAT_G = { '식상과다(설기)': 1, '재다신약': 2, '관살과다': 3, '인성과다': 4, '군겁쟁재': 0 };
for (const inp0 of dev) for (const inp of [inp0, { ...inp0, hour: null }]) {
  const chart = `${inp.year}-${inp.month}-${inp.day} ${inp.hour == null ? '시간 모름' : inp.hour + '시'} ${inp.gender}`;
  try {
    const ch = M.compute(inp), A = W.analyze(M, ch), before = W.sig({ status: A.rawStatus, weapons: A.weapons, complex: A.complex });
    const X = W.crossCheck(M, ch, A); out.n++;
    assert.equal(W.sig({ status: A.rawStatus, weapons: A.weapons, complex: A.complex }), before, '연결 검사가 선정을 바꿈');
    if (!A.weapons.length) { assert.equal(X.level, 'none'); continue; }
    const w = A.weapons[0], dEl = M.stemEl(ch.pillars.day.s);
    inc(out.level, X.level); X.flags.forEach(f => { inc(out.flags, f.k); if (out.examples[f.level].length < 4) out.examples[f.level].push({ chart, weapon: EL[w.el] + '(' + w.groupName + ')', cause: f.cause }); });
    // 판정마다 관계 줄
    const pats = (globalThis.MantraTenGodRoles.agreePatterns(M, ch) || []).map(p => p.name);
    pats.filter(n => PAT_G[n] != null).forEach(n => assert.ok(X.links.some(l => l.kind === 'excess' && l.label === n), '과다 판정 연결 없음: ' + n));
    assert.ok(X.links.some(l => l.kind === 'top'), '가장 강한 오행 연결 없음');
    X.links.forEach(l => inc(out.rel, l.kind + ':' + l.rel));
    // 세 자리
    if (X.base) { out.tri.base++; assert.equal((X.base.el - w.el + 5) % 5, 4, '기반 역량은 주무기를 낳는 쪽'); }
    if (X.support) { out.tri.support++; assert.equal((X.support.el - w.el + 5) % 5, 1, '보조 역량은 주무기가 낳는 쪽'); }
    if (X.base && X.support) out.tri.both++;
    // 화면: 원국·오행 탭에 같은 연결 카드
    const hw = txt(V.wonguk(M, ch, {})), ho = txt(V.ohaeng(M, ch, {}));
    assert.ok(hw.includes('세 탭 판정 연결') && ho.includes('세 탭 판정 연결'), '연결 카드 없음');
    assert.ok(!/이\(가\)|을\(를\)|은\(는\)|과\(와\)/.test((hw.match(/세 탭 판정 연결.*/) || [''])[0]), '조사 표기 남음');
    // 지시문 4번: 과다 판정 오행이 주무기를 낳는 경우(예: 식상과다 → 재성 주무기)
    X.links.filter(l => l.kind === 'excess' && l.rel === 'gen').forEach(l => { if (out.examples.excessGen.length < 6) out.examples.excessGen.push({ chart, pattern: l.label, weapon: EL[w.el] + '(' + w.groupName + ')', base: X.base ? EL[X.base.el] + '(' + GN[X.base.group] + ')' : '', line: (ho.match(new RegExp(l.label.replace(/[()]/g, '.') + '[^—]*— [^.]*\\.[^.]*\\.')) || [''])[0] }); });
  } catch (e) { F(chart, e); }
}
console.log(JSON.stringify({ n: out.n, level: out.level, flags: out.flags, tri: out.tri, rel: out.rel }, null, 1));
console.log(JSON.stringify(out.examples, null, 1).slice(0, 3000));
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'docs/weapon-analysis/v7-cross.json'), JSON.stringify(out, null, 1));
console.log(fails ? `✗ ${fails}건 실패` : '✓ 탭 사이 일관성 검사 통과 (300 + 시간 모름 300)');
process.exit(fails ? 1 : 0);
