// 명리학적 정합성 감사(2026-11-25) — 300개 명식 정밀 검사. 운영 엔진은 읽기만 한다(vm 에 그대로 올려 반환값만 읽음).
//   표본: 운세 엔진 감사(tools/luck-engine-audit-20261125/compare.cjs)의 '기존 300 생성식' 그대로
//   출력: docs/myeongri-audit-2026-11-25/data/charts300.json · checks300.json · casebook30.json
//   사용: node tools/myeongri-audit-20261125/audit.cjs
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'docs', 'myeongri-audit-2026-11-25', 'data');
const FILES = ['engine.js', 'luck-grade.js', 'luck-element-theme.js', 'jonggyeok.js', 'ten-god-roles.js'];
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx); FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const M = ctx.Manse, JG = ctx.MantraJonggyeok, LG = ctx.MantraLuckGrade, TR = ctx.MantraTenGodRoles;
const engineHash = (() => { const h = crypto.createHash('sha256'); ['engine.js', 'luck-grade.js', 'luck-element-theme.js'].forEach(f => h.update(fs.readFileSync(path.join(ROOT, f)))); return h.digest('hex').slice(0, 16); })();
const STEM = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥', EL = ['목', '화', '토', '금', '수'], GN = ['비겁', '식상', '재성', '관성', '인성'];
const stemEl = s => Math.floor(s / 2), mod = (a, n) => ((a % n) + n) % n, groupOf = (dEl, e) => mod(e - dEl, 5), elOfGroup = (dEl, g) => mod(dEl + g, 5);
const BR_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const r1 = x => x == null ? null : Math.round(x * 10) / 10;
const POS = ['year', 'month', 'day', 'hour'], PK = { year: '년', month: '월', day: '일', hour: '시' };

// 표본(compare.cjs 와 같은 식)
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));

// 엔진 내부 함수 중 내보내지 않은 것은 같은 식을 옮겨 쓴다(검사용 사본, 엔진 원문 줄 번호 표기)
//   patEstablished: engine.js 1025~1032 (B안)
function patEstablished(ch, name) {
  const G = ch.weights.groups, help = ch.strength.help, dEl = stemEl(ch.pillars.day.s), tp = ch.weights.tgPct, rv = i => ch.unified.roleV[mod(dEl + i, 5)];
  if (name === '관살혼잡') return (tp['정관'] || 0) >= 5 && (tp['편관'] || 0) >= 5 && !((tp['식신'] || 0) >= 8) && !(help < 50 && G[4] >= 15);
  if (name === '상관견관') return rv(3) > 0 && (tp['정인'] || 0) < 8 && (tp['상관'] || 0) >= 5 && (tp['정관'] || 0) >= 5;
  if (name === '효신탈식(도식)') return rv(1) > 0 && G[2] < 10 && (tp['편인'] || 0) >= 8;
  if (name === '군겁쟁재') return G[3] < 10 && G[1] < 10;
  return true;
}
//   억부 용신 규칙: engine.js 590~604 (돕는 힘을 바꿔 넣어 경계 민감도를 본다)
function eokbuYong(help, G, dEl) {
  const E = g => elOfGroup(dEl, g);
  if (help < 50) { const H = [[1, G[1]], [2, G[2]], [3, G[3]]].sort((a, b) => b[1] - a[1])[0][0]; return H === 2 ? E(0) : E(4); }
  if (G[4] > G[0]) return E(2); if (G[3] >= 10) return E(3); return E(1);
}

