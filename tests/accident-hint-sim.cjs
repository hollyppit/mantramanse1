// 사고수 참고(accident-hint.js) 검증 — 독립 재계산, 다양성, 원국 불변, 네트워크·AI 미사용, 단정 표현 금지
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
const M = globalThis.Manse; let net = 0; globalThis.fetch = () => { net++; throw new Error('network'); };
const src = fs.readFileSync(path.join(root, 'accident-hint.js'), 'utf8'); vm.runInThisContext(src, { filename: 'accident-hint.js' });
const AH = globalThis.MantraAccidentHint, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const rnd = (() => { let s = 97531; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
const mk = () => { for (;;) { try { return M.compute({ year: 1900 + Math.floor(rnd() * 140), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { } } };
const N = +process.argv[2] || 200; let reads = 0, withItems = 0, kinds = {}, perChart = 0, withPos = 0;
const TITLES = AH.SCENE.map(s => s.title);
for (let n = 0; n < N; n++) {
  const ch = mk(), snap = JSON.stringify([ch.pillars, ch.weights, ch.yongAll]);
  const Y = 2020 + Math.floor(rnd() * 20), se = M.seunRange(ch, Y, Y + 5), wl = M.wolun(ch, Y), il = M.ilun(ch, Y, 1 + Math.floor(rnd() * 12));
  const units = [['seun', se[0]], ['seun', se[3]], ['wolun', wl[0]], ['wolun', wl[5]], ['ilun', il[0]], ['ilun', il[10]], ['daeun', ch.daeun.list[2]]].filter(u => u[1]);
  const tops = new Set();
  units.forEach(([kind, x]) => {
    const score = M.evaluateDomainLuck(ch, x, kind, kind === 'seun' ? { ms: x.midMs } : kind === 'wolun' ? { ms: x.startMs + 12 * 864e5 } : kind === 'ilun' ? { ms: Date.UTC(x.date[0], x.date[1] - 1, x.date[2], 3) } : {}).accident.score;
    const r = AH.read(M, ch, x, kind, score); reads++;
    ok(r.items.length <= 3, '항목 3개 초과'); ok(r.items.every((it, i) => it.score >= 1.5 && (i === 0 || r.items[i - 1].score >= it.score) && (it.level === '주의') === (it.score >= 2.5) && TITLES.includes(it.title) && it.reasons.length && it.tip), '점수·단계·구성');
    ok(JSON.stringify(r).indexOf('undefined') < 0 && !/NaN/.test(JSON.stringify(r)), 'undefined/NaN'); ok(r.caution.includes('예측') && r.caution.includes('확률'), '면책 문구');
    ok(!/(사망|죽|즉사|중상|불구|참변|반드시|틀림없)/.test(JSON.stringify(r)), '단정·극단 표현'); ok(/\d/.test(r.summary) === (score != null), '지수 표시');
    if (r.items.length) { withItems++; tops.add(r.items[0].key); kinds[r.items[0].key] = (kinds[r.items[0].key] || 0) + 1; if (r.items.some(i => i.position)) withPos++; }
    r.items.forEach(it => { ok(it.focus.length <= 2, '세부 장면 개수'); it.focus.forEach(f => { ok(f.title && f.place && f.glyph, '세부 장면 문구'); }); ok(new Set(it.focus.map(f => f.title)).size === it.focus.length, '세부 장면 중복'); const ei = ['wood', 'fire', 'earth', 'metal', 'water'].indexOf(it.key); if (ei >= 0) it.focus.forEach(f => { const SH = '甲乙丙丁戊己庚辛壬癸', BH = '子丑寅卯辰巳午未申酉戌亥'; const el = f.kind === '천간' ? M.stemEl(SH.indexOf(f.glyph)) : M.BR_EL[BH.indexOf(f.glyph)]; ok(el === ei, '세부 글자의 오행이 장면 오행과 다름'); }); if (ei >= 0) ok(it.focus.length >= 1, '오행 장면에 세부 글자가 없음'); });
    // 독립 재계산: '이미 많은 오행' 근거는 그 오행이 원국에서 32% 이상일 때만 붙는다
    r.items.forEach(it => { const ei = ['wood', 'fire', 'earth', 'metal', 'water'].indexOf(it.key); if (ei >= 0 && it.reasons.some(t => /이미 많은/.test(t))) ok(ch.weights.pct[ei] >= 32, '많은 오행 근거가 32% 미만 오행에 붙음'); if (it.reasons.some(t => /충|형|해|원진|파/.test(t) && /글자가 원국/.test(t))) ok(it.position.length > 0, '관계 근거에 기둥 위치가 없음'); });
    ok(JSON.stringify(AH.read(M, ch, x, kind, score)) === JSON.stringify(r), '같은 입력 다른 결과');
  });
  if (tops.size >= 2) perChart++;
  ok(JSON.stringify([ch.pillars, ch.weights, ch.yongAll]) === snap, '사고수 해석이 원국을 바꿈');
}
console.log(`읽기 ${reads}회 · 항목 있음 ${(withItems / reads * 100).toFixed(0)}% · 기둥 위치 표시 ${withPos}회 · 1위 장면 분포 ${JSON.stringify(kinds)} · 시기에 따라 1위가 달라지는 사주 ${(perChart / N * 100).toFixed(0)}%`);
ok(withItems / reads > 0.4, '대부분 항목 없음'); ok(withItems / reads < 0.98, '거의 항상 나옴'); ok(Object.keys(kinds).length >= 6, '장면 다양성 ' + Object.keys(kinds).length); ok(perChart / N > 0.4, '시기가 달라도 같은 1위');
ok(net === 0, 'AI·네트워크 호출'); ok(!/fetch|XMLHttpRequest/.test(src), '네트워크 코드');
console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + [...new Set(fails)].slice(0, 20).join('\n - ') : '\n모든 검증 통과'); process.exit(fails.length ? 1 : 0);
