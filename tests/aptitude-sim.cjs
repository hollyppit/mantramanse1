// 특기·적성 분석(aptitude.js · aptitude-data.js · aptitude-view.js) 검증:  node tests/aptitude-sim.cjs [사주 수=400]
//  · 여러 사주로 특기 5영역·적성 6분야·운동 성향 6·활동 방식 5축·종목 6분야·최종 추천이 빠짐없이 나오는지
//  · 근거 연결: 근거 라벨이 엔진 값과 일치, 해석 문장이 있는 항목은 근거가 있고, 가능한 한 서로 다른 종류 2가지 이상
//  · 결정론(같은 명식 → 같은 결과, 두 번 계산·다른 VM에서도 동일) · 엔진 결과 불변
//  · 데이터 누락: 시간 모름 → 근거 일부 표시, 오행 비율 없음 → 임의 생성 없이 ok:false/근거 부족
//  · 금지 표현(실력·재능 판정, 프로 성공, 건강·부상, 단정, 검사처럼 쓰기, 용신 기계 연결) 없음
//  · 화면(aptitude-view.js) 결과가 다섯 구역 순서대로 나오는지, 운동·스포츠 문안이 직업 적성 모듈과 섞이지 않는지
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 400;
const FILES = ['engine.js', 'gyeok-structure.js', 'aptitude-data.js', 'aptitude.js', 'aptitude-view.js'];
const mk = files => { const c = { console }; c.window = c; vm.createContext(c); files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f })); return c; };
const W = mk(FILES), W2 = mk(FILES);
const M = W.Manse, A = W.MantraAptitude, DD = W.MantraAptitudeData, J = x => JSON.stringify(x);
const BAN = /천재|타고난 (재능|운동|실력)|재능이 (뛰어|있|없)|실력이 (좋|뛰어|부족)|소질|프로 선수|국가대표|선수로|성공(할|합니다|한다|해요)|우승|메달|부상|다치|건강|체력이 (좋|약|부족)|지능|아이큐|IQ|운동 ?능력|이미 (좋아|잘)|잘하(실|십니다|는 분|고 있)|좋아하(실|시는|고 있)|반드시|무조건|절대|확실(히|합니다)|틀림없|검사 결과|적성 검사|심리 검사|진단|용신이(라서|므로|니까)|용신이기 때문|용신에 맞춰 (고르세요|하세요)/;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const textsOf = r => {
  const out = [r.summary.head, ...r.summary.lines, ...r.notes, r.disclaimer];
  [...r.talents, ...r.fields].forEach(t => out.push(t.interp, t.link, t.care, ...(t.acts || [])));
  r.sport.traits.forEach(t => out.push(t.interp, t.link || ''));
  r.sport.axes.forEach(a => out.push(a.text));
  r.sport.categories.forEach(c => out.push(c.interp || '', c.why || '', c.link || '', c.feature || '', c.myeongri || '', ...(c.consider || [])));
  Object.values(r.details).forEach(d => { out.push(d.intro); d.axes.forEach(a => out.push(a.text)); d.subs.forEach(c => out.push(c.interp || '', c.why || '', c.link || '', c.feature || '', c.myeongri || '', ...(c.consider || []))); });
  r.final.activities.forEach(a => out.push(a.name, a.why));
  r.talents.forEach(t => { if (t.types) { out.push(t.types.text); t.types.list.forEach(x => out.push(x.txt, x.link, x.easy, ...(x.acts || []))); } });
  (r.final.typeActs || []).forEach(a => out.push(...a.acts));
  if (r.final.longTerm) out.push(r.final.longTerm.why);
  if (r.final.complement) out.push(r.final.complement.text);
  out.push(r.final.yongNote);
  return out.filter(Boolean);
};
// 문안 파일 전체도 금지 표현 검사(조건부로만 나오는 문장까지)
(function scanData(o, p) {
  if (typeof o === 'string') { assert.ok(!BAN.test(o), '문안 금지 표현 ' + p + ': ' + o); return; }
  if (o && typeof o === 'object') Object.keys(o).forEach(k => scanData(o[k], p + '.' + k));
})(DD, 'DATA');

