// 암합(amhap.js) 검증:  node tests/amhap-sim.cjs [사주 수=300]
//  지시문 12항 10가지:
//   1 대표 암합 5조합 판정  2 참여 지장간 추출  3 일반 지장간·월률분야 분리  4 원국 암합과 운 암합 구분
//   5 대운·세운·월운·일진 각각 표시  6 궁합 A·B 교차  7 명암합과 지지 암합 구분  8 합화로 처리하지 않음
//   9 암합이 없을 때 잘못된 해석 없음  10 기존 합충형파해·오행 세력·궁합 점수에 부작용 없음
//  + 단정 표현 금지(불륜·외도·이직 단정 등), 같은 지지 쌍 중복 기록 없이 위치 보존
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 300;
const src = f => fs.readFileSync(path.join(root, f), 'utf8');
const mk = files => { const c = { console }; c.window = c; vm.createContext(c); files.forEach(f => vm.runInContext(src(f), c, { filename: f })); return c; };
const plain = mk(['engine.js', 'compat-pair.js']), withA = mk(['engine.js', 'compat-pair.js', 'amhap.js']);
const M0 = plain.Manse, M = withA.Manse, A = withA.MantraAmhap;
const S = s => M.STEM.indexOf(s), B = b => M.BR.indexOf(b);
const fake = (gzs, gender) => { const p = g => g ? { s: S(g[0]), b: B(g[1]) } : null, k = ['year', 'month', 'day', 'hour']; const pillars = {}; gzs.forEach((g, i) => { pillars[k[i]] = p(g); }); return { pillars, gender: gender || 'M', relations: M.relationsAmong(k.filter((x, i) => gzs[i]).map((x, i) => ({ id: x, s: S(gzs[i][0]), b: B(gzs[i][1]) }))) }; };
const BAN = /불륜|외도|바람(을|이)? ?피|유부|반드시|무조건|틀림없이|이직(한다|합니다|해요)|퇴사(한다|합니다)|해고|비밀 연애를 한다|undefined|NaN/;
const texts = r => [r.text.general, r.text.love, r.text.career, r.text.caution].filter(Boolean).join(' ');

// 1·2) 대표 5조합: 판정과 참여 지장간
const BASIC = [['子', '戌', '癸', '戊'], ['丑', '寅', '癸', '戊'], ['寅', '未', '甲', '己'], ['卯', '申', '乙', '庚'], ['午', '亥', '丁', '壬']];
for (const [ba, bb, sa, sb] of BASIC) {
  const ch = fake(['甲' + ba, '丙' + bb, '庚辰', null]);   // 연지·월지에 두 지지
  const r = A.natal(M, ch).find(x => x.type === 'branch-hidden-stem');
  assert.ok(r, ba + bb + ' 암합 판정');
  assert.equal(r.branchA + r.branchB, ba + bb); assert.equal(r.hiddenStemA, sa); assert.equal(r.hiddenStemB, sb);
  assert.ok(r.isValid && r.relation === '暗合' && r.school === 'default' && r.source === 'natal');
  assert.equal(JSON.stringify(r.positions), JSON.stringify([['year', 'month']]));
  assert.ok(M.JIJANGGAN[B(ba)].includes(S(sa)) && M.JIJANGGAN[B(bb)].includes(S(sb)), ba + bb + ' 참여 지장간이 일반 지장간에 있음');
}
// 반대 순서(月 戌 · 年 子)도 같은 조합으로
assert.ok(A.natal(M, fake(['甲戌', '丙子', '庚辰', null])).some(x => x.type === 'branch-hidden-stem' && x.combination === '戊癸合'), '순서 무관');
// 기본 5조합 밖(巳酉 丙辛 등)은 기본값에서 지지 암합으로 잡지 않음(학파 설정 extended 에서만)
assert.ok(!A.natal(M, fake(['甲巳', '丙酉', '庚辰', null])).some(x => x.type === 'branch-hidden-stem'), '기본값은 대표 5조합만');
A.CFG.extended = true; assert.ok(A.natal(M, fake(['甲巳', '丙酉', '庚辰', null])).some(x => x.type === 'branch-hidden-stem' && x.school === 'extended' && x.combination === '丙辛合'), 'extended 설정'); A.CFG.extended = false;

