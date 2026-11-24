// 공통 방위·28수 도수 프로필·나경 대응·통합 해석·날짜별 28수 검증 (2026-11-21)
//   node tests/mansions-sim.cjs
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..');
let net = 0; globalThis.fetch = () => { net++; throw new Error('network'); };
for (const f of ['fengshui-data.js', 'fengshui-engine.js', 'bearing.js', 'mansions-data.js', 'mansions-engine.js', 'space-integrate.js', 'mansions-day-data.js', 'mansions-day.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const F = globalThis.MantraFengshui, B = globalThis.MantraBearing, MD = globalThis.MantraMansionsData, MS = globalThis.MantraMansions, SI = globalThis.MantraSpaceIntegrate, DD = globalThis.MantraMansionDayData, X = globalThis.MantraMansionDay;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
const jdn = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 864e5) + 2440588;

// ── 1. 나침반·공통 방위
eq([0, 45, 90, 180, 270, 359, 360, -1, 720.5, '359.96'].map(B.normalize), [0, 45, 90, 180, 270, 359, 0, 359, 0.5, 0], '각도 정규화(0·45·90·180·270·359·360 순환)');
eq([B.normalize(''), B.normalize(null), B.normalize('abc')], [null, null, null], '빈 값·문자는 null');
eq([0, 90, 180, 270, 359].map(B.sitting), [180, 270, 0, 90, 179], '좌 = (향+180)%360');
for (let d = 0; d < 360; d += 7.5) ok(F.mountainAt(B.sitting(d)).mt.hj === F.mountainAt(d + 180).mt.hj, '좌 계산이 현공 엔진과 다름 ' + d);
const r0 = B.record({ azimuth: 187, referenceNorth: 'magnetic' });
ok(r0.correction === 'uncorrected' && r0.correctedAzimuth === null && r0.magneticDeclination === null, '편각 미입력 → 미보정, 임의 값 없음');
ok(/미보정/.test(r0.notes.join('')) && /자북/.test(B.northText(r0)), '미보정 안내·자북 진북 차이 안내');
const r1 = B.record({ azimuth: 5, referenceNorth: 'magnetic', magneticDeclination: -8.5 });
ok(r1.correctedAzimuth === 356.5 && r1.correctedReference === 'true', '자북 5° + 서편각 8.5° → 진북 356.5°');
const r2 = B.record({ azimuth: 356.5, referenceNorth: 'true', magneticDeclination: -8.5 });
ok(r2.correctedAzimuth === 5 && r2.correctedReference === 'magnetic', '진북 → 자북 역변환');
const r3 = B.record({ azimuth: 100, magneticDeclination: -8 });
ok(r3.referenceNorth === 'unknown' && r3.correctedAzimuth === null, '기준 모르면 편각이 있어도 보정하지 않음');
ok(B.record({ azimuth: 10, magneticDeclination: 99 }).magneticDeclination === null, '말이 안 되는 편각(|x|>30)은 버림');
ok(/측량/.test(B.record({ azimuth: 10, measurementSource: 'sensor' }).notes.join('')), '센서 값은 측량 수준이 아니라고 안내');
ok(B.forFengshui(B.record({ azimuth: 187, referenceNorth: 'true', magneticDeclination: -8 })) === 187, '풍수 계산에는 보정값이 아니라 입력 각도');

// ── 2. 현공 보존: 기준선(28수 추가 전) 3,339건과 같아야 한다
try { cp.execFileSync(process.execPath, [path.join(root, 'tools', 'xuankong-baseline.cjs')], { stdio: 'pipe' }); } catch (e) { fails.push('현공 기준선 불일치: ' + String(e.stdout || e.message)); }
const xk = F.xuankong({ facingDeg: 187, builtYear: 2010, evalYear: 2026 }), xkJson = JSON.stringify(xk);
ok(F.xuankong({ facingDeg: 7 + 180, builtYear: 2010, evalYear: 2026 }).facing.mt.hj === '午' && F.xuankong({ facingDeg: 7, builtYear: 2010, evalYear: 2026 }).facing.mt.hj === '子', '향이 바뀌면 결과 갱신');
ok(F.xuankong({ facingDeg: 0, builtYear: 2010 }).facing.mt.hj === F.xuankong({ facingDeg: 360, builtYear: 2010 }).facing.mt.hj && F.xuankong({ facingDeg: 359, builtYear: 2010 }).facing.mt.hj === '子', '0·359·360 경계');
ok(F.xuankong({ facingDeg: 180, builtYear: 1995, renovationYear: 2021 }).period === 8 && F.xuankong({ facingDeg: 180, builtYear: 1995 }).period === 7, '개축 연도 기준 처리 그대로');

// ── 3. 28수 데이터
eq(MS.checkBase(), [], '28수 기본 점검');
eq(MD.MANSIONS.map(m => m.hanja).join(''), '角亢氐房心尾箕斗牛女虛危室壁奎婁胃昴畢觜參井鬼柳星張翼軫', '28수 순서');
eq(['east', 'north', 'west', 'south'].map(g => MD.MANSIONS.filter(m => m.group === g).map(m => m.hanja).join('')), ['角亢氐房心尾箕', '斗牛女虛危室壁', '奎婁胃昴畢觜參', '井鬼柳星張翼軫'], '사신별 7수');
ok(MD.MANSIONS.every(m => ['id', 'name', 'hanja', 'group', 'guardian', 'traditionalSymbolism', 'source', 'sourceVersion'].every(k => m[k]) && 'mansionStart' in m && 'mansionEnd' in m && 'angularExtent' in m), '필수 필드');
ok(MD.MANSIONS.every(m => m.mansionStart === null && m.angularExtent === null), '체계 없이 도수를 사실처럼 넣지 않음');
const bad = MS.checkBase(MD.MANSIONS.slice(0, 27)); ok(bad.length >= 2, '누락 감지');
ok(MS.checkBase(MD.MANSIONS.concat([MD.MANSIONS[0]])).some(e => /중복/.test(e)), '중복 감지');
eq(MD.LUOPAN_PROFILES.length, 0, '출전 확인된 나경 대응표 없음(미확정)');

// 도수 프로필: 원문별 분리·상태
const P = id => MD.DEGREE_PROFILES.find(p => p.id === id);
eq(MD.DEGREE_PROFILES.map(p => p.id + ':' + p.status), ['hhs-sifen-equatorial:verified', 'hhs-sifen-ecliptic:verified', 'jinshu-jingchu:unconfirmed', 'hanshu-santong:incomplete', 'huainanzi-tianwen:unconfirmed'], '도수 프로필 5개·상태');
const EQ = P('hhs-sifen-equatorial');
ok(MS.isBaseStandard(EQ) && MS.defaultProfile() === EQ, '기본 = 후한서 적도도(365¼, 적도, ¼ 위치 확인)');
eq([EQ.extents.dou, EQ.extents.wei_roof, EQ.extents.bi_wall, EQ.extents.jing, EQ.extents.zi], [26.25, 17, 9, 33, 2], '교감기 반영 값(斗26¼·危17·壁9·井33·觜2)');
eq(['east', 'north', 'west', 'south'].map(g => MD.MANSIONS.filter(m => m.group === g).reduce((s, m) => s + EQ.extents[m.id], 0)), [75, 98.25, 80, 112], '방위별 합(원문 東75·北98¼·西80·南112)');
ok(!MS.isBaseStandard(P('hhs-sifen-ecliptic')) && MS.validateProfile(P('hhs-sifen-ecliptic')).ok, '황도도는 검증되지만 기본 기준(적도) 아님');
['jinshu-jingchu', 'hanshu-santong', 'huainanzi-tianwen'].forEach(id => ok(!MS.validateProfile(P(id)).ok, id + ' 은 계산에 쓰면 안 됨'));
ok(MS.validateProfile(P('huainanzi-tianwen')).errors.some(e => /합/.test(e)), '회남자 합 불일치 감지');
ok(MS.validateProfile(P('hanshu-santong')).errors.some(e => /끝수/.test(e)), '한서 ¼ 위치 없음 감지');
ok(MD.DEGREE_PROFILES.every(p => p.sourceUrl && p.quote && p.edition && p.work), '모든 프로필에 출전·인용·판본');
// 차단 규칙
const T = Object.assign({}, EQ, { id: 'test' });
ok(!MS.validateProfile(Object.assign({}, T, { sourceUrl: '' })).ok, '출전 없으면 거부');
ok(!MS.validateProfile(Object.assign({}, T, { quote: null })).ok, '원문 인용 없으면 거부');
ok(!MS.validateProfile(Object.assign({}, T, { status: 'unconfirmed' })).ok, '미검증 거부');
ok(!MS.validateProfile(Object.assign({}, T, { referencePoint: null })).ok, '기준점 없으면 거부');
const eqExt = {}; MD.MANSIONS.forEach(m => eqExt[m.id] = 365.25 / 28);
ok(MS.validateProfile(Object.assign({}, T, { extents: eqExt })).errors.some(e => /균등/.test(e)), '균등 분할 거부');
ok(!MS.validateProfile(Object.assign({}, T, { extents: Object.assign({}, EQ.extents, { jing: 30 }) })).ok, '井30 일괄 적용 시 합 불일치로 거부');
ok(!MS.validateProfile(Object.assign({}, T, { fractionAt: 'ji' })).ok, '¼ 위치가 원문과 다르면 거부');
let threw = false; try { MS.layout(P('huainanzi-tianwen')); } catch (e) { threw = true; } ok(threw, '미확정 프로필로 layout 계산 차단');
// 경계·순환(古度)
eq([0, 11.99, 12, 20.99, 21, 365.24, 365.25, -0.01, 730.5].map(d => MS.mansionAtDegree(EQ, d).id), ['jiao', 'jiao', 'kang', 'kang', 'di', 'zhen', 'jiao', 'zhen', 'jiao'], '도수 경계·순환');
eq([75, 74.99, 75 + 26.25, 75 + 26.24].map(d => MS.mansionAtDegree(EQ, d).id), ['dou', 'ji', 'niu', 'dou'], '斗 ¼ 경계');
ok(Math.abs(MS.layout(EQ)[27].mansionEnd - 365.25) < 1e-9, '마지막 수 끝 = 주천');
ok(Math.abs(MS.guToRingDeg(EQ, 365.25 / 2) - 180) < 1e-9 && MS.guToRingDeg(EQ, 365.25) === 0, '그림용 비례 환산(古度→360 눈금) 별도');
ok(Math.abs(MS.ringLayout(EQ).reduce((s, l) => s + l.ringSpan, 0) - 360) < 1e-9, '원형도 합 360');
// 나경 대응: 출전 없는 표 거부, 유파별 분리
ok(!MS.azimuthToMansions(90).ok, '대응표 없으면 방위 판정 안 함');
const tbl = {}; B.MT24.forEach((h, i) => tbl[h] = [MD.MANSIONS[i % 28].hanja]);
const L1 = { id: 'test-a', school: '시험 유파 A', title: '시험(실제 자료 아님)', edition: '테스트', sourceUrl: 'test://a', quote: 'test', status: 'verified', table: tbl };
ok(MS.validateLuopan(L1).ok, '시험 대응표 형식 통과: ' + MS.validateLuopan(L1).errors.join(','));
ok(!MS.validateLuopan(Object.assign({}, L1, { sourceUrl: '' })).ok && !MS.validateLuopan(Object.assign({}, L1, { status: 'draft' })).ok, '출전·검증 없는 대응표 거부');
const t23 = Object.assign({}, tbl); delete t23['壬']; ok(!MS.validateLuopan(Object.assign({}, L1, { table: t23 })).ok, '24산 일부만 있는 표 거부');
MD.LUOPAN_PROFILES.push(L1, Object.assign({}, L1, { id: 'test-b', school: '시험 유파 B', table: Object.assign({}, tbl, { '子': ['虛', '危'] }) }));
const an2 = MS.analyze({ bearing: B.record({ azimuth: 2 }) });
ok(an2.status === 'determined' && an2.results.length === 2 && an2.results[0].school !== an2.results[1].school && an2.results[1].mansions.length === 2, '유파별 결과 분리(합치지 않음)');
MD.LUOPAN_PROFILES.length = 0;
// 24산 공통 계산 = 현공 엔진과 같은 경계
for (let d = -720; d <= 720; d += 0.25) if (B.mountain24(d).hanja !== F.mountainAt(d).mt.hj) { fails.push('24산 불일치 ' + d); break; }
// 지금 상태
const an = MS.analyze({ bearing: B.record({ azimuth: 187 }) });
ok(an.status === 'unconfirmed' && an.results.length === 0 && an.ring && an.ring.length === 28 && an.mountain.hanja === '午', '도수 원형도 있음·방위 판정 없음');
ok(!an.links.available && /독립/.test(an.links.text), '24산 연계 없음 → 독립 표시');
ok(an.limits.some(t => /현공비성 결과를 바꾸거나/.test(t)) && an.limits.some(t => /방위각과 같은 값이 아닙/.test(t)), '현공 불간섭·좌표 구분 안내');

// ── 4. 통합: 입력을 바꾸지 않는다
const it = SI.integrate({ xuankong: xk, mansions: an, bearing: B.record({ azimuth: 187 }) });
ok(JSON.stringify(xk) === xkJson, '통합 해석이 현공 결과를 바꿈');
ok(it.xuankong && it.mansions && it.common.length && it.differ.length && it.undetermined.length && it.personal === null, '통합 해석 구성');
ok(/판정하지 않음/.test(it.mansions.result) && it.common.some(t => /午/.test(t)), '28수 방위 판정 없음·공통 24산 표시');
const BAN = /보장|반드시|집값이 오|사업이 성공|건강해집니다/;
ok(![JSON.stringify(it), JSON.stringify(an), JSON.stringify(MD.MANSIONS), JSON.stringify(Object.values(DD.OMEN_PROFILES[0].entries).map(e => e.plain))].some(t => BAN.test(t.replace(/보장하지 않/g, ''))), '보장·단정 표현 금지');

// ── 5. 날짜별 28수(별도 모듈)
const d1 = X.day(jdn(2026, 11, 21)), d2 = X.day(jdn(2000, 1, 1)), d3 = X.day(jdn(2026, 11, 22));
eq([d1.mansion.hanja, d2.mansion.hanja, d3.mansion.hanja], ['女', '胃', '虛'], '값일수 기준일·교차 확인일');
ok(X.checkAssign(X.assignProfile()).ok, '기준일이 원전 伏斷 조합 11개·칠요와 맞음');
ok(X.branchOfJdn(jdn(2026, 11, 22)) === 0 && X.branchOfJdn(jdn(2000, 1, 1)) === 6, '일지 계산(2026-11-22 子, 2000-01-01 午)');
for (let j = jdn(1990, 1, 1); j < jdn(2040, 1, 1); j += 37) { const r = X.mansionOf(j); if (!X.weekdayOk(j, r.mansion)) { fails.push('요일·칠요 불일치 ' + j); break; } }
ok(X.mansionOf(jdn(2026, 11, 21) + 28).mansion.id === 'nu', '28일 주기');
const badAnchor = Object.assign({}, X.assignProfile(), { anchor: { ymd: 'x', jdn: jdn(2026, 11, 21), mansionId: 'xu' } });
ok(!X.checkAssign(badAnchor).ok, '틀린 기준일은 원전 대조에서 걸림');
DD.ASSIGN_PROFILES[0].status = 'draft'; ok(X.mansionOf(jdn(2026, 11, 21)).status === 'pending', '검증 안 된 배속 → 미확정'); DD.ASSIGN_PROFILES[0].status = 'verified';
// 길흉: 원문·해설 분리, 판본 미확인 → 판정 미확정
const E = DD.OMEN_PROFILES[0];
eq(Object.keys(E.entries).length, 28, '28수 원문 모두');
ok(Object.values(E.entries).every(e => e.original.length === 2 && e.original.every(l => /[一-鿿]/.test(l)) && e.plain && !/[一-鿿]{4}/.test(e.plain.replace(/\(.*?\)/g, ''))), '원문(한문)과 해설(한국어) 분리');
ok(Object.values(E.entries).every(e => Object.values(e.readings).every(r => e.original.join('').includes(r.evidence) && ['길', '흉'].includes(r.verdict))), '행사 근거 구절이 모두 원문 안에 있음');
ok(d1.omens.status === 'edition-unconfirmed' && d1.omens.events.every(e => e.verdict === null), '판본 미확인 → 모든 행사 판정 미확정');
eq(d1.omens.events.filter(e => ['move', 'open', 'contract'].includes(e.id)).map(e => e.text), ['미확정 — 원문에 이 행사 언급 없음', '미확정 — 원문에 이 행사 언급 없음', '미확정 — 원문에 이 행사 언급 없음'], '이사·개업·계약은 원문 언급 없음');
ok(d1.omens.events.find(e => e.id === 'build').reference === '흉' && /원문 참고/.test(d1.omens.events.find(e => e.id === 'build').text), '女수 건축: 원문 참고 흉(판정은 미확정)');
E.status = 'verified'; ok(X.omens('jiao').events.find(e => e.id === 'wedding').verdict === '길' && X.omens('jiao').events.find(e => e.id === 'funeral').verdict === '흉', '검증 프로필이면 원문 읽기대로 판정'); E.status = 'edition-unconfirmed';
// 密日: 房虛星昴만, 28일에 4번, 판정 없음, 원본 면 출전
{ const MP = DD.MIRI_PROFILES[0]; let n = 0, ids = [];
  for (let j = DD.ASSIGN_PROFILES[0].anchor.jdn; j < DD.ASSIGN_PROFILES[0].anchor.jdn + 28; j++) { const d = X.day(j); if (d.miri.is) { n++; ids.push(d.mansion.id); } ok(d.miri.verdict === null, '密日 판정 없음'); }
  ok(n === 4 && ['fang', 'xu', 'xing', 'mao'].every(i => ids.includes(i)), '密日 = 房·虛·星·昴, 28일에 4번');
  ok(MP.sources.length === 2 && /葉40b/.test(MP.sources[0].title) && MP.uses.every(u => !('verdict' in u)), '密日 출전·원문만'); }
// 12궁 묶음: 28수 전부 한 번씩, 4정 가운데 수, 방위각→궁, 24산 일대일 아님
{ const P = MD.PALACE12, ids = P.rows.flatMap(r => r.mansions);
  ok(ids.length === 28 && new Set(ids).size === 28 && MD.MANSIONS.every(m => ids.includes(m.id)), '12궁 묶음에 28수가 한 번씩');
  ok(['子', '卯', '午', '酉'].every(b => P.rows.find(r => r.branch === b).mansions.length === 3) && P.anchors['子'] === 'xu' && P.anchors['卯'] === 'fang' && P.anchors['午'] === 'xing' && P.anchors['酉'] === 'mao', '子午卯酉 세 수씩, 가운데 虛·房·星·昴');
  ok(P.sources.length === 2 && P.sources.every(s => s.url && s.quote), '12궁 묶음 출전 2종');
  const p = MS.palace12; ok(p(0).palace.branch === '子' && p(90).palace.branch === '卯' && p(180).palace.branch === '午' && p(270).palace.branch === '酉' && p(200).palace.branch === '未' && p(359.9).palace.branch === '子', '방위각→12지 궁');
  ok(p(15).edge === true && p(14).neighbor.branch === '丑' && p(45).edge === true && p(30).edge === false && p(60).edge === false, '궁 경계 표시(癸·艮 같은 사이 산은 경계)');
  const a1 = MS.analyze({ bearing: { azimuth: 180 } }); ok(a1.palace.palace.branch === '午' && a1.palaceSitting.palace.branch === '子' && a1.status !== 'determined', '향 午궁·좌 子궁, 방위 판정(일대일)은 여전히 안 함'); }
// 옥갑기 두 판본: 道藏본(판본 확인) 28수 원문·근거 구절, 판정은 둘 다 미확정, 머리줄 길흉 13수만 일치
{ const P = DD.OMEN_PROFILES, Z = P.find(p => p.id === 'yuxiaji-daozang'), W = P.find(p => p.id === 'yuxiaji-wikisource');
  ok(Z && Z.status === 'edition-verified' && MD.MANSIONS.every(m => Z.entries[m.id] && Z.entries[m.id].original.length === 2), '道藏본 28수 모두 원문');
  ok(MD.MANSIONS.every(m => { const e = Z.entries[m.id], t = e.original.join(''); return Object.values(e.readings).every(r => t.includes(r.evidence)) && e.original.every(l => l.split(/[，；。]/).filter(Boolean).length === 4); }), '道藏본 근거 구절은 원문 그대로, 수마다 8구');
  ok(MD.MANSIONS.filter(m => Z.entries[m.id].headVerdict === W.entries[m.id].headVerdict).length === 13, '두 판본 머리줄 길흉 13수 일치(15수 반대)');
  const dd = X.day(DD.ASSIGN_PROFILES[0].anchor.jdn);
  ok(dd.omensAll.length === 2 && dd.omensAll.every(o => o.events.every(e => e.verdict === null)), '두 판본 모두 판정 없음(미확정)');
  const zo = dd.omensAll.find(o => o.profile.id === 'yuxiaji-daozang');
  ok(zo.events.find(e => e.id === 'move').reference === '흉' && /판본 선택 전/.test(zo.events.find(e => e.id === 'move').text) && zo.events.find(e => e.id === 'contract').reference === null, '道藏본 女수 이사: 원문 참고 흉, 계약은 언급 없음'); }
// 伏斷日: 승인 프로필, 12쌍(卯女 포함), 84일에 12번, 판정은 '이 날이 伏斷인가'만
{ const FP = DD.FUDUAN_PROFILES[0], AP = DD.ASSIGN_PROFILES[0];
  ok(FP.status === 'approved' && Object.keys(FP.pairs).length === 12 && FP.pairs['卯'] === 'nu' && AP.fuduan['卯'] === 'nu' && AP.approval.status === 'approved', '伏斷·배속 승인 기록, 卯女 포함 12쌍');
  ok(JSON.stringify(FP.pairs) === JSON.stringify(AP.fuduan), '伏斷 판정 짝 = 배속 점검 짝');
  ok(X.checkAssign(AP).ok, '12쌍으로도 기준일 점검 통과');
  let n = 0; const seen = {};
  for (let j = AP.anchor.jdn; j < AP.anchor.jdn + 84; j++) { const d = X.day(j); if (d.fuduan.status === 'ok' && d.fuduan.is) { n++; seen[d.fuduan.branch] = d.mansion.id; } }
  ok(n === 12 && Object.keys(seen).every(b => FP.pairs[b] === seen[b]) && Object.keys(seen).length === 12, '84일 주기에 伏斷일 12번, 짝마다 한 번');
  const d0 = X.day(AP.anchor.jdn); ok(d0.fuduan.branch === '亥' && d0.mansion.id === 'nu' && d0.fuduan.is === false, '기준일 2026-11-21(亥日·女)은 伏斷 아님');
  ok(FP.uses.every(u => !('verdict' in u)) && d0.fuduan.profile.uses.length === 3, '행사별 쓰임은 원문만, 판정 없음');
  const keep = FP.status; FP.status = 'text_verified'; ok(X.day(AP.anchor.jdn).fuduan.is === null, '승인 전이면 伏斷 판정 안 함'); FP.status = keep; }
ok(!/dayMansion|DAY_CYCLE|EVENT_RULES/.test(fs.readFileSync(path.join(root, 'mansions-engine.js'), 'utf8')), '천문방위 엔진과 날짜 모듈 분리');

// ── 6. 화면 연결
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = ['fengshui-engine.js', 'bearing.js', 'mansions-data.js', 'mansions-engine.js', 'space-integrate.js', 'mansions-day-data.js', 'mansions-day.js'].map(f => html.indexOf('<script src="' + f + '"></script>'));
ok(order.every(i => i > 0) && order.every((v, i) => !i || v > order[i - 1]), '스크립트 순서');
ok(/body \+= spMansionSection\(kind, i, an\);/.test(html) && /28수 천문방위 분석/.test(html) && /통합 공간 해석/.test(html), '28수·통합 카드 연결');
ok(html.indexOf('body += an ? spResult(kind, i, an)') < html.indexOf('body += spMansionSection(kind, i, an)'), 'B(현공) 다음 C·D 순서');
ok(/\$\{tkMansionCard\(list\)\}/.test(html) && /tkMansionCell\(r\.jdn\)/.test(html), '택일 28수 연결');
ok(/\$\{spMansionPalace\(ms\)\}/.test(html) && /<h3>12궁 묶음\(원전이 인정하는 범위\)<\/h3>/.test(html), '28수 카드 12궁 묶음 연결');
ok(/<h3>밀일\(密日\)<\/h3>/.test(html) && /mi = ok \? r0\.miri/.test(html), '택일 화면 밀일 칸');
ok(/<h3>옥갑기 두 판본 나란히<\/h3>/.test(html) && /r0\.omensAll/.test(html) && /\.ms-two\{/.test(html), '택일 화면 옥갑기 두 판본 나란히');
ok(/<h3>복단일\(伏斷日\)<\/h3>/.test(html) && /r\.fuduan && r\.fuduan\.is \? ' <span class="chip warn">복단일<\/span>'/.test(html) && /\.chip\.warn \{/.test(html), '택일 화면 복단일 표시(카드·표·칩)');
ok(/return F\.analyze\(\{ ch: S\.ch, facingDeg: \+c\.facing,/.test(html), '현공 호출(spRun)은 기존 그대로');
ok(!/Mansion|28수|宿/.test(fs.readFileSync(path.join(root, 'engine.js'), 'utf8')), '택일 점수(engine.js pickDays)에 28수를 더하지 않음');
ok((html.match(/\$\{MS_SRC_WARN\}/g) || []).length === 2 && /다른 판본과의 교차 확인과, 옥갑기 후대 노래\(위키문헌본\)의 판본 확인은 아직 끝나지 않았습니다/.test(html), '28수·택일 카드에 출처 경고(교차 확인·옥갑기 판본 미완) 표시');
ok(/중화서국본 교감 반영/.test(MD.DEGREE_PROFILES[0].title) && /사고전서 원본 면/.test(MD.DEGREE_PROFILES[0].notes[0]) && MD.DEGREE_PROFILES[0].extents.wei_roof === 17 && MD.DEGREE_PROFILES[0].extents.bi_wall === 9, '기본 도수 프로필: 교감값(危17·壁9) 유지, 근거는 중화서국본 교감으로 표시');
ok(net === 0, '네트워크 호출 없음');

if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log(' - ' + f)); process.exit(1); }
console.log('OK mansions: 방위 정규화·편각·현공 기준선·도수 프로필·나경 대응 차단·경계 순환·통합·날짜 28수·원문 길흉·화면 연결');
