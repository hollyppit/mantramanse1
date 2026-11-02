// 지역 방위오행 × 개인 사주 해석 검증
//   node tests/region-reading-sim.cjs [차트 수=800]
// A 데이터 무결성 · B 방위각(실제 지리와 대조) · C 월령 旺相休囚死 · D 회귀 사주 해석 · E “부족≠좋음” 등 해석 원칙 · F 억부·조후 충돌 · G 일관성·불변식 · H 관리자 게시 적용
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
const M = globalThis.Manse;
let netCalls = 0; globalThis.fetch = () => { netCalls++; throw new Error('network call'); };
for (const f of ['region-gu-data.js', 'region-data.js', 'region-reading-data.js', 'region-reading.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const RG = globalThis.MantraRegion, RR = globalThis.MantraRegionReading, D = globalThis.MantraRegionReadingData;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const compute = (y, mo, d, h, g = 'M') => M.compute({ year: y, month: mo, day: d, hour: h, minute: 0, gender: g, calendar: 'solar', school: 'eokbu' });
const EL = RR.EL5;

// ───────── A. 데이터 무결성 ─────────
const ids = new Set(); let bad = 0;
for (const p of D.PH) {
  ok(!ids.has(p.id), '문구 ID 중복 ' + p.id); ids.add(p.id);
  const e = RR.validateText(p.text); if (e) { bad++; fails.push(`문구 형식 [${p.id}] ${e}`); }
  [...p.when, ...p.unless].forEach(c => { const x = RR.validateCond(c); if (x) fails.push(`조건 [${p.id}] ${x}`); });
  ok(p.sec === 'R' && p.role && p.tag && typeof p.pri === 'number' && p.v >= 1 && typeof p.on === 'boolean', '메타데이터 누락 ' + p.id);
}
console.log(`A. 사전 문구 ${D.PH.length}개 · 규칙 ${D.RULES.length}개 · 형식 위반 ${bad}건`);
const has = (role, cond) => D.PH.some(p => p.role === role && cond.every(c => p.when.includes(c)));
for (const r of ['yong', 'hee', 'han', 'gu', 'gi']) { ok(has('eok', ['eok=' + r]), '억부 문구 없음 ' + r); ok(has('johu', ['johu.app=yes', 'johu=' + r]), '조후 문구 없음 ' + r); }
for (const s of ['wang', 'sang', 'hyu', 'su', 'sa']) ok(has('month', ['mstate=' + s]), '월령 문구 없음 ' + s);
for (const g of ['bi', 'sik', 'jae', 'gwan', 'in']) ok(has('grp', ['grp=' + g]) && has('grp', ['grp=' + g, 'zone<=weak']) && has('grp', ['grp=' + g, 'zone>=strong']), '십성 문구 변형 부족 ' + g);
for (const t of Object.keys(D.TONE_LABEL)) ok(has('headline', ['tone=' + t]) && has('overall', ['tone=' + t]), '종합 문구 없음 ' + t);
ok(D.RULES.every(r => r.v >= r.min && r.v <= r.max && r.label && r.desc), '규칙 기본값 범위');

// ───────── B. 방위각: 실제 지리와 대조(기준점 대전) ─────────
const exp = { seoul: [335, 355, '북', '수'], busan: [120, 140, '남동', '목'], jeju: [185, 200, '남', '화'], gangneung: [30, 50, '북동', '토'], gwangju: [200, 215, '남', '화'], incheon: [325, 345, '북서', '금'], pohang: [95, 115, '동', '목'] };
console.log('\nB. 방위각(대전 기준)');
for (const [id, [lo, hi, dir, el]] of Object.entries(exp)) {
  const t = RG.tradition(RG.get(id)); console.log('  ', id.padEnd(10), String(t.deg).padStart(6) + '°', t.direction, t.element);
  ok(t.deg >= lo && t.deg <= hi, `${id} 방위각 ${t.deg}°가 ${lo}~${hi}° 밖`); ok(t.direction === dir && t.element === el, `${id} 방위오행 ${t.direction}/${t.element}`);
}
// 구면 방위각과 평면 근사의 차이가 8방위 판정을 바꾸지 않는다(시·군·구 250곳, 기준=시·도 면적 중심은 region-sim 에서 검증)
{ const g = globalThis.MantraRegionGu; let n = 0; g.GU.forEach(x => { const t = RG.tradition(RG.get('gu:' + x[0])); if (t.deg != null) n++; ok(['목', '화', '토', '금', '수'].includes(t.element), '방위오행 값 ' + x[0]); }); ok(n >= 200 && n < 250, '시·군·구 방위각(deg) 노출(중앙 제외) ' + n); }
{ const g = globalThis.MantraRegionGu; g.GU.forEach(x => { const t = RG.tradition(RG.get('gu:' + x[0])); ok((t.direction === '중앙') === (t.deg == null), '중앙에는 방위각이 없고 나머지에는 있어야 함 ' + x[0]); }); }

// ───────── C. 월령 旺相休囚死 ─────────
const reg = compute(1992, 6, 23, 2);   // 午월 = 火 월령
const cx = RR.ctx(M, reg);
ok(cx.seasonEl === 1 && cx.season === '여름', '월령 오행 판정');
const want = { 화: 'wang', 토: 'sang', 목: 'hyu', 수: 'su', 금: 'sa' };
for (const [e, s] of Object.entries(want)) { const a = RR.analyze(M, reg, EL.indexOf(e)); ok(a.mstate === s, `午월에서 ${e}은 ${s} 여야 함(${a.mstate})`); }
{ const c2 = compute(1992, 12, 23, 2); ok(RR.ctx(M, c2).seasonEl === 4, '子월 = 水'); const a = RR.analyze(M, c2, 4); ok(a.mstate === 'wang', '子월의 水는 旺'); }

// ───────── D. 회귀 사주 1992-06-23 02시 (신약·여름 庚金, 억부 土(인성)·조후 水) ─────────
console.log('\nD. 회귀 사주 지역별 해석 (신약 · 午월 · 억부 용신 土 · 조후 용신 水)');
const rd = {}; for (const id of ['seoul', 'busan', 'jeju', 'gangneung', 'gwangju', 'pohang']) { const r = RG.get(id); rd[id] = RR.read(M, reg, RG.tradition(r), { region: r.name }); console.log('  ', r.name.padEnd(3), rd[id].direction.padEnd(3), rd[id].element, rd[id].toneLabel.padEnd(12), '억부', rd[id].evidence.eok, '/ 조후', rd[id].evidence.johu, rd[id].conflictOn ? '/ 충돌(' + rd[id].basis.prio + ')' : ''); }
ok(rd.busan.tone === 'caution' && rd.busan.facts.lackbad === 'yes', '목이 부족해도 억부 기신이면 맞지 않는 편(부족≠좋음)');
ok(rd.busan.relation.some(x => /부족하다는 이유만으로/.test(x.text)), '부족하지만 채울 기운이 아니라는 설명이 없음');
ok(rd.jeju.tone === 'caution', '더운 사주의 남쪽(火)은 맞지 않는 편'); ok(rd.jeju.facts.worsen !== 'none', '火가 한난조습을 악화시킨다고 판정하지 않음');
ok(['mixed', 'mildgood', 'neutral'].includes(rd.seoul.tone) && rd.seoul.conflictOn, '水: 억부 구신·조후 용신 → 충돌로 인식(맞지 않는 편으로 단정하지 않음)');
ok(rd.gangneung.conflictOn && rd.gangneung.conflict.length === 1, '土: 억부 용신·조후 기신 충돌 이유 문구'); ok(rd.gangneung.tone === 'mixed', '土: 두 기준이 비슷하게 급해 “기준이 갈림”');
ok(rd.seoul.facts.improve !== 'none' && rd.seoul.pros.some(x => /누그러뜨리는/.test(x.text)), '水가 더위·건조를 누그러뜨린다는 설명');
ok(rd.seoul.basis.differ === true, '억부·조후 용신이 다름을 표시');
ok(!/{[A-Za-z]+}/.test(JSON.stringify(Object.values(rd).map(x => [x.relation, x.pros, x.cons, x.overall, x.conflict, x.headline]))), '자리표시자 미치환');

// ───────── 무작위 차트 ─────────
const N = +process.argv[2] || 800;
let seed = 4321; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = []; while (charts.length < N) { try { charts.push(compute(1900 + Math.floor(rnd() * 140), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24), rnd() < .5 ? 'M' : 'F')); } catch (e) { } }
const regions = RG.REGIONS.map(r => ({ r, tr: RG.tradition(r) }));
const snap = charts.slice(0, 20).map(c => JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]));
const all = [], byEl = { 목: {}, 화: {}, 토: {}, 금: {}, 수: {} }, cnt = { conflict: 0, total: 0, prio: {}, issues: 0, lackAbsent: 0, lackAbsentGood: 0, lackAbsentGoodNoRole: 0, eokBadGood: 0, bothGood: 0, bothGoodCaution: 0 };
charts.forEach((c, ci) => {
  EL.forEach((e, i) => {
    const a = RR.analyze(M, c, i), t = a.tone; byEl[e][t] = (byEl[e][t] || 0) + 1; cnt.total++;
    if (a.conflict) { cnt.conflict++; cnt.prio[a.prio] = (cnt.prio[a.prio] || 0) + 1; }
    if (a.lack === 'absent') { cnt.lackAbsent++; if (t === 'good' || t === 'mildgood') { cnt.lackAbsentGood++; if (!['yong', 'hee'].includes(a.eokR) && !['yong', 'hee'].includes(a.johuR)) cnt.lackAbsentGoodNoRole++; } }
    if ((a.eokR === 'gi' || a.eokR === 'gu') && a.johuR !== 'yong' && a.johuR !== 'hee' && (t === 'good' || t === 'mildgood')) cnt.eokBadGood++;
    if ((a.eokR === 'yong' || a.eokR === 'hee') && (a.johuR === 'yong' || a.johuR === 'hee')) { cnt.bothGood++; if (t === 'caution' || t === 'mildcaution') cnt.bothGoodCaution++; }
  });
  if (ci < 120) regions.forEach(({ r, tr }) => { const x = RR.read(M, c, tr, { region: r.name }); all.push(x); const is = RR.check(x); if (is.length) { cnt.issues++; fails.push(`일관성 [${r.name}] ${is[0]}`); } });
});
console.log(`\nE. 해석 원칙 (무작위 ${N}명 × 오행 5)`);
console.log('   오행별 종합 분포', Object.entries(byEl).map(([e, d]) => e + ' ' + Object.entries(d).map(([t, n]) => `${D.TONE_LABEL[t].slice(0, 5)}${(n / N * 100).toFixed(0)}%`).join('/')).join('\n                   '));
console.log(`   원국에 해당 오행이 아예 없는 경우 ${cnt.lackAbsent}건 중 “맞는 편” ${cnt.lackAbsentGood}건 — 그중 용신·희신 근거 없이 맞는 편 ${cnt.lackAbsentGoodNoRole}건`);
ok(cnt.eokBadGood === 0, `억부 기신·구신인데 조후 뒷받침 없이 맞는 편으로 판정 ${cnt.eokBadGood}건`);
ok(cnt.lackAbsent > 50 && cnt.lackAbsentGoodNoRole === 0, '없는 오행인데 용신·희신 근거 없이 맞는 편으로 판정 ' + cnt.lackAbsentGoodNoRole + '건');
ok(cnt.bothGoodCaution === 0, `억부·조후 모두 용희신인데 맞지 않는 편 ${cnt.bothGoodCaution}건`);
for (const e of EL) { const d = byEl[e]; ok((d.good || 0) + (d.mildgood || 0) > 0 && (d.caution || 0) + (d.mildcaution || 0) > 0, `${e}가 항상 한쪽 판정(사주에 따라 달라져야 함)`); ok(((d.good || 0) + (d.mildgood || 0)) / N < 0.75, `${e}가 ${(((d.good || 0) + (d.mildgood || 0)) / N * 100).toFixed(0)}%에서 맞는 편(편향)`); }
console.log(`\nF. 억부·조후 충돌 ${(cnt.conflict / cnt.total * 100).toFixed(1)}%  우선순위`, JSON.stringify(cnt.prio));
ok(cnt.conflict > 0 && cnt.prio.johu > 0 && cnt.prio.eokbu > 0 && cnt.prio.both > 0, '충돌 우선순위(조후·억부·갈림)가 모두 나와야 함');
const conf = all.filter(x => x.conflictOn); ok(conf.length > 0 && conf.every(x => x.conflict.length === 1), '충돌인데 이유 문구가 없음');
ok(conf.filter(x => x.basis.prio === 'johu').every(x => /조후를 앞세워/.test(x.conflict[0].text)) && conf.filter(x => x.basis.prio === 'eokbu').every(x => /억부를 앞세워/.test(x.conflict[0].text)), '충돌 이유 문구가 우선순위와 다름');
ok(conf.filter(x => x.basis.prio === 'both').every(x => x.tone === 'mixed' || x.evidence.scores.net >= 1.2 || x.evidence.scores.net <= -1.2), '우선순위 없는 충돌은 갈림으로 표시');
// 모드 선택: 억부 기준 / 조후 기준이 실제로 결과를 바꾼다(회귀 사주 서울=水)
{ const t = RG.tradition(RG.get('seoul')); const e = RR.read(M, reg, t, { mode: 'eokbu' }), j = RR.read(M, reg, t, { mode: 'johu' }); ok(e.tone !== j.tone, '해석 기준(억부/조후)을 바꿔도 결과가 같음'); ok(['good', 'mildgood'].includes(j.tone) && ['neutral', 'mildcaution', 'caution', 'mildgood', 'mixed'].includes(e.tone), '기준별 판정 방향'); console.log(`   서울(水): 억부 기준 ${e.toneLabel} · 조후 기준 ${j.toneLabel} · 자동 ${rd.seoul.toneLabel}`); }

