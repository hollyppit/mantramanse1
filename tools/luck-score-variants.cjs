// 운세 점수 엔진 대안 비교 — engine.js 는 고치지 않고, 엔진이 내놓은 성분 값으로 흐름 점수를 다시 합성해 대안을 견준다. 2026-11-13
//   node tools/luck-score-variants.cjs [명식 수=300] [--md docs/파일.md]
// 먼저 '기존 방식'을 다시 합성해 엔진 값과 소수점까지 같은지 확인한다(같지 않으면 비교를 믿을 수 없으므로 멈춘다).
//
// 조후 중복 반영 대안 (통합 용신 성분 uni = (1−kJ−kG)·역할점수 + kJ·조후 + kG·격국 − 기준선)
//   J0 기존   조후가 주·보조 기준이면 kJ 0.3, 해당만 하면 0.15, 해당 없으면 0
//   A        조후가 주 기준이면 kJ = 0 (역할표가 이미 조후 용신으로 짜였으므로 따로 더하지 않음)
//   B        억부·조후 충돌에서 조후가 이기면, 진 억부도 같은 크기(0.3)의 별도 항으로 넣음(대칭)
//   C        조후가 주 기준일 때, 조후 성분에서 역할점수로 설명되는 몫(60갑자 회귀)을 빼고 남은 몫(글자별 조습 차이)만 kJ로 더하고,
//            역할점수 비중은 A안처럼 (1−kG)로 둔다(중복 요소만 제거 — 같은 판단을 두 번 세지 않되 글자별 정보는 남김)
// 구조(십성) 성분 대안 (구조 = 0.8·Σ 끌림×(20−원국%)/20 ×100 + 생극 구조 보정)
//   S0 기존
//   S1 상한   구조 몫이 용신 몫보다 커지지 못하게(|구조 몫| ≤ |용신 몫|)
//   S2 대체   균등 분포(20%) 보상을 빼고, 생극 구조 보정(관살혼잡·식신제살·살인상생·상관패인 등)만 남김
//   S3 조건부 균형  모자란 묶음을 채우는 보상·넘치는 묶음 감점 중, 통합 용신 역할과 방향이 같은 몫만 인정 + 생극 구조 보정
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a0 = src.indexOf('var MANSE_DATA'), b0 = src.indexOf('})(typeof window', a0);
vm.runInThisContext(src.slice(a0, src.indexOf('\n', b0)));
const M = globalThis.Manse, LC = M.LUCK_CFG, SC = LC.structure, UL = M.UNIFIED_CFG.luck, CC = LC.condition;
const N = +process.argv[2] || 300, mdAt = process.argv.indexOf('--md'), mdPath = mdAt > 0 ? process.argv[mdAt + 1] : null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
const gz = i => ({ s: i % 10, b: i % 12 }), EK = M.EL_K, sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v));
const cond = v => M.conditionOf(v);
const JM = ['J0', 'A', 'B', 'C'], SM = ['S0', 'S1', 'S2', 'S3'];
const METHODS = [['J0', 'S0'], ['A', 'S0'], ['B', 'S0'], ['C', 'S0'], ['J0', 'S1'], ['J0', 'S2'], ['J0', 'S3'], ['C', 'S3'], ['A', 'S3']];
const mkey = m => m[0] + '+' + m[1];

