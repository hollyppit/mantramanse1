// 경계 조건 검증: 입춘·절기 전후, 연말연초, 윤년, 대운 교체일, 출생시간 미상, 경도·시간 기준, 서머타임, 해석 모듈의 기간 귀속
//   node tests/luck-boundary-sim.cjs
// 기준 데이터(엔진과 독립): 입춘 한국 표준시 — 2023-02-04 11:42, 2024-02-04 17:27, 2025-02-03 23:10, 2026-02-04 05:02(천문연구원·홍콩천문대 발표값을 KST로 환산)
//   일진 — 2024-01-01 甲子일, 2000-01-01 戊午일 (널리 쓰이는 만세력 기준)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a = eng.indexOf('var MANSE_DATA'), b = eng.indexOf('})(typeof window', a);
vm.runInThisContext(eng.slice(a, eng.indexOf('\n', b)));
const M = globalThis.Manse, LI = require(path.join(root, 'luck-interpret.js'));
const fails = []; const ok = (c, m) => { if (!c && fails.length < 40) fails.push(m); };
const base = { calendar: 'solar', leap: false, gender: 'M', timeMode: 'std', lon: 135, jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };
const mk = (y, m, d, h, mi, o) => M.compute({ ...base, year: y, month: m, day: d, hour: h, minute: mi, ...o });
const nm = p => M.gzName(p);
const kst = (y, m, d, h, mi) => Date.UTC(y, m - 1, d, h - 9, mi);

// 1. 입춘 전후 — 연주·월주가 입춘 시각을 경계로 바뀐다 (±10분)
const LC = [[2023, 2, 4, 11, 42, '壬寅', '癸卯', '癸丑', '甲寅'], [2024, 2, 4, 17, 27, '癸卯', '甲辰', '乙丑', '丙寅'], [2025, 2, 3, 23, 10, '甲辰', '乙巳', '丁丑', '戊寅'], [2026, 2, 4, 5, 2, '乙巳', '丙午', '己丑', '庚寅']];
LC.forEach(([y, m, d, h, mi, yB, yA, mB, mA]) => {
  const t = new Date(Date.UTC(y, m - 1, d, h - 9, mi)), sh = n => { const x = new Date(t.getTime() + n * 6e4 + 9 * 36e5); return [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes()]; };
  const before = mk(...sh(-10)), after = mk(...sh(10));
  ok(nm(before.pillars.year) === yB && nm(after.pillars.year) === yA, `입춘 ${y} 연주 ${nm(before.pillars.year)}→${nm(after.pillars.year)} (기대 ${yB}→${yA})`);
  ok(nm(before.pillars.month) === mB && nm(after.pillars.month) === mA, `입춘 ${y} 월주 ${nm(before.pillars.month)}→${nm(after.pillars.month)} (기대 ${mB}→${mA})`);
  // 엔진의 입춘 시각 자체도 기준과 5분 안
  ok(Math.abs(M.termsOf(y)[2] - t.getTime()) < 5 * 6e4, `입춘 ${y} 시각 ${new Date(M.termsOf(y)[2] + 9 * 36e5).toISOString()}`);
  ok(M.yearPillarAt(t.getTime() - 6e4).sajuYear === y - 1 && M.yearPillarAt(t.getTime() + 6e4).sajuYear === y, `yearPillarAt 경계 ${y}`);
});

// 2. 일주 기준일과 연속성(윤년 2/29·연말연초 포함)
ok(nm(mk(2024, 1, 1, 12, 0).pillars.day) === '甲子', '2024-01-01 일진'); ok(nm(mk(2000, 1, 1, 12, 0).pillars.day) === '戊午', '2000-01-01 일진');
{
  let prev = null, bad = 0;
  for (let y = 1900; y <= 2100; y++) for (const [m, d] of [[2, 28], [2, 29], [3, 1], [12, 31], [1, 1]]) { if (m === 2 && d === 29 && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) continue; }
  // 하루씩 3만 일 연속
  const start = Date.UTC(1950, 0, 1); let last = null;
  for (let i = 0; i < 365 * 100; i++) { const t = new Date(start + i * 864e5), y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate(); const idx = M.dayPillarOfJdn(M.jdnFromYMD(y, m, d)).i; if (last != null && idx !== (last + 1) % 60) bad++; last = idx; }
  ok(bad === 0, `일진 연속성 위반 ${bad}건`);
  ok(mk(2024, 2, 29, 12, 0).solar.d === 29 && nm(mk(2024, 2, 29, 12, 0).pillars.day) === '癸亥', '2024-02-29(윤년) 일진 ' + nm(mk(2024, 2, 29, 12, 0).pillars.day));
  let thrown = false; try { mk(2023, 2, 29, 12, 0); } catch (e) { thrown = true; } ok(thrown, '평년 2/29를 거부해야 함');
}

