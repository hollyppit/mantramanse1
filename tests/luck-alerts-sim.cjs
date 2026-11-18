// 뚜렷한 신호 자동 알림(luck-alerts.js) 검증 — node tests/luck-alerts-sim.cjs [사주 수=80]
//  · 드물게: 그 사람 일진 분포 상위·하위 2%이면서 신호등 최고·부담일 때만 → 분야별로 날짜의 5% 이하만 신호
//  · 점수는 엔진 evaluateDomainLuck 그대로 · 횡재수는 좋은 신호만, 손재수는 주의 신호만 · 최대 개수 지킴 · 같은 분야 한 번
//  · 같은 날이라도 사람마다 다름 · 금지 표현 없음 · 엔진 결과 불변 · 화면·스위치 연결
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 80, J = JSON.stringify;
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'report/hub/timeline-graph.js', 'luck-alerts.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, A = ctx.MantraLuckAlerts, TG = ctx.MantraTLGraph;
const BAN = /반드시|무조건|100% (확실|보장)|틀림없|확정|대박|대흉|망한다|undefined|NaN/;
const T = Date.UTC(2026, 10, 18, 3);
let n = 0, totTl = 0, totMs = 0, flagged = 0, judged = 0, people = new Set();
const sides = { good: 0, bad: 0 };
for (let i = 0; i < N; i++) {
  let ch; try { ch = M.compute({ year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' }); } catch (e) { continue; } n++;
  const snap = J(ch.daeun.list.map(x => x.ev.fitScore));
  const tl = A.scan(M, ch, { set: 'timeline', now: T, max: 3 }), ms = A.scan(M, ch, { set: 'manse', now: T, max: 4, sigMetric: TG.sigMetric });
  assert.ok(tl.length <= 3 && ms.length <= 4, '최대 개수');
  totTl += tl.length; totMs += ms.length; people.add(J(ms.map(a => a.key + a.side + a.when)));
  for (const a of tl.concat(ms)) {
    sides[a.side]++;
    assert.ok(A.SETS.manse.concat(A.SETS.timeline).includes(a.key), '분야 ' + a.key);
    if (a.key === 'windfall') assert.equal(a.side, 'good', '횡재수는 좋은 신호만');
    if (a.key === 'windfallLoss') assert.equal(a.side, 'bad', '손재수는 주의 신호만');
    assert.ok(a.line && a.todo && a.when, '문장 빈 값');
    [a.line, a.todo, a.why].forEach(t => assert.ok(!BAN.test(String(t)), '금지 표현 ' + t));
    // 점수는 엔진 값 그대로
    if (a.level === 'ilun') { const d = new Date(a.ms + 9 * 3600e3), x = M.ilun(ch, d.getUTCFullYear(), d.getUTCMonth() + 1).filter(q => q.date[2] === d.getUTCDate())[0], r = M.evaluateDomainLuck(ch, x, 'ilun', {}); assert.equal(a.score, a.key === 'windfallLoss' ? r.windfall.loss.score : r[a.key].score, '엔진 점수 그대로'); }
    // 신호등 단계도 맞아야 함
    const k = TG.sigMetric(a.key, a.score).k; assert.ok(a.side === 'good' ? k === 'best' : k === 'bad', '신호등 최고·부담일 때만 ' + a.key + ' ' + a.score + ' ' + k);
  }
  for (const s of [tl, ms]) assert.equal(new Set(s.map(a => a.key)).size, s.length, '같은 분야 한 번');
  // 드물기: 그 사람 1년치 일진 중 신호로 판정되는 비율
  const B = A.baseline(M, ch, T, A.SETS.manse);
  for (let mo = 1; mo <= 12; mo += 3) M.ilun(ch, 2026, mo).forEach(x => { const r = M.evaluateDomainLuck(ch, x, 'ilun', {}); A.SETS.manse.forEach(key => { const v = key === 'windfallLoss' ? r.windfall && r.windfall.loss && r.windfall.loss.score : r[key] && r[key].score; if (v == null) return; judged++; if (A.judge(key, v, B.day[key])) flagged++; }); });
  assert.equal(J(ch.daeun.list.map(x => x.ev.fitScore)), snap, '엔진 결과 불변');
}
const rate = flagged / judged;
assert.ok(rate <= 0.05, '신호가 너무 잦음 ' + rate.toFixed(3));
assert.ok(rate > 0, '신호가 하나도 없음');
assert.ok(people.size >= n * 0.5, '사람마다 알림이 달라야 함 ' + people.size + '/' + n);
assert.ok(sides.good > 0 && sides.bad > 0, '좋은·주의 신호 모두 나옴');

// 화면·스위치 연결
const rd = f => fs.readFileSync(path.join(root, f), 'utf8'), html = rd('index.html'), hub = rd('report/hub/hub-timeline.js');
assert.ok(/<script src="luck-alerts\.js"><\/script>/.test(html) && /const alOn = \(\) => !!\(window\.MANTRA_FLAGS && window\.MANTRA_FLAGS\.luckAlerts === true/.test(html) && /alertBar\(\)/.test(html) && /set: 'manse'/.test(html), '만세력 연결');
assert.ok(/luckAlerts: on\('luckAlerts'\)/.test(hub) && /'\/luck-alerts\.js'/.test(hub) && /alertsHtml\(\)/.test(hub) && /set: 'timeline'/.test(hub), '타임라인 연결');
assert.ok(/luckAlerts: false/.test(rd('feature-flags.js')) && /'luckAlerts'/.test(rd('functions/api/luck-flags.js')) && /F\.luckAlerts/.test(html) && /id=\\?"leAL/.test(rd('report/admin/v2-luckenv.js')), '스위치·관리자');
assert.ok(!/fitScore\s*=|LUCK_CFG\.|evaluateLuck\(/.test(rd('luck-alerts.js').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), '점수를 바꾸지 않음');
// 좋은 신호·주의할 신호 글자 색(signal-colors.js): 낱말 분류와 화면 연결
{ const sc = {}; sc.window = sc; vm.createContext(sc); vm.runInContext(rd('signal-colors.js'), sc); const SC = sc.MantraSignalColors, hit = t => { SC.RE.lastIndex = 0; return [...t.matchAll(SC.RE)].map(m => m[0].replace(/^[^가-힣]/, '')); };
  assert.equal(JSON.stringify(hit('용신 희신 기신 구신 순풍 맞바람 도움 쪽 부담 쪽 꼭 필요한 기운 부담 기운')), JSON.stringify(['용신', '희신', '기신', '구신', '순풍', '맞바람', '도움 쪽', '부담 쪽', '꼭 필요한 기운', '부담 기운']), '낱말');
  assert.equal(hit('유리해요 불리해요 유불리').length, 0, '유리해요·유불리는 칠하지 않음'); assert.equal(hit('(유리)').length, 1, '(유리)는 칠함');
  SC.GOOD.forEach(w => assert.ok(!SC.BAD.includes(w), '좋은·주의 낱말 겹침 ' + w));
  assert.ok(html.includes('<script src="signal-colors.js"></script>') && html.includes("MantraSignalColors.paint(root.querySelector('main'))") && html.includes("S.tab !== 'gl'"), '만세력 연결');
  assert.ok(rd('report/hub/index.html').includes('/signal-colors.js') && hub.includes('swPaint(el)') && hub.includes('swPaint(b)') && rd('report/hub/hub-saju.js').includes('MantraSignalColors.paint(el)'), '타임라인·캘린더 연결');
  assert.ok(rd('signal-colors.js').includes('.le-s1,.lv-s1'), '외부 환경 칸은 칠하지 않음'); }
console.log(`luck-alerts-sim ok · 사주 ${n}명 · 1인당 알림 타임라인 ${(totTl / n).toFixed(2)}·만세력 ${(totMs / n).toFixed(2)} · 일진 신호 비율 ${(rate * 100).toFixed(1)}% · 좋은 ${sides.good}/주의 ${sides.bad} · 서로 다른 알림 조합 ${people.size}`);