// ── 사주별 상수: 60갑자 평균(엔진 기준선과 같은 방식), 조후~역할점수 회귀
function chartCtx(ch) {
  const ctx = {};
  for (const lv of ['daeun', 'seun']) {
    const sw = LC.levels[lv].stemW; if (ctx[sw]) continue;
    const R = [], G = [], Jo = [], Eo = []; let kJ = 0, kG = 0;
    for (let i = 0; i < 60; i++) { const p = gz(i), r = M.unifiedLuckFit(ch, p, sw, 0), ev = M.evaluateLuck(ch, p, lv); R.push(r.roleFit); G.push(r.gyeok); Jo.push(ev.johuScore); Eo.push(ev.eokbuScore); kJ = r.kJ; kG = r.kG; }
    const mR = mean(R), mJ = mean(Jo); let sxy = 0, sxx = 0; R.forEach((x, i) => { sxy += (x - mR) * (Jo[i] - mJ); sxx += (x - mR) ** 2; });
    const beta = sxx > 1e-9 ? sxy / sxx : 0, alpha = mJ - beta * mR;
    let syy = 0; Jo.forEach(y => syy += (y - mJ) ** 2);
    ctx[sw] = { mR, mG: mean(G), mJ, mE: mean(Eo), beta, alpha, r2: sxx > 1e-9 && syy > 1e-9 ? sxy * sxy / (sxx * syy) : 0, kJ, kG };
  }
  return ctx;
}
// ── 구조 성분 분해: 균등 분포 보상(raw)과 생극 구조 보정(patAdj), 역할 방향이 같은 몫(gated)
function structParts(ch, ev) {
  const dEl = M.stemEl(ch.pillars.day.s), p = ev.p, g = [0, 0, 0, 0, 0], u = ch.unified;
  g[(M.stemEl(p.s) - dEl + 5) % 5] += 0.4;
  for (const [hs, dd] of M.HIDDEN[p.b]) g[(M.stemEl(hs) - dEl + 5) % 5] += 0.6 * dd / 30;
  const G = ch.weights.groups, need = G.map(pc => (SC.neutralPct - pc) / SC.neutralPct);
  let raw = 0, gated = 0, against = 0;
  for (let i = 0; i < 5; i++) { const c = g[i] * need[i], rv = u.roleV[(dEl + i) % 5]; raw += c; if (c * rv >= 0) gated += c; else against += c; }
  // 생극 구조 보정: 엔진과 같은 규칙으로 직접 계산(원국 구조 + 운이 만드는 구조, 합계 상한 cap 비례 축소)
  let patAdj = 0;
  for (const pt of ch.patterns.list) {
    const adj = SC.pattern[pt.name]; if (adj == null || pt.level === '참고') continue;
    const hit = (pt.name === '관살혼잡' && g[3] >= 0.4) || (pt.name === '상관견관' && g[1] >= 0.4) || (pt.name === '군겁쟁재' && g[0] >= 0.4) || (pt.name === '효신탈식(도식)' && g[4] >= 0.4);
    if (hit) patAdj += adj;
  }
  const lp = M.luckStructures(ch, p), lpSum = lp.reduce((s, x) => s + x.v, 0), lpK = Math.abs(lpSum) > SC.luck.cap ? SC.luck.cap / Math.abs(lpSum) : 1;
  patAdj += lpSum * lpK;
  const used = SC.roleGate ? gated : raw;   // 지금 엔진이 쓰는 균형 보상(역할 방향 조건이 켜졌으면 gated)
  const clamped = Math.abs(used * 100 * SC.scale + patAdj) > 100;
  const check = clamped ? 0 : Math.abs(clamp(used * 100 * SC.scale + patAdj, -100, 100) - ev.structureScore);
  return { g, raw, gated, against, patAdj, clamped, check };
}
// ── 대안 하나로 자기 운의 점수(ownFit) 다시 합성
function ownAlt(ch, ctx, ev, level, jm, sm, keep) {
  const sw = LC.levels[level].stemW, c = ctx[sw], u = ch.unified, w = ev.weights;
  if (jm === 'J0' && UL.johuDedup) jm = 'C';   // 지금 엔진이 C안이면 기준선도 C
  const r = M.unifiedLuckFit(ch, ev.p, sw, ev.johuScore);
  let kJ = r.kJ, kE = 0, jo = ev.johuScore; const kG = r.kG;
  if (jm === 'A' && u.primary === 'johu') kJ = 0;
  if (jm === 'B' && u.mode === 'conflict' && u.primary === 'johu') kE = UL.johuK;
  if (jm === 'C' && u.primary === 'johu' && kJ > 0) jo = ev.johuScore - (c.alpha + c.beta * r.roleFit);
  const roleW = jm === 'C' && u.primary === 'johu' && kJ > 0 ? 1 - kG : 1 - kJ - kE - kG;
  const base = roleW * c.mR + kG * c.mG;
  const uni = clamp(roleW * r.roleFit + kJ * jo + kE * (ev.eokbuScore - c.mE) + kG * r.gyeok - base, -100, 100);
  const st = structParts(ch, ev);
  let sp;
  if (sm === 'S0') sp = w.structure * ev.structureScore;
  else if (sm === 'S1') { sp = w.structure * ev.structureScore; const cap = Math.abs(w.unified * uni); if (Math.abs(sp) > cap) sp = Math.sign(sp) * cap; }
  else if (sm === 'S2') sp = w.structure * clamp(st.patAdj, -100, 100);
  else sp = w.structure * clamp(st.gated * 100 * SC.scale + st.patAdj, -100, 100);
  const own = clamp(w.unified * uni + w.relation * ev.relationScore + sp, -100, 100);
  if (keep) Object.assign(keep, { roleFit: r.roleFit, kJ, kE, kG, uni, sp, st, base, roleW, jo });
  return own;
}
const fitOf = (ev, level, own, parentFit) => { const P = LC.levels[level].parent; return P && parentFit != null ? clamp((1 - P) * own + P * parentFit + (ev.chain ? ev.chain.v : 0), -100, 100) : own; };