const gz = p => p ? STEM[p.s] + BR[p.b] : '—';
const charts = [], checks = [];
dev.forEach((inp, i) => {
  const ch = M.compute(inp), d = ch.pillars.day.s, dEl = stemEl(d), u = ch.unified, st = ch.strength, G = ch.weights.groups, tp = ch.weights.tgPct;
  const K = M.gyeokCore(ch), Z = M.jongCore(ch), jg = JG.analyze(M, ch), root = M.analyzeNatalRoot(ch);
  const combos = ch.weights.adjustments.combinations;
  const rels = ch.relations.map(r => ({ type: r.type, name: r.name, members: r.members.map(k => PK[k]).join('·'), el: r.el == null ? null : EL[r.el] }));
  const pats = ch.patterns.list.map(p => ({ name: p.name, level: p.level, basis: p.basis, established: ['관살혼잡', '상관견관', '효신탈식(도식)', '군겁쟁재'].includes(p.name) ? patEstablished(ch, p.name) : null }));
  const roleOfGroup = g => u.roles[elOfGroup(dEl, g)];
  // 대운·세운(사례집용): 대운 8개, 2020~2029 세운
  const daeun = ch.daeun.list.slice(0, 8).map(x => ({ start: x.startYear, age: x.startAge, gz: gz(x), fit: r1(x.ev.fitScore), grade: LG ? LG.flow(x.ev.fitScore, M).n : null }));
  const seun = M.seunRange(ch, 2020, 2029).map(x => ({ year: x.year, gz: gz(x), flow: r1(x.combined), own: r1(x.ev.ownFit), eokbu: r1(x.ev.eokbuScore), johu: r1(x.ev.johuScore), relation: r1(x.ev.relationScore), structure: r1(x.ev.structureScore), gyeok: r1(x.ev.gyeokScore), unified: r1(x.ev.unifiedScore), structs: (x.ev.luckStructures || []).map(s => s.name + (s.v > 0 ? '+' : '') + r1(s.v)), grade: LG ? LG.flow(x.combined, M).n : null }));
  const c = { idx: i, input: inp, pillars: POS.map(k => gz(ch.pillars[k])).join(' '), dayMaster: STEM[d] + '(' + EL[dEl] + ')', month: BR[ch.pillars.month.b],
    help: r1(st.help), zone: st.zone, deukryeong: st.deukryeong, deukji: st.deukji, deukse: st.deukse, rootScore: root.natalRootScore,
    pct: ch.weights.pct.map(r1), groups: G.map(r1), tgPct: Object.fromEntries(Object.entries(tp).map(([k, v]) => [k, r1(v)])), climate: { temp: r1(ch.climate.temp * 100) / 100, hum: r1(ch.climate.hum * 100) / 100 },
    saryeong: { stem: STEM[ch.saryeong.stem], tg: ch.saryeong.tg, label: ch.saryeong.label },
    gyeok: { kind: K.kind, status: K.status, statusRaw: K.statusRaw, pick: K.kind, sang: K.sang.map(s => (s.on ? '○ ' : '× ') + s.text), pa: K.pa.map(p => (p.on ? '● ' : '· ') + p.text + (p.rescue ? ` / 구응 ${p.rescue.on ? '○' : '×'} ${p.rescue.text}` : '')) },
    jong: { status: Z.status, statusRaw: Z.statusRaw, kind: Z.kind, side: Z.side, screen: jg.status },
    unified: { mode: u.mode, primary: u.primaryName, secondary: u.secondaryName, yong: EL[u.yong], hee: EL[u.hee], roles: Object.fromEntries([0, 1, 2, 3, 4].map(e => [EL[e], u.roles[e]])), roleV: u.roleV.map(r1), conditions: Object.fromEntries(Object.entries(u.conditions).map(([e, v]) => [EL[e], v])), conflicts: u.conflicts.map(x => x.text), steps: u.steps,
      theories: Object.fromEntries(Object.entries(u.theories).map(([k, t]) => [k, { applicable: t.applicable, urgency: t.urgency, yong: t.yong == null ? null : EL[t.yong], favor: (t.favor || []).map(e => EL[e]), verdict: t.verdict, why: t.why }])) },
    eokbuLog: ch.yongAll.eokbu.log,
    relations: rels, combinations: combos.map(r => ({ name: r.name, eligible: r.eligible, applied: r.applied, reasons: r.reasons })), patterns: pats, daeun, seun };
  charts.push(c);
  // ── 검사 플래그 ──
  const f = {};
  // 유형 추출(과제 5)
  f.boundary = Math.abs(st.help - 50) < 4;                                              // 강약 경계(억부 판정이 50 기준으로 뒤집히기 쉬움)
  const ySame = [-3, 3].every(dh => eokbuYong(st.help + dh, G, dEl) === ch.yongAll.eokbu.yong);
  f.eokbuFlip = !ySame;                                                                // 돕는 힘 ±3%p 안에서 억부 용신이 바뀜
  f.johuEokbuConflict = ['conflict', 'bridge'].includes(u.mode);
  f.clearGyeok = K.status === 'seong' && K.sang.filter(s => s.on).length >= 1 && K.pa.every(p => !p.on);
  f.jong = ['jin', 'ga', 'hold'].includes(Z.status);
  const brRel = ch.relations.filter(r => r.kind === 'branch'), stemRel = ch.relations.filter(r => r.kind === 'stem');
  const memberTypes = {}; ch.relations.forEach(r => r.members.forEach(k => { const key = r.kind + ':' + k; (memberTypes[key] = memberTypes[key] || new Set()).add(/합/.test(r.type) ? '합' : /충/.test(r.type) ? '충' : '기타'); }));
  f.relDense = ch.relations.filter(r => ['천간합', '천간충', '육합', '삼합', '반합', '방합', '충', '형'].includes(r.type)).length >= 4 || Object.values(memberTypes).some(s => s.has('합') && s.has('충'));
  f.complexRoles = Object.keys(u.conditions).length >= 2 || u.conflicts.length >= 2;
  // 정합성 점검(과제 2~4)
  f.hapAndChungSame = Object.entries(memberTypes).filter(([, s]) => s.has('합') && s.has('충')).map(([k]) => k);     // 한 글자가 합과 충에 함께 걸림(탐합망충·합으로 충 해소 학파 쟁점)
  f.wuWeiHap = ch.relations.some(r => r.type === '육합' && /午未|未午/.test(r.name));      // 午未합: 엔진은 화(火), 토로 보는 학파 있음
  f.saengMyoNoWang = [[8, 4], [11, 7], [2, 10], [5, 1]].some(([a, b]) => POS.some(k => ch.pillars[k] && ch.pillars[k].b === a) && POS.some(k => ch.pillars[k] && ch.pillars[k].b === b)) && !ch.relations.some(r => r.type === '삼합' || r.type === '반합');   // 생지+묘지(공합) — 엔진은 반합으로 안 봄
  f.nonAdjStemHap = stemRel.filter(r => r.type === '천간합' && Math.abs(POS.indexOf(r.members[0]) - POS.indexOf(r.members[1])) > 1).map(r => r.name);   // 떨어진 천간합(합으로 표시되지만 합화 반영은 안 됨)
  f.dayStemHap = stemRel.filter(r => r.type === '천간합' && r.members.includes('day')).map(r => r.name + '(' + r.members.map(k => PK[k]).join('·') + ')');   // 일간 합: 합화(화기격) 판정 없음
  const monthEl = stemEl(ch.pillars.month.b != null ? M.HIDDEN[ch.pillars.month.b][M.HIDDEN[ch.pillars.month.b].length - 1][0] : 0);
  f.hwagiCandidate = stemRel.filter(r => r.type === '천간합' && r.members.includes('day') && Math.abs(POS.indexOf(r.members[0]) - POS.indexOf(r.members[1])) === 1 && (r.el === monthEl)).map(r => r.name);   // 화기격 후보(인접·월령이 합화 오행)
  f.oneElementDominant = ch.weights.pct.some(v => v >= 60);   // 일행득기 등 특수격 후보(엔진은 종왕·종강으로만 봄)
  // 십성 구조: 이름(본기 기준 patterns) vs 격국 판정(지장간 전체 gyeokCore) vs 성립 조건(patEstablished)
  const has = n => ch.patterns.list.some(p => p.name === n);
  const paOn = t => K.pa.some(p => p.on && p.text.includes(t));
  f.nameOnly = pats.filter(p => p.established === false).map(p => p.name);
  f.patVsGyeok = ['상관견관', '관살혼잡', '효신탈식'].filter(t => (K.key === '정관' || K.key === '편관' || K.key === '상관' || K.key === '식신' || K.key === '편인') && K.pa.some(p => p.text.includes(t)) && (has(t === '효신탈식' ? '효신탈식(도식)' : t) !== paOn(t))).map(t => t + (paOn(t) ? '(격국은 있음·구조 목록엔 없음)' : '(구조 목록엔 있음·격국은 없음)'));
  f.goodPatternVsRole = (has('식신제살') && (roleOfGroup(3) === '용신' || roleOfGroup(3) === '희신') ? ['식신제살(관성이 용·희신)'] : []).concat(has('살인상생') && (roleOfGroup(4) === '기신' || roleOfGroup(4) === '구신') ? ['살인상생(인성이 기·구신)'] : []).concat(has('상관패인') && (roleOfGroup(4) === '기신' || roleOfGroup(4) === '구신') ? ['상관패인(인성이 기·구신)'] : []);
  const jehwa = u.theories.jehwa; f.jehwaCureExists = jehwa.applicable && ((/관살/.test(jehwa.why) && (tp['식신'] || 0) >= 8) || (/상관견관/.test(jehwa.why) && (tp['정인'] || 0) >= 8));
  // 용신 배치
  const weak = st.help < 50, notJong = u.mode !== 'jong';
  const hanG = groupOf(dEl, u.han);
  f.hanAgainst = notJong && ((weak && [1, 2, 3].includes(hanG)) || (!weak && [0, 4].includes(hanG))) ? `${GN[hanG]}(${EL[u.han]})이 한신 — ${weak ? '신약에 설기·소모 쪽' : '신강에 생조 쪽'}` : null;
  f.jongRoleIssue = u.mode === 'jong' && ((Z.kind === '종재격' && u.roles[elOfGroup(dEl, 0)] !== '기신') || (Z.kind === '종살격' && ['한신', '희신'].includes(u.roles[elOfGroup(dEl, 0)]))) ? `${Z.kind}: 비겁 ${u.roles[elOfGroup(dEl, 0)]}` : null;
  f.yongAbsent = ch.weights.pct[u.yong] < 1;
  f.gyeokPrimaryDouble = u.primaryName === '격국' && u.theories.gyeok.urgency >= 1;      // 격국이 주 기준이면 역할표(격국 용신)와 운의 격국 성분이 같은 오행을 두 번 반영
  f.gyeokFavorMatchesYong = u.primaryName !== '격국' && u.theories.gyeok.applicable && (u.theories.gyeok.favor || []).includes(u.yong);
  const jp = jehwa.applicable ? pats.find(p => p.name === jehwa.why.split(' 구조(')[0]) : null;
  f.jehwaOnNameOnly = !!(jp && jp.established === false);   // 제화 판정이 성립하지 않은(이름만 일치) 구조를 근거로 조건부 역할을 만듦
  f.jehwaDoublePenalty = !!(jp && jp.established !== false && jehwa.urgency >= 2 && jehwa.avoid.some(e => ['용신', '희신'].includes(u.roles[e])));   // 같은 구조가 역할값 누그러뜨림 + 운 구조 감점으로 두 번 반영
  // 같은 구조를 세 곳에서 판정: ① 엔진 patterns(이름·본기) ② 운 점수용 성립 조건(B안) ③ 화면 필터(ten-god-roles.js agreePatterns 의 off = 화면에서 숨김)
  const dropped = new Set((TR.agreePatterns(M, ch).dropped) || []);
  f.threeWay = pats.filter(p => p.established != null).map(p => ({ name: p.name, engineName: true, establishedB: p.established, screenShown: !dropped.has(p.name) })).filter(x => x.establishedB !== x.screenShown).map(x => x.name + (x.screenShown ? '(화면 표시·B안 불성립)' : '(화면 숨김·B안 성립)'));
  f.jongScreenMismatch = (Z.status !== jg.status);
  f.staleEokbuText = ch.yongAll.eokbu.log.some(l => l.includes('종격을 판정하지 않으므로'));
  f.saryeongVsGyeok = M.tenGod(d, ch.saryeong.stem) + '격' !== K.kind && !['건록격', '양인격', '월겁격'].includes(K.kind) && ch.saryeong.label !== '정기';   // 사령(지금 주도 글자) 기준이면 격이 달라질 수 있음(학파)
  f.tonggwanPrimary = u.primaryName === '통관';
  f.johuModelSimplified = u.primaryName === '조후' || u.secondaryName === '조후';
  checks.push({ idx: i, pillars: c.pillars, help: c.help, zone: st.zone, mode: u.mode, primary: u.primaryName, yong: EL[u.yong], gyeok: K.kind + '/' + K.status, jong: Z.status, flags: f });
});
// 집계
const cnt = k => checks.filter(x => { const v = x.flags[k]; return Array.isArray(v) ? v.length > 0 : !!v; }).length;
const keys = Object.keys(checks[0].flags), summary = Object.fromEntries(keys.map(k => [k, cnt(k)]));
const dist = (f) => { const o = {}; checks.forEach(x => { const k = f(x); o[k] = (o[k] || 0) + 1; }); return o; };
const nameOnlyBy = {}; checks.forEach(x => x.flags.nameOnly.forEach(n => nameOnlyBy[n] = (nameOnlyBy[n] || 0) + 1));
const patTotal = {}; charts.forEach(c => c.patterns.forEach(p => patTotal[p.name] = (patTotal[p.name] || 0) + 1));
const hanBy = {}; checks.filter(x => x.flags.hanAgainst).forEach(x => { const k = x.flags.hanAgainst.split('(')[0] + (x.help < 50 ? '·신약' : '·신강'); hanBy[k] = (hanBy[k] || 0) + 1; });
const res = { runAt: new Date().toISOString(), engineHash, sample: '300개 생성식(1950~2004, 분 0, 시간 앎) — tools/luck-engine-audit-20261125/compare.cjs dev', n: checks.length, summary,
  dist: { zone: dist(x => x.zone), mode: dist(x => x.mode), primary: dist(x => x.primary), gyeok: dist(x => x.gyeok.split('/')[1]), gyeokKind: dist(x => x.gyeok.split('/')[0]), jong: dist(x => x.jong) },
  patternsTotal: patTotal, nameOnlyByPattern: nameOnlyBy, hanAgainstBy: hanBy };
