// 두 사람 궁합 2판(6항목·양방향) 검증:  node tests/compat-pair-v2-sim.cjs [쌍 수=1200] [--md]
//  ① 범위·NaN·결정성 ② A·B 순서를 바꿔도 총점·항목 점수가 같고 양방향 해석만 뒤바뀜 ③ 관계 유형에 따라 해석이 달라짐
//  ④ 사례(신강·신약·조후 불균형·억부↔조후 충돌·오행 과다·결핍)에서 방향성이 상식과 맞음 ⑤ 십성 항목이 오행 항목과 중복되지 않음
//  ⑥ 1판(evaluateLegacy) 회귀·전후 점수 비교표(--md 를 주면 docs/COMPAT_V2_COMPARE_2026-11-16.md 로 저장)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'compat-pair.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, P = ctx.PairCompat, I = P._internal;
const N = +process.argv[2] || 1200, MD = process.argv.includes('--md');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
let seed = 20261116; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const opt = { calendar: 'solar', leap: false, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu', combinationMode: 'auto', climatePalaceMode: 'auto' };
const mk = (y, m, d, h, mi, g) => M.compute(Object.assign({ year: y, month: m, day: d, hour: h, minute: mi, gender: g }, opt));
const charts = [];
while (charts.length < 160) { try { charts.push(mk(1940 + Math.floor(rnd() * 70), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), rnd() < 0.1 ? null : Math.floor(rnd() * 24), 0, rnd() < 0.5 ? 'M' : 'F')); } catch (e) { } }
const pairs = []; while (pairs.length < N) { const i = Math.floor(rnd() * charts.length), j = Math.floor(rnd() * charts.length); if (i !== j) pairs.push([charts[i], charts[j]]); }
const RELS = Object.keys(P.REL_TYPES);
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; a.forEach((x, i) => { n += (x - ma) * (b[i] - mb); da += (x - ma) ** 2; db += (b[i] - mb) ** 2; }); return n / Math.sqrt(da * db || 1); };

// ── ①②③ 기본·대칭·관계 유형 ──
const oldS = { lover: [], work: [], friend: [], family: [] }, newS = { lover: [], work: [], friend: [], family: [] }, raws = [];
let symN = 0, relDiff = 0, relTxtDiff = 0, asymN = 0;
const elDir = [], tgDir = [], gradeMove = {};
for (const [A, B] of pairs) {
  const byRel = {};
  for (const rel of RELS) {
    const r = P.evaluate(M, A, B, rel, { a: '가람', b: '나래' }), s = P.evaluate(M, B, A, rel, { a: '나래', b: '가람' }), o = P.evaluateLegacy(M, A, B, rel);
    byRel[rel] = r;
    ok(r.version === 2, '2판이 아님');
    ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100, `점수 범위 ${r.score}`);
    ok(r.parts.length === 6 && r.parts.reduce((x, p) => x + p.weight, 0) === 100, '6항목·가중치 합 100');
    ok(r.parts.every(p => Number.isInteger(p.score) && p.score >= 0 && p.score <= 100), '항목 점수 범위');
    ok(r.parts.some(p => p.key === 'tenGod' && p.label === '십성 상호 보완'), '십성 상호 보완 항목');
    ok(JSON.stringify(r).indexOf('NaN') < 0 && JSON.stringify(r).indexOf('undefined') < 0, 'NaN/undefined 문구');
    ok(r.directions.ab.help.length + r.directions.ab.burden.length > 0 && r.directions.ba.help.length + r.directions.ba.burden.length > 0, '양방향 설명 비어 있음');
    ok(r.summary3.help.length && r.summary3.conflict.length >= 0 && r.summary3.grow.length, '종합평 세 칸');
    ok(!/확률|%의 확률|성공률|헤어질 것|반드시/.test(JSON.stringify([r.directions, r.summary3, r.asym])), '확률·단정 표현');
    // 대칭: 총점·항목 점수 같음, 양방향은 뒤바뀜
    symN++;
    ok(r.score === s.score, `순서 바꾸면 총점 다름 ${r.score}/${s.score}`);
    ok(r.parts.every((p, k) => p.score === s.parts[k].score), '순서 바꾸면 항목 점수 다름 ' + r.parts.map((p, k) => p.key + p.score + '/' + s.parts[k].score).join(' '));
    ok(r.directions.ab.score === s.directions.ba.score && r.directions.ba.score === s.directions.ab.score, '양방향 점수가 뒤바뀌지 않음');
    ok(JSON.stringify(r.directions.ab.help) === JSON.stringify(s.directions.ba.help), '양방향 해석이 뒤바뀌지 않음');
    if (r.asym) asymN++;
    oldS[rel].push(o.score); newS[rel].push(r.score); raws.push(r.raw);
    const k = o.grade.name + '→' + r.grade.name; gradeMove[k] = (gradeMove[k] || 0) + 1;
    if (rel === 'lover') { elDir.push(r.element.aGets.score, r.element.bGets.score); tgDir.push(r.element.aGets.tenGod, r.element.bGets.tenGod); }
  }
  const sc = RELS.map(k => byRel[k].score); if (new Set(sc).size > 1) relDiff++;
  const tx = RELS.map(k => byRel[k].summary3.grow[0] + byRel[k].directions.ab.help.join()); if (new Set(tx).size === RELS.length) relTxtDiff++;
}
ok(relDiff / N >= 0.8, `관계 유형별 점수가 다른 쌍 비율 ${relDiff}/${N}`);
ok(relTxtDiff / N >= 0.95, `관계 유형별 해석이 다른 쌍 비율 ${relTxtDiff}/${N}`);
const all = RELS.flatMap(k => newS[k]), allOld = RELS.flatMap(k => oldS[k]);
ok(Math.abs(q(all, 0.5) - q(allOld, 0.5)) <= 3, `중앙값이 1판과 3점 넘게 다름 ${q(all, 0.5)}/${q(allOld, 0.5)}`);
ok(q(all, 0.9) - q(all, 0.1) >= 15, '점수 폭이 너무 좁음');
ok(new Set(all.map(s => P.gradeOf(s).name)).size >= 5, '등급 종류가 적음');
// ⑤ 중복 없음: 같은 방향의 ①(오행)과 ⑤(십성) 점수 상관
const rElTg = corr(elDir, tgDir);
ok(rElTg < 0.8, `오행·십성 항목 상관이 너무 높음 r=${rElTg.toFixed(2)}`);

