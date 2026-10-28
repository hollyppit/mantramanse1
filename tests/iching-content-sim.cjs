// 주역 콘텐츠·조합·검수 상태·품질 검사 검증 (AI·네트워크 호출 없음).
const assert = require('assert/strict');
require('../report/iching/node-loader.js');
const H = require('../report/iching/hexagrams.js');
const E = require('../report/iching/engine.js');
const K = require('../report/iching/content.js');
const { compose } = require('../report/iching/compose.js');
const { validate } = require('../report/iching/result-schema.js');
const { check } = require('../report/iching/quality.js');
const C = K.classics, M = K.modern;

// ── 원문: 64괘·386효(384효 + 용구·용육) ──
assert.equal(Object.keys(C.hexagrams).length, 64);
assert.equal(C.status, 'source-imported');
let lineCount = 0;
H.HEXAGRAMS.forEach(h => {
  const c = C.hexagrams[h.num];
  assert.ok(c.guaci && c.tuan && c.daexiang, h.num + ' 괘사·단전·대상');
  assert.equal(c.lines.length, 6);
  c.lines.forEach((l, i) => { assert.equal(l.position, i + 1); assert.ok(l.yaoci && l.xiaoxiang, h.num + ':' + (i + 1)); lineCount++; });
  assert.equal(!!c.yong, h.num <= 2, '용구·용육은 건·곤에만');
  if (c.yong) lineCount++;
});
assert.equal(lineCount, 386);
assert.ok(C.meta.source && C.meta.license && C.meta.fetchedAt, '출처·저작권 기록');

// ── 현대어 초안: 64괘 전부, 효·용 개수가 원문과 같음 ──
assert.equal(Object.keys(M).length, 64);
H.HEXAGRAMS.forEach(h => {
  const m = M[h.num];
  assert.equal(m.kw.length, 3, h.num + ' 키워드 3개');
  assert.ok(m.guaci && m.core, h.num);
  assert.equal(m.lines.length, 6);
  m.lines.forEach(t => assert.ok(t && t.length > 3));
  assert.equal(!!m.yong, h.num <= 2);
  // 사용자 노출 문장은 존댓말(…니다/…요 등)이어야 한다
  [m.guaci, m.core].concat(m.lines).forEach(t => t.split(/(?<=[.!?])\s+/).forEach(s => assert.ok(!/(이다|한다|된다|있다|없다)\.$/.test(s), h.num + ' 반말: ' + s)));
});

// ── 검수 상태: 기본은 draft → public 모드에서는 문장이 나오지 않는다 ──
const SAJU = { dayMaster: { stem: '병', el: '화' }, strength: { band: '신약' }, nowYear: 2026, daewoon: [{ startYear: 2020, endYear: 2029, ganzhi: '임인', season: 'accumulation' }], annual: { year: 2026, ganzhi: '병오' } };
const Q = { general: '올해 안에 큰 결정을 해야 하는데 지금 움직여도 될까요?', wealth: '지금 투자를 시작해도 될까요?', career: '지금 직장을 그만두고 사업을 시작해도 될까요?', love: '지금 만나는 사람과 결혼해도 될까요?' };
const NOW = '2026-10-29T00:00:00.000Z';
K.setReviewState({});
{
  const cast = E.resolve([7, 7, 9, 8, 7, 8]);
  const r = compose({ question: Q.career, category: 'career', cast }, { mode: 'public', resultId: 't', now: NOW });
  assert.equal(r.publishable, false);
  assert.ok(r.missing.length > 0);
  assert.equal(r.conclusion.summary, null, '미검수 문구는 노출되지 않는다');
  assert.equal(r.conclusion.direction, null);
  assert.equal(r.hexagram_explanation.guaci_original, null);
  assert.equal(r.final_message.text, null);
  assert.deepEqual(r.action_plan.do, []);
  assert.equal(JSON.stringify(r).includes('준비 우선'), false);
  assert.ok(validate(r).ok, validate(r).errors.join());
  // 계산값은 문장과 별개라 항상 나온다
  assert.equal(r.hexagram.num, 5); assert.equal(r.transformed_hexagram.num, 60);
}

