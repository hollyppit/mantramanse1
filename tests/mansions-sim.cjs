// 공통 방위·28수 엔진·통합 해석·택일 값일수 검증 (2026-11-21)
//   node tests/mansions-sim.cjs
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..');
let net = 0; globalThis.fetch = () => { net++; throw new Error('network'); };
for (const f of ['fengshui-data.js', 'fengshui-engine.js', 'bearing.js', 'mansions-data.js', 'mansions-engine.js', 'space-integrate.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const F = globalThis.MantraFengshui, B = globalThis.MantraBearing, MD = globalThis.MantraMansionsData, MS = globalThis.MantraMansions, SI = globalThis.MantraSpaceIntegrate;
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
eq(MD.DEGREE_SYSTEMS.length + MD.LINK_SYSTEMS.length, 0, '승인된 도수·연계 체계 없음(미확정)');

// 출전 없는 데이터 / 균등 분할 / 미승인 → 계산 차단
const ext = {}; const H = [12, 9, 15, 5, 5, 18, 11.25, 26, 8, 12, 10, 17, 16, 9, 16, 12, 14, 11, 16, 2, 9, 33, 4, 15, 7, 18, 18, 17]; MD.MANSIONS.forEach((m, i) => ext[m.id] = H[i]);
const sysT = { id: 'test-only', sourceVersion: 'TEST-FIXTURE', title: '시험용 체계(실제 자료 아님)', tradition: '시험', source: '테스트 고정값 — 화면에 쓰지 않음', coordinateSystem: 'equatorial', circumference: 365.25, referencePoint: '각수 시작', unit: '古度', extents: ext, conversionRule: { offsetDeg: 0, direction: 'cw', source: '시험 규칙' }, approved: true };
ok(MS.validateSystem(sysT).ok, '시험 체계 검증 통과: ' + MS.validateSystem(sysT).errors.join(','));
ok(!MS.validateSystem(Object.assign({}, sysT, { source: '' })).ok, '출전 없으면 거부');
ok(!MS.validateSystem(Object.assign({}, sysT, { approved: false })).ok, '미승인 거부');
ok(!MS.validateSystem(Object.assign({}, sysT, { referencePoint: null })).ok, '기준점 없으면 거부');
const eqExt = {}; MD.MANSIONS.forEach(m => eqExt[m.id] = 360 / 28);
ok(MS.validateSystem(Object.assign({}, sysT, { extents: eqExt, circumference: 360 })).errors.some(e => /균등/.test(e)), '360/28 균등 분할 거부');
ok(!MS.validateSystem(Object.assign({}, sysT, { extents: Object.assign({}, ext, { jing: 30 }) })).ok, '도수 합이 한 바퀴와 다르면 거부');
let threw = false; try { MS.layout(Object.assign({}, sysT, { source: null })); } catch (e) { threw = true; } ok(threw, '출전 없는 체계로 layout 계산 차단');
// 경계·순환
eq([0, 11.99, 12, 20.99, 21, 365.24, 365.25, -0.01, 730.5].map(d => MS.mansionAtDegree(sysT, d).id), ['jiao', 'jiao', 'kang', 'kang', 'di', 'zhen', 'jiao', 'zhen', 'jiao'], '도수 경계·순환');
ok(MS.layout(sysT)[27].mansionEnd === 365.25, '마지막 수 끝 = 한 바퀴');
ok(!MS.azimuthToMansion(Object.assign({}, sysT, { conversionRule: null }), 90).ok, '변환 규칙 없으면 방위 판정 안 함(천문 좌표 ≠ 방위각)');
// 체계별 구분: 두 체계를 넣으면 결과가 체계별로 따로 나온다
const sysT2 = Object.assign({}, sysT, { id: 'test-2', sourceVersion: 'TEST-2', conversionRule: { offsetDeg: 180, direction: 'cw', source: '시험 규칙2' } });
MD.DEGREE_SYSTEMS.push(sysT, sysT2);
const an2 = MS.analyze({ bearing: B.record({ azimuth: 10 }) });
ok(an2.status === 'determined' && an2.results.length === 2 && an2.results[0].sourceVersion !== an2.results[1].sourceVersion, '체계별 결과 분리');
MD.DEGREE_SYSTEMS.length = 0;
// 지금 상태: 미확정 안내
const an = MS.analyze({ bearing: B.record({ azimuth: 187 }) });
ok(an.status === 'unconfirmed' && an.results.length === 0 && an.undetermined.some(t => /데이터 미확정/.test(t)), '승인 체계 없으면 미확정·판정 안 함');
ok(!an.links.available && /따로/.test(an.links.text), '24산 연계 없음 → 따로 표시');
ok(an.limits.some(t => /현공비성 결과를 바꾸거나/.test(t)), '현공 불간섭 안내');

// ── 4. 통합: 입력을 바꾸지 않는다
const it = SI.integrate({ xuankong: xk, mansions: an, bearing: B.record({ azimuth: 187 }) });
ok(JSON.stringify(xk) === xkJson, '통합 해석이 현공 결과를 바꿈');
ok(it.xuankong && it.mansions && it.common.length && it.differ.length && it.undetermined.length && it.personal === null, '통합 해석 구성');
ok(/미확정/.test(it.mansions.result), '28수 미확정 표시');
const BAN = /보장|반드시|집값이 오|사업이 성공|건강해집니다/;
ok(![JSON.stringify(it), JSON.stringify(an), JSON.stringify(MD.MANSIONS)].some(t => BAN.test(t.replace(/보장하지 않/g, ''))), '보장·단정 표현 금지');

// ── 5. 값일수
const d1 = MS.dayMansion(jdn(2026, 11, 21)), d2 = MS.dayMansion(jdn(2000, 1, 1)), d3 = MS.dayMansion(jdn(2026, 11, 22));
eq([d1.mansion.hanja, d2.mansion.hanja, d3.mansion.hanja], ['女', '胃', '虛'], '값일수 기준일·교차 확인일');
for (let j = jdn(1990, 1, 1); j < jdn(2040, 1, 1); j += 37) { const r = MS.dayMansion(j); if (!MS.weekdayConsistent(j, r.mansion)) { fails.push('요일·칠요 불일치 ' + j); break; } }
ok(MS.dayMansion(jdn(2026, 11, 21) + 28).mansion.id === 'nu', '28일 주기');
ok(d1.events.length === 6 && d1.events.every(e => e.text === '판단 보류' && e.verdict === null), '행사별 길흉은 판단 보류');
ok(MS.dayMansion(1, { anchor: null, verified: false }).status === 'pending', '기준일 없으면 보류');
ok(MS.dayMansion(1, { anchor: { jdn: 1, mansionId: 'nu' }, verified: true, source: '' }).status === 'pending', '출전 없는 기준일이면 보류');

// ── 6. 화면 연결
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = ['fengshui-engine.js', 'bearing.js', 'mansions-data.js', 'mansions-engine.js', 'space-integrate.js'].map(f => html.indexOf('<script src="' + f + '"></script>'));
ok(order.every(i => i > 0) && order.every((v, i) => !i || v > order[i - 1]), '스크립트 순서');
ok(/body \+= spMansionSection\(kind, i, an\);/.test(html) && /28수 천문방위 분석/.test(html) && /통합 공간 해석/.test(html), '28수·통합 카드 연결');
ok(html.indexOf('body += an ? spResult(kind, i, an)') < html.indexOf('body += spMansionSection(kind, i, an)'), 'B(현공) 다음 C·D 순서');
ok(/\$\{tkMansionCard\(list\)\}/.test(html) && /tkMansionCell\(r\.jdn\)/.test(html), '택일 28수 연결');
ok(/return F\.analyze\(\{ ch: S\.ch, facingDeg: \+c\.facing,/.test(html), '현공 호출(spRun)은 기존 그대로');
ok(!/Mansion|28수|宿/.test(fs.readFileSync(path.join(root, 'engine.js'), 'utf8')), '택일 점수(engine.js pickDays)에 28수를 더하지 않음');
ok(net === 0, '네트워크 호출 없음');

if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log(' - ' + f)); process.exit(1); }
console.log('OK mansions: 방위 정규화·편각·현공 기준선·28수 데이터·도수 검증 차단·경계 순환·통합·값일수·화면 연결');
