// 심리 솔루션 3판(psych.js · psych-data.js · psych-view.js) 검증:  node tests/psych-sim.cjs [사주 수=400]
//  · 반복 패턴 카드: 근거 2개 이상, 서로 다른 주제, 같은 중심 근거 되풀이 제한, 명식마다 다른 조합(다양성)
//  · 입력 없음(확인·체크·기록·고르기·질문 없음), 네 구역(한눈에 보기 → 잠재적 트라우마 → 시기별 스트레스와 감정 상태 → 심리 솔루션), 시기는 대운 → 세운 → 월운
//  · 시기: 대운·세운 3년·월운 12개 모두 주제·감정 2~3개·질문, 교운기 기준 문장, 곡선 점 개수·0~1
//  · 결정론·엔진 불변 · 금지 표현(트라우마·진단명·치료·사건 예언·학대 암시) · 화면 구역 순서·안전 안내 위치
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 400;
const FILES = ['engine.js', 'psych-data.js', 'psych.js', 'psych-view.js'];
const mk = () => { const c = { console }; c.window = c; vm.createContext(c); FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f })); return c; };
const W = mk(), W2 = mk();
const M = W.Manse, P = W.MantraPsych, DD = W.MantraPsychData, V = W.MantraPsychView, J = x => JSON.stringify(x);
const NOW = Date.UTC(2026, 10, 25, 3);
const BAN = /트라우마|우울증|불안장애|공황장애|PTSD|외상 후|조현|양극성|정신질환|학대|방임|폭력|진단(합니다|됩니다|돼요)|치료(됩니다|돼요|효과)|완치|이별(합니다|하게 됩니다)|실직(합니다|하게)|병에 걸|틀림없이|자살하|자해하/;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

(function scan(o, p) { if (typeof o === 'string') { assert.ok(!BAN.test(o), '문안 금지 표현 ' + p + ': ' + o); return; } if (o && typeof o === 'object') Object.keys(o).forEach(k => scan(o[k], p + '.' + k)); })(DD, 'DATA');
// 문안 형식: 방식마다 장면 3·양면·필요·실천
P.WOUND_IDS.forEach(id => { const t = DD.PATTERNS[id]; assert.ok(t, '문안 없음 ' + id); assert.equal(t.scenes.length, 2, id + ' 장면 2'); ['name', 'hook', 'myeongri', 'guard', 'heal'].forEach(k => assert.ok(t[k], id + ' ' + k)); t.tools.forEach(x => assert.ok(DD.TOOLS[x], id + ' 없는 기법 ' + x)); assert.ok(DD.MSOL[id] && DD.MSOL[id].acts.length >= 2, id + ' 명리 솔루션'); });
assert.equal(Object.keys(DD.UNSEONG).length, 12);