// ── 명식 모으기
let seed = 1113; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const named = [
  { tag: '앱 기본 예시(1990-03-15 14:30 여)', inp: { gender: 'F', calendar: 'solar', year: 1990, month: 3, day: 15, hour: 14, minute: 30, lon: 126.98, timeMode: 'lmt', school: 'auto' } },
  { tag: '1985-01-23 07:45 여 음력', inp: { gender: 'F', calendar: 'lunar', year: 1985, month: 1, day: 23, hour: 7, minute: 45, lon: 126.98, timeMode: 'lmt', school: 'auto' } },
];
const inputs = named.slice();
for (let i = 0; i < N; i++) inputs.push({ inp: { year: 1940 + Math.floor(rnd() * 75), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', lon: 126.98, timeMode: 'lmt', school: 'auto' } });
const groupsOf = u => {
  const t = u.theories, gs = [];
  if (u.mode === 'jong') gs.push('종격');
  else if (u.primary === 'eokbu') gs.push(t.johu.applicable ? '억부 우선(조후 보조)' : '억부 우선(조후 해당 없음)');
  else if (u.primary === 'johu') gs.push(u.mode === 'conflict' ? '조후 우선(억부와 충돌)' : '조후 우선(억부와 같은 방향)');
  else gs.push('기타 주 기준(' + u.primaryName + ')');
  if (t.eokbu.urgency >= 2 && t.johu.applicable && t.johu.urgency >= 2) gs.push('병행 필요(억부·조후 모두 필요 이상)');
  return gs;
};
const LEVELS = ['daeun', 'seun', 'wolun', 'ilun'], LNAME = { daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
const recs = [];   // {chart, level, ev, roleFit, base, alt:{key:fit}, grp}
const charts = []; let maxErrOwn = 0, maxErrFit = 0, maxErrBase = 0, nClamped = 0, maxErrStruct = 0;
for (const c of inputs) {
  let ch; try { ch = M.compute(c.inp); } catch (e) { continue; }
  const ctx = chartCtx(ch), u = ch.unified, gs = groupsOf(u);
  const info = { tag: c.tag, inp: c.inp, ch, ctx, groups: gs, daeun: [] };
  charts.push(info);
  const L = ch.daeun.list;
  // 각 운: alt 맵 계산, 부모의 alt 맵을 넘겨받는다
  const doEv = (ev, level, parentAlt, parentFitBase, extra) => {
    const alt = {}, keepBase = {};
    for (const m of METHODS) {
      const own = ownAlt(ch, ctx, ev, level, m[0], m[1], mkey(m) === 'J0+S0' ? keepBase : null);
      alt[mkey(m)] = fitOf(ev, level, own, parentAlt ? parentAlt[mkey(m)] : null);
      if (mkey(m) === 'J0+S0') { maxErrOwn = Math.max(maxErrOwn, Math.abs(own - ev.ownFit)); }
    }
    const fb = fitOf(ev, level, ev.ownFit, parentFitBase);
    maxErrFit = Math.max(maxErrFit, Math.abs(fb - ev.fitScore), Math.abs(alt['J0+S0'] - ev.fitScore));
    // 엔진 기준선과 같은지: uni = (1−kJ−kG)·role + kJ·jo + kG·gy − base
    const k = keepBase, rawU = k.roleW * k.roleFit + k.kJ * k.jo + k.kG * ev.gyeokScore - k.base;
    if (Math.abs(rawU) < 99.9) maxErrBase = Math.max(maxErrBase, Math.abs(rawU - ev.unifiedScore));
    if (k.st.clamped) nClamped++; maxErrStruct = Math.max(maxErrStruct, k.st.check);
    const rec = { chart: info, level, ev, roleFit: k.roleFit, st: k.st, keep: k, alt, ...extra };
    recs.push(rec); return rec;
  };
  const dRec = L.map(d => { const r = doEv(d.ev, 'daeun', null, null, { gz: M.gzName(d), age: d.startAge }); info.daeun.push(r); return r; });
  const seunBy = {};
  for (const it of M.seunRange(ch, 2016, 2035)) { const di = L.indexOf(it.daeun); const pr = di >= 0 ? dRec[di] : null; seunBy[it.year] = doEv(it.ev, 'seun', pr && pr.alt, pr && pr.ev.fitScore, { gz: M.gzName(it), year: it.year }); }
  const wolBy = {};
  for (const Y of [2026, 2027]) { const ps = seunBy[Y]; wolBy[Y] = M.wolun(ch, Y).map(it => ({ startMs: it.startMs, rec: doEv(it.ev, 'wolun', ps && ps.alt, ps && ps.ev.fitScore, { gz: M.gzName(it), year: Y }) })); }
  for (const [y, m] of [[2026, 11], [2026, 12]]) {
    M.ilun(ch, y, m).forEach((it, i) => {
      const ms = Date.UTC(y, m - 1, i + 1, 3), SY = M.yearPillarAt(ms).sajuYear, list = wolBy[SY] || [];
      let hit = null; for (const x of list) if (x.startMs <= ms) hit = x.rec;
      doEv(it.ev, 'ilun', hit && hit.alt, hit && hit.ev.fitScore, { gz: M.gzName(it), date: [y, m, i + 1] });
    });
  }
}
const out = [], log = s => { out.push(s); console.log(s); };
log('# 운세 점수 엔진 대안 비교 — ' + new Date().toLocaleDateString('sv-SE'));
log(`명식 ${charts.length}개(학파 자동), 운 평가 ${recs.length}개 — 대운 전부 · 세운 2016~2035 · 월운 2026~2027 · 일진 2026년 11~12월`);
log(`재합성 검증: 기존 방식 다시 합성 오차 최대 — 자기 운 점수 ${maxErrOwn.toExponential(1)}, 흐름 점수 ${maxErrFit.toExponential(1)}, 통합 용신 기준선 ${maxErrBase.toExponential(1)} · 구조 성분 직접 계산 ${maxErrStruct.toExponential(1)} (구조 점수가 ±100에 걸린 운 ${nClamped}개)`);
if (maxErrOwn > 1e-6 || maxErrFit > 1e-6 || maxErrStruct > 1e-6) { log('⚠ 재합성이 엔진 값과 다릅니다. 아래 비교를 믿을 수 없습니다.'); }
// 그룹 분포
const gcount = {}; charts.forEach(c => c.groups.forEach(g => gcount[g] = (gcount[g] || 0) + 1));
log('\n명식 분류: ' + Object.entries(gcount).map(([k, v]) => `${k} ${v}`).join(' · '));
// ── 지표
const yongClash = (rf, f) => (rf >= 20 && f <= CC.caution) || (rf <= -20 && f >= CC.tailwind);
const corrOf = (xs, ys) => { const mx = mean(xs), my = mean(ys); let a = 0, b = 0, c = 0; xs.forEach((x, i) => { a += (x - mx) * (ys[i] - my); b += (x - mx) ** 2; c += (ys[i] - my) ** 2; }); return b && c ? a / Math.sqrt(b * c) : 0; };
function metrics(list, key) {
  const d = list.map(r => r.alt[key] - r.ev.fitScore), ad = d.map(Math.abs).sort((x, y) => x - y);
  const gradeCh = list.filter(r => cond(r.alt[key]) !== r.ev.condition).length;
  const clash = list.filter(r => yongClash(r.roleFit, r.alt[key])).length;
  const dist = {}; list.forEach(r => { const c = cond(r.alt[key]); dist[c] = (dist[c] || 0) + 1; });
  const corr = corrOf(list.map(r => r.roleFit), list.map(r => r.alt[key]));
  return { corr, n: list.length, meanAbs: mean(ad), p95: ad[Math.floor(ad.length * 0.95)] || 0, max: ad[ad.length - 1] || 0, gradePct: gradeCh / list.length * 100, clashPct: clash / list.length * 100, dist };
}
const pc = v => v.toFixed(1) + '%', f1 = v => v.toFixed(1);
log('\n## 1. 단계별 변화 (기존 대비)');
log('| 방식 | 단계 | 평균 |Δ| | 95% |Δ| | 최대 |Δ| | 등급 바뀜 | 용신 판정과 반대 | 역할점수와 상관 | 순풍/보통/주의/부담 |');
log('|---|---|---|---|---|---|---|---|---|');
for (const m of METHODS) for (const lv of LEVELS) {
  const list = recs.filter(r => r.level === lv), x = metrics(list, mkey(m)), t = list.length;
  log(`| ${mkey(m)} | ${LNAME[lv]} | ${f1(x.meanAbs)} | ${f1(x.p95)} | ${f1(x.max)} | ${pc(x.gradePct)} | ${pc(x.clashPct)} | ${x.corr.toFixed(2)} | ${['순풍', '보통', '주의', '부담'].map(c => Math.round((x.dist[c] || 0) / t * 100)).join('/')} |`);
}
log('\n(용신 판정과 반대: 운 글자의 역할점수가 +20 이상(용신·희신 글자 위주)인데 흐름 점수가 주의 이하(−12), 또는 −20 이하인데 순풍(+18 이상)인 비율. 역할점수와 상관: 통합 용신 역할로 본 운 글자 점수와 최종 흐름 점수의 상관계수)');
log('\n## 2. 명식 분류별 영향 (대운·세운)');
log('| 분류 | 방식 | 명식 수 | 평균 |Δ| | 등급 바뀜 | 용신 판정과 반대 | 역할점수와 상관 |');
log('|---|---|---|---|---|---|---|');
for (const g of Object.keys(gcount)) for (const m of METHODS) {
  const list = recs.filter(r => (r.level === 'daeun' || r.level === 'seun') && r.chart.groups.includes(g)), x = metrics(list, mkey(m));
  if (!list.length) continue;
  log(`| ${g} | ${mkey(m)} | ${gcount[g]} | ${f1(x.meanAbs)} | ${pc(x.gradePct)} | ${pc(x.clashPct)} | ${x.corr.toFixed(2)} |`);
}
// ── 조후 중복 진단
log('\n## 3. 조후 중복 진단');
const jp = charts.filter(c => c.ch.unified.primary === 'johu'), r2 = jp.map(c => c.ctx[0.4].r2).sort((x, y) => x - y);
log(`- 조후가 주 기준인 명식 ${jp.length}개: 60갑자에서 조후 성분이 역할점수로 설명되는 비율(R²) 중앙값 ${r2.length ? r2[Math.floor(r2.length / 2)].toFixed(2) : '-'} (C안은 이 몫을 빼고 나머지만 더함), 기울기 β 중앙값 ${(()=>{const b=jp.map(c=>c.ctx[0.4].beta).sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)].toFixed(2):'-'})()}`);
const ep = charts.filter(c => c.ch.unified.primary === 'eokbu' && c.ch.unified.theories.johu.applicable), r2e = ep.map(c => c.ctx[0.4].r2).sort((x, y) => x - y);
log(`- 억부가 주 기준이고 조후가 보조인 명식 ${ep.length}개: 같은 R² 중앙값 ${r2e.length ? r2e[Math.floor(r2e.length / 2)].toFixed(2) : '-'} (역할표가 억부 기준이라 조후 30%는 다른 근거 — 중복 아님)`);
// ── 구조(십성 균형) 진단
log('\n## 4. 십성 균형(구조) 진단 — 대운');
const dl = recs.filter(r => r.level === 'daeun');
const share20 = dl.map(r => { const a = Math.abs(r.st.raw * 100 * SC.scale), p = Math.abs(r.st.patAdj); return a / (a + p + 1e-9); });
const againstShare = dl.filter(r => Math.abs(r.st.against) > 1e-9).length;
const againstBig = dl.filter(r => Math.abs(r.ev.weights.structure * r.st.against * 100 * SC.scale) >= 5).length;
log(`- 구조 점수에서 균등 분포(각 묶음 20%) 보상이 차지하는 몫 평균 ${(mean(share20) * 100).toFixed(0)}% (나머지는 관살혼잡·식신제살 등 생극 구조 보정)`);
log(`- 균등 분포 보상 중 통합 용신 역할과 반대 방향인 몫(예: 기신 묶음이 모자라다고 +)이 있는 대운 ${againstShare}/${dl.length} (${pc(againstShare / dl.length * 100)}), 그 몫이 흐름 점수로 5점 이상인 대운 ${againstBig} (${pc(againstBig / dl.length * 100)})`);
const flip = k => dl.filter(r => { const y = r.ev.weights.unified * (k === 'S0' ? r.ev.unifiedScore : r.keep.uni); const f = r.alt['J0+' + k]; return Math.abs(y) >= 5 && Math.abs(f) >= 1 && Math.sign(y) !== Math.sign(f); }).length;
log(`- 용신 몫(|값|≥5)과 최종 대운 점수의 부호가 반대: S0 ${flip('S0')} · S1 ${flip('S1')} · S2 ${flip('S2')} · S3 ${flip('S3')} (대운 ${dl.length}개 중)`);
// ── 대표 사례
log('\n## 5. 대표 사례 (대운, 흐름 점수)');
const pick = [];
pick.push(charts.find(c => c.tag && c.tag.startsWith('앱')));
pick.push(charts.find(c => c.tag && c.tag.startsWith('1985')));
pick.push(charts.find(c => !c.tag && c.ch.unified.mode === 'single' && c.ch.unified.primary === 'eokbu' && !c.ch.unified.theories.johu.applicable));
pick.push(charts.find(c => !c.tag && c.ch.unified.mode === 'conflict' && c.ch.unified.primary === 'johu'));
pick.push(charts.find(c => !c.tag && c.ch.unified.mode === 'conflict' && c.ch.unified.primary === 'eokbu'));
pick.push(charts.find(c => !c.tag && (c.ch.unified.mode === 'jong' || Math.abs(c.ch.strength.help - 50) >= 35)));
for (const c of pick.filter(Boolean)) {
  const u = c.ch.unified, P = c.ch.pillars, lab = c.tag || `${c.inp.year}-${c.inp.month}-${c.inp.day} ${c.inp.hour}시 ${c.inp.gender}`;
  log(`\n### ${lab} — ${['year', 'month', 'day', 'hour'].map(k => P[k] ? M.gzName(P[k]) : '?').join(' ')} · ${u.headline} · 모드 ${u.mode} · 돕는 힘 ${Math.round(c.ch.strength.help)}% · 분류 ${c.groups.join(', ')}`);
  log(`- 역할: ${[0, 1, 2, 3, 4].map(e => EK[e] + ' ' + u.roles[e] + '(' + u.roleV[e] + ')').join(' · ')} · kJ ${c.ctx[0.4].kJ} · kG ${c.ctx[0.4].kG} · 조후~역할 R² ${c.ctx[0.4].r2.toFixed(2)}`);
  log('| 대운 | 역할점수 | 조후 | 억부 | 균등보상 | 생극보정 | 기존 | A | B | C | S1 | S2 | S3 | C+S3 |');
  log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  c.daeun.slice(0, 9).forEach(r => {
    const A = r.alt, cd = k => sg(A[k]) + (cond(A[k]) !== r.ev.condition ? '(' + cond(A[k]) + ')' : '');
    log(`| ${r.age}세 ${r.gz} | ${sg(r.roleFit)} | ${sg(r.ev.johuScore)} | ${sg(r.ev.eokbuScore)} | ${sg(r.st.raw * 100 * SC.scale)} | ${sg(r.st.patAdj)} | ${sg(r.ev.fitScore)} ${r.ev.condition} | ${cd('A+S0')} | ${cd('B+S0')} | ${cd('C+S0')} | ${cd('J0+S1')} | ${cd('J0+S2')} | ${cd('J0+S3')} | ${cd('C+S3')} |`);
  });
}
if (mdPath) { fs.writeFileSync(path.join(root, mdPath), out.join('\n') + '\n'); console.log('\n저장: ' + mdPath); }
// --dump 파일: 운 평가마다 엔진 흐름 점수와 각 대안 점수를 저장(엔진 변경 전 예측값과 변경 후 실제값을 맞춰 보는 용도)
const dumpAt = process.argv.indexOf('--dump');
if (dumpAt > 0) { fs.writeFileSync(process.argv[dumpAt + 1], JSON.stringify({ n: recs.length, keys: recs.map(r => [r.chart.inp.year, r.chart.inp.month, r.chart.inp.day, r.chart.inp.hour, r.level, r.gz]), fit: recs.map(r => r.ev.fitScore), cond: recs.map(r => r.ev.condition), alt: Object.fromEntries(METHODS.map(m => [mkey(m), recs.map(r => r.alt[mkey(m)])])) })); console.log('dump: ' + recs.length); }
