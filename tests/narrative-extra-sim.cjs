// 얇은 장 문안 보강(report/v2/life-narrative-data-extra.js) 검증
//   node tests/narrative-extra-sim.cjs
// 보강 문장이 실제 규칙 id 에 붙는지, 금지어·명리 용어 없이 해요체인지, 서사 엔진이 원문 뒤에 붙여 본문이 늘었는지 본다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
globalThis.MANTRA_FLAGS = { lifeNarrative: true };
['life-narrative-data', 'life-narrative-data-self', 'life-narrative-data-self2', 'life-narrative-data-wealth', 'life-narrative-data-wealth2', 'life-narrative-data-love', 'life-narrative-data-love2', 'life-narrative-data-career', 'life-narrative-data-career2', 'life-narrative-data-extra', 'life-narrative'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8')));
const D = globalThis.MantraLifeNarrativeData, LN = globalThis.MantraLifeNarrative;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const BAN = /반드시|무조건|100%|보장|틀림없이|대박|성공할 거예요|다 잘될|걱정하지 마세요|운명이 정해|확실히 (?:성공|부자)/;
const JARGON = /신약|신강|관성|재성|인성|식상|비겁|정관|편관|정재|편재|식신|상관(?!없)|비견|겁재|(?<!당신 |내 )편인|정인|용신|기신|희신|격국|조후|억부|통근|일간|일지|월지|십성|오행|합충/;
const by = {}; D.RULES.forEach(r => { by[r.id] = r; });
const ids = Object.keys(D.EXTRA || {});
ok(ids.length >= 30, '보강 규칙 수가 적음: ' + ids.length);
ids.forEach(id => {
  ok(by[id], `없는 규칙 id: ${id}`);
  ['life', 'conflict', 'advice'].forEach(k => { const t = D.EXTRA[id][k]; ok(t && t.length >= 25, `${id} ${k} 비었거나 짧음`); ok(t && /요\.$/.test(t), `${id} ${k} 해요체가 아님`); ok(!BAN.test(t || ''), `${id} ${k} 금지어`); ok(!JARGON.test(t || ''), `${id} ${k} 명리 용어: ${(String(t).match(JARGON) || [])[0]}`); ok(!by[id] || !String(by[id][k]).includes(t), `${id} ${k} 원문과 같은 문장`); });
});
// 서사 엔진이 원문 뒤에 붙인다
let seed = 99; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; let hit = 0;
for (let i = 0; i < 120; i++) {
  let ch; try { ch = M.compute({ year: 1945 + Math.floor(rnd() * 75), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { continue; }
  ['timeline_self_37', 'timeline_love_06', 'timeline_career_15'].forEach(cid => {
    const r = LN.compose(M, ch, Date.UTC(2026, 10, 15, 3), cid, { state: LN.newState() }); if (!r || !D.EXTRA[r.rule]) return;
    const X = D.EXTRA[r.rule], life = (r.rows.find(x => x.stage === 'life') || {}).text || '', adv = (r.rows.find(x => x.stage === 'advice') || {}).text || '';
    if (life.includes(X.life) && adv.includes(X.advice)) hit++; else if (!/age:young/.test(JSON.stringify(Object.keys(LN.profile(M, ch, Date.UTC(2026, 10, 15, 3)).tags)))) fails.push(`${cid} ${r.rule} 보강 문장이 본문에 없음`);
  });
}
ok(hit >= 60, '보강 문장이 붙은 장이 적음: ' + hit);
if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + [...new Set(fails)].slice(0, 20).join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 보강 규칙 ${ids.length}개 × 3단계 · 금지어·용어 없음 · 본문에 붙은 장 ${hit}`);
