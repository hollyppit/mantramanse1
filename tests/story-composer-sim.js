// Story Composer(새 문체 카드) 검증:  node tests/story-composer-sim.js
// 6개 주제 × 5개 십성군 전부에서 장면이 만들어지는지 · 한 장면 한 주장(짧은 글) · 전문용어/단정/공포 문구가 없는지 · 같은 사주는 같은 결과인지 확인한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'story-director', 'story-composer'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report', 'v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, C = R.StoryComposer, D = R.StoryDirector;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const BANNED = /(반드시|무조건|확정|100%|틀림없|운명이|우주의|특별한 사람|무한한 가능성|곧 좋은 일|파산|이혼|사망)/;
const JARGON = /(비겁|식상|재성|관성|인성|편관|정관|식신|상관|통근|신강|신약|용신|오행)/; // 장면 본문에는 쓰지 않는다(근거 영역만 허용)
const seen = {}; let seed = 99; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const sds = [];
while (Object.keys(seen).length < 5 || sds.length < 40) {
  try { const ch = M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', leap: false, city: '서울' }); const sd = R.SajuData.build(ch, { now: Date.UTC(2026, 9, 6) }); seen[sd.dominantGroup] = 1; sds.push(sd); } catch (e) { }
  if (sds.length > 600) break;
}
ok(Object.keys(seen).length === 5, '다섯 십성군을 모두 만남: ' + Object.keys(seen));
const ids = Object.keys(C.MOD); ok(ids.length === 6, '주제 6개');
let n = 0;
sds.forEach(sd => ids.forEach(id => {
  const sc = C.scenes(id, sd); n += sc.length;
  ok(sc.length >= 8 && sc.length <= 11, `${id}/${sd.dominantGroup}: 장면 수 ${sc.length}`);
  ok(['concl', 'real', 'ex', 'pro', 'trap', 'act'].every(k => sc.some(x => x.kind === k)), `${id}/${sd.dominantGroup}: 구조(결론·현실·예시·장점·함정·행동) 누락`);
  sc.forEach(x => { ok(x.text && x.text.length <= 90, `${id}/${sd.dominantGroup}: 한 장면이 너무 김(${x.text.length}): ${x.text.slice(0, 20)}`); ok(!BANNED.test(x.text + x.cap), `${id}/${sd.dominantGroup}: 금지 문구 ${x.text}`); ok(!JARGON.test(x.text + x.cap), `${id}/${sd.dominantGroup}: 전문용어 ${x.text}`); ok(!/undefined|NaN/.test(x.text + x.cap), '빈 값'); });
  const again = JSON.stringify(C.scenes(id, sd)); ok(again === JSON.stringify(sc), '같은 사주는 같은 결과');
  ok(C.evidence(id, sd).length >= 4, '근거 항목');
}));
// 직장인/프리랜서/사업자 예시는 돈·일 주제에서 필요한 2개만
const a = C.scenes('money_nature', sds.find(s => s.strength.band === '신강') || sds[0]).filter(x => x.kind === 'ex');
ok(a.length === 2 && /직장인이라면/.test(a[0].text), '돈 주제 예시 2개(직장인 포함)');
// 개인화 순서: 방어·전환기엔 올해·앞날이 앞으로, 기회기엔 "언제" 카드가 앞으로
const base = D.flow('money').order, def = D.flow('money', { pos: { seasonKey: 'defense' } }), opp = D.flow('money', { pos: { seasonKey: 'opportunity' } });
ok(def.order.indexOf('future_year') < base.indexOf('future_year') && def.steps.some(s => s.note), '방어기: 올해 이야기를 앞으로');
ok(opp.order.indexOf('money_timing') < base.indexOf('money_timing'), '기회기: 돈의 때를 앞으로');
ok(def.order.slice().sort().join() === base.slice().sort().join() && def.steps.filter(s => s.free && s.kind !== 'life' && s.kind !== 'here' && s.id !== 'act_remedy').length === 1, '순서만 바뀌고 구성·무료 체험 규칙은 같음');
console.log(`장면 ${n}개 검사 (${sds.length}명 × 6주제)`);
console.log(C.scenes('money_nature', sds[0]).map(x => `  [${x.cap}] ${x.text}`).join('\n'));
if (fails.length) { console.log('\n실패 ' + fails.length + '건'); [...new Set(fails)].slice(0, 25).forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\n모두 통과');
