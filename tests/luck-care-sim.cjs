// 일진 조심 신호(luck-care.js) 검증 — node tests/luck-care-sim.cjs
//  · 조심 등급(luck-grade.js metric care)인 지표만, 전체 흐름 등급과 상관없이 · 횡재운 자체는 빼고 재물손실 위험만
//  · 무엇을 조심할지 문장이 비지 않고, 좋은 쪽 문장(늘어납니다·개선)을 근거로 쓰지 않음 · 점수는 엔진 그대로
//  · 만세력(index.html)과 타임라인 캘린더(hub-saju.js)가 같은 모듈을 씀
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'luck-grade.js', 'health-body.js', 'accident-hint.js', 'luck-care.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, G = ctx.MantraLuckGrade, LC = ctx.MantraLuckCare;
let days = 0, hits = 0, flowCareDays = 0, nonCareFlowWithHits = 0, health = 0, accident = 0, loss = 0;
for (let i = 0; i < 24; i++) {
  const ch = M.compute({ year: 1955 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' });
  for (const x of M.ilun(ch, 2026, 1 + i % 12)) {
    days++;
    const r = M.evaluateDomainLuck(ch, x, 'ilun', { ms: Date.UTC(x.date[0], x.date[1] - 1, x.date[2], 3) }), list = LC.signals(M, ch, x);
    const fg = G.flow(x.ev.fitScore, M).k; if (fg === 'care') flowCareDays++; if (fg !== 'care' && list.length) nonCareFlowWithHits++;
    for (const h of list) {
      hits++;
      if (h.k === 'windfallLoss') { loss++; assert.equal(h.v, r.windfall.loss.score); assert.equal(G.metric('windfallLoss', h.v).k, 'care'); }
      else { assert.equal(h.v, r[h.k].score, '점수는 엔진 그대로 ' + h.k); assert.equal(G.metric(h.k, h.v).k, 'care', '조심 등급만 ' + h.k); }
      assert.notEqual(h.k, 'windfall', '횡재운 자체는 빼야 함');
      assert.ok(h.name && h.why && h.why.length > 4, '무엇을 조심할지 문장 ' + h.k + ' ' + h.why);
      assert.ok(!/undefined|NaN|null/.test(h.why), '깨진 값 ' + h.why);
      if (h.k === 'health') { health++; }
      if (h.k === 'accident') { accident++; }
    }
    // 조심이 아닌 지표는 하나도 나오지 않음
    for (const k of LC.KEYS) if (r[k] && G.metric(k, r[k].score).k === 'care') assert.ok(list.some(h => h.k === k), '빠진 조심 지표 ' + k);
  }
}
assert.ok(nonCareFlowWithHits > 0, '전체 흐름이 조심이 아닌 날에도 지표 조심 신호가 떠야 함');
assert.equal(LC.pickReason(['식상 기운이 들어와 결과물·실력을 드러낼 기회가 늘어납니다', '사회궁: 월지 午子충 — 일하는 환경이 움직입니다']), '사회궁: 월지 午子충 — 일하는 환경이 움직입니다');
assert.equal(LC.easy('합충형파해 긴장 85 — 업무 안정성 하락 요인'), '부딪히는 글자가 많아 업무 안정성 쪽이 흔들리기 쉬워요');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sj = fs.readFileSync(path.join(root, 'report/hub/hub-saju.js'), 'utf8');
assert.ok(/<script src="luck-care\.js(\?v=[^"]*)?"><\/script>/.test(html) && /LC\.signals\(M, S\.ch, il/.test(html), '만세력이 공용 모듈을 씀');
assert.ok(!/careBlock|LC\.signals\(|class="mc-care"/.test(sj), '타임라인 일진 캘린더에는 일진 조심 신호를 띄우지 않음(2026-11-28 사용자 요청)');
console.log(`luck-care-sim ok · 일진 ${days}일 · 조심 신호 ${hits}개(하루 평균 ${(hits / days).toFixed(1)}) · 건강 ${health}·사고수 ${accident}·재물손실 ${loss} · 전체 흐름 조심 아닌 날에 신호 ${nonCareFlowWithHits}일`);