// ── 대표 괘 3개 × 4분야 (미리보기 모드): 스키마·품질·계산 일치 ──
const SAMPLES = { 5: [7, 7, 9, 8, 7, 8], 29: [8, 7, 6, 8, 7, 8], 14: [7, 7, 7, 7, 6, 7] };
const summaries = new Set(), finals = new Set(), outs = {};
Object.entries(SAMPLES).forEach(([n, values]) => {
  const cast = E.resolve(values);
  assert.equal(cast.hexagram.num, +n);
  K.CATEGORIES.forEach(cat => {
    ['', 'saju'].forEach(withSaju => {
      const r = compose({ question: Q[cat], category: cat, cast, saju: withSaju ? SAJU : null }, { mode: 'preview', resultId: 'x', now: NOW });
      const v = validate(r); assert.ok(v.ok, n + '/' + cat + ': ' + v.errors.join(' | '));
      const q = check(r, { cast, saju: withSaju ? SAJU : null });
      assert.deepEqual(q.errors, [], n + '/' + cat + ' 품질 오류: ' + q.errors.join(' | '));
      assert.equal(r.preview, true);
      assert.equal(r.missing.length, 0, n + '/' + cat + ' 누락: ' + r.missing.join());
      assert.equal(r.saju_cross_analysis.status, withSaju ? 'ok' : 'no-saju');
      outs[n + cat + withSaju] = r;
      if (!withSaju) { summaries.add(r.conclusion.summary); finals.add(r.final_message.text); }
    });
  });
});
assert.equal(summaries.size, 12, '괘×분야마다 결론이 모두 다르다');
assert.equal(finals.size, 12, '최종 한마디도 모두 다르다');
// 같은 괘·같은 분야라도 변효 위치가 다르면 변효 해석과 확인 조건이 달라진다
for (const n of [5, 29, 14]) {
  const seen = new Set();
  for (let p = 1; p <= 6; p++) {
    const values = E.resolve(SAMPLES[n]).values.map(v => (v === 6 ? 8 : v === 9 ? 7 : v)); // 변효 제거 후
    values[p - 1] = values[p - 1] === 7 ? 9 : 6;
    const cast = E.resolve(values);
    const r = compose({ question: Q.general, category: 'general', cast }, { mode: 'preview', now: NOW });
    assert.ok(validate(r).ok); assert.deepEqual(check(r, { cast }).errors, []);
    assert.equal(r.changing_lines[0].position, p);
    seen.add(JSON.stringify([r.transformation_analysis.line_meanings, r.action_plan.check_before]));
  }
  assert.equal(seen.size, 6, n + ': 변효 위치별로 해석이 달라야 한다');
}
// 변효 0개 / 2개 / 3개 / 6개 처리
{
  const none = E.resolve([7, 7, 7, 8, 7, 8]), r0 = compose({ question: Q.wealth, category: 'wealth', cast: none }, { mode: 'preview', now: NOW });
  assert.equal(r0.transformation_analysis.status, 'none'); assert.equal(r0.transformed_hexagram, null); assert.equal(r0.transformation_analysis.statement, '변효 없음');
  assert.ok(validate(r0).ok); assert.deepEqual(check(r0, { cast: none }).errors, []);
  const two = E.resolve([9, 7, 7, 8, 9, 8]), r2 = compose({ question: Q.wealth, category: 'wealth', cast: two }, { mode: 'preview', now: NOW });
  assert.equal(r2.transformation_analysis.changing_count, 2); assert.equal(r2.transformation_analysis.rule.id, 'zhuxi-bengui-v1');
  assert.deepEqual(r2.transformation_analysis.readings.map(x => x.position), [5, 1], '위 효가 중심');
  assert.ok(validate(r2).ok); assert.deepEqual(check(r2, { cast: two }).errors, []);
  const three = E.resolve([9, 9, 9, 8, 7, 8]), r3 = compose({ question: Q.wealth, category: 'wealth', cast: three }, { mode: 'preview', now: NOW });
  assert.deepEqual(r3.transformation_analysis.readings.map(x => x.kind + x.hexagram), ['guaci' + 5, 'guaci' + three.transformedHexagram.num]);
  const six = E.resolve([9, 9, 9, 9, 9, 9]), r6 = compose({ question: Q.general, category: 'general', cast: six }, { mode: 'preview', now: NOW });
  assert.equal(r6.transformation_analysis.readings[0].label, '용구'); assert.equal(r6.conclusion.direction, '실행 검토');
  assert.ok(validate(r6).ok, validate(r6).errors.join()); assert.equal(r6.missing.length, 0);
  // 해석 모듈이 비어 있는 괘는 결론을 만들지 않고 누락으로 표시한다(모듈을 잠시 떼어 확인)
  const saved = K.packs[1].general; delete K.packs[1].general;
  const rm = compose({ question: Q.general, category: 'general', cast: six }, { mode: 'preview', now: NOW });
  assert.equal(rm.conclusion.direction, null); assert.ok(rm.missing.includes('pack:1:general')); assert.ok(validate(rm).ok, validate(rm).errors.join());
  K.packs[1].general = saved;
}
// 사주 교차: 사실 그대로, 방향이 다르면 다르다고 쓴다
{
  const r = outs['5general' + 'saju']; // 주역 준비 우선 + 대운 실력 쌓기(hold) → 공통
  assert.ok(r.saju_cross_analysis.common.length >= 1); assert.equal(r.saju_cross_analysis.facts.daewoon.ganzhi, '임인');
  const cast14 = E.resolve(SAMPLES[14]), r14 = compose({ question: Q.career, category: 'career', cast: cast14, saju: SAJU }, { mode: 'preview', now: NOW });
  assert.ok(r14.saju_cross_analysis.divergent.some(t => t.includes('방향이 다릅니다')), '주역 실행 검토 vs 대운 hold → 다른 방향 표기');
  assert.ok(r14.saju_cross_analysis.reference_judgment.includes('하나로 합치지 않고'));
  // 사주 입력은 그대로(변경 없음)
  assert.equal(SAJU.daewoon[0].ganzhi, '임인');
  const bad = Object.assign({}, SAJU, { strength: undefined }); assert.equal(compose({ question: 'q', category: 'love', cast: cast14, saju: bad }, { mode: 'preview', now: NOW }).saju_cross_analysis.status, 'no-saju');
}
// ── 검수 승인 흐름: reviewed 로 표시한 문구만 public 에 나온다 ──
{
  const cast = E.resolve(SAMPLES[5]);
  const pv = compose({ question: Q.wealth, category: 'wealth', cast }, { mode: 'preview', now: NOW });
  const approve = {}; pv.content_refs.forEach(k => { approve[k] = { status: 'reviewed', by: 'admin-test', at: NOW }; });
  // 일부만 승인하면 아직 게시 불가
  const partial = Object.assign({}, approve); delete partial['pack:5:line:3'];
  K.setReviewState(partial);
  const r1 = compose({ question: Q.wealth, category: 'wealth', cast }, { mode: 'public', now: NOW });
  assert.equal(r1.publishable, false); assert.ok(r1.missing.includes('pack:5:line:3'));
  assert.ok(validate(r1).ok);
  K.setReviewState(approve);
  const r2 = compose({ question: Q.wealth, category: 'wealth', cast }, { mode: 'public', now: NOW });
  assert.equal(r2.publishable, true, r2.missing.join()); assert.equal(r2.preview, false);
  assert.ok(validate(r2).ok); assert.deepEqual(check(r2, { cast }).errors, []);
  assert.equal(r2.conclusion.direction, '준비 우선');
  // 반려(rejected)는 어디에도 노출되지 않는다
  K.setReviewState(Object.assign({}, approve, { 'pack:5:wealth': { status: 'rejected' } }));
  assert.equal(compose({ question: Q.wealth, category: 'wealth', cast }, { mode: 'public', now: NOW }).publishable, false);
  assert.equal(compose({ question: Q.wealth, category: 'wealth', cast }, { mode: 'preview', now: NOW }).conclusion.summary, null);
  K.setReviewState({});
}
// ── 품질 검사기가 실제로 잡아내는지(음성 테스트) ──
{
  const cast = E.resolve(SAMPLES[5]), base = compose({ question: Q.wealth, category: 'wealth', cast }, { mode: 'preview', now: NOW });
  const dirty = (mut) => { const r = JSON.parse(JSON.stringify(base)); mut(r); return check(r, { cast }).errors.join('|'); };
  assert.ok(/퍼센트/.test(dirty(r => { r.final_message.text = '성공 확률은 80% 입니다.'; })));
  assert.ok(/확정 표현/.test(dirty(r => { r.final_message.text = '반드시 잘 됩니다.'; })));
  assert.ok(/지양 표현/.test(dirty(r => { r.final_message.text = '좋은 기운이 들어오고 있습니다.'; })));
  assert.ok(/존댓말/.test(dirty(r => { r.final_message.text = '지금은 기다려야 한다.'; })));
  assert.ok(/구체 날짜/.test(dirty(r => { r.action_plan.do[0] = '11월 3일에 시작하세요.'; })));
  assert.ok(/같은 문장 반복/.test(dirty(r => { r.final_message.text = r.situation_analysis.issue; })));
  assert.ok(/본괘가 계산값과 다릅니다/.test(dirty(r => { r.hexagram.num = 6; })));
  assert.ok(/변효 위치/.test(dirty(r => { r.changing_lines[0].position = 4; })));
  assert.ok(/변괘가 계산값과 다릅니다/.test(dirty(r => { r.transformed_hexagram.num = 1; })));
  assert.ok(/뒤바뀌/.test(dirty(r => { r.transformation_analysis.relation.to = '5(5)'; })));
  const withS = compose({ question: 'q', category: 'wealth', cast, saju: SAJU }, { mode: 'preview', now: NOW });
  const r = JSON.parse(JSON.stringify(withS)); r.saju_cross_analysis.facts.dayMaster = '갑';
  assert.ok(/일간/.test(check(r, { cast, saju: SAJU }).errors.join()));
  const bad = JSON.parse(JSON.stringify(base)); delete bad.final_message; assert.equal(validate(bad).ok, false);
  const bad2 = JSON.parse(JSON.stringify(base)); bad2.conclusion.direction = '대박'; assert.equal(validate(bad2).ok, false);
  const bad3 = JSON.parse(JSON.stringify(base)); bad3.action_plan.do.pop(); assert.equal(validate(bad3).ok, false);
}
// 모든 검수 키 목록(관리자 누락 현황): 64괘 × (원문 + 현대어 + 4분야 + 효 6)
assert.equal(K.allKeys().length, 64 * (2 + 4 + 6));
const cov = K.coverage(); assert.equal(cov.length, 64);
assert.equal(cov[4].general, 'draft'); assert.ok(cov.every(r => r.general === 'draft' && r.wealth === 'draft' && r.career === 'draft' && r.love === 'draft' && r.lines.every(x => x === 'draft')), '64괘 전체 해석 모듈이 draft 로 존재'); assert.equal(cov[4].classics, 'source-imported');
// ── 64괘 전체 × 4분야 × 변효 0~6 대표 조합: 스키마·품질·누락 없음, 괘별 결론·최종 한마디가 서로 다름 ──
{
  const H2 = require('../report/iching/hexagrams.js');
  const sums = {}, fins = {}, dirs = new Set(); let cases = 0;
  for (const h of H2.HEXAGRAMS) {
    const lineVals = (chg) => h.lines.map((b, i) => (chg.includes(i + 1) ? (b ? 9 : 6) : (b ? 7 : 8)));
    const casts = [[], [1], [2], [3], [4], [5], [6], [1, 4], [2, 3, 6], [1, 2, 3, 4], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6]].map(c => E.resolve(lineVals(c)));
    for (const cast of casts) for (const cat of K.CATEGORIES) {
      const r = compose({ question: Q[cat], category: cat, cast, saju: cast.changingCount % 2 ? SAJU : null }, { mode: 'preview', resultId: 'a', now: NOW });
      const v = validate(r); assert.ok(v.ok, h.num + '/' + cat + ': ' + v.errors.join(' | '));
      const q = check(r, { cast, saju: cast.changingCount % 2 ? SAJU : null }); assert.deepEqual(q.errors, [], h.num + '/' + cat + ' ' + q.errors.join(' | '));
      assert.equal(r.missing.length, 0, h.num + '/' + cat + ' 누락 ' + r.missing.join());
      cases++;
    }
    for (const cat of K.CATEGORIES) {
      const r = compose({ question: Q[cat], category: cat, cast: E.resolve(lineVals([])) }, { mode: 'preview', now: NOW });
      (sums[cat] = sums[cat] || new Set()).add(r.conclusion.summary); (fins[cat] = fins[cat] || new Set()).add(r.final_message.text); dirs.add(r.conclusion.direction);
    }
  }
  K.CATEGORIES.forEach(cat => { assert.equal(sums[cat].size, 64, cat + ': 64괘 결론이 모두 달라야 한다'); assert.equal(fins[cat].size, 64, cat + ': 최종 한마디도 모두 달라야 한다'); });
  assert.deepEqual([...dirs].sort(), ['신중한 접근', '실행 검토', '재검토', '준비 우선', '현상 유지'].sort(), '판단 방향 5종이 모두 쓰임');
  // 검수 전에는 어떤 괘도 사용자 모드에 문장이 나오지 않는다
  K.setReviewState({});
  for (const h of H2.HEXAGRAMS) { const r = compose({ question: 'q', category: 'love', cast: E.resolve(h.lines.map(b => (b ? 7 : 8))) }, { mode: 'public', now: NOW }); assert.equal(r.publishable, false); assert.equal(r.conclusion.summary, null); assert.equal(r.final_message.text, null); }
  console.log('64괘 × 4분야 × 변효 0~6 조합 ' + cases + '건 통과');
}
console.log('PASS: 원문 64괘·386효, 현대어 초안 64괘, 검수 상태 게이트(미검수 비노출·승인·반려), 대표 3괘×4분야×사주 유무 스키마·품질, 변효 0·1·2·3·6, 품질 검사기 음성 테스트');
