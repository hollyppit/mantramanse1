// 심리 솔루션(psych.js · psych-data.js · psych-view.js) 검증:  node tests/psych-sim.cjs [사주 수=400]
//  · 여러 사주로 상처 결·대운 10개·세운 3년·월운 12개·솔루션·용신 보완·도움 받을 곳이 빠짐없이 나오는지
//  · 상처 결은 근거가 1개 이상, 점수 문턱 이상, 최대 3개 · 근거 라벨의 숫자가 엔진 값과 맞는지(십성 묶음 %)
//  · 결정론(같은 명식·같은 기준 시각 → 같은 결과, 다른 VM에서도 동일) · 엔진 결과 불변
//  · 금지 표현(진단명·치료 효과·사건 확정·자해 관련 단정) 없음 — 문안 파일 전체와 실제 출력 모두
//  · 화면: 다섯 구역 순서, 위기 연락처(109) 항상 포함, 시간 모름이면 안내
//  · 분포 보고: 결별 빈도, 대운 긴장도 비율(높음이 지나치게 많지 않은지)
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 400;
const FILES = ['engine.js', 'psych-data.js', 'psych.js', 'psych-view.js'];
const mk = () => { const c = { console }; c.window = c; vm.createContext(c); FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f })); return c; };
const W = mk(), W2 = mk();
const M = W.Manse, P = W.MantraPsych, DD = W.MantraPsychData, V = W.MantraPsychView, J = x => JSON.stringify(x);
const NOW = Date.UTC(2026, 10, 25, 3);
const BAN = /우울증|불안장애|공황장애|PTSD|외상 후|조현|양극성|정신질환|정신병|진단(합니다|됩니다|돼요|할 수 있)|치료(됩니다|돼요|할 수 있|효과)|낫습니다|완치|반드시 (다치|헤어|실패|아프)|틀림없이|확실히 (생깁|일어)|자살하|자해하/;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

(function scan(o, p) {
  if (typeof o === 'string') { assert.ok(!BAN.test(o), '문안 금지 표현 ' + p + ': ' + o); return; }
  if (o && typeof o === 'object') Object.keys(o).forEach(k => scan(o[k], p + '.' + k));
})(DD, 'DATA');
// 문안 짝 맞춤: 규칙마다 문안, 문안의 추천 기법은 모두 TOOLS 에 있어야
P.PATTERN_IDS.forEach(id => { const t = DD.PATTERNS[id]; assert.ok(t, '문안 없음 ' + id); assert.equal(t.scenes.length, 2, id + ' 장면 2개'); t.tools.forEach(x => assert.ok(DD.TOOLS[x], id + ' 없는 기법 ' + x)); });
Object.keys(DD.GROUP).forEach(g => DD.GROUP[g].tools.forEach(x => assert.ok(DD.TOOLS[x], g + ' 없는 기법 ' + x)));
assert.equal(Object.keys(DD.UNSEONG).length, 12);

const textsOf = r => {
  const o = [r.intro, r.disclaimer, r.noPattern];
  r.patterns.forEach(p => o.push(p.name, p.hook, p.myeongri, p.guard, p.heal, ...p.scenes, ...p.basis.map(b => b.label)));
  [...r.daeun, ...r.seun, ...r.months].forEach(p => o.push(p.state, p.levelNote, ...(p.stress || []), p.mood ? p.mood.t : ''));
  r.tools.forEach(t => o.push(t.name, ...t.how, ...t.why));
  if (r.elem) o.push(r.elem.mind, ...r.elem.acts, r.elem.space, r.elem.note);
  return o.filter(Boolean);
};

