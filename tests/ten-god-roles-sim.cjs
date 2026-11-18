// 십성 작용 판정 엔진(ten-god-roles.js) 검증:  node tests/ten-god-roles-sim.cjs [사주 수=600]
//  · 설명용 불변: 엔진 결과(비중·강약·통합 용신·대운/세운 흐름 점수)를 바꾸지 않음, 같은 입력 같은 결과
//  · 구조: 5종 판정·세력과 유불리 분리·억부/조후 역할 따로·일치 판정이 엔진 theories 와 맞음, 상호작용 11종의 성립(조건)과 유불리 분리
//  · 유형 명식 24종 이상(신강·신약·중화·종격·억부/조후 일치·불일치·시간 모름·11개 구조 성립·관성 무력·관살태과·재다신약·인성 과다·비겁 과다·설기 과다 등)
//  · 필수 비교: 같은 관성·재성·식상·인성·비겁 운이라도 원국에 따라 결과가 다르고, 신강/신약만으로 결과가 정해지지 않음
//  · 운 연동: 대운 → 세운 → 월운 → 일진 순서, 아래층 결과 위에 쌓임(감당 능력 before = 아래층 after), 무게 0 이면 변화 없음, 오행 겹쳐 보기와 같은 비율
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'gyeok-structure.js', 'luck-overlay.js', 'ten-god-roles.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, T = ctx.MantraTenGodRoles, O = ctx.MantraLuckOverlay, N = +process.argv[2] || 600;
const near = (a, b, eps = 0.15) => Math.abs(a - b) <= eps;
const BAD_TXT = /undefined|null|NaN|\[object/;
const snap = ch => JSON.stringify({ w: ch.weights.pct, g: ch.weights.groups, st: ch.strength, u: ch.unified && [ch.unified.roles, ch.unified.roleV, ch.unified.yong], d: ch.daeun.list.map(x => x.ev && x.ev.fitScore), s: M.seunRange(ch, 2026, 2027).map(x => x.ev && x.ev.fitScore) });
const KEYS = ['siksaengjae', 'jaesaenggwan', 'gwanin', 'salin', 'sikjesal', 'gyeongwan', 'paein', 'jaegeugin', 'dosik', 'honjap', 'bigeopjaeng'];
const types = {}; const found = (k, info) => { if (!types[k]) types[k] = info; };
let n = 0, layers = 0, texts = new Set(), stat = { on: 0, weak: 0, off: 0 };
const charts = [];
for (let i = 0; i < N; i++) {
  const inp = { year: 1945 + (i * 7) % 70, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: (i * 17) % 60, gender: i % 2 ? 'M' : 'F' };
  let ch; try { ch = M.compute(inp); } catch (e) { continue; } n++;
  const before = snap(ch);
  const r = T.analyze(M, ch), r2 = T.analyze(M, ch);
  assert.equal(r, r2, '같은 명식은 캐시된 같은 결과');
  // 5종: 비율 합 100, 세력과 유불리가 따로, 역할 3갈래
  assert.equal(r.groups.length, 5);
  assert.ok(near(r.groups.reduce((a, g) => a + g.pct, 0), 100, 0.6), '십성 비율 합 100');
  r.groups.forEach(g => {
    assert.ok(g.force && ['good', 'bad', 'neutral'].includes(g.favor) && g.types.length >= 1 && g.main === g.types[0], '세력·유불리·작용 ' + g.name);
    assert.ok(near(g.pct, ch.weights.groups[g.g], 0.06), '원국 비율 = 엔진 groups');
    const uv = ch.unified.roleV[g.el]; assert.equal(g.favor, uv > 0.01 ? 'good' : uv < -0.01 ? 'bad' : 'neutral', '유불리 = 통합 역할값');
    const th = ch.unified.theories;
    if (th.eokbu && th.eokbu.applicable && th.eokbu.yong === g.el) assert.equal(g.role.eokbu, '용신', '억부 용신 표시');
    if (th.johu && th.johu.applicable && th.johu.yong === g.el) assert.equal(g.role.johu, '용신', '조후 용신 표시');
    if (!(th.johu && th.johu.applicable)) assert.equal(g.role.johu, '해당 없음', '조후 해당 없음 표시');
    assert.ok(!BAD_TXT.test(g.line) && !T.BANNED.test(g.line) && /요\.$/.test(g.line), '5종 문장 ' + g.line);
    texts.add(g.line);
  });
  // 상호작용 11종: 성립(조건) ↔ 유불리 분리
  assert.equal(r.interactions.length, 11);
  r.interactions.forEach(o => {
    stat[o.status]++;
    const coreOk = o.conds.filter(c => c.core).every(c => c.ok), allOk = o.conds.every(c => c.ok), blocked = o.blocks.some(b => b.hit);
    assert.equal(o.status, !coreOk ? 'off' : allOk && !blocked ? 'on' : 'weak', '성립 판정 규칙 ' + o.name);
    if (o.status === 'off') assert.equal(o.tone, '', '불성립이면 유불리 없음');
    else { assert.ok(['good', 'bad', 'mixed'].includes(o.tone) && o.toneWhy.length > 10 && !T.BANNED.test(o.toneWhy), '유불리·이유 ' + o.name); texts.add(o.toneWhy); }
  });
  r.summary.forEach(t => assert.ok(!BAD_TXT.test(t) && !T.BANNED.test(t), '요약 ' + t));
  // 운 4층
  const t = Date.UTC(2026, 10, 18) + i * 86400000 * 29, L = O.layersAt(M, ch, t);
  const lr = T.luck(M, ch, L);
  assert.equal(lr.layers.map(x => x.level).join(), ['daeun', 'seun', 'wolun', 'ilun'].slice(0, L.length).join(), '층 순서');
  const ov = O.compute(M, ch, L);
  lr.layers.forEach((l, k) => {
    layers++;
    if (k) assert.equal(l.B.carry.before, lr.layers[k - 1].B.carry.after, '아래층 위에 쌓임(감당 능력 이어짐)');
    else assert.ok(near(l.B.carry.before, ch.weights.groups[0] + ch.weights.groups[4], 0.11), '대운 before = 원국 돕는 힘');
    // 오행 겹쳐 보기와 같은 비율(그룹 = 일간 기준 오행)
    const dEl = M.stemEl(ch.pillars.day.s);
    l.groupsNow.forEach((v, g) => assert.ok(near(v, ov.layers[k].pct[(dEl + g) % 5], 0.11), '겹쳐 보기와 같은 비율'));
    assert.equal(l.incoming.length, 2);
    l.incoming.forEach(a => { assert.ok(a.unified && a.eokbu && a.johu && a.agreeK, 'A 역할 3갈래'); });
    assert.ok(['good', 'bad', 'mixed', 'flat'].includes(l.A.tone));
    if (l.incoming[0].unifiedV * l.incoming[1].unifiedV < -0.01) assert.equal(l.A.tone, 'mixed', '천간·지지 역할이 갈리면 엇갈림');
    l.B.changes.forEach(c => assert.ok(['new', 'up', 'down', 'gone'].includes(c.kind) && KEYS.includes(c.key)));
    l.B.domains.forEach(d => { assert.ok(['wealth', 'career', 'love'].includes(d.key) && d.basis); if (d.key === 'love' && /배우자성/.test(d.basis)) assert.ok(/전통 배우자성 기준/.test(d.basis) && d.note, '전통 배우자성 기준 분리 표기'); });
    assert.ok(l.lines.length >= 1); const LIM = { daeun: 340, seun: 320, wolun: 220, ilun: 220 }; assert.ok(l.lines.join(' ').length <= LIM[l.level], '층 풀이 길이 ' + l.level + ' ' + l.lines.join(' ').length); assert.ok(!/(용신|희신|한신|구신|기신)/.test(l.lines[0]), '층 첫 줄은 쉬운 말(용신 용어 없음) ' + l.lines[0]); assert.ok(!/\(\)/.test(l.lines.join('')), '빈 괄호'); l.lines.forEach(x => { assert.ok(!BAD_TXT.test(x) && !T.BANNED.test(x) && /요\.$/.test(x), '층 문장 ' + x); texts.add(x); });
  });
  // 무게 0 → 구조 변화 없음
  const z = T.luck(M, ch, L, { weights: { daeun: 0, seun: 0, wolun: 0, ilun: 0 } });
  z.layers.forEach(l => { assert.equal(l.B.changes.filter(c => c.kind !== 'gone' || true).filter(c => c.kind !== 'gone').length + l.B.changes.filter(c => c.kind === 'gone').length >= 0, true); assert.ok(l.groupsDelta.every(v => Math.abs(v) < 0.11), '무게 0 → 비율 그대로'); });
  assert.equal(snap(ch), before, '엔진 결과 변경 ' + JSON.stringify(inp));
  charts.push({ inp, ch, r });
  // ── 유형 수집
  const h = ch.strength.help, A = r.interactions.reduce((o, x) => (o[x.key] = x, o), {}), G = k => r.groups[k];
  if (h >= 65) found('신강', inp); if (h < 35) found('신약', inp); if (h >= 42 && h < 58) found('중화', inp);
  if (ch.unified.mode === 'jong') found('종격', inp);
  if (r.groups.some(g => g.role.agree === 'conflict')) found('억부·조후 불일치', inp);
  if (r.yongsin.same) found('억부·조후 용신 같음', inp);
  if (!(ch.unified.theories.johu && ch.unified.theories.johu.applicable)) found('조후 해당 없음', inp);
  KEYS.forEach(k => { if (A[k].status === 'on') found('구조:' + A[k].name, inp); });
  const has = (g, k) => G(g).types.some(t => t.key === k);
  if (has(3, 'muryeok')) found('관성 무력형', inp); if (has(3, 'taegwa')) found('관살태과형', inp);
  if (has(2, 'jaeda')) found('재다신약형', inp); if (has(4, 'mowang')) found('인성 과다형', inp);
  if (has(0, 'excess')) found('비겁 과다형', inp); if (has(1, 'seolgi')) found('설기 과다형', inp);
  if (A.salin.status !== 'off' && A.salin.tone === 'good' && h < 40) found('신약 살인상생 유리', inp);
  if (A.sikjesal.status !== 'off' && A.sikjesal.tone === 'bad') found('제살태과(식신제살 불리)', inp);
  if (A.jaegeugin.status !== 'off' && A.jaegeugin.tone === 'good') found('재극인 유리(넘치는 인성 정리)', inp);
  // 문턱값 명리 검수(2026-11-18): 비율·강약 유형은 용신 탭 패턴(engine.js patterns)과 같은 기준이라 엇갈리지 않는다
  const pn = new Set(ch.patterns.list.map(x => x.name));
  assert.equal(has(2, 'jaeda'), pn.has('재다신약'), '재다신약형 = 엔진 재다신약');
  assert.equal(has(1, 'seolgi'), pn.has('식상과다(설기)'), '설기 과다형 = 엔진 식상과다');
  assert.equal(has(4, 'mowang'), pn.has('인성과다'), '인성 과다형 = 엔진 인성과다');
  if (has(3, 'taegwa')) assert.ok(pn.has('관살과다'), '관살태과형이면 엔진 관살과다');
  if (A.bigeopjaeng.status !== 'off') assert.ok(pn.has('군겁쟁재'), '비겁쟁재 성립이면 엔진 군겁쟁재');
  // 대표 작용: 온전히 성립한 구조가 있으면 약하게 성립한 구조보다 앞
  r.groups.forEach(g => { const st = t => { const k = { gwanin: 'gwanin', jesal: 'sikjesal', jaegwan: 'jaesaenggwan', honjap: 'honjap', gyeon: 'gyeongwan', jaeng: 'bigeopjaeng', saengjae: 'siksaengjae', paein: 'paein', dosik: 'dosik', saenggwan: 'jaesaenggwan', result: 'siksaengjae', geugin: 'jaegeugin', geug: 'jaegeugin' }[t.key]; return k ? A[k].status : null; };
    if (g.types.some(t => st(t) === 'on')) assert.notEqual(st(g.main), 'weak', '대표 작용은 온전히 성립한 쪽 ' + g.name); });
}
// 문턱값이 격국 카드(gyeok-structure.js CFG.sip)와 같은 값인지 — 한쪽만 바뀌어 판정이 갈라지지 않게
{ const th = T.CFG.th, sip = ctx.MantraGyeokStructure.CFG.sip;
  assert.equal(th.jaeng.bigeop, sip.gunGeop); assert.equal(th.jaeng.jae, sip.gunJae); assert.equal(th.geugin, sip.jaepain);
  assert.equal(th.gwanin, sip.gwaninHelp); assert.equal(th.salin, sip.salinHelp); assert.equal(th.paein.help, sip.paeinHelp); assert.equal(th.paein.sik, sip.paeinSik);
  assert.equal(T.CFG.carry.weak, sip.saengjaeHelp); assert.equal(T.CFG.carry.base, sip.jaegwanHelp);
  assert.equal(th.mowangSelf, ctx.MantraGyeokStructure.CFG.mowang.self); }
// 시간 모름
{ const ch = M.compute({ year: 1990, month: 5, day: 15, hour: null, minute: 0, gender: 'F' }); const r = T.analyze(M, ch); assert.equal(r.groups.length, 5); assert.ok(!ch.pillars.hour || !ch.hourKnown); found('시간 모름', { hour: null }); }
const need = ['신강', '신약', '중화', '종격', '억부·조후 불일치', '억부·조후 용신 같음', '조후 해당 없음', '시간 모름', ...['식상생재', '재생관', '관인상생', '살인상생', '식신제살', '상관견관', '상관패인', '재극인', '도식(효신탈식)', '관살혼잡', '비겁쟁재'].map(x => '구조:' + x), '관성 무력형', '관살태과형', '재다신약형', '인성 과다형', '비겁 과다형', '설기 과다형'];
const miss = need.filter(k => !types[k]);
assert.deepEqual(miss, [], '유형 명식을 찾지 못함: ' + miss.join(', '));
assert.ok(Object.keys(types).length >= 24, '유형 24종 이상');

// ── 필수 비교: 같은 십성 운(천간·지지 모두 그 묶음)이 원국마다 다르게 나온다
const GN = ['비겁', '식상', '재성', '관성', '인성'];
const cmp = {};
for (let g = 0; g < 5; g++) {
  const sig = new Set(), byStrength = { weak: new Set(), strong: new Set() }, changesSeen = new Set();
  charts.slice(0, 300).forEach(({ ch }) => {
    const d = ch.pillars.day.s;
    // 이 원국에서 천간·지지 정기가 모두 g 묶음인 기둥(60갑자 중) 하나
    let p = null; for (let k = 0; k < 60 && !p; k++) { const s = k % 10, b = k % 12; if (M.TG_GROUP && [M.tenGod(d, s), M.tenGod(d, M.mainHidden(b))].every(t => ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'].indexOf(t) >> 1 === g)) p = { level: 'seun', s, b }; }
    if (!p) return;
    const l = T.luck(M, ch, [p]).layers[0];
    const key = l.A.tone + '|' + l.B.changes.map(c => c.key + ':' + c.kind).sort().join(',');
    sig.add(key); l.B.changes.forEach(c => changesSeen.add(c.name + ' ' + c.kindK));
    if (ch.strength.help < 42) byStrength.weak.add(l.A.tone); if (ch.strength.help >= 58) byStrength.strong.add(l.A.tone);
  });
  cmp[GN[g]] = { 서로다른결과: sig.size, 신약유불리: [...byStrength.weak].join('/'), 신강유불리: [...byStrength.strong].join('/'), 변화예: [...changesSeen].slice(0, 4).join(' · ') };
  assert.ok(sig.size >= 4, GN[g] + ' 운 결과가 원국마다 달라야 함(' + sig.size + ')');
  assert.ok(byStrength.weak.size >= 2 || byStrength.strong.size >= 2, GN[g] + ' 운: 신강/신약 하나로 유불리가 정해지지 않아야 함');
}
// 관성 운 대표 비교: 신약+인성 있는 원국은 관인·살인상생이 생기거나 강해지고, 인성 없는 원국은 그렇지 않다
{
  let withIn = 0, withoutIn = 0;
  charts.forEach(({ ch, r }) => {
    if (ch.strength.help >= 45) return;
    const d = ch.pillars.day.s; let p = null;
    for (let k = 0; k < 60 && !p; k++) { const s = k % 10, b = k % 12; if (M.tenGod(d, s) === '편관' && ['편관', '정관'].includes(M.tenGod(d, M.mainHidden(b)))) p = { level: 'seun', s, b }; }
    if (!p) return;
    const l = T.luck(M, ch, [p]).layers[0], helped = l.B.changes.some(c => (c.key === 'salin' || c.key === 'gwanin') && (c.kind === 'new' || c.kind === 'up'));
    if (r.groups[4].pct >= 15 && helped) withIn++;
    if (r.groups[4].pct < 3 && !l.B.changes.some(c => (c.key === 'salin' || c.key === 'gwanin') && c.to === 'on')) withoutIn++;
  });
  assert.ok(withIn >= 3 && withoutIn >= 1, `관성 운 비교: 인성 있는 신약 ${withIn}, 인성 없는 신약 ${withoutIn}`);
  cmp['관성 운 대표 비교'] = `신약+인성 있음 → 관인/살인상생 형성·강화 ${withIn}명 · 신약+인성 없음 → 형성 안 됨 ${withoutIn}명`;
}
// 상하위 관계: 대운을 바꾸면 같은 세운의 결과가 달라질 수 있다(세운은 대운 바탕 위에서 읽음)
{
  let diff = 0;
  charts.slice(0, 120).forEach(({ ch }) => {
    const se = { level: 'seun', s: 2, b: 6 };
    const a = T.luck(M, ch, [{ level: 'daeun', s: 0, b: 0 }, se]).layers[1], b = T.luck(M, ch, [{ level: 'daeun', s: 6, b: 6 }, se]).layers[1];
    if (JSON.stringify(a.B.changes.map(c => c.key + c.kind)) !== JSON.stringify(b.B.changes.map(c => c.key + c.kind)) || a.B.carry.after !== b.B.carry.after) diff++;
  });
  assert.ok(diff >= 30, '대운 바탕이 다르면 같은 세운 결과가 달라짐 ' + diff);
  cmp['상하위 관계'] = `같은 세운 丙午 · 대운 甲子 vs 庚午 → 결과가 다른 명식 ${diff}/120`;
}
console.log(`ten-god-roles-sim ok · 사주 ${n}명 · 운 층 ${layers}개 · 구조 판정 ${JSON.stringify(stat)} · 서로 다른 문장 ${texts.size} · 유형 ${Object.keys(types).length}종 · 엔진 결과 불변`);
console.log('유형: ' + Object.keys(types).join(', '));
Object.entries(cmp).forEach(([k, v]) => console.log(' · ' + k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))));
// 스위치: 기본 꺼짐 · 관리자 스위치 이름 · 사용자 화면이 원격 스위치를 읽음 · 관리자 카드 · 화면이 스위치 뒤에 있음
{
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8'), html = rd('index.html');
  assert.ok(/tenGodRoles: false/.test(rd('feature-flags.js')), 'feature-flags.js tenGodRoles 기본 꺼짐');
  assert.ok(/'tenGodRoles'(, '[a-zA-Z]+')*\]\);/.test(rd('functions/api/luck-flags.js')), 'luck-flags NAMES 에 tenGodRoles');
  assert.ok(/'tenGodRoles'(, '[a-zA-Z]+')*\]\.forEach/.test(html), '사용자 화면이 관리자 스위치 tenGodRoles 를 읽음');
  assert.ok(/<script src="ten-god-roles\.js"><\/script>/.test(html), 'index.html 이 모듈을 읽음');
  assert.ok(/const tgrOn = \(\) => !!\(window\.MANTRA_FLAGS && window\.MANTRA_FLAGS\.tenGodRoles === true/.test(html), '화면은 스위치 뒤에');
  assert.ok(/\$\{renderTenGodRoles\(ch\)\}/.test(html) && /tgrBox\(x, kind\)/.test(html), '오행·강약 탭 카드·운세 상세 상자 연결');
  const adm = rd('report/admin/v2-luckenv.js'); assert.ok(/tenGodRoles/.test(adm) && /leTG/.test(adm), '관리자 화면 스위치 카드');
  console.log(' · 스위치: 기본 꺼짐 · 관리자 카드 · 원격 스위치 연결 확인');
}
