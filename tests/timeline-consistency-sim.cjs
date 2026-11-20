// 만세력 ↔ 운명의 타임라인 공통 계산 일치 + 암합 예외 적용 검증(2026-11-20):  node tests/timeline-consistency-sim.cjs [사주 수=200]
//  A. 공통 계산: 같은 출생 정보 → 만세력 입력(index.html readForm 기본값)과 타임라인 입력(hub.js toInput)이 같은 엔진 결과,
//     SajuData(타임라인 공통 데이터)가 엔진 값 그대로(오행 세력·강약·통근·합충·용희기구신), 운 기둥 십성 비중은 엔진 groupPull 하나,
//     지장간·월률분야 데이터 하나, 운 겹쳐 보기 계산 모듈 하나
//  B. 암합 예외: 타임라인 장 수·점수 그대로, 관련 렌즈(종합·재물·커리어·인연)에만, 지금 대운·올해 세운(종합은 원국)만,
//     같은 암합은 리포트 안 한 번, 암합이 없으면 본문이 한 글자도 안 바뀜, 전문 용어·단정 표현 없음
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 200;
const LN = ['report/v2/life-narrative-data.js', 'report/v2/life-narrative-data-self.js', 'report/v2/life-narrative-data-self2.js', 'report/v2/life-narrative-data-wealth.js', 'report/v2/life-narrative-data-wealth2.js', 'report/v2/life-narrative-data-love.js', 'report/v2/life-narrative-data-love2.js', 'report/v2/life-narrative-data-career.js', 'report/v2/life-narrative-data-career2.js', 'report/v2/life-narrative-data-self3.js', 'report/v2/life-narrative-data-wealth3.js', 'report/v2/life-narrative-data-extra.js', 'report/v2/life-narrative.js'];
const mk = files => { const c = { console }; c.window = c; vm.createContext(c); files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f })); return c; };
const W = mk(['engine.js', 'amhap.js', 'luck-interpret.js', 'luck-overlay.js', 'report/v2/saju-data.js', ...LN]);   // 타임라인(상세풀이 화면) 구성
const P = mk(['engine.js', 'report/v2/saju-data.js', ...LN]);                                                        // 암합 모듈 없이
const M = W.Manse, A = W.MantraAmhap, L = W.MantraLifeNarrative, L0 = P.MantraLifeNarrative, SD = W.ReportV2.SajuData;
W.MANTRA_FLAGS = { lifeNarrative: true }; P.MANTRA_FLAGS = { lifeNarrative: true };
const NOW = Date.UTC(2026, 10, 20, 3), J = x => JSON.stringify(x);
const JARGON = /신약|신강|관성|재성|인성|식상|비겁|정관|편관|정재|편재|식신|상관(?!없)|비견|겁재|편인|정인|용신|기신|희신|격국|조후|억부|통근|일간|일지|월지|십성|오행|합충|지장간/;
const BAN = /불륜|외도|바람(을|이)? ?피|유부|반드시|무조건|틀림없이|이직(한다|합니다|해요)|퇴사(한다|합니다)|해고|undefined|NaN/;
const ELK = ['목', '화', '토', '금', '수'];

// A-0) 데이터 하나: 엔진 지장간·월률분야를 두 화면이 같은 객체로 쓴다(복사본 없음)
assert.equal(J(W.Manse.HIDDEN), J(P.Manse.HIDDEN)); assert.equal(J(W.Manse.WOLRYUL), J(P.Manse.WOLRYUL));
const hubSrc = fs.readFileSync(path.join(root, 'report/hub/hub.js'), 'utf8'), idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), v2 = fs.readFileSync(path.join(root, 'report/v2/index.html'), 'utf8'), rIdx = fs.readFileSync(path.join(root, 'report/index.html'), 'utf8');
assert.ok(/'\/engine\.js'/.test(hubSrc) && /src="\/engine\.js"/.test(v2) && /src="\/engine\.js"/.test(rIdx) && /src="engine\.js"/.test(idx), '세 화면 모두 같은 /engine.js');
assert.ok(/'\/luck-overlay\.js'/.test(fs.readFileSync(path.join(root, 'report/hub/hub-timeline.js'), 'utf8')) && /src="luck-overlay\.js"/.test(idx), '겹쳐 보기 모듈 하나');
for (const f of ['report/v2/life-narrative.js', 'luck-interpret.js']) assert.ok(/M\.groupPull/.test(fs.readFileSync(path.join(root, f), 'utf8')), f + ' 는 엔진 groupPull 참조');