// 사례집 30개: 여섯 유형마다 5개(겹치지 않게, 유형 안에서는 표본 순서 균등 간격)
const types = [['boundary', '신강·신약 경계'], ['johuEokbuConflict', '조후·억부 충돌'], ['clearGyeok', '격국 뚜렷'], ['jong', '종격·특수격 후보'], ['relDense', '합충 중첩'], ['complexRoles', '용신·기신 복잡']];
const used = new Set(), book = [];
for (const [k, label] of types) {
  let pool = checks.filter(x => { const v = x.flags[k]; return (Array.isArray(v) ? v.length : v) && !used.has(x.idx); });
  if (k === 'jong' && pool.length < 5) pool = pool.concat(checks.filter(x => (x.flags.oneElementDominant || x.flags.hwagiCandidate.length) && !used.has(x.idx) && !pool.includes(x)));
  const pick = []; for (let j = 0; j < 5 && pool.length; j++) { const x = pool[Math.floor(j * pool.length / 5)]; if (x && !pick.includes(x)) pick.push(x); }
  pick.forEach(x => { used.add(x.idx); book.push({ type: label, chart: charts[x.idx], flags: x.flags }); });
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'charts300.json'), JSON.stringify({ runAt: res.runAt, engineHash, charts }, null, 1));
fs.writeFileSync(path.join(OUT, 'checks300.json'), JSON.stringify(Object.assign({}, res, { checks }), null, 1));
fs.writeFileSync(path.join(OUT, 'casebook30.json'), JSON.stringify({ runAt: res.runAt, engineHash, cases: book }, null, 1));
console.log(JSON.stringify(res, null, 1)); console.log('사례집', book.length, book.map(b => b.type).reduce((o, t) => (o[t] = (o[t] || 0) + 1, o), {}));
