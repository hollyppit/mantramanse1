// 주무기 통계·민감도:  node tools/weapon-analysis/stats.cjs  → docs/weapon-analysis/stats.json
//  · 오행별·십성별 선정 분포, 1·2순위 비율, 복합형·없음 비율
//  · 기준 민감도: 기준을 하나씩 바꿨을 때 판정(상태+오행)이 달라지는 명식 수 — 지시문 9절(가중치 근거·다른 기준의 결과 변화)
//  · 병존·간여지동의 실제 영향: 보탬 조건에서 뺐을 때 / 두 배로 셌을 때
//  · 운별 활성도 분포, 활성도 × 유리도 교차표(독립성 확인)
//  표본: 감사 dev 300 생성식(tools/luck-engine-audit-20261125/compare.cjs 와 같은 식). 엔진은 읽기만 한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const c = { console }; c.window = c; vm.createContext(c);
['engine.js', 'feature-flags.js', 'luck-grade.js', 'weapon-data.js', 'weapon.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f }));
const M = c.Manse, W = c.MantraWeapon, EL = ['목', '화', '토', '금', '수'];
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const inc = (o, k, n = 1) => o[k] = (o[k] || 0) + n, pctOf = (n, d) => Math.round(n / d * 1000) / 10;
const charts = dev.map(inp => M.compute(inp));
const base = charts.map(ch => W.analyze(M, ch));
const out = { n: dev.length, version: W.VERSION };

// 분포
const d = { status: {}, first: {}, second: {}, firstGroup: {}, secondGroup: {}, pairs: {}, conf: {}, level: {} };
base.forEach(A => { inc(d.status, A.status); const [a, b] = A.weapons; if (a) { inc(d.first, EL[a.el]); inc(d.firstGroup, a.groupName); inc(d.level, a.level); inc(d.conf, a.confidence); } if (b) { inc(d.second, EL[b.el]); inc(d.secondGroup, b.groupName); inc(d.pairs, a.groupName + '+' + b.groupName); } });
out.distribution = d;
out.ratios = { first: pctOf(base.filter(A => A.weapons.length >= 1).length, 300), second: pctOf(base.filter(A => A.weapons.length === 2).length, 300), complex: pctOf(d.status.complex || 0, 300), none: pctOf(d.status.none || 0, 300) };
out.strongestIsWeapon = pctOf(base.filter(A => A.strongest.isWeapon).length, base.filter(A => A.weapons.length).length);
out.yongIsWeapon = { same: base.filter(A => A.yong && A.yong.isWeapon).length, differ: base.filter(A => A.yong && A.weapons.length && !A.yong.isWeapon).length, weaponRole: {} };
base.forEach(A => A.weapons.forEach(w => inc(out.yongIsWeapon.weaponRole, w.role || '없음')));

// 민감도(판정이 달라지는 명식 수) — judge 를 다른 기준으로 다시 부른다(시주 있는 명식 기준)
const sig = j => W.sig(j), first = j => j.weapons[0] ? j.weapons[0].el : -1;
const baseJ = charts.map(ch => W.judge(M, ch));
const VARIANTS = {
  'forceMin 15%': { forceMin: 15 }, 'forceMin 25%': { forceMin: 25 },
  '온전함 먼저 안 봄': { intactFirst: false },
  '보탬에서 병존·간여지동 뺌': { plusKeys: ['season', 'top', 'deepRoot'] },
  '병존·간여지동 두 배': { plusKeys: ['season', 'overlap', 'overlap', 'top', 'deepRoot'] },
  '보탬에서 득령 뺌': { plusKeys: ['overlap', 'top', 'deepRoot'] },
  '보탬에서 세력 1위 뺌': { plusKeys: ['season', 'overlap', 'deepRoot'] },
  '보탬에서 깊은 뿌리 뺌': { plusKeys: ['season', 'overlap', 'top'] },
  '보탬 조건 없이 세력 %만': { plusKeys: [] },
};
out.sensitivity = Object.entries(VARIANTS).map(([name, o]) => {
  let s = 0, f = 0; const st = {};
  charts.forEach((ch, i) => { const j = W.judge(M, ch, o); inc(st, j.status); if (sig(j) !== sig(baseJ[i])) s++; if (first(j) !== first(baseJ[i])) f++; });
  return { name, changedSelection: s, changedFirst: f, status: st };
});
// 시간 모름 규칙: 12/12 유지 vs 9/12(75%) 유지
const nh = dev.map(inp => M.compute({ ...inp, hour: null, minute: null }));
const strict = nh.map(ch => W.analyze(M, ch)), loose = nh.map(ch => W.analyze(M, ch, { hourKeepAll: false }));
out.hourRule = { strict: {}, loose: {} }; strict.forEach(A => inc(out.hourRule.strict, A.status)); loose.forEach(A => inc(out.hourRule.loose, A.status));

// 병존·간여지동 실제 영향
const ov = { weaponsWithOverlap: 0, weapons: 0, overlapOnlyPlus: 0, elementsWithByeongjon: 0, byeongjonNotCore: 0, ganyeoPillars: 0, ganyeoWeapon: 0, dayGanyeo: 0, dayGanyeoWeak: 0, dayGanyeoWeaponIsDayEl: 0 };
base.forEach((A, i) => {
  A.weapons.forEach(w => { ov.weapons++; if (w.cond.overlap) ov.weaponsWithOverlap++; if (w.plus.length === 1 && w.plus[0] === 'overlap') ov.overlapOnlyPlus++; });
  A.facts.forEach(f => { const b = f.byeongjon.stem.length + f.byeongjon.branch.length; if (b) { ov.elementsWithByeongjon++; if (!f.cond.core) ov.byeongjonNotCore++; } ov.ganyeoPillars += f.ganyeo.length; if (f.ganyeo.length && A.candidates.includes(f.el)) ov.ganyeoWeapon++; });
  if (A.dayPillar.ganyeo) { ov.dayGanyeo++; if (/신약|태약|극약/.test(A.strength.zone)) ov.dayGanyeoWeak++; if (A.weapons.some(w => w.isDayEl)) ov.dayGanyeoWeaponIsDayEl++; }
});
out.overlap = ov;

// 운별 활성도·교차표
const L = { daeun: {}, seun: {}, wolun: {} }, X = { daeun: {}, seun: {}, wolun: {} }, T = { daeun: {}, seun: {}, wolun: {} };
charts.forEach(ch => {
  const tl = W.timeline(M, ch, { fromY: 2026, years: 10, wolY: 2026 });
  ['daeun', 'seun', 'wolun'].forEach(k => tl[k].forEach(r => { if (!r || !r.best) return; inc(L[k], r.best.level); const x = X[k][r.best.level] = X[k][r.best.level] || {}; inc(x, r.favor ? r.favor.n : '—'); r.best.types.forEach(t => inc(T[k], t)); }));
});
out.luckLevels = L; out.luckTypes = T; out.crosstab = X;
// 독립성 간단 지표: 켜짐 계열(강하게·켜짐) vs 나머지에서 '좋음' 비율 차
out.independence = Object.fromEntries(['daeun', 'seun', 'wolun'].map(k => {
  const on = ['strong', 'on'], tot = (lv, g) => lv.reduce((s, l) => s + ((X[k][l] || {})[g] || 0), 0), all = lv => lv.reduce((s, l) => s + Object.values(X[k][l] || {}).reduce((a, b) => a + b, 0), 0);
  const rest = Object.keys(X[k]).filter(l => !on.includes(l));
  return [k, { goodShareOn: pctOf(tot(on, '좋음'), all(on)), goodShareRest: pctOf(tot(rest, '좋음'), all(rest)), careShareOn: pctOf(tot(on, '조심'), all(on)), careShareRest: pctOf(tot(rest, '조심'), all(rest)) }];
}));
fs.writeFileSync(path.join(root, 'docs', 'weapon-analysis', 'stats.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ratios: out.ratios, first: d.first, firstGroup: d.firstGroup, sensitivity: out.sensitivity.map(s => s.name + ' ' + s.changedSelection + '/' + s.changedFirst), hourRule: out.hourRule, overlap: ov, independence: out.independence, yong: out.yongIsWeapon, strongestIsWeapon: out.strongestIsWeapon, conf: d.conf }, null, 1));