// 3. 자시: 정자시/야자시는 일주만 다르고 시주 지지는 같다
{
  const j = mk(2024, 5, 10, 23, 30, { jasi: 'jeong' }), y = mk(2024, 5, 10, 23, 30, { jasi: 'ya' });
  ok(j.pillars.hour.b === 0 && y.pillars.hour.b === 0, '자시 시지'); ok((nm(j.pillars.day) !== nm(y.pillars.day)), '자시 일주 기준 차이 없음');
}

// 4. 절기 전후 월주 — 12절기 모두 직전 1분은 이전 월, 직후는 다음 월
{
  let bad = 0;
  for (let Y = 2019; Y <= 2030; Y++) for (let i = 0; i < 24; i += 2) { const t = M.termsOf(Y)[i]; if (!t) continue; const p0 = M.monthPillarAt(t - 6e4), p1 = M.monthPillarAt(t + 6e4); if ((p0.i === p1.i) || ((p0.i + 1) % 60 !== p1.i)) bad++; }
  ok(bad === 0, `절기 경계 월주 불연속 ${bad}건`);
}

// 5. 월운·세운·대운 귀속
{
  let bad = 0;
  for (let Y = 1960; Y <= 2060; Y++) { const wl = M.wolun(mk(1990, 3, 15, 12, 0), Y); if (wl[0].startMs !== M.termsOf(Y)[2]) bad++; for (let i = 1; i < 12; i++) if (wl[i].startMs <= wl[i - 1].startMs) bad++; if (wl[11].startMs >= M.termsOf(Y + 1)[2]) bad++; if (M.yearPillarAt(wl[11].startMs + 864e5).sajuYear !== Y) bad++; }
  ok(bad === 0, `월운 구간 위반 ${bad}건`);
  const ch = mk(1990, 3, 15, 14, 30, { gender: 'F' }), L = ch.daeun.list;
  for (let k = 0; k < L.length; k++) { const st = L[k].startMs; ok(M.daeunAt(ch, st) === L[k] && (k ? M.daeunAt(ch, st - 1) === L[k - 1] : M.daeunAt(ch, st - 1) === null), `대운 교체일 귀속 ${k}`); }
  ok(L[1].startMs - L[0].startMs > 3640 * 864e5 && L[1].startMs - L[0].startMs < 3660 * 864e5, '대운 간격 10년'); ok(ch.daeun.num >= 1 && ch.daeun.num <= 10, '대운수 범위 ' + ch.daeun.num);
  // 순행·역행: 양남음녀 순행
  [['M', 1990, true], ['F', 1990, false], ['M', 1991, false], ['F', 1991, true]].forEach(([g, y, f]) => ok(mk(y, 6, 15, 12, 0, { gender: g }).daeun.forward === f, `대운 순역 ${g}${y}`));
  // 교운 직전·직후의 해석 모듈: 대운이 바뀌는 해의 세운도 정상, 출생 직후(대운 시작 전)는 상위 운 없이 처리
  const first = M.seunRange(ch, ch.solar.y, ch.solar.y)[0]; let r = null, threw = false;
  try { r = LI.build(M, ch, first, 'seun', { daeun: first.daeun }); } catch (e) { threw = true; } ok(!threw && r && r.chain.length === 0 && r.evidence.rules.length > 0, '대운 시작 전 세운 해석');
  for (const k of [1, 2]) { const Y = new Date(L[k].startMs + 9 * 36e5).getUTCFullYear(), s = M.seunRange(ch, Y, Y)[0]; let t2 = false; try { LI.build(M, ch, s, 'seun', { daeun: s.daeun }); } catch (e) { t2 = true; } ok(!t2, '교운 해 세운 해석 ' + Y); }
}

// 6. 연말·연초 일진: 1/1~입춘 전은 전년도 세운에 속하고, 소한 이전 일진은 전월 월운에 속한다
{
  const ch = mk(1990, 3, 15, 14, 30), y25 = M.yearPillarAt(kst(2025, 1, 1, 12, 0)).sajuYear;
  ok(y25 === 2024, '2025-01-01 세운 귀속 ' + y25);
  const wl = M.wolun(ch, 2024), ms = kst(2025, 1, 3, 12, 0); let cur = null; wl.forEach(q => { if (q.startMs <= ms) cur = q; });
  ok(cur === wl[10], '1월 3일은 소한(1/5 무렵) 전이라 子月(11번째) 월운에 속해야 함'); { let c2 = null; const ms2 = kst(2025, 1, 8, 12, 0); wl.forEach(q => { if (q.startMs <= ms2) c2 = q; }); ok(c2 === wl[11], '1월 8일은 丑月(12번째) 월운'); }
  const il = M.ilun(ch, 2025, 1)[0], x = LI.build(M, ch, il, 'ilun', { wolun: wl[10], seun: M.seunRange(ch, 2024, 2024)[0], daeun: M.daeunAt(ch, ms) });
  ok(x.chain.length === 2 && x.chain[1].text.includes(M.gzName(M.seunRange(ch, 2024, 2024)[0])), '연초 일진의 세운 연결');
}

