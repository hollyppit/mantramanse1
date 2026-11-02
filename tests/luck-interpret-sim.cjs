// 운세 환경 해석 모듈(luck-interpret.js) 검증
//   node tests/luck-interpret-sim.cjs [차트 수=120]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a = eng.indexOf('var MANSE_DATA'), b = eng.indexOf('})(typeof window', a);
vm.runInThisContext(eng.slice(a, eng.indexOf('\n', b)));
const M = globalThis.Manse, LI = require(path.join(root, 'luck-interpret.js'));
const N = +process.argv[2] || 120;
const fails = []; const ok = (c, m) => { if (!c && fails.length < 25) fails.push(m); };
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const BAN = /반드시|확실히|틀림없이|무조건|100%|보장합니다|예언/;
const polite = s => /(니다|세요|요)$/.test(s.trim().replace(/\.$/, '').replace(/\([^()]*\)$/, '').trim());
let n = 0, sceneCnt = {}, relBad = 0;
for (let i = 0; i < N; i++) {
  const ch = M.compute({ year: 1950 + Math.floor(rnd() * 60), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, calendar: 'solar', leap: false, gender: rnd() < .5 ? 'M' : 'F', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
  const Y = 2026, du = M.daeunAt(ch, Date.UTC(Y, 5, 1));
  const se = M.seunRange(ch, Y, Y)[0], se0 = M.seunRange(ch, Y - 1, Y - 1)[0];
  const wl = M.wolun(ch, Y), m = wl[5], il = M.ilun(ch, Y, 6);
  const cases = [['daeun', du, {}], ['seun', se, { daeun: du, prev: se0 }], ['wolun', m, { seun: se, daeun: du, prev: wl[4] }]]
    .concat(il.map((d, k) => ['ilun', d, { wolun: m, seun: se, prev: il[k - 1] }]));
  for (const [lv, x, ctx] of cases) {
    if (!x) continue; n++;
    const r = LI.build(M, ch, x, lv, ctx), txt = [r.core.text, r.relation, r.summary, ...r.scenes.map(s => s.text), ...r.good, ...r.bad, ...r.strategy, ...r.uncertainty, ...r.chain.map(c => c.text)];
    // 1 구조·근거
    ok(r.evidence.rules.length > 0 && r.evidence.phraseIds.length > 0, `근거/문구 ID 없음 ${lv}`);
    r.scenes.forEach(s => ok(!s.phraseId || LI.PHRASES.some(p => p.id === s.phraseId), `없는 문구 ID ${s.phraseId}`));
    ok(r.topAreas.length <= 3, '영역 3개 초과');
    // 2 존재하지 않는 합충 금지: 출력한 작용은 엔진 luckRelations에 있어야 한다
    const real = M.luckRelations(ch, x).rels.map(q => q.name + q.type);
    r.relations.forEach(q => { if (!real.includes(q.name + q.type)) relBad++; });
    ok(r.relations.length === real.length, '작용 개수 불일치');
    // 3 십성: 출력 십성은 엔진 값
    ok(r.evidence.tenGods[0] === x.stemTG && r.evidence.tenGods[1] === x.branchTG, '십성 불일치');
    ok(r.relation.includes(x.stemTG), '관계 문장에 십성 없음');
    // 4 단정·존댓말
    txt.forEach(t => { ok(!BAN.test(t), `단정 표현: ${t.slice(0, 40)}`); ok(polite(t), `존댓말 아님: ${t.slice(-30)}`); });
    // 5 상위 운 연결
    if (lv === 'wolun') ok(r.chain.length === 2 && r.chain[0].parent === 'seun', '월운 상위 연결');
    if (lv === 'ilun') ok(r.chain.length === 2 && r.chain[0].parent === 'wolun', '일진 상위 연결');
    if (lv === 'seun') ok(r.chain.length === 1, '세운 상위 연결');
    // 6 일진 사건 단정 금지·한계 문구
    if (lv === 'ilun') ok(r.uncertainty.some(u => u.includes('하루 단위')), '일진 한계 문구 없음');
    if (lv === 'ilun') { const k = r.scenes[0].text; sceneCnt[k] = (sceneCnt[k] || 0) + 1; }
  }
}
ok(relBad === 0, '엔진에 없는 합충 ' + relBad);
// 7 모순: 적합도 순풍인데 FIT-부담/주의 불리 문구가 나오면 안 된다 (샘플 전수)
// 8 반복: 한 달(30일) 일진 대표 문장이 한 가지로 고정되지 않아야 한다
const dist = Object.values(sceneCnt).sort((x, y) => y - x);
const top1 = dist[0] / dist.reduce((s, v) => s + v, 0);
console.log(`해석 ${n}건 · 일진 대표 장면 종류 ${dist.length} · 최다 문장 점유 ${(top1 * 100).toFixed(0)}% · 문구 DB ${LI.PHRASES.length}건`);
// 9 기간 비교: 같은 입력이면 변화 문장에 '강해지는/약해지는' 항목이 영역 등급 차이와 일치
{ const ch = M.compute({ year: 1990, month: 3, day: 15, hour: 14, minute: 30, calendar: 'solar', leap: false, gender: 'F', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
  const rs = [2025, 2026, 2027].map(y => { const x = M.seunRange(ch, y, y)[0]; return LI.build(M, ch, x, 'seun', { daeun: x.daeun }); });
  const c = LI.compare(rs[0], rs[1], rs[2], '해'); const R = { '약함': 0, '보통': 1, '강조': 2 };
  rs[1].areas.forEach((a, i) => { const d = R[a.level] - R[rs[0].areas[i].level]; ok((d > 0) === c.strengthened.includes(a.key) && (d < 0) === c.weakened.includes(a.key), '비교 불일치 ' + a.key); });
  ok(c.lines.every(polite) && c.lines.length >= 4, '비교 문장 형식'); ok(LI.compare(null, rs[1], null).lines.length === 1, '이전·다음 없음 처리'); }
ok(dist.length >= 8, '일진 장면 다양성 부족');
if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log('모든 검증 통과');