const textsOf = r => {
  const o = [];
  r.wounds.forEach(w => o.push(w.name, w.hook, w.myeongri, w.guard, w.heal, ...w.scenes, ...w.basis.map(b => b.label)));
  [...r.daeun, ...r.seun, ...r.months].forEach(p => o.push(p.theme, ...p.emotions.map(e => e.when + e.care), p.mood ? p.mood.t : ''));
  o.push(r.transition.basis, r.transition.from, r.transition.to, ...r.solution.psych.now.map(x => x.care), ...r.solution.myeongri.remedies.map(x => x.why), ...r.solution.myeongri.acts);
  return o.filter(Boolean);
};
const cnt = { n: {}, wounds: {}, combos: new Set(), first: {}, emo: {} };
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: i % 13 === 0 ? null : (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  const ch = M.compute(inp), snap = () => J({ w: ch.weights, s: ch.strength, u: ch.unified, c: ch.cells, d: ch.daeun.list.map(x => [x.s, x.b, x.score]) }), before = snap();
  const r = P.build(M, ch, { now: NOW });
  assert.ok(r.ok, '실패 ' + J(inp));
  assert.equal(snap(), before, '엔진 결과가 바뀜');
  assert.equal(J(P.build(M, ch, { now: NOW })), J(r), '결정론');
  assert.equal(J(W2.MantraPsych.build(W2.Manse, W2.Manse.compute(inp), { now: NOW })), J(r), '결정론(다른 VM)');
  const cs = r.wounds;
  assert.ok(cs.length <= 3);
  assert.equal(new Set(cs.map(c => c.id)).size, cs.length, '같은 결 두 번');
  cs.forEach(c => { assert.ok(c.basis.length >= 1 && c.score >= P.CFG.wound.show, '근거·문턱 ' + c.id); c.basis.forEach(b => assert.ok(b.kind && b.label, '근거 형식')); });
  cs.forEach(c => { cnt.wounds[c.id] = (cnt.wounds[c.id] || 0) + 1; });
  cnt.n[cs.length] = (cnt.n[cs.length] || 0) + 1; cnt.combos.add(cs.map(c => c.id).join()); if (cs[0]) cnt.first[cs[0].id] = (cnt.first[cs[0].id] || 0) + 1; if (!cs.length) assert.ok(r.noWound);
  assert.ok(r.overview.emotions.length >= 2 && r.overview.emotions.length <= 4, '지금 감정');
  assert.ok(r.solution.psych.now.length >= 2, '지금 감정 다루기'); assert.ok(r.solution.psych.techs.length <= 4 && r.solution.myeongri.remedies.length === Math.min(2, cs.length), '종합 솔루션'); if (cs.length) assert.ok(r.solution.psych.techs.length >= 1 && r.solution.myeongri.acts.length >= 2, '두 갈래 모두');
  // 시기
  assert.equal(r.seun.length, 3); assert.equal(r.months.length, 12); assert.equal(r.daeun.length, ch.daeun.list.length);
  [...r.daeun, ...r.seun, ...r.months].forEach(p => { assert.ok(p.emotions.length >= 2 && p.emotions.length <= 3, '감정 2~3'); assert.ok(p.theme && !('question' in p), '주제·질문 없음'); assert.ok(['hi', 'mid', 'lo'].includes(p.level)); p.emotions.forEach(e => cnt.emo[e.name] = (cnt.emo[e.name] || 0) + 1); });
  assert.ok(/3일=1년/.test(r.transition.basis) && /교운기/.test(r.transition.basis), '교운기 계산 기준');
  assert.ok(r.graph.points.length >= 60 && r.graph.points.every(p => p.v >= 0 && p.v <= 1), '곡선 점');
  textsOf(r).forEach(t => assert.ok(!BAN.test(t), '출력 금지 표현: ' + t));
  // 화면(20명마다)
  if (i % 20 === 0) {
    const h = V.html(M, ch, { esc, now: NOW });
    const ids = ['psyTop', 'psyPat', 'psyTime', 'psySol'].map(x => h.indexOf('id="' + x + '"'));
    assert.ok(ids.every((x, k) => x >= 0 && (k === 0 || x > ids[k - 1])), '구역 순서 ' + ids);
    ['psyGraph', 'psyTrans', 'psyCheck', 'data-psy-ans', 'data-psy-ck', 'data-psy-pick', 'data-psy-note', 'textarea', 'data-psy-span', '돌아볼 질문'].forEach(x => assert.ok(!h.includes(x), '빠져야 할 것 ' + x));
    const o3 = ['① 대운', '② 세운', '③ 월운'].map(x => h.indexOf(x));
    assert.ok(o3.every((x, k) => x > ids[2] && x < ids[3] && (k === 0 || x > o3[k - 1])), '대운→세운→월운 순서');
    assert.equal((h.match(/트라우마/g) || []).length, 2, '트라우마는 구역 제목·한눈에 보기 칸 이름에만');
    assert.ok(h.indexOf('잠재적 트라우마') > ids[1] && h.indexOf('잠재적 트라우마') < ids[2]);
    assert.ok(h.indexOf('tel:109') > ids[3], '연락처는 솔루션 끝');
    const hs = h.indexOf('현대 심리학 기법'), hm = h.indexOf('명리적 솔루션');
    assert.ok(hs > ids[3] && hm > hs, '솔루션 카드에 두 갈래');
  }
}
assert.equal(P.build(M, null).ok, false);
const share = Math.max(...Object.values(cnt.first)) / N;
console.log('사주', N, '· 결 개수', J(cnt.n), '· 서로 다른 조합', cnt.combos.size, '· 첫 결 최다 비율', Math.round(share * 100) + '%');
console.log('결 빈도', J(cnt.wounds));
console.log('감정 빈도', J(cnt.emo));
assert.ok(cnt.combos.size >= N * 0.3, '결 조합 다양성 부족');
assert.ok(share < 0.4, '같은 첫 결이 너무 많음');
assert.ok(Object.keys(cnt.wounds).length >= 11, '나오지 않는 결');
assert.ok(Object.keys(cnt.emo).length >= 11, '감정 종류');
console.log('psych-sim 통과');
