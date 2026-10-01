// 운의 흐름 구조(주 흐름 + 상태 overlay + 적합 상태) 검증
//   node tests/flow-sim.js [차트 수=400]
// 1. 점수만으로 조합 규칙(A~J) 2. 실제 사주에서 같은 조합이 나오는지 3. 한 달 일진·여러 원국 분포 4. 순환 의존·호환(옛 6분류 문자열) 점검
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
vm.runInThisContext(html.slice(a, html.indexOf('\n', b)));
const M = globalThis.Manse, F = M.FLOW_CONFIG;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const KEYS = F.keys, NAME = F.names;
const label = (flows, vol, def, fit) => {
  const st = M.composeFlowState(flows, vol, def, fit);
  const ev = { flow: { flows, primaryFlow: st.primaryFlow, secondaryFlow: st.secondaryFlow, topOverlay: st.topOverlay, condition: { name: st.condition, fitScore: fit }, overlays: { volatility: { active: st.on.volatility, score: vol, band: '' }, defense: { active: st.on.defense, score: def, band: '' } } } };
  return { st, text: M.flowLabel(ev) };
};
const fl = (o, e, h, c) => ({ opportunity: o, expansion: e, harvest: h, accumulation: c });

console.log('1. 조합 규칙 (점수 → 표시)');
const T = [
  ['A 기회↑ 변동↓ 부담↓ fit↑', fl(82, 47, 65, 31), 10, 10, 42, '기회 · 순풍'],
  ['B 기회↑ 변동↑ 부담↓', fl(82, 47, 65, 31), 74, 10, 42, '기회 + 변동 · 순풍'],
  ['C 기회↑ 변동↑ 부담↑', fl(82, 47, 65, 31), 74, 60, -20, '기회 + 변동 + 방어 · 주의'],
  ['D 수확↑ 변동↑', fl(40, 30, 80, 20), 70, 10, 5, '수확 + 변동 · 보통'],
  ['E 축적↑ 부담↑', fl(20, 30, 25, 75), 10, 62, -40, '축적 + 방어 · 부담'],
  ['G 변동성 최고점', fl(30, 40, 50, 60), 100, 10, 0, '축적 + 변동 · 보통'],
  ['H 부담도 최고점', fl(30, 40, 50, 60), 10, 100, -60, '축적 + 방어 · 부담'],
  ['I fit 낮아도 기회 최고', fl(90, 10, 10, 10), 10, 10, -50, '기회 · 부담'],
  ['J fit 높아도 축적 최고', fl(10, 10, 10, 90), 10, 10, 60, '축적 · 순풍'],
];
for (const [nm, f, v, d, fit, want] of T) { const r = label(f, v, d, fit); console.log(`   ${nm}: ${r.text}`); ok(r.text === want, `${nm}: 기대 "${want}" 실제 "${r.text}"`); }
// F. 비슷한 점수 → 동반 흐름
const f1 = label(fl(78, 20, 75, 10), 0, 0, 0), f2 = label(fl(78, 20, 60, 10), 0, 0, 0), f3 = label(fl(40, 20, 38, 10), 0, 0, 0);
console.log(`   F 기회 78·수확 75 → 주 ${NAME[f1.st.primaryFlow]} · 동반 ${f1.st.secondaryFlow ? NAME[f1.st.secondaryFlow] : '없음'} / 78·60 → ${f2.st.secondaryFlow || '동반 없음'} / 2위가 최소 기준(${F.secondary.min}) 미만 → ${f3.st.secondaryFlow || '동반 없음'}`);
ok(f1.st.primaryFlow === 'opportunity' && f1.st.secondaryFlow === 'harvest', 'F: 동반 흐름이 표시되지 않음');
ok(f2.st.secondaryFlow === null && f3.st.secondaryFlow === null, 'F: 차이가 크거나 2위가 낮은데 동반 흐름이 표시됨');
// 동점은 우선순서(기회>확장>수확>축적)
ok(label(fl(50, 50, 50, 50), 0, 0, 0).st.primaryFlow === 'opportunity', '동점 처리');
// overlay 경계
ok(label(fl(50, 0, 0, 0), F.overlay.volatility - 0.1, 0, 0).st.on.volatility === false && label(fl(50, 0, 0, 0), F.overlay.volatility, 0, 0).st.on.volatility === true, '변동 overlay 경계');
ok(label(fl(50, 0, 0, 0), 0, F.overlay.defense - 0.1, 0).st.on.defense === false && label(fl(50, 0, 0, 0), 0, F.overlay.defense, 0).st.on.defense === true, '방어 overlay 경계');
// 일진 칸 대표 overlay: 둘 다 켜지면 기준을 더 많이 넘긴 쪽
ok(label(fl(50, 0, 0, 0), 60, 90, 0).st.topOverlay === 'defense' && label(fl(50, 0, 0, 0), 95, 45, 0).st.topOverlay === 'volatility' && label(fl(50, 0, 0, 0), 0, 0, 0).st.topOverlay === null, '대표 overlay 선택');

