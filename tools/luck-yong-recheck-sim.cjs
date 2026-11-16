// 운세 흐름 억부·조후 복합 해석 재검증(읽기 전용) — 파일을 쓰지 않는다. 결과 해설: docs/LUCK_FLOW_YONG_RECHECK.md
//   node tools/luck-yong-recheck-sim.cjs
// 해석 상자(luck-interpret.js)의 좋음·나쁨 근거가 엇갈리는 경우를 세 유형으로 나눈다.
//   A 정상 복합 — 통합 판단과 다른 결론을, 이 사주에 적용되는 억부 또는 조후 단독 기준이 실제로 내린다
//   B 조건부   — A는 아니지만, 통합 판단이 그 오행을 조건부로 남겼거나(conditions) 이 운에서 운+원국 구조(좋은 구조·해소)·합으로 유불리가 바뀐다
//   C 실제 오류 — 어떤 기준으로도 그 결론이 나오지 않는다(같은 기준에서 계산과 문구가 모순)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = process.argv[2] || path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a0 = src.indexOf('var MANSE_DATA'), b0 = src.indexOf('})(typeof window', a0);
vm.runInThisContext(src.slice(a0, src.indexOf('\n', b0)));
const M = globalThis.Manse, LI = require(path.join(root, 'luck-interpret.js'));
const GN = ['비겁', '식상', '재성', '관성', '인성'], GRP_TG = { 비겁: ['비견', '겁재'], 식상: ['식신', '상관'], 재성: ['편재', '정재'], 관성: ['편관', '정관'], 인성: ['편인', '정인'] };
const pct = (n, d) => d ? Math.round(n / d * 1000) / 10 + '%' : '0%';
let seed = 20261116; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pool = [];
for (let i = 0; i < 600; i++) {
  const inp = { year: 1950 + Math.floor(rnd() * 55), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < 0.5 ? 'M' : 'F' };
  try { pool.push({ inp, ch: M.compute(inp) }); } catch (e) { }
}
const ROLE_BASE = { '용신': 1, '희신': 0.5, '한신': 0, '구신': -0.5, '기신': -1 };
const good = r => r === '용신' || r === '희신', bad = r => r === '기신' || r === '구신';
// 이 사주에서 억부·조후 단독 기준이 그 오행을 어떻게 보는가(적용되는 기준만)
function theoryView(ch, e) {
  const u = ch.unified, out = [];
  const eokOn = u.theories.eokbu.applicable && u.mode !== 'jong';
  if (eokOn) out.push({ key: '억부', role: ch.yongAll.eokbu.roles[e] });
  if (u.theories.johu.applicable && ch.yongAll.johu.applicable) out.push({ key: '조후', role: ch.yongAll.johu.roles[e] });
  return out;
}
function classify(ch, ev, x, gi, dir) {   // dir: 'good'(문구가 좋다고 함) | 'bad'(문구가 나쁘다고 함)
  const dEl = M.stemEl(ch.pillars.day.s), e = (dEl + gi) % 5, u = ch.unified;
  const tv = theoryView(ch, e);
  const agree = tv.filter(t => dir === 'good' ? good(t.role) : bad(t.role));
  if (agree.length) return { type: 'A', why: agree.map(t => `${t.key} 기준 ${t.role}`).join('·'), e };
  // 조건부: 통합 판단이 그 오행의 역할값을 실제로 누그러뜨렸을 때만(기신·구신이 덜 나쁘게 = 좋다는 문구 쪽, 용신·희신이 많으면 부담 = 나쁘다는 문구 쪽)
  const base = ROLE_BASE[u.roles[e]], rv = u.roleV[e];
  const cond = dir === 'good' ? rv > base + 1e-9 : rv < base - 1e-9;
  const tgs = GRP_TG[GN[gi]];
  const lp = (ev.luckStructures || []).filter(s => (dir === 'good' ? s.v > 0 : s.v < 0) && tgs.some(t => s.label.includes(t)));
  // 합: 그 십성 묶음을 실어 온 운 글자(천간 또는 지지)가 합을 이뤄, 문구 방향과 같은 역할의 오행으로 바뀌는 경우만
  const { rels } = M.luckRelations(ch, x);
  const viaStem = tgs.includes(x.stemTG), viaBr = tgs.includes(x.branchTG);
  const hapTurn = rels.some(r => /합/.test(r.type) && r.el != null && (r.kind === 'stem' ? viaStem : viaBr) && (dir === 'good' ? u.roleV[r.el] > 0 : u.roleV[r.el] < 0));
  if (cond || lp.length || hapTurn) { const why = [cond && 'cond', lp.length && 'struct', hapTurn && 'hap'].filter(Boolean); return { type: 'B', sub: why, why: why.map(k => ({ cond: '통합 판단의 조건부 역할', struct: '운+원국 구조 ' + lp.map(s => s.name).join('·'), hap: '운 글자가 합으로 다른 오행을 만듦' }[k])).join(' / '), e }; }
  return { type: 'C', why: `통합 ${u.roles[e]}, 적용 기준(${tv.map(t => t.key + ' ' + t.role).join('·') || '억부 미적용'}) 모두 반대`, e };
}
const S = { cards: 0, low: { n: 0, A: 0, B: 0, C: 0 }, high: { n: 0, A: 0, B: 0, C: 0 }, coexist: { n: 0, onlyRoleSplit: 0, consistent: 0, A: 0, B: 0, C: 0 }, roleBadCond: { n: 0, cond: 0 }, root: { n: 0, opp: 0, oppJong: 0, oppLabeled: 0 }, theoryJong: { n: 0, eokChip: 0 } };
const ex = { A: [], B: [], C: [], split: [] }, used = new Set();
const tag = ({ inp, ch }) => `${inp.year}-${inp.month}-${inp.day} ${inp.hour}시 ${inp.gender === 'M' ? '남' : '여'} (${['year', 'month', 'day', 'hour'].map(k => M.gzName(ch.pillars[k])).join(' ')}) · ${ch.unified.mode} · ${ch.unified.headline}`;
for (const P of pool.slice(0, 200)) {
  const { ch } = P, dEl = M.stemEl(ch.pillars.day.s);
  for (const x of M.seunRange(ch, 2020, 2035)) {
    let r; try { r = LI.build(M, ch, x, 'seun', { daeun: x.daeun }); } catch (e) { continue; }
    S.cards++;
    const ids = r.evidence.rules.map(q => q.id);
    const found = [];
    const take = (bucket, gi, dir, label) => {
      const e = (dEl + gi) % 5; if (dir === 'good' ? ch.unified.roleV[e] >= 0 : ch.unified.roleV[e] <= 0) return;
      bucket.n++; const c = classify(ch, x.ev, x, gi, dir); bucket[c.type]++; found.push(c);
      if (c.sub) c.sub.forEach(k => { bucket.sub = bucket.sub || {}; bucket.sub[k] = (bucket.sub[k] || 0) + 1; });
      const key = c.type + ':' + P.inp.year + P.inp.month + P.inp.day;
      if (!used.has(key) && ex[c.type].length < 4) { used.add(key); ex[c.type].push({ 명식: tag(P), 세운: `${x.year} ${M.gzName(x)}(${x.stemTG}/${x.branchTG})`, 문구: `${GN[gi]} ${label}`, 통합역할: ch.unified.roles[e] + '(' + M.EL_K[e] + ')', 판정: c.why, 흐름점수: Math.round(x.ev.fitScore), 상태: x.ev.condition }); }
    };
    ids.filter(id => /^NATAL-LOW-/.test(id)).forEach(id => take(S.low, GN.indexOf(id.slice(10)), 'good', '부족 채움 = 좋음'));
    ids.filter(id => /^NATAL-HIGH-/.test(id)).forEach(id => take(S.high, GN.indexOf(id.slice(11)), 'bad', '과다 = 나쁨'));
    if (found.some(f => f.type === 'C')) S.cardC = (S.cardC || 0) + 1; if (found.length) S.cardAny = (S.cardAny || 0) + 1;
    const hasG = ids.some(id => /^ROLE-GOOD|^NATAL-LOW/.test(id)), hasB = ids.some(id => /^ROLE-BAD|^NATAL-HIGH/.test(id));
    if (hasG && hasB) {
      S.coexist.n++;
      if (found.length) { const t = found.some(f => f.type === 'C') ? 'C' : found.some(f => f.type === 'B') ? 'B' : 'A'; S.coexist[t]++; }
      else if (ids.some(id => /^ROLE-GOOD/.test(id)) && ids.some(id => /^ROLE-BAD/.test(id)) && !ids.some(id => /^NATAL-/.test(id))) { S.coexist.onlyRoleSplit++; if (ex.split.length < 2) ex.split.push({ 명식: tag(P), 세운: `${x.year} ${M.gzName(x)}`, 천간: M.EL_K[M.stemEl(x.s)] + ' ' + ch.unified.roles[M.stemEl(x.s)], 지지: M.EL_K[M.BR_EL[x.b]] + ' ' + ch.unified.roles[M.BR_EL[x.b]] }); }
      else S.coexist.consistent++;
    }
    // ROLE-BAD 문구가 조건부 역할을 말하지 않는 경우
    ids.filter(id => /^ROLE-BAD-/.test(id)).forEach(id => { const e = +id.slice(9); S.roleBadCond.n++; if ((ch.unified.conditions[e] || []).length) S.roleBadCond.cond++; });
    // 통근 상자: 억부 적합도 라벨 부호 vs 통합 판단에서 일간 오행(비겁) 역할
    const rs = M.analyzeLuckRootSupport(ch, x, 'seun');
    if (rs.providesRoot) {
      const f = M.rootFitEffect(ch, rs.effect, 'seun'); S.root.n++;
      const uv = ch.unified.roleV[dEl];
      if (f.eokbuFit >= 8 && uv < 0 || f.eokbuFit <= -8 && uv > 0) { S.root.opp++; if (ch.unified.mode === 'jong') S.root.oppJong++; else S.root.oppLabeled++; }
    }
    if (ch.unified.mode === 'jong') { S.theoryJong.n++; const t = (x.ev.theoryImpact || []).find(q => q.key === 'eokbu'); if (t && Math.abs(t.v) >= 5) S.theoryJong.eokChip++; }
  }
}
const out = {
  세운카드: S.cards, '엇갈림 근거가 있는 카드': pct(S.cardAny, S.cards), 'C 오류가 하나라도 있는 카드': `${S.cardC} (${pct(S.cardC, S.cards)})`,
  '기신·구신 묶음 부족=좋음': { 건수: S.low.n, 카드대비: pct(S.low.n, S.cards), A정상복합: pct(S.low.A, S.low.n), B조건부: pct(S.low.B, S.low.n), B근거: S.low.sub, C오류: pct(S.low.C, S.low.n) },
  '용신·희신 묶음 과다=나쁨': { 건수: S.high.n, 카드대비: pct(S.high.n, S.cards), A정상복합: pct(S.high.A, S.high.n), B조건부: pct(S.high.B, S.high.n), B근거: S.high.sub, C오류: pct(S.high.C, S.high.n) },
  '좋음·나쁨 공존 카드': { 건수: S.coexist.n, 카드대비: pct(S.coexist.n, S.cards), '천간·지지 역할이 달라 생긴 공존(정상)': pct(S.coexist.onlyRoleSplit, S.coexist.n), '근거들이 통합 역할과 모두 맞음(정상)': pct(S.coexist.consistent, S.coexist.n), 'A 정상 복합 포함': pct(S.coexist.A, S.coexist.n), 'B 조건부 포함': pct(S.coexist.B, S.coexist.n), 'C 오류 포함': pct(S.coexist.C, S.coexist.n) },
  'ROLE-BAD 문구 중 통합 판단이 조건부로 둔 오행': `${S.roleBadCond.cond}/${S.roleBadCond.n} (${pct(S.roleBadCond.cond, S.roleBadCond.n)})`,
  '통근 상자 억부 적합도가 통합 일간 역할과 반대': { 근유입세운: S.root.n, 반대: S.root.opp, '그중 종격(억부 미적용인데 억부 문구)': S.root.oppJong, '그중 일반(억부로 명시한 복합 해석)': S.root.oppLabeled },
  '종격 사주 세운의 억부 영향 칩 표시': `${S.theoryJong.eokChip}/${S.theoryJong.n}`,
  예시: ex,
};
console.log(JSON.stringify(out, null, 1));
