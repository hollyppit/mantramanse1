// 심리 솔루션 2판(psych.js · psych-data.js · psych-view.js) 검증:  node tests/psych-sim.cjs [사주 수=400]
//  · 반복 패턴 카드: 근거 2개 이상, 서로 다른 주제, 같은 중심 근거 되풀이 제한, 명식마다 다른 조합(다양성)
//  · 응답 반영: '제 얘기는 아니에요' → 그 주제 빠지고 다른 주제로, '맞아요' → 앞으로·실천에 반영, 경험 메모는 '내가 확인한 경험'으로만
//  · 출처 분리: 기록이 없으면 현재 상태·기록선 없음(심리 상태를 만들어 내지 않음)
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
Object.entries(DD.THEMES).forEach(([id, T]) => Object.entries(T.modes).forEach(([m, x]) => { assert.equal(x.scenes.length, 3, id + ':' + m + ' 장면 3'); ['core', 'keep', 'cost', 'need', 'act'].forEach(k => assert.ok(x[k], id + ':' + m + ' ' + k)); }));
assert.equal(Object.keys(DD.UNSEONG).length, 12);
Object.values(DD.ACTIONS).forEach(a => assert.ok(a.length >= 2));

const textsOf = r => {
  const o = [];
  r.themes.cards.forEach(c => o.push(c.name, c.core, c.keep, c.cost, c.need, c.act, c.schoolNote, ...c.scenes, ...c.basis.map(b => b.t + ' ' + b.m)));
  [...r.daeun, ...r.seun, ...r.months].forEach(p => o.push(p.theme, p.question, ...p.emotions.map(e => e.when + e.care), p.mood ? p.mood.t : ''));
  o.push(r.transition.basis, r.transition.from, r.transition.to, ...r.actions.map(a => a.text));
  return o.filter(Boolean);
};
const cnt = { n: {}, themes: {}, combos: new Set(), firstCore: {}, emo: {}, primaryRepeat: 0 };
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: i % 13 === 0 ? null : (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  const ch = M.compute(inp), snap = () => J({ w: ch.weights, s: ch.strength, u: ch.unified, c: ch.cells, d: ch.daeun.list.map(x => [x.s, x.b, x.score]) }), before = snap();
  const r = P.build(M, ch, { now: NOW });
  assert.ok(r.ok, '실패 ' + J(inp));
  assert.equal(snap(), before, '엔진 결과가 바뀜');
  assert.equal(J(P.build(M, ch, { now: NOW })), J(r), '결정론');
  assert.equal(J(W2.MantraPsych.build(W2.Manse, W2.Manse.compute(inp), { now: NOW })), J(r), '결정론(다른 VM)');
  const cs = r.themes.cards;
  assert.ok(cs.length <= 5);
  assert.equal(new Set(cs.map(c => c.id)).size, cs.length, '같은 주제 두 번');
  cs.forEach(c => { assert.ok(c.basis.length >= 2, '근거 2개 이상 ' + c.id); c.basis.forEach(b => assert.ok(b.k && b.t && b.m, '근거 형식')); });
  cs.forEach(c => { cnt.themes[c.id] = (cnt.themes[c.id] || 0) + 1; });
  cnt.n[cs.length] = (cnt.n[cs.length] || 0) + 1; cnt.combos.add(cs.map(c => c.id + ':' + c.mode).join()); if (cs[0]) cnt.firstCore[cs[0].core] = (cnt.firstCore[cs[0].core] || 0) + 1;
  // 기록 없음 → 현재 상태·기록선 없음
  assert.equal(r.state, null); assert.equal(r.graph.mine.length, 0); assert.equal(r.overview.state, null);
  // 시기
  assert.equal(r.seun.length, 3); assert.equal(r.months.length, 12); assert.equal(r.daeun.length, ch.daeun.list.length);
  [...r.daeun, ...r.seun, ...r.months].forEach(p => { assert.ok(p.emotions.length >= 2 && p.emotions.length <= 3, '감정 2~3'); assert.ok(p.question && p.theme, '질문·주제'); assert.ok(['hi', 'mid', 'lo'].includes(p.level)); p.emotions.forEach(e => cnt.emo[e.name] = (cnt.emo[e.name] || 0) + 1); });
  assert.ok(/3일=1년/.test(r.transition.basis) && /교운기/.test(r.transition.basis), '교운기 계산 기준');
  assert.ok(r.graph.points.length >= 60 && r.graph.points.every(p => p.v >= 0 && p.v <= 1), '곡선 점');
  textsOf(r).forEach(t => assert.ok(!BAN.test(t), '출력 금지 표현: ' + t));
  // 응답 반영(20명마다)
  if (i % 20 === 0 && cs.length) {
    const c0 = cs[0];
    const rNo = P.build(M, ch, { now: NOW, state: { answers: { [c0.id]: 'no' } } });
    assert.ok(!rNo.themes.cards.some(c => c.id === c0.id), '아니에요 주제가 남음');
    assert.ok(rNo.themes.skipped.some(x => x.id === c0.id), '넘긴 목록');
    const last = cs[cs.length - 1];
    const rYes = P.build(M, ch, { now: NOW, state: { answers: { [last.id]: 'yes' }, notes: { [last.id]: '직접 적은 경험' } } });
    assert.equal(rYes.themes.cards[0].id, last.id, '맞아요 주제가 앞으로');
    assert.equal(rYes.themes.cards[0].mine, '직접 적은 경험');
    assert.equal(rYes.actions[0].text, last.act, '맞아요 → 실천에 반영');
    assert.equal(rYes.overview.pattern.src, 'mine', '출처: 내가 확인한 경험');
    const hist = [{ t: NOW - 86400000 * 3, emo: ['지침'], need: '휴식', level: 3 }, { t: NOW, emo: ['조급함'], load: ['일·학업'], need: '경계 설정', level: 2 }];
    const rSt = P.build(M, ch, { now: NOW, state: { history: hist } });
    assert.ok(rSt.state && rSt.state.need === '경계 설정', '최근 기록 요약');
    assert.equal(rSt.graph.mine.length, 2, '기록선');
    assert.ok(rSt.actions.some(a => DD.ACTIONS['경계 설정'].includes(a.text)), '필요한 것 → 실천');
    // 화면
    const h = V.html(M, ch, { esc, now: NOW });
    const ids = ['psyTop', 'psyPat', 'psyGraph', 'psyTrans', 'psyTime', 'psyCheck', 'psySol'].map(x => h.indexOf('id="' + x + '"'));
    assert.ok(ids.every((x, k) => x >= 0 && (k === 0 || x > ids[k - 1])), '구역 순서 ' + ids);
    assert.ok(h.indexOf(esc(DD.SAFETY_TOP)) > ids[0] && h.indexOf(esc(DD.SAFETY_TOP)) < ids[1], '안전 안내는 첫 부분');
    assert.ok(h.indexOf('tel:109') > ids[5] && h.indexOf('tel:109') < ids[6], '연락처는 마음 체크 구역');
    assert.ok(!/트라우마/.test(h), '화면에 트라우마 단어');
    assert.ok(h.includes('마음에 남은 경험과 반복되는 패턴') && h.includes('내 삶의 시기별 흐름'));
  }
}
assert.equal(P.build(M, null).ok, false);
const share = Math.max(...Object.values(cnt.firstCore)) / N;
console.log('사주', N, '· 카드 수', J(cnt.n), '· 서로 다른 조합', cnt.combos.size, '· 첫 카드 최다 비율', Math.round(share * 100) + '%');
console.log('주제 빈도', J(cnt.themes));
console.log('감정 빈도', J(cnt.emo));
assert.ok(cnt.combos.size >= N * 0.8, '카드 조합 다양성 부족');
assert.ok(share < 0.2, '같은 첫 카드가 너무 많음');
assert.ok(Object.keys(cnt.themes).length >= 11, '나오지 않는 주제');
assert.ok(Object.keys(cnt.emo).length >= 11, '감정 종류');
console.log('psych-sim 통과');