// 실제 사주
const N = +process.argv[2] || 400;
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const mk = () => { for (;;) { try { return M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { } } };
const charts = Array.from({ length: N }, mk);

console.log('\n2. 실제 사주에서의 조합 (대운·세운·월운·일진 공통 엔진)');
const rows = [], LV = ['daeun', 'seun', 'wolun', 'ilun'];
for (const c of charts.slice(0, 120)) for (let y = 1984; y < 2044; y++) for (const lv of LV) rows.push({ lv, ev: M.evaluateLuck(c, M.yearPillarOf(y), lv) });
let bad = 0;
for (const { ev } of rows) {
  const f = ev.flow, mx = Math.max(...KEYS.map(k => f.flows[k]));
  if (f.flows[f.primaryFlow] !== mx) bad++;
  if (!['기회기', '확장기', '수확기', '축적기'].includes(ev.phase) || ev.activityType !== NAME[f.primaryFlow]) bad++;
  if (KEYS.some(k => !(f.flows[k] >= 0 && f.flows[k] <= 100)) || !(ev.defenseLoad >= 0 && ev.defenseLoad <= 100)) bad++;
  if (f.condition.name !== ev.condition || f.condition.fitScore !== ev.fitScore || ev.condition !== M.conditionOf(ev.fitScore)) bad++;   // condition은 fitScore로만
  if (ev.overlays.volatility.active !== (ev.volatilityScore >= F.overlay.volatility) || ev.overlays.defense.active !== (ev.defenseLoad >= F.overlay.defense)) bad++;
  if (f.secondaryFlow === f.primaryFlow) bad++;
  const sm = M.flowSummary(ev); if (!sm || /undefined|NaN|null/.test(sm + M.flowLabel(ev))) bad++;
}
ok(bad === 0, `정합성 위반 ${bad}건`); console.log(`   ${rows.length}건 정합성 위반 ${bad}건`);
const combos = {
  '기회 · 순풍': e => e.phase === '기회기' && !e.overlays.volatility.active && !e.overlays.defense.active && e.condition === '순풍',
  '기회 + 변동': e => e.phase === '기회기' && e.overlays.volatility.active && !e.overlays.defense.active,
  '기회 + 변동 + 방어': e => e.phase === '기회기' && e.overlays.volatility.active && e.overlays.defense.active,
  '수확 + 변동': e => e.phase === '수확기' && e.overlays.volatility.active,
  '축적 + 방어': e => e.phase === '축적기' && e.overlays.defense.active,
  '확장 + 방어 · 주의': e => e.phase === '확장기' && e.overlays.defense.active && e.condition === '주의',
  '동반 흐름 표시': e => e.flow.secondaryFlow,
  '변동 최상위(≥85)에도 주 흐름 존재': e => e.volatilityScore >= 85 && e.flow.primaryFlow,
  '부담도 최상위(≥60)에도 주 흐름 존재': e => e.defenseLoad >= 60 && e.flow.primaryFlow,
  'fit 낮아도(≤−20) 기회 활성도 높음(≥60)': e => e.fitScore <= -20 && e.opportunityActivation >= 60,
  'fit 높아도(≥18) 축적이 주 흐름': e => e.fitScore >= 18 && e.phase === '축적기',
};
for (const [k, fn] of Object.entries(combos)) { const n = rows.filter(r => fn(r.ev)).length; console.log(`   ${k.padEnd(30)} ${n}건`); ok(n > 0, `실제 사주에서 "${k}" 조합이 나오지 않음`); }
// 시간 단위: 같은 엔진, 단위별 배율은 ±10% 이내
for (const lv of Object.keys(M.LEVEL_WEIGHTS)) ok(Object.values(M.LEVEL_WEIGHTS[lv]).every(v => v >= 0.9 && v <= 1.1), `LEVEL_WEIGHTS.${lv} 배율이 ±10% 초과`);
const c0 = charts[0], p0 = M.yearPillarOf(2027);
ok(JSON.stringify(M.evaluateLuckFlow(c0, p0, 'seun')) === JSON.stringify(M.evaluateLuck(c0, p0, 'seun').flow), 'evaluateLuckFlow가 evaluateLuck().flow와 다름');

console.log('\n3. 한 달 일진 분포 (2026-05)');
const month = c => M.ilun(c, 2026, 5);
const show = (nm, cs) => {
  const pc = {}, oc = { v: 0, d: 0, both: 0 }; let days = 0;
  for (const c of cs) for (const x of month(c)) { days++; pc[x.ev.phase] = (pc[x.ev.phase] || 0) + 1; const o = x.ev.overlays; if (o.volatility.active) oc.v++; if (o.defense.active) oc.d++; if (o.volatility.active && o.defense.active) oc.both++; }
  const pct = k => ((pc[k] || 0) / days * 100).toFixed(0).padStart(3) + '%';
  console.log(`   ${nm.padEnd(14)} n=${String(cs.length).padStart(3)} 기회${pct('기회기')} 확장${pct('확장기')} 수확${pct('수확기')} 축적${pct('축적기')} | +변동 ${(oc.v / days * 100).toFixed(0).padStart(2)}% +방어 ${(oc.d / days * 100).toFixed(0).padStart(2)}% 둘다 ${(oc.both / days * 100).toFixed(0).padStart(2)}%`);
  return { pc, days, oc };
};
{ const x = month(charts[0]), cnt = {}; x.forEach(d => cnt[d.ev.phase] = (cnt[d.ev.phase] || 0) + 1); const ov = k => x.filter(d => d.ev.overlays[k].active).length;
  console.log(`   표본 1명 30일 주 흐름 등장 횟수: ${Object.entries(cnt).map(([k, v]) => `${k.replace(/기$/, '')} ${v}일`).join(' · ')} · +변동 ${ov('volatility')}일 · +방어 ${ov('defense')}일`); }
const first = charts.slice(0, 40).map(c => { const pc = {}; month(c).forEach(x => pc[x.ev.phase] = (pc[x.ev.phase] || 0) + 1); return Math.max(...Object.values(pc)) / 31; });
console.log(`   차트 40개 각자의 최다 주 흐름 비율: 평균 ${(first.reduce((s, x) => s + x, 0) / first.length * 100).toFixed(0)}% · 최대 ${(Math.max(...first) * 100).toFixed(0)}%`);
ok(Math.max(...first) <= 0.8, `한 달 중 한 주 흐름이 80% 초과(${(Math.max(...first) * 100).toFixed(0)}%)`);
const all = show('전체', charts.slice(0, 200));
for (const k of ['기회기', '확장기', '수확기', '축적기']) ok((all.pc[k] || 0) / all.days > 0.1 && (all.pc[k] || 0) / all.days < 0.45, `${k} 비중이 비정상(${((all.pc[k] || 0) / all.days * 100).toFixed(0)}%)`);

console.log('\n4. 원국 유형별 월간 분포');
const st = c => c.strength.help, g = c => c.weights.groups;
const TYPES = {
  '극신약': c => st(c) < 25, '신약': c => st(c) >= 30 && st(c) < 42, '중화': c => c.strength.zone === '중화', '신강': c => st(c) >= 58 && st(c) < 70, '극신강': c => st(c) >= 72,
  '식상 과다': c => g(c)[1] >= 32, '재성 과다': c => g(c)[2] >= 32, '관성 과다': c => g(c)[3] >= 32, '인성 과다': c => g(c)[4] >= 32, '비겁 과다': c => g(c)[0] >= 40,
  '조후 편차 큼': c => Math.abs(c.climate.temp) >= 1 || Math.abs(c.climate.hum) >= 1.2,
};
const pool = Array.from({ length: 1500 }, mk);
for (const [nm, f] of Object.entries(TYPES)) {
  const cs = pool.filter(f).slice(0, 60); if (cs.length < 5) { console.log(`   ${nm} 표본 부족(${cs.length})`); continue; }
  const r = show(nm, cs);
  for (const k of ['기회기', '확장기', '수확기', '축적기']) ok((r.pc[k] || 0) / r.days < 0.65, `${nm}: ${k}가 한 달의 65% 초과`);
}
const sameDay = [], ms = pool.slice(0, 200).map(month);
for (let d = 0; d < 31; d++) { const cnt = {}; ms.forEach(m => cnt[m[d].ev.phase] = (cnt[m[d].ev.phase] || 0) + 1); sameDay.push(Math.max(...Object.values(cnt)) / ms.length); }
console.log(`   같은 날짜에 200명 중 가장 흔한 주 흐름의 비율: 평균 ${(sameDay.reduce((s, x) => s + x, 0) / 31 * 100).toFixed(0)}% · 최대 ${(Math.max(...sameDay) * 100).toFixed(0)}%`);
ok(Math.max(...sameDay) < 0.7, '특정 날짜에 대부분의 사람이 같은 주 흐름');

console.log('\n5. 순환 의존·호환');
const src = M.evaluateLuck.toString();
ok(!/evaluateDomainLuck|extractLuckFeatures|accident|사고수/.test(src.replace(/\/\/.*$/gm, '')), 'evaluateLuck가 분야 지수·사고수를 읽음(순환 위험)');
ok(M.migrateLegacyPhase('기회기').primary === 'opportunity' && M.migrateLegacyPhase('변동기').overlay === 'volatility' && M.migrateLegacyPhase('방어기').overlay === 'defense' && M.migrateLegacyPhase('방어일').overlay === 'defense' && M.migrateLegacyPhase('없음') === null, '옛 6분류 문자열 변환');
const gl = html.split('\n').filter(l => /^  '[^']+': \['운의 흐름'/.test(l)).join('\n');
ok(gl.includes('기회 + 변동 · 순풍') && gl.includes('무엇이 활성화되는가') && gl.includes('나에게 얼마나 잘 맞는가'), '용어 사전: 4+2+1 구조 설명 누락');
ok(html.includes('운은 어떻게 작동하나요?') && html.includes('비가 온다고 반드시 사고가 나는 것이 아니듯'), '자동차 비유 카드 문구 누락');

console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + fails.join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