// ── ④ 사례 ──
const pick = (f, n = 40) => charts.filter(f).slice(0, n);
const weak = pick(c => c.strength.help < 38), strong = pick(c => c.strength.help > 62);
const supplyOf = (A, B, gs) => { const d = I.tenGodDir(M, A, B); return gs.reduce((s, g) => s + d.groups[g].share, 0); };
// 신약 A: 상대가 인성·비겁을 많이 줄 때가 재·관을 많이 줄 때보다 ⑤ 방향 값이 높아야 한다
const caseRows = [];
function dirCase(name, As, wantHigh, wantLow) {
  const hi = [], lo = [];
  for (const A of As) for (const B of charts) { if (A === B) continue; const d = I.tenGodDir(M, A, B); const sh = g => g.reduce((s, x) => s + d.groups[x].share, 0); if (sh(wantHigh) >= 0.45) hi.push(d.f); if (sh(wantLow) >= 0.45) lo.push(d.f); }
  const ok2 = hi.length && lo.length && mean(hi) > mean(lo);
  ok(ok2, `${name}: 기대 방향과 다름 (${mean(hi).toFixed(3)} vs ${mean(lo).toFixed(3)})`);
  caseRows.push([name, As.length, hi.length, mean(hi).toFixed(3), lo.length, mean(lo).toFixed(3), ok2 ? '맞음' : '다름']);
}
dirCase('신약 — 인성·비겁 많은 상대 > 재성·관성 많은 상대', weak, [4, 0], [2, 3]);
dirCase('신강 — 식상·재성·관성 많은 상대 > 인성·비겁 많은 상대', strong, [1, 2, 3], [4, 0]);
// 조후 불균형: 더운 사주는 차고 습한 상대에게서 ① 조후 성분이 +, 같은 더운 상대에게서는 −
const hot = pick(c => c.climate.temp >= 0.7 && c.yongAll.johu.applicable), cold = pick(c => c.climate.temp <= -0.7 && c.yongAll.johu.applicable);
function climCase(name, As, good, bad) {
  const g = [], b = [];
  for (const A of As) for (const B of charts) { if (A === B) continue; const e = I.elementDir(M, A, B); if (good(B)) g.push(e.clim); if (bad(B)) b.push(e.clim); }
  const ok2 = g.length && b.length && mean(g) > 0 && mean(b) < 0;
  ok(ok2, `${name}: 조후 방향 이상 (${mean(g).toFixed(2)} / ${mean(b).toFixed(2)})`);
  caseRows.push([name, As.length, g.length, mean(g).toFixed(3), b.length, mean(b).toFixed(3), ok2 ? '맞음' : '다름']);
}
climCase('조후 — 더운 사주: 찬 상대 + / 더운 상대 −', hot, B => B.climate.temp <= -0.4, B => B.climate.temp >= 0.6);
climCase('조후 — 추운 사주: 더운 상대 + / 찬 상대 −', cold, B => B.climate.temp >= 0.4, B => B.climate.temp <= -0.6);
// 억부↔조후 충돌: 두 기준을 따로 계산하고(둘 다 값이 있음), 충돌 표시가 나오며, 합친 값은 두 값 사이(임의 우선 없음)
let confN = 0, confBetween = 0;
for (const [A, B] of pairs) { const e = I.elementDir(M, A, B); if (!e.conflict) continue; confN++; const lo = Math.min(e.eok, e.jo), hi = Math.max(e.eok, e.jo); if (e.f >= lo - 1e-9 && e.f <= hi + 1e-9) confBetween++; }
ok(confN >= 10, `억부·조후 충돌 사례가 적음 ${confN}`);
ok(confBetween === confN, `충돌 시 합친 값이 두 기준 사이가 아님 ${confBetween}/${confN}`);
caseRows.push(['억부↔조후 충돌 — 합친 값이 두 기준 사이', '-', confN, '', confBetween, '', confBetween === confN ? '맞음' : '다름']);
// 결핍 오행을 상대가 가졌다는 이유만으로 ⑤가 가산되지 않음: 내 원국에 0%인 오행이 통합 판단에서 기신·구신이면 그 십성 값은 양수가 아니어야 한다
let lackN = 0, lackPos = 0;
for (const [A, B] of pairs) { const nv = I.needView(A), d = I.tenGodDir(M, A, B); d.groups.forEach(x => { if ((A.weights.pct[x.e] || 0) < 3 && nv.uniV[x.e] < 0 && nv.eRoles[x.e] !== '용신' && nv.eRoles[x.e] !== '희신' && (!nv.jRoles || rv(nv.jRoles[x.e]) <= 0)) { lackN++; if (x.v > 0.15) lackPos++; } }); }
function rv(r) { return { '용신': 1, '희신': 0.6, '구신': -0.5, '기신': -1 }[r] || 0; }
ok(lackPos <= lackN * 0.05, `결핍이지만 꺼리는 십성이 가산됨 ${lackPos}/${lackN}`);
caseRows.push(['결핍 오행이 기신·구신 — ⑤ 가산 없음', '-', lackN, '', lackPos, '', lackPos <= lackN * 0.05 ? '맞음' : '다름']);
// 과다: 내 원국에 35% 넘게 많은 십성을 상대가 더 주면(태과) 그 십성의 값이 평균적으로 낮다
let overV = [], normV = [];
for (const [A, B] of pairs) { const d = I.tenGodDir(M, A, B); d.groups.forEach(x => { (d.nat[x.g] >= 0.35 ? overV : normV).push(x.v); }); }
ok(mean(overV) < mean(normV), `과다 십성 값이 낮지 않음 ${mean(overV).toFixed(3)}/${mean(normV).toFixed(3)}`);
caseRows.push(['과다 십성(35%↑)을 더 받음 — 값이 낮음', '-', overV.length, mean(overV).toFixed(3), normV.length, mean(normV).toFixed(3), mean(overV) < mean(normV) ? '맞음' : '다름']);