const cnt = { pat: {}, n: {}, lv: { hi: 0, mid: 0, lo: 0 }, sLv: { hi: 0, mid: 0, lo: 0 }, mLv: { hi: 0, mid: 0, lo: 0 }, noHour: 0, nowD: 0, nowM: 0 };
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: i % 13 === 0 ? null : (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  const ch = M.compute(inp), before = J({ w: ch.weights, s: ch.strength, u: ch.unified, c: ch.cells, d: ch.daeun.list.map(x => [x.s, x.b, x.score]) });
  const r = P.build(M, ch, { now: NOW });
  assert.ok(r.ok, '실패 ' + J(inp) + ' ' + r.reason);
  assert.equal(J({ w: ch.weights, s: ch.strength, u: ch.unified, c: ch.cells, d: ch.daeun.list.map(x => [x.s, x.b, x.score]) }), before, '엔진 결과가 바뀜');
  assert.equal(J(P.build(M, ch, { now: NOW })), J(r), '결정론(같은 VM)');
  assert.equal(J(W2.MantraPsych.build(W2.Manse, W2.Manse.compute(inp), { now: NOW })), J(r), '결정론(다른 VM)');
  // 상처 결
  assert.ok(r.patterns.length <= 3);
  r.patterns.forEach(p => {
    assert.ok(p.basis.length >= 1 && p.score >= P.CFG.show, '근거·문턱 ' + p.id);
    p.basis.forEach(b => {
      const m = /^(비겁|식상|재성|관성|인성) (\d+)%/.exec(b.label);
      if (m) { const gi = ['비겁', '식상', '재성', '관성', '인성'].indexOf(m[1]); assert.equal(+m[2], Math.round(ch.weights.groups[gi]), '근거 숫자 ' + b.label); }
    });
    cnt.pat[p.id] = (cnt.pat[p.id] || 0) + 1;
  });
  cnt.n[r.patterns.length] = (cnt.n[r.patterns.length] || 0) + 1;
  if (!r.patterns.length) assert.ok(r.noPattern);
  // 시기
  assert.equal(r.daeun.length, ch.daeun.list.length);
  assert.equal(r.seun.length, 3); assert.equal(r.months.length, 12);
  [...r.daeun, ...r.seun, ...r.months].forEach(p => { assert.ok(['hi', 'mid', 'lo'].includes(p.level)); assert.ok(p.state && p.tools.length >= 1, '상태·솔루션 없음'); });
  r.daeun.forEach(p => cnt.lv[p.level]++); r.seun.forEach(p => cnt.sLv[p.level]++); r.months.forEach(p => cnt.mLv[p.level]++);
  assert.ok(r.daeun.filter(p => p.now).length <= 1); if (r.daeun.some(p => p.now)) cnt.nowD++;
  assert.equal(r.months.filter(p => p.now).length <= 1, true); if (r.months.some(p => p.now)) cnt.nowM++;
  // 솔루션
  assert.ok(r.tools.length >= 1 && r.tools.length <= 5);
  r.tools.forEach(t => assert.ok(t.how.length >= 2 && t.why.length >= 1));
  // 문장 금지어
  textsOf(r).forEach(t => assert.ok(!BAN.test(t), '출력 금지 표현: ' + t));
  // 화면
  if (i % 20 === 0) {
    const h = V.html(M, ch, { esc, now: NOW });
    const ids = ['psyTop', 'psyPat', 'psyTime', 'psySol'].map(x => h.indexOf('id="' + x + '"'));
    assert.ok(ids.every((x, k) => x >= 0 && (k === 0 || x > ids[k - 1])), '구역 순서');
    assert.ok(h.indexOf('tel:109') > ids[3], '위기 연락처는 맨 끝');
    if (!ch.pillars.hour) { assert.ok(h.includes(DD.NO_HOUR)); cnt.noHour++; }
  }
}
// 데이터 누락
assert.equal(P.build(M, null).ok, false);
const pct = o => { const t = o.hi + o.mid + o.lo; return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v / t * 100) + '%'])); };
console.log('사주', N, '· 결 개수', J(cnt.n), '· 결 빈도', J(cnt.pat));
console.log('대운 긴장도', J(pct(cnt.lv)), '· 세운', J(pct(cnt.sLv)), '· 월운', J(pct(cnt.mLv)), '· 지금 대운 표시', cnt.nowD, '· 이번 달 표시', cnt.nowM, '· 시간 모름 화면', cnt.noHour);
const hiShare = cnt.lv.hi / (cnt.lv.hi + cnt.lv.mid + cnt.lv.lo);
assert.ok(hiShare < 0.3, '대운 긴장 높음이 너무 많음 ' + hiShare);
console.log('psych-sim 통과');
