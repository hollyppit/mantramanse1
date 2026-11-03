// 건강 측면 참고(health-body.js) 검증 — 규칙 독립 재계산, 다양성, 원국 불변, 네트워크·AI 미사용, 진단 표현 금지
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
const M = globalThis.Manse; let net = 0; globalThis.fetch = () => { net++; throw new Error('network'); };
const src = fs.readFileSync(path.join(root, 'health-body.js'), 'utf8'); vm.runInThisContext(src, { filename: 'health-body.js' });
const HB = globalThis.MantraHealthBody, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const rnd = (() => { let s = 13579; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
const mk = () => { for (;;) { try { return M.compute({ year: 1900 + Math.floor(rnd() * 140), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { } } };
const N = +process.argv[2] || 200; let reads = 0, withItems = 0, topKinds = {}, perChartTops = 0, reliefN = 0;
const ORG = HB.PART.map(p => p.organ);
for (let n = 0; n < N; n++) {
  const ch = mk(), snap = JSON.stringify([ch.pillars, ch.weights, ch.yongAll, ch.climate]);
  const Y = 2020 + Math.floor(rnd() * 20), seuns = M.seunRange(ch, Y, Y + 5), wl = M.wolun(ch, Y), il = M.ilun(ch, Y, 1 + Math.floor(rnd() * 12));
  const units = [['seun', seuns[0]], ['seun', seuns[3]], ['wolun', wl[0]], ['wolun', wl[5]], ['ilun', il[0]], ['ilun', il[10]], ['daeun', ch.daeun.list[2]]].filter(u => u[1]);
  const tops = new Set();
  units.forEach(([kind, x]) => {
    const r = HB.read(M, ch, x, kind); reads++;
    ok(r.items.length <= 3, '항목 3개 초과'); ok(r.items.every((it, i) => it.score >= 1.5 && (i === 0 || r.items[i - 1].score >= it.score) && ['주의', '참고'].includes(it.level) && (it.level === '주의') === (it.score >= 2.5)), '점수·단계');
    r.items.forEach(it => ok(it.reasons.some(t => !/^원국/.test(t)), '이 시기 근거 없이 원국 근거만으로 항목이 나옴'));
    r.items.forEach(it => { ok(ORG.includes(it.organ) && it.reasons.length && it.reasons.every(t => typeof t === 'string' && !/undefined|NaN|\(가\)|\(과\)/.test(t)), '근거 문장'); });
    ok(typeof r.summary === 'string' && !/undefined|NaN/.test(r.summary), '요약'); ok(r.caution.includes('진단') && r.caution.includes('의료기관'), '면책 문구');
    ok(!/(암|뇌졸중|심근경색|당뇨병|우울증|수술|사망|죽)/.test(JSON.stringify(r)), '질병·사망 단정 표현');
    if (r.items.length) { withItems++; tops.add(r.items[0].el); topKinds[r.items[0].el] = (topKinds[r.items[0].el] || 0) + 1; }
    if (r.relief.length) reliefN++;
    // 독립 재계산 ①: 원국에 많은 오행(≥32%)과 같은 천간 오행이면 그 장부는 반드시 항목에 포함(원국 쏠림 1.0 + 더함 1.2 ≥ 2.2 + 천간 외 가산 없이도 ≥1.5)
    const le = M.stemEl(x.s), pct = ch.weights.pct; if (pct[le] >= 32) ok(r.items.some(it => it.el === le), '많은 오행을 더하는 운이 누락');
    ok(JSON.stringify(HB.read(M, ch, x, kind)) === JSON.stringify(r), '같은 입력 다른 결과');
  });
  if (tops.size >= 2) perChartTops++;
  ok(JSON.stringify([ch.pillars, ch.weights, ch.yongAll, ch.climate]) === snap, '건강 해석이 원국을 바꿈');
}
console.log(`읽기 ${reads}회 · 항목 있음 ${(withItems / reads * 100).toFixed(0)}% · 1위 오행 분포 ${JSON.stringify(topKinds)} · 시기에 따라 1위가 달라지는 사주 ${(perChartTops / N * 100).toFixed(0)}% · 도움 문구 ${reliefN}회`);
ok(withItems / reads > 0.5, '대부분의 시기에 항목이 없음'); ok(withItems / reads < 0.98, '거의 모든 시기에 항목이 나옴(변별력 부족)'); ok(Object.keys(topKinds).length === 5, '오행 5가지가 모두 1위로 나와야 함'); ok(perChartTops / N > 0.5, '시기가 달라도 1위가 같은 사주가 많음');
ok(net === 0, 'AI·네트워크 호출'); ok(!/fetch|XMLHttpRequest/.test(src), '네트워크 코드');
console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + [...new Set(fails)].slice(0, 20).join('\n - ') : '\n모든 검증 통과'); process.exit(fails.length ? 1 : 0);