// ── ⑥ 1판 회귀: 1판 산식은 그대로(기존 시뮬레이션과 같은 예시 값) ──
const ex = [mk(1992, 6, 23, 1, 45, 'M'), mk(1990, 3, 15, 14, 30, 'F'), mk(1985, 11, 2, null, 0, 'F'), mk(2001, 1, 31, 23, 59, 'M'), mk(1975, 8, 8, 8, 8, 'M'), mk(1999, 12, 25, 12, 0, 'F')];
const L = P.evaluateLegacy(M, ex[0], ex[1], 'lover');
ok(L.parts.length === 5 && L.parts.map(p => p.key).join() === 'yong,dayStem,dayBranch,harmony,balance', '1판 항목 구성 변경됨');
ok(JSON.stringify(P.evaluate(M, ex[0], ex[1], 'lover')) === JSON.stringify(P.evaluate(M, ex[0], ex[1], 'lover')), '결정적');
ok(P.evaluate(M, ex[0], ex[2], 'work').relations.every(x => x.bPos !== 'hour' && x.aPos.length), '시주 없는 상대');
// 옛 엔진(통합 판단 없음) 입력은 1판으로 계산
const stripped = Object.assign({}, ex[0], { unified: null });
ok(P.evaluate(M, stripped, ex[1], 'lover').parts.length === 5, '통합 판단 없는 입력의 1판 대체');

