// 시대 흐름 3체계 검증: node tests/macro-era3-sim.cjs
//  ① 원회운세(wonhoe.js) — 『황극경세서』 연표 대조: 甲辰 기원전 2357년 = 巳회 제180운 제2156세, 午회 = 기원전 2217년 ~ 서기 8583년, 2024년 = 69041번째 해
//  ② 단위 경계(세 30·운 360·회 10800)와 甲子·甲午 정렬, 오행 필드 없음
//  ③ 삼원구운(macro-era.js) 기존 계산 회귀: 운 번호·연도·구성·괘·오행 / 아홉 운 표(cycle)와 eraAt 일치
//  ④ 오운육기는 tests/woon-gi-sim.cjs 에서 따로 검사
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'fengshui-data.js', 'fengshui-engine.js', 'macro-era.js', 'wonhoe.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const M = ctx.Manse, W = ctx.MantraWonhoe, ME = ctx.MantraMacroEra;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

// ① 문헌 대조(천문 연도: 기원전 n년 = 1 - n)
const yao = W.at(1 - 2357);
ok(yao.hoe.n === 6 && yao.hoe.br === '巳', '甲辰 唐堯는 巳회(6): ' + yao.hoe.br);
ok(yao.un.all === 180 && yao.se.all === 2156, `甲辰 唐堯 제180운·제2156세: ${yao.un.all}·${yao.se.all}`);
ok(W.at(1 - 2577).se.all === 2149 && W.at(1 - 2577).un.all === 180 && W.at(1 - 2578).un.all === 179, '경세지자 2149 = 제180운 첫 세(기원전 2577)');
const wu = W.at(2026);
ok(wu.hoe.br === '午' && wu.hoe.gua === '姤' && wu.hoe.from === 1 - 2217 && wu.hoe.to === 8583, `午회 범위 ${wu.hoe.from}~${wu.hoe.to}`);
ok(W.at(2024).index === 69041, '2024년 = 69041번째 해: ' + W.at(2024).index);
ok(wu.un.n === 12 && wu.un.from === 1744 && wu.un.to === 2103, `2026 제12운 1744~2103: ${wu.un.n} ${wu.un.from}~${wu.un.to}`);
ok(wu.se.n === 10 && wu.se.from === 2014 && wu.se.to === 2043, `2026 제10세 2014~2043: ${wu.se.n} ${wu.se.from}~${wu.se.to}`);
ok(W.at(8584).hoe.br === '未' && W.at(8584).un.n === 1, '8584년 未회 시작');
// ② 경계·간지 정렬
const gzOf = y => M.yearPillarOf(y);
for (let y = -3000; y <= 9000; y += 7) {
  const r = W.at(y); if (!r.supported) { fails.push('지원 범위 ' + y); continue; }
  ok(r.se.to - r.se.from === 29 && r.un.to - r.un.from === 359 && r.hoe.to - r.hoe.from === 10799, '단위 길이 ' + y);
  ok(y >= r.se.from && y <= r.se.to && y >= r.un.from && y <= r.un.to, '포함 ' + y);
  ok(!('el' in r.hoe) && !('el' in r.un) && !('el' in r.se), '오행 필드가 있으면 안 됨 ' + y);
}
for (const y of [1744, 2014, 2044, 2104]) { const g = gzOf(W.at(y).se.from); ok(g.s === 0 && (g.b === 0 || g.b === 6), `세 시작 ${y}은 甲子·甲午여야 함`); }
// ③ 삼원구운 회귀(기존 값)
const EXP = { 1864: [1, '일백(一白)', '수(水)'], 1904: [3, '삼벽(三碧)', '목(木)'], 1944: [5, '오황(五黃)', '토(土)'], 1984: [7, '칠적(七赤)', '금(金)'], 2004: [8, '팔백(八白)', '토(土)'], 2024: [9, '구자(九紫)', '화(火)'], 2043: [9, '구자(九紫)', '화(火)'], 2044: [1, '일백(一白)', '수(水)'] };
Object.keys(EXP).forEach(y => { const e = ME.eraAt(+y).era; ok(e.period === EXP[y][0] && e.star === EXP[y][1] && e.elK === EXP[y][2], `${y} 삼원구운 ${e.period} ${e.star} ${e.elK}`); });
ok(ME.eraAt({ y: 2024, m: 2, d: 3 }).era.period === 8 && ME.eraAt({ y: 2024, m: 2, d: 5 }).era.period === 9, '입춘 경계(2024)');
for (let y = 1864; y <= 2103; y++) { const c = ME.cycle(y), e = ME.eraAt(y).era, n = c.periods.filter(p => p.now); ok(n.length === 1 && n[0].period === e.period && n[0].start === e.start && n[0].star === e.star, '아홉 운 표 ' + y); }
ok(JSON.stringify(ME.cycle(2026).grid) === '[4,9,2,3,5,7,8,1,6]', '낙서 배치');

if (fails.length) { console.log('실패 ' + fails.length + '건'); console.log([...new Set(fails)].slice(0, 30).join('\n')); process.exit(1); }
console.log('시대 흐름 3체계 검사 통과 (원회운세 문헌 대조·경계, 삼원구운 회귀 1864~2103)');
