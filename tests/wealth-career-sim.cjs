// 직업·활동 적성 고도화(나의 돈 버는 방식 · 업무 환경 · 직업 · 약점) 검증
//   node tests/wealth-career-sim.cjs [차트 수=3000]
// A 데이터 무결성(문구 형식·금지 표현·조건 문법·필수 역할) · B 회귀 사례 壬申·丙午·庚午·丁丑 · C 구조 5단계 상태가 모두 실제로 나오는지
// D 같은 십성 구성이어도 월령·통근이 다르면 판정이 달라지는지 · E 조후≠억부 · F 불변식(원국 불변·운 미사용·AI 호출 없음·근거 없는 확정 금지·섹션 간 모순 없음)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
const M = globalThis.Manse;
// AI·네트워크 호출이 있으면 실패하도록 막아 둔다
let netCalls = 0; globalThis.fetch = () => { netCalls++; throw new Error('network call'); };
for (const f of ['wealth-career-data.js', 'wealth-career-data-2.js', 'wealth-career-data-3.js', 'wealth-career-jobs.js', 'wealth-career.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const W = globalThis.MantraWealthCareer, D = globalThis.MantraWealthCareerData;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const compute = (y, mo, d, h, g = 'M', min = 0) => M.compute({ year: y, month: mo, day: d, hour: h, minute: min, gender: g, calendar: 'solar', school: 'eokbu' });

// ───────── A. 데이터 무결성 ─────────
const ids = new Set(); let badText = 0;
for (const p of D.PH) {
  ok(!ids.has(p.id), '문구 ID 중복: ' + p.id); ids.add(p.id);
  const e = W.validateText(p.text, p.role); if (e) { badText++; fails.push(`문구 형식 [${p.id}] ${e}`); }
  [...p.when, ...p.unless].forEach(c => { const x = W.validateCond(c); if (x) fails.push(`조건 [${p.id}] ${x}`); });
  ok(p.sec && p.cx && p.role && p.tag && typeof p.pri === 'number' && p.v >= 1 && typeof p.on === 'boolean', '메타데이터 누락: ' + p.id);
}
console.log(`A. 사전 문구 ${D.PH.length}개 · 직업 ${D.JOBS.length}개 · 형식 위반 ${badText}건`);
for (const t of D.TYPES) for (const r of ['head', 'reason', 'scene', 'strength', 'risk', 'action', 'skill', 'method', 'sec']) ok(D.PH.some(p => p.sec === 'S1' && p.cx === t.id && p.role === r), `S1 ${t.id} 역할 ${r} 문구 없음`);
for (const ax of D.AXES) for (const v of Object.keys(ax.verdicts)) for (const r of ['strength', 'burden', 'example']) ok(D.PH.some(p => p.sec === 'S2' && p.cx === `${ax.id}.${v}` && p.role === r), `S2 ${ax.id}.${v} ${r} 문구 없음`);
for (const w of D.WEAKNESSES) for (const r of ['title', 'why', 'scene', 'impact', 'fix']) ok(D.PH.some(p => p.sec === 'S4' && p.cx === w.id && p.role === r && p.when.length === 0 || p.sec === 'S4' && p.cx === w.id && p.role === r && r !== 'why'), `S4 ${w.id} ${r} 문구 없음`);
for (const w of D.WEAKNESSES) ok(D.PH.some(p => p.sec === 'S4' && p.cx === w.id && p.role === 'why' && p.when.length === 0), `S4 ${w.id} 조건 없는 기본 why 문구 없음`);
for (const s of D.STRUCTS) for (const st of ['full', 'part', 'rel']) ok(D.PH.some(p => p.sec === 'SP' && p.cx === s.id && p.role === st), `구조 설명 ${s.id}/${st} 없음`);
const CATS = Object.keys(M.CAREER_CONFIG.categories), ENVS = M.CAREER_ENV_KEYS, TYPE_IDS = D.TYPES.map(t => t.id);
const jid = new Set();
for (const j of D.JOBS) {
  ok(!jid.has(j.id), '직업 ID 중복 ' + j.id); jid.add(j.id);
  ok(Object.keys(j.cats).every(k => CATS.includes(k)), j.id + ' 활동 분야 키 오류'); ok(Object.keys(j.types).every(k => TYPE_IDS.includes(k)), j.id + ' 유형 키 오류');
  ok((j.exposes || []).every(k => ENVS.includes(k)), j.id + ' 환경 키 오류'); ok(['license', 'experience', 'open'].includes(j.barrier), j.id + ' 진입 조건 오류');
  ok(Object.keys(j.els).length >= 2, j.id + ': 오행 하나로 고정된 직업(복수 오행 필요)');
  for (const k of ['how', 'income', 'caution']) { const e = W.validateText(j[k], 'note'); if (e) fails.push(`직업 ${j.id}.${k}: ${e}`); }
  for (const [ax, v] of Object.entries(j.env || {})) ok(D.AXES.find(a => a.id === ax) && D.AXES.find(a => a.id === ax).verdicts[v], `${j.id} 환경 선호 오류 ${ax}=${v}`);
}
ok(D.JOBS.length >= 30, '직업 DB가 30개 미만');

// ───────── B. 회귀 사례: 壬申년 丙午월 庚午일 丁丑시 (1992-06-23 02시) ─────────
const reg = compute(1992, 6, 23, 2);
const p = reg.pillars, nm = x => M.STEM[x.s] + '子丑寅卯辰巳午未申酉戌亥'[x.b];
const BR = '子丑寅卯辰巳午未申酉戌亥';
ok(M.STEM[p.year.s] + BR[p.year.b] === '壬申' && M.STEM[p.month.s] + BR[p.month.b] === '丙午' && M.STEM[p.day.s] + BR[p.day.b] === '庚午' && M.STEM[p.hour.s] + BR[p.hour.b] === '丁丑', '회귀 사례의 사주가 壬申 丙午 庚午 丁丑이 아님');
const snap = JSON.stringify(reg);
const R = W.build(M, reg, {});
ok(JSON.stringify(reg) === snap, '직업 분석이 원국(chart) 객체를 바꿈');
const S = id => R.structures.find(s => s.id === id);
console.log('\nB. 회귀 사례 壬申 丙午 庚午 丁丑');
console.log('   신강약', R.zone.label, `(돕는 힘 ${R.zone.help}%)`, '| 억부', R.yong[0].el + '(' + R.yong[0].group + ')', '| 조후', R.yong[1].el + '(' + R.yong[1].group + ')');
R.structures.forEach(s => console.log('   ' + s.name.padEnd(8, ' ') + ' ' + s.label.padEnd(8, ' ') + (s.miss.length ? ' ← ' + s.miss.join(' / ') : '')));
ok(R.zone.key === 'weak' && R.zone.help < 42, '신약 판정이 아님');
ok(R.facts['yong.johu'] === 'sik' && R.yong[1].el === '수', '여름 경금의 조후 용신이 水(식상)가 아님');
ok(R.facts['yong.differ'] === 'yes', '억부·조후 용신이 다르다고 표시되지 않음');
ok(R.notes.some(n => /억부 용신.*조후 용신/.test(n.text)), '억부·조후 분리 안내 문구가 없음');
const pw = Object.fromEntries(R.power.map(x => [x.tg, x]));
ok(pw['식신'].touched && pw['편관'].touched && pw['정관'].touched, '壬 식신·丙 편관·丁 정관의 투출이 확인되지 않음');
ok(!pw['편재'].touched && pw['편재'].label === '없음' && pw['정재'].label === '없음', '재성(木 계열)이 원국에 없다는 사실이 반영되지 않음');
ok(pw['정인'].label !== '없음' && !pw['정인'].touched, '지장간 인성(己)이 미투출 상태로 확인되지 않음');
ok(S('gwansal_honjap').state === 'full', '丙 편관 + 丁 정관이 천간에 함께 드러난 관살혼잡이 성립으로 판정되지 않음');
ok(S('sikshin_jae').state !== 'full' && S('sikshin_jae').state !== 'part', '재성이 없는데 식신생재가 성립/부분 성립으로 잘못 판정됨');
ok(['rel'].includes(S('sikshin_jae').state), '식신은 있고 재성이 없으면 “관련 요소 존재”여야 함');
ok(S('salin').state !== 'full', '살인상생이 무조건 성립으로 처리됨(인성이 지장간에만 있고 양이 부족)');
ok(S('gwanin').state !== 'full', '관인상생이 무조건 성립으로 처리됨(편관 혼잡)');
ok(S('sikshin_sal').state !== 'full', '식신제살이 무조건 성립으로 처리됨(식신의 양 부족·壬丁합)');
ok(S('sikshin_sal').miss.some(x => /합/.test(x)) || S('sikshin_sal').miss.some(x => /적음/.test(x)), '식신제살 미완성 사유가 근거로 남지 않음');
ok(R.s1.status === 'ok' && R.s1.primary && R.s1.rows.find(r => r.id === R.s1.primary.id).gate, '대표 유형이 근거(관문) 없이 정해짐');
ok(R.s1.rows.every(r => r.id !== 'biz' || !r.qualified), '재성이 없는 원국에서 사업·유통형이 대표/보조로 확정됨');
ok(!R.issues.length, '섹션 간 일관성 위반: ' + R.issues.join(' / '));
ok(R.s3.jobs.length >= 5 && R.s3.jobs.length <= 8, '추천 직업 수가 5~8개가 아님');
ok(R.s4.items.length >= 2 && R.s4.items.length <= 3, '취약점이 2~3개가 아님');
ok(R.s4.items.some(i => i.id === 'pressure'), '관살혼잡 성립인데 책임·지시 겹침 취약점이 선택되지 않음');
ok(R.s4.items.some(i => i.id === 'pricing') && R.s4.nowealth.length === 1, '재성 부재 사주: 가격 책정 취약점과 ‘가난 아님’ 안내가 함께 나와야 함');
console.log('   대표', R.s1.primary.name, `(근거 수준 ${R.s1.conf}${R.s1.tie ? ' · 보조 유형과 근접' : ''})`, '| 보조', R.s1.secondary.map(x => x.name).join(', ') || '-');
console.log('   유형 점수', R.s1.rows.map(r => `${r.name}${r.score}${r.qualified ? '' : r.gate ? '△' : '✕'}`).join(' · '));
console.log('   업무 환경', R.s2.axes.map(a => a.label + (a.lean === 'flat' ? '' : '(' + (a.lean === 'strong' ? '뚜렷' : '약간') + ')')).join(' / '));
console.log('   직업', R.s3.jobs.map(j => j.name).join(', '));
console.log('   약점', R.s4.items.map(i => i.id).join(', '));
// 이 사주에 특정 유형이 하드코딩되지 않았는지: 코드에 사주 문자열이 없다
const srcAll = ['wealth-career.js', 'wealth-career-data.js', 'wealth-career-data-2.js', 'wealth-career-data-3.js', 'wealth-career-jobs.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
ok(!/壬申|丙午|庚午|丁丑|1992/.test(srcAll), '회귀 사례를 코드에 하드코딩한 흔적이 있음');

// ───────── 무작위 차트 ─────────
const N = +process.argv[2] || 3000;
let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const charts = [];
while (charts.length < N) { try { charts.push(compute(1900 + Math.floor(rnd() * 140), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24), rnd() < .5 ? 'M' : 'F')); } catch (e) { } }
const RS = charts.map(c => W.build(M, c, {}));

// ───────── C. 구조 상태 분포 ─────────
console.log(`\nC. 구조별 상태 분포 (무작위 ${N}명)`);
const states = ['full', 'part', 'rel', 'none', 'hold'], dist = {};
for (const s of D.STRUCTS) { dist[s.id] = {}; states.forEach(x => dist[s.id][x] = 0); }
RS.forEach(r => r.structures.forEach(s => { dist[s.id][s.state]++; ok(states.includes(s.state), '알 수 없는 상태 ' + s.state); }));
for (const s of D.STRUCTS) {
  const d = dist[s.id];
  console.log('  ', s.name.padEnd(8, ' '), states.map(x => `${D.STATE_LABEL[x]} ${(d[x] / N * 100).toFixed(1)}%`).join(' · '));
  if (s.id !== 'jaeda_sinyak') { ok(d.full > 0, `${s.name}: 성립 사례가 전혀 없음`); ok(d.part > 0, `${s.name}: 부분 성립 사례가 전혀 없음`); }
  ok(d.none > 0, `${s.name}: 불성립 사례가 전혀 없음`);
  ok(d.full / N < 0.45, `${s.name}가 ${(d.full / N * 100).toFixed(0)}%에서 성립(너무 쉽게 성립 처리)`);
}
// 존재만으로 성립하지 않는다: 성립이면 반드시 양쪽 요소가 쓸 만한 힘
RS.forEach(r => {
  const lv = Object.fromEntries(r.power.map(x => [x.tg, ['없음', '약함', '보통', '강함'].indexOf(x.label)]));
  const st = id => r.structures.find(s => s.id === id).state;
  if (st('sikshin_jae') === 'full') ok(lv['식신'] >= 2 && Math.max(lv['편재'], lv['정재']) >= 2, '식신생재 성립인데 한쪽이 약함');
  if (st('sanggwan_jae') === 'full') ok(lv['상관'] >= 2 && Math.max(lv['편재'], lv['정재']) >= 2, '상관생재 성립인데 한쪽이 약함');
  if (st('sikshin_sal') === 'full') ok(lv['식신'] >= 2 && lv['편관'] >= 1, '식신제살 성립인데 식신이 약함');
  if (st('salin') === 'full') ok(lv['편관'] >= 2 && Math.max(lv['편인'], lv['정인']) >= 2, '살인상생 성립인데 한쪽이 약함');
  if (st('gwanin') === 'full') ok(lv['정관'] >= 2 && Math.max(lv['편인'], lv['정인']) >= 2, '관인상생 성립인데 한쪽이 약함');
  if (st('gwansal_honjap') === 'full') ok(lv['정관'] >= 2 && lv['편관'] >= 2, '관살혼잡 성립인데 한쪽이 약함');
  if (st('sikshin_jae') === 'rel' || st('sikshin_jae') === 'none') ok(!(lv['식신'] >= 2 && Math.max(lv['편재'], lv['정재']) >= 3 && r.power.find(x => x.tg === '식신').touched && st('sikshin_jae') === 'none'), '식신·재성이 모두 충분한데 불성립');
});
// 시주 미상: 없는 요소를 단정하지 않고 판정 보류
{
  const c = M.compute({ year: 1992, month: 6, day: 23, hour: null, minute: null, gender: 'M', calendar: 'solar', school: 'eokbu' });
  if (c.hourKnown === false) { const r = W.build(M, c, {}); ok(r.structures.some(s => s.state === 'hold'), '시주 미상인데 판정 보류가 없음'); ok(r.notes.some(n => /시주/.test(n.text)), '시주 미상 안내 문구 없음'); console.log('   시주 미상 사례: 판정 보류 ' + r.structures.filter(s => s.state === 'hold').length + '개'); }
  else console.log('   (시주 미상 입력 옵션이 없어 이 항목은 건너뜀)');
}

// ───────── D. 같은 십성 구성, 다른 월령·통근 ─────────
{
  const key = c => { const d = c.pillars.day.s; return ['year', 'month', 'hour'].map(k => M.tenGod(d, c.pillars[k].s)).sort().join(','); };
  const groups = {}; charts.forEach((c, i) => { (groups[key(c)] = groups[key(c)] || []).push(i); });
  let diffGroups = 0, examples = [];
  for (const [k, idx] of Object.entries(groups)) {
    const vecs = new Set(idx.map(i => RS[i].structures.map(s => s.state).join(',')));
    if (idx.length >= 8 && vecs.size >= 3) { diffGroups++; if (examples.length < 2) examples.push(k + ` (${idx.length}명 → 서로 다른 판정 ${vecs.size}가지)`); }
  }
  console.log(`\nD. 천간 십성 구성이 같아도 월령·통근이 다르면 판정이 달라지는 구성: ${diffGroups}개  예) ${examples.join(' ; ')}`);
  ok(diffGroups >= 5, '천간 십성 구성이 같으면 판정도 같음(월령·통근이 반영되지 않음)');
}

// ───────── E. 조후 ≠ 억부 ─────────
{
  const diff = RS.filter(r => r.facts['yong.differ'] === 'yes'), conf = RS.filter(r => r.facts['yong.conflict'] === 'yes'), same = RS.filter(r => r.facts['yong.differ'] === 'no');
  console.log(`\nE. 억부≠조후 ${(diff.length / N * 100).toFixed(1)}% (조후 용신이 억부상 기신·구신 ${(conf.length / N * 100).toFixed(1)}%) · 일치 ${(same.length / N * 100).toFixed(1)}%`);
  ok(diff.length > 0 && same.length > 0, '억부≠조후 / 일치 사례가 모두 있어야 함');
  ok(diff.every(r => r.notes.some(n => /억부 용신.*조후 용신/.test(n.text))), '억부≠조후인데 분리 안내가 없음');
  ok(diff.every(r => r.yong[0].el !== r.yong[1].el), '억부≠조후로 표시했지만 같은 오행');
}

// ───────── F. 불변식 ─────────
console.log('\nF. 불변식');
const cnt = { prod: 0, biz: 0, tech: 0, org: 0, edu: 0, net: 0, none: 0 }, wk = {};
let idemBad = 0, emptyJobs = 0, badBan = 0, secOverlap = 0, noGate = 0, tieN = 0;
RS.forEach((r, i) => {
  const pr = r.s1.primary; cnt[pr ? pr.id : 'none']++;
  if (pr) { if (!r.s1.rows.find(x => x.id === pr.id).gate) noGate++; if (r.s1.secondary.some(s => s.id === pr.id)) secOverlap++; ok(pr.reason.length >= 1 && pr.head.length === 1 && pr.action.length === 1, '대표 유형 문구가 비어 있음'); ok(r.s1.secondary.length <= 2, '보조 유형이 3개 이상'); }
  else ok(r.s1.candidates.length >= 1 && r.s1.insufficient.length === 1, '근거 부족인데 후보·안내가 없음');
  if (r.s1.tie) tieN++;
  if (r.s3.jobs.length < 5 || r.s3.jobs.length > 8) emptyJobs++;
  r.s4.items.forEach(it => wk[it.id] = (wk[it.id] || 0) + 1);
  if (r.s4.items.length < 2 || r.s4.items.length > 3) idemBad++;
  r.s2.axes.forEach(a => { ok(['strength', 'burden', 'example'].every(k => a[k].length === 1), `${a.id}.${a.verdict}: 강점/부담/사례 문구 누락`); ok(!/\d+\s*\/\s*\d+/.test(a.leanLabel + a.label), '업무 환경에 점수 숫자가 노출됨'); });
  const texts = [...(pr ? ['head', 'reason', 'scene', 'strength', 'risk', 'action'].flatMap(k => pr[k].map(x => x.text)) : []), ...r.s2.axes.flatMap(a => [a.strength, a.burden, a.example].flatMap(x => x.map(y => y.text))), ...r.s4.items.flatMap(it => [it.why, it.scene, it.impact, it.fix].flatMap(x => x.map(y => y.text)))];
  texts.forEach(t => { if (W.BAN.test(t)) badBan++; });
  // 같은 문장이 한 결과 안에서 두 번 나오지 않는다
  const sents = texts.flatMap(t => t.split(/(?<=[.!?])\s*/)).map(s => s.replace(/\s/g, '')).filter(s => s.length > 12); ok(new Set(sents).size === sents.length, '한 결과 안에서 같은 문장이 반복됨');
  ok(!r.issues.length, '섹션 간 일관성 위반: ' + r.issues.join(' / '));
});
console.log('   대표 유형 분포', Object.entries(cnt).map(([k, v]) => `${k} ${(v / N * 100).toFixed(1)}%`).join(' · '));
console.log('   취약점 선택 빈도', Object.entries(wk).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / N * 100).toFixed(0)}%`).join(' · '));
console.log(`   대표·보조 근접 ${(tieN / N * 100).toFixed(1)}% · 근거 부족(유형 미확정) ${(cnt.none / N * 100).toFixed(1)}%`);
ok(noGate === 0, '관문을 통과하지 못한 대표 유형 ' + noGate + '건'); ok(secOverlap === 0, '대표·보조 유형이 겹침'); ok(emptyJobs === 0, '추천 직업 5~8개 위반 ' + emptyJobs + '건'); ok(idemBad === 0, '취약점 2~3개 위반 ' + idemBad + '건'); ok(badBan === 0, '금지 표현 ' + badBan + '건');
for (const k of TYPE_IDS) { ok(cnt[k] / N < 0.5, `${k}가 대표 유형의 ${(cnt[k] / N * 100).toFixed(0)}%(편향)`); ok(cnt[k] / N > 0.02, `${k}가 대표 유형으로 거의 나오지 않음`); }
ok(cnt.none / N < 0.35, '근거 부족이 35% 이상(너무 보수적)'); ok(cnt.none / N > 0, '근거 부족으로 판정되는 사례가 전혀 없음(항상 확정)');
// 직업의 상위 3개는 대표·보조 유형과 연결된다
// 결정성: 같은 입력 → 같은 출력, 이름 치환
const r2 = W.build(M, compute(1992, 6, 23, 2), {}); ok(JSON.stringify(r2.s1.primary) === JSON.stringify(R.s1.primary), '같은 입력인데 결과가 다름');
const rn = W.build(M, compute(1992, 6, 23, 2), { name: '하늘' }); ok(rn.s1.primary.head[0].text.startsWith('하늘님은'), '이름 치환이 되지 않음');
// 운 미사용: 대운·세운·월운·일진 계산 후에도 결과 동일
const c3 = compute(1992, 6, 23, 2); const before = JSON.stringify(W.build(M, c3, {}).s1.primary);
M.seunRange(c3, 2020, 2035).forEach(x => M.evaluateDomainLuck(c3, x, 'seun', { ms: x.midMs })); M.wolun(c3, 2026); M.ilun(c3, 2026, 5);
ok(JSON.stringify(W.build(M, c3, { name: '' }).s1.primary) === before, '운 계산 후 결과가 달라짐(원국만 읽어야 함)');
ok(!/luck|daeun|seun|wolun|ilun|대운|세운/.test(fs.readFileSync(path.join(root, 'wealth-career.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'[^']*'/g, "''")), '엔진 코드가 운 데이터를 참조함');
ok(netCalls === 0, 'AI·네트워크 호출이 발생함 ' + netCalls);
// 기존 원국 계산·기존 직업 적성 결과 불변
ok(typeof M.careerProfile === 'function', '기존 careerProfile 함수가 사라짐');
const cp = JSON.stringify(M.careerProfile(compute(1988, 3, 9, 14, 'F'))); W.build(M, compute(1988, 3, 9, 14, 'F'), {}); ok(JSON.stringify(M.careerProfile(compute(1988, 3, 9, 14, 'F'))) === cp, '신규 분석이 기존 직업 적성 결과를 바꿈');

// 게시 문구 적용/롤백
{
  const c = compute(1992, 6, 23, 2); const base = JSON.stringify(W.build(M, c, {}).s1.primary.head);
  const hid = R.s1.primary.head[0].id;
  W.applyPublished({ phrases: { [hid]: { text: '관리자가 바꾼 문구입니다.' } } });
  ok(W.build(M, c, {}).s1.primary.head[0].text === '관리자가 바꾼 문구입니다.', '게시 문구가 적용되지 않음');
  W.applyPublished({ phrases: { [hid]: { on: false } } }); ok(W.build(M, c, {}).s1.primary.head.length === 0, '비활성 문구가 계속 쓰임');
  W.applyPublished({ types: { tech: { on: false } } }); const off = W.build(M, c, {}); ok(!off.s1.primary || off.s1.primary.id !== 'tech', '비활성화한 수익 유형이 대표로 나옴');
  W.applyPublished({ customJobs: [{ id: 'x1', name: '테스트 직업', types: { org: 1, tech: 1 }, cats: { technical: 1 }, how: '테스트입니다.', income: '테스트입니다.', caution: '테스트입니다.' }] }); ok(W.jobs().some(j => j.id === 'x1'), '관리자가 추가한 직업이 반영되지 않음');
  W.applyPublished(null); ok(JSON.stringify(W.build(M, c, {}).s1.primary.head) === base, '게시본을 비우면 기본 문구로 돌아가야 함');
}

console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + [...new Set(fails)].slice(0, 60).join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
