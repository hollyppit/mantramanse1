// 계산 출처 하나로(2026-11-20, 남은 항목 정리):  node tests/engine-single-source-sim.cjs [사주 수=200]
//  ① 직업·수익 유형(wealth-career.js scan)의 십성 재료 단계·투출·통근 = 엔진 격국 판정(gyeokCore)의 값
//  ② 궁합(compat-pair.js glyphPower)의 상대 글자 세력 = 엔진 최종 세력(계절·월령)에서 상대 일간 몫만 뺀 것
//  ③ 상세풀이 공통 데이터(sd.usefulElements)·주제 심화(topic-deep rolesOf)의 용희기구신 = 엔진 통합 용신(ch.unified)
//  ④ 엔진 결과 JSON은 그대로(gyeokCore 의 lvl·per 는 숨은 속성)
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 200, src = f => fs.readFileSync(path.join(root, f), 'utf8');
const c = { console }; c.window = c; vm.createContext(c);
['engine.js', 'compat-pair.js', 'wealth-career-data.js', 'wealth-career-data-2.js', 'wealth-career-data-3.js', 'wealth-career-jobs.js', 'wealth-career.js', 'report/v2/saju-data.js'].forEach(f => vm.runInContext(src(f), c, { filename: f }));
const M = c.Manse, W = c.MantraWealthCareer, SD = c.ReportV2.SajuData, ELK = ['목', '화', '토', '금', '수'];
const LV = { absent: 0, weak: 1, mid: 2, strong: 3 };
let n = 0;
for (let i = 0; i < N; i++) {
  const ch = M.compute({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' });
  const core = M.gyeokCore(ch);
  assert.ok(core.lvl && core.per, '엔진이 lvl·per 를 내보냄');
  assert.ok(!Object.keys(core).includes('lvl') && !Object.keys(core).includes('per'), '숨은 속성(결과 JSON 불변)');
  // ①
  const r = W.build(M, ch, {});
  r.power.forEach(p => { assert.equal(LV[p.level], core.lvl[p.tg], p.tg + ' 재료 단계 = 엔진'); assert.equal(p.touched, !!core.per[p.tg].touched, p.tg + ' 투출 = 엔진'); assert.equal(p.rooted, core.per[p.tg].hid >= 0.5, p.tg + ' 통근 = 엔진'); });
  // ③
  const sd = SD.build(ch, {});
  if (sd.usefulElements) ELK.forEach((e, k) => assert.equal(sd.usefulElements.roles[e], ch.unified.roles[k] ? String(ch.unified.roles[k]).replace(/^조건부 /, '') : null, '용희기구 = 통합 용신'));
  n++;
}
// ② 궁합: 소스가 엔진 최종 세력·일간 몫 제외를 쓰는지
const cpSrc = src('compat-pair.js');
assert.ok(/const sea = ch\.weights && ch\.weights\.seasonal;/.test(cpSrc) && /t\.pos === 'day' && t\.part === 'stem'/.test(cpSrc), '궁합 글자 세력 = 엔진 최종 세력 − 일간');
// 궁합 결과는 결정적이고 엔진 결과를 바꾸지 않는다
const a = M.compute({ year: 1990, month: 6, day: 20, hour: 22, minute: 0, gender: 'M', calendar: 'solar' }), b = M.compute({ year: 1992, month: 11, day: 3, hour: 8, minute: 0, gender: 'F', calendar: 'solar' });
const before = JSON.stringify([a.weights.pct, b.weights.pct, a.unified.roles]);
const e1 = JSON.stringify(c.PairCompat.evaluate(M, a, b, 'lover', { a: 'A', b: 'B' })), e2 = JSON.stringify(c.PairCompat.evaluate(M, a, b, 'lover', { a: 'A', b: 'B' }));
assert.equal(e1, e2, '궁합 결정성'); assert.equal(JSON.stringify([a.weights.pct, b.weights.pct, a.unified.roles]), before, '궁합이 엔진 결과를 바꾸지 않음');
// ③ 소스: 주제 심화 rolesOf 가 통합 용신 우선
assert.ok(/function rolesOf\(ch\) \{ var u = ch\.unified && ch\.unified\.roles;/.test(src('report/v2/topic-deep.js')) && /replace\(\/\^조건부 \/, ''\)/.test(src('report/v2/topic-deep.js')), 'topic-deep 통합 용신 우선(조건부 앞말 제거)');
console.log(`engine-single-source-sim PASS · 사주 ${n}명 · 직업 재료 단계·투출·통근 = 엔진 gyeokCore · 궁합 글자 세력 = 엔진 최종 세력 · 용희기구 = 통합 용신`);