console.log(`\nG. 일관성·불변식 (${all.length}건 해석)`);
const tones = {}; all.forEach(x => tones[x.tone] = (tones[x.tone] || 0) + 1);
console.log('   종합 분포', Object.entries(tones).map(([t, n]) => `${D.TONE_LABEL[t]} ${(n / all.length * 100).toFixed(0)}%`).join(' · '));
ok(cnt.issues === 0, '일관성 위반 ' + cnt.issues + '건');
ok(all.every(x => x.relation.length >= 3 && x.pros.length >= 1 && x.cons.length >= 1 && x.overall.length >= 1 && x.headline), '관계·유리·불리·종합 중 빈 항목');
ok(all.every(x => x.caveat.some(c => /상징 해석/.test(c.text))), '방위오행이 상징 해석임을 알리는 문구가 빠짐');
ok(all.filter(x => x.near).every(x => x.caveat.some(c => /경계/.test(c.text))), '방위 경계 안내 누락'); ok(all.filter(x => x.center).every(x => x.direction === '중앙' && x.element === '토'), '중앙 처리');
ok(all.every(x => !RR.BAN.test(JSON.stringify([x.relation, x.pros, x.cons, x.overall, x.conflict]))), '금지 표현');
{ const uniq = new Set(all.map(x => x.relation.map(r => r.id).join(',') + x.tone)); ok(uniq.size > 25, '사주·지역이 달라도 해석 문구 조합이 거의 같음(' + uniq.size + ')'); console.log('   서로 다른 문구 조합', uniq.size, '가지'); }
{ const x1 = RR.read(M, reg, RG.tradition(RG.get('seoul')), { region: '서울' }), x2 = RR.read(M, reg, RG.tradition(RG.get('seoul')), { region: '서울' }); ok(JSON.stringify(x1) === JSON.stringify(x2), '같은 입력 다른 결과'); }
charts.slice(0, 20).forEach((c, i) => ok(JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]) === snap[i], '해석이 원국을 바꿈'));
ok(netCalls === 0, 'AI·네트워크 호출 ' + netCalls);
ok(!/luck|daeun|seun|wolun|ilun|대운|세운/.test(fs.readFileSync(path.join(root, 'region-reading.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'[^']*'/g, "''")), '해석 엔진이 운 데이터를 참조함');
ok(/전통 방위오행은 방위의 상징적 대응일 뿐/.test(RG.NOTE) && typeof RG.fit === 'function' && typeof RG.suggestBasis === 'function', '기존 지역 기능(fit·suggestBasis·NOTE) 유지');

// ───────── H. 관리자 게시 적용 ─────────
{
  const t = RG.tradition(RG.get('busan')), base = RR.read(M, reg, t, { region: '부산' }), hid = base.headline.id;
  RR.applyPublished({ phrases: { [hid]: { text: '관리자가 바꾼 제목입니다.' } } }); ok(RR.read(M, reg, t, { region: '부산' }).headline.text === '관리자가 바꾼 제목입니다.', '게시 문구 적용');
  RR.applyPublished({ phrases: { [hid]: { on: false } } }); ok(!RR.read(M, reg, t, { region: '부산' }).headline || RR.read(M, reg, t, { region: '부산' }).headline.id !== hid, '비활성 문구 사용됨');
  RR.applyPublished({ rules: { toneGood: 2.4 } }); const strict = RR.read(M, reg, t, { region: '부산' }); ok(strict.tone !== 'caution', '규칙 수치(toneGood) 변경이 판정에 반영되지 않음(' + strict.tone + ')');
  RR.applyPublished({ rules: { toneGood: 99 } }); ok(RR.rules().find(r => r.id === 'toneGood').cur === 1.2, '범위 밖 규칙 값이 적용됨');
  RR.applyPublished({ custom: [{ id: 'R.pro.custom1', role: 'pro', text: '관리자가 추가한 유리한 점입니다.', when: ['el=수'], pri: 5 }] }); ok(RR.read(M, reg, RG.tradition(RG.get('seoul')), {}).pros.some(x => x.id === 'R.pro.custom1'), '직접 추가한 문구 사용 안 됨');
  RR.applyPublished(null); const again = RR.read(M, reg, t, { region: '부산' }); delete again.rev; delete base.rev; ok(JSON.stringify(again) === JSON.stringify(base), '게시본을 비우면 기본값으로 복귀해야 함');
}
console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + [...new Set(fails)].slice(0, 50).join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
