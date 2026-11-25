// 주무기 운세 흐름 4판·5판 검사:  node tools/weapon-analysis/luck-v4.cjs [--write]
//  · 선정 불변: 작업 사본 analyze 결과(상태·오행·유형·표시 이름)가 HEAD weapon.js 와 같다
//  · 유리도 불변: favor(흐름 등급)가 HEAD 와 같다(점수 산식·등급 그대로)
//  · 단계 ↔ 카드 일치: 단계별 첫 문장, 작용 유형(강화·보조·유지·제약)이 단계와 맞고, 강화형엔 지원 근거·제약형엔 제약 근거가 있다
//  · 유형별 분기: 오행형 '강하게 발현'은 천간+뿌리일 때만 / 십신형은 천간 단순 출현만으로 '발현' 이상이 되지 않는다
//  · 과잉 단정 금지: '과하게 쓰여요'는 주무기가 기·구신이고 천간 또는 정기 뿌리로 세질 때만
//  · 문체: 가능성 표현(…할 수 있어요·가능성·볼 만해요) 0, 금지어 0 / 대운 카드 사이 같은 활용 전략 문장 반복 0
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), assert = require('assert/strict');
const root = path.join(__dirname, '..', '..');
const mk = wsrc => { const c = { console, Date, Intl }; c.window = c; c.globalThis = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), c); ['luck-grade.js', 'ten-god-roles.js', 'aptitude-data.js', 'aptitude.js', 'weapon-data.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c)); vm.runInContext(wsrc, c); vm.runInContext(fs.readFileSync(path.join(root, 'weapon-view.js'), 'utf8'), c); return c; };
const O = mk(cp.execSync('git show HEAD:weapon.js', { cwd: root, encoding: 'utf8' })), N = mk(fs.readFileSync(path.join(root, 'weapon.js'), 'utf8'));
const EL = ['목', '화', '토', '금', '수'];
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const txt = h => String(h || '').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
const HEDGE = /할 수 있어요|될 수 있어요|있을 수 있어요|가능성이|볼 만해요|수도 있어요/;
const BAN = /성공 확률|확률이|확률로|반드시|무조건|틀림없이|천재|성공(할|합니다|한다|해요)|실패(할|합니다|한다)|운명이 정해|보장/;
const KIND_OF = { strong: 'boost', on: 'boost', shaky: 'boost', sup: 'assist', quiet: 'keep', hit: 'limit', trim: 'limit' };
const HEAD_RE = { strong: '강하게 발현돼요', on: '발현돼요', shaky: '발현되지만', sup: '받쳐 주는 힘을 얻어요', quiet: /잠재된 채 유지돼요|유지로 봐요/, hit: '제약을 받아요', trim: '조정기예요' };
const out = { counts: { level: {}, kind: {}, byType: {}, rel: {}, uf: {}, mix: {} }, fails: [], changes: { selection: 0, favor: 0 }, examples: {} };
const inc = (o, k) => o[k] = (o[k] || 0) + 1;
let fails = 0; const F = (n, e) => { fails++; if (out.fails.length < 20) out.fails.push(n + ' — ' + e.message); };
const sig = A => A.status + ':' + A.label + ':' + (A.weapons.length ? A.weapons : A.complex).map(w => EL[w.el] + w.type).join('·');
for (const inp0 of dev) for (const inp of [inp0, { ...inp0, hour: null }]) {
  const chart = `${inp.year}-${inp.month}-${inp.day} ${inp.hour == null ? '시간 모름' : inp.hour + '시'} ${inp.gender}`;
  try {
    const M = N.Manse, W = N.MantraWeapon, ch = M.compute(inp), A = W.analyze(M, ch), chO = O.Manse.compute(inp), AO = O.MantraWeapon.analyze(O.Manse, chO);
    // 선정 불변 검사는 4·5판용(--same-selection). 6판(선정 보완) 이후엔 바뀐 수만 센다
    if (sig(A) !== sig(AO)) { out.changes.selection++; if (process.argv.includes('--same-selection')) throw Error('주무기 선정이 바뀜 ' + sig(AO) + ' → ' + sig(A)); }
    const L = A.weapons.length ? A.weapons : A.complex; if (!L.length) continue;
    ch.daeun.list.forEach((p, i) => {
      const r = W.luck(M, ch, p, 'daeun'), ro = O.MantraWeapon.luck(O.Manse, chO, chO.daeun.list[i], 'daeun');
      if (JSON.stringify(r.favor) !== JSON.stringify(ro.favor)) { out.changes.favor++; throw Error('유리도 바뀜'); }
      r.acts.forEach(a => {
        const w = L.find(x => x.el === a.el);
        assert.equal(a.kind, KIND_OF[a.level], '작용 유형 ↔ 단계');
        if (a.kind === 'boost') assert.ok(a.supports.some(s => /stem|root|guk|hwa|partner|struct/.test(s.k)), '강화형인데 지원 근거 없음');
        if (a.kind === 'limit') assert.ok(a.limits.length, '제약형인데 제약 근거 없음');
        if (a.wType === 'element' && a.level === 'strong') assert.ok(a.stemSame && a.rootDepth, "오행형 '강하게'는 천간+뿌리");
        if (a.wType === 'tengod' && /strong|on|shaky/.test(a.level)) assert.ok(a.rootDepth || a.axis.exact || (w.structure || []).length || (a.partner && a.partner.tone !== 'bad'), '십신형: 천간 단순 출현만으로 발현');
        a.limits.filter(x => x.k === 'over').forEach(() => assert.ok(a.excess && (a.stemSame || a.rootDepth === '정기'), '과잉 단정 근거 부족'));
        // 5판: 발현 강도 — 이미 강한 주무기의 재강화도 그대로(오행형 천간+뿌리, 누름·합충 없으면 '강하게 발현')
        if (a.wType === 'element' && a.stemSame && a.rootDepth && !a.axis.eDown && !a.axis.relDown) assert.equal(a.level, 'strong', '재강화가 강도에 반영되지 않음');
        // 5판: 활용 유리도 — 엔진 용신 역할 그대로, 강약은 한신일 때만, 강도와 별개 필드
        const U = a.useFav, R = String(ch.unified.roles[a.el] || '').replace(/^조건부 /, '');
        assert.equal(U.role, R, '용신 역할 불일치'); assert.ok(U.why.find(x => x.k === 'zone').used === (!R || R === '한신'), '강약 이중 반영');
        inc(out.counts.uf, U.k); inc(out.counts.mix, a.kind + '×' + U.k);
        inc(out.counts.level, a.level); inc(out.counts.kind, a.kind); inc(out.counts.byType, a.wType + ':' + a.level); if (a.axis.rel) inc(out.counts.rel, a.axis.rel);
      });
    });
    // 화면: 대운 카드
    const H = N.MantraWeaponView.luck(M, ch, { part: 'daeun', curY: 2026, now: Date.UTC(2026, 10, 26) });
    const cards = (H.match(/<div class="wp-det[\s\S]*?(?=<div class="wp-det|$)/g) || []);
    const plans = new Set();
    cards.forEach((c, i) => {
      const t = txt(c), r = W.luck(M, ch, ch.daeun.list[i], 'daeun'), a = r.best;
      assert.ok(!HEDGE.test(t), '가능성 표현: ' + (t.match(HEDGE) || [])[0]);
      assert.ok(!BAN.test(t), '금지어: ' + (t.match(BAN) || [])[0]);
      const hr = HEAD_RE[a.level]; assert.ok(hr instanceof RegExp ? hr.test(t) : t.includes(hr), '첫 문장 ↔ 단계 ' + a.level);
      ['왜 이렇게 봤나요', '이렇게 써요', '자세한 명리 근거 보기', '발현 강도', '활용 유리도', '작용 근거', '운의 흐름 등급'].forEach(k => assert.ok(t.includes(k), k + ' 없음'));
      if (!a.limits.length) assert.ok(!t.includes('제약 요인'), '근거 없는 제약 칸');
      if (/strong|on/.test(a.level)) assert.ok(!/누르는 힘과|제약을 받아요/.test(t.split('②')[0]), '발현인데 첫 문장이 제약');
      const pl = (c.match(/<p class="wp-plan">([^<]*)<\/p>/) || [])[1]; assert.ok(!plans.has(pl), '대운 사이 같은 전략 문장'); plans.add(pl);
      if (!/이\(가\)|을\(를\)|과\(와\)/.test(t)) { } else throw Error('조사 표기 남음: ' + t.match(/.{6}(이\(가\)|을\(를\)|과\(와\))/)[0]);
    });
    if (cards.length && !out.examples[L[0].type] && inp.hour != null) out.examples[L[0].type] = { chart, cards: [1, 3].map(i => txt(cards[i] || '').trim()) };
  } catch (e) { F(chart, e); }
}
out.fails.length && console.log(out.fails.join('\n'));
console.log(JSON.stringify({ counts: out.counts, changes: out.changes }, null, 1));
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'docs/weapon-analysis/v4-luck.json'), JSON.stringify(out, null, 1));
console.log(fails ? `✗ ${fails}건 실패` : '✓ 운세 흐름 4·5판 검사 통과 (300 + 시간 모름 300)');
process.exit(fails ? 1 : 0);