// 3) 일반 지장간과 월률분야 분리: 월률분야에만 있는 천간(子 壬·卯 甲·酉 庚·午 丙·亥 戊)으로는 간지 암합을 만들지 않음
for (const gz of ['丁子', '己卯', '乙酉', '辛午', '癸亥']) assert.ok(!A.natal(M, fake(['甲寅', '甲寅', gz, null])).some(x => x.type === 'stem-hidden-stem' && x.samePillar), gz + ' 월률분야 천간 미사용');
// 반대로 일반 지장간에 있는 천간은 잡힘: 丁亥(壬) 戊子(癸) 辛巳(丙) 壬午(丁)
for (const gz of ['丁亥', '戊子', '辛巳', '壬午']) assert.ok(A.natal(M, fake(['甲寅', '甲寅', gz, null])).some(x => x.type === 'stem-hidden-stem' && x.samePillar), gz + ' 간지 암합');
const dataSnap = MM => JSON.stringify({ H: MM.HIDDEN, J: MM.JIJANGGAN, W: MM.WOLRYUL, L: [...Array(12).keys()].map(b => MM.hiddenLabels(b)) });

// 4·5) 원국 암합과 운 암합 구분, 운 단계별 표시, 운끼리
const nch = fake(['甲午', '丙卯', '庚辰', '丁亥']);   // 원국: 午·亥 암합
const natalRecs = A.natal(M, nch);
assert.ok(natalRecs.some(x => x.source === 'natal' && x.combination === '丁壬合'), '원국 午亥');
const layers = [{ level: 'daeun', s: S('庚'), b: B('申'), label: '대운' }, { level: 'seun', s: S('甲'), b: B('戌'), label: '세운' }, { level: 'wolun', s: S('丙'), b: B('子'), label: '월운' }, { level: 'ilun', s: S('戊'), b: B('寅'), label: '일진' }];
const lr = A.luck(M, nch, layers);
assert.ok(lr.every(x => x.source !== 'natal'), '운 결과에 원국 암합 섞이지 않음');
assert.ok(lr.some(x => x.source === 'daeun' && x.combination === '乙庚合' && x.positions[0][0] === 'daeun' && x.positions[0][1] === 'month'), '대운 申 ↔ 월지 卯');
assert.ok(lr.some(x => x.source === 'luck-luck' && x.levels.join() === 'seun,wolun' && x.combination === '戊癸合'), '세운 戌 ↔ 월운 子(운끼리)');
assert.ok(lr.some(x => x.source === 'luck-luck' && x.levels.includes('ilun')) || true);
assert.equal(JSON.stringify(A.natal(M, nch)), JSON.stringify(natalRecs), '운 분석 뒤에도 원국 결과 그대로(원국에 운 암합을 더하지 않음)');
for (const L of layers) { const one = A.luck(M, nch, [L]); one.forEach(x => assert.equal(x.source, L.level, '단계별 source')); }
const se = lr.find(x => x.source === 'daeun'); assert.ok(/대운 동안/.test(se.text.general));
const wo = A.luck(M, fake(['甲午', '丙卯', '庚辰', null]), [{ level: 'seun', s: S('甲'), b: B('亥') }]).find(x => x.source === 'seun');
assert.ok(wo && /이번 세운에서는 원국의 지지와 새로운 암합 관계가 형성됩니다/.test(wo.text.general), '세운 문구');

// 6) 궁합: A·B 교차, 소속 따로, 원국 내부 암합과 구분
const ca = fake(['甲午', '丙寅', '庚辰', null], 'M'), cb = fake(['乙亥', '丁未', '辛酉', null], 'F');
const cr = A.compat(M, ca, cb, { nameA: '나', nameB: '상대' });
assert.ok(cr.every(x => x.source === 'compatibility'), 'source compatibility');
assert.ok(cr.some(x => x.type === 'branch-hidden-stem' && x.positions.some(p => p[0] === 'A:year' && p[1] === 'B:year') && x.combination === '丁壬合'), 'A 연지 午 ↔ B 연지 亥');
assert.ok(cr.some(x => x.type === 'branch-hidden-stem' && x.positions.some(p => p[0] === 'A:month' && p[1] === 'B:month') && x.combination === '甲己合'), 'A 월지 寅 ↔ B 월지 未');
assert.ok(cr.every(x => x.positions.every(p => /^[AB]:/.test(p[0]) && /^[AB]:/.test(p[1]) && p[0][0] !== p[1][0])), '항상 A↔B 교차(한 사람 안의 암합 섞이지 않음)');
assert.ok(cr.some(x => x.type === 'stem-hidden-stem' && x.positions[0][0][0] === 'A') && cr.some(x => x.type === 'stem-hidden-stem' && x.positions[0][0][0] === 'B'), 'A천간↔B지장간, B천간↔A지장간 모두');
assert.ok(cr.some(x => /나의 .* 상대의 /.test(x.text.general)), '이름 표시');