// ── 출력 ──
const cal = { mid: q(raws, 0.5), center: q(allOld, 0.5), k: (q(allOld, 0.9) - q(allOld, 0.1)) / (q(raws, 0.9) - q(raws, 0.1)) };
console.log(`쌍 ${N}개 × 관계 ${RELS.length} · 대칭 검사 ${symN}회 · 비대칭 설명 ${asymN}건 · 관계별 점수 다른 쌍 ${relDiff} · 해석 다른 쌍 ${relTxtDiff}`);
console.log(`오행(①)·십성(⑤) 방향 점수 상관 r=${rElTg.toFixed(2)} · 억부·조후 충돌 ${confN}건`);
console.log(`펼침 보정값(참고): mid ${cal.mid.toFixed(1)} center ${cal.center} k ${cal.k.toFixed(2)} · 현재 ${JSON.stringify(P.SPREAD)}`);
const row = (name, a) => `| ${name} | ${mean(a).toFixed(1)} | ${q(a, 0.1)} | ${q(a, 0.5)} | ${q(a, 0.9)} | ${Math.min(...a)}~${Math.max(...a)} |`;
const md = [];
md.push('# 궁합 2판(6항목·양방향) 전후 비교 — 2026-11-16', '', `생성: \`node tests/compat-pair-v2-sim.cjs ${N} --md\` · 무작위 사주 ${charts.length}개에서 뽑은 ${N}쌍 × 관계 4종. 1판 = \`PairCompat.evaluateLegacy\`(5항목), 2판 = \`PairCompat.evaluate\`(6항목).`, '');
md.push('## 총점 분포', '', '| 구분 | 평균 | 하위10% | 중앙 | 상위10% | 최저~최고 |', '|---|---|---|---|---|---|');
for (const rel of RELS) { md.push(row(`1판 ${P.REL_TYPES[rel].label}`, oldS[rel])); md.push(row(`2판 ${P.REL_TYPES[rel].label}`, newS[rel])); }
md.push(row('1판 전체', allOld), row('2판 전체', all), '');
const diffs = RELS.flatMap(k => newS[k].map((v, i) => Math.abs(v - oldS[k][i])));
md.push(`같은 쌍의 1판↔2판 점수 차: 평균 ${mean(diffs).toFixed(1)}점, 중앙 ${q(diffs, 0.5)}점, 상위10% ${q(diffs, 0.9)}점. 같은 등급 유지 ${Object.entries(gradeMove).filter(([k]) => k.split('→')[0] === k.split('→')[1]).reduce((s, [, v]) => s + v, 0)}/${N * 4}.`, '');
md.push('## 등급 이동(1판 → 2판, 상위 12개)', '', '| 이동 | 건수 |', '|---|---|', ...Object.entries(gradeMove).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `| ${k} | ${v} |`), '');
md.push('## 예시 쌍(기존 시뮬레이션의 6명)', '', '| 쌍 | 관계 | 1판 | 2판 | 2판 항목(오행·일간·일지·간지·십성·관계) | 양방향(B→A / A→B) |', '|---|---|---|---|---|---|');
for (const [i, j] of [[0, 1], [0, 2], [3, 5], [4, 1], [2, 5]]) for (const rel of ['lover', 'work']) {
  const o = P.evaluateLegacy(M, ex[i], ex[j], rel), n = P.evaluate(M, ex[i], ex[j], rel);
  md.push(`| ${i + 1}×${j + 1} | ${n.relLabel} | ${o.score} ${o.grade.name} | ${n.score} ${n.grade.name} | ${n.parts.map(p => p.score).join(' · ')} | ${n.directions.ab.score} / ${n.directions.ba.score} |`);
}
md.push('', '## 사례 검증', '', '| 사례 | 사주 수 | 기대 높음 n | 평균 | 기대 낮음 n | 평균 | 결과 |', '|---|---|---|---|---|---|---|', ...caseRows.map(r => `| ${r.join(' | ')} |`), '');
md.push(`오행(①)과 십성(⑤) 방향 점수 상관 r = ${rElTg.toFixed(2)} (0.8 미만이면 중복 가산이 아니라고 봄).`, '');
if (MD) { fs.writeFileSync(path.join(root, 'docs', 'COMPAT_V2_COMPARE_2026-11-16.md'), md.join('\n') + '\n'); console.log('비교표 저장: docs/COMPAT_V2_COMPARE_2026-11-16.md'); }
else console.log(md.slice(3, 16).join('\n'));
caseRows.forEach(r => console.log('  사례', r.join(' | ')));
if (fails.length) { console.log('FAIL', [...new Set(fails)].slice(0, 12)); process.exit(1); } else console.log('OK');
