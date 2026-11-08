// 통합 용신 판단 엔진(engine.js integrateYongsin) 검증:  node tests/unified-yongsin-sim.cjs [차트 수=4000]
//  ① 엔진 안의 격국·종격 판정이 화면용 모듈(gyeokguk.js·jonggyeok.js)과 같은가
//  ② 역할 배치(다섯 역할이 하나씩, 희신은 용신을 낳거나 용신이 낳는 오행)
//  ③ 판정 규칙(같은 방향·충돌·조후 해당 없음·종격)을 테스트에서 독립적으로 다시 계산해 대조 — 병행이라고 조후를 강제하지 않는가
//  ④ 조건부 역할: 주 기준이 아닌 기준이 '필요'·'급함'으로 원하는 오행은 기신·구신이어도 세기를 줄인다
//  ⑤ 직접 고른 학파는 그대로 쓴다 ⑥ 운 연계(대운→세운→월운→일진) ⑦ 궁합 ⑧ 문장(조사·금지어)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'gyeokguk.js', 'jonggyeok.js', 'compat-pair.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, GK = ctx.MantraGyeokguk, JG = ctx.MantraJonggyeok, P = ctx.PairCompat;
const N = +process.argv[2] || 4000;
const fails = [], ok = (c, m) => { if (!c && fails.length < 40) fails.push(m); else if (!c) fails.length++; };
let seed = 20261108; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const BAN = /반드시|무조건 좋|확실히|틀림없이|100%|보장합니다|예언|절대/;
const BAD_JOSA = /(조후|억부|제화)(을 |이 |은 |으로)|(격국|통관)(를 |가 |는 |로 )|(대운|세운|월운|일진)(와 |가 |는 |를 )/;
const stats = { modes: {}, primary: {}, byeonghaengEokbu: 0, byeonghaengJohu: 0, conditional: 0, n: 0 };
const charts = [];
const tag = inp => `${inp.year}-${inp.month}-${inp.day} ${inp.hour}시 ${inp.gender}`;
const fav = (roles, e) => roles && (roles[e] === '용신' || roles[e] === '희신');
for (let i = 0; i < N; i++) {
  const inp = { year: 1930 + Math.floor(rnd() * 85), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: rnd() < 0.08 ? null : Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60), gender: rnd() < 0.5 ? 'M' : 'F' };
  let ch; try { ch = M.compute(inp); } catch (e) { ok(false, `compute 오류 ${tag(inp)}: ${e.message}`); continue; }
  stats.n++; if (charts.length < 60) charts.push(ch);
  const u = ch.unified, T = u.theories, t = tag(inp);
  stats.modes[u.mode] = (stats.modes[u.mode] || 0) + 1; stats.primary[u.primary] = (stats.primary[u.primary] || 0) + 1;
  // ① 격국·종격 판정 일치
  const gk = GK.analyze(M, ch), gc = M.gyeokCore(ch);
  ok(gk.kind === gc.kind && gk.status === gc.status, `격국 불일치 ${t}: 모듈 ${gk.kind}/${gk.status} 엔진 ${gc.kind}/${gc.status}`);
  const jg = JG.analyze(M, ch), jc = M.jongCore(ch);
  ok(jg.status === jc.status, `종격 불일치 ${t}: 모듈 ${jg.status} 엔진 ${jc.status}`);
  if (jg.follow && jc.kind) ok(jg.follow.kind === jc.kind, `종격 종류 불일치 ${t}`);
  // ② 역할 배치
  const roles = Object.values(u.roles);
  ok(roles.length === 5 && new Set(roles).size === 5, `역할 중복 ${t}: ${JSON.stringify(u.roles)}`);
  ok(u.roles[u.yong] === '용신' && u.roles[u.hee] === '희신' && u.roles[u.gi] === '기신', `역할 필드 불일치 ${t}`);
  if (u.mode !== 'jong') ok(u.hee === (u.yong + 1) % 5 || u.hee === (u.yong + 4) % 5, `희신이 용신과 상생 관계가 아님 ${t}`);
  ok(u.roleV.every(v => v >= -1 && v <= 1), `역할값 범위 ${t}`);
  ok(ch.schoolAuto && ch.yong.unified && ch.yong.yong === u.yong && JSON.stringify(ch.yong.roles) === JSON.stringify(u.roles), `자동인데 ch.yong 이 통합 판단과 다름 ${t}`);
  // ③ 판정 규칙 독립 재계산
  const E = T.eokbu, J = T.johu, Eroles = ch.yongAll.eokbu.roles, Jroles = ch.yongAll.johu.roles;
  const jcStatus = jc.status;
  if (jcStatus === 'jin') { ok(u.mode === 'jong' && JSON.stringify(u.roles) === JSON.stringify(jc.roles), `종격 충족인데 종격 배치를 쓰지 않음 ${t}`); continue; }
  if (!J.applicable) ok(['eokbu', 'gyeok', 'tonggwan'].includes(u.primary), `조후 해당 없음인데 주 기준 ${u.primary} ${t}`);
  else {
    const joRole = Eroles[J.yong];
    if (joRole === '용신' || joRole === '희신') {
      ok(u.mode === 'agree', `같은 방향인데 mode ${u.mode} ${t}`);
      ok(u.primary === (J.urgency >= E.urgency ? 'johu' : 'eokbu'), `같은 방향일 때 더 급한 쪽이 주 기준이 아님 ${t}`);
      // 조후 용신이 억부의 희신일 때 억부가 더 급하면 억부 용신을 쓰고 조후 용신을 희신으로 둔다. 그 밖에는 용신이 두 기준 모두에서 용·희여야 한다
      if (u.primary === 'eokbu' && !fav(Jroles, u.yong)) ok(E.urgency > J.urgency && u.hee === J.yong, `같은 방향: 억부 용신이 기후에 맞지 않는데 조후 용신을 희신으로 두지 않음 ${t}`);
      else ok(fav(Eroles, u.yong) && fav(Jroles, u.yong), `같은 방향인데 용신이 두 기준 중 하나에서 용·희가 아님 ${t}`);
    } else {
      ok(u.mode === 'conflict' || u.mode === 'bridge', `충돌인데 mode ${u.mode} ${t}`);
      const want = E.urgency === 1 ? 'johu' : J.urgency > E.urgency ? 'johu' : E.urgency > J.urgency ? 'eokbu' : null;
      if (want) ok(u.primary === want, `충돌 규칙: 필요도(억부 ${E.urgency}·조후 ${J.urgency})로 ${want} 이어야 하는데 ${u.primary} ${t}`);
      if (u.mode === 'bridge') ok(fav(Eroles, u.yong) && fav(Jroles, u.yong), `겸용 오행이 두 기준 모두에서 용·희가 아님 ${t}`);
      // ④ 보조 기준이 원하는 오행은 기신·구신이어도 조건부로 세기가 줄어든다
      const sec = u.secondary, sy = T[sec].yong;
      if (T[sec].urgency >= 2 && (u.roles[sy] === '기신' || u.roles[sy] === '구신')) { stats.conditional++; ok(u.roleV[sy] > (u.roles[sy] === '기신' ? -1 : -0.5) && u.conditions[sy] && u.conditions[sy].length, `보조 기준 용신이 조건부로 반영되지 않음 ${t}`); }
      ok(u.conflicts.some(c => c.a === 'johu' && c.b === 'eokbu'), `충돌 기록 없음 ${t}`);
    }
  }
  if (ch.schoolAdvice === '병행') { if (u.primary === 'eokbu') stats.byeonghaengEokbu++; else if (u.primary === 'johu') stats.byeonghaengJohu++; }
  // 용신은 어느 한 기준의 용신이거나 두 기준 모두가 원하는 겸용 오행이어야 한다(평균으로 새 오행을 만들지 않는다)
  const yongs = Object.values(T).filter(x => x.applicable).map(x => x.yong);
  ok(yongs.includes(u.yong) || u.mode === 'bridge', `용신이 어느 기준에서도 나오지 않음 ${t}`);
  // ⑧ 문장
  const text = [u.summary, u.headline, ...u.steps, ...u.notes, ...u.glyphNotes, ...u.conflicts.map(c => c.text), ...Object.values(u.conditions).flat(), ...Object.values(T).map(x => x.why)].join('\n');
  ok(!BAN.test(text), `금지어 ${t}: ${(text.match(BAN) || [])[0]}`);
  ok(!BAD_JOSA.test(text), `조사 오류 ${t}: ${(text.match(BAD_JOSA) || [])[0]}`);
  ok(!/undefined|NaN|null/.test(text), `빈 값이 문장에 들어감 ${t}`);
}
// ⑤ 직접 고른 학파
for (const school of ['eokbu', 'johu', 'tonggwan']) {
  let n = 0;
  for (let i = 0; i < 300; i++) {
    const inp = { year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 3) % 28, hour: (i * 5) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', school };
    const ch = M.compute(inp), y = ch.yongAll[school];
    if (!y.applicable) { ok(ch.yongFallback && ch.unified.primary === 'eokbu', `${school} 해당 없음인데 억부로 돌아가지 않음`); continue; }
    n++;
    ok(ch.school === school && !ch.schoolAuto && ch.yong === y, `직접 고른 ${school} 가 ch.yong 에 쓰이지 않음`);
    ok(ch.unified.forced && ch.unified.primary === school && JSON.stringify(ch.unified.roles) === JSON.stringify(y.roles), `직접 고른 ${school} 가 통합 판단의 주 기준이 아님`);
  }
  ok(n > 0, `${school} 직접 선택 표본 없음`);
}
// ⑥ 운 연계
for (const ch of charts.slice(0, 25)) {
  const se = M.seunRange(ch, 2026, 2027), wl = M.wolun(ch, 2026), il = M.ilun(ch, 2026, 11);
  for (const x of [...ch.daeun.list, ...se, ...wl, ...il]) {
    const e = x.ev;
    ok(Number.isFinite(e.fitScore) && e.fitScore >= -100 && e.fitScore <= 100 && Number.isFinite(e.unifiedScore), `흐름 점수 범위 ${x.level || e.level}`);
    ok(Array.isArray(e.theoryImpact) && e.theoryImpact.length >= 1, '이론별 영향 없음');
    ok(e.p && e.p.s === x.s && e.p.b === x.b, '평가 결과에 기둥 정보 없음');
  }
  ok(se.every(x => !x.daeun || (x.ev.chain && x.ev.chain.upName === '대운')), '세운이 대운과 연결되지 않음');
  ok(wl.every(x => x.ev.chain && x.ev.chain.upName === '세운'), '월운이 세운과 연결되지 않음');
  ok(il.every(x => x.ev.chain && x.ev.chain.upName === '월운'), '일진이 월운과 연결되지 않음');
  // 세운(=대운을 품은 값)이 월운에 실제로 섞이는지: 세운 평가를 바꿔 넣으면 월운 점수가 달라져야 한다
  const m0 = M.monthsOfYear(2026)[3], a = M.luckItem(ch, m0, 'wolun', se[0].ev).ev.fitScore, b = M.luckItem(ch, m0, 'wolun', { ...se[0].ev, fitScore: se[0].ev.fitScore + 50 }).ev.fitScore;
  ok(Math.abs(b - a - 50 * M.LUCK_CFG.levels.wolun.parent) < 1e-6 || b === 100, '월운이 세운 점수를 정해진 비율로 이어받지 않음');
  for (const x of il) ok(!x.ev.chain || x.ev.chain.links.every(l => !BAD_JOSA.test(l.text)), '운 연결 문장 조사 오류: ' + (x.ev.chain && x.ev.chain.links.map(l => l.text).join(' / ')));
}
// ⑦ 궁합: 통합 판단으로 계산되고, 상대 일간이 기신이라는 이유 하나로 오행 보완이 바닥이 되지 않는다
let cpN = 0, dayBadButOk = 0;
for (let i = 0; i < charts.length; i++) for (let j = 0; j < charts.length; j += 7) {
  if (i === j) continue;
  const A = charts[i], B = charts[j], r = P.evaluate(M, A, B, 'lover'), s = M.unifiedSupport(A, B); cpN++;
  ok(r.element.unified && Array.isArray(r.element.aGets.reasons), '궁합이 통합 판단을 쓰지 않음');
  ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100 && r.parts.every(p => p.score >= 0 && p.score <= 100), '궁합 점수 범위');
  ok(s.score === r.element.aGets.score, '궁합 오행 보완 점수가 엔진 값과 다름');
  ok(Math.abs(s.roleFit) <= 1 && Math.abs(s.climateFit) <= 1, '궁합 성분 범위');
  if (s.dayRole === '기신' && s.score >= 50) dayBadButOk++;
  ok(!s.reasons.some(x => BAD_JOSA.test(x) || BAN.test(x)), '궁합 문장 오류: ' + s.reasons.join(' / '));
}
console.log(`통합 용신 검증 — 차트 ${stats.n}개 · 궁합 ${cpN}쌍`);
console.log('  판정 방식', JSON.stringify(stats.modes), '주 기준', JSON.stringify(stats.primary));
console.log(`  병행(methodAdvice) 사주: 조후 우선 ${stats.byeonghaengJohu} · 억부 우선 ${stats.byeonghaengEokbu} (조후 강제 없음)`);
console.log(`  보조 기준 용신을 조건부로 반영한 사주 ${stats.conditional} · 상대 일간이 기신이어도 오행 보완 50점 이상 ${dayBadButOk}쌍`);
ok(stats.byeonghaengEokbu > 0, '병행 사주가 모두 조후로 강제됨');
ok(Object.keys(stats.modes).length >= 4, '판정 방식이 한두 가지로만 나옴');
if (fails.length) { console.log(`실패 ${fails.length}건`); fails.slice(0, 40).forEach(f => console.log('  ✗', f)); process.exit(1); }
console.log('통과');
