// 30년 장기 구간(luck-cycle.js) 검증 도구 — 점수 산식은 바꾸지 않고 측정만 한다. 2026-11-13
//   node tools/luck-cycle-verify.cjs [명식 수=1500] [--md docs/파일.md]
// (1) 이전 버전(git HEAD 의 luck-cycle.js)과 지금 버전의 30년 구간을 명식별로 비교: 대표 오행·해석 성격·흐름 모양·첫 문구
// (2) 조후 중복 반영 측정: 조후가 주 기준일 때 역할표(조후 용신 기준)와 별도 조후 항(kJ×조후 성분)이 같은 방향을 두 번 세는지
// (3) 십성 균형(구조 성분)이 용신 판단의 부호를 뒤집는 대운 비율
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), os = require('os');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a = src.indexOf('var MANSE_DATA'), b = src.indexOf('})(typeof window', a);
vm.runInThisContext(src.slice(a, src.indexOf('\n', b)));
const M = globalThis.Manse, LC = require(path.join(root, 'luck-cycle.js'));
// 이전 버전: 전역(MantraLuckCycle)을 덮어쓰지 않도록 별도 파일로 꺼내 module.exports 로만 읽는다
let OLD = null;
try {
  const old = cp.execSync('git show HEAD:luck-cycle.js', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const tmp = path.join(os.tmpdir(), 'luck-cycle-head-' + process.pid + '.cjs');
  fs.writeFileSync(tmp, old); const keep = globalThis.MantraLuckCycle; OLD = require(tmp); globalThis.MantraLuckCycle = keep; fs.unlinkSync(tmp);
  if (OLD.VERSION === LC.VERSION) OLD = null;
} catch (e) { OLD = null; }
const N = +process.argv[2] || 1500, mdAt = process.argv.indexOf('--md'), mdPath = mdAt > 0 ? process.argv[mdAt + 1] : null;
let seed = 20261113; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const EK = M.EL_K, sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v));
const cases = [
  { tag: '앱 기본 예시(1990-03-15 14:30 여 양력)', inp: { gender: 'F', calendar: 'solar', year: 1990, month: 3, day: 15, hour: 14, minute: 30, lon: 126.98, timeMode: 'lmt', school: 'auto' } },
  { tag: '1985-01-23 07:45 여 음력 서울', inp: { gender: 'F', calendar: 'lunar', year: 1985, month: 1, day: 23, hour: 7, minute: 45, lon: 126.98, timeMode: 'lmt', school: 'auto' } },
  { tag: '토→수→목 재현(1993-05-06 17시 여 양력)', inp: { gender: 'F', calendar: 'solar', year: 1993, month: 5, day: 6, hour: 17, minute: 0, lon: 126.98, timeMode: 'lmt', school: 'auto' } },
];
const SCH = ['auto', 'auto', 'auto', 'eokbu', 'johu'];
for (let i = 0; i < N; i++) cases.push({ inp: { year: 1940 + Math.floor(rnd() * 75), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', lon: 126.98, timeMode: 'lmt', school: SCH[i % 5] } });
const out = [], log = s => { out.push(s); console.log(s); };
const C = { charts: 0, spans: 0, mainChanged: 0, toneChanged: 0, trendChanged: 0, hookRiskAdded: 0, oldGoodWithCaution: 0, newGoodWithCaution: 0, oldNoRiskHook: 0, mix: { 1: 0, 2: 0, 3: 0 }, oldRoleScoreMismatch: 0, newRoleScoreMismatch: 0, newExplained: 0, oldTurnsMissing: 0 };
// 조후 중복 측정용
const J = { daeun: 0, johuPrimary: 0, sameDir: 0, oppDir: 0, johuShare: [], roleJohuCorr: [], conflictDaeun: 0, conflictEokbuLostNoTerm: 0 };
// 구조 뒤집힘 측정용
const S = { daeun: 0, flip: 0, flipByStructure: 0, flipCondChange: 0, examples: [] };
const sample = [];
for (const c of cases) {
  let ch; try { ch = M.compute(c.inp); } catch (e) { continue; }
  C.charts++;
  const u = ch.unified, L = ch.daeun.list, now = sp => LC.daeunSpans(M, ch, { year: 2026 });
  const NS = now(), OS = OLD ? OLD.daeunSpans(M, ch) : null;
  NS.forEach((s, k) => {
    if (s.items.length < 3) return;
    C.spans++; C.mix[s.mix]++;
    const o = OS && OS[k];
    if (o) {
      if (o.mainEl !== s.mainEl) C.mainChanged++;
      if (o.tone !== s.tone) C.toneChanged++;
      if (o.trend !== s.trend) C.trendChanged++;
      const hasCaution = s.items.some(x => x.ev.condition === '주의' || x.ev.condition === '부담');
      if (o.tone === 'good' && hasCaution) C.oldGoodWithCaution++;
      if (s.tone === 'good' && hasCaution) C.newGoodWithCaution++;
      if (hasCaution && !/조심/.test(o.hook)) C.oldNoRiskHook++;
      if (hasCaution && /조심/.test(s.hook) && !/조심/.test(o.hook)) C.hookRiskAdded++;
      const rv = u.roleV[o.mainEl], rn = u.roleV[s.mainEl];
      if ((rv < 0 && o.avg >= 8) || (rv > 0 && o.avg <= -8)) C.oldRoleScoreMismatch++;
      if ((rn < 0 && s.avg >= 8) || (rn > 0 && s.avg <= -8)) { C.newRoleScoreMismatch++; if (/끌어올린 쪽은|끌어내린 쪽은|최종 평가가 다른 이유/.test(s.steps.impact)) C.newExplained++; }
      for (let j = s.idx[0] + 1; j <= s.idx[2]; j++) { const dv = L[j].ev.fitScore - L[j - 1].ev.fitScore, cd = L[j].ev.condition !== L[j - 1].ev.condition; if ((Math.abs(dv) >= 10 || cd) && !o.turns.some(t => t.i === j)) C.oldTurnsMissing++; }
    }
    if (c.tag) sample.push({ tag: c.tag, k, o, s });
  });
  // 대운별 측정
  L.forEach(d => {
    const ev = d.ev, w = ev.weights, r = M.unifiedLuckFit(ch, d, M.LUCK_CFG.levels.daeun.stemW, ev.johuScore);
    J.daeun++;
    if (u.theories.johu.applicable && r.kJ > 0) {
      const roleTerm = (1 - r.kJ - r.kG) * r.roleFit, johuTerm = r.kJ * ev.johuScore;
      if (u.primary === 'johu') {
        J.johuPrimary++;
        J.johuShare.push(Math.abs(johuTerm) / (Math.abs(roleTerm) + Math.abs(johuTerm) + 1e-9));
        J.roleJohuCorr.push([r.roleFit, ev.johuScore]);
        if (Math.abs(roleTerm) >= 5 && Math.abs(johuTerm) >= 2) { if (Math.sign(roleTerm) === Math.sign(johuTerm)) J.sameDir++; else J.oppDir++; }
      }
      if (u.mode === 'conflict') { J.conflictDaeun++; if (u.primary === 'johu') J.conflictEokbuLostNoTerm++; }
    }
    const y = w.unified * ev.unifiedScore, st = w.structure * ev.structureScore, rl = w.relation * ev.relationScore, f = ev.ownFit;
    S.daeun++;
    if (Math.abs(y) >= 5 && Math.abs(f) >= 1 && Math.sign(y) !== Math.sign(f)) {
      S.flip++;
      if (Math.abs(st) >= Math.abs(rl)) { S.flipByStructure++; const cy = M.conditionOf ? M.conditionOf(Math.max(-100, Math.min(100, y + rl))) : null; /* 구조 성분이 없었다면의 상태 */ if (cy && cy !== ev.condition) S.flipCondChange++; if (S.examples.length < 6) S.examples.push(`${c.tag || JSON.stringify(c.inp).slice(0, 60)} ${M.gzName(d)}(${d.startAge}세): 용신 ${sg(y)} · 관계 ${sg(rl)} · 구조 ${sg(st)} → ${sg(f)} ${ev.condition}`); }
    }
  });
}
const corr = xs => { const n = xs.length; if (n < 3) return NaN; const mx = xs.reduce((s, p) => s + p[0], 0) / n, my = xs.reduce((s, p) => s + p[1], 0) / n; let sxy = 0, sxx = 0, syy = 0; xs.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }); return sxy / Math.sqrt(sxx * syy); };
const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '-';
log('# 30년 장기 구간 검증 — ' + new Date().toLocaleDateString('sv-SE'));
log(`명식 ${C.charts}개 · 30년(대운 3개) 구간 ${C.spans}개 · 이전 버전 ${OLD ? OLD.VERSION : '없음(비교 생략)'} → 지금 ${LC.VERSION}`);
log('\n## 1. 이전·지금 비교');
log(`- 대표 오행이 바뀐 구간: ${C.mainChanged} (${pct(C.mainChanged, C.spans)})`);
log(`- 지금 표기: 단일 ${C.mix[1]} (${pct(C.mix[1], C.spans)}) · 2개 복합 ${C.mix[2]} (${pct(C.mix[2], C.spans)}) · 3개 이상 혼재 ${C.mix[3]} (${pct(C.mix[3], C.spans)})`);
log(`- 해석 성격이 바뀐 구간: ${C.toneChanged} (${pct(C.toneChanged, C.spans)}), 흐름 모양이 바뀐 구간: ${C.trendChanged} (${pct(C.trendChanged, C.spans)})`);
log(`- 주의·부담 대운이 있는데 '도움(good)'으로 본 구간: 이전 ${C.oldGoodWithCaution} → 지금 ${C.newGoodWithCaution}`);
log(`- 주의·부담 대운이 있는데 첫 문구에 위험이 없던 구간(이전): ${C.oldNoRiskHook} → 지금 첫 문구에 '조심' 추가 ${C.hookRiskAdded}`);
log(`- 대표 오행의 역할과 평균 점수 방향이 반대(±8 이상): 이전 ${C.oldRoleScoreMismatch}(설명 없음) → 지금 ${C.newRoleScoreMismatch}, 그중 이유 문장이 붙은 구간 ${C.newExplained}`);
log(`- 이전 버전에서 빠졌던 구간 안 전환점: ${C.oldTurnsMissing}`);
log('\n### 대표 명식');
for (const x of sample) {
  const s = x.s, o = x.o;
  log(`- ${x.tag} · 구간 ${x.k + 1}(${s.startAge}~${s.endAge}세, ${s.items.map(d => M.gzName(d)).join('·')}) 점수 ${s.scores.map(sg).join(' → ')}`);
  if (o) log(`  - 이전: ${EK[o.mainEl]} · ${o.tone} · ${o.trend} · "${o.hook}"`);
  log(`  - 지금: ${s.elLabel} (비중 ${[0, 1, 2, 3, 4].sort((p, q) => s.share[q] - s.share[p]).slice(0, 3).map(e => EK[e] + Math.round(s.share[e]) + '%').join(' ')}) · 도운 ${s.helpEl != null ? EK[s.helpEl] : '-'} · 누른 ${s.dragEl != null ? EK[s.dragEl] : '-'} · ${s.tone} · ${s.trend} · "${s.hook}"`);
}
log('\n## 2. 조후 중복 반영 측정 (점수는 그대로, 측정만)');
const js = J.johuShare.slice().sort((p, q) => p - q), med = js.length ? js[Math.floor(js.length / 2)] : NaN;
log(`- 조후가 주 기준인 대운 ${J.johuPrimary}개: 운 점수의 용신 성분 안에서 별도 조후 항(kJ=${M.UNIFIED_CFG.luck.johuK}×조후 성분)의 몫 중앙값 ${(med * 100).toFixed(0)}%`);
log(`- 같은 대운에서 역할표 점수(조후 용신 기준)와 별도 조후 항의 상관계수 ${corr(J.roleJohuCorr).toFixed(2)}, 방향이 같은 경우 ${J.sameDir} / 반대 ${J.oppDir}`);
log(`- 억부·조후 충돌(conflict) 대운 ${J.conflictDaeun}개 중 조후가 이겨 억부는 별도 항 없이 '조건부 완화'로만 남은 대운 ${J.conflictEokbuLostNoTerm}개`);
log('- 해석: 조후가 주 기준이면 역할표 자체가 조후 용신으로 짜이고(70%), 같은 조후 판단을 글자별 기후 점수로 다시 30% 더한다. 상관이 높을수록 같은 근거를 두 번 세는 몫이 크다. 억부가 이긴 경우에는 조후 30%가 반대 이론의 몫이라 중복이 아니다.');
log('\n## 3. 십성 균형(구조 성분)이 용신 판단을 뒤집는 대운');
log(`- 전체 대운 ${S.daeun}개 중 용신 성분(|값|≥5)과 최종 흐름 점수의 부호가 반대: ${S.flip} (${pct(S.flip, S.daeun)}), 그중 구조 성분이 주원인: ${S.flipByStructure} (${pct(S.flipByStructure, S.daeun)}), 그 때문에 상태(순풍·보통·주의·부담) 이름까지 달라진 대운 ${S.flipCondChange}`);
S.examples.forEach(e => log('  - ' + e));
if (mdPath) { fs.writeFileSync(path.join(root, mdPath), out.join('\n') + '\n'); console.log('\n저장: ' + mdPath); }
