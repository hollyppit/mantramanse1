// 역법 엔진(절기·음력·시간대·균시차·일주·시주·삼재) 검증
//   node tests/calendar-sim.js [index.html 경로]
// 외부 기준: 태양 시황경 계산(절기), Node 내장 Asia/Seoul 시간대(서머타임), 알려진 설날·일진, 연속성/왕복 검사
const fs = require('fs'), vm = require('vm');
const file = process.argv[2] || require('path').join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const a = html.indexOf('var MANSE_DATA'), b = html.indexOf('})(typeof window', a);
const ctx = vm.createContext({ console }); vm.runInContext(html.slice(a, html.indexOf('\n', b)), ctx);
const M = ctx.Manse; let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('  ✗ ' + m); } };
const rad = Math.PI / 180;

console.log('1. 24절기 vs 태양 시황경 (허용 오차 20분 — 기준식 정밀도)');
{
  const lon = jd => { const T = (jd - 2451545) / 36525, L0 = 280.46646 + 36000.76983 * T, Mm = 357.52911 + 35999.05029 * T,
    C = (1.914602 - 0.004817 * T) * Math.sin(Mm * rad) + (0.019993 - 0.000101 * T) * Math.sin(2 * Mm * rad) + 0.000289 * Math.sin(3 * Mm * rad);
    return (((L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * rad)) % 360) + 360) % 360; };
  let worst = 0, n = 0;
  for (let y = M.MIN_Y; y <= M.MAX_Y; y++) (M.termsOf(y) || []).forEach((t, i) => {
    const tgt = (285 + 15 * i) % 360; let lo = t - 3 * 864e5, hi = t + 3 * 864e5;
    const f = ms => { let d = lon(ms / 864e5 + 2440587.5) - tgt; return d > 180 ? d - 360 : d < -180 ? d + 360 : d; };
    for (let k = 0; k < 45; k++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
    worst = Math.max(worst, Math.abs(t - (lo + hi) / 2) / 6e4); n++;
  });
  console.log(`   ${n}개 · 최대 차이 ${worst.toFixed(1)}분`); ok(worst < 20, '절기 시각 오차가 큼');
}
console.log('2. 음력 표: 연속성·왕복·알려진 설날');
{
  let prev = null, bad = 0;
  for (let ms = Date.UTC(1900, 1, 1); ms < Date.UTC(2099, 11, 1); ms += 864e5) {
    const t = new Date(ms), l = M.solarToLunar(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    if (!l) { bad++; continue; }
    if (prev && !((l.y === prev.y && l.m === prev.m && l.leap === prev.leap && l.d === prev.d + 1) || (l.d === 1 && prev.d >= 29))) bad++;
    prev = l;
    if (ms % (864e5 * 3) === 0) { const [y, m, d] = M.lunarToSolar(l.y, l.m, l.d, l.leap); if (y !== t.getUTCFullYear() || m !== t.getUTCMonth() + 1 || d !== t.getUTCDate()) bad++; }
  }
  ok(bad === 0, `끊김·왕복 불일치 ${bad}건`);
  const NY = { 1984: [2, 2], 2000: [2, 5], 2020: [1, 25], 2023: [1, 22], 2024: [2, 10], 2025: [1, 29], 2026: [2, 17], 2033: [1, 31] };
  for (const y in NY) { const r = M.lunarToSolar(+y, 1, 1, false); ok(r[1] === NY[y][0] && r[2] === NY[y][1], `${y} 설날 ${r.join('-')}`); }
  // 한국 음력(KST) 기준: 2023-05-20이 음력 4월 1일, 2012·2017·1987은 한국 기준 윤3·5·6월
  const l = M.solarToLunar(2023, 5, 20); ok(l.m === 4 && l.d === 1, '2023-05-20은 음력 4월 1일');
  ok(M.lunarLeapMonth(2012) === 3 && M.lunarLeapMonth(2017) === 5 && M.lunarLeapMonth(1987) === 6, '윤달 위치(한국 기준)');
  console.log('   1900~2099 연속·왕복 검사 완료');
}
console.log('3. 시간대 표 vs Asia/Seoul (1908~1988 전환 시각)');
{
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', timeZoneName: 'longOffset' });
  const off = ms => { const s = fmt.formatToParts(new Date(ms)).find(p => p.type === 'timeZoneName').value, m = s.match(/GMT([+-])(\d+):?(\d+)?/); return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + (+m[3] || 0)) : 0; };
  let bad = 0;
  for (let ms = Date.UTC(1909, 0, 1); ms < Date.UTC(1990, 0, 1); ms += 15 * 6e4) if (Math.abs(M.tzOffset(ms) - off(ms)) > 0.5) bad++;
  ok(bad === 0, `15분 표본 ${bad}개가 ICU와 다름`);
}
console.log('4. 균시차: 연중 최대·최소와 부호');
{
  // 균시차는 11월 초 약 +16분, 2월 중순 약 −14분
  const wall = (m, d) => M.compute({ year: 2023, month: m, day: d, hour: 12, minute: 0, gender: 'M', timeMode: 'ast', lon: 135 });
  const diff = (m, d) => { const c = wall(m, d); return (c.localSolarMs - (c.utc + 135 * 4 * 6e4)) / 6e4; };
  const nov = diff(11, 3), feb = diff(2, 11);
  console.log(`   11/3 ${nov.toFixed(1)}분 · 2/11 ${feb.toFixed(1)}분`);
  ok(nov > 15 && nov < 17.5, '11월 초 균시차'); ok(feb < -13 && feb > -15.5, '2월 중순 균시차');
}
console.log('5. 일주·월주·시주·자시 처리');
{
  const c = (y, m, d, h, mi, o = {}) => { const r = M.compute({ year: y, month: m, day: d, hour: h, minute: mi, gender: 'M', calendar: 'solar', timeMode: 'wall', ...o }); return ['year', 'month', 'day', 'hour'].map(k => M.gzName(r.pillars[k])).join(' '); };
  ok(c(2000, 1, 1, 12, 0).split(' ')[2] === '戊午', '2000-01-01 일주 戊午');
  ok(c(2024, 1, 1, 12, 0).split(' ')[2] === '甲子', '2024-01-01 일주 甲子');
  ok(c(2024, 2, 4, 16, 0).startsWith('癸卯 乙丑'), '입춘(17:27) 직전 癸卯年 乙丑月');
  ok(c(2024, 2, 4, 18, 0).startsWith('甲辰 丙寅'), '입춘 직후 甲辰年 丙寅月');
  const j = c(1999, 12, 31, 23, 30, { jasi: 'jeong' }).split(' '), y = c(1999, 12, 31, 23, 30, { jasi: 'ya' }).split(' ');
  ok(j[3] === y[3], '정자시·야자시는 시주가 같아야 함'); ok(j[2] === '戊午' && y[2] === '丁巳', '정자시는 다음 날, 야자시는 당일 일주');
}
console.log('6. 삼재·월령 사령');
{
  const sj = y => M.getSamjae(0, y).stage;   // 子띠(申子辰): 寅·卯·辰년 = 2022·2023·2024
  ok(sj(2022) === '들삼재' && sj(2023) === '눌삼재' && sj(2024) === '날삼재' && sj(2025) === null && sj(2021) === null, '申子辰띠 삼재 년도');
  const s = M.compute({ year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'M', calendar: 'solar' }).saryeong;
  ok(s.label === '여기' && M.STEM[s.stem] === '甲', '1990-03-15는 경칩 후 10일째 卯월 여기(甲)');
}
console.log(fail ? `\n실패 ${fail}건` : '\n모든 검증 통과'); process.exit(fail ? 1 : 0);
