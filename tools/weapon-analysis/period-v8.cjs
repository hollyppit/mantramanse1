// 주무기 8판 시기별 핵심 역량 검사:  node tools/weapon-analysis/period-v8.cjs [--write]
//  · 타고난 주무기 불변: 운을 아무리 돌려도 analyze 결과(선정)가 같다 / HEAD 와 선정 비교(8판은 선정을 바꾸지 않음)
//  · 핵심 역량은 '단순 유입'으로 고르지 않음: 3점 이상 + 원국 통근·원국 천간·운 안 통근·합국 중 하나 이상
//  · 관계(강화·보완·전환)가 오행 관계와 일치 · 흐름 등급(favor) 불변
//  · 화면: 상세 카드·요약에 '타고난 주무기와 이 시기의 핵심 역량' 블록, 명리 근거 줄과 점수
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), assert = require('assert/strict');
const root = path.join(__dirname, '..', '..');
const mk = src => { const c = { console, Date, Intl }; c.window = c; c.globalThis = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), c); ['luck-grade.js', 'ten-god-roles.js', 'aptitude-data.js', 'aptitude.js', 'weapon-data.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c)); vm.runInContext(src, c); vm.runInContext(fs.readFileSync(path.join(root, 'weapon-view.js'), 'utf8'), c); return c; };
const N = mk(fs.readFileSync(path.join(root, 'weapon.js'), 'utf8')), O = mk(cp.execSync('git show HEAD:weapon.js', { cwd: root, encoding: 'utf8' }));
const M = N.Manse, W = N.MantraWeapon, V = N.MantraWeaponView, EL = ['목', '화', '토', '금', '수'];
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const REL = { 0: 'boost', 1: 'fill', 2: 'fill', 3: 'shift', 4: 'fill' };   // (역량 − 주무기) mod 5: 같음·주무기가 낳음·주무기가 다스림·주무기를 누름·주무기를 낳음
const out = { n: 0, periods: 0, pick: 0, none: 0, also: 0, rel: {}, src: {}, pts: {}, sameAsWeapon: 0, examples: [] }; let fails = 0;
const inc = (o, k) => o[k] = (o[k] || 0) + 1;
for (const inp0 of dev) for (const inp of [inp0, { ...inp0, hour: null }]) {
  const chart = `${inp.year}-${inp.month}-${inp.day} ${inp.hour == null ? '시간 모름' : inp.hour + '시'} ${inp.gender}`;
  try {
    const ch = M.compute(inp), A = W.analyze(M, ch), s0 = W.sig({ status: A.rawStatus, weapons: A.weapons, complex: A.complex });
    const chO = O.Manse.compute(inp), AO = O.MantraWeapon.analyze(O.Manse, chO);
    assert.equal(s0, O.MantraWeapon.sig({ status: AO.rawStatus, weapons: AO.weapons, complex: AO.complex }), '선정이 HEAD와 다름');
    out.n++; const L = A.weapons.length ? A.weapons : A.complex; if (!L.length) continue;
    const seun = M.seunRange(ch, 2026, 2035) || [];
    [...ch.daeun.list, ...seun].forEach((p, i) => {
      const kind = i < ch.daeun.list.length ? 'daeun' : 'seun', r = W.luck(M, ch, p, kind), c = r.core; out.periods++;
      const po = kind === 'daeun' ? O.MantraWeapon.luck(O.Manse, chO, chO.daeun.list[i], 'daeun') : null;
      if (po) assert.equal(JSON.stringify(r.favor), JSON.stringify(po.favor), '흐름 등급 바뀜');
      if (!c || !c.pick) { out.none++; return; }
      const k = c.pick; out.pick++; inc(out.rel, k.relK); inc(out.src, k.src); inc(out.pts, k.pts); if (c.also) out.also++;
      assert.ok(k.pts >= 3, '3점 미만 선정');
      assert.ok(k.why.some(x => /natalRoot|natalRootS|hap|selfRoot|natalStem/.test(x.k)), '원국·운 실제 작용 없이 선정');
      assert.equal(k.rel, REL[(k.el - L[0].el + 5) % 5], '관계 판정 불일치');
      if (k.el === L[0].el) out.sameAsWeapon++;
    });
    assert.equal(W.sig({ status: A.rawStatus, weapons: A.weapons, complex: A.complex }), s0, '운 계산 뒤 선정 바뀜');
    const hs = V.luck(M, ch, { part: 'summary', curY: 2026, now: Date.UTC(2026, 10, 26) }), hd = V.luck(M, ch, { part: 'daeun', curY: 2026, now: Date.UTC(2026, 10, 26) });
    assert.ok(hs.includes('타고난 주무기와 이 시기의 핵심 역량') && hd.includes('타고난 주무기와 이 시기의 핵심 역량'), '화면 블록 없음');
    { const ht = hd.replace(/<[^>]+>/g, ''); assert.ok(ht.includes('②발현 강도') && ht.includes('④작용 근거'), '상담자용 명리 근거(②~⑧) 유지'); }
    assert.ok(!/이\(가\)|을\(를\)|은\(는\)|과\(와\)/.test(hd.replace(/<[^>]+>/g, '')), '조사 표기 남음');
    if (out.examples.length < 4 && inp.hour != null) { const c = W.luck(M, ch, ch.daeun.list[3], 'daeun').core; out.examples.push({ chart, weapon: EL[L[0].el] + '(' + L[0].groupName + ')', daeun: M.gzName(ch.daeun.list[3]), core: c.pick ? EL[c.pick.el] + '(' + c.pick.groupName + ') ' + c.pick.pts + '점 ' + c.pick.relK : '없음', why: c.pick ? c.pick.why.map(x => x.k + (x.v > 0 ? '+' : '') + x.v) : c.cands.map(x => EL[x.el] + x.pts) }); }
  } catch (e) { fails++; if (fails < 12) console.log('✗', chart, e.message); }
}
console.log(JSON.stringify(out, null, 1).slice(0, 2500));
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'docs/weapon-analysis/v8-period.json'), JSON.stringify(out, null, 1));
console.log(fails ? `✗ ${fails}건 실패` : '✓ 시기별 핵심 역량 검사 통과 (300 + 시간 모름 300, 대운 + 세운 10년)');
process.exit(fails ? 1 : 0);