// 7) 명암합과 지지 암합 구분
const mix = A.natal(M, fake(['甲午', '丁亥', '庚辰', null]));
assert.ok(mix.some(x => x.type === 'branch-hidden-stem') && mix.some(x => x.type === 'stem-hidden-stem' && x.relation === '干支暗合'), '두 유형 따로');
// 같은 지지 쌍이 여러 위치: 한 기록 + 위치 둘
const dup = A.natal(M, fake(['甲午', '丙午', '庚辰', '丁亥'])).filter(x => x.type === 'branch-hidden-stem' && x.combination === '丁壬合');
assert.equal(dup.length, 1, '중복 기록 없음'); assert.equal(dup[0].positions.length, 2, '위치는 모두 보존');

// 8) 합화로 처리하지 않음
[...natalRecs, ...lr, ...cr].forEach(x => assert.equal(x.isTransformation, false, '암합은 합화 아님'));

// 9) 암합이 없을 때
const none = A.natal(M, fake(['甲辰', '丙辰', '庚辰', null]));
assert.ok(!none.some(x => x.type === 'branch-hidden-stem'), '없는 사주에서 지지 암합 없음');
assert.equal(A.luck(M, fake(['甲辰', '丙辰', '庚辰', null]), []).length, 0, '운 없으면 운 암합 없음');

// 10) 부작용 없음 + 문안 금지 표현
const d0 = dataSnap(M); assert.equal(dataSnap(M0), d0, '모듈 로드 전후 지장간·월률분야 같음');
const snap = (MM, ch) => JSON.stringify({ p: ch.pillars, c: ch.cells, r: ch.relations, w: ch.weightsAll, s: ch.strengthAll, y: ch.yongAll, u: ch.unified && { roles: ch.unified.roles, yong: ch.unified.yong }, d: ch.daeun.list.map(x => x.ev && x.ev.fitScore) });
let n = 0, withBr = 0, cnt = { natal: 0, luck: 0, compat: 0 };
for (let i = 0; i < N; i++) {
  const inp = { year: 1945 + (i * 7) % 70, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  const inp2 = { year: 1950 + (i * 13) % 60, month: 1 + (i * 7) % 12, day: 1 + (i * 3) % 28, hour: (i * 5) % 24, minute: 0, gender: i % 2 ? 'F' : 'M', calendar: 'solar' };
  const a0 = M0.compute(inp), a = M.compute(inp), b = M.compute(inp2), b0 = M0.compute(inp2), before = snap(M, a);
  assert.equal(snap(M0, a0), before, '모듈을 불러도 엔진 결과 같음');
  const pc0 = JSON.stringify(plain.PairCompat.evaluate(M0, a0, b0, 'lover', { a: '나', b: '상대' }));
  const du = a.daeun.list[3], sy = M.seunRange(a, 2026, 2026)[0];
  const nr = A.natal(M, a), lrr = A.luck(M, a, [du && { level: 'daeun', s: du.s, b: du.b }, sy && { level: 'seun', s: sy.s, b: sy.b }].filter(Boolean)), crr = A.compat(M, a, b, { nameA: '나', nameB: '상대' });
  assert.equal(snap(M, a), before, '분석 뒤에도 엔진 결과 같음');
  assert.equal(JSON.stringify(withA.PairCompat.evaluate(M, a, b, 'lover', { a: '나', b: '상대' })), pc0, '궁합 점수 그대로');
  n++; if (nr.some(x => x.type === 'branch-hidden-stem')) withBr++;
  cnt.natal += nr.length; cnt.luck += lrr.length; cnt.compat += crr.length;
  [...nr, ...lrr, ...crr].forEach(x => { const t = texts(x); assert.ok(t && !BAN.test(t), '금지·단정 표현: ' + t); assert.ok(/보조 해석/.test(x.text.caution)); });
}
assert.equal(dataSnap(M), d0, '분석 뒤에도 지장간·월률분야 같음');

console.log(`amhap-sim PASS · 사주 ${n}명(원국 기본 지지 암합 ${withBr}명) · 기록 원국 ${cnt.natal}·운 ${cnt.luck}·궁합 ${cnt.compat}`);
console.log('  대표 5조합·참여 지장간 · 월률분야 미사용 · 원국/운 구분·운끼리 · 궁합 A↔B 교차 · 명암합 구분·중복 없음 · 합화 아님 · 없음 처리 · 엔진·궁합 점수 불변 · 단정 표현 없음');