// 7. 출생시간 미상 — 시주 없음, 시주 관련 작용·해석이 없어야 한다
{
  const ch = M.compute({ ...base, year: 1990, month: 3, day: 15, hour: null, minute: null, gender: 'F' });
  ok(ch.pillars.hour == null && ch.hourKnown === false, '시간 미상 시주'); const x = M.seunRange(ch, 2026, 2026)[0], r = LI.build(M, ch, x, 'seun', { daeun: x.daeun });
  ok(!r.evidence.natal.some(s => s.startsWith('시주')) && r.relations.every(q => !q.members.includes('hour')), '시간 미상인데 시주를 설명함');
  ok(r.relations.every(q => M.luckRelations(ch, x).rels.some(e => e.name === q.name)), '시간 미상 합충 불일치');
  const ch2 = M.compute({ ...base, year: 1990, month: 3, day: 15, hour: '', gender: 'F' }); ok(ch2.hourKnown === false, '빈 문자열 시간');
}

// 8. 시간 기준·경도·서머타임·해외
{
  const std = mk(1988, 7, 1, 12, 0, { timeMode: 'std' }), wall = mk(1988, 7, 1, 12, 0, { timeMode: 'wall' });   // 1988 한국 서머타임(5/8~10/9)
  ok(wall.dst === true && std.dst === true && wall.tzOffset === 600, '1988-07-01 서머타임 인식(UTC+10)');
  ok(wall.localSolarMs - std.localSolarMs === 36e5, '표준시 기준은 시계 시각보다 정확히 1시간 이르다');
  ok(mk(1988, 7, 1, 0, 30, { timeMode: 'wall' }).warnings.some(w => /서머타임/.test(w)), '서머타임 경고 없음');
  ok(!mk(1988, 12, 1, 12, 0, { timeMode: 'wall' }).dst, '서머타임 아닌 기간');
  const seoul = mk(2000, 6, 1, 12, 0, { timeMode: 'lmt', lon: 126.98 }), busan = mk(2000, 6, 1, 12, 0, { timeMode: 'lmt', lon: 129.08 });
  ok(Math.abs(busan.localSolarMs - seoul.localSolarMs - (129.08 - 126.98) * 4 * 6e4) < 6e4, '경도 4분/도 보정');
  for (const lon of [-122.42, 0, 139.69, 180, -179.9]) { let th = false; try { M.compute({ ...base, year: 1995, month: 8, day: 20, hour: 9, minute: 5, timeMode: 'lmt', lon, gender: 'F' }); M.compute({ ...base, year: 1995, month: 8, day: 20, hour: 9, minute: 5, timeMode: 'ast', lon, gender: 'F' }); } catch (e) { th = true; } ok(!th, '경도 ' + lon + ' 계산 오류'); }
  for (const [y, lo] of [[1899, 'MIN'], [2200, 'MAX']]) { let th = false; try { mk(y, 1, 1, 0, 0); } catch (e) { th = true; } ok(th, y + '년 범위 밖 거부'); }
}

// 9. 모든 기간 단계에서 경계 날짜를 포함해 해석이 예외 없이 만들어진다 (2026-12 ~ 2027-03, 입춘 전후)
{
  const ch = mk(1985, 11, 30, 5, 10, { gender: 'F' }); let n = 0, th = 0;
  for (const [y, m] of [[2026, 12], [2027, 1], [2027, 2], [2027, 3]]) M.ilun(ch, y, m).forEach((d, i, arr) => { try { const Y = M.yearPillarAt(Date.UTC(y, m - 1, d.date[2], 3)).sajuYear, wl = M.wolun(ch, Y); let wm = null; wl.forEach(q => { if (q.startMs <= Date.UTC(y, m - 1, d.date[2], 3)) wm = q; }); LI.build(M, ch, d, 'ilun', { wolun: wm || M.wolun(ch, Y - 1)[11], seun: M.seunRange(ch, Y, Y)[0], daeun: M.daeunAt(ch, Date.UTC(y, m - 1, d.date[2], 3)), prev: arr[i - 1] }); n++; } catch (e) { th++; } });
  ok(th === 0 && n > 100, `경계 일진 해석 ${n}건 / 예외 ${th}건`);
}

if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log('모든 검증 통과 · 입춘 4개년 · 절기 월주 연속 · 일진 100년 연속 · 대운 교체일 · 시간 미상 · 경도/서머타임');
