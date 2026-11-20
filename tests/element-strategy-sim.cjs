// 오행별 실전 전략(element-strategy.js) 검증:  node tests/element-strategy-sim.cjs [사주 수=300]
//  지시문 11항(13가지)·직업 9항: 기존 수익 유형·직업 목록·순위 불변 · 용신=핵심/희신=확장/기신·구신=주의가 엔진 통합 용신 역할과 일치 ·
//  부족 오행≠용신 혼동 없음 · 과다≠자동 기신 · 억부·조후 근거 보존 · 주의 문장에 금지·단정 표현 없음 · 운 분야 7개 문장 중복 없음 ·
//  대인구설은 간지 충돌과 연결 · 횡재는 당첨·투기 아님 · 시기별로 전략이 달라짐 · 엔진 점수 불변
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 300;
const WC = ['wealth-career-data.js', 'wealth-career-data-2.js', 'wealth-career-data-3.js', 'wealth-career-jobs.js', 'wealth-career.js'];
const mk = files => { const c = { console }; c.window = c; vm.createContext(c); files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f })); return c; };
const W = mk(['engine.js', ...WC, 'element-strategy.js']), P = mk(['engine.js', ...WC]);
const M = W.Manse, S = W.MantraElementStrategy, J = x => JSON.stringify(x);
const BAN = /반드시|무조건|절대|피하세요|하지 마세요|금지|성공합니다|보장|당첨될|대박|하세요\.$|천직/;
const KEYS = S.LUCK_KEYS, cases = { yongNeHee: null, lackNeYong: null, eokNeJo: null, overNotGi: null };
let n = 0, socialClash = 0, variety = 0;
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  const ch = M.compute(inp), ch0 = P.Manse.compute(inp);
  const snap = c => J({ w: c.weights.pct, st: c.strength, u: c.unified.roles, d: c.daeun.list.map(x => x.ev.fitScore) });
  const before = snap(ch);
  // 1) 기존 수익 유형·직업 목록·순위 그대로(모듈이 있어도 없어도 같은 결과)
  const r = W.MantraWealthCareer.build(M, ch, {}), r0 = P.MantraWealthCareer.build(P.Manse, ch0, {});
  assert.equal(J({ t: r.s1.primary && r.s1.primary.id, s: r.s1.secondary.map(x => x.id), jobs: r.s3.jobs.map(j => [j.rank, j.id]) }), J({ t: r0.s1.primary && r0.s1.primary.id, s: r0.s1.secondary.map(x => x.id), jobs: r0.s3.jobs.map(j => [j.rank, j.id]) }), '수익 유형·직업 순위 불변');
  // 2·6) 역할 일치: 용신=핵심, 희신=확장, 기신·구신=주의(엔진 통합 용신 그대로, 재판정 없음)
  const nt = S.natal(M, ch), roles = ch.unified.roles;
  const yong = [0, 1, 2, 3, 4].filter(e => roles[e] === '용신'), hee = [0, 1, 2, 3, 4].filter(e => roles[e] === '희신');
  if (yong.length) assert.equal(nt.core.el, yong[0], '핵심 전략 = 용신'); else assert.equal(nt.core, null);
  assert.equal(J(nt.expand.map(x => x.el).sort()), J(hee.sort()), '확장 전략 = 희신');
  assert.equal(J(nt.caution.map(x => x.el).sort()), J([0, 1, 2, 3, 4].filter(e => roles[e] === '기신' || roles[e] === '구신').sort()), '주의 전략 = 기신·구신');
  nt.caution.forEach(x => assert.equal(roles[x.el], x.role));
  if (nt.core) assert.ok(!nt.expand.some(x => x.el === nt.core.el), '용신과 희신 역할 구분');
  // 3·4) 부족·과다는 참고 정보: 역할을 그대로 적을 뿐 용신·기신으로 바꾸지 않음
  nt.ref.lack.forEach(x => assert.equal(x.role, roles[x.el])); nt.ref.over.forEach(x => assert.equal(x.role, roles[x.el]));
  if (yong.length && nt.ref.lack.length && !nt.ref.lack.some(x => x.el === yong[0]) && !cases.lackNeYong) cases.lackNeYong = { inp, lack: nt.ref.lack.map(x => x.elName), yong: nt.core.elName };
  if (nt.ref.over.some(x => x.role !== '기신' && x.role !== '구신') && !cases.overNotGi) cases.overNotGi = { inp, over: nt.ref.over.map(x => x.elName + '=' + (x.role || '한신')) };
  if (yong.length && hee.length && !cases.yongNeHee) cases.yongNeHee = { inp, yong: nt.core.elName, hee: nt.expand.map(x => x.elName) };
  // 5) 억부·조후 근거 보존
  const Y = ch.yongAll;
  if (Y.eokbu.applicable && Y.eokbu.yong != null) assert.ok(nt.basis.some(t => t.includes('억부') && t.includes(M.EL_K[Y.eokbu.yong])), '억부 근거');
  if (Y.johu.applicable && Y.johu.yong != null) assert.ok(nt.basis.some(t => t.includes('조후') && t.includes(M.EL_K[Y.johu.yong])), '조후 근거');
  if (Y.eokbu.applicable && Y.johu.applicable && Y.eokbu.yong !== Y.johu.yong && !cases.eokNeJo) cases.eokNeJo = { inp, eokbu: M.EL_K[Y.eokbu.yong], johu: M.EL_K[Y.johu.yong], final: nt.core && nt.core.elName, basis: nt.basis };
  // 7) 금지·단정 표현 없음
  [nt.core && nt.core.text, ...nt.expand.map(x => x.text), ...nt.caution.map(x => x.text)].filter(Boolean).forEach(t => assert.ok(!BAN.test(t), '단정·금지 표현: ' + t));
  // 직업: 용신·희신 활용이 역할과 일치, 순위 데이터는 건드리지 않음
  r.s3.jobs.forEach(j => { const o = S.job(M, ch, j); if (yong.length) assert.ok(o.yongUse.includes('용신 ' + M.EL_K[yong[0]]), '직업 용신 활용'); if (hee.length) assert.ok(hee.every(e => o.heeUse.includes('희신 ' + M.EL_K[e])), '직업 희신 확장'); [o.yongUse, o.heeUse, o.caution].forEach(t => assert.ok(!BAN.test(t || ''), '직업 문장 ' + t)); });
  // 8~11) 운 분야 7개
  const seen = new Set();
  const se = M.seunRange(ch, 2024, 2030);
  for (const x of [ch.daeun.list[3], ...se].filter(Boolean)) {
    const kind = x.year ? 'seun' : 'daeun', per = KEYS.map(k => S.luck(M, ch, x, kind, k));
    const acts = per.map(o => o.actions.join(' '));
    assert.equal(new Set(acts.slice(0, 4)).size, 4, '취업·이직·직업·사업 문장 서로 다름');
    per.forEach(o => { o.inflow.forEach(f => assert.equal(f.role, roles[f.el] || '한신', '들어오는 오행 역할 = 엔진 역할')); [...o.actions, ...o.cautions].forEach(t => assert.ok(!BAN.test(t), o.key + ' 단정 표현: ' + t)); });
    const wf = per[KEYS.indexOf('windfall')]; assert.ok(/당첨이나 투기 수익을 기대하는 신호로 보지 않아요/.test(wf.actions.join(' ')) && wf.cautions.some(t => /한도/.test(t)), '횡재: 당첨·투기 아님');
    const so = per[KEYS.indexOf('social')]; if (/ · 원국과 /.test(so.basis.join(' '))) { socialClash++; assert.ok(so.cautions.some(t => /문서로 확인/.test(t)), '대인구설: 원국 충돌과 연결'); }
    const nb = per[KEYS.indexOf('noble')]; assert.ok(nb.basis.length >= 2, '귀인: 간지·점수 근거');
    // 용신이 들어와도 흐름 점수가 낮거나 충돌이 있으면 '주의'를 함께
    per.forEach(o => o.inflow.forEach(f => { if (f.state === 'mixed') assert.ok(o.cautions.some(t => t.includes('서두르지')), '용희신이어도 조건 반영'); }));
    seen.add(per[0].actions.join(''));
  }
  if (seen.size > 1) variety++;
  assert.equal(snap(ch), before, '엔진 결과 불변');
  n++;
}
assert.ok(variety / n > 0.5, '시기에 따라 전략이 달라짐 ' + variety + '/' + n);
assert.ok(socialClash > 0, '대인구설 충돌 사례 있음');
for (const k of Object.keys(cases)) assert.ok(cases[k], '사례 찾음: ' + k);
console.log(`element-strategy-sim PASS · 사주 ${n}명 · 수익 유형·직업 순위 불변 · 용희기구=엔진 역할 · 운 분야 7개 · 시기별로 전략이 바뀐 사주 ${variety}명 · 대인구설 충돌 연결 ${socialClash}건`);
console.log('  용신≠희신:', J(cases.yongNeHee));
console.log('  부족 오행≠용신:', J(cases.lackNeYong));
console.log('  과다 오행이 기신 아님:', J(cases.overNotGi));
console.log('  억부≠조후:', J({ inp: cases.eokNeJo.inp, eokbu: cases.eokNeJo.eokbu, johu: cases.eokNeJo.johu, final: cases.eokNeJo.final }));