const cnt = { lv: {}, rec: {}, kinds1: 0, items: 0, topT: {}, topF: {}, acts: {}, cat1: {}, sub: {}, ty: {}, tyMix: 0, tyN: 0, ax: {} };
let partialNoHour = 0;
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: i % 13 === 0 ? null : (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  const ch = M.compute(inp), before = J({ w: ch.weights, s: ch.strength, u: ch.unified, c: ch.cells });
  const r = A.build(M, ch), r2 = A.build(M, ch), r3 = W2.MantraAptitude.build(W2.Manse, W2.Manse.compute(inp));
  // 결정론
  assert.equal(J(r), J(r2), '같은 명식 두 번 계산 → 같은 결과');
  assert.equal(J(r), J(r3), '다른 VM에서도 같은 결과');
  assert.equal(J({ w: ch.weights, s: ch.strength, u: ch.unified, c: ch.cells }), before, '엔진 결과 불변');
  // 구조: 5영역·6분야·성향 6·축 5·종목 6
  assert.ok(r.ok);
  assert.equal(J(r.talents.map(t => t.id)), J(['expr', 'craft', 'body', 'study', 'strat']));
  assert.equal(J(r.fields.map(t => t.id)), J(['sport', 'art', 'intel', 'outdoor', 'life', 'social']));
  assert.equal(J(r.sport.traits.map(t => t.id)), J(['compete', 'energy', 'discipline', 'tactic', 'indep', 'skill']));
  assert.equal(J(r.sport.axes.map(t => t.id)), J(['solo_team', 'compete_record', 'skill_stamina', 'duel_self', 'rule_adapt', 'in_out', 'short_long']));
  assert.equal(J(r.sport.categories.map(t => t.id)), J(['combat', 'ball', 'endur', 'water', 'tech', 'racket', 'target', 'xtreme']));
  // 결과 항목 필드: ID·영역·근거·해석·추천 활동·주의·신뢰 수준
  [...r.talents, ...r.fields].forEach(t => {
    ['id', 'area', 'basis', 'interp', 'acts', 'care', 'confidence', 'confK'].forEach(k => assert.ok(k in t, t.id + ' 필드 ' + k));
    assert.ok(t.ok, t.id + ' 정상 데이터에서 결과 있음');
    assert.ok(t.basis.length >= 1 && t.link, t.id + ' 근거·연결 문장');
    assert.ok(['hi', 'mid', 'lo'].includes(t.level));
    cnt.lv[t.area + ':' + t.level] = (cnt.lv[t.area + ':' + t.level] || 0) + 1;
    cnt.items++; if (new Set(t.basis.map(b => b.kind)).size < 2) { cnt.kinds1++; assert.notEqual(t.confidence, 'full', t.id + ' 근거 한 종류면 근거 충분이 아님'); }
    // 근거 라벨 = 엔진 값
    t.basis.forEach(b => {
      assert.ok(!/\(\)/.test(b.label) && b.label, t.id + ' 빈 근거 라벨: ' + b.label);
      if (/^e\d$/.test(b.id)) { const e = +b.id[1]; assert.ok(b.label.includes(String(Math.round(ch.weights.pct[e] * 10) / 10) + '%'), '오행 근거 값 ' + b.label); }
      if (/^g\d$/.test(b.id)) { const g = +b.id[1]; assert.ok(b.label.startsWith(DD.GN[g] + ' ' + Math.round(ch.weights.groups[g] * 10) / 10 + '%'), '십성 묶음 근거 값 ' + b.label); }
      if (W.MantraAptitude && ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'].includes(b.id)) assert.ok(b.label.startsWith(b.id + ' ' + Math.round(ch.weights.tgPct[b.id] * 10) / 10 + '%'), '십성 근거 값 ' + b.label);
      if (b.id === 'strong') assert.ok(b.label.includes(Math.round(ch.strength.help) + '%') && b.label.includes(ch.strength.zone), '강약 근거 값');
      if (b.id === 'yeokma') assert.ok(['year', 'month', 'day', 'hour'].some(p => ch.cells[p] && ch.cells[p].sinsal12 === '역마살'), '역마살 근거는 실제 역마살이 있을 때만');
    });
    // '넉넉해' 같은 문장은 그 요소 값이 충분할 때만
    t.basis.filter(b => b.v < A.CFG.phraseV && DD.FACTOR[b.id]).forEach(b => assert.ok(!t.link.includes(DD.FACTOR[b.id]), t.id + ' 약한 근거에 강한 해석 문장: ' + b.label));
  });
  // 종목: 추천 수준·특성·명리 성향·연결·이유·고려할 점
  r.sport.categories.forEach(c => {
    assert.ok(c.ok && ['strong', 'interest', 'pref'].includes(c.rec), c.id + ' 추천 수준');
    ['feature', 'myeongri', 'link', 'why', 'consider'].forEach(k => assert.ok(c[k] && (k !== 'consider' || c.consider.length), c.id + ' ' + k));
    // 단일 요소로 단정하지 않기: 근거 2개 이상
    assert.ok(c.basis.length >= 2, c.id + ' 근거 2개 이상');
    cnt.rec[c.id + ':' + c.rec] = (cnt.rec[c.id + ':' + c.rec] || 0) + 1;
    if (c.rank === 0) cnt.cat1[c.id] = (cnt.cat1[c.id] || 0) + 1;
  });
  assert.ok(r.sport.categories.filter(c => c.rec === 'strong').length <= 2, '적극 탐색 추천은 최대 2개');
  // 축: 상대적 성향(좌·우·균형)
  r.sport.axes.forEach(a => { assert.ok(['L', 'R', 'bal'].includes(a.side)); assert.ok(a.pos >= -1 && a.pos <= 1); });
  // 최종 추천: 활동 3~5개·장기 숙련·보완 성향
  const f = r.final;
  assert.ok(f.activities.length >= 3 && f.activities.length <= 5, '활동 3~5개: ' + f.activities.length);
  assert.equal(new Set(f.activities.map(a => a.name)).size, f.activities.length, '활동 중복 없음');
  f.activities.forEach(a => { assert.ok(DD.REC[a.rec] === a.recK); cnt.acts[a.name] = (cnt.acts[a.name] || 0) + 1; });
  assert.ok(f.longTerm && f.longTerm.name, '장기 숙련 활동');
  // 분야별 상세: 6분야 모두 · 세부 분야 6개 · 축 5개(같은 값, 분야의 말) · 적극 탐색 최대 2개 · 이어진 특기
  assert.equal(J(Object.keys(r.details)), J(['sport', 'art', 'intel', 'outdoor', 'life', 'social']), '분야별 상세 6분야');
  Object.values(r.details).forEach(d => {
    assert.equal(d.subs.length, 8, d.id + ' 세부 분야 8개'); assert.equal(d.axes.length, 7, d.id + ' 축 7개');
    d.axes.forEach((a, k) => { const b = r.sport.axes[k]; assert.equal(J([a.id, a.side, a.d, a.pos]), J([b.id, b.side, b.d, b.pos]), d.id + ' 축 값은 운동과 같음(이름만 다름)'); assert.ok(a.L && a.R && a.text); });
    assert.ok(d.subs.filter(c => c.rec === 'strong').length <= 2, d.id + ' 적극 탐색 최대 2개');
    d.subs.forEach(c => { assert.ok(c.ok && c.basis.length >= 2 && c.why && c.feature && c.myeongri && c.consider.length && c.long, d.id + '.' + c.id + ' 필드'); cnt.sub[d.id + ':' + c.id + ':' + c.rank] = 1; });
    assert.ok(d.links.length === 2, d.id + ' 이어진 특기 2개');
  });
  r.fields.forEach(fd => assert.ok(fd.links && fd.links.length === 2, fd.id + ' 적성 카드 이어진 특기'));
  r.fields.forEach(fd => { assert.equal(fd.topSubs.length, 2, fd.id + ' 앞선 세부 분야 2개'); const d = r.details[fd.id], s0 = d.subs.filter(x => x.rank === 0)[0]; assert.equal(fd.topSubs[0].id, s0.id, fd.id + ' 앞선 세부 분야 = 상세 1순위'); });
  // 특기 결: 영역마다 3개 · 순위 0~2 한 번씩 · 1위 = 점수 최대 · 근거 2개 이상 · 근거 라벨은 엔진 값
  r.talents.forEach(t => {
    const T = t.types; assert.ok(T && T.list.length === 3, t.id + ' 결 3개');
    assert.equal(J(T.list.map(x => x.id)), J(DD.TALENT_SUB[t.id].map(x => x.id)), t.id + ' 결 순서');
    assert.equal(J(T.list.map(x => x.rank).sort()), J([0, 1, 2]), t.id + ' 결 순위');
    const mx = T.list.slice().sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : 1))[0]; assert.equal(T.top, mx.id, t.id + ' 1위 결 = 최대 점수');
    T.list.forEach(x => { assert.ok(x.ok && x.basis.length >= 2 && x.txt && x.acts.length, t.id + '.' + x.id + ' 결 필드'); x.basis.forEach(b => { if (/^ed$/.test(b.id)) assert.ok(b.label.includes(String(Math.round(ch.weights.pct[+b.id[1]] * 10) / 10) + '%'), '결 오행 근거 값'); }); });
    assert.ok(T.text && !/{|}/.test(T.text), t.id + ' 결 문장');
    cnt.ty[t.id + ':' + T.top] = (cnt.ty[t.id + ':' + T.top] || 0) + 1; cnt.tyN++; if (T.mix) cnt.tyMix++;
  });
  r.sport.axes.forEach(a => { cnt.ax[a.id + ':' + a.side] = (cnt.ax[a.id + ':' + a.side] || 0) + 1; });
  (r.final.typeActs || []).forEach(a => { assert.ok(a.acts.length >= 1 && a.acts.length <= 2); a.acts.forEach(x => assert.ok(!f.activities.some(y => y.name === x), '결 활동은 탐색 활동과 겹치지 않음: ' + x)); });
  // 추천 활동은 실제 세부 분야 예시에서만
  const exAll = new Set(); Object.values(r.details).forEach(d => d.subs.forEach(c => c.ex.forEach(x => exAll.add(x))));
  f.activities.forEach(a => assert.ok(exAll.has(a.name), '추천 활동은 세부 분야 예시: ' + a.name));
  assert.ok(f.complement && f.complement.text, '보완할 성향');
  // 용신은 점수에 쓰지 않음: 통합 용신을 지워도 점수 동일
  const chNoY = Object.assign({}, ch, { unified: null }), rn = A.build(M, chNoY);
  assert.equal(J([rn.talents, rn.fields, rn.sport]), J([r.talents, r.fields, r.sport]), '용신이 점수에 들어가지 않음');
  // 시간 모름 → 근거 일부·안내 문구
  if (inp.hour === null) { assert.equal(r.hourKnown, false); assert.ok(r.notes[0] === DD.NO_HOUR); assert.ok(r.talents.every(t => t.confidence !== 'full'), '시주 없음 → 근거 충분 아님'); partialNoHour++; }
  // 금지 표현
  textsOf(r).forEach(t => assert.ok(!BAN.test(t), '금지 표현: ' + t));
  cnt.topT[r.summary.topTalent] = (cnt.topT[r.summary.topTalent] || 0) + 1; cnt.topF[r.summary.topField] = (cnt.topF[r.summary.topField] || 0) + 1;
  // 화면: 다섯 구역 순서
  if (i % 50 === 0) {
    const h = W.MantraAptitudeView.html(M, ch, { esc });
    assert.ok(!/data-apt-mode/.test(h), '직업 칸이 없으면 전환 단추도 없음');
    const hw = W.MantraAptitudeView.html(M, ch, { esc, careerHtml: '<section class="card">직업</section>' });
    assert.ok(/data-apt-mode="work"/.test(hw) && /data-apt-pane="work" id="aptCareer"/.test(hw) && hw.indexOf('data-apt-pane="hobby"') < hw.indexOf('data-apt-pane="work"'), '두 갈래 전환·직업 칸');
    assert.equal((hw.match(/data-apt-fpane=/g) || []).length, 6, '분야별 상세 6칸');
    assert.ok(/힘을 쓰는 결 3가지/.test(h) && /세부 분야 8가지/.test(h) && /활동 방식 7가지 기울기/.test(h), '세분화 표시');
    const ids = ['aptOverview', 'aptTalent', 'aptField', 'aptDetail', 'aptFinal'].map(id => h.indexOf('id="' + id + '"'));
    assert.ok(ids.every((x, k) => x >= 0 && (k === 0 || x > ids[k - 1])), '화면 구역 순서 ①~⑤');
    assert.ok(!/undefined|NaN|\[object/.test(h), '화면에 빈 값 없음');
  }
}
// 데이터 누락: 오행 세력이 없으면 임의 생성하지 않음
{
  const ch = M.compute({ year: 1990, month: 5, day: 15, hour: 10, minute: 0, gender: 'M', calendar: 'solar' });
  const bad = Object.assign({}, ch, { weights: null });
  assert.equal(A.build(M, bad).ok, false, '세력 없음 → ok:false');
  assert.equal(A.build(M, null).ok, false, '명식 없음 → ok:false');
  const empty = Object.assign({}, ch, { weights: { pct: null, groups: null, tgPct: null }, strength: null });
  const re = A.build(M, Object.assign({}, empty, { cells: Object.assign({}, ch.cells, { year: Object.assign({}, ch.cells.year, { sinsal12: '' }), month: Object.assign({}, ch.cells.month, { sinsal12: '' }), day: Object.assign({}, ch.cells.day, { sinsal12: '' }), hour: Object.assign({}, ch.cells.hour, { sinsal12: '' }) }) }));
  // 남는 근거(통근·역마 없음)만으로 만든 항목은 근거 부족 표시, 근거 없는 항목은 해석 없음
  [...re.talents, ...re.fields].forEach(t => { if (!t.ok) assert.equal(t.interp, DD.NO_DATA); else assert.notEqual(t.confidence, 'full'); });
  assert.ok(re.talents.some(t => !t.ok), '근거가 비면 해석을 만들지 않는 항목이 있음');
}
// 직업 적성 모듈과 섞이지 않음: 이 파일들이 MantraWealthCareer 를 읽지 않음
['aptitude.js', 'aptitude-data.js', 'aptitude-view.js'].forEach(f => assert.ok(!/WealthCareer|wealth-career/.test(fs.readFileSync(path.join(root, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), f + ' 직업 적성과 분리'));

console.log('특기·적성 분석 통과 — 사주 ' + N + '개(시간 모름 ' + partialNoHour + '개)');
console.log('수준 분포', cnt.lv);
console.log('근거 한 종류뿐인 항목 비율', (cnt.kinds1 / cnt.items * 100).toFixed(1) + '%');
console.log('대표 특기', cnt.topT, '\n대표 적성', cnt.topF);
console.log('1순위 종목', cnt.cat1);
console.log('추천 활동 종류', Object.keys(cnt.acts).length, '개');
console.log('세부 분야가 1순위로 나온 경우', Object.keys(cnt.sub).filter(k => k.endsWith(':0')).length, '/ 48');
console.log('특기 결 1위 분포', cnt.ty);
console.log('결 1·2위 섞임 비율', (cnt.tyMix / cnt.tyN * 100).toFixed(1) + '%');
// 명식마다 실제로 달라야 함: 결 15개 모두 3% 이상 1위, 세부 분야 48개 모두 한 번 이상 1위, 새 축 두 개 모두 양쪽이 나옴
Object.keys(DD.TALENT_SUB).forEach(t => DD.TALENT_SUB[t].forEach(x => assert.ok((cnt.ty[t + ':' + x.id] || 0) >= N * 0.03, '결 분포 너무 적음 ' + t + ':' + x.id)));
assert.equal(Object.keys(cnt.sub).filter(k => k.endsWith(':0')).length, 48, '세부 분야 48개 모두 1위로 나온 적 있음');
['in_out', 'short_long'].forEach(a => ['L', 'R'].forEach(sd => assert.ok((cnt.ax[a + ':' + sd] || 0) >= N * 0.1, '새 축 분포 ' + a + ':' + sd)));
console.log('새 축 분포', cnt.ax);
