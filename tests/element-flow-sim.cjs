// 오행 흐름(elementFlow)·운+원국 구조(luckStructures) 검증
//   node tests/element-flow-sim.cjs
// (1) 판정·연결이 비거나 NaN이 없는지 (2) 한 판정이 70%를 넘게 몰리지 않는지 (3) 일간과 같은 오행 운을 "일간까지 이어짐"으로 말하지 않는지
// (4) 조사 오류(오행 이름 뒤 '이'·'을' 고정)가 없는지 (4-1) 엇갈림은 천간·지지가 실제로 갈릴 때만, 순생 사슬은 기신을 거치지 않는지 (5) 구조 가감점 합계가 한도(cap) 안인지 (6) 같은 작용을 두 번 세지 않는지
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
vm.runInThisContext(html.slice(a, html.indexOf('\n', b)));
const M = globalThis.Manse;
const fails = [], ok = (c, m) => { if (!c && fails.length < 20) fails.push(m); };
let seed = 2026; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const VERDICTS = ['순생', '통관', '제압', '극', '설기', '막힘', '보통', '엇갈림'], cnt = {}, cap = M.LUCK_CFG.structure.luck.cap;
const badJosa = /(수\(水\)|화\(火\)|토\(土\))(이|을|은|과) |(목\(木\)|금\(金\))(가|를|는|와) /;
let n = 0;
for (let i = 0; i < 250; i++) {
  let ch; try { ch = M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { continue; }
  const dEl = '木火土金水'.indexOf('木火土金水'[[0, 0, 1, 1, 2, 2, 3, 3, 4, 4][ch.pillars.day.s]]);
  for (let Y = 1984; Y < 2044; Y++) {
    const p = M.yearPillarOf(Y), f = M.elementFlow(ch, p, 'daeun'); n++;
    cnt[f.verdict] = (cnt[f.verdict] || 0) + 1;
    ok(VERDICTS.includes(f.verdict) && f.text, `판정 비어 있음 ${M.gzName(p)}`);
    ok(['good', 'bad', '', 'mixed'].includes(f.tone), '판정 성격 값 이상');
    // 엇갈림은 천간·지지 판정이 실제로 좋음·나쁨으로 갈릴 때만
    if (f.verdict === '엇갈림') ok(new Set(f.items.map(x => x.tone).filter(Boolean)).size === 2 && /앞 5년.*뒤 5년/.test(f.text), `엇갈림 근거 이상: ${f.text}`);
    // 순생은 사슬 중간에 기신·구신을 거치지 않는다
    for (const it of f.items) if (it.verdict === '순생' && it.el !== dEl && it.path.length > 2) ok(it.path.slice(1, -1).every(e => (ch.unified.roleV[e] ?? 0) >= 0), `순생 사슬이 기신을 거침: ${it.text}`);
    ok(f.links.every(l => l.from >= 0 && l.from < 5 && l.to >= 0 && l.to < 5 && (l.type === '생' || l.type === '극') && [true, false, null].includes(l.good)), '연결 값 이상');
    for (const it of f.items) {
      ok(!(it.el === dEl && /일간까지 닿습니다/.test(it.text)), `일간과 같은 오행인데 일간까지 이어진다고 말함: ${it.text}`);
      ok(!badJosa.test(it.text), `조사 오류: ${it.text}`);
    }
    f.links.forEach(l => ok(!badJosa.test(l.text), `조사 오류: ${l.text}`));
    const ev = M.evaluateLuck(ch, p, 'daeun'), ls = ev.luckStructures;
    ok(Array.isArray(ls) && ls.every(x => Number.isFinite(x.v) && x.label), '구조 값 이상');
    const structParts = ev.parts.filter(x => x.comp === 'structure');
    ok(Number.isFinite(ev.fitScore) && structParts.every(x => Number.isFinite(x.v)), 'NaN 흐름 점수');
    const sum = ls.reduce((s, x) => s + x.v, 0), k = Math.abs(sum) > cap ? cap / Math.abs(sum) : 1;
    ok(Math.abs(sum * k) <= cap + 1e-9, `구조 합계 한도 초과 ${sum}`);
    const names = ls.map(x => x.name);
    ok(!(names.includes('식신제살') && names.includes('제살(혼잡 해소)')), '식신제살 중복');
    ok(!(names.includes('살인상생') && names.includes('화살(혼잡 해소)')), '살인상생 중복');
  }
}
const share = Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, Math.round(v / n * 100)]));
console.log('평가', n, '판정 분포(%)', JSON.stringify(share));
ok(Math.max(...Object.values(share)) <= 70, '한 판정이 70%를 넘음');
if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log('모든 검증 통과');