let n = 0, notes = { life: 0, wealth: 0, career: 0, love: 0 }, unchanged = 0, appended = 0;
for (let i = 0; i < N; i++) {
  const birth = { year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' };
  // A-1) 만세력 입력(index.html 기본값)과 타임라인 입력(hub.js toInput 기본값)
  const manseInp = { ...birth, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto', combinationMode: 'auto', climatePalaceMode: 'auto' };
  const s = { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: 0, calendar: 'solar', gender: birth.gender };
  const toInput = new Function('P', 'return ' + hubSrc.match(/toInput: (function \(s\) \{[\s\S]*?\}; \}),/)[1])({ get: () => s });
  const tInp = toInput(s);
  const a = M.compute(manseInp), b = M.compute(tInp);
  const core = c => J({ p: c.pillars, cells: c.cells, rel: c.relations, w: c.weights.pct, sea: c.weights.seasonal && { cmd: c.weights.seasonal.command, st: c.weights.seasonal.states, ap: c.weights.seasonal.appearance, fin: c.weights.seasonal.finalPct }, tg: c.weights.tgPct, st: c.strength, u: c.unified.roles, yong: c.yong.yong, d: c.daeun.list.map(x => [x.s, x.b, x.ev.fitScore]), se: M.seunRange(c, 2026, 2030).map(x => [x.s, x.b, x.ev.fitScore]), wo: M.wolun(c, 2026).map(x => [x.s, x.b, x.ev.fitScore]), il: M.ilun(c, 2026, 11).map(x => [x.s, x.b, x.ev.fitScore]) });
  assert.equal(core(b), core(a), '만세력·타임라인 원국·운 결과 일치 ' + J(birth));
  // A-2) 타임라인 공통 데이터(SajuData)는 엔진 값 그대로
  const sd = SD.build(b, { now: NOW });
  ELK.forEach((e, k) => assert.ok(Math.abs(sd.fiveElements[e] - b.weights.pct[k]) <= 0.051, '오행 세력 = 엔진 최종 세력'));
  assert.equal(sd.strength.zone, b.strength.zone); assert.equal(sd.strength.help, b.strength.help);
  assert.equal(J(sd.combinations.concat(sd.clashes).map(x => x.name).sort()), J(b.relations.map(x => x.name).sort()), '합충 판정 일치');
  if (sd.usefulElements) ELK.forEach((e, k) => assert.equal(sd.usefulElements.roles[e], b.unified.roles[k] || null, '용희기구신 = 통합 용신(학파 자동)'));
  if (sd.roots) assert.equal(sd.roots.score, M.analyzeNatalRoot(b).natalRootScore, '통근 일치');
  // A-3) 운 기둥 십성 비중: 서사·운세 해석 모두 엔진 groupPull
  const dEl = M.stemEl(b.pillars.day.s);
  L.periods(M, b, NOW).forEach(pd => { const x = b.daeun.list.find(d => M.gzName(d) === pd.gz || M.gzNameK(d) === pd.gz); if (!x) return; const g = M.groupPull(dEl, x); let top = 0; g.forEach((v, k) => { if (v > g[top]) top = k; }); assert.equal(pd.group, top, '서사 대운 주 십성 = 엔진 groupPull'); });
  n++;
  // B) 암합 예외
  const ids = Object.keys(L.CHAPTERS), said = new Set(), b0 = P.Manse.compute(tInp);   // 리포트 하나 = 차트 하나(장 사이 중복 방지 상태 공유)
  for (const id of ids) {
    const with_ = L.compose(M, b, NOW, id), without = L0.compose(P.Manse, b0, NOW, id);
    assert.equal(!!with_, !!without, '장 구성 그대로 ' + id);
    if (!with_) continue;
    assert.equal(with_.rule, without.rule, '고른 규칙 그대로');
    const tw = J(with_.rows.map(x => x.text)), t0 = J(without.rows.map(x => x.text));
    if (tw === t0) { unchanged++; continue; }
    // 달라졌다면 운 단계 문단 끝에 암합 한 문장만 붙은 것이어야 함
    appended++;
    const rw = with_.rows.map(x => x.text), r0 = without.rows.map(x => x.text);
    assert.equal(rw.length, r0.length, '문단 수 그대로');
    rw.forEach((t, k) => { if (t === r0[k]) return; if (process.env.DBG && !t.startsWith(r0[k] + '\n\n')) { console.log('ID', id, k, '\nWITH:', t.slice(0, 700), '\nWITHOUT:', r0[k].slice(0, 700)); process.exit(0); } assert.ok(t.startsWith(r0[k] + '\n\n'), '기존 문단 뒤에만 덧붙임'); const add = t.slice(r0[k].length + 2);
      assert.ok(/숨은 합\(암합\)/.test(add) && !add.includes('\n\n'), '덧붙인 것은 암합 한 문장'); assert.ok(!JARGON.test(add) && !BAN.test(add), '용어·단정 표현: ' + add);
      assert.ok(!said.has(add), '같은 암합 문장 리포트 안 반복'); said.add(add);
      const lens = L.CHAPTERS[id]; notes[lens]++;
      assert.ok(['life', 'wealth', 'career', 'love'].includes(lens), '관련 렌즈에만');
      if (lens === 'life') assert.ok(!/대운|올해/.test(add), '종합은 원국 암합만'); else assert.ok(/지금 대운에 들어온 글자|올해 들어온 글자/.test(add), '재물·커리어·인연은 지금 대운·올해 세운만'); });
  }
  // B-2) 암합은 점수·희기·오행 세력을 바꾸지 않음(분석 전후 엔진 결과 같음)
  const before = core(b); for (const l of ['life', 'wealth', 'career', 'love', 'health']) A.timelineNote(M, b, { lens: l, now: NOW, said: new Set() }); assert.equal(core(b), before, '암합 분석 뒤 엔진 결과 그대로');
}
// B-3) 렌즈·시간 범위 직접 검사
const chx = M.compute({ year: 1990, month: 6, day: 20, hour: 22, minute: 0, gender: 'M', calendar: 'solar' });
assert.equal(A.timelineNote(M, chx, { lens: 'health', now: NOW }), null, '건강 렌즈 없음'); assert.equal(A.timelineNote(M, chx, { lens: 'accident', now: NOW }), null, '사고 렌즈 없음');
for (let i = 0; i < 300; i++) { const c = M.compute({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }), sd2 = new Set();
  for (const l of ['life', 'wealth', 'career', 'love']) { const r = A.timelineNote(M, c, { lens: l, now: NOW, said: sd2 }); if (!r) continue;
    assert.ok(l === 'life' ? r.record.source === 'natal' : ['daeun', 'seun'].includes(r.record.source), '시간 범위(월운·일진 섞이지 않음)');
    assert.equal(A.timelineNote(M, c, { lens: l, now: NOW, said: sd2 }), null, '같은 암합 두 번 말하지 않음'); } }

console.log(`timeline-consistency-sim PASS · 사주 ${n}명 · 만세력/타임라인 입력·원국·운·SajuData·용희기구신 일치 · groupPull 단일화`);
console.log(`  암합 예외: 본문 그대로인 장 ${unchanged} · 암합 한 문장 덧붙은 장 ${appended} (종합 ${notes.life}·재물 ${notes.wealth}·커리어 ${notes.career}·인연 ${notes.love}) · 건강·사고 0 · 월운·일진 0 · 점수 불변`);
