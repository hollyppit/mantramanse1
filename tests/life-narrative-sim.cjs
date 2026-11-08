// 운명의 타임라인 서사 엔진(report/v2/life-narrative.js) 검증:  node tests/life-narrative-sim.cjs [차트 수=1500]
//  규칙 형식(복합 조건·근거·5단계) · 본문 금지어·용어 · 장 사이 문장 중복 0 · 인생 모양 분포(한 모양 과반 금지) · 실제 대운 시작 나이
//  · 지나온 시기/앞으로 문형 분리 · 어린 시절 대운에 어른 사건 금지 · 같은 입력 같은 결과 · 스위치 꺼지면 null · 장별 적용률
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'report/v2/life-narrative-data.js', 'report/v2/life-narrative-data-self.js', 'report/v2/life-narrative-data-self2.js', 'report/v2/life-narrative.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, L = ctx.MantraLifeNarrative, D = ctx.MantraLifeNarrativeData;
const N = +process.argv[2] || 1500, NOW = Date.UTC(2026, 10, 8, 3), YEAR = 365.2422 * 86400000;
const fails = [], ok = (c, m) => { if (!c) { if (fails.length < 40) fails.push(m); else fails.length++; } };
const BAN = /반드시|무조건|100%|보장|틀림없이|대박|성공할 거예요|다 잘될|걱정하지 마세요|운명이 정해|확실히 (?:성공|부자)/;
const JARGON = /신약|신강|관성|재성|인성|식상|비겁|정관|편관|정재|편재|식신|상관(?!없)|비견|겁재|(?<!당신 |내 )편인|정인|용신|기신|희신|격국|조후|억부|통근|일간|일지|월지|십성|오행|합충/;
const BAD_JOSA = /세\([^)]*\)이 |년\([^)]*\)가 /;   // 괄호 앞 낱말의 받침과 조사가 어긋나는 경우
const norm = t => String(t).replace(/[\s.,!?·—'"‘’“”()]/g, '');
const sent = t => String(t).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
// ① 규칙 형식
const TAG = /^(str:(weak|mid|strong|veryweak|verystrong)|root:(none|weak|firm)|g:(bi|sik|jae|gwan|in):(heavy|some|light|none)|dom:(bi|sik|jae|gwan|in)|pat:.+|gk:(bi|sik|jae|gwan|in|seong|part|pa)|u:[a-z:]+|yong:[a-z]+|cl:(hot|cold|wet|dry|even)|rel:(dm-clash|day-clash|hyeong|wonjin|day-hap|stem-hap)|dj:(bi|sik|jae|gwan|in)|spouse:(heavy|none|mix)|tg:(pyeonjae|jeongjae):high|sex:[MF])$/;
const ids = new Set();
for (const r of D.RULES) {
  ok(!ids.has(r.id), '규칙 id 중복 ' + r.id); ids.add(r.id);
  ok(r.all.length + r.any.length >= 2, '복합 조건 아님 ' + r.id);
  [...r.all, ...r.none, ...r.any.flat()].forEach(t => ok(TAG.test(t), '알 수 없는 태그 ' + t + ' @' + r.id));
  ok(r.basis && r.basis.length >= 40, '근거 없음 ' + r.id); ok(['strong', 'moderate'].includes(r.conf), '확신도 ' + r.id);
  for (const k of ['hook', 'core', 'life', 'conflict', 'advice']) { ok(r[k] && r[k].length >= (k === 'hook' ? 15 : 25), `${r.id} ${k} 비었음`); ok(!BAN.test(r[k]), `${r.id} ${k} 금지어 ${(r[k].match(BAN) || [])[0]}`); ok(!JARGON.test(r[k]), `${r.id} ${k} 본문에 용어 ${(r[k].match(JARGON) || [])[0]}`); }
  ok(/[?？]$/.test(r.hook), '후킹은 질문으로 끝남 ' + r.id);
  ok(L.CHAPTERS[r.chapter], '시범 장이 아님 ' + r.chapter);
}
const lensTexts = [];
for (const lens of Object.keys(D.ENV)) { lensTexts.push(...D.ENV[lens], ...D.CONT[lens]); for (const t of ['good', 'mixed', 'hard']) lensTexts.push(...D.OUT[lens][t].past, ...D.OUT[lens][t].future); }
lensTexts.push(...D.YOUTH.env, ...Object.values(D.YOUTH.out).flat(), ...Object.values(D.YOUTH.event), ...Object.values(D.EVENT).flatMap(x => Object.values(x)), ...Object.values(D.ARC).flatMap(a => [a.hook, a.tip]));
lensTexts.forEach(t => { ok(!BAN.test(t), '서사 문안 금지어: ' + t.slice(0, 40)); ok(!JARGON.test(t), '서사 문안 용어: ' + t.slice(0, 40)); });
const FUTURE = new Set(Object.values(D.OUT).flatMap(x => Object.values(x).flatMap(y => y.future)).map(norm));
const PAST = new Set(Object.values(D.OUT).flatMap(x => Object.values(x).flatMap(y => y.past)).map(norm));
// ② 사주별 조합
let seed = 8080; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const cover = {}, arcs = {}, rulesUsed = {}; let n = 0, maxRepeat = 0;
Object.keys(L.CHAPTERS).forEach(id => cover[id] = 0);
for (let i = 0; i < N; i++) {
  const inp = { year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: rnd() < 0.06 ? null : Math.floor(rnd() * 24), minute: 0, gender: rnd() < 0.5 ? 'M' : 'F' };
  let ch; try { ch = M.compute(inp); } catch (e) { continue; } n++;
  const tag = `${inp.year}-${inp.month}-${inp.day} ${inp.hour}시 ${inp.gender}`;
  const seen = new Map(), out = {};
  for (const id of Object.keys(L.CHAPTERS)) {
    const r = L.compose(M, ch, NOW, id); out[id] = r; if (!r) continue; cover[id]++; rulesUsed[r.rule] = (rulesUsed[r.rule] || 0) + 1;
    ok(r.hook && r.rows.length >= 4, `${id} 단계 부족 ${tag}`);
    ok(r.evidence && r.evidence.lines.length >= 2, `${id} 근거 없음 ${tag}`);
    for (const row of r.rows) {
      ok(!BAN.test(row.text), `${id} 금지어 ${tag}`); ok(!/undefined|NaN|null/.test(row.text), `${id} 빈 값 ${tag}: ${row.text.slice(0, 60)}`); ok(!BAD_JOSA.test(row.text), `${id} 조사 ${tag}: ${(row.text.match(BAD_JOSA) || [])[0]}`);
      if (row.stage !== 'luck' || id !== 'timeline_self_20') ok(!JARGON.test(row.text.replace(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥] 대운/g, '')), `${id} 본문 용어 ${tag}: ${(row.text.match(JARGON) || [])[0]}`);
      for (const s of sent(row.text)) { const k = norm(s); if (k.length < 12) continue; if (seen.has(k)) ok(false, `장 사이 문장 중복 ${tag}: ${seen.get(k)} ↔ ${id}: ${s.slice(0, 50)}`); else seen.set(k, id); }
    }
  }
  // 인생 흐름 장: 항상 나오고, 실제 대운 시작 나이·과거/미래 문형 분리·어린 시절
  const life = out.timeline_self_20;
  ok(life, '전체 인생 흐름 장이 비었음 ' + tag);
  if (life) {
    arcs[life.arc] = (arcs[life.arc] || 0) + 1;
    const a0 = (ch.daeun.list[0].startMs - ch.utc) / YEAR;
    ok(life.evidence.lines.some(t => t.includes('만 ' + a0.toFixed(1) + '세')), '첫 대운 실제 나이 표기 불일치 ' + tag);
    const past = life.rows.find(r => r.stage === 'life'), fut = life.rows.find(r => r.stage === 'luck');
    if (past) { sent(past.text).forEach(s => ok(!FUTURE.has(norm(s)), '지나온 시기에 미래 문형 ' + tag)); past.text.split('\n\n').filter(p => /^만 (\d|1[0-5])~/.test(p)).forEach(p => ok(!/결혼|동업|직장|승진|연봉/.test(p), '어린 시절 대운에 어른 사건 ' + tag + ': ' + p.slice(0, 60))); }
    if (fut) sent(fut.text).forEach(s => ok(!PAST.has(norm(s)), '앞으로 시기에 과거 문형 ' + tag));
  }
  // 같은 입력 → 같은 결과(새 상태에서 다시 계산)
  if (i % 50 === 0) { const again = M.compute(inp); const r1 = JSON.stringify(Object.keys(L.CHAPTERS).map(id => { const r = L.compose(M, again, NOW, id); return r && [r.rule, r.rows.map(x => x.text)]; })); const r0 = JSON.stringify(Object.keys(L.CHAPTERS).map(id => out[id] && [out[id].rule, out[id].rows.map(x => x.text)])); ok(r0 === r1, '같은 입력 다른 결과 ' + tag); }
}
// ③ 분포
const arcTotal = Object.values(arcs).reduce((a, b) => a + b, 0);
Object.entries(arcs).forEach(([k, v]) => ok(v / arcTotal <= 0.5, `인생 모양 '${k}'가 과반(${(100 * v / arcTotal).toFixed(0)}%) — 획일 서사`));
ok(Object.keys(arcs).length >= 5, '인생 모양이 5종 미만');
const topRule = Object.entries(rulesUsed).filter(([k]) => !k.startsWith('arc:')).sort((a, b) => b[1] - a[1])[0];
// ④ 스위치
ok(L.forChapter({ id: 'timeline_self_03', readingFeature: { M, ch: M.compute({ year: 1990, month: 1, day: 1, hour: 12, gender: 'M' }), now: NOW } }) === null, '스위치가 꺼져 있는데 서사가 나옴');
// ⑤ 화면(reading-text.js): 스위치 꺼짐 → 기존 문안 그대로, 켜짐 → 서사 5단계 + 근거 펼쳐보기
function render(flag) {
  const c2 = { console }; c2.window = c2; if (flag) c2.MANTRA_FLAGS = { lifeNarrative: true }; vm.createContext(c2);
  for (const f of ['engine.js', 'report/v2/life-narrative-data.js', 'report/v2/life-narrative-data-self.js', 'report/v2/life-narrative-data-self2.js', 'report/v2/life-narrative.js', 'report/v2/reading-text.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c2, { filename: f });
  const ch = c2.Manse.compute({ year: 1992, month: 6, day: 23, hour: 1, minute: 45, gender: 'M' });
  const c = { id: 'timeline_career_07', editorialContractId: 'timeline_career_07', title: '조직생활', readingParagraphs: [{ role: 'title', text: '기존 문안 첫 문장이에요. 조직에서 생기는 일이에요.' }, { role: 'reality', text: '기존 문안 생활 장면이에요.' }] };
  Object.defineProperty(c, 'readingFeature', { value: { M: c2.Manse, ch, now: NOW }, enumerable: false });
  return c2.ReportV2.ReadingText.html(c, 0);
}
const off = render(false), on = render(true);
ok(off.includes('기존 문안 생활 장면') && !off.includes('운이 바꾸는 것'), '스위치 꺼짐인데 화면이 바뀜');
ok(!on.includes('기존 문안 생활 장면') && on.includes('운이 바꾸는 것') && on.includes('명리 근거 펼쳐보기') && on.includes('reading-hook'), '스위치 켜짐인데 서사가 화면에 안 나옴');
// ⑥ 2단계: 규칙 검증·게시본 병합(엔진) — 기본 규칙은 모두 통과, 나쁜 게시본은 버리고 기본 유지, on:false 는 제외
D.RULES.forEach(r => { const iss = L.validateRule(r); ok(!iss.length, '기본 규칙이 검증을 통과하지 못함 ' + r.id + ': ' + iss.join(' / ')); });
const merged = L.mergeRules(D.RULES, [{ id: 's03-gwan-pressure', priority: 150 }, { id: 's03-bi-stubborn', core: '무조건 고집이 세요. 신강이라서 그래요. 일부러 틀린 문장이에요.' }, { id: 'w02-steady-saver', on: false }]);
ok(merged.find(r => r.id === 's03-gwan-pressure').priority === 150, '게시본 우선순위가 반영되지 않음');
ok(merged.find(r => r.id === 's03-bi-stubborn').core === D.RULES.find(r => r.id === 's03-bi-stubborn').core, '검증 실패한 게시본이 반영됨');
const chOff = M.compute({ year: 1980, month: 5, day: 5, hour: 9, gender: 'F' });
for (let i = 0; i < 400; i++) { let c; try { c = M.compute({ year: 1950 + i % 60, month: 1 + i % 12, day: 1 + (i * 7) % 28, hour: (i * 5) % 24, gender: i % 2 ? 'M' : 'F' }); } catch (e) { continue; } const r = L.compose(M, c, NOW, 'timeline_wealth_02', { rules: merged, state: L.newState() }); ok(!r || r.rule !== 'w02-steady-saver', '사용 끈 규칙이 선택됨'); }
ok(L.compose(M, chOff, NOW, 'timeline_self_20', { state: L.newState() }) !== null, '미리보기 상태로 조합 실패');
console.log(`서사 엔진 검증 — 사주 ${n}개`);
console.log('  장별 적용률', Object.entries(cover).map(([k, v]) => k.replace('timeline_', '') + ' ' + (100 * v / n).toFixed(0) + '%').join(' · '));
console.log('  인생 모양', Object.entries(arcs).sort((a, b) => b[1] - a[1]).map(([k, v]) => D.ARC[k].name + ' ' + (100 * v / arcTotal).toFixed(0) + '%').join(' · '));
console.log('  가장 많이 쓰인 규칙', topRule ? topRule[0] + ' ' + (100 * topRule[1] / n).toFixed(0) + '%' : '-', '· 쓰인 규칙 수', Object.keys(rulesUsed).filter(k => !k.startsWith('arc:')).length + '/' + D.RULES.length);
if (fails.length) { console.log(`실패 ${fails.length}건`); fails.slice(0, 40).forEach(f => console.log('  ✗', f)); process.exit(1); }
console.log('통과');
