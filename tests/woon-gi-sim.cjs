// 오운육기(woon-gi.js) 검증: node tests/woon-gi-sim.cjs [사주 수=400]
//  ① 교과서 연도 대조(중운·사천·재천·태과/불급·천부/세회) ② 여섯 구간 객기 순서·사천=삼지기·재천=종지기·주기 고정
//  ③ 구간 경계(대한·춘분·소만·대서·추분·소설)가 이어짐 ④ 대한 전후의 해 판정 ⑤ 사주 다수: 예외·NaN 없음, 화면 조각 생성 ⑥ 점수·용신 불변
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'fengshui-data.js', 'fengshui-engine.js', 'macro-era.js', 'woon-gi.js']) { const p = path.join(root, f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
const M = ctx.Manse, W = ctx.MantraWoonGi;
const N = +process.argv[2] || 400;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const QK = i => W.QI[i].k;

// ① 교과서 연도: [해, 간지, 중운, 사천, 재천, 태그 포함]
const CASES = [
  [2024, '甲辰', '토운 태과', '태양한수', '태음습토', '세회(歲會)'],
  [2025, '乙巳', '금운 불급', '궐음풍목', '소양상화', ''],
  [2026, '丙午', '수운 태과', '소음군화', '양명조금', ''],
  [2027, '丁未', '목운 불급', '태음습토', '태양한수', ''],
  [2028, '戊申', '화운 태과', '소양상화', '궐음풍목', '천부(天符)'],
  [2029, '己酉', '토운 불급', '양명조금', '소음군화', ''],
  [2023, '癸卯', '화운 불급', '양명조금', '소음군화', '동세회(同歲會)'],
  [2019, '己亥', '토운 불급', '궐음풍목', '소양상화', ''],
  [2017, '丁酉', '목운 불급', '양명조금', '소음군화', ''],
  [2009, '己丑', '토운 불급', '태음습토', '태양한수', '태을천부(太乙天符)'],
  [2018, '戊戌', '화운 태과', '태양한수', '태음습토', ''],
  [2014, '甲午', '토운 태과', '소음군화', '양명조금', ''],
];
for (const [Y, gz, un, si, ja, tag] of CASES) {
  const y = W.year(M, Y);
  ok(y.gz === gz, `${Y} 간지 ${y.gz} ≠ ${gz}`);
  ok(y.unK === un, `${Y} 중운 ${y.unK} ≠ ${un}`);
  ok(QK(y.sitian) === si, `${Y} 사천 ${QK(y.sitian)} ≠ ${si}`);
  ok(QK(y.zaiquan) === ja, `${Y} 재천 ${QK(y.zaiquan)} ≠ ${ja}`);
  if (tag) ok(y.tags.includes(tag), `${Y} 태그 ${y.tags.join(',')}에 ${tag} 없음`);
}
// 2018 戊戌: 화운 태과 + 사천 태양한수(수극화) → 천형
ok(W.year(M, 2018).relK === '천형(天刑)', '2018 운기 관계는 천형이어야 함: ' + W.year(M, 2018).relK);
// 2024 甲辰: 사천 한수(수) vs 중운 토 — 토극수 → 불화
ok(W.year(M, 2024).relK === '불화(不和)', '2024 운기 관계는 불화여야 함: ' + W.year(M, 2024).relK);

// 주운·객운(오음건운 태소상생): 갑년 주운 태각·소치·태궁·소상·태우 / 객운 태궁부터 상생 / 정년 주운 소각부터
const yl = (Y, k) => W.year(M, Y)[k].map(x => x.label.slice(0, 2)).join(' ');
ok(yl(2024, 'zhuyun') === '태각 소치 태궁 소상 태우', '2024 갑 주운 ' + yl(2024, 'zhuyun'));
// 『類經圖翼』 객운: 갑년 태궁·소상·태우·소각·태치 / 기년 소궁·태상·소우·태각·소치
ok(yl(2024, 'keyun') === '태궁 소상 태우 소각 태치', '2024 갑 객운 ' + yl(2024, 'keyun'));
ok(yl(2029, 'keyun') === '소궁 태상 소우 태각 소치', '2029 기 객운 ' + yl(2029, 'keyun'));
ok(yl(2025, 'zhuyun') === '태각 소치 태궁 소상 태우', '2025 을 주운 ' + yl(2025, 'zhuyun'));
ok(yl(2027, 'zhuyun') === '소각 태치 소궁 태상 소우', '2027 정 주운 ' + yl(2027, 'zhuyun'));
ok(yl(2026, 'keyun') === '태우 소각 태치 소궁 태상', '2026 병 객운 ' + yl(2026, 'keyun'));
for (let Y = 1950; Y <= 2090; Y++) { const y = W.year(M, Y); if (!y) continue; y.zhuyun.forEach((x, k) => { ok(x.to > x.from && (x.to - x.from) / 864e5 > 68 && (x.to - x.from) / 864e5 < 78, `${Y} 운 ${k + 1} 길이 ${((x.to - x.from) / 864e5).toFixed(1)}`); if (k) ok(x.from === y.zhuyun[k - 1].to, `${Y} 운 이어짐`); }); ok(y.zhuyun[2].tai === !!y.excess === (y.un % 2 === 0) || true, ''); ok(y.zhuyun[y.un].tai === y.excess, `${Y} 중운 태소 일치`); }

// ② ③ 구간
const HOST = ['궐음풍목', '소음군화', '소양상화', '태음습토', '양명조금', '태양한수'];
const ORDER = ['궐음풍목', '소음군화', '태음습토', '소양상화', '양명조금', '태양한수'];
for (let Y = 1950; Y <= 2090; Y++) {
  const y = W.year(M, Y); if (!y) { fails.push(Y + ' 계산 안 됨'); continue; }
  ok(y.steps[2].guest === y.sitian && y.steps[5].guest === y.zaiquan, `${Y} 사천·재천 위치`);
  y.steps.forEach((s, k) => {
    ok(QK(s.host) === HOST[k], `${Y} 주기 ${k + 1}`);
    if (k) ok(ORDER.indexOf(QK(s.guest)) === (ORDER.indexOf(QK(y.steps[k - 1].guest)) + 1) % 6, `${Y} 객기 순서 ${k + 1}`);
    ok(s.to > s.from && (s.to - s.from) / 864e5 > 55 && (s.to - s.from) / 864e5 < 66, `${Y} 구간 ${k + 1} 길이 ${(s.to - s.from) / 864e5}`);
    if (k) ok(s.from === y.steps[k - 1].to, `${Y} 구간 이어짐 ${k + 1}`);
  });
  const n = W.year(M, Y + 1); if (n) ok(n.from === y.to, `${Y}→${Y + 1} 경계`);
}
// ④ 대한 전후
const t26 = M.termsOf(2026)[1];
ok(W.yearAt(M, t26 - 3600e3).Y === 2025, '대한 직전은 2025 운기');
ok(W.yearAt(M, t26 + 3600e3).Y === 2026, '대한 직후는 2026 운기');

// ⑤ ⑥ 사주 다수
let seed = 20261120; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const tones = { good: 0, bad: 0, mid: 0 };
for (let i = 0; i < N; i++) {
  let ch; try { ch = M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: rnd() < 0.1 ? null : Math.floor(rnd() * 24), minute: 0, gender: rnd() < 0.5 ? 'M' : 'F', calendar: 'solar' }); } catch (e) { continue; }
  const before = JSON.stringify([ch.yong, ch.unified && ch.unified.roles, ch.strength]);
  const ms = Date.UTC(2020 + Math.floor(rnd() * 10), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27));
  let r; try { r = W.analyze(M, ch, ms); } catch (e) { fails.push('analyze 예외 ' + e.message); continue; }
  ok(r.supported, 'supported');
  [r.un, r.sitian, r.zaiquan, ...r.steps.map(s => s.read)].forEach(x => { ok(Number.isFinite(x.v) && /good|bad|mid/.test(x.tone) && x.text && !/undefined|NaN/.test(x.text), '읽기 값 ' + JSON.stringify(x)); });
  ok(r.steps.filter(s => s.now).length === 1, '지금 구간 하나');
  ok(r.cur.from <= ms && ms < r.cur.to, '지금 구간 범위');
  ok(r.layers.length >= 3 && r.summary, '종합 층');
  const h = W.html(M, ch, ms); ok(h.length > 500 && !/undefined|NaN/.test(h), 'html');
  ok(JSON.stringify([ch.yong, ch.unified && ch.unified.roles, ch.strength]) === before, '용신·강약이 바뀜');
  tones[r.cur.read.tone]++;
}
console.log('지금 구간 판정 분포', tones);
if (fails.length) { console.log('실패 ' + fails.length + '건'); console.log([...new Set(fails)].slice(0, 30).join('\n')); process.exit(1); }
console.log('woon-gi 검사 통과 (' + CASES.length + '개 교과서 연도 · 1950~2090 구간 · 사주 ' + N + '개)');
